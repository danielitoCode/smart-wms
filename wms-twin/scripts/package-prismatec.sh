#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/dist" "$ROOT/third_party/prismatec/bin"
cd "$ROOT"
go build -trimpath -ldflags="-s -w" -o "$ROOT/dist/wms-twin" ./cmd/wms-twin
cp -f "$ROOT/dist/wms-twin" "$ROOT/third_party/prismatec/bin/wms-twin"
echo "OK: $ROOT/dist/wms-twin"
echo "OK: $ROOT/third_party/prismatec/bin/wms-twin"
ls -lh "$ROOT/third_party/prismatec/bin/wms-twin"
