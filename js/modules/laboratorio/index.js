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
     F5·1 (hecho, esta sesión) → investigacion (Estación 3), el DÉCIMO tipo
            del schema y el ítem estrella del nivel avanzado: la cascada de
            valores de «se» jugada peldaño a peldaño
            (docs/Cascada_Valores_del_SE_Laboratorio.md, PASO 4). Único ítem
            del módulo que encadena varias preguntas dentro de sí mismo, y
            por eso el único que NO usa _mostrarExplicacion entre pasos —
            esa caja destapa #lab-siguiente, que salta al ítem siguiente.
            Los peldaños salen de CASCADA_SE (pruebas-sintaxis.js), no del
            reto: el dato solo trae el `camino` correcto. Decisión pedagógica
            de Josele (21-ago-2026) anotada junto a _renderInvestigacion:
            al fallar un peldaño se reconduce al camino bueno.
     F5·1 (enlace con la Caja, hecho esta sesión) → una investigación limpia
            conquista la prueba que DECIDIÓ el valor (_pruebaDecisiva: el
            último peldaño del camino con prueba propia, que no siempre es el
            último jugado), la archiva en la Caja con la oración investigada
            como ejemplo y fija LAB._cajaContexto, igual que etiqueta_prueba.
            Con un solo peldaño fallado no se conquista nada. El cierre añade
            además el puente de §5.4 del documento de cascada: con qué
            etiqueta verá ese mismo «se» en Simples.
     F5·1 (tabla de equivalencias, hecho esta sesión) → al cerrar el RETO
            (_finReto, no el ítem), si conquistó alguna investigación limpia,
            las SIETE filas valor↔etiqueta de §5.4 (_tablaEquivalenciasSE),
            con la(s) conquistada(s) resaltada(s) — antes del botón de puente
            a Simples, como pide el documento. LAB._investigacionValores se
            resetea por reto en _siguienteReto y se rellena en
            _cerrarInvestigacion, solo con lo acertado sin fallos.
     F3·sesión 2 (25-ago-2026) → examen con PIN, sobre el backend ya
            construido en Server/Laboratorio.gs (createExamLaboratorio_/
            getExamenLaboratorio_/saveLaboratorioResult_, F3·sesión 1).
            `iniciarExamenLaboratorio` clonado de
            iniciarFabricaExamenDesdeLogin (js/modules/fabrica/index.js):
            el alumno llega con PIN ya validado desde el login compartido,
            no pasa por el selector de nivel (el PIN ya trae nivel/retos
            fijos, pre-filtrados a Estación 2-3 sin zona gris salvo que el
            profesor la incluyera al crear el PIN). Diferencias con
            práctica, todas centralizadas en LAB.mode==='exam' (mismo
            patrón que FAB.mode): _colorearBotones/_mostrarExplicacion no
            revelan nada ("Respuesta registrada."), sin sonido de acierto/
            fallo ni racha/Caja de Pruebas visibles, cola de retos FINITA
            (al vaciarse, _siguienteReto llama a
            _finalizarExamenLaboratorio en vez de reciclar el pool), sin
            analíticas de práctica (_enviarAnaliticaLaboratorio se salta en
            examen: la nota va aparte por _enviarResultadoLaboratorio).
     Curva de `juicio` (hecha esta sesión; decidida con Josele el
            25-ago-2026, cierra lo que el plan §5.4 dejaba abierto) →
            veredicto ✓ + causa ✓ = 100 · veredicto ✓ + causa ✗ = 40 ·
            veredicto ✗ = 0 (acierte la causa o no: quien no detecta el
            problema no ha hecho el diagnóstico). Se aplica IGUAL en
            práctica y en examen, para que se entrene lo que se mide. Con
            ella LAB.aciertos deja de ser entero: es PUNTOS (peso §6 ×
            JUICIO_PARCIAL). Ver la nota larga junto a JUICIO_PARCIAL.
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
     Reintento tras fallo en `investigacion` → la cascada de «se» sigue
            reconduciendo al camino correcto también en examen, igual que
            en práctica. Decisión abierta, análoga a que `monta` no admite
            reintentos en el examen de Fábrica.
   Sin selector de nivel más allá de basico/medio/avanzado: solo hay
   contenido en 'medio' por ahora (lote semilla F0·3), así que basico/
   avanzado mostrarán "sin retos disponibles" hasta que existan esos lotes
   (F4/F5) — también en examen. */

// El canon de aceptabilidad (F2·1) es la fuente única de las tres marcas, los
// cuatro veredictos y las 22 causas en lenguaje de alumno. Antes vivían
// escritos a mano aquí; se movieron al dato para que el motor, quien escribe
// los lotes y el documento editorial digan exactamente lo mismo.
import { VEREDICTOS as VEREDICTO_UI, ORDEN_VEREDICTOS as VEREDICTOS,
         etiquetaCausa, llevaAsterisco } from '../../data/canon-agramatical.js';
// El repertorio de pruebas (F2·1) es la fuente única de la Estación 3: el
// reto solo apunta a un prueba_id + sus distractores, el contenido vive aquí.
import { textoPrueba, microPrueba, CASCADA_SE } from '../../data/pruebas-sintaxis.js';
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
// Un solo reto que cubre los diez tipos del schema (para poder probar los
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
        distractores: ['PRU-SINT-CD-01', 'HEUR-PARA-QUIEN'], enunciado: 'tecnico' },
      // El décimo tipo (F5·1). Es la fila f del ejercicio 5 de la fuente A2,
      // el mismo ejemplo que documenta el §8.3 del documento de cascada.
      { tipo: 'investigacion', oracion: 'Se cortó el flequillo sin ayuda.',
        camino: { sustitucion: 'no', paradigma: 'cambia', refuerzo: 'a_si_mismo', funcion: 'CI' },
        valor: 'reflexivo', funcion_final: 'CI',
        explicacion: 'Admite «se cortó el flequillo a sí misma»: reflexivo. Y como ya hay otro CD en la oración («el flequillo»), el «se» no puede ser también CD — tiene que ser CI.',
        fuente_id: 'A2-EJ5-f' }
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
  etiqueta_prueba: 3, investigacion: 3
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
// Examen: nunca se revela `ok` ni `html` — plan §5.4, "sin pistas ni
// feedback hasta el final". Mismo patrón que _mostrarExplicacion en
// fabrica/index.js, centralizado aquí para no tocar los ~10 sitios que
// llaman a esta función (uno por tipo de ítem).
function _mostrarExplicacion(ok, html) {
  const el = _el('lab-explicacion');
  if (!el) return;
  el.style.display = 'block';
  if (LAB.mode === 'exam') {
    el.className = 'lab-expl';
    el.innerHTML = 'Respuesta registrada.';
  } else {
    el.className = 'lab-expl ' + (ok ? 'is-ok' : 'is-bad');
    el.innerHTML = html;
  }
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
    if (LAB.mode === 'exam') continue; // examen: se bloquea el click, no se revela nada
    if (esCorrecta(i)) btn.classList.add('is-ok');
    else if (i === idxElegido) btn.classList.add('is-bad');
    else btn.classList.add('is-dim');
  }
}

// Tramo de nota de un `juicio` acertado a medias (decisión de Josele,
// 25-ago-2026, cerrando lo que el plan de producto §5.4 dejaba abierto):
//
//   veredicto ✓ + causa ✓ → 100   veredicto ✗ + causa ✓ → 0
//   veredicto ✓ + causa ✗ →  40   veredicto ✗ + causa ✗ → 0
//
// El veredicto es la PUERTA: si el alumno no detecta que algo falla, la
// causa ya no puntúa — quien dice «esto funciona» y acto seguido señala qué
// se rompe se está contradiciendo, no ha hecho el diagnóstico. Y detectar
// el problema sin saber nombrarlo vale, pero no vale lo mismo: es la
// traducción a nota del principio «se evalúa la justificación, no el
// acierto» (plan §2, decisión 2).
//
// Se aplica IGUAL en práctica y en examen, también por decisión de Josele:
// si la causa vale el 60 % del ítem, el alumno no puede descubrirlo el día
// del examen. En práctica sigue viéndose todo el feedback; lo único que
// cambia es el porcentaje del cierre de reto.
//
// Los juicios de control (`veredicto: "gramatical"`) NO tienen causa que
// preguntar (schema §3.5), así que son de un solo paso: acertar vale 100.
const JUICIO_PARCIAL = 0.4;

// LAB.aciertos dejó de ser entero con JUICIO_PARCIAL: se muestra con un
// decimal, y sin el ".0" cuando cae redondo (que es lo normal).
function _fmtPuntos(n) {
  const r = Math.round((n || 0) * 10) / 10;
  return (r % 1 === 0) ? String(r) : r.toFixed(1);
}

// ── Resolución genérica de un ítem (puntúa, sonido, racha, XP, errores) ───
// `categoria` alimenta LAB.erroresPorTipo, que es lo que viaja en las
// analíticas silenciosas (más abajo): en manipulacion es el subtipo
// (sustituye/suprime/...), en el resto el propio tipo de ítem. Es la razón
// del eje "por prueba fallada" que pide el plan de producto §5.3 — se
// puede saber qué EXPERIMENTO falla un grupo, no solo qué función.
// `peso` (schema §6) es el único multiplicador que trae el dato: valen doble
// los ítems que caen sobre una frontera discriminante (Atr.↔CPvo, CI↔CC
// Finalidad, CD↔CI…). Se aplica aquí, a los diez tipos por igual, no dentro
// del render de frontera: si mañana un `manipulacion` sobre CPvo lleva
// peso:2 —el validador ya avisa cuando no lo lleva— pesará doble sin tocar
// una línea. Por omisión 1, así que hoy solo cambia algo en el ítem frontera
// de LB_0070, el único del banco con peso declarado. Ojo: LAB.aciertos y
// LAB.totalItems pasan a ser PUNTOS, no ítems contados a mano; la racha, el
// XP y las analíticas por tipo siguen contando por ítem.
//
// `correcta` admite dos formas: un BOOLEANO (nueve de los diez tipos son
// todo-o-nada) o una FRACCIÓN 0..1 — hoy solo la usa `juicio`, que puntúa
// veredicto y causa por separado (ver JUICIO_PARCIAL). Un acierto parcial NO
// cuenta como racha, SÍ registra el error para el informe del profesor (el
// alumno falló algo, y el profesor tiene que verlo) y da la mitad de XP.
function _resolverItem(correcta, categoria) {
  const pesoItem = (LAB._item && typeof LAB._item.peso === 'number' && LAB._item.peso > 0) ? LAB._item.peso : 1;
  const frac = (typeof correcta === 'number')
    ? Math.max(0, Math.min(1, correcta))
    : (correcta ? 1 : 0);
  LAB.totalItems += pesoItem;
  LAB.aciertos += pesoItem * frac;
  if (frac >= 1) {
    LAB.racha++;
    if (LAB.racha > LAB.rachaMax) LAB.rachaMax = LAB.racha;
    // Examen: sin sonido de acierto — es una señal de corrección tan válida
    // como el color de un botón, y aquí tampoco se revela nada.
    if (LAB.mode !== 'exam') { try { playSuccess(); } catch (e) {} }
    try { awardXP(2, 'laboratorio_item'); } catch (e) {}
  } else {
    LAB.racha = 0;
    if (categoria) LAB.erroresPorTipo[categoria] = (LAB.erroresPorTipo[categoria] || 0) + 1;
    if (LAB.mode !== 'exam') { try { playError(); } catch (e) {} }
    if (frac > 0) { try { awardXP(1, 'laboratorio_item'); } catch (e) {} }
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
  _clearLaboratorioTimer();
  LAB = {
    name, email, grupo, nivel: null, pool: [], retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0, mode: 'practice',
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0,
    retosCompletadosSesion: 0, erroresPorTipo: {},
    funcionSugerida: funcionSugerida || null
  };
  const nameEl = _el('lab-name');
  if (nameEl) nameEl.textContent = (name || '').split(' ')[0];
  // Defensivo: si la sesión anterior en esta misma pestaña fue un examen,
  // deja "Mi Caja", la racha y el temporizador ocultos — se restauran aquí
  // (mismo patrón que startFabrica).
  const cajaBtn = _el('lab-btn-caja');
  if (cajaBtn) cajaBtn.style.display = '';
  const streakBadge = _el('lab-streak');
  if (streakBadge) streakBadge.style.display = '';
  const timerEl = _el('lab-timer');
  if (timerEl) timerEl.style.display = 'none';
  _actualizarStreak();
  _mostrarSelectorNivel();
}

// Entrada de examen: el alumno llega con un PIN ya validado desde el login
// (ver dispatchLaboratorioGet_ createExamLaboratorio_ + getExamenLaboratorio_
// en server/Laboratorio.gs, F3·sesión 1). No pasa por el selector de
// nivel — el PIN ya trae el nivel/curso y la lista fija de retos que el
// profesor precomputó, ya recortada a Estación 2-3 y sin zona gris salvo
// que él la incluyera al crear el PIN. Patrón clonado de
// iniciarFabricaExamenDesdeLogin (js/modules/fabrica/index.js).
//
// La nota se calcula hoy como aciertos/totalItems (igual que Fábrica: "sin
// curva adicional"), lo que en `juicio` significa que SOLO puntúa el
// veredicto — el plan de producto §5.4 pide que el veredicto sin la causa
// no valga el ítem completo (curva 100/40/10/0), pero eso es una decisión
// de puntuación nueva sin precedente clonable, pendiente de cerrar con
// Josele. _resolverItem no ha cambiado: hereda el peso (§6) tal cual ya
// lo aplica en práctica.
async function iniciarExamenLaboratorio({ name, email, grupo, pin }) {
  const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
  if (!apiUrl) throw new Error('Sin conexión al servidor.');
  let d;
  try {
    const r = await fetchWithTimeout(apiUrl + '?action=getExamenLaboratorio&pin=' + encodeURIComponent(pin), {}, 12000);
    d = await r.json();
  } catch (e) {
    throw new Error('Error de conexión: ' + (e.message || 'timeout') + '. Inténtalo de nuevo.');
  }
  if (!d || !d.ok || !Array.isArray(d.retos) || d.retos.length === 0) {
    throw new Error((d && d.error) || 'PIN no válido.');
  }
  showScreen('laboratorio');
  _clearLaboratorioTimer();
  LAB = {
    name, email, grupo: grupo || d.grupo || '', nivel: d.nivel || 'medio',
    pool: shuffle(d.retos), retoQueue: [], reto: null, retoNum: 0,
    items: [], itemIdx: 0, estacionActual: 0, mode: 'exam',
    examPin: pin, examGrupo: d.grupo || '', examEval: d.evaluacion || '', examName: d.nombreExamen || '',
    aciertos: 0, totalItems: 0, racha: 0, rachaMax: 0, erroresPorTipo: {},
    retosCompletadosSesion: 0, _examSent: false
  };
  LAB.retoQueue = [...LAB.pool];
  const nameEl = _el('lab-name');
  if (nameEl) nameEl.textContent = (name || '').split(' ')[0];
  const info = NIVEL_INFO[LAB.nivel] || NIVEL_INFO.medio;
  const nivelBadge = _el('lab-nivel-badge');
  if (nivelBadge) nivelBadge.textContent = info.icon + ' ' + info.nombre + ' · Examen';
  const cambiarBtn = _el('lab-cambiar-nivel');
  if (cambiarBtn) cambiarBtn.style.display = 'none';
  // Sin Caja de Pruebas (es herramienta de consulta, no debe estar
  // disponible durante el examen) ni racha visible — mismo criterio que
  // Fábrica con "Mi mesa"/"Museo"/racha.
  const cajaBtn = _el('lab-btn-caja');
  if (cajaBtn) cajaBtn.style.display = 'none';
  const streakBadge = _el('lab-streak');
  if (streakBadge) streakBadge.style.display = 'none';
  if (d.timer > 0) _startLaboratorioTimer(d.timer * 60);
  _siguienteReto();
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
    // Examen: cola finita — al vaciarse, termina (no se reinicia el pool
    // en bucle como en práctica libre).
    if (LAB.mode === 'exam') { _finalizarExamenLaboratorio(); return; }
    LAB.retoQueue = shuffle(LAB.pool);
    if (LAB.retoQueue.length === 0) { _sinDatos(); return; }
  }
  LAB.retoNum++;
  LAB.reto = LAB.retoQueue.shift();
  // Schema §2.1: los ítems del reto ya vienen ordenados por estación no decreciente.
  LAB.items = LAB.reto.items;
  LAB.itemIdx = 0;
  LAB.estacionActual = 0;
  // Valores de «se» conquistados en ESTE reto (investigacion acertada, sin
  // ningún peldaño fallado) — se rellena en _cerrarInvestigacion y decide si
  // _finReto muestra la tabla de equivalencias de §5.4 del documento de cascada.
  LAB._investigacionValores = new Set();
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
  etiqueta_prueba: _renderEtiquetaPrueba,
  investigacion: _renderInvestigacion
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

// Red de seguridad: los diez tipos del schema ya tienen render, así que
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
  // §5.4 del documento de cascada: la tabla de equivalencias completa va
  // ANTES del botón de puente — es la condición explícita del documento
  // («el botón solo se ofrece después de esa tabla»).
  const huboInvestigacion = LAB._investigacionValores && LAB._investigacionValores.size > 0;
  const tablaEquiv = huboInvestigacion ? _tablaEquivalenciasSE(LAB._investigacionValores) : '';
  _setFichas('<div class="lab-fin">' +
    '<div class="lab-fin-icon">🧪</div>' +
    '<div class="lab-fin-tit">¡Reto completado!</div>' +
    '<div class="lab-fin-sub">Aciertos de la sesión: ' + _fmtPuntos(LAB.aciertos) + '/' + LAB.totalItems + ' (' + pct + '%)</div>' +
    tablaEquiv +
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
  // Mismo patrón que fabPedirSalir (js/modules/fabrica/index.js): en examen
  // se confirma antes de salir para no perder la nota sin avisar, y no se
  // muestra el diario (es una reflexión de práctica, no de examen).
  if (LAB.mode === 'exam') {
    if (confirm('¿Salir del examen? Si no has terminado, no se guardará la nota.')) {
      _clearLaboratorioTimer();
      exitLaboratorio();
    }
    return;
  }
  if ((LAB.retosCompletadosSesion || 0) > 0) { _mostrarDiario(); return; }
  exitLaboratorio();
}

function labCambiarNivel() { _enviarAnaliticaLaboratorio(); _mostrarSelectorNivel(); }

// ════════════════════════════════════════════════════════════════════════
//  EXAMEN — temporizador, cierre y envío del resultado (F3 · sesión 2)
//  Patrón clonado de _startFabricaTimer/_finalizarExamenFabrica/
//  _enviarResultadoFabrica (js/modules/fabrica/index.js).
// ════════════════════════════════════════════════════════════════════════

function _startLaboratorioTimer(seconds) {
  LAB.timerRemaining = seconds;
  const el = _el('lab-timer');
  if (el) el.style.display = 'inline-block';
  _updateLaboratorioTimerDisplay();
  LAB.timerInterval = setInterval(() => {
    LAB.timerRemaining--;
    _updateLaboratorioTimerDisplay();
    if (LAB.timerRemaining <= 0) {
      clearInterval(LAB.timerInterval);
      LAB.timerInterval = null;
      _finalizarExamenLaboratorio();
    }
  }, 1000);
}
function _updateLaboratorioTimerDisplay() {
  const el = _el('lab-timer');
  if (!el) return;
  const mm = String(Math.floor(LAB.timerRemaining / 60)).padStart(2, '0');
  const ss = String(Math.floor(LAB.timerRemaining % 60)).padStart(2, '0');
  el.textContent = '⏱ ' + mm + ':' + ss;
  el.style.background = LAB.timerRemaining < 60 ? '#FEF2F2' : LAB.timerRemaining < 180 ? '#FEF3C7' : 'var(--paper3)';
  el.style.color = LAB.timerRemaining < 60 ? 'var(--red)' : LAB.timerRemaining < 180 ? 'var(--amber)' : 'var(--ink)';
}
function _clearLaboratorioTimer() {
  if (LAB.timerInterval) { clearInterval(LAB.timerInterval); LAB.timerInterval = null; }
}

// Nota = aciertos/totalItems (puntos ya ponderados por `peso`, §6) — ver la
// nota junto a iniciarExamenLaboratorio sobre por qué `juicio` no aplica
// todavía la curva 100/40/10/0 del plan §5.4.
function _finalizarExamenLaboratorio() {
  _clearLaboratorioTimer();
  const timerEl = _el('lab-timer');
  if (timerEl) timerEl.style.display = 'none';
  const nota10 = LAB.totalItems > 0 ? Math.round((LAB.aciertos / LAB.totalItems) * 1000) / 100 : 0;
  const notaFmt = nota10.toFixed(1);
  _setCorpus('');
  _setPregunta('');
  _setFichas(
    '<div class="lab-fin">' +
    '<div class="lab-fin-icon">🧪</div>' +
    '<div class="lab-fin-tit">Examen terminado</div>' +
    '<div style="font-size:3rem;font-weight:900;color:var(--lab-verde-dk);line-height:1;margin:10px 0">' + notaFmt + '</div>' +
    '<div class="lab-fin-sub">' + _fmtPuntos(LAB.aciertos) + '/' + LAB.totalItems + ' puntos correctos</div>' +
    '<p id="lab-exam-msg" style="margin-top:16px;font-size:.85rem;font-weight:600"></p>' +
    '<button type="button" class="lab-btn lab-btn-block" style="margin-top:6px" onclick="exitLaboratorio()">Salir</button>' +
    '</div>'
  );
  _limpiarExplicacion();
  _enviarResultadoLaboratorio(nota10);
}

async function _enviarResultadoLaboratorio(nota10) {
  const msg = _el('lab-exam-msg');
  if (LAB._examSent) {
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
  // saveLaboratorioResult_ en Server/Laboratorio.gs (dispatchLaboratorioPost_
  // le pasa el objeto entero del body tal cual llega).
  const body = JSON.stringify({
    action: 'saveLaboratorioResult',
    email: LAB.email || '', name: LAB.name || '', grupo: LAB.grupo || '',
    nivel: LAB.nivel || '', modo: 'exam',
    pin: LAB.examPin || '', evaluacion: LAB.examEval || '', examen: LAB.examName || '',
    nota: String(nota10 || 0),
    // Puntos, no ítems contados: con JUICIO_PARCIAL pueden traer decimales,
    // y el redondeo evita los 2.4000000000000004 de la coma flotante.
    itemsOk: String(Math.round((LAB.aciertos || 0) * 100) / 100),
    itemsErr: String(Math.round(((LAB.totalItems || 0) - (LAB.aciertos || 0)) * 100) / 100),
    itemsTotales: String(LAB.totalItems || 0),
    erroresCategoria: JSON.stringify(LAB.erroresPorTipo || {})
  });
  try {
    // Sin Content-Type: JSON explícito para evitar el preflight CORS — mismo
    // motivo que _enviarResultadoFabrica.
    const r = await fetchWithTimeout(apiUrl, { method: 'POST', body, mode: 'cors', credentials: 'omit', redirect: 'follow' }, 12000);
    const d = await r.json();
    if (d && d.ok) {
      LAB._examSent = true;
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
  LAB._juicioVeredictoOk = null; // lo fija labResponderVeredicto
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
  const hayCausa = item.veredicto !== 'gramatical' && Array.isArray(item.opciones_causa) && item.opciones_causa.length > 0;
  if (hayCausa) {
    // La nota del ítem NO se cierra aquí: depende también de la causa
    // (JUICIO_PARCIAL). Se guarda el veredicto y la resuelve
    // labResponderCausa. La causa se pregunta AUNQUE el veredicto esté mal
    // —el alumno tiene que ver qué se rompía—, pero entonces ya no puntúa.
    LAB._juicioVeredictoOk = acierto;
    setTimeout(() => _renderJuicioCausa(item), 550);
  } else {
    // Control `gramatical`: un solo paso, no hay causa que preguntar.
    _resolverItem(acierto, 'juicio');
    _mostrarResultadoJuicio(acierto ? 1 : 0, item);
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
  const causaOk = causas[idx] === item.causa;
  _colorearBotones(causas.length, i => causas[i] === item.causa, idx);
  // Aquí se cierra la nota del ítem entero (los dos pasos), no solo la causa.
  const frac = !LAB._juicioVeredictoOk ? 0 : (causaOk ? 1 : JUICIO_PARCIAL);
  _resolverItem(frac, 'juicio');
  _mostrarResultadoJuicio(frac, item);
}

// Cierre común (con o sin paso de causa): explicación + contraste con la
// gemela, nunca la oración mala sola en pantalla (regla del plan §2.5.2).
// El asterisco (.lab-asterisco) solo se pinta si el veredicto es
// "agramatical" — norma_culta y dudoso NO llevan asterisco (regla §2.5.1).
// `frac` es la nota del ítem entero (0, JUICIO_PARCIAL o 1). El tramo del
// medio tiene mensaje propio: reconocer que el alumno SÍ detectó el problema
// —que es lo primero que se le pide— y separarlo de no haberse enterado.
function _mostrarResultadoJuicio(frac, item) {
  const pleno = frac >= 1;
  const prefijo = pleno ? '✓ '
    : (frac > 0 ? '◐ Bien visto que algo falla, pero no es eso lo que se rompe. ' : '✗ ');
  let html = prefijo + escHtml(item.explicacion || '');
  if (item.gemela_correcta) {
    const oracionMarcada = (llevaAsterisco(item.veredicto) ? '<span class="lab-asterisco">*</span>' : '') + escHtml(item.oracion);
    html += '<div class="lab-contraste">' +
      '<div class="lab-frase-mini">' + oracionMarcada + '</div>' +
      '<div class="lab-frase-arrow">↓</div>' +
      '<div class="lab-frase-mini">' + escHtml(item.gemela_correcta) + '</div>' +
      '</div>';
  }
  _mostrarExplicacion(pleno, html);
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
  // El cierre pedagógico del ítem vive en `feedback` (schema §3.0, campo común
  // a los diez tipos). Hasta aquí solo lo pintaban valencia e intruso, y este
  // es el tipo que más lo necesita: es el único sin `explicacion` ni
  // `opciones[].micro`, así que sin esto un fallo solo decía QUÉ hueco estaba
  // mal, nunca por qué. Se pinta se acierte o se falle — quien cae en la
  // trampa es justo quien necesita leerlo. Mismo patrón que `investigacion`
  // con su `explicacion`: cabecera + <br><br> + texto.
  if (item.feedback) html += '<br><br>' + escHtml(item.feedback);
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
//      _resolverItem para los diez tipos, no solo aquí.
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
//  ESTACIÓN 3 · INVESTIGACIÓN — investigacion (valores de «se»), F5·sesión 1
// ════════════════════════════════════════════════════════════════════════
// El décimo tipo del schema (§3.10) y el ítem estrella del nivel avanzado:
// el alumno baja la cascada de docs/Cascada_Valores_del_SE_Laboratorio.md
// peldaño a peldaño y clasifica el «se» POR COMPORTAMIENTO, sin que nadie le
// haya dado antes los siete nombres. Es el Tipo 5 del marco (investigación
// abierta), y la única mecánica del módulo que encadena varias preguntas
// dentro de un mismo ítem.
//
// Los peldaños NO se redactan en el reto: el dato solo trae el `camino`
// correcto ({paso: valor}) y CASCADA_SE (pruebas-sintaxis.js) dice qué
// peldaños existen, en qué orden y qué prueba demuestra cada uno — el mismo
// principio de "repertorio, no reto" que ya gobierna etiqueta_prueba (§7.3
// del schema). Coste de contenido por reto: el camino y una explicación.
//
// DECISIÓN PEDAGÓGICA (Josele, 21-ago-2026): al fallar un peldaño se corrige
// al momento y se RECONDUCE al camino bueno, en vez de dejar que el alumno
// siga su propia rama falsa hasta el final. Motivo: un fallo en el primer
// peldaño cortaría la investigación en seco y el alumno no llegaría a tocar
// los otros tres — y aquí cada peldaño enseña una prueba distinta. El precio
// es que el motor se aparta del precedente de morfología (maestro/index.js,
// que sí sigue la respuesta del alumno aunque sea falsa), y es deliberado:
// aquello es un diagnóstico tipo PAU, esto es descubrimiento guiado.
// Consecuencia directa: los peldaños que se muestran son SIEMPRE los del
// `camino` del dato, que el validador ya garantiza completo y sin sobras.

// Enunciado de cada peldaño y etiqueta de cada opción, en lenguaje de alumno.
// Vive aquí y no en el dato por lo mismo que MANIP_PREGUNTA o ETQ_PREGUNTA:
// es presentación, es igual en los 14 ítems del lote y el reto no debe
// redactarla. Los `opts` se nombran con la MISMA clave que CASCADA_SE declara
// (incluidas las etiquetas de FUNC_ORAC como 'Marca.Pas.Ref.'), para que el
// motor compare claves y no textos. Metalenguaje permitido sin reservas: la
// estación 3 es «donde se gana» (§4.2 del schema).
const CASC_SE_UI = {
  sustitucion: {
    pregunta: 'Deshaz el pronombre: ¿reaparece un «le» o un «les»?',
    opts: {
      si: 'Sí: al deshacerlo vuelve «le / les»',
      no: 'No: ahí no había ningún «le» escondido'
    },
    // P0 es el único peldaño de sí/no puro, y por eso necesita `microOk`: el
    // `.ok` de PRU-SINT-SE-05 está redactado para la rama «sí» («ese se es le
    // disfrazado»), que es lo que esa prueba DEMUESTRA cuando se elige en un
    // etiqueta_prueba. Servido tal cual al alumno que acierta respondiendo
    // «no», le estaría diciendo lo contrario de lo que acaba de descubrir.
    // Los otros cuatro peldaños no lo necesitan: sus pruebas son bifurcaciones
    // y su `.ok` ya explica las dos salidas ("si concuerda…; si no…").
    microOk: {
      si: 'Eso es: ese «se» no es reflexivo ni parte del verbo — es «le» disfrazado. El español no admite *«le lo», así que el «se» le ocupa el sitio delante de lo/la/los/las. Aquí la investigación termina.',
      no: 'Bien descartado: ahí no había ningún «le» escondido, así que este «se» no es el falso «le». Toca seguir bajando.'
    }
  },
  paradigma: {
    pregunta: 'Cambia la persona del sujeto (yo, tú, nosotros…). ¿Qué le pasa al «se»?',
    opts: {
      cambia:     'Cambia con ella: «me», «te», «nos»…',
      no_cambia:  'No cambia: sigue siendo «se» pase lo que pase'
    }
  },
  concordancia: {
    pregunta: 'Pon en plural lo que va detrás del verbo. ¿El verbo cambia con ello?',
    opts: {
      'Marca.Pas.Ref.': 'Sí: el verbo se mueve con lo que va detrás',
      'Marca.Imp.':     'No: el verbo se queda igual'
    }
  },
  refuerzo: {
    pregunta: 'Añade detrás del verbo «a sí mismo/a» o «el uno al otro». ¿Cuál encaja?',
    opts: {
      a_si_mismo:  'Encaja «a sí mismo/a»',
      uno_al_otro: 'Encaja «el uno al otro» (mutuamente)',
      ninguno:     'No encaja ninguno de los dos'
    }
  },
  funcion: {
    // Único peldaño sin prueba propia en CASCADA_SE: no es una manipulación,
    // es mirar si el hueco de CD ya está ocupado. Por eso lleva su micro aquí.
    pregunta: '¿Hay ya otro CD en la oración?',
    opts: {
      CD: 'No hay otro: el «se» es el CD',
      CI: 'Sí lo hay: el «se» tiene que ser CI'
    },
    micro: {
      ok: 'Exacto: el hueco de CD solo se ocupa una vez. Si ya está cogido, al «se» solo le queda ser CI.',
      no: '¿Seguro? Mira si en la oración hay ya un trozo que sea CD. Si lo hay, el «se» no puede serlo también.'
    }
  },
  supresion: {
    pregunta: 'Quita el «se» de la oración. ¿Qué pasa?',
    opts: {
      'Marca.Pron.': 'Se rompe, o el verbo pasa a decir otra cosa',
      'Dativo':      'Sigue en pie y dice casi lo mismo'
    }
  }
};

// Los siete valores en lenguaje de alumno. `etiqueta` es con qué nombre verá
// ese mismo «se» en el módulo de Simples: es el mapa de convivencia de §5.2
// del documento de cascada, y la respuesta a «el valor te dice qué ES ese se;
// la etiqueta te dice qué HUECO ocupa».
const VALOR_SE_UI = {
  variante_le:      { nombre: 'Variante de «le»',           etiqueta: 'CI' },
  reflexivo:        { nombre: 'Reflexivo',                   etiqueta: 'CD o CI' },
  reciproco:        { nombre: 'Recíproco',                   etiqueta: 'CD o CI' },
  morfema_verbal:   { nombre: 'Morfema del verbo',           etiqueta: 'Marca.Pron.' },
  dativo_aspectual: { nombre: 'Dativo aspectual',            etiqueta: 'Dativo' },
  pasiva_refleja:   { nombre: 'Marca de pasiva refleja',     etiqueta: 'Marca.Pas.Ref.' },
  impersonal:       { nombre: 'Marca de impersonal',         etiqueta: 'Marca.Imp.' }
};

// La tabla de equivalencias de §5.4 del documento de cascada: las SIETE filas
// completas, no solo la del valor de este alumno — es la respuesta al riesgo
// que ese apartado señala («el mismo alumno usa los dos módulos y el puente
// de ida puede llevarle a la misma oración con otro nombre encima»). Se
// muestra al cerrar el RETO (no cada ítem), y solo si el alumno conquistó
// alguna investigación limpia en él — es la frase que la abre, no una tabla
// de referencia suelta. `destacados` resalta la fila (o filas, si el reto
// trae más de un ítem investigacion) que ese alumno ha descubierto de verdad.
// Coste de implementación: cero contenido por reto, tal como pedía el propio
// documento — la tabla sale entera de VALOR_SE_UI.
function _tablaEquivalenciasSE(destacados) {
  const filas = Object.entries(VALOR_SE_UI).map(([valor, v]) =>
    '<div class="lab-equiv-fila' + (destacados.has(valor) ? ' is-destacada' : '') + '">' +
      '<div class="lab-equiv-valor">' + escHtml(v.nombre) + '</div>' +
      '<div class="lab-equiv-flecha">→</div>' +
      '<div class="lab-equiv-etiqueta">' + escHtml(v.etiqueta) + '</div>' +
    '</div>'
  ).join('');
  return '<div class="lab-equiv-tabla">' +
    '<div class="lab-equiv-titulo">El valor te dice qué ES ese «se». La etiqueta te dice qué HUECO ocupa en el Taller de Simples.</div>' +
    filas +
  '</div>';
}

// Resalta el primer «se» suelto de la oración. Deliberadamente el PRIMERO y
// solo con límites de palabra: en «Se le han caído los cuadros» hay un «se» y
// un «le», y es justo la trampa gemela que el documento (§2) quiere que el
// alumno vea — marcar el «se» y dejar el «le» a la vista es el dibujo exacto
// del problema. Si no encuentra ninguno, devuelve la oración tal cual: es
// presentación, nunca puede romper el ítem.
function _resaltarSe(oracion) {
  const m = /(^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(se)([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]|$)/i.exec(oracion);
  if (!m) return escHtml(oracion);
  const i = m.index + m[1].length;
  return escHtml(oracion.slice(0, i)) +
    '<mark class="lab-marca">' + escHtml(oracion.slice(i, i + m[2].length)) + '</mark>' +
    escHtml(oracion.slice(i + m[2].length));
}

// El rastro de peldaños ya resueltos, encima de la pregunta actual: el alumno
// tiene que ver el camino que lleva recorrido, porque el valor final no sale
// del último peldaño sino de la cadena entera.
function _cascTrailHtml() {
  const C = LAB._casc;
  if (!C || !C.trail.length) return '';
  return '<div class="lab-casc-trail">' + C.trail.map(t => {
    const ui = CASC_SE_UI[t.pasoId] || { opts: {} };
    return '<div class="lab-casc-paso' + (t.ok ? '' : ' is-fallado') + '">' +
      '<span class="lab-casc-marca">' + (t.ok ? '✓' : '✗') + '</span>' +
      '<span class="lab-casc-txt">' + escHtml(ui.opts[t.val] || t.val) + '</span>' +
      '</div>';
  }).join('') + '</div>';
}

function _renderInvestigacion(item) {
  LAB._item = item;
  const camino = item.camino || {};
  // Los peldaños del ítem, en el orden canónico de CASCADA_SE. El validador
  // (scripts/validar-banco.mjs) ya garantiza que `camino` trae exactamente los
  // que le tocan, ni de más ni de menos, así que filtrar por presencia basta.
  const pasos = CASCADA_SE.filter(p => camino[p.id] !== undefined);
  if (!pasos.length) { _renderStub(item); return; }
  LAB._casc = { pasos, idx: 0, fallos: 0, trail: [] };
  _renderCascPaso();
}

function _renderCascPaso() {
  const item = LAB._item, C = LAB._casc;
  const paso = C.pasos[C.idx];
  const ui = CASC_SE_UI[paso.id] || { pregunta: '¿Qué pasa aquí?', opts: {} };
  // Las opciones se barajan como en el resto del módulo, pero se guarda la
  // CLAVE de cada una (no el índice del dato): el acierto se decide comparando
  // con camino[paso.id], igual que etiqueta_prueba compara con prueba_id.
  const opts = shuffle(paso.opts.slice());
  C._opts = opts;
  _setCorpus(
    '<div class="lab-frase">' + _resaltarSe(item.oracion) + '</div>' +
    _cascTrailHtml()
  );
  _setPregunta(
    '<span class="lab-casc-num">Peldaño ' + (C.idx + 1) + '/' + C.pasos.length + '</span>' +
    ui.pregunta
  );
  _setFichas('<div class="lab-stack">' +
    opts.map((val, i) => _btnOp(i, ui.opts[val] || val, 'labResponderCascada')).join('') +
    '</div>');
}

// Un peldaño respondido. No usa _mostrarExplicacion a propósito: esa función
// destapa el botón #lab-siguiente, que salta al ítem SIGUIENTE — y aquí
// todavía quedan peldaños del mismo ítem. El feedback intermedio va inline,
// con su propio botón, y _mostrarExplicacion se reserva para el cierre.
function labResponderCascada(idx) {
  const item = LAB._item, C = LAB._casc;
  const paso = C.pasos[C.idx];
  const ui = CASC_SE_UI[paso.id] || { opts: {} };
  const elegido = C._opts[idx];
  const correcta = item.camino[paso.id];
  const acierto = elegido === correcta;
  _colorearBotones(C._opts.length, i => C._opts[i] === correcta, idx);
  if (!acierto) C.fallos++;
  // Se apunta SIEMPRE el valor correcto, no el elegido: es la reconducción —
  // el camino que queda dibujado en el rastro es el bueno, marcado como
  // fallado si el alumno no dio con él.
  C.trail.push({ pasoId: paso.id, val: correcta, ok: acierto });
  // El feedback del peldaño sale del repertorio de pruebas (mismo texto que
  // ya usa etiqueta_prueba, y por la misma razón: la prueba se redacta una
  // vez), con dos excepciones declaradas en CASC_SE_UI:
  //   · `microOk[valor]` — cuando el `.ok` de la prueba solo describe una de
  //     las dos ramas y serviría un texto falso al alumno que acierta por la
  //     otra (hoy solo P0/sustitucion, ver la nota allí).
  //   · `micro` — para el peldaño `funcion`, que no tiene prueba propia.
  // Al fallar se sirve siempre el `.no` de la prueba: va en interrogativo y
  // vuelve a plantear la manipulación, así que vale para las dos ramas.
  const microOk = ui.microOk && ui.microOk[correcta];
  let micro;
  if (acierto && microOk) micro = microOk;
  else if (paso.pruebaId) micro = microPrueba(paso.pruebaId, { ok: acierto, trozo: item.oracion });
  else micro = (ui.micro && (acierto ? ui.micro.ok : ui.micro.no)) || '';
  const ultimo = C.idx >= C.pasos.length - 1;
  const html =
    '<div class="lab-casc-micro' + (acierto ? ' is-ok' : ' is-bad') + '">' +
      (acierto ? '✓ ' : '✗ ') + escHtml(micro) +
      (acierto ? '' : '<div class="lab-casc-reconduce">Seguimos por el camino bueno ↓</div>') +
    '</div>' +
    '<button type="button" class="lab-btn lab-btn-block" style="margin-top:14px" onclick="labCascContinuar()">' +
      (ultimo ? 'Ver qué has descubierto →' : 'Siguiente peldaño →') +
    '</button>';
  const fichas = _el('lab-fichas');
  if (fichas) fichas.insertAdjacentHTML('beforeend', html);
}

function labCascContinuar() {
  const C = LAB._casc;
  C.idx++;
  if (C.idx < C.pasos.length) { _renderCascPaso(); return; }
  _cerrarInvestigacion();
}

// El peldaño que DECIDIÓ el valor: el último del camino que tiene prueba
// propia. No es siempre el último peldaño jugado — en las ramas de reflexivo
// y recíproco el último es `funcion` ("¿hay ya otro CD?"), que no es una
// manipulación y no tiene prueba: ahí quien decidió el valor fue `refuerzo`
// («a sí mismo» / «el uno al otro»). Es lo que se conquista para la Caja.
function _pruebaDecisiva(pasos) {
  for (let i = pasos.length - 1; i >= 0; i--) if (pasos[i].pruebaId) return pasos[i].pruebaId;
  return null;
}

// Cierre del ítem: aquí sí se puntúa, una sola vez, y aquí sí se usa
// _mostrarExplicacion (el ítem ha terminado, el botón "Siguiente →" ya toca).
// Acierta el ítem quien no falló NINGÚN peldaño: la cascada es una cadena y
// un eslabón malo lleva a un valor falso — es el argumento de §2 del documento
// («si se invierte el orden, la cascada fabrica falsos dativos aspectuales»).
function _cerrarInvestigacion() {
  const item = LAB._item, C = LAB._casc;
  const acierto = C.fallos === 0;
  _resolverItem(acierto, 'investigacion');
  const v = VALOR_SE_UI[item.valor] || { nombre: item.valor, etiqueta: '—' };
  // La etiqueta con la que verá ese mismo «se» en Simples. Es §5.4 del
  // documento de cascada —«el valor te dice qué ES ese se; la etiqueta te dice
  // qué HUECO ocupa»— y el seguro contra el riesgo real que ese apartado
  // señala: el mismo alumno usa los dos módulos y puede encontrarse la misma
  // oración con otro nombre encima. Los tres valores que SÍ son función usan
  // funcion_final (la concreta de este ítem, no el «CD o CI» genérico).
  const etiquetaSimples = item.funcion_final || v.etiqueta;
  const cabecera = acierto
    ? '✓ Investigación limpia: ni un peldaño fallado.'
    : '⚠ Has llegado al final, pero con ' + C.fallos + (C.fallos === 1 ? ' peldaño fallado' : ' peldaños fallados') + '.';
  _setCorpus(
    '<div class="lab-frase">' + _resaltarSe(item.oracion) + '</div>' +
    _cascTrailHtml()
  );
  _setPregunta('');
  // Una investigación limpia CONQUISTA la prueba que decidió el valor, igual
  // que un etiqueta_prueba acertado (F2·2). Dos efectos, como allí:
  //   · LAB._cajaContexto, por si el reto trae después un analisis_inverso con
  //     destino "caja_pruebas" — así el ejemplo que fabrique el alumno se
  //     archiva bajo esta prueba y no bajo la del ítem anterior.
  //   · la fila en la Caja, con la oración investigada como ejemplo. Aquí el
  //     alumno no fabrica la frase (este tipo no tiene piezas), pero la ha
  //     PROBADO peldaño a peldaño: es su ejemplo trabajado, no uno prestado.
  let cajaHtml = '';
  const pruebaId = _pruebaDecisiva(C.pasos);
  if (acierto && pruebaId) {
    LAB._cajaContexto = { funcion: etiquetaSimples, pruebaId };
    // Alimenta la tabla de equivalencias de §5.4 al cerrar el reto (_finReto):
    // solo cuenta lo conquistado LIMPIO, igual que la Caja de Pruebas.
    if (LAB._investigacionValores) LAB._investigacionValores.add(item.valor);
    _guardarEnCajaPruebas(LAB.email, {
      funcion: etiquetaSimples,
      pruebaId,
      ejemplo: item.oracion,
      valor: item.valor,
      fecha: new Date().toISOString()
    });
    cajaHtml = '<div class="lab-caja-add">📇 Prueba conquistada y guardada en tu Caja de Pruebas del Detective.</div>';
  }
  _setFichas(
    '<div class="lab-casc-veredicto">' +
      '<div class="lab-casc-valor">' + escHtml(v.nombre) + '</div>' +
      (item.funcion_final
        ? '<div class="lab-casc-funcion">Y ocupa un hueco de verdad en el análisis: <strong>' + escHtml(item.funcion_final) + '</strong></div>'
        : '<div class="lab-casc-funcion">Este «se» no ocupa ningún hueco del análisis: es una marca.</div>') +
      // Sin punto final si la etiqueta ya lo trae: media lista de FUNC_ORAC
      // acaba en punto (Marca.Imp., C.Rég., Atr.…) y «Marca.Imp..» canta.
      '<div class="lab-casc-puente">En el Taller de Simples verás este «se» etiquetado como <strong>' +
        escHtml(etiquetaSimples) + '</strong>' + (/\.$/.test(etiquetaSimples) ? '' : '.') + '</div>' +
    '</div>' + cajaHtml
  );
  _mostrarExplicacion(acierto, cabecera + '<br><br>' + escHtml(item.explicacion || ''));
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
    if (LAB.mode === 'exam') return; // el examen manda su nota aparte (_enviarResultadoLaboratorio)
    const apiUrl = (typeof getApiUrl === 'function') ? getApiUrl() : '';
    if (apiUrl && LAB.email) {
      const params = new URLSearchParams({
        action: 'saveSesionLaboratorio',
        email: LAB.email, name: LAB.name || '', grupo: LAB.grupo || '',
        nivel: LAB.nivel || '',
        retosCompletados: String(LAB.retosCompletadosSesion || 0),
        aciertos: String(Math.round((LAB.aciertos || 0) * 100) / 100), totalItems: String(LAB.totalItems || 0),
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
  startLaboratorio, iniciarExamenLaboratorio, exitLaboratorio, labPedirSalir, labCambiarNivel, iniciarLaboratorioNivel,
  labEmpezarReto, labSiguienteItem, labSiguienteReto, labIrASimples,
  labResponderValencia, labResponderOpciones, labResponderIntruso,
  labResponderVeredicto, labResponderCausa, labResponderFrontera,
  labAiSeleccionar, labAiColocar, labAiQuitar, labAiComprobar,
  labResponderPrueba, labResponderCascada, labCascContinuar,
  labVerCajaPruebas, labVolverDesdeCaja,
  labGuardarDiario, labSaltarDiario
};

if (typeof window !== 'undefined') {
  Object.assign(window, {
    startLaboratorio, iniciarExamenLaboratorio, exitLaboratorio, labPedirSalir, labCambiarNivel, iniciarLaboratorioNivel,
    labEmpezarReto, labSiguienteItem, labSiguienteReto, labIrASimples,
    labResponderValencia, labResponderOpciones, labResponderIntruso,
    labResponderVeredicto, labResponderCausa, labResponderFrontera,
    labAiSeleccionar, labAiColocar, labAiQuitar, labAiComprobar,
    labResponderPrueba, labResponderCascada, labCascContinuar,
    labVerCajaPruebas, labVolverDesdeCaja,
    labGuardarDiario, labSaltarDiario
  });
  Object.defineProperty(window, 'LAB', { get: () => LAB, configurable: true });
}
