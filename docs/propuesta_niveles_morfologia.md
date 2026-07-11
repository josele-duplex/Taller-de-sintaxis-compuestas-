# Propuesta · Los tres niveles del modo Morfología

**Fecha:** 2026-07-11 (rev. 2, tras estudiar el documento oficial PAU) · **Estado:**
propuesta pedagógica para revisión de Josele — SIN evaluación ni ponderación (eso viene
después, en el plan de implementación).
**Encargo:** reestructurar el modo Morfología en tres niveles de profundidad coherentes
con el currículo real de ESO y Bachillerato y con lo que la PAU pide de verdad, al nivel
de madurez que ya tienen los módulos de sintaxis.

## 0. Fuentes utilizadas

1. **⭐ «MORFOLOGÍA PAU» (IES Europa, 1.º Bach)** — el documento imprescindible aportado
   por Josele: la *receta oficial de análisis PAU* categoría a categoría («de cada
   palabra hay que decir, en este orden…»), con cuadros de tipos, perífrasis,
   pronombres y locuciones. **Es la fuente normativa del Nivel 3.**
2. **Modelo PAU** (sección «Nos preparamos (modelo PAU)» del tema *La reflexión
   morfológica*, libro 1.º Bach): la pregunta 4b alternativa es *formación de palabras*
   (constituyentes + procedimiento). Complementa a la fuente 1 (que cubre el análisis
   categorial, no la formación).
3. **Tema completo de 1.º Bach** (mismo archivo): límites entre categorías, locuciones,
   perífrasis, formación.
4. **Referencia de Morfología y Sintaxis** del proyecto de aula (síntesis 1.º ESO–1.º Bach).
5. **Índices del libro por curso**: 1.º ESO recorre todas las categorías con atributos
   básicos; 3.º ESO consolida con *clases de palabras + locuciones + sintagmas*.
6. **Estado actual de la app** (`js/modules/maestro/index.js`): tres niveles
   `aprendiz` (solo categoría), `eso34` (subconjunto), `maestro` (cascada completa).

## 1. Principio rector: tres verbos, tres momentos del currículo

| Nivel | Operación | Tramo | Pregunta típica |
|---|---|---|---|
| **N1 · Categorías** | **Identificar** | 1.º–2.º ESO | «¿Qué clase de palabra es?» |
| **N2 · Análisis** | **Analizar** | 3.º–4.º ESO | «Di todo lo que sabes de esta palabra» |
| **N3 · PAU** | **Aplicar la receta PAU** | Bachillerato | «la: determinante, definido, artículo, determinado, femenino, singular» |

El N3 no es «el N2 con más pasos» ni tampoco un nivel minimalista: es **la receta
exacta que el corrector de la PAU espera, en su orden**, con sus inclusiones (género y
número casi siempre; terminación del adjetivo; voz del verbo) y sus exclusiones
(subclases semánticas del sustantivo, cercanía del demostrativo…). La cascada de la app
reproduce de forma natural ese formato de respuesta enumerada.

**El banco no cambia.** Los tokens ya llevan todos los atributos; cada nivel es una
*vista* que pregunta un subconjunto. Las adiciones nuevas (terminación, voz pasiva,
locuciones, formación) son atributos opcionales que se etiquetan progresivamente.

## 2. Nivel 1 · Categorías (1.º–2.º ESO) — se mantiene, con un ajuste de inventario

Como ahora: el alumno solo indica la **categoría** de cada palabra. Sin cascadas.

**Único cambio propuesto — el inventario visible.** Hoy el N1 ofrece las etiquetas finas
del banco (Artículo, Demostrativo, Posesivo, Cuantificador, Relativo…). El libro de
1.º ESO enseña **9 clases**: sustantivo, adjetivo, determinante, pronombre, verbo,
adverbio, preposición, conjunción, interjección. Propuesta: en N1 el alumno elige entre
esas 9 (más Puntuación), y la app traduce internamente:

| Etiqueta del banco | En N1 el alumno responde… |
|---|---|
| Artículo | Determinante |
| Demostrativo / Posesivo / Cuantificador / Interr.-Excl. con `función: determinante` (o `adjetivo`) | Determinante |
| Ídem con `función: pronombre` | Pronombre |
| Pronombre personal | Pronombre |
| Relativo (`función: pronombre/determinante`) | Pronombre / Determinante |
| Relativo (`función: adverbio`) | Adverbio |
| Conector discursivo, Marca.Imp., Marca.Pas.Ref. | **No aparecen**: los textos de N1 se seleccionan sin estos fenómenos |

Ventaja pedagógica: un alumno de 1.º ESO no debe distinguir «cuantificador» de
«artículo» — debe consolidar la muralla determinante/pronombre, que es exactamente lo
que su libro le pide.

## 3. Nivel 2 · Análisis (3.º–4.º ESO) — el puente, categoría a categoría

El nivel del «análisis completo de la ESO»: incluye lo que en 2.º Bach «se da por
sabido» **y también lo que la PAU ya no pregunta** (subclases semánticas del sustantivo,
cercanía del demostrativo…). Parte del `eso34` actual con estas correcciones:

| Categoría | Pasos del N2 | Cambios vs. `eso34` actual |
|---|---|---|
| **Sustantivo** | común/propio → contable/no contable → individual/colectivo → concreto/abstracto → género → número | Ninguno (correcto: es EL contenido de la ESO; la PAU luego lo recorta, ver N3) |
| **Adjetivo** | **clase (calificativo/relacional)** → género → número → grado *(solo si calificativo)* | ➊ AÑADIR clase: hoy `eso34` no la pregunta pero pide *grado* a todos — **incoherencia**: los relacionales no tienen grado (NGLE y cuadro PAU) |
| **Artículo** | determinado/indeterminado → género (con **neutro *lo***) → número → **contracta (al/del)** | ➋ AÑADIR neutro y contracta (contenido ESO; el «contracto» es además dato PAU) |
| **Pronombre personal** | persona → número → tónico/átono | Ninguno |
| **Demostrativo** | función (det./pron.) → **cercanía (este/ese/aquel)** → género (con neutro) → número | ➌ AÑADIR cercanía: contenido de 1.º-3.º ESO, coste bajísimo |
| **Posesivo** | función (det./adj.) → persona → **un/varios poseedores** → número | ➍ AÑADIR poseedores (distinción clásica ESO y dato exigido en PAU) |
| **Cuantificador** | tipo (numeral/indefinido) → subclase → función sintáctica | Ninguno |
| **Relativo** | función (pronombre/determinante/adverbio) | ➎ AÑADIR (hoy sin cascada): se enseña en 4.º ESO y prepara las compuestas |
| **Interr./Exclamativo** | tipo (interr./excl.) → función (det./pron./adv.) | ➏ AÑADIR (hoy sin cascada) |
| **Verbo** | perífrasis (¿sí/no? → tipo) → conjugación → persona → número → tiempo → modo → **aspecto** → **voz (activa/pasiva)** | ➐ AÑADIR aspecto (4.º ESO). ➑ **CORREGIR el paso voz**: hoy solo ofrece «activa» (no discrimina nada); debe ofrecer activa/**pasiva** — la pasiva perifrástica *ser + participio* se analiza como **voz pasiva del verbo**, NO como clase de perífrasis (así lo hace el documento PAU: *«haya sido agredido … voz pasiva»*). Coherencia directa con el módulo de Sintaxis (C. Agente) |
| **Adverbio** | tipo semántico | Ninguno |
| **Preposición** | simple / locución prepositiva | Ninguno |
| **Conjunción** | coordinante/subordinante → clase | Ninguno |
| **Conector discursivo** | tipo (aditivo, contraste, consecutivo…) | Ninguno |
| **Interjección** | propia/impropia → expresiva/apelativa | Ninguno |
| **Marca.Imp. / Marca.Pas.Ref.** | reconocimiento de la marca | Ninguno |

## 4. Nivel 3 · PAU (Bachillerato) — la receta oficial, categoría a categoría

Redefinición del actual `maestro` según el documento «MORFOLOGÍA PAU». Regla de oro:
**se pregunta exactamente lo que la receta PAU enumera, en su orden — ni más ni menos.**

| Categoría | Receta PAU (pasos del N3) | Notas del documento oficial |
|---|---|---|
| **Sustantivo común** | tipo (común) → género → número | Sin subclases semánticas (contable/colectivo/abstracto NO se piden) |
| **Sustantivo propio** | tipo (propio) — **y nada más** | «hay que indicar exclusivamente la categoría gramatical y el tipo» |
| **Adjetivo calificativo** | clase → género → número → **grado** → **terminación (una/dos/invariable)** | Terminación = atributo NUEVO del banco. Truco del doc: los de una terminación cambian en plural (*feliz/felices*); los invariables no (*gratis*) |
| **Adjetivo relacional** | clase → género → número → terminación | Sin grado (los relacionales no se gradúan) |
| **Demostrativo/Posesivo/ Cuantificador pospuestos** | «adjetivo, demostrativo/posesivo/cuantificador…» + género → número (+ poseedores y persona si posesivo) | El doc los analiza como **adjetivos** con receta propia; ordinales, fraccionarios y multiplicativos son SIEMPRE adjetivos |
| **Determinantes** (artículo, dem., pos., cuant., interr./excl. antepuestos) | **definido / cuantificador** → tipo → género → número → *(+ «contracto» si al/del; + poseedores y persona si posesivo; «posesivo relativo» para cuyo)* | Taxonomía PAU: DEFINIDOS = artículo (det./indet.), demostrativos, posesivos (incl. *cuyo*); CUANTIFICADORES = universales, indefinidos, numerales cardinales, interrogativos/exclamativos |
| **Pronombre personal** | tipo (personal) → persona → género (m/f/**neutro**) → número → tónico/átono | «SEIS aspectos, en este orden». Los átonos funcionan como CD/CI; los tónicos como sujeto/término |
| **Demás pronombres** (dem., cuant., relativos, interr./excl.) | tipo (si cuantificador, subtipo) → género → número | «CUATRO aspectos». Neutros *esto/eso/aquello*; *alguien/nadie* masculinos, *algo/nada* neutros; como pronombres numerales SOLO los cardinales (ordinales etc. = adj. sustantivados) |
| **Verbo en forma personal** | *(lema: «verbo X», ver nota a)* → forma personal → conjugación → persona → número → tiempo → modo → **aspecto (opcional)** → **voz (activa/pasiva)** | El doc: aspecto «*no es obligatorio en PAU; si tienes dudas, mejor no lo pongas, no penalizará*». Voz pasiva = *ser + participio* (*haya sido agredido… voz pasiva*) |
| **Verbo en forma NO personal** | forma no personal → infinitivo/gerundio/participio → **simple/compuesto** | Simple/compuesto = dato NUEVO (*lograr* vs. *haber logrado*; *estudiando* vs. *habiendo llegado*) |
| **Perífrasis verbal** | perífrasis de infinitivo/gerundio/participio → clase (modal: obligación/probabilidad/capacidad; tempoaspectual: incoativa/terminativa/reiterativa…) → **análisis completo del auxiliar** (receta de forma personal) | El cuadro del doc coincide casi al 100 % con la cascada actual de la app (buena noticia). Gerundio y participio son siempre tempoaspectuales |
| **Adverbio** | solo la clase (cantidad, lugar, tiempo, aspecto, modo, afirmación, negación, duda) | «De un adverbio hay que decir: SOLO la clase» — coincide con la app |
| **Preposición** | solo la categoría | «basta con indicar» que lo es |
| **Conjunción** | coordinante/subordinante → clase | ⚠ **No aparece en el documento PAU** — se mantiene la pauta del libro de 1.º Bach (ver pregunta abierta 3) |
| **Interjección** | propia/impropia → apelativa-directiva / expresiva-sintomática | Coincide con la app |
| **Conector discursivo** | tipo | Alimenta la pregunta de cohesión del comentario |
| **Marcas (se)** | reconocimiento | Coherencia con Sintaxis (pasiva refleja / impersonal) |
| **⭐ Locuciones** *(transversal, nuevo)* | clase: nominal/sustantiva · adjetival · verbal · adverbial · pronominal · preposicional · conjuntiva · interjectiva | Página propia en el doc PAU (8 clases con ejemplos). Requiere tokens multipalabra etiquetados como locución en el banco |
| **⭐ Formación de palabras** *(transversal, nuevo)* | procedimiento: simple / derivada / compuesta / parasintética *(extensible: sigla, acrónimo, préstamo)* | No está en este doc (que cubre el análisis categorial) pero SÍ en el modelo PAU (pregunta 4b: constituyentes + procedimiento). Atributo opcional `formacion`, etiquetado progresivo |

**Notas de implementación (solo contenido, sin evaluación):**

- **(a) El lema del verbo** («verbo *arrancar*»): la receta PAU empieza nombrando el
  infinitivo. Una cascada de opciones no puede «preguntar» un lema en abierto; se
  propone **mostrarlo** en el enunciado del paso («Analiza el verbo *arrancar*: …»)
  o como opción múltiple sencilla. Decisión de diseño para la fase de implementación.
- **(b) Terminación del adjetivo** y **simple/compuesto de las formas no personales**:
  dos atributos nuevos del banco, deducibles casi siempre de la propia palabra —
  etiquetado barato, incluso automatizable con revisión.
- **(c) La respuesta PAU es una enumeración ordenada**: la cascada ya la reproduce; al
  final del análisis de cada palabra puede mostrarse la «respuesta PAU» completa en una
  línea (*«tu: determinante, definido, posesivo, un poseedor, femenino, singular,
  segunda persona»*) como modelo de lo que escribirían en el examen. Refuerzo gratuito.

## 5. Los textos también escalan

- **N1**: oraciones/textos sin relativos, sin conectores discursivos, sin *se* pasivo o
  impersonal, sin perífrasis rebuscadas.
- **N2**: textos con el repertorio ESO completo (perífrasis modales y aspectuales,
  relativos, conectores).
- **N3**: textos tipo PAU (editoriales, ensayo divulgativo) ricos en: pasivas
  (voz pasiva), perífrasis de probabilidad, *que* conjunción vs. relativo, *como/cómo*,
  *se* en sus valores, adjetivos relacionales vs. calificativos, **locuciones** de
  varias clases, y palabras derivadas/compuestas jugosas etiquetadas con `formacion`.

## 6. Resumen de cambios respecto al código actual

| | Se mantiene | Se corrige | Se añade | Se quita |
|---|---|---|---|---|
| **N1** (`aprendiz`) | Mecánica solo-categoría | — | Inventario reducido a las 9 clases + traducción interna | Etiquetas finas visibles |
| **N2** (`eso34`) | La mayoría de cascadas | Grado solo a calificativos (➊); paso voz con activa/**pasiva** (➑) | Clase del adjetivo, neutro/contracta, cercanía, poseedores, Relativo, Interr./Excl., aspecto | — |
| **N3** (`maestro` → **PAU**) | Perífrasis (cuadro casi idéntico al doc), tiempo/modo, pronombre personal completo, adverbio-solo-clase, interjección | Voz activa/pasiva; sustantivo propio se queda en el tipo; determinantes con taxonomía definido/cuantificador | Terminación del adjetivo, simple/compuesto de formas no personales, locuciones (8 clases), formación de palabras, «respuesta PAU» en una línea | Subclases semánticas del sustantivo, cercanía, aspecto pasa a opcional |

**Nombres propuestos en la interfaz**: **«Categorías (1.º–2.º ESO)» · «Análisis
(3.º–4.º ESO)» · «PAU (Bachillerato)»**. Internamente se conservan las claves
`aprendiz/eso34/maestro`.

## 7. Preguntas abiertas para Josele (decidir antes de implementar)

1. **N1, inventario reducido**: ¿de acuerdo con que el alumno de 1.º-2.º ESO responda
   «Determinante»/«Pronombre» genéricos (la app traduce), o mantener las etiquetas finas?
2. **Posesivo pospuesto en N1** (*el libro mío*): ¿«Determinante» (simplificación
   asumible) o «Adjetivo» (más fiel a la receta PAU, que lo analiza como adjetivo)?
3. **Conjunciones en N3**: no aparecen en el documento PAU. ¿Las mantenemos con la
   pauta del libro (coordinante/subordinante + clase) o las dejamos en solo-categoría
   como las preposiciones?
4. **Aspecto en N3**: el doc dice «no obligatorio, no penaliza». ¿Lo preguntamos como
   paso normal, lo marcamos como «opcional» visible, o lo omitimos? (En N2 sí entra
   como contenido de 4.º ESO.)
5. **Locuciones**: exigen etiquetar tokens multipalabra en el banco (hoy cada token es
   una palabra; solo Preposición tiene «locución prepositiva»). ¿Confirmas que merece
   el trabajo de banco? Es página propia del doc PAU, así que parece que sí.
6. **Formación de palabras**: ¿confirmas el enfoque de atributo opcional (`formacion`)
   con etiquetado progresivo del banco?

## 8. Encaje técnico (nota breve, sin evaluación)

- Los tres niveles siguen siendo **vistas sobre el mismo banco**
  (`getCascadeForNivel(cat, nivel)` ya existe). Sin migración de lo existente.
- Atributos nuevos del banco (aditivos, opcionales): `terminacion` (adjetivos),
  `np_forma` simple/compuesta (formas no personales), `voz` pasa a tener valor
  «pasiva» real, `formacion`, y el etiquetado de locuciones multipalabra (el
  tokenizador del banco ya admite tokens multipalabra en otros módulos).
- El mapeo N1 (etiqueta fina → clase genérica) es una función pura de
  `(cat, atrs.función)`.
- La «respuesta PAU» en una línea (nota c del §4) se genera sola a partir de los pasos
  respondidos — no exige datos nuevos.
- **Todo lo relativo a puntuación/ponderación queda explícitamente fuera**; se
  abordará cuando Josele valide los contenidos (siguiente fase, plan de implementación
  para Sonnet).
