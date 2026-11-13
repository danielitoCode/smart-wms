package transfers

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestMoveBetweenBins(t *testing.T) {
	k := testkit.New(t)
	wh, st, pk, item := k.WarehouseZoneBinsItem(t)
	if _, err := k.Ledger.Adjust(inventoryledger.AdjustCommand{
		OperationID: "t-adj", WarehouseID: wh.WarehouseID, BinID: st.BinID, ItemID: item.ItemID, Delta: 4,
	}); err != nil {
		t.Fatal(err)
	}
	svc := New(k.Master, k.Ledger)
	err := svc.Move(MoveInput{
		ItemID: item.ItemID, FromBinID: st.BinID, ToBinID: pk.BinID, Quantity: 2, WarehouseID: wh.WarehouseID,
	}, nil, true)
	if err != nil {
		t.Fatal(err)
	}
}
