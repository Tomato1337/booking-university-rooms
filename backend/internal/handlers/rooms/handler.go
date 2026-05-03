package rooms

import (
	"context"
	"errors"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"booking-university-rooms/backend/internal/middleware"
	"booking-university-rooms/backend/internal/models"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	roomssvc "booking-university-rooms/backend/internal/services/rooms"
	"booking-university-rooms/backend/internal/storage"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type roomPhotoStorage interface {
	UploadRoomPhoto(ctx context.Context, roomID uuid.UUID, fileHeader *multipart.FileHeader) (string, error)
	GetRoomPhoto(ctx context.Context, roomPhotoPath string) (*storage.RoomPhoto, error)
	DeleteManagedRoomPhotoURL(ctx context.Context, photoURL string)
}

type Handler struct {
	service           *roomssvc.Service
	photoStorage      roomPhotoStorage
	maxRoomPhotoBytes int64
}

func NewHandler(service *roomssvc.Service, photoStorage roomPhotoStorage, maxRoomPhotoBytes int64) *Handler {
	if maxRoomPhotoBytes <= 0 {
		maxRoomPhotoBytes = 5 * 1024 * 1024
	}
	return &Handler{service: service, photoStorage: photoStorage, maxRoomPhotoBytes: maxRoomPhotoBytes}
}

func requestLocale(c *gin.Context) string {
	if locale := c.GetHeader("X-Locale"); locale != "" {
		return catalogssvc.NormalizeLocale(locale)
	}
	return catalogssvc.NormalizeLocale(c.GetHeader("Accept-Language"))
}

func (h *Handler) Search(c *gin.Context) {
	currentUserID := c.GetString(middleware.ContextUserID)

	input := roomssvc.SearchInput{
		Date:     c.Query("date"),
		Search:   c.Query("search"),
		Building: c.Query("building"),
		Locale:   requestLocale(c),
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
		if err == roomssvc.ErrInvalidTimeRange {
			utils.RespondError(c, http.StatusBadRequest, "INVALID_TIME_RANGE", "Invalid time range: must be HH:mm (5-minute aligned), startTime < endTime")
			return
		}
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

	room, err := h.service.GetDetail(c.Request.Context(), roomID, date, currentUserID, requestLocale(c))
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
	req, photo, _, _, ok := h.bindCreateRoomRequest(c)
	if !ok {
		return
	}

	roomID := uuid.New()
	var uploadedPhotoURL string
	if photo != nil {
		if h.photoStorage == nil {
			utils.RespondError(c, http.StatusInternalServerError, "MEDIA_STORAGE_UNAVAILABLE", "Media storage is not configured")
			return
		}
		photoURL, err := h.photoStorage.UploadRoomPhoto(c.Request.Context(), roomID, photo)
		if err != nil {
			respondPhotoUploadError(c, err)
			return
		}
		uploadedPhotoURL = photoURL
		req.Photos = []string{photoURL}
	} else {
		req.Photos = normalizeSinglePhoto(req.Photos)
	}

	input := roomssvc.CreateRoomInput{
		ID:          roomID,
		Name:        req.Name,
		Description: req.Description,
		RoomType:    req.RoomType,
		Capacity:    req.Capacity,
		Building:    req.Building,
		Floor:       req.Floor,
		Photos:      req.Photos,
		OpenTime:    req.OpenTime,
		CloseTime:   req.CloseTime,
		Locale:      requestLocale(c),
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
		if uploadedPhotoURL != "" && h.photoStorage != nil {
			h.photoStorage.DeleteManagedRoomPhotoURL(c.Request.Context(), uploadedPhotoURL)
		}
		if err == roomssvc.ErrInvalidTimeRange {
			utils.RespondError(c, http.StatusBadRequest, "INVALID_TIME_RANGE", "Invalid room hours: must be HH:mm (5-minute aligned), openTime < closeTime")
			return
		}
		if err == roomssvc.ErrInvalidBuilding {
			utils.RespondError(c, http.StatusBadRequest, "INVALID_BUILDING", "Building does not exist or is inactive")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, room)
}

func (h *Handler) Update(c *gin.Context) {
	roomID := c.Param("roomId")

	req, photo, removePhoto, isMultipart, ok := h.bindCreateRoomRequest(c)
	if !ok {
		return
	}

	var oldPhotos []string
	photoChanged := photo != nil || removePhoto
	if photoChanged {
		var err error
		oldPhotos, err = h.service.GetRoomPhotos(c.Request.Context(), roomID)
		if err != nil {
			if err == roomssvc.ErrRoomNotFound {
				utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
				return
			}
			utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
			return
		}
	}

	var newPhotoURL string
	if photo != nil {
		parsedRoomID, err := uuid.Parse(roomID)
		if err != nil {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		if h.photoStorage == nil {
			utils.RespondError(c, http.StatusInternalServerError, "MEDIA_STORAGE_UNAVAILABLE", "Media storage is not configured")
			return
		}
		newPhotoURL, err = h.photoStorage.UploadRoomPhoto(c.Request.Context(), parsedRoomID, photo)
		if err != nil {
			respondPhotoUploadError(c, err)
			return
		}
		req.Photos = []string{newPhotoURL}
	} else if removePhoto {
		req.Photos = []string{}
	} else {
		req.Photos = normalizeSinglePhoto(req.Photos)
	}

	input := roomssvc.CreateRoomInput{
		Name:               req.Name,
		Description:        req.Description,
		RoomType:           req.RoomType,
		Capacity:           req.Capacity,
		Building:           req.Building,
		Floor:              req.Floor,
		Photos:             req.Photos,
		KeepExistingPhotos: isMultipart && !photoChanged,
		OpenTime:           req.OpenTime,
		CloseTime:          req.CloseTime,
		Locale:             requestLocale(c),
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
		if newPhotoURL != "" && h.photoStorage != nil {
			h.photoStorage.DeleteManagedRoomPhotoURL(c.Request.Context(), newPhotoURL)
		}
		if err == roomssvc.ErrRoomNotFound {
			utils.RespondError(c, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
			return
		}
		if err == roomssvc.ErrInvalidTimeRange {
			utils.RespondError(c, http.StatusBadRequest, "INVALID_TIME_RANGE", "Invalid room hours: must be HH:mm (5-minute aligned), openTime < closeTime")
			return
		}
		if err == roomssvc.ErrInvalidBuilding {
			utils.RespondError(c, http.StatusBadRequest, "INVALID_BUILDING", "Building does not exist or is inactive")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if photoChanged && h.photoStorage != nil {
		for _, oldPhoto := range oldPhotos {
			h.photoStorage.DeleteManagedRoomPhotoURL(c.Request.Context(), oldPhoto)
		}
	}

	utils.RespondSuccess(c, http.StatusOK, room)
}

func (h *Handler) GetRoomMedia(c *gin.Context) {
	if h.photoStorage == nil {
		utils.RespondError(c, http.StatusNotFound, "MEDIA_NOT_FOUND", "Media not found")
		return
	}

	objectPath := c.Param("objectKey")
	if strings.Contains(objectPath, "..") {
		utils.RespondError(c, http.StatusNotFound, "MEDIA_NOT_FOUND", "Media not found")
		return
	}

	photo, err := h.photoStorage.GetRoomPhoto(c.Request.Context(), objectPath)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "MEDIA_NOT_FOUND", "Media not found")
		return
	}
	defer photo.Reader.Close()

	contentType := photo.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	c.DataFromReader(http.StatusOK, photo.Size, contentType, photo.Reader, nil)
}

func (h *Handler) bindCreateRoomRequest(c *gin.Context) (createRoomRequest, *multipart.FileHeader, bool, bool, bool) {
	contentType := c.GetHeader("Content-Type")
	if !strings.HasPrefix(contentType, "multipart/form-data") {
		var req createRoomRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.RespondValidationError(c, []utils.ValidationField{
				{Field: "body", Message: err.Error(), Code: "invalid"},
			})
			return req, nil, false, false, false
		}
		req.Photos = normalizeSinglePhoto(req.Photos)
		return req, nil, false, false, true
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.maxRoomPhotoBytes+2*1024*1024)
	if err := c.Request.ParseMultipartForm(h.maxRoomPhotoBytes + 1024*1024); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid multipart form data")
		return createRoomRequest{}, nil, false, true, false
	}

	capacity, err := strconv.Atoi(c.PostForm("capacity"))
	if err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "capacity", Message: "capacity is required", Code: "required"}})
		return createRoomRequest{}, nil, false, true, false
	}
	floor, err := strconv.Atoi(c.PostForm("floor"))
	if err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "floor", Message: "floor is required", Code: "required"}})
		return createRoomRequest{}, nil, false, true, false
	}

	req := createRoomRequest{
		Name:         strings.TrimSpace(c.PostForm("name")),
		RoomType:     models.RoomType(c.PostForm("roomType")),
		Capacity:     capacity,
		Building:     strings.TrimSpace(c.PostForm("building")),
		Floor:        floor,
		OpenTime:     c.PostForm("openTime"),
		CloseTime:    c.PostForm("closeTime"),
		EquipmentIDs: readFormStringArray(c, "equipmentIds"),
	}
	if description := strings.TrimSpace(c.PostForm("description")); description != "" {
		req.Description = &description
	}

	if fields := validateRoomRequest(req); len(fields) > 0 {
		utils.RespondValidationError(c, fields)
		return req, nil, false, true, false
	}

	photo, err := c.FormFile("photo")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return req, nil, c.PostForm("removePhoto") == "true", true, true
		}
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "photo", Message: "Invalid photo upload", Code: "invalid"}})
		return req, nil, false, true, false
	}
	if photo.Size > h.maxRoomPhotoBytes {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "photo", Message: "Photo must be 5MB or smaller", Code: "maxSize"}})
		return req, nil, false, true, false
	}

	return req, photo, c.PostForm("removePhoto") == "true", true, true
}

func readFormStringArray(c *gin.Context, key string) []string {
	values := c.PostFormArray(key)
	if len(values) == 0 {
		values = c.PostFormArray(key + "[]")
	}
	if len(values) == 0 && c.PostForm(key) != "" {
		values = strings.Split(c.PostForm(key), ",")
	}

	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func validateRoomRequest(req createRoomRequest) []utils.ValidationField {
	fields := []utils.ValidationField{}
	if req.Name == "" {
		fields = append(fields, utils.ValidationField{Field: "name", Message: "name is required", Code: "required"})
	}
	if req.Building == "" {
		fields = append(fields, utils.ValidationField{Field: "building", Message: "building is required", Code: "required"})
	}
	if req.RoomType == "" {
		fields = append(fields, utils.ValidationField{Field: "roomType", Message: "roomType is required", Code: "required"})
	}
	if req.Capacity < 1 {
		fields = append(fields, utils.ValidationField{Field: "capacity", Message: "capacity must be at least 1", Code: "min"})
	}
	if req.Floor < 0 {
		fields = append(fields, utils.ValidationField{Field: "floor", Message: "floor must be at least 0", Code: "min"})
	}
	return fields
}

func normalizeSinglePhoto(photos []string) []string {
	if len(photos) == 0 {
		return []string{}
	}
	if strings.TrimSpace(photos[0]) == "" {
		return []string{}
	}
	return []string{strings.TrimSpace(photos[0])}
}

func respondPhotoUploadError(c *gin.Context, err error) {
	if errors.Is(err, storage.ErrUnsupportedImage) {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "photo", Message: "Only PNG, JPG, or WEBP images up to 5MB are accepted", Code: "invalid"}})
		return
	}
	if errors.Is(err, storage.ErrStorageDisabled) {
		utils.RespondError(c, http.StatusInternalServerError, "MEDIA_STORAGE_UNAVAILABLE", "Media storage is not configured")
		return
	}
	utils.RespondError(c, http.StatusInternalServerError, "MEDIA_UPLOAD_FAILED", "Failed to upload room photo")
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
		Locale: requestLocale(c),
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
