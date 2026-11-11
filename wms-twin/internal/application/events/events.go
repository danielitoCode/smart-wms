package events

import (
	"encoding/json"
	"fmt"
	"sync"
	"strings"
	"strconv"
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
	Published bool           `json:"published"`
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
	id := strconv.FormatInt(time.Now().UTC().UnixNano(), 10) + "-" + formatN(s.seq)
	ev := Event{EventID: id, Type: eventType, Version: 1, Payload: payload, CreatedAt: time.Now().UTC()}
	data, err := json.Marshal(ev)
	if err != nil {
		return ev, err
	}
	if _, err := s.store.Put(kind, id, data); err != nil {
		return ev, err
	}
	if s.mesh != nil {
		if err := s.mesh.Publish("wms.events", ev); err != nil {
			return ev, fmt.Errorf("event %s persisted but mesh publication is pending: %w", id, err)
		}
		ev.Published = true
		data, err = json.Marshal(ev)
		if err != nil {
			return ev, err
		}
		if _, err := s.store.Put(kind, id, data); err != nil {
			return ev, fmt.Errorf("event %s published but publication marker could not be persisted: %w", id, err)
		}
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


// PublishPending retries durable events whose mesh publication did not
// complete. It is safe to call repeatedly because message IDs are stable.
func (s *Service) PublishPending() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.mesh == nil {
		return nil
	}
	records, err := s.store.List(kind)
	if err != nil {
		return err
	}
	var failures []string
	for _, record := range records {
		var ev Event
		if err := json.Unmarshal(record.Data, &ev); err != nil {
			failures = append(failures, record.ID+": decode: "+err.Error())
			continue
		}
		if ev.Published {
			continue
		}
		if err := s.mesh.Publish("wms.events", ev); err != nil {
			failures = append(failures, ev.EventID+": "+err.Error())
			continue
		}
		ev.Published = true
		data, err := json.Marshal(ev)
		if err != nil {
			failures = append(failures, ev.EventID+": encode: "+err.Error())
			continue
		}
		if _, err := s.store.Put(kind, ev.EventID, data); err != nil {
			failures = append(failures, ev.EventID+": persist marker: "+err.Error())
		}
	}
	if len(failures) > 0 {
		return fmt.Errorf("some event publications remain pending: %s", strings.Join(failures, "; "))
	}
	return nil
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
