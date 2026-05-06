package catalogs

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"booking-university-rooms/backend/internal/models"

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

func NormalizeLocale(locale string) string {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if strings.HasPrefix(locale, "en") {
		return "en"
	}
	return "ru"
}

func LabelExpr(alias, locale string) string {
	if NormalizeLocale(locale) == "en" {
		return alias + ".label_en"
	}
	return alias + ".label_ru"
}

func (s *Service) ListBuildings(ctx context.Context, locale string) ([]models.BuildingOption, error) {
	rows, err := s.db.Query(ctx, fmt.Sprintf(
		`SELECT code, %s FROM buildings WHERE is_active = true ORDER BY sort_order ASC, code ASC`,
		LabelExpr("buildings", locale),
	))
	if err != nil {
		return nil, fmt.Errorf("list buildings: %w", err)
	}
	defer rows.Close()

	items := []models.BuildingOption{}
	for rows.Next() {
		var item models.BuildingOption
		if err := rows.Scan(&item.Code, &item.Label); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) BuildingIsActive(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM buildings WHERE code = $1 AND is_active = true)", code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check building: %w", err)
	}
	return exists, nil
}

func (s *Service) ListRoomTypes(ctx context.Context, locale string) ([]models.RoomTypeOption, error) {
	rows, err := s.db.Query(ctx, fmt.Sprintf(
		`SELECT code, %s FROM room_types WHERE is_active = true ORDER BY sort_order ASC, code ASC`,
		LabelExpr("room_types", locale),
	))
	if err != nil {
		return nil, fmt.Errorf("list room types: %w", err)
	}
	defer rows.Close()

	items := []models.RoomTypeOption{}
	for rows.Next() {
		var item models.RoomTypeOption
		if err := rows.Scan(&item.Code, &item.Label); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) RoomTypeIsActive(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM room_types WHERE code = $1 AND is_active = true)", code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check room type: %w", err)
	}
	return exists, nil
}

func (s *Service) ListAdminBuildings(ctx context.Context) ([]models.AdminBuilding, error) {
	rows, err := s.db.Query(ctx, `
		SELECT code, label_ru, label_en, is_active, sort_order, created_at, updated_at
		FROM buildings
		ORDER BY sort_order ASC, code ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list admin buildings: %w", err)
	}
	defer rows.Close()

	items := []models.AdminBuilding{}
	for rows.Next() {
		var item models.AdminBuilding
		if err := rows.Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) ListAdminRoomTypes(ctx context.Context) ([]models.AdminRoomType, error) {
	rows, err := s.db.Query(ctx, `
		SELECT code, label_ru, label_en, is_active, sort_order, created_at, updated_at
		FROM room_types
		ORDER BY sort_order ASC, code ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list admin room types: %w", err)
	}
	defer rows.Close()

	items := []models.AdminRoomType{}
	for rows.Next() {
		var item models.AdminRoomType
		if err := rows.Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type BuildingInput struct {
	Code      string
	LabelRu   string
	LabelEn   string
	IsActive  bool
	SortOrder int
}

type RoomTypeInput struct {
	Code      string
	LabelRu   string
	LabelEn   string
	IsActive  bool
	SortOrder int
}

func (s *Service) CreateRoomType(ctx context.Context, input RoomTypeInput) (*models.AdminRoomType, error) {
	item := &models.AdminRoomType{}
	err := s.db.QueryRow(ctx, `
		INSERT INTO room_types (code, label_ru, label_en, is_active, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, input.Code, input.LabelRu, input.LabelEn, input.IsActive, input.SortOrder).
		Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrRoomTypeExists
		}
		return nil, fmt.Errorf("create room type: %w", err)
	}
	return item, nil
}

func (s *Service) UpdateRoomType(ctx context.Context, code string, input RoomTypeInput) (*models.AdminRoomType, error) {
	item := &models.AdminRoomType{}
	err := s.db.QueryRow(ctx, `
		UPDATE room_types
		SET label_ru = $1, label_en = $2, is_active = $3, sort_order = $4, updated_at = now()
		WHERE code = $5
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, input.LabelRu, input.LabelEn, input.IsActive, input.SortOrder, code).
		Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomTypeNotFound
		}
		return nil, fmt.Errorf("update room type: %w", err)
	}
	return item, nil
}

func (s *Service) DeactivateRoomType(ctx context.Context, code string) error {
	tag, err := s.db.Exec(ctx, "UPDATE room_types SET is_active = false, updated_at = now() WHERE code = $1", code)
	if err != nil {
		return fmt.Errorf("deactivate room type: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRoomTypeNotFound
	}
	return nil
}

func (s *Service) ReactivateRoomType(ctx context.Context, code string) (*models.AdminRoomType, error) {
	item := &models.AdminRoomType{}
	err := s.db.QueryRow(ctx, `
		UPDATE room_types SET is_active = true, updated_at = now()
		WHERE code = $1
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, code).Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomTypeNotFound
		}
		return nil, fmt.Errorf("reactivate room type: %w", err)
	}
	return item, nil
}

func (s *Service) HardDeleteRoomType(ctx context.Context, code string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin hard delete room type: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM rooms WHERE room_type = $1", code); err != nil {
		return fmt.Errorf("delete room type rooms: %w", err)
	}

	tag, err := tx.Exec(ctx, "DELETE FROM room_types WHERE code = $1", code)
	if err != nil {
		return fmt.Errorf("hard delete room type: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRoomTypeNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit hard delete room type: %w", err)
	}
	return nil
}

func (s *Service) CreateBuilding(ctx context.Context, input BuildingInput) (*models.AdminBuilding, error) {
	item := &models.AdminBuilding{}
	err := s.db.QueryRow(ctx, `
		INSERT INTO buildings (code, label_ru, label_en, is_active, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, input.Code, input.LabelRu, input.LabelEn, input.IsActive, input.SortOrder).
		Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrBuildingExists
		}
		return nil, fmt.Errorf("create building: %w", err)
	}
	return item, nil
}

func (s *Service) UpdateBuilding(ctx context.Context, code string, input BuildingInput) (*models.AdminBuilding, error) {
	item := &models.AdminBuilding{}
	err := s.db.QueryRow(ctx, `
		UPDATE buildings
		SET label_ru = $1, label_en = $2, is_active = $3, sort_order = $4, updated_at = now()
		WHERE code = $5
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, input.LabelRu, input.LabelEn, input.IsActive, input.SortOrder, code).
		Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBuildingNotFound
		}
		return nil, fmt.Errorf("update building: %w", err)
	}
	return item, nil
}

func (s *Service) DeactivateBuilding(ctx context.Context, code string) error {
	tag, err := s.db.Exec(ctx, "UPDATE buildings SET is_active = false, updated_at = now() WHERE code = $1", code)
	if err != nil {
		return fmt.Errorf("deactivate building: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBuildingNotFound
	}
	return nil
}

func (s *Service) ReactivateBuilding(ctx context.Context, code string) (*models.AdminBuilding, error) {
	item := &models.AdminBuilding{}
	err := s.db.QueryRow(ctx, `
		UPDATE buildings SET is_active = true, updated_at = now()
		WHERE code = $1
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, code).Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBuildingNotFound
		}
		return nil, fmt.Errorf("reactivate building: %w", err)
	}
	return item, nil
}

func (s *Service) HardDeleteBuilding(ctx context.Context, code string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin hard delete building: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM rooms WHERE building = $1", code); err != nil {
		return fmt.Errorf("delete building rooms: %w", err)
	}

	tag, err := tx.Exec(ctx, "DELETE FROM buildings WHERE code = $1", code)
	if err != nil {
		return fmt.Errorf("hard delete building: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBuildingNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit hard delete building: %w", err)
	}
	return nil
}

func (s *Service) ListBookingPurposes(ctx context.Context, locale string) ([]models.BookingPurposeOption, error) {
	rows, err := s.db.Query(ctx, fmt.Sprintf(
		`SELECT code, %s FROM booking_purposes WHERE is_active = true ORDER BY sort_order ASC, code ASC`,
		LabelExpr("booking_purposes", locale),
	))
	if err != nil {
		return nil, fmt.Errorf("list booking purposes: %w", err)
	}
	defer rows.Close()

	items := []models.BookingPurposeOption{}
	for rows.Next() {
		var item models.BookingPurposeOption
		if err := rows.Scan(&item.Code, &item.Label); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) BookingPurposeIsActive(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM booking_purposes WHERE code = $1 AND is_active = true)", code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check booking purpose: %w", err)
	}
	return exists, nil
}

func (s *Service) ListAdminBookingPurposes(ctx context.Context) ([]models.AdminBookingPurpose, error) {
	rows, err := s.db.Query(ctx, `
		SELECT code, label_ru, label_en, is_active, sort_order, created_at, updated_at
		FROM booking_purposes
		ORDER BY sort_order ASC, code ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list admin booking purposes: %w", err)
	}
	defer rows.Close()

	items := []models.AdminBookingPurpose{}
	for rows.Next() {
		var item models.AdminBookingPurpose
		if err := rows.Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type BookingPurposeInput struct {
	Code      string
	LabelRu   string
	LabelEn   string
	IsActive  bool
	SortOrder int
}

func (s *Service) CreateBookingPurpose(ctx context.Context, input BookingPurposeInput) (*models.AdminBookingPurpose, error) {
	item := &models.AdminBookingPurpose{}
	err := s.db.QueryRow(ctx, `
		INSERT INTO booking_purposes (code, label_ru, label_en, is_active, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, input.Code, input.LabelRu, input.LabelEn, input.IsActive, input.SortOrder).
		Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrPurposeExists
		}
		return nil, fmt.Errorf("create booking purpose: %w", err)
	}
	return item, nil
}

func (s *Service) UpdateBookingPurpose(ctx context.Context, code string, input BookingPurposeInput) (*models.AdminBookingPurpose, error) {
	item := &models.AdminBookingPurpose{}
	err := s.db.QueryRow(ctx, `
		UPDATE booking_purposes
		SET label_ru = $1, label_en = $2, is_active = $3, sort_order = $4, updated_at = now()
		WHERE code = $5
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, input.LabelRu, input.LabelEn, input.IsActive, input.SortOrder, code).
		Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrPurposeNotFound
		}
		return nil, fmt.Errorf("update booking purpose: %w", err)
	}
	return item, nil
}

func (s *Service) DeactivateBookingPurpose(ctx context.Context, code string) error {
	tag, err := s.db.Exec(ctx, "UPDATE booking_purposes SET is_active = false, updated_at = now() WHERE code = $1", code)
	if err != nil {
		return fmt.Errorf("deactivate booking purpose: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPurposeNotFound
	}
	return nil
}

func (s *Service) ReactivateBookingPurpose(ctx context.Context, code string) (*models.AdminBookingPurpose, error) {
	item := &models.AdminBookingPurpose{}
	err := s.db.QueryRow(ctx, `
		UPDATE booking_purposes SET is_active = true, updated_at = now()
		WHERE code = $1
		RETURNING code, label_ru, label_en, is_active, sort_order, created_at, updated_at
	`, code).Scan(&item.Code, &item.LabelRu, &item.LabelEn, &item.IsActive, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrPurposeNotFound
		}
		return nil, fmt.Errorf("reactivate booking purpose: %w", err)
	}
	return item, nil
}

func (s *Service) HardDeleteBookingPurpose(ctx context.Context, code string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin hard delete booking purpose: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, "DELETE FROM bookings WHERE purpose = $1", code)
	if err != nil {
		return fmt.Errorf("delete purpose bookings: %w", err)
	}

	tag, err = tx.Exec(ctx, "DELETE FROM booking_purposes WHERE code = $1", code)
	if err != nil {
		return fmt.Errorf("hard delete booking purpose: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPurposeNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit hard delete booking purpose: %w", err)
	}
	return nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return strings.Contains(err.Error(), "duplicate key") || (errors.As(err, &pgErr) && pgErr.Code == "23505")
}
