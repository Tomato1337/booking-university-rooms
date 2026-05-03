package admin

import (
	"net/http"
	"strconv"

	"booking-university-rooms/backend/internal/middleware"
	adminsvc "booking-university-rooms/backend/internal/services/admin"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *adminsvc.Service
}

func NewHandler(service *adminsvc.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListPending(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.service.ListPending(c.Request.Context(), adminsvc.ListPendingInput{
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

func (h *Handler) Approve(c *gin.Context) {
	bookingID := c.Param("bookingId")
	adminID := c.GetString(middleware.ContextUserID)

	result, err := h.service.Approve(c.Request.Context(), bookingID, adminID)
	if err != nil {
		switch err {
		case adminsvc.ErrBookingNotFound:
			utils.RespondError(c, http.StatusNotFound, "BOOKING_NOT_FOUND", "Booking not found")
		case adminsvc.ErrBookingAlreadyProcessed:
			utils.RespondError(c, http.StatusConflict, "BOOKING_ALREADY_PROCESSED", "Booking has already been processed")
		case adminsvc.ErrBookingConflict:
			utils.RespondError(c, http.StatusConflict, "BOOKING_CONFLICT", "Time slot conflicts with another confirmed booking")
		case adminsvc.ErrBookingInPast:
			utils.RespondError(c, http.StatusUnprocessableEntity, "BOOKING_IN_PAST", "Booking time is in the past")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusOK, gin.H{
		"booking":      result.Booking,
		"autoRejected": result.AutoRejected,
	})
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func (h *Handler) Reject(c *gin.Context) {
	bookingID := c.Param("bookingId")
	adminID := c.GetString(middleware.ContextUserID)

	var req rejectRequest
	_ = c.ShouldBindJSON(&req)

	booking, err := h.service.Reject(c.Request.Context(), bookingID, adminID, req.Reason)
	if err != nil {
		switch err {
		case adminsvc.ErrBookingNotFound:
			utils.RespondError(c, http.StatusNotFound, "BOOKING_NOT_FOUND", "Booking not found")
		case adminsvc.ErrBookingAlreadyProcessed:
			utils.RespondError(c, http.StatusConflict, "BOOKING_ALREADY_PROCESSED", "Booking has already been processed")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusOK, gin.H{
		"id":           booking.ID,
		"status":       booking.Status,
		"statusReason": booking.StatusReason,
		"updatedAt":    booking.UpdatedAt,
	})
}

type bulkImportRequest struct {
	Bookings []adminsvc.BulkImportInput `json:"bookings"`
}

func (h *Handler) ImportBookings(c *gin.Context) {
	var req bulkImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	adminIDStr := c.GetString(middleware.ContextUserID)
	adminID, err := uuid.Parse(adminIDStr)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Invalid admin ID")
		return
	}

	created, err := h.service.BulkImport(c.Request.Context(), adminID, req.Bookings)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, gin.H{"created": created})
}

func (h *Handler) ApproveAll(c *gin.Context) {
	approved, err := h.service.ApproveAll(c.Request.Context())
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, gin.H{"approved": approved})
}

func (h *Handler) GetStats(c *gin.Context) {
	period := c.Query("period")
	stats, err := h.service.GetStats(c.Request.Context(), period)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, stats)
}
