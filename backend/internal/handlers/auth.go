package handlers

import (
	"database/sql"
	"itstep-network/config"
	"itstep-network/internal/models"
	"itstep-network/utils"
	"net/http"

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
