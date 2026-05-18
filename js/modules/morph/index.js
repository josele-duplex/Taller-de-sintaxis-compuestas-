/* morph/index.js — Modo morfologia (analisis de palabras)
   Extraido de index.html (Paso 9.3 de la migracion, mayo 2026).
   Combina dos rangos no contiguos del original:
   - Dataset (lineas 5046-5181): CATEGORIAS, MORPH_DATA, getMorphWords.
   - Engine (lineas 5744-5908): MG + 8 funciones (startMorph,
     renderMorphNext, openMorphHint, closeMorphHint, morphAnswer,
     showMorphFeedback, drawRelationLine, endMorph).

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): showScreen, shuffle, playSuccess, playError, escHtml,
   awardXP, trackError. */

// ════════════════════════════════════════════════════════
// MORPHOLOGY DATASET
// ════════════════════════════════════════════════════════
const CATEGORIAS = [
  {id:'sustantivo',  label:'Sustantivo',   emoji:'🧱', color:'#2563EB'},
  {id:'determinante',label:'Determinante', emoji:'🔑', color:'#7C3AED'},
  {id:'adjetivo',    label:'Adjetivo',     emoji:'🎨', color:'#D97706'},
  {id:'pronombre',   label:'Pronombre',    emoji:'👤', color:'#DC2626'},
  {id:'verbo',       label:'Verbo',        emoji:'⚡', color:'#16A34A'},
  {id:'adverbio',    label:'Adverbio',     emoji:'🎯', color:'#0891B2'},
  {id:'preposicion', label:'Preposición',  emoji:'🔗', color:'#BE185D'},
  {id:'conjuncion',  label:'Conjunción',   emoji:'⚖️', color:'#92400E'},
  {id:'interjeccion',label:'Interjección', emoji:'💥', color:'#6D28D9'},
  {id:'conector',    label:'Conector discursivo', emoji:'🔀', color:'#475569'},
  {id:'interrogativo_exclamativo', label:'Interrog./Exclam.', emoji:'❓', color:'#0369A1'},
];

const MORPH_DATA = [
  {id:'t1',titulo:'La mañana en la ciudad',
   texto:'El viejo despertador sonó bastante fuerte hoy. Por la ventana abierta entraba un aire muy gélido que me obligó a cerrar las cortinas rápidamente. ¡Ay!, qué pereza.',
   palabras:[
    {id:'t1_w1',t:'El',cat:'determinante',target:'t1_w3',pista:'Acompaño al sustantivo "despertador". Concuerdo en género y número.',nivel:1,trampa:false},
    {id:'t1_w2',t:'viejo',cat:'adjetivo',target:'t1_w3',pista:'Aporto una cualidad al nombre. Puedo ir delante o detrás de él.',nivel:1,trampa:false},
    {id:'t1_w3',t:'despertador',cat:'sustantivo',target:null,pista:'Soy el núcleo de un sintagma nominal. Designo un objeto real.',nivel:1,trampa:false},
    {id:'t1_w4',t:'sonó',cat:'verbo',target:null,pista:'Indico una acción en el pasado. Soy el núcleo del predicado.',nivel:1,trampa:false},
    {id:'t1_w5',t:'bastante',cat:'adverbio',target:'t1_w6',pista:'Aumento la intensidad de "fuerte". No acompaño a un nombre. Soy invariable.',nivel:1,trampa:false},
    {id:'t1_w6',t:'fuerte',cat:'adverbio',target:'t1_w4',pista:'Aunque tengo forma de adjetivo, aquí no concuerdo con ningún sustantivo. Modifico al verbo "sonó" indicando cómo: soy un adverbio adjetival.',nivel:1,trampa:true},
    {id:'t1_w7',t:'hoy',cat:'adverbio',target:'t1_w4',pista:'Indico el tiempo de la acción. Invariable.',nivel:1,trampa:false},
    {id:'t1_w8',t:'abierta',cat:'adjetivo',target:null,pista:'Indico un estado de la "ventana". Concuerdo en femenino singular.',nivel:1,trampa:false},
    {id:'t1_w9',t:'muy',cat:'adverbio',target:'t1_w10',pista:'Modifico al adjetivo "gélido". Sin género ni número.',nivel:1,trampa:false},
    {id:'t1_w10',t:'gélido',cat:'adjetivo',target:null,pista:'Expreso una cualidad extrema del "aire".',nivel:1,trampa:false},
    {id:'t1_w11',t:'rápidamente',cat:'adverbio',target:null,pista:'Circunstancia de modo del verbo "cerrar". Acabo en -mente.',nivel:1,trampa:false},
    {id:'t1_w12',t:'¡Ay!',cat:'interjeccion',target:null,pista:'Formo por mí solo un enunciado exclamativo. Expreso un sentimiento espontáneo.',nivel:1,trampa:false},
  ]},
  {id:'t2',titulo:'Tarde de cocina',
   texto:'Mi abuela cocina aquellas lentejas con un esmero increíble. Siempre añade poca sal, pero utiliza muchas especias aromáticas. ¡Ojalá! aprenda yo a cocinar así algún día.',
   palabras:[
    {id:'t2_w1',t:'Mi',cat:'determinante',target:null,pista:'Indico pertenencia respecto a "abuela". Soy posesivo.',nivel:1,trampa:false},
    {id:'t2_w2',t:'aquellas',cat:'determinante',target:null,pista:'Sitúo las "lentejas" lejos de quien habla. Demostrativo.',nivel:1,trampa:false},
    {id:'t2_w3',t:'increíble',cat:'adjetivo',target:null,pista:'Modifico a "esmero". Solo tengo una forma para masc. y fem.',nivel:1,trampa:false},
    {id:'t2_w4',t:'poca',cat:'determinante',target:null,pista:'Cantidad imprecisa de "sal". Indefinido femenino.',nivel:1,trampa:false},
    {id:'t2_w5',t:'pero',cat:'conjuncion',target:null,pista:'Uno dos ideas que se contraponen. Coordinante adversativa.',nivel:1,trampa:false},
    {id:'t2_w6',t:'aromáticas',cat:'adjetivo',target:null,pista:'Clasifico las "especias".',nivel:1,trampa:false},
    {id:'t2_w7',t:'¡Ojalá!',cat:'interjeccion',target:null,pista:'Expreso un deseo de forma exclamativa. Invariable.',nivel:1,trampa:false},
    {id:'t2_w8',t:'así',cat:'adverbio',target:null,pista:'Modo de la acción. = "de esta manera".',nivel:1,trampa:false},
    {id:'t2_w9',t:'algún',cat:'determinante',target:null,pista:'Acompaño a "día" de forma vaga. Indefinido.',nivel:1,trampa:false},
  ]},
  {id:'t3',titulo:'Excursión por la sierra',
   texto:'Caminábamos alegremente por el sendero estrecho mientras los pájaros volaban sobre nuestras cabezas. De repente, una tormenta inesperada nos sorprendió y tuvimos que refugiarnos bajo unos pinos gigantes.',
   palabras:[
    {id:'t3_w1',t:'alegremente',cat:'adverbio',target:null,pista:'Explico cómo caminábamos. Modo formado con -mente.',nivel:1,trampa:false},
    {id:'t3_w2',t:'estrecho',cat:'adjetivo',target:null,pista:'Cualidad del sendero.',nivel:1,trampa:false},
    {id:'t3_w3',t:'nuestras',cat:'determinante',target:null,pista:'Las cabezas nos pertenecen. Posesivo.',nivel:1,trampa:false},
    {id:'t3_w4',t:'nos',cat:'pronombre',target:null,pista:'Sustituyo a "nosotros". Objeto de sorprender. Pronombre personal.',nivel:2,trampa:false},
    {id:'t3_w5',t:'bajo',cat:'preposicion',target:null,pista:'Relaciono "unos pinos" con el lugar de la acción. Preposición de lugar.',nivel:2,trampa:true},
    {id:'t3_w6',t:'inesperada',cat:'adjetivo',target:null,pista:'Característica de la tormenta.',nivel:1,trampa:false},
    {id:'t3_w7',t:'gigantes',cat:'adjetivo',target:null,pista:'Tamaño de los pinos.',nivel:1,trampa:false},
  ]},
  {id:'t4',titulo:'Tecnología y futuro',
   texto:'Las nuevas inteligencias artificiales procesan demasiados datos en poco tiempo. Algunos científicos prestigiosos advierten sobre los riesgos, aunque otros opinan que estas herramientas nos ayudarán mucho.',
   palabras:[
    {id:'t4_w1',t:'demasiados',cat:'determinante',target:null,pista:'Cuantifico "datos" de forma imprecisa. Indefinido.',nivel:1,trampa:false},
    {id:'t4_w2',t:'Algunos',cat:'determinante',target:null,pista:'Presento a los científicos sin precisar. Indefinido.',nivel:1,trampa:false},
    {id:'t4_w3',t:'prestigiosos',cat:'adjetivo',target:null,pista:'Cualidad de los científicos.',nivel:1,trampa:false},
    {id:'t4_w4',t:'sobre',cat:'preposicion',target:null,pista:'Introduce el tema de la advertencia.',nivel:1,trampa:false},
    {id:'t4_w5',t:'aunque',cat:'conjuncion',target:null,pista:'Concesión a la idea principal. Subordinante concesiva.',nivel:2,trampa:false},
    {id:'t4_w6',t:'otros',cat:'pronombre',target:null,pista:'¡Cuidado! Aquí no acompaño a un nombre, lo sustituyo: = "otros científicos".',nivel:2,trampa:true},
    {id:'t4_w7',t:'mucho',cat:'adverbio',target:null,pista:'Modifico al verbo "ayudarán". Adverbio de intensidad.',nivel:1,trampa:false},
  ]},
  {id:'t5',titulo:'El partido de fútbol',
   texto:'El delantero corrió veloz hacia la portería contraria. Su disparo fue tremendamente preciso, pero el portero logró despejar el balón con la punta de los dedos. ¡Toma!, gritó la grada.',
   palabras:[
    {id:'t5_w1',t:'veloz',cat:'adjetivo',target:null,pista:'¡Cuidado! Parece adverbio pero concuerda con "el delantero". Adjetivo predicativo (CPvo). Si fuera adverbio diríamos "velozmente".',nivel:2,trampa:true},
    {id:'t5_w2',t:'contraria',cat:'adjetivo',target:null,pista:'Relaciona la portería con el equipo opuesto.',nivel:1,trampa:false},
    {id:'t5_w3',t:'tremendamente',cat:'adverbio',target:null,pista:'Intensifica al adjetivo "preciso". Formado con -mente.',nivel:1,trampa:false},
    {id:'t5_w4',t:'preciso',cat:'adjetivo',target:null,pista:'Cualidad del disparo.',nivel:1,trampa:false},
    {id:'t5_w5',t:'¡Toma!',cat:'interjeccion',target:null,pista:'Expresa alegría o triunfo espontáneo. Enunciado por sí sola.',nivel:1,trampa:false},
  ]},
  {id:'t6',titulo:'Paseo por el museo',
   texto:'En la sala principal colgaban retratos antiguos con marcos de oro. Aquel cuadro especialmente oscuro representaba una batalla histórica donde los soldados parecían cobrar vida ante la mirada atenta.',
   palabras:[
    {id:'t6_w1',t:'principal',cat:'adjetivo',target:null,pista:'Característica de "sala".',nivel:1,trampa:false},
    {id:'t6_w2',t:'antiguos',cat:'adjetivo',target:null,pista:'Cualidad de los retratos.',nivel:1,trampa:false},
    {id:'t6_w3',t:'de',cat:'preposicion',target:null,pista:'Introduce un complemento del nombre: marcos de qué → de oro.',nivel:1,trampa:false},
    {id:'t6_w4',t:'Aquel',cat:'determinante',target:null,pista:'Demostrativo de lejanía. Acompaña a "cuadro".',nivel:1,trampa:false},
    {id:'t6_w5',t:'especialmente',cat:'adverbio',target:null,pista:'Matiza al adjetivo "oscuro".',nivel:1,trampa:false},
    {id:'t6_w6',t:'histórica',cat:'adjetivo',target:null,pista:'Adjetivo relacional. Clasifica el tipo de batalla.',nivel:2,trampa:false},
    {id:'t6_w7',t:'ante',cat:'preposicion',target:null,pista:'"Delante de" o "frente a". Introduce un SP de lugar.',nivel:1,trampa:false},
    {id:'t6_w8',t:'atenta',cat:'adjetivo',target:null,pista:'Cualidad de la mirada.',nivel:1,trampa:false},
  ]},
  {id:'t7',titulo:'Una noche de lectura',
   texto:'Leí tres capítulos de la novela misteriosa antes de apagar la lámpara. La trama es tan compleja que todavía no entiendo quién es el verdadero culpable. Ni yo ni mi hermano pudimos dormir.',
   palabras:[
    {id:'t7_w1',t:'tres',cat:'determinante',target:null,pista:'Cantidad exacta de capítulos. Numeral cardinal.',nivel:1,trampa:false},
    {id:'t7_w2',t:'misteriosa',cat:'adjetivo',target:null,pista:'Calificativo de la novela.',nivel:1,trampa:false},
    {id:'t7_w3',t:'tan',cat:'adverbio',target:null,pista:'Apócope de "tanto". Grado del adjetivo "compleja".',nivel:2,trampa:false},
    {id:'t7_w4',t:'por',cat:'preposicion',target:null,pista:'Introduce la causa de no poder dormir.',nivel:1,trampa:false},
  ]},
  {id:'t8',titulo:'El mercado del barrio',
   texto:'Compramos estas frutas maduras en el puesto de la esquina. La dueña siempre nos atiende amablemente y nos regala alguna pieza extra si llevamos mucha compra. El ambiente allí es bullicioso.',
   palabras:[
    {id:'t8_w1',t:'estas',cat:'determinante',target:null,pista:'Demostrativo de cercanía. Señalo las frutas que están cerca.',nivel:1,trampa:false},
    {id:'t8_w2',t:'amablemente',cat:'adverbio',target:null,pista:'Modo de "atiende". Termina en -mente.',nivel:1,trampa:false},
    {id:'t8_w3',t:'alguna',cat:'determinante',target:null,pista:'Indefinido. Acompaña a "pieza".',nivel:1,trampa:false},
    {id:'t8_w4',t:'extra',cat:'adjetivo',target:null,pista:'Adjetivo invariable. No cambia con género ni número.',nivel:2,trampa:false},
    {id:'t8_w5',t:'siempre',cat:'adverbio',target:null,pista:'Tiempo habitual.',nivel:1,trampa:false},
    {id:'t8_w6',t:'mucha',cat:'determinante',target:null,pista:'Indefinido que concuerda con "compra". Cuantifica.',nivel:2,trampa:false},
  ]},
  {id:'t9',titulo:'Ruinas históricas',
   texto:'Los arqueólogos hallaron vasijas romanas entre los muros derruidos. Fue un descubrimiento extraordinario para el pueblo, porque nadie sospechaba que hubiera un yacimiento tan importante bajo la plaza mayor.',
   palabras:[
    {id:'t9_w1',t:'romanas',cat:'adjetivo',target:null,pista:'Relacional. Indica origen o relación con Roma.',nivel:1,trampa:false},
    {id:'t9_w2',t:'derruidos',cat:'adjetivo',target:null,pista:'Estado de los muros.',nivel:1,trampa:false},
    {id:'t9_w3',t:'porque',cat:'conjuncion',target:null,pista:'Subordinante causal. Introduce la razón.',nivel:1,trampa:false},
    {id:'t9_w4',t:'tan',cat:'adverbio',target:null,pista:'Grado del adjetivo "importante".',nivel:2,trampa:false},
    {id:'t9_w5',t:'bajo',cat:'preposicion',target:null,pista:'Preposición de lugar. Contrasta con Texto 3: aquí va seguido de un SN, no de un nombre adjetivado.',nivel:2,trampa:true},
    {id:'t9_w6',t:'mayor',cat:'adjetivo',target:null,pista:'Comparativo de tamaño o importancia.',nivel:1,trampa:false},
  ]},
  {id:'t10',titulo:'Viaje en tren',
   texto:'Viajar en tren me resulta sumamente relajante. Miro el paisaje verde a través del cristal mientras escucho mi música preferida. ¡Uf!, el trayecto se me hace corto siempre que traigo un buen libro conmigo.',
   palabras:[
    {id:'t10_w1',t:'sumamente',cat:'adverbio',target:null,pista:'Grado de "relajante".',nivel:1,trampa:false},
    {id:'t10_w2',t:'verde',cat:'adjetivo',target:null,pista:'Color del paisaje.',nivel:1,trampa:false},
    {id:'t10_w3',t:'preferida',cat:'adjetivo',target:null,pista:'Calificativo de "música".',nivel:1,trampa:false},
    {id:'t10_w4',t:'¡Uf!',cat:'interjeccion',target:null,pista:'Expresa cansancio o alivio. Enunciado autónomo.',nivel:1,trampa:false},
    {id:'t10_w5',t:'buen',cat:'adjetivo',target:null,pista:'Apócope de "bueno". Precede al sustantivo "libro".',nivel:2,trampa:false},
    {id:'t10_w6',t:'conmigo',cat:'pronombre',target:null,pista:'Pronombre personal con preposición incorporada (con + mí).',nivel:2,trampa:false},
  ]},
];

function getMorphWords(level){
  const all=MORPH_DATA.flatMap(t=>t.palabras.map(w=>({...w,texto_titulo:t.titulo})));
  if(level===3) return all.filter(w=>w.trampa);
  return all.filter(w=>w.nivel<=level);
}


// ──────────────────────────────────────────────────────────────────────
// ENGINE (originalmente venia tras LEADERBOARD y ARCADE ENGINE en el
//        monolito, ahora junto a su dataset)
// ──────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════
// MORPHOLOGY ENGINE
// ════════════════════════════════════════════════════════
let MG={};

function startMorph({name,email,level,morphMode}){
  const words=shuffle(getMorphWords(level));
  MG={name,email,level,morphMode,words,idx:0,correct:0,errors:0,currentWord:null};
  renderMorphNext();
  showScreen('morph');
}

function renderMorphNext(){
  if(MG.idx>=MG.words.length){endMorph();return;}
  MG.currentWord=MG.words[MG.idx];
  document.getElementById('morph-progress-lbl').textContent=`${MG.idx+1}/${MG.words.length}`;
  const lvlBadge=document.getElementById('morph-lvl-badge');
  const lvlMap={1:['ml-1','Nivel 1'],2:['ml-2','Nivel 2'],3:['ml-3','Nivel 3 · Trampa']};
  lvlBadge.className='morph-level-badge '+(lvlMap[MG.level]?.[0]||'ml-1');
  lvlBadge.textContent=lvlMap[MG.level]?.[1]||'Nivel 1';

  const w=MG.currentWord;
  const wrap=document.getElementById('morph-wrap');
  const texto=MG.words.find(x=>x.id===w.id);

  // Find which text this word belongs to
  const sourceTexto=MORPH_DATA.find(t=>t.palabras.some(p=>p.id===w.id));
  const oracionTexto=sourceTexto?sourceTexto.texto:'';
  // Highlight the target word in the sentence
  const palabras=(oracionTexto||'').split(' ').filter(Boolean);
  const markedTexto=palabras.map(p=>{
    if(!p||p==='undefined') return '';
    const clean=p.replace(/[.,!?¡¿]/g,'');
    if(clean===w.t||p===w.t)return`<span class="morph-word mw-target" id="morph-target-word" data-wid="${w.id}" onclick="openMorphHint()">${p}</span>`;
    if(w.target){
      const targetW=MORPH_DATA.flatMap(t=>t.palabras).find(x=>x.id===w.target);
      if(targetW&&clean===targetW.t)return`<span class="morph-word" id="morph-rel-word" style="background:#F0FDF4;border-bottom:2px solid var(--green)">${p}</span>`;
    }
    return p;
  }).join(' ');

  wrap.innerHTML=`
    <div class="inst-card" style="animation:slideUp .3s ease">
      <div class="inst-badge">🔬 Morfología — ${sourceTexto?.titulo||'Texto'}</div>
      <div class="inst-title" style="font-size:1.2rem;margin-bottom:0">Identifica la categoría gramatical de la palabra resaltada</div>
    </div>
    <div class="morph-texto" id="morph-texto">${markedTexto}</div>
    <div style="text-align:center;margin-bottom:12px">
      <button type="button" class="btn btn-primary" onclick="openMorphHint()" style="gap:8px">
        <span>Clasificar "${w.t}"</span>
        ${MG.level>=2&&w.target?'<span style="opacity:.7;font-size:.8rem">· Ver relación</span>':''}
      </button>
    </div>`;
  closeMorphHint();
  // Draw SVG relation line for level 2+
  if(MG.level>=2&&w.target){
    setTimeout(()=>drawRelationLine(w),400);
  }
}

function openMorphHint(){
  const w=MG.currentWord;if(!w)return;
  const hint=document.getElementById('morph-hint');
  document.getElementById('morph-hint-lbl').textContent=MG.level===1?'💡 Pista':'⚡ Clasifica';
  document.getElementById('morph-hint-text').textContent=MG.level>=3?`Clasifica "${w.t}" en su contexto.`:(w.pista||'Determina la categoría gramatical de esta palabra.');
  // Build category buttons (null-guard label)
  const grid=document.getElementById('morph-cat-grid');
  grid.innerHTML=CATEGORIAS.filter(c=>c&&c.id&&c.label).map(c=>`
    <button type="button" class="cat-btn" onclick="morphAnswer('${c.id}')"
      style="border-color:${c.color}20;color:${c.color};font-weight:800">
      ${c.emoji} ${c.label}
    </button>`).join('');
  hint.classList.add('mh-open');
}

function closeMorphHint(){
  document.getElementById('morph-hint')?.classList.remove('mh-open');
  // Clear SVG
  const svg=document.getElementById('morph-svg');
  if(svg)svg.innerHTML='';
}

function morphAnswer(chosen){
  const w=MG.currentWord;if(!w)return;
  playClick(); // C4C: feedback inmediato al pulsar categoría
  const correct=chosen===w.cat;
  if(correct){
    playSuccess();MG.correct++;
    document.getElementById('morph-hint').classList.remove('mh-open');
    document.querySelector('#morph-texto .mw-target')?.classList.replace('mw-target','mw-correct');
    // Show correct cat badge
    const cat=CATEGORIAS.find(c=>c.id===w.cat);
    showMorphFeedback(true,cat?.label||chosen);
    MG.idx++;
    setTimeout(()=>{renderMorphNext();},1200);
  }else{
    playError();MG.errors++;
    if(MG.morphMode==='practice'){
      const catReal=CATEGORIAS.find(c=>c.id===w.cat);
      const catMarc=CATEGORIAS.find(c=>c.id===chosen);
      const realLabel=catReal?.label||w.cat;
      const marcLabel=catMarc?.label||chosen;
      const scaffold=lookupScaffold(marcLabel,realLabel,'morph');
      if(scaffold){
        showFeedback('error','Categoría incorrecta',scaffold.fijo,scaffold.pista);
      }else{
        showMorphFeedback(false,realLabel);
      }
    }
    if(MG.morphMode==='exam'){
      // In exam, just log error and move on after delay
      MG.idx++;
      document.getElementById('morph-hint').classList.remove('mh-open');
      setTimeout(()=>{renderMorphNext();},500);
    }
  }
}

function showMorphFeedback(ok,label){
  const wrap=document.getElementById('morph-wrap');
  const fb=document.createElement('div');
  fb.style.cssText=`position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:12px;font-weight:800;font-size:.95rem;z-index:100;animation:slideUp .25s ease;pointer-events:none;${ok?'background:#DCFCE7;color:#166534;border:1px solid #86EFAC':'background:#FEF2F2;color:#991B1B;border:1px solid #FCA5A5'}`;
  fb.textContent=ok?`✓ ${label}`:`✗ Era: ${label}`;
  document.body.appendChild(fb);
  setTimeout(()=>fb.remove(),1100);
}

function drawRelationLine(w){
  const src=document.getElementById('morph-target-word');
  const tgt=document.getElementById('morph-rel-word');
  if(!src||!tgt)return;
  const svg=document.getElementById('morph-svg');
  svg.innerHTML='';
  const s=src.getBoundingClientRect(),t=tgt.getBoundingClientRect();
  const x1=s.left+s.width/2,y1=s.top+s.height;
  const x2=t.left+t.width/2,y2=t.top+t.height;
  const cy=Math.min(y1,y2)-50;
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',`M ${x1} ${y1} C ${x1} ${cy} ${x2} ${cy} ${x2} ${y2}`);
  path.setAttribute('class','rel-path');
  path.setAttribute('stroke','#7C3AED');
  path.setAttribute('stroke-dasharray','1000');
  path.setAttribute('stroke-dashoffset','1000');
  path.style.animation='drawLine .4s ease forwards';
  svg.appendChild(path);
}

function endMorph(){
  closeMorphHint();
  const total=MG.words.length;
  const pct=Math.round((MG.correct/total)*100);
  const grade=pct>=90?{l:'Sobresaliente',c:'#D97706'}:pct>=70?{l:'Notable',c:'#2563EB'}:pct>=50?{l:'Aprobado',c:'#16A34A'}:{l:'Suspenso',c:'#DC2626'};
  const wrap=document.getElementById('morph-wrap');
  wrap.innerHTML=`
    <div class="card" style="padding:32px;text-align:center;animation:slideUp .4s ease">
      <div style="font-size:3rem;margin-bottom:12px">${pct>=90?'🏆':pct>=70?'⭐':pct>=50?'✓':'📚'}</div>
      <h2 style="font-size:2rem;font-weight:900;color:${grade.c};margin-bottom:6px">${grade.l}</h2>
      <p style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${MG.correct}/${total} palabras correctas</p>
      <p style="color:var(--muted);font-size:.9rem;margin-bottom:24px">${MG.errors} error${MG.errors!==1?'es':''} · Nivel ${MG.level}</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button type="button" class="btn btn-primary btn-lg" onclick="startMorph({name:MG.name,email:MG.email,level:MG.level,morphMode:MG.morphMode})">🔄 Repetir</button>
        <button type="button" class="btn btn-ghost" onclick="goLogin()">← Inicio</button>
      </div>
    </div>`;
}

// Public API exports + window bindings para inline onclick
export {
  CATEGORIAS, MORPH_DATA, getMorphWords,
  startMorph, renderMorphNext, openMorphHint, closeMorphHint,
  morphAnswer, showMorphFeedback, drawRelationLine, endMorph
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    getMorphWords,
    startMorph, renderMorphNext, openMorphHint, closeMorphHint,
    morphAnswer, showMorphFeedback, drawRelationLine, endMorph
  });
  // MG es estado del modulo; lo exponemos para onclick="...MG.name..."
  Object.defineProperty(window, "MG", { get: () => MG, configurable: true });
}
