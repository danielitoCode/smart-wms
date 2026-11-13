package snapshot

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
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

func TestRestoreSnapshotUsesExpectedVersionAndRestoresExactBalances(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-snapshot-restore-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store, ledger)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode: "SNAP-RESTORE", WarehouseName: "Snapshot Restore"})
	if err != nil {
		t.Fatal(err)
	}
	zone, err := cat.CreateZone(catalog.ZoneInput{WarehouseID: warehouse.WarehouseID, ZoneCode: "ST", ZoneName: "Storage", ZoneType: "STORAGE"})
	if err != nil {
		t.Fatal(err)
	}
	bin, err := cat.CreateBin(catalog.BinInput{ZoneID: zone.ZoneID, WarehouseID: warehouse.WarehouseID, BinCode: "ST-01", BinBarcode: "ST-01-BC", BinType: "Pickable"})
	if err != nil {
		t.Fatal(err)
	}
	item, err := cat.CreateItem(catalog.ItemInput{SKU: "SNAP-ITEM", ItemName: "Snapshot Item"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.Adjust(inventoryledger.AdjustCommand{OperationID: "seed-restore", WarehouseID: warehouse.WarehouseID, BinID: bin.BinID, ItemID: item.ItemID, Delta: 12}); err != nil {
		t.Fatal(err)
	}
	service := New(store, ledger, cat)
	snap, err := service.CreateInventory(warehouse.WarehouseID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.Adjust(inventoryledger.AdjustCommand{OperationID: "after-snapshot", WarehouseID: warehouse.WarehouseID, BinID: bin.BinID, ItemID: item.ItemID, Delta: -5}); err != nil {
		t.Fatal(err)
	}
	_, currentVersion, err := ledger.List()
	if err != nil {
		t.Fatal(err)
	}
	result, err := service.RestoreSafely(snap.ID, "restore-snapshot-1", currentVersion)
	if err != nil {
		t.Fatal(err)
	}
	if result.Result.Version != currentVersion+1 {
		t.Fatalf("unexpected restored ledger version: %+v", result)
	}
	if result.BackupSnapshotID == "" {
		t.Fatal("restore did not create a pre-restore backup snapshot")
	}
	backup, err := service.Get(result.BackupSnapshotID)
	if err != nil || len(backup.Rows) != 1 || backup.Rows[0].OnHand != 7 {
		t.Fatalf("pre-restore backup is incorrect: backup=%+v err=%v", backup, err)
	}
	balances, _, err := ledger.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(balances) != 1 || balances[0].OnHand != 12 {
		t.Fatalf("snapshot did not restore inventory: %+v", balances)
	}
	replay, err := service.RestoreSafely(snap.ID, "restore-snapshot-1", currentVersion)
	if err != nil || !replay.Replayed || replay.BackupSnapshotID != result.BackupSnapshotID {
		t.Fatalf("expected restore replay: result=%+v err=%v", replay, err)
	}
	if _, err := service.RestoreSafely(snap.ID, "restore-snapshot-stale", currentVersion); !errors.Is(err, inventoryledger.ErrVersionConflict) {
		t.Fatalf("expected stale restore to conflict, got %v", err)
	}
}
