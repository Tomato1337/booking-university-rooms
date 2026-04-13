package equipment

import (
	"net/http"

	equipmentsvc "booking-university-rooms/backend/internal/services/equipment"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *equipmentsvc.Service
}

func NewHandler(service *equipmentsvc.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}

type createEquipmentRequest struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
	Icon string `json:"icon" binding:"required"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createEquipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	item, err := h.service.Create(c.Request.Context(), req.Name, req.Icon)
	if err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNameTaken:
			utils.RespondError(c, http.StatusConflict, "EQUIPMENT_NAME_TAKEN", "Equipment name already exists")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, item)
}

func (h *Handler) Update(c *gin.Context) {
	equipmentID := c.Param("equipmentId")

	var req createEquipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	item, err := h.service.Update(c.Request.Context(), equipmentID, req.Name, req.Icon)
	if err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNotFound:
			utils.RespondError(c, http.StatusNotFound, "EQUIPMENT_NOT_FOUND", "Equipment not found")
		case equipmentsvc.ErrEquipmentNameTaken:
			utils.RespondError(c, http.StatusConflict, "EQUIPMENT_NAME_TAKEN", "Equipment name already exists")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusOK, item)
}

func (h *Handler) Delete(c *gin.Context) {
	equipmentID := c.Param("equipmentId")

	result, err := h.service.Delete(c.Request.Context(), equipmentID)
	if err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNotFound:
			utils.RespondError(c, http.StatusNotFound, "EQUIPMENT_NOT_FOUND", "Equipment not found")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusOK, result)
}
