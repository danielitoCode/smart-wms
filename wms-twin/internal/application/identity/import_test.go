package identity

import (
	"testing"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestImportRequiresBcryptAndResumesWithoutOverwritingExistingUsers(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-identity-import"})
	if err != nil {
		t.Fatal(err)
	}
	repository := New(corestore.New(node.Organisms(), string(node.ID())))
	hash, err := HashPassword("Imported123")
	if err != nil {
		t.Fatal(err)
	}
	user := User{
		UserID: 17, Username: "imported", PasswordHash: hash,
		FullName: "Imported User", Role: "USER", IsActive: true,
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
	if err := repository.Import([]User{user}); err != nil {
		t.Fatal(err)
	}
	if err := repository.Import([]User{user}); err != nil {
		t.Fatalf("idempotent re-import failed: %v", err)
	}
	if err := ValidateExportFileMode(0644); err == nil {
		t.Fatal("world-readable export file was accepted")
	}
	if err := ValidateExportFileMode(0600); err != nil {
		t.Fatal(err)
	}
}

func TestLoginLockoutPersistsAndResets(t *testing.T) {
	dataDir := t.TempDir()
	node, err := core.NewNode(core.Config{DataDir: dataDir, Name: "wms-login-lockout"})
	if err != nil {
		t.Fatal(err)
	}
	repository := New(corestore.New(node.Organisms(), string(node.ID())))
	now := time.Date(2026, 11, 10, 20, 0, 0, 0, time.UTC)
	key := "ip:127.0.0.1|user:operator"
	for i := 0; i < 4; i++ {
		locked, remaining, err := repository.RecordLoginFailure(key, true, 5, 15*time.Minute, now)
		if err != nil {
			t.Fatal(err)
		}
		if locked || remaining != 5-(i+1) {
			t.Fatalf("unexpected lockout state: %v %d", locked, remaining)
		}
	}
	locked, _, err := repository.RecordLoginFailure(key, true, 5, 15*time.Minute, now)
	if err != nil {
		t.Fatal(err)
	}
	if !locked {
		t.Fatal("fifth failure did not lock the key")
	}
	restarted, err := core.NewNode(core.Config{DataDir: dataDir, Name: "wms-login-lockout"})
	if err != nil {
		t.Fatal(err)
	}
	reopened := New(corestore.New(restarted.Organisms(), string(restarted.ID())))
	isLocked, remaining, err := reopened.LoginLocked(key, now.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if !isLocked || remaining <= 0 {
		t.Fatalf("lockout did not persist: %v %d", isLocked, remaining)
	}
	if err := reopened.ResetLoginAttempts(key); err != nil {
		t.Fatal(err)
	}
	isLocked, _, err = reopened.LoginLocked(key, now.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if isLocked {
		t.Fatal("lockout did not reset")
	}
}
