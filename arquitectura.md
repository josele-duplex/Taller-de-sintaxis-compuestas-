# Arquitectura — Taller de Sintaxis v6

> Documento para migración a Claude Code · Mayo 2026
> Estado del HTML: 15.914 líneas, 780 KB, una sola página

---

## 1. Visión general

La aplicación es un **HTML monolítico de página única (SPA)**, sin frameworks, sin transpiladores y sin proceso de compilación. Todo el código vive en un único fichero: `taller-sintaxis-v6.html`. CSS, HTML y JavaScript están dentro del mismo archivo, separados por etiquetas `<style>` y `<script>`.

Esta arquitectura monolítica fue una decisión consciente del inicio del proyecto: permite alojarlo sin servidor (basta con subir el archivo a Google Sites, GitHub Pages o similar), facilita la edición rápida y elimina problemas de versionado entre archivos. La contrapartida es que el archivo ha crecido hasta el límite de manejabilidad razonable.

---

## 2. Estructura del archivo

```
LÍNEAS 1–10         <!doctype html>, <head>, meta tags, fuentes
LÍNEAS 10–1.154     <style> · Tokens base, componentes UI, glosario, panel profesor
LÍNEAS 1.161–4.544  <style> · Theme "new-ui" · Estilos modernos, módulo CP completo
LÍNEAS 4.546–4.561  <script> · Polyfills mínimos y detección de plataforma
LÍNEAS 4.563–5.328  <body> · Pantallas HTML estáticas (12 pantallas)
LÍNEAS 5.329–15.886 <script> · Toda la lógica de la app (244 funciones globales)
```

El segundo bloque CSS (líneas 1.161–4.544) es donde está prácticamente todo el diseño actual; el primer bloque es legacy de versiones anteriores.

---

## 3. Pantallas (DOM)

Cada "pantalla" es un `<div class="screen">` que se muestra u oculta mediante una clase `active`. Solo una pantalla está visible a la vez. Las pantallas existentes:

| ID | Propósito |
|---|---|
| `screen-loading` | Pantalla de carga inicial |
| `screen-portada` | Selector de módulos (página principal) |
| `screen-login` | Login del alumno (email + nombre + grupo + PIN) |
| `screen-game` | Motor de oraciones simples (Sint) |
| `screen-results` | Resumen tras un ejercicio de Sint |
| `screen-teacher` | Panel del profesor (con PIN) |
| `screen-arcade` | Modo arcade rápido |
| `screen-gameover` | Resultado de arcade |
| `screen-morph` | Motor de morfología |
| `screen-sintagmas` | Motor de análisis sintagmático (Sint4) |
| `screen-maestro` | Motor avanzado de morfología |
| `screen-compuestas` | Módulo de oraciones compuestas (CP) |

El cambio entre pantallas lo gestiona la función `showScreen(id)` (línea 6.250 aproximadamente), que añade y quita la clase `active`.

---

## 4. Módulos pedagógicos

### 4.1 Módulo de oraciones simples (Sint)

- **Estado global**: variable `G` (línea 6.511). Se reinicializa en cada ejercicio nuevo.
- **Schema de datos**: cada oración del banco tiene los campos `fase1` (verbos), `fase2` (sujeto), `fase3` (bloques de función sintáctica) y opcionalmente `fase4` (sintagmas).
- **Flujo**: 4 fases secuenciales. El motor renderiza la fase actual y avanza al confirmarse.
- **Funciones principales**: `normalizeOracion()`, `initState()`, `renderGame()`, `renderPhase1/2/3/4()`, `goResults()`, `calcDetailedScore()`.

### 4.2 Módulo de oraciones compuestas (CP)

- **Estado**: encapsulado dentro de un **IIFE** (`const CP = (function(){...})()`, línea 12.222). El estado privado `state` y el `state.engine` viven dentro del closure.
- **Schema de datos**: completamente distinto. Cada ejercicio tiene `tokens`, `proposiciones`, `nexos`, `relaciones`. Cada proposición tiene su `analisis_interno` (sujeto, predicado, funciones).
- **Flujo**: 4 pasos visibles para el alumno (Verbos, Nexos, Delimitar, Clasificar y relacionar). Internamente la "fase 4" antigua se eliminó tras refactor; la "fase 5" pasó a ser la nueva fase 4 con 6 sub-pasos en cascada.
- **API pública**: `CP.enter()`, `CP.exit()`, `CP.iniciarPractica()`, `CP.avanzarFase()`, etc.

### 4.3 Otros módulos

- **Arcade** (líneas 9.425–9.970): quiz rápido con timer y combo.
- **Morfología básica (Morph)** (líneas 9.970–10.136): clasificación morfológica.
- **Sintagmas (Sint4)** (líneas 10.136–10.720): análisis sintagmático.
- **Maestro** (líneas 11.103–11.830): morfología avanzada con cascadas de atributos.

---

## 5. Gestión del estado

La aplicación usa **cuatro mecanismos distintos** de gestión de estado, según el ámbito:

### 5.1 Variables globales

- `G` — estado del módulo Sint (objeto que se reinicializa por ejercicio).
- `_audioCtx`, `_soundOn` — contexto de audio Web Audio API y flag de silencio.
- `_practiceAnalyticsSent`, `_sessionFuncErrors`, `_pistaTimer`, `_pistaCountdown` — flags y timers transversales.

### 5.2 Estado encapsulado (closure)

- `CP._state` — estado privado del módulo de compuestas. Inaccesible desde fuera salvo para depuración (`window.__CP_STATE__`).

### 5.3 localStorage (persistencia entre sesiones)

| Clave | Contenido |
|---|---|
| `taller_api_url` | URL del Google Apps Script |
| `taller_pin` | PIN del profesor cifrado |
| `taller_teacher_pw` | Password del profesor |
| `taller_progress` | Objeto con XP, nivel, streak, misiones diarias |
| `taller_sound` | `true`/`false` para activar sonidos |
| `taller_timer` | Configuración del temporizador del modo examen |
| `taller_error_history` | Contadores `_sessionFuncErrors` persistentes |

### 5.4 Estado servidor (Google Sheets)

Datos compartidos por todos los alumnos, sincronizados vía Google Apps Script:

- `Oraciones_Banco` — banco de oraciones simples (450 oraciones).
- `Compuestas_Banco` — banco de oraciones compuestas (~84 ejercicios).
- `Examenes_Config` — exámenes activos con PIN del modo simple.
- `Compuestas_Examenes` — exámenes activos del módulo de compuestas.
- `Alumnos_Resultados` — resultados de los alumnos en simples.
- `Compuestas_Resultados` — resultados anónimos del módulo CP (con Session_ID).

---

## 6. Funciones core (Core compartido)

Estas funciones son **globales y reutilizables** desde cualquier módulo. Son la "infraestructura común":

### 6.1 Red y backend

- `getApiUrl()` — devuelve la URL del GAS desde localStorage o el default hardcoded.
- `fetchWithTimeout(url, opts, ms)` — fetch con AbortController.
- `fetchWithRetry(url, opts, {timeoutMs, retries, onRetry})` — reintentos con backoff.
- `warmupApi()` — warm-up del GAS para evitar cold starts.

### 6.2 Enrutamiento

- `showScreen(id)` — activa una pantalla por ID.
- `showPortada()` — vuelve a la portada.
- `goModule(mod)` — dispatcher a cada módulo (Sint, CP, Arcade, etc.).

### 6.3 Gamificación

- `loadProgress()` / `saveProgress(p)` — carga/guarda el objeto de progreso.
- `levelFromXP(xp)` — calcula el nivel desde la XP acumulada.
- `awardXP(amount, reason)` — concede XP; dispara `showLevelUp` si sube de nivel.
- `showCombo(text, xpBonus)` — toast de combo.
- `showLevelUp(levelData)` — modal de subida de nivel.
- `showStudentDashboard()` — panel lateral con XP, streak, misiones.
- `updateDailyStreak()` — actualiza streak diario.

### 6.4 Audio (Web Audio API)

- `playSuccess()`, `playError()`, `playComplete()`, `playClick()` — sonidos generados con osciladores nativos del navegador.

### 6.5 Micro-lecciones

- `MICRO_LECCIONES` — diccionario de lecciones organizadas por ID (`cd_ci`, `sujeto`, `atributo`...).
- `ERROR_TO_LECCION` — mapa "función errada" → ID de lección.
- `_sessionFuncErrors` — contador de errores por función en la sesión actual.
- `trackError(modo, funcion)` — incrementa el contador.
- `shouldSuggestMicroLeccion(funcion)` — devuelve `true` cuando se supera `ML_THRESHOLD = 3`.
- `openMicroLeccion()` / `closeMicroLeccion()` — abre/cierra el drawer.

### 6.6 Pistas y feedback escalonado

- `FEEDBACK_SINTAXIS` — array de pares de confusión `{real, marcada, fijo, pista}`.
- `FEEDBACK_MORFOLOGIA`, `DICCIONARIO_BASE_MORFOLOGIA`, `DICCIONARIO_BASE_SINTAXIS`, `DICCIONARIO_BASE_SINTAGMAS` — diccionarios pedagógicos.
- `showPista()` — renderiza la pista actual en la UI.

### 6.7 Etiquetado de funciones sintácticas

- `FUNC_ORAC` — array maestro de funciones (Sujeto, CD, CI, Atr., etc.).
- `CC_SUBTIPOS` — subtipos de CC (Lugar, Tiempo, Modo, Causa, etc.).
- `FUNC_SINT` — funciones internas de sintagma (N, Mod/Det., SN/CN, etc.).
- `funcTagCss(label)` — devuelve `{bg, border, text, abbrev}` con colores.
- `tagContent(label)` — devuelve `{abbrev, full}` para mostrar etiquetas.

### 6.8 Auth

- `EMAIL_RE` — regex de validación de email institucional.
- `PIN_LEN = 4` — longitud del PIN.
- `DEFAULT_TEACHER_PW`, `getTeacherPw()` — password del profesor.

### 6.9 Constantes de scoring

- `GrammarRules`, `SUBFASE_CONFIGS`, `WEIGHTS`, `FUNC_WEIGHT`, `ScoringEngine` — específicas de Sint, no reutilizables por CP.

---

## 7. Dependencias externas

La aplicación es **prácticamente cero-dependencias**. Lo que sí usa:

### 7.1 Fuentes web (Google Fonts)

- **Fraunces** — serif moderna para títulos y encabezados.
- **DM Sans** — sans-serif para UI y cuerpo.
- **Nunito** — sans-serif legacy (algunos lugares).

Cargadas mediante `<link>` desde `fonts.googleapis.com`.

### 7.2 APIs del navegador

- **Web Audio API** — `AudioContext`, `OscillatorNode` para sonidos generados (sin archivos de audio).
- **localStorage** — persistencia local.
- **fetch / AbortController** — red.
- **navigator.sendBeacon** — envío no bloqueante de resultados al GAS.

### 7.3 Servidor

- **Google Apps Script (GAS)** — endpoints REST sobre Google Sheets. Archivos: `Code_v6.gs` (módulo simple) y `Compuestas.gs` (módulo compuesto, ~1.547 líneas).

### 7.4 Lo que NO se usa

- Sin React, Vue, jQuery, ni ningún framework.
- Sin bundler (no Webpack, Vite, esbuild).
- Sin TypeScript.
- Sin tests automatizados.
- Sin CSS preprocesador.
- Sin proceso de build.

---

## 8. Estilos visuales

### 8.1 Sistema de tokens

El diseño usa **variables CSS personalizadas** (custom properties) declaradas en `:root`. Tokens principales:

- **Colores base**: `--ink`, `--ink2`, `--muted`, `--paper`, `--border`.
- **Colores semánticos por función sintáctica**: cada función (CD, CI, Atr., etc.) tiene un color asignado en `funcTagCss()`.
- **Tokens del módulo CP** (introducidos en refactor reciente):
  - `--cp-marca` (`#0F2342`, navy) y variantes claro/pastel.
  - `--cp-p1`, `--cp-p2`, `--cp-p3`, `--cp-p4` (colores por proposición).

### 8.2 Theme dual

Existen **dos sistemas visuales coexistiendo**:

1. **Legacy** — primer bloque CSS (1–1.154), estilos antiguos.
2. **New-UI** — segundo bloque CSS (1.161–4.544), activado con `class="theme-new-ui"` en `<body>`. Es lo que ve el usuario actualmente.

Esto es deuda técnica: el bloque legacy debería eliminarse, pero algunos selectores siguen aplicándose por especificidad y eliminarlo requiere auditar caso por caso.

### 8.3 Estética declarada

"**Bento-Neobrutalista Refinado**":
- Cards con bordes definidos, sombras cálidas marrones.
- Paleta cálida base color crema (`#EDE4CC`).
- 11 colores semánticos para funciones sintácticas.
- Tipografía con contraste fuerte: Fraunces (display) + DM Sans (UI).

---

## 9. Bucles principales y eventos

La aplicación es **dirigida por eventos** del usuario, no tiene "loop" interno tipo videojuego. Los puntos de entrada típicos:

1. **Click en módulo de la portada** → `goModule('compuestas')` → `CP.enter()`.
2. **Click en token / opción** → handler específico (`onTokenClick`, `onClasifClick`, `onRelacionClick`) → actualiza estado → llama a `renderFase()`.
3. **Click en botón de fase** → `CP.avanzarFase()` → cambia `state.engine.fase` → `renderFase()`.

El patrón es siempre: **estado se modifica → función render se llama → DOM se reconstruye**. No hay reconciliación inteligente: `wrap.innerHTML = ...` reemplaza el contenido entero de la zona afectada.

Los timers (modo examen, pistas con countdown) son `setInterval` / `setTimeout` directos, gestionados manualmente con `clearTimeout` para evitar fugas.

---

## 10. Comunicación con el backend

La aplicación se comunica con el GAS mediante POST JSON al endpoint único:

```
https://script.google.com/macros/s/AKfyc.../exec
```

Cada petición lleva un `action` que el GAS despacha internamente:

```javascript
fetch(getApiUrl(), {
  method: 'POST',
  body: JSON.stringify({ action: 'saveResultadoCompuestas', payload: {...} })
})
```

Acciones GET principales:
- `getOraciones` (banco de simples)
- `getOracionesCompuestas` (banco de compuestas)
- `getModulesEnabled`
- `getExamConfig`, `getExamenCompuesta`

Acciones POST principales:
- `saveResultado` (resultado de simples)
- `saveResultadoCompuesta` (resultado de compuesta con PIN)
- `saveResultadoCompuestas` (resultado anónimo, añadido recientemente)

El GAS responde con `Content-Type: application/json` y formato `{ok: true, ...}` o `{ok: false, error: '...'}`.

---

## 11. Punto de entrada y flujo de arranque

1. El navegador carga el HTML.
2. CSS y fuentes se cargan en paralelo.
3. Los scripts se ejecutan en orden de aparición:
   - Primero el script de la línea 4.546 (polyfills, detección).
   - Luego el script principal de la línea 5.329, que define constantes, funciones globales y por último ejecuta el código de inicio.
4. En el script principal:
   - Se ejecuta `warmupApi()` para precalentar el GAS.
   - Se muestra `screen-portada` (es la única que tiene clase `active` en el HTML estático).
   - Se carga `loadProgress()` y se renderiza `showStudentDashboard()`.
   - Se llama a `addDashboardButton()`, `initSoundBtn()`, etc.
5. La app queda en espera de la interacción del usuario.

No hay `DOMContentLoaded` explícito: los `<script>` están al final del `<body>` y se ejecutan cuando el DOM ya está listo.

---

## 12. Convenciones de código

- **Indentación**: 2 espacios.
- **Naming**:
  - Funciones públicas: camelCase (`renderFase`, `avanzarPropF4`).
  - Funciones privadas o helpers: prefijo `_` (`_glosNorm`, `_pistaTimer`).
  - Constantes: SCREAMING_SNAKE_CASE (`DEFAULT_API_URL`, `FUNC_ORAC`).
  - Variables de estado del IIFE de CP: camelCase dentro del closure (`state`, `eng`).
- **Comentarios**: bloques `// ─────────` separan secciones. Comentarios en castellano.
- **Strings**: comillas simples por defecto, template literals para HTML.
- **HTML inline**: se genera con template literals y `escHtml()` / `escAttr()` para sanitización.
