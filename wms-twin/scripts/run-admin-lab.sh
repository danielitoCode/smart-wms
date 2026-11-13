#!/usr/bin/env bash
# Instrucciones y comprobaciones para lab admin + gemelo (no modifica el frontend).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MONOREPO="$(cd "$ROOT/.." && pwd)"
echo "=== Lab admin + gemelo ==="
echo "1) Gemelo (otra terminal):  cd $ROOT && ./scripts/start-lab.sh"
echo "2) Admin Vite:"
echo "     cd $MONOREPO/admin"
echo "     npm ci"
echo "     npx vite --host 127.0.0.1 --port 3000"
echo "   (usa npx vite — evita 'vite: Permission denied' / 'vite: not found' con sudo)"
echo "3) Proxy mismo origen:"
echo "     cd $ROOT && python3 scripts/admin-lab-proxy.py"
echo "4) Navegador: http://127.0.0.1:3080/"
echo
echo "NO ejecutes el proxy desde admin/: el script está en wms-twin/scripts/"
echo "NO uses sudo npm run dev: rompe el PATH de node_modules/.bin"
