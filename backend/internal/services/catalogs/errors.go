package catalogs

import "errors"

var (
	ErrBuildingNotFound = errors.New("building not found")
	ErrBuildingExists   = errors.New("building already exists")
	ErrRoomTypeNotFound = errors.New("room type not found")
	ErrRoomTypeExists   = errors.New("room type already exists")
	ErrPurposeNotFound  = errors.New("booking purpose not found")
	ErrPurposeExists    = errors.New("booking purpose already exists")
)
