package contracts

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/testkit"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/zyrion"
)

func TestIngestPaidOrderCreatesSOAndEvents(t *testing.T) {
	k := testkit.New(t)
	wh, _, _, item := k.WarehouseZoneBinsItem(t)
	sos := salesorders.New(k.Store, k.Master)
	svc := New(k.Store, sos, k.Master)
	bo, err := svc.IngestPaidOrder(PaidOrderInput{
		ExternalOrderID: "ORD-100",
		ExternalSource:  "shopify",
		WarehouseID:     wh.WarehouseID,
		CustomerName:    "Cliente",
		Lines:           []PaidOrderLine{{ItemID: item.ItemID, Quantity: 2}},
	}, "merchant-bridge")
	if err != nil {
		t.Fatal(err)
	}
	if bo.ZyrionCode != int(zyrion.Success) || bo.SOID == 0 {
		t.Fatalf("expected success with SO: %#v", bo)
	}
	// idempotent
	bo2, err := svc.IngestPaidOrder(PaidOrderInput{
		ExternalOrderID: "ORD-100",
		ExternalSource:  "shopify",
		WarehouseID:     wh.WarehouseID,
		Lines:           []PaidOrderLine{{ItemID: item.ItemID, Quantity: 2}},
	}, "merchant-bridge")
	if err != nil || bo2.ID != bo.ID {
		t.Fatalf("idempotency: %#v %#v %v", bo, bo2, err)
	}
	adv, err := svc.AdvanceStage(bo.ID, "courier", "Handed to courier", zyrion.Success)
	if err != nil || adv.Stage != "courier" {
		t.Fatalf("advance: %#v %v", adv, err)
	}
	evs, err := svc.ListEvents(bo.ID)
	if err != nil || len(evs) < 2 {
		t.Fatalf("events: %d %v", len(evs), err)
	}
}

func TestRejectWithoutLines(t *testing.T) {
	k := testkit.New(t)
	wh, _, _, _ := k.WarehouseZoneBinsItem(t)
	svc := New(k.Store, salesorders.New(k.Store, k.Master), k.Master)
	bo, err := svc.IngestPaidOrder(PaidOrderInput{
		ExternalOrderID: "ORD-BAD",
		WarehouseID:     wh.WarehouseID,
	}, "x")
	if err != nil {
		t.Fatal(err)
	}
	if bo.ZyrionCode != int(zyrion.Failure) {
		t.Fatalf("want failure %#v", bo)
	}
}
