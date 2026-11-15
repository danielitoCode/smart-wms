# Integración futura: pagos y PrismaTec-Core

Escribo este estudio para orientar **integraciones futuras de pago** con el gemelo WMS y, en general, con sistemas apoyados en **PrismaTec-Core**. El mismo contenido está en `Integracion.pdf`.

No sustituye contratos legales ni certificación PCI: es una **guía de arquitectura y de proceso** para el equipo.

---

## 1. Qué problema resolvemos al integrar pagos

Un WMS (o un negocio digital sobre PrismaTec-Core) puede necesitar:

- Cobrar un pedido de venta (SO) o un servicio.
- Registrar que el dinero **entró** o **falló**, sin corromper el inventario.
- Reembolsar o anular con rastro auditable.
- Conectar con pasarelas de Italia y del resto del mundo sin reescribir todo el núcleo.

La regla de oro con PrismaTec-Core:

> El dinero y el stock son **hechos de negocio** que deben quedar como **organismos / eventos** en el nodo. La pasarela es un **adaptador externo**; no es la fuente de verdad del almacén.

---

## 2. Modelo mental (PrismaTec-Core)

```text
  Cliente / Admin / Móvil
           │
           ▼
     Gemelo / API de negocio
           │
     ┌─────┴─────────────────────┐
     │  Feature “pagos”          │
     │  (intents, estados, reglas)│
     └─────┬─────────────────────┘
           │ organismos
           ▼
     PrismaTec-Core (nodo)
           │
     ┌─────┴──────────────┐
     │ Adaptadores pago   │  Stripe, Nexi, PayPal…
     │ (webhooks, API)    │
     └────────────────────┘
```

### Organismos típicos que conviene definir

| Organismo (idea) | Qué guarda |
|------------------|------------|
| `payment_intent` | Monto, moneda, pasarela, estado (created / pending / paid / failed / refunded) |
| `payment_event` | Notificación cruda o resumida del proveedor (webhook) |
| `refund` | Devolución ligada al intent |
| Vínculo a `sales-order` | El SO del WMS que se está cobrando |

### Ledger

Si el pago **libera** o **bloquea** mercancía, el **ledger de inventario** solo se mueve cuando la regla de negocio lo diga (ej. “pagado → permitir ship”). El pago no escribe stock a ciegas.

---

## 3. Paso a paso genérico para integrar una pasarela

1. **Elegir el proveedor** según país, métodos (tarjeta, cuenta, BNPL) y coste.
2. **Crear cuenta** y obtener claves de prueba (test) y producción.
3. **Definir organismos** en el diseño PrismaTec (intent, event, refund).
4. **Implementar feature `payments`** en el gemelo (o servicio hermano): crear intent, consultar estado, aplicar webhook.
5. **Exponer API interna** (`/api/.../payments`) compatible con admin/móvil si hace falta.
6. **Webhook HTTPS público** que reciba eventos del proveedor, verifique firma y actualice el organismo.
7. **Idempotencia**: el mismo `event_id` del proveedor no debe aplicar dos veces (misma idea que `operation_id` del ledger).
8. **Pruebas en sandbox** (pagos de prueba, fallos, timeouts).
9. **Checklist PCI**: no guardar números de tarjeta en el nodo; solo tokens/ids del proveedor.
10. **Go-live** con secretos en variables de entorno, no en el frontend.

---

## 4. Plataformas globales (visión práctica)

| Plataforma | Fortalezas | Debilidades | Encaje PrismaTec-Core |
|------------|------------|-------------|------------------------|
| **Stripe** | API excelente, webhooks claros, muy documentada, disponible en Italia | Comisiones; requiere cuenta y compliance | Ideal como **primer adaptador**: intent + webhook → organismo |
| **PayPal** | Reconocimiento de usuario, checkout popular | UX y estados más heterogéneos | Adaptador de checkout + IPN/webhooks |
| **Adyen** | Unifica muchos métodos locales (UE) | Onboarding y complejidad enterprise | Bueno si el negocio escala multi-país |
| **Braintree** | PayPal family, tarjetas | Menos “local” que Adyen en algunos mercados | Similar a Stripe a nivel de diseño |
| **Square** | Fuerte en presencial + online | Cobertura por país variable | POS físico + intent online |
| **Worldpay / FIS** | Gran retail | Más pesado para equipos pequeños | Solo si el cliente ya lo exige |

**Recomendación de arranque técnico:** un adaptador **Stripe** (sandbox) para validar el diseño de organismos y webhooks sobre PrismaTec-Core; después añadir locales italianos.

---

## 5. Plataformas y métodos relevantes en **Italia**

| Solución | Qué es | Pros | Contras | Notas de integración |
|----------|--------|------|---------|----------------------|
| **Nexi** (y XPay) | Actor muy presente en pagos IT (ecommerce y físico) | Reconocimiento local, muchos comercios IT | Documentación y productos varían por plan; onboarding comercial | Adaptador con API Nexi + webhooks; mapear estados a `payment_intent` |
| **Satispay** | App de pago muy usada en Italia | Fuerte adopción local, buena para retail | Menos “global” que Stripe; flujos propios | QR / deep link + confirmación asíncrona → organismo `pending`→`paid` |
| **Bancomat Pay** | Pagos ligados al esquema Bancomat | Confianza del usuario italiano | Ecosistema y reglas específicas | Suele ir vía adquirente/Nexi u otros; no siempre API directa simple |
| **PagoPA** | Pagos a la **administración pública** italiana | Obligado en muchos trámites PA | No es pasarela ecommerce genérica | Solo si el caso de uso es sector público |
| **Stripe** (IT) | Pasarela internacional operativa en Italia | Misma API global, SEPA, tarjetas | No sustituye por sí sola todos los hábitos locales (Satispay, etc.) | Mejor base técnica + complementos locales |
| **PayPal** (IT) | Muy conocido | Conversión de usuarios que ya tienen cuenta | Comisiones y chargebacks | Complementario, no único |
| **Scalapay / BNPL** | Pago a plazos (buy now pay later) | Aumenta conversión en retail moda/ecommerce | Riesgo y reglas de crédito; no es cobro único simple | Organismo con estado `authorized` / `captured` a plazos |
| **SumUp / worldline (terminales)** | Cobro presencial | Rápido para tienda física | Integración online limitada según producto | Útil si el WMS se enlaza a tienda física |
| **Amazon Pay / Google Pay / Apple Pay** | Wallets | Fricción baja en mobile | Pasan por un adquirente (Stripe/Adyen/Nexi…) | Se habilitan **dentro** del adaptador principal |

### Cómo elegir en Italia (regla simple)

- **Solo ecommerce técnico y rápido:** Stripe (+ PayPal opcional).  
- **Público italiano de retail/apps locales:** Stripe o Nexi como base + **Satispay** si el cliente lo pide.  
- **Sector público:** PagoPA (proceso aparte).  
- **Multi-país UE con muchos métodos locales:** Adyen.

---

## 6. Cómo ponerlo en práctica con PrismaTec-Core (diseño concreto)

### Paso 1 — Feature `payments` (misma filosofía feature-first)

- Carpeta lógica: `features/payments` (crear intent, aplicar evento, reembolsar).
- No poner la lógica del proveedor dentro de `httpapi`.

### Paso 2 — Organismos

Ejemplo de contenido de un intent (idea):

- `intent_id`, `so_id`, `amount`, `currency` (EUR), `provider` (`stripe`|`nexi`|`satispay`…), `provider_ref`, `status`, `created_at`, `updated_at`.

Cada webhook verificado genera un `payment_event` ligado al intent.

### Paso 3 — Adaptadores

Una interfaz (port), por ejemplo:

- `CreateIntent(amount, currency, metadata) → provider_ref`
- `ParseWebhook(headers, body) → event normalizado`
- `Refund(provider_ref, amount)`

Implementaciones: `StripeAdapter`, `NexiAdapter`, `SatispayAdapter`.

### Paso 4 — Webhook

- Ruta dedicada, **sin** sesión de usuario admin (usa firma del proveedor).
- Verifica firma → idempotencia por `event_id` → actualiza organismo → opcionalmente emite evento de dominio (“pedido pagado”).

### Paso 5 — Efecto en el WMS

Solo entonces reglas del almacén, por ejemplo:

- Si `status=paid` → el SO puede pasar a flujo de packing/shipping.
- Si `failed` → no se reserva stock adicional.

### Paso 6 — Seguridad

- Nunca PAN/CVV en PrismaTec-Core.
- Secretos de pasarela solo en entorno del nodo.
- Auditoría: quién creó el intent y qué evento lo cerró.

---

## 7. Proyectos de prueba recomendados (orden)

1. **Sandbox Stripe**: crear intent, pagar con tarjeta de test, recibir webhook, ver organismo `paid`.  
2. **Ligar intent a un SO** del gemelo.  
3. **Segundo adaptador** (Satispay o Nexi en sandbox si está disponible para el equipo).  
4. **Refund** de prueba y estado `refunded` en el organismo.  
5. Documentar runbook de incidentes (pago cobrado / stock no movido, y al revés).

---

## 8. Pros y contras de centralizar pagos en PrismaTec-Core

**Pros**

- Una sola verdad de “estado de pago” en el nodo.  
- Mismo estilo de organismos que almacén, con auditoría.  
- Posibilidad futura de red de nodos / mesh sin acoplar el front a cada pasarela.

**Contras / riesgos**

- Hay que implementar bien webhooks e idempotencia.  
- PCI y contratos comerciales no se “resuelven” solo con código.  
- Cada pasarela italiana añade un adaptador y pruebas propias.

---

## 9. Relación con el estado actual del gemelo

Hoy el gemelo prioriza **paridad WMS** (almacén, auth, floor). Los pagos son **línea futura**: el diseño anterior encaja con Clean Architecture + ports + organismos sin romper el `/api` actual.

La prueba de integración **sin frontend** (`scripts/e2e-integracion-sin-frontend.sh`) valida el núcleo WMS; cuando exista `payments`, se añadirá un bloque de checks de intent/webhook en el mismo estilo curl.

---

## 10. Documentos hermanos

| Documento | Uso |
|-----------|-----|
| `README.md` / guía de operación | Arrancar y probar el gemelo |
| `MANUAL_FRAMEWORK_PRISMATEC` | Motor PrismaTec-Core |
| `PatronesEmpleados` | Arquitectura y seguridad del gemelo |
| **Este estudio** | Integraciones de pago futuras |
