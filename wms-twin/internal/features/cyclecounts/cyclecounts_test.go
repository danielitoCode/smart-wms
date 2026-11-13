package cyclecounts

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestCreateCycleCount(t *testing.T) {
	k := testkit.New(t)
	wh, _, pk, _ := k.WarehouseZoneBinsItem(t)
	svc := New(k.Store, k.Master, k.Ledger)
	c, err := svc.Create(wh.WarehouseID, []int64{pk.BinID}, "tester", nil, true)
	if err != nil {
		t.Fatal(err)
	}
	if c.WarehouseID != wh.WarehouseID {
		t.Fatalf("%#v", c)
	}
}
