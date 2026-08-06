// ════════════════════════════════════════════════════════════════════════
//  TALLER DE SINTAXIS — Módulo "La Fábrica de Palabras" — F0 · sesión 2
//  Archivo independiente añadido al proyecto GAS sin tocar Code_v6.gs
//  (salvo la delegación de 2 líneas en doGet, igual que hizo Compuestas.gs).
//
//  Este módulo opera sobre 1 hoja nueva:
//    • Formacion_Banco — banco de "retos" de formación de palabras
//      (schema `formacion v1.0`, ver docs/Schema_Formacion_v1.0.md)
//
//  Reutiliza utilidades de Code_v6.gs (scope global compartido):
//    safeParseJSON, getColMap_, ensureSheetHeaders_
//  y de Compuestas.gs (mismo scope global):
//    stripInternalMeta_
//
//  Patrón clonado de getOracionesCompuestas_ / ensureCompBancoSheet_ /
//  dispatchCompuestasGet_ (Compuestas.gs) — mismo módulo hermano, misma
//  forma de dato (nivel + JSON en una columna + columnas derivadas).
//
//  Solo lee el banco (F1, el motor de cliente que lo consume, es sesión
//  aparte). No hay todavía modo examen/PIN para este módulo: por eso no
//  existe un parámetro `mode` como en Compuestas — Activo='TRUE' se aplica
//  siempre, según fija el schema (§1 del doc).
// ════════════════════════════════════════════════════════════════════════

// ── Nombre de la hoja nueva ──────────────────────────────────────────────
const SHEET_FORMACION_BANCO = 'Formacion_Banco';

// ── Estilo visual de cabecera (violeta, para distinguirlo a simple vista
//    del azul de Compuestas al abrir el Sheet) ────────────────────────────
const FORM_HEADER_BG = '#6a3d9a';
const FORM_HEADER_FG = '#ffffff';

// ── Cabecera (orden fijado en Schema_Formacion_v1.0.md §1; NUNCA leemos
//    por posición, siempre por nombre vía getColMap_) ────────────────────
const FORMACION_BANCO_HEADER = [
  'ID', 'Nivel', 'Curso_Min', 'Titulo_Problema', 'Procedimientos',
  'Tipos_Item', 'JSON_Reto', 'Fuente', 'Zona_Gris', 'Activo'
];

// ════════════════════════════════════════════════════════════════════════
//  ENSURE-SHEET — patrón idéntico a ensureCompBancoSheet_
// ════════════════════════════════════════════════════════════════════════

function styleFormacionHeader_(sheet, nCols) {
  if (!sheet || nCols <= 0) return;
  const header = sheet.getRange(1, 1, 1, nCols);
  header.setFontWeight('bold')
        .setBackground(FORM_HEADER_BG)
        .setFontColor(FORM_HEADER_FG)
        .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function ensureFormacionBancoSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FORMACION_BANCO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FORMACION_BANCO);
    sheet.appendRow(FORMACION_BANCO_HEADER);
    styleFormacionHeader_(sheet, FORMACION_BANCO_HEADER.length);
    sheet.setColumnWidth(4, 320); // Titulo_Problema: ancha para legibilidad
    sheet.setColumnWidth(7, 260); // JSON_Reto: ancha también
    return sheet;
  }
  // El formato de cabecera solo se aplica al CREAR la hoja (rama de arriba):
  // repintarlo en cada llamada gastaba cuota de Sheets sin necesidad
  // (mismo razonamiento que ensureCompBancoSheet_).
  ensureSheetHeaders_(sheet, FORMACION_BANCO_HEADER);
  return sheet;
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT — getFormacion
//  Lee Formacion_Banco (con caché 5 min) y devuelve los retos activos,
//  opcionalmente filtrados por Nivel. Patrón análogo a
//  getOracionesCompuestas_ / readCompBancoFromSheet_.
//
//  Parámetros (todos opcionales):
//    nivel   'basico'|'medio'|'avanzado' | '*' (u omitido) → sin filtro
// ════════════════════════════════════════════════════════════════════════

function getFormacion_(params) {
  const cacheKey = 'formacion_all';

  // 1) Cache rápida (TTL 300s). Cacheamos el banco completo (ya filtrado
  //    por Activo='TRUE', que se aplica siempre); el filtro de Nivel se
  //    aplica después en memoria, igual que en Compuestas.
  const cache = CacheService.getScriptCache();
  let banco = null;
  try {
    const cached = cache.get(cacheKey);
    if (cached) banco = JSON.parse(cached);
  } catch (e) {
    console.warn('[getFormacion_] cache parse error:', e.message);
    banco = null;
  }

  // 2) Cache miss: leer la hoja
  if (!banco) {
    banco = readFormacionBancoFromSheet_();
    try {
      const json = JSON.stringify(banco);
      if (json.length < 90000) cache.put(cacheKey, json, 300); // límite CacheService: 100KB/entrada
    } catch (e) { /* silent */ }
  }

  // 3) Filtro opcional por Nivel (exacto, no "máximo" — el schema no define
  //    una escalera de niveles para este módulo como sí hace Compuestas
  //    con nivel_max).
  const nivel = String(params.nivel || '*').trim().toLowerCase();
  const filtrados = (nivel === '*' || nivel === '')
    ? banco
    : banco.filter(r => String(r._nivel).toLowerCase() === nivel);

  // 4) Devolver SOLO el JSON_Reto limpio (sin la metaclave _nivel)
  const retos = filtrados.map(stripInternalMeta_);
  return { ok: true, retos: retos, total: retos.length, nivel: (nivel === '*' || nivel === '') ? 'todos' : nivel };
}

// Lee Formacion_Banco fila por fila y devuelve un array de objetos con el
// JSON_Reto ya parseado y la metaclave _nivel adherida. Activo='TRUE' se
// exige siempre (a diferencia de Compuestas, este módulo no tiene todavía
// un modo "practice" que también sirva borradores).
function readFormacionBancoFromSheet_() {
  const sheet = ensureFormacionBancoSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const col = getColMap_(sheet);

  const out = [];
  for (let i = 0; i < data.length; i++) {
    const row     = data[i];
    const id      = String(row[col['ID']] || '').trim();
    const nivel   = String(row[col['Nivel']] || '').trim();
    const activo  = String(row[col['Activo']] || '').trim().toUpperCase();
    const rawJson = String(row[col['JSON_Reto']] || '');

    if (!id || !rawJson) continue;
    if (activo !== 'TRUE') continue;

    const parsed = safeParseJSON(rawJson);
    if (!parsed) {
      console.warn('[readFormacionBancoFromSheet_] JSON inválido en fila', i + 2, 'ID=', id);
      continue;
    }
    // La columna ID manda sobre el "id" de dentro del JSON — mismo motivo
    // y misma regla que readCompBancoFromSheet_ (Compuestas.gs): así da
    // igual qué id traiga el JSON pegado, sirve siempre el de la hoja.
    parsed.id = id;
    parsed._nivel = nivel.toLowerCase();
    out.push(parsed);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════
//  DISPATCHER — mismo patrón que dispatchCompuestasGet_.
//  Code_v6.gs lo llama desde el fallback de doGet cuando la action no está
//  en su cadena de if/else principal ni la reconoce dispatchCompuestasGet_.
// ════════════════════════════════════════════════════════════════════════

function dispatchFormacionGet_(action, params) {
  switch (action) {
    case 'getFormacion': return getFormacion_(params);
    case 'createExamFormacion': {
      const na = (typeof requiereClaveProfesor_ === 'function') ? requiereClaveProfesor_(params) : null;
      return na || createExamFormacion_(params);
    }
    case 'getExamenFormacion': return getExamenFormacion_(params);
    case 'getResultadosFormacion': {
      const na = (typeof requiereClaveProfesor_ === 'function') ? requiereClaveProfesor_(params) : null;
      return na || getResultadosFormacion_(params);
    }
    default: return null;
  }
}

function dispatchFormacionPost_(action, payload) {
  switch (action) {
    case 'saveResultadoFormacion': return saveResultadoFormacion_(payload);
    default: return null;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  F3 — EXAMEN CON PIN + RESULTADOS
//  Patrón clonado de createExamMorfologia_ / getExamConfigMorfologia_ /
//  saveMorphResult_ (Code_v6.gs), que es el módulo hermano más reciente y
//  auditado — mismo criterio que fija el plan de producto §6 para F3.
//
//  2 hojas nuevas:
//    • Formacion_Examenes  — configuración de examen (PIN → retos fijos)
//    • Formacion_Resultados — notas de examen (solo modo examen; la
//      práctica libre no envía nada al servidor, igual que Morfología:
//      submitMorfologiaResult() solo se llama en MM.mode==='exam').
// ════════════════════════════════════════════════════════════════════════

const SHEET_FORMACION_EXAMS   = 'Formacion_Examenes';
const SHEET_FORMACION_RESULTS = 'Formacion_Resultados';

const FORMACION_EXAM_HEADER = [
  'PIN', 'Grupo', 'Evaluacion', 'Nombre_Examen', 'Nivel',
  'N_Retos', 'Timer_Min', 'Estado', 'Fecha', 'Retos_JSON'
];

const FORMACION_RESULT_HEADER = [
  'Fecha', 'Correo', 'Nombre', 'Grupo', 'Nivel', 'Modo',
  'PIN', 'Evaluacion', 'Examen',
  'Nota', 'Items_Ok', 'Items_Err', 'Items_Totales',
  'Errores_Categoria_JSON'
];

function ensureFormacionExamSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FORMACION_EXAMS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FORMACION_EXAMS);
    sheet.appendRow(FORMACION_EXAM_HEADER);
    styleFormacionHeader_(sheet, FORMACION_EXAM_HEADER.length);
    return sheet;
  }
  ensureSheetHeaders_(sheet, FORMACION_EXAM_HEADER);
  return sheet;
}

function ensureFormacionResultSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_FORMACION_RESULTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FORMACION_RESULTS);
    sheet.appendRow(FORMACION_RESULT_HEADER);
    styleFormacionHeader_(sheet, FORMACION_RESULT_HEADER.length);
    return sheet;
  }
  ensureSheetHeaders_(sheet, FORMACION_RESULT_HEADER);
  return sheet;
}

// Estación de un ítem — duplicado deliberado de `_estacionDeItem` en
// js/modules/fabrica/index.js: GAS no puede importar el módulo ES del
// cliente, y es la misma clase de duplicación que ya existe entre Simples
// y Compuestas para la curva de examen [1,0.40,0.10,0]. MANTENER EN
// SINCRONÍA si el schema formacion añade un tipo de ítem nuevo.
function _formacionEstacionDeItem_(item) {
  if (item.tipo === 'agrupa' || item.tipo === 'intruso') return 1;
  if (item.tipo === 'piezas') return item.modo === 'cortar' ? 2 : 3;
  if (item.tipo === 'clasifica_prueba' || item.tipo === 'cascada') return 3;
  return 2; // monta, par_minimo, cadena, juicio, frontera
}

// El examen solo juega Estaciones 2-3 (§5.4 del plan: la 1 es de
// aprendizaje, sin etiqueta que evaluar). Filtra los items de cada reto y
// descarta el reto entero si se queda sin items jugables.
function _formacionRetosParaExamen_(retos) {
  return retos
    .map(r => {
      const items = (r.items || []).filter(it => _formacionEstacionDeItem_(it) >= 2);
      if (items.length === 0) return null;
      return Object.assign({}, r, { items: items });
    })
    .filter(Boolean);
}

/**
 * Endpoint 'createExamFormacion'. Requiere clave de profesor. Fija PIN,
 * cierra exámenes previos con el mismo PIN, pre-computa los retos (solo
 * items de Estación 2-3) y los deja listos en Formacion_Examenes.
 * @param {{pin, nivel?, nRetos?, timerMin?, grupo?, evaluacion?, nombreExamen?}} params
 * @return {{ok:true, pin:string, nRetosReales:number} | object} error (ERR.BAD_PIN/ERR.BAD_PARAM).
 */
function createExamFormacion_(params) {
  const sheet = ensureFormacionExamSheet_();
  const col = getColMap_(sheet);
  const pin = String(params.pin || '').trim();
  if (!pin || !/^\d{4,6}$/.test(pin)) return gasError_('PIN inválido (debe tener 4-6 dígitos numéricos)', ERR.BAD_PIN);

  // Cierra exámenes previos con el mismo PIN
  const data = sheet.getDataRange().getValues();
  const estadoIdx = col['Estado'];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['PIN']]).trim() === pin && String(data[i][estadoIdx]).trim() === 'activo') {
      sheet.getRange(i + 1, estadoIdx + 1).setValue('cerrado');
    }
  }

  const nivel    = String(params.nivel || 'basico').trim().toLowerCase();
  const nRetos   = parseInt(params.nRetos) || 0;
  const timerMin = parseInt(params.timerMin) || 0;

  let retos;
  try {
    const r = getFormacion_({ nivel: nivel });
    retos = (r && r.retos) ? r.retos : [];
  } catch (e) {
    return gasError_('Error al leer Formacion_Banco: ' + e.message, ERR.EXCEPTION);
  }
  retos = _formacionRetosParaExamen_(retos);
  if (!retos.length) {
    return gasError_('No hay retos con ítems de Estación 2-3 para este nivel. Revisa el banco.', ERR.BAD_PARAM);
  }

  // Fisher–Yates + límite
  for (let j = retos.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [retos[j], retos[k]] = [retos[k], retos[j]];
  }
  if (nRetos > 0 && retos.length > nRetos) retos = retos.slice(0, nRetos);

  appendRowSafe_(sheet, FORMACION_EXAM_HEADER, {
    'PIN':           pin,
    'Grupo':         params.grupo || '',
    'Evaluacion':    params.evaluacion || '',
    'Nombre_Examen': params.nombreExamen || '',
    'Nivel':         nivel,
    'N_Retos':       retos.length,
    'Timer_Min':     timerMin,
    'Estado':        'activo',
    'Fecha':         new Date().toISOString(),
    'Retos_JSON':    JSON.stringify(retos)
  });

  try { CacheService.getScriptCache().remove('formexam_' + pin); } catch (e) {}

  return { ok: true, pin: pin, nRetosReales: retos.length };
}

/**
 * Endpoint 'getExamenFormacion'. El alumno entra con el PIN; lee la config
 * pre-computada por createExamFormacion_ (cache → hoja).
 * @param {{pin:string}} params
 * @return {object} config del examen o error (ERR.BAD_PIN/ERR.PIN_NOT_FOUND/ERR.EXAM_INACTIVE).
 */
function getExamenFormacion_(params) {
  const pin = String(params.pin || '').trim();
  if (!pin || pin.length < 4) return gasError_('PIN inválido', ERR.BAD_PIN);

  const cacheKey = 'formexam_' + pin;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_FORMACION_EXAMS);
  if (!sheet || sheet.getLastRow() < 2) {
    return gasError_('PIN no encontrado. Comprueba que has escrito los dígitos correctos.', ERR.PIN_NOT_FOUND);
  }
  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  let pinExists = false;
  for (let i = data.length - 1; i >= 0; i--) { // el más reciente primero
    if (String(data[i][col['PIN']]).trim() !== pin) continue;
    pinExists = true;
    if (String(data[i][col['Estado']] || '').trim() !== 'activo') continue;
    let retos = [];
    try { retos = JSON.parse(data[i][col['Retos_JSON']] || '[]'); } catch (e) {}
    if (!retos.length) continue;
    const result = {
      ok: true,
      retos: retos,
      nivel: String(data[i][col['Nivel']] || 'basico').trim(),
      timer: parseInt(data[i][col['Timer_Min']]) || 0,
      grupo: String(data[i][col['Grupo']] || ''),
      evaluacion: String(data[i][col['Evaluacion']] || ''),
      nombreExamen: String(data[i][col['Nombre_Examen']] || '')
    };
    try {
      const json = JSON.stringify(result);
      if (json.length < 90000) cache.put(cacheKey, json, 300);
    } catch (e) {}
    return result;
  }
  if (pinExists) {
    return gasError_('Este PIN existe pero el examen no está activo. Pídele al profesor que lo cree de nuevo.', ERR.EXAM_INACTIVE);
  }
  return gasError_('PIN no encontrado. Comprueba que has escrito los dígitos correctos.', ERR.PIN_NOT_FOUND);
}

/**
 * Endpoint 'saveResultadoFormacion' (POST). Guarda un resultado de examen
 * de la Fábrica; dedup por email+PIN igual que saveMorphResult_. La
 * práctica libre no llama a este endpoint (igual que Morfología: solo se
 * envía nota en modo examen).
 * @param {{email?,name?,grupo?,nivel?,modo?,pin?,evaluacion?,examen?,nota?,itemsOk?,itemsErr?,itemsTotales?,erroresCategoria?}} p
 * @return {{ok:true, duplicate?:boolean} | object} error (ERR.LOCK_TIMEOUT).
 */
function saveResultadoFormacion_(p) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return gasError_('Servidor ocupado, inténtalo de nuevo.', ERR.LOCK_TIMEOUT);
  }
  try {
    const sheet = ensureFormacionResultSheet_();
    const col = getColMap_(sheet);
    const email = String(p.email || '').trim().toLowerCase();
    const pin   = String(p.pin || '').trim();
    const emailIdx = col['Correo'], pinIdx = col['PIN'];
    const lastRow = sheet.getLastRow();
    if (email && pin && emailIdx !== undefined && pinIdx !== undefined && lastRow > 1) {
      const c0 = Math.min(emailIdx, pinIdx), c1 = Math.max(emailIdx, pinIdx);
      const data = sheet.getRange(2, c0 + 1, lastRow - 1, c1 - c0 + 1).getValues();
      const eRel = emailIdx - c0, pRel = pinIdx - c0;
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][eRel]).trim().toLowerCase() === email && String(data[i][pRel]).trim() === pin) {
          return { ok: true, duplicate: true };
        }
      }
    }
    appendRowSafe_(sheet, FORMACION_RESULT_HEADER, {
      'Fecha':                  new Date(),
      'Correo':                 email,
      'Nombre':                 p.name || '',
      'Grupo':                  p.grupo || '',
      'Nivel':                  p.nivel || '',
      'Modo':                   p.modo || '',
      'PIN':                    pin,
      'Evaluacion':             p.evaluacion || '',
      'Examen':                 p.examen || '',
      'Nota':                   parseFloat(p.nota) || 0,
      'Items_Ok':               parseInt(p.itemsOk) || 0,
      'Items_Err':              parseInt(p.itemsErr) || 0,
      'Items_Totales':          parseInt(p.itemsTotales) || 0,
      'Errores_Categoria_JSON': p.erroresCategoria || '{}'
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint 'getResultadosFormacion'. Panel del profesor lee resultados,
 * opcionalmente filtrados por grupo/evaluación/nivel. Patrón clonado de
 * getResultadosCompuestas_ (Compuestas.gs).
 * @param {{grupo?, evaluacion?, nivel?}} params
 * @return {{ok:true, results:object[], total:number}}
 */
function getResultadosFormacion_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_FORMACION_RESULTS);
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, results: [] };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  const grupo      = String(params.grupo      || '').trim().toLowerCase();
  const evaluacion = String(params.evaluacion || '').trim().toLowerCase();
  const nivel      = String(params.nivel      || '').trim().toLowerCase();

  const results = [];
  data.forEach(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i]; });
    if (grupo && String(obj['Grupo'] || '').trim().toLowerCase() !== grupo) return;
    if (evaluacion && String(obj['Evaluacion'] || '').trim().toLowerCase() !== evaluacion) return;
    if (nivel && String(obj['Nivel'] || '').trim().toLowerCase() !== nivel) return;
    results.push(obj);
  });
  return { ok: true, results: results, total: results.length };
}
