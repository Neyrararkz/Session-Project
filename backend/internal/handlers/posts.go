package handlers

import (
	"itstep-network/config"
	"itstep-network/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

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

func UpdatePost(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неавторизован"})
		return
	}

	postID := c.Param("id")

	var input models.UpdatePostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните заголовок и текст поста"})
		return
	}

	query := `
		UPDATE posts
		SET title = $1, content = $2, image_urls = $3
		WHERE id = $4 AND user_id = $5
	`

	result, err := config.DB.Exec(query, input.Title, input.Content, pq.Array(input.ImageURLs), postID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить пост", "error": err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "У вас нет прав на редактирование этого поста или он не существует"})
		return
	}

	selectQuery := `
		SELECT 
			p.id, p.user_id, u.name, u.surname, COALESCE(u.avatar_url, ''), 
			p.title, p.content, COALESCE(p.image_urls, '{}'), p.created_at,
			(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
			EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
			(SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.id = $2
	`

	var post models.Post

	err = config.DB.QueryRow(selectQuery, userID, postID).Scan(
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Пост обновлен, но не удалось вернуть новые данные", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Пост обновлен",
		"post":    post,
	})
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