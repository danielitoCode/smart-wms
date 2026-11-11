// Package mesh provides Kademlia DHT and GossipSub on Core LibP2PTransport,
// with a clearly limited TTL fan-out fallback for non-libp2p transports.
package mesh

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p-kad-dht"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/yecharlot/PrismaTec-Core/network"
)

const (
	MsgGossip = "wms.gossip"
	MsgPing   = "wms.ping"
)

type Peer struct {
	NodeID   string    `json:"node_id"`
	Addr     string    `json:"addr,omitempty"`
	LastSeen time.Time `json:"last_seen"`
	Distance string    `json:"distance,omitempty"`
}

type GossipEnvelope struct {
	Topic     string          `json:"topic"`
	MessageID string          `json:"message_id"`
	Payload   json.RawMessage `json:"payload"`
	TTL       int             `json:"ttl"`
	Origin    string          `json:"origin"`
	SentAt    time.Time       `json:"sent_at"`
}

type Mesh struct {
	selfID    string
	transport network.Transport
	mu        sync.Mutex
	peers     map[string]Peer
	seen      map[string]time.Time
	handlers  map[string]func(GossipEnvelope)
	dht       *dht.IpfsDHT
	pubsub    *pubsub.PubSub
	topics    map[string]*pubsub.Topic
	subs      map[string]*pubsub.Subscription
	ctx       context.Context
	cancel    context.CancelFunc
	startErr  error
}

func New(selfID string, transport network.Transport) *Mesh {
	m := &Mesh{
		selfID: selfID, transport: transport,
		peers: make(map[string]Peer), seen: make(map[string]time.Time),
		handlers: make(map[string]func(GossipEnvelope)),
		topics:   make(map[string]*pubsub.Topic), subs: make(map[string]*pubsub.Subscription),
	}
	if transport != nil {
		transport.OnMessage(m.onMessage)
	}
	return m
}

func (m *Mesh) onMessage(msg network.Message) {
	switch msg.Type {
	case MsgPing:
		m.mu.Lock()
		m.peers[msg.From] = Peer{NodeID: msg.From, LastSeen: time.Now().UTC(), Distance: xorDistance(m.selfID, msg.From)}
		m.mu.Unlock()
	case MsgGossip:
		var env GossipEnvelope
		if err := json.Unmarshal(msg.Payload, &env); err != nil {
			return
		}
		m.handleGossip(env)
	}
}

func (m *Mesh) handleGossip(env GossipEnvelope) {
	m.mu.Lock()
	if _, ok := m.seen[env.MessageID]; ok {
		m.mu.Unlock()
		return
	}
	m.seen[env.MessageID] = time.Now().UTC()
	if len(m.seen) > 5000 {
		for id, t := range m.seen {
			if time.Since(t) > time.Hour {
				delete(m.seen, id)
			}
		}
	}
	h := m.handlers[env.Topic]
	m.mu.Unlock()
	if h != nil {
		h(env)
	}
	m.mu.Lock()
	hasGossipSub := m.pubsub != nil
	m.mu.Unlock()
	if env.TTL > 1 && m.transport != nil && !hasGossipSub {
		env.TTL--
		payload, _ := json.Marshal(env)
		_ = m.transport.Broadcast(context.Background(), network.Message{
			Type: MsgGossip, From: m.selfID, Payload: payload, SentAt: time.Now().UTC(),
		})
	}
}

func (m *Mesh) OnTopic(topic string, h func(GossipEnvelope)) {
	m.mu.Lock()
	m.handlers[topic] = h
	ready := m.pubsub != nil
	m.mu.Unlock()
	if ready {
		if err := m.subscribeTopic(topic); err != nil {
			m.mu.Lock()
			m.startErr = err
			m.mu.Unlock()
		}
	}
}

func (m *Mesh) Publish(topic string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(append([]byte(topic), raw...))
	env := GossipEnvelope{
		Topic: topic, MessageID: hex.EncodeToString(sum[:16]),
		Payload: raw, TTL: 3, Origin: m.selfID, SentAt: time.Now().UTC(),
	}
	m.handleGossip(env)
	body, _ := json.Marshal(env)
	m.mu.Lock()
	ps := m.pubsub
	ctx := m.ctx
	m.mu.Unlock()
	if ps != nil {
		pubTopic, err := m.joinTopic(topic)
		if err != nil {
			return err
		}
		if ctx == nil {
			ctx = context.Background()
		}
		return pubTopic.Publish(ctx, body)
	}
	if m.transport == nil {
		return nil
	}
	return m.transport.Broadcast(context.Background(), network.Message{
		Type: MsgGossip, From: m.selfID, Payload: body, SentAt: time.Now().UTC(),
	})
}

func (m *Mesh) UpsertPeer(nodeID, addr string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.peers[nodeID] = Peer{NodeID: nodeID, Addr: addr, LastSeen: time.Now().UTC(), Distance: xorDistance(m.selfID, nodeID)}
}

func (m *Mesh) Closest(target string, n int) []Peer {
	m.mu.Lock()
	defer m.mu.Unlock()
	list := make([]Peer, 0, len(m.peers))
	for _, p := range m.peers {
		p.Distance = xorDistance(target, p.NodeID)
		list = append(list, p)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Distance < list[j].Distance })
	if n > len(list) {
		n = len(list)
	}
	if n < 0 {
		n = 0
	}
	return list[:n]
}

func (m *Mesh) Peers() []Peer {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]Peer, 0, len(m.peers))
	for _, p := range m.peers {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].NodeID < out[j].NodeID })
	return out
}

func (m *Mesh) PingAll(ctx context.Context) {
	if m.transport == nil {
		return
	}
	_ = m.transport.Broadcast(ctx, network.Message{
		Type: MsgPing, From: m.selfID, Payload: []byte(`{}`), SentAt: time.Now().UTC(),
	})
}

func xorDistance(a, b string) string {
	ha := sha256.Sum256([]byte(a))
	hb := sha256.Sum256([]byte(b))
	var out [32]byte
	for i := 0; i < 32; i++ {
		out[i] = ha[i] ^ hb[i]
	}
	return hex.EncodeToString(out[:])
}
