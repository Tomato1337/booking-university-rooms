package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestAccessAndRefreshCookiesAreSet(t *testing.T) {
	c, rec := newCookieTestContext()
	handler := NewHandler(nil, 15*time.Minute, 30*24*time.Hour)

	handler.setAccessCookie(c, "access-token")
	handler.setRefreshCookie(c, "refresh-token")

	cookies := cookiesByName(rec.Result().Cookies())

	access := cookies["accessToken"]
	if access == nil {
		t.Fatal("expected accessToken cookie")
	}
	if access.Value != "access-token" || access.Path != "/api" || access.MaxAge != 900 || !access.HttpOnly || !access.Secure {
		t.Fatalf("unexpected accessToken cookie: %+v", access)
	}

	refresh := cookies["refreshToken"]
	if refresh == nil {
		t.Fatal("expected refreshToken cookie")
	}
	if refresh.Value != "refresh-token" || refresh.Path != "/api/auth" || refresh.MaxAge != 2592000 || !refresh.HttpOnly || !refresh.Secure {
		t.Fatalf("unexpected refreshToken cookie: %+v", refresh)
	}
}

func TestAccessAndRefreshCookiesAreCleared(t *testing.T) {
	c, rec := newCookieTestContext()
	handler := NewHandler(nil, 15*time.Minute, 30*24*time.Hour)

	handler.clearAccessCookie(c)
	handler.clearRefreshCookie(c)

	cookies := cookiesByName(rec.Result().Cookies())

	access := cookies["accessToken"]
	if access == nil {
		t.Fatal("expected cleared accessToken cookie")
	}
	if access.Value != "" || access.Path != "/api" || access.MaxAge != -1 || !access.HttpOnly || !access.Secure {
		t.Fatalf("unexpected cleared accessToken cookie: %+v", access)
	}

	refresh := cookies["refreshToken"]
	if refresh == nil {
		t.Fatal("expected cleared refreshToken cookie")
	}
	if refresh.Value != "" || refresh.Path != "/api/auth" || refresh.MaxAge != -1 || !refresh.HttpOnly || !refresh.Secure {
		t.Fatalf("unexpected cleared refreshToken cookie: %+v", refresh)
	}
}

func newCookieTestContext() (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/auth/test", nil)
	return c, rec
}

func cookiesByName(cookies []*http.Cookie) map[string]*http.Cookie {
	result := make(map[string]*http.Cookie, len(cookies))
	for _, cookie := range cookies {
		result[cookie.Name] = cookie
	}
	return result
}
