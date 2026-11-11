package events

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/mesh"
)

const kind = "wms_event"

type Event struct {
	EventID   string         `json:"event_id"`
	Type      string         `json:"event_type"`
	Version   int            `json:"version"`
	Payload   map[string]any `json:"payload"`
	CreatedAt time.Time      `json:"created_at"`
	Acked     bool           `json:"acked"`
}

type Service struct {
	store *corestore.Store
	mesh  *mesh.Mesh
	mu    sync.Mutex
	seq   int64
}

func New(store *corestore.Store, m *mesh.Mesh) *Service {
	return &Service{store: store, mesh: m}
}

func (s *Service) Emit(eventType string, payload map[string]any) (Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	id := time.Now().UTC().Format("20060102T150405") + "-" + formatN(s.seq)
	ev := Event{EventID: id, Type: eventType, Version: 1, Payload: payload, CreatedAt: time.Now().UTC()}
	data, _ := json.Marshal(ev)
	if _, err := s.store.Put(kind, id, data); err != nil {
		return ev, err
	}
	if s.mesh != nil {
		_ = s.mesh.Publish("wms.events", ev)
	}
	return ev, nil
}

func (s *Service) List(limit int) ([]Event, error) {
	records, err := s.store.List(kind)
	if err != nil {
		return nil, err
	}
	out := make([]Event, 0, len(records))
	for _, r := range records {
		var e Event
		if json.Unmarshal(r.Data, &e) == nil {
			out = append(out, e)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[len(out)-limit:]
	}
	return out, nil
}

func (s *Service) Ack(eventID string) error {
	rec, ok, err := s.store.Get(kind, eventID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("event not found")
	}
	var e Event
	if err := json.Unmarshal(rec.Data, &e); err != nil {
		return err
	}
	e.Acked = true
	data, _ := json.Marshal(e)
	_, err = s.store.Put(kind, eventID, data)
	return err
}

func (s *Service) Types() []string {
	return []string{
		"inventory.adjusted", "order.shipped", "order.packed", "po.received",
		"pos.checkout", "pos.refund", "pos.dispatch", "dockd.ship",
		"rma.created", "rma.received", "rma.completed", "inbound.write",
	}
}

func formatN(n int64) string {
	const digits = "0123456789abcdef"
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := 16
	for n > 0 {
		i--
		b[i] = digits[n&15]
		n >>= 4
	}
	return string(b[i:])
}
