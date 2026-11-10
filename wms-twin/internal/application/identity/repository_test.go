package identity

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestIdentityLifecycleAuthenticatesAndPersistsAcrossRestart(t *testing.T) {
	dataDir := t.TempDir()
	node, err := core.NewNode(core.Config{DataDir: dataDir, Name: "wms-identity-test"})
	if err != nil { t.Fatal(err) }
	repository := New(corestore.New(node.Organisms(), string(node.ID())))
	created, err := repository.CreateWithPassword(User{
		Username: " Operator ", FullName: "Warehouse Operator", Role: "USER",
		WarehouseIDs: []int64{2, 4}, AllowedFunctions: []string{"receive", "pick"}, IsActive: true,
	}, "Operator123")
	if err != nil { t.Fatal(err) }
	if created.UserID != 1 || created.Username != "operator" { t.Fatalf("unexpected created user: %#v", created) }
	authenticated, err := repository.Authenticate(" OPERATOR ", "Operator123")
	if err != nil { t.Fatal(err) }
	if authenticated.LastLogin == nil || authenticated.UserID != created.UserID { t.Fatalf("last login was not persisted: %#v", authenticated) }
	if _, err := repository.Authenticate("operator", "wrong-password"); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected generic invalid credentials, got %v", err)
	}
	publicJSON, err := json.Marshal(Public(authenticated))
	if err != nil { t.Fatal(err) }
	if strings.Contains(string(publicJSON), "password_hash") || strings.Contains(string(publicJSON), "Operator123") {
		t.Fatalf("public user leaked credential material: %s", publicJSON)
	}
	restarted, err := core.NewNode(core.Config{DataDir: dataDir, Name: "wms-identity-test"})
	if err != nil { t.Fatal(err) }
	reopened := New(corestore.New(restarted.Organisms(), string(restarted.ID())))
	persisted, err := reopened.GetByID(created.UserID)
	if err != nil { t.Fatal(err) }
	if persisted.Username != created.Username || persisted.LastLogin == nil ||
		persisted.PasswordHash != created.PasswordHash || len(persisted.WarehouseIDs) != 2 {
		t.Fatalf("identity did not survive restart: %#v", persisted)
	}
}

func TestIdentityRejectsDuplicateUsernameAndChangesPassword(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-identity-unique"})
	if err != nil { t.Fatal(err) }
	repository := New(corestore.New(node.Organisms(), string(node.ID())))
	first, err := repository.CreateWithPassword(User{Username: "admin1", FullName: "Admin", Role: "ADMIN", IsActive: true}, "Admin1234")
	if err != nil { t.Fatal(err) }
	if _, err := repository.CreateWithPassword(User{Username: " ADMIN1 ", FullName: "Duplicate", Role: "USER", IsActive: true}, "User12345"); !errors.Is(err, ErrDuplicateUsername) {
		t.Fatalf("expected duplicate username, got %v", err)
	}
	changed, err := repository.ChangePassword(first.UserID, "Admin1234", "NewAdmin123")
	if err != nil { t.Fatal(err) }
	if changed.MustChangePassword || changed.PasswordChangedAt == nil { t.Fatalf("password change metadata missing: %#v", changed) }
	if _, err := repository.Authenticate("admin1", "Admin1234"); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("old password still authenticates: %v", err)
	}
	if _, err := repository.Authenticate("admin1", "NewAdmin123"); err != nil {
		t.Fatalf("new password did not authenticate: %v", err)
	}
}
