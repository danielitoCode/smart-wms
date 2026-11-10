# Estructura del backend gemelo en Go

## Decisión arquitectónica

Estoy separando el backend gemelo del backend Python original. El código nuevo de Go se alojará exclusivamente en `wms-twin/`. No voy a reorganizar ni mover carpetas originales para hacer espacio al gemelo.

La arquitectura será orientada a organismos y organizada por capacidades de negocio. Mantendré separadas las reglas del dominio, los casos de uso, los contratos HTTP y los adaptadores tecnológicos. PrismaTEC-Core será una dependencia/runtime externo con una frontera pública explícita; no copiaré su implementación a este repositorio.

## Estructura objetivo

La estructura siguiente es la dirección arquitectónica prevista, no una afirmación de que todos esos paquetes ya existan:

```text
wms-twin/
├── go.mod
├── go.sum
├── cmd/
│   └── wms-twin/
│       └── main.go
├── internal/
│   ├── bootstrap/
│   ├── config/
│   ├── transport/
│   │   └── http/
│   │       ├── middleware/
│   │       ├── handlers/
│   │       └── compatibility/
│   ├── organisms/
│   │   ├── warehouse/
│   │   ├── product/
│   │   ├── inventory/
│   │   ├── receiving/
│   │   ├── orders/
│   │   ├── picking/
│   │   ├── packing/
│   │   ├── shipping/
│   │   ├── transfers/
│   │   ├── cyclecount/
│   │   ├── adjustments/
│   │   ├── identity/
│   │   └── integrations/
│   ├── platform/
│   │   ├── prismatec/
│   │   ├── observability/
│   │   └── security/
│   └── testkit/
├── tests/
│   ├── contract/
│   ├── parity/
│   └── integration/
├── deployments/
│   ├── docker/
│   └── proxy/
└── docs/
```

Crearé paquetes solo cuando exista una responsabilidad implementada. No crearé directorios vacíos para aparentar avance.

## Responsabilidad de cada capa

- **Organismo/domain:** entidades, invariantes, estados y reglas propias del negocio. No conoce HTTP, SQL ni detalles de transporte.
- **Application:** casos de uso, coordinación de organismos, transacciones lógicas, autorización requerida y puertos que necesita.
- **Ports:** interfaces pequeñas que expresan capacidades requeridas: identidad, persistencia, eventos, contenido, evaluación de reglas y transporte.
- **Adapters:** implementaciones concretas para conectar esos puertos con PrismaTEC-Core/AIP y, solo para pruebas o desarrollo, dobles locales explícitos.
- **Transport/compatibility:** reproduce el contrato HTTP que el frontend actual espera. No debe contaminar el dominio con nombres o códigos específicos del framework Flask.
- **Bootstrap:** compone configuración, puertos, adaptadores, middleware y servidor.

## Organismos iniciales

La lista de organismos de negocio que debo contrastar con las rutas y modelos reales del backend original es:

| Organismo | Responsabilidad |
|---|---|
| Warehouse | almacenes, zonas y ubicaciones |
| Product | catálogo, unidades, SKU y atributos |
| Inventory | existencias por almacén/ubicación/lote |
| Receiving | recepción y validación de mercancía |
| Orders | órdenes de compra y venta |
| Picking | asignación y extracción |
| Packing | embalaje y preparación |
| Shipping | despacho y expedición |
| Transfers | transferencias entre ubicaciones/almacenes |
| CycleCount | conteos físicos y conciliación |
| Adjustments | ajustes controlados de inventario |
| Identity | usuarios, roles, sesiones y permisos |
| Integrations | conectores y sincronización externa |

No asumiré que esta tabla coincide uno a uno con los módulos del backend. La correspondencia definitiva se obtiene mediante auditoría de rutas, modelos, servicios, esquemas y consumidores del frontend.

## Integración con PrismaTEC-Core

PrismaTEC-Core no se incluye como código fuente, submódulo ni copia vendorizada dentro de Smart WMS. La integración se realizará únicamente por interfaces públicas verificadas: SDK/dependencia Go publicada y accesible, o servicio externo mediante AIP/HTTP/IPC documentado.

Antes de fijar imports, métodos o contratos, verificaré en el repositorio Core la versión de Go, los paquetes exportados, ejemplos funcionales, ciclo de vida del nodo, persistencia, eventos, políticas, identidad, replicación y recuperación. Ningún nombre de paquete o API se inventará para completar un scaffold.

Conceptos que mantendré separados:

- `NodeID`: identidad del participante WMS.
- `PeerID`: identidad criptográfica del peer libp2p.
- `RootCID`: CID del manifiesto/contenido raíz del organismo.
- IPFS: persistencia direccionada por contenido; un CID no prueba autoría ni disponibilidad.
- libp2p: transporte entre peers.
- Kademlia: descubrimiento y localización.
- GossipSub: distribución de mensajes/eventos.
- Mind/Genes: evaluación de premisas/reglas/evidencias; una conclusión no equivale a autorización.

## Consistencia de inventario distribuido

No habilitaré multi-escritura de inventario por el simple hecho de conectar nodos. Antes se requiere:

1. autoridad explícita por partición de inventario;
2. lease y fencing token monotónico;
3. clave de idempotencia por operación;
4. eventos con identidad estable y deduplicación;
5. política de conflictos y reconciliación;
6. trazabilidad y evidencia de autorización;
7. pruebas de partición, reintentos, caída y recuperación.

Las operaciones offline se registrarán como propuestas pendientes cuando no exista autoridad vigente. No reducirán existencias autoritativas hasta validar la autoridad y aplicar la política de reconciliación.

## Contrato HTTP y compatibilidad

El backend original utiliza rutas bajo `/api`; el cliente admin inspeccionado usa `fetch('/api' + path)`, credenciales `include`, token CSRF en `X-CSRF-Token` y redirección ante 401. Por tanto, la compatibilidad no es solo JSON: incluye cookies/sesión, CSRF, CORS, códigos de error y semántica de permisos.

El adaptador HTTP del gemelo reproducirá rutas, métodos, nombres de campos, valores por defecto, errores y códigos observados. El proxy inverso permitirá seleccionar backend sin tocar el frontend, siempre que las pruebas confirmen la compatibilidad de ambos clientes.

## Estado de implementación

En este momento, esta estructura es un plano de trabajo. El primer commit existente contiene una frontera exploratoria bajo `api/prismatec/`, pero todavía no es el backend Go gemelo y no debe confundirse con la arquitectura objetivo descrita aquí. La implementación Go comenzará después de completar la inspección técnica de PrismaTEC-Core y el inventario contractual del backend original.
