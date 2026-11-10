package corestore

import (
	"encoding/json"
	"github.com/yecharlot/PrismaTec-Core/core"
	"testing"
)

func TestEachWMSRecordIsItsOwnOrganismAndPersists(t *testing.T) {
	dir := t.TempDir()
	node, err := core.NewNode(core.Config{DataDir: dir, Name: "wms-store-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := New(node.Organisms(), string(node.ID()))
	input := json.RawMessage(`{"warehouse_code":"WH-01","warehouse_name":"Main"}`)
	created, err := store.Put("warehouse", "1", input)
	if err != nil {
		t.Fatal(err)
	}
	if created.ContentCID == "" || created.RootCID == "" {
		t.Fatal("expected CID and RootCID")
	}
	found := false
	for _, org := range node.Organisms().List() {
		if org.Name == "wms.warehouse.1" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected individual warehouse organism")
	}
	restarted, err := core.NewNode(core.Config{DataDir: dir, Name: "wms-store-test"})
	if err != nil {
		t.Fatal(err)
	}
	store2 := New(restarted.Organisms(), string(restarted.ID()))
	got, ok, err := store2.Get("warehouse", "1")
	if err != nil {
		t.Fatal(err)
	}
	if !ok || string(got.Data) != string(input) || got.RootCID != created.RootCID {
		t.Fatalf("reopened record mismatch: %#v", got)
	}
	if err := store2.Delete("warehouse", "1"); err != nil {
		t.Fatal(err)
	}
	list, err := store2.List("warehouse")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 0 {
		t.Fatalf("expected tombstone, got %d records", len(list))
	}
}
