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
   todavía — eso es F3). El progreso de sesión vive solo en memoria. */

import { textoPrueba, microPrueba } from '../../data/pruebas-morfologia.js';
import { LS_FAB_MESA, LS_FAB_DIARIO } from '../../core/constants.js';

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
  doble_analisis: 'Zona gris: dos segmentaciones posibles'
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
    console.warn('[fabrica] getFormacion no disponible:', e);
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

function _el(id) { return document.getElementById(id); }
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
function _mostrarExplicacion(ok, html, avanza) {
  const el = _el('fab-explicacion');
  if (!el) return;
  el.style.display = 'block';
  el.className = 'fab-expl ' + (ok ? 'is-ok' : 'is-bad');
  el.innerHTML = html;
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
    try { playSuccess(); } catch (e) {}
    try { awardXP(2, 'fabrica_item'); } catch (e) {}
  } else {
    FAB.racha = 0;
    FAB.erroresPorTipo[tipo] = (FAB.erroresPorTipo[tipo] || 0) + 1;
    try { playError(); } catch (e) {}
  }
  _actualizarStreak();
}

// ── Ciclo de sesión ───────────────────────────────────────────────────────

async function startFabrica({ name, email, grupo }) {
  showScreen('fabrica');
  FAB = {
    name, email, grupo, nivel: null, pool: [], retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0,
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0, erroresPorTipo: {},
    retosCompletadosSesion: 0
  };
  const nameEl = _el('fab-name');
  if (nameEl) nameEl.textContent = (name || '').split(' ')[0];
  _actualizarStreak();
  _mostrarSelectorNivel();
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
  _setFichas('<button type="button" class="fab-btn fab-btn-block" onclick="fabEmpezarReto()">Empezar reto →</button>');
  _actualizarProgreso();
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
    console.warn('[fabrica] tipo de ítem desconocido:', item.tipo);
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
  _setOracion('');
  _setPregunta('');
  const pct = FAB.totalItems > 0 ? Math.round((FAB.aciertos / FAB.totalItems) * 100) : 0;
  _setFichas('<div class="fab-fin">' +
    '<div class="fab-fin-icon">🏆</div>' +
    '<div class="fab-fin-tit">¡Reto completado!</div>' +
    '<div class="fab-fin-sub">Aciertos de la sesión: ' + FAB.aciertos + '/' + FAB.totalItems + ' (' + pct + '%)</div>' +
    '<button type="button" class="fab-btn fab-btn-block" onclick="fabSiguienteReto()">Siguiente reto →</button>' +
    '</div>');
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
  if ((FAB.retosCompletadosSesion || 0) > 0) { _mostrarDiario(); return; }
  exitFabrica();
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
    if (esCorrecta(i)) btn.classList.add('is-ok');
    else if (i === idxElegido) btn.classList.add('is-bad');
    else btn.classList.add('is-dim');
  }
}

// ── 1. intruso ──────────────────────────────────────────────────────────
function _renderIntruso(item) {
  const opciones = shuffle(item.palabras);
  _setOracion('');
  _setPregunta('¿Cuál es el intruso?');
  _setFichas('<div class="fab-stack">' +
    opciones.map((p, i) => _btnFicha(i, p, 'fabResponderIntruso')).join('') + '</div>');
  FAB._opciones = opciones;
  FAB._item = item;
}
function fabResponderIntruso(idx) {
  const opciones = FAB._opciones, item = FAB._item;
  const acierto = opciones[idx] === item.respuesta;
  _colorearBotones(opciones.length, i => opciones[i] === item.respuesta, idx);
  _resolverItem('intruso', acierto);
  _mostrarExplicacion(acierto, (acierto ? '✓ ' : '✗ ') + escHtml(item.feedback || ''));
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
  FAB._capasPool = shuffle(item.capas.map(c => c.forma));
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
  if (FAB._capasSecuencia.length >= FAB._capasPool.length) return;
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
  const rebote = !valida && (item.rebotes || []).find(r => _arrSameSet(r.usa, usa));
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
  // Rebote: se explica por qué esa combinación no monta, pero el ítem NO
  // se da por resuelto — el alumno vuelve a intentarlo (de ahí el `false`).
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
  _setPalabraFoco(item.forma);
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
      const procLabel = PROCEDIMIENTO_LABEL[item.procedimiento] || item.procedimiento;
      _resolverItem('cascada', FAB._cascadaOk);
      _mostrarExplicacion(FAB._cascadaOk, (FAB._cascadaOk ? '✓ Correcto: ' : '✗ El resultado real: ') + "'" + escHtml(item.palabra) + "' es " + procLabel + '.');
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
  startFabrica, exitFabrica, fabCambiarNivel, iniciarFabricaNivel,
  fabEmpezarReto, fabSiguienteItem, fabSiguienteReto,
  fabResponderIntruso, fabAgruparSeleccionar, fabAgruparQuitar, fabAgruparColocar, fabAgruparComprobar,
  fabToggleCorte, fabComprobarCorte, fabEtiquetarPieza, fabComprobarEtiquetas,
  fabCapaAnadir, fabCapaDeshacer, fabComprobarCapas,
  fabMontarTocar, fabMontarLimpiar, fabMontarConstruir,
  fabResponderOpciones,
  fabCadenaAnadir, fabCadenaDeshacer, fabComprobarCadena,
  fabResponderVeredicto, fabResponderCausa,
  fabFronteraTocar, fabComprobarFrontera,
  fabResponderCascada,
  fabAbrirMesa, fabCerrarMesa, fabImprimirMesa,
  fabPedirSalir, fabGuardarDiario, fabSaltarDiario
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startFabrica, exitFabrica, fabCambiarNivel, iniciarFabricaNivel,
    fabEmpezarReto, fabSiguienteItem, fabSiguienteReto,
    fabResponderIntruso, fabAgruparSeleccionar, fabAgruparQuitar, fabAgruparColocar, fabAgruparComprobar,
    fabToggleCorte, fabComprobarCorte, fabEtiquetarPieza, fabComprobarEtiquetas,
    fabCapaAnadir, fabCapaDeshacer, fabComprobarCapas,
    fabMontarTocar, fabMontarLimpiar, fabMontarConstruir,
    fabResponderOpciones,
    fabCadenaAnadir, fabCadenaDeshacer, fabComprobarCadena,
    fabResponderVeredicto, fabResponderCausa,
    fabFronteraTocar, fabComprobarFrontera,
    fabResponderCascada,
    fabAbrirMesa, fabCerrarMesa, fabImprimirMesa,
    fabPedirSalir, fabGuardarDiario, fabSaltarDiario
  });
  Object.defineProperty(window, 'FAB', { get: () => FAB, configurable: true });
}
