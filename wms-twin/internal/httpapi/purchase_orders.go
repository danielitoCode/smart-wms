package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

func (s *Server) purchaseOrderRoutes(w http.ResponseWriter,r *http.Request,user identity.User,parts []string){
	if len(parts)==0{
		switch r.Method{
		case http.MethodGet:
			values,err:=s.purchaseOrders.List();if err!=nil{writePurchaseOrderError(w,err);return}
			status:=r.URL.Query().Get("status");query:=strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")));warehouseID:=int64(0)
			if raw:=r.URL.Query().Get("warehouse_id");raw!=""{id,ok:=positivePathID(raw);if !ok{writeJSON(w,400,map[string]string{"error":"Invalid warehouse_id"});return};warehouseID=id}
			includeArchived:=strings.EqualFold(r.URL.Query().Get("include_archived"),"true")
			filtered:=values[:0]
			for _,po:=range values{
				if status!=""&&po.Status!=status{continue};if status==""&&!includeArchived&&po.Status==purchaseorders.StatusArchived{continue}
				if warehouseID>0&&po.WarehouseID!=warehouseID{continue};if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,po.WarehouseID){continue}
				if query!=""&&!strings.Contains(strings.ToLower(po.PONumber),query)&&!optionalContains(po.VendorName,query){continue}
				filtered=append(filtered,po)
			}
			page,perPage:=pagination(r);items,total,page,pages:=catalog.Paginate(filtered,page,perPage)
			rows:=make([]map[string]any,0,len(items));for _,po:=range items{rows=append(rows,poListResponse(po))}
			writeJSON(w,200,map[string]any{"purchase_orders":rows,"total":total,"page":page,"per_page":perPage,"pages":pages})
		case http.MethodPost:
			var input purchaseorders.CreateInput;if err:=decodeStrictJSON(r,&input);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,input.WarehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
			po,err:=s.purchaseOrders.Create(input,user.Username);if err!=nil{writePurchaseOrderError(w,err);return}
			writePurchaseOrderDetail(w,po,s.catalog,201)
		default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
		};return
	}
	id,ok:=positivePathID(parts[0]);if !ok{writeJSON(w,400,map[string]string{"error":"invalid po_id"});return}
	po,err:=s.purchaseOrders.Get(id);if err!=nil{writePurchaseOrderError(w,err);return}
	if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,po.WarehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
	if len(parts)==1{
		switch r.Method{
		case http.MethodGet:writePurchaseOrderDetail(w,po,s.catalog,200)
		case http.MethodPut:
			var patch purchaseorders.Patch;if err:=decodeStrictJSON(r,&patch);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			updated,err:=s.purchaseOrders.Update(id,patch);if err!=nil{writePurchaseOrderError(w,err);return};writeJSON(w,200,poListResponse(updated))
		default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
		};return
	}
	if len(parts)==2{
		switch parts[1]{
		case "lines":
			if r.Method!=http.MethodPost{writeJSON(w,405,map[string]string{"error":"method not allowed"});return}
			var input purchaseorders.AddLineInput;if err:=decodeStrictJSON(r,&input);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			line,status,err:=s.purchaseOrders.AddLine(id,input);if err!=nil{writePurchaseOrderError(w,err);return};item,_:=s.catalog.GetItem(line.ItemID)
			writeJSON(w,201,map[string]any{"po_line_id":line.POLineID,"po_id":id,"item_id":line.ItemID,"sku":item.SKU,"quantity_ordered":line.QuantityOrdered,"quantity_received":line.QuantityReceived,"line_number":line.LineNumber,"po_status":status})
		case "close":
			if r.Method!=http.MethodPost{writeJSON(w,405,map[string]string{"error":"method not allowed"});return};status,err:=s.purchaseOrders.Close(id);if err!=nil{writePurchaseOrderError(w,err);return};writeJSON(w,200,map[string]string{"message":"Purchase order closed","status":status})
		case "reopen":
			if r.Method!=http.MethodPost{writeJSON(w,405,map[string]string{"error":"method not allowed"});return};status,err:=s.purchaseOrders.Reopen(id);if err!=nil{writePurchaseOrderError(w,err);return};writeJSON(w,200,map[string]string{"message":"Purchase order reopened","status":status})
		default:writeJSON(w,404,map[string]string{"error":"Not found"})
		};return
	}
	if len(parts)==3&&parts[1]=="lines"{
		lineID,valid:=positivePathID(parts[2]);if !valid{writeJSON(w,400,map[string]string{"error":"invalid po_line_id"});return}
		switch r.Method{
		case http.MethodPatch:
			var input struct{QuantityOrdered int64 `json:"quantity_ordered"`};if err:=decodeStrictJSON(r,&input);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			line,status,err:=s.purchaseOrders.UpdateLine(id,lineID,input.QuantityOrdered);if err!=nil{writePurchaseOrderError(w,err);return};writeJSON(w,200,map[string]any{"po_line_id":line.POLineID,"quantity_ordered":line.QuantityOrdered,"quantity_received":line.QuantityReceived,"status":line.Status,"po_status":status})
		case http.MethodDelete:
			status,err:=s.purchaseOrders.DeleteLine(id,lineID);if err!=nil{writePurchaseOrderError(w,err);return};writeJSON(w,200,map[string]any{"po_line_id":lineID,"deleted":true,"po_status":status})
		default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
		};return
	}
	writeJSON(w,404,map[string]string{"error":"Not found"})
}

func poListResponse(po purchaseorders.PurchaseOrder)map[string]any{
	return map[string]any{"po_id":po.POID,"po_number":po.PONumber,"po_barcode":po.POBarcode,"vendor_name":po.VendorName,"status":po.Status,"expected_date":po.ExpectedDate,"warehouse_id":po.WarehouseID,"notes":po.Notes,"created_at":po.CreatedAt,"received_at":po.ReceivedAt,"created_by":po.CreatedBy}
}
func writePurchaseOrderDetail(w http.ResponseWriter,po purchaseorders.PurchaseOrder,master *catalog.Repository,status int){
	lines:=make([]map[string]any,0,len(po.Lines))
	for _,line:=range po.Lines{item,err:=master.GetItem(line.ItemID);if err!=nil{writePurchaseOrderError(w,err);return};lines=append(lines,map[string]any{"po_line_id":line.POLineID,"line_number":line.LineNumber,"item_id":line.ItemID,"sku":item.SKU,"item_name":item.ItemName,"upc":item.UPC,"mpn":item.MPN,"quantity_ordered":line.QuantityOrdered,"quantity_received":line.QuantityReceived,"unit_cost":line.UnitCost,"status":line.Status})}
	header:=map[string]any{"po_id":po.POID,"po_number":po.PONumber,"po_barcode":po.POBarcode,"vendor_name":po.VendorName,"status":po.Status,"expected_date":po.ExpectedDate,"warehouse_id":po.WarehouseID,"notes":po.Notes,"created_at":po.CreatedAt}
	writeJSON(w,status,map[string]any{"purchase_order":header,"lines":lines})
}
func writePurchaseOrderError(w http.ResponseWriter,err error){
	var replicationErr *corestore.ReplicationError
	switch{
	case errors.As(err,&replicationErr):writeJSON(w,503,map[string]any{"error":"replication_pending","message":err.Error(),"local_commit":true})
	case errors.Is(err,corestore.ErrNotPrimary):writeJSON(w,409,map[string]string{"error":err.Error()})
	case errors.Is(err,purchaseorders.ErrNotFound):writeJSON(w,404,map[string]string{"error":"Purchase order not found"})
	case errors.Is(err,purchaseorders.ErrDuplicate):writeJSON(w,400,map[string]string{"error":"Duplicate purchase order or line"})
	case errors.Is(err,purchaseorders.ErrLocked):writeJSON(w,409,map[string]string{"error":err.Error()})
	case errors.Is(err,purchaseorders.ErrReceivedLine):writeJSON(w,400,map[string]string{"error":err.Error()})
	case errors.Is(err,purchaseorders.ErrInvalid):writeJSON(w,400,map[string]string{"error":"Invalid purchase order data"})
	default:writeJSON(w,500,map[string]string{"error":err.Error()})
	}
}
