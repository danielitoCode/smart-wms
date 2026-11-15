package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/contracts"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/zyrion"
)

// integrationsRoute exposes the commerce-bridge domain contract.
// Merchant e-commerce charges the shopper; this API receives paid-order signals
// and publishes warehouse progress events (not retail card capture).
func (s *Server) integrationsRoute(w http.ResponseWriter, r *http.Request) {
	if s.contracts == nil {
		writeJSON(w, 503, map[string]string{"error": "contracts service unavailable"})
		return
	}
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/integrations/"), "/")
	parts := strings.Split(path, "/")
	actor := "integration"
	if u := userFrom(r); u != nil {
		actor = u.Username
	}

	switch {
	case r.Method == http.MethodGet && (path == "contracts" || path == ""):
		list, err := s.contracts.ListContracts()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"contracts": list})

	case r.Method == http.MethodPost && path == "orders/paid":
		var in contracts.PaidOrderInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"})
			return
		}
		bo, err := s.contracts.IngestPaidOrder(in, actor)
		if err != nil {
			if errors.Is(err, contracts.ErrInvalid) {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, bo)

	case r.Method == http.MethodGet && path == "orders":
		list, err := s.contracts.ListBridgeOrders()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"orders": list})

	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "orders":
		bo, err := s.contracts.GetBridge(parts[1])
		if err != nil {
			if errors.Is(err, contracts.ErrNotFound) {
				writeJSON(w, 404, map[string]string{"error": "not found"})
				return
			}
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, bo)

	case r.Method == http.MethodPost && len(parts) == 3 && parts[0] == "orders" && parts[2] == "advance":
		var body struct {
			Stage   string `json:"stage"`
			Message string `json:"message"`
			Zyrion  string `json:"zyrion"`
		}
		if err := decodeBody(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"})
			return
		}
		out := zyrion.Parse(body.Zyrion)
		if body.Zyrion == "" {
			out = zyrion.Success
		}
		bo, err := s.contracts.AdvanceStage(parts[1], body.Stage, body.Message, out)
		if err != nil {
			if errors.Is(err, contracts.ErrNotFound) {
				writeJSON(w, 404, map[string]string{"error": "not found"})
				return
			}
			if errors.Is(err, contracts.ErrTransition) {
				writeJSON(w, 409, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, bo)

	case r.Method == http.MethodGet && path == "events":
		bridgeID := r.URL.Query().Get("bridge_id")
		list, err := s.contracts.ListEvents(bridgeID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"events": list})

	case r.Method == http.MethodPost && path == "platform-fees":
		var body struct {
			MerchantID string `json:"merchant_id"`
			Provider   string `json:"provider"`
			Amount     string `json:"amount"`
			Currency   string `json:"currency"`
			Zyrion     string `json:"zyrion"`
		}
		if err := decodeBody(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"})
			return
		}
		out := zyrion.Parse(body.Zyrion)
		if body.Zyrion == "" {
			out = zyrion.Indeterminate
		}
		doc, err := s.contracts.RecordPlatformFee(body.MerchantID, body.Provider, body.Amount, body.Currency, out)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, doc)

	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}
