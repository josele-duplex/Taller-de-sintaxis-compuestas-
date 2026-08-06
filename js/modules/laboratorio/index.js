/* laboratorio/index.js — "El Laboratorio de Oraciones", F1·sesión 1: pantalla y bloqueo en orden.
   Consume getRetosLaboratorio (server/Laboratorio.gs) y juega los retos del banco
   Laboratorio_Banco (schema laboratorio v1.0, ver docs/Schema_Laboratorio_v1.0.md)
   en sus tres estaciones (Observa → Manipula → Etiqueta + prueba).

   Patrón de módulo: clonado de js/modules/fabrica/index.js (mismo problema de
   diseño: 3 estaciones, tipos de ítem cerrados, un solo motor de estado LAB
   expuesto vía getter, funciones top-level exportadas + Object.assign(window,...)
   para los onclick="" del HTML, fetchWithTimeout/escHtml/playSuccess/playError/
   awardXP de core). Interacción: todo click-to-select, igual que Fábrica y
   Chispa — sin drag&drop nativo (decisión ya tomada en esos módulos por los
   bugs de drag&drop táctil del sprint móvil de jul-2026).

   ALCANCE acumulado (Laboratorio_Oraciones_Plan_Producto.md §6):
     F1·1 (hecho) → pantalla, bloqueo en orden, esqueleto completo del ciclo
            (selector de nivel → cola de retos → ítem por ítem con estación
            bloqueada → cierre de reto) y las TRES mecánicas de la
            Estación 1 · Observa (valencia, que_cambia, intruso).
     F1·2 (hecho) → manipulacion: los cinco experimentos (sustituye/suprime/
            cambia_numero/mueve/transforma). Las cinco comparten estructura
            de datos (schema §3.4: "objetivo" + una lista "opciones" con
            exactamente una ok:true) y por tanto un solo render + el MISMO
            manejador de respuesta que ya usaba que_cambia
            (labResponderOpciones) — es la razón de que el schema las trate
            como un solo tipo de motor, no cinco.
     F1·3 (hecho, esta sesión) → juicio (veredicto + causa en dos pasos,
            patrón clonado de _renderJuicio/_renderJuicioCausa de
            fabrica/index.js) y par_minimo (misma forma de dato exacta que
            que_cambia — renombrado internamente a _renderContraste porque
            ahora sirve a los dos tipos).
   Pendiente:
     F1·4 → analisis_inverso (piezas/slots, patrón iidd* de Compuestas) y
            las analíticas silenciosas (sendBeacon a un endpoint
            saveSesionLaboratorio_ que todavía no existe en el GAS). XP ya
            está desde F1·1 (awardXP en cada acierto, igual que Fábrica).
     F2·1 → etiqueta_prueba (Estación 3) no puede cerrarse del todo hasta
            que exista js/data/pruebas-sintaxis.js; sigue como placeholder.
   Sin examen con PIN (Laboratorio.gs no lo tiene todavía — es F3 del plan) y
   sin selector de nivel más allá de basico/medio/avanzado: solo hay contenido
   en 'medio' por ahora (lote semilla F0·3), así que basico/avanzado mostrarán
   "sin retos disponibles" hasta que existan esos lotes (F4/F5). */

let LAB = {}; // estado de la sesión (expuesto como window.LAB más abajo)

// ── Mock offline (sin API configurada) ────────────────────────────────────
// Un solo reto que cubre los nueve tipos del schema (para poder probar los
// tres renders reales de Estación 1 y el placeholder del resto sin depender
// del Sheet). Contenido tomado de los ejemplos ya validados del lote semilla
// F0·3 (LB_0001, LB_0011) y del propio Schema_Laboratorio_v1.0.md §2.
function _mockRetos() {
  return [{
    schema_version: '1.0', id: 'LB_MOCK_0001', nivel: 'medio',
    titulo_problema: "¿Por qué a veces el que hace la acción va detrás del verbo?",
    corpus: ['María trajo el libro.', 'Trajo María el libro.'],
    items: [
      { tipo: 'intruso',
        oraciones: ['Trajo María el libro.', 'Llegó el paquete.', 'Compró Ana un regalo.', 'En la biblioteca trabajan muchos estudiantes.'],
        respuesta: 'En la biblioteca trabajan muchos estudiantes.',
        feedback: 'Las tres primeras traen a quien hace la acción justo detrás del verbo; la última empieza por un dato de lugar y deja a quien actúa para el final.' },
      { tipo: 'valencia', verbo: 'entregar', respuesta: 3,
        feedback: 'Entregar pide tres: quien entrega, lo entregado y quien lo recibe.' },
      { tipo: 'que_cambia', oracion_a: 'Escribió una carta a su amiga.', oracion_b: 'Escribió una carta para su amiga.',
        cambio: 'a su amiga → para su amiga',
        opciones: [
          { texto: 'Cambia la palabra por la que se sustituye ese trozo, y si se puede mover con libertad.', ok: true,
            micro: "Con 'a su amiga' se sustituye por 'le' y casi no se mueve; con 'para su amiga' se sustituye distinto y sí se desplaza." },
          { texto: 'No cambia nada salvo el significado.', ok: false,
            micro: "Prueba a sustituir 'su amiga' por 'le' en las dos: en una funciona y en la otra no." }
        ] },
      { tipo: 'manipulacion', manipulacion: 'sustituye', oracion: 'Entregó un ramo a su profesora.',
        objetivo: { texto: 'a su profesora', funcion: 'CI' },
        opciones: [
          { texto: 'Le entregó un ramo.', ok: true, micro: "El pronombre que le corresponde es 'le': es CI." },
          { texto: 'La entregó un ramo.', ok: false, micro: "'La' es el pronombre del CD; aquí el CD es 'un ramo'." }
        ] },
      { tipo: 'juicio', oracion: 'María la escribió una carta a Juan.', veredicto: 'agramatical',
        causa: 'pronombre_cruzado', opciones_causa: ['pronombre_cruzado', 'concordancia_sv'],
        gemela_correcta: 'María le escribió una carta a Juan.',
        explicacion: "Cada función tiene su propio pronombre: 'a Juan' pide 'le', no 'la'." },
      { tipo: 'etiqueta_prueba', oracion: 'Entregó un ramo a su profesora.',
        objetivo: { texto: 'a su profesora', funcion: 'CI' }, prueba_id: 'PRU-SINT-CI-01',
        distractores: ['PRU-SINT-CD-01', 'HEUR-PARA-QUIEN'], enunciado: 'tecnico' }
    ],
    zona_gris: false,
    metadatos: { curso_min: '3E' }
  }];
}

async function _cargarRetos(nivel, apiUrl) {
  if (!apiUrl) return { retos: _mockRetos(), usingMock: true };
  try {
    const r = await fetchWithTimeout(apiUrl + '?action=getRetosLaboratorio&nivel=' + encodeURIComponent(nivel), {}, 12000);
    const d = await r.json();
    if (d && d.ok && Array.isArray(d.retos) && d.retos.length > 0) return { retos: d.retos, usingMock: false };
    return { retos: [], usingMock: false };
  } catch (e) {
    console.warn('[laboratorio] getRetosLaboratorio no disponible:', e);
    return { retos: _mockRetos(), usingMock: true };
  }
}

// ── Utilidades ──────────────────────────────────────────────────────────

// La estación NO se declara en el dato: se deduce del tipo (mismo mapa que
// LAB_TIPO_ESTACION en scripts/validar-banco.mjs — si un día cambia, cambia
// en los dos sitios).
const LAB_TIPO_ESTACION = {
  valencia: 1, que_cambia: 1, intruso: 1,
  manipulacion: 2, juicio: 2, par_minimo: 2, analisis_inverso: 2, frontera: 2,
  etiqueta_prueba: 3
};
function _estacionDeItem(item) { return LAB_TIPO_ESTACION[item.tipo] || 2; }

const ESTACION_INFO = {
  1: { icon: '🔍', label: 'Estación 1 · Observa' },
  2: { icon: '🔧', label: 'Estación 2 · Manipula' },
  3: { icon: '🏷', label: 'Estación 3 · Etiqueta' }
};

// Mismos tres niveles y mismos iconos que Fábrica/Morfología: el alumno ya
// reconoce esa escalera.
const NIVEL_INFO = {
  basico:   { nombre: 'Aprendiz',    icon: '🌱', desc: 'Observa y manipula oraciones sin necesitar aún ninguna etiqueta · 2.º ESO' },
  medio:    { nombre: '3.º-4.º ESO', icon: '📗', desc: 'Sujeto, CD, CI, C.Rég., Atr. y CPvo puestos a prueba' },
  avanzado: { nombre: 'Maestro',     icon: '🧬', desc: 'Los valores de "se" y los casos de frontera · 1.º Bach' }
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── DOM helpers (misma idea que fab-oracion/fab-pregunta/fab-fichas) ──────

function _el(id) { return document.getElementById(id); }
function _setCorpus(html) { const el = _el('lab-corpus'); if (el) el.innerHTML = html; }
function _setPregunta(html) { const el = _el('lab-pregunta'); if (el) el.innerHTML = html; }
function _setFichas(html) { const el = _el('lab-fichas'); if (el) el.innerHTML = html; }
function _limpiarExplicacion() {
  const el = _el('lab-explicacion');
  if (el) { el.style.display = 'none'; el.className = 'lab-expl'; el.innerHTML = ''; }
  const sig = _el('lab-siguiente');
  if (sig) sig.style.display = 'none';
}
function _mostrarExplicacion(ok, html) {
  const el = _el('lab-explicacion');
  if (!el) return;
  el.style.display = 'block';
  el.className = 'lab-expl ' + (ok ? 'is-ok' : 'is-bad');
  el.innerHTML = html;
  const sig = _el('lab-siguiente');
  if (sig) sig.style.display = 'block';
}
function _actualizarStreak() {
  const el = _el('lab-streak');
  if (el) el.textContent = '🔥 ' + LAB.racha;
}
function _actualizarProgreso() {
  const el = _el('lab-progreso');
  if (!el || !LAB.reto) return;
  el.textContent = 'Reto ' + (LAB.retoNum || 1) + ' · Ítem ' + (LAB.itemIdx + 1) + '/' + LAB.items.length;
}

function _btnOp(i, texto, onclickFn) {
  return '<button type="button" class="lab-op" onclick="' + onclickFn + '(' + i + ')" id="lab-op-' + i + '">' +
    escHtml(texto) + '</button>';
}
function _colorearBotones(n, esCorrecta, idxElegido) {
  for (let i = 0; i < n; i++) {
    const btn = _el('lab-op-' + i);
    if (!btn) continue;
    btn.style.pointerEvents = 'none';
    if (esCorrecta(i)) btn.classList.add('is-ok');
    else if (i === idxElegido) btn.classList.add('is-bad');
    else btn.classList.add('is-dim');
  }
}

// ── Resolución genérica de un ítem (puntúa, sonido, racha, XP) ────────────
// XP desde esta misma sesión (igual que Fábrica desde su día 1): es
// infraestructura ya existente y de coste cero. Lo que SÍ se deja para
// F1·4 son las analíticas al servidor (sendBeacon), que necesitan un
// endpoint que Laboratorio.gs todavía no tiene.
function _resolverItem(correcta) {
  LAB.totalItems++;
  if (correcta) {
    LAB.aciertos++; LAB.racha++;
    if (LAB.racha > LAB.rachaMax) LAB.rachaMax = LAB.racha;
    try { playSuccess(); } catch (e) {}
    try { awardXP(2, 'laboratorio_item'); } catch (e) {}
  } else {
    LAB.racha = 0;
    try { playError(); } catch (e) {}
  }
  _actualizarStreak();
}

// ── Ciclo de sesión ────────────────────────────────────────────────────────

async function startLaboratorio({ name, email, grupo }) {
  showScreen('laboratorio');
  LAB = {
    name, email, grupo, nivel: null, pool: [], retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0,
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0,
    retosCompletadosSesion: 0
  };
  const nameEl = _el('lab-name');
  if (nameEl) nameEl.textContent = (name || '').split(' ')[0];
  _actualizarStreak();
  _mostrarSelectorNivel();
}

function _mostrarSelectorNivel() {
  LAB.reto = null;
  const cambiarBtn = _el('lab-cambiar-nivel');
  if (cambiarBtn) cambiarBtn.style.display = 'none';
  const nivelBadge = _el('lab-nivel-badge');
  if (nivelBadge) nivelBadge.textContent = '';
  const estBadge = _el('lab-estacion');
  if (estBadge) estBadge.textContent = '';
  _setCorpus('');
  _setPregunta('¿Con qué nivel quieres jugar?');
  _limpiarExplicacion();
  const html = Object.keys(NIVEL_INFO).map(nv => {
    const info = NIVEL_INFO[nv];
    return '<button type="button" class="lab-nivel" onclick="iniciarLaboratorioNivel(\'' + nv + '\')">' +
      '<div class="lab-nivel-nom">' + info.icon + ' ' + escHtml(info.nombre) + '</div>' +
      '<div class="lab-nivel-desc">' + escHtml(info.desc) + '</div>' +
      '</button>';
  }).join('');
  _setFichas(html);
}

async function iniciarLaboratorioNivel(nivel) {
  LAB.nivel = nivel;
  _setPregunta('Cargando retos…');
  _setFichas('');
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  const { retos, usingMock } = await _cargarRetos(nivel, apiUrl);
  LAB.usingMock = usingMock;
  LAB.pool = retos.filter(r => Array.isArray(r.items) && r.items.length > 0);
  LAB.retoQueue = shuffle(LAB.pool);
  LAB.retoNum = 0;
  const nivelBadge = _el('lab-nivel-badge');
  if (nivelBadge) nivelBadge.textContent = NIVEL_INFO[nivel].icon + ' ' + NIVEL_INFO[nivel].nombre;
  const cambiarBtn = _el('lab-cambiar-nivel');
  if (cambiarBtn) cambiarBtn.style.display = 'inline-flex';
  if (LAB.retoQueue.length === 0) { _sinDatos(); return; }
  _siguienteReto();
}

function _sinDatos() {
  _setCorpus('');
  _setPregunta('');
  _setFichas('<p style="text-align:center;color:var(--muted)">⚠ No hay retos disponibles para este nivel todavía. Vuelve a intentarlo más tarde.</p>');
  _limpiarExplicacion();
}

function _siguienteReto() {
  if (LAB.retoQueue.length === 0) {
    LAB.retoQueue = shuffle(LAB.pool);
    if (LAB.retoQueue.length === 0) { _sinDatos(); return; }
  }
  LAB.retoNum++;
  LAB.reto = LAB.retoQueue.shift();
  // Schema §2.1: los ítems del reto ya vienen ordenados por estación no decreciente.
  LAB.items = LAB.reto.items;
  LAB.itemIdx = 0;
  LAB.estacionActual = 0;
  _mostrarPortadaReto();
}

function _mostrarPortadaReto() {
  _limpiarExplicacion();
  _setCorpus('<div class="lab-titulo">' + escHtml(LAB.reto.titulo_problema) + '</div>' +
    '<div class="lab-corpus-list">' + (LAB.reto.corpus || []).map(escHtml).join(' · ') + '</div>');
  _setPregunta('');
  _setFichas('<button type="button" class="lab-btn lab-btn-block" onclick="labEmpezarReto()">Empezar reto →</button>');
  _actualizarProgreso();
}

function labEmpezarReto() { renderItemLaboratorio(); }

const ITEM_RENDERERS = {
  valencia: _renderValencia,
  que_cambia: _renderContraste,
  intruso: _renderIntruso,
  manipulacion: _renderManipulacion,
  juicio: _renderJuicio,
  par_minimo: _renderContraste
};

function renderItemLaboratorio() {
  _limpiarExplicacion();
  if (LAB.itemIdx >= LAB.items.length) { _finReto(); return; }
  const item = LAB.items[LAB.itemIdx];
  const est = _estacionDeItem(item);
  if (est !== LAB.estacionActual) {
    LAB.estacionActual = est;
    const estBadge = _el('lab-estacion');
    if (estBadge) estBadge.textContent = ESTACION_INFO[est].icon + ' ' + ESTACION_INFO[est].label;
  }
  _actualizarProgreso();
  const renderer = ITEM_RENDERERS[item.tipo];
  if (!renderer) { _renderStub(item); return; }
  renderer(item);
}

function labSiguienteItem() { LAB.itemIdx++; renderItemLaboratorio(); }

// Placeholder para los seis tipos que llegan en sesiones posteriores (ver
// cabecera del archivo). No cuenta como acierto ni como fallo — el alumno
// simplemente lo salta, y no se le penaliza por algo que la app todavía no
// sabe jugar.
function _renderStub(item) {
  _setCorpus(item.oracion ? '<div class="lab-frase">' + escHtml(item.oracion) + '</div>' : '');
  _setPregunta('');
  _setFichas(
    '<div class="lab-stub">' +
    '<div class="lab-stub-icon">🚧</div>' +
    '<div class="lab-stub-txt">Este tipo de ejercicio ("' + escHtml(item.tipo) +
    (item.manipulacion ? ' · ' + escHtml(item.manipulacion) : '') +
    '") llega en la próxima sesión del Laboratorio.</div>' +
    '<button type="button" class="lab-btn lab-btn-block" onclick="labSiguienteItem()">Saltar →</button>' +
    '</div>'
  );
  console.info('[laboratorio] ítem sin render todavía:', item.tipo, item);
}

function _finReto() {
  LAB.retosCompletadosSesion = (LAB.retosCompletadosSesion || 0) + 1;
  _setCorpus('');
  _setPregunta('');
  const pct = LAB.totalItems > 0 ? Math.round((LAB.aciertos / LAB.totalItems) * 100) : 0;
  _setFichas('<div class="lab-fin">' +
    '<div class="lab-fin-icon">🧪</div>' +
    '<div class="lab-fin-tit">¡Reto completado!</div>' +
    '<div class="lab-fin-sub">Aciertos de la sesión: ' + LAB.aciertos + '/' + LAB.totalItems + ' (' + pct + '%)</div>' +
    '<button type="button" class="lab-btn" onclick="labSiguienteReto()">Siguiente reto →</button>' +
    '</div>');
  _limpiarExplicacion();
}

function labSiguienteReto() { _siguienteReto(); }

function exitLaboratorio() { showScreen('portada'); }

function labCambiarNivel() { _mostrarSelectorNivel(); }

// ════════════════════════════════════════════════════════════════════════
//  ESTACIÓN 1 · OBSERVA — los tres tipos jugables ya en esta sesión
// ════════════════════════════════════════════════════════════════════════

// ── valencia ────────────────────────────────────────────────────────────
// La parte opcional del schema (arrastrar los actores a sus casillas) queda
// para una sesión posterior: aquí se juega solo el núcleo ("¿cuántos?").
function _renderValencia(item) {
  LAB._item = item;
  _setCorpus('<div class="lab-frase">' + escHtml(item.verbo) + '</div>');
  _setPregunta('¿Cuántos actores pide el verbo <strong>' + escHtml(item.verbo) + '</strong>?');
  _setFichas('<div class="lab-row">' +
    [1, 2, 3].map(n => '<button type="button" class="lab-op" onclick="labResponderValencia(' + n + ')" id="lab-op-' + n + '">' + n + '</button>').join('') +
    '</div>');
}
function labResponderValencia(n) {
  const item = LAB._item;
  const acierto = n === item.respuesta;
  for (const k of [1, 2, 3]) {
    const btn = _el('lab-op-' + k);
    if (!btn) continue;
    btn.style.pointerEvents = 'none';
    if (k === item.respuesta) btn.classList.add('is-ok');
    else if (k === n) btn.classList.add('is-bad');
    else btn.classList.add('is-dim');
  }
  _resolverItem(acierto);
  _mostrarExplicacion(acierto, (acierto ? '✓ ' : '✗ ') + escHtml(item.feedback || ''));
}

// ── que_cambia / par_minimo ─────────────────────────────────────────────
// Misma forma de dato exacta (oracion_a/oracion_b/cambio/opciones): el
// schema (§3.6) solo distingue que en par_minimo las opciones SÍ pueden
// nombrar funciones desde nivel medio — es una regla de contenido que
// valida el banco, no una diferencia de render. Un solo componente para
// los dos tipos, con la pregunta ajustada a cada uno.
const CONTRASTE_PREGUNTA = {
  que_cambia: '¿Qué ha pasado?',
  par_minimo: '¿Qué función ha cambiado?'
};
function _renderContraste(item) {
  LAB._item = item;
  const opciones = shuffle(item.opciones.map((o, i) => ({ ...o, _i: i })));
  LAB._opciones = opciones;
  _setCorpus(
    '<div class="lab-frase">' + escHtml(item.oracion_a) + '</div>' +
    '<div class="lab-frase-arrow">↓</div>' +
    '<div class="lab-frase">' + escHtml(item.oracion_b) + '</div>'
  );
  _setPregunta(CONTRASTE_PREGUNTA[item.tipo] || '¿Qué ha pasado?');
  _setFichas('<div class="lab-stack">' +
    opciones.map((o, i) => _btnOp(i, o.texto, 'labResponderOpciones')).join('') + '</div>');
}

// Reutilizable por que_cambia, par_minimo y manipulacion (los cinco
// experimentos, más arriba): todos comparten exactamente la misma forma
// "opciones" — {texto, ok, micro} con una sola correcta.
function labResponderOpciones(idx) {
  const opciones = LAB._opciones;
  const elegido = opciones[idx];
  _colorearBotones(opciones.length, i => opciones[i].ok, idx);
  _resolverItem(!!elegido.ok);
  _mostrarExplicacion(!!elegido.ok, (elegido.ok ? '✓ ' : '✗ ') + escHtml(elegido.micro || ''));
}

// ── intruso ─────────────────────────────────────────────────────────────
function _renderIntruso(item) {
  LAB._item = item;
  const oraciones = shuffle(item.oraciones);
  LAB._oraciones = oraciones;
  _setCorpus('');
  _setPregunta('¿Cuál es la intrusa?');
  _setFichas('<div class="lab-stack">' +
    oraciones.map((o, i) => _btnOp(i, o, 'labResponderIntruso')).join('') + '</div>');
}
function labResponderIntruso(idx) {
  const oraciones = LAB._oraciones, item = LAB._item;
  const acierto = oraciones[idx] === item.respuesta;
  _colorearBotones(oraciones.length, i => oraciones[i] === item.respuesta, idx);
  _resolverItem(acierto);
  _mostrarExplicacion(acierto, (acierto ? '✓ ' : '✗ ') + escHtml(item.feedback || ''));
}

// ════════════════════════════════════════════════════════════════════════
//  ESTACIÓN 2 · MANIPULA — F1·sesión 2
// ════════════════════════════════════════════════════════════════════════

// Pregunta genérica por manipulación (copia de interfaz, no del dato — no
// pasa por el validador de metalenguaje del banco, así que no hace falta
// evitar aquí las palabras que sí están prohibidas en items[].feedback).
const MANIP_PREGUNTA = {
  sustituye:     'Sustituye el trozo marcado por otra forma. ¿Cuál funciona?',
  suprime:       '¿Qué pasa si quitas el trozo marcado?',
  cambia_numero: 'Cambia de número el trozo marcado. ¿Qué pasa con el resto?',
  mueve:         'Mueve el trozo marcado de sitio. ¿Cuál funciona?',
  transforma:    'Dale la vuelta a la oración. ¿Cuál es el resultado?'
};

// Envuelve objetivo.texto en un <mark> dentro de la oración. El schema
// (§7.1) garantiza que ese texto aparece EXACTA una vez — lo comprueba el
// validador — así que un indexOf simple basta y no hace falta regex.
function _resaltarObjetivo(oracion, texto) {
  const i = oracion.indexOf(texto);
  if (i < 0) return escHtml(oracion); // defensivo: no debería pasar, ya validado en el banco
  return escHtml(oracion.slice(0, i)) +
    '<mark class="lab-marca">' + escHtml(oracion.slice(i, i + texto.length)) + '</mark>' +
    escHtml(oracion.slice(i + texto.length));
}

// Las cinco manipulaciones (sustituye/suprime/cambia_numero/mueve/transforma)
// comparten estructura y corrección — es la decisión de diseño del schema
// (§3.4): un único render, y las respuestas se resuelven con la misma
// labResponderOpciones que ya usa que_cambia, porque "opciones" tiene
// siempre la misma forma {texto, ok, micro} salga lo que salga de la
// manipulación (una oración resultante en cuatro de los cinco casos, un
// veredicto — "sigue funcionando"/"queda cojo"/"cambia de significado" — en
// suprime).
function _renderManipulacion(item) {
  LAB._item = item;
  const opciones = shuffle(item.opciones.map((o, i) => ({ ...o, _i: i })));
  LAB._opciones = opciones;
  _setCorpus('<div class="lab-frase">' + _resaltarObjetivo(item.oracion, item.objetivo.texto) + '</div>');
  _setPregunta(MANIP_PREGUNTA[item.manipulacion] || '¿Qué pasa?');
  _setFichas('<div class="lab-stack">' +
    opciones.map((o, i) => _btnOp(i, o.texto, 'labResponderOpciones')).join('') + '</div>');
}

// ════════════════════════════════════════════════════════════════════════
//  ESTACIÓN 2 · MANIPULA (cont.) — juicio, F1·sesión 3
// ════════════════════════════════════════════════════════════════════════
// Patrón clonado de _renderJuicio/_renderJuicioCausa de fabrica/index.js
// (mismo problema exacto: veredicto cerrado + causa cerrada en dos pasos).
// Diferencia de Fábrica que SÍ importa: la nota "el veredicto sin la causa
// no vale el ítem" del plan de producto (§5.4) es una regla del MODO EXAMEN
// (curva de nota), no de la práctica — aquí, como en Fábrica, se puntúa por
// el veredicto (el paso de la causa queda como segunda comprobación
// explicativa, sin volver a sumar ni restar). El modo examen (F3) es quien
// tendrá que combinar los dos aciertos en una sola nota.

// Encabezado + pregunta que ve el alumno para cada veredicto. Las cuatro
// opciones se muestran siempre fijas (el veredicto es un enum cerrado del
// schema, no viene con "opciones" en el dato — igual que valencia).
const VEREDICTO_UI = {
  gramatical:  { icon: '✓', label: 'Funciona bien' },
  agramatical: { icon: '✗', label: 'No funciona' },
  norma_culta: { icon: '⚠', label: 'Se dice, pero cuidado' },
  dudoso:      { icon: '⚖', label: 'Es debatible' }
};
const VEREDICTOS = ['gramatical', 'agramatical', 'norma_culta', 'dudoso'];

// Las 16 causas del schema §5, en lenguaje de alumno (no son las mismas
// cadenas que se guardan en el dato, que son las claves cerradas del enum).
const CAUSA_LABEL = {
  concordancia_sv:         'El verbo no concuerda con quien hace la acción',
  concordancia_atr:        'La palabra que describe no concuerda con el sujeto',
  transitividad:           'El verbo no admite eso que recibe la acción',
  orden_imposible:         'Ese orden de palabras no es posible',
  concordancia_cpvo:       'La palabra que describe no concuerda con lo que recibe la acción',
  regimen_prep:            'Esa preposición no es la que exige el verbo',
  pronombre_cruzado:       'El pronombre no es el de esa función',
  seleccion_semantica:     'El verbo no admite ese tipo de complemento',
  articulo_propio:         'El nombre propio no lleva artículo',
  pasiva_refleja_intrans:  'Ese verbo no admite esta construcción',
  duplicacion_obligatoria: 'Falta el pronombre que tenía que repetirse',
  modo_obligado:           'El verbo exige otra forma aquí',
  gradabilidad:            'Ese adjetivo no admite ese grado',
  queismo_dequeismo:       'Sobra o falta una preposición delante de "que"',
  leismo_laismo:           'El pronombre no es el que corresponde a esa función',
  concordancia_ad_sensum:  'Concuerda con el significado, no con la forma'
};

function _renderJuicio(item) {
  LAB._item = item;
  _setCorpus('<div class="lab-frase">' + escHtml(item.oracion) + '</div>');
  _setPregunta('¿Esta oración funciona?');
  _setFichas('<div class="lab-stack">' +
    VEREDICTOS.map((v, i) => _btnOp(i, VEREDICTO_UI[v].icon + ' ' + VEREDICTO_UI[v].label, 'labResponderVeredicto')).join('') +
    '</div>');
}

function labResponderVeredicto(idx) {
  const item = LAB._item;
  const elegido = VEREDICTOS[idx];
  const acierto = elegido === item.veredicto;
  _colorearBotones(VEREDICTOS.length, i => VEREDICTOS[i] === item.veredicto, idx);
  _resolverItem(acierto);
  const hayCausa = item.veredicto !== 'gramatical' && Array.isArray(item.opciones_causa) && item.opciones_causa.length > 0;
  if (hayCausa) {
    setTimeout(() => _renderJuicioCausa(item), 550);
  } else {
    _mostrarResultadoJuicio(acierto, item);
  }
}

function _renderJuicioCausa(item) {
  const causas = shuffle(item.opciones_causa);
  LAB._causas = causas;
  _setPregunta('¿Qué se rompe?');
  _setFichas('<div class="lab-stack">' +
    causas.map((c, i) => _btnOp(i, CAUSA_LABEL[c] || c, 'labResponderCausa')).join('') + '</div>');
}
function labResponderCausa(idx) {
  const item = LAB._item;
  const causas = LAB._causas;
  const acierto = causas[idx] === item.causa;
  _colorearBotones(causas.length, i => causas[i] === item.causa, idx);
  _mostrarResultadoJuicio(acierto, item);
}

// Cierre común (con o sin paso de causa): explicación + contraste con la
// gemela, nunca la oración mala sola en pantalla (regla del plan §2.5.2).
// El asterisco (.lab-asterisco) solo se pinta si el veredicto es
// "agramatical" — norma_culta y dudoso NO llevan asterisco (regla §2.5.1).
function _mostrarResultadoJuicio(acierto, item) {
  let html = (acierto ? '✓ ' : '✗ ') + escHtml(item.explicacion || '');
  if (item.gemela_correcta) {
    const oracionMarcada = (item.veredicto === 'agramatical' ? '<span class="lab-asterisco">*</span>' : '') + escHtml(item.oracion);
    html += '<div class="lab-contraste">' +
      '<div class="lab-frase-mini">' + oracionMarcada + '</div>' +
      '<div class="lab-frase-arrow">↓</div>' +
      '<div class="lab-frase-mini">' + escHtml(item.gemela_correcta) + '</div>' +
      '</div>';
  }
  _mostrarExplicacion(acierto, html);
}

// ── Public API + window bindings (patrón fabrica/chispa) ──────────────────

export {
  startLaboratorio, exitLaboratorio, labCambiarNivel, iniciarLaboratorioNivel,
  labEmpezarReto, labSiguienteItem, labSiguienteReto,
  labResponderValencia, labResponderOpciones, labResponderIntruso,
  labResponderVeredicto, labResponderCausa
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startLaboratorio, exitLaboratorio, labCambiarNivel, iniciarLaboratorioNivel,
    labEmpezarReto, labSiguienteItem, labSiguienteReto,
    labResponderValencia, labResponderOpciones, labResponderIntruso,
    labResponderVeredicto, labResponderCausa
  });
  Object.defineProperty(window, 'LAB', { get: () => LAB, configurable: true });
}
