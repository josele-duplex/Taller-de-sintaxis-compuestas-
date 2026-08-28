/* fabrica/index.js — "La Fábrica de Palabras", F1: motor de cliente.
   Consume getFormacion (Server/Formacion.gs) y juega los retos del banco
   Formacion_Banco (schema formacion v1.0, ver docs/Schema_Formacion_v1.0.md)
   en sus tres estaciones (Observa → Manipula → Etiqueta), con los 10 tipos
   de ítem cerrados del schema.

   Patrón de módulo: como js/modules/chispa/index.js (ES module ligero,
   estado en un objeto módulo expuesto vía getter, funciones top-level
   exportadas + Object.assign(window,...) para los onclick="" del HTML,
   fetchWithTimeout/escHtml/playSuccess/playError de core).

   Interacción: todo click-to-select, sin drag&drop nativo. Es una
   decisión deliberada, no una limitación — el sprint móvil de jul-2026
   (ver memoria del proyecto) encontró bugs reales de drag&drop táctil en
   Compuestas; click-to-select es más robusto en pantallas pequeñas y es
   el patrón que ya usa Chispa.

   Alcance F1 (según plan de producto §6): estaciones 1-2-3 completas,
   feedback, XP local, sin examen/PIN (Formacion.gs todavía no lo tiene)
   y sin analíticas al servidor (no existe endpoint saveSesionFormacion
   todavía — eso es F3). El progreso de sesión vive solo en memoria.

   F3 · sesión 2 (jul-2026): modo examen con PIN, sobre el backend ya
   construido en Server/Formacion.gs (createExamFormacion_/getExamenFormacion_/
   saveResultadoFormacion_). Patrón clonado de _loadMaestroExamByPin +
   submitMorfologiaResult (js/modules/maestro/index.js) para la carga y el
   envío, y de calcDetailedScore (js/modules/sint/index.js) para el
   principio "examen no revela feedback ni da pistas".
   Diferencias con práctica, todas centralizadas en FAB.mode==='exam':
     · _colorearBotones/_mostrarExplicacion no revelan nada: solo bloquean
       los botones y muestran "Respuesta registrada.".
     · Sin sonido de acierto/fallo (playSuccess/playError) ni racha visible
       en la topbar — el racha interno sigue actualizándose (mismo XP), lo
       único que cambia es que no se muestra ni se oye.
     · `monta` no admite reintentos en examen: el primer tropiezo cierra el
       ítem (en práctica, el rebote explica y deja reintentar) — sin esto,
       el alumno podría fuerza-bruta las combinaciones gratis.
     · Sin "Cambiar nivel" (lo fija el PIN) ni "Mi mesa" (herramienta de
       consulta, no debe estar disponible durante el examen).
     · Cola de retos FINITA (la que trae el examen, ya filtrada a Estación
       2-3 por el servidor): al vaciarse, termina el examen en vez de
       reiniciar el pool en bucle como hace la práctica libre.
     · Nota = aciertos/totalItems, sin curva adicional: a diferencia de
       Simples/Morfología, cada ítem de la Fábrica ya es una unidad binaria
       (no hay puntuación parcial dentro de un ítem que una curva deba
       corregir), así que el porcentaje bruto ya es la nota justa. */

import { textoPrueba, microPrueba } from '../../data/pruebas-morfologia.js';
import { LS_FAB_MESA, LS_FAB_DIARIO, LS_FAB_MUSEO } from '../../core/constants.js';
import { pickFabMission, syncFabMission, fabMissionCardHtml } from '../../gamification/missions-fabrica.js';
import { registrarLimpieza } from '../../core/timers.js';
import { log } from '../../core/log.js';
import { _el } from '../../core/dom.js';

// ── Catálogos de etiquetas legibles (para no repetir texto ni volver a
//    inventar terminología — todo sale de las listas cerradas del schema) ──

const ETIQUETA_LABEL = {
  raiz: 'raíz', prefijo: 'prefijo', sufijo: 'sufijo', flexivo: 'flexivo',
  base: 'base', interfijo: 'interfijo', elemento_culto: 'elem. culto',
  vocal_cierre: 'vocal de cierre'
};

// §5 del schema: qué etiquetas se admiten en el selector según el nivel.
const ETIQUETAS_POR_NIVEL = {
  basico:   ['raiz', 'prefijo', 'sufijo', 'flexivo', 'base'],
  medio:    ['raiz', 'prefijo', 'sufijo', 'flexivo', 'base', 'interfijo', 'elemento_culto'],
  avanzado: ['raiz', 'prefijo', 'sufijo', 'flexivo', 'base', 'interfijo', 'elemento_culto', 'vocal_cierre']
};

const VEREDICTO_LABEL = {
  correcta:    { icon: '✓', label: 'Correcta' },
  no_existe:   { icon: '✗', label: 'No existe' },
  norma_culta: { icon: '⚠', label: 'Existe, pero mal escrita' },
  dudosa:      { icon: '⚖', label: 'Dudosa' }
};

// §6 del schema — solo la etiqueta corta del botón, la explicación completa
// la trae siempre el propio ítem en `explicacion`.
const CAUSA_LABEL = {
  falta_base: 'Falta la base', orden_piezas: 'Las piezas van en el orden que no es',
  familia_falsa: 'Parecido casual, no familia', parasintesis_incompleta: 'Falta una de las dos piezas simultáneas',
  sigla_plural: 'Sigla pluralizada con -s', sigla_puntos: 'Sigla escrita con puntos',
  abreviatura_sin_punto: 'Abreviatura sin su punto', sigla_minuscula: 'Sigla no lexicalizada en minúscula',
  acortamiento_mal: 'Recorte que no respeta la sílaba', restriccion_sufijo: 'El sufijo no admite esa base',
  alomorfo_incorrecto: 'Alomorfo del afijo mal elegido', prestamo_adaptacion: 'Préstamo sin adaptar a la grafía española',
  doble_analisis: 'Zona gris: dos segmentaciones posibles',
  no_lexicalizada: 'Se podría fabricar, pero no se usa'
};

// §4 del schema — nombre de cara al alumno de cada procedimiento (solo se
// muestra en estación 3, donde el metalenguaje es libre).
const PROCEDIMIENTO_LABEL = {
  simple: 'simple', derivada: 'derivada', compuesta_lexica: 'compuesta',
  compuesta_sintagmatica: 'compuesta sintagmática', compuesta_culta: 'compuesta culta',
  parasintetica: 'parasintética', sigla: 'una sigla', acronimo: 'un acrónimo',
  acortamiento: 'un acortamiento', abreviatura: 'una abreviatura',
  numeronimo: 'un numerónimo', prestamo: 'un préstamo'
};

// §4 del schema — nivel mínimo en que se juega cada procedimiento. Gobierna
// qué puede declarar el alumno en el reto creativo.
const PROCEDIMIENTO_NIVEL_MIN = {
  simple: 'basico', derivada: 'basico', compuesta_lexica: 'basico',
  compuesta_sintagmatica: 'medio', compuesta_culta: 'medio', parasintetica: 'medio',
  sigla: 'medio', acronimo: 'medio', acortamiento: 'medio', abreviatura: 'medio',
  numeronimo: 'medio', prestamo: 'medio'
};

const ORDEN_NIVEL = { basico: 1, medio: 2, avanzado: 3 };

// Mismos tres niveles y mismos iconos que el módulo de Morfología: el
// alumno ya reconoce esa escalera, no le inventamos una nueva. La
// descripción dice qué se hace, no cómo se llama el nivel («Nivel basico»
// no significa nada para un alumno de 1.º).
const NIVEL_INFO = {
  basico:   { nombre: 'Aprendiz',    icon: '🌱', desc: 'De qué piezas está hecha una palabra · 1.º-2.º ESO' },
  medio:    { nombre: '3.º-4.º ESO', icon: '📗', desc: 'Siglas, acortamientos y palabras con dos piezas a la vez' },
  avanzado: { nombre: 'Maestro',     icon: '🧬', desc: 'El orden real en que se fabrica cada palabra · 1.º Bach' }
};

let FAB = {}; // estado de la sesión (expuesto como window.FAB más abajo)

// ── Carga del banco ──────────────────────────────────────────────────────

function _mockRetos() {
  // Fallback offline (sin API configurada), un solo reto — mismo patrón que
  // getMock() en sint/index.js. Copia fiel de FP_0001 del lote semilla.
  return [{
    schema_version: '1.0', id: 'FP_MOCK_0001', nivel: 'basico',
    titulo_problema: "¿Qué piezas esconde la palabra 'ilegal'?",
    corpus: ['ilegal', 'legalizar', 'legalidad'],
    items: [
      { tipo: 'intruso', palabras: ['ilegal', 'ilegítimo', 'ilustre', 'ilimitado'], respuesta: 'ilustre',
        feedback: "'Ilustre' empieza igual, pero no comparte el trozo con significado de 'legal'." },
      { tipo: 'piezas', modo: 'cortar', palabra: 'ilegal', cortes: ['i', 'legal'],
        feedback: "'i' es la pieza con la que arranca la palabra; 'legal' añade el resto del significado." },
      { tipo: 'juicio', forma: '*legali', veredicto: 'no_existe', causa: 'orden_piezas',
        opciones_causa: ['orden_piezas', 'falta_base'], forma_correcta: 'ilegal',
        explicacion: "Las piezas van en el orden que no es: primero 'i' y después 'legal', no al revés." },
      { tipo: 'piezas', modo: 'etiquetar', palabra: 'ilegal', cortes: ['i', 'legal'], etiquetas: ['prefijo', 'raiz'] },
      { tipo: 'clasifica_prueba', palabra: 'ilegal', procedimiento: 'derivada', prueba_id: 'PRU-MORF-DERIV-01',
        distractores: ['PRU-MORF-CLEX-01', 'HEUR-DOS-PARTES'], enunciado: 'simple' }
    ],
    zona_gris: false, metadatos: { origen_ud: 'Gramatica_01 1ESO', curso_min: '1E' }
  }];
}

async function _cargarRetos(nivel, apiUrl) {
  if (!apiUrl) return { retos: _mockRetos(), usingMock: true };
  try {
    const r = await fetchWithTimeout(apiUrl + '?action=getFormacion&nivel=' + encodeURIComponent(nivel), {}, 12000);
    const d = await r.json();
    if (d && d.ok && Array.isArray(d.retos) && d.retos.length > 0) return { retos: d.retos, usingMock: false };
    return { retos: [], usingMock: false };
  } catch (e) {
    log.warn('[fabrica] getFormacion no disponible:', e);
    return { retos: _mockRetos(), usingMock: true };
  }
}

// ── Utilidades ────────────────────────────────────────────────────────────

function _estacionDeItem(item) {
  if (item.tipo === 'agrupa' || item.tipo === 'intruso') return 1;
  if (item.tipo === 'piezas') return item.modo === 'cortar' ? 2 : 3;
  if (item.tipo === 'clasifica_prueba' || item.tipo === 'cascada') return 3;
  return 2; // monta, par_minimo, cadena, juicio, frontera
}

const ESTACION_INFO = {
  1: { icon: '🔍', label: 'Estación 1 · Observa' },
  2: { icon: '🔧', label: 'Estación 2 · Manipula' },
  3: { icon: '🏷', label: 'Estación 3 · Etiqueta' }
};

function _segmentsFromBoundaries(word, boundaries) {
  const chars = Array.from(word);
  const bounds = [0, ...boundaries, chars.length];
  const segs = [];
  for (let i = 0; i < bounds.length - 1; i++) segs.push(chars.slice(bounds[i], bounds[i + 1]).join(''));
  return segs;
}
function _segsEqual(a, b) { return a.length === b.length && a.every((s, i) => s === b[i]); }

// Escapa una cadena para incrustarla en un onclick="fn('…')": primero la
// capa JS (barras y comillas simples) y luego la de atributo HTML.
function _jsAttr(s) {
  return escAttr(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

// Elementos del pool que aún no se han colocado, respetando duplicados: si
// el pool trae dos veces la misma forma, quedan dos fichas hasta colocar
// las dos.
function _restantes(pool, usados) {
  const pendientes = [...pool];
  usados.forEach(u => {
    const i = pendientes.indexOf(u);
    if (i >= 0) pendientes.splice(i, 1);
  });
  return pendientes;
}
function _arrSameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// ── DOM helpers (misma idea que chi-oracion/chi-pregunta/chi-fichas) ──────

function _setOracion(html) { const el = _el('fab-oracion'); if (el) el.innerHTML = html; }
// La forma que se está estudiando (par mínimo, juicio, frontera, cascada).
function _setPalabraFoco(txt) { _setOracion('<div class="fab-foco">' + escHtml(txt) + '</div>'); }
function _setPregunta(html) { const el = _el('fab-pregunta'); if (el) el.innerHTML = html; }
function _setFichas(html) { const el = _el('fab-fichas'); if (el) el.innerHTML = html; }
function _limpiarExplicacion() {
  const el = _el('fab-explicacion');
  if (el) { el.style.display = 'none'; el.className = 'fab-expl'; el.innerHTML = ''; }
  const sig = _el('fab-siguiente');
  if (sig) sig.style.display = 'none';
}
// `avanza` a false = se muestra el aviso pero el ítem sigue abierto (es el
// caso de los rebotes de `monta`, donde el alumno debe volver a intentarlo).
// Examen: nunca se revela `ok` ni `html` — ver la nota de cabecera del
// archivo ("examen no revela feedback ni da pistas").
function _mostrarExplicacion(ok, html, avanza) {
  const el = _el('fab-explicacion');
  if (!el) return;
  el.style.display = 'block';
  if (FAB.mode === 'exam') {
    el.className = 'fab-expl';
    el.innerHTML = 'Respuesta registrada.';
  } else {
    el.className = 'fab-expl ' + (ok ? 'is-ok' : 'is-bad');
    el.innerHTML = html;
  }
  const sig = _el('fab-siguiente');
  if (sig && avanza !== false) sig.style.display = 'block';
}
function _actualizarStreak() {
  const el = _el('fab-streak');
  if (el) el.textContent = '🔥 ' + FAB.racha;
}
function _actualizarProgreso() {
  const el = _el('fab-progreso');
  if (!el || !FAB.reto) return;
  el.textContent = 'Reto ' + (FAB.retoNum || 1) + ' · Ítem ' + (FAB.itemIdx + 1) + '/' + FAB.items.length;
}

// ── Resolución genérica de un ítem (puntúa, sonido, racha) ────────────────

function _resolverItem(tipo, correcta) {
  FAB.totalItems++;
  if (correcta) {
    FAB.aciertos++; FAB.racha++;
    if (FAB.racha > FAB.rachaMax) FAB.rachaMax = FAB.racha;
    // Aciertos por estación: alimenta las misiones que apuntan a una
    // estación concreta (la 3 hoy). FAB.estacionActual la fija
    // renderItemFabrica antes de dibujar el ítem.
    FAB.aciertosEst[FAB.estacionActual] = (FAB.aciertosEst[FAB.estacionActual] || 0) + 1;
    // Examen: sin sonido de acierto — es una señal de corrección tan válida
    // como el color de un botón, y aquí tampoco se revela nada.
    if (FAB.mode !== 'exam') { try { playSuccess(); } catch (e) {} }
    try { awardXP(2, 'fabrica_item'); } catch (e) {}
  } else {
    FAB.racha = 0;
    FAB.erroresPorTipo[tipo] = (FAB.erroresPorTipo[tipo] || 0) + 1;
    if (FAB.mode !== 'exam') { try { playError(); } catch (e) {} }
  }
  _actualizarStreak();
  _sincronizarMision();
}

// ── Misión diaria de la Fábrica (F4·3) ───────────────────────────────────
// Pool propio (js/gamification/missions-fabrica.js), no el de Simples: ver
// la cabecera de ese archivo para el porqué. Solo en práctica — en examen
// no hay misión, igual que no hay mesa, museo ni reto creativo.

function _fabContadores() {
  return {
    aciertos: FAB.aciertos || 0,
    retos: FAB.retosCompletadosSesion || 0,
    rachaMax: FAB.rachaMax || 0,
    herramientasNuevas: FAB.herramientasNuevas || 0,
    museoNuevas: FAB.museoNuevas || 0,
    aciertosEst3: (FAB.aciertosEst && FAB.aciertosEst[3]) || 0
  };
}

function _sincronizarMision() {
  if (FAB.mode === 'exam') return;
  if (!FAB._misionAplicada) FAB._misionAplicada = {};
  try { syncFabMission(_fabContadores(), FAB._misionAplicada); } catch (e) {}
}

// ── Ciclo de sesión ───────────────────────────────────────────────────────

async function startFabrica({ name, email, grupo }) {
  showScreen('fabrica');
  _clearFabricaTimer();
  FAB = {
    name, email, grupo, nivel: null, pool: [], retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0, mode: 'practice',
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0, erroresPorTipo: {},
    retosCompletadosSesion: 0,
    aciertosEst: {}, herramientasNuevas: 0, museoNuevas: 0, _misionAplicada: {}
  };
  // Sortea (o recupera) la misión del día antes de que el alumno empiece:
  // así la portada del primer reto ya la puede enseñar.
  try { pickFabMission(); } catch (e) {}
  const nameEl = _el('fab-name');
  if (nameEl) nameEl.textContent = (name || '').split(' ')[0];
  // Defensivo: si la sesión anterior en esta misma pestaña fue un examen,
  // deja el "Mi mesa", el "Museo" y el racha ocultos — se restauran aquí.
  const mesaBtn = _el('fab-btn-mesa');
  if (mesaBtn) mesaBtn.style.display = '';
  const museoBtn = _el('fab-btn-museo');
  if (museoBtn) museoBtn.style.display = '';
  const streakBadge = _el('fab-streak');
  if (streakBadge) streakBadge.style.display = '';
  const timerEl = _el('fab-timer');
  if (timerEl) timerEl.style.display = 'none';
  _actualizarStreak();
  _mostrarSelectorNivel();
}

// Entrada de examen: el alumno llega con un PIN ya validado desde el login
// (ver iniciarFabricaExamenDesdeLogin más abajo, llamada desde
// handleStartAll en sint/index.js). No pasa por el selector de nivel — el
// PIN ya trae el nivel y la lista fija de retos que el profesor precomputó
// en createExamFormacion_ (Server/Formacion.gs).
async function iniciarFabricaExamenDesdeLogin({ name, email, grupo, pin }) {
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  if (!apiUrl) throw new Error('Sin conexión al servidor.');
  let d;
  try {
    const r = await fetchWithTimeout(apiUrl + '?action=getExamenFormacion&pin=' + encodeURIComponent(pin), {}, 12000);
    d = await r.json();
  } catch (e) {
    throw new Error('Error de conexión: ' + (e.message || 'timeout') + '. Inténtalo de nuevo.');
  }
  if (!d || !d.ok || !Array.isArray(d.retos) || d.retos.length === 0) {
    throw new Error((d && d.error) || 'PIN no válido.');
  }
  showScreen('fabrica');
  _clearFabricaTimer();
  FAB = {
    name, email, grupo: grupo || d.grupo || '', nivel: d.nivel || 'basico',
    pool: shuffle(d.retos), retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0, mode: 'exam',
    examPin: pin, examGrupo: d.grupo || '', examEval: d.evaluacion || '', examName: d.nombreExamen || '',
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0, erroresPorTipo: {},
    retosCompletadosSesion: 0, _examSent: false,
    aciertosEst: {}, herramientasNuevas: 0, museoNuevas: 0, _misionAplicada: {}
  };
  FAB.retoQueue = [...FAB.pool];
  const nameEl = _el('fab-name');
  if (nameEl) nameEl.textContent = (name || '').split(' ')[0];
  const info = NIVEL_INFO[FAB.nivel] || NIVEL_INFO.basico;
  const nivelBadge = _el('fab-nivel-badge');
  if (nivelBadge) nivelBadge.textContent = info.icon + ' ' + info.nombre + ' · Examen';
  const cambiarBtn = _el('fab-cambiar-nivel');
  if (cambiarBtn) cambiarBtn.style.display = 'none';
  // Sin herramientas de consulta ni señal de racha visible durante el
  // examen — ver la nota de cabecera del archivo.
  const mesaBtn = _el('fab-btn-mesa');
  if (mesaBtn) mesaBtn.style.display = 'none';
  const museoBtn = _el('fab-btn-museo');
  if (museoBtn) museoBtn.style.display = 'none';
  const streakBadge = _el('fab-streak');
  if (streakBadge) streakBadge.style.display = 'none';
  if (d.timer > 0) _startFabricaTimer(d.timer * 60);
  _siguienteReto();
}

function _mostrarSelectorNivel() {
  FAB.reto = null;
  const cambiarBtn = _el('fab-cambiar-nivel');
  if (cambiarBtn) cambiarBtn.style.display = 'none';
  const nivelBadge = _el('fab-nivel-badge');
  if (nivelBadge) nivelBadge.textContent = '';
  const estBadge = _el('fab-estacion');
  if (estBadge) estBadge.textContent = '';
  _setOracion('');
  _setPregunta('¿Con qué nivel quieres jugar?');
  _limpiarExplicacion();
  const html = Object.keys(NIVEL_INFO).map(nv => {
    const info = NIVEL_INFO[nv];
    return '<button type="button" class="fab-nivel" onclick="iniciarFabricaNivel(\'' + nv + '\')">' +
      '<div class="fab-nivel-nom">' + info.icon + ' ' + escHtml(info.nombre) + '</div>' +
      '<div class="fab-nivel-desc">' + escHtml(info.desc) + '</div>' +
      '</button>';
  }).join('');
  _setFichas(html);
}

async function iniciarFabricaNivel(nivel) {
  FAB.nivel = nivel;
  _setPregunta('Cargando retos…');
  _setFichas('');
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  const { retos, usingMock } = await _cargarRetos(nivel, apiUrl);
  FAB.usingMock = usingMock;
  FAB.pool = retos.filter(r => Array.isArray(r.items) && r.items.length > 0);
  FAB.retoQueue = shuffle(FAB.pool);
  FAB.retoNum = 0;
  const nivelBadge = _el('fab-nivel-badge');
  if (nivelBadge) nivelBadge.textContent = NIVEL_INFO[nivel].icon + ' ' + NIVEL_INFO[nivel].nombre;
  const cambiarBtn = _el('fab-cambiar-nivel');
  if (cambiarBtn) cambiarBtn.style.display = 'inline-flex';
  if (FAB.retoQueue.length === 0) { _sinDatos(); return; }
  _siguienteReto();
}

function _sinDatos() {
  _setOracion('');
  _setPregunta('');
  _setFichas('<p style="text-align:center;color:var(--muted)">⚠ No hay retos disponibles para este nivel ahora mismo. Vuelve a intentarlo más tarde.</p>');
  _limpiarExplicacion();
}

function _siguienteReto() {
  if (FAB.retoQueue.length === 0) {
    // Examen: cola finita — al vaciarse, termina (no se reinicia el pool
    // en bucle como en práctica libre).
    if (FAB.mode === 'exam') { _finalizarExamenFabrica(); return; }
    FAB.retoQueue = shuffle(FAB.pool);
    if (FAB.retoQueue.length === 0) { _sinDatos(); return; }
  }
  FAB.retoNum++;
  FAB.reto = FAB.retoQueue.shift();
  // §2.1: los ítems del reto ya vienen ordenados por estación no decreciente.
  FAB.items = FAB.reto.items;
  FAB.itemIdx = 0;
  FAB.estacionActual = 0;
  _mostrarPortadaReto();
}

function _mostrarPortadaReto() {
  _limpiarExplicacion();
  _setOracion('<div class="fab-titulo">' + escHtml(FAB.reto.titulo_problema) + '</div>' +
    '<div class="fab-corpus">' + (FAB.reto.corpus || []).map(escHtml).join(' · ') + '</div>');
  _setPregunta('');
  _setFichas(_misionHtml() +
    '<button type="button" class="fab-btn fab-btn-block" onclick="fabEmpezarReto()">Empezar reto →</button>');
  _actualizarProgreso();
}

// La misión no existe en examen (ni se sortea ni se sincroniza); el guardia
// aquí es por si el alumno ya tenía una del día en una sesión de práctica.
function _misionHtml() {
  if (FAB.mode === 'exam') return '';
  try { return fabMissionCardHtml(); } catch (e) { return ''; }
}

function fabEmpezarReto() {
  renderItemFabrica();
}

function renderItemFabrica() {
  _limpiarExplicacion();
  if (FAB.itemIdx >= FAB.items.length) { _finReto(); return; }
  const item = FAB.items[FAB.itemIdx];
  const est = _estacionDeItem(item);
  if (est !== FAB.estacionActual) {
    FAB.estacionActual = est;
    const estBadge = _el('fab-estacion');
    if (estBadge) estBadge.textContent = ESTACION_INFO[est].icon + ' ' + ESTACION_INFO[est].label;
  }
  _actualizarProgreso();
  const renderer = ITEM_RENDERERS[item.tipo];
  if (!renderer) {
    log.warn('[fabrica] tipo de ítem desconocido:', item.tipo);
    fabSiguienteItem();
    return;
  }
  renderer(item);
}

function fabSiguienteItem() {
  FAB.itemIdx++;
  renderItemFabrica();
}

function _finReto() {
  FAB.retosCompletadosSesion = (FAB.retosCompletadosSesion || 0) + 1;
  _sincronizarMision();
  _setOracion('');
  _setPregunta('');
  const pct = FAB.totalItems > 0 ? Math.round((FAB.aciertos / FAB.totalItems) * 100) : 0;
  // El reto creativo es de práctica, nunca de examen: es semiabierto y su
  // definición no puntúa (§4.2 del plan).
  const creativo = FAB.mode === 'exam' ? '' :
    '<button type="button" class="fab-btn-sm" onclick="fabAbrirCreativo()">🧪 Fabrica tu palabra</button>';
  _setFichas('<div class="fab-fin">' +
    '<div class="fab-fin-icon">🏆</div>' +
    '<div class="fab-fin-tit">¡Reto completado!</div>' +
    '<div class="fab-fin-sub">Aciertos de la sesión: ' + FAB.aciertos + '/' + FAB.totalItems + ' (' + pct + '%)</div>' +
    _misionHtml() +
    '<div class="fab-row">' + creativo +
    '<button type="button" class="fab-btn" onclick="fabSiguienteReto()">Siguiente reto →</button>' +
    '</div></div>');
  _limpiarExplicacion();
}

function fabSiguienteReto() {
  _siguienteReto();
}

function exitFabrica() {
  showScreen('portada');
}

function fabCambiarNivel() {
  _mostrarSelectorNivel();
}

// ════════════════════════════════════════════════════════════════════════
//  MESA DE HERRAMIENTAS (§4.3 del plan de producto)
// ════════════════════════════════════════════════════════════════════════
// Tabla personal que se rellena sola: cada acierto en `clasifica_prueba`
// (procedimiento + prueba que lo demuestra) añade o actualiza una fila con
// el propio ejemplo del alumno — no uno de fábrica. Persiste entre sesiones
// en localStorage (no hay endpoint de servidor todavía; eso es F3) y crece
// durante todo el curso: vacía al empezar, llena al acabar.

function _loadMesa() {
  try { return JSON.parse(localStorage.getItem(LS_FAB_MESA) || '{}'); }
  catch (e) { return {}; }
}
function _saveMesa(m) {
  try { localStorage.setItem(LS_FAB_MESA, JSON.stringify(m)); } catch (e) {}
}

function _registrarHerramienta(item) {
  const mesa = _loadMesa();
  const esNueva = !mesa[item.procedimiento];
  mesa[item.procedimiento] = {
    procedimiento: item.procedimiento,
    prueba: textoPrueba(item.prueba_id, 'tecnico'),
    palabra: item.palabra,
    nivel: FAB.nivel,
    fecha: new Date().toISOString().slice(0, 10)
  };
  _saveMesa(mesa);
  if (esNueva) {
    FAB.herramientasNuevas = (FAB.herramientasNuevas || 0) + 1;
    _sincronizarMision();
    try {
      if (typeof window.showCombo === 'function') {
        window.showCombo('🧰 Nueva herramienta: ' + (PROCEDIMIENTO_LABEL[item.procedimiento] || item.procedimiento), 15);
      }
    } catch (e) {}
  }
}

// Orden pedagógico fijo (§4 del schema), no el de conquista, para que la
// mesa lea como la "carta de estudio" de la UD y no como un historial.
function _mesaFilasOrdenadas() {
  const mesa = _loadMesa();
  return Object.keys(PROCEDIMIENTO_LABEL).map(p => mesa[p]).filter(Boolean);
}

function _mesaFilasHtml(filas) {
  return filas.map(f => '<tr><td>' + escHtml(PROCEDIMIENTO_LABEL[f.procedimiento] || f.procedimiento) +
    '</td><td>' + escHtml(f.prueba) + '</td><td>' + escHtml(f.palabra) + '</td></tr>').join('');
}

function fabAbrirMesa() {
  const filas = _mesaFilasOrdenadas();
  const body = _el('fab-mesa-body');
  if (body) {
    body.innerHTML = filas.length === 0
      ? '<p class="fab-mesa-vacia">Tu mesa está vacía todavía. Cada vez que aciertes «Clasifica + prueba» en la Estación 3, aquí aparece una herramienta nueva — con tu propio ejemplo.</p>'
      : '<table class="fab-mesa-table"><thead><tr><th>Procedimiento</th><th>Prueba</th><th>Tu ejemplo</th></tr></thead><tbody>' +
        _mesaFilasHtml(filas) + '</tbody></table>';
  }
  const modal = _el('fab-mesa-modal');
  if (modal) modal.style.display = 'flex';
}
function fabCerrarMesa() {
  const modal = _el('fab-mesa-modal');
  if (modal) modal.style.display = 'none';
}
function fabImprimirMesa() {
  const filas = _mesaFilasOrdenadas();
  const w = window.open('', '_blank');
  if (!w) return;
  const filasHtml = filas.length ? _mesaFilasHtml(filas) : '<tr><td colspan="3">Mesa vacía todavía.</td></tr>';
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Mi Mesa de Herramientas</title>' +
    '<style>body{font-family:sans-serif;padding:24px;color:#222}h1{font-size:1.25rem}' +
    'table{width:100%;border-collapse:collapse;margin-top:16px}' +
    'th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:.9rem;vertical-align:top}' +
    'th{background:#f2f2ee}</style></head><body>' +
    '<h1>🧰 Mi Mesa de Herramientas — La Fábrica de Palabras</h1>' +
    '<table><thead><tr><th>Procedimiento</th><th>Prueba</th><th>Tu ejemplo</th></tr></thead><tbody>' +
    filasHtml + '</tbody></table></body></html>');
  w.document.close();
  w.focus();
  w.print();
}

// ════════════════════════════════════════════════════════════════════════
//  DIARIO METALINGÜÍSTICO (§4.1 del plan de producto)
// ════════════════════════════════════════════════════════════════════════
// Al cerrar la sesión, si completó al menos un reto, un campo opcional de
// texto libre con la plantilla del marco teórico. Se guarda en localStorage
// (sin endpoint de servidor todavía; el profesor lo verá en el informe
// cuando exista `saveSesionFormacion`, eso es F3).

function fabPedirSalir() {
  // Mismo patrón que exitMaestro (js/modules/maestro/index.js): en examen
  // se confirma antes de salir para no perder la nota sin avisar, y no se
  // muestra el diario (es una reflexión de práctica, no de examen).
  if (FAB.mode === 'exam') {
    if (confirm('¿Salir del examen? Si no has terminado, no se guardará la nota.')) {
      _clearFabricaTimer();
      exitFabrica();
    }
    return;
  }
  if ((FAB.retosCompletadosSesion || 0) > 0) { _mostrarDiario(); return; }
  exitFabrica();
}

// ════════════════════════════════════════════════════════════════════════
//  EXAMEN — temporizador, cierre y envío del resultado (F3 · sesión 2)
// ════════════════════════════════════════════════════════════════════════

function _startFabricaTimer(seconds) {
  FAB.timerRemaining = seconds;
  const el = _el('fab-timer');
  if (el) el.style.display = 'inline-block';
  _updateFabricaTimerDisplay();
  FAB.timerInterval = setInterval(() => {
    FAB.timerRemaining--;
    _updateFabricaTimerDisplay();
    if (FAB.timerRemaining <= 0) {
      clearInterval(FAB.timerInterval);
      FAB.timerInterval = null;
      _finalizarExamenFabrica();
    }
  }, 1000);
}
function _updateFabricaTimerDisplay() {
  const el = _el('fab-timer');
  if (!el) return;
  const mm = String(Math.floor(FAB.timerRemaining / 60)).padStart(2, '0');
  const ss = String(Math.floor(FAB.timerRemaining % 60)).padStart(2, '0');
  el.textContent = '⏱ ' + mm + ':' + ss;
  el.style.background = FAB.timerRemaining < 60 ? '#FEF2F2' : FAB.timerRemaining < 180 ? '#FEF3C7' : 'var(--paper3)';
  el.style.color = FAB.timerRemaining < 60 ? 'var(--red)' : FAB.timerRemaining < 180 ? 'var(--amber)' : 'var(--ink)';
}
function _clearFabricaTimer() {
  if (FAB.timerInterval) { clearInterval(FAB.timerInterval); FAB.timerInterval = null; }
}
// A6 (auditoría técnica ago-2026): FAB llegó después de que cleanAllTimers
// (sint) se escribiera a mano y nunca entró en esa lista.
registrarLimpieza(_clearFabricaTimer);

function _finalizarExamenFabrica() {
  _clearFabricaTimer();
  const timerEl = _el('fab-timer');
  if (timerEl) timerEl.style.display = 'none';
  const nota10 = FAB.totalItems > 0 ? Math.round((FAB.aciertos / FAB.totalItems) * 1000) / 100 : 0;
  const notaFmt = nota10.toFixed(1);
  _setOracion('');
  _setPregunta('');
  _setFichas(
    '<div class="fab-fin">' +
    '<div class="fab-fin-icon">🏭</div>' +
    '<div class="fab-fin-tit">Examen terminado</div>' +
    '<div style="font-size:3rem;font-weight:900;color:var(--fab-oliva-dk);line-height:1;margin:10px 0">' + notaFmt + '</div>' +
    '<div class="fab-fin-sub">' + FAB.aciertos + '/' + FAB.totalItems + ' ítems correctos</div>' +
    '<p id="fab-exam-msg" style="margin-top:16px;font-size:.85rem;font-weight:600"></p>' +
    '<button type="button" class="fab-btn fab-btn-block" style="margin-top:6px" onclick="exitFabrica()">Salir</button>' +
    '</div>'
  );
  _limpiarExplicacion();
  _enviarResultadoFabrica(nota10);
}

async function _enviarResultadoFabrica(nota10) {
  const msg = _el('fab-exam-msg');
  if (FAB._examSent) {
    if (msg) { msg.textContent = '✓ Resultado ya enviado.'; msg.style.color = 'var(--green)'; }
    return;
  }
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  if (!apiUrl) {
    if (msg) { msg.textContent = '⚠ Sin URL de API. La nota no se ha enviado al profesor.'; msg.style.color = 'var(--red)'; }
    return;
  }
  if (msg) { msg.textContent = '⏳ Enviando resultado al profesor…'; msg.style.color = 'var(--blue)'; }
  // Cuerpo plano (sin envolver en {payload:...}) — así lo espera
  // saveResultadoFormacion_ en Server/Formacion.gs (dispatchFormacionPost_
  // le pasa el objeto entero del body tal cual llega).
  const body = JSON.stringify({
    action: 'saveResultadoFormacion',
    email: FAB.email || '', name: FAB.name || '', grupo: FAB.grupo || '',
    nivel: FAB.nivel || '', modo: 'exam',
    pin: FAB.examPin || '', evaluacion: FAB.examEval || '', examen: FAB.examName || '',
    nota: String(nota10 || 0),
    itemsOk: String(FAB.aciertos || 0),
    itemsErr: String((FAB.totalItems || 0) - (FAB.aciertos || 0)),
    itemsTotales: String(FAB.totalItems || 0),
    erroresCategoria: JSON.stringify(FAB.erroresPorTipo || {})
  });
  try {
    // Sin Content-Type: JSON explícito para evitar el preflight CORS — el
    // GAS recibe el body raw y lo parsea con JSON.parse(e.postData.contents)
    // (mismo motivo que saveResultadoCompuestas en compuestas/index.js).
    const r = await fetchWithTimeout(apiUrl, { method: 'POST', body, mode: 'cors', credentials: 'omit', redirect: 'follow' }, 12000);
    const d = await r.json();
    if (d && d.ok) {
      FAB._examSent = true;
      if (msg) {
        msg.textContent = d.duplicate ? '✓ Resultado ya enviado.' : '✓ Resultado enviado correctamente al profesor.';
        msg.style.color = 'var(--green)';
      }
    } else {
      throw new Error((d && d.error) || 'Error del servidor');
    }
  } catch (e) {
    if (msg) {
      msg.textContent = '⚠ Error de conexión: ' + (e.message || 'timeout') + '. No se ha podido reenviar automáticamente.';
      msg.style.color = 'var(--red)';
    }
  }
}

function _mostrarDiario() {
  _limpiarExplicacion();
  const estBadge = _el('fab-estacion');
  if (estBadge) estBadge.textContent = '';
  _setOracion('<div class="fab-titulo">¿Qué te llevas de esta sesión?</div>');
  _setPregunta('Es opcional — te ayuda a fijar lo que has descubierto.');
  _setFichas(
    '<textarea id="fab-diario-texto" class="fab-diario-ta" rows="4" ' +
    'placeholder="Antes pensaba que…, ahora he descubierto que…, y lo sé porque…"></textarea>' +
    '<div class="fab-row" style="margin-top:14px">' +
    '<button type="button" class="fab-btn-sm" onclick="fabSaltarDiario()">Saltar</button>' +
    '<button type="button" class="fab-btn" onclick="fabGuardarDiario()">Guardar y salir</button>' +
    '</div>'
  );
}

function _guardarEntradaDiario(texto) {
  try {
    const diario = JSON.parse(localStorage.getItem(LS_FAB_DIARIO) || '[]');
    diario.push({
      fecha: new Date().toISOString().slice(0, 10),
      nivel: FAB.nivel,
      retos: FAB.retosCompletadosSesion || 0,
      texto
    });
    localStorage.setItem(LS_FAB_DIARIO, JSON.stringify(diario));
  } catch (e) {}
}
function fabGuardarDiario() {
  const ta = _el('fab-diario-texto');
  const texto = ta ? ta.value.trim() : '';
  if (texto) _guardarEntradaDiario(texto);
  exitFabrica();
}
function fabSaltarDiario() {
  exitFabrica();
}

// ════════════════════════════════════════════════════════════════════════
//  RETO CREATIVO «FABRICA TU PALABRA» + MUSEO (§4.2 del plan de producto)
// ════════════════════════════════════════════════════════════════════════
// El alumno inventa una palabra montándola con piezas del banco, declara con
// qué procedimiento la ha fabricado y le escribe una definición. Lo que la
// app corrige sola es el PROCEDIMIENTO (conoce los tipos de las piezas
// usadas); la definición no puntúa, se expone en el Museo. Es semiabierto
// pero autocorregible en lo que importa.
//
// De dónde salen las piezas: de los propios retos ya cargados (los `monta`
// las traen ya con su tipo; los `piezas` en modo etiquetar, como cortes +
// etiquetas). Cero datos nuevos que mantener, y el banco crece solo cuando
// crece el banco de retos.

const PIEZA_ORDEN = ['prefijo', 'raiz', 'base', 'elemento_culto', 'interfijo', 'sufijo', 'flexivo'];

// Quita los guiones de posición: "des-" y "-ado" son la misma pieza escrita
// con su marca de dónde va. Al concatenar no cuentan (§3.4 del schema).
function _piezaLimpia(t) { return String(t || '').replace(/^-+|-+$/g, ''); }

// Cómo se muestra una pieza: con su guion de posición, para que se lea dónde
// encaja sin tener que explicarlo.
// Los elementos cultos van sin guion: los hay de delante (`tele-`) y de
// detrás (`-logía`), y el dato no registra su posición — ponerle un guion
// fijo mentiría sobre la mitad de ellos.
function _piezaConGuion(texto, tipo) {
  if (tipo === 'prefijo') return texto + '-';
  if (tipo === 'sufijo' || tipo === 'flexivo' || tipo === 'interfijo') return '-' + texto;
  return texto;
}

function _bancoPiezas() {
  const permitidas = new Set(ETIQUETAS_POR_NIVEL[FAB.nivel] || ETIQUETAS_POR_NIVEL.basico);
  const vistas = new Map();
  const add = (textoRaw, tipo) => {
    const texto = _piezaLimpia(textoRaw);
    if (!texto || !permitidas.has(tipo)) return;
    const clave = tipo + '|' + texto;
    if (!vistas.has(clave)) vistas.set(clave, { texto, tipo });
  };
  for (const reto of (FAB.pool || [])) {
    for (const it of (reto.items || [])) {
      if (it.tipo === 'monta') {
        for (const p of (it.piezas || [])) add(p.texto, p.tipo);
      } else if (it.tipo === 'piezas' && it.modo === 'etiquetar') {
        (it.cortes || []).forEach((c, i) => add(c, (it.etiquetas || [])[i]));
      }
    }
  }
  return [...vistas.values()].sort((a, b) => {
    const d = PIEZA_ORDEN.indexOf(a.tipo) - PIEZA_ORDEN.indexOf(b.tipo);
    return d !== 0 ? d : a.texto.localeCompare(b.texto, 'es');
  });
}

// Qué procedimientos son COMPATIBLES con los tipos de pieza usados. No es
// "cuál es": varias formas admiten más de una lectura y la app no puede
// decidirlas sin una prueba que solo el alumno puede hacer (¿existe la forma
// intermedia?). Se valida lo que se puede validar: que lo declarado encaje
// con las piezas que hay sobre la mesa.
function _procedimientosCompatibles(tipos) {
  const n = t => tipos.filter(x => x === t).length;
  const raices = n('raiz'), pre = n('prefijo'), suf = n('sufijo');
  const bases = n('base'), cultos = n('elemento_culto'), inter = n('interfijo');
  const set = new Set();
  if (cultos >= 1 && (cultos + bases + raices) >= 2) set.add('compuesta_culta');
  if (bases >= 2) set.add('compuesta_lexica');
  if (raices === 1 && pre === 0 && suf === 0 && inter === 0 && bases === 0 && cultos === 0) set.add('simple');
  if (raices >= 1 && bases === 0 && cultos === 0 && (pre + suf + inter) >= 1) {
    set.add('derivada');
    // Prefijo y sufijo a la vez: la FORMA es la de una parasintética, pero
    // quien lo decide de verdad es la prueba de la forma intermedia
    // (PRU-MORF-INTERM-01). Por eso caben las dos lecturas.
    if (pre >= 1 && suf >= 1) set.add('parasintetica');
  }
  return set;
}

function _procedimientosDelNivel() {
  const max = ORDEN_NIVEL[FAB.nivel] || 1;
  // Los procedimientos que no se montan con piezas (sigla, acrónimo,
  // acortamiento, abreviatura, numerónimo, préstamo) quedan fuera: no se
  // pueden fabricar en esta mesa, así que ofrecerlos sería una trampa.
  return Object.keys(PROCEDIMIENTO_NIVEL_MIN).filter(p =>
    ORDEN_NIVEL[PROCEDIMIENTO_NIVEL_MIN[p]] <= max &&
    ['simple', 'derivada', 'compuesta_lexica', 'compuesta_culta', 'parasintetica'].includes(p));
}

function _palabraCreativa() {
  return FAB._creaSel.map(p => p.texto).join('');
}

function fabAbrirCreativo() {
  FAB._creaBanco = _bancoPiezas();
  FAB._creaSel = [];
  FAB._creaProc = null;
  const estBadge = _el('fab-estacion');
  if (estBadge) estBadge.textContent = '🧪 Fabrica tu palabra';
  _limpiarExplicacion();
  if (FAB._creaBanco.length < 3) {
    _setOracion('<div class="fab-titulo">🧪 Fabrica tu palabra</div>');
    _setPregunta('');
    _setFichas('<p style="text-align:center;color:var(--muted)">Todavía no hay piezas suficientes en tu banco. Juega algunos retos más y vuelve.</p>' +
      '<div class="fab-row" style="margin-top:14px"><button type="button" class="fab-btn" onclick="fabSiguienteReto()">Seguir jugando →</button></div>');
    return;
  }
  _renderCreativoMontaje();
}

function _renderCreativoMontaje() {
  _setOracion('<div class="fab-titulo">🧪 Fabrica tu palabra</div>');
  _setPregunta('Monta una palabra que no exista todavía. Tú decides.');
  const palabra = _palabraCreativa();
  let html = '<div class="fab-chain">' + (FAB._creaSel.length
    ? FAB._creaSel.map(p => '<span class="fab-chip is-sel">' + escHtml(_piezaConGuion(p.texto, p.tipo)) + '</span>').join('<span class="fab-arrow">+</span>')
    : '<span class="fab-chain-empty">Toca las piezas para ir montándola…</span>') + '</div>';
  if (palabra) html += '<div class="fab-foco" style="margin:10px 0 4px">' + escHtml(palabra) + '</div>';

  let tipoActual = null;
  html += '<div style="margin-top:14px">';
  FAB._creaBanco.forEach((p, i) => {
    if (p.tipo !== tipoActual) {
      tipoActual = p.tipo;
      html += '<div class="fab-cesta-nombre" style="margin:10px 0 4px">' + escHtml(ETIQUETA_LABEL[p.tipo] || p.tipo) + '</div>';
    }
    html += '<button type="button" class="fab-chip" onclick="fabCreativoTocar(' + i + ')">' +
      escHtml(_piezaConGuion(p.texto, p.tipo)) + '</button>';
  });
  html += '</div>';

  html += '<div class="fab-row" style="margin-top:16px">';
  if (FAB._creaSel.length) {
    html += '<button type="button" class="fab-btn-sm" onclick="fabCreativoDeshacer()">↶ Deshacer</button>';
    html += '<button type="button" class="fab-btn-sm" onclick="fabCreativoLimpiar()">Limpiar</button>';
  }
  if (FAB._creaSel.length >= 2) {
    html += '<button type="button" class="fab-btn" onclick="fabCreativoContinuar()">Ya está montada →</button>';
  }
  html += '<button type="button" class="fab-btn-sm" onclick="fabCreativoCancelar()">Ahora no</button>';
  html += '</div>';
  _setFichas(html);
}

function fabCreativoTocar(i) {
  const p = FAB._creaBanco[i];
  if (p) FAB._creaSel.push(p);
  _renderCreativoMontaje();
}
function fabCreativoDeshacer() { FAB._creaSel.pop(); _renderCreativoMontaje(); }
function fabCreativoLimpiar() { FAB._creaSel = []; _renderCreativoMontaje(); }
function fabCreativoCancelar() { _finReto(); }

function fabCreativoContinuar() {
  _limpiarExplicacion();
  _setOracion('<div class="fab-foco">' + escHtml(_palabraCreativa()) + '</div>');
  _setPregunta('¿Con qué procedimiento la has fabricado?');
  const html = '<div class="fab-stack">' + _procedimientosDelNivel().map(p =>
    '<button type="button" class="fab-op" onclick="fabCreativoDeclarar(\'' + p + '\')">' +
    escHtml(PROCEDIMIENTO_LABEL[p] || p) + '</button>').join('') + '</div>' +
    '<div class="fab-row" style="margin-top:14px">' +
    '<button type="button" class="fab-btn-sm" onclick="fabCreativoVolver()">← Volver a montarla</button></div>';
  _setFichas(html);
}

function fabCreativoVolver() { _renderCreativoMontaje(); }

function fabCreativoDeclarar(proc) {
  const tipos = FAB._creaSel.map(p => p.tipo);
  const compatibles = _procedimientosCompatibles(tipos);
  if (!compatibles.has(proc)) {
    const alternativas = [...compatibles].map(p => PROCEDIMIENTO_LABEL[p] || p).join(' o ');
    _mostrarExplicacion(false, '✗ Con estas piezas no sale ' + escHtml(PROCEDIMIENTO_LABEL[proc] || proc) + '. ' +
      (alternativas ? 'Lo que tienes montado encaja con: <strong>' + escHtml(alternativas) + '</strong>.'
                    : 'Prueba a cambiar las piezas o el procedimiento.'), false);
    return;
  }
  FAB._creaProc = proc;
  const dosLecturas = proc === 'parasintetica' || (proc === 'derivada' && compatibles.has('parasintetica'));
  _limpiarExplicacion();
  _setPregunta('Ahora dale un significado. Esto no puntúa: es tuyo.');
  _setFichas(
    (dosLecturas
      ? '<p style="font-size:.82rem;color:var(--muted);text-align:center;margin:0 0 12px;line-height:1.5">' +
        'Ojo: con prefijo y sufijo a la vez caben las dos lecturas. Para decidirla de verdad, comprueba si existe la forma intermedia.</p>'
      : '') +
    '<textarea id="fab-crea-def" class="fab-diario-ta" rows="3" ' +
    'placeholder="' + escHtml(_palabraCreativa()) + ': …"></textarea>' +
    '<div class="fab-row" style="margin-top:14px">' +
    '<button type="button" class="fab-btn" onclick="fabCreativoGuardar()">Guardar en mi museo</button>' +
    '</div>'
  );
}

function _loadMuseo() {
  try { const m = JSON.parse(localStorage.getItem(LS_FAB_MUSEO) || '[]'); return Array.isArray(m) ? m : []; }
  catch (e) { return []; }
}
function _saveMuseo(m) {
  try { localStorage.setItem(LS_FAB_MUSEO, JSON.stringify(m)); } catch (e) {}
}

function fabCreativoGuardar() {
  const ta = _el('fab-crea-def');
  const museo = _loadMuseo();
  museo.push({
    palabra: _palabraCreativa(),
    piezas: FAB._creaSel.map(p => _piezaConGuion(p.texto, p.tipo)),
    procedimiento: FAB._creaProc,
    definicion: ta ? ta.value.trim() : '',
    nivel: FAB.nivel,
    fecha: new Date().toISOString().slice(0, 10)
  });
  _saveMuseo(museo);
  FAB.museoNuevas = (FAB.museoNuevas || 0) + 1;
  _sincronizarMision();
  try { awardXP(15, 'fabrica_creativo'); } catch (e) {}
  try { playSuccess(); } catch (e) {}
  _limpiarExplicacion();
  _setOracion('');
  _setPregunta('');
  _setFichas('<div class="fab-fin">' +
    '<div class="fab-fin-icon">🏛</div>' +
    '<div class="fab-fin-tit">«' + escHtml(_palabraCreativa()) + '» ya está en tu museo</div>' +
    '<div class="fab-fin-sub">Llevas ' + museo.length + ' palabra' + (museo.length === 1 ? '' : 's') + ' fabricada' + (museo.length === 1 ? '' : 's') + '.</div>' +
    '<div class="fab-row">' +
    '<button type="button" class="fab-btn-sm" onclick="fabAbrirMuseo()">🏛 Ver mi museo</button>' +
    '<button type="button" class="fab-btn" onclick="fabSiguienteReto()">Siguiente reto →</button>' +
    '</div></div>');
}

// ── El Museo: la colección personal, con su modal y su versión imprimible ──

function _museoFilasHtml(entradas) {
  return entradas.map(e => '<tr><td><strong>' + escHtml(e.palabra) + '</strong><br>' +
    '<span style="font-size:.78rem;color:var(--muted)">' + escHtml((e.piezas || []).join(' + ')) + '</span></td>' +
    '<td>' + escHtml(PROCEDIMIENTO_LABEL[e.procedimiento] || e.procedimiento || '') + '</td>' +
    '<td>' + escHtml(e.definicion || '—') + '</td></tr>').join('');
}

function fabAbrirMuseo() {
  const entradas = _loadMuseo();
  const body = _el('fab-museo-body');
  if (body) {
    body.innerHTML = entradas.length === 0
      ? '<p class="fab-mesa-vacia">Tu museo está vacío todavía. Al terminar un reto puedes fabricar una palabra nueva con las piezas que has ido conociendo — y se queda aquí.</p>'
      : '<table class="fab-mesa-table"><thead><tr><th>Palabra</th><th>Procedimiento</th><th>Tu definición</th></tr></thead><tbody>' +
        _museoFilasHtml(entradas) + '</tbody></table>';
  }
  const modal = _el('fab-museo-modal');
  if (modal) modal.style.display = 'flex';
}
function fabCerrarMuseo() {
  const modal = _el('fab-museo-modal');
  if (modal) modal.style.display = 'none';
}
function fabImprimirMuseo() {
  const entradas = _loadMuseo();
  const w = window.open('', '_blank');
  if (!w) return;
  const filas = entradas.length ? _museoFilasHtml(entradas) : '<tr><td colspan="3">Museo vacío todavía.</td></tr>';
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Mi Museo de Palabras</title>' +
    '<style>body{font-family:sans-serif;padding:24px;color:#222}h1{font-size:1.25rem}' +
    'table{width:100%;border-collapse:collapse;margin-top:16px}' +
    'th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:.9rem;vertical-align:top}' +
    'th{background:#f2f2ee}</style></head><body>' +
    '<h1>🏛 Mi Museo de Palabras — La Fábrica de Palabras</h1>' +
    '<table><thead><tr><th>Palabra</th><th>Procedimiento</th><th>Tu definición</th></tr></thead><tbody>' +
    filas + '</tbody></table></body></html>');
  w.document.close();
  w.focus();
  w.print();
}

// ════════════════════════════════════════════════════════════════════════
//  RENDERIZADORES POR TIPO DE ÍTEM (§3 del schema)
// ════════════════════════════════════════════════════════════════════════

function _btnFicha(i, texto, onclickFn) {
  return '<button type="button" class="fab-op" onclick="' + onclickFn + '(' + i + ')" id="fab-op-' + i + '">' +
    escHtml(texto) + '</button>';
}
// Tras responder: se congelan los botones y se marca el resultado con
// clases, nunca con estilo inline — así el estado visual sigue viviendo
// en el CSS y basta una regla para cambiarlo en todo el módulo.
function _colorearBotones(n, esCorrecta, idxElegido) {
  for (let i = 0; i < n; i++) {
    const btn = _el('fab-op-' + i);
    if (!btn) continue;
    btn.style.pointerEvents = 'none';
    if (FAB.mode === 'exam') continue; // examen: se bloquea el click, no se revela nada
    if (esCorrecta(i)) btn.classList.add('is-ok');
    else if (i === idxElegido) btn.classList.add('is-bad');
    else btn.classList.add('is-dim');
  }
}

// ── 1. intruso ──────────────────────────────────────────────────────────
// El botón «No hay intrusa» aparece SIEMPRE, tenga o no trampa el ítem
// (si solo saliera cuando no hay intrusa, el propio botón delataría la
// respuesta — schema v1.2 §13).
function _renderIntruso(item) {
  const opciones = shuffle(item.palabras);
  _setOracion('');
  _setPregunta('¿Cuál es el intruso?');
  _setFichas('<div class="fab-stack">' +
    opciones.map((p, i) => _btnFicha(i, p, 'fabResponderIntruso')).join('') +
    '<button type="button" class="fab-op fab-op-sin" onclick="fabResponderSinIntrusa()" id="fab-op-sin">🚫 No hay intrusa</button>' +
    '</div>');
  FAB._opciones = opciones;
  FAB._item = item;
}
function fabResponderIntruso(idx) {
  const opciones = FAB._opciones, item = FAB._item;
  const acierto = !item.sin_intruso && opciones[idx] === item.respuesta;
  _colorearIntrusoResultado(idx);
  _resolverItem('intruso', acierto);
  _mostrarExplicacion(acierto, (acierto ? '✓ ' : '✗ ') + escHtml(item.feedback || ''));
}
function fabResponderSinIntrusa() {
  const item = FAB._item;
  const acierto = item.sin_intruso === true;
  _colorearIntrusoResultado(null);
  _resolverItem('intruso', acierto);
  _mostrarExplicacion(acierto, (acierto ? '✓ ' : '✗ ') + escHtml(item.feedback || ''));
}
// Colorea las palabras y el botón «No hay intrusa» a la vez, sean cual
// sean el elegido y la respuesta real (haya o no haya trampa).
function _colorearIntrusoResultado(idxPalabraElegida) {
  const opciones = FAB._opciones, item = FAB._item;
  for (let i = 0; i < opciones.length; i++) {
    const btn = _el('fab-op-' + i);
    if (!btn) continue;
    btn.style.pointerEvents = 'none';
    if (FAB.mode === 'exam') continue;
    if (!item.sin_intruso && opciones[i] === item.respuesta) btn.classList.add('is-ok');
    else if (i === idxPalabraElegida) btn.classList.add('is-bad');
    else btn.classList.add('is-dim');
  }
  const btnSin = _el('fab-op-sin');
  if (btnSin) {
    btnSin.style.pointerEvents = 'none';
    if (FAB.mode !== 'exam') {
      if (item.sin_intruso === true) btnSin.classList.add('is-ok');
      else if (idxPalabraElegida === null) btnSin.classList.add('is-bad');
      else btnSin.classList.add('is-dim');
    }
  }
}

// ── 2. agrupa ───────────────────────────────────────────────────────────
function _renderAgrupa(item) {
  const palabras = [];
  item.cestas.forEach((c, ci) => (c.palabras || []).forEach(p => palabras.push({ texto: p, cesta: ci })));
  FAB._agrupaPalabras = shuffle(palabras);
  FAB._agrupaAsignacion = {}; // idx -> cestaIdx
  FAB._agrupaSel = null;
  FAB._item = item;
  _setOracion('');
  _setPregunta('Reparte cada palabra en su cesta.');
  _renderAgrupaFichas();
}
function _renderAgrupaFichas() {
  const item = FAB._item;
  const pool = FAB._agrupaPalabras.map((p, i) => {
    if (FAB._agrupaAsignacion[i] !== undefined) return '';
    const sel = FAB._agrupaSel === i;
    return '<button type="button" class="fab-chip' + (sel ? ' is-sel' : '') +
      '" onclick="fabAgruparSeleccionar(' + i + ')">' + escHtml(p.texto) + '</button>';
  }).join('');
  const cestas = item.cestas.map((c, ci) => {
    const chips = FAB._agrupaPalabras.map((p, i) => FAB._agrupaAsignacion[i] === ci
      ? '<button type="button" class="fab-chip" onclick="fabAgruparQuitar(' + i + ')">' + escHtml(p.texto) + ' ✕</button>'
      : '').join('');
    return '<div class="fab-cesta">' +
      '<div class="fab-cesta-nombre">' + escHtml(c.nombre) + '</div>' +
      '<div class="fab-cesta-body">' + chips + '</div>' +
      '<button type="button" class="fab-btn-sm" onclick="fabAgruparColocar(' + ci + ')">Colocar aquí</button>' +
      '</div>';
  }).join('');
  const todasColocadas = Object.keys(FAB._agrupaAsignacion).length === FAB._agrupaPalabras.length;
  _setFichas('<div style="margin-bottom:12px;min-height:40px">' + pool + '</div>' + cestas +
    (todasColocadas ? '<button type="button" class="fab-btn fab-btn-block" onclick="fabAgruparComprobar()">Comprobar</button>' : ''));
}
function fabAgruparSeleccionar(i) { FAB._agrupaSel = (FAB._agrupaSel === i) ? null : i; _renderAgrupaFichas(); }
function fabAgruparQuitar(i) { delete FAB._agrupaAsignacion[i]; _renderAgrupaFichas(); }
function fabAgruparColocar(cestaIdx) {
  if (FAB._agrupaSel === null) return;
  FAB._agrupaAsignacion[FAB._agrupaSel] = cestaIdx;
  FAB._agrupaSel = null;
  _renderAgrupaFichas();
}
function fabAgruparComprobar() {
  const item = FAB._item;
  let todoBien = true;
  const detalles = [];
  FAB._agrupaPalabras.forEach((p, i) => {
    const bien = FAB._agrupaAsignacion[i] === p.cesta;
    if (!bien) {
      todoBien = false;
      const sob = (item.sobrantes || []).find(s => s.palabra === p.texto);
      if (sob) detalles.push(escHtml(sob.micro));
    }
  });
  _colorearAgrupaResultado();
  const html = (todoBien ? '✓ ' + escHtml(item.feedback || '¡Bien repartido!') : '✗ ' + escHtml(item.feedback || '') +
    (detalles.length ? '<br><br>' + detalles.join('<br>') : ''));
  _resolverItem('agrupa', todoBien);
  _mostrarExplicacion(todoBien, html);
}
function _colorearAgrupaResultado() {
  // Repintado simple: reconstruye las cestas coloreando cada chip colocado
  // (verde si está en su cesta correcta, rojo si no).
  const item = FAB._item;
  const cestasHtml = item.cestas.map((c, ci) => {
    const chips = FAB._agrupaPalabras.map((p, i) => {
      if (FAB._agrupaAsignacion[i] !== ci) return '';
      if (FAB.mode === 'exam') return '<span class="fab-chip">' + escHtml(p.texto) + '</span>';
      const bien = p.cesta === ci;
      return '<span class="fab-chip ' + (bien ? 'is-ok' : 'is-bad') + '">' +
        escHtml(p.texto) + (bien ? ' ✓' : ' ✗') + '</span>';
    }).join('');
    return '<div class="fab-cesta is-done">' +
      '<div class="fab-cesta-nombre">' + escHtml(c.nombre) + '</div>' +
      '<div class="fab-cesta-body">' + chips + '</div></div>';
  }).join('');
  _setFichas(cestasHtml);
}

// ── 3. piezas (cortar / etiquetar / capas) ─────────────────────────────
function _renderPiezas(item) {
  if (item.modo === 'cortar') return _renderPiezasCortar(item);
  if (item.modo === 'etiquetar') return _renderPiezasEtiquetar(item);
  return _renderPiezasCapas(item);
}

function _renderPiezasCortar(item) {
  FAB._item = item;
  FAB._cortesSel = new Set();
  _setOracion('');
  _setPregunta('Marca dónde se corta la palabra.');
  _renderPiezasCortarFichas();
}
function _renderPiezasCortarFichas() {
  const item = FAB._item;
  const chars = Array.from(item.palabra);
  let html = '<div class="fab-word">';
  chars.forEach((c, i) => {
    html += '<span>' + escHtml(c) + '</span>';
    if (i < chars.length - 1) {
      const activo = FAB._cortesSel.has(i + 1);
      html += '<span class="fab-cut' + (activo ? ' is-on' : '') + '" role="button" tabindex="0" ' +
        'aria-label="Cortar aquí" aria-pressed="' + activo + '" ' +
        'onclick="fabToggleCorte(' + (i + 1) + ')" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();fabToggleCorte(' + (i + 1) + ')}">' +
        (activo ? '|' : '·') + '</span>';
    }
  });
  html += '</div><button type="button" class="fab-btn fab-btn-block" style="margin-top:16px" onclick="fabComprobarCorte()">Comprobar</button>';
  _setFichas(html);
}
function fabToggleCorte(pos) {
  if (FAB._cortesSel.has(pos)) FAB._cortesSel.delete(pos); else FAB._cortesSel.add(pos);
  _renderPiezasCortarFichas();
}
function fabComprobarCorte() {
  const item = FAB._item;
  const boundaries = [...FAB._cortesSel].sort((a, b) => a - b);
  const segs = _segmentsFromBoundaries(item.palabra, boundaries);
  const ok = _segsEqual(segs, item.cortes) || (item.tolerancia || []).some(t => _segsEqual(segs, t.split('|')));
  _resolverItem('piezas', ok);
  _mostrarExplicacion(ok, (ok ? '✓ ' : '✗ Los cortes correctos son «' + item.cortes.join(' + ') + '». ') + escHtml(item.feedback || ''));
}

function _renderPiezasEtiquetar(item) {
  FAB._item = item;
  FAB._etiquetasSel = new Array(item.cortes.length).fill(null);
  const opciones = ETIQUETAS_POR_NIVEL[FAB.nivel] || ETIQUETAS_POR_NIVEL.basico;
  FAB._etiquetasOpciones = opciones;
  _setOracion('');
  _setPregunta('Nombra cada pieza.');
  _renderPiezasEtiquetarFichas();
}
function _renderPiezasEtiquetarFichas() {
  const item = FAB._item;
  const opciones = FAB._etiquetasOpciones;
  let html = '<div class="fab-row" style="margin-bottom:14px;align-items:flex-start">';
  item.cortes.forEach((seg, si) => {
    html += '<div class="fab-piece">' +
      '<div class="fab-piece-txt">' + escHtml(seg) + '</div>' +
      opciones.map(et => {
        const sel = FAB._etiquetasSel[si] === et;
        return '<button type="button" class="fab-tag' + (sel ? ' is-sel' : '') +
          '" onclick="fabEtiquetarPieza(' + si + ',\'' + et + '\')">' + ETIQUETA_LABEL[et] + '</button>';
      }).join('') + '</div>';
  });
  html += '</div>';
  const completo = FAB._etiquetasSel.every(v => v !== null);
  if (completo) {
    html += '<button type="button" class="fab-btn fab-btn-block" onclick="fabComprobarEtiquetas()">Comprobar</button>';
  }
  _setFichas(html);
}
function fabEtiquetarPieza(si, et) { FAB._etiquetasSel[si] = et; _renderPiezasEtiquetarFichas(); }
function fabComprobarEtiquetas() {
  const item = FAB._item;
  const ok = _segsEqual(FAB._etiquetasSel, item.etiquetas);
  _resolverItem('piezas', ok);
  const correctas = item.etiquetas.map(e => ETIQUETA_LABEL[e]).join(' + ');
  _mostrarExplicacion(ok, ok ? '✓ Correcto.' : '✗ El orden correcto es: ' + correctas + '.');
}

function _renderPiezasCapas(item) {
  FAB._item = item;
  const rechazadas = (item.alternativa_rechazada && item.alternativa_rechazada.capas) || [];
  const pool = [...new Set([...item.capas.map(c => c.forma), ...rechazadas])];
  FAB._capasPool = shuffle(pool);
  FAB._capasSecuencia = [];
  _setOracion('');
  _setPregunta('Ordena las capas de fabricación, de la más pequeña a «' + item.palabra + '».');
  _renderPiezasCapasFichas();
}
// `capas` (piezas · modo capas) y `cadena` son la MISMA interacción:
// ordenar una escalera de formas tomándolas de un pool. Solo cambian de
// dónde sale el pool, cuántos pasos tiene la escalera y a qué handlers
// llaman. Un único render para las dos.
function _renderEscalera(secuencia, pool, objetivo, fns) {
  const chips = _restantes(pool, secuencia).map(f =>
    '<button type="button" class="fab-chip" onclick="' + fns.anadir + '(\'' + _jsAttr(f) + '\')">' +
    escHtml(f) + '</button>').join('');
  const cadena = secuencia.length
    ? secuencia.map((f, i) => (i > 0 ? '<span class="fab-arrow">→</span>' : '') + escHtml(f)).join('')
    : '<span class="fab-chain-empty">Toca las palabras en orden</span>';
  let html = '<div class="fab-chain">' + cadena + '</div>' +
    '<div style="text-align:center;margin-bottom:10px">' + chips + '</div>';
  if (secuencia.length > 0) {
    html += '<div class="fab-row" style="margin-bottom:10px">' +
      '<button type="button" class="fab-btn-sm" onclick="' + fns.deshacer + '()">Deshacer último</button></div>';
  }
  if (secuencia.length === objetivo) {
    html += '<button type="button" class="fab-btn fab-btn-block" onclick="' + fns.comprobar + '()">Comprobar</button>';
  }
  _setFichas(html);
}

function _renderPiezasCapasFichas() {
  _renderEscalera(FAB._capasSecuencia, FAB._capasPool, FAB._item.capas.length,
    { anadir: 'fabCapaAnadir', deshacer: 'fabCapaDeshacer', comprobar: 'fabComprobarCapas' });
}
function fabCapaAnadir(forma) {
  if (FAB._capasSecuencia.length >= FAB._item.capas.length) return;
  FAB._capasSecuencia.push(forma);
  _renderPiezasCapasFichas();
}
function fabCapaDeshacer() { FAB._capasSecuencia.pop(); _renderPiezasCapasFichas(); }
function fabComprobarCapas() {
  const item = FAB._item;
  const correcta = item.capas.map(c => c.forma);
  const ok = _segsEqual(FAB._capasSecuencia, correcta);
  let html;
  if (ok) {
    html = '✓ Ese es el orden real de fabricación:<br>' +
      item.capas.map(c => escHtml(c.forma) + ' (' + (c.existe ? 'existe' : 'no existe') + ')').join(' → ');
  } else if (item.alternativa_rechazada && _segsEqual(FAB._capasSecuencia, item.alternativa_rechazada.capas)) {
    html = '✗ ' + escHtml(item.alternativa_rechazada.micro);
  } else {
    html = '✗ El orden real es: ' + correcta.map(escHtml).join(' → ');
  }
  _resolverItem('piezas', ok);
  _mostrarExplicacion(ok, html);
}

// ── 4. monta ────────────────────────────────────────────────────────────
function _renderMonta(item) {
  FAB._item = item;
  FAB._montaSel = [];
  FAB._montaEncontradas = new Set();
  _setOracion('');
  _setPregunta('Construye palabras reales con las piezas.');
  _renderMontaFichas();
}
function _renderMontaFichas() {
  const item = FAB._item;
  const minimo = item.minimo || item.validas.length;
  const piezas = item.piezas.map((p, i) => {
    const sel = FAB._montaSel.includes(i);
    return '<button type="button" class="fab-chip' + (sel ? ' is-sel' : '') +
      '" onclick="fabMontarTocar(' + i + ')">' + escHtml(p.texto) + '</button>';
  }).join('');
  let html = '<div class="fab-count">' + FAB._montaEncontradas.size + '/' + minimo + ' encontradas' +
    (FAB._montaEncontradas.size ? ': ' + [...FAB._montaEncontradas].map(escHtml).join(', ') : '') + '</div>';
  html += '<div style="text-align:center;margin-bottom:14px">' + piezas + '</div>';
  html += '<div class="fab-row">';
  if (FAB._montaSel.length > 0) html += '<button type="button" class="fab-btn-sm" onclick="fabMontarLimpiar()">Limpiar</button>';
  html += '<button type="button" class="fab-btn" onclick="fabMontarConstruir()">Construir</button></div>';
  _setFichas(html);
}
function fabMontarTocar(i) {
  const idx = FAB._montaSel.indexOf(i);
  if (idx >= 0) FAB._montaSel.splice(idx, 1); else FAB._montaSel.push(i);
  _renderMontaFichas();
}
function fabMontarLimpiar() { FAB._montaSel = []; _renderMontaFichas(); }
function fabMontarConstruir() {
  const item = FAB._item;
  const usa = FAB._montaSel.map(i => item.piezas[i].texto);
  const valida = item.validas.find(v => _arrSameSet(v.usa, usa));
  FAB._montaSel = [];
  if (valida) {
    FAB._montaEncontradas.add(valida.palabra);
    const minimo = item.minimo || item.validas.length;
    if (FAB._montaEncontradas.size >= minimo) {
      _resolverItem('monta', true);
      _mostrarExplicacion(true, '✓ ¡Completado! Has construido: ' + [...FAB._montaEncontradas].map(escHtml).join(', ') + '.');
      return;
    }
    _renderMontaFichas();
    return;
  }
  // Examen: sin reintentos. En práctica el rebote explica por qué esa
  // combinación no monta y deja seguir probando; en examen eso sería
  // fuerza bruta gratis (probar todas las combinaciones hasta acertar sin
  // penalización), así que el primer tropiezo cierra el ítem — cuente lo
  // que cuente lo que ya se había encontrado.
  if (FAB.mode === 'exam') {
    _resolverItem('monta', false);
    _mostrarExplicacion(false, '');
    return;
  }
  const rebote = (item.rebotes || []).find(r => _arrSameSet(r.usa, usa));
  _renderMontaFichas();
  _mostrarExplicacion(false,
    '✗ ' + escHtml(rebote ? rebote.micro : 'Esas piezas no forman ninguna palabra real.'), false);
}

// ── 5. par_minimo ───────────────────────────────────────────────────────
function _renderParMinimo(item) {
  FAB._item = item;
  const opciones = shuffle(item.opciones.map((o, i) => ({ ...o, _i: i })));
  FAB._opciones = opciones;
  _setPalabraFoco(item.cambio);
  _setPregunta('¿Palabra nueva o la misma con un dato?');
  _setFichas('<div class="fab-stack">' +
    opciones.map((o, i) => _btnFicha(i, o.texto, 'fabResponderOpciones')).join('') + '</div>');
}
function fabResponderOpciones(idx) {
  const opciones = FAB._opciones;
  const elegido = opciones[idx];
  _colorearBotones(opciones.length, i => opciones[i].ok, idx);
  _resolverItem(FAB._item.tipo, !!elegido.ok);
  if (FAB._item.tipo === 'clasifica_prueba' && elegido.ok) _registrarHerramienta(FAB._item);
  _mostrarExplicacion(!!elegido.ok, (elegido.ok ? '✓ ' : '✗ ') + escHtml(elegido.micro || ''));
}

// ── 6. cadena ───────────────────────────────────────────────────────────
function _renderCadena(item) {
  FAB._item = item;
  FAB._cadenaPool = shuffle([...item.pasos, ...(item.distractores || [])]);
  FAB._cadenaSecuencia = [];
  _setOracion('');
  _setPregunta('Ordena la escalera de fabricación.');
  _renderCadenaFichas();
}
function _renderCadenaFichas() {
  _renderEscalera(FAB._cadenaSecuencia, FAB._cadenaPool, FAB._item.pasos.length,
    { anadir: 'fabCadenaAnadir', deshacer: 'fabCadenaDeshacer', comprobar: 'fabComprobarCadena' });
}
function fabCadenaAnadir(p) {
  if (FAB._cadenaSecuencia.length >= FAB._item.pasos.length) return;
  FAB._cadenaSecuencia.push(p);
  _renderCadenaFichas();
}
function fabCadenaDeshacer() { FAB._cadenaSecuencia.pop(); _renderCadenaFichas(); }
function fabComprobarCadena() {
  const item = FAB._item;
  const ok = _segsEqual(FAB._cadenaSecuencia, item.pasos);
  _resolverItem('cadena', ok);
  _mostrarExplicacion(ok, (ok ? '✓ ' : '✗ El orden correcto es: ' + item.pasos.join(' → ') + '. ') + escHtml(item.feedback || ''));
}

// ── 7. juicio ───────────────────────────────────────────────────────────
function _renderJuicio(item) {
  FAB._item = item;
  FAB._juicioFase = 'veredicto';
  if (item.contexto) {
    _setOracion('<div class="fab-contexto">' + escHtml(item.contexto) + '</div><div class="fab-foco">' + escHtml(item.forma) + '</div>');
  } else {
    _setPalabraFoco(item.forma);
  }
  _setPregunta('¿Está bien formada?');
  const veredictos = ['correcta', 'norma_culta', 'no_existe', 'dudosa'];
  _setFichas('<div class="fab-stack">' +
    veredictos.map((v, i) => _btnFicha(i, VEREDICTO_LABEL[v].icon + ' ' + VEREDICTO_LABEL[v].label, 'fabResponderVeredicto')).join('') + '</div>');
  FAB._veredictos = veredictos;
}
function fabResponderVeredicto(idx) {
  const item = FAB._item;
  const veredictos = FAB._veredictos;
  const elegido = veredictos[idx];
  const acierto = elegido === item.veredicto;
  _colorearBotones(veredictos.length, i => veredictos[i] === item.veredicto, idx);
  if (item.veredicto !== 'correcta' && Array.isArray(item.opciones_causa) && item.opciones_causa.length > 0) {
    _resolverItem('juicio', acierto);
    setTimeout(() => _renderJuicioCausa(acierto), 500);
  } else {
    _resolverItem('juicio', acierto);
    _mostrarExplicacion(acierto, (acierto ? '✓ ' : '✗ ') + escHtml(item.explicacion || ''));
  }
}
function _renderJuicioCausa(veredictoAcierto) {
  const item = FAB._item;
  const causas = shuffle(item.opciones_causa);
  FAB._causas = causas;
  _setPregunta('¿Por qué?');
  _setFichas('<div class="fab-stack">' +
    causas.map((c, i) => _btnFicha(i, CAUSA_LABEL[c] || c, 'fabResponderCausa')).join('') + '</div>');
  FAB._veredictoAcierto = veredictoAcierto;
}
function fabResponderCausa(idx) {
  const item = FAB._item;
  const causas = FAB._causas;
  const acierto = causas[idx] === item.causa;
  _colorearBotones(causas.length, i => causas[i] === item.causa, idx);
  const html = (acierto ? '✓ ' : '✗ ') + escHtml(item.explicacion || '') +
    (item.forma_correcta ? '<br><br>Forma correcta: <b>' + escHtml(item.forma_correcta) + '</b>' : '');
  _mostrarExplicacion(acierto, html);
}

// ── 8. frontera ─────────────────────────────────────────────────────────
function _renderFrontera(item) {
  FAB._item = item;
  FAB._fronteraSel = new Set();
  _setPalabraFoco(item.palabra);
  _setPregunta('Elige las DOS lecturas que se defienden.');
  _renderFronteraFichas();
}
function _renderFronteraFichas() {
  const item = FAB._item;
  const html = item.opciones.map((o, i) => {
    const sel = FAB._fronteraSel.has(i);
    return '<button type="button" class="fab-op' + (sel ? ' is-sel' : '') +
      '" aria-pressed="' + sel + '" onclick="fabFronteraTocar(' + i + ')">' + escHtml(o.texto) + '</button>';
  }).join('');
  let out = '<div class="fab-stack">' + html + '</div>';
  if (FAB._fronteraSel.size === 2) {
    out += '<button type="button" class="fab-btn fab-btn-block" style="margin-top:12px" onclick="fabComprobarFrontera()">Comprobar</button>';
  }
  _setFichas(out);
}
function fabFronteraTocar(i) {
  if (FAB._fronteraSel.has(i)) FAB._fronteraSel.delete(i);
  else if (FAB._fronteraSel.size < 2) FAB._fronteraSel.add(i);
  _renderFronteraFichas();
}
function fabComprobarFrontera() {
  const item = FAB._item;
  const correctas = new Set(item.opciones.map((o, i) => o.ok ? i : null).filter(v => v !== null));
  const ok = FAB._fronteraSel.size === correctas.size && [...FAB._fronteraSel].every(i => correctas.has(i));
  const micros = item.opciones.map((o, i) => (FAB._fronteraSel.has(i) || o.ok) ? escHtml(o.texto) + ': ' + escHtml(o.micro) : null).filter(Boolean);
  _resolverItem('frontera', ok);
  _mostrarExplicacion(ok, (ok ? '✓ ' : '✗ ') + escHtml(item.explicacion || '') + '<br><br>' + micros.join('<br>'));
}

// ── 9. clasifica_prueba ────────────────────────────────────────────────
function _renderClasificaPrueba(item) {
  FAB._item = item;
  // El enunciado del ítem decide el registro de TODAS las opciones (técnico o
  // sin etiquetas), y cada una lleva su microexplicación: elegir un distractor
  // sin que la app diga qué demostraría esa prueba no enseña nada.
  const opt = (id, ok) => ({
    id, ok,
    texto: textoPrueba(id, item.enunciado),
    micro: microPrueba(id, { ok, palabra: item.palabra })
  });
  const opciones = shuffle([opt(item.prueba_id, true), ...(item.distractores || []).map(id => opt(id, false))]);
  FAB._opciones = opciones;
  const procLabel = PROCEDIMIENTO_LABEL[item.procedimiento] || item.procedimiento;
  const pregunta = item.enunciado === 'tecnico'
    ? "'" + escHtml(item.palabra) + "' es " + procLabel + '. ¿Qué prueba lo demuestra?'
    : "¿Qué demuestra que '" + escHtml(item.palabra) + "' se fabrica así?";
  _setOracion('');
  _setPregunta(pregunta);
  _setFichas('<div class="fab-stack">' +
    opciones.map((o, i) => _btnFicha(i, o.texto, 'fabResponderOpciones')).join('') + '</div>');
}

// ── 10. cascada ─────────────────────────────────────────────────────────
function _renderCascada(item) {
  FAB._item = item;
  FAB._cascadaIdx = 0;
  FAB._cascadaOk = true;
  _setPalabraFoco(item.palabra);
  _renderCascadaPaso();
}
function _renderCascadaPaso() {
  const item = FAB._item;
  const paso = item.pasos[FAB._cascadaIdx];
  _setPregunta(escHtml(paso.pregunta));
  _setFichas('<div class="fab-row">' +
    _btnFicha(0, 'Sí', 'fabResponderCascada') + _btnFicha(1, 'No', 'fabResponderCascada') + '</div>');
}
function fabResponderCascada(idx) {
  const item = FAB._item;
  const paso = item.pasos[FAB._cascadaIdx];
  const respuesta = idx === 0 ? 'si' : 'no';
  const acierto = respuesta === paso.respuesta;
  if (!acierto) FAB._cascadaOk = false;
  _colorearBotones(2, i => (i === 0 ? 'si' : 'no') === paso.respuesta, idx);
  setTimeout(() => {
    FAB._cascadaIdx++;
    if (FAB._cascadaIdx < item.pasos.length) {
      _renderCascadaPaso();
    } else {
      _resolverItem('cascada', FAB._cascadaOk);
      const resultado = item.conclusion
        ? escHtml(item.conclusion)
        : "'" + escHtml(item.palabra) + "' es " + (PROCEDIMIENTO_LABEL[item.procedimiento] || item.procedimiento) + '.';
      _mostrarExplicacion(FAB._cascadaOk, (FAB._cascadaOk ? '✓ Correcto: ' : '✗ El resultado real: ') + resultado);
    }
  }, 650);
}

const ITEM_RENDERERS = {
  intruso: _renderIntruso,
  agrupa: _renderAgrupa,
  piezas: _renderPiezas,
  monta: _renderMonta,
  par_minimo: _renderParMinimo,
  cadena: _renderCadena,
  juicio: _renderJuicio,
  frontera: _renderFrontera,
  clasifica_prueba: _renderClasificaPrueba,
  cascada: _renderCascada
};

// ── Public API + window bindings (patrón chispa/index.js) ────────────────

export {
  startFabrica, exitFabrica, fabCambiarNivel, iniciarFabricaNivel, iniciarFabricaExamenDesdeLogin,
  fabEmpezarReto, fabSiguienteItem, fabSiguienteReto,
  fabResponderIntruso, fabResponderSinIntrusa, fabAgruparSeleccionar, fabAgruparQuitar, fabAgruparColocar, fabAgruparComprobar,
  fabToggleCorte, fabComprobarCorte, fabEtiquetarPieza, fabComprobarEtiquetas,
  fabCapaAnadir, fabCapaDeshacer, fabComprobarCapas,
  fabMontarTocar, fabMontarLimpiar, fabMontarConstruir,
  fabResponderOpciones,
  fabCadenaAnadir, fabCadenaDeshacer, fabComprobarCadena,
  fabResponderVeredicto, fabResponderCausa,
  fabFronteraTocar, fabComprobarFrontera,
  fabResponderCascada,
  fabAbrirMesa, fabCerrarMesa, fabImprimirMesa,
  fabAbrirCreativo, fabCreativoTocar, fabCreativoDeshacer, fabCreativoLimpiar,
  fabCreativoCancelar, fabCreativoContinuar, fabCreativoVolver, fabCreativoDeclarar, fabCreativoGuardar,
  fabAbrirMuseo, fabCerrarMuseo, fabImprimirMuseo,
  fabPedirSalir, fabGuardarDiario, fabSaltarDiario
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startFabrica, exitFabrica, fabCambiarNivel, iniciarFabricaNivel, iniciarFabricaExamenDesdeLogin,
    fabEmpezarReto, fabSiguienteItem, fabSiguienteReto,
    fabResponderIntruso, fabResponderSinIntrusa, fabAgruparSeleccionar, fabAgruparQuitar, fabAgruparColocar, fabAgruparComprobar,
    fabToggleCorte, fabComprobarCorte, fabEtiquetarPieza, fabComprobarEtiquetas,
    fabCapaAnadir, fabCapaDeshacer, fabComprobarCapas,
    fabMontarTocar, fabMontarLimpiar, fabMontarConstruir,
    fabResponderOpciones,
    fabCadenaAnadir, fabCadenaDeshacer, fabComprobarCadena,
    fabResponderVeredicto, fabResponderCausa,
    fabFronteraTocar, fabComprobarFrontera,
    fabResponderCascada,
    fabAbrirMesa, fabCerrarMesa, fabImprimirMesa,
    fabAbrirCreativo, fabCreativoTocar, fabCreativoDeshacer, fabCreativoLimpiar,
    fabCreativoCancelar, fabCreativoContinuar, fabCreativoVolver, fabCreativoDeclarar, fabCreativoGuardar,
    fabAbrirMuseo, fabCerrarMuseo, fabImprimirMuseo,
    fabPedirSalir, fabGuardarDiario, fabSaltarDiario
  });
  Object.defineProperty(window, 'FAB', { get: () => FAB, configurable: true });
}
