package salesorders

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestCreateListGet(t *testing.T) {
	k := testkit.New(t)
	wh, _, _, item := k.WarehouseZoneBinsItem(t)
	repo := New(k.Store, k.Master)
	so, err := repo.Create(CreateInput{
		SONumber: "SO-T1", WarehouseID: wh.WarehouseID,
		Lines: []LineInput{{ItemID: item.ItemID, QuantityOrdered: 2}},
	}, "tester")
	if err != nil {
		t.Fatal(err)
	}
	list, err := repo.List()
	if err != nil || len(list) < 1 {
		t.Fatalf("list %v %d", err, len(list))
	}
	got, err := repo.Get(so.SOID)
	if err != nil || got.SONumber != "SO-T1" {
		t.Fatalf("get %#v %v", got, err)
	}
}
