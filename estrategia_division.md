# Estrategia de división del proyecto monolítico

> Plan estricto y paso a paso para modularizar `taller-sintaxis-v6.html` en archivos manejables
> Mayo 2026 · 15.914 líneas → estructura modular

---

## 🟢 ESTADO (actualizado mayo 2026): MIGRACIÓN COMPLETADA

Este documento se mantiene como **referencia histórica** del plan
original y como **guía futura** si en algún momento se decide partir
los dos últimos archivos grandes (`js/modules/compuestas/index.js`
con 5.355 líneas y `js/modules/sint/index.js` con 3.523 líneas).

**Lo que se hizo (Pasos 1 a 12 del plan original)**:

- ✅ `index.html` reducido de ~15.914 líneas a **1.099** (solo markup
  estático de las 12 pantallas).
- ✅ CSS extraído a `css/tokens.css`, `css/legacy.css`, `css/theme/new-ui.css`
  (~5.900 líneas en total).
- ✅ JavaScript modularizado en `js/core/`, `js/data/`, `js/glosario/`,
  `js/gamification/`, `js/feedback/`, `js/modules/{sint,compuestas,arcade,
  morph,sintagmas,maestro,teacher}/`. Total: ~16.000 líneas en docenas
  de módulos pequeños (50-1.500 líneas cada uno) + dos grandes
  pendientes de sub-partir.
- ✅ Backend GAS sin tocar: `server/Code_v6.gs` (3.851 líneas) y
  `server/Compuestas.gs` (1.798 líneas).
- ✅ Punto de entrada único: `js/app.js` orquesta los imports.
- ✅ Compatibilidad onclick="" preservada con `Object.assign(window, ...)`.
- ✅ Verificación visual y funcional pasada en todos los módulos.

**Lo que no se hizo (a propósito, esperando demanda real)**:

- 🟡 `js/modules/compuestas/index.js` no se subdividió en `state.js`,
  `validator.js`, `motor/fase*.js`, etc. (sigue siendo un solo archivo
  grande de 5.355 líneas). Funciona bien y es manejable; cuando moleste,
  el plan de la sección 9 de este documento sigue siendo válido.
- 🟡 `js/modules/sint/index.js` tampoco se subdividió (3.523 líneas).
  Mismo razonamiento.

**Tamaño total del proyecto hoy**: ~35.800 líneas (frontend + backend).
Es MÁS grande que el monolito original porque se ha añadido mucha
funcionalidad (compuestas entera, arcade con 4 modos, micro-lecciones,
gamificación, etc.), pero **mucho más manejable** por estar repartido.

---

## 1. Filosofía de la migración

**Sin sobre-ingeniería.** No vamos a meter React, ni Vite, ni TypeScript, ni un bundler complejo. La app funciona como SPA estática sin servidor y queremos mantenerlo así. Solo dividimos.

**Conservar lo que funciona.** El monolito tiene 244 funciones globales, 4.500 líneas de CSS y 750 de HTML. Todas funcionan hoy. La división debe preservar el comportamiento exacto.

**Migración en dos fases:**
- **Fase A**: división mecánica, sin reescribir lógica. Resultado: la app funciona igual, pero el código está en N archivos.
- **Fase B**: refactorizaciones de calidad (encapsular estado, eliminar deuda, tests). Se hacen después, una a una.

**No usar bundler todavía.** Cargamos los módulos como `<script type="module">`. El navegador los resuelve. Cuando el proyecto crezca o queramos tests, ya pensaremos en Vite.

---

## 2. Árbol de carpetas recomendado

```
taller-sintaxis/
├── README.md                           ← Documentación raíz para Claude Code
├── arquitectura.md                     ← Documento de arquitectura
├── deuda_tecnica.md                    ← Bugs y deuda
├── roadmap.md                          ← Pendientes priorizados
├── estrategia_division.md              ← Este documento
│
├── index.html                          ← Punto de entrada
│
├── assets/
│   ├── fonts/                          ← Vacío por ahora (las fuentes vienen de Google)
│   └── icons/                          ← Iconos SVG si los hay
│
├── css/
│   ├── tokens.css                      ← Variables CSS globales (colores, tipos, espaciados)
│   ├── base.css                        ← Reset, body, headings, defaults
│   ├── components/
│   │   ├── buttons.css                 ← .btn, .btn-primary, .btn-secondary
│   │   ├── cards.css                   ← .card, .summary-card
│   │   ├── tokens-chip.css             ← Chips de token y de función
│   │   ├── modal.css                   ← Modales y overlays
│   │   ├── toast.css                   ← Toasts y combos
│   │   └── progress-bar.css            ← Barras de progreso
│   ├── screens/
│   │   ├── portada.css                 ← Estilos de la portada
│   │   ├── login.css                   ← Login
│   │   ├── game-sint.css               ← Pantalla del módulo simples
│   │   ├── results.css                 ← Resumen
│   │   ├── teacher.css                 ← Panel profesor
│   │   ├── arcade.css                  ← Arcade
│   │   ├── morph.css                   ← Morfología
│   │   ├── sintagmas.css               ← Sint4
│   │   ├── maestro.css                 ← Maestro
│   │   └── compuestas.css              ← TODO el CSS del módulo CP
│   ├── theme/
│   │   └── new-ui.css                  ← Estilos del theme actual
│   └── utilities.css                   ← Clases utilitarias (.text-center, .mt-2, etc.)
│
├── js/
│   ├── core/                           ← Infraestructura compartida
│   │   ├── api.js                      ← getApiUrl, fetchWithTimeout, fetchWithRetry, warmupApi
│   │   ├── audio.js                    ← playSuccess, playError, playComplete, playClick
│   │   ├── auth.js                     ← getTeacherPw, EMAIL_RE, PIN_LEN
│   │   ├── constants.js                ← DEFAULT_API_URL, claves LS_*, regex globales
│   │   ├── escape.js                   ← escHtml, escAttr (sanitización)
│   │   ├── navigation.js               ← showScreen, showPortada, goModule
│   │   └── storage.js                  ← loadProgress, saveProgress, lectura/escritura LS
│   │
│   ├── gamification/                   ← Sistema de XP, niveles, misiones
│   │   ├── levels.js                   ← LEVELS, levelFromXP
│   │   ├── xp.js                       ← awardXP, showCombo, showLevelUp
│   │   ├── streak.js                   ← updateDailyStreak, _todayStr, _isYesterday
│   │   ├── missions.js                 ← DAILY_MISSIONS_POOL, showMissionComplete
│   │   └── dashboard.js                ← showStudentDashboard, addDashboardButton
│   │
│   ├── feedback/                       ← Pistas y micro-lecciones (compartido entre módulos)
│   │   ├── micro-lecciones.js          ← MICRO_LECCIONES, ERROR_TO_LECCION
│   │   ├── micro-lecciones-cp.js       ← MICRO_LECCIONES_CP, mapeo CP
│   │   ├── pistas-sint.js              ← FEEDBACK_SINTAXIS, FEEDBACK_MORFOLOGIA
│   │   ├── pistas-cp.js                ← FEEDBACK_COMPUESTAS (a crear en Entrega 2)
│   │   ├── tracking.js                 ← _sessionFuncErrors, trackError, shouldSuggestMicroLeccion
│   │   └── pista-ui.js                 ← showPista, openMicroLeccion, closeMicroLeccion
│   │
│   ├── glosario/                       ← Glosario de funciones sintácticas
│   │   ├── data.js                     ← GLOS_DATA
│   │   ├── render.js                   ← renderGlosario, _glosNorm, _glosHighlight
│   │   └── tags.js                     ← FUNC_ORAC, CC_SUBTIPOS, FUNC_SINT, funcTagCss, tagContent
│   │
│   ├── modules/
│   │   ├── sint/                       ← Módulo de oraciones simples
│   │   │   ├── normalizer.js           ← normalizeOracion, helpers de parsing
│   │   │   ├── state.js                ← G, initState, resetSentenceState
│   │   │   ├── grammar-rules.js        ← GrammarRules, SUBFASE_CONFIGS
│   │   │   ├── scoring.js              ← ScoringEngine, WEIGHTS, FUNC_WEIGHT, calcDetailedScore
│   │   │   ├── render-phase1.js        ← renderPhase1 (verbos)
│   │   │   ├── render-phase2.js        ← renderPhase2 (sujeto)
│   │   │   ├── render-phase3.js        ← renderPhase3 (bloques de función)
│   │   │   ├── render-phase4.js        ← renderPhase4 (sintagmas)
│   │   │   ├── render-game.js          ← renderGame, dispatcher central
│   │   │   ├── results.js              ← goResults, sendPracticeAnalytics
│   │   │   ├── login.js                ← handleStart, _doHandleStart, _launchGame
│   │   │   └── index.js                ← Punto de entrada: expone API pública del módulo
│   │   │
│   │   ├── compuestas/                 ← Módulo de oraciones compuestas (CP)
│   │   │   ├── state.js                ← Estado privado (con IIFE o como ES module)
│   │   │   ├── validator.js            ← isValidEjercicio, validaciones del schema
│   │   │   ├── filtros.js              ← calcularOpcionesFiltro, aplicar filtros
│   │   │   ├── perifrasis.js           ← detectarPerifrasisAuto y helpers
│   │   │   ├── motor/
│   │   │   │   ├── fase1-verbos.js     ← onTokenClick(verbos), renderInteractTokens
│   │   │   │   ├── fase2-nexos.js     ← onTokenClick(nexos), nexoByIdx
│   │   │   │   ├── fase3-delimitar.js  ← onTokenClick(delimitar), preAsignarVerbosFase3
│   │   │   │   ├── fase4-clasificar.js ← renderRelaciones5, onRelacionClick (los 6 subpasos)
│   │   │   │   └── resumen.js          ← renderResumenHtml, redactarAnalisis
│   │   │   ├── persistencia.js         ← enviarResultadoCompuestas, construirPayloadResultado
│   │   │   ├── toast.js                ← mostrarToast (específico de CP)
│   │   │   ├── etiquetas.js            ← etiquetaTipo, etiquetaSubtipo, etiquetaFuncion, etc.
│   │   │   ├── api-pub.js              ← Define el objeto CP exportado
│   │   │   └── index.js                ← Punto de entrada del módulo CP
│   │   │
│   │   ├── arcade/                     ← Módulo arcade rápido
│   │   │   ├── state.js
│   │   │   ├── render.js
│   │   │   └── index.js
│   │   │
│   │   ├── morph/                      ← Módulo morfología básica
│   │   │   ├── state.js
│   │   │   ├── render.js
│   │   │   └── index.js
│   │   │
│   │   ├── sintagmas/                  ← Módulo sintagmas (Sint4)
│   │   │   ├── state.js
│   │   │   ├── render.js
│   │   │   └── index.js
│   │   │
│   │   ├── maestro/                    ← Módulo morfología avanzada
│   │   │   ├── state.js
│   │   │   ├── cascadas.js             ← MORPH_CASCADES_ESO34, getCascadeForNivel
│   │   │   ├── render.js
│   │   │   └── index.js
│   │   │
│   │   └── teacher/                    ← Panel profesor
│   │       ├── render.js
│   │       ├── exams.js                ← Crear/listar exámenes
│   │       ├── results-viewer.js       ← Ver resultados de alumnos
│   │       └── index.js
│   │
│   ├── data/                           ← Diccionarios y constantes pedagógicas
│   │   ├── diccionario-morfologia.js   ← DICCIONARIO_BASE_MORFOLOGIA
│   │   ├── diccionario-sintaxis.js     ← DICCIONARIO_BASE_SINTAXIS
│   │   ├── diccionario-sintagmas.js    ← DICCIONARIO_BASE_SINTAGMAS
│   │   └── haber-forms.js              ← HABER_FORMS y helpers léxicos
│   │
│   └── app.js                          ← Punto de entrada: orquestación inicial
│
├── server/
│   ├── Code_v6.gs                      ← Backend principal del GAS (módulos Sint)
│   └── Compuestas.gs                   ← Backend del módulo de compuestas
│
└── docs/
    ├── PROMPT_GENERADOR_SIMPLES.md     ← Prompt para generar oraciones simples
    ├── PROMPT_GENERADOR_COMPUESTAS.md  ← Prompt para generar oraciones compuestas
    ├── TARJETAS_DIDACTICAS_CP.md       ← Las tarjetas que envió el usuario
    └── DESPLIEGUE.md                   ← Instrucciones para desplegar el GAS
```

---

## 3. Estrategia de carga (sin bundler)

En `index.html`, los scripts se cargan como módulos ES nativos:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Taller de Sintaxis</title>

  <!-- Fuentes Google -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans...">

  <!-- CSS en orden de cascada: base → componentes → pantallas → tema -->
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base.css">

  <link rel="stylesheet" href="css/components/buttons.css">
  <link rel="stylesheet" href="css/components/cards.css">
  <link rel="stylesheet" href="css/components/tokens-chip.css">
  <link rel="stylesheet" href="css/components/modal.css">
  <link rel="stylesheet" href="css/components/toast.css">
  <link rel="stylesheet" href="css/components/progress-bar.css">

  <link rel="stylesheet" href="css/screens/portada.css">
  <link rel="stylesheet" href="css/screens/login.css">
  <link rel="stylesheet" href="css/screens/game-sint.css">
  <!-- ... resto de pantallas ... -->
  <link rel="stylesheet" href="css/screens/compuestas.css">

  <link rel="stylesheet" href="css/theme/new-ui.css">
  <link rel="stylesheet" href="css/utilities.css">
</head>

<body class="theme-new-ui">
  <!-- Las 12 pantallas HTML (mismo markup que ahora) -->
  <div id="screen-loading" class="screen">...</div>
  <div id="screen-portada" class="screen active">...</div>
  <!-- ... resto ... -->

  <!-- Un único punto de entrada que importa todo lo demás -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

Y `js/app.js` orquesta:

```javascript
// Importar core en orden de dependencia
import './core/constants.js';
import './core/escape.js';
import './core/storage.js';
import './core/api.js';
import './core/auth.js';
import './core/audio.js';
import './core/navigation.js';

// Gamificación
import './gamification/levels.js';
import './gamification/xp.js';
import './gamification/streak.js';
import './gamification/missions.js';
import './gamification/dashboard.js';

// Feedback
import './feedback/tracking.js';
import './feedback/micro-lecciones.js';
import './feedback/micro-lecciones-cp.js';
import './feedback/pistas-sint.js';
import './feedback/pistas-cp.js';
import './feedback/pista-ui.js';

// Glosario
import './glosario/tags.js';
import './glosario/data.js';
import './glosario/render.js';

// Módulos pedagógicos (cada uno con su index.js)
import './modules/sint/index.js';
import './modules/compuestas/index.js';
import './modules/arcade/index.js';
import './modules/morph/index.js';
import './modules/sintagmas/index.js';
import './modules/maestro/index.js';
import './modules/teacher/index.js';

// Datos
import './data/diccionario-morfologia.js';
import './data/diccionario-sintaxis.js';
import './data/diccionario-sintagmas.js';

// Arranque
import { warmupApi } from './core/api.js';
import { showPortada } from './core/navigation.js';
import { loadProgress } from './core/storage.js';
import { addDashboardButton } from './gamification/dashboard.js';
import { initSoundBtn } from './core/audio.js';

warmupApi();
loadProgress();
addDashboardButton();
initSoundBtn();
showPortada();
```

---

## 4. Plan de migración por pasos

### Paso 1 · Preparar el repositorio

```bash
mkdir taller-sintaxis
cd taller-sintaxis
git init

# Copiar los archivos actuales
cp .../taller-sintaxis-v6.html ./index.html
cp .../Code_v6.gs ./server/Code_v6.gs
cp .../Compuestas.gs ./server/Compuestas.gs

# Copiar los documentos de contexto
cp .../arquitectura.md ./
cp .../deuda_tecnica.md ./
cp .../roadmap.md ./
cp .../estrategia_division.md ./

# Crear .gitignore
echo "node_modules/" > .gitignore
echo ".DS_Store" >> .gitignore

git add .
git commit -m "Estado inicial: monolito completo + documentación de migración"
git branch dev
```

### Paso 2 · Extraer CSS

Esto es lo más sencillo y se hace primero.

```bash
mkdir -p css/components css/screens css/theme
```

1. Crear los 18 archivos CSS vacíos según el árbol.
2. Abrir `index.html`, ir al primer `<style>` (línea 10).
3. Identificar bloques temáticos (buttons, cards, etc.) y mover cada uno a su archivo.
4. Repetir con el segundo `<style>` (línea 1.161).
5. Sustituir todos los `<style>` por los `<link rel="stylesheet">` correspondientes.
6. Verificar visualmente que la app sigue funcionando idéntica.

**Cómo identificar a qué archivo va cada bloque:**
- Si el selector empieza por `.cp-` → `compuestas.css`.
- Si empieza por `.fb-` → `feedback`.
- Si es genérico (`.btn`, `.card`) → `components/`.
- Si es de una pantalla concreta → la pantalla correspondiente.

### Paso 3 · Mover el HTML del cuerpo a `index.html`

Ya está. El HTML estático del `<body>` no se divide; se queda donde está.

### Paso 4 · Extraer las constantes y datos

```bash
mkdir -p js/core js/data
```

Crear estos archivos con `export` en cada constante:

- `js/core/constants.js` — `DEFAULT_API_URL`, claves `LS_*`, `EMAIL_RE`, `PIN_LEN`.
- `js/core/auth.js` — `DEFAULT_TEACHER_PW`, `getTeacherPw()`.
- `js/glosario/tags.js` — `FUNC_ORAC`, `CC_SUBTIPOS`, `FUNC_SINT`, `funcTagCss`, `tagContent`.
- `js/data/diccionario-morfologia.js` — `DICCIONARIO_BASE_MORFOLOGIA`.
- `js/data/diccionario-sintaxis.js` — `DICCIONARIO_BASE_SINTAXIS`.
- `js/data/diccionario-sintagmas.js` — `DICCIONARIO_BASE_SINTAGMAS`.
- `js/data/haber-forms.js` — `HABER_FORMS`.

Convertir las declaraciones globales:

```javascript
// Antes (global)
const DEFAULT_API_URL = 'https://...';

// Después (módulo)
export const DEFAULT_API_URL = 'https://...';
```

### Paso 5 · Extraer el Core (infraestructura)

Mover las funciones globales a sus archivos respectivos:

- `js/core/api.js` — `getApiUrl`, `fetchWithTimeout`, `fetchWithRetry`, `warmupApi`.
- `js/core/escape.js` — `escHtml`, `escAttr`.
- `js/core/storage.js` — `loadProgress`, `saveProgress`.
- `js/core/audio.js` — `playSuccess`, `playError`, `playComplete`, `playClick`, `_getCtx`, `_tone`, `toggleSound`, `initSoundBtn`.
- `js/core/navigation.js` — `showScreen`, `showPortada`, `goModule`.

Cada función `export function`. Cada archivo importa lo que necesita.

### Paso 6 · Extraer gamificación

- `js/gamification/levels.js` — `LEVELS`, `levelFromXP`.
- `js/gamification/xp.js` — `awardXP`, `showCombo`, `showLevelUp`, `onSentenceCompleted`.
- `js/gamification/streak.js` — `updateDailyStreak`, `_todayStr`, `_isYesterday`.
- `js/gamification/missions.js` — `DAILY_MISSIONS_POOL`, `showMissionComplete`.
- `js/gamification/dashboard.js` — `showStudentDashboard`, `addDashboardButton`.

### Paso 7 · Extraer feedback y micro-lecciones

- `js/feedback/tracking.js` — `_sessionFuncErrors`, `trackError`, `shouldSuggestMicroLeccion`.
- `js/feedback/micro-lecciones.js` — `MICRO_LECCIONES`, `ERROR_TO_LECCION`.
- `js/feedback/pistas-sint.js` — `FEEDBACK_SINTAXIS`, `FEEDBACK_MORFOLOGIA`.
- `js/feedback/pista-ui.js` — `showPista`, `openMicroLeccion`, `closeMicroLeccion`, `_pistaTimer`, `_pistaCountdown`.

### Paso 8 · Extraer el glosario

- `js/glosario/data.js` — `GLOS_DATA`.
- `js/glosario/render.js` — `renderGlosario`, `_glosNorm`, `_glosHighlight`.

### Paso 9 · Extraer cada módulo pedagógico

Empezar por **Compuestas** porque está más limpio (IIFE encapsulado):

```bash
mkdir -p js/modules/compuestas/motor
```

El IIFE de CP (líneas 12.222 - 15.886) se traduce a varios archivos pero **manteniendo el patrón de estado encapsulado**:

- `js/modules/compuestas/state.js` — el objeto `state` y sus inicializadores.
- `js/modules/compuestas/validator.js` — `isValidEjercicio`.
- `js/modules/compuestas/filtros.js` — lógica de filtros.
- `js/modules/compuestas/perifrasis.js` — `detectarPerifrasisAuto`.
- `js/modules/compuestas/motor/fase1-verbos.js` — handlers de fase 1.
- `js/modules/compuestas/motor/fase2-nexos.js` — handlers de fase 2.
- `js/modules/compuestas/motor/fase3-delimitar.js` — handlers de fase 3.
- `js/modules/compuestas/motor/fase4-clasificar.js` — fase fusionada con sub-pasos.
- `js/modules/compuestas/motor/resumen.js` — `renderResumenHtml`, `redactarAnalisis`.
- `js/modules/compuestas/persistencia.js` — envío a Sheets.
- `js/modules/compuestas/toast.js` — `mostrarToast`.
- `js/modules/compuestas/etiquetas.js` — funciones de etiquetado.
- `js/modules/compuestas/index.js` — orquesta y expone `CP` global.

Después extraer **Sint** (más grande y entrelazado):

- Empezar por las funciones puras (`normalizeOracion`, `tagContent`, etc.).
- Después el estado (`G`, `initState`).
- Después los renderers de cada fase.
- Por último el flujo de juego (`renderGame`, `goResults`).

Después los módulos pequeños (Arcade, Morph, Sintagmas, Maestro) — cada uno suele ser <500 líneas, fácil de dividir.

### Paso 10 · Punto de entrada

Crear `js/app.js` que importa todo en el orden correcto y arranca la app.

### Paso 11 · Verificación

Probar la app completa:
1. Abrir el `index.html` directamente en el navegador.
2. Si funciona, perfecto.
3. Si hay errores tipo "X is not defined", suele faltar un import.

Para servir localmente (necesario para que los módulos ES funcionen sin file://):

```bash
# Cualquiera de estos
python3 -m http.server 8000
npx serve
```

### Paso 12 · Commit y rama estable

```bash
git add .
git commit -m "Migración completa a estructura modular ES6"
git checkout main
git merge dev
```

---

## 5. Reglas de oro durante la migración

### 5.1 Una cosa a la vez

No mezclar "extraer archivo" con "refactorizar lógica". Si encuentras un bug mientras divides, anótalo en `deuda_tecnica.md` y sigue. El bug se arregla después, en otro commit.

### 5.2 Comprobar tras cada extracción

Cada vez que muevas un grupo de funciones a un archivo nuevo:
1. Recarga la app en el navegador.
2. Prueba la pantalla que más toca ese código.
3. Si funciona, `git commit`. Si no, `git checkout .` y vuelve a intentarlo.

### 5.3 Mantener los nombres tal cual

`renderPhase1`, `awardXP`, `CP.enter` siguen llamándose igual. No es momento de renombrar. Solo mover.

### 5.4 El window global sigue existiendo durante la transición

Algunas funciones del HTML estático tienen `onclick="CP.enter()"` que requieren que `CP` esté en `window`. En la primera versión modular, mantener:

```javascript
// js/modules/compuestas/index.js
import { CP } from './api-pub.js';
window.CP = CP;  // mantener compatibilidad con onclick=""
```

A futuro se migra todo a `addEventListener` y se elimina `window.CP`.

### 5.5 No mezclar refactor de IIFE a class en esta fase

El IIFE de CP funciona bien. **No** convertirlo a `class` ahora. Eso es Fase B.

### 5.6 Subir a Git frecuentemente

Cada paso completado y verificado, commit. Si en algún momento la app se rompe sin saber por qué, `git log` te devuelve al último estado bueno.

---

## 6. Lo que NO hay que hacer en la migración

1. **No introducir TypeScript.** Tentación natural; rechazarla. Es otra dependencia más, otro proceso de build, otro tipo de errores. No aporta nada que justifique el coste para este proyecto y este perfil de mantenedor.

2. **No instalar un framework (React/Vue/Svelte).** Reescribir 15.000 líneas no es modularizar. Es rehacer el proyecto. Riesgo enorme.

3. **No introducir un bundler todavía.** Vite/Rollup/esbuild son útiles cuando el proyecto crezca o cuando queramos tests reales. No al principio.

4. **No "limpiar mientras se mueve".** Comentarios que parecen sobrar, ifs que parecen redundantes — todos pueden tener una razón. Mover primero, limpiar después con conocimiento de causa.

5. **No reescribir el módulo Sint para que comparta más con CP.** Tentación de "como ahora están separados, los unifico". No. Tienen schemas distintos por buenas razones (`arquitectura.md`).

6. **No tocar el backend GAS durante la migración del frontend.** Una capa a la vez. El backend ya funciona y la migración del HTML no debería afectarle.

---

## 7. Cómo prompearlo en Claude Code

Una vez tengas Claude Code abierto en la carpeta `taller-sintaxis/`, los prompts iniciales deberían ser:

```
Estamos migrando este proyecto desde un HTML monolítico de 16k líneas
a una estructura modular ES6 sin bundler. Lee los cuatro documentos
de contexto: arquitectura.md, deuda_tecnica.md, roadmap.md y
estrategia_division.md.

Cuando los hayas leído, dime "listo" y empezaremos por el Paso 2 del
plan de migración: extraer el CSS.

Reglas durante la migración:
1. Una cosa a la vez. No mezclar extracción con refactor.
2. Tras cada paso, esperar mi confirmación de que la app sigue
   funcionando antes de continuar al siguiente.
3. No introducir TypeScript, React, ni bundlers.
4. Mantener los nombres de funciones tal cual.
5. Conservar la compatibilidad con onclick="" usando window.X.

Empieza por leer los documentos.
```

A partir de ahí, Claude Code irá ejecutando el plan paso a paso, mostrando los cambios antes de aplicarlos, y dejando commits limpios en Git.

---

## 8. Estimación realista de tiempos

- **Paso 1 (preparación)**: 30 minutos.
- **Paso 2 (CSS)**: medio día.
- **Paso 3 (HTML)**: ya está.
- **Pasos 4-8 (Core, gamificación, feedback, datos)**: 1 día.
- **Paso 9 (módulos pedagógicos)**: 1-2 días (Sint es el más grande).
- **Paso 10 (app.js)**: 1 hora.
- **Paso 11-12 (verificación y merge)**: 2 horas.

**Total**: 3 días de trabajo concentrado. Con Claude Code, probablemente 2 días reales.

Tras la migración, la app sigue funcionando exactamente igual, pero el código está dividido en ~70 archivos de 50-300 líneas cada uno. Cada uno se puede editar, leer y entender sin marearse con 16.000 líneas a la vez.

---

## 9. Checklist final

Después de la migración, verificar:

- [ ] La portada se ve igual y los iconos de módulos son los mismos.
- [ ] El login funciona (validación de email, PIN, etc.).
- [ ] El módulo Sint completa un ejercicio sin errores en la consola.
- [ ] El módulo CP completa un ejercicio sin errores.
- [ ] Los sonidos funcionan.
- [ ] El XP se incrementa al completar un ejercicio.
- [ ] El streak diario se actualiza.
- [ ] El panel del profesor abre con su PIN.
- [ ] La caja de filtros del módulo CP responde a los clicks.
- [ ] La pantalla "Ver análisis" tras un ejercicio CP muestra el texto bien.
- [ ] El envío automático a Compuestas_Resultados funciona (probar guardando un ejercicio).
- [ ] El botón "Guardar resultado" manual funciona también.

Si los 12 puntos están marcados, la migración está completa. Comienza Fase B: ahora sí, refactorizaciones de calidad.
