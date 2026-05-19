/* tracking.js — Contador de errores por función + decisión de micro-lección
   Extraído de index.html (Paso 7 de la migración, mayo 2026)
   Líneas originales: 4507-4514, 4522, 4689-4696.

   Dependencia temporal: G.mode (estado del módulo Sint, se resolverá
   cuando Sint se extraiga en el Paso 9). */

import { ML_THRESHOLD, ERROR_TO_LECCION, MICRO_LECCIONES } from './micro-lecciones.js';
import { MICRO_LECCIONES_CP, ERROR_TO_LECCION_CP } from './micro-lecciones-cp.js';

// Estado privado del módulo (reset por sesión = recarga de página)
let _sessionFuncErrors = {};

// Track errors by function for adaptive missions
export function trackError(modo, funcion) {
  const hist = JSON.parse(localStorage.getItem('taller_error_history') || '{}');
  if (!hist[modo]) hist[modo] = {};
  hist[modo][funcion] = (hist[modo][funcion] || 0) + 1;
  localStorage.setItem('taller_error_history', JSON.stringify(hist));
  // Session counter for micro-lessons
  if (!_sessionFuncErrors[funcion]) _sessionFuncErrors[funcion] = 0;
  _sessionFuncErrors[funcion]++;
}

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
