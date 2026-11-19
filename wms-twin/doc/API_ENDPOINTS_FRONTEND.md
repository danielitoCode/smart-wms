# API del gemelo WMS — guía de endpoints para el frontend

Base de prueba en Render: `https://smart-wms-twin.onrender.com`

Este documento describe **cuándo usar** cada endpoint, **qué enviar** y **qué esperar**. Está pensado para quien integra el **admin web** o la **app móvil** con el backend gemelo (PrismaTec-Core).

---

## 0. Convenciones generales

### Autenticación

Hay dos modelos (el gemelo acepta ambos):

1. **Admin (navegador)**  
   - Login devuelve cookies `sentry_auth` (HttpOnly) y `sentry_csrf`.  
   - Lecturas: el navegador envía la cookie sola.  
   - Escrituras (POST/PUT/PATCH/DELETE): además el header **`X-CSRF-Token`** con el valor de la cookie `sentry_csrf`.

2. **Móvil**  
   - Login devuelve JSON con **`token`** (JWT).  
   - Todas las peticiones: header **`Authorization: Bearer <token>`**.  
   - **No** necesita CSRF.

### Formato

- Content-Type de body: `application/json`
- Errores típicos: `{ "error": "mensaje" }`
- Códigos: `200` OK, `201` creado, `400` validación, `401` no autenticado, `403` CSRF/permiso, `404` no encontrado, `409` conflicto de estado, `500` error interno

### Usuarios de laboratorio (demo)

- `operator` / `Operator123`
- `admin` / `Admin1234`

---

## 1. Salud del servicio

### `GET /api/health`

**Cuándo:** al arrancar el front, para saber si el backend está vivo (o despertó en Render free).

**Request:** sin auth, sin body.

**Response 200 (ejemplo):**
```json
{
  "engine": "PrismaTec-Core",
  "service": "sentry-wms",
  "status": "ok",
  "time": "2026-11-19T20:07:44Z",
  "twin": "smart-wms-twin"
}
```

---

## 2. Autenticación

### `POST /api/auth/login`

**Cuándo:** pantalla de inicio de sesión (admin o móvil).

**Body:**
```json
{
  "username": "operator",
  "password": "Operator123"
}
```

**Response 200 (móvil / JSON):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": 1,
    "username": "operator",
    "full_name": "Demo Operator",
    "role": "ADMIN"
  }
}
```

En navegador además se fijan cookies de sesión y CSRF.

**Errores:** `401` usuario/clave inválidos; `400` payload incompleto.

---

### `GET /api/auth/me`

**Cuándo:** tras login, para pintar el usuario, rol y permisos en el layout.

**Auth:** cookie o Bearer.

**Response 200:** objeto usuario (id, username, role, almacenes permitidos, etc.).

**Error:** `401` si no hay sesión.

---

### `POST /api/auth/logout`

**Cuándo:** botón “cerrar sesión” del admin.

**Auth:** cookie (+ CSRF en POST).

**Response:** confirmación; la cookie de sesión deja de valer.

---

### `POST /api/auth/refresh`

**Cuándo:** el cliente quiere renovar el JWT antes de que expire (móvil).

**Auth:** Bearer o cookie válida.

**Response:** nuevo token o sesión renovada según implementación.

---

### `POST /api/auth/change-password`

**Cuándo:** pantalla de cambio de contraseña del usuario logueado.

**Body:**
```json
{
  "current_password": "Operator123",
  "new_password": "NuevaClaveSegura1"
}
```

**Auth:** obligatoria. **Response:** éxito o `400` si la clave actual no coincide.

---

## 3. Listados rápidos de almacén

### `GET /api/warehouses/list`

**Cuándo:** selectores de almacén en móvil o admin (dropdown).

**Auth:** sí.

**Response 200:** lista de almacenes visibles para el usuario (`warehouse_id`, código, nombre).

---

## 4. Panel admin — dashboard y sistema

### `GET /api/admin/dashboard`

**Cuándo:** home del admin (KPIs, resumen).

**Auth:** sí (rol admin/operator según permisos).

**Response 200:** objeto con métricas de superficie (conteos, actividad reciente según lo implementado en el gemelo).

---

### `GET /api/admin/system-info`

**Cuándo:** pantalla de información del sistema / versión.

**Response 200:** datos de servicio, motor PrismaTec-Core, entorno.

---

### `GET /api/v1/dashboard/preferences`

**Cuándo:** cargar preferencias de layout del dashboard del usuario.

**Response 200:**
```json
{ "preferences": { } }
```

---

### `GET /api/admin/inbound/activity`

**Cuándo:** feed de actividad inbound en el admin.

**Response 200:** listado de eventos/actividad reciente de entradas.

---

### `GET /api/admin/users`

**Cuándo:** gestión de usuarios (listado).

**Response 200:** usuarios del sistema (lab incluye operator/admin).

---

### `GET /api/admin/tokens` · `GET /api/admin/wms-tokens`

**Cuándo:** pantalla de tokens de API / integración.

**Response 200:** `{ "tokens": [ ... ] }`

Revocación: rutas bajo `/api/admin/tokens/{id}` o `/api/admin/wms-tokens/{id}` (POST/DELETE según cliente).

---

### `GET /api/admin/audit` · `GET /api/admin/mesh`

**Cuándo:** auditoría y estado de malla (operaciones avanzadas / diagnóstico).

---

## 5. Catálogo maestro (admin)

Patrón habitual: **GET** lista, **POST** crea, **GET/PUT** por id cuando existe.

### Almacenes — `/api/admin/warehouses`

**Cuándo:** CRUD de warehouses en configuración.

**POST body (ejemplo):**
```json
{
  "warehouse_code": "WH-01",
  "warehouse_name": "Almacén principal"
}
```

**Response 201/200:** incluye `warehouse_id`.

**GET** con query `per_page`, `page` cuando el listado es paginado.

---

### Zonas — `/api/admin/zones`

**POST body:**
```json
{
  "warehouse_id": 1,
  "zone_code": "Z1",
  "zone_name": "Almacenaje",
  "zone_type": "STORAGE"
}
```

**Response:** `zone_id`, datos de zona.

---

### Ubicaciones (bins) — `/api/admin/bins`

**POST body:**
```json
{
  "warehouse_id": 1,
  "zone_id": 1,
  "bin_code": "A-01",
  "bin_barcode": "A-01",
  "bin_type": "Pickable"
}
```

Tipos frecuentes: `Staging`, `Pickable`.

---

### Ítems — `/api/admin/items`

**POST body:**
```json
{
  "sku": "SKU-100",
  "item_name": "Producto demo"
}
```

**Response:** `item_id`, sku, nombre.

**GET** listado para grillas de catálogo.

---

## 6. Pedidos de compra (PO) — admin

### `GET /api/admin/purchase-orders`

**Query opcional:** `q`, `page`, `per_page`

**Cuándo:** listado de POs.

### `POST /api/admin/purchase-orders`

**Cuándo:** crear PO antes de recibir mercancía.

**Body:**
```json
{
  "po_number": "PO-1001",
  "warehouse_id": 1,
  "vendor_name": "Proveedor",
  "lines": [
    { "item_id": 1, "quantity_ordered": 10 }
  ]
}
```

**Response:** `po_id` / objeto `purchase_order`.

### `GET /api/admin/purchase-orders/{id}`

Detalle.

### `PUT /api/admin/purchase-orders/{id}`

Actualizar cabecera (ej. `vendor_name`).

### `POST .../close` · `POST .../reopen`

Cerrar o reabrir el PO.

---

## 7. Pedidos de venta (SO) — admin

### `GET /api/admin/sales-orders`

**Query:** `page`, `per_page`

**Cuándo:** grilla de órdenes de venta / salida.

**Response (forma típica):**
```json
{
  "sales_orders": [ ... ],
  "page": 1,
  "pages": 1,
  "total": 0,
  "per_page": 50
}
```

### `POST /api/admin/sales-orders`

**Cuándo:** crear SO manual desde admin (o pruebas).

**Body:**
```json
{
  "so_number": "SO-1001",
  "warehouse_id": 1,
  "customer_name": "Cliente",
  "lines": [
    { "item_id": 1, "quantity_ordered": 2 }
  ]
}
```

En el modelo de producto, muchas SO llegan por **integración** (`/api/integrations/orders/paid`) cuando la tienda externa ya cobró.

---

## 8. Settings admin

### `GET/PUT /api/admin/settings/allow_over_receiving`

**Cuándo:** permitir o no recibir más de lo pedido en el PO.

### `GET/PUT /api/admin/settings/default_receiving_bin`

**Cuándo:** bin por defecto de recepción.

Body/respuesta según clave de setting (valor booleano o id de bin).

---

### Canales y recursos admin genéricos

- `GET/POST /api/admin/channels` — canales de venta/integración en UI admin  
- Otras pantallas (connectors, webhooks, transfer-orders, adjustments, imports) usan el mismo prefijo `/api/admin/...` y el router `adminCatalog` / extended del gemelo.

Si una pantalla admin aún está en migración, la capa de datos puede devolver listas vacías o semillas; el contrato HTTP se mantiene para no romper el front.

---

## 9. Recepción (receiving) — móvil / piso

### `GET /api/receiving/po/{codigo}`

**Cuándo:** el operador escanea o escribe el número de PO para ver líneas pendientes.

**Auth:** Bearer o cookie.

**Response:** datos del PO y líneas recibibles.

### `POST /api/receiving/receive`

**Cuándo:** confirmar cantidades recibidas hacia un bin (suele ser staging).

**Body (ejemplo):**
```json
{
  "po_id": 1,
  "items": [
    { "item_id": 1, "quantity": 4, "bin_id": 10 }
  ]
}
```

**Response:** confirmación de recepción / movimientos de ledger.

### `POST /api/receiving/cancel`

**Cuándo:** anular un paso de recepción en curso (según reglas del caso de uso).

---

## 10. Putaway

### `GET /api/putaway/suggest/{item_id}`

**Cuándo:** sugerir ubicación destino al acomodar.

### `POST /api/putaway/confirm`

**Cuándo:** mover de staging a bin pickable.

**Body:**
```json
{
  "item_id": 1,
  "from_bin_id": 10,
  "to_bin_id": 11,
  "quantity": 4
}
```

### `POST /api/putaway/update-preferred`

**Cuándo:** actualizar bin preferido del ítem.

Hay además rutas de **resumen de staging** usadas por la pantalla PutAway del admin (agrupación por bin / sku).

---

## 11. Picking

| Endpoint | Cuándo |
|----------|--------|
| `GET /api/picking/active-batch` | Ver el lote activo del operador |
| `GET /api/picking/batch/{id}` | Detalle del lote |
| `GET /api/picking/batch/{id}/next` | Siguiente tarea de pick |
| `POST /api/picking/wave-validate` | Validar ola antes de crear |
| `POST /api/picking/wave-create` | Crear ola de picking |
| `POST /api/picking/create-batch` | Crear lote |
| `POST /api/picking/confirm` | Confirmar pick de una línea |
| `POST /api/picking/short` | Reportar falta (short) |
| `POST /api/picking/complete-batch` | Cerrar lote |
| `POST /api/picking/cancel-batch` | Cancelar lote |

**Bodies de confirm/short/wave:** incluyen ids de batch, ítem, cantidades y ubicación según la pantalla móvil; un body vacío suele responder `400` (ruta viva, validación de negocio).

---

## 12. Packing

| Endpoint | Cuándo |
|----------|--------|
| `GET /api/packing/order/{codigo}` | Cargar SO a empacar |
| `POST /api/packing/verify` | Verificar ítem/cantidad en caja |
| `POST /api/packing/complete` | Completar empaque |

**POST complete (ejemplo):**
```json
{ "so_id": 1 }
```

Puede fallar con `400` si el SO no está en estado pickeado / listo para pack.

---

## 13. Shipping

| Endpoint | Cuándo |
|----------|--------|
| `GET /api/shipping/order/{codigo}` | Orden lista para despacho |
| `POST /api/shipping/fulfill` | Marcar envío / fulfill |

---

## 14. Lookup (escaneo)

| Endpoint | Cuándo |
|----------|--------|
| `GET /api/lookup/item/{sku_o_id}` | Escanear producto |
| `GET /api/lookup/bin/{codigo}` | Escanear ubicación |
| `GET /api/lookup/so/{codigo}` | Escanear orden de venta |

**Response 200:** ficha del recurso. **404** si no existe (código desconocido).

---

## 15. Transfers e inventario

### `POST /api/transfers/move`

**Cuándo:** mover stock entre bins/almacenes desde la app de piso.

**Body típico:** ítem, cantidad, origen, destino, warehouse.

### Cycle count

| Endpoint | Cuándo |
|----------|--------|
| `POST /api/inventory/cycle-count/create` | Iniciar conteo |
| `POST /api/inventory/cycle-count/submit` | Enviar conteo |
| `GET/POST /api/inventory/cycle-count/{id}` | Detalle / avance |

---

## 16. RMA

| Endpoint | Cuándo |
|----------|--------|
| `GET /api/rma` | Listar devoluciones |
| `POST /api/rma` | Crear RMA |
| `GET /api/rma/{id}` | Detalle |

---

## 17. Integraciones (tienda del comerciante → almacén)

**Importante:** el WMS **no cobra al comprador final**. La tienda externa cobra; luego notifica aquí.

### `GET /api/integrations/contracts`

**Cuándo:** ver contratos de dominio activos (commerce-bridge, platform-fee).

**Response:** `{ "contracts": [ ... ] }`

---

### `POST /api/integrations/orders/paid`

**Cuándo:** el e-commerce del cliente avisa “esta orden ya se pagó / ejecutó”.

**Body:**
```json
{
  "external_order_id": "ORD-100",
  "external_source": "shopify",
  "warehouse_id": 1,
  "so_number": "SO-EXT-100",
  "customer_name": "Cliente final",
  "paid_at": "2026-11-19T18:00:00Z",
  "currency": "EUR",
  "lines": [
    { "item_id": 1, "quantity": 2 },
    { "sku": "SKU-100", "quantity": 1 }
  ],
  "metadata": {}
}
```

**Response 201:** orden puente con `zyrion` (`success` | `failure` | `indeterminate`), `so_id` si se creó el SO, `stage`, `visual_anchor`.

Idempotente por `external_source` + `external_order_id`.

---

### `GET /api/integrations/orders` · `GET /api/integrations/orders/{id}`

**Cuándo:** panel o integración para ver órdenes puente y su estado Zyrion.

---

### `POST /api/integrations/orders/{id}/advance`

**Cuándo:** el almacén (o un job) avanza la etapa visible para el comerciante.

**Body:**
```json
{
  "stage": "courier",
  "message": "Entregado al mensajero",
  "zyrion": "success"
}
```

**Response 200:** orden actualizada + evento emitido.

---

### `GET /api/integrations/events?bridge_id=`

**Cuándo:** timeline para el dashboard del comerciante o webhooks de salida.

**Response:** `{ "events": [ { "stage", "zyrion", "message", "created_at" } ] }`

---

### `POST /api/integrations/platform-fees`

**Cuándo:** registrar pago **B2B** del comerciante a la plataforma (no checkout retail).

**Body:**
```json
{
  "merchant_id": "merchant-1",
  "provider": "stripe",
  "amount": "49.00",
  "currency": "EUR",
  "zyrion": "success"
}
```

---

## 18. Orden típico de uso en el frontend

### Admin web (día a día)
1. `POST /api/auth/login` → cookies  
2. `GET /api/auth/me`  
3. `GET /api/admin/dashboard`  
4. Catálogo / PO / SO según menú  
5. Escrituras con header CSRF  

### Móvil piso
1. Login → guardar JWT  
2. `GET /api/warehouses/list`  
3. Flujo: receiving → putaway → picking → packing → shipping  
4. Lookup en cada escaneo  

### Tienda externa del comerciante
1. Cobra en su checkout  
2. `POST /api/integrations/orders/paid`  
3. Consulta `events` / `advance` según progresión del almacén  

---

## 19. Base URL y prueba rápida

```bash
BASE=https://smart-wms-twin.onrender.com

curl -s $BASE/api/health

curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"operator","password":"Operator123"}'
```

---

## 20. Nota de paridad

Los endpoints anteriores son el **contrato HTTP** que el frontend debe usar. Algunos módulos profundos (connectors con sync real, reglas de fraude complejas, etc.) pueden responder con forma correcta pero lógica aún en ampliación frente al Flask original. Para el equipo de front: **integrar contra estas rutas y shapes**; el gemelo se mantiene alineado sin cambiar nombres de URL.
