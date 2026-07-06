# Arquitectura — Taller de Sintaxis v6

> Documento de referencia del proyecto · Actualizado mayo 2026 tras
> la modularización completa (ver `estrategia_division.md`).

---

## 1. Visión general

La aplicación es una **SPA estática modular**, sin frameworks, sin transpiladores
y sin proceso de compilación. Se carga directamente con `<script type="module">`
desde el navegador.

El proyecto se reparte en cuatro capas:

- **Frontend** — HTML mínimo + CSS + JS modular ES6.
- **Backend** — Google Apps Script sobre Google Sheets.
- **Datos** — el propio Sheet (bancos de oraciones, exámenes, resultados).
- **Documentación** — los `.md` de la raíz del repositorio.

Cero dependencias de runtime (ni jQuery, ni React, ni nada similar). Solo
APIs nativas del navegador y las fuentes de Google Fonts.

---

## 2. Estructura del proyecto

```
proyecto_taller-sintaxis/
├── index.html                          ← 1.099 líneas. Solo markup de las 12 pantallas.
├── assets/
│   ├── logo.png                        ← Logo histórico (con texto)
│   └── logo_2.png                      ← Logo activo (sin texto)
├── css/
│   ├── tokens.css                      ← Variables :root (paleta global, portada premium)
│   ├── legacy.css                      ← Sistema CSS antiguo (en convivencia controlada)
│   └── theme/new-ui.css                ← Sistema CSS actual (4.654 líneas)
├── js/
│   ├── app.js                          ← Punto de entrada: importa todo y expone en window
│   ├── core/
│   │   ├── api.js                      ← getApiUrl, fetchWithTimeout, fetchWithRetry, warmupApi
│   │   ├── audio.js                    ← playSuccess/Error/Complete/Click
│   │   ├── auth.js                     ← getTeacherPw, DEFAULT_TEACHER_PW
│   │   ├── constants.js                ← LS_*, EMAIL_RE, PIN_LEN, DEFAULT_API_URL, LS_PROFILE
│   │   ├── escape.js                   ← escHtml, escAttr
│   │   ├── navigation.js               ← showScreen, showPortada, goModule
│   │   ├── profile.js                  ← Perfil persistente (load/save/clear/apply/reset)
│   │   └── storage.js                  ← loadProgress, saveProgress
│   ├── data/
│   │   ├── diccionario-morfologia.js
│   │   ├── diccionario-sintaxis.js
│   │   ├── diccionario-sintagmas.js
│   │   └── haber-forms.js
│   ├── feedback/
│   │   ├── micro-lecciones.js          ← MICRO_LECCIONES + ERROR_TO_LECCION (Sint)
│   │   ├── micro-lecciones-cp.js       ← MICRO_LECCIONES_CP (Compuestas)
│   │   ├── pistas-sint.js              ← FEEDBACK_SINTAXIS, FEEDBACK_MORFOLOGIA, lookupScaffold
│   │   ├── pistas-compuestas.js        ← FEEDBACK_COMPUESTAS
│   │   ├── tracking.js                 ← _sessionFuncErrors, trackError, clearSessionFuncErrors
│   │   ├── pista-ui.js                 ← showPista, openMicroLeccion, closeMicroLeccion
│   │   └── pista-flotante.js
│   ├── gamification/
│   │   ├── levels.js                   ← LEVELS, levelFromXP
│   │   ├── xp.js                       ← awardXP, showCombo, showLevelUp, onSentenceCompleted
│   │   ├── streak.js                   ← updateDailyStreak
│   │   ├── missions.js                 ← DAILY_MISSIONS_POOL
│   │   └── dashboard.js                ← showStudentDashboard, addDashboardButton
│   ├── glosario/
│   │   ├── data.js                     ← GLOS_DATA
│   │   ├── render.js                   ← renderGlosario
│   │   └── tags.js                     ← FUNC_ORAC, CC_SUBTIPOS, FUNC_SINT, funcTagCss
│   └── modules/
│       ├── sint/index.js               ← Motor de oraciones simples (3.523 líneas)
│       ├── compuestas/index.js         ← Motor de oraciones compuestas (5.355 líneas)
│       ├── arcade/index.js             ← Arcade (4 modos: supervivencia, contrarreloj,
│       │                                   duelo fantasma, radar de errores)
│       ├── morph/index.js              ← Morfología básica
│       ├── sintagmas/index.js          ← Análisis de sintagmas (Sint4)
│       ├── maestro/index.js            ← Morfología avanzada con cascadas
│       └── teacher/
│           ├── index.js                ← Panel del profesor (frontend)
│           └── informe-excel.js
├── server/
│   ├── Code_v6.gs                      ← Backend principal (3.851 líneas)
│   └── Compuestas.gs                   ← Backend del módulo de compuestas (1.798 líneas)
└── docs/
    └── TARJETAS_DIDACTICAS_CP.md       ← Material pedagógico
```

**Tamaño total**: ~35.800 líneas (1.099 HTML + 5.902 CSS + 16.159 JS frontend +
5.649 GAS backend + documentos).

Los dos archivos JS más grandes (`compuestas/index.js` 5.355 líneas y
`sint/index.js` 3.523) siguen sin subdividirse internamente. El plan para
hacerlo en el futuro está en `estrategia_division.md` § 9.

---

## 3. Pantallas (DOM en `index.html`)

Cada "pantalla" es un `<div class="screen">` que se muestra u oculta mediante
la clase `active`. Solo una pantalla está visible a la vez. La función
`showScreen(id)` de `js/core/navigation.js` gestiona el cambio.

| ID | Propósito |
|---|---|
| `screen-loading` | Pantalla de carga inicial |
| `screen-portada` | Selector de módulos (cards Sint, Maestro, Sintagmas, Compuesta, Arcade) |
| `screen-login` | Login del alumno (nombre + email + grupo + panel dinámico por módulo) |
| `screen-game` | Motor de oraciones simples (Sint) |
| `screen-results` | Resumen tras un ejercicio de Sint |
| `screen-teacher` | Panel del profesor (con PIN) |
| `screen-arcade` | Modo arcade rápido |
| `screen-gameover` | Resultado de arcade |
| `screen-morph` | Motor de morfología |
| `screen-sintagmas` | Motor de análisis sintagmático (Sint4) |
| `screen-maestro` | Motor avanzado de morfología |
| `screen-compuestas` | Módulo de oraciones compuestas (CP) |

---

## 4. Módulos pedagógicos

### 4.1 Módulo de oraciones simples (Sint)

- **Archivo**: `js/modules/sint/index.js`.
- **Estado global**: variable `G` que se reinicializa en cada ejercicio.
- **Schema de datos**: `fase1` (verbos), `fase2` (sujeto), `fase3` (bloques
  de función sintáctica), opcionalmente `fase4` (sintagmas).
- **Flujo**: 4 fases secuenciales.
- **Funciones principales**: `normalizeOracion`, `initState`, `renderGame`,
  `renderPhase1/2/3/4`, `goResults`, `handleStartAll` (que también enruta
  al resto de módulos académicos desde el login compartido).

### 4.2 Módulo de oraciones compuestas (CP)

- **Archivo**: `js/modules/compuestas/index.js`.
- **Estado**: encapsulado dentro de un IIFE. El estado privado `state` vive
  dentro del closure.
- **Schema de datos**: `tokens`, `proposiciones`, `nexos`, `relaciones`.
  Cada proposición tiene su `analisis_interno` (sujeto, predicado, funciones).
- **Flujo**: 4 pasos visibles para el alumno (Verbos, Nexos, Delimitar,
  Clasificar y relacionar). Internamente la "fase 4 antigua" se fusionó con
  la 5; al alumno se le presenta como un solo paso 4 con sub-pasos.
- **API pública**: objeto `CP` con `enter`, `exit`, `enterDesdeLogin`,
  `iniciarExamenDesdeLogin`, `iniciarPractica`, `iniciarLectura`,
  `mostrarAyudaFiltros`, etc.

### 4.3 Resto de módulos

- **Arcade**: `js/modules/arcade/index.js`. 4 modos (Supervivencia,
  Contrarreloj, Duelo Fantasma, Radar de Errores).
- **Sintagmas (Sint4)**: `js/modules/sintagmas/index.js`.
- **Maestro**: `js/modules/maestro/index.js` (morfología, con cascadas por nivel).
- **Teacher**: `js/modules/teacher/index.js` y `informe-excel.js` (panel del
  profesor, dashboard de Compuestas, export CSV/XLSX).
- **Chispa**: `js/modules/chispa/index.js` (spot-the-function, mezcla
  Simples+Compuestas, analíticas silenciosas).
- *(Archivado jul-2026: el antiguo `morph/index.js` "Nexo Morfológico" vive en
  `js/modules/_legacy/morph/` y no se carga — ver `deuda_tecnica.md` §6.)*

### 4.4 Mapa del modo examen por módulo (estado real, jul-2026)

| Módulo | Examen | Cómo |
|---|---|---|
| Simples (Sint) | ✅ completo | PIN + grupo, curva dura 100/40/10/0, sin pistas, `saveResult` con anti-duplicado, timer |
| Compuestas (CP) | ✅ completo | Ídem (`state.modoExamen`, `Compuestas_Examenes`) |
| Subfases Solo NP / NP+Sujeto | ⚠️ engañoso | El PIN fija la subfase, pero `SUBFASE_CONFIGS[*].phases` no lo lee nadie: se juegan SIEMPRE las 3 fases y la nota pondera NP+Sujeto+Funciones ignorando la subfase. La subfase solo filtra el pool en el GAS (columna `Subfase`) |
| Maestro (morfología) | ⚠️ cosmético | Botón "Examen" sin PIN; la nota NO se envía al GAS; hay flash de acierto en pleno examen |
| Sintagmas | ➖ sin examen | A propósito (mecánica reintentar-hasta-acertar); tampoco registra nada en el backend |
| Arcade / Chispa | ➖ sin examen | A propósito (gamificación / práctica libre) |

Plan de corrección por fases: `docs/Informe_examen_modos_secundarios.md`.

---

## 5. Gestión del estado

### 5.1 Variables globales (módulo Sint)

- `G` — estado del módulo Sint (objeto que se reinicializa por ejercicio).
- `_audioCtx`, `_soundOn` — contexto de audio Web Audio API y flag de silencio.
- `selectedMode`, `selectedSubfase`, `selectedArcadeMode`, etc. — selecciones
  del login compartido.

### 5.2 Estado encapsulado (closure)

- `CP._state` — estado privado del módulo de compuestas. Solo accesible para
  depuración (`window.__CP_STATE__`).

### 5.3 localStorage (persistencia entre sesiones)

| Clave | Contenido |
|---|---|
| `taller_api_url` | URL del Google Apps Script |
| `taller_pin` | PIN del profesor cifrado |
| `taller_teacher_pw` | Password del profesor |
| `taller_progress` | Objeto con XP, nivel, streak, misiones diarias |
| `taller_sound` | true/false para activar sonidos |
| `taller_timer` | Configuración del temporizador del modo examen |
| `taller_error_history` | Contadores de errores persistentes |
| `taller_hints_practice` | 'on' \| 'off' |
| `taller_hints_exam` | 'none' \| 'first_only' |
| `taller_profile` | {name, email, grupo, savedAt} — perfil persistente (mayo 2026) |

### 5.4 Estado servidor (Google Sheets)

Datos compartidos por todos los alumnos, sincronizados vía Google Apps Script:

- `Oraciones_Banco` — banco de oraciones simples (~450 oraciones).
- `Compuestas_Banco` — banco de oraciones compuestas (~84 ejercicios).
- `Examenes_Config` — exámenes activos con PIN del módulo simple.
- `Compuestas_Examenes` — exámenes activos del módulo de compuestas.
- `Alumnos_Resultados` — resultados de los alumnos en simples.
- `Compuestas_Resultados` — **solo resultados de examen con PIN** (desde
  mayo 2026; antes mezclaba examen y práctica libre y se separó).
- `Compuestas_Practica_Log` — registros de práctica libre por ejercicio
  (nueva hoja desde mayo 2026).
- `Sesiones_Practica` — analytics de prácticas de Sint.
- `Ranking_Arcade` — leaderboard del módulo arcade.
- `Misiones` y `Misiones_Resultados` — sistema de misiones diarias.
- `Morfologia_Textos` — banco de textos de morfología.

---

## 6. Funciones core (compartidas entre módulos)

Todas las funciones del Core son `export` y se exponen en `window` desde
`js/app.js` para compatibilidad con `onclick=""` del HTML.

### 6.1 Red y backend

- `getApiUrl()`, `fetchWithTimeout()`, `fetchWithRetry()`, `warmupApi()`
  → `js/core/api.js`.

### 6.2 Enrutamiento

- `showScreen(id)`, `showPortada()`, `goModule(mod)` → `js/core/navigation.js`.

### 6.3 Perfil del alumno (mayo 2026)

- `loadProfile()`, `saveProfile({name, email, grupo})`, `clearProfile()`,
  `applyProfileToLogin()`, `resetProfile()` → `js/core/profile.js`.
- Se invoca automáticamente en `goModule()`: si hay perfil guardado, los
  inputs del login vienen pre-rellenados y aparece el banner "Hola, [nombre]".

### 6.4 Gamificación

- `loadProgress()` / `saveProgress(p)` → `js/core/storage.js`.
- `levelFromXP(xp)` → `js/gamification/levels.js`.
- `awardXP(amount, reason)`, `showCombo`, `showLevelUp` → `js/gamification/xp.js`.
- `updateDailyStreak()` → `js/gamification/streak.js`.
- `showStudentDashboard()`, `addDashboardButton()` → `js/gamification/dashboard.js`.

### 6.5 Audio (Web Audio API)

- `playSuccess()`, `playError()`, `playComplete()`, `playClick()` →
  `js/core/audio.js`. Sonidos generados con osciladores nativos.

### 6.6 Micro-lecciones y feedback escalonado

- `MICRO_LECCIONES`, `ERROR_TO_LECCION`, `ML_THRESHOLD` →
  `js/feedback/micro-lecciones.js` (Sint).
- `MICRO_LECCIONES_CP` → `js/feedback/micro-lecciones-cp.js` (CP).
- `FEEDBACK_SINTAXIS`, `FEEDBACK_MORFOLOGIA`, `lookupScaffold` →
  `js/feedback/pistas-sint.js`.
- `FEEDBACK_COMPUESTAS` → `js/feedback/pistas-compuestas.js`.
- `trackError(modo, funcion)`, `clearSessionFuncErrors()` →
  `js/feedback/tracking.js`.
- `showPista()`, `openMicroLeccion()`, `closeMicroLeccion()` →
  `js/feedback/pista-ui.js`.

### 6.7 Etiquetado de funciones sintácticas

- `FUNC_ORAC`, `CC_SUBTIPOS`, `FUNC_SINT`, `funcTagCss(label)`,
  `tagContent(label)` → `js/glosario/tags.js`.
- Convención canónica de etiquetas (NGLE/PAU Murcia): `Sujeto`, `CD`, `CI`,
  `Atr.`, `CPvo`, `C.Rég.`, `C.Ag.`, `CC Tiempo/Lugar/Modo/Causa/Cantidad/...`,
  `Marca.Pas.Ref.`, `Marca.Imp.`, `Mod.Or.`, `Vocat.`, `Conector`.

### 6.8 Auth y validación

- `EMAIL_RE` (regex: `@murciaeduca.es`, `@alu.murciaeduca.es`, `@gmail.com`),
  `PIN_LEN = 4`, `DEFAULT_TEACHER_PW`, `getTeacherPw()` → `js/core/{auth,constants}.js`.

### 6.9 Reglas de scoring (específicas de Sint)

- `GrammarRules`, `SUBFASE_CONFIGS`, `WEIGHTS`, `FUNC_WEIGHT`, `ScoringEngine`
  → declaradas en `js/modules/sint/index.js`. No reutilizables por CP
  (esquema distinto).

---

## 7. Dependencias externas

La aplicación es **prácticamente cero-dependencias**.

### 7.1 Fuentes web (Google Fonts)

- **Fraunces** — serif elegante para títulos.
- **Lora** — serif para descripciones editoriales.
- **DM Sans** — sans-serif para UI.
- **Nunito** — sans-serif legacy (body por defecto en algunos componentes).

### 7.2 APIs del navegador

- **Web Audio API** — `AudioContext`, `OscillatorNode` para sonidos.
- **localStorage** — persistencia local.
- **fetch / AbortController** — red.
- **navigator.sendBeacon** — envío no bloqueante al GAS.

### 7.3 Servidor

- **Google Apps Script** — endpoints REST sobre Google Sheets. Archivos:
  `server/Code_v6.gs` y `server/Compuestas.gs`.

### 7.4 Lo que NO se usa

- Sin React, Vue, jQuery, ni ningún framework.
- Sin bundler (no Webpack, Vite, esbuild).
- Sin TypeScript.
- Sin tests automatizados (deuda técnica conocida).
- Sin CSS preprocesador.
- Sin proceso de build.

---

## 8. Estilos visuales

### 8.1 Sistema de tokens (mayo 2026)

`css/tokens.css` declara las variables de la **paleta premium minimalista**
de la portada y login compartidos:

- `--portada-bg: #F5F1E8` (crema cálido).
- `--portada-navy: #102A43` (azul petróleo, títulos).
- `--portada-teal: #0F766E` (esmeralda, acento).
- `--portada-blue-soft: #7FA7C9` (azul suave, sintagmas).
- `--portada-card`, `--portada-border`, `--portada-muted`, `--portada-decor`.

Y los tokens generales del sistema UI: `--ui-bg`, `--ui-ink`, `--ui-teal`,
sombras navy-tinted, radii, tipografía display/body/UI, etc.

### 8.2 Theme dual (deuda técnica viva)

Conviven dos sistemas:

1. **legacy** (`css/legacy.css`, ~1.139 líneas) — sistema antiguo.
2. **new-ui** (`css/theme/new-ui.css`, ~4.654 líneas) — sistema actual,
   activado con `class="theme-new-ui"` en `<body>`.

Eliminar el bloque legacy completamente requiere auditoría caso por caso
(algunos selectores siguen aplicándose por especificidad).

### 8.3 Estética actual

**Portada y login**: estilo premium minimalista editorial (crema cálido +
petróleo + esmeralda, decoraciones sutiles, Fraunces para títulos).

**Pantallas de trabajo (game, arcade, etc.)**: estética "Bento-Neobrutalista
Refinado" — cards con bordes definidos, sombras cálidas, 11 colores
semánticos para funciones sintácticas.

---

## 9. Bucles principales y eventos

La aplicación es **dirigida por eventos** del usuario. No tiene loop tipo
videojuego. Puntos de entrada típicos:

1. **Click en módulo de la portada** → `goModule(mod)` → muestra
   `#screen-login` con el panel dinámico del módulo (excepto compuestas
   antes de mayo 2026, que saltaba directo; hoy también pasa por login).
2. **Click en "Empezar" del login** → `handleStartAll()` valida, persiste
   perfil, y enruta al módulo correspondiente.
3. **Click en token / opción** → handler específico del módulo →
   actualiza estado → llama a `renderFase()`.

El patrón es siempre: **estado se modifica → función render se llama →
DOM se reconstruye**. No hay reconciliación inteligente: `wrap.innerHTML = ...`
reemplaza el contenido entero de la zona afectada.

Los timers (modo examen, pistas con countdown) son `setInterval`/`setTimeout`
gestionados manualmente. `cleanAllTimers()` limpia en cualquier navegación.

---

## 10. Comunicación con el backend

POST/GET JSON al endpoint único:

```
https://script.google.com/macros/s/AKfyc.../exec
```

Cada petición lleva un `action` que el GAS despacha internamente. Acciones
principales:

**GET**:
- `getOraciones`, `getOracionesFiltradas` (simples).
- `getOracionesCompuestas` (compuestas).
- `getExamenCompuesta` (cargar examen con PIN).
- `getResultadosCompuestas` (panel profesor, mayo 2026).
- `getModulesEnabled`.
- `getExamConfig` (simples).

**POST**:
- `saveResultado` (resultado de simples con PIN).
- `saveResultadoCompuesta` (resultado de examen con PIN, hoja
  `Compuestas_Resultados`).
- `saveResultadoCompuestas` (resultado de práctica libre, hoja
  `Compuestas_Practica_Log` desde mayo 2026; antes pisaba la de examen).
- `saveSesionPractica` (analytics de prácticas de Sint).
- `saveArcadeScore` (leaderboard del arcade).

Respuesta: `{ok: true, ...}` o `{ok: false, error: '...'}`.

---

## 11. Punto de entrada y flujo de arranque

1. El navegador carga `index.html`.
2. CSS y fuentes se cargan en paralelo (`tokens.css` → `legacy.css` → `theme/new-ui.css`).
3. `<script type="module" src="js/app.js">` se ejecuta:
   - Importa core, datos, glosario, gamificación, feedback en orden.
   - Importa los módulos pedagógicos (cada uno hace su propio
     `Object.assign(window, {...})` para exponer su API).
   - Hace un `Object.assign(window, ...)` global con las exports de cada
     módulo importado.
4. La app queda en espera; la portada es la pantalla `active` por defecto.

---

## 12. Convenciones de código

- **Indentación**: 2 espacios.
- **Naming**:
  - Funciones públicas: camelCase (`renderFase`, `avanzarPropF4`).
  - Funciones privadas o helpers: prefijo `_` (`_glosNorm`, `_pistaTimer`).
  - Constantes: SCREAMING_SNAKE_CASE (`DEFAULT_API_URL`, `FUNC_ORAC`,
    `LS_PROFILE`).
  - Variables de estado del IIFE de CP: camelCase dentro del closure
    (`state`, `eng`).
- **Comentarios**: bloques `// ─────────` separan secciones. Comentarios
  en castellano.
- **Strings**: comillas simples por defecto, template literals para HTML.
- **HTML inline**: se genera con template literals y `escHtml()` / `escAttr()`
  para sanitización.
- **Convención de etiquetas sintácticas**: la canónica (la que compara el
  motor) lleva puntos (`Vocat.`, `Marca.Pas.Ref.`, `Mod.Or.`, `Atr.`, `CPvo`,
  `C.Rég.`, `C.Ag.`). El texto natural en español puede escribirse sin punto
  ("Vocativo", "Atributo") en lecciones, pistas y UI, pero NUNCA como clave
  del motor.
