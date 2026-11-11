package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestAdminItemsPreferredBinsAndVendors(t *testing.T) {
	_,handler,_:=newAuthFixture(t,5,false,"ADMIN",nil)
	token,_:=loginForTest(t,handler,"Operator123")
	wh:=catalogRequest(t,handler,http.MethodPost,"/api/admin/warehouses",`{"warehouse_code":"WH-IT","warehouse_name":"Items warehouse"}`,token)
	if wh.Code!=http.StatusCreated{t.Fatalf("warehouse %d: %s",wh.Code,wh.Body.String())}
	var warehouse map[string]any;if err:=json.Unmarshal(wh.Body.Bytes(),&warehouse);err!=nil{t.Fatal(err)}
	warehouseID:=int64(warehouse["warehouse_id"].(float64))
	zoneResp:=catalogRequest(t,handler,http.MethodPost,"/api/admin/zones",`{"warehouse_id":`+jsonNumber(warehouseID)+`,"zone_code":"PICK","zone_name":"Picking","zone_type":"PICKING"}`,token)
	if zoneResp.Code!=http.StatusCreated{t.Fatalf("zone %d: %s",zoneResp.Code,zoneResp.Body.String())}
	var zone map[string]any;if err:=json.Unmarshal(zoneResp.Body.Bytes(),&zone);err!=nil{t.Fatal(err)}
	zoneID:=int64(zone["zone_id"].(float64))
	binResp:=catalogRequest(t,handler,http.MethodPost,"/api/admin/bins",`{"warehouse_id":`+jsonNumber(warehouseID)+`,"zone_id":`+jsonNumber(zoneID)+`,"bin_code":"P-01","bin_barcode":"PICK-01","bin_type":"Pickable"}`,token)
	if binResp.Code!=http.StatusCreated{t.Fatalf("bin %d: %s",binResp.Code,binResp.Body.String())}
	var bin map[string]any;if err:=json.Unmarshal(binResp.Body.Bytes(),&bin);err!=nil{t.Fatal(err)}
	binID:=int64(bin["bin_id"].(float64))
	itemResp:=catalogRequest(t,handler,http.MethodPost,"/api/admin/items",`{"sku":"SKU-HTTP","item_name":"HTTP Widget","default_bin_id":`+jsonNumber(binID)+`}`,token)
	if itemResp.Code!=http.StatusCreated{t.Fatalf("item %d: %s",itemResp.Code,itemResp.Body.String())}
	var item map[string]any;if err:=json.Unmarshal(itemResp.Body.Bytes(),&item);err!=nil{t.Fatal(err)}
	itemID:=int64(item["item_id"].(float64))
	itemList:=catalogRequest(t,handler,http.MethodGet,"/api/admin/items?q=SKU-HTTP","",token)
	if itemList.Code!=http.StatusOK||!strings.Contains(itemList.Body.String(),`"default_bin_code":"P-01"`){t.Fatalf("item list %d: %s",itemList.Code,itemList.Body.String())}
	itemDetail:=catalogRequest(t,handler,http.MethodGet,"/api/admin/items/"+jsonNumber(itemID),"",token)
	if itemDetail.Code!=http.StatusOK||!strings.Contains(itemDetail.Body.String(),`"HTTP Widget"`){t.Fatalf("item detail %d: %s",itemDetail.Code,itemDetail.Body.String())}
	preferred:=catalogRequest(t,handler,http.MethodPost,"/api/admin/preferred-bins",`{"item_id":`+jsonNumber(itemID)+`,"bin_id":`+jsonNumber(binID)+`}`,token)
	if preferred.Code!=http.StatusOK{t.Fatalf("preferred bin %d: %s",preferred.Code,preferred.Body.String())}
	preferredList:=catalogRequest(t,handler,http.MethodGet,"/api/admin/preferred-bins?q=SKU-HTTP","",token)
	if preferredList.Code!=http.StatusOK||!strings.Contains(preferredList.Body.String(),`"bin_code":"P-01"`){t.Fatalf("preferred list %d: %s",preferredList.Code,preferredList.Body.String())}
	vendorResp:=catalogRequest(t,handler,http.MethodPost,"/api/admin/vendors",`{"vendor_name":"Vendor HTTP","email":"ops@example.test"}`,token)
	if vendorResp.Code!=http.StatusCreated{t.Fatalf("vendor create %d: %s",vendorResp.Code,vendorResp.Body.String())}
	var vendorEnvelope map[string]any;if err:=json.Unmarshal(vendorResp.Body.Bytes(),&vendorEnvelope);err!=nil{t.Fatal(err)}
	vendor:=vendorEnvelope["vendor"].(map[string]any);vendorID:=vendor["canonical_id"].(string)
	vendorList:=catalogRequest(t,handler,http.MethodGet,"/api/admin/vendors?q=Vendor","",token)
	if vendorList.Code!=http.StatusOK||!strings.Contains(vendorList.Body.String(),vendorID){t.Fatalf("vendor list %d: %s",vendorList.Code,vendorList.Body.String())}
	vendorDelete:=catalogRequest(t,handler,http.MethodDelete,"/api/admin/vendors/"+vendorID,"",token)
	if vendorDelete.Code!=http.StatusOK{t.Fatalf("vendor delete %d: %s",vendorDelete.Code,vendorDelete.Body.String())}
}
