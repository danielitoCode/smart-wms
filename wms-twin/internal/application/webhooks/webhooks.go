package webhooks

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
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
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		TLSHandshakeTimeout: 5 * time.Second,
		ResponseHeaderTimeout: 5 * time.Second,
		DialContext: safeDialContext,
	}
	return &Service{
		store: store,
		client: &http.Client{
			Transport: transport,
			Timeout: 8 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

func (s *Service) Create(url, secret string, types []string) (Subscription, error) {
	if err := validateSubscription(url, secret, types); err != nil {
		return Subscription{}, err
	}
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


func validateSubscription(rawURL, secret string, eventTypes []string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil || parsed.Fragment != "" {
		return fmt.Errorf("webhook URL must be a valid HTTPS URL without userinfo or fragment")
	}
	host := strings.TrimSuffix(strings.ToLower(parsed.Hostname()), ".")
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal") {
		return fmt.Errorf("webhook URL host is not publicly routable")
	}
	if len(secret) < 32 || len(secret) > 4096 {
		return fmt.Errorf("webhook secret must contain between 32 and 4096 bytes")
	}
	if len(eventTypes) > 100 {
		return fmt.Errorf("too many webhook event types")
	}
	for _, eventType := range eventTypes {
		if strings.TrimSpace(eventType) == "" || len(eventType) > 128 {
			return fmt.Errorf("invalid webhook event type")
		}
	}
	return nil
}

// safeDialContext resolves at connection time, rejects every non-public
// address in the answer set, and connects to the checked IP directly.
// This prevents a second DNS lookup from bypassing the SSRF decision.
func safeDialContext(ctx context.Context, networkName, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	var ips []net.IP
	if literal := net.ParseIP(host); literal != nil {
		ips = []net.IP{literal}
	} else {
		resolved, err := net.DefaultResolver.LookupIPAddr(ctx, host)
		if err != nil {
			return nil, fmt.Errorf("resolve webhook host: %w", err)
		}
		for _, item := range resolved {
			ips = append(ips, item.IP)
		}
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("webhook host resolved to no addresses")
	}
	for _, ip := range ips {
		if ip == nil || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() {
			return nil, fmt.Errorf("webhook host resolves to a non-public address")
		}
	}
	dialer := &net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}
	return dialer.DialContext(ctx, networkName, net.JoinHostPort(ips[0].String(), port))
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
