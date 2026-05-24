package handlers

import (
	"itstep-network/config"
	"itstep-network/internal/models"
	"net/http"
	"strconv"
	"context"
	"time"

	"github.com/gin-gonic/gin"

	"go.mongodb.org/mongo-driver/bson"
)

func countSQLRows(query string, args ...interface{}) int {
	var count int

	err := config.DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return 0
	}

	return count
}

func GetAdminStats(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Доступ только для администратора"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	chatsCount, err := config.ChatCollection.CountDocuments(ctx, gin.H{})
	if err != nil {
		chatsCount = 0
	}

	stats := models.AdminStats{
		UsersCount:    countSQLRows(`SELECT COUNT(*) FROM users`),
		StudentsCount: countSQLRows(`SELECT COUNT(*) FROM users WHERE role = $1`, "student"),
		TeachersCount: countSQLRows(`SELECT COUNT(*) FROM users WHERE role = $1`, "teacher"),
		AdminsCount:   countSQLRows(`SELECT COUNT(*) FROM users WHERE role = $1`, "admin"),
		PostsCount:    countSQLRows(`SELECT COUNT(*) FROM posts`),
		ClubsCount:    countSQLRows(`SELECT COUNT(*) FROM clubs`),
		NewsCount:     countSQLRows(`SELECT COUNT(*) FROM news`),
		ChatsCount:    int(chatsCount),
	}

	c.JSON(http.StatusOK, stats)
}

func GetAdminUsers(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Доступ только для администратора"})
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
			COALESCE(avatar_url, ''),
			role
		FROM users
		ORDER BY role, name, surname
	`

	rows, err := config.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки пользователей", "error": err.Error()})
		return
	}
	defer rows.Close()

	users := []models.AdminUser{}

	for rows.Next() {
		var user models.AdminUser

		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Surname,
			&user.Email,
			&user.Group,
			&user.Course,
			&user.Direction,
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

func UpdateUserRole(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Доступ только для администратора"})
		return
	}

	id := c.Param("id")

	var input models.UpdateUserRoleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Выберите роль"})
		return
	}

	if input.Role != "student" && input.Role != "teacher" && input.Role != "admin" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректная роль"})
		return
	}

	result, err := config.DB.Exec(`UPDATE users SET role = $1 WHERE id = $2`, input.Role, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось изменить роль", "error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Роль обновлена"})
}

func DeleteUserByAdmin(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Доступ только для администратора"})
		return
	}

	currentUserID, _ := c.Get("userID")
	id := c.Param("id")

	targetID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный пользователь"})
		return
	}

	if currentUserID.(int) == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Нельзя удалить собственный аккаунт из админ-панели"})
		return
	}

	result, err := config.DB.Exec(`DELETE FROM users WHERE id = $1`, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить пользователя", "error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, _ = config.ChatCollection.UpdateMany(
		ctx,
		bson.M{"member_ids": targetID},
		bson.M{"$pull": bson.M{"member_ids": targetID}},
	)

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь удален"})
}