# Manual de PrismaTec-Core en el gemelo WMS

Escribo este manual para que **cualquier persona del equipo** entienda qué es PrismaTec-Core y cómo lo usa el gemelo, aunque no programe todos los días. Voy punto por punto, con ejemplos del propio sistema.

Si solo necesitas arrancar y probar, lee primero `README.md` en esta misma carpeta. Aquí profundizo en la **tecnología base**.

---

## 1. La idea en una frase

**PrismaTec-Core es el motor que guarda y organiza la información del gemelo.**  
El admin y el móvil no hablan con PrismaTec-Core directamente: hablan con el gemelo (`/api/...`), y el gemelo, por dentro, usa PrismaTec-Core para no perder ni mezclar los datos.

Piensa en tres capas, como un restaurante:

| Capa | Analogía | En nuestro proyecto |
|------|----------|---------------------|
| Cliente | El comensal pide el plato | Admin web o app móvil |
| Gemelo (wms-twin) | El camarero y la cocina del local | Go + rutas `/api` |
| PrismaTec-Core | La despensa y el libro de inventario del local | Nodo, organismos, historial de movimientos |

Sin despensa no hay restaurante estable. Sin PrismaTec-Core el gemelo no tendría dónde asentar el almacén de forma coherente con nuestra tecnología.

---

## 2. ¿Qué problema resolvemos?

El sistema original (Flask) guarda el almacén en una base de datos clásica (PostgreSQL).

El **gemelo** hace el mismo trabajo de cara al usuario (mismas pantallas, mismas URLs de API), pero **por debajo** usa **PrismaTec-Core** como base tecnológica propia:

- Cada dato importante del negocio queda registrado de forma clara.
- Los movimientos de stock no se “olvidan” ni se duplican a la ligera.
- Todo vive dentro de un **nodo** (una instancia del motor) que podemos arrancar en laboratorio o en un servidor.

No estoy pidiendo que el equipo aprenda otra API rara en el navegador. El navegador sigue usando `/api/auth/login`, `/api/admin/warehouses`, etc. PrismaTec-Core queda **detrás del mostrador**.

---

## 3. Conceptos de PrismaTec-Core (sin jerga innecesaria)

### 3.1 El nodo

Un **nodo** es **una copia en marcha del motor PrismaTec-Core**.

Cuando ejecuto `./scripts/start-lab.sh`, arranco:

1. El programa del gemelo (el que escucha en el puerto 5001).
2. Dentro de ese mismo proceso, **un nodo PrismaTec-Core** con su carpeta de datos.

**Ejemplo:** en tu PC de desarrollo el nodo guarda archivos en un directorio de datos del laboratorio. Si apagas el proceso y lo vuelves a levantar sobre los mismos datos, el gemelo puede seguir viendo almacenes, pedidos e ítems que ya había creado.

### 3.2 El organismo

Un **organismo** es **un registro de negocio** que el Core entiende y guarda.

Ejemplos reales en el gemelo:

| Lo que ves en la pantalla / API | Por dentro (organismo) |
|---------------------------------|-------------------------|
| Un almacén “DEMO-1” | Un organismo de tipo almacén |
| Un producto / SKU | Un organismo de tipo ítem |
| Un pedido de venta (SO) | Un organismo de tipo sales-order |
| Un canal de admin | Un organismo de tipo canal (admin) |

No hace falta memorizar nombres técnicos. La regla es: **si es un dato estable del negocio, en el gemelo suele vivir como organismo dentro de PrismaTec-Core.**

### 3.3 El almacén de organismos (corestore)

Entre el código del WMS y PrismaTec-Core hay un puente que yo llamo **corestore**.

Su trabajo es simple de explicar:

- **Guardar** un organismo (“crea este almacén”).
- **Leer** un organismo (“dame el almacén 3”).
- **Listar** (“dame todos los canales”).
- **Borrar** cuando el caso de uso lo permite.

**Ejemplo:** cuando el script de demo crea un warehouse por API, el flujo es:

1. Llega `POST /api/admin/warehouses` al gemelo.
2. El gemelo valida la sesión (usuario operator/admin).
3. La parte de “catálogo” pide guardar el almacén.
4. **corestore** se lo entrega a **PrismaTec-Core** como organismo.
5. La API responde con el `warehouse_id` que el cliente necesita.

Tú en la pantalla (o en curl) solo ves el JSON. PrismaTec-Core es quien lo ha quedado registrado.

### 3.4 El libro de inventario (ledger)

El stock no es solo un número en una celda. En un almacén real importan **las entradas y salidas**.

El **ledger** del gemelo es el **libro de movimientos de inventario** apoyado en PrismaTec-Core:

- Entrada por recepción.
- Movimiento de putaway (de muelle a ubicación).
- Reserva o salida por picking / envío.

Cada movimiento lleva una **clave de operación**. Si el mismo movimiento se reintenta (red inestable, doble clic), el sistema puede reconocer “esto ya lo apliqué” y no sumar dos veces.

**Ejemplo de la demo curl:**

1. Creo un producto y un bin de staging.
2. Recibo mercancía en staging.
3. Hago putaway al bin pickable.
4. El ledger ha anotado esos cambios; el resumen de staging y las cantidades cuadran con eso.

### 3.5 AIP (la puerta “interna” del Core)

PrismaTec-Core puede exponer su propia puerta de administración del **nodo** (AIP), en otro puerto.

- **Eso no es** lo que usa el admin React ni el móvil del WMS.
- Es una superficie del **motor**, no de las pantallas de almacén.

Para el equipo de producto del WMS, el camino diario es siempre **`http://…:5001/api/...`**.

### 3.6 Mesh (varios nodos)

Si en el futuro hay **varios nodos** hablando entre sí, PrismaTec-Core puede participar en una malla (intercambio de eventos/datos entre nodos).

En el laboratorio de un solo PC casi siempre trabajamos con **un solo nodo**. No necesitas dominar la malla para operar el gemelo en lab.

---

## 4. Cómo se conecta todo (dibujo mental)

```text
  Tú (navegador o móvil)
           │
           │  pides cosas a /api/...
           ▼
   ┌───────────────────┐
   │  Gemelo wms-twin  │  ← entiende el idioma del WMS (login, almacenes, pedidos…)
   └─────────┬─────────┘
             │  guarda y lee datos de negocio
             ▼
   ┌───────────────────┐
   │  PrismaTec-Core   │  ← nodo + organismos + base de integridad
   └───────────────────┘
```

**Ejemplo de login (admin web):**

1. Escribes usuario y contraseña en el admin.
2. El navegador llama a `/api/auth/login`.
3. El gemelo comprueba el usuario y crea la sesión (cookies de seguridad).
4. Los datos de usuario también viven en el modelo del gemelo sobre el store del Core.
5. Las siguientes pantallas ya pueden listar almacenes o pedidos porque la sesión es válida y los datos están en el nodo.

**Ejemplo de login (móvil):**

1. La app guarda un token (JWT) en el teléfono.
2. Cada petición lleva `Authorization: Bearer …`.
3. El gemelo acepta ese camino **sin** las cookies del navegador.
4. Por dentro, el acceso a organismos y al ledger es el mismo motor PrismaTec-Core.

Misma despensa, dos formas de “pedir mesa” (web vs app).

---

## 5. Organización del código del gemelo (para orientarse)

No hace falta programar para ubicarse:

| Carpeta | En palabras llanas |
|---------|-------------------|
| `features/` | Las capacidades del negocio: catálogo, recepción, picking, pedidos… |
| `httpapi/` | La puerta `/api` que ven admin y móvil |
| `corestore/` | El puente hacia PrismaTec-Core |
| `ports/` | Acuerdos de “quién guarda qué” (para no mezclar capas) |
| `scripts/` | Pruebas automáticas de laboratorio |
| `doc/` | Esta ayuda |

Cuando alguien dice “eso es de catálogo”, mira `features/catalog`.  
Cuando dice “eso es la API”, mira `httpapi`.  
Cuando dice “dónde se guarda de verdad”, el final del camino es **PrismaTec-Core vía corestore**.

---

## 6. Datos de admin que aún se están completando

Algunas pantallas de administración (canales, ciertos listados, etc.) todavía no tienen toda la lógica de negocio del Flask original.

La regla de trabajo es:

1. La **pantalla** no debe inventar datos mágicos en el botón.
2. El **gemelo** responde por API.
3. Si aún no hay lógica completa, los datos se guardan igual **como registros** en PrismaTec-Core (capa de datos), para que parezca un almacén real y no un truco en la interfaz.
4. Cuando la funcionalidad se termina de migrar, esos datos pasan a la feature definitiva y se deja de usar cualquier semilla de demostración.

Así el equipo de frontend puede avanzar sin depender de respuestas falsas pegadas en la pantalla.

---

## 7. Cómo compruebo que PrismaTec-Core está en el camino

### Health del gemelo

```bash
curl -s http://127.0.0.1:5001/api/health
```

En la respuesta debería aparecer que el servicio del gemelo está bien y la referencia al motor (**PrismaTec-Core**). Eso confirma: proceso arriba + identidad de motor presente.

### Crear algo y volver a listarlo

1. Login (script de demo o admin).
2. Crear un almacén.
3. Listar almacenes.

Si el almacén reaparece después de crear, **PrismaTec-Core está persistiendo** a través del gemelo (no es solo un mensaje vacío en memoria de un handler).

### Tests automáticos de features

```bash
cd wms-twin
go test ./internal/features/... -count=1
```

Esas pruebas levantan un **nodo PrismaTec-Core de mentira en una carpeta temporal**, ejercitan catálogo, recepción, etc., y tiran el directorio al terminar. Sirven para validar la integración sin montar el admin.

---

## 8. Qué debe quedar claro para todo el equipo

1. **PrismaTec-Core es la tecnología base de persistencia e integridad del gemelo.**
2. **Admin y móvil no se reescriben** para hablar con el Core: siguen con `/api`.
3. Un **nodo** = el motor en marcha con sus datos.
4. Un **organismo** = un registro de negocio guardado por el Core.
5. El **ledger** = el libro de movimientos de stock, con cuidado de no duplicar operaciones.
6. El trabajo nuevo se organiza por **features**; el Core no se llama desde la interfaz de usuario.

Si alguien pregunta “¿dónde está la base de datos del gemelo?”, la respuesta correcta en este diseño es: **en el nodo PrismaTec-Core que el gemelo arranca y usa por dentro**, no en una pestaña del admin.

---

## 9. Dónde seguir leyendo

| Documento | Para qué |
|-----------|----------|
| `doc/README.md` | Cómo operar el gemelo día a día (arrancar, probar, ampliar) |
| `doc/Guia_Completa_WMS_Twin_PrismaTec.pdf` | La guía de operación en formato PDF |
| **Este manual** | Entender PrismaTec-Core dentro del gemelo |

No hay más manuales activos en `doc/`. Todo lo demás se retiró para no dispersar al equipo.
