/* chispa/index.js — Modo "Chispa": ejercicios relámpago de spot-the-function.
   Nuevo módulo (julio 2026), independiente de Arcade. Mezcla oraciones de
   Simples (fase3.bloques) y de Compuestas (analisis_interno por proposición)
   para que el alumno practique identificar UNA función a la vez, con
   dificultad creciente y aparición aleatoria sin repetir. Sin vidas ni
   cronómetro obligatorio — solo racha y feedback inmediato.

   Dependencias en globales (window.X / bare identifiers desde scripts
   clásicos, patrón ya usado en teacher/index.js): showScreen, getApiUrl,
   fetchWithTimeout, loadOraciones, shuffle, escHtml, playSuccess, playError,
   REFLEXION_BANCO (Fase C, para la explicación tras responder). */

// Pronombres átonos de CD/CI — una ficha de CD o CI de un solo token con
// alguna de estas formas es "pronombre", no sintagma pleno (tema
// PRONOMBRE_CD_CI, más abajo).
// Formas de 3.ª persona (lo/la/los/las/le/les) + las de 1.ª/2.ª persona y
// reflexivo/recíproco (me/te/nos/os/se). "se" es ambiguo en general (puede
// ser marca de pasiva refleja o impersonal), pero aquí no hay riesgo: solo
// se compara contra bloques que el banco YA etiquetó como CD o CI — si
// "se" llegó aquí es porque el propio banco lo tiene como CD/CI genuino
// (p. ej. "se lo dio" → CI), no como marca_pas_ref/marca_imp.
const CHISPA_PRONOMBRES_CD_CI = ['lo', 'la', 'los', 'las', 'le', 'les', 'me', 'te', 'nos', 'os', 'se'];

// Traduce el código interno de Compuestas (analisis_interno.funciones[].tipo)
// a la terminología exacta de Sintaxis, para poder mezclar ambos bancos.
const CHISPA_CP_TO_SINT = {
  sujeto: 'Sujeto', cd: 'CD', ci: 'CI', atributo: 'Atr.', cpvo: 'CPvo',
  c_regimen: 'C.Rég.', c_agente: 'C.Ag.', vocativo: 'Vocat.',
  mod_oracional: 'Mod.Or.', marca_pas_ref: 'Marca.Pas.Ref.', cc: 'CC'
};

// v1: "temas" de ronda (función objetivo) pedidos por Josele. Cada tema
// define qué funciones puede pedir y cuáles son sus parejas confundibles
// (para la dificultad creciente: rondas tardías prefieren señuelos de la
// pareja en vez de una función cualquiera).
const CHISPA_TEMAS = [
  { id: 'CREG',      nombre: 'Complemento de Régimen',       objetivo: ['C.Rég.'],        confundibles: ['CC'] },
  { id: 'ATR_CPVO',  nombre: 'Atributo / Predicativo',        objetivo: ['Atr.', 'CPvo'], confundibles: ['Atr.', 'CPvo'] },
  { id: 'CI',        nombre: 'Complemento Indirecto',         objetivo: ['CI'],           confundibles: ['CD'] },
  // Ampliación (2026-07-01): el error clásico del heurístico "¿quién?"
  // (rechazado por la NGLE del proyecto) — confunde CD con Sujeto cuando
  // el orden de palabras no es el habitual ("Me gustan las novelas").
  { id: 'SUJETO_CD', nombre: 'Sujeto / Complemento Directo',  objetivo: ['Sujeto', 'CD'], confundibles: ['Sujeto', 'CD'] },
  // Reverso de CREG: aquí el objetivo es el CC (cualquier subtipo) y el
  // señuelo confundible es el C.Rég. — misma frontera, sentido contrario.
  { id: 'CC_CREG',   nombre: 'CC / Complemento de Régimen',   objetivo: ['CC'],           confundibles: ['C.Rég.'] },
  // Pedido expresamente por Josele: CD/CI cuando aparecen como pronombre
  // átono (lo/la/los/las/le/les), sin sintagma pleno que analizar — el reto
  // es reconocer la forma pronominal, no leer un sintagma. soloPronombre
  // restringe el OBJETIVO (no los señuelos) a fichas marcadas .pronombre.
  { id: 'PRONOMBRE_CD_CI', nombre: 'CD / CI en forma de pronombre', objetivo: ['CD', 'CI'], confundibles: ['CD', 'CI'], soloPronombre: true }
];

let CHI = {}; // estado de la sesión (se expone como window.CHI más abajo)

// ── Carga de bancos ─────────────────────────────────────────────────────

async function _cargarPoolSimples(apiUrl){
  try{
    const r = await loadOraciones('practice', apiUrl);
    return (r.oraciones || []).filter(o => !r.usingMock);
  }catch(e){ console.warn('[chispa] Simples no disponible:', e); return []; }
}

async function _cargarPoolCompuestas(apiUrl){
  try{
    const r = await fetchWithTimeout(apiUrl + '?action=getOracionesCompuestas&mode=practice', {}, 12000);
    const d = await r.json();
    const arr = Array.isArray(d?.ejercicios) ? d.ejercicios
              : Array.isArray(d?.compuestas) ? d.compuestas
              : Array.isArray(d?.oraciones)  ? d.oraciones
              : Array.isArray(d?.data)       ? d.data
              : Array.isArray(d) ? d : [];
    return arr.filter(ej => ej && typeof ej.texto === 'string' && Array.isArray(ej.tokens) && Array.isArray(ej.proposiciones));
  }catch(e){ console.warn('[chispa] Compuestas no disponible:', e); return []; }
}

// ── Adaptadores: de cada banco a "fichas" {func, texto} ─────────────────

function _fichasDeSimple(o){
  const fichas = [];
  // 'NP' no es una ficha válida (es el verbo). 'vistosIdx' evita SOLO el
  // tramo exacto ya añadido (p.ej. fase3.bloques repite a veces "SN |
  // Sujeto" con los MISMOS índices que ya da fase2 — bug real de la Fase C).
  // OJO: deduplicar por FUNCIÓN (no por posición) estaría mal — el CD/CI
  // con forma de SN/SP a menudo aparece duplicado como pronombre átono en
  // la misma oración ("A mi primo no le gusta…" → CI:"A mi primo" y
  // CI:"le" son dos tramos distintos, ambos legítimos).
  const vistosIdx = new Set();
  if((o.fase2?.sujeto_indices || []).length > 0){
    const idx = o.fase2.sujeto_indices;
    fichas.push({ func: 'Sujeto', texto: idx.map(i => o.palabras[i]).join(' ') });
    vistosIdx.add(idx.join(','));
  }
  (o.fase3?.bloques || []).forEach(b => {
    const f = (b.solucion || '').split(' | ')[1];
    if(!f || f === '—' || f === 'NP') return;
    const idx = b.indices || [];
    const key = idx.join(',');
    if(vistosIdx.has(key)) return;
    const texto = idx.map(i => o.palabras[i]).join(' ');
    if(texto){
      const pronombre = (f === 'CD' || f === 'CI') && idx.length === 1 &&
        CHISPA_PRONOMBRES_CD_CI.includes((o.palabras[idx[0]] || '').toLowerCase());
      fichas.push({ func: f, texto, pronombre });
      vistosIdx.add(key);
    }
  });
  return { oracionTexto: o.oracion_completa, fichas };
}

// Igual que _fichasDeSimple pero para UNA proposición de una oración
// compuesta. oracionTexto es la oración COMPLETA (el alumno la ve entera,
// aunque las fichas solo salen de esa proposición) — es justo lo que
// buscaba Josele: exposición a oraciones largas sin tener que analizarlas
// enteras.
function _fichasDeCompuesta(ej, prop){
  const ai = prop.analisis_interno || {};
  const fichas = [];
  // Dedup por posición exacta, no por función — ver nota en _fichasDeSimple
  // sobre duplicación de clíticos (CD/CI con forma de SN/SP + su pronombre
  // átono duplicado son dos tramos legítimos, no un duplicado a filtrar).
  const vistosIdx = new Set();
  if(ai.sujeto && Array.isArray(ai.sujeto.indices) && ai.sujeto.indices.length > 0){
    const idx = ai.sujeto.indices;
    fichas.push({ func: 'Sujeto', texto: idx.map(i => ej.tokens[i]?.texto || '').join(' ') });
    vistosIdx.add(idx.join(','));
  }
  (ai.funciones || []).forEach(f => {
    const func = CHISPA_CP_TO_SINT[f.tipo] || null;
    if(!func) return;
    const idx = f.indices || [];
    const key = idx.join(',');
    if(vistosIdx.has(key)) return;
    const texto = idx.map(i => ej.tokens[i]?.texto || '').join(' ');
    if(texto){
      const pronombre = (func === 'CD' || func === 'CI') && idx.length === 1 &&
        CHISPA_PRONOMBRES_CD_CI.includes((ej.tokens[idx[0]]?.texto || '').toLowerCase());
      fichas.push({ func, texto, pronombre });
      vistosIdx.add(key);
    }
  });
  return { oracionTexto: ej.texto, fichas };
}

// ── Construcción de rondas ───────────────────────────────────────────────

// 'CC' en una lista de objetivo/confundibles actúa como comodín: cualquier
// subtipo (CC Lugar, CC Tiempo…) cuenta, no solo el genérico "CC" pelado.
function _enLista(func, lista){
  return lista.includes(func) || (lista.includes('CC') && func.startsWith('CC '));
}

// Además de la función, un tema puede exigir `soloPronombre: true` — el
// candidato a objetivo debe ser además un pronombre átono (ver
// CHISPA_PRONOMBRES_CD_CI / tema PRONOMBRE_CD_CI).
function _esObjetivoValido(f, tema){
  return _enLista(f.func, tema.objetivo) && (!tema.soloPronombre || f.pronombre);
}

function _rondasParaTema(tema, poolSimples, poolCompuestas){
  const rondas = [];
  poolSimples.forEach(o => {
    const { oracionTexto, fichas } = _fichasDeSimple(o);
    const objetivo = fichas.find(f => _esObjetivoValido(f, tema));
    if(objetivo && fichas.length >= 2) rondas.push({ tema, oracionTexto, fichas, objetivo });
  });
  poolCompuestas.forEach(ej => {
    (ej.proposiciones || []).forEach(prop => {
      const { oracionTexto, fichas } = _fichasDeCompuesta(ej, prop);
      const objetivo = fichas.find(f => _esObjetivoValido(f, tema));
      if(objetivo && fichas.length >= 2) rondas.push({ tema, oracionTexto, fichas, objetivo });
    });
  });
  return rondas;
}

// ── Ronda "Atributo (semicopulativo) vs CPvo" ────────────────────────────
// Sustituye a la antigua ronda PN/PV (julio 2026, pedido de Josele: era
// demasiado fácil — bastaba reconocer ser/estar). Ahora se muestran DOS
// oraciones: una con Atributo cuyo verbo es SEMICOPULATIVO (ponerse,
// quedarse, mantenerse, encontrarse…) y otra con Complemento Predicativo.
// La pregunta pide al azar una de las dos funciones: sin ser/estar/parecer
// a la vista, el alumno tiene que decidir por la prueba, no por el verbo.
//
// Formas de los COPULATIVOS puros (ser/estar/parecer) que EXCLUYEN una
// oración con Atr. del pool semicopulativo. Lista construida a partir de
// los verbos reales del banco (86 oraciones con Atr. auditadas) + formas
// de refuerzo. Comparación por token exacto salvo parec-/parezc- (prefijo).
const CHISPA_COPULATIVOS = new Set([
  'ser','siendo','sido','soy','eres','es','somos','sois','son',
  'era','eras','éramos','erais','eran','fui','fuiste','fue','fuimos','fuisteis','fueron',
  'seré','serás','será','seremos','seréis','serán','sería','serían',
  'sea','seas','sean','seamos','fuera','fueran','fuese','fuesen',
  'estar','estando','estado','estoy','estás','está','estamos','estáis','están',
  'estaba','estabas','estaban','estábamos','estabais',
  'estuve','estuviste','estuvo','estuvimos','estuvisteis','estuvieron',
  'estaré','estará','estarán','estaría','estarían','esté','estés','estén',
  'estuviera','estuvieran','estuviese','estuviesen'
]);
function _esCopulativo(palabra){
  const w = (palabra||'').toLowerCase();
  return CHISPA_COPULATIVOS.has(w) || w.startsWith('parec') || w.startsWith('parezc');
}

// Solo simples: los pools se construyen una vez al cargar los bancos
// (reutilizados por el selector de temas para la cobertura y por la cola).
function _calcularPoolsAtrCpvo(){
  CHI.atrSemiPool = []; // oraciones con Atr. y verbo semicopulativo
  CHI.cpvoPool = [];    // oraciones con CPvo (y sin Atr., para no ambiguar)
  const vistos = new Set();
  CHI.poolSimples.forEach(o => {
    if(vistos.has(o.oracion_completa)) return;
    vistos.add(o.oracion_completa);
    const funcs = (o.fase3?.bloques||[]).map(b=>(b.solucion||'').split(' | ')[1]);
    const tieneAtr = funcs.includes('Atr.');
    const tieneCpvo = funcs.includes('CPvo');
    if(tieneAtr && !tieneCpvo){
      const npEsCopulativo = (o.fase1?.nucleo_predicado_indices||[])
        .some(i => _esCopulativo(o.palabras[i]));
      if(!npEsCopulativo) CHI.atrSemiPool.push(o.oracion_completa);
    } else if(tieneCpvo && !tieneAtr){
      CHI.cpvoPool.push(o.oracion_completa);
    }
  });
}

function _atrCpvoJugable(){
  return CHI.atrSemiPool.length > 0 && CHI.cpvoPool.length > 0;
}

// Cola de la sesión. `temaId` filtra: undefined/'MIX' = todos los temas +
// rondas atr/cpvo mezclados (comportamiento original); 'ATRCPVO_SENT' =
// solo esa ronda; el id de un tema concreto = solo rondas "spot" de él.
function _construirCola(temaId){
  const rondas = [];
  const mezcla = !temaId || temaId === 'MIX';
  if(mezcla || temaId !== 'ATRCPVO_SENT'){
    CHISPA_TEMAS.forEach(tema => {
      if(!mezcla && tema.id !== temaId) return;
      _rondasParaTema(tema, CHI.poolSimples, CHI.poolCompuestas).forEach(r => rondas.push({ tipo: 'spot', ...r }));
    });
  }
  if((mezcla || temaId === 'ATRCPVO_SENT') && _atrCpvoJugable()){
    // Cada ronda escoge pareja al azar en el momento de renderizar, así que
    // el nº de rondas encoladas es solo un cupo, no una lista fija.
    const nRondas = Math.min(CHI.atrSemiPool.length * 2, 8);
    for(let i = 0; i < nRondas; i++) rondas.push({ tipo: 'atrcpvo' });
  }
  return shuffle(rondas);
}

// Señuelos: en rondas fáciles, preferir funciones "claramente distintas";
// en rondas difíciles, preferir la pareja confundible del tema.
function _elegirDecoys(fichas, objetivo, tema, nDecoys, dificil){
  const candidatos = fichas.filter(f => {
    if(f === objetivo) return false;
    // Dos fichas con la MISMA función (p.ej. duplicación de clíticos: CI
    // "A mi primo" + CI "le") solo se permiten como señuelo cuando el tema
    // exige soloPronombre — ahí la pregunta ya precisa "en forma de
    // pronombre", así que el duplicado en SN/SP no es una respuesta
    // ambigua. En temas normales sí lo sería (dos respuestas "correctas"
    // ante una pregunta genérica), así que se descarta.
    if(f.func === objetivo.func && !tema.soloPronombre) return false;
    return true;
  });
  const esConfundible = f => _enLista(f.func, tema.confundibles);
  const confundibles = candidatos.filter(esConfundible);
  const resto = candidatos.filter(f => !esConfundible(f));
  const orden = dificil ? [...confundibles, ...resto] : [...resto, ...confundibles];
  return orden.slice(0, nDecoys);
}

// ── Ciclo de juego ────────────────────────────────────────────────────────

async function startChispa({ name, email, grupo }){
  showScreen('chispa');
  const oracEl = document.getElementById('chi-oracion');
  const pregEl = document.getElementById('chi-pregunta');
  const fichEl = document.getElementById('chi-fichas');
  if(oracEl) oracEl.textContent = 'Cargando oraciones…';
  if(pregEl) pregEl.textContent = '';
  if(fichEl) fichEl.innerHTML = '';
  CHI = { name, email, grupo, racha: 0, aciertos: 0, totalRondas: 0, rondaNum: 0, cola: [], poolSimples: [], poolCompuestas: [] };
  const nameEl = document.getElementById('chi-name');
  if(nameEl) nameEl.textContent = (name || '').split(' ')[0];
  _actualizarStreak();

  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  const [poolSimples, poolCompuestas] = await Promise.all([
    apiUrl ? _cargarPoolSimples(apiUrl) : Promise.resolve([]),
    apiUrl ? _cargarPoolCompuestas(apiUrl) : Promise.resolve([])
  ]);
  CHI.poolSimples = poolSimples;
  CHI.poolCompuestas = poolCompuestas;
  _calcularPoolsAtrCpvo();
  mostrarSelectorTemasChispa();
}

function _chispaSinDatos(){
  const oracEl = document.getElementById('chi-oracion');
  if(oracEl) oracEl.innerHTML = '⚠ No hay suficientes oraciones disponibles ahora mismo. Vuelve a intentarlo más tarde.';
  const pregEl = document.getElementById('chi-pregunta');
  if(pregEl) pregEl.textContent = '';
  const fichEl = document.getElementById('chi-fichas');
  if(fichEl) fichEl.innerHTML = '';
}

// ── Selector de tema (qué quiere practicar el alumno) ────────────────────

function _temaBtn(id, nombre, descripcion, n, minJugable){
  const jugable = n >= minJugable;
  if(!jugable){
    return '<div style="padding:14px 18px;border-radius:14px;border:2px dashed var(--border);background:#F5F5F5;opacity:.65;text-align:left">'
      + '<div style="font-weight:800;color:var(--muted)">🎯 ' + escHtml(nombre) + '</div>'
      + '<div style="font-size:.78rem;color:var(--muted);margin-top:2px">Banco insuficiente ahora mismo (' + n + ').</div>'
      + '</div>';
  }
  return '<button type="button" onclick="iniciarChispaTema(\'' + id + '\')" '
    + 'style="padding:14px 18px;border-radius:14px;border:2px solid #FDE68A;background:#FFFBEB;text-align:left;cursor:pointer;transition:transform .1s" '
    + 'onmouseover="this.style.transform=\'scale(1.01)\'" onmouseout="this.style.transform=\'scale(1)\'">'
    + '<div style="font-weight:800;color:var(--ink)">🎯 ' + escHtml(nombre) + '</div>'
    + '<div style="font-size:.78rem;color:var(--muted);margin-top:2px">' + escHtml(descripcion) + ' · ' + n + ' disponibles</div>'
    + '</button>';
}

// Muestra las tarjetas de tema (reutiliza los mismos contenedores que las
// rondas: chi-oracion queda vacío, chi-pregunta es el título, chi-fichas
// aloja las tarjetas). Se llama al entrar y también desde "🔄 Cambiar tema".
function mostrarSelectorTemasChispa(){
  const oracEl = document.getElementById('chi-oracion');
  const pregEl = document.getElementById('chi-pregunta');
  const fichEl = document.getElementById('chi-fichas');
  const explEl = document.getElementById('chi-explicacion');
  const sigBtn = document.getElementById('chi-siguiente');
  const cambiarBtn = document.getElementById('chi-cambiar-tema');
  if(oracEl) oracEl.textContent = '';
  if(pregEl) pregEl.textContent = '¿Qué quieres practicar?';
  if(explEl){ explEl.style.display = 'none'; explEl.innerHTML = ''; }
  if(sigBtn) sigBtn.style.display = 'none';
  if(cambiarBtn) cambiarBtn.style.display = 'none';

  const MIN_JUGABLE = 3;
  let html = CHISPA_TEMAS.map(tema => {
    const n = _rondasParaTema(tema, CHI.poolSimples, CHI.poolCompuestas).length;
    const descripcion = 'objetivo: ' + tema.objetivo.join('/');
    return _temaBtn(tema.id, tema.nombre, descripcion, n, MIN_JUGABLE);
  }).join('');
  const nAtrCpvo = _atrCpvoJugable() ? Math.min(CHI.atrSemiPool.length * 2, 8) : 0;
  html += _temaBtn('ATRCPVO_SENT', 'Atributo vs Predicativo (oraciones)', 'sin ser/estar a la vista: decide por la prueba, no por el verbo', nAtrCpvo, 1);
  html += '<button type="button" onclick="iniciarChispaTema(\'MIX\')" '
    + 'style="padding:14px 18px;border-radius:14px;border:2px solid #BFDBFE;background:#EFF6FF;text-align:left;cursor:pointer;font-weight:800;color:var(--ink)">'
    + '🎲 Mezcla de todo</button>';
  if(fichEl) fichEl.innerHTML = html;
}

// Arranca (o reinicia) la cola con el tema elegido. 'MIX' = todo mezclado.
function iniciarChispaTema(temaId){
  CHI.temaSeleccionado = temaId;
  CHI.rondaNum = 0;
  CHI.cola = _construirCola(temaId);
  const cambiarBtn = document.getElementById('chi-cambiar-tema');
  if(cambiarBtn) cambiarBtn.style.display = 'inline-flex';
  if(CHI.cola.length === 0){ _chispaSinDatos(); return; }
  renderRonda();
}

function renderRonda(){
  const explEl = document.getElementById('chi-explicacion');
  if(explEl){ explEl.style.display = 'none'; explEl.innerHTML = ''; }
  const sigBtn = document.getElementById('chi-siguiente');
  if(sigBtn) sigBtn.style.display = 'none';
  if(CHI.cola.length === 0){
    // Modo infinito: se acaba el pool, se vuelve a barajar (respetando el
    // tema elegido, no el mix completo).
    CHI.cola = _construirCola(CHI.temaSeleccionado);
    if(CHI.cola.length === 0){ _chispaSinDatos(); return; }
  }
  CHI.rondaNum++;
  const ronda = CHI.cola.shift();
  if(ronda.tipo === 'atrcpvo') renderRondaAtrCpvo();
  else renderRondaSpot(ronda);
}

// Avanza a la siguiente ronda (llamado por el botón "Siguiente →", que
// sustituye al auto-avance: da tiempo de leer la explicación sin prisa).
function chispaSiguiente(){
  renderRonda();
}

function _fichaBtn(i, texto, onclickFn){
  return '<button type="button" onclick="' + onclickFn + '(' + i + ')" id="chi-op-' + i + '" ' +
    'style="padding:16px 20px;border:2px solid #FDE68A;border-radius:14px;background:#FFFBEB;' +
    'font-family:\'Fraunces\',serif;font-size:1.05rem;font-weight:700;color:var(--ink);cursor:pointer;' +
    'text-align:center;transition:transform .1s" onmouseover="this.style.transform=\'scale(1.02)\'" ' +
    'onmouseout="this.style.transform=\'scale(1)\'">' + escHtml(texto) + '</button>';
}

function renderRondaSpot(ronda){
  const { tema, oracionTexto, fichas, objetivo } = ronda;
  const dificil = CHI.rondaNum >= 8;
  const media = CHI.rondaNum >= 4 && CHI.rondaNum < 8;
  const nDecoys = dificil ? 3 : (media ? 2 : 1);
  const decoys = _elegirDecoys(fichas, objetivo, tema, nDecoys, dificil);
  const opciones = shuffle([objetivo, ...decoys]);
  document.getElementById('chi-oracion').textContent = oracionTexto;
  // Con duplicación de clíticos (p.ej. "A mi primo no LE gusta…") el
  // sintagma pleno y el pronombre son ambos, en rigor, CI — hay que
  // precisar "en forma de pronombre" para que la pregunta no sea ambigua
  // cuando el señuelo es justo su propio duplicado.
  const sufijo = tema.soloPronombre ? ' en forma de pronombre' : '';
  document.getElementById('chi-pregunta').textContent = '¿Cuál es el ' + objetivo.func + sufijo + '?';
  document.getElementById('chi-fichas').innerHTML = opciones.map((op, i) => _fichaBtn(i, op.texto, 'chispaResponderSpot')).join('');
  CHI._opciones = opciones;
  CHI._objetivo = objetivo;
}

function renderRondaAtrCpvo(){
  const atrTexto  = CHI.atrSemiPool[Math.floor(Math.random() * CHI.atrSemiPool.length)];
  const cpvoTexto = CHI.cpvoPool[Math.floor(Math.random() * CHI.cpvoPool.length)];
  const opciones = shuffle([
    { texto: atrTexto,  func: 'Atr.' },
    { texto: cpvoTexto, func: 'CPvo' }
  ]);
  // La pregunta pide al azar una de las dos funciones — el alumno no puede
  // memorizar "la del semicopulativo siempre es la buena".
  const pedida = Math.random() < 0.5 ? 'Atr.' : 'CPvo';
  const nombrePedida = pedida === 'Atr.' ? 'Atributo' : 'Complemento Predicativo';
  document.getElementById('chi-oracion').textContent = '';
  document.getElementById('chi-pregunta').textContent = '¿Cuál de estas oraciones tiene ' + nombrePedida + '?';
  document.getElementById('chi-fichas').innerHTML = opciones.map((op, i) => _fichaBtn(i, op.texto, 'chispaResponderAtrCpvo')).join('');
  CHI._opcionesAtrCpvo = opciones;
  CHI._pedidaAtrCpvo = pedida;
}

function _colorearOpciones(opciones, esCorrecta, idxElegido){
  opciones.forEach((op, i) => {
    const btn = document.getElementById('chi-op-' + i);
    if(!btn) return;
    btn.style.pointerEvents = 'none';
    if(esCorrecta(op)){ btn.style.background = '#DCFCE7'; btn.style.borderColor = '#16A34A'; btn.style.color = '#166534'; }
    else if(i === idxElegido){ btn.style.background = '#FEE2E2'; btn.style.borderColor = '#DC2626'; btn.style.color = '#991B1B'; }
    else { btn.style.opacity = '.5'; }
  });
}

function chispaResponderSpot(idx){
  const opciones = CHI._opciones, objetivo = CHI._objetivo;
  if(!opciones || !objetivo) return;
  const elegido = opciones[idx];
  const acierto = elegido === objetivo;
  CHI.totalRondas++;
  if(acierto){ CHI.aciertos++; CHI.racha++; try{ playSuccess(); }catch(e){} }
  else { CHI.racha = 0; try{ playError(); }catch(e){} }
  _colorearOpciones(opciones, op => op === objetivo, idx);
  _actualizarStreak();
  const banco = (typeof REFLEXION_BANCO !== 'undefined') ? REFLEXION_BANCO[objetivo.func] : null;
  const explEl = document.getElementById('chi-explicacion');
  if(explEl && banco){
    explEl.style.display = 'block';
    explEl.style.background = acierto ? '#F0FDF4' : '#FEF2F2';
    explEl.style.color = acierto ? '#166534' : '#991B1B';
    explEl.textContent = (acierto ? '✓ ' : '✗ ') + banco.explicacionCorrecta;
  }
  _mostrarBotonSiguiente();
}

function _mostrarBotonSiguiente(){
  const sigBtn = document.getElementById('chi-siguiente');
  if(sigBtn) sigBtn.style.display = 'block';
}

function chispaResponderAtrCpvo(idx){
  const opciones = CHI._opcionesAtrCpvo, pedida = CHI._pedidaAtrCpvo;
  if(!opciones || !pedida) return;
  const elegido = opciones[idx];
  const acierto = elegido.func === pedida;
  CHI.totalRondas++;
  if(acierto){ CHI.aciertos++; CHI.racha++; try{ playSuccess(); }catch(e){} }
  else { CHI.racha = 0; try{ playError(); }catch(e){} }
  _colorearOpciones(opciones, op => op.func === pedida, idx);
  _actualizarStreak();
  // Reutiliza la explicación de la prueba NGLE (Fase C) de la función pedida.
  const banco = (typeof REFLEXION_BANCO !== 'undefined') ? REFLEXION_BANCO[pedida] : null;
  const explEl = document.getElementById('chi-explicacion');
  if(explEl && banco){
    explEl.style.display = 'block';
    explEl.style.background = acierto ? '#F0FDF4' : '#FEF2F2';
    explEl.style.color = acierto ? '#166534' : '#991B1B';
    explEl.textContent = (acierto ? '✓ ' : '✗ ') + banco.explicacionCorrecta;
  }
  _mostrarBotonSiguiente();
}

function _actualizarStreak(){
  const el = document.getElementById('chi-streak');
  if(el) el.textContent = '🔥 ' + CHI.racha;
}

function exitChispa(){
  showScreen('portada');
}

// Public API exports + window bindings para inline onclick
export {
  startChispa, exitChispa, renderRonda, chispaSiguiente,
  mostrarSelectorTemasChispa, iniciarChispaTema,
  chispaResponderSpot, chispaResponderAtrCpvo
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startChispa, exitChispa, renderRonda, chispaSiguiente,
    mostrarSelectorTemasChispa, iniciarChispaTema,
    chispaResponderSpot, chispaResponderAtrCpvo
  });
  Object.defineProperty(window, 'CHI', { get: () => CHI, configurable: true });
}
