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

type ParticipantType string

const (
	ParticipantTypeStudent ParticipantType = "student"
	ParticipantTypeTeacher ParticipantType = "teacher"
)

type TeacherRank string

const (
	TeacherRankAssistant          TeacherRank = "assistant"
	TeacherRankJuniorLecturer     TeacherRank = "junior_lecturer"
	TeacherRankLecturer           TeacherRank = "lecturer"
	TeacherRankSeniorLecturer     TeacherRank = "senior_lecturer"
	TeacherRankAssociateProfessor TeacherRank = "associate_professor"
	TeacherRankProfessor          TeacherRank = "professor"
	TeacherRankHeadOfDepartment   TeacherRank = "head_of_department"
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
	ID              uuid.UUID        `json:"id"`
	Email           string           `json:"email"`
	PasswordHash    string           `json:"-"`
	FirstName       string           `json:"firstName"`
	LastName        string           `json:"lastName"`
	Department      *string          `json:"department"`
	Role            UserRole         `json:"role"`
	ParticipantType *ParticipantType `json:"participantType"`
	TeacherRank     *TeacherRank     `json:"teacherRank"`
	CreatedAt       time.Time        `json:"createdAt"`
	UpdatedAt       time.Time        `json:"-"`
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
	ID        uuid.UUID `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	LabelRu   string    `json:"labelRu,omitempty"`
	LabelEn   string    `json:"labelEn,omitempty"`
	Icon      string    `json:"icon"`
	IsActive  bool      `json:"isActive"`
	SortOrder int       `json:"sortOrder,omitempty"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}

type EquipmentUsageRoom struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type EquipmentDeleteResult struct {
	Equipment   Equipment            `json:"equipment"`
	UsedInRooms []EquipmentUsageRoom `json:"usedInRooms"`
}

type BuildingOption struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

type RoomTypeOption struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

type AdminBuilding struct {
	Code      string    `json:"code"`
	LabelRu   string    `json:"labelRu"`
	LabelEn   string    `json:"labelEn"`
	IsActive  bool      `json:"isActive"`
	SortOrder int       `json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type AdminRoomType struct {
	Code      string    `json:"code"`
	LabelRu   string    `json:"labelRu"`
	LabelEn   string    `json:"labelEn"`
	IsActive  bool      `json:"isActive"`
	SortOrder int       `json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type BookingPurposeOption struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

type AdminBookingPurpose struct {
	Code      string    `json:"code"`
	LabelRu   string    `json:"labelRu"`
	LabelEn   string    `json:"labelEn"`
	IsActive  bool      `json:"isActive"`
	SortOrder int       `json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Room struct {
	ID            uuid.UUID   `json:"id"`
	Name          string      `json:"name"`
	Description   *string     `json:"description"`
	RoomType      RoomType    `json:"roomType"`
	RoomTypeLabel string      `json:"roomTypeLabel"`
	Capacity      int         `json:"capacity"`
	Building      string      `json:"building"`
	BuildingLabel string      `json:"buildingLabel"`
	Floor         int         `json:"floor"`
	Photos        []string    `json:"photos"`
	OpenTime      string      `json:"openTime"`
	CloseTime     string      `json:"closeTime"`
	IsActive      bool        `json:"isActive"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"-"`
	Equipment     []Equipment `json:"equipment,omitempty"`
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
	ID            uuid.UUID        `json:"id"`
	Name          string           `json:"name"`
	Description   *string          `json:"description"`
	RoomType      RoomType         `json:"roomType"`
	RoomTypeLabel string           `json:"roomTypeLabel"`
	Capacity      int              `json:"capacity"`
	Building      string           `json:"building"`
	BuildingLabel string           `json:"buildingLabel"`
	Floor         int              `json:"floor"`
	Photos        []string         `json:"photos"`
	Equipment     []Equipment      `json:"equipment"`
	Availability  RoomAvailability `json:"availability"`
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
	ID     uuid.UUID        `json:"id"`
	Title  string           `json:"title"`
	UserID uuid.UUID        `json:"userId"`
	User   *BookingUserInfo `json:"user,omitempty"`
}

type BookingUserInfo struct {
	ID              uuid.UUID        `json:"id"`
	FirstName       string           `json:"firstName"`
	LastName        string           `json:"lastName"`
	Email           string           `json:"email"`
	Department      *string          `json:"department"`
	ParticipantType *ParticipantType `json:"participantType"`
	TeacherRank     *TeacherRank     `json:"teacherRank"`
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
	RoomTypeLabel     string               `json:"roomTypeLabel"`
	Capacity          int                  `json:"capacity"`
	Building          string               `json:"building"`
	BuildingLabel     string               `json:"buildingLabel"`
	Floor             int                  `json:"floor"`
	Photos            []string             `json:"photos"`
	OpenTime          string               `json:"openTime"`
	CloseTime         string               `json:"closeTime"`
	Equipment         []Equipment          `json:"equipment"`
	TimeSlots         []TimeSlot           `json:"timeSlots"`
	UserBookingsToday []UserBookingSummary `json:"userBookingsToday"`
}

type MyBooking struct {
	ID            uuid.UUID      `json:"id"`
	BookingID     string         `json:"bookingId"`
	RoomID        uuid.UUID      `json:"roomId"`
	RoomName      string         `json:"roomName"`
	Title         string         `json:"title"`
	Purpose       BookingPurpose `json:"purpose"`
	PurposeLabel  string         `json:"purposeLabel"`
	BookingDate   string         `json:"bookingDate"`
	StartTime     string         `json:"startTime"`
	EndTime       string         `json:"endTime"`
	Building      string         `json:"building"`
	BuildingLabel string         `json:"buildingLabel"`
	Status        BookingStatus  `json:"status"`
	CreatedAt     time.Time      `json:"createdAt"`
}

type AdminBookingUser struct {
	ID              uuid.UUID        `json:"id"`
	FirstName       string           `json:"firstName"`
	LastName        string           `json:"lastName"`
	Initials        string           `json:"initials"`
	Email           string           `json:"email"`
	Department      *string          `json:"department"`
	ParticipantType *ParticipantType `json:"participantType"`
	TeacherRank     *TeacherRank     `json:"teacherRank"`
}

type RoomTimelineDay struct {
	Date     string            `json:"date"`
	Slots    []TimeSlot        `json:"slots"`
	Bookings []TimelineBooking `json:"bookings"`
}

type RoomTimeline struct {
	ID            uuid.UUID         `json:"id"`
	Name          string            `json:"name"`
	Description   *string           `json:"description"`
	RoomType      RoomType          `json:"roomType"`
	RoomTypeLabel string            `json:"roomTypeLabel"`
	Capacity      int               `json:"capacity"`
	Building      string            `json:"building"`
	BuildingLabel string            `json:"buildingLabel"`
	Floor         int               `json:"floor"`
	Photos        []string          `json:"photos"`
	OpenTime      string            `json:"openTime"`
	CloseTime     string            `json:"closeTime"`
	Equipment     []Equipment       `json:"equipment"`
	Slots         []TimeSlot        `json:"slots,omitempty"`
	Bookings      []TimelineBooking `json:"bookings,omitempty"`
	Days          []RoomTimelineDay `json:"days,omitempty"`
}

type TimelineBooking struct {
	ID          uuid.UUID        `json:"id"`
	UserID      uuid.UUID        `json:"userId"`
	Title       string           `json:"title"`
	Status      BookingStatus    `json:"status"`
	BookingDate string           `json:"bookingDate"`
	StartTime   string           `json:"startTime"`
	EndTime     string           `json:"endTime"`
	User        *BookingUserInfo `json:"user,omitempty"`
}

type TimelineMeta struct {
	Date       string  `json:"date"`
	Mode       string  `json:"mode"`
	EndDate    *string `json:"endDate,omitempty"`
	HasMore    bool    `json:"hasMore"`
	NextCursor *string `json:"nextCursor"`
}

type AdminBookingRoom struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Building      string    `json:"building"`
	BuildingLabel string    `json:"buildingLabel"`
}

type AdminPendingBooking struct {
	ID            uuid.UUID        `json:"id"`
	User          AdminBookingUser `json:"user"`
	Room          AdminBookingRoom `json:"room"`
	Title         string           `json:"title"`
	Purpose       BookingPurpose   `json:"purpose"`
	PurposeLabel  string           `json:"purposeLabel"`
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
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Building      string    `json:"building"`
	BuildingLabel string    `json:"buildingLabel"`
	Count         int       `json:"count"`
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
