/* app.js — Bootstrap del frontend modular
   Paso 10 de la migración (mayo 2026).

   Este archivo es el punto de entrada de los módulos ES6. Importa
   todo lo extraído en los Pasos 4-9 y lo expone en `window.*` para:
   - Los onclick="X()" del HTML estático.
   - El módulo Sint (que se carga como <script> regular y referencia
     muchos identificadores libremente, igual que hacía el monolito).

   Orden:
   1. Core (constants, auth, escape, storage, audio, api, navigation).
   2. Datos (diccionarios, haber-forms).
   3. Glosario (data, render, tags).
   4. Gamificación (levels, missions, streak, xp, dashboard).
   5. Feedback (micro-lecciones, pistas-sint, tracking, pista-ui).
   6. Módulos pedagógicos (compuestas, arcade, morph, sintagmas,
      maestro, teacher) — cada uno se auto-registra en window.

   Sint (modules/sint/index.js) se carga aparte como <script> regular
   en index.html (no es módulo); sus funciones top-level se hacen
   globales automáticamente. */

// ─────────────────────────────────────────────────────────────
// 1. Core
// ─────────────────────────────────────────────────────────────
import * as constants from './core/constants.js';
import * as auth from './core/auth.js';
import * as escape from './core/escape.js';
import * as storage from './core/storage.js';
import * as audio from './core/audio.js';
import * as api from './core/api.js';
import * as navigation from './core/navigation.js';
import * as profile from './core/profile.js';

// ─────────────────────────────────────────────────────────────
// 2. Datos pedagógicos
// ─────────────────────────────────────────────────────────────
import * as dictMorf from './data/diccionario-morfologia.js';
import * as dictSintax from './data/diccionario-sintaxis.js';
import * as dictSintag from './data/diccionario-sintagmas.js';
import * as haberForms from './data/haber-forms.js';

// ─────────────────────────────────────────────────────────────
// 3. Glosario
// ─────────────────────────────────────────────────────────────
import * as glosTags from './glosario/tags.js';
import * as glosData from './glosario/data.js';
import * as glosRender from './glosario/render.js';

// ─────────────────────────────────────────────────────────────
// 4. Gamificación
// ─────────────────────────────────────────────────────────────
import * as gLevels from './gamification/levels.js';
import * as gMissions from './gamification/missions.js';
import * as gStreak from './gamification/streak.js';
import * as gXp from './gamification/xp.js';
import * as gDashboard from './gamification/dashboard.js';

// ─────────────────────────────────────────────────────────────
// 5. Feedback escalonado + micro-lecciones
// ─────────────────────────────────────────────────────────────
import * as fMicro from './feedback/micro-lecciones.js';
import * as fMicroCP from './feedback/micro-lecciones-cp.js';
import * as fPistasSint from './feedback/pistas-sint.js';
import * as fPistasCP from './feedback/pistas-compuestas.js';
import * as fTracking from './feedback/tracking.js';
import * as fPistaUi from './feedback/pista-ui.js';
import * as fPistaFlotante from './feedback/pista-flotante.js';

// ─────────────────────────────────────────────────────────────
// Exponer todas las exportaciones en window para los onclick=""
// del HTML estático y para que Sint (regular <script>) pueda
// referirlas libremente, igual que hacía el monolito.
// ─────────────────────────────────────────────────────────────
Object.assign(window,
  constants, auth, escape, storage, audio, api, navigation, profile,
  dictMorf, dictSintax, dictSintag, haberForms,
  glosTags, glosData, glosRender,
  gLevels, gMissions, gStreak, gXp, gDashboard,
  fMicro, fMicroCP, fPistasSint, fPistasCP, fTracking, fPistaUi,
  fPistaFlotante
);

// ─────────────────────────────────────────────────────────────
// 6. Módulos pedagógicos
// Cada uno hace su propio `Object.assign(window, {...})` internamente,
// así que basta con importarlos (side-effect imports).
// ─────────────────────────────────────────────────────────────
import './modules/compuestas/index.js';
import './modules/arcade/index.js';
import './modules/morph/index.js';
import './modules/sintagmas/index.js';
import './modules/maestro/index.js';
import './modules/teacher/index.js';
import './modules/chispa/index.js';

console.log('[app.js] Módulos ES6 cargados y expuestos en window.');
