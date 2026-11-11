#!/usr/bin/env bash
# Arranque de laboratorio del gemelo con bootstrap demo y health compatible.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export WMS_TWIN_DATA_DIR="${WMS_TWIN_DATA_DIR:-$HOME/.local/share/smart-wms-twin-demo}"
export WMS_TWIN_NODE_NAME="${WMS_TWIN_NODE_NAME:-wms-demo}"
export WMS_TWIN_HTTP_ADDR="${WMS_TWIN_HTTP_ADDR:-:5001}"
export WMS_TWIN_AIP_ADDR="${WMS_TWIN_AIP_ADDR:-:8081}"
export WMS_TWIN_API_TOKEN="${WMS_TWIN_API_TOKEN:-$(openssl rand -hex 32)}"
export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
export WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true
# Probes compartidos con el original
export WMS_TWIN_HEALTH_SERVICE="${WMS_TWIN_HEALTH_SERVICE:-sentry-wms}"

mkdir -p "$WMS_TWIN_DATA_DIR"
echo "Data: $WMS_TWIN_DATA_DIR"
echo "HTTP: $WMS_TWIN_HTTP_ADDR  AIP: $WMS_TWIN_AIP_ADDR"
echo "Users demo: operator/Operator123  admin/Admin1234"
echo "Health service name: $WMS_TWIN_HEALTH_SERVICE"
echo "JWT_SECRET length: ${#JWT_SECRET}"
exec go run ./cmd/wms-twin
