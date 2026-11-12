#!/usr/bin/env bash
# Simula el admin real: cookies sentry_auth + sentry_csrf y header X-CSRF-Token.
# No usa Bearer. Prerrequisito: twin con start-lab.sh.
set -euo pipefail
BASE="${WMS_TWIN_BASE:-http://127.0.0.1:5001}"
USER="${WMS_TWIN_USER:-operator}"
PASS="${WMS_TWIN_PASS:-Operator123}"
CJ=$(mktemp)
trap 'rm -f "$CJ"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "OK   $*"; }

echo "=== Admin E2E cookie/CSRF against $BASE ==="

# 1) Login sets cookies (like browser credentials:include)
HDR=$(mktemp)
curl -sS -D "$HDR" -c "$CJ" -b "$CJ" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" > /tmp/wms-login-body.json
grep -qi 'set-cookie:.*sentry_auth' "$HDR" || fail "login did not Set-Cookie sentry_auth"
grep -qi 'set-cookie:.*sentry_csrf' "$HDR" || fail "login did not Set-Cookie sentry_csrf"
ok "login Set-Cookie sentry_auth + sentry_csrf"

# 2) /auth/me with cookie only (no Authorization header)
ME=$(curl -sS -c "$CJ" -b "$CJ" "$BASE/api/auth/me")
echo "$ME" | grep -q '"username"' || fail "me without bearer: $ME"
ok "GET /auth/me via cookie only"

# Extract CSRF from cookie jar
CSRF=$(awk '$6=="sentry_csrf"{print $7}' "$CJ" | tail -1)
[[ -n "$CSRF" ]] || fail "csrf cookie empty in jar"
ok "csrf cookie present"

# 3) Mutation without CSRF must fail (admin model)
CODE=$(curl -sS -o /tmp/wms-nocsrf.json -w '%{http_code}' -c "$CJ" -b "$CJ" \
  -X POST "$BASE/api/admin/warehouses" \
  -H 'Content-Type: application/json' \
  -d '{"warehouse_code":"NOCSRF","warehouse_name":"x"}')
if [[ "$CODE" != "403" ]]; then
  # some builds may only enforce CSRF when cookie auth is used — still require not 201
  if [[ "$CODE" == "201" || "$CODE" == "200" ]]; then
    fail "POST without X-CSRF-Token should be rejected, got $CODE"
  fi
fi
ok "POST without CSRF rejected or not created (HTTP $CODE)"

# 4) Mutation with CSRF like admin api.js
SUF=$(date +%s | tail -c 5)
WH=$(curl -sS -c "$CJ" -b "$CJ" -X POST "$BASE/api/admin/warehouses" \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d "{\"warehouse_code\":\"ADM-$SUF\",\"warehouse_name\":\"Admin E2E\"}")
echo "$WH" | grep -q warehouse_id || fail "create warehouse with CSRF: $WH"
ok "POST /admin/warehouses with X-CSRF-Token"

# 5) Screens the admin hits on load
for path in \
  "/api/admin/dashboard" \
  "/api/admin/warehouses?per_page=50" \
  "/api/admin/sales-orders?page=1&per_page=50" \
  "/api/admin/channels" \
  "/api/admin/tokens" \
  "/api/v1/dashboard/preferences" \
  "/api/admin/inbound/activity"
do
  CODE=$(curl -sS -o /tmp/wms-adm.json -w '%{http_code}' -c "$CJ" -b "$CJ" "$BASE$path")
  [[ "$CODE" == "200" ]] || fail "GET $path -> $CODE $(head -c 200 /tmp/wms-adm.json)"
  ok "GET $path"
done

# 6) Logout with CSRF
CODE=$(curl -sS -o /tmp/wms-out.json -w '%{http_code}' -c "$CJ" -b "$CJ" \
  -X POST "$BASE/api/auth/logout" -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" -d '{}')
[[ "$CODE" == "200" ]] || fail "logout $CODE"
ok "POST /auth/logout with CSRF"

# 7) me after logout should be 401
CODE=$(curl -sS -o /tmp/wms-me2.json -w '%{http_code}' -c "$CJ" -b "$CJ" "$BASE/api/auth/me")
[[ "$CODE" == "401" ]] || fail "expected 401 after logout, got $CODE"
ok "session cleared after logout"

echo
echo "ADMIN COOKIE/CSRF E2E PASSED"
