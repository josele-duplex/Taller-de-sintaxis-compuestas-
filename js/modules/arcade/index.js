/* arcade/index.js — Modo arcade rapido (timer + survival)
   Extraido de index.html (Paso 9.2 de la migracion, mayo 2026)
   Lineas originales: 5182-5742 (LEADERBOARD + ARCADE ENGINE).

   Contiene 21 funciones (getLB, saveLB, startArcade, restartArcade,
   showArcadeCountdown, startArcadeMusic, stopArcadeMusic, renderArcade,
   arcComboMultiplier, arcadeAnswer, arcadeNext, updateArcadeTopbar,
   endArcade, renderArcadeLocalFallback, renderArcadeRanking,
   animateHeartLoss, animateHeartGain, updateHeartsBar, showComboBurst,
   showArcadeHint, showScoreFloat) y estado privado (ARC, _arcMusicNodes).

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): showScreen, delay, getApiUrl, fetchWithTimeout, getMock,
   normalizeOracion, shuffle, _tone, _audioCtx, _soundOn, escHtml,
   funcTagCss, tagContent, playSuccess, playError, playClick,
   awardXP, trackError. */

// ════════════════════════════════════════════════════════
// LEADERBOARD (localStorage)
// ════════════════════════════════════════════════════════
const LS_LB_SRV='taller_lb_survival';
const LS_LB_TMR='taller_lb_timer';
const LS_GHOST_SRV='taller_ghost_survival';
const LS_GHOST_TMR='taller_ghost_timer';

function getLB(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}}
function saveLB(key,entry){
  const lb=getLB(key);
  lb.push({...entry,date:new Date().toLocaleDateString('es-ES')});
  lb.sort((a,b)=>b.score-a.score);
  localStorage.setItem(key,JSON.stringify(lb.slice(0,10)));
  return lb.slice(0,10);
}

// ════════════════════════════════════════════════════════
// GHOST MODE — récord propio (localStorage, sin backend)
// ════════════════════════════════════════════════════════
function getGhost(mode){
  try{return JSON.parse(localStorage.getItem(mode==='survival'?LS_GHOST_SRV:LS_GHOST_TMR)||'null');}
  catch{return null;}
}
function saveGhost(mode,data){
  localStorage.setItem(mode==='survival'?LS_GHOST_SRV:LS_GHOST_TMR,JSON.stringify(data));
}

function updateGhostBar(){
  const el=document.getElementById('arc-ghost-bar');
  if(!el||!ARC.ghost) return;
  // Número de preguntas respondidas (idx ya fue incrementado por arcadeNext)
  const q=Math.min(ARC.questionsAnswered, ARC.ghost.totalQuestions);
  const expected=Math.round(ARC.ghost.avgScorePerQ * q);
  const delta=ARC.score - expected;
  const wasAhead=ARC.ghostAhead||false;
  const nowAhead=delta>=0;
  const their=document.getElementById('arc-ghost-their');
  const mine=document.getElementById('arc-ghost-mine');
  const dEl=document.getElementById('arc-ghost-delta');
  if(their) their.textContent=expected+' pts';
  if(mine) mine.textContent=ARC.score+' pts';
  if(dEl){
    dEl.textContent=(delta>0?'+':'')+delta;
    if(nowAhead){
      dEl.style.background='rgba(34,197,94,.25)';dEl.style.color='#86EFAC';
    } else if(delta<0){
      dEl.style.background='rgba(239,68,68,.25)';dEl.style.color='#FCA5A5';
    } else {
      dEl.style.background='rgba(255,255,255,.1)';dEl.style.color='rgba(255,255,255,.7)';
    }
  }
  if(!wasAhead&&nowAhead&&ARC.questionsAnswered>3) showComboBurst(1,'👻 ¡FANTASMA SUPERADO!');
  ARC.ghostAhead=nowAhead;
}

// ════════════════════════════════════════════════════════
// ARCADE ENGINE
// ════════════════════════════════════════════════════════
let ARC={};

async function startArcade({name,email,nickname,grupo,arcadeMode}){
  document.getElementById('loading-txt').textContent='Cargando oraciones…';
  showScreen('loading');
  await delay(150);

  const apiUrl=getApiUrl();
  let oraciones;
  if(!apiUrl){oraciones=getMock().map(normalizeOracion).filter(Boolean);}
  else{
    try{
      const r=await fetchWithTimeout(`${apiUrl}?action=getOraciones&mode=practice`,{},8000);
      const d=await r.json();
      oraciones=Array.isArray(d.oraciones)&&d.oraciones.length?d.oraciones.map(normalizeOracion).filter(Boolean):getMock().map(normalizeOracion).filter(Boolean);
    }catch{oraciones=getMock().map(normalizeOracion).filter(Boolean);}
  }
  oraciones=shuffle(oraciones);

  const _ghost=getGhost(arcadeMode);
  ARC={
    name,email,nickname,grupo:grupo||'',arcadeMode,
    oraciones,idx:0,
    score:0,streak:0,highStreak:0,
    // Survival mechanics: 3 hearts + scaffolding hint
    lives: 3, maxLives: 3, livesGained: 0, livesLost: 0,
    // Sprint 2: escudos temporales (absorben un error grave)
    shields: 0, maxShields: 2, shieldsGained: 0, shieldsConsumed: 0,
    pendingHint: null, // queued micro-hint to show before next sentence
    // Sprint 2: medallas requieren contar aciertos y errores totales
    correctAnswers: 0, wrongAnswers: 0,
    // Timer mode: elastic time + frenesí
    timerMax:60,timerLeft:60,timerInterval:null,
    lastAnswerAt: 0, // ms timestamp of question shown
    questionShownAt: 0,
    frenzy: false,
    alive:true,done:false,
    // Ghost mode: récord propio
    ghost: _ghost||null, ghostAhead: false, questionsAnswered: 0,
    startOpts:{name,email,nickname,grupo,arcadeMode}
  };

  // Show countdown BEFORE game starts
  showScreen('arcade');

  // Ghost bar: crear o reutilizar, mostrar solo si hay récord previo
  {
    let gb=document.getElementById('arc-ghost-bar');
    if(!gb){
      gb=document.createElement('div');
      gb.id='arc-ghost-bar';
      gb.style.cssText='display:none;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.08);padding:5px 16px;font-size:.78rem;color:rgba(255,255,255,.85);font-weight:700;font-family:\'DM Sans\',sans-serif;letter-spacing:.02em';
      gb.innerHTML='<span style="color:rgba(255,255,255,.5)">👻 Tu récord</span>'
        +'<span id="arc-ghost-their" style="color:#C4B5FD;font-family:monospace">— pts</span>'
        +'<span style="color:rgba(255,255,255,.3)">·</span>'
        +'<span style="color:rgba(255,255,255,.5)">tú</span>'
        +'<span id="arc-ghost-mine" style="color:#FCD34D;font-family:monospace">0 pts</span>'
        +'<span id="arc-ghost-delta" style="min-width:44px;text-align:center;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.7)">±0</span>';
      const aw=document.getElementById('arc-wrap');
      if(aw) aw.parentElement.insertBefore(gb,aw);
    }
    gb.style.display=ARC.ghost?'flex':'none';
  }

  renderArcade();
  await showArcadeCountdown();

  // Start background music (loops until game ends)
  startArcadeMusic();

  if(arcadeMode==='timer'){
    ARC.timerInterval=setInterval(()=>{
      if(!ARC.alive)return;
      ARC.timerLeft=Math.max(0,ARC.timerLeft-1);
      updateArcadeTopbar();
      if(ARC.timerLeft<=0){clearInterval(ARC.timerInterval);endArcade();}
    },1000);
  }
}

// ═══ ARCADE COUNTDOWN (3-2-1-¡YA!) ═══
async function showArcadeCountdown(){
  let overlay = document.getElementById('arc-countdown');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'arc-countdown';
    overlay.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at center,rgba(124,58,237,.95) 0%,rgba(30,27,75,.98) 100%);z-index:2000;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:all';
    overlay.innerHTML = '<div id="arc-cd-num" style="font-size:12rem;font-weight:900;color:#fff;text-shadow:0 0 40px rgba(252,211,77,.8),0 0 80px rgba(236,72,153,.5);font-family:\'Fraunces\',serif;line-height:1"></div><div id="arc-cd-sub" style="font-size:1.2rem;color:rgba(255,255,255,.8);margin-top:20px;letter-spacing:.3em;font-weight:700;text-transform:uppercase"></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  const num = document.getElementById('arc-cd-num');
  const sub = document.getElementById('arc-cd-sub');
  sub.textContent = ARC.arcadeMode==='survival' ? '🔥 Un error = Game Over' : '⏱ Contra el reloj';
  for(const n of ['3','2','1','¡YA!']){
    num.textContent = n;
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = 'arcCdPulse .8s ease-out';
    if(typeof playTone==='function') playTone(n==='¡YA!'?880:440+(3-parseInt(n)||0)*100, .15, 'sine', .2);
    await delay(n==='¡YA!'?600:800);
  }
  overlay.style.display = 'none';
}

// ═══ ARCADE MUSIC (synthwave loop using Web Audio API, no files) ═══
let _arcMusicNodes = null;
function startArcadeMusic(){
  if(!isSoundOn() || _arcMusicNodes) return;
  try{
    const ctx = window.AudioContext ? new AudioContext() : null;
    if(!ctx) return;
    // Bass pattern (repeating arpeggio)
    const bassNotes = [110, 110, 82.4, 98, 110, 110, 146.8, 123.5]; // A2 A2 E2 G2 A2 A2 D3 B2
    let idx = 0;
    const master = ctx.createGain();
    master.gain.value = 0.04;
    master.connect(ctx.destination);
    const bassInterval = setInterval(()=>{
      if(!_arcMusicNodes) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = bassNotes[idx % bassNotes.length];
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.35, now+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now+0.28);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      osc.connect(filter); filter.connect(g); g.connect(master);
      osc.start(); osc.stop(now+0.3);
      idx++;
    }, 300);
    // Hi-hat pattern
    const hatInterval = setInterval(()=>{
      if(!_arcMusicNodes) return;
      const buf = ctx.createBuffer(1, 0.04*ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.1;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 6000;
      src.connect(hp); hp.connect(g); g.connect(master);
      src.start();
    }, 600);
    _arcMusicNodes = { bassInterval, hatInterval, master, ctx };
  }catch(e){console.warn('[arcMusic]',e);}
}

function stopArcadeMusic(){
  if(!_arcMusicNodes) return;
  try{
    clearInterval(_arcMusicNodes.bassInterval);
    clearInterval(_arcMusicNodes.hatInterval);
    if(_arcMusicNodes.master) _arcMusicNodes.master.disconnect();
  }catch(e){}
  _arcMusicNodes = null;
}

function restartArcade(){startArcade(ARC.startOpts||{});}

function renderArcade(){
  try{
  updateArcadeTopbar();
  const o=ARC.oraciones[ARC.idx%ARC.oraciones.length];
  const wrap=document.getElementById('arc-wrap');
  wrap.innerHTML='';
  ARC.questionShownAt = Date.now();

  // Phase: just phase 1 and phase 3 (functions only), simplified
  // We'll show the sentence and ask the student to classify blocks
  const bloques=(o.fase3?.bloques||[]).filter(b=>!isPreResolved(b.solucion));
  if(bloques.length===0){arcadeNext();return;}

  const bloque=bloques[Math.floor(Math.random()*bloques.length)];
  const words=bloque.indices.map(i=>o.palabras[i]).join(' ');
  const correctLabel=bloque.solucion;
  const isMarca=FUNC_MARCAS.has(correctLabel);
  const correctFunc=isMarca?correctLabel:correctLabel.split(' | ')[1];
  // GRAMMAR RULES ENGINE — centralised (v4.7)
  const correctFunc_final = GrammarRules.applyAll(correctFunc, words);
  const allFuncs = [...FUNC_ARGUMENTOS,...FUNC_ADJUNTOS,...FUNC_MARCAS];
  const traps = shuffle(GrammarRules.filterTraps(allFuncs, correctFunc_final, words)).slice(0,3);
  const options = shuffle([correctFunc_final,...traps]);

  wrap.innerHTML=`
    <div class="inst-card" style="animation:slideUp .3s ease;max-width:680px;width:100%;margin:0 auto">
      <div class="inst-badge">⚡ ¿Qué función tiene este bloque?</div>
      <div style="font-family:'Lora',serif;font-size:2rem;font-weight:700;margin:12px 0 8px;
        color:#111;background:#F8F4FF;padding:10px 18px;border-radius:10px;
        border-left:5px solid var(--blue);letter-spacing:-.01em">"${words}"</div>
      <div style="font-size:.95rem;font-weight:600;color:#374151;line-height:1.7;
        font-family:'Lora',serif;padding:8px 4px;border-top:1px solid var(--border);margin-top:4px">${o.palabras.join(' ')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:500px;margin:0 auto">
      ${options.map(f=>`
        <button type="button" class="pvpn-card" onclick="arcadeAnswer('${f}','${correctFunc_final}','${(bloque.consejo||'Analiza la función sintáctica de este bloque.').replace(/'/g,"\\&#39;").replace(/"/g,'&quot;')}')" style="padding:16px 12px">
          <div class="pvpn-title">${f}</div>
        </button>`).join('')}
    </div>`;
  }catch(e){
    console.error('[renderArcade]',e);
    document.getElementById('arc-wrap').innerHTML=errorCard('Error en Arcade',e.message);
  }
}

// Returns the multiplier for current streak (combo system)
function arcComboMultiplier(){
  if(ARC.streak >= 10) return 5;
  if(ARC.streak >= 5)  return 3;
  if(ARC.streak >= 3)  return 2;
  return 1;
}

function arcadeAnswer(chosen,correct,consejo){
  if(!ARC.alive)return;
  ARC.questionsAnswered++;
  const now = Date.now();
  const responseTime = ARC.questionShownAt > 0 ? (now - ARC.questionShownAt)/1000 : 99;

  // Sprint 2: gravedad del error según el peso pedagógico de la función.
  // Funciones argumentales (CD/CI/Atr./CPvo/C.Rég./C.Ag./Sujeto) son graves;
  // CCs y marcas son leves. Si getFuncWeight no está expuesto (sint aún sin
  // cargar), se asume grave para no perder el efecto disuasorio.
  const fw = (typeof window!=='undefined' && typeof window.getFuncWeight==='function')
    ? window.getFuncWeight(correct) : 1.5;
  const errorGrave = fw >= 1.5;

  if(chosen===correct){
    // ── CORRECT ─────────────────────────────────────────
    playSuccess();
    ARC.streak++;
    ARC.correctAnswers++;
    if(ARC.streak>ARC.highStreak)ARC.highStreak=ARC.streak;
    const mult = arcComboMultiplier();

    if(ARC.arcadeMode==='timer'){
      // Elastic time: +2s if fast, +1s otherwise
      const bonus = responseTime < 5 ? 2 : 1;
      ARC.timerLeft = Math.min(ARC.timerMax + 60, ARC.timerLeft + bonus);
      const pts = 10 * mult;
      ARC.score += pts;
      showScoreFloat('+' + bonus + 's', true);
      if(mult > 1) showScoreFloat('+' + pts + ' ×' + mult, true, 60);
      // Frenesí: activate when 3+ fast answers in a row
      const wasFrenzy = ARC.frenzy;
      ARC.frenzy = (ARC.streak >= 3 && responseTime < 5);
      if(ARC.frenzy && !wasFrenzy) showComboBurst(mult, 'FRENESÍ');
      else if(mult > 1 && ARC.streak === 3) showComboBurst(mult, 'COMBO');
      else if(mult > 1 && (ARC.streak === 5 || ARC.streak === 10)) showComboBurst(mult, 'COMBO');
    } else {
      // Survival: combo points, escudos + vida bonus
      const pts = 10 * mult;
      ARC.score += pts;
      showScoreFloat('+' + pts + (mult>1?' ×'+mult:''), true);
      if(mult > 1 && (ARC.streak === 3 || ARC.streak === 5 || ARC.streak === 10))
        showComboBurst(mult, 'COMBO');
      // Sprint 2: cada 5 streak → +1 escudo (si hay sitio) o +1 vida.
      // Cada 10 streak → +1 vida adicional (bonus precisión).
      if(ARC.streak > 0 && ARC.streak % 5 === 0){
        if(ARC.shields < ARC.maxShields){
          ARC.shields++; ARC.shieldsGained++;
          showComboBurst(1, '🛡 +1 ESCUDO');
        } else if(ARC.lives < ARC.maxLives){
          ARC.lives++; ARC.livesGained++;
          animateHeartGain();
          showComboBurst(1, '+1 VIDA');
        }
      }
      if(ARC.streak > 0 && ARC.streak % 10 === 0 && ARC.lives < ARC.maxLives){
        ARC.lives++; ARC.livesGained++;
        animateHeartGain();
        showComboBurst(1, '⭐ PRECISIÓN +1 VIDA');
      }
    }
    arcadeNext();

  } else {
    // ── WRONG ───────────────────────────────────────────
    playError();
    ARC.streak = 0;
    ARC.frenzy = false;
    ARC.wrongAnswers++;

    if(ARC.arcadeMode==='survival'){
      if(!errorGrave){
        // Sprint 2: error leve (CC, marcas…). No quita vida ni escudo.
        // Combo ya está roto. Solo aviso visual + micro-pista breve.
        showScoreFloat('— sin daño', false);
        showArcadeHint(consejo, correct);
        setTimeout(()=>{ if(ARC.alive) arcadeNext(); }, 2200);
        return;
      }
      // Error grave: si hay escudo, lo consume. Si no, pierde vida.
      if(ARC.shields > 0){
        ARC.shields--; ARC.shieldsConsumed++;
        showComboBurst(1, '🛡 ESCUDO ABSORBE');
        showArcadeHint(consejo, correct);
        setTimeout(()=>{ if(ARC.alive) arcadeNext(); }, 2700);
        return;
      }
      ARC.lives--; ARC.livesLost++;
      animateHeartLoss();
      if(ARC.lives <= 0){
        // Game Over
        ARC.alive=false; setTimeout(endArcade, 600); return;
      } else {
        // Scaffolding: show micro-hint, then continue
        showArcadeHint(consejo, correct);
        ARC.pendingHint = null; // hint already shown
        setTimeout(()=>{ if(ARC.alive) arcadeNext(); }, 2700);
        return;
      }
    } else {
      // Timer mode: penalización escalada por gravedad.
      const penalty = errorGrave ? 3 : 1;
      ARC.timerLeft = Math.max(0, ARC.timerLeft - penalty);
      showScoreFloat('-' + penalty + 's', false);
      arcadeNext();
    }
  }
}

// Visual: shake + shatter the rightmost heart
function animateHeartLoss(){
  const cont = document.getElementById('arc-hearts');
  if(!cont) return;
  // Find a non-lost heart from the right
  const all = [...cont.querySelectorAll('.arc-heart:not(.lost)')];
  const last = all[all.length-1];
  if(last) last.classList.add('lost');
  setTimeout(updateHeartsBar, 600);
}

// Visual: pop in a new heart from the left
function animateHeartGain(){
  setTimeout(()=>{
    updateHeartsBar();
    const cont = document.getElementById('arc-hearts');
    if(!cont) return;
    const last = cont.querySelector('.arc-heart:last-child');
    if(last) last.classList.add('gained');
  }, 50);
}

function updateHeartsBar(){
  const cont = document.getElementById('arc-hearts');
  if(!cont) return;
  cont.innerHTML = '';
  for(let i=0; i<ARC.lives; i++){
    const svg = '<svg class="arc-heart" viewBox="0 0 24 24" fill="#EF4444" stroke="#DC2626" stroke-width="1.5"><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 4 7 4c2 0 3.5 1 5 2.5C13.5 5 15 4 17 4c4 0 6.5 4.5 4.5 8.5C19 16.65 12 21 12 21z"/></svg>';
    cont.insertAdjacentHTML('beforeend', svg);
  }
}

// Big animated burst: "×3 COMBO" or "FRENESÍ"
function showComboBurst(mult, label){
  let el = document.getElementById('arc-combo-burst');
  if(!el){
    el = document.createElement('div');
    el.id = 'arc-combo-burst';
    el.className = 'arc-combo';
    document.body.appendChild(el);
  }
  el.innerHTML = '<span class="combo-mult">' + (mult>1?'×'+mult+' ':'') + label + '</span>';
  el.classList.remove('show');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('show');
}

// Micropista (scaffolding) toast
function showArcadeHint(consejo, correctFunc){
  let el = document.getElementById('arc-hint-toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'arc-hint-toast';
    el.className = 'arc-hint-toast';
    document.body.appendChild(el);
  }
  const text = (consejo && consejo.length > 8) ? consejo : 'La respuesta correcta era: ' + correctFunc;
  el.innerHTML = '<div class="ht-label">💡 PISTA</div><div class="ht-text">' + text + '</div>';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function arcadeNext(){
  ARC.idx++;
  if(ARC.idx>=ARC.oraciones.length){ARC.oraciones=shuffle([...ARC.oraciones]);ARC.idx=0;}
  updateGhostBar();
  setTimeout(renderArcade,400);
}

function showScoreFloat(txt, positive, yOffset){
  const el=document.createElement('div');
  el.className='score-float '+(positive?'sf-pos':'sf-neg');
  el.textContent=txt;
  const top = (window.innerHeight*0.3) + (yOffset||0);
  el.style.cssText='left:'+(window.innerWidth/2-30)+'px;top:'+top+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),900);
}

function updateArcadeTopbar(){
  const isTimer=ARC.arcadeMode==='timer';
  document.getElementById('arc-title').textContent=isTimer?'⏱ Contrarreloj':'🔥 Supervivencia';

  // Hearts: only in survival
  const hearts = document.getElementById('arc-hearts');
  if(hearts){
    if(!isTimer){
      hearts.style.display = 'flex';
      // Initial render or re-sync
      if(hearts.children.length !== ARC.lives) updateHeartsBar();
    } else {
      hearts.style.display = 'none';
    }
  }

  // Sprint 2: escudos (solo Supervivencia). Inyecta el contenedor si no existe.
  let shieldsCont = document.getElementById('arc-shields');
  if(!isTimer){
    if(!shieldsCont && hearts && hearts.parentElement){
      shieldsCont = document.createElement('div');
      shieldsCont.id = 'arc-shields';
      shieldsCont.style.cssText = 'display:flex;align-items:center;gap:3px;margin-left:8px;font-size:1.1rem';
      hearts.parentElement.insertBefore(shieldsCont, hearts.nextSibling);
    }
    if(shieldsCont){
      shieldsCont.style.display = ARC.shields > 0 ? 'flex' : 'none';
      shieldsCont.innerHTML = ARC.shields > 0
        ? Array.from({length: ARC.shields}).map(()=>'<span title="Escudo: absorbe un error grave">🛡</span>').join('')
        : '';
    }
  } else if(shieldsCont){
    shieldsCont.style.display = 'none';
  }

  // Streak badge: shown only in survival (in timer mode the frenzy state takes over)
  const sb=document.getElementById('arc-streak-badge');
  if(!isTimer){sb.style.display='flex';document.getElementById('arc-streak-num').textContent=ARC.streak;}
  else sb.style.display='none';

  // Combo badge: persistent indicator above topbar when streak ≥ 3
  const combo = document.getElementById('arc-combo-badge');
  const mult = arcComboMultiplier();
  if(combo){
    if(mult > 1){
      combo.classList.add('active');
      document.getElementById('arc-combo-mult').textContent = mult;
    } else {
      combo.classList.remove('active');
    }
  }

  // Timer bar
  const tw=document.getElementById('arc-timer-wrap');
  const clk=document.getElementById('arc-clock');
  if(isTimer){
    tw.style.display='block';clk.style.display='block';
    const pct=Math.min(100, ARC.timerLeft/ARC.timerMax*100);
    const fill=document.getElementById('arc-timer-fill');
    fill.style.width=pct+'%';
    fill.classList.toggle('danger', pct<20);
    fill.classList.toggle('critical', ARC.timerLeft <= 10 && ARC.timerLeft > 0);
    const m=Math.floor(ARC.timerLeft/60),s=String(ARC.timerLeft%60).padStart(2,'0');
    clk.textContent=m+':'+s;
  }else{tw.style.display='none';clk.style.display='none';}

  // Frenesí frame: only in timer mode
  const ff = document.getElementById('arc-frenzy-frame');
  if(ff){
    if(isTimer && ARC.frenzy) ff.classList.add('active');
    else ff.classList.remove('active');
  }

  document.getElementById('arc-score-badge').textContent=ARC.score+' pts';
}

async function endArcade(){
  cleanAllTimers();
  // Clear any lingering overlays
  ['arc-combo-burst','arc-hint-toast'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('show');
  });
  const ff = document.getElementById('arc-frenzy-frame');
  if(ff) ff.classList.remove('active');
  stopArcadeMusic();
  playComplete();
  const lbKey=ARC.arcadeMode==='survival'?LS_LB_SRV:LS_LB_TMR;
  const entry={nickname:ARC.nickname,score:ARC.score,streak:ARC.highStreak,name:ARC.name,email:ARC.email,grupo:ARC.grupo||''};
  const lb=saveLB(lbKey,entry);
  const myRank=lb.findIndex(e=>e.nickname===ARC.nickname&&e.score===ARC.score)+1;

  document.getElementById('go-icon').textContent=ARC.arcadeMode==='survival'?'💀':'⏱';
  document.getElementById('go-title').textContent=ARC.arcadeMode==='survival'?'¡Game Over!':'¡Tiempo!';
  let sub;
  if(ARC.arcadeMode==='survival'){
    sub = `Racha máxima: ${ARC.highStreak} aciertos`;
    if(ARC.livesGained > 0) sub += ` · +${ARC.livesGained} vida${ARC.livesGained>1?'s':''} recuperada${ARC.livesGained>1?'s':''}`;
    if(ARC.shieldsGained > 0) sub += ` · ${ARC.shieldsGained}🛡 ganado${ARC.shieldsGained>1?'s':''}`;
    if(ARC.shieldsConsumed > 0) sub += ` · ${ARC.shieldsConsumed}🛡 absorbió${ARC.shieldsConsumed>1?'eron':''}`;
  } else {
    sub = `Racha máxima: ${ARC.highStreak} · Posición #${myRank}`;
  }
  if(_isNewRecord) sub += ' · 👻 ¡Nuevo récord personal!';
  document.getElementById('go-sub').textContent = sub;
  document.getElementById('go-score').textContent=ARC.score;
  document.getElementById('go-score-lbl').textContent='PUNTUACIÓN TOTAL';

  // Ghost mode: guardar récord si es mejor (o si no había ninguno)
  const total = ARC.correctAnswers + ARC.wrongAnswers;
  const _prevGhost = getGhost(ARC.arcadeMode);
  const _isNewRecord = total > 0 && (!_prevGhost || ARC.score > _prevGhost.score);
  if(_isNewRecord){
    saveGhost(ARC.arcadeMode,{
      nickname: ARC.nickname||'Tú',
      score: ARC.score,
      totalQuestions: total,
      precision: ARC.correctAnswers/total,
      avgScorePerQ: ARC.score/total,
      date: new Date().toLocaleDateString('es-ES')
    });
  }

  // Sprint 2: medalla por precisión. Solo si el alumno respondió ≥10 veces
  // (para evitar medallas falsas en partidas muy cortas).
  let medalEl = document.getElementById('go-medal');
  if(!medalEl){
    medalEl = document.createElement('div');
    medalEl.id = 'go-medal';
    medalEl.style.cssText = 'margin:14px auto 4px;text-align:center';
    const scoreEl = document.getElementById('go-score');
    if(scoreEl && scoreEl.parentElement) scoreEl.parentElement.appendChild(medalEl);
  }
  if(total >= 10){
    const pct = ARC.correctAnswers / total;
    let medalla = null;
    if(pct >= 0.95)      medalla = { emoji:'🥇', label:'Oro',    color:'#D97706', bg:'linear-gradient(135deg,#FCD34D,#F59E0B)' };
    else if(pct >= 0.85) medalla = { emoji:'🥈', label:'Plata',  color:'#475569', bg:'linear-gradient(135deg,#E2E8F0,#94A3B8)' };
    else if(pct >= 0.70) medalla = { emoji:'🥉', label:'Bronce', color:'#92400E', bg:'linear-gradient(135deg,#FED7AA,#F59E0B)' };
    if(medalla){
      const pctStr = Math.round(pct*100) + '%';
      medalEl.innerHTML = '<div style="display:inline-flex;align-items:center;gap:12px;padding:10px 18px;background:'+medalla.bg+';border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.15)">'
        + '<span style="font-size:2rem">'+medalla.emoji+'</span>'
        + '<div style="text-align:left">'
        +   '<div style="font-size:.65rem;font-weight:800;color:'+medalla.color+';text-transform:uppercase;letter-spacing:.1em">Medalla</div>'
        +   '<div style="font-size:1.05rem;font-weight:900;color:'+medalla.color+'">'+medalla.label+'</div>'
        + '</div>'
        + '<div style="font-size:.78rem;font-weight:700;color:'+medalla.color+';padding-left:10px;border-left:1.5px solid '+medalla.color+'">'+ARC.correctAnswers+'/'+total+' · '+pctStr+'</div>'
        + '</div>';
      medalEl.style.display = 'block';
    } else {
      medalEl.style.display = 'none';
    }
  } else {
    medalEl.style.display = 'none';
  }

  showScreen('gameover');

  // Send score to GAS + load class/global rankings
  const apiUrl=getApiUrl();
  if(apiUrl && ARC.nickname){
    try{
      // POST saveArcadeScore
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action:'saveArcadeScore', nickname:ARC.nickname, grupo:ARC.grupo||'',
          name:ARC.name||'', email:ARC.email||'', arcadeMode:ARC.arcadeMode,
          score:ARC.score, streak:ARC.highStreak
        })
      });
      // Fetch ranking
      const r = await fetchWithTimeout(apiUrl+'?action=getRankingArcade&arcadeMode='+encodeURIComponent(ARC.arcadeMode)+'&grupo='+encodeURIComponent(ARC.grupo||''), {}, 8000);
      const d = await r.json();
      renderArcadeRanking(d, entry);
    }catch(e){console.warn('[Arcade ranking]',e); renderArcadeLocalFallback(lb, entry);}
  } else {
    renderArcadeLocalFallback(lb, entry);
  }
}

function renderArcadeLocalFallback(lb, entry){
  const wrap=document.getElementById('go-lb-wrap');
  if(lb.length>0){
    wrap.style.display='block';
    document.getElementById('go-lb-body').innerHTML=lb.slice(0,8).map((e,i)=>`
      <tr class="${e.nickname===entry.nickname&&e.score===entry.score?'lb-you':''}">
        <td class="lb-rank">${i+1}</td>
        <td>${e.nickname}</td>
        <td style="font-weight:800;font-family:monospace">${e.score}</td>
      </tr>`).join('');
  }
}

function renderArcadeRanking(data, entry){
  const wrap=document.getElementById('go-lb-wrap');
  if(!wrap) return;
  wrap.style.display='block';
  const global = data.global || [];
  const myGrupoTop = data.myGrupoTop || [];
  const grupoRanking = data.grupoRanking || [];
  const myNick = entry.nickname;
  const myScore = entry.score;
  const myGrupo = entry.grupo;
  const medals = ['🥇','🥈','🥉'];

  // Find my position in global
  const myGlobalIdx = global.findIndex(e=>e.nick===myNick && e.score===myScore);
  const myGrupoIdx = myGrupoTop.findIndex(e=>e.nick===myNick && e.score===myScore);

  let html = '';
  // My class ranking (if user entered grupo)
  if(myGrupo && myGrupoTop.length > 0){
    html += `
      <div style="margin-bottom:16px">
        <div style="font-size:.78rem;font-weight:800;color:#FCD34D;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">🏫 Tu clase (${myGrupo}) ${myGrupoIdx>=0?`· Tú: #${myGrupoIdx+1}`:''}</div>
        <div style="display:grid;gap:4px">${myGrupoTop.slice(0,5).map((e,i)=>{
          const isMe = e.nick===myNick && e.score===myScore;
          const medal = medals[i] || (i+1)+'.';
          return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:${isMe?'rgba(252,211,77,.2)':'rgba(255,255,255,.05)'};border:${isMe?'2px solid #FCD34D':'1px solid rgba(255,255,255,.1)'}">
            <span style="min-width:24px;font-weight:800">${medal}</span>
            <span style="flex:1;color:${isMe?'#FCD34D':'#fff'};font-weight:${isMe?'800':'600'}">${e.nick}${isMe?' (tú)':''}</span>
            <span style="font-family:monospace;font-weight:800;color:#FCD34D">${e.score}</span>
          </div>`;
        }).join('')}</div>
      </div>`;
  }
  // Global top 5
  if(global.length > 0){
    html += `
      <div style="margin-bottom:16px">
        <div style="font-size:.78rem;font-weight:800;color:#A5F3FC;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">🌍 Global ${myGlobalIdx>=0?`· Tú: #${myGlobalIdx+1}`:''}</div>
        <div style="display:grid;gap:4px">${global.slice(0,5).map((e,i)=>{
          const isMe = e.nick===myNick && e.score===myScore;
          const medal = medals[i] || (i+1)+'.';
          return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:${isMe?'rgba(165,243,252,.2)':'rgba(255,255,255,.05)'};border:${isMe?'2px solid #A5F3FC':'1px solid rgba(255,255,255,.1)'}">
            <span style="min-width:24px;font-weight:800">${medal}</span>
            <span style="flex:1;color:${isMe?'#A5F3FC':'#fff'};font-weight:${isMe?'800':'600'}">${e.nick}</span>
            <span style="font-size:.7rem;color:rgba(255,255,255,.5);margin-right:6px">${e.grupo||''}</span>
            <span style="font-family:monospace;font-weight:800;color:#A5F3FC">${e.score}</span>
          </div>`;
        }).join('')}</div>
      </div>`;
  }
  // Class ranking (average per class)
  if(grupoRanking.length > 0){
    html += `
      <div>
        <div style="font-size:.78rem;font-weight:800;color:#F9A8D4;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">🏆 Clases (media de puntos)</div>
        <div style="display:grid;gap:4px">${grupoRanking.slice(0,5).map((g,i)=>{
          const isMine = g.grupo===myGrupo;
          const medal = medals[i] || (i+1)+'.';
          return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:${isMine?'rgba(249,168,212,.2)':'rgba(255,255,255,.05)'};border:${isMine?'2px solid #F9A8D4':'1px solid rgba(255,255,255,.1)'}">
            <span style="min-width:24px;font-weight:800">${medal}</span>
            <span style="flex:1;color:${isMine?'#F9A8D4':'#fff'};font-weight:${isMine?'800':'600'}">${g.grupo}${isMine?' (la tuya)':''}</span>
            <span style="font-size:.7rem;color:rgba(255,255,255,.5);margin-right:6px">${g.count} jugador${g.count!==1?'es':''}</span>
            <span style="font-family:monospace;font-weight:800;color:#F9A8D4">${g.media}</span>
          </div>`;
        }).join('')}</div>
      </div>`;
  }
  document.getElementById('go-lb-body').innerHTML = '';
  const tbl = document.querySelector('#go-lb-wrap table');
  if(tbl) tbl.style.display='none';
  let custom = document.getElementById('go-lb-custom');
  if(!custom){
    custom = document.createElement('div');
    custom.id = 'go-lb-custom';
    wrap.appendChild(custom);
  }
  custom.innerHTML = html;
}

// Public API exports + window bindings para inline onclick
export {
  getLB, saveLB,
  getGhost, saveGhost, updateGhostBar,
  startArcade, restartArcade, showArcadeCountdown,
  startArcadeMusic, stopArcadeMusic,
  renderArcade, arcComboMultiplier,
  arcadeAnswer, arcadeNext, updateArcadeTopbar, endArcade,
  renderArcadeLocalFallback, renderArcadeRanking,
  animateHeartLoss, animateHeartGain, updateHeartsBar,
  showComboBurst, showArcadeHint, showScoreFloat
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    getLB, saveLB,
    getGhost, saveGhost, updateGhostBar,
    startArcade, restartArcade, showArcadeCountdown,
    startArcadeMusic, stopArcadeMusic,
    renderArcade, arcComboMultiplier,
    arcadeAnswer, arcadeNext, updateArcadeTopbar, endArcade,
    renderArcadeLocalFallback, renderArcadeRanking,
    animateHeartLoss, animateHeartGain, updateHeartsBar,
    showComboBurst, showArcadeHint, showScoreFloat
  });
  // ARC es el estado interno del juego (timer, hearts, score…). Lo exponemos
  // como getter para que el cleanAllTimers de sint pueda hacer
  // `typeof ARC === 'object'` y leer ARC.timerInterval para limpiarlo al
  // navegar. Mismo patrón que MG (morph), MC/MM (maestro), SIN (sintagmas).
  Object.defineProperty(window, "ARC", { get: () => ARC, configurable: true });
}
