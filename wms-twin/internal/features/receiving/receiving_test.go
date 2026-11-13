package receiving

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
)

func TestReceiveAndPutaway(t *testing.T) {
	k := testkit.New(t)
	wh, staging, pick, item := k.WarehouseZoneBinsItem(t)
	poRepo := purchaseorders.New(k.Store, k.Master)
	po, err := poRepo.Create(purchaseorders.CreateInput{
		PONumber: "PO-T1", WarehouseID: wh.WarehouseID,
		Lines: []purchaseorders.LineInput{{ItemID: item.ItemID, QuantityOrdered: 5}},
	}, "tester")
	if err != nil {
		t.Fatal(err)
	}
	svc := New(k.Store, k.Master, poRepo, k.Ledger)
	_, _, err = svc.Receive(ReceiveInput{
		POID:  po.POID,
		Items: []ReceiveItem{{ItemID: item.ItemID, Quantity: 5, BinID: staging.BinID}},
	}, "tester", nil, true)
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ConfirmPutaway(ConfirmPutawayInput{
		ItemID: item.ItemID, FromBinID: staging.BinID, ToBinID: pick.BinID, Quantity: 5,
	}, nil, true); err != nil {
		t.Fatal(err)
	}
}
