package auth

import (
	"net/http"
	"time"

	authsvc "booking-university-rooms/backend/internal/services/auth"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service    *authsvc.Service
	refreshTTL time.Duration
}

func NewHandler(service *authsvc.Service, refreshTTL time.Duration) *Handler {
	return &Handler{service: service, refreshTTL: refreshTTL}
}

type registerRequest struct {
	Email      string  `json:"email" binding:"required,email,max=255"`
	Password   string  `json:"password" binding:"required,min=8,max=128"`
	FirstName  string  `json:"firstName" binding:"required,min=1,max=100"`
	LastName   string  `json:"lastName" binding:"required,min=1,max=100"`
	Department *string `json:"department"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	if !isValidPassword(req.Password) {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "password", Message: "Password must contain at least one uppercase, one lowercase, and one digit", Code: "invalid_format"},
		})
		return
	}

	result, err := h.service.Register(c.Request.Context(), authsvc.RegisterInput{
		Email:      req.Email,
		Password:   req.Password,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Department: req.Department,
	})
	if err != nil {
		if err == authsvc.ErrEmailExists {
			utils.RespondError(c, http.StatusConflict, "EMAIL_ALREADY_EXISTS", "This email is already registered")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	h.setRefreshCookie(c, result.RefreshToken)
	utils.RespondSuccess(c, http.StatusCreated, gin.H{
		"user":        result.User,
		"accessToken": result.AccessToken,
	})
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=1"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	result, err := h.service.Login(c.Request.Context(), authsvc.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		if err == authsvc.ErrInvalidCredentials {
			utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	h.setRefreshCookie(c, result.RefreshToken)
	utils.RespondSuccess(c, http.StatusOK, gin.H{
		"user":        result.User,
		"accessToken": result.AccessToken,
	})
}

func (h *Handler) Refresh(c *gin.Context) {
	rawToken, err := c.Cookie("refreshToken")
	if err != nil || rawToken == "" {
		utils.RespondError(c, http.StatusUnauthorized, "REFRESH_TOKEN_INVALID", "Refresh token is missing")
		return
	}

	result, err := h.service.Refresh(c.Request.Context(), rawToken)
	if err != nil {
		if err == authsvc.ErrRefreshTokenInvalid {
			utils.RespondError(c, http.StatusUnauthorized, "REFRESH_TOKEN_INVALID", "Refresh token is invalid, expired, or revoked")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	h.setRefreshCookie(c, result.RefreshToken)
	utils.RespondSuccess(c, http.StatusOK, gin.H{
		"accessToken": result.AccessToken,
	})
}

func (h *Handler) Logout(c *gin.Context) {
	rawToken, _ := c.Cookie("refreshToken")
	_ = h.service.Logout(c.Request.Context(), rawToken)
	h.clearRefreshCookie(c)
	c.Status(http.StatusNoContent)
}

func (h *Handler) Me(c *gin.Context) {
	userID := c.GetString("userID")
	user, err := h.service.GetMe(c.Request.Context(), userID)
	if err != nil {
		utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not found")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, user)
}

func (h *Handler) setRefreshCookie(c *gin.Context, token string) {
	maxAge := int(h.refreshTTL.Seconds())
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refreshToken", token, maxAge, "/api/auth", "", true, true)
}

func (h *Handler) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refreshToken", "", 0, "/api/auth", "", true, true)
}

func isValidPassword(password string) bool {
	hasUpper, hasLower, hasDigit := false, false, false
	for _, ch := range password {
		switch {
		case ch >= 'A' && ch <= 'Z':
			hasUpper = true
		case ch >= 'a' && ch <= 'z':
			hasLower = true
		case ch >= '0' && ch <= '9':
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
}
