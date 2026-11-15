# Tutorial de Go con el gemelo WMS (wms-twin)

Este tutorial es para ti. Explica Go desde cero usando ejemplos reales del repositorio del gemelo. No asume que ya dominas el lenguaje.

## 0. Qué es Go y por qué está el gemelo en Go

Go (Golang) es un lenguaje creado en Google. Se compila a un binario: generas un ejecutable y lo corres sin instalar un "runtime" pesado en el servidor como a veces pasa con otros lenguajes.

El gemelo (`wms-twin`) es un programa Go que:
1. Escucha peticiones HTTP en un puerto (por ejemplo 5001).
2. Por dentro usa PrismaTec-Core para guardar datos.
3. Organiza el código en paquetes (carpetas con archivos `.go`).

Cuando ejecutas `go run ./cmd/wms-twin` o el binario compilado, arranca ese programa.

## 1. Anatomía de un archivo Go

Todo archivo `.go` empieza así:

```go
package httpapi

import (
    "net/http"
    "strings"
)
```

- `package nombre` — declara a qué paquete pertenece el archivo. En Go, todos los archivos de una misma carpeta deben compartir el mismo nombre de package (salvo los tests).
- `import (...)` — trae código de otros paquetes. `"net/http"` es de la biblioteca estándar. Los paths largos como `github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog` son paquetes de ESTE proyecto.

Luego vienen tipos, constantes, variables y funciones.

## 2. Paquetes y carpetas del gemelo

En Go la carpeta ES el paquete (casi siempre).

Ejemplos del gemelo:
- `cmd/wms-twin/` — punto de entrada (`main`).
- `internal/httpapi/` — package `httpapi` (rutas `/api`).
- `internal/features/catalog/` — package `catalog`.
- `internal/features/zyrion/` — package `zyrion`.
- `internal/corestore/` — package `corestore`.

La palabra `internal` en la ruta es una convención de Go: ese código solo lo pueden importar módulos padres del mismo módulo. Es una forma de no exportar la tripa del gemelo a proyectos ajenos.

## 3. El programa principal: package main y func main

Solo el package `main` con una función `main` puede ser un ejecutable.

Idea:

```go
package main

func main() {
    // aquí arranca todo
}
```

En el gemelo, `cmd/wms-twin` llama al runtime, crea el nodo PrismaTec, monta el servidor HTTP y se queda escuchando.

## 4. Variables y tipos básicos

```go
var nombre string = "operator"
edad := 30          // := declara e infiere el tipo (int)
var activo bool = true
var precio float64 = 12.5
```

`:=` solo funciona dentro de funciones. Fuera se usa `var`.

Tipos que verás mucho en el gemelo:
- `string` — texto
- `int`, `int64` — enteros (`warehouse_id` suele ser `int64`)
- `bool` — verdadero/falso
- `error` — interfaz especial para errores
- `map[string]any` — diccionario clave texto → cualquier valor (muy usado en JSON flexible)
- `[]Tipo` — rebanada (slice), lista dinámica

## 5. Structs: tus "objetos" de datos

Go no tiene clases al estilo Java. Usa **structs** (estructuras):

```go
type BridgeOrder struct {
    ID         string `json:"id"`
    SONumber   string `json:"so_number"`
    ZyrionCode int    `json:"zyrion_code"`
}
```

- `type Nombre struct { ... }` define el tipo.
- Los campos con mayúscula inicial (`ID`) son **exportados** (visibles fuera del package).
- Con minúscula serían privados al package.
- `` `json:"id"` `` es una **etiqueta** (tag): dice cómo se llama el campo al convertir a JSON.

En el gemelo, `SalesOrder`, `BridgeOrder`, `PaidOrderInput` son structs.

## 6. Funciones y métodos

Función normal:

```go
func Parse(s string) Outcome {
    return Indeterminate
}
```

Método (función con **receptor**):

```go
func (o Outcome) String() string {
    return "success"
}
```

El `(o Outcome)` significa: este método pertenece al tipo `Outcome`. Se llama `o.String()`.

En el gemelo verás mucho:

```go
func (s *Service) IngestPaidOrder(in PaidOrderInput, actor string) (BridgeOrder, error)
```

- Receptor `*Service` (puntero al servicio).
- Devuelve dos valores: el pedido puente y un `error`.
- En Go es habitual devolver `(resultado, error)`.

## 7. Punteros (* y &)

`*Service` significa "puntero a Service": no copias toda la estructura, pasas la dirección en memoria.

- `&x` — dirección de x
- `*p` — valor al que apunta p

¿Por qué el gemelo usa punteros en servicios? Porque el `Service` guarda el `store`, repositorios, mutex… y quieres **el mismo** objeto compartido, no una copia.

## 8. Interfaces (contratos)

```go
type AdminResourceRepository interface {
    List(resource string) ([]map[string]any, error)
    Get(resource, id string) (map[string]any, bool, error)
}
```

Una interface dice **qué métodos** debe tener un tipo. No importa la implementación concreta.

Si `admindata.Store` tiene esos métodos, **cumple** la interface. Por eso existe:

```go
var _ ports.AdminResourceRepository = (*Store)(nil)
```

Eso es una comprobación en tiempo de compilación: "Store debe implementar el port".

## 9. Manejo de errores (no hay try/catch)

```go
bo, err := svc.IngestPaidOrder(in, actor)
if err != nil {
    // manejar error
    return
}
// usar bo
```

Siempre revisa `err`. Ignorarlo con `_` solo cuando de verdad no importa.

`errors.New("mensaje")` crea un error. `errors.Is(err, contracts.ErrNotFound)` compara con errores sentinela del package.

## 10. Slices y maps

```go
lines := []LineInput{}
lines = append(lines, LineInput{ItemID: 1, QuantityOrdered: 2})

m := map[string]any{"status": "ok"}
m["warehouse_id"] = 3
```

`append` añade al final del slice. Los maps se usan mucho al hablar JSON genérico en admin.

## 11. JSON: de struct a bytes y viceversa

```go
import "encoding/json"

raw, err := json.Marshal(bo)      // struct → []byte JSON
err = json.Unmarshal(raw, &bo)    // JSON → struct
```

En el gemelo, al guardar un organismo:

1. Armas el struct o un `map[string]any`.
2. `json.Marshal` → bytes.
3. `corestore.Put(kind, id, raw)`.

Al leer: `Get` → bytes → `json.Unmarshal` → struct.

Las etiquetas `json:"so_number"` hacen que el JSON use snake_case como el frontend.

## 12. HTTP en el gemelo (net/http)

Registro de rutas:

```go
mux.HandleFunc("/api/integrations/", s.RequireAuth(s.integrationsRoute))
```

- `mux` es el enrutador.
- `HandleFunc` asocia una ruta a una función.
- `s.RequireAuth(...)` envuelve el handler: primero comprueba sesión, luego llama a la función real.

Un handler típico:

```go
func (s *Server) integrationsRoute(w http.ResponseWriter, r *http.Request) {
    // w = respuesta, r = petición
}
```

`r.Method` es GET/POST. `r.URL.Path` es la ruta. El body se lee y se decodifica a un struct.

`writeJSON(w, 201, bo)` (helper del gemelo) escribe status y JSON.

## 13. Middleware: RequireAuth

No es magia: es una función que recibe un handler y devuelve otro handler.

Flujo mental:
1. Llega la petición.
2. RequireAuth mira cookie o header Bearer.
3. Si no hay identidad válida → 401.
4. Si hay → llama al handler original.

Por eso casi todas las rutas del gemelo pasan por `RequireAuth`.

## 14. Concurrencia básica: sync.Mutex

```go
s.mu.Lock()
defer s.mu.Unlock()
// zona crítica
```

Varias peticiones HTTP pueden entrar a la vez. El mutex evita que dos goroutines corrompan el mismo mapa/store al mismo tiempo. `defer` asegura que el Unlock se ejecuta al salir de la función, incluso si hay return anticipado.

## 15. Tests

Archivos `*_test.go`, package igual o `package x_test`.

```go
func TestIngestPaidOrderCreatesSOAndEvents(t *testing.T) {
    k := testkit.New(t)
    // ...
    if err != nil {
        t.Fatal(err)
    }
}
```

`go test ./internal/features/contracts/` ejecuta esos tests. El `testkit` crea un nodo PrismaTec temporal en una carpeta que se borra al terminar.

## 16. Modules (go.mod)

`go.mod` declara el nombre del módulo y dependencias:

```text
module github.com/danielitoCode/smart-wms/wms-twin
```

`go sum` fija versiones. Cuando importas PrismaTec-Core, viene de ahí.

## 17. Cómo añadir una funcionalidad nueva (mapa mental en Go)

1. Decides el package (`features/algo`).
2. Defines structs de entrada/salida.
3. Escribes métodos del `Service` o `Repository` que usan `corestore`.
4. Devuelves `(resultado, error)`.
5. En `httpapi`, un handler delgado llama al service.
6. Registras la ruta en `Handler()` con `RequireAuth` si aplica.
7. En `NewWithIdentity` cableas `contracts.New(...)` etc.
8. Escribes un test en `*_test.go`.

Eso es exactamente el patrón del puente comercio (`contracts`) y de catálogo/receiving.

## 18. Lectura guiada de un ejemplo real: Zyrion

```go
type Outcome int
const (
    Failure       Outcome = 0
    Success       Outcome = 1
    Indeterminate Outcome = 2
)
```

`Outcome` es un tipo basado en int. Las constantes dan nombres legibles. El método `String()` convierte a texto para JSON/logs. `Parse` hace el camino inverso desde un string del API.

No es herencia: es un tipo simple con métodos.

## 19. Errores frecuentes al leer el gemelo

- Ver `*Server` y pensar en clase Java: es struct + métodos.
- Buscar try/catch: no existe; mira `if err != nil`.
- Confundir package con carpeta de "controllers": en este proyecto la feature está en `features/`, HTTP en `httpapi/`.
- Asustarse por paths largos de import: son solo la dirección del módulo.

## 20. Mini glosario

- **Package** — unidad de código (carpeta).
- **Struct** — datos con campos.
- **Interface** — contrato de métodos.
- **Slice** — lista dinámica.
- **Map** — diccionario.
- **Pointer** — dirección de un valor.
- **Goroutine** — hilo ligero (el servidor HTTP las usa por petición).
- **Mutex** — candado para datos compartidos.
- **Tag json** — nombre del campo en JSON.
