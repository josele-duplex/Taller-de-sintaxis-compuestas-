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
     F1·3 (hecho) → juicio (veredicto + causa en dos pasos, patrón clonado
            de _renderJuicio/_renderJuicioCausa de fabrica/index.js) y
            par_minimo (misma forma de dato exacta que que_cambia —
            renombrado internamente a _renderContraste porque ahora sirve
            a los dos tipos).
     F1·4 (hecho, esta sesión) → analisis_inverso (piezas/slots,
            click-to-select clonado de _renderAgrupa/fabAgruparSeleccionar/
            fabAgruparColocar de fabrica/index.js) y analíticas silenciosas
            (sendBeacon, patrón _enviarSesionChispa de chispa/index.js). XP
            ya estaba desde F1·1. IMPORTANTE: las analíticas necesitan que
            Josele añada saveSesionLaboratorio_ a server/Laboratorio.gs (ver
            nota junto a _enviarAnaliticaLaboratorio más abajo) y redespliegue
            como Nueva versión; hasta entonces el sendBeacon sale pero no lo
            recoge nadie (silencioso, no rompe nada).
     F2·2 (hecha, esta sesión) → etiqueta_prueba (Estación 3): el sintagma ya
            viene etiquetado y el alumno elige qué PRUEBA lo demuestra, contra
            el repertorio de F2·1 (pruebas-sintaxis.js). Mismo patrón que
            manipulacion (resaltado del objetivo con _resaltarObjetivo) pero
            el acierto se decide comparando con item.prueba_id, no con un
            campo ok:true en las opciones — las pruebas no lo traen consigo,
            lo compara el motor. microPrueba() ya devolvía el feedback en
            interrogativo desde F2·1, aquí solo se conecta.
     F2·3 (hecha en parte, esta sesión) → Caja de Pruebas del Detective
            (§4.1 del plan): un analisis_inverso con destino:"caja_pruebas"
            que se construye bien ahora persiste el ejemplo del alumno en
            localStorage (taller_caja_pruebas_<email>), junto a la función y
            la prueba conquistada — que toma de LAB._cajaContexto, fijado
            por el último etiqueta_prueba acertado en la sesión (el schema
            de analisis_inverso no lleva función propia, así que el enlace
            es de contexto, no de dato). Visor propio (labVerCajaPruebas,
            botón "📇 Mi Caja" en la topbar) que reutiliza los mismos
            contenedores del resto del módulo. La estación de este ítem se
            fuerza a 3 en _estacionDeItem aunque su tipo de schema (y por
            tanto LAB_TIPO_ESTACION) sea el mismo del análisis inverso
            normal de Estación 2 — es la única distinción por `destino`, no
            por `tipo`, que tiene el motor.
     F2·3 (diario, hecha esta sesión) → diario metalingüístico (§4.3):
            clonado tal cual de Fábrica de Palabras (LS_FAB_DIARIO →
            LS_LAB_DIARIO), localStorage puro. El "✕ Terminar" de la topbar
            ahora llama a labPedirSalir (no a exitLaboratorio directamente):
            si hubo algún reto completado en la sesión, ofrece el diario
            antes de salir de verdad — mismo papel que fabPedirSalir. OJO:
            el plan de producto dice que reutiliza "la columna Reflexion de
            retos y misiones... que ya viaja al informe del profesor", y eso
            es incorrecto contra el código real — esa columna es la
            reflexión de opción múltiple de Fase C en Simples (dato
            distinto). El precedente real y el que se ha clonado es el
            diario de Fábrica, que no toca el servidor.
     F2·3 (puente de vuelta, hecha esta sesión) → cuando Simples detecta que
            el alumno acumula 3+ fallos HISTÓRICOS (taller_error_history, no
            solo de esta sesión) en la misma función, ofrece un botón
            "🧪 Practica esta función en el Laboratorio" en su overlay de
            feedback (js/feedback/pista-ui.js:updateLaboratorioBridgeButton,
            llamado desde showFeedback en sint/index.js). Solo se ofrece si
            pruebaDeFuncion() confirma que la Estación 3 sabe reforzar esa
            función (no todas la tienen: PN, PV, Conector, Dativo…) y solo
            en práctica/proyector, nunca en examen. Al pulsarlo, arranca
            startLaboratorio con funcionSugerida — el Laboratorio no sabe el
            nivel del alumno en Simples, así que el selector de nivel sigue
            siendo el primer paso (con un aviso "🎯 Vienes a reforzar: X");
            en cuanto elige nivel, iniciarLaboratorioNivel manda `funcion`
            a getRetosLaboratorio (server/Laboratorio.gs, F0·2, que ya
            aceptaba ese filtro — solo faltaba que el frontend lo enviara),
            con fallback a sin filtro si el pool queda vacío.
     frontera (hecho, esta sesión) → el noveno y último tipo del schema, y
            con él los NUEVE tienen render. Zona gris: dos opciones ok:true,
            las dos puntúan, y el cierre enseña siempre las dos lecturas
            (§3.8). Trae de propina el soporte de `peso` en _resolverItem
            (§6), que hasta ahora ningún tipo aplicaba. La exclusión del
            examen NO se implementa aquí: es cosa del reto (zona_gris) y del
            modo examen con PIN, que es F3.
   Pendiente:
     F2·3 (puente de ida, sin hacer TODAVÍA en el frontend) → botón al
            cerrar reto que abra Simples con la MISMA oración cargada.
            2026-08-12: el bloqueo de backend ya está resuelto —
            Server/Code_v6.gs tiene getOracionByTexto_ (endpoint
            getOracionByTexto), que busca por texto EXACTO (no por id: la
            hoja Oraciones_Banco nunca tuvo columna de ID estable) contra
            metadatos.origen_oracion_id, que ahora guarda el texto literal
            de la oración, no un código OR_NNNN (ver §9 de
            docs/Schema_Laboratorio_v1.0.md). Falta solo la parte de
            frontend: el botón en el cierre de reto, la llamada al
            endpoint, y el punto de entrada en Simples que cargue una
            única oración ya resuelta en vez de pedir el banco entero
            (investigar sint/index.js antes de tocarlo, regla 4 de
            CLAUDE.md).
   Sin examen con PIN (Laboratorio.gs no lo tiene todavía — es F3 del plan) y
   sin selector de nivel más allá de basico/medio/avanzado: solo hay contenido
   en 'medio' por ahora (lote semilla F0·3), así que basico/avanzado mostrarán
   "sin retos disponibles" hasta que existan esos lotes (F4/F5). */

// El canon de aceptabilidad (F2·1) es la fuente única de las tres marcas, los
// cuatro veredictos y las 22 causas en lenguaje de alumno. Antes vivían
// escritos a mano aquí; se movieron al dato para que el motor, quien escribe
// los lotes y el documento editorial digan exactamente lo mismo.
import { VEREDICTOS as VEREDICTO_UI, ORDEN_VEREDICTOS as VEREDICTOS,
         etiquetaCausa, llevaAsterisco } from '../../data/canon-agramatical.js';
// El repertorio de pruebas (F2·1) es la fuente única de la Estación 3: el
// reto solo apunta a un prueba_id + sus distractores, el contenido vive aquí.
import { textoPrueba, microPrueba } from '../../data/pruebas-sintaxis.js';
// Diario metalingüístico (F2·3): mismo patrón exacto que Fábrica de
// Palabras (js/modules/fabrica/index.js, LS_FAB_DIARIO) — localStorage
// puro, sin servidor. La afirmación del plan de producto §4.3 de que
// reutiliza "la columna Reflexion de retos y misiones... que ya viaja al
// informe del profesor" no se corresponde con el código real: esa columna
// (Server/Code_v6.gs, EXAM_HEADER) es la reflexión de opción múltiple de
// Fase C en Simples, un dato distinto. El precedente real de un diario
// metalingüístico de texto libre es el de Fábrica, y es puramente local.
import { LS_LAB_DIARIO } from '../../core/constants.js';

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

// funcion (F2·3): filtro opcional del puente de vuelta desde Simples.
// getRetosLaboratorio (server/Laboratorio.gs, F0·2) ya acepta el parámetro
// — filtra por la columna derivada `Funciones` — solo faltaba que el
// frontend lo enviara.
async function _cargarRetos(nivel, apiUrl, funcion) {
  if (!apiUrl) return { retos: _mockRetos(), usingMock: true };
  try {
    let url = apiUrl + '?action=getRetosLaboratorio&nivel=' + encodeURIComponent(nivel);
    if (funcion) url += '&funcion=' + encodeURIComponent(funcion);
    const r = await fetchWithTimeout(url, {}, 12000);
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
// Caso especial: analisis_inverso con destino "caja_pruebas" (ítem 3.3 del
// plan, "Tu ejemplo para la caja") es de Estación 3 aunque su tipo de schema
// sea el mismo que el análisis inverso normal de Estación 2 — el schema no
// distingue estación por tipo en ese caso, solo por `destino`.
function _estacionDeItem(item) {
  if (item.tipo === 'analisis_inverso' && item.destino === 'caja_pruebas') return 3;
  return LAB_TIPO_ESTACION[item.tipo] || 2;
}

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

// ── Resolución genérica de un ítem (puntúa, sonido, racha, XP, errores) ───
// `categoria` alimenta LAB.erroresPorTipo, que es lo que viaja en las
// analíticas silenciosas (más abajo): en manipulacion es el subtipo
// (sustituye/suprime/...), en el resto el propio tipo de ítem. Es la razón
// del eje "por prueba fallada" que pide el plan de producto §5.3 — se
// puede saber qué EXPERIMENTO falla un grupo, no solo qué función.
// `peso` (schema §6) es el único multiplicador que trae el dato: valen doble
// los ítems que caen sobre una frontera discriminante (Atr.↔CPvo, CI↔CC
// Finalidad, CD↔CI…). Se aplica aquí, a los nueve tipos por igual, no dentro
// del render de frontera: si mañana un `manipulacion` sobre CPvo lleva
// peso:2 —el validador ya avisa cuando no lo lleva— pesará doble sin tocar
// una línea. Por omisión 1, así que hoy solo cambia algo en el ítem frontera
// de LB_0070, el único del banco con peso declarado. Ojo: LAB.aciertos y
// LAB.totalItems pasan a ser PUNTOS, no ítems contados a mano; la racha, el
// XP y las analíticas por tipo siguen contando por ítem.
function _resolverItem(correcta, categoria) {
  const pesoItem = (LAB._item && typeof LAB._item.peso === 'number' && LAB._item.peso > 0) ? LAB._item.peso : 1;
  LAB.totalItems += pesoItem;
  if (correcta) {
    LAB.aciertos += pesoItem; LAB.racha++;
    if (LAB.racha > LAB.rachaMax) LAB.rachaMax = LAB.racha;
    try { playSuccess(); } catch (e) {}
    try { awardXP(2, 'laboratorio_item'); } catch (e) {}
  } else {
    LAB.racha = 0;
    if (categoria) LAB.erroresPorTipo[categoria] = (LAB.erroresPorTipo[categoria] || 0) + 1;
    try { playError(); } catch (e) {}
  }
  _actualizarStreak();
}

// ── Ciclo de sesión ────────────────────────────────────────────────────────

// funcionSugerida (F2·3, puente de vuelta desde Simples §1 del plan): la
// función que el alumno viene a reforzar, fijada por irAlLaboratorioDesdeSint
// (js/feedback/pista-ui.js). El Laboratorio no sabe el nivel del alumno en
// Simples, así que no se puede saltar el selector de nivel — solo avisarlo
// y aplicar el filtro en cuanto elige uno (_mostrarSelectorNivel más abajo).
async function startLaboratorio({ name, email, grupo, funcionSugerida }) {
  showScreen('laboratorio');
  LAB = {
    name, email, grupo, nivel: null, pool: [], retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0,
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0,
    retosCompletadosSesion: 0, erroresPorTipo: {},
    funcionSugerida: funcionSugerida || null
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
  const aviso = LAB.funcionSugerida
    ? '<p style="text-align:center;color:var(--lab-verde-dk);font-weight:700;font-size:.85rem;margin:-4px 0 14px">🎯 Vienes a reforzar: ' + escHtml(LAB.funcionSugerida) + '</p>'
    : '';
  const html = Object.keys(NIVEL_INFO).map(nv => {
    const info = NIVEL_INFO[nv];
    return '<button type="button" class="lab-nivel" onclick="iniciarLaboratorioNivel(\'' + nv + '\')">' +
      '<div class="lab-nivel-nom">' + info.icon + ' ' + escHtml(info.nombre) + '</div>' +
      '<div class="lab-nivel-desc">' + escHtml(info.desc) + '</div>' +
      '</button>';
  }).join('');
  _setFichas(aviso + html);
}

async function iniciarLaboratorioNivel(nivel) {
  LAB.nivel = nivel;
  _setPregunta('Cargando retos…');
  _setFichas('');
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  let { retos, usingMock } = await _cargarRetos(nivel, apiUrl, LAB.funcionSugerida);
  // El filtro por función puede dejar el pool vacío en un nivel/función
  // concretos (lote todavía incompleto): mejor practicar sin filtrar que
  // dejar al alumno sin nada tras el puente de vuelta desde Simples.
  if (LAB.funcionSugerida && retos.length === 0) {
    LAB.funcionSugerida = null;
    ({ retos, usingMock } = await _cargarRetos(nivel, apiUrl));
  }
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
  par_minimo: _renderContraste,
  analisis_inverso: _renderAnalisisInverso,
  frontera: _renderFrontera,
  etiqueta_prueba: _renderEtiquetaPrueba
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

// Red de seguridad: los nueve tipos del schema ya tienen render, así que
// esto solo salta si un lote trae un `tipo` desconocido (o mal escrito). No
// cuenta como acierto ni como fallo — el alumno simplemente lo salta, y no
// se le penaliza por algo que la app no sabe jugar.
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
  // Puente de ida (§9 del schema, F2·3): solo se ofrece si el reto trae
  // metadatos.origen_oracion_id — no todos los retos lo tienen todavía.
  const origenTexto = (LAB.reto && LAB.reto.metadatos && LAB.reto.metadatos.origen_oracion_id) || '';
  const puenteBtn = origenTexto
    ? '<button type="button" class="lab-btn-sm" id="lab-btn-puente" onclick="labIrASimples()">🔗 Practica esta oración en Simples</button>'
    : '';
  _setFichas('<div class="lab-fin">' +
    '<div class="lab-fin-icon">🧪</div>' +
    '<div class="lab-fin-tit">¡Reto completado!</div>' +
    '<div class="lab-fin-sub">Aciertos de la sesión: ' + LAB.aciertos + '/' + LAB.totalItems + ' (' + pct + '%)</div>' +
    '<button type="button" class="lab-btn" onclick="labSiguienteReto()">Siguiente reto →</button>' +
    puenteBtn +
    '</div>');
  _limpiarExplicacion();
}

function labSiguienteReto() { _siguienteReto(); }

// Handler del botón "🔗 Practica esta oración en Simples" (§9 del schema,
// F2·3, puente de ida). Fetch bajo demanda al pulsar, no al cerrar el
// reto: así los retos que el alumno no puentea no gastan una llamada al
// GAS. getOracionByTexto (Server/Code_v6.gs) busca por texto exacto —
// found:false es un resultado normal (oración no dada de alta todavía en
// Oraciones_Banco), no un error.
async function labIrASimples() {
  const origenTexto = (LAB.reto && LAB.reto.metadatos && LAB.reto.metadatos.origen_oracion_id) || '';
  if (!origenTexto) return;
  const btn = _el('lab-btn-puente');
  const btnReset = () => { if (btn) { btn.disabled = false; btn.textContent = '🔗 Practica esta oración en Simples'; } };
  if (btn) { btn.disabled = true; btn.textContent = 'Buscando la oración…'; }
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    alert('No hay conexión con el servidor. No se puede abrir Simples desde aquí.');
    btnReset();
    return;
  }
  try {
    const url = apiUrl + '?action=getOracionByTexto&texto=' + encodeURIComponent(origenTexto);
    const r = await fetchWithTimeout(url, {}, 8000);
    const d = await r.json();
    if (!d || d.ok === false) throw new Error((d && d.error) || 'Error del servidor.');
    if (!d.found) {
      alert('Esta oración todavía no está en el banco de Simples. Avisa a tu profesor.');
      btnReset();
      return;
    }
    if (typeof window.iniciarSintDesdeOracion !== 'function') {
      alert('No se ha podido cargar el Taller de Simples. Recarga la página e inténtalo de nuevo.');
      btnReset();
      return;
    }
    const ok = await window.iniciarSintDesdeOracion({
      name: LAB.name || '', email: LAB.email || '', grupo: LAB.grupo || '', oracion: d.oracion
    });
    if (!ok) btnReset();
  } catch (e) {
    console.error('[laboratorio] labIrASimples', e);
    alert('No se ha podido cargar la oración en Simples: ' + (e.message || 'error desconocido'));
    btnReset();
  }
}

function exitLaboratorio() { _enviarAnaliticaLaboratorio(); showScreen('portada'); }

// Bind real del botón "✕ Terminar" (index.html): si ha completado algún
// reto en la sesión, ofrece el diario antes de salir de verdad — mismo
// papel que fabPedirSalir en Fábrica. Cambiar de nivel (labCambiarNivel,
// debajo) NO pasa por aquí: no es "cerrar sesión", es seguir jugando.
function labPedirSalir() {
  if ((LAB.retosCompletadosSesion || 0) > 0) { _mostrarDiario(); return; }
  exitLaboratorio();
}

function labCambiarNivel() { _enviarAnaliticaLaboratorio(); _mostrarSelectorNivel(); }

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
  _resolverItem(acierto, 'valencia');
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
  const item = LAB._item;
  const opciones = LAB._opciones;
  const elegido = opciones[idx];
  const categoria = item.tipo === 'manipulacion' ? item.manipulacion : item.tipo;
  _colorearBotones(opciones.length, i => opciones[i].ok, idx);
  _resolverItem(!!elegido.ok, categoria);
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
  _resolverItem(acierto, 'intruso');
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

// Las cuatro opciones de veredicto se muestran siempre fijas (el veredicto es
// un enum cerrado del schema, no viene con "opciones" en el dato — igual que
// valencia). Sus etiquetas, y las de las 22 causas en lenguaje de alumno,
// vienen del canon (import de arriba): estaban escritas aquí desde F1·3 y dos
// de ellas se solapaban —«el pronombre no es el de esa función» valía igual
// para pronombre_cruzado y para leismo_laismo, que en avanzado pueden salir
// juntas—. El canon las separa por lo que de verdad las distingue: una rompe
// la gramática y la otra es cuestión de registro.

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
  _resolverItem(acierto, 'juicio');
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
    causas.map((c, i) => _btnOp(i, etiquetaCausa(c), 'labResponderCausa')).join('') + '</div>');
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
    const oracionMarcada = (llevaAsterisco(item.veredicto) ? '<span class="lab-asterisco">*</span>' : '') + escHtml(item.oracion);
    html += '<div class="lab-contraste">' +
      '<div class="lab-frase-mini">' + oracionMarcada + '</div>' +
      '<div class="lab-frase-arrow">↓</div>' +
      '<div class="lab-frase-mini">' + escHtml(item.gemela_correcta) + '</div>' +
      '</div>';
  }
  _mostrarExplicacion(acierto, html);
}

// ════════════════════════════════════════════════════════════════════════
//  ESTACIÓN 2 · MANIPULA (cont.) — analisis_inverso, F1·sesión 4
// ════════════════════════════════════════════════════════════════════════
// Patrón click-to-select (seleccionar ficha → click en destino), calcado de
// _renderAgrupa/fabAgruparSeleccionar/fabAgruparColocar de fabrica/index.js
// — incluida la decisión de fondo (sprint móvil jul-2026): nada de
// drag&drop nativo, que en pantallas táctiles daba problemas reales.
//
// Identificamos cada pieza por su ÍNDICE en item.piezas (no por su texto):
// el schema no prohíbe piezas repetidas, y solo el índice es un id estable.
// LAB._asignacion mapea índice-de-slot → índice-de-pieza; una pieza está
// "usada" si su índice aparece como algún valor de ese mapa, así que
// vaciar un slot (o pisarlo con otra pieza) la devuelve sola al banco.
//
// destino: "caja_pruebas" (schema §3.7) no se guarda todavía en ningún
// sitio — la Caja de Pruebas del Detective es pieza de F2 (§4.1 del plan).
// Por ahora se juega igual que destino: "reto", sin más consecuencia.

function _renderAnalisisInverso(item) {
  LAB._item = item;
  LAB._asignacion = {}; // slotIdx -> piezaIdx
  LAB._piezaSel = null;
  _setCorpus('<div class="lab-consigna">' + escHtml(item.consigna) + '</div>');
  _setPregunta('');
  _renderAnalisisInversoFichas();
}

function _renderAnalisisInversoFichas() {
  const item = LAB._item;
  const asign = LAB._asignacion;
  const usadas = new Set(Object.values(asign));
  const pool = item.piezas.map((texto, i) => {
    if (usadas.has(i)) return '';
    const sel = LAB._piezaSel === i;
    return '<button type="button" class="lab-chip' + (sel ? ' is-sel' : '') +
      '" onclick="labAiSeleccionar(' + i + ')">' + escHtml(texto) + '</button>';
  }).join('');
  const slotsHtml = item.slots.map((s, si) => {
    const piezaIdx = asign[si];
    const contenido = piezaIdx !== undefined
      ? '<button type="button" class="lab-chip is-sel" onclick="labAiQuitar(' + si + ')">' + escHtml(item.piezas[piezaIdx]) + ' ✕</button>'
      : '<span class="lab-slot-vacio">toca una pieza y luego aquí</span>';
    return '<div class="lab-slot" onclick="labAiColocar(' + si + ')" id="lab-slot-' + si + '">' +
      '<div class="lab-slot-rol">' + escHtml(s.rol) + '</div>' +
      '<div class="lab-slot-body">' + contenido + '</div>' +
      '</div>';
  }).join('');
  const todasLlenas = Object.keys(asign).length === item.slots.length;
  _setFichas(
    '<div class="lab-banco" style="margin-bottom:14px;min-height:40px">' + (pool || '<span class="lab-slot-vacio">— sin piezas sueltas —</span>') + '</div>' +
    '<div class="lab-slots">' + slotsHtml + '</div>' +
    (todasLlenas ? '<button type="button" class="lab-btn lab-btn-block" onclick="labAiComprobar()">Comprobar</button>' : '')
  );
}

function labAiSeleccionar(i) {
  // Defensivo: la UI nunca pinta un botón para una pieza ya colocada, pero
  // por si acaso (doble click en curso, consola de depuración) no dejamos
  // seleccionar una pieza que ya está usada en algún slot.
  if (Object.values(LAB._asignacion).includes(i)) return;
  LAB._piezaSel = (LAB._piezaSel === i) ? null : i;
  _renderAnalisisInversoFichas();
}
function labAiColocar(slotIdx) {
  if (LAB._piezaSel === null) return; // clic en un slot sin haber elegido pieza: no hace nada
  LAB._asignacion[slotIdx] = LAB._piezaSel;
  LAB._piezaSel = null;
  _renderAnalisisInversoFichas();
}
function labAiQuitar(slotIdx) {
  delete LAB._asignacion[slotIdx];
  _renderAnalisisInversoFichas();
}

function labAiComprobar() {
  const item = LAB._item;
  const asign = LAB._asignacion;
  let todoBien = true;
  const rolesFallados = [];
  item.slots.forEach((s, si) => {
    const pieza = item.piezas[asign[si]];
    const bien = Array.isArray(s.acepta) && s.acepta.includes(pieza);
    if (!bien) { todoBien = false; rolesFallados.push(s.rol); }
  });
  // Repinta los slots ya cerrados (sin onclick: la comprobación es un
  // cierre, no se puede seguir tocando).
  const slotsHtml = item.slots.map((s, si) => {
    const pieza = item.piezas[asign[si]];
    const bien = Array.isArray(s.acepta) && s.acepta.includes(pieza);
    return '<div class="lab-slot is-done">' +
      '<div class="lab-slot-rol">' + escHtml(s.rol) + '</div>' +
      '<div class="lab-slot-body"><span class="lab-chip ' + (bien ? 'is-ok' : 'is-bad') + '">' +
      escHtml(pieza) + (bien ? ' ✓' : ' ✗') + '</span></div></div>';
  }).join('');
  _setFichas('<div class="lab-slots">' + slotsHtml + '</div>');
  _resolverItem(todoBien, 'analisis_inverso');
  let html = todoBien
    ? '✓ ¡Construida! Cada pieza está donde tiene que estar.'
    : '✗ Alguna pieza no está donde tiene que estar. Revisa: ' + rolesFallados.map(escHtml).join(', ') + '.';
  // destino: "caja_pruebas" (schema §3.7, ítem 3.3 del plan): si se
  // construye bien, el ejemplo del alumno se fija en su Caja de Pruebas del
  // Detective, junto a la función/prueba que acaba de conquistar (F2·2).
  if (todoBien && item.destino === 'caja_pruebas') {
    _guardarEnCajaPruebas(LAB.email, {
      funcion: LAB._cajaContexto ? LAB._cajaContexto.funcion : null,
      pruebaId: LAB._cajaContexto ? LAB._cajaContexto.pruebaId : null,
      ejemplo: _construirEjemploCaja(item, asign),
      consigna: item.consigna,
      fecha: new Date().toISOString()
    });
    html += '<div class="lab-caja-add">📇 Guardado en tu Caja de Pruebas del Detective.</div>';
  }
  _mostrarExplicacion(todoBien, html);
}

// ════════════════════════════════════════════════════════════════════════
//  ESTACIÓN 2 · MANIPULA (cont.) — frontera, la zona gris
// ════════════════════════════════════════════════════════════════════════
// El noveno y último tipo del schema (§3.8), y el único en el que el dato
// trae DOS opciones con ok:true. Render clonado de _renderManipulacion —una
// oración arriba, una pila de opciones abajo— con tres diferencias, todas
// del schema y no de gusto visual:
//
//   1. Se muestran las DOS versiones de la oración (`oracion` + `variante`,
//      ambas obligatorias): la variante es la prueba de que la duda existe.
//      Sin ella el alumno no tiene con qué comparar y la zona gris parece
//      un capricho. Entre las dos va ⚖ y no ↓ (que en _renderContraste
//      significa "esto se ha convertido en esto"): aquí no hay flecha, hay
//      empate.
//   2. Cualquier opción con ok:true puntúa. No hay lectura preferida, así
//      que el cierre muestra SIEMPRE las micro de las dos lecturas válidas,
//      se haya pulsado la que se haya pulsado — lo que se evalúa, y lo dice
//      el propio campo `explicacion` del ítem, no es cuál eliges sino que
//      sepas por qué caben las dos. Mostrar solo la del botón pulsado
//      convertiría el ítem en un acierto ciego.
//   3. `peso` (2 en estos ítems, §6) cuenta de verdad: lo aplica
//      _resolverItem para los nueve tipos, no solo aquí.
//
// Lo que NO vive aquí: la exclusión del examen. La bandera es del reto
// entero (`zona_gris: true`, obligatoria si hay un ítem frontera — el
// validador cruza las dos cosas en los dos sentidos), y quien tiene que
// filtrarla es el modo examen con PIN, que en el Laboratorio todavía no
// existe (es F3 del plan). Cuando se escriba, el filtro es una línea:
// descartar del pool los retos con zona_gris. En práctica el ítem se juega
// con normalidad — es justo donde enseña.

function _renderFrontera(item) {
  LAB._item = item;
  const opciones = shuffle(item.opciones.map((o, i) => ({ ...o, _i: i })));
  LAB._opciones = opciones;
  _setCorpus(
    '<div class="lab-frase">' + escHtml(item.oracion) + '</div>' +
    (item.variante
      ? '<div class="lab-frase-arrow">⚖</div>' +
        '<div class="lab-frase">' + escHtml(item.variante) + '</div>'
      : '')
  );
  _setPregunta('Aquí caben dos análisis y los dos se defienden. ¿Cuál defiendes tú?');
  _setFichas('<div class="lab-stack">' +
    opciones.map((o, i) => _btnOp(i, o.texto, 'labResponderFrontera')).join('') + '</div>');
}

// No reutiliza labResponderOpciones por el cierre, no por la corrección: el
// coloreado y el "¿ha acertado?" son idénticos (basta con opciones[i].ok),
// pero el feedback tiene que sacar las dos lecturas válidas y señalar cuál
// eligió el alumno. El schema permite 2-4 opciones con exactamente dos
// correctas, así que fallar es posible: elegir una de las que no se
// defienden.
function labResponderFrontera(idx) {
  const opciones = LAB._opciones, item = LAB._item;
  const elegido = opciones[idx];
  const acierto = !!elegido.ok;
  _colorearBotones(opciones.length, i => opciones[i].ok, idx);
  _resolverItem(acierto, 'frontera');
  const lecturas = opciones.filter(o => o.ok).map(o =>
    (o === elegido ? '👉 ' : '') + '<em>' + escHtml(o.texto) + '</em> — ' + escHtml(o.micro || '')
  ).join('<br>');
  // Al acertar, la explicación del ítem («las dos son correctas, lo que se
  // evalúa es que sepas por qué») abre el cierre; al fallar, abre la micro
  // de la opción elegida —por qué esa no se sostiene— y la explicación va
  // detrás, ya con las dos lecturas buenas delante.
  let html = acierto
    ? '⚖ ' + escHtml(item.explicacion || '')
    : '✗ ' + escHtml(elegido.micro || '') +
      (item.explicacion ? '<br><br>' + escHtml(item.explicacion) : '');
  html += '<div class="lab-contraste">' + lecturas + '</div>';
  _mostrarExplicacion(acierto, html);
}

// ════════════════════════════════════════════════════════════════════════
//  ESTACIÓN 3 · ETIQUETA + PRUEBA — etiqueta_prueba, F2·sesión 2
// ════════════════════════════════════════════════════════════════════════
// Es el Banco_reflexion_metalinguistica.md jugado (plan §2.3, ítem 3.1/3.2):
// el sintagma ya viene etiquetado (objetivo.funcion) y el alumno elige QUÉ
// PRUEBA lo demuestra, no la función. El reto no redacta la prueba — apunta
// un prueba_id al repertorio (pruebas-sintaxis.js) y el motor la resuelve;
// coste de contenido por reto: cero (schema §3.9).
//
// enunciado ('tecnico' | 'simple') decide dos cosas a la vez: qué variante de
// texto de cada prueba se muestra (textoPrueba) y si la pregunta nombra la
// función. En 'basico' el validador exige 'simple' siempre — es la variante
// 3.2 del plan, la primera vez que el alumno del proyecto ve esta pantalla
// sin ninguna etiqueta.
const ETQ_PREGUNTA = {
  tecnico: (funcion) => '¿Qué prueba demuestra que este trozo es <strong>' + escHtml(funcion) + '</strong>?',
  simple:  () => '¿Cuál de estos cambios demuestra de verdad que funciona así?'
};

function _renderEtiquetaPrueba(item) {
  LAB._item = item;
  const enunciado = item.enunciado || 'tecnico';
  const ids = shuffle([item.prueba_id, ...(item.distractores || [])]);
  LAB._pruebaIds = ids;
  _setCorpus('<div class="lab-frase">' + _resaltarObjetivo(item.oracion, item.objetivo.texto) + '</div>');
  const preguntaFn = ETQ_PREGUNTA[enunciado] || ETQ_PREGUNTA.tecnico;
  _setPregunta(preguntaFn(item.objetivo.funcion));
  _setFichas('<div class="lab-stack">' +
    ids.map((id, i) => _btnOp(i, textoPrueba(id, enunciado), 'labResponderPrueba')).join('') + '</div>');
}

// El acierto es "eligió el prueba_id del ítem", no "eligió una opción
// marcada ok:true" (a diferencia de labResponderOpciones): aquí las opciones
// no traen su propio veredicto, lo decide la comparación con item.prueba_id.
// microPrueba(elegido, {ok, trozo}) hace el resto: si acierta, devuelve el
// .ok de la prueba correcta; si falla — sea el vecino confundible o un
// heurístico — devuelve su .no, que va en interrogativo (F2·1: "¿Seguro?
// Esa prueba demuestra X, ¿pasa eso aquí?"), nunca en veredicto cerrado.
function labResponderPrueba(idx) {
  const item = LAB._item;
  const ids = LAB._pruebaIds;
  const elegido = ids[idx];
  const acierto = elegido === item.prueba_id;
  _colorearBotones(ids.length, i => ids[i] === item.prueba_id, idx);
  _resolverItem(acierto, 'etiqueta_prueba');
  // La prueba recién conquistada queda disponible para el siguiente ítem del
  // reto (3.3 "Tu ejemplo para la caja", más abajo): el schema de
  // analisis_inverso no lleva función propia, así que la Caja de Pruebas la
  // toma de aquí — de la última prueba que el alumno acertó en esta sesión.
  if (acierto) LAB._cajaContexto = { funcion: item.objetivo.funcion, pruebaId: item.prueba_id };
  const micro = microPrueba(elegido, { ok: acierto, trozo: item.objetivo.texto });
  _mostrarExplicacion(acierto, (acierto ? '✓ ' : '') + escHtml(micro));
}

// ════════════════════════════════════════════════════════════════════════
//  LA CAJA DE PRUEBAS DEL DETECTIVE — F2·sesión 3, plan §4.1
// ════════════════════════════════════════════════════════════════════════
// "Tabla personal que se rellena sola": cada prueba conquistada en la
// Estación 3 (etiqueta_prueba correcto → analisis_inverso con
// destino:"caja_pruebas" construido bien) añade una fila con la función, la
// prueba en lenguaje de alumno y el ejemplo que el propio alumno fabricó.
// Persistencia: localStorage por alumno, mismo patrón de ámbito que
// taller_error_history (core/profile.js) — nada de servidor, es material de
// estudio personal, no una analítica.

const CAJA_KEY_PREFIX = 'taller_caja_pruebas_';
function _cajaKey(email) { return CAJA_KEY_PREFIX + (email || 'anon'); }

function _leerCajaPruebas(email) {
  try { return JSON.parse(localStorage.getItem(_cajaKey(email)) || '[]'); }
  catch (e) { return []; }
}

// Sin duplicar la misma prueba con el mismo ejemplo exacto (el alumno puede
// repetir el mismo reto en otra sesión y volver a construir la misma frase).
function _guardarEnCajaPruebas(email, entrada) {
  try {
    const caja = _leerCajaPruebas(email);
    const yaEsta = caja.some(c => c.pruebaId === entrada.pruebaId && c.ejemplo === entrada.ejemplo);
    if (!yaEsta) {
      caja.push(entrada);
      localStorage.setItem(_cajaKey(email), JSON.stringify(caja));
    }
  } catch (e) { console.warn('[laboratorio] no se pudo guardar en la Caja de Pruebas:', e); }
}

// Reconstruye la frase del alumno a partir de las piezas colocadas, en el
// orden de los slots (aproximación razonable para "orden": "libre" también
// — no hay forma de saber el orden gramatical real sin analizarla, y esto
// es una carta de estudio, no un ítem que se corrija).
function _construirEjemploCaja(item, asignacion) {
  const texto = item.slots.map((s, si) => item.piezas[asignacion[si]]).join(' ');
  const cap = texto.charAt(0).toUpperCase() + texto.slice(1);
  return /[.!?]$/.test(cap) ? cap : cap + '.';
}

// Visor: reutiliza los mismos contenedores lab-corpus/lab-pregunta/lab-fichas
// que el resto del módulo (mismo patrón que _mostrarSelectorNivel/_finReto),
// no una pantalla nueva. Accesible en cualquier momento desde la topbar
// ("📇 Mi Caja"), incluso antes de elegir nivel o en mitad de un reto.
function labVerCajaPruebas() {
  if (!LAB || !LAB.email) return; // sin sesión de Laboratorio arrancada, no hace nada
  LAB._enCaja = true;
  const caja = _leerCajaPruebas(LAB.email);
  const estBadge = _el('lab-estacion');
  if (estBadge) estBadge.textContent = '📇 Caja de Pruebas del Detective';
  const progEl = _el('lab-progreso');
  if (progEl) progEl.textContent = caja.length + (caja.length === 1 ? ' prueba conquistada' : ' pruebas conquistadas');
  _limpiarExplicacion();
  _setPregunta('');
  if (caja.length === 0) {
    _setCorpus('<div class="lab-titulo">📇 Tu Caja de Pruebas del Detective</div>');
    _setFichas(
      '<p style="text-align:center;color:var(--muted)">Todavía está vacía. Cada vez que aciertes una prueba en la Estación 3 y fabriques tu propio ejemplo, aparecerá aquí.</p>' +
      '<button type="button" class="lab-btn lab-btn-block" onclick="labVolverDesdeCaja()" style="margin-top:16px">← Volver</button>'
    );
    return;
  }
  const filas = caja.map(c =>
    '<div class="lab-caja-fila">' +
      '<div class="lab-caja-funcion">' + escHtml(c.funcion || '—') + '</div>' +
      '<div class="lab-caja-prueba">' + escHtml(c.pruebaId ? textoPrueba(c.pruebaId, 'simple') : '') + '</div>' +
      '<div class="lab-caja-ejemplo">«' + escHtml(c.ejemplo) + '»</div>' +
    '</div>'
  ).join('');
  _setCorpus('<div class="lab-titulo">📇 Tu Caja de Pruebas del Detective</div>');
  _setFichas(
    '<div class="lab-caja-lista">' + filas + '</div>' +
    '<button type="button" class="lab-btn lab-btn-block" onclick="labVolverDesdeCaja()" style="margin-top:16px">← Volver</button>'
  );
}

// Vuelve exactamente a donde estaba: si había un reto en curso, redibuja el
// mismo ítem (renderItemLaboratorio es de módulo, no hace falta exponerla);
// si no, al selector de nivel.
function labVolverDesdeCaja() {
  LAB._enCaja = false;
  if (LAB.reto && Array.isArray(LAB.items) && LAB.itemIdx < LAB.items.length) {
    renderItemLaboratorio();
  } else {
    _mostrarSelectorNivel();
  }
}

// ════════════════════════════════════════════════════════════════════════
//  DIARIO METALINGÜÍSTICO — F2·sesión 3, plan §4.3
// ════════════════════════════════════════════════════════════════════════
// Clonado tal cual de _mostrarDiario/_guardarEntradaDiario/fabGuardarDiario/
// fabSaltarDiario de js/modules/fabrica/index.js (mismo problema exacto:
// campo opcional al cerrar sesión, con la plantilla del marco teórico).
// Reutiliza los mismos contenedores lab-corpus/lab-pregunta/lab-fichas que
// el resto del módulo, no una pantalla nueva.

function _mostrarDiario() {
  _limpiarExplicacion();
  const estBadge = _el('lab-estacion');
  if (estBadge) estBadge.textContent = '';
  const progEl = _el('lab-progreso');
  if (progEl) progEl.textContent = '';
  _setCorpus('<div class="lab-titulo">¿Qué te llevas de esta sesión?</div>');
  _setPregunta('Es opcional — te ayuda a fijar lo que has descubierto.');
  _setFichas(
    '<textarea id="lab-diario-texto" class="lab-diario-ta" rows="4" ' +
    'placeholder="Antes pensaba que…, ahora he descubierto que…, y lo sé porque…"></textarea>' +
    '<div class="lab-row" style="margin-top:14px">' +
    '<button type="button" class="lab-btn-sm" onclick="labSaltarDiario()">Saltar</button>' +
    '<button type="button" class="lab-btn" onclick="labGuardarDiario()">Guardar y salir</button>' +
    '</div>'
  );
}

function _guardarEntradaDiario(texto) {
  try {
    const diario = JSON.parse(localStorage.getItem(LS_LAB_DIARIO) || '[]');
    diario.push({
      fecha: new Date().toISOString().slice(0, 10),
      nivel: LAB.nivel,
      retos: LAB.retosCompletadosSesion || 0,
      texto
    });
    localStorage.setItem(LS_LAB_DIARIO, JSON.stringify(diario));
  } catch (e) {}
}
function labGuardarDiario() {
  const ta = _el('lab-diario-texto');
  const texto = ta ? ta.value.trim() : '';
  if (texto) _guardarEntradaDiario(texto);
  exitLaboratorio();
}
function labSaltarDiario() { exitLaboratorio(); }

// ── Analíticas silenciosas (F1·sesión 4) ──────────────────────────────────
// Mismo patrón que _enviarSesionChispa (js/modules/chispa/index.js):
// sendBeacon con todo el payload en la query string (nunca en el body: un
// POST de sendBeacon sin body ya se tragó en silencio las analíticas de
// Chispa semanas enteras — ver la nota de doPost en Code_v6.gs). Un
// "segmento" aquí es lo jugado en un nivel, desde que se elige hasta que
// se cambia de nivel o se sale. Necesita que Josele pegue
// saveSesionLaboratorio_ (server/Laboratorio.gs) y redespliegue como
// Nueva versión — hasta entonces el POST no encuentra la acción y no pasa
// nada (ni error visible ni dato guardado: sendBeacon no informa de la
// respuesta).
function _enviarAnaliticaLaboratorio() {
  try {
    if (!LAB || !LAB.totalItems) return; // nada respondido en este nivel
    const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
    if (apiUrl && LAB.email) {
      const params = new URLSearchParams({
        action: 'saveSesionLaboratorio',
        email: LAB.email, name: LAB.name || '', grupo: LAB.grupo || '',
        nivel: LAB.nivel || '',
        retosCompletados: String(LAB.retosCompletadosSesion || 0),
        aciertos: String(LAB.aciertos || 0), totalItems: String(LAB.totalItems || 0),
        rachaMax: String(LAB.rachaMax || 0),
        errores: JSON.stringify(LAB.erroresPorTipo || {})
      });
      const url = apiUrl + '?' + params.toString();
      if (navigator.sendBeacon) navigator.sendBeacon(url);
      else fetch(url, { method: 'GET', keepalive: true }).catch(() => {});
    }
  } catch (e) { console.warn('[laboratorio analytics]', e); }
  // Reset del segmento pase lo que pase (también sin API: no acumular).
  LAB.retosCompletadosSesion = 0; LAB.aciertos = 0; LAB.totalItems = 0; LAB.rachaMax = 0; LAB.erroresPorTipo = {};
}

// Si el alumno cierra la pestaña en mitad de una sesión, el segmento en
// curso se envía igualmente (sendBeacon sobrevive al unload) — mismo
// patrón que Chispa y Sintagmas.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', function () {
    try { if (LAB && LAB.totalItems) _enviarAnaliticaLaboratorio(); } catch (e) {}
  });
}

// ── Public API + window bindings (patrón fabrica/chispa) ──────────────────

export {
  startLaboratorio, exitLaboratorio, labPedirSalir, labCambiarNivel, iniciarLaboratorioNivel,
  labEmpezarReto, labSiguienteItem, labSiguienteReto, labIrASimples,
  labResponderValencia, labResponderOpciones, labResponderIntruso,
  labResponderVeredicto, labResponderCausa, labResponderFrontera,
  labAiSeleccionar, labAiColocar, labAiQuitar, labAiComprobar,
  labResponderPrueba, labVerCajaPruebas, labVolverDesdeCaja,
  labGuardarDiario, labSaltarDiario
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startLaboratorio, exitLaboratorio, labPedirSalir, labCambiarNivel, iniciarLaboratorioNivel,
    labEmpezarReto, labSiguienteItem, labSiguienteReto, labIrASimples,
    labResponderValencia, labResponderOpciones, labResponderIntruso,
    labResponderVeredicto, labResponderCausa, labResponderFrontera,
    labAiSeleccionar, labAiColocar, labAiQuitar, labAiComprobar,
    labResponderPrueba, labVerCajaPruebas, labVolverDesdeCaja,
    labGuardarDiario, labSaltarDiario
  });
  Object.defineProperty(window, 'LAB', { get: () => LAB, configurable: true });
}
