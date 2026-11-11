package mesh

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p-kad-dht"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
)

// hostProvider is implemented by PrismaTec-Core's LibP2PTransport. Keeping
// this optional preserves TCP and in-process transports for local tests.
type hostProvider interface { Host() host.Host }

// Start activates the real Kademlia DHT and libp2p GossipSub when the Core
// transport is backed by a libp2p host. Other transports retain the local
// TTL fan-out adapter and are explicitly not advertised as Kademlia/GossipSub.
func (m *Mesh) Start(parent context.Context) error {
	provider, ok := m.transport.(hostProvider)
	if !ok { return nil }
	ctx, cancel := context.WithCancel(parent)
	host := provider.Host()
	routing, err := dht.New(ctx, host, dht.Mode(dht.ModeServer))
	if err != nil { cancel(); return fmt.Errorf("start Kademlia DHT: %w", err) }
	if err := routing.Bootstrap(ctx); err != nil {
		_ = routing.Close()
		cancel()
		return fmt.Errorf("bootstrap Kademlia DHT: %w", err)
	}
	ps, err := pubsub.NewGossipSub(ctx, host)
	if err != nil {
		_ = routing.Close()
		cancel()
		return fmt.Errorf("start GossipSub: %w", err)
	}
	m.mu.Lock()
	if m.cancel != nil { m.cancel() }
	m.ctx, m.cancel, m.dht, m.pubsub = ctx, cancel, routing, ps
	topics := make([]string, 0, len(m.handlers))
	for topic := range m.handlers { topics = append(topics, topic) }
	m.mu.Unlock()
	for _, topic := range topics {
		if err := m.subscribeTopic(topic); err != nil { return err }
	}
	go func() { <-ctx.Done(); _ = routing.Close() }()
	return nil
}

func (m *Mesh) joinTopic(name string) (*pubsub.Topic, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if topic := m.topics[name]; topic != nil { return topic, nil }
	if m.pubsub == nil { return nil, fmt.Errorf("GossipSub is not started") }
	topic, err := m.pubsub.Join(name)
	if err != nil { return nil, err }
	m.topics[name] = topic
	return topic, nil
}

func (m *Mesh) subscribeTopic(name string) error {
	topic, err := m.joinTopic(name)
	if err != nil { return err }
	m.mu.Lock()
	if m.subs[name] != nil { m.mu.Unlock(); return nil }
	ctx := m.ctx
	m.mu.Unlock()
	if ctx == nil { return fmt.Errorf("mesh context is not started") }
	sub, err := topic.Subscribe()
	if err != nil { return err }
	m.mu.Lock()
	if existing := m.subs[name]; existing != nil {
		m.mu.Unlock()
		sub.Cancel()
		return nil
	}
	m.subs[name] = sub
	m.mu.Unlock()
	go func() {
		for {
			msg, err := sub.Next(ctx)
			if err != nil { return }
			var envelope GossipEnvelope
			if json.Unmarshal(msg.Data, &envelope) != nil || envelope.Topic != name || envelope.MessageID == "" { continue }
			m.mu.Lock()
			m.peers[msg.ReceivedFrom.String()] = Peer{
				NodeID: msg.ReceivedFrom.String(), LastSeen: time.Now().UTC(),
				Distance: xorDistance(m.selfID, msg.ReceivedFrom.String()),
			}
			m.mu.Unlock()
			m.handleGossip(envelope)
		}
	}()
	return nil
}

// FindClosestPeers performs an iterative Kademlia lookup through the DHT.
// It returns libp2p PeerIDs; these remain transport identities, not WMS
// NodeIDs or content RootCIDs.
func (m *Mesh) FindClosestPeers(ctx context.Context, target string) ([]Peer, error) {
	m.mu.Lock()
	routing := m.dht
	m.mu.Unlock()
	if routing == nil { return nil, fmt.Errorf("Kademlia DHT is not started on this transport") }
	ids, err := routing.GetClosestPeers(ctx, target)
	if err != nil { return nil, err }
	out := make([]Peer, 0, len(ids))
	for _, id := range ids {
		out = append(out, Peer{NodeID:id.String(), LastSeen:time.Now().UTC(), Distance:xorDistance(target,id.String())})
	}
	return out, nil
}

// ProvideCID announces content availability to the Kademlia provider
// subsystem. It does not transfer the content itself.
func (m *Mesh) ProvideCID(ctx context.Context, content cid.Cid) error {
	m.mu.Lock(); routing := m.dht; m.mu.Unlock()
	if routing == nil { return fmt.Errorf("Kademlia DHT is not started") }
	return routing.Provide(ctx, content, true)
}

// FindProviders returns peers that advertise the requested CID. Consumers
// must still verify the content hash and authorization before accepting data.
func (m *Mesh) FindProviders(ctx context.Context, content cid.Cid, limit int) ([]peer.AddrInfo, error) {
	m.mu.Lock(); routing := m.dht; m.mu.Unlock()
	if routing == nil { return nil, fmt.Errorf("Kademlia DHT is not started") }
	if limit < 1 { limit = 5 }
	out := make([]peer.AddrInfo, 0, limit)
	for info := range routing.FindProvidersAsync(ctx, content, limit) { out = append(out, info) }
	return out, nil
}

func (m *Mesh) KademliaReady() bool { m.mu.Lock(); defer m.mu.Unlock(); return m.dht != nil }
func (m *Mesh) GossipSubReady() bool { m.mu.Lock(); defer m.mu.Unlock(); return m.pubsub != nil }

func (m *Mesh) Close() error {
	m.mu.Lock()
	cancel, routing := m.cancel, m.dht
	for _, sub := range m.subs { sub.Cancel() }
	for _, topic := range m.topics { _ = topic.Close() }
	m.subs = make(map[string]*pubsub.Subscription)
	m.topics = make(map[string]*pubsub.Topic)
	m.dht, m.pubsub, m.cancel, m.ctx = nil, nil, nil, nil
	m.mu.Unlock()
	if cancel != nil { cancel() }
	if routing != nil { return routing.Close() }
	return nil
}

var _ sync.Locker
