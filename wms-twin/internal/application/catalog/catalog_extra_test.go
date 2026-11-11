package catalog

import (
	"errors"
	"testing"
)

func TestItemsPreferredBinsAndVendorLifecycle(t *testing.T) {
	repo, _ := fixture(t)
	warehouse, err := repo.CreateWarehouse(WarehouseInput{WarehouseCode: "WH-X", WarehouseName: "Warehouse"})
	if err != nil {
		t.Fatal(err)
	}
	zone, err := repo.CreateZone(ZoneInput{WarehouseID: warehouse.WarehouseID, ZoneCode: "PICK", ZoneName: "Picking", ZoneType: "PICKING"})
	if err != nil {
		t.Fatal(err)
	}
	binA, err := repo.CreateBin(BinInput{ZoneID: zone.ZoneID, WarehouseID: warehouse.WarehouseID, BinCode: "A-01", BinBarcode: "BAR-A", BinType: "Pickable"})
	if err != nil {
		t.Fatal(err)
	}
	binB, err := repo.CreateBin(BinInput{ZoneID: zone.ZoneID, WarehouseID: warehouse.WarehouseID, BinCode: "A-02", BinBarcode: "BAR-B", BinType: "Pickable"})
	if err != nil {
		t.Fatal(err)
	}
	staging, err := repo.CreateBin(BinInput{ZoneID: zone.ZoneID, WarehouseID: warehouse.WarehouseID, BinCode: "ST-01", BinBarcode: "BAR-ST", BinType: "Staging"})
	if err != nil {
		t.Fatal(err)
	}
	weight := 2.5
	item, err := repo.CreateItem(ItemInput{SKU: "SKU-1", ItemName: "Widget", WeightLbs: &weight, DefaultBinID: &binA.BinID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := repo.CreateItem(ItemInput{SKU: "SKU-1", ItemName: "Duplicate"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("duplicate SKU accepted: %v", err)
	}
	if err := repo.CreatePreferredBin(PreferredBinInput{ItemID: item.ItemID, BinID: staging.BinID, Priority: 1}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("staging preferred bin accepted: %v", err)
	}
	if err := repo.CreatePreferredBin(PreferredBinInput{ItemID: item.ItemID, BinID: binA.BinID, Priority: 2}); err != nil {
		t.Fatal(err)
	}
	if err := repo.CreatePreferredBin(PreferredBinInput{ItemID: item.ItemID, BinID: binB.BinID, Priority: 1}); err != nil {
		t.Fatal(err)
	}
	rows, err := repo.ListPreferredBins()
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || rows[0].BinID != binB.BinID || rows[0].Priority != 1 || rows[1].BinID != binA.BinID || rows[1].Priority != 2 {
		t.Fatalf("preferred-bin hierarchy not resequenced: %#v", rows)
	}
	if err := repo.UpdatePreferredBin(rows[1].PreferredBinID, 1); err != nil {
		t.Fatal(err)
	}
	rows, err = repo.ListPreferredBins()
	if err != nil {
		t.Fatal(err)
	}
	if rows[0].Priority != 1 || rows[1].Priority != 2 {
		t.Fatalf("priority update did not produce strict sequence: %#v", rows)
	}
	if err := repo.DeleteBin(binA.BinID); !errors.Is(err, ErrDependency) {
		t.Fatalf("preferred bin mapping should protect bin: %v", err)
	}
	if err := repo.DeleteItem(item.ItemID); !errors.Is(err, ErrDependency) {
		t.Fatalf("preferred mapping should protect item: %v", err)
	}
	for _, row := range rows {
		if err := repo.DeletePreferredBin(row.PreferredBinID); err != nil {
			t.Fatal(err)
		}
	}
	archived, err := repo.ToggleItemArchive(item.ItemID)
	if err != nil || archived.IsActive {
		t.Fatalf("archive failed: %#v %v", archived, err)
	}
	restored, err := repo.ToggleItemArchive(item.ItemID)
	if err != nil || !restored.IsActive {
		t.Fatalf("restore failed: %#v %v", restored, err)
	}
	if err := repo.DeleteItem(item.ItemID); err != nil {
		t.Fatalf("delete item without inventory/history: %v", err)
	}

	vendor, err := repo.CreateVendor(VendorInput{VendorName: "Acme"})
	if err != nil {
		t.Fatal(err)
	}
	if len(vendor.CanonicalID) != 36 || vendor.ExternalID == "" || !vendor.IsActive {
		t.Fatalf("unexpected vendor: %#v", vendor)
	}
	name := "Acme Supply"
	updated, err := repo.UpdateVendor(vendor.CanonicalID, VendorPatch{VendorName: &name})
	if err != nil || updated.VendorName != name {
		t.Fatalf("vendor update failed: %#v %v", updated, err)
	}
	if err := repo.DeleteVendor(vendor.CanonicalID); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.GetVendor(vendor.CanonicalID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("deleted vendor still found: %v", err)
	}
}
