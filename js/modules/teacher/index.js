/* teacher/index.js — Panel del profesor (config, examenes, misiones)
   Extraido de index.html (Paso 9.6 de la migracion, mayo 2026)
   Lineas originales: 4137-4504, 368 lineas.

   26 declaraciones top-level. Incluye:
   - Config: loadTeacherPanel, saveApiUrl, savePin, genPin, saveTimer,
     saveExamFilters, activateExam, testApiUrl, testCurrentPin,
     setExamSubfase, updateSubfaseBtns, updateFilterPreview, flashTp.
   - Misiones: createMision, viewMisiones, deleteMision,
     getMisionesForMode, showMissionSelector, closeMissionSelector,
     launchMission, launchReinforcement, startFreePlay.
   - Estado misiones: _pendingMissionLaunch, _activeMission,
     _cachedMisiones, _misionesCacheTime.

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): SUBFASE_CONFIGS, LS_API, LS_PIN, LS_TIMER, DEFAULT_API_URL,
   getApiUrl, fetchWithTimeout, fetchWithRetry, getTeacherPw,
   showScreen, _activateExamFilters, openOverlay, closeOverlay,
   loadProgress, saveProgress, FUNC_ORAC, escHtml, awardXP, _doHandleStart,
   _launchGame, normalizeOracion, etc. (Teacher Panel toca muchas cosas
   del resto de la app, por eso esta entrelazado en el original).*/

// ════════════════════════════════════════════════════════
// TEACHER PANEL
// ════════════════════════════════════════════════════════
function loadTeacherPanel(){
  document.getElementById('tp-apiurl').value=localStorage.getItem(LS_API)||DEFAULT_API_URL||'';
  document.getElementById('tp-pin').value=localStorage.getItem(LS_PIN)||'';
  document.getElementById('tp-pin-display').textContent=localStorage.getItem(LS_PIN)||'—';
  document.getElementById('tp-timer').value=localStorage.getItem(LS_TIMER)||'0';
  // Load subfase
  const sf=localStorage.getItem('taller_exam_subfase')||'completo';
  updateSubfaseBtns(sf);
  document.getElementById('tp-subfase-active').textContent=SUBFASE_CONFIGS[sf]?.label||'Completo';
  // Load filters
  const savedFilters=JSON.parse(localStorage.getItem('taller_exam_filters')||'{}');
  if(savedFilters.funciones){
    document.querySelectorAll('#tp-func-checks input').forEach(cb=>{
      cb.checked=savedFilters.funciones.includes(cb.value);
    });
  }
  if(savedFilters.dificultad){
    document.getElementById('tp-dif-range').value=savedFilters.dificultad;
  }
  if(savedFilters.examCount){
    document.getElementById('tp-exam-count').value=savedFilters.examCount;
  }
  updateFilterPreview();
}
function setExamSubfase(sf){
  localStorage.setItem('taller_exam_subfase',sf);
  updateSubfaseBtns(sf);
  document.getElementById('tp-subfase-active').textContent=SUBFASE_CONFIGS[sf]?.label||sf;
  flashTp('✓ Subfase guardada.','var(--green)');
}
function updateSubfaseBtns(sf){
  ['solo_np','np_sujeto','completo'].forEach(k=>{
    const btn=document.getElementById('tp-sf-'+k);
    if(!btn)return;
    const isActive=k===sf;
    const colors={solo_np:'--blue',np_sujeto:'--purple',completo:'--green'};
    const c=colors[k]||'--blue';
    btn.style.cssText=isActive
      ?'border:2px solid var('+c+');color:var('+c+');background:var('+c.replace(')','-lt)')+';font-weight:800'
      :'border:2px solid var(--border);color:var(--muted);background:var(--paper)';
  });
}
function updateFilterPreview(){
  const checks=[...document.querySelectorAll('#tp-func-checks input:checked')].map(c=>c.value);
  const dif=parseInt(document.getElementById('tp-dif-range').value)||0;
  const difLabel=document.getElementById('tp-dif-label');
  difLabel.textContent=dif===0?'Todas':dif+'';
  const preview=document.getElementById('tp-filter-preview');
  const parts=[];
  if(checks.length>0)parts.push('Funciones: '+checks.join(', '));
  if(dif>0)parts.push('Dificultad ≤ '+dif);
  const ec=parseInt(document.getElementById('tp-exam-count')?.value)||0;
  if(ec>0)parts.push(ec+' oraciones');
  preview.textContent=parts.length>0?parts.join(' · '):'Sin filtros activos — se usarán todas las oraciones.';
  preview.style.color=parts.length>0?'var(--blue)':'var(--muted)';
  preview.style.fontWeight=parts.length>0?'700':'400';
}
function saveExamFilters(){
  const checks=[...document.querySelectorAll('#tp-func-checks input:checked')].map(c=>c.value);
  const dif=parseInt(document.getElementById('tp-dif-range').value)||0;
  const examCount=parseInt(document.getElementById('tp-exam-count').value)||0;
  localStorage.setItem('taller_exam_filters',JSON.stringify({funciones:checks,dificultad:dif,examCount}));
  flashTp('✓ Filtros guardados.','var(--green)');
}
function saveApiUrl(){localStorage.setItem(LS_API,document.getElementById('tp-apiurl').value.trim());flashTp('✓ URL guardada.','var(--green)');}
async function testApiUrl(){
  const url=getApiUrl();if(!url){flashTp('⚠ Guarda la URL primero.','var(--amber)');return;}
  flashTp('Probando…','var(--muted)');
  try{const r=await fetchWithTimeout(url,{},8000);const d=await r.json();
    if(Array.isArray(d.oraciones))flashTp(`✓ ${d.oraciones.length} oraciones cargadas.`,'var(--green)');else flashTp('⚠ Sin campo "oraciones".','var(--amber)');
  }catch(e){flashTp(`✕ ${e.message.includes('aborted')?'Tiempo agotado.':e.message}`,'var(--red)');}
}
function savePin(){const v=document.getElementById('tp-pin').value.trim();if(v.length!==4||!/^\d+$/.test(v)){flashTp('El PIN debe tener 4 dígitos.','var(--red)');return;}localStorage.setItem(LS_PIN,v);document.getElementById('tp-pin-display').textContent=v;flashTp(`✓ PIN ${v} activado.`,'var(--green)');}
function genPin(){document.getElementById('tp-pin').value=String(Math.floor(1000+Math.random()*9000));}
function saveTimer(){const v=Math.max(0,parseInt(document.getElementById('tp-timer').value||'0',10));localStorage.setItem(LS_TIMER,v);flashTp(`✓ ${v} min${v===0?' (sin límite)':''}.`,'var(--green)');}

async function activateExam(){
  const status=document.getElementById('tp-exam-status');
  const pin=document.getElementById('tp-pin').value.trim();
  if(!pin||pin.length!==4||!/^\d+$/.test(pin)){
    status.textContent='⚠ Genera un PIN de 4 dígitos primero.';status.style.color='var(--red)';status.style.display='block';return;
  }
  const apiUrl=getApiUrl();
  if(!apiUrl){status.textContent='⚠ Configura la URL de la API primero.';status.style.color='var(--red)';status.style.display='block';return;}
  const checks=[...document.querySelectorAll('#tp-func-checks input:checked')].map(c=>c.value);
  const prohib=[...document.querySelectorAll('#tp-func-prohib input:checked')].map(c=>c.value);
  const dif=parseInt(document.getElementById('tp-dif-range').value)||0;
  const examCount=parseInt(document.getElementById('tp-exam-count').value)||0;
  const timerMin=parseInt(document.getElementById('tp-timer').value)||0;
  const subfase=localStorage.getItem('taller_exam_subfase')||'completo';
  const grupo=document.getElementById('tp-exam-grupo').value.trim();
  const evaluacion=document.getElementById('tp-exam-eval').value.trim();
  const nombreExamen=document.getElementById('tp-exam-name').value.trim();
  status.textContent='⏳ Enviando configuración al Sheet…';status.style.color='var(--blue)';status.style.display='block';
  try{
    const params=new URLSearchParams({
      action:'createExam',pin,funciones:JSON.stringify(checks),prohibidas:JSON.stringify(prohib),
      minCoincidencias:'1',
      dificultad:String(dif),nOraciones:String(examCount),timerMin:String(timerMin),subfase,
      grupo,evaluacion,nombreExamen
    });
    const r=await fetchWithRetry(apiUrl+'?'+params.toString(), {}, {
      timeoutMs: 12000,
      retries: 2,
      onRetry: (n, err) => {
        status.textContent = '⏳ Reintentando ('+n+'/2)…';
        status.style.color = 'var(--amber)';
      }
    });
    const d=await r.json();
    if(d.ok){
      localStorage.setItem(LS_PIN,pin);
      document.getElementById('tp-pin-display').textContent=pin;
      const nReal = d.nOracionesReales || examCount || '?';
      const parts=['PIN: '+pin, nReal+' oraciones pre-cargadas'];
      if(timerMin>0) parts.push(timerMin+' min');
      if(checks.length>0) parts.push('Objetivo: '+checks.join(', '));
      if(prohib.length>0) parts.push('🚫 '+prohib.join(', '));
      status.textContent='✓ Examen activado. '+parts.join(' · ');
      status.style.color='var(--green)';
    }else{
      status.textContent='⚠ Error: '+(d.error||'desconocido');status.style.color='var(--red)';
    }
  }catch(e){
    // The GAS may have actually created the exam despite the timeout.
    // Verify with a separate call before showing an error.
    status.textContent='⏳ Sin respuesta. Verificando si el examen se creó…';
    status.style.color='var(--amber)';
    try{
      await new Promise(r=>setTimeout(r, 1500)); // give GAS a moment to finish
      const verify=await fetchWithTimeout(apiUrl+'?action=getExamConfig&pin='+encodeURIComponent(pin),{},10000);
      const vd=await verify.json();
      if(vd.ok && vd.oraciones && vd.oraciones.length>0){
        localStorage.setItem(LS_PIN,pin);
        document.getElementById('tp-pin-display').textContent=pin;
        status.textContent='✓ El examen se creó correctamente (PIN '+pin+', '+vd.oraciones.length+' oraciones). El timeout era solo de la respuesta.';
        status.style.color='var(--green)';
      } else {
        status.textContent='⚠ Error: '+e.message+'. El examen no se creó. Inténtalo de nuevo.';
        status.style.color='var(--red)';
      }
    }catch(e2){
      status.textContent='⚠ Error de conexión: '+e.message;status.style.color='var(--red)';
    }
  }
}
function flashTp(msg,color){const el=document.getElementById('tp-api-test');el.textContent=msg;el.style.color=color;el.style.display='block';}

// Verify exam PIN by simulating a student request
async function testCurrentPin(){
  const status=document.getElementById('tp-exam-status');
  const pin=document.getElementById('tp-pin-display').textContent.trim();
  if(!pin || pin==='—' || pin.length!==4){
    status.style.display='block';
    status.textContent='⚠ No hay PIN activo. Crea un examen primero.';
    status.style.color='var(--amber)';
    return;
  }
  const apiUrl=getApiUrl();
  if(!apiUrl){
    status.style.display='block';
    status.textContent='⚠ Sin URL de API configurada.';
    status.style.color='var(--red)';
    return;
  }
  status.style.display='block';
  status.textContent='⏳ Comprobando PIN '+pin+'…';
  status.style.color='var(--blue)';
  try{
    const r=await fetchWithRetry(apiUrl+'?action=getExamConfig&pin='+encodeURIComponent(pin), {}, {
      timeoutMs: 10000,
      retries: 2,
      onRetry: (n) => { status.textContent='⏳ Reintentando ('+n+'/2)…'; status.style.color='var(--amber)'; }
    });
    const d=await r.json();
    if(d.ok){
      const n=d.oraciones?.length||0;
      status.textContent='✓ PIN '+pin+' funciona correctamente · '+n+' oraciones cargadas';
      status.style.color='var(--green)';
    } else {
      status.textContent='⚠ PIN '+pin+': '+(d.error||'error desconocido');
      status.style.color='var(--red)';
    }
  } catch(e){
    status.textContent='⚠ Error de conexión: '+e.message;
    status.style.color='var(--red)';
  }
}

// ════════════════════════════════════════════════════════
// MISSION SYSTEM v6.0
// ════════════════════════════════════════════════════════
let _pendingMissionLaunch = null; // stores launch params while mission selector is open
let _activeMission = null; // current mission being played

async function createMision(){
  const name = document.getElementById('tp-mis-name').value.trim();
  const modo = document.getElementById('tp-mis-modo').value;
  const n    = parseInt(document.getElementById('tp-mis-n').value)||5;
  const funcs= [...document.querySelectorAll('#tp-mis-funcs input:checked')].map(c=>c.value);
  const sintTypes=[...document.querySelectorAll('#tp-mis-sint-types input:checked')].map(c=>c.value);
  const msg  = document.getElementById('tp-mis-msg');
  if(!name){msg.textContent='Escribe un nombre.';msg.style.color='var(--red)';msg.style.display='inline';return;}
  const id = 'M'+Date.now().toString(36).toUpperCase();
  const pin = localStorage.getItem(LS_PIN)||'';
  const mision={id,nombre:name,modo,subfase:'completo',funciones:funcs,sintTypes,dificultad:0,nOraciones:n,pin,estado:'activa',creado:new Date().toISOString().slice(0,10)};
  // Save to localStorage (backup)
  const saved = JSON.parse(localStorage.getItem('taller_misiones')||'[]');
  saved.push(mision);
  localStorage.setItem('taller_misiones',JSON.stringify(saved));
  // CRITICAL: Save to Sheets so students can see it
  const apiUrl=getApiUrl();
  if(apiUrl){
    try{
      const params=new URLSearchParams({
        action:'createMision',id,nombre:name,modo,subfase:'completo',
        funciones:JSON.stringify(funcs),dificultad:'0',nOraciones:String(n),
        pin,estado:'activa'
      });
      await fetchWithTimeout(apiUrl+'?'+params.toString(),{},8000);
      msg.textContent='✓ Misión "'+name+'" creada y sincronizada.';msg.style.color='var(--green)';
    }catch(e){
      msg.textContent='✓ Misión creada localmente (⚠ no se pudo sincronizar con Sheets).';msg.style.color='var(--amber)';
    }
  }else{
    msg.textContent='✓ Misión creada (sin conexión a Sheets).';msg.style.color='var(--amber)';
  }
  msg.style.display='inline';
  document.getElementById('tp-mis-name').value='';
  setTimeout(()=>{msg.style.display='none';},4000);
}

async function viewMisiones(){
  const list = document.getElementById('tp-mis-list');
  list.innerHTML='<p style="font-size:.82rem;color:var(--muted)">⏳ Cargando misiones…</p>';
  list.style.display='block';
  const apiUrl=getApiUrl();
  let misiones=[];
  if(apiUrl){
    try{
      const r=await fetchWithTimeout(apiUrl+'?action=getMisiones',{},6000);
      const d=await r.json();
      if(d.misiones) misiones=d.misiones.filter(m=>m.estado==='activa');
    }catch(e){console.warn('[viewMisiones]',e);}
  }
  // Also check localStorage as fallback
  const local=JSON.parse(localStorage.getItem('taller_misiones')||'[]').filter(m=>m.estado==='activa');
  // Merge: add local missions not already in Sheets
  const sheetIds=new Set(misiones.map(m=>m.id));
  local.forEach(m=>{if(!sheetIds.has(m.id)) misiones.push(m);});
  if(misiones.length===0){
    list.innerHTML='<p style="font-size:.82rem;color:var(--muted)">No hay misiones activas.</p>';
    return;
  }
  list.innerHTML=misiones.map((m,i)=>
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--paper);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">'+
    '<div><strong style="font-size:.88rem">'+m.nombre+'</strong> <span style="font-size:.75rem;color:var(--muted)">'+m.modo+' · '+(m.nOraciones||'∞')+' ej.'+(m.funciones&&m.funciones.length>0?' · '+m.funciones.join(', '):'')+' </span></div>'+
    '</div>'
  ).join('');
}

function deleteMision(idx){
  const saved = JSON.parse(localStorage.getItem('taller_misiones')||'[]');
  saved.splice(idx,1);
  localStorage.setItem('taller_misiones',JSON.stringify(saved));
  viewMisiones();
}

let _cachedMisiones = null;
let _misionesCacheTime = 0;
async function getMisionesForMode(modo){
  // Try Sheets first (students see teacher's missions)
  const apiUrl=getApiUrl();
  const now=Date.now();
  if(apiUrl && (!_cachedMisiones || now-_misionesCacheTime>30000)){
    try{
      const r=await fetchWithTimeout(apiUrl+'?action=getMisiones&modo='+encodeURIComponent(modo),{},5000);
      const d=await r.json();
      if(d.misiones && d.misiones.length>0){
        _cachedMisiones=d.misiones;
        _misionesCacheTime=now;
        return d.misiones;
      }
    }catch(e){console.warn('[getMisiones] API error:',e);}
  }
  if(_cachedMisiones) return _cachedMisiones.filter(m=>m.modo===modo);
  // Fallback: localStorage (professor's browser)
  const saved = JSON.parse(localStorage.getItem('taller_misiones')||'[]');
  return saved.filter(m=>m.estado==='activa'&&m.modo===modo);
}

async function showMissionSelector(launchParams){
  _pendingMissionLaunch = launchParams;
  const modo = launchParams.modo || 'sintaxis';
  const misiones = await getMisionesForMode(modo);
  // Also add auto-generated reinforcement mission based on error history
  const errorHist = JSON.parse(localStorage.getItem('taller_error_history')||'{}');
  const modoErrors = errorHist[modo]||{};
  const sortedErrors = Object.entries(modoErrors).sort((a,b)=>b[1]-a[1]);

  const cards = document.getElementById('mission-cards');
  let html = '';

  // Teacher missions
  misiones.forEach(m=>{
    const funcStr = m.funciones&&m.funciones.length>0 ? m.funciones.join(', ') : 'Todas las funciones';
    html += '<div style="background:var(--paper);border:2px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .15s" onclick="launchMission(\''+m.id+'\')" onmouseover="this.style.borderColor=\'var(--blue)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'+
      '<div style="display:flex;justify-content:space-between;align-items:start">'+
      '<div><div style="font-size:1rem;font-weight:800">📋 '+m.nombre+'</div>'+
      '<div style="font-size:.8rem;color:var(--muted);margin-top:4px">'+funcStr+' · '+m.nOraciones+' ejercicios</div></div>'+
      '<span style="background:var(--blue-lt);color:var(--blue);font-size:.72rem;font-weight:800;padding:4px 10px;border-radius:6px">ASIGNADA</span></div></div>';
  });

  // Auto reinforcement mission (if errors exist)
  if(sortedErrors.length>0){
    const topErrors = sortedErrors.slice(0,3).map(e=>e[0]);
    html += '<div style="background:#FFFBEB;border:2px solid #FDE68A;border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .15s" onclick="launchReinforcement()" onmouseover="this.style.borderColor=\'#D97706\'" onmouseout="this.style.borderColor=\'#FDE68A\'">'+
      '<div style="display:flex;justify-content:space-between;align-items:start">'+
      '<div><div style="font-size:1rem;font-weight:800">🎯 Refuerzo personalizado</div>'+
      '<div style="font-size:.8rem;color:var(--muted);margin-top:4px">Refuerza: '+topErrors.join(', ')+' · 5 ejercicios</div></div>'+
      '<span style="background:#FEF3C7;color:#92400E;font-size:.72rem;font-weight:800;padding:4px 10px;border-radius:6px">PARA TI</span></div></div>';
  }

  if(!html){
    html='<p style="text-align:center;color:var(--muted);padding:20px;font-size:.9rem">No hay misiones asignadas para este modo. Puedes practicar libremente.</p>';
  }

  cards.innerHTML = html;
  openOverlay('mission-overlay');
}

function closeMissionSelector(){closeOverlay('mission-overlay');_pendingMissionLaunch=null;}

async function launchMission(misionId){
  closeOverlay('mission-overlay');
  const misiones = await getMisionesForMode(_pendingMissionLaunch?.modo||'sintaxis');
  _activeMission = misiones.find(m=>m.id===misionId)||null;
  if(_activeMission){
    // Override filters with mission constraints
    if(_activeMission.funciones?.length>0){
      localStorage.setItem('taller_exam_filters',JSON.stringify({funciones:_activeMission.funciones,dificultad:_activeMission.dificultad||0}));
    }
  }
  if(_pendingMissionLaunch?._continue) _pendingMissionLaunch._continue();
}

function launchReinforcement(){
  closeOverlay('mission-overlay');
  const modo = _pendingMissionLaunch?.modo||'sintaxis';
  const errorHist = JSON.parse(localStorage.getItem('taller_error_history')||'{}');
  const modoErrors = errorHist[modo]||{};
  const topErrors = Object.entries(modoErrors).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  _activeMission = {id:'REFUERZO',nombre:'Refuerzo personalizado',modo,funciones:topErrors,nOraciones:5};
  if(topErrors.length>0){
    localStorage.setItem('taller_exam_filters',JSON.stringify({funciones:topErrors,dificultad:0}));
  }
  if(_pendingMissionLaunch?._continue) _pendingMissionLaunch._continue();
}

function startFreePlay(){
  closeOverlay('mission-overlay');
  _activeMission = null;
  localStorage.removeItem('taller_exam_filters');
  if(_pendingMissionLaunch?._continue) _pendingMissionLaunch._continue();
}

// Public API exports + window bindings para inline onclick
export {
  loadTeacherPanel, setExamSubfase, updateSubfaseBtns, updateFilterPreview,
  saveExamFilters, saveApiUrl, savePin, genPin, saveTimer, testApiUrl,
  testCurrentPin, activateExam, flashTp,
  createMision, viewMisiones, deleteMision, getMisionesForMode,
  showMissionSelector, closeMissionSelector, launchMission,
  launchReinforcement, startFreePlay
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    loadTeacherPanel, setExamSubfase, saveExamFilters, saveApiUrl, savePin,
    genPin, saveTimer, testApiUrl, testCurrentPin, activateExam,
    createMision, viewMisiones, deleteMision, showMissionSelector,
    closeMissionSelector, launchMission, launchReinforcement, startFreePlay,
    flashTp
  });
}
