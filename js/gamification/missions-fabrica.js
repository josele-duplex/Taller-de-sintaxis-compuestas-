/* missions-fabrica.js — Misiones diarias de «La Fábrica de Palabras» (F4·3)
   Plan de producto §6, fila F4·2 ("… + misiones").

   POR QUÉ UN POOL PARALELO Y NO UNA AMPLIACIÓN DE DAILY_MISSIONS_POOL
   ───────────────────────────────────────────────────────────────────
   1. `p.todayMission` es un slot único: updateDailyStreak() (streak.js)
      sortea UNA misión del pool al arrancar sesión, sin saber en qué
      módulo está el alumno. Si las de morfología entraran en ese mismo
      bombo, un alumno de Simples podría sacar "fabrica una palabra" —
      misión que onSentenceCompleted() no sabe incrementar (solo compara
      m.func contra sentenceObj.funciones_presentes) y que se quedaría
      a 0 toda la sesión, visible en el dashboard. Y al revés.
   2. La unidad de progreso es otra: Simples cuenta oraciones que
      contienen una función; la Fábrica cuenta ítems, retos, herramientas
      y palabras inventadas. No hay un campo `func` que compartir.
   3. La Fábrica no pasa por _launchGame (sint/index.js hace return antes),
      así que hoy no se le asigna ninguna misión por esa vía.

   Lo que SÍ se reutiliza: showMissionComplete (misma celebración),
   awardXP (misma barra de XP) y el mismo objeto `taller_progress` —
   la misión vive en `p.fabMission`, hermana de `p.todayMission`, sin
   clave nueva de localStorage. */

import { loadProgress, saveProgress } from '../core/storage.js';
import { showMissionComplete } from './missions.js';
import { awardXP } from './xp.js';
import { _todayStr } from './streak.js';

/* `metric` es el nombre del contador de sesión que la alimenta (ver
   _fabContadores en modules/fabrica/index.js). `modo`:
     · 'acumula' → suma los incrementos, también entre sesiones del mismo
       día (12 ítems son 12 ítems, los hagas de una sentada o de tres).
     · 'alcanza' → se queda con el máximo alcanzado; para la racha, donde
       "5 seguidos" significa llegar a 5, no sumar cincos de varias tandas. */
export const FAB_MISSIONS_POOL = [
  {id:'fab_items_12',   label:'Acierta 12 piezas en la Fábrica',            metric:'aciertos',           modo:'acumula', target:12, reward:20},
  {id:'fab_retos_2',    label:'Termina 2 retos completos',                  metric:'retos',              modo:'acumula', target:2,  reward:25},
  {id:'fab_racha_5',    label:'Encadena 5 aciertos seguidos',               metric:'rachaMax',           modo:'alcanza', target:5,  reward:30},
  {id:'fab_herram_1',   label:'Gana una herramienta nueva para tu mesa',    metric:'herramientasNuevas', modo:'acumula', target:1,  reward:30},
  {id:'fab_museo_1',    label:'Fabrica una palabra para tu museo',          metric:'museoNuevas',        modo:'acumula', target:1,  reward:25},
  {id:'fab_etiqueta_6', label:'Acierta 6 piezas en la Estación 3 (Etiqueta)', metric:'aciertosEst3',     modo:'acumula', target:6,  reward:30},
];

// Sortea la misión del día si no hay o si es de un día anterior. Se llama
// al entrar en la Fábrica en modo práctica (nunca en examen).
export function pickFabMission() {
  const p = loadProgress();
  const today = _todayStr();
  if (!p.fabMission || p.fabMission.date !== today) {
    const pick = FAB_MISSIONS_POOL[Math.floor(Math.random() * FAB_MISSIONS_POOL.length)];
    p.fabMission = { ...pick, progress: 0, completed: false, date: today };
    saveProgress(p);
  }
  return p.fabMission;
}

export function getFabMission() {
  const p = loadProgress();
  const m = p.fabMission;
  return (m && m.date === _todayStr()) ? m : null;
}

/* Sincroniza la misión con los contadores de la sesión.
   `aplicados` es un snapshot mutable de lo ya contabilizado, para que
   llamar dos veces seguidas no sume dos veces (los call sites se solapan:
   un `clasifica_prueba` acertado dispara _resolverItem Y _registrarHerramienta).
   Devuelve {mision, recienCompletada} o null si no había nada que hacer. */
export function syncFabMission(contadores, aplicados) {
  const p = loadProgress();
  const m = p.fabMission;
  if (!m || m.completed || m.date !== _todayStr()) return null;
  const ahora = Number(contadores[m.metric] || 0);
  const antes = Number(aplicados[m.metric] || 0);
  aplicados[m.metric] = ahora;
  const previo = m.progress;
  if (m.modo === 'alcanza') {
    m.progress = Math.min(m.target, Math.max(m.progress, ahora));
  } else {
    const delta = ahora - antes;
    if (delta <= 0) return null;
    m.progress = Math.min(m.target, m.progress + delta);
  }
  if (m.progress === previo) return null;
  let recienCompletada = false;
  if (m.progress >= m.target) { m.completed = true; recienCompletada = true; }
  saveProgress(p);
  if (recienCompletada) {
    try { awardXP(m.reward, 'fabrica_mision'); } catch (e) {}
    setTimeout(() => { try { showMissionComplete(m); } catch (e) {} }, 400);
  }
  return { mision: m, recienCompletada };
}

// Tarjeta de la misión para las pantallas de la Fábrica (portada de reto y
// cierre de reto). Devuelve '' si no hay misión — así el call site no
// necesita condicionales.
export function fabMissionCardHtml() {
  const m = getFabMission();
  if (!m) return '';
  const pct = Math.round((m.progress / m.target) * 100);
  const hecho = m.completed;
  return '<div class="fab-mision' + (hecho ? ' is-done' : '') + '">' +
    '<div class="fab-mision-top">' +
      '<span class="fab-mision-tag">' + (hecho ? '✓ Misión cumplida' : '🎯 Misión de hoy') + '</span>' +
      '<span class="fab-mision-xp">+' + m.reward + ' XP</span>' +
    '</div>' +
    '<div class="fab-mision-label">' + m.label + '</div>' +
    '<div class="fab-mision-bar"><div class="fab-mision-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="fab-mision-count">' + m.progress + '/' + m.target + '</div>' +
  '</div>';
}
