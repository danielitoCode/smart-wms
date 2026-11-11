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
