/* auth.js — Constantes y helpers de autenticación
   Extraído de index.html (Paso 4 de la migración, mayo 2026)
   Líneas originales: 926, 928. */

import { LS_TEACHER_PW } from './constants.js';

export const DEFAULT_TEACHER_PW = 'profe123';

export function getTeacherPw() {
  return localStorage.getItem(LS_TEACHER_PW) || DEFAULT_TEACHER_PW;
}

// Guarda la clave de profesor que se enviará al GAS en cada endpoint
// sensible (debe coincidir con la fijada en Script Properties del backend).
// Junio 2026 (S1/S2/S4): la validación real es del servidor; aquí solo
// persistimos lo que el profesor teclea para reutilizarlo en las peticiones.
export function setTeacherPw(pw) {
  try { localStorage.setItem(LS_TEACHER_PW, String(pw || '')); } catch (e) {}
}
