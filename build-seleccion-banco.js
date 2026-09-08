// Generador de las hojas de selección manual para la versión ligera.
// Se ejecuta cuando haga falta: node build-seleccion-banco.js
// Lee los TSV de banco_export/ (Oraciones_Banco, Compuestas_Banco, Morfologia_Textos)
// y genera 3 CSV en UTF-8 con BOM (se abren con doble clic en Excel):
//   Seleccion_Simple_Light.csv, Seleccion_Compuestas_Light.csv, Seleccion_Morfologia_Light.csv
//
// El script NO decide qué entra en la versión ligera. Ordena las oraciones/textos
// de cada banco para que las primeras filas ya cubran, con el mínimo solapamiento,
// todo lo que hay que cubrir (funciones en simples, subtipos en compuestas,
// categorías gramaticales en morfología). Josele marca la columna INCLUIR a mano.
//
// Contexto y decisiones (Plan_Estrategico_Web.md §2.1.1, conversación 8/9-sep-2026):
// simples 150 · compuestas por topes de demanda real (~90-110) · morfología
// bolsa completa de activos, sin corte duro por posición en la hoja.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const BANCO_DIR = path.join(DIR, 'banco_export');

// ── Helpers genéricos ────────────────────────────────────────────────────

function leerTSV(nombre) {
  const raw = fs.readFileSync(path.join(BANCO_DIR, nombre), 'utf8').replace(/^﻿/, '');
  const lineas = raw.split(/\r?\n/).filter(l => l.length > 0);
  const header = lineas[0].split('\t');
  return lineas.slice(1).map((l, i) => {
    const cols = l.split('\t');
    const fila = {};
    header.forEach((h, j) => fila[h] = cols[j] ?? '');
    fila._filaSheet = i + 2; // la fila 1 del Sheet es la cabecera
    return fila;
  });
}

function normalizarTexto(t) {
  return String(t || '')
    .replace(/\s+([.,;:!?¡¿])/g, '$1') // "hola ," -> "hola,": compara igual la versión con tokens sueltos y la limpia
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function contarPalabras(t) {
  return String(t || '').trim().split(/\s+/).filter(Boolean).length;
}

function csvCampo(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function escribirCSV(nombre, columnas, filas) {
  const bom = '﻿';
  const cabecera = columnas.join(',');
  const cuerpo = filas.map(f => columnas.map(c => csvCampo(f[c])).join(',')).join('\r\n');
  fs.writeFileSync(path.join(DIR, nombre), bom + cabecera + '\r\n' + cuerpo + '\r\n', 'utf8');
  console.log('OK:', nombre, '(' + filas.length + ' filas)');
}

// Descarta duplicados por texto normalizado, conservando la primera aparición
// (mismo criterio que ya usa el menú "Eliminar oraciones duplicadas" del Sheet).
function quitarDuplicados(filas, campoTexto, campoId) {
  const vistos = new Map();
  const unicas = [];
  const duplicadas = [];
  filas.forEach(f => {
    const clave = normalizarTexto(f[campoTexto]);
    if (vistos.has(clave)) {
      duplicadas.push({ descartada: f[campoId] || ('fila ' + f._filaSheet), conservada: vistos.get(clave) });
    } else {
      vistos.set(clave, f[campoId] || ('fila ' + f._filaSheet));
      unicas.push(f);
    }
  });
  return { unicas, duplicadas };
}

// Orden por cobertura mínima (greedy set cover): en cada paso elige la oración
// que más claves NUEVAS aporta de las que aún faltan por cubrir; en empate,
// la que menos claves totales tiene (menos solapamiento) y luego la más corta.
// Cuando ya está todo cubierto, sigue rellenando por "rareza" (prioriza claves
// escasas en el conjunto) para que lo poco representado no quede al final.
function ordenarPorCobertura(items, clavesObjetivo) {
  const cubribles = new Set(clavesObjetivo.filter(k => items.some(o => o._claves.includes(k))));
  const cubiertas = new Set();
  const pool = items.slice();
  const ordenados = [];

  while (cubiertas.size < cubribles.size && pool.length) {
    let mejorIdx = -1, mejorNuevas = -1, mejorTotal = Infinity, mejorPalabras = Infinity;
    pool.forEach((o, i) => {
      const nuevas = o._claves.filter(k => cubribles.has(k) && !cubiertas.has(k)).length;
      const total = o._claves.length;
      const palabras = o.numPalabras || 0;
      const mejora =
        nuevas > mejorNuevas ||
        (nuevas === mejorNuevas && total < mejorTotal) ||
        (nuevas === mejorNuevas && total === mejorTotal && palabras < mejorPalabras);
      if (mejora) { mejorIdx = i; mejorNuevas = nuevas; mejorTotal = total; mejorPalabras = palabras; }
    });
    if (mejorNuevas <= 0) break;
    const [elegido] = pool.splice(mejorIdx, 1);
    elegido._claves.forEach(k => cubiertas.add(k));
    ordenados.push(elegido);
  }

  const corteCobertura = ordenados.length;

  const frecuencia = {};
  items.forEach(o => o._claves.forEach(k => frecuencia[k] = (frecuencia[k] || 0) + 1));
  pool.sort((a, b) => {
    const puntA = a._claves.reduce((s, k) => s + 1 / (frecuencia[k] || 1), 0);
    const puntB = b._claves.reduce((s, k) => s + 1 / (frecuencia[k] || 1), 0);
    if (puntB !== puntA) return puntB - puntA;
    if (a._claves.length !== b._claves.length) return a._claves.length - b._claves.length;
    return (a.numPalabras || 0) - (b.numPalabras || 0);
  });

  return { ordenados: ordenados.concat(pool), corteCobertura };
}

// Variante con topes por clave: sigue la cobertura mínima y luego, en vez de
// rellenar solo por rareza, prioriza las claves que aún no llegan a su tope
// (tabla `topes`) hasta que ninguna oración restante aporte ya nada por debajo
// de tope; el resto se añade al final por rareza, como material extra.
function ordenarConTopes(items, clavesObjetivo, topes) {
  const { ordenados: base, corteCobertura } = (() => {
    const cubribles = new Set(clavesObjetivo.filter(k => items.some(o => o._claves.includes(k))));
    const cubiertas = new Set();
    const pool = items.slice();
    const ordenados = [];
    while (cubiertas.size < cubribles.size && pool.length) {
      let mejorIdx = -1, mejorNuevas = -1, mejorTotal = Infinity, mejorPalabras = Infinity;
      pool.forEach((o, i) => {
        const nuevas = o._claves.filter(k => cubribles.has(k) && !cubiertas.has(k)).length;
        const total = o._claves.length;
        const palabras = o.numPalabras || 0;
        const mejora =
          nuevas > mejorNuevas ||
          (nuevas === mejorNuevas && total < mejorTotal) ||
          (nuevas === mejorNuevas && total === mejorTotal && palabras < mejorPalabras);
        if (mejora) { mejorIdx = i; mejorNuevas = nuevas; mejorTotal = total; mejorPalabras = palabras; }
      });
      if (mejorNuevas <= 0) break;
      const [elegido] = pool.splice(mejorIdx, 1);
      elegido._claves.forEach(k => cubiertas.add(k));
      ordenados.push(elegido);
    }
    return { ordenados, corteCobertura: ordenados.length, pool };
  })();

  const usados = {};
  base.forEach(o => o._claves.forEach(k => usados[k] = (usados[k] || 0) + 1));

  const pool = items.filter(o => !base.includes(o));
  const rellenoTopes = [];
  let cambio = true;
  while (cambio && pool.length) {
    cambio = false;
    let mejorIdx = -1, mejorValor = 0, mejorPalabras = Infinity;
    pool.forEach((o, i) => {
      const valor = o._claves.reduce((s, k) => s + Math.max(0, (topes[k] ?? Infinity) - (usados[k] || 0)), 0);
      const palabras = o.numPalabras || 0;
      if (valor > mejorValor || (valor === mejorValor && valor > 0 && palabras < mejorPalabras)) {
        mejorIdx = i; mejorValor = valor; mejorPalabras = palabras;
      }
    });
    if (mejorValor > 0) {
      const [elegido] = pool.splice(mejorIdx, 1);
      elegido._claves.forEach(k => usados[k] = (usados[k] || 0) + 1);
      rellenoTopes.push(elegido);
      cambio = true;
    }
  }

  const corteTopes = base.length + rellenoTopes.length;

  const frecuencia = {};
  items.forEach(o => o._claves.forEach(k => frecuencia[k] = (frecuencia[k] || 0) + 1));
  pool.sort((a, b) => {
    const puntA = a._claves.reduce((s, k) => s + 1 / (frecuencia[k] || 1), 0);
    const puntB = b._claves.reduce((s, k) => s + 1 / (frecuencia[k] || 1), 0);
    if (puntB !== puntA) return puntB - puntA;
    return (a.numPalabras || 0) - (b.numPalabras || 0);
  });

  return { ordenados: base.concat(rellenoTopes, pool), corteCobertura, corteTopes };
}

// ════════════════════════════════════════════════════════════════════════
// 1. ORACIÓN SIMPLE
// ════════════════════════════════════════════════════════════════════════

// Copiado de normalizeFuncOrac() en Server/Code_v6.gs — única fuente de verdad
// de la app. Si esa función cambia en el backend, actualizar esta tabla.
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
const normalizarFuncOrac = f => NORM_FUNC_ORAC[f] || f;

// FUNC_ORAC de js/glosario/tags.js, sin Sujeto/PN/PV/NP (estructurales, no
// funciones que el profesor marque en los filtros).
const FUNCIONES_CURRICULARES = [
  'CD','CI','Dativo','C.Rég.','Atr.','Atr. Loc.','CPvo',
  'CC Lugar','CC Tiempo','CC Modo','CC Causa','CC Cantidad','CC Compañía','CC Finalidad','CC Instrumento','CC Benef.',
  'C.Ag.','Mod.Or.','Conector','Vocat.','Marca.Imp.','Marca.Pas.Ref.','Marca.Pron.',
];

// Funciones que, pedagógicamente, exigen más al alumno (argumentos no
// prototípicos y marcas especiales) — suman a la dificultad estimada.
const PESO_DIFICULTAD_FUNC = {
  'C.Rég.': 2, 'C.Ag.': 2, 'CPvo': 1, 'Marca.Pas.Ref.': 1, 'Marca.Imp.': 1,
  'Mod.Or.': 1, 'Dativo': 1, 'Atr. Loc.': 1, 'Marca.Pron.': 1,
};

const TARGET_SIMPLES = 150;

function procesarSimples() {
  const activas = leerTSV('Oraciones_Banco.tsv').filter(r => r.Activo === 'Sí');
  const { unicas, duplicadas } = quitarDuplicados(activas, 'Oracion_Texto', 'Oracion_Texto');

  const procesadas = [];
  const sinJSON = [];
  unicas.forEach(r => {
    let bloques;
    try { bloques = JSON.parse(r.Estructura_JSON); }
    catch (e) { sinJSON.push('fila ' + r._filaSheet); return; }

    // Filtra a la lista curricular: un lote de pasivas/reflejas (filas ~181-232)
    // repite el Sujeto como bloque dentro del JSON, y eso no es una "función"
    // que el profesor marque en los filtros — es el mismo Sujeto de la columna B.
    const funciones = [...new Set((bloques || [])
      .map(b => normalizarFuncOrac(String(b['función'] || '').trim()))
      .filter(f => FUNCIONES_CURRICULARES.includes(f)))];
    const numPalabras = contarPalabras(r.Oracion_Texto);
    const numSintagmas = (bloques || []).length + (r.Sujeto && r.Sujeto.trim() ? 1 : 0);

    let dificultad = funciones.length;
    funciones.forEach(f => dificultad += PESO_DIFICULTAD_FUNC[f] || 0);
    dificultad += Math.floor(numPalabras / 8);
    dificultad = Math.min(5, Math.max(1, Math.round(dificultad / 2)));

    procesadas.push({
      id: 'S' + String(r._filaSheet).padStart(3, '0'),
      oracion: r.Oracion_Texto.trim(),
      funciones,
      numPalabras,
      numSintagmas,
      dificultad,
      _claves: funciones,
    });
  });

  const { ordenados, corteCobertura } = ordenarPorCobertura(procesadas, FUNCIONES_CURRICULARES);

  escribirCSV('Seleccion_Simple_Light.csv',
    ['id', 'Oración', 'Funciones', 'Nº de sintagmas', 'Nº de palabras', 'Dificultad (1-5)', 'INCLUIR'],
    ordenados.map(o => ({
      id: o.id,
      'Oración': o.oracion,
      'Funciones': o.funciones.join(' + '),
      'Nº de sintagmas': o.numSintagmas,
      'Nº de palabras': o.numPalabras,
      'Dificultad (1-5)': o.dificultad,
      'INCLUIR': '',
    })));

  const primeras = ordenados.slice(0, TARGET_SIMPLES);
  const totalPorFuncion = {}, primerasPorFuncion = {};
  FUNCIONES_CURRICULARES.forEach(f => { totalPorFuncion[f] = 0; primerasPorFuncion[f] = 0; });
  ordenados.forEach(o => o.funciones.forEach(f => totalPorFuncion[f]++));
  primeras.forEach(o => o.funciones.forEach(f => primerasPorFuncion[f]++));

  return { totalActivas: activas.length, totalUnicas: unicas.length, duplicadas, sinJSON, corteCobertura, totalPorFuncion, primerasPorFuncion };
}

// ════════════════════════════════════════════════════════════════════════
// 2. ORACIÓN COMPUESTA
// ════════════════════════════════════════════════════════════════════════

// Alias anteriores al schema 1.2 (conventions.md §8 y schema_compuesta_v1_2.md
// §7 "Errores frecuentes"): no son datos rotos, son nombres antiguos que
// equivalen a un subtipo cerrado actual.
const ALIAS_SUBTIPO = {
  'construccion_condicional': 'condicional', 'construccion_final': 'final',
  'construccion_causal': 'causal', 'construccion_concesiva': 'concesiva',
  'construccion_ilativa': 'ilativa_constr',
  'cc_temporal': 'temporal', 'cc_locativo': 'locativa',
  'cc_modal': 'modal', 'cc_comparativo': 'comparativa',
};
const normalizarSubtipo = s => ALIAS_SUBTIPO[s] || s;

// Decisión de Josele (9-sep-2026): estos 5 subtipos no se trabajan en PAU
// Murcia ni en la práctica de 4º ESO/Bachillerato. Quedan fuera de la
// cobertura objetivo — no cuentan como "hueco" aunque tengan 0 ejemplos.
const SUBTIPOS_APARCADOS = new Set(['distributiva', 'explicativa', 'locativa', 'modal', 'comparativa']);

// Lista cerrada de subtipos de coordinada/subordinada (conventions.md §8).
// Las yuxtapuestas no tienen subtipo en ese schema, pero el banco real usa
// valores propios (p. ej. "yuxtaposicion_simple") que no están documentados
// ahí — se dejan fuera de la cobertura objetivo por subtipo, pero se siguen
// mostrando tal cual en la columna "Tipo / subtipo" del CSV.
const SUBTIPOS_CERRADOS = new Set([
  'copulativa', 'disyuntiva', 'adversativa', 'distributiva', 'explicativa', 'ilativa_coord',
  'sustantiva_sujeto', 'sustantiva_cd', 'sustantiva_atributo', 'sustantiva_termino_preposicion', 'sustantiva_aposicion',
  'relativa_especificativa', 'relativa_explicativa', 'relativa_libre', 'relativa_semilibre',
  'condicional', 'final', 'causal', 'concesiva', 'ilativa_constr',
  'temporal', 'locativa', 'modal', 'comparativa',
]);

// Tope orientativo por subtipo en la ventana recomendada, por peso de demanda
// real (búsquedas + peso en PAU). Editable a mano.
const TOPE_SUBTIPO = {
  sustantiva_cd: 8, sustantiva_sujeto: 8, sustantiva_termino_preposicion: 8,
  relativa_especificativa: 8, copulativa: 8, adversativa: 8, causal: 8, condicional: 8,
  disyuntiva: 6, relativa_explicativa: 6, relativa_libre: 6, relativa_semilibre: 6, temporal: 6,
  sustantiva_aposicion: 4, concesiva: 4, ilativa_constr: 4, final: 4,
  ilativa_coord: 99, sustantiva_atributo: 99,
};

function idsConErrorValidador(rutaTSV) {
  let salida;
  try {
    salida = execFileSync(process.execPath, [path.join(DIR, 'scripts', 'validar-banco.mjs'), 'compuestas', rutaTSV], { encoding: 'utf8' });
  } catch (e) {
    salida = (e.stdout || '') + (e.stderr || ''); // el validador sale con código != 0 si hay errores
  }
  const ids = new Set();
  let enBloqueError = false;
  salida.split(/\r?\n/).forEach(linea => {
    if (/❌.*ERROR/.test(linea)) { enBloqueError = true; return; }
    if (/⚠.*AVISO/.test(linea)) { enBloqueError = false; return; }
    if (enBloqueError) {
      const m = linea.match(/\[([A-Za-z0-9_]+)\s*·/);
      if (m) ids.add(m[1]);
    }
  });
  return ids;
}

function procesarCompuestas() {
  const rutaTSV = path.join(BANCO_DIR, 'Compuestas_Banco.tsv');
  const activas = leerTSV('Compuestas_Banco.tsv').filter(r => r.Activo === 'Sí');

  const erroresValidador = idsConErrorValidador(rutaTSV);
  const sinErrores = activas.filter(r => !erroresValidador.has(r.ID));

  const { unicas, duplicadas } = quitarDuplicados(sinErrores, 'Texto', 'ID');

  const procesadas = [];
  unicas.forEach(r => {
    let json;
    try { json = JSON.parse(r.JSON_Compuesta); } catch (e) { return; }

    const subtiposTodos = [...new Set((json.relaciones || [])
      .map(rel => normalizarSubtipo(rel.subtipo))
      .filter(Boolean))];
    // Para la cobertura objetivo solo cuentan los subtipos de la lista cerrada
    // y no aparcados (p. ej. "yuxtaposicion_simple" no está en esa lista: la
    // oración se conserva, pero no cuenta para ningún tope).
    const subtiposReconocidos = subtiposTodos.filter(s => SUBTIPOS_CERRADOS.has(s));
    const subtiposUtiles = subtiposReconocidos.filter(s => !SUBTIPOS_APARCADOS.has(s));
    // Si TODO lo reconocible en la oración es aparcado, no aporta nada a la versión ligera.
    if (subtiposReconocidos.length && subtiposUtiles.length === 0) return;

    const nivel = (r.Nivel || '').trim();
    const nProp = Number(r.N_Proposiciones) || 0;
    let dificultad = { basico: 1, medio: 3, avanzado: 5 }[nivel] ?? 3;
    dificultad += Math.max(0, nProp - 2);
    dificultad = Math.min(5, Math.max(1, dificultad));

    const etiquetaTipo = subtiposUtiles.length
      ? `${r.Tipo_Oracion} · ${subtiposUtiles.join(' + ')}`
      : r.Tipo_Oracion; // yuxtapuestas: el schema no les da subtipo

    procesadas.push({
      id: r.ID,
      oracion: r.Texto.trim(),
      etiquetaTipo,
      numPalabras: contarPalabras(r.Texto),
      dificultad,
      _claves: subtiposUtiles.length ? subtiposUtiles : ['__' + r.Tipo_Oracion],
    });
  });

  const clavesObjetivo = Object.keys(TOPE_SUBTIPO);
  const { ordenados, corteCobertura, corteTopes } = ordenarConTopes(procesadas, clavesObjetivo, TOPE_SUBTIPO);

  escribirCSV('Seleccion_Compuestas_Light.csv',
    ['id', 'Oración', 'Tipo / subtipo', 'Nº de palabras', 'Dificultad (1-5)', 'INCLUIR'],
    ordenados.map(o => ({
      id: o.id,
      'Oración': o.oracion,
      'Tipo / subtipo': o.etiquetaTipo,
      'Nº de palabras': o.numPalabras,
      'Dificultad (1-5)': o.dificultad,
      'INCLUIR': '',
    })));

  const ventana = ordenados.slice(0, corteTopes);
  const totalPorSubtipo = {}, ventanaPorSubtipo = {};
  clavesObjetivo.forEach(k => { totalPorSubtipo[k] = 0; ventanaPorSubtipo[k] = 0; });
  ordenados.forEach(o => o._claves.filter(k => !k.startsWith('__')).forEach(k => totalPorSubtipo[k]++));
  ventana.forEach(o => o._claves.filter(k => !k.startsWith('__')).forEach(k => ventanaPorSubtipo[k]++));

  return {
    totalActivas: activas.length,
    excluidasPorError: [...erroresValidador],
    duplicadas,
    totalUnicas: unicas.length,
    corteCobertura,
    corteTopes,
    totalPorSubtipo,
    ventanaPorSubtipo,
    aparcados: [...SUBTIPOS_APARCADOS],
  };
}

// ════════════════════════════════════════════════════════════════════════
// 3. MORFOLOGÍA
// ════════════════════════════════════════════════════════════════════════

// Dificultad por nivel curricular del texto + una bonificación por longitud.
const DIFICULTAD_NIVEL_MORFO = { n1: 1, n2: 3, n3: 5, arcade: 4 };

function procesarMorfologia() {
  const activos = leerTSV('Morfologia_Textos.tsv').filter(r => r.Activo === 'Sí');
  const { unicas, duplicadas } = quitarDuplicados(activos, 'Texto_Completo', 'ID');

  const procesados = [];
  for (const r of unicas) {
    let tokens;
    try { tokens = JSON.parse(r.Tokens_JSON); } catch (e) { continue; }

    const categorias = [...new Set((tokens || []).map(t => t.cat).filter(Boolean))];
    const nivel = (r.Nivel || '').trim();
    const numPalabras = (tokens || []).filter(t => t.cat !== 'Puntuación').length || contarPalabras(r.Texto_Completo);

    let dificultad = DIFICULTAD_NIVEL_MORFO[nivel] ?? 3;
    dificultad += Math.floor(numPalabras / 40);
    dificultad = Math.min(5, Math.max(1, dificultad));

    procesados.push({
      id: 'M' + r.ID,
      texto: r.Texto_Completo.trim(),
      categorias,
      nivel,
      numPalabras,
      dificultad,
      // Se cubren categorías Y niveles: un texto "cuenta" tanto por sus categorías
      // gramaticales como por ser de un nivel que aún no está representado.
      _claves: [...categorias, 'nivel:' + nivel],
    });
  }

  const categoriasTodas = [...new Set(procesados.flatMap(o => o.categorias))];
  const nivelesTodos = [...new Set(procesados.map(o => 'nivel:' + o.nivel))];
  const clavesObjetivo = [...categoriasTodas, ...nivelesTodos];

  const { ordenados, corteCobertura } = ordenarPorCobertura(procesados, clavesObjetivo);

  escribirCSV('Seleccion_Morfologia_Light.csv',
    ['id', 'Texto', 'Nivel', 'Categorías gramaticales', 'Nº de palabras', 'Dificultad (1-5)', 'INCLUIR'],
    ordenados.map(o => ({
      id: o.id,
      'Texto': o.texto,
      'Nivel': o.nivel,
      'Categorías gramaticales': o.categorias.join(' + '),
      'Nº de palabras': o.numPalabras,
      'Dificultad (1-5)': o.dificultad,
      'INCLUIR': '',
    })));

  const totalPorCategoria = {};
  categoriasTodas.forEach(c => totalPorCategoria[c] = 0);
  ordenados.forEach(o => o.categorias.forEach(c => totalPorCategoria[c]++));

  const totalPorNivel = {};
  ordenados.forEach(o => totalPorNivel[o.nivel] = (totalPorNivel[o.nivel] || 0) + 1);

  return { totalActivos: activos.length, totalUnicos: unicas.length, duplicadas, corteCobertura, totalPorCategoria, totalPorNivel };
}

// ════════════════════════════════════════════════════════════════════════
// RESUMEN Y EJECUCIÓN
// ════════════════════════════════════════════════════════════════════════

function imprimirDuplicadas(titulo, duplicadas) {
  if (!duplicadas.length) return;
  console.log(`\n  ${titulo}: ${duplicadas.length} fila(s) descartada(s) por texto repetido:`);
  duplicadas.forEach(d => console.log(`    - ${d.descartada} (se conserva ${d.conservada})`));
}

console.log('=== Generando hojas de selección para la versión ligera ===\n');

console.log('── 1. Oración simple ──');
const rSimples = procesarSimples();
console.log(`Activas: ${rSimples.totalActivas}  ·  únicas tras quitar duplicados: ${rSimples.totalUnicas}`);
if (rSimples.sinJSON.length) console.log('  Sin JSON parseable (excluidas):', rSimples.sinJSON.join(', '));
imprimirDuplicadas('Simples', rSimples.duplicadas);
console.log(`Cobertura completa de las 22 funciones alcanzada en la fila ${rSimples.corteCobertura} (dentro de las primeras ${TARGET_SIMPLES} previstas).`);
console.log('\nResumen por función (nº en las primeras ' + TARGET_SIMPLES + ' filas / nº total en el banco):');
Object.entries(rSimples.totalPorFuncion).sort((a, b) => b[1] - a[1]).forEach(([f, total]) => {
  const enVentana = rSimples.primerasPorFuncion[f];
  const aviso = total <= 10 ? '  <-- función escasa en TODO el banco, no solo en la selección' : '';
  console.log(`  ${f.padEnd(16)} ${String(enVentana).padStart(3)} / ${total}${aviso}`);
});

console.log('\n── 2. Oración compuesta ──');
const rComp = procesarCompuestas();
console.log(`Activas: ${rComp.totalActivas}  ·  excluidas por error del validador: ${rComp.excluidasPorError.length}${rComp.excluidasPorError.length ? ' (' + rComp.excluidasPorError.join(', ') + ')' : ''}`);
console.log(`Únicas tras quitar duplicados: ${rComp.totalUnicas}`);
imprimirDuplicadas('Compuestas', rComp.duplicadas);
console.log(`Subtipos aparcados (fuera de cobertura, decisión de Josele): ${rComp.aparcados.join(', ')}`);
console.log(`Cobertura mínima (≥1 ejemplo de cada subtipo posible) en la fila ${rComp.corteCobertura}.`);
console.log(`Ventana recomendada (respeta los topes de demanda): primeras ${rComp.corteTopes} filas.`);
console.log('\nResumen por subtipo (nº en la ventana recomendada / nº total disponible / tope):');
Object.entries(rComp.totalPorSubtipo).sort((a, b) => b[1] - a[1]).forEach(([s, total]) => {
  const enVentana = rComp.ventanaPorSubtipo[s];
  const tope = TOPE_SUBTIPO[s];
  const aviso = total < 3 ? '  <-- por debajo del mínimo de 3 ejemplos' : '';
  console.log(`  ${s.padEnd(30)} ${String(enVentana).padStart(3)} / ${String(total).padStart(3)} / tope ${tope}${aviso}`);
});

console.log('\n── 3. Morfología ──');
const rMorfo = procesarMorfologia();
console.log(`Activos: ${rMorfo.totalActivos}  ·  únicos tras quitar duplicados: ${rMorfo.totalUnicos}`);
imprimirDuplicadas('Morfología', rMorfo.duplicadas);
console.log(`Cobertura completa de categorías y niveles alcanzada en la fila ${rMorfo.corteCobertura}.`);
console.log('Por nivel (total en el orden final):', JSON.stringify(rMorfo.totalPorNivel));
console.log('Por categoría gramatical:');
Object.entries(rMorfo.totalPorCategoria).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
  console.log(`  ${c.padEnd(22)} ${n}${n <= 3 ? '  <-- poco representada' : ''}`);
});

console.log('\n=== Hecho. Revisa las 3 columnas INCLUIR a mano en Excel. ===');
