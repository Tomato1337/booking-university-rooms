package admin

import (
	"net/http"
	"strconv"

	adminsvc "booking-university-rooms/backend/internal/services/admin"
	"booking-university-rooms/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

func (h *Handler) ListHistory(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.service.ListHistory(c.Request.Context(), adminsvc.ListHistoryInput{
		Search: c.Query("search"),
		Limit:  limit,
		Cursor: c.Query("cursor"),
	})
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccessWithMeta(c, http.StatusOK, result.Bookings, utils.CursorMetaWithTotal{
		Total:      result.Total,
		HasMore:    result.HasMore,
		NextCursor: result.NextCursor,
	})
}
