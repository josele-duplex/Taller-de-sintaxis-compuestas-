/* streak.js — Racha diaria de uso (consecutivos)
   Extraído de index.html (Paso 6 de la migración, mayo 2026)
   Líneas originales: 971-976, 1008-1026. */

import { loadProgress, saveProgress } from '../core/storage.js';
import { DAILY_MISSIONS_POOL } from './missions.js';

export function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function _isYesterday(dateStr) {
  if (!dateStr) return false;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return dateStr === `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
}

// Called at start of a practice/exam session to update streak
export function updateDailyStreak() {
  const p = loadProgress();
  const today = _todayStr();
  if (p.lastActiveDate === today) return p; // already counted today
  if (_isYesterday(p.lastActiveDate) || !p.lastActiveDate) {
    p.streak = (p.streak || 0) + 1;
  } else {
    p.streak = 1; // gap → reset
  }
  p.lastActiveDate = today;
  p.totalSessions = (p.totalSessions || 0) + 1;
  // Pick a daily mission if none or from previous day
  if (!p.todayMission || p.todayMission.date !== today) {
    const pick = DAILY_MISSIONS_POOL[Math.floor(Math.random() * DAILY_MISSIONS_POOL.length)];
    p.todayMission = { ...pick, progress: 0, completed: false, date: today };
  }
  saveProgress(p);
  return p;
}
