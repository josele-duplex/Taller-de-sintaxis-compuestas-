/* levels.js — Tabla de niveles y cálculo de nivel desde XP
   Extraído de index.html (Paso 6 de la migración, mayo 2026)
   Líneas originales: 948-958, 989-1005. */

export const LEVELS = [
  {xp:0,    emoji:'📗', name:'Novato'},
  {xp:50,   emoji:'📘', name:'Iniciado'},
  {xp:150,  emoji:'📙', name:'Aprendiz'},
  {xp:350,  emoji:'📕', name:'Estudiante'},
  {xp:700,  emoji:'🎓', name:'Graduado'},
  {xp:1200, emoji:'🧠', name:'Experto'},
  {xp:2000, emoji:'⭐', name:'Virtuoso'},
  {xp:3500, emoji:'🏛', name:'Maestro'},
  {xp:6000, emoji:'👑', name:'Leyenda'},
];

export function levelFromXP(xp) {
  let lvl = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { lvl = i; break; }
  }
  const curr = LEVELS[lvl];
  const next = LEVELS[lvl + 1];
  return {
    level: lvl,
    emoji: curr.emoji,
    name: curr.name,
    xp,
    current: curr.xp,
    next: next ? next.xp : curr.xp,
    progress: next ? Math.round((xp - curr.xp) / (next.xp - curr.xp) * 100) : 100
  };
}
