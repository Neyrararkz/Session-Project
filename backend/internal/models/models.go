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
	AvatarURL string   `json:"avatar_url"`
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
	AuthorAvatar  string    `json:"author_avatar"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	ImageURLs     []string  `json:"image_urls"`
	CreatedAt     time.Time `json:"created_at"`
	LikesCount    int       `json:"likes_count"`
	IsLiked       bool      `json:"is_liked"`
	CommentsCount int       `json:"comments_count"`
}

type CreatePostInput struct {
	Title     string   `json:"title" binding:"required"`
	Content   string   `json:"content" binding:"required"`
	ImageURLs []string `json:"image_urls"`
}

type UpdatePostInput struct {
	Title     string   `json:"title" binding:"required"`
	Content   string   `json:"content" binding:"required"`
	ImageURLs []string `json:"image_urls"`
}

type PostComment struct {
	ID            int    `json:"id"`
	PostID        int    `json:"post_id"`
	UserID        int    `json:"user_id"`
	AuthorName    string `json:"author_name"`
	AuthorSurname string `json:"author_surname"`
	AuthorAvatar  string `json:"author_avatar"`
	Content       string `json:"content"`
	CreatedAt     string `json:"created_at"`
	ParentID      *int   `json:"parent_id"`
}

type LikeInput struct {
	IsLike bool `json:"isLike"`
}

type UpdateProfileInput struct {
	Bio       string   `json:"bio"`
	Clubs     []string `json:"clubs"`
	AvatarURL string   `json:"avatar_url"`
}

type Club struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MeetingTime string `json:"meeting_time"`
	Contacts    string `json:"contacts"`
	ImageURL    string `json:"image_url" db:"image_url"`
}

type ClubComment struct {
	ID            int    `json:"id"`
	ClubID        int    `json:"club_id"`
	UserID        int    `json:"user_id"`
	AuthorName    string `json:"author_name"`
	AuthorSurname string `json:"author_surname"`
	AuthorAvatar  string `json:"author_avatar"`
	Content       string `json:"content"`
	CreatedAt     string `json:"created_at"`
	ParentID      *int   `json:"parent_id"`
}

type CreateClubInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	MeetingTime string `json:"meeting_time"`
	Contacts    string `json:"contacts"`
	ImageURL    string `json:"image_url" db:"image_url"`
}

type ClubCommentInput struct {
	Content string `json:"content"`
	ParentID *int   `json:"parent_id"`
}

type ToggleClubInput struct {
	Action string `json:"action"`
}

type UpdateClubInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	MeetingTime string `json:"meeting_time"`
	Contacts    string `json:"contacts"`
	ImageURL    string `json:"image_url" db:"image_url"`
}

type FriendUser struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Surname   string `json:"surname"`
	Email     string `json:"email"`
	Group     string `json:"group"`
	Course    int    `json:"course"`
	Direction string `json:"direction"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
}

type FriendRequest struct {
	ID        int    `json:"id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	User      FriendUser `json:"user"`
}

type FriendshipStatus struct {
	Status    string `json:"status"`
	RequestID int    `json:"request_id"`
}

type ChatMember struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Surname   string `json:"surname"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
}

type Chat struct {
	ID            string       `json:"id"`
	Type          string       `json:"type"`
	Name          string       `json:"name"`
	MemberIDs     []int        `json:"member_ids"`
	Members       []ChatMember `json:"members"`
	LastMessage   string       `json:"last_message"`
	LastMessageAt time.Time    `json:"last_message_at"`
	CreatedAt     time.Time    `json:"created_at"`
	UnreadCount   int          `json:"unread_count"`
}

type Message struct {
	ID        string     `json:"id"`
	ChatID    string     `json:"chat_id"`
	SenderID  int        `json:"sender_id"`
	Sender    ChatMember `json:"sender"`
	Text      string     `json:"text"`
	CreatedAt time.Time `json:"created_at"`
}

type SendMessageInput struct {
	Text string `json:"text" binding:"required"`
}

type CreateGroupChatInput struct {
	Name      string `json:"name" binding:"required"`
	MemberIDs []int  `json:"member_ids" binding:"required"`
}