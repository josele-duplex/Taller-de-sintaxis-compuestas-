# La Fábrica de Palabras — plan de producto y especificación
## Nuevo módulo de formación de palabras + transposición del método «descubrimiento → manipulación → etiqueta» a la app

**v1.0 · 30 de julio de 2026 · Estado: propuesta para decisión de Josele**

> **Qué resuelve.** Hoy la app es *etiqueta-first*: todos sus modos presuponen que el alumno ya conoce el repertorio de etiquetas, y por eso el plan de integración app↔aula la deja entrar solo *después* de la fase de etiqueta de cada UD. Además, la app no cubre formación de palabras — el único bloque D de la 1.ª evaluación de 1.º y 3.º ESO. Este plan mata los dos pájaros con un solo módulo: **La Fábrica de Palabras**, el primer modo de la app construido *desde* el método del aula, no adaptado a posteriori.
>
> **Fuentes usadas** (leídas, no de memoria): `marco_teorico_didactico.md` del proyecto de Lengua (síntesis de Camps/Zayas SDG, Rodríguez Gonzalo, Jones-Myhill-Bailey 2013, Mustafa & Al-Bajalani 2024, LOMLOE Murcia); las UD reales `Gramatica_01…1ESO` («La palabra bajo la lupa») y `Gramatica_01…3ESO` («La fábrica de palabras»); `Banco_reflexion_metalinguistica.md` (patrón "se evalúa la prueba, no la etiqueta" ya adaptado a ítem autocorregible); `arquitectura.md` y `Investigación_evaluación.md` de este repo.

---

## 0. La tesis de producto (lo que decidiría un desarrollador senior)

**No construir un "reproductor de lecciones".** La clase presencial hace el descubrimiento dialogado mejor que cualquier pantalla (Vygotsky: el diálogo metalingüístico entre iguales es el motor). Lo que la app hace mejor que el aula es otra cosa: **manipulación a escala con verificación instantánea** — cien alumnos desmontando cien palabras a la vez, cada uno con feedback inmediato y con cada error registrado por categoría. El módulo debe digitalizar las fases donde la app tiene ventaja comparativa (2-observación de corpus, 3-manipulación, y la justificación de la 4) y **dejar en el aula** lo que es del aula (la pregunta-problema inicial en voz alta, la puesta en común, la construcción colectiva de la definición).

**Tres decisiones estructurales que se derivan del marco teórico:**

1. **El orden de fases se impone por diseño, no por disciplina.** En la app, cada reto tiene tres estaciones y la tercera (la etiqueta) está **bloqueada** hasta superar las dos primeras. "La etiqueta es punto de llegada" deja de ser una instrucción al profesor y pasa a ser una regla del motor.
2. **Ningún ítem de las estaciones 1-2 muestra ni pide metalenguaje.** Se puede descubrir la raíz agrupando familias y se puede distinguir flexivo de derivativo respondiendo "¿palabra nueva o la misma con un dato?" sin haber oído nunca las palabras *raíz* ni *flexivo*. Eso es exactamente lo que hacen las sesiones 1-4 de la UD de 1.º ESO — la app las sigue al pie de la letra.
3. **La etiqueta nunca puntúa sola: puntúa el par etiqueta + prueba.** Es el patrón ya especificado en `Banco_reflexion_metalinguistica.md` (diseñado para sintaxis, aquí se extiende a morfología): tras clasificar, el ítem pregunta "¿qué prueba lo demuestra?" con 1 correcta + distractores razonados con microexplicación. Se alinea literalmente con el criterio LOMLOE 9.2 ("formular generalizaciones a partir de la observación, la comparación y la transformación") y con la rúbrica del marco (se evalúa la justificación, no el acierto).

---

## 1. El módulo en una pantalla

**Nombre de cara al alumno:** 🏭 **La Fábrica de Palabras** (coincide con el título de la UD de 3.º ESO — coherencia app↔aula gratis).

**Unidad de juego: el «reto»** (equivale a un miniciclo de la SDG). Cada reto gira sobre un mini-corpus de 4-8 palabras y tiene tres estaciones que se desbloquean en orden:

| Estación | Fase del método | Qué hace el alumno | Metalenguaje visible |
|---|---|---|---|
| **1 · Observa** 🔍 | Fase 2 (observación de corpus) | Agrupar por familias, detectar el intruso, emparejar palabras que comparten "un trozo con significado" | **Ninguno** |
| **2 · Manipula** 🔧 | Fase 3 (manipulación, el núcleo) | Montar y desmontar palabras con piezas drag & drop; decidir "¿palabra nueva o la misma con un dato?"; juicios de gramaticalidad (*\*rojecer*, *\*ONGs*) | **Ninguno** (a lo sumo "pieza", "trozo") |
| **3 · Etiqueta** 🏷 | Fase 4 (formalización) | Nombrar lo ya conquistado (raíz, sufijo, flexivo…), clasificar el procedimiento **y elegir la prueba que lo demuestra** | Todo — y aquí se gana |

Al completar cada estación 3, la etiqueta descubierta se añade a la **Mesa de Herramientas** del alumno (ver §4.3): la sistematización de la Fase 4 convertida en artefacto digital acumulativo.

**Lo que queda fuera a propósito (control de alcance):** vídeos y teoría expositiva (la teoría la pone el aula y la Guía del alumno); clases de palabras (ya lo hace Maestro); la Fase 5 del método (aplicación al texto propio) — esa es del porfolio y del papel, la app solo la *recuerda* al final de sesión ("busca en tu último texto una palabra comodín y fabrícale un sustituto").

---

## 2. Tipos de ítem (catálogo cerrado, todos autocorregibles)

Cada tipo transpone un tipo de tarea del catálogo del marco (§3.3 del marco teórico). Ningún tipo nuevo sin pasar por este catálogo.

### Estación 1 · Observa (sin etiquetas)

| # | Ítem | Mecánica | Ejemplo (del banco real de las UD) |
|---|---|---|---|
| 1.1 | **Familias** | Arrastrar palabras a 2-3 cestas según compartan "trozo con significado" | *campo, acampar, campista, descampado* vs *camping, campeón* (¡trampa: campeón no es familia de campo!) |
| 1.2 | **El intruso** | Marcar la palabra que no encaja en la serie | *florero, floristería, florido, **flotador*** |
| 1.3 | **Parejas de piezas** | Emparejar palabras que comparten la misma pieza final/inicial | *panadero–zapatero* · *imposible–incapaz* |

Feedback de estación 1: nunca nombra la etiqueta. Dice "*flotador* no comparte el trozo *flor-* con las demás: empieza parecido, pero la pieza con significado es otra".

### Estación 2 · Manipula (el corazón del módulo)

| # | Ítem | Mecánica | Ejemplo |
|---|---|---|---|
| 2.1 | **Desmonta** | Cortar la palabra arrastrando tijeras entre letras (cortes canónicos del solucionario) | *extra·ordinari·a* |
| 2.2 | **Monta (la fábrica)** | Banco de piezas sueltas (raíces + afijos revueltos); construir palabras reales; las combinaciones imposibles rebotan con explicación | *des- + orden + -ado* ✔ · *des- + -ería* ✘ ("una pieza de detrás no puede ir sola con una de delante: falta la base") |
| 2.3 | **¿Nueva o la misma?** | Par mínimo morfológico; dos botones: "palabra nueva" / "la misma con un dato" | *coche→coches* (misma) vs *coche→cochecito* (nueva) — es la pregunta exacta de la Sesión 4 de la UD de 1.º ESO |
| 2.4 | **Cadena de derivación** | Ordenar una escalera de fabricación | *flor → florista → floristería* |
| 2.5 | **Juicio de gramaticalidad** | ¿Existe? ¿Está bien escrita? + elegir por qué | *\*rojecer* no existe → pista de la parasíntesis · *\*ONGs* → las siglas no pluralizan |
| 2.6 | **Caso frontera (zona gris)** ⚖ | Ítem señalado como debate: dos análisis puntúan si van con su justificación coherente | *sietemesino*: ¿compuesta o parasintética? (honestidad epistemológica de Milian: los grises se enseñan, no se maquillan) |

### Estación 3 · Etiqueta (y prueba)

| # | Ítem | Mecánica | Ejemplo |
|---|---|---|---|
| 3.1 | **Etiqueta las piezas** | Sobre la palabra ya desmontada en la estación 2, arrastrar ahora los nombres (raíz / prefijo / sufijo / flexivo / interfijo) | reutiliza el patrón drag & drop `iidd*` de compuestas |
| 3.2 | **Clasifica + prueba** | Elegir el procedimiento Y la prueba que lo demuestra (1 correcta + 2-3 distractores con microexplicación) | "*informática* es acrónimo. ¿Cómo lo sabes?" ✓ "está hecha de *trozos* de dos palabras, no de sus iniciales" · ✗ "son las iniciales de varias palabras" (sigla, la vecina confundible) |
| 3.3 | **Test rápido** | El árbol de decisión de la UD de 3.º (¿dos raíces completas? ¿solo trozos? ¿solo iniciales? ¿ya existía y se recortó?) jugado como cascada | mismo patrón de cascada que ya usa Maestro |

**Matriz de vecinos confundibles de morfología** (equivalente a la de sintaxis del banco de reflexión): flexivo↔derivativo · compuesta↔parasintética · sigla↔acrónimo · acortamiento↔abreviatura · compuesta sintagmática↔locución (solo Maestro) · familia léxica↔parecido casual (*campo/campeón*). El distractor por defecto de cada procedimiento es su vecino + la descomposición mal hecha.

---

## 3. Niveles curriculares (mismos tres niveles que Morfología)

Reutiliza la convención existente `basico/medio/avanzado` ↔ Aprendiz/ESO34/Maestro. El contenido de cada nivel es exactamente el alcance de la UD del curso correspondiente — sin inventar progresión nueva:

| Nivel | Curso ancla | Alcance (= UD fuente) | Etiquetas de estación 3 |
|---|---|---|---|
| **Aprendiz** | 1.º ESO (y repaso 2.º) | `Gramatica_01…1ESO`: raíz, familia léxica, sufijo/prefijo, derivativo vs flexivo, simple/derivada/compuesta | 7 etiquetas |
| **ESO34** | 3.º ESO (y 4.º) | `Gramatica_01…3ESO`: + interfijo, parasintética, compuesta léxica/sintagmática/culta, sigla, acrónimo, acortamiento, abreviatura, numerónimo, préstamo; trampas de norma (*\*ONGs*, *\*I.E.S.*) | ~16 |
| **Maestro** | 1.º BACH | UD-D-1B: + cultismos, **estructura secuenciada** (desmontaje por capas ordenadas: *des-[orden-ado]*, no *[des-orden]-ado*), frontera sintagma/locución/compuesto | catálogo NGLE completo |

El ítem estrella de Maestro es la **estructura secuenciada**: desmontar en el orden correcto de formación (cada corte de capa se justifica con "¿existe la forma intermedia?"). Es oro EBAU y no existe en ninguna app del mercado.

---

## 4. Las tres piezas de acompañamiento

### 4.1 Diario metalingüístico (coste bajísimo, fidelidad máxima al método)
Al cerrar cada sesión de práctica, un campo opcional de texto con la plantilla del marco: *"Antes pensaba que…, ahora he descubierto que…, y lo sé porque…"*. Se envía con las analíticas (reutiliza el patrón de la columna `Reflexion` de retos/misiones). El profesor lo ve en el informe. Es el instrumento nº 1 de la tabla de evaluación formativa del marco, gratis.

### 4.2 Reto creativo: «Fabrica tu palabra» (la gamificación pedagógica de N1 que estaba pendiente)
Producto final de la Sesión 6 de la UD de 3.º, jugable: el alumno **inventa** una palabra montándola con piezas del banco (la app conoce las piezas usadas → **valida automáticamente** que el procedimiento declarado es correcto), le escribe una definición y la guarda en su **Museo de Palabras** personal. Semiabierto pero autocorregible en lo que importa (el procedimiento); la definición no puntúa, se expone. Esto **cierra el encargo abierto "gamificación N1 pedagógica y evaluable"**: el enganche no viene de puntos sobre etiquetas, sino de coleccionar criaturas léxicas propias — y es evaluable porque el procedimiento se verifica solo.

### 4.3 La Mesa de Herramientas (sistematización digital)
Tabla personal que se rellena sola: cada etiqueta conquistada en estación 3 añade su fila (procedimiento + prueba + **el ejemplo del propio alumno**, no uno de fábrica). Exportable/imprimible → es literalmente la "carta de estudio" que piden las dos UD, generada por el uso. Vacía al empezar el curso; llena al acabarlo.

---

## 5. Arquitectura técnica (mínima novedad, máxima reutilización)

Coherente con las reglas del repo: sin frameworks, ES modules, `window.X` para onclick, un módulo nuevo `js/modules/fabrica/index.js` + pantalla `screen-fabrica`.

### 5.1 Datos — hoja nueva `Formacion_Banco`

Una fila por reto; columna `JSON_Reto` con schema **formacion v1.0**:

```json
{
  "schema_version": "1.0",
  "id": "FP_0001",
  "nivel": "basico",
  "titulo_problema": "¿Cuántas piezas esconde 'librería'?",
  "corpus": ["librería", "librero", "libreta", "libélula"],
  "items": [
    { "tipo": "intruso", "opciones": ["librería","librero","libreta","libélula"],
      "respuesta": "libélula",
      "feedback": "Empieza parecido, pero no comparte el trozo libr- ('libro')." },
    { "tipo": "desmonta", "palabra": "librería",
      "cortes": ["libr", "ería"], "tolerancia": ["libre|ría"] },
    { "tipo": "nueva_o_misma", "base": "libro", "variante": "libros",
      "respuesta": "misma", "feedback": "Solo añade un dato: cuántos." },
    { "tipo": "etiqueta_prueba", "palabra": "librería",
      "clasificacion": "derivada", "prueba_id": "PRU-DERIV-01",
      "distractores": ["compuesta", "simple"] }
  ],
  "zona_gris": false,
  "metadatos": { "origen": "UD Gramatica_01 1ESO S1", "curso_min": "1E" }
}
```

- **Solucionario canónico**: los cortes y clasificaciones se fijan según `Referencia_Morfologia_Sintaxis.md` del proyecto de Lengua; el campo `tolerancia` absorbe alomorfos y cortes alternativos aceptables; `zona_gris: true` activa la mecánica de caso frontera (2.6). **El docente valida el solucionario del lote semilla antes de publicar** — igual que con los lotes de compuestas.
- **Banco de pruebas de morfología** (`js/data/pruebas-morfologia.js`, gemelo del banco de reflexión de sintaxis): ~10 entradas reutilizables por ítem (prueba de la familia, "¿crea palabra nueva?", descomposición, forma intermedia inexistente, test sigla/acrónimo…). Anclaje por repertorio, cero trabajo por reto — el mismo modelo de anclaje ya decidido para el banco de sintaxis.
- **Validador**: un modo nuevo `formacion` de `scripts/validar-banco.mjs`, que es el validador de bancos que este repo ya tiene (Node, sin dependencias, con sus listas cerradas sincronizadas con `js/glosario/tags.js`). Comprueba: cortes que reconstruyen la palabra, etiquetas y procedimientos de lista cerrada, `prueba_id` existente, distractores ∈ vecinos confundibles. Se invoca así:

  ```bash
  node scripts/validar-banco.mjs formacion banco_export/Formacion_Banco.tsv
  ```

  > *Corrección (jul-2026, sesión F0·1).* Este apartado decía antes «validador `scripts/validate_formacion.py`, gemelo de `validate_compuesta.py`». **Ninguno de esos dos archivos existe**: no hay validadores de banco en Python en este repo (el único `.py` es `scripts/make_favicon.py`). El gemelo real es `validar-banco.mjs`, que ya tiene los modos `simples` y `compuestas` en producción. El mismo error estaba en el plan del Laboratorio y se corrigió allí igual.

### 5.2 Reutilización directa (nada de esto se escribe de cero)

| Necesidad | Ya existe | Dónde |
|---|---|---|
| Drag & drop de piezas/etiquetas | motor `iidd*` de compuestas | `js/modules/compuestas/index.js` (extraer patrón, no importar el módulo) |
| Cascadas de decisión (test rápido) | cascadas de Maestro | `js/modules/maestro/index.js` |
| Login, perfil, grupo obligatorio | login compartido | `core/profile.js`, `handleStartAll` |
| XP, rachas, misiones, ZDP | gamificación completa | `js/gamification/*` |
| Pistas y micro-lecciones | `lookupScaffold` + patrón micro-lecciones | `js/feedback/*` (nuevo `micro-lecciones-fp.js`) |
| Examen con PIN | patrón de morfología (`createExamMorfologia_`…) | `Code_v6.gs` §examen |
| Analíticas silenciosas | patrón Chispa/Sintagmas (`sendBeacon`) | GAS `saveSesion*` |
| Errores por categoría → informe | `trackError` + informe Excel | `js/feedback/tracking.js`, `teacher/informe-excel.js` |

### 5.3 Backend (GAS, siempre «Nueva versión»)

- `getRetosFormacion` (GET, filtros nivel/curso) · `createExamFormacion_` / `getExamConfigFormacion_` · `saveFormacionResult_` → hoja `Formacion_Resultados` · `saveSesionFormacion_` → hoja `Formacion_Practica_Log` · guardar diario y museo (`Reflexion`, `Palabra_Creada`).
- **De propina obligada:** al montar el panel de resultados del profesor para Formación, cerrar también el hueco ya auditado de Maestro (los datos de `Morfologia_Resultados` se guardan pero ningún panel los lee — informe 2026-07-11). Un solo panel "Resultados de Morfología y Formación" para ambos.

### 5.4 Modo examen (con las lecciones de `Investigación_evaluación.md` aplicadas desde el día 1)

Solo estaciones 2-3 (la 1 es de aprendizaje); curva dura de examen (100/40/10/0, la misma del rediseño B1-B3); sin pistas ni feedback hasta el final; **ponderación por rasgo discriminante** (los pares flexivo/derivativo y compuesta/parasintética pesan doble, como la F9 de morfología); ítems servidos en orden aleatorio por alumno; captura de errores por categoría para el Top ponderado del informe. La parte razonada en papel (⚓) sigue existiendo — este módulo cubre la parte de análisis del patrón de prueba de bloque del plan de integración.

---

## 6. Fases de construcción (estimación realista, una cosa por sesión de trabajo)

**Convención de modelo** (la misma del resto del proyecto): 🟣 **Opus** para las sesiones donde una decisión mal tomada se paga todo el curso (diseño de schema, canon lingüístico, reglas de segmentación) — piensa más, pero se hace **una vez**. 🟢 **Sonnet** para ejecución sobre un diseño ya cerrado — UI, endpoints, patrones ya probados en el repo. Ninguna fase es 100 % de un solo modelo: el criterio es *qué decisión se toma en esa sesión concreta*, no la fase entera.

| Fase | Sesión | Qué se hace | Modelo | Por qué |
|---|---|---|---|---|
| **F0** | 1 | Diseñar el **schema v1.0** de `Formacion_Banco` (campos, `tolerancia`, `zona_gris`, IDs de prueba) + el modo `formacion` de `scripts/validar-banco.mjs` | 🟣 **Opus** | Es la decisión de arquitectura de datos de todo el módulo: si el schema queda cojo, se repaga en cada lote posterior. Mismo criterio que se usó para fijar el schema 1.2 de compuestas |
| F0 | 2 | Endpoints GET del banco + hoja `Formacion_Banco` en el Sheet | 🟢 Sonnet | Ejecución directa sobre el patrón ya existente (`getOraciones`, `getOracionesCompuestas`) |
| F0 | 3 | **Lote semilla Aprendiz** (~30 retos, contenido) | 🟢 Sonnet → validado por Josele | Generación de contenido siguiendo el canon ya fijado en la sesión 1; el filtro de calidad es la validación humana, no el modelo |
| **F1** | 1-4 | Motor de estaciones 1-2: pantalla, drag & drop, feedback, XP, analíticas silenciosas | 🟢 Sonnet | Reutiliza patrones ya probados (`iidd*` de compuestas, gamificación); sin decisiones de arquitectura nuevas |
| **F2** | 1 | **Banco de pruebas de morfología** (`pruebas-morfologia.js`): las ~10 pruebas reutilizables + la matriz de vecinos confundibles y sus distractores | 🟣 **Opus** | Es contenido pedagógico de precisión lingüística, gemelo de `Banco_reflexion_metalinguistica.md` — ahí se decidió con cuidado por la misma razón: un distractor mal razonado enseña un error |
| F2 | 2-3 | Estación 3 (etiqueta + prueba), Mesa de Herramientas, diario metalingüístico | 🟢 Sonnet | Implementación de UI sobre el banco de pruebas ya cerrado en la sesión 1 |
| **F3** | 1-2 | Examen PIN, `Formacion_Resultados`, panel del profesor (+ arreglo del hueco de Maestro) | 🟢 Sonnet | Copia directa del patrón ya implementado y auditado en Morfología (`createExamMorfologia_`) |
| **F4** | 1 | Lote ESO34 (~30 retos: parasintéticas, siglas/acrónimos, trampas de norma) | 🟢 Sonnet → validado por Josele | Igual que F0-sesión 3: contenido sobre canon ya fijado |
| F4 | 2 | Reto creativo «Fabrica tu palabra» + Museo de Palabras + misiones | 🟢 Sonnet | Mecánica nueva pero de bajo riesgo (la validación del procedimiento es automática, no depende de una decisión editorial fina) |
| **F5** | 1 | **Estructura secuenciada** (orden de capas de desmontaje) + frontera sintagma/locución/compuesto + reglas de cultismos | 🟣 **Opus** | El ítem más delicado del módulo: EBAU lo penaliza si el orden de capas está mal justificado. Es la misma clase de decisión que el canon de F0-sesión 1 |
| F5 | 2-3 | Lote 1B (Maestro) + implementación de la cascada de estructura secuenciada | 🟢 Sonnet | Ejecución sobre las reglas ya fijadas en la sesión 1 |

**Total: ~13-17 sesiones de trabajo** (4 de ellas 🟣 Opus — schema, banco de pruebas, estructura secuenciada, y la validación de canon que las acompaña; el resto 🟢 Sonnet). Calendario honesto contra el curso 2026-27: F0-F2 en septiembre-octubre → 1.º ESO estrena la Fábrica como práctica **dentro de su UD de la 1.ª evaluación** (su única UD de gramática, con calendario flexible); F3 en noviembre → posible prueba de bloque con PIN en 1.º; F4 en diciembre → 3.º la usa como repaso y en recuperaciones (su UD de formación ya habrá pasado — este año 3.º llega tarde, el ciclo completo lo estrena la promoción siguiente); F5 en enero.

**Consecuencia sobre el plan de integración app↔aula:** cuando F1-F3 estén desplegadas, deja de ser cierto que "la app no cubre formación de palabras". Actualizar entonces `Plan-integracion_app-taller-sintaxis.md` §4.1/§4.3 (1.º ESO pasa de "la app espera" a "estreno con la Fábrica en la 1.ª evaluación"; el diagnóstico de 3.º gana una pata de morfología léxica).

---

## 7. Riesgos y decisiones que solo puede tomar Josele

| # | Decisión / riesgo | Propuesta del plan |
|---|---|---|
| 1 | **Canon de segmentación** (¿*niñ-o* con vocal de cierre o flexivo de género? ¿alomorfos *caza/cacería*?) | Fijar el canon una sola vez desde `Referencia_Morfologia_Sintaxis.md`; todo lo discutible → campo `tolerancia` o `zona_gris`. Josele valida el lote semilla completo antes de publicar (1 sesión suya) |
| 2 | **Riesgo de sustituir el descubrimiento del aula** | La estación 1 es *observación*, no la pregunta-problema: la app se presenta en clase SIEMPRE después del 💬 oral de apertura de la UD. Regla escrita en el plan de integración (la app nunca abre un concepto) — aquí se mantiene: abre el *reto*, no el *concepto* |
| 3 | **Alcance** (la tentación de meter teoría, vídeos, clases de palabras) | Catálogo de ítems cerrado (§2); todo lo que no esté ahí, no entra en v1 |
| 4 | ¿Dónde vive el contenido: retos genéricos o ligados a cada UD? | Genéricos por nivel (como el resto de bancos), con `metadatos.origen` apuntando a la UD fuente. El profesor filtra por nivel, no por unidad |
| 5 | **Nombre del módulo en portada** | «La Fábrica de Palabras» (coherente con la UD de 3.º). Alternativa si colisiona con Morfología en la portada: fusionarlos visualmente en una card "Palabras" con dos entradas (Clases · Fábrica) |
| 6 | Orden de prioridad contra el resto del roadmap (deuda de compuestas, lotes de exámenes de diciembre) | Este plan asume que los lotes de exámenes de la 2.ª evaluación (dic.) y la deuda de compuestas (ene-feb) **mandan** si hay conflicto de tiempo: la Fábrica se pausa tras F3 si hace falta |

---

## 8. Por qué esta propuesta gana (resumen para decidir)

1. **Cubre el único contenido del bloque D sin app** (formación de palabras) y justo en los cursos y evaluación donde la app hoy no pinta nada (1.º y 3.º ESO, 1.ª evaluación).
2. **Es la primera pieza de la app nacida del método**, no adaptada: las tres estaciones bloqueadas SON descubrimiento→manipulación→etiqueta. Si funciona, el patrón se puede retro-portar (una futura estación "¿cuántos actores pide este verbo?" antes de la fase 1 de Simples — fuera de alcance de este plan, pero el camino queda abierto).
3. **Reutiliza ~80 % de infraestructura existente** (drag & drop, cascadas, examen PIN, gamificación, analíticas, informes). Lo único genuinamente nuevo son el schema, el motor de estaciones y el banco de pruebas de morfología.
4. **Cierra tres pendientes de una tacada**: el encargo de gamificación N1 (§4.2), el panel de resultados de morfología que faltaba (§5.3) y la extensión del banco de reflexión a enunciados simplificados 1.º-2.º ESO ("¿cuál de estos cambios funciona?") que el propio banco dejaba anotada como no implementada.
5. **Evaluación defendible desde el día 1**: curva de examen, ponderación discriminante, aleatorización y registro por categoría aplican las recomendaciones del informe de evaluación online antes de que el problema aparezca.
6. **Diferencial de mercado real**: manipulación morfológica con validación de procedimiento y estructura secuenciada EBAU no existe en las apps educativas de español al uso — es la clase de pieza que da peso a la conversación con la Consejería y las editoriales.

---

*Plan de producto «La Fábrica de Palabras» · v1.0 (jul-2026) · Propuesta pendiente de decisión de Josele. Relacionado: `Plan-integracion_app-taller-sintaxis.md` y `Calendario-operativo_app-taller-sintaxis_2026-27.md` (proyecto de Lengua, documentos_base/), `Banco_reflexion_metalinguistica.md`, `roadmap.md` §3-5. Terminología NGLE del proyecto en todo el módulo (sintagma, nunca grupo; niveles basico/medio/avanzado ↔ Aprendiz/ESO34/Maestro).*
