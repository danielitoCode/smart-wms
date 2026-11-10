package corestore

import (
	"encoding/json"
	"testing"

	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestRecordsPersistThroughCoreCIDStore(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-store-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := New(node.Organisms())
	input := json.RawMessage(`{"warehouse_code":"WH-01","warehouse_name":"Main"}`)
	created, err := store.Put("warehouses", "1", input)
	if err != nil {
		t.Fatal(err)
	}
	if created.ContentCID == "" {
		t.Fatal("expected a content CID")
	}
	got, ok, err := store.Get("warehouses", "1")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("record was not found")
	}
	if string(got.Data) != string(input) {
		t.Fatalf("data mismatch: %s", got.Data)
	}
	if err := store.Delete("warehouses", "1"); err != nil {
		t.Fatal(err)
	}
	records, err := store.List("warehouses")
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 0 {
		t.Fatalf("expected deleted record to be hidden, got %d", len(records))
	}
}
