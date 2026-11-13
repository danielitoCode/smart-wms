package testkit

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/yecharlot/PrismaTec-Core/core"
)

type Kit struct {
	Node   *core.Node
	Store  *corestore.Store
	Ledger *inventoryledger.Ledger
	Master *catalog.Repository
}

func New(t *testing.T) *Kit {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "feature-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	return &Kit{Node: node, Store: store, Ledger: ledger, Master: catalog.New(store, ledger)}
}

func (k *Kit) WarehouseZoneBinsItem(t *testing.T) (wh catalog.Warehouse, staging, pickable catalog.Bin, item catalog.Item) {
	t.Helper()
	var err error
	wh, err = k.Master.CreateWarehouse(catalog.WarehouseInput{WarehouseCode: "TW", WarehouseName: "Test WH"})
	if err != nil {
		t.Fatal(err)
	}
	zone, err := k.Master.CreateZone(catalog.ZoneInput{WarehouseID: wh.WarehouseID, ZoneCode: "Z1", ZoneName: "Z", ZoneType: "STORAGE"})
	if err != nil {
		t.Fatal(err)
	}
	staging, err = k.Master.CreateBin(catalog.BinInput{WarehouseID: wh.WarehouseID, ZoneID: zone.ZoneID, BinCode: "ST", BinBarcode: "ST1", BinType: "Staging"})
	if err != nil {
		t.Fatal(err)
	}
	pickable, err = k.Master.CreateBin(catalog.BinInput{WarehouseID: wh.WarehouseID, ZoneID: zone.ZoneID, BinCode: "PK", BinBarcode: "PK1", BinType: "Pickable"})
	if err != nil {
		t.Fatal(err)
	}
	item, err = k.Master.CreateItem(catalog.ItemInput{SKU: "SKU-1", ItemName: "Item 1"})
	if err != nil {
		t.Fatal(err)
	}
	return wh, staging, pickable, item
}
