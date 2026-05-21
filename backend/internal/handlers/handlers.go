package handlers

import (
	"database/sql"
	"itstep-network/config"
	"itstep-network/internal/models"
	"itstep-network/utils"
	"net/http"
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
	query := `SELECT id, name, surname, email, student_group, course, direction, bio, clubs, role 
              FROM users WHERE id = $1`

	row := config.DB.QueryRow(query, userID)
	err := row.Scan(&user.ID, &user.Name, &user.Surname, &user.Email, &user.Group, &user.Course, &user.Direction, &user.Bio, pq.Array(&user.Clubs), &user.Role)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка базы данных"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}


func GetPosts(c *gin.Context) {
	currentUserID, _ := c.Get("userID")

	query := `
		SELECT p.id, p.user_id, u.name, u.surname, p.title, p.content, p.created_at,
			   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
			   EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked
		FROM posts p
		JOIN users u ON p.user_id = u.id
		ORDER BY p.created_at DESC`

	rows, err := config.DB.Query(query, currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при получении ленты постов"})
		return
	}
	defer rows.Close()

	posts := []models.Post{}
	for rows.Next() {
		var p models.Post
		err := rows.Scan(&p.ID, &p.UserID, &p.AuthorName, &p.AuthorSurname, &p.Title, &p.Content, &p.CreatedAt, &p.LikesCount, &p.IsLiked)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки данных постов"})
			return
		}
		posts = append(posts, p)
	}

	c.JSON(http.StatusOK, posts)
}

func CreatePost(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неавторизован"})
		return
	}

	var input models.CreatePostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните заголовок и текст поста"})
		return
	}

	query := `INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3)`
	_, err := config.DB.Exec(query, userID, input.Title, input.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось сохранить пост"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Пост успешно опубликован!"})
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

func ToggleLike(c *gin.Context) {
	userID, _ := c.Get("userID")
	postIDStr := c.Param("id")
	postID, _ := strconv.Atoi(postIDStr)

	var input models.LikeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	if input.IsLike {
		query := `INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
		_, err := config.DB.Exec(query, userID, postID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при установке лайка"})
			return
		}
	} else {
		query := `DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2`
		_, err := config.DB.Exec(query, userID, postID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при снятии лайка"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Статус лайка изменен"})
}


func GetClubs(c *gin.Context) {
	rows, err := config.DB.Query(`SELECT id, name, description, meeting_time, contacts FROM clubs ORDER BY id DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера при получении клубов"})
		return
	}
	defer rows.Close()

	clubs := []models.Club{}
	for rows.Next() {
		var club models.Club
		if err := rows.Scan(&club.ID, &club.Name, &club.Description, &club.MeetingTime, &club.Contacts); err != nil {
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

	query := `INSERT INTO clubs (name, description, meeting_time, contacts) VALUES ($1, $2, $3, $4)`
	_, err := config.DB.Exec(query, input.Name, input.Description, input.MeetingTime, input.Contacts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать клуб"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Клуб успешно создан!"})
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
	clubName := c.Param("id")

	var input models.ToggleClubInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	var err error
	if input.Action == "join" {
		query := `UPDATE users SET clubs = array_append(COALESCE(clubs, '{}'), $1) WHERE id = $2 AND NOT ($1 = ANY(COALESCE(clubs, '{}')))`
		_, err = config.DB.Exec(query, clubName, userID)
	} else if input.Action == "leave" {
		query := `UPDATE users SET clubs = array_remove(clubs, $1) WHERE id = $2`
		_, err = config.DB.Exec(query, clubName, userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при изменении статуса участия"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Статус обновлен"})
}

func GetClubComments(c *gin.Context) {
	clubID := c.Param("id")
	query := `
		SELECT c.id, c.club_id, u.name, c.content, c.created_at 
		FROM club_comments c JOIN users u ON c.user_id = u.id 
		WHERE c.club_id = $1 ORDER BY c.created_at ASC`

	rows, err := config.DB.Query(query, clubID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки комментариев"})
		return
	}
	defer rows.Close()

	comments := []models.ClubComment{}
	for rows.Next() {
		var com models.ClubComment
		if err := rows.Scan(&com.ID, &com.ClubID, &com.UserName, &com.Content, &com.CreatedAt); err == nil {
			comments = append(comments, com)
		}
	}
	c.JSON(http.StatusOK, comments)
}

func AddClubComment(c *gin.Context) {
	userID, _ := c.Get("userID")
	clubID := c.Param("id")

	var input models.ClubCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Пустой комментарий"})
		return
	}

	_, err := config.DB.Exec(`INSERT INTO club_comments (club_id, user_id, content) VALUES ($1, $2, $3)`, clubID, userID, input.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось добавить комментарий"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Комментарий добавлен"})
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
		SELECT p.id, p.user_id, u.name, u.surname, p.title, p.content, p.created_at,
			   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
			   EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.user_id = $2
		ORDER BY p.created_at DESC`

	rows, err := config.DB.Query(query, currentUserID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера при получении постов"})
		return
	}
	defer rows.Close()

	posts := []models.Post{}
	for rows.Next() {
		var p models.Post
		err := rows.Scan(&p.ID, &p.UserID, &p.AuthorName, &p.AuthorSurname, &p.Title, &p.Content, &p.CreatedAt, &p.LikesCount, &p.IsLiked)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки данных"})
			return
		}
		posts = append(posts, p)
	}

	c.JSON(http.StatusOK, posts)
}

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input models.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректные данные"})
		return
	}

	query := `UPDATE users SET bio = $1, clubs = $2 WHERE id = $3`
	_, err := config.DB.Exec(query, input.Bio, pq.Array(input.Clubs), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить профиль"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Профиль успешно обновлен!"})
}