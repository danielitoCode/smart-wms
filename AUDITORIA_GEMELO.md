# Auditoría de cambios y problemas — Backend gemelo

## Propósito y reglas

Mantengo este registro para que el equipo pueda reconstruir qué se modificó, por qué se hizo, qué lo detonó, qué consecuencias tuvo y cómo se verificó.

Cada entrada debe identificar commit/PR cuando exista, archivos afectados, detonante, decisión, impacto sobre el backend original, pruebas y resultado. No registraré secretos, tokens ni datos personales. Una hipótesis se marcará como hipótesis; no la presentaré como causa raíz demostrada.

## Registro cronológico

### AUD-0001 — Frontera técnica inicial

- **Commit:** `0a47c26be3f805ff24779fb267bbb2d57b3f5aa9`
- **Cambio:** incorporación de contratos exploratorios y adaptadores iniciales bajo `api/prismatec/`, pruebas iniciales y `docs/architecture/PRISMA_CORE_BOUNDARY.md`.
- **Detonante:** necesidad de establecer una frontera entre capacidades WMS y tecnología PrismaTEC sin incorporar código privado del Core.
- **Decisión:** definir puertos para identidad, eventos, contenido, transporte y gateway Core; mantener el Core fuera del repositorio.
- **Impacto sobre backend original:** no se modificaron archivos preexistentes en ese commit. Los archivos nuevos quedaron dentro del árbol `api/`; por claridad arquitectónica, el gemelo definitivo se desarrollará de forma independiente en `wms-twin/` y no dependerá de esos archivos exploratorios hasta revisar su conveniencia.
- **Pruebas:** se añadió un archivo de pruebas, pero no tengo evidencia registrada de que se haya ejecutado en CI o localmente. Estado: **no verificado**.
- **Problemas / detonantes secundarios:** la frontera HTTP del Core y sus APIs exportadas no están verificadas; no afirmar conectividad funcional.
- **Siguiente acción:** auditar el Core real y el contrato completo del backend original antes de implementar el servicio Go.

### AUD-0002 — Documentación operativa y controles de integración

- **Commit:** `aef763491ddbcd24e6a3e02a78ca6777c2760f21`
- **Cambio:** creación de `Guia.md`, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, este registro y workflow de CI para validar cambios del gemelo.
- **Detonante:** necesidad de que cualquier desarrollador o agente pueda retomar el trabajo sin depender de conversaciones privadas y de que los cambios se verifiquen antes de integrarse.
- **Decisión:** documentar estado real, comandos, criterios de paridad, diagnóstico, límites y siguiente tarea. Ejecutar verificaciones automáticas en push y pull request hacia la rama gemela.
- **Impacto sobre backend original:** los archivos de backend y frontend originales no deben modificarse. El workflow nuevo será adicional.
- **Pruebas:** el workflow quedó registrado en el commit `aef763491ddbcd24e6a3e02a78ca6777c2760f21`. Aún no se ha observado una ejecución completada; resultado: **pendiente de CI**.
- **Limitación:** GitHub Actions no puede impedir que un usuario ejecute `git pull` en su propia máquina. Sí puede bloquear la aceptación de un pull request si el repositorio exige los checks como reglas de protección. La exigencia de checks debe habilitarse en settings del repositorio con permisos administrativos.
- **Siguiente acción:** auditar rutas, DTO, auth, permisos, pruebas y clientes; verificar APIs reales de PrismaTEC-Core; iniciar `wms-twin/` únicamente después.

## Plantilla obligatoria para futuras entradas

### AUD-XXXX — Título breve

- **Fecha:**
- **Commit / PR:**
- **Área y archivos:**
- **Detonante / problema observado:**
- **Causa raíz:** confirmada / probable / desconocida, con evidencia.
- **Cambio realizado:**
- **Motivo de la decisión:**
- **Impacto en backend original:** ninguno / riesgo / cambio autorizado.
- **Pruebas ejecutadas:** comandos y entorno.
- **Resultado:** aprobado / fallido / parcial / no ejecutado.
- **Riesgos y deuda pendiente:**
- **Siguiente paso:**

## Cómo reportar fallos

Un fallo debe incluir la operación que lo dispara, request sanitizado, response/status, logs correlacionados, commit, entorno, estado inicial de datos y pasos de reproducción. Si aún no se conoce el detonante, se registra como desconocido y se conserva la evidencia. Cada corrección debe agregar una prueba de regresión y actualizar el nivel de paridad.
