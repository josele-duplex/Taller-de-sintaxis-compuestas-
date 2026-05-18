/* auth.js — Constantes y helpers de autenticación
   Extraído de index.html (Paso 4 de la migración, mayo 2026)
   Líneas originales: 926, 928. */

import { LS_TEACHER_PW } from './constants.js';

export const DEFAULT_TEACHER_PW = 'profe123';

export function getTeacherPw() {
  return localStorage.getItem(LS_TEACHER_PW) || DEFAULT_TEACHER_PW;
}
