package catalog

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
)

var (
	ErrNotFound   = errors.New("catalog record not found")
	ErrDuplicate  = errors.New("catalog value already exists")
	ErrDependency = errors.New("catalog record has dependent data")
	ErrInvalid    = errors.New("invalid catalog data")
)

const (
	warehouseKind = "warehouses"
	zoneKind      = "zones"
	binKind       = "bins"
	sequenceKind  = "catalog-sequences"
)

var validZoneTypes = map[string]bool{"RECEIVING": true, "STORAGE": true, "PICKING": true, "STAGING": true, "SHIPPING": true}
var validBinTypes = map[string]bool{"Staging": true, "PickableStaging": true, "Pickable": true}

type Warehouse struct {
	WarehouseID   int64     `json:"warehouse_id"`
	WarehouseCode string    `json:"warehouse_code"`
	WarehouseName string    `json:"warehouse_name"`
	Address       *string   `json:"address"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
}

type Zone struct {
	ZoneID      int64  `json:"zone_id"`
	WarehouseID int64  `json:"warehouse_id"`
	ZoneCode    string `json:"zone_code"`
	ZoneName    string `json:"zone_name"`
	ZoneType    string `json:"zone_type"`
	IsActive    bool   `json:"is_active"`
}

type Bin struct {
	BinID           int64   `json:"bin_id"`
	ZoneID          int64   `json:"zone_id"`
	WarehouseID     int64   `json:"warehouse_id"`
	BinCode         string  `json:"bin_code"`
	BinBarcode      string  `json:"bin_barcode"`
	BinType         string  `json:"bin_type"`
	Aisle           *string `json:"aisle"`
	RowNum          *int    `json:"row_num"`
	LevelNum        *int    `json:"level_num"`
	PositionNum     *int    `json:"position_num"`
	PickSequence    int     `json:"pick_sequence"`
	PutawaySequence int     `json:"putaway_sequence"`
	IsActive        bool    `json:"is_active"`
}

type WarehouseInput struct {
	WarehouseCode string  `json:"warehouse_code"`
	WarehouseName string  `json:"warehouse_name"`
	Address       *string `json:"address"`
}
type WarehousePatch struct {
	WarehouseCode *string `json:"warehouse_code"`
	WarehouseName *string `json:"warehouse_name"`
	Address       *string `json:"address"`
	IsActive      *bool   `json:"is_active"`
}
type ZoneInput struct {
	WarehouseID int64  `json:"warehouse_id"`
	ZoneCode    string `json:"zone_code"`
	ZoneName    string `json:"zone_name"`
	ZoneType    string `json:"zone_type"`
}
type ZonePatch struct {
	ZoneCode *string `json:"zone_code"`
	ZoneName *string `json:"zone_name"`
	ZoneType *string `json:"zone_type"`
	IsActive *bool   `json:"is_active"`
}
type BinInput struct {
	ZoneID          int64   `json:"zone_id"`
	WarehouseID     int64   `json:"warehouse_id"`
	BinCode         string  `json:"bin_code"`
	BinBarcode      string  `json:"bin_barcode"`
	BinType         string  `json:"bin_type"`
	Aisle           *string `json:"aisle"`
	RowNum          *int    `json:"row_num"`
	LevelNum        *int    `json:"level_num"`
	PositionNum     *int    `json:"position_num"`
	PickSequence    int     `json:"pick_sequence"`
	PutawaySequence int     `json:"putaway_sequence"`
}
type BinPatch struct {
	BinCode         *string `json:"bin_code"`
	BinBarcode      *string `json:"bin_barcode"`
	BinType         *string `json:"bin_type"`
	Aisle           *string `json:"aisle"`
	RowNum          *int    `json:"row_num"`
	LevelNum        *int    `json:"level_num"`
	PositionNum     *int    `json:"position_num"`
	PickSequence    *int    `json:"pick_sequence"`
	PutawaySequence *int    `json:"putaway_sequence"`
	IsActive        *bool   `json:"is_active"`
	ZoneID          *int64  `json:"zone_id"`
}

type Repository struct {
	store  *corestore.Store
	ledger *inventoryledger.Ledger
	mu     sync.Mutex
}

func New(store *corestore.Store, ledger *inventoryledger.Ledger) *Repository {
	return &Repository{store: store, ledger: ledger}
}

func (r *Repository) nextID(kind string) (int64, error) {
	record, found, err := r.store.Get(sequenceKind, kind)
	if err != nil {
		return 0, err
	}
	var sequence struct {
		Next int64 `json:"next"`
	}
	if found {
		if err := json.Unmarshal(record.Data, &sequence); err != nil {
			return 0, fmt.Errorf("decode %s sequence: %w", kind, err)
		}
	}
	if sequence.Next < 1 {
		sequence.Next = 1
	}
	data, _ := json.Marshal(map[string]int64{"next": sequence.Next + 1})
	if _, err := r.store.Put(sequenceKind, kind, data); err != nil {
		return 0, err
	}
	return sequence.Next, nil
}

func putJSON[T any](store *corestore.Store, kind string, id int64, value T) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = store.Put(kind, strconv.FormatInt(id, 10), data)
	return err
}
func getJSON[T any](store *corestore.Store, kind string, id int64) (T, bool, error) {
	var value T
	record, found, err := store.Get(kind, strconv.FormatInt(id, 10))
	if err != nil || !found {
		return value, found, err
	}
	if err := json.Unmarshal(record.Data, &value); err != nil {
		return value, false, fmt.Errorf("decode %s/%d: %w", kind, id, err)
	}
	return value, true, nil
}
func listJSON[T any](store *corestore.Store, kind string) ([]T, error) {
	records, err := store.List(kind)
	if err != nil {
		return nil, err
	}
	out := make([]T, 0, len(records))
	for _, record := range records {
		var value T
		if err := json.Unmarshal(record.Data, &value); err != nil {
			return nil, fmt.Errorf("decode %s/%s: %w", kind, record.ID, err)
		}
		out = append(out, value)
	}
	return out, nil
}

func (r *Repository) ListWarehouses() ([]Warehouse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	values, err := listJSON[Warehouse](r.store, warehouseKind)
	sort.Slice(values, func(i, j int) bool { return values[i].WarehouseID < values[j].WarehouseID })
	return values, err
}
func (r *Repository) GetWarehouse(id int64) (Warehouse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	value, ok, err := getJSON[Warehouse](r.store, warehouseKind, id)
	if err != nil {
		return value, err
	}
	if !ok {
		return value, ErrNotFound
	}
	return value, nil
}
func (r *Repository) CreateWarehouse(input WarehouseInput) (Warehouse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if strings.TrimSpace(input.WarehouseCode) == "" || len(input.WarehouseCode) > 32 || strings.TrimSpace(input.WarehouseName) == "" || len(input.WarehouseName) > 256 || (input.Address != nil && len(*input.Address) > 512) {
		return Warehouse{}, ErrInvalid
	}
	all, err := listJSON[Warehouse](r.store, warehouseKind)
	if err != nil {
		return Warehouse{}, err
	}
	for _, current := range all {
		if current.WarehouseCode == input.WarehouseCode {
			return Warehouse{}, ErrDuplicate
		}
	}
	id, err := r.nextID(warehouseKind)
	if err != nil {
		return Warehouse{}, err
	}
	value := Warehouse{WarehouseID: id, WarehouseCode: input.WarehouseCode, WarehouseName: input.WarehouseName, Address: input.Address, IsActive: true, CreatedAt: time.Now().UTC()}
	if err := putJSON(r.store, warehouseKind, id, value); err != nil {
		return Warehouse{}, err
	}
	return value, nil
}
func (r *Repository) UpdateWarehouse(id int64, patch WarehousePatch) (Warehouse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	value, ok, err := getJSON[Warehouse](r.store, warehouseKind, id)
	if err != nil {
		return value, err
	}
	if !ok {
		return value, ErrNotFound
	}
	if patch.WarehouseCode == nil && patch.WarehouseName == nil && patch.Address == nil && patch.IsActive == nil {
		return value, ErrInvalid
	}
	if patch.WarehouseCode != nil {
		if strings.TrimSpace(*patch.WarehouseCode) == "" || len(*patch.WarehouseCode) > 32 {
			return value, ErrInvalid
		}
		all, e := listJSON[Warehouse](r.store, warehouseKind)
		if e != nil {
			return value, e
		}
		for _, v := range all {
			if v.WarehouseID != id && v.WarehouseCode == *patch.WarehouseCode {
				return value, ErrDuplicate
			}
		}
		value.WarehouseCode = *patch.WarehouseCode
	}
	if patch.WarehouseName != nil {
		if strings.TrimSpace(*patch.WarehouseName) == "" || len(*patch.WarehouseName) > 256 {
			return value, ErrInvalid
		}
		value.WarehouseName = *patch.WarehouseName
	}
	if patch.Address != nil {
		if len(*patch.Address) > 512 {
			return value, ErrInvalid
		}
		value.Address = patch.Address
	}
	if patch.IsActive != nil {
		value.IsActive = *patch.IsActive
	}
	if err := putJSON(r.store, warehouseKind, id, value); err != nil {
		return value, err
	}
	return value, nil
}
func (r *Repository) DeleteWarehouse(id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok, err := getJSON[Warehouse](r.store, warehouseKind, id); err != nil {
		return err
	} else if !ok {
		return ErrNotFound
	}
	zones, err := listJSON[Zone](r.store, zoneKind)
	if err != nil {
		return err
	}
	for _, z := range zones {
		if z.WarehouseID == id {
			return fmt.Errorf("%w: warehouse has zones", ErrDependency)
		}
	}
	bins, err := listJSON[Bin](r.store, binKind)
	if err != nil {
		return err
	}
	for _, b := range bins {
		if b.WarehouseID == id {
			return fmt.Errorf("%w: warehouse has bins", ErrDependency)
		}
	}
	if r.ledger != nil {
		balances, _, err := r.ledger.List()
		if err != nil {
			return err
		}
		for _, b := range balances {
			if b.WarehouseID == id && b.OnHand > 0 {
				return fmt.Errorf("%w: warehouse has inventory", ErrDependency)
			}
		}
	}
	return r.store.Delete(warehouseKind, strconv.FormatInt(id, 10))
}

func (r *Repository) ListZones() ([]Zone, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, e := listJSON[Zone](r.store, zoneKind)
	sort.Slice(v, func(i, j int) bool { return v[i].ZoneID < v[j].ZoneID })
	return v, e
}
func (r *Repository) GetZone(id int64) (Zone, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok, e := getJSON[Zone](r.store, zoneKind, id)
	if e != nil {
		return v, e
	}
	if !ok {
		return v, ErrNotFound
	}
	return v, nil
}
func (r *Repository) CreateZone(input ZoneInput) (Zone, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if input.WarehouseID <= 0 || strings.TrimSpace(input.ZoneCode) == "" || len(input.ZoneCode) > 32 || strings.TrimSpace(input.ZoneName) == "" || len(input.ZoneName) > 128 || !validZoneTypes[input.ZoneType] {
		return Zone{}, ErrInvalid
	}
	if _, ok, e := getJSON[Warehouse](r.store, warehouseKind, input.WarehouseID); e != nil {
		return Zone{}, e
	} else if !ok {
		return Zone{}, ErrNotFound
	}
	all, e := listJSON[Zone](r.store, zoneKind)
	if e != nil {
		return Zone{}, e
	}
	for _, v := range all {
		if v.WarehouseID == input.WarehouseID && v.ZoneCode == input.ZoneCode {
			return Zone{}, ErrDuplicate
		}
	}
	id, e := r.nextID(zoneKind)
	if e != nil {
		return Zone{}, e
	}
	v := Zone{ZoneID: id, WarehouseID: input.WarehouseID, ZoneCode: input.ZoneCode, ZoneName: input.ZoneName, ZoneType: input.ZoneType, IsActive: true}
	if e = putJSON(r.store, zoneKind, id, v); e != nil {
		return v, e
	}
	return v, nil
}
func (r *Repository) UpdateZone(id int64, p ZonePatch) (Zone, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok, e := getJSON[Zone](r.store, zoneKind, id)
	if e != nil {
		return v, e
	}
	if !ok {
		return v, ErrNotFound
	}
	if p.ZoneCode == nil && p.ZoneName == nil && p.ZoneType == nil && p.IsActive == nil {
		return v, ErrInvalid
	}
	if p.ZoneCode != nil {
		if strings.TrimSpace(*p.ZoneCode) == "" || len(*p.ZoneCode) > 32 {
			return v, ErrInvalid
		}
		all, e := listJSON[Zone](r.store, zoneKind)
		if e != nil {
			return v, e
		}
		for _, x := range all {
			if x.ZoneID != id && x.WarehouseID == v.WarehouseID && x.ZoneCode == *p.ZoneCode {
				return v, ErrDuplicate
			}
		}
		v.ZoneCode = *p.ZoneCode
	}
	if p.ZoneName != nil {
		if strings.TrimSpace(*p.ZoneName) == "" || len(*p.ZoneName) > 128 {
			return v, ErrInvalid
		}
		v.ZoneName = *p.ZoneName
	}
	if p.ZoneType != nil {
		if !validZoneTypes[*p.ZoneType] {
			return v, ErrInvalid
		}
		v.ZoneType = *p.ZoneType
	}
	if p.IsActive != nil {
		v.IsActive = *p.IsActive
	}
	if e = putJSON(r.store, zoneKind, id, v); e != nil {
		return v, e
	}
	return v, nil
}
func (r *Repository) DeleteZone(id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok, e := getJSON[Zone](r.store, zoneKind, id); e != nil {
		return e
	} else if !ok {
		return ErrNotFound
	}
	bins, e := listJSON[Bin](r.store, binKind)
	if e != nil {
		return e
	}
	count := 0
	for _, b := range bins {
		if b.ZoneID == id {
			count++
		}
	}
	if count > 0 {
		return fmt.Errorf("%w: zone has %d assigned bin(s)", ErrDependency, count)
	}
	return r.store.Delete(zoneKind, strconv.FormatInt(id, 10))
}

func (r *Repository) ListBins() ([]Bin, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, e := listJSON[Bin](r.store, binKind)
	sort.Slice(v, func(i, j int) bool { return v[i].BinID < v[j].BinID })
	return v, e
}
func (r *Repository) GetBin(id int64) (Bin, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok, e := getJSON[Bin](r.store, binKind, id)
	if e != nil {
		return v, e
	}
	if !ok {
		return v, ErrNotFound
	}
	return v, nil
}
func (r *Repository) CreateBin(input BinInput) (Bin, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if input.ZoneID <= 0 || input.WarehouseID <= 0 || strings.TrimSpace(input.BinCode) == "" || len(input.BinCode) > 64 || strings.TrimSpace(input.BinBarcode) == "" || len(input.BinBarcode) > 128 || !validBinTypes[input.BinType] || !validOptionalInt(input.RowNum) || !validOptionalInt(input.LevelNum) || !validOptionalInt(input.PositionNum) || input.PickSequence < 0 || input.PutawaySequence < 0 || (input.Aisle != nil && len(*input.Aisle) > 32) {
		return Bin{}, ErrInvalid
	}
	if _, ok, e := getJSON[Warehouse](r.store, warehouseKind, input.WarehouseID); e != nil {
		return Bin{}, e
	} else if !ok {
		return Bin{}, ErrNotFound
	}
	zone, ok, e := getJSON[Zone](r.store, zoneKind, input.ZoneID)
	if e != nil {
		return Bin{}, e
	}
	if !ok {
		return Bin{}, ErrNotFound
	}
	if zone.WarehouseID != input.WarehouseID {
		return Bin{}, fmt.Errorf("%w: zone does not belong to warehouse", ErrInvalid)
	}
	all, e := listJSON[Bin](r.store, binKind)
	if e != nil {
		return Bin{}, e
	}
	for _, v := range all {
		if v.WarehouseID == input.WarehouseID && v.BinCode == input.BinCode {
			return Bin{}, ErrDuplicate
		}
		if v.BinBarcode == input.BinBarcode {
			return Bin{}, ErrDuplicate
		}
	}
	id, e := r.nextID(binKind)
	if e != nil {
		return Bin{}, e
	}
	v := Bin{BinID: id, ZoneID: input.ZoneID, WarehouseID: input.WarehouseID, BinCode: input.BinCode, BinBarcode: input.BinBarcode, BinType: input.BinType, Aisle: input.Aisle, RowNum: input.RowNum, LevelNum: input.LevelNum, PositionNum: input.PositionNum, PickSequence: input.PickSequence, PutawaySequence: input.PutawaySequence, IsActive: true}
	if e = putJSON(r.store, binKind, id, v); e != nil {
		return v, e
	}
	return v, nil
}
func validOptionalInt(v *int) bool { return v == nil || *v >= 0 }
func (r *Repository) UpdateBin(id int64, p BinPatch) (Bin, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok, e := getJSON[Bin](r.store, binKind, id)
	if e != nil {
		return v, e
	}
	if !ok {
		return v, ErrNotFound
	}
	if p.BinCode == nil && p.BinBarcode == nil && p.BinType == nil && p.Aisle == nil && p.RowNum == nil && p.LevelNum == nil && p.PositionNum == nil && p.PickSequence == nil && p.PutawaySequence == nil && p.IsActive == nil && p.ZoneID == nil {
		return v, ErrInvalid
	}
	if p.BinCode != nil {
		if strings.TrimSpace(*p.BinCode) == "" || len(*p.BinCode) > 64 {
			return v, ErrInvalid
		}
		all, e := listJSON[Bin](r.store, binKind)
		if e != nil {
			return v, e
		}
		for _, x := range all {
			if x.BinID != id && x.WarehouseID == v.WarehouseID && x.BinCode == *p.BinCode {
				return v, ErrDuplicate
			}
		}
		v.BinCode = *p.BinCode
	}
	if p.BinBarcode != nil {
		if len(*p.BinBarcode) > 128 {
			return v, ErrInvalid
		}
		all, e := listJSON[Bin](r.store, binKind)
		if e != nil {
			return v, e
		}
		for _, x := range all {
			if x.BinID != id && x.BinBarcode == *p.BinBarcode {
				return v, ErrDuplicate
			}
		}
		v.BinBarcode = *p.BinBarcode
	}
	if p.BinType != nil {
		if !validBinTypes[*p.BinType] {
			return v, ErrInvalid
		}
		v.BinType = *p.BinType
	}
	if p.Aisle != nil {
		if len(*p.Aisle) > 32 {
			return v, ErrInvalid
		}
		v.Aisle = p.Aisle
	}
	if p.RowNum != nil {
		if *p.RowNum < 0 {
			return v, ErrInvalid
		}
		v.RowNum = p.RowNum
	}
	if p.LevelNum != nil {
		if *p.LevelNum < 0 {
			return v, ErrInvalid
		}
		v.LevelNum = p.LevelNum
	}
	if p.PositionNum != nil {
		if *p.PositionNum < 0 {
			return v, ErrInvalid
		}
		v.PositionNum = p.PositionNum
	}
	if p.PickSequence != nil {
		if *p.PickSequence < 0 {
			return v, ErrInvalid
		}
		v.PickSequence = *p.PickSequence
	}
	if p.PutawaySequence != nil {
		if *p.PutawaySequence < 0 {
			return v, ErrInvalid
		}
		v.PutawaySequence = *p.PutawaySequence
	}
	if p.IsActive != nil {
		v.IsActive = *p.IsActive
	}
	if p.ZoneID != nil {
		zone, ok, e := getJSON[Zone](r.store, zoneKind, *p.ZoneID)
		if e != nil {
			return v, e
		}
		if !ok {
			return v, ErrNotFound
		}
		if zone.WarehouseID != v.WarehouseID {
			return v, fmt.Errorf("%w: zone does not belong to warehouse", ErrInvalid)
		}
		v.ZoneID = *p.ZoneID
	}
	if e = putJSON(r.store, binKind, id, v); e != nil {
		return v, e
	}
	return v, nil
}
func (r *Repository) DeleteBin(id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok, e := getJSON[Bin](r.store, binKind, id); e != nil {
		return e
	} else if !ok {
		return ErrNotFound
	}
	if r.ledger != nil {
		balances, _, e := r.ledger.List()
		if e != nil {
			return e
		}
		for _, b := range balances {
			if b.BinID == id && (b.OnHand > 0 || b.Allocated > 0) {
				return fmt.Errorf("%w: bin still has inventory", ErrDependency)
			}
		}
	}
	preferred, err := r.loadPreferredLocked()
	if err != nil {
		return err
	}
	for _, mapping := range preferred.Rows {
		if mapping.BinID == id {
			return fmt.Errorf("%w: bin has preferred-bin mappings", ErrDependency)
		}
	}
	return r.store.Delete(binKind, strconv.FormatInt(id, 10))
}

func Paginate[T any](values []T, page, perPage int) ([]T, int, int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 50
	}
	if perPage > 1000 {
		perPage = 1000
	}
	total := len(values)
	pages := 1
	if total > 0 {
		pages = int(math.Ceil(float64(total) / float64(perPage)))
	}
	if page > pages {
		return []T{}, total, page, pages
	}
	start := (page - 1) * perPage
	if start >= total {
		return []T{}, total, page, pages
	}
	end := start + perPage
	if end > total {
		end = total
	}
	return values[start:end], total, page, pages
}
func FilterZones(values []Zone, warehouseID int64) []Zone {
	if warehouseID <= 0 {
		return values
	}
	out := values[:0]
	for _, v := range values {
		if v.WarehouseID == warehouseID {
			out = append(out, v)
		}
	}
	return out
}
func FilterBins(values []Bin, warehouseID, zoneID int64, binType, query string) []Bin {
	query = strings.ToLower(strings.TrimSpace(query))
	out := values[:0]
	for _, v := range values {
		if warehouseID > 0 && v.WarehouseID != warehouseID {
			continue
		}
		if zoneID > 0 && v.ZoneID != zoneID {
			continue
		}
		if binType != "" && v.BinType != binType {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(v.BinCode), query) && !strings.Contains(strings.ToLower(v.BinBarcode), query) {
			continue
		}
		out = append(out, v)
	}
	return out
}
