# Guía de operación del gemelo WMS

Escribo esta guía para que **cualquiera del equipo** pueda entender y usar el gemelo, aunque no programe. El mismo contenido operativo está en el PDF de esta carpeta. La explicación profunda de PrismaTec-Core está en `MANUAL_FRAMEWORK_PRISMATEC.md`.

---

## 1. ¿Qué es el gemelo?

El monorepo tiene un backend original (Flask) que el equipo ya conoce.

El **gemelo** (`wms-twin`) es **otro backend** que:

- Entiende las **mismas peticiones** que el admin web y la app móvil (`/api/...`).
- Por dentro guarda la información con **PrismaTec-Core** (nuestra tecnología base).
- Sirve para probar, demostrar y acercarnos a poder usar el mismo front con otro motor detrás.

**No cambio el frontend** para hablar con PrismaTec-Core. El frontend sigue hablando con `/api` como siempre.

---

## 2. Piezas que debes conocer (solo tres)

1. **Gemelo (wms-twin)** — el programa que escuchas en el puerto **5001** en laboratorio.
2. **PrismaTec-Core** — el motor de datos e integridad **dentro** del gemelo (nodo + registros de negocio + movimientos de stock). Detalle en el manual de framework.
3. **Clientes** — admin (navegador) y móvil (app). Dos formas de iniciar sesión, mismo servidor de API.

---

## 3. Arrancar el gemelo

```bash
cd wms-twin
git pull origin feat/wms-prismatec-genesis
./scripts/start-lab.sh
```

Usuarios de laboratorio:

| Usuario | Contraseña |
|---------|------------|
| operator | Operator123 |
| admin | Admin1234 |

Comprobación rápida:

```bash
curl -s http://127.0.0.1:5001/api/health
```

Debes ver un estado correcto y la mención a **PrismaTec-Core**.

---

## 4. Cómo se inicia sesión (admin vs móvil)

### Admin (navegador)

- El servidor deja cookies de sesión seguras.
- El navegador las envía solo; las escrituras llevan además un token de protección (CSRF).
- **No** hace falta pegar el token a mano en el día a día: el admin ya lo hace.

### Móvil

- La app guarda un token y lo envía en cada petición (`Bearer`).
- No usa el mismo esquema de cookies del navegador.

El gemelo acepta **los dos** modos. Por eso hay dos scripts de prueba distintos.

---

## 5. Pruebas automáticas que yo uso

Con el gemelo en marcha (`start-lab.sh` en otra terminal):

```bash
cd wms-twin

# Recorrido general de demo
./scripts/team-curl-demo.sh

# Como el admin (cookies + protección de escrituras)
./scripts/admin-e2e-cookie.sh

# Como el móvil (token Bearer)
./scripts/mobile-e2e-bearer.sh

# Pruebas internas de cada capacidad de negocio
go test ./internal/features/... -count=1
```

Si estas baterías pasan, el laboratorio del gemelo está sano a nivel API y features.

---

## 6. Ver el admin en el navegador (sin tocar el código del front)

### Errores frecuentes

| Mensaje | Qué significa | Qué hacer |
|---------|----------------|-----------|
| `vite: Permission denied` | Falta instalar dependencias o el arranque está mal | En `admin/`: `npm ci` y luego `npx vite --host 127.0.0.1 --port 3000` **sin sudo** |
| `vite: not found` con sudo | `sudo` no ve tus `node_modules` | No uses `sudo` con npm/vite del proyecto |
| No encuentra `admin/scripts/admin-lab-proxy.py` | El proxy **no** está en admin | Está en `wms-twin/scripts/admin-lab-proxy.py` |

### Orden correcto (tres terminales)

```bash
# Terminal 1 — gemelo
cd wms-twin
./scripts/start-lab.sh

# Terminal 2 — admin
cd admin
npm ci
npx vite --host 127.0.0.1 --port 3000

# Terminal 3 — puente (mismo origen)
cd wms-twin
python3 scripts/admin-lab-proxy.py
```

Abre el navegador en: **http://127.0.0.1:3080/**

Login de laboratorio: `operator` / `Operator123`.

También puedes ejecutar `./scripts/run-admin-lab.sh` para ver este resumen en pantalla.

---

## 7. ¿Dónde está cada cosa en el proyecto?

```text
wms-twin/
  scripts/     → demos y pruebas de laboratorio
  doc/         → esta ayuda (solo lo esencial)
  internal/features/  → capacidades de negocio (catálogo, recepción, picking…)
  internal/httpapi/   → la puerta /api
  internal/corestore/ → puente hacia PrismaTec-Core
```

**Regla práctica:**  
- ¿Problema de pantalla o URL? → clientes (admin/móvil) o `httpapi`.  
- ¿Problema de “no se guardó el dato”? → features + PrismaTec-Core.  
- ¿Cómo funciona el motor? → `doc/MANUAL_FRAMEWORK_PRISMATEC.md`.

---

## 8. Cómo ampliamos el gemelo (visión de equipo)

1. Se decide la capacidad (por ejemplo, un listado o un movimiento de almacén).
2. Se implementa en la **feature** correspondiente.
3. Se expone en `/api` si el admin o el móvil deben usarlo.
4. Se guarda vía el puente a **PrismaTec-Core** (no se inventan datos solo en la pantalla).
5. Se prueba con scripts o `go test` antes de darlo por bueno.

---

## 9. Estado con honestidad

| Pregunta | Respuesta corta |
|----------|-----------------|
| ¿Sirve para demo y laboratorio? | Sí, con los scripts anteriores |
| ¿Auth admin y móvil probados? | Sí, con los E2E de cookies y Bearer |
| ¿Es ya el reemplazo total de Flask en producción? | Todavía no: faltan validación visual completa, paridad de todos los módulos y operación de datos/corte |

---

## 10. Documentos activos (solo estos)

| Archivo | Contenido |
|---------|-----------|
| **README.md** (este) | Operar y probar el gemelo |
| **MANUAL_FRAMEWORK_PRISMATEC.md** | PrismaTec-Core explicado con claridad |
| **MANUAL_FRAMEWORK_PRISMATEC.pdf** | El mismo manual de framework en PDF |
| **Guia_Completa_WMS_Twin_PrismaTec.pdf** | Guía de operación en PDF |
| **PatronesEmpleados.md** + **PatronesEmpleados.pdf** | Patrones, Clean Architecture, feature-first y seguridad |
| **Integracion.md** + **Integracion.pdf** | Integraciones (puente tienda→almacén + fees B2B) |
| API `/api/integrations/*` | Contrato Zyrion: orden pagada en tienda externa → expedición |
| **Tutorial_Go_Gemelo.pdf** + **Tutorial_Go_Interactivo.html** | Aprender Go con ejemplos del gemelo |
| **scripts/e2e-integracion-sin-frontend.sh** | E2E API sin npm/Vite/proxy |

No mantengo más manuales sueltos en `doc/`: dispersan al equipo.
