package models

import "time"

type User struct {
	ID        int      `json:"id"`
	Name      string   `json:"name"`
	Surname   string   `json:"surname"`
	Email     string   `json:"email"`
	Group     string   `json:"group" db:"student_group"`
	Course    int      `json:"course"`
	Direction string   `json:"direction"`
	Bio       string   `json:"bio"`
	Clubs     []string `json:"clubs"`
	Role      string   `json:"role"`
}

type RegisterInput struct {
	Name      string `json:"name" binding:"required"`
	Surname   string `json:"surname" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required"`
	Group     string `json:"group" binding:"required"`
	Course    int    `json:"course" binding:"required"`
	Direction string `json:"direction" binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type Post struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	AuthorName    string    `json:"author_name"`
	AuthorSurname string    `json:"author_surname"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	CreatedAt     time.Time `json:"created_at"`
	LikesCount    int       `json:"likes_count"`
	IsLiked       bool      `json:"is_liked"`
}

type CreatePostInput struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type LikeInput struct {
	IsLike bool `json:"isLike"`
}

type UpdateProfileInput struct {
	Bio   string   `json:"bio"`
	Clubs []string `json:"clubs"`
}

type Club struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MeetingTime string `json:"meeting_time"`
	Contacts    string `json:"contacts"`
}

type ClubComment struct {
	ID        int    `json:"id"`
	ClubID    int    `json:"club_id"`
	UserName  string `json:"user_name"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type CreateClubInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	MeetingTime string `json:"meeting_time"`
	Contacts    string `json:"contacts"`
}

type ClubCommentInput struct {
	Content string `json:"content"`
}

type ToggleClubInput struct {
	Action string `json:"action"` 
}