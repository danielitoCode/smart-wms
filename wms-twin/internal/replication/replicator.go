package replication

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/yecharlot/PrismaTec-Core/core"
	"github.com/yecharlot/PrismaTec-Core/core/identity"
	coreReplication "github.com/yecharlot/PrismaTec-Core/core/replication"
	"github.com/yecharlot/PrismaTec-Core/network"
	"github.com/yecharlot/PrismaTec-Core/storage/cid"
)

const (
	blockMessage = "wms.replication.block"
	snapshotMessage = "wms.replication.snapshot"
	ackMessage = "wms.replication.ack"
	maxBlockBytes = 1 << 20
	maxMessageAge = 5 * time.Minute
)

type envelope struct {
	NodeID string `json:"node_id"`
	Timestamp int64 `json:"timestamp"`
	Body json.RawMessage `json:"body"`
	Signature string `json:"signature"`
}
type blockBody struct { CID string `json:"cid"`; Data string `json:"data"` }
type snapshotBody struct { Snapshot coreReplication.Snapshot `json:"snapshot"` }
type ackBody struct { Kind string `json:"kind"`; Ref string `json:"ref"`; Error string `json:"error,omitempty"` }

// Replicator transfers CID blocks before signed organism snapshots because
// PrismaTec-Core's native snapshot does not include block bytes.
type Replicator struct {
	node *core.Node
	transport network.Transport
	allowed map[string]struct{}
	mu sync.Mutex
	pending map[string]chan error
	sendMu sync.Mutex
}

func New(node *core.Node, transport network.Transport, peers map[string]string) (*Replicator, error) {
	if node == nil || transport == nil || len(peers) == 0 {
		return nil, fmt.Errorf("node, transport and at least one peer are required")
	}
	allowed := make(map[string]struct{}, len(peers))
	for id := range peers {
		if id == "" || id == string(node.ID()) { return nil, fmt.Errorf("invalid or self peer NodeID %q", id) }
		allowed[id] = struct{}{}
	}
	r := &Replicator{node: node, transport: transport, allowed: allowed, pending: make(map[string]chan error)}
	transport.OnMessage(r.handle)
	return r, nil
}

func (r *Replicator) SyncOrganism(id string) error {
	manager := r.node.Organisms()
	if !manager.IsLeader(id) { return fmt.Errorf("node is not primary for organism %s", id) }
	peers := make([]string, 0, len(r.allowed))
	for peer := range r.allowed { peers = append(peers, peer) }
	if _, err := manager.SetReplicas(id, peers); err != nil { return err }
	org, err := manager.Get(id)
	if err != nil { return err }
	if !strings.HasPrefix(org.Name, "wms.") { return fmt.Errorf("refusing non-WMS organism %q", org.Name) }

	snapshot := coreReplication.Snapshot{Organism: *org, Primary: string(r.node.ID()), Replicas: peers, Version: org.Seq, UpdatedAt: time.Now().UTC()}
	snapshot.Organism.Placement.Primary = string(r.node.ID())
	snapshot.Organism.Placement.Replicas = append([]string(nil), peers...)
	blocks := make(map[string]struct{})
	for _, ep := range org.Memory.Episodic { if ep.ContentCID != "" { blocks[ep.ContentCID] = struct{}{} } }
	for peer := range r.allowed {
		for cidValue := range blocks {
			data, err := manager.GetBlock(cidValue)
			if err != nil { return fmt.Errorf("read block %s: %w", cidValue, err) }
			if len(data) > maxBlockBytes { return fmt.Errorf("block %s exceeds %d bytes", cidValue, maxBlockBytes) }
			body := blockBody{CID: cidValue, Data: base64.StdEncoding.EncodeToString(data)}
			if err := r.sendWait(peer, blockMessage, "block", cidValue, body); err != nil { return fmt.Errorf("send block %s to %s: %w", cidValue, peer, err) }
		}
		if err := r.sendWait(peer, snapshotMessage, "snapshot", id, snapshotBody{Snapshot: snapshot}); err != nil {
			return fmt.Errorf("send organism %s to %s: %w", id, peer, err)
		}
	}
	return nil
}

func (r *Replicator) sign(body any) ([]byte, error) {
	raw, err := json.Marshal(body); if err != nil { return nil, err }
	id, ts := string(r.node.ID()), time.Now().Unix()
	message := []byte(id + "\n" + fmt.Sprint(ts) + "\n" + string(raw))
	return json.Marshal(envelope{NodeID:id, Timestamp:ts, Body:raw, Signature:base64.StdEncoding.EncodeToString(r.node.Identity().Sign(message))})
}
func (r *Replicator) verify(msg network.Message) (json.RawMessage, error) {
	if _, ok := r.allowed[msg.From]; !ok { return nil, fmt.Errorf("peer is not allowlisted") }
	var env envelope
	if err := json.Unmarshal(msg.Payload, &env); err != nil { return nil, err }
	if env.NodeID != msg.From || len(env.Body) == 0 { return nil, fmt.Errorf("sender identity mismatch") }
	ts := time.Unix(env.Timestamp, 0)
	if time.Since(ts) > maxMessageAge || ts.After(time.Now().Add(maxMessageAge)) { return nil, fmt.Errorf("stale signed message") }
	pub, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(env.NodeID, "node:")); if err != nil { return nil, err }
	sig, err := base64.StdEncoding.DecodeString(env.Signature); if err != nil { return nil, err }
	message := []byte(env.NodeID + "\n" + fmt.Sprint(env.Timestamp) + "\n" + string(env.Body))
	if !identity.Verify(pub, message, sig) { return nil, fmt.Errorf("invalid Ed25519 signature") }
	return env.Body, nil
}
func (r *Replicator) sendWait(peer, msgType, kind, ref string, body any) error {
	key := peer + "|" + kind + "|" + ref
	ch := make(chan error, 1)
	r.mu.Lock()
	if _, exists := r.pending[key]; exists { r.mu.Unlock(); return fmt.Errorf("duplicate pending ACK %s", key) }
	r.pending[key] = ch
	r.mu.Unlock()
	defer func(){ r.mu.Lock(); delete(r.pending,key); r.mu.Unlock() }()
	payload, err := r.sign(body); if err != nil { return err }
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second); defer cancel()
	r.sendMu.Lock(); err = r.transport.Send(ctx, peer, network.Message{Type:msgType, Payload:payload}); r.sendMu.Unlock()
	if err != nil { return err }
	select { case err := <-ch: return err; case <-ctx.Done(): return fmt.Errorf("ACK timeout: %w",ctx.Err()) }
}
func (r *Replicator) ack(peer, kind, ref string, cause error) {
	body := ackBody{Kind:kind,Ref:ref}; if cause != nil { body.Error = cause.Error() }
	payload, err := r.sign(body); if err != nil { return }
	ctx,cancel := context.WithTimeout(context.Background(),5*time.Second); defer cancel()
	r.sendMu.Lock(); _ = r.transport.Send(ctx,peer,network.Message{Type:ackMessage,Payload:payload}); r.sendMu.Unlock()
}
func (r *Replicator) handle(msg network.Message) {
	body, err := r.verify(msg); if err != nil { return }
	switch msg.Type {
	case ackMessage:
		var a ackBody; if json.Unmarshal(body,&a) != nil { return }
		r.mu.Lock(); ch := r.pending[msg.From+"|"+a.Kind+"|"+a.Ref]; r.mu.Unlock()
		if ch != nil { var ackErr error; if a.Error != "" { ackErr = errors.New(a.Error) }; select { case ch <- ackErr: default: } }
	case blockMessage:
		var b blockBody; if json.Unmarshal(body,&b) != nil { return }
		data, err := base64.StdEncoding.DecodeString(b.Data)
		if err == nil && len(data) > maxBlockBytes { err = fmt.Errorf("block exceeds %d bytes",maxBlockBytes) }
		if err == nil { err = r.putBlock(b.CID,data) }
		r.ack(msg.From,"block",b.CID,err)
	case snapshotMessage:
		var b snapshotBody; if json.Unmarshal(body,&b) != nil { return }
		err := r.adopt(msg.From,b.Snapshot)
		r.ack(msg.From,"snapshot",b.Snapshot.Organism.ID,err)
	}
}
func (r *Replicator) putBlock(expected string,data []byte) error {
	if expected==""||len(data)==0{return fmt.Errorf("CID and block data required")}
	blocks:=r.node.Organisms().Blocks()
	var actual string;var err error
	if strings.HasPrefix(expected,cid.Prefix){actual,err=blocks.Put(data)}else if ipfs,ok:=blocks.(interface{PutIPFS([]byte)(string,error)});ok{actual,err=ipfs.PutIPFS(data)}else{return fmt.Errorf("IPFS CIDv1 import unsupported by block store")}
	if err!=nil{return err};if actual!=expected{return fmt.Errorf("CID mismatch: expected %s, got %s",expected,actual)};return nil
}
func (r *Replicator) adopt(sender string,snap coreReplication.Snapshot) error {
	org:=snap.Organism
	if org.ID==""||org.RootCID==""||!strings.HasPrefix(org.Name,"wms."){return fmt.Errorf("invalid WMS organism snapshot")}
	if snap.Primary!=sender||org.Placement.Primary!=sender{return fmt.Errorf("snapshot primary differs from signed sender")}
	manager:=r.node.Organisms()
	if current,err:=manager.Get(org.ID);err==nil{
		if org.Placement.Epoch<current.Placement.Epoch{return fmt.Errorf("stale epoch %d",org.Placement.Epoch)}
		if org.Placement.Epoch==current.Placement.Epoch&&current.Placement.Primary!=""&&current.Placement.Primary!=sender{return fmt.Errorf("conflicting primary at same epoch")}
		if org.Placement.Epoch==current.Placement.Epoch&&org.Seq<current.Seq{return fmt.Errorf("stale organism sequence")}
	}
	for _,ep:=range org.Memory.Episodic{if ep.ContentCID!=""&&!manager.Blocks().Has(ep.ContentCID){return fmt.Errorf("snapshot references missing CID %s",ep.ContentCID)}}
	if _,err:=manager.Adopt(&org,false,"wms-authenticated-replication");err!=nil{return err}
	if service:=r.node.Replication();service!=nil{payload,_:=json.Marshal(snap);service.HandleMessage(network.Message{From:sender,Type:"organism.replicate",Payload:payload})}
	return nil
}
