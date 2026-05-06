package admin

import "errors"

var (
	ErrBookingNotFound         = errors.New("booking not found")
	ErrBookingAlreadyProcessed = errors.New("booking already processed")
	ErrBookingConflict         = errors.New("booking conflict with confirmed booking")
	ErrBookingInPast           = errors.New("booking is in the past")
	ErrUserNotFound            = errors.New("user not found")
)
