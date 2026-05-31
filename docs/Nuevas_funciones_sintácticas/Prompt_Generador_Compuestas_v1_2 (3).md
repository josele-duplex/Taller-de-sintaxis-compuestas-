# Prompt universal · Generador de oraciones compuestas para el Taller de Sintaxis

Versión: **1.2** · Mayo 2026 Compatible con: `Compuestas_Banco` (esquema **v1.2**) del Taller de Sintaxis. Cómo usar: copia y pega TODO el contenido por debajo de la línea horizontal. Sustituye los parámetros marcados con `{{...}}` por tus valores reales antes de enviar a la IA.

**Cambios respecto a v1.1**:

- **Eliminado el subtipo `sustantiva_c_regimen`**. Toda PS que sea término de preposición se etiqueta como `sustantiva_termino_preposicion`.  
- Añadido el campo `relacion.funcion_sp` para indicar la función del **SP completo** dentro de la oración mayor cuando la PS es término de preposición.  
- Esta es la línea NGLE estándar y la EBAU Murcia: la PS no puede *ser* un C. Régimen; la PS es siempre término de preposición y el **SP entero** es lo que tiene función (CRégimen, CI, CC, CN, CAdj, CAdv, atributo).

Cambios anteriores (v1.0 → v1.1): `schema_version`, `verbo.indices_perifrasis`, coordinación múltiple.

---

# Tarea para la IA

Eres un lingüista-programador especializado en sintaxis del español según la **Nueva Gramática de la Lengua Española (NGLE, RAE)**. Tu tarea es generar ejercicios de **oración compuesta** para el banco de datos del Taller de Sintaxis, una aplicación didáctica para alumnos de 3.º ESO, 4.º ESO y Bachillerato.

Cada ejercicio que generes irá a una hoja de cálculo de Google Sheets como **una fila** con 10 columnas. La columna 7 (`JSON_Compuesta`) contiene un objeto JSON que describe la oración con precisión lingüística total.

## Parámetros de esta ejecución

- **Cantidad de ejercicios a generar**: `{{N}}` (ejemplo: 30\)  
- **Distribución por tipo** (debe sumar `{{N}}`):  
  - Coordinadas: `{{N_COORD}}`  
  - Subordinadas sustantivas: `{{N_SUST}}`  
  - Subordinadas de relativo: `{{N_REL}}`  
  - Construcciones (condicionales, finales, causales, concesivas, ilativas): `{{N_CONSTR}}`  
- **Distribución por nivel** (orientativa):  
  - Básico: \~40 %  
  - Medio: \~40 %  
  - Avanzado: \~20 %  
- **Numeración inicial de IDs**: empieza en `OC_{{ID_START}}` (ejemplo: `OC_0006` si en el banco ya hay del `OC_0001` al `OC_0005`).

---

# 1\. Marco teórico (lo que la IA debe respetar siempre)

## 1.1 Terminología NGLE estricta

- Usar **«sintagma»**, nunca «grupo».  
- Usar **«proposición»** para cada cláusula con verbo finito o no finito dentro de la oración compuesta.  
- La preposición es siempre el **núcleo** de su sintagma preposicional (N Prep).  
- Etiquetas de función válidas: `cd`, `ci`, `cc`, `atributo`, `cpvo`, `c_regimen`, `c_agente`, `marca_pas_ref`, `mod_oracional`, `vocativo`.  
- En relativas, el pronombre relativo (`que`, `quien`, `cual`, etc.) tiene una **función interna** dentro de la PS y no se confunde con la función de la PS dentro de la PP.

## 1.2 Reglas duras (errores que invalidan el ejercicio)

1. **«para» NUNCA introduce CI.** «Trabajo para mi padre» → CC de finalidad / C.Régimen, según el verbo. Nunca CI.  
2. **El subjuntivo desencadenado por nexos** (`que venga`) NO es CD por el subjuntivo, sino por la prueba de sustitución pronominal (`lo dijo`).  
3. **El sujeto tácito** se marca como `tipo: "tacito"` con `indices: []`. NO se introduce un token Ø en `tokens`.  
4. **Las perífrasis verbales** (`tengo que estudiar`, `voy a comer`, `había salido`) se tratan como **un único núcleo verbal**. En el campo `verbo` de la proposición:  
   - `indice` apunta al **verbo léxico** (núcleo de significado: «estudiar», «comer», «salido»).  
   - `indices_perifrasis` (campo nuevo en schema 1.1, **opcional pero recomendado** cuando hay perífrasis) lista todos los tokens que forman la perífrasis, incluido el verbo léxico. Ejemplo: `"verbo": {"forma": "estudiar", "indice": 4, "indices_perifrasis": [2, 3, 4]}` para «tienes que estudiar».  
   - El auxiliar (y la conjunción/preposición intermedia, si la hay) **figura en `predicado.indices` junto con el verbo léxico**, pero NO se cuenta como verbo nuevo y NO genera proposición separada.  
5. **El se de pasiva refleja** se marca como `marca_pas_ref` en `funciones`, no como CI ni como nexo.  
6. **Las relativas especificativas** restringen al antecedente (sin comas); las **explicativas** lo añaden información (entre comas). Nunca confundir.  
7. **Yuxtaposición**: si dos proposiciones se separan por **punto y coma, dos puntos o coma sin nexo coordinante**, hay nexo de yuxtaposición. El signo de puntuación es el nexo. Su `categoria` será `"puntuacion"`.

---

# 2\. Esquema del JSON\_Compuesta (objeto raíz)

Cada ejercicio tiene esta estructura. **Todos los campos son obligatorios salvo los marcados como opcionales.**

```json
{
  "schema_version": "1.2",
  "id": "OC_0006",
  "tipo_ejercicio": "compuesta",
  "tipo_oracion": "coordinada | subordinada | yuxtapuesta | mixta",
  "texto": "La oración tal como se muestra al alumno.",

  "tokens": [ ... ],          // Sección 3
  "proposiciones": [ ... ],   // Sección 4
  "nexos": [ ... ],           // Sección 5
  "relaciones": [ ... ],      // Sección 6

  "metadatos": {              // Sección 7
    "nivel": "basico | medio | avanzado",
    "fases_activas": [0,1,2,3,4,5,6],
    "consejo_inicial": "Pista breve y motivadora para el alumno antes de empezar."
  }
}
```

**Nota schema 1.2**: el campo `schema_version` es obligatorio y vale exactamente `"1.2"`. Permite al motor de la app saber qué reglas aplicar al parsear.

---

# 3\. Sección `tokens`

Lista plana de todas las palabras y signos de puntuación de la oración, en orden, indexados desde 0\.

```json
{ "i": 0, "texto": "María", "categoria": "sustantivo" }
```

Categorías válidas (lista cerrada):

- `sustantivo`, `adjetivo`, `verbo`, `adverbio`  
- `pronombre` (personales: yo, tú, él, me, te, lo…)  
- `pronombre_relativo` (que, quien, cual, donde, cuyo cuando son relativos)  
- `conjuncion` (que \[completivo\], y, pero, si, porque, aunque…)  
- `puntuacion` (`.`, `,`, `;`, `:`, `…`, `?`, `!`)  
- `otro` (artículos, determinantes, preposiciones, interjecciones, conjunciones que no encajen arriba)

No es obligatorio distinguir aún artículo de preposición en `categoria`. La granularidad fina es responsabilidad del módulo de oraciones simples. Aquí basta con marcar correctamente verbos, conjunciones, pronombres, relativos y puntuación.

---

# 4\. Sección `proposiciones`

Lista de proposiciones identificadas. Cada una tiene esta forma:

```json
{
  "id": "p1",
  "texto": "La profesora dijo",
  "indices": [0, 1, 2],
  "verbo": { "forma": "dijo", "indice": 2 },
  "tipo": "principal | coordinada | subordinada",
  "subtipo": null,
  "funcion": null,
  "estructura": "personal | impersonal",
  "analisis_interno": { ... },   // Sección 4.1 — OBLIGATORIO
  "metadata": {                   // OPCIONAL, solo en relativas
    "tiene_antecedente": true,
    "antecedente_indices": [1]
  }
}
```

**Reglas para `proposiciones`:**

- **`indices`** lista los tokens que pertenecen DIRECTAMENTE a esta proposición en su nivel superficial. Si una proposición incrusta otra, los tokens de la incrustada NO van en `indices` de la incrustante (van en la suya propia).  
- **`tipo`**: `principal` si la PS depende de ella; `coordinada` si está al mismo nivel que otras unidas por un nexo coordinante; `subordinada` si depende de otra.  
- **`subtipo`**: solo se rellena en subordinadas. Lista cerrada en sección 8\.  
- **`funcion`**: solo se rellena si la proposición es subordinada. Es la función que la PS desempeña dentro de la unidad superior. Lista cerrada en sección 8\.  
- **`estructura`**: `impersonal` solo si el verbo es de impersonalidad sintáctica (`hay`, `llueve`, `se vive bien`). En cualquier otro caso, `personal` (incluso con sujeto tácito).

## 4.1 Subcampo `analisis_interno` (estructura argumental de la proposición)

Este campo describe **cómo se organiza internamente la proposición**: sujeto, predicado y funciones del predicado. Es información a nivel de **función entera con índices**, NO a nivel de núcleo de sintagma.

```json
"analisis_interno": {
  "sujeto": {
    "tipo": "lexico | tacito | impersonal",
    "indices": [0, 1],
    "persona": "1 | 2 | 3",
    "numero": "singular | plural"
  },
  "predicado": {
    "tipo": "verbal | nominal",
    "indices": [2]
  },
  "funciones": [
    { "tipo": "cd", "indices": [3, 4, 5, 6, 7] }
  ]
}
```

**Reglas para `analisis_interno`:**

1. **`sujeto.tipo`**:  
   - `lexico` → tiene expresión léxica visible. `indices` ≠ vacío.  
   - `tacito` → omitido pero recuperable por la persona-número del verbo. `indices` \= `[]`.  
   - `impersonal` → no hay sujeto sintáctico (`hay tres alumnos`, `llueve`). `indices` \= `[]`.  
2. **`predicado.tipo`**:  
   - `nominal` → verbo copulativo (ser, estar, parecer) seguido de atributo.  
   - `verbal` → cualquier otro caso.  
3. **`predicado.indices`** lista solo el verbo (o la perífrasis entera) y, en predicado nominal, también la cópula. NO incluye los complementos.  
4. **`funciones`** lista las funciones que dependen del predicado, con sus índices. **Etiquetas válidas (lista cerrada)**:  
   - `cd` — complemento directo  
   - `ci` — complemento indirecto  
   - `cc` — complemento circunstancial (cualquier subtipo)  
   - `atributo` — solo en predicado nominal  
   - `cpvo` — complemento predicativo  
   - `c_regimen` — complemento de régimen / suplemento  
   - `c_agente` — solo en pasivas  
   - `marca_pas_ref` — el `se` de pasiva refleja o impersonal  
   - `mod_oracional` — modificador oracional  
   - `vocativo`  
5. **Subordinadas como funciones**: cuando una PS desempeña una función dentro de la PP (CD, sujeto, atributo, c\_regimen, etc.), aparece dos veces:  
   - En `funciones` de la PP, con los índices completos de la PS.  
   - Como una `relacion` con `funcion: "cd"` (etcétera) en la sección 6\. Esto es redundancia controlada para validación cruzada.  
6. **NO se incluyen aquí**: núcleos de sintagma, adyacentes, determinantes, complementos del nombre, complementos del adjetivo, modificadores. Eso pertenece al módulo de oraciones simples.

## 4.2 Ejemplos rápidos de `analisis_interno`

**Ejemplo A** — «María estudia.»

```json
"analisis_interno": {
  "sujeto":    { "tipo": "lexico", "indices": [0], "persona": "3", "numero": "singular" },
  "predicado": { "tipo": "verbal", "indices": [1] },
  "funciones": []
}
```

**Ejemplo B** — «La profesora dijo que el examen sería el martes.»

- PP «La profesora dijo»:

```json
"analisis_interno": {
  "sujeto":    { "tipo": "lexico", "indices": [0,1], "persona": "3", "numero": "singular" },
  "predicado": { "tipo": "verbal", "indices": [2] },
  "funciones": [
    { "tipo": "cd", "indices": [3,4,5,6,7,8] }
  ]
}
```

- PS «el examen sería el martes»:

```json
"analisis_interno": {
  "sujeto":    { "tipo": "lexico", "indices": [4,5], "persona": "3", "numero": "singular" },
  "predicado": { "tipo": "nominal", "indices": [6] },
  "funciones": [
    { "tipo": "atributo", "indices": [7,8] }
  ]
}
```

**Ejemplo C** — «que me regalaste» (relativa de «El libro que me regalaste está en la estantería»):

```json
"analisis_interno": {
  "sujeto":    { "tipo": "tacito", "indices": [], "persona": "2", "numero": "singular" },
  "predicado": { "tipo": "verbal", "indices": [4] },
  "funciones": [
    { "tipo": "cd", "indices": [2] },
    { "tipo": "ci", "indices": [3] }
  ]
}
```

Aquí el «que» (token 2\) aparece simultáneamente como nexo (con `funcion_interna: "cd"`) y como CD del predicado de la PS. Esa redundancia es deliberada.

---

# 5\. Sección `nexos`

Lista de elementos que conectan proposiciones (conjunciones, locuciones conjuntivas, relativos, signos de puntuación en yuxtaposición).

```json
{
  "id": "n1",
  "forma": "que",
  "indices": [3],
  "categoria": "conjuncion | pronombre_relativo | locucion_conjuntiva | puntuacion",
  "funcion_interna": null,
  "ambito": "interproposicional | intra_proposicional"
}
```

- **`indices`** puede tener varios tokens si es una locución conjuntiva (`a pesar de que`, `ya que`, `puesto que`).  
- **`funcion_interna`** solo se rellena en pronombres relativos: indica qué función tiene el relativo dentro de la PS (`cd`, `ci`, `cc`, `sujeto`, `c_regimen`).  
- **`ambito`**:  
  - `interproposicional` → conecta dos proposiciones del mismo nivel (coordinadas).  
  - `intra_proposicional` → introduce una proposición dentro de otra (subordinante).

---

# 6\. Sección `relaciones`

Lista de relaciones sintácticas entre proposiciones.

```json
{
  "id": "r1",
  "tipo": "coordinacion | subordinacion | yuxtaposicion",
  "subtipo": "...",
  "proposiciones": ["p1", "p2"],
  "nexo": "n1",
  "direccion": { "origen": "p1", "destino": "p2" },
  "funcion": "cd",
  "funcion_sp": "c_regimen"
}
```

- **`tipo`**: tres únicos valores válidos.  
- **`subtipo`**: lista cerrada (sección 8).  
- **`proposiciones`**: array con **al menos 2 IDs** de proposiciones implicadas. **Schema 1.1+**: en coordinaciones múltiples («Juan estudia, María trabaja y Pedro descansa»), este array puede tener 3 o más IDs y se considera **una sola relación de coordinación múltiple**, NO varias relaciones binarias encadenadas. La subordinación, en cambio, sigue siendo siempre binaria (exactamente 2 IDs).  
- **`nexo`**: ID del nexo que articula la relación. En yuxtaposición sin signo, puede ser `null`. En coordinaciones múltiples con varias ocurrencias del mismo conector («o…o…o»), pueden listarse todos los índices en el `indices` del nexo único.  
- **`direccion`**: solo en subordinación. `origen` es la PP, `destino` es la PS.  
- **`funcion`**: solo en subordinación. **Función que la PS desempeña en la unidad superior**. Si la PS está incrustada en un SP, esta función vale `termino_preposicion`. En el resto de subordinadas sustantivas, vale `sujeto`, `cd`, `atributo`, `aposicion`, etc.  
- **`funcion_sp`** (schema 1.2, OBLIGATORIO si y solo si `subtipo` es `sustantiva_termino_preposicion`): **función del SP completo** que contiene la PS. Valores válidos: `c_regimen`, `ci`, `cc`, `cn`, `c_adj`, `c_adv`, `atributo`. Ejemplos:  
  - «Mis padres se enteraron **de \[que había aprobado\]**» → `funcion_sp: c_regimen` (SP es C.Régimen del verbo enterarse).  
  - «No des importancia **a \[que no te haya llamado\]**» → `funcion_sp: ci` (SP es CI del verbo dar).  
  - «Entraron en la casa **sin \[que nadie se percatara\]**» → `funcion_sp: cc` (SP es CC del verbo entrar).  
  - «Tengo miedo **de \[que se enfaden\]**» → `funcion_sp: cn` (SP es CN del sustantivo miedo).  
  - «Estoy convencido **de \[que aprobarás\]**» → `funcion_sp: c_adj` (SP complementa al adjetivo convencido).  
  - «Lo dejé encima **de \[donde lo habías puesto\]**» → `funcion_sp: c_adv` (SP complementa al adverbio encima).

---

# 7\. Sección `metadatos`

```json
{
  "nivel": "basico | medio | avanzado",
  "fases_activas": [0,1,2,3,4,5,6],
  "consejo_inicial": "Texto breve, motivador, narrativo."
}
```

- **`nivel`**:  
  - `basico` → 2 proposiciones, nexos prototípicos (`y`, `pero`, `que` completivo), sin incrustación profunda.  
  - `medio` → 2-3 proposiciones, posible relativa especificativa o construcción condicional sencilla.  
  - `avanzado` → 3+ proposiciones, mixtas (coordinación \+ subordinación), nexos menos prototípicos, posible incrustación.  
- **`fases_activas`**: para v1 del módulo, siempre `[0,1,2,3,4,5,6]`.  
- **`consejo_inicial`**: 1-2 frases con metáfora narrativa, no regla abstracta. Estilo: pista que un buen profesor daría antes de empezar. Ejemplos:  
  - «Busca los verbos: cada uno indica una proposición.»  
  - «Atención: la PP no tiene palabras contiguas. La subordinada se incrusta en medio.»  
  - «Hay tres verbos: habrá tres proposiciones y dos relaciones.»  
  - «Cuidado: la prótasis (PS) va delante, pero la PP es la que puede funcionar sola.»

---

# 8\. Listas cerradas de `subtipo` y `funcion`

## 8.1 Subtipos según `tipo_oracion`

**Coordinadas**:

- `copulativa` (`y`, `e`, `ni`, `ni…ni`)  
- `disyuntiva` (`o`, `u`, `o bien`)  
- `adversativa` (`pero`, `mas`, `sino`, `sino que`, `aunque` adversativo)  
- `distributiva` (`unos…otros`, `bien…bien`, `ya…ya`)  
- `explicativa` (`es decir`, `o sea`, `esto es`)  
- `ilativa_coord` (`con que`, `así que` cuando coordinan, no construcción)

**Subordinadas sustantivas** (la PS hace una función nominal):

- `sustantiva_sujeto`  
- `sustantiva_cd`  
- `sustantiva_atributo`  
- `sustantiva_aposicion`  
- `sustantiva_termino_preposicion` (la PS es término de una preposición; el SP completo tiene una función indicada en `relacion.funcion_sp`)

**IMPORTANTE — schema 1.2**: el subtipo `sustantiva_c_regimen` **no existe**. Una PS no puede *ser* un C. Régimen; lo es el SP que la contiene. Caso típico: «Mis padres se enteraron de \[que había aprobado\]» → subtipo `sustantiva_termino_preposicion`, `funcion: termino_preposicion`, `funcion_sp: c_regimen`.

**Subordinadas de relativo**:

- `relativa_especificativa`  
- `relativa_explicativa`  
- `relativa_libre` (sin antecedente expreso: «Quien dice eso miente»)  
- `relativa_semilibre` («el que/la que/los que dice eso»)

**Construcciones** (NGLE: la PS se relaciona con la PP sin ser CC en sentido estricto):

- `condicional`  
- `final`  
- `causal`  
- `concesiva`  
- `ilativa_constr` (consecutiva)

**Subordinadas adverbiales propias** (la PS sí funciona como CC):

- `temporal`  
- `locativa`  
- `modal`  
- `comparativa`

**Yuxtaposición**:

- `yuxtaposicion_simple`

## 8.2 Funciones de la PS dentro de la PP (`relacion.funcion`)

Para subordinadas sustantivas, una de:

- `sujeto`, `cd`, `atributo`, `aposicion`, `termino_preposicion`

Si la `funcion` de la subordinada sustantiva es `termino_preposicion`, la `funcion_sp` (función del SP completo) DEBE rellenarse con uno de: `c_regimen`, `ci`, `cc`, `cn`, `c_adj`, `c_adv`, `atributo`.

Para subordinadas de relativo:

- `cn` (complemento del nombre, en especificativas y explicativas)  
- `incidental` (en explicativas que afectan a toda la oración)  
- En relativas libres / semilibres, la función puede ser `sujeto`, `cd`, etc.

Para construcciones:

- `construccion_condicional`, `construccion_final`, `construccion_causal`, `construccion_concesiva`, `construccion_ilativa`

Para subordinadas adverbiales propias:

- `cc_temporal`, `cc_locativo`, `cc_modal`, `cc_comparativo`

Para coordinadas y yuxtapuestas:

- `null` (no hay función jerárquica entre proposiciones del mismo nivel).

---

# 9\. Reglas de calidad del corpus generado

Para que un ejercicio sea aceptable:

1. **Variedad léxica**: no repitas la misma estructura «X estudia y Y trabaja» 20 veces. Usa contextos diversos (familiares, escolares, laborales, viajes, ciencia, deporte, naturaleza).  
2. **Léxico apropiado a la edad** (12-18 años): evita arcaísmos, tecnicismos opacos, vocabulario adulto.  
3. **Sin nombres propios reales** de personalidades públicas. Usa nombres comunes (María, Pedro, Lucía, Diego, Marta, Javier).  
4. **Sin contenido sensible**: nada de violencia explícita, política partidista, religión, ideología, contenido sexual, alcohol/drogas, autolesión.  
5. **Tono neutro y/o positivo**.  
6. **Coherencia interna**: lo que digas en `tokens` debe coincidir con `texto`, los `indices` deben ser válidos, los IDs de `proposiciones`/`nexos`/`relaciones` deben referenciarse correctamente entre sí.  
7. **Validación previa antes de entregar**: para cada ejercicio, comprueba mentalmente:  
   - ¿Cada proposición tiene verbo?  
   - ¿Los `indices` cubren todos los tokens no-puntuación?  
   - ¿No hay solapamiento de índices entre proposiciones (salvo nexos `intra_proposicional`)?  
   - ¿Hay al menos una principal en cada oración con subordinación?  
   - ¿Los nexos de relaciones existen en `nexos`?  
   - ¿Las proposiciones referenciadas en `relaciones` existen en `proposiciones`?  
   - ¿`funciones` de `analisis_interno` no incluye análisis interno de sintagmas?

---

# 10\. Formato de salida

**ENTREGA EL RESULTADO COMO TSV (Tab-Separated Values), no como CSV.** Una fila por ejercicio. La primera fila es la cabecera. Los campos van separados por **tabuladores** (`\t`), no por comas. Cada fila termina en salto de línea.

## 10.1 Cabecera (10 columnas, en este orden exacto)

```
ID	Texto	Tipo_Oracion	Subtipo	Nivel	N_Proposiciones	JSON_Compuesta	Activo	Tags_JSON	Notas_Internas
```

## 10.2 Reglas por columna

| Columna | Contenido |
| :---- | :---- |
| `ID` | `OC_NNNN` con NNNN de 4 dígitos. Empezar en `OC_{{ID_START}}` y avanzar correlativamente. |
| `Texto` | La oración tal como se muestra al alumno. Sin comillas que la rodeen. |
| `Tipo_Oracion` | Uno de: `coordinada`, `subordinada`, `yuxtapuesta`, `mixta`. |
| `Subtipo` | El subtipo de la **relación principal** del ejercicio (sección 8.1). |
| `Nivel` | `basico`, `medio` o `avanzado`. |
| `N_Proposiciones` | Entero. Coincide con la longitud del array `proposiciones`. |
| `JSON_Compuesta` | El objeto JSON completo, **serializado en una sola línea** (sin saltos de línea internos). |
| `Activo` | Siempre `Sí` (con tilde) en todas las filas que generes. |
| `Tags_JSON` | JSON compacto en una línea con: `{"tipo_oracion":"...","subtipo":"...","nivel":"...","num_proposiciones":N,"nexos":["forma1","forma2"]}` |
| `Notas_Internas` | Texto libre breve indicando aspecto pedagógico relevante (p. ej.: «Buen ejemplo de relativa con antecedente discontinuo»). Vacío si no procede. |

## 10.3 Reglas de formato crítico para TSV

1. **Ningún tabulador dentro del JSON**. Los JSON deben serializarse compactos (sin indent, sin tabs).  
2. **Ningún salto de línea dentro de ningún campo**. Todo el JSON\_Compuesta va en una línea.  
3. **Comillas dobles**: déjalas tal cual (`"`). No las escapes con `""` ni con `\"`. TSV no las requiere.  
4. **No envuelvas las celdas entre comillas**. TSV no lo necesita.  
5. **Tildes y eñes**: usa Unicode directo (UTF-8), no entidades HTML.  
6. **NO incluyas markdown** (```` ``` ````, `*`, `#`) en la salida. Solo TSV puro.

## 10.4 Cómo entrega la IA

Tu respuesta debe contener:

1. **Una sección breve** (máximo 5 líneas) confirmando: cantidad generada, distribución por tipo, distribución por nivel.  
2. **Un único bloque de código** con la cabecera en TSV de la sección 10.1, seguido de las `{{N}}` filas.  
3. **Una sección final** (máximo 10 líneas) con observaciones: ejercicios donde dudaste, casos límite que resolviste de una forma concreta, sugerencias para el siguiente lote.

Ejemplo de cómo empezar la respuesta:

```
He generado 30 ejercicios:
- Coordinadas: 8 · Subordinadas sustantivas: 8 · Subordinadas de relativo: 8 · Construcciones: 6
- Básico: 12 · Medio: 12 · Avanzado: 6

[BLOQUE TSV con cabecera + 30 filas]

Observaciones:
- En 3 ejercicios he optado por...
- Sugiero que en el próximo lote...
```

---

# 11\. Ejemplo completo trabajado (para que la IA tenga referencia exacta)

## Oración: «La profesora dijo que el examen sería el martes.»

### Fila TSV correspondiente (cabecera \+ 1 fila):

```
ID	Texto	Tipo_Oracion	Subtipo	Nivel	N_Proposiciones	JSON_Compuesta	Activo	Tags_JSON	Notas_Internas
OC_0006	La profesora dijo que el examen sería el martes.	subordinada	sustantiva_cd	basico	2	{"schema_version":"1.2","id":"OC_0006","tipo_ejercicio":"compuesta","tipo_oracion":"subordinada","texto":"La profesora dijo que el examen sería el martes.","tokens":[{"i":0,"texto":"La","categoria":"otro"},{"i":1,"texto":"profesora","categoria":"sustantivo"},{"i":2,"texto":"dijo","categoria":"verbo"},{"i":3,"texto":"que","categoria":"conjuncion"},{"i":4,"texto":"el","categoria":"otro"},{"i":5,"texto":"examen","categoria":"sustantivo"},{"i":6,"texto":"sería","categoria":"verbo"},{"i":7,"texto":"el","categoria":"otro"},{"i":8,"texto":"martes","categoria":"sustantivo"},{"i":9,"texto":".","categoria":"puntuacion"}],"proposiciones":[{"id":"pp","texto":"La profesora dijo","indices":[0,1,2],"verbo":{"forma":"dijo","indice":2},"tipo":"principal","subtipo":null,"funcion":null,"estructura":"personal","analisis_interno":{"sujeto":{"tipo":"lexico","indices":[0,1],"persona":"3","numero":"singular"},"predicado":{"tipo":"verbal","indices":[2]},"funciones":[{"tipo":"cd","indices":[3,4,5,6,7,8]}]}},{"id":"ps","texto":"el examen sería el martes","indices":[4,5,6,7,8],"verbo":{"forma":"sería","indice":6},"tipo":"subordinada","subtipo":"sustantiva_cd","funcion":"cd","estructura":"personal","analisis_interno":{"sujeto":{"tipo":"lexico","indices":[4,5],"persona":"3","numero":"singular"},"predicado":{"tipo":"nominal","indices":[6]},"funciones":[{"tipo":"atributo","indices":[7,8]}]}}],"nexos":[{"id":"n1","forma":"que","indices":[3],"categoria":"conjuncion","funcion_interna":null,"ambito":"intra_proposicional"}],"relaciones":[{"id":"r1","tipo":"subordinacion","subtipo":"sustantiva_cd","proposiciones":["pp","ps"],"nexo":"n1","direccion":{"origen":"pp","destino":"ps"},"funcion":"cd"}],"metadatos":{"nivel":"basico","fases_activas":[0,1,2,3,4,5,6],"consejo_inicial":"¿Qué dijo la profesora? Esa respuesta es la subordinada."}}	Sí	{"tipo_oracion":"subordinada","subtipo":"sustantiva_cd","nivel":"basico","num_proposiciones":2,"nexos":["que"]}	Buen ejemplo introductorio: subordinada sustantiva CD pura con cópula en la PS.
```

Nota: en el ejemplo de arriba, los tabuladores aparecen como espacios visuales por la limitación del Markdown, pero en la salida real de la IA deben ser caracteres `\t` reales.

---

# 12\. Importación en Google Sheets

Una vez que tengas el TSV de la IA:

1. Guárdalo en un archivo `.tsv` o `.txt` con codificación UTF-8.  
2. En Google Sheets, abre la hoja `Compuestas_Banco`.  
3. `Archivo → Importar → Subir`.  
4. Selecciona el archivo TSV.  
5. Configuración:  
   - Ubicación de importación: **«Insertar nuevas filas en la hoja actual»**.  
   - Tipo de separador: **«Tabulador»**.  
   - Convertir texto en números: **NO** (esto es crítico: si lo dejas en Sí, romperá los IDs y los JSON).  
6. Pulsa «Importar datos».  
7. Verifica visualmente que las nuevas filas tienen la columna G (`JSON_Compuesta`) con un JSON largo, la columna H (`Activo`) con `Sí`, y los `OC_NNNN` correlativos.

---

# 13\. Resumen para la IA

- Generas `{{N}}` ejercicios de oración compuesta.  
- Sigues NGLE estricto, distinguiendo subordinadas, construcciones, coordinación, yuxtaposición.  
- En cada proposición incluyes `analisis_interno` con sujeto, predicado y funciones del predicado (NO con análisis interno de sintagmas).  
- Devuelves TSV puro con cabecera y `{{N}}` filas, en un único bloque, con JSON serializado en una sola línea por celda.  
- Pre-validación interna antes de entregar.

---

# 14\. Estrategia interna obligatoria para la IA

Para reducir errores, sigue este orden mental al construir cada ejercicio:

1. **Detecta verbos finitos e infinitivos con valor verbal pleno.** Cada uno apunta a una proposición potencial. Excluye los que sean parte de una perífrasis (no abren proposición nueva).  
2. **Delimita las proposiciones**: agrupa cada verbo con sus dependientes (sujeto, complementos). Decide qué tokens van en `indices` de cada proposición.  
3. **Determina la jerarquía**: ¿hay una principal y otras dependientes? ¿hay coordinación al mismo nivel? ¿hay yuxtaposición?  
4. **Identifica los nexos**: conjunciones, locuciones, relativos, signos de puntuación. Decide su `categoria`, `ambito` y, si son relativos, su `funcion_interna`.  
5. **Construye las relaciones**: para cada par (o grupo, en coord. múltiple) de proposiciones, decide tipo, subtipo, dirección y función.  
6. **Genera la lista plana de tokens** con índices consecutivos desde 0\.  
7. **Calcula los índices** de cada proposición, nexo y función. Verifica que cubran todo el texto sin solapamientos prohibidos.  
8. **Rellena `analisis_interno` de cada proposición**: sujeto, predicado, funciones del predicado.  
9. **Valida coherencia interna**:  
   - ¿Cada `relacion.proposiciones` y `relacion.nexo` referencian IDs existentes?  
   - ¿La PS aparece tanto en `funciones` de la PP (con sus índices) como en una `relacion` con su función?  
   - ¿`indices_perifrasis` (si existe) contiene a `verbo.indice`?  
   - **Si la PS es término de preposición**: ¿`subtipo` es `sustantiva_termino_preposicion`? ¿`funcion` es `termino_preposicion`? ¿`funcion_sp` está rellenado con un valor válido?  
   - ¿NO has usado el subtipo `sustantiva_c_regimen` (eliminado en schema 1.2)?  
   - ¿`schema_version` es exactamente `"1.2"`?  
10. **Serializa** todo en una línea TSV.

**Empieza ahora. Genera los `{{N}}` ejercicios.**  
