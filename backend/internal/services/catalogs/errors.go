package catalogs

import "errors"

var (
	ErrPurposeNotFound = errors.New("booking purpose not found")
	ErrPurposeExists   = errors.New("booking purpose already exists")
)
