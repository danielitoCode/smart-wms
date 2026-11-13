package lookup

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestItemBySKU(t *testing.T) {
	k := testkit.New(t)
	_, _, _, item := k.WarehouseZoneBinsItem(t)
	svc := New(k.Master, k.Ledger, salesorders.New(k.Store, k.Master))
	got, err := svc.ItemByBarcode(item.SKU)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := got["item_id"].(int64)
	if id != item.ItemID {
		t.Fatalf("want %d got %#v", item.ItemID, got["item_id"])
	}
}
