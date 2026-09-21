/* ser-forms.js — SER_FORMS (formas conjugadas del verbo "ser")
   Añadido sep-2026 (auditoría de filtros): distingue VOZ PASIVA (ser +
   participio) de PERÍFRASIS VERBAL en clasificarVerbo(). Antes de esto,
   "fue pintado", "será inaugurado"... se etiquetaban "Perífrasis verbal"
   al alumno, lo cual es un error de terminología NGLE (la pasiva con
   "ser" no es una perífrasis). */

export const SER_FORMS = new Set([
  'soy','eres','es','somos','sois','son',
  'era','eras','éramos','erais','eran',
  'fui','fuiste','fue','fuimos','fuisteis','fueron',
  'seré','serás','será','seremos','seréis','serán',
  'sería','serías','seríamos','seríais','serían',
  'sea','seas','seamos','seáis','sean',
  'fuera','fueras','fuéramos','fuerais','fueran',
  'fuese','fueses','fuésemos','fueseis','fuesen'
]);
