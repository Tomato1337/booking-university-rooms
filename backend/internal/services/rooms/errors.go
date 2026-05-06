package rooms

import "errors"

var (
	ErrRoomNotFound     = errors.New("ROOM_NOT_FOUND")
	ErrInvalidTimeRange = errors.New("INVALID_TIME_RANGE")
	ErrInvalidBuilding  = errors.New("INVALID_BUILDING")
	ErrInvalidDate      = errors.New("INVALID_DATE")
	ErrInvalidRoomType  = errors.New("INVALID_ROOM_TYPE")
)
