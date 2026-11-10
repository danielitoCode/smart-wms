package replication

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/yecharlot/PrismaTec-Core/core"
	"github.com/yecharlot/PrismaTec-Core/network"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

func TestAuthenticatedReplicationTransfersCIDAndFencesReplicaWrites(t *testing.T) {
	a, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-primary"})
	if err != nil { t.Fatal(err) }
	b, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-replica"})
	if err != nil { t.Fatal(err) }

	fabric := network.NewFabric()
	ta := network.NewLocalTransport(string(a.ID()), fabric)
	tb := network.NewLocalTransport(string(b.ID()), fabric)
	if err := ta.Listen(context.Background()); err != nil { t.Fatal(err) }
	if err := tb.Listen(context.Background()); err != nil { t.Fatal(err) }

	ra, err := New(a, ta, map[string]string{string(b.ID()): "local"})
	if err != nil { t.Fatal(err) }
	rb, err := New(b, tb, map[string]string{string(a.ID()): "local"})
	if err != nil { t.Fatal(err) }

	sa := corestore.New(a.Organisms(), string(a.ID()))
	sa.SetReplicator(ra)
	sb := corestore.New(b.Organisms(), string(b.ID()))
	sb.SetReplicator(rb)

	input := json.RawMessage(`{"warehouse_code":"WH-01","warehouse_name":"Main"}`)
	created, err := sa.Put("warehouse", "101", input)
	if err != nil { t.Fatal(err) }

	got, ok, err := sb.Get("warehouse", "101")
	if err != nil { t.Fatal(err) }
	if !ok || string(got.Data) != string(input) { t.Fatalf("replica data mismatch: %#v", got) }
	if got.ContentCID != created.ContentCID || got.RootCID != created.RootCID { t.Fatal("CID or RootCID changed") }
	if !b.Organisms().Blocks().Has(created.ContentCID) { t.Fatal("replica lacks CID block") }

	_, err = sb.Put("warehouse", "101", json.RawMessage(`{"warehouse_name":"illegal"}`))
	if err != corestore.ErrNotPrimary { t.Fatalf("expected fenced write, got %v", err) }

	if err := sa.Delete("warehouse", "101"); err != nil { t.Fatal(err) }
	if _, ok, err := sb.Get("warehouse", "101"); err != nil { t.Fatal(err) } else if ok { t.Fatal("tombstone not replicated") }
}
