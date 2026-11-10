# Guía de trabajo — Backend gemelo PrismaTEC

## Propósito

Estoy construyendo un segundo backend para Smart WMS, independiente del backend original y orientado a ejecutarse sobre PrismaTEC-Core. Mi objetivo es que ambos puedan funcionar simultáneamente y que el frontend actual pueda trabajar con cualquiera de ellos mediante configuración de despliegue, sin reescribir sus pantallas ni sus flujos.

**Regla principal:** no modifico, elimino ni sustituyo el backend original. Todo el backend gemelo nuevo vivirá en `wms-twin/`. La rama de trabajo es `feat/wms-prismatec-genesis`; no trabajo sobre `main`.

## Estado real a la fecha de esta guía

- La rama `feat/wms-prismatec-genesis` existe y parte de `main`.
- Existe un primer commit de frontera técnica: `0a47c26be3f805ff24779fb267bbb2d57b3f5aa9`.
- Ese commit añadió contratos/adaptadores exploratorios bajo `api/prismatec/` y documentación de frontera. No reemplaza ni modifica los módulos preexistentes del backend.
- **Todavía no existe una implementación funcional completa del gemelo en `wms-twin/`.**
- No declaro paridad funcional, integración real con PrismaTEC-Core, ni ejecución satisfactoria de pruebas hasta que existan evidencias reproducibles.
- El repositorio ya dispone de workflows de CI para el backend original. Estoy añadiendo una comprobación separada para el gemelo y sus contratos.
- No se ha habilitado todavía una regla de protección de rama que obligue a GitHub a bloquear merges por checks; esa configuración depende de permisos administrativos del repositorio.

## Límites que no voy a cruzar

1. No modificar ni borrar el backend original.
2. No cambiar el frontend original para adaptarlo al gemelo. Primero debo reproducir su contrato HTTP.
3. No copiar, vendorizar, publicar ni incluir código fuente privado de PrismaTEC-Core en este repositorio.
4. No introducir PostgreSQL como requisito del gemelo. La persistencia definitiva debe apoyarse en las capacidades reales y verificadas de PrismaTEC-Core; cualquier almacén local de desarrollo se identificará como tal.
5. No presentar una interfaz simulada o un adaptador provisional como integración real.
6. No activar escrituras distribuidas de inventario sin autoridad, idempotencia, fencing y reconciliación definidos.
7. No fusionar esta rama en `main` sin autorización expresa.

## Documentos que mantienen el contexto

- [EstructuraBackendGo.md](EstructuraBackendGo.md): estructura prevista y reglas de diseño del backend Go.
- [NivelDeParidadConBackendOriginal.md](NivelDeParidadConBackendOriginal.md): matriz de compatibilidad y estado por funcionalidad.
- [AUDITORIA_GEMELO.md](AUDITORIA_GEMELO.md): registro cronológico de cambios, fallos, detonantes y acciones.
- [docs/architecture/PRISMA_CORE_BOUNDARY.md](docs/architecture/PRISMA_CORE_BOUNDARY.md): límites de seguridad y conceptos de integración.

## Cómo obtener la rama en mi máquina

Si todavía no tengo esta rama local:

```bash
git fetch origin
git switch --track origin/feat/wms-prismatec-genesis
```

Si ya existe localmente:

```bash
git switch feat/wms-prismatec-genesis
git fetch origin
git pull --ff-only origin feat/wms-prismatec-genesis
```

Para comprobar dónde estoy y qué cambios tengo:

```bash
git status --short --branch
git branch --show-current
git log -5 --oneline --decorate
```

No debo ejecutar estos comandos desde una rama con cambios locales sin revisar antes `git status`. Si tengo trabajo sin guardar, debo confirmarlo o guardarlo antes de actualizar.

## Cómo ejecutar la infraestructura hoy

### Backend original

El backend original conserva sus instrucciones y dependencias propias. Su despliegue actual exige PostgreSQL mediante `DATABASE_URL`; también usa Redis/Celery en los flujos que lo requieren. No debo interpretar esta dependencia como requisito del gemelo.

Antes de ejecutarlo, reviso el README raíz, `.env.example`, `docker-compose.yml` y los scripts existentes. No invento variables ni valores secretos: copio el archivo de ejemplo a un archivo local ignorado por Git y completo credenciales de desarrollo propias.

### Backend gemelo

La implementación Go todavía no está creada. Por tanto, no hay un comando honesto de arranque para ella en este estado. Cuando se incorpore el primer servicio ejecutable, actualizaré aquí el comando exacto, versión de Go, variables, puertos, dependencias, persistencia y procedimiento de apagado.

### Frontend

El cliente admin actualmente usa rutas relativas bajo `/api` y credenciales de sesión/cookies; por ello, cambiar solamente una variable genérica `VITE_API_BASE_URL` no está demostrado como compatible. La estrategia inicial es mantener el frontend intacto y seleccionar el backend mediante el proxy inverso o la configuración del servidor web que resuelva `/api` hacia el backend elegido.

No se afirmará que el frontend puede alternar hasta comprobar también el cliente móvil, CORS/cookies, CSRF, autenticación y todos los endpoints consumidos.

## Cómo seleccionar uno u otro backend

La forma segura prevista es desplegar cada backend en un puerto/servicio diferente y dirigir el mismo prefijo público `/api` al destino elegido desde el proxy inverso:

- modo original: `/api` → backend original;
- modo gemelo: `/api` → backend gemelo;
- modo de comparación: dos hosts o entornos separados, cada uno apuntando a un backend; no enviar una misma mutación a ambos en producción.

No se recomienda replicar escrituras automáticamente a ambos backends: puede duplicar recepciones, movimientos, picking o ajustes. La comparación debe usar datos aislados, fixtures o tráfico de solo lectura hasta diseñar una estrategia explícita.

## Pruebas, diagnóstico y aceptación

La prueba de una funcionalidad no se limita a comprobar que el endpoint responde HTTP 200. Para cada ruta debo comparar:

- método, ruta, autenticación y permisos;
- payload aceptado, validaciones y valores por defecto;
- código HTTP y estructura JSON de respuesta/error;
- efectos persistidos y transacciones;
- idempotencia, concurrencia y auditoría cuando aplique;
- comportamiento consumido por admin y mobile.

Para investigar un fallo:

1. Identifico commit, rama, entorno y versión de configuración.
2. Reproduzco el caso con datos de prueba, sin credenciales reales.
3. Comparo request/response original y gemelo, ocultando tokens y datos sensibles.
4. Reviso logs correlacionados por request/event ID.
5. Aíslo si el origen es contrato, dominio, persistencia, red, Core, autorización o frontend.
6. Registro detonante, impacto, evidencia, corrección y prueba de regresión en `AUDITORIA_GEMELO.md`.
7. Actualizo matriz de paridad y guía en el mismo cambio que corrige el problema.

Los comandos concretos de test del gemelo se incorporarán cuando exista el módulo Go. Hasta entonces, no se debe asumir que `go test ./...` ya es aplicable.

## Continuidad para desarrolladores y agentes de IA

Antes de cambiar código, leer en este orden:

1. este archivo;
2. `NivelDeParidadConBackendOriginal.md`;
3. `EstructuraBackendGo.md`;
4. `AUDITORIA_GEMELO.md`;
5. los contratos y código del organismo que se vaya a modificar.

Después de cada actualización debo dejar claro: qué cambié, por qué, qué no cambié, cómo lo probé, resultado exacto, riesgos conocidos y siguiente tarea concreta. Si una afirmación no está verificada, debe permanecer marcada como pendiente.

## Regla de actualización documental

Cada commit que modifique el gemelo debe actualizar en el mismo commit los documentos afectados. Como mínimo revisar esta guía, la estructura, la paridad y la auditoría. Si el cambio altera comandos, dependencias, variables, puertos o pruebas, esta guía debe reflejarlo.
