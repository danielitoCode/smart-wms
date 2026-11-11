package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

func (s *Server) adminCatalog(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(authContextKey{}).(identity.User)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"Unauthorized"})
		return
	}
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/admin/"), "/")
	parts := strings.Split(path, "/")
	if len(parts)==0 || (parts[0]!="warehouses" && parts[0]!="zones" && parts[0]!="bins") {
		writeJSON(w,http.StatusNotFound,map[string]string{"error":"Not found"});return
	}
	pageKey:=parts[0]
	if user.Role!="ADMIN" && !containsString(user.AllowedPages,pageKey) {
		writeJSON(w,http.StatusForbidden,map[string]string{"error":"Permission denied","page_key":pageKey});return
	}
	switch parts[0] {
	case "warehouses": s.warehouseRoutes(w,r,user,parts[1:])
	case "zones": s.zoneRoutes(w,r,user,parts[1:])
	case "bins": s.binRoutes(w,r,user,parts[1:])
	}
}

func (s *Server) warehouseRoutes(w http.ResponseWriter,r *http.Request,user identity.User,parts []string) {
	if len(parts)>1 {writeJSON(w,400,map[string]string{"error":"invalid warehouse path"});return}
	if len(parts)==0 {
		switch r.Method {
		case http.MethodGet:
			values,err:=s.catalog.ListWarehouses();if err!=nil{writeCatalogError(w,err);return}
			if user.Role!="ADMIN" {allowed:=int64Set(user.WarehouseIDs);filtered:=values[:0];for _,v:=range values{if allowed[v.WarehouseID]{filtered=append(filtered,v)}};values=filtered}
			page,perPage:=pagination(r);items,total,page,pages:=catalog.Paginate(values,page,perPage)
			writeJSON(w,200,map[string]any{"warehouses":items,"total":total,"page":page,"per_page":perPage,"pages":pages})
		case http.MethodPost:
			var input catalog.WarehouseInput;if err:=decodeStrictJSON(r,&input);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			value,err:=s.catalog.CreateWarehouse(input);if err!=nil{writeCatalogError(w,err);return};writeJSON(w,201,value)
		default: writeJSON(w,405,map[string]string{"error":"method not allowed"})
		};return
	}
	id,ok:=positivePathID(parts[0]);if !ok{writeJSON(w,400,map[string]string{"error":"invalid warehouse_id"});return}
	if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,id){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
	switch r.Method {
	case http.MethodGet:
		value,err:=s.catalog.GetWarehouse(id);if err!=nil{writeCatalogError(w,err);return}
		zones,err:=s.catalog.ListZones();if err!=nil{writeCatalogError(w,err);return}
		selected:=make([]catalog.Zone,0);for _,z:=range zones{if z.WarehouseID==id{selected=append(selected,z)}}
		writeJSON(w,200,map[string]any{"warehouse":value,"zones":selected})
	case http.MethodPut:
		var patch catalog.WarehousePatch;if err:=decodeStrictJSON(r,&patch);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
		value,err:=s.catalog.UpdateWarehouse(id,patch);if err!=nil{writeCatalogError(w,err);return};writeJSON(w,200,value)
	case http.MethodDelete:
		if err:=s.catalog.DeleteWarehouse(id);err!=nil{writeCatalogError(w,err);return};writeJSON(w,200,map[string]string{"message":"Warehouse deleted"})
	default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
	}
}

func (s *Server) zoneRoutes(w http.ResponseWriter,r *http.Request,user identity.User,parts []string) {
	if len(parts)>1 {writeJSON(w,400,map[string]string{"error":"invalid zone path"});return}
	if len(parts)==0 {
		switch r.Method {
		case http.MethodGet:
			values,err:=s.catalog.ListZones();if err!=nil{writeCatalogError(w,err);return}
			if raw:=r.URL.Query().Get("warehouse_id");raw!="" {id,ok:=positivePathID(raw);if !ok{writeJSON(w,400,map[string]string{"error":"Invalid warehouse_id"});return};if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,id){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return};values=catalog.FilterZones(values,id)
			} else if user.Role!="ADMIN" {allowed:=int64Set(user.WarehouseIDs);filtered:=values[:0];for _,v:=range values{if allowed[v.WarehouseID]{filtered=append(filtered,v)}};values=filtered}
			page,perPage:=pagination(r);items,total,page,pages:=catalog.Paginate(values,page,perPage)
			writeJSON(w,200,map[string]any{"zones":items,"total":total,"page":page,"per_page":perPage,"pages":pages})
		case http.MethodPost:
			var input catalog.ZoneInput;if err:=decodeStrictJSON(r,&input);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,input.WarehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
			value,err:=s.catalog.CreateZone(input);if err!=nil{writeCatalogError(w,err);return};writeJSON(w,201,value)
		default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
		};return
	}
	id,ok:=positivePathID(parts[0]);if !ok{writeJSON(w,400,map[string]string{"error":"invalid zone_id"});return}
	value,err:=s.catalog.GetZone(id);if err!=nil{writeCatalogError(w,err);return}
	if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,value.WarehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
	switch r.Method {
	case http.MethodPut:
		var patch catalog.ZonePatch;if err:=decodeStrictJSON(r,&patch);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
		updated,err:=s.catalog.UpdateZone(id,patch);if err!=nil{writeCatalogError(w,err);return};writeJSON(w,200,updated)
	case http.MethodDelete:
		if err:=s.catalog.DeleteZone(id);err!=nil{writeCatalogError(w,err);return};writeJSON(w,200,map[string]string{"message":"Zone deleted"})
	default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
	}
}

func (s *Server) binRoutes(w http.ResponseWriter,r *http.Request,user identity.User,parts []string) {
	if len(parts)>1 {writeJSON(w,400,map[string]string{"error":"invalid bin path"});return}
	if len(parts)==0 {
		switch r.Method {
		case http.MethodGet:
			values,err:=s.catalog.ListBins();if err!=nil{writeCatalogError(w,err);return}
			warehouseID,zoneID:=int64(0),int64(0)
			if raw:=r.URL.Query().Get("warehouse_id");raw!=""{warehouseID,okID:=positivePathID(raw);if !okID{writeJSON(w,400,map[string]string{"error":"Invalid warehouse_id"});return}}
			if raw:=r.URL.Query().Get("zone_id");raw!=""{zoneID,okID:=positivePathID(raw);if !okID{writeJSON(w,400,map[string]string{"error":"Invalid zone_id"});return}}
			if user.Role!="ADMIN" {if warehouseID>0&&!containsInt64(user.WarehouseIDs,warehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return};if warehouseID==0{allowed:=int64Set(user.WarehouseIDs);filtered:=values[:0];for _,v:=range values{if allowed[v.WarehouseID]{filtered=append(filtered,v)}};values=filtered}}
			values=catalog.FilterBins(values,warehouseID,zoneID,r.URL.Query().Get("bin_type"),r.URL.Query().Get("q"))
			page,perPage:=pagination(r);items,total,page,pages:=catalog.Paginate(values,page,perPage)
			zones,err:=s.catalog.ListZones();if err!=nil{writeCatalogError(w,err);return};zoneNames:=map[int64]string{};for _,z:=range zones{zoneNames[z.ZoneID]=z.ZoneName}
			response:=make([]map[string]any,0,len(items));for _,b:=range items{response=append(response,binResponse(b,zoneNames[b.ZoneID]))}
			writeJSON(w,200,map[string]any{"bins":response,"total":total,"page":page,"per_page":perPage,"pages":pages})
		case http.MethodPost:
			var input catalog.BinInput;if err:=decodeStrictJSON(r,&input);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
			if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,input.WarehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
			value,err:=s.catalog.CreateBin(input);if err!=nil{writeCatalogError(w,err);return};zone,err:=s.catalog.GetZone(value.ZoneID);if err!=nil{writeCatalogError(w,err);return};writeJSON(w,201,binResponse(value,zone.ZoneName))
		default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
		};return
	}
	id,ok:=positivePathID(parts[0]);if !ok{writeJSON(w,400,map[string]string{"error":"invalid bin_id"});return}
	value,err:=s.catalog.GetBin(id);if err!=nil{writeCatalogError(w,err);return}
	if user.Role!="ADMIN"&&!containsInt64(user.WarehouseIDs,value.WarehouseID){writeJSON(w,403,map[string]string{"error":"Access denied for this warehouse"});return}
	switch r.Method {
	case http.MethodGet:
		zone,err:=s.catalog.GetZone(value.ZoneID);if err!=nil{writeCatalogError(w,err);return}
		inventoryRows:=make([]any,0);balances,_,err:=s.ledger.List();if err!=nil{writeCatalogError(w,err);return}
		for _,balance:=range balances{if balance.BinID==id{inventoryRows=append(inventoryRows,balance)}}
		writeJSON(w,200,map[string]any{"bin":binResponse(value,zone.ZoneName),"inventory":inventoryRows})
	case http.MethodPut:
		var patch catalog.BinPatch;if err:=decodeStrictJSON(r,&patch);err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return}
		updated,err:=s.catalog.UpdateBin(id,patch);if err!=nil{writeCatalogError(w,err);return};zone,err:=s.catalog.GetZone(updated.ZoneID);if err!=nil{writeCatalogError(w,err);return};writeJSON(w,200,binResponse(updated,zone.ZoneName))
	case http.MethodDelete:
		if err:=s.catalog.DeleteBin(id);err!=nil{writeCatalogError(w,err);return};writeJSON(w,200,map[string]string{"message":"Bin deleted"})
	default:writeJSON(w,405,map[string]string{"error":"method not allowed"})
	}
}

func binResponse(b catalog.Bin,zoneName string) map[string]any {
	return map[string]any{"bin_id":b.BinID,"zone_id":b.ZoneID,"zone_name":zoneName,"warehouse_id":b.WarehouseID,"bin_code":b.BinCode,"bin_barcode":b.BinBarcode,"bin_type":b.BinType,"aisle":b.Aisle,"row_num":b.RowNum,"level_num":b.LevelNum,"position_num":b.PositionNum,"pick_sequence":b.PickSequence,"putaway_sequence":b.PutawaySequence,"is_active":b.IsActive}
}
func pagination(r *http.Request)(int,int){page,_:=strconv.Atoi(r.URL.Query().Get("page"));per,_:=strconv.Atoi(r.URL.Query().Get("per_page"));if page<1{page=1};if per<1{per=50};if per>1000{per=1000};return page,per}
func positivePathID(raw string)(int64,bool){id,err:=strconv.ParseInt(raw,10,64);return id,err==nil&&id>0}
func containsInt64(values []int64,target int64)bool{for _,v:=range values{if v==target{return true}};return false}
func int64Set(values []int64)map[int64]bool{out:=make(map[int64]bool,len(values));for _,v:=range values{out[v]=true};return out}
func writeCatalogError(w http.ResponseWriter,err error){
	var replicationErr *corestore.ReplicationError
	switch {
	case errors.As(err,&replicationErr):writeJSON(w,503,map[string]any{"error":"replication_pending","message":err.Error(),"local_commit":true})
	case errors.Is(err,corestore.ErrNotPrimary):writeJSON(w,409,map[string]string{"error":err.Error()})
	case errors.Is(err,catalog.ErrNotFound):writeJSON(w,404,map[string]string{"error":"Not found"})
	case errors.Is(err,catalog.ErrDuplicate):writeJSON(w,400,map[string]string{"error":"Duplicate value"})
	case errors.Is(err,catalog.ErrDependency):writeJSON(w,409,map[string]string{"error":err.Error()})
	case errors.Is(err,catalog.ErrInvalid):writeJSON(w,400,map[string]string{"error":"Invalid catalog data"})
	case errors.Is(err,inventoryledger.ErrCorruptLedger):writeJSON(w,500,map[string]string{"error":err.Error()})
	default:writeJSON(w,500,map[string]string{"error":err.Error()})
	}
}
