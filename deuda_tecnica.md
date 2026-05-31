# Bugs y deuda técnica — Taller de Sintaxis v6

> Análisis crítico del proyecto · Creado para la migración a Claude Code (mayo 2026)
> **Revisado y actualizado mayo 2026** tras completar la modularización y varias
> sesiones de desarrollo. Cada entrada lleva su estado real (✅ resuelto /
> 🟡 parcial / 🔴 pendiente).

---

## 0. Resumen del estado (lectura rápida)

**Resueltas desde la creación del documento**:
- 1.8 (mostrarToast duplicado) — resuelta con la modularización.
- 1.9 (funciones sin micro-lección) — parcialmente: Sujeto, CC Finalidad,
  CC Causa, CC Cantidad y Vocat. ya tienen lección. Faltan NP, CC Compañía,
  CC Instrumento, Mod.Or., Conector.
- 1.10 (reset `_sessionFuncErrors`) — resuelta.
- 2.1 (monolito de 16.000 líneas) — resuelta: proyecto modularizado.

**Siguen pendientes (las importantes)**:
- 1.1 embebidas, 1.2 cinco ejercicios viejos, 1.3 diagnósticos CP, 1.4
  subtipos del banco, 2.9 tests automatizados, 2.10 telemetría.

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

**Estado: 🔴 PENDIENTE (verificado mayo 2026).** `construirDiagnosticos(ej)`
sigue en `js/modules/compuestas/index.js:4566` y el código del módulo aún
menciona "fase 4" / "fase 5" (líneas ~1085, 1195, 1996, 2540). El refactor
fusionó esas fases en "Clasificar y relacionar" (paso 4 para el alumno) pero
los mensajes pueden salir con terminología incoherente.

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

**Estado: ✅ RESUELTO con la modularización.** Al extraer el JS inline del HTML
y pasar a módulos ES (strict mode), la versión duplicada desapareció:
`js/modules/compuestas/index.js` tiene una única definición de `mostrarToast`.
Ya no hay HTML monolítico con la copia sloppy.

### 1.9 Funciones sin micro-lección asignada en Sint

**Estado: 🟡 PARCIALMENTE RESUELTO (mayo 2026).**

**Ya tienen lección** (añadidas en sesiones de mayo 2026):
- `Sujeto` → lección `'sujeto'` (con prueba de concordancia, sujeto tácito,
  sujeto oracional, pasiva refleja).
- `Vocativo` / `Vocat.` → lección `'vocativo'` (función extraoracional,
  contraste con sujeto). La etiqueta canónica `Vocat.` se normalizó.
- `CC Finalidad` → lección `'cc_finalidad'`.
- `CC Causa` → lección `'cc_causa'` (con contraste C. Agente).
- `CC Cantidad` → lección `'cc_cantidad'` (adjunto vs argumento de medida).
- `PN` / `PV` → lección `'pn_pv'`.

**Siguen SIN lección propia** (van al genérico `'regimen_cc'` o a nada):
- `NP` (núcleo del predicado).
- `CC Tiempo`, `CC Lugar`, `CC Modo` (van al genérico `regimen_cc`).
- `CC Compañía`, `CC Instrumento` (van al genérico `regimen_cc`).
- `Mod.Or.`, `Conector` (las "marcas" restantes).

**Solución pendiente**: crear lecciones específicas para las CC que faltan
y para NP, Mod.Or. y Conector. No es bug de código, es contenido faltante.

**Impacto**: pedagógico, ya muy reducido respecto al estado original.

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

**Estado: ✅ RESUELTO (mayo 2026).** El monolito `taller-sintaxis-v6.html` se
modularizó por completo (ver `estrategia_division.md` y `arquitectura.md`):
- `index.html` quedó en 1.099 líneas (solo markup).
- CSS en `css/tokens.css`, `css/legacy.css`, `css/theme/new-ui.css`.
- JS repartido en `js/core`, `js/data`, `js/feedback`, `js/gamification`,
  `js/glosario` y `js/modules/*`, cargado con `<script type="module">`.

**Deuda residual** (no bloqueante): los dos módulos más grandes siguen sin
subdividirse internamente — `js/modules/compuestas/index.js` (5.355 líneas)
y `js/modules/sint/index.js` (3.523 líneas). El plan para partirlos está en
`estrategia_division.md` § 9. Se hará solo cuando moleste de verdad.

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

**Estado: 🔴 PENDIENTE.** Cero tests. Toda la verificación es manual. Sigue
siendo deuda real, ahora sobre un proyecto de ~35.800 líneas, aunque la
modularización lo ha hecho MÁS testable (cada módulo se puede importar y
probar aislado, cosa imposible en el monolito).

**Enfoque sencillo recomendado** (sin frameworks, sin npm install):
1. **Validador del banco** (Python, ampliando `scripts/validate_compuesta.py`):
   recorrer `Oraciones_Banco` y `Compuestas_Banco` y avisar de etiquetas con
   drift (`CCLugar`, `Aposición`, `CC Finalida`...) antes de que el alumno las
   encuentre.
2. **Tests del motor** (Node + `node archivo.test.js`): para funciones puras
   como `GrammarRules.applyAll`, `normalizeOracion`, `ScoringEngine.toGrade`.
   Empezar por los bugs ya conocidos (la regla del "por"/"para"). Requiere
   extraer esas funciones a su propio archivo importable.
3. **Runner mínimo** `tests/run.js` que importe los tests y cuente OK/FALLA.

NO recomendado: Jest, Vitest, Playwright (mantenimiento alto para un proyecto
sin programador dedicado).

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

## 3. Riesgos por orden de gravedad (actualizado mayo 2026)

| Riesgo | Probabilidad | Impacto | Prioridad |
|---|---|---|---|
| Romper algo sin saberlo al editar (no hay tests) | Alta | Alto | 1 |
| Despliegue erróneo del GAS (URL nueva) | Media | Alto | 2 |
| Estado global de Sint contaminado entre ejercicios | Baja | Medio | 3 |
| Bug del banco con embebidas (datos malformados) | Media | Bajo | 4 |
| Regresiones al limpiar código muerto (fase 0/4 antiguas) | Baja | Bajo | 5 |

> El riesgo "conflictos de merge al modularizar" desapareció: la
> modularización ya está hecha.

---

## 4. Refactorizaciones urgentes recomendadas

### 4.1 ~~PRIORIDAD MÁXIMA — Modularizar el archivo~~ ✅ HECHO

Completado en mayo 2026. Ver `estrategia_division.md` y `arquitectura.md`.

### 4.2 ALTA — Crear tests mínimos (ver 2.9)

🔴 Pendiente. El enfoque sencillo (validador del banco + tests de funciones
puras con Node, sin frameworks) está detallado en 2.9.

### 4.3 ALTA — Eliminar el CSS legacy

🟡 Parcialmente abordable. El CSS legacy ya vive aislado en `css/legacy.css`
(~1.139 líneas). Auditar clase por clase: lo que ya no se usa, fuera; lo que
sí, mover a `css/theme/new-ui.css`. Requiere pruebas visuales por especificidad.

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
