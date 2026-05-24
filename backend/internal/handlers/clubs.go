package handlers

import (
	"itstep-network/config"
	"itstep-network/internal/models"
	"net/http"
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"

	"go.mongodb.org/mongo-driver/bson"
)

func GetClubs(c *gin.Context) {
	rows, err := config.DB.Query(`SELECT id, name, description, meeting_time, contacts, image_url FROM clubs ORDER BY id DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера при получении клубов"})
		return
	}
	defer rows.Close()

	clubs := []models.Club{}
	for rows.Next() {
		var club models.Club
		if err := rows.Scan(&club.ID, &club.Name, &club.Description, &club.MeetingTime, &club.Contacts, &club.ImageURL); err != nil {
			continue
		}
		clubs = append(clubs, club)
	}
	c.JSON(http.StatusOK, clubs)
}

func CreateClub(c *gin.Context) {
	var input models.CreateClubInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните все поля"})
		return
	}

	query := `INSERT INTO clubs (name, description, meeting_time, contacts, image_url) VALUES ($1, $2, $3, $4, $5)`
	_, err := config.DB.Exec(query, input.Name, input.Description, input.MeetingTime, input.Contacts, input.ImageURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать клуб"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Клуб успешно создан!"})
}

func UpdateClub(c *gin.Context) {
	id := c.Param("id")

	var input models.UpdateClubInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректные данные"})
		return
	}

	query := `
		UPDATE clubs
		SET
			name=$1,
			description=$2,
			meeting_time=$3,
			contacts=$4,
			image_url=$5
		WHERE id=$6
	`

	result, err := config.DB.Exec(
		query,
		input.Name,
		input.Description,
		input.MeetingTime,
		input.Contacts,
		input.ImageURL,
		id,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить клуб"})
		return
	}

	rows, _ := result.RowsAffected()

	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Клуб не найден"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, _ = config.ChatCollection.UpdateOne(
		ctx,
		bson.M{
			"type":    "club",
			"club_id": id,
		},
		bson.M{
			"$set": bson.M{
				"name":        input.Name,
				"description": input.Description,
				"image_url":   input.ImageURL,
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"message": "Клуб обновлен"})
}

func DeleteClub(c *gin.Context) {
	id := c.Param("id")

	_, err := config.DB.Exec(`DELETE FROM clubs WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка удаления клуба"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, _ = config.ChatCollection.DeleteOne(ctx, bson.M{
		"type":    "club",
		"club_id": id,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Клуб удален"})
}

func ToggleClubMembership(c *gin.Context) {
	userID, _ := c.Get("userID")
	currentID := userID.(int)
	clubID := c.Param("id")

	var input models.ToggleClubInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	var err error

	if input.Action == "join" {
		query := `
			UPDATE users
			SET clubs = array_append(COALESCE(clubs, '{}'), $1)
			WHERE id = $2 AND NOT ($1 = ANY(COALESCE(clubs, '{}')))
		`
		_, err = config.DB.Exec(query, clubID, currentID)
	} else if input.Action == "leave" {
		query := `
			UPDATE users
			SET clubs = array_remove(clubs, $1)
			WHERE id = $2
		`
		_, err = config.DB.Exec(query, clubID, currentID)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неизвестное действие"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при изменении статуса участия"})
		return
	}

	if err := syncClubChatMembership(clubID, currentID, input.Action); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Статус участия изменен, но чат клуба не обновился", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Статус обновлен"})
}

func GetClubMembers(c *gin.Context) {
	clubID := c.Param("id")

	query := `
		SELECT
			id,
			name,
			surname,
			email,
			COALESCE(student_group, ''),
			COALESCE(course, 0),
			COALESCE(direction, ''),
			COALESCE(bio, ''),
			COALESCE(clubs, '{}'),
			COALESCE(avatar_url, ''),
			role
		FROM users
		WHERE $1 = ANY(COALESCE(clubs, '{}'))
		ORDER BY name, surname
	`

	rows, err := config.DB.Query(query, clubID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Ошибка загрузки участников клуба",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	members := []models.User{}

	for rows.Next() {
		var user models.User

		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Surname,
			&user.Email,
			&user.Group,
			&user.Course,
			&user.Direction,
			&user.Bio,
			pq.Array(&user.Clubs),
			&user.AvatarURL,
			&user.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Ошибка обработки участников клуба",
				"error":   err.Error(),
			})
			return
		}

		members = append(members, user)
	}

	c.JSON(http.StatusOK, members)
}

func GetClubComments(c *gin.Context) {
	clubID := c.Param("id")

	query := `
		SELECT
			c.id,
			c.club_id,
			c.user_id,
			COALESCE(u.name, ''),
			COALESCE(u.surname, ''),
			COALESCE(u.avatar_url, ''),
			c.content,
			TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
			c.parent_id
		FROM club_comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.club_id = $1
		ORDER BY c.created_at ASC
	`

	rows, err := config.DB.Query(query, clubID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Ошибка загрузки комментариев",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	comments := []models.ClubComment{}

	for rows.Next() {
		var comment models.ClubComment

		err := rows.Scan(
			&comment.ID,
			&comment.ClubID,
			&comment.UserID,
			&comment.AuthorName,
			&comment.AuthorSurname,
			&comment.AuthorAvatar,
			&comment.Content,
			&comment.CreatedAt,
			&comment.ParentID,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Ошибка обработки комментариев",
				"error":   err.Error(),
			})
			return
		}

		comments = append(comments, comment)
	}

	c.JSON(http.StatusOK, comments)
}

func AddClubComment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неавторизован"})
		return
	}

	clubID := c.Param("id")

	var input models.ClubCommentInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный комментарий"})
		return
	}

	if input.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Пустой комментарий"})
		return
	}

	query := `
		INSERT INTO club_comments (club_id, user_id, content, parent_id)
		VALUES ($1, $2, $3, $4)
	`

	_, err := config.DB.Exec(query, clubID, userID, input.Content, input.ParentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Не удалось добавить комментарий",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Комментарий добавлен"})
}