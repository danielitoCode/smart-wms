package corestore

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/yecharlot/PrismaTec-Core/core/organism"
)

// Store persists WMS records through PrismaTec organisms and their native CID
// block store. It deliberately does not introduce SQL or a second database.
type Store struct {
	manager *organism.Manager
	mu      sync.Mutex
	ids     map[string]string
}

type Record struct {
	ID        string          `json:"id"`
	Kind      string          `json:"kind"`
	Data      json.RawMessage `json:"data"`
	ContentCID string         `json:"content_cid"`
}

func New(manager *organism.Manager) *Store {
	return &Store{manager: manager, ids: make(map[string]string)}
}

func validKind(kind string) bool {
	if kind == "" || len(kind) > 48 {
		return false
	}
	for _, r := range kind {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '-' {
			return false
		}
	}
	return true
}

func (s *Store) collection(kind string) (string, error) {
	if !validKind(kind) {
		return "", fmt.Errorf("invalid record kind")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if id := s.ids[kind]; id != "" {
		return id, nil
	}

	name := "wms-records-" + kind
	org, err := s.manager.Get(name)
	if err != nil {
		org, err = s.manager.Create(organism.CreateOptions{
			Name: name,
			Capabilities: []organism.Capability{"memory.read", "memory.write"},
			Policy: organism.Policy{Rules: map[string]bool{"memory.read": true, "memory.write": true}},
		})
		if err != nil {
			return "", fmt.Errorf("create collection organism %q: %w", kind, err)
		}
	}
	if org.Status != organism.StatusRunning {
		if _, err := s.manager.Start(org.ID); err != nil {
			return "", fmt.Errorf("start collection organism %q: %w", kind, err)
		}
	}
	s.ids[kind] = org.ID
	return org.ID, nil
}

func (s *Store) Put(kind, id string, data json.RawMessage) (Record, error) {
	if strings.TrimSpace(id) == "" {
		return Record{}, fmt.Errorf("record id is required")
	}
	if !json.Valid(data) {
		return Record{}, fmt.Errorf("record data must be valid JSON")
	}
	orgID, err := s.collection(kind)
	if err != nil {
		return Record{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	org, err := s.manager.AppendEpisode(orgID, "wms.record.upsert", map[string]any{
		"record_id": id, "kind": kind,
	}, data)
	if err != nil {
		return Record{}, fmt.Errorf("persist record in PrismaTec: %w", err)
	}
	episode := org.Memory.Episodic[len(org.Memory.Episodic)-1]
	return Record{ID: id, Kind: kind, Data: append(json.RawMessage(nil), data...), ContentCID: episode.ContentCID}, nil
}

func (s *Store) Delete(kind, id string) error {
	orgID, err := s.collection(kind)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err = s.manager.AppendEpisode(orgID, "wms.record.deleted", map[string]any{
		"record_id": id, "kind": kind,
	}, nil)
	if err != nil {
		return fmt.Errorf("persist deletion in PrismaTec: %w", err)
	}
	return nil
}

func (s *Store) Get(kind, id string) (Record, bool, error) {
	records, err := s.List(kind)
	if err != nil {
		return Record{}, false, err
	}
	for _, record := range records {
		if record.ID == id {
			return record, true, nil
		}
	}
	return Record{}, false, nil
}

func (s *Store) List(kind string) ([]Record, error) {
	orgID, err := s.collection(kind)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	org, err := s.manager.Get(orgID)
	if err != nil {
		return nil, err
	}

	latest := make(map[string]organism.Episode)
	for _, episode := range org.Memory.Episodic {
		if episode.Type != "wms.record.upsert" && episode.Type != "wms.record.deleted" {
			continue
		}
		id, _ := episode.Payload["record_id"].(string)
		if id != "" {
			latest[id] = episode
		}
	}

	ids := make([]string, 0, len(latest))
	for id, episode := range latest {
		if episode.Type == "wms.record.upsert" {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)

	out := make([]Record, 0, len(ids))
	for _, id := range ids {
		episode := latest[id]
		content, err := s.manager.GetBlock(episode.ContentCID)
		if err != nil {
			return nil, fmt.Errorf("read CID %s for record %s: %w", episode.ContentCID, id, err)
		}
		if !json.Valid(content) {
			return nil, fmt.Errorf("CID block for record %s is not valid JSON", id)
		}
		out = append(out, Record{ID: id, Kind: kind, Data: json.RawMessage(content), ContentCID: episode.ContentCID})
	}
	return out, nil
}
