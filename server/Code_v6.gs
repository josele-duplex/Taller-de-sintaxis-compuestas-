// ════════════════════════════════════════════════════════════════════════
//  TALLER DE SINTAXIS — Google Apps Script  v6.3  (2026-05-26)
//
//  Backend de la webapp. Sirve oraciones (practice/exam), guarda resultados
//  de alumnos, gestiona morfología/arcade/misiones y ofrece menús de
//  mantenimiento dentro de la hoja. El módulo de oración compuesta está
//  en un archivo aparte: Compuestas.gs (mismo proyecto, scope global).
//
//  Cambios v6.3 (mayo 2026):
//    • A2a: limpieza de 562 líneas obsoletas (one-shots ya ejecutados)
//    • A2b: menuValidarCoherencia + menuLimpiarBackupsAntiguos
//    • Header reorganizada y changelog antiguo archivado en commits
//
//  Cambios anteriores: ver historial git (commits previos a 2026-05-26)
// ════════════════════════════════════════════════════════════════════════
//
// ════════════════════════════════════════════════════════════════════════
//  ÍNDICE  (líneas aproximadas — usa Ctrl+F para saltar a la sección)
// ════════════════════════════════════════════════════════════════════════
//
//   §1  CONSTANTES Y HELPERS BÁSICOS                            65–608
//        • Nombres de hojas y columnas de Oraciones_Banco         69–90
//        • safeParseJSON — tolera JSONs corruptos                 97–128
//        • buildOracionObject — fila Sheets → objeto frontend    135–352
//        • Helpers de sintagma, verbos, funciones, normalización 353–608
//
//   §2  ENDPOINTS GET  (doGet?action=...)                      608–822
//        doGet · getOraciones_ · getOracionesFiltradas_ ·
//        validatePin_ · getResults_
//
//   §3  MORFOLOGÍA · MISIONES · STATS                          822–1110
//        precomputeMorfologia_ · regenerarMorfologia_ ·
//        getTextosMorfologia_ · getMisiones_ · createMision_ ·
//        saveMisionResult_ · getStats_ · getResultsByGroup_
//
//   §4  SISTEMA DE EXÁMENES (PIN)                             1110–1450
//        Utilidades de columnas (getColMap_, appendRowSafe_, …) ·
//        ensureExamSheet_ · createExam_ · getExamConfig_
//
//   §5  ENDPOINTS POST  (doPost?action=...)                   1450–1691
//        doPost · saveResult_ · saveSesionPractica_ ·
//        saveArcadeScore_ · getRankingArcade_ · saveMorphResult_
//
//   §6  MENÚ DEL PROFESOR                                     1691–2012
//        onOpen + operaciones de aula: crear examen, activar/desactivar
//        oraciones, configurar validaciones, generar PIN, etc.
//
//   §7  ETIQUETADO AUTOMÁTICO (IA)                            2012–2125
//        generarEtiquetas · menuRegenerarMorfologia · resumenEtiquetas
//
//   §8  DASHBOARD Y UI DE HOJAS                               2125–2365
//        setupSheetUI_ · crearDashboard_ · menuDashboard · métricas
//
//   §9  AUDITORÍA Y REPARACIÓN DEL BANCO                      2365–2714
//        auditarOracionesBanco_ · repararOracionesBanco_ ·
//        menuLimpiarColoresAuditoria
//
//   §10 LIMPIEZA Y COHERENCIA                                 2714–2945
//        menuAutotest · menuLimpiarHojasObsoletas · menuLimpiarBackupsAntiguos ·
//        menuValidarCoherencia · menuPurgarLogsGAS
//
//   §11 INFORME DEL PROFESOR (Excel multi-hoja)               2945–final
//        getInformeProfesor_ · agregadores por alumno/grupo ·
//        diagnóstico pedagógico (errores típicos)
//
//  Módulo de oración compuesta: en archivo aparte (Compuestas.gs).
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
//  §1 — CONSTANTES Y HELPERS BÁSICOS
// ════════════════════════════════════════════════════════════════════════

// ── Nombres de hojas ──────────────────────────────────────────────────
const SHEET_BANCO    = 'Oraciones_Banco';
const SHEET_RESULTS  = 'Alumnos_Resultados';
const SHEET_SESIONES = 'Sesiones_Practica';
const SHEET_MORPH    = 'Morfologia_Resultados';
const SHEET_ARCADE   = 'Ranking_Arcade';
const SHEET_CONFIG   = 'Config';
const SHEET_MORPH_TXT= 'Morfologia_Textos';
const SHEET_MISIONES = 'Misiones';
const SHEET_MIS_RES  = 'Misiones_Resultados';
const SHEET_EXAMS    = 'Examenes_Config';

// ── Códigos de error (campo `code` en respuestas {error:...}) ─────────
const ERR = {
  NO_SHEET:        'NO_SHEET',
  BAD_PIN:         'BAD_PIN',
  BAD_PARAM:       'BAD_PARAM',
  PIN_NOT_FOUND:   'PIN_NOT_FOUND',
  EXAM_CLOSED:     'EXAM_CLOSED',
  EXAM_EMPTY:      'EXAM_EMPTY',
  EXAM_PREPARING:  'EXAM_PREPARING',
  EXAM_INACTIVE:   'EXAM_INACTIVE',
  UNKNOWN_ACTION:  'UNKNOWN_ACTION',
  LOCK_TIMEOUT:    'LOCK_TIMEOUT',
  EXCEPTION:       'EXCEPTION',
};

const SHEET_LOGS = 'Logs_GAS';
const LOGS_HEADER = ['Fecha','Nivel','Endpoint','Mensaje','Code','Stack'];
const LOGS_MAX_ROWS = 500; // purga automática al superar este límite

// ── B2: Registro en hoja Logs_GAS (solo para errores inesperados) ─────
// Nunca lanza excepción para no ocultar el error original.
function logToSheet_(level, endpoint, msg, code, stack) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_LOGS);
      sheet.appendRow(LOGS_HEADER);
      sheet.getRange(1, 1, 1, LOGS_HEADER.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), level, endpoint || '', msg || '', code || '', (stack || '').slice(0, 500)]);
    // Purga automática: si hay más de LOGS_MAX_ROWS filas de datos, borra las más antiguas
    const nData = sheet.getLastRow() - 1; // excluir cabecera
    if (nData > LOGS_MAX_ROWS) {
      sheet.deleteRows(2, nData - LOGS_MAX_ROWS);
    }
  } catch(e) {
    Logger.log('[logToSheet_ failed] %s', e.message);
  }
}

// Construye {ok:false, error:msg, code:code} y lo registra en Stackdriver.
// Para excepciones inesperadas usa logToSheet_ directamente en los catch de doGet/doPost.
function gasError_(msg, code) {
  Logger.log('[GAS ERROR] code=%s msg=%s', code, msg);
  return { ok: false, error: msg, code: code };
}

// ── B3: Valida que el payload contenga los campos requeridos ──────────
// Uso: const err = requireParams_(payload, ['nick','score']); if (err) return err;
// Ignora campos que vienen como 0 (número válido) pero rechaza null/undefined/''.
function requireParams_(payload, required) {
  if (!payload || typeof payload !== 'object') {
    return gasError_('Payload vacío o inválido.', ERR.BAD_PARAM);
  }
  const missing = required.filter(k => {
    const v = payload[k];
    return v === undefined || v === null || v === '';
  });
  if (missing.length > 0) {
    return gasError_('Faltan parámetros: ' + missing.join(', '), ERR.BAD_PARAM);
  }
  return null; // todo bien
}

// ── Columnas de Oraciones_Banco (1-indexed) ───────────────────────────
// A=1 Oracion_Texto | B=2 Sujeto | C=3 Verbo | D=4 Tipo_Sujeto
// E=5 Estructura_JSON | F=6 Activo
const COL_TEXTO   = 1;
const COL_SUJETO  = 2;
const COL_VERBO   = 3;
const COL_TIPO    = 4;
const COL_JSON    = 5;
const COL_ACTIVO  = 6;
const COL_TAGS    = 7;  // New in v4.7: JSON etiquetas {tipo_oracion,sujeto,predicado,funciones_presentes,dificultad}
const COL_SUBFASE = 8;  // New in v4.7: subfase mínima requerida (solo_np|np_sujeto|completo|profundo)

// ════════════════════════════════════════════════════════════════════════
//  safeParseJSON — tolera JSONs con 1-2 caracteres extra al final
//  (error frecuente en JSONs generados por IA)
// ════════════════════════════════════════════════════════════════════════
function safeParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  let parsed = null;

  // 1. Intento directo
  try { parsed = JSON.parse(s); } catch(e1) {}

  // 2. Recortar hasta 4 caracteres del final
  if (parsed === null) {
    for (let trim = 1; trim <= 4; trim++) {
      try { parsed = JSON.parse(s.slice(0, -trim)); break; } catch(e) {}
    }
  }

  // 3. Si empieza por { y hay }{  → envolver en array
  if (parsed === null && s.startsWith('{') && s.includes('}{')) {
    try { parsed = JSON.parse('[' + s.replace(/\}\s*\{/g, '},{') + ']'); } catch(e) {}
  }

  if (parsed === null) return null; // irrecuperable

  // 4. Auto-envolver objeto suelto en lista (tolerancia a datos no reparados)
  if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
    if (parsed.función !== undefined || parsed.segmento !== undefined) {
      parsed = [parsed];
    }
  }

  return parsed;
}

// ════════════════════════════════════════════════════════════════════════
//  buildOracionObject — convierte una fila del Sheets en el objeto
//  que espera el frontend: { id, oracion_completa, palabras, fase3 }
//  La Estructura_JSON del Sheets es el análisis de funciones del predicado.
// ════════════════════════════════════════════════════════════════════════
function buildOracionObject(row, rowIndex) {
  const texto   = row[COL_TEXTO   - 1] ? String(row[COL_TEXTO   - 1]).trim() : '';
  const sujeto  = row[COL_SUJETO  - 1] ? String(row[COL_SUJETO  - 1]).trim() : '';
  const verbo   = row[COL_VERBO   - 1] ? String(row[COL_VERBO   - 1]).trim() : '';
  const tipo    = row[COL_TIPO    - 1] ? String(row[COL_TIPO    - 1]).trim() : '';
  const rawJson = row[COL_JSON    - 1] ? String(row[COL_JSON    - 1])         : '';
  const rawTags = row[COL_TAGS    - 1] ? String(row[COL_TAGS    - 1]) : '{}';

  if (!texto) return null;

  const estructura = safeParseJSON(rawJson);
  // Parse tags to extract funciones_presentes for frontend filters
  let tagsFuncs = [];
  try {
    const tags = JSON.parse(rawTags);
    tagsFuncs = tags.funciones_presentes || [];
  } catch(e) { tagsFuncs = []; }
  // DEFENSIVE NORMALIZATION: G column may contain legacy/variant labels
  // (e.g. "C.Agente" vs "C.Ag.", "Mod. Orac." vs "Mod.Or.") that won't
  // match the frontend filters by exact string. Normalize before sending.
  if (tagsFuncs.length > 0) {
    const seen = {};
    const normalized = [];
    for (let f of tagsFuncs) {
      let canonical = f;
      if (typeof FUNC_NORMALIZATION !== 'undefined' && FUNC_NORMALIZATION.hasOwnProperty(f)) {
        canonical = FUNC_NORMALIZATION[f];
        if (canonical === null) continue; // function explicitly excluded
      }
      if (!seen[canonical]) {
        seen[canonical] = true;
        normalized.push(canonical);
      }
    }
    tagsFuncs = normalized;
  }
  // estructura puede ser un objeto ({}) o un array ([{},{},...])
  const bloques = estructura
    ? (Array.isArray(estructura) ? estructura : [estructura])
    : [];

  // Tokenizar el texto en palabras para el frontend
  let palabras = texto.replace(/([.,;:!?¡¿])/g, ' $1 ')
                      .split(/\s+/)
                      .filter(Boolean);

  // ─────────────────────────────────────────────────────────────────────
  // Soporte de pronombres enclíticos (Llamadme, dímelo, hazlo…)
  // ─────────────────────────────────────────────────────────────────────
  // Estrategia: la tokenización por espacios deja "Llamadme" como un solo
  // token, así que findIndices(["Llamadme",...], ["Llamad"]) falla y el
  // alumno no puede señalar el verbo. Nuestra estrategia es defensiva:
  //   1. Hacemos el primer findIndices con la tokenización estándar.
  //   2. SOLO si falla, asumimos que la palabra del verbo lleva enclítico
  //      fundido. Aplicamos splitEncliticosEnPalabras_ y reintentamos.
  // De este modo, las oraciones que ya funcionan no cambian de tokenización
  // (cero falsos positivos en formas verbales como "señala", "compra", etc.
  // que parecen acabar en enclítico pero no lo llevan).
  //
  // Casos que cubre la recuperación:
  //   imperativos: "Llamadme", "dímelo", "hazlo", "ponte", "vístete"
  //   infinitivos: "darme", "decirle", "hacerlo"
  //   gerundios:   "dándome", "diciéndole"
  //
  // Función auxiliar que devuelve los verbIndices, aplicando split solo si
  // hace falta, y modificando palabras por referencia (return el nuevo array).
  function _resolverVerbIndices() {
    let verbTokens = (verbo || '').replace(/([.,;:!?¡¿])/g, ' $1 ')
                                  .split(/\s+/).filter(Boolean);
    // Intento 1: sin tocar nada.
    let idx = findIndices(palabras, verbTokens);
    if (idx.length > 0) return { palabras: palabras, verbTokens: verbTokens, verbIndices: idx };
    // Intento 2: el campo Verbo tiene enclítico fundido (p.ej. "Llamadme").
    // Lo descomponemos y reintentamos contra la oración original.
    const verbTokensSplit = splitEncliticosEnPalabras_(verbTokens, null);
    if (JSON.stringify(verbTokensSplit) !== JSON.stringify(verbTokens)) {
      idx = findIndices(palabras, verbTokensSplit);
      if (idx.length > 0) {
        return { palabras: palabras, verbTokens: verbTokensSplit, verbIndices: idx };
      }
    }
    // Intento 3: la oración tiene una palabra "verbo+enclítico" fundida.
    // Descomponemos las palabras usando como referencia las raíces conocidas
    // del campo Verbo (las que acabamos de obtener en verbTokensSplit).
    const palabrasSplit = splitEncliticosEnPalabras_(palabras, verbTokensSplit);
    if (JSON.stringify(palabrasSplit) !== JSON.stringify(palabras)) {
      idx = findIndices(palabrasSplit, verbTokensSplit);
      if (idx.length > 0) {
        return { palabras: palabrasSplit, verbTokens: verbTokensSplit, verbIndices: idx };
      }
    }
    // Sin suerte: devolvemos lo que teníamos para que el resto del flujo siga
    // funcionando (verbIndices vacío implica que el frontend mostrará la
    // oración pero nada matcheará — ya tenemos guardas para ese caso).
    return { palabras: palabras, verbTokens: verbTokens, verbIndices: [] };
  }
  const _resolved = _resolverVerbIndices();
  palabras = _resolved.palabras;
  // ─────────────────────────────────────────────────────────────────────

  // Determinar si hay sujeto tácito o impersonal a partir de la columna Sujeto
  const sujetoLower = sujeto.toLowerCase();
  const esTacito    = sujetoLower.includes('s.o.') || sujetoLower.includes('sujeto omitido');
  const esImpersonal= sujetoLower === '---' || sujetoLower === '' || sujetoLower === 'impersonal';

  // Construir fase3.bloques en el formato que espera el frontend
  // El JSON del Sheets tiene: segmento, función, sintagma, naturaleza, estructura
  // Defensive normalization: some legacy rows have "segment" (English) instead
  // of "segmento" (Spanish). Fix here so the filter below doesn't drop them.
  bloques.forEach(b => {
    if (b && typeof b === 'object' && 'segment' in b && !('segmento' in b)) {
      b.segmento = b.segment;
    }
  });
  const fase3Bloques = bloques
    .filter(b => b && b.segmento && b.función && b.sintagma)
    .map((b, i) => {
      const segmento = String(b.segmento);
      const func     = String(b.función).trim();
      const sint     = String(b.sintagma);
      // Encontrar los índices de las palabras del segmento en el array palabras
      const segTokens = segmento.replace(/([.,;:!?¡¿])/g, ' $1 ').split(/\s+/).filter(Boolean);
      const indices   = findIndices(palabras, segTokens);
      // Normalize syntactic function names to match frontend labels
      const normFunc = normalizeFuncOrac(func);
      return {
        id:       'b' + rowIndex + '_' + i,
        indices:  indices,
        solucion: sint + ' | ' + normFunc,
        consejo:  b.consejo || generarConsejo(normFunc),
        naturaleza: b.naturaleza || '',
      };
    });

  // Añadir bloques pre-resueltos: Sujeto y NP
  // verbIndices y verbTokens vienen ya calculados por _resolverVerbIndices()
  // arriba (que aplicó split de enclíticos solo si era necesario).
  const verbTokens  = _resolved.verbTokens;
  const verbIndices = _resolved.verbIndices;

  let sujetoIndices = [];
  if (!esTacito && !esImpersonal && sujeto) {
    const sujTokens = sujeto.replace(/([.,;:!?¡¿])/g, ' $1 ').split(/\s+/).filter(Boolean);
    sujetoIndices   = findIndices(palabras, sujTokens);
  }

  const allBloques = [];
  // NP (pre-resuelto)
  if (verbIndices.length > 0) {
    allBloques.push({ id: 'b'+rowIndex+'_np', indices: verbIndices, solucion: 'SV | NP', consejo: '' });
  }
  // Sujeto (pre-resuelto o tácito)
  if (esTacito) {
    const pronoun = extractPronoun(sujeto);
    allBloques.push({ id: 'b'+rowIndex+'_suj', indices: [], solucion: 'Ø | Sujeto tácito', consejo: '', tacito: true, pronoun: pronoun });
  } else if (esImpersonal) {
    // no sujeto block needed
  } else if (sujetoIndices.length > 0) {
    allBloques.push({ id: 'b'+rowIndex+'_suj', indices: sujetoIndices, solucion: 'SN | Sujeto', consejo: '' });
  }
  // Resto de bloques del JSON
  allBloques.push(...fase3Bloques.filter(b => {
    const f = b.solucion.split(' | ')[1] || '';
    // Excluir: NP, Sujeto, y segmentos de núcleo verbal (V. Pronominal, etc.)
    return f !== 'NP' && f !== 'Sujeto' && f !== 'Sujeto tácito' && !f.startsWith('N (');
  }));

  // Fase4: construir sintagmas a partir de la estructura interna del JSON
  const fase4Sintagmas = bloques
    .filter(b => b && b.estructura && b.segmento && b.sintagma)
    .map((b, i) => buildSintagma(b, rowIndex, i))
    .filter(Boolean);

  return {
    id:               rowIndex,
    oracion_completa: texto,
    palabras:         palabras,
    funciones_presentes: tagsFuncs, // For frontend filter system
    fase1: {
      nucleo_predicado_indices: verbIndices,
      tipo_verbo_categoria: detectarTipoVerbo(verbo),
      consejo: 'Identifica el verbo conjugado. ¿Con qué persona y número concuerda con el sujeto?'
    },
    fase2: {
      sujeto_indices:  sujetoIndices,
      sujeto_tacito:   esTacito,
      sin_sujeto:      esImpersonal,
      nucleo_tacito:   esTacito ? extractPronoun(sujeto) : '',
      consejo: 'Fíjate en la concordancia entre el verbo y el grupo nominal sujeto.'
    },
    fase3: {
      tipo_predicado: tipo.includes('Nominal') ? 'PN' : 'PV',
      bloques: allBloques
    },
    fase4: fase4Sintagmas.length > 0 ? { sintagmas: fase4Sintagmas } : null
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

// Lista de enclíticos del español, ordenada por longitud descendente para
// que "melo" se separe como un único enclítico doble y no como "me" + "lo".
const ENCLITICOS_ = [
  // Dobles (CD + CI o reflexivo + CD)
  'noslo','nosla','noslos','noslas',
  'melo','mela','melos','melas',
  'telo','tela','telos','telas',
  'selo','sela','selos','selas',
  'sele','seles',
  // Simples
  'me','te','se','lo','la','los','las','le','les','nos','os'
];

// Termina en vocal o en consonante propia de imperativo/infinitivo/gerundio?
// Heurística defensiva para evitar separar enclíticos en sustantivos como
// "muerte" → "muer"+"te", "abuela" → "abue"+"la", etc. Solo separamos si la
// raíz que queda termina en patrón verbal.
function pareceRaizVerbal_(raiz) {
  if (raiz.length < 2) return false;
  // Imperativos plurales: -ad, -ed, -id (p.ej. Llamad, Comed, Salid)
  if (/[aeiou]d$/i.test(raiz)) return true;
  // Imperativos singulares: terminan en vocal acentuada o no (-a, -e, -í, -á, -é)
  // Pero solo aceptamos si la raíz tiene >= 3 letras para evitar falsos positivos
  if (raiz.length >= 3 && /[aeiouáéíóú]$/i.test(raiz)) return true;
  // Infinitivos: -ar, -er, -ir (p.ej. darme → "dar")
  if (/(ar|er|ir)$/i.test(raiz)) return true;
  // Gerundios: -ndo (p.ej. dándome → "dando", diciéndole → "diciendo")
  if (/ndo$/i.test(raiz)) return true;
  return false;
}

// Separa un token verbal con enclítico en [raíz, enclítico]. Devuelve null
// si la palabra no termina en enclítico válido o si la raíz no parece
// verbal. Si `verbosBase` es un array, además exige que la raíz coincida
// (insensible a mayúsculas) con uno de esos verbos. Si `verbosBase` es
// null, separa siempre que la raíz parezca verbal (modo "always split"
// usado para descomponer el campo Verbo del propio Sheet).
function intentarSepararEnclitico_(token, verbosBase) {
  const limpio = token.replace(/[.,;:!?¡¿]/g, '');
  if (!limpio) return null;
  const lower = limpio.toLowerCase();
  for (const enc of ENCLITICOS_) {
    if (!lower.endsWith(enc)) continue;
    const raiz = limpio.slice(0, limpio.length - enc.length);
    if (raiz.length < 2) continue;
    if (verbosBase && verbosBase.length) {
      const raizLower = raiz.toLowerCase();
      const hit = verbosBase.some(v => v.toLowerCase() === raizLower);
      if (!hit) continue;
      // raíz coincide con un verbo del Sheet — separamos sin más checks
    } else {
      if (!pareceRaizVerbal_(raiz)) continue;
    }
    // Conservar capitalización del original. Si la primera letra del token
    // era mayúscula, también lo es la raíz; el enclítico siempre va en
    // minúsculas (estándar del español).
    const raizCap = limpio.charAt(0) === limpio.charAt(0).toUpperCase()
      ? limpio.charAt(0).toUpperCase() + raiz.slice(1).toLowerCase()
      : raiz.toLowerCase();
    // Conservar puntuación final si la había
    const trailingPunct = (token.match(/[.,;:!?¡¿]+$/) || [''])[0];
    return [raizCap, enc + trailingPunct];
  }
  return null;
}

// Aplica intentarSepararEnclitico_ a cada palabra del array. Si `verbosBase`
// es null, opera en modo "always split". Devuelve un nuevo array de tokens.
function splitEncliticosEnPalabras_(palabras, verbosBase) {
  const out = [];
  for (const tok of palabras) {
    const split = intentarSepararEnclitico_(tok, verbosBase);
    if (split) {
      out.push(split[0], split[1]);
    } else {
      out.push(tok);
    }
  }
  return out;
}

function findIndices(palabras, tokens) {
  if (!tokens.length) return [];
  for (let start = 0; start <= palabras.length - tokens.length; start++) {
    let match = true;
    for (let j = 0; j < tokens.length; j++) {
      if (palabras[start + j].toLowerCase() !== tokens[j].toLowerCase()) {
        match = false; break;
      }
    }
    if (match) return tokens.map((_, j) => start + j);
  }
  return [];
}

function extractPronoun(sujeto) {
  const s = sujeto.toLowerCase();
  if (s.includes('yo'))       return 'yo';
  if (s.includes('tú') || s.includes('tu'))     return 'tú';
  if (s.includes('nosotros') || s.includes('nosotras')) return 'nosotros';
  if (s.includes('vosotros') || s.includes('vosotras')) return 'vosotros';
  if (s.includes('ellos') || s.includes('ellas')) return 'ellos';
  return 'él';
}

function detectarTipoVerbo(verbo) {
  const HABER = /^(he|has|ha|hemos|habéis|han|había|habías|habíamos|habíais|habían|hube|hubiste|hubo|habré|habrás|habrá|habremos|habréis|habrán|habría|habrías|habríamos|habríais|habrían|haya|hayas|hayamos|hayáis|hayan|hubiera|hubieras|hubiéramos|hubierais|hubieran|hubiese|hubieses|hubiésemos|hubieseis|hubiesen)$/i;
  const parts = verbo.trim().split(/\s+/);
  if (parts.length >= 2 && HABER.test(parts[0])) return 'TIEMPO_COMPUESTO';
  if (parts.length >= 2) return 'PERIFRASIS';
  return 'SIMPLE';
}

function generarConsejo(func) {
  const consejos = {
    'CD':    '¿Puedes sustituir este bloque por lo/la/los/las? Si es así, es CD.',
    'CI':    '¿Puedes sustituir este bloque por le/les? ¿Es el destinatario de la acción?',
    'CC':    '¿Puede suprimirse o desplazarse este elemento sin que la oración pierda su estructura básica?',
    'Atr.':  '¿Concuerda con el sujeto a través de un verbo copulativo (ser/estar/parecer)?',
    'CPvo':  '¿Concuerda con el sujeto o el CD mientras el verbo tiene significado pleno?',
    'C.Rég.':'¿La preposición está seleccionada por el verbo? ¿Puede eliminarse?',
    'C.Ag.': '¿Introduce al agente en una construcción pasiva? ¿Lleva la preposición "por"?',
  };
  for (const key in consejos) {
    if (func.includes(key)) return consejos[key];
  }
  return 'Analiza la función sintáctica de este bloque en el predicado.';
}

function buildSintagma(bloque, rowIndex, i) {
  if (!bloque.estructura || typeof bloque.estructura !== 'object') return null;
  const elementos = [];
  let elemIdx = 0;
  const isSP = String(bloque.sintagma||'').startsWith('SP');
  let prepDone = false; // track if we already tagged the preposition

  function walk(obj, parentId) {
    for (const key in obj) {
      const val = obj[key];
      const id  = 'e' + rowIndex + '_' + i + '_' + elemIdx++;
      if (typeof val === 'string') {
        // Leaf node: key=texto, val=función
        // In SP sintagmas, the first "N" is the preposition → use N (enlace)
        let solucion = val;
        if (isSP && val === 'N' && !prepDone) {
          solucion = 'N (enlace)';
          prepDone = true;
        }
        elementos.push({ id, texto: key, solucion: normalizeFuncSint(solucion), consejo: generarConsejoSint(solucion) });
      } else if (typeof val === 'object' && val !== null) {
        // Nested: key is the texto of this level (like "la ciudad")
        // val contains the inner structure (e.g. {"SN/T": {...}} or {"T (SN)": {...}})
        const innerKeys = Object.keys(val);
        if (innerKeys.length === 1) {
          const innerKey = innerKeys[0]; // e.g. "SN/T", "T (SN)", "SAdj/CN"
          const funcLabel = innerKey.replace(' (SN)', '').replace(' (SP)', '').replace(' (SAdj)', '').replace(' (SAdv)', '');
          // Recognize ALL valid sintagma-internal functions:
          // T-types: T, SN/T, SAdj/T, SAdv/T, SP/T, T (SN), T (SP)...
          // CN-types: CN, SN/CN, SAdj/CN, SPrep/CN, CN (SP), CN (SN)...
          // Mod-types: Mod, Mod/Det., Mod/Cuant.
          // Others: CAdj, CAdv, Nexo, Aposición, N
          const isRecognized = /^(T|CN|Mod|CAdj|CAdv|Nexo|Apos|N\b)/.test(funcLabel)
            || /\/(T|CN|Mod)/.test(funcLabel);  // catches SN/T, SAdj/CN, SPrep/CN, etc.
          if (isRecognized) {
            elementos.push({ id, texto: key, solucion: normalizeFuncSint(funcLabel), consejo: generarConsejoSint(funcLabel) });
          }
          // Recurse into the inner structure ONLY if it has >1 leaf
          // Skip single-word sub-sintagmas (e.g. "nueva":{"SAdj/CN":{"nueva":"N"}})
          // — they only have a nucleus, nothing to analyze inside
          if (typeof val[innerKey] === 'object') {
            const innerLeaves = Object.keys(val[innerKey]);
            const isSingleWord = innerLeaves.length === 1 && typeof val[innerKey][innerLeaves[0]] === 'string';
            if (!isSingleWord) {
              walk(val[innerKey], id);
            }
          }
        }
      }
    }
  }

  walk(bloque.estructura, null);
  if (elementos.length === 0) return null;

  return {
    id:       's' + rowIndex + '_' + i,
    titulo:   bloque.sintagma + ' ' + bloque.función + ' — "' + bloque.segmento + '"',
    elementos: elementos
  };
}

function normalizeFuncSint(f) {
  const map = {
    // Término types
    'T': 'T', 'T (SN)': 'T', 'T (SP)': 'T', 'T (SAdj)': 'T', 'T (SAdv)': 'T',
    'SN/T': 'SN/T', 'SAdj/T': 'SAdj/T', 'SAdv/T': 'SAdv/T', 'SP/T': 'SP/T',
    // Complemento del nombre types
    'CN': 'SPrep/CN', 'CN (SP)': 'SPrep/CN', 'CN (SN)': 'SN/CN', 'CN (SAdj)': 'SAdj/CN',
    'SN/CN': 'SN/CN', 'SAdj/CN': 'SAdj/CN', 'SPrep/CN': 'SPrep/CN',
    // Modificador types
    'Mod/Det': 'Mod/Det.', 'Mod/Det.': 'Mod/Det.',
    'Mod/Cuant': 'Mod/Cuant.', 'Mod/Cuant.': 'Mod/Cuant.',
    'Mod.': 'Mod.', 'Mod': 'Mod.',
    'Mod/Adj.': 'Mod/Adj.',
    // Núcleo
    'N': 'N', 'N (de la prep.)': 'N (enlace)', 'N (enlace)': 'N (enlace)',
    'N (enlace)': 'N (enlace)',
    // Otros
    'CAdj': 'CAdj', 'CAdv': 'CAdv', 'Nexo': 'Nexo', 'Aposición': 'Aposición',
  };
  return map[f] || f;
}

// Normaliza nombres de funciones sintácticas oracionales
// para que coincidan con FUNC_ORAC del frontend
function normalizeFuncOrac(f) {
  const map = {
    'C.Agente':         'C.Ag.',
    'Complemento Agente':'C.Ag.',
    'C. Agente':        'C.Ag.',
    'Complemento Directo':'CD',
    'Complemento Indirecto':'CI',
    'Complemento de Régimen':'C.Rég.',
    'C. Régimen':       'C.Rég.',
    'Complemento Predicativo':'CPvo',
    'C. Predicativo':   'CPvo',
    'Atributo':         'Atr.',
    'Marca de Pasiva Refleja':'Marca.Pas.Ref.',
    'Marca de Impersonalidad':'Marca.Imp.',
    'Marca.Pasiva.Ref.':'Marca.Pas.Ref.',
    'Marca.Pas.Ref':   'Marca.Pas.Ref.',
    'Marca.Imp':       'Marca.Imp.',
    'C.Rég':           'C.Rég.',
    'C.Reg.':          'C.Rég.',
    'C.Reg':           'C.Rég.',
    'C.Ag':            'C.Ag.',
    'Atr':             'Atr.',
    'Modificador Oracional':'Mod.Or.',
    'Mod. Oracional':  'Mod.Or.',
    'Vocativo':        'Vocat.',
    'CC Procedencia':  'CC Lugar',
    'CC Lugar/Origen': 'CC Lugar',
    'N (V. Pronominal)':'N (V. Pronominal)',
    'N (V. Pasivo)':    'N (V. Pasivo)',
  };
  return map[f] || f;
}

function generarConsejoSint(func) {
  const c = {
    'N':              '¿Cuál es el elemento central del sintagma que puede aparecer solo?',
    'N (enlace)':       'Según la NGLE, la preposición es el Núcleo del SP.',
    'T':              '¿Qué sintagma completa o satura el significado de la preposición?',
    'SN/T':           'El Término es un sintagma nominal que completa a la preposición.',
    'SAdj/T':         'El Término es un sintagma adjetival que completa a la preposición.',
    'SAdv/T':         'El Término es un sintagma adverbial que completa a la preposición.',
    'SP/T':           'El Término es un sintagma preposicional que completa a la preposición.',
    'Mod/Det.':       '¿Actualiza o delimita al sustantivo? (artículos, demostrativos, posesivos)',
    'Mod/Cuant.':     '¿Cuantifica o gradúa al sustantivo? (mucho, poco, varios…)',
    'Mod.':           '¿Modifica al núcleo del sintagma? (adverbios de grado, etc.)',
    'SPrep/CN':       '¿Es un SP que modifica directamente al nombre núcleo del SN?',
    'SAdj/CN':        '¿Es un adjetivo o sintagma adjetival que complementa al nombre núcleo?',
    'SN/CN':          '¿Es un sintagma nominal que complementa al nombre? (aposición u otro SN)',
    'CAdj':           '¿Complementa al adjetivo núcleo del sintagma adjetival?',
    'CAdv':           '¿Complementa al adverbio núcleo del sintagma adverbial?',
    'Nexo':           '¿Enlaza elementos coordinados dentro del sintagma?',
    'Aposición':      '¿Es un SN que se adjunta al núcleo nominal sin preposición?',
  };
  return c[normalizeFuncSint(func)] || 'Analiza la función de este elemento dentro del sintagma.';
}

// ════════════════════════════════════════════════════════════════════════
//  §2 — ENDPOINTS GET  (doGet — Endpoint principal)
// ════════════════════════════════════════════════════════════════════════
function doGet(e) {
  const params  = e.parameter || {};
  const action  = params.action || 'getOraciones';
  const mode    = params.mode   || 'practice';

  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  try {
    let result;
    if      (action === 'ping')         result = { ok: true, t: Date.now() };
    else if (action === 'getOraciones') result = getOraciones_(mode);
    else if (action === 'validatePin')  result = validatePin_(params.pin, params.email);
    else if (action === 'getResults')    result = getResults_();
    else if (action === 'getOracionesFiltradas') result = getOracionesFiltradas_(params);
    else if (action === 'getStats')     result = getStats_();
    else if (action === 'getTextosMorfologia') result = getTextosMorfologia_(params);
    else if (action === 'getMisiones')          result = getMisiones_(params);
    else if (action === 'createMision')          result = createMision_(params);
    else if (action === 'saveMisionResult')     result = saveMisionResult_(params);
    else if (action === 'saveResult')            result = saveResult_(params);
    else if (action === 'saveSesionPractica')    result = saveSesionPractica_(params);
    else if (action === 'createExam')             result = createExam_(params);
    else if (action === 'getExamConfig')           result = getExamConfig_(params);
    else if (action === 'getResultsByGroup')       result = getResultsByGroup_(params);
    else if (action === 'getRankingArcade')        result = getRankingArcade_(params);
    else if (action === 'regenerarMorfologia')     result = regenerarMorfologia_();
    else if (action === 'saveArcadeScore')         result = saveArcadeScore_(params);
    else if (action === 'getInformeProfesor')      result = getInformeProfesor_(params);
    else {
      // v6.3 — Delegación al módulo de oración compuesta (Compuestas.gs).
      // Si la action no la reconoce el dispatcher, devuelve null y caemos al error original.
      const compResult = (typeof dispatchCompuestasGet_ === 'function')
                           ? dispatchCompuestasGet_(action, params) : null;
      result = (compResult !== null) ? compResult
                                     : gasError_('Acción desconocida: ' + action, ERR.UNKNOWN_ACTION);
    }
    out.setContent(JSON.stringify(result));
  } catch (err) {
    logToSheet_('ERROR', action, err.message, ERR.EXCEPTION, err.stack);
    out.setContent(JSON.stringify(gasError_(err.message, ERR.EXCEPTION)));
  }
  return out;
}

// ── getOraciones_ ───────────────────────────────────────────────────────
function getOraciones_(mode) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) return gasError_('Hoja "' + SHEET_BANCO + '" no encontrada.', ERR.NO_SHEET);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { oraciones: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues(); // v4.7: 8 columns
  const oraciones = [];

  for (let i = 0; i < data.length; i++) {
    const row    = data[i];
    const texto  = row[COL_TEXTO  - 1] ? String(row[COL_TEXTO  - 1]).trim() : '';
    const activo = row[COL_ACTIVO - 1] ? String(row[COL_ACTIVO - 1]).trim() : '';
    const rawJson= row[COL_JSON   - 1] ? String(row[COL_JSON   - 1])         : '';

    if (!texto) continue;                          // skip empty rows
    if (mode === 'exam' && activo !== 'Sí') continue; // exam: only active rows

    // Require parseable JSON (using safeParseJSON to recover 7 broken rows)
    const parsed = safeParseJSON(rawJson);
    if (!parsed) continue;

    const obj = buildOracionObject(row, i + 2); // +2 because row 1 is header
    if (obj) oraciones.push(obj);
  }

  return { oraciones: oraciones, total: oraciones.length, mode: mode };
}

// ── getOracionesFiltradas_ — new in v4.7 ──────────────────────────────
function getOracionesFiltradas_(params) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) return gasError_('Hoja no encontrada.', ERR.NO_SHEET);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { oraciones: [] };
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

  // Parse filter params
  const funcDeseadas   = params.funciones   ? params.funciones.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const funcProhibidas = params.prohibidas   ? params.prohibidas.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const minCoincid     = parseInt(params.minCoincidencias) || 1; // default: at least 1
  const subfase        = params.subfase   || '';
  const dificultad     = parseInt(params.dificultad) || 0;

  // Phase 0: collect all active oraciones with their functions
  const candidates = [];
  for (let i = 0; i < data.length; i++) {
    const row    = data[i];
    const activo = String(row[COL_ACTIVO-1]).trim();
    if (activo !== 'Sí') continue;
    const rawJson  = row[COL_JSON -1] ? String(row[COL_JSON-1]) : '';
    const rawTags  = row[COL_TAGS -1] ? String(row[COL_TAGS-1]) : '{}';
    const parsed   = safeParseJSON(rawJson);
    if (!parsed) continue;
    let tags = {};
    try { tags = JSON.parse(rawTags); } catch(e) { tags = {}; }
    // Filter by dificultad
    if (dificultad > 0 && tags.dificultad && tags.dificultad > dificultad) continue;
    // Filter by subfase
    const subfaseOrder = ['solo_np','np_sujeto','completo','profundo'];
    if (subfase) {
      const minReq = row[COL_SUBFASE-1] ? String(row[COL_SUBFASE-1]).trim() : 'solo_np';
      const reqIdx = subfaseOrder.indexOf(minReq);
      const selIdx = subfaseOrder.indexOf(subfase);
      if (selIdx < reqIdx) continue;
    }
    // Defensive normalization (same as buildOracionObject)
    let funcsList = tags.funciones_presentes || [];
    if (funcsList.length > 0 && typeof FUNC_NORMALIZATION !== 'undefined') {
      const seen = {};
      const normalized = [];
      for (let f of funcsList) {
        let canonical = f;
        if (FUNC_NORMALIZATION.hasOwnProperty(f)) {
          canonical = FUNC_NORMALIZATION[f];
          if (canonical === null) continue;
        }
        if (!seen[canonical]) { seen[canonical] = true; normalized.push(canonical); }
      }
      funcsList = normalized;
    }
    candidates.push({ row, idx: i+2, funciones: funcsList });
  }

  // Phase 1: HARD EXCLUSION — remove oraciones with prohibited functions
  let pool = candidates;
  if (funcProhibidas.length > 0) {
    pool = pool.filter(c => !c.funciones.some(f => funcProhibidas.includes(f)));
  }

  // Phase 2: FLEXIBLE INCLUSION with auto-relaxation
  let result = pool;
  if (funcDeseadas.length > 0) {
    // Try from requested minimum down to 1
    for (let m = Math.min(minCoincid, funcDeseadas.length); m >= 1; m--) {
      const filtered = pool.filter(c => {
        const count = funcDeseadas.filter(f => c.funciones.includes(f)).length;
        return count >= m;
      });
      if (filtered.length >= 1) { result = filtered; break; }
    }
    // If still nothing matches even with min=1, use entire pool (after exclusion)
    if (result.length === 0) result = pool;
  }

  // Build oracion objects
  const oraciones = result.map(c => buildOracionObject(c.row, c.idx)).filter(Boolean);
  return { oraciones, total: oraciones.length, filtered: true };
}

// ── validatePin_ ────────────────────────────────────────────────────────
function validatePin_(pin, email) {
  if (!pin) return { valid: false, reason: 'no_pin', message: 'PIN no proporcionado.' };

  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const config = ss.getSheetByName(SHEET_CONFIG);
  if (!config)  return { valid: false, reason: 'no_config', message: 'Hoja Config no encontrada.' };

  const rows = config.getDataRange().getValues();
  let storedPin = '';
  for (const row of rows) {
    if (String(row[0]).trim().toLowerCase() === 'pin') {
      storedPin = String(row[1]).trim();
      break;
    }
  }

  if (!storedPin) return { valid: false, reason: 'no_pin_set', message: 'No hay PIN configurado. Genéralo en el panel del profesor.' };
  if (String(pin).trim() !== storedPin) return { valid: false, reason: 'wrong_pin', message: 'PIN incorrecto.' };

  // Check duplicate: same email + same pin in results sheet
  const results = ss.getSheetByName(SHEET_RESULTS);
  if (results && email) {
    const rData = results.getDataRange().getValues();
    for (let i = 1; i < rData.length; i++) {
      if (String(rData[i][1]).trim().toLowerCase() === email.toLowerCase() &&
          String(rData[i][4]).trim() === storedPin) {
        return { valid: false, reason: 'duplicate', message: 'Ya has realizado este examen con este PIN.' };
      }
    }
  }
  return { valid: true };
}

// ── getResults_ ─────────────────────────────────────────────────────────
function getResults_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return { results: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { results: [] };
  const headers = data[0];
  const results = data.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
  return { results };
}

// ── getTextosMorfologia_ — v6.0 ─────────────────────────────────────────
// Hoja: Morfologia_Textos
// Columnas: A=ID | B=Texto_Completo | C=Nivel (basico/avanzado/arcade) | D=Tokens_JSON | E=Activo (Sí/No)
// Tokens_JSON tiene el mismo formato que MAESTRO_TEXT1/TEXT2:
// [{"id":"t1","texto":"El","cat":"Artículo","atrs":{"tipo":"determinado",...}}, ...]
// ════════════════════════════════════════════════════════════════════════
//  §3 — MORFOLOGÍA · MISIONES · STATS  (Precomputation + Cache)
// ════════════════════════════════════════════════════════════════════════
//  Architecture: Precompute → Store (PropertiesService) → Cache → Read
//  Same pattern as createExam_ / getExamConfig_

const MORPH_HEADER = ['ID','Texto_Completo','Nivel','Tokens_JSON','Activo'];

// Dynamic column lookup — avoids index bugs if columns reorder
function morphColMap_(sheet) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h,i) => { if(h) map[String(h).trim()] = i; });
  return map;
}

// Precompute all texts ONCE → store as JSON in PropertiesService
function precomputeMorfologia_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MORPH_TXT);
  if (!sheet) {
    console.error('[precomputeMorfologia] Hoja Morfologia_Textos no encontrada');
    return { textos: [], error: 'Hoja no encontrada' };
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { textos: [] };
  const col = morphColMap_(sheet);
  // Fallback to positional if headers are missing (old sheets)
  const idCol    = col['ID']            !== undefined ? col['ID']            : 0;
  const textoCol = col['Texto_Completo']!== undefined ? col['Texto_Completo']: 1;
  const nivelCol = col['Nivel']         !== undefined ? col['Nivel']         : 2;
  const tokensCol= col['Tokens_JSON']   !== undefined ? col['Tokens_JSON']   : 3;
  const activoCol= col['Activo']        !== undefined ? col['Activo']        : 4;
  const maxCol = Math.max(idCol,textoCol,nivelCol,tokensCol,activoCol) + 1;
  const data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
  const textos = [];
  let parseErrors = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const activo = String(row[activoCol] || '').trim();
    if (activo === 'No') continue;
    const id    = String(row[idCol] || (i + 1));
    const texto = String(row[textoCol] || '');
    const nvl   = String(row[nivelCol] || 'basico').trim();
    const rawTk = String(row[tokensCol] || '');
    if (!texto) continue;
    let tokens = [];
    if (rawTk) {
      try { tokens = JSON.parse(rawTk); }
      catch(e) { parseErrors++; console.warn('[precomputeMorfologia] JSON corrupto en fila', i+2, 'ID', id); tokens = []; }
    }
    textos.push({ id, texto, nivel: nvl, tokens });
  }
  console.log('[precomputeMorfologia] Procesados', textos.length, 'textos,', parseErrors, 'JSON corruptos');
  // Store in PropertiesService (persistent, survives cache expiry)
  try {
    const json = JSON.stringify(textos);
    if (json.length < 500000) { // PropertiesService limit is 9KB per property, 500KB total
      PropertiesService.getScriptProperties().setProperty('morfologia_all', json);
    } else {
      console.warn('[precomputeMorfologia] JSON demasiado grande para PropertiesService:', json.length);
    }
  } catch(e) { console.error('[precomputeMorfologia] Error guardando properties:', e); }
  // Also seed cache
  try {
    const json = JSON.stringify(textos);
    if (json.length < 90000) {
      CacheService.getScriptCache().put('morfologia_all', json, 300);
    }
  } catch(e) {}
  return { textos, parseErrors };
}

// Manual regeneration (called after prof edits the sheet)
function regenerarMorfologia_() {
  try { CacheService.getScriptCache().remove('morfologia_all'); } catch(e) {}
  try { PropertiesService.getScriptProperties().deleteProperty('morfologia_all'); } catch(e) {}
  const result = precomputeMorfologia_();
  return { ok: true, total: (result.textos||[]).length, parseErrors: result.parseErrors || 0 };
}

// Student-facing: reads cache → properties → fallback precompute
function getTextosMorfologia_(params) {
  const nivel = String(params.nivel || '').trim();

  // 1. Try cache first (fastest: < 50ms)
  const cache = CacheService.getScriptCache();
  const cached = cache.get('morfologia_all');
  if (cached) {
    try {
      const textos = JSON.parse(cached);
      console.log('[getTextosMorfologia] Cache hit,', textos.length, 'textos');
      return { textos: filterByNivel_(textos, nivel) };
    } catch(e) { console.warn('[getTextosMorfologia] Cache corrupto, recargando'); }
  }

  // 2. Try PropertiesService (persistent)
  try {
    const stored = PropertiesService.getScriptProperties().getProperty('morfologia_all');
    if (stored) {
      const textos = JSON.parse(stored);
      console.log('[getTextosMorfologia] PropertiesService hit,', textos.length, 'textos');
      // Re-seed cache
      try { if (stored.length < 90000) cache.put('morfologia_all', stored, 300); } catch(e) {}
      return { textos: filterByNivel_(textos, nivel) };
    }
  } catch(e) { console.warn('[getTextosMorfologia] Properties corrupto, regenerando'); }

  // 3. Fallback: precompute on the fly (with Lock to prevent race condition)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
    // Re-check after lock (another request may have just populated it)
    const reStored = PropertiesService.getScriptProperties().getProperty('morfologia_all');
    if (reStored) {
      const textos = JSON.parse(reStored);
      return { textos: filterByNivel_(textos, nivel) };
    }
    console.log('[getTextosMorfologia] Fallback: precomputando…');
    const result = precomputeMorfologia_();
    return { textos: filterByNivel_(result.textos || [], nivel) };
  } catch(e) {
    console.error('[getTextosMorfologia] Error fatal:', e);
    return { textos: [], error: 'Error cargando textos: ' + e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function filterByNivel_(textos, nivel) {
  if (!nivel) return textos;
  return textos.filter(t => String(t.nivel).trim() === nivel);
}

// ── getMisiones_ — v6.0 ──────────────────────────────────────────────────
// Hoja: Misiones
// A=ID_Mision | B=Nombre | C=Modo | D=Subfase | E=Funciones_JSON | F=Dificultad_Max | G=N_Oraciones | H=Fecha_Limite | I=PIN | J=Estado | K=Creado
function getMisiones_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MISIONES);
  if (!sheet) return { misiones: [] };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { misiones: [] };
  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const modo = params.modo || '';
  const pin  = params.pin  || '';

  const misiones = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const estado = String(row[9] || '').trim();
    if (estado !== 'activa') continue;
    const mModo = String(row[2] || '').trim();
    if (modo && mModo !== modo) continue;
    const mPin = String(row[8] || '').trim();
    if (mPin && pin && mPin !== pin) continue;

    let funciones = [];
    try { funciones = JSON.parse(row[4] || '[]'); } catch(e) { funciones = []; }

    misiones.push({
      id:         String(row[0] || ''),
      nombre:     String(row[1] || ''),
      modo:       mModo,
      subfase:    String(row[3] || 'completo'),
      funciones:  funciones,
      dificultad: parseInt(row[5]) || 0,
      nOraciones: parseInt(row[6]) || 5,
      fechaLimite:String(row[7] || ''),
      pin:        mPin,
      estado:     estado,
    });
  }
  return { misiones };
}

// ── createMision_ — v6.0 ─────────────────────────────────────────────────
// Creates a new mission row in the Misiones sheet
function createMision_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_MISIONES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MISIONES);
    sheet.appendRow(MIS_HEADER);
    sheet.getRange(1,1,1,MIS_HEADER.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  ensureSheetHeaders_(sheet, MIS_HEADER);
  appendRowSafe_(sheet, MIS_HEADER, {
    'ID_Mision':       params.id || '',
    'Nombre':          params.nombre || '',
    'Modo':            params.modo || '',
    'Subfase':         params.subfase || 'completo',
    'Funciones_JSON':  params.funciones || '[]',
    'Dificultad_Max':  parseInt(params.dificultad) || 0,
    'N_Oraciones':     parseInt(params.nOraciones) || 5,
    'Fecha_Limite':    '',
    'PIN':             params.pin || '',
    'Estado':          params.estado || 'activa',
    'Creado':          new Date().toISOString().slice(0,10)
  });
  return { ok: true };
}

// ── saveMisionResult_ — v6.0 ────────────────────────────────────────────
function saveMisionResult_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_MIS_RES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MIS_RES);
    sheet.appendRow(MIS_RES_HEADER);
    sheet.getRange(1,1,1,MIS_RES_HEADER.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  ensureSheetHeaders_(sheet, MIS_RES_HEADER);
  appendRowSafe_(sheet, MIS_RES_HEADER, {
    'Fecha':         new Date().toISOString(),
    'Email':         params.email || '',
    'Nombre':        params.name  || '',
    'ID_Mision':     params.misionId || '',
    'Modo':          params.modo  || '',
    'Aciertos':      parseInt(params.aciertos) || 0,
    'Errores':       parseInt(params.errores)  || 0,
    'Nota':          parseFloat(params.nota)   || 0,
    'Detalle_JSON':  params.detalle || '{}'
  });
  return { ok: true };
}

// ── getStats_ ───────────────────────────────────────────────────────────
function getStats_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return { stats: null };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { stats: { total: 0, average: 0 } };
  // Nota is column H (index 7)
  const scores = data.slice(1).map(r => parseFloat(r[7])).filter(n => !isNaN(n));
  const avg    = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : 0;
  return { stats: { total: scores.length, average: Math.round(avg * 10) / 10, scores } };
}

// ── getResultsByGroup_ — returns results filtered by grupo and/or evaluacion ──
function getResultsByGroup_(params) {
  const grupo = params.grupo || '';
  const evaluacion = params.evaluacion || '';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return { resultados: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { resultados: [] };
  // Read column positions by header name — robust to column reordering
  const col = getColMap_(sheet);
  const resultados = [];
  // Helper to fetch by header name with fallback (older sheets used different names)
  const get = (row, ...names) => {
    for (const n of names) {
      if (col[n] !== undefined) return row[col[n]];
    }
    return '';
  };
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const rowGrupo      = String(get(r, 'Grupo', 'Modo_Juego') || '').trim();
    const rowEvaluacion = String(get(r, 'Evaluacion', 'PIN_Examen') || '').trim();
    if (grupo && rowGrupo !== grupo) continue;
    if (evaluacion && rowEvaluacion !== evaluacion) continue;
    resultados.push({
      fecha:           get(r, 'Fecha'),
      correo:          String(get(r, 'Correo') || ''),
      alumno:          String(get(r, 'Nombre') || ''),
      grupo:           rowGrupo,
      evaluacion:      rowEvaluacion,
      examen:          String(get(r, 'Examen', 'Tipo_Analisis') || ''),
      pin:             String(get(r, 'PIN', 'Nota_Ponderada') || ''),
      nota:            parseFloat(get(r, 'Nota', 'Pts_Obtenidos')) || 0,
      completadas:     parseInt(get(r, 'Completadas', 'Pts_Disponibles')) || 0,
      totalOraciones:  parseInt(get(r, 'Total_Oraciones', 'Total_Errores')) || 0,
      sujeto:          parseFloat(get(r, 'Sujeto_Pts')) || 0,
      funciones:       parseFloat(get(r, 'Funciones_Pts')) || 0,
      np:              parseFloat(get(r, 'NP_Pts')) || 0,
      elemFallados:    parseInt(get(r, 'Elem_Fallados', 'Sintagmas_Pts')) || 0
    });
  }
  resultados.sort((a, b) => b.nota - a.nota);
  return { resultados };
}

// ════════════════════════════════════════════════════════════════════════
//  §4 — SISTEMA DE EXÁMENES (PIN) — Pre-computed oraciones + dynamic column lookup
//  Changes:
//    • createExam_ pre-computes oraciones → Oraciones_JSON column
//    • getExamConfig_ reads pre-computed JSON (< 1 second)
//    • Dynamic column lookup via header names (no index mismatch bugs)
//    • CacheService for repeated reads by same PIN
// ════════════════════════════════════════════════════════════════════════

const EXAM_HEADER = ['PIN','Funciones_JSON','Prohibidas_JSON','MinCoincid','Dificultad',
  'N_Oraciones','Timer_Min','Subfase','Grupo','Evaluacion','Nombre_Examen',
  'Estado','Fecha','Oraciones_JSON'];

const MIS_HEADER = ['ID_Mision','Nombre','Modo','Subfase','Funciones_JSON',
  'Dificultad_Max','N_Oraciones','Fecha_Limite','PIN','Estado','Creado'];

const MIS_RES_HEADER = ['Fecha','Email','Nombre','ID_Mision','Modo',
  'Aciertos','Errores','Nota','Detalle_JSON'];

// ════════════════════════════════════════════════════════════════════════
//  GENERIC COLUMN UTILITIES (Fase 1 — Tareas 1 y 2)
// ════════════════════════════════════════════════════════════════════════
//  Every sheet write MUST go through these to prevent column drift.

// Build column-name → index map from any sheet's header row
function getColMap_(sheet) {
  if (!sheet || sheet.getLastColumn() === 0) return {};
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h,i) => { if(h) map[String(h).trim()] = i; });
  return map;
}

// Build a row array using the SHEET's actual header order (not headerArr's order).
// headerArr is just used to know which fields might be set; placement is by sheet header.
function buildRow_(sheet, headerArr, dataObj) {
  const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
  const row = new Array(sheetHeaders.length).fill('');
  // For every key in dataObj, find its actual column index in the sheet
  Object.keys(dataObj).forEach(key => {
    const idx = sheetHeaders.indexOf(key);
    if (idx >= 0) row[idx] = dataObj[key];
  });
  return row;
}

// Append a row safely using header order
function appendRowSafe_(sheet, headerArr, dataObj) {
  const row = buildRow_(sheet, headerArr, dataObj);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

// Write/update a specific row safely by reading its full header, updating only the specified fields
function writeRowSafe_(sheet, rowNum, dataObj) {
  const col = getColMap_(sheet);
  Object.keys(dataObj).forEach(key => {
    if (col[key] !== undefined) {
      sheet.getRange(rowNum, col[key] + 1).setValue(dataObj[key]);
    }
  });
}

// Ensure a sheet has all columns in headerArr (patches old sheets without breaking data)
function ensureSheetHeaders_(sheet, headerArr) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headerArr);
    sheet.getRange(1,1,1,headerArr.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }
  const existing = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h=>String(h).trim());
  headerArr.forEach(col => {
    if (!existing.includes(col)) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(col).setFontWeight('bold');
    }
  });
}


// Ensure sheet exists with correct header; add missing columns to old sheets
function ensureExamSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_EXAMS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EXAMS);
    sheet.appendRow(EXAM_HEADER);
    sheet.getRange(1,1,1,EXAM_HEADER.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Patch old sheets: add missing columns
  const existing = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h=>String(h).trim());
  EXAM_HEADER.forEach(col => {
    if (!existing.includes(col)) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(col).setFontWeight('bold');
    }
  });
  return sheet;
}

// ── createExam_: Professor creates exam → PRE-COMPUTES oraciones ──
function createExam_(params) {
  const sheet = ensureExamSheet_();
  const col = getColMap_(sheet);
  const pin = String(params.pin || '').trim();
  if (!pin || pin.length < 4) return gasError_('PIN inválido (mínimo 4 dígitos)', ERR.BAD_PIN);

  // Deactivate previous exams with same PIN
  const data = sheet.getDataRange().getValues();
  const estadoIdx = col['Estado'];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['PIN']]).trim() === pin && String(data[i][estadoIdx]).trim() === 'activo') {
      sheet.getRange(i + 1, estadoIdx + 1).setValue('cerrado');
    }
  }

  // Write row with Estado = 'creando' (prevents students reading incomplete data)
  // Parse filter parameters
  let funciones = [];
  try { funciones = JSON.parse(params.funciones || '[]'); } catch(e) {}
  let prohibidas = [];
  try { prohibidas = JSON.parse(params.prohibidas || '[]'); } catch(e) {}
  const minCoincid = parseInt(params.minCoincidencias) || 1;
  const dificultad = parseInt(params.dificultad) || 0;
  const nOraciones = parseInt(params.nOraciones) || 0;
  const timerMin   = parseInt(params.timerMin) || 0;
  const subfase    = params.subfase || 'completo';

  // Build row using appendRowSafe_ — independent of column order in Sheet.
  // The Sheet may have legacy column order; we MUST write by name, not position.
  ensureSheetHeaders_(sheet, EXAM_HEADER); // ensure all needed columns exist
  appendRowSafe_(sheet, EXAM_HEADER, {
    'PIN':              pin,
    'Funciones_JSON':   JSON.stringify(funciones),
    'Prohibidas_JSON':  JSON.stringify(prohibidas),
    'MinCoincid':       minCoincid,
    'Dificultad':       dificultad,
    'N_Oraciones':      nOraciones,
    'Timer_Min':        timerMin,
    'Subfase':          subfase,
    'Grupo':            params.grupo || '',
    'Evaluacion':       params.evaluacion || '',
    'Nombre_Examen':    params.nombreExamen || '',
    'Estado':           'creando',
    'Fecha':            new Date().toISOString()
  });
  const newRowIdx = sheet.getLastRow();
  // Re-read column map AFTER ensureSheetHeaders_ in case it added columns
  const col2 = getColMap_(sheet);
  const estCol  = col2['Estado'] + 1;          // 1-based column
  const oracCol = col2['Oraciones_JSON'] + 1;

  // PRE-COMPUTE: filter + shuffle + limit oraciones NOW (professor's time, not student's)
  console.log('[createExam] PIN:', pin, 'funciones:', funciones, 'prohibidas:', prohibidas, 'nOraciones:', nOraciones);
  let oraciones;
  const filterParams = {};
  if (funciones.length > 0)   filterParams.funciones = funciones.join(',');
  if (prohibidas.length > 0)  filterParams.prohibidas = prohibidas.join(',');
  if (minCoincid > 1)         filterParams.minCoincidencias = String(minCoincid);
  if (dificultad > 0)         filterParams.dificultad = String(dificultad);
  if (subfase)                filterParams.subfase = subfase;

  try {
    if (funciones.length > 0 || prohibidas.length > 0 || dificultad > 0) {
      const r = getOracionesFiltradas_(filterParams);
      oraciones = (r && r.oraciones) ? r.oraciones : [];
    } else {
      const r = getOraciones_('exam');
      oraciones = (r && r.oraciones) ? r.oraciones : [];
    }
  } catch(e) {
    console.error('[createExam] Error reading oraciones:', e);
    // Mark this row as cerrado so we don't leave a half-built exam
    sheet.getRange(newRowIdx, estCol).setValue('cerrado');
    return gasError_('Error al leer las oraciones del banco: ' + e.message, ERR.EXCEPTION);
  }

  if (!oraciones || oraciones.length === 0) {
    sheet.getRange(newRowIdx, estCol).setValue('cerrado');
    return gasError_('No hay oraciones que cumplan los filtros seleccionados. Revisa los filtros y vuelve a crear el examen.', ERR.BAD_PARAM);
  }

  // Shuffle
  for (let j = oraciones.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [oraciones[j], oraciones[k]] = [oraciones[k], oraciones[j]];
  }
  // Limit
  if (nOraciones > 0 && oraciones.length > nOraciones) {
    oraciones = oraciones.slice(0, nOraciones);
  }

  // Write pre-computed oraciones and flip Estado to 'activo'
  // (oracCol and estCol were computed from col2 — header-mapped, not EXAM_HEADER position)
  console.log('[createExam] Pre-computed', oraciones.length, 'oraciones for PIN', pin);
  try {
    sheet.getRange(newRowIdx, oracCol).setValue(JSON.stringify(oraciones));
    sheet.getRange(newRowIdx, estCol).setValue('activo');
  } catch(e) {
    console.error('[createExam] Error writing exam row:', e);
    return gasError_('Error al guardar el examen: ' + e.message, ERR.EXCEPTION);
  }

  // Clear any cached version for this PIN
  try { CacheService.getScriptCache().remove('exam_' + pin); } catch(e) {}

  return { ok: true, pin, nOracionesReales: oraciones.length };
}

// ── getExamConfig_: Student enters PIN → reads PRE-COMPUTED JSON (< 1s) ──
function getExamConfig_(params) {
  const pin = String(params.pin || '').trim();
  if (!pin || pin.length < 4) return gasError_('PIN inválido', ERR.BAD_PIN);

  // Check cache first (serves repeated reads instantly)
  const cache = CacheService.getScriptCache();
  const cacheKey = 'exam_' + pin;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('[getExamConfig] Cache hit for PIN', pin);
    try { return JSON.parse(cached); } catch(e) { console.error('[getExamConfig] Cache JSON corrupto, recargando'); }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EXAMS);
  if (!sheet) return gasError_('Aún no se ha creado ningún examen en este sistema. Pídele al profesor que cree uno desde el panel.', ERR.NO_SHEET);
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();

  // Track WHY each row was rejected, so we can give a useful message at the end
  let foundButCreating = false;
  let foundButClosed = false;
  let foundActiveButEmpty = false;
  let pinExists = false;

  // Search from bottom (most recent first)
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][col['PIN']]).trim() !== pin) continue;
    pinExists = true;
    const estado = String(data[i][col['Estado']]).trim();
    if (estado === 'creando') { foundButCreating = true; continue; }
    if (estado === 'cerrado') { foundButClosed = true; continue; }
    if (estado !== 'activo')  { continue; }

    // Try to read pre-computed oraciones
    let oraciones = null;
    const oracJsonCol = col['Oraciones_JSON'];
    if (oracJsonCol !== undefined && data[i][oracJsonCol]) {
      try { oraciones = JSON.parse(data[i][oracJsonCol]); } catch(e) { console.error('[getExamConfig] Oraciones_JSON corrupto row', i); oraciones = null; }
    }

    // Fallback: compute on-the-fly with Lock (prevents race condition)
    if (!oraciones || oraciones.length === 0) {
      console.log('[getExamConfig] Fallback: regenerando oraciones para PIN', pin);
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(8000);
        // Re-read cell in case another request just wrote it
        if (oracJsonCol !== undefined) {
          const fresh = sheet.getRange(i+1, oracJsonCol+1).getValue();
          if (fresh) { try { oraciones = JSON.parse(fresh); } catch(e) {} }
        }
        if (!oraciones || oraciones.length === 0) {
          // Actually regenerate
          let funciones = [];
          try { funciones = JSON.parse(data[i][col['Funciones_JSON']] || '[]'); } catch(e) {}
          let prohibidas = [];
          try { prohibidas = JSON.parse(data[i][col['Prohibidas_JSON']] || '[]'); } catch(e) {}
          const mc = parseInt(data[i][col['MinCoincid']]) || 1;
          const dif = parseInt(data[i][col['Dificultad']]) || 0;
          const nOr = parseInt(data[i][col['N_Oraciones']]) || 0;
          const sf = String(data[i][col['Subfase']] || 'completo');
          const fp = {};
          if (funciones.length > 0) fp.funciones = funciones.join(',');
          if (prohibidas.length > 0) fp.prohibidas = prohibidas.join(',');
          if (mc > 1) fp.minCoincidencias = String(mc);
          if (dif > 0) fp.dificultad = String(dif);
          if (sf) fp.subfase = sf;
          oraciones = (funciones.length>0||prohibidas.length>0||dif>0)
            ? (getOracionesFiltradas_(fp).oraciones || [])
            : (getOraciones_('exam').oraciones || []);
          for (let j = oraciones.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [oraciones[j], oraciones[k]] = [oraciones[k], oraciones[j]];
          }
          if (nOr > 0 && oraciones.length > nOr) oraciones = oraciones.slice(0, nOr);
          // Back-fill for next time
          if (oracJsonCol !== undefined) {
            try { sheet.getRange(i + 1, oracJsonCol + 1).setValue(JSON.stringify(oraciones)); } catch(e) {}
          }
          console.log('[getExamConfig] Regenerated', oraciones.length, 'oraciones for PIN', pin);
        }
      } catch(e) { console.error('[getExamConfig] Lock/regen error:', e); }
      finally { try { lock.releaseLock(); } catch(e) {} }
    }

    if (!oraciones || oraciones.length === 0) {
      foundActiveButEmpty = true;
      continue; // try previous row with same PIN
    }

    const result = {
      ok: true, oraciones,
      timer: parseInt(data[i][col['Timer_Min']]) || 0,
      subfase: String(data[i][col['Subfase']] || 'completo'),
      pin, 
      grupo: String(data[i][col['Grupo']] || ''),
      evaluacion: String(data[i][col['Evaluacion']] || ''),
      nombreExamen: String(data[i][col['Nombre_Examen']] || '')
    };

    // Cache for 5 minutes
    try {
      const json = JSON.stringify(result);
      console.log('[getExamConfig] PIN', pin, '→', oraciones.length, 'oraciones, JSON', Math.round(json.length/1024)+'KB');
      if (json.length < 90000) cache.put(cacheKey, json, 300);
    } catch(e) {}

    return result;
  }
  // No active exam matched. Give the student a useful hint about what's wrong.
  if (foundActiveButEmpty) {
    return gasError_('El examen existe pero no tiene oraciones cargadas. Avisa al profesor para que lo regenere desde el panel.', ERR.EXAM_EMPTY);
  }
  if (foundButCreating) {
    return gasError_('Examen en preparación. Espera 5-10 segundos e inténtalo otra vez.', ERR.EXAM_PREPARING);
  }
  if (foundButClosed && !pinExists) {
    return gasError_('Este examen ha sido cerrado por el profesor.', ERR.EXAM_CLOSED);
  }
  if (pinExists) {
    return gasError_('Este PIN existe pero el examen no está activo. Pídele al profesor que lo cree de nuevo.', ERR.EXAM_INACTIVE);
  }
  return gasError_('PIN no encontrado. Comprueba que has escrito los 4 dígitos correctos.', ERR.PIN_NOT_FOUND);
}

// ════════════════════════════════════════════════════════════════════════
//  §5 — ENDPOINTS POST  (doPost — Guardar resultados)
// ════════════════════════════════════════════════════════════════════════
function doPost(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  let action = 'unknown'; // visible en el catch si JSON.parse falla
  try {
    const payload = JSON.parse(e.postData.contents);
    action  = payload.action || 'saveResult';
    let result;
    if      (action === 'saveResult')     result = saveResult_(payload);
    else if (action === 'saveArcadeScore')result = saveArcadeScore_(payload);
    else if (action === 'saveMorphResult')result = saveMorphResult_(payload);
    else {
      // v6.3 — Delegación al módulo de oración compuesta (Compuestas.gs).
      const compResult = (typeof dispatchCompuestasPost_ === 'function')
                           ? dispatchCompuestasPost_(action, payload) : null;
      result = (compResult !== null) ? compResult
                                     : gasError_('Acción desconocida: ' + action, ERR.UNKNOWN_ACTION);
    }
    out.setContent(JSON.stringify(result));
  } catch(err) {
    logToSheet_('ERROR', action, err.message, ERR.EXCEPTION, err.stack);
    out.setContent(JSON.stringify(gasError_(err.message, ERR.EXCEPTION)));
  }
  return out;
}

function saveResult_(p) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) {
    return gasError_('Servidor ocupado, inténtalo de nuevo.', ERR.LOCK_TIMEOUT);
  }
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const RESULT_HEADER = ['Fecha','Correo','Nombre','Grupo','Evaluacion','Examen','PIN',
                           'Nota','Completadas','Total_Oraciones',
                           'Sujeto_Pts','Funciones_Pts','NP_Pts','Elem_Fallados'];
    let sheet = ss.getSheetByName(SHEET_RESULTS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_RESULTS);
    }
    ensureSheetHeaders_(sheet, RESULT_HEADER);
    const col = getColMap_(sheet);

    // DEDUP via colMap (not fixed indices)
    const email = String(p.email||'').trim().toLowerCase();
    const pin   = String(p.pin||'').trim();
    if(email && pin){
      const data = sheet.getDataRange().getValues();
      const emailIdx = col['Correo'], pinIdx = col['PIN'];
      for(let i=1; i<data.length; i++){
        if(String(data[i][emailIdx]).trim().toLowerCase()===email && String(data[i][pinIdx]).trim()===pin){
          return { ok: true, duplicate: true };
        }
      }
    }
    const pb = p.phaseBreakdown || {};
    const sujetoPts   = parseFloat(p.sujeto)    || (pb.sujeto||{}).earned    || 0;
    const funcionesPts= parseFloat(p.funciones)  || (pb.funciones||{}).earned || 0;
    const npPts       = parseFloat(p.np)         || (pb.np||{}).earned       || 0;

    appendRowSafe_(sheet, RESULT_HEADER, {
      'Fecha': new Date(),
      'Correo': email,
      'Nombre': p.name||'',
      'Grupo': p.grupo||'',
      'Evaluacion': p.evaluacion||'',
      'Examen': p.examen||'',
      'PIN': pin,
      'Nota': parseFloat(p.score)||0,
      'Completadas': parseInt(p.completadas)||0,
      'Total_Oraciones': parseInt(p.totalOraciones)||0,
      'Sujeto_Pts': sujetoPts,
      'Funciones_Pts': funcionesPts,
      'NP_Pts': npPts,
      'Elem_Fallados': parseInt(p.elementosFallados)||0
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// ════════════════════════════════════════════════════════════════════════
//  SESIONES DE PRÁCTICA LIBRE — Analytics
// ════════════════════════════════════════════════════════════════════════
function saveSesionPractica_(p) {
  const HEADER = [
    'Fecha', 'Correo', 'Nombre', 'Grupo', 'Modulo', 'Subfase',
    'Oraciones_Hechas', 'Total_Oraciones', 'Nota_Estimada', 'Errores_Totales',
    'Tiempo_Min', 'Func_Mas_Fallada', 'Func_Sin_Errores',
    'Err_CD', 'Err_CI', 'Err_Atr', 'Err_CPvo', 'Err_CReg', 'Err_CC'
  ];
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_SESIONES);
    if (!sheet) sheet = ss.insertSheet(SHEET_SESIONES);
    ensureSheetHeaders_(sheet, HEADER);
    appendRowSafe_(sheet, HEADER, {
      'Fecha':            new Date(),
      'Correo':           String(p.email||'').trim().toLowerCase(),
      'Nombre':           String(p.name||'').trim(),
      'Grupo':            String(p.grupo||'').trim(),
      'Modulo':           String(p.modulo||'sintaxis'),
      'Subfase':          String(p.subfase||''),
      'Oraciones_Hechas': parseInt(p.oracionesHechas)||0,
      'Total_Oraciones':  parseInt(p.totalOraciones)||0,
      'Nota_Estimada':    parseFloat(p.nota)||0,
      'Errores_Totales':  parseInt(p.errores)||0,
      'Tiempo_Min':       parseInt(p.tiempoMin)||0,
      'Func_Mas_Fallada': String(p.funcPeor||''),
      'Func_Sin_Errores': String(p.funcMejor||''),
      'Err_CD':           parseInt(p.errCD)||0,
      'Err_CI':           parseInt(p.errCI)||0,
      'Err_Atr':          parseInt(p.errAtr)||0,
      'Err_CPvo':         parseInt(p.errCPvo)||0,
      'Err_CReg':         parseInt(p.errCReg)||0,
      'Err_CC':           parseInt(p.errCC)||0,
    });
    return { ok: true };
  } catch(e) {
    return gasError_(e.message, ERR.EXCEPTION);
  }
}

function saveArcadeScore_(p) {
  const paramErr = requireParams_(p, ['nickname', 'arcadeMode']);
  if (paramErr) return paramErr;
  const ARCADE_HEADER = ['Fecha','Apodo','Grupo','Nombre','Correo','Modo','Puntuacion','Racha_Max','Preguntas'];
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_ARCADE);
  if (!sheet) sheet = ss.insertSheet(SHEET_ARCADE);
  ensureSheetHeaders_(sheet, ARCADE_HEADER);
  const col = getColMap_(sheet);
  const nick = String(p.nickname).trim();
  const grupo = String(p.grupo||'').trim();
  const mode = String(p.arcadeMode).trim();
  const score = parseInt(p.score)||0;
  const streak = parseInt(p.streak)||0;
  const preguntas = parseInt(p.questions)||0;
  // Keep only best score per (nick + mode) using colMap
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['Apodo']]).trim() === nick && String(data[i][col['Modo']]).trim() === mode) {
      const currentScore = parseInt(data[i][col['Puntuacion']])||0;
      if (score > currentScore) {
        writeRowSafe_(sheet, i+1, {
          'Fecha': new Date(),
          'Grupo': grupo || data[i][col['Grupo']] || '',
          'Puntuacion': score,
          'Racha_Max': streak,
          'Preguntas': preguntas
        });
        return { ok: true, improved: true };
      } else if (grupo && !data[i][col['Grupo']]) {
        writeRowSafe_(sheet, i+1, { 'Grupo': grupo });
      }
      return { ok: true, improved: false };
    }
  }
  appendRowSafe_(sheet, ARCADE_HEADER, {
    'Fecha': new Date(), 'Apodo': nick, 'Grupo': grupo,
    'Nombre': p.name||'', 'Correo': p.email||'', 'Modo': mode,
    'Puntuacion': score, 'Racha_Max': streak, 'Preguntas': preguntas
  });
  return { ok: true, improved: true, firstEntry: true };
}

function getRankingArcade_(params) {
  const mode = String(params.arcadeMode||'').trim();
  const myGrupo = String(params.grupo||'').trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ARCADE);
  if (!sheet) return { global: [], grupos: {}, myGrupoTop: [] };
  const data = sheet.getDataRange().getValues();
  // Leer columnas POR NOMBRE (no por posición fija) para que el ranking no se
  // rompa si la cabecera se descoloca o se le añaden columnas. Mismo blindaje
  // que el resto del backend (getColMap_).
  const col = getColMap_(sheet);
  const cApodo = col['Apodo'], cGrupo = col['Grupo'], cModo = col['Modo'],
        cPunt = col['Puntuacion'], cRacha = col['Racha_Max'], cPreg = col['Preguntas'];
  // Si falta alguna columna esencial, devolvemos vacío en vez de datos basura.
  if (cApodo === undefined || cPunt === undefined) return { global: [], grupos: {}, myGrupoTop: [] };
  const global = [];
  const grupoTotals = {}; // grupo -> {sum, count, top, qSum}
  const myGrupoTop = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const rowMode = cModo !== undefined ? String(r[cModo]||'').trim() : '';
    if (mode && rowMode && rowMode !== mode) continue;
    const entry = {
      nick: String(r[cApodo]||''),
      grupo: cGrupo !== undefined ? String(r[cGrupo]||'') : '',
      score: parseInt(r[cPunt])||0,
      streak: cRacha !== undefined ? (parseInt(r[cRacha])||0) : 0,
      preguntas: cPreg !== undefined ? (parseInt(r[cPreg])||0) : 0
    };
    global.push(entry);
    if (entry.grupo) {
      if (!grupoTotals[entry.grupo]) grupoTotals[entry.grupo] = {sum:0, count:0, top:0, qSum:0, qCount:0};
      grupoTotals[entry.grupo].sum += entry.score;
      grupoTotals[entry.grupo].count += 1;
      if (entry.score > grupoTotals[entry.grupo].top) grupoTotals[entry.grupo].top = entry.score;
      if (entry.preguntas > 0) { grupoTotals[entry.grupo].qSum += entry.preguntas; grupoTotals[entry.grupo].qCount += 1; }
      if (myGrupo && entry.grupo === myGrupo) myGrupoTop.push(entry);
    }
  }
  global.sort((a,b) => b.score - a.score);
  myGrupoTop.sort((a,b) => b.score - a.score);
  // Build class ranking (by average score, min 2 participants)
  const grupoRanking = Object.entries(grupoTotals)
    .filter(([_, v]) => v.count >= 1)
    .map(([grupo, v]) => ({
      grupo,
      media: Math.round(v.sum / v.count),
      top: v.top,
      count: v.count,
      avgPreguntas: v.qCount > 0 ? Math.round(v.qSum / v.qCount) : 0
    }))
    .sort((a,b) => b.media - a.media);
  // Fantasma de clase: ritmo medio del grupo del alumno (para el Duelo Fantasma
  // tipo 2). avgScorePerQ permite dibujar la línea esperada igual que el récord
  // propio. Solo se devuelve si hay al menos 1 partida del grupo con preguntas.
  let myGrupoGhost = null;
  if (myGrupo && grupoTotals[myGrupo]) {
    const g = grupoTotals[myGrupo];
    const media = Math.round(g.sum / g.count);
    const avgQ = g.qCount > 0 ? Math.round(g.qSum / g.qCount) : 0;
    if (avgQ > 0) {
      myGrupoGhost = {
        media: media,
        totalQuestions: avgQ,
        avgScorePerQ: media / avgQ,
        count: g.count
      };
    }
  }
  return {
    global: global.slice(0, 10),
    myGrupoTop: myGrupoTop.slice(0, 10),
    grupoRanking: grupoRanking.slice(0, 10),
    myGrupoGhost: myGrupoGhost
  };
}

function saveMorphResult_(p) {
  const paramErr = requireParams_(p, ['total', 'correct']);
  if (paramErr) return paramErr;
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_MORPH);
  const MORPH_HEADER = ['Fecha','Correo','Nombre','Nivel','Modalidad',
                        'Correctas','Total','Errores','Puntuacion_Pct'];
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MORPH);
    sheet.appendRow(MORPH_HEADER);
    sheet.getRange(1,1,1,MORPH_HEADER.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  ensureSheetHeaders_(sheet, MORPH_HEADER);
  const pct = p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0;
  appendRowSafe_(sheet, MORPH_HEADER, {
    'Fecha':          new Date(),
    'Correo':         p.email || '',
    'Nombre':         p.name  || '',
    'Nivel':          p.level || 1,
    'Modalidad':      p.morphMode || '',
    'Correctas':      p.correct || 0,
    'Total':          p.total   || 0,
    'Errores':        p.errors  || 0,
    'Puntuacion_Pct': pct
  });
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════════════
//  §6 — MENÚ DEL PROFESOR
// ════════════════════════════════════════════════════════════════════════
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('🎓 Taller de Sintaxis');

  // BLOQUE 1 — OPERACIONES DEL PROFESOR (lo que usa todos los días)
  menu.addItem('📊 Actualizar Panel del Profesor',  'menuDashboard');
  menu.addSeparator();
  menu.addItem('📝 Crear examen desde esta hoja',   'menuCrearExamenDesdeHoja');
  menu.addItem('🎯 Activar oraciones seleccionadas','menuActivarSeleccionadas');
  menu.addItem('🚫 Desactivar oraciones seleccionadas','menuDesactivarSeleccionadas');
  menu.addItem('📊 Ver resumen de mi banco',        'menuResumenBanco');
  menu.addSeparator();

  // BLOQUE 2 — MANTENIMIENTO (colapsado en submenú)
  const mantenimiento = ui.createMenu('🔧 Mantenimiento');
  mantenimiento.addItem('🔄 Actualizar datos de alumnos',         'menuRegenerarMorfologia');
  mantenimiento.addItem('🎨 Configurar desplegables (Activo/Nivel)','menuConfigurarValidaciones');
  mantenimiento.addItem('✨ Aplicar estilos visuales a las hojas', 'menuConfigurarTodosLosEstilos');
  mantenimiento.addSeparator();
  mantenimiento.addItem('🧪 Autotest del backend',                'menuAutotest');
  mantenimiento.addSeparator();
  mantenimiento.addItem('🔍 Auditar oraciones (solo lectura)',    'menuAuditarOracionesBanco');
  mantenimiento.addItem('✏️ Reparar oraciones automáticamente',   'menuRepararOracionesBanco');
  mantenimiento.addItem('🧹 Limpiar colores de auditoría',        'menuLimpiarColoresAuditoria');
  mantenimiento.addSeparator();
  mantenimiento.addItem('✅ Validar coherencia del banco',         'menuValidarCoherencia');
  mantenimiento.addItem('🗑️ Limpiar hojas no utilizadas',          'menuLimpiarHojasObsoletas');
  mantenimiento.addItem('🗑️ Limpiar backups antiguos (>30 días)',  'menuLimpiarBackupsAntiguos');
  mantenimiento.addItem('🪵 Purgar Logs_GAS (>30 días)',           'menuPurgarLogsGAS');
  menu.addSubMenu(mantenimiento);

  // BLOQUE 3 — HERRAMIENTAS (solo si es necesario)
  const tecnico = ui.createMenu('⚙️ Avanzado');
  tecnico.addItem('🔑 Generar PIN global',   'generarPin');
  tecnico.addItem('👁 Ver PIN actual',       'verPin');
  tecnico.addItem('🏷 Rellenar etiquetas con IA','generarEtiquetas');
  tecnico.addItem('📊 Resumen de etiquetas', 'resumenEtiquetas');
  tecnico.addSeparator();
  tecnico.addItem('☑ Activar TODAS',         'activarTodas');
  tecnico.addItem('☐ Desactivar TODAS',      'desactivarTodas');
  tecnico.addItem('🗑 Limpiar resultados',   'limpiarResultados');
  menu.addSubMenu(tecnico);

  // BLOQUE 4 — MÓDULO ORACIÓN COMPUESTA (v6.3+, requiere Compuestas.gs)
  if (typeof buildCompuestasSubMenu_ === 'function') {
    menu.addSubMenu(buildCompuestasSubMenu_(ui));
  }

  menu.addToUi();
}

// ═══════════════════════════════════════════════════════════════════════
//  NUEVAS OPERACIONES DEL PROFESOR (BLOQUE 1)
// ═══════════════════════════════════════════════════════════════════════

// Crear examen directamente desde las filas seleccionadas en Oraciones_Banco
function menuCrearExamenDesdeHoja() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (sheet.getName() !== SHEET_BANCO) {
    ui.alert('ℹ️ Instrucciones',
      'Para crear un examen desde el Sheet:\n\n' +
      '1. Ve a la pestaña "Oraciones_Banco"\n' +
      '2. Selecciona las filas de las oraciones que quieres incluir (puedes pulsar Ctrl y hacer clic para selección múltiple)\n' +
      '3. Vuelve a ejecutar esta opción\n\n' +
      'También puedes crear exámenes desde el panel del profesor en la app, con filtros por función.',
      ui.ButtonSet.OK);
    return;
  }
  const ranges = sheet.getActiveRangeList() ? sheet.getActiveRangeList().getRanges() : [sheet.getActiveRange()];
  const rowNumbers = new Set();
  ranges.forEach(r => {
    const start = r.getRow();
    const end = start + r.getNumRows() - 1;
    for (let i = start; i <= end; i++) if (i > 1) rowNumbers.add(i);
  });
  if (rowNumbers.size === 0) {
    ui.alert('Sin selección', 'Selecciona primero las filas de las oraciones que quieres incluir.', ui.ButtonSet.OK);
    return;
  }
  // Ask for PIN, group, evaluation, name
  const pin = ui.prompt('Paso 1/4 — PIN del examen', 'Escribe un PIN de 4 dígitos (los alumnos lo usarán para entrar):', ui.ButtonSet.OK_CANCEL);
  if (pin.getSelectedButton() !== ui.Button.OK) return;
  const pinStr = String(pin.getResponseText()||'').trim();
  if (!/^\d{4,6}$/.test(pinStr)) { ui.alert('PIN inválido', 'Debe ser un número de 4 a 6 dígitos.', ui.ButtonSet.OK); return; }

  const grupo = ui.prompt('Paso 2/4 — Grupo', 'Grupo de alumnos (ej: 3ºA):', ui.ButtonSet.OK_CANCEL);
  if (grupo.getSelectedButton() !== ui.Button.OK) return;
  const evaluacion = ui.prompt('Paso 3/4 — Evaluación', 'Evaluación (ej: 1ª, 2ª, 3ª):', ui.ButtonSet.OK_CANCEL);
  if (evaluacion.getSelectedButton() !== ui.Button.OK) return;
  const nombre = ui.prompt('Paso 4/4 — Nombre del examen', 'Nombre descriptivo (ej: "Examen CD/CI tema 3"):', ui.ButtonSet.OK_CANCEL);
  if (nombre.getSelectedButton() !== ui.Button.OK) return;

  // Build oraciones from selected rows
  const oraciones = [];
  Array.from(rowNumbers).sort((a,b)=>a-b).forEach(rowNum => {
    const row = sheet.getRange(rowNum, 1, 1, Math.max(sheet.getLastColumn(), 7)).getValues()[0];
    const activo = String(row[COL_ACTIVO-1]||'').trim();
    if (activo === 'No') return; // skip inactive
    const obj = buildOracionObject(row, rowNum);
    if (obj) oraciones.push(obj);
  });
  if (oraciones.length === 0) {
    ui.alert('Sin oraciones válidas', 'Las filas seleccionadas no tienen oraciones activas o están vacías.', ui.ButtonSet.OK);
    return;
  }

  // Write to Examenes_Config — go through appendRowSafe_ so the row is
  // placed by header NAME, not by EXAM_HEADER position. This matters when
  // the existing sheet has columns in legacy order: a positional appendRow
  // would put PIN under the Estado column, etc.
  const examSheet = ensureExamSheet_();
  const col = getColMap_(examSheet);
  // Deactivate previous active with same PIN
  const data = examSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['PIN']]).trim() === pinStr && String(data[i][col['Estado']]).trim() === 'activo') {
      examSheet.getRange(i+1, col['Estado']+1).setValue('cerrado');
    }
  }
  ensureSheetHeaders_(examSheet, EXAM_HEADER);
  appendRowSafe_(examSheet, EXAM_HEADER, {
    'PIN':              pinStr,
    'Funciones_JSON':   '[]',
    'Prohibidas_JSON':  '[]',
    'MinCoincid':       1,
    'Dificultad':       0,
    'N_Oraciones':      oraciones.length,
    'Timer_Min':        0,
    'Subfase':          'completo',
    'Grupo':            grupo.getResponseText().trim(),
    'Evaluacion':       evaluacion.getResponseText().trim(),
    'Nombre_Examen':    nombre.getResponseText().trim(),
    'Estado':           'activo',
    'Fecha':            new Date().toISOString(),
    'Oraciones_JSON':   JSON.stringify(oraciones)
  });
  try { CacheService.getScriptCache().remove('exam_' + pinStr); } catch(e) {}

  ui.alert('✓ Examen creado',
    `PIN: ${pinStr}\nOraciones: ${oraciones.length}\nGrupo: ${grupo.getResponseText().trim()}\n\nDa el PIN a los alumnos para que entren en la app en modo Examen.`,
    ui.ButtonSet.OK);
}

function menuActivarSeleccionadas() {
  _toggleSeleccionadas_('Sí');
}
function menuDesactivarSeleccionadas() {
  _toggleSeleccionadas_('No');
}
function _toggleSeleccionadas_(valor) {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== SHEET_BANCO) {
    ui.alert('Ve primero a "Oraciones_Banco"', 'Selecciona las filas y vuelve a ejecutar.', ui.ButtonSet.OK);
    return;
  }
  const ranges = sheet.getActiveRangeList() ? sheet.getActiveRangeList().getRanges() : [sheet.getActiveRange()];
  const rows = new Set();
  ranges.forEach(r => {
    const start = r.getRow();
    const end = start + r.getNumRows() - 1;
    for (let i = start; i <= end; i++) if (i > 1) rows.add(i);
  });
  if (rows.size === 0) { ui.alert('Sin selección', 'Selecciona las filas primero.', ui.ButtonSet.OK); return; }
  rows.forEach(r => sheet.getRange(r, COL_ACTIVO).setValue(valor));
  ui.alert(`✓ ${rows.size} oraciones ${valor==='Sí'?'activadas':'desactivadas'}`,
    'Los cambios ya están disponibles para tus alumnos.', ui.ButtonSet.OK);
}

// Set up dropdown validators for Activo (Sí/No) and Nivel (basico/arcade)
function menuConfigurarValidaciones() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let done = [];

  // Oraciones_Banco: column F (Activo) → Sí/No dropdown
  const banco = ss.getSheetByName(SHEET_BANCO);
  if (banco && banco.getLastRow() > 1) {
    const range = banco.getRange(2, COL_ACTIVO, banco.getLastRow()-1, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Sí','No'], true)
      .setAllowInvalid(false)
      .setHelpText('Elige si la oración está activa (Sí) o inactiva (No)')
      .build();
    range.setDataValidation(rule);
    done.push('✓ Oraciones_Banco → columna Activo: desplegable Sí/No');
  }

  // Morfologia_Textos: column C (Nivel) → basico/arcade dropdown
  const morph = ss.getSheetByName(SHEET_MORPH_TXT);
  if (morph && morph.getLastRow() > 1) {
    const range = morph.getRange(2, 3, morph.getLastRow()-1, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['basico','arcade'], true)
      .setAllowInvalid(false)
      .setHelpText('Elige el nivel: basico (práctica/examen) o arcade (reto rápido)')
      .build();
    range.setDataValidation(rule);
    done.push('✓ Morfologia_Textos → columna Nivel: desplegable basico/arcade');
  }
  // Morfologia_Textos: column E (Activo) → Sí/No
  if (morph && morph.getLastRow() > 1 && morph.getLastColumn() >= 5) {
    const range = morph.getRange(2, 5, morph.getLastRow()-1, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Sí','No'], true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(rule);
    done.push('✓ Morfologia_Textos → columna Activo: desplegable Sí/No');
  }

  // Tipo de Predicado: column D → Predicado Verbal / Predicado Nominal
  if (banco && banco.getLastRow() > 1) {
    const range = banco.getRange(2, COL_TIPO, banco.getLastRow()-1, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Predicado Verbal','Predicado Nominal'], true)
      .setAllowInvalid(true) // legacy data may have other values
      .build();
    range.setDataValidation(rule);
    done.push('✓ Oraciones_Banco → columna Tipo de Predicado: desplegable');
  }

  ui.alert('🎨 Desplegables configurados', done.join('\n')+'\n\nAhora las celdas tendrán una flechita para elegir.', ui.ButtonSet.OK);
}

// Summary of the bank with visual status
function menuResumenBanco() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const banco = ss.getSheetByName(SHEET_BANCO);
  if (!banco) { ui.alert('Banco no encontrado'); return; }
  const data = banco.getDataRange().getValues();
  let activas = 0, inactivas = 0, sinJson = 0, conError = 0;
  const funcionesContador = {};
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const activo = String(r[COL_ACTIVO-1]||'').trim();
    if (activo === 'Sí') activas++;
    else if (activo === 'No') inactivas++;
    const rawJson = String(r[COL_JSON-1]||'');
    if (!rawJson) sinJson++;
    else {
      try {
        JSON.parse(rawJson);
        const tagsRaw = String(r[COL_TAGS-1]||'{}');
        try {
          const tags = JSON.parse(tagsRaw);
          (tags.funciones_presentes||[]).forEach(f => funcionesContador[f] = (funcionesContador[f]||0)+1);
        } catch(e) {}
      } catch(e) { conError++; }
    }
  }
  const topFuncs = Object.entries(funcionesContador).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([f,n]) => `  • ${f}: ${n}`).join('\n');
  ui.alert('📊 Resumen de tu banco',
    `✅ Activas: ${activas}\n❌ Inactivas: ${inactivas}\n⚠ Sin JSON: ${sinJson}\n🔴 Con error: ${conError}\n\n🏷 Top funciones:\n${topFuncs||'  (sin etiquetas)'}`,
    ui.ButtonSet.OK);
}

function generarPin() {
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let cfg   = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) { cfg = ss.insertSheet(SHEET_CONFIG); cfg.appendRow(['Clave','Valor']); }
  const data = cfg.getDataRange().getValues();
  let found  = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === 'pin') {
      cfg.getRange(i+1, 2).setValue(pin); found = true; break;
    }
  }
  if (!found) cfg.appendRow(['PIN', pin]);
  SpreadsheetApp.getUi().alert('✅ Nuevo PIN generado: ' + pin + '\n\nComunícalo verbalmente a tus alumnos.');
}

function verPin() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) { SpreadsheetApp.getUi().alert('No hay hoja Config.'); return; }
  const data = cfg.getDataRange().getValues();
  let pin = '(sin PIN)';
  for (const row of data) {
    if (String(row[0]).trim().toLowerCase() === 'pin') { pin = row[1] || '(vacío)'; break; }
  }
  SpreadsheetApp.getUi().alert('PIN actual: ' + pin);
}

function activarTodas() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, COL_ACTIVO, lastRow - 1, 1).setValue('Sí');
  SpreadsheetApp.getUi().alert('✅ ' + (lastRow - 1) + ' oraciones activadas.');
}

function desactivarTodas() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, COL_ACTIVO, lastRow - 1, 1).setValue('No');
  SpreadsheetApp.getUi().alert('✅ Todas las oraciones desactivadas.');
}

function limpiarResultados() {
  const ui = SpreadsheetApp.getUi();
  const r  = ui.alert('⚠️ ¿Borrar TODOS los resultados?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  ui.alert('✅ Resultados eliminados.');
}

// ════════════════════════════════════════════════════════════════════
//  §7 — ETIQUETADO AUTOMÁTICO (IA, columna G — añadido en v4.7)
// Genera el JSON de metadatos para cada oración
// ════════════════════════════════════════════════════════════════════

function generarEtiquetas() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) { SpreadsheetApp.getUi().alert('Hoja no encontrada.'); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert('Sin datos.'); return; }

  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  let filled = 0, skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const row    = data[i];
    const rawJson = row[COL_JSON -1] ? String(row[COL_JSON-1]) : '';
    const rawTags = row[COL_TAGS -1] ? String(row[COL_TAGS-1]).trim() : '';

    // Skip if already has tags
    if (rawTags && rawTags !== '{}') { skipped++; continue; }

    const parsed = safeParseJSON(rawJson);
    if (!parsed) continue;

    const bloques = Array.isArray(parsed) ? parsed : [parsed];

    // Extract functions present
    const funcs = bloques
      .map(b => b.función || b.funcion || '')
      .filter(f => f && f !== 'NP' && f !== 'Sujeto')
      .map(f => f.trim());

    // Determine predicado type
    const hasAtributo = funcs.some(f => f === 'Atr.' || f === 'CPvo');
    const predicado   = hasAtributo ? 'nominal' : 'verbal';

    // Difficulty heuristic based on number of blocks
    const dificultad = bloques.length <= 2 ? 1 : bloques.length <= 4 ? 2 : bloques.length <= 6 ? 3 : 4;

    // Subfase mínima
    const hasCDCI    = funcs.some(f => ['CD','CI'].includes(f));
    const hasCC      = funcs.some(f => f.startsWith('CC '));
    const subfase    = funcs.length === 0 ? 'solo_np' : (hasCDCI || hasCC) ? 'completo' : 'np_sujeto';

    const tags = {
      tipo_oracion: 'simple',
      predicado,
      funciones_presentes: [...new Set(funcs)],
      dificultad,
    };

    const rowNum = i + 2;
    sheet.getRange(rowNum, COL_TAGS).setValue(JSON.stringify(tags));
    sheet.getRange(rowNum, COL_SUBFASE).setValue(subfase);
    filled++;
  }

  SpreadsheetApp.getUi().alert(
    'Etiquetado completado\n' +
    '• Filas etiquetadas: ' + filled + '\n' +
    '• Filas omitidas (ya tenían etiquetas): ' + skipped
  );
}

function menuRegenerarMorfologia() {
  const ui = SpreadsheetApp.getUi();
  try {
    const r = regenerarMorfologia_();
    ui.alert('🧬 Morfología regenerada',
      'Textos procesados: ' + r.total + '\n' +
      (r.parseErrors>0 ? '⚠ JSONs corruptos ignorados: ' + r.parseErrors : 'Todos los JSONs válidos ✓') +
      '\n\nLos alumnos ahora cargarán los textos en menos de 1 segundo.',
      ui.ButtonSet.OK);
  } catch(e) {
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}

function resumenEtiquetas() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const data    = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

  const funcCount = {};
  let tagged = 0, untagged = 0;

  data.forEach(row => {
    const rawTags = row[COL_TAGS-1] ? String(row[COL_TAGS-1]).trim() : '';
    if (!rawTags || rawTags === '{}') { untagged++; return; }
    tagged++;
    try {
      const tags = JSON.parse(rawTags);
      (tags.funciones_presentes || []).forEach(f => {
        funcCount[f] = (funcCount[f] || 0) + 1;
      });
    } catch(e) {}
  });

  const sorted = Object.entries(funcCount).sort((a,b)=>b[1]-a[1]);
  let msg = 'RESUMEN DE ETIQUETAS v4.7\n\n';
  msg += 'Etiquetadas: ' + tagged + ' | Sin etiquetar: ' + untagged + '\n\n';
  msg += 'Funciones más frecuentes:\n';
  sorted.slice(0,10).forEach(([f,n]) => { msg += '  ' + f + ': ' + n + '\n'; });

  SpreadsheetApp.getUi().alert(msg);
}

// ════════════════════════════════════════════════════════════════════════
//  §8 — DASHBOARD Y UI DE HOJAS
// ════════════════════════════════════════════════════════════════════════

// Apply a consistent visual style to a sheet (one-time setup, NOT on edit)
function setupSheetUI_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() === 0) return;
  sheet.setFrozenRows(1);
  const nCols = sheet.getLastColumn();
  // Header styling
  const header = sheet.getRange(1,1,1,nCols);
  header.setFontWeight('bold')
        .setBackground('#1f4e78')
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center');
  // Autofit columns
  sheet.autoResizeColumns(1, nCols);
  // Remove existing filter then add fresh
  try { const f = sheet.getFilter(); if (f) f.remove(); } catch(e) {}
  try { sheet.getRange(1,1,sheet.getLastRow(),nCols).createFilter(); } catch(e) {}
}

// Apply visual setup + validators to ALL main sheets in one pass
function menuConfigurarTodosLosEstilos() {
  const ui = SpreadsheetApp.getUi();
  const done = [];
  [SHEET_BANCO, SHEET_MORPH_TXT, SHEET_EXAMS, SHEET_RESULTS, SHEET_ARCADE, SHEET_MISIONES].forEach(name => {
    try { setupSheetUI_(name); done.push('✓ ' + name); } catch(e) { done.push('⚠ ' + name + ': ' + e.message); }
  });
  try { menuConfigurarValidaciones(); done.push('✓ Desplegables aplicados'); } catch(e) {}
  ui.alert('🎨 Estilos aplicados', done.join('\n'), ui.ButtonSet.OK);
}

// ── DASHBOARD ────────────────────────────────────────────────────────────
// A read-only panel with key metrics. Regenerated on demand.

function crearDashboard_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const DASH_NAME = '📊 Panel_Profesor';
  let sheet = ss.getSheetByName(DASH_NAME);
  if (!sheet) sheet = ss.insertSheet(DASH_NAME, 0); // insert as first tab
  sheet.clear();
  sheet.clearConditionalFormatRules();

  // ── HEADER ──
  sheet.getRange('A1').setValue('📊 PANEL DEL PROFESOR — Taller de Sintaxis')
    .setFontSize(16).setFontWeight('bold').setFontColor('#1f4e78');
  sheet.getRange('A2').setValue('Actualizado: ' + new Date().toLocaleString('es-ES'))
    .setFontColor('#666').setFontSize(10);

  // ── MÉTRICAS PRINCIPALES ──
  sheet.getRange('A4').setValue('📈 ESTADO DEL SISTEMA').setFontWeight('bold').setFontSize(12).setBackground('#e7f0f7');
  sheet.getRange('A4:C4').merge();

  const metrics = [
    ['Exámenes activos',      contarExamenesActivos_()],
    ['Resultados registrados',contarResultados_()],
    ['Intentos hoy',          contarIntentosHoy_()],
    ['Oraciones activas',     contarOracionesActivas_()],
    ['Textos de morfología',  contarMorfologia_()],
    ['Nota media (últimos 30 días)', notaMedia30d_()]
  ];
  metrics.forEach((m, i) => {
    sheet.getRange(5+i, 1).setValue(m[0]).setFontWeight('bold');
    sheet.getRange(5+i, 2).setValue(m[1]).setHorizontalAlignment('center').setFontSize(12).setFontWeight('bold');
  });

  // ── ALERTAS ──
  const alertas = detectarAlertas_();
  sheet.getRange('A12').setValue('⚠ ALERTAS').setFontWeight('bold').setFontSize(12).setBackground('#fff3cd');
  sheet.getRange('A12:C12').merge();
  sheet.getRange('A13').setValue(alertas || '✓ Todo correcto')
    .setFontColor(alertas ? '#b00020' : '#2d8a3e');

  // ── EXÁMENES ACTIVOS (tabla) ──
  sheet.getRange('A15').setValue('🎯 EXÁMENES ACTIVOS (últimos 10)').setFontWeight('bold').setFontSize(12).setBackground('#e7f0f7');
  sheet.getRange('A15:E15').merge();
  sheet.getRange('A16:E16').setValues([['PIN','Grupo','Examen','Oraciones','Fecha']]).setFontWeight('bold').setBackground('#f0f0f0');
  const examSheet = ss.getSheetByName(SHEET_EXAMS);
  if (examSheet) {
    const col = getColMap_(examSheet);
    const data = examSheet.getDataRange().getValues();
    const active = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][col['Estado']]).trim() === 'activo') {
        active.push([
          data[i][col['PIN']],
          data[i][col['Grupo']]||'—',
          data[i][col['Nombre_Examen']]||'—',
          data[i][col['N_Oraciones']]||0,
          data[i][col['Fecha']] ? new Date(data[i][col['Fecha']]).toLocaleDateString('es-ES') : '—'
        ]);
      }
    }
    active.sort((a,b) => String(b[4]).localeCompare(String(a[4])));
    if (active.length > 0) {
      sheet.getRange(17, 1, active.slice(0,10).length, 5).setValues(active.slice(0,10));
    } else {
      sheet.getRange('A17').setValue('No hay exámenes activos').setFontColor('#999');
    }
  }

  // ── TOP ALUMNOS (últimos 30 días) ──
  const startTop = 30;
  sheet.getRange(startTop, 1).setValue('🏆 TOP ALUMNOS (últimos 30 días)').setFontWeight('bold').setFontSize(12).setBackground('#e7f0f7');
  sheet.getRange(startTop, 1, 1, 4).merge();
  sheet.getRange(startTop+1, 1, 1, 4).setValues([['Alumno','Grupo','Nota media','Nº exámenes']]).setFontWeight('bold').setBackground('#f0f0f0');
  const topRows = topAlumnos_();
  if (topRows.length > 0) {
    sheet.getRange(startTop+2, 1, topRows.length, 4).setValues(topRows);
  } else {
    sheet.getRange(startTop+2, 1).setValue('Aún no hay resultados').setFontColor('#999');
  }

  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 280);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 120);
  sheet.setFrozenRows(1);

  // Move to first tab
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);
}

function contarExamenesActivos_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_EXAMS);
  if (!sheet) return 0;
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['Estado']]).trim() === 'activo') count++;
  }
  return count;
}
function contarResultados_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESULTS);
  if (!sheet) return 0;
  return Math.max(0, sheet.getLastRow() - 1);
}
function contarIntentosHoy_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESULTS);
  if (!sheet) return 0;
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();
  const hoy = new Date().toDateString();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    try {
      const fecha = new Date(data[i][col['Fecha']]).toDateString();
      if (fecha === hoy) count++;
    } catch(e) {}
  }
  return count;
}
function contarOracionesActivas_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BANCO);
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL_ACTIVO-1]).trim() === 'Sí') count++;
  }
  return count;
}
function contarMorfologia_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MORPH_TXT);
  if (!sheet) return 0;
  return Math.max(0, sheet.getLastRow() - 1);
}
function notaMedia30d_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESULTS);
  if (!sheet) return '—';
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();
  const cutoff = Date.now() - 30*24*60*60*1000;
  let sum = 0, n = 0;
  for (let i = 1; i < data.length; i++) {
    try {
      const fecha = new Date(data[i][col['Fecha']]).getTime();
      if (fecha >= cutoff) { sum += parseFloat(data[i][col['Nota']])||0; n++; }
    } catch(e) {}
  }
  return n > 0 ? (sum/n).toFixed(1) + ' / 10' : '—';
}
function contarErroresJSON_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BANCO);
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  let errors = 0;
  for (let i = 1; i < data.length; i++) {
    const raw = String(data[i][COL_JSON-1]||'');
    if (!raw) continue;
    try { JSON.parse(raw); } catch(e) { errors++; }
  }
  return errors;
}
function detectarAlertas_() {
  const alertas = [];
  const errJson = contarErroresJSON_();
  if (errJson > 0) alertas.push('⚠ ' + errJson + ' oraciones con JSON con errores');
  const activas = contarOracionesActivas_();
  if (activas < 50) alertas.push('ℹ Solo ' + activas + ' oraciones activas (recomendado: 100+)');
  return alertas.join('\n');
}
function topAlumnos_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESULTS);
  if (!sheet) return [];
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();
  const cutoff = Date.now() - 30*24*60*60*1000;
  const agg = {};
  for (let i = 1; i < data.length; i++) {
    try {
      const fecha = new Date(data[i][col['Fecha']]).getTime();
      if (fecha < cutoff) continue;
      const key = (data[i][col['Nombre']]||'—') + '|' + (data[i][col['Grupo']]||'—');
      if (!agg[key]) agg[key] = { sum: 0, n: 0, nombre: data[i][col['Nombre']]||'—', grupo: data[i][col['Grupo']]||'—' };
      agg[key].sum += parseFloat(data[i][col['Nota']])||0;
      agg[key].n++;
    } catch(e) {}
  }
  return Object.values(agg)
    .filter(a => a.n >= 1)
    .map(a => [a.nombre, a.grupo, (a.sum/a.n).toFixed(1), a.n])
    .sort((a,b) => parseFloat(b[2]) - parseFloat(a[2]))
    .slice(0, 10);
}
function menuDashboard() {
  try {
    crearDashboard_();
    SpreadsheetApp.getUi().alert('✓ Panel actualizado', 'Se ha actualizado la pestaña "📊 Panel_Profesor" con las últimas métricas.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  §9 — AUDITORÍA Y REPARACIÓN DEL BANCO (Oraciones_Banco cols E, G, H)
// ════════════════════════════════════════════════════════════════════════
//  Fase 1: auditoría en modo lectura (no modifica nada, muestra informe)
//  Fase 2: reparación automática de lo seguro, marca lo dudoso para revisión manual

// Normalizador de funciones no estándar → formato canónico
const FUNC_NORMALIZATION = {
  // Variantes de nombres completos
  'Modificador Oracional': 'Mod.Or.',
  'Mod. Oracional':        'Mod.Or.',
  'Mod. Orac.':            'Mod.Or.',
  'Mod.Orac.':             'Mod.Or.',
  'Vocativo':              'Vocat.',
  'Complemento Agente':    'C.Ag.',
  'C.Agente':              'C.Ag.',
  'C. Agente':             'C.Ag.',
  'C.Ag':                  'C.Ag.',
  'Complemento de Régimen':'C.Rég.',
  'C. Régimen':            'C.Rég.',
  'C.Reg.':                'C.Rég.',
  'C.Reg':                 'C.Rég.',
  'C.Rég':                 'C.Rég.',
  'Complemento Directo':   'CD',
  'Complemento Indirecto': 'CI',
  'Atributo':              'Atr.',
  'Atr':                   'Atr.',
  'Complemento Predicativo':'CPvo',
  'C. Predicativo':        'CPvo',
  'Marca de Pasiva Refleja':'Marca.Pas.Ref.',
  'Marca.Pasiva.Ref.':     'Marca.Pas.Ref.',
  'Marca.Pas.Ref':         'Marca.Pas.Ref.',
  'Marca de Impersonalidad':'Marca.Imp.',
  'Marca.Imp':             'Marca.Imp.',
  // CC compuestos no canónicos → reducir al primero
  'CC Procedencia':        'CC Lugar',
  'CC Lugar/Origen':       'CC Lugar',
  'CC Lugar/Modo':         'CC Lugar',
  'CC Tiempo/Modo':        'CC Tiempo',
  'CC':                    'CC Modo',  // bare CC → fallback to Modo (lo más frecuente)
  // Funciones que NO son del análisis sintáctico oracional → eliminar
  'Aposición':             null,        // función intra-sintagma, no oracional
  'Dat.Et.':               null,        // dativo ético, no implementado
  // Marcas y núcleos que el motor lee de otra forma
  'N (V. Pronominal)':     'Marca.Pron.',
  'N (V. Pasivo)':         'Marca.Pas.Ref.'
};

// Detección de CC compuestos que deben desglosarse
const CC_COMPUESTO_MAP = {
  'CC Lugar/Origen': ['CC Lugar'],
  'CC Lugar/Modo':   ['CC Lugar','CC Modo'],
  'CC Tiempo/Modo':  ['CC Tiempo','CC Modo']
};

function menuAuditarOracionesBanco() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert(
    '🔍 Auditoría de Oraciones_Banco',
    'Voy a revisar todas las filas de la hoja Oraciones_Banco y generaré un informe con los problemas detectados en las columnas E (Estructura_JSON), G (tags) y H (subfase).\n\n' +
    'Esta acción NO modifica ningún dato, solo lee.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  try {
    const result = auditarOracionesBanco_();
    _mostrarInformeAuditoria_(result);
  } catch(e) {
    ui.alert('Error durante la auditoría', e.message, ui.ButtonSet.OK);
  }
}

function menuRepararOracionesBanco() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.alert(
    '✏️ Reparar automáticamente',
    'Voy a reparar automáticamente los siguientes tipos de problema:\n\n' +
    '  • Objetos sueltos en columna E → los envuelvo en lista [{...}]\n' +
    '  • Nombres de función no estándar → los normalizo (Vocativo → Vocat., etc.)\n' +
    '  • Subfases vacías en filas activas → completo con "completo"\n' +
    '  • Regenero la columna G (tags) a partir de E para que queden sincronizadas\n\n' +
    'Las filas con problemas que requieren criterio humano (funciones desconocidas como "Aposición", "Dat.Et.") las marcaré en rojo para que las revises a mano.\n\n' +
    'Se creará una hoja de respaldo "Oraciones_Banco_Backup_[fecha]" antes de cualquier cambio.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.OK_CANCEL);
  if (r1 !== ui.Button.OK) return;
  try {
    const result = repararOracionesBanco_();
    ui.alert('✓ Reparación completada',
      'Filas corregidas: ' + result.corregidas + '\n' +
      'Filas marcadas para revisión manual: ' + result.marcadas + '\n' +
      'Filas sin cambios (ya estaban bien): ' + result.ok + '\n\n' +
      'Hoja de respaldo creada: ' + result.backupName + '\n\n' +
      'Puedes filtrar por color de fondo para ver las que necesitan revisión.',
      ui.ButtonSet.OK);
  } catch(e) {
    ui.alert('Error durante la reparación', e.message, ui.ButtonSet.OK);
  }
}

function auditarOracionesBanco_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) throw new Error('Hoja Oraciones_Banco no encontrada');
  const data = sheet.getDataRange().getValues();

  const report = {
    total: 0, activas: 0, okTotal: 0,
    E_objeto_suelto: [],
    E_json_invalido: [],
    E_vacia_activa: [],
    E_funciones_no_estandar: [],   // normalizables
    E_funciones_desconocidas: [],  // NO normalizables
    G_invalida: [],
    G_desajuste: [],
    G_vacia_activa: [],
    H_vacia_activa: []
  };

  for (let i = 1; i < data.length; i++) {
    const fila = i + 1;
    const oracion = String(data[i][0]||'').trim();
    if (!oracion) continue;
    report.total++;
    const activo = String(data[i][COL_ACTIVO-1]||'').trim();
    if (activo === 'Sí') report.activas++;
    const rawE = String(data[i][COL_JSON-1]||'').trim();
    const rawG = String(data[i][COL_TAGS-1]||'').trim();
    const rawH = String(data[i][7]||'').trim();

    // Column E
    let parsedE = null, errE = false, funcsE = [];
    if (!rawE) {
      if (activo === 'Sí') report.E_vacia_activa.push({fila, oracion: oracion.slice(0,50)});
      errE = true;
    } else {
      try { parsedE = JSON.parse(rawE); }
      catch(e) { report.E_json_invalido.push({fila, oracion: oracion.slice(0,50), err: e.message}); errE = true; }
      if (!errE && !Array.isArray(parsedE)) {
        report.E_objeto_suelto.push({fila, oracion: oracion.slice(0,50), func: (parsedE.función||'?')});
        parsedE = [parsedE]; // for the next analysis
      }
      if (!errE && Array.isArray(parsedE)) {
        for (const item of parsedE) {
          if (item && typeof item === 'object' && item.función) {
            const f = item.función;
            funcsE.push(f);
            if (FUNC_NORMALIZATION.hasOwnProperty(f)) {
              if (FUNC_NORMALIZATION[f] === null) {
                report.E_funciones_desconocidas.push({fila, oracion: oracion.slice(0,50), funcion: f});
              } else {
                report.E_funciones_no_estandar.push({fila, oracion: oracion.slice(0,50), antes: f, despues: FUNC_NORMALIZATION[f]});
              }
            }
          }
        }
      }
    }

    // Column G
    if (!rawG || rawG === '{}') {
      if (activo === 'Sí') report.G_vacia_activa.push({fila, oracion: oracion.slice(0,50)});
    } else {
      try {
        const parsedG = JSON.parse(rawG);
        const funcsG = (parsedG.funciones_presentes || []).sort();
        const funcsEsorted = [...new Set(funcsE.filter(f => !FUNC_NORMALIZATION.hasOwnProperty(f) || FUNC_NORMALIZATION[f]))].sort();
        if (activo === 'Sí' && parsedE && JSON.stringify(funcsEsorted) !== JSON.stringify(funcsG)) {
          report.G_desajuste.push({fila, oracion: oracion.slice(0,45), eTiene: funcsEsorted, gDice: funcsG});
        }
      } catch(e) { report.G_invalida.push({fila, oracion: oracion.slice(0,50), err: e.message}); }
    }

    // Column H
    if (!rawH && activo === 'Sí') report.H_vacia_activa.push({fila, oracion: oracion.slice(0,50)});

    if (activo === 'Sí' && !errE && funcsE.length > 0) report.okTotal++;
  }
  return report;
}

function _mostrarInformeAuditoria_(r) {
  let msg = '📊 INFORME DE AUDITORÍA — Oraciones_Banco\n\n';
  msg += '══════════════════════════════════\n';
  msg += 'TOTAL: ' + r.total + ' oraciones (' + r.activas + ' activas)\n';
  msg += 'Sanas y listas: ' + r.okTotal + '\n';
  msg += '══════════════════════════════════\n\n';
  msg += 'COLUMNA E (Estructura_JSON):\n';
  msg += '  • Objeto suelto (debe ser lista): ' + r.E_objeto_suelto.length + ' filas\n';
  msg += '  • JSON inválido: ' + r.E_json_invalido.length + '\n';
  msg += '  • Vacía en activa: ' + r.E_vacia_activa.length + '\n';
  msg += '  • Funciones normalizables: ' + r.E_funciones_no_estandar.length + '\n';
  msg += '  • Funciones DESCONOCIDAS (revisar a mano): ' + r.E_funciones_desconocidas.length + '\n\n';
  msg += 'COLUMNA G (tags):\n';
  msg += '  • JSON inválido: ' + r.G_invalida.length + '\n';
  msg += '  • Desajuste con E: ' + r.G_desajuste.length + '\n';
  msg += '  • Vacía en activa: ' + r.G_vacia_activa.length + '\n\n';
  msg += 'COLUMNA H (subfase):\n';
  msg += '  • Vacía en activa: ' + r.H_vacia_activa.length + '\n\n';
  if (r.E_funciones_desconocidas.length > 0) {
    msg += '⚠ FUNCIONES DESCONOCIDAS (necesitan revisión humana):\n';
    const by = {};
    r.E_funciones_desconocidas.forEach(x => { by[x.funcion] = (by[x.funcion]||0) + 1; });
    Object.entries(by).forEach(([f,n]) => { msg += '   · ' + f + ': ' + n + ' filas\n'; });
    msg += '\n   Primeras filas afectadas: ';
    msg += r.E_funciones_desconocidas.slice(0,5).map(x => x.fila).join(', ') + '\n\n';
  }
  msg += 'Para reparar automáticamente todo lo seguro, usa:\n';
  msg += '   🎓 Taller de Sintaxis → ✏️ Reparar oraciones automáticamente';

  SpreadsheetApp.getUi().alert('Auditoría completada', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function repararOracionesBanco_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BANCO);
  if (!sheet) throw new Error('Hoja Oraciones_Banco no encontrada');

  // 1. Backup
  const fechaStr = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd_HHmm');
  const backupName = 'Oraciones_Banco_Backup_' + fechaStr;
  const backup = sheet.copyTo(ss);
  backup.setName(backupName);

  // 2. Repair pass
  const data = sheet.getDataRange().getValues();
  const COLOR_OK   = null;                  // no background
  const COLOR_FIX  = '#E9F5EC';             // soft green — auto-fixed
  const COLOR_WARN = '#FFF4E6';             // soft orange — needs review
  const COLOR_ERR  = '#FDE2E2';             // soft red — could not fix

  let corregidas = 0, marcadas = 0, okCount = 0;

  for (let i = 1; i < data.length; i++) {
    const fila = i + 1;
    const oracion = String(data[i][0]||'').trim();
    if (!oracion) continue;
    const activo = String(data[i][COL_ACTIVO-1]||'').trim();
    if (activo !== 'Sí') continue; // only process active rows

    const rawE = String(data[i][COL_JSON-1]||'').trim();
    const rawH = String(data[i][7]||'').trim();
    let changed = false;
    let needsReview = false;
    let rowColor = null;

    // --- Repair column E ---
    let parsedE = null;
    if (rawE) {
      try {
        parsedE = JSON.parse(rawE);
      } catch(e) {
        // JSON invalid — mark red, skip
        sheet.getRange(fila, 1, 1, 10).setBackground(COLOR_ERR);
        marcadas++;
        continue;
      }
      // Unwrap single object into array
      if (!Array.isArray(parsedE) && typeof parsedE === 'object') {
        parsedE = [parsedE];
        changed = true;
      }
      if (Array.isArray(parsedE)) {
        for (let k = 0; k < parsedE.length; k++) {
          const item = parsedE[k];
          if (!item || typeof item !== 'object') continue;
          const f = item.función;
          if (f && FUNC_NORMALIZATION.hasOwnProperty(f)) {
            const rep = FUNC_NORMALIZATION[f];
            if (rep === null) {
              needsReview = true; // function cannot be auto-repaired
            } else {
              item.función = rep;
              changed = true;
            }
          }
        }
        if (changed) {
          sheet.getRange(fila, COL_JSON).setValue(JSON.stringify(parsedE));
        }
      }
    }

    // --- Regenerate column G from E ---
    if (parsedE && Array.isArray(parsedE)) {
      const funcs = [...new Set(
        parsedE
          .filter(it => it && typeof it === 'object' && it.función)
          .map(it => it.función)
          .filter(f => !FUNC_NORMALIZATION.hasOwnProperty(f) || FUNC_NORMALIZATION[f] !== null)
      )];
      const tags = {
        tipo_oracion: 'simple',
        predicado: (String(data[i][3]||'').toLowerCase().includes('nominal') ? 'nominal' : 'verbal'),
        funciones_presentes: funcs,
        dificultad: 2
      };
      const rawG = String(data[i][COL_TAGS-1]||'').trim();
      let existingG = {};
      try { if (rawG && rawG !== '{}') existingG = JSON.parse(rawG); } catch(e) {}
      // preserve existing difficulty if valid
      if (existingG.dificultad && Number.isInteger(existingG.dificultad)) tags.dificultad = existingG.dificultad;
      const newG = JSON.stringify(tags);
      if (newG !== rawG) {
        sheet.getRange(fila, COL_TAGS).setValue(newG);
        changed = true;
      }
    }

    // --- Repair column H ---
    if (!rawH) {
      sheet.getRange(fila, 8).setValue('completo');
      changed = true;
    }

    // --- Color the row ---
    if (needsReview) {
      sheet.getRange(fila, 1, 1, 10).setBackground(COLOR_WARN);
      marcadas++;
    } else if (changed) {
      sheet.getRange(fila, 1, 1, 10).setBackground(COLOR_FIX);
      corregidas++;
      // Reset color after a couple of seconds? No — leave it so user can see what changed
    } else {
      okCount++;
    }
  }

  // Clear cache so next student reads fresh data
  try { CacheService.getScriptCache().remove('morfologia_all'); } catch(e) {}

  return { corregidas, marcadas, ok: okCount, backupName };
}

function menuLimpiarColoresAuditoria() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert(
    '🧹 Limpiar colores de auditoría',
    'Esto eliminará todos los colores de fondo de la hoja Oraciones_Banco.\n\n' +
    'Úsalo cuando ya hayas revisado las filas marcadas.',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BANCO);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).setBackground(null);
    ui.alert('✓ Listo', 'Colores eliminados.', ui.ButtonSet.OK);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  §10 — LIMPIEZA Y COHERENCIA  (hojas obsoletas · backups · validación)
// ════════════════════════════════════════════════════════════════════════
//  Identifica hojas que NO forman parte del esquema activo y permite
//  eliminarlas tras confirmación. Hojas activas: las definidas en SHEET_*

function menuLimpiarHojasObsoletas() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Lista de hojas oficialmente en uso
  const ACTIVE = [
    SHEET_BANCO, SHEET_RESULTS, SHEET_SESIONES, SHEET_MORPH,
    SHEET_ARCADE, SHEET_CONFIG, SHEET_MORPH_TXT,
    SHEET_MISIONES, SHEET_MIS_RES, SHEET_EXAMS
  ];

  const allSheets = ss.getSheets();
  const obsoletas = [];
  allSheets.forEach(s => {
    const name = s.getName();
    if (ACTIVE.indexOf(name) < 0) obsoletas.push({ name, rows: s.getLastRow(), sheet: s });
  });

  if (obsoletas.length === 0) {
    ui.alert('Limpieza', 'No hay hojas obsoletas. Todo está en orden.', ui.ButtonSet.OK);
    return;
  }

  const lista = obsoletas.map(o => '  • ' + o.name + ' (' + o.rows + ' filas)').join('\n');
  const r = ui.alert(
    '🗑️ Limpiar hojas no utilizadas',
    'Estas hojas no forman parte del esquema activo de la aplicación:\n\n' +
    lista + '\n\n' +
    'Pueden ser:\n' +
    '  · Hojas vacías (Hoja 1, Hoja 2…)\n' +
    '  · Copias de seguridad antiguas\n' +
    '  · Restos de versiones anteriores\n\n' +
    '¿Quieres eliminarlas todas?\n' +
    '(Si necesitas conservar alguna, pulsa Cancelar y elimínalas manualmente.)',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;

  let eliminadas = 0;
  obsoletas.forEach(o => {
    try {
      ss.deleteSheet(o.sheet);
      eliminadas++;
    } catch(e) {
      console.error('No se pudo eliminar ' + o.name + ': ' + e.message);
    }
  });

  ui.alert('✓ Limpieza completada',
    'Hojas eliminadas: ' + eliminadas + ' de ' + obsoletas.length,
    ui.ButtonSet.OK);
}

// ════════════════════════════════════════════════════════════════════════
//  menuLimpiarBackupsAntiguos — borra hojas *_Backup_* con > 30 días
//
//  Las funciones de reparación crean backups automáticamente
//  ('Oraciones_Banco_Backup_yyyyMMdd_HHmm'). Esto evita acumular 100+
//  copias antiguas en el spreadsheet.
//
//  Detecta hojas cuyo nombre contiene "Backup" y extrae la fecha en
//  formato yyyyMMdd. Las sin fecha detectable se listan pero NO se
//  borran automáticamente.
// ════════════════════════════════════════════════════════════════════════
function menuLimpiarBackupsAntiguos() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const DIAS_LIMITE = 30;

  const ahora = new Date();
  const limite = new Date(ahora.getTime() - DIAS_LIMITE * 24 * 60 * 60 * 1000);

  const antiguos = [];
  const sinFecha = [];
  ss.getSheets().forEach(s => {
    const name = s.getName();
    if (!/[Bb]ackup/.test(name)) return;
    const m = name.match(/(\d{8})/);
    if (!m) { sinFecha.push({ name, sheet: s }); return; }
    const y = parseInt(m[1].slice(0, 4));
    const mo = parseInt(m[1].slice(4, 6)) - 1;
    const d = parseInt(m[1].slice(6, 8));
    const fecha = new Date(y, mo, d);
    if (isNaN(fecha.getTime())) { sinFecha.push({ name, sheet: s }); return; }
    const dias = Math.floor((ahora - fecha) / (24 * 60 * 60 * 1000));
    if (fecha < limite) antiguos.push({ name, sheet: s, dias });
  });

  if (antiguos.length === 0 && sinFecha.length === 0) {
    ui.alert('Limpieza de backups',
      'No se han encontrado hojas de backup con más de ' + DIAS_LIMITE + ' días.',
      ui.ButtonSet.OK);
    return;
  }

  let msg = '';
  if (antiguos.length > 0) {
    msg += '🗓 Backups antiguos (más de ' + DIAS_LIMITE + ' días):\n\n';
    msg += antiguos.map(b => '  • ' + b.name + ' (' + b.dias + ' días)').join('\n');
    msg += '\n\n';
  }
  if (sinFecha.length > 0) {
    msg += '❓ Backups sin fecha detectable (no se borran automáticamente):\n\n';
    msg += sinFecha.map(b => '  • ' + b.name).join('\n');
    msg += '\n\n';
  }

  if (antiguos.length === 0) {
    ui.alert('Backups detectados',
      msg + 'Revísalos manualmente si quieres eliminarlos.',
      ui.ButtonSet.OK);
    return;
  }

  msg += '¿Quieres eliminar los ' + antiguos.length + ' backups antiguos?';
  const r = ui.alert('🗑 Limpiar backups antiguos', msg, ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;

  let eliminados = 0;
  antiguos.forEach(b => {
    try { ss.deleteSheet(b.sheet); eliminados++; }
    catch(e) { console.error('No se pudo eliminar ' + b.name + ': ' + e.message); }
  });

  ui.alert('✓ Limpieza completada',
    'Backups eliminados: ' + eliminados + ' de ' + antiguos.length,
    ui.ButtonSet.OK);
}

// ════════════════════════════════════════════════════════════════════════
//  menuValidarCoherencia — chequeo rápido pre-clase del estado del banco
//
//  Detecta:
//    1. Oraciones activas (Activo=Sí) con JSON no parseable
//    2. Exámenes con Estado=Activo y Oraciones_JSON vacío/roto
//    3. Resultados de alumnos sin Grupo asignado
//
//  No corrige nada: solo informa para que el profesor pueda actuar
//  manualmente antes de empezar la clase.
// ════════════════════════════════════════════════════════════════════════
function menuValidarCoherencia() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const problemas = { jsonRotos: [], examenesVacios: [], alumnosSinGrupo: [] };

  // 1. Oraciones activas con JSON roto
  const bSheet = ss.getSheetByName(SHEET_BANCO);
  if (bSheet) {
    const data = bSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const activo = String(data[i][COL_ACTIVO - 1] || '').trim().toLowerCase();
      if (activo !== 'sí' && activo !== 'si' && activo !== 'true') continue;
      const parsed = safeParseJSON(data[i][COL_JSON - 1]);
      if (!parsed) {
        const txt = String(data[i][COL_TEXTO - 1] || '').slice(0, 50);
        problemas.jsonRotos.push('Fila ' + (i + 1) + ': "' + txt + '…"');
      }
    }
  }

  // 2. Exámenes activos sin oraciones
  const eSheet = ss.getSheetByName(SHEET_EXAMS);
  if (eSheet && eSheet.getLastRow() > 1) {
    const data = eSheet.getDataRange().getValues();
    const headers = data[0];
    const colEstado  = headers.indexOf('Estado');
    const colPin     = headers.indexOf('PIN');
    const colOraJson = headers.indexOf('Oraciones_JSON');
    if (colEstado >= 0 && colOraJson >= 0) {
      for (let i = 1; i < data.length; i++) {
        const estado = String(data[i][colEstado] || '').trim().toLowerCase();
        if (estado !== 'activo') continue;
        let oraciones = null;
        try { oraciones = JSON.parse(data[i][colOraJson]); } catch(e) {}
        if (!Array.isArray(oraciones) || oraciones.length === 0) {
          problemas.examenesVacios.push('PIN ' + (data[i][colPin] || '?') + ' (fila ' + (i + 1) + ')');
        }
      }
    }
  }

  // 3. Resultados de alumnos sin Grupo
  const rSheet = ss.getSheetByName(SHEET_RESULTS);
  if (rSheet && rSheet.getLastRow() > 1) {
    const data = rSheet.getDataRange().getValues();
    const headers = data[0];
    const colGrupo  = headers.indexOf('Grupo');
    const colNombre = headers.indexOf('Nombre');
    const colFecha  = headers.indexOf('Fecha');
    if (colGrupo >= 0) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][colGrupo] || '').trim()) continue;
        const nombre = data[i][colNombre] || '?';
        const fecha  = data[i][colFecha]  || 'sin fecha';
        problemas.alumnosSinGrupo.push(nombre + ' (' + fecha + ')');
      }
    }
  }

  const total = problemas.jsonRotos.length + problemas.examenesVacios.length + problemas.alumnosSinGrupo.length;
  if (total === 0) {
    ui.alert('✓ Coherencia validada',
      'Banco, exámenes y resultados están coherentes. Todo listo para clase.',
      ui.ButtonSet.OK);
    return;
  }

  let msg = '⚠ Se han detectado ' + total + ' incidencias:\n\n';
  if (problemas.jsonRotos.length > 0) {
    msg += '📛 Oraciones activas con JSON roto (' + problemas.jsonRotos.length + '):\n';
    msg += problemas.jsonRotos.slice(0, 10).map(s => '  • ' + s).join('\n');
    if (problemas.jsonRotos.length > 10) msg += '\n  … y ' + (problemas.jsonRotos.length - 10) + ' más';
    msg += '\n\n';
  }
  if (problemas.examenesVacios.length > 0) {
    msg += '📛 Exámenes activos sin oraciones (' + problemas.examenesVacios.length + '):\n';
    msg += problemas.examenesVacios.map(s => '  • ' + s).join('\n');
    msg += '\n\n';
  }
  if (problemas.alumnosSinGrupo.length > 0) {
    msg += '📛 Resultados de alumnos sin grupo (' + problemas.alumnosSinGrupo.length + '):\n';
    msg += problemas.alumnosSinGrupo.slice(0, 5).map(s => '  • ' + s).join('\n');
    if (problemas.alumnosSinGrupo.length > 5) msg += '\n  … y ' + (problemas.alumnosSinGrupo.length - 5) + ' más';
  }

  ui.alert('⚠ Coherencia: problemas detectados', msg, ui.ButtonSet.OK);
}

// ── menuAutotest — comprueba el estado del backend sin modificar datos ──
// Llama a las funciones internas directamente (sin HTTP).
// Cada check: función anónima que devuelve string con info o lanza Error.
function menuAutotest() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultados = [];

  function check(nombre, fn) {
    try {
      const info = fn();
      resultados.push('✓ ' + nombre + (info ? ': ' + info : ''));
    } catch(e) {
      resultados.push('✗ ' + nombre + ': ' + e.message);
    }
  }

  // 1. Hojas esenciales del módulo simple
  check('Hojas esenciales', function() {
    const requeridas = [SHEET_BANCO, SHEET_RESULTS, SHEET_EXAMS];
    const faltantes = requeridas.filter(function(h){ return !ss.getSheetByName(h); });
    if (faltantes.length > 0) throw new Error('Faltan: ' + faltantes.join(', '));
    return 'presentes (' + requeridas.length + ')';
  });

  // 2. Banco simple: contar activas y verificar que al menos una tiene JSON válido
  check('Oraciones_Banco', function() {
    const sheet = ss.getSheetByName(SHEET_BANCO);
    if (!sheet) throw new Error('no existe');
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) throw new Error('vacío');
    const activas = data.slice(1).filter(function(r){
      return String(r[COL_ACTIVO - 1]).trim() === 'Sí';
    });
    if (activas.length === 0) throw new Error('ninguna oración activa');
    // Verificar JSON de las primeras 10 activas
    let conJson = 0;
    for (let i = 0; i < Math.min(activas.length, 10); i++) {
      if (safeParseJSON(String(activas[i][COL_JSON - 1]))) conJson++;
    }
    if (conJson === 0) throw new Error('todas con JSON roto (muestra de 10)');
    return activas.length + ' activas, JSON OK en muestra';
  });

  // 3. Banco compuestas (solo si el módulo está cargado)
  check('Compuestas_Banco', function() {
    if (typeof SHEET_COMPUESTAS_BANCO === 'undefined') return 'módulo Compuestas.gs no cargado';
    const sheet = ss.getSheetByName(SHEET_COMPUESTAS_BANCO);
    if (!sheet) return 'hoja no creada aún (usa Menú → Oración Compuesta → Crear hojas)';
    const col = getColMap_(sheet);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return '0 ejercicios';
    const activoIdx = col['Activo'];
    if (activoIdx === undefined) throw new Error('cabecera "Activo" no encontrada');
    const activas = data.slice(1).filter(function(r){
      return String(r[activoIdx]).trim() === 'Sí';
    });
    return activas.length + ' ejercicios activos';
  });

  // 4. Exámenes simples configurados
  check('Examenes_Config', function() {
    const sheet = ss.getSheetByName(SHEET_EXAMS);
    if (!sheet) return 'aún sin exámenes (se crea al crear el primero)';
    const n = Math.max(0, sheet.getLastRow() - 1);
    const activos = sheet.getDataRange().getValues().slice(1).filter(function(r){
      const col = getColMap_(sheet);
      return col['Estado'] !== undefined && String(r[col['Estado']]).trim() === 'activo';
    }).length;
    return n + ' examen(es) total, ' + activos + ' activo(s)';
  });

  // 5. getStats_ no lanza excepción
  check('getStats_()', function() {
    const r = getStats_();
    if (r && r.error) throw new Error(r.error);
    return 'ok';
  });

  // 6. getStatsCompuestas_ (si está disponible)
  check('getStatsCompuestas_()', function() {
    if (typeof getStatsCompuestas_ !== 'function') return 'no disponible';
    const r = getStatsCompuestas_();
    if (r && r.error) throw new Error(r.error);
    return 'ok';
  });

  // 7. Hoja Logs_GAS (informativa, no falla si no existe)
  check('Logs_GAS', function() {
    const sheet = ss.getSheetByName(SHEET_LOGS);
    if (!sheet) return 'sin errores registrados aún (buena señal 👍)';
    const n = Math.max(0, sheet.getLastRow() - 1);
    return n + ' entradas de log';
  });

  const ok   = resultados.filter(function(r){ return r.startsWith('✓'); }).length;
  const fail = resultados.filter(function(r){ return r.startsWith('✗'); }).length;
  const icon = fail === 0 ? '✅' : '⚠️';
  ui.alert(
    icon + ' Autotest — ' + ok + ' OK · ' + fail + ' fallo(s)',
    resultados.join('\n'),
    ui.ButtonSet.OK
  );
}

// ── menuPurgarLogsGAS — borra entradas de Logs_GAS con más de 30 días ──
function menuPurgarLogsGAS() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) {
    ui.alert('No existe todavía la hoja Logs_GAS. Se crea automáticamente cuando ocurre el primer error inesperado.', '', ui.ButtonSet.OK);
    return;
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) { ui.alert('Logs_GAS está vacía.', '', ui.ButtonSet.OK); return; }
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  // Recorrer de abajo a arriba para borrar sin desplazar índices
  let borradas = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    const fecha = data[i][0];
    if (fecha instanceof Date && fecha < limite) {
      sheet.deleteRow(i + 1);
      borradas++;
    }
  }
  ui.alert('🗑 Logs_GAS: ' + borradas + ' entradas antiguas (>30 días) borradas.', '', ui.ButtonSet.OK);
}

// ════════════════════════════════════════════════════════════════════════
//  §11 — INFORME DEL PROFESOR (datos para Excel multi-hoja)
// ════════════════════════════════════════════════════════════════════════
//  Endpoint: doGet?action=getInformeProfesor
//  Params (todos opcionales):
//    • from   — YYYY-MM-DD (default = hoy − 7 días)
//    • to     — YYYY-MM-DD (default = hoy, incluido hasta 23:59:59)
//    • grupo  — string (default = todos)
//    • tipo   — 'todo' | 'simples' | 'compuestas' | 'examen' (default 'todo')
//
//  Devuelve un JSON enriquecido que el cliente convierte a Excel con
//  SheetJS. NO genera el Excel aquí: Apps Script tarda mucho con XLSX
//  via Drive API y se rompen los formatos.
//
//  Hojas leídas:
//    • Alumnos_Resultados      (sintaxis simple — modo examen)
//    • Sesiones_Practica       (sintaxis simple — práctica libre)
//    • Compuestas_Resultados   (oración compuesta — examen y práctica)
//    • Examenes_Config         (metadatos de exámenes con PIN)
// ════════════════════════════════════════════════════════════════════════

function getInformeProfesor_(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── 1. Parsear y normalizar parámetros ──────────────────────────────
    const hoy = new Date();
    const haceSieteDias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = parseFechaParam_(params.from, haceSieteDias, false);
    const to   = parseFechaParam_(params.to,   hoy,            true);
    const grupoFilter = String(params.grupo || '').trim();
    const tipoFilter  = String(params.tipo  || 'todo').trim().toLowerCase();

    // ── 2. Cargar datos brutos por hoja ─────────────────────────────────
    const filasSimplesEx = leerSimplesExamen_(ss,  from, to, grupoFilter);
    const filasSimplesPr = leerSimplesPractica_(ss, from, to, grupoFilter);
    const filasComp      = leerCompuestasRes_(ss,  from, to, grupoFilter);
    const examenesCfg    = leerExamenesConfig_(ss);

    // ── 3. Aplicar filtro de tipo ───────────────────────────────────────
    const usarSimplesEx = (tipoFilter === 'todo' || tipoFilter === 'simples' || tipoFilter === 'examen');
    const usarSimplesPr = (tipoFilter === 'todo' || tipoFilter === 'simples');
    const usarCompEx    = (tipoFilter === 'todo' || tipoFilter === 'compuestas' || tipoFilter === 'examen');
    const usarCompPr    = (tipoFilter === 'todo' || tipoFilter === 'compuestas');
    const simplesEx = usarSimplesEx ? filasSimplesEx : [];
    const simplesPr = usarSimplesPr ? filasSimplesPr : [];
    const comp = filasComp.filter(r => {
      const modo = String(r.modo || '').toLowerCase();
      return (modo === 'examen' && usarCompEx) || (modo !== 'examen' && usarCompPr);
    });

    // ── 4. Agregar por alumno (clave: correo en minúsculas) ─────────────
    const alumnosMap = {};
    function ensureAlumno_(correo, nombre, grupo) {
      const key = String(correo || '').trim().toLowerCase();
      if (!alumnosMap[key]) {
        alumnosMap[key] = {
          correo: key,
          nombre: String(nombre || '').trim(),
          grupo:  String(grupo || '').trim(),
          n_actividades: 0,
          notas: [],
          tiempo_min_total: 0,
          ultima_actividad: null,
          simples_practica: { sesiones: 0, ejercicios: 0, notas: [] },
          simples_examen:   { intentos: 0, notas: [] },
          compuestas:       { intentos: 0, notas: [] },
          errores: {}   // funcion → count
        };
      } else {
        // Actualizar nombre/grupo si llegan vacíos antes y completos ahora
        if (!alumnosMap[key].nombre && nombre) alumnosMap[key].nombre = String(nombre).trim();
        if (!alumnosMap[key].grupo  && grupo)  alumnosMap[key].grupo  = String(grupo).trim();
      }
      return alumnosMap[key];
    }
    function pushUltima_(al, fecha) {
      if (!fecha) return;
      if (!al.ultima_actividad || fecha > al.ultima_actividad) al.ultima_actividad = fecha;
    }
    function sumErr_(al, funcion, n) {
      if (!funcion || !n) return;
      al.errores[funcion] = (al.errores[funcion] || 0) + n;
    }

    // Simples examen
    simplesEx.forEach(r => {
      if (!r.correo) return;
      const a = ensureAlumno_(r.correo, r.nombre, r.grupo);
      a.n_actividades++;
      a.notas.push(r.nota);
      a.simples_examen.intentos++;
      a.simples_examen.notas.push(r.nota);
      pushUltima_(a, r.fecha);
    });

    // Simples práctica (con desglose de errores por función)
    simplesPr.forEach(r => {
      if (!r.correo) return;
      const a = ensureAlumno_(r.correo, r.nombre, r.grupo);
      a.n_actividades++;
      a.notas.push(r.nota);
      a.tiempo_min_total += (r.tiempoMin || 0);
      a.simples_practica.sesiones++;
      a.simples_practica.ejercicios += (r.oracionesHechas || 0);
      a.simples_practica.notas.push(r.nota);
      pushUltima_(a, r.fecha);
      sumErr_(a, 'CD',     r.errCD);
      sumErr_(a, 'CI',     r.errCI);
      sumErr_(a, 'Atr.',   r.errAtr);
      sumErr_(a, 'CPvo',   r.errCPvo);
      sumErr_(a, 'C.Rég.', r.errCReg);
      sumErr_(a, 'CC',     r.errCC);
    });

    // Compuestas (examen + práctica)
    comp.forEach(r => {
      if (!r.correo) return;
      const a = ensureAlumno_(r.correo, r.nombre, r.grupo);
      a.n_actividades++;
      a.notas.push(r.nota);
      a.compuestas.intentos++;
      a.compuestas.notas.push(r.nota);
      pushUltima_(a, r.fecha);
    });

    // ── 5. Construir array final de alumnos con stats ───────────────────
    const alumnos = Object.keys(alumnosMap).map(k => {
      const a = alumnosMap[k];
      const erroresTop = Object.keys(a.errores)
        .map(f => ({ funcion: f, count: a.errores[f] }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 5);
      return {
        correo: a.correo,
        nombre: a.nombre,
        grupo:  a.grupo,
        n_actividades:    a.n_actividades,
        nota_media:       media_(a.notas),
        tiempo_min_total: a.tiempo_min_total,
        ultima_actividad: a.ultima_actividad ? a.ultima_actividad.toISOString() : null,
        simples_practica: {
          sesiones:   a.simples_practica.sesiones,
          ejercicios: a.simples_practica.ejercicios,
          nota_media: media_(a.simples_practica.notas)
        },
        simples_examen: {
          intentos:   a.simples_examen.intentos,
          nota_media: media_(a.simples_examen.notas),
          mejor_nota: a.simples_examen.notas.length ? Math.max.apply(null, a.simples_examen.notas) : null
        },
        compuestas: {
          intentos:   a.compuestas.intentos,
          nota_media: media_(a.compuestas.notas)
        },
        errores_top: erroresTop
      };
    });

    // Ordenar alumnos por nombre dentro de grupo
    alumnos.sort((a, b) => {
      const g = (a.grupo || 'zzz').localeCompare(b.grupo || 'zzz', 'es');
      if (g !== 0) return g;
      return (a.nombre || '').localeCompare(b.nombre || '', 'es');
    });

    // ── 6. Agrupar por "Grupo" ──────────────────────────────────────────
    const grupos = {};
    alumnos.forEach(al => {
      const g = al.grupo || '(sin grupo)';
      if (!grupos[g]) grupos[g] = { nombre: g, correos: [], notas: [], actividades: 0, errores: {} };
      grupos[g].correos.push(al.correo);
      if (al.nota_media !== null) grupos[g].notas.push(al.nota_media);
      grupos[g].actividades += al.n_actividades;
      al.errores_top.forEach(e => {
        grupos[g].errores[e.funcion] = (grupos[g].errores[e.funcion] || 0) + e.count;
      });
    });

    const gruposArr = Object.keys(grupos).map(k => {
      const g = grupos[k];
      const aprob = g.notas.filter(n => n >= 5).length;
      return {
        nombre: g.nombre,
        alumnos: g.correos.length,
        actividades: g.actividades,
        nota_media: media_(g.notas),
        pct_aprobados: g.notas.length ? Math.round((aprob / g.notas.length) * 100) : 0,
        diagnostico: Object.keys(g.errores)
          .map(f => ({ funcion: f, count: g.errores[f] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    // ── 7. Resumen global ──────────────────────────────────────────────
    const todasLasNotas = alumnos.map(a => a.nota_media).filter(n => n !== null);
    const aprobadosGlobal = todasLasNotas.filter(n => n >= 5).length;
    const totalActividades = alumnos.reduce((s, a) => s + a.n_actividades, 0);

    // Diagnóstico global: suma de errores de todos los grupos
    const erroresGlobal = {};
    Object.keys(grupos).forEach(g => {
      Object.keys(grupos[g].errores).forEach(f => {
        erroresGlobal[f] = (erroresGlobal[f] || 0) + grupos[g].errores[f];
      });
    });
    const totalErrores = Object.values(erroresGlobal).reduce((s, n) => s + n, 0);
    const diagnosticoGlobal = Object.keys(erroresGlobal)
      .map(f => ({
        funcion: f,
        count: erroresGlobal[f],
        pct: totalErrores ? Math.round((erroresGlobal[f] / totalErrores) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // ── 8. Detalle (una fila por actividad) ─────────────────────────────
    const detalle = [];
    simplesEx.forEach(r => detalle.push({
      fecha: r.fecha ? r.fecha.toISOString() : null,
      correo: r.correo, nombre: r.nombre, grupo: r.grupo,
      tipo: 'Sintaxis · examen',
      nota: r.nota, tiempo_min: null,
      info: (r.examen || '') + (r.pin ? ' [PIN ' + r.pin + ']' : '')
    }));
    simplesPr.forEach(r => detalle.push({
      fecha: r.fecha ? r.fecha.toISOString() : null,
      correo: r.correo, nombre: r.nombre, grupo: r.grupo,
      tipo: 'Sintaxis · práctica',
      nota: r.nota, tiempo_min: r.tiempoMin,
      info: (r.modulo || 'sintaxis') + ' · ' + (r.oracionesHechas || 0) + ' oraciones'
    }));
    comp.forEach(r => detalle.push({
      fecha: r.fecha ? r.fecha.toISOString() : null,
      correo: r.correo, nombre: r.nombre, grupo: r.grupo,
      tipo: 'Compuestas · ' + (String(r.modo).toLowerCase() === 'examen' ? 'examen' : 'práctica'),
      nota: r.nota, tiempo_min: null,
      info: (r.completados || 0) + '/' + (r.totalEjercicios || 0) + ' ejercicios'
              + (r.pin && String(r.modo).toLowerCase() === 'examen' ? ' [PIN ' + r.pin + ']' : '')
    }));
    detalle.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

    // ── 9. Exámenes (agrupar por PIN) ───────────────────────────────────
    const examenesMap = {};
    function pushExamen_(r, modulo) {
      const pin = String(r.pin || '').trim();
      if (!pin) return;
      if (!examenesMap[pin]) {
        const cfg = examenesCfg[pin] || {};
        examenesMap[pin] = {
          pin: pin,
          nombre: cfg.nombre || '(examen sin nombre)',
          modulo: modulo,
          grupo: cfg.grupo || r.grupo || '',
          evaluacion: cfg.evaluacion || r.evaluacion || '',
          fecha_creacion: cfg.fecha || null,
          intentos: []
        };
      }
      examenesMap[pin].intentos.push({
        fecha: r.fecha ? r.fecha.toISOString() : null,
        correo: r.correo, nombre: r.nombre, grupo: r.grupo,
        nota: r.nota
      });
    }
    simplesEx.forEach(r => pushExamen_(r, 'Sintaxis simple'));
    comp.forEach(r => { if (String(r.modo).toLowerCase() === 'examen') pushExamen_(r, 'Oración compuesta'); });

    const examenes = Object.keys(examenesMap).map(pin => {
      const ex = examenesMap[pin];
      const notas = ex.intentos.map(i => i.nota).filter(n => !isNaN(n));
      const aprob = notas.filter(n => n >= 5).length;
      return {
        pin: ex.pin, nombre: ex.nombre, modulo: ex.modulo,
        grupo: ex.grupo, evaluacion: ex.evaluacion,
        fecha_creacion: ex.fecha_creacion,
        intentos: ex.intentos.length,
        media: media_(notas),
        aprobados: aprob,
        pct_aprobados: notas.length ? Math.round((aprob / notas.length) * 100) : 0,
        alumnos: ex.intentos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'))
      };
    }).sort((a, b) => (a.fecha_creacion || '').toString().localeCompare((b.fecha_creacion || '').toString()));

    // ── 10. Respuesta final ─────────────────────────────────────────────
    return {
      ok: true,
      fecha_generacion: new Date().toISOString(),
      rango: {
        desde: from.toISOString().slice(0, 10),
        hasta: to.toISOString().slice(0, 10)
      },
      filtros_aplicados: { grupo: grupoFilter, tipo: tipoFilter },
      resumen: {
        total_alumnos: alumnos.length,
        total_actividades: totalActividades,
        nota_media: media_(todasLasNotas),
        aprobados: aprobadosGlobal,
        pct_aprobados: todasLasNotas.length ? Math.round((aprobadosGlobal / todasLasNotas.length) * 100) : 0,
        grupos: gruposArr.map(g => ({
          nombre: g.nombre,
          alumnos: g.alumnos,
          actividades: g.actividades,
          nota_media: g.nota_media,
          pct_aprobados: g.pct_aprobados
        }))
      },
      alumnos: alumnos,
      por_grupo: gruposArr,
      diagnostico_global: {
        errores_top: diagnosticoGlobal,
        recomendacion: construirRecomendacion_(diagnosticoGlobal)
      },
      detalle: detalle,
      examenes: examenes
    };
  } catch (err) {
    return gasError_(err.message, ERR.EXCEPTION);
  }
}

// ── Helpers de §11 ─────────────────────────────────────────────────────

// Parsea YYYY-MM-DD a Date. Si endOfDay=true, fija 23:59:59.
function parseFechaParam_(str, fallback, endOfDay) {
  if (!str) {
    const f = new Date(fallback.getTime());
    if (endOfDay) { f.setHours(23, 59, 59, 999); } else { f.setHours(0, 0, 0, 0); }
    return f;
  }
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const f = new Date(fallback.getTime());
    if (endOfDay) { f.setHours(23, 59, 59, 999); } else { f.setHours(0, 0, 0, 0); }
    return f;
  }
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  if (endOfDay) d.setHours(23, 59, 59, 999); else d.setHours(0, 0, 0, 0);
  return d;
}

// Media aritmética con 1 decimal. Devuelve null si array vacío.
function media_(arr) {
  if (!arr || !arr.length) return null;
  const validos = arr.filter(n => n !== null && n !== undefined && !isNaN(n));
  if (!validos.length) return null;
  const sum = validos.reduce((s, n) => s + n, 0);
  return Math.round((sum / validos.length) * 10) / 10;
}

// Convierte una celda "Fecha" de Sheets (Date o string ISO) a Date.
function _fechaCelda(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function _enRango(fecha, from, to) {
  if (!fecha) return false;
  return fecha >= from && fecha <= to;
}

function leerSimplesExamen_(ss, from, to, grupoFilter) {
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const out = [];
  data.forEach(row => {
    const fecha = _fechaCelda(row[col['Fecha']]);
    if (!_enRango(fecha, from, to)) return;
    const grupo = String(row[col['Grupo']] || '').trim();
    if (grupoFilter && grupo !== grupoFilter) return;
    out.push({
      fecha:      fecha,
      correo:     String(row[col['Correo']] || '').trim().toLowerCase(),
      nombre:     String(row[col['Nombre']] || '').trim(),
      grupo:      grupo,
      evaluacion: String(row[col['Evaluacion']] || '').trim(),
      examen:     String(row[col['Examen']] || '').trim(),
      pin:        String(row[col['PIN']] || '').trim(),
      nota:       parseFloat(row[col['Nota']]) || 0
    });
  });
  return out;
}

function leerSimplesPractica_(ss, from, to, grupoFilter) {
  const sheet = ss.getSheetByName(SHEET_SESIONES);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const out = [];
  data.forEach(row => {
    const fecha = _fechaCelda(row[col['Fecha']]);
    if (!_enRango(fecha, from, to)) return;
    const grupo = String(row[col['Grupo']] || '').trim();
    if (grupoFilter && grupo !== grupoFilter) return;
    out.push({
      fecha:           fecha,
      correo:          String(row[col['Correo']] || '').trim().toLowerCase(),
      nombre:          String(row[col['Nombre']] || '').trim(),
      grupo:           grupo,
      modulo:          String(row[col['Modulo']] || '').trim(),
      subfase:         String(row[col['Subfase']] || '').trim(),
      oracionesHechas: parseInt(row[col['Oraciones_Hechas']]) || 0,
      nota:            parseFloat(row[col['Nota_Estimada']]) || 0,
      tiempoMin:       parseInt(row[col['Tiempo_Min']]) || 0,
      errCD:           parseInt(row[col['Err_CD']])   || 0,
      errCI:           parseInt(row[col['Err_CI']])   || 0,
      errAtr:          parseInt(row[col['Err_Atr']])  || 0,
      errCPvo:         parseInt(row[col['Err_CPvo']]) || 0,
      errCReg:         parseInt(row[col['Err_CReg']]) || 0,
      errCC:           parseInt(row[col['Err_CC']])   || 0
    });
  });
  return out;
}

function leerCompuestasRes_(ss, from, to, grupoFilter) {
  const sheet = ss.getSheetByName('Compuestas_Resultados');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const out = [];
  data.forEach(row => {
    const fecha = _fechaCelda(row[col['Fecha']]);
    if (!_enRango(fecha, from, to)) return;
    const grupo = String(row[col['Grupo']] || '').trim();
    if (grupoFilter && grupo !== grupoFilter) return;
    out.push({
      fecha:           fecha,
      correo:          String(row[col['Correo']] || '').trim().toLowerCase(),
      nombre:          String(row[col['Nombre']] || '').trim(),
      grupo:           grupo,
      evaluacion:      String(row[col['Evaluacion']] || '').trim(),
      pin:             String(row[col['PIN']] || '').trim(),
      modo:            String(row[col['Modo']] || '').trim(),
      totalEjercicios: parseInt(row[col['Total_Ejercicios']]) || 0,
      completados:     parseInt(row[col['Completados']])      || 0,
      nota:            parseFloat(row[col['Nota']]) || 0
    });
  });
  return out;
}

function leerExamenesConfig_(ss) {
  const sheet = ss.getSheetByName(SHEET_EXAMS);
  if (!sheet) return {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const col = getColMap_(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const map = {};
  data.forEach(row => {
    const pin = String(row[col['PIN']] || '').trim();
    if (!pin) return;
    map[pin] = {
      nombre:     col['Nombre_Examen'] !== undefined ? String(row[col['Nombre_Examen']] || '').trim() : '',
      grupo:      col['Grupo']         !== undefined ? String(row[col['Grupo']] || '').trim() : '',
      evaluacion: col['Evaluacion']    !== undefined ? String(row[col['Evaluacion']] || '').trim() : '',
      fecha:      col['Fecha']         !== undefined ? _fechaCelda(row[col['Fecha']]) : null
    };
  });
  return map;
}

function construirRecomendacion_(diagnostico) {
  if (!diagnostico || !diagnostico.length) return 'Sin datos suficientes para una recomendación pedagógica.';
  const top3 = diagnostico.slice(0, 3).map(d => d.funcion);
  if (top3.length === 1) {
    return 'El error más frecuente del grupo es en «' + top3[0] + '». Conviene reforzarlo antes de avanzar.';
  }
  return 'Los errores más frecuentes son en «' + top3.slice(0, -1).join('», «') + '» y «' + top3[top3.length - 1] + '». '
       + 'Conviene dedicar una sesión específica a estas funciones antes de avanzar al siguiente tema.';
}

