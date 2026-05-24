package handlers

import (

	"github.com/gin-gonic/gin"
)

func isCurrentUserAdmin(c *gin.Context) bool {
	roleValue, exists := c.Get("role")
	if !exists {
		return false
	}

	role, ok := roleValue.(string)
	if !ok {
		return false
	}

	return role == "admin"
}