package bookings

import (
	"net/http"
	"strconv"

	"booking-university-rooms/backend/internal/middleware"
	"booking-university-rooms/backend/internal/models"
	bookingsvc "booking-university-rooms/backend/internal/services/bookings"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *bookingsvc.Service
}

func NewHandler(service *bookingsvc.Service) *Handler {
	return &Handler{service: service}
}

func requestLocale(c *gin.Context) string {
	if locale := c.GetHeader("X-Locale"); locale != "" {
		return catalogssvc.NormalizeLocale(locale)
	}
	return catalogssvc.NormalizeLocale(c.GetHeader("Accept-Language"))
}

type createRequest struct {
	RoomID        string `json:"roomId" binding:"required,uuid"`
	Title         string `json:"title" binding:"required,min=1,max=200"`
	Purpose       string `json:"purpose" binding:"required"`
	BookingDate   string `json:"bookingDate" binding:"required"`
	StartTime     string `json:"startTime" binding:"required"`
	EndTime       string `json:"endTime" binding:"required"`
	AttendeeCount *int   `json:"attendeeCount"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	roomID, err := uuid.Parse(req.RoomID)
	if err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "roomId", Message: "Invalid UUID", Code: "invalid_uuid"},
		})
		return
	}

	userID := c.GetString(middleware.ContextUserID)

	booking, err := h.service.Create(c.Request.Context(), userID, bookingsvc.CreateInput{
		RoomID:        roomID,
		Title:         req.Title,
		Purpose:       models.BookingPurpose(req.Purpose),
		BookingDate:   req.BookingDate,
		StartTime:     req.StartTime,
		EndTime:       req.EndTime,
		AttendeeCount: req.AttendeeCount,
	})
	if err != nil {
		switch err {
		case bookingsvc.ErrRoomNotFound:
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found or inactive")
		case bookingsvc.ErrInvalidTimeRange:
			utils.RespondError(c, http.StatusBadRequest, "INVALID_TIME_RANGE", "Invalid time range: must be HH:mm (5-minute aligned), startTime < endTime")
		case bookingsvc.ErrInvalidPurpose:
			utils.RespondError(c, http.StatusBadRequest, "INVALID_BOOKING_PURPOSE", "Booking purpose does not exist or is inactive")
		case bookingsvc.ErrBookingInPast:
			utils.RespondError(c, http.StatusUnprocessableEntity, "BOOKING_IN_PAST", "Cannot book a time slot in the past")
		case bookingsvc.ErrCapacityExceeded:
			utils.RespondError(c, http.StatusBadRequest, "CAPACITY_EXCEEDED", "Attendee count exceeds room capacity")
		case bookingsvc.ErrBookingConflict:
			utils.RespondError(c, http.StatusConflict, "BOOKING_CONFLICT", "Time slot conflicts with an existing confirmed booking")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, booking)
}

func (h *Handler) ListMy(c *gin.Context) {
	userID := c.GetString(middleware.ContextUserID)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.service.ListMy(c.Request.Context(), bookingsvc.ListMyInput{
		UserID: userID,
		Search: c.Query("search"),
		Limit:  limit,
		Locale: requestLocale(c),
		Cursor: c.Query("cursor"),
	})
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccessWithMeta(c, http.StatusOK, result.Bookings, utils.CursorMeta{
		HasMore:    result.HasMore,
		NextCursor: result.NextCursor,
	})
}

func (h *Handler) ListMyHistory(c *gin.Context) {
	userID := c.GetString(middleware.ContextUserID)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.service.ListMyHistory(c.Request.Context(), bookingsvc.ListMyInput{
		UserID: userID,
		Search: c.Query("search"),
		Limit:  limit,
		Locale: requestLocale(c),
		Cursor: c.Query("cursor"),
	})
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccessWithMeta(c, http.StatusOK, result.Bookings, utils.CursorMeta{
		HasMore:    result.HasMore,
		NextCursor: result.NextCursor,
	})
}

func (h *Handler) Cancel(c *gin.Context) {
	bookingID := c.Param("bookingId")
	userID := c.GetString(middleware.ContextUserID)
	role := c.GetString(middleware.ContextRole)
	isAdmin := role == "admin"

	booking, err := h.service.Cancel(c.Request.Context(), bookingID, userID, isAdmin)
	if err != nil {
		switch err {
		case bookingsvc.ErrBookingNotFound:
			utils.RespondError(c, http.StatusNotFound, "BOOKING_NOT_FOUND", "Booking not found")
		case bookingsvc.ErrNotOwner:
			utils.RespondError(c, http.StatusForbidden, "NOT_OWNER", "You are not the owner of this booking")
		case bookingsvc.ErrBookingAlreadyProcessed:
			utils.RespondError(c, http.StatusConflict, "BOOKING_ALREADY_PROCESSED", "Booking has already been processed")
		case bookingsvc.ErrBookingInPast:
			utils.RespondError(c, http.StatusUnprocessableEntity, "BOOKING_IN_PAST", "Cannot cancel a booking that has already started")
		default:
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		}
		return
	}

	utils.RespondSuccess(c, http.StatusOK, gin.H{
		"id":        booking.ID,
		"status":    booking.Status,
		"updatedAt": booking.UpdatedAt,
	})
}
