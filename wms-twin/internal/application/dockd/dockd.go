package dockd

import (
	"errors"
	"fmt"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
)

var ErrNotFound = errors.New("not found")

type Service struct {
	sos     *salesorders.Repository
	cat     *catalog.Repository
	fulfill *fulfillment.Service
}

func New(sos *salesorders.Repository, cat *catalog.Repository, f *fulfillment.Service) *Service {
	return &Service{sos: sos, cat: cat, fulfill: f}
}

func (s *Service) Order(soNumber string) (salesorders.SalesOrder, error) {
	list, err := s.sos.List()
	if err != nil {
		return salesorders.SalesOrder{}, err
	}
	for _, so := range list {
		if so.SONumber == soNumber || so.SOBarcode == soNumber {
			return so, nil
		}
	}
	return salesorders.SalesOrder{}, ErrNotFound
}

func (s *Service) Item(barcode string) (map[string]any, error) {
	items, err := s.cat.ListItems()
	if err != nil {
		return nil, err
	}
	for _, it := range items {
		upc := ""
		if it.UPC != nil {
			upc = *it.UPC
		}
		if it.SKU == barcode || upc == barcode {
			return map[string]any{"item_id": it.ItemID, "sku": it.SKU, "item_name": it.ItemName, "upc": it.UPC}, nil
		}
	}
	return nil, ErrNotFound
}

func (s *Service) Ship(soNumber, carrier, tracking, actor string, allowed []int64, isAdmin bool) (map[string]any, error) {
	so, err := s.Order(soNumber)
	if err != nil {
		return nil, err
	}
	if so.Status == salesorders.StatusOpen {
		return nil, fmt.Errorf("%w: order must be picked before shipping", fulfillment.ErrState)
	}
	if so.Status == salesorders.StatusPicked {
		if _, err := s.fulfill.CompletePack(so.SOID, allowed, isAdmin); err != nil {
			return nil, fmt.Errorf("complete packing before shipping: %w", err)
		}
	}
	out, err := s.fulfill.Fulfill(fulfillment.FulfillInput{
		SOID: so.SOID, Carrier: carrier, TrackingNumber: tracking, WarehouseID: so.WarehouseID,
	}, allowed, isAdmin)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"so_number": so.SONumber, "status": out.Status, "carrier": out.Carrier,
		"tracking_number": out.TrackingNumber, "shipped_at": out.ShippedAt, "actor": actor,
	}, nil
}

func (s *Service) VoidShip(soNumber, actor string) (map[string]any, error) {
	return s.VoidShipWithReason(soNumber, actor, "operator requested void", nil, true)
}

func (s *Service) VoidShipWithReason(soNumber, actor, reason string, allowed []int64, isAdmin bool) (map[string]any, error) {
	so, err := s.Order(soNumber)
	if err != nil { return nil, err }
	if !isAdmin && !containsWarehouse(allowed, so.WarehouseID) {
		return nil, fulfillment.ErrScope
	}
	if strings.TrimSpace(reason) == "" || len(reason) > 500 {
		return nil, fulfillment.ErrInvalid
	}
	shipment, err := s.fulfill.Void(so.SOID, actor, reason)
	if err != nil { return nil, err }
	return map[string]any{
		"so_number": so.SONumber, "status": shipment.PreShipStatus,
		"voided_at": shipment.VoidedAt, "voided_by": shipment.VoidedBy,
		"void_reason": shipment.VoidReason, "tracking_number": shipment.TrackingNumber,
	}, nil
}

func containsWarehouse(allowed []int64, id int64) bool {
	for _, value := range allowed { if value == id { return true } }
	return false
}
