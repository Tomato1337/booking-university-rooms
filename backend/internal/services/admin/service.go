package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/models"
	"booking-university-rooms/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type ListPendingInput struct {
	Search string
	Limit  int
	Cursor string
}

type ListPendingResult struct {
	Bookings   []models.AdminPendingBooking
	Total      int
	HasMore    bool
	NextCursor *string
}

type ApproveResult struct {
	Booking      approvedBookingResponse
	AutoRejected []models.AutoRejectedBooking
}

type approvedBookingResponse struct {
	ID        uuid.UUID `json:"id"`
	Status    string    `json:"status"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (s *Service) ListPending(ctx context.Context, input ListPendingInput) (*ListPendingResult, error) {
	limit := normalizeLimit(input.Limit)

	args := []any{}
	argIdx := 1
	conditions := []string{"b.status = 'pending'"}

	if input.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			`(u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR r.name ILIKE $%d OR r.building ILIKE $%d OR u.department ILIKE $%d)`,
			argIdx, argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+input.Search+"%")
		argIdx++
	}

	if input.Cursor != "" {
		cur, err := utils.DecodeAdminCursor(input.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf(
				`(b.created_at, b.id::text) > ($%d, $%d)`,
				argIdx, argIdx+1,
			))
			args = append(args, cur.CreatedAt, cur.ID)
			argIdx += 2
		}
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	// Count total (without cursor)
	countConditions := []string{"b.status = 'pending'"}
	countArgs := []any{}
	countArgIdx := 1
	if input.Search != "" {
		countConditions = append(countConditions, fmt.Sprintf(
			`(u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR r.name ILIKE $%d OR r.building ILIKE $%d OR u.department ILIKE $%d)`,
			countArgIdx, countArgIdx, countArgIdx, countArgIdx, countArgIdx,
		))
		countArgs = append(countArgs, "%"+input.Search+"%")
	}
	countWhere := "WHERE " + strings.Join(countConditions, " AND ")

	var total int
	err := s.db.QueryRow(ctx, fmt.Sprintf(`
		SELECT COUNT(*) FROM bookings b
		JOIN users u ON u.id = b.user_id
		JOIN rooms r ON r.id = b.room_id
		%s
	`, countWhere), countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("count pending: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT b.id,
		       u.id, u.first_name, u.last_name, u.department,
		       r.id, r.name, r.building,
		       b.title, b.purpose, b.booking_date::text, b.start_time::text, b.end_time::text,
		       b.attendee_count, b.status, b.created_at
		FROM bookings b
		JOIN users u ON u.id = b.user_id
		JOIN rooms r ON r.id = b.room_id
		%s
		ORDER BY b.created_at ASC, b.id ASC
		LIMIT $%d
	`, where, argIdx)
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list pending: %w", err)
	}
	defer rows.Close()

	var items []models.AdminPendingBooking
	for rows.Next() {
		var b models.AdminPendingBooking
		if err := rows.Scan(
			&b.ID,
			&b.User.ID, &b.User.FirstName, &b.User.LastName, &b.User.Department,
			&b.Room.ID, &b.Room.Name, &b.Room.Building,
			&b.Title, &b.Purpose, &b.BookingDate, &b.StartTime, &b.EndTime,
			&b.AttendeeCount, &b.Status, &b.CreatedAt,
		); err != nil {
			return nil, err
		}
		b.User.Initials = initials(b.User.FirstName, b.User.LastName)
		items = append(items, b)
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	var nextCursor *string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		encoded, err := utils.EncodeCursor(utils.AdminCursorPayload{
			CreatedAt: last.CreatedAt.UTC().Format(time.RFC3339Nano),
			ID:        last.ID.String(),
		})
		if err == nil {
			nextCursor = &encoded
		}
	}

	if items == nil {
		items = []models.AdminPendingBooking{}
	}

	return &ListPendingResult{
		Bookings:   items,
		Total:      total,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

func (s *Service) Approve(ctx context.Context, bookingIDStr, adminIDStr string) (*ApproveResult, error) {
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		return nil, ErrBookingNotFound
	}
	adminID, err := uuid.Parse(adminIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid admin id: %w", err)
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock and fetch booking
	var b struct {
		id          uuid.UUID
		roomID      uuid.UUID
		bookingDate string
		startTime   string
		endTime     string
		status      models.BookingStatus
	}
	err = tx.QueryRow(ctx,
		`SELECT id, room_id, booking_date::text, start_time::text, end_time::text, status
		 FROM bookings WHERE id = $1 FOR UPDATE`,
		bookingID,
	).Scan(&b.id, &b.roomID, &b.bookingDate, &b.startTime, &b.endTime, &b.status)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("get booking: %w", err)
	}

	if b.status != models.StatusPending {
		return nil, ErrBookingAlreadyProcessed
	}

	// Check booking is not in the past
	startDT, err := time.ParseInLocation("2006-01-02 15:04", b.bookingDate+" "+b.startTime, time.UTC)
	if err == nil && startDT.Before(time.Now().UTC()) {
		return nil, ErrBookingInPast
	}

	// Check no new conflicts appeared
	var conflictCount int
	err = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings
		 WHERE room_id = $1
		   AND booking_date = $2
		   AND status = 'confirmed'
		   AND start_time < $3
		   AND end_time > $4
		   AND id != $5
		 FOR UPDATE`,
		b.roomID, b.bookingDate, b.endTime, b.startTime, bookingID,
	).Scan(&conflictCount)
	if err != nil {
		return nil, fmt.Errorf("check conflicts: %w", err)
	}
	if conflictCount > 0 {
		return nil, ErrBookingConflict
	}

	// Approve
	var updatedAt time.Time
	err = tx.QueryRow(ctx,
		`UPDATE bookings SET status = 'confirmed', admin_id = $1, updated_at = now()
		 WHERE id = $2 RETURNING updated_at`,
		adminID, bookingID,
	).Scan(&updatedAt)
	if err != nil {
		return nil, fmt.Errorf("approve booking: %w", err)
	}

	// Cascade auto-reject conflicting pending bookings
	rejectRows, err := tx.Query(ctx,
		`UPDATE bookings
		 SET status = 'rejected',
		     admin_id = $1,
		     status_reason = 'Auto-rejected: time slot conflict with approved booking',
		     updated_at = now()
		 WHERE room_id = $2
		   AND booking_date = $3
		   AND status = 'pending'
		   AND id != $4
		   AND start_time < $5
		   AND end_time > $6
		 RETURNING id, user_id, title, start_time::text, end_time::text, status_reason`,
		adminID, b.roomID, b.bookingDate, bookingID, b.endTime, b.startTime,
	)
	if err != nil {
		return nil, fmt.Errorf("auto-reject: %w", err)
	}
	defer rejectRows.Close()

	var autoRejected []models.AutoRejectedBooking
	for rejectRows.Next() {
		var ar models.AutoRejectedBooking
		if err := rejectRows.Scan(&ar.ID, &ar.UserID, &ar.Title, &ar.StartTime, &ar.EndTime, &ar.Reason); err != nil {
			return nil, err
		}
		autoRejected = append(autoRejected, ar)
	}
	rejectRows.Close()

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	if autoRejected == nil {
		autoRejected = []models.AutoRejectedBooking{}
	}

	return &ApproveResult{
		Booking: approvedBookingResponse{
			ID:        bookingID,
			Status:    string(models.StatusConfirmed),
			UpdatedAt: updatedAt,
		},
		AutoRejected: autoRejected,
	}, nil
}

func (s *Service) Reject(ctx context.Context, bookingIDStr, adminIDStr, reason string) (*models.Booking, error) {
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		return nil, ErrBookingNotFound
	}
	adminID, err := uuid.Parse(adminIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid admin id: %w", err)
	}

	booking := &models.Booking{}
	err = s.db.QueryRow(ctx,
		`UPDATE bookings
		 SET status = 'rejected', admin_id = $1, status_reason = $2, updated_at = now()
		 WHERE id = $3 AND status = 'pending'
		 RETURNING id, status, status_reason, updated_at`,
		adminID, nullableString(reason), bookingID,
	).Scan(&booking.ID, &booking.Status, &booking.StatusReason, &booking.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Check if booking exists at all
			var exists bool
			_ = s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM bookings WHERE id = $1)", bookingID).Scan(&exists)
			if !exists {
				return nil, ErrBookingNotFound
			}
			return nil, ErrBookingAlreadyProcessed
		}
		return nil, fmt.Errorf("reject booking: %w", err)
	}

	return booking, nil
}

func (s *Service) GetStats(ctx context.Context) (*models.AdminStats, error) {
	stats := &models.AdminStats{}

	err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE status = 'pending'").Scan(&stats.PendingCount)
	if err != nil {
		return nil, fmt.Errorf("pending count: %w", err)
	}

	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM rooms WHERE is_active = true").Scan(&stats.TotalActiveRooms)
	if err != nil {
		return nil, fmt.Errorf("active rooms count: %w", err)
	}

	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM rooms").Scan(&stats.TotalRooms)
	if err != nil {
		return nil, fmt.Errorf("total rooms count: %w", err)
	}

	err = s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings
		 WHERE booking_date = CURRENT_DATE AND status IN ('pending', 'confirmed')`,
	).Scan(&stats.TodayBookingsCount)
	if err != nil {
		return nil, fmt.Errorf("today bookings count: %w", err)
	}

	// Occupancy rate: confirmed minutes today / (active rooms * 14h * 60min) * 100
	err = s.db.QueryRow(ctx, `
		SELECT COALESCE(
			ROUND(
				COALESCE(
					SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0
				) / NULLIF(
					(SELECT COUNT(*) FROM rooms WHERE is_active = true) * 14.0 * 60, 0
				) * 100
			), 0
		)
		FROM bookings
		WHERE booking_date = CURRENT_DATE AND status = 'confirmed'
	`).Scan(&stats.OccupancyRate)
	if err != nil {
		return nil, fmt.Errorf("occupancy rate: %w", err)
	}

	return stats, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func normalizeLimit(limit int) int {
	if limit <= 0 || limit > 100 {
		return 20
	}
	return limit
}

func initials(first, last string) string {
	i := ""
	if len(first) > 0 {
		i += strings.ToUpper(string([]rune(first)[0]))
	}
	if len(last) > 0 {
		i += strings.ToUpper(string([]rune(last)[0]))
	}
	return i
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
