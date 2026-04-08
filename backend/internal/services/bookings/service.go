package bookings

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

type CreateInput struct {
	RoomID        uuid.UUID
	Title         string
	Purpose       models.BookingPurpose
	BookingDate   string
	StartTime     string
	EndTime       string
	AttendeeCount *int
}

type ListMyInput struct {
	UserID string
	Search string
	Limit  int
	Cursor string
}

type ListResult struct {
	Bookings   []models.MyBooking
	HasMore    bool
	NextCursor *string
}

func (s *Service) Create(ctx context.Context, userID string, input CreateInput) (*models.Booking, error) {
	// Validate time range format and half-hour alignment
	if !isValidHalfHour(input.StartTime) || !isValidHalfHour(input.EndTime) {
		return nil, ErrInvalidTimeRange
	}
	if input.StartTime >= input.EndTime {
		return nil, ErrInvalidTimeRange
	}

	// Check booking is not in the past
	loc := time.UTC
	bookingStart, err := time.ParseInLocation("2006-01-02 15:04", input.BookingDate+" "+input.StartTime, loc)
	if err != nil {
		return nil, ErrInvalidTimeRange
	}
	if bookingStart.Before(time.Now().UTC()) {
		return nil, ErrBookingInPast
	}

	// Fetch room
	var room struct {
		name     string
		capacity int
		isActive bool
	}
	err = s.db.QueryRow(ctx,
		"SELECT name, capacity, is_active FROM rooms WHERE id = $1",
		input.RoomID,
	).Scan(&room.name, &room.capacity, &room.isActive)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomNotFound
		}
		return nil, fmt.Errorf("get room: %w", err)
	}
	if !room.isActive {
		return nil, ErrRoomNotFound
	}

	// Check capacity
	if input.AttendeeCount != nil && *input.AttendeeCount > room.capacity {
		return nil, ErrCapacityExceeded
	}

	// Check conflicts in transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var conflictCount int
	err = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings
		 WHERE room_id = $1
		   AND booking_date = $2
		   AND status = 'confirmed'
		   AND start_time < $3
		   AND end_time > $4
		 FOR UPDATE`,
		input.RoomID, input.BookingDate, input.EndTime, input.StartTime,
	).Scan(&conflictCount)
	if err != nil {
		return nil, fmt.Errorf("check conflicts: %w", err)
	}
	if conflictCount > 0 {
		return nil, ErrBookingConflict
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	booking := &models.Booking{}
	err = tx.QueryRow(ctx,
		`INSERT INTO bookings (user_id, room_id, title, purpose, booking_date, start_time, end_time, attendee_count, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
		 RETURNING id, user_id, room_id, title, purpose, booking_date::text, start_time::text, end_time::text,
		           attendee_count, status, admin_id, status_reason, created_at, updated_at`,
		userUUID, input.RoomID, input.Title, input.Purpose, input.BookingDate,
		input.StartTime, input.EndTime, input.AttendeeCount,
	).Scan(
		&booking.ID, &booking.UserID, &booking.RoomID,
		&booking.Title, &booking.Purpose, &booking.BookingDate,
		&booking.StartTime, &booking.EndTime, &booking.AttendeeCount,
		&booking.Status, &booking.AdminID, &booking.StatusReason,
		&booking.CreatedAt, &booking.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert booking: %w", err)
	}
	booking.RoomName = room.name

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return booking, nil
}

func (s *Service) ListMy(ctx context.Context, input ListMyInput) (*ListResult, error) {
	limit := normalizeLimit(input.Limit)

	args := []any{input.UserID}
	argIdx := 2
	conditions := []string{
		`user_id = $1`,
		`status IN ('pending', 'confirmed')`,
		`(booking_date > CURRENT_DATE OR (booking_date = CURRENT_DATE AND end_time > CURRENT_TIME))`,
	}

	conditions, args, argIdx = applySearch(conditions, args, argIdx, input.Search)
	conditions, args, argIdx = applyBookingCursorAsc(conditions, args, argIdx, input.Cursor)

	query := buildBookingQuery(conditions, argIdx, limit, "ASC")
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list my bookings: %w", err)
	}
	defer rows.Close()

	return scanMyBookings(rows, limit, "ASC")
}

func (s *Service) ListMyHistory(ctx context.Context, input ListMyInput) (*ListResult, error) {
	limit := normalizeLimit(input.Limit)

	args := []any{input.UserID}
	argIdx := 2
	conditions := []string{
		`user_id = $1`,
		`(status IN ('rejected', 'cancelled')
		  OR booking_date < CURRENT_DATE
		  OR (booking_date = CURRENT_DATE AND end_time <= CURRENT_TIME))`,
	}

	conditions, args, argIdx = applySearch(conditions, args, argIdx, input.Search)
	conditions, args, argIdx = applyBookingCursorDesc(conditions, args, argIdx, input.Cursor)

	query := buildBookingQuery(conditions, argIdx, limit, "DESC")
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list booking history: %w", err)
	}
	defer rows.Close()

	return scanMyBookings(rows, limit, "DESC")
}

func (s *Service) Cancel(ctx context.Context, bookingIDStr, userID string, isAdmin bool) (*models.Booking, error) {
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		return nil, ErrBookingNotFound
	}

	booking := &models.Booking{}
	err = s.db.QueryRow(ctx,
		`SELECT id, user_id, room_id, status, booking_date::text, start_time::text, end_time::text, updated_at
		 FROM bookings WHERE id = $1`,
		bookingID,
	).Scan(&booking.ID, &booking.UserID, &booking.RoomID,
		&booking.Status, &booking.BookingDate, &booking.StartTime, &booking.EndTime, &booking.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("get booking: %w", err)
	}

	if !isAdmin && booking.UserID.String() != userID {
		return nil, ErrNotOwner
	}

	if booking.Status != models.StatusPending && booking.Status != models.StatusConfirmed {
		return nil, ErrBookingAlreadyProcessed
	}

	// Check not already started
	startDT, err := time.ParseInLocation("2006-01-02 15:04", booking.BookingDate+" "+booking.StartTime, time.UTC)
	if err == nil && startDT.Before(time.Now().UTC()) {
		return nil, ErrBookingInPast
	}

	err = s.db.QueryRow(ctx,
		`UPDATE bookings SET status = 'cancelled', updated_at = now()
		 WHERE id = $1
		 RETURNING id, status, updated_at`,
		bookingID,
	).Scan(&booking.ID, &booking.Status, &booking.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("cancel booking: %w", err)
	}

	return booking, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func isValidHalfHour(t string) bool {
	parts := strings.SplitN(t, ":", 2)
	if len(parts) != 2 {
		return false
	}
	return parts[1] == "00" || parts[1] == "30"
}

func normalizeLimit(limit int) int {
	if limit <= 0 || limit > 100 {
		return 20
	}
	return limit
}

func applySearch(conditions []string, args []any, argIdx int, search string) ([]string, []any, int) {
	if search == "" {
		return conditions, args, argIdx
	}
	conditions = append(conditions, fmt.Sprintf(
		`(b.title ILIKE $%d OR r.name ILIKE $%d OR r.building ILIKE $%d)`,
		argIdx, argIdx, argIdx,
	))
	args = append(args, "%"+search+"%")
	argIdx++
	return conditions, args, argIdx
}

func applyBookingCursorAsc(conditions []string, args []any, argIdx int, cursor string) ([]string, []any, int) {
	if cursor == "" {
		return conditions, args, argIdx
	}
	cur, err := utils.DecodeBookingCursor(cursor)
	if err != nil {
		return conditions, args, argIdx
	}
	conditions = append(conditions, fmt.Sprintf(
		`(b.booking_date, b.start_time, b.id::text) > ($%d, $%d, $%d)`,
		argIdx, argIdx+1, argIdx+2,
	))
	args = append(args, cur.BookingDate, cur.StartTime, cur.ID)
	argIdx += 3
	return conditions, args, argIdx
}

func applyBookingCursorDesc(conditions []string, args []any, argIdx int, cursor string) ([]string, []any, int) {
	if cursor == "" {
		return conditions, args, argIdx
	}
	cur, err := utils.DecodeBookingCursor(cursor)
	if err != nil {
		return conditions, args, argIdx
	}
	conditions = append(conditions, fmt.Sprintf(
		`(b.booking_date, b.start_time, b.id::text) < ($%d, $%d, $%d)`,
		argIdx, argIdx+1, argIdx+2,
	))
	args = append(args, cur.BookingDate, cur.StartTime, cur.ID)
	argIdx += 3
	return conditions, args, argIdx
}

func buildBookingQuery(conditions []string, argIdx, limit int, order string) string {
	where := "WHERE " + strings.Join(conditions, " AND ")
	return fmt.Sprintf(`
		SELECT b.id, b.room_id, r.name, r.building, r.room_type,
		       b.title, b.booking_date::text, b.start_time::text, b.end_time::text,
		       b.status, b.created_at
		FROM bookings b
		JOIN rooms r ON r.id = b.room_id
		%s
		ORDER BY b.booking_date %s, b.start_time %s, b.id %s
		LIMIT $%d
	`, where, order, order, order, argIdx)
}

func scanMyBookings(rows pgx.Rows, limit int, order string) (*ListResult, error) {
	var items []models.MyBooking
	for rows.Next() {
		var b models.MyBooking
		var roomType models.RoomType
		if err := rows.Scan(
			&b.ID, &b.RoomID, &b.RoomName, &b.Building, &roomType,
			&b.Title, &b.BookingDate, &b.StartTime, &b.EndTime,
			&b.Status, &b.CreatedAt,
		); err != nil {
			return nil, err
		}
		b.BookingID = utils.GenerateBookingID(b.ID, string(roomType))
		items = append(items, b)
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	var nextCursor *string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		encoded, err := utils.EncodeCursor(utils.BookingCursorPayload{
			BookingDate: last.BookingDate,
			StartTime:   last.StartTime,
			ID:          last.ID.String(),
		})
		if err == nil {
			nextCursor = &encoded
		}
	}

	if items == nil {
		items = []models.MyBooking{}
	}

	return &ListResult{
		Bookings:   items,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}
