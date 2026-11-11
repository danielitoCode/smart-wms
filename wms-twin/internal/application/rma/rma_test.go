package rma

import (
	"testing"

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
	first, err := service.ReceiveLine(rma.RMAID,item.ItemID,2,bin.BinID,"LOT-1","RESTOCK","rma-receipt-1","receiver")
	if err != nil { t.Fatal(err) }
	if first.Lines[0].Received != 2 { t.Fatalf("expected 2 received: %+v",first.Lines[0]) }
	replayed, err := service.ReceiveLine(rma.RMAID,item.ItemID,2,bin.BinID,"LOT-1","RESTOCK","rma-receipt-1","receiver")
	if err != nil || replayed.Lines[0].Received != 2 { t.Fatalf("receipt replay failed: %+v err=%v",replayed,err) }
	if _, err := service.ReceiveLine(rma.RMAID,item.ItemID,1,0,"","SCRAP","rma-receipt-2","receiver"); err != nil { t.Fatal(err) }
	completed, err := service.Complete(rma.RMAID,"supervisor")
	if err != nil { t.Fatal(err) }
	if completed.Status != "COMPLETED" || completed.Lines[0].Disposition != "MIXED" { t.Fatalf("unexpected completed RMA: %+v",completed) }
	balances, _, err := ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=2 { t.Fatalf("RMA restock did not apply exactly once: %+v",balances) }
}
