package webhooks

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

const kind = "wms_webhook"

type Subscription struct {
	ID         string    `json:"id"`
	URL        string    `json:"url"`
	Secret     string    `json:"secret"`
	EventTypes []string  `json:"event_types"`
	Active     bool      `json:"active"`
	CreatedAt  time.Time `json:"created_at"`
}

type Service struct {
	store  *corestore.Store
	client *http.Client
	mu     sync.Mutex
	seq    int64
}

func New(store *corestore.Store) *Service {
	return &Service{store: store, client: &http.Client{Timeout: 8 * time.Second}}
}

func (s *Service) Create(url, secret string, types []string) (Subscription, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	id := "wh_" + formatN(s.seq)
	sub := Subscription{ID: id, URL: url, Secret: secret, EventTypes: types, Active: true, CreatedAt: time.Now().UTC()}
	data, _ := json.Marshal(sub)
	_, err := s.store.Put(kind, id, data)
	return sub, err
}

func (s *Service) List() ([]Subscription, error) {
	records, err := s.store.List(kind)
	if err != nil {
		return nil, err
	}
	out := make([]Subscription, 0, len(records))
	for _, r := range records {
		var sub Subscription
		if json.Unmarshal(r.Data, &sub) == nil {
			sub.Secret = ""
			out = append(out, sub)
		}
	}
	return out, nil
}

func (s *Service) Deliver(eventType string, payload any) {
	records, err := s.store.List(kind)
	if err != nil {
		return
	}
	body, _ := json.Marshal(map[string]any{"event_type": eventType, "payload": payload, "ts": time.Now().UTC()})
	for _, r := range records {
		var sub Subscription
		if json.Unmarshal(r.Data, &sub) != nil || !sub.Active {
			continue
		}
		if !matches(sub.EventTypes, eventType) {
			continue
		}
		go s.post(sub, body)
	}
}

func (s *Service) post(sub Subscription, body []byte) {
	req, err := http.NewRequest(http.MethodPost, sub.URL, bytes.NewReader(body))
	if err != nil {
		return
	}
	mac := hmac.New(sha256.New, []byte(sub.Secret))
	mac.Write(body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-WMS-Signature", hex.EncodeToString(mac.Sum(nil)))
	resp, err := s.client.Do(req)
	if err != nil {
		return
	}
	_ = resp.Body.Close()
}

func matches(types []string, eventType string) bool {
	if len(types) == 0 {
		return true
	}
	for _, t := range types {
		if t == "*" || t == eventType {
			return true
		}
	}
	return false
}

func formatN(n int64) string {
	const d = "0123456789abcdef"
	var b [16]byte
	i := 16
	for n > 0 {
		i--
		b[i] = d[n&15]
		n >>= 4
	}
	if i == 16 {
		return "0"
	}
	return string(b[i:])
}
