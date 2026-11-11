package inbound

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func newInboundTestService(t *testing.T) *Service {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(), Name:"wms-inbound-test"})
	if err != nil { t.Fatal(err) }
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store, ledger)
	sos := salesorders.New(store, cat)
	pos := purchaseorders.New(store, cat)
	return New(store, cat, sos, pos)
}

func TestWriteIsIdempotentBySourceResourceAndExternalID(t *testing.T) {
	service := newInboundTestService(t)
	req := WriteRequest{
		SourceSystem:"erp-west",
		Resource:"items",
		Records:[]map[string]any{{"external_id":"ITEM-001","external_version":"v1","sku":"SKU-001","item_name":"Widget","upc":"0123456789012"}},
	}
	first, err := service.Write(req, "integration")
	if err != nil { t.Fatal(err) }
	second, err := service.Write(req, "integration")
	if err != nil { t.Fatal(err) }
	if first["total_ok"] != 1 || second["total_ok"] != 1 { t.Fatalf("unexpected result first=%v second=%v", first, second) }
	items, err := service.cat.ListItems()
	if err != nil { t.Fatal(err) }
	if len(items) != 1 { t.Fatalf("idempotent replay created duplicate item: %d", len(items)) }
}

func TestWriteRejectsSameExternalVersionWithDifferentPayload(t *testing.T) {
	service := newInboundTestService(t)
	base := WriteRequest{SourceSystem:"erp-west", Resource:"items", Records:[]map[string]any{{"external_id":"ITEM-002","external_version":"v1","sku":"SKU-002","item_name":"Widget"}}}
	if _, err := service.Write(base, "integration"); err != nil { t.Fatal(err) }
	changed := WriteRequest{SourceSystem:"erp-west", Resource:"items", Records:[]map[string]any{{"external_id":"ITEM-002","external_version":"v1","sku":"SKU-002","item_name":"Different widget"}}}
	result, err := service.Write(changed, "integration")
	if err != nil { t.Fatal(err) }
	if result["total_err"] != 1 { t.Fatalf("expected one idempotency conflict, got %v", result) }
}
