package purchaseorders

import (
	"errors"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func fixture(t *testing.T)(*Repository,*catalog.Repository){
	t.Helper();node,err:=core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-po-test"});if err!=nil{t.Fatal(err)}
	store:=corestore.New(node.Organisms(),string(node.ID()));master:=catalog.New(store,nil);return New(store,master),master
}
func TestPurchaseOrderLifecycleAndLines(t *testing.T){
	repo,master:=fixture(t)
	wh,err:=master.CreateWarehouse(catalog.WarehouseInput{WarehouseCode:"WH-PO",WarehouseName:"PO Warehouse"});if err!=nil{t.Fatal(err)}
	itemA,err:=master.CreateItem(catalog.ItemInput{SKU:"PO-A",ItemName:"A"});if err!=nil{t.Fatal(err)}
	itemB,err:=master.CreateItem(catalog.ItemInput{SKU:"PO-B",ItemName:"B"});if err!=nil{t.Fatal(err)}
	po,err:=repo.Create(CreateInput{PONumber:"PO-100",WarehouseID:wh.WarehouseID,Lines:[]LineInput{{ItemID:itemA.ItemID,QuantityOrdered:10},{ItemID:itemB.ItemID,QuantityOrdered:5}}},"operator")
	if err!=nil{t.Fatal(err)}
	if po.Status!=StatusOpen||len(po.Lines)!=2||po.Lines[0].LineNumber!=1||po.Lines[1].LineNumber!=2{t.Fatalf("unexpected PO: %#v",po)}
	if _,err:=repo.Create(CreateInput{PONumber:"PO-100",WarehouseID:wh.WarehouseID,Lines:[]LineInput{{ItemID:itemA.ItemID,QuantityOrdered:1}}},"operator");!errors.Is(err,ErrDuplicate){t.Fatalf("duplicate PO accepted: %v",err)}
	line,status,err:=repo.AddLine(po.POID,AddLineInput{ItemID:itemA.ItemID,QuantityOrdered:1});if !errors.Is(err,ErrDuplicate){t.Fatalf("duplicate item line accepted: %#v %s %v",line,status,err)}
	line,status,err=repo.AddLine(po.POID,AddLineInput{ItemID:itemB.ItemID,QuantityOrdered:2});if !errors.Is(err,ErrDuplicate){t.Fatalf("duplicate item line accepted: %#v %s %v",line,status,err)}
	updated,status,err:=repo.UpdateLine(po.POID,po.Lines[0].POLineID,12);if err!=nil||updated.QuantityOrdered!=12||status!=StatusOpen{t.Fatalf("line update failed: %#v %s %v",updated,status,err)}
	if _,err:=repo.Close(po.POID);err!=nil{t.Fatal(err)}
	if _, _, err:=repo.AddLine(po.POID,AddLineInput{ItemID:itemB.ItemID,QuantityOrdered:2});!errors.Is(err,ErrLocked){t.Fatalf("closed PO accepted new line: %v",err)}
	if _,err:=repo.Reopen(po.POID);err!=nil{t.Fatal(err)}
	patch:=Patch{VendorName:stringPointer("Vendor")}
	updatedPO,err:=repo.Update(po.POID,patch);if err!=nil||updatedPO.VendorName==nil||*updatedPO.VendorName!="Vendor"{t.Fatalf("header update failed: %#v %v",updatedPO,err)}
	if _,err:=repo.DeleteLine(po.POID,po.Lines[1].POLineID);err!=nil{t.Fatalf("delete unreceived line: %v",err)}
}
func stringPointer(v string)*string{return &v}
