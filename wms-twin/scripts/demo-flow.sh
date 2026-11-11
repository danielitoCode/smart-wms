#!/usr/bin/env bash
# Demo de laboratorio del backend gemelo (HTTP).
set -euo pipefail
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
USER="${WMS_TWIN_USER:-operator}"
PASS="${WMS_TWIN_PASS:-Operator123}"
SUF="$(date +%s | tail -c 6)"

echo "== health =="
curl -sS "$BASE/api/health" | tee /tmp/wms-health.json
echo

echo "== login =="
LOGIN=$(curl -sS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")
echo "$LOGIN" | tee /tmp/wms-login.json
TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [[ -z "${TOKEN}" ]]; then
  echo "No token en respuesta de login. Revisa usuario/password o JWT_SECRET." >&2
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

echo "== warehouse/zone/bins/item =="
WH=$(curl -sS -X POST "$BASE/api/admin/warehouses" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_code\":\"DEMO-$SUF\",\"warehouse_name\":\"Demo\"}")
WID=$(echo "$WH" | sed -n 's/.*"warehouse_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
ZONE=$(curl -sS -X POST "$BASE/api/admin/zones" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_code\":\"Z1\",\"zone_name\":\"Z\",\"zone_type\":\"STORAGE\"}")
ZID=$(echo "$ZONE" | sed -n 's/.*"zone_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
ST=$(curl -sS -X POST "$BASE/api/admin/bins" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"ST-1\",\"bin_barcode\":\"ST$SUF\",\"bin_type\":\"Staging\"}")
PK=$(curl -sS -X POST "$BASE/api/admin/bins" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"P-1\",\"bin_barcode\":\"PK$SUF\",\"bin_type\":\"Pickable\"}")
STID=$(echo "$ST" | sed -n 's/.*"bin_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
PKID=$(echo "$PK" | sed -n 's/.*"bin_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
ITEM=$(curl -sS -X POST "$BASE/api/admin/items" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"sku\":\"SKU-$SUF\",\"item_name\":\"Demo Item\"}")
IID=$(echo "$ITEM" | sed -n 's/.*"item_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
echo "warehouse=$WID item=$IID staging=$STID pickable=$PKID"

echo "== PO receive putaway =="
PO=$(curl -sS -X POST "$BASE/api/admin/purchase-orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"po_number\":\"PO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":2}]}")
POID=$(echo "$PO" | sed -n 's/.*"po_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
curl -sS -X POST "$BASE/api/receiving/receive" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"po_id\":$POID,\"items\":[{\"item_id\":$IID,\"quantity\":2,\"bin_id\":$STID}]}"
echo
curl -sS -X POST "$BASE/api/putaway/confirm" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"item_id\":$IID,\"from_bin_id\":$STID,\"to_bin_id\":$PKID,\"quantity\":2}"
echo

echo "== sales order pack ship =="
SO=$(curl -sS -X POST "$BASE/api/admin/sales-orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_number\":\"SO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":1}]}")
SOID=$(echo "$SO" | sed -n 's/.*"so_id"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
curl -sS -X POST "$BASE/api/packing/verify" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_id\":$SOID,\"item_id\":$IID,\"quantity\":1}"; echo
curl -sS -X POST "$BASE/api/packing/complete" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_id\":$SOID}"; echo
curl -sS -X POST "$BASE/api/shipping/fulfill" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"so_id\":$SOID,\"carrier\":\"DEMO\",\"tracking_number\":\"T-$SUF\"}"; echo

echo "== lookup =="
curl -sS "$BASE/api/lookup/item/SKU-$SUF" -H "$AUTH"; echo
echo "DEMO OK"
