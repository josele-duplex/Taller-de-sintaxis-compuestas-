/* dashboard.js — Panel lateral del alumno (XP, racha, misión, gráfico semanal)
   Extraído de index.html (Paso 6 de la migración, mayo 2026)
   Líneas originales: 1125-1208, 1211-1222. */

import { loadProgress } from '../core/storage.js';
import { levelFromXP } from './levels.js';
import { getMastery, MASTERY_THRESHOLD } from '../feedback/tracking.js';

// ═══ DASHBOARD PANEL FOR STUDENT (opens from portada corner) ═══
export function showStudentDashboard() {
  const p = loadProgress();
  const lvl = levelFromXP(p.xp);
  const m = p.todayMission;
  // Build last 7 days bars
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dstr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const entry = (p.history || []).find(h => h.date === dstr);
    days.push({ label: ['D','L','M','X','J','V','S'][d.getDay()], count: entry ? entry.count : 0 });
  }
  const maxCount = Math.max(1, ...days.map(d => d.count));
  const totalWeek = days.reduce((a, d) => a + d.count, 0);
  const avgErr = (() => {
    const recent = (p.history || []).filter(h => { const d = new Date(h.date); return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000; });
    const tot = recent.reduce((a, h) => a + h.count, 0);
    if (tot === 0) return 0;
    const errs = recent.reduce((a, h) => a + h.errors, 0);
    return (errs / tot).toFixed(1);
  })();

  const el = document.createElement('div');
  el.id = 'student-dashboard';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(30,27,75,.7);z-index:2500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s;backdrop-filter:blur(6px)';
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  el.innerHTML = `
    <div style="background:var(--paper);border-radius:20px;padding:24px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4);border:2px solid var(--parch-border)">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
        <div>
          <div style="font-size:2.4rem;line-height:1">${lvl.emoji}</div>
          <div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.1em">Nivel ${lvl.level+1}</div>
          <div style="font-size:1.2rem;font-weight:900;color:var(--ink)">${lvl.name}</div>
        </div>
        <button onclick="document.getElementById('student-dashboard').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--muted);padding:4px">✕</button>
      </div>
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:700;margin-bottom:4px">
          <span>${lvl.xp} XP</span>
          <span style="color:var(--muted)">${lvl.next} XP</span>
        </div>
        <div style="height:10px;background:var(--paper2);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${lvl.progress}%;background:linear-gradient(90deg,#FCD34D,#F59E0B);border-radius:99px;transition:width .6s"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:linear-gradient(135deg,#F59E0B,#DC2626);color:#fff;padding:14px;border-radius:12px;text-align:center">
          <div style="font-size:1.8rem;font-weight:900;line-height:1">🔥 ${p.streak||0}</div>
          <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:4px">días seguidos</div>
        </div>
        <div style="background:var(--paper2);padding:14px;border-radius:12px;text-align:center;border:1.5px solid var(--border)">
          <div style="font-size:1.8rem;font-weight:900;line-height:1;color:var(--ink)">${totalWeek}</div>
          <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;color:var(--muted)">oraciones esta semana</div>
        </div>
      </div>
      ${m ? `
      <div style="background:${m.completed?'#F0FDF4':'#EFF6FF'};border:2px solid ${m.completed?'#86EFAC':'#93C5FD'};border-radius:14px;padding:14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:.72rem;font-weight:800;color:${m.completed?'#059669':'#1D4ED8'};text-transform:uppercase;letter-spacing:.08em">${m.completed?'✓ Misión cumplida':'🎯 Misión de hoy'}</div>
          <div style="font-size:.75rem;font-weight:800;color:${m.completed?'#059669':'#1D4ED8'}">+${m.reward} XP</div>
        </div>
        <div style="font-weight:700;color:var(--ink);font-size:.9rem;margin-bottom:8px">${m.label}</div>
        <div style="height:8px;background:rgba(0,0,0,.08);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${Math.round(m.progress/m.target*100)}%;background:${m.completed?'#059669':'#1D4ED8'};border-radius:99px"></div>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px">${m.progress}/${m.target}</div>
      </div>
      ` : ''}
      ${(() => {
        const mast = getMastery();
        const sint = mast['sint'] || {};
        const dominadas = Object.entries(sint).filter(([_, v]) => v && v.mastered);
        const enRacha = Object.entries(sint)
          .filter(([_, v]) => v && !v.mastered && (v.streak||0) >= 3)
          .sort((a,b) => (b[1].streak||0) - (a[1].streak||0))
          .slice(0, 3);
        if (dominadas.length === 0 && enRacha.length === 0) return '';
        const dominadasHtml = dominadas.map(([f, v]) =>
          '<span style="display:inline-block;padding:5px 12px;border-radius:99px;background:linear-gradient(135deg,#FCD34D,#F59E0B);color:#78350F;font-weight:800;font-size:.78rem;margin:3px">🏆 ' + f + '</span>'
        ).join('');
        const enRachaHtml = enRacha.map(([f, v]) =>
          '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.78rem">'
          +   '<span style="font-weight:700;color:var(--ink);min-width:70px">' + f + '</span>'
          +   '<div style="flex:1;height:6px;background:rgba(0,0,0,.08);border-radius:3px;overflow:hidden">'
          +     '<div style="height:100%;width:' + Math.round((v.streak/MASTERY_THRESHOLD)*100) + '%;background:linear-gradient(90deg,#86EFAC,#16A34A);border-radius:3px"></div>'
          +   '</div>'
          +   '<span style="color:var(--muted);min-width:38px;text-align:right">' + (v.streak||0) + '/' + MASTERY_THRESHOLD + '</span>'
          + '</div>'
        ).join('');
        return ''
          + '<div style="background:var(--paper2);border:1.5px solid var(--border);border-radius:14px;padding:14px;margin-bottom:16px">'
          +   '<div style="font-size:.72rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Sellos de dominio</div>'
          +   (dominadas.length > 0
              ? '<div style="text-align:center;margin-bottom:' + (enRacha.length > 0 ? '12' : '0') + 'px">' + dominadasHtml + '</div>'
              : '')
          +   (enRacha.length > 0
              ? '<div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;font-weight:700">En camino</div>' + enRachaHtml
              : '')
          + '</div>';
      })()}
      <div style="margin-bottom:8px">
        <div style="font-size:.72rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Tu semana</div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:70px;padding:0 4px">
          ${days.map(d=>`
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="width:100%;height:${Math.max(4,d.count/maxCount*50)}px;background:${d.count>0?'linear-gradient(to top,#FCD34D,#F59E0B)':'var(--paper2)'};border-radius:4px 4px 0 0;transition:height .4s"></div>
              <div style="font-size:.68rem;font-weight:700;color:var(--muted)">${d.label}</div>
            </div>
          `).join('')}
        </div>
        ${avgErr>0?`<div style="font-size:.72rem;color:var(--muted);margin-top:8px;text-align:center">Media de errores por oración: <strong>${avgErr}</strong></div>`:''}
      </div>
    </div>`;
  document.body.appendChild(el);
}

// Student dashboard button in portada
export function addDashboardButton() {
  if (document.getElementById('dash-fab')) return;
  const btn = document.createElement('button');
  btn.id = 'dash-fab';
  btn.onclick = showStudentDashboard;
  btn.title = 'Tu progreso';
  btn.style.cssText = 'position:fixed;bottom:16px;right:16px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FCD34D,#F59E0B);border:none;cursor:pointer;box-shadow:0 4px 16px rgba(245,158,11,.4);z-index:100;font-size:1.5rem;display:flex;align-items:center;justify-content:center;transition:transform .2s';
  btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';
  btn.innerHTML = '📊';
  document.body.appendChild(btn);
}
