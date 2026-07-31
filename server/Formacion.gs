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
    default: return null;
  }
}
