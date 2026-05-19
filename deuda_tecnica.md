# Bugs y deuda técnica — Taller de Sintaxis v6

> Análisis crítico para migración a Claude Code · Mayo 2026

---

## 1. Bugs conocidos pendientes

### 1.1 Oraciones embebidas (3+ proposiciones)

**Estado**: identificado en OC_0022 ("Hay quien piensa que el examen será difícil"), no resuelto.

**Problema**: cuando una P3 está embebida dentro de P2 (subordinación recursiva), los tokens de P3 aparecen también en los `indices` de P2 (por inclusión natural en la jerarquía). El motor de fase 3 entonces no sabe a cuál asignar el token cuando el alumno hace click.

**Decisión pendiente**: el usuario indicó que "el nexo de P3 debe estar en P3, aunque P3 esté dentro de P2". Esto implica **auditar y reconstruir el JSON** de los ejercicios con 3+ proposiciones para que los `indices` de la P más externa **excluyan** los tokens que pertenecen a una P más interna. Es trabajo de datos, no de código.

**Impacto**: medio. Afecta a pocos ejercicios pero los que afecta son los más complejos pedagógicamente.

### 1.2 Cinco ejercicios viejos sin `analisis_interno`

OC_001, OC_002, OC_003, OC_004, OC_005 son del lote más antiguo y tienen un formato de ID no estandarizado (3 dígitos en vez de 4) y carecen del campo `analisis_interno` en sus proposiciones.

**Impacto**: bloquea la Entrega 4 (análisis interno de proposiciones) para esos 5 ejercicios. El 92% restante del banco sí lo tiene.

**Solución**: añadir `analisis_interno` manualmente o regenerarlos. Trabajo de una tarde.

### 1.3 Diagnósticos del resumen interpretativo desactualizados

La función `construirDiagnosticos(ej)` en CP sigue hablando de "fase 4" y "fase 5" como si fueran pasos separados, pero el refactor de Entrega 3 las fusionó en una sola fase llamada "Clasificar y relacionar". Los mensajes salen incoherentes.

**Impacto**: bajo. No rompe la app, solo confunde al alumno con terminología obsoleta.

### 1.4 Banco con subtipos faltantes (~12)

El banco de compuestas no tiene ejemplos de varios subtipos:
- Subordinadas sustantivas: aposición, atributo (poquísimos ejemplos).
- Subordinadas adverbiales propias: temporal, final, locativa, modal.
- Coordinadas: explicativa, distributiva, ilativa coord.
- Relativas: semilibre.

**Impacto**: pedagógico. El alumno no puede practicar esos subtipos.

### 1.5 La fase 0 fue eliminada pero queda código muerto

Tras eliminar la fase 0 ("Lectura") del flujo, quedaron varias condiciones en el código del estilo `if(fase === 0) {...}` que ya nunca se ejecutan. No causan errores pero confunden al leer.

**Impacto**: nulo en runtime, alto en mantenibilidad. Hay que limpiarlas.

### 1.6 La función `goResults()` tiene una rama legacy a `eng.fase === 4`

Tras eliminar la fase 4 antigua de CP y mover todo a la fusionada (fase 5 interna mostrada como paso 4 al alumno), el código de `avanzarFase()` aún tiene un `case` para `fase === 4` que es código defensivo. No es bug pero sí ruido conceptual.

### 1.7 Falta auditar duplicación de subtipo en proposiciones coordinadas

Las proposiciones coordinadas en el JSON tienen `subtipo: null` y el subtipo real vive en la relación. El helper `subtipoCorrectoDePropos(p, ej)` lo resuelve, pero hay rincones del código que aún acceden directamente a `p.subtipo` sin pasar por el helper. Riesgo de regresión si alguien edita esas zonas sin saber.

### 1.8 Definición duplicada de `function mostrarToast` dentro del IIFE de CP

**Estado**: detectado durante la migración (Paso 9.1, mayo 2026).

**Problema**: el IIFE de CP en `index.html` declara `function mostrarToast(...)` dos veces (líneas 10793 y 10831). En sloppy mode (donde corre el `<script>` actual) el hoisting hace que la segunda definición sobreescriba a la primera, así que el código en runtime usa siempre la segunda. En strict mode (ES modules) sería un `SyntaxError`.

**Solución provisional**: en el módulo extraído `js/modules/compuestas/index.js` se eliminó la primera definición (líneas 10788-10817 del original, incluyendo su docstring). Comportamiento en runtime idéntico al original. El `index.html` no se ha modificado todavía (sigue con las dos copias hasta el Paso 10).

**Acción pendiente**: cuando se elimine el JS inline del HTML en el Paso 10 esta deuda desaparece sola, porque ya no quedará la versión sloppy con el duplicado.

**Impacto**: nulo en runtime, bloqueador para la modularización si no se elimina una de las dos.

### 1.9 Funciones sin micro-lección asignada en Sint

**Estado**: detectado en revisión de mayo 2026 (post-Fase 1.2 CP). El usuario recordaba que las micro-lecciones no saltaban como esperaba; investigando se vio que la lógica del umbral (3 errores) funciona, pero varias funciones no tienen entrada en `ERROR_TO_LECCION` y por tanto NUNCA disparan micro-lección por mucho que el alumno se equivoque.

**Funciones SIN lección asignada** (en `js/feedback/micro-lecciones.js → ERROR_TO_LECCION`):

- `Sujeto` (la más sangrante: es donde el alumnado se equivoca más).
- `NP` (núcleo del predicado).
- `CC Cantidad`, `CC Compañía`, `CC Finalidad`, `CC Instrumento` (solo CC Tiempo/Lugar/Modo/Causa tienen `regimen_cc`).
- `Mod.Or.`, `Vocat.`, `Conector` (las "marcas").

**Funciones que SÍ están mapeadas correctamente**: CD, CI, C.Ag., Marca.Pas.Ref., Marca.Imp., Atr., CPvo, PN, PV, C.Rég., CC Tiempo/Lugar/Modo/Causa, CC.

**Solución pendiente**: crear contenido didáctico (concepto + 2-3 quizzes) para una nueva micro-lección `'sujeto'` que aborde la prueba de la concordancia, sujetos tácitos, impersonales y los principales errores tipo "Sujeto vs CD". Después, añadir `'Sujeto': 'sujeto'` a `ERROR_TO_LECCION`. Lo mismo para NP y las CCs faltantes.

**Impacto**: pedagógico. El alumno que falle 30 veces en Sujeto nunca recibirá la lección de refuerzo. No es un bug de código sino de contenido faltante.

### 1.10 Regresión de migración: reset de `_sessionFuncErrors` no funcionaba

**Estado**: detectado y CORREGIDO en mayo 2026.

**Problema**: tras la modularización, `_sessionFuncErrors` se convirtió en variable privada del módulo `js/feedback/tracking.js`. Sint en `initState` seguía haciendo `_sessionFuncErrors = {};`, pero esa línea ya no tocaba el contador real — silenciosamente creaba `window._sessionFuncErrors = {}` que no afectaba a tracking.js. Resultado: los errores acumulados de una práctica seguían contando en la siguiente, y la lógica del módulo `count % ML_THRESHOLD === 0` podía dar resultados extraños.

**Fix aplicado**:
- `tracking.js` exporta nueva función `clearSessionFuncErrors()` que reinicia el contador privado.
- `js/modules/sint/index.js` en `initState()` llama a `clearSessionFuncErrors()` (con `typeof === 'function'` para no romper si el módulo de feedback aún no ha cargado).
- Verificado en el navegador: tras reset, count=0 y micro-lección NO se sugiere; al 3er error fresco vuelve a sugerirse correctamente.

---

## 2. Deuda técnica estructural

### 2.1 Archivo monolítico de 16.000 líneas

**El problema más grande del proyecto.** Todo está en un único `taller-sintaxis-v6.html`:
- 4.500 líneas de CSS.
- 750 líneas de HTML estático (las 12 pantallas).
- 10.500 líneas de JavaScript.

Consecuencias:
- Búsqueda lenta y propensa a errores.
- Imposible aplicar herramientas de linting / formateo automático efectivamente.
- Cualquier cambio toca el archivo entero. Los conflictos de Git son inmanejables si dos personas editan a la vez.
- Claude (web) tarda en cargarlo en contexto.
- Las dependencias entre funciones son invisibles: ¿quién llama a `awardXP`? Hay que hacer grep.

**Solución**: la migración a Claude Code es la oportunidad perfecta. El plan está en `estrategia_division.md`.

### 2.2 Estado global descontrolado

La variable `G` del módulo Sint se modifica desde decenas de sitios sin pasar por un setter. Cualquier función puede hacer `G.fase = 2` directamente. No hay manera de saber, leyendo una función, qué partes del estado modifica.

Igual con `_practiceAnalyticsSent`, `_audioCtx`, `_soundOn`, `_pistaTimer` (booleanos y timers globales sueltos).

**El módulo CP es la excepción**: su estado está encapsulado en el IIFE y solo se accede a través del API público. Sirve de modelo a seguir.

### 2.3 Dos sistemas CSS coexistiendo (legacy + new-ui)

El primer bloque CSS (líneas 10-1.154) es del diseño antiguo. El segundo (1.161-4.544) es el actual "new-ui". Cuando se introdujo new-ui, no se borró el antiguo: se le añadió la clase `.theme-new-ui` al `<body>` y se hicieron selectores más específicos.

Resultado: hay reglas legacy que aún se aplican por especificidad y otras que están sobreescritas pero presentes "por si acaso". Borrar el bloque legacy sin pruebas exhaustivas rompe partes random de la UI.

### 2.4 Variables CSS no centralizadas

Hay valores hardcoded en muchos sitios:
- Colores violetas residuales del rediseño no completado (`#7C3AED`, `#A78BFA`, `#EDE9FE`...) en módulos que **no son CP**. Estos hay que dejarlos: son del módulo de simples.
- Pero hay 4 sitios donde el navy de CP se escribió a mano (`#0F2342`) en lugar de usar `var(--cp-marca)`. Si se cambia el color de marca, hay que buscar y reemplazar.

### 2.5 Schemas de datos divergentes

El banco de **simples** y el banco de **compuestas** usan schemas radicalmente distintos:
- Simples: 8 columnas planas con `Estructura_JSON` (array de bloques funcionales).
- Compuestas: 10 columnas con `JSON_Compuesta` (objeto con tokens, proposiciones, nexos, relaciones).

No son intercambiables. Cada motor necesita su propio normalizer (`normalizeOracion()` para Sint, `isValidEjercicio()` para CP).

**Pero**: cada proposición de compuestas tiene `analisis_interno` con un schema parecido al de simples. Esto es el "puente" para futuras compatibilidades.

### 2.6 Funciones de gran tamaño

Algunas funciones son demasiado largas para mantener cómodamente:
- `renderRelaciones5` (CP) tiene ~250 líneas y mezcla 6 sub-pasos en una sola función con muchos `if` anidados.
- `renderPhase3` (Sint) tiene ~200 líneas.
- `onClasifClick` (CP) tiene ~120 líneas con 3 `if` grandes (tipo / familia / subtipo).
- `redactarAnalisis` (CP) ~150 líneas.

Refactorizables a varias funciones más pequeñas siguiendo el patrón `render<SubPaso>(ej, resp)` y `on<SubPaso>Click(v)`.

### 2.7 Comentarios mezclados con código de depuración

Muchas funciones tienen `console.warn` o `console.log` de cuando se depuró un bug. Algunos importantes (para diagnóstico de red), otros olvidados. Conviene una pasada para clasificarlos: dejar los importantes con prefijo `[CP]` y eliminar el resto.

### 2.8 Dependencias implícitas entre módulos

El módulo CP llama a `playSuccess()`, `awardXP()`, `trackError()` del Core. Si alguien refactoriza esos nombres en el Core sin avisar, CP se rompe **silenciosamente** (las llamadas están protegidas con `typeof X === 'function'`, así que no lanza error: simplemente deja de hacer la acción).

**Problema**: las protecciones defensivas (`if(typeof X === 'function')`) son una espada de doble filo. Protegen de cuelgues pero ocultan errores que deberían detectarse.

### 2.9 No hay tests automatizados

Cero. Toda la verificación es manual. Esto es **deuda técnica grave** para un proyecto de 16.000 líneas. Cualquier cambio puede romper algo lejano sin que nadie se entere hasta que un alumno lo encuentra.

Mínimo viable a futuro: tests de integración del motor de CP (simular un flujo completo) y validaciones de schema del banco.

### 2.10 Logs y telemetría limitados

La aplicación no registra qué hace el alumno con suficiente detalle para diagnosticar problemas a posteriori. Solo guarda el resultado final por ejercicio (aciertos/errores totales). Si un alumno reporta "se atascó en fase 3", no hay forma de reconstruir qué hizo exactamente.

A futuro: añadir un log evento-por-evento (token clicado, opción seleccionada) que se envíe junto al resultado final.

### 2.11 Frontend acoplado al backend

El cliente conoce demasiados detalles del backend: nombres exactos de acciones (`saveResultadoCompuestas`), formato de respuesta esperado, estructura del payload. Si el backend cambia algo, el cliente se rompe.

A futuro: una capa intermedia (`api.js`) que abstraiga el cliente del formato del GAS.

### 2.12 El despliegue del GAS es manual y propenso a error

Cada vez que se modifica el GAS hay que:
1. Pegar el código.
2. **No usar "Nueva implementación"** (genera URL nueva y rompe la app).
3. Usar "Gestionar implementaciones → editar → Nueva versión".

Es un proceso muy fácil de equivocarse. No hay automatización ni CI.

---

## 3. Riesgos por orden de gravedad

| Riesgo | Probabilidad | Impacto | Prioridad |
|---|---|---|---|
| Romper algo sin saberlo al editar (no hay tests) | Alta | Alto | 1 |
| Conflictos de merge al modularizar el archivo | Alta | Medio | 2 |
| Despliegue erróneo del GAS (URL nueva) | Media | Alto | 3 |
| Estado global de Sint contaminado entre ejercicios | Baja | Medio | 4 |
| Bug del banco con embebidas (datos malformados) | Media | Bajo | 5 |
| Regresiones al limpiar código muerto (fase 0/4 antiguas) | Baja | Bajo | 6 |

---

## 4. Refactorizaciones urgentes recomendadas

En orden, antes de añadir más features:

### 4.1 PRIORIDAD MÁXIMA — Modularizar el archivo

Imprescindible antes de seguir desarrollando. Ver `estrategia_division.md`.

### 4.2 ALTA — Crear tests mínimos del motor de CP

Aunque sean tests manuales escritos paso a paso ("dado este JSON, simula estos clicks, verifica que la respuesta es correcta"), tener algo es infinitamente mejor que nada.

### 4.3 ALTA — Eliminar el CSS legacy

Auditar el primer bloque CSS (1.154 líneas) clase por clase. Lo que ya no se usa, fuera. Lo que sí se usa, mover al sistema new-ui.

### 4.4 MEDIA — Limpiar código muerto

Eliminar las ramas `if(fase === 0)` y `if(eng.fase === 4)` que ya no se ejecutan, junto con las funciones que ya no se llaman.

### 4.5 MEDIA — Centralizar constantes hardcoded

Crear un módulo `constants.js` con todos los valores que aparecen repetidos: URLs, claves de localStorage, regex, dominios de email, colores principales.

### 4.6 MEDIA — Adoptar el patrón IIFE del módulo CP en todos los módulos

Sint, Arcade, Morph, Maestro siguen usando estado global. Encapsularlos como hace CP elimina contaminación cruzada.

### 4.7 BAJA — Capa de API abstraída

Un `api.js` que tenga funciones tipo `api.guardarResultado(payload)` y oculte los detalles del GAS al resto del código.

---

## 5. Lo que SÍ está bien y NO hay que tocar

Para que la migración no caiga en la trampa de "reescribir lo que ya funciona":

- **El IIFE del módulo CP**: patrón correcto, mantener.
- **El sistema de gamificación (XP, niveles, misiones, streak)**: funciona, se reutilizará tal cual.
- **Las micro-lecciones de Sint** (`MICRO_LECCIONES`, `ERROR_TO_LECCION`, `trackError`): estructura sólida, hay que extenderla a CP, no rehacerla.
- **El sistema de audio Web Audio API**: cero dependencias, suena correcto, mantener.
- **El sistema de pistas de Sint** (`FEEDBACK_SINTAXIS` + `showPista`): bien diseñado, se reutilizará para CP.
- **El backend GAS**: bien organizado en dos archivos (Sint y Compuestas). El despliegue es manual pero el código está bien.
- **El schema de oraciones simples**: lleva meses en producción con cientos de oraciones. No tocar.
- **El schema de oraciones compuestas (con `analisis_interno`)**: bien diseñado, completar solo los huecos.
