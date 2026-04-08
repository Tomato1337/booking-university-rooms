package utils

import (
	"encoding/base64"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

type ValidationField struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

type ValidationDetails struct {
	Fields []ValidationField `json:"fields"`
}

func RespondError(c *gin.Context, status int, code, message string) {
	c.JSON(status, ErrorResponse{
		Error: ErrorBody{
			Code:    code,
			Message: message,
		},
	})
}

func RespondErrorWithDetails(c *gin.Context, status int, code, message string, details any) {
	c.JSON(status, ErrorResponse{
		Error: ErrorBody{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func RespondValidationError(c *gin.Context, fields []ValidationField) {
	c.JSON(http.StatusBadRequest, ErrorResponse{
		Error: ErrorBody{
			Code:    "VALIDATION_ERROR",
			Message: "Validation failed",
			Details: ValidationDetails{Fields: fields},
		},
	})
}

func RespondSuccess(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

func RespondSuccessWithMeta(c *gin.Context, status int, data any, meta any) {
	c.JSON(status, gin.H{"data": data, "meta": meta})
}

type CursorMeta struct {
	HasMore    bool    `json:"hasMore"`
	NextCursor *string `json:"nextCursor"`
}

type CursorMetaWithTotal struct {
	Total      int     `json:"total"`
	HasMore    bool    `json:"hasMore"`
	NextCursor *string `json:"nextCursor"`
}

type RoomCursorPayload struct {
	Name string `json:"name"`
	ID   string `json:"id"`
}

type BookingCursorPayload struct {
	BookingDate string `json:"booking_date"`
	StartTime   string `json:"start_time"`
	ID          string `json:"id"`
}

type AdminCursorPayload struct {
	CreatedAt string `json:"created_at"`
	ID        string `json:"id"`
}

func EncodeCursor(payload any) (string, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

func DecodeRoomCursor(cursor string) (*RoomCursorPayload, error) {
	data, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	var p RoomCursorPayload
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func DecodeBookingCursor(cursor string) (*BookingCursorPayload, error) {
	data, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	var p BookingCursorPayload
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func DecodeAdminCursor(cursor string) (*AdminCursorPayload, error) {
	data, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	var p AdminCursorPayload
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}
