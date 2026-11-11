#!/usr/bin/env bash
# Arranque local del gemelo con PrismaTec-Core y usuarios demo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export WMS_TWIN_DATA_DIR="${WMS_TWIN_DATA_DIR:-${TMPDIR:-/tmp}/smart-wms-twin-demo}"
export WMS_TWIN_HTTP_ADDR="${WMS_TWIN_HTTP_ADDR:-:5001}"
export WMS_TWIN_AIP_ADDR="${WMS_TWIN_AIP_ADDR:-:8081}"
export JWT_SECRET="${JWT_SECRET:-wms-twin-lab-jwt-secret-min-32-bytes!!}"
export WMS_TWIN_API_TOKEN="${WMS_TWIN_API_TOKEN:-lab-api-token-change-me}"
mkdir -p "$WMS_TWIN_DATA_DIR"
echo "Data dir: $WMS_TWIN_DATA_DIR"
echo "HTTP:     $WMS_TWIN_HTTP_ADDR"
echo "Users:    operator/Operator123  admin/Admin1234 (si el dir está vacío)"
cd "$ROOT"
exec go run ./cmd/wms-twin
