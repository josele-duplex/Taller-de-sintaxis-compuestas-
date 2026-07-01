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
const CHISPA_PRONOMBRES_CD_CI = ['lo', 'la', 'los', 'las', 'le', 'les'];

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
  // 'NP' no es una ficha válida (es el verbo, no un complemento que se
  // pueda confundir con otro); 'vistos' evita duplicados — fase3.bloques a
  // veces repite un bloque "SN | Sujeto" además del que ya da fase2 (mismo
  // problema que se encontró y corrigió en la Fase C).
  const vistos = new Set();
  if((o.fase2?.sujeto_indices || []).length > 0){
    fichas.push({ func: 'Sujeto', texto: o.fase2.sujeto_indices.map(i => o.palabras[i]).join(' ') });
    vistos.add('Sujeto');
  }
  (o.fase3?.bloques || []).forEach(b => {
    const f = (b.solucion || '').split(' | ')[1];
    if(!f || f === '—' || f === 'NP' || vistos.has(f)) return;
    const idx = b.indices || [];
    const texto = idx.map(i => o.palabras[i]).join(' ');
    if(texto){
      const pronombre = (f === 'CD' || f === 'CI') && idx.length === 1 &&
        CHISPA_PRONOMBRES_CD_CI.includes((o.palabras[idx[0]] || '').toLowerCase());
      fichas.push({ func: f, texto, pronombre });
      vistos.add(f);
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
  const vistos = new Set();
  if(ai.sujeto && Array.isArray(ai.sujeto.indices) && ai.sujeto.indices.length > 0){
    fichas.push({ func: 'Sujeto', texto: ai.sujeto.indices.map(i => ej.tokens[i]?.texto || '').join(' ') });
    vistos.add('Sujeto');
  }
  (ai.funciones || []).forEach(f => {
    const func = CHISPA_CP_TO_SINT[f.tipo] || null;
    if(!func || vistos.has(func)) return;
    const idx = f.indices || [];
    const texto = idx.map(i => ej.tokens[i]?.texto || '').join(' ');
    if(texto){
      const pronombre = (func === 'CD' || func === 'CI') && idx.length === 1 &&
        CHISPA_PRONOMBRES_CD_CI.includes((ej.tokens[idx[0]]?.texto || '').toLowerCase());
      fichas.push({ func, texto, pronombre });
      vistos.add(func);
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

// Cola de la sesión: mezcla las rondas "spot" de los 3 temas + unas cuantas
// rondas "pnpv" (si hay cobertura), todo barajado. Solo simples para pnpv:
// caracterizar una compuesta entera como PN/PV es lingüísticamente ambiguo
// (cada proposición tiene su propio predicado).
function _construirCola(){
  CHI.pnpvNominal = [];
  CHI.pnpvVerbal = [];
  const vistos = new Set();
  CHI.poolSimples.forEach(o => {
    const tipo = o.fase3?.tipo_predicado;
    if(!tipo || vistos.has(o.oracion_completa)) return;
    vistos.add(o.oracion_completa);
    (tipo === 'PN' ? CHI.pnpvNominal : CHI.pnpvVerbal).push(o.oracion_completa);
  });
  const rondas = [];
  CHISPA_TEMAS.forEach(tema => {
    _rondasParaTema(tema, CHI.poolSimples, CHI.poolCompuestas).forEach(r => rondas.push({ tipo: 'spot', ...r }));
  });
  if(CHI.pnpvNominal.length > 0 && CHI.pnpvVerbal.length >= 2){
    const nPnpv = Math.min(CHI.pnpvNominal.length, 8);
    for(let i = 0; i < nPnpv; i++) rondas.push({ tipo: 'pnpv' });
  }
  return shuffle(rondas);
}

// Señuelos: en rondas fáciles, preferir funciones "claramente distintas";
// en rondas difíciles, preferir la pareja confundible del tema.
function _elegirDecoys(fichas, objetivo, tema, nDecoys, dificil){
  const candidatos = fichas.filter(f => f !== objetivo && f.func !== objetivo.func);
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
  CHI.cola = _construirCola();
  if(CHI.cola.length === 0){ _chispaSinDatos(); return; }
  renderRonda();
}

function _chispaSinDatos(){
  const oracEl = document.getElementById('chi-oracion');
  if(oracEl) oracEl.innerHTML = '⚠ No hay suficientes oraciones disponibles ahora mismo. Vuelve a intentarlo más tarde.';
  const pregEl = document.getElementById('chi-pregunta');
  if(pregEl) pregEl.textContent = '';
  const fichEl = document.getElementById('chi-fichas');
  if(fichEl) fichEl.innerHTML = '';
}

function renderRonda(){
  const explEl = document.getElementById('chi-explicacion');
  if(explEl){ explEl.style.display = 'none'; explEl.innerHTML = ''; }
  if(CHI.cola.length === 0){
    // Modo infinito: se acaba el pool, se vuelve a barajar desde cero.
    CHI.cola = _construirCola();
    if(CHI.cola.length === 0){ _chispaSinDatos(); return; }
  }
  CHI.rondaNum++;
  const ronda = CHI.cola.shift();
  if(ronda.tipo === 'pnpv') renderRondaPNPV();
  else renderRondaSpot(ronda);
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
  document.getElementById('chi-pregunta').textContent = '¿Cuál es el ' + objetivo.func + '?';
  document.getElementById('chi-fichas').innerHTML = opciones.map((op, i) => _fichaBtn(i, op.texto, 'chispaResponderSpot')).join('');
  CHI._opciones = opciones;
  CHI._objetivo = objetivo;
}

function renderRondaPNPV(){
  const nominal = CHI.pnpvNominal[Math.floor(Math.random() * CHI.pnpvNominal.length)];
  const verbalPool = shuffle(CHI.pnpvVerbal).slice(0, 2);
  const opciones = shuffle([
    { texto: nominal, esNominal: true },
    ...verbalPool.map(t => ({ texto: t, esNominal: false }))
  ]);
  document.getElementById('chi-oracion').textContent = '';
  document.getElementById('chi-pregunta').textContent = '¿Cuál de estas oraciones tiene predicado nominal?';
  document.getElementById('chi-fichas').innerHTML = opciones.map((op, i) => _fichaBtn(i, op.texto, 'chispaResponderPNPV')).join('');
  CHI._opcionesPNPV = opciones;
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
  setTimeout(renderRonda, 1400);
}

function chispaResponderPNPV(idx){
  const opciones = CHI._opcionesPNPV;
  if(!opciones) return;
  const elegido = opciones[idx];
  const acierto = !!elegido.esNominal;
  CHI.totalRondas++;
  if(acierto){ CHI.aciertos++; CHI.racha++; try{ playSuccess(); }catch(e){} }
  else { CHI.racha = 0; try{ playError(); }catch(e){} }
  _colorearOpciones(opciones, op => op.esNominal, idx);
  _actualizarStreak();
  setTimeout(renderRonda, 1400);
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
  startChispa, exitChispa, renderRonda,
  chispaResponderSpot, chispaResponderPNPV
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startChispa, exitChispa, renderRonda,
    chispaResponderSpot, chispaResponderPNPV
  });
  Object.defineProperty(window, 'CHI', { get: () => CHI, configurable: true });
}
