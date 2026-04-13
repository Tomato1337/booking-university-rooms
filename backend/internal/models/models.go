package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"
)

type BookingStatus string

const (
	StatusPending   BookingStatus = "pending"
	StatusConfirmed BookingStatus = "confirmed"
	StatusRejected  BookingStatus = "rejected"
	StatusCancelled BookingStatus = "cancelled"
)

type RoomType string

const (
	RoomTypeLab         RoomType = "lab"
	RoomTypeAuditorium  RoomType = "auditorium"
	RoomTypeSeminar     RoomType = "seminar"
	RoomTypeConference  RoomType = "conference"
	RoomTypeStudio      RoomType = "studio"
	RoomTypeLectureHall RoomType = "lecture_hall"
)

type BookingPurpose string

const (
	PurposeAcademicLecture     BookingPurpose = "academic_lecture"
	PurposeResearchWorkshop    BookingPurpose = "research_workshop"
	PurposeCollaborativeStudy  BookingPurpose = "collaborative_study"
	PurposeTechnicalAssessment BookingPurpose = "technical_assessment"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Department   *string   `json:"department"`
	Role         UserRole  `json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"-"`
}

type RefreshToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"userId"`
	TokenHash string     `json:"-"`
	ExpiresAt time.Time  `json:"expiresAt"`
	CreatedAt time.Time  `json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt"`
}

type Equipment struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Icon string    `json:"icon"`
}

type EquipmentUsageRoom struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type EquipmentDeleteResult struct {
	Equipment   Equipment            `json:"equipment"`
	UsedInRooms []EquipmentUsageRoom `json:"usedInRooms"`
}

type Room struct {
	ID          uuid.UUID   `json:"id"`
	Name        string      `json:"name"`
	Description *string     `json:"description"`
	RoomType    RoomType    `json:"roomType"`
	Capacity    int         `json:"capacity"`
	Building    string      `json:"building"`
	Floor       int         `json:"floor"`
	Photos      []string    `json:"photos"`
	OpenTime    string      `json:"openTime"`
	CloseTime   string      `json:"closeTime"`
	IsActive    bool        `json:"isActive"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"-"`
	Equipment   []Equipment `json:"equipment,omitempty"`
}

type Booking struct {
	ID            uuid.UUID      `json:"id"`
	UserID        uuid.UUID      `json:"userId"`
	RoomID        uuid.UUID      `json:"roomId"`
	RoomName      string         `json:"roomName"`
	Title         string         `json:"title"`
	Purpose       BookingPurpose `json:"purpose"`
	BookingDate   string         `json:"bookingDate"`
	StartTime     string         `json:"startTime"`
	EndTime       string         `json:"endTime"`
	AttendeeCount *int           `json:"attendeeCount"`
	Status        BookingStatus  `json:"status"`
	AdminID       *uuid.UUID     `json:"adminId,omitempty"`
	StatusReason  *string        `json:"statusReason,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type RoomAvailability struct {
	IsAvailable        bool    `json:"isAvailable"`
	Label              string  `json:"label"`
	AvailableTimeRange *string `json:"availableTimeRange"`
}

type RoomCard struct {
	ID           uuid.UUID        `json:"id"`
	Name         string           `json:"name"`
	RoomType     RoomType         `json:"roomType"`
	Capacity     int              `json:"capacity"`
	Building     string           `json:"building"`
	Floor        int              `json:"floor"`
	Equipment    []Equipment      `json:"equipment"`
	Availability RoomAvailability `json:"availability"`
}

type TimeSlotStatus string

const (
	SlotAvailable    TimeSlotStatus = "available"
	SlotOccupied     TimeSlotStatus = "occupied"
	SlotPending      TimeSlotStatus = "pending"
	SlotYours        TimeSlotStatus = "yours"
	SlotYoursPending TimeSlotStatus = "yours_pending"
)

type TimeSlotBooking struct {
	ID     uuid.UUID `json:"id"`
	Title  string    `json:"title"`
	UserID uuid.UUID `json:"userId"`
}

type TimeSlot struct {
	StartTime string           `json:"startTime"`
	EndTime   string           `json:"endTime"`
	Status    TimeSlotStatus   `json:"status"`
	Booking   *TimeSlotBooking `json:"booking"`
}

type UserBookingSummary struct {
	ID        uuid.UUID     `json:"id"`
	Title     string        `json:"title"`
	StartTime string        `json:"startTime"`
	EndTime   string        `json:"endTime"`
	Status    BookingStatus `json:"status"`
}

type RoomDetail struct {
	ID                uuid.UUID            `json:"id"`
	Name              string               `json:"name"`
	Description       *string              `json:"description"`
	RoomType          RoomType             `json:"roomType"`
	Capacity          int                  `json:"capacity"`
	Building          string               `json:"building"`
	Floor             int                  `json:"floor"`
	Photos            []string             `json:"photos"`
	OpenTime          string               `json:"openTime"`
	CloseTime         string               `json:"closeTime"`
	Equipment         []Equipment          `json:"equipment"`
	TimeSlots         []TimeSlot           `json:"timeSlots"`
	UserBookingsToday []UserBookingSummary `json:"userBookingsToday"`
}

type MyBooking struct {
	ID          uuid.UUID     `json:"id"`
	BookingID   string        `json:"bookingId"`
	RoomID      uuid.UUID     `json:"roomId"`
	RoomName    string        `json:"roomName"`
	Title       string        `json:"title"`
	BookingDate string        `json:"bookingDate"`
	StartTime   string        `json:"startTime"`
	EndTime     string        `json:"endTime"`
	Building    string        `json:"building"`
	Status      BookingStatus `json:"status"`
	CreatedAt   time.Time     `json:"createdAt"`
}

type AdminBookingUser struct {
	ID         uuid.UUID `json:"id"`
	FirstName  string    `json:"firstName"`
	LastName   string    `json:"lastName"`
	Initials   string    `json:"initials"`
	Department *string   `json:"department"`
}

type AdminBookingRoom struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Building string    `json:"building"`
}

type AdminPendingBooking struct {
	ID            uuid.UUID        `json:"id"`
	User          AdminBookingUser `json:"user"`
	Room          AdminBookingRoom `json:"room"`
	Title         string           `json:"title"`
	Purpose       BookingPurpose   `json:"purpose"`
	BookingDate   string           `json:"bookingDate"`
	StartTime     string           `json:"startTime"`
	EndTime       string           `json:"endTime"`
	AttendeeCount *int             `json:"attendeeCount"`
	Status        BookingStatus    `json:"status"`
	CreatedAt     time.Time        `json:"createdAt"`
}

type BookingStatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type PopularRoom struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Building string    `json:"building"`
	Count    int       `json:"count"`
}

type DayOfWeekCount struct {
	Day   string `json:"day"`
	Count int    `json:"count"`
}

type BuildingOccupancy struct {
	Building      string `json:"building"`
	OccupancyRate int    `json:"occupancyRate"`
}

type AdminStats struct {
	PendingCount        int                  `json:"pendingCount"`
	OccupancyRate       int                  `json:"occupancyRate"`
	TodayBookingsCount  int                  `json:"todayBookingsCount"`
	TotalRooms          int                  `json:"totalRooms"`
	TotalActiveRooms    int                  `json:"totalActiveRooms"`
	BookingsByStatus    []BookingStatusCount `json:"bookingsByStatus"`
	PopularRooms        []PopularRoom        `json:"popularRooms"`
	BookingsByDayOfWeek []DayOfWeekCount     `json:"bookingsByDayOfWeek"`
	OccupancyByBuilding []BuildingOccupancy  `json:"occupancyByBuilding"`
}

type AutoRejectedBooking struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"userId"`
	Title     string    `json:"title"`
	StartTime string    `json:"startTime"`
	EndTime   string    `json:"endTime"`
	Reason    string    `json:"reason"`
}
