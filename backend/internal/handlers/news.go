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

func GetNews(c *gin.Context) {
	query := `
		SELECT
			id,
			COALESCE(author_id, 0),
			title,
			content,
			COALESCE(image_urls, '{}'),
			created_at
		FROM news
		ORDER BY created_at DESC
	`

	rows, err := config.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка получения новостей", "error": err.Error()})
		return
	}
	defer rows.Close()

	newsList := []models.News{}

	for rows.Next() {
		var item models.News

		err := rows.Scan(
			&item.ID,
			&item.AuthorID,
			&item.Title,
			&item.Content,
			pq.Array(&item.ImageURLs),
			&item.CreatedAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки новостей", "error": err.Error()})
			return
		}

		newsList = append(newsList, item)
	}

	c.JSON(http.StatusOK, newsList)
}

func CreateNews(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Создавать новости может только администратор"})
		return
	}

	userID, _ := c.Get("userID")

	var input models.CreateNewsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните заголовок и текст новости"})
		return
	}

	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)

	if title == "" || content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заголовок и текст новости не могут быть пустыми"})
		return
	}

	query := `
		INSERT INTO news (author_id, title, content, image_urls)
		VALUES ($1, $2, $3, $4)
		RETURNING id, COALESCE(author_id, 0), title, content, COALESCE(image_urls, '{}'), created_at
	`

	var item models.News

	err := config.DB.QueryRow(
		query,
		userID,
		title,
		content,
		pq.Array(input.ImageURLs),
	).Scan(
		&item.ID,
		&item.AuthorID,
		&item.Title,
		&item.Content,
		pq.Array(&item.ImageURLs),
		&item.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать новость", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func UpdateNews(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Редактировать новости может только администратор"})
		return
	}

	newsID := c.Param("id")

	var input models.UpdateNewsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните заголовок и текст новости"})
		return
	}

	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)

	if title == "" || content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заголовок и текст новости не могут быть пустыми"})
		return
	}

	query := `
		UPDATE news
		SET title = $1, content = $2, image_urls = $3
		WHERE id = $4
		RETURNING id, COALESCE(author_id, 0), title, content, COALESCE(image_urls, '{}'), created_at
	`

	var item models.News

	err := config.DB.QueryRow(
		query,
		title,
		content,
		pq.Array(input.ImageURLs),
		newsID,
	).Scan(
		&item.ID,
		&item.AuthorID,
		&item.Title,
		&item.Content,
		pq.Array(&item.ImageURLs),
		&item.CreatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"message": "Новость не найдена"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить новость", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

func DeleteNews(c *gin.Context) {
	if !isCurrentUserAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Удалять новости может только администратор"})
		return
	}

	newsID := c.Param("id")

	result, err := config.DB.Exec(`DELETE FROM news WHERE id = $1`, newsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить новость", "error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Новость не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Новость удалена"})
}