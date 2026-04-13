package equipment

import "errors"

var (
	ErrEquipmentNotFound  = errors.New("equipment not found")
	ErrEquipmentNameTaken = errors.New("equipment name already exists")
	ErrEquipmentInUse     = errors.New("equipment is used in rooms")
)
