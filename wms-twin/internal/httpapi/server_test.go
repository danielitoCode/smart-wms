package httpapi
import("net/http";"net/http/httptest";"strings";"testing";"github.com/yecharlot/PrismaTec-Core/core";"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore")
func TestHealthIsPublicAndRecordsRequireToken(t *testing.T){
	node,err:=core.NewNode(core.Config{DataDir:t.TempDir(),Name:"wms-http-test"});if err!=nil{t.Fatal(err)}
	handler:=New(node,corestore.New(node.Organisms(),string(node.ID())),"test-secret").Handler()
	health:=httptest.NewRecorder();handler.ServeHTTP(health,httptest.NewRequest(http.MethodGet,"/api/health",nil));if health.Code!=200{t.Fatalf("health status %d",health.Code)}
	unauth:=httptest.NewRecorder();handler.ServeHTTP(unauth,httptest.NewRequest(http.MethodGet,"/api/twin/records/warehouses",nil));if unauth.Code!=401{t.Fatalf("records status %d",unauth.Code)}
	req:=httptest.NewRequest(http.MethodPost,"/api/twin/records/warehouses",strings.NewReader(`{"warehouse_code":"WH-01"}`));req.Header.Set("Authorization","Bearer test-secret");req.Header.Set("Content-Type","application/json")
	created:=httptest.NewRecorder();handler.ServeHTTP(created,req);if created.Code!=201{t.Fatalf("create status %d: %s",created.Code,created.Body.String())}
}
