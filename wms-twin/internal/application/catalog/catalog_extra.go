package catalog

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

const (
	itemKind = "items"
	vendorKind = "vendors"
	preferredKind = "preferred-bins"
)

type Item struct {
	ItemID int64 `json:"item_id"`
	SKU string `json:"sku"`
	ItemName string `json:"item_name"`
	Description *string `json:"description"`
	UPC *string `json:"upc"`
	MPN *string `json:"mpn"`
	BarcodeAliases []string `json:"barcode_aliases"`
	Category *string `json:"category"`
	WeightLbs *float64 `json:"weight_lbs"`
	LengthIn *float64 `json:"length_in"`
	WidthIn *float64 `json:"width_in"`
	HeightIn *float64 `json:"height_in"`
	DefaultBinID *int64 `json:"default_bin_id"`
	ReorderPoint int64 `json:"reorder_point"`
	ReorderQty int64 `json:"reorder_qty"`
	IsLotTracked bool `json:"is_lot_tracked"`
	IsSerialTracked bool `json:"is_serial_tracked"`
	IsActive bool `json:"is_active"`
	ExternalID string `json:"external_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
}
type ItemInput struct {
	SKU string `json:"sku"`
	ItemName string `json:"item_name"`
	Description *string `json:"description"`
	UPC *string `json:"upc"`
	MPN *string `json:"mpn"`
	Category *string `json:"category"`
	WeightLbs *float64 `json:"weight_lbs"`
	DefaultBinID *int64 `json:"default_bin_id"`
}
type ItemPatch struct {
	SKU *string `json:"sku"`
	ItemName *string `json:"item_name"`
	Description *string `json:"description"`
	UPC *string `json:"upc"`
	MPN *string `json:"mpn"`
	Category *string `json:"category"`
	WeightLbs *float64 `json:"weight_lbs"`
	DefaultBinID *int64 `json:"default_bin_id"`
	ReorderPoint *int64 `json:"reorder_point"`
	ReorderQty *int64 `json:"reorder_qty"`
	IsActive *bool `json:"is_active"`
}

type PreferredBin struct {
	PreferredBinID int64 `json:"preferred_bin_id"`
	ItemID int64 `json:"item_id"`
	BinID int64 `json:"bin_id"`
	Priority int `json:"priority"`
	Notes *string `json:"notes"`
	UpdatedAt time.Time `json:"updated_at"`
}
type preferredState struct {
	NextID int64 `json:"next_id"`
	Rows []PreferredBin `json:"rows"`
}
type PreferredBinInput struct {
	ItemID int64 `json:"item_id"`
	BinID int64 `json:"bin_id"`
	Priority int `json:"priority"`
}
type Vendor struct {
	CanonicalID string `json:"canonical_id"`
	ExternalID string `json:"external_id"`
	VendorName string `json:"vendor_name"`
	ContactName *string `json:"contact_name"`
	Email *string `json:"email"`
	Phone *string `json:"phone"`
	BillingAddress *string `json:"billing_address"`
	RemitToAddress *string `json:"remit_to_address"`
	TaxID *string `json:"tax_id"`
	PaymentTerms *string `json:"payment_terms"`
	IsActive bool `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
type VendorInput struct {
	VendorName string `json:"vendor_name"`
	ContactName *string `json:"contact_name"`
	Email *string `json:"email"`
	Phone *string `json:"phone"`
	BillingAddress *string `json:"billing_address"`
	RemitToAddress *string `json:"remit_to_address"`
	TaxID *string `json:"tax_id"`
	PaymentTerms *string `json:"payment_terms"`
	IsActive *bool `json:"is_active"`
}
type VendorPatch struct {
	VendorName *string `json:"vendor_name"`
	ContactName *string `json:"contact_name"`
	Email *string `json:"email"`
	Phone *string `json:"phone"`
	BillingAddress *string `json:"billing_address"`
	RemitToAddress *string `json:"remit_to_address"`
	TaxID *string `json:"tax_id"`
	PaymentTerms *string `json:"payment_terms"`
	IsActive *bool `json:"is_active"`
}

func (r *Repository) ListItems() ([]Item,error) {
	r.mu.Lock();defer r.mu.Unlock()
	values,err:=listJSON[Item](r.store,itemKind)
	sort.Slice(values,func(i,j int)bool{return values[i].ItemID<values[j].ItemID})
	return values,err
}
func (r *Repository) GetItem(id int64)(Item,error){
	r.mu.Lock();defer r.mu.Unlock()
	v,ok,err:=getJSON[Item](r.store,itemKind,id);if err!=nil{return v,err};if !ok{return v,ErrNotFound};return v,nil
}
func (r *Repository) CreateItem(input ItemInput)(Item,error){
	r.mu.Lock();defer r.mu.Unlock()
	if err:=validateItemInput(input);err!=nil{return Item{},err}
	if input.DefaultBinID!=nil{if _,ok,err:=getJSON[Bin](r.store,binKind,*input.DefaultBinID);err!=nil{return Item{},err}else if !ok{return Item{},ErrNotFound}}
	all,err:=listJSON[Item](r.store,itemKind);if err!=nil{return Item{},err}
	for _,v:=range all{if v.SKU==input.SKU{return Item{},ErrDuplicate};if input.UPC!=nil&&*input.UPC!=""&&v.UPC!=nil&&*v.UPC==*input.UPC{return Item{},ErrDuplicate}}
	id,err:=r.nextID(itemKind);if err!=nil{return Item{},err}
	external,err:=newUUID();if err!=nil{return Item{},err}
	v:=Item{ItemID:id,SKU:input.SKU,ItemName:input.ItemName,Description:input.Description,UPC:input.UPC,MPN:input.MPN,BarcodeAliases:[]string{},Category:input.Category,WeightLbs:input.WeightLbs,DefaultBinID:input.DefaultBinID,IsActive:true,ExternalID:external,CreatedAt:time.Now().UTC()}
	if err:=putJSON(r.store,itemKind,id,v);err!=nil{return v,err};return v,nil
}
func validateItemInput(v ItemInput)error{
	if strings.TrimSpace(v.SKU)==""||len(v.SKU)>128||strings.TrimSpace(v.ItemName)==""||len(v.ItemName)>256{return ErrInvalid}
	if v.Description!=nil&&len(*v.Description)>1000||v.UPC!=nil&&len(*v.UPC)>128||v.MPN!=nil&&len(*v.MPN)>64||v.Category!=nil&&len(*v.Category)>128{return ErrInvalid}
	if v.WeightLbs!=nil&&(*v.WeightLbs<0||*v.WeightLbs>99999)||v.DefaultBinID!=nil&&*v.DefaultBinID<=0{return ErrInvalid}
	return nil
}
func (r *Repository) UpdateItem(id int64,p ItemPatch)(Item,error){
	r.mu.Lock();defer r.mu.Unlock()
	v,ok,err:=getJSON[Item](r.store,itemKind,id);if err!=nil{return v,err};if !ok{return v,ErrNotFound}
	if p.SKU==nil&&p.ItemName==nil&&p.Description==nil&&p.UPC==nil&&p.MPN==nil&&p.Category==nil&&p.WeightLbs==nil&&p.DefaultBinID==nil&&p.ReorderPoint==nil&&p.ReorderQty==nil&&p.IsActive==nil{return v,ErrInvalid}
	if p.SKU!=nil{if strings.TrimSpace(*p.SKU)==""||len(*p.SKU)>128{return v,ErrInvalid};all,e:=listJSON[Item](r.store,itemKind);if e!=nil{return v,e};for _,x:=range all{if x.ItemID!=id&&x.SKU==*p.SKU{return v,ErrDuplicate}};v.SKU=*p.SKU}
	if p.ItemName!=nil{if strings.TrimSpace(*p.ItemName)==""||len(*p.ItemName)>256{return v,ErrInvalid};v.ItemName=*p.ItemName}
	if p.Description!=nil{if len(*p.Description)>1000{return v,ErrInvalid};v.Description=p.Description}
	if p.UPC!=nil{if len(*p.UPC)>128{return v,ErrInvalid};all,e:=listJSON[Item](r.store,itemKind);if e!=nil{return v,e};for _,x:=range all{if x.ItemID!=id&&*p.UPC!=""&&x.UPC!=nil&&*x.UPC==*p.UPC{return v,ErrDuplicate}};v.UPC=p.UPC}
	if p.MPN!=nil{if len(*p.MPN)>64{return v,ErrInvalid};v.MPN=p.MPN}
	if p.Category!=nil{if len(*p.Category)>128{return v,ErrInvalid};v.Category=p.Category}
	if p.WeightLbs!=nil{if *p.WeightLbs<0||*p.WeightLbs>99999{return v,ErrInvalid};v.WeightLbs=p.WeightLbs}
	if p.DefaultBinID!=nil{if *p.DefaultBinID<=0{return v,ErrInvalid};if _,ok,e:=getJSON[Bin](r.store,binKind,*p.DefaultBinID);e!=nil{return v,e}else if !ok{return v,ErrNotFound};v.DefaultBinID=p.DefaultBinID}
	if p.ReorderPoint!=nil{if *p.ReorderPoint<0{return v,ErrInvalid};v.ReorderPoint=*p.ReorderPoint}
	if p.ReorderQty!=nil{if *p.ReorderQty<0{return v,ErrInvalid};v.ReorderQty=*p.ReorderQty}
	if p.IsActive!=nil{v.IsActive=*p.IsActive}
	now:=time.Now().UTC();v.UpdatedAt=&now
	if err:=putJSON(r.store,itemKind,id,v);err!=nil{return v,err};return v,nil
}
func (r *Repository) ToggleItemArchive(id int64)(Item,error){
	r.mu.Lock();defer r.mu.Unlock()
	v,ok,err:=getJSON[Item](r.store,itemKind,id);if err!=nil{return v,err};if !ok{return v,ErrNotFound}
	v.IsActive=!v.IsActive;now:=time.Now().UTC();v.UpdatedAt=&now
	if err:=putJSON(r.store,itemKind,id,v);err!=nil{return v,err};return v,nil
}
func (r *Repository) DeleteItem(id int64)error{
	r.mu.Lock();defer r.mu.Unlock()
	if _,ok,err:=getJSON[Item](r.store,itemKind,id);err!=nil{return err}else if !ok{return ErrNotFound}
	if r.ledger!=nil{balances,_,err:=r.ledger.List();if err!=nil{return err};for _,b:=range balances{if b.ItemID==id{return fmt.Errorf("%w: item is referenced by inventory ledger",ErrDependency)}}}
	state,err:=r.loadPreferredLocked();if err!=nil{return err};for _,pb:=range state.Rows{if pb.ItemID==id{return fmt.Errorf("%w: item has preferred-bin mappings",ErrDependency)}}
	return r.store.Delete(itemKind,strconv.FormatInt(id,10))
}

func (r *Repository) loadPreferredLocked()(preferredState,error){
	record,found,err:=r.store.Get(preferredKind,"global");if err!=nil{return preferredState{},err}
	if !found{return preferredState{NextID:1,Rows:[]PreferredBin{}},nil}
	var state preferredState;if err:=json.Unmarshal(record.Data,&state);err!=nil{return preferredState{},fmt.Errorf("decode preferred-bin aggregate: %w",err)}
	if state.NextID<1{state.NextID=1};if state.Rows==nil{state.Rows=[]PreferredBin{}}
	return state,nil
}
func (r *Repository) savePreferredLocked(state preferredState)error{
	data,err:=json.Marshal(state);if err!=nil{return err};_,err=r.store.Put(preferredKind,"global",data);return err
}
func (r *Repository) ListPreferredBins()([]PreferredBin,error){
	r.mu.Lock();defer r.mu.Unlock();state,err:=r.loadPreferredLocked();if err!=nil{return nil,err}
	sort.Slice(state.Rows,func(i,j int)bool{if state.Rows[i].ItemID==state.Rows[j].ItemID{return state.Rows[i].Priority<state.Rows[j].Priority};return state.Rows[i].ItemID<state.Rows[j].ItemID})
	return state.Rows,nil
}
func (r *Repository) CreatePreferredBin(input PreferredBinInput)error{
	r.mu.Lock();defer r.mu.Unlock()
	if input.ItemID<=0||input.BinID<=0||input.Priority<1||input.Priority>100{return ErrInvalid}
	if _,ok,err:=getJSON[Item](r.store,itemKind,input.ItemID);err!=nil{return err}else if !ok{return ErrNotFound}
	bin,ok,err:=getJSON[Bin](r.store,binKind,input.BinID);if err!=nil{return err};if !ok{return ErrNotFound};if bin.BinType!="Pickable"{return fmt.Errorf("%w: preferred bins must be Pickable",ErrInvalid)}
	state,err:=r.loadPreferredLocked();if err!=nil{return err}
	target:=int64(0);found:=false
	for i:=range state.Rows{if state.Rows[i].ItemID==input.ItemID&&state.Rows[i].BinID==input.BinID{target=state.Rows[i].PreferredBinID;state.Rows[i].Priority=input.Priority;state.Rows[i].UpdatedAt=time.Now().UTC();found=true;break}}
	if !found{target=state.NextID;state.NextID++;state.Rows=append(state.Rows,PreferredBin{PreferredBinID:target,ItemID:input.ItemID,BinID:input.BinID,Priority:input.Priority,UpdatedAt:time.Now().UTC()})}
	resequencePreferred(&state,input.ItemID,target)
	return r.savePreferredLocked(state)
}
func (r *Repository) UpdatePreferredBin(id int64,priority int)error{
	r.mu.Lock();defer r.mu.Unlock();if priority<1||priority>100{return ErrInvalid}
	state,err:=r.loadPreferredLocked();if err!=nil{return err};itemID:=int64(0);target:=false
	for i:=range state.Rows{if state.Rows[i].PreferredBinID==id{itemID=state.Rows[i].ItemID;state.Rows[i].Priority=priority;state.Rows[i].UpdatedAt=time.Now().UTC();target=true;break}}
	if !target{return ErrNotFound};resequencePreferred(&state,itemID,id);return r.savePreferredLocked(state)
}
func (r *Repository) DeletePreferredBin(id int64)error{
	r.mu.Lock();defer r.mu.Unlock();state,err:=r.loadPreferredLocked();if err!=nil{return err}
	itemID:=int64(0);out:=state.Rows[:0];found:=false
	for _,v:=range state.Rows{if v.PreferredBinID==id{itemID=v.ItemID;found=true;continue};out=append(out,v)}
	if !found{return nil};state.Rows=out;resequencePreferred(&state,itemID,0);return r.savePreferredLocked(state)
}
func resequencePreferred(state *preferredState,itemID,targetID int64){
	rows:=make([]PreferredBin,0);for _,v:=range state.Rows{if v.ItemID==itemID{rows=append(rows,v)}}
	sort.Slice(rows,func(i,j int)bool{if rows[i].Priority!=rows[j].Priority{return rows[i].Priority<rows[j].Priority};if rows[i].PreferredBinID==targetID{return true};if rows[j].PreferredBinID==targetID{return false};return rows[i].PreferredBinID<rows[j].PreferredBinID})
	priorityByID:=make(map[int64]int,len(rows));for i,v:=range rows{priorityByID[v.PreferredBinID]=i+1}
	for i:=range state.Rows{if state.Rows[i].ItemID==itemID{state.Rows[i].Priority=priorityByID[state.Rows[i].PreferredBinID]}}
}

func (r *Repository) ListVendors()([]Vendor,error){r.mu.Lock();defer r.mu.Unlock();v,e:=listJSON[Vendor](r.store,vendorKind);sort.Slice(v,func(i,j int)bool{return v[i].VendorName<v[j].VendorName});return v,e}
func (r *Repository) GetVendor(id string)(Vendor,error){r.mu.Lock();defer r.mu.Unlock();v,ok,e:=getVendorJSON(r.store,id);if e!=nil{return v,e};if !ok{return v,ErrNotFound};return v,nil}
func getVendorJSON(store *corestore.Store,id string)(Vendor,bool,error){var v Vendor;record,ok,err:=store.Get(vendorKind,id);if err!=nil||!ok{return v,ok,err};if err:=json.Unmarshal(record.Data,&v);err!=nil{return v,false,err};return v,true,nil}
func (r *Repository) CreateVendor(input VendorInput)(Vendor,error){
	r.mu.Lock();defer r.mu.Unlock();if strings.TrimSpace(input.VendorName)==""||len(input.VendorName)>200{return Vendor{},ErrInvalid}
	if err:=validateVendorFields(input.ContactName,input.Email,input.Phone,input.BillingAddress,input.RemitToAddress,input.TaxID,input.PaymentTerms);err!=nil{return Vendor{},err}
	canonical,err:=newUUID();if err!=nil{return Vendor{},err};external,err:=newUUID();if err!=nil{return Vendor{},err}
	active:=true;if input.IsActive!=nil{active=*input.IsActive}
	now:=time.Now().UTC();v:=Vendor{CanonicalID:canonical,ExternalID:external,VendorName:input.VendorName,ContactName:input.ContactName,Email:input.Email,Phone:input.Phone,BillingAddress:input.BillingAddress,RemitToAddress:input.RemitToAddress,TaxID:input.TaxID,PaymentTerms:input.PaymentTerms,IsActive:active,CreatedAt:now,UpdatedAt:now}
	data,_:=json.Marshal(v);if _,err:=r.store.Put(vendorKind,canonical,data);err!=nil{return v,err};return v,nil
}
func validateVendorFields(values ...*string)error{limits:=[]int{200,255,50,2000,2000,64,64};for i,v:=range values{if v!=nil&&len(*v)>limits[i]{return ErrInvalid}};return nil}
func (r *Repository) UpdateVendor(id string,p VendorPatch)(Vendor,error){
	r.mu.Lock();defer r.mu.Unlock();v,ok,err:=getVendorJSON(r.store,id);if err!=nil{return v,err};if !ok{return v,ErrNotFound}
	if p.VendorName==nil&&p.ContactName==nil&&p.Email==nil&&p.Phone==nil&&p.BillingAddress==nil&&p.RemitToAddress==nil&&p.TaxID==nil&&p.PaymentTerms==nil&&p.IsActive==nil{return v,ErrInvalid}
	if p.VendorName!=nil{if strings.TrimSpace(*p.VendorName)==""||len(*p.VendorName)>200{return v,ErrInvalid};v.VendorName=*p.VendorName}
	if err:=validateVendorFields(p.ContactName,p.Email,p.Phone,p.BillingAddress,p.RemitToAddress,p.TaxID,p.PaymentTerms);err!=nil{return v,err}
	if p.ContactName!=nil{v.ContactName=p.ContactName};if p.Email!=nil{v.Email=p.Email};if p.Phone!=nil{v.Phone=p.Phone};if p.BillingAddress!=nil{v.BillingAddress=p.BillingAddress};if p.RemitToAddress!=nil{v.RemitToAddress=p.RemitToAddress};if p.TaxID!=nil{v.TaxID=p.TaxID};if p.PaymentTerms!=nil{v.PaymentTerms=p.PaymentTerms};if p.IsActive!=nil{v.IsActive=*p.IsActive}
	v.UpdatedAt=time.Now().UTC();data,_:=json.Marshal(v);if _,err:=r.store.Put(vendorKind,id,data);err!=nil{return v,err};return v,nil
}
func (r *Repository) DeleteVendor(id string)error{
	r.mu.Lock();defer r.mu.Unlock();if _,ok,err:=getVendorJSON(r.store,id);err!=nil{return err}else if !ok{return ErrNotFound};return r.store.Delete(vendorKind,id)
}
func newUUID()(string,error){b:=make([]byte,16);if _,err:=rand.Read(b);err!=nil{return "",err};b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;raw:=hex.EncodeToString(b);return raw[:8]+"-"+raw[8:12]+"-"+raw[12:16]+"-"+raw[16:20]+"-"+raw[20:],nil}

