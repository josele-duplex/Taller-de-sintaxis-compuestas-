# Schema JSON de oración compuesta v1.2

> **Cuándo cargar**: vas a escribir, validar o depurar un `JSON_Compuesta` (campo de `Compuestas_Banco`), o a resolver un error de schema en un lote generado por IA. **Cuándo NO**: para dudas de terminología en prosa (usa `conventions.md`).
>
> **La numeración del schema (1.2) y la del prompt generador son independientes.** El schema de datos (la estructura del JSON) va por 1.2 desde que se eliminó `sustantiva_c_regimen`. El prompt que se le pega a una IA para generar lotes ha seguido subiendo de versión (1.3, 1.4, 1.5…) añadiendo campos **opcionales y compatibles hacia atrás** al mismo schema 1.2 — no es un schema nuevo, son ampliaciones. **La fuente de verdad siempre es `docs/Nuevas_funciones_sintácticas/Prompt_Generador_Compuestas_v1_5.md` del repo** (o la versión más alta que encuentres ahí): este documento es un resumen para no tener que abrir el prompt entero cada vez, pero si algo no cuadra, gana el prompt real, no este resumen.

## 0. Changelog de lo añadido sobre la base 1.2 (léelo antes de asumir que esto es todo el schema)

Estos campos NO estaban en la versión original de este documento y se añadieron sin tocar `schema_version` (siguen siendo compatibles con `"1.2"`):

- **`atributo_locativo`** (v1.3) — atributo de lugar obligatorio con verbo copulativo/semicopulativo (*el jefe está en la oficina*). No se sustituye por «lo», sí por «allí». Si el verbo es pleno y el lugar es prescindible, es `cc` con `subtipo: "lugar"`, no esto.
- **`dativo`** (v1.3) — dativo no argumental (ético o de interés): pronombre átono suprimible sin romper la oración. Si al quitarlo se pierde un participante necesario, es `ci`, no `dativo`.
- **`analisis_interno.funciones[].subtipo`** (v1.3, opcional) — cuando `tipo: "cc"`, puede llevar `subtipo` ∈ `lugar`/`tiempo`/`modo`/`causa`/`finalidad`/`cantidad`/`compania`/`instrumento`/`beneficiario`. Campo opcional: los ejercicios antiguos sin él siguen siendo válidos, pero los lotes nuevos deben rellenarlo siempre que `tipo` sea `cc`.
- **Verbos semicopulativos** (v1.4) — `predicado.tipo: "nominal"` ya no implica solo ser/estar/parecer: también aplica a semicopulativos (*ponerse, quedarse, volverse, hacerse, resultar, salir, seguir, permanecer, mostrarse, verse*…). El schema no cambia (sigue siendo `{"tipo":"nominal",...}` + función `atributo`); solo cambia qué verbos lo activan. Tabla completa de verbos y categorías semánticas en `PROMPT_Analisis_Sintactico_Simples_v1_3.md` del repo (misma tabla sirve para simples y compuestas).
- **Columna `ID` vacía en el TSV** (v1.5) — el campo `id` del JSON y la columna `ID` del TSV se dejan como `""` al generar un lote; la numeración `OC_NNNN` la asigna el menú del Sheet después de importar, no la IA. Si ves un TSV con IDs ya puestos por la IA, es de una versión de prompt anterior a 1.5: no es un error, pero conviene renumerar con el menú igualmente.
- **v1.5 sección 0** — «reglas duras que la app comprueba»: recoge descuidos concretos que en julio de 2026 dejaron ejercicios imposibles de terminar para el alumno (no son errores de JSON inválido, son errores de **diseño del ejercicio** que el validador de schema no puede cazar por sí solo). Si un lote nuevo se atasca en la app sin que el validador se queje, mira esa sección del prompt antes de sospechar un bug de código.

Nada de lo de abajo (§1-§8) queda invalidado por estos cambios: son ampliaciones sobre la misma base.

## 1. Objeto raíz

```json
{
  "schema_version": "1.2",
  "id": "OC_NNNN",
  "tipo_ejercicio": "compuesta",
  "tipo_oracion": "coordinada | subordinada | yuxtapuesta | mixta",
  "texto": "La oración tal como se muestra al alumno.",
  "tokens": [ ... ],
  "proposiciones": [ ... ],
  "nexos": [ ... ],
  "relaciones": [ ... ],
  "metadatos": {
    "nivel": "basico | medio | avanzado",
    "fases_activas": [0,1,2,3,4,5,6],
    "consejo_inicial": "Pista breve para el alumno."
  }
}
```

## 2. `tokens[]`

Cada token representa **una palabra o signo de puntuación** de la oración.

```json
{
  "i": 0,
  "texto": "Lucía",
  "categoria": "sustantivo"
}
```

Categorías válidas:
- `sustantivo`, `adjetivo`, `verbo`, `adverbio`
- `pronombre`, `pronombre_relativo` (separados porque renderizan distinto en UI)
- `conjuncion`
- `puntuacion`
- `otro` (preposiciones, determinantes, artículos, cuantificadores… cualquier cosa no encuadrada arriba)

**Reglas**:
- Los índices `i` son consecutivos, empezando en 0, **y coinciden con la posición del token en el array** (`tokens[k].i === k`). No es solo una convención de estilo: `js/modules/compuestas/index.js` accede a tokens por posición directa (`ej.tokens[idx]`) en varios sitios, así que un `i` desalineado con su posición muestra el token equivocado al alumno sin que salte ningún error visible.
- El texto reconstruible debe coincidir con `ej.texto` (módulo espacios alrededor de puntuación).

## 3. `proposiciones[]`

Cada proposición:

```json
{
  "id": "pp",
  "texto": "Lucía prepara la cena",
  "indices": [0, 1, 2, 3],
  "verbo": {
    "forma": "prepara",
    "indice": 1,
    "indices_perifrasis": [1]
  },
  "tipo": "principal",
  "subtipo": null,
  "funcion": null,
  "estructura": "personal",
  "analisis_interno": {
    "sujeto": { "tipo": "lexico", "indices": [0], "persona": "3", "numero": "singular" },
    "predicado": { "tipo": "verbal", "indices": [1] },
    "funciones": [
      { "tipo": "cd", "indices": [2, 3] }
    ]
  }
}
```

### Campos clave
- `id`: usado para referenciar. Por convención: `pp` (principal) y `ps` (subordinada) en binarias; `p1`, `p2`, `p3` en coordinadas múltiples. **Pero la UI siempre los renombra a O1, O2, O3** según orden en el array (ver `conventions.md` §7 — nunca P1/P2/P3, esa fue una convención de diseño que nunca se implementó así).
- `tipo`: `principal` / `subordinada` / `coordinada` / `yuxtapuesta`.
- `subtipo`: solo para subordinadas/coordinadas (ver listas en `conventions.md`).
- `funcion`: la función sintáctica que esta proposición realiza en la unidad mayor (`cd`, `sujeto`, `cc_temporal`, `termino_preposicion`, etc.). Para principales y coordinadas: `null`.
- `estructura`: `personal` / `impersonal` (afecta al motor de fases interactivas).
- `verbo.indices_perifrasis` (opcional): si hay perífrasis, lista todos los tokens; si no, omitir o repetir solo el del verbo.

### `analisis_interno.sujeto.tipo`
- `lexico` → con `indices` no vacíos.
- `tacito` → `indices: []`.
- `impersonal` → `indices: []`.

### `analisis_interno.predicado.tipo`
- `verbal` o `nominal` (ver §0 sobre verbos semicopulativos: también activan `nominal`).

### `analisis_interno.funciones[]`
- Cada elemento: `{tipo: string, indices: [int]}`, y para `cc` opcionalmente `subtipo` (ver §0).
- `tipo` ∈ {`cd`, `ci`, `cc`, `atributo`, `atributo_locativo`, `cpvo`, `c_regimen`, `c_agente`, `dativo`, `marca_pas_ref`, `mod_oracional`, `vocativo`}.

## 4. `nexos[]`

```json
{
  "id": "n1",
  "forma": "que",
  "indices": [3],
  "categoria": "conjuncion",
  "funcion_interna": null,
  "ambito": "intra_proposicional"
}
```

- `categoria`: `conjuncion` / `pronombre_relativo` / `locucion_conjuntiva` / `puntuacion`.
- `funcion_interna`: si el nexo es pronombre relativo, indica qué función cumple dentro de la PS (`cd`, `cc`, etc.). Para conjunción completiva: `null`.
- `ambito`: `intra_proposicional` (entre dos proposiciones de la misma oración) o `extra_proposicional` (raro).

### Importante
- **Conjunción completiva**: aparece SOLO en `nexos[]`, NO en `indices` de la PS.
- **Pronombre relativo**: aparece en `nexos[]` Y en `indices` de la PS (porque cumple función dentro de ella).

## 5. `relaciones[]`

```json
{
  "id": "r1",
  "tipo": "subordinacion",
  "subtipo": "sustantiva_termino_preposicion",
  "proposiciones": ["pp", "ps"],
  "nexo": "n1",
  "direccion": { "origen": "pp", "destino": "ps" },
  "funcion": "termino_preposicion",
  "funcion_sp": "c_regimen"
}
```

### Campos
- `tipo`: `subordinacion` / `coordinacion` / `yuxtaposicion` (tres valores únicos).
- `subtipo`: de la lista cerrada de cada tipo (ver `conventions.md`).
- `proposiciones`: array con ≥2 IDs. Subordinación: siempre 2. Coordinación: puede ser ≥2 (coordinación múltiple).
- `nexo`: ID del nexo. En yuxtaposición sin signo, puede ser `null`.
- `direccion`: solo en subordinación. `origen` = PP, `destino` = PS.
- `funcion`: solo en subordinación. Función de la PS dentro de la mayor.
- `funcion_sp` (OBLIGATORIO si y solo si `subtipo` = `sustantiva_termino_preposicion`): función del SP completo. Valores: `c_regimen`, `ci`, `cc`, `cn`, `c_adj`, `c_adv`, `atributo`.

## 6. `metadatos`

```json
{
  "nivel": "basico",
  "fases_activas": [0, 1, 2, 3, 4, 5, 6],
  "consejo_inicial": "¿Qué dijo la profesora? Esa respuesta es la subordinada."
}
```

- `fases_activas`: las fases del motor pedagógico habilitadas para este ejercicio.
- `consejo_inicial`: aparece sobre la oración antes de empezar.

## 7. El validador real (no el que dice la sección anterior si viene de un doc viejo)

**El validador vigente es `scripts/validar-banco.mjs` (Node, en la raíz del repo), no un script Python.** Uso:

```bash
node scripts/validar-banco.mjs compuestas banco_export/Compuestas_Banco.tsv
```

> **Nota histórica (corregida jul-2026).** Existió en algún momento un `scripts/validate_compuesta.py` — pero nunca llegó a incorporarse al repositorio: vivía únicamente en la caché de sesión de otra aplicación (no en git), y además su lista de funciones válidas se había quedado atrás del schema real (no conocía `atributo_locativo` ni `dativo`, añadidos después). Al recuperarlo y compararlo con el validador de producción, tenía algunas comprobaciones estructurales que el validador Node no hacía todavía — se han portado a `validar-banco.mjs` (ver más abajo) y el script Python se retira: mantener dos validadores del mismo schema en dos lenguajes es la clase de duplicación que se desincroniza sola, como le pasó a este mismo documento.

Reglas que aplica el validador de producción:
1. `schema_version` = `"1.2"` (aviso si no).
2. `tipo_oracion` y `nivel` en lista cerrada (columna y JSON, con comprobación de coherencia entre ambos).
3. Tokens: **array no vacío**, **índices `i` consecutivos y alineados con la posición**, **categoría de cada token en la lista cerrada**, **texto reconstruible** desde los tokens.
4. Cada `proposicion.id` único; cada `proposicion.verbo.indice` apunta a un token dentro de rango y de categoría `verbo`; si existe `verbo.indices_perifrasis`, contiene a `verbo.indice` y todos sus valores están en rango.
5. `proposicion.indices` dentro de rango.
6. Subtipo eliminado `sustantiva_c_regimen` → ERROR explícito con el reemplazo correcto.
7. `analisis_interno.funciones[].tipo` en la lista cerrada (incluye `atributo_locativo` y `dativo`); si `tipo: "cc"`, `subtipo` (si existe) en su lista cerrada.
8. Cada `nexo.id` único; índices de nexo dentro de rango.
9. Cada `relacion.id` referencia proposiciones y nexo existentes.
10. Subordinación → **exactamente 2** proposiciones, con `direccion` y con `funcion`. Coordinación → ≥2 proposiciones, **sin** `funcion`.
11. `funcion_sp` obligatorio si y solo si `subtipo = sustantiva_termino_preposicion`, y con valor de la lista cerrada; prohibido en cualquier otro subtipo.

## 8. Errores comunes en JSONs generados por IA

- IA genera `sustantiva_c_regimen` (anterior a schema 1.2). Renombrar a `sustantiva_termino_preposicion` + `funcion_sp: c_regimen`.
- IA pone el `que` completivo dentro de `indices` de la PS. Quitarlo.
- IA olvida `indices_perifrasis` en perífrasis. Añadirlo, no es crítico pero es recomendado.
- IA pone funciones `cc_temporal` en `analisis_interno.funciones[].tipo`. Cambiar a `cc` (con `subtipo: "temporal"` si procede, ver §0).
- IA olvida `funcion_sp` cuando aplica. Añadirlo con el valor correcto (`c_regimen` para la mayoría de casos de verbos con régimen).
- IA numera los IDs ella misma en vez de dejarlos vacíos (ver §0, cambio de v1.5). No rompe el schema, pero desaprovecha la auto-numeración del Sheet.
