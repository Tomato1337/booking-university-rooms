package middleware

import (
	"net/http"
	"strings"

	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

const (
	ContextUserID = "userID"
	ContextEmail  = "userEmail"
	ContextRole   = "userRole"
)

func Authenticate(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization header")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization header format")
			c.Abort()
			return
		}

		claims, err := utils.ParseAccessToken(parts[1], jwtSecret)
		if err != nil {
			if strings.Contains(err.Error(), "expired") {
				utils.RespondError(c, http.StatusUnauthorized, "TOKEN_EXPIRED", "Access token has expired")
			} else {
				utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid access token")
			}
			c.Abort()
			return
		}

		c.Set(ContextUserID, claims.Sub)
		c.Set(ContextEmail, claims.Email)
		c.Set(ContextRole, claims.Role)
		c.Next()
	}
}

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get(ContextRole)
		if !exists {
			utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
			c.Abort()
			return
		}
		if userRole.(string) != role {
			utils.RespondError(c, http.StatusForbidden, "FORBIDDEN", "Insufficient permissions")
			c.Abort()
			return
		}
		c.Next()
	}
}
