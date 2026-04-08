package rooms

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

const (
	dayStart = "08:00"
	dayEnd   = "22:00"
)

type interval struct{ start, end string }

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type SearchInput struct {
	Date         string
	Search       string
	TimeFrom     string
	TimeTo       string
	EquipmentIDs []uuid.UUID
	MinCapacity  *int
	Limit        int
	Cursor       string
}

type SearchResult struct {
	Rooms      []models.RoomCard
	HasMore    bool
	NextCursor *string
}

func (s *Service) Search(ctx context.Context, input SearchInput, currentUserID string) (*SearchResult, error) {
	date := input.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	limit := input.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	args := []any{}
	argIdx := 1
	conditions := []string{"r.is_active = true"}

	if input.Search != "" {
		conditions = append(conditions, fmt.Sprintf("r.name ILIKE $%d", argIdx))
		args = append(args, "%"+input.Search+"%")
		argIdx++
	}

	if input.MinCapacity != nil {
		conditions = append(conditions, fmt.Sprintf("r.capacity >= $%d", argIdx))
		args = append(args, *input.MinCapacity)
		argIdx++
	}

	if len(input.EquipmentIDs) > 0 {
		idStrs := make([]string, len(input.EquipmentIDs))
		for i, id := range input.EquipmentIDs {
			idStrs[i] = fmt.Sprintf("'%s'", id.String())
		}
		conditions = append(conditions, fmt.Sprintf(
			`r.id IN (
				SELECT re.room_id FROM room_equipment re
				WHERE re.equipment_id = ANY(ARRAY[%s]::uuid[])
				GROUP BY re.room_id
				HAVING COUNT(DISTINCT re.equipment_id) = %d
			)`, strings.Join(idStrs, ","), len(input.EquipmentIDs),
		))
	}

	if input.Cursor != "" {
		cur, err := utils.DecodeRoomCursor(input.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf("(r.name, r.id::text) > ($%d, $%d)", argIdx, argIdx+1))
			args = append(args, cur.Name, cur.ID)
			argIdx += 2
		}
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`
		SELECT r.id, r.name, r.room_type, r.capacity, r.building, r.floor
		FROM rooms r
		%s
		ORDER BY r.name ASC, r.id ASC
		LIMIT $%d
	`, whereClause, argIdx)
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("search rooms: %w", err)
	}
	defer rows.Close()

	type roomRow struct {
		id       uuid.UUID
		name     string
		roomType models.RoomType
		capacity int
		building string
		floor    int
	}

	var roomRows []roomRow
	for rows.Next() {
		var r roomRow
		if err := rows.Scan(&r.id, &r.name, &r.roomType, &r.capacity, &r.building, &r.floor); err != nil {
			return nil, err
		}
		roomRows = append(roomRows, r)
	}

	hasMore := len(roomRows) > limit
	if hasMore {
		roomRows = roomRows[:limit]
	}

	roomCards := make([]models.RoomCard, 0, len(roomRows))
	for _, r := range roomRows {
		equip, err := s.getRoomEquipment(ctx, r.id)
		if err != nil {
			return nil, err
		}

		availability, err := s.computeAvailability(ctx, r.id, date, input.TimeFrom, input.TimeTo)
		if err != nil {
			return nil, err
		}

		roomCards = append(roomCards, models.RoomCard{
			ID:           r.id,
			Name:         r.name,
			RoomType:     r.roomType,
			Capacity:     r.capacity,
			Building:     r.building,
			Floor:        r.floor,
			Equipment:    equip,
			Availability: *availability,
		})
	}

	var nextCursor *string
	if hasMore && len(roomRows) > 0 {
		last := roomRows[len(roomRows)-1]
		encoded, err := utils.EncodeCursor(utils.RoomCursorPayload{
			Name: last.name,
			ID:   last.id.String(),
		})
		if err == nil {
			nextCursor = &encoded
		}
	}

	return &SearchResult{
		Rooms:      roomCards,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

func (s *Service) GetDetail(ctx context.Context, roomIDStr, date, currentUserID string) (*models.RoomDetail, error) {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return nil, ErrRoomNotFound
	}

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	var room models.RoomDetail
	var photos []string
	err = s.db.QueryRow(ctx,
		`SELECT id, name, description, room_type, capacity, building, floor, photos
		 FROM rooms WHERE id = $1 AND is_active = true`,
		roomID,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.Capacity, &room.Building, &room.Floor, &photos)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomNotFound
		}
		return nil, fmt.Errorf("get room: %w", err)
	}
	if photos == nil {
		photos = []string{}
	}
	room.Photos = photos

	equip, err := s.getRoomEquipment(ctx, roomID)
	if err != nil {
		return nil, err
	}
	room.Equipment = equip

	timeSlots, userBookings, err := s.buildTimeline(ctx, roomID, date, currentUserID)
	if err != nil {
		return nil, err
	}
	room.TimeSlots = timeSlots
	room.UserBookingsToday = userBookings

	return &room, nil
}

func (s *Service) Create(ctx context.Context, input CreateRoomInput) (*models.Room, error) {
	room := &models.Room{}
	var photos []string
	err := s.db.QueryRow(ctx,
		`INSERT INTO rooms (name, description, room_type, capacity, building, floor, photos)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, name, description, room_type, capacity, building, floor, photos, is_active, created_at, updated_at`,
		input.Name, input.Description, input.RoomType, input.Capacity, input.Building, input.Floor, input.Photos,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.Capacity, &room.Building, &room.Floor, &photos, &room.IsActive, &room.CreatedAt, &room.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert room: %w", err)
	}
	if photos == nil {
		photos = []string{}
	}
	room.Photos = photos

	if len(input.EquipmentIDs) > 0 {
		if err := s.setRoomEquipment(ctx, room.ID, input.EquipmentIDs); err != nil {
			return nil, err
		}
	}

	equip, err := s.getRoomEquipment(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	room.Equipment = equip
	return room, nil
}

func (s *Service) Update(ctx context.Context, roomIDStr string, input CreateRoomInput) (*models.Room, error) {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return nil, ErrRoomNotFound
	}

	room := &models.Room{}
	var photos []string
	err = s.db.QueryRow(ctx,
		`UPDATE rooms SET name=$1, description=$2, room_type=$3, capacity=$4, building=$5, floor=$6, photos=$7, updated_at=now()
		 WHERE id=$8 AND is_active=true
		 RETURNING id, name, description, room_type, capacity, building, floor, photos, is_active, created_at, updated_at`,
		input.Name, input.Description, input.RoomType, input.Capacity, input.Building, input.Floor, input.Photos, roomID,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.Capacity, &room.Building, &room.Floor, &photos, &room.IsActive, &room.CreatedAt, &room.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomNotFound
		}
		return nil, fmt.Errorf("update room: %w", err)
	}
	if photos == nil {
		photos = []string{}
	}
	room.Photos = photos

	if _, err := s.db.Exec(ctx, "DELETE FROM room_equipment WHERE room_id = $1", roomID); err != nil {
		return nil, fmt.Errorf("clear equipment: %w", err)
	}

	if len(input.EquipmentIDs) > 0 {
		if err := s.setRoomEquipment(ctx, room.ID, input.EquipmentIDs); err != nil {
			return nil, err
		}
	}

	equip, err := s.getRoomEquipment(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	room.Equipment = equip
	return room, nil
}

func (s *Service) Delete(ctx context.Context, roomIDStr string) error {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return ErrRoomNotFound
	}

	tag, err := s.db.Exec(ctx, "UPDATE rooms SET is_active=false, updated_at=now() WHERE id=$1 AND is_active=true", roomID)
	if err != nil {
		return fmt.Errorf("delete room: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRoomNotFound
	}
	return nil
}

func (s *Service) ListEquipment(ctx context.Context) ([]models.Equipment, error) {
	rows, err := s.db.Query(ctx, "SELECT id, name, icon FROM equipment ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("list equipment: %w", err)
	}
	defer rows.Close()

	var items []models.Equipment
	for rows.Next() {
		var e models.Equipment
		if err := rows.Scan(&e.ID, &e.Name, &e.Icon); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	if items == nil {
		items = []models.Equipment{}
	}
	return items, nil
}

func (s *Service) getRoomEquipment(ctx context.Context, roomID uuid.UUID) ([]models.Equipment, error) {
	rows, err := s.db.Query(ctx,
		`SELECT e.id, e.name, e.icon
		 FROM equipment e
		 JOIN room_equipment re ON re.equipment_id = e.id
		 WHERE re.room_id = $1
		 ORDER BY e.name ASC`,
		roomID,
	)
	if err != nil {
		return nil, fmt.Errorf("get equipment: %w", err)
	}
	defer rows.Close()

	var items []models.Equipment
	for rows.Next() {
		var e models.Equipment
		if err := rows.Scan(&e.ID, &e.Name, &e.Icon); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	if items == nil {
		items = []models.Equipment{}
	}
	return items, nil
}

func (s *Service) setRoomEquipment(ctx context.Context, roomID uuid.UUID, equipmentIDs []uuid.UUID) error {
	for _, eID := range equipmentIDs {
		_, err := s.db.Exec(ctx,
			"INSERT INTO room_equipment (room_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			roomID, eID,
		)
		if err != nil {
			return fmt.Errorf("insert room_equipment: %w", err)
		}
	}
	return nil
}

type bookingSlot struct {
	id        uuid.UUID
	userID    uuid.UUID
	title     string
	startTime string
	endTime   string
	status    models.BookingStatus
}

func (s *Service) buildTimeline(ctx context.Context, roomID uuid.UUID, date, currentUserID string) ([]models.TimeSlot, []models.UserBookingSummary, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, user_id, title, start_time::text, end_time::text, status
		 FROM bookings
		 WHERE room_id = $1 AND booking_date = $2 AND status IN ('confirmed', 'pending')
		 ORDER BY start_time ASC`,
		roomID, date,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("get bookings: %w", err)
	}
	defer rows.Close()

	var slots []bookingSlot
	var userBookings []models.UserBookingSummary

	for rows.Next() {
		var b bookingSlot
		if err := rows.Scan(&b.id, &b.userID, &b.title, &b.startTime, &b.endTime, &b.status); err != nil {
			return nil, nil, err
		}
		slots = append(slots, b)
		if b.userID.String() == currentUserID {
			userBookings = append(userBookings, models.UserBookingSummary{
				ID:        b.id,
				Title:     b.title,
				StartTime: b.startTime,
				EndTime:   b.endTime,
				Status:    b.status,
			})
		}
	}

	if userBookings == nil {
		userBookings = []models.UserBookingSummary{}
	}

	timeSlots := buildTimeSlots(slots, currentUserID, dayStart, dayEnd)
	return timeSlots, userBookings, nil
}

func buildTimeSlots(slots []bookingSlot, currentUserID, dayStart, dayEnd string) []models.TimeSlot {
	result := []models.TimeSlot{}
	current := dayStart

	for _, b := range slots {
		if current < b.startTime {
			result = append(result, models.TimeSlot{
				StartTime: current,
				EndTime:   b.startTime,
				Status:    models.SlotAvailable,
				Booking:   nil,
			})
		}

		slotStatus := determineSlotStatus(b, currentUserID)
		booking := &models.TimeSlotBooking{
			ID:     b.id,
			Title:  b.title,
			UserID: b.userID,
		}
		result = append(result, models.TimeSlot{
			StartTime: b.startTime,
			EndTime:   b.endTime,
			Status:    slotStatus,
			Booking:   booking,
		})

		if b.endTime > current {
			current = b.endTime
		}
	}

	if current < dayEnd {
		result = append(result, models.TimeSlot{
			StartTime: current,
			EndTime:   dayEnd,
			Status:    models.SlotAvailable,
			Booking:   nil,
		})
	}

	return result
}

func determineSlotStatus(b bookingSlot, currentUserID string) models.TimeSlotStatus {
	if b.userID.String() == currentUserID {
		return models.SlotYours
	}
	if b.status == models.StatusConfirmed {
		return models.SlotOccupied
	}
	return models.SlotPending
}

func (s *Service) computeAvailability(ctx context.Context, roomID uuid.UUID, date, timeFrom, timeTo string) (*models.RoomAvailability, error) {
	rows, err := s.db.Query(ctx,
		`SELECT start_time::text, end_time::text
		 FROM bookings
		 WHERE room_id = $1 AND booking_date = $2 AND status = 'confirmed'
		 ORDER BY start_time ASC`,
		roomID, date,
	)
	if err != nil {
		return nil, fmt.Errorf("get confirmed bookings: %w", err)
	}
	defer rows.Close()

	var occupied []interval
	for rows.Next() {
		var iv interval
		if err := rows.Scan(&iv.start, &iv.end); err != nil {
			return nil, err
		}
		occupied = append(occupied, iv)
	}

	freeIntervals := computeFreeIntervals(occupied, dayStart, dayEnd)

	isToday := date == time.Now().Format("2006-01-02")
	nowStr := time.Now().Format("15:04")

	if timeFrom != "" && timeTo != "" {
		isAvail := false
		for _, free := range freeIntervals {
			if free.start <= timeFrom && free.end >= timeTo {
				isAvail = true
				break
			}
		}
		label := "FULLY BOOKED"
		var avRange *string
		if isAvail {
			if isToday && nowStr >= timeFrom && nowStr <= timeTo {
				label = "AVAILABLE NOW"
			} else {
				label = "AVAILABLE"
			}
			r := timeFrom + " — " + timeTo
			avRange = &r
		}
		return &models.RoomAvailability{IsAvailable: isAvail, Label: label, AvailableTimeRange: avRange}, nil
	}

	if len(freeIntervals) == 0 {
		return &models.RoomAvailability{IsAvailable: false, Label: "FULLY BOOKED", AvailableTimeRange: nil}, nil
	}

	label := "AVAILABLE"
	var avRange *string
	if isToday {
		inFree := false
		for _, f := range freeIntervals {
			if nowStr >= f.start && nowStr < f.end {
				inFree = true
				break
			}
		}
		if inFree {
			label = "AVAILABLE NOW"
		} else {
			nextOccupied := findCurrentOccupied(occupied, nowStr)
			if nextOccupied != nil {
				label = "BOOKED UNTIL " + nextOccupied.end
			}
		}
	}

	r := freeIntervals[0].start + " — " + freeIntervals[0].end
	avRange = &r
	return &models.RoomAvailability{IsAvailable: true, Label: label, AvailableTimeRange: avRange}, nil
}

func computeFreeIntervals(occupied []interval, dayStart, dayEnd string) []interval {
	free := []interval{}
	current := dayStart
	for _, o := range occupied {
		if current < o.start {
			free = append(free, interval{start: current, end: o.start})
		}
		if o.end > current {
			current = o.end
		}
	}
	if current < dayEnd {
		free = append(free, interval{start: current, end: dayEnd})
	}
	return free
}

func findCurrentOccupied(occupied []interval, now string) *interval {
	for i, o := range occupied {
		if now >= o.start && now < o.end {
			return &occupied[i]
		}
	}
	return nil
}

type CreateRoomInput struct {
	Name         string
	Description  *string
	RoomType     models.RoomType
	Capacity     int
	Building     string
	Floor        int
	Photos       []string
	EquipmentIDs []uuid.UUID
}
