package rma

import (
	"testing"
	"encoding/json"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestRMAReceiptDispositionRestocksIdempotentlyAndCompletes(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-rma-receipt-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(),string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store,ledger)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"RMA-WH",WarehouseName:"RMA Warehouse"})
	if err != nil { t.Fatal(err) }
	zone, err := cat.CreateZone(catalog.ZoneInput{WarehouseID:warehouse.WarehouseID,ZoneCode:"RET",ZoneName:"Returns",ZoneType:"STORAGE"})
	if err != nil { t.Fatal(err) }
	bin, err := cat.CreateBin(catalog.BinInput{ZoneID:zone.ZoneID,WarehouseID:warehouse.WarehouseID,BinCode:"RET-01",BinBarcode:"RET-01-BC",BinType:"Pickable"})
	if err != nil { t.Fatal(err) }
	item, err := cat.CreateItem(catalog.ItemInput{SKU:"RMA-SKU",ItemName:"Returned item"})
	if err != nil { t.Fatal(err) }
	sos := salesorders.New(store,cat)
	so, err := sos.Create(salesorders.CreateInput{SONumber:"SO-RMA-1",WarehouseID:warehouse.WarehouseID,Lines:[]salesorders.LineInput{{ItemID:item.ItemID,QuantityOrdered:3}}},"tester")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusShipped
	so.Lines[0].QuantityShipped = 3
	so.Lines[0].QuantityPacked = 3
	so.Lines[0].Status = salesorders.LineShipped
	if err := sos.Save(so); err != nil { t.Fatal(err) }
	service := New(store,sos,cat,ledger)
	rma, err := service.Create(so.SONumber,"damaged packaging","tester",false)
	if err != nil { t.Fatal(err) }
	if _, err := service.Create(so.SONumber,"duplicate return","tester",false); err == nil { t.Fatal("duplicate RMA reserved the same shipped quantities") }
	first, err := service.ReceiveLine(rma.RMAID,item.ItemID,2,bin.BinID,"LOT-1","RESTOCK","rma-receipt-1","receiver")
	if err != nil { t.Fatal(err) }
	if first.Lines[0].Received != 2 { t.Fatalf("expected 2 received: %+v",first.Lines[0]) }
	replayed, err := service.ReceiveLine(rma.RMAID,item.ItemID,2,bin.BinID,"LOT-1","RESTOCK","rma-receipt-1","receiver")
	if err != nil || replayed.Lines[0].Received != 2 { t.Fatalf("receipt replay failed: %+v err=%v",replayed,err) }
	if _, err := service.ReceiveLine(rma.RMAID,item.ItemID,1,0,"","SCRAP","rma-receipt-2","receiver"); err != nil { t.Fatal(err) }
	completed, err := service.Complete(rma.RMAID,"supervisor")
	if err != nil { t.Fatal(err) }
	if completed.Status != "COMPLETED" || completed.Lines[0].Disposition != "MIXED" { t.Fatalf("unexpected completed RMA: %+v",completed) }
	replayAfterCompletion, err := service.ReceiveLine(rma.RMAID,item.ItemID,2,bin.BinID,"LOT-1","RESTOCK","rma-receipt-1","receiver")
	if err != nil || replayAfterCompletion.Status != "COMPLETED" { t.Fatalf("completed RMA receipt replay failed: %+v err=%v",replayAfterCompletion,err) }
	balances, _, err := ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=2 { t.Fatalf("RMA restock did not apply exactly once: %+v",balances) }
}

func TestRMAUsesOnlyUnrefundedShippedQuantity(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-rma-partial-refund-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(),string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store,ledger)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"RMA-PART",WarehouseName:"RMA Partial"})
	if err != nil { t.Fatal(err) }
	item, err := cat.CreateItem(catalog.ItemInput{SKU:"RMA-PART-SKU",ItemName:"Partial return item"})
	if err != nil { t.Fatal(err) }
	sos := salesorders.New(store,cat)
	so, err := sos.Create(salesorders.CreateInput{SONumber:"SO-RMA-PART-1",WarehouseID:warehouse.WarehouseID,Lines:[]salesorders.LineInput{{ItemID:item.ItemID,QuantityOrdered:3}}},"tester")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusPartiallyRefunded
	so.Lines[0].QuantityShipped = 3
	so.Lines[0].Status = salesorders.LineShipped
	if err := sos.Save(so); err != nil { t.Fatal(err) }
	saleData, _ := json.Marshal(map[string]any{"id":"sale-partial","so_id":so.SOID,"status":"PARTIALLY_REFUNDED"})
	if _, err := store.Put("wms_pos_sale","sale-partial",saleData); err != nil { t.Fatal(err) }
	refundData, _ := json.Marshal(map[string]any{"sale_id":"sale-partial","status":"COMPLETED","lines":[]map[string]any{{"item_id":item.ItemID,"quantity":2}}})
	if _, err := store.Put("wms_pos_refund","refund-partial",refundData); err != nil { t.Fatal(err) }
	service := New(store,sos,cat,ledger)
	rma, err := service.Create(so.SONumber,"remaining unit returned","tester",false)
	if err != nil { t.Fatal(err) }
	if len(rma.Lines)!=1 || rma.Lines[0].Expected!=1 { t.Fatalf("RMA included already-refunded quantity: %+v",rma.Lines) }
}

func TestRMACancelReversesRestockedInventoryIdempotently(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-rma-cancel-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(),string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store,ledger)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"RMA-CANCEL",WarehouseName:"RMA Cancel"})
	if err != nil { t.Fatal(err) }
	zone, err := cat.CreateZone(catalog.ZoneInput{WarehouseID:warehouse.WarehouseID,ZoneCode:"RET-C",ZoneName:"Returns",ZoneType:"STORAGE"})
	if err != nil { t.Fatal(err) }
	bin, err := cat.CreateBin(catalog.BinInput{ZoneID:zone.ZoneID,WarehouseID:warehouse.WarehouseID,BinCode:"RET-C-01",BinBarcode:"RET-C-01",BinType:"Pickable"})
	if err != nil { t.Fatal(err) }
	item, err := cat.CreateItem(catalog.ItemInput{SKU:"RMA-CANCEL-SKU",ItemName:"Cancel returned item"})
	if err != nil { t.Fatal(err) }
	sos := salesorders.New(store,cat)
	so, err := sos.Create(salesorders.CreateInput{SONumber:"SO-RMA-CANCEL",WarehouseID:warehouse.WarehouseID,Lines:[]salesorders.LineInput{{ItemID:item.ItemID,QuantityOrdered:2}}},"tester")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusShipped
	so.Lines[0].QuantityShipped = 2
	so.Lines[0].Status = salesorders.LineShipped
	if err := sos.Save(so); err != nil { t.Fatal(err) }
	service := New(store,sos,cat,ledger)
	rma, err := service.Create(so.SONumber,"cancel after receiving","tester",false)
	if err != nil { t.Fatal(err) }
	if _, err := service.ReceiveLine(rma.RMAID,item.ItemID,2,bin.BinID,"LOT-C","RESTOCK","rma-cancel-receipt","receiver"); err != nil { t.Fatal(err) }
	cancelled, err := service.Cancel(rma.RMAID,"supervisor")
	if err != nil { t.Fatal(err) }
	if cancelled.Status != "CANCELLED" || !cancelled.Lines[0].Receipts[0].Reversed { t.Fatalf("restock was not marked reversed: %+v",cancelled) }
	if _, err := service.Cancel(rma.RMAID,"supervisor"); err != nil { t.Fatal(err) }
	if _, err := service.Create(so.SONumber,"try to return same units again","tester",false); err == nil { t.Fatal("cancelled RMA released units that had already been received") }
	balances, _, err := ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances) != 1 || balances[0].OnHand != 0 || balances[0].Allocated != 0 {
		t.Fatalf("cancelled RMA left stock in inventory: %+v", balances)
	}
}
