package bookings

import "errors"

var (
	ErrRoomNotFound            = errors.New("room not found")
	ErrBookingNotFound         = errors.New("booking not found")
	ErrBookingConflict         = errors.New("booking conflict with confirmed booking")
	ErrBookingInPast           = errors.New("booking date/time is in the past")
	ErrInvalidTimeRange        = errors.New("invalid time range")
	ErrInvalidPurpose          = errors.New("invalid booking purpose")
	ErrCapacityExceeded        = errors.New("attendee count exceeds room capacity")
	ErrNotOwner                = errors.New("not the booking owner")
	ErrBookingAlreadyProcessed = errors.New("booking already processed")
)
