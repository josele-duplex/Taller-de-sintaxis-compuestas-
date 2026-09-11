// Genera los bancos de datos de la versión ligera (data/banco-*.json).
// Fase 1 del plan técnico (Plan_Estrategico_Web.md §11.8): congelar en JSON
// estático lo que hoy sirve el backend, para que la app funcione sin él.
//
// Por ahora solo compuestas (arranque por Chispa, decisión 11-sep-2026).
// Cuando se haga simples/morfología, este script gana una sección más —
// mismo patrón, mismo archivo.
//
// Uso: node build-banco-json.js

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DATA_DIR = path.join(DIR, 'data');

function leerTSV(ruta) {
  const raw = fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '');
  const lineas = raw.split(/\r?\n/).filter(l => l.length > 0);
  const header = lineas[0].split('\t');
  return lineas.slice(1).map(l => {
    const cols = l.split('\t');
    const fila = {};
    header.forEach((h, i) => fila[h] = cols[i] ?? '');
    return fila;
  });
}

function leerIdsMarcados(rutaCSV) {
  const raw = fs.readFileSync(rutaCSV, 'utf8').replace(/^﻿/, '');
  const lineas = []; let campo = '', fila = [], enComillas = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (enComillas) { if (c === '"') { if (raw[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; } else campo += c; }
    else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\r') { /* ignora */ }
    else if (c === '\n') { fila.push(campo); lineas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo.length || fila.length) { fila.push(campo); lineas.push(fila); }
  const header = lineas[0];
  const iId = header.indexOf('id'), iInc = header.indexOf('INCLUIR');
  const ids = new Set();
  lineas.slice(1).forEach(f => { if ((f[iInc] || '').trim() !== '') ids.add(f[iId]); });
  return ids;
}

// ── Compuestas ───────────────────────────────────────────────────────────
// El servidor (Compuestas.gs, readCompBancoFromSheet_ + stripInternalMeta_)
// no transforma el contenido: solo hace JSON.parse(JSON_Compuesta) y lo sirve
// tal cual, con metaclaves _tipo_oracion etc. añadidas y luego quitadas antes
// de responder. Aquí replicamos exactamente ese resultado final: un array de
// objetos JSON_Compuesta puros, sin metaclaves, en el mismo formato exacto
// que ya consumen chispa/index.js y compuestas/index.js.
function generarBancoCompuestas() {
  const idsMarcados = leerIdsMarcados(path.join(DIR, 'Seleccion_Compuestas_Light.csv'));
  const filas = leerTSV(path.join(DIR, 'banco_export', 'Compuestas_Banco.tsv'));

  const ejercicios = [];
  const errores = [];
  filas.forEach(r => {
    if (!idsMarcados.has(r.ID)) return;
    if (r.Activo !== 'Sí') { errores.push(r.ID + ': marcada pero no Activa en el TSV'); return; }
    try {
      ejercicios.push(JSON.parse(r.JSON_Compuesta));
    } catch (e) {
      errores.push(r.ID + ': JSON_Compuesta no parsea (' + e.message + ')');
    }
  });

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const destino = path.join(DATA_DIR, 'banco-compuestas.json');
  fs.writeFileSync(destino, JSON.stringify(ejercicios), 'utf8');

  return { destino, total: ejercicios.length, esperados: idsMarcados.size, errores };
}

// ── Simples ──────────────────────────────────────────────────────────────
// Port literal de Server/Code_v6.gs: buildOracionObject() y sus ayudantes
// (líneas 264-914 y 4529-4568 del original, 11-sep-2026). El servidor SÍ
// transforma el contenido aquí (a diferencia de compuestas): convierte la
// fila del Sheet en el objeto {fase1,fase2,fase3,fase4} que consume el
// motor. Replicar esa lógica es la única forma de que la versión ligera
// vea las mismas oraciones exactamente igual que la versión con backend.

const FUNC_NORMALIZATION = {
  'Modificador Oracional': 'Mod.Or.', 'Mod. Oracional': 'Mod.Or.',
  'Mod. Orac.': 'Mod.Or.', 'Mod.Orac.': 'Mod.Or.', 'Vocativo': 'Vocat.',
  'Complemento Agente': 'C.Ag.', 'C.Agente': 'C.Ag.', 'C. Agente': 'C.Ag.', 'C.Ag': 'C.Ag.',
  'Complemento de Régimen': 'C.Rég.', 'C. Régimen': 'C.Rég.', 'C.Reg.': 'C.Rég.', 'C.Reg': 'C.Rég.', 'C.Rég': 'C.Rég.',
  'Complemento Directo': 'CD', 'Complemento Indirecto': 'CI',
  'Atributo': 'Atr.', 'Atr': 'Atr.',
  'Complemento Predicativo': 'CPvo', 'C. Predicativo': 'CPvo',
  'Marca de Pasiva Refleja': 'Marca.Pas.Ref.', 'Marca.Pasiva.Ref.': 'Marca.Pas.Ref.', 'Marca.Pas.Ref': 'Marca.Pas.Ref.',
  'Marca de Impersonalidad': 'Marca.Imp.', 'Marca.Imp': 'Marca.Imp.',
  'CC Procedencia': 'CC Lugar', 'CC Lugar/Origen': 'CC Lugar', 'CC Lugar/Modo': 'CC Lugar', 'CC Tiempo/Modo': 'CC Tiempo',
  'CC': 'CC Modo',
  'Aposición': null, 'Dat.Et.': null,
  'N (V. Pronominal)': 'Marca.Pron.', 'N (V. Pasivo)': 'Marca.Pas.Ref.',
};

const NORM_FUNC_ORAC = {
  'C.Agente':'C.Ag.', 'Complemento Agente':'C.Ag.', 'C. Agente':'C.Ag.',
  'Complemento Directo':'CD', 'Complemento Indirecto':'CI',
  'Complemento de Régimen':'C.Rég.', 'C. Régimen':'C.Rég.',
  'Complemento Predicativo':'CPvo', 'C. Predicativo':'CPvo',
  'Atributo':'Atr.', 'Marca de Pasiva Refleja':'Marca.Pas.Ref.',
  'Marca de Impersonalidad':'Marca.Imp.', 'Marca.Pasiva.Ref.':'Marca.Pas.Ref.',
  'Marca.Pas.Ref':'Marca.Pas.Ref.', 'Marca.Imp':'Marca.Imp.',
  'C.Rég':'C.Rég.', 'C.Reg.':'C.Rég.', 'C.Reg':'C.Rég.', 'C.Ag':'C.Ag.', 'Atr':'Atr.',
  'Modificador Oracional':'Mod.Or.', 'Mod. Oracional':'Mod.Or.', 'Vocativo':'Vocat.',
  'CC Procedencia':'CC Lugar', 'CC Lugar/Origen':'CC Lugar',
  'CC Fin.':'CC Finalidad', 'CC Final':'CC Finalidad', 'CC Medio':'CC Instrumento',
  'CI (Dat. Ético)':'Dativo', 'CI (Dat. Etico)':'Dativo', 'Dat. Ético':'Dativo',
  'Dativo Ético':'Dativo', 'Dat. Interés':'Dativo', 'Dativo de Interés':'Dativo',
  'CPred':'CPvo', 'CRég':'C.Rég.', 'CRég.':'C.Rég.',
  'Atributo Locativo':'Atr. Loc.', 'Atr.Loc.':'Atr. Loc.', 'CC Beneficiario':'CC Benef.',
  'Morf. Verbal':'Marca.Pron.', 'Morf. Pronominal':'Marca.Pron.',
  'N (V. Pronominal)':'Marca.Pron.', 'N (V. Pasivo)':'Marca.Pas.Ref.',
};
function normalizeFuncOrac(f) { return NORM_FUNC_ORAC[f] || f; }

function normalizeSintagma_(s) {
  const map = {
    'SPrep': 'SP', 'S.Prep': 'SP', 'S. Prep.': 'SP',
    'S.Verbal': 'SV', 'S. Verbal': 'SV',
    'S.Nominal': 'SN', 'S. Nominal': 'SN',
    'Sujeto/Morfema': 'SN', 'Morfema': 'SN',
    'SAdv/SP': 'SAdv',
  };
  return map[s] || s;
}

function safeParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  let parsed = null;
  try { parsed = JSON.parse(s); } catch (e1) {}
  if (parsed === null) {
    for (let trim = 1; trim <= 4; trim++) {
      try { parsed = JSON.parse(s.slice(0, -trim)); break; } catch (e) {}
    }
  }
  if (parsed === null && s.startsWith('{') && s.includes('}{')) {
    try { parsed = JSON.parse('[' + s.replace(/\}\s*\{/g, '},{') + ']'); } catch (e) {}
  }
  if (parsed === null) return null;
  if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
    if (parsed.función !== undefined || parsed.segmento !== undefined) parsed = [parsed];
  }
  return parsed;
}

const ENCLITICOS_ = [
  'noslo','nosla','noslos','noslas', 'melo','mela','melos','melas',
  'telo','tela','telos','telas', 'selo','sela','selos','selas', 'sele','seles',
  'me','te','se','lo','la','los','las','le','les','nos','os',
];

function pareceRaizVerbal_(raiz) {
  if (raiz.length < 2) return false;
  if (/[aeiou]d$/i.test(raiz)) return true;
  if (raiz.length >= 3 && /[aeiouáéíóú]$/i.test(raiz)) return true;
  if (/(ar|er|ir)$/i.test(raiz)) return true;
  if (/ndo$/i.test(raiz)) return true;
  return false;
}

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
    } else {
      if (!pareceRaizVerbal_(raiz)) continue;
    }
    const raizCap = limpio.charAt(0) === limpio.charAt(0).toUpperCase()
      ? limpio.charAt(0).toUpperCase() + raiz.slice(1).toLowerCase()
      : raiz.toLowerCase();
    const trailingPunct = (token.match(/[.,;:!?¡¿]+$/) || [''])[0];
    return [raizCap, enc + trailingPunct];
  }
  return null;
}

function splitEncliticosEnPalabras_(palabras, verbosBase) {
  const out = [];
  for (const tok of palabras) {
    const split = intentarSepararEnclitico_(tok, verbosBase);
    if (split) out.push(split[0], split[1]);
    else out.push(tok);
  }
  return out;
}

function findIndices(palabras, tokens) {
  if (!tokens.length) return [];
  for (let start = 0; start <= palabras.length - tokens.length; start++) {
    let match = true;
    for (let j = 0; j < tokens.length; j++) {
      if (palabras[start + j].toLowerCase() !== tokens[j].toLowerCase()) { match = false; break; }
    }
    if (match) return tokens.map((_, j) => start + j);
  }
  return [];
}

function extractPronoun(sujeto) {
  const s = sujeto.toLowerCase();
  if (s.includes('yo')) return 'yo';
  if (s.includes('tú') || s.includes('tu')) return 'tú';
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
    'CD': '¿Puedes sustituir este bloque por lo/la/los/las? Si es así, es CD.',
    'CI': '¿Puedes sustituir este bloque por le/les? ¿Es el destinatario de la acción?',
    'CC': '¿Puede suprimirse o desplazarse este elemento sin que la oración pierda su estructura básica?',
    'Atr.': '¿Concuerda con el sujeto a través de un verbo copulativo (ser/estar/parecer)?',
    'CPvo': '¿Concuerda con el sujeto o el CD mientras el verbo tiene significado pleno?',
    'C.Rég.': '¿La preposición está seleccionada por el verbo? ¿Puede eliminarse?',
    'C.Ag.': '¿Introduce al agente en una construcción pasiva? ¿Lleva la preposición "por"?',
  };
  for (const key in consejos) { if (func.includes(key)) return consejos[key]; }
  return 'Analiza la función sintáctica de este bloque en el predicado.';
}

function normalizeFuncSint(f) {
  const map = {
    'T': 'T', 'T (SN)': 'T', 'T (SP)': 'T', 'T (SAdj)': 'T', 'T (SAdv)': 'T',
    'SN/T': 'SN/T', 'SAdj/T': 'SAdj/T', 'SAdv/T': 'SAdv/T', 'SP/T': 'SP/T',
    'CN': 'SPrep/CN', 'CN (SP)': 'SPrep/CN', 'CN (SN)': 'SN/CN', 'CN (SAdj)': 'SAdj/CN',
    'SN/CN': 'SN/CN', 'SAdj/CN': 'SAdj/CN', 'SPrep/CN': 'SPrep/CN',
    'Mod/Det': 'Mod/Det.', 'Mod/Det.': 'Mod/Det.',
    'Mod/Cuant': 'Mod/Cuant.', 'Mod/Cuant.': 'Mod/Cuant.',
    'Mod.': 'Mod.', 'Mod': 'Mod.', 'Mod/Adj.': 'Mod/Adj.',
    'N': 'N', 'N (de la prep.)': 'N (enlace)', 'N (enlace)': 'N (enlace)',
    'CAdj': 'CAdj', 'CAdv': 'CAdv', 'Nexo': 'Nexo', 'Aposición': 'Aposición',
  };
  return map[f] || f;
}

function generarConsejoSint(func) {
  const c = {
    'N': '¿Cuál es el elemento central del sintagma que puede aparecer solo?',
    'N (enlace)': 'Según la NGLE, la preposición es el Núcleo del SP.',
    'T': '¿Qué sintagma completa o satura el significado de la preposición?',
    'SN/T': 'El Término es un sintagma nominal que completa a la preposición.',
    'SAdj/T': 'El Término es un sintagma adjetival que completa a la preposición.',
    'SAdv/T': 'El Término es un sintagma adverbial que completa a la preposición.',
    'SP/T': 'El Término es un sintagma preposicional que completa a la preposición.',
    'Mod/Det.': '¿Actualiza o delimita al sustantivo? (artículos, demostrativos, posesivos)',
    'Mod/Cuant.': '¿Cuantifica o gradúa al sustantivo? (mucho, poco, varios…)',
    'Mod.': '¿Modifica al núcleo del sintagma? (adverbios de grado, etc.)',
    'SPrep/CN': '¿Es un SP que modifica directamente al nombre núcleo del SN?',
    'SAdj/CN': '¿Es un adjetivo o sintagma adjetival que complementa al nombre núcleo?',
    'SN/CN': '¿Es un sintagma nominal que complementa al nombre? (aposición u otro SN)',
    'CAdj': '¿Complementa al adjetivo núcleo del sintagma adjetival?',
    'CAdv': '¿Complementa al adverbio núcleo del sintagma adverbial?',
    'Nexo': '¿Enlaza elementos coordinados dentro del sintagma?',
    'Aposición': '¿Es un SN que se adjunta al núcleo nominal sin preposición?',
  };
  return c[normalizeFuncSint(func)] || 'Analiza la función de este elemento dentro del sintagma.';
}

function buildSintagma(bloque, rowIndex, i) {
  if (!bloque.estructura || typeof bloque.estructura !== 'object') return null;
  const elementos = [];
  let elemIdx = 0;
  const isSP = String(bloque.sintagma || '').startsWith('SP');
  let prepDone = false;

  function walk(obj) {
    for (const key in obj) {
      const val = obj[key];
      const id = 'e' + rowIndex + '_' + i + '_' + elemIdx++;
      if (typeof val === 'string') {
        let solucion = val;
        if (isSP && val === 'N' && !prepDone) { solucion = 'N (enlace)'; prepDone = true; }
        elementos.push({ id, texto: key, solucion: normalizeFuncSint(solucion), consejo: generarConsejoSint(solucion) });
      } else if (typeof val === 'object' && val !== null) {
        const innerKeys = Object.keys(val);
        if (innerKeys.length === 1) {
          const innerKey = innerKeys[0];
          const funcLabel = innerKey.replace(' (SN)', '').replace(' (SP)', '').replace(' (SAdj)', '').replace(' (SAdv)', '');
          const isRecognized = /^(T|CN|Mod|CAdj|CAdv|Nexo|Apos|N\b)/.test(funcLabel) || /\/(T|CN|Mod)/.test(funcLabel);
          if (isRecognized) {
            elementos.push({ id, texto: key, solucion: normalizeFuncSint(funcLabel), consejo: generarConsejoSint(funcLabel) });
          }
          if (typeof val[innerKey] === 'object') {
            const innerLeaves = Object.keys(val[innerKey]);
            const isSingleWord = innerLeaves.length === 1 && typeof val[innerKey][innerLeaves[0]] === 'string';
            if (!isSingleWord) walk(val[innerKey]);
          }
        }
      }
    }
  }

  walk(bloque.estructura);
  if (elementos.length === 0) return null;
  return { id: 's' + rowIndex + '_' + i, titulo: bloque.sintagma + ' ' + bloque.función + ' — "' + bloque.segmento + '"', elementos };
}

function _analizarDificultadOracion_(o) {
  const bloques = (o.fase3 && o.fase3.bloques) || [];
  const funcs = bloques.map(b => (b.solucion || '').split(' | ')[1] || '')
    .filter(f => f && f !== 'NP' && f !== 'Sujeto' && f !== 'Sujeto tácito');
  const tipoVerbo = (o.fase1 && o.fase1.tipo_verbo_categoria) || 'SIMPLE';
  const tieneCAg = funcs.includes('C.Ag.');
  const npDificil = (tipoVerbo === 'PERIFRASIS') || tieneCAg;
  const sujTacito = !!(o.fase2 && o.fase2.sujeto_tacito);
  const sujImpersonal = !!(o.fase2 && o.fase2.sin_sujeto);
  const sujIndices = (o.fase2 && o.fase2.sujeto_indices) || [];
  const npIndices = (o.fase1 && o.fase1.nucleo_predicado_indices) || [];
  const sujPospuesto = sujIndices.length > 0 && npIndices.length > 0 && sujIndices[0] > npIndices[0];
  const sujetoDificil = sujTacito || sujImpersonal || sujPospuesto;
  const subfaseMinima = sujetoDificil ? 'completo' : (npDificil ? 'np_sujeto' : 'solo_np');
  const FUNC_PESO_DIFICULTAD = { 'CPvo': 2, 'Marca.Pas.Ref.': 2, 'C.Ag.': 2 };
  const PRONOMBRES_CD_CI = ['lo','la','los','las','le','les','me','te','nos','os','se'];
  const palabras = o.palabras || [];
  let puntos = 0;
  bloques.forEach(b => {
    const func = (b.solucion || '').split(' | ')[1] || '';
    if (!func || func === 'NP' || func === 'Sujeto' || func === 'Sujeto tácito') return;
    const idxs = b.indices || [];
    const esPronombre = (func === 'CD' || func === 'CI') && idxs.length === 1 &&
      PRONOMBRES_CD_CI.includes(String(palabras[idxs[0]] || '').toLowerCase());
    puntos += esPronombre ? 2 : (FUNC_PESO_DIFICULTAD[func] || 1);
  });
  const dificultad = puntos <= 1 ? 1 : puntos <= 3 ? 2 : puntos <= 5 ? 3 : 4;
  return { npDificil, sujetoDificil, subfaseMinima, puntosDificultad: puntos, dificultad };
}

function buildOracionObject(row, rowIndex) {
  const texto = (row.Oracion_Texto || '').trim();
  const sujeto = (row.Sujeto || '').trim();
  const verbo = (row.Verbo || '').trim();
  const tipo = (row['Tipo de Sujeto'] || '').trim();
  const rawJson = row.Estructura_JSON || '';
  const rawTags = row['Columna 1'] || '{}';
  if (!texto) return null;

  const estructura = safeParseJSON(rawJson);
  let tagsFuncs = [];
  try { tagsFuncs = JSON.parse(rawTags).funciones_presentes || []; } catch (e) { tagsFuncs = []; }
  if (tagsFuncs.length > 0) {
    const seen = {}; const normalized = [];
    for (const f of tagsFuncs) {
      let canonical = f;
      if (FUNC_NORMALIZATION.hasOwnProperty(f)) {
        canonical = FUNC_NORMALIZATION[f];
        if (canonical === null) continue;
      }
      if (!seen[canonical]) { seen[canonical] = true; normalized.push(canonical); }
    }
    tagsFuncs = normalized;
  }
  const bloquesRaw = estructura ? (Array.isArray(estructura) ? estructura : [estructura]) : [];

  let palabras = texto.replace(/([.,;:!?¡¿])/g, ' $1 ').split(/\s+/).filter(Boolean);

  function _resolverVerbIndices() {
    let verbTokens = (verbo || '').replace(/([.,;:!?¡¿])/g, ' $1 ').split(/\s+/).filter(Boolean);
    let idx = findIndices(palabras, verbTokens);
    if (idx.length > 0) return { palabras, verbTokens, verbIndices: idx };
    const verbTokensSplit = splitEncliticosEnPalabras_(verbTokens, null);
    if (JSON.stringify(verbTokensSplit) !== JSON.stringify(verbTokens)) {
      idx = findIndices(palabras, verbTokensSplit);
      if (idx.length > 0) return { palabras, verbTokens: verbTokensSplit, verbIndices: idx };
    }
    const palabrasSplit = splitEncliticosEnPalabras_(palabras, verbTokensSplit);
    if (JSON.stringify(palabrasSplit) !== JSON.stringify(palabras)) {
      idx = findIndices(palabrasSplit, verbTokensSplit);
      if (idx.length > 0) return { palabras: palabrasSplit, verbTokens: verbTokensSplit, verbIndices: idx };
    }
    {
      const idxNoContiguo = []; let desde = 0; let ok = true;
      for (const tk of verbTokens) {
        let encontrado = -1;
        for (let i = desde; i < palabras.length; i++) {
          if (palabras[i].toLowerCase() === tk.toLowerCase()) { encontrado = i; break; }
        }
        if (encontrado === -1) { ok = false; break; }
        idxNoContiguo.push(encontrado); desde = encontrado + 1;
      }
      if (ok && idxNoContiguo.length > 0) return { palabras, verbTokens, verbIndices: idxNoContiguo };
    }
    return { palabras, verbTokens, verbIndices: [] };
  }
  const _resolved = _resolverVerbIndices();
  palabras = _resolved.palabras;

  const sujetoLower = sujeto.toLowerCase();
  const esTacito = sujetoLower.includes('s.o.') || sujetoLower.includes('sujeto omitido');
  const esImpersonal = sujetoLower === '---' || sujetoLower === '' || sujetoLower === 'impersonal';

  bloquesRaw.forEach(b => { if (b && typeof b === 'object' && 'segment' in b && !('segmento' in b)) b.segmento = b.segment; });

  const fase3BloquesPre = bloquesRaw
    .filter(b => b && b.segmento && b.función && b.sintagma)
    .map((b, i) => {
      const segmento = String(b.segmento);
      const func = String(b.función).trim();
      const sint = normalizeSintagma_(String(b.sintagma));
      const segTokens = segmento.replace(/([.,;:!?¡¿])/g, ' $1 ').split(/\s+/).filter(Boolean);
      const indices = findIndices(palabras, segTokens);
      const normFunc = normalizeFuncOrac(func);
      return { id: 'b' + rowIndex + '_' + i, indices, solucion: sint + ' | ' + normFunc, consejo: b.consejo || generarConsejo(normFunc), naturaleza: b.naturaleza || '' };
    })
    .filter(b => {
      if (!b.indices || b.indices.length === 0) return true;
      const verbSet = _resolved.verbIndices || [];
      if (verbSet.length === 0) return true;
      return !b.indices.every(ix => verbSet.indexOf(ix) !== -1);
    });

  const verbTokens = _resolved.verbTokens;
  const verbIndices = _resolved.verbIndices;

  let sujetoIndices = [];
  if (!esTacito && !esImpersonal && sujeto) {
    const sujTokens = sujeto.replace(/([.,;:!?¡¿])/g, ' $1 ').split(/\s+/).filter(Boolean);
    sujetoIndices = findIndices(palabras, sujTokens);
  }

  const allBloques = [];
  if (verbIndices.length > 0) allBloques.push({ id: 'b'+rowIndex+'_np', indices: verbIndices, solucion: 'SV | NP', consejo: '' });
  if (esTacito) {
    allBloques.push({ id: 'b'+rowIndex+'_suj', indices: [], solucion: 'Ø | Sujeto tácito', consejo: '', tacito: true, pronoun: extractPronoun(sujeto) });
  } else if (esImpersonal) {
    // sin bloque de sujeto
  } else if (sujetoIndices.length > 0) {
    allBloques.push({ id: 'b'+rowIndex+'_suj', indices: sujetoIndices, solucion: 'SN | Sujeto', consejo: '' });
  }
  allBloques.push(...fase3BloquesPre.filter(b => {
    const f = b.solucion.split(' | ')[1] || '';
    return f !== 'NP' && f !== 'Sujeto' && f !== 'Sujeto tácito' && !f.startsWith('N (');
  }));

  const fase4Sintagmas = bloquesRaw
    .filter(b => b && b.estructura && b.segmento && b.sintagma)
    .map((b, i) => buildSintagma(b, rowIndex, i))
    .filter(Boolean);

  const result = {
    id: rowIndex,
    oracion_completa: texto,
    palabras,
    funciones_presentes: tagsFuncs,
    fase1: {
      nucleo_predicado_indices: verbIndices,
      tipo_verbo_categoria: detectarTipoVerbo(verbo),
      consejo: 'Identifica el verbo conjugado. ¿Con qué persona y número concuerda con el sujeto?',
    },
    fase2: {
      sujeto_indices: sujetoIndices,
      sujeto_tacito: esTacito,
      sin_sujeto: esImpersonal,
      nucleo_tacito: esTacito ? extractPronoun(sujeto) : '',
      consejo: 'Fíjate en la concordancia entre el verbo y el grupo nominal sujeto.',
    },
    fase3: {
      tipo_predicado: tipo.includes('Semicopulativo') ? 'PNS' : (tipo.includes('Nominal') ? 'PN' : 'PV'),
      bloques: allBloques,
    },
    fase4: fase4Sintagmas.length > 0 ? { sintagmas: fase4Sintagmas } : null,
  };
  const _an = _analizarDificultadOracion_(result);
  result.subfase_minima = _an.subfaseMinima;
  result.dificultad_dinamica = _an.dificultad;
  return result;
}

function generarBancoSimples() {
  const idsMarcados = leerIdsMarcados(path.join(DIR, 'Seleccion_Simple_Light.csv'));
  const filas = leerTSV(path.join(DIR, 'banco_export', 'Oraciones_Banco.tsv'));

  const oraciones = [];
  const errores = [];
  filas.forEach((r, i) => {
    const filaSheet = i + 2; // la fila 1 del TSV es la cabecera
    const id = 'S' + String(filaSheet).padStart(3, '0');
    if (!idsMarcados.has(id)) return;
    if (r.Activo !== 'Sí') { errores.push(id + ': marcada pero no Activa en el TSV'); return; }
    try {
      const obj = buildOracionObject(r, filaSheet);
      if (!obj) { errores.push(id + ': sin texto, descartada'); return; }
      oraciones.push(obj);
    } catch (e) {
      errores.push(id + ': error construyendo el objeto (' + e.message + ')');
    }
  });

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const destino = path.join(DATA_DIR, 'banco-simple.json');
  fs.writeFileSync(destino, JSON.stringify({ oraciones }), 'utf8');

  return { destino, total: oraciones.length, esperados: idsMarcados.size, errores };
}

// ── Ejecución ────────────────────────────────────────────────────────────

const rc = generarBancoCompuestas();
console.log('OK:', path.relative(DIR, rc.destino), '—', rc.total, 'ejercicios (' + rc.esperados, 'marcados en el CSV)');
if (rc.errores.length) { console.log('\nAVISOS (compuestas):'); rc.errores.forEach(e => console.log('  -', e)); }
if (rc.total !== rc.esperados) console.log('\n⚠ El total escrito no coincide con lo marcado (compuestas) — revisa los avisos.');

const rs = generarBancoSimples();
console.log('\nOK:', path.relative(DIR, rs.destino), '—', rs.total, 'oraciones (' + rs.esperados, 'marcadas en el CSV)');
if (rs.errores.length) { console.log('\nAVISOS (simples):'); rs.errores.forEach(e => console.log('  -', e)); }
if (rs.total !== rs.esperados) console.log('\n⚠ El total escrito no coincide con lo marcado (simples) — revisa los avisos.');
