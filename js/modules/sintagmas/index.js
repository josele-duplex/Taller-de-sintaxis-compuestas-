/* sintagmas/index.js — Modo sintagmas (analisis sintagmatico recursivo)
   Extraido de index.html (Paso 9.4 de la migracion, mayo 2026)
   Lineas originales: 5910-6305.

   18 funciones: getSintFullName, extractSintType, startSintagmas,
   renderSintMain, _sintTopLevel, _containsWholeWords, _sintChildren,
   _sintStartLevel, _sintStep1Nucleus, _sintCheckNucleus, _sintStep1Type,
   _sintCheckType, _sintStep2Classify, _sintClassifyElem,
   _sintCheckLevelComplete, sintNextSintagma, sintSkipNew, endSint.

   Estado privado: SIN.
   Datos privados: SINT_FULL_NAMES, SINT_TYPES, SINT_FUNCIONES_MOD/COMP/TERM.

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): showScreen, getApiUrl, fetchWithTimeout, shuffle, escHtml,
   playSuccess, playError, awardXP, trackError. */

// ════════════════════════════════════════════════════════
// SINTAGMAS ENGINE v5.0 — Step-by-step recursive analysis
// ════════════════════════════════════════════════════════
let SIN={};

const SINT_FULL_NAMES = {
  'SN': 'Sintagma Nominal', 'SV': 'Sintagma Verbal',
  'SP': 'Sintagma Preposicional', 'SAdj': 'Sintagma Adjetival', 'SAdv': 'Sintagma Adverbial',
};
const SINT_TYPES = ['SN','SP','SAdj','SAdv','SV'];
const SINT_FUNCIONES_MOD = ['Mod/Det.','Mod/Cuant.','Mod.'];
const SINT_FUNCIONES_COMP = ['SN/CN','SAdj/CN','SPrep/CN','CAdj','CAdv','Aposición','Nexo'];
const SINT_FUNCIONES_TERM = ['SN/T','SAdj/T','SAdv/T','SP/T'];

function getSintFullName(abbr) {
  return SINT_FULL_NAMES[abbr] || abbr || 'Sintagma';
}

/** Extract sintagma type from titulo like "SP CI — "a la meta"" */
function extractSintType(titulo) {
  const m = (titulo||'').match(/^(SN|SV|SP|SAdj|SAdv)/);
  return m ? m[1] : '';
}

async function startSintagmas({name,email}){
  document.getElementById('loading-txt').textContent='Cargando sintagmas…';
  showScreen('loading');
  await delay(150);

  const apiUrl=getApiUrl();
  let oraciones=[];
  if(!apiUrl){
    oraciones=getMock().map(normalizeOracion).filter(Boolean);
  } else {
    try{
      const r=await fetchWithTimeout(`${apiUrl}?action=getOraciones&mode=practice`,{},8000);
      const d=await r.json();
      oraciones=(Array.isArray(d.oraciones)&&d.oraciones.length>0?d.oraciones:getMock()).map(normalizeOracion).filter(Boolean);
    }catch{oraciones=getMock().map(normalizeOracion).filter(Boolean);}
  }

  // Extract all sintagmas with ≥2 valid elements
  const allSint=oraciones.flatMap(o=>{
    const sint4=o.fase4?.sintagmas||[];
    return sint4.filter(s=>Array.isArray(s.elementos)&&s.elementos.length>=2)
      .map(s=>({
        ...s,
        elementos: s.elementos.map(e=>({
          id: e.id||`e_${Math.random().toString(36).slice(2)}`,
          texto: e.texto||'',
          solucion: (e.solucion&&e.solucion!=='undefined')?e.solucion:'N',
          consejo: (e.consejo&&e.consejo!=='undefined')?e.consejo:'',
        })).filter(e=>e.texto&&e.solucion),
        titulo: s.titulo||'Sintagma',
        oracion: o.oracion_completa||o.palabras?.join(' ')||'',
      }));
  });

  // ── Priorización pedagógica de sintagmas ──
  // Score: SN/SAdj con subelementos > SN sujeto > SP simple
  function sintPriority(s){
    const tipo=extractSintType(s.titulo);
    const hasChildren=s.elementos.some(e=>['SN/T','SAdj/T','SAdv/T','SP/T','SPrep/CN','SAdj/CN','SN/CN'].includes(e.solucion));
    const isSujeto=(s.titulo||'').includes('Sujeto');
    if((tipo==='SN'||tipo==='SAdj')&&hasChildren) return 3; // SN/SAdj complejos → prioridad máxima
    if(isSujeto) return 2; // Sujetos → prioridad alta
    if(tipo==='SN'||tipo==='SAdj'||tipo==='SAdv') return 1; // Otros SN/SAdj/SAdv
    return 0; // SP simples → prioridad baja
  }
  // Shuffle within priority groups, then concatenate high→low
  const grouped={3:[],2:[],1:[],0:[]};
  allSint.forEach(s=>{ const p=sintPriority(s); (grouped[p]||(grouped[0]=[])). push(s); });
  const prioritized=[...shuffle(grouped[3]),...shuffle(grouped[2]),...shuffle(grouped[1]),...shuffle(grouped[0])];

  // Apply sintagma type filter (from teacher panel or mission)
  let filtered = prioritized;
  const sintTypeFilter = window._activeMission?.sintTypes || [...document.querySelectorAll('#tp-mis-sint-types input:checked')].map(c=>c.value);
  if(sintTypeFilter && sintTypeFilter.length > 0){
    filtered = prioritized.filter(s => {
      const tipo = extractSintType(s.titulo);
      return sintTypeFilter.includes(tipo);
    });
    if(filtered.length === 0) filtered = prioritized; // fallback if filter too restrictive
  }

  if(filtered.length===0){
    showScreen('sintagmas');
    document.getElementById('sint-wrap').innerHTML=errorCard('Sin sintagmas disponibles',
      'Las oraciones cargadas no tienen análisis de sintagmas (Fase 4). Completa los JSONs de la hoja de cálculo.');
    return;
  }

  SIN={name,email,sintagmas:filtered,idx:0,correct:0,errors:0,total:filtered.length,
       step:0, // 0=tipo, 1=nucleo, 2=clasificar elementos
       currentSint:null,doneElems:{}};
  renderSintMain();
  showScreen('sintagmas');
}

function renderSintMain(){
  try{
  while(SIN.idx < SIN.sintagmas.length){
    const s=SIN.sintagmas[SIN.idx];
    const valid=s.elementos.filter(e=>e.texto&&e.solucion&&e.solucion!=='undefined');
    if(valid.length>=2) break;
    SIN.idx++;
  }
  if(SIN.idx>=SIN.sintagmas.length){endSint();return;}

  const s=SIN.sintagmas[SIN.idx];
  SIN.currentSint=s;
  SIN.doneElems={};
  document.getElementById('sint-counter').textContent=`${SIN.idx+1}/${SIN.sintagmas.length}`;

  // Separate top-level from children
  const topElems=_sintTopLevel(s.elementos);
  const correctType=extractSintType(s.titulo);

  // Initialize level stack
  SIN.levelStack=[{title:s.titulo||'Sintagma',type:correctType,elems:topElems,allElems:s.elementos,done:{}}];
  SIN.currentLevelIdx=0;

  const wrap=document.getElementById('sint-wrap');
  wrap.innerHTML=`
    <div class="folio-sheet" style="padding:24px 30px 20px 70px;margin-bottom:16px">
      <div style="font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;
        color:var(--muted);margin-bottom:6px;font-family:'Nunito',sans-serif">
        ${s.oracion?.slice(0,90)||''}${(s.oracion?.length||0)>90?'\u2026':''}
      </div>
      <div id="sint-header-words" style="font-family:'Lora',serif;font-size:1.35rem;font-weight:700;color:var(--ink);
        display:flex;flex-wrap:wrap;gap:6px 10px;line-height:1.6">
        ${topElems.map(e=>'<span class="sint-word" data-id="'+e.id+'" style="background:rgba(37,99,235,.08);border:1.5px solid rgba(37,99,235,.25);border-radius:8px;padding:4px 12px">'+e.texto+'</span>').join('')}
      </div>
    </div>
    <div id="sint-steps"></div>
    <div style="text-align:center;margin-top:12px">
      <button type="button" class="btn btn-ghost btn-sm" onclick="sintSkipNew()" style="font-size:.78rem;color:var(--muted)">Saltar \u2192</button>
    </div>`;
  _sintStartLevel();
  }catch(e){
    console.error('[renderSintMain]',e);
    document.getElementById('sint-wrap').innerHTML=errorCard('Error en Sintagmas',e.message);
  }
}

function _sintTopLevel(elems){
  // Filter: keep elements that are NOT a sub-part of a longer element
  // Uses word-boundary matching to avoid "tu" being matched inside "tus"
  const seen = new Map();
  elems.forEach(e => {
    const existing = seen.get(e.texto);
    if (!existing) { seen.set(e.texto, e); }
    else {
      const eIsSub = e.solucion.includes('/') || e.solucion.includes('T');
      const exIsSub = existing.solucion.includes('/') || existing.solucion.includes('T');
      if (eIsSub && !exIsSub) seen.set(e.texto, e);
    }
  });
  const deduped = [...seen.values()];
  return deduped.filter(e=>!deduped.some(o=>o.id!==e.id&&o.texto.length>e.texto.length&&_containsWholeWords(o.texto,e.texto)));
}
/** Checks if parentText contains childText as a sequence of whole words (not as substring of another word) */
function _containsWholeWords(parentText, childText){
  try{
    const escaped = childText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp('(?:^|\\s)'+escaped+'(?:\\s|$)').test(parentText);
  }catch(e){return false;}
}
function _sintChildren(parentElem, allElems){
  return allElems.filter(e=>e.id!==parentElem.id&&_containsWholeWords(parentElem.texto,e.texto));
}

// Los pasos se van ACUMULANDO en #sint-steps (nunca se borran, para que el
// alumno pueda repasar lo ya resuelto). En un sintagma con varios niveles
// (p.ej. un SP con un SN dentro) eso puede crecer bastante. En pantallas
// estrechas (<480px, CSS) el contenedor tiene altura máxima con scroll
// interno; este helper es lo que mantiene visible el paso recién añadido
// sin que el alumno tenga que buscarlo desplazándose.
function _sintAppendStep(html){
  const steps=document.getElementById('sint-steps');
  if(!steps) return;
  steps.innerHTML+=html;
  if(window.innerWidth<=480) steps.scrollTop=steps.scrollHeight;
}

function _sintStartLevel(){
  const level=SIN.levelStack[SIN.currentLevelIdx];
  const isSubLevel=SIN.currentLevelIdx>0;
  if(isSubLevel){
    _sintAppendStep(`<div style="border-left:4px solid var(--purple);padding:8px 14px;margin:14px 0 8px;
      background:var(--purple-lt);border-radius:0 10px 10px 0;animation:slideUp .3s ease">
      <span style="font-size:.82rem;font-weight:800;color:var(--purple)">
        \ud83d\udd3d Analiza el interior de: \u201c${level.title}\u201d
      </span>
    </div>`);
    const hdr=document.getElementById('sint-header-words');
    if(hdr){
      hdr.innerHTML=level.elems.map(e=>'<span class="sint-word" data-id="'+e.id+'" style="background:rgba(124,58,237,.08);border:1.5px solid rgba(124,58,237,.3);border-radius:8px;padding:4px 12px">'+e.texto+'</span>').join('');
    }
  }
  // PASO 1: Elegir núcleo
  _sintStep1Nucleus();
}

// ── PASO 1: Seleccionar el núcleo ────────────────────────────────────
function _sintStep1Nucleus(){
  const level=SIN.levelStack[SIN.currentLevelIdx];
  const nuclei=level.elems.filter(e=>e.solucion==='N'||e.solucion==='N (enlace)');
  if(nuclei.length===0){_sintStep2Classify();return;}
  const lvl=SIN.currentLevelIdx;
  _sintAppendStep(`
    <div class="card" style="padding:20px 22px;margin-bottom:14px;animation:slideUp .3s ease">
      <div style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
        color:var(--muted);margin-bottom:8px">Paso 1 \u2014 N\u00facleo y tipo</div>
      <div style="font-size:.85rem;color:var(--ink2);margin-bottom:12px">
        Haz clic en la palabra que es el <strong>n\u00facleo</strong> del sintagma.
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="sint-nuc-${lvl}">
        ${level.elems.map(e=>'<button type="button" class="casc-btn" style="font-family:\'Lora\',serif;font-size:1.05rem" onclick="_sintCheckNucleus(\''+e.id+'\','+lvl+')">'+e.texto+'</button>').join('')}
      </div>
      <div id="sint-nuc-msg-${lvl}" style="margin-top:10px;display:none"></div>
      <div id="sint-type-${lvl}" style="margin-top:12px;display:none"></div>
    </div>`);
}

function _sintCheckNucleus(chosenId, lvlIdx){
  const level=SIN.levelStack[lvlIdx];
  const nucleusIds=new Set(level.elems.filter(e=>e.solucion==='N'||e.solucion==='N (enlace)').map(e=>e.id));
  const isCorrect=nucleusIds.has(chosenId);
  const chosenElem=level.elems.find(e=>e.id===chosenId);
  const msg=document.getElementById('sint-nuc-msg-'+lvlIdx);
  if(isCorrect){
    document.querySelectorAll('#sint-nuc-'+lvlIdx+' .casc-btn').forEach(b=>b.disabled=true);
    level.elems.filter(e=>nucleusIds.has(e.id)).forEach(e=>{level.done[e.id]=true;SIN.doneElems[e.id]=true;});
    SIN.correct++;playSuccess();
    showCorrectFlash('¡Núcleo correcto!');
    const label=chosenElem?.solucion==='N (enlace)'?'N (enlace)':'N \u2014 N\u00facleo';
    msg.style.display='block';
    msg.innerHTML='<span style="color:#059669;font-weight:700">\u2713 '+label+': \u201c'+chosenElem?.texto+'\u201d</span>';
    document.querySelectorAll('#sint-header-words .sint-word').forEach(w=>{
      if(w.dataset.id===chosenId){w.style.background='#DCFCE7';w.style.borderColor='#16A34A';}
    });
    // Ahora: elegir el TIPO de sintagma
    setTimeout(()=>_sintStep1Type(lvlIdx),500);
  }else{
    SIN.errors++;playError();
    msg.style.display='block';
    msg.innerHTML='<span style="color:#DC2626;font-size:.85rem">\u2717 Incorrecto. El n\u00facleo es la palabra central del sintagma.</span>';
    setTimeout(()=>{msg.innerHTML='';msg.style.display='none';},2000);
  }
}

// ── PASO 1b: Elegir el tipo de sintagma ──────────────────────────────
function _sintStep1Type(lvlIdx){
  const level=SIN.levelStack[lvlIdx];
  const correctType=level.type;
  const allTypes=['SN','SP','SAdj','SAdv','SV'];
  // Generar opciones: la correcta + 2 trampas aleatorias
  const traps=shuffle(allTypes.filter(t=>t!==correctType)).slice(0,2);
  const opts=shuffle([correctType,...traps]);
  const typeLabels={'SN':'Sintagma Nominal (SN)','SP':'Sintagma Preposicional (SP)','SAdj':'Sintagma Adjetival (SAdj)','SAdv':'Sintagma Adverbial (SAdv)','SV':'Sintagma Verbal (SV)'};
  const wrap=document.getElementById('sint-type-'+lvlIdx);
  wrap.style.display='block';
  wrap.innerHTML=`
    <div style="font-size:.85rem;color:var(--ink2);margin-bottom:8px">
      \u00bfQu\u00e9 tipo de sintagma es?
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px" id="sint-type-opts-${lvlIdx}">
      ${opts.map(t=>'<button type="button" class="casc-btn" style="font-size:.85rem;padding:8px 16px" onclick="_sintCheckType(\''+t+'\','+lvlIdx+')">'+(typeLabels[t]||t)+'</button>').join('')}
    </div>
    <div id="sint-type-msg-${lvlIdx}" style="margin-top:8px;display:none"></div>`;
}

function _sintCheckType(chosen, lvlIdx){
  const level=SIN.levelStack[lvlIdx];
  const correct=level.type;
  const msg=document.getElementById('sint-type-msg-'+lvlIdx);
  if(chosen===correct){
    document.querySelectorAll('#sint-type-opts-'+lvlIdx+' .casc-btn').forEach(b=>b.disabled=true);
    SIN.correct++;playSuccess();
    const typeNames={'SN':'sintagma nominal','SAdj':'sintagma adjetival','SAdv':'sintagma adverbial','SP':'sintagma preposicional','SV':'sintagma verbal'};
    showCorrectFlash('¡' + (typeNames[correct]||correct) + ' correcto!');
    msg.style.display='block';
    msg.innerHTML='<span style="color:#059669;font-weight:700">\u2713 Correcto. Es un '+(typeNames[correct]||correct)+' ('+correct+')</span>';
    setTimeout(()=>_sintStep2Classify(),700);
  }else{
    SIN.errors++;playError();
    msg.style.display='block';
    msg.innerHTML='<span style="color:#DC2626;font-size:.85rem">\u2717 Incorrecto. Piensa en la categor\u00eda del n\u00facleo.</span>';
    setTimeout(()=>{msg.style.display='none';},2000);
  }
}

// ── PASO 2: Clasificar elementos con cajas trampa ────────────────────
function _sintStep2Classify(){
  const level=SIN.levelStack[SIN.currentLevelIdx];
  const remaining=level.elems.filter(e=>!level.done[e.id]);
  if(remaining.length===0){_sintCheckLevelComplete();return;}

  const funcLabels={
    'Mod/Det.':'Mod. Determinante','Mod/Cuant.':'Mod. Cuantificador','Mod.':'Modificador','Mod/Adj.':'Mod. Adjetival',
    'SN/CN':'SN \u2014 Complemento del nombre','SAdj/CN':'SAdj \u2014 Complemento del nombre',
    'SPrep/CN':'SP \u2014 Complemento del nombre',
    'CAdj':'Complemento del adjetivo','CAdv':'Complemento del adverbio',
    'SN/T':'SN \u2014 T\u00e9rmino','SAdj/T':'SAdj \u2014 T\u00e9rmino','SAdv/T':'SAdv \u2014 T\u00e9rmino','SP/T':'SP \u2014 T\u00e9rmino',
    'Nexo':'Nexo','Aposici\u00f3n':'Aposici\u00f3n',
  };
  // Pool de funciones trampa (funciones válidas de sintagma)
  const trapPool=['Mod/Det.','Mod/Cuant.','SAdj/CN','SPrep/CN','SN/CN','CAdj','CAdv','SN/T','SAdj/T','SAdv/T','Nexo','Aposici\u00f3n','Mod/Adj.'];
  const correctFuncs=new Set(remaining.map(e=>e.solucion));

  let html='<div class="card" style="padding:20px 22px;margin-bottom:14px;animation:slideUp .3s ease"><div style="font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:8px">Paso 2 \u2014 Clasifica cada elemento</div>';

  remaining.forEach(e=>{
    // Generar opciones: la correcta + 2-3 trampas
    const myTraps=shuffle(trapPool.filter(t=>t!==e.solucion&&!correctFuncs.has(t))).slice(0,2);
    const opts=shuffle([e.solucion,...myTraps,...[...correctFuncs].filter(f=>f!==e.solucion).slice(0,1)]);
    // Deduplicar
    const uniqueOpts=[...new Set(opts)];

    html+='<div id="scr-'+e.id+'" style="background:var(--paper);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px"><div style="font-family:\'Lora\',serif;font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:10px">\u201c'+e.texto+'\u201d</div><div style="display:flex;flex-wrap:wrap;gap:6px" id="scb-'+e.id+'">';
    uniqueOpts.forEach(f=>{
      html+='<button type="button" class="casc-btn" style="font-size:.82rem;padding:6px 12px" onclick="_sintClassifyElem(\''+e.id+'\',\''+f.replace(/'/g,"\\'")+'\')">'+(funcLabels[f]||f)+'</button>';
    });
    html+='</div><div id="scm-'+e.id+'" style="margin-top:6px;display:none"></div></div>';
  });
  html+='</div>';
  _sintAppendStep(html);
}

function _sintClassifyElem(elemId, chosen){
  const level=SIN.levelStack[SIN.currentLevelIdx];
  const elem=level.elems.find(e=>e.id===elemId);
  if(!elem||level.done[elemId]) return;
  const correct=elem.solucion;
  const isOk=chosen===correct;
  const msg=document.getElementById('scm-'+elemId);
  if(isOk){
    document.querySelectorAll('#scb-'+elemId+' .casc-btn').forEach(b=>{
      b.disabled=true;
      if(b.getAttribute('onclick')&&b.getAttribute('onclick').indexOf("'"+chosen+"'")>=0) b.classList.add('cs-correct');
    });
    level.done[elemId]=true;SIN.doneElems[elemId]=true;SIN.correct++;playSuccess();
    showCorrectFlash('¡Correcto!');
    msg.style.display='block';
    msg.innerHTML='<span style="color:#059669;font-weight:700;font-size:.82rem">\u2713 Correcto</span>';
    document.querySelectorAll('#sint-header-words .sint-word').forEach(w=>{
      if(w.dataset.id===elemId){w.style.background='#DCFCE7';w.style.borderColor='#16A34A';}
    });
    // PASO 3: Si es SP (CN, CAdj, CAdv) → drill down
    const isSP=['SPrep/CN','CAdj','CAdv'].includes(chosen);
    const isTermino=['SN/T','SAdj/T','SAdv/T','SP/T'].includes(chosen);
    const isCN=['SN/CN','SAdj/CN'].includes(chosen);
    if(isSP||isTermino||isCN){
      const children=_sintChildren(elem, level.allElems);
      if(children.length>0){
        const subType=chosen.split('/')[0].replace('SPrep','SP');
        setTimeout(()=>{
          SIN.levelStack.push({title:elem.texto,type:subType,elems:_sintTopLevel(children),allElems:children,done:{}});
          SIN.currentLevelIdx=SIN.levelStack.length-1;
          _sintStartLevel();
        },800);
        return;
      }
    }
    _sintCheckLevelComplete();
  }else{
    SIN.errors++;playError();
    const scaffold=lookupScaffold(chosen,correct,'sintagma');
    trackError('sintagmas',correct);
    showFeedback('error','Función incorrecta',scaffold.fijo,scaffold.pista);
  }
}

function _sintCheckLevelComplete(){
  const level=SIN.levelStack[SIN.currentLevelIdx];
  const remaining=level.elems.filter(e=>!level.done[e.id]);
  if(remaining.length>0) return;
  if(SIN.currentLevelIdx>0){
    SIN.currentLevelIdx--;
    const parentLevel=SIN.levelStack[SIN.currentLevelIdx];
    const parentRemaining=parentLevel.elems.filter(e=>!parentLevel.done[e.id]);
    if(parentRemaining.length>0){
      const hdr=document.getElementById('sint-header-words');
      if(hdr){
        hdr.innerHTML=parentLevel.elems.map(e=>'<span class="sint-word" data-id="'+e.id+'" style="background:'+(parentLevel.done[e.id]?'#DCFCE7':'rgba(37,99,235,.08)')+';border:1.5px solid '+(parentLevel.done[e.id]?'#16A34A':'rgba(37,99,235,.25)')+';border-radius:8px;padding:4px 12px">'+e.texto+'</span>').join('');
      }
      setTimeout(()=>_sintStep2Classify(),500);
      return;
    }
  }
  setTimeout(()=>sintNextSintagma(),800);
}

function sintNextSintagma(){SIN.idx++;if(SIN.idx>=SIN.sintagmas.length){endSint();return;}renderSintMain();}
function sintSkipNew(){SIN.idx++;if(SIN.idx>=SIN.sintagmas.length){endSint();return;}renderSintMain();}

function endSint(){
  const wrap=document.getElementById('sint-wrap');
  const total=SIN.correct+SIN.errors;
  const pct=total>0?Math.round(SIN.correct/total*100):0;
  const nota=total>0?(SIN.correct/total*10).toFixed(1):'0.0';
  const color=pct>=80?'#059669':pct>=60?'#D97706':'#DC2626';
  const emoji=pct>=80?'\ud83c\udfc6':pct>=60?'\ud83c\udfaf':'\ud83d\udcda';
  wrap.innerHTML='<div class="card" style="padding:32px;text-align:center;animation:slideUp .4s ease;max-width:480px;margin:30px auto"><div style="font-size:2.5rem;margin-bottom:12px">'+emoji+'</div><h2 style="font-size:1.8rem;font-weight:900;margin-bottom:6px">Sesi\u00f3n completada</h2><div style="font-size:3rem;font-weight:900;color:'+color+';margin:12px 0">'+nota+'<span style="font-size:1.2rem;color:var(--muted)"> / 10</span></div><p style="font-size:1rem;font-weight:700;margin-bottom:4px">'+SIN.correct+' aciertos \u00b7 '+SIN.errors+' errores</p><p style="color:var(--muted);font-size:.88rem;margin-bottom:24px">'+SIN.sintagmas.length+' sintagmas analizados</p><div style="display:flex;flex-direction:column;gap:10px"><button type="button" class="btn btn-primary btn-lg" onclick="startSintagmas({name:SIN.name,email:SIN.email})">\ud83d\udd04 Otra ronda</button><button type="button" class="btn btn-ghost" onclick="goLogin()">\u2190 Inicio</button></div></div>';
}

// Public API exports + window bindings para inline onclick
export {
  getSintFullName, extractSintType,
  startSintagmas, renderSintMain,
  sintNextSintagma, sintSkipNew, endSint,
  SINT_FULL_NAMES, SINT_TYPES, SINT_FUNCIONES_MOD, SINT_FUNCIONES_COMP, SINT_FUNCIONES_TERM
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startSintagmas, sintNextSintagma, sintSkipNew, endSint,
    // Invocadas desde onclick="..." en el HTML que renderiza este módulo.
    // Sin esta exposición los botones de los pasos 1, 1b y 2 no hacen nada
    // (el modo quedaba congelado en "Haz clic en el núcleo").
    _sintCheckNucleus, _sintCheckType, _sintClassifyElem
  });
  Object.defineProperty(window, "SIN", { get: () => SIN, configurable: true });
}
