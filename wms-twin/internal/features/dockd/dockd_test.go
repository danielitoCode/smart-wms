package dockd

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestOrderLookup(t *testing.T) {
	k := testkit.New(t)
	wh, _, _, item := k.WarehouseZoneBinsItem(t)
	sos := salesorders.New(k.Store, k.Master)
	so, err := sos.Create(salesorders.CreateInput{
		SONumber: "SO-DOCK", WarehouseID: wh.WarehouseID,
		Lines: []salesorders.LineInput{{ItemID: item.ItemID, QuantityOrdered: 1}},
	}, "tester")
	if err != nil {
		t.Fatal(err)
	}
	ful := fulfillment.New(k.Store, sos, k.Ledger)
	svc := New(sos, k.Master, ful)
	got, err := svc.Order(so.SONumber)
	if err != nil || got.SOID != so.SOID {
		t.Fatalf("%v %#v", err, got)
	}
}
