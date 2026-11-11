package fulfillment

import (
	"errors"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
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
