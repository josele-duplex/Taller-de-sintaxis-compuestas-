/* storage.js — Carga y guarda el progreso del alumno en localStorage
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 978-987. */

import { LS_PROGRESS } from './constants.js';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { xp: 0, streak: 0, lastActiveDate: '', todayMission: null, history: [], totalSessions: 0, perfectStreak: 0 };
}

export function saveProgress(p) {
  try { localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); } catch (e) {}
}
