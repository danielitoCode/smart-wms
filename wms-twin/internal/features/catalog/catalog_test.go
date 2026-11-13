package catalog

import (
	"errors"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func fixture(t *testing.T) (*Repository, *inventoryledger.Ledger) {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-catalog-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	return New(store, ledger), ledger
}

func TestWarehouseZoneBinLifecycleAndRelations(t *testing.T) {
	repo, _ := fixture(t)
	warehouse, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-01", WarehouseName: "Main"})
	if err != nil {
		t.Fatal(err)
	}
	zone, err := repo.CreateZone(ZoneInput{WarehouseID: warehouse.WarehouseID, ZoneCode: "ST-01", ZoneName: "Storage", ZoneType: "STORAGE"})
	if err != nil {
		t.Fatal(err)
	}
	bin, err := repo.CreateBin(BinInput{ZoneID: zone.ZoneID, WarehouseID: warehouse.WarehouseID, BinCode: "A-01", BinBarcode: "BC-01", BinType: "Pickable"})
	if err != nil {
		t.Fatal(err)
	}
	if bin.BinID <= 0 || bin.IsActive != true {
		t.Fatalf("unexpected bin: %#v", bin)
	}
	if err := repo.DeleteZone(zone.ZoneID); !errors.Is(err, ErrDependency) {
		t.Fatalf("zone with bin should be protected: %v", err)
	}
	if err := repo.DeleteWarehouse(warehouse.WarehouseID); !errors.Is(err, ErrDependency) {
		t.Fatalf("warehouse with zone should be protected: %v", err)
	}
	if err := repo.DeleteBin(bin.BinID); err != nil {
		t.Fatalf("delete empty bin: %v", err)
	}
	if err := repo.DeleteZone(zone.ZoneID); err != nil {
		t.Fatalf("delete empty zone: %v", err)
	}
	if err := repo.DeleteWarehouse(warehouse.WarehouseID); err != nil {
		t.Fatalf("delete empty warehouse: %v", err)
	}
}

func TestCatalogRejectsDuplicateCodesAndCrossWarehouseBin(t *testing.T) {
	repo, _ := fixture(t)
	first, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-A", WarehouseName: "A"})
	if err != nil {
		t.Fatal(err)
	}
	second, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-B", WarehouseName: "B"})
	if err != nil {
		t.Fatal(err)
	}
	zone, err := repo.CreateZone(ZoneInput{WarehouseID: first.WarehouseID, ZoneCode: "Z1", ZoneName: "Zone", ZoneType: "RECEIVING"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-A", WarehouseName: "Duplicate"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("expected duplicate warehouse: %v", err)
	}
	if _, err := repo.CreateZone(ZoneInput{WarehouseID: first.WarehouseID, ZoneCode: "Z1", ZoneName: "Duplicate", ZoneType: "STORAGE"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("expected duplicate zone: %v", err)
	}
	_, err = repo.CreateBin(BinInput{ZoneID: zone.ZoneID, WarehouseID: second.WarehouseID, BinCode: "B1", BinBarcode: "BC1", BinType: "Pickable"})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected cross-warehouse relation rejection: %v", err)
	}
	if _, err := repo.CreateZone(ZoneInput{WarehouseID: 999, ZoneCode: "Z2", ZoneName: "Orphan", ZoneType: "STORAGE"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected missing warehouse rejection: %v", err)
	}
}

func TestCatalogSequenceDoesNotReuseDeletedIDs(t *testing.T) {
	repo, _ := fixture(t)
	first, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-1", WarehouseName: "One"})
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.DeleteWarehouse(first.WarehouseID); err != nil {
		t.Fatal(err)
	}
	second, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-2", WarehouseName: "Two"})
	if err != nil {
		t.Fatal(err)
	}
	if second.WarehouseID <= first.WarehouseID {
		t.Fatalf("deleted ID was reused: first=%d second=%d", first.WarehouseID, second.WarehouseID)
	}
}

func TestBinDeleteRejectsRemainingStock(t *testing.T) {
	repo, ledger := fixture(t)
	warehouse, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-1", WarehouseName: "One"})
	if err != nil {
		t.Fatal(err)
	}
	zone, err := repo.CreateZone(ZoneInput{WarehouseID: warehouse.WarehouseID, ZoneCode: "Z1", ZoneName: "Zone", ZoneType: "STORAGE"})
	if err != nil {
		t.Fatal(err)
	}
	bin, err := repo.CreateBin(BinInput{ZoneID: zone.ZoneID, WarehouseID: warehouse.WarehouseID, BinCode: "B1", BinBarcode: "BC1", BinType: "Pickable"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = ledger.Adjust(inventoryledger.AdjustCommand{OperationID: "seed-stock", WarehouseID: warehouse.WarehouseID, BinID: bin.BinID, ItemID: 1, Delta: 3})
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.DeleteBin(bin.BinID); !errors.Is(err, ErrDependency) {
		t.Fatalf("bin with stock should be protected: %v", err)
	}
}
