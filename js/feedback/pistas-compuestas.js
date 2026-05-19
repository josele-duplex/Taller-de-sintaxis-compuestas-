/* pistas-compuestas.js — Matrices de feedback escalonado para CP (oraciones compuestas)
   Creado en Fase 1.1 (mayo 2026) a partir de docs/TARJETAS_DIDACTICAS_CP.md.

   Análogo a FEEDBACK_SINTAXIS pero con las confusiones típicas de
   oraciones compuestas. Las claves `real` y `marcada` usan los mismos
   IDs que CP usa internamente para clasificar (ver
   obtenerOpcionesSubtipo en js/modules/compuestas/index.js):

     TIPO:     principal · subordinada · coordinada · yuxtapuesta
     FAMILIA:  sustantiva · relativa · construccion
     SUBTIPO:
       coordinada:    copulativa · disyuntiva · adversativa
       sustantiva:    sustantiva_sujeto · sustantiva_cd · sustantiva_atributo ·
                      sustantiva_termino_preposicion · sustantiva_aposicion
       relativa:      relativa_especificativa · relativa_explicativa ·
                      relativa_libre · relativa_semilibre
       construccion:  temporal · causal · final · ilativa_constr ·
                      condicional · concesiva

   Las preguntas socráticas y pistas son adaptación literal o derivada
   de las tarjetas didácticas redactadas por el autor. */

// ────────────────────────────────────────────────────────────────────
// Matriz específica: pares (real → marcada) con pista contextualizada.
// El motor de CP (Fase 1.3, todavía no enganchado) consultará esta
// matriz cuando detecte un error de clasificación.
// ────────────────────────────────────────────────────────────────────
export const FEEDBACK_COMPUESTAS = [
  // ─── TIPO: coordinación vs. subordinación ───
  {
    real: 'coordinada', marcada: 'subordinada',
    fijo: 'Has marcado Subordinada, lo que significa que una proposición está "incrustada" dentro de la otra cumpliendo una función. Pero fíjate: ¿podrías separar las dos proposiciones con un punto y mantendrían cada una su sentido completo?',
    pista: 'La coordinación une elementos al mismo nivel jerárquico; ninguna proposición está integrada en la otra. Si quitas el nexo y cada parte sigue funcionando sola como un enunciado independiente, es coordinación.'
  },
  {
    real: 'subordinada', marcada: 'coordinada',
    fijo: 'Has marcado Coordinada. Eso solo es cierto si las dos proposiciones tienen autonomía completa. ¿Una de ellas hace de Sujeto, CD u otra función dentro de la principal?',
    pista: 'Sustituye toda la proposición sospechosa por "ESO". Si la frase sigue teniendo sentido (Quiero ESO, Me alegra ESO), esa proposición está cumpliendo una función dentro de la otra: es subordinada.'
  },

  // ─── COORDINADAS: subtipo ───
  {
    real: 'copulativa', marcada: 'disyuntiva',
    fijo: 'Has marcado Disyuntiva, lo que implica que el nexo presenta alternativas que se excluyen. Pero observa el nexo: ¿realmente te obliga a elegir, o está sumando dos hechos que ocurren a la vez?',
    pista: 'Los nexos copulativos (y, e, ni, tanto… como) suman información. Los disyuntivos (o, u, bien… bien) presentan opciones que se intercambian. Si la frase plantea que ambos hechos coexisten, es copulativa.'
  },
  {
    real: 'disyuntiva', marcada: 'copulativa',
    fijo: 'Has marcado Copulativa, lo que implica suma de información. Pero fíjate: ¿el nexo te obliga a elegir entre dos opciones que se alternan o se excluyen?',
    pista: 'Si el enlace es o, u, o estructuras correlativas como bien… bien, ya… ya, ora… ora, las proposiciones se presentan como alternativas, no como sumas. La NGLE clasifica las antiguas "distributivas" como una variedad de la disyuntiva.'
  },
  {
    real: 'copulativa', marcada: 'adversativa',
    fijo: 'Has marcado Adversativa, lo que implica contraposición o corrección. Pero el nexo "ni" en estructuras "ni… ni" no opone: suma negaciones. ¿Estás eligiendo entre dos opciones excluyentes o sumando dos hechos negados?',
    pista: 'El nexo ni tiene valor copulativo en contextos negativos: equivale a "y no". Comprueba si las dos negaciones se acumulan en un solo bloque informativo (copulativa) o si una corrige a la otra (adversativa).'
  },
  {
    real: 'adversativa', marcada: 'copulativa',
    fijo: 'Has marcado Copulativa, lo que implica que la segunda proposición añade información. Pero observa: ¿realmente añade, o más bien corrige, limita o se opone a lo dicho en la primera?',
    pista: 'Las adversativas (pero, mas, sino que) confrontan dos ideas: la segunda matiza, restringe o sustituye lo afirmado en la primera. Si la segunda no es un añadido sino un giro o restricción, es adversativa.'
  },

  // ─── FAMILIA SUBORDINADA: sustantiva vs. relativa ───
  {
    real: 'sustantiva', marcada: 'relativa',
    fijo: 'Has marcado Relativa. Pero las relativas necesitan un "dueño" (antecedente) al que se refieren. ¿Hay un sustantivo justo antes del nexo "que" al que esté describiendo, o el nexo solo introduce una idea o un hecho?',
    pista: 'Prueba la sustitución por "ESO": si toda la proposición subordinada equivale a "ESO" (Me dijo ESO, Es cierto ESO), es sustantiva. Si pudieras cambiar el nexo "que" por "el cual / la cual", sería relativa.'
  },
  {
    real: 'relativa', marcada: 'sustantiva',
    fijo: 'Has marcado Sustantiva, lo que implica que la subordinada equivale a un sustantivo (sustituible por "ESO"). Pero observa: ¿hay un sustantivo antes del "que" al que se refiera, como si fuera un adjetivo?',
    pista: 'Aplica la prueba del antecedente: sustituye el "que" por "el cual" o "la cual" (El libro EL CUAL leí). Si funciona, el "que" es un pronombre relativo con función propia dentro de la subordinada, no una mera conjunción.'
  },
  {
    real: 'relativa', marcada: 'construccion',
    fijo: 'Has marcado Construcción (adverbial). Pero los nexos donde, cuando y como ya incluyen en su significado a su antecedente ("el lugar en que", "el momento en que", "la manera en que"). ¿Realmente es un complemento circunstancial puro, o una relativa libre disfrazada?',
    pista: 'La NGLE ya no analiza las antiguas adverbiales de lugar, tiempo y modo como un grupo aparte: ahora son relativas libres introducidas por adverbios relativos. Si el nexo (donde/cuando/como) incorpora a su antecedente, clasifícala como relativa.'
  },
  {
    real: 'sustantiva', marcada: 'construccion',
    fijo: 'Has marcado Construcción (probablemente temporal). Pero observa la estructura "antes de que…" o "después de que…": el verdadero núcleo es el adverbio "antes/después", y "que llegara" es solo el término de la preposición "de".',
    pista: 'La NGLE analiza "antes de que llegara" no como un nexo temporal unitario, sino como adverbio + sintagma preposicional donde la oración es el término. Aplica la prueba: "antes de ESO". Si funciona, la subordinada es sustantiva de término.'
  },

  // ─── SUSTANTIVAS: función dentro de la principal ───
  {
    real: 'sustantiva_sujeto', marcada: 'sustantiva_cd',
    fijo: 'Has marcado Sustantiva de CD. Pero el CD nunca concuerda con el verbo, y se sustituye por "LO". Comprueba qué pasa cuando pasas el verbo principal a plural.',
    pista: 'Aplica la prueba de la concordancia: sustituye la subordinada por "ESO" y cambia el verbo principal a plural. Si te ves obligado a decir "ESAS COSAS" (de "Me gusta ESO" a "Me gustan ESAS COSAS"), la subordinada es el sujeto.'
  },
  {
    real: 'sustantiva_cd', marcada: 'sustantiva_sujeto',
    fijo: 'Has marcado Sustantiva de Sujeto, pero el sujeto manda sobre el verbo y concuerda con él. ¿Esta subordinada se sustituye por "LO" sin afectar al número del verbo?',
    pista: 'Si puedes decir "lo dijo / lo pensó / lo afirma" sustituyendo la subordinada, la función es CD. El CD no impone su número al verbo y se sustituye por LO, LA, LOS, LAS.'
  },
  {
    real: 'sustantiva_termino_preposicion', marcada: 'sustantiva_cd',
    fijo: 'Has marcado CD, pero el CD no lleva preposición (salvo "a" personal). Observa: ¿hay una preposición fija (de, en, con, a, para) que precede a la subordinada y que el verbo o un sustantivo exige?',
    pista: 'Cuando un verbo o sustantivo exige preposición (acordarse DE, confianza EN, dudar DE), la subordinada que sigue es el término de esa preposición. Prueba: "Me acuerdo de ESO" (no "Me acuerdo ESO").'
  },
  {
    real: 'sustantiva_termino_preposicion', marcada: 'sustantiva_aposicion',
    fijo: 'Has marcado Aposición. La aposición es un sustantivo o subordinada que modifica directamente a otro sin preposición. Pero aquí ves una preposición entre el sustantivo y la subordinada.',
    pista: 'Si la preposición conecta un sustantivo o adjetivo con la subordinada (la idea DE que vengas, seguro DE que apruebes), la subordinada funciona como término del sintagma preposicional, no como aposición.'
  },

  // ─── RELATIVAS: subtipos ───
  {
    real: 'relativa_libre', marcada: 'relativa_semilibre',
    fijo: 'Has marcado Semilibre, lo que implica una estructura "artículo + que" con un sustantivo invisible recuperable. Pero observa el nexo: ¿es "el/la/los/las que" o es directamente "quien / cuanto / donde / cuando / como"?',
    pista: 'Las relativas libres usan nexos que YA incorporan el antecedente en su significado (quien = la persona que; donde = el lugar en que). Las semilibres siempre tienen artículo + que con un núcleo elidido.'
  },
  {
    real: 'relativa_semilibre', marcada: 'relativa_libre',
    fijo: 'Has marcado Libre. Pero las libres no llevan artículo delante: el nexo (quien, donde, cuando) ya incluye al antecedente. Aquí tienes "el/la/los/las + que": eso implica un sustantivo elidido.',
    pista: 'En las semilibres puedes recuperar mentalmente un sustantivo invisible entre el artículo y el "que": "El (alumno) que llegue tarde", "La (chica) que viste". El artículo señala a una entidad concreta del contexto.'
  },
  {
    real: 'relativa_especificativa', marcada: 'relativa_explicativa',
    fijo: 'Has marcado Explicativa, pero las explicativas van entre comas y la información que aportan es prescindible (puedes eliminarla sin que la oración pierda sentido). ¿Hay comas alrededor de la subordinada?',
    pista: 'Las especificativas restringen al antecedente (Los alumnos QUE ESTUDIEN aprobarán: no todos, solo esos) y van sin comas. Las explicativas añaden información extra prescindible (Los alumnos, QUE ESTABAN CANSADOS, se fueron) y van entre comas.'
  },
  {
    real: 'relativa_libre', marcada: 'relativa_especificativa',
    fijo: 'Has marcado Especificativa, lo que requiere un antecedente expreso al que la subordinada modifica. Pero observa: ¿hay un sustantivo escrito antes del nexo?',
    pista: 'Las relativas con antecedente expreso (especificativas o explicativas) tienen un sustantivo antes del "que". Las libres (quien, cuanto, donde…) no lo necesitan porque el nexo ya lleva el antecedente incorporado.'
  },

  // ─── CONSTRUCCIONES: subtipos ───
  {
    real: 'causal', marcada: 'final',
    fijo: 'Has marcado Final, lo que implica que la subordinada expresa el propósito u objetivo. Pero observa el nexo "que": ¿la segunda parte explica el motivo de la acción principal o el objetivo que persigue?',
    pista: 'Aplica el cambiazo: sustituye "que" por "porque" o por "para que". Si "porque" encaja ("Abrígate QUE hace frío" → "Abrígate PORQUE hace frío"), es causal. Si encaja "para que", es final.'
  },
  {
    real: 'final', marcada: 'causal',
    fijo: 'Has marcado Causal, lo que indica el motivo. Pero observa: ¿la subordinada explica una razón previa a la acción principal o el objetivo que se busca alcanzar?',
    pista: 'Las finales se conmutan por "para que" ("Ven, QUE te vea" → "Ven, PARA QUE te vea"). Las causales se conmutan por "porque". El verbo de las finales suele ir en subjuntivo.'
  },
  {
    real: 'condicional', marcada: 'causal',
    fijo: 'Has marcado Causal, lo que implica un motivo ya producido. Pero observa el modo verbal: si el nexo "como" va con subjuntivo y la frase es una amenaza o hipótesis, no es causal.',
    pista: 'El nexo "como" es camaleón. Con INDICATIVO indica causa ("Como no llegaba, me fui"). Con SUBJUNTIVO indica condición o amenaza ("Como no llegues a tiempo, me iré"). El modo verbal lo distingue.'
  },
  {
    real: 'temporal', marcada: 'causal',
    fijo: 'Has marcado Causal. Pero observa el nexo: ¿realmente expresa la razón por la que algo ocurre, o solo el momento o el espacio temporal en que sucede?',
    pista: 'Las temporales responden a "¿cuándo?" y suelen llevar cuando, mientras, en cuanto, apenas. Las causales responden a "¿por qué?" y se conmutan por "porque". No confundas el momento con el motivo.'
  },
  {
    real: 'concesiva', marcada: 'adversativa',
    fijo: 'Has marcado Adversativa, lo que implicaría coordinación y conmutación clara por "pero". Pero el nexo "aunque" con verbo en SUBJUNTIVO introduce un obstáculo que no impide la acción principal: eso es concesivo.',
    pista: 'La RAE solo considera "aunque" adversativo coordinante cuando es estrictamente sustituible por "pero" y hay pausa previa ("Es caro, AUNQUE bueno"). Si introduce una dificultad ineficaz, especialmente con subjuntivo ("Iré AUNQUE llueva"), es concesiva.'
  },
];

// ────────────────────────────────────────────────────────────────────
// Diccionario base (fallback): si el lookup específico real→marcada no
// está en FEEDBACK_COMPUESTAS, se devuelve la entrada genérica de la
// función real (categoría correcta). Garantiza que siempre haya
// feedback aunque la confusión específica no esté tabulada.
// ────────────────────────────────────────────────────────────────────
export const DICCIONARIO_BASE_COMPUESTAS = {
  // Tipos de proposición
  'coordinada': {
    fijo: '¿Las dos proposiciones podrían separarse con un punto y mantener cada una su sentido completo, o una está integrada dentro de la otra cumpliendo una función?',
    pista: 'La coordinación une elementos del mismo nivel jerárquico. Si quitas el nexo y cada parte sigue funcionando sola como un enunciado independiente, es coordinación.'
  },
  'subordinada': {
    fijo: '¿La proposición secundaria cumple una función (Sujeto, CD, complemento del nombre…) dentro de la principal, o es independiente?',
    pista: 'Sustituye la subordinada por "ESO" o por "el cual": si una sustitución funciona, está integrada y por tanto es subordinada.'
  },
  'yuxtapuesta': {
    fijo: 'La yuxtaposición une dos proposiciones SIN nexo conjuntivo, solo con un signo de puntuación (coma, punto y coma).',
    pista: 'Si entre las dos proposiciones solo hay una coma o un punto y coma, sin "y", "o", "pero" ni equivalentes, son yuxtapuestas.'
  },

  // Coordinadas
  'copulativa': {
    fijo: '¿El nexo está sumando información (los hechos coexisten) o presentando una elección entre opciones?',
    pista: 'Los nexos copulativos típicos son y, e, ni, tanto… como. Suman información en el mismo bloque.'
  },
  'disyuntiva': {
    fijo: '¿El nexo presenta alternativas que se alternan o se excluyen, o más bien suma dos hechos que ocurren a la vez?',
    pista: 'Los nexos disyuntivos son o, u, bien… bien, ya… ya, ora… ora. La NGLE incluye las antiguas distributivas aquí.'
  },
  'adversativa': {
    fijo: '¿La segunda proposición añade información, o más bien corrige, contrarresta o limita lo dicho en la primera?',
    pista: 'Los nexos adversativos típicos son pero, mas, sino que. La segunda parte matiza o se opone a la primera.'
  },

  // Sustantivas
  'sustantiva_sujeto': {
    fijo: '¿La subordinada concuerda con el verbo principal en número? Cambia el verbo a plural: si el bloque "ESO" debe cambiar a "ESAS COSAS", es sujeto.',
    pista: 'El sujeto sustantivo manda sobre el verbo. Al cambiar de "Me gusta ESO" a "Me gustan ESAS COSAS", la subordinada es la que cambió → es el sujeto.'
  },
  'sustantiva_cd': {
    fijo: '¿La subordinada se puede sustituir por "LO" sin afectar al número del verbo?',
    pista: 'El CD no concuerda con el verbo y se sustituye por LO. Si "Lo dijo" funciona, la subordinada es CD.'
  },
  'sustantiva_atributo': {
    fijo: 'El atributo solo aparece con verbos copulativos (ser, estar, parecer). ¿El verbo principal es uno de ellos?',
    pista: 'Si la subordinada va tras un verbo copulativo y se puede sustituir por "LO" ("Lo es", "Lo parece"), funciona como atributo.'
  },
  'sustantiva_termino_preposicion': {
    fijo: '¿Hay una preposición delante de la subordinada que el verbo o el sustantivo principal exige (acordarse DE, seguro DE, idea DE)?',
    pista: 'Aplica la prueba: "Me acuerdo de ESO" (correcto) frente a "Me acuerdo ESO" (incorrecto). Si la preposición es obligatoria, la subordinada es término.'
  },
  'sustantiva_aposicion': {
    fijo: 'La aposición modifica directamente a un sustantivo sin preposición intermedia. ¿Hay nexo preposicional entre el nombre y la subordinada?',
    pista: 'Aposición típica: "Su deseo, que vinieras, se cumplió". La subordinada explica o identifica al sustantivo "deseo" sin preposición.'
  },

  // Relativas
  'relativa_especificativa': {
    fijo: '¿La subordinada va sin comas y restringe (especifica) el significado del antecedente, eliminando otros candidatos posibles?',
    pista: '"Los alumnos que estudien aprobarán" → solo aprueban algunos, los que estudien. Va sin comas. La eliminación de la subordinada cambia el sentido.'
  },
  'relativa_explicativa': {
    fijo: '¿La subordinada va entre comas y aporta una información prescindible sobre el antecedente?',
    pista: '"Los alumnos, que estaban cansados, se fueron" → todos se fueron; la subordinada añade un detalle. Va entre comas.'
  },
  'relativa_libre': {
    fijo: '¿El nexo (quien, cuanto, donde, cuando, como) ya incorpora en su significado al antecedente, sin necesidad de sustantivo previo?',
    pista: 'Si el nexo equivale a "la persona que", "el lugar en que", "el momento en que"… es libre. Las antiguas adverbiales de lugar/tiempo/modo entran aquí.'
  },
  'relativa_semilibre': {
    fijo: '¿La estructura es "artículo + que" con un sustantivo invisible que se puede recuperar mentalmente entre ambos?',
    pista: '"El (alumno) que llegue tarde", "La (chica) que viste". El artículo señala a un núcleo elidido que la subordinada modifica como CN.'
  },

  // Construcciones
  'temporal': {
    fijo: '¿La subordinada indica el momento o el periodo en que ocurre la acción principal?',
    pista: 'Responde a "¿cuándo?". Nexos típicos: cuando, mientras, en cuanto, apenas, tan pronto como.'
  },
  'causal': {
    fijo: '¿La subordinada explica el motivo o la razón por la que se produce la acción principal?',
    pista: 'Responde a "¿por qué?". Se conmuta por "porque". Nexos: porque, ya que, puesto que, dado que.'
  },
  'final': {
    fijo: '¿La subordinada indica el propósito u objetivo que se busca alcanzar con la acción principal?',
    pista: 'Responde a "¿para qué?". Se conmuta por "para que". El verbo suele ir en subjuntivo: "Vine PARA QUE me ayudes".'
  },
  'ilativa_constr': {
    fijo: '¿La segunda proposición es una consecuencia o deducción natural de la primera, presentada con nexos como luego, así que, conque?',
    pista: 'Las ilativas presentan una consecuencia sin necesidad de intensificador previo (a diferencia de las consecutivas intensivas). "Es tarde, ASÍ QUE date prisa".'
  },
  'condicional': {
    fijo: '¿La subordinada plantea una hipótesis o requisito (prótasis) del que depende lo expresado en la principal (apódosis)?',
    pista: 'Nexo principal: SI. También a condición de que, siempre que, en caso de que. El nexo "como" con SUBJUNTIVO también introduce condición.'
  },
  'concesiva': {
    fijo: '¿La subordinada plantea un obstáculo o dificultad que NO impide que se cumpla lo principal?',
    pista: 'Nexo típico: aunque (con subjuntivo: "Iré AUNQUE llueva"). También a pesar de que, por más que. La acción principal se cumple a pesar del obstáculo.'
  },

  // Familia (alta jerarquía, fallback genérico)
  'sustantiva': {
    fijo: 'Las subordinadas sustantivas funcionan como un sustantivo (un sintagma nominal): pueden ser Sujeto, CD, Atributo, Término de preposición o Aposición de la principal.',
    pista: 'El truco infalible: sustituye toda la subordinada por "ESO". Si la frase sigue teniendo sentido, es sustantiva.'
  },
  'relativa': {
    fijo: 'Las relativas tienen un antecedente (expreso o tácito) al que se refieren, y el nexo cumple una función propia dentro de la subordinada.',
    pista: 'Prueba: ¿puedes sustituir el nexo "que" por "el cual" o "la cual"? Si funciona, es relativa.'
  },
  'construccion': {
    fijo: 'Las construcciones (antes llamadas "adverbiales impropias") expresan relaciones lógicas: causa, finalidad, condición, concesión o consecuencia.',
    pista: 'Suelen llevar nexos como porque, para que, si, aunque, así que. No equivalen a un sustantivo ni tienen antecedente.'
  },
};

// ────────────────────────────────────────────────────────────────────
// Etiquetas humanas para cada ID interno usado por CP. Se usan en los
// mensajes de fallback para que el alumno lea "Has marcado Sustantiva
// de CD" en lugar de "Has marcado sustantiva_cd". Espejo (parcial) de
// etiquetaSubtipo/etiquetaSubtipoExtendida de js/modules/compuestas/index.js.
// ────────────────────────────────────────────────────────────────────
export const LABELS_COMPUESTAS = {
  // Tipo
  'principal': 'Principal',
  'subordinada': 'Subordinada',
  'coordinada': 'Coordinada',
  'yuxtapuesta': 'Yuxtapuesta',
  // Familia
  'sustantiva': 'Subordinada Sustantiva',
  'relativa': 'Subordinada de Relativo',
  'construccion': 'Construcción',
  // Coordinada
  'copulativa': 'Coordinada Copulativa',
  'disyuntiva': 'Coordinada Disyuntiva',
  'adversativa': 'Coordinada Adversativa',
  // Sustantiva
  'sustantiva_sujeto': 'Sustantiva de Sujeto',
  'sustantiva_cd': 'Sustantiva de CD',
  'sustantiva_atributo': 'Sustantiva de Atributo',
  'sustantiva_termino_preposicion': 'Sustantiva de Término de preposición',
  'sustantiva_aposicion': 'Sustantiva de Aposición',
  // Relativa
  'relativa_especificativa': 'Relativa Especificativa',
  'relativa_explicativa': 'Relativa Explicativa',
  'relativa_libre': 'Relativa Libre',
  'relativa_semilibre': 'Relativa Semilibre',
  // Construcción
  'temporal': 'Construcción Temporal',
  'causal': 'Construcción Causal',
  'final': 'Construcción Final',
  'ilativa_constr': 'Construcción Ilativa',
  'condicional': 'Construcción Condicional',
  'concesiva': 'Construcción Concesiva',
};

// Helper local: ID → etiqueta humana (con fallback al propio ID).
function labelCP(id) {
  return LABELS_COMPUESTAS[id] || id;
}

/**
 * Versión específica para CP de lookupScaffold. Recibe los IDs internos
 * que CP usa al clasificar (sustantiva_cd, relativa_libre, copulativa, etc.),
 * los traduce a etiquetas legibles para el alumno y devuelve {fijo, pista}.
 *
 * Mismo contrato que lookupScaffold(marcada, real, 'compuesta') pero con
 * etiquetas humanas en los mensajes de fallback.
 *
 * Uso desde CP (cuando se enganche en Fase 1.3):
 *   const { fijo, pista } = lookupScaffoldCP(marcadaId, realId);
 *   // mostrar fijo y pista en la tarjeta de feedback
 *
 * Devuelve siempre un objeto {fijo, pista}, nunca null.
 */
export function lookupScaffoldCP(marcadaId, realId) {
  // 1. Match específico por par real → marcada
  const specific = FEEDBACK_COMPUESTAS.find(
    e => e.real === realId && e.marcada === marcadaId
  );
  if (specific) return { fijo: specific.fijo, pista: specific.pista };

  // 2. Fallback al diccionario base de la categoría correcta
  const base = DICCIONARIO_BASE_COMPUESTAS[realId];
  if (base) return {
    fijo: 'Has marcado ' + labelCP(marcadaId) + ', pero fíjate bien: ' + base.fijo,
    pista: base.pista
  };

  // 3. Fallback universal: siempre devuelve algo legible
  return {
    fijo: 'Has marcado ' + labelCP(marcadaId) + '. Piensa bien: ¿esa es realmente la categoría que mejor describe esta proposición?',
    pista: 'Revisa las características de "' + labelCP(realId) + '". Comprueba qué nexo une las proposiciones y aplica las pruebas de sustitución (ESO, el cual, porque…).'
  };
}
