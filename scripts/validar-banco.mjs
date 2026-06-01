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
 *   node scripts/validar-banco.mjs simples    banco_export/Oraciones_Banco.tsv
 *   node scripts/validar-banco.mjs compuestas  banco_export/Compuestas_Banco.tsv
 *
 * Cómo exportar el TSV:
 *   En el Sheet → Archivo → Descargar → "Valores separados por tabulaciones (.tsv)".
 *   Guarda el archivo en la carpeta banco_export/ del proyecto.
 *
 * El validador distingue:
 *   ❌ ERROR  → algo que el motor NO entiende: el alumno lo verá mal. Hay que corregir.
 *   ⚠ AVISO  → algo sospechoso o no recomendado, pero que no rompe. Revísalo.
 */

import { readFileSync } from 'node:fs';

// ════════════════════════════════════════════════════════════════════
//  LISTAS CERRADAS (fuente de verdad: js/glosario/tags.js y el prompt v1.3)
// ════════════════════════════════════════════════════════════════════

// ── SIMPLES (Oraciones_Banco, columna Estructura_JSON) ──
// Funciones válidas en una "solucion" de bloque ("TIPO | FUNCION" o "FUNCION").
const SIMPLES_FUNCIONES = new Set([
  'Sujeto','NP','PV','PN','CD','CI','Dativo','C.Rég.','Atr.','Atr. Loc.','CPvo','C.Ag.',
  'CC Lugar','CC Tiempo','CC Modo','CC Causa','CC Cantidad','CC Compañía','CC Finalidad',
  'CC Instrumento','CC Benef.','CC',
  'Mod.Or.','Conector','Vocat.','Marca.Imp.','Marca.Pas.Ref.',
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
    const nTokens = Array.isArray(o.tokens) ? o.tokens.length : 0;
    if(nTokens===0) R.error(id, 'Sin array "tokens".');

    // Helper: validar índices contra el rango de tokens
    const idxFueraRango = (idxs) =>
      Array.isArray(idxs) && idxs.some(x => typeof x!=='number' || x<0 || x>=nTokens);

    // proposiciones
    const props = Array.isArray(o.proposiciones) ? o.proposiciones : [];
    if(props.length===0) R.error(id, 'Sin array "proposiciones".');
    const propIds = new Set();
    props.forEach((p, k)=>{
      if(p.id) propIds.add(p.id);
      if(!p.verbo || typeof p.verbo.indice!=='number')
        R.aviso(id, `proposición ${p.id||k+1} sin verbo.indice.`);
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

    // relaciones
    const rels = Array.isArray(o.relaciones) ? o.relaciones : [];
    rels.forEach((r, k)=>{
      if(r.subtipo===CP_SUBTIPO_ELIMINADO)
        R.error(id, `relación ${r.id||k+1}: subtipo "${CP_SUBTIPO_ELIMINADO}" eliminado en 1.2 (usa sustantiva_termino_preposicion).`);
      else if(r.subtipo && !CP_SUBTIPOS.has(r.subtipo))
        R.error(id, `relación ${r.id||k+1}: subtipo "${r.subtipo}" no válido.`);
      // referencias a proposiciones existentes
      (Array.isArray(r.proposiciones)?r.proposiciones:[]).forEach(pid=>{
        if(!propIds.has(pid))
          R.error(id, `relación ${r.id||k+1}: referencia a proposición "${pid}" que no existe.`);
      });
      // funcion_sp obligatoria SSI subtipo es sustantiva_termino_preposicion
      if(r.subtipo==='sustantiva_termino_preposicion'){
        if(!r.funcion_sp) R.error(id, `relación ${r.id||k+1}: subtipo término_preposición requiere "funcion_sp".`);
        else if(!CP_FUNCION_SP.has(r.funcion_sp)) R.error(id, `relación ${r.id||k+1}: funcion_sp "${r.funcion_sp}" no válido.`);
      } else if(r.funcion_sp){
        R.aviso(id, `relación ${r.id||k+1}: funcion_sp presente pero el subtipo no es sustantiva_termino_preposicion.`);
      }
    });

    // nexos: índices y referencias
    (Array.isArray(o.nexos)?o.nexos:[]).forEach((n,k)=>{
      if(idxFueraRango(n.indices)) R.error(id, `nexo ${n.id||k+1}: índices fuera de rango.`);
    });
  });
}

// ════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════

function main(){
  const [,, modo, ruta] = process.argv;
  if(!modo || !ruta || !['simples','compuestas'].includes(modo)){
    console.log('USO:');
    console.log('  node scripts/validar-banco.mjs simples    banco_export/Oraciones_Banco.tsv');
    console.log('  node scripts/validar-banco.mjs compuestas  banco_export/Compuestas_Banco.tsv');
    process.exit(2);
  }
  let texto;
  try { texto = readFileSync(ruta, 'utf8'); }
  catch(e){ console.error(`No puedo leer el archivo "${ruta}": ${e.message}`); process.exit(2); }

  const { cabecera, filas } = parseTSV(texto);
  if(filas.length===0){ console.log('El archivo no tiene filas de datos (¿solo cabecera?).'); process.exit(0); }

  console.log(`Validando banco de ${modo.toUpperCase()} — ${filas.length} filas — archivo: ${ruta}`);
  const R = new Reporte();
  if(modo==='simples')    validarSimples(cabecera, filas, R);
  else                    validarCompuestas(cabecera, filas, R);
  const code = R.imprimir(filas.length);
  process.exit(code);
}

main();
