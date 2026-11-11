package fulfillment

import (
	"errors"
	"encoding/json"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestShipmentVoidRestoresOrderStateAndIsIdempotent(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-fulfillment-void-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(),string(node.ID()))
	cat := catalog.New(store,nil)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"SHIP-WH",WarehouseName:"Ship Warehouse"})
	if err != nil { t.Fatal(err) }
	item, err := cat.CreateItem(catalog.ItemInput{SKU:"SHIP-SKU",ItemName:"Ship item"})
	if err != nil { t.Fatal(err) }
	sos := salesorders.New(store,cat)
	so, err := sos.Create(salesorders.CreateInput{SONumber:"SHIP-VOID-1",WarehouseID:warehouse.WarehouseID,Lines:[]salesorders.LineInput{{ItemID:item.ItemID,QuantityOrdered:2}}},"operator")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusPacked
	so.Lines[0].QuantityPicked = 2
	so.Lines[0].QuantityPacked = 2
	so.Lines[0].Status = salesorders.LinePacked
	if err := sos.Save(so); err != nil { t.Fatal(err) }
	service := New(store,sos)
	shipment, err := service.Fulfill(FulfillInput{SOID:so.SOID,Carrier:"UPS",TrackingNumber:"TRACK-VOID"},[]int64{warehouse.WarehouseID},false)
	if err != nil { t.Fatal(err) }
	if shipment.Status != "SHIPPED" { t.Fatalf("expected shipment, got %+v",shipment) }
	voided, err := service.VoidWithID(so.SOID,"operator","wrong label","void-key-1")
	if err != nil { t.Fatal(err) }
	if voided.Status != "VOIDED" || voided.PreShipStatus != salesorders.StatusPacked { t.Fatalf("unexpected void: %+v",voided) }
	restored, err := sos.Get(so.SOID)
	if err != nil { t.Fatal(err) }
	if restored.Status != salesorders.StatusPacked || restored.Lines[0].QuantityShipped != 0 || restored.Lines[0].Status != salesorders.LinePacked {
		t.Fatalf("order did not return to pre-ship state: %+v",restored)
	}
	replay, err := service.VoidWithID(so.SOID,"operator","wrong label","void-key-1")
	if err != nil || !replay.Replayed { t.Fatalf("expected idempotent void replay: %+v err=%v",replay,err) }
	if _, err := service.VoidWithID(so.SOID,"operator","different reason","void-key-2"); !errors.Is(err,ErrState) {
		t.Fatalf("expected conflicting second void to be rejected, got %v",err)
	}
}

func TestVoidReversesPOSInventoryExactlyOnce(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-fulfillment-pos-void-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(),string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store,ledger)
	warehouse, err := cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"POS-VOID-WH",WarehouseName:"POS Void"})
	if err != nil { t.Fatal(err) }
	zone, err := cat.CreateZone(catalog.ZoneInput{WarehouseID:warehouse.WarehouseID,ZoneCode:"ST",ZoneName:"Storage",ZoneType:"STORAGE"})
	if err != nil { t.Fatal(err) }
	bin, err := cat.CreateBin(catalog.BinInput{WarehouseID:warehouse.WarehouseID,ZoneID:zone.ZoneID,BinCode:"POS-VOID-BIN",BinBarcode:"POS-VOID-BARCODE",BinType:"Pickable"})
	if err != nil { t.Fatal(err) }
	item, err := cat.CreateItem(catalog.ItemInput{SKU:"POS-VOID-SKU",ItemName:"POS void item"})
	if err != nil { t.Fatal(err) }
	if _, err := ledger.Adjust(inventoryledger.AdjustCommand{OperationID:"seed-pos-void",WarehouseID:warehouse.WarehouseID,BinID:bin.BinID,ItemID:item.ItemID,Delta:8}); err != nil { t.Fatal(err) }
	if _, err := ledger.Adjust(inventoryledger.AdjustCommand{OperationID:"seed-pos-dispatch",WarehouseID:warehouse.WarehouseID,BinID:bin.BinID,ItemID:item.ItemID,Delta:-2}); err != nil { t.Fatal(err) }
	sos := salesorders.New(store,cat)
	so, err := sos.Create(salesorders.CreateInput{SONumber:"POS-VOID-SO",WarehouseID:warehouse.WarehouseID,Lines:[]salesorders.LineInput{{ItemID:item.ItemID,QuantityOrdered:2}}},"operator")
	if err != nil { t.Fatal(err) }
	so.Status = salesorders.StatusPacked
	so.Lines[0].QuantityPicked, so.Lines[0].QuantityPacked = 2,2
	so.Lines[0].Status = salesorders.LinePacked
	if err := sos.Save(so); err != nil { t.Fatal(err) }
	service := New(store,sos,ledger)
	if _, err := service.Fulfill(FulfillInput{SOID:so.SOID,Carrier:"UPS",TrackingNumber:"POS-VOID-TRACK"},[]int64{warehouse.WarehouseID},false); err != nil { t.Fatal(err) }
	sale := map[string]any{
		"id":"pos-sale-void", "so_id":so.SOID, "status":"DISPATCHED",
		"lines":[]map[string]any{{"warehouse_id":warehouse.WarehouseID,"bin_id":bin.BinID,"item_id":item.ItemID,"quantity":2}},
	}
	data, err := json.Marshal(sale)
	if err != nil { t.Fatal(err) }
	if _, err := store.Put("wms_pos_sale","pos-sale-void",data); err != nil { t.Fatal(err) }
	voided, err := service.VoidWithID(so.SOID,"operator","customer cancelled","pos-void-operation")
	if err != nil { t.Fatal(err) }
	if voided.Status!="VOIDED" || len(voided.VoidReversedKeys)!=1 { t.Fatalf("POS inventory reversal not recorded: %+v",voided) }
	balances, _, err := ledger.List()
	if err != nil { t.Fatal(err) }
	if len(balances)!=1 || balances[0].OnHand!=8 { t.Fatalf("expected original stock after void, got %+v",balances) }
	replayed, err := service.VoidWithID(so.SOID,"operator","customer cancelled","pos-void-operation")
	if err != nil || !replayed.Replayed { t.Fatalf("void replay failed: result=%+v err=%v",replayed,err) }
	balances, _, err = ledger.List()
	if err != nil { t.Fatal(err) }
	if balances[0].OnHand!=8 { t.Fatalf("void replay duplicated stock reversal: %+v",balances) }
}
