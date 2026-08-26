# Contraste del informe externo del Laboratorio contra el schema y el motor reales — agosto 2026

**Fuente auditada:** `docs/Auditoria_Laboratorio_Externa_2026-08.md` (commit 196d328, guardado «sin analizar»), informe externo en dos bloques: auditoría del banco (§1-14) y propuesta de «laboratorio de hipótesis» (§1-18 del segundo bloque).
**Contrastado con:** los 195 retos reales (`banco_export/Laboratorio_Banco_*.tsv`), el schema (`docs/Schema_Laboratorio_v1.0.md`, con sus ampliaciones de 17, 20 y 21 de agosto), el repertorio de pruebas (`js/data/pruebas-sintaxis.js`), el canon (`js/data/canon-agramatical.js`), el motor (`js/modules/laboratorio/index.js`), el backend (`Server/Laboratorio.gs`) y el validador (`scripts/validar-banco.mjs`, modo `laboratorio`).
**Precedente metodológico:** `docs/Auditoria_Fabrica_Reflexion_2026-08.md` (el mismo ejercicio con el informe de la Fábrica, 26-ago-2026).

Este documento decide qué del informe se acepta, qué se rebaja, qué se descarta y con qué datos. De aquí sale el lote 3 del Laboratorio.

---

## 1. Verificación previa: los recuentos del informe son exactos

Igual que en la Fábrica, lo primero es saber si quien escribió el informe leyó el banco de verdad. Lo leyó, y con precisión notable:

| Lo que dice el informe | Real | |
|---|---|---|
| 195 ejercicios | **195 retos** | ✔ exacto |
| básico 50 · medio 113 · avanzado 32 | 50 · 113 · 32 | ✔ exacto |
| juicio «210 aprox.» | **210** | ✔ exacto |
| que_cambia 122 · par_mínimo 59 · intruso 58 | 122 · 59 · 58 | ✔ exacto |
| análisis inverso 32 · valencia 17 · investigación 17 · frontera 7 | 32 · 17 · 17 · 7 | ✔ exacto |
| sustituye 98 · suprime 60 · mueve 27 · cambia_numero 24 · transforma 15 | idénticos | ✔ exacto |
| `zona_gris`: 7 TRUE y 18 filas sin valor | 7 TRUE · 170 FALSE · **18 vacías** | ✔ exacto |

**195 retos · 952 ítems · media de 4,88 ítems por reto.** El único número que se queda corto es «manipulación 195+»: son **224**.

Un matiz que cambia la planificación: el informe llama «ejercicios» a los retos. Lo que el alumno juega son **952 ítems**. Su propuesta de «un lote de unas 50» significa cosas muy distintas según se cuente en retos (≈250 ítems nuevos, un lote grande) o en ítems (≈11 retos, medio lote). Hay que fijarlo antes de encargar nada.

---

## 2. El diagnóstico del informe, y en qué se equivoca

**Su tesis** (el segundo bloque entero): el salto cualitativo sería pasar de «¿qué función tiene esto?» a «tienes una hipótesis: ¿qué prueba la comprueba?», con un repertorio interno que ligue hipótesis → propiedad → prueba → resultado → interpretación, y con la idea clave de que **una prueba puede ser compatible con la hipótesis sin demostrarla**.

**La dirección es exactamente la del proyecto. El diagnóstico de que eso falta, no.** El informe leyó los TSV pero no leyó `js/data/pruebas-sintaxis.js` ni el §8 del schema. Ese laboratorio de hipótesis es el módulo:

- **`etiqueta_prueba` es el tercer tipo de ítem más frecuente del banco: 206 ítems en 195 retos**, prácticamente uno por reto. Su enunciado literal en el motor es «¿Qué prueba demuestra que este trozo es **X**?» — la pregunta del informe, palabra por palabra.
- **El repertorio** (`PRUEBAS_SINTAXIS`): 10 pruebas ancladas a función más 4 de la cascada de «se», cada una con `texto` (técnico), `simple` (para `basico`), `ok` (por qué demuestra) y **`no`** (por qué esa prueba no decide aquí, redactado en interrogativo: «¿Seguro? Esa prueba demuestra X… ¿pasa eso con *{trozo}*?»).
- **Los 8 heurísticos rechazados** (`HEUR-QUIEN`, `HEUR-PREP-A`, `HEUR-PARA-QUIEN`…), que solo pueden ser distractores —ERROR del validador si uno se cuela como respuesta correcta— y cada uno con su contraejemplo escrito. `HEUR-QUIEN` usa *Me gustan las cocinas*, que es el ejemplo del **Modelo 7** del propio informe.
- **La matriz de vecinos** (`PARES_DISCRIMINANTES`, 9 pares) más `HEURISTICO_POR_DEFECTO`: el distractor de un `etiqueta_prueba` no es una opción al azar, es la prueba del vecino que de verdad se confunde y el heurístico que más tienta.
- **La cascada de «se»** (`CASCADA_SE`, 6 peldaños, tipo `investigacion`): la única mecánica que encadena varias preguntas dentro de un mismo ítem. Es, literalmente, el «modo científico» del §16 del informe.

La tabla del §14 del informe («qué propiedad comprueba cada prueba») y el repertorio real coinciden en **9 de sus 10 filas**. Y la lista de campos que propone inventar en §15 ya tiene dueño:

| Campo que propone el informe | Dónde vive ya |
|---|---|
| `hipotesis_objetivo` | `objetivo.funcion` del ítem |
| `hipotesis_alternativa` | el vecino de `PARES_DISCRIMINANTES`, vía `distractores` |
| `propiedad_a_comprobar` / `prueba_recomendada` | `prueba_id` → entrada del repertorio |
| `resultado_esperado` / `interpretacion` | campos `texto` / `simple` / `ok` de la prueba |
| `prueba_insuficiente` + `explicacion` | campo `no` de cada `HEUR-*` |

**Conclusión que cambia las prioridades, y es la misma que en la Fábrica:** no falta filosofía ni motor, falta contenido que los use — y falta estrenar dos cosas ya construidas que tienen cero retos dentro (§6.1 y §6.2).

---

## 3. Lo que se acepta

### 3.1 El desequilibrio de manipulaciones es real, pero es un problema de `basico`

El informe tiene razón en que `sustituye` domina. Lo que no vio es **dónde**:

| | básico | medio | avanzado |
|---|---|---|---|
| sustituye | 28 (54 % de sus manipulaciones) | 62 (42 %) | 8 (31 %) |
| transforma | **0** | 10 | 5 |
| mueve | 9 | 16 | 2 |

`transforma` **no existe en `basico`** (activa↔pasiva, afirmativa↔negativa, explícito↔tácito: cero ítems), y en `avanzado` `mueve` se queda en 2. Su tope de «no más de 1/3 resuelto por sustitución directa» se acepta, aplicado **por nivel** y no al total.

### 3.2 Estrenar el veredicto `dudoso` (⚖) — es su §8 y su §9 convertidos en operación

Su mejor apartado es el §8: no convertir las generalizaciones en reglas absolutas, y distinguir estructura prototípica / norma / variante / zona marcada. **Esa escala ya está en el schema y en el motor, y el banco no la usa:**

- `veredicto: "dudoso"` existe (schema §3.5), tiene icono ⚖ y etiqueta «Es debatible» en `canon-agramatical.js`, y el motor sabe que **no lleva asterisco**. Ítems en el banco: **0 de 210 juicios**.
- Su causa asociada, `concordancia_ad_sensum`, tampoco tiene un solo uso.
- Los 210 juicios se reparten: 154 `agramatical`, 45 `gramatical`, 11 `norma_culta`. El escalón intermedio está vacío.

Coste: **cero de motor y cero de schema**. Es escribir juicios. Es la línea más rentable del lote 3.

Un dato que apoya su preocupación: **111 «siempre» y 28 «nunca»** en los textos visibles, repartidos por 81 retos. La mayoría son legítimos (*con «para» nunca hay CI* es regla dura del proyecto), pero los cuatro «bajo ningún sentido» se concentran en LB_0172-0174, y ese mismo bloque ya obligó a un fix ayer (575120c: *esperar*, *dudar* y *negar* admiten indicativo y salieron del criterio de `modo_obligado`). El texto de esos tres retos aún dice «no admite la otra bajo ningún sentido» — cierto para *querer* / *preferir* / *ordenar*, pero conviene releerlo con la lupa de su §8.

### 3.3 Crecer en `frontera` — sí, pero con una consecuencia que el informe no podía ver

Pide ampliar «muchísimo» los ítems de frontera (hoy 7). De acuerdo pedagógicamente, con una advertencia de arquitectura: `zona_gris` no es una etiqueta descriptiva, **es el filtro que saca el reto del examen**. `Server/Laboratorio.gs` descarta el **reto entero**, no el ítem, salvo que el profesor marque `incluirZonaGris` al crear el PIN. Cada frontera nueva metida en un reto existente es un reto menos en el pool de examen.

**Recomendación:** los `frontera` nuevos van en retos propios y cortos, dedicados a la zona gris, no repartidos dentro de retos que hoy son evaluables.

### 3.4 Los cuatro huecos de contenido reales

Crucé 21 de sus propuestas concretas (A1-L5) con el banco: **17 ya tienen material**. *Se venden pisos / Se vive bien aquí* (su «actividad insignia», L4) son LB_0164 y LB_0165; *Consideraron a Juan…* (L5) está en LB_0185 y LB_0150; *la mayoría* (bloque E) en LB_0083 y LB_0182; `gustar` (K4) en tres retos, y además es el contraejemplo escrito de `HEUR-QUIEN`.

Los cuatro que **no** están, y que sí entran en el lote 3:

1. **A2 · la «a» del CD de persona** — *Vi a los vecinos / Vi la casa*. No hay ni un reto que ataque de frente el error más repetido del curso («lleva *a*, luego es CI»), pese a que el heurístico está escrito y es el distractor por defecto del CD.
2. **A4 · misma preposición, distinta función** — *Confió en su hermano / Trabajó en su despacho*.
3. **L2 · `hablar con`** — compañía / complemento seleccionado / las dos según contexto. Material de `frontera` puro.
4. **La convergencia de pruebas** (§6-§9 de su segundo bloque) — ver §4.

Y el mapa de huecos que sale de contar, más útil que su tabla de cuotas por mecánica: los nueve pares discriminantes están **todos** cubiertos, pero muy desigualmente — `Sujeto↔CD` 20 retos y `CD↔CI` 21, frente a **`Vocat.↔Sujeto` 1, `CPvo↔CC Modo` 3, `CI↔CC Finalidad` 6 y `C.Ag.↔CC Causa` 6**.

---

## 4. Lo que se rebaja: los diez «modelos nuevos»

Cada tipo de ítem nuevo son cuatro cosas —dibujante en el motor, regla en el validador, sección de schema y documentación—, así que primero se cruzan con lo que existe:

| Modelo del informe | Qué es en realidad |
|---|---|
| 1 · Elige la prueba adecuada | `etiqueta_prueba` — **existe, 206 ítems** |
| 2 · Diseña tú la prueba (texto libre) | **descartado por el schema §10**: nada puntuable por texto libre |
| 3 · Elige entre dos hipótesis | `frontera` — **existe** (7) |
| 4 · Prueba insuficiente | redacción de `micro` en `suprime` — **sin motor nuevo** |
| 5 · Dos pruebas contradictorias | ídem, o un `frontera` con sus dos opciones `ok` |
| 6 · Necesitas varias pruebas (convergencia) | **lo único que pide motor**: una segunda cascada |
| 7 · Descarta una hipótesis | `par_minimo` + `HEUR-QUIEN` — **existe** |
| 8 · Cambia una sola variable | `par_minimo` — **existe** (59) |
| 9 · Busca un contraejemplo | **es la F4 ya diseñada**: «Cazador de contraejemplos», plan §4.2 |
| 10 · Construye una oración que cambie el análisis | `analisis_inverso` — **existe** (32) |

Dos precisiones:

- **El modelo 4 es su idea más fina y cuesta poco.** Distinguir «la prueba dio un resultado compatible» de «la prueba lo demuestra» no necesita campo nuevo: las opciones de `manipulacion·suprime` ya son veredictos («Sigue funcionando» / «El verbo queda cojo» / «Cambia de significado»), y basta redactar la `micro` de la opción correcta en términos de *qué no has demostrado con eso*. Es el mismo criterio con el que en la Fábrica se descartó el campo `efecto_formativo`.
- **El modelo 6 sí es motor**, y es el único que lo es. La infraestructura existe —`investigacion` encadena peldaños dentro de un solo ítem— pero está cableada a `CASCADA_SE` y a su tabla de textos `CASC_SE_UI`. Generalizarla a una segunda cascada (por ejemplo Atr.↔CPvo por concordancia) es una tabla de datos nueva más un renderer que deje de dar por supuesto el «se». Media sesión larga. **No antes de que Josele juegue el módulo en el aula.**

**Saldo:** de sus ~55 actividades propuestas, prácticamente todas se pueden escribir hoy sin tocar una línea de JavaScript.

---

## 5. Tres cosas que no se heredan

**1. Su §7 (etiquetado de las subordinadas) ya está bien en el banco.** Afirma que hay «varios ejercicios avanzados» que etiquetan `C.Rég.` en *Espero que vengas*, *Dudo que tengas razón* y *Pienso que tienes razón*, y pide reservar `C.Rég.` para *Me alegro de que vengas*. **Es exactamente lo que hace el banco.** Los siete ítems con subordinada sustantiva como `objetivo`:

| Reto | Oración | Función |
|---|---|---|
| LB_0172 / LB_0173 / LB_0179 / LB_0194 | *Quiero que vengas* · *Prefiero que tengas razón* · **Pienso que tienes razón** · *Ordeno que…* | **CD** |
| LB_0178 | **Me alegro de que vengas a la fiesta** | **C.Rég.** |

Y LB_0179 es, literalmente, el ejercicio de contraste que pide. *Espero que* y *Dudo que* **no aparecen en el banco**: solo estaban en el criterio de `modo_obligado` de `canon-agramatical.js`, y salieron de ahí ayer por la razón que él mismo da (admiten indicativo). Su apartado más contundente es el único que se puede descartar entero.

**2. Su §10 («esto no es un banco de compuestas») confunde el nombre del archivo con el módulo.** El TSV se llama `Taller_Sintaxis_v6_Compuestas - Laboratorio_Banco.tsv` porque *Taller_Sintaxis_v6_Compuestas* es el nombre del **libro entero de Google Sheets**, con sus catorce hojas. El Laboratorio nunca fue el banco de compuestas: **el schema §10 excluye a propósito** la oración compuesta y los sintagmas internos («no hay estructura para anidar»), y las compuestas tienen su propio motor (`js/modules/compuestas/index.js`) y su propio schema 1.2. Su propuesta de abrir aquí bloques de coordinación y de subordinación adjetiva y adverbial **se descarta**: duplicaría un módulo que ya existe. Los seis retos que él identifica como «núcleo de subordinación» funcionan porque tratan la subordinada como un trozo con función, sin anidar nada — que es justo el límite que fija el schema.

**3. Su cálculo de duplicados no se sostiene.** Habla de «eliminar o reconvertir 8-12 ejercicios duplicados». Contando corpus idénticos, títulos repetidos y oraciones compartidas, lo que hay es:

- **1 duplicado real**: LB_0083 (`medio`) y LB_0182 (`avanzado`) tienen el mismo corpus (*La mayoría de los alumnos llegó/llegaron tarde*), los mismos cinco tipos de ítem y el mismo `objetivo`. Uno de los dos sobra, o hay que diferenciarlos de verdad.
- **1 título repetido palabra por palabra** en LB_0008 (`medio`) y LB_0105 (`basico`): «¿Se puede confundir lo que se come con la cantidad que se come?». Aquí el contenido sí está adaptado al nivel (léxico distinto, `enunciado: simple` en `basico`); lo que hay que cambiar es el título.
- 3 oraciones más compartidas por dos retos, todas justificadas.

---

## 6. Lo que el informe no vio (sale de contar el banco y de leer el motor)

**6.1 El escalón «debatible» está construido y vacío.** 0 juicios `dudoso` de 210 (§3.2). Es su propia petición del §8, disponible a coste cero.

**6.2 La Caja de Pruebas del Detective se alimenta de 2 ítems.** `analisis_inverso` admite `destino: "caja_pruebas"` (el alumno guarda su propio ejemplo junto a la prueba que acaba de conquistar) y solo **2 de los 32** lo usan: los otros 30 van a `destino: "reto"`. La mecánica 3.3 del plan está implementada y prácticamente sin contenido.

**6.3 Las 18 `Zona_Gris` vacías son cosméticas, pero conviene arreglarlas.** Todas en el lote semilla de `medio` (las 145 filas posteriores dicen TRUE o FALSE). No rompen nada: tanto el motor como el filtro de examen del GAS leen la bandera del **JSON**, no la columna. El validador no las caza, porque solo comprueba el caso contrario. Es literalmente el mismo defecto que apareció en la Fábrica (13 filas) y se arregló en f3eb5a2.

**6.4 El banco valida limpio: 0 errores en las 195 filas**, con 128 avisos. De ellos, **107 son «esta función es de frontera discriminante y el ítem no lleva `peso: 2`»**, y se reparten de forma sospechosa: 79 en el lote semilla de `medio`, 27 en `basico` lote 1 y **0 en `basico` lote 2**. Como 174 ítems del banco sí llevan `peso: 2`, no es que la ponderación no se use: es que los dos lotes de `basico` siguen criterios distintos. Decisión pendiente de Josele: ¿se pondera la frontera también en `basico`, o no? Hoy hay una respuesta en cada lote.

**6.5 Cuatro retos de `avanzado` no tienen ítem de estación 1** (LB_0184-0186 y LB_0189, todos de la cascada de «se») y uno tiene un ítem cuya oración no está en su corpus (LB_0188). Son avisos, no errores, y en retos de investigación pura puede ser deliberado.

**6.6 Su §6 exagera la concentración de «se» en `avanzado`.** Dice que «el bloque 164-189» está copado por el «se». Reales: **11 retos de 32** lo tocan. Los otros 21 se reparten en duplicación pronominal (4), modo indicativo/subjuntivo (4), gradabilidad (4), régimen (3), leísmo/laísmo (2), concordancia *ad sensum* (2), CPvo↔CC Modo y Vocat.↔Sujeto (1 cada uno). Es decir: **seis de los siete bloques (A-G) que propone como reparto ideal de `avanzado` ya existen**. El único que falta es el G, «construcción sintáctica» — y `analisis_inverso` solo tiene 6 ítems en `avanzado` frente a 15 en `medio`.

---

## 7. Orden de trabajo propuesto

1. **Higiene, ya** (una sesión corta): rellenar a FALSE las 18 `Zona_Gris`; resolver el duplicado LB_0083/LB_0182 y el título repetido LB_0008/LB_0105; releer los «bajo ningún sentido» de LB_0172-0174 a la luz del fix de ayer.
2. **Decidir dos cosas de criterio** (Josele): ¿`peso: 2` en frontera de `basico`, sí o no? ¿El lote 3 se cuenta en retos o en ítems?
3. **Lote 3, solo contenido, ningún tipo de ítem nuevo.** Cuatro líneas: juicios `dudoso` (§3.2) · los cuatro huecos de §3.4 · `transforma` en `basico` y `mueve` en `avanzado` (§3.1) · engordar los cuatro pares discriminantes flacos, con los `frontera` nuevos en retos propios (§3.3). De propina, más `analisis_inverso` con `destino: caja_pruebas` (§6.2).
4. **Nada de motor todavía.** La única propuesta que lo pide es la convergencia de pruebas (§4, modelo 6), y abrir eso antes de que Josele juegue el módulo en el aula es construir sobre una hipótesis. La F4 «Cazador de contraejemplos» ya está diseñada en el plan y es el sitio natural de su modelo 9.

---

## 8. Valoración final

El informe externo acierta en la dirección y falla en el diagnóstico, exactamente igual que el de la Fábrica: pide como salto cualitativo un laboratorio de hipótesis que ya es el 22 % de los ítems del banco (`etiqueta_prueba`, 206) y que tiene su repertorio, su matriz de vecinos y sus heurísticos rechazados escritos desde F2. Sus recuentos son impecables y por eso hay que tomárselo en serio; sus tres apartados más rotundos —el etiquetado de las subordinadas, el banco de compuestas y los 8-12 duplicados— se caen al mirar el dato real.

Lo que deja de valor: la insistencia en que **una prueba compatible no es una prueba concluyente** (barato: es redacción), el aviso contra las formulaciones absolutas (que se resuelve estrenando `dudoso`), cuatro huecos de contenido concretos y la idea de la convergencia de pruebas, que es la única que merece motor y que no toca todavía.

*Documento creado el 2026-08-26 (sesión 🟣 Opus 5). Fuente: `docs/Auditoria_Laboratorio_Externa_2026-08.md`. Precedente: `docs/Auditoria_Fabrica_Reflexion_2026-08.md`.*
