package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/models"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	"booking-university-rooms/backend/internal/utils"
)

type ListHistoryInput struct {
	Search string
	Limit  int
	Cursor string
	Locale string
}

type ListHistoryResult struct {
	Bookings   []models.AdminPendingBooking
	Total      int
	HasMore    bool
	NextCursor *string
}

func (s *Service) ListHistory(ctx context.Context, input ListHistoryInput) (*ListHistoryResult, error) {
	limit := normalizeLimit(input.Limit)

	args := []any{}
	argIdx := 1
	conditions := []string{"b.status IN ('confirmed', 'rejected', 'cancelled')"}

	if input.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			`(u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR r.name ILIKE $%d OR r.building ILIKE $%d OR u.department ILIKE $%d OR b.title ILIKE $%d)`,
			argIdx, argIdx, argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%")
		argIdx += 6
	}

	if input.Cursor != "" {
		cur, err := utils.DecodeAdminHistoryCursor(input.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf(
				`(b.updated_at, b.id::text) < ($%d, $%d)`,
				argIdx, argIdx+1,
			))
			args = append(args, cur.UpdatedAt, cur.ID)
			argIdx += 2
		}
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	// Count total (without cursor)
	countConditions := []string{"b.status IN ('confirmed', 'rejected', 'cancelled')"}
	countArgs := []any{}
	countArgIdx := 1
	if input.Search != "" {
		countConditions = append(countConditions, fmt.Sprintf(
			`(u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR r.name ILIKE $%d OR r.building ILIKE $%d OR u.department ILIKE $%d OR b.title ILIKE $%d)`,
			countArgIdx, countArgIdx, countArgIdx, countArgIdx, countArgIdx, countArgIdx,
		))
		countArgs = append(countArgs, "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%", "%"+input.Search+"%")
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
		return nil, fmt.Errorf("count history: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT b.id,
		       u.id, u.first_name, u.last_name, u.department,
		       r.id, r.name, r.building, %s,
		       b.title, b.purpose, %s, b.booking_date::text, to_char(b.start_time, 'HH24:MI'), to_char(b.end_time, 'HH24:MI'),
		       b.attendee_count, b.status, b.created_at, b.updated_at
		FROM bookings b
		JOIN users u ON u.id = b.user_id
		JOIN rooms r ON r.id = b.room_id
		LEFT JOIN buildings bl ON bl.code = r.building
		LEFT JOIN booking_purposes bp ON bp.code = b.purpose
		%s
		ORDER BY b.updated_at DESC, b.id DESC
		LIMIT $%d
	`, catalogssvc.LabelExpr("bl", input.Locale), catalogssvc.LabelExpr("bp", input.Locale), where, argIdx)
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list history: %w", err)
	}
	defer rows.Close()

	var items []models.AdminPendingBooking
	var nextCursor *string
	var lastUpdatedAt time.Time
	var lastID string

	count := 0
	for rows.Next() {
		var b models.AdminPendingBooking
		var updatedAt time.Time
		if err := rows.Scan(
			&b.ID,
			&b.User.ID, &b.User.FirstName, &b.User.LastName, &b.User.Department,
			&b.Room.ID, &b.Room.Name, &b.Room.Building, &b.Room.BuildingLabel,
			&b.Title, &b.Purpose, &b.PurposeLabel, &b.BookingDate, &b.StartTime, &b.EndTime,
			&b.AttendeeCount, &b.Status, &b.CreatedAt, &updatedAt,
		); err != nil {
			return nil, err
		}
		b.User.Initials = initials(b.User.FirstName, b.User.LastName)

		count++
		if count <= limit {
			items = append(items, b)
			lastUpdatedAt = updatedAt
			lastID = b.ID.String()
		}
	}

	hasMore := count > limit

	if hasMore && len(items) > 0 {
		encoded, err := utils.EncodeCursor(utils.AdminHistoryCursorPayload{
			UpdatedAt: lastUpdatedAt.UTC().Format(time.RFC3339Nano),
			ID:        lastID,
		})
		if err == nil {
			nextCursor = &encoded
		}
	}

	if items == nil {
		items = []models.AdminPendingBooking{}
	}

	return &ListHistoryResult{
		Bookings:   items,
		Total:      total,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}
