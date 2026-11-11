#!/usr/bin/env bash
# Smoke de paridad del gemelo (PrismaTec-Core) frente al contrato del backend original.
# No arranca Flask; valida que el twin responde en las rutas críticas compartidas.
set -euo pipefail
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
USER="${WMS_TWIN_USER:-operator}"
PASS="${WMS_TWIN_PASS:-Operator123}"
fail=0
pass=0
check() {
  local name="$1" method="$2" path="$3" expect="$4"
  shift 4 || true
  local code body
  body=$(curl -sS -o /tmp/parity-body.json -w "%{http_code}" -X "$method" "$BASE$path" "$@" || echo "000")
  code=$body
  if echo "$code" | grep -qE "$expect"; then
    echo "PASS  $method $path ($code) — $name"
    pass=$((pass+1))
  else
    echo "FAIL  $method $path (got $code, want $expect) — $name"
    head -c 200 /tmp/parity-body.json; echo
    fail=$((fail+1))
  fi
}

echo "Twin base: $BASE"
check "health" GET "/api/health" "200"
LOGIN=$(curl -sS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [[ -z "$TOKEN" ]]; then
  echo "FAIL  login — no token"
  echo "$LOGIN"
  exit 1
fi
echo "PASS  login"
pass=$((pass+1))
AUTH=(-H "Authorization: Bearer $TOKEN")

check "me" GET "/api/auth/me" "200" "${AUTH[@]}"
check "system-info" GET "/api/admin/system-info" "200" "${AUTH[@]}"
check "users" GET "/api/admin/users" "200" "${AUTH[@]}"
check "warehouses" GET "/api/admin/warehouses" "200" "${AUTH[@]}"
check "items" GET "/api/admin/items" "200" "${AUTH[@]}"
check "sales-orders" GET "/api/admin/sales-orders" "200" "${AUTH[@]}"
check "inventory balances" GET "/api/inventory/balances" "200" "${AUTH[@]}"
check "lookup search" GET "/api/lookup/item/search?q=a" "200" "${AUTH[@]}"

echo
echo "Result: pass=$pass fail=$fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
echo "PARITY SMOKE OK — rutas críticas del twin responden (no sustituye E2E Flask)."
