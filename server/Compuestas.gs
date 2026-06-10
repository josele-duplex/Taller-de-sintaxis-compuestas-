// ════════════════════════════════════════════════════════════════════════
//  TALLER DE SINTAXIS — Módulo de Oración Compuesta — v1.0
//  Archivo independiente añadido al proyecto GAS sin tocar Code_v6.gs.
//
//  Este módulo opera sobre 3 hojas nuevas e independientes:
//    • Compuestas_Banco         — banco de ejercicios compuestos
//    • Compuestas_Examenes      — configuración de exámenes compuestos
//    • Compuestas_Resultados    — resultados de alumnos en compuestas
//
//  Más 2 filas nuevas en la hoja Config existente:
//    • compuestas_activo  → 'Sí' / 'No' (interruptor del módulo)
//    • compuestas_version → '1' (esquema de JSON_Compuesta)
//
//  Reutiliza utilidades de Code_v6.gs (scope global compartido):
//    safeParseJSON, getColMap_, buildRow_, appendRowSafe_,
//    writeRowSafe_, ensureSheetHeaders_, SHEET_CONFIG.
//
//  Patrón clonado exactamente de createExam_ / getExamConfig_ / saveResult_.
// ════════════════════════════════════════════════════════════════════════

// ── Nombres de hojas nuevas ──────────────────────────────────────────────
const SHEET_COMPUESTAS_BANCO         = 'Compuestas_Banco';
const SHEET_COMPUESTAS_EXAMENES      = 'Compuestas_Examenes';
const SHEET_COMPUESTAS_RESULTADOS    = 'Compuestas_Resultados';   // solo examen con PIN
const SHEET_COMPUESTAS_PRACTICA_LOG  = 'Compuestas_Practica_Log'; // solo practica libre

// ── Estilo visual unificado para las cabeceras (igual que setupSheetUI_)
const COMP_HEADER_BG = '#1f4e78';
const COMP_HEADER_FG = '#ffffff';

// ── Cabeceras (orden visual en la hoja, pero NUNCA leemos por posición) ──
const COMP_BANCO_HEADER = [
  'ID', 'Texto', 'Tipo_Oracion', 'Subtipo', 'Nivel',
  'N_Proposiciones', 'JSON_Compuesta', 'Activo', 'Tags_JSON', 'Notas_Internas'
];

const COMP_EXAM_HEADER = [
  'PIN', 'Grupo', 'Evaluacion', 'Nombre_Examen',
  'Tipo_Oracion', 'Subtipo', 'Nivel_Max', 'N_Proposiciones_Max',
  'N_Ejercicios', 'Timer_Min', 'Fases_Activas',
  'Estado', 'Fecha', 'Oraciones_JSON'
];

// Cabecera de la hoja Compuestas_Resultados (SOLO examen con PIN).
// Equivale conceptualmente a Alumnos_Resultados de simples.
const COMP_RESULT_HEADER = [
  'Fecha', 'Correo', 'Nombre', 'Grupo', 'Evaluacion', 'PIN', 'Modo',
  'Total_Ejercicios', 'Completados', 'Nota',
  'Fase0_Pts', 'Fase1_Pts', 'Fase2_Pts', 'Fase3_Pts',
  'Fase4_Pts', 'Fase5_Pts', 'Fase6_Pts',
  'Detalle_JSON'
];

// Cabecera de la hoja Compuestas_Practica_Log (SOLO practica libre).
// Antes vivian las dos en SHEET_COMPUESTAS_RESULTADOS y se pisaban entre si;
// separadas en mayo 2026.
const COMP_PRACTICA_LOG_HEADER = [
  'Timestamp', 'Session_ID', 'Ejercicio_ID', 'Texto',
  'Tipo_Oracion', 'N_Proposiciones',
  'Aciertos_Verbos', 'Errores_Verbos',
  'Aciertos_Nexos', 'Errores_Nexos',
  'Aciertos_Delimitar', 'Errores_Delimitar',
  'Aciertos_Clasificar', 'Errores_Clasificar',
  'Total_Aciertos', 'Total_Errores', 'Porcentaje',
  'Fases_Saltadas', 'Pistas_Usadas',
  'Duracion_Segundos', 'User_Agent'
];

// ── Versión del esquema de JSON_Compuesta (debe coincidir con Config) ────
const COMP_SCHEMA_VERSION = 1;

// ════════════════════════════════════════════════════════════════════════
//  HELPERS DE CONFIG (lee filas clave|valor de la hoja Config existente)
// ════════════════════════════════════════════════════════════════════════

// Lee un valor de la hoja Config por nombre de clave (col A = clave, col B = valor).
// Devuelve string vacío si no existe.
function getCompConfigValue_(clave) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) return '';
  const rows = cfg.getDataRange().getValues();
  const target = String(clave).trim().toLowerCase();
  for (const row of rows) {
    if (String(row[0]).trim().toLowerCase() === target) {
      return String(row[1] == null ? '' : row[1]).trim();
    }
  }
  return '';
}

// Idempotente: añade la fila clave|valor si no existe; si existe, no la toca.
function setCompConfigValueIfMissing_(clave, valorPorDefecto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let cfg = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) {
    cfg = ss.insertSheet(SHEET_CONFIG);
    cfg.appendRow(['Clave', 'Valor']);
    cfg.getRange(1, 1, 1, 2).setFontWeight('bold');
    cfg.setFrozenRows(1);
  }
  const existing = getCompConfigValue_(clave);
  if (existing === '') {
    cfg.appendRow([clave, valorPorDefecto]);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  ENSURE-SHEET FUNCTIONS — patrón idéntico a ensureExamSheet_
// ════════════════════════════════════════════════════════════════════════

// Helper compartido: aplica el mismo estilo de cabecera azul/blanco/bold
// que setupSheetUI_ de Code_v6.gs. Lo usamos en cada ensure*Sheet_ para
// garantizar coherencia visual entre hojas de compuestas y las de simples.
function styleCompHeader_(sheet, nCols) {
  if (!sheet || nCols <= 0) return;
  const header = sheet.getRange(1, 1, 1, nCols);
  header.setFontWeight('bold')
        .setBackground(COMP_HEADER_BG)
        .setFontColor(COMP_HEADER_FG)
        .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function ensureCompBancoSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_COMPUESTAS_BANCO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMPUESTAS_BANCO);
    sheet.appendRow(COMP_BANCO_HEADER);
    styleCompHeader_(sheet, COMP_BANCO_HEADER.length);
    sheet.setColumnWidth(2, 380); // Texto: ancha para legibilidad
    sheet.setColumnWidth(7, 220); // JSON_Compuesta: ancha también
    return sheet;
  }
  ensureSheetHeaders_(sheet, COMP_BANCO_HEADER);
  // El formato de cabecera solo se aplica al CREAR la hoja (rama de arriba):
  // repintarlo en cada llamada gastaba cuota de Sheets sin necesidad.
  return sheet;
}

function ensureCompExamSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_COMPUESTAS_EXAMENES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMPUESTAS_EXAMENES);
    sheet.appendRow(COMP_EXAM_HEADER);
    styleCompHeader_(sheet, COMP_EXAM_HEADER.length);
    return sheet;
  }
  ensureSheetHeaders_(sheet, COMP_EXAM_HEADER);
  return sheet;
}

function ensureCompResultSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_COMPUESTAS_RESULTADOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMPUESTAS_RESULTADOS);
    sheet.appendRow(COMP_RESULT_HEADER);
    styleCompHeader_(sheet, COMP_RESULT_HEADER.length);
    return sheet;
  }
  ensureSheetHeaders_(sheet, COMP_RESULT_HEADER);
  return sheet;
}

// Hoja dedicada a practica libre (mayo 2026). Antes vivian en
// Compuestas_Resultados y pisaban las cabeceras del examen.
function ensureCompPracticaLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_COMPUESTAS_PRACTICA_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMPUESTAS_PRACTICA_LOG);
    sheet.appendRow(COMP_PRACTICA_LOG_HEADER);
    styleCompHeader_(sheet, COMP_PRACTICA_LOG_HEADER.length);
    // Anchos generosos para campos largos
    sheet.setColumnWidth(1, 160);   // Timestamp
    sheet.setColumnWidth(2, 220);   // Session_ID
    sheet.setColumnWidth(3, 100);   // Ejercicio_ID
    sheet.setColumnWidth(4, 360);   // Texto
    for (let i = 5; i <= COMP_PRACTICA_LOG_HEADER.length; i++) sheet.setColumnWidth(i, 110);
    return sheet;
  }
  ensureSheetHeaders_(sheet, COMP_PRACTICA_LOG_HEADER);
  return sheet;
}

// Crea/parchea las cuatro hojas + las dos filas de Config en una sola llamada.
// Idempotente: se puede ejecutar todas las veces que haga falta.
function ensureCompuestasInfra_() {
  ensureCompBancoSheet_();
  ensureCompExamSheet_();
  ensureCompResultSheet_();
  ensureCompPracticaLogSheet_();
  setCompConfigValueIfMissing_('compuestas_activo', 'Sí');
  setCompConfigValueIfMissing_('compuestas_version', String(COMP_SCHEMA_VERSION));
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT 1 — getModulesEnabled
//  Devuelve qué módulos están activos. Lo llama el frontend al cargar.
// ════════════════════════════════════════════════════════════════════════

function getModulesEnabled_() {
  // 'simples' siempre true (es el motor histórico, no se desactiva)
  // 'compuestas' depende de la fila Config 'compuestas_activo'
  const compActivo = getCompConfigValue_('compuestas_activo');
  // Tolerante a variantes: "Sí", "Si", "sí", "true", "1" → activo.
  const norm = String(compActivo).trim().toLowerCase();
  const compuestasOn = (norm === 'sí' || norm === 'si' || norm === 'true' || norm === '1');
  return {
    ok: true,
    simples: true,
    compuestas: compuestasOn,
    compuestas_version: COMP_SCHEMA_VERSION
  };
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT 2 — getOracionesCompuestas
//  Lee Compuestas_Banco (con caché 5 min) y devuelve los ejercicios
//  filtrados. Patrón análogo a getOraciones_/getOracionesFiltradas_.
//
//  Parámetros (todos opcionales):
//    mode               'practice' (default) | 'exam'   → exam ⇒ solo Activo='Sí'
//    tipo_oracion       'coordinada'|'subordinada'|'yuxtapuesta'|'mixta' | '*'
//    subtipo            'causal,relativa_especificativa' (lista) | '*'
//    nivel_max          'basico'|'medio'|'avanzado'
//    n_proposiciones_max  entero (0 = sin límite)
//    n                  entero (cantidad máxima a devolver)
// ════════════════════════════════════════════════════════════════════════

function getOracionesCompuestas_(params) {
  const mode = String(params.mode || 'practice').toLowerCase();
  const cacheKey = 'compuestas_all_' + mode;

  // 1) Cache rápida (TTL 300s). Solo cacheamos el banco completo,
  //    no los filtrados (los filtros aplican después en memoria).
  const cache = CacheService.getScriptCache();
  let banco = null;
  try {
    const cached = cache.get(cacheKey);
    if (cached) {
      banco = JSON.parse(cached);
    }
  } catch (e) {
    console.warn('[getOracionesCompuestas] cache parse error:', e.message);
    banco = null;
  }

  // 2) Cache miss: leer la hoja
  if (!banco) {
    banco = readCompBancoFromSheet_(mode);
    try {
      const json = JSON.stringify(banco);
      // El límite de CacheService es 100KB por entrada
      if (json.length < 90000) cache.put(cacheKey, json, 300);
    } catch (e) { /* silent */ }
  }

  // 3) Aplicar filtros en memoria
  const tipoOracion       = String(params.tipo_oracion || '*').trim().toLowerCase();
  const subtipoRaw        = String(params.subtipo      || '*').trim().toLowerCase();
  const subtipos          = subtipoRaw === '*' ? null
                              : subtipoRaw.split(',').map(s => s.trim()).filter(Boolean);
  const nivelMax          = String(params.nivel_max    || '').trim().toLowerCase();
  const nMax              = parseInt(params.n_proposiciones_max) || 0;
  const nLimit            = parseInt(params.n) || 0;

  const NIVEL_ORDER = { 'basico': 1, 'básico': 1, 'medio': 2, 'avanzado': 3 };
  const nivelMaxNum = NIVEL_ORDER[nivelMax] || 0;

  let filtrados = banco.filter(ej => {
    if (tipoOracion !== '*' && String(ej._tipo_oracion).toLowerCase() !== tipoOracion) return false;
    if (subtipos && subtipos.length > 0) {
      const s = String(ej._subtipo || '').toLowerCase();
      if (!subtipos.includes(s)) return false;
    }
    if (nivelMaxNum > 0) {
      const nNum = NIVEL_ORDER[String(ej._nivel || '').toLowerCase()] || 99;
      if (nNum > nivelMaxNum) return false;
    }
    if (nMax > 0 && parseInt(ej._n_proposiciones || 0) > nMax) return false;
    return true;
  });

  // 4) Limitar cantidad si se pide
  if (nLimit > 0 && filtrados.length > nLimit) {
    filtrados = filtrados.slice(0, nLimit);
  }

  // 5) Devolver SOLO el JSON_Compuesta limpio (sin las metaclaves _tipo_oracion etc.)
  const ejercicios = filtrados.map(stripInternalMeta_);
  return { ok: true, ejercicios: ejercicios, total: ejercicios.length, mode: mode };
}

// Lee Compuestas_Banco fila por fila y devuelve un array de objetos
// con el JSON ya parseado y las metaclaves de filtrado adheridas.
// mode='exam' filtra por Activo='Sí'. mode='practice' acepta toda fila con JSON parseable.
function readCompBancoFromSheet_(mode) {
  const sheet = ensureCompBancoSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const col = getColMap_(sheet);

  const out = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const id        = String(row[col['ID']] || '').trim();
    const texto     = String(row[col['Texto']] || '').trim();
    const tipo      = String(row[col['Tipo_Oracion']] || '').trim();
    const subtipo   = String(row[col['Subtipo']] || '').trim();
    const nivel     = String(row[col['Nivel']] || '').trim();
    const nProps    = parseInt(row[col['N_Proposiciones']]) || 0;
    const rawJson   = String(row[col['JSON_Compuesta']] || '');
    const activo    = String(row[col['Activo']] || '').trim();

    if (!id || !texto || !rawJson) continue;
    if (mode === 'exam' && activo !== 'Sí') continue;

    const parsed = safeParseJSON(rawJson);
    if (!parsed) {
      console.warn('[readCompBancoFromSheet_] JSON inválido en fila', i + 2, 'ID=', id);
      continue;
    }
    // Asegurar que el ejercicio lleva su propio ID (puede venir del JSON o de la columna)
    if (!parsed.id) parsed.id = id;
    if (!parsed.tipo_ejercicio) parsed.tipo_ejercicio = 'compuesta';

    parsed._tipo_oracion    = tipo.toLowerCase();
    parsed._subtipo         = subtipo.toLowerCase();
    parsed._nivel           = nivel.toLowerCase();
    parsed._n_proposiciones = nProps;
    out.push(parsed);
  }
  return out;
}

// Quita las metaclaves _* antes de devolver al frontend.
function stripInternalMeta_(obj) {
  const clean = {};
  Object.keys(obj).forEach(k => { if (!k.startsWith('_')) clean[k] = obj[k]; });
  return clean;
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT 3 — createExamenCompuesta
//  Profesor crea un examen → pre-computa ejercicios → escribe en hoja.
//  Patrón clonado de createExam_.
//
//  Parámetros:
//    pin                 (obligatorio, 4-6 dígitos)
//    grupo, evaluacion, nombreExamen
//    tipoOracion         '*' | 'coordinada' | ...
//    subtipo             '*' | 'causal,condicional'
//    nivelMax            'basico' | 'medio' | 'avanzado'
//    nProposicionesMax   entero (0 = sin límite)
//    nEjercicios         entero (0 = todos los disponibles)
//    timerMin            entero (0 = sin límite)
//    fasesActivas        JSON array, ej: '[0,1,2,3,4,5,6]'
// ════════════════════════════════════════════════════════════════════════

function createExamenCompuesta_(params) {
  const sheet = ensureCompExamSheet_();
  const col = getColMap_(sheet);
  const pin = String(params.pin || '').trim();
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return { ok: false, error: 'PIN inválido (debe tener 4-6 dígitos numéricos)' };
  }

  // 1) Cerrar exámenes activos previos con el mismo PIN
  const data = sheet.getDataRange().getValues();
  const estadoIdx = col['Estado'];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['PIN']]).trim() === pin && String(data[i][estadoIdx]).trim() === 'activo') {
      sheet.getRange(i + 1, estadoIdx + 1).setValue('cerrado');
    }
  }

  // 2) Normalizar parámetros
  const tipoOracion       = String(params.tipoOracion       || '*').trim();
  const subtipo           = String(params.subtipo           || '*').trim();
  const nivelMax          = String(params.nivelMax          || 'avanzado').trim().toLowerCase();
  const nPropMax          = parseInt(params.nProposicionesMax) || 0;
  const nEjercicios       = parseInt(params.nEjercicios)        || 0;
  const timerMin          = parseInt(params.timerMin)           || 0;

  // Fases activas: normalizar a JSON array string. Default = todas las fases v1.
  let fasesActivas = '[0,1,2,3,4,5,6]';
  if (params.fasesActivas) {
    try {
      const arr = JSON.parse(params.fasesActivas);
      if (Array.isArray(arr)) fasesActivas = JSON.stringify(arr);
    } catch (e) { /* usar default */ }
  }

  // 3) Escribir fila con Estado='creando' (impide que un alumno entre con datos a medias)
  ensureSheetHeaders_(sheet, COMP_EXAM_HEADER);
  appendRowSafe_(sheet, COMP_EXAM_HEADER, {
    'PIN':                  pin,
    'Grupo':                params.grupo         || '',
    'Evaluacion':           params.evaluacion    || '',
    'Nombre_Examen':        params.nombreExamen  || '',
    'Tipo_Oracion':         tipoOracion,
    'Subtipo':              subtipo,
    'Nivel_Max':            nivelMax,
    'N_Proposiciones_Max':  nPropMax,
    'N_Ejercicios':         nEjercicios,
    'Timer_Min':            timerMin,
    'Fases_Activas':        fasesActivas,
    'Estado':               'creando',
    'Fecha':                new Date().toISOString()
  });
  const newRowIdx = sheet.getLastRow();
  const col2  = getColMap_(sheet);
  const estCol  = col2['Estado'] + 1;
  const oracCol = col2['Oraciones_JSON'] + 1;

  // 4) PRE-COMPUTAR: filtrar el banco y elegir los ejercicios ahora
  let ejercicios;
  try {
    const r = getOracionesCompuestas_({
      mode: 'exam',
      tipo_oracion:         tipoOracion === '*' ? '' : tipoOracion,
      subtipo:              subtipo     === '*' ? '' : subtipo,
      nivel_max:            nivelMax,
      n_proposiciones_max:  nPropMax
    });
    ejercicios = (r && r.ejercicios) ? r.ejercicios : [];
  } catch (e) {
    console.error('[createExamenCompuesta] Error filtrando banco:', e);
    sheet.getRange(newRowIdx, estCol).setValue('cerrado');
    return { ok: false, error: 'Error al leer Compuestas_Banco: ' + e.message };
  }

  if (!ejercicios || ejercicios.length === 0) {
    sheet.getRange(newRowIdx, estCol).setValue('cerrado');
    return { ok: false, error: 'No hay ejercicios que cumplan los filtros. Revisa los filtros y crea el examen de nuevo.' };
  }

  // 5) Mezclar (Fisher–Yates) y limitar
  for (let j = ejercicios.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [ejercicios[j], ejercicios[k]] = [ejercicios[k], ejercicios[j]];
  }
  if (nEjercicios > 0 && ejercicios.length > nEjercicios) {
    ejercicios = ejercicios.slice(0, nEjercicios);
  }

  // 6) Escribir el JSON pre-computado y activar el examen
  try {
    sheet.getRange(newRowIdx, oracCol).setValue(JSON.stringify(ejercicios));
    sheet.getRange(newRowIdx, estCol).setValue('activo');
  } catch (e) {
    console.error('[createExamenCompuesta] Error escribiendo fila:', e);
    return { ok: false, error: 'Error al guardar el examen: ' + e.message };
  }

  // 7) Invalidar caché del PIN (por si había uno anterior)
  try { CacheService.getScriptCache().remove('compexam_' + pin); } catch (e) {}

  return { ok: true, pin: pin, nEjerciciosReales: ejercicios.length };
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT 4 — getExamenCompuesta
//  Alumno entra el PIN → GAS sirve el JSON pre-computado (< 1 s).
//  Patrón clonado de getExamConfig_.
// ════════════════════════════════════════════════════════════════════════

function getExamenCompuesta_(params) {
  const pin = String(params.pin || '').trim();
  if (!pin || pin.length < 4) return { ok: false, error: 'PIN inválido' };

  // 1) Cache lookup (la mayoría de las lecturas vienen aquí)
  const cache = CacheService.getScriptCache();
  const cacheKey = 'compexam_' + pin;
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { /* re-leer */ }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_COMPUESTAS_EXAMENES);
  if (!sheet) {
    return { ok: false, error: 'Aún no se ha creado ningún examen compuesto en este sistema. Pídele al profesor que cree uno.' };
  }
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();

  let foundButCreating = false, foundButClosed = false;
  let foundActiveButEmpty = false, pinExists = false;

  // Buscar de abajo hacia arriba (más reciente primero)
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][col['PIN']]).trim() !== pin) continue;
    pinExists = true;
    const estado = String(data[i][col['Estado']]).trim();
    if (estado === 'creando') { foundButCreating = true; continue; }
    if (estado === 'cerrado') { foundButClosed = true; continue; }
    if (estado !== 'activo')  { continue; }

    // Leer JSON pre-computado
    let ejercicios = null;
    const oracJsonCol = col['Oraciones_JSON'];
    if (oracJsonCol !== undefined && data[i][oracJsonCol]) {
      try { ejercicios = JSON.parse(data[i][oracJsonCol]); }
      catch (e) { console.error('[getExamenCompuesta] Oraciones_JSON corrupto fila', i+1); ejercicios = null; }
    }

    // Fallback con Lock: regenerar si la celda está vacía
    if (!ejercicios || ejercicios.length === 0) {
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(8000);
        // Releer por si otro proceso lo escribió mientras tanto
        if (oracJsonCol !== undefined) {
          const fresh = sheet.getRange(i + 1, oracJsonCol + 1).getValue();
          if (fresh) { try { ejercicios = JSON.parse(fresh); } catch (e) {} }
        }
        if (!ejercicios || ejercicios.length === 0) {
          // Regenerar a partir de los filtros guardados en la fila
          const tipoOracion = String(data[i][col['Tipo_Oracion']] || '*');
          const subtipo     = String(data[i][col['Subtipo']]      || '*');
          const nivelMax    = String(data[i][col['Nivel_Max']]    || 'avanzado');
          const nPropMax    = parseInt(data[i][col['N_Proposiciones_Max']]) || 0;
          const nEj         = parseInt(data[i][col['N_Ejercicios']])         || 0;

          const r = getOracionesCompuestas_({
            mode: 'exam',
            tipo_oracion:        tipoOracion === '*' ? '' : tipoOracion,
            subtipo:             subtipo     === '*' ? '' : subtipo,
            nivel_max:           nivelMax,
            n_proposiciones_max: nPropMax
          });
          ejercicios = (r && r.ejercicios) ? r.ejercicios : [];

          // Mezclar + limitar
          for (let j = ejercicios.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [ejercicios[j], ejercicios[k]] = [ejercicios[k], ejercicios[j]];
          }
          if (nEj > 0 && ejercicios.length > nEj) ejercicios = ejercicios.slice(0, nEj);

          // Persistir el resultado para futuros accesos
          if (oracJsonCol !== undefined && ejercicios.length > 0) {
            try { sheet.getRange(i + 1, oracJsonCol + 1).setValue(JSON.stringify(ejercicios)); } catch (e) {}
          }
        }
      } catch (e) {
        console.error('[getExamenCompuesta] Lock/regen error:', e);
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    if (!ejercicios || ejercicios.length === 0) {
      foundActiveButEmpty = true;
      continue; // probar fila más antigua con mismo PIN
    }

    // Parsear fases activas
    let fasesActivas = [0,1,2,3,4,5,6];
    try { fasesActivas = JSON.parse(String(data[i][col['Fases_Activas']] || '[0,1,2,3,4,5,6]')); }
    catch (e) {}

    const result = {
      ok: true,
      ejercicios: ejercicios,
      timer: parseInt(data[i][col['Timer_Min']]) || 0,
      fasesActivas: fasesActivas,
      pin: pin,
      grupo:        String(data[i][col['Grupo']]         || ''),
      evaluacion:   String(data[i][col['Evaluacion']]    || ''),
      nombreExamen: String(data[i][col['Nombre_Examen']] || '')
    };

    try {
      const json = JSON.stringify(result);
      if (json.length < 90000) cache.put(cacheKey, json, 300);
    } catch (e) {}
    return result;
  }

  // Mensajes de error contextuales (igual que getExamConfig_)
  if (foundActiveButEmpty) return { ok: false, error: 'El examen existe pero no tiene ejercicios cargados. Avisa al profesor para que lo regenere.' };
  if (foundButCreating)    return { ok: false, error: 'Examen en preparación. Espera 5-10 segundos e inténtalo de nuevo.' };
  if (foundButClosed && !pinExists) return { ok: false, error: 'Este examen ha sido cerrado por el profesor.' };
  if (pinExists)           return { ok: false, error: 'Este PIN existe pero el examen no está activo. Pídele al profesor que lo cree de nuevo.' };
  return { ok: false, error: 'PIN no encontrado. Comprueba que has escrito los 4 dígitos correctos.' };
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT 5 — saveResultadoCompuesta (POST)
//  El frontend envía el resultado completo de la sesión.
//  Patrón clonado de saveResult_.
//
//  Payload esperado (JSON en POST body):
//    {
//      action:           'saveResultadoCompuesta',
//      email:            'alumno@murciaeduca.es',
//      name:             'Juan Pérez',
//      grupo:            '3ESO_A',
//      evaluacion:       '1ª',
//      pin:              '1234' | 'PRACTICA',
//      modo:             'examen' | 'practica',
//      totalEjercicios:  10,
//      completados:      8,
//      nota:             7.5,
//      fasesPts: {
//        f0: 1.0, f1: 0.9, f2: 0.7, f3: 0.8,
//        f4: 0.6, f5: null, f6: null
//      },
//      detalle: [
//        { id: 'OC_001', fases: { f0: true, f1: true, ... }, errores: [...] },
//        ...
//      ]
//    }
// ════════════════════════════════════════════════════════════════════════

function saveResultadoCompuesta_(p) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, error: 'Servidor ocupado, inténtalo de nuevo.' }; }

  try {
    const sheet = ensureCompResultSheet_();
    const col = getColMap_(sheet);

    // Deduplicación: mismo email + mismo PIN ⇒ ya enviado.
    // Solo aplica en modo examen; en práctica puede haber múltiples sesiones del mismo alumno.
    const email = String(p.email || '').trim().toLowerCase();
    const pin   = String(p.pin   || '').trim();
    const modo  = String(p.modo  || 'examen').toLowerCase();
    if (email && pin && modo === 'examen') {
      const data = sheet.getDataRange().getValues();
      const emailIdx = col['Correo'], pinIdx = col['PIN'], modoIdx = col['Modo'];
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][emailIdx]).trim().toLowerCase() === email
            && String(data[i][pinIdx]).trim() === pin
            && String(data[i][modoIdx]).trim().toLowerCase() === 'examen') {
          return { ok: true, duplicate: true };
        }
      }
    }

    // Normalizar puntuaciones por fase. Una fase desactivada se guarda como '' (celda vacía).
    const fp = p.fasesPts || {};
    function fasePts(key) {
      const v = fp[key];
      if (v === null || v === undefined || v === '') return '';
      const n = parseFloat(v);
      return isNaN(n) ? '' : Math.round(n * 100) / 100;
    }

    appendRowSafe_(sheet, COMP_RESULT_HEADER, {
      'Fecha':            new Date(),
      'Correo':           email,
      'Nombre':           p.name        || '',
      'Grupo':            p.grupo       || '',
      'Evaluacion':       p.evaluacion  || '',
      'PIN':              pin,
      'Modo':             modo,
      'Total_Ejercicios': parseInt(p.totalEjercicios) || 0,
      'Completados':      parseInt(p.completados)    || 0,
      'Nota':             Math.round((parseFloat(p.nota) || 0) * 100) / 100,
      'Fase0_Pts':        fasePts('f0'),
      'Fase1_Pts':        fasePts('f1'),
      'Fase2_Pts':        fasePts('f2'),
      'Fase3_Pts':        fasePts('f3'),
      'Fase4_Pts':        fasePts('f4'),
      'Fase5_Pts':        fasePts('f5'),
      'Fase6_Pts':        fasePts('f6'),
      'Detalle_JSON':     p.detalle ? JSON.stringify(p.detalle) : ''
    });
    return { ok: true };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT 6 — getResultadosCompuestas
//  Panel del profesor lee resultados, opcionalmente filtrados por
//  grupo y/o evaluación. Patrón clonado de getResultsByGroup_.
// ════════════════════════════════════════════════════════════════════════

function getResultadosCompuestas_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_COMPUESTAS_RESULTADOS);
  if (!sheet) return { ok: true, results: [] };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, results: [] };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const grupo      = String(params.grupo      || '').trim().toLowerCase();
  const evaluacion = String(params.evaluacion || '').trim().toLowerCase();
  const modo       = String(params.modo       || '').trim().toLowerCase();

  const results = [];
  data.forEach(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i]; });

    if (grupo && String(obj['Grupo'] || '').trim().toLowerCase() !== grupo) return;
    if (evaluacion && String(obj['Evaluacion'] || '').trim().toLowerCase() !== evaluacion) return;
    if (modo && String(obj['Modo'] || '').trim().toLowerCase() !== modo) return;

    results.push(obj);
  });
  return { ok: true, results: results, total: results.length };
}

// ════════════════════════════════════════════════════════════════════════
//  FUNCIONES INTERNAS (no expuestas como endpoints)
// ════════════════════════════════════════════════════════════════════════

// Invalida la caché del banco de compuestas. Se llama desde el menú del
// profesor tras editar Compuestas_Banco. Equivale a regenerarMorfologia_.
function regenerarCompuestas_() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('compuestas_all_practice');
    cache.remove('compuestas_all_exam');
    return { ok: true, message: 'Caché de compuestas invalidada.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════
//  RESUMEN DEL BANCO (paralelo a menuResumenBanco de simples)
//  Cuenta ejercicios por tipo, subtipo, nivel, nº proposiciones, y top
//  relaciones leidas del JSON. Defensivo: parses fallidos no rompen el
//  recuento general; se cuentan aparte como "con_error".
// ════════════════════════════════════════════════════════════════════════
function getResumenBancoCompuestas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_COMPUESTAS_BANCO);
  if (!sheet) return { ok: false, error: 'No existe Compuestas_Banco.' };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, total: 0, activos: 0, inactivos: 0, sin_json: 0, con_error: 0,
                            por_tipo: {}, por_subtipo: {}, por_nivel: {}, por_n_props: {}, top_relaciones: [] };

  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  let activos = 0, inactivos = 0, sinJson = 0, conError = 0;
  const porTipo    = {};
  const porSubtipo = {};
  const porNivel   = {};
  const porNProps  = {};
  const relacContador = {};

  for (const row of data) {
    // Saltar filas totalmente vacías
    if (row.every(v => v === '' || v == null)) continue;

    const activo  = String(row[col['Activo']]            || '').trim();
    const tipo    = String(row[col['Tipo_Oracion']]      || '').trim().toLowerCase();
    const subtipo = String(row[col['Subtipo']]           || '').trim().toLowerCase();
    const nivel   = String(row[col['Nivel']]             || '').trim().toLowerCase();
    const nProps  = String(row[col['N_Proposiciones']]   || '').trim();
    const rawJson = String(row[col['JSON_Compuesta']]    || '').trim();

    if (activo === 'Sí' || activo === 'Si' || activo === 'sí' || activo === 'si') activos++;
    else if (activo === 'No' || activo === 'no') inactivos++;

    if (!rawJson) { sinJson++; continue; }
    let parsed;
    try { parsed = JSON.parse(rawJson); }
    catch (e) { conError++; continue; }

    // Conteos por columna directa de la hoja (fuente más fiable)
    if (tipo)    porTipo[tipo]       = (porTipo[tipo]       || 0) + 1;
    if (subtipo) porSubtipo[subtipo] = (porSubtipo[subtipo] || 0) + 1;
    if (nivel)   porNivel[nivel]     = (porNivel[nivel]     || 0) + 1;
    if (nProps)  porNProps[nProps]   = (porNProps[nProps]   || 0) + 1;

    // Top relaciones desde el JSON (relaciones[].subtipo, fallback a .tipo)
    if (parsed && Array.isArray(parsed.relaciones)) {
      parsed.relaciones.forEach(r => {
        const etiqueta = String((r && (r.subtipo || r.tipo)) || '').trim().toLowerCase();
        if (etiqueta) relacContador[etiqueta] = (relacContador[etiqueta] || 0) + 1;
      });
    }
  }

  const topRelaciones = Object.entries(relacContador)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([nombre, n]) => ({ nombre, n }));

  return {
    ok: true,
    total: activos + inactivos,
    activos, inactivos, sin_json: sinJson, con_error: conError,
    por_tipo: porTipo,
    por_subtipo: porSubtipo,
    por_nivel: porNivel,
    por_n_props: porNProps,
    top_relaciones: topRelaciones
  };
}

// Resumen estadístico simple de Compuestas_Resultados (para panel/menú).
function getStatsCompuestas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_COMPUESTAS_RESULTADOS);
  if (!sheet) return { ok: true, total: 0, mediaNota: 0 };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, total: 0, mediaNota: 0 };

  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const notaIdx = col['Nota'];
  let total = 0, suma = 0;
  for (const row of data) {
    const n = parseFloat(row[notaIdx]);
    if (!isNaN(n)) { suma += n; total++; }
  }
  const media = total > 0 ? Math.round((suma / total) * 100) / 100 : 0;
  return { ok: true, total: total, mediaNota: media };
}

// ── Auto-numeración de IDs en Compuestas_Banco ──────────────────────────
//
// Asigna IDs correlativos OC_NNNN a las filas que NO tengan un ID válido.
// Una fila se considera "sin ID válido" si su celda en la columna A:
//   • está vacía, o
//   • no encaja con el patrón /^OC_\d{4}$/ (ej: "OC_AUTO_001", "PROVISIONAL", "OC_6", etc.)
//
// Las filas que sí tienen ID válido (OC_0006, OC_0042…) NO se tocan,
// preservando así la integridad referencial con Compuestas_Resultados.
//
// Para cada fila renumerada actualiza DOS cosas a la vez:
//   1. La celda de la columna A (ID).
//   2. El campo "id" dentro del JSON de la columna G (JSON_Compuesta).
// De este modo nunca queda desincronizado el ID visible del ID interno.
//
// Estrategia: encuentra el mayor OC_NNNN ya existente en la hoja y asigna
// los nuevos a partir de ese número + 1. Nunca rellena huecos en medio
// (si has borrado OC_0014, sigue libre y la próxima asignación irá al final).
function asignarIDsCompuestas_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, error: 'Servidor ocupado, inténtalo de nuevo.' }; }

  try {
    const sheet = ensureCompBancoSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, asignados: 0, rango: '—', total_filas: 0 };

    const col = getColMap_(sheet);
    const idCol = col['ID'];
    const jsonCol = col['JSON_Compuesta'];
    if (idCol === undefined || jsonCol === undefined) {
      return { ok: false, error: 'Faltan columnas ID o JSON_Compuesta en Compuestas_Banco.' };
    }

    const ID_REGEX = /^OC_(\d{4})$/;
    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    // 1) Encontrar el máximo OC_NNNN ya asignado
    let maxN = 0;
    const idsVistos = {};
    const duplicados = [];
    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][idCol] || '').trim();
      const m = id.match(ID_REGEX);
      if (m) {
        const n = parseInt(m[1]);
        if (n > maxN) maxN = n;
        if (idsVistos[id]) duplicados.push(id);
        idsVistos[id] = true;
      }
    }

    // 2) Si hay duplicados, abortar: no es seguro asignar IDs nuevos sobre una hoja con duplicados.
    //    El usuario debe limpiar primero con menuLimpiarDuplicadosCompuestas.
    if (duplicados.length > 0) {
      return {
        ok: false,
        error: 'La hoja Compuestas_Banco tiene IDs duplicados: ' + duplicados.slice(0, 5).join(', ') +
               (duplicados.length > 5 ? ' …y ' + (duplicados.length - 5) + ' más.' : '') +
               '\nEjecuta primero "🧹 Limpiar duplicados" antes de auto-numerar.'
      };
    }

    // 3) Recorrer filas y asignar a las que no tengan ID válido
    let asignados = 0;
    let primero = null, ultimo = null;
    const updates = []; // [{rowIdx, newId, newJson}]

    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][idCol] || '').trim();
      if (id && ID_REGEX.test(id)) continue; // ya tiene ID válido, respetar

      // Asignar siguiente ID
      maxN++;
      const newId = 'OC_' + String(maxN).padStart(4, '0');
      if (!primero) primero = newId;
      ultimo = newId;

      // Actualizar también el campo "id" dentro del JSON, si parseable
      let newJsonStr = String(data[i][jsonCol] || '');
      const parsed = safeParseJSON(newJsonStr);
      if (parsed) {
        parsed.id = newId;
        try {
          newJsonStr = JSON.stringify(parsed);
        } catch (e) {
          // Si la serialización falla, dejamos el JSON original (mejor incoherente que roto)
          console.warn('[asignarIDsCompuestas] no se pudo re-serializar JSON de fila', i + 2);
        }
      }
      // Si no era parseable, el JSON quedará desincronizado: lo registramos pero no rompemos.

      updates.push({
        rowIdx: i + 2,
        newId: newId,
        newJson: newJsonStr,
        jsonOk: !!parsed
      });
      asignados++;
    }

    // 4) Escribir cambios
    let warnings = [];
    for (const u of updates) {
      sheet.getRange(u.rowIdx, idCol + 1).setValue(u.newId);
      sheet.getRange(u.rowIdx, jsonCol + 1).setValue(u.newJson);
      if (!u.jsonOk) warnings.push('Fila ' + u.rowIdx + ' (' + u.newId + '): JSON_Compuesta no parseable, ID actualizado solo en columna A.');
    }

    // 5) Invalidar caché del banco
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('compuestas_all_practice');
      cache.remove('compuestas_all_exam');
    } catch (e) {}

    return {
      ok: true,
      asignados: asignados,
      rango: primero ? (primero + (primero === ultimo ? '' : ' → ' + ultimo)) : '—',
      total_filas: data.length,
      duplicados: duplicados,
      warnings: warnings
    };

  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ── Auditoría de Compuestas_Banco ───────────────────────────────────────
//
// Solo lee, no toca nada. Reporta:
//   • Total de filas
//   • IDs duplicados (con sus filas)
//   • IDs con formato no estándar (no encajan con OC_NNNN de 4 dígitos)
//   • Cabeceras fantasma (columnas con nombre más allá de la J)
//   • Filas con JSON_Compuesta inválido o vacío
function auditarCompuestas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_COMPUESTAS_BANCO);
  if (!sheet) return { ok: false, error: 'No existe la hoja Compuestas_Banco.' };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // 1) Cabeceras fantasma: columnas más allá de la J (índice 10) con contenido
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const cabecerasFantasma = [];
  for (let i = COMP_BANCO_HEADER.length; i < headers.length; i++) {
    const v = String(headers[i] || '').trim();
    if (v) cabecerasFantasma.push({ col: i + 1, valor: v });
  }

  if (lastRow < 2) {
    return {
      ok: true,
      total_filas: 0,
      duplicados: [],
      no_estandar: [],
      cabeceras_fantasma: cabecerasFantasma,
      jsons_invalidos: []
    };
  }

  const col = getColMap_(sheet);
  const idCol = col['ID'];
  const jsonCol = col['JSON_Compuesta'];
  if (idCol === undefined || jsonCol === undefined) {
    return { ok: false, error: 'Faltan columnas ID o JSON_Compuesta.' };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const ID_REGEX = /^OC_(\d{4})$/;

  const idsPorFila = {};   // id → [rowIdx, rowIdx, ...]
  const noEstandar = [];   // [{row, id}]
  const jsonsInvalidos = [];

  for (let i = 0; i < data.length; i++) {
    const rowIdx = i + 2;
    const id = String(data[i][idCol] || '').trim();
    if (!id) {
      noEstandar.push({ row: rowIdx, id: '(vacío)' });
    } else if (!ID_REGEX.test(id)) {
      noEstandar.push({ row: rowIdx, id: id });
    } else {
      if (!idsPorFila[id]) idsPorFila[id] = [];
      idsPorFila[id].push(rowIdx);
    }
    const jsonStr = String(data[i][jsonCol] || '');
    if (!jsonStr) {
      jsonsInvalidos.push({ row: rowIdx, id: id, motivo: 'vacío' });
    } else {
      const parsed = safeParseJSON(jsonStr);
      if (!parsed) jsonsInvalidos.push({ row: rowIdx, id: id, motivo: 'no parseable' });
    }
  }

  const duplicados = [];
  Object.keys(idsPorFila).forEach(id => {
    if (idsPorFila[id].length > 1) {
      duplicados.push({ id: id, filas: idsPorFila[id] });
    }
  });

  return {
    ok: true,
    total_filas: data.length,
    duplicados: duplicados,
    no_estandar: noEstandar,
    cabeceras_fantasma: cabecerasFantasma,
    jsons_invalidos: jsonsInvalidos
  };
}

// ── Limpieza de duplicados en Compuestas_Banco ──────────────────────────
//
// Para cada ID duplicado, CONSERVA la fila con índice MAYOR (la más abajo,
// asumiendo que es la más reciente y por tanto la versión correcta) y borra
// las demás.
//
// Por qué "la más abajo gana": en este sistema, los lotes posteriores
// suelen contener correcciones (ej. lote 003 corrigió OC_0028, OC_0029,
// OC_0034 con schema 1.2). El usuario los importó al final, así que la
// fila más abajo es la versión válida.
//
// La función pide confirmación explícita (UI) y muestra qué va a borrar.
// Después invalida la caché del banco.
function limpiarDuplicadosCompuestas_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, error: 'Servidor ocupado.' }; }

  try {
    const sheet = ensureCompBancoSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, eliminados: 0, mensaje: 'Hoja vacía.' };

    const col = getColMap_(sheet);
    const idCol = col['ID'];
    if (idCol === undefined) return { ok: false, error: 'Falta columna ID.' };

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const ID_REGEX = /^OC_(\d{4})$/;

    // 1) Encontrar duplicados
    const idsPorFila = {};
    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][idCol] || '').trim();
      if (!id || !ID_REGEX.test(id)) continue;
      if (!idsPorFila[id]) idsPorFila[id] = [];
      idsPorFila[id].push(i + 2);  // rowIdx en la hoja
    }

    // 2) Calcular qué filas borrar: para cada duplicado, todas menos la mayor
    const filasABorrar = [];
    const resumen = []; // {id, conservada, borradas}
    Object.keys(idsPorFila).forEach(id => {
      const filas = idsPorFila[id];
      if (filas.length < 2) return;
      filas.sort((a, b) => a - b);
      const conservada = filas[filas.length - 1];
      const borradas = filas.slice(0, -1);
      filasABorrar.push(...borradas);
      resumen.push({ id: id, conservada: conservada, borradas: borradas });
    });

    if (filasABorrar.length === 0) {
      return { ok: true, eliminados: 0, mensaje: 'No hay duplicados que limpiar.' };
    }

    // 3) Borrar de mayor a menor para no desplazar índices de filas pendientes
    filasABorrar.sort((a, b) => b - a);
    for (const rowIdx of filasABorrar) {
      sheet.deleteRow(rowIdx);
    }

    // 4) Invalidar caché
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('compuestas_all_practice');
      cache.remove('compuestas_all_exam');
    } catch (e) {}

    return {
      ok: true,
      eliminados: filasABorrar.length,
      ids_afectados: resumen.length,
      resumen: resumen
    };

  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ── Migración OC_NNN → OC_0NNN (3 dígitos a 4 dígitos) ──────────────────
//
// Renombra los IDs con 3 dígitos a 4 dígitos (OC_001 → OC_0001). Actualiza
// tanto la columna A como el campo "id" dentro del JSON_Compuesta.
//
// Si el ID destino (OC_0NNN) ya existe en la hoja, NO se hace la migración
// para esa fila y se reporta el conflicto. Esto protege contra colisiones.
function migrarSeedsA4Digitos_() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, error: 'Servidor ocupado.' }; }

  try {
    const sheet = ensureCompBancoSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: true, migrados: 0, mensaje: 'Hoja vacía.' };

    const col = getColMap_(sheet);
    const idCol = col['ID'];
    const jsonCol = col['JSON_Compuesta'];
    if (idCol === undefined || jsonCol === undefined) {
      return { ok: false, error: 'Faltan columnas ID o JSON_Compuesta.' };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const OLD_REGEX = /^OC_(\d{3})$/;     // ej: OC_001
    const NEW_REGEX = /^OC_(\d{4})$/;      // ej: OC_0001

    // 1) Construir conjunto de IDs ya existentes en formato OC_NNNN para
    //    detectar colisiones antes de migrar
    const existentesNNNN = {};
    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][idCol] || '').trim();
      if (NEW_REGEX.test(id)) existentesNNNN[id] = i + 2;
    }

    // 2) Para cada fila con ID en formato OC_NNN, intentar migrar
    const migrados = [];   // {row, viejo, nuevo}
    const conflictos = []; // {row, viejo, nuevoIntentado, filaConflicto}
    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][idCol] || '').trim();
      const m = id.match(OLD_REGEX);
      if (!m) continue;
      const nuevoId = 'OC_0' + m[1];  // OC_001 → OC_0001
      if (existentesNNNN[nuevoId] !== undefined) {
        conflictos.push({
          row: i + 2,
          viejo: id,
          nuevoIntentado: nuevoId,
          filaConflicto: existentesNNNN[nuevoId]
        });
        continue;
      }
      // Migrar columna A
      sheet.getRange(i + 2, idCol + 1).setValue(nuevoId);
      // Migrar campo "id" dentro del JSON
      const jsonStr = String(data[i][jsonCol] || '');
      const parsed = safeParseJSON(jsonStr);
      if (parsed) {
        parsed.id = nuevoId;
        try { sheet.getRange(i + 2, jsonCol + 1).setValue(JSON.stringify(parsed)); }
        catch (e) { /* deja JSON como estaba si falla la serialización */ }
      }
      migrados.push({ row: i + 2, viejo: id, nuevo: nuevoId });
      existentesNNNN[nuevoId] = i + 2;
    }

    // 3) Invalidar caché
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('compuestas_all_practice');
      cache.remove('compuestas_all_exam');
    } catch (e) {}

    return {
      ok: true,
      migrados: migrados.length,
      conflictos: conflictos.length,
      detalle_migrados: migrados,
      detalle_conflictos: conflictos
    };

  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ── Eliminar cabeceras fantasma (columnas con nombre más allá de la J) ──
//
// Borra el contenido de las celdas de la fila 1 que estén en columnas más
// allá de la J (índice 10), si tienen contenido. Esto arregla casos como
// una "ID" residual en columna K que se cuela por una importación errónea
// y rompe el getColMap_() del GAS.
function limpiarCabecerasFantasma_() {
  try {
    const sheet = ensureCompBancoSheet_();
    const lastCol = sheet.getLastColumn();
    const expectedCols = COMP_BANCO_HEADER.length;
    if (lastCol <= expectedCols) return { ok: true, limpiadas: 0, mensaje: 'No hay cabeceras fantasma.' };

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const fantasmas = [];
    for (let i = expectedCols; i < headers.length; i++) {
      const v = String(headers[i] || '').trim();
      if (v) {
        fantasmas.push({ col: i + 1, valor: v });
        sheet.getRange(1, i + 1).clearContent();
      }
    }
    return { ok: true, limpiadas: fantasmas.length, detalle: fantasmas };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
//  Al final del doGet/doPost de Code_v6.gs, antes del fallback "Acción
//  desconocida", se llama a estos dispatchers. Si la action es del módulo
//  compuestas, devuelven el resultado. Si no, devuelven null y el doGet
//  cae al "Acción desconocida" original.
//
//  Esto permite:
//    • mantener la inyección en Code_v6.gs en 4 líneas (mínimo invasivo)
//    • agrupar todas las acciones nuevas en un único punto extensible
// ════════════════════════════════════════════════════════════════════════

function dispatchCompuestasGet_(action, params) {
  switch (action) {
    case 'getModulesEnabled':       return getModulesEnabled_();
    case 'getOracionesCompuestas':  return getOracionesCompuestas_(params);
    case 'createExamenCompuesta':   { const na = (typeof requiereClaveProfesor_==='function') ? requiereClaveProfesor_(params) : null; return na || createExamenCompuesta_(params); }
    case 'getExamenCompuesta':      return getExamenCompuesta_(params);
    case 'getResultadosCompuestas': { const na = (typeof requiereClaveProfesor_==='function') ? requiereClaveProfesor_(params) : null; return na || getResultadosCompuestas_(params); }
    case 'regenerarCompuestas':     return regenerarCompuestas_();
    case 'getStatsCompuestas':      return getStatsCompuestas_();
    default: return null;
  }
}

function dispatchCompuestasPost_(action, payload) {
  switch (action) {
    case 'saveResultadoCompuesta':        return saveResultadoCompuesta_(payload);
    case 'saveResultadoCompuestas':       return saveResultadoCompuestasLibre_(payload);
    default: return null;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  MENÚ DEL PROFESOR — submenú "Oración Compuesta"
//  Para activarlo, se añade UNA línea al onOpen de Code_v6.gs (opcional).
//  Si no se añade, las funciones se pueden ejecutar manualmente desde el
//  editor de Apps Script.
// ════════════════════════════════════════════════════════════════════════

function buildCompuestasSubMenu_(ui) {
  const m = ui.createMenu('🌳 Oración Compuesta');
  m.addItem('🛠️ Crear/parchear hojas del módulo', 'menuCrearHojasCompuestas');
  m.addSeparator();
  m.addItem('🔍 Auditar Compuestas_Banco',          'menuAuditarCompuestas');
  m.addItem('🧹 Limpiar duplicados',                'menuLimpiarDuplicadosCompuestas');
  m.addItem('🧹 Limpiar cabeceras fantasma',        'menuLimpiarCabecerasFantasma');
  m.addItem('🧹 Separar Resultados ⇄ Practica_Log', 'menuMigrarResultadosCompuestas');
  m.addItem('🔁 Migrar seeds a 4 dígitos (OC_NNN → OC_0NNN)', 'menuMigrarSeedsA4Digitos');
  m.addItem('🔢 Asignar IDs automáticamente',       'menuAsignarIDsCompuestas');
  m.addSeparator();
  m.addItem('🔄 Regenerar caché de compuestas',     'menuRegenerarCompuestas');
  m.addItem('📊 Ver resumen de mi banco',           'menuResumenBancoCompuestas');
  m.addItem('📊 Resumen de resultados',             'menuStatsCompuestas');
  m.addItem('🧪 Probar getModulesEnabled',          'menuProbarGetModulesEnabled');
  return m;
}

// ════════════════════════════════════════════════════════════════════════
//  MIGRACIÓN: separar examen (Resultados) y práctica libre (Practica_Log)
//  Lee la hoja Compuestas_Resultados actual (que puede tener cabeceras
//  mezcladas tras el bug de mayo 2026), clasifica cada fila por su
//  contenido, y la copia a la hoja correcta. La hoja vieja se renombra
//  a Compuestas_Resultados_OLD_<timestamp> por seguridad (no se borra).
//
//  Clasificación de fila:
//    - Tiene Session_ID (col 'Session_ID') no vacío → práctica libre.
//    - Tiene PIN (col 'PIN') no vacío            → examen.
//    - Si tiene ambos                             → examen (más prioritario).
//    - Si no tiene ninguno                        → no migra, queda en OLD.
//  Idempotente: si la hoja Compuestas_Resultados ya tiene SOLO el header
//  limpio (sin filas o sin columnas viejas), no hace nada destructivo.
// ════════════════════════════════════════════════════════════════════════
function menuMigrarResultadosCompuestas() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetVieja = ss.getSheetByName(SHEET_COMPUESTAS_RESULTADOS);
  if (!sheetVieja) {
    ui.alert('Sin hoja', 'No existe Compuestas_Resultados. Nada que migrar.', ui.ButtonSet.OK);
    return;
  }

  const lastRow = sheetVieja.getLastRow();
  const lastCol = sheetVieja.getLastColumn();
  if (lastRow < 2) {
    ui.alert('Sin filas', 'La hoja Compuestas_Resultados está vacía. Aplicando solo limpieza de cabeceras…', ui.ButtonSet.OK);
    // Reset puro: recreo con cabeceras limpias.
    sheetVieja.clear();
    sheetVieja.appendRow(COMP_RESULT_HEADER);
    styleCompHeader_(sheetVieja, COMP_RESULT_HEADER.length);
    ensureCompPracticaLogSheet_();
    return;
  }

  const colVieja = getColMap_(sheetVieja);
  const colSession = (colVieja['Session_ID'] != null) ? colVieja['Session_ID'] : -1;
  const colPin     = (colVieja['PIN']        != null) ? colVieja['PIN']        : -1;

  const data = sheetVieja.getRange(1, 1, lastRow, lastCol).getValues();
  // Mapas de cabecera para reescribir por nombre, no por posición.
  const headerVieja = data[0].map(h => String(h).trim());

  let countExamen = 0, countLibre = 0, countSinClasificar = 0;
  const filasExamen = [];
  const filasLibre  = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Fila vacía total → ignorar
    if (row.every(v => v === '' || v == null)) continue;

    const tieneSession = (colSession >= 0) && String(row[colSession] || '').trim() !== '';
    const tienePin     = (colPin     >= 0) && String(row[colPin]     || '').trim() !== '';

    if (tienePin) {
      filasExamen.push(rowAsObj_(row, headerVieja));
      countExamen++;
    } else if (tieneSession) {
      filasLibre.push(rowAsObj_(row, headerVieja));
      countLibre++;
    } else {
      countSinClasificar++;
    }
  }

  // Confirmar antes de tocar.
  const resp = ui.alert(
    '🧹 Migrar Compuestas_Resultados',
    'Filas detectadas:\n' +
    '  • Examen (con PIN):  ' + countExamen + '\n' +
    '  • Práctica libre (con Session_ID): ' + countLibre + '\n' +
    '  • Sin clasificar (se ignoran): ' + countSinClasificar + '\n\n' +
    'Acción:\n' +
    '  1) Hoja vieja → renombrada a "Compuestas_Resultados_OLD_<timestamp>".\n' +
    '  2) Se crea Compuestas_Resultados limpio (solo examen).\n' +
    '  3) Se crea o usa Compuestas_Practica_Log (solo libre).\n' +
    '  4) Cada fila se copia a su hoja por NOMBRE de columna.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  // 1) Renombrar la vieja
  const ts = new Date();
  const stamp = Utilities.formatDate(ts, Session.getScriptTimeZone() || 'Europe/Madrid', 'yyyyMMdd_HHmmss');
  const nombreOld = SHEET_COMPUESTAS_RESULTADOS + '_OLD_' + stamp;
  sheetVieja.setName(nombreOld);

  // 2) Crear las dos hojas limpias
  const sheetExamen = ensureCompResultSheet_();      // ahora la crea desde 0 porque ya no existe SHEET_COMPUESTAS_RESULTADOS
  const sheetLibre  = ensureCompPracticaLogSheet_();

  // 3) Volcar filas con appendRowSafe_ para que se coloquen por nombre
  filasExamen.forEach(obj => appendRowSafe_(sheetExamen, COMP_RESULT_HEADER, obj));
  filasLibre .forEach(obj => appendRowSafe_(sheetLibre,  COMP_PRACTICA_LOG_HEADER, obj));

  ui.alert('✓ Listo',
    'Migración completada.\n\n' +
    '  • Compuestas_Resultados   ← ' + filasExamen.length + ' filas de examen\n' +
    '  • Compuestas_Practica_Log ← ' + filasLibre.length  + ' filas de práctica libre\n\n' +
    'Backup: ' + nombreOld + ' (revísalo y, si todo cuadra, puedes borrarlo manualmente).',
    ui.ButtonSet.OK);
}

// Convierte una fila (array) en un objeto {cabecera: valor} usando
// la cabecera real de la hoja origen. Reutilizado por la migración.
function rowAsObj_(row, headerArr) {
  const obj = {};
  for (let i = 0; i < headerArr.length; i++) {
    const k = headerArr[i];
    if (k) obj[k] = row[i];
  }
  return obj;
}

function menuCrearHojasCompuestas() {
  const ui = SpreadsheetApp.getUi();
  try {
    ensureCompuestasInfra_();
    ui.alert('✓ Listo',
      'Se han creado/parcheado las hojas:\n' +
      '  • Compuestas_Banco\n' +
      '  • Compuestas_Examenes\n' +
      '  • Compuestas_Resultados (solo examen con PIN)\n' +
      '  • Compuestas_Practica_Log (solo práctica libre)\n\n' +
      'Y las dos filas de Config:\n' +
      '  • compuestas_activo = Sí\n' +
      '  • compuestas_version = ' + COMP_SCHEMA_VERSION + '\n\n' +
      'Si tienes una hoja vieja con cabeceras mezcladas, ejecuta\n' +
      '"🧹 Separar Resultados ⇄ Practica_Log" para limpiarla.\n\n' +
      'Es seguro ejecutarlo varias veces (idempotente).',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', String(e.message || e), ui.ButtonSet.OK);
  }
}

function menuRegenerarCompuestas() {
  const ui = SpreadsheetApp.getUi();
  const r = regenerarCompuestas_();
  ui.alert(r.ok ? '✓ Caché invalidada' : '❌ Error',
    r.ok ? 'La próxima lectura del banco releerá la hoja Compuestas_Banco desde cero.'
         : String(r.error || 'desconocido'),
    ui.ButtonSet.OK);
}

function menuAsignarIDsCompuestas() {
  const ui = SpreadsheetApp.getUi();

  // Primero, hacer un dry-run mental: contar cuántas filas necesitan ID
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_COMPUESTAS_BANCO);
  if (!sheet) {
    ui.alert('❌ Error', 'No existe la hoja Compuestas_Banco. Ejecuta primero "Crear/parchear hojas del módulo".', ui.ButtonSet.OK);
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Sin filas', 'La hoja Compuestas_Banco está vacía. Nada que asignar.', ui.ButtonSet.OK);
    return;
  }

  // Confirmar con el usuario antes de modificar
  const resp = ui.alert(
    '🔢 Asignar IDs automáticamente',
    'Se asignarán IDs correlativos OC_NNNN a las filas que NO tengan ya un ID válido.\n\n' +
    'Los IDs ya válidos (OC_0001, OC_0042…) NO se tocan, para preservar los enlaces con Compuestas_Resultados.\n\n' +
    'Para cada fila renumerada se actualiza también el campo "id" dentro del JSON_Compuesta.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  const r = asignarIDsCompuestas_();
  if (!r.ok) {
    ui.alert('❌ Error', String(r.error || 'desconocido'), ui.ButtonSet.OK);
    return;
  }

  let msg = '';
  if (r.asignados === 0) {
    msg = 'No había filas sin ID válido. Nada que hacer.\n\n';
    msg += 'Total de filas revisadas: ' + r.total_filas;
  } else {
    msg = 'IDs asignados: ' + r.asignados + '\n';
    msg += 'Rango: ' + r.rango + '\n';
    msg += 'Total de filas en la hoja: ' + r.total_filas + '\n\n';
    msg += 'La caché del banco ya está invalidada; las nuevas oraciones están disponibles.';
  }
  if (r.duplicados && r.duplicados.length > 0) {
    msg += '\n\n⚠ AVISO: detectados IDs duplicados en la hoja (no se han tocado): ' + r.duplicados.slice(0, 5).join(', ');
    if (r.duplicados.length > 5) msg += ' …';
    msg += '\nRecomendado: revisa esas filas manualmente.';
  }
  if (r.warnings && r.warnings.length > 0) {
    msg += '\n\n⚠ AVISOS:\n' + r.warnings.slice(0, 3).join('\n');
    if (r.warnings.length > 3) msg += '\n  …y ' + (r.warnings.length - 3) + ' más (revisa el log de ejecución).';
  }

  ui.alert(r.asignados === 0 ? 'Sin cambios' : '✓ Listo', msg, ui.ButtonSet.OK);
}

function menuStatsCompuestas() {
  const ui = SpreadsheetApp.getUi();
  const s = getStatsCompuestas_();
  ui.alert('📊 Resumen — Compuestas_Resultados',
    'Total de sesiones registradas: ' + (s.total || 0) + '\n' +
    'Nota media: ' + (s.mediaNota || 0) + ' / 10',
    ui.ButtonSet.OK);
}

// Resumen del BANCO de compuestas (paralelo a menuResumenBanco de simples).
// Muestra activos/inactivos, top por tipo de oracion, subtipo, nivel, nº de
// proposiciones y top relaciones encontradas en los JSON.
function menuResumenBancoCompuestas() {
  const ui = SpreadsheetApp.getUi();
  const r = getResumenBancoCompuestas_();
  if (!r.ok) { ui.alert('❌ Error', String(r.error || 'desconocido'), ui.ButtonSet.OK); return; }

  function fmtTop(map, max) {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, max || 10);
    if (entries.length === 0) return '  (sin datos)';
    return entries.map(([k, n]) => '  • ' + k + ': ' + n).join('\n');
  }

  const msg =
    '✅ Activos:   ' + r.activos    + '\n' +
    '❌ Inactivos: ' + r.inactivos  + '\n' +
    '⚠ Sin JSON:  ' + r.sin_json   + '\n' +
    '🔴 Con error: ' + r.con_error  + '\n' +
    '\n🌳 Por tipo de oración:\n' + fmtTop(r.por_tipo, 10) +
    '\n\n🔬 Por subtipo (top 12):\n' + fmtTop(r.por_subtipo, 12) +
    '\n\n📊 Por nivel:\n'      + fmtTop(r.por_nivel, 10) +
    '\n\n🔢 Por nº de proposiciones:\n' + fmtTop(r.por_n_props, 10) +
    '\n\n🔗 Top relaciones (en los JSON):\n' +
      (r.top_relaciones.length === 0
        ? '  (sin etiquetas)'
        : r.top_relaciones.slice(0, 12).map(o => '  • ' + o.nombre + ': ' + o.n).join('\n'));

  ui.alert('📊 Resumen — Compuestas_Banco', msg, ui.ButtonSet.OK);
}

function menuAuditarCompuestas() {
  const ui = SpreadsheetApp.getUi();
  const r = auditarCompuestas_();
  if (!r.ok) { ui.alert('❌ Error', String(r.error), ui.ButtonSet.OK); return; }

  let msg = '📋 AUDITORÍA DE Compuestas_Banco\n';
  msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  msg += 'Total de filas de datos: ' + r.total_filas + '\n\n';

  // Duplicados
  if (r.duplicados.length === 0) {
    msg += '✓ Sin IDs duplicados.\n\n';
  } else {
    msg += '⚠ IDs DUPLICADOS: ' + r.duplicados.length + '\n';
    const muestra = r.duplicados.slice(0, 8);
    muestra.forEach(d => {
      msg += '  • ' + d.id + ' en filas ' + d.filas.join(', ') + '\n';
    });
    if (r.duplicados.length > 8) msg += '  …y ' + (r.duplicados.length - 8) + ' más.\n';
    msg += '\nAcción recomendada: ejecutar "🧹 Limpiar duplicados".\n\n';
  }

  // No estándar
  if (r.no_estandar.length === 0) {
    msg += '✓ Todos los IDs siguen el formato OC_NNNN.\n\n';
  } else {
    msg += '⚠ IDs CON FORMATO NO ESTÁNDAR: ' + r.no_estandar.length + '\n';
    const muestra = r.no_estandar.slice(0, 8);
    muestra.forEach(n => {
      msg += '  • Fila ' + n.row + ': ' + n.id + '\n';
    });
    if (r.no_estandar.length > 8) msg += '  …y ' + (r.no_estandar.length - 8) + ' más.\n';
    msg += '\nSi son seeds OC_NNN (3 dígitos), ejecuta "🔁 Migrar seeds a 4 dígitos".\n\n';
  }

  // Cabeceras fantasma
  if (r.cabeceras_fantasma.length === 0) {
    msg += '✓ Sin cabeceras fantasma fuera de las 10 columnas válidas.\n\n';
  } else {
    msg += '⚠ CABECERAS FANTASMA detectadas:\n';
    r.cabeceras_fantasma.forEach(c => {
      msg += '  • Columna ' + c.col + ' (cabecera "' + c.valor + '")\n';
    });
    msg += '\nAcción recomendada: ejecutar "🧹 Limpiar cabeceras fantasma".\n\n';
  }

  // JSONs inválidos
  if (r.jsons_invalidos.length === 0) {
    msg += '✓ Todos los JSON_Compuesta se parsean correctamente.';
  } else {
    msg += '⚠ JSON_Compuesta INVÁLIDO en ' + r.jsons_invalidos.length + ' fila(s):\n';
    r.jsons_invalidos.slice(0, 5).forEach(j => {
      msg += '  • Fila ' + j.row + ' (' + j.id + '): ' + j.motivo + '\n';
    });
    if (r.jsons_invalidos.length > 5) msg += '  …y ' + (r.jsons_invalidos.length - 5) + ' más.\n';
  }

  ui.alert('🔍 Auditoría', msg, ui.ButtonSet.OK);
}

function menuLimpiarDuplicadosCompuestas() {
  const ui = SpreadsheetApp.getUi();

  // Primero, mostrar qué se va a hacer (sin tocar nada)
  const a = auditarCompuestas_();
  if (!a.ok) { ui.alert('❌ Error', String(a.error), ui.ButtonSet.OK); return; }
  if (a.duplicados.length === 0) {
    ui.alert('Sin duplicados', 'No hay IDs duplicados que limpiar.', ui.ButtonSet.OK);
    return;
  }

  // Construir previsualización
  let msg = '🧹 LIMPIEZA DE DUPLICADOS\n';
  msg += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  msg += 'Se han detectado ' + a.duplicados.length + ' IDs duplicados.\n\n';
  msg += 'Estrategia: para cada ID se CONSERVA la fila más abajo (asumida como la versión más reciente) y se BORRAN las anteriores.\n\n';
  let totalABorrar = 0;
  a.duplicados.slice(0, 10).forEach(d => {
    const conservada = d.filas[d.filas.length - 1];
    const borradas = d.filas.slice(0, -1);
    msg += '  • ' + d.id + ': conservar fila ' + conservada + ', borrar ' + borradas.join(', ') + '\n';
    totalABorrar += borradas.length;
  });
  if (a.duplicados.length > 10) {
    msg += '  …y ' + (a.duplicados.length - 10) + ' más.\n';
    for (let i = 10; i < a.duplicados.length; i++) totalABorrar += a.duplicados[i].filas.length - 1;
  }
  msg += '\nTotal de filas a borrar: ' + totalABorrar + '\n\n';
  msg += '¿Continuar?';

  const resp = ui.alert('🧹 Limpiar duplicados', msg, ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  const r = limpiarDuplicadosCompuestas_();
  if (!r.ok) { ui.alert('❌ Error', String(r.error), ui.ButtonSet.OK); return; }
  ui.alert('✓ Listo',
    'Filas borradas: ' + r.eliminados + '\n' +
    'IDs afectados: ' + r.ids_afectados + '\n\n' +
    'La caché del banco ya está invalidada.',
    ui.ButtonSet.OK);
}

function menuLimpiarCabecerasFantasma() {
  const ui = SpreadsheetApp.getUi();
  const r = limpiarCabecerasFantasma_();
  if (!r.ok) { ui.alert('❌ Error', String(r.error), ui.ButtonSet.OK); return; }
  if (r.limpiadas === 0) {
    ui.alert('Sin cambios', r.mensaje || 'No había cabeceras fantasma.', ui.ButtonSet.OK);
    return;
  }
  let msg = 'Se han limpiado ' + r.limpiadas + ' cabecera(s) fantasma:\n\n';
  r.detalle.forEach(c => {
    msg += '  • Columna ' + c.col + ' (era "' + c.valor + '")\n';
  });
  msg += '\nEjecuta también "🔄 Regenerar caché" para que el cambio se refleje en la app.';
  ui.alert('✓ Listo', msg, ui.ButtonSet.OK);
}

function menuMigrarSeedsA4Digitos() {
  const ui = SpreadsheetApp.getUi();

  const resp = ui.alert(
    '🔁 Migrar seeds a 4 dígitos',
    'Esta función busca IDs con formato de 3 dígitos (OC_001, OC_002…) y los renombra a 4 dígitos (OC_0001, OC_0002…).\n\n' +
    'Se actualiza tanto la columna A como el campo "id" dentro del JSON.\n\n' +
    'Si el ID destino ya existe (colisión), esa fila NO se migra y se reporta.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  const r = migrarSeedsA4Digitos_();
  if (!r.ok) { ui.alert('❌ Error', String(r.error), ui.ButtonSet.OK); return; }

  let msg = 'Migrados: ' + r.migrados + '\n';
  msg += 'Conflictos (no migrados): ' + r.conflictos + '\n\n';
  if (r.detalle_migrados && r.detalle_migrados.length > 0) {
    msg += 'Migrados:\n';
    r.detalle_migrados.slice(0, 10).forEach(m => {
      msg += '  • Fila ' + m.row + ': ' + m.viejo + ' → ' + m.nuevo + '\n';
    });
  }
  if (r.detalle_conflictos && r.detalle_conflictos.length > 0) {
    msg += '\nConflictos:\n';
    r.detalle_conflictos.forEach(c => {
      msg += '  • Fila ' + c.row + ': ' + c.viejo + ' no se pudo migrar a ' + c.nuevoIntentado + ' (ya existe en fila ' + c.filaConflicto + ')\n';
    });
  }
  ui.alert('✓ Resultado', msg, ui.ButtonSet.OK);
}

function menuProbarGetModulesEnabled() {
  const ui = SpreadsheetApp.getUi();
  const r = getModulesEnabled_();
  ui.alert('🧪 getModulesEnabled',
    JSON.stringify(r, null, 2),
    ui.ButtonSet.OK);
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT NUEVO — saveResultadoCompuestasLibre (POST)
//  Guarda el resultado de una sesión de práctica libre (sin PIN ni login).
//  El alumno se identifica con un Session_ID anónimo generado en el cliente.
//  La hoja destino es SHEET_COMPUESTAS_RESULTADOS ('Compuestas_Resultados'),
//  pero con columnas distintas al flujo de examen con PIN.
//
//  Payload esperado desde el cliente:
//  {
//    action: 'saveResultadoCompuestas',
//    payload: {
//      session_id:          'CP-20260515-184019-A3F2',
//      ejercicio_id:        'OC_0020',
//      texto:               'Mis padres se enteraron de que...',
//      tipo_oracion:        'subordinada',
//      n_proposiciones:     2,
//      aciertos_verbos:     2,
//      errores_verbos:      0,
//      aciertos_nexos:      1,
//      errores_nexos:       0,
//      aciertos_delimitar:  9,
//      errores_delimitar:   1,
//      aciertos_clasificar: 5,
//      errores_clasificar:  1,
//      fases_saltadas:      '',      // 'ej: 1,3' si saltó esas fases
//      pistas_usadas:       '3',     // '1,2' si usó pistas en fases 1 y 2
//      duracion_segundos:   247,
//      user_agent:          'Mozilla/5.0...'
//    }
//  }
// ════════════════════════════════════════════════════════════════════════

function saveResultadoCompuestasLibre_(p) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, error: 'Servidor ocupado, inténtalo de nuevo.' }; }

  try {
    // Mayo 2026: la practica libre vive en su propia hoja (antes pisaba
    // las cabeceras de Compuestas_Resultados, que es solo para examen).
    const sheet = ensureCompPracticaLogSheet_();

    const aciertosTotales =
      (Number(p.aciertos_verbos)     || 0) +
      (Number(p.aciertos_nexos)      || 0) +
      (Number(p.aciertos_delimitar)  || 0) +
      (Number(p.aciertos_clasificar) || 0);

    const erroresTotales =
      (Number(p.errores_verbos)     || 0) +
      (Number(p.errores_nexos)      || 0) +
      (Number(p.errores_delimitar)  || 0) +
      (Number(p.errores_clasificar) || 0);

    const total      = aciertosTotales + erroresTotales;
    const porcentaje = total > 0 ? Math.round((aciertosTotales / total) * 100) : 0;

    appendRowSafe_(sheet, COMP_PRACTICA_LOG_HEADER, {
      'Timestamp':           new Date(),
      'Session_ID':          String(p.session_id          || ''),
      'Ejercicio_ID':        String(p.ejercicio_id        || ''),
      'Texto':               String(p.texto               || '').substring(0, 500),
      'Tipo_Oracion':        String(p.tipo_oracion        || ''),
      'N_Proposiciones':     Number(p.n_proposiciones)    || 0,
      'Aciertos_Verbos':     Number(p.aciertos_verbos)    || 0,
      'Errores_Verbos':      Number(p.errores_verbos)     || 0,
      'Aciertos_Nexos':      Number(p.aciertos_nexos)     || 0,
      'Errores_Nexos':       Number(p.errores_nexos)      || 0,
      'Aciertos_Delimitar':  Number(p.aciertos_delimitar) || 0,
      'Errores_Delimitar':   Number(p.errores_delimitar)  || 0,
      'Aciertos_Clasificar': Number(p.aciertos_clasificar)|| 0,
      'Errores_Clasificar':  Number(p.errores_clasificar) || 0,
      'Total_Aciertos':      aciertosTotales,
      'Total_Errores':       erroresTotales,
      'Porcentaje':          porcentaje,
      'Fases_Saltadas':      String(p.fases_saltadas      || ''),
      'Pistas_Usadas':       String(p.pistas_usadas       || ''),
      'Duracion_Segundos':   Number(p.duracion_segundos)  || 0,
      'User_Agent':          String(p.user_agent          || '').substring(0, 200)
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ════════════════════════════════════════════════════════════════════════
//  FIN DE Compuestas.gs v2.0
// ════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
