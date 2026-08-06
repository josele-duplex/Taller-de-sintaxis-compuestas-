# Schema `formacion v1.0` — especificación de `Formacion_Banco`

**F0 · sesión 1 · 30-jul-2026 · 🟣 Opus 5** — documento base
**Ampliación v1.1 · F5 sesión 1 · 4-ago-2026 · 🟣 Opus 5** — canon de estructura secuenciada (§12)

Fuente de verdad del formato de datos del módulo La Fábrica de Palabras. Todo lote de contenido y todo cambio del motor se validan contra este documento.

> **Sobre el número de versión.** El documento va por **v1.1**; el campo `schema_version` de cada reto **sigue siendo `"1.0"`**. Las ampliaciones de la §12 son retrocompatibles (un campo opcional nuevo y un cambio de motor que no toca el dato), así que ningún reto de los lotes `basico` y `medio` ya escritos necesita tocarse. Es el mismo criterio que sigue `schema_compuesta_v1_2.md`, que documenta sus ampliaciones v1.3-v1.5 dentro del archivo sin renumerar el dato.

> **Por qué existe este documento.** Es la decisión que se paga todo el curso si sale mal: cada lote posterior (~30 retos de `basico`, ~30 de `medio`, los de `avanzado`) se escribe contra este schema, y el motor lo lee tal cual. Documento primero, código después.
>
> **Relacionado:** `docs/Fabrica_Palabras_Plan_Producto.md` (§5.1 del plan es el resumen de esto), `docs/Schema_Laboratorio_v1.0.md` (el módulo hermano; comparten cuatro tipos de ítem con estructura idéntica, §3), `scripts/validar-banco.mjs` (modo `formacion`).
>
> **Canon lingüístico** (leído, no de memoria): `unidades/1ESO/Gramatica_01_La-palabra-estructura-y-formacion_1ESO.md` y `unidades/3ESO/Gramatica_01_Formacion-de-palabras_3ESO.md` del proyecto de Lengua — esta última trae en su §4 la **mesa de herramientas con los 11 procedimientos y su prueba de descomposición ya redactada**, más el test rápido en cascada del §4. `materiales/morfologia_sintaxis/Referencia_Morfologia_Sintaxis.md` PARTE 1. `bancos_ejercicios/pares_minimos/morfologia.md` (sección I, los 9 pares `[1B]` de morfología léxica). Del repo: `js/data/diccionario-morfologia.js`, que confirma que el módulo Maestro cubre **clases de palabras** y no toca formación — cero solape.

---

## 1. La hoja `Formacion_Banco`

Una fila = un **reto** (mini-corpus de palabras emparentadas + sus ejercicios + su cierre).

| Columna | Tipo | Obligatoria | Contenido |
|---|---|---|---|
| `ID` | texto | ✔ | `FP_NNNN` (4 dígitos). Único en la hoja. |
| `Nivel` | texto | ✔ | `basico` \| `medio` \| `avanzado` |
| `Curso_Min` | texto | ✔ | `1E` \| `2E` \| `3E` \| `4E` \| `1B` |
| `Titulo_Problema` | texto | ✔ | La pregunta que abre el reto, en lenguaje de alumno |
| `Procedimientos` | texto | ✔ | Procedimientos que toca el reto, separados por `;` — **columna derivada**, para filtrar sin parsear el JSON |
| `Tipos_Item` | texto | ✔ | Tipos de ítem presentes, separados por `;` — **columna derivada** |
| `JSON_Reto` | texto | ✔ | El reto entero (§2). **En UNA sola línea.** |
| `Fuente` | texto | — | De dónde sale (`UD Gramatica_01 1ESO S1`, `R-07 PM-MORF-42`, `propio`) |
| `Zona_Gris` | texto | — | `TRUE` si el reto contiene un ítem de frontera |
| `Activo` | texto | ✔ | `TRUE` para servirlo; `FALSE` lo saca del pool sin borrarlo |

**Se leen siempre por NOMBRE de columna** (`getColMap_` en el GAS), nunca por letra.

### 1.1 Restricción dura: el JSON en una sola línea

Idéntica a la del Laboratorio y por el mismo motivo: `parseTSV` de `validar-banco.mjs` parte el TSV por `\n` y `\t` sin tratar campos entrecomillados multilínea. El `JSON_Reto` **no puede contener saltos de línea ni tabuladores** (los literales `\n` dentro de una cadena JSON sí valen). El validador compara el número de columnas de cada fila con el de la cabecera, que es el síntoma exacto del problema.

### 1.2 Coherencia entre columnas derivadas y JSON

`Procedimientos`, `Tipos_Item` y `Zona_Gris` duplican información del JSON para que el GAS pueda filtrar el pool sin parsear cientos de JSON por petición. El validador las compara contra el JSON y **avisa** si no cuadran. Si difieren, la fuente de verdad es el JSON.

---

## 2. Estructura del reto (`JSON_Reto`)

```json
{
  "schema_version": "1.0",
  "id": "FP_0001",
  "nivel": "basico",
  "titulo_problema": "¿Cuántas piezas esconde 'librería'?",
  "corpus": ["librería", "librero", "libreta", "libélula"],
  "items": [ /* §3 */ ],
  "zona_gris": false,
  "metadatos": {
    "origen_ud": "Gramatica_01 1ESO S1",
    "curso_min": "1E"
  }
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `schema_version` | ✔ | `"1.0"` |
| `id` | ✔ | `FP_NNNN`. Debe coincidir con la columna `ID`. |
| `nivel` | ✔ | `basico` \| `medio` \| `avanzado`. Gobierna qué procedimientos, qué piezas, qué causas y qué metalenguaje se permiten (§4, §5, §6). |
| `titulo_problema` | ✔ | Sin metalenguaje en `basico`. |
| `corpus` | ✔ | **3-8 palabras** (el plan pide mini-corpus de 4-8; se admite 3 para retos muy focalizados). |
| `items` | ✔ | ≥3 ítems, **ordenados por estación** (§3). |
| `zona_gris` | — | `true` si y solo si hay un ítem `frontera`. |
| `metadatos.origen_ud` | — | Unidad del proyecto de Lengua de la que sale el reto. Trazabilidad. |
| `metadatos.curso_min` | ✔ | Debe coincidir con la columna `Curso_Min`. |

### 2.1 Reglas de composición del reto

| Regla | Severidad | De dónde viene |
|---|---|---|
| Al menos un ítem de estación 2 y uno de estación 3 | ❌ ERROR | Sin estación 3 el reto no alimenta la Mesa de Herramientas |
| Al menos un ítem de estación 1 | ⚠ AVISO | Recomendado; un reto de repaso puede empezar en la 2 |
| Los ítems van en orden de estación no decreciente | ❌ ERROR | El bloqueo en orden es la regla del motor |
| Al menos un juicio de gramaticalidad | ⚠ **AVISO** | Ver nota abajo |
| Si hay ≥3 juicios, al menos uno con `veredicto: "correcta"` | ❌ ERROR | Si todo está mal, se contesta «mal» sin mirar |
| Todo juicio no correcto lleva `forma_correcta` | ❌ ERROR | Nunca el error solo en pantalla |
| `zona_gris` ⟺ existe un ítem `frontera` | ❌ ERROR | Esa bandera excluye el ítem del examen |
| La palabra de `piezas` y `clasifica_prueba` está en `corpus` | ⚠ AVISO | El reto debe girar sobre su corpus. **No** se comprueba en `agrupa` (sus cestas traen distractores de fuera a propósito), ni en `juicio` ni `par_minimo` (usan formas que no existen o variantes) |

> **Diferencia deliberada con el Laboratorio.** Allí «al menos 1 juicio por reto» es **ERROR**, porque la semilla del Laboratorio lo fijó explícitamente («cada reto incluye al menos un juicio de gramaticalidad»). El plan de la Fábrica **no impone esa regla por reto**: lista el juicio como tipo de ítem (2.5) y el marco teórico pide 4-6 por unidad didáctica, que es otra unidad de medida. Un reto de «agrupa familias → desmonta → etiqueta» es pedagógicamente completo sin juicio. Se queda en AVISO: no invento una regla que el plan no fijó.

---

## 3. Los diez tipos de ítem

**Decisión de diseño: 10 tipos de motor para las 12 mecánicas del catálogo** (§2 del plan). Mismo criterio que en el Laboratorio: si dos mecánicas comparten estructura de datos y corrección, son un tipo con un campo que las distingue.

| Tipo | Estación | Mecánica del plan | Qué hace |
|---|---|---|---|
| `agrupa` | 1 | 1.1 Familias · 1.3 Parejas de piezas | Repartir palabras en cestas según lo que comparten |
| `intruso` | 1 | 1.2 El intruso | Marcar la palabra que no encaja en la serie |
| `piezas` | 2 y 3 | 2.1 Desmonta · 3.1 Etiqueta las piezas · (estructura secuenciada) | Cortar la palabra, nombrar sus trozos, u ordenar sus capas |
| `monta` | 2 | 2.2 Monta (la fábrica) | Construir palabras reales desde un banco de piezas |
| `par_minimo` | 2 | 2.3 ¿Nueva o la misma? | Dos formas casi iguales: ¿qué ha cambiado? |
| `cadena` | 2 | 2.4 Cadena de derivación | Ordenar la escalera de fabricación |
| `juicio` | 2 | 2.5 Juicio de gramaticalidad | ¿Existe? ¿Está bien escrita? + qué se rompe |
| `frontera` | 2 | 2.6 Caso frontera ⚖ | Zona gris: dos análisis puntúan |
| `clasifica_prueba` | 3 | 3.2 Clasifica + prueba | Procedimiento **y** la prueba que lo demuestra |
| `cascada` | 3 | 3.3 Test rápido | El árbol de decisión jugado paso a paso |

**Dos unificaciones que merecen explicación:**

1. **`agrupa` cubre 1.1 y 1.3.** «Familias léxicas» y «parejas que comparten pieza» son el mismo gesto (repartir por criterio compartido) sobre el mismo dato. Un campo `criterio` ∈ `familia_lexica` \| `pieza_comun` las distingue.
2. **`piezas` cubre 2.1, 3.1 y el ítem estrella de `avanzado`.** Desmontar (cortar), etiquetar (nombrar los trozos) y la estructura secuenciada (ordenar las capas de formación) operan **sobre el mismo dato**: la palabra segmentada con sus etiquetas. Solo cambia qué parte se le oculta al alumno. Un campo `modo` ∈ `cortar` \| `etiquetar` \| `capas` lo resuelve. **Beneficio real, no solo economía:** garantiza que la misma palabra no pueda tener cortes distintos en la estación 2 y en la 3, que es un error de lote imposible de ver a ojo.

**La estación se deduce del tipo**, no se declara — salvo `piezas`, cuyo modo decide: `cortar` → estación 2; `etiquetar` y `capas` → estación 3.

**Cuatro tipos son homónimos y estructuralmente idénticos a los del Laboratorio**: `intruso`, `par_minimo`, `juicio` y `frontera`. Es deliberado: son módulos hermanos y el motor de uno se puede portar al otro sin traducir el dato.

### 3.0 Campos comunes y formato de opciones

| Campo | Obligatorio | Contenido |
|---|---|---|
| `tipo` | ✔ | Uno de los diez. |
| `fuente_id` | — | `PM-MORF-NN` del banco R-07. Formato validado. |
| `peso` | — | Multiplicador para la nota. Por omisión 1; los pares discriminantes llevan 2 (§7). |
| `feedback` | — | Texto de refuerzo al acertar. |

**Formato de las opciones**, común a `intruso`, `par_minimo`, `frontera` y `clasifica_prueba`:

```json
"opciones": [
  { "texto": "palabra nueva", "ok": true,  "micro": "'Cochecito' no es 'coche': es otro objeto." },
  { "texto": "la misma con un dato", "ok": false, "micro": "Eso pasaría con 'coches', que solo dice cuántos." }
]
```

2-4 opciones, **exactamente una** con `ok: true` (dos en `frontera`), y `micro` **obligatoria en todas**, correctas incluidas — es el patrón ya decidido en el banco de reflexión y heredado del Laboratorio.

### 3.1 `agrupa`

```json
{ "tipo": "agrupa", "criterio": "familia_lexica",
  "cestas": [
    { "nombre": "Tienen que ver con el campo",
      "palabras": ["campo", "acampar", "campista", "descampado"] },
    { "nombre": "No tienen que ver con el campo",
      "palabras": ["camping", "campeón"] }
  ],
  "sobrantes": [
    { "palabra": "campeón",
      "micro": "Empieza igual, pero la pieza con significado es otra: no es de la familia de 'campo'." }
  ],
  "feedback": "Compartir las primeras letras no basta: hay que compartir el significado de base." }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `criterio` | ✔ | `familia_lexica` \| `pieza_comun` |
| `cestas` | ✔ | 2-3 cestas, cada una con `nombre` (sin metalenguaje, §6) y ≥2 `palabras`. Ninguna palabra puede estar en dos cestas. |
| `sobrantes` | — | Trampas con su microexplicación. Deben aparecer también en alguna cesta (son las que el alumno colocará mal). |

La trampa canónica del plan (`campo/campeón`, parecido casual frente a familia real) se codifica en `sobrantes`.

### 3.2 `intruso`

```json
{ "tipo": "intruso",
  "palabras": ["florero", "floristería", "florido", "flotador"],
  "respuesta": "flotador",
  "feedback": "Empieza parecido, pero no comparte el trozo 'flor-'." }
```

`respuesta` es **el texto de la palabra**, no su posición, y debe estar en `palabras` (≥3). Opcionalmente `opciones` para preguntar además por qué no encaja.

### 3.3 `piezas` — el tipo central

**Modo `cortar`** (estación 2, mecánica 2.1):

```json
{ "tipo": "piezas", "modo": "cortar",
  "palabra": "librería",
  "cortes": ["libr", "ería"],
  "tolerancia": ["libre|ría"],
  "feedback": "'libr-' es la pieza con el significado de base; '-ería' añade la idea de lugar." }
```

**Modo `etiquetar`** (estación 3, mecánica 3.1):

```json
{ "tipo": "piezas", "modo": "etiquetar",
  "palabra": "desordenado",
  "cortes": ["des", "orden", "ad", "o"],
  "etiquetas": ["prefijo", "raiz", "sufijo", "flexivo"] }
```

**Modo `capas`** (estación 3, el ítem estrella de `avanzado`). El canon que decide cuál es el orden correcto está en **§12**:

```json
{ "tipo": "piezas", "modo": "capas",
  "palabra": "prehistórico",
  "cortes": ["pre", "histór", "ic", "o"],
  "capas": [
    { "forma": "historia",     "existe": true },
    { "forma": "prehistoria",  "existe": true },
    { "forma": "prehistórico", "existe": true }
  ],
  "alternativa_rechazada": {
    "capas": ["historia", "histórico", "prehistórico"],
    "micro": "'Histórico' existe, pero 'prehistórico' no significa 'histórico de antes': significa 'de la prehistoria'. La pieza 'pre-' entra antes que '-ico'." } }
```

> **Por qué este ejemplo y no *desordenado*** (que era el del documento base). *Desordenado* tiene vivas las dos formas intermedias —*ordenado* y *desordenar*— con dos significados igual de usados, así que por §12 es **zona gris**, no un caso de orden único: se ha movido a un ítem `frontera`. *Prehistórico* es el caso limpio ideal porque el prefijo va **dentro**, que es contraintuitivo y es justo lo que hay que enseñar.

| Campo | Obligatorio | Reglas |
|---|---|---|
| `modo` | ✔ | `cortar` \| `etiquetar` \| `capas` |
| `palabra` | ✔ | La palabra completa. |
| `cortes` | ✔ | Array de trozos. **`cortes.join('')` debe reconstruir `palabra` exactamente** — ERROR si no. |
| `tolerancia` | — | Segmentaciones alternativas aceptables, con `\|` en los puntos de corte (`"libre\|ría"`). Cada una, sin las barras, debe reconstruir `palabra`. |
| `etiquetas` | en `etiquetar` | Una por corte, misma longitud que `cortes`. Valores de §5. |
| `capas` | en `capas` | ≥2 pasos ordenados de menor a mayor. Cada uno `{forma, existe}`, con **`existe: true` obligatorio en todas** (§12.3). La última `forma` debe ser `palabra`. |
| `alternativa_rechazada` | recomendada en `capas` | Solo en `capas`. El análisis que parece razonable y no lo es, con su microexplicación. **Sus formas entran en el pool de fichas** (§12.5): sin ella el ítem no pregunta nada. |

**La prueba de la parasíntesis vive en `alternativa_rechazada`, no en `capas`.** Una palabra parasintética se codifica con una escalera de **exactamente dos pasos** (base → palabra: no hay peldaño intermedio), y la forma inexistente que el alumno debe rechazar va en `alternativa_rechazada`, cuya `micro` explica por qué no existe:

```json
{ "tipo": "piezas", "modo": "capas", "palabra": "enrojecer",
  "cortes": ["en", "roj", "ecer"],
  "capas": [ { "forma": "rojo", "existe": true }, { "forma": "enrojecer", "existe": true } ],
  "alternativa_rechazada": {
    "capas": ["rojo", "rojecer", "enrojecer"],
    "micro": "'*Rojecer' no existe: no se puede llegar a 'enrojecer' pasando por ahí. Las dos piezas entraron a la vez." } }
```

Es la «prueba decisiva» de la sesión 3 de la UD de 3.º ESO convertida en dato — pero como **camino que se descarta**, que es donde de verdad se juega. Una escalera cuyo peldaño no existe no es una escalera: por eso `capas[].existe` no puede ser `false`.

### 3.4 `monta`

```json
{ "tipo": "monta",
  "piezas": [
    { "texto": "des-",   "tipo": "prefijo" },
    { "texto": "orden",  "tipo": "raiz" },
    { "texto": "-ado",   "tipo": "sufijo" },
    { "texto": "-ería",  "tipo": "sufijo" }
  ],
  "minimo": 2,
  "validas": [
    { "palabra": "desordenado", "usa": ["des-", "orden", "-ado"], "procedimiento": "parasintetica" },
    { "palabra": "ordenado",    "usa": ["orden", "-ado"],          "procedimiento": "derivada" }
  ],
  "rebotes": [
    { "usa": ["des-", "-ería"],
      "micro": "Falta la base: una pieza de delante y una de detrás no forman palabra solas." }
  ] }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `piezas` | ✔ | ≥3. `tipo` de §5. Los guiones (`des-`, `-ado`) marcan la posición y **no cuentan** al concatenar. |
| `minimo` | — | Cuántas palabras válidas hay que construir para superar el ítem (por omisión, todas). |
| `validas` | ✔ | ≥1. Cada `usa` ⊂ `piezas`; `procedimiento` de §4. |
| `rebotes` | — | Combinaciones que la app rechaza, cada una con su `micro` explicando qué falta. Cada `usa` ⊂ `piezas`. |

**Sobre la concatenación:** el validador comprueba que las piezas de cada `valida`, sin guiones, reconstruyan la palabra — pero da **AVISO, no ERROR**, si no cuadra. Motivo: los alomorfos son reales y frecuentes (*caza* → *cacería*, *piedra* → *piedrecita*), y la UD de 1.º ESO los reconoce explícitamente («la raíz generalmente no varía, o varía muy poco»). Un ERROR aquí bloquearía contenido correcto. En `piezas` sí es ERROR, porque allí los cortes son de una palabra dada y deben cuadrar por fuerza.

### 3.5 `par_minimo`

```json
{ "tipo": "par_minimo",
  "forma_a": "coche", "forma_b": "cochecito",
  "cambio": "coche → cochecito",
  "opciones": [
    { "texto": "palabra nueva", "ok": true,
      "micro": "Un cochecito no es un coche pequeño cualquiera: es otro objeto con su propio nombre." },
    { "texto": "la misma con un dato", "ok": false,
      "micro": "Eso es lo que pasa con 'coches', que solo dice cuántos hay." }
  ],
  "fuente_id": "PM-MORF-40" }
```

Es la mecánica 2.3 («¿nueva o la misma?»), la pregunta exacta de la sesión 4 de la UD de 1.º ESO. Se codifica como opciones normales en vez de como dos botones fijos para poder **reformular el enunciado por nivel** y adjuntar microexplicación a cada lado.

### 3.6 `cadena`

```json
{ "tipo": "cadena",
  "pasos": ["flor", "florista", "floristería"],
  "distractores": ["floral"],
  "feedback": "Cada paso se fabrica sobre el anterior: sin 'florista' no hay 'floristería'." }
```

`pasos` ≥3, ordenados de menor a mayor. El validador comprueba que cada paso **contenga al anterior** como subcadena; si no, da AVISO (otra vez, los alomorfos). `distractores` son palabras de la misma familia que no pertenecen a esa escalera.

### 3.7 `juicio`

```json
{ "tipo": "juicio",
  "forma": "ONGs",
  "veredicto": "norma_culta",
  "causa": "sigla_plural",
  "opciones_causa": ["sigla_plural", "sigla_puntos", "acortamiento_mal"],
  "forma_correcta": "las ONG",
  "explicacion": "Las siglas no añaden -s en plural: el plural lo marca el artículo.",
  "fuente_id": "PM-MORF-42" }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `veredicto` | ✔ | `correcta` \| `no_existe` \| `norma_culta` \| `dudosa` |
| `causa` | según veredicto | Una de las 13 de §6. Obligatoria salvo si `veredicto: "correcta"`, donde **no debe aparecer**. |
| `opciones_causa` | según veredicto | 2-4 causas, una de ellas la correcta. |
| `forma_correcta` | según veredicto | Obligatoria salvo en `correcta`, donde está prohibida. |
| `explicacion` | ✔ | Qué se rompe, en lenguaje de alumno. |

**Los cuatro veredictos y su marca en pantalla** (mapa fijo del motor, igual que en el Laboratorio — un solo campo, no dos):

| `veredicto` | Marca | Qué significa | Ejemplo |
|---|---|---|---|
| `no_existe` | **✗ con asterisco** | La palabra no se puede fabricar así | *\*rojecer* |
| `norma_culta` | **⚠ sin asterisco** | Existe y se entiende, pero se escribe mal | *ONGs*, *I.E.S.* |
| `dudosa` | **⚖** | Admite discusión | *espanglish* / *spanglish* |
| `correcta` | **✓** | Es un control | *enrojecer* |

La distinción `no_existe` / `norma_culta` es la traducción a morfología del principio rector del marco (§2.3): *\*rojecer* no existe en la lengua; *ONGs* sí se dice y se entiende, y lo que falla es la norma de escritura. Confundirlas es el error pedagógico que este corpus quiere evitar, así que el validador comprueba que cada causa lleve el veredicto que le corresponde.

### 3.8 `frontera`

```json
{ "tipo": "frontera",
  "palabra": "sietemesino",
  "opciones": [
    { "texto": "compuesta", "ok": true,
      "micro": "Se ven dos bases completas: 'siete' y 'mes'." },
    { "texto": "parasintética", "ok": true,
      "micro": "Ni '*sietemés' ni '*mesino' existen sueltas: composición y derivación a la vez." }
  ],
  "explicacion": "Las dos lecturas se defienden. Lo que se evalúa es que sepas justificar la tuya.",
  "peso": 2 }
```

Exactamente **dos** opciones con `ok: true`. Obliga a `zona_gris: true`, y esa bandera es la que excluye el ítem del examen. Los tres casos frontera del plan (*sietemesino*, *hispanohablante*, *malcarado*) van aquí.

### 3.9 `clasifica_prueba`

```json
{ "tipo": "clasifica_prueba",
  "palabra": "informática",
  "procedimiento": "acronimo",
  "prueba_id": "PRU-MORF-ACRO-01",
  "distractores": ["PRU-MORF-SIGLA-01", "HEUR-MAYUSCULAS"],
  "enunciado": "tecnico" }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `procedimiento` | ✔ | Uno de los 12 de §4, compatible con el nivel del reto. |
| `prueba_id` | ✔ | Id de `js/data/pruebas-morfologia.js` (§8). Un `HEUR-*` aquí es siempre ERROR. |
| `distractores` | ✔ | 2-3 ids: la prueba del **vecino confundible** (§7) + al menos un **heurístico rechazado**. |
| `enunciado` | ✔ | `tecnico` \| `simple`. **En `basico` debe ser siempre `simple`.** |

### 3.10 `cascada`

```json
{ "tipo": "cascada", "palabra": "informática",
  "pasos": [
    { "pregunta": "¿Se puede separar en dos palabras completas?", "respuesta": "no" },
    { "pregunta": "¿Está hecha solo con las iniciales?",          "respuesta": "no" },
    { "pregunta": "¿Está hecha con trozos de varias palabras?",   "respuesta": "si" }
  ],
  "procedimiento": "acronimo" }
```

Es el «test rápido» del §4 de la UD de 3.º ESO jugado como cascada (mismo patrón que las cascadas de Maestro). `pasos` ≥2, `respuesta` ∈ `si` \| `no`, y `procedimiento` debe ser compatible con el nivel.

**Ampliación v1.1:** la cascada admite además el campo `conclusion` (texto libre) para terminar en algo que no es un procedimiento — el orden de capas de `avanzado`. Ver §12.5.

---

## 4. Los doce procedimientos y su nivel

Lista cerrada del campo `procedimiento`. Sale de la mesa de herramientas del §4 de la UD de 3.º ESO (11 filas) más `prestamo`, que esa misma UD trata en su sesión 4 y el plan de la Fábrica incluye en el alcance de ESO34.

| `procedimiento` | Prueba de descomposición (§8) | Ejemplo | Nivel mín. |
|---|---|---|---|
| `simple` | No tiene más que raíz (+ flexivo o vocal de cierre) | *sol*, *niñ-o* | basico |
| `derivada` | Raíz + afijo(s) derivativo(s) | *flor-ero*, *des-hacer* | basico |
| `compuesta_lexica` | Dos raíces, una palabra ortográfica, un acento | *limpiaparabrisas* | basico |
| `compuesta_sintagmatica` | Dos bases separadas o con guion, cada una con su acento | *comida basura* | medio |
| `compuesta_culta` | Elementos compositivos griegos o latinos | *eco-logía*, *tele-fono* | medio |
| `parasintetica` | Prefijo y sufijo a la vez; la forma intermedia no existe | *en-roj-ecer* | medio |
| `sigla` | Iniciales; mayúsculas, sin puntos, sin plural | *ONG*, *OMS* | medio |
| `acronimo` | Fusión de **trozos** de varias palabras | *informática* | medio |
| `acortamiento` | Se recorta una palabra que ya existía | *bus*, *finde* | medio |
| `abreviatura` | Representación gráfica con punto | *pág.*, *Sra.* | medio |
| `numeronimo` | Números + letras | *11-S*, *5G* | medio |
| `prestamo` | Entra de otra lengua sin pasar por los anteriores | *selfi*, *streamer* | medio |

**Nivel `basico` = 3 procedimientos** (simple, derivada, compuesta léxica). Es exactamente el alcance de la UD de 1.º ESO, cuya tabla de adaptaciones dice: *«Solo raíz/afijos derivativos-flexivos y simple/derivada/compuesta básica; sin interfijo sistemático, sin parasíntesis, sin el bloque sigla/acrónimo/acortamiento/abreviatura/numerónimo»*.

**Nivel `avanzado`** no añade procedimientos nuevos: añade el **modo `capas`** (estructura secuenciada), la `vocal_cierre` como etiqueta y los pares de morfología léxica del banco R-07 sección I (rivalidad afijal, restricción de sufijos, alomorfos). Es lo que dice el plan §3: el ítem estrella de Maestro es la estructura secuenciada, no un procedimiento más.

---

## 5. Los tipos de pieza (etiquetas de morfema)

Lista cerrada de `etiquetas` (modo `etiquetar`) y de `piezas[].tipo` (en `monta`).

| `tipo` | Qué es | Ejemplo | Nivel mín. |
|---|---|---|---|
| `raiz` | La pieza que aporta la base del significado | *libr-*ería | basico |
| `prefijo` | Afijo derivativo delante de la raíz | *des-*hacer | basico |
| `sufijo` | Afijo derivativo detrás de la raíz | flor*-ero* | basico |
| `flexivo` | Afijo que da información gramatical y **no crea palabra nueva** | coche*-s*, alumn*-a* | basico |
| `base` | Base léxica completa dentro de un compuesto | *limpia*parabrisas | basico |
| `interfijo` | Pieza sin significado propio, nunca forma palabra sola | mayor*-c-*ito | medio |
| `elemento_culto` | Elemento compositivo griego o latino | *tele-*, *-logía* | medio |
| `vocal_cierre` | La vocal final átona analizada como cierre, no como género | niñ*-o* | avanzado |

### 5.1 El canon de segmentación: `vocal_cierre` frente a `flexivo`

Es el riesgo nº 1 de la tabla del plan (§7.1). La UD de 3.º ESO deja abiertas las dos lecturas en su propia tabla («raíz + afijo flexivo **o** vocal de cierre»), así que hay que decidir para el motor:

> **Canon fijado:** en `basico` y `medio`, la vocal final se etiqueta **`flexivo`** — es lo que enseña la sesión 4 de la UD de 1.º ESO (*alumn-a* es femenino, *coche-s* es plural). En `avanzado` se admite además `vocal_cierre`, y la lectura alternativa se registra en `tolerancia`. El validador **rechaza `vocal_cierre` en `basico` y `medio`**.

**Esta decisión necesita el visto bueno de Josele** (§9): es canon lingüístico, no arquitectura. Todo lo demás discutible va a `tolerancia` o a un ítem `frontera`, tal como propone el plan.

---

## 6. Las trece causas de error morfológico

Lista cerrada del campo `causa`, gemela de las 16 causas del Laboratorio.

| `causa` | Qué se rompe | Ejemplo | Nivel mín. | `veredicto` |
|---|---|---|---|---|
| `falta_base` | Prefijo y sufijo sin raíz en medio | *\*des-ería* | basico | no_existe |
| `orden_piezas` | El sufijo delante o el prefijo detrás | *\*ería-libro* | basico | no_existe |
| `familia_falsa` | Parecido casual tomado por familia | *campo / campeón* | basico | no_existe |
| `parasintesis_incompleta` | Falta una de las dos piezas simultáneas | *\*rojecer* | medio | no_existe |
| `sigla_plural` | Sigla pluralizada con -s | *ONGs* | medio | norma_culta |
| `sigla_puntos` | Sigla escrita con puntos | *I.E.S.* | medio | norma_culta |
| `abreviatura_sin_punto` | Abreviatura sin su punto | *pag* | medio | norma_culta |
| `sigla_minuscula` | Sigla no lexicalizada en minúscula | *ong* | medio | norma_culta |
| `acortamiento_mal` | Recorte que no respeta la sílaba | *\*profeso* | medio | no_existe |
| `restriccion_sufijo` | El sufijo no admite esa base | *\*simpatizador*, *\*falsificamiento* | avanzado | no_existe |
| `alomorfo_incorrecto` | Alomorfo del afijo mal seleccionado | *\*solecito* por *solito* | avanzado | no_existe |
| `prestamo_adaptacion` | Préstamo sin adaptar a la grafía española | *selfie* | avanzado | norma_culta |
| `doble_analisis` | Zona gris: dos segmentaciones posibles | *inmovilizable* | avanzado | dudosa |

**Fuera del corpus, sin excepción:** ortografía general (tildes, *b/v*, *h*), incorrección de origen social (*haiga*, *cocretas*) y rasgos dialectales. Solo entra la **ortografía morfológica** —siglas, acrónimos, abreviaturas—, que es la que depende del procedimiento de formación y por tanto es materia de esta unidad. La ortografía general se trabaja en la sesión 6 de la UD de 1.º ESO, que queda fuera del alcance de la Fábrica.

---

## 7. Vecinos confundibles y ponderación

La matriz de vecinos confundibles del plan (§2), que gobierna de dónde sale el distractor por defecto de cada procedimiento:

`flexivo`↔`derivativo` · `compuesta_lexica`↔`parasintetica` · `sigla`↔`acronimo` · `acortamiento`↔`abreviatura` · `compuesta_sintagmatica`↔`compuesta_lexica` · `familia_lexica`↔`parecido casual`

Los ítems que caen sobre uno de estos pares llevan `peso: 2`. El validador **avisa** si un `clasifica_prueba` o un `par_minimo` sobre un par discriminante no lo lleva: puede ser deliberado, pero conviene mirarlo.

El distractor por defecto de cada procedimiento es **su vecino + la descomposición mal hecha**, tal como fija el plan.

---

## 8. Catálogo de identificadores de prueba

`js/data/pruebas-morfologia.js` se escribe en **F2 · sesión 1**, pero sus identificadores se fijan **ahora**, porque el lote semilla de F0 · 3 los va a usar.

**Buena noticia de alcance:** el contenido de estas pruebas **ya está redactado** en la mesa de herramientas del §4 de la UD de 3.º ESO. F2·1 no las inventa: las transcribe, les añade distractores y microexplicaciones, y escribe la variante `enunciado_simple` para `basico`.

| `prueba_id` | Procedimiento | Prueba |
|---|---|---|
| `PRU-MORF-SIMPLE-01` | simple | No tiene más que raíz |
| `PRU-MORF-DERIV-01` | derivada | Raíz + afijo derivativo |
| `PRU-MORF-CLEX-01` | compuesta léxica | Dos raíces, un solo acento |
| `PRU-MORF-CSINT-01` | compuesta sintagmática | Bases separadas, cada una con su acento |
| `PRU-MORF-CCULTA-01` | compuesta culta | Elementos griegos o latinos |
| `PRU-MORF-PARA-01` | parasintética | Prefijo y sufijo a la vez, sin forma intermedia |
| `PRU-MORF-SIGLA-01` | sigla | Solo iniciales |
| `PRU-MORF-ACRO-01` | acrónimo | Trozos de palabras, no iniciales |
| `PRU-MORF-ACORT-01` | acortamiento | Ya existía y se recortó |
| `PRU-MORF-ABREV-01` | abreviatura | Representación gráfica con punto |
| `PRU-MORF-NUM-01` | numerónimo | Números + letras |
| `PRU-MORF-PREST-01` | préstamo | Viene de otra lengua |

**Pruebas transversales** (no atadas a un procedimiento):

| `prueba_id` | Prueba |
|---|---|
| `PRU-MORF-FAMILIA-01` | Comparten raíz **y** significado de base |
| `PRU-MORF-NUEVA-01` | ¿Crea palabra nueva (derivativo) o solo pone una etiqueta gramatical (flexivo)? |
| `PRU-MORF-INTERM-01` | ¿Existe la forma intermedia? (parasíntesis y estructura secuenciada) |

**Heurísticos rechazados** (solo como distractores, nunca como respuesta correcta):

`HEUR-LONGITUD` («es larga, luego es compuesta») · `HEUR-MAYUSCULAS` («va en mayúsculas, luego es sigla») · `HEUR-PARECIDO` («empieza igual, luego es de la misma familia») · `HEUR-DOS-PARTES` («la puedo partir en dos, luego es compuesta») · `HEUR-MEMORIA` («lo sé porque lo he estudiado»)

Formato validado: `^PRU-MORF-[A-Z]+-\d{2}$` y `^HEUR-[A-Z-]+$`. Mientras `pruebas-morfologia.js` no exista, el validador comprueba **solo el formato**; cuando exista, comprueba además que el id esté definido.

---

## 9. Regla de metalenguaje por nivel y estación

Traduce a máquina el principio central del módulo. Se comprueba buscando términos técnicos en los textos visibles (`titulo_problema`, `cestas[].nombre`, `opciones[].texto`, `micro`, `feedback`, `explicacion`, `pasos[].pregunta`).

| Dónde | Regla | Severidad |
|---|---|---|
| Estación 1, cualquier nivel | Metalenguaje **prohibido**, sin excepciones | ❌ ERROR |
| Estación 2, nivel `basico` | Prohibido en `piezas`(cortar), `monta`, `par_minimo` y `juicio` | ❌ ERROR |
| Estación 2, `medio` y `avanzado` | Desaconsejado **solo** en `piezas`, `monta` y `cadena` | ⚠ AVISO |
| Estación 3, cualquier nivel | Libre (es donde se gana) | — |

> **Excepción razonada:** en `medio` y `avanzado`, los tipos `frontera`, `juicio` y `par_minimo` quedan **exentos** incluso del aviso. Su contenido *es* la comparación de etiquetas: un caso frontera pregunta literalmente «*sietemesino*: ¿compuesta o parasintética?», y no existe forma de redactarlo sin nombrar los dos procedimientos. Avisar ahí sería ruido garantizado en todos los lotes, y un aviso que siempre salta es un aviso que se deja de leer. (Detectado al verificar el schema contra un reto real de nivel avanzado.)

**Términos que cuentan como metalenguaje:** raíz, morfema, afijo, prefijo, sufijo, interfijo, flexivo, derivativo, derivación, composición, compuesta, parasíntesis, parasintética, sigla, acrónimo, acortamiento, abreviatura, numerónimo, préstamo, lexema, base léxica, familia léxica, elemento compositivo, cultismo.

**Términos explícitamente permitidos** (equivalen a «verbo» y «oración» en el Laboratorio): **palabra, pieza, trozo, significado, letra, familia** (a secas, sin «léxica»). Son el vocabulario que las propias UD usan a ese nivel: la sesión 1 de 1.º ESO dice literalmente *«¿se puede partir en trozos más pequeños que también signifiquen algo?»*.

También se cazan en cualquier texto visible los dos términos vetados del proyecto: **«grupo»** (se dice sintagma) y **«proposición»** (se dice oración).

---

## 10. Las decisiones de diseño que gobiernan el schema

### 10.1 Los cortes deben reconstruir la palabra
`cortes.join('')` tiene que dar exactamente `palabra`, y cada `tolerancia` sin sus barras también. Es el equivalente morfológico de la regla «referencias por texto, nunca por posición» del Laboratorio: hace imposible el error silencioso de un corte que no cuadra. La única excepción razonada es `monta`, donde la alomorfía es real y la comprobación baja a AVISO.

### 10.2 Listas cerradas para todo lo que el motor interpreta
`procedimiento`, `modo`, `criterio`, `tipo` de pieza, `veredicto`, `causa`, `enunciado`, `respuesta` de cascada, `nivel`, `curso_min`. Texto libre solo donde lo lee un humano: `titulo_problema`, `nombre`, `texto`, `micro`, `explicacion`, `feedback`, `pregunta`.

### 10.3 El contenido pedagógico se ancla por repertorio
Las pruebas no se escriben en cada reto: se apuntan con `prueba_id`. Un lote de 30 retos no son 30 redacciones de la prueba del acrónimo.

### 10.4 Compatibilidad con el módulo hermano
`intruso`, `par_minimo`, `juicio` y `frontera` tienen aquí la misma forma que en `laboratorio v1.0`, con los nombres de campo adaptados al dominio (`palabra` en vez de `oracion`, `forma_correcta` en vez de `gemela_correcta`). Los motores de corrección son portables entre los dos módulos.

---

## 11. Lo que este schema deja fuera a propósito

- **Clases de palabras.** Es el módulo Maestro, y su `diccionario-morfologia.js` ya lo cubre. Cero solape: por eso la hoja es nueva y no una ampliación.
- **Ortografía general.** Solo entra la ortografía morfológica (siglas, abreviaturas).
- **Texto libre puntuable.** El diario metalingüístico y la definición del reto creativo «Fabrica tu palabra» se guardan y se exponen, pero no puntúan: lo que la app valida automáticamente es el **procedimiento declarado**, que sí es verificable.
- **Análisis sintáctico.** Si un ítem necesita la oración, es del Laboratorio o de Simples.

---

## 12. Ampliación v1.1 — canon de estructura secuenciada (nivel `avanzado`)

**F5 · sesión 1 · 4-ago-2026 · 🟣 Opus 5.** Aprobada por Josele en sesión.

El ítem estrella de Maestro pregunta en qué **orden** se aplicaron los afijos: ¿`[[des+hacer]+ble]` o `[des+[hacer+ble]]`? Esa pregunta tiene respuesta correcta, y hasta ahora el proyecto no la tenía fijada. Esta sección la fija. Gobierna qué se puede codificar como `piezas`·`capas` (respuesta única) y qué tiene que irse a `frontera` (zona gris), y por tanto gobierna el lote 1B entero.

### 12.1 La escalera de tres pruebas, en orden fijo

Se aplican **en este orden**, y se para en cuanto una decide.

| | Prueba | Qué hace |
|---|---|---|
| **P1** | **¿Existe la forma intermedia?** (`PRU-MORF-INTERM-01`) | Existe **una sola** → ese es el orden, y se acabó. No existe **ninguna** → no hay orden que descubrir: es **parasíntesis**. Existen **las dos** → P2. |
| **P2** | **¿El significado del todo se construye sobre esa forma intermedia?** | La capa buena es aquella cuyo significado sobrevive íntegro dentro del significado final. Si solo un análisis lo cumple, ese es. Si lo cumplen los dos con significados distintos → regla de salida (§12.2). |
| **P3** | **¿Ese afijo admite esa clase de palabra?** (selección categorial) | Filtro final: *-ble* pide verbo transitivo y da adjetivo; *-ción* y *-miento* piden verbo; *des-* no se engancha libremente a adjetivos. Un análisis que obligue a un afijo a violar su selección se cae **aunque la forma intermedia exista por casualidad**. |

**Ejemplos de cada rama** (los que sirven de patrón al lote 1B):

| Palabra | Decide | Análisis | Por qué |
|---|---|---|---|
| *imperdonable* | P1 | `[im+[perdon+able]]` | Existe *perdonable*; no existe \**imperdonar*. |
| *anticonstitucional* | P1 | `[anti+[constitucional]]` | No existe \**anticonstitución*. |
| *envejecimiento* | P1 | `[[envejecer]+miento]` | No existe \**vejecimiento*. (Y *envejecer* es a su vez parasintética.) |
| *enrojecer* | P1 | parasíntesis, sin capas | Ni \**rojecer* ni \**enrojo*. |
| *desconfianza* | P2 | `[[des+confi(ar)]+anza]` | Existen *confianza* y *desconfiar*; el significado es 'acción de desconfiar', no 'confianza negada'. |
| *prehistórico* | P2 | `[[pre+historia]+ico]` | Existen *histórico* y *prehistoria*; significa 'de la prehistoria'. **El prefijo va dentro.** |
| *incomunicación* | P2 | `[[in+comunicar]+ción]` | 'Acción de incomunicar', no 'comunicación negada'. |
| *inmovilizable* | salida | **zona gris** | 'Que no se puede movilizar' y 'que se puede inmovilizar' están las dos vivas. |
| *desordenado* | salida | **zona gris** | *Ordenado* y *desordenar* existen, y la lectura adjetival ('que no está ordenado') y la participial ('que ha sido desordenado') son las dos corrientes. |

**En lenguaje de alumno**, la escalera se dice sin metalenguaje y cabe en una línea: *«Quítale una pieza. ¿Lo que queda existe? ¿Y significa lo que tiene que significar?»*

### 12.2 La regla de salida (lo que impide el fraude pedagógico)

> Si tras P1, P2 y P3 siguen vivos **dos análisis con significados distintos y ambos en uso**, **no hay respuesta correcta**. Se codifica como ítem `frontera` con causa `doble_analisis`, **nunca** como `capas` con respuesta única.

Es la honestidad epistemológica que el plan de producto (§2, mecánica 2.6) pide para los grises: se enseñan, no se maquillan. Un `capas` con respuesta única sobre un caso realmente ambiguo enseña al alumno que su análisis correcto está mal, que es el peor error que puede cometer este módulo.

### 12.3 Consecuencias sobre el dato

| Regla | Severidad |
|---|---|
| En `capas[]`, `existe` debe ser `true` en **todas** las capas | ❌ ERROR |
| Una palabra parasintética se codifica con `capas` de **exactamente 2 pasos** (base → palabra) | ❌ ERROR si tiene 3+ |
| La forma intermedia inexistente va en `alternativa_rechazada`, con su `micro` | ⚠ AVISO si un `capas` de 2 pasos no la trae |
| `alternativa_rechazada.capas` no puede ser idéntica a `capas[].forma` | ❌ ERROR |
| Un caso de zona gris no puede ser `capas`: va a `frontera` + `doble_analisis` | criterio editorial, no comprobable |

### 12.4 Locuciones: fuera de la lista cerrada

**No se añade `locucion` como 13.º procedimiento.** Una locución no es una palabra formada, sino una unidad léxica pluriverbal: la NGLE la trata en fraseología, no en formación de palabras — y sobre *ojo de buey* dice expresamente que se considera locución nominal y no compuesto sintáctico (recogido en `docs/fuentes/banco_fabrica_palabras_2.md`, del análisis contrastivo de Josele).

La frontera sintagma / locución / compuesto se juega **solo en ítems `frontera`**, cuyas opciones son texto libre y no tocan la lista cerrada de §4. Casos del lote 1B: *ojo de buey*, *cama nido*, *piel de gallina*, *hombre rana*. Un `clasifica_prueba` o una `cascada` que dieran «locución» como respuesta serían ERROR, porque enseñarían que una locución es una manera de fabricar palabras.

### 12.5 Cultismos y vocal de enlace

La vocal de enlace va **dentro del elemento compositivo**, no como interfijo suelto: *fotografía* se corta `foto` + `grafía`, nunca `fot` + `o` + `grafía`. Es el tratamiento estándar (los elementos compositivos se listan con su vocal: *bio-*, *termo-*, *hidro-*, *psico-*) y evita al alumno una discusión que no le aporta nada. La etiqueta sigue siendo `elemento_culto` (§5).

Nota terminológica ya registrada en las fuentes: la NGLE prefiere «composición neoclásica» / «bases compositivas cultas» a «compuesta culta». **`compuesta_culta` se mantiene** como nombre interno del procedimiento —está en la lista cerrada de §4 y en dos lotes ya escritos—, pero ningún texto visible al alumno debe presentarlo como el término académico preferente.

### 12.6 Los dos cambios de motor que exige este canon

**1. `capas`: el pool lleva los distractores.** Hasta v1.1 el motor construía las fichas solo con `capas[].forma` ([`js/modules/fabrica/index.js`](../js/modules/fabrica/index.js), `_renderPiezasCapas`), de modo que el alumno solo podía colocar las formas del análisis correcto: la rama que detecta `alternativa_rechazada` era **inalcanzable** y el ítem se reducía a ordenar tres formas ya dadas. El acto decisivo —elegir *prehistoria* y no *histórico* como peldaño— no se pedía.

> **Pool = `capas[].forma` ∪ `alternativa_rechazada.capas`** (sin duplicados, barajado). El alumno coloca `capas.length` fichas de entre las del pool. Colocar la escalera rechazada entera dispara su `micro`.

**2. `cascada`: campo `conclusion`.** La cascada de v1.0 siempre termina nombrando un `procedimiento`. La cascada de estructura secuenciada termina en un **orden**, no en un procedimiento. Se añade:

```json
{ "tipo": "cascada", "palabra": "prehistórico",
  "pasos": [
    { "pregunta": "Si le quitas 'pre-', ¿existe lo que queda?",        "respuesta": "si" },
    { "pregunta": "Si le quitas '-ico', ¿existe lo que queda?",        "respuesta": "si" },
    { "pregunta": "¿'Prehistórico' significa 'histórico de antes'?",   "respuesta": "no" }
  ],
  "conclusion": "Significa 'de la prehistoria': primero se fabricó 'prehistoria' y después se le añadió '-ico'." }
```

| Campo | Reglas |
|---|---|
| `conclusion` | Texto libre. Si está, `procedimiento` es **opcional**; si no está, `procedimiento` sigue siendo obligatorio. Los dos a la vez es ERROR (o clasifica, o secuencia: no las dos cosas en una cascada). |

Es la única forma libre nueva del schema, y cumple §10.2: la lee un humano, no la interpreta el motor.

---

*Schema `formacion v1.0` · F0 sesión 1 · jul-2026. Fijado en sesión 🟣 Opus 5 por ser la decisión de arquitectura de datos del módulo. **Ampliación v1.1 · F5 sesión 1 · ago-2026** (§12: canon de estructura secuenciada, locuciones, cultismos y los dos cambios de motor que exige). Siguiente paso tras v1.1: F5·2, motor y validador; después F5·3, lote 1B. Terminología del proyecto: sintagma (nunca «grupo»), oración (nunca «proposición»); niveles `basico`/`medio`/`avanzado` ↔ Aprendiz/ESO34/Maestro.*
