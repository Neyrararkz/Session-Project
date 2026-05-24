package handlers

import (
	"database/sql"
	"itstep-network/config"
	"itstep-network/internal/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

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