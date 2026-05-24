package main

import (
	"itstep-network/config"
	"itstep-network/internal/handlers"
	"itstep-network/internal/middleware"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.ConnectDatabase()
	config.ConnectMongo()

	r := gin.Default()

	r.Static("/uploads", "./uploads")

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	cfg := config.LoadConfig()

	api := r.Group("/api/v1")
	{
		api.POST("/auth/register", handlers.Register)
		api.POST("/auth/login", handlers.Login)

		protected := api.Group("")
		protected.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			protected.GET("/auth/me", handlers.GetCurrentUser)
			protected.GET("/users/:id", handlers.GetUserByID)
			protected.GET("/search/users", handlers.SearchUsers)
			
			protected.POST("/upload", handlers.UploadImage)

			protected.GET("/posts", handlers.GetPosts)
			protected.POST("/posts", handlers.CreatePost)
			protected.DELETE("/posts/:id", handlers.DeletePost)
			protected.GET("/posts/:id/comments", handlers.GetPostComments)
			protected.POST("/posts/:id/comments", handlers.AddPostComment)
			protected.POST("/posts/:id/like", handlers.ToggleLike)

			protected.GET("/clubs", handlers.GetClubs)
			protected.POST("/clubs", handlers.CreateClub)
			protected.DELETE("/clubs/:id", handlers.DeleteClub)
			protected.POST("/clubs/:id/membership", handlers.ToggleClubMembership)
			protected.GET("/clubs/:id/members", handlers.GetClubMembers)
			protected.GET("/clubs/:id/comments", handlers.GetClubComments)
			protected.POST("/clubs/:id/comments", handlers.AddClubComment)
			protected.PUT("/clubs/:id", handlers.UpdateClub)

			protected.GET("/friends", handlers.GetFriends)
			protected.GET("/users/:id/friends", handlers.GetUserFriends)
			protected.GET("/friends/requests/incoming", handlers.GetIncomingFriendRequests)
			protected.GET("/friends/requests/outgoing", handlers.GetOutgoingFriendRequests)
			protected.GET("/friends/status/:id", handlers.GetFriendshipStatus)
			protected.POST("/friends/requests/:id", handlers.SendFriendRequest)
			protected.PUT("/friends/requests/:id/accept", handlers.AcceptFriendRequest)
			protected.DELETE("/friends/requests/:id", handlers.DeleteFriendRequest)
			protected.DELETE("/friends/:id", handlers.RemoveFriend)

			protected.GET("/chats", handlers.GetChats)
			protected.POST("/chats/direct/:id", handlers.GetOrCreateDirectChat)
			protected.POST("/chats/group", handlers.CreateGroupChat)
			protected.GET("/chats/:id/messages", handlers.GetMessages)
			protected.POST("/chats/:id/messages", handlers.SendMessage)

			protected.GET("/users/:id/posts", handlers.GetUserPosts)
			protected.GET("/user/posts", handlers.GetUserPosts)
			protected.PUT("/user/profile", handlers.UpdateProfile)
		}
	}

	log.Println("Сервер запущен на :8080")
	r.Run(":8080")
}