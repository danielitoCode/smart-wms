package admindata

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestListSeedsChannelsLikeDB(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "admindata-test"})
	if err != nil {
		t.Fatal(err)
	}
	s := New(corestore.New(node.Organisms(), string(node.ID())))
	rows, err := s.List("channels")
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) < 1 {
		t.Fatalf("expected seed channel row, got %d", len(rows))
	}
	doc, err := s.Put("channels", "", map[string]any{"name": "live"})
	if err != nil {
		t.Fatal(err)
	}
	if doc["channel_id"] == nil {
		t.Fatalf("Put should set channel_id: %#v", doc)
	}
}
