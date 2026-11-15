// Package contracts implements executable domain contracts on PrismaTec-Core.
//
// Business model (project lead):
//   - The WMS is a warehouse, not the shopper-facing checkout.
//   - The merchant already charges customers in their own e-commerce.
//   - When an order is paid/executed there, the shop notifies THIS system.
//   - That signal starts warehouse expedition (pick/pack/ship).
//   - Status progresses are published as events the merchant can consume.
//   - Separately, the merchant may pay Abeli/platform fees (transfer/Stripe B2B);
//     that is not the same as capturing shopper card data inside the WMS.
package contracts

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/zyrion"
)

const (
	contractKind = "domain_contracts"
	bridgeKind   = "commerce_bridge_orders"
	eventKind    = "commerce_bridge_events"
	feeKind      = "platform_fee_intents"

	ContractCommerceBridge = "commerce-bridge-v1"
	ContractPlatformFee    = "platform-fee-v1"
)

var (
	ErrInvalid    = errors.New("invalid contract input")
	ErrNotFound   = errors.New("not found")
	ErrTransition = errors.New("illegal zyrion transition")
)

// Service holds executable contracts over PrismaTec organisms.
type Service struct {
	store *corestore.Store
	sos   *salesorders.Repository
	cat   *catalog.Repository
	mu    sync.Mutex
}

func New(store *corestore.Store, sos *salesorders.Repository, cat *catalog.Repository) *Service {
	return &Service{store: store, sos: sos, cat: cat}
}

func newID(prefix string) string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return prefix + "-" + hex.EncodeToString(b[:])
}

// EnsureContracts writes the canonical domain contracts if missing.
func (s *Service) EnsureContracts() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	docs := []map[string]any{
		{
			"id":          ContractCommerceBridge,
			"name":        "Commerce bridge (external paid order → warehouse)",
			"version":     "1.0.0",
			"kind":        "commerce_bridge",
			"description": "Merchant e-commerce captures shopper payment. On paid/executed order, merchant posts here. Zyrion drives expedition readiness and outbound status events.",
			"zyrion": map[string]any{
				"success":       "Order accepted; warehouse work may proceed",
				"failure":       "Order rejected or cancelled for warehouse",
				"indeterminate": "Received but awaiting validation/stock/rules",
			},
			"rules": []string{
				"WMS does not charge the end customer",
				"External paid signal creates or links a sales order",
				"Only Success allows progression into active fulfillment stages",
				"Status changes emit commerce_bridge_events for merchant dashboards",
			},
		},
		{
			"id":          ContractPlatformFee,
			"name":        "Platform fee (merchant → Abeli)",
			"version":     "1.0.0",
			"kind":        "platform_fee",
			"description": "Merchant pays the platform (transfer or Stripe B2B). Independent from shopper checkout on the merchant store.",
			"zyrion": map[string]any{
				"success":       "Platform fee settled",
				"failure":       "Fee payment failed or voided",
				"indeterminate": "Fee pending transfer/provider confirmation",
			},
			"rules": []string{
				"No PAN/CVV stored in the node",
				"Fee intent is B2B, not retail cart capture",
			},
		},
	}
	for _, d := range docs {
		id, _ := d["id"].(string)
		raw, _ := json.Marshal(d)
		if _, err := s.store.Put(contractKind, id, raw); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) ListContracts() ([]map[string]any, error) {
	_ = s.EnsureContracts()
	recs, err := s.store.List(contractKind)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(recs))
	for _, r := range recs {
		var m map[string]any
		_ = json.Unmarshal(r.Data, &m)
		if m == nil {
			m = map[string]any{"id": r.ID}
		}
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool {
		return fmt.Sprint(out[i]["id"]) < fmt.Sprint(out[j]["id"])
	})
	return out, nil
}

// PaidOrderInput is the message the merchant store sends after it charged the shopper.
type PaidOrderInput struct {
	ExternalOrderID string          `json:"external_order_id"`
	ExternalSource  string          `json:"external_source"` // shopify, woocommerce, custom…
	WarehouseID     int64           `json:"warehouse_id"`
	SONumber        string          `json:"so_number"`
	CustomerName    string          `json:"customer_name"`
	Notes           string          `json:"notes"`
	PaidAt          string          `json:"paid_at"`
	Currency        string          `json:"currency"`
	Lines           []PaidOrderLine `json:"lines"`
	Metadata        map[string]any  `json:"metadata"`
}

type PaidOrderLine struct {
	SKU      string `json:"sku"`
	ItemID   int64  `json:"item_id"`
	Quantity int64  `json:"quantity"`
}

type BridgeOrder struct {
	ID              string         `json:"id"`
	ContractID      string         `json:"contract_id"`
	ExternalOrderID string         `json:"external_order_id"`
	ExternalSource  string         `json:"external_source"`
	WarehouseID     int64          `json:"warehouse_id"`
	SOID            int64          `json:"so_id,omitempty"`
	SONumber        string         `json:"so_number"`
	CustomerName    string         `json:"customer_name,omitempty"`
	Stage           string         `json:"stage"`
	Zyrion          string         `json:"zyrion"`
	ZyrionCode      int            `json:"zyrion_code"`
	VisualAnchor    string         `json:"visual_anchor"`
	PaidAt          string         `json:"paid_at,omitempty"`
	Currency        string         `json:"currency,omitempty"`
	Notes           string         `json:"notes,omitempty"`
	CreatedAt       string         `json:"created_at"`
	UpdatedAt       string         `json:"updated_at"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

type BridgeEvent struct {
	ID           string `json:"id"`
	BridgeID     string `json:"bridge_id"`
	Stage        string `json:"stage"`
	Zyrion       string `json:"zyrion"`
	ZyrionCode   int    `json:"zyrion_code"`
	VisualAnchor string `json:"visual_anchor"`
	Message      string `json:"message"`
	CreatedAt    string `json:"created_at"`
}

// IngestPaidOrder is the core of the commerce-bridge contract.
func (s *Service) IngestPaidOrder(in PaidOrderInput, actor string) (BridgeOrder, error) {
	if strings.TrimSpace(in.ExternalOrderID) == "" || in.WarehouseID == 0 {
		return BridgeOrder{}, ErrInvalid
	}
	_ = s.EnsureContracts()
	s.mu.Lock()
	defer s.mu.Unlock()

	// Idempotent on external_order_id + source
	key := sanitizeID(in.ExternalSource + "-" + in.ExternalOrderID)
	if rec, ok, err := s.store.Get(bridgeKind, key); err == nil && ok {
		var existing BridgeOrder
		if json.Unmarshal(rec.Data, &existing) == nil && existing.ID != "" {
			return existing, nil
		}
	}

	soNumber := strings.TrimSpace(in.SONumber)
	if soNumber == "" {
		soNumber = "EXT-" + in.ExternalOrderID
	}

	lines := make([]salesorders.LineInput, 0, len(in.Lines))
	for _, ln := range in.Lines {
		itemID := ln.ItemID
		if itemID == 0 && strings.TrimSpace(ln.SKU) != "" {
			items, _ := s.cat.ListItems()
			for _, it := range items {
				if it.SKU == ln.SKU {
					itemID = it.ItemID
					break
				}
			}
		}
		if itemID == 0 || ln.Quantity <= 0 {
			continue
		}
		lines = append(lines, salesorders.LineInput{ItemID: itemID, QuantityOrdered: ln.Quantity})
	}

	outcome := zyrion.Indeterminate
	stage := "received"
	msg := "Paid signal received from merchant store; validating for warehouse"
	var soID int64

	if len(lines) == 0 {
		outcome = zyrion.Failure
		stage = "rejected"
		msg = "No resolvable lines (SKU/item_id); warehouse will not start"
	} else {
		note := strings.TrimSpace(in.Notes)
		if note == "" {
			note = "external paid order " + in.ExternalOrderID
		}
		so, err := s.sos.Create(salesorders.CreateInput{
			SONumber:     soNumber,
			WarehouseID:  in.WarehouseID,
			Lines:        lines,
			CustomerName: strPtr(in.CustomerName),
			Notes:        strPtr(note),
		}, actor)
		if err != nil {
			outcome = zyrion.Indeterminate
			stage = "received"
			msg = "Paid signal stored; sales order creation deferred: " + err.Error()
		} else {
			soID = so.SOID
			outcome = zyrion.Success
			stage = "accepted"
			msg = "External paid order accepted; warehouse expedition may start"
		}
	}

	now := time.Now().UTC().Format(time.RFC3339)
	bo := BridgeOrder{
		ID:              key,
		ContractID:      ContractCommerceBridge,
		ExternalOrderID: in.ExternalOrderID,
		ExternalSource:  strings.TrimSpace(in.ExternalSource),
		WarehouseID:     in.WarehouseID,
		SOID:            soID,
		SONumber:        soNumber,
		CustomerName:    in.CustomerName,
		Stage:           stage,
		Zyrion:          outcome.String(),
		ZyrionCode:      int(outcome),
		VisualAnchor:    outcome.VisualAnchor(),
		PaidAt:          in.PaidAt,
		Currency:        in.Currency,
		Notes:           in.Notes,
		CreatedAt:       now,
		UpdatedAt:       now,
		Metadata:        in.Metadata,
	}
	raw, _ := json.Marshal(bo)
	if _, err := s.store.Put(bridgeKind, key, raw); err != nil {
		return BridgeOrder{}, err
	}
	_ = s.emitEvent(bo, msg)
	return bo, nil
}

// AdvanceStage updates warehouse-facing progress and emits merchant-visible events.
// Stages example: accepted → picking → packed → courier → delivered | cancelled
func (s *Service) AdvanceStage(bridgeID, stage, message string, outcome zyrion.Outcome) (BridgeOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok, err := s.store.Get(bridgeKind, bridgeID)
	if err != nil {
		return BridgeOrder{}, err
	}
	if !ok {
		return BridgeOrder{}, ErrNotFound
	}
	var bo BridgeOrder
	if err := json.Unmarshal(rec.Data, &bo); err != nil {
		return BridgeOrder{}, err
	}
	// Terminal failure cannot move to success without explicit reopen (kept indeterminate path only)
	if bo.ZyrionCode == int(zyrion.Failure) && outcome == zyrion.Success {
		return BridgeOrder{}, ErrTransition
	}
	bo.Stage = strings.TrimSpace(stage)
	bo.Zyrion = outcome.String()
	bo.ZyrionCode = int(outcome)
	bo.VisualAnchor = outcome.VisualAnchor()
	bo.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	raw, _ := json.Marshal(bo)
	if _, err := s.store.Put(bridgeKind, bridgeID, raw); err != nil {
		return BridgeOrder{}, err
	}
	if message == "" {
		message = "Stage " + bo.Stage
	}
	_ = s.emitEvent(bo, message)
	return bo, nil
}

func (s *Service) GetBridge(id string) (BridgeOrder, error) {
	rec, ok, err := s.store.Get(bridgeKind, id)
	if err != nil {
		return BridgeOrder{}, err
	}
	if !ok {
		return BridgeOrder{}, ErrNotFound
	}
	var bo BridgeOrder
	if err := json.Unmarshal(rec.Data, &bo); err != nil {
		return BridgeOrder{}, err
	}
	return bo, nil
}

func (s *Service) ListBridgeOrders() ([]BridgeOrder, error) {
	recs, err := s.store.List(bridgeKind)
	if err != nil {
		return nil, err
	}
	out := make([]BridgeOrder, 0, len(recs))
	for _, r := range recs {
		var bo BridgeOrder
		if json.Unmarshal(r.Data, &bo) == nil {
			out = append(out, bo)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt > out[j].UpdatedAt })
	return out, nil
}

func (s *Service) ListEvents(bridgeID string) ([]BridgeEvent, error) {
	recs, err := s.store.List(eventKind)
	if err != nil {
		return nil, err
	}
	out := make([]BridgeEvent, 0)
	for _, r := range recs {
		var ev BridgeEvent
		if json.Unmarshal(r.Data, &ev) != nil {
			continue
		}
		if bridgeID != "" && ev.BridgeID != bridgeID {
			continue
		}
		out = append(out, ev)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt > out[j].CreatedAt })
	return out, nil
}

// RecordPlatformFee records B2B fee the merchant pays the platform (not shopper checkout).
func (s *Service) RecordPlatformFee(merchantID, provider, amount, currency string, outcome zyrion.Outcome) (map[string]any, error) {
	if strings.TrimSpace(merchantID) == "" {
		return nil, ErrInvalid
	}
	_ = s.EnsureContracts()
	id := newID("fee")
	now := time.Now().UTC().Format(time.RFC3339)
	doc := map[string]any{
		"id":            id,
		"contract_id":   ContractPlatformFee,
		"merchant_id":   merchantID,
		"provider":      provider, // transfer | stripe | other
		"amount":        amount,
		"currency":      currency,
		"zyrion":        outcome.String(),
		"zyrion_code":   int(outcome),
		"visual_anchor": outcome.VisualAnchor(),
		"created_at":    now,
		"updated_at":    now,
	}
	raw, _ := json.Marshal(doc)
	if _, err := s.store.Put(feeKind, id, raw); err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *Service) emitEvent(bo BridgeOrder, message string) error {
	id := newID("evt")
	ev := BridgeEvent{
		ID:           id,
		BridgeID:     bo.ID,
		Stage:        bo.Stage,
		Zyrion:       bo.Zyrion,
		ZyrionCode:   bo.ZyrionCode,
		VisualAnchor: bo.VisualAnchor,
		Message:      message,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	raw, _ := json.Marshal(ev)
	_, err := s.store.Put(eventKind, id, raw)
	return err
}

func sanitizeID(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return newID("ord")
	}
	var b strings.Builder
	for _, r := range v {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('-')
		}
	}
	out := b.String()
	if len(out) > 90 {
		out = out[:90]
	}
	return out
}

func strPtr(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
