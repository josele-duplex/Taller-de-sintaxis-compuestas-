/* missions.js — Pool de misiones diarias y celebración de misión completada
   Extraído de index.html (Paso 6 de la migración, mayo 2026)
   Líneas originales: 960-969, 1114-1122. */

import { playSuccess } from '../core/audio.js';

export const DAILY_MISSIONS_POOL = [
  {id:'cd_5',   label:'Analiza 5 oraciones con CD',        func:'CD',          target:5, reward:25},
  {id:'ci_5',   label:'Analiza 5 oraciones con CI',        func:'CI',          target:5, reward:25},
  {id:'pasref_3',label:'Identifica 3 pasivas reflejas',    func:'Marca.Pas.Ref.', target:3, reward:30},
  {id:'atr_4',  label:'Analiza 4 atributos',               func:'Atr.',        target:4, reward:25},
  {id:'cpvo_3', label:'Identifica 3 predicativos',         func:'CPvo',        target:3, reward:30},
  {id:'reg_3',  label:'Analiza 3 complementos de régimen', func:'C.Rég.',      target:3, reward:30},
  {id:'perfect_3', label:'3 oraciones seguidas sin errores', func:'__PERFECT__', target:3, reward:40},
  {id:'any_10', label:'Analiza 10 oraciones (cualquiera)', func:'__ANY__',     target:10, reward:20},
];

export function showMissionComplete(m) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#059669,#10B981);color:#fff;padding:14px 24px;border-radius:14px;font-weight:800;font-size:.95rem;z-index:3000;box-shadow:0 8px 24px rgba(5,150,105,.4);pointer-events:none;animation:comboIn .5s ease-out;max-width:90vw;text-align:center';
  el.innerHTML = `🎯 <strong>¡Misión completada!</strong><br><span style="font-size:.82rem;opacity:.9">${m.label} · +${m.reward} XP</span>`;
  document.body.appendChild(el);
  playSuccess();
  setTimeout(() => { el.style.transition = 'opacity .6s'; el.style.opacity = '0'; }, 3000);
  setTimeout(() => el.remove(), 3700);
}
