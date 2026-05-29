/* sint/index.js — Modulo de oraciones simples (Sint) + el resto
   Extraido de index.html (Paso 9.7, el ultimo, mayo 2026).

   COMPLEMENTO del script principal: contiene todo lo NO extraido en
   los modulos anteriores. Es 'Sint' principalmente (motor de simples,
   estado G, fases 1-4, scoring), mas el resto de utilidades que no
   encajaban en un modulo especifico:
   - IIFE de control de expiracion (beta hasta 2026-07-01).
   - GrammarRules, SUBFASE_CONFIGS, WEIGHTS, FUNC_WEIGHT, ScoringEngine.
   - Funciones de utilidad: cleanAllTimers, resetSentenceState, errorCard,
     getMock, shuffle, seededShuffle, isPunct, clasificarVerbo,
     genTraps3, delay, isPreResolved, isTacitoBlock, genTraps3Split.
   - Constantes pequenas: TIPOS, isCC, FUNC_ARGUMENTOS, FUNC_ADJUNTOS,
     FUNC_MARCAS, PRE_RESOLVED_FUNCS, PRONOUNS, W.
   - normalizeOracion, sendPracticeAnalytics.
   - Estado G, initState.
   - LOADING_TIPS, startLoadingTips, stopLoadingTips.
   - Sint UI: login flow, render fases 1-4, success/feedback, resultados.
   - LOGIN_PANELS, currentModule, skipCurrentSentence, practice filters,
     confirm exit, login, openOverlay/closeOverlay, checkTeacherPw.
   - Teacher dashboard (syncSents, loadDashboard, exportCSV, dlResults,
     _dashData) y projector mode (openProj, projPrevSentence,
     openProjSelector, etc) — quedaron fuera del Teacher Panel por estar
     fuera de su rango contiguo en el original.
   - getHintsPractice/Exam + setHints* + refreshHintsUI (config pistas).
   - Modulo selection state: selectedMode, setMode, selectedArcadeMode,
     setModule, selectedSint4Mode, setArcadeMode, setMorphLevel/Mode,
     handleStartAll.

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): showScreen, getApiUrl, fetchWithTimeout/Retry, awardXP,
   trackError, onSentenceCompleted, playSuccess/Error/Complete/Click,
   showCombo, CC_SUBTIPOS, FUNC_ORAC, FUNC_SINT, funcTagCss, tagContent,
   HABER_FORMS, lookupScaffold, MICRO_LECCIONES, etc.

   AVISO: este archivo es grande (2965 lineas) porque es el complemento
   del monolito original. Refactor estructural mas fino queda para Fase B.
   */

// ═══ FECHA DE EXPIRACIÓN — Versión beta ═══
(function(){
  const EXPIRY = new Date('2026-07-01T00:00:00');
  if(new Date() > EXPIRY){
    document.addEventListener('DOMContentLoaded',function(){
      document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FEF2F2;font-family:Arial,sans-serif;padding:40px;text-align:center"><div style="max-width:500px"><div style="font-size:3rem;margin-bottom:16px">⏰</div><h1 style="color:#991B1B;margin-bottom:12px">Versión de prueba finalizada</h1><p style="color:#78350F;font-size:1.1rem;line-height:1.6">Esta versión beta de Taller de Sintaxis dejó de funcionar el 30 de junio de 2026.</p><p style="color:#78350F;margin-top:12px">Contacta con el profesor responsable para obtener la versión actualizada.</p></div></div>';
    });
    throw new Error('App expired');
  }
})();

// ════════════════════════════════════════════════════════
// CORE ENGINE v4.7 — Rules, Scoring, State Management
// Single source of truth for all game logic
// ════════════════════════════════════════════════════════

// ── GRAMMAR RULES (NGLE / PAU Murcia) ──────────────────────────────
const GrammarRules = {
  applyAll(label, blockText = '') {
    let r = label;
    const t = (blockText||'').toLowerCase().trim();
    if (t.startsWith('para ') || t === 'para') {
      if (r === 'CI' || r === 'CC Causa') r = 'CC Finalidad';
    }
    if (t.startsWith('por ') || t === 'por') {
      if (r === 'CC Finalidad') r = 'CC Causa';
    }
    return r;
  },
  filterTraps(allFunctions, correctLabel, blockText = '') {
    const t = (blockText||'').toLowerCase().trim();
    const forbidden = new Set();
    if (t.startsWith('para ') || t === 'para') {
      forbidden.add('CI'); forbidden.add('CC Causa'); forbidden.add('C.Ag.');
    }
    if (t.startsWith('por ') || t === 'por') { forbidden.add('CC Finalidad'); }
    return allFunctions.filter(f => f !== correctLabel && !forbidden.has(f));
  },
};

// ── SUBFASE CONFIGURATIONS ───────────────────────────────────────────
const SUBFASE_CONFIGS = {
  solo_np:   { label:'Solo NP',          icon:'①',    phases:[1],       color:'#2563EB', desc:'Identifica el Núcleo del Predicado.' },
  np_sujeto: { label:'NP + Sujeto',      icon:'①②',   phases:[1,2],     color:'#7C3AED', desc:'Verbo y sujeto (expreso o tácito).' },
  completo:  { label:'Análisis completo',icon:'①②③', phases:[1,2,3],   color:'#059669', desc:'NP + Sujeto + Funciones del Predicado (PAU).' },
};


// ── UNIFIED SCORING ENGINE ───────────────────────────────────────────
const WEIGHTS = { NP:2, SUJETO:4, PVPN:2, FUNCION:3 };
// Weighted scoring by function type (pedagogically calibrated)
const FUNC_WEIGHT = {
  'Sujeto':2,'CD':1.5,'CI':1.5,'Atr.':1.5,'CPvo':1.5,'C.Rég.':1.5,'C.Ag.':1.5,
  'Marca.Pas.Ref.':1,'Marca.Imp.':1,
  'CC Tiempo':1,'CC Lugar':1,'CC Modo':1,'CC Causa':1,'CC Cantidad':1,'CC Compañía':1,'CC Finalidad':1,'CC Instrumento':1,
};
function getFuncWeight(func){ return FUNC_WEIGHT[func] || 1; }
const ScoringEngine = {
  toGrade(earned, possible) {
    if(!possible) return 0;
    return Math.round((earned/possible)*100)/10;
  },
  calcMorphReport(MM) {
    const pct = MM.totalAttempted>0 ? Math.round(MM.totalCorrect/MM.totalAttempted*100)/10 : 0;
    const catRows = Object.entries(MM.catStats||{})
      .map(([cat,s])=>({ cat, pct: s.total>0?Math.round(s.correct/s.total*100):0, correct:s.correct, total:s.total }))
      .sort((a,b)=>a.pct-b.pct);
    return {
      grade: pct,
      catRows,
      errores:  Object.values(MM.selections||{}).filter(s=>s.earned<s.possible).length,
      aciertos: Object.values(MM.selections||{}).filter(s=>s.earned===s.possible).length,
      total: MM.totalTokens||MM.doneTokens||0,
    };
  },
};

// ════════════════════════════════════════════════════════
// UTILITY HELPERS — Centralized timer cleanup & error display
// ════════════════════════════════════════════════════════

/** Clears ALL active timers across every module — call on ANY navigation */
function cleanAllTimers(){
  if(typeof G==='object'&&G.timerInterval){clearInterval(G.timerInterval);G.timerInterval=null;}
  if(typeof G==='object'&&G.p3HesitationTimer){clearInterval(G.p3HesitationTimer);G.p3HesitationTimer=null;}
  if(typeof ARC==='object'){
    if(ARC.timerInterval){clearInterval(ARC.timerInterval);ARC.timerInterval=null;}
    if(ARC.hintAdvance){clearTimeout(ARC.hintAdvance);ARC.hintAdvance=null;}
  }
  if(typeof MC==='object'){
    if(MC.timerInterval){clearInterval(MC.timerInterval);MC.timerInterval=null;}
    if(MC._scoreInterval){clearInterval(MC._scoreInterval);MC._scoreInterval=null;}
    MC.active=false;
  }
}

/** Resets per-sentence state for navigation between oraciones */
function resetSentenceState(){
  G.phase=1;G.verbIdx=null;G.verbIndices=[];G.subjectIdxs=[];
  G.sujetoTacito=null;G.phase3Results={};G.pvpnDone=false;
  p3={slots:{},slotOk:{},argPool:[],adjPool:[],marPool:[],pvpnDone:false};
  // A) Metacognitive tracking: timestamp start of this sentence
  G.sentenceStartTime = Date.now();
  // Sprint 1: reset del indicador de duda al pasar a otra oración
  if(G.p3HesitationTimer){clearInterval(G.p3HesitationTimer);G.p3HesitationTimer=null;}
  G.p3IdleSince = 0;
}

// ════════════════════════════════════════════════════════
// Sprint 1 · Indicador de duda en fase 3
// Si el alumno está más de 8 s sin colocar una etiqueta en la fase 3,
// aparece una micro-pista contextual SUTIL (no consume el contador de
// pistas explícitas). Cualquier interacción con la fase la resetea.
// ════════════════════════════════════════════════════════
function _resetP3Idle(){ if(G) G.p3IdleSince = Date.now(); }
function _startP3HesitationWatcher(){
  if(!G) return;
  if(G.p3HesitationTimer){ clearInterval(G.p3HesitationTimer); }
  if(G.mode !== 'practice') return;  // solo en práctica: en examen no distraemos
  G.p3IdleSince = Date.now();
  G.p3HesitationTimer = setInterval(()=>{
    try{
      if(!G || G.phase !== 3) { clearInterval(G && G.p3HesitationTimer); if(G) G.p3HesitationTimer=null; return; }
      if(Date.now() - (G.p3IdleSince||Date.now()) < 8000) return;
      const o = G.oraciones[G.idx];
      if(!o || !o.fase3) return;
      const emptySlots = (o.fase3.bloques||[]).filter(b => !isPreResolved(b.solucion) && p3.slotOk[b.id] !== true && p3.slotOk[b.id] !== 'partial');
      if(emptySlots.length === 0) { _resetP3Idle(); return; }
      const target = emptySlots[0];
      const txt = (target.indices||[]).map(i=>o.palabras[i]||'').join(' ').trim();
      const msg = txt
        ? '💡 ¿Te ayudo? Piensa qué hace «' + txt + '» en la oración: ¿completa al verbo o añade circunstancia?'
        : '💡 ¿Necesitas un empujón? Arrastra una etiqueta al primer bloque vacío.';
      showHesitationHint(msg);
      _resetP3Idle();  // que no machaque mientras lee la pista
    }catch(e){ /* silencioso: este watcher no debe romper la sesión */ }
  }, 1500);
}
function showHesitationHint(text){
  let el = document.getElementById('hesit-hint');
  if(!el){
    el = document.createElement('div');
    el.id = 'hesit-hint';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);max-width:560px;padding:11px 18px;background:linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%);border:1.5px solid #F59E0B;border-radius:14px;color:#92400E;font-weight:600;font-size:.86rem;line-height:1.45;z-index:120;box-shadow:0 6px 18px rgba(245,158,11,.25);pointer-events:none;text-align:center';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(()=>{ el.style.transition='opacity .5s'; el.style.opacity='0'; }, 4500);
}

/** Renders a visible error card when a render function throws */
function errorCard(title, detail){
  return `<div class="card" style="padding:24px;text-align:center;border-left:5px solid var(--red);margin:20px auto;max-width:560px">
    <div style="font-size:1.5rem;margin-bottom:8px">⚠️</div>
    <div style="font-weight:800;color:var(--red);margin-bottom:6px">${title}</div>
    <div style="font-size:.82rem;color:var(--muted);margin-bottom:14px;word-break:break-word">${detail||'Error desconocido'}</div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="goLogin()">← Volver al inicio</button>
  </div>`;
}

// ════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
// PROGRESSION SYSTEM — Streaks, XP, Levels, Missions, History
// ════════════════════════════════════════════════════════



// Award XP for a completed sentence

// ═══ DASHBOARD PANEL FOR STUDENT (opens from portada corner) ═══

// ════════════════════════════════════════════════════════
// SOUND SYSTEM (Web Audio API — very subtle)
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
// GLOSARIO — términos gramaticales
// ════════════════════════════════════════════════════════
// ESC closes glosario
document.addEventListener('keydown', function(ev){
  if(ev.key === 'Escape'){
    const bg = document.getElementById('glos-bg');
    if(bg && bg.classList.contains('open')) closeGlosario();
  }
});

// ════════════════════════════════════════════════════════
// GRAMMAR CONSTANTS
// ════════════════════════════════════════════════════════
const TIPOS     = ['SN','SP','SAdj','SAdv','SV'];
// CC subtipos v4.0 — aparecen en el pool de Adjuntos con submenú
// T alone is only used internally for intermediate level; not a draggable label
// Helpers CC
function isCC(f){ return f==='CC'||CC_SUBTIPOS.includes(f); }
function ccBase(f){ return isCC(f)?'CC':f; }
function ccSubtipo(f){ return CC_SUBTIPOS.includes(f)?f:null; }

// ════════════════════════════════════════════════════════
// FEEDBACK ESCALONADO — Matrices de andamiaje cognitivo
// ════════════════════════════════════════════════════════


// FIX: Formas de haber para distinguir TIEMPO COMPUESTO de PERÍFRASIS

// Clasificación v4.0: CPvo pasa a Argumentos; CC usa subtipos
const FUNC_ARGUMENTOS = new Set(['CD','CI','C.Rég.','Atr.','CPvo','PN','PV']);
const FUNC_ADJUNTOS   = new Set([...CC_SUBTIPOS,'C.Ag.']);
function isAdjunto(f){ return FUNC_ADJUNTOS.has(f)||f==='CC'; }
const FUNC_MARCAS     = new Set(['Mod.Or.','Conector','Vocat.','Marca.Imp.','Marca.Pas.Ref.']);

// Mapa de sintagmas válidos por función — evita combinaciones imposibles
// en las cajas trampa (p.ej. "SV | CD" o "SAdj | CI"). Añadido mayo 2026.
const SINTAGMAS_VALIDOS = {
  // Argumentos del predicado
  'CD':            ['SN','SP'],                 // SN común; SP con 'a' personal o clítico
  'CI':            ['SN','SP'],                 // SP con preposición; SN con clítico ("le","les")
  'C.Rég.':        ['SP'],
  'Atr.':          ['SN','SAdj','SP','SAdv'],
  'CPvo':          ['SAdj','SN','SP'],
  // Adjuntos
  'C.Ag.':         ['SP'],
  'CC Lugar':      ['SP','SAdv','SN'],
  'CC Tiempo':     ['SP','SAdv','SN'],
  'CC Modo':       ['SP','SAdv','SN'],
  'CC Causa':      ['SP'],
  'CC Cantidad':   ['SAdv','SN'],
  'CC Compañía':   ['SP'],
  'CC Finalidad':  ['SP'],
  'CC Instrumento':['SP'],
  'CC':            ['SP','SAdv','SN'],          // genérico (se subdivide en submenú)
  // Marcas y periféricos
  'Mod.Or.':       ['SAdv','SP'],
  'Vocat.':        ['SN'],
  'Marca.Pas.Ref.':['SN'],                       // el "se" pronominal forma SN
  'Marca.Imp.':    ['SN'],                       // ídem
  'Conector':      [],                           // conjunción/locución, sin sintagma
};

const PRE_RESOLVED_FUNCS = new Set(['Sujeto','NP']);

// Pronombres personales sujeto
const PRONOUNS = [
  {display:'yo',            match:['yo'],              icon:'1ª sg'},
  {display:'tú',            match:['tú','tu'],          icon:'2ª sg'},
  {display:'él / ella',     match:['él','ella','usted'],icon:'3ª sg'},
  {display:'nosotros/as',   match:['nosotros','nosotras'],icon:'1ª pl'},
  {display:'vosotros/as',   match:['vosotros','vosotras'],icon:'2ª pl'},
  {display:'ellos / ellas', match:['ellos','ellas','ustedes'],icon:'3ª pl'},
];

// Pesos de ponderación
const W = { NP: 2, SUJETO: 4, FUNCION: 3 };

// ════════════════════════════════════════════════════════
// TAG CONTENT HELPERS
// ════════════════════════════════════════════════════════

// Color CSS class based on FUNCTION (for phase 3 labels)

// ════════════════════════════════════════════════════════
// MOCK DATA — Updated for v2.3
// Oraciones que cubren: sujeto explícito, sujeto tácito,
// tiempo compuesto (haber+participio), "a personal"
// ════════════════════════════════════════════════════════
function getMock() {
  // 5 oraciones reales del banco de datos (Activo=Sí, JSON válido)
  // Extraídas directamente del Google Sheets Taller_de_Sintaxis_2026-27.xlsx
  return [
    {
      id:'m01',
      oracion_completa:'Los voluntarios repartieron mantas a las personas sin hogar.',
      palabras:['Los','voluntarios','repartieron','mantas','a','las','personas','sin','hogar','.'],
      fase1:{
        nucleo_predicado_indices:[2],
        tipo_verbo_categoria:'SIMPLE',
        consejo:'Busca el verbo conjugado. ¿Con qué número y persona concuerda con el sujeto?'
      },
      fase2:{
        sujeto_indices:[0,1],
        sujeto_tacito:false,
        consejo:'¿Qué SN concuerda en persona y número con el verbo? Pregunta: ¿quién repartió?'
      },
      fase3:{
        tipo_predicado:'PV',
        bloques:[
          {id:'m01a',indices:[0,1],     solucion:'SN | Sujeto',  consejo:''},
          {id:'m01b',indices:[2],       solucion:'SV | NP',      consejo:''},
          {id:'m01c',indices:[3],       solucion:'SN | CD',      consejo:'¿Puedes sustituir este bloque por "las"? Eso indicaría que es CD.'},
          {id:'m01d',indices:[4,5,6,7,8],solucion:'SP | CI',     consejo:'¿Se puede sustituir por "les"? ¿Indica el destinatario de la acción?'}
        ]
      },
    },
    {
      id:'m02',
      oracion_completa:'Se acostumbró pronto al clima de la ciudad.',
      palabras:['Se','acostumbró','pronto','al','clima','de','la','ciudad','.'],
      fase1:{
        nucleo_predicado_indices:[1],
        tipo_verbo_categoria:'SIMPLE',
        consejo:'¿Cuál es el verbo conjugado? Fíjate en la desinencia para identificar la persona.'
      },
      fase2:{
        sujeto_indices:[],
        sujeto_tacito:true,
        nucleo_tacito:'él',
        consejo:'La desinencia de "acostumbró" indica 3.ª persona singular. ¿Aparece el sujeto expresamente?'
      },
      fase3:{
        tipo_predicado:'PV',
        bloques:[
          {id:'m02a',indices:[],      solucion:'Ø | Sujeto tácito',consejo:'',tacito:true,pronoun:'él'},
          {id:'m02b',indices:[1],     solucion:'SV | NP',          consejo:''},
          {id:'m02c',indices:[2],     solucion:'SAdv | CC Tiempo',  consejo:'¿Indica cuándo, cómo o dónde? ¿Se puede suprimir o desplazar?'},
          {id:'m02d',indices:[3,4,5,6,7],solucion:'SP | C.Rég.',   consejo:'¿Qué preposición específica exige el significado de este verbo? ¿Puede omitirse sin que la oración resulte agramatical?'}
        ]
      },
    },
    {
      id:'m03',
      oracion_completa:'Encontraron al herido consciente.',
      palabras:['Encontraron','al','herido','consciente','.'],
      fase1:{
        nucleo_predicado_indices:[0],
        tipo_verbo_categoria:'SIMPLE',
        consejo:'¿Cuál es el único verbo conjugado?'
      },
      fase2:{
        sujeto_indices:[],
        sujeto_tacito:true,
        nucleo_tacito:'ellos',
        consejo:'La desinencia "-aron" corresponde a 3.ª persona plural. No hay sujeto explícito.'
      },
      fase3:{
        tipo_predicado:'PV',
        bloques:[
          {id:'m03a',indices:[],      solucion:'Ø | Sujeto tácito',consejo:'',tacito:true,pronoun:'ellos'},
          {id:'m03b',indices:[0],     solucion:'SV | NP',          consejo:''},
          {id:'m03c',indices:[1,2],   solucion:'SP | CD',          consejo:'¿Puedes sustituir este bloque por "lo"? Lleva "a" personal porque el CD es una persona.'},
          {id:'m03d',indices:[3],     solucion:'SAdj | CPvo',      consejo:'¿Concuerda este elemento con el CD? ¿Expresa una cualidad del CD en el momento de la acción?'}
        ]
      },
    },
    {
      id:'m04',
      oracion_completa:'Se suspendió el partido por la lluvia.',
      palabras:['Se','suspendió','el','partido','por','la','lluvia','.'],
      fase1:{
        nucleo_predicado_indices:[1],
        tipo_verbo_categoria:'SIMPLE',
        consejo:'Identifica el verbo conjugado. El "se" no es parte del NP en la pasiva refleja.'
      },
      fase2:{
        sujeto_indices:[2,3],
        sujeto_tacito:false,
        consejo:'En la pasiva refleja con "se", el sujeto paciente concuerda con el verbo. ¿Cuál es?'
      },
      fase3:{
        tipo_predicado:'PV',
        bloques:[
          {id:'m04a0',indices:[0],    solucion:'SN | Marca.Pas.Ref.',consejo:'El "se" aquí es marca de pasiva refleja. No cumple función de CD ni CI.'},
          {id:'m04a',indices:[1],     solucion:'SV | NP',        consejo:'El verbo conjugado es el núcleo del predicado.'},
          {id:'m04b',indices:[2,3],   solucion:'SN | Sujeto',    consejo:''},
          {id:'m04c',indices:[4,5,6], solucion:'SP | CC Causa',  consejo:'¿Expresa la causa de la suspensión? ¿Puede suprimirse?'}
        ]
      },
    },
    {
      id:'m05',
      oracion_completa:'Aquí se come de maravilla por poco dinero.',
      palabras:['Aquí','se','come','de','maravilla','por','poco','dinero','.'],      fase1:{
        nucleo_predicado_indices:[2],
        tipo_verbo_categoria:'SIMPLE',
        consejo:'Identifica el verbo conjugado. La oración es impersonal.'
      },
      fase2:{
        sujeto_indices:[],
        sujeto_tacito:false,
        sin_sujeto:true,
        consejo:'Observa el «se». ¿Actúa como sujeto gramatical o bloquea su aparición?'
      },
      fase3:{
        tipo_predicado:'PV',
        bloques:[
          {id:'m05a',indices:[1,2],   solucion:'SV | NP',     consejo:'El "se" impersonal forma parte del NP.'},
          {id:'m05b',indices:[0],     solucion:'SAdv | CC Lugar', consejo:'¿Indica lugar? ¿Puede desplazarse?'},
          {id:'m05c',indices:[3,4],   solucion:'SP | CC Modo',    consejo:'¿Indica modo? ¿Puede suprimirse sin alterar la estructura básica?'},
          {id:'m05d',indices:[5,6,7], solucion:'SP | CC Cantidad',consejo:'¿Indica precio o cantidad? ¿Puede suprimirse?'}
        ]
      },
    },
    {
      id:'m06',
      oracion_completa:'Le toca a usted, señora López.',
      palabras:['Le','toca','a','usted',',','señora','López','.'],
      fase1:{
        nucleo_predicado_indices:[1],
        tipo_verbo_categoria:'SIMPLE',
        consejo:'Identifica el verbo conjugado. ¿A quién se dirige el hablante?'
      },
      fase2:{
        sujeto_indices:[],
        sujeto_tacito:false,
        sin_sujeto:true,
        consejo:'El verbo "tocar" aquí es impersonal (le toca = es su turno). "Señora López" NO es el sujeto, es a quién se dirige el hablante.'
      },
      fase3:{
        tipo_predicado:'PV',
        bloques:[
          {id:'m06a',indices:[1],       solucion:'SV | NP',     consejo:'"Toca" es el núcleo del predicado verbal.'},
          {id:'m06b',indices:[0],       solucion:'SN | CI',     consejo:'"Le" es CI: ¿a quién le toca? Se puede duplicar con "a usted".'},
          {id:'m06c',indices:[2,3],     solucion:'SP | CI',     consejo:'"A usted" es la duplicación del CI "le" — frecuente en español.'},
          {id:'m06d',indices:[5,6],     solucion:'SN | Vocat.', consejo:'"Señora López" es vocativo: el hablante se dirige a la interlocutora para llamar su atención. Va entre comas y no cumple función sintáctica dentro de la oración.'}
        ]
      },
    }
  ];
}

// ════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════
function shuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

/**
 * Deterministic Fisher-Yates based on a string seed.
 * Same email → same order every time.
 * Different emails → different orders (anti-copia).
 */
function seededShuffle(arr, seed) {
  // Hash seed string to uint32
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  // mulberry32 PRNG
  let t = h >>> 0;
  const rand = () => {
    t += 0x6D2B79F5; t >>>= 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function isPunct(w){return/^[.,;:!?¡¿\-—…]$/.test(w);}

// Pega cada signo de puntuación a su palabra adyacente para evitar que un
// signo quede colgado en una línea distinta tras el flex-wrap del .sent-wrap.
// Aperturas (¿ ¡) se agrupan con la palabra SIGUIENTE; cierres (. , ; : ? !)
// con la palabra ANTERIOR. Replica el efecto del Word Joiner que usa el módulo
// de compuestas con su layout inline. Llamar tras pintar las .wu del container.
function gluePunctToNeighbors(container){
  if(!container) return;
  const wus = Array.from(container.children).filter(c=>c.classList && c.classList.contains('wu'));
  for(let i=0; i<wus.length; i++){
    const wu = wus[i];
    if(!wu.classList.contains('is-punct')) continue;
    const txt = (wu.querySelector('.wu-text')?.textContent || '').trim();
    const esApertura = /^[¿¡]$/.test(txt);
    if(esApertura){
      const next = wus[i+1];
      if(next && !next.classList.contains('is-punct')){
        const group = document.createElement('span');
        group.className = 'wu-group';
        wu.parentNode.insertBefore(group, wu);
        group.appendChild(wu);
        group.appendChild(next);
      }
    } else {
      const prev = wu.previousElementSibling;
      if(prev && prev.classList && prev.classList.contains('wu-group')){
        prev.appendChild(wu);
      } else if(prev && prev.classList && prev.classList.contains('wu')){
        const group = document.createElement('span');
        group.className = 'wu-group';
        prev.parentNode.insertBefore(group, prev);
        group.appendChild(prev);
        group.appendChild(wu);
      }
    }
  }
}

// FIX: función para clasificar secuencia verbal (según informe técnico adjunto)
function clasificarVerbo(tokens, indices) {
  if (indices.length < 2) return 'SIMPLE';
  const v1 = tokens[indices[0]].toLowerCase();
  const v2 = tokens[indices[indices.length-1]].toLowerCase();
  if (HABER_FORMS.has(v1) && /^.+(ado|ido|to|so|cho)$/i.test(v2)) return 'TIEMPO_COMPUESTO';
  return 'PERIFRASIS';
}

function genTraps3(correctLabels, n=3) {
  const all=[];
  for(const t of TIPOS) for(const f of FUNC_ORAC) all.push({tipo:t,func:f,label:`${t} | ${f}`});
  const used=new Set(correctLabels);
  return shuffle(all.filter(x=>!used.has(x.label))).slice(0,n);
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}

// ════════════════════════════════════════════════════════
// FETCH WITH TIMEOUT (AbortSignal fallback for older browsers)
// ════════════════════════════════════════════════════════

function isPreResolved(solucion) {
  const func = solucion.split(' | ')[1];
  return PRE_RESOLVED_FUNCS.has(func) || solucion.startsWith('Ø |');
}
function isTacitoBlock(bloque) {
  return bloque.tacito === true || bloque.solucion.startsWith('Ø |');
}

// Distribuye trampas entre Argumentos, Adjuntos y Marcas.
// FIX mayo 2026: usa SINTAGMAS_VALIDOS para evitar combinaciones imposibles
// (p.ej. "SV | CD", "SAdj | CI", "SAdv | C.Rég.") y excluir PN/PV como
// funciones de bloque (son tipos de predicado entero, no funciones internas).
function genTraps3Split(correctLabels, nEach=2) {
  // Funciones argumentales reales de bloque (PN/PV fuera: son el predicado entero)
  const ARG_FUNCS_BLOQUE = ['CD','CI','C.Rég.','Atr.','CPvo'];
  // Build all possible label combinations (tipo | función) — solo válidas
  const allWithTipo=[];
  for(const f of [...ARG_FUNCS_BLOQUE, ...CC_SUBTIPOS, 'C.Ag.']){
    const sintagmas = SINTAGMAS_VALIDOS[f] || [];
    for(const t of sintagmas){
      allWithTipo.push({tipo:t,func:f,label:`${t} | ${f}`});
    }
  }
  // Marcas y periféricos: ahora con sintagma cuando aplique (SN para Vocat./
  // Marca.Pas.Ref./Marca.Imp.; SAdv/SP para Mod.Or.; Conector sin tipo).
  const allMarcas=[];
  for(const f of FUNC_MARCAS){
    const sintagmas = SINTAGMAS_VALIDOS[f] || [];
    if(sintagmas.length===0){
      allMarcas.push({tipo:'',func:f,label:f});
    } else {
      for(const t of sintagmas){
        allMarcas.push({tipo:t,func:f,label:`${t} | ${f}`});
      }
    }
  }
  const used=new Set(correctLabels);
  const isArgFunc = f => ARG_FUNCS_BLOQUE.includes(f);
  const availArg=shuffle(allWithTipo.filter(x=>isArgFunc(x.func)&&!used.has(x.label)));
  const availAdj=shuffle(allWithTipo.filter(x=>isAdjunto(x.func)&&!used.has(x.label)));
  const availMar=shuffle(allMarcas.filter(x=>!used.has(x.label)));
  return {
    argTraps: availArg.slice(0,nEach),
    adjTraps: availAdj.slice(0,nEach),
    marTraps: availMar.slice(0,nEach)
  };
}

// ════════════════════════════════════════════════════════
// GAME STATE
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// DATA NORMALIZATION — called on every oracion before use
// Guarantees all fields the game engine expects.
// ════════════════════════════════════════════════════════
function normalizeOracion(raw){
  if(!raw||typeof raw!=='object') return null;
  // Deep-freeze source data — never mutate originals
  const o = JSON.parse(JSON.stringify(raw));
  const safe={
    id:         o.id||('o_'+Math.random().toString(36).slice(2)),
    oracion_completa: o.oracion_completa||o.Oracion_Texto||'',
    palabras:   Array.isArray(o.palabras)?o.palabras:(o.oracion_completa||'').split(' ').filter(Boolean),
    funciones_presentes: Array.isArray(o.funciones_presentes)?o.funciones_presentes:[],
    fase1: o.fase1||null,
    fase2: o.fase2||null,
    fase3: o.fase3||null,
    fase4: o.fase4||null,
  };
  // Guarantee fase3.bloques if fase3 exists
  if(safe.fase3&&!Array.isArray(safe.fase3.bloques)) safe.fase3.bloques=[];
  // DEFENSIVE: Normalize CC labels — old GAS versions stripped the space (CCLugar → CC Lugar)
  if(safe.fase3&&safe.fase3.bloques){
    safe.fase3.bloques=safe.fase3.bloques.map(b=>{
      if(!b||!b.solucion) return b;
      // Fix "CCTiempo" → "CC Tiempo", "CCLugar" → "CC Lugar", etc.
      b.solucion=b.solucion.replace(/\bCC(Lugar|Tiempo|Modo|Causa|Cantidad|Compañía|Finalidad|Instrumento)\b/g,'CC $1');
      // Fix "CPvo" without space if ever mangled
      b.solucion=b.solucion.replace(/\bCPvo(\w)/g,'CPvo $1');
      // Fix missing trailing dots: Marca.Pas.Ref → Marca.Pas.Ref., Marca.Imp → Marca.Imp., etc.
      b.solucion=b.solucion.replace(/\bMarca\.Pas\.Ref\b(?!\.)/g,'Marca.Pas.Ref.');
      b.solucion=b.solucion.replace(/\bMarca\.Imp\b(?!\.)/g,'Marca.Imp.');
      b.solucion=b.solucion.replace(/\bC\.Ag\b(?!\.)/g,'C.Ag.');
      b.solucion=b.solucion.replace(/\bC\.Rég\b(?!\.)/g,'C.Rég.');
      b.solucion=b.solucion.replace(/\bAtr\b(?!\.)/g,'Atr.');
      // FIX mayo 2026: añadir SN a Marca.Pas.Ref., Marca.Imp. y Vocat. cuando
      // el sheet las manda sin tipo. Estas marcas SIEMPRE son SN (el "se"
      // pronominal y el sustantivo del vocativo forman SN).
      if(b.solucion==='Marca.Pas.Ref.') b.solucion='SN | Marca.Pas.Ref.';
      if(b.solucion==='Marca.Imp.')     b.solucion='SN | Marca.Imp.';
      if(b.solucion==='Vocat.')         b.solucion='SN | Vocat.';
      return b;
    });
  }
  // Guarantee fase4.sintagmas if fase4 exists
  // Null-guard sintagma elementos

  return safe;
}

// ─── Reusable practice session analytics (used by goResults, exit button, beforeunload) ───
let _practiceAnalyticsSent = false;
function sendPracticeAnalytics(opts){
  if(_practiceAnalyticsSent) return; // idempotent: only send once per session
  if(!G || G.mode !== 'practice' || G.usingMock) return;
  if(!G.oraciones || G.oraciones.length === 0) return;
  const apiUrl = getApiUrl();
  if(!apiUrl) return;
  try{
    opts = opts || {};
    const tiempoMin = G.sessionStart ? Math.round((Date.now()-G.sessionStart)/60000) : 0;
    // Don't bother saving sessions shorter than 30 seconds — usually accidental opens
    if(tiempoMin === 0 && (G.sentenceCompleted||[]).filter(Boolean).length === 0 && G.totalErrors === 0) return;
    const errByFunc = {};
    (G.oraciones||[]).forEach((o,idx)=>{
      const se = G.sentenceErrors[idx]||{};
      (o.fase3?.bloques||[]).forEach(b=>{
        const f=(b.solucion||'').split(' | ')[1]||'';
        if(f && f!=='—'){
          const n=(se.blockErrors||{})[b.id]||0;
          errByFunc[f]=(errByFunc[f]||0)+n;
        }
      });
      if((se.npErrors||0)>0) errByFunc['NP']=(errByFunc['NP']||0)+se.npErrors;
      if((se.sujetoErrors||0)>0) errByFunc['Sujeto']=(errByFunc['Sujeto']||0)+se.sujetoErrors;
    });
    const sorted=Object.entries(errByFunc).sort((a,b)=>b[1]-a[1]);
    const peor=sorted[0]?.[0]||'';
    const mejor=sorted.filter(x=>x[1]===0).map(x=>x[0]).join(',');
    const score = (typeof opts.score === 'number') ? opts.score : 0;
    const params = new URLSearchParams({
      action:'saveSesionPractica',
      email:G.email||'', name:G.name||'',
      grupo:G.praGrupo||'',
      modulo:'sintaxis', subfase:G.subfase||'',
      oracionesHechas:String((G.sentenceCompleted||[]).filter(Boolean).length),
      totalOraciones:String(G.oraciones.length),
      nota:String(score), errores:String(G.totalErrors||0),
      tiempoMin:String(tiempoMin),
      funcPeor:peor, funcMejor:mejor,
      errCD:String(errByFunc['CD']||0),
      errCI:String(errByFunc['CI']||0),
      errAtr:String(errByFunc['Atr.']||0),
      errCPvo:String(errByFunc['CPvo']||0),
      errCReg:String(errByFunc['C.Rég.']||0),
      errCC:String(Object.entries(errByFunc).filter(([k])=>k.startsWith('CC ')).reduce((a,[,v])=>a+v,0)),
    });
    const url = apiUrl + '?' + params.toString();
    // Use sendBeacon when available (works during page unload)
    if(navigator.sendBeacon){
      navigator.sendBeacon(url);
    } else {
      fetch(url, {method:'GET', keepalive:true}).catch(()=>{});
    }
    _practiceAnalyticsSent = true;
  } catch(e){ console.warn('[analytics]', e); }
}

// Save analytics if user closes tab or navigates away during practice
window.addEventListener('beforeunload', function(){
  try {
    if(G && G.mode === 'practice' && !_practiceAnalyticsSent){
      sendPracticeAnalytics({});
    }
  } catch(e) {}
});

var G={}; // var (no let) para que se exponga como window.G y los modulos ES (tracking.js) puedan leerlo
function initState(opts){
  // Reset contadores de sesión (errores y aciertos por función). Ambos viven
  // en tracking.js como variables privadas — tras la migración hay que llamar
  // a las funciones exportadas en vez de reasignarlas directamente.
  if(typeof clearSessionFuncErrors === 'function') clearSessionFuncErrors();
  if(typeof clearSessionFuncSuccess === 'function') clearSessionFuncSuccess();
  _examSent = false; // reset per session
  G={
    name:opts.name, email:opts.email,
    mode:opts.mode, examPin:opts.examPin||'',
    subfase:opts.subfase||'completo',
    oraciones:opts.oraciones,
    idx:0, phase:1,
    verbIdx:null,
    verbIndices:[],          // NEW: all NP token indices (for compound verbs)
    subjectIdxs:[],
    sujetoTacito:null,       // NEW: confirmed pronoun if tácito
    phase3Results:{},
    pvpnDone:false,          // NEW: PV/PN step completed
    totalErrors:0,
    sentenceErrors:opts.oraciones.map(o=>({
      id:o.id,
      npErrors:0,
      sujetoErrors:0,
      pvpnErrors:0,
      blockErrors:{},
      elemErrors:{}
    })),
    sentenceCompleted:opts.oraciones.map(()=>false), // track which sentences were finished
    timerDuration:opts.timerDuration||0,
    timerRemaining:opts.timerDuration||0,
    timerInterval:null,
    usingMock:opts.usingMock||false,
    apiError:opts.apiError||'',
    examGrupo:opts.examGrupo||'',
    examEval:opts.examEval||'',
    examName:opts.examName||'',
    praGrupo:opts.praGrupo||'',
    sessionStart: Date.now()
  };
}

// ════════════════════════════════════════════════════════
// SCREEN ROUTING
// ════════════════════════════════════════════════════════

// ── Reassuring rotating tips during loading ──
const LOADING_TIPS = [
  'Preparando todo para que practiques sin esperas…',
  '¿Sabías que puedes filtrar las oraciones por la función que quieras practicar?',
  'En el modo examen, los CC valen 1 punto y los argumentos como CD o CI valen 3.',
  'Si fallas tres veces la misma función, la app te ofrecerá una micro-lección.',
  'Recuerda: en español, la preposición es siempre el núcleo de su sintagma.',
  'Tu racha de días seguidos cuenta también si entras al modo morfología.',
  'Cargando con cuidado tus datos para que todo funcione bien…'
];
let _loadingTipTimer = null;
let _loadingTipIdx = 0;
function startLoadingTips(){
  const el = document.getElementById('loading-tip');
  if(!el) return;
  stopLoadingTips();
  _loadingTipIdx = Math.floor(Math.random() * LOADING_TIPS.length);
  el.textContent = LOADING_TIPS[_loadingTipIdx];
  el.style.opacity = '1';
  _loadingTipTimer = setInterval(()=>{
    el.style.opacity = '0';
    setTimeout(()=>{
      _loadingTipIdx = (_loadingTipIdx + 1) % LOADING_TIPS.length;
      el.textContent = LOADING_TIPS[_loadingTipIdx];
      el.style.opacity = '1';
    }, 600);
  }, 3200);
}
function stopLoadingTips(){
  if(_loadingTipTimer){ clearInterval(_loadingTipTimer); _loadingTipTimer = null; }
  const el = document.getElementById('loading-tip');
  if(el) el.style.opacity = '0';
}

// ════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════
let selectedMode=null,eggCount=0;
function eggClick(){
  if(++eggCount>=3){eggCount=0;document.getElementById('teacher-pw').value='';document.getElementById('teacher-pw-err').style.display='none';openOverlay('teacher-modal');try{warmupApi();}catch(e){}setTimeout(()=>document.getElementById('teacher-pw').focus(),100);}
}
let selectedSubfase = 'completo';

function setSubfase(key){
  selectedSubfase = key;
  Object.keys(SUBFASE_CONFIGS).forEach(k=>{
    const el=document.getElementById('sf-'+k);
    if(el){el.classList.toggle('sf-sel',k===key);el.setAttribute('aria-checked',String(k===key));}
  });
}

function buildSubfaseGrid(){
  const grid=document.getElementById('subfase-grid');
  if(!grid)return;
  grid.innerHTML=Object.entries(SUBFASE_CONFIGS).map(([key,sf])=>
    `<button type="button" class="subfase-card" id="sf-${key}" onclick="setSubfase('${key}')" role="radio" aria-checked="false">
      <div class="sf-icon" style="color:${sf.color}">${sf.icon}</div>
      <div class="sf-label">${sf.label}</div>
      <div class="sf-desc">${sf.desc}</div>
    </button>`
  ).join('');
  setSubfase('completo');
}

function setMode(m){
  selectedMode=m;
  ['mc-practice','mc-exam'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.toggle('sel-active',el.id==='mc-'+m);el.setAttribute('aria-checked',String(el.id==='mc-'+m));}});
  document.getElementById('pin-block').style.display=m==='exam'?'block':'none';
  // Mostrar grupo en ambos modos: opcional en práctica, obligatorio en examen
  // (mayo 2026 — permite reutilizar el mismo PIN para distintos grupos).
  const grupoField=document.getElementById('campo-grupo');
  if(grupoField) grupoField.style.display='block';
  const hint=document.getElementById('grupo-req-hint');
  if(hint){
    hint.textContent = m==='exam' ? '(obligatorio)' : '(opcional)';
    hint.style.color = m==='exam' ? 'var(--red)' : 'var(--muted)';
  }
}
function ferr(id,msg){const el=document.getElementById(id);if(!el)return;el.textContent=msg;el.classList.toggle('show',!!msg);}

// ── loadOraciones — separated from UI, always resolves ──────────────
async function loadOraciones(mode, apiUrl) {
  console.log('[loadOraciones] mode:', mode, 'apiUrl:', apiUrl ? '(set)' : '(none)');
  if (!apiUrl) {
    console.log('[loadOraciones] No API URL — using mock data');
    return { oraciones: getMock().map(normalizeOracion).filter(Boolean), usingMock: true, apiError: '' };
  }
  try {
    // For exam mode, check if there are saved filters (column G)
    let fetchUrl = `${apiUrl}?action=getOraciones&mode=${mode}`;
    if (mode === 'exam') {
      const savedFilters = JSON.parse(localStorage.getItem('taller_exam_filters') || '{}');
      const examSubfase = localStorage.getItem('taller_exam_subfase') || '';
      const hasFilters = (savedFilters.funciones && savedFilters.funciones.length > 0) || savedFilters.dificultad || examSubfase;
      if (hasFilters) {
        const params = new URLSearchParams({ action: 'getOracionesFiltradas' });
        if (savedFilters.funciones && savedFilters.funciones.length > 0) params.set('funciones', savedFilters.funciones.join(','));
        if (savedFilters.dificultad) params.set('dificultad', String(savedFilters.dificultad));
        if (examSubfase) params.set('subfase', examSubfase);
        fetchUrl = `${apiUrl}?${params.toString()}`;
        console.log('[loadOraciones] Using filtered endpoint:', fetchUrl);
      }
    }
    console.log('[loadOraciones] Fetching:', fetchUrl);
    const r = await fetchWithRetry(fetchUrl, {}, {
      timeoutMs: 12000,
      retries: 2,
      onRetry: (n) => console.log('[loadOraciones] Retry '+n+'/2…')
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const raw = Array.isArray(d.oraciones) && d.oraciones.length > 0 ? d.oraciones : null;
    if (!raw) throw new Error('Respuesta vacía o sin array "oraciones"');
    const oraciones = raw.map(o => {
      try { return normalizeOracion(o); }
      catch(e) { console.error('[normalizeOracion] Error:', e.message, o?.id || ''); return null; }
    }).filter(Boolean);
    if (oraciones.length === 0) throw new Error('Todas las oraciones fallaron normalización');
    console.log('[loadOraciones] OK —', oraciones.length, 'oraciones');
    return { oraciones, usingMock: false, apiError: '' };
  } catch (e) {
    const msg = e.message?.includes('aborted') ? 'Tiempo de espera agotado.' : (e.message || 'Error desconocido');
    console.error('[loadOraciones] Error:', msg, e);
    return { oraciones: getMock().map(normalizeOracion).filter(Boolean), usingMock: true, apiError: msg };
  }
}

async function handleStart(){
  // ── 1. Validate form fields ────────────────────────────────────────
  ferr('e-name',''); ferr('e-email',''); ferr('e-mode',''); ferr('e-pin',''); ferr('e-grupo','');
  document.getElementById('api-err')?.style && (document.getElementById('api-err').style.display='none');
  const name  = document.getElementById('inp-name').value.trim();
  const email = document.getElementById('inp-email').value.trim().toLowerCase();
  const pin   = document.getElementById('inp-pin').value.trim();
  const grupo = (document.getElementById('inp-grupo')?.value||'').trim();
  let ok = true;
  if (!name)  { ferr('e-name','Escribe tu nombre completo.'); ok = false; }
  if (!email) { ferr('e-email','El correo es obligatorio.'); ok = false; }
  else if (!EMAIL_RE.test(email)) { ferr('e-email','Correo inválido. Usa @murciaeduca.es, @alu.murciaeduca.es o @gmail.com'); ok = false; }
  if (!selectedMode) { ferr('e-mode','Selecciona un modo de sesión.'); ok = false; }
  if (selectedMode === 'exam' && (!pin || pin.length !== PIN_LEN || !/^\d+$/.test(pin))) {
    ferr('e-pin', `El PIN debe ser ${PIN_LEN} dígitos numéricos.`); ok = false;
  }
  // Grupo obligatorio en examen (mayo 2026): permite reutilizar el PIN entre grupos
  if (selectedMode === 'exam' && !grupo) {
    ferr('e-grupo', 'Indica tu grupo (ej: 3ºA). Es obligatorio en modo examen.'); ok = false;
  }
  if (!ok) return;

  const examSubfase = selectedMode === 'exam' ? (localStorage.getItem('taller_exam_subfase') || 'completo') : selectedSubfase;

  // ── 1b. Mission selector for practice mode ──
  if(selectedMode==='practice' && currentModule==='sint'){
    const misiones=await getMisionesForMode('sintaxis');
    const errorHist=JSON.parse(localStorage.getItem('taller_error_history')||'{}');
    const hasErrors=Object.keys(errorHist.sintaxis||{}).length>0;
    if(misiones.length>0||hasErrors){
      showMissionSelector({modo:'sintaxis',_continue:()=>_doHandleStart(name,email,pin,examSubfase)});
      return;
    }
  }
  _doHandleStart(name,email,pin,examSubfase);
}

async function _doHandleStart(name,email,pin,examSubfase){
  document.getElementById('loading-txt').textContent = 'Preparando tus oraciones…';
  showScreen('loading');
  await delay(100);

  const apiUrl = getApiUrl();

  // ═══════════════════════════════════════════════════════
  // EXAM MODE: get everything from Sheet via PIN
  // ═══════════════════════════════════════════════════════
  if(selectedMode === 'exam'){
    if(!apiUrl){
      ferr('e-pin','⚠ Sin conexión al servidor.');showScreen('login');return;
    }
    try{
      document.getElementById('loading-txt').textContent = 'Cargando examen (PIN '+pin+')…';
      // Anti-spike: random delay 0-1.5s to prevent 30 students hitting at the same millisecond
      await new Promise(r=>setTimeout(r, Math.random()*1500));
      // Show "slow server" hint after 5 seconds
      const slowTimer = setTimeout(()=>{
        const lt=document.getElementById('loading-txt');
        if(lt) lt.textContent='Servidor procesando… puede tardar unos segundos.';
      }, 5000);
      // Retry with exponential backoff (3 attempts: 25s, then 8s, then 8s)
      let d = null;
      const examUrl = apiUrl+'?action=getExamConfig&pin='+encodeURIComponent(pin);
      for(let attempt=0; attempt<3; attempt++){
        try{
          const timeout = attempt===0 ? 25000 : 8000; // first attempt gets more time (may need on-the-fly computation)
          if(attempt>0) document.getElementById('loading-txt').textContent = `Reintentando (${attempt+1}/3)…`;
          const r = await fetchWithTimeout(examUrl,{},timeout);
          d = await r.json();
          if(d && !d.error) break; // success
          if(d && d.error) break;  // server returned error, no point retrying
        }catch(retryErr){
          if(attempt<2) await new Promise(r=>setTimeout(r, 1000*(attempt+1))); // backoff: 1s, 2s
          else throw retryErr; // last attempt failed
        }
      }
      if(!d){throw new Error('Sin respuesta del servidor');}
      if(d.error){
        clearTimeout(slowTimer);
        if(d.error.includes('preparación')){
          ferr('e-pin','⏳ El profesor está preparando el examen. Espera unos segundos e inténtalo de nuevo.');
        } else {
          ferr('e-pin','⚠ '+d.error);
        }
        showScreen('login');return;
      }
      if(!d.oraciones||d.oraciones.length===0){
        ferr('e-pin','⚠ El examen no tiene oraciones configuradas.');showScreen('login');return;
      }
      const oraciones = d.oraciones.map(o=>{try{return normalizeOracion(o);}catch(e){return null;}}).filter(Boolean);
      if(oraciones.length===0){
        ferr('e-pin','⚠ Error al procesar las oraciones del examen.');showScreen('login');return;
      }
      const timerSec = (parseInt(d.timer)||0) * 60;
      const subfase = d.subfase || examSubfase || 'completo';
      console.log('[Exam] PIN:',pin,'oraciones:',oraciones.length,'timer:',d.timer,'min subfase:',subfase);
      clearTimeout(slowTimer);
      // El grupo del alumno (formulario) tiene prioridad sobre el del PIN
      // config para permitir reutilizar el mismo examen entre grupos.
      const studentGrupo = (document.getElementById('inp-grupo')?.value||'').trim();
      _launchGame({ name, email, pin, subfase, oraciones, usingMock:false, timerDuration:timerSec,
        examGrupo: studentGrupo || d.grupo || '', examEval:d.evaluacion||'', examName:d.nombreExamen||'' });
    }catch(e){
      clearTimeout(slowTimer);
      ferr('e-pin','⚠ Error de conexión: '+(e.message||'timeout')+'. Inténtalo de nuevo.');showScreen('login');
    }
    return;
  }

  // ═══════════════════════════════════════════════════════
  // PRACTICE / PROJECTOR MODE: load all oraciones normally
  // ═══════════════════════════════════════════════════════
  let safetyTimer = setTimeout(() => {
    const mock = getMock().map(normalizeOracion).filter(Boolean);
    _launchGame({ name, email, pin, subfase: examSubfase,
      oraciones: shuffle(mock), usingMock: true, timerDuration:0 });
  }, 12000);

  let { oraciones, usingMock, apiError } = await loadOraciones(selectedMode, apiUrl);
  if (apiError) {
    const ae = document.getElementById('api-err');
    if (ae) { ae.textContent = `⚠ Sin conexión: ${apiError}. Usando oraciones de ejemplo.`; ae.style.display = 'block'; }
  }
  clearTimeout(safetyTimer);
  if (selectedMode === 'practice') oraciones = shuffle(oraciones);
  // Apply mission nOraciones limit
  if(_activeMission && _activeMission.nOraciones > 0 && oraciones.length > _activeMission.nOraciones){
    oraciones = oraciones.slice(0, _activeMission.nOraciones);
  }
  if (!oraciones || oraciones.length === 0) {
    oraciones = getMock().map(normalizeOracion).filter(Boolean);
    usingMock = true;
  }
  const praGrupo = (document.getElementById('inp-grupo')?.value||'').trim();
  _launchGame({ name, email, pin, subfase: examSubfase,
    oraciones, usingMock, timerDuration:0, praGrupo });
}

function _launchGame({ name, email, pin, subfase, oraciones, usingMock, timerDuration, examGrupo, examEval, examName, praGrupo }) {
  timerDuration = timerDuration || 0;
  console.log('[_launchGame] oraciones:', oraciones.length, 'mode:', selectedMode, 'usingMock:', usingMock, 'subfase:', subfase, 'timer:', timerDuration+'s');
  // Update daily streak on practice start
  if(selectedMode === 'practice'){
    try{ updateDailyStreak(); }catch(e){console.warn('[streak]',e);}
  }
  initState({ name, email, mode: selectedMode, examPin: pin,
    subfase, oraciones, usingMock, timerDuration,
    examGrupo: examGrupo||'', examEval: examEval||'', examName: examName||'',
    praGrupo: praGrupo||'' });
  G.sessionStart = Date.now(); // session timer for analytics
  _practiceAnalyticsSent = false; // reset for new session
  // Store full pool for practice filters (frontend-only filtering)
  if(selectedMode==='practice') G.oracionesFull = [...oraciones];
  document.getElementById('screen-game').classList.remove('is-proj');
  // Show/hide practice filters bar
  const pfBar=document.getElementById('practice-filters-bar');
  if(pfBar) pfBar.style.display = selectedMode==='practice' ? 'block' : 'none';
  // Update filter count
  const countEl=document.getElementById('pf-count');
  if(countEl && selectedMode==='practice') countEl.textContent='· Todas ('+oraciones.length+')';
  renderGame();
  showScreen('game');
  if (timerDuration > 0) startTimer();
}

// ════════════════════════════════════════════════════════
// TIMER
// ════════════════════════════════════════════════════════
function startTimer(){
  const el=document.getElementById('tb-timer');el.style.display='inline-block';updateTimerDisplay();
  G.timerInterval=setInterval(()=>{G.timerRemaining--;updateTimerDisplay();if(G.timerRemaining<=0){clearInterval(G.timerInterval);goResults();}},1000);
}
function updateTimerDisplay(){
  const el=document.getElementById('tb-timer');
  const mm=String(Math.floor(G.timerRemaining/60)).padStart(2,'0');const ss=String(G.timerRemaining%60).padStart(2,'0');
  el.textContent=`⏱ ${mm}:${ss}`;
  el.style.background=G.timerRemaining<60?'#FEF2F2':G.timerRemaining<180?'#FEF3C7':'var(--paper3)';
  el.style.color=G.timerRemaining<60?'var(--red)':G.timerRemaining<180?'var(--amber)':'var(--ink)';
}

// ════════════════════════════════════════════════════════
// TOPBAR
// ════════════════════════════════════════════════════════
const PHASE_NAMES=['NP (Verbo)','Sujeto','Funciones del Predicado','Sintagmas'];
function updateTopBar(){
  document.getElementById('tb-name').textContent=G.name.split(' ')[0];
  document.getElementById('tb-counter').textContent=`${G.idx+1}/${G.oraciones.length}`;
  document.getElementById('prog-fill').style.width=`${(G.idx/G.oraciones.length)*100}%`;
  // Update projector sentence indicator
  const psi=document.getElementById('proj-sent-indicator');
  if(psi&&G.mode==='projector')psi.textContent=`Oración ${G.idx+1} de ${G.oraciones.length}`;
  const modeMap={practice:['badge-practice','📖 Práctica'],exam:['badge-exam','📝 Examen'],projector:['badge-proj','📺 Proyector']};
  const[mcls,mtxt]=modeMap[G.mode]||['badge-practice','📖'];
  const mb=document.getElementById('tb-mode');mb.className='tb-badge '+mcls;mb.textContent=mtxt;
  // Exit button: hide in projector (has its own), show in practice/exam
  const exitBtn=document.getElementById('tb-exit-btn');
  if(exitBtn) exitBtn.style.display=G.mode==='projector'?'none':'inline-flex';
  const maxPhase=3;
  document.getElementById('phase-pills').innerHTML=PHASE_NAMES.map((lbl,i)=>{
    const n=i+1;
    if(n>3)return`<span class="ppill pp-skip">${lbl}</span>`;
    const cls=n<G.phase?'pp-done':n===G.phase?'pp-active':'pp-pending';
    return`<span class="ppill ${cls}">${n<G.phase?'✓ ':''}${lbl}</span>`;
  }).join('');
  document.getElementById('proj-bar-mode').textContent=`Subfase: ${G.subfase||'completo'}`;
  const aw=document.getElementById('api-warn');aw.className='api-warn';
  if(G.apiError){aw.textContent=`⚠ Error de API: ${G.apiError}`;aw.classList.add('show','api-warn-err');}
  else if(G.usingMock&&G.mode!=='projector'){aw.textContent='⚠ Sin API configurada — Usando oraciones de ejemplo';aw.classList.add('show','api-warn-mock');}
}
function renderSentDots(){
  const total=G.oraciones.length,el=document.getElementById('sent-dots');
  if(total<=1){el.innerHTML='';return;}
  const show=Math.min(total,14);
  el.innerHTML=Array.from({length:show},(_,i)=>{
    const cls=i<G.idx?'sdot sd-done':i===G.idx?'sdot sd-cur':'sdot sd-pend';
    return`<span class="${cls}" aria-hidden="true"></span>`;
  }).join('')+(total>14?`<span style="font-size:.7rem;color:var(--muted);font-weight:700">+${total-14}</span>`:'');
}

// ════════════════════════════════════════════════════════
// RENDER GAME
// ════════════════════════════════════════════════════════
function renderGame(){
  try{
    updateTopBar();renderSentDots();
  }catch(e){console.error('[updateTopBar]',e);}
  const el=document.getElementById('game-phase');
  el.innerHTML='';el.className='au';void el.offsetWidth;
  // Guard: if G was reset or belongs to wrong module, bail
  if(!Array.isArray(G.oraciones)||G.oraciones.length===0){goResults();return;}
  const o=G.oraciones[G.idx];if(!o){goResults();return;}
  const maxP = 3;
  if(G.phase>maxP){showSuccessScreen(o);return;}
  try{
    if(G.phase===1)renderPhase1(el,o);
    else if(G.phase===2)renderPhase2(el,o);
    else if(G.phase===3)renderPhase3(el,o);
    else showSuccessScreen(o);
  }catch(e){
    console.error(`[renderPhase${G.phase}]`,e);
    el.innerHTML=errorCard(`Error en Fase ${G.phase}`,e.message);
  }
  // Show skip button in practice and exam (in exam it asks confirmation)
  const skipW=document.getElementById('game-skip-wrap');
  if(skipW){
    if(G.mode==='practice'){
      skipW.style.display='block';
      skipW.querySelector('button').textContent = 'Saltar esta oración →';
      skipW.querySelector('button').style.color = 'var(--muted)';
    } else if(G.mode==='exam'){
      skipW.style.display='block';
      skipW.querySelector('button').textContent = '⤳ Saltar esta oración (contará como incompleta)';
      skipW.querySelector('button').style.color = '#B45309';
    } else {
      skipW.style.display='none';
    }
  }
  // Ajustar offset del sticky de la oración (mayo 2026): mide solo la
  // altura de la topbar (NO sumar el practice-filters-bar, que no es
  // sticky: dejaría un hueco al hacer scroll igual a su altura).
  updateStickyTop();
}

function updateStickyTop(){
  try{
    const tb = document.querySelector('#screen-game .topbar');
    if(!tb) return;
    const h = tb.offsetHeight;
    document.documentElement.style.setProperty('--sint-topbar-h', h+'px');
  }catch(e){}
}
// Recalcular en resize y al desplegar/plegar los filtros
window.addEventListener('resize', ()=>{ try{ updateStickyTop(); }catch(e){} });

function transitionPhase(next){
  const el=document.getElementById('game-phase');
  el.classList.add('afo');
  setTimeout(()=>{G.phase=next;renderGame();},280);
}

// ════════════════════════════════════════════════════════
// INSTRUCTION CARD
// ════════════════════════════════════════════════════════
function instCard(num,badge,title,sub,tip=''){
  return`<div class="inst-card" data-num="${num}" role="note">
    <div class="inst-badge" aria-hidden="true">${badge}</div>
    <div class="inst-title">${title}</div>
    <div class="inst-sub">${sub}</div>
    ${tip?`<div class="inst-tip" role="note">💡 ${tip}</div>`:''}
  </div>`;
}

// ════════════════════════════════════════════════════════
// CONTEXT STRIP — uses G.verbIndices (array)
// ════════════════════════════════════════════════════════
function renderContextStrip(o,showBlocks=false){
  const words=o.palabras;
  const npSet=new Set(G.verbIndices.length>0?G.verbIndices:[G.verbIdx].filter(x=>x!==null));
  const sIdxs=new Set(G.subjectIdxs);
  const isTacito=o.fase2?.sujeto_tacito===true||o.fase2?.sujeto_indices?.length===0;

  // Fase 3: cada bloque etiquetado con SOLO la función (no el sintagma),
  // coloreada por función, con la etiqueta DEBAJO de las palabras.
  if(showBlocks&&Object.keys(G.phase3Results).length>0){
    const bloques=o.fase3.bloques;
    const used=new Set(bloques.flatMap(b=>b.indices));
    let html=`<div class="ctx-strip ctx-sticky"><div class="ctx-label">Análisis oracional — funciones</div><div class="ctx-scroll"><div class="ctx-words">`;
    if(isTacito&&G.sujetoTacito){
      html+=`<span class="ctx-tacito-tag" aria-label="Sujeto tácito">Ø&nbsp;<em>${G.sujetoTacito}</em></span>`;
    }
    bloques.filter(b=>!isTacitoBlock(b)).forEach(b=>{
      const res=G.phase3Results[b.id];
      const resolved=!!res;
      // Función "sola" para mostrar (sin el tipo de sintagma).
      const func=resolved?(res.func||(res.label?.includes(' | ')?res.label.split(' | ')[1]:res.label)):'';
      const tagCls=resolved?funcTagCss(res.label||func):'';
      const blockCls=resolved?`ctx-block ctx-block-resolved ${tagCls}`:'ctx-block ctx-block-pending';
      html+=`<div class="${blockCls}">
        <div class="ctx-blk-words">${b.indices.map(i=>{const isV=npSet.has(i),isS=sIdxs.has(i);
          return`<span class="ctx-w ${isV?'ctx-verb':isS?'ctx-subj':''}"><span class="ctx-wt">${words[i]}</span>${isV?'<span class="ctx-wb">NP</span>':isS?'<span class="ctx-wb">Suj.</span>':''}</span>`;
        }).join('')}</div>
        <div class="ctx-blk-badge-below">${resolved?func:'?'}</div>
      </div>`;
    });
    words.forEach((w,i)=>{if(!used.has(i))html+=`<span class="ctx-w"><span class="ctx-wt">${w}</span></span>`;});
    return html+`</div></div></div>`;
  }

  // Fases 1-2: NP y Sujeto a nivel de palabra. Predicado implícito = lo demás
  // (lo marcamos con un subrayado tenue tras identificar el sujeto).
  const subjectIdentified=G.subjectIdxs.length>0||(isTacito&&G.sujetoTacito);
  let html=`<div class="ctx-strip ctx-sticky"><div class="ctx-label">Oración — NP${subjectIdentified?', Sujeto y Predicado':''} identificados</div><div class="ctx-scroll"><div class="ctx-words">`;
  if(isTacito&&G.sujetoTacito){
    html+=`<span class="ctx-tacito-tag">Ø&nbsp;<em>${G.sujetoTacito}</em></span>`;
  }
  words.forEach((w,i)=>{
    const isV=npSet.has(i),isS=sIdxs.has(i);
    // Predicado: si ya se identificó el sujeto, marcamos como predicado todo
    // lo que no sea sujeto (incluyendo el verbo, que también forma parte de él).
    const isPred=subjectIdentified&&!isS;
    let cls='ctx-w';
    if(isV) cls+=' ctx-verb';
    else if(isS) cls+=' ctx-subj';
    if(isPred&&!isV) cls+=' ctx-pred';
    html+=`<span class="${cls}">
      <span class="ctx-wt">${w}</span>
      ${isV?'<span class="ctx-wb">NP</span>':isS?'<span class="ctx-wb">Suj.</span>':''}
    </span>`;
  });
  return html+`</div></div></div>`;
}

// ════════════════════════════════════════════════════════
// PHASE 1 — NP (Verbo) — FIX: multi-word NP + compound vs perífrasis
// ════════════════════════════════════════════════════════
function renderPhase1(el,o){
  const npIndices=o.fase1.nucleo_predicado_indices;
  const cat=o.fase1.tipo_verbo_categoria||'SIMPLE';
  const tipLabel=cat==='TIEMPO_COMPUESTO'?'⚗️ Tiempo compuesto':cat==='PERIFRASIS'?'🔀 Perífrasis verbal':'✦ Verbo simple';

  el.innerHTML=instCard(1,'① NP (Verbo)',
    'Identifica el Núcleo del Predicado',
    npIndices.length>1
      ? `El NP de esta oración es un <strong>${tipLabel}</strong>. Haz clic sobre cualquiera de sus palabras para seleccionar todo el núcleo.`
      : `Haz clic en la palabra que es el <strong>verbo principal conjugado</strong> de la oración.`,
    o.fase1.consejo
  )+`<div class="sent-card folio-sheet">
    <div class="sent-scroll"><div class="sent-wrap" id="p1-sent" role="list" aria-label="Palabras de la oración"></div></div>
  </div>
  <div id="p1-msg" role="status" style="text-align:center;font-size:.95rem;font-weight:700;padding:6px;display:none"></div>`;

  const sent=el.querySelector('#p1-sent');
  o.palabras.forEach((w,i)=>{
    const div=document.createElement('div');
    div.className='wu'+(isPunct(w)?' is-punct':'');
    div.innerHTML=`<span class="wu-badge" aria-hidden="true">NP</span><span class="wu-text">${w}</span>`;
    if(!isPunct(w)){
      div.setAttribute('role','button');div.setAttribute('tabindex','0');
      div.setAttribute('aria-label',`Seleccionar "${w}" como parte del NP`);
      div.onclick=()=>clickVerb(i,o);
      div.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();clickVerb(i,o);}};
    }
    sent.appendChild(div);
  });
  gluePunctToNeighbors(sent);
}

function clickVerb(idx,o){
  const npIndices=o.fase1.nucleo_predicado_indices;
  const correct=npIndices.includes(idx);
  if(correct){
    // Highlight ALL NP words together
    const wus = document.querySelectorAll('#p1-sent .wu');
    npIndices.forEach(i=>wus[i]?.classList.add('wu-verb','wu-bounce'));
    G.verbIdx=npIndices[npIndices.length-1];
    G.verbIndices=[...npIndices];
    const msg=document.getElementById('p1-msg');
    const cat=o.fase1.tipo_verbo_categoria||'SIMPLE';
    const catMsg=cat==='TIEMPO_COMPUESTO'?' — Tiempo compuesto: haber + participio invariable':cat==='PERIFRASIS'?' — Perífrasis verbal':'';
    msg.style.display='block';msg.style.color='var(--green)';
    msg.textContent=`✓ NP identificado${catMsg}`;
    // Visual feedback: toast
    playClick(); playSuccess();
    const flashLabel = cat==='PERIFRASIS' ? '¡Perífrasis correcta!' : cat==='TIEMPO_COMPUESTO' ? '¡Tiempo compuesto correcto!' : '¡NP correcto!';
    showCorrectFlash(flashLabel);
    setTimeout(()=>transitionPhase(2),500); // FIX: reduced wait time
  }else{
    G.totalErrors++;G.sentenceErrors[G.idx].npErrors++;
    const wus=document.querySelectorAll('#p1-sent .wu');
    wus[idx]?.classList.add('wu-wrong');
    setTimeout(()=>wus[idx]?.classList.remove('wu-wrong'),600);
    if(G.mode==='practice'||G.mode==='projector')showFeedback('error','No es el NP',o.fase1.consejo);
  }
}

// ════════════════════════════════════════════════════════
// PHASE 2 — SUJETO / SUJETO TÁCITO
// ════════════════════════════════════════════════════════
let p2picked=new Set(), p2pronoun=null;

function renderPhase2(el,o){
  p2picked=new Set();p2pronoun=null;
  const hasExplicit=Array.isArray(o.fase2?.sujeto_indices)&&o.fase2.sujeto_indices.length>0;
  const offerChoice=!hasExplicit; // Show both buttons when no explicit subject

  el.innerHTML=instCard(2,'② Sujeto',
    hasExplicit?'Identifica el Sujeto de la oración':'¿Cómo es el sujeto de esta oración?',
    hasExplicit
      ? 'Haz clic en <strong>todas las palabras</strong> que forman el Sujeto y pulsa "Confirmar".'
      : 'Observa la desinencia del verbo y determina si hay un sujeto tácito o si la oración es impersonal.',
    o.fase2.consejo
  )+`<div class="sent-card folio-sheet">
    <div class="sent-scroll"><div class="sent-wrap" id="p2-sent" role="list" aria-label="Palabras de la oración"></div></div>
  </div>`;

  if(offerChoice){
    el.innerHTML+=`
    <div class="subj-choice-panel" id="p2-choice" role="group" aria-label="Tipo de sujeto">
      <button type="button" class="subj-choice-btn" id="p2-btn-tacito" onclick="p2ChooseTacito()">
        <span class="subj-choice-icon">Ø</span>
        <span class="subj-choice-title">Sujeto tácito</span>
        <span class="subj-choice-desc">El sujeto no aparece pero se recupera de la desinencia verbal</span>
      </button>
      <button type="button" class="subj-choice-btn" id="p2-btn-imp" onclick="p2ChooseImpersonal()">
        <span class="subj-choice-icon">⊗</span>
        <span class="subj-choice-title">Sin sujeto (impersonal)</span>
        <span class="subj-choice-desc">No existe sujeto gramatical posible en esta oración.</span>
      </button>
    </div>
    <div id="p2-tacito-panel" class="tacito-panel" style="display:none">
      <span class="tacito-panel-lbl">¿Qué pronombre personal corresponde a la desinencia del verbo?</span>
      <div class="pronoun-grid" id="pronoun-grid"></div>
      <div class="tacito-confirm">
        <button type="button" class="btn btn-primary" id="p2-confirm-tacito" onclick="confirmPronoun()" disabled>Confirmar pronombre</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="p2BackToChoice()">← Volver</button>
      </div>
    </div>
    <div id="p2-msg" role="status" style="font-size:.95rem;font-weight:700;margin-top:12px;display:none"></div>`;
  } else {
    el.innerHTML+=`
    <div class="action-bar">
      <button type="button" class="btn btn-primary" id="p2-confirm" onclick="confirmSubject()" disabled>Confirmar sujeto</button>
      <button type="button" class="btn btn-ghost" onclick="clearP2()">Limpiar</button>
    </div>
    <div id="p2-msg" role="status" style="font-size:.95rem;font-weight:700;margin-top:12px;display:none"></div>`;
  }

  const sent=el.querySelector('#p2-sent');
  o.palabras.forEach((w,i)=>{
    const isVerb=G.verbIndices.includes(i);
    const div=document.createElement('div');
    div.className='wu'+(isPunct(w)?' is-punct':'')+(isVerb?' wu-verb':(offerChoice?'':' wu-select'));
    div.id=`p2w${i}`;
    div.innerHTML=`<span class="wu-badge" aria-hidden="true">${isVerb?'NP':'Suj.'}</span><span class="wu-text">${w}</span>`;
    if(!isPunct(w)&&!isVerb&&!offerChoice){
      div.setAttribute('role','button');div.setAttribute('tabindex','0');div.setAttribute('aria-pressed','false');
      div.onclick=()=>toggleP2(i,div);
      div.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleP2(i,div);}};
    }
    sent.appendChild(div);
  });
  gluePunctToNeighbors(sent);
}

function p2ChooseTacito(){
  const o=G.oraciones[G.idx];
  const correct=o.fase2?.sujeto_tacito===true;
  if(correct){
    document.getElementById('p2-btn-tacito')?.classList.add('scc-tacito');
    document.getElementById('p2-btn-imp')?.style.setProperty('display','none');
    document.getElementById('p2-tacito-panel').style.display='block';
    buildPronounGrid();playClick();playSuccess();
    showCorrectFlash('¡Sujeto tácito identificado!');
  }else{
    G.totalErrors++;G.sentenceErrors[G.idx].sujetoErrors++;
    playError();
    if(G.mode==='practice'||G.mode==='projector'){
      const s=lookupScaffold('Sujeto tácito','Sujeto','syntax');
      showFeedback('error','No es sujeto tácito',s.fijo,s.pista);
    }
  }
}
function p2ChooseImpersonal(){
  const o=G.oraciones[G.idx];
  const correct=o.fase2?.sin_sujeto===true;
  if(correct){
    document.getElementById('p2-btn-imp')?.classList.add('scc-impersonal');
    document.getElementById('p2-btn-tacito')?.style.setProperty('display','none');
    const msg=document.getElementById('p2-msg');
    if(msg){msg.style.display='block';msg.style.color='var(--purple)';msg.textContent='✓ Correcto: oración impersonal — sin sujeto gramatical.';}
    playClick();playSuccess();G.subjectIdxs=[];G.sujetoTacito=null;
    showCorrectFlash('¡Oración impersonal!');
    setTimeout(()=>transitionPhase(3),600);
  }else{
    G.totalErrors++;G.sentenceErrors[G.idx].sujetoErrors++;
    playError();
    if(G.mode==='practice'||G.mode==='projector'){
      const s=lookupScaffold('Impersonal','Sujeto','syntax');
      showFeedback('error','Esta oración tiene sujeto',s.fijo,s.pista);
    }
  }
}
function p2BackToChoice(){
  document.getElementById('p2-tacito-panel').style.display='none';
  document.getElementById('p2-btn-tacito')?.classList.remove('scc-tacito');
  document.getElementById('p2-btn-imp')?.style.removeProperty('display');
  p2pronoun=null;
  document.querySelectorAll('.pronoun-btn').forEach(b=>b.classList.remove('pron-sel'));
  const cf=document.getElementById('p2-confirm-tacito');if(cf)cf.disabled=true;
}

function buildPronounGrid(){
  const grid=document.getElementById('pronoun-grid');if(!grid)return;
  grid.innerHTML=PRONOUNS.map((p,idx)=>
    `<button type="button" class="pronoun-btn" data-idx="${idx}" data-val="${p.match[0]}" onclick="selectPronoun(${idx})">${p.display}</button>`
  ).join('');
}
function showPronounPicker(){
  document.getElementById('p2-tacito-panel').style.display='block';
}
function hidePronounPicker(){
  p2BackToChoice();
}
function selectPronoun(idx){
  p2pronoun=PRONOUNS[idx];
  document.querySelectorAll('.pronoun-btn').forEach(b=>b.classList.remove('pron-sel'));
  document.querySelector(`.pronoun-btn[data-idx="${idx}"]`)?.classList.add('pron-sel');
  const cf=document.getElementById('p2-confirm-tacito');if(cf)cf.disabled=false;
}
function confirmPronoun(){
  if(!p2pronoun)return;
  const o=G.oraciones[G.idx];
  const nucleo=(o.fase2?.nucleo_tacito||'').toLowerCase();
  const correct=p2pronoun.match.some(v=>nucleo.startsWith(v.toLowerCase()));
  if(correct){
    G.sujetoTacito=p2pronoun.display;
    const msg=document.getElementById('p2-msg');
    msg.style.display='block';msg.style.color='var(--green)';
    msg.textContent=`✓ Sujeto tácito correcto: ${p2pronoun.display}`;
    setTimeout(()=>transitionPhase(3),500);
  }else{
    G.totalErrors++;G.sentenceErrors[G.idx].sujetoErrors++;
    document.querySelectorAll('.pronoun-btn').forEach(b=>b.classList.remove('pron-sel'));
    const cf=document.getElementById('p2-confirm-tacito');if(cf)cf.disabled=true;
    p2pronoun=null;
    if(G.mode==='practice'||G.mode==='projector')showFeedback('error','Pronombre incorrecto',o.fase2.consejo);
  }
}

function toggleP2(idx,div){
  if(p2picked.has(idx)){p2picked.delete(idx);div.classList.remove('wu-picked');div.setAttribute('aria-pressed','false');}
  else{p2picked.add(idx);div.classList.add('wu-picked');div.setAttribute('aria-pressed','true');}
  const cf=document.getElementById('p2-confirm');if(cf)cf.disabled=p2picked.size===0;
}
function clearP2(){
  p2picked.clear();
  document.querySelectorAll('#p2-sent .wu-picked').forEach(el=>{el.classList.remove('wu-picked');el.setAttribute('aria-pressed','false');});
  const cf=document.getElementById('p2-confirm');if(cf)cf.disabled=true;
}
function confirmSubject(){
  const o=G.oraciones[G.idx];
  const sol=[...o.fase2.sujeto_indices].sort((a,b)=>a-b);
  const sel=[...p2picked].sort((a,b)=>a-b);
  const ok=sel.length===sol.length&&sel.every((v,i)=>v===sol[i]);
  if(ok){
    G.subjectIdxs=[...sol];
    sol.forEach((idx,pos)=>{
      const wu=document.getElementById(`p2w${idx}`);
      if(wu){
        wu.classList.remove('wu-picked','wu-select');
        wu.classList.add('wu-subj','wu-bounce');
        // Only show "Suj." badge on first word; hide on rest
        if(pos>0){const badge=wu.querySelector('.wu-badge');if(badge)badge.style.opacity='0';}
      }
    });
    const msg=document.getElementById('p2-msg');
    msg.style.display='block';msg.style.color='var(--green)';
    msg.textContent='✓ Sujeto identificado correctamente.';
    const cf=document.getElementById('p2-confirm');if(cf)cf.disabled=true;
    playClick(); playSuccess();
    showCorrectFlash('¡Sujeto correcto!');
    setTimeout(()=>transitionPhase(3),500);
  }else{
    G.totalErrors++;G.sentenceErrors[G.idx].sujetoErrors++;
    if(G.mode==='practice'||G.mode==='projector'){
      const scaffold=lookupScaffold('selección incorrecta','Sujeto','syntax');
      trackError('sintaxis','Sujeto');
      showFeedback('error','Selección incorrecta',scaffold.fijo,scaffold.pista,'Sujeto');
    }
  }
}

// ════════════════════════════════════════════════════════
// PHASE 3 — FUNCIONES DEL PREDICADO
// Step 0: PV/PN classification
// Step 1+: Argumentos / Adjuntos split pool
// ════════════════════════════════════════════════════════
let p3={},dragSt={},p3sel={box:null,el:null};

function renderPhase3(el,o){
  // Defensive: if the sentence has no fase3 data (data integrity issue) or
  // no interactive blocks (e.g. sentences like "Llueve" or "El gato duerme"
  // where every block is pre-resolved as Sujeto/NP), there is literally
  // nothing for the student to classify. Skip straight to success so the
  // student can advance to the next sentence instead of being stuck on a
  // blank screen with PV/PN buttons that lead nowhere.
  if(!o.fase3 || !Array.isArray(o.fase3.bloques) || o.fase3.bloques.length===0){
    console.warn('[renderPhase3] Sentence has no fase3 data — auto-advancing', o?.id);
    setTimeout(()=>showSuccessScreen(o), 50);
    return;
  }
  const bloques=o.fase3.bloques;
  const interactiveBlocks=bloques.filter(b=>!isPreResolved(b.solucion));
  if(interactiveBlocks.length===0){
    // Mark any pre-resolved blocks (Sujeto, NP, tácito) as already resolved
    // in G.phase3Results so scoring functions count them correctly, then
    // jump to the success screen.
    bloques.forEach((b,i)=>{
      if(isPreResolved(b.solucion)){
        const[tipo,func]=b.solucion.includes('|')?b.solucion.split(' | '):['—','—'];
        G.phase3Results[b.id]={id:`pre${i}`,label:b.solucion,tipo,func,preResolved:true};
      }
    });
    console.log('[renderPhase3] No interactive blocks — auto-completing fase 3 for', o?.id);
    setTimeout(()=>showSuccessScreen(o), 50);
    return;
  }
  const correctLabels=interactiveBlocks.map(b=>b.solucion);
  const {argTraps,adjTraps,marTraps}=genTraps3Split(correctLabels,2);

  // Build tagged boxes sorted into their correct pool
  const correctBoxes=correctLabels.map((label,i)=>{
    // Marcas have no tipo prefix — label is just the function name
    const isMarca=FUNC_MARCAS.has(label);
    const tipo=isMarca?'':label.split(' | ')[0];
    const func=isMarca?label:label.split(' | ')[1];
    return{id:`c3${i}`,label,tipo,func};
  });

  const slots={},slotOk={};
  bloques.forEach((b,i)=>{
    if(isPreResolved(b.solucion)){
      const[tipo,func]=b.solucion.includes('|')?b.solucion.split(' | '):['—','—'];
      const box={id:`pre${i}`,label:b.solucion,tipo,func,preResolved:true};
      slots[b.id]=box;slotOk[b.id]='pre';
      G.phase3Results[b.id]=box;
    }else{slots[b.id]=null;slotOk[b.id]=null;}
  });

  p3={
    slots,slotOk,
    argPool:shuffle([...correctBoxes.filter(b=>FUNC_ARGUMENTOS.has(b.func)),...argTraps.map((t,i)=>({id:`ta${i}`,label:t.label,tipo:t.tipo,func:t.func}))]),
    adjPool:shuffle([...correctBoxes.filter(b=>isAdjunto(b.func)),...adjTraps.map((t,i)=>({id:`td${i}`,label:t.label,tipo:t.tipo,func:t.func}))]),
    marPool:shuffle([...correctBoxes.filter(b=>FUNC_MARCAS.has(b.func)),...marTraps.map((t,i)=>({id:`tm${i}`,label:t.label,tipo:t.tipo,func:t.func}))]),
    pvpnDone:G.pvpnDone
  };
  p3sel={box:null,el:null};

  // Sprint 1: arrancar el watcher de indicador de duda para esta oración
  _startP3HesitationWatcher();

  const tipoPred=o.fase3.tipo_predicado||'PV';
  const locked=`opacity:${p3.pvpnDone?1:.35};pointer-events:${p3.pvpnDone?'all':'none'};transition:opacity .3s`;

  el.innerHTML=renderContextStrip(o,false)+
    instCard(3,'③ Análisis del Predicado',
      'Clasifica cada bloque del predicado y la oración',
      'Primero determina el tipo de predicado. Luego arrastra cada etiqueta al bloque correspondiente. Usa las tres secciones del pool para orientarte.',
      'Argumentos: exigidos por el verbo. Adjuntos: opcionales y desplazables. Marcas y Modificadores: operan sobre la enunciación o la estructura de la oración, no sobre el verbo.'
    )+
    (p3.pvpnDone
      ? `<div class="pvpn-done-badge">✓ Predicado ${tipoPred==='PV'?'Verbal (PV)':'Nominal (PN)'} identificado</div>`
      : `<div class="pvpn-grid" id="pvpn-grid">
          <button type="button" class="pvpn-card" id="pvpn-pv" onclick="selectPvPn('PV','${tipoPred}')">
            <span class="pvpn-icon">🔧</span>
            <div class="pvpn-title">PV — Predicado Verbal</div>
            <div class="pvpn-desc">Verbo con contenido léxico pleno. Puede llevar CD, CI, CC, C.Rég…</div>
          </button>
          <button type="button" class="pvpn-card" id="pvpn-pn" onclick="selectPvPn('PN','${tipoPred}')">
            <span class="pvpn-icon">🔗</span>
            <div class="pvpn-title">PN — Predicado Nominal</div>
            <div class="pvpn-desc">Verbo copulativo (ser, estar, parecer) + Atributo. El Atributo puede sustituirse por "lo".</div>
          </button>
        </div>`
    )+
    `<div id="p3-blks" class="blk-grid" role="list" style="${locked}"></div>
     <div id="p3-pool-wrap" style="${locked}">
       <div class="pool-triple">
         <div class="pool-section pool-section-arg">
           <div class="pool-section-hdr"><span class="pool-section-icon">⚓</span><div><div class="pool-section-title">Argumentos</div><div class="pool-section-sub">Lo que el verbo exige para completar su significado</div></div></div>
           <div class="tags-wrap" id="p3-pool-args"></div>
         </div>
         <div class="pool-section pool-section-adj">
           <div class="pool-section-hdr"><span class="pool-section-icon">🌿</span><div><div class="pool-section-title">Adjuntos</div><div class="pool-section-sub">Prescindibles y desplazables. Indica tipo exacto de CC.</div></div></div>
           <div class="tags-wrap" id="p3-pool-adjs"></div>
         </div>
         <div class="pool-section pool-section-mar">
           <div class="pool-section-hdr"><span class="pool-section-icon">🔖</span><div><div class="pool-section-title">Marcas y periféricos</div><div class="pool-section-sub">Actúan sobre la enunciación o la estructura, no sobre el verbo</div></div></div>
           <div class="tags-wrap" id="p3-pool-mars"></div>
         </div>
       </div>
     </div>`;

  buildP3Blocks(o);buildP3Pool();
}

function selectPvPn(selected, correct){
  if(selected===correct){
    G.pvpnDone=true;p3.pvpnDone=true;
    const blk=document.getElementById('p3-blks'),pool=document.getElementById('p3-pool-wrap');
    if(blk){blk.style.opacity='1';blk.style.pointerEvents='all';}
    if(pool){pool.style.opacity='1';pool.style.pointerEvents='all';}
    const grid=document.getElementById('pvpn-grid');
    if(grid){
      const badge=document.createElement('div');
      badge.className='pvpn-done-badge';
      badge.textContent=`✓ Predicado ${selected==='PV'?'Verbal (PV)':'Nominal (PN)'} identificado`;
      grid.replaceWith(badge);
    }
  }else{
    G.totalErrors++;G.sentenceErrors[G.idx].pvpnErrors++;
    const btn=document.getElementById('pvpn-'+selected.toLowerCase());
    if(btn){btn.classList.add('pvpn-err');setTimeout(()=>btn?.classList.remove('pvpn-err'),600);}
    if(G.mode==='practice'||G.mode==='projector'){
      const scaffold=lookupScaffold(selected==='PV'?'PV':'PV', correct==='PN'?'PN':'PV', 'syntax');
      trackError('sintaxis',correct==='PN'?'PN':'PV');
      showFeedback('error','Tipo de predicado incorrecto',scaffold.fijo,scaffold.pista,correct==='PN'?'PN':'PV');
    }
  }
}

function buildP3Blocks(o){
  const cont=document.getElementById('p3-blks');if(!cont)return;
  cont.innerHTML='';
  // Sort bloques by sentence position (min index), preserving original order
  const sortedBloques=[...o.fase3.bloques].sort((a,b)=>{
    const minA=a.indices&&a.indices.length>0?Math.min(...a.indices):99;
    const minB=b.indices&&b.indices.length>0?Math.min(...b.indices):99;
    // Tácito blocks (empty indices) go to their natural position based on what they represent
    return minA-minB;
  });
  sortedBloques.forEach(b=>{
    const isPre=p3.slotOk[b.id]==='pre';
    const isOk=p3.slotOk[b.id]===true;
    const isTac=isTacitoBlock(b);
    const slot=p3.slots[b.id];

    const words=b.indices.length>0?b.indices.map(i=>o.palabras[i]).join(' '):'(Ø)';
    const div=document.createElement('div');
    div.className='blk-card'+(isOk?' blk-done':'')+(isPre?' blk-pre':'')+(isTac?' blk-tacito':'');
    div.setAttribute('role','listitem');

    let slotHTML;
    if(isPre||isTac){
      const css=funcTagCss(slot?.label||'');
      slotHTML=`<div class="dslot ds-pre" aria-label="Pre-resuelto: ${slot?.label||''}">
        <span class="tag ${css} tag-pre">${tagContent(slot?.label||'—')}<span class="tag-pre-badge">✓</span></span>
      </div>`;
    }else{
      slotHTML=`<div class="dslot ${isOk?'ds-ok':''}" id="ds${b.id}"
        role="button" tabindex="${isOk?'-1':'0'}" aria-label="Hueco para ${words}"
        ondragover="p3Over(event,'${b.id}')" ondragleave="p3Leave('${b.id}')" ondrop="p3Drop(event,'${b.id}')"
        onclick="p3SlotClick('${b.id}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();p3SlotClick('${b.id}')}">
        ${slot?buildTag3HTML(slot,b.id,isOk):'<span class="dslot-hint">← selecciona una etiqueta</span>'}
      </div>`;
    }
    div.innerHTML=`<div class="blk-words" title="${words}">${words}</div>${slotHTML}`;
    cont.appendChild(div);
  });
}
function buildTag3HTML(box,slotId,isOk){
  const css=funcTagCss(box.label);
  return`<span class="tag ${css}" id="tg${box.id}" data-id="${box.id}"
    role="button" tabindex="${isOk?'-1':'0'}" aria-label="${box.label}"
    draggable="${isOk?'false':'true'}"
    ondragstart="tagDragStart(event,'${box.id}')"
    onclick="tagClick3(event,'${box.id}')"
    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();tagClick3(event,'${box.id}')}">
    ${tagContent(box.label)}
  </span>`;
}
function buildP3Pool(){
  const argWrap=document.getElementById('p3-pool-args');
  const adjWrap=document.getElementById('p3-pool-adjs');
  const marWrap=document.getElementById('p3-pool-mars');
  if(argWrap)argWrap.innerHTML=buildPoolSection(p3.argPool);
  if(adjWrap)adjWrap.innerHTML=buildPoolSection(p3.adjPool);
  if(marWrap)marWrap.innerHTML=buildPoolSection(p3.marPool);
}
function buildPoolSection(pool){
  if(!pool||pool.length===0)return'<span style="font-size:.78rem;color:var(--muted);font-style:italic">Todas colocadas.</span>';
  return pool.map(b=>{
    // CC subtypes display as generic 'CC' in pool; submenu picks the exact subtype
    const bFunc=b.func||b.label.split(' | ')[1]||'';
    const displayLabel=isCC(bFunc)?(b.tipo?b.tipo+' | CC':'CC'):b.label;
    const css=funcTagCss(displayLabel);
    const ccHint=isCC(bFunc)?'<span class="cc-sub-badge">▸ tipo</span>':'';
    return`<span class="tag ${css}" id="tg${b.id}" data-id="${b.id}"
      role="button" tabindex="0" aria-label="${displayLabel}" aria-grabbed="false"
      draggable="true"
      ondragstart="tagDragStart(event,'${b.id}')"
      onclick="tagClick3(event,'${b.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();tagClick3(event,'${b.id}')}">
      ${tagContent(displayLabel)}${ccHint}
    </span>`;
  }).join('');
}

function tagDragStart(e,id){dragSt={id};e.dataTransfer.effectAllowed='move';_resetP3Idle();}
function p3Over(e,sid){e.preventDefault();document.getElementById('ds'+sid)?.classList.add('ds-over');}
function p3Leave(sid){document.getElementById('ds'+sid)?.classList.remove('ds-over');}
function p3Drop(e,sid){e.preventDefault();p3Leave(sid);if(dragSt.id){p3Place(dragSt.id,sid,e.clientX,e.clientY);dragSt={};}}
function tagClick3(e,id){
  e.stopPropagation();
  _resetP3Idle();
  if(p3sel.el){p3sel.el.classList.remove('tag-sel');if(p3sel.box?.id===id){p3sel={box:null,el:null};return;}}
  const el=document.getElementById('tg'+id);if(el)el.classList.add('tag-sel');
  const allPool=[...p3.argPool,...p3.adjPool,...p3.marPool];
  const box=allPool.find(b=>b.id===id)||Object.values(p3.slots).find(s=>s?.id===id);
  p3sel={box:box||null,el};
}
function p3SlotClick(sid){
  _resetP3Idle();
  if(p3.slotOk[sid]||!p3sel.box)return;
  if(p3sel.el)p3sel.el.classList.remove('tag-sel');
  const slot=document.getElementById('ds'+sid);
  const r=slot?slot.getBoundingClientRect():{left:window.innerWidth/2,bottom:200};
  p3Place(p3sel.box.id,sid,r.left,r.bottom);
  p3sel={box:null,el:null};
}

// ════════════════════════════════════════════════════════
// CC SUBTIPO SUBMENÚ v4.0
// Cuando el alumno suelta una etiqueta CC, aparece un submenú
// para elegir el subtipo exacto.
// ════════════════════════════════════════════════════════
let ccPending = null; // {boxId, slotId, x, y}

function showCCSubmenu(boxId, slotId, clientX, clientY) {
  closeCCSubmenu();
  const bloque = G.oraciones[G.idx]?.fase3?.bloques?.find(b=>b.id===slotId);
  const correct = bloque?.solucion || '';
  const correctFunc = correct.split(' | ')[1] || '';
  // Only show submenu if correct answer IS a CC subtype
  if(!isCC(correctFunc)) return false;
  ccPending = {boxId, slotId};
  const menu = document.createElement('div');
  menu.className = 'cc-submenu';
  menu.id = 'cc-submenu';
  // Position near drop point
  const vw=window.innerWidth, vh=window.innerHeight;
  const menuH = Math.min(320, vh * 0.8);
  // Place below click point, but flip up if too close to bottom
  let left = Math.min(Math.max(8, clientX - 10), vw - 330);
  let top = clientY + 12;
  if(top + menuH > vh - 20) top = Math.max(20, clientY - menuH - 10);
  menu.style.cssText=`left:${left}px;top:${top}px`;
  menu.innerHTML=`<div class="cc-submenu-title">¿Qué tipo de CC es?</div>
    <div class="cc-submenu-grid">${CC_SUBTIPOS.map(sub=>
      `<button type="button" class="cc-sub-btn" onclick="confirmCCSubtipo('${sub}')">${sub}</button>`
    ).join('')}</div>
    <button type="button" class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;font-size:.75rem" onclick="closeCCSubmenu()">Cancelar</button>`;
  document.body.appendChild(menu);
  document.addEventListener('keydown', ccEscape);
  return true;
}

function ccEscape(e){if(e.key==='Escape')closeCCSubmenu();}

function closeCCSubmenu(){
  document.getElementById('cc-submenu')?.remove();
  document.removeEventListener('keydown',ccEscape);
  ccPending=null;
}

function confirmCCSubtipo(chosen){
  if(!ccPending) return;
  const {boxId, slotId} = ccPending;
  closeCCSubmenu();
  // Now evaluate: is the chosen subtipo correct?
  const o=G.oraciones[G.idx];
  const bloque=o.fase3.bloques.find(b=>b.id===slotId);
  if(!bloque) return;
  const correctFull=bloque.solucion; // e.g. "SP | CC Tiempo"
  const [correctTipo, correctFunc]=correctFull.split(' | ');
  // The box being placed
  const allPool=[...p3.argPool,...p3.adjPool,...p3.marPool];
  const box=allPool.find(b=>b.id===boxId)||Object.values(p3.slots).find(s=>s?.id===boxId);
  if(!box) return;
  const placedTipo=box.tipo;
  const tipoOk=(placedTipo===correctTipo);
  const subtipoOk=(chosen===correctFunc);
  if(tipoOk && subtipoOk){
    // Full correct
    // Update box label to show chosen subtipo
    box.label=`${placedTipo} | ${chosen}`;
    box.func=chosen;
    _p3PlaceCorrect(box, slotId, o);
  } else if(tipoOk && isCC(correctFunc) && isCC(chosen)){
    // CC type correct but wrong subtipo
    // Practice: auto-correct + half error (pedagogical, IF-AT style).
    // Exam: count as full error (paper exam parity).
    G.totalErrors++;
    const se=G.sentenceErrors[G.idx];
    if(G.mode==='exam'){
      // Exam: full error, NO auto-correct, retry like any wrong answer
      se.blockErrors[slotId]=(se.blockErrors[slotId]||0)+1;
      const sl=document.getElementById('ds'+slotId);
      if(sl){sl.classList.add('ds-err-flash');setTimeout(()=>sl?.classList.remove('ds-err-flash'),660);}
      // Restore the box back to the pool — student must try again
      // (The box was visually placed; we need to reset it)
      box.label = box.label.split(' | ')[0] + ' | ' + 'CC'; // back to generic CC
      box.func = '';
      buildP3Blocks(o); buildP3Pool();
    } else {
      // Practice/projector: half-credit + auto-correct
      se.blockErrors[slotId]=(se.blockErrors[slotId]||0)+0.5;
      box.label=`${correctTipo} | ${correctFunc}`;
      box.func=correctFunc;
      _p3PlaceCorrect(box, slotId, o, true);
      showFeedback('warn','Tipo de CC incorrecto',
        `Has marcado "${chosen}", pero era "${correctFunc}". Se ha corregido automáticamente. Cuenta como medio error.`);
    }
  } else {
    // Wrong
    G.totalErrors++;G.sentenceErrors[G.idx].blockErrors[slotId]=(G.sentenceErrors[G.idx].blockErrors[slotId]||0)+1;
    const sl=document.getElementById('ds'+slotId);
    if(sl){sl.classList.add('ds-err-flash');setTimeout(()=>sl?.classList.remove('ds-err-flash'),660);}
    if(G.mode==='practice'||G.mode==='projector')showFeedback('error','CC incorrecto',bloque.consejo||'Revisa el tipo de complemento circunstancial.','',correctFunc);
  }
}

function _p3PlaceCorrect(box, slotId, o, partial=false){
  // Remove from pools
  p3.argPool=p3.argPool.filter(b=>b.id!==box.id);
  p3.adjPool=p3.adjPool.filter(b=>b.id!==box.id);
  p3.marPool=p3.marPool.filter(b=>b.id!==box.id);
  for(const k of Object.keys(p3.slots)){if(p3.slots[k]?.id===box.id){p3.slots[k]=null;p3.slotOk[k]=null;}}
  p3.slots[slotId]=box;
  p3.slotOk[slotId]=partial?'partial':true;
  G.phase3Results[slotId]=box;
  // Tracking de aciertos para los chips de micro-progreso (solo aciertos plenos)
  if(!partial && typeof trackSuccess === 'function'){
    const placedFn = (box.label||'').split(' | ')[1] || '';
    if(placedFn) trackSuccess('sint', placedFn);
  }
  buildP3Blocks(o);buildP3Pool();
  const allDone=o.fase3.bloques.filter(b=>!isPreResolved(b.solucion))
    .every(b=>p3.slotOk[b.id]===true||p3.slotOk[b.id]==='partial');
  if(allDone){
    // Last function: silent feedback (let showSuccessScreen play its own sound)
    popSlotByWeight(slotId);
    setTimeout(()=>{showSuccessScreen(o);},500);
  }
  else{
    playClick();playSuccess();
    // Visual feedback: pop the slot + toast
    popSlotByWeight(slotId);
    const correctFunc = (p3.slots[slotId]?.label||'').split(' | ')[1] || '';
    showCorrectFlash(correctFunc ? '¡' + correctFunc + ' correcto!' : '¡Correcto!');
  }
}

function p3Place(boxId,slotId,clientX,clientY){
  _resetP3Idle();
  if(!p3.pvpnDone)return;
  const o=G.oraciones[G.idx];
  const bloque=o.fase3.bloques.find(b=>b.id===slotId);
  if(!bloque||p3.slotOk[slotId])return;
  const allPool=[...p3.argPool,...p3.adjPool,...p3.marPool];
  const box=allPool.find(b=>b.id===boxId)||Object.values(p3.slots).find(s=>s?.id===boxId);
  if(!box)return;
  document.getElementById('tg'+boxId)?.classList.remove('tag-sel');
  // If box is a generic CC and correct answer is CC subtype → show submenu
  const correctFunc=(bloque.solucion||'').split(' | ')[1]||'';
  if(isCC(box.func||box.label.split(' | ')[1]||'')&&isCC(correctFunc)){
    if(showCCSubmenu(boxId,slotId,clientX||window.innerWidth/2,clientY||window.innerHeight/2))return;
  }
  // GRAMMAR RULES ENGINE (v4.7)
  const bWords = (bloque.indices||[]).map(i=>G.oraciones[G.idx].palabras[i]).join(' ');
  const bFunc  = bloque.solucion.includes('|') ? bloque.solucion.split(' | ')[1] : bloque.solucion;
  const bTipo  = bloque.solucion.includes('|') ? bloque.solucion.split(' | ')[0] : '';
  const correctedFunc = GrammarRules.applyAll(bFunc, bWords);
  const solucionAjustada = bTipo ? `${bTipo} | ${correctedFunc}` : correctedFunc;
  const correct = box.label === solucionAjustada;
  if(correct){
    p3.argPool=p3.argPool.filter(b=>b.id!==boxId);
    p3.adjPool=p3.adjPool.filter(b=>b.id!==boxId);
    p3.marPool=p3.marPool.filter(b=>b.id!==boxId);
    for(const k of Object.keys(p3.slots)){if(p3.slots[k]?.id===boxId){p3.slots[k]=null;p3.slotOk[k]=null;}}
    p3.slots[slotId]=box;p3.slotOk[slotId]=true;
    G.phase3Results[slotId]=box;
    // Tracking de aciertos para los chips de micro-progreso
    if(typeof trackSuccess === 'function'){
      const placedFn = (box.label||'').split(' | ')[1] || '';
      if(placedFn) trackSuccess('sint', placedFn);
    }
    buildP3Blocks(o);buildP3Pool();
    const allDone=o.fase3.bloques.filter(b=>!isPreResolved(b.solucion)).every(b=>p3.slotOk[b.id]===true);
    if(allDone){
      // Last function: silent feedback (let showSuccessScreen play its own sound)
      popSlotByWeight(slotId);
      setTimeout(()=>{showSuccessScreen(o);},500);
    } else {
      // Mid-sentence: visual + audio feedback
      playClick();playSuccess();
      popSlotByWeight(slotId);
      const placedFunc = (box.label||'').split(' | ')[1] || '';
      showCorrectFlash(placedFunc ? '¡' + placedFunc + ' correcto!' : '¡Correcto!');
    }
  }else{
    G.totalErrors++;const se=G.sentenceErrors[G.idx];se.blockErrors[slotId]=(se.blockErrors[slotId]||0)+1;
    const sl=document.getElementById('ds'+slotId);
    if(sl)sl.classList.add('ds-err-flash');setTimeout(()=>sl?.classList.remove('ds-err-flash'),660);
    if(G.mode==='practice'||G.mode==='projector'){
      let marcadaFunc=box.func||box.label.split(' | ')[1]||'';
      // If the box was a CC type but user never chose subtype via submenu, show generic "CC"
      if(isCC(marcadaFunc)) marcadaFunc='CC';
      const realFunc=correctedFunc||bFunc;
      const scaffold=lookupScaffold(marcadaFunc,realFunc,'syntax');
      trackError('sintaxis',realFunc);
      showFeedback('error','Etiqueta incorrecta',scaffold.fijo,scaffold.pista,realFunc);
    }
  }
}

// ════════════════════════════════════════════════════════
// SUCCESS OVERLAY
// ════════════════════════════════════════════════════════
function showSuccessScreen(o){
  playComplete();
  // Mark this sentence as completed for scoring
  if(G.sentenceCompleted) G.sentenceCompleted[G.idx]=true;
  const se=G.sentenceErrors[G.idx];
  const totalSentErrs=(se.npErrors||0)+(se.sujetoErrors||0)+(se.pvpnErrors||0)+
    Object.values(se.blockErrors||{}).reduce((a,b)=>a+b,0)+Object.values(se.elemErrors||{}).reduce((a,b)=>a+b,0);
  // Progression: award XP, update streak/mission, trigger celebrations
  // (only in practice mode; exam mode doesn't give XP to prevent gaming)
  if(G.mode === 'practice'){
    try{ onSentenceCompleted(o, totalSentErrs); }catch(e){console.warn('[progress]',e);}
  }
  const isLast=G.idx+1>=G.oraciones.length;
  const completedMsg = G.mode==='exam' ? '¡Examen completado!' : '¡Análisis completado!';
  document.getElementById('succ-title').textContent=isLast?completedMsg:'¡Oración completada!';
  document.getElementById('succ-oracion').textContent=o.oracion_completa;
  const badge=document.getElementById('succ-badge');
  badge.className='succ-badge '+(totalSentErrs===0?'se-zero':totalSentErrs<=2?'se-some':'se-many');
  badge.innerHTML=totalSentErrs===0?'⭐ ¡Sin errores en esta oración!':`${totalSentErrs} error${totalSentErrs!==1?'es':''} en esta oración`;

  // Pedagogical: list functions practiced in this sentence (chips)
  const funcsBox = document.getElementById('succ-funcs');
  const funcsList = document.getElementById('succ-funcs-list');
  if(funcsBox && funcsList){
    const funcs = new Set();
    if((o.fase2?.sujeto_indices||[]).length > 0) funcs.add('Sujeto');
    else if(o.fase2?.sujeto_tacito) funcs.add('Sujeto tácito');
    else if(o.fase2?.sin_sujeto) funcs.add('Impersonal');
    funcs.add('NP');
    (o.fase3?.bloques||[]).forEach(b=>{
      const f = (b.solucion||'').split(' | ')[1];
      if(f && f!=='—') funcs.add(f);
    });
    if(funcs.size > 0){
      funcsList.innerHTML = [...funcs].map(f=>'<span class="succ-func-chip">'+f+'</span>').join('');
      funcsBox.style.display = 'block';
    } else {
      funcsBox.style.display = 'none';
    }
  }

  // Sprint 1: inventario acumulado de aciertos en la sesión. Solo en práctica
  // (en examen no queremos distraer con métricas durante la prueba).
  const sessBox = document.getElementById('succ-session-progress');
  const sessList = document.getElementById('succ-session-progress-list');
  if(sessBox && sessList && G.mode === 'practice'){
    const counts = (typeof getSessionFuncSuccess === 'function')
      ? getSessionFuncSuccess() : {};
    const entries = Object.entries(counts).filter(([_, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    if(entries.length > 0){
      // Las claves de _sessionFuncSuccess son IDs internos seguros
      // (FUNC_WEIGHT: 'CD', 'CI', 'Atr.', 'CC Tiempo'…) sin HTML, no
      // requieren escape.
      sessList.innerHTML = entries.map(([f, n]) =>
        '<span class="succ-func-chip succ-func-chip-count"><b>'+f+'</b> × '+n+'</span>'
      ).join('');
      sessBox.style.display = 'block';
    } else {
      sessBox.style.display = 'none';
    }
  } else if(sessBox){
    sessBox.style.display = 'none';
  }

  // Sprint 1: sugerencia de Zona de Desarrollo Próximo. Solo en práctica
  // y a partir de la 5.ª oración completada.
  const zdpBox = document.getElementById('succ-zdp');
  if(zdpBox && G.mode === 'practice'){
    zdpBox.innerHTML = _buildZdpSuggestionHtml();
    zdpBox.style.display = zdpBox.innerHTML ? 'block' : 'none';
  } else if(zdpBox){
    zdpBox.style.display = 'none';
  }

  // A) Metacognitive summary — only in exam mode, and only between sentences (not final)
  const metaBox = document.getElementById('succ-meta');
  if(metaBox){
    if(G.mode==='exam' && !isLast){
      // Count total analyzable blocks of this sentence (from fase3.bloques + phase1/2)
      const totalBlocks = (o.fase3?.bloques?.length||0) + 2; // +2 for fase1 (NP) and fase2 (Sujeto)
      const blockErrKeys = Object.keys(se.blockErrors||{}).filter(k => (se.blockErrors[k]||0)>0);
      const firstTryBlocks = (o.fase3?.bloques?.length||0) - blockErrKeys.length
                           + ((se.npErrors||0)===0?1:0)
                           + ((se.sujetoErrors||0)===0?1:0);
      // Elapsed time
      const elapsed = Math.max(0, Math.floor((Date.now() - (G.sentenceStartTime||Date.now()))/1000));
      const mm = Math.floor(elapsed/60);
      const ss = String(elapsed%60).padStart(2,'0');
      const timeLabel = mm>0 ? `${mm}:${ss}` : `${elapsed}s`;
      document.getElementById('succ-meta-first').textContent = Math.max(0,firstTryBlocks) + '/' + totalBlocks;
      document.getElementById('succ-meta-errs').textContent = totalSentErrs;
      document.getElementById('succ-meta-time').textContent = timeLabel;
      metaBox.style.display = 'block';
    } else {
      metaBox.style.display = 'none';
    }
  }

  const btn=document.getElementById('succ-btn');
  const lastLabel = G.mode==='exam' ? 'Enviar examen →' : G.mode==='projector' ? 'Volver al Panel →' : 'Ver resultados →';
  btn.textContent=isLast?lastLabel:'Siguiente oración →';
  document.getElementById('succ-overlay').classList.add('open');
  setTimeout(()=>btn.focus(),100);
}
function doNextSentence(){
  document.getElementById('succ-overlay').classList.remove('open');
  G.idx++;
  if(G.idx>=G.oraciones.length){G.mode==='projector'?goTeacherPanel():goResults();return;}
  resetSentenceState();
  renderGame();
}

// ════════════════════════════════════════════════════════
// FEEDBACK MODAL
// ════════════════════════════════════════════════════════
function showFeedback(type,title,consejo,pista='',funcForMicroLeccion=''){
  const isErr=type==='error';
  if(isErr)playError();else{playClick();playSuccess();}
  document.getElementById('fb-wrap').className='fb-icon-wrap '+(isErr?'is-err':'is-ok');
  document.getElementById('fb-icon').textContent=isErr?'✗':'✓';
  const tEl=document.getElementById('fb-title');tEl.className='fb-title '+(isErr?'is-err':'is-ok');tEl.textContent=title;
  // Consejo as a structured card with label + body (instead of flat text)
  const consejoEl = document.getElementById('fb-consejo');
  if(consejo){
    consejoEl.className = 'fb-card fb-consejo-card';
    consejoEl.innerHTML =
      '<div class="fb-card-label"><span>💡</span><span>Consejo</span></div>' +
      '<div class="fb-card-body"></div>';
    consejoEl.querySelector('.fb-card-body').textContent = consejo;
    consejoEl.style.display = 'block';
  } else {
    consejoEl.style.display = 'none';
  }

  // Micro-lección button (only when function triggers threshold)
  updateMicroLeccionButton(funcForMicroLeccion);

  // C6: gestión de pistas
  const pistaWrap = document.getElementById('fb-pista-wrap');
  const pistaBtn  = document.getElementById('fb-pista-btn');
  const pistaBox  = document.getElementById('fb-pista-content');
  const btnTxt    = document.getElementById('fb-pista-btn-txt');
  if(typeof clearPistaTimers === 'function') clearPistaTimers();

  const mode = (typeof G!=='undefined'&&G.mode)||'';
  const hp   = getHintsPractice();
  const he   = getHintsExam();
  const showPistaSection = pista && isErr &&
    ((mode==='practice'||mode==='projector') && hp==='on');
  const showConsejoOnly  = isErr && mode==='exam' && he==='first_only';

  if(pistaWrap){
    pistaWrap.style.display = showPistaSection ? 'block' : 'none';
    if(pistaBox){
      pistaBox.style.display='none';
      // Pista as a structured card too — populated when revealed
      pistaBox.dataset.pistaText = pista || '';
    }
    if(pistaBtn)  { pistaBtn.style.display='flex'; pistaBtn.disabled=true; }
    if(btnTxt)    { btnTxt.textContent='Reflexiona un momento…'; }
    if(showPistaSection) _startPistaCountdown();
  }

  // En examen sin comentarios, no abrir el overlay
  if(mode==='exam' && he==='none') return;

  openOverlay('fb-overlay');
}
function closeFb(){
  if(typeof clearPistaTimers === 'function') clearPistaTimers();
  closeOverlay('fb-overlay');
}

// ════════════════════════════════════════════════════════
// SCORING ENGINE
// ════════════════════════════════════════════════════════
function calcDetailedScore(){
  const totals={np:{avail:0,earned:0},sujeto:{avail:0,earned:0},funciones:{avail:0,earned:0}};
  const perSentence=[];
  let completadas=0, noCompletadas=0;
  (G.oraciones||[]).forEach((o,idx)=>{
    const se=G.sentenceErrors[idx]||{};
    const completed = G.sentenceCompleted ? G.sentenceCompleted[idx] : true;
    const interBlocks=(o.fase3?.bloques||[]).filter(b=>!isPreResolved(b.solucion));

    // Calculate available points using weighted functions
    const npAvail=W.NP;
    const sujAvail=W.SUJETO;
    const pvpnAvail=W.FUNCION;
    let fnAvail=0;
    interBlocks.forEach(b=>{
      const func=(b.solucion||'').split(' | ')[1]||'';
      fnAvail+=W.FUNCION * getFuncWeight(func);
    });
    const sentAvail=npAvail+sujAvail+pvpnAvail+fnAvail;
    totals.np.avail+=npAvail;
    totals.sujeto.avail+=sujAvail;
    totals.funciones.avail+=pvpnAvail+fnAvail;

    if(completed){
      // Calculate earned points — ONLY if sentence was completed
      completadas++;
      // IF-AT atenuada: 0 err→100%, 1→50%, 2→25%, 3+→0%. Aplica a práctica y examen.
      const atenPenalty = (weight, errors) => {
        if (errors <= 0) return weight;
        if (errors === 1) return weight * 0.5;
        if (errors === 2) return weight * 0.25;
        return 0;
      };

      const npErrors = se.npErrors || 0;
      const sujErrors = se.sujetoErrors || 0;
      const pvpnErrors = se.pvpnErrors || 0;
      const npEarned   = atenPenalty(W.NP,     npErrors);
      const sujEarned  = atenPenalty(W.SUJETO, sujErrors);
      const pvpnEarned = atenPenalty(W.FUNCION, pvpnErrors);
      let fnEarned=0;
      interBlocks.forEach(b=>{
        const func=(b.solucion||'').split(' | ')[1]||'';
        const w=W.FUNCION * getFuncWeight(func);
        const errs=(se.blockErrors||{})[b.id]||0;
        fnEarned += atenPenalty(w, errs);
      });
      totals.np.earned+=npEarned;
      totals.sujeto.earned+=sujEarned;
      totals.funciones.earned+=pvpnEarned+fnEarned;
      perSentence.push({id:o.id,avail:sentAvail,earned:npEarned+sujEarned+pvpnEarned+fnEarned,completed:true});
    } else {
      noCompletadas++;
      // Incomplete sentence = 0 earned points
      perSentence.push({id:o.id,avail:sentAvail,earned:0,completed:false});
    }
  });
  const totalAvail=totals.np.avail+totals.sujeto.avail+totals.funciones.avail;
  const totalEarned=totals.np.earned+totals.sujeto.earned+totals.funciones.earned;
  const score=totalAvail>0?Math.round((totalEarned/totalAvail)*100)/10:0;
  // Score restricted to sentences actually completed (used when practice is exited early)
  const availOnDone = perSentence.filter(p=>p.completed).reduce((a,p)=>a+p.avail,0);
  const earnedOnDone = perSentence.filter(p=>p.completed).reduce((a,p)=>a+p.earned,0);
  const scoreOnDone = availOnDone>0 ? Math.round((earnedOnDone/availOnDone)*100)/10 : 0;
  return{score,totalAvail,totalEarned,totals,perSentence,completadas,noCompletadas,scoreOnDone,availOnDone,earnedOnDone};
}

// ════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// Sprint 1 · Indicador de Zona de Desarrollo Próximo
// Tras 5+ oraciones en la sesión actual, si una función acumula ≥3 errores
// con ≤5 aciertos, se sugiere practicarla específicamente con un botón
// que activa el filtro de práctica.
// ════════════════════════════════════════════════════════
function _buildZdpSuggestionHtml(){
  if(!G || G.mode !== 'practice') return '';
  const completedCount = (G.sentenceCompleted||[]).filter(Boolean).length;
  if(completedCount < 5) return '';
  const errs = (typeof getSessionFuncErrors === 'function') ? getSessionFuncErrors() : {};
  const succ = (typeof getSessionFuncSuccess === 'function') ? getSessionFuncSuccess() : {};
  // Candidato: ≥3 errores en sesión y ≤5 aciertos en esa misma función
  const candidatos = Object.entries(errs)
    .filter(([f, n]) => n >= 3 && (succ[f]||0) <= 5)
    .sort((a, b) => b[1] - a[1]);
  if(candidatos.length === 0) return '';
  const [func, nErr] = candidatos[0];
  const safeFunc = String(func).replace(/'/g,'\\\'');
  return ''
    + '<div style="margin:14px 0 4px;padding:14px 16px;background:linear-gradient(135deg,#FFF7ED 0%,#FED7AA 100%);border:1.5px solid #F59E0B;border-radius:12px;text-align:left">'
    +   '<div style="font-size:.72rem;font-weight:800;color:#9A3412;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">🎯 Sugerencia adaptativa</div>'
    +   '<div style="font-size:.88rem;color:#7C2D12;margin-bottom:10px;line-height:1.5">Parece que <b>'+func+'</b> te está costando ('+nErr+' errores en esta sesión). ¿Quieres practicar oraciones con esa función?</div>'
    +   '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
    +     '<button type="button" onclick="document.getElementById(\'succ-zdp\').style.display=\'none\'" style="background:transparent;color:#9A3412;border:1.5px solid #C2410C;border-radius:10px;padding:6px 14px;font-weight:700;font-size:.82rem;cursor:pointer">Ahora no</button>'
    +     '<button type="button" onclick="practiceFocusOn(\''+safeFunc+'\')" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;border:none;border-radius:10px;padding:6px 14px;font-weight:800;font-size:.82rem;cursor:pointer;box-shadow:0 2px 6px rgba(217,119,6,.3)">Sí, filtrar por '+func+' →</button>'
    +   '</div>'
    + '</div>';
}

// Activa el filtro de práctica para una función concreta y cierra el
// overlay de éxito. Invocada por el botón de la sugerencia ZDP.
function practiceFocusOn(funcion){
  try{
    // Marcar la checkbox de la función en el practice-filters-bar
    const checkboxes = document.querySelectorAll('#pf-checkboxes input[type="checkbox"]');
    let found = false;
    checkboxes.forEach(cb => {
      if(cb.value === funcion){ cb.checked = true; found = true; }
    });
    if(!found){
      flashPracticeMsg('⚠ No hay filtro disponible para '+funcion, 'var(--amber)');
      return;
    }
    if(typeof applyPracticeFilters === 'function') applyPracticeFilters();
    // Cerrar overlay y seguir con la siguiente oración filtrada
    document.getElementById('succ-zdp').style.display = 'none';
    document.getElementById('succ-overlay').classList.remove('open');
    G.idx++;
    if(G.idx >= G.oraciones.length){ goResults(); return; }
    resetSentenceState();
    renderGame();
    flashPracticeMsg('🎯 Filtrando por '+funcion, 'var(--blue)');
  }catch(e){
    console.warn('[practiceFocusOn]', e);
  }
}

// ════════════════════════════════════════════════════════
// Sprint 1 · Curva de sesión visible
// Compara la 1.ª mitad y la 2.ª mitad de las oraciones completadas en
// porcentaje de aciertos a la primera. Se muestra solo en práctica con
// ≥5 oraciones completadas. Sin libs externas.
// ════════════════════════════════════════════════════════
function _buildSessionCurveHtml(){
  if(!G || !G.sentenceErrors || !G.sentenceCompleted) return '';
  const oracs = G.oraciones || [];
  // Índices de oraciones completadas, manteniendo orden temporal.
  const completedIdxs = G.sentenceCompleted
    .map((done, i) => done ? i : -1)
    .filter(i => i >= 0);
  if(completedIdxs.length < 5) return '';
  // Para cada oración completada, % de bloques interactivos resueltos sin error
  // (a la 1.ª, no parciales). Es el indicador más cercano a "rendimiento" sin
  // depender de los pesos del ScoringEngine.
  const pctPerSent = completedIdxs.map(i => {
    const o = oracs[i];
    const se = G.sentenceErrors[i] || {};
    const bloques = (o && o.fase3 && Array.isArray(o.fase3.bloques)) ? o.fase3.bloques : [];
    const interactivos = bloques.filter(b => !isPreResolved(b.solucion));
    const totalSlots = interactivos.length + 2; // +NP +Sujeto
    if(totalSlots === 0) return null;
    const blockErrKeys = Object.keys(se.blockErrors || {}).filter(k => (se.blockErrors[k]||0) > 0);
    const firstTryBlocks = Math.max(0, interactivos.length - blockErrKeys.length)
                         + ((se.npErrors||0) === 0 ? 1 : 0)
                         + ((se.sujetoErrors||0) === 0 ? 1 : 0);
    return Math.round((firstTryBlocks / totalSlots) * 100);
  }).filter(v => v !== null);
  if(pctPerSent.length < 5) return '';
  const mid = Math.floor(pctPerSent.length / 2);
  const first = pctPerSent.slice(0, mid);
  const last  = pctPerSent.slice(pctPerSent.length - mid);
  const avg = arr => Math.round(arr.reduce((a,b)=>a+b, 0) / arr.length);
  const pctInicio = avg(first);
  const pctFinal  = avg(last);
  const delta = pctFinal - pctInicio;
  let titulo, color;
  if(delta >= 10)      { titulo = 'Has mejorado durante la sesión'; color = '#059669'; }
  else if(delta >= 0)  { titulo = 'Te has mantenido estable';        color = '#2563EB'; }
  else if(delta >= -10){ titulo = 'Bajón ligero al final';            color = '#D97706'; }
  else                 { titulo = 'Has rendido peor al final — ¿cansancio?'; color = '#DC2626'; }
  const bar = (pct) => '<div style="background:linear-gradient(180deg,'+color+' 0%,'+color+'cc 100%);width:42px;height:'+Math.max(8, Math.round(pct*1.6))+'px;border-radius:8px 8px 0 0;transition:height .5s ease-out"></div>';
  return ''
    + '<div style="margin:18px 0 6px;padding:18px 20px;background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1.5px solid #CBD5E1;border-radius:14px">'
    + '<div style="font-size:.72rem;font-weight:800;color:#1E293B;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;text-align:center">📈 Curva de la sesión · ' + completedIdxs.length + ' oraciones</div>'
    + '<div style="display:flex;align-items:flex-end;justify-content:center;gap:48px;height:180px;padding:0 8px">'
    +   '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">'
    +     bar(pctInicio)
    +     '<div style="font-size:1.05rem;font-weight:900;color:'+color+';font-family:\'Fraunces\',serif">'+pctInicio+'%</div>'
    +     '<div style="font-size:.7rem;color:#64748B;text-transform:uppercase;letter-spacing:.05em;font-weight:700">1.ª mitad</div>'
    +   '</div>'
    +   '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">'
    +     bar(pctFinal)
    +     '<div style="font-size:1.05rem;font-weight:900;color:'+color+';font-family:\'Fraunces\',serif">'+pctFinal+'%</div>'
    +     '<div style="font-size:.7rem;color:#64748B;text-transform:uppercase;letter-spacing:.05em;font-weight:700">2.ª mitad</div>'
    +   '</div>'
    + '</div>'
    + '<div style="text-align:center;font-size:.88rem;font-weight:700;color:'+color+';margin-top:14px">'+titulo+(delta!==0?' ('+(delta>0?'+':'')+delta+' pts)':'')+'</div>'
    + '</div>';
}

async function goResults(){
  cleanAllTimers();
  const detail = calcDetailedScore();
  // In practice mode, if the student exits early, grade them on what they did
  // (not on the unfinished pool), so the gauge reflects actual performance
  // rather than abandonment.
  const exitedEarly = (G.mode==='practice' && detail.noCompletadas > 0);
  const score        = exitedEarly ? detail.scoreOnDone   : detail.score;
  const totalAvail   = exitedEarly ? detail.availOnDone   : detail.totalAvail;
  const totalEarned  = exitedEarly ? detail.earnedOnDone  : detail.totalEarned;
  const {totals, perSentence, completadas, noCompletadas} = detail;

  // ─── Student-friendly mode toggle ─────────────────────────────────
  // Practice and missions hide score/grade/breakdown/sentence-list to
  // reduce stress and visual noise. Only exam shows the full report.
  // CSS rules with .is-student-friendly do the actual hiding.
  const isStudentFriendly = (G.mode === 'practice' || !!_activeMission);
  const resScreen = document.getElementById('screen-results');
  resScreen.classList.toggle('is-student-friendly', isStudentFriendly);
  
  // Motivational messages instead of grade labels
  const grade=score>=9?{l:'¡Impresionante! Dominas este nivel.',e:'🏆',c:'#D97706',msg:'¿Listo para un reto mayor?'}
    :score>=7?{l:'¡Muy buen trabajo!',e:'⭐',c:'var(--blue)',msg:'Solo unos detalles por pulir.'}
    :score>=5?{l:'Vas por buen camino.',e:'💪',c:'var(--green)',msg:'Revisa los consejos y vuelve a intentarlo.'}
    :{l:'Cada error te acerca a entenderlo.',e:'📖',c:'var(--purple)',msg:'Es normal fallar al principio. ¿Practicamos juntos?'};
  
  document.getElementById('res-emoji').textContent = exitedEarly ? `${grade.e} Sesión terminada` : `${grade.e} Resultado`;
  const sfLabel=SUBFASE_CONFIGS[G.subfase]?.label||'Análisis completo';
  let missionLabel = _activeMission?`Misión: ${_activeMission.nombre}`:(G.mode==='exam'?`Examen PIN ${G.examPin}`:'Modo Práctica');
  if(exitedEarly){
    const total = (G.oraciones||[]).length;
    missionLabel += ` · ${completadas}/${total} oraciones`;
  }
  document.getElementById('res-sub').textContent=`${G.name} · ${missionLabel} · ${sfLabel}`;

  // Inject (or update) the encouraging hero block — visible only when
  // .is-student-friendly is on (CSS rules handle the toggle).
  let enc = resScreen.querySelector('.res-encourage');
  if(!enc){
    enc = document.createElement('div');
    enc.className = 'res-encourage';
    enc.innerHTML = '<div class="re-icon"></div><div class="re-msg"></div><div class="re-stats"></div>';
    const innerEl = resScreen.querySelector('.res-inner');
    const hdrEl = resScreen.querySelector('.res-hdr');
    if(innerEl && hdrEl) innerEl.insertBefore(enc, hdrEl.nextSibling);
  }
  if(isStudentFriendly){
    let icon, message, stats;
    if(_activeMission){
      icon = '🎯';
      const total = (G.oraciones||[]).length;
      message = noCompletadas === 0 ? '¡Misión completada!' : 'Has trabajado tu misión';
      stats = `Has analizado ${completadas} de ${total} oración${total!==1?'es':''}` +
              (noCompletadas>0 ? `. Te quedan ${noCompletadas} para terminarla.` : '. ¡Buen trabajo!');
    } else {
      // Free practice: NEVER reference unfinished sentences.
      icon = completadas >= 5 ? '🌟' : '✏️';
      message = '¡Buen trabajo!';
      stats = completadas === 0
        ? 'Has empezado a practicar. Vuelve cuando quieras seguir.'
        : (completadas === 1
            ? 'Has analizado 1 oración. Cada análisis cuenta.'
            : `Has analizado ${completadas} oraciones. Sigue así para mejorar.`);
    }
    enc.querySelector('.re-icon').textContent = icon;
    enc.querySelector('.re-msg').textContent = message;
    enc.querySelector('.re-stats').textContent = stats;
  }

  document.getElementById('gauge-score').textContent=score.toFixed(1);
  document.getElementById('gauge-score').style.color=grade.c;
  document.getElementById('gauge-arc').style.stroke=grade.c;
  const circ=2*Math.PI*48;
  document.getElementById('gauge-arc').setAttribute('stroke-dasharray',`${(score/10)*circ} ${circ}`);
  document.getElementById('res-grade').textContent=grade.l;document.getElementById('res-grade').style.color=grade.c;
  document.getElementById('res-errs').innerHTML=`<span style="color:${grade.c};font-weight:700">${grade.msg}</span><br><span style="font-size:.78rem">${G.totalErrors} error${G.totalErrors!==1?'es':''} · ${totalEarned}/${totalAvail} puntos</span>`;
  
  // Build per-function error breakdown from phase3Results
  const funcErrors={};
  const funcCorrect={};
  (G.oraciones||[]).forEach((o,idx)=>{
    const se=G.sentenceErrors[idx]||{};
    (o.fase3?.bloques||[]).forEach(b=>{
      const func=(b.solucion||'').split(' | ')[1]||'';
      if(!func||func==='NP'||func==='Sujeto')return;
      const errs=(se.blockErrors||{})[b.id]||0;
      if(errs>0){funcErrors[func]=(funcErrors[func]||0)+errs;}
      else{funcCorrect[func]=(funcCorrect[func]||0)+1;}
    });
  });
  
  // Show function breakdown
  const allFuncs=[...new Set([...Object.keys(funcErrors),...Object.keys(funcCorrect)])];
  if(allFuncs.length>0){
    const breakdownHtml=allFuncs.sort((a,b)=>(funcErrors[b]||0)-(funcErrors[a]||0)).map(f=>{
      const err=funcErrors[f]||0;
      const ok=funcCorrect[f]||0;
      const total=err+ok;
      const pct=Math.round(ok/total*100);
      const color=pct>=80?'#059669':pct>=50?'#D97706':'#DC2626';
      const icon=pct>=80?'✓':pct>=50?'△':'✗';
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.05)">
        <span style="font-size:.85rem;font-weight:800;color:${color};min-width:20px">${icon}</span>
        <span style="flex:1;font-size:.85rem;font-weight:600">${f}</span>
        <div style="width:80px;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div></div>
        <span style="font-size:.78rem;color:var(--muted);min-width:45px;text-align:right">${ok}/${total}</span></div>`;
    }).join('');
    
    // Find functions with errors, ordered by severity, top 3 for advice
    const errored = allFuncs
      .filter(f => (funcErrors[f]||0) > 0)
      .sort((a,b) => (funcErrors[b]||0) - (funcErrors[a]||0))
      .slice(0, 3);

    // Cross-reference with historical error memory (taller_error_history)
    // so we can show what's a long-term weakness vs a one-off slip.
    let historicalTop = [];
    try {
      const hist = JSON.parse(localStorage.getItem('taller_error_history')||'{}');
      const histMode = hist['sintaxis'] || {};
      historicalTop = Object.entries(histMode)
        .filter(([f, n]) => n >= 3) // require at least 3 historical errors to be a "trend"
        .sort((a,b) => b[1]-a[1])
        .slice(0, 3)
        .map(([f, n]) => ({ func: f, count: n }));
    } catch(e) {}
    // Functions in the historical top that are NOT in this session's top
    // (i.e. long-term weaknesses the student didn't practice today)
    const erroredNames = new Set(errored);
    const historicalOnly = historicalTop.filter(h => !erroredNames.has(h.func));

    let adviceHtml = '';
    if(errored.length > 0){
      const items = errored.map(f => {
        const n = funcErrors[f] || 0;
        const histN = historicalTop.find(h => h.func === f)?.count;
        const pista = DICCIONARIO_BASE_SINTAXIS[f]?.pista || '';
        const histTag = (histN && histN >= 5)
          ? '<span style="display:inline-block;margin-left:6px;padding:1px 8px;background:#FEE2E2;color:#991B1B;border-radius:99px;font-size:.72rem;font-weight:700;letter-spacing:.02em">⚠ patrón recurrente</span>'
          : '';
        return '<li style="margin-bottom:6px"><strong>'+f+'</strong> ('+n+' error'+(n>1?'es':'')+' en esta sesión)'+histTag
          + (pista ? '<br><span style="color:#78350F;font-size:.82rem">'+pista+'</span>' : '')
          + '</li>';
      }).join('');
      const heading = errored.length === 1
        ? '💡 Función para repasar'
        : '💡 Funciones para repasar (por orden de prioridad)';
      adviceHtml = '<div style="margin-top:12px;padding:14px 16px;background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:10px;font-size:.85rem">'
        + '<strong style="color:#92400E;display:block;margin-bottom:8px">'+heading+'</strong>'
        + '<ol style="margin:0;padding-left:20px;color:#78350F">'+items+'</ol>'
        + '</div>';
    } else if(allFuncs.length > 0){
      adviceHtml = '<div style="margin-top:12px;padding:12px 14px;background:#DCFCE7;border:1.5px solid #86EFAC;border-radius:10px;font-size:.85rem;color:#14532D">'
        + '<strong>🎯 ¡Ningún error en esta sesión!</strong> Todas las funciones que has trabajado están bien.'
        + '</div>';
    }

    // Long-term weakness reminder (functions historically failed but not today)
    let trendHtml = '';
    if(historicalOnly.length > 0){
      const trendItems = historicalOnly.map(h => {
        const pista = DICCIONARIO_BASE_SINTAXIS[h.func]?.pista || '';
        return '<li style="margin-bottom:4px"><strong>'+h.func+'</strong> '
          + '<span style="color:#475569;font-size:.78rem">— '+h.count+' errores acumulados a lo largo del tiempo</span>'
          + (pista ? '<br><span style="color:#334155;font-size:.8rem">'+pista+'</span>' : '')
          + '</li>';
      }).join('');
      trendHtml = '<div style="margin-top:10px;padding:14px 16px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;font-size:.85rem">'
        + '<strong style="color:#1E3A8A;display:block;margin-bottom:6px">📈 Tendencia general</strong>'
        + '<p style="margin:0 0 8px;color:#1E40AF;font-size:.82rem">Estas funciones no las has trabajado hoy, pero te han dado problemas en sesiones anteriores. Considera incluirlas en tu próxima práctica:</p>'
        + '<ul style="margin:0;padding-left:20px;color:#1E40AF;list-style:disc">'+trendItems+'</ul>'
        + '</div>';
    }

    const container=document.getElementById('res-func-breakdown');
    // The breakdown bar table is heavy and not pedagogically useful for
    // students. We keep it ONLY for exam mode. Practice/missions show only
    // the advice and trend blocks (the user-facing pedagogical content).
    // Sprint 1: en práctica añadimos la curva de sesión (≥5 oraciones).
    const curveHtml = isStudentFriendly ? _buildSessionCurveHtml() : '';
    if(isStudentFriendly){
      container.innerHTML = curveHtml + adviceHtml + trendHtml;
    } else {
      container.innerHTML=`
        <div style="margin:16px 0;padding:16px 18px;background:var(--paper);border:1.5px solid var(--border);border-radius:12px">
          ${breakdownHtml}${adviceHtml}${trendHtml}
        </div>`;
    }
  } else {
    // Aunque no haya breakdown, en práctica con ≥5 oraciones la curva
    // de sesión vale por sí sola.
    const fallbackCurve = isStudentFriendly ? _buildSessionCurveHtml() : '';
    document.getElementById('res-func-breakdown').innerHTML = fallbackCurve;
  }

  if(G.mode==='exam'){
    document.getElementById('score-compare').style.display='flex';
    document.getElementById('sc-weighted').textContent=score.toFixed(1);document.getElementById('sc-weighted').style.color=grade.c;
    document.getElementById('sc-earned').textContent=totalEarned;document.getElementById('sc-avail').textContent=totalAvail;
  }
  // Build the heavy phase breakdown table and per-sentence detail list ONLY
  // for exam mode. In free practice / missions the student doesn't need to
  // see this and rendering 400+ unfinished rows is wasteful and overwhelming.
  if(!isStudentFriendly){
    const phaseCard=document.getElementById('res-phase-card');phaseCard.style.display='block';
    const phases=[
      {key:'sujeto',    label:'Identificar Sujeto',      icon:'👤',bg:'#EFF6FF',ic:'#1D4ED8'},
      {key:'funciones', label:'Funciones del Predicado',  icon:'🏷️',bg:'#FFF8F0',ic:'#C2410C'},
      {key:'np',        label:'NP — Verbo conjugado',     icon:'🔤',bg:'#F0FDF4',ic:'#166534'},
    ];
    document.getElementById('phase-table-body').innerHTML=phases.map(ph=>{
      const d=totals[ph.key];if(!d||d.avail===0)return'';
      const pct=Math.round((d.earned/d.avail)*100);
      const color=pct>=90?'var(--green)':pct>=60?'var(--blue)':pct>=40?'var(--amber)':'var(--red)';
      return`<tr><td><div class="ph-name"><div class="ph-icon" style="background:${ph.bg};color:${ph.ic}">${ph.icon}</div><span style="font-size:.83rem">${ph.label}</span></div></td>
        <td style="text-align:center"><div class="ph-bar-wrap"><div class="ph-bar-fill" style="width:${pct}%;background:${color}"></div></div></td>
        <td class="ph-pts"><strong>${d.earned}</strong>/${d.avail}</td>
        <td class="ph-pct" style="color:${color}">${pct}%</td></tr>`;
    }).join('')+`<tr><td><div class="ph-name"><div class="ph-icon" style="background:var(--paper3)">Σ</div><span>Total</span></div></td><td></td><td class="ph-pts"><strong>${totalEarned}</strong>/${totalAvail}</td><td class="ph-pct" style="color:${grade.c}">${score.toFixed(1)}</td></tr>`;
    // Summary of completeness
    const completedInfo = (typeof completadas!=='undefined') ? `<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px;padding:6px 10px;background:var(--paper2);border-radius:8px">✅ ${completadas} completadas${noCompletadas>0?` · ❌ ${noCompletadas} sin completar (0 pts)`:''}${noCompletadas>0?' · <strong style="color:var(--red)">Las oraciones no completadas puntúan 0</strong>':''}</div>` : '';
    document.getElementById('res-detail').innerHTML=completedInfo+(G.sentenceErrors||[]).map((se,i)=>{
      const o=G.oraciones.find(x=>x.id===se.id);
      const ps=perSentence[i]||{avail:1,earned:0,completed:false};
      const prev=(o?.oracion_completa||`Oración ${i+1}`).slice(0,50)+'…';
      if(!ps.completed){
        return`<div class="res-row" style="opacity:.6">
          <span style="font-family:monospace;font-size:.73rem;color:var(--muted);min-width:22px">${i+1}.</span>
          <span style="flex:1;font-family:'Lora',serif;font-size:.77rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${prev}</span>
          <span style="font-size:.7rem;color:var(--muted);white-space:nowrap;margin-right:6px">0/${ps.avail}pts</span>
          <span style="padding:2px 8px;border-radius:99px;font-size:.7rem;font-weight:700;background:#FEF2F2;color:#991B1B">❌ No completada</span>
        </div>`;
      }
      const sentErrs=(se.npErrors||0)+(se.sujetoErrors||0)+(se.pvpnErrors||0)+Object.values(se.blockErrors||{}).reduce((a,b)=>a+b,0)+Object.values(se.elemErrors||{}).reduce((a,b)=>a+b,0);
      const pctSent=Math.round((ps.earned/(ps.avail||1))*100);
      const cs=sentErrs===0?'background:#F0FDF4;color:#166534':sentErrs<=2?'background:#FEF3C7;color:#78350F':'background:#FEF2F2;color:#991B1B';
      return`<div class="res-row">
        <span style="font-family:monospace;font-size:.73rem;color:var(--muted);min-width:22px">${i+1}.</span>
        <span style="flex:1;font-family:'Lora',serif;font-size:.77rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${prev}</span>
        <span style="font-size:.7rem;color:var(--muted);white-space:nowrap;margin-right:6px">${ps.earned}/${ps.avail}pts</span>
        <span style="padding:2px 8px;border-radius:99px;font-size:.7rem;font-weight:700;${cs}">${sentErrs===0?'✓ Perfecto':`${sentErrs}err·${pctSent}%`}</span>
      </div>`;
    }).join('');
  } else {
    // Student-friendly mode: blank out the heavy elements (CSS hides them
    // anyway, but emptying their innerHTML keeps the DOM lean and avoids
    // any inherited content from a previous session).
    const phaseCard=document.getElementById('res-phase-card');
    if(phaseCard) phaseCard.style.display='none';
    const ptb = document.getElementById('phase-table-body');
    if(ptb) ptb.innerHTML='';
    const rd = document.getElementById('res-detail');
    if(rd) rd.innerHTML='';
  }
  if(G.mode==='exam'){
    const msg=document.getElementById('res-msg');msg.style.display='block';
    if(!G.usingMock){await submitResult(score,totalAvail,totalEarned,totals);}
    else{msg.style.background='var(--amber-lt)';msg.style.borderColor='#FDE68A';msg.style.color='var(--amber)';msg.textContent='⚠ Modo demo: sin API, la nota no se ha enviado al profesor.';}
  }

  // ─── Analytics: save practice session (silent, best-effort) ───────
  if(G.mode==='practice' && !G.usingMock){
    sendPracticeAnalytics({score: score});
  }
  // Show "practice my errors" button if there were errors
  const errBtn=document.getElementById('res-practice-errors');
  if(errBtn&&G.totalErrors>0&&G.mode==='practice') errBtn.style.display='block';
  
  // Mission: show info and save result
  const misInfo=document.getElementById('res-mission-info');
  if(_activeMission&&misInfo){
    misInfo.style.display='block';
    misInfo.textContent=`📋 Misión completada: ${_activeMission.nombre}`;
    // Save to API if available
    const apiUrl=getApiUrl();
    if(apiUrl&&!G.usingMock){
      try{
        const params=new URLSearchParams({action:'saveMisionResult',email:G.email,name:G.name,
          misionId:_activeMission.id,modo:'sintaxis',aciertos:String(totalEarned),
          errores:String(G.totalErrors),nota:String(score),detalle:JSON.stringify(funcErrors)});
        fetch(apiUrl+'?'+params.toString());
      }catch(e){}
    }
  }
  document.getElementById('screen-game').classList.remove('is-proj');
  showScreen('results');
}

function practiceMyErrors(){
  const errorHist=JSON.parse(localStorage.getItem('taller_error_history')||'{}');
  const sintErrors=errorHist.sintaxis||{};
  const topErrors=Object.entries(sintErrors).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  if(topErrors.length>0){
    localStorage.setItem('taller_exam_filters',JSON.stringify({funciones:topErrors,dificultad:0}));
  }
  _activeMission={id:'REFUERZO',nombre:'Refuerzo: '+topErrors.join(', '),modo:'sintaxis',funciones:topErrors,nOraciones:5};
  goLogin();
  // Auto-select practice mode after a tick
  setTimeout(()=>{
    const practBtn=document.querySelector('[data-mode="practice"]');
    if(practBtn)practBtn.click();
  },300);
}

// ════════════════════════════════════════════════════════
// UNIFIED NOTIFICATION SYSTEM
// type: 'info' | 'success' | 'warn' | 'error'
// ════════════════════════════════════════════════════════
const NOTIF_STYLES={
  info:   {bg:'var(--blue-lt)',  border:'#93C5FD',   color:'#1D4ED8'},
  success:{bg:'var(--green-lt)', border:'#86EFAC',   color:'#166534'},
  warn:   {bg:'var(--amber-lt)', border:'#FDE68A',   color:'#78350F'},
  error:  {bg:'var(--red-lt)',   border:'#FCA5A5',   color:'#991B1B'},
};
function showNotification(el, msg, type='info'){
  if(!el)return;
  const s=NOTIF_STYLES[type]||NOTIF_STYLES.info;
  el.style.display='block';
  el.style.background=s.bg;
  el.style.borderColor=s.border;
  el.style.color=s.color;
  el.textContent=msg;
  el.setAttribute('role','status');
}

let _pendingResult = null;
let _examSent = false; // prevent duplicate submissions

async function submitResult(score,totalAvail,totalEarned,totals){
  if(_examSent){
    const msg=document.getElementById('res-msg');
    msg.style.display='block';msg.textContent='✓ Resultado ya enviado.';
    msg.style.background='var(--green-lt)';msg.style.color='#166534';
    return;
  }
  const msg=document.getElementById('res-msg');
  const retryBtn=document.getElementById('res-send-btn');
  msg.style.display='block';retryBtn.style.display='none';
  msg.style.background='var(--blue-lt)';msg.style.borderColor='#93C5FD';msg.style.color='#1D4ED8';
  msg.textContent='⏳ Enviando resultado al profesor…';
  const apiUrl=getApiUrl();
  if(!apiUrl){msg.textContent='⚠ Sin URL de API.';msg.style.background='var(--red-lt)';msg.style.color='var(--red)';retryBtn.style.display='block';return;}
  const pb=totals||{};
  let elemFallados=0;
  (G.sentenceErrors||[]).forEach(se=>{
    if((se.npErrors||0)>0) elemFallados++;
    if((se.sujetoErrors||0)>0) elemFallados++;
    if((se.pvpnErrors||0)>0) elemFallados++;
    Object.values(se.blockErrors||{}).forEach(v=>{if(v>0)elemFallados++;});
  });
  const completadas=(G.sentenceCompleted||[]).filter(Boolean).length;
  const totalOr=G.oraciones.length;
  _pendingResult = {
    action:'saveResult',name:G.name||'',email:G.email||'',pin:G.examPin||'',
    grupo:G.examGrupo||'',evaluacion:G.examEval||'',examen:G.examName||'',
    score:String(score||0),
    sujeto:String((pb.sujeto||{}).earned||0),funciones:String((pb.funciones||{}).earned||0),
    np:String((pb.np||{}).earned||0),elementosFallados:String(elemFallados),
    completadas:String(completadas),totalOraciones:String(totalOr)
  };
  try{
    const params=new URLSearchParams(_pendingResult);
    const r=await fetchWithTimeout(apiUrl+'?'+params.toString(),{},12000);
    const d=await r.json();
    if(d.ok){
      msg.textContent='✓ Resultado enviado correctamente al profesor.';
      msg.style.background='var(--green-lt)';msg.style.borderColor='#86EFAC';msg.style.color='#166534';
      _pendingResult=null;
      _examSent=true; // block re-submission
    }else{
      throw new Error(d.error||'Error del servidor');
    }
  }catch(e){
    msg.textContent='⚠ No se pudo enviar: '+(e.message||'error de conexión')+'. Pulsa el botón para reintentar.';
    msg.style.background='var(--amber-lt)';msg.style.borderColor='#FDE68A';msg.style.color='var(--amber)';
    retryBtn.style.display='block';
  }
}

async function retrySendResult(){
  if(!_pendingResult){
    const msg=document.getElementById('res-msg');
    msg.textContent='No hay resultado pendiente.';msg.style.display='block';return;
  }
  const apiUrl=getApiUrl();
  if(!apiUrl)return;
  const msg=document.getElementById('res-msg');
  const retryBtn=document.getElementById('res-send-btn');
  msg.textContent='⏳ Reintentando…';msg.style.background='var(--blue-lt)';msg.style.color='var(--blue)';msg.style.display='block';
  try{
    const params=new URLSearchParams(_pendingResult);
    const r=await fetchWithTimeout(apiUrl+'?'+params.toString(),{},12000);
    const d=await r.json();
    if(d.ok){
      msg.textContent='✓ Resultado enviado correctamente.';
      msg.style.background='var(--green-lt)';msg.style.color='#166534';
      retryBtn.style.display='none';
      _pendingResult=null;
    }else throw new Error(d.error||'');
  }catch(e){
    msg.textContent='⚠ Sigue sin conectar. Muestra esta pantalla al profesor.';
    msg.style.background='var(--red-lt)';msg.style.color='var(--red)';
  }
}


// ════════════════════════════════════════════════════════════════════
// MÓDULO: SELECTOR DE MÓDULO — portada navigation
// ════════════════════════════════════════════════════════════════════
let currentModule = null; // 'sint' | 'maestro' | 'sint4' | 'arcade'

// ════════════════════════════════════════════════════════════════════
// GRUPOS — lista única y cerrada de clases.
// El alumno SOLO puede elegir de aquí (desplegable), nunca escribe a mano.
// Esto evita los desajustes de datos por nomenclaturas distintas
// (3ºA / 3A / 3 A / Tercero A …). Nomenclatura: ESO = NºLetra, Bach = NºBachLetra.
// → PARA EL PROFESOR: para añadir o quitar una clase, edita SOLO esta lista.
// ════════════════════════════════════════════════════════════════════
const GRUPOS = [
  '1ºA','1ºB','1ºC','1ºD','1ºE',
  '2ºA','2ºB','2ºC','2ºD','2ºE',
  '3ºA','3ºB','3ºC','3ºD','3ºE',
  '4ºA','4ºB','4ºC','4ºD','4ºE',
  '1ºBachA','1ºBachB','1ºBachC','1ºBachD',
  '2ºBachA','2ºBachB','2ºBachC','2ºBachD'
];

// Devuelve el HTML de <option> para un desplegable de grupo.
// `sel`         (opcional) marca como seleccionada la opción que coincida.
// `placeholder` (opcional) etiqueta de la primera opción vacía.
function grupoOptionsHTML(sel, placeholder){
  const ph = placeholder || '— Elige tu clase —';
  return `<option value="">${ph}</option>`
    + GRUPOS.map(g=>`<option value="${g}"${g===sel?' selected':''}>${g}</option>`).join('');
}

// Rellena cualquier <select class="grupo-select"> que esté vacío.
// Acepta data-grupo-placeholder para personalizar la opción vacía
// (p.ej. "(todas)" en filtros del profesor). Se llama al cargar el DOM.
function populateGrupoSelects(){
  document.querySelectorAll('select.grupo-select').forEach(sel=>{
    if(sel.options.length<=0 || (sel.options.length===1 && !sel.options[0].value)){
      const prev=sel.value;
      sel.innerHTML=grupoOptionsHTML(prev, sel.dataset.grupoPlaceholder);
    }
  });
}

const LOGIN_PANELS = {
  sint: `
    <p style="font-weight:800;font-size:.9rem;color:var(--ink);margin-bottom:12px">🔤 Análisis Sintáctico</p>
    <div class="field">
      <label>Modo de sesión</label>
      <div class="sel-grid" role="radiogroup">
        <button type="button" class="sel-card" id="mc-practice" onclick="setMode('practice')" role="radio" aria-checked="false">
          <span class="sel-icon">📖</span><span class="sel-title">Práctica</span><span class="sel-desc">Aleatorio · Con pistas</span>
        </button>
        <button type="button" class="sel-card" id="mc-exam" onclick="setMode('exam')" role="radio" aria-checked="false">
          <span class="sel-icon">📝</span><span class="sel-title">Examen</span><span class="sel-desc">PIN requerido · Sin pistas</span>
        </button>
      </div>
      <p id="e-mode" class="ferr" role="alert"></p>
    </div>
    <div id="subfase-block" class="field">
      <label>Profundidad del análisis</label>
      <div class="subfase-grid" id="subfase-grid"></div>
      <p id="e-subfase" class="ferr" role="alert"></p>
    </div>
    <div id="pin-block" style="display:none;margin-bottom:17px">
      <label for="inp-pin" style="display:block;font-weight:700;font-size:.85rem;margin-bottom:7px;color:var(--ink2)">PIN del examen</label>
      <input id="inp-pin" class="input input-pin" type="password" inputmode="numeric" maxlength="4" placeholder="····">
      <p id="e-pin" class="ferr" role="alert"></p>
    </div>`,

  maestro: `
    <p style="font-weight:800;font-size:.9rem;color:#059669;margin-bottom:12px">🧬 Análisis Morfológico</p>
    <div class="field">
      <label>Nivel de profundidad</label>
      <div class="sel-grid" style="grid-template-columns:1fr 1fr 1fr" role="radiogroup">
        <button type="button" class="sel-card" id="mm-aprendiz" onclick="setMaestroNivel('aprendiz');setMorphTipoSilent('analisis')" role="radio" aria-checked="false">
          <span class="sel-icon">🌱</span><span class="sel-title">Aprendiz</span><span class="sel-desc">Solo categoría</span>
        </button>
        <button type="button" class="sel-card" id="mm-eso34-lvl" onclick="setMaestroNivel('eso34');setMorphTipoSilent('analisis')" role="radio" aria-checked="false">
          <span class="sel-icon">📗</span><span class="sel-title">3.º–4.º ESO</span><span class="sel-desc">Atributos esenciales</span>
        </button>
        <button type="button" class="sel-card" id="mm-maestro-lvl" onclick="setMaestroNivel('maestro');setMorphTipoSilent('analisis')" role="radio" aria-checked="false">
          <span class="sel-icon">🧬</span><span class="sel-title">Maestro</span><span class="sel-desc">Análisis PAU</span>
        </button>
      </div>
      <p id="e-maestronivel" class="ferr" role="alert"></p>
    </div>
    <div class="field">
      <label>Modalidad</label>
      <div class="sel-grid" role="radiogroup">
        <button type="button" class="sel-card" id="mm-prac" onclick="setMaestroMode('practice');setMorphTipoSilent('analisis')" role="radio" aria-checked="false">
          <span class="sel-icon">📖</span><span class="sel-title">Práctica</span><span class="sel-desc">Con feedback</span>
        </button>
        <button type="button" class="sel-card" id="mm-exam" onclick="setMaestroMode('exam');setMorphTipoSilent('analisis')" role="radio" aria-checked="false">
          <span class="sel-icon">📝</span><span class="sel-title">Examen</span><span class="sel-desc">Sin feedback · Nota</span>
        </button>
      </div>
      <p id="e-maestromode" class="ferr" role="alert"></p>
    </div>
    <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px">
      <button type="button" class="sel-card" id="mm-tipo-reto" onclick="setMorphTipo('reto')" role="radio" aria-checked="false" style="width:100%">
        <span class="sel-icon">⚡</span><span class="sel-title">Reto rápido</span><span class="sel-desc">Identifica categorías en tiempo limitado · Racha</span>
      </button>
      <p id="e-morphtipo" class="ferr" role="alert"></p>
    </div>
    <div id="morph-tipo-options" style="display:none"></div>`,

  sint4: `
    <p style="font-weight:800;font-size:.9rem;color:var(--purple);margin-bottom:12px">📐 Analizador de Sintagmas</p>
    <div style="background:var(--purple-lt);border:1px solid #DDD6FE;border-radius:12px;padding:14px 16px;margin-bottom:8px;font-size:.84rem;color:var(--purple);line-height:1.6">
      Identifica el tipo de sintagma y analiza la función de cada elemento: Núcleo, Modificadores, Término. Basado en la NGLE.
    </div>`,

  arcade: `
    <p style="font-weight:800;font-size:.9rem;color:#DC2626;margin-bottom:12px">🎮 Arcade</p>
    <div class="field">
      <label>Nick <span style="font-weight:400;color:var(--muted)">(visible en el ranking)</span></label>
      <input id="inp-nickname" class="input" type="text" placeholder="Ej: GramatiKing99" maxlength="20">
      <p id="e-nick" class="ferr" role="alert"></p>
    </div>
    <div class="field">
      <label>Tu clase <span style="font-weight:400;color:var(--muted)">(compite contra tus compañeros)</span></label>
      <select id="inp-arc-grupo" class="input grupo-select" style="max-width:160px">${grupoOptionsHTML()}</select>
    </div>
    <div class="field">
      <label>Elige tu modo</label>
      <div class="arc-mode-grid" role="radiogroup">
        <button type="button" class="arc-mode-card am-survival" id="arc-survival" onclick="setArcadeMode('survival')" role="radio" aria-checked="false">
          <span class="amc-icon">🔥</span>
          <span class="amc-body"><span class="amc-title">Supervivencia</span><span class="amc-desc">Un solo error y se acaba. ¿Cuánto aguantas?</span></span>
          <span class="amc-go">▶</span>
        </button>
        <button type="button" class="arc-mode-card am-timer" id="arc-timer" onclick="setArcadeMode('timer')" role="radio" aria-checked="false">
          <span class="amc-icon">⏱️</span>
          <span class="amc-body"><span class="amc-title">Contrarreloj</span><span class="amc-desc">Acierta para ganar segundos. ¡Suma sin parar!</span></span>
          <span class="amc-go">▶</span>
        </button>
        <button type="button" class="arc-mode-card am-ghost" id="arc-ghost" onclick="setArcadeMode('ghost')" role="radio" aria-checked="false">
          <span class="amc-icon">👻</span>
          <span class="amc-body"><span class="amc-title">Duelo Fantasma <span class="amc-tag">NUEVO</span></span><span class="amc-desc">Compite contra tu récord y la media de tu clase.</span></span>
          <span class="amc-go">▶</span>
        </button>
        <button type="button" class="arc-mode-card am-radar" id="arc-radar" onclick="setArcadeMode('radar')" role="radio" aria-checked="false">
          <span class="amc-icon">🛰️</span>
          <span class="amc-body"><span class="amc-title">Radar de Errores <span class="amc-tag">NUEVO</span></span><span class="amc-desc">Un análisis ya hecho esconde un fallo. Cázalo y corrígelo.</span></span>
          <span class="amc-go">▶</span>
        </button>
      </div>
      <p id="e-arcade" class="ferr" role="alert"></p>
    </div>`
};



// Skip sentence in practice mode (moves to next without scoring)
function skipCurrentSentence(){
  if(G.mode!=='practice' && G.mode!=='exam') return;
  // B) Exam mode requires confirmation — skipped sentences count partial (only what was done so far)
  if(G.mode === 'exam'){
    const se = G.sentenceErrors[G.idx] || {};
    const doneAny = (G.phase||1) > 1 ||
                    Object.values(se.blockErrors||{}).some(v=>v>0) ||
                    (se.npErrors||0)>0 || (se.sujetoErrors||0)>0;
    const msg = doneAny
      ? 'Vas a saltar esta oración. Lo que NO hayas analizado contará como incompleto y no sumará puntos.\n\n¿Continuar?'
      : 'Vas a saltar esta oración sin haberla analizado. Contará como 0 puntos.\n\n¿Continuar?';
    if(!confirm(msg)) return;
    // Skipped sentences stay marked as not completed (G.sentenceCompleted[G.idx] remains false)
    // so they're excluded from "completadas" count and scored 0
  }
  document.getElementById('succ-overlay')?.classList.remove('open');
  G.idx++;
  if(G.idx>=G.oraciones.length){goResults();return;}
  resetSentenceState();
  renderGame();
}

// ═══════════════════════════════════════════════════════
// PRACTICE FILTERS — Frontend-only, no backend calls
// ═══════════════════════════════════════════════════════
// G.oracionesFull holds the full pool; G.oraciones holds filtered subset

function togglePracticeFilters(){
  const panel=document.getElementById('pf-panel');
  if(!panel)return;
  const isOpen = panel.style.display!=='none';
  panel.style.display = isOpen ? 'none' : 'block';
  // Stop attention pulse once user has opened it for the first time
  const btn = document.getElementById('pf-toggle-btn');
  if(btn) btn.classList.add('pf-opened');
  // Recalcular sticky top tras cambio de altura
  try{ updateStickyTop(); }catch(e){}
}

function pfSetAll(val){
  document.querySelectorAll('#pf-checkboxes input').forEach(cb=>cb.checked=val);
  applyPracticeFilters();
}

function pfClearProhib(){
  document.querySelectorAll('#pf-prohib input').forEach(cb=>cb.checked=false);
  applyPracticeFilters();
}

function applyPracticeFilters(){
  if(G.mode!=='practice' || !G.oracionesFull) return;
  const deseadas = new Set([...document.querySelectorAll('#pf-checkboxes input:checked')].map(cb=>cb.value));
  const prohibidas = new Set([...document.querySelectorAll('#pf-prohib input:checked')].map(cb=>cb.value));

  // 3-layer filter (same pedagogical logic as teacher's panel):
  // 1. HARD EXCLUSION: remove oraciones with any prohibited function
  // 2. FLEXIBLE INCLUSION: keep oraciones with at least 1 desired function
  // 3. Empty-set fallback: if nothing matches, keep pool intact after exclusion
  let filtered = G.oracionesFull;
  if(prohibidas.size > 0){
    filtered = filtered.filter(o => {
      const funcs = o.funciones_presentes||[];
      return !funcs.some(f => prohibidas.has(f));
    });
  }
  if(deseadas.size > 0){
    const withDesired = filtered.filter(o => {
      const funcs = o.funciones_presentes||[];
      return funcs.some(f => deseadas.has(f));
    });
    // If exclusion+inclusion leaves nothing, keep just the exclusion result
    if(withDesired.length > 0) filtered = withDesired;
  }

  const countEl=document.getElementById('pf-count');
  if(countEl){
    const total=G.oracionesFull.length;
    const parts = [filtered.length+'/'+total];
    if(prohibidas.size > 0) parts.push('🚫'+prohibidas.size);
    countEl.textContent = '· '+parts.join(' · ');
  }

  if(filtered.length===0){
    flashPracticeMsg('⚠ No hay oraciones con esos filtros. Ajusta tu selección.', 'var(--amber)');
    return;
  }

  const currentId = G.oraciones[G.idx]?.id;
  G.oraciones = filtered;
  G.sentenceErrors = filtered.map(o=>({id:o.id,npErrors:0,sujetoErrors:0,pvpnErrors:0,blockErrors:{},elemErrors:{}}));
  G.sentenceCompleted = filtered.map(()=>false);
  const keepIdx = filtered.findIndex(o=>o.id===currentId);
  G.idx = keepIdx >= 0 ? keepIdx : 0;
  resetSentenceState();
  renderGame();
  flashPracticeMsg('✓ '+filtered.length+' oraciones disponibles', 'var(--green)');
}

function flashPracticeMsg(text, color){
  let el=document.getElementById('pf-flash');
  if(!el){
    el=document.createElement('div');
    el.id='pf-flash';
    el.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 18px;background:var(--paper);border:2px solid var(--border);border-radius:12px;font-weight:700;font-size:.85rem;z-index:100;box-shadow:0 4px 14px rgba(0,0,0,.15);pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent=text;
  el.style.color=color;
  el.style.borderColor=color;
  el.style.opacity='1';
  clearTimeout(el._timer);
  el._timer=setTimeout(()=>{el.style.transition='opacity .4s';el.style.opacity='0';},1800);
}

// ════════════════════════════════════════════════════════
// CORRECT SELECTION FEEDBACK — visual flash on correct answer
// ════════════════════════════════════════════════════════
let _correctFlashTimer = null;
function showCorrectFlash(label){
  // Subtle, professional green toast that doesn't block interaction
  let el = document.getElementById('correct-flash');
  if(!el){
    el = document.createElement('div');
    el.id = 'correct-flash';
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translate(-50%,0);background:linear-gradient(135deg,#16A34A 0%,#15803D 100%);color:#fff;font-weight:800;font-size:.95rem;padding:10px 22px;border-radius:24px;box-shadow:0 4px 14px rgba(22,163,74,.35);z-index:200;pointer-events:none;display:flex;align-items:center;gap:8px;font-family:inherit';
    document.body.appendChild(el);
  }
  el.innerHTML = '<span style="font-size:1.05rem">✓</span><span>' + (label || '¡Correcto!') + '</span>';
  el.style.animation = 'none';
  void el.offsetWidth; // restart animation
  el.style.animation = 'correctToastIn .28s ease-out forwards';
  el.style.display = 'flex';
  clearTimeout(_correctFlashTimer);
  _correctFlashTimer = setTimeout(()=>{
    el.style.animation = 'correctToastOut .4s ease-in forwards';
    setTimeout(()=>{ if(el) el.style.display='none'; }, 400);
  }, 700);
}

// Add a brief pop animation to the slot/element that was correctly filled.
// opts.hard = true para usar `.correct-pop-hard` (refuerzo más pronunciado en
// funciones de mayor peso pedagógico, ver FUNC_WEIGHT).
function popElement(elementId, opts){
  const el = document.getElementById(elementId);
  if(!el) return;
  const hard = !!(opts && opts.hard);
  const cls = hard ? 'correct-pop-hard' : 'correct-pop';
  el.classList.remove('correct-pop', 'correct-pop-hard');
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(()=>{ if(el) el.classList.remove(cls); }, hard ? 560 : 500);
}

// Helper: pop con detección automática de "hard" según el peso de la función
// colocada en el slot.
function popSlotByWeight(slotId){
  const func = (p3.slots[slotId]?.label||'').split(' | ')[1] || '';
  popElement('ds'+slotId, { hard: getFuncWeight(func) > 1.2 });
}

function goPrevSentenceFromGame(){
  if(G.mode!=='practice')return;
  if(G.idx<=0){flashPracticeMsg('Ya estás en la primera oración','var(--muted)');return;}
  document.getElementById('succ-overlay')?.classList.remove('open');
  G.idx--;
  resetSentenceState();
  renderGame();
}

// Keyboard shortcuts ← → for practice mode
document.addEventListener('keydown', function(e){
  if(G.mode!=='practice') return;
  // Don't trigger if user is typing in an input
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select') return;
  // Don't trigger if an overlay is open (feedback modal, etc.)
  if(document.querySelector('.overlay.open')) return;
  if(e.key==='ArrowRight'){ skipCurrentSentence(); e.preventDefault(); }
  else if(e.key==='ArrowLeft'){ goPrevSentenceFromGame(); e.preventDefault(); }
});
// Confirmation dialog when student presses "✕ Terminar" in topbar
function confirmExitSession(){
  if(!G || !G.mode){ goLogin(); return; }
  if(G.mode === 'practice'){
    // Don't drop the student straight to login: show a results summary so they
    // see what they did, what they got wrong, and which function to review next.
    // Only ask for confirmation if they have done some real work and there are
    // pending sentences (otherwise show results directly without confirmation).
    const completed = (G.sentenceCompleted||[]).filter(Boolean).length;
    const total = (G.oraciones||[]).length;
    if(completed === 0 && G.totalErrors === 0){
      // No actual work done → just go back, no need for a summary
      goLogin();
      return;
    }
    if(completed < total && completed > 0){
      const remaining = total - completed;
      const msg = '¿Quieres terminar la sesión ahora? Te quedan '+remaining+' oraci'+(remaining===1?'ón':'ones')+' por analizar.\n\nVerás un resumen de tu progreso.';
      if(!confirm(msg)) return;
    }
    // Show the results screen
    goResults();
    return;
  }
  if(G.mode === 'exam'){
    if(confirm('¿Salir del examen? Si no has terminado, no se guardará la nota.')){
      goLogin();
    }
    return;
  }
  goLogin();
}

function goLogin(){
  cleanAllTimers();
  // Save practice analytics before clearing state
  try { if(G && G.mode==='practice' && !_practiceAnalyticsSent) sendPracticeAnalytics({}); } catch(e){}
  G={};ARC={};MG={};SIN={};MM={sintaxis:null};MC={};
  selectedMode=null;selectedSubfase='completo';
  selectedArcadeMode=null;selectedMorphLevel=null;selectedMorphMode=null;selectedSint4Mode=null;
  currentModule=null;selectedMaestroMode=null;selectedMaestroNivel=null;selectedMorphTipo=null;selectedChallenge=null;
  // Reset all sel-card buttons
  document.querySelectorAll('.sel-card').forEach(el=>{el.classList.remove('sel-active');el.setAttribute('aria-checked','false');});
  document.getElementById('pin-block')?.style && (document.getElementById('pin-block').style.display='none');
  document.getElementById('api-err')?.style && (document.getElementById('api-err').style.display='none');
  if(document.getElementById('api-warn')) document.getElementById('api-warn').className='api-warn';
  const tbTimer=document.getElementById('tb-timer');if(tbTimer)tbTimer.style.display='none';
  document.getElementById('screen-game').classList.remove('is-proj');
  // Clear nickname input so it doesn't carry over
  const nick=document.getElementById('inp-nickname');if(nick)nick.value='';
  showScreen('screen-portada');
}
function goTeacherPanel(){
  cleanAllTimers();
  G={};document.getElementById('screen-game').classList.remove('is-proj');
  document.getElementById('succ-overlay').classList.remove('open');
  warmupApi(); // pre-warm Apps Script to avoid cold-start timeouts
  loadTeacherPanel();showScreen('teacher');
}

// ════════════════════════════════════════════════════════
// OVERLAYS
// ════════════════════════════════════════════════════════
function openOverlay(id){document.getElementById(id).classList.add('open');}
function closeOverlay(id){document.getElementById(id).classList.remove('open');}
function checkTeacherPw(){
  if(document.getElementById('teacher-pw').value===getTeacherPw()){closeOverlay('teacher-modal');loadTeacherPanel();showScreen('teacher');}
  else{document.getElementById('teacher-pw-err').style.display='block';document.getElementById('teacher-pw').focus();}
}



// ════════════════════════════════════════════════════════
// MICRO-LECCIONES — Gramática Contextualizada (Myhill et al.)
// Tipo 1: Micro-pista (2-3 min) — aparece tras ≥3 errores en misma función
// Tipo 2: Lección completa — asignable como misión (futuro)
// ════════════════════════════════════════════════════════


// Map syntax function errors to micro-lessons

// Check if micro-lesson should be suggested for this function

// Show/hide micro-lesson button in feedback overlay


function syncSents(){flashTp(`${getMock().length} oraciones de ejemplo disponibles.`,'var(--blue)');}

let _dashData = []; // cached dashboard data for export

async function loadDashboard(){
  const apiUrl=getApiUrl();
  if(!apiUrl){flashTp('Configura la URL primero.','var(--red)');return;}
  const grupo=document.getElementById('tp-dash-grupo').value.trim();
  const evaluacion=document.getElementById('tp-dash-eval').value.trim();
  const msg=document.getElementById('tp-dash-msg');
  msg.textContent='⏳ Cargando resultados…';msg.style.color='var(--blue)';msg.style.display='block';
  try{
    const params=new URLSearchParams({action:'getResultsByGroup'});
    if(grupo) params.set('grupo',grupo);
    if(evaluacion) params.set('evaluacion',evaluacion);
    const r=await fetchWithTimeout(apiUrl+'?'+params.toString(),{},10000);
    const d=await r.json();
    if(!d.resultados||d.resultados.length===0){
      msg.textContent='Sin resultados'+(grupo?' para '+grupo:'')+(evaluacion?' eval. '+evaluacion:'')+'.';
      msg.style.color='var(--muted)';
      document.getElementById('tp-dash-stats').style.display='none';
      document.getElementById('tp-dash-table').style.display='none';
      _dashData=[];
      return;
    }
    _dashData=d.resultados;
    // Stats
    const notas=_dashData.map(r=>r.nota);
    const media=notas.reduce((a,b)=>a+b,0)/notas.length;
    const aprob=notas.filter(n=>n>=5).length;
    const susp=notas.length-aprob;
    document.getElementById('dash-total').textContent=notas.length;
    document.getElementById('dash-media').textContent=media.toFixed(1);
    document.getElementById('dash-media').style.color=media>=5?'#059669':'#DC2626';
    document.getElementById('dash-aprob').textContent=aprob;
    document.getElementById('dash-susp').textContent=susp;
    document.getElementById('dash-bar').style.width=Math.round(aprob/notas.length*100)+'%';
    document.getElementById('tp-dash-stats').style.display='block';
    // Table
    const tbody=document.getElementById('dash-tbody');
    tbody.innerHTML=_dashData.map(r=>{
      const color=r.nota>=8?'#059669':r.nota>=5?'#D97706':'#DC2626';
      const hechas=r.totalOraciones>0?`${r.completadas}/${r.totalOraciones}`:(r.completadas||'—');
      const incompleta=r.totalOraciones>0&&r.completadas<r.totalOraciones;
      return `<tr style="border-bottom:1px solid rgba(0,0,0,.06)">
        <td style="padding:5px 8px;font-weight:600">${r.alumno}</td>
        <td style="padding:5px 6px;text-align:center;color:var(--muted)">${r.grupo}</td>
        <td style="padding:5px 6px;text-align:center;font-size:.75rem;color:var(--muted)">${r.examen||'—'}</td>
        <td style="padding:5px 6px;text-align:center;font-weight:900;color:${color}">${r.nota.toFixed(1)}</td>
        <td style="padding:5px 6px;text-align:center;font-size:.78rem;${incompleta?'color:#DC2626;font-weight:700':''}">${hechas}</td>
        <td style="padding:5px 6px;text-align:center;font-size:.78rem">${r.sujeto||0}</td>
        <td style="padding:5px 6px;text-align:center;font-size:.78rem">${r.funciones||0}</td>
        <td style="padding:5px 6px;text-align:center;font-size:.78rem">${r.np||0}</td>
      </tr>`;
    }).join('');
    document.getElementById('tp-dash-table').style.display='block';
    msg.textContent=`✓ ${notas.length} resultados cargados.`;msg.style.color='var(--green)';
    setTimeout(()=>{msg.style.display='none';},3000);
  }catch(e){
    msg.textContent='⚠ Error: '+e.message;msg.style.color='var(--red)';
  }
}

function exportCSV(){
  if(_dashData.length===0){flashTp('Carga resultados primero.','var(--amber)');return;}
  let csv='Alumno,Correo,Grupo,Evaluacion,Examen,PIN,Nota,Completadas,Total_Oraciones,Sujeto_Pts,Funciones_Pts,NP_Pts,Elem_Fallados,Fecha\n';
  _dashData.forEach(r=>{
    csv+=`"${r.alumno}","${r.correo||''}","${r.grupo}","${r.evaluacion}","${r.examen}","${r.pin}",${r.nota.toFixed(1)},${r.completadas||0},${r.totalOraciones||0},${r.sujeto||0},${r.funciones||0},${r.np||0},${r.elemFallados||0},"${r.fecha||''}"\n`;
  });
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const grupo=document.getElementById('tp-dash-grupo').value.trim()||'todos';
  const eval_=document.getElementById('tp-dash-eval').value.trim()||'todas';
  a.download=`resultados_${grupo}_eval${eval_}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  flashTp('✓ CSV descargado.','var(--green)');
}

function dlResults(){loadDashboard();}

// ════════════════════════════════════════════════════════
// PROJECTOR MODE
// ════════════════════════════════════════════════════════
async function openProj(){
  const apiUrl=getApiUrl();
  let oraciones,usingMock=false;
  if(!apiUrl){oraciones=getMock().map(normalizeOracion).filter(Boolean);usingMock=true;}
  else{
    try{
      // Projector gets ALL sentences (like practice) regardless of Activo
      const r=await fetchWithTimeout(`${apiUrl}?action=getOraciones&mode=practice`,{},8000);
      const d=await r.json();
      oraciones=Array.isArray(d.oraciones)?d.oraciones.map(normalizeOracion).filter(Boolean):getMock().map(normalizeOracion).filter(Boolean);
    }catch{oraciones=getMock().map(normalizeOracion).filter(Boolean);usingMock=true;}
  }
  initState({name:'Demostración',email:'proyector@murciaeduca.es',mode:'projector',subfase:'completo',oraciones,usingMock,timerDuration:0});
  document.getElementById('screen-game').classList.add('is-proj');
  renderGame();showScreen('game');
}

function projPrevSentence(){
  if(G.mode!=='projector'||G.idx<=0)return;
  G.idx--;
  resetSentenceState();
  renderGame();
}

// ════════════════════════════════════════════════════════
// PROJECTOR SENTENCE SELECTOR
// ════════════════════════════════════════════════════════
function openProjSelector(){
  if(G.mode!=='projector')return;
  const list=document.getElementById('proj-drawer-list');
  const sub=document.getElementById('proj-drawer-sub');
  sub.textContent=`${G.oraciones.length} oraciones · Oración actual: ${G.idx+1}`;
  list.innerHTML=G.oraciones.map((o,i)=>{
    const isCur=i===G.idx;
    const preview=(o.oracion_completa||o.palabras?.join(' ')||'').replace(/[¡¿]/g,'').slice(0,72)+'…';
    return`<button type="button" class="proj-sent-row ${isCur?'psr-current':''}"
      onclick="jumpToSentence(${i})" aria-label="Saltar a oración ${i+1}">
      <span class="psr-num">${i+1}</span>
      <span class="psr-text">${preview}</span>
      <span class="psr-go">${isCur?'● Actual':'→ Ir'}</span>
    </button>`;
  }).join('');
  document.getElementById('proj-drawer-bg').classList.add('open');
  // Focus first non-current or current item
  setTimeout(()=>list.querySelector('.psr-current,button')?.focus(),120);
}
function closeProjSelector(){
  document.getElementById('proj-drawer-bg').classList.remove('open');
}
function jumpToSentence(idx){
  closeProjSelector();
  if(idx===G.idx)return;
  G.idx=idx;
  resetSentenceState();
  renderGame();
}
// Close drawer on Escape
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('proj-drawer-bg').classList.contains('open')){
    closeProjSelector();return;
  }
  // Shortcut: S opens selector in projector mode
  if(e.key==='s'&&G.mode==='projector'&&!e.ctrlKey&&!e.metaKey&&
     !['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){
    openProjSelector();
  }
});

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded',async()=>{
  console.log('[App] DOMContentLoaded — v6.2');
  try {
    initSoundBtn();
    const savedUrl = getApiUrl();
    if (savedUrl) {
      document.getElementById('loading-txt').textContent = 'Verificando conexión…';
      // Real ping (GET ?action=ping) — executes doGet so the GAS warms up
      fetch(savedUrl + '?action=ping', {cache:'no-store'}).catch(e => console.warn('[App] Warmup ping failed:', e.message));
    }
    await delay(300);
    showScreen('screen-portada');
    try{ addDashboardButton(); }catch(e){}
    console.log('[App] Portada shown OK');
  } catch(e) {
    console.error('[App] Init error:', e);
    // Last resort: force portada visible
    document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
    const portada = document.getElementById('screen-portada');
    if (portada) { portada.style.display = 'flex'; portada.classList.add('active'); }
  }
});

// ════════════════════════════════════════════════════════
// MODULE SELECTOR (Login tabs — legacy, now also used by goModule)
// ════════════════════════════════════════════════════════
let selectedArcadeMode=null, selectedMorphLevel=null, selectedMorphMode=null;

function setModule(m){
  currentModule=m;
}
let selectedSint4Mode=null;
function setSint4Mode(m){
  selectedSint4Mode=m;
  ['sint4-beginner','sint4-expert'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.toggle('sel-active',el.id==='sint4-'+m);el.setAttribute('aria-checked',String(el.id==='sint4-'+m));}});
}
function setArcadeMode(m){
  selectedArcadeMode=m;
  // Clase 'amc-active' (NO 'sel-active'): el tema new-ui sobreescribe cualquier
  // clase que contenga "sel-" con su color teal; 'amc-active' lo evita.
  ['arc-survival','arc-timer','arc-ghost','arc-radar'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.toggle('amc-active',el.id==='arc-'+m);el.setAttribute('aria-checked',String(el.id==='arc-'+m));}});
}
function setMorphLevel(l){
  selectedMorphLevel=l;
  [1,2,3].forEach(n=>{const el=document.getElementById('ml-'+n);if(el){el.classList.toggle('sel-active',n===l);el.setAttribute('aria-checked',String(n===l));}});
}
function setMorphMode(m){
  selectedMorphMode=m;
  ['mm-practice','mm-exam'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.toggle('sel-active',el.id==='mm-'+m);el.setAttribute('aria-checked',String(el.id==='mm-'+m));}});
}

// Master start handler — routes to correct module
async function handleStartAll(){
  const name=document.getElementById('inp-name')?.value.trim();
  const email=document.getElementById('inp-email')?.value.trim().toLowerCase();
  ferr('e-name','');ferr('e-email','');
  let ok=true;
  if(!name){ferr('e-name','Escribe tu nombre completo.');ok=false;}
  if(!email){ferr('e-email','El correo es obligatorio.');ok=false;}
  else if(!EMAIL_RE.test(email)){ferr('e-email','Correo inválido. Usa @murciaeduca.es, @alu.murciaeduca.es o @gmail.com');ok=false;}
  if(!ok)return;
  // Persistir identidad para que las proximas entradas no la pidan otra
  // vez. El grupo se intenta leer tanto del campo compartido como del de
  // arcade (cada modulo usa el que tenga visible). Si no hay grupo, se
  // guarda cadena vacia y el Paso 2 lo hara obligatorio.
  try {
    const grupoCompartido = document.getElementById('inp-grupo')?.value?.trim() || '';
    const grupoArcade     = document.getElementById('inp-arc-grupo')?.value?.trim() || '';
    if (typeof window.saveProfile === 'function') {
      window.saveProfile({ name, email, grupo: grupoCompartido || grupoArcade });
    }
  } catch (e) {}
  if(currentModule==='maestro'){startMaestro({name,email});return;}
  if(currentModule==='sint'){handleStart();return;}
  if(currentModule==='arcade'){
    const nick=document.getElementById('inp-nickname')?.value.trim();
    const grupo=document.getElementById('inp-arc-grupo')?.value.trim()||'';
    ferr('e-nick','');ferr('e-arcade','');
    if(!nick){ferr('e-nick','Elige un Nick para el ranking.');return;}
    if(!selectedArcadeMode){ferr('e-arcade','Selecciona un modo.');return;}
    // Duelo Fantasma corre sobre el motor de Contrarreloj (timer) con el
    // marco de duelo activado (ghostDuel): persigues tu récord + la media de clase.
    // Radar de Errores corre sobre el motor de Supervivencia (3 vidas).
    const ghostDuel = selectedArcadeMode==='ghost';
    const radar = selectedArcadeMode==='radar';
    const engineMode = ghostDuel ? 'timer' : (radar ? 'survival' : selectedArcadeMode);
    await startArcade({name,email,nickname:nick,grupo,arcadeMode:engineMode,ghostDuel,radar});return;
  }
  if(currentModule==='morph'){
    ferr('e-morphlevel','');ferr('e-morphmode','');
    if(!selectedMorphLevel){ferr('e-morphlevel','Selecciona un nivel.');return;}
    if(!selectedMorphMode){ferr('e-morphmode','Selecciona práctica o examen.');return;}
    startMorph({name,email,level:selectedMorphLevel,morphMode:selectedMorphMode});return;
  }
  if(currentModule==='sint4'){
    startSintagmas({name,email});return;
  }
}






// ════════════════════════════════════════════════════════
// SISTEMA DE PISTAS — C6
// ════════════════════════════════════════════════════════

function getHintsPractice(){ return localStorage.getItem(LS_HINTS_PRACTICE) || 'on'; }
function getHintsExam()    { return localStorage.getItem(LS_HINTS_EXAM)     || 'first_only'; }

function setHintsPractice(v){
  localStorage.setItem(LS_HINTS_PRACTICE, v);
  refreshHintsUI();
  playClick();
}
function setHintsExam(v){
  localStorage.setItem(LS_HINTS_EXAM, v);
  refreshHintsUI();
  playClick();
}

function refreshHintsUI(){
  const hp = getHintsPractice();
  const he = getHintsExam();
  // Botones práctica
  const bOn  = document.getElementById('tp-hints-on');
  const bOff = document.getElementById('tp-hints-off');
  if(bOn)  bOn.classList.toggle('active',  hp === 'on');
  if(bOff) bOff.classList.toggle('active', hp === 'off');
  // Botones examen
  const bNone  = document.getElementById('tp-exam-none');
  const bFirst = document.getElementById('tp-exam-first');
  if(bNone)  bNone.classList.toggle('active',  he === 'none');
  if(bFirst) bFirst.classList.toggle('active', he === 'first_only');
  // Labels
  const lp = document.getElementById('tp-hints-practice-lbl');
  const le = document.getElementById('tp-hints-exam-lbl');
  if(lp) lp.textContent = hp === 'on' ? 'Pistas ON' : 'Sin pistas';
  if(le) le.textContent = he === 'none' ? 'Sin comentarios' : 'Solo consejo';
}


// Inicializar UI al cargar panel profesor
const _origShowTeacher = typeof showTeacher !== 'undefined' ? showTeacher : null;
document.addEventListener('DOMContentLoaded', ()=>{ refreshHintsUI(); populateGrupoSelects(); });

// ══════════════════════════════════════════════════════════════════════════
// MÓDULO ORACIÓN COMPUESTA · CP (E2 — modo lectura)
// Punto de entrada: CP.enter()
// Endpoints: getOracionesCompuestas (mode=practice)
// ══════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────
// Public API: por simplicidad en esta fase NO exportamos nada y NO
// hacemos window bindings explicitos en este modulo. La razon es que
// el inline onclick="" del HTML estatico ya asume que las funciones
// estan en window global. Al cargar este modulo como <script> (NO
// type=module) en Paso 10, todas las funciones top-level acabaran
// automaticamente en window y los onclick funcionaran.
// Si en el futuro lo convertimos en ESM puro, habra que anadir
// "export { ... }" + "Object.assign(window, {...})" como hicimos en
// los otros modulos.
// ─────────────────────────────────────────────────────────────
