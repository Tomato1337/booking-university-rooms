package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const testJWTSecret = "test-secret"

func TestAuthenticateAcceptsBearerHeader(t *testing.T) {
	token := newTestAccessToken(t, time.Minute)
	router := newAuthTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthenticateAcceptsAccessCookie(t *testing.T) {
	token := newTestAccessToken(t, time.Minute)
	router := newAuthTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.AddCookie(&http.Cookie{Name: "accessToken", Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthenticateRejectsMissingAccessToken(t *testing.T) {
	router := newAuthTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestAuthenticateRejectsExpiredAccessCookie(t *testing.T) {
	token := newTestAccessToken(t, -time.Minute)
	router := newAuthTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.AddCookie(&http.Cookie{Name: "accessToken", Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	if body := rec.Body.String(); !strings.Contains(body, "TOKEN_EXPIRED") {
		t.Fatalf("expected TOKEN_EXPIRED response, got %s", body)
	}
}

func newAuthTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/private", Authenticate(testJWTSecret), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return router
}

func newTestAccessToken(t *testing.T, ttl time.Duration) string {
	t.Helper()
	token, err := utils.GenerateAccessToken(uuid.New(), "user@example.com", "user", testJWTSecret, ttl)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	return token
}
