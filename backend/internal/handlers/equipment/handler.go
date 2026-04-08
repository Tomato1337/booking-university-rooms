package equipment

import (
	"net/http"

	roomssvc "booking-university-rooms/backend/internal/services/rooms"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *roomssvc.Service
}

func NewHandler(service *roomssvc.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.ListEquipment(c.Request.Context())
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}
