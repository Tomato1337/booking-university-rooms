package rooms

import (
	"net/http"
	"strconv"
	"strings"

	"booking-university-rooms/backend/internal/middleware"
	"booking-university-rooms/backend/internal/models"
	roomssvc "booking-university-rooms/backend/internal/services/rooms"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *roomssvc.Service
}

func NewHandler(service *roomssvc.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Search(c *gin.Context) {
	currentUserID := c.GetString(middleware.ContextUserID)

	input := roomssvc.SearchInput{
		Date:     c.Query("date"),
		Search:   c.Query("search"),
		TimeFrom: c.Query("timeFrom"),
		TimeTo:   c.Query("timeTo"),
		Cursor:   c.Query("cursor"),
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			input.Limit = l
		}
	}
	if input.Limit == 0 {
		input.Limit = 20
	}

	if equipStr := c.Query("equipment"); equipStr != "" {
		for _, idStr := range strings.Split(equipStr, ",") {
			idStr = strings.TrimSpace(idStr)
			if id, err := uuid.Parse(idStr); err == nil {
				input.EquipmentIDs = append(input.EquipmentIDs, id)
			}
		}
	}

	if minCapStr := c.Query("minCapacity"); minCapStr != "" {
		if mc, err := strconv.Atoi(minCapStr); err == nil {
			input.MinCapacity = &mc
		}
	}

	result, err := h.service.Search(c.Request.Context(), input, currentUserID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccessWithMeta(c, http.StatusOK, result.Rooms, utils.CursorMeta{
		HasMore:    result.HasMore,
		NextCursor: result.NextCursor,
	})
}

func (h *Handler) GetDetail(c *gin.Context) {
	currentUserID := c.GetString(middleware.ContextUserID)
	roomID := c.Param("roomId")
	date := c.Query("date")

	room, err := h.service.GetDetail(c.Request.Context(), roomID, date, currentUserID)
	if err != nil {
		if err == roomssvc.ErrRoomNotFound {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, room)
}

type createRoomRequest struct {
	Name         string          `json:"name" binding:"required,min=1,max=100"`
	Description  *string         `json:"description"`
	RoomType     models.RoomType `json:"roomType" binding:"required"`
	Capacity     int             `json:"capacity" binding:"required,min=1"`
	Building     string          `json:"building" binding:"required,min=1,max=200"`
	Floor        int             `json:"floor" binding:"required"`
	Photos       []string        `json:"photos"`
	OpenTime     string          `json:"openTime"`
	CloseTime    string          `json:"closeTime"`
	EquipmentIDs []string        `json:"equipmentIds"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	input := roomssvc.CreateRoomInput{
		Name:        req.Name,
		Description: req.Description,
		RoomType:    req.RoomType,
		Capacity:    req.Capacity,
		Building:    req.Building,
		Floor:       req.Floor,
		Photos:      req.Photos,
		OpenTime:    req.OpenTime,
		CloseTime:   req.CloseTime,
	}
	if input.Photos == nil {
		input.Photos = []string{}
	}

	for _, idStr := range req.EquipmentIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			input.EquipmentIDs = append(input.EquipmentIDs, id)
		}
	}

	room, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, room)
}

func (h *Handler) Update(c *gin.Context) {
	roomID := c.Param("roomId")

	var req createRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{
			{Field: "body", Message: err.Error(), Code: "invalid"},
		})
		return
	}

	input := roomssvc.CreateRoomInput{
		Name:        req.Name,
		Description: req.Description,
		RoomType:    req.RoomType,
		Capacity:    req.Capacity,
		Building:    req.Building,
		Floor:       req.Floor,
		Photos:      req.Photos,
		OpenTime:    req.OpenTime,
		CloseTime:   req.CloseTime,
	}
	if input.Photos == nil {
		input.Photos = []string{}
	}

	for _, idStr := range req.EquipmentIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			input.EquipmentIDs = append(input.EquipmentIDs, id)
		}
	}

	room, err := h.service.Update(c.Request.Context(), roomID, input)
	if err != nil {
		if err == roomssvc.ErrRoomNotFound {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, room)
}

func (h *Handler) Delete(c *gin.Context) {
	roomID := c.Param("roomId")

	if err := h.service.Delete(c.Request.Context(), roomID); err != nil {
		if err == roomssvc.ErrRoomNotFound {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) AdminSearch(c *gin.Context) {
	input := roomssvc.AdminSearchInput{
		Search: c.Query("search"),
		Status: c.Query("status"),
		Cursor: c.Query("cursor"),
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			input.Limit = l
		}
	}
	if input.Limit == 0 {
		input.Limit = 20
	}

	res, err := h.service.AdminSearch(c.Request.Context(), input)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccessWithMeta(c, http.StatusOK, res.Rooms, utils.CursorMeta{HasMore: res.HasMore, NextCursor: res.NextCursor})
}

func (h *Handler) Reactivate(c *gin.Context) {
	roomID := c.Param("roomId")

	room, err := h.service.Reactivate(c.Request.Context(), roomID)
	if err != nil {
		if err == roomssvc.ErrRoomNotFound {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, room)
}

func (h *Handler) HardDelete(c *gin.Context) {
	roomID := c.Param("roomId")

	if err := h.service.HardDelete(c.Request.Context(), roomID); err != nil {
		if err == roomssvc.ErrRoomNotFound {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		if err == roomssvc.ErrRoomHasBookings {
			utils.RespondError(c, http.StatusConflict, "ROOM_HAS_BOOKINGS", "Cannot permanently delete room with existing bookings")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	c.Status(http.StatusNoContent)
}
