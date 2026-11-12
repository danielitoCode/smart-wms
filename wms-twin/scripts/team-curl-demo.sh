#!/usr/bin/env bash
# Demo para el equipo: batería curl del gemelo (PrismaTec-Core detrás de /api).
# Prerrequisito: ./scripts/start-lab.sh en otra terminal.
set -euo pipefail
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
USER="${WMS_TWIN_USER:-operator}"
PASS="${WMS_TWIN_PASS:-Operator123}"
SUF="$(date +%s | tail -c 5)"

section() { echo; echo "======== $* ========"; }
ok() { echo "OK  $*"; }
fail() { echo "FAIL $*" >&2; exit 1; }

section "1. Health"
H=$(curl -sS "$BASE/api/health")
echo "$H" | grep -q '"status":"ok"' || fail "health"
ok "health $H"

section "2. Login JWT"
LOGIN=$(curl -sS -c /tmp/wms-cj -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || fail "login: $LOGIN"
AUTH="Authorization: Bearer $TOKEN"
ok "login token=${TOKEN:0:16}..."

section "3. Auth me"
curl -sS "$BASE/api/auth/me" -H "$AUTH" | grep -q username || fail "me"
ok "auth/me"

section "4. Catálogo: warehouse → zone → bins → item"
WH=$(curl -sS -X POST "$BASE/api/admin/warehouses" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_code\":\"CURL-$SUF\",\"warehouse_name\":\"Demo $SUF\"}")
WID=$(echo "$WH" | sed -n 's/.*"warehouse_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
[[ -n "$WID" ]] || fail "warehouse $WH"
ZN=$(curl -sS -X POST "$BASE/api/admin/zones" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_code\":\"Z1\",\"zone_name\":\"Zona\",\"zone_type\":\"STORAGE\"}")
ZID=$(echo "$ZN" | sed -n 's/.*"zone_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
ST=$(curl -sS -X POST "$BASE/api/admin/bins" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"ST-1\",\"bin_barcode\":\"ST$SUF\",\"bin_type\":\"Staging\"}")
STID=$(echo "$ST" | sed -n 's/.*"bin_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
PK=$(curl -sS -X POST "$BASE/api/admin/bins" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"P-1\",\"bin_barcode\":\"PK$SUF\",\"bin_type\":\"Pickable\"}")
PKID=$(echo "$PK" | sed -n 's/.*"bin_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
IT=$(curl -sS -X POST "$BASE/api/admin/items" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"sku\":\"SKU-$SUF\",\"item_name\":\"Item $SUF\"}")
IID=$(echo "$IT" | sed -n 's/.*"item_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
ok "warehouse=$WID item=$IID staging=$STID pick=$PKID"

section "5. Inbound: PO → receive → putaway"
PO=$(curl -sS -X POST "$BASE/api/admin/purchase-orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"po_number\":\"PO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":5}]}")
POID=$(echo "$PO" | sed -n 's/.*"po_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
[[ -n "$POID" ]] || POID=$(echo "$PO" | sed -n 's/.*"purchase_order"[^}]*"po_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
curl -sS -X POST "$BASE/api/receiving/receive" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"po_id\":$POID,\"items\":[{\"item_id\":$IID,\"quantity\":5,\"bin_id\":$STID}]}" | grep -q receipt || true
curl -sS -X POST "$BASE/api/putaway/confirm" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"item_id\":$IID,\"from_bin_id\":$STID,\"to_bin_id\":$PKID,\"quantity\":5}" >/dev/null
ok "PO $POID received + putaway"

section "6. Staging summary (admin PutAway)"
curl -sS "$BASE/api/putaway/staging-summary/$WID" -H "$AUTH" | grep -q bins || fail "staging-summary"
ok "staging-summary"

section "7. Outbound: SO → pack → ship"
SO=$(curl -sS -X POST "$BASE/api/admin/sales-orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_number\":\"SO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":1}]}")
SOID=$(echo "$SO" | sed -n 's/.*"so_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
curl -sS -X POST "$BASE/api/packing/verify" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_id\":$SOID,\"item_id\":$IID,\"quantity\":1}" >/dev/null || true
curl -sS -X POST "$BASE/api/packing/complete" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_id\":$SOID}" >/dev/null || true
curl -sS -X POST "$BASE/api/shipping/fulfill" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_id\":$SOID,\"carrier\":\"DEMO\",\"tracking_number\":\"T-$SUF\"}" >/dev/null || true
ok "SO $SOID pack/ship attempted"

section "8. Sales orders list shape"
LIST=$(curl -sS "$BASE/api/admin/sales-orders?page=1&per_page=50" -H "$AUTH")
echo "$LIST" | grep -q sales_orders || fail "sales_orders key"
ok "sales-orders list"

section "9. Admin extended (channels, settings, tokens, inbound activity)"
curl -sS -X POST "$BASE/api/admin/channels" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"name\":\"ch-$SUF\"}" | grep -q channel_id || true
curl -sS "$BASE/api/admin/channels" -H "$AUTH" | grep -q total || fail "channels"
curl -sS -X PUT "$BASE/api/admin/settings" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"settings":{"pos_activity_enabled":true}}' | grep -q ok || fail "settings"
curl -sS "$BASE/api/admin/inbound/activity" -H "$AUTH" | grep -q rows || fail "inbound activity"
curl -sS "$BASE/api/admin/tokens" -H "$AUTH" | grep -q tokens || fail "tokens"
curl -sS "$BASE/api/admin/scope-catalog" -H "$AUTH" | grep -q scopes || fail "scopes"
ok "admin extended"

section "10. Dashboard + warehouses list"
curl -sS "$BASE/api/admin/dashboard" -H "$AUTH" | grep -q warehouses || fail "dashboard"
curl -sS "$BASE/api/v1/dashboard/productivity" -H "$AUTH" | grep -q productivity || fail "v1 dashboard"
curl -sS "$BASE/api/warehouses/list" -H "$AUTH" | grep -q warehouses || fail "warehouses list"
ok "dashboard surfaces"

section "DONE"
echo "Gemelo respondió el recorrido de demo en $BASE"
echo "Usuarios lab: operator/Operator123  admin/Admin1234"
