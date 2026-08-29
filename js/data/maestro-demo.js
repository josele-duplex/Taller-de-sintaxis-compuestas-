/* maestro-demo.js — Banco de respaldo de Maestro (morfología avanzada)
   Extraído de js/modules/maestro/index.js (hallazgo A8 de la auditoría
   técnica de ago-2026: datos lingüísticos incrustados en un módulo de
   interfaz).

   QUÉ ES. MAESTRO_DEMO es el análisis morfológico completo, token a
   token, de un texto fijo («El viejo desván»): 33 tokens con su
   categoría y sus rasgos (`atrs`) ya resueltos. MAESTRO_TEXTS lo envuelve
   en la forma que espera el motor de Maestro ({oracion, tokens}).

   PARA QUÉ SIRVE. Es el banco de respaldo: si el alumno entra en Maestro
   o en el Morph Challenge sin conexión al Sheet (o el Sheet no devuelve
   textos), la app sigue funcionando con este texto en vez de romperse.
   No es contenido de examen ni se sirve nunca con PIN — solo modo
   práctica sin API.

   normalizePerifrasTokenAtrs() traduce formatos antiguos del rasgo
   `perífrasis` (p. ej. "modal (obligación)") al formato cascada actual
   ("sí — modal de obligación"). Vive aquí porque MAESTRO_TEXTS la
   necesita para construirse, pero el motor de Maestro también la
   reutiliza para normalizar los textos que sí llegan del Sheet — de ahí
   que index.js la reimporte además de MAESTRO_DEMO/MAESTRO_TEXTS.

   OJO: igual que en cascadas-morfologia.js, los valores de `atrs` tienen
   que coincidir EXACTAMENTE con el schema de rasgos del banco de
   morfología (ver js/data/cascadas-morfologia.js). */

// ── Banco de tokens del texto de demostración ("El viejo desván") ─────
export const MAESTRO_DEMO = [{"id": "m1_01", "texto": "¡", "cat": "Puntuación", "atrs": {}}, {"id": "m1_02", "texto": "Hala", "cat": "Interjección", "atrs": {"tipo": "propia", "función": "expresiva"}}, {"id": "m1_03", "texto": "!", "cat": "Puntuación", "atrs": {}}, {"id": "m1_04", "texto": "Encontré", "cat": "Verbo", "atrs": {"conjugación": "primera", "persona": "primera persona", "número": "singular", "tiempo": "pretérito perfecto simple", "modo": "indicativo", "aspecto": "perfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_05", "texto": "este", "cat": "Demostrativo", "atrs": {"función": "determinante", "cercanía": "proximidad", "género": "masculino", "número": "singular"}}, {"id": "m1_06", "texto": "cofre", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "masculino", "número": "singular"}}, {"id": "m1_07", "texto": "pequeño", "cat": "Adjetivo", "atrs": {"subtipo": "calificativo", "género": "masculino", "número": "singular", "grado": "positivo"}}, {"id": "m1_08", "texto": "bajo", "cat": "Preposición", "atrs": {"tipo": "simple"}}, {"id": "m1_09", "texto": "la", "cat": "Artículo", "atrs": {"tipo": "determinado", "género": "femenino", "número": "singular", "forma": "ninguna"}}, {"id": "m1_10", "texto": "cama", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "femenino", "número": "singular"}}, {"id": "m1_11", "texto": "de", "cat": "Preposición", "atrs": {"tipo": "simple"}}, {"id": "m1_12", "texto": "mi", "cat": "Posesivo", "atrs": {"función": "determinante", "persona": "primera persona", "poseedores": "un poseedor", "género": "invariable", "número": "singular"}}, {"id": "m1_13", "texto": "abuelo", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "masculino", "número": "singular"}}, {"id": "m1_14", "texto": ".", "cat": "Puntuación", "atrs": {}}, {"id": "m1_15", "texto": "Dentro", "cat": "Adverbio", "atrs": {"tipo": "lugar"}}, {"id": "m1_16", "texto": "había", "cat": "Verbo", "atrs": {"conjugación": "segunda", "persona": "tercera persona", "número": "singular", "tiempo": "pretérito imperfecto", "modo": "indicativo", "aspecto": "imperfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_17", "texto": "muchas", "cat": "Cuantificador", "atrs": {"tipo": "indefinido", "subtipo_ind": "indefinido débil", "función_sint": "determinante", "género": "femenino", "número": "plural"}}, {"id": "m1_18", "texto": "cartas", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "femenino", "número": "plural"}}, {"id": "m1_19", "texto": "amarillas", "cat": "Adjetivo", "atrs": {"subtipo": "calificativo", "género": "femenino", "número": "plural", "grado": "positivo"}}, {"id": "m1_20", "texto": "y", "cat": "Conjunción", "atrs": {"tipo": "coordinante", "subtipo_coord": "copulativa"}}, {"id": "m1_21", "texto": "un", "cat": "Artículo", "atrs": {"tipo": "indeterminado", "género": "masculino", "número": "singular", "forma": "ninguna"}}, {"id": "m1_22", "texto": "reloj", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "concreto", "género": "masculino", "número": "singular"}}, {"id": "m1_23", "texto": "antiguo", "cat": "Adjetivo", "atrs": {"subtipo": "calificativo", "género": "masculino", "número": "singular", "grado": "positivo"}}, {"id": "m1_24", "texto": ".", "cat": "Puntuación", "atrs": {}}, {"id": "m1_25", "texto": "Nosotros", "cat": "Pronombre personal", "atrs": {"persona": "primera persona", "número": "plural", "género": "masculino", "acent": "tónico"}}, {"id": "m1_26", "texto": "las", "cat": "Pronombre personal", "atrs": {"persona": "tercera persona", "número": "plural", "género": "femenino", "acent": "átono"}}, {"id": "m1_27", "texto": "leeremos", "cat": "Verbo", "atrs": {"conjugación": "segunda", "persona": "primera persona", "número": "plural", "tiempo": "futuro simple", "modo": "indicativo", "aspecto": "imperfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_28", "texto": "pronto", "cat": "Adverbio", "atrs": {"tipo": "tiempo"}}, {"id": "m1_29", "texto": "porque", "cat": "Conjunción", "atrs": {"tipo": "subordinante", "subtipo_sub": "causal"}}, {"id": "m1_30", "texto": "guardan", "cat": "Verbo", "atrs": {"conjugación": "primera", "persona": "tercera persona", "número": "plural", "tiempo": "presente", "modo": "indicativo", "aspecto": "imperfectivo", "voz": "activa", "perífrasis": "no"}}, {"id": "m1_31", "texto": "secretos", "cat": "Sustantivo", "atrs": {"subtipo": "común", "comun_sub": "contable", "ind_col": "individual", "conc_abs": "abstracto", "género": "masculino", "número": "plural"}}, {"id": "m1_32", "texto": "familiares", "cat": "Adjetivo", "atrs": {"subtipo": "relacional", "género": "invariable", "número": "plural"}}, {"id": "m1_33", "texto": ".", "cat": "Puntuación", "atrs": {}}];

// Normaliza el campo perífrasis antiguo (un solo valor) al nuevo formato cascada
export function normalizePerifrasTokenAtrs(atrs){
  if(!atrs) return atrs;
  // Remove non-cascade 'forma' field (impersonal/pronominal) — store in _meta for reference but don't score
  if(atrs.forma && !['simple','compuesta'].includes(atrs.forma)){
    const {forma, ...rest} = atrs;
    atrs = rest;
  }
  if(!atrs.perífrasis || atrs.perífrasis==='no' || atrs.perif_tipo) return atrs;
  let p = String(atrs.perífrasis);
  // Legacy format variants → canonical
  // "modal (posibilidad)" → "sí — modal de probabilidad"
  // "modal (obligación)" / "modal (obligación/destino)" / "modal (obligación impersonal)" → "sí — modal de obligación"
  // "aspectual (incoativa...)" → "sí — tempoaspectual incoativa"
  // "aspectual (frecuentativa/meta)" → "sí — tempoaspectual reiterativa"
  const lower = p.toLowerCase();
  if(!p.startsWith('sí')){
    if(lower.includes('obligación') || lower.includes('obligacion')) p = 'sí — modal de obligación';
    else if(lower.includes('posibilidad') || lower.includes('probabilidad')) p = 'sí — modal de probabilidad';
    else if(lower.includes('capacidad')) p = 'sí — modal de capacidad';
    else if(lower.includes('incoativa') || lower.includes('incoativo') || lower.includes('futuro próximo')) p = 'sí — tempoaspectual incoativa';
    else if(lower.includes('terminativa') || lower.includes('terminativo')) p = 'sí — tempoaspectual terminativa';
    else if(lower.includes('reiterativa') || lower.includes('frecuentativa') || lower.includes('meta')) p = 'sí — tempoaspectual reiterativa';
    else if(lower.includes('gerundio')) p = 'sí — aspectual de gerundio';
    else if(lower.includes('participio')) p = 'sí — aspectual de participio';
    else return atrs; // unknown format — leave as-is
  }
  const a = {...atrs, perífrasis: 'sí'};
  if(p.includes('gerundio'))        { a.perif_tipo = 'gerundio'; a.perif_ger_info = 'sí — aspectual de gerundio'; }
  else if(p.includes('participio')) { a.perif_tipo = 'participio'; a.perif_par_info = 'sí — aspectual de participio'; }
  else {
    a.perif_tipo = 'infinitivo';
    if(p.includes('modal')){
      a.perif_inf_clase = 'modal';
      if(p.includes('capacidad')) a.perif_modal = 'sí — modal de capacidad';
      else if(p.includes('posibilidad') || p.includes('probabilidad')) a.perif_modal = 'sí — modal de probabilidad';
      else a.perif_modal = 'sí — modal de obligación'; // default fallback for any unclassified modal
    } else {
      a.perif_inf_clase = 'tempoaspectual';
      if(p.includes('incoativa')) a.perif_tempo = 'sí — tempoaspectual incoativa';
      else if(p.includes('terminativa')) a.perif_tempo = 'sí — tempoaspectual terminativa';
      else if(p.includes('reiterativa')) a.perif_tempo = 'sí — tempoaspectual reiterativa';
      else a.perif_tempo = p;
    }
  }
  return a;
}

export function buildMaestroText(tokens, label) {
  return { oracion: label, tokens: tokens.map(t=>({...t, atrs: t.cat==='Verbo'?normalizePerifrasTokenAtrs(t.atrs):t.atrs})) };
}

export const MAESTRO_TEXTS = [
  buildMaestroText(MAESTRO_DEMO, 'El viejo desván — Texto de demostración'),
];
