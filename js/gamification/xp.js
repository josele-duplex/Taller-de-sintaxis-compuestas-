/* xp.js — Asignación de XP, combos y subidas de nivel
   Extraído de index.html (Paso 6 de la migración, mayo 2026)
   Líneas originales: 1029-1088, 1091-1112. */

import { loadProgress, saveProgress } from '../core/storage.js';
import { playSuccess, playComplete } from '../core/audio.js';
import { LEVELS, levelFromXP } from './levels.js';
import { showMissionComplete } from './missions.js';
import { _todayStr } from './streak.js';

// Award XP for a completed sentence
export function awardXP(amount, reason) {
  const p = loadProgress();
  const prevLvl = levelFromXP(p.xp).level;
  p.xp = (p.xp || 0) + amount;
  const newLvl = levelFromXP(p.xp).level;
  saveProgress(p);
  if (newLvl > prevLvl) showLevelUp(LEVELS[newLvl]);
  return p;
}

// Called when a sentence is completed — updates mission, XP, and shows celebrations
export function onSentenceCompleted(sentenceObj, errors) {
  const p = loadProgress();
  const perfect = errors === 0;
  // Base XP per sentence
  let xp = 5;
  if (perfect) xp += 5;
  // Update perfect streak (for combo celebrations)
  if (perfect) {
    p.perfectStreak = (p.perfectStreak || 0) + 1;
    if (p.perfectStreak === 3) showCombo('🔥 ¡En racha! +5 XP bonus', 5);
    else if (p.perfectStreak === 5) showCombo('⚡ ¡Imparable! +10 XP bonus', 10);
    else if (p.perfectStreak === 10) showCombo('🏆 ¡Legendario! +25 XP bonus', 25);
    else if (p.perfectStreak >= 3) xp += 2; // silent bonus
  } else {
    p.perfectStreak = 0;
  }
  // Update daily mission progress
  if (p.todayMission && !p.todayMission.completed) {
    const m = p.todayMission;
    let inc = 0;
    if (m.func === '__ANY__') inc = 1;
    else if (m.func === '__PERFECT__' && perfect) inc = 1;
    else {
      const funcs = sentenceObj.funciones_presentes || [];
      if (funcs.includes(m.func)) inc = 1;
    }
    m.progress = Math.min(m.target, m.progress + inc);
    if (m.progress >= m.target) {
      m.completed = true;
      xp += m.reward;
      setTimeout(() => showMissionComplete(m), 400);
    }
  }
  saveProgress(p);
  awardXP(xp, 'sentence');
  // Track for weekly stats
  const today = _todayStr();
  const hist = p.history || [];
  let todayEntry = hist.find(h => h.date === today);
  if (!todayEntry) { todayEntry = { date: today, count: 0, errors: 0 }; hist.push(todayEntry); }
  todayEntry.count++;
  todayEntry.errors += errors;
  // Keep only last 14 days
  p.history = hist.filter(h => {
    const d = new Date(h.date);
    return (Date.now() - d.getTime()) < 14 * 24 * 60 * 60 * 1000;
  });
  saveProgress(p);
}

// ═══ UI CELEBRATIONS ═══
export function showCombo(text, xpBonus) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#F59E0B,#DC2626);color:#fff;padding:18px 28px;border-radius:16px;font-weight:900;font-size:1.3rem;z-index:3000;box-shadow:0 8px 32px rgba(220,38,38,.5);pointer-events:none;animation:comboIn .5s ease-out';
  el.textContent = text;
  document.body.appendChild(el);
  playSuccess();
  setTimeout(() => { el.style.transition = 'opacity .5s,transform .5s'; el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-20px)'; }, 1600);
  setTimeout(() => el.remove(), 2200);
}

export function showLevelUp(levelData) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:rgba(30,27,75,.85);z-index:3500;display:flex;align-items:center;justify-content:center;animation:fadeIn .3s';
  el.innerHTML = `<div style="background:linear-gradient(135deg,#FCD34D,#F59E0B);color:#1E1B4B;padding:30px 40px;border-radius:20px;text-align:center;box-shadow:0 0 60px rgba(252,211,77,.6);animation:comboIn .6s ease-out">
    <div style="font-size:4rem;margin-bottom:8px">${levelData.emoji}</div>
    <div style="font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.15em;opacity:.8">¡Nuevo nivel!</div>
    <div style="font-size:2rem;font-weight:900;margin:6px 0">${levelData.name}</div>
    <button onclick="this.parentElement.parentElement.remove()" style="margin-top:14px;background:#1E1B4B;color:#FCD34D;border:none;padding:10px 24px;border-radius:10px;font-weight:800;cursor:pointer;font-size:.9rem">¡Genial!</button>
  </div>`;
  document.body.appendChild(el);
  playComplete();
}
