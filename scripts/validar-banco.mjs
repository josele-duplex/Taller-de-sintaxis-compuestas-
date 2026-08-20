#!/usr/bin/env node
/* validar-banco.mjs — Validador de los bancos de oraciones (Node, sin dependencias)
 *
 * Lee un TSV exportado de Google Sheets y avisa de problemas ANTES de que
 * un alumno se los encuentre: etiquetas mal escritas, funciones inexistentes,
 * subtipos inválidos, JSON roto, índices fuera de rango, etc.
 *
 * NO toca la app ni el Sheet: solo LEE el archivo TSV y reporta.
 *
 * USO (desde la carpeta del proyecto, en la terminal):
 *   node scripts/validar-banco.mjs simples      banco_export/Oraciones_Banco.tsv
 *   node scripts/validar-banco.mjs compuestas   banco_export/Compuestas_Banco.tsv
 *   node scripts/validar-banco.mjs laboratorio  banco_export/Laboratorio_Banco.tsv
 *   node scripts/validar-banco.mjs formacion    banco_export/Formacion_Banco.tsv
 *
 * Cómo exportar el TSV:
 *   En el Sheet → Archivo → Descargar → "Valores separados por tabulaciones (.tsv)".
 *   Guarda el archivo en la carpeta banco_export/ del proyecto.
 *
 * El validador distingue:
 *   ❌ ERROR  → algo que el motor NO entiende: el alumno lo verá mal. Hay que corregir.
 *   ⚠ AVISO  → algo sospechoso o no recomendado, pero que no rompe. Revísalo.
 */

import { readFileSync, existsSync } from 'node:fs';

// ════════════════════════════════════════════════════════════════════
//  LISTAS CERRADAS (fuente de verdad: js/glosario/tags.js y el prompt v1.3)
// ════════════════════════════════════════════════════════════════════

// ── SIMPLES (Oraciones_Banco, columna Estructura_JSON) ──
// Funciones válidas en una "solucion" de bloque ("TIPO | FUNCION" o "FUNCION").
const SIMPLES_FUNCIONES = new Set([
  'Sujeto','NP','PV','PN','CD','CI','Dativo','C.Rég.','Atr.','Atr. Loc.','CPvo','C.Ag.',
  'CC Lugar','CC Tiempo','CC Modo','CC Causa','CC Cantidad','CC Compañía','CC Finalidad',
  'CC Instrumento','CC Benef.','CC',
  'Mod.Or.','Conector','Vocat.','Marca.Imp.','Marca.Pas.Ref.','Marca.Pron.',
]);
// Tipos de sintagma válidos (parte izquierda de "TIPO | FUNCION").
const SIMPLES_SINTAGMAS = new Set(['SN','SV','SP','SAdj','SAdv']);
// Etiquetas PROHIBIDAS típicas (drift conocido). Mensaje de ayuda por cada una.
const SIMPLES_PROHIBIDAS = {
  'C.Agente':'usa "C.Ag."', 'C. Agente':'usa "C.Ag."', 'C.Ag':'falta el punto final: "C.Ag."',
  'Aposición':'no existe como función de oración simple en este motor',
  'Dat.Et.':'usa "Dativo"', 'Dativo Ético':'usa "Dativo"', 'Dativo de interés':'usa "Dativo"',
  'Mod. Oracional':'usa "Mod.Or."', 'Modificador Oracional':'usa "Mod.Or."',
  'CC finalidad':'mayúscula: "CC Finalidad"', 'Atributo Locativo':'usa "Atr. Loc."',
  'CC Beneficiario':'usa "CC Benef."', 'CC Compania':'falta la tilde: "CC Compañía"',
  // Alias detectados en la auditoría del banco real (jun-2026). El GAS los
  // normaliza al servir, pero conviene corregirlos en el Sheet.
  'CC Fin.':'usa "CC Finalidad"', 'CC Medio':'usa "CC Instrumento"',
  'CI (Dat. Ético)':'usa "Dativo"', 'CPred':'usa "CPvo"', 'CRég':'usa "C.Rég."',
  'Morf. Verbal':'usa "Marca.Pron."', 'N (V. Pronominal)':'usa "Marca.Pron."',
};

// ── COMPUESTAS (Compuestas_Banco, columna JSON_Compuesta, schema 1.2) ──
const CP_TIPO_ORACION = new Set(['coordinada','subordinada','yuxtapuesta','mixta']);
const CP_NIVEL = new Set(['basico','medio','avanzado']);
// Subtipos válidos de relación (sección 8.1 del prompt).
const CP_SUBTIPOS = new Set([
  // coordinadas
  'copulativa','disyuntiva','adversativa','distributiva','explicativa','ilativa_coord',
  // sustantivas
  'sustantiva_sujeto','sustantiva_cd','sustantiva_atributo','sustantiva_aposicion',
  'sustantiva_termino_preposicion',
  // relativas
  'relativa_especificativa','relativa_explicativa','relativa_libre','relativa_semilibre',
  // construcciones
  'condicional','final','causal','concesiva','ilativa_constr',
  // adverbiales propias
  'temporal','locativa','modal','comparativa',
  // yuxtaposición
  'yuxtaposicion_simple',
]);
// Funciones del análisis_interno (tipo de cada complemento).
const CP_FUNC_TIPOS = new Set([
  'cd','ci','cc','atributo','atributo_locativo','cpvo','c_regimen','c_agente','dativo',
  'marca_pas_ref','mod_oracional','vocativo','termino_preposicion','aposicion','cn',
  'c_adj','c_adv','sujeto',
]);
// Subtipos válidos de CC dentro de analisis_interno (campo subtipo del prompt v1.3).
const CP_CC_SUBTIPOS = new Set([
  'lugar','tiempo','modo','causa','finalidad','cantidad','compania','instrumento','beneficiario',
]);
// funcion_sp (sección 6).
const CP_FUNCION_SP = new Set(['c_regimen','ci','cc','cn','c_adj','c_adv','atributo']);
const CP_SUBTIPO_ELIMINADO = 'sustantiva_c_regimen'; // ya no existe en 1.2
// Categorías válidas de token (tokens[].categoria).
const CP_CATEGORIAS_TOKEN = new Set([
  'sustantivo','adjetivo','verbo','adverbio','pronombre','pronombre_relativo',
  'conjuncion','puntuacion','otro',
]);
// relacion.tipo (distinto de Tipo_Oracion/tipo_oracion, que es de todo el ejercicio).
const CP_RELACION_TIPOS = new Set(['coordinacion','subordinacion','yuxtaposicion']);

// ── LABORATORIO (Laboratorio_Banco, columna JSON_Reto, schema 1.0) ──
// Especificación completa: docs/Schema_Laboratorio_v1.0.md
const LAB_NIVEL = new Set(['basico','medio','avanzado']);
const LAB_ORDEN_NIVEL = { basico:1, medio:2, avanzado:3 };
const LAB_CURSO = new Set(['2E','3E','4E','1B']);

// Las funciones válidas son las mismas que en simples (fuente: FUNC_ORAC de
// js/glosario/tags.js). Se reutiliza el Set en vez de duplicarlo: si un día
// se añade una función, se añade en un solo sitio.
const LAB_FUNCIONES = SIMPLES_FUNCIONES;
// Ídem con las etiquetas prohibidas, más las que el banco R-07 del proyecto de
// Lengua usa con otro nombre y se van a colar al importar pares mínimos.
const LAB_PROHIBIDAS = {
  ...SIMPLES_PROHIBIDAS,
  'C.Pred.':'usa "CPvo"', 'CPredicativo':'usa "CPvo"', 'C. Pred.':'usa "CPvo"',
  'CReg':'usa "C.Rég."', 'C.Reg.':'usa "C.Rég."', 'C. Rég.':'usa "C.Rég."',
  'Atributo':'usa "Atr."',
  'Predicado Nominal':'usa "PN"', 'Predicado Verbal':'usa "PV"',
  'Vocativo':'usa "Vocat."',
};

// Tipo de ítem → estación. La estación NO se declara en el dato: se deduce de
// aquí, para que no pueda existir un ítem en una estación que no le toca.
const LAB_TIPO_ESTACION = {
  valencia:1, que_cambia:1, intruso:1,
  manipulacion:2, juicio:2, par_minimo:2, analisis_inverso:2, frontera:2,
  etiqueta_prueba:3,
};
const LAB_MANIPULACIONES = new Set(['sustituye','suprime','cambia_numero','mueve','transforma']);
const LAB_VEREDICTOS = new Set(['gramatical','agramatical','norma_culta','dudoso']);
const LAB_ROLES_VALENCIA = new Set(['quien_hace','a_quien_o_que','quien_lo_recibe','donde_cuando_como']);
const LAB_ENUNCIADOS = new Set(['tecnico','simple']);
const LAB_DESTINOS = new Set(['reto','caja_pruebas']);
const LAB_ORDENES = new Set(['fijo','libre']);

// Las 22 causas de agramaticalidad, con el nivel mínimo en que pueden aparecer
// y el veredicto que les corresponde (§5 de la especificación). Confundir un
// error de comprensión con uno de norma culta es el error pedagógico que el
// corpus quiere evitar, así que se valida.
// OJO: js/data/canon-agramatical.js tiene su propia copia de este mapa, a
// propósito (este script es Node puro, sin imports del front). Si se toca uno,
// hay que tocar el otro — está anotado en los dos sitios.
const LAB_CAUSAS = {
  concordancia_sv:          { nivelMin:'basico',   veredicto:'agramatical' },
  concordancia_atr:         { nivelMin:'basico',   veredicto:'agramatical' },
  concordancia_det_nombre:  { nivelMin:'basico',   veredicto:'agramatical' },
  concordancia_atono:       { nivelMin:'basico',   veredicto:'agramatical' },
  atono_plural_discordante: { nivelMin:'basico',   veredicto:'norma_culta' },
  transitividad:            { nivelMin:'basico',   veredicto:'agramatical' },
  orden_imposible:          { nivelMin:'basico',   veredicto:'agramatical' },
  concordancia_cpvo:        { nivelMin:'medio',    veredicto:'agramatical' },
  regimen_prep:             { nivelMin:'medio',    veredicto:'agramatical' },
  pronombre_cruzado:        { nivelMin:'medio',    veredicto:'agramatical' },
  seleccion_semantica:      { nivelMin:'medio',    veredicto:'agramatical' },
  articulo_propio:          { nivelMin:'medio',    veredicto:'norma_culta' },
  pasiva_refleja_intrans:   { nivelMin:'avanzado', veredicto:'agramatical' },
  duplicacion_obligatoria:  { nivelMin:'avanzado', veredicto:'agramatical' },
  modo_obligado:            { nivelMin:'avanzado', veredicto:'agramatical' },
  gradabilidad:             { nivelMin:'avanzado', veredicto:'agramatical' },
  queismo_dequeismo:        { nivelMin:'avanzado', veredicto:'norma_culta' },
  leismo_laismo:            { nivelMin:'avanzado', veredicto:'norma_culta' },
  concordancia_ad_sensum:   { nivelMin:'avanzado', veredicto:'dudoso' },
  // Ampliación 2026-08-20 (bloque de valores de «se», docs/Cascada_Valores_del_SE_Laboratorio.md):
  // las tres causas que la cascada necesita para sus juicios y que ninguna de las 19 anteriores nombra.
  impersonal_pluralizada:   { nivelMin:'avanzado', veredicto:'agramatical' },
  reciproco_sujeto_singular:{ nivelMin:'medio',    veredicto:'agramatical' },
  verbo_pronominal_sin_se:  { nivelMin:'medio',    veredicto:'agramatical' },
};

// Pares de funciones que discriminan de verdad (matriz de vecinos confundibles
// del Banco_reflexion_metalinguistica.md). Sus ítems deberían pesar 2.
const LAB_PARES_DISCRIMINANTES = [
  ['Atr.','CPvo'], ['C.Rég.','CC'], ['CI','CC Finalidad'], ['C.Ag.','CC Causa'],
  ['Marca.Pas.Ref.','Marca.Imp.'], ['Sujeto','CD'], ['CD','CI'],
];
const LAB_FUNC_DISCRIMINANTES = new Set(LAB_PARES_DISCRIMINANTES.flat());

// Metalenguaje que NO puede aparecer en los textos visibles de la estación 1
// (ni de la estación 2 en nivel basico). OJO: "verbo" y "oración" están
// deliberadamente FUERA de la lista — son el vocabulario que la propia unidad
// de 2.º ESO usa a ese nivel ("¿cuántos actores pide este verbo?").
const LAB_META_PALABRAS = [
  'sujeto','predicado','sintagma','núcleo','nucleo',
  'complemento directo','complemento indirecto','complemento circunstancial',
  'complemento de régimen','complemento agente','complemento predicativo',
  'atributo','predicativo','circunstancial','régimen','regimen','agente',
  'transitivo','intransitivo','copulativo','valencia','argumento','adjunto',
  'pasiva refleja','impersonal','vocativo','pronominalizar','conmutar',
];
const LAB_META_SIGLAS = [
  'CD','CI','CC','NP','PN','PV','CPvo','C.Rég.','C.Ag.','Atr.','Atr. Loc.',
  'Vocat.','Mod.Or.','Dativo','Marca.Imp.','Marca.Pas.Ref.','Marca.Pron.',
];

// Terminología del proyecto que nunca debe aparecer en un texto visible
// (reglas no negociables de CLAUDE.md).
const LAB_TERMINOLOGIA = {
  'grupo':'terminología NGLE del proyecto: se dice "sintagma", nunca "grupo"',
  'proposición':'la app dice "oración" y numera O1/O2/O3, nunca "proposición"',
  'proposiciones':'la app dice "oraciones" y numera O1/O2/O3',
};

// ── FORMACIÓN (Formacion_Banco, columna JSON_Reto, schema 1.0) ──
// Especificación completa: docs/Schema_Formacion_v1.0.md
// Canon lingüístico: mesa de herramientas §4 de la UD Gramatica_01 de 3.º ESO.
const FP_NIVEL = new Set(['basico','medio','avanzado']);
const FP_ORDEN_NIVEL = { basico:1, medio:2, avanzado:3 };
const FP_CURSO = new Set(['1E','2E','3E','4E','1B']);

// Tipo de ítem → estación. En `piezas` la estación depende del modo (§3).
const FP_TIPO_ESTACION = {
  agrupa:1, intruso:1,
  piezas:2, monta:2, par_minimo:2, cadena:2, juicio:2, frontera:2,
  clasifica_prueba:3, cascada:3,
};
const FP_MODOS_PIEZAS = { cortar:2, etiquetar:3, capas:3 }; // modo → estación
const FP_CRITERIOS = new Set(['familia_lexica','pieza_comun']);
const FP_VEREDICTOS = new Set(['correcta','no_existe','norma_culta','dudosa']);
const FP_ENUNCIADOS = new Set(['tecnico','simple']);

// Los 12 procedimientos de formación, con el nivel mínimo en que se juegan.
const FP_PROCEDIMIENTOS = {
  simple:                 'basico',
  derivada:               'basico',
  compuesta_lexica:       'basico',
  compuesta_sintagmatica: 'medio',
  compuesta_culta:        'medio',
  parasintetica:          'medio',
  sigla:                  'medio',
  acronimo:               'medio',
  acortamiento:           'medio',
  abreviatura:            'medio',
  numeronimo:             'medio',
  prestamo:               'medio',
};

// Tipos de pieza (etiquetas de morfema). "vocal_cierre" solo en avanzado: es el
// canon de segmentación fijado en §5.1 del schema (en basico/medio la vocal
// final se etiqueta "flexivo", como enseña la sesión 4 de la UD de 1.º ESO).
const FP_PIEZAS = {
  raiz:'basico', prefijo:'basico', sufijo:'basico', flexivo:'basico', base:'basico',
  interfijo:'medio', elemento_culto:'medio',
  vocal_cierre:'avanzado',
};

// Las 13 causas de error morfológico, con nivel mínimo y veredicto esperado.
// La distinción no_existe / norma_culta es el principio rector del marco §2.3
// aplicado a morfología: *rojecer no existe; ONGs se dice y se entiende, y lo
// que falla es la norma de escritura.
const FP_CAUSAS = {
  falta_base:              { nivelMin:'basico',   veredicto:'no_existe' },
  orden_piezas:            { nivelMin:'basico',   veredicto:'no_existe' },
  familia_falsa:           { nivelMin:'basico',   veredicto:'no_existe' },
  parasintesis_incompleta: { nivelMin:'medio',    veredicto:'no_existe' },
  sigla_plural:            { nivelMin:'medio',    veredicto:'norma_culta' },
  sigla_puntos:            { nivelMin:'medio',    veredicto:'norma_culta' },
  abreviatura_sin_punto:   { nivelMin:'medio',    veredicto:'norma_culta' },
  sigla_minuscula:         { nivelMin:'medio',    veredicto:'norma_culta' },
  acortamiento_mal:        { nivelMin:'medio',    veredicto:'no_existe' },
  restriccion_sufijo:      { nivelMin:'avanzado', veredicto:'no_existe' },
  alomorfo_incorrecto:     { nivelMin:'avanzado', veredicto:'no_existe' },
  prestamo_adaptacion:     { nivelMin:'avanzado', veredicto:'norma_culta' },
  doble_analisis:          { nivelMin:'avanzado', veredicto:'dudosa' },
};

// Vecinos confundibles: sus ítems deberían pesar 2 (§7 del schema).
const FP_DISCRIMINANTES = new Set([
  'compuesta_lexica','parasintetica','sigla','acronimo','acortamiento',
  'abreviatura','compuesta_sintagmatica',
]);

// Metalenguaje prohibido en la estación 1 (y en la 2 en nivel basico).
// OJO: "palabra", "pieza", "trozo", "significado", "letra" y "familia" (a secas)
// están FUERA a propósito — es el vocabulario que la propia UD de 1.º ESO usa
// ("¿se puede partir en trozos más pequeños que también signifiquen algo?").
const FP_META_PALABRAS = [
  'raíz','raiz','morfema','afijo','prefijo','sufijo','interfijo','flexivo',
  'derivativo','derivación','derivacion','derivada','composición','composicion',
  'compuesta','compuesto','parasíntesis','parasintesis','parasintética','parasintetica',
  'sigla','acrónimo','acronimo','acortamiento','abreviatura','numerónimo','numeronimo',
  'préstamo','prestamo','lexema','base léxica','base lexica','familia léxica',
  'familia lexica','elemento compositivo','cultismo','simple',
];

const FP_TERMINOLOGIA = {
  'grupo':'terminología NGLE del proyecto: se dice "sintagma", nunca "grupo"',
  'proposición':'la app dice "oración", nunca "proposición"',
};

// ════════════════════════════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════════════════════════════

function parseTSV(texto){
  // Divide por líneas y por tabuladores. La 1.ª fila es la cabecera.
  const lineas = texto.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.length>0);
  if(lineas.length===0) return { cabecera:[], filas:[] };
  const cabecera = lineas[0].split('\t').map(s=>s.trim());
  const filas = lineas.slice(1).map(l=>l.split('\t'));
  return { cabecera, filas };
}

function colIndex(cabecera, nombre){
  return cabecera.findIndex(c => c.toLowerCase() === nombre.toLowerCase());
}
// ── Helpers compartidos por los modos de reto (laboratorio y formacion) ──
// OJO AL MERGE: la rama `laboratorio` define estos mismos helpers con idéntica
// implementación. Al unir las dos ramas quedará uno duplicado: borrar el que
// sobre, no reescribirlos.

// Comprueba el bloque "opciones" (2-4, exactamente N correctas, micro en todas).
function validarOpciones(R, id, ref, opciones, okEsperados){
  if(!Array.isArray(opciones) || opciones.length<2){
    R.error(id, `${ref}: necesita al menos 2 "opciones".`);
    return;
  }
  if(opciones.length>4) R.aviso(id, `${ref}: ${opciones.length} opciones (el schema recomienda 2-4).`);
  const oks = opciones.filter(o=>o && o.ok===true).length;
  if(oks!==okEsperados) R.error(id, `${ref}: ${oks} opción(es) con ok:true, se esperaban ${okEsperados}.`);
  opciones.forEach((o,i)=>{
    const oref = `${ref} opción ${i+1}`;
    if(!o || typeof o!=='object'){ R.error(id, `${oref}: no es un objeto.`); return; }
    if(typeof o.texto!=='string' || !o.texto.trim()) R.error(id, `${oref}: sin "texto".`);
    // La microexplicación es obligatoria TAMBIÉN en la correcta.
    if(typeof o.micro!=='string' || !o.micro.trim()) R.error(id, `${oref}: sin "micro" (obligatoria en todas, correctas incluidas).`);
    if(o.ok!==undefined && typeof o.ok!=='boolean') R.error(id, `${oref}: "ok" debe ser true o false.`);
  });
}

// Busca un término de una lista dentro de un texto, respetando límites de
// palabra (\b no es fiable con tildes en todos los motores).
function buscarTermino(texto, lista){
  if(typeof texto!=='string') return null;
  const t = texto.toLowerCase();
  for(const pal of lista){
    const i = t.indexOf(pal);
    if(i<0) continue;
    const antes = i>0 ? t[i-1] : ' ';
    const desp  = t[i+pal.length] || ' ';
    if(!/[a-záéíóúñü]/.test(antes) && !/[a-záéíóúñü]/.test(desp)) return pal;
  }
  return null;
}

// Acumulador de hallazgos
class Reporte {
  constructor(){ this.errores=[]; this.avisos=[]; }
  error(id, msg){ this.errores.push({id, msg}); }
  aviso(id, msg){ this.avisos.push({id, msg}); }
  imprimir(totalFilas){
    const e=this.errores, a=this.avisos;
    console.log('');
    if(e.length===0 && a.length===0){
      console.log(`✅ ${totalFilas} filas validadas. Sin problemas.`);
      return 0;
    }
    if(e.length){
      console.log(`❌ ${e.length} ERROR(es) — el motor NO los entiende, el alumno los verá mal:`);
      for(const {id,msg} of e) console.log(`   • [${id}] ${msg}`);
      console.log('');
    }
    if(a.length){
      console.log(`⚠ ${a.length} AVISO(s) — sospechoso pero no rompe; revísalo:`);
      for(const {id,msg} of a) console.log(`   • [${id}] ${msg}`);
      console.log('');
    }
    console.log(`Resumen: ${totalFilas} filas · ${e.length} errores · ${a.length} avisos.`);
    return e.length>0 ? 1 : 0;
  }
}

// ════════════════════════════════════════════════════════════════════
//  VALIDADOR DE SIMPLES
// ════════════════════════════════════════════════════════════════════

function validarSimples(cabecera, filas, R){
  const cTexto = colIndex(cabecera,'Oracion_Texto');
  const cJson  = colIndex(cabecera,'Estructura_JSON');
  if(cJson<0){
    R.error('-', 'No encuentro la columna "Estructura_JSON" en la cabecera. ¿Es el TSV de simples?');
    return;
  }
  filas.forEach((cols, i)=>{
    const fila = i+2; // +1 cabecera, +1 base 1
    const texto = (cols[cTexto]||'').slice(0,50);
    const id = `fila ${fila}${texto?` · "${texto}…"`:''}`;
    const raw = (cols[cJson]||'').trim();
    if(!raw){ R.aviso(id, 'Estructura_JSON vacía.'); return; }
    let arr;
    try { arr = JSON.parse(raw); }
    catch(e){ R.error(id, `Estructura_JSON no es JSON válido: ${e.message}`); return; }
    if(!Array.isArray(arr)){ R.error(id, 'Estructura_JSON debería ser un array de bloques []'); return; }
    arr.forEach((b, j)=>{
      const sol = b && (b['función'] || b.funcion || b.solucion);
      const seg = b && (b.segmento!==undefined ? `"${b.segmento}"` : `bloque ${j+1}`);
      if(!sol){ R.aviso(id, `${seg}: bloque sin campo "función".`); return; }
      // La función puede venir como "TIPO | FUNC" o directamente "FUNC".
      let tipo=null, func=sol;
      if(String(sol).includes('|')){ const p=String(sol).split('|').map(s=>s.trim()); tipo=p[0]; func=p[1]; }
      // Sintagma explícito en su propio campo
      const sint = b.sintagma || tipo;
      // Comprobar etiqueta prohibida primero (mensaje más útil)
      if(SIMPLES_PROHIBIDAS[func]){
        R.error(id, `${seg}: función "${func}" PROHIBIDA → ${SIMPLES_PROHIBIDAS[func]}.`);
      } else if(!SIMPLES_FUNCIONES.has(func)){
        R.error(id, `${seg}: función "${func}" no está en la lista válida del motor.`);
      }
      if(sint && !SIMPLES_SINTAGMAS.has(sint) && sint!=='—'){
        R.aviso(id, `${seg}: tipo de sintagma "${sint}" no es uno de SN/SV/SP/SAdj/SAdv.`);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════════
//  VALIDADOR DE COMPUESTAS (schema 1.2)
// ════════════════════════════════════════════════════════════════════

function validarCompuestas(cabecera, filas, R){
  const cId   = colIndex(cabecera,'ID');
  const cJson = colIndex(cabecera,'JSON_Compuesta');
  const cTipo = colIndex(cabecera,'Tipo_Oracion');
  const cNivel= colIndex(cabecera,'Nivel');
  if(cJson<0){
    R.error('-', 'No encuentro la columna "JSON_Compuesta" en la cabecera. ¿Es el TSV de compuestas?');
    return;
  }
  const idsVistos = new Map();
  filas.forEach((cols, i)=>{
    const fila = i+2;
    const idCol = (cols[cId]||'').trim();
    const id = `${idCol||'(sin ID)'} · fila ${fila}`;
    // ID formato y duplicados
    if(idCol){
      if(!/^OC_\d{4}$/.test(idCol)) R.aviso(id, `ID "${idCol}" no sigue el formato OC_NNNN (4 dígitos).`);
      if(idsVistos.has(idCol)) R.error(id, `ID duplicado (también en fila ${idsVistos.get(idCol)}).`);
      else idsVistos.set(idCol, fila);
    }
    const raw = (cols[cJson]||'').trim();
    if(!raw){ R.aviso(id, 'JSON_Compuesta vacío.'); return; }
    let o;
    try { o = JSON.parse(raw); }
    catch(e){ R.error(id, `JSON_Compuesta no es JSON válido: ${e.message}`); return; }

    // schema_version
    if(o.schema_version && o.schema_version !== '1.2')
      R.aviso(id, `schema_version "${o.schema_version}" (se espera "1.2").`);
    // tipo_oracion (col y JSON)
    const tipoCol = (cols[cTipo]||'').trim();
    if(tipoCol && !CP_TIPO_ORACION.has(tipoCol))
      R.error(id, `Tipo_Oracion (columna) "${tipoCol}" inválido.`);
    if(o.tipo_oracion && !CP_TIPO_ORACION.has(o.tipo_oracion))
      R.error(id, `tipo_oracion (JSON) "${o.tipo_oracion}" inválido.`);
    // nivel
    const nivelCol = (cols[cNivel]||'').trim();
    if(nivelCol && !CP_NIVEL.has(nivelCol))
      R.error(id, `Nivel (columna) "${nivelCol}" inválido (basico/medio/avanzado).`);
    if(o.metadatos?.nivel && !CP_NIVEL.has(o.metadatos.nivel))
      R.error(id, `metadatos.nivel "${o.metadatos.nivel}" inválido.`);

    // tokens
    const tokens = Array.isArray(o.tokens) ? o.tokens : [];
    const nTokens = tokens.length;
    if(nTokens===0) R.error(id, 'Sin array "tokens".');

    // Índices consecutivos alineados con la posición, categoría válida y texto
    // reconstruible. No es solo estilo: js/modules/compuestas/index.js accede
    // a tokens por posición directa (ej.tokens[idx]), así que un "i" desalineado
    // muestra el token equivocado al alumno sin que salte ningún error visible.
    let reconstruido = '';
    tokens.forEach((t, ti)=>{
      if(!t || typeof t.i!=='number' || t.i!==ti)
        R.error(id, `token ${ti}: "i" es ${t?.i} (debería ser ${ti}, la propia posición en el array).`);
      if(!t || !CP_CATEGORIAS_TOKEN.has(t.categoria))
        R.error(id, `token ${ti} ("${t?.texto}"): categoría "${t?.categoria}" no válida.`);
      const texto = t?.texto || '';
      reconstruido = t?.categoria==='puntuacion' ? reconstruido.replace(/\s+$/,'') + texto + ' ' : reconstruido + texto + ' ';
    });
    if(nTokens && typeof o.texto==='string' && reconstruido.trim()!==o.texto.trim())
      R.aviso(id, `el texto reconstruido desde "tokens" ("${reconstruido.trim()}") no coincide con "texto" ("${o.texto.trim()}").`);

    // Helper: validar índices contra el rango de tokens
    const idxFueraRango = (idxs) =>
      Array.isArray(idxs) && idxs.some(x => typeof x!=='number' || x<0 || x>=nTokens);

    // proposiciones
    const props = Array.isArray(o.proposiciones) ? o.proposiciones : [];
    if(props.length===0) R.error(id, 'Sin array "proposiciones".');
    const propIds = new Set();
    const propIdsVistos = new Set();
    props.forEach((p, k)=>{
      if(p.id){
        if(propIdsVistos.has(p.id)) R.error(id, `proposición "${p.id}" duplicada.`);
        propIdsVistos.add(p.id);
        propIds.add(p.id);
      }
      if(!p.verbo || typeof p.verbo.indice!=='number')
        R.aviso(id, `proposición ${p.id||k+1} sin verbo.indice.`);
      else {
        if(p.verbo.indice<0 || p.verbo.indice>=nTokens)
          R.error(id, `proposición ${p.id||k+1}: verbo.indice fuera de rango.`);
        else if(tokens[p.verbo.indice]?.categoria!=='verbo')
          R.error(id, `proposición ${p.id||k+1}: verbo.indice apunta a un token que no es "verbo" (es "${tokens[p.verbo.indice]?.categoria}", "${tokens[p.verbo.indice]?.texto}").`);
        const ip = p.verbo.indices_perifrasis;
        if(ip!==undefined){
          if(idxFueraRango(ip)) R.error(id, `proposición ${p.id||k+1}: indices_perifrasis fuera de rango.`);
          else if(Array.isArray(ip) && !ip.includes(p.verbo.indice))
            R.error(id, `proposición ${p.id||k+1}: indices_perifrasis no contiene a verbo.indice.`);
        }
      }
      if(idxFueraRango(p.indices))
        R.error(id, `proposición ${p.id||k+1}: índices fuera de rango (0..${nTokens-1}).`);
      // subtipo eliminado / inválido (un solo mensaje, el más útil)
      if(p.subtipo===CP_SUBTIPO_ELIMINADO)
        R.error(id, `proposición ${p.id||k+1}: subtipo "${CP_SUBTIPO_ELIMINADO}" ya NO existe en schema 1.2 (usa sustantiva_termino_preposicion).`);
      else if(p.subtipo && !CP_SUBTIPOS.has(p.subtipo))
        R.error(id, `proposición ${p.id||k+1}: subtipo "${p.subtipo}" no está en la lista válida.`);
      // analisis_interno
      const ai = p.analisis_interno;
      if(!ai){ R.aviso(id, `proposición ${p.id||k+1} sin analisis_interno.`); return; }
      if(idxFueraRango(ai.sujeto?.indices)) R.error(id, `proposición ${p.id||k+1}: sujeto.indices fuera de rango.`);
      if(idxFueraRango(ai.predicado?.indices)) R.error(id, `proposición ${p.id||k+1}: predicado.indices fuera de rango.`);
      (Array.isArray(ai.funciones)?ai.funciones:[]).forEach((f, fi)=>{
        if(!CP_FUNC_TIPOS.has(f.tipo))
          R.error(id, `proposición ${p.id||k+1}, función ${fi+1}: tipo "${f.tipo}" no válido.`);
        if(f.tipo==='cc' && f.subtipo!==undefined && !CP_CC_SUBTIPOS.has(String(f.subtipo).toLowerCase()))
          R.error(id, `proposición ${p.id||k+1}, función ${fi+1}: subtipo de CC "${f.subtipo}" no válido (lugar/tiempo/modo/causa/finalidad/cantidad/compania/instrumento/beneficiario).`);
        if(idxFueraRango(f.indices))
          R.error(id, `proposición ${p.id||k+1}, función ${fi+1} (${f.tipo}): índices fuera de rango.`);
      });
    });

    // nexos: IDs únicos, índices y referencias (antes que relaciones, que los referencian)
    const nexoIds = new Set();
    const nexoIdsVistos = new Set();
    (Array.isArray(o.nexos)?o.nexos:[]).forEach((n,k)=>{
      if(n.id){
        if(nexoIdsVistos.has(n.id)) R.error(id, `nexo "${n.id}" duplicado.`);
        nexoIdsVistos.add(n.id);
        nexoIds.add(n.id);
      }
      if(idxFueraRango(n.indices)) R.error(id, `nexo ${n.id||k+1}: índices fuera de rango.`);
    });

    // relaciones
    const rels = Array.isArray(o.relaciones) ? o.relaciones : [];
    const relIdsVistos = new Set();
    rels.forEach((r, k)=>{
      if(r.id){
        if(relIdsVistos.has(r.id)) R.error(id, `relación "${r.id}" duplicada.`);
        relIdsVistos.add(r.id);
      }
      if(!CP_RELACION_TIPOS.has(r.tipo))
        R.error(id, `relación ${r.id||k+1}: tipo "${r.tipo}" inválido (debe ser coordinacion/subordinacion/yuxtaposicion).`);
      if(r.subtipo===CP_SUBTIPO_ELIMINADO)
        R.error(id, `relación ${r.id||k+1}: subtipo "${CP_SUBTIPO_ELIMINADO}" eliminado en 1.2 (usa sustantiva_termino_preposicion).`);
      else if(r.subtipo && !CP_SUBTIPOS.has(r.subtipo))
        R.error(id, `relación ${r.id||k+1}: subtipo "${r.subtipo}" no válido.`);
      // referencias a proposiciones y nexo existentes
      const propList = Array.isArray(r.proposiciones) ? r.proposiciones : [];
      propList.forEach(pid=>{
        if(!propIds.has(pid))
          R.error(id, `relación ${r.id||k+1}: referencia a proposición "${pid}" que no existe.`);
      });
      if(r.nexo && !nexoIds.has(r.nexo))
        R.error(id, `relación ${r.id||k+1}: referencia a nexo "${r.nexo}" que no existe.`);
      // Estructura por tipo: subordinación binaria con direccion+funcion;
      // coordinación ≥2 proposiciones y sin funcion propia.
      if(r.tipo==='subordinacion'){
        if(propList.length!==2)
          R.error(id, `relación ${r.id||k+1}: subordinación con ${propList.length} proposiciones (debe ser exactamente 2).`);
        if(!r.direccion) R.error(id, `relación ${r.id||k+1}: subordinación sin "direccion".`);
        if(!r.funcion) R.error(id, `relación ${r.id||k+1}: subordinación sin "funcion".`);
      } else if(r.tipo==='coordinacion'){
        if(propList.length<2)
          R.error(id, `relación ${r.id||k+1}: coordinación con menos de 2 proposiciones.`);
        if(r.funcion)
          R.aviso(id, `relación ${r.id||k+1}: coordinación con "funcion" (no debería llevar).`);
      }
      // funcion_sp obligatoria SSI subtipo es sustantiva_termino_preposicion
      if(r.subtipo==='sustantiva_termino_preposicion'){
        if(!r.funcion_sp) R.error(id, `relación ${r.id||k+1}: subtipo término_preposición requiere "funcion_sp".`);
        else if(!CP_FUNCION_SP.has(r.funcion_sp)) R.error(id, `relación ${r.id||k+1}: funcion_sp "${r.funcion_sp}" no válido.`);
      } else if(r.funcion_sp){
        R.aviso(id, `relación ${r.id||k+1}: funcion_sp presente pero el subtipo no es sustantiva_termino_preposicion.`);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════════
//  VALIDADOR DE LABORATORIO (schema 1.0)
//  Especificación: docs/Schema_Laboratorio_v1.0.md
// ════════════════════════════════════════════════════════════════════

// Cuántas veces aparece "aguja" dentro de "pajar" (búsqueda literal, no regex).
function contarOcurrencias(pajar, aguja){
  if(!pajar || !aguja) return 0;
  let n=0, desde=0;
  for(;;){
    const i = pajar.indexOf(aguja, desde);
    if(i<0) break;
    n++; desde = i + aguja.length;
  }
  return n;
}

// Devuelve el primer término de metalenguaje encontrado, o null.
function buscarMetalenguaje(texto){
  if(typeof texto!=='string') return null;
  const t = texto.toLowerCase();
  for(const pal of LAB_META_PALABRAS){
    // \b no sirve con tildes en todos los motores: se comprueba a mano que el
    // carácter anterior y el siguiente no sean letra.
    const i = t.indexOf(pal);
    if(i<0) continue;
    const antes = i>0 ? t[i-1] : ' ';
    const desp  = t[i+pal.length] || ' ';
    if(!/[a-záéíóúñü]/.test(antes) && !/[a-záéíóúñü]/.test(desp)) return pal;
  }
  for(const sig of LAB_META_SIGLAS){
    const i = texto.indexOf(sig);
    if(i<0) continue;
    const antes = i>0 ? texto[i-1] : ' ';
    const desp  = texto[i+sig.length] || ' ';
    // Tras una sigla puede ir punto o coma; antes, espacio o comilla.
    if(!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(antes) && !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(desp)) return sig;
  }
  return null;
}

// Todos los textos que el alumno LEE en un ítem (para las comprobaciones de
// metalenguaje y de terminología).
function textosVisibles(item){
  const out = [];
  const push = v => { if(typeof v==='string' && v.trim()) out.push(v); };
  push(item.feedback); push(item.explicacion); push(item.consigna);
  (Array.isArray(item.opciones)?item.opciones:[]).forEach(o=>{ if(o){ push(o.texto); push(o.micro); } });
  (Array.isArray(item.actores)?item.actores:[]).forEach(a=>{ if(a) push(a.texto); });
  (Array.isArray(item.slots)?item.slots:[]).forEach(s=>{ if(s) push(s.rol); });
  return out;
}

// Comprueba un { texto, funcion } contra su oración.
function validarObjetivo(R, id, ref, objetivo, oracion){
  if(!objetivo || typeof objetivo!=='object'){ R.error(id, `${ref}: falta "objetivo".`); return; }
  const { texto, funcion } = objetivo;
  if(typeof texto!=='string' || !texto.trim()){ R.error(id, `${ref}: objetivo sin "texto".`); }
  else if(typeof oracion==='string'){
    const n = contarOcurrencias(oracion, texto);
    if(n===0) R.error(id, `${ref}: objetivo "${texto}" NO aparece en la oración (¿error de copia?).`);
    else if(n>1) R.error(id, `${ref}: objetivo "${texto}" aparece ${n} veces en la oración: es ambiguo, reescribe la oración.`);
  }
  if(typeof funcion!=='string' || !funcion.trim()){ R.error(id, `${ref}: objetivo sin "funcion".`); return; }
  if(LAB_PROHIBIDAS[funcion]) R.error(id, `${ref}: función "${funcion}" PROHIBIDA → ${LAB_PROHIBIDAS[funcion]}.`);
  else if(!LAB_FUNCIONES.has(funcion)) R.error(id, `${ref}: función "${funcion}" no está en la lista válida del motor.`);
}

// Lee los identificadores de prueba definidos en js/data/pruebas-sintaxis.js.
// Ese archivo se escribe en F2·1; mientras no exista, solo se valida el FORMATO
// de los ids (así el lote semilla de F0·3 puede escribirse ya).
function cargarIdsPrueba(){
  const ruta = 'js/data/pruebas-sintaxis.js';
  if(!existsSync(ruta)) return null;
  try {
    const txt = readFileSync(ruta,'utf8');
    const ids = new Set();
    for(const m of txt.matchAll(/'(PRU-SINT-[A-Z]+-\d{2}|HEUR-[A-Z-]+)'/g)) ids.add(m[1]);
    for(const m of txt.matchAll(/"(PRU-SINT-[A-Z]+-\d{2}|HEUR-[A-Z-]+)"/g)) ids.add(m[1]);
    return ids.size ? ids : null;
  } catch { return null; }
}

function validarLaboratorio(cabecera, filas, R){
  const cId     = colIndex(cabecera,'ID');
  const cNivel  = colIndex(cabecera,'Nivel');
  const cCurso  = colIndex(cabecera,'Curso_Min');
  const cFunc   = colIndex(cabecera,'Funciones');
  const cTipos  = colIndex(cabecera,'Tipos_Item');
  const cJson   = colIndex(cabecera,'JSON_Reto');
  const cGris   = colIndex(cabecera,'Zona_Gris');
  const cActivo = colIndex(cabecera,'Activo');
  if(cJson<0){
    R.error('-', 'No encuentro la columna "JSON_Reto" en la cabecera. ¿Es el TSV del Laboratorio?');
    return;
  }
  const idsPrueba = cargarIdsPrueba();
  if(!idsPrueba) console.log('   (js/data/pruebas-sintaxis.js aún no existe: solo se valida el FORMATO de los prueba_id)');

  const idsVistos = new Map();

  filas.forEach((cols, i)=>{
    const fila = i+2;
    const idCol = (cols[cId]||'').trim();
    const id = `${idCol||'(sin ID)'} · fila ${fila}`;

    // ── Estructura del TSV ────────────────────────────────────────
    // Un número de columnas distinto al de la cabecera delata un salto de línea
    // o un tabulador dentro del JSON: el parser de TSV no los soporta.
    if(cols.length !== cabecera.length){
      R.error(id, `la fila tiene ${cols.length} columnas y la cabecera ${cabecera.length}: seguramente el JSON_Reto contiene un salto de línea o un tabulador. Debe caber en UNA línea.`);
      return;
    }

    // ── Columna ID ────────────────────────────────────────────────
    if(!idCol) R.error(id, 'sin ID en la columna ID.');
    else {
      if(!/^LB_\d{4}$/.test(idCol)) R.aviso(id, `ID "${idCol}" no sigue el formato LB_NNNN (4 dígitos).`);
      if(idsVistos.has(idCol)) R.error(id, `ID duplicado (también en fila ${idsVistos.get(idCol)}).`);
      else idsVistos.set(idCol, fila);
    }

    // ── Columna Activo ────────────────────────────────────────────
    const activo = (cols[cActivo]||'').trim().toUpperCase();
    if(cActivo>=0 && activo && !['TRUE','FALSE'].includes(activo))
      R.aviso(id, `Activo "${cols[cActivo]}" debería ser TRUE o FALSE.`);

    // ── JSON ──────────────────────────────────────────────────────
    const raw = (cols[cJson]||'').trim();
    if(!raw){ R.aviso(id, 'JSON_Reto vacío.'); return; }
    let o;
    try { o = JSON.parse(raw); }
    catch(e){ R.error(id, `JSON_Reto no es JSON válido: ${e.message}`); return; }

    if(o.schema_version && o.schema_version!=='1.0')
      R.aviso(id, `schema_version "${o.schema_version}" (se espera "1.0").`);
    if(o.id && idCol && o.id!==idCol)
      R.error(id, `el "id" del JSON ("${o.id}") no coincide con la columna ID ("${idCol}").`);

    // nivel (columna y JSON)
    const nivelCol = (cols[cNivel]||'').trim();
    if(nivelCol && !LAB_NIVEL.has(nivelCol))
      R.error(id, `Nivel (columna) "${nivelCol}" inválido (basico/medio/avanzado).`);
    const nivel = LAB_NIVEL.has(o.nivel) ? o.nivel : (LAB_NIVEL.has(nivelCol) ? nivelCol : null);
    if(!o.nivel) R.error(id, 'el JSON no tiene "nivel".');
    else if(!LAB_NIVEL.has(o.nivel)) R.error(id, `nivel (JSON) "${o.nivel}" inválido (basico/medio/avanzado).`);
    if(nivelCol && o.nivel && nivelCol!==o.nivel)
      R.error(id, `Nivel de la columna ("${nivelCol}") y del JSON ("${o.nivel}") no coinciden.`);

    // curso_min (columna y JSON)
    const cursoCol = (cols[cCurso]||'').trim();
    if(cursoCol && !LAB_CURSO.has(cursoCol))
      R.error(id, `Curso_Min (columna) "${cursoCol}" inválido (2E/3E/4E/1B).`);
    const cursoJson = o.metadatos?.curso_min;
    if(!cursoJson) R.aviso(id, 'metadatos.curso_min ausente.');
    else if(!LAB_CURSO.has(cursoJson)) R.error(id, `metadatos.curso_min "${cursoJson}" inválido (2E/3E/4E/1B).`);
    else if(cursoCol && cursoCol!==cursoJson)
      R.error(id, `Curso_Min de la columna ("${cursoCol}") y del JSON ("${cursoJson}") no coinciden.`);

    if(typeof o.titulo_problema!=='string' || !o.titulo_problema.trim())
      R.error(id, 'falta "titulo_problema".');

    // corpus
    const corpus = Array.isArray(o.corpus) ? o.corpus : [];
    if(corpus.length===0) R.error(id, 'sin array "corpus" (1-6 oraciones).');
    else if(corpus.length>6) R.aviso(id, `corpus de ${corpus.length} oraciones (el schema recomienda 1-6).`);

    // Puente de ida a Simples (§9, F2·3, 12-ago-2026): origen_oracion_id ya
    // NO es un código OR_NNNN (Oraciones_Banco nunca tuvo esa columna) —
    // es el texto literal de una de las oraciones de "corpus", byte a byte
    // idéntico al que buscará getOracionByTexto_ en el banco de Simples.
    const origenId = o.metadatos?.origen_oracion_id;
    if(origenId!==undefined && origenId!==null && origenId!=='') {
      if(typeof origenId!=='string') R.error(id, 'metadatos.origen_oracion_id debe ser texto.');
      else if(!corpus.includes(origenId))
        R.aviso(id, `metadatos.origen_oracion_id no coincide (byte a byte) con ninguna oración de "corpus" — el puente a Simples no encontrará esta oración en Oraciones_Banco si tampoco coincide allí.`);
    }

    // ── Ítems ─────────────────────────────────────────────────────
    const items = Array.isArray(o.items) ? o.items : [];
    if(items.length<3){ R.error(id, `solo ${items.length} ítem(s): el schema pide al menos 3.`); }

    let estacionPrevia = 0;
    const estacionesVistas = new Set();
    const tiposVistos = new Set();
    const funcionesVistas = new Set();
    let nJuicios = 0, nControlesGramaticales = 0, hayFrontera = false;

    items.forEach((it, k)=>{
      const ref = `ítem ${k+1}`;
      if(!it || typeof it!=='object'){ R.error(id, `${ref}: no es un objeto.`); return; }
      const tipo = it.tipo;
      const est = LAB_TIPO_ESTACION[tipo];
      if(!est){
        R.error(id, `${ref}: tipo "${tipo}" no es uno de los nueve del schema (${Object.keys(LAB_TIPO_ESTACION).join(', ')}).`);
        return;
      }
      tiposVistos.add(tipo);
      estacionesVistas.add(est);

      // Orden de estaciones no decreciente
      if(est < estacionPrevia)
        R.error(id, `${ref} (${tipo}, estación ${est}): va después de un ítem de estación ${estacionPrevia}. Los ítems deben ir ordenados por estación.`);
      estacionPrevia = Math.max(estacionPrevia, est);

      // fuente_id y peso
      if(it.fuente_id!==undefined && !/^(PM|AI)-SINT-\d{2}$/.test(it.fuente_id))
        R.aviso(id, `${ref}: fuente_id "${it.fuente_id}" no sigue el formato PM-SINT-NN o AI-SINT-NN.`);
      if(it.peso!==undefined && (typeof it.peso!=='number' || it.peso<=0))
        R.error(id, `${ref}: "peso" debe ser un número positivo.`);

      // ── Metalenguaje y terminología ─────────────────────────────
      const visibles = textosVisibles(it);
      if(typeof it.titulo_problema==='string') visibles.push(it.titulo_problema);
      const metaProhibido =
        est===1 ||
        (est===2 && nivel==='basico' && ['manipulacion','juicio'].includes(tipo)) ||
        (est===2 && nivel==='basico' && ['par_minimo','analisis_inverso'].includes(tipo));
      for(const txt of visibles){
        const hallado = buscarMetalenguaje(txt);
        if(hallado){
          if(metaProhibido)
            R.error(id, `${ref} (${tipo}, estación ${est}${nivel?`, nivel ${nivel}`:''}): usa metalenguaje "${hallado}" donde está prohibido → "${txt.slice(0,60)}…"`);
          else if(est===2 && tipo==='manipulacion')
            R.aviso(id, `${ref} (manipulacion): usa metalenguaje "${hallado}"; en la estación 2 es preferible evitarlo.`);
        }
        const bajo = txt.toLowerCase();
        for(const [mal, msg] of Object.entries(LAB_TERMINOLOGIA)){
          if(bajo.includes(mal)) R.error(id, `${ref}: "${mal}" en un texto visible → ${msg}.`);
        }
      }
      // El título del reto también sigue la regla del nivel basico.
      if(nivel==='basico' && k===0 && typeof o.titulo_problema==='string'){
        const h = buscarMetalenguaje(o.titulo_problema);
        if(h) R.error(id, `titulo_problema usa metalenguaje "${h}" y el nivel es basico.`);
      }

      // ── Por tipo ────────────────────────────────────────────────
      switch(tipo){
        case 'valencia': {
          if(typeof it.verbo!=='string' || !it.verbo.trim()) R.error(id, `${ref}: falta "verbo".`);
          if(![1,2,3].includes(it.respuesta)) R.error(id, `${ref}: "respuesta" debe ser 1, 2 o 3 (es ${JSON.stringify(it.respuesta)}).`);
          if(typeof it.feedback!=='string' || !it.feedback.trim())
            R.error(id, `${ref}: "feedback" es obligatorio en valencia (cierra el descubrimiento).`);
          if(it.actores!==undefined){
            if(!Array.isArray(it.actores)){ R.error(id, `${ref}: "actores" debe ser un array.`); break; }
            it.actores.forEach((a,ai)=>{
              if(!a || typeof a.texto!=='string' || !a.texto.trim()) R.error(id, `${ref} actor ${ai+1}: sin "texto".`);
              if(!a || !LAB_ROLES_VALENCIA.has(a.rol)) R.error(id, `${ref} actor ${ai+1}: rol "${a?.rol}" inválido (${[...LAB_ROLES_VALENCIA].join('/')}).`);
            });
            const nActores = it.actores.filter(a=>a && a.rol!=='donde_cuando_como').length;
            if(nActores!==it.respuesta)
              R.error(id, `${ref}: hay ${nActores} actor(es) pero "respuesta" dice ${it.respuesta}.`);
          }
          break;
        }
        case 'que_cambia':
        case 'par_minimo': {
          if(typeof it.oracion_a!=='string' || !it.oracion_a.trim()) R.error(id, `${ref}: falta "oracion_a".`);
          if(typeof it.oracion_b!=='string' || !it.oracion_b.trim()) R.error(id, `${ref}: falta "oracion_b".`);
          if(it.oracion_a && it.oracion_b && it.oracion_a===it.oracion_b)
            R.error(id, `${ref}: oracion_a y oracion_b son idénticas (un par mínimo necesita UN cambio).`);
          if(typeof it.cambio!=='string' || !it.cambio.includes('→'))
            R.aviso(id, `${ref}: "cambio" debería tener el formato "antes → después".`);
          validarOpciones(R, id, ref, it.opciones, 1);
          break;
        }
        case 'intruso': {
          const ors = Array.isArray(it.oraciones) ? it.oraciones : [];
          if(ors.length<3) R.error(id, `${ref}: "oraciones" necesita al menos 3 para que haya serie.`);
          if(typeof it.respuesta!=='string')
            R.error(id, `${ref}: "respuesta" debe ser el TEXTO de la oración intrusa, no su posición.`);
          else if(!ors.includes(it.respuesta))
            R.error(id, `${ref}: la "respuesta" no está entre las "oraciones".`);
          if(typeof it.feedback!=='string' || !it.feedback.trim())
            R.error(id, `${ref}: "feedback" es obligatorio en intruso.`);
          if(it.opciones!==undefined) validarOpciones(R, id, ref, it.opciones, 1);
          break;
        }
        case 'manipulacion': {
          if(!LAB_MANIPULACIONES.has(it.manipulacion))
            R.error(id, `${ref}: "manipulacion" inválida ("${it.manipulacion}"); debe ser ${[...LAB_MANIPULACIONES].join('/')}.`);
          if(typeof it.oracion!=='string' || !it.oracion.trim()) R.error(id, `${ref}: falta "oracion".`);
          validarObjetivo(R, id, ref, it.objetivo, it.oracion);
          if(it.objetivo?.funcion) funcionesVistas.add(it.objetivo.funcion);
          validarOpciones(R, id, ref, it.opciones, 1);
          if(it.oracion && corpus.length && !corpus.includes(it.oracion))
            R.aviso(id, `${ref}: la oración no está en el "corpus" del reto.`);
          // Ponderación de fronteras discriminantes
          if(it.objetivo?.funcion && LAB_FUNC_DISCRIMINANTES.has(it.objetivo.funcion) && it.peso!==2)
            R.aviso(id, `${ref}: función "${it.objetivo.funcion}" es de frontera discriminante y el ítem no lleva peso:2.`);
          break;
        }
        case 'juicio': {
          nJuicios++;
          if(typeof it.oracion!=='string' || !it.oracion.trim()) R.error(id, `${ref}: falta "oracion".`);
          if(!LAB_VEREDICTOS.has(it.veredicto)){
            R.error(id, `${ref}: "veredicto" inválido ("${it.veredicto}"); debe ser ${[...LAB_VEREDICTOS].join('/')}.`);
            break;
          }
          const esGramatical = it.veredicto==='gramatical';
          if(esGramatical) nControlesGramaticales++;
          // causa
          if(esGramatical){
            if(it.causa!==undefined) R.error(id, `${ref}: veredicto "gramatical" no debe llevar "causa".`);
            if(it.gemela_correcta!==undefined) R.error(id, `${ref}: veredicto "gramatical" no debe llevar "gemela_correcta".`);
            if(it.opciones_causa!==undefined) R.error(id, `${ref}: veredicto "gramatical" no debe llevar "opciones_causa".`);
          } else {
            const spec = LAB_CAUSAS[it.causa];
            if(!it.causa) R.error(id, `${ref}: falta "causa" (obligatoria salvo en veredicto "gramatical").`);
            else if(!spec) R.error(id, `${ref}: causa "${it.causa}" no está entre las 22 del schema.`);
            else {
              if(LAB_ORDEN_NIVEL[spec.nivelMin] > (LAB_ORDEN_NIVEL[nivel]||0))
                R.error(id, `${ref}: causa "${it.causa}" es de nivel ${spec.nivelMin} y el reto es ${nivel}.`);
              if(spec.veredicto!==it.veredicto)
                R.error(id, `${ref}: causa "${it.causa}" corresponde al veredicto "${spec.veredicto}", no a "${it.veredicto}".`);
            }
            if(typeof it.gemela_correcta!=='string' || !it.gemela_correcta.trim())
              R.error(id, `${ref}: veredicto "${it.veredicto}" exige "gemela_correcta" (nunca el error solo en pantalla).`);
            const opc = Array.isArray(it.opciones_causa) ? it.opciones_causa : [];
            if(opc.length<2) R.error(id, `${ref}: "opciones_causa" necesita al menos 2 causas.`);
            else if(opc.length>4) R.aviso(id, `${ref}: ${opc.length} opciones_causa (el schema recomienda 2-4).`);
            opc.forEach(c=>{ if(!LAB_CAUSAS[c]) R.error(id, `${ref}: opciones_causa contiene "${c}", que no es una causa del schema.`); });
            if(it.causa && opc.length && !opc.includes(it.causa))
              R.error(id, `${ref}: la "causa" correcta no está entre las "opciones_causa".`);
          }
          if(typeof it.explicacion!=='string' || !it.explicacion.trim())
            R.error(id, `${ref}: falta "explicacion" (qué se rompe, en lenguaje de alumno).`);
          break;
        }
        case 'analisis_inverso': {
          if(typeof it.consigna!=='string' || !it.consigna.trim()) R.error(id, `${ref}: falta "consigna".`);
          const piezas = Array.isArray(it.piezas) ? it.piezas : [];
          const slots  = Array.isArray(it.slots)  ? it.slots  : [];
          if(piezas.length<3) R.error(id, `${ref}: "piezas" necesita al menos 3.`);
          if(slots.length===0){ R.error(id, `${ref}: sin "slots".`); break; }
          const usadas = new Set();
          slots.forEach((s,si)=>{
            const sref = `${ref} slot ${si+1}`;
            if(!s || typeof s.rol!=='string' || !s.rol.trim()){ R.error(id, `${sref}: sin "rol".`); return; }
            // En basico los roles van en paráfrasis; en medio/avanzado deben ser
            // funciones reales del motor.
            if(nivel!=='basico'){
              if(LAB_PROHIBIDAS[s.rol]) R.error(id, `${sref}: rol "${s.rol}" PROHIBIDO → ${LAB_PROHIBIDAS[s.rol]}.`);
              else if(!LAB_FUNCIONES.has(s.rol)) R.error(id, `${sref}: rol "${s.rol}" no está en la lista de funciones del motor.`);
              else funcionesVistas.add(s.rol);
            }
            const acepta = Array.isArray(s.acepta) ? s.acepta : [];
            if(acepta.length===0){ R.error(id, `${sref}: "acepta" vacío.`); return; }
            acepta.forEach(a=>{
              if(!piezas.includes(a)) R.error(id, `${sref}: acepta "${a}", que no está en "piezas".`);
              else usadas.add(a);
            });
          });
          if(usadas.size >= piezas.length)
            R.error(id, `${ref}: todas las piezas se usan en algún slot. Debe sobrar al menos una como distractor.`);
          if(it.orden!==undefined && !LAB_ORDENES.has(it.orden))
            R.error(id, `${ref}: "orden" debe ser fijo o libre.`);
          if(it.destino!==undefined && !LAB_DESTINOS.has(it.destino))
            R.error(id, `${ref}: "destino" debe ser reto o caja_pruebas.`);
          break;
        }
        case 'frontera': {
          hayFrontera = true;
          if(typeof it.oracion!=='string' || !it.oracion.trim()) R.error(id, `${ref}: falta "oracion".`);
          if(typeof it.variante!=='string' || !it.variante.trim()) R.error(id, `${ref}: falta "variante" (el otro análisis posible).`);
          // Dos correctas: es lo que define la zona gris.
          validarOpciones(R, id, ref, it.opciones, 2);
          if(typeof it.explicacion!=='string' || !it.explicacion.trim())
            R.error(id, `${ref}: falta "explicacion" (por qué las dos valen).`);
          break;
        }
        case 'etiqueta_prueba': {
          if(typeof it.oracion!=='string' || !it.oracion.trim()) R.error(id, `${ref}: falta "oracion".`);
          validarObjetivo(R, id, ref, it.objetivo, it.oracion);
          if(it.objetivo?.funcion) funcionesVistas.add(it.objetivo.funcion);
          if(!LAB_ENUNCIADOS.has(it.enunciado))
            R.error(id, `${ref}: "enunciado" debe ser tecnico o simple.`);
          else if(nivel==='basico' && it.enunciado!=='simple')
            R.error(id, `${ref}: en nivel basico el enunciado debe ser "simple" (el alumno no ve etiquetas).`);
          // prueba_id
          const pid = it.prueba_id;
          if(typeof pid!=='string' || !pid.trim()) R.error(id, `${ref}: falta "prueba_id".`);
          else {
            if(/^HEUR-/.test(pid)) R.error(id, `${ref}: "${pid}" es un heurístico rechazado: solo puede ir en "distractores", nunca como respuesta correcta.`);
            else if(!/^PRU-SINT-[A-Z]+-\d{2}$/.test(pid)) R.error(id, `${ref}: prueba_id "${pid}" no sigue el formato PRU-SINT-XXX-NN.`);
            else if(idsPrueba && !idsPrueba.has(pid)) R.error(id, `${ref}: prueba_id "${pid}" no está definido en js/data/pruebas-sintaxis.js.`);
          }
          const dist = Array.isArray(it.distractores) ? it.distractores : [];
          if(dist.length<2 || dist.length>3) R.error(id, `${ref}: "distractores" debe tener 2 o 3 ids (tiene ${dist.length}).`);
          dist.forEach(d=>{
            if(typeof d!=='string' || !(/^PRU-SINT-[A-Z]+-\d{2}$/.test(d) || /^HEUR-[A-Z-]+$/.test(d)))
              R.error(id, `${ref}: distractor "${d}" no sigue el formato PRU-SINT-XXX-NN ni HEUR-XXX.`);
            else if(idsPrueba && !idsPrueba.has(d)) R.error(id, `${ref}: distractor "${d}" no está definido en js/data/pruebas-sintaxis.js.`);
          });
          if(dist.length && !dist.some(d=>/^HEUR-/.test(d)))
            R.aviso(id, `${ref}: ningún distractor es un heurístico rechazado (HEUR-*); el schema pide al menos uno.`);
          if(pid && dist.includes(pid)) R.error(id, `${ref}: "${pid}" está a la vez como respuesta y como distractor.`);
          break;
        }
      }
    });

    // ── Reglas de composición del reto ────────────────────────────
    if(items.length){
      if(!estacionesVistas.has(2)) R.error(id, 'sin ningún ítem de estación 2 (manipulación): es el núcleo del reto.');
      if(!estacionesVistas.has(3)) R.error(id, 'sin ningún ítem de estación 3: el reto no alimenta la Caja de Pruebas.');
      if(!estacionesVistas.has(1)) R.aviso(id, 'sin ningún ítem de estación 1 (observación).');
      if(nJuicios===0) R.error(id, 'sin ningún juicio de gramaticalidad (el schema pide al menos 1 por reto).');
      if(nJuicios>2) R.aviso(id, `${nJuicios} juicios de gramaticalidad (el schema recomienda 1-2 por reto).`);
      if(nJuicios>=3 && nControlesGramaticales===0)
        R.error(id, `${nJuicios} juicios y ninguno con veredicto "gramatical": hace falta un control, o el alumno responde "mal" sin mirar.`);
    }
    // zona_gris ⟺ hay un ítem frontera
    if(o.zona_gris===true && !hayFrontera)
      R.error(id, 'zona_gris:true pero no hay ningún ítem de tipo "frontera".');
    if(hayFrontera && o.zona_gris!==true)
      R.error(id, 'hay un ítem "frontera" pero zona_gris no es true (esa bandera es la que lo excluye del examen).');
    const grisCol = (cols[cGris]||'').trim().toUpperCase();
    if(cGris>=0 && grisCol==='TRUE' && o.zona_gris!==true)
      R.error(id, 'columna Zona_Gris TRUE pero zona_gris del JSON no es true.');
    if(cGris>=0 && grisCol!=='TRUE' && o.zona_gris===true)
      R.aviso(id, 'zona_gris:true en el JSON pero la columna Zona_Gris no dice TRUE.');

    // ── Columnas derivadas vs JSON ────────────────────────────────
    const partes = s => String(s||'').split(';').map(x=>x.trim()).filter(Boolean);
    if(cTipos>=0){
      const declarados = new Set(partes(cols[cTipos]));
      if(declarados.size){
        for(const t of tiposVistos) if(!declarados.has(t))
          R.aviso(id, `Tipos_Item no incluye "${t}", que sí está en el JSON.`);
        for(const t of declarados) if(!tiposVistos.has(t))
          R.aviso(id, `Tipos_Item declara "${t}", que no aparece en el JSON.`);
      } else R.aviso(id, 'columna Tipos_Item vacía.');
    }
    if(cFunc>=0){
      const declaradas = new Set(partes(cols[cFunc]));
      if(declaradas.size){
        for(const f of funcionesVistas) if(!declaradas.has(f))
          R.aviso(id, `Funciones no incluye "${f}", que sí está en el JSON.`);
      } else if(funcionesVistas.size) R.aviso(id, 'columna Funciones vacía.');
    }
  });
}

// ════════════════════════════════════════════════════════════════════
//  VALIDADOR DE FORMACIÓN (schema 1.0)
//  Especificación: docs/Schema_Formacion_v1.0.md
// ════════════════════════════════════════════════════════════════════

// Lee los identificadores de prueba de js/data/pruebas-morfologia.js. Ese
// archivo se escribe en F2·1; mientras no exista, solo se valida el FORMATO
// (así el lote semilla de F0·3 puede escribirse ya).
function cargarIdsPruebaMorf(){
  const ruta = 'js/data/pruebas-morfologia.js';
  if(!existsSync(ruta)) return null;
  try {
    const txt = readFileSync(ruta,'utf8');
    const ids = new Set();
    for(const m of txt.matchAll(/['"](PRU-MORF-[A-Z]+-\d{2}|HEUR-[A-Z-]+)['"]/g)) ids.add(m[1]);
    return ids.size ? ids : null;
  } catch { return null; }
}

// Quita los guiones de posición de una pieza ("des-" → "des", "-ado" → "ado").
function limpiarPieza(p){ return String(p||'').replace(/^-+|-+$/g,''); }

function validarFormacion(cabecera, filas, R){
  const cId     = colIndex(cabecera,'ID');
  const cNivel  = colIndex(cabecera,'Nivel');
  const cCurso  = colIndex(cabecera,'Curso_Min');
  const cProc   = colIndex(cabecera,'Procedimientos');
  const cTipos  = colIndex(cabecera,'Tipos_Item');
  const cJson   = colIndex(cabecera,'JSON_Reto');
  const cGris   = colIndex(cabecera,'Zona_Gris');
  const cActivo = colIndex(cabecera,'Activo');
  if(cJson<0){
    R.error('-', 'No encuentro la columna "JSON_Reto" en la cabecera. ¿Es el TSV de Formación?');
    return;
  }
  const idsPrueba = cargarIdsPruebaMorf();
  if(!idsPrueba) console.log('   (js/data/pruebas-morfologia.js aún no existe: solo se valida el FORMATO de los prueba_id)');

  const idsVistos = new Map();

  filas.forEach((cols, i)=>{
    const fila = i+2;
    const idCol = (cols[cId]||'').trim();
    const id = `${idCol||'(sin ID)'} · fila ${fila}`;

    // El JSON debe caber en una línea: un recuento de columnas distinto al de
    // la cabecera delata un salto de línea o un tabulador dentro del campo.
    if(cols.length !== cabecera.length){
      R.error(id, `la fila tiene ${cols.length} columnas y la cabecera ${cabecera.length}: seguramente el JSON_Reto contiene un salto de línea o un tabulador. Debe caber en UNA línea.`);
      return;
    }

    if(!idCol) R.error(id, 'sin ID en la columna ID.');
    else {
      if(!/^FP_\d{4}$/.test(idCol)) R.aviso(id, `ID "${idCol}" no sigue el formato FP_NNNN (4 dígitos).`);
      if(idsVistos.has(idCol)) R.error(id, `ID duplicado (también en fila ${idsVistos.get(idCol)}).`);
      else idsVistos.set(idCol, fila);
    }

    const activo = (cols[cActivo]||'').trim().toUpperCase();
    if(cActivo>=0 && activo && !['TRUE','FALSE'].includes(activo))
      R.aviso(id, `Activo "${cols[cActivo]}" debería ser TRUE o FALSE.`);

    const raw = (cols[cJson]||'').trim();
    if(!raw){ R.aviso(id, 'JSON_Reto vacío.'); return; }
    let o;
    try { o = JSON.parse(raw); }
    catch(e){ R.error(id, `JSON_Reto no es JSON válido: ${e.message}`); return; }

    if(o.schema_version && o.schema_version!=='1.0')
      R.aviso(id, `schema_version "${o.schema_version}" (se espera "1.0").`);
    if(o.id && idCol && o.id!==idCol)
      R.error(id, `el "id" del JSON ("${o.id}") no coincide con la columna ID ("${idCol}").`);

    // nivel
    const nivelCol = (cols[cNivel]||'').trim();
    if(nivelCol && !FP_NIVEL.has(nivelCol))
      R.error(id, `Nivel (columna) "${nivelCol}" inválido (basico/medio/avanzado).`);
    const nivel = FP_NIVEL.has(o.nivel) ? o.nivel : (FP_NIVEL.has(nivelCol) ? nivelCol : null);
    if(!o.nivel) R.error(id, 'el JSON no tiene "nivel".');
    else if(!FP_NIVEL.has(o.nivel)) R.error(id, `nivel (JSON) "${o.nivel}" inválido (basico/medio/avanzado).`);
    if(nivelCol && o.nivel && nivelCol!==o.nivel)
      R.error(id, `Nivel de la columna ("${nivelCol}") y del JSON ("${o.nivel}") no coinciden.`);
    const nivelNum = FP_ORDEN_NIVEL[nivel] || 0;

    // curso_min
    const cursoCol = (cols[cCurso]||'').trim();
    if(cursoCol && !FP_CURSO.has(cursoCol))
      R.error(id, `Curso_Min (columna) "${cursoCol}" inválido (1E/2E/3E/4E/1B).`);
    const cursoJson = o.metadatos?.curso_min;
    if(!cursoJson) R.aviso(id, 'metadatos.curso_min ausente.');
    else if(!FP_CURSO.has(cursoJson)) R.error(id, `metadatos.curso_min "${cursoJson}" inválido (1E/2E/3E/4E/1B).`);
    else if(cursoCol && cursoCol!==cursoJson)
      R.error(id, `Curso_Min de la columna ("${cursoCol}") y del JSON ("${cursoJson}") no coinciden.`);

    if(typeof o.titulo_problema!=='string' || !o.titulo_problema.trim())
      R.error(id, 'falta "titulo_problema".');

    // corpus (3-8 palabras)
    const corpus = Array.isArray(o.corpus) ? o.corpus : [];
    if(corpus.length<3) R.error(id, `"corpus" tiene ${corpus.length} palabra(s): el schema pide 3-8.`);
    else if(corpus.length>8) R.aviso(id, `corpus de ${corpus.length} palabras (el schema recomienda 3-8).`);

    // ── Ítems ─────────────────────────────────────────────────────
    const items = Array.isArray(o.items) ? o.items : [];
    if(items.length<3) R.error(id, `solo ${items.length} ítem(s): el schema pide al menos 3.`);

    let estacionPrevia = 0;
    const estacionesVistas = new Set();
    const tiposVistos = new Set();
    const procsVistos = new Set();
    let nJuicios = 0, nControles = 0, hayFrontera = false;

    // Comprueba un procedimiento contra la lista cerrada y el nivel.
    const chkProc = (ref, proc)=>{
      if(typeof proc!=='string' || !proc.trim()){ R.error(id, `${ref}: falta "procedimiento".`); return; }
      const min = FP_PROCEDIMIENTOS[proc];
      if(!min){ R.error(id, `${ref}: procedimiento "${proc}" no está entre los 12 del schema.`); return; }
      if(FP_ORDEN_NIVEL[min] > nivelNum)
        R.error(id, `${ref}: procedimiento "${proc}" es de nivel ${min} y el reto es ${nivel}.`);
      procsVistos.add(proc);
    };

    items.forEach((it, k)=>{
      const ref = `ítem ${k+1}`;
      if(!it || typeof it!=='object'){ R.error(id, `${ref}: no es un objeto.`); return; }
      const tipo = it.tipo;
      let est = FP_TIPO_ESTACION[tipo];
      if(!est){
        R.error(id, `${ref}: tipo "${tipo}" no es uno de los diez del schema (${Object.keys(FP_TIPO_ESTACION).join(', ')}).`);
        return;
      }
      // En `piezas` la estación la decide el modo.
      if(tipo==='piezas'){
        const e = FP_MODOS_PIEZAS[it.modo];
        if(!e){ R.error(id, `${ref}: "modo" inválido ("${it.modo}"); debe ser cortar/etiquetar/capas.`); return; }
        est = e;
      }
      tiposVistos.add(tipo);
      estacionesVistas.add(est);

      if(est < estacionPrevia)
        R.error(id, `${ref} (${tipo}, estación ${est}): va después de un ítem de estación ${estacionPrevia}. Los ítems deben ir ordenados por estación.`);
      estacionPrevia = Math.max(estacionPrevia, est);

      if(it.fuente_id!==undefined && !/^PM-MORF-\d{2}$/.test(it.fuente_id))
        R.aviso(id, `${ref}: fuente_id "${it.fuente_id}" no sigue el formato PM-MORF-NN.`);
      if(it.peso!==undefined && (typeof it.peso!=='number' || it.peso<=0))
        R.error(id, `${ref}: "peso" debe ser un número positivo.`);

      // ── Metalenguaje y terminología ─────────────────────────────
      const visibles = [];
      const push = v => { if(typeof v==='string' && v.trim()) visibles.push(v); };
      push(it.feedback); push(it.explicacion);
      (it.opciones||[]).forEach(op=>{ if(op){ push(op.texto); push(op.micro); } });
      (it.cestas||[]).forEach(c=>{ if(c) push(c.nombre); });
      (it.sobrantes||[]).forEach(s=>{ if(s) push(s.micro); });
      (it.rebotes||[]).forEach(s=>{ if(s) push(s.micro); });
      (it.pasos||[]).forEach(p=>{ if(p) push(p.pregunta); });
      if(it.alternativa_rechazada) push(it.alternativa_rechazada.micro);

      const metaProhibido = est===1 ||
        (est===2 && nivel==='basico' && ['piezas','monta','par_minimo','juicio'].includes(tipo));
      for(const txt of visibles){
        const hallado = buscarTermino(txt, FP_META_PALABRAS);
        if(hallado){
          if(metaProhibido)
            R.error(id, `${ref} (${tipo}, estación ${est}${nivel?`, nivel ${nivel}`:''}): usa metalenguaje "${hallado}" donde está prohibido → "${txt.slice(0,60)}…"`);
          // En medio/avanzado el aviso solo aplica a los ítems de manipulación
          // pura. `frontera`, `juicio` y `par_minimo` quedan exentos: su
          // contenido ES la comparación de etiquetas (un caso frontera pregunta
          // literalmente "¿compuesta o parasintética?"), así que no se pueden
          // escribir sin nombrarlas.
          else if(est===2 && ['piezas','monta','cadena'].includes(tipo))
            R.aviso(id, `${ref} (${tipo}): usa metalenguaje "${hallado}"; en la estación 2 es preferible evitarlo.`);
        }
        const bajo = txt.toLowerCase();
        for(const [mal, msg] of Object.entries(FP_TERMINOLOGIA)){
          if(bajo.includes(mal)) R.error(id, `${ref}: "${mal}" en un texto visible → ${msg}.`);
        }
      }
      if(k===0 && nivel==='basico' && typeof o.titulo_problema==='string'){
        const h = buscarTermino(o.titulo_problema, FP_META_PALABRAS);
        if(h) R.error(id, `titulo_problema usa metalenguaje "${h}" y el nivel es basico.`);
      }

      // ── Por tipo ────────────────────────────────────────────────
      switch(tipo){
        case 'agrupa': {
          if(!FP_CRITERIOS.has(it.criterio))
            R.error(id, `${ref}: "criterio" debe ser familia_lexica o pieza_comun (es "${it.criterio}").`);
          const cestas = Array.isArray(it.cestas) ? it.cestas : [];
          if(cestas.length<2 || cestas.length>3)
            R.error(id, `${ref}: "cestas" debe tener 2 o 3 (tiene ${cestas.length}).`);
          const vistas = new Map();
          cestas.forEach((c, ci)=>{
            const cref = `${ref} cesta ${ci+1}`;
            if(!c || typeof c.nombre!=='string' || !c.nombre.trim()) R.error(id, `${cref}: sin "nombre".`);
            const pal = Array.isArray(c?.palabras) ? c.palabras : [];
            if(pal.length<2) R.error(id, `${cref}: necesita al menos 2 palabras.`);
            pal.forEach(p=>{
              if(vistas.has(p)) R.error(id, `${ref}: la palabra "${p}" está en dos cestas (${vistas.get(p)} y ${ci+1}).`);
              else vistas.set(p, ci+1);
            });
          });
          (Array.isArray(it.sobrantes)?it.sobrantes:[]).forEach((s,si)=>{
            if(!s || typeof s.palabra!=='string'){ R.error(id, `${ref} sobrante ${si+1}: sin "palabra".`); return; }
            if(typeof s.micro!=='string' || !s.micro.trim()) R.error(id, `${ref} sobrante ${si+1}: sin "micro".`);
            if(!vistas.has(s.palabra)) R.aviso(id, `${ref}: el sobrante "${s.palabra}" no aparece en ninguna cesta.`);
          });
          break;
        }
        case 'intruso': {
          const pal = Array.isArray(it.palabras) ? it.palabras : [];
          if(pal.length<3) R.error(id, `${ref}: "palabras" necesita al menos 3 para que haya serie.`);
          if(typeof it.respuesta!=='string')
            R.error(id, `${ref}: "respuesta" debe ser el TEXTO de la palabra intrusa, no su posición.`);
          else if(!pal.includes(it.respuesta))
            R.error(id, `${ref}: la "respuesta" no está entre las "palabras".`);
          if(typeof it.feedback!=='string' || !it.feedback.trim())
            R.error(id, `${ref}: "feedback" es obligatorio en intruso.`);
          if(it.opciones!==undefined) validarOpciones(R, id, ref, it.opciones, 1);
          break;
        }
        case 'piezas': {
          const palabra = it.palabra;
          if(typeof palabra!=='string' || !palabra.trim()){ R.error(id, `${ref}: falta "palabra".`); break; }
          // El reto debe girar sobre su corpus. No se comprueba en `agrupa`
          // (sus cestas traen distractores de fuera a propósito) ni en `juicio`
          // ni `par_minimo` (usan formas que no existen o variantes).
          if(corpus.length && !corpus.includes(palabra))
            R.aviso(id, `${ref}: la palabra "${palabra}" no está en el "corpus" del reto.`);
          const cortes = Array.isArray(it.cortes) ? it.cortes : [];
          if(cortes.length<2) R.error(id, `${ref}: "cortes" necesita al menos 2 trozos.`);
          else if(cortes.join('')!==palabra)
            R.error(id, `${ref}: los cortes ["${cortes.join('","')}"] dan "${cortes.join('')}" y la palabra es "${palabra}".`);
          (Array.isArray(it.tolerancia)?it.tolerancia:[]).forEach(t=>{
            const sin = String(t).replace(/\|/g,'');
            if(sin!==palabra) R.error(id, `${ref}: la tolerancia "${t}" da "${sin}" y la palabra es "${palabra}".`);
          });
          if(it.modo==='etiquetar'){
            const et = Array.isArray(it.etiquetas) ? it.etiquetas : [];
            if(et.length!==cortes.length)
              R.error(id, `${ref}: hay ${cortes.length} cortes y ${et.length} etiquetas: deben ser tantas como trozos.`);
            et.forEach((e,ei)=>{
              const min = FP_PIEZAS[e];
              if(!min) R.error(id, `${ref} etiqueta ${ei+1}: "${e}" no es un tipo de pieza del schema.`);
              else if(FP_ORDEN_NIVEL[min] > nivelNum)
                R.error(id, `${ref} etiqueta ${ei+1}: "${e}" es de nivel ${min} y el reto es ${nivel}.`);
            });
          }
          if(it.modo==='capas'){
            const capas = Array.isArray(it.capas) ? it.capas : [];
            if(capas.length<2) R.error(id, `${ref}: "capas" necesita al menos 2 pasos.`);
            else {
              capas.forEach((c,ci)=>{
                if(!c || typeof c.forma!=='string' || !c.forma.trim()) R.error(id, `${ref} capa ${ci+1}: sin "forma".`);
                if(!c || typeof c.existe!=='boolean') R.error(id, `${ref} capa ${ci+1}: "existe" debe ser true o false.`);
                else if(c.existe!==true) R.error(id, `${ref} capa ${ci+1}: "existe" debe ser "true" en "capas[]" (la forma inexistente va en "alternativa_rechazada", §12.3).`);
              });
              const ultima = capas[capas.length-1];
              if(ultima && ultima.forma!==palabra)
                R.error(id, `${ref}: la última capa es "${ultima.forma}" y debería ser la palabra completa ("${palabra}").`);
            }
            const alt = it.alternativa_rechazada;
            if(alt!==undefined){
              if(!Array.isArray(alt.capas) || alt.capas.length<2)
                R.error(id, `${ref}: "alternativa_rechazada.capas" necesita al menos 2 formas.`);
              else if(capas.length && JSON.stringify(alt.capas)===JSON.stringify(capas.map(c=>c.forma)))
                R.error(id, `${ref}: "alternativa_rechazada.capas" es idéntica a "capas[].forma": no aporta ningún distractor.`);
              if(typeof alt.micro!=='string' || !alt.micro.trim())
                R.error(id, `${ref}: "alternativa_rechazada" sin "micro" (hay que explicar por qué NO es esa).`);
            }
          }
          break;
        }
        case 'monta': {
          const piezas = Array.isArray(it.piezas) ? it.piezas : [];
          if(piezas.length<3) R.error(id, `${ref}: "piezas" necesita al menos 3.`);
          const textos = new Set();
          piezas.forEach((p,pi)=>{
            if(!p || typeof p.texto!=='string' || !p.texto.trim()){ R.error(id, `${ref} pieza ${pi+1}: sin "texto".`); return; }
            textos.add(p.texto);
            const min = FP_PIEZAS[p.tipo];
            if(!min) R.error(id, `${ref} pieza ${pi+1}: tipo "${p.tipo}" no es un tipo de pieza del schema.`);
            else if(FP_ORDEN_NIVEL[min] > nivelNum)
              R.error(id, `${ref} pieza ${pi+1}: tipo "${p.tipo}" es de nivel ${min} y el reto es ${nivel}.`);
          });
          const validas = Array.isArray(it.validas) ? it.validas : [];
          if(validas.length<1) R.error(id, `${ref}: "validas" necesita al menos 1 palabra construible.`);
          validas.forEach((v,vi)=>{
            const vref = `${ref} valida ${vi+1}`;
            if(!v || typeof v.palabra!=='string' || !v.palabra.trim()){ R.error(id, `${vref}: sin "palabra".`); return; }
            const usa = Array.isArray(v.usa) ? v.usa : [];
            if(usa.length<2) R.error(id, `${vref}: "usa" necesita al menos 2 piezas.`);
            usa.forEach(u=>{ if(!textos.has(u)) R.error(id, `${vref}: usa "${u}", que no está en "piezas".`); });
            // AVISO y no ERROR: la alomorfía es real (caza/cacería, piedra/piedrecita).
            const concat = usa.map(limpiarPieza).join('');
            if(concat && concat!==v.palabra)
              R.aviso(id, `${vref}: las piezas dan "${concat}" y la palabra es "${v.palabra}" (¿alomorfo, o error de copia?).`);
            chkProc(vref, v.procedimiento);
          });
          (Array.isArray(it.rebotes)?it.rebotes:[]).forEach((b,bi)=>{
            const bref = `${ref} rebote ${bi+1}`;
            const usa = Array.isArray(b?.usa) ? b.usa : [];
            if(usa.length<1) R.error(id, `${bref}: sin "usa".`);
            usa.forEach(u=>{ if(!textos.has(u)) R.error(id, `${bref}: usa "${u}", que no está en "piezas".`); });
            if(typeof b?.micro!=='string' || !b.micro.trim()) R.error(id, `${bref}: sin "micro" (hay que explicar qué falta).`);
          });
          if(it.minimo!==undefined && (typeof it.minimo!=='number' || it.minimo<1 || it.minimo>validas.length))
            R.error(id, `${ref}: "minimo" debe estar entre 1 y el número de válidas (${validas.length}).`);
          break;
        }
        case 'par_minimo': {
          if(typeof it.forma_a!=='string' || !it.forma_a.trim()) R.error(id, `${ref}: falta "forma_a".`);
          if(typeof it.forma_b!=='string' || !it.forma_b.trim()) R.error(id, `${ref}: falta "forma_b".`);
          if(it.forma_a && it.forma_b && it.forma_a===it.forma_b)
            R.error(id, `${ref}: forma_a y forma_b son idénticas (un par mínimo necesita UN cambio).`);
          if(typeof it.cambio!=='string' || !it.cambio.includes('→'))
            R.aviso(id, `${ref}: "cambio" debería tener el formato "antes → después".`);
          validarOpciones(R, id, ref, it.opciones, 1);
          break;
        }
        case 'cadena': {
          const pasos = Array.isArray(it.pasos) ? it.pasos : [];
          if(pasos.length<3) R.error(id, `${ref}: "pasos" necesita al menos 3 (es una escalera).`);
          for(let pi=1; pi<pasos.length; pi++){
            if(typeof pasos[pi]!=='string' || typeof pasos[pi-1]!=='string') continue;
            if(!pasos[pi].includes(pasos[pi-1]))
              R.aviso(id, `${ref}: "${pasos[pi]}" no contiene a "${pasos[pi-1]}" (¿alomorfo, o pasos desordenados?).`);
          }
          break;
        }
        case 'juicio': {
          nJuicios++;
          if(typeof it.forma!=='string' || !it.forma.trim()) R.error(id, `${ref}: falta "forma".`);
          if(!FP_VEREDICTOS.has(it.veredicto)){
            R.error(id, `${ref}: "veredicto" inválido ("${it.veredicto}"); debe ser ${[...FP_VEREDICTOS].join('/')}.`);
            break;
          }
          const esCorrecta = it.veredicto==='correcta';
          if(esCorrecta){
            nControles++;
            if(it.causa!==undefined) R.error(id, `${ref}: veredicto "correcta" no debe llevar "causa".`);
            if(it.forma_correcta!==undefined) R.error(id, `${ref}: veredicto "correcta" no debe llevar "forma_correcta".`);
            if(it.opciones_causa!==undefined) R.error(id, `${ref}: veredicto "correcta" no debe llevar "opciones_causa".`);
          } else {
            const spec = FP_CAUSAS[it.causa];
            if(!it.causa) R.error(id, `${ref}: falta "causa" (obligatoria salvo en veredicto "correcta").`);
            else if(!spec) R.error(id, `${ref}: causa "${it.causa}" no está entre las 13 del schema.`);
            else {
              if(FP_ORDEN_NIVEL[spec.nivelMin] > nivelNum)
                R.error(id, `${ref}: causa "${it.causa}" es de nivel ${spec.nivelMin} y el reto es ${nivel}.`);
              if(spec.veredicto!==it.veredicto)
                R.error(id, `${ref}: causa "${it.causa}" corresponde al veredicto "${spec.veredicto}", no a "${it.veredicto}".`);
            }
            if(typeof it.forma_correcta!=='string' || !it.forma_correcta.trim())
              R.error(id, `${ref}: veredicto "${it.veredicto}" exige "forma_correcta" (nunca el error solo en pantalla).`);
            const opc = Array.isArray(it.opciones_causa) ? it.opciones_causa : [];
            if(opc.length<2) R.error(id, `${ref}: "opciones_causa" necesita al menos 2 causas.`);
            else if(opc.length>4) R.aviso(id, `${ref}: ${opc.length} opciones_causa (el schema recomienda 2-4).`);
            opc.forEach(c=>{ if(!FP_CAUSAS[c]) R.error(id, `${ref}: opciones_causa contiene "${c}", que no es una causa del schema.`); });
            if(it.causa && opc.length && !opc.includes(it.causa))
              R.error(id, `${ref}: la "causa" correcta no está entre las "opciones_causa".`);
          }
          if(typeof it.explicacion!=='string' || !it.explicacion.trim())
            R.error(id, `${ref}: falta "explicacion" (qué se rompe, en lenguaje de alumno).`);
          break;
        }
        case 'frontera': {
          hayFrontera = true;
          if(typeof it.palabra!=='string' || !it.palabra.trim()) R.error(id, `${ref}: falta "palabra".`);
          validarOpciones(R, id, ref, it.opciones, 2); // dos correctas: eso es la zona gris
          if(typeof it.explicacion!=='string' || !it.explicacion.trim())
            R.error(id, `${ref}: falta "explicacion" (por qué las dos valen).`);
          break;
        }
        case 'clasifica_prueba': {
          if(typeof it.palabra!=='string' || !it.palabra.trim()) R.error(id, `${ref}: falta "palabra".`);
          else if(corpus.length && !corpus.includes(it.palabra))
            R.aviso(id, `${ref}: la palabra "${it.palabra}" no está en el "corpus" del reto.`);
          chkProc(ref, it.procedimiento);
          if(!FP_ENUNCIADOS.has(it.enunciado))
            R.error(id, `${ref}: "enunciado" debe ser tecnico o simple.`);
          else if(nivel==='basico' && it.enunciado!=='simple')
            R.error(id, `${ref}: en nivel basico el enunciado debe ser "simple" (el alumno no ve etiquetas).`);
          const pid = it.prueba_id;
          if(typeof pid!=='string' || !pid.trim()) R.error(id, `${ref}: falta "prueba_id".`);
          else {
            if(/^HEUR-/.test(pid)) R.error(id, `${ref}: "${pid}" es un heurístico rechazado: solo puede ir en "distractores", nunca como respuesta correcta.`);
            else if(!/^PRU-MORF-[A-Z]+-\d{2}$/.test(pid)) R.error(id, `${ref}: prueba_id "${pid}" no sigue el formato PRU-MORF-XXX-NN.`);
            else if(idsPrueba && !idsPrueba.has(pid)) R.error(id, `${ref}: prueba_id "${pid}" no está definido en js/data/pruebas-morfologia.js.`);
          }
          const dist = Array.isArray(it.distractores) ? it.distractores : [];
          if(dist.length<2 || dist.length>3) R.error(id, `${ref}: "distractores" debe tener 2 o 3 ids (tiene ${dist.length}).`);
          dist.forEach(d=>{
            if(typeof d!=='string' || !(/^PRU-MORF-[A-Z]+-\d{2}$/.test(d) || /^HEUR-[A-Z-]+$/.test(d)))
              R.error(id, `${ref}: distractor "${d}" no sigue el formato PRU-MORF-XXX-NN ni HEUR-XXX.`);
            else if(idsPrueba && !idsPrueba.has(d)) R.error(id, `${ref}: distractor "${d}" no está definido en js/data/pruebas-morfologia.js.`);
          });
          if(dist.length && !dist.some(d=>/^HEUR-/.test(d)))
            R.aviso(id, `${ref}: ningún distractor es un heurístico rechazado (HEUR-*); el schema pide al menos uno.`);
          if(pid && dist.includes(pid)) R.error(id, `${ref}: "${pid}" está a la vez como respuesta y como distractor.`);
          if(it.procedimiento && FP_DISCRIMINANTES.has(it.procedimiento) && it.peso!==2)
            R.aviso(id, `${ref}: "${it.procedimiento}" es de frontera discriminante y el ítem no lleva peso:2.`);
          break;
        }
        case 'cascada': {
          if(typeof it.palabra!=='string' || !it.palabra.trim()) R.error(id, `${ref}: falta "palabra".`);
          const pasos = Array.isArray(it.pasos) ? it.pasos : [];
          if(pasos.length<2) R.error(id, `${ref}: "pasos" necesita al menos 2 preguntas.`);
          pasos.forEach((p,pi)=>{
            if(!p || typeof p.pregunta!=='string' || !p.pregunta.trim()) R.error(id, `${ref} paso ${pi+1}: sin "pregunta".`);
            if(!p || !['si','no'].includes(p.respuesta)) R.error(id, `${ref} paso ${pi+1}: "respuesta" debe ser "si" o "no".`);
          });
          // conclusion XOR procedimiento (§12.6): o clasifica, o secuencia.
          const tieneConclusion = typeof it.conclusion==='string' && it.conclusion.trim();
          const tieneProc = typeof it.procedimiento==='string' && it.procedimiento.trim();
          if(tieneConclusion && tieneProc)
            R.error(id, `${ref}: lleva "conclusion" y "procedimiento" a la vez (o clasifica, o secuencia: no las dos cosas en una cascada).`);
          else if(!tieneConclusion)
            chkProc(ref, it.procedimiento);
          break;
        }
      }
    });

    // ── Reglas de composición del reto ────────────────────────────
    if(items.length){
      if(!estacionesVistas.has(2)) R.error(id, 'sin ningún ítem de estación 2 (manipulación): es el núcleo del reto.');
      if(!estacionesVistas.has(3)) R.error(id, 'sin ningún ítem de estación 3: el reto no alimenta la Mesa de Herramientas.');
      if(!estacionesVistas.has(1)) R.aviso(id, 'sin ningún ítem de estación 1 (observación).');
      // AVISO y no ERROR, a diferencia del Laboratorio: el plan de la Fábrica no
      // impone un juicio por reto (el marco pide 4-6 por unidad, otra medida).
      if(nJuicios===0) R.aviso(id, 'sin ningún juicio de gramaticalidad.');
      if(nJuicios>=3 && nControles===0)
        R.error(id, `${nJuicios} juicios y ninguno con veredicto "correcta": hace falta un control, o el alumno responde "mal" sin mirar.`);
    }
    if(o.zona_gris===true && !hayFrontera)
      R.error(id, 'zona_gris:true pero no hay ningún ítem de tipo "frontera".');
    if(hayFrontera && o.zona_gris!==true)
      R.error(id, 'hay un ítem "frontera" pero zona_gris no es true (esa bandera es la que lo excluye del examen).');
    const grisCol = (cols[cGris]||'').trim().toUpperCase();
    if(cGris>=0 && grisCol==='TRUE' && o.zona_gris!==true)
      R.error(id, 'columna Zona_Gris TRUE pero zona_gris del JSON no es true.');

    // ── Columnas derivadas vs JSON ────────────────────────────────
    const partes = s => String(s||'').split(';').map(x=>x.trim()).filter(Boolean);
    if(cTipos>=0){
      const declarados = new Set(partes(cols[cTipos]));
      if(declarados.size){
        for(const t of tiposVistos) if(!declarados.has(t))
          R.aviso(id, `Tipos_Item no incluye "${t}", que sí está en el JSON.`);
        for(const t of declarados) if(!tiposVistos.has(t))
          R.aviso(id, `Tipos_Item declara "${t}", que no aparece en el JSON.`);
      } else R.aviso(id, 'columna Tipos_Item vacía.');
    }
    if(cProc>=0){
      const declarados = new Set(partes(cols[cProc]));
      if(declarados.size){
        for(const p of procsVistos) if(!declarados.has(p))
          R.aviso(id, `Procedimientos no incluye "${p}", que sí está en el JSON.`);
      } else if(procsVistos.size) R.aviso(id, 'columna Procedimientos vacía.');
    }
  });
}

// ════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════

function main(){
  const [,, modo, ruta] = process.argv;
  if(!modo || !ruta || !['simples','compuestas','laboratorio','formacion'].includes(modo)){
    console.log('USO:');
    console.log('  node scripts/validar-banco.mjs simples      banco_export/Oraciones_Banco.tsv');
    console.log('  node scripts/validar-banco.mjs compuestas   banco_export/Compuestas_Banco.tsv');
    console.log('  node scripts/validar-banco.mjs laboratorio  banco_export/Laboratorio_Banco.tsv');
    console.log('  node scripts/validar-banco.mjs formacion    banco_export/Formacion_Banco.tsv');
    process.exit(2);
  }
  let texto;
  try { texto = readFileSync(ruta, 'utf8'); }
  catch(e){ console.error(`No puedo leer el archivo "${ruta}": ${e.message}`); process.exit(2); }

  const { cabecera, filas } = parseTSV(texto);
  if(filas.length===0){ console.log('El archivo no tiene filas de datos (¿solo cabecera?).'); process.exit(0); }

  console.log(`Validando banco de ${modo.toUpperCase()} — ${filas.length} filas — archivo: ${ruta}`);
  const R = new Reporte();
  if(modo==='simples')          validarSimples(cabecera, filas, R);
  else if(modo==='compuestas')  validarCompuestas(cabecera, filas, R);
  else if(modo==='laboratorio') validarLaboratorio(cabecera, filas, R);
  else                          validarFormacion(cabecera, filas, R);
  const code = R.imprimir(filas.length);
  process.exit(code);
}

main();
