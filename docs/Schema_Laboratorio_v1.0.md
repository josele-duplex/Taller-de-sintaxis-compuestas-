# Schema `laboratorio v1.0` — especificación de `Laboratorio_Banco`

**F0 · sesión 1 · 30-jul-2026 · 🟣 Opus 5**
Fuente de verdad del formato de datos del módulo Laboratorio de Oraciones. Todo lote de contenido y todo cambio del motor se validan contra este documento.

> **Por qué existe este documento.** Es la decisión que se paga todo el curso si sale mal: cada lote posterior (~30 retos de `medio`, ~25 de `basico`, los de `avanzado`) se escribe contra este schema, y el motor lo lee tal cual. Un campo mal pensado aquí son tres sesiones de arreglos después. Documento primero, código después.
>
> **Relacionado:** `docs/Laboratorio_Oraciones_Plan_Producto.md` (§5.1 del plan es el resumen de esto), `scripts/validar-banco.mjs` (modo `laboratorio`), `js/glosario/tags.js` (lista de funciones), `Banco_reflexion_metalinguistica.md` (las pruebas de la estación 3).

---

## 1. La hoja `Laboratorio_Banco`

Una fila = un **reto** (un miniciclo completo: mini-corpus + sus ejercicios + su cierre).

| Columna | Tipo | Obligatoria | Contenido |
|---|---|---|---|
| `ID` | texto | ✔ | `LB_NNNN` (4 dígitos). Único en la hoja. |
| `Nivel` | texto | ✔ | `basico` \| `medio` \| `avanzado` |
| `Curso_Min` | texto | ✔ | `2E` \| `3E` \| `4E` \| `1B` — curso mínimo al que se puede servir |
| `Titulo_Problema` | texto | ✔ | La pregunta que abre el reto, en lenguaje de alumno |
| `Funciones` | texto | ✔ | Funciones que toca el reto, separadas por `;` — **columna derivada**, para filtrar sin parsear el JSON |
| `Tipos_Item` | texto | ✔ | Tipos de ítem presentes, separados por `;` — **columna derivada** |
| `JSON_Reto` | texto | ✔ | El reto entero (§2). **En UNA sola línea.** |
| `Fuente` | texto | — | De dónde sale (`R-07 PM-SINT-11`, `UD-D-3E-sint S3`, `propio`) |
| `Zona_Gris` | texto | — | `TRUE` si el reto contiene un ítem de frontera; vacío o `FALSE` si no |
| `Activo` | texto | ✔ | `TRUE` para servirlo; `FALSE` lo saca del pool sin borrarlo |

**Se leen siempre por NOMBRE de columna** (`getColMap_` en el GAS), nunca por letra. Las columnas del proyecto se han movido varias veces y ya hay documentación desfasada por haber fijado letras.

### 1.1 Restricción dura: el JSON en una sola línea

`scripts/validar-banco.mjs` parte el TSV por `\n` y `\t` sin tratar campos entrecomillados multilínea. Consecuencia práctica, no negociable:

- El `JSON_Reto` **no puede contener saltos de línea** (ni `\n` reales; los literales `\n` dentro de una cadena JSON sí valen).
- El `JSON_Reto` **no puede contener tabuladores**.

El validador comprueba que cada fila tiene exactamente el mismo número de columnas que la cabecera y avisa si no, porque ese es el síntoma exacto de un JSON con salto de línea o tabulador dentro.

### 1.2 Coherencia entre columnas derivadas y JSON

`Funciones`, `Tipos_Item` y `Zona_Gris` duplican información que ya está dentro del JSON. Se mantienen porque permiten al GAS filtrar el pool sin parsear ~200 JSON en cada petición (el mismo motivo por el que `Compuestas_Banco` tiene `Tipo_Oracion` y `Nivel` fuera del JSON). El precio es que pueden desincronizarse, así que **el validador las compara contra el JSON y avisa** si no cuadran. La fuente de verdad, si difieren, es el JSON.

---

## 2. Estructura del reto (`JSON_Reto`)

```json
{
  "schema_version": "1.0",
  "id": "LB_0042",
  "nivel": "medio",
  "titulo_problema": "¿Por qué aquí funciona 'le' y no 'lo'?",
  "corpus": [
    "Entregó un ramo a su profesora.",
    "Entregó un ramo para su profesora."
  ],
  "items": [ /* §3 */ ],
  "zona_gris": false,
  "metadatos": {
    "origen_oracion_id": "Entregó un ramo a su profesora.",
    "origen_ud": "UD-D-3E-sint S3",
    "curso_min": "3E"
  }
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `schema_version` | ✔ | `"1.0"`. Si cambia el formato de forma incompatible, sube a `"1.1"` y el validador avisa de las filas viejas. |
| `id` | ✔ | `LB_NNNN`. Debe coincidir con la columna `ID`. |
| `nivel` | ✔ | `basico` \| `medio` \| `avanzado`. Gobierna qué causas y qué metalenguaje se permiten (§4, §5). |
| `titulo_problema` | ✔ | Sin metalenguaje en `basico`. Es lo que el alumno lee al abrir el reto. |
| `corpus` | ✔ | 1-6 oraciones. Las oraciones sobre las que gira el reto. |
| `items` | ✔ | ≥3 ítems, **ordenados por estación** (§3). |
| `zona_gris` | — | `true` si y solo si hay un ítem `frontera`. |
| `metadatos.origen_oracion_id` | — | **Corrección F2·3 (12-ago-2026):** ya NO es un código `OR_NNNN` — `Oraciones_Banco` nunca tuvo esa columna de ID, así que ese formato quedó aspiracional y no se llegó a usar en ningún lote real. Es el **texto literal** de una de las oraciones de `corpus`, idéntico byte a byte al de la columna A de `Oraciones_Banco`. El endpoint `getOracionByTexto_` (Server/Code_v6.gs) busca por ese texto exacto; si no encuentra coincidencia, el puente a Simples simplemente no se ofrece. Habilita el puente de ida (§9) y permite heredar el análisis canónico. |
| `metadatos.origen_ud` | — | Unidad del proyecto de Lengua de la que sale el reto. Trazabilidad. |
| `metadatos.curso_min` | ✔ | `2E`/`3E`/`4E`/`1B`. Debe coincidir con la columna `Curso_Min`. |

### 2.1 Reglas de composición del reto

Estas reglas vienen de decisiones ya cerradas (semilla §4 y plan §2.5) y las comprueba el validador:

| Regla | Severidad | De dónde viene |
|---|---|---|
| Al menos un ítem de estación 2 y uno de estación 3 | ❌ ERROR | Sin estación 3 el reto no alimenta la Caja de Pruebas |
| Al menos un ítem de estación 1 | ⚠ AVISO | Recomendado, pero un reto de repaso puede empezar en la 2 |
| Los ítems van en orden de estación no decreciente | ❌ ERROR | El bloqueo en orden es la regla del motor |
| Al menos **1 juicio** de gramaticalidad | ❌ ERROR | Semilla §4: «cada reto incluye al menos un juicio» |
| Como máximo **2 juicios** | ⚠ AVISO | Plan §2.5 regla 4: si no, esto se vuelve un test de corrección |
| Si hay ≥3 juicios, al menos uno con `veredicto: "gramatical"` | ❌ ERROR | Plan §2.5 regla 3: si todo está mal, se contesta «mal» sin mirar |
| Todo juicio `agramatical` lleva `gemela_correcta` | ❌ ERROR | Plan §2.5 regla 2: nunca el error solo en pantalla |
| `zona_gris` ⟺ existe un ítem `frontera` | ❌ ERROR | Coherencia; y los `frontera` se excluyen del examen por esta bandera |
| Las oraciones de los ítems de manipulación están en `corpus` | ⚠ AVISO | Un reto debe girar sobre su corpus; los juicios sí usan oraciones de fuera |

---

## 3. Los nueve tipos de ítem

**Decisión de diseño: 9 tipos de motor, no 15.** El catálogo del plan (§2) lista 15 mecánicas visibles, pero las cinco manipulaciones (sustituye, suprime, cambia el número, mueve, transforma) comparten **exactamente la misma estructura de datos y la misma corrección**: se muestra una oración, se señala un trozo, se eligen opciones de resultado. Así que son un solo tipo `manipulacion` con un campo `manipulacion` que dice cuál es. Igual con la variante simplificada de la estación 3 (un campo `enunciado`, no un tipo aparte) y con «tu ejemplo para la caja» (un `analisis_inverso` con `destino: "caja_pruebas"`).

Esto **no recorta el catálogo**: las 15 mecánicas del plan siguen todas. Recorta el motor, que es donde el número de tipos cuesta dinero.

| Tipo | Estación | Mecánica del plan | Qué hace |
|---|---|---|---|
| `valencia` | 1 | 1.1 | ¿Cuántos actores pide el verbo? |
| `que_cambia` | 1 | 1.2 | Dos oraciones contrastadas: qué cambia y qué consecuencia tiene |
| `intruso` | 1 | 1.3 | Cuál de la serie no sigue el patrón |
| `manipulacion` | 2 | 2.1-2.5 | Los cinco experimentos |
| `juicio` | 2 | 2.6 | ¿Funciona? + qué se rompe |
| `par_minimo` | 2 | 2.7 | Qué función ha cambiado entre las dos |
| `analisis_inverso` | 2 | 2.8 y 3.3 | Construir la oración que cumple una condición |
| `frontera` | 2 | 2.9 | Zona gris: dos análisis puntúan |
| `etiqueta_prueba` | 3 | 3.1 y 3.2 | Qué prueba lo demuestra |

**La estación no se declara: se deduce del tipo.** Un mapa fijo `tipo → estación` en el motor y en el validador. Así no puede existir un reto con un ítem declarado en una estación que no le corresponde.

### 3.0 Campos comunes a todos los ítems

| Campo | Obligatorio | Contenido |
|---|---|---|
| `tipo` | ✔ | Uno de los nueve. |
| `fuente_id` | — | `PM-SINT-NN` o `AI-SINT-NN` del banco R-07. Formato validado. |
| `peso` | — | Multiplicador para la nota. Por omisión 1; los ítems de frontera discriminante llevan 2 (§6). |
| `feedback` | — | Texto de refuerzo al acertar. |

**Formato de las opciones**, común a `que_cambia`, `intruso`, `manipulacion`, `par_minimo` y `frontera`:

```json
"opciones": [
  { "texto": "Le entregó un ramo.", "ok": true,
    "micro": "El pronombre que le corresponde es 'le': es CI." },
  { "texto": "La entregó un ramo.", "ok": false,
    "micro": "'La' es el pronombre del CD; aquí el CD es 'un ramo'." }
]
```

- 2-4 opciones.
- **Exactamente una** con `ok: true` — salvo en `frontera`, donde hay exactamente dos.
- `micro` es **obligatoria en todas**, correctas incluidas. Es el patrón ya decidido en el banco de reflexión: cada opción explica por qué acierta o por qué falla. Una opción sin `micro` es una oportunidad de enseñar desperdiciada, así que el validador la marca como ERROR, no como aviso.

### 3.1 `valencia`

```json
{ "tipo": "valencia", "verbo": "entregar", "respuesta": 3,
  "actores": [
    { "texto": "quien entrega", "rol": "quien_hace" },
    { "texto": "lo entregado",  "rol": "a_quien_o_que" },
    { "texto": "quien lo recibe", "rol": "quien_lo_recibe" }
  ],
  "feedback": "Entregar pide tres: quien entrega, lo entregado y quien lo recibe." }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `verbo` | ✔ | En infinitivo. |
| `respuesta` | ✔ | `1`, `2` o `3`. Es el único ítem donde la respuesta es un número: aquí el número **es** el contenido. |
| `actores` | — | Segunda parte opcional (arrastrar los actores a sus casillas). `rol` ∈ `quien_hace` \| `a_quien_o_que` \| `quien_lo_recibe` \| `donde_cuando_como`. **Son paráfrasis deliberadas, no etiquetas**: `a_quien_o_que` nunca se muestra como «CD». |
| `feedback` | ✔ | Aquí sí obligatorio: es lo que cierra el descubrimiento. |

Si `actores` está presente, su longitud debe coincidir con `respuesta` (más los `donde_cuando_como`, que no cuentan como actores).

### 3.2 `que_cambia`

```json
{ "tipo": "que_cambia",
  "oracion_a": "La profesora explica la lección.",
  "oracion_b": "Las profesoras explican la lección.",
  "cambio": "La profesora → Las profesoras",
  "opciones": [
    { "texto": "También ha cambiado la palabra que dice la acción.", "ok": true,
      "micro": "Van juntos: si uno pasa a plural, el otro le sigue obligatoriamente." },
    { "texto": "No ha cambiado nada más.", "ok": false,
      "micro": "Fíjate en 'explica' → 'explican': ha cambiado con él." }
  ],
  "fuente_id": "PM-SINT-02" }
```

`cambio` describe el trozo que ha cambiado, en formato `antes → después`. Lo usa la interfaz para resaltarlo tras responder.

### 3.3 `intruso`

```json
{ "tipo": "intruso",
  "oraciones": [
    "María trajo el libro.",
    "Trajo María el libro.",
    "En la biblioteca trabajan muchos estudiantes.",
    "Llegó el paquete."
  ],
  "respuesta": "En la biblioteca trabajan muchos estudiantes.",
  "opciones": [ /* opcional: por qué no encaja */ ],
  "feedback": "Las demás empiezan por quien hace la acción o la traen detrás; esta empieza por un dato de lugar." }
```

`respuesta` es **el texto de la oración**, no su índice, y debe aparecer en `oraciones`. Es la aplicación de la regla general del schema (§7.1): referencias por texto, nunca por posición.

### 3.4 `manipulacion` — el ítem central

```json
{ "tipo": "manipulacion", "manipulacion": "sustituye",
  "oracion": "Entregó un ramo a su profesora.",
  "objetivo": { "texto": "a su profesora", "funcion": "CI" },
  "opciones": [ /* §3.0 */ ] }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `manipulacion` | ✔ | `sustituye` \| `suprime` \| `cambia_numero` \| `mueve` \| `transforma` |
| `oracion` | ✔ | La oración de partida. |
| `objetivo` | ✔ | `{ texto, funcion }`. `texto` debe aparecer **exactamente una vez** en `oracion` (§7.1). `funcion` ∈ lista de funciones (§4). |
| `opciones` | ✔ | Ver §3.0. Su contenido depende de la manipulación: en `sustituye`, `cambia_numero`, `mueve` y `transforma` son **oraciones resultantes**; en `suprime` son **veredictos** («Sigue funcionando» / «El verbo queda cojo» / «Cambia de significado»). |

Que las cinco manipulaciones compartan estructura es lo que permite un solo motor de corrección para las cinco pruebas de la NGLE.

### 3.5 `juicio`

```json
{ "tipo": "juicio",
  "oracion": "María la escribió una carta a Juan.",
  "veredicto": "agramatical",
  "causa": "pronombre_cruzado",
  "opciones_causa": ["pronombre_cruzado", "concordancia_sv", "regimen_prep"],
  "gemela_correcta": "María le escribió una carta a Juan.",
  "explicacion": "Cada función tiene su pronombre: 'a Juan' es CI, así que le corresponde 'le'.",
  "fuente_id": "PM-SINT-35" }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `veredicto` | ✔ | `gramatical` \| `agramatical` \| `norma_culta` \| `dudoso` |
| `causa` | según veredicto | Una de las 22 de §5. Obligatoria salvo si `veredicto: "gramatical"`, donde **no debe aparecer**. |
| `opciones_causa` | según veredicto | 2-4 causas, una de ellas la correcta. Obligatoria salvo en `gramatical`. |
| `gemela_correcta` | según veredicto | Obligatoria si `agramatical` o `norma_culta`. Prohibida si `gramatical`. |
| `explicacion` | ✔ | Qué se rompe, en lenguaje de alumno. |

**Cambio respecto al ejemplo del plan:** el plan y el resumen técnico traen `"veredicto": "agramatical", "marca": "agramatical"`, dos campos con el mismo dato. Se **fusionan en `veredicto`**, que ahora tiene cuatro valores en vez de dos, y la interfaz deduce la marca visual con un mapa fijo:

| `veredicto` | Marca en pantalla | Qué se pregunta |
|---|---|---|
| `agramatical` | **✗ con asterisco** (`.lab-asterisco`) | Veredicto + causa |
| `norma_culta` | **⚠ sin asterisco** | En qué situación no vale (no «si está mal») |
| `dudoso` | **⚖** | Ídem `frontera`: admite discusión |
| `gramatical` | **✓** | Solo veredicto (es un control) |

Un campo menos es una forma menos de escribir un lote incoherente (`veredicto: agramatical` con `marca: norma_culta` era un estado posible y sin sentido).

### 3.6 `par_minimo`

```json
{ "tipo": "par_minimo",
  "oracion_a": "Escribió una carta a su amiga.",
  "oracion_b": "Escribió una carta para su amiga.",
  "cambio": "a → para",
  "opciones": [
    { "texto": "CI → CC Finalidad", "ok": true,
      "micro": "Con 'para' nunca hay CI: 'le' ya no funciona y el trozo se puede desplazar." },
    { "texto": "CI → CD", "ok": false, "micro": "El CD sigue siendo 'una carta'." }
  ],
  "fuente_id": "PM-SINT-11" }
```

Misma forma que `que_cambia`, con una diferencia que el validador vigila: aquí las opciones **sí** pueden nombrar funciones, pero solo desde nivel `medio`. En `basico` van en paráfrasis (§4).

### 3.7 `analisis_inverso`

```json
{ "tipo": "analisis_inverso",
  "consigna": "Construye una oración con sujeto, CD de persona (con 'a') y CI.",
  "piezas": ["El árbitro", "presentó", "a los jugadores", "al entrenador", "les", "ayer"],
  "slots": [
    { "rol": "Sujeto", "acepta": ["El árbitro"] },
    { "rol": "NP", "acepta": ["presentó"] },
    { "rol": "CD", "acepta": ["a los jugadores"] },
    { "rol": "CI", "acepta": ["al entrenador"] }
  ],
  "orden": "fijo",
  "destino": "reto",
  "fuente_id": "AI-SINT-02" }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `consigna` | ✔ | Las condiciones que debe cumplir la oración. |
| `piezas` | ✔ | Banco de piezas arrastrables. **Debe sobrar al menos una** (distractor): sin sobrantes el ejercicio se resuelve por eliminación. |
| `slots` | ✔ | `rol` ∈ funciones (§4) o paráfrasis en `basico`. `acepta` es la lista de piezas válidas para ese hueco y **todas deben estar en `piezas`**. |
| `orden` | — | `fijo` (los huecos van en orden en la oración) \| `libre` (por omisión). |
| `destino` | — | `reto` (por omisión) \| `caja_pruebas` — con `caja_pruebas`, el resultado se guarda como el ejemplo propio del alumno en la Caja de Pruebas del Detective (mecánica 3.3 del plan). |

### 3.8 `frontera`

```json
{ "tipo": "frontera",
  "oracion": "La mayoría de los alumnos llegó tarde.",
  "variante": "La mayoría de los alumnos llegaron tarde.",
  "opciones": [
    { "texto": "Concuerda con 'la mayoría', en singular.", "ok": true,
      "micro": "Análisis por la forma: el núcleo del sujeto es 'mayoría', singular." },
    { "texto": "Concuerda con 'los alumnos', en plural.", "ok": true,
      "micro": "Análisis por el significado: los que llegan son varios. La NGLE admite las dos." }
  ],
  "explicacion": "Las dos son correctas. Lo que se evalúa aquí no es cuál eliges, sino que sepas explicar por qué.",
  "peso": 2 }
```

Exactamente **dos** opciones con `ok: true`. Obliga a `zona_gris: true` en el reto, y esa bandera es la que excluye el ítem del examen (plan §5.4: un ejercicio con dos respuestas válidas es indefendible ante una reclamación).

### 3.9 `etiqueta_prueba`

```json
{ "tipo": "etiqueta_prueba",
  "oracion": "Entregó un ramo a su profesora.",
  "objetivo": { "texto": "a su profesora", "funcion": "CI" },
  "prueba_id": "PRU-SINT-CI-01",
  "distractores": ["PRU-SINT-CD-01", "HEUR-PARA-QUIEN", "HEUR-PREP-A"],
  "enunciado": "tecnico" }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `objetivo` | ✔ | Igual que en `manipulacion`: `texto` único en `oracion`, `funcion` válida. |
| `prueba_id` | ✔ | Id de `js/data/pruebas-sintaxis.js` (§8). |
| `distractores` | ✔ | 2-3 ids. Deben ser la prueba de un **vecino confundible** de la función + al menos un **heurístico rechazado** (`HEUR-*`). |
| `enunciado` | ✔ | `tecnico` («¿qué prueba demuestra que X es CI?») \| `simple` («¿cuál de estos cambios funciona?»). **En nivel `basico` debe ser siempre `simple`** — ERROR si no. |

El contenido de las pruebas no vive aquí: vive en el repertorio (§8). Un reto solo apunta a él. Coste de contenido por reto: cero.

---

## 4. Funciones válidas y regla de metalenguaje

### 4.1 Lista cerrada de funciones

La fuente de verdad es `FUNC_ORAC` en `js/glosario/tags.js`. El validador la replica (igual que ya hace para simples) e incluye un mapa de **etiquetas prohibidas con mensaje de ayuda**, porque hay dos que se van a colar seguro: el banco R-07 del proyecto de Lengua usa `CPred` y `CRég`, que en esta app se llaman `CPvo` y `C.Rég.`

| Escrito | Mensaje del validador |
|---|---|
| `CPred`, `C.Pred.`, `CPredicativo` | usa `CPvo` |
| `CRég`, `CReg`, `C.Reg.` | usa `C.Rég.` |
| `C.Agente`, `C.Ag` | usa `C.Ag.` |
| `Atributo` | usa `Atr.` |
| `Atributo Locativo` | usa `Atr. Loc.` |
| `CC finalidad` | mayúscula: `CC Finalidad` |
| `Predicado Nominal` / `Verbal` | usa `PN` / `PV` |
| `grupo` (en cualquier texto) | terminología NGLE del proyecto: **sintagma**, nunca «grupo» |
| `proposición`, `P1`, `P2`, `P3` | la app dice **oración** y numera **O1/O2/O3** |

Las dos últimas filas son comprobaciones de terminología sobre el texto visible, no sobre las etiquetas. Son baratas y cazan el drift que ya obligó a un commit de corrección en julio.

### 4.2 Regla de metalenguaje por nivel y estación

Traduce a máquina el principio central del módulo («la etiqueta es punto de llegada»). Se comprueba buscando nombres de función y términos técnicos en los textos visibles del ítem (`titulo_problema`, `opciones[].texto`, `consigna`, `feedback`, `explicacion`).

| Dónde | Regla | Severidad |
|---|---|---|
| Estación 1, cualquier nivel | Metalenguaje **prohibido**, sin excepciones | ❌ ERROR |
| Estación 2, nivel `basico` | Prohibido en `manipulacion` y `juicio`; en `par_minimo` y `analisis_inverso` los roles van en paráfrasis | ❌ ERROR |
| Estación 2, `medio` y `avanzado` | Permitido en `par_minimo` y `analisis_inverso`; desaconsejado en `manipulacion` | ⚠ AVISO en `manipulacion` |
| Estación 3, cualquier nivel | Libre (es donde se gana) | — |

> **Ambigüedad del plan que se resuelve aquí.** El plan dice en §1 que la estación 2 no muestra metalenguaje, pero en §2.2 admite funciones en el par mínimo «si el nivel lo permite» y las consignas de análisis inverso las nombran («sujeto, CD de persona, CI»). No es una contradicción real: lo que el método prohíbe es dar la etiqueta **del fenómeno que se está descubriendo**, no toda palabra técnica. Como eso no es comprobable por máquina, la regla dura se aplica donde es inequívoca —toda la estación 1, y los ítems de descubrimiento puro en `basico`— y en el resto queda como aviso. Nivel `basico` no ve una sola etiqueta en ningún sitio, que era el compromiso importante.

---

## 5. Las 22 causas de agramaticalidad

Lista cerrada del campo `causa`. La columna «Nivel mín.» la comprueba el validador: una causa de `avanzado` en un reto `basico` es ERROR.

> **Ampliación de 2026-08-17 (tres causas nuevas).** La lista tenía 16 y se quedaba corta: una auditoría de los 116 juicios agramaticales del banco encontró **6 que etiquetaban como `concordancia_sv` errores que no eran de sujeto y verbo** (1 de determinante-nombre y 5 de pronombre átono con su antecedente). En los 6 la `explicacion` que leía el alumno era gramaticalmente correcta y solo la `causa` era falsa, lo que además contaminaba las estadísticas de error por causa del informe del profesor. No había hueco en la lista para lo que de verdad pasaba en esas oraciones, así que se añaden `concordancia_det_nombre`, `concordancia_atono` y `atono_plural_discordante`.
>
> **`schema_version` sigue siendo `"1.0"`**: añadir causas es retrocompatible (ningún lote existente deja de validar) y bumpear la versión haría saltar un aviso en todos los lotes ya escritos. Se documenta aquí, siguiendo el mismo patrón que el schema de compuestas con sus ampliaciones.
>
> **Las dos causas de átono van separadas a propósito**, y es la decisión de canon más delicada de la ampliación: el desajuste no vale lo mismo en las dos direcciones. Un átono plural con antecedente singular (*A Elena **les** gusta*) no lo produce ningún nativo → ✗ con asterisco. Un átono singular con antecedente plural (***Le** escribió a sus amigos*) lo dice y lo escribe media España, prensa incluida, y la NGLE lo trata como discordancia extendida → ⚠ **sin** asterisco. Una sola causa obligaba a poner asterisco a lo segundo o a quitárselo a lo primero, y las dos opciones enseñan algo falso.
>
> **Ampliación de 2026-08-20 (bloque de valores de «se»).** El diseño de `docs/Cascada_Valores_del_SE_Laboratorio.md` (PASO 1) necesita nombrar tres errores del corpus de *se* que la lista no cubría: pluralizar el verbo de una impersonal cuando lleva «a + persona» (*\*Se han pagado a todos los proveedores*), un recíproco con sujeto en singular (*\*Ana se escribieron cartas* — el recíproco exige sujeto plural, es la misma lógica que `concordancia_sv` pero sobre el pronombre, no sobre el verbo) y un verbo pronominal usado sin su *se* (*\*Alfonso arrepintió*). Se añaden `impersonal_pluralizada`, `reciproco_sujeto_singular` y `verbo_pronominal_sin_se`. Mismo patrón que la ampliación anterior: retrocompatible, `schema_version` se queda en `"1.0"`.

| `causa` | Qué se rompe | Nivel mín. | `veredicto` esperado |
|---|---|---|---|
| `concordancia_sv` | número/persona entre sujeto y verbo | basico | agramatical |
| `concordancia_atr` | el Atr. no concuerda con el sujeto | basico | agramatical |
| `concordancia_det_nombre` | determinante y nombre discordantes dentro del sintagma | basico | agramatical |
| `concordancia_atono` | átono plural con antecedente singular | basico | agramatical |
| `atono_plural_discordante` | átono singular con antecedente plural | basico | **norma_culta** |
| `transitividad` | verbo intransitivo con CD | basico | agramatical |
| `orden_imposible` | permutación que rompe la estructura | basico | agramatical |
| `concordancia_cpvo` | el CPvo no concuerda con su nombre | medio | agramatical |
| `regimen_prep` | preposición fija del verbo sustituida | medio | agramatical |
| `pronombre_cruzado` | pronombre de CD donde va el de CI o al revés | medio | agramatical |
| `seleccion_semantica` | el verbo no admite ese complemento | medio | agramatical |
| `articulo_propio` | nombre propio con artículo | medio | norma_culta |
| `pasiva_refleja_intrans` | pasiva refleja con verbo intransitivo | avanzado | agramatical |
| `duplicacion_obligatoria` | falta el pronombre átono obligatorio | avanzado | agramatical |
| `modo_obligado` | indicativo donde el verbo exige subjuntivo | avanzado | agramatical |
| `gradabilidad` | adjetivo no graduable con cuantificador | avanzado | agramatical |
| `queismo_dequeismo` | preposición ante *que* añadida o suprimida | avanzado | norma_culta |
| `leismo_laismo` | *le* por *lo*, *la* por *le* | avanzado | norma_culta |
| `concordancia_ad_sensum` | concordancia con el significado, no con la forma | avanzado | dudoso |
| `impersonal_pluralizada` | verbo de una impersonal con «se» pluralizado por el CD de persona pospuesto | avanzado | agramatical |
| `reciproco_sujeto_singular` | «se» recíproco con sujeto en singular (el recíproco exige varios) | medio | agramatical |
| `verbo_pronominal_sin_se` | verbo pronominal (arrepentirse, quejarse…) usado sin su «se» | medio | agramatical |

**Fuera del corpus, sin excepción** (no hay código para ellas y el validador rechaza cualquier intento de meterlas): incorrección de origen social (*haiga*, *cocretas*), ortografía, léxico y rasgos dialectales. El marco teórico manda tratarlas como variación social, no como material de análisis.

La columna «`veredicto` esperado» también se valida: `queismo_dequeismo` con `veredicto: "agramatical"` es un ERROR, porque el queísmo se dice y se entiende — es cuestión de registro, no de gramática rota. Confundir las dos cosas es exactamente el error pedagógico que el corpus quiere evitar.

---

## 6. Ponderación (campo `peso`)

Por omisión todo ítem pesa 1. Pesan **2** los que caen sobre una frontera discriminante, según la matriz de vecinos confundibles ya cerrada en el banco de reflexión:

`Atr.`↔`CPvo` · `C.Rég.`↔`CC` · `CI`↔`CC Finalidad` · `C.Ag.`↔`CC Causa` · `Marca.Pas.Ref.`↔`Marca.Imp.` · `Sujeto`↔`CD` · `CD`↔`CI`

El validador **avisa** (no da error) si un ítem cuyo `objetivo.funcion` está en un par discriminante no lleva `peso: 2`: puede ser deliberado, pero conviene mirarlo. La curva de nota y el resto de la ponderación viven en el motor, no en el dato.

---

## 7. Las tres decisiones de diseño que gobiernan todo el schema

### 7.1 Referencias por texto, nunca por posición

`objetivo.texto`, `intruso.respuesta` y `analisis_inverso.slots[].acepta` referencian **cadenas de texto**, no índices. El validador exige que `objetivo.texto` aparezca **exactamente una vez** en su oración (cero veces = error de copia; dos veces = ambiguo, hay que desambiguar reescribiendo la oración).

Motivo: el schema lo escribe a mano un filólogo, y contar palabras es donde se cometen los errores silenciosos. El banco de compuestas tiene 55 identificadores desincronizados justamente por depender de posiciones. Coste de esta decisión: el texto se duplica entre la oración y la referencia, y si se corrige la oración hay que corregir la referencia — pero eso el validador lo caza al instante, mientras que un índice desplazado no se ve nunca.

### 7.2 Listas cerradas para todo lo que el motor interpreta

`manipulacion`, `veredicto`, `causa`, `funcion`, `rol`, `enunciado`, `destino`, `orden`, `nivel`, `curso_min`. Nada de texto libre en un campo del que dependa una decisión del motor. El texto libre está solo donde lo lee un humano: `titulo_problema`, `texto`, `micro`, `explicacion`, `feedback`, `consigna`.

### 7.3 El contenido pedagógico se ancla por repertorio, no por reto

Las pruebas de la estación 3 no se escriben en cada reto: se apuntan con `prueba_id` (§8). Decisión ya tomada en el banco de reflexión y aquí solo ejecutada. Es lo que hace que un lote de 30 retos no sean 30 redacciones de la prueba del CI.

---

## 8. Catálogo de identificadores de prueba

`js/data/pruebas-sintaxis.js` se escribe en **F2 · sesión 1**, pero sus identificadores se fijan **ahora**, porque el lote semilla de F0 · 3 los va a usar. Salen de las 10 entradas del `Banco_reflexion_metalinguistica.md`.

| `prueba_id` | Función | Prueba (resumen) |
|---|---|---|
| `PRU-SINT-SUJ-01` | Sujeto | Si cambio el número del verbo, este sintagma cambia con él |
| `PRU-SINT-CD-01` | CD | Lo sustituyo por *lo/la/los/las* |
| `PRU-SINT-CI-01` | CI | Lo sustituyo por *le/les* |
| `PRU-SINT-CREG-01` | C.Rég. | *eso/ello* con la preposición pegada al verbo |
| `PRU-SINT-ATR-01` | Atr. | Lo sustituyo por *lo* neutro (con copulativo) |
| `PRU-SINT-CPVO-01` | CPvo | Doble cara: modifica al verbo y concuerda con un nombre |
| `PRU-SINT-CAG-01` | C.Ag. | Transformo a activa y pasa a sujeto |
| `PRU-SINT-CC-01` | CC | Se suprime o se desplaza; es invariable |
| `PRU-SINT-VOC-01` | Vocat. | Aislado por comas, sustituible por *¡Oye!* |
| `PRU-SINT-SE-01` | Marca.Pas.Ref. / Marca.Imp. | ¿Concuerda el verbo con el elemento pospuesto? |

**Heurísticos rechazados** (solo como distractores, nunca como respuesta correcta — es la regla del proyecto contra las preguntas al verbo):

`HEUR-QUIEN` · `HEUR-A-QUIEN` · `HEUR-PARA-QUIEN` · `HEUR-COMO` · `HEUR-DE-QUE` · `HEUR-PREP-A` («lleva *a*, luego es CI») · `HEUR-PREP-PARA` · `HEUR-PREP-POR` («lleva *por*, luego es CC Causa»)

Formato validado: `^PRU-SINT-[A-Z]+-\d{2}$` y `^HEUR-[A-Z-]+$`. Mientras `pruebas-sintaxis.js` no exista, el validador comprueba **solo el formato**; cuando exista, comprueba además que el id está definido. Un `HEUR-*` en el campo `prueba_id` (no en `distractores`) es siempre ERROR.

---

## 9. Puente de ida a Simples (`metadatos.origen_oracion_id`)

Decidido con Josele el 12-ago-2026, al cerrar F2·3: `Oraciones_Banco` no tiene columna de ID estable (el `id` que usa el resto del motor de Simples es el número de fila del Sheet, no algo pensado para referenciarse desde otro módulo), así que en vez de migrar esa hoja para añadir un esquema `OR_NNNN` nuevo, el enlace se hace por **texto exacto** — coherente con la decisión de §7.1 (referencias por texto, nunca por posición), que este schema ya aplicaba en otros campos.

- `metadatos.origen_oracion_id` guarda el texto literal de la oración de `Oraciones_Banco` a la que salta el botón "Practica esta oración en Simples", byte a byte idéntico al de su columna A.
- Backend: `getOracionByTexto_` (`Server/Code_v6.gs`, endpoint `getOracionByTexto`) busca esa fila y devuelve el mismo objeto que arma `buildOracionObject` para el resto de Simples. Si no hay coincidencia exacta, responde `{ok:true, found:false}` — no es un error, el frontend simplemente no ofrece el puente para ese reto.
- Campo opcional: los retos sin `origen_oracion_id` (o cuyo texto no encuentra pareja en el banco) no muestran el botón. No bloquea nada del resto del reto.

---

## 10. Lo que este schema deja fuera a propósito

- **Texto libre puntuable.** Todo se valida por opciones o por huecos. El diario metalingüístico y la definición del Cazador de contraejemplos se guardan y se exponen, pero no puntúan.
- **Análisis completo de la oración.** No hay campo para ello: si un ítem lo necesitara, es de Simples. El límite del módulo está en el dato, no solo en la intención.
- **Sintagmas internos y oración compuesta.** No hay estructura para anidar. `avanzado` trabaja sobre oración simple y valores de *se*.
- **Generación automática de manipulaciones** desde `Oraciones_Banco`. El campo `origen_oracion_id` deja la puerta abierta (la app ya sabe qué es CD en esas ~450 oraciones), pero v1.0 no lo explota: los retos se escriben. Si funciona el módulo, ese es el atajo obvio para el lote de `avanzado`.

---

*Schema `laboratorio v1.0` · F0 sesión 1 · jul-2026. Fijado en sesión 🟣 Opus 5 por ser la decisión de arquitectura de datos del módulo. Siguiente paso: modo `laboratorio` de `scripts/validar-banco.mjs` (misma sesión, paso 2). Terminología NGLE del proyecto: sintagma (nunca «grupo»), oración y O1/O2/O3 (nunca «proposición»), «para» nunca introduce CI.*
