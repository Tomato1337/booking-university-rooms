package equipment

import (
	"context"
	"errors"
	"fmt"

	"booking-university-rooms/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) List(ctx context.Context) ([]models.Equipment, error) {
	rows, err := s.db.Query(ctx, "SELECT id, name, icon FROM equipment ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("list equipment: %w", err)
	}
	defer rows.Close()

	items := make([]models.Equipment, 0)
	for rows.Next() {
		var item models.Equipment
		if err := rows.Scan(&item.ID, &item.Name, &item.Icon); err != nil {
			return nil, fmt.Errorf("scan equipment: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate equipment rows: %w", err)
	}

	return items, nil
}

func (s *Service) Create(ctx context.Context, name, icon string) (*models.Equipment, error) {
	item := &models.Equipment{}
	err := s.db.QueryRow(ctx,
		"INSERT INTO equipment (name, icon) VALUES ($1, $2) RETURNING id, name, icon",
		name,
		icon,
	).Scan(&item.ID, &item.Name, &item.Icon)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEquipmentNameTaken
		}

		return nil, fmt.Errorf("create equipment: %w", err)
	}

	return item, nil
}

func (s *Service) Update(ctx context.Context, equipmentIDStr, name, icon string) (*models.Equipment, error) {
	equipmentID, err := uuid.Parse(equipmentIDStr)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}

	item := &models.Equipment{}
	err = s.db.QueryRow(ctx,
		"UPDATE equipment SET name=$1, icon=$2 WHERE id=$3 RETURNING id, name, icon",
		name,
		icon,
		equipmentID,
	).Scan(&item.ID, &item.Name, &item.Icon)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrEquipmentNotFound
		}

		if isUniqueViolation(err) {
			return nil, ErrEquipmentNameTaken
		}

		return nil, fmt.Errorf("update equipment: %w", err)
	}

	return item, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (s *Service) GetUsage(ctx context.Context, equipmentID uuid.UUID) ([]models.EquipmentUsageRoom, error) {
	rows, err := s.db.Query(ctx,
		`SELECT r.id, r.name 
		 FROM rooms r 
		 JOIN room_equipment re ON re.room_id = r.id 
		 WHERE re.equipment_id = $1 
		 ORDER BY r.name ASC`,
		equipmentID,
	)
	if err != nil {
		return nil, fmt.Errorf("query equipment usage: %w", err)
	}
	defer rows.Close()

	items := make([]models.EquipmentUsageRoom, 0)
	for rows.Next() {
		var item models.EquipmentUsageRoom
		if err := rows.Scan(&item.ID, &item.Name); err != nil {
			return nil, fmt.Errorf("scan equipment usage: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate equipment usage rows: %w", err)
	}

	return items, nil
}

func (s *Service) Delete(ctx context.Context, equipmentIDStr string) (*models.EquipmentDeleteResult, error) {
	equipmentID, err := uuid.Parse(equipmentIDStr)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}

	usedInRooms, err := s.GetUsage(ctx, equipmentID)
	if err != nil {
		return nil, err
	}

	item := &models.Equipment{}
	err = s.db.QueryRow(ctx,
		"DELETE FROM equipment WHERE id = $1 RETURNING id, name, icon",
		equipmentID,
	).Scan(&item.ID, &item.Name, &item.Icon)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrEquipmentNotFound
		}
		return nil, fmt.Errorf("delete equipment: %w", err)
	}

	return &models.EquipmentDeleteResult{
		Equipment:   *item,
		UsedInRooms: usedInRooms,
	}, nil
}
