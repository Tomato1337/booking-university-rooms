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
