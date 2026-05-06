package rooms

import (
	"net/http"
	"strconv"
	"strings"

	"booking-university-rooms/backend/internal/middleware"
	roomssvc "booking-university-rooms/backend/internal/services/rooms"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handler) GetTimeline(c *gin.Context) {
	currentUserID := c.GetString(middleware.ContextUserID)
	isAdmin := c.GetString(middleware.ContextRole) == "admin"

	input := roomssvc.TimelineInput{
		Date:     c.Query("date"),
		Mode:     c.Query("mode"),
		Search:   c.Query("search"),
		Building: c.Query("building"),
		RoomType: c.Query("roomType"),
		Cursor:   c.Query("cursor"),
		Locale:   requestLocale(c),
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			input.Limit = l
		}
	}
	if minCapStr := c.Query("minCapacity"); minCapStr != "" {
		if mc, err := strconv.Atoi(minCapStr); err == nil {
			input.MinCapacity = &mc
		}
	}
	if equipStr := c.Query("equipment"); equipStr != "" {
		for _, idStr := range strings.Split(equipStr, ",") {
			idStr = strings.TrimSpace(idStr)
			if id, err := uuid.Parse(idStr); err == nil {
				input.EquipmentIDs = append(input.EquipmentIDs, id)
			}
		}
	}

	result, err := h.service.GetTimeline(c.Request.Context(), input, currentUserID, isAdmin)
	if err != nil {
		if err == roomssvc.ErrInvalidDate {
			utils.RespondError(c, http.StatusBadRequest, "INVALID_DATE", "Date must use YYYY-MM-DD format")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result.Rooms, "meta": result.Meta})
}
