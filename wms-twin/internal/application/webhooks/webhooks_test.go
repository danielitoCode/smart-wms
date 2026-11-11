package webhooks

import (
	"context"
	"strings"
	"testing"
)

func TestValidateSubscriptionRequiresHTTPSAndStrongSecret(t *testing.T) {
	secret := strings.Repeat("s", 32)
	if err := validateSubscription("https://hooks.example.com/wms", secret, []string{"order.shipped"}); err != nil {
		t.Fatalf("valid subscription rejected: %v", err)
	}
	if err := validateSubscription("http://hooks.example.com/wms", secret, nil); err == nil {
		t.Fatal("plain HTTP subscription accepted")
	}
	if err := validateSubscription("https://127.0.0.1/hook", secret, nil); err != nil {
		t.Fatalf("public URL syntax should pass create-time validation; dispatch guard handles IPs: %v", err)
	}
	if err := validateSubscription("https://hooks.example.com/wms", "short", nil); err == nil {
		t.Fatal("weak webhook secret accepted")
	}
	if err := validateSubscription("https://localhost/hook", secret, nil); err == nil {
		t.Fatal("localhost webhook accepted")
	}
}

func TestSafeDialContextRejectsLoopbackBeforeDial(t *testing.T) {
	_, err := safeDialContext(context.Background(), "tcp", "127.0.0.1:443")
	if err == nil {
		t.Fatal("loopback destination was not rejected")
	}
	if !strings.Contains(err.Error(), "non-public") {
		t.Fatalf("unexpected rejection: %v", err)
	}
}
