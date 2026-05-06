package rooms

import (
	"context"
	"fmt"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/models"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	"booking-university-rooms/backend/internal/utils"

	"github.com/google/uuid"
)

type TimelineInput struct {
	Date         string
	Mode         string
	Search       string
	Building     string
	RoomType     string
	EquipmentIDs []uuid.UUID
	MinCapacity  *int
	Limit        int
	Cursor       string
	Locale       string
}

type TimelineResult struct {
	Rooms []models.RoomTimeline
	Meta  models.TimelineMeta
}

func (s *Service) GetTimeline(ctx context.Context, input TimelineInput, currentUserID string, isAdmin bool) (*TimelineResult, error) {
	date := input.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	startDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, ErrInvalidDate
	}

	mode := input.Mode
	if mode != "week" {
		mode = "day"
	}

	limit := input.Limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	rooms, hasMore, nextCursor, err := s.timelineRooms(ctx, input, limit)
	if err != nil {
		return nil, err
	}

	dates := []string{date}
	if mode == "week" {
		dates = make([]string, 7)
		for i := 0; i < 7; i++ {
			dates[i] = startDate.AddDate(0, 0, i).Format("2006-01-02")
		}
	}

	roomIDs := make([]uuid.UUID, 0, len(rooms))
	for _, r := range rooms {
		roomIDs = append(roomIDs, r.ID)
	}

	bookingsByRoomDate, err := s.timelineBookings(ctx, roomIDs, dates)
	if err != nil {
		return nil, err
	}
	equipmentByRoom, err := s.equipmentForRooms(ctx, roomIDs, input.Locale)
	if err != nil {
		return nil, err
	}

	result := make([]models.RoomTimeline, 0, len(rooms))
	for _, room := range rooms {
		room.Equipment = equipmentByRoom[room.ID]
		if room.Equipment == nil {
			room.Equipment = []models.Equipment{}
		}

		if mode == "day" {
			bookingSlots := bookingsByRoomDate[roomDateKey{room.ID, date}]
			room.Slots = buildTimeSlots(bookingSlots, currentUserID, room.OpenTime, room.CloseTime, isAdmin)
			room.Bookings = timelineBookingsFromSlots(bookingSlots, isAdmin)
		} else {
			room.Days = make([]models.RoomTimelineDay, 0, len(dates))
			for _, d := range dates {
				bookingSlots := bookingsByRoomDate[roomDateKey{room.ID, d}]
				room.Days = append(room.Days, models.RoomTimelineDay{
					Date:     d,
					Slots:    buildTimeSlots(bookingSlots, currentUserID, room.OpenTime, room.CloseTime, isAdmin),
					Bookings: timelineBookingsFromSlots(bookingSlots, isAdmin),
				})
			}
		}
		result = append(result, room)
	}

	var endDate *string
	if mode == "week" {
		ed := dates[len(dates)-1]
		endDate = &ed
	}

	return &TimelineResult{
		Rooms: result,
		Meta: models.TimelineMeta{
			Date:       date,
			Mode:       mode,
			EndDate:    endDate,
			HasMore:    hasMore,
			NextCursor: nextCursor,
		},
	}, nil
}

func (s *Service) timelineRooms(ctx context.Context, input TimelineInput, limit int) ([]models.RoomTimeline, bool, *string, error) {
	args := []any{}
	argIdx := 1
	conditions := []string{"r.is_active = true"}

	if input.Search != "" {
		conditions = append(conditions, fmt.Sprintf("r.name ILIKE $%d", argIdx))
		args = append(args, "%"+input.Search+"%")
		argIdx++
	}
	if input.Building != "" {
		conditions = append(conditions, fmt.Sprintf("r.building = $%d", argIdx))
		args = append(args, input.Building)
		argIdx++
	}
	if input.RoomType != "" {
		conditions = append(conditions, fmt.Sprintf("r.room_type = $%d", argIdx))
		args = append(args, input.RoomType)
		argIdx++
	}
	if input.MinCapacity != nil {
		conditions = append(conditions, fmt.Sprintf("r.capacity >= $%d", argIdx))
		args = append(args, *input.MinCapacity)
		argIdx++
	}
	if len(input.EquipmentIDs) > 0 {
		ids := make([]string, len(input.EquipmentIDs))
		for i, id := range input.EquipmentIDs {
			ids[i] = fmt.Sprintf("'%s'", id.String())
		}
		conditions = append(conditions, fmt.Sprintf(`r.id IN (
			SELECT re.room_id FROM room_equipment re
			WHERE re.equipment_id = ANY(ARRAY[%s]::uuid[])
			GROUP BY re.room_id
			HAVING COUNT(DISTINCT re.equipment_id) = %d
		)`, strings.Join(ids, ","), len(input.EquipmentIDs)))
	}
	if input.Cursor != "" {
		cur, err := utils.DecodeRoomCursor(input.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf("(r.name, r.id::text) > ($%d, $%d)", argIdx, argIdx+1))
			args = append(args, cur.Name, cur.ID)
			argIdx += 2
		}
	}

	query := fmt.Sprintf(`
		SELECT r.id, r.name, r.description, r.room_type, %s, r.capacity, r.building, %s,
		       r.floor, r.photos, to_char(r.open_time, 'HH24:MI'), to_char(r.close_time, 'HH24:MI')
		FROM rooms r
		JOIN buildings b ON b.code = r.building AND b.is_active = true
		JOIN room_types rt ON rt.code = r.room_type AND rt.is_active = true
		WHERE %s
		ORDER BY r.name ASC, r.id ASC
		LIMIT $%d
	`, catalogssvc.LabelExpr("rt", input.Locale), catalogssvc.LabelExpr("b", input.Locale), strings.Join(conditions, " AND "), argIdx)
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, false, nil, fmt.Errorf("timeline rooms: %w", err)
	}
	defer rows.Close()

	var rooms []models.RoomTimeline
	for rows.Next() {
		var room models.RoomTimeline
		if err := rows.Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.RoomTypeLabel, &room.Capacity, &room.Building, &room.BuildingLabel, &room.Floor, &room.Photos, &room.OpenTime, &room.CloseTime); err != nil {
			return nil, false, nil, err
		}
		if room.Photos == nil {
			room.Photos = []string{}
		}
		rooms = append(rooms, room)
	}

	hasMore := len(rooms) > limit
	if hasMore {
		rooms = rooms[:limit]
	}

	var nextCursor *string
	if hasMore && len(rooms) > 0 {
		last := rooms[len(rooms)-1]
		encoded, err := utils.EncodeCursor(utils.RoomCursorPayload{Name: last.Name, ID: last.ID.String()})
		if err == nil {
			nextCursor = &encoded
		}
	}
	if rooms == nil {
		rooms = []models.RoomTimeline{}
	}

	return rooms, hasMore, nextCursor, nil
}

type roomDateKey struct {
	roomID uuid.UUID
	date   string
}

func (s *Service) timelineBookings(ctx context.Context, roomIDs []uuid.UUID, dates []string) (map[roomDateKey][]bookingSlot, error) {
	result := map[roomDateKey][]bookingSlot{}
	if len(roomIDs) == 0 {
		return result, nil
	}

	rows, err := s.db.Query(ctx, `
		SELECT b.room_id, b.booking_date::text, b.id, b.user_id, b.title,
		       to_char(b.start_time, 'HH24:MI'), to_char(b.end_time, 'HH24:MI'), b.status,
		       u.first_name, u.last_name, u.email, u.department, u.participant_type, u.teacher_rank
		FROM bookings b
		JOIN users u ON u.id = b.user_id
		WHERE b.room_id = ANY($1)
		  AND b.booking_date = ANY($2::date[])
		  AND b.status IN ('confirmed', 'pending')
		ORDER BY b.room_id, b.booking_date, b.start_time ASC, b.id ASC
	`, roomIDs, dates)
	if err != nil {
		return nil, fmt.Errorf("timeline bookings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var roomID uuid.UUID
		var date string
		var b bookingSlot
		if err := rows.Scan(&roomID, &date, &b.id, &b.userID, &b.title, &b.startTime, &b.endTime, &b.status, &b.firstName, &b.lastName, &b.email, &b.department, &b.participantType, &b.teacherRank); err != nil {
			return nil, err
		}
		result[roomDateKey{roomID: roomID, date: date}] = append(result[roomDateKey{roomID: roomID, date: date}], b)
	}

	return result, rows.Err()
}

func (s *Service) equipmentForRooms(ctx context.Context, roomIDs []uuid.UUID, locale string) (map[uuid.UUID][]models.Equipment, error) {
	result := map[uuid.UUID][]models.Equipment{}
	if len(roomIDs) == 0 {
		return result, nil
	}

	rows, err := s.db.Query(ctx, fmt.Sprintf(`
		SELECT re.room_id, e.id, e.code, %s, e.label_ru, e.label_en, e.icon, e.is_active, e.sort_order, e.created_at, e.updated_at
		FROM room_equipment re
		JOIN equipment e ON e.id = re.equipment_id
		WHERE re.room_id = ANY($1)
		ORDER BY e.sort_order ASC, e.code ASC
	`, catalogssvc.LabelExpr("e", locale)), roomIDs)
	if err != nil {
		return nil, fmt.Errorf("timeline equipment: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var roomID uuid.UUID
		var e models.Equipment
		if err := rows.Scan(&roomID, &e.ID, &e.Code, &e.Name, &e.LabelRu, &e.LabelEn, &e.Icon, &e.IsActive, &e.SortOrder, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		result[roomID] = append(result[roomID], e)
	}

	return result, rows.Err()
}

func timelineBookingsFromSlots(slots []bookingSlot, isAdmin bool) []models.TimelineBooking {
	bookings := make([]models.TimelineBooking, 0, len(slots))
	for _, b := range slots {
		booking := models.TimelineBooking{
			ID:        b.id,
			UserID:    b.userID,
			Title:     b.title,
			Status:    b.status,
			StartTime: b.startTime,
			EndTime:   b.endTime,
		}
		if isAdmin {
			booking.User = bookingUserInfo(b)
		}
		bookings = append(bookings, booking)
	}
	if bookings == nil {
		bookings = []models.TimelineBooking{}
	}
	return bookings
}
