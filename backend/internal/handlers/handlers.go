package handlers

import (
	"database/sql"
	"itstep-network/config"
	"itstep-network/internal/models"
	"itstep-network/utils"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func Register(c *gin.Context) {
	var input models.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните все обязательные поля корректно"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера при обработке пароля"})
		return
	}

	query := `INSERT INTO users (name, surname, email, password, student_group, course, direction, role) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, 'student')`

	_, err = config.DB.Exec(query,
		input.Name,
		input.Surname,
		input.Email,
		string(hashedPassword),
		input.Group,
		input.Course,
		input.Direction,
	)

	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Пользователь с таким Email уже существует"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Регистрация успешна! Теперь вы можете войти."})
}

func Login(c *gin.Context) {
	var input models.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните все поля"})
		return
	}

	var user models.User
	var hashedPassword string

	query := `
		SELECT id, name, surname, email, password, 
		       COALESCE(student_group, ''), 
		       COALESCE(course, 0),
		       COALESCE(direction, ''),
		       COALESCE(bio, ''),
		       COALESCE(clubs, '{}'),
		       role
		FROM users 
		WHERE email = $1
	`

	row := config.DB.QueryRow(query, input.Email)

	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Surname,
		&user.Email,
		&hashedPassword,
		&user.Group,
		&user.Course,
		&user.Direction,
		&user.Bio,
		pq.Array(&user.Clubs),
		&user.Role,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неверный Email или пароль"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при поиске пользователя"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неверный Email или пароль"})
		return
	}

	cfg := config.LoadConfig()
	token, err := utils.GenerateToken(user.ID, user.Role, cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка генерации токена сессии"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Сессия не найдена"})
		return
	}

	var user models.User

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
		WHERE id = $1
	`

	row := config.DB.QueryRow(query, userID)

	err := row.Scan(
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

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка базы данных", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func GetUserByID(c *gin.Context) {
	userID := c.Param("id")

	var user models.User

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
		WHERE id = $1
	`

	row := config.DB.QueryRow(query, userID)

	err := row.Scan(
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

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка базы данных", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input models.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректные данные"})
		return
	}

	query := `UPDATE users SET bio = $1, clubs = $2, avatar_url = $3 WHERE id = $4`
	_, err := config.DB.Exec(query, input.Bio, pq.Array(input.Clubs), input.AvatarURL, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить профиль"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Профиль успешно обновлен!"})
}

func GetUserPosts(c *gin.Context) {
	currentUserID, _ := c.Get("userID")
	userIDParam := c.Param("id")

	targetUserID := currentUserID.(int)

	if userIDParam != "" {
		id, err := strconv.Atoi(userIDParam)
		if err == nil {
			targetUserID = id
		}
	}

	query := `
		SELECT 
			p.id,
			p.user_id,
			u.name,
			u.surname,
			COALESCE(u.avatar_url, ''),
			p.title,
			p.content,
			COALESCE(p.image_urls, '{}'),
			p.created_at,
			(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
			EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
			(SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.user_id = $2
		ORDER BY p.created_at DESC
	`

	rows, err := config.DB.Query(query, currentUserID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Ошибка сервера при получении постов",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	posts := []models.Post{}

	for rows.Next() {
		var post models.Post

		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.AuthorName,
			&post.AuthorSurname,
			&post.AuthorAvatar,
			&post.Title,
			&post.Content,
			pq.Array(&post.ImageURLs),
			&post.CreatedAt,
			&post.LikesCount,
			&post.IsLiked,
			&post.CommentsCount,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Ошибка обработки данных постов",
				"error":   err.Error(),
			})
			return
		}

		posts = append(posts, post)
	}

	c.JSON(http.StatusOK, posts)
}

func GetPosts(c *gin.Context) {
	userID, _ := c.Get("userID")

	query := `
		SELECT 
			p.id, p.user_id, u.name, u.surname, COALESCE(u.avatar_url, ''), 
			p.title, p.content, COALESCE(p.image_urls, '{}'), p.created_at,
			(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
			EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
			(SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		ORDER BY p.created_at DESC
	`

	rows, err := config.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка получения постов"})
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		if err := rows.Scan(
			&post.ID, &post.UserID, &post.AuthorName, &post.AuthorSurname, &post.AuthorAvatar,
			&post.Title, &post.Content, pq.Array(&post.ImageURLs), &post.CreatedAt,
			&post.LikesCount, &post.IsLiked, &post.CommentsCount,
		); err != nil {
			continue
		}
		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.Post{}
	}
	c.JSON(http.StatusOK, posts)
}

func CreatePost(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input struct {
		Title     string   `json:"title"`
		Content   string   `json:"content"`
		ImageURLs []string `json:"image_urls"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректные данные"})
		return
	}

	query := `INSERT INTO posts (user_id, title, content, image_urls) VALUES ($1, $2, $3, $4)`
	_, err := config.DB.Exec(query, userID, input.Title, input.Content, pq.Array(input.ImageURLs))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при создании поста"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Пост создан!"})
}

func DeletePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postID := c.Param("id")

	query := `DELETE FROM posts WHERE id = $1 AND user_id = $2`
	result, err := config.DB.Exec(query, postID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка удаления поста"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "У вас нет прав на удаление этого поста или он не существует"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пост успешно удален"})
}

func GetPostComments(c *gin.Context) {
	postID := c.Param("id")

	query := `
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, c.parent_id,
			   u.name, u.surname, COALESCE(u.avatar_url, '')
		FROM post_comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = $1
		ORDER BY c.created_at ASC
	`

	rows, err := config.DB.Query(query, postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка получения комментариев"})
		return
	}
	defer rows.Close()

	var comments []models.PostComment
	for rows.Next() {
		var comment models.PostComment
		if err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.CreatedAt, &comment.ParentID,
			&comment.AuthorName, &comment.AuthorSurname, &comment.AuthorAvatar,
		); err != nil {
			continue
		}
		comments = append(comments, comment)
	}

	if comments == nil {
		comments = []models.PostComment{}
	}
	c.JSON(http.StatusOK, comments)
}

func AddPostComment(c *gin.Context) {
	userID, _ := c.Get("userID")
	postID := c.Param("id")

	var input struct {
		Content  string `json:"content" binding:"required"`
		ParentID *int   `json:"parent_id"` // Может быть null
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Комментарий не может быть пустым"})
		return
	}

	query := `INSERT INTO post_comments (post_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4)`
	_, err := config.DB.Exec(query, postID, userID, input.Content, input.ParentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось добавить комментарий"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Комментарий добавлен"})
}

func ToggleLike(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неавторизован"})
		return
	}

	postID := c.Param("id")

	var input models.LikeInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректные данные"})
		return
	}

	if input.IsLike {
		query := `
			INSERT INTO post_likes (user_id, post_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`

		_, err := config.DB.Exec(query, userID, postID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Не удалось поставить лайк",
				"error":   err.Error(),
			})
			return
		}
	} else {
		query := `
			DELETE FROM post_likes
			WHERE user_id = $1 AND post_id = $2
		`

		_, err := config.DB.Exec(query, userID, postID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Не удалось снять лайк",
				"error":   err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Статус лайка изменен"})
}

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

	c.JSON(http.StatusOK, gin.H{"message": "Клуб обновлен"})
}

func DeleteClub(c *gin.Context) {
	id := c.Param("id")
	_, err := config.DB.Exec(`DELETE FROM clubs WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка удаления клуба"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Клуб удален"})
}

func ToggleClubMembership(c *gin.Context) {
	userID, _ := c.Get("userID")
	clubID := c.Param("id")

	var input models.ToggleClubInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	var err error
	if input.Action == "join" {
		query := `UPDATE users SET clubs = array_append(COALESCE(clubs, '{}'), $1) WHERE id = $2 AND NOT ($1 = ANY(COALESCE(clubs, '{}')))`
		_, err = config.DB.Exec(query, clubID, userID)
	} else if input.Action == "leave" {
		query := `UPDATE users SET clubs = array_remove(clubs, $1) WHERE id = $2`
		_, err = config.DB.Exec(query, clubID, userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при изменении статуса участия"})
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

func GetFriends(c *gin.Context) {
	userID, _ := c.Get("userID")

	query := `
		SELECT
			u.id,
			u.name,
			u.surname,
			u.email,
			COALESCE(u.student_group, ''),
			COALESCE(u.course, 0),
			COALESCE(u.direction, ''),
			COALESCE(u.bio, ''),
			COALESCE(u.avatar_url, ''),
			u.role
		FROM friendships f
		JOIN users u ON u.id = CASE
			WHEN f.requester_id = $1 THEN f.receiver_id
			ELSE f.requester_id
		END
		WHERE (f.requester_id = $1 OR f.receiver_id = $1)
		AND f.status = 'accepted'
		ORDER BY u.name, u.surname
	`

	rows, err := config.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки друзей", "error": err.Error()})
		return
	}
	defer rows.Close()

	friends := []models.FriendUser{}

	for rows.Next() {
		var friend models.FriendUser

		err := rows.Scan(
			&friend.ID,
			&friend.Name,
			&friend.Surname,
			&friend.Email,
			&friend.Group,
			&friend.Course,
			&friend.Direction,
			&friend.Bio,
			&friend.AvatarURL,
			&friend.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки друзей", "error": err.Error()})
			return
		}

		friends = append(friends, friend)
	}

	c.JSON(http.StatusOK, friends)
}

func GetUserFriends(c *gin.Context) {
	userID := c.Param("id")

	query := `
		SELECT
			u.id,
			u.name,
			u.surname,
			u.email,
			COALESCE(u.student_group, ''),
			COALESCE(u.course, 0),
			COALESCE(u.direction, ''),
			COALESCE(u.bio, ''),
			COALESCE(u.avatar_url, ''),
			u.role
		FROM friendships f
		JOIN users u ON u.id = CASE
			WHEN f.requester_id = $1 THEN f.receiver_id
			ELSE f.requester_id
		END
		WHERE (f.requester_id = $1 OR f.receiver_id = $1)
		AND f.status = 'accepted'
		ORDER BY u.name, u.surname
	`

	rows, err := config.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки друзей пользователя", "error": err.Error()})
		return
	}
	defer rows.Close()

	friends := []models.FriendUser{}

	for rows.Next() {
		var friend models.FriendUser

		err := rows.Scan(
			&friend.ID,
			&friend.Name,
			&friend.Surname,
			&friend.Email,
			&friend.Group,
			&friend.Course,
			&friend.Direction,
			&friend.Bio,
			&friend.AvatarURL,
			&friend.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки друзей пользователя", "error": err.Error()})
			return
		}

		friends = append(friends, friend)
	}

	c.JSON(http.StatusOK, friends)
}

func GetIncomingFriendRequests(c *gin.Context) {
	userID, _ := c.Get("userID")

	query := `
		SELECT
			f.id,
			f.status,
			TO_CHAR(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
			u.id,
			u.name,
			u.surname,
			u.email,
			COALESCE(u.student_group, ''),
			COALESCE(u.course, 0),
			COALESCE(u.direction, ''),
			COALESCE(u.bio, ''),
			COALESCE(u.avatar_url, ''),
			u.role
		FROM friendships f
		JOIN users u ON u.id = f.requester_id
		WHERE f.receiver_id = $1
		AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`

	rows, err := config.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки входящих заявок", "error": err.Error()})
		return
	}
	defer rows.Close()

	requests := []models.FriendRequest{}

	for rows.Next() {
		var request models.FriendRequest

		err := rows.Scan(
			&request.ID,
			&request.Status,
			&request.CreatedAt,
			&request.User.ID,
			&request.User.Name,
			&request.User.Surname,
			&request.User.Email,
			&request.User.Group,
			&request.User.Course,
			&request.User.Direction,
			&request.User.Bio,
			&request.User.AvatarURL,
			&request.User.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки входящих заявок", "error": err.Error()})
			return
		}

		requests = append(requests, request)
	}

	c.JSON(http.StatusOK, requests)
}

func GetOutgoingFriendRequests(c *gin.Context) {
	userID, _ := c.Get("userID")

	query := `
		SELECT
			f.id,
			f.status,
			TO_CHAR(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
			u.id,
			u.name,
			u.surname,
			u.email,
			COALESCE(u.student_group, ''),
			COALESCE(u.course, 0),
			COALESCE(u.direction, ''),
			COALESCE(u.bio, ''),
			COALESCE(u.avatar_url, ''),
			u.role
		FROM friendships f
		JOIN users u ON u.id = f.receiver_id
		WHERE f.requester_id = $1
		AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`

	rows, err := config.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки исходящих заявок", "error": err.Error()})
		return
	}
	defer rows.Close()

	requests := []models.FriendRequest{}

	for rows.Next() {
		var request models.FriendRequest

		err := rows.Scan(
			&request.ID,
			&request.Status,
			&request.CreatedAt,
			&request.User.ID,
			&request.User.Name,
			&request.User.Surname,
			&request.User.Email,
			&request.User.Group,
			&request.User.Course,
			&request.User.Direction,
			&request.User.Bio,
			&request.User.AvatarURL,
			&request.User.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки исходящих заявок", "error": err.Error()})
			return
		}

		requests = append(requests, request)
	}

	c.JSON(http.StatusOK, requests)
}

func GetFriendshipStatus(c *gin.Context) {
	userID, _ := c.Get("userID")
	targetID := c.Param("id")

	currentID := userID.(int)

	targetInt, err := strconv.Atoi(targetID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный пользователь"})
		return
	}

	if currentID == targetInt {
		c.JSON(http.StatusOK, models.FriendshipStatus{
			Status: "self",
			RequestID: 0,
		})
		return
	}

	query := `
		SELECT id, requester_id, receiver_id, status
		FROM friendships
		WHERE (requester_id = $1 AND receiver_id = $2)
		OR (requester_id = $2 AND receiver_id = $1)
		LIMIT 1
	`

	var requestID int
	var requesterID int
	var receiverID int
	var status string

	err = config.DB.QueryRow(query, currentID, targetInt).Scan(
		&requestID,
		&requesterID,
		&receiverID,
		&status,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, models.FriendshipStatus{
			Status: "none",
			RequestID: 0,
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки статуса дружбы", "error": err.Error()})
		return
	}

	if status == "accepted" {
		c.JSON(http.StatusOK, models.FriendshipStatus{
			Status: "friends",
			RequestID: requestID,
		})
		return
	}

	if status == "pending" && requesterID == currentID {
		c.JSON(http.StatusOK, models.FriendshipStatus{
			Status: "outgoing_pending",
			RequestID: requestID,
		})
		return
	}

	if status == "pending" && receiverID == currentID {
		c.JSON(http.StatusOK, models.FriendshipStatus{
			Status: "incoming_pending",
			RequestID: requestID,
		})
		return
	}

	c.JSON(http.StatusOK, models.FriendshipStatus{
		Status: "none",
		RequestID: 0,
	})
}

func SendFriendRequest(c *gin.Context) {
	userID, _ := c.Get("userID")
	targetID := c.Param("id")

	currentID := userID.(int)

	targetInt, err := strconv.Atoi(targetID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный пользователь"})
		return
	}

	if currentID == targetInt {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Нельзя добавить себя в друзья"})
		return
	}

	var existingID int
	var existingStatus string

	checkQuery := `
		SELECT id, status
		FROM friendships
		WHERE (requester_id = $1 AND receiver_id = $2)
		OR (requester_id = $2 AND receiver_id = $1)
		LIMIT 1
	`

	err = config.DB.QueryRow(checkQuery, currentID, targetInt).Scan(&existingID, &existingStatus)

	if err == nil {
		if existingStatus == "accepted" {
			c.JSON(http.StatusConflict, gin.H{"message": "Вы уже друзья"})
			return
		}

		c.JSON(http.StatusConflict, gin.H{"message": "Заявка уже существует"})
		return
	}

	if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки заявки", "error": err.Error()})
		return
	}

	query := `
		INSERT INTO friendships (requester_id, receiver_id, status)
		VALUES ($1, $2, 'pending')
	`

	_, err = config.DB.Exec(query, currentID, targetInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось отправить заявку", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Заявка отправлена"})
}

func AcceptFriendRequest(c *gin.Context) {
	userID, _ := c.Get("userID")
	requestID := c.Param("id")

	query := `
		UPDATE friendships
		SET status = 'accepted'
		WHERE id = $1
		AND receiver_id = $2
		AND status = 'pending'
	`

	result, err := config.DB.Exec(query, requestID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось принять заявку", "error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()

	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Заявка не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Заявка принята"})
}

func DeleteFriendRequest(c *gin.Context) {
	userID, _ := c.Get("userID")
	requestID := c.Param("id")

	query := `
		DELETE FROM friendships
		WHERE id = $1
		AND status = 'pending'
		AND (requester_id = $2 OR receiver_id = $2)
	`

	result, err := config.DB.Exec(query, requestID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить заявку", "error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()

	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Заявка не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Заявка удалена"})
}

func RemoveFriend(c *gin.Context) {
	userID, _ := c.Get("userID")
	friendID := c.Param("id")

	query := `
		DELETE FROM friendships
		WHERE status = 'accepted'
		AND (
			(requester_id = $1 AND receiver_id = $2)
			OR
			(requester_id = $2 AND receiver_id = $1)
		)
	`

	result, err := config.DB.Exec(query, userID, friendID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить друга", "error": err.Error()})
		return
	}

	rows, _ := result.RowsAffected()

	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Друг не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Друг удален"})
}

func SearchUsers(c *gin.Context) {
	currentUserID, _ := c.Get("userID")
	search := strings.TrimSpace(c.Query("q"))

	if search == "" {
		c.JSON(http.StatusOK, []models.FriendUser{})
		return
	}

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
			COALESCE(avatar_url, ''),
			role
		FROM users
		WHERE id <> $1
		AND CONCAT_WS(' ', name, surname, email, student_group, direction, role) ILIKE '%' || $2 || '%'
		ORDER BY name, surname
		LIMIT 20
	`

	rows, err := config.DB.Query(query, currentUserID, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка поиска пользователей", "error": err.Error()})
		return
	}
	defer rows.Close()

	users := []models.FriendUser{}

	for rows.Next() {
		var user models.FriendUser

		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Surname,
			&user.Email,
			&user.Group,
			&user.Course,
			&user.Direction,
			&user.Bio,
			&user.AvatarURL,
			&user.Role,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки пользователей", "error": err.Error()})
			return
		}

		users = append(users, user)
	}

	c.JSON(http.StatusOK, users)
}

type mongoChatDocument struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	Type          string             `bson:"type"`
	Name          string             `bson:"name"`
	MemberIDs     []int              `bson:"member_ids"`
	LastMessage   string             `bson:"last_message"`
	LastMessageAt time.Time          `bson:"last_message_at"`
	CreatedAt     time.Time          `bson:"created_at"`
}

type mongoMessageDocument struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	ChatID    primitive.ObjectID `bson:"chat_id"`
	SenderID  int                `bson:"sender_id"`
	Text      string             `bson:"text"`
	CreatedAt time.Time         `bson:"created_at"`
	ReadBy    []int              `bson:"read_by"`
}

func getChatMembersByIDs(ids []int) (map[int]models.ChatMember, error) {
	result := map[int]models.ChatMember{}

	if len(ids) == 0 {
		return result, nil
	}

	query := `
		SELECT
			id,
			name,
			surname,
			COALESCE(avatar_url, ''),
			role
		FROM users
		WHERE id = ANY($1)
	`

	rows, err := config.DB.Query(query, pq.Array(ids))
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var member models.ChatMember

		if err := rows.Scan(
			&member.ID,
			&member.Name,
			&member.Surname,
			&member.AvatarURL,
			&member.Role,
		); err != nil {
			return result, err
		}

		result[member.ID] = member
	}

	return result, nil
}

func uniqueIntSlice(items []int) []int {
	seen := map[int]bool{}
	result := []int{}

	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result
}

func convertMongoChat(chatDoc mongoChatDocument) models.Chat {
	return models.Chat{
		ID:            chatDoc.ID.Hex(),
		Type:          chatDoc.Type,
		Name:          chatDoc.Name,
		MemberIDs:     chatDoc.MemberIDs,
		LastMessage:   chatDoc.LastMessage,
		LastMessageAt: chatDoc.LastMessageAt,
		CreatedAt:     chatDoc.CreatedAt,
	}
}

func convertMongoMessage(messageDoc mongoMessageDocument) models.Message {
	return models.Message{
		ID:        messageDoc.ID.Hex(),
		ChatID:    messageDoc.ChatID.Hex(),
		SenderID:  messageDoc.SenderID,
		Text:      messageDoc.Text,
		CreatedAt: messageDoc.CreatedAt,
	}
}

func GetChats(c *gin.Context) {
	userID, _ := c.Get("userID")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "last_message_at", Value: -1}})

	cursor, err := config.ChatCollection.Find(ctx, bson.M{
		"member_ids": userID,
	}, opts)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки чатов", "error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	chats := []models.Chat{}
	allMemberIDs := []int{}

	currentID := userID.(int)

	for cursor.Next(ctx) {
		var doc mongoChatDocument

		if err := cursor.Decode(&doc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки чатов", "error": err.Error()})
			return
		}

		chat := convertMongoChat(doc)

		unreadCount, err := config.MessageCollection.CountDocuments(ctx, bson.M{
			"chat_id":   doc.ID,
			"sender_id": bson.M{"$ne": currentID},
			"read_by":   bson.M{"$ne": currentID},
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка подсчета непрочитанных сообщений", "error": err.Error()})
			return
		}

		chat.UnreadCount = int(unreadCount)

		chats = append(chats, chat)
		allMemberIDs = append(allMemberIDs, doc.MemberIDs...)
	}

	membersMap, err := getChatMembersByIDs(uniqueIntSlice(allMemberIDs))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки участников чатов", "error": err.Error()})
		return
	}

	for i := range chats {
		chats[i].Members = []models.ChatMember{}

		for _, id := range chats[i].MemberIDs {
			if member, ok := membersMap[id]; ok {
				chats[i].Members = append(chats[i].Members, member)
			}
		}
	}

	c.JSON(http.StatusOK, chats)
}

func GetOrCreateDirectChat(c *gin.Context) {
	userID, _ := c.Get("userID")
	targetIDStr := c.Param("id")

	currentID := userID.(int)

	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный пользователь"})
		return
	}

	if currentID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Нельзя создать чат с самим собой"})
		return
	}

	membersMap, err := getChatMembersByIDs([]int{currentID, targetID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки пользователей", "error": err.Error()})
		return
	}

	if _, ok := membersMap[targetID]; !ok {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"type": "direct",
		"member_ids": bson.M{
			"$all": []int{currentID, targetID},
		},
	}

	var existing mongoChatDocument

	err = config.ChatCollection.FindOne(ctx, filter).Decode(&existing)

	if err == nil {
		chat := convertMongoChat(existing)

		for _, id := range chat.MemberIDs {
			if member, ok := membersMap[id]; ok {
				chat.Members = append(chat.Members, member)
			}
		}

		c.JSON(http.StatusOK, chat)
		return
	}

	if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка поиска чата", "error": err.Error()})
		return
	}

	now := time.Now()

	newChat := bson.M{
		"type":            "direct",
		"name":            "",
		"member_ids":      []int{currentID, targetID},
		"last_message":    "",
		"last_message_at": now,
		"created_at":      now,
	}

	insertResult, err := config.ChatCollection.InsertOne(ctx, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания чата", "error": err.Error()})
		return
	}

	objectID := insertResult.InsertedID.(primitive.ObjectID)

	chat := models.Chat{
		ID:            objectID.Hex(),
		Type:          "direct",
		Name:          "",
		MemberIDs:     []int{currentID, targetID},
		LastMessage:   "",
		LastMessageAt: now,
		CreatedAt:     now,
		Members:       []models.ChatMember{},
	}

	for _, id := range chat.MemberIDs {
		if member, ok := membersMap[id]; ok {
			chat.Members = append(chat.Members, member)
		}
	}

	c.JSON(http.StatusCreated, chat)
}

func CreateGroupChat(c *gin.Context) {
	userID, _ := c.Get("userID")
	currentID := userID.(int)

	var input models.CreateGroupChatInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Введите название и участников чата"})
		return
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Название чата не может быть пустым"})
		return
	}

	memberIDs := uniqueIntSlice(append(input.MemberIDs, currentID))

	if len(memberIDs) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Для группового чата нужен минимум один собеседник"})
		return
	}

	membersMap, err := getChatMembersByIDs(memberIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки участников", "error": err.Error()})
		return
	}

	if len(membersMap) != len(memberIDs) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некоторые участники не найдены"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()

	newChat := bson.M{
		"type":            "group",
		"name":            name,
		"member_ids":      memberIDs,
		"last_message":    "",
		"last_message_at": now,
		"created_at":      now,
	}

	insertResult, err := config.ChatCollection.InsertOne(ctx, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать групповой чат", "error": err.Error()})
		return
	}

	objectID := insertResult.InsertedID.(primitive.ObjectID)

	chat := models.Chat{
		ID:            objectID.Hex(),
		Type:          "group",
		Name:          name,
		MemberIDs:     memberIDs,
		Members:       []models.ChatMember{},
		LastMessage:   "",
		LastMessageAt: now,
		CreatedAt:     now,
	}

	for _, id := range memberIDs {
		if member, ok := membersMap[id]; ok {
			chat.Members = append(chat.Members, member)
		}
	}

	c.JSON(http.StatusCreated, chat)
}

func GetMessages(c *gin.Context) {
	userID, _ := c.Get("userID")
	chatID := c.Param("id")

	chatObjectID, err := primitive.ObjectIDFromHex(chatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный чат"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := config.ChatCollection.CountDocuments(ctx, bson.M{
		"_id":        chatObjectID,
		"member_ids": userID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки доступа к чату", "error": err.Error()})
		return
	}

	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "Нет доступа к этому чату"})
		return
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})

	cursor, err := config.MessageCollection.Find(ctx, bson.M{
		"chat_id": chatObjectID,
	}, opts)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки сообщений", "error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	messages := []models.Message{}
	senderIDs := []int{}

	for cursor.Next(ctx) {
		var doc mongoMessageDocument

		if err := cursor.Decode(&doc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки сообщений", "error": err.Error()})
			return
		}

		message := convertMongoMessage(doc)
		messages = append(messages, message)
		senderIDs = append(senderIDs, doc.SenderID)
	}

	membersMap, err := getChatMembersByIDs(uniqueIntSlice(senderIDs))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки авторов сообщений", "error": err.Error()})
		return
	}

	for i := range messages {
		if sender, ok := membersMap[messages[i].SenderID]; ok {
			messages[i].Sender = sender
		}
	}

	currentID := userID.(int)

	_, _ = config.MessageCollection.UpdateMany(
		ctx,
		bson.M{
			"chat_id":   chatObjectID,
			"sender_id": bson.M{"$ne": currentID},
			"read_by":   bson.M{"$ne": currentID},
		},
		bson.M{
			"$addToSet": bson.M{
				"read_by": currentID,
			},
		},
	)

	c.JSON(http.StatusOK, messages)
}

func SendMessage(c *gin.Context) {
	userID, _ := c.Get("userID")
	chatID := c.Param("id")

	currentID := userID.(int)

	chatObjectID, err := primitive.ObjectIDFromHex(chatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный чат"})
		return
	}

	var input models.SendMessageInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Сообщение не может быть пустым"})
		return
	}

	text := strings.TrimSpace(input.Text)
	if text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Сообщение не может быть пустым"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := config.ChatCollection.CountDocuments(ctx, bson.M{
		"_id":        chatObjectID,
		"member_ids": currentID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки доступа к чату", "error": err.Error()})
		return
	}

	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "Нет доступа к этому чату"})
		return
	}

	now := time.Now()

	newMessage := bson.M{
		"chat_id":    chatObjectID,
		"sender_id":  currentID,
		"text":       text,
		"created_at": now,
		"read_by":    []int{currentID},
	}

	insertResult, err := config.MessageCollection.InsertOne(ctx, newMessage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось отправить сообщение", "error": err.Error()})
		return
	}

	_, err = config.ChatCollection.UpdateOne(
		ctx,
		bson.M{"_id": chatObjectID},
		bson.M{
			"$set": bson.M{
				"last_message":    text,
				"last_message_at": now,
			},
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Сообщение сохранено, но чат не обновился", "error": err.Error()})
		return
	}

	membersMap, err := getChatMembersByIDs([]int{currentID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки отправителя", "error": err.Error()})
		return
	}

	message := models.Message{
		ID:        insertResult.InsertedID.(primitive.ObjectID).Hex(),
		ChatID:    chatObjectID.Hex(),
		SenderID:  currentID,
		Text:      text,
		CreatedAt: now,
		Sender:    membersMap[currentID],
	}

	c.JSON(http.StatusCreated, message)
}

func GetUnreadMessagesCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	currentID := userID.(int)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.ChatCollection.Find(
		ctx,
		bson.M{"member_ids": currentID},
		options.Find().SetProjection(bson.M{"_id": 1}),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки чатов", "error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	chatIDs := []primitive.ObjectID{}

	for cursor.Next(ctx) {
		var item struct {
			ID primitive.ObjectID `bson:"_id"`
		}

		if err := cursor.Decode(&item); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки чатов", "error": err.Error()})
			return
		}

		chatIDs = append(chatIDs, item.ID)
	}

	if len(chatIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}

	count, err := config.MessageCollection.CountDocuments(ctx, bson.M{
		"chat_id":   bson.M{"$in": chatIDs},
		"sender_id": bson.M{"$ne": currentID},
		"read_by":   bson.M{"$ne": currentID},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка подсчета непрочитанных сообщений", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не найден"})
		return
	}

	filename := filepath.Base(file.Filename)

	filePath := "./uploads/" + filename

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить файл"})
		return
	}

	fileURL := "http://localhost:8080/uploads/" + filename

	c.JSON(http.StatusOK, gin.H{"url": fileURL})
}
