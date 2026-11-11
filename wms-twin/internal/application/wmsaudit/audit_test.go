package wmsaudit

import (
	"encoding/json"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestVerifyDetectsTamperingAndStopsAppend(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-audit-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	service := New(store, nil)
	entry, err := service.Record("tester", "test.write", "fixture", true, "", nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := service.Verify(); err != nil {
		t.Fatalf("valid chain rejected: %v", err)
	}

	record, ok, err := store.Get(kind, formatSeq(entry.Seq))
	if err != nil || !ok {
		t.Fatalf("read audit entry: ok=%v err=%v", ok, err)
	}
	var changed Entry
	if err := json.Unmarshal(record.Data, &changed); err != nil {
		t.Fatal(err)
	}
	changed.Action = "tampered"
	data, err := json.Marshal(changed)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.Put(kind, formatSeq(entry.Seq), data); err != nil {
		t.Fatal(err)
	}

	recovered := New(store, nil)
	if err := recovered.Verify(); err == nil {
		t.Fatal("tampered audit chain passed verification")
	}
	if _, err := recovered.Record("tester", "after.tamper", "fixture", true, "", nil); err == nil {
		t.Fatal("audit chain accepted append after integrity failure")
	}
}
