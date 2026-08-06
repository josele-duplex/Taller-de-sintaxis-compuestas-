// ════════════════════════════════════════════════════════════════════════
//  TALLER DE SINTAXIS — Módulo "El Laboratorio de Oraciones" — F0 · sesión 2
//  Archivo independiente añadido al proyecto GAS sin tocar Code_v6.gs
//  (salvo la delegación de 2 líneas en doGet, igual que hizo Formacion.gs).
//
//  Este módulo opera sobre 1 hoja nueva:
//    • Laboratorio_Banco — banco de "retos" de sintaxis (gemelo de
//      Formacion_Banco, pero de oración simple)
//      (schema `laboratorio v1.0`, ver docs/Schema_Laboratorio_v1.0.md)
//
//  Reutiliza utilidades de Code_v6.gs (scope global compartido):
//    safeParseJSON, getColMap_, ensureSheetHeaders_
//  y de Compuestas.gs (mismo scope global):
//    stripInternalMeta_
//
//  Patrón clonado de getFormacion_ / ensureFormacionBancoSheet_ /
//  dispatchFormacionGet_ (Formacion.gs) — mismo módulo hermano, misma
//  forma de dato (nivel + JSON en una columna + columnas derivadas).
//
//  Solo lee el banco (F1, el motor de cliente que lo consume, es sesión
//  aparte). No hay todavía modo examen/PIN para este módulo: por eso no
//  existe un parámetro `mode` como en Compuestas — Activo='TRUE' se aplica
//  siempre, según fija el schema (§1 del doc).
//
//  A diferencia de Formacion_Banco, este banco filtra por TRES parámetros
//  (nivel / curso / funcion), fijado así en el plan de producto §5.3.
// ════════════════════════════════════════════════════════════════════════

// ── Nombre de la hoja nueva ──────────────────────────────────────────────
const SHEET_LABORATORIO_BANCO = 'Laboratorio_Banco';

// ── Estilo visual de cabecera (verde, para distinguirlo a simple vista del
//    azul de Compuestas y del violeta de Formación al abrir el Sheet) ─────
const LAB_HEADER_BG = '#1b7a4d';
const LAB_HEADER_FG = '#ffffff';

// ── Cabecera (orden fijado en Schema_Laboratorio_v1.0.md §1; NUNCA leemos
//    por posición, siempre por nombre vía getColMap_) ────────────────────
const LABORATORIO_BANCO_HEADER = [
  'ID', 'Nivel', 'Curso_Min', 'Titulo_Problema', 'Funciones',
  'Tipos_Item', 'JSON_Reto', 'Fuente', 'Zona_Gris', 'Activo'
];

// Orden de Curso_Min (schema §1: 2E/3E/4E/1B). El filtro `curso` es "como
// máximo este curso": un alumno de 4E también puede recibir retos de
// Curso_Min 2E/3E, pero no de 1B. Mismo criterio que nivel_max en Compuestas.
const LAB_CURSO_ORDEN = { '2E': 1, '3E': 2, '4E': 3, '1B': 4 };

// ════════════════════════════════════════════════════════════════════════
//  ENSURE-SHEET — patrón idéntico a ensureFormacionBancoSheet_
// ════════════════════════════════════════════════════════════════════════

function styleLaboratorioHeader_(sheet, nCols) {
  if (!sheet || nCols <= 0) return;
  const header = sheet.getRange(1, 1, 1, nCols);
  header.setFontWeight('bold')
        .setBackground(LAB_HEADER_BG)
        .setFontColor(LAB_HEADER_FG)
        .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function ensureLaboratorioBancoSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_LABORATORIO_BANCO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LABORATORIO_BANCO);
    sheet.appendRow(LABORATORIO_BANCO_HEADER);
    styleLaboratorioHeader_(sheet, LABORATORIO_BANCO_HEADER.length);
    sheet.setColumnWidth(4, 320); // Titulo_Problema: ancha para legibilidad
    sheet.setColumnWidth(7, 260); // JSON_Reto: ancha también
    return sheet;
  }
  // El formato de cabecera solo se aplica al CREAR la hoja (rama de arriba):
  // repintarlo en cada llamada gastaba cuota de Sheets sin necesidad
  // (mismo razonamiento que ensureFormacionBancoSheet_).
  ensureSheetHeaders_(sheet, LABORATORIO_BANCO_HEADER);
  return sheet;
}

// ════════════════════════════════════════════════════════════════════════
//  ENDPOINT — getRetosLaboratorio
//  Lee Laboratorio_Banco (con caché 5 min) y devuelve los retos activos,
//  opcionalmente filtrados por Nivel / Curso_Min / Funciones. Patrón
//  análogo a getFormacion_ / readFormacionBancoFromSheet_.
//
//  Parámetros (todos opcionales):
//    nivel    'basico'|'medio'|'avanzado' | '*' (u omitido) → sin filtro
//    curso    '2E'|'3E'|'4E'|'1B' | '*' (u omitido) → sin filtro
//             (semántica "como máximo este curso", ver LAB_CURSO_ORDEN)
//    funcion  nombre exacto de función NGLE (p.ej. "CD") | '*' → sin filtro
// ════════════════════════════════════════════════════════════════════════

function getRetosLaboratorio_(params) {
  const cacheKey = 'laboratorio_all';

  // 1) Cache rápida (TTL 300s). Cacheamos el banco completo (ya filtrado
  //    por Activo='TRUE', que se aplica siempre); los filtros de Nivel/
  //    Curso/Función se aplican después en memoria, igual que en Formación.
  const cache = CacheService.getScriptCache();
  let banco = null;
  try {
    const cached = cache.get(cacheKey);
    if (cached) banco = JSON.parse(cached);
  } catch (e) {
    console.warn('[getRetosLaboratorio_] cache parse error:', e.message);
    banco = null;
  }

  // 2) Cache miss: leer la hoja
  if (!banco) {
    banco = readLaboratorioBancoFromSheet_();
    try {
      const json = JSON.stringify(banco);
      if (json.length < 90000) cache.put(cacheKey, json, 300); // límite CacheService: 100KB/entrada
    } catch (e) { /* silent */ }
  }

  // 3) Filtro opcional por Nivel (exacto, no "máximo" — igual que Formación:
  //    el schema no define una escalera de niveles para este módulo).
  const nivel = String(params.nivel || '*').trim().toLowerCase();
  let filtrados = (nivel === '*' || nivel === '')
    ? banco
    : banco.filter(r => String(r._nivel).toLowerCase() === nivel);

  // 4) Filtro opcional por Curso_Min ("como máximo este curso": el reto es
  //    servible si su Curso_Min no es posterior al curso pedido).
  const curso = String(params.curso || '*').trim().toUpperCase();
  if (curso !== '*' && curso !== '' && LAB_CURSO_ORDEN[curso]) {
    const tope = LAB_CURSO_ORDEN[curso];
    filtrados = filtrados.filter(r => (LAB_CURSO_ORDEN[r._cursoMin] || 0) <= tope);
  }

  // 5) Filtro opcional por Función (contra la columna derivada _funciones,
  //    ya trae la lista sin parsear los ítems del JSON otra vez).
  const funcion = String(params.funcion || '*').trim();
  if (funcion !== '*' && funcion !== '') {
    filtrados = filtrados.filter(r => Array.isArray(r._funciones) && r._funciones.indexOf(funcion) !== -1);
  }

  // 6) Devolver SOLO el JSON_Reto limpio (sin las metaclaves internas)
  const retos = filtrados.map(stripInternalMeta_);
  return {
    ok: true,
    retos: retos,
    total: retos.length,
    nivel: (nivel === '*' || nivel === '') ? 'todos' : nivel,
    curso: (curso === '*' || curso === '') ? 'todos' : curso,
    funcion: (funcion === '*' || funcion === '') ? 'todas' : funcion,
  };
}

// Lee Laboratorio_Banco fila por fila y devuelve un array de objetos con el
// JSON_Reto ya parseado y las metaclaves _nivel/_cursoMin/_funciones
// adheridas. Activo='TRUE' se exige siempre (a diferencia de Compuestas,
// este módulo no tiene todavía un modo "practice" que también sirva
// borradores).
function readLaboratorioBancoFromSheet_() {
  const sheet = ensureLaboratorioBancoSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const col = getColMap_(sheet);

  const out = [];
  for (let i = 0; i < data.length; i++) {
    const row      = data[i];
    const id       = String(row[col['ID']] || '').trim();
    const nivel    = String(row[col['Nivel']] || '').trim();
    const cursoMin = String(row[col['Curso_Min']] || '').trim().toUpperCase();
    const funciones= String(row[col['Funciones']] || '').split(';').map(f => f.trim()).filter(Boolean);
    const activo   = String(row[col['Activo']] || '').trim().toUpperCase();
    const rawJson  = String(row[col['JSON_Reto']] || '');

    if (!id || !rawJson) continue;
    if (activo !== 'TRUE') continue;

    const parsed = safeParseJSON(rawJson);
    if (!parsed) {
      console.warn('[readLaboratorioBancoFromSheet_] JSON inválido en fila', i + 2, 'ID=', id);
      continue;
    }
    // La columna ID manda sobre el "id" de dentro del JSON — mismo motivo
    // y misma regla que readFormacionBancoFromSheet_: así da igual qué id
    // traiga el JSON pegado, sirve siempre el de la hoja.
    parsed.id = id;
    parsed._nivel = nivel.toLowerCase();
    parsed._cursoMin = cursoMin;
    parsed._funciones = funciones;
    out.push(parsed);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════
//  DISPATCHER — mismo patrón que dispatchFormacionGet_.
//  Code_v6.gs lo llama desde el fallback de doGet cuando la action no está
//  en su cadena de if/else principal ni la reconocen dispatchCompuestasGet_
//  ni dispatchFormacionGet_.
//
//  Solo GET por ahora: esta sesión (F0·2) es exclusivamente el endpoint de
//  lectura. El examen con PIN (createExamLaboratorio_/saveLaboratorioResult_,
//  §5.3-5.4 del plan) es sesión aparte, igual que en Formación (F3).
// ════════════════════════════════════════════════════════════════════════

function dispatchLaboratorioGet_(action, params) {
  switch (action) {
    case 'getRetosLaboratorio': return getRetosLaboratorio_(params);
    default: return null;
  }
}
