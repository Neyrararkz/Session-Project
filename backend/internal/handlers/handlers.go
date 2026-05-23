package handlers

import (
	"database/sql"
	"itstep-network/config"
	"itstep-network/internal/models"
	"itstep-network/utils"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
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

func GetChats(c *gin.Context) {
	c.JSON(http.StatusOK, []gin.H{})
}

func GetMessages(c *gin.Context) {
	c.JSON(http.StatusOK, []gin.H{})
}

func SendMessage(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Сообщение отправлено"})
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
