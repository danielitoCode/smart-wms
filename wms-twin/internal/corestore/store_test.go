package corestore

import (
	"encoding/json"
	"testing"

	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestEachWMSRecordIsItsOwnOrganismAndPersists(t *testing.T) {
	dataDir := t.TempDir()
	node, err := core.NewNode(core.Config{DataDir: dataDir, Name: "wms-store-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := New(node.Organisms())

	input := json.RawMessage(`{"warehouse_code":"WH-01","warehouse_name":"Main"}`)
	created, err := store.Put("warehouse", "1", input)
	if err != nil {
		t.Fatal(err)
	}
	if created.ContentCID == "" {
		t.Fatal("expected a content CID")
	}
	if created.RootCID == "" {
		t.Fatal("expected an organism RootCID")
	}

	var found bool
	for _, org := range node.Organisms().List() {
		if org.Name == "wms.warehouse.1" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected the warehouse record to have its own organism")
	}

	// Re-open the same Core data directory to prove local persistence survives
	// a process restart instead of relying on an in-memory map.
	restartedNode, err := core.NewNode(core.Config{DataDir: dataDir, Name: "wms-store-test"})
	if err != nil {
		t.Fatal(err)
	}
	restartedStore := New(restartedNode.Organisms())
	got, ok, err := restartedStore.Get("warehouse", "1")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("record was not found after reopening the node")
	}
	if string(got.Data) != string(input) {
		t.Fatalf("data mismatch: %s", got.Data)
	}
	if got.RootCID != created.RootCID {
		t.Fatalf("RootCID changed across restart: %s != %s", got.RootCID, created.RootCID)
	}

	if err := restartedStore.Delete("warehouse", "1"); err != nil {
		t.Fatal(err)
	}
	records, err := restartedStore.List("warehouse")
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 0 {
		t.Fatalf("expected deleted record to be hidden, got %d", len(records))
	}
}
