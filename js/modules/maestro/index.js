/* maestro/index.js — Modo morfologia avanzada (Maestro) + Morph Challenge
   Extraido de index.html (Paso 9.5 de la migracion, mayo 2026).

   Combina dos rangos no contiguos del monolito original:
   - Datos (lineas 848-856): MORPH_CHALLENGES (6 retos definidos).
   - Modulo completo (lineas 6307-7601): MORPH CHALLENGE ENGINE,
     MORPH_CASCADES, MORPH_CASCADES_ESO34, MAESTRO_TEXTS, MAESTRO_DEMO,
     MAESTRO ENGINE. 33 funciones top-level.

   Estado privado: MC (MorphChallenge), MM (Maestro).

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): showScreen, getApiUrl, fetchWithTimeout, shuffle, escHtml,
   playSuccess, playError, awardXP, trackError, _tone, goLogin,
   goModule. */

// Identificador de la version de calificacion de morfologia. Se bumpea
// cada vez que cambia el sistema de nota para poder distinguir resultados
// en el Sheet (no mezclar escalas).
//  - '2026-07-07': nota lineal (totalCorrect/totalAttempted), categoria 2 +
//    1pt/rasgo, sin curva de examen.
//  - '2026-07-14': F9 ponderacion. Rasgos discriminantes x2, categorias
//    frontera 3, curva dura por palabra en examen. Ver getCategoryWeight_/
//    getStepWeight_/examAttrCurve_ y confirmToken. DESPLEGAR AL CIERRE DE
//    EVALUACION + avisar a los alumnos de la escala (requisito del
//    documento Investigacion_evaluacion.md, igual que B1/B2 de Simples).
const VERSION_CALIFICACION_MORFO = '2026-07-14';

// ── MORPH CHALLENGES ─────────────────────────────────────────────────
const MORPH_CHALLENGES = [
  { id:'caza_sustantivos',    title:'🧱 Caza sustantivos',    desc:'Pulsa todos los sustantivos', targetCats:['Sustantivo'], duration:60, difficulty:1, timePenalty:0 },
  { id:'solo_verbos',         title:'⚡ Solo verbos',          desc:'Un error → −5 segundos',     targetCats:['Verbo'],      duration:60, difficulty:1, timePenalty:5 },
  { id:'detecta_det',         title:'🔑 Detecta determinantes',desc:'Artículos, demostrativos, posesivos y cuantificadores', targetCats:['Artículo','Demostrativo','Posesivo','Cuantificador'], duration:90, difficulty:2, timePenalty:5 },
  { id:'modo_trampa',         title:'🕵️ Modo trampa',          desc:'Adjetivos vs participios — ¡cuidado!', targetCats:['Adjetivo'], trapCats:['Verbo'], duration:90, difficulty:3, timePenalty:8 },
  { id:'racha_perfecta',      title:'🏆 Racha perfecta',       desc:'Sin errores — la racha se rompe con uno', targetCats:['Sustantivo','Verbo','Adjetivo','Adverbio','Preposición','Conjunción'], duration:120, difficulty:4, timePenalty:0, streakMode:true },
  { id:'pronombres_det',      title:'👤 Pronombres y determinantes', desc:'Distingue los pronombres de los determinantes', targetCats:['Pronombre personal','Relativo','Interrogativo/Exclamativo'], trapCats:['Artículo','Demostrativo'], duration:90, difficulty:3, timePenalty:5 },
];

// ──────────────────────────────────────────────────────────────────────
// MORPH CHALLENGE ENGINE + CASCADES + MAESTRO ENGINE
// (originalmente venian mucho mas tarde que MORPH_CHALLENGES; aqui
//  agrupados en el mismo modulo).
// ──────────────────────────────────────────────────────────────────────

// MORPH CHALLENGE ENGINE v4.7
// ════════════════════════════════════════════════════════════════════

let MC = {};

async function startMorphChallenge({name, email, challenge}) {
  let allTokens = MAESTRO_DEMO.filter(t=>t.cat!=='Puntuación').map(t=>({...t, textSource:1}));
  // Try to load arcade texts from Sheets
  const apiUrl = getApiUrl();
  if(apiUrl){
    try{
      const r = await fetchWithTimeout(apiUrl+'?action=getTextosMorfologia&nivel=arcade',{},6000);
      const d = await r.json();
      if(d.textos && d.textos.length>0){
        const analyzed = d.textos.filter(t=>t.tokens&&t.tokens.length>0);
        if(analyzed.length>0){
          allTokens = [];
          analyzed.forEach((t,i) => {
            const evalTokens = t.tokens.filter(tk=>tk.cat!=='Puntuación');
            evalTokens.forEach(tk => allTokens.push({...tk, textSource:i+1}));
          });
        }
      }
    }catch(e){console.warn('[startMorphChallenge] Sheets error, using fallback:',e);}
  }
  // Tokens mantienen el orden del texto para que el alumno lea con coherencia
  MC = {
    name, email, challenge,
    tokens: allTokens,
    score:0, streak:0, highStreak:0,
    hits:0, misses:0, traps:0,
    timeLeft: challenge.duration,
    timerInterval: null, _scoreInterval: null,
    active: false,
    results: {},
  };
  showScreen('screen-maestro');
  renderChallengeGame();
}

function renderChallengeGame() {
  try{
  const ch = MC.challenge;
  document.getElementById('mm-counter').textContent = ch.title;
  document.getElementById('mm-score').textContent = '0 pts';
  document.getElementById('mm-prog').style.width = '100%';
  document.getElementById('mm-result-wrap').style.display = 'none';
  const wrap = document.getElementById('mm-paper-wrap');
  wrap.innerHTML = `
    <div class="morph-challenge-wrap">
      <div class="ch-timer-bar"><div class="ch-timer-fill" id="ch-timer-fill" style="width:100%"></div></div>
      <div class="ch-hud">
        <div><div class="ch-score-disp" id="ch-score">0</div><div style="font-size:.62rem;color:var(--muted);font-family:'Nunito',sans-serif">PUNTOS</div></div>
        <div style="width:1px;height:32px;background:var(--border)"></div>
        <div><div class="ch-streak-disp" id="ch-streak">—</div><div style="font-size:.62rem;color:var(--muted);font-family:'Nunito',sans-serif">RACHA</div></div>
        <div class="ch-time-disp" id="ch-time">${MC.timeLeft}s</div>
      </div>
      <div class="folio-sheet" style="margin-bottom:12px;padding:16px 22px 16px 58px">
        <div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:3px;font-family:'Nunito',sans-serif">${ch.title}</div>
        <div style="font-size:.83rem;color:var(--ink2);font-family:'Nunito',sans-serif">${ch.desc}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${ch.targetCats.map(c=>`<span style="background:#DBEAFE;color:#1E40AF;padding:2px 9px;border-radius:99px;font-size:.7rem;font-weight:800;font-family:'Nunito',sans-serif">✓ ${c}</span>`).join('')}
          ${(ch.trapCats||[]).map(c=>`<span style="background:#FEE2E2;color:#991B1B;padding:2px 9px;border-radius:99px;font-size:.7rem;font-weight:800;font-family:'Nunito',sans-serif">✗ ${c}</span>`).join('')}
        </div>
      </div>
      <div class="folio-sheet" id="ch-token-area">
        <div id="ch-text-flow" style="font-family:'Lora',serif;font-size:1.12rem;line-height:2.2;color:var(--ink);display:flex;flex-wrap:wrap;gap:3px 7px;align-items:baseline"></div>
        <div style="margin-top:8px;font-size:.69rem;color:var(--muted);font-family:'Nunito',sans-serif">Pulsa las palabras de la categoría indicada · ignora las demás</div>
      </div>
      <div style="text-align:center;margin-top:16px" id="ch-start-wrap">
        <button type="button" class="btn btn-primary" style="padding:13px 36px;font-size:1rem" onclick="startChallengeTimer()">¡Empezar! ▶</button>
      </div>
    </div>`;
  document.getElementById('mm-cascade-wrap').innerHTML = '';
  renderChallengeTokens();
  }catch(e){
    console.error('[renderChallengeGame]',e);
    document.getElementById('mm-paper-wrap').innerHTML=errorCard('Error en Reto',e.message);
  }
}

function renderChallengeTokens(){
  const flow = document.getElementById('ch-text-flow');
  if(!flow) return;
  flow.innerHTML = MC.tokens.map((t,i)=>{
    const res = MC.results[i];
    let cls='mm-token mm-pending', style='cursor:pointer;padding:2px 3px';
    if(res==='hit')  { cls='mm-token ch-hit';  style='padding:2px 3px'; }
    if(res==='miss') { cls='mm-token ch-miss'; style='padding:2px 3px'; }
    if(res==='trap') { cls='mm-token ch-trap'; style='padding:2px 3px'; }
    const clickable = MC.active && !res;
    return `<span class="${cls}" id="cht-${i}" style="${style}" ${clickable?`onclick="challengeTokenClick(${i})"`:''}>${t.texto}</span>`;
  }).join(' ');
}

function startChallengeTimer(){
  document.getElementById('ch-start-wrap')?.remove();
  MC.active = true;
  renderChallengeTokens();
  MC.timerInterval = setInterval(()=>{
    MC.timeLeft = Math.max(0, MC.timeLeft-1);
    const pct = MC.timeLeft/MC.challenge.duration*100;
    const fill=document.getElementById('ch-timer-fill');
    if(fill){fill.style.width=pct+'%';if(pct<20)fill.classList.add('warning');}
    const tEl=document.getElementById('ch-time');
    if(tEl)tEl.textContent=MC.timeLeft+'s';
    if(MC.timeLeft<=0){cleanAllTimers();endChallenge();}
  },1000);
  MC._scoreInterval=setInterval(()=>{
    const s=document.getElementById('ch-score'); if(s)s.textContent=MC.score;
    document.getElementById('mm-score').textContent=MC.score+' pts';
    const st=document.getElementById('ch-streak');
    if(st)st.textContent=MC.streak>1?'🔥 ×'+MC.streak:(MC.streak===1?'×1':'—');
  },200);
}

function challengeTokenClick(idx){
  if(!MC.active||MC.results[idx]!==undefined)return;
  const token=MC.tokens[idx];
  const ch=MC.challenge;
  const isTarget=(ch.targetCats||[]).includes(token.cat);
  const isTrap=(ch.trapCats||[]).includes(token.cat);
  if(isTarget){
    MC.results[idx]='hit'; MC.hits++; MC.streak++;
    if(MC.streak>MC.highStreak)MC.highStreak=MC.streak;
    MC.score+=10+Math.max(0,MC.streak-1)*5;
  } else if(isTrap){
    MC.results[idx]='trap'; MC.traps++; MC.streak=0;
    MC.score=Math.max(0,MC.score-5);
    if(ch.timePenalty>0)MC.timeLeft=Math.max(0,MC.timeLeft-ch.timePenalty);
  } else {
    MC.results[idx]='miss'; MC.misses++; MC.streak=0;
    if(ch.timePenalty>0)MC.timeLeft=Math.max(0,MC.timeLeft-Math.ceil(ch.timePenalty/2));
  }
  const el=document.getElementById('cht-'+idx);
  if(el){
    const r=MC.results[idx];
    el.className='mm-token ch-'+r;
    el.removeAttribute('onclick');
  }
  const totalTargets=MC.tokens.filter(t=>(ch.targetCats||[]).includes(t.cat)).length;
  if(MC.hits>=totalTargets){cleanAllTimers();endChallenge();}
}

function endChallenge(){
  cleanAllTimers();
  const ch=MC.challenge;
  const total=MC.tokens.filter(t=>(ch.targetCats||[]).includes(t.cat)).length;
  const pct=total>0?Math.round(MC.hits/total*100):0;
  const grade=ScoringEngine.toGrade(MC.hits*2, Math.max(1,total*2+MC.traps+MC.misses));
  const color=grade>=8?'#059669':grade>=6?'#D97706':'#DC2626';
  const emoji=grade>=9?'🏆':grade>=7?'🎯':grade>=5?'📚':'💪';
  document.getElementById('mm-paper-wrap').innerHTML='';
  document.getElementById('mm-cascade-wrap').innerHTML='';
  const res=document.getElementById('mm-result-wrap');
  res.style.display='block';
  res.innerHTML=`
    <div style="max-width:520px;margin:0 auto;animation:slideUp .4s ease;font-family:'Nunito',sans-serif">
      <div class="card" style="text-align:center;padding:28px 24px;background:${color}10;border:2px solid ${color}40;margin-bottom:14px">
        <div style="font-size:2.4rem;margin-bottom:6px">${emoji}</div>
        <div style="font-size:3.6rem;font-weight:900;color:${color};line-height:1">${grade.toFixed(1)}</div>
        <div style="font-size:.85rem;color:var(--muted);margin-top:4px">sobre 10 — ${ch.title}</div>
        <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center">
          <div><div style="font-size:1.5rem;font-weight:900;color:#059669">${MC.hits}</div><div style="font-size:.68rem;color:var(--muted)">aciertos</div></div>
          <div><div style="font-size:1.5rem;font-weight:900;color:#DC2626">${MC.traps+MC.misses}</div><div style="font-size:.68rem;color:var(--muted)">errores</div></div>
          <div><div style="font-size:1.5rem;font-weight:900;color:var(--blue)">${MC.highStreak}</div><div style="font-size:.68rem;color:var(--muted)">racha máx.</div></div>
        </div>
        <div style="margin-top:10px;font-size:.76rem;color:var(--muted)">${total} palabras objetivo · ${pct}% encontradas · ${MC.score} pts</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button type="button" class="btn btn-primary" onclick="retryChallenge()">Repetir</button>
        <button type="button" class="btn btn-ghost" onclick="goLogin()">← Inicio</button>
      </div>
    </div>`;
}

function retryChallenge(){
  startMorphChallenge({name:MC.name,email:MC.email,challenge:MC.challenge});
}

// MÓDULO: MORFOLOGÍA MAESTRA v4.2
// Análisis morfológico completo según PAU Murcia / NGLE
// ════════════════════════════════════════════════════════════════════

let MM = {}; // module state
let selectedMaestroMode = null;

let selectedMaestroNivel = null;
// F2 (jul-2026): nivel de análisis (aprendiz/eso34/maestro) → nivel de
// contenido del banco de textos (n1/n2/n3); el GAS relaja automáticamente
// si el nivel pedido tiene pocos textos (ver resolveNivelMorfologia_).
const MORPH_NIVEL_CONTENIDO = { aprendiz: 'n1', eso34: 'n2', maestro: 'n3' };
let selectedMorphTipo   = null; // 'analisis' | 'reto'
let selectedChallenge   = null; // challenge id

// Silent setter — marks tipo='analisis' without re-rendering options panel
function setMorphTipoSilent(tipo){
  selectedMorphTipo = tipo;
  const reto = document.getElementById('mm-tipo-reto');
  if(reto && tipo==='analisis'){reto.classList.remove('sel-active');reto.setAttribute('aria-checked','false');}
}

function setMaestroNivel(n){
  selectedMaestroNivel = n;
  ['mm-aprendiz','mm-eso34-lvl','mm-maestro-lvl'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      const match=(id==='mm-aprendiz'&&n==='aprendiz')||(id==='mm-eso34-lvl'&&n==='eso34')||(id==='mm-maestro-lvl'&&n==='maestro');
      el.classList.toggle('sel-active',match);
      el.setAttribute('aria-checked',String(match));
    }
  });
}

function setMorphTipo(tipo){
  selectedMorphTipo = tipo;
  // Reset analisis selections when switching to reto
  if(tipo === 'reto'){
    selectedMaestroNivel = null;
    selectedMaestroMode = null;
    ['mm-aprendiz','mm-eso34-lvl','mm-maestro-lvl','mm-prac','mm-exam'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.classList.remove('sel-active');el.setAttribute('aria-checked','false');}
    });
  }
  ['mm-tipo-analisis','mm-tipo-reto'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      const match=(id==='mm-tipo-analisis'&&tipo==='analisis')||(id==='mm-tipo-reto'&&tipo==='reto');
      el.classList.toggle('sel-active',match);
      el.setAttribute('aria-checked',String(match));
    }
  });
  const optWrap = document.getElementById('morph-tipo-options');
  if(!optWrap) return;

  if(tipo === 'analisis'){
    // Level and mode buttons are already visible in the panel — just hide reto options
    optWrap.style.display = 'none';
    optWrap.innerHTML = '';
  } else {
    // Show challenge selector
    optWrap.style.display = 'block';
    selectedMaestroMode = 'practice';
    selectedMaestroNivel = 'aprendiz';
    optWrap.innerHTML = `
      <div class="field">
        <label>Elige un reto</label>
        <div class="challenge-grid" style="margin-top:8px" id="challenge-select-grid">
          ${MORPH_CHALLENGES.map(ch=>`
            <div class="challenge-card" onclick="selectChallenge('${ch.id}')" id="chcard-${ch.id}"
              data-id="${ch.id}">
              <span class="ch-icon">${ch.title.split(' ')[0]}</span>
              <span class="ch-title">${ch.title.slice(ch.title.indexOf(' ')+1)}</span>
              <span class="ch-desc">${ch.desc}</span>
              <div class="ch-meta">
                <span class="ch-badge">⏱ ${ch.duration}s</span>
                <span class="ch-badge">${'★'.repeat(ch.difficulty)+'☆'.repeat(4-ch.difficulty)}</span>
              </div>
            </div>`).join('')}
        </div>
        <p id="e-challenge" class="ferr" role="alert"></p>
      </div>`;
  }
}

function selectChallenge(id){
  selectedChallenge = id;
  document.querySelectorAll('.challenge-card').forEach(c=>{
    c.style.borderColor = c.dataset.id === id ? 'var(--blue)' : 'var(--parch-border)';
    c.style.background  = c.dataset.id === id ? 'var(--blue-lt)' : 'var(--paper)';
  });
}

function setMaestroMode(m){
  selectedMaestroMode = m;
  ['mm-prac','mm-exam'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      const match=(id==='mm-prac'&&m==='practice')||(id==='mm-exam'&&m==='exam');
      el.classList.toggle('sel-active',match);
      el.setAttribute('aria-checked',String(match));
    }
  });
  // Fase 3.4 (jul-2026): en examen, el nivel lo fija el PIN del profesor
  // (igual que la subfase en Simples, Fase 1.4) — el selector del alumno
  // no serviría de nada y se ocultaría un PIN que hay que rellenar.
  const nivelBlock=document.getElementById('maestro-nivel-block');
  const nivelNote=document.getElementById('maestro-nivel-exam-note');
  const pinBlock=document.getElementById('pin-morfo-block');
  if(nivelBlock) nivelBlock.style.display = m==='exam' ? 'none' : 'block';
  if(nivelNote) nivelNote.style.display = m==='exam' ? 'block' : 'none';
  if(pinBlock) pinBlock.style.display = m==='exam' ? 'block' : 'none';
}

// ── MORPHOLOGY CASCADE DEFINITIONS (PAU Murcia order) ───────────────
// Each category defines a sequence of steps.
// step: {id, label, opts: [{val, label}], dependsOn?: {step, val}}
const MORPH_CASCADES = {
  'Sustantivo':{
    steps:[
      {id:'subtipo', label:'Clase', opts:[
        {val:'común', label:'Común'},{val:'propio', label:'Propio'}]},
      {id:'comun_sub', label:'Subtipo (común)', dependsOn:{step:'subtipo',val:'común'},
       opts:[{val:'contable',label:'Contable'},{val:'no contable',label:'No contable'}]},
      {id:'ind_col', label:'Individual / Colectivo', dependsOn:{step:'subtipo',val:'común'},
       opts:[{val:'individual',label:'Individual'},{val:'colectivo',label:'Colectivo'}]},
      {id:'conc_abs', label:'Concreto / Abstracto', dependsOn:{step:'subtipo',val:'común'},
       opts:[{val:'concreto',label:'Concreto'},{val:'abstracto',label:'Abstracto'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'ambiguo',label:'Ambiguo'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Adjetivo':{
    steps:[
      {id:'subtipo', label:'Clase', opts:[
        {val:'calificativo',label:'Calificativo'},{val:'relacional',label:'Relacional'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable (una terminación)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
      {id:'grado', label:'Grado', dependsOn:{step:'subtipo',val:'calificativo'},
       opts:[{val:'positivo',label:'Positivo'},{val:'comparativo superioridad',label:'Comparativo sup.'},
             {val:'comparativo inferioridad',label:'Comparativo inf.'},
             {val:'comparativo igualdad',label:'Comparativo igualidad'},
             {val:'superlativo absoluto',label:'Superlativo abs.'},
             {val:'superlativo relativo',label:'Superlativo rel.'}]},
    ]},
  'Artículo':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'determinado',label:'Determinado (el, la, los, las, lo)'},
        {val:'indeterminado',label:'Indeterminado (un, una, unos, unas)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro (lo)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
      {id:'forma', label:'Forma especial', opts:[
        {val:'ninguna',label:'Ninguna'},{val:'contracta',label:'Forma contracta (al / del)'}]},
    ]},
  'Pronombre personal':{
    steps:[
      {id:'persona', label:'Persona', opts:[
        {val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},
        {val:'tercera persona',label:'3ª persona'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
      {id:'género', label:'Género (si procede)', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro'},{val:'común',label:'Común (masc./fem.)'}]},
      {id:'acent', label:'Acentuación', opts:[
        {val:'tónico',label:'Tónico'},{val:'átono',label:'Átono'}]},
    ]},
  'Demostrativo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'determinante',label:'Determinante (ante sust.)'},
        {val:'adjetivo',label:'Adjetivo (pospuesto)'},
        {val:'pronombre',label:'Pronombre (sin sust.)'}]},
      {id:'cercanía', label:'Referencia espacial', opts:[
        {val:'cercanía al hablante',label:'Cercanía al hablante (este/a)'},
        {val:'distancia media',label:'Distancia media (ese/a)'},
        {val:'lejanía',label:'Lejanía (aquel/la)'},
        {val:'neutro',label:'Neutro (esto, eso, aquello)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro'},{val:'ambos',label:'Masc./Fem.'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Posesivo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'determinante',label:'Determinante (antepuesto)'},
        {val:'adjetivo',label:'Adjetivo (pospuesto)'}]},
      {id:'persona', label:'Persona del poseedor', opts:[
        {val:'primera persona',label:'1ª persona'},
        {val:'segunda persona',label:'2ª persona'},
        {val:'tercera persona',label:'3ª persona'}]},
      {id:'poseedores', label:'Nº de poseedores', opts:[
        {val:'un poseedor',label:'Un poseedor'},
        {val:'varios poseedores',label:'Varios poseedores'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Cuantificador':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'numeral',label:'Numeral (cantidad precisa)'},
        {val:'indefinido',label:'Indefinido (cantidad imprecisa)'}]},
      {id:'subtipo_num', label:'Clase de numeral', dependsOn:{step:'tipo',val:'numeral'},
       opts:[{val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},
             {val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
      {id:'subtipo_ind', label:'Clase de indefinido', dependsOn:{step:'tipo',val:'indefinido'},
       opts:[{val:'universal',label:'Universal (todo, cada, ambos, sendos)'},
             {val:'indefinido débil',label:'Indefinido débil (alguno, mucho, poco…)'}]},
      {id:'función_sint', label:'Función sintáctica', opts:[
        {val:'determinante',label:'Determinante (ante sust.)'},
        {val:'pronombre',label:'Pronombre (sin sust.)'},
        {val:'adjetivo',label:'Adjetivo (pospuesto)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Relativo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'pronombre',label:'Pronombre (que, quien, el cual…)'},
        {val:'determinante',label:'Determinante (cuyo, cuanta…)'},
        {val:'adverbio',label:'Adverbio (donde, cuando, como, cuanto)'}]},
      {id:'género', label:'Género (si procede)', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable'}]},
      {id:'número', label:'Número (si procede)', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'invariable',label:'Invariable'}]},
    ]},
  'Interrogativo/Exclamativo':{
    steps:[
      {id:'subtipo', label:'Tipo', opts:[
        {val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
      {id:'función', label:'Función', opts:[
        {val:'pronombre',label:'Pronombre (qué, quién, cuál)'},
        {val:'determinante',label:'Determinante (qué, cuánto)'},
        {val:'adverbio',label:'Adverbio (cuándo, cómo, dónde)'}]},
      {id:'género', label:'Género (si procede)', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable'}]},
      {id:'número', label:'Número (si procede)', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'invariable',label:'Invariable'}]},
    ]},
  'Adverbio':{
    steps:[
      {id:'tipo', label:'Tipo semántico', opts:[
        {val:'lugar',label:'Lugar (aquí, ahí, allí, cerca…)'},
        {val:'tiempo',label:'Tiempo (hoy, ayer, siempre, nunca…)'},
        {val:'modo',label:'Modo (así, bien, mal, -mente)'},
        {val:'cantidad',label:'Cantidad (muy, bastante, poco, más…)'},
        {val:'aspecto',label:'Aspecto (ya, todavía, aún)'},
        {val:'afirmación',label:'Afirmación (sí, también, claro)'},
        {val:'negación',label:'Negación (no, tampoco)'},
        {val:'duda',label:'Duda (quizás, acaso, igual, posiblemente)'}]},
    ]},
  'Verbo':{
    steps:[
      {id:'perífrasis', label:'¿Forma parte de una perífrasis verbal?', opts:[
        {val:'no',label:'No, es un verbo simple o un tiempo compuesto'},
        {val:'sí',label:'Sí, es una perífrasis verbal (auxiliar + forma no personal)'}]},
      {id:'perif_tipo', label:'¿Qué forma tiene el verbo principal (núcleo)?', dependsOn:{step:'perífrasis',val:'sí'}, opts:[
        {val:'infinitivo',label:'Infinitivo (ej: ir a JUGAR, deber ESTUDIAR, tener que LEER)'},
        {val:'gerundio',label:'Gerundio (ej: estar JUGANDO, seguir CORRIENDO)'},
        {val:'participio',label:'Participio (ej: llevar VISTAS, tener COMPRADOS)'}]},
      {id:'perif_ger_info', label:'Perífrasis de gerundio → tempoaspectual', dependsOn:{step:'perif_tipo',val:'gerundio'}, opts:[
        {val:'sí — aspectual de gerundio',label:'Acción en proceso (estar/ir/seguir/andar/llevar/venir/continuar + gerundio)'}]},
      {id:'perif_par_info', label:'Perífrasis de participio → tempoaspectual', dependsOn:{step:'perif_tipo',val:'participio'}, opts:[
        {val:'sí — aspectual de participio',label:'Acción finalizada (llevar/tener + participio con concordancia)'}]},
      {id:'perif_inf_clase', label:'La perífrasis de infinitivo es…', dependsOn:{step:'perif_tipo',val:'infinitivo'}, opts:[
        {val:'modal',label:'Modal (expresa obligación, posibilidad o capacidad)'},
        {val:'tempoaspectual',label:'Tempoaspectual (informa sobre el desarrollo de la acción)'}]},
      {id:'perif_modal', label:'¿Qué tipo de perífrasis modal?', dependsOn:{step:'perif_inf_clase',val:'modal'}, opts:[
        {val:'sí — modal de obligación',label:'De obligación (haber de / haber que / deber / tener que + inf.)'},
        {val:'sí — modal de probabilidad',label:'De probabilidad o conjetura (deber de / venir a / poder + inf.)'},
        {val:'sí — modal de capacidad',label:'De capacidad (poder + inf.)'}]},
      {id:'perif_tempo', label:'¿Qué tipo de perífrasis tempoaspectual?', dependsOn:{step:'perif_inf_clase',val:'tempoaspectual'}, opts:[
        {val:'sí — tempoaspectual incoativa',label:'Comienzo de acción (ir a / empezar a / ponerse a / romper a / echarse a + inf.)'},
        {val:'sí — tempoaspectual terminativa',label:'Final de acción (dejar de / cesar de / acabar de / terminar de + inf.)'},
        {val:'sí — tempoaspectual reiterativa',label:'Repetición (soler / acostumbrar a / volver a + inf.)'}]},
      {id:'conjugación', label:'Conjugación', opts:[
        {val:'primera',label:'1ª conjugación (-ar)'},
        {val:'segunda',label:'2ª conjugación (-er)'},
        {val:'tercera',label:'3ª conjugación (-ir)'}]},
      {id:'persona', label:'Persona', opts:[
        {val:'primera persona',label:'1ª persona'},
        {val:'segunda persona',label:'2ª persona'},
        {val:'tercera persona',label:'3ª persona'},
        {val:'no personal',label:'Forma no personal (inf./ger./part.)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'no procede',label:'No procede (no personal)'}]},
      {id:'tiempo', label:'Tiempo', opts:[
        {val:'presente',label:'Presente'},
        {val:'pretérito imperfecto',label:'Pret. imperfecto'},
        {val:'pretérito perfecto simple',label:'Pret. perfecto simple'},
        {val:'pretérito perfecto compuesto',label:'Pret. perfecto compuesto'},
        {val:'pretérito pluscuamperfecto',label:'Pret. pluscuamperfecto'},
        {val:'futuro simple',label:'Futuro simple'},
        {val:'futuro compuesto',label:'Futuro compuesto'},
        {val:'condicional simple',label:'Condicional simple'},
        {val:'condicional compuesto',label:'Condicional compuesto'},
        {val:'infinitivo',label:'Infinitivo (no personal)'},
        {val:'gerundio',label:'Gerundio (no personal)'},
        {val:'participio',label:'Participio (no personal)'}]},
      {id:'modo', label:'Modo', opts:[
        {val:'indicativo',label:'Indicativo'},{val:'subjuntivo',label:'Subjuntivo'},
        {val:'imperativo',label:'Imperativo'},{val:'no personal',label:'No personal'}]},
      {id:'aspecto', label:'Aspecto', opts:[
        {val:'perfectivo',label:'Perfectivo (acción completa)'},
        {val:'imperfectivo',label:'Imperfectivo (acción incompleta)'},
        {val:'—',label:'No procede (forma no personal)'}]},
      {id:'voz', label:'Voz', opts:[
        // F5 (jul-2026): antes solo ofrecía "Activa" (no discriminaba nada).
        // La pasiva perifrástica ser+participio se analiza como VOZ PASIVA
        // del verbo, no como clase de perífrasis — coherencia con C.Ag. de
        // Sintaxis. Ver docs/propuesta_niveles_morfologia.md §3 (➑).
        {val:'activa',label:'Activa'},
        {val:'pasiva',label:'Pasiva (ser + participio)'}]},
    ]},
  'Preposición':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'simple',label:'Preposición simple (a, de, en, por…)'},
        {val:'locución prepositiva',label:'Locución prepositiva (a causa de, junto a…)'}]},
    ]},
  'Conjunción':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'coordinante',label:'Coordinante'},{val:'subordinante',label:'Subordinante'}]},
      {id:'subtipo_coord', label:'Clase (coordinante)', dependsOn:{step:'tipo',val:'coordinante'},
       opts:[{val:'copulativa',label:'Copulativa (y, e, ni)'},
             {val:'disyuntiva',label:'Disyuntiva (o, u, o bien)'},
             {val:'adversativa',label:'Adversativa (pero, sino, mas)'},
             {val:'distributiva',label:'Distributiva (bien…bien, ora…ora)'}]},
      {id:'subtipo_sub', label:'Clase (subordinante)', dependsOn:{step:'tipo',val:'subordinante'},
       opts:[{val:'completiva',label:'Completiva (que, si)'},
             {val:'causal',label:'Causal (porque, ya que, puesto que…)'},
             {val:'concesiva',label:'Concesiva (aunque, si bien, por más que…)'},
             {val:'condicional',label:'Condicional (si, como, mientras…)'},
             {val:'final',label:'Final (para que, a fin de que…)'},
             {val:'temporal',label:'Temporal (cuando, mientras que, en cuanto…)'},
             {val:'ilativa',label:'Ilativa (conque, así que, luego…)'},
             {val:'consecutiva',label:'Consecutiva (tan…que, tanto…que)'},
             {val:'comparativa',label:'Comparativa (más…que, tan…como)'}]},
    ]},
  'Conector discursivo':{
    steps:[
      {id:'tipo', label:'Tipo de conector', opts:[
        {val:'aditivo',label:'Aditivo (además, asimismo, encima, es más…)'},
        {val:'contraste',label:'De contraste (sin embargo, no obstante, en cambio, ahora bien…)'},
        {val:'consecutivo',label:'Consecutivo (por tanto, en consecuencia, así pues, entonces…)'},
        {val:'organizador',label:'Organizador (en primer lugar, por otro lado, finalmente…)'},
        {val:'reformulador',label:'Reformulador (es decir, o sea, por ejemplo, en particular…)'},
        {val:'conclusión',label:'De conclusión (en conclusión, en resumen, en definitiva…)'}]},
    ]},
  'Interrogativo/Exclamativo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'determinante',label:'Determinante (acompaña a sustantivo: ¿Qué libro?, ¡Cuántas flores!)'},
        {val:'pronombre',label:'Pronombre (sustituye al nombre: ¿Qué dices?, ¡Quién lo diría!)'}]},
      {id:'tipo', label:'Tipo', opts:[
        {val:'interrogativo',label:'Interrogativo (pregunta: ¿qué?, ¿cuál?, ¿quién?, ¿cuánto?)'},
        {val:'exclamativo',label:'Exclamativo (exclamación: ¡qué!, ¡cuánto!, ¡quién!)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable (qué, quién)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'invariable',label:'Invariable (qué)'}]},
    ]},
  'Interjección':{
    steps:[
      {id:'tipo', label:'Morfológico', opts:[
        {val:'propia',label:'Propia (oh, ay, olé, puaf, hola…)'},
        {val:'impropia',label:'Impropia (sustantivo, verbo o adj. como interjección)'}]},
      {id:'función', label:'Función', opts:[
        {val:'apelativa',label:'Apelativa / Directiva (¡Silencio! ¡Venga!)'},
        {val:'expresiva',label:'Expresiva / Sintomática (¡Ay! ¡Caramba!)'}]},
    ]},
  'Marca.Imp.':{
    steps:[
      {id:'tipo', label:'Tipo de marca', opts:[
        {val:'marca de impersonalidad',label:'Marca de impersonalidad — el "se" bloquea la aparición del sujeto gramatical'}]},
    ]},
  'Marca.Pas.Ref.':{
    steps:[
      {id:'tipo', label:'Tipo de marca', opts:[
        {val:'marca de pasiva refleja',label:'Marca de pasiva refleja — el "se" introduce el sujeto paciente'}]},
    ]},
};

// ── ESO 3.º–4.º Cascades — atributos esenciales (subset de Maestro) ──
// F5 (jul-2026): correcciones y adiciones del §3 de
// docs/propuesta_niveles_morfologia.md. Se reutilizan los steps de
// MORPH_CASCADES (maestro) donde coinciden en contenido, para no duplicar
// listas de opciones que puedan desincronizarse.
const MORPH_CASCADES_ESO34 = {
  'Sustantivo':MORPH_CASCADES['Sustantivo'], // todos los atributos
  // ➊ clase (calificativo/relacional) + grado dependiente de clase — idéntico a maestro
  'Adjetivo':MORPH_CASCADES['Adjetivo'],
  // ➋ neutro (lo) + forma contracta (al/del); sin el paso "tipo" (determinado/indeterminado), que N2 no pregunta
  'Artículo':{steps:MORPH_CASCADES['Artículo'].steps.filter(s=>s.id!=='tipo')},
  // ➌ cercanía (este/ese/aquel) — idéntico a maestro
  'Demostrativo':MORPH_CASCADES['Demostrativo'],
  // ➍ un/varios poseedores; sin género (N2 no lo pregunta en posesivos)
  'Posesivo':{steps:MORPH_CASCADES['Posesivo'].steps.filter(s=>s.id!=='género')},
  'Cuantificador':{steps:[
    {id:'función_sint',label:'Función sintáctica',opts:[{val:'determinante',label:'Determinante'},{val:'pronombre',label:'Pronombre'},{val:'adjetivo',label:'Adjetivo'}]},
    {id:'tipo',label:'Tipo',opts:[{val:'numeral',label:'Numeral'},{val:'indefinido',label:'Indefinido'}]},
    {id:'subtipo_num',label:'Clase de numeral',dependsOn:{step:'tipo',val:'numeral'},opts:[{val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},{val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
    {id:'subtipo_ind',label:'Clase de indefinido',dependsOn:{step:'tipo',val:'indefinido'},opts:[{val:'universal',label:'Universal (todo, cada)'},{val:'indefinido débil',label:'Indefinido débil (mucho, poco, bastante)'},{val:'existencial',label:'Existencial (algún, ningún)'}]},
  ]},
  // ➎ Relativo (hoy sin cascada): solo función — se enseña en 4.º ESO y prepara Compuestas
  'Relativo':{steps:MORPH_CASCADES['Relativo'].steps.filter(s=>s.id==='función')},
  // ➏ Interr./Exclamativo (hoy sin cascada): tipo → función, sin género/número (eso ya es N3)
  'Interrogativo/Exclamativo':{steps:[
    {id:'tipo',label:'Tipo',opts:[{val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
    {id:'función',label:'Función',opts:[{val:'pronombre',label:'Pronombre (qué, quién, cuál)'},{val:'determinante',label:'Determinante (qué, cuánto)'},{val:'adverbio',label:'Adverbio (cuándo, cómo, dónde)'}]},
  ]},
  'Verbo':{steps:[
    {id:'conjugación',label:'Conjugación',opts:[{val:'primera',label:'1ª (-ar)'},{val:'segunda',label:'2ª (-er)'},{val:'tercera',label:'3ª (-ir)'}]},
    {id:'persona',label:'Persona',opts:[{val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'},{val:'no personal',label:'Forma no personal'}]},
    {id:'número',label:'Número',opts:[{val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'no procede',label:'No procede'}]},
    {id:'tiempo',label:'Tiempo',opts:[{val:'presente',label:'Presente'},{val:'pretérito imperfecto',label:'Pret. imperfecto'},{val:'pretérito perfecto simple',label:'Pret. perfecto simple'},{val:'pretérito perfecto compuesto',label:'Pret. perfecto compuesto'},{val:'pretérito pluscuamperfecto',label:'Pret. pluscuamperfecto'},{val:'futuro simple',label:'Futuro simple'},{val:'futuro compuesto',label:'Futuro compuesto'},{val:'condicional simple',label:'Condicional simple'},{val:'condicional compuesto',label:'Condicional compuesto'},{val:'infinitivo',label:'Infinitivo'},{val:'gerundio',label:'Gerundio'},{val:'participio',label:'Participio'}]},
    {id:'modo',label:'Modo',opts:[{val:'indicativo',label:'Indicativo'},{val:'subjuntivo',label:'Subjuntivo'},{val:'imperativo',label:'Imperativo'},{val:'no personal',label:'No personal'}]},
    ...MORPH_CASCADES['Verbo'].steps.filter(s=>s.id==='perífrasis'||s.id?.startsWith('perif_')),
    // ➐➑ aspecto (4.º ESO) + voz activa/pasiva (antes solo "activa") — mismos steps que maestro
    ...MORPH_CASCADES['Verbo'].steps.filter(s=>s.id==='aspecto'||s.id==='voz'),
  ]},
  'Adverbio':{steps:[
    {id:'tipo',label:'Tipo',opts:[{val:'lugar',label:'Lugar'},{val:'tiempo',label:'Tiempo'},{val:'modo',label:'Modo'},{val:'cantidad',label:'Cantidad'},{val:'negación',label:'Negación'},{val:'afirmación',label:'Afirmación'},{val:'duda',label:'Duda'}]},
  ]},
  'Pronombre personal':{steps:[
    {id:'persona',label:'Persona',opts:[{val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'}]},
    {id:'número',label:'Número',opts:[{val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    {id:'acent',label:'Acento',opts:[{val:'tónico',label:'Tónico (yo, tú, él…)'},{val:'átono',label:'Átono (me, te, se, lo…)'}]},
  ]},
  'Conjunción':{steps:[
    {id:'tipo',label:'Tipo',opts:[{val:'coordinante',label:'Coordinante'},{val:'subordinante',label:'Subordinante'}]},
    ...MORPH_CASCADES['Conjunción'].steps.filter(s=>s.dependsOn),
  ]},
};

// ── PAU (N3/maestro) overrides — F6a+F6b (jul-2026) ─────────────────────
// Solo las categorías que la receta PAU recorta o amplía respecto al nivel
// maestro compartido (MORPH_CASCADES); el resto de categorías caen al
// fallback MORPH_CASCADES[cat] vía getCascadeForNivel. Ver
// docs/propuesta_niveles_morfologia.md §4. Los determinantes con función
// pospuesta/pronominal se resuelven aparte, en MAESTRO_DISPATCH_CATS más
// abajo (necesitan conocer atrs.función del token, no solo cat+nivel).

// F6b: formación de palabras — atributo NUEVO y opcional (decisión 6 de
// Josele, §7): "simple/derivada/compuesta/parasintética", etiquetado
// progresivo desde las palabras jugosas de cada texto n3. step.optional
// (mecanismo de F6a) hace que nunca bloquee el confirmar ni penalice si no
// hay dato en el banco todavía.
const FORMACION_STEP = {id:'formación', label:'Formación (opcional)', optional:true, opts:[
  {val:'simple',label:'Simple (una sola raíz, sin afijos: casa, azul)'},
  {val:'derivada',label:'Derivada (raíz + afijo: casita, inmoral)'},
  {val:'compuesta',label:'Compuesta (dos o más raíces: sacacorchos)'},
  {val:'parasintética',label:'Parasintética (prefijo + sufijo a la vez, sin base intermedia: entristecer)'}]};

const MORPH_CASCADES_MAESTRO = {
  // Sustantivo propio: "hay que indicar EXCLUSIVAMENTE la categoría
  // gramatical y el tipo" — género/número solo se preguntan si es común,
  // y sin subclases semánticas (contable/colectivo/abstracto: eso es N2).
  // Formación solo tiene sentido si es común (los propios no se derivan/componen igual).
  'Sustantivo':{steps:[
    {id:'subtipo', label:'Clase', opts:[
      {val:'común',label:'Común'},{val:'propio',label:'Propio'}]},
    {id:'género', label:'Género', dependsOn:{step:'subtipo',val:'común'}, opts:[
      {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'ambiguo',label:'Ambiguo'}]},
    {id:'número', label:'Número', dependsOn:{step:'subtipo',val:'común'}, opts:[
      {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    {...FORMACION_STEP, dependsOn:{step:'subtipo',val:'común'}},
  ]},
  // + terminación (una/dos/invariable) — dato nuevo, se aplica a calificativos y relacionales por igual.
  'Adjetivo':{steps:[
    ...MORPH_CASCADES['Adjetivo'].steps,
    {id:'terminación', label:'Terminación', opts:[
      {val:'una terminación',label:'Una terminación (cambia en plural: feliz/felices)'},
      {val:'dos terminaciones',label:'Dos terminaciones (masc./fem.: alto/alta)'},
      {val:'invariable',label:'Invariable (no cambia en plural: gratis)'}]},
    FORMACION_STEP,
  ]},
  // Aspecto pasa a opcional ("si dudas, no lo pongas, no penalizará" — el
  // doc PAU) + simple/compuesto para formas no personales (dato nuevo,
  // dependsOn persona='no personal' para no repetir la pregunta de tiempo).
  'Verbo':{steps:[
    ...MORPH_CASCADES['Verbo'].steps.map(s => s.id==='aspecto'
      ? {...s, label:'Aspecto (opcional en PAU — si dudas, no lo marques)', optional:true}
      : s),
    {id:'np_forma', label:'Simple / compuesto (forma no personal)', dependsOn:{step:'persona',val:'no personal'}, opts:[
      {val:'simple',label:'Simple (lograr, estudiando, vistas)'},
      {val:'compuesto',label:'Compuesto (haber logrado, habiendo llegado, habiendo sido visto)'}]},
    FORMACION_STEP,
  ]},
  // Artículo es SIEMPRE determinante (no tiene atrs.función alternativo) —
  // se le añade directamente aquí la taxonomía definido/cuantificador sin
  // necesitar el dispatcher por atrs de más abajo.
  'Artículo':{steps:[
    {id:'tipo_det', label:'Tipo de determinante', opts:[
      {val:'definido',label:'Definido'},{val:'cuantificador',label:'Cuantificador'}]},
    ...MORPH_CASCADES['Artículo'].steps,
  ]},
};

// F6b (jul-2026): taxonomía PAU de determinantes (definido/cuantificador),
// pospuestos tratados como Adjetivo (decisión 2 de Josele, §7 de la
// propuesta) y "demás pronombres" con receta unificada. A diferencia del
// resto de overrides de arriba, esto exige conocer atrs.función del TOKEN
// real, no solo cat+nivel — de ahí que getCascadeForNivel reciba un tercer
// parámetro `atrs` opcional. tipo_det no es un atributo real del banco: se
// deriva de la categoría (ver TIPO_DET_POR_CATEGORIA / getEffectiveCorrectAtrs_).
const MAESTRO_DISPATCH_CATS = ['Demostrativo','Posesivo','Cuantificador','Interrogativo/Exclamativo','Relativo'];

const TIPO_DET_POR_CATEGORIA = {
  'Artículo':'definido', 'Demostrativo':'definido', 'Posesivo':'definido',
  'Cuantificador':'cuantificador', 'Interrogativo/Exclamativo':'cuantificador',
  'Relativo':'definido', // "cuyo" = posesivo relativo, dentro de los DEFINIDOS (nota del doc PAU)
};

// El token real es la fuente de verdad para saber si es determinante,
// aunque el alumno todavía no haya contestado nada.
// Cuantificador guarda su función sintáctica en 'función_sint', no en
// 'función' como el resto (Demostrativo/Posesivo/Interr.Excl./Relativo) —
// bug real de nombre de campo detectado 2026-07-12 al implementar F6b.
function getFuncionToken_(cat, atrs){
  if(!atrs) return '';
  return (cat === 'Cuantificador' ? atrs['función_sint'] : atrs['función']) || '';
}

function getEffectiveCorrectAtrs_(token){
  const atrs = (token && token.atrs) || {};
  const funcion = getFuncionToken_(token && token.cat, atrs);
  const esDeterminante = token && (token.cat === 'Artículo' || funcion === 'determinante');
  if(esDeterminante && TIPO_DET_POR_CATEGORIA[token.cat]){
    return {...atrs, tipo_det: TIPO_DET_POR_CATEGORIA[token.cat]};
  }
  return atrs;
}

const TIPO_DET_STEP_ = {id:'tipo_det', label:'Tipo de determinante', opts:[
  {val:'definido',label:'Definido'},{val:'cuantificador',label:'Cuantificador'}]};

function buildMaestroDispatchCascade_(cat, atrs){
  const funcion = getFuncionToken_(cat, atrs);

  if(funcion === 'determinante'){
    if(cat==='Demostrativo') return {steps:[TIPO_DET_STEP_,
      {id:'cercanía',label:'Referencia espacial',opts:[
        {val:'cercanía al hablante',label:'Cercanía al hablante (este/a)'},
        {val:'distancia media',label:'Distancia media (ese/a)'},
        {val:'lejanía',label:'Lejanía (aquel/la)'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Posesivo') return {steps:[TIPO_DET_STEP_,
      {id:'persona',label:'Persona del poseedor',opts:[
        {val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'}]},
      {id:'poseedores',label:'Nº de poseedores',opts:[
        {val:'un poseedor',label:'Un poseedor'},{val:'varios poseedores',label:'Varios poseedores'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Cuantificador') return {steps:[TIPO_DET_STEP_,
      {id:'tipo',label:'Tipo',opts:[
        {val:'numeral',label:'Numeral (cantidad precisa)'},{val:'indefinido',label:'Indefinido (cantidad imprecisa)'}]},
      {id:'subtipo_num',label:'Clase de numeral',dependsOn:{step:'tipo',val:'numeral'},opts:[
        {val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},{val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
      {id:'subtipo_ind',label:'Clase de indefinido',dependsOn:{step:'tipo',val:'indefinido'},opts:[
        {val:'universal',label:'Universal (todo, cada, ambos, sendos)'},{val:'indefinido débil',label:'Indefinido débil (alguno, mucho, poco…)'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Interrogativo/Exclamativo') return {steps:[TIPO_DET_STEP_,
      {id:'tipo',label:'Tipo',opts:[
        {val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'invariable',label:'Invariable'}]}]};
    if(cat==='Relativo') return {steps:[TIPO_DET_STEP_,
      // "cuyo" — un solo caso real, sin tipo específico propio que preguntar
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
  }

  if(funcion === 'adjetivo'){
    // Pospuesto: "el doc los analiza como adjetivos con receta propia"
    // (decisión 2 de Josele, §7): demostrativo/posesivo pospuestos = Adjetivo.
    if(cat==='Demostrativo') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Posesivo') return {steps:[
      {id:'persona',label:'Persona del poseedor',opts:[
        {val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'}]},
      {id:'poseedores',label:'Nº de poseedores',opts:[
        {val:'un poseedor',label:'Un poseedor'},{val:'varios poseedores',label:'Varios poseedores'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Cuantificador') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
  }

  if(funcion === 'pronombre'){
    // "Demás pronombres": tipo (si cuantificador, subtipo) → género →
    // número — CUATRO aspectos en el cuantificador (el caso más completo
    // del doc PAU); los demás se quedan en género+número (o tipo+género+
    // número en interr./excl., que sí distingue interrogativo/exclamativo).
    if(cat==='Cuantificador') return {steps:[
      {id:'tipo',label:'Tipo',opts:[
        {val:'numeral',label:'Numeral (cantidad precisa)'},{val:'indefinido',label:'Indefinido (cantidad imprecisa)'}]},
      {id:'subtipo_num',label:'Clase de numeral',dependsOn:{step:'tipo',val:'numeral'},opts:[
        {val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},{val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
      {id:'subtipo_ind',label:'Clase de indefinido',dependsOn:{step:'tipo',val:'indefinido'},opts:[
        {val:'universal',label:'Universal (todo, cada, ambos, sendos)'},{val:'indefinido débil',label:'Indefinido débil (alguno, mucho, poco…)'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Demostrativo') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro (esto, eso, aquello)'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Relativo') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'invariable',label:'Invariable (que)'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'invariable',label:'Invariable (que)'}]}]};
    if(cat==='Interrogativo/Exclamativo') return {steps:[
      {id:'tipo',label:'Tipo',opts:[
        {val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'invariable',label:'Invariable'}]}]};
  }

  return null; // p.ej. Relativo con función='adverbio' — cae al cascade normal (MORPH_CASCADES)
}

/** Helper: returns the correct cascade for the active level */
function getCascadeForNivel(cat, nivel, atrs){
  if(nivel === 'aprendiz') return {steps:[]};
  if(nivel === 'eso34') return MORPH_CASCADES_ESO34[cat] || {steps:[]};
  if(nivel === 'maestro'){
    if(MAESTRO_DISPATCH_CATS.includes(cat)){
      const dispatched = buildMaestroDispatchCascade_(cat, atrs);
      if(dispatched) return dispatched;
    }
    return MORPH_CASCADES_MAESTRO[cat] || MORPH_CASCADES[cat] || {steps:[]};
  }
  return MORPH_CASCADES[cat] || {steps:[]};
}

// ── F9 (jul-2026): ponderación de la nota ───────────────────────────────
// Decisiones de Josele (2026-07-14), coherentes con el rediseño de
// calificación de Simples/Compuestas ([[project-rediseno-calificacion]]):
//  1. Rasgos DISCRIMINANTES (los que deciden la clase o su comportamiento:
//     subtipo/clase, función/función_sint, tipo_det, voz, perífrasis y sus
//     sub-pasos) pesan ×2; los AUTOMÁTICOS (género, número, persona,
//     conjugación, tiempo, modo, grado, terminación, aspecto, cercanía,
//     poseedores, formación, np_forma, acent, tipo…) pesan ×1.
//  2. Categorías FRONTERA (obligan a decidir determinante/pronombre/adjetivo)
//     pesan 3; el resto 2. En N1 (aprendiz) la categoría es plana: el alumno
//     solo ve las 9 clases genéricas, no distingue las frontera.
//  3. Curva DURA solo en examen, por palabra, sobre el bloque de rasgos (no
//     la categoría, que es la puerta): 0 fallos→100%, 1→40%, 2→10%, 3+→0%.
//     Práctica = lineal ponderada. Los rasgos opcionales (aspecto en PAU) no
//     penalizan ni entran en la curva.
// Afecta SOLO al cálculo de nota (MM.totalCorrect/totalAttempted). El
// diagnóstico del profesor (catStats, tokens ok/err) sigue en puntos RAW
// sin ponderar, para que "en qué categorías falla el alumno" no se distorsione.
const MORPH_CATS_FRONTERA = new Set(['Demostrativo','Posesivo','Cuantificador','Relativo','Interrogativo/Exclamativo']);
const MORPH_STEPS_DISCRIMINANTES = new Set(['subtipo','función','función_sint','tipo_det','voz','perífrasis','perif_tipo','perif_inf_clase','perif_modal','perif_tempo','perif_ger_info','perif_par_info']);
const MORPH_PESO_CAT_FRONTERA = 3;
const MORPH_PESO_CAT_BASE = 2;
// Curva de examen por palabra (mismo espíritu que Simples 100/40/10/0). Un
// único punto de ajuste si Josele quiere suavizarla (p.ej. [1,0.5,0.25,0]).
const MORPH_EXAM_ATTR_CURVE = [1, 0.4, 0.1, 0]; // índice = nº de rasgos fallados; 3+ → 0

function getCategoryWeight_(cat, nivel){
  if(nivel === 'aprendiz') return MORPH_PESO_CAT_BASE; // plano: solo clase genérica
  return MORPH_CATS_FRONTERA.has(cat) ? MORPH_PESO_CAT_FRONTERA : MORPH_PESO_CAT_BASE;
}
function getStepWeight_(stepId){
  return MORPH_STEPS_DISCRIMINANTES.has(stepId) ? 2 : 1;
}
function examAttrCurve_(wrongCount){
  return MORPH_EXAM_ATTR_CURVE[Math.min(wrongCount, MORPH_EXAM_ATTR_CURVE.length - 1)];
}

// F9 (jul-2026): valor CORRECTO de un paso según el banco, con el default
// implícito de perífrasis. Devuelve undefined si el banco no tiene respuesta
// para ese rasgo (p.ej. `terminación`/`formación` en tokens etiquetados
// antes de F6a/F6b/F7). Un paso sin respuesta en el banco NO se pregunta ni
// se puntúa — no es justo exigir algo que el banco aún no sabe, y el
// etiquetado progresivo (F7) va activando esos pasos a medida que se rellenan.
function morphCorrectVal_(stepId, correctAtrs){
  const v = correctAtrs[stepId];
  if(v !== undefined && v !== '') return v;
  if(stepId === 'perífrasis') return 'no'; // default implícito histórico del banco
  return undefined;
}
// ¿El banco tiene respuesta para este paso (aplicable ya por dependsOn)?
function morphStepAnswerable_(step, correctAtrs){
  return morphCorrectVal_(step.id, correctAtrs) !== undefined;
}

const CATEGORIES = Object.keys(MORPH_CASCADES);

// F4 (jul-2026): N1 (aprendiz) reduce el inventario visible a las 9 clases
// clásicas de 1.º-2.º ESO (Sustantivo/Adjetivo/Determinante/Pronombre/Verbo/
// Adverbio/Preposición/Conjunción/Interjección). El banco conserva sus
// etiquetas finas (Artículo, Demostrativo, Posesivo, Cuantificador,
// Relativo, Interr./Excl., Pronombre personal); esta función traduce
// cat+atrs.función a la clase genérica que el alumno debe reconocer.
// Ver docs/propuesta_niveles_morfologia.md §2 (tabla + decisión 2 de Josele:
// demostrativo/posesivo pospuestos = Adjetivo, fiel a la receta PAU).
const N1_DET_PRON_CATS = ['Demostrativo', 'Posesivo', 'Cuantificador', 'Interrogativo/Exclamativo'];

function mapCategoriaN1_(cat, atrs) {
  if (cat === 'Artículo') return 'Determinante';
  if (cat === 'Pronombre personal') return 'Pronombre';
  if (N1_DET_PRON_CATS.includes(cat)) {
    // Cuantificador guarda la función en 'función_sint', no en 'función'
    // como el resto — bug real corregido 2026-07-12 (getFuncionToken_, F6b).
    const funcion = getFuncionToken_(cat, atrs);
    if (funcion === 'adjetivo') return 'Adjetivo';
    if (funcion === 'pronombre') return 'Pronombre';
    return 'Determinante'; // función 'determinante' (o sin marcar, caso más frecuente)
  }
  if (cat === 'Relativo') {
    const funcion = getFuncionToken_(cat, atrs);
    if (funcion === 'adverbio') return 'Adverbio';
    if (funcion === 'determinante') return 'Determinante';
    return 'Pronombre'; // función 'pronombre' (caso más frecuente: que, quien…)
  }
  return cat; // Sustantivo/Adjetivo/Verbo/Adverbio/Preposición/Conjunción/Interjección
              // y los fenómenos que N1 no debería encontrar (Conector discursivo,
              // Marca.Imp., Marca.Pas.Ref.) se muestran tal cual — no aparecen en
              // los textos N1 curados, pero si la relajación de nivel (F2) sirve
              // contenido N2 de refuerzo, el alumno sigue viendo el botón real.
}

// ── Mock morphological data for the 5 example sentences ──────────────
// ── García Márquez token banks ────────────────────────────────────
const MAESTRO_DEMO = [{"id": "m1_01", "texto": "¡", "cat": "Puntuación", "atrs": {}}, {"id": "m1_02", "texto": "Hala", "cat": "Interjección", "atrs": {"tipo": "propia", "función": "expresiva"}}, {"id": "m1_03", "texto": "!", "cat": "Puntuación", "atrs": {}}, {"id": "m1_04", "texto": "Encontré", "cat": "Verbo", "atrs": {"conjugación": "primera", "persona": "primera persona", "número": "singular", "tiempo": "pretérito perfecto simple", "modo": "indicativo", "aspecto": "perfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_05", "texto": "este", "cat": "Demostrativo", "atrs": {"función": "determinante", "cercanía": "proximidad", "género": "masculino", "número": "singular"}}, {"id": "m1_06", "texto": "cofre", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "masculino", "número": "singular"}}, {"id": "m1_07", "texto": "pequeño", "cat": "Adjetivo", "atrs": {"subtipo": "calificativo", "género": "masculino", "número": "singular", "grado": "positivo"}}, {"id": "m1_08", "texto": "bajo", "cat": "Preposición", "atrs": {"tipo": "simple"}}, {"id": "m1_09", "texto": "la", "cat": "Artículo", "atrs": {"tipo": "determinado", "género": "femenino", "número": "singular", "forma": "ninguna"}}, {"id": "m1_10", "texto": "cama", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "femenino", "número": "singular"}}, {"id": "m1_11", "texto": "de", "cat": "Preposición", "atrs": {"tipo": "simple"}}, {"id": "m1_12", "texto": "mi", "cat": "Posesivo", "atrs": {"función": "determinante", "persona": "primera persona", "poseedores": "un poseedor", "género": "invariable", "número": "singular"}}, {"id": "m1_13", "texto": "abuelo", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "masculino", "número": "singular"}}, {"id": "m1_14", "texto": ".", "cat": "Puntuación", "atrs": {}}, {"id": "m1_15", "texto": "Dentro", "cat": "Adverbio", "atrs": {"tipo": "lugar"}}, {"id": "m1_16", "texto": "había", "cat": "Verbo", "atrs": {"conjugación": "segunda", "persona": "tercera persona", "número": "singular", "tiempo": "pretérito imperfecto", "modo": "indicativo", "aspecto": "imperfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_17", "texto": "muchas", "cat": "Cuantificador", "atrs": {"tipo": "indefinido", "subtipo_ind": "indefinido débil", "función_sint": "determinante", "género": "femenino", "número": "plural"}}, {"id": "m1_18", "texto": "cartas", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "femenino", "número": "plural"}}, {"id": "m1_19", "texto": "amarillas", "cat": "Adjetivo", "atrs": {"subtipo": "calificativo", "género": "femenino", "número": "plural", "grado": "positivo"}}, {"id": "m1_20", "texto": "y", "cat": "Conjunción", "atrs": {"tipo": "coordinante", "subtipo_coord": "copulativa"}}, {"id": "m1_21", "texto": "un", "cat": "Artículo", "atrs": {"tipo": "indeterminado", "género": "masculino", "número": "singular", "forma": "ninguna"}}, {"id": "m1_22", "texto": "reloj", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "masculino", "número": "singular"}}, {"id": "m1_23", "texto": "antiguo", "cat": "Adjetivo", "atrs": {"subtipo": "calificativo", "género": "masculino", "número": "singular", "grado": "positivo"}}, {"id": "m1_24", "texto": ".", "cat": "Puntuación", "atrs": {}}, {"id": "m1_25", "texto": "Nosotros", "cat": "Pronombre personal", "atrs": {"persona": "primera persona", "número": "plural", "género": "masculino", "acent": "tónico"}}, {"id": "m1_26", "texto": "las", "cat": "Pronombre personal", "atrs": {"persona": "tercera persona", "número": "plural", "género": "femenino", "acent": "átono"}}, {"id": "m1_27", "texto": "leeremos", "cat": "Verbo", "atrs": {"conjugación": "segunda", "persona": "primera persona", "número": "plural", "tiempo": "futuro simple", "modo": "indicativo", "aspecto": "imperfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_28", "texto": "pronto", "cat": "Adverbio", "atrs": {"tipo": "tiempo"}}, {"id": "m1_29", "texto": "porque", "cat": "Conjunción", "atrs": {"tipo": "subordinante", "subtipo_sub": "causal"}}, {"id": "m1_30", "texto": "guardan", "cat": "Verbo", "atrs": {"conjugación": "primera", "persona": "tercera persona", "número": "plural", "tiempo": "presente", "modo": "indicativo", "aspecto": "imperfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_31", "texto": "secretos", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "abstracto", "género": "masculino", "número": "plural"}}, {"id": "m1_32", "texto": "familiares", "cat": "Adjetivo", "atrs": {"subtipo": "relacional", "género": "invariable", "número": "plural"}}, {"id": "m1_33", "texto": ".", "cat": "Puntuación", "atrs": {}}];

// Normaliza el campo perífrasis antiguo (un solo valor) al nuevo formato cascada
function normalizePerifrasTokenAtrs(atrs){
  if(!atrs) return atrs;
  // Remove non-cascade 'forma' field (impersonal/pronominal) — store in _meta for reference but don't score
  if(atrs.forma && !['simple','compuesta'].includes(atrs.forma)){
    const {forma, ...rest} = atrs;
    atrs = rest;
  }
  if(!atrs.perífrasis || atrs.perífrasis==='no' || atrs.perif_tipo) return atrs;
  let p = String(atrs.perífrasis);
  // Legacy format variants → canonical
  // "modal (posibilidad)" → "sí — modal de probabilidad"
  // "modal (obligación)" / "modal (obligación/destino)" / "modal (obligación impersonal)" → "sí — modal de obligación"
  // "aspectual (incoativa...)" → "sí — tempoaspectual incoativa"
  // "aspectual (frecuentativa/meta)" → "sí — tempoaspectual reiterativa"
  const lower = p.toLowerCase();
  if(!p.startsWith('sí')){
    if(lower.includes('obligación') || lower.includes('obligacion')) p = 'sí — modal de obligación';
    else if(lower.includes('posibilidad') || lower.includes('probabilidad')) p = 'sí — modal de probabilidad';
    else if(lower.includes('capacidad')) p = 'sí — modal de capacidad';
    else if(lower.includes('incoativa') || lower.includes('incoativo') || lower.includes('futuro próximo')) p = 'sí — tempoaspectual incoativa';
    else if(lower.includes('terminativa') || lower.includes('terminativo')) p = 'sí — tempoaspectual terminativa';
    else if(lower.includes('reiterativa') || lower.includes('frecuentativa') || lower.includes('meta')) p = 'sí — tempoaspectual reiterativa';
    else if(lower.includes('gerundio')) p = 'sí — aspectual de gerundio';
    else if(lower.includes('participio')) p = 'sí — aspectual de participio';
    else return atrs; // unknown format — leave as-is
  }
  const a = {...atrs, perífrasis: 'sí'};
  if(p.includes('gerundio'))        { a.perif_tipo = 'gerundio'; a.perif_ger_info = 'sí — aspectual de gerundio'; }
  else if(p.includes('participio')) { a.perif_tipo = 'participio'; a.perif_par_info = 'sí — aspectual de participio'; }
  else {
    a.perif_tipo = 'infinitivo';
    if(p.includes('modal')){
      a.perif_inf_clase = 'modal';
      if(p.includes('capacidad')) a.perif_modal = 'sí — modal de capacidad';
      else if(p.includes('posibilidad') || p.includes('probabilidad')) a.perif_modal = 'sí — modal de probabilidad';
      else a.perif_modal = 'sí — modal de obligación'; // default fallback for any unclassified modal
    } else {
      a.perif_inf_clase = 'tempoaspectual';
      if(p.includes('incoativa')) a.perif_tempo = 'sí — tempoaspectual incoativa';
      else if(p.includes('terminativa')) a.perif_tempo = 'sí — tempoaspectual terminativa';
      else if(p.includes('reiterativa')) a.perif_tempo = 'sí — tempoaspectual reiterativa';
      else a.perif_tempo = p;
    }
  }
  return a;
}

function buildMaestroText(tokens, label) {
  return { oracion: label, tokens: tokens.map(t=>({...t, atrs: t.cat==='Verbo'?normalizePerifrasTokenAtrs(t.atrs):t.atrs})) };
}

const MAESTRO_TEXTS = [
  buildMaestroText(MAESTRO_DEMO, 'El viejo desván — Texto de demostración'),
];

// ── MAESTRO ENGINE ────────────────────────────────────────────────────
function startMaestro({name,email,grupo}){
  if(!name){document.getElementById('e-name').textContent='Escribe tu nombre.';return;}
  if(!email||!EMAIL_RE.test(email)){
    document.getElementById('e-email').textContent='Correo @murciaeduca.es, @alu.murciaeduca.es o @gmail.com requerido.';return;
  }
  if(!selectedMorphTipo){
    document.getElementById('e-morphtipo').textContent='Elige el tipo de actividad.';return;
  }
  if(selectedMorphTipo === 'reto'){
    if(!selectedChallenge){
      const errEl=document.getElementById('e-challenge');
      if(errEl){errEl.textContent='Elige un reto.';errEl.classList.add('show');}
      return;
    }
    const ch = MORPH_CHALLENGES.find(c=>c.id===selectedChallenge);
    if(ch) startMorphChallenge({name,email,challenge:ch});
    return;
  }
  if(!selectedMaestroMode){
    const errEl=document.getElementById('e-maestromode');
    if(errEl){errEl.textContent='Elige una modalidad.';errEl.classList.add('show');}
    return;
  }
  // Fase 3.4 (jul-2026): en examen el nivel lo fija el PIN del profesor —
  // el selector está oculto (setMaestroMode) y no hace falta validarlo.
  // En su lugar, se valida el PIN.
  const morfoPin = (document.getElementById('inp-morfo-pin')?.value||'').trim();
  if(selectedMaestroMode === 'exam'){
    if(!morfoPin || !/^\d{4,6}$/.test(morfoPin)){
      const errEl=document.getElementById('e-morfo-pin');
      if(errEl){errEl.textContent='El PIN debe tener entre 4 y 6 dígitos numéricos.';errEl.classList.add('show');}
      return;
    }
  } else if(!selectedMaestroNivel){
    const errEl=document.getElementById('e-maestronivel');
    if(errEl){errEl.textContent='Elige un nivel.';errEl.classList.add('show');}
    return;
  }
  // Streak + daily mission: trigger on morphology entry (same as syntax)
  try{ updateDailyStreak(); }catch(e){console.warn('[streak morph]',e);}
  if(selectedMaestroMode === 'exam'){
    _loadMaestroExamByPin(name,email,grupo,morfoPin);
    return;
  }
  // Try loading texts from Sheets, fall back to hardcoded
  _loadMaestroTexts(name,email,grupo);
}

// Fase 3.4 (jul-2026): examen con PIN — el profesor pre-computó un lote fijo
// de textos (createExamMorfologia); el alumno solo lee esa fila. Mismo
// espíritu que _doHandleStart de Simples, con manejo de errores equivalente.
async function _loadMaestroExamByPin(name,email,grupo,pin){
  const errEl=document.getElementById('e-morfo-pin');
  if(errEl){errEl.textContent='';errEl.classList.remove('show');}
  const apiUrl = getApiUrl();
  if(!apiUrl){
    if(errEl){errEl.textContent='⚠ Sin conexión al servidor.';errEl.classList.add('show');}
    return;
  }
  showScreen('loading');
  const loadingTxt=document.getElementById('loading-txt');
  if(loadingTxt) loadingTxt.textContent='Cargando examen (PIN '+pin+')…';
  try{
    const r = await fetchWithTimeout(apiUrl+'?action=getExamConfigMorfologia&pin='+encodeURIComponent(pin),{},12000);
    const d = await r.json();
    if(d.error || !d.ok){
      showScreen('login');
      if(errEl){errEl.textContent='⚠ '+(d.error||'PIN no válido.');errEl.classList.add('show');}
      return;
    }
    if(!d.textos || d.textos.length===0){
      showScreen('login');
      if(errEl){errEl.textContent='⚠ El examen no tiene textos configurados.';errEl.classList.add('show');}
      return;
    }
    const analyzed = [];
    d.textos.forEach(t => {
      try{
        if(!t.tokens || !Array.isArray(t.tokens) || t.tokens.length===0) return;
        const safeTokens = t.tokens
          .filter(tk => tk && tk.cat && tk.texto)
          .filter(tk => tk.cat !== 'Puntuación')
          .map(tk => tk.cat==='Verbo' ? {...tk, atrs: normalizePerifrasTokenAtrs(tk.atrs)} : tk);
        if(safeTokens.length===0) return;
        analyzed.push({ title: t.texto.slice(0,50)+'…', tokens: safeTokens, allTokens: t.tokens });
      }catch(tokErr){ console.warn('[examMorfologia] Texto saltado (tokens corruptos):', t.id||'?', tokErr); }
    });
    if(analyzed.length===0){
      showScreen('login');
      if(errEl){errEl.textContent='⚠ Error al procesar los textos del examen.';errEl.classList.add('show');}
      return;
    }
    // El grupo del alumno (formulario) tiene prioridad sobre el del PIN
    // config, igual que en el examen de Simples.
    MM={
      name, email, grupo: grupo||d.grupo||'',
      mode:'exam', nivel: d.nivel||'maestro',
      examPin: pin, examGrupo:d.grupo||'', examEval:d.evaluacion||'', examName:d.nombreExamen||'',
      sentences: analyzed, idx:0, tokenIdx:-1,
      totalCorrect:0, totalAttempted:0,
      totalTokens: analyzed.reduce((a,s)=>a+s.tokens.length,0),
      doneTokens:0, selections:{}, tokenSelections:{},
      currentCat:null, currentAtrs:{}, errors:0, catStats:{}
    };
    showScreen('screen-maestro');
    const skipBtn = document.getElementById('mm-skip-text');
    if(skipBtn) skipBtn.style.display='none';
    renderMaestroSentence();
  }catch(e){
    showScreen('login');
    if(errEl){errEl.textContent='⚠ Error de conexión: '+(e.message||'timeout')+'. Inténtalo de nuevo.';errEl.classList.add('show');}
  }
}

async function _loadMaestroTexts(name,email,grupo){
  let textsToUse = [...MAESTRO_TEXTS]; // fallback
  const apiUrl = getApiUrl();
  if(apiUrl){
    try{
      const nivelContenido = MORPH_NIVEL_CONTENIDO[selectedMaestroNivel] || 'n3';
      const r = await fetchWithTimeout(apiUrl+'?action=getTextosMorfologia&nivel='+nivelContenido,{},6000);
      const d = await r.json();
      if(d.nivelRelajado) console.warn('[loadMaestroTexts] Banco insuficiente para el nivel "'+d.nivelSolicitado+'" — servido nivel "'+d.nivelServido+'".');
      if(d.textos && d.textos.length>0){
        // Accept each text, skip silently the ones with corrupt tokens
        const analyzed = [];
        d.textos.forEach(t => {
          try {
            if(!t.tokens || !Array.isArray(t.tokens) || t.tokens.length===0) return;
            const safeTokens = t.tokens
              .filter(tk => tk && tk.cat && tk.texto) // defensive: reject null/partial tokens
              .filter(tk => tk.cat !== 'Puntuación')
              .map(tk => tk.cat==='Verbo' ? {...tk, atrs: normalizePerifrasTokenAtrs(tk.atrs)} : tk);
            if(safeTokens.length===0) return;
            analyzed.push({
              title: t.texto.slice(0,50)+'…',
              tokens: safeTokens,
              allTokens: t.tokens,
            });
          } catch(tokErr) {
            console.warn('[loadMaestroTexts] Texto saltado (tokens corruptos):', t.id||'?', tokErr);
          }
        });
        if(analyzed.length>0) textsToUse = analyzed;
        else console.warn('[loadMaestroTexts] Ningún texto del Sheet usable, usando fallback');
      }
    }catch(e){console.warn('[loadMaestroTexts] Sheets error, usando fallback:',e);}
  }
  // Shuffle texts randomly
  const shuffled = shuffle(textsToUse);
  MM={
    name, email, grupo: grupo||'', // Fase 3.2 (jul-2026): para poder enviarlo con la nota de examen
    mode: selectedMaestroMode,
    nivel: selectedMaestroNivel || 'maestro',
    sentences: shuffled,
    idx:0,
    tokenIdx:-1,
    totalCorrect:0,
    totalAttempted:0,
    totalTokens: shuffled.reduce((a,s)=>a+s.tokens.length,0),
    doneTokens:0,
    selections:{},
    tokenSelections: {},
    currentCat: null,
    currentAtrs: {},
    errors:0,
    catStats:{}
  };
  showScreen('screen-maestro');
  // Fase 3.1 (jul-2026): saltar un texto en examen regala nota (los tokens
  // saltados no computan) — el botón solo tiene sentido en práctica.
  const skipBtn = document.getElementById('mm-skip-text');
  if(skipBtn) skipBtn.style.display = (MM.mode==='exam') ? 'none' : '';
  renderMaestroSentence();
}

// Fase 3.1 (jul-2026): mismo patrón que el examen de Simples (sint:3524) —
// en examen, confirmar antes de salir para no perder la nota sin avisar.
function exitMaestro(){
  if(MM && MM.mode==='exam'){
    if(confirm('¿Salir del examen? Si no has terminado, no se guardará la nota.')){
      goLogin();
    }
    return;
  }
  goLogin();
}

function skipMaestroText(){
  if(!MM) return;
  MM.idx++;
  MM.tokenIdx = -1;
  MM.currentCat = null;
  MM.currentAtrs = {};
  MM.selections = {};
  const skipBtn = document.getElementById('mm-skip-text');
  if(MM.idx >= MM.sentences.length){
    if(skipBtn) skipBtn.style.display='none';
    showMaestroResults();
    return;
  }
  renderMaestroSentence();
}

function renderMaestroSentence(){
  try{
  const sent = MM.sentences[MM.idx];
  if(!sent){showMaestroResults();return;}
  MM.tokenIdx = -1;
  MM.currentCat = null;
  MM.currentAtrs = {};
  MM.selections = {}; // Reset per-text selections

  // Build paper with text corrido — pending tokens are clickable, done tokens show badge
  const paperWrap = document.getElementById('mm-paper-wrap');
  renderMaestroText();
  document.getElementById('mm-cascade-wrap').innerHTML = '';
  updateMaestroHeader();
  }catch(e){
    console.error('[renderMaestroSentence]',e);
    document.getElementById('mm-paper-wrap').innerHTML=errorCard('Error en Morfología',e.message);
  }
}

function renderMaestroText(){
  const sent = MM.sentences[MM.idx];
  if(!sent) return;
  const displayTokens = sent.allTokens || sent.tokens; // allTokens includes punctuation
  const evalTokens = sent.tokens; // evaluable tokens only
  const paperWrap = document.getElementById('mm-paper-wrap');
  const done = Object.keys(MM.selections).length;

  // Build a map from eval token index to display token index
  let evalIdx = 0;
  const displayToEval = {};
  displayTokens.forEach((dt, di) => {
    if(dt.cat === 'Puntuación') return;
    if(evalIdx < evalTokens.length && evalTokens[evalIdx].id === dt.id){
      displayToEval[di] = evalIdx;
      evalIdx++;
    }
  });

  paperWrap.innerHTML = `
    <div style="font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
      color:var(--muted);margin-bottom:8px;font-family:'Nunito',sans-serif">
      ${sent.oracion||sent.title||'Texto '+(MM.idx+1)}
    </div>
    <div class="paper-sheet" style="margin-bottom:0;padding:28px 40px 24px">
      <div id="mm-text-flow" style="font-family:'Lora',serif;font-size:1.1rem;line-height:2.2;
        color:var(--ink);display:flex;flex-wrap:wrap;gap:4px 6px;align-items:baseline">
        ${displayTokens.map((t,di)=>{
          // Punctuation: just show the text, not clickable, no gap before
          if(t.cat === 'Puntuación'){
            return '<span style="margin-left:-4px;pointer-events:none">'+t.texto+'</span>';
          }
          const ei = displayToEval[di];
          if(ei === undefined) return '<span>'+t.texto+'</span>';
          const sel = MM.selections[ei];
          const isActive = MM.tokenIdx === ei;
          if(sel){
            // Coloreado por acierto RAW (rasgos bien / total), no por la nota
            // ponderada — coherente con el panel de feedback. Fallback a
            // earned/possible por si viniera de una sesión pre-F9.
            const _p = sel.rawPossible!=null?sel.rawPossible:sel.possible;
            const _e = sel.rawEarned!=null?sel.rawEarned:sel.earned;
            const pct=_p>0?Math.round(_e/_p*100):0;
            const col=pct>=80?'#059669':pct>=50?'#D97706':'#DC2626';
            return '<span class="mm-token mm-done" style="color:'+col+';border-bottom:2px solid '+col+';cursor:default" title="'+t.cat+' — '+pct+'%">'+t.texto+'</span>';
          }
          if(isActive){
            return '<span class="mm-token mm-active" id="mm-tk-'+ei+'" style="background:var(--blue);color:#fff;padding:2px 6px;border-radius:6px;cursor:default;font-weight:700">'+t.texto+'</span>';
          }
          return '<span class="mm-token mm-pending" id="mm-tk-'+ei+'" onclick="selectToken('+ei+')" style="cursor:pointer;padding:2px 3px" title="Haz clic para analizar">'+t.texto+'</span>';
        }).join(' ')}
      </div>
      <div style="margin-top:8px;padding:6px 12px;background:rgba(37,99,235,.06);border-radius:8px;font-family:'Nunito',sans-serif;display:flex;align-items:center;justify-content:space-between;font-size:.75rem">
        <span style="color:#3B82F6">👆 Haz clic en una palabra para analizarla</span>
        <span style="font-weight:700;color:#1D4ED8">${done}/${evalTokens.length}</span>
      </div>
    </div>`;
}

function updateMaestroHeader(){
  const totalTk = MM.totalTokens||1;
  const doneTk  = MM.doneTokens||0;
  document.getElementById('mm-prog').style.width = (doneTk/totalTk*100)+'%';
  document.getElementById('mm-counter').textContent =
    `Texto ${MM.idx+1}/${MM.sentences.length} · ${doneTk}/${totalTk} palabras`;
  const nota = MM.totalAttempted>0?(MM.totalCorrect/MM.totalAttempted*10).toFixed(1):'—';
  document.getElementById('mm-score').textContent = nota+'/10';
}

function selectToken(idx){
  const sent = MM.sentences[MM.idx];
  const token = sent.tokens[idx];
  if(MM.selections[idx]) return; // already done
  playClick(); // C4A: feedback inmediato al seleccionar token
  MM.tokenIdx = idx;
  MM.currentCat = null;
  MM.currentAtrs = {};
  // Re-render text to show active state
  renderMaestroText();
  renderCascade(token);
  // Scroll cascade into view but keep text visible
  setTimeout(()=>{
    const activeWord=document.getElementById('casc-active-word');
    if(activeWord) activeWord.scrollIntoView({behavior:'smooth',block:'start'});
    else document.getElementById('mm-cascade-wrap')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  },100);
}

function renderCascade(token){
  const wrap = document.getElementById('mm-cascade-wrap');
  const isAprendiz = MM.nivel === 'aprendiz';
  MM.currentCat = null;
  MM.currentAtrs = {};
  MM.pendingGroup = null;

  wrap.innerHTML = `
    <div class="cascade-panel" id="cascade-panel">
      <div id="casc-active-word" style="position:sticky;top:0;z-index:10;background:var(--blue);color:#fff;
        padding:8px 16px;border-radius:10px;margin-bottom:14px;font-family:'Lora',serif;font-size:1.15rem;
        font-weight:700;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.15)">
        \u201c${token.texto}\u201d
      </div>
      <div class="cascade-step">
        <div class="cascade-label">
          <span>1</span>Categoría gramatical de: <strong style="color:var(--blue);font-family:'Lora',serif;font-size:1.05rem">${token.texto}</strong>
        </div>
        ${isAprendiz ? `<div style="font-size:.75rem;color:var(--muted);margin-bottom:10px;font-style:italic;padding:6px 10px;background:var(--paper2);border-radius:8px">💡 ${getCategoryHint(token.cat)}</div>` : ''}
        <div id="casc-group-opts" style="display:flex;flex-direction:column;gap:8px">
          ${renderCatGroups()}
        </div>
      </div>
      <div id="casc-sub-step" style="display:none"></div>
      <div id="casc-attrs-area"></div>
      <button type="button" class="maestro-confirm-btn" id="casc-confirm" disabled onclick="confirmToken()">
        Confirmar ✓
      </button>
    </div>`;
}

// Category groups definition
const CAT_GROUPS = [
  {
    id: 'contenido',
    label: '① Palabras de contenido léxico',
    color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD',
    cats: ['Sustantivo', 'Verbo', 'Adjetivo', 'Adverbio']
  },
  {
    id: 'determ',
    label: '② Determinantes',
    color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD',
    cats: ['Artículo', 'Demostrativo', 'Posesivo', 'Cuantificador']
  },
  {
    id: 'pronom',
    label: '③ Pronombres',
    color: '#0891B2', bg: '#ECFEFF', border: '#67E8F9',
    cats: ['Pronombre personal', 'Demostrativo', 'Posesivo', 'Cuantificador', 'Relativo', 'Interrogativo/Exclamativo']
  },
  {
    id: 'enlace',
    label: '④ Palabras de enlace',
    color: '#059669', bg: '#F0FDF4', border: '#86EFAC',
    cats: ['Preposición', 'Conjunción', 'Conector discursivo']
  },
  {
    id: 'marcas',
    label: '⑤ Marcas e interjección',
    color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5',
    cats: ['Marca.Imp.', 'Marca.Pas.Ref.', 'Interjección']
  },
];

// F4 (jul-2026): en N1 los grupos ② y ③ colapsan a un único botón genérico
// (Determinante / Pronombre) — el resto de grupos no fragmentan nada que la
// propuesta pida simplificar, así que se reutilizan tal cual (ver
// mapCategoriaN1_ para la traducción de la respuesta correcta).
const CAT_GROUPS_N1 = CAT_GROUPS.map(g => {
  if (g.id === 'determ') return { ...g, cats: ['Determinante'] };
  if (g.id === 'pronom') return { ...g, cats: ['Pronombre'] };
  return g;
});

function getCatGroupsForNivel(nivel) {
  return nivel === 'aprendiz' ? CAT_GROUPS_N1 : CAT_GROUPS;
}

function renderCatGroups(){
  return getCatGroupsForNivel(MM.nivel).map(g => `
    <div class="casc-group-row" 
      style="display:flex;align-items:center;gap:10px;padding:10px 14px;
        border:2px solid ${g.border};border-radius:12px;background:${g.bg};cursor:pointer;
        transition:all .15s" 
      onclick="selectCatGroup('${g.id}')"
      onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,.1)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      <span style="font-weight:800;color:${g.color};font-size:.85rem;flex:1">${g.label}</span>
      <span style="font-size:.75rem;color:${g.color}50;flex:2">
        ${g.cats.slice(0,3).join(' · ')}${g.cats.length>3?' · …':''}
      </span>
      <span style="color:${g.color};font-size:.9rem">›</span>
    </div>`).join('');
}

function selectCatGroup(groupId){
  const group = getCatGroupsForNivel(MM.nivel).find(g=>g.id===groupId);
  if(!group) return;
  MM.pendingGroup = groupId;
  const subStep = document.getElementById('casc-sub-step');
  if(!subStep) return;

  // Highlight selected group
  document.querySelectorAll('.casc-group-row').forEach(r=>{
    r.style.opacity = r.getAttribute('onclick').includes(`'${groupId}'`) ? '1' : '0.5';
  });

  subStep.style.display = 'block';
  subStep.innerHTML = `
    <div class="cascade-step" style="margin-top:12px">
      <div class="cascade-label"><span>2</span>Elige la categoría exacta</div>
      <div class="cascade-opts" id="casc-cat-opts" style="flex-wrap:wrap;gap:7px">
        ${group.cats.map(cat=>`
          <button type="button" class="casc-btn" id="ccat-${cat.replace(/[^a-z]/gi,'')}"
            onclick="selectCategory('${cat.replace(/'/g,"\'")}','${MM.sentences[MM.idx].tokens[MM.tokenIdx].cat.replace(/'/g,"\'")}')">
            ${cat}
          </button>`).join('')}
      </div>
    </div>`;
}

function getCategoryHint(cat){
  const hints = {
    'Sustantivo':'Designa seres, objetos, ideas o lugares.',
    'Adjetivo':'Expresa cualidades o propiedades del sustantivo.',
    'Artículo':'Presenta o actualiza al sustantivo (el, la, un, una…).',
    'Pronombre personal':'Sustituye al nombre (yo, tú, él, me, te, se…).',
    'Posesivo':'Expresa posesión (mi, tu, su, nuestro…).',
    'Demostrativo':'Señala en el espacio o el tiempo (este, ese, aquel…).',
    'Cuantificador':'Indica cantidad (mucho, poco, tres, ambos…).',
    'Relativo':'Introduce una oración relativa (que, quien, donde…).',
    'Adverbio':'Modifica al verbo, adjetivo u otro adverbio (aquí, bien, muy…).',
    'Verbo':'Expresa acción, estado o proceso.',
    'Preposición':'Palabra invariable que relaciona unidades (a, de, en, por…).',
    'Conjunción':'Une palabras u oraciones (y, pero, porque, aunque…).',
    'Conector discursivo':'Organiza el discurso (sin embargo, por tanto, además…).',
    'Interrogativo/Exclamativo':'Palabra que pregunta o exclama sobre la identidad, cantidad o cualidad (qué, cuál, quién, cuánto).',
    'Interjección':'Forma enunciados exclamativos (¡ay!, ¡hola!, ¡oh!…).',
    'Marca.Imp.':'El "se" impersonal que bloquea la aparición del sujeto gramatical.',
    'Marca.Pas.Ref.':'El "se" de la pasiva refleja que introduce el sujeto paciente.',
  };
  return hints[cat] || 'Identifica la categoría gramatical de esta palabra.';
}

// F6b: atrs del token que se está analizando ahora mismo — lo necesita
// getCascadeForNivel para el dispatch por atrs.función en N3 (determinantes/
// pospuestos/demás pronombres). El propio `token` no siempre está a mano en
// estas funciones (solo cat+nivel), así que se recupera de MM.
function getActiveTokenAtrs_(){
  const sent = MM.sentences && MM.sentences[MM.idx];
  const token = sent && sent.tokens && sent.tokens[MM.tokenIdx];
  return token ? token.atrs : undefined;
}
// F9: atrs correctos EFECTIVOS del token activo (con tipo_det derivado) —
// para saber, al pintar la cascada, qué pasos tiene respuesta en el banco.
function getActiveTokenEffectiveAtrs_(){
  const sent = MM.sentences && MM.sentences[MM.idx];
  const token = sent && sent.tokens && sent.tokens[MM.tokenIdx];
  return token ? getEffectiveCorrectAtrs_(token) : {};
}

function selectCategory(chosen, correct){
  MM.currentCat = chosen;
  MM.currentAtrs = {};
  // Update button visuals in sub-step
  document.querySelectorAll('#casc-cat-opts .casc-btn').forEach(b=>{
    b.classList.toggle('cs-sel', b.textContent.trim()===chosen);
  });
  const levelCascade = getCascadeForNivel(chosen, MM.nivel, getActiveTokenAtrs_());
  if(levelCascade.steps.length === 0){
    // Aprendiz or no cascade: category only — enable confirm immediately
    const btn=document.getElementById('casc-confirm');
    if(btn) btn.disabled = false;
    document.getElementById('casc-attrs-area').innerHTML='';
  } else {
    renderAttrSteps(chosen);
  }
}

function renderAttrSteps(cat){
  const cascade = getCascadeForNivel(cat, MM.nivel, getActiveTokenAtrs_());
  if(!cascade){// C5 autoscroll attrs
    setTimeout(()=>document.getElementById('casc-attrs-area')?.scrollIntoView({behavior:'smooth',block:'nearest'}),120);
    document.getElementById('casc-attrs-area').innerHTML='';return;}
  const area = document.getElementById('casc-attrs-area');
  const correctAtrs = getActiveTokenEffectiveAtrs_(); // F9: para no preguntar rasgos sin respuesta en el banco
  let html='', shown=0;
  cascade.steps.forEach((step)=>{
    // dependsOn check — show if dependency met
    if(step.dependsOn){
      const depVal = MM.currentAtrs[step.dependsOn.step];
      if(depVal !== step.dependsOn.val) return;
    }
    // F9: no preguntar un rasgo que el banco no sabe (terminación/formación
    // en tokens aún sin etiquetar) — se activa solo cuando se rellena.
    if(!morphStepAnswerable_(step, correctAtrs)) return;
    const si = shown++;
    html+=`<div class="cascade-step" id="cstep-${step.id}">
      <div class="cascade-label"><span>${si+2}</span>${step.label}</div>
      <div class="cascade-opts">
        ${step.opts.map(o=>`<button type="button" class="casc-btn" id="csb-${step.id}-${o.val.replace(/[^a-z0-9]/gi,'')}"
          onclick="selectAttr('${step.id.replace(/'/g,"\'")}','${o.val.replace(/'/g,"\'")}')">
          ${o.label}</button>`).join('')}
      </div>
    </div>`;
  });
  area.innerHTML = html;
  checkConfirmReady();
}

function selectAttr(stepId, val){
  MM.currentAtrs[stepId] = val;
  // Update button visuals
  document.querySelectorAll(`[id^="csb-${stepId}-"]`).forEach(b=>{
    b.classList.remove('cs-sel');
  });
  const safeId = `csb-${stepId}-${val.replace(/[^a-z0-9]/gi,'')}`;
  document.getElementById(safeId)?.classList.add('cs-sel');
  // Re-render steps in case dependsOn are now resolved
  const cat = MM.currentCat;
  const activeCascade = getCascadeForNivel(cat, MM.nivel, getActiveTokenAtrs_());
  if(cat && activeCascade.steps.length>0){
    const hasDeps = activeCascade.steps.some(s=>s.dependsOn?.step===stepId);
    if(hasDeps) renderAttrSteps(cat);
    else checkConfirmReady();
  } else {
    checkConfirmReady();
  }
}

function checkConfirmReady(){
  const btn = document.getElementById('casc-confirm');
  if(!btn) return;
  const cat = MM.currentCat;
  if(!cat){btn.disabled=true;return;}
  const cascade = getCascadeForNivel(cat, MM.nivel, getActiveTokenAtrs_());
  if(!cascade||cascade.steps.length===0){btn.disabled=false;return;}
  const correctAtrs = getActiveTokenEffectiveAtrs_();
  // All required steps (those whose dependsOn is met) must have a value.
  // F6a: step.optional (p.ej. aspecto en PAU) nunca bloquea el confirmar —
  // "si dudas, no lo pongas, no penalizará" (doc PAU).
  // F9: los pasos sin respuesta en el banco no se muestran → tampoco se exigen.
  const allMet = cascade.steps.every(step=>{
    if(step.dependsOn){
      const depVal = MM.currentAtrs[step.dependsOn.step];
      if(depVal !== step.dependsOn.val) return true; // not required
    }
    if(step.optional) return true;
    if(!morphStepAnswerable_(step, correctAtrs)) return true; // no preguntado
    return !!MM.currentAtrs[step.id];
  });
  btn.disabled = !allMet;
}

function confirmToken(){
  const sent = MM.sentences[MM.idx];
  const token = sent.tokens[MM.tokenIdx];
  const mode = MM.mode;
  // F4 (jul-2026): en N1 se compara contra la clase genérica traducida
  // (mapCategoriaN1_), no contra la etiqueta fina del banco.
  const displayCat = MM.nivel === 'aprendiz' ? mapCategoriaN1_(token.cat, token.atrs) : token.cat;
  const catCorrect = MM.currentCat === displayCat;

  // Score — F9 (jul-2026): dos cómputos en paralelo.
  //  · RAW (categoría 2 + 1pt/rasgo): diagnóstico del profesor y feedback al
  //    alumno; NO cambia de significado respecto a antes de F9.
  //  · WEIGHTED (categoría frontera 3 + rasgos discriminantes ×2 + curva de
  //    examen): la nota real. Ver getCategoryWeight_/getStepWeight_/examAttrCurve_.
  // Como antes, si la categoría es incorrecta el token vale 0 (la categoría
  // es la puerta): raw = 0/2, weighted = 0/catW.
  const catW = getCategoryWeight_(token.cat, MM.nivel);
  let rawEarned = 0, rawPossible = 2;
  let wEarned = 0, wPossible = catW;
  if(catCorrect){
    rawEarned += 2;
    wEarned += catW;
    if(MM.nivel !== 'aprendiz'){
      // F6b: getEffectiveCorrectAtrs_ añade tipo_det (derivado de la
      // categoría, no es un atributo real del banco) cuando el token es determinante.
      const correctAtrs = getEffectiveCorrectAtrs_(token);
      const cascade = getCascadeForNivel(token.cat, MM.nivel, token.atrs);
      const norm = v => v==='contracción'?'contracta':v;
      let attrPossibleW = 0, attrEarnedW = 0, wrongCount = 0; // rasgos normales (entran en la curva)
      let optEarnedW = 0, optPossibleW = 0;                    // rasgos opcionales (lineales, no penalizan)
      cascade.steps.forEach(step=>{
        if(step.dependsOn){
          // Bug B fix: check what the STUDENT chose, not what's correct
          const depVal = MM.currentAtrs[step.dependsOn.step];
          if(depVal !== step.dependsOn.val) return;
        }
        // F9: rasgo sin respuesta en el banco → ni se pregunta ni se puntúa.
        const correctVal = morphCorrectVal_(step.id, correctAtrs);
        if(correctVal === undefined) return;
        const chosen = MM.currentAtrs[step.id];
        // F6a: step.optional (aspecto en PAU) en blanco no cuenta (ni raw ni ponderado).
        if(step.optional && !chosen) return;
        const isCorrect = chosen && norm(chosen) === norm(correctVal);
        // RAW: 1pt por rasgo aplicable respondido
        rawPossible++;
        if(isCorrect) rawEarned++;
        // WEIGHTED
        const w = getStepWeight_(step.id);
        if(step.optional){
          // "no penaliza": solo suma si acierta, nunca cuenta como fallo ni en la curva
          optPossibleW += w;
          if(isCorrect) optEarnedW += w;
        } else {
          attrPossibleW += w;
          if(isCorrect) attrEarnedW += w; else wrongCount++;
        }
      });
      // Examen: curva dura por palabra sobre el bloque de rasgos normales.
      // Práctica: lineal ponderada. Los opcionales van aparte (lineales).
      const attrScore = (mode === 'exam')
        ? attrPossibleW * examAttrCurve_(wrongCount)
        : attrEarnedW;
      wEarned += attrScore + optEarnedW;
      wPossible += attrPossibleW + optPossibleW;
    }
  }

  MM.totalCorrect += wEarned;
  MM.totalAttempted += wPossible;
  MM.doneTokens++;
  // Track per-category stats — en puntos RAW (diagnóstico sin ponderar)
  const _tcat = token.cat;
  if(!MM.catStats[_tcat]) MM.catStats[_tcat]={correct:0,total:0};
  MM.catStats[_tcat].total += rawPossible;
  MM.catStats[_tcat].correct += rawEarned;
  MM.selections[MM.tokenIdx] = {cat:MM.currentCat, atrs:{...MM.currentAtrs}, earned:wEarned, possible:wPossible, rawEarned, rawPossible};
  // Track global token-level results — "sin error" = todos los rasgos RAW bien
  if(!MM._tokensOk) MM._tokensOk=0;
  if(!MM._tokensErr) MM._tokensErr=0;
  if(rawEarned===rawPossible) MM._tokensOk++; else MM._tokensErr++;
  if(catCorrect) {
    playClick(); // C4B: click suave al confirmar (mismo sonido en examen: no revela nada)
    // Fase 3.1 (jul-2026): en examen, sin pop del token ni flash "¡categoría
    // correcta!" — eso es justo el feedback que "Sin feedback" prometía y
    // que antes se colaba incluso en examen.
    if(mode!=='exam'){
      // Visual feedback: pop the token + toast with category name
      if(MM.tokenIdx !== undefined && MM.tokenIdx !== null && MM.tokenIdx >= 0){
        popElement('mm-tk-' + MM.tokenIdx);
      }
      const allCorrect = (rawEarned === rawPossible);
      showCorrectFlash(allCorrect ? '¡' + displayCat + ' correcta!' : displayCat + ' (con detalles)');
    }
  }

  // Re-render text flow to reflect done/active states
  renderMaestroText();

  // Practice mode: show feedback panel — puntos RAW (lo que el alumno ve
  // como "X de Y rasgos", sin los pesos internos de la nota).
  if(mode==='practice'){
    showTokenFeedback(token, catCorrect, rawEarned, rawPossible, displayCat);
  } else {
    document.getElementById('mm-cascade-wrap').innerHTML='';
  }

  // Check if all tokens done
  const allDone = sent.tokens.every((_,i)=>MM.selections[i]!==undefined);
  if(allDone){
    // Fire progression (XP + mission + combo celebrations) for this text.
    // Errores = huecos RAW (nº de rasgos fallados), no la nota ponderada —
    // el XP/misiones miden esfuerzo, no dureza de examen.
    try{
      const textErrors = Object.values(MM.selections||{}).reduce((a,s)=>a+Math.max(0,(s.rawPossible||0)-(s.rawEarned||0)),0);
      const sentObj = { funciones_presentes: [] }; // morphology has no function tags
      onSentenceCompleted(sentObj, textErrors);
    }catch(e){console.warn('[morph progress]',e);}
    setTimeout(()=>{
      MM.idx++;
      if(MM.idx>=MM.sentences.length) showMaestroResults();
      else renderMaestroSentence();
    }, mode==='practice'?2200:600);
  }
  updateMaestroHeader();
}

// F6b (jul-2026): «respuesta PAU» en una línea — nota (c) del §4 de la
// propuesta. Modela lo que el alumno escribiría en el examen («tu:
// determinante, definido, posesivo, un poseedor, femenino, singular,
// segunda persona»): categoría + valor CORRECTO (no el elegido por el
// alumno) de cada paso aplicable de la cascada, en el orden de la cascada.
// Solo tiene sentido en N3 — se llama solo desde ese nivel.
function buildRespuestaPAU_(token, cascade, correctAtrs){
  const parts = [token.cat.toLowerCase()];
  cascade.steps.forEach(step=>{
    if(step.dependsOn){
      const depVal = correctAtrs[step.dependsOn.step];
      if(depVal !== step.dependsOn.val) return;
    }
    // Un verbo simple no menciona la perífrasis en la respuesta PAU: "verbo,
    // no, primera…" es incorrecto. Solo se nombra si SÍ es perífrasis.
    if(step.id === 'perífrasis' && (correctAtrs[step.id]||'no') === 'no') return;
    const val = correctAtrs[step.id];
    if(val) parts.push(val);
  });
  return parts.join(', ');
}

function showTokenFeedback(token, catCorrect, earned, possible, displayCat){
  displayCat = displayCat || token.cat;
  const pct = possible>0?Math.round(earned/possible*100):0;
  const color = pct>=80?'#059669':pct>=50?'#D97706':'#DC2626';
  const bg    = pct>=80?'#F0FDF4':pct>=50?'#FFFBEB':'#FEF2F2';
  const bdr   = pct>=80?'#A7F3D0':pct>=50?'#FCD34D':'#FCA5A5';
  const cascade = getCascadeForNivel(token.cat, MM.nivel, token.atrs);
  const correctAtrs = getEffectiveCorrectAtrs_(token);
  let attrRows = cascade.steps
    .filter(s=>!s.dependsOn||(MM.currentAtrs[s.dependsOn.step]===s.dependsOn.val))
    // F9: no mostrar rasgos que no se preguntaron (sin respuesta en el banco).
    .filter(s=>morphStepAnswerable_(s, correctAtrs))
    .map(s=>{
      const chosen = MM.currentAtrs[s.id]||'—';
      const correct = morphCorrectVal_(s.id, correctAtrs)||'—';
      const normV = v => v==='contracción'?'contracta':v;
      const ok = normV(chosen)===normV(correct);
      return `<div style="font-size:.8rem;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.05)">
        <strong>${s.label}:</strong>
        <span style="color:${ok?'#059669':'#DC2626'}">${chosen}</span>
        ${ok?'':'<span style="color:var(--muted)"> (correcto: '+correct+')</span>'}
      </div>`;
    }).join('');
  const respuestaPAU = (MM.nivel==='maestro' && catCorrect)
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(0,0,0,.12);font-size:.78rem;color:var(--ink2)">
        📝 <strong>Respuesta PAU:</strong> ${buildRespuestaPAU_(token, cascade, correctAtrs)}
      </div>`
    : '';

  document.getElementById('mm-cascade-wrap').innerHTML=`
    <div class="cascade-panel" style="border-color:${bdr};background:${bg}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:1.6rem">${pct>=80?'✅':pct>=50?'⚠️':'❌'}</span>
        <div>
          <div style="font-weight:800;color:${color};font-size:.95rem">
            ${catCorrect?displayCat:'<s>'+MM.currentCat+'</s> → '+displayCat}
          </div>
          <div style="font-size:.75rem;color:var(--muted)">${earned}/${possible} puntos</div>
        </div>
      </div>
      ${attrRows}
      ${respuestaPAU}
    </div>`;
}

// Fase 3.3 (jul-2026): envío de la nota de examen al profesor. Antes el
// botón "Examen" no enviaba nada a ningún sitio — mismo patrón anti-
// duplicado/reintento que submitResult() en sint/index.js.
let _morfoPendingResult = null;
let _morfoExamSent = false;

async function submitMorfologiaResult(){
  const msg = document.getElementById('mm-exam-msg');
  const retryBtn = document.getElementById('mm-exam-retry');
  if(!msg) return;
  if(_morfoExamSent){
    msg.style.display='block';msg.textContent='✓ Resultado ya enviado.';
    msg.style.background='var(--green-lt)';msg.style.color='#166534';
    return;
  }
  msg.style.display='block';if(retryBtn) retryBtn.style.display='none';
  msg.style.background='var(--blue-lt)';msg.style.borderColor='#93C5FD';msg.style.color='#1D4ED8';
  msg.textContent='⏳ Enviando resultado al profesor…';
  const apiUrl=getApiUrl();
  if(!apiUrl){
    msg.textContent='⚠ Sin URL de API. La nota no se ha enviado al profesor.';
    msg.style.background='var(--red-lt)';msg.style.color='var(--red)';
    return;
  }
  const nota10 = MM.totalAttempted>0?Math.round(MM.totalCorrect/MM.totalAttempted*100)/10:0;
  // Reutiliza la acción/hoja 'saveMorphResult' → Morfologia_Resultados que
  // ya existía en el GAS (infra preparada pero nunca conectada a ningún
  // frontend — ni el maestro actual ni el morph legacy la llamaban).
  _morfoPendingResult = {
    action:'saveMorphResult',
    name:MM.name||'',email:MM.email||'',grupo:MM.grupo||'',
    nivel:MM.nivel||'',modo:MM.mode||'',
    // Fase 3.4: examen con PIN — vacío si el examen no vino por PIN
    pin:MM.examPin||'',evaluacion:MM.examEval||'',examen:MM.examName||'',
    nota:String(nota10||0),
    tokensOk:String(MM._tokensOk||0),tokensErr:String(MM._tokensErr||0),
    tokensTotales:String(MM.doneTokens||0),
    catStats:JSON.stringify(MM.catStats||{}),
    versionCalificacion:VERSION_CALIFICACION_MORFO
  };
  try{
    const params=new URLSearchParams(_morfoPendingResult);
    const r=await fetchWithTimeout(apiUrl+'?'+params.toString(),{},12000);
    const d=await r.json();
    if(d.ok){
      msg.textContent='✓ Resultado enviado correctamente al profesor.';
      msg.style.background='var(--green-lt)';msg.style.borderColor='#86EFAC';msg.style.color='#166534';
      _morfoPendingResult=null;_morfoExamSent=true;
    }else{
      throw new Error(d.error||'Error del servidor');
    }
  }catch(e){
    msg.textContent='⚠ Error de conexión: '+(e.message||'timeout')+'. Inténtalo de nuevo.';
    msg.style.background='var(--red-lt)';msg.style.borderColor='#FCA5A5';msg.style.color='var(--red)';
    if(retryBtn) retryBtn.style.display='inline-flex';
  }
}

function showMaestroResults(){
  const skipBtn=document.getElementById('mm-skip-text');
  if(skipBtn) skipBtn.style.display='none';
  showScreen('screen-maestro');
  const nota10 = MM.totalAttempted>0?Math.round(MM.totalCorrect/MM.totalAttempted*100)/10:0;
  const notaFmt = nota10.toFixed(1);
  const pct = nota10*10;
  const emoji = pct>=80?'🏆':pct>=60?'🎯':'📚';
  const noteColor = pct>=80?'#059669':pct>=60?'#D97706':'#DC2626';
  const noteBg = pct>=80?'#F0FDF4':pct>=60?'#FFFBEB':'#FEF2F2';

  // Per-category stats sorted by error rate (worst first)
  const catRows = Object.entries(MM.catStats)
    .map(([cat,s])=>({cat, pct:s.total>0?Math.round(s.correct/s.total*100):0, ...s}))
    .sort((a,b)=>a.pct-b.pct); // worst first

  const statsHtml = catRows.map(r=>{
    const color=r.pct>=80?'#059669':r.pct>=60?'#D97706':'#DC2626';
    const barW=r.pct+'%';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px">
        <span style="font-weight:700;color:var(--ink)">${r.cat}</span>
        <span style="color:${color};font-weight:800">${r.pct}%</span>
      </div>
      <div style="background:#E5E7EB;border-radius:99px;height:6px;overflow:hidden">
        <div style="height:100%;width:${barW};background:${color};border-radius:99px;transition:width .6s ease"></div>
      </div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:2px">${r.correct}/${r.total} rasgos correctos</div>
    </div>`;
  }).join('');

  // Error count — use global accumulators
  const aciertos = MM._tokensOk||0;
  const errores = MM._tokensErr||0;

  document.getElementById('mm-paper-wrap').innerHTML='';
  document.getElementById('mm-cascade-wrap').innerHTML='';
  const res = document.getElementById('mm-result-wrap');
  res.style.display='block';
  res.innerHTML=`
    <div style="max-width:560px;margin:0 auto;animation:slideUp .4s ease">
      <!-- Score card -->
      <div class="card" style="text-align:center;padding:28px 24px;margin-bottom:16px;background:${noteBg};border-color:${noteColor}40">
        <div style="font-size:2.8rem;margin-bottom:6px">${emoji}</div>
        <h2 style="font-size:1.4rem;font-weight:900;margin-bottom:2px">Análisis morfológico completado</h2>
        <p style="font-size:.85rem;color:var(--muted);margin-bottom:18px">${MM.name}</p>
        <div style="font-size:4rem;font-weight:900;color:${noteColor};line-height:1;margin-bottom:4px">${notaFmt}</div>
        <div style="font-size:.9rem;color:var(--muted);margin-bottom:18px">sobre 10</div>
        <div style="display:flex;justify-content:center;gap:24px;font-size:.85rem">
          <div><span style="font-size:1.4rem;font-weight:900;color:#059669;display:block">${aciertos}</span>tokens sin error</div>
          <div><span style="font-size:1.4rem;font-weight:900;color:#DC2626;display:block">${errores}</span>tokens con error</div>
          <div><span style="font-size:1.4rem;font-weight:900;color:var(--ink);display:block">${MM.doneTokens||0}</span>tokens totales</div>
        </div>
      </div>
      <!-- Stats by category -->
      <div class="card" style="padding:20px 22px;margin-bottom:16px">
        <h3 style="font-size:.88rem;font-weight:900;color:var(--ink);margin-bottom:14px;text-transform:uppercase;letter-spacing:.06em">
          📊 Estadísticas por categoría <span style="font-weight:400;color:var(--muted)">(peor → mejor)</span>
        </h3>
        ${statsHtml}
      </div>
      ${MM.mode==='exam' ? `
      <div id="mm-exam-msg" style="display:none;padding:10px 14px;border-radius:10px;border:1.5px solid;font-size:.85rem;font-weight:700;text-align:center;margin-bottom:12px"></div>
      <div style="text-align:center;margin-bottom:12px">
        <button type="button" id="mm-exam-retry" class="btn btn-ghost btn-sm" style="display:none" onclick="submitMorfologiaResult()">🔄 Reintentar envío</button>
      </div>` : ''}
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding-bottom:20px">
        <button type="button" class="btn btn-primary" onclick="goModule('maestro')">Repetir</button>
        <button type="button" class="btn btn-ghost" onclick="goLogin()">← Inicio</button>
      </div>
    </div>`;
  if(MM.mode==='exam'){
    submitMorfologiaResult();
  }
}

// Public API exports + window bindings para inline onclick
export {
  MORPH_CHALLENGES,
  startMorphChallenge, renderChallengeGame, renderChallengeTokens,
  challengeTokenClick, endChallenge, retryChallenge,
  setMorphTipoSilent, setMaestroNivel, setMorphTipo,
  selectChallenge, setMaestroMode,
  getCascadeForNivel, normalizePerifrasTokenAtrs, buildMaestroText,
  startMaestro, skipMaestroText, exitMaestro,
  renderMaestroSentence, renderMaestroText, updateMaestroHeader,
  selectToken, renderCascade, renderCatGroups, selectCatGroup,
  getCategoryHint, selectCategory, renderAttrSteps, selectAttr,
  checkConfirmReady, confirmToken, showTokenFeedback, showMaestroResults,
  submitMorfologiaResult, VERSION_CALIFICACION_MORFO,
  MAESTRO_DEMO, MAESTRO_TEXTS, MORPH_CASCADES, MORPH_CASCADES_ESO34
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startMorphChallenge, retryChallenge, challengeTokenClick, selectChallenge,
    setMorphTipoSilent, setMaestroNivel, setMorphTipo, setMaestroMode,
    startMaestro, skipMaestroText, exitMaestro,
    selectToken, selectCatGroup, selectCategory, selectAttr,
    confirmToken, submitMorfologiaResult
  });
  Object.defineProperty(window, "MC", { get: () => MC, configurable: true });
  Object.defineProperty(window, "MM", { get: () => MM, configurable: true });
}
