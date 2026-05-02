package middleware

import (
	"errors"
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
		tokenStr, err := accessTokenFromRequest(c)
		if err != nil {
			utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
			c.Abort()
			return
		}

		claims, err := utils.ParseAccessToken(tokenStr, jwtSecret)
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

func accessTokenFromRequest(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return "", errInvalidAuthorizationHeader
		}
		return parts[1], nil
	}

	token, err := c.Cookie("accessToken")
	if err != nil || token == "" {
		return "", errMissingAccessToken
	}
	return token, nil
}

var (
	errMissingAccessToken         = errors.New("Missing access token")
	errInvalidAuthorizationHeader = errors.New("Invalid authorization header format")
)

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
