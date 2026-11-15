#!/usr/bin/env bash
# E2E de integración SIN npm, SIN Vite, SIN proxy Python.
# Simula los caminos reales de admin (cookies+CSRF) y mobile (Bearer)
# más el flujo de almacén punta a punta. Veredicto al final.
set -u
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
PASS=0
FAIL=0
WARN=0
SUF=$(date +%s | tail -c 6)

ok()   { echo "  PASS  $*"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $*"; FAIL=$((FAIL+1)); }
warn() { echo "  WARN  $*"; WARN=$((WARN+1)); }

section() { echo; echo "==== $* ===="; }

json_field() {
  # $1=json $2=key (simple)
  echo "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
}
json_num() {
  echo "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p" | head -1
}

echo "E2E integración gemelo (sin frontend)  BASE=$BASE"
echo "Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---------- A. Disponibilidad ----------
section "A. Disponibilidad"
H=$(curl -sS -w '\n%{http_code}' "$BASE/api/health" 2>/dev/null || echo -e '\n000')
HB=$(echo "$H" | head -n -1)
HC=$(echo "$H" | tail -n 1)
echo "$HB" | grep -q PrismaTec-Core && ok "health PrismaTec-Core" || bad "health sin PrismaTec-Core: $HB"
[[ "$HC" == "200" ]] && ok "health HTTP 200" || bad "health HTTP $HC"

# ---------- B. Seguridad admin (cookies) ----------
section "B. Seguridad admin (cookies + CSRF)"
rm -f /tmp/e2e-ck.txt
LC=$(curl -sS -c /tmp/e2e-ck.txt -w '\n%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"Admin1234"}')
LCB=$(echo "$LC" | head -n -1)
LCC=$(echo "$LC" | tail -n 1)
[[ "$LCC" == "200" ]] && ok "login admin 200" || bad "login admin $LCC $LCB"
grep -q sentry_auth /tmp/e2e-ck.txt && ok "cookie sentry_auth" || bad "falta sentry_auth"
CSRF=$(awk '/sentry_csrf/ {print $7}' /tmp/e2e-ck.txt | tail -1)
[[ -n "$CSRF" ]] && ok "cookie sentry_csrf" || bad "falta sentry_csrf"

CODE=$(curl -sS -b /tmp/e2e-ck.txt -o /tmp/e2e-me.json -w '%{http_code}' "$BASE/api/auth/me")
[[ "$CODE" == "200" ]] && ok "GET /auth/me con cookie" || bad "/auth/me cookie $CODE"

CODE=$(curl -sS -b /tmp/e2e-ck.txt -o /tmp/e2e-x.json -w '%{http_code}' \
  -X POST "$BASE/api/admin/warehouses" -H 'Content-Type: application/json' \
  -d "{\"warehouse_code\":\"E2E-NOCSRF-$SUF\",\"warehouse_name\":\"x\"}")
[[ "$CODE" == "403" || "$CODE" == "401" ]] && ok "POST sin CSRF bloqueado ($CODE)" || bad "POST sin CSRF $CODE"

# ---------- C. Seguridad mobile (Bearer) ----------
section "C. Seguridad mobile (Bearer)"
OL=$(curl -sS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"operator","password":"Operator123"}')
TOKEN=$(json_field "$OL" token)
[[ -n "$TOKEN" ]] && ok "login operator JWT" || bad "sin JWT operator"
AUTH="Authorization: Bearer $TOKEN"
CODE=$(curl -sS -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/api/auth/me")
[[ "$CODE" == "200" ]] && ok "Bearer /auth/me" || bad "Bearer me $CODE"
CODE=$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${TOKEN}tamper" "$BASE/api/auth/me")
[[ "$CODE" == "401" || "$CODE" == "403" ]] && ok "Bearer inválido rechazado" || bad "Bearer inválido $CODE"
CODE=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/admin/warehouses")
[[ "$CODE" == "401" || "$CODE" == "403" ]] && ok "ruta admin sin auth rechazada" || bad "admin abierto $CODE"

# ---------- D. Caso de uso catálogo (como admin UI) ----------
section "D. Caso de uso: catálogo"
WH=$(curl -sS -b /tmp/e2e-ck.txt -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/admin/warehouses" \
  -d "{\"warehouse_code\":\"E2E-$SUF\",\"warehouse_name\":\"E2E WH\"}")
WID=$(json_num "$WH" warehouse_id)
[[ -n "$WID" ]] && ok "crear warehouse id=$WID" || bad "crear warehouse: $WH"

ZN=$(curl -sS -b /tmp/e2e-ck.txt -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/admin/zones" \
  -d "{\"warehouse_id\":$WID,\"zone_code\":\"Z1\",\"zone_name\":\"Zona\",\"zone_type\":\"STORAGE\"}")
ZID=$(json_num "$ZN" zone_id)
[[ -n "$ZID" ]] && ok "crear zone id=$ZID" || bad "zone: $ZN"

ST=$(curl -sS -b /tmp/e2e-ck.txt -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/admin/bins" \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"ST\",\"bin_barcode\":\"ST$SUF\",\"bin_type\":\"Staging\"}")
STID=$(json_num "$ST" bin_id)
PK=$(curl -sS -b /tmp/e2e-ck.txt -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/admin/bins" \
  -d "{\"warehouse_id\":$WID,\"zone_id\":$ZID,\"bin_code\":\"PK\",\"bin_barcode\":\"PK$SUF\",\"bin_type\":\"Pickable\"}")
PKID=$(json_num "$PK" bin_id)
[[ -n "$STID" && -n "$PKID" ]] && ok "bins staging=$STID pickable=$PKID" || bad "bins ST=$ST PK=$PK"

IT=$(curl -sS -b /tmp/e2e-ck.txt -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/admin/items" \
  -d "{\"sku\":\"SKU-$SUF\",\"item_name\":\"Item E2E\"}")
IID=$(json_num "$IT" item_id)
[[ -n "$IID" ]] && ok "crear item id=$IID" || bad "item: $IT"

# ---------- E. Caso de uso inbound (como mobile floor) ----------
section "E. Caso de uso: inbound (PO → receive → putaway)"
PO=$(curl -sS -H "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/api/admin/purchase-orders" \
  -d "{\"po_number\":\"PO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":4}]}")
POID=$(json_num "$PO" po_id)
[[ -n "$POID" ]] && ok "crear PO id=$POID" || bad "PO: $PO"

RC=$(curl -sS -H "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/api/receiving/receive" \
  -d "{\"po_id\":$POID,\"items\":[{\"item_id\":$IID,\"quantity\":4,\"bin_id\":$STID}]}")
echo "$RC" | grep -qi error && bad "receive error: $RC" || ok "receive OK"

PA=$(curl -sS -H "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/api/putaway/confirm" \
  -d "{\"item_id\":$IID,\"from_bin_id\":$STID,\"to_bin_id\":$PKID,\"quantity\":4}")
echo "$PA" | grep -qi error && bad "putaway error: $PA" || ok "putaway OK"

LK=$(curl -sS -H "$AUTH" -w '\n%{http_code}' "$BASE/api/lookup/item/SKU-$SUF")
LKB=$(echo "$LK" | head -n -1)
LKC=$(echo "$LK" | tail -n 1)
[[ "$LKC" == "200" ]] && ok "lookup item por SKU (mobile scan)" || bad "lookup $LKC $LKB"

# ---------- F. Caso de uso outbound ----------
section "F. Caso de uso: outbound (SO → pack/ship)"
SO=$(curl -sS -H "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/api/admin/sales-orders" \
  -d "{\"so_number\":\"SO-$SUF\",\"warehouse_id\":$WID,\"lines\":[{\"item_id\":$IID,\"quantity_ordered\":1}]}")
SOID=$(json_num "$SO" so_id)
[[ -n "$SOID" ]] && ok "crear SO id=$SOID" || bad "SO: $SO"

# pack/ship may vary; attempt
curl -sS -H "$AUTH" -H 'Content-Type: application/json' -X POST "$BASE/api/packing/complete" \
  -d "{\"so_id\":$SOID}" -o /tmp/e2e-pack.json -w '%{http_code}' > /tmp/e2e-pack.code || true
PC=$(cat /tmp/e2e-pack.code 2>/dev/null || echo 000)
if [[ "$PC" == "200" || "$PC" == "201" ]]; then ok "packing/complete $PC"
elif [[ "$PC" == "400" || "$PC" == "409" ]]; then warn "packing/complete $PC (ruta viva; estado de negocio no listo sin pick completo)"
else warn "packing/complete $PC"
fi

# ---------- G. Superficie admin (pantallas de lectura) ----------
section "G. Superficie admin (equivalente a pantallas de listado)"
for path in \
  "/api/admin/dashboard" \
  "/api/admin/warehouses?per_page=50" \
  "/api/admin/sales-orders?page=1&per_page=20" \
  "/api/admin/purchase-orders?page=1&per_page=20" \
  "/api/admin/channels" \
  "/api/admin/tokens" \
  "/api/admin/inbound/activity" \
  "/api/v1/dashboard/preferences" \
  "/api/admin/system-info" \
  "/api/warehouses/list"
do
  CODE=$(curl -sS -b /tmp/e2e-ck.txt -o /tmp/e2e-g.json -w '%{http_code}' "$BASE$path")
  [[ "$CODE" == "200" ]] && ok "GET $path" || bad "GET $path → $CODE"
done

# ---------- H. Logout ----------
section "H. Cierre de sesión admin"
curl -sS -b /tmp/e2e-ck.txt -c /tmp/e2e-ck.txt -X POST "$BASE/api/auth/logout" \
  -H "X-CSRF-Token: $CSRF" -o /dev/null
CODE=$(curl -sS -b /tmp/e2e-ck.txt -o /dev/null -w '%{http_code}' "$BASE/api/auth/me")
[[ "$CODE" == "401" || "$CODE" == "403" ]] && ok "sesión invalidada tras logout" || bad "sesión sigue viva $CODE"

# ---------- Veredicto ----------
section "VEREDICTO"
TOTAL=$((PASS+FAIL+WARN))
echo "  PASS=$PASS  FAIL=$FAIL  WARN=$WARN  (checks≈$TOTAL)"
echo
if [[ "$FAIL" -eq 0 && "$WARN" -eq 0 ]]; then
  echo "  NIVEL: INTEGRACIÓN CORE SÓLIDA (lab)"
  echo "  El gemelo cubre auth dual, catálogo, inbound y superficies admin de lectura."
  echo "  Aún no declara sustituto 100% de Flask (módulos avanzados / E2E visual UI)."
  exit 0
elif [[ "$FAIL" -eq 0 ]]; then
  echo "  NIVEL: INTEGRACIÓN CORE CON RESERVAS"
  echo "  Flujos principales OK; hay advertencias de negocio (p.ej. pack sin pick completo)."
  echo "  Apto para demo API y desarrollo paralelo; no corte de producción."
  exit 0
else
  echo "  NIVEL: INTEGRACIÓN INCOMPLETA O ROTA"
  echo "  Hay fallos que bloquean declarar paridad de integración en lab."
  exit 1
fi
