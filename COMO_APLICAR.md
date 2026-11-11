# Cómo aplicar este cambio en tu máquina y hacer push

## Opción A — parche (recomendado)

```bash
cd /ruta/a/smart-wms
git checkout feat/wms-prismatec-genesis
git pull origin feat/wms-prismatec-genesis
git apply wms-twin-parity.diff
# o:
# git am 0001-feat-wms-twin-POS-Dockd-inbound-events-webhooks-snapsho.patch

git add -A
git commit -m "feat(wms-twin): POS/Dockd/inbound, events/webhooks/snapshot, RMA, scoped WMS tokens, mesh and audit chain"
git push origin feat/wms-prismatec-genesis
```

## Opción B — zip del árbol wms-twin

```bash
cd /ruta/a/smart-wms
git checkout feat/wms-prismatec-genesis
unzip -o wms-twin-parity.zip -d wms-twin-tmp
# revisa y copia sobre wms-twin/ los archivos nuevos/modificados
rsync -av wms-twin-tmp/ wms-twin/
rm -rf wms-twin-tmp
git add wms-twin
git commit -m "feat(wms-twin): POS/Dockd/inbound, events/webhooks/snapshot, RMA, scoped WMS tokens, mesh and audit chain"
git push origin feat/wms-prismatec-genesis
```

Tras aplicar, en `wms-twin/`:

```bash
go build -o third_party/prismatec/bin/wms-twin ./cmd/wms-twin
```
