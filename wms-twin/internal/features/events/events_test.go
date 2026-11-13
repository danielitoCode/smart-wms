package events

import (
	"context"
	"testing"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/mesh"
	"github.com/yecharlot/PrismaTec-Core/core"
	"github.com/yecharlot/PrismaTec-Core/network"
)

func TestMeshEventIsPersistedOnRemotePeer(t *testing.T) {
	nodeA, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-events-a"})
	if err != nil {
		t.Fatal(err)
	}
	nodeB, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-events-b"})
	if err != nil {
		t.Fatal(err)
	}
	storeA := corestore.New(nodeA.Organisms(), string(nodeA.ID()))
	storeB := corestore.New(nodeB.Organisms(), string(nodeB.ID()))
	fabric := network.NewFabric()
	transportA := network.NewLocalTransport("events-a", fabric)
	transportB := network.NewLocalTransport("events-b", fabric)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := transportA.Listen(ctx); err != nil {
		t.Fatal(err)
	}
	if err := transportB.Listen(ctx); err != nil {
		t.Fatal(err)
	}
	meshA := mesh.New("events-a", transportA)
	meshB := mesh.New("events-b", transportB)
	serviceA := New(storeA, meshA)
	serviceB := New(storeB, meshB)
	remoteReceived := make(chan Event, 1)
	serviceB.OnRemote(func(event Event) { remoteReceived <- event })
	event, err := serviceA.Emit("inventory.adjusted", map[string]any{"warehouse_id": 1, "quantity": 3})
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if _, found, err := storeB.Get(kind, event.EventID); err == nil && found {
			select {
			case received := <-remoteReceived:
				if received.EventID != event.EventID {
					t.Fatalf("unexpected remote event: %+v", received)
				}
				return
			default:
			}
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("remote peer did not persist event %s", event.EventID)
}
