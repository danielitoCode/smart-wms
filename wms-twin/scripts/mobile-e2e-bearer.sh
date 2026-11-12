#!/usr/bin/env bash
# Simula el modelo del mobile: JWT en cliente + Authorization Bearer (sin CSRF cookie).
# Prerrequisito: ./scripts/start-lab.sh
set -euo pipefail
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
USER="${WMS_TWIN_USER:-operator}"
PASS="${WMS_TWIN_PASS:-Operator123}"
SUF=$(date +%s | tail -c 5)

fail() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "OK   $*"; }

echo "=== Mobile E2E Bearer against $BASE ==="

LOGIN=$(curl -sS -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || fail "no token in login: $LOGIN"
AUTH="Authorization: Bearer $TOKEN"
ok "login returned JWT (mobile stores it in secure storage)"

WH=$(curl -sS -X POST "$BASE/api/admin/warehouses" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_code\":\"MOB-$SUF\",\"warehouse_name\":\"Mobile E2E\"}")
WID=$(echo "$WH" | sed -n 's/.*"warehouse_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
[[ -n "$WID" ]] || fail "warehouse create with Bearer only: $WH"
ok "POST /admin/warehouses with Bearer (no CSRF) → warehouse_id=$WID"

ZN=$(curl -sS -X POST "$BASE/api/admin/zones" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_code\":\"MZ\",\"zone_name\":\"Mobile Zone\",\"zone_type\":\"STORAGE\"}")
ZID=$(echo "$ZN" | sed -n 's/.*"zone_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
ST=$(curl -sS -X POST "$BASE/api/admin/bins" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"MS\",\"bin_barcode\":\"MS$SUF\",\"bin_type\":\"Staging\"}")
STID=$(echo "$ST" | sed -n 's/.*"bin_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
PK=$(curl -sS -X POST "$BASE/api/admin/bins" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"MP\",\"bin_barcode\":\"MP$SUF\",\"bin_type\":\"Pickable\"}")
PKID=$(echo "$PK" | sed -n 's/.*"bin_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
SKU="MOB-$SUF"
IT=$(curl -sS -X POST "$BASE/api/admin/items" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"sku\":\"$SKU\",\"item_name\":\"Mobile Item\"}")
IID=$(echo "$IT" | sed -n 's/.*"item_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
ok "catalog via Bearer item=$IID bins=$STID/$PKID"

curl -sS "$BASE/api/warehouses/list" -H "$AUTH" | grep -q warehouses || fail "warehouses/list"
ok "GET /warehouses/list"

PO=$(curl -sS -X POST "$BASE/api/admin/purchase-orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"po_number\":\"MPO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":3}]}")
POID=$(echo "$PO" | sed -n 's/.*"po_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
curl -sS -X POST "$BASE/api/receiving/receive" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"po_id\":$POID,\"items\":[{\"item_id\":$IID,\"quantity\":3,\"bin_id\":$STID}]}" >/dev/null || true
curl -sS -X POST "$BASE/api/putaway/confirm" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"item_id\":$IID,\"from_bin_id\":$STID,\"to_bin_id\":$PKID,\"quantity\":3}" >/dev/null || true
ok "receive + putaway floor flow"

# Mobile screens pass scanned barcode/SKU in the path (not item_id).
CODE=$(curl -sS -o /tmp/mob-sku.json -w '%{http_code}' -H "$AUTH" "$BASE/api/lookup/item/$SKU")
[[ "$CODE" == "200" ]] || fail "GET /lookup/item/$SKU → $CODE $(head -c 200 /tmp/mob-sku.json)"
ok "GET /lookup/item by SKU (mobile scan path)"

# Also accept numeric item_id for convenience / tooling.
CODE=$(curl -sS -o /tmp/mob-id.json -w '%{http_code}' -H "$AUTH" "$BASE/api/lookup/item/$IID")
[[ "$CODE" == "200" ]] || fail "GET /lookup/item/$IID → $CODE $(head -c 200 /tmp/mob-id.json)"
ok "GET /lookup/item by item_id"

CODE=$(curl -sS -o /tmp/mob-me.json -w '%{http_code}' -H "$AUTH" "$BASE/api/auth/me")
[[ "$CODE" == "200" ]] || fail "GET /auth/me → $CODE"
ok "GET /auth/me"

echo
echo "MOBILE BEARER E2E PASSED"
