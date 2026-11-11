package webhooks

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"time"
	"os"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
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
	if err := validateSubscription("https://127.0.0.1/hook", secret, nil); err == nil {
		t.Fatal("loopback IP webhook accepted")
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

func TestWebhookSecretEncryptionAndDurableOutbox(t *testing.T) {
	old := os.Getenv("SENTRY_ENCRYPTION_KEY")
	t.Cleanup(func(){ _ = os.Setenv("SENTRY_ENCRYPTION_KEY", old) })
	_ = os.Setenv("SENTRY_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString([]byte("0123456789abcdef0123456789abcdef")))
	plain := strings.Repeat("s", 48)
	encrypted, err := encryptSecret(plain)
	if err != nil { t.Fatal(err) }
	if encrypted == plain || strings.Contains(encrypted, plain) { t.Fatal("secret was not encrypted") }
	decrypted, err := decryptSecret(encrypted)
	if err != nil || decrypted != plain { t.Fatalf("secret roundtrip failed: %v", err) }

	node, err := core.NewNode(core.Config{DataDir:t.TempDir(), Name:"webhook-outbox-test"})
	if err != nil { t.Fatal(err) }
	service := New(corestore.New(node.Organisms(), string(node.ID())))
	sub, err := service.Create("https://hooks.example.com/wms", plain, []string{"order.shipped"})
	if err != nil { t.Fatal(err) }
	if sub.Secret != "" { t.Fatal("plaintext secret leaked from Create response") }
	if err := service.DeliverEvent("event-1", "order.shipped", map[string]any{"order":"SO-1"}); err != nil { t.Fatal(err) }
	if err := service.DeliverEvent("event-1", "order.shipped", map[string]any{"order":"SO-1"}); err != nil { t.Fatal(err) }
	deliveries, err := service.Deliveries(10)
	if err != nil { t.Fatal(err) }
	if len(deliveries) != 1 || deliveries[0].Status != "PENDING" || deliveries[0].EventID != "event-1" {
		t.Fatalf("expected one durable pending delivery, got %+v", deliveries)
	}
	stored, ok, err := service.store.Get(kind, sub.ID)
	if err != nil || !ok { t.Fatalf("subscription not persisted: %v", err) }
	if strings.Contains(string(stored.Data), plain) { t.Fatal("plaintext secret persisted in Core record") }
}

type webhookRoundTripper func(*http.Request) (*http.Response, error)
func (fn webhookRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) { return fn(req) }

func TestWebhookOutboxRetriesThenDelivers(t *testing.T) {
	old := os.Getenv("SENTRY_ENCRYPTION_KEY")
	t.Cleanup(func(){ _ = os.Setenv("SENTRY_ENCRYPTION_KEY", old) })
	_ = os.Setenv("SENTRY_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString([]byte("0123456789abcdef0123456789abcdef")))
	node, err := core.NewNode(core.Config{DataDir:t.TempDir(),Name:"webhook-retry-test"})
	if err != nil { t.Fatal(err) }
	service := New(corestore.New(node.Organisms(),string(node.ID())))
	if _, err := service.Create("https://hooks.example.com/wms",strings.Repeat("x",40),[]string{"order.shipped"}); err != nil { t.Fatal(err) }
	if err := service.DeliverEvent("event-retry-1","order.shipped",map[string]any{"so":"SO-1"}); err != nil { t.Fatal(err) }
	statusCode := http.StatusInternalServerError
	service.client = &http.Client{Transport:webhookRoundTripper(func(req *http.Request)(*http.Response,error){
		if req.Header.Get("X-WMS-Signature")=="" { t.Fatal("missing HMAC signature") }
		return &http.Response{StatusCode:statusCode,Header:make(http.Header),Body:io.NopCloser(strings.NewReader("ok")),Request:req},nil
	})}
	if err := service.ProcessPending(context.Background()); err != nil { t.Fatal(err) }
	deliveries, err := service.Deliveries(10)
	if err != nil { t.Fatal(err) }
	if len(deliveries)!=1 || deliveries[0].Status!="RETRY" || deliveries[0].Attempts!=1 { t.Fatalf("expected scheduled retry, got %+v",deliveries) }
	delivery := deliveries[0]
	delivery.NextAttemptAt = time.Now().UTC().Add(-time.Second)
	data, _ := json.Marshal(delivery)
	if _, err := service.store.Put(deliveryKind,delivery.ID,data); err != nil { t.Fatal(err) }
	statusCode = http.StatusNoContent
	if err := service.ProcessPending(context.Background()); err != nil { t.Fatal(err) }
	deliveries, err = service.Deliveries(10)
	if err != nil { t.Fatal(err) }
	if len(deliveries)!=1 || deliveries[0].Status!="DELIVERED" || deliveries[0].Attempts!=2 || deliveries[0].DeliveredAt==nil {
		t.Fatalf("expected delivered outbox record, got %+v",deliveries)
	}
}
