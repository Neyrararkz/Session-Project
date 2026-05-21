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
			
			protected.GET("/posts", handlers.GetPosts)
			protected.POST("/posts", handlers.CreatePost)
			protected.DELETE("/posts/:id", handlers.DeletePost)
			protected.POST("/posts/:id/like", handlers.ToggleLike)

			protected.GET("/clubs", handlers.GetClubs)
			protected.POST("/clubs", handlers.CreateClub)
			protected.DELETE("/clubs/:id", handlers.DeleteClub)
			protected.POST("/clubs/:id/membership", handlers.ToggleClubMembership) 
			protected.GET("/clubs/:id/comments", handlers.GetClubComments)
			protected.POST("/clubs/:id/comments", handlers.AddClubComment)

			protected.GET("/chats", handlers.GetChats)
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