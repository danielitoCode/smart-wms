#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="feat/wms-prismatec-genesis"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: ejecuta este script dentro del clon de smart-wms." >&2
  exit 2
}
cd "$ROOT"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "ERROR: estás en '$CURRENT_BRANCH'; cambia primero a '$BRANCH'." >&2
  exit 2
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: hay cambios locales. Haz commit o guárdalos antes de actualizar." >&2
  git status --short
  exit 2
fi
command -v go >/dev/null || {
  echo "ERROR: Go 1.25+ es necesario para validar el gemelo." >&2
  exit 2
}

echo "[1/6] Descargando referencias remotas..."
git fetch origin main "$BRANCH"
REMOTE_REF="origin/$BRANCH"
BASE_REF="origin/main"

echo "[2/6] Verificando que la rama no altere el backend original..."
CHANGED="$(git diff --name-only "$BASE_REF...$REMOTE_REF")"
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  case "$path" in
    wms-twin/*|Guia.md|EstructuraBackendGo.md|NivelDeParidadConBackendOriginal.md|AUDITORIA_GEMELO.md|.github/workflows/wms-twin-ci.yml|scripts/safe-update-wms-twin.sh) ;;
    *) echo "ERROR: cambio fuera del alcance permitido: $path" >&2; exit 3 ;;
  esac
done <<< "$CHANGED"

TMP="$(mktemp -d)"
WORKTREE="$TMP/validation"
cleanup() {
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "[3/6] Creando worktree temporal..."
git worktree add --detach "$WORKTREE" "$REMOTE_REF" >/dev/null

echo "[4/6] Ejecutando validaciones antes de actualizar..."
(
  cd "$WORKTREE/wms-twin"
  go mod tidy
  go mod verify
  unformatted="$(gofmt -l .)"
  if [[ -n "$unformatted" ]]; then
    echo "ERROR: la rama remota contiene archivos Go sin formato:" >&2
    printf '%s\n' "$unformatted" >&2
    exit 4
  fi
  go vet ./...
  go test -race -count=1 ./...
)

echo "[5/6] Comprobando whitespace..."
git diff --check "$CURRENT_BRANCH" "$REMOTE_REF"

echo "[6/6] Validaciones aprobadas. Aplicando fast-forward..."
git merge --ff-only "$REMOTE_REF"
echo "Actualización segura completada."
