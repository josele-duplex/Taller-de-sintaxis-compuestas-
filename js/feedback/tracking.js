/* tracking.js — Contador de errores por función + decisión de micro-lección
   Extraído de index.html (Paso 7 de la migración, mayo 2026)
   Líneas originales: 4507-4514, 4522, 4689-4696.

   Dependencia temporal: G.mode (estado del módulo Sint, se resolverá
   cuando Sint se extraiga en el Paso 9). */

import { ML_THRESHOLD, ERROR_TO_LECCION, MICRO_LECCIONES } from './micro-lecciones.js';
import { MICRO_LECCIONES_CP, ERROR_TO_LECCION_CP } from './micro-lecciones-cp.js';

// Estado privado del módulo (reset por sesión = recarga de página)
let _sessionFuncErrors = {};
// Aciertos por función dentro de la sesión actual. Base del "micro-progreso
// por función" (Sprint 1): chips visibles al alumno con el inventario de
// lo practicado en esta sesión. No se persiste: la idea es reflejar el
// trabajo activo, no acumular para siempre.
let _sessionFuncSuccess = {};

// Track errors by function for adaptive missions
export function trackError(modo, funcion) {
  const hist = JSON.parse(localStorage.getItem('taller_error_history') || '{}');
  if (!hist[modo]) hist[modo] = {};
  hist[modo][funcion] = (hist[modo][funcion] || 0) + 1;
  localStorage.setItem('taller_error_history', JSON.stringify(hist));
  // Session counter for micro-lessons
  if (!_sessionFuncErrors[funcion]) _sessionFuncErrors[funcion] = 0;
  _sessionFuncErrors[funcion]++;
  // Sprint 1: si la función estaba en racha hacia el sello, se rompe.
  _recordMasteryError(modo, funcion);
}

// Track successes by function (solo en sesión, no se persiste).
export function trackSuccess(modo, funcion) {
  if (!funcion) return;
  if (!_sessionFuncSuccess[funcion]) _sessionFuncSuccess[funcion] = 0;
  _sessionFuncSuccess[funcion]++;
  // Sprint 1: sellos de dominio. Trackea racha de aciertos consecutivos
  // por función a través de sesiones. Llega a MASTERY_THRESHOLD → sello.
  _recordMasterySuccess(modo, funcion);
}

// ── SELLOS DE DOMINIO POR FUNCIÓN (Sprint 1) ────────────────────────
// Persistencia en localStorage.taller_mastery con estructura:
//   { 'sint': { 'CD': { streak: 7, mastered: false },
//               'CPvo': { streak: 10, mastered: true, masteredAt: '2026-05-22' } },
//     'compuestas': { ... } }
// Racha consecutiva a través de sesiones, se rompe al fallar la función.
// Al alcanzar MASTERY_THRESHOLD aciertos seguidos sin error, se marca como
// mastered (una sola vez) y se dispara un evento visual.
export const MASTERY_THRESHOLD = 10;

function _loadMastery() {
  try { return JSON.parse(localStorage.getItem('taller_mastery') || '{}'); }
  catch { return {}; }
}
function _saveMastery(m) {
  try { localStorage.setItem('taller_mastery', JSON.stringify(m)); } catch {}
}

function _recordMasterySuccess(modo, funcion) {
  const m = _loadMastery();
  if (!m[modo]) m[modo] = {};
  if (!m[modo][funcion]) m[modo][funcion] = { streak: 0, mastered: false };
  const f = m[modo][funcion];
  if (f.mastered) { _saveMastery(m); return; }  // ya dominada, no doblar evento
  f.streak = (f.streak || 0) + 1;
  if (f.streak >= MASTERY_THRESHOLD) {
    f.mastered = true;
    f.masteredAt = (new Date()).toISOString().slice(0,10);
    // Evento visual único (showCombo está en gamification/xp.js, expuesto
    // en window vía app.js).
    if (typeof window !== 'undefined' && typeof window.showCombo === 'function') {
      setTimeout(()=>{ try{ window.showCombo('🏆 Dominas la función: ' + funcion, 25); }catch{} }, 300);
    }
  }
  _saveMastery(m);
}

function _recordMasteryError(modo, funcion) {
  const m = _loadMastery();
  if (!m[modo] || !m[modo][funcion]) return;
  // Una vez dominada, los errores ya no rompen el sello (es un logro).
  if (m[modo][funcion].mastered) { return; }
  m[modo][funcion].streak = 0;
  _saveMastery(m);
}

// Accesor público (para el dashboard del alumno y el panel del profesor).
export function getMastery() { return _loadMastery(); }

/**
 * Decide si proponer una micro-lección al alumno tras un error.
 *
 * @param {string} funcion   ID de la función/categoría correcta del fallo
 *                           (en Sint son cosas como 'CD', 'Sujeto', 'Atr.';
 *                            en CP son cosas como 'sustantiva_cd', 'relativa_libre').
 * @param {string} [tipo]    'sint' (por defecto) o 'compuesta'.
 *
 * Devuelve true cuando: la categoría tiene lección asignada y el contador
 * de errores de sesión está exactamente en un múltiplo de ML_THRESHOLD (3).
 * En 'sint' se restringe además a modos practice/projector; en 'compuesta'
 * el módulo CP no tiene un G.mode equivalente y no se restringe.
 */
export function shouldSuggestMicroLeccion(funcion, tipo) {
  if (tipo !== 'compuesta') {
    // Comportamiento original Sint: solo en practice/projector
    if (typeof G === 'undefined' || (G.mode !== 'practice' && G.mode !== 'projector')) return false;
  }
  const count = _sessionFuncErrors[funcion] || 0;
  const map    = tipo === 'compuesta' ? ERROR_TO_LECCION_CP   : ERROR_TO_LECCION;
  const lecMap = tipo === 'compuesta' ? MICRO_LECCIONES_CP    : MICRO_LECCIONES;
  const lecId = map[funcion];
  if (!lecId || !lecMap[lecId]) return false;
  // Show suggestion at threshold, then every 3 errors after
  return count >= ML_THRESHOLD && count % ML_THRESHOLD === 0;
}

// Accesor para que pista-ui.js consulte el contador de sesión sin manipularlo
export function getSessionFuncErrors() { return _sessionFuncErrors; }

// Accesor para los aciertos de la sesión (consumido por el render de chips
// de micro-progreso en sint).
export function getSessionFuncSuccess() { return _sessionFuncSuccess; }

/**
 * Reinicia el contador de errores de la sesión actual.
 * Debe llamarse al inicio de cada práctica/examen (desde initState
 * de Sint o desde el equivalente en CP). Antes de la migración esto
 * se hacía con `_sessionFuncErrors = {};` directamente desde Sint;
 * tras la modularización _sessionFuncErrors es privado de este módulo
 * y hace falta una función pública.
 */
export function clearSessionFuncErrors() {
  _sessionFuncErrors = {};
}

// Equivalente para los aciertos (también al arrancar sesión).
export function clearSessionFuncSuccess() {
  _sessionFuncSuccess = {};
}
