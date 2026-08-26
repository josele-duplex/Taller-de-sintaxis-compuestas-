# Plan de revisión de la Fábrica de Palabras — agosto 2026

**Fuentes:** los dos documentos de revisión de Josele («Revisión fábrica de palabras.md» y «Revisión 2 Fabrica de palabras.md», Descargas, 2026-08-10) + el Excel `Fabrica_Palabras_V2_100_ejercicios.xlsx`, todo cruzado con el banco real (`docs/lotes/Formacion_Banco_*.tsv`, 83 retos) y con el canon aprobado en F5 (`docs/Schema_Formacion_v1.0.md` §12).

Este documento es la referencia de la revisión: qué se ha arreglado ya, qué decisiones quedan, y en qué orden se hace el resto.

---

## 1. Lo que ya está arreglado (2026-08-10, commits `10441ee` y `c151632`)

Eran los puntos en los que no había nada que discutir: el ejercicio enseñaba una regla falsa o un truco vacío.

| Problema (doc de revisión) | Arreglo aplicado |
|---|---|
| 🔴 **Cascada, primera pregunta** — «¿Se puede separar en dos palabras completas que existen por su cuenta?» invitaba a la trampa gráfica (*ir + regular*). | Sustituida en los **18** casos por «¿Está formada uniendo dos palabras que aportan su significado a la palabra nueva?». Pregunta por la **formación**, no por la coincidencia de letras. Las respuestas no cambian: derivadas, siglas y acrónimos siguen contestando «no»; compuestas, «sí». |
| 🔴 **Préstamos «tomados tal cual»** — falso para *tuit*, *estrés*, *fútbol*, *mitin*, *líder* (préstamos **adaptados**). | La pregunta de cascada pasa a «¿Ha entrado desde otra lengua, tal cual o adaptada a nuestra escritura?» (×3) y el intruso de FP_0057 ya no dice que *fútbol* se tomó «entero de otro idioma». |
| 🔴 **«selfi» junto a software/hardware** (FP_0080) — *selfi* ya está adaptada; no puede ejemplificar el préstamo crudo. | Sustituida por *streaming* en ese intruso. El caso *selfie → selfi* se sigue trabajando donde toca: FP_0056, que trata exactamente la adaptación. |
| 🟠 **Distractor absurdo en los 9 «monta»** — siempre *mesa*/*coche*/*sol*: se descarta sin pensar. | Cada monta lleva ahora un distractor **plausible** que obliga a razonar: *des-* para *imposible* (rivalidad de prefijos), *-ura* para *pureza* (rivalidad *-ura*/*-eza*), *-ecer* para *legalizar*, *-astro* para *pueblucho*, *cierra* para *abrelatas* (combinación entendible pero no acuñada), *tarde* para *medianoche* (existe, pero sin soldar)… En *deshacer*, *re-* pasa a ser pieza **válida** (segunda palabra construible: *rehacer*). |
| 🟠 **Cadena de «librería»** (FP_0012) — el feedback afirmaba «sin *librero* no hay *librería*», y la RAE admite también *libro + -ería* (como *panadería*). | El feedback ya no vende una ruta única como la única posible. |

Validador: **0 errores** en los tres lotes tras los cambios (los avisos que quedan ya existían y son benignos).

> ⚠ **Esto solo toca los TSV del repo (la semilla).** El banco vivo está en la hoja `Formacion_Banco` del Google Sheet y **no se actualiza solo** — ver §5, Paso 0.

---

## 2. Una falsa alarma que conviene dejar escrita: los «IDs repetidos»

El doc 2 (§G) señala que FP_0008 «aparece en Intruso y en Monta». No es un error del banco: **un ID = un reto completo**, y cada reto contiene 3-5 ejercicios de tipos distintos (esa es la estructura de las tres estaciones). Al volcar el banco a tablas por tipo para revisarlo, el mismo ID aparece lógicamente en varias tablas. No hay nada que corregir.

Lo que **sí** importa de ese apartado: los ejercicios nuevos propuestos en los documentos reutilizan IDs ya ocupados (FP_0030-0039, FP_0069-0079 existen en el banco con otro contenido). **Todo lote nuevo empieza en `FP_0084`.** El Excel V2 usa prefijos `FP2_I_`, `FP2_M_`… que tampoco valen tal cual (el schema exige `FP_NNNN`): se renumeran al convertir.

---

## 3. Auditoría del Excel V2 (100 ejercicios)

**Veredicto global: sí se pueden incorporar, pero no con copiar-pegar.** El Excel trae un ejercicio por fila; el banco funciona por **retos** (mini-corpus + 3-5 ejercicios encadenados por estaciones). Hay que agrupar, completar los campos obligatorios que el Excel no trae (explicaciones de alumno, forma correcta en los juicios, corpus, microexplicaciones por opción) y curar lo que sigue. Trabajo real pero mecánico: 1-2 sesiones.

### Hoja por hoja

| Hoja | Total | Aprovechables | Observaciones |
|---|---|---|---|
| **Intruso** | 25 | **~24** | Familias bien elegidas y variadas (justo lo que pedía la revisión: *calor/calendario*, *leer/lechuga*, *móvil/inmoral*…). FP2_I_025 (*café/cafetera/descafeinado/cafetín*, **sin intrusa**) necesita el motor nuevo de §4. |
| **Monta** | 15 | **7** (M_009-M_015) | M_001-M_008 son los montas que **ya existen** en el banco, con el distractor absurdo *mesa/coche/sol* que precisamente acabamos de eliminar. Se descartan. Los 7 nuevos (nacionalizar, inutilidad, florero, entristecer, nacionalismo, incomprensible, reorganización) traen distractores plausibles: bien. |
| **Frontera** | 10 | **~2-3 tal cual** | Aquí está el problema mayor. En el banco, `frontera` = dos análisis que **compiten** de verdad y los dos puntúan (zona gris). Pero en F_001-F_004 (*sacacorchos, pararrayos, aguardiente, bocacalle*) las dos «lecturas» no compiten: «compuesto léxico» y «unidad lexicalizada» son **las dos verdaderas a la vez**. Además *sacacorchos* y *abrelatas* ya están en básico como compuesta léxica de respuesta única — sería contradictorio. Se reconvierten en cascadas/clasifica (la lexicalización puede entrar como pregunta o `conclusion`). F_005 (*incomprensible*) y F_007 (*desagradablemente*) **no son zona gris** por el canon §12 (P1: \**incomprender* no existe; *-mente* siempre se une al adjetivo): se reconvierten en `capas`, que es donde brillan. Quedan como fronteras auténticas F_006 (*inutilizable*, gemela de la ya existente *inmovilizable*) y F_008 (*malhumorado*). F_009 (*sietemesino*) → decisión de §6. F_010 (*hombre rana*) ya existe (FP_0072). |
| **Juicio** | 25 | **~23** | Muy buenos (\**desconfianzación*, \**nacionalizamiento*, \**pelorrojo*…). Tres cosas a corregir al convertir: (1) al Excel le faltan `forma_correcta` y `explicacion`, obligatorias — hay que redactarlas; (2) **error de nivel**: `restriccion_sufijo` y `alomorfo_incorrecto` son causas de nivel `avanzado` según el schema §6, y el Excel las usa en básico (\**panidad*, \**musicista*) y medio (\**desconfianzación*…) — o se sube el reto a avanzado o se recausa; el validador lo cazaría igualmente; (3) todos son `no_existe`: hay que intercalar controles con veredicto `correcta` (regla del schema §2.1). Sobre \**blandar*: la explicación debe decir «no funciona como paso intermedio», no «no existe» a secas (la propia revisión avisa de que la RAE documenta históricamente formas así). |
| **Cascada** | 25 | **~10 netas** | C_011-C_018 y C_020-C_022 (ONG, DNI, FIFA, docudrama, informática, pyme, 11-S, 5G, podcast, tuit, selfi) **duplican cascadas que el banco ya tiene** con esas mismas palabras. Las netas nuevas: *imposible, panadería, deshacer, sacacorchos, pararrayos, aguardiente, núm., foto, nacionalización* (esta con la lógica «¿existe X? ¿existe Y?…», que es exactamente la cascada de estructura secuenciada de F5 — se codifica con el campo `conclusion` que el motor ya soporta). Dos «llega_a» del Excel no existen en la lista cerrada de procedimientos: `prestamo_adaptado` y `cadena_derivativa` — **no hace falta ampliar la lista**: se resuelven con `conclusion` (texto libre), que es para lo que se creó en F5. *R2D2* como numerónimo es simpático pero es un nombre propio de ficción: propongo cambiarlo por *MP3* o *4x4*. |

**Saldo estimado del lote 2:** unos **55-65 ejercicios netos** una vez quitados duplicados y reconvertidas las fronteras, agrupados en **~20-25 retos nuevos** (`FP_0084` en adelante).

---

## 4. La «trampa buena»: intrusos sin intrusa (cambio de motor pequeño)

Josele ha confirmado que los controles sin intrusa son deliberados y quiere ese aprendizaje: *el alumno debe poder descubrir que no siempre hay una palabra intrusa* (que es aprender a desconfiar de la pregunta, no solo a contestarla).

**Qué hay hoy:** el motor pinta las 4 palabras y espera un clic en una de ellas; el schema obliga a que `respuesta` sea una de las palabras. No existe la opción «no hay».

**Qué se hará (schema v1.2, §13 nueva):**

- Dato: campo opcional `sin_intruso: true` (y entonces `respuesta` no aparece). Validador: exactamente una de las dos cosas.
- Motor: **todos** los intrusos (con y sin trampa) muestran un botón extra «🚫 No hay intrusa» debajo de las palabras. Es imprescindible que aparezca siempre: si solo saliera en los de trampa, el propio botón delataría la respuesta.
- Pedagógicamente esto cambia el ejercicio entero para bien: hasta el intruso normal exige ahora una decisión más («¿seguro que hay intrusa?»).

En la misma sesión de motor, dos mejoras baratas que salen de la revisión:

- **`contexto` opcional en `juicio`** — «Un alumno quería fabricar el contrario de *hacer* y escribió…». Convierte el juicio en diagnóstico de una operación, que es lo que pedía el doc 2 (§6 y §F): los juicios tipo \**legali* sueltos no dicen qué se estaba intentando.
- Nada más. La tentación de meter aquí `calidad_didactica`, corchetes, etc. se resiste (ver §7).

---

## 5. Plan de trabajo por fases

### Paso 0 — Josele, ~10 minutos: subir al Sheet lo ya arreglado

Los arreglos de hoy viven en los TSV del repo; el banco vivo es la hoja `Formacion_Banco`. Como han cambiado filas de los tres niveles, lo más limpio es **reimportar los tres TSV** (esto además hace innecesario ejecutar `fixIntrusosAgrupaFormacion()`, porque los TSV ya llevan aquel arreglo incorporado):

1. Abre el Google Sheet maestro → pestaña `Formacion_Banco`.
2. Selecciona todas las filas de datos (de la fila 2 hacia abajo) y bórralas (clic derecho → Eliminar filas). **No borres la fila 1** (cabecera).
3. Archivo → Importar → Subir → `Formacion_Banco_basico_seed.tsv` → «Anexar a la hoja actual» → tipo de separador: **Tabulador** (nunca «Detectar automáticamente»).
4. Repite el paso 3 con `Formacion_Banco_medio_seed.tsv` y `Formacion_Banco_avanzado_seed.tsv`.
5. No hay que tocar Apps Script ni redesplegar nada: los datos se leen de la hoja. La caché del servidor (`formacion_all`) caduca sola en pocos minutos.

*(Estamos en agosto y sin alumnos dentro: es el momento ideal. Esto no toca código en producción, solo contenido.)*

### Fase B — motor pequeño (1 sesión, 🔵 Sonnet)

`sin_intruso` + botón «No hay intrusa» + `contexto` en juicio + validador + §13 del schema. Todo en `js/modules/fabrica/index.js`, `scripts/validar-banco.mjs` y `docs/Schema_Formacion_v1.0.md`. Sin tocar GAS: no hace falta redespliegue.

### Fase C — lote 2 (1-2 sesiones, 🔵 Sonnet)

Convertir el Excel V2 a retos según la auditoría de §3: agrupar por familias, renumerar desde `FP_0084`, redactar los campos que faltan, aplicar las reconversiones (fronteras→cascada/capas), intercalar juicios `correcta` de control, pasar el validador a 0 errores, y entregar `Formacion_Banco_lote2.tsv` + instrucciones de importación. Los ejercicios de los dos documentos .md que no están en el Excel (p. ej. las capas de *imparcialidad*, *desestabilizar*, *enrojecimiento*, *aterrizaje*; las cadenas de *musicalidad*, *modernización*, *cervantino*) entran también aquí, filtrados por el canon §12 — con dos descartes ya razonados: *desagradable* como capas (la escalera propuesta en el doc salta el análisis estándar *des + agradable*; si entra, entra como frontera) y *hechizo* como intruso de *hacer* (¡*hechizo* SÍ es de la familia de *hacer*! — de hecho puede reconvertirse en intruso-trampa sin intrusa, que es más divertido).

### Fase D — revisión de Josele en el aula (sin sesión de código)

Jugar el lote 2 en producción como hizo con el 1. Lo que chirríe vuelve como doc de revisión, igual que esta vez. El circuito ya está rodado.

---

## 6. Decisiones que solo puede tomar Josele (checklist)

1. **Sietemesino** (FP_0060): el banco lo tiene como frontera *compuesta vs parasintética* (decisión F4); la revisión propone quitarle la ambigüedad y centrarlo en justificar capas. Las dos posturas son defendibles. ¿Se mantiene como está o se reformula? *(Mi recomendación: mantener — la ambigüedad compuesta/parasintética es real y está bien documentada en el schema §3.8; lo que la revisión critica es venderla como «todo vale», y el ítem no hace eso: exige justificar.)*
2. **Librería/panadería y el sufijo -ería**: tras el arreglo de hoy el feedback ya no impone una ruta única. ¿Quieres además un ítem `frontera` en avanzado que trabaje explícitamente la doble ruta (*librero + -ía* vs *libro + -ería*)? Es un caso bonito de doble análisis legítimo.
3. **R2D2** → ¿sustituir por *MP3* o *4x4*?
4. **Los tecnicismos del final del doc 1** (corchetes jerárquicos, bases supletivas tipo *lact-*, haplología de *calamidad*, paradojas tipo *intramuscular*): ver §7 — propongo descartarlos casi todos por ahora.

---

## 7. Lo que propongo NO hacer (y por qué)

- **Segmentación jerárquica con corchetes en pantalla** (`[[[nación]al]izar]ción`): el modo `capas` ya enseña exactamente esa jerarquía, pero jugándola (ordenar peldaños y rechazar la escalera falsa) en vez de mostrarla en notación formal. La notación es de universidad; el juego es de aula. Coste alto de motor, beneficio pedagógico dudoso en ESO/1B.
- **`calidad_didactica` como bloque de metadatos**: el banco ya tiene `nivel`, `zona_gris`, `peso` y la lista cerrada de causas — cubren el 90 % de lo que ese bloque etiquetaría. Añadir 5 campos más por reto encarece cada lote y nadie los consumiría todavía. Se reevalúa después del lote 2 si de verdad falta algo.
- **Bases supletivas y haplología** (*lactosa*, *fidelidad*, *calamidad*): materia preciosa… para Bachillerato avanzado o EBAU de matrícula. El curso que viene, si el nivel Maestro se queda corto, es un mini-lote propio («las bases cultas») — no ahora.
- **`prestamo_adaptado` como procedimiento nuevo**: no hace falta ampliar la lista cerrada; la cascada termina con `conclusion` («préstamo ya adaptado a nuestra escritura») y la distinción queda enseñada sin tocar el motor ni las 12 categorías.
- **Feedback a dos niveles (alumno/profesor)** con `justificacion_docente`: la infraestructura de micros ya da el nivel alumno; el nivel profesor lo cubren hoy los propios TSV y este documento. Si tras el lote 2 se quiere en pantalla (p. ej. en la Mesa de Herramientas), es una fase propia y pequeña.

---

## 8. Recordatorio de calendario

- Los cambios de **contenido** (Sheet) pueden subirse ya (agosto, sin alumnos). Los cambios de **motor** (Fase B) también son solo cliente (GitHub Pages), pero conviene agruparlos y verificarlos antes del arranque de curso.
- Sigue pendiente (transversal, no de este módulo): **integración con iDoceo** — esperando la plantilla de ponderación de Josele a finales de septiembre de 2026.

*Documento creado el 2026-08-10 (sesión 🟣 Fable). Commits de esta revisión: `10441ee`, `c151632` y el de este documento.*
