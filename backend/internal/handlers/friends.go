package handlers

import (
	"database/sql"
	"itstep-network/config"
	"itstep-network/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

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