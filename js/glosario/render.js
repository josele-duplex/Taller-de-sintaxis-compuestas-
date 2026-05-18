/* render.js — Render y UI del overlay del glosario
   Extraido de index.html (Paso 8 de la migracion, mayo 2026)
   Lineas originales: 1315-1376. */

import { GLOS_DATA } from './data.js';

export function _glosNorm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.\s]+/g,''); }
export function _glosHighlight(text, q){
  if(!q) return text;
  try {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return text.replace(new RegExp('('+safe+')','gi'),'<span class="glos-highlight">$1</span>');
  } catch(e){ return text; }
}
export function renderGlosario(query=''){
  const body = document.getElementById('glos-body');
  if(!body) return;
  const q = (query||'').trim();
  const qNorm = _glosNorm(q);
  let html = '';
  let totalMatches = 0;
  for(const block of GLOS_DATA){
    const matched = block.items.filter(it => {
      if(!qNorm) return true;
      return _glosNorm(it.abbr).includes(qNorm)
          || _glosNorm(it.full).includes(qNorm)
          || _glosNorm(it.expl).includes(qNorm);
    });
    if(matched.length === 0) continue;
    totalMatches += matched.length;
    html += '<div class="glos-section cat-'+block.cat+'">';
    html += '<div class="glos-section-title">'+block.section+'</div>';
    for(const it of matched){
      html += '<div class="glos-item">'
        + '<div class="glos-abbr">'+_glosHighlight(it.abbr, q)+'</div>'
        + '<div class="glos-item-body">'
        +   '<div class="glos-full">'+_glosHighlight(it.full, q)+'</div>'
        +   '<div class="glos-expl">'+_glosHighlight(it.expl, q)+'</div>'
        +   (it.ex ? '<div class="glos-example">Ej.: '+_glosHighlight(it.ex, q)+'</div>' : '')
        + '</div>'
        + '</div>';
    }
    html += '</div>';
  }
  if(totalMatches === 0){
    html = '<div class="glos-empty">Sin resultados para «'+(q||'')+'». Prueba con otra palabra clave.</div>';
  }
  body.innerHTML = html;
}
export function openGlosario(){
  const bg = document.getElementById('glos-bg');
  if(!bg) return;
  bg.classList.add('open');
  bg.setAttribute('aria-hidden','false');
  renderGlosario('');
  setTimeout(()=>{ const inp=document.getElementById('glos-input'); if(inp){ inp.value=''; inp.focus(); } }, 80);
  document.body.style.overflow = 'hidden';
}
export function closeGlosario(){
  const bg = document.getElementById('glos-bg');
  if(!bg) return;
  bg.classList.remove('open');
  bg.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}
export function filterGlosario(value){
  renderGlosario(value);
}
