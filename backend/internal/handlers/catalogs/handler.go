package catalogs

import (
	"net/http"
	"regexp"
	"strings"

	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

var catalogCodeRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,63}$`)

type Handler struct {
	service *catalogssvc.Service
}

func NewHandler(service *catalogssvc.Service) *Handler {
	return &Handler{service: service}
}

func requestLocale(c *gin.Context) string {
	if locale := c.GetHeader("X-Locale"); locale != "" {
		return catalogssvc.NormalizeLocale(locale)
	}
	return catalogssvc.NormalizeLocale(c.GetHeader("Accept-Language"))
}

func (h *Handler) ListBuildings(c *gin.Context) {
	items, err := h.service.ListBuildings(c.Request.Context(), requestLocale(c))
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}

func (h *Handler) ListBookingPurposes(c *gin.Context) {
	items, err := h.service.ListBookingPurposes(c.Request.Context(), requestLocale(c))
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}

func (h *Handler) ListAdminBookingPurposes(c *gin.Context) {
	items, err := h.service.ListAdminBookingPurposes(c.Request.Context())
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, items)
}

type bookingPurposeRequest struct {
	Code      string `json:"code"`
	LabelRu   string `json:"labelRu" binding:"required,min=1,max=200"`
	LabelEn   string `json:"labelEn" binding:"required,min=1,max=200"`
	IsActive  *bool  `json:"isActive"`
	SortOrder int    `json:"sortOrder"`
}

func (h *Handler) CreateBookingPurpose(c *gin.Context) {
	var req bookingPurposeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "body", Message: err.Error(), Code: "invalid"}})
		return
	}

	code := strings.TrimSpace(req.Code)
	if !catalogCodeRegex.MatchString(code) {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "code", Message: "code must be 2-64 chars and contain lowercase letters, digits, underscore, or dash", Code: "invalid"}})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	item, err := h.service.CreateBookingPurpose(c.Request.Context(), catalogssvc.BookingPurposeInput{
		Code:      code,
		LabelRu:   strings.TrimSpace(req.LabelRu),
		LabelEn:   strings.TrimSpace(req.LabelEn),
		IsActive:  isActive,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		if err == catalogssvc.ErrPurposeExists {
			utils.RespondError(c, http.StatusConflict, "BOOKING_PURPOSE_EXISTS", "Booking purpose already exists")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, item)
}

func (h *Handler) UpdateBookingPurpose(c *gin.Context) {
	var req bookingPurposeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "body", Message: err.Error(), Code: "invalid"}})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	item, err := h.service.UpdateBookingPurpose(c.Request.Context(), c.Param("code"), catalogssvc.BookingPurposeInput{
		LabelRu:   strings.TrimSpace(req.LabelRu),
		LabelEn:   strings.TrimSpace(req.LabelEn),
		IsActive:  isActive,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		if err == catalogssvc.ErrPurposeNotFound {
			utils.RespondError(c, http.StatusNotFound, "BOOKING_PURPOSE_NOT_FOUND", "Booking purpose not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, item)
}

func (h *Handler) DeactivateBookingPurpose(c *gin.Context) {
	if err := h.service.DeactivateBookingPurpose(c.Request.Context(), c.Param("code")); err != nil {
		if err == catalogssvc.ErrPurposeNotFound {
			utils.RespondError(c, http.StatusNotFound, "BOOKING_PURPOSE_NOT_FOUND", "Booking purpose not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ReactivateBookingPurpose(c *gin.Context) {
	item, err := h.service.ReactivateBookingPurpose(c.Request.Context(), c.Param("code"))
	if err != nil {
		if err == catalogssvc.ErrPurposeNotFound {
			utils.RespondError(c, http.StatusNotFound, "BOOKING_PURPOSE_NOT_FOUND", "Booking purpose not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, item)
}

func (h *Handler) HardDeleteBookingPurpose(c *gin.Context) {
	if err := h.service.HardDeleteBookingPurpose(c.Request.Context(), c.Param("code")); err != nil {
		switch err {
		case catalogssvc.ErrPurposeNotFound:
			utils.RespondError(c, http.StatusNotFound, "BOOKING_PURPOSE_NOT_FOUND", "Booking purpose not found")
		case catalogssvc.ErrPurposeInUse:
			utils.RespondError(c, http.StatusConflict, "BOOKING_PURPOSE_IN_USE", "Booking purpose is used by existing bookings")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}
	c.Status(http.StatusNoContent)
}
