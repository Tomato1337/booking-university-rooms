package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/models"
	"booking-university-rooms/backend/internal/realtime"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	"booking-university-rooms/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db  *pgxpool.Pool
	hub *realtime.Hub
}

func NewService(db *pgxpool.Pool, hub ...*realtime.Hub) *Service {
	s := &Service{db: db}
	if len(hub) > 0 {
		s.hub = hub[0]
	}
	return s
}

type ListPendingInput struct {
	Search string
	Limit  int
	Cursor string
	Locale string
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
		       u.id, u.first_name, u.last_name, u.email, u.department, u.participant_type, u.teacher_rank,
		       r.id, r.name, r.building, %s,
		       b.title, b.purpose, %s, b.booking_date::text, to_char(b.start_time, 'HH24:MI'), to_char(b.end_time, 'HH24:MI'),
		       b.attendee_count, b.status, b.created_at
		FROM bookings b
		JOIN users u ON u.id = b.user_id
		JOIN rooms r ON r.id = b.room_id
		LEFT JOIN buildings bl ON bl.code = r.building
		LEFT JOIN booking_purposes bp ON bp.code = b.purpose
		%s
		ORDER BY b.created_at ASC, b.id ASC
		LIMIT $%d
	`, catalogssvc.LabelExpr("bl", input.Locale), catalogssvc.LabelExpr("bp", input.Locale), where, argIdx)
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
			&b.User.ID, &b.User.FirstName, &b.User.LastName, &b.User.Email, &b.User.Department, &b.User.ParticipantType, &b.User.TeacherRank,
			&b.Room.ID, &b.Room.Name, &b.Room.Building, &b.Room.BuildingLabel,
			&b.Title, &b.Purpose, &b.PurposeLabel, &b.BookingDate, &b.StartTime, &b.EndTime,
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
		userID      uuid.UUID
		roomID      uuid.UUID
		roomName    string
		title       string
		bookingDate string
		startTime   string
		endTime     string
		status      models.BookingStatus
	}
	err = tx.QueryRow(ctx,
		`SELECT b.id, b.user_id, b.room_id, r.name, b.title, b.booking_date::text, to_char(b.start_time, 'HH24:MI'), to_char(b.end_time, 'HH24:MI'), b.status
		 FROM bookings b
		 JOIN rooms r ON r.id = b.room_id
		 WHERE b.id = $1 FOR UPDATE`,
		bookingID,
	).Scan(&b.id, &b.userID, &b.roomID, &b.roomName, &b.title, &b.bookingDate, &b.startTime, &b.endTime, &b.status)
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
	if err == nil && startDT.Before(time.Now().UTC().Add(-24*time.Hour)) {
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
		   AND id != $5`,
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
		 RETURNING id, user_id, title, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI'), status_reason`,
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
	s.notifyBookingApproved(b.userID.String(), realtime.Event{
		Type:        realtime.EventBookingApproved,
		BookingID:   bookingID.String(),
		RoomID:      b.roomID.String(),
		RoomName:    b.roomName,
		Title:       b.title,
		Status:      string(models.StatusConfirmed),
		BookingDate: b.bookingDate,
		StartTime:   b.startTime,
		EndTime:     b.endTime,
		CreatedAt:   updatedAt.UTC().Format(time.RFC3339),
	})
	for _, rejected := range autoRejected {
		s.notifyBookingApproved(rejected.UserID.String(), realtime.Event{
			Type:        realtime.EventBookingAutoRejected,
			BookingID:   rejected.ID.String(),
			RoomID:      b.roomID.String(),
			RoomName:    b.roomName,
			Title:       rejected.Title,
			Status:      string(models.StatusRejected),
			Reason:      &rejected.Reason,
			BookingDate: b.bookingDate,
			StartTime:   rejected.StartTime,
			EndTime:     rejected.EndTime,
			CreatedAt:   updatedAt.UTC().Format(time.RFC3339),
		})
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
		 RETURNING id, user_id, room_id, title, booking_date::text, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI'), status, status_reason, updated_at`,
		adminID, nullableString(reason), bookingID,
	).Scan(&booking.ID, &booking.UserID, &booking.RoomID, &booking.Title, &booking.BookingDate, &booking.StartTime, &booking.EndTime, &booking.Status, &booking.StatusReason, &booking.UpdatedAt)
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
	_ = s.db.QueryRow(ctx, "SELECT name FROM rooms WHERE id = $1", booking.RoomID).Scan(&booking.RoomName)
	s.notifyBookingApproved(booking.UserID.String(), realtime.Event{
		Type:        realtime.EventBookingRejected,
		BookingID:   booking.ID.String(),
		RoomID:      booking.RoomID.String(),
		RoomName:    booking.RoomName,
		Title:       booking.Title,
		Status:      string(booking.Status),
		Reason:      booking.StatusReason,
		BookingDate: booking.BookingDate,
		StartTime:   booking.StartTime,
		EndTime:     booking.EndTime,
		CreatedAt:   booking.UpdatedAt.UTC().Format(time.RFC3339),
	})

	return booking, nil
}

func (s *Service) notifyBookingApproved(userID string, event realtime.Event) {
	if s.hub == nil {
		return
	}
	go s.hub.SendToUser(userID, event)
}

func (s *Service) GetStats(ctx context.Context, period string) (*models.AdminStats, error) {
	stats := &models.AdminStats{}

	normalizedPeriod := normalizeStatsPeriod(period)
	dateCondition := statsDateCondition("b", normalizedPeriod)
	periodDays := statsPeriodDays(normalizedPeriod)
	if periodDays == 0 {
		err := s.db.QueryRow(ctx, fmt.Sprintf(
			`SELECT COALESCE(COUNT(DISTINCT b.booking_date), 0)
			 FROM bookings b
			 WHERE b.status = 'confirmed' AND %s`,
			dateCondition,
		)).Scan(&periodDays)
		if err != nil {
			return nil, fmt.Errorf("period days: %w", err)
		}
		if periodDays == 0 {
			periodDays = 1
		}
	}

	err := s.db.QueryRow(ctx, fmt.Sprintf(
		"SELECT COUNT(*) FROM bookings b WHERE b.status = 'pending' AND %s",
		dateCondition,
	)).Scan(&stats.PendingCount)
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

	err = s.db.QueryRow(ctx, fmt.Sprintf(
		`SELECT COUNT(*) FROM bookings b
		 WHERE b.status IN ('pending', 'confirmed') AND %s`,
		dateCondition,
	)).Scan(&stats.TodayBookingsCount)
	if err != nil {
		return nil, fmt.Errorf("today bookings count: %w", err)
	}

	// Occupancy rate: confirmed minutes in selected period / (active rooms * period days * 14h * 60min) * 100
	err = s.db.QueryRow(ctx, fmt.Sprintf(`
		SELECT COALESCE(
			ROUND(
				COALESCE(
					SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0
				) / NULLIF(
					(SELECT COUNT(*) FROM rooms WHERE is_active = true) * 14.0 * 60 * $1, 0
				) * 100
			), 0
		)
		FROM bookings b
		WHERE b.status = 'confirmed' AND %s
	`, dateCondition), periodDays).Scan(&stats.OccupancyRate)
	if err != nil {
		return nil, fmt.Errorf("occupancy rate: %w", err)
	}

	// Bookings by status in selected period.
	rows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT b.status::text, COUNT(*)::int
		FROM bookings b
		WHERE %s
		GROUP BY b.status
	`, dateCondition))
	if err != nil {
		return nil, fmt.Errorf("bookings by status: %w", err)
	}
	defer rows.Close()

	statusCounts := map[string]int{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("scan bookings by status: %w", err)
		}
		statusCounts[status] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate bookings by status: %w", err)
	}

	stats.BookingsByStatus = []models.BookingStatusCount{
		{Status: string(models.StatusPending), Count: statusCounts[string(models.StatusPending)]},
		{Status: string(models.StatusConfirmed), Count: statusCounts[string(models.StatusConfirmed)]},
		{Status: string(models.StatusRejected), Count: statusCounts[string(models.StatusRejected)]},
		{Status: string(models.StatusCancelled), Count: statusCounts[string(models.StatusCancelled)]},
	}

	// Most booked rooms in selected period.
	popularRows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT r.id, r.name, r.building, COUNT(*)::int AS booking_count
		FROM bookings b
		JOIN rooms r ON r.id = b.room_id
		WHERE %s
		GROUP BY r.id, r.name, r.building
		ORDER BY booking_count DESC, r.name ASC
		LIMIT 5
	`, dateCondition))
	if err != nil {
		return nil, fmt.Errorf("popular rooms: %w", err)
	}
	defer popularRows.Close()

	for popularRows.Next() {
		var room models.PopularRoom
		if err := popularRows.Scan(&room.ID, &room.Name, &room.Building, &room.Count); err != nil {
			return nil, fmt.Errorf("scan popular room: %w", err)
		}
		stats.PopularRooms = append(stats.PopularRooms, room)
	}
	if err := popularRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate popular rooms: %w", err)
	}
	if stats.PopularRooms == nil {
		stats.PopularRooms = []models.PopularRoom{}
	}

	// Bookings grouped by day of week (ordered Sunday..Saturday).
	dayRows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT TO_CHAR(b.booking_date, 'Dy') AS day,
		       COUNT(*)::int AS booking_count,
		       EXTRACT(DOW FROM b.booking_date)::int AS dow
		FROM bookings b
		WHERE %s
		GROUP BY dow, day
		ORDER BY dow
	`, dateCondition))
	if err != nil {
		return nil, fmt.Errorf("bookings by day of week: %w", err)
	}
	defer dayRows.Close()

	for dayRows.Next() {
		var item models.DayOfWeekCount
		var dow int
		if err := dayRows.Scan(&item.Day, &item.Count, &dow); err != nil {
			return nil, fmt.Errorf("scan bookings by day of week: %w", err)
		}
		stats.BookingsByDayOfWeek = append(stats.BookingsByDayOfWeek, item)
	}
	if err := dayRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate bookings by day of week: %w", err)
	}
	if stats.BookingsByDayOfWeek == nil {
		stats.BookingsByDayOfWeek = []models.DayOfWeekCount{}
	}

	// Occupancy rate per building in selected period.
	buildingRows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT r.building,
		       COALESCE(
			   ROUND(
				   COALESCE(
					   SUM(
						   CASE
							   WHEN b.status = 'confirmed' THEN EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60
							   ELSE 0
						   END
					   ),
					   0
				   ) / NULLIF(COUNT(DISTINCT r.id) * 14.0 * 60 * $1, 0) * 100
			   ),
			   0
		       )::int AS occupancy_rate
		FROM rooms r
		LEFT JOIN bookings b ON b.room_id = r.id AND %s
		WHERE r.is_active = true
		GROUP BY r.building
		ORDER BY r.building
	`, dateCondition), periodDays)
	if err != nil {
		return nil, fmt.Errorf("occupancy by building: %w", err)
	}
	defer buildingRows.Close()

	for buildingRows.Next() {
		var item models.BuildingOccupancy
		if err := buildingRows.Scan(&item.Building, &item.OccupancyRate); err != nil {
			return nil, fmt.Errorf("scan occupancy by building: %w", err)
		}
		stats.OccupancyByBuilding = append(stats.OccupancyByBuilding, item)
	}
	if err := buildingRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate occupancy by building: %w", err)
	}
	if stats.OccupancyByBuilding == nil {
		stats.OccupancyByBuilding = []models.BuildingOccupancy{}
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

func normalizeStatsPeriod(period string) string {
	switch strings.ToLower(strings.TrimSpace(period)) {
	case "today", "week", "month", "all":
		return strings.ToLower(strings.TrimSpace(period))
	default:
		return "all"
	}
}

func statsDateCondition(alias, period string) string {
	column := "booking_date"
	if alias != "" {
		column = alias + ".booking_date"
	}

	switch period {
	case "today":
		return column + " = CURRENT_DATE"
	case "week":
		return column + " >= CURRENT_DATE - INTERVAL '7 days'"
	case "month":
		return column + " >= CURRENT_DATE - INTERVAL '30 days'"
	default:
		return "TRUE"
	}
}

func statsPeriodDays(period string) int {
	switch period {
	case "today":
		return 1
	case "week":
		return 7
	case "month":
		return 30
	default:
		return 0
	}
}
