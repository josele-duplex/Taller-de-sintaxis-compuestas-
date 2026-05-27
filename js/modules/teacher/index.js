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
// CP EXAM CREATION — Fase 1.6.B (mayo 2026)
// El profesor configura un examen y llama al endpoint
// createExamenCompuesta del GAS, que pre-computa los
// ejercicios y los deja en Compuestas_Examenes con
// Estado='activo'. Patrón clonado de activateExam de Sint.
// ════════════════════════════════════════════════════════

// Genera un PIN aleatorio de 4 dígitos y lo escribe en el input.
function genCpExamPin(){
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  document.getElementById('tp-cp-exam-pin').value = pin;
}

// Helper para mostrar/colorear el mensaje de estado del formulario.
function _setCpExamStatus(msg, colorVar){
  const el = document.getElementById('tp-cp-exam-status');
  el.style.display = 'block';
  el.textContent = msg;
  el.style.color = colorVar;
  el.style.background = colorVar === 'var(--red)'   ? '#FEF2F2'
                      : colorVar === 'var(--green)' ? '#F0FDF4'
                      : colorVar === 'var(--amber)' ? '#FFFBEB'
                      : '#EFF6FF';
  el.style.borderLeft = '3px solid ' + (colorVar || 'var(--blue)');
}

async function createExamenCompuestaUI(){
  const pin         = document.getElementById('tp-cp-exam-pin').value.trim();
  const grupo       = document.getElementById('tp-cp-exam-grupo').value.trim();
  const evaluacion  = document.getElementById('tp-cp-exam-eval').value.trim();
  const nombreExamen= document.getElementById('tp-cp-exam-name').value.trim();
  const tipoOracion = document.getElementById('tp-cp-exam-tipo').value;
  const nivelMax    = document.getElementById('tp-cp-exam-nivel').value;
  const nPropMax    = parseInt(document.getElementById('tp-cp-exam-nprops').value) || 0;
  const nEjercicios = parseInt(document.getElementById('tp-cp-exam-n').value)     || 0;
  const timerMin    = parseInt(document.getElementById('tp-cp-exam-timer').value) || 0;
  const subtiposChk = Array.from(document.querySelectorAll('#tp-cp-exam-subtipos input:checked')).map(c => c.value);
  const subtipo     = subtiposChk.length > 0 ? subtiposChk.join(',') : '*';
  // A2: chip "Pedir análisis interno". Desmarcado por defecto → fases 0-5.
  const incluirInterna = !!document.getElementById('tp-cp-exam-interna')?.checked;
  const fasesActivas   = incluirInterna ? '[0,1,2,3,4,5,6]' : '[0,1,2,3,4,5]';

  // Validación de PIN
  if(!pin || !/^\d{4,6}$/.test(pin)){
    _setCpExamStatus('⚠ El PIN debe tener entre 4 y 6 dígitos numéricos.', 'var(--red)');
    return;
  }
  const apiUrl = getApiUrl();
  if(!apiUrl){
    _setCpExamStatus('⚠ Configura la URL de la API primero.', 'var(--red)');
    return;
  }

  _setCpExamStatus('⏳ Enviando configuración al Sheet…', 'var(--blue)');

  try {
    const params = new URLSearchParams({
      action: 'createExamenCompuesta',
      pin, grupo, evaluacion, nombreExamen,
      tipoOracion, subtipo, nivelMax,
      nProposicionesMax: String(nPropMax),
      nEjercicios:       String(nEjercicios),
      timerMin:          String(timerMin),
      fasesActivas:      fasesActivas
    });
    const r = await fetchWithRetry(apiUrl + '?' + params.toString(), {}, {
      timeoutMs: 15000,
      retries: 2,
      onRetry: (n)=>{
        _setCpExamStatus('⏳ Reintentando ('+n+'/2)…', 'var(--amber)');
      }
    });
    const d = await r.json();
    if(d.ok){
      const nReal = d.nEjerciciosReales || nEjercicios || '?';
      const parts = ['PIN: ' + pin, nReal + ' ejercicios pre-cargados'];
      if(timerMin > 0)       parts.push(timerMin + ' min');
      if(tipoOracion !== '*')parts.push('Tipo: ' + tipoOracion);
      if(subtipo !== '*')    parts.push('Subtipos: ' + subtiposChk.length);
      if(nPropMax > 0)       parts.push('Max. ' + nPropMax + ' propos.');
      parts.push('Nivel: ' + nivelMax);
      parts.push(incluirInterna ? 'Con análisis interno' : 'Sin análisis interno');
      _setCpExamStatus('✓ Examen activado. ' + parts.join(' · '), 'var(--green)');
    } else {
      _setCpExamStatus('⚠ Error: ' + (d.error || 'desconocido'), 'var(--red)');
    }
  } catch(e){
    // Verificar si el examen se creó pese al timeout (igual que activateExam de Sint).
    _setCpExamStatus('⏳ Sin respuesta. Verificando si el examen se creó…', 'var(--amber)');
    try {
      await new Promise(r => setTimeout(r, 1500));
      const verifyParams = new URLSearchParams({ action: 'getExamenCompuesta', pin });
      const verify = await fetchWithTimeout(apiUrl + '?' + verifyParams.toString(), {}, 10000);
      const vd = await verify.json();
      if(vd.ok && Array.isArray(vd.ejercicios) && vd.ejercicios.length > 0){
        _setCpExamStatus('✓ El examen se creó correctamente (PIN ' + pin + ', ' + vd.ejercicios.length + ' ejercicios). El timeout era solo de la respuesta.', 'var(--green)');
      } else {
        _setCpExamStatus('⚠ Error: ' + e.message + '. El examen no se creó. Inténtalo de nuevo.', 'var(--red)');
      }
    } catch(e2){
      _setCpExamStatus('⚠ Error de conexión: ' + e.message, 'var(--red)');
    }
  }
}

// Verifica que el PIN del formulario está activo (simula la petición de un alumno).
async function testCpExamPin(){
  const pin = document.getElementById('tp-cp-exam-pin').value.trim();
  if(!pin || !/^\d{4,6}$/.test(pin)){
    _setCpExamStatus('⚠ Escribe primero un PIN de 4-6 dígitos.', 'var(--amber)');
    return;
  }
  const apiUrl = getApiUrl();
  if(!apiUrl){
    _setCpExamStatus('⚠ Sin URL de API configurada.', 'var(--red)');
    return;
  }
  _setCpExamStatus('⏳ Comprobando PIN ' + pin + '…', 'var(--blue)');
  try {
    const url = apiUrl + '?action=getExamenCompuesta&pin=' + encodeURIComponent(pin);
    const r = await fetchWithRetry(url, {}, { timeoutMs: 10000, retries: 1 });
    const d = await r.json();
    if(d.ok){
      const n = (d.ejercicios && d.ejercicios.length) || 0;
      const parts = ['✓ PIN ' + pin + ' funciona', n + ' ejercicios'];
      if(d.grupo)        parts.push('Grupo ' + d.grupo);
      if(d.evaluacion)   parts.push('Eval. ' + d.evaluacion);
      if(d.nombreExamen) parts.push('«' + d.nombreExamen + '»');
      _setCpExamStatus(parts.join(' · '), 'var(--green)');
    } else {
      _setCpExamStatus('⚠ ' + (d.error || 'PIN no válido'), 'var(--red)');
    }
  } catch(e){
    _setCpExamStatus('⚠ Error de conexión: ' + (e && e.message || e), 'var(--red)');
  }
}

// ════════════════════════════════════════════════════════
// CP DASHBOARD — Fase 1.6 (mayo 2026)
// Lee la hoja Compuestas_Resultados via el endpoint
// getResultadosCompuestas del GAS y la pinta en una tabla
// con filtros (grupo, evaluación, modo). Exporta CSV.
// Patrón clonado de loadDashboard/exportCSV de Sint.
// ════════════════════════════════════════════════════════
let _cpDashData = []; // cache de resultados para exportar CSV

async function loadCpDashboard(){
  const apiUrl = getApiUrl();
  const msg = document.getElementById('tp-cp-msg');
  if(!apiUrl){
    msg.textContent = '⚠ Configura la URL de la API primero.';
    msg.style.color = 'var(--red)';
    msg.style.display = 'block';
    return;
  }
  const grupo      = document.getElementById('tp-cp-grupo').value.trim();
  const evaluacion = document.getElementById('tp-cp-eval').value.trim();
  const modo       = document.getElementById('tp-cp-modo').value;
  msg.textContent = '⏳ Cargando resultados de Compuestas…';
  msg.style.color = 'var(--blue)';
  msg.style.display = 'block';
  try {
    const params = new URLSearchParams({ action: 'getResultadosCompuestas' });
    if(grupo)      params.set('grupo', grupo);
    if(evaluacion) params.set('evaluacion', evaluacion);
    if(modo)       params.set('modo', modo);
    const r = await fetchWithTimeout(apiUrl + '?' + params.toString(), {}, 12000);
    const d = await r.json();
    if(!d.ok){
      msg.textContent = '⚠ Error: ' + (d.error || 'desconocido');
      msg.style.color = 'var(--red)';
      document.getElementById('tp-cp-stats').style.display = 'none';
      document.getElementById('tp-cp-table').style.display = 'none';
      _cpDashData = [];
      return;
    }
    const results = d.results || [];
    if(results.length === 0){
      const filtros = [];
      if(grupo)      filtros.push('grupo '+grupo);
      if(evaluacion) filtros.push('eval. '+evaluacion);
      if(modo)       filtros.push(modo);
      msg.textContent = 'Sin resultados' + (filtros.length ? ' para ' + filtros.join(', ') : '') + '.';
      msg.style.color = 'var(--muted)';
      document.getElementById('tp-cp-stats').style.display = 'none';
      document.getElementById('tp-cp-table').style.display = 'none';
      _cpDashData = [];
      return;
    }
    _cpDashData = results;

    // Estadísticas (solo cuentan filas con Nota numérica)
    const notas = results.map(r => parseFloat(r.Nota)).filter(n => !isNaN(n));
    const media = notas.length > 0 ? notas.reduce((a,b)=>a+b,0) / notas.length : 0;
    const aprob = notas.filter(n => n >= 5).length;
    const susp  = notas.length - aprob;
    document.getElementById('cp-dash-total').textContent = results.length;
    const mediaEl = document.getElementById('cp-dash-media');
    mediaEl.textContent = notas.length > 0 ? media.toFixed(1) : '—';
    mediaEl.style.color = media >= 5 ? '#059669' : '#DC2626';
    document.getElementById('cp-dash-aprob').textContent = aprob;
    document.getElementById('cp-dash-susp').textContent  = susp;
    const pctAprob = notas.length > 0 ? Math.round(aprob / notas.length * 100) : 0;
    document.getElementById('cp-dash-bar').style.width = pctAprob + '%';
    document.getElementById('tp-cp-stats').style.display = 'block';

    // Tabla
    const fmt = v => v == null ? '' : String(v);
    const fmtFecha = f => {
      if(!f) return '';
      // GAS devuelve Date como ISO string o como timestamp; intentamos formatear
      try {
        const d = new Date(f);
        if(isNaN(d.getTime())) return String(f);
        return d.toISOString().slice(0,16).replace('T',' ');
      } catch(e){ return String(f); }
    };
    const tbody = document.getElementById('cp-dash-tbody');
    tbody.innerHTML = results.map(row => {
      const nota = parseFloat(row.Nota);
      const notaOk = !isNaN(nota);
      const color = !notaOk ? 'var(--muted)' : nota >= 8 ? '#059669' : nota >= 5 ? '#D97706' : '#DC2626';
      const alumno = fmt(row.Nombre) || fmt(row.Correo) || '—';
      const completados = (row.Completados!=null && row.Total_Ejercicios!=null)
        ? `${row.Completados}/${row.Total_Ejercicios}` : '—';
      const incompleto = (row.Completados != null && row.Total_Ejercicios != null
                          && Number(row.Completados) < Number(row.Total_Ejercicios));
      const modoLbl = fmt(row.Modo).toLowerCase() === 'examen' ? '🎓 Examen' : '📖 Práctica';
      return `<tr style="border-bottom:1px solid rgba(0,0,0,.06)">
        <td style="padding:5px 8px;font-size:.74rem;color:var(--muted)">${escHtml(fmtFecha(row.Fecha))}</td>
        <td style="padding:5px 4px;font-weight:600">${escHtml(alumno)}</td>
        <td style="padding:5px 4px;text-align:center;color:var(--muted)">${escHtml(fmt(row.Grupo))}</td>
        <td style="padding:5px 4px;text-align:center;color:var(--muted)">${escHtml(fmt(row.Evaluacion))}</td>
        <td style="padding:5px 4px;text-align:center;font-family:monospace;font-size:.74rem">${escHtml(fmt(row.PIN))}</td>
        <td style="padding:5px 4px;text-align:center;font-size:.74rem">${modoLbl}</td>
        <td style="padding:5px 4px;text-align:center;font-size:.78rem;${incompleto?'color:#DC2626;font-weight:700':''}">${completados}</td>
        <td style="padding:5px 4px;text-align:center;font-weight:900;color:${color}">${notaOk ? nota.toFixed(1) : '—'}</td>
      </tr>`;
    }).join('');
    document.getElementById('tp-cp-table').style.display = 'block';

    msg.textContent = `✓ ${results.length} resultados cargados.`;
    msg.style.color = 'var(--green)';
    setTimeout(()=>{ msg.style.display = 'none'; }, 3000);
  } catch(e){
    msg.textContent = '⚠ Error: ' + (e && e.message || e);
    msg.style.color = 'var(--red)';
  }
}

function exportCpCSV(){
  if(!_cpDashData || _cpDashData.length === 0){
    flashTp('Carga resultados primero.', 'var(--amber)');
    return;
  }
  // Las cabeceras siguen exactamente las columnas de Compuestas_Resultados
  // (incluido Detalle_JSON, en bruto).
  const HEADERS = ['Fecha','Correo','Nombre','Grupo','Evaluacion','PIN','Modo',
                   'Total_Ejercicios','Completados','Nota',
                   'Fase0_Pts','Fase1_Pts','Fase2_Pts','Fase3_Pts',
                   'Fase4_Pts','Fase5_Pts','Fase6_Pts','Detalle_JSON'];
  const escCSV = v => {
    if(v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  let csv = HEADERS.join(',') + '\n';
  _cpDashData.forEach(r => {
    csv += HEADERS.map(h => escCSV(r[h])).join(',') + '\n';
  });
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const grupo  = document.getElementById('tp-cp-grupo').value.trim() || 'todos';
  const eval_  = document.getElementById('tp-cp-eval').value.trim() || 'todas';
  const modo   = document.getElementById('tp-cp-modo').value || 'all';
  a.download = `compuestas_resultados_${grupo}_eval${eval_}_${modo}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  flashTp('✓ CSV de Compuestas descargado.', 'var(--green)');
}

// ════════════════════════════════════════════════════════
// MISSION SYSTEM v6.0
// ════════════════════════════════════════════════════════
// Mission state — expuesto en window para que sint (script defer, sloppy mode)
// pueda leerlas como identificador suelto. Si declaramos `let _activeMission`
// aquí, queda confinado al scope del módulo ES y sint no lo ve → ReferenceError.
window._pendingMissionLaunch = null; // stores launch params while mission selector is open
window._activeMission = null; // current mission being played

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
      const r=await fetchWithTimeout(apiUrl+'?action=getMisiones&modo='+encodeURIComponent(modo),{},10000);
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
  window._pendingMissionLaunch = launchParams;
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

function closeMissionSelector(){closeOverlay('mission-overlay');window._pendingMissionLaunch=null;}

async function launchMission(misionId){
  closeOverlay('mission-overlay');
  const misiones = await getMisionesForMode(window._pendingMissionLaunch?.modo||'sintaxis');
  window._activeMission = misiones.find(m=>m.id===misionId)||null;
  if(window._activeMission){
    // Override filters with mission constraints
    if(window._activeMission.funciones?.length>0){
      localStorage.setItem('taller_exam_filters',JSON.stringify({funciones:window._activeMission.funciones,dificultad:window._activeMission.dificultad||0}));
    }
  }
  if(window._pendingMissionLaunch?._continue) window._pendingMissionLaunch._continue();
}

function launchReinforcement(){
  closeOverlay('mission-overlay');
  const modo = window._pendingMissionLaunch?.modo||'sintaxis';
  const errorHist = JSON.parse(localStorage.getItem('taller_error_history')||'{}');
  const modoErrors = errorHist[modo]||{};
  const topErrors = Object.entries(modoErrors).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  window._activeMission = {id:'REFUERZO',nombre:'Refuerzo personalizado',modo,funciones:topErrors,nOraciones:5};
  if(topErrors.length>0){
    localStorage.setItem('taller_exam_filters',JSON.stringify({funciones:topErrors,dificultad:0}));
  }
  if(window._pendingMissionLaunch?._continue) window._pendingMissionLaunch._continue();
}

function startFreePlay(){
  closeOverlay('mission-overlay');
  window._activeMission = null;
  localStorage.removeItem('taller_exam_filters');
  if(window._pendingMissionLaunch?._continue) window._pendingMissionLaunch._continue();
}

// Public API exports + window bindings para inline onclick
export {
  loadTeacherPanel, setExamSubfase, updateSubfaseBtns, updateFilterPreview,
  saveExamFilters, saveApiUrl, savePin, genPin, saveTimer, testApiUrl,
  testCurrentPin, activateExam, flashTp,
  createMision, viewMisiones, deleteMision, getMisionesForMode,
  showMissionSelector, closeMissionSelector, launchMission,
  launchReinforcement, startFreePlay,
  // Fase 1.6 — dashboard de Compuestas
  loadCpDashboard, exportCpCSV,
  // Fase 1.6.B — creación de exámenes de Compuestas
  genCpExamPin, createExamenCompuestaUI, testCpExamPin
};

// ════════════════════════════════════════════════════════
// INFORME DEL PROFESOR (Excel multi-hoja)
// ════════════════════════════════════════════════════════
// Pide los datos al endpoint getInformeProfesor del GAS y delega
// la generación del .xlsx al generador (cargado bajo demanda).

function _infStatus(msg, color){
  const el = document.getElementById('tp-inf-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || 'var(--blue)';
  el.style.display = 'block';
}

function _loadSheetJS(){
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  // xlsx-js-style: fork open-source de SheetJS con soporte de colores y estilos.
  // 100% compatible con la API de XLSX. Imprescindible para el factor WOW del informe.
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar la librería de Excel desde el CDN.'));
    document.head.appendChild(s);
  });
}

async function generarInformeProfesor(){
  const btn = document.getElementById('tp-inf-btn');
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  if (!apiUrl){
    _infStatus('⚠ Configura primero la URL del Apps Script (sección "API URL" más abajo).', 'var(--red)');
    return;
  }
  if (btn) btn.disabled = true;

  // 1. Recoger filtros opcionales
  const params = new URLSearchParams({ action: 'getInformeProfesor' });
  const from  = document.getElementById('tp-inf-from')?.value;
  const to    = document.getElementById('tp-inf-to')?.value;
  const grupo = document.getElementById('tp-inf-grupo')?.value.trim();
  const tipo  = document.getElementById('tp-inf-tipo')?.value;
  if (from)  params.append('from', from);
  if (to)    params.append('to', to);
  if (grupo) params.append('grupo', grupo);
  if (tipo && tipo !== 'todo') params.append('tipo', tipo);

  try {
    // 2. Cargar SheetJS (lazy, solo la primera vez)
    if (typeof XLSX === 'undefined'){
      _infStatus('⏳ Cargando librería de Excel (1ª vez, ~280 KB)…', 'var(--blue)');
      await _loadSheetJS();
    }

    // 3. Llamar al endpoint del GAS
    _infStatus('⏳ Pidiendo datos al servidor…', 'var(--blue)');
    const url = apiUrl + (apiUrl.includes('?') ? '&' : '?') + params.toString();
    const r = (typeof fetchWithRetry === 'function')
                ? await fetchWithRetry(url, {}, 3, 30000)
                : await fetch(url);
    const data = await r.json();

    if (!data || !data.ok){
      // Si el GAS devuelve { error: 'Acción desconocida' } (sin ok:false) el endpoint no existe aún
      const msg = data?.error || 'respuesta inválida del servidor';
      const isUnknown = msg.toLowerCase().includes('acción desconocida') || msg.toLowerCase().includes('accion desconocida');
      _infStatus(
        isUnknown
          ? '✕ El servidor GAS no reconoce el endpoint. ¿Has actualizado y redesplegado el código GAS (§11)?'
          : '✕ Error: ' + msg,
        'var(--red)'
      );
      return;
    }
    if (!data.alumnos || data.alumnos.length === 0){
      _infStatus('⚠ No hay datos en el rango seleccionado. Prueba ampliando las fechas.', 'var(--amber)');
      return;
    }

    // 4. Generar Excel (función definida en D3 — generador independiente)
    _infStatus('⏳ Generando Excel…', 'var(--blue)');
    if (typeof window.generarExcelInforme === 'function'){
      window.generarExcelInforme(data);
      _infStatus(`✓ Informe descargado: ${data.alumnos.length} alumnos · ${data.resumen.total_actividades} actividades.`, 'var(--green)');
    } else {
      _infStatus('⚠ Generador de Excel aún no cargado (pendiente de D3). Datos recibidos correctamente.', 'var(--amber)');
      console.log('[Informe] Datos recibidos:', data);
    }
  } catch (e){
    _infStatus('✕ ' + (e.message || 'Error inesperado'), 'var(--red)');
    console.error('[generarInformeProfesor]', e);
  } finally {
    if (btn) btn.disabled = false;
  }
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    loadTeacherPanel, setExamSubfase, saveExamFilters, saveApiUrl, savePin,
    genPin, saveTimer, testApiUrl, testCurrentPin, activateExam,
    createMision, viewMisiones, deleteMision, showMissionSelector,
    closeMissionSelector, launchMission, launchReinforcement, startFreePlay,
    getMisionesForMode,
    flashTp,
    // Fase 1.6 — dashboard de Compuestas
    loadCpDashboard, exportCpCSV,
    // Fase 1.6.B — creación de exámenes de Compuestas
    genCpExamPin, createExamenCompuestaUI, testCpExamPin,
    // Informe del profesor (Excel)
    generarInformeProfesor
  });
}
