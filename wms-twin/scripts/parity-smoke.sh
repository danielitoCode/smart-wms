#!/usr/bin/env bash
set -euo pipefail
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
USER="${WMS_TWIN_USER:-operator}"
PASS="${WMS_TWIN_PASS:-Operator123}"
fail() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "OK: $*"; }
code=$(curl -sS -o /tmp/wms-h.json -w "%{http_code}" "$BASE/api/health" || true)
[[ "$code" == "200" ]] || fail "health HTTP $code"
grep -q '"status":"ok"' /tmp/wms-h.json || fail "health body"
ok "health"
LOGIN=$(curl -sS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}") || fail "login request"
TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || fail "login sin token — arranca con WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true. body=$LOGIN"
ok "login"
AUTH="Authorization: Bearer $TOKEN"
code=$(curl -sS -o /tmp/wms-wh.json -w "%{http_code}" "$BASE/api/admin/warehouses" -H "$AUTH")
[[ "$code" == "200" ]] || fail "warehouses HTTP $code"
ok "warehouses"
code=$(curl -sS -o /tmp/wms-me.json -w "%{http_code}" "$BASE/api/auth/me" -H "$AUTH")
[[ "$code" == "200" ]] || fail "me HTTP $code"
ok "auth/me"
code=$(curl -sS -o /tmp/wms-ab.json -w "%{http_code}" "$BASE/api/picking/active-batch" -H "$AUTH")
[[ "$code" == "200" ]] || fail "active-batch HTTP $code"
ok "picking active-batch"
echo "SMOKE OK against $BASE"
