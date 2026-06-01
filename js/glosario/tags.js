/* tags.js — Funciones sintácticas: arrays maestros y helpers de etiquetado
   Extraído de index.html (Paso 4 de la migración, mayo 2026)
   Líneas originales: 1390-1392, 1534-1570. */

// CC subtipos v4.0 — aparecen en el pool de Adjuntos con submenú
// 'CC Benef.' (beneficiario) añadido junio 2026: al estar en CC_SUBTIPOS se
// propaga solo a isCC(), al submenú de CC y al color (los CC se pintan tag-f-cc).
export const CC_SUBTIPOS = ['CC Lugar','CC Tiempo','CC Modo','CC Causa','CC Cantidad','CC Compañía','CC Finalidad','CC Instrumento','CC Benef.'];

// 'Atr. Loc.' (atributo locativo) y 'Dativo' (no argumental) añadidos junio 2026.
export const FUNC_ORAC = ['Sujeto','PN','PV','NP','CD','CI','Dativo','C.Rég.','Atr.','Atr. Loc.','CPvo',...CC_SUBTIPOS,'C.Ag.','Mod.Or.','Conector','Vocat.','Marca.Imp.','Marca.Pas.Ref.'];

export const FUNC_SINT = ['N','N (enlace)','Mod/Det.','Mod/Cuant.','Mod.','SN/CN','SAdj/CN','SPrep/CN','CAdj','CAdv','SN/T','SAdj/T','SAdv/T','SP/T','Nexo','Aposición'];

// Color CSS class based on FUNCTION (for phase 3 labels)
export function funcTagCss(label) {
  // Labels can be "Tipo | Func" or just "Func" (for Marcas which have no sintagma type)
  const func = label.includes(' | ') ? label.split(' | ')[1] : label;
  const map = {
    'CD':'tag-f-cd','CI':'tag-f-ci','C.Rég.':'tag-f-creg','Atr.':'tag-f-atr',
    // junio 2026: Atr. Loc. comparte color con el atributo (es un atributo);
    // Dativo comparte color con el CI (es un dativo no argumental, "primo" del CI).
    'Atr. Loc.':'tag-f-atr','Dativo':'tag-f-ci',
    'PV':'tag-f-pv','PN':'tag-f-pn','CC':'tag-f-cc','CPvo':'tag-f-cpvo',
    'C.Ag.':'tag-f-cag',
    'Mod.Or.':'tag-f-modor2','Vocat.':'tag-f-voc2',
    'Marca.Imp.':'tag-f-imp','Marca.Pas.Ref.':'tag-f-pasref',
    'Sujeto':'tag-sn','NP':'tag-sv'
  };
  if (map[func]) return map[func];
  // Cualquier subtipo de CC ('CC Lugar', 'CC Benef.', etc.) usa el color CC.
  if (func.startsWith('CC ')) return 'tag-f-cc';
  return 'tag-func-lbl';
}

// tagContent: renders the tag label — Marcas have no tipo so show only func
export const SINT_LABEL_MAP = {
  'T':'T — Término','SN/T':'SN · Término','SAdj/T':'SAdj · Término',
  'SAdv/T':'SAdv · Término','SP/T':'SP · Término',
  'N':'N — Núcleo','N (enlace)':'N (enlace)',
  'Mod.':'Mod.','Mod/Det.':'Mod/Det.','Mod/Cuant.':'Mod/Cuant.',
  'SN/CN':'SN/CN','SAdj/CN':'SAdj/CN','SPrep/CN':'SPrep/CN',
  'CAdj':'CAdj','CAdv':'CAdv','Nexo':'Nexo',
};

export function tagContent(label) {
  if(!label||label==='undefined') return '<span class="tag-func-main">—</span>';
  if (label.includes(' | ')) {
    const [tipo, func] = label.split(' | ');
    if(!func||func==='undefined') return `<span class="tag-func-main">${tipo}</span>`;
    return `<span class="tag-func-main">${func}</span><span class="tag-func-tipo">${tipo}</span>`;
  }
  // Sintagma short labels — display with friendly name
  if(SINT_LABEL_MAP[label]) return `<span class="tag-func-main">${SINT_LABEL_MAP[label]}</span>`;
  // No tipo separator — just the function name (used for Marcas)
  const m = label.match(/^(S[A-Za-z]+)\/(.*)/);
  if (m) return `<span class="tag-func-main">${m[2]}</span><span class="tag-func-tipo">${m[1]}</span>`;
  return `<span class="tag-func-main">${label}</span>`;
}
