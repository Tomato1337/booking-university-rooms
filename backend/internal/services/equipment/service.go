package equipment

import (
	"context"
	"errors"
	"fmt"

	"booking-university-rooms/backend/internal/models"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"

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

type Input struct {
	Code      string
	LabelRu   string
	LabelEn   string
	Icon      string
	IsActive  bool
	SortOrder int
}

func (s *Service) List(ctx context.Context, locale string) ([]models.Equipment, error) {
	rows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT id, code, %s, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
		FROM equipment
		WHERE is_active = true
		ORDER BY sort_order ASC, code ASC
	`, catalogssvc.LabelExpr("equipment", locale)))
	if err != nil {
		return nil, fmt.Errorf("list equipment: %w", err)
	}
	defer rows.Close()

	return scanEquipmentRows(rows)
}

func (s *Service) ListAdmin(ctx context.Context) ([]models.Equipment, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, code, label_en, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
		FROM equipment
		ORDER BY sort_order ASC, code ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list admin equipment: %w", err)
	}
	defer rows.Close()

	return scanEquipmentRows(rows)
}

func scanEquipmentRows(rows pgx.Rows) ([]models.Equipment, error) {
	items := make([]models.Equipment, 0)
	for rows.Next() {
		var item models.Equipment
		if err := rows.Scan(
			&item.ID, &item.Code, &item.Name, &item.LabelRu, &item.LabelEn, &item.Icon,
			&item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan equipment: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate equipment rows: %w", err)
	}
	return items, nil
}

func (s *Service) Create(ctx context.Context, input Input) (*models.Equipment, error) {
	item := &models.Equipment{}
	err := s.db.QueryRow(ctx, `
		INSERT INTO equipment (code, name, label_ru, label_en, icon, is_active, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, code, label_en, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
	`, input.Code, input.LabelEn, input.LabelRu, input.LabelEn, input.Icon, input.IsActive, input.SortOrder).
		Scan(&item.ID, &item.Code, &item.Name, &item.LabelRu, &item.LabelEn, &item.Icon, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err, "equipment_code_key") {
			return nil, ErrEquipmentCodeTaken
		}
		if isUniqueViolation(err, "equipment_name_key") || isUniqueViolation(err, "equipment_name_key1") {
			return nil, ErrEquipmentNameTaken
		}

		return nil, fmt.Errorf("create equipment: %w", err)
	}

	return item, nil
}

func (s *Service) Update(ctx context.Context, equipmentIDStr string, input Input) (*models.Equipment, error) {
	equipmentID, err := uuid.Parse(equipmentIDStr)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}

	item := &models.Equipment{}
	err = s.db.QueryRow(ctx, `
		UPDATE equipment
		SET code = $1, name = $2, label_ru = $3, label_en = $4, icon = $5,
		    is_active = $6, sort_order = $7, updated_at = now()
		WHERE id = $8
		RETURNING id, code, label_en, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
	`, input.Code, input.LabelEn, input.LabelRu, input.LabelEn, input.Icon, input.IsActive, input.SortOrder, equipmentID).
		Scan(&item.ID, &item.Code, &item.Name, &item.LabelRu, &item.LabelEn, &item.Icon, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrEquipmentNotFound
		}
		if isUniqueViolation(err, "equipment_code_key") {
			return nil, ErrEquipmentCodeTaken
		}
		if isUniqueViolation(err, "equipment_name_key") || isUniqueViolation(err, "equipment_name_key1") {
			return nil, ErrEquipmentNameTaken
		}

		return nil, fmt.Errorf("update equipment: %w", err)
	}

	return item, nil
}

func isUniqueViolation(err error, constraint string) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}
	return pgErr.Code == "23505" && (constraint == "" || pgErr.ConstraintName == constraint)
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

func (s *Service) Delete(ctx context.Context, equipmentIDStr string) error {
	equipmentID, err := uuid.Parse(equipmentIDStr)
	if err != nil {
		return ErrEquipmentNotFound
	}

	tag, err := s.db.Exec(ctx, "UPDATE equipment SET is_active = false, updated_at = now() WHERE id = $1", equipmentID)
	if err != nil {
		return fmt.Errorf("deactivate equipment: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrEquipmentNotFound
	}
	return nil
}

func (s *Service) Reactivate(ctx context.Context, equipmentIDStr string) (*models.Equipment, error) {
	equipmentID, err := uuid.Parse(equipmentIDStr)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}

	item := &models.Equipment{}
	err = s.db.QueryRow(ctx, `
		UPDATE equipment SET is_active = true, updated_at = now()
		WHERE id = $1
		RETURNING id, code, label_en, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
	`, equipmentID).Scan(&item.ID, &item.Code, &item.Name, &item.LabelRu, &item.LabelEn, &item.Icon, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrEquipmentNotFound
		}
		return nil, fmt.Errorf("reactivate equipment: %w", err)
	}
	return item, nil
}

func (s *Service) HardDelete(ctx context.Context, equipmentIDStr string) (*models.EquipmentDeleteResult, error) {
	equipmentID, err := uuid.Parse(equipmentIDStr)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}

	usedInRooms, err := s.GetUsage(ctx, equipmentID)
	if err != nil {
		return nil, err
	}

	item := &models.Equipment{}
	err = s.db.QueryRow(ctx, `
		DELETE FROM equipment WHERE id = $1
		RETURNING id, code, label_en, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
	`, equipmentID).Scan(&item.ID, &item.Code, &item.Name, &item.LabelRu, &item.LabelEn, &item.Icon, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrEquipmentNotFound
		}
		return nil, fmt.Errorf("hard delete equipment: %w", err)
	}

	return &models.EquipmentDeleteResult{
		Equipment:   *item,
		UsedInRooms: usedInRooms,
	}, nil
}
