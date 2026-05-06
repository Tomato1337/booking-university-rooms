package realtime

import (
	"context"
	"net/http"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/realtime"
	"booking-university-rooms/backend/internal/utils"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	hub       *realtime.Hub
	jwtSecret string
}

func NewHandler(hub *realtime.Hub, jwtSecret string) *Handler {
	return &Handler{hub: hub, jwtSecret: jwtSecret}
}

func (h *Handler) Stream(c *gin.Context) {
	token := bearerToken(c.GetHeader("Authorization"))
	if token == "" {
		token = c.Query("token")
	}
	if token == "" {
		token, _ = c.Cookie("accessToken")
	}

	claims, err := utils.ParseAccessToken(token, h.jwtSecret)
	if err != nil {
		utils.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid access token")
		return
	}

	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	events, unsubscribe := h.hub.Subscribe(claims.Sub)
	defer unsubscribe()

	ctx := c.Request.Context()
	go discardReads(ctx, conn)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-events:
			if !ok {
				return
			}
			if err := writeJSON(ctx, conn, event); err != nil {
				return
			}
		case <-ticker.C:
			if err := writeJSON(ctx, conn, realtime.PingEvent()); err != nil {
				return
			}
		}
	}
}

func bearerToken(header string) string {
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	return parts[1]
}

func discardReads(ctx context.Context, conn *websocket.Conn) {
	for {
		if _, _, err := conn.Read(ctx); err != nil {
			return
		}
	}
}

func writeJSON(ctx context.Context, conn *websocket.Conn, event realtime.Event) error {
	writeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return wsjson.Write(writeCtx, conn, event)
}
