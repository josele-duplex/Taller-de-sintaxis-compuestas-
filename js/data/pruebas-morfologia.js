/* pruebas-morfologia.js — Catálogo de identificadores de prueba morfológica
   Fábrica de Palabras · F1 (jul-2026)

   STUB PARCIAL, no la versión final de F2·1 (ver docs/Schema_Formacion_v1.0.md
   §8 y §6 del plan de producto). Este archivo transcribe SOLO el texto de la
   prueba de cada id, verbatim de la tabla §8 del schema (ese contenido ya
   estaba fijado, no se inventa aquí). Lo que F2·1 añadirá y este stub NO
   tiene todavía: microexplicaciones por distractor, la variante
   `enunciado_simple` por ítem, y la matriz completa de vecinos confundibles.
   Sirve para que el motor de cliente (js/modules/fabrica/index.js) pueda
   renderizar los ítems `clasifica_prueba` del lote semilla sin bloquear F1
   a que exista el banco completo de F2.

   Formato de id: ^PRU-MORF-[A-Z]+-\d{2}$ (pruebas) | ^HEUR-[A-Z-]+$ (heurísticos rechazados). */

export const PRUEBAS_MORFOLOGIA = {
  // Pruebas ancladas a un procedimiento (§8, tabla principal)
  'PRU-MORF-SIMPLE-01': 'No tiene más que raíz.',
  'PRU-MORF-DERIV-01':  'Raíz + afijo derivativo.',
  'PRU-MORF-CLEX-01':   'Dos raíces, un solo acento.',
  'PRU-MORF-CSINT-01':  'Bases separadas, cada una con su acento.',
  'PRU-MORF-CCULTA-01': 'Elementos griegos o latinos.',
  'PRU-MORF-PARA-01':   'Prefijo y sufijo a la vez, sin forma intermedia.',
  'PRU-MORF-SIGLA-01':  'Solo iniciales.',
  'PRU-MORF-ACRO-01':   'Trozos de palabras, no iniciales.',
  'PRU-MORF-ACORT-01':  'Ya existía y se recortó.',
  'PRU-MORF-ABREV-01':  'Representación gráfica con punto.',
  'PRU-MORF-NUM-01':    'Números + letras.',
  'PRU-MORF-PREST-01':  'Viene de otra lengua.',

  // Pruebas transversales (§8)
  'PRU-MORF-FAMILIA-01': 'Comparten raíz y significado de base.',
  'PRU-MORF-NUEVA-01':   '¿Crea palabra nueva (derivativo) o solo pone una etiqueta gramatical (flexivo)?',
  'PRU-MORF-INTERM-01':  '¿Existe la forma intermedia?',

  // Heurísticos rechazados — solo como distractores, nunca como respuesta correcta
  'HEUR-LONGITUD':  'Es larga, luego es compuesta.',
  'HEUR-MAYUSCULAS':'Va en mayúsculas, luego es sigla.',
  'HEUR-PARECIDO':  'Empieza igual, luego es de la misma familia.',
  'HEUR-DOS-PARTES':'La puedo partir en dos, luego es compuesta.',
  'HEUR-MEMORIA':   'Lo sé porque lo he estudiado.'
};

// Devuelve el texto de la prueba, o el propio id (legible) si no está en el
// catálogo — para que un id nuevo de un lote futuro no rompa el render,
// solo se vea menos pulido hasta que F2·1 lo incorpore.
export function textoPrueba(id) {
  return PRUEBAS_MORFOLOGIA[id] || String(id || '');
}
