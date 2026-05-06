package rooms

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/models"
	catalogssvc "booking-university-rooms/backend/internal/services/catalogs"
	"booking-university-rooms/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
	Building     string
	Locale       string
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

	if (input.TimeFrom != "" && !utils.IsValidFiveMinuteTime(input.TimeFrom)) ||
		(input.TimeTo != "" && !utils.IsValidFiveMinuteTime(input.TimeTo)) ||
		(input.TimeFrom != "" && input.TimeTo != "" && input.TimeFrom >= input.TimeTo) {
		return nil, ErrInvalidTimeRange
	}

	limit := input.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	args := []any{}
	argIdx := 1
	conditions := []string{"r.is_active = true"}
	building := strings.TrimSpace(input.Building)
	if building == "" {
		building = "aviamotornaya"
	}
	conditions = append(conditions, fmt.Sprintf("r.building = $%d", argIdx))
	args = append(args, building)
	argIdx++

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
		SELECT r.id, r.name, r.description, r.room_type, %s, r.capacity, r.building, %s, r.floor, r.photos, to_char(r.open_time, 'HH24:MI'), to_char(r.close_time, 'HH24:MI')
		FROM rooms r
		JOIN buildings b ON b.code = r.building AND b.is_active = true
		JOIN room_types rt ON rt.code = r.room_type AND rt.is_active = true
		%s
		ORDER BY r.name ASC, r.id ASC
		LIMIT $%d
	`, catalogssvc.LabelExpr("rt", input.Locale), catalogssvc.LabelExpr("b", input.Locale), whereClause, argIdx)
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("search rooms: %w", err)
	}
	defer rows.Close()

	type roomRow struct {
		id            uuid.UUID
		name          string
		description   *string
		roomType      models.RoomType
		roomTypeLabel string
		capacity      int
		building      string
		buildingLabel string
		floor         int
		photos        []string
		openTime      string
		closeTime     string
	}

	var roomRows []roomRow
	for rows.Next() {
		var r roomRow
		if err := rows.Scan(&r.id, &r.name, &r.description, &r.roomType, &r.roomTypeLabel, &r.capacity, &r.building, &r.buildingLabel, &r.floor, &r.photos, &r.openTime, &r.closeTime); err != nil {
			return nil, err
		}
		if r.photos == nil {
			r.photos = []string{}
		}
		roomRows = append(roomRows, r)
	}

	hasMore := len(roomRows) > limit
	if hasMore {
		roomRows = roomRows[:limit]
	}

	roomCards := make([]models.RoomCard, 0, len(roomRows))
	for _, r := range roomRows {
		equip, err := s.getRoomEquipment(ctx, r.id, input.Locale)
		if err != nil {
			return nil, err
		}

		availability, err := s.computeAvailability(ctx, r.id, date, input.TimeFrom, input.TimeTo, r.openTime, r.closeTime)
		if err != nil {
			return nil, err
		}

		roomCards = append(roomCards, models.RoomCard{
			ID:            r.id,
			Name:          r.name,
			Description:   r.description,
			RoomType:      r.roomType,
			RoomTypeLabel: r.roomTypeLabel,
			Capacity:      r.capacity,
			Building:      r.building,
			BuildingLabel: r.buildingLabel,
			Floor:         r.floor,
			Photos:        r.photos,
			Equipment:     equip,
			Availability:  *availability,
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

func (s *Service) GetDetail(ctx context.Context, roomIDStr, date, currentUserID, locale string) (*models.RoomDetail, error) {
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
		fmt.Sprintf(`SELECT r.id, r.name, r.description, r.room_type, %s, r.capacity, r.building, %s, r.floor, r.photos, to_char(r.open_time, 'HH24:MI'), to_char(r.close_time, 'HH24:MI')
		 FROM rooms r
		 JOIN buildings b ON b.code = r.building
		 JOIN room_types rt ON rt.code = r.room_type
		 WHERE r.id = $1 AND r.is_active = true`, catalogssvc.LabelExpr("rt", locale), catalogssvc.LabelExpr("b", locale)),
		roomID,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.RoomTypeLabel, &room.Capacity, &room.Building, &room.BuildingLabel, &room.Floor, &photos, &room.OpenTime, &room.CloseTime)
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

	equip, err := s.getRoomEquipment(ctx, roomID, locale)
	if err != nil {
		return nil, err
	}
	room.Equipment = equip

	timeSlots, userBookings, err := s.buildTimeline(ctx, roomID, date, currentUserID, room.OpenTime, room.CloseTime)
	if err != nil {
		return nil, err
	}
	room.TimeSlots = timeSlots
	room.UserBookingsToday = userBookings

	return &room, nil
}

func (s *Service) Create(ctx context.Context, input CreateRoomInput) (*models.Room, error) {
	openTime, closeTime, err := normalizeRoomHours(input.OpenTime, input.CloseTime)
	if err != nil {
		return nil, err
	}
	ok, err := s.activeBuildingExists(ctx, input.Building)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrInvalidBuilding
	}
	ok, err = s.activeRoomTypeExists(ctx, string(input.RoomType))
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrInvalidRoomType
	}
	if input.ID == uuid.Nil {
		input.ID = uuid.New()
	}

	room := &models.Room{}
	var photos []string
	err = s.db.QueryRow(ctx,
		fmt.Sprintf(`INSERT INTO rooms (id, name, description, room_type, capacity, building, floor, photos, open_time, close_time)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::time, $10::time)
		 RETURNING id, name, description, room_type,
		           (SELECT %s FROM room_types rt WHERE rt.code = rooms.room_type),
		           capacity, building,
		           (SELECT %s FROM buildings b WHERE b.code = rooms.building),
		           floor, photos, is_active, created_at, updated_at, to_char(open_time, 'HH24:MI'), to_char(close_time, 'HH24:MI')`, catalogssvc.LabelExpr("rt", input.Locale), catalogssvc.LabelExpr("b", input.Locale)),
		input.ID, input.Name, input.Description, input.RoomType, input.Capacity, input.Building, input.Floor, input.Photos, openTime, closeTime,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.RoomTypeLabel, &room.Capacity, &room.Building, &room.BuildingLabel, &room.Floor, &photos, &room.IsActive, &room.CreatedAt, &room.UpdatedAt, &room.OpenTime, &room.CloseTime)
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

	equip, err := s.getRoomEquipment(ctx, room.ID, input.Locale)
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
	openTime, closeTime, err := normalizeRoomHours(input.OpenTime, input.CloseTime)
	if err != nil {
		return nil, err
	}
	ok, err := s.activeBuildingExists(ctx, input.Building)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrInvalidBuilding
	}
	ok, err = s.activeRoomTypeExists(ctx, string(input.RoomType))
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrInvalidRoomType
	}

	room := &models.Room{}
	var photos []string
	err = s.db.QueryRow(ctx,
		fmt.Sprintf(`UPDATE rooms SET name=$1, description=$2, room_type=$3, capacity=$4, building=$5, floor=$6, photos=CASE WHEN $10 THEN photos ELSE $7 END, open_time=$8::time, close_time=$9::time, updated_at=now()
		 WHERE id=$11 AND is_active=true
		 RETURNING id, name, description, room_type,
		           (SELECT %s FROM room_types rt WHERE rt.code = rooms.room_type),
		           capacity, building,
		           (SELECT %s FROM buildings b WHERE b.code = rooms.building),
		           floor, photos, is_active, created_at, updated_at, to_char(open_time, 'HH24:MI'), to_char(close_time, 'HH24:MI')`, catalogssvc.LabelExpr("rt", input.Locale), catalogssvc.LabelExpr("b", input.Locale)),
		input.Name, input.Description, input.RoomType, input.Capacity, input.Building, input.Floor, input.Photos, openTime, closeTime, input.KeepExistingPhotos, roomID,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.RoomTypeLabel, &room.Capacity, &room.Building, &room.BuildingLabel, &room.Floor, &photos, &room.IsActive, &room.CreatedAt, &room.UpdatedAt, &room.OpenTime, &room.CloseTime)
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

	equip, err := s.getRoomEquipment(ctx, room.ID, input.Locale)
	if err != nil {
		return nil, err
	}
	room.Equipment = equip
	return room, nil
}

func (s *Service) GetRoomPhotos(ctx context.Context, roomIDStr string) ([]string, error) {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return nil, ErrRoomNotFound
	}

	var photos []string
	err = s.db.QueryRow(ctx, "SELECT photos FROM rooms WHERE id=$1", roomID).Scan(&photos)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomNotFound
		}
		return nil, fmt.Errorf("select room photos: %w", err)
	}
	if photos == nil {
		photos = []string{}
	}
	return photos, nil
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
	rows, err := s.db.Query(ctx, `
		SELECT id, code, label_en, label_ru, label_en, icon, is_active, sort_order, created_at, updated_at
		FROM equipment
		ORDER BY sort_order ASC, code ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list equipment: %w", err)
	}
	defer rows.Close()

	var items []models.Equipment
	for rows.Next() {
		var e models.Equipment
		if err := rows.Scan(&e.ID, &e.Code, &e.Name, &e.LabelRu, &e.LabelEn, &e.Icon, &e.IsActive, &e.SortOrder, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	if items == nil {
		items = []models.Equipment{}
	}
	return items, nil
}

func (s *Service) getRoomEquipment(ctx context.Context, roomID uuid.UUID, locale string) ([]models.Equipment, error) {
	rows, err := s.db.Query(ctx,
		fmt.Sprintf(`SELECT e.id, e.code, %s, e.label_ru, e.label_en, e.icon, e.is_active, e.sort_order, e.created_at, e.updated_at
		 FROM equipment e
		 JOIN room_equipment re ON re.equipment_id = e.id
		 WHERE re.room_id = $1
		 ORDER BY e.sort_order ASC, e.code ASC`, catalogssvc.LabelExpr("e", locale)),
		roomID,
	)
	if err != nil {
		return nil, fmt.Errorf("get equipment: %w", err)
	}
	defer rows.Close()

	var items []models.Equipment
	for rows.Next() {
		var e models.Equipment
		if err := rows.Scan(&e.ID, &e.Code, &e.Name, &e.LabelRu, &e.LabelEn, &e.Icon, &e.IsActive, &e.SortOrder, &e.CreatedAt, &e.UpdatedAt); err != nil {
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

func (s *Service) buildTimeline(ctx context.Context, roomID uuid.UUID, date, currentUserID, openTime, closeTime string) ([]models.TimeSlot, []models.UserBookingSummary, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, user_id, title, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI'), status
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

	timeSlots := buildTimeSlots(slots, currentUserID, openTime, closeTime)
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
		if b.status == models.StatusPending {
			return models.SlotYoursPending
		}
		return models.SlotYours
	}
	if b.status == models.StatusConfirmed {
		return models.SlotOccupied
	}
	return models.SlotPending
}

func (s *Service) computeAvailability(ctx context.Context, roomID uuid.UUID, date, timeFrom, timeTo, openTime, closeTime string) (*models.RoomAvailability, error) {
	rows, err := s.db.Query(ctx,
		`SELECT to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI')
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

	freeIntervals := computeFreeIntervals(occupied, openTime, closeTime)

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
	ID                 uuid.UUID
	Name               string
	Description        *string
	RoomType           models.RoomType
	Capacity           int
	Building           string
	Floor              int
	Photos             []string
	KeepExistingPhotos bool
	OpenTime           string
	CloseTime          string
	EquipmentIDs       []uuid.UUID
	Locale             string
}

func (s *Service) activeBuildingExists(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM buildings WHERE code = $1 AND is_active = true)", code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check building: %w", err)
	}
	return exists, nil
}

func (s *Service) activeRoomTypeExists(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM room_types WHERE code = $1 AND is_active = true)", code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check room type: %w", err)
	}
	return exists, nil
}

func normalizeRoomHours(openTime, closeTime string) (string, string, error) {
	if openTime == "" {
		openTime = "08:00"
	}
	if closeTime == "" {
		closeTime = "20:00"
	}

	if !utils.IsValidFiveMinuteTime(openTime) || !utils.IsValidFiveMinuteTime(closeTime) || openTime >= closeTime {
		return "", "", ErrInvalidTimeRange
	}

	return openTime, closeTime, nil
}

type AdminSearchInput struct {
	Search string
	Status string // "active", "inactive", or "all"
	Limit  int
	Cursor string
	Locale string
}

func (s *Service) AdminSearch(ctx context.Context, input AdminSearchInput) (*SearchResult, error) {
	limit := input.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	args := []any{}
	argIdx := 1
	conditions := []string{}

	if input.Status == "active" {
		conditions = append(conditions, "r.is_active = true")
	} else if input.Status == "inactive" {
		conditions = append(conditions, "r.is_active = false")
	} // else "all", no filter

	if input.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(r.name ILIKE $%d OR r.building ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+input.Search+"%")
		argIdx++
	}

	cursorUUID, err := uuid.Parse(input.Cursor)
	if err == nil {
		conditions = append(conditions, fmt.Sprintf("r.id > $%d", argIdx))
		args = append(args, cursorUUID)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT
			r.id, r.name, r.description, r.room_type, %s AS room_type_label, r.capacity, r.building, r.floor, r.photos, r.is_active,
			%s AS building_label,
			COALESCE(
				json_agg(
					json_build_object(
						'id', e.id,
						'code', e.code,
						'name', %s,
						'labelRu', e.label_ru,
						'labelEn', e.label_en,
						'icon', e.icon,
						'isActive', e.is_active,
						'sortOrder', e.sort_order
					)
				) FILTER (WHERE e.id IS NOT NULL),
				'[]'
			) as equipment
		FROM rooms r
		LEFT JOIN buildings b ON b.code = r.building
		LEFT JOIN room_types rt ON rt.code = r.room_type
		LEFT JOIN room_equipment re ON r.id = re.room_id
		LEFT JOIN equipment e ON re.equipment_id = e.id
		%s
		GROUP BY r.id, b.label_ru, b.label_en, rt.label_ru, rt.label_en
		ORDER BY r.name ASC, r.id ASC
		LIMIT $%d
	`, catalogssvc.LabelExpr("rt", input.Locale), catalogssvc.LabelExpr("b", input.Locale), catalogssvc.LabelExpr("e", input.Locale), whereClause, argIdx)

	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("admin search rooms: %w", err)
	}
	defer rows.Close()

	var rooms []models.RoomCard
	for rows.Next() {
		var room models.RoomCard
		var eqBytes []byte
		var isActive bool

		if err := rows.Scan(
			&room.ID, &room.Name, &room.Description, &room.RoomType, &room.RoomTypeLabel, &room.Capacity,
			&room.Building, &room.Floor, &room.Photos, &isActive, &room.BuildingLabel, &eqBytes,
		); err != nil {
			return nil, fmt.Errorf("scan admin room: %w", err)
		}
		if room.Photos == nil {
			room.Photos = []string{}
		}

		if err := json.Unmarshal(eqBytes, &room.Equipment); err != nil {
			return nil, fmt.Errorf("unmarshal eq: %w", err)
		}

		if isActive {
			room.Availability = models.RoomAvailability{IsAvailable: true, Label: "ACTIVE"}
		} else {
			room.Availability = models.RoomAvailability{IsAvailable: false, Label: "INACTIVE"}
		}

		rooms = append(rooms, room)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	hasMore := false
	var nextCursor *string
	if len(rooms) > limit {
		hasMore = true
		rooms = rooms[:limit]
		c := rooms[len(rooms)-1].ID.String()
		nextCursor = &c
	}

	return &SearchResult{
		Rooms:      rooms,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

func (s *Service) Reactivate(ctx context.Context, roomIDStr string) (*models.Room, error) {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return nil, ErrRoomNotFound
	}

	room := &models.Room{}
	var photos []string
	err = s.db.QueryRow(ctx,
		`UPDATE rooms SET is_active=true, updated_at=now() WHERE id=$1
		 RETURNING id, name, description, room_type, room_type, capacity, building, building, floor, photos, is_active, created_at, updated_at, to_char(open_time, 'HH24:MI'), to_char(close_time, 'HH24:MI')`,
		roomID,
	).Scan(&room.ID, &room.Name, &room.Description, &room.RoomType, &room.RoomTypeLabel, &room.Capacity, &room.Building, &room.BuildingLabel, &room.Floor, &photos, &room.IsActive, &room.CreatedAt, &room.UpdatedAt, &room.OpenTime, &room.CloseTime)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRoomNotFound
		}
		return nil, fmt.Errorf("reactivate room: %w", err)
	}
	if photos == nil {
		photos = []string{}
	}
	room.Photos = photos

	equip, err := s.getRoomEquipment(ctx, room.ID, "")
	if err != nil {
		return nil, err
	}
	room.Equipment = equip
	return room, nil
}

var ErrRoomHasBookings = errors.New("room has bookings")

func (s *Service) HardDelete(ctx context.Context, roomIDStr string) error {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return ErrRoomNotFound
	}

	var count int
	err = s.db.QueryRow(ctx, "SELECT count(*) FROM bookings WHERE room_id = $1", roomID).Scan(&count)
	if err != nil {
		return fmt.Errorf("check bookings: %w", err)
	}
	if count > 0 {
		return ErrRoomHasBookings
	}

	tag, err := s.db.Exec(ctx, "DELETE FROM rooms WHERE id=$1", roomID)
	if err != nil {
		return fmt.Errorf("hard delete room: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRoomNotFound
	}
	return nil
}
