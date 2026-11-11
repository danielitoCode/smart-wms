package webhooks

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
	"strconv"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/base64"
	"io"
	"os"
	"sort"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

const kind = "wms_webhook"
const deliveryKind = "wms_webhook_delivery"
const maxDeliveryAttempts = 12

type Subscription struct {
	ID string `json:"id"`
	URL string `json:"url"`
	Secret string `json:"secret,omitempty"`
	SecretCipher string `json:"secret_cipher,omitempty"`
	EventTypes []string `json:"event_types"`
	Active bool `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

type Delivery struct {
	ID string `json:"id"`
	EventID string `json:"event_id"`
	SubscriptionID string `json:"subscription_id"`
	EventType string `json:"event_type"`
	Body json.RawMessage `json:"body"`
	Status string `json:"status"`
	Attempts int `json:"attempts"`
	NextAttemptAt time.Time `json:"next_attempt_at"`
	LastError string `json:"last_error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	DeliveredAt *time.Time `json:"delivered_at,omitempty"`
}

type Service struct {
	store  *corestore.Store
	client *http.Client
	mu     sync.Mutex
	seq    int64
}

func New(store *corestore.Store) *Service {
	transport := &http.Transport{
		Proxy: nil,
		TLSHandshakeTimeout: 5 * time.Second,
		ResponseHeaderTimeout: 5 * time.Second,
		DialContext: safeDialContext,
	}
	service := &Service{
		store: store,
		client: &http.Client{
			Transport: transport,
			Timeout: 8 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
	if records, err := store.List(kind); err == nil {
		for _, record := range records {
			if id, err := strconv.ParseInt(strings.TrimPrefix(record.ID, "wh_"), 16, 64); err == nil && id > service.seq {
				service.seq = id
			}
		}
	}
	return service
}

func (s *Service) Create(rawURL, secret string, types []string) (Subscription, error) {
	if err := validateSubscription(rawURL, secret, types); err != nil { return Subscription{}, err }
	encrypted, err := encryptSecret(secret)
	if err != nil { return Subscription{}, err }
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	id := "wh_" + formatN(s.seq)
	sub := Subscription{ID:id, URL:rawURL, SecretCipher:encrypted, EventTypes:append([]string(nil), types...), Active:true, CreatedAt:time.Now().UTC()}
	data, err := json.Marshal(sub)
	if err != nil { return Subscription{}, err }
	if _, err := s.store.Put(kind, id, data); err != nil { return Subscription{}, err }
	return sub, nil
}

func (s *Service) List() ([]Subscription, error) {
	records, err := s.store.List(kind)
	if err != nil { return nil, err }
	out := make([]Subscription, 0, len(records))
	for _, record := range records {
		var sub Subscription
		if err := json.Unmarshal(record.Data, &sub); err != nil { return nil, err }
		sub.Secret, sub.SecretCipher = "", ""
		out = append(out, sub)
	}
	return out, nil
}

// DeliverEvent writes one durable outbox row per matching subscription. The
// eventID is stable across caller retries, so duplicate enqueue requests do
// not create duplicate deliveries.
func (s *Service) DeliverEvent(eventID, eventType string, payload any) error {
	if strings.TrimSpace(eventID) == "" || strings.TrimSpace(eventType) == "" { return fmt.Errorf("event id and type are required") }
	body, err := json.Marshal(map[string]any{"event_id":eventID,"event_type":eventType,"payload":payload,"ts":time.Now().UTC()})
	if err != nil { return err }
	records, err := s.store.List(kind)
	if err != nil { return err }
	for _, record := range records {
		var sub Subscription
		if err := json.Unmarshal(record.Data, &sub); err != nil { return err }
		if !sub.Active || !matches(sub.EventTypes, eventType) { continue }
		idHash := sha256.Sum256([]byte(sub.ID + ":" + eventID))
		id := hex.EncodeToString(idHash[:])
		if _, found, err := s.store.Get(deliveryKind, id); err != nil { return err } else if found { continue }
		delivery := Delivery{
			ID:id, EventID:eventID, SubscriptionID:sub.ID, EventType:eventType,
			Body:json.RawMessage(body), Status:"PENDING", NextAttemptAt:time.Now().UTC(),
			CreatedAt:time.Now().UTC(),
		}
		data, err := json.Marshal(delivery)
		if err != nil { return err }
		if _, err := s.store.Put(deliveryKind, id, data); err != nil { return err }
	}
	return nil
}

// Deliver remains as a compatibility adapter for older internal call sites.
// Callers that have a durable event identifier should use DeliverEvent.
func (s *Service) Deliver(eventType string, payload any) {
	raw, _ := json.Marshal(payload)
	sum := sha256.Sum256(append([]byte(eventType+":"), raw...))
	_ = s.DeliverEvent(hex.EncodeToString(sum[:]), eventType, payload)
}

func (s *Service) RetryDeadDelivery(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok, err := s.store.Get(deliveryKind, id)
	if err != nil { return err }
	if !ok { return fmt.Errorf("delivery not found") }
	var delivery Delivery
	if err := json.Unmarshal(record.Data, &delivery); err != nil { return err }
	if delivery.Status != "DEAD" { return fmt.Errorf("only dead-letter deliveries can be manually retried") }
	delivery.Status, delivery.Attempts, delivery.LastError = "RETRY", 0, ""
	delivery.NextAttemptAt = time.Now().UTC()
	return s.persistDelivery(delivery)
}

func (s *Service) Deliveries(limit int) ([]Delivery, error) {
	records, err := s.store.List(deliveryKind)
	if err != nil { return nil, err }
	out := make([]Delivery, 0, len(records))
	for _, record := range records {
		var delivery Delivery
		if err := json.Unmarshal(record.Data, &delivery); err != nil { return nil, err }
		out = append(out, delivery)
	}
	sort.Slice(out, func(i,j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && len(out) > limit { out = out[:limit] }
	return out, nil
}

// ProcessPending performs one bounded delivery pass. 2xx marks delivery;
// retryable network/429/5xx failures use capped exponential backoff; permanent
// 4xx responses and exhausted attempts move to the dead-letter state.
func (s *Service) ProcessPending(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Migrate legacy plaintext subscription secrets before processing any
	// delivery. New records are encrypted at creation time.
	subscriptions, err := s.store.List(kind)
	if err != nil { return err }
	var failures []string
	for _, record := range subscriptions {
		var sub Subscription
		if err := json.Unmarshal(record.Data, &sub); err != nil { failures = append(failures, record.ID+": "+err.Error()); continue }
		if sub.SecretCipher == "" && sub.Secret != "" {
			encrypted, err := encryptSecret(sub.Secret)
			if err != nil { failures = append(failures, record.ID+": secret migration: "+err.Error()); continue }
			sub.SecretCipher, sub.Secret = encrypted, ""
			data, err := json.Marshal(sub)
			if err == nil { _, err = s.store.Put(kind, sub.ID, data) }
			if err != nil { failures = append(failures, record.ID+": secret migration persist: "+err.Error()) }
		}
	}
	if len(failures) > 0 { return fmt.Errorf("webhook secret migration blocked dispatch: %s", strings.Join(failures, "; ")) }
	records, err := s.store.List(deliveryKind)
	if err != nil { return err }
	now := time.Now().UTC()
	for _, record := range records {
		var delivery Delivery
		if err := json.Unmarshal(record.Data, &delivery); err != nil { failures = append(failures, record.ID+": "+err.Error()); continue }
		if delivery.Status != "PENDING" && delivery.Status != "RETRY" { continue }
		if delivery.NextAttemptAt.After(now) { continue }
		subRec, ok, err := s.store.Get(kind, delivery.SubscriptionID)
		if err != nil { failures = append(failures, delivery.ID+": "+err.Error()); continue }
		if !ok { delivery.Status, delivery.LastError = "DEAD", "subscription no longer exists"; _ = s.persistDelivery(delivery); continue }
		var sub Subscription
		if err := json.Unmarshal(subRec.Data, &sub); err != nil { failures = append(failures, delivery.ID+": "+err.Error()); continue }
		if !sub.Active { delivery.Status, delivery.LastError = "DEAD", "subscription is inactive"; _ = s.persistDelivery(delivery); continue }
		secret, err := decryptSecret(sub.SecretCipher)
		if err != nil { delivery.Status, delivery.LastError = "DEAD", "webhook secret cannot be decrypted"; _ = s.persistDelivery(delivery); continue }
		status, sendErr := s.post(ctx, sub, secret, delivery.Body)
		delivery.Attempts++
		switch {
		case sendErr == nil && status >= 200 && status < 300:
			delivery.Status = "DELIVERED"; delivery.LastError = ""
			delivered := time.Now().UTC(); delivery.DeliveredAt = &delivered
		case sendErr == nil && ((status >= 400 && status < 500 && status != http.StatusTooManyRequests) || (status >= 300 && status < 400)):
			delivery.Status = "DEAD"; delivery.LastError = fmt.Sprintf("permanent webhook response: HTTP %d", status)
		default:
			if sendErr != nil { delivery.LastError = sendErr.Error() } else { delivery.LastError = fmt.Sprintf("webhook response: HTTP %d", status) }
			if delivery.Attempts >= maxDeliveryAttempts { delivery.Status = "DEAD" } else {
				delivery.Status = "RETRY"
				delay := time.Second * time.Duration(1<<minInt(delivery.Attempts, 12))
				if delay > time.Hour { delay = time.Hour }
				delivery.NextAttemptAt = time.Now().UTC().Add(delay)
			}
		}
		if err := s.persistDelivery(delivery); err != nil { failures = append(failures, delivery.ID+": persist: "+err.Error()) }
	}
	if len(failures) > 0 { return fmt.Errorf("webhook outbox pass had errors: %s", strings.Join(failures, "; ")) }
	return nil
}

func (s *Service) persistDelivery(delivery Delivery) error {
	data, err := json.Marshal(delivery)
	if err != nil { return err }
	_, err = s.store.Put(deliveryKind, delivery.ID, data)
	return err
}

func (s *Service) Run(ctx context.Context, interval time.Duration) {
	if interval <= 0 { interval = time.Second }
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done(): return
		case <-ticker.C: _ = s.ProcessPending(ctx)
		}
	}
}

func (s *Service) post(ctx context.Context, sub Subscription, secret string, body []byte) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.URL, bytes.NewReader(body))
	if err != nil { return 0, err }
	mac := hmac.New(sha256.New, []byte(secret)); mac.Write(body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-WMS-Signature", hex.EncodeToString(mac.Sum(nil)))
	resp, err := s.client.Do(req)
	if err != nil { return 0, err }
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	return resp.StatusCode, nil
}

func encryptSecret(secret string) (string, error) {
	key, err := webhookEncryptionKey()
	if err != nil { return "", err }
	block, err := aes.NewCipher(key); if err != nil { return "", err }
	gcm, err := cipher.NewGCM(block); if err != nil { return "", err }
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil { return "", err }
	sealed := gcm.Seal(nonce, nonce, []byte(secret), []byte("smart-wms-webhook-secret:v1"))
	return base64.RawStdEncoding.EncodeToString(sealed), nil
}

func decryptSecret(encoded string) (string, error) {
	key, err := webhookEncryptionKey(); if err != nil { return "", err }
	sealed, err := base64.RawStdEncoding.DecodeString(encoded); if err != nil { return "", err }
	block, err := aes.NewCipher(key); if err != nil { return "", err }
	gcm, err := cipher.NewGCM(block); if err != nil { return "", err }
	if len(sealed) < gcm.NonceSize()+gcm.Overhead() { return "", fmt.Errorf("encrypted webhook secret is truncated") }
	nonce, ciphertext := sealed[:gcm.NonceSize()], sealed[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, ciphertext, []byte("smart-wms-webhook-secret:v1"))
	if err != nil { return "", fmt.Errorf("decrypt webhook secret: %w", err) }
	return string(plain), nil
}

func webhookEncryptionKey() ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("SENTRY_ENCRYPTION_KEY"))
	if raw == "" { raw = strings.TrimSpace(os.Getenv("WMS_WEBHOOK_ENCRYPTION_KEY")) }
	if raw == "" { return nil, fmt.Errorf("SENTRY_ENCRYPTION_KEY or WMS_WEBHOOK_ENCRYPTION_KEY is required to encrypt webhook secrets") }
	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil { key, err = base64.RawStdEncoding.DecodeString(raw) }
	if err != nil || len(key) != 32 { return nil, fmt.Errorf("webhook encryption key must be base64-encoded 32 bytes") }
	return key, nil
}

func minInt(a,b int) int { if a < b { return a }; return b }

func validateSubscription(rawURL, secret string, eventTypes []string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil || parsed.Fragment != "" {
		return fmt.Errorf("webhook URL must be a valid HTTPS URL without userinfo or fragment")
	}
	host := strings.TrimSuffix(strings.ToLower(parsed.Hostname()), ".")
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal") {
		return fmt.Errorf("webhook URL host is not publicly routable")
	}
	if ip := net.ParseIP(host); ip != nil && (ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsMulticast()) {
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
