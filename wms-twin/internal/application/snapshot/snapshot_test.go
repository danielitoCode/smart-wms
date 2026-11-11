package snapshot

import (
	"encoding/json"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestCreateAndVerifyInventorySnapshot(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-snapshot-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	if _, err := ledger.Adjust(inventoryledger.AdjustCommand{
		OperationID: "snapshot-seed", WarehouseID: 1, BinID: 1, ItemID: 1, Delta: 12,
	}); err != nil {
		t.Fatal(err)
	}

	service := New(store, ledger)
	created, err := service.CreateInventory(1)
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := service.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.SHA256 != created.SHA256 || loaded.Version != created.Version || len(loaded.Rows) != 1 {
		t.Fatalf("snapshot did not round-trip: created=%#v loaded=%#v", created, loaded)
	}

	loaded.Rows[0].OnHand = 999
	data, err := json.Marshal(loaded)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.Put(snapshotKind, loaded.ID, data); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Get(loaded.ID); err == nil {
		t.Fatal("tampered snapshot passed checksum verification")
	}
}
