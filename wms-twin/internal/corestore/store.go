package corestore

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/yecharlot/PrismaTec-Core/core/organism"
)

var ErrNotPrimary = errors.New("this node is not the authoritative primary for the WMS organism")

type Replicator interface{ SyncOrganism(organismID string) error }
type ReplicationError struct {
	OrganismID string
	Cause      error
}

func (e *ReplicationError) Error() string {
	return fmt.Sprintf("local commit saved but replication of %s is pending: %v", e.OrganismID, e.Cause)
}
func (e *ReplicationError) Unwrap() error { return e.Cause }

type Store struct {
	manager    *organism.Manager
	nodeID     string
	replicator Replicator
	mu         sync.Mutex
}
type Record struct {
	ID         string          `json:"id"`
	Kind       string          `json:"kind"`
	Data       json.RawMessage `json:"data"`
	ContentCID string          `json:"content_cid"`
	RootCID    string          `json:"root_cid"`
}

func New(manager *organism.Manager, nodeID string) *Store {
	return &Store{manager: manager, nodeID: nodeID}
}
func (s *Store) SetReplicator(r Replicator) { s.replicator = r }
func validPart(v string, upper bool) bool {
	if v == "" || len(v) > 96 {
		return false
	}
	for _, r := range v {
		letter := r >= 'a' && r <= 'z'
		if upper {
			letter = letter || (r >= 'A' && r <= 'Z')
		}
		if !letter && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}
func validKind(v string) bool        { return validPart(v, false) }
func validID(v string) bool          { return validPart(v, true) }
func orgName(kind, id string) string { return "wms." + kind + "." + id }
func (s *Store) getOrganism(kind, id string) (*organism.Organism, error) {
	if !validKind(kind) || !validID(id) {
		return nil, fmt.Errorf("invalid kind or id")
	}
	name := orgName(kind, id)
	org, err := s.manager.Get(name)
	if err != nil {
		if !strings.Contains(err.Error(), "organism not found") {
			return nil, err
		}
		org, err = s.manager.Create(organism.CreateOptions{Name: name, Capabilities: []organism.Capability{"memory.read", "memory.write"}, Policy: organism.Policy{Rules: map[string]bool{"memory.read": true, "memory.write": true}}})
		if err != nil {
			return nil, fmt.Errorf("create WMS organism %s: %w", name, err)
		}
	}
	if org.Placement.Primary == s.nodeID && org.Status != organism.StatusRunning {
		org, err = s.manager.Start(org.ID)
		if err != nil {
			return nil, err
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
	if !s.manager.IsLeader(org.ID) {
		return Record{}, ErrNotPrimary
	}
	org, err = s.manager.AppendEpisode(org.ID, "wms.record.upsert", map[string]any{"record_id": id, "kind": kind}, data)
	if err != nil {
		return Record{}, fmt.Errorf("persist record in PrismaTec: %w", err)
	}
	ep := org.Memory.Episodic[len(org.Memory.Episodic)-1]
	record := Record{ID: id, Kind: kind, Data: append(json.RawMessage(nil), data...), ContentCID: ep.ContentCID, RootCID: org.RootCID}
	if s.replicator != nil {
		if err := s.replicator.SyncOrganism(org.ID); err != nil {
			return record, &ReplicationError{OrganismID: org.ID, Cause: err}
		}
	}
	return record, nil
}
func (s *Store) Sync(kind, id string) error {
	if s.replicator == nil {
		return nil
	}
	if !validKind(kind) || !validID(id) {
		return fmt.Errorf("invalid kind or id")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	org, err := s.manager.Get(orgName(kind, id))
	if err != nil {
		return fmt.Errorf("record not found: %s/%s", kind, id)
	}
	if org.Placement.Primary == s.nodeID && org.Status != organism.StatusRunning {
		org, err = s.manager.Start(org.ID)
		if err != nil {
			return err
		}
	}
	if org.Placement.Primary != s.nodeID {
		return nil
	}
	if !s.manager.IsLeader(org.ID) {
		return ErrNotPrimary
	}
	if err := s.replicator.SyncOrganism(org.ID); err != nil {
		return &ReplicationError{OrganismID: org.ID, Cause: err}
	}
	return nil
}
func (s *Store) Delete(kind, id string) error {
	if !validKind(kind) || !validID(id) {
		return fmt.Errorf("invalid kind or id")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	org, err := s.manager.Get(orgName(kind, id))
	if err != nil {
		return fmt.Errorf("record not found: %s/%s", kind, id)
	}
	if org.Placement.Primary == s.nodeID && org.Status != organism.StatusRunning {
		org, err = s.manager.Start(org.ID)
		if err != nil {
			return err
		}
	}
	if !s.manager.IsLeader(org.ID) {
		return ErrNotPrimary
	}
	org, err = s.manager.AppendEpisode(org.ID, "wms.record.deleted", map[string]any{"record_id": id, "kind": kind}, nil)
	if err != nil {
		return err
	}
	if s.replicator != nil {
		if err := s.replicator.SyncOrganism(org.ID); err != nil {
			return &ReplicationError{OrganismID: org.ID, Cause: err}
		}
	}
	return nil
}
func (s *Store) Get(kind, id string) (Record, bool, error) {
	if !validKind(kind) || !validID(id) {
		return Record{}, false, fmt.Errorf("invalid kind or id")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	org, err := s.manager.Get(orgName(kind, id))
	if err != nil {
		if strings.Contains(err.Error(), "organism not found") {
			return Record{}, false, nil
		}
		return Record{}, false, err
	}
	return s.fromOrganism(kind, id, org)
}
func (s *Store) List(kind string) ([]Record, error) {
	if !validKind(kind) {
		return nil, fmt.Errorf("invalid kind")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prefix := "wms." + kind + "."
	out := make([]Record, 0)
	for _, org := range s.manager.List() {
		if !strings.HasPrefix(org.Name, prefix) {
			continue
		}
		id := strings.TrimPrefix(org.Name, prefix)
		rec, ok, err := s.fromOrganism(kind, id, org)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, rec)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		a, ea := strconv.ParseInt(out[i].ID, 10, 64)
		b, eb := strconv.ParseInt(out[j].ID, 10, 64)
		if ea == nil && eb == nil {
			return a < b
		}
		return out[i].ID < out[j].ID
	})
	return out, nil
}
func (s *Store) fromOrganism(kind, id string, org *organism.Organism) (Record, bool, error) {
	if len(org.Memory.Episodic) == 0 {
		return Record{}, false, nil
	}
	ep := org.Memory.Episodic[len(org.Memory.Episodic)-1]
	if ep.Type == "wms.record.deleted" {
		return Record{}, false, nil
	}
	if ep.Type != "wms.record.upsert" {
		return Record{}, false, nil
	}
	data, err := s.manager.GetBlock(ep.ContentCID)
	if err != nil {
		return Record{}, false, fmt.Errorf("read CID %s: %w", ep.ContentCID, err)
	}
	if !json.Valid(data) {
		return Record{}, false, fmt.Errorf("CID block for %s is not valid JSON", id)
	}
	return Record{ID: id, Kind: kind, Data: json.RawMessage(data), ContentCID: ep.ContentCID, RootCID: org.RootCID}, true, nil
}
