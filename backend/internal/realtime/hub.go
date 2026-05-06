package realtime

import (
	"sync"
	"time"
)

type Event struct {
	Type        string  `json:"type"`
	BookingID   string  `json:"bookingId,omitempty"`
	RoomID      string  `json:"roomId,omitempty"`
	RoomName    string  `json:"roomName,omitempty"`
	Title       string  `json:"title,omitempty"`
	Status      string  `json:"status,omitempty"`
	Reason      *string `json:"reason,omitempty"`
	BookingDate string  `json:"bookingDate,omitempty"`
	StartTime   string  `json:"startTime,omitempty"`
	EndTime     string  `json:"endTime,omitempty"`
	CreatedAt   string  `json:"createdAt,omitempty"`
}

const (
	EventBookingCreated      = "booking.created"
	EventBookingApproved     = "booking.approved"
	EventBookingRejected     = "booking.rejected"
	EventBookingCancelled    = "booking.cancelled"
	EventBookingAutoRejected = "booking.auto_rejected"
	EventPing                = "ping"
)

type Hub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan Event]struct{}
}

func NewHub() *Hub {
	return &Hub{subscribers: make(map[string]map[chan Event]struct{})}
}

func (h *Hub) Subscribe(userID string) (<-chan Event, func()) {
	ch := make(chan Event, 16)
	h.mu.Lock()
	if h.subscribers[userID] == nil {
		h.subscribers[userID] = make(map[chan Event]struct{})
	}
	h.subscribers[userID][ch] = struct{}{}
	h.mu.Unlock()

	unsubscribe := func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if subscribers := h.subscribers[userID]; subscribers != nil {
			delete(subscribers, ch)
			if len(subscribers) == 0 {
				delete(h.subscribers, userID)
			}
		}
		close(ch)
	}

	return ch, unsubscribe
}

func (h *Hub) SendToUser(userID string, event Event) {
	h.mu.RLock()
	channels := make([]chan Event, 0, len(h.subscribers[userID]))
	for ch := range h.subscribers[userID] {
		channels = append(channels, ch)
	}
	h.mu.RUnlock()

	for _, ch := range channels {
		select {
		case ch <- event:
		default:
		}
	}
}

func (h *Hub) Broadcast(userIDs []string, event Event) {
	for _, userID := range userIDs {
		h.SendToUser(userID, event)
	}
}

func PingEvent() Event {
	return Event{Type: EventPing, CreatedAt: time.Now().UTC().Format(time.RFC3339)}
}
