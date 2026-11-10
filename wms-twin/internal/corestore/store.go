package corestore

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/yecharlot/PrismaTec-Core/core/organism"
)

// Store maps each WMS aggregate to its own PrismaTec organism. Record versions
// are immutable CID blocks referenced by that organism's episodic memory.
type Store struct {
	manager *organism.Manager
	mu      sync.Mutex
}

type Record struct {
	ID         string          `json:"id"`
	Kind       string          `json:"kind"`
	Data       json.RawMessage `json:"data"`
	ContentCID string          `json:"content_cid"`
	RootCID    string          `json:"root_cid"`
}

func New(manager *organism.Manager) *Store {
	return &Store{manager: manager}
}

func validPart(value string, allowUpper bool) bool {
	if value == "" || len(value) > 96 {
		return false
	}
	for _, r := range value {
		letter := r >= 'a' && r <= 'z'
		if allowUpper {
			letter = letter || (r >= 'A' && r <= 'Z')
		}
		if !letter && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}

func validKind(kind string) bool { return validPart(kind, false) }
func validID(id string) bool     { return validPart(id, true) }

func organismName(kind, id string) string {
	return "wms." + kind + "." + id
}

func (s *Store) getOrganism(kind, id string) (*organism.Organism, error) {
	if !validKind(kind) {
		return nil, fmt.Errorf("invalid record kind")
	}
	if !validID(id) {
		return nil, fmt.Errorf("invalid record id")
	}

	name := organismName(kind, id)
	org, err := s.manager.Get(name)
	if err != nil {
		if !strings.Contains(err.Error(), "organism not found") {
			return nil, err
		}
		org, err = s.manager.Create(organism.CreateOptions{
			Name: name,
			Capabilities: []organism.Capability{
				"memory.read",
				"memory.write",
			},
			Policy: organism.Policy{
				Rules: map[string]bool{
					"memory.read":  true,
					"memory.write": true,
				},
			},
		})
		if err != nil {
			return nil, fmt.Errorf("create WMS organism %q: %w", name, err)
		}
	}

	if org.Status != organism.StatusRunning {
		org, err = s.manager.Start(org.ID)
		if err != nil {
			return nil, fmt.Errorf("start WMS organism %q: %w", name, err)
		}
	}
	return org, nil
}

func (s *Store) Put(kind, id string, data json.RawMessage) (Record, error) {
	if !json.Valid(data) {
		return Record{}, fmt.Errorf("record data must be valid JSON")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	org, err := s.getOrganism(kind, id)
	if err != nil {
		return Record{}, err
	}
	org, err = s.manager.AppendEpisode(org.ID, "wms.record.upsert", map[string]any{
		"record_id": id,
		"kind":      kind,
	}, data)
	if err != nil {
		return Record{}, fmt.Errorf("persist record in PrismaTec: %w", err)
	}
	episode := org.Memory.Episodic[len(org.Memory.Episodic)-1]
	return Record{
		ID: id, Kind: kind,
		Data:       append(json.RawMessage(nil), data...),
		ContentCID: episode.ContentCID,
		RootCID:    org.RootCID,
	}, nil
}

func (s *Store) Delete(kind, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	org, err := s.manager.Get(organismName(kind, id))
	if err != nil {
		return fmt.Errorf("record not found: %s/%s", kind, id)
	}
	_, err = s.manager.AppendEpisode(org.ID, "wms.record.deleted", map[string]any{
		"record_id": id,
		"kind":      kind,
	}, nil)
	if err != nil {
		return fmt.Errorf("persist deletion in PrismaTec: %w", err)
	}
	return nil
}

func (s *Store) Get(kind, id string) (Record, bool, error) {
	if !validKind(kind) || !validID(id) {
		return Record{}, false, fmt.Errorf("invalid record kind or id")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	org, err := s.manager.Get(organismName(kind, id))
	if err != nil {
		if strings.Contains(err.Error(), "organism not found") {
			return Record{}, false, nil
		}
		return Record{}, false, err
	}
	return s.recordFromOrganism(kind, id, org)
}

func (s *Store) List(kind string) ([]Record, error) {
	if !validKind(kind) {
		return nil, fmt.Errorf("invalid record kind")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	prefix := "wms." + kind + "."
	organisms := s.manager.List()
	out := make([]Record, 0)
	for _, org := range organisms {
		if !strings.HasPrefix(org.Name, prefix) {
			continue
		}
		id := strings.TrimPrefix(org.Name, prefix)
		record, ok, err := s.recordFromOrganism(kind, id, org)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, record)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		a, errA := strconv.ParseInt(out[i].ID, 10, 64)
		b, errB := strconv.ParseInt(out[j].ID, 10, 64)
		if errA == nil && errB == nil {
			return a < b
		}
		return out[i].ID < out[j].ID
	})
	return out, nil
}

func (s *Store) recordFromOrganism(kind, id string, org *organism.Organism) (Record, bool, error) {
	if len(org.Memory.Episodic) == 0 {
		return Record{}, false, nil
	}
	episode := org.Memory.Episodic[len(org.Memory.Episodic)-1]
	switch episode.Type {
	case "wms.record.deleted":
		return Record{}, false, nil
	case "wms.record.upsert":
		// continue
	default:
		return Record{}, false, nil
	}
	content, err := s.manager.GetBlock(episode.ContentCID)
	if err != nil {
		return Record{}, false, fmt.Errorf("read CID %s for record %s: %w", episode.ContentCID, id, err)
	}
	if !json.Valid(content) {
		return Record{}, false, fmt.Errorf("CID block for record %s is not valid JSON", id)
	}
	return Record{
		ID: id, Kind: kind,
		Data:       json.RawMessage(content),
		ContentCID: episode.ContentCID,
		RootCID:    org.RootCID,
	}, true, nil
}
