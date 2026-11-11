package wmsaudit

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core/audit"
)

const kind = "wms_audit_chain"

type Entry struct {
	Seq      int64          `json:"seq"`
	Time     time.Time      `json:"time"`
	Actor    string         `json:"actor"`
	Action   string         `json:"action"`
	Resource string         `json:"resource,omitempty"`
	OK       bool           `json:"ok"`
	Detail   string         `json:"detail,omitempty"`
	Meta     map[string]any `json:"meta,omitempty"`
	PrevHash string         `json:"prev_hash"`
	Hash     string         `json:"hash"`
}

type Service struct {
	store *corestore.Store
	core  *audit.Log
	mu    sync.Mutex
	last  string
	seq   int64
	verificationErr error
}

func New(store *corestore.Store, coreLog *audit.Log) *Service {
	s := &Service{store: store, core: coreLog}
	s.recoverTip()
	return s
}

func (s *Service) recoverTip() {
	s.verificationErr = s.verifyAndRecover()
}

func (s *Service) Verify() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.verifyAndRecover()
}

func (s *Service) verifyAndRecover() error {
	records, err := s.store.List(kind)
	if err != nil {
		return fmt.Errorf("list WMS audit chain: %w", err)
	}
	entries := make([]Entry, 0, len(records))
	for _, record := range records {
		var entry Entry
		if err := json.Unmarshal(record.Data, &entry); err != nil {
			return fmt.Errorf("decode audit entry %s: %w", record.ID, err)
		}
		entries = append(entries, entry)
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Seq < entries[j].Seq })
	var previous string
	for i, entry := range entries {
		expectedSeq := int64(i + 1)
		if entry.Seq != expectedSeq {
			return fmt.Errorf("audit chain sequence gap: expected %d, got %d", expectedSeq, entry.Seq)
		}
		if entry.PrevHash != previous {
			return fmt.Errorf("audit chain link mismatch at sequence %d", entry.Seq)
		}
		expectedHash := hashEntry(entry)
		if entry.Hash != expectedHash {
			return fmt.Errorf("audit entry hash mismatch at sequence %d", entry.Seq)
		}
		previous = entry.Hash
	}
	s.seq = int64(len(entries))
	s.last = previous
	return nil
}

func (s *Service) Record(actor, action, resource string, ok bool, detail string, meta map[string]any) (Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.verificationErr != nil {
		return Entry{}, fmt.Errorf("WMS audit chain is not writable until integrity is restored: %w", s.verificationErr)
	}
	nextSeq := s.seq + 1
	e := Entry{
		Seq: nextSeq, Time: time.Now().UTC(), Actor: actor, Action: action,
		Resource: resource, OK: ok, Detail: detail, Meta: meta, PrevHash: s.last,
	}
	e.Hash = hashEntry(e)
	data, err := json.Marshal(e)
	if err != nil {
		return e, err
	}
	if _, err := s.store.Put(kind, formatSeq(e.Seq), data); err != nil {
		return e, err
	}
	s.seq = nextSeq
	s.last = e.Hash
	if s.core != nil {
		s.core.Record(audit.Event{
			Type: "wms." + action, Actor: actor, Action: action, OK: ok, Detail: detail, Meta: meta,
		})
	}
	return e, nil
}

func (s *Service) Recent(n int) ([]Entry, error) {
	records, err := s.store.List(kind)
	if err != nil {
		return nil, err
	}
	out := make([]Entry, 0, len(records))
	for _, r := range records {
		var e Entry
		if json.Unmarshal(r.Data, &e) == nil {
			out = append(out, e)
		}
	}
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].Seq < out[i].Seq {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	if n > 0 && len(out) > n {
		out = out[len(out)-n:]
	}
	return out, nil
}

func hashEntry(e Entry) string {
	copy := e
	copy.Hash = ""
	raw, _ := json.Marshal(copy)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func formatSeq(seq int64) string {
	return hex.EncodeToString([]byte{
		byte(seq >> 56), byte(seq >> 48), byte(seq >> 40), byte(seq >> 32),
		byte(seq >> 24), byte(seq >> 16), byte(seq >> 8), byte(seq),
	})
}
