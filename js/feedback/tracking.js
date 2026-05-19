/* tracking.js — Contador de errores por función + decisión de micro-lección
   Extraído de index.html (Paso 7 de la migración, mayo 2026)
   Líneas originales: 4507-4514, 4522, 4689-4696.

   Dependencia temporal: G.mode (estado del módulo Sint, se resolverá
   cuando Sint se extraiga en el Paso 9). */

import { ML_THRESHOLD, ERROR_TO_LECCION, MICRO_LECCIONES } from './micro-lecciones.js';

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

// Check if micro-lesson should be suggested for this function
export function shouldSuggestMicroLeccion(funcion) {
  if (G.mode !== 'practice' && G.mode !== 'projector') return false;
  const count = _sessionFuncErrors[funcion] || 0;
  const lecId = ERROR_TO_LECCION[funcion];
  if (!lecId || !MICRO_LECCIONES[lecId]) return false;
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
