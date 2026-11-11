package mesh

import (
	"context"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/yecharlot/PrismaTec-Core/network"
)

type hostBackedTransport struct {
	network.Transport
	host host.Host
}
func (t hostBackedTransport) Host() host.Host { return t.host }

func TestLibP2PTransportStartsKademliaAndGossipSub(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(),10*time.Second)
	defer cancel()
	h, err := libp2p.New(libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"))
	if err != nil { t.Fatal(err) }
	defer h.Close()
	local := network.NewLocalTransport("mesh-host-test",network.NewFabric())
	service := New("mesh-host-test",hostBackedTransport{Transport:local,host:h})
	received := make(chan GossipEnvelope,1)
	service.OnTopic("wms.test",func(envelope GossipEnvelope){ received <- envelope })
	if err := service.Start(ctx); err != nil { t.Fatal(err) }
	if !service.KademliaReady() || !service.GossipSubReady() { t.Fatal("libp2p host did not activate both Kademlia and GossipSub") }
	if err := service.Publish("wms.test",map[string]any{"probe":"gossipsub"}); err != nil { t.Fatal(err) }
	select {
	case envelope := <-received:
		if envelope.Topic != "wms.test" { t.Fatalf("unexpected topic: %+v",envelope) }
	case <-ctx.Done():
		t.Fatal("mesh did not deliver local topic event")
	}
	if err := service.Close(); err != nil { t.Fatal(err) }
}

func TestCoreLibP2PTransportsExchangeGossipSubAcrossTwoNodes(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(),25*time.Second)
	defer cancel()
	a, err := network.NewLibP2PTransport(ctx,"wms-mesh-a","/ip4/127.0.0.1/tcp/0",nil)
	if err != nil { t.Fatal(err) }
	b, err := network.NewLibP2PTransport(ctx,"wms-mesh-b","/ip4/127.0.0.1/tcp/0",nil)
	if err != nil { _ = a.Close(); t.Fatal(err) }
	if err := a.Listen(ctx); err != nil { t.Fatal(err) }
	if err := b.Listen(ctx); err != nil { _ = a.Close(); t.Fatal(err) }
	defer a.Close()
	defer b.Close()
	if len(a.ListenAddrs())==0 || len(b.ListenAddrs())==0 { t.Fatal("libp2p transports did not expose listen multiaddrs") }
	if err := a.AddPeer("wms-mesh-b",b.ListenAddrs()[0]); err != nil { t.Fatal(err) }
	if err := b.AddPeer("wms-mesh-a",a.ListenAddrs()[0]); err != nil { t.Fatal(err) }
	meshA := New("wms-mesh-a",a)
	meshB := New("wms-mesh-b",b)
	received := make(chan GossipEnvelope,1)
	meshB.OnTopic("wms.integration",func(envelope GossipEnvelope){ received <- envelope })
	if err := meshA.Start(ctx); err != nil { t.Fatal(err) }
	if err := meshB.Start(ctx); err != nil { t.Fatal(err) }
	if !meshA.KademliaReady() || !meshA.GossipSubReady() || !meshB.KademliaReady() || !meshB.GossipSubReady() {
		t.Fatal("both PrismaTec-Core libp2p transports must activate Kademlia and GossipSub")
	}
	if err := meshA.Publish("wms.integration",map[string]any{"probe":"two-node"}); err != nil { t.Fatal(err) }
	select {
	case envelope := <-received:
		if envelope.Topic!="wms.integration" || envelope.Origin!="wms-mesh-a" { t.Fatalf("unexpected remote envelope: %+v",envelope) }
	case <-ctx.Done():
		t.Fatal("GossipSub message was not delivered to the second Core libp2p node")
	}
	_ = meshA.Close()
	_ = meshB.Close()
}
