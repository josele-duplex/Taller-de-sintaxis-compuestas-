/* constants.js — Constantes globales del proyecto
   Extraído de index.html (Paso 4 de la migración, mayo 2026)
   Líneas originales: 926-943, 5185-5186, 7607-7608. */

// ───── Claves de localStorage ─────
export const LS_API            = 'taller_api_url';
export const LS_PIN            = 'taller_pin';
export const LS_TIMER          = 'taller_timer';
export const LS_SOUND          = 'taller_sound';
export const LS_PROGRESS       = 'taller_progress';
export const LS_TEACHER_PW     = 'taller_teacher_pw';
export const LS_LB_SRV         = 'taller_lb_survival';
export const LS_LB_TMR         = 'taller_lb_timer';
export const LS_HINTS_PRACTICE = 'taller_hints_practice'; // 'on' | 'off'
export const LS_HINTS_EXAM     = 'taller_hints_exam';     // 'none' | 'first_only'
export const LS_PROFILE        = 'taller_profile';        // {name,email,grupo,savedAt}

// ───── Validación de email ─────
export const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@(murciaeduca\.es|alu\.murciaeduca\.es|gmail\.com)$/i;

// ───── PIN del modo examen ─────
export const PIN_LEN = 4;

// ───── URL por defecto del backend GAS ─────
// Cambia esta URL por la de tu despliegue de Google Apps Script.
// Los alumnos NO necesitan entrar al panel del profesor; la app
// se conectará automáticamente con esta URL.
// Si un profesor configura otra URL desde el panel, esa prevalece.
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbwBv86LuXXWwB-q5jArywWTdVQ9q6o6CpoTE4b6QbmzgW5_XOOp0aI8tWYCJ8UdIWNp/exec';
