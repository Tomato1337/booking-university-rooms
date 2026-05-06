package equipment

import (
	"net/http"
	"regexp"
	"strings"

	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	equipmentsvc "booking-university-rooms/backend/internal/services/equipment"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

var equipmentCodeRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,63}$`)

type Handler struct {
	service *equipmentsvc.Service
}

func NewHandler(service *equipmentsvc.Service) *Handler {
	return &Handler{service: service}
}

func requestLocale(c *gin.Context) string {
	if locale := c.GetHeader("X-Locale"); locale != "" {
		return catalogssvc.NormalizeLocale(locale)
	}
	return catalogssvc.NormalizeLocale(c.GetHeader("Accept-Language"))
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context(), requestLocale(c))
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}

func (h *Handler) ListAdmin(c *gin.Context) {
	items, err := h.service.ListAdmin(c.Request.Context())
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}

type equipmentRequest struct {
	Code      string `json:"code"`
	LabelRu   string `json:"labelRu" binding:"required,min=1,max=100"`
	LabelEn   string `json:"labelEn" binding:"required,min=1,max=100"`
	Icon      string `json:"icon" binding:"required"`
	IsActive  *bool  `json:"isActive"`
	SortOrder int    `json:"sortOrder"`
}

func inputFromRequest(req equipmentRequest) (equipmentsvc.Input, bool) {
	code := strings.TrimSpace(req.Code)
	if !equipmentCodeRegex.MatchString(code) {
		return equipmentsvc.Input{}, false
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	return equipmentsvc.Input{
		Code:      code,
		LabelRu:   strings.TrimSpace(req.LabelRu),
		LabelEn:   strings.TrimSpace(req.LabelEn),
		Icon:      strings.TrimSpace(req.Icon),
		IsActive:  isActive,
		SortOrder: req.SortOrder,
	}, true
}

func (h *Handler) Create(c *gin.Context) {
	var req equipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "body", Message: err.Error(), Code: "invalid"}})
		return
	}
	input, ok := inputFromRequest(req)
	if !ok {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "code", Message: "code must be 2-64 chars and contain lowercase letters, digits, underscore, or dash", Code: "invalid"}})
		return
	}

	item, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNameTaken:
			utils.RespondError(c, http.StatusConflict, "EQUIPMENT_NAME_TAKEN", "Equipment label already exists")
		case equipmentsvc.ErrEquipmentCodeTaken:
			utils.RespondError(c, http.StatusConflict, "EQUIPMENT_CODE_TAKEN", "Equipment code already exists")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, item)
}

func (h *Handler) Update(c *gin.Context) {
	equipmentID := c.Param("equipmentId")

	var req equipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "body", Message: err.Error(), Code: "invalid"}})
		return
	}
	input, ok := inputFromRequest(req)
	if !ok {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "code", Message: "code must be 2-64 chars and contain lowercase letters, digits, underscore, or dash", Code: "invalid"}})
		return
	}

	item, err := h.service.Update(c.Request.Context(), equipmentID, input)
	if err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNotFound:
			utils.RespondError(c, http.StatusNotFound, "EQUIPMENT_NOT_FOUND", "Equipment not found")
		case equipmentsvc.ErrEquipmentNameTaken:
			utils.RespondError(c, http.StatusConflict, "EQUIPMENT_NAME_TAKEN", "Equipment label already exists")
		case equipmentsvc.ErrEquipmentCodeTaken:
			utils.RespondError(c, http.StatusConflict, "EQUIPMENT_CODE_TAKEN", "Equipment code already exists")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusOK, item)
}

func (h *Handler) Delete(c *gin.Context) {
	equipmentID := c.Param("equipmentId")

	if err := h.service.Delete(c.Request.Context(), equipmentID); err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNotFound:
			utils.RespondError(c, http.StatusNotFound, "EQUIPMENT_NOT_FOUND", "Equipment not found")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) Reactivate(c *gin.Context) {
	item, err := h.service.Reactivate(c.Request.Context(), c.Param("equipmentId"))
	if err != nil {
		switch err {
		case equipmentsvc.ErrEquipmentNotFound:
			utils.RespondError(c, http.StatusNotFound, "EQUIPMENT_NOT_FOUND", "Equipment not found")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}
	utils.RespondSuccess(c, http.StatusOK, item)
}

func (h *Handler) HardDelete(c *gin.Context) {
	result, err := h.service.HardDelete(c.Request.Context(), c.Param("equipmentId"))
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
