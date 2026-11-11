package purchaseorders

import (
	"encoding/json"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrNotFound = errors.New("purchase order not found")
	ErrDuplicate = errors.New("purchase order value already exists")
	ErrInvalid = errors.New("invalid purchase order data")
	ErrLocked = errors.New("purchase order is locked")
	ErrReceivedLine = errors.New("purchase order line has received quantity")
)

const (
	poKind = "purchase-orders"
	poSequenceKind = "purchase-order-sequences"
	lineSequenceKind = "purchase-order-line-sequences"
	StatusOpen = "OPEN"
	StatusPartial = "PARTIAL"
	StatusReceived = "RECEIVED"
	StatusClosed = "CLOSED"
	StatusArchived = "ARCHIVED"
	LinePending = "PENDING"
	LinePartial = "PARTIAL"
	LineReceived = "RECEIVED"
)

var validStatuses=map[string]bool{StatusOpen:true,StatusPartial:true,StatusReceived:true,StatusClosed:true,StatusArchived:true}

type Line struct {
	POLineID int64 `json:"po_line_id"`
	LineNumber int `json:"line_number"`
	ItemID int64 `json:"item_id"`
	QuantityOrdered int64 `json:"quantity_ordered"`
	QuantityReceived int64 `json:"quantity_received"`
	UnitCost *float64 `json:"unit_cost"`
	Status string `json:"status"`
}
type PurchaseOrder struct {
	POID int64 `json:"po_id"`
	PONumber string `json:"po_number"`
	POBarcode string `json:"po_barcode"`
	VendorName *string `json:"vendor_name"`
	Status string `json:"status"`
	ExpectedDate *string `json:"expected_date"`
	WarehouseID int64 `json:"warehouse_id"`
	Notes *string `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	ReceivedAt *time.Time `json:"received_at"`
	CreatedBy string `json:"created_by"`
	ExternalID string `json:"external_id"`
	Lines []Line `json:"lines"`
}
type LineInput struct {
	ItemID int64 `json:"item_id"`
	QuantityOrdered int64 `json:"quantity_ordered"`
	UnitCost *float64 `json:"unit_cost"`
	LineNumber *int `json:"line_number"`
}
type CreateInput struct {
	PONumber string `json:"po_number"`
	WarehouseID int64 `json:"warehouse_id"`
	Lines []LineInput `json:"lines"`
	POBarcode *string `json:"po_barcode"`
	VendorName *string `json:"vendor_name"`
	ExpectedDate *string `json:"expected_date"`
	Notes *string `json:"notes"`
}
type Patch struct {
	PONumber *string `json:"po_number"`
	POBarcode *string `json:"po_barcode"`
	VendorName *string `json:"vendor_name"`
	ExpectedDate *string `json:"expected_date"`
	Notes *string `json:"notes"`
	Status *string `json:"status"`
}
type AddLineInput struct {
	ItemID int64 `json:"item_id"`
	QuantityOrdered int64 `json:"quantity_ordered"`
	UnitCost *float64 `json:"unit_cost"`
}
type Repository struct { store *corestore.Store; catalog *catalog.Repository; mu sync.Mutex }
func New(store *corestore.Store,master *catalog.Repository)*Repository{return &Repository{store:store,catalog:master}}

func (r *Repository) nextID(kind string)(int64,error){
	record,found,err:=r.store.Get(poSequenceKind,kind);if err!=nil{return 0,err}
	next:=int64(1);if found{var state struct{Next int64 `json:"next"`};if err:=json.Unmarshal(record.Data,&state);err!=nil{return 0,err};if state.Next>0{next=state.Next}}
	data,_:=json.Marshal(map[string]int64{"next":next+1});if _,err:=r.store.Put(poSequenceKind,kind,data);err!=nil{return 0,err};return next,nil
}
func (r *Repository) getLocked(id int64)(PurchaseOrder,error){
	var po PurchaseOrder;record,ok,err:=r.store.Get(poKind,strconv.FormatInt(id,10));if err!=nil{return po,err};if !ok{return po,ErrNotFound}
	if err:=json.Unmarshal(record.Data,&po);err!=nil{return po,fmt.Errorf("decode purchase order: %w",err)};if po.Lines==nil{po.Lines=[]Line{}};return po,nil
}
func (r *Repository) persist(po PurchaseOrder)error{data,err:=json.Marshal(po);if err!=nil{return err};_,err=r.store.Put(poKind,strconv.FormatInt(po.POID,10),data);return err}
func (r *Repository) List()([]PurchaseOrder,error){
	r.mu.Lock();defer r.mu.Unlock();records,err:=r.store.List(poKind);if err!=nil{return nil,err};out:=make([]PurchaseOrder,0,len(records))
	for _,record:=range records{var po PurchaseOrder;if err:=json.Unmarshal(record.Data,&po);err!=nil{return nil,fmt.Errorf("decode purchase order %s: %w",record.ID,err)};out=append(out,po)}
	sort.Slice(out,func(i,j int)bool{return out[i].POID>out[j].POID});return out,nil
}
func (r *Repository) Get(id int64)(PurchaseOrder,error){r.mu.Lock();defer r.mu.Unlock();return r.getLocked(id)}
func (r *Repository) Create(input CreateInput,username string)(PurchaseOrder,error){
	r.mu.Lock();defer r.mu.Unlock()
	if strings.TrimSpace(input.PONumber)==""||len(input.PONumber)>128||input.WarehouseID<=0||len(input.Lines)==0||len(input.Lines)>500{return PurchaseOrder{},ErrInvalid}
	if input.POBarcode!=nil&&len(*input.POBarcode)>128||input.VendorName!=nil&&len(*input.VendorName)>256||input.Notes!=nil&&len(*input.Notes)>1000||!validDate(input.ExpectedDate){return PurchaseOrder{},ErrInvalid}
	if _,err:=r.catalog.GetWarehouse(input.WarehouseID);err!=nil{return PurchaseOrder{},ErrNotFound}
	all,err:=r.store.List(poKind);if err!=nil{return PurchaseOrder{},err};for _,record:=range all{var po PurchaseOrder;if json.Unmarshal(record.Data,&po)==nil&&po.PONumber==input.PONumber{return PurchaseOrder{},ErrDuplicate}}
	id,err:=r.nextID("purchase-orders");if err!=nil{return PurchaseOrder{},err}
	barcode:=input.PONumber;if input.POBarcode!=nil{barcode=*input.POBarcode}
	external,err:=newExternalID();if err!=nil{return PurchaseOrder{},err}
	po:=PurchaseOrder{POID:id,PONumber:input.PONumber,POBarcode:barcode,VendorName:input.VendorName,Status:StatusOpen,ExpectedDate:input.ExpectedDate,WarehouseID:input.WarehouseID,Notes:input.Notes,CreatedAt:time.Now().UTC(),CreatedBy:username,ExternalID:external,Lines:[]Line{}}
	seenItems:=map[int64]bool{};seenLineNumbers:=map[int]bool{}
	for i,line:=range input.Lines{
		if line.ItemID<=0||line.QuantityOrdered<=0||line.QuantityOrdered>1000000||line.UnitCost!=nil&&*line.UnitCost<0{return PurchaseOrder{},ErrInvalid}
		if _,err:=r.catalog.GetItem(line.ItemID);err!=nil{return PurchaseOrder{},fmt.Errorf("%w: item %d",ErrInvalid,line.ItemID)}
		if seenItems[line.ItemID]{return PurchaseOrder{},ErrDuplicate};seenItems[line.ItemID]=true
		lineNumber:=i+1;if line.LineNumber!=nil{lineNumber=*line.LineNumber};if lineNumber<1||seenLineNumbers[lineNumber]{return PurchaseOrder{},ErrInvalid};seenLineNumbers[lineNumber]=true
		lineID,err:=r.nextID("purchase-order-lines");if err!=nil{return PurchaseOrder{},err}
		po.Lines=append(po.Lines,Line{POLineID:lineID,LineNumber:lineNumber,ItemID:line.ItemID,QuantityOrdered:line.QuantityOrdered,UnitCost:line.UnitCost,Status:LinePending})
	}
	if err:=r.persist(po);err!=nil{return po,err};return po,nil
}
func validDate(value *string)bool{if value==nil||*value==""{return true};if len(*value)>32{return false};_,err:=time.Parse("2006-01-02",*value);return err==nil}
func (r *Repository) Update(id int64,p Patch)(PurchaseOrder,error){
	r.mu.Lock();defer r.mu.Unlock();po,err:=r.getLocked(id);if err!=nil{return po,err}
	header:=p.PONumber!=nil||p.POBarcode!=nil||p.VendorName!=nil||p.ExpectedDate!=nil||p.Notes!=nil
	if header&&(po.Status==StatusClosed||po.Status==StatusArchived){return po,ErrLocked}
	if p.PONumber==nil&&p.POBarcode==nil&&p.VendorName==nil&&p.ExpectedDate==nil&&p.Notes==nil&&p.Status==nil{return po,ErrInvalid}
	if p.PONumber!=nil{if strings.TrimSpace(*p.PONumber)==""||len(*p.PONumber)>128{return po,ErrInvalid};records,e:=r.store.List(poKind);if e!=nil{return po,e};for _,record:=range records{var other PurchaseOrder;if json.Unmarshal(record.Data,&other)==nil&&other.POID!=id&&other.PONumber==*p.PONumber{return po,ErrDuplicate}};po.PONumber=*p.PONumber}
	if p.POBarcode!=nil{if len(*p.POBarcode)>128{return po,ErrInvalid};po.POBarcode=*p.POBarcode}
	if p.VendorName!=nil{if len(*p.VendorName)>256{return po,ErrInvalid};po.VendorName=p.VendorName}
	if p.ExpectedDate!=nil{if !validDate(p.ExpectedDate){return po,ErrInvalid};po.ExpectedDate=p.ExpectedDate}
	if p.Notes!=nil{if len(*p.Notes)>1000{return po,ErrInvalid};po.Notes=p.Notes}
	if p.Status!=nil{if !validStatuses[*p.Status]{return po,ErrInvalid};if *p.Status==StatusArchived&&po.Status!=StatusClosed{return po,ErrInvalid};po.Status=*p.Status}
	if err:=r.persist(po);err!=nil{return po,err};return po,nil
}
func (r *Repository) AddLine(id int64,input AddLineInput)(Line,string,error){
	r.mu.Lock();defer r.mu.Unlock();po,err:=r.getLocked(id);if err!=nil{return Line{},"",err};if po.Status==StatusClosed||po.Status==StatusArchived{return Line{},po.Status,ErrLocked}
	if input.ItemID<=0||input.QuantityOrdered<=0||input.QuantityOrdered>1000000||input.UnitCost!=nil&&*input.UnitCost<0{return Line{},po.Status,ErrInvalid}
	if _,err:=r.catalog.GetItem(input.ItemID);err!=nil{return Line{},po.Status,ErrNotFound};for _,line:=range po.Lines{if line.ItemID==input.ItemID{return Line{},po.Status,ErrDuplicate}}
	maxLine:=0;for _,line:=range po.Lines{if line.LineNumber>maxLine{maxLine=line.LineNumber}}
	lineID,err:=r.nextID("purchase-order-lines");if err!=nil{return Line{},po.Status,err}
	line:=Line{POLineID:lineID,LineNumber:maxLine+1,ItemID:input.ItemID,QuantityOrdered:input.QuantityOrdered,UnitCost:input.UnitCost,Status:LinePending};po.Lines=append(po.Lines,line);po.Status=recomputeStatus(&po)
	if err:=r.persist(po);err!=nil{return line,po.Status,err};return line,po.Status,nil
}
func (r *Repository) UpdateLine(id,lineID,quantity int64)(Line,string,error){
	r.mu.Lock();defer r.mu.Unlock();po,err:=r.getLocked(id);if err!=nil{return Line{},"",err};if po.Status==StatusClosed||po.Status==StatusArchived{return Line{},po.Status,ErrLocked};if quantity<=0||quantity>1000000{return Line{},po.Status,ErrInvalid}
	for i:=range po.Lines{line:=&po.Lines[i];if line.POLineID==lineID{if quantity<line.QuantityReceived{return *line,po.Status,ErrReceivedLine};line.QuantityOrdered=quantity;line.Status=lineStatus(line.QuantityReceived,line.QuantityOrdered);po.Status=recomputeStatus(&po);if err:=r.persist(po);err!=nil{return *line,po.Status,err};return *line,po.Status,nil}}
	return Line{},po.Status,ErrNotFound
}
func (r *Repository) DeleteLine(id,lineID int64)(string,error){
	r.mu.Lock();defer r.mu.Unlock();po,err:=r.getLocked(id);if err!=nil{return "",err};if po.Status==StatusClosed||po.Status==StatusArchived{return po.Status,ErrLocked}
	found:=false;out:=po.Lines[:0];for _,line:=range po.Lines{if line.POLineID==lineID{found=true;if line.QuantityReceived>0{return po.Status,ErrReceivedLine};continue};out=append(out,line)}
	if !found{return po.Status,ErrNotFound};po.Lines=out;if len(po.Lines)==0{return po.Status,ErrInvalid};po.Status=recomputeStatus(&po);if err:=r.persist(po);err!=nil{return po.Status,err};return po.Status,nil
}
func (r *Repository) Close(id int64)(string,error){r.mu.Lock();defer r.mu.Unlock();po,err:=r.getLocked(id);if err!=nil{return "",err};if po.Status==StatusClosed{return po.Status,ErrLocked};po.Status=StatusClosed;if err:=r.persist(po);err!=nil{return "",err};return po.Status,nil}
func (r *Repository) Reopen(id int64)(string,error){r.mu.Lock();defer r.mu.Unlock();po,err:=r.getLocked(id);if err!=nil{return "",err};if po.Status!=StatusClosed{return po.Status,ErrLocked};po.Status=StatusOpen;if err:=r.persist(po);err!=nil{return "",err};return po.Status,nil}
func lineStatus(received,ordered int64)string{if received==0{return LinePending};if received>=ordered{return LineReceived};return LinePartial}
func recomputeStatus(po *PurchaseOrder)string{any:=false;all:=len(po.Lines)>0;for i:=range po.Lines{line:=&po.Lines[i];line.Status=lineStatus(line.QuantityReceived,line.QuantityOrdered);if line.QuantityReceived>0{any=true};if line.QuantityReceived<line.QuantityOrdered{all=false}};if all{po.Status=StatusReceived}else if any{po.Status=StatusPartial}else{po.Status=StatusOpen};return po.Status}
func newExternalID()(string,error){b:=make([]byte,16);if _,err:=rand.Read(b);err!=nil{return "",err};b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;raw:=hex.EncodeToString(b);return raw[:8]+"-"+raw[8:12]+"-"+raw[12:16]+"-"+raw[16:20]+"-"+raw[20:],nil}
