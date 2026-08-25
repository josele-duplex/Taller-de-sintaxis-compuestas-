// ════════════════════════════════════════════════════════════════════════
//  TALLER DE SINTAXIS — Módulo "El Laboratorio de Oraciones"
//  F0·sesión 2 (getRetosLaboratorio) + F1·sesión 4 (saveSesionLaboratorio,
//  analíticas silenciosas del motor de cliente).
//  Archivo independiente añadido al proyecto GAS sin tocar Code_v6.gs
//  (salvo la delegación de 2 líneas en doGet Y en doPost, igual que hizo
//  Formacion.gs).
//
//  Este módulo opera sobre 2 hojas:
//    • Laboratorio_Banco — banco de "retos" de sintaxis (gemelo de
//      Formacion_Banco, pero de oración simple)
//      (schema `laboratorio v1.0`, ver docs/Schema_Laboratorio_v1.0.md)
//    • Laboratorio_Practica_Log — analíticas silenciosas de práctica libre
//      (gemela de Chispa_Sesiones/Sintagmas_Sesiones), se crea sola en el
//      primer envío.
//
//  Reutiliza utilidades de Code_v6.gs (scope global compartido):
//    safeParseJSON, getColMap_, ensureSheetHeaders_, appendRowSafe_,
//    gasError_, ERR
//  y de Compuestas.gs (mismo scope global):
//    stripInternalMeta_
//
//  Patrón clonado de getFormacion_ / ensureFormacionBancoSheet_ /
//  dispatchFormacionGet_ (Formacion.gs) para el banco, y de
//  saveSesionChispa_ (Code_v6.gs) para las analíticas — mismo módulo
//  hermano, misma forma de dato (nivel + JSON en una columna + columnas
//  derivadas / fila por segmento con errores en JSON).
//
//  El GET de banco (getRetosLaboratorio) no tiene un parámetro `mode` como
//  en Compuestas — Activo='TRUE' se aplica siempre, según fija el schema
//  (§1 del doc); es la práctica libre la que lee así.
//
//  A diferencia de Formacion_Banco, el banco filtra por TRES parámetros
//  (nivel / curso / funcion), fijado así en el plan de producto §5.3.
//
//  F3 · sesión 1 (25-ago-2026): modo examen con PIN, completo por el lado
//  del servidor — createExamLaboratorio_ (profesor crea PIN) /
//  getExamenLaboratorio_ (alumno entra con PIN) / saveLaboratorioResult_
//  (nota final, con deduplicación email+PIN). Patrón clonado de
//  createExamFormacion_ / getExamenFormacion_ / saveResultadoFormacion_
//  (Server/Formacion.gs) — mismo problema exacto: retos con ítems
//  heterogéneos de varias estaciones, no ejercicios sueltos como en
//  Compuestas/Simples. Todavía SIN motor de cliente que use estos tres
//  endpoints (eso es F3·sesión 2, en js/modules/laboratorio/index.js +
//  el login compartido + el panel del profesor). Ver
//  docs/Laboratorio_Oraciones_Plan_Producto.md §5.4.
//
//  DESPLIEGUE: después de pegar este archivo actualizado en Apps Script,
//  hace falta Implementar → Gestionar implementaciones → lápiz → Nueva
//  versión (NUNCA Nueva implementación) para que saveSesionLaboratorio y
//  el examen con PIN empiecen a responder de verdad.
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
//  ANALÍTICAS SILENCIOSAS — saveSesionLaboratorio (F1·sesión 4, el motor de
//  cliente)
//  Un "segmento" = lo jugado en un nivel del Laboratorio, desde que se
//  elige hasta que se cambia de nivel, se sale o se cierra la pestaña
//  (navigator.sendBeacon sobrevive al cierre). Mismo patrón exacto que
//  saveSesionChispa_ / saveSesionSintagmas_ (Code_v6.gs): una fila por
//  segmento, errores por categoría serializados en JSON. La categoría no
//  es solo la función NGLE: en manipulacion es el propio experimento
//  (sustituye/suprime/cambia_numero/mueve/transforma) — es el eje "qué
//  prueba no sabe aplicar" que pide el plan de producto §5.3, distinto del
//  "qué función falla" que ya da el resto de módulos.
//
//  sendBeacon(url) manda el POST SIN body (todo va en la query string) —
//  el mismo bug que se tragó las analíticas de Chispa en silencio durante
//  semanas (ver la nota de doPost en Code_v6.gs). El dispatcher de abajo
//  recibe siempre `payload` ya resuelto por doPost (que hace ese fallback
//  a e.parameter), así que aquí no hay que pensar en ello.
// ════════════════════════════════════════════════════════════════════════

/**
 * Endpoint 'saveSesionLaboratorio'. Analítica silenciosa de un segmento
 * jugado en el Laboratorio (un nivel, hasta que se cambia o se sale).
 * Llamada por sendBeacon — tolera POST sin body.
 * @param {{email?,name?,grupo?,nivel?,retosCompletados?,aciertos?,totalItems?,rachaMax?,errores?:string}} p - errores es JSON serializado {"sustituye":2,"juicio":1,...}.
 * @return {{ok:true} | object} error (ERR.EXCEPTION) si falla el guardado.
 */
function saveSesionLaboratorio_(p) {
  const HEADER = [
    'Fecha', 'Correo', 'Nombre', 'Grupo', 'Nivel',
    'Retos_Completados', 'Aciertos', 'Total_Items', 'Racha_Max', 'Errores_JSON'
  ];
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Laboratorio_Practica_Log');
    if (!sheet) sheet = ss.insertSheet('Laboratorio_Practica_Log');
    ensureSheetHeaders_(sheet, HEADER);
    appendRowSafe_(sheet, HEADER, {
      'Fecha':              new Date(),
      'Correo':             String(p.email || '').trim().toLowerCase(),
      'Nombre':             String(p.name || '').trim(),
      'Grupo':              String(p.grupo || '').trim(),
      'Nivel':              String(p.nivel || ''),
      'Retos_Completados':  parseInt(p.retosCompletados) || 0,
      'Aciertos':           parseInt(p.aciertos) || 0,
      'Total_Items':        parseInt(p.totalItems) || 0,
      'Racha_Max':          parseInt(p.rachaMax) || 0,
      'Errores_JSON':       String(p.errores || '{}')
    });
    return { ok: true };
  } catch (e) {
    return gasError_(e.message, ERR.EXCEPTION);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  F3 · sesión 1 — EXAMEN CON PIN (primera mitad: hojas + createExamLaboratorio_)
//  Patrón clonado de createExamFormacion_ / FORMACION_EXAM_HEADER
//  (Server/Formacion.gs) — mismo módulo hermano, mismo problema: retos con
//  ítems heterogéneos, no ejercicios sueltos.
//
//  2 hojas nuevas:
//    • Laboratorio_Examenes  — configuración de examen (PIN → retos fijos)
//    • Laboratorio_Resultados — notas de examen (solo modo examen; la
//      práctica libre sigue sin tocar el servidor salvo por
//      saveSesionLaboratorio, que es analítica silenciosa, no nota).
//
//  Laboratorio_Resultados se crea ya (columnas fijadas contra el plan
//  §5.4: curva dura, ponderación por peso, errores por categoría para el
//  Top del informe) aunque todavía no hay ninguna función que escriba en
//  ella — eso es saveLaboratorioResult_, la segunda mitad de F3·1.
// ════════════════════════════════════════════════════════════════════════

const SHEET_LABORATORIO_EXAMS   = 'Laboratorio_Examenes';
const SHEET_LABORATORIO_RESULTS = 'Laboratorio_Resultados';

const LABORATORIO_EXAM_HEADER = [
  'PIN', 'Grupo', 'Evaluacion', 'Nombre_Examen', 'Nivel', 'Curso',
  'N_Retos', 'Timer_Min', 'Incluye_Zona_Gris', 'Estado', 'Fecha', 'Retos_JSON'
];

// Nota / Items_Ok / Items_Err / Items_Totales son PUNTOS PONDERADOS (campo
// `peso` del schema, §6), no conteo de ítems — mismo criterio que ya aplica
// _resolverItem en el motor de práctica del cliente (js/modules/laboratorio/
// index.js). Errores_Categoria_JSON alimenta el eje "qué prueba no sabe
// aplicar" del informe del profesor (plan §5.3), igual que en Fábrica.
const LABORATORIO_RESULT_HEADER = [
  'Fecha', 'Correo', 'Nombre', 'Grupo', 'Nivel', 'Modo',
  'PIN', 'Evaluacion', 'Examen',
  'Nota', 'Items_Ok', 'Items_Err', 'Items_Totales',
  'Errores_Categoria_JSON'
];

function ensureLaboratorioExamSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_LABORATORIO_EXAMS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LABORATORIO_EXAMS);
    sheet.appendRow(LABORATORIO_EXAM_HEADER);
    styleLaboratorioHeader_(sheet, LABORATORIO_EXAM_HEADER.length);
    return sheet;
  }
  ensureSheetHeaders_(sheet, LABORATORIO_EXAM_HEADER);
  return sheet;
}

function ensureLaboratorioResultSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_LABORATORIO_RESULTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LABORATORIO_RESULTS);
    sheet.appendRow(LABORATORIO_RESULT_HEADER);
    styleLaboratorioHeader_(sheet, LABORATORIO_RESULT_HEADER.length);
    return sheet;
  }
  ensureSheetHeaders_(sheet, LABORATORIO_RESULT_HEADER);
  return sheet;
}

// Estación de un ítem — duplicado deliberado de `_estacionDeItem` en
// js/modules/laboratorio/index.js: GAS no puede importar el módulo ES del
// cliente, es la misma clase de duplicación que ya existe entre
// _formacionEstacionDeItem_ (Formacion.gs) y su gemelo del cliente.
// MANTENER EN SINCRONÍA si el schema laboratorio añade un tipo de ítem
// nuevo (LAB_TIPO_ESTACION en laboratorio/index.js y en
// scripts/validar-banco.mjs son los otros dos sitios).
function _laboratorioEstacionDeItem_(item) {
  if (item.tipo === 'analisis_inverso' && item.destino === 'caja_pruebas') return 3;
  const mapa = {
    valencia: 1, que_cambia: 1, intruso: 1,
    manipulacion: 2, juicio: 2, par_minimo: 2, analisis_inverso: 2, frontera: 2,
    etiqueta_prueba: 3, investigacion: 3
  };
  return mapa[item.tipo] || 2;
}

// El examen solo juega Estaciones 2-3 (plan §5.4: la 1 es de aprendizaje,
// sin nada que evaluar). Filtra los ítems de cada reto y descarta el reto
// entero si se queda sin ítems jugables. Además excluye los retos de zona
// gris (`zona_gris:true`, siempre un ítem `frontera`) salvo que el
// profesor marque `incluirZonaGris` al crear el PIN (plan §5.4: "un
// ejercicio con dos respuestas válidas es indefendible ante una
// reclamación" — la exclusión es la opción por defecto, no al revés).
function _laboratorioRetosParaExamen_(retos, incluirZonaGris) {
  return retos
    .filter(r => incluirZonaGris || !r.zona_gris)
    .map(r => {
      const items = (r.items || []).filter(it => _laboratorioEstacionDeItem_(it) >= 2);
      if (items.length === 0) return null;
      return Object.assign({}, r, { items: items });
    })
    .filter(Boolean);
}

/**
 * Endpoint 'createExamLaboratorio'. Requiere clave de profesor. Fija PIN,
 * cierra exámenes previos con el mismo PIN, pre-computa los retos (solo
 * ítems de Estación 2-3, zona gris excluida salvo flag) y los deja listos
 * en Laboratorio_Examenes con Estado='activo'.
 * @param {{pin, nivel?, curso?, nRetos?, timerMin?, incluirZonaGris?, grupo?, evaluacion?, nombreExamen?}} params
 * @return {{ok:true, pin:string, nRetosReales:number} | object} error (ERR.BAD_PIN/ERR.BAD_PARAM).
 */
function createExamLaboratorio_(params) {
  const sheet = ensureLaboratorioExamSheet_();
  const col = getColMap_(sheet);
  const pin = String(params.pin || '').trim();
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return gasError_('PIN inválido (debe tener 4-6 dígitos numéricos)', ERR.BAD_PIN);
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
  const nivel   = String(params.nivel || 'medio').trim().toLowerCase();
  const curso   = String(params.curso || '*').trim().toUpperCase();
  const nRetos  = parseInt(params.nRetos)   || 0;
  const timerMin= parseInt(params.timerMin) || 0;
  const incluirZonaGris = String(params.incluirZonaGris || '').trim().toLowerCase() === 'true';

  // 3) Leer el banco ya filtrado por nivel/curso (mismo filtro que la
  //    práctica libre, getRetosLaboratorio_) y recortarlo a examen
  let retos;
  try {
    const r = getRetosLaboratorio_({ nivel: nivel, curso: curso });
    retos = (r && r.retos) ? r.retos : [];
  } catch (e) {
    return gasError_('Error al leer Laboratorio_Banco: ' + e.message, ERR.EXCEPTION);
  }
  retos = _laboratorioRetosParaExamen_(retos, incluirZonaGris);
  if (!retos.length) {
    return gasError_('No hay retos con ítems de Estación 2-3 para este nivel/curso. Revisa los filtros y el banco.', ERR.BAD_PARAM);
  }

  // 4) Mezclar (Fisher–Yates) y limitar
  for (let j = retos.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [retos[j], retos[k]] = [retos[k], retos[j]];
  }
  if (nRetos > 0 && retos.length > nRetos) retos = retos.slice(0, nRetos);

  // 5) Escribir fila ya activa (a diferencia de Compuestas, aquí no hace
  //    falta el estado intermedio 'creando': el filtrado es rápido y
  //    síncrono, sin llamadas a otro banco pesado — mismo criterio que
  //    createExamFormacion_)
  appendRowSafe_(sheet, LABORATORIO_EXAM_HEADER, {
    'PIN':               pin,
    'Grupo':             params.grupo        || '',
    'Evaluacion':        params.evaluacion   || '',
    'Nombre_Examen':     params.nombreExamen || '',
    'Nivel':             nivel,
    'Curso':             curso,
    'N_Retos':           retos.length,
    'Timer_Min':         timerMin,
    'Incluye_Zona_Gris': incluirZonaGris ? 'TRUE' : 'FALSE',
    'Estado':            'activo',
    'Fecha':             new Date().toISOString(),
    'Retos_JSON':        JSON.stringify(retos)
  });

  // 6) Invalidar caché del PIN (por si había uno anterior)
  try { CacheService.getScriptCache().remove('labexam_' + pin); } catch (e) {}

  return { ok: true, pin: pin, nRetosReales: retos.length };
}

/**
 * Endpoint 'getExamenLaboratorio'. El alumno entra con el PIN; lee la
 * config pre-computada por createExamLaboratorio_ (cache → hoja). Patrón
 * clonado de getExamenFormacion_ (Server/Formacion.gs).
 * @param {{pin:string}} params
 * @return {object} config del examen o error (ERR.BAD_PIN/ERR.PIN_NOT_FOUND/ERR.EXAM_INACTIVE).
 */
function getExamenLaboratorio_(params) {
  const pin = String(params.pin || '').trim();
  if (!pin || pin.length < 4) return gasError_('PIN inválido', ERR.BAD_PIN);

  const cacheKey = 'labexam_' + pin;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_LABORATORIO_EXAMS);
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
      nivel: String(data[i][col['Nivel']] || 'medio').trim(),
      curso: String(data[i][col['Curso']]  || '*').trim(),
      timer: parseInt(data[i][col['Timer_Min']]) || 0,
      incluyeZonaGris: String(data[i][col['Incluye_Zona_Gris']] || '').trim().toUpperCase() === 'TRUE',
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
 * Endpoint 'saveLaboratorioResult' (POST). Guarda la nota de un examen del
 * Laboratorio; dedup por email+PIN igual que saveResultadoFormacion_. La
 * práctica libre no llama a este endpoint (esa es saveSesionLaboratorio_,
 * analítica silenciosa sin nota).
 * @param {{email?,name?,grupo?,nivel?,modo?,pin?,evaluacion?,examen?,nota?,itemsOk?,itemsErr?,itemsTotales?,erroresCategoria?}} p
 * @return {{ok:true, duplicate?:boolean} | object} error (ERR.LOCK_TIMEOUT).
 */
function saveLaboratorioResult_(p) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return gasError_('Servidor ocupado, inténtalo de nuevo.', ERR.LOCK_TIMEOUT);
  }
  try {
    const sheet = ensureLaboratorioResultSheet_();
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
    appendRowSafe_(sheet, LABORATORIO_RESULT_HEADER, {
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

// ════════════════════════════════════════════════════════════════════════
//  DISPATCHERS — mismo patrón que dispatchFormacionGet_/dispatchFormacionPost_.
//  Code_v6.gs los llama desde el fallback de doGet/doPost cuando la action
//  no está en su cadena de if/else principal ni la reconocen
//  dispatchCompuestasGet_/Post_ ni dispatchFormacionGet_/Post_.
// ════════════════════════════════════════════════════════════════════════

function dispatchLaboratorioGet_(action, params) {
  switch (action) {
    case 'getRetosLaboratorio': return getRetosLaboratorio_(params);
    case 'createExamLaboratorio': {
      const na = (typeof requiereClaveProfesor_ === 'function') ? requiereClaveProfesor_(params) : null;
      return na || createExamLaboratorio_(params);
    }
    case 'getExamenLaboratorio': return getExamenLaboratorio_(params);
    default: return null;
  }
}

function dispatchLaboratorioPost_(action, payload) {
  switch (action) {
    case 'saveSesionLaboratorio': return saveSesionLaboratorio_(payload);
    case 'saveLaboratorioResult': return saveLaboratorioResult_(payload);
    default: return null;
  }
}
