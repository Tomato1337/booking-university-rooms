package rooms

import "errors"

var (
	ErrRoomNotFound     = errors.New("ROOM_NOT_FOUND")
	ErrInvalidTimeRange = errors.New("INVALID_TIME_RANGE")
)
