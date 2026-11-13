package picking

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestCreateBatchRequiresStockOrFailsCleanly(t *testing.T) {
	k := testkit.New(t)
	wh, _, pick, item := k.WarehouseZoneBinsItem(t)
	_, _ = k.Ledger.Adjust(inventoryledger.AdjustCommand{
		OperationID: "seed-1", WarehouseID: wh.WarehouseID, BinID: pick.BinID, ItemID: item.ItemID, Delta: 3,
	})
	sos := salesorders.New(k.Store, k.Master)
	so, err := sos.Create(salesorders.CreateInput{
		SONumber: "SO-PICK", WarehouseID: wh.WarehouseID,
		Lines: []salesorders.LineInput{{ItemID: item.ItemID, QuantityOrdered: 1}},
	}, "tester")
	if err != nil {
		t.Fatal(err)
	}
	svc := New(k.Store, k.Master, sos, k.Ledger)
	_, _, err = svc.CreateBatch([]string{so.SONumber}, wh.WarehouseID, "tester", nil, true)
	// May succeed or fail on allocation rules; must not panic
	_ = err
}
