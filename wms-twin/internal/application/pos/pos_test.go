package pos

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

type posFixture struct {
	service *Service
	catalog *catalog.Repository
	ledger *inventoryledger.Ledger
	sos *salesorders.Repository
	warehouseID int64
	binID int64
	itemID int64
}

func newPOSFixture(t *testing.T) *posFixture {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(), Name:"wms-pos-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store, ledger)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"POS-TEST", WarehouseName:"POS Test"})
	if err != nil { t.Fatal(err) }
	zone, err := cat.CreateZone(catalog.ZoneInput{WarehouseID:warehouse.WarehouseID, ZoneCode:"ST", ZoneName:"Storage", ZoneType:"STORAGE"})
	if err != nil { t.Fatal(err) }
	bin, err := cat.CreateBin(catalog.BinInput{ZoneID:zone.ZoneID, WarehouseID:warehouse.WarehouseID, BinCode:"ST-01", BinBarcode:"ST-01-BC", BinType:"Pickable"})
	if err != nil { t.Fatal(err) }
	item, err := cat.CreateItem(catalog.ItemInput{SKU:"POS-SKU-1", ItemName:"POS Test Item"})
	if err != nil { t.Fatal(err) }
	sos := salesorders.New(store, cat)
	fulfill := fulfillment.New(store, sos)
	service := New(store, cat, sos, ledger, fulfill)
	if _, err := ledger.Adjust(inventoryledger.AdjustCommand{OperationID:"pos-seed", WarehouseID:warehouse.WarehouseID, BinID:bin.BinID, ItemID:item.ItemID, Delta:10}); err != nil { t.Fatal(err) }
	return &posFixture{service:service,catalog:cat,ledger:ledger,sos:sos,warehouseID:warehouse.WarehouseID,binID:bin.BinID,itemID:item.ItemID}
}

func checkoutInput(f *posFixture, key string, phone bool) CheckoutInput {
	return CheckoutInput{
		WarehouseID:f.warehouseID, IdempotencyKey:key, ExternalTxnRef:"ext-"+key,
		CashierID:"cashier-1", TerminalID:"terminal-1", PaymentMethod:"cash",
		SubtotalCents:200, TaxCents:10, TotalCents:210,
		Tenders:[]Tender{{Type:"cash",AmountCents:210,AmountTenderedCents:210}},
		PhoneOrder:phone, CustomerName:"POS Customer",
		Lines:[]CartLine{{SKU:"POS-SKU-1",ItemID:f.itemID,BinID:f.binID,Quantity:2,UnitPriceCents:100,TaxCents:10,LineTotalCents:210}},
	}
}

func TestCheckoutDecrementsInventoryAndReplaysExactlyOnce(t *testing.T) {
	f := newPOSFixture(t)
	in := checkoutInput(f,"checkout-1",false)
	first, replayed, err := f.service.CheckoutTransaction(in,"cashier-1")
	if err != nil { t.Fatal(err) }
	if replayed || first.Status != salesorders.StatusShipped { t.Fatalf("unexpected first checkout: replayed=%v so=%+v",replayed,first) }
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=8 { t.Fatalf("expected stock 8 after checkout, got %+v",balances) }
	second, replayed, err := f.service.CheckoutTransaction(in,"cashier-1")
	if err != nil { t.Fatal(err) }
	if !replayed || second.SOID!=first.SOID { t.Fatalf("expected same sale replay, first=%+v second=%+v replayed=%v",first,second,replayed) }
	balances, _, err = f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=8 { t.Fatalf("idempotent replay changed stock: %+v",balances) }
}

func TestRefundRestocksAndReplaysAfterFullRefund(t *testing.T) {
	f := newPOSFixture(t)
	so, _, err := f.service.CheckoutTransaction(checkoutInput(f,"checkout-refund",false),"cashier-1")
	if err != nil { t.Fatal(err) }
	in := RefundInput{SONumber:so.SONumber,IdempotencyKey:"refund-1",ExternalRefundRef:"gateway-refund-1",CashierID:"cashier-1",Reason:"customer returned complete purchase",PaymentMethod:"cash",TotalCents:210}
	first, replayed, err := f.service.RefundTransaction(in,"cashier-1")
	if err != nil { t.Fatal(err) }
	if replayed || first["fully_refunded"] != true { t.Fatalf("unexpected refund result: %v replayed=%v",first,replayed) }
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=10 { t.Fatalf("refund did not restock inventory: %+v",balances) }
	second, replayed, err := f.service.RefundTransaction(in,"cashier-1")
	if err != nil { t.Fatal(err) }
	if !replayed || second["fully_refunded"] != true { t.Fatalf("expected refund replay: %v replayed=%v",second,replayed) }
	balances, _, err = f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=10 { t.Fatalf("refund replay duplicated stock: %+v",balances) }
}

func TestPhoneOrderDispatchCommitsReservationAndRecoversReplay(t *testing.T) {
	f := newPOSFixture(t)
	so, _, err := f.service.CheckoutTransaction(checkoutInput(f,"checkout-phone",true),"cashier-1")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusPicked
	for i := range so.Lines { so.Lines[i].QuantityPicked = so.Lines[i].QuantityOrdered; so.Lines[i].Status = salesorders.LinePicked }
	if err := f.sos.Save(so); err != nil { t.Fatal(err) }
	first, err := f.service.DispatchWithDetails(so.SONumber,"UPS","TRACK-1","cashier-1","dispatch-phone-1",[]int64{f.warehouseID},false)
	if err != nil { t.Fatal(err) }
	if first["status"] != "SHIPPED" { t.Fatalf("unexpected dispatch result: %v",first) }
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=8 || balances[0].Allocated!=0 { t.Fatalf("dispatch did not commit reservation: %+v",balances) }
	second, err := f.service.DispatchWithDetails(so.SONumber,"UPS","TRACK-1","cashier-1",[]int64{f.warehouseID},false)
	if err != nil { t.Fatal(err) }
	if second["replayed"] != true { t.Fatalf("expected dispatch replay: %v",second) }
	balances, _, err = f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=8 || balances[0].Allocated!=0 { t.Fatalf("dispatch replay changed inventory: %+v",balances) }
}

func TestPartialRefundsCannotExceedOriginalQuantityAndCanFinishSale(t *testing.T) {
	f := newPOSFixture(t)
	so, _, err := f.service.CheckoutTransaction(checkoutInput(f,"checkout-partial-refund",false),"cashier-1")
	if err != nil { t.Fatal(err) }
	first := RefundInput{SONumber:so.SONumber,IdempotencyKey:"refund-partial-1",ExternalRefundRef:"gateway-partial-1",CashierID:"cashier-1",Reason:"one unit returned",PaymentMethod:"cash",TotalCents:105,Lines:[]RefundLine{{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1}}}
	if _, replayed, err := f.service.RefundTransaction(first,"cashier-1"); err != nil || replayed { t.Fatalf("first partial refund failed: replayed=%v err=%v",replayed,err) }
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=9 { t.Fatalf("expected one unit restocked, got %+v",balances) }
	second := RefundInput{SONumber:so.SONumber,IdempotencyKey:"refund-partial-2",ExternalRefundRef:"gateway-partial-2",CashierID:"cashier-1",Reason:"last unit returned",PaymentMethod:"cash",TotalCents:105,Lines:[]RefundLine{{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1}}}
	result, replayed, err := f.service.RefundTransaction(second,"cashier-1")
	if err != nil || replayed || result["fully_refunded"] != true { t.Fatalf("second partial refund did not complete sale: result=%v replayed=%v err=%v",result,replayed,err) }
	balances, _, err = f.ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=10 { t.Fatalf("expected all stock restored, got %+v",balances) }
	overRefund := RefundInput{SONumber:so.SONumber,IdempotencyKey:"refund-partial-3",ExternalRefundRef:"gateway-partial-3",CashierID:"cashier-1",Reason:"attempt duplicate",PaymentMethod:"cash",TotalCents:1,Lines:[]RefundLine{{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1}}}
	if _, _, err := f.service.RefundTransaction(overRefund,"cashier-1"); err == nil { t.Fatal("refund accepted quantity beyond original sale") }
}

func TestShippingRefundCanCompleteSaleAfterAllItemsReturned(t *testing.T) {
	f := newPOSFixture(t)
	in := checkoutInput(f,"checkout-shipping-refund",false)
	in.ShippingCents = 100
	in.TotalCents = 310
	in.Tenders[0].AmountCents = 310
	in.Tenders[0].AmountTenderedCents = 310
	so, _, err := f.service.CheckoutTransaction(in,"cashier-1")
	if err != nil { t.Fatal(err) }
	merchandise := RefundInput{SONumber:so.SONumber,IdempotencyKey:"refund-merchandise",ExternalRefundRef:"gateway-merchandise",CashierID:"cashier-1",Reason:"merchandise returned",PaymentMethod:"cash",TotalCents:210}
	first, _, err := f.service.RefundTransaction(merchandise,"cashier-1")
	if err != nil { t.Fatal(err) }
	if first["fully_refunded"] == true || first["all_items_returned"] != true { t.Fatalf("expected all items returned but shipping still outstanding: %v",first) }
	shipping := RefundInput{SONumber:so.SONumber,IdempotencyKey:"refund-shipping",ExternalRefundRef:"gateway-shipping",CashierID:"cashier-1",Reason:"shipping charge refunded",PaymentMethod:"cash",TotalCents:100,ShippingRefundCents:100}
	second, _, err := f.service.RefundTransaction(shipping,"cashier-1")
	if err != nil { t.Fatal(err) }
	if second["fully_refunded"] != true { t.Fatalf("shipping-only refund did not complete financial refund: %v",second) }
}

func TestRefundConsolidatesRepeatedItemBinLinesBeforeLedgerMutation(t *testing.T) {
	f := newPOSFixture(t)
	so, _, err := f.service.CheckoutTransaction(checkoutInput(f,"checkout-duplicate-refund-lines",false),"cashier-1")
	if err != nil { t.Fatal(err) }
	in := RefundInput{
		SONumber:so.SONumber, IdempotencyKey:"refund-duplicate-lines",
		ExternalRefundRef:"gateway-duplicate-lines", CashierID:"cashier-1",
		Reason:"return entered as two scan lines", PaymentMethod:"cash", TotalCents:210,
		Lines:[]RefundLine{
			{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1},
			{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1},
		},
	}
	if _, _, err := f.service.RefundTransaction(in,"cashier-1"); err != nil { t.Fatal(err) }
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=10 { t.Fatalf("duplicate refund lines did not restore exactly two units: %+v",balances) }
}

func TestRefundAggregatesRepeatedItemBinLinesIntoOneLedgerMovement(t *testing.T) {
	f := newPOSFixture(t)
	in := checkoutInput(f,"checkout-duplicate-refund",false)
	in.Lines = []CartLine{
		{SKU:"POS-SKU-1",ItemID:f.itemID,BinID:f.binID,Quantity:1,UnitPriceCents:100,TaxCents:5,LineTotalCents:105},
		{SKU:"POS-SKU-1",ItemID:f.itemID,BinID:f.binID,Quantity:1,UnitPriceCents:100,TaxCents:5,LineTotalCents:105},
	}
	so, _, err := f.service.CheckoutTransaction(in,"cashier-1")
	if err != nil { t.Fatal(err) }
	refund := RefundInput{
		SONumber:so.SONumber,IdempotencyKey:"refund-duplicate-lines",
		ExternalRefundRef:"gateway-duplicate-lines",CashierID:"cashier-1",
		Reason:"two repeated cart rows returned",PaymentMethod:"cash",TotalCents:210,
		Lines:[]RefundLine{
			{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1},
			{ItemID:f.itemID,SKU:"POS-SKU-1",BinID:f.binID,Quantity:1},
		},
	}
	if _, replayed, err := f.service.RefundTransaction(refund,"cashier-1"); err != nil || replayed {
		t.Fatalf("refund with repeated lines failed: replayed=%v err=%v",replayed,err)
	}
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=10 {
		t.Fatalf("refund must restock both units exactly once, got %+v",balances)
	}
}

func TestVoidingPhoneDispatchRestoresOnHandAndReservation(t *testing.T) {
	f := newPOSFixture(t)
	so, _, err := f.service.CheckoutTransaction(checkoutInput(f,"checkout-phone-void",true),"cashier-1")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusPicked
	for i := range so.Lines {
		so.Lines[i].QuantityPicked = so.Lines[i].QuantityOrdered
		so.Lines[i].Status = salesorders.LinePicked
	}
	if err := f.sos.Save(so); err != nil { t.Fatal(err) }
	if _, err := f.service.DispatchWithDetails(so.SONumber,"UPS","TRACK-VOID","cashier-1","dispatch-phone-void",[]int64{f.warehouseID},false); err != nil { t.Fatal(err) }
	balances, _, err := f.ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=8 || balances[0].Allocated!=0 { t.Fatalf("unexpected dispatched balance: %+v",balances) }
	first, err := f.service.fulfill.VoidWithID(so.SOID,"admin","customer cancelled","void-phone-1")
	if err != nil { t.Fatal(err) }
	if first.Status!="VOIDED" { t.Fatalf("shipment was not voided: %+v",first) }
	balances, _, err = f.ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=10 || balances[0].Allocated!=2 { t.Fatalf("void did not restore the pre-dispatch inventory reservation: %+v",balances) }
	second, err := f.service.fulfill.VoidWithID(so.SOID,"admin","customer cancelled","void-phone-1")
	if err != nil { t.Fatal(err) }
	if !second.Replayed { t.Fatalf("expected idempotent void replay: %+v",second) }
	balances, _, err = f.ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=10 || balances[0].Allocated!=2 { t.Fatalf("void replay changed inventory: %+v",balances) }
}
