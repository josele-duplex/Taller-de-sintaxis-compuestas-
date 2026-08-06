/* pruebas-morfologia.js — Banco de pruebas de morfología
   Fábrica de Palabras · F2 · sesión 1 (jul-2026)

   Este archivo es el repertorio de PRUEBAS que el alumno elige en los ítems
   `clasifica_prueba`: no se redacta la prueba en cada reto, se apunta con su
   `prueba_id` (decisión 10.3 de docs/Schema_Formacion_v1.0.md). Un lote de 30
   retos no son 30 redacciones de la prueba del acrónimo.

   Qué trae cada entrada:
     · texto  — el enunciado TÉCNICO, verbatim de la mesa de herramientas del
                §4 de la UD de 3.º ESO (transcrito en §8 del schema). No se
                inventa aquí: ya estaba redactado y validado en el aula.
     · simple — la misma prueba SIN metalenguaje, para `enunciado: "simple"`
                (obligatorio en nivel `basico`, §3.9 del schema). Usa solo el
                vocabulario permitido en §9: palabra, pieza, trozo,
                significado, letra, familia.
     · ok     — microexplicación al acertar: por qué esa prueba cierra el caso.
     · no     — microexplicación al fallar: qué demostraría de verdad esa
                prueba. Está redactada SIN depender de la palabra del ítem
                («esa prueba serviría para X, como en "ejemplo"»), que es lo
                que la hace reutilizable en los 30 retos de un lote.

   Por qué `no` importa tanto: hasta ahora el motor mostraba el feedback de
   `clasifica_prueba` vacío (construía las opciones sin `micro`). Un distractor
   sin explicación es un error que el alumno no aprende a no repetir — el mismo
   criterio que fijó el banco de reflexión metalingüística.

   Los HEUR-* son heurísticos RECHAZADOS: razonamientos que suenan bien y son
   falsos. Solo pueden aparecer como distractores, nunca como respuesta
   correcta (el validador da ERROR si uno se cuela en `prueba_id`).

   Formato de id: ^PRU-MORF-[A-Z]+-\d{2}$ (pruebas) | ^HEUR-[A-Z-]+$ (heurísticos).

   Fuentes: docs/Schema_Formacion_v1.0.md §7 y §8 · UD Gramatica_01 3.º ESO §4
   (mesa de herramientas y test rápido) · UD Gramatica_01 1.º ESO sesiones 2-5
   (de donde sale el registro de las variantes `simple`). */

export const PRUEBAS_MORFOLOGIA = {

  // ── Pruebas ancladas a un procedimiento (§8, tabla principal) ──────────

  'PRU-MORF-SIMPLE-01': {
    texto:  'No tiene más que raíz.',
    simple: 'No se puede partir: dentro no queda ninguna pieza más pequeña que signifique algo.',
    procedimiento: 'simple',
    ok: 'Si al partirla no queda ninguna pieza suelta con significado propio, no la ha fabricado nadie: ya venía hecha.',
    no: 'Esa prueba solo vale cuando la palabra no se deja partir, como "sol" o "mesa". Aquí sí hay piezas dentro.'
  },

  'PRU-MORF-DERIV-01': {
    texto:  'Raíz + afijo derivativo.',
    simple: 'Tiene una pieza principal y otra pegada delante o detrás que le cambia el significado.',
    procedimiento: 'derivada',
    ok: 'La pieza añadida no da un dato de género ni de número: fabrica otra palabra distinta.',
    no: 'Esa prueba busca una pieza principal con algo pegado delante o detrás, como en "flor-ero". Aquí no es eso lo que hay.'
  },

  'PRU-MORF-CLEX-01': {
    texto:  'Dos raíces, un solo acento.',
    simple: 'Dentro hay dos palabras que existen por separado, pero se dicen de un tirón.',
    procedimiento: 'compuesta_lexica',
    ok: 'Las dos piezas funcionan solas como palabras y aun así se escriben juntas y se pronuncian con un solo golpe de voz.',
    no: 'Esa prueba pide dos piezas que sean palabras enteras por separado, como "limpia" y "parabrisas". Que se pueda partir en dos trozos no basta: los trozos tienen que existir solos.'
  },

  'PRU-MORF-CSINT-01': {
    texto:  'Bases separadas, cada una con su acento.',
    simple: 'Son dos palabras escritas separadas o con guion que juntas nombran una sola cosa.',
    procedimiento: 'compuesta_sintagmatica',
    ok: 'Se escriben separadas y cada una conserva su golpe de voz, pero juntas nombran una sola cosa: "comida basura" no es una comida cualquiera.',
    no: 'Esa prueba pide dos palabras escritas separadas o con guion, como "comida basura" o "teórico-práctico". Aquí va todo en una sola palabra.'
  },

  'PRU-MORF-CCULTA-01': {
    texto:  'Elementos griegos o latinos.',
    simple: 'Está hecha con piezas que vienen del griego o del latín y que casi nunca aparecen solas.',
    procedimiento: 'compuesta_culta',
    ok: 'Piezas como "tele-" o "-logía" no son palabras del español de hoy: vienen del griego o del latín y solo aparecen dentro de otras palabras.',
    no: 'Esa prueba busca piezas heredadas del griego o del latín que no funcionan solas, como "tele-" o "-logía". Aquí las piezas son palabras españolas corrientes.'
  },

  'PRU-MORF-PARA-01': {
    texto:  'Prefijo y sufijo a la vez, sin forma intermedia.',
    simple: 'Le quito solo el trozo de delante, luego solo el de detrás, y ninguna de las dos formas existe.',
    procedimiento: 'parasintetica',
    ok: 'Es la prueba decisiva: si "rojecer" no existe y "enrojo" tampoco, las dos piezas tuvieron que entrar a la vez.',
    no: 'Esa prueba solo cierra el caso si al quitar una pieza sola queda algo que no existe, como "rojecer". Si la forma intermedia sí existe, la palabra no se fabricó así.'
  },

  'PRU-MORF-SIGLA-01': {
    texto:  'Solo iniciales.',
    simple: 'Está hecha únicamente con la primera letra de cada palabra.',
    procedimiento: 'sigla',
    ok: 'Cada letra es el arranque de una palabra distinta: la O de "organización", la N de "no", la G de "gubernamental".',
    no: 'Esa prueba solo vale si cada letra es la inicial de una palabra distinta, como en "ONG". Ir en mayúsculas no convierte a una palabra en eso.'
  },

  'PRU-MORF-ACRO-01': {
    texto:  'Trozos de palabras, no iniciales.',
    simple: 'Está hecha juntando trozos de dos palabras, no solo sus primeras letras.',
    procedimiento: 'acronimo',
    ok: '"Informática" toma trozos enteros de "información" y de "automática", no sus iniciales.',
    no: 'Esa prueba pide trozos de varias palabras cosidos entre sí, como "inform-" + "-ática". Aquí no hay trozos de dos palabras distintas.'
  },

  'PRU-MORF-ACORT-01': {
    texto:  'Ya existía y se recortó.',
    simple: 'Es una palabra más larga a la que se le ha cortado un trozo.',
    procedimiento: 'acortamiento',
    ok: '"Autobús" existía antes que "bus": la palabra corta sale de la larga, y no al revés.',
    no: 'Esa prueba necesita una palabra más larga que ya existía antes, como "autobús" antes de "bus". Aquí no hay ninguna palabra de la que esta se haya recortado.'
  },

  'PRU-MORF-ABREV-01': {
    texto:  'Representación gráfica con punto.',
    simple: 'Solo se escribe así: al leerla en voz alta se dice la palabra entera.',
    procedimiento: 'abreviatura',
    ok: 'Nadie pronuncia "pag": se lee "página". Es una manera de escribir, no una palabra nueva.',
    no: 'Esa prueba es para formas que solo existen escritas y se leen enteras, como "pág." o "Sra.". Esta se pronuncia tal como se escribe.'
  },

  'PRU-MORF-NUM-01': {
    texto:  'Números + letras.',
    simple: 'Mezcla cifras y letras.',
    procedimiento: 'numeronimo',
    ok: 'La cifra forma parte del nombre: "5G" no se puede escribir sin el 5.',
    no: 'Esa prueba busca una mezcla de cifras y letras, como "11-S" o "5G". Aquí no aparece ninguna cifra.'
  },

  'PRU-MORF-PREST-01': {
    texto:  'Viene de otra lengua.',
    simple: 'No se ha fabricado en español: se ha copiado de otro idioma.',
    procedimiento: 'prestamo',
    ok: 'No hay piezas españolas que montar: la palabra entera se ha tomado de otra lengua y, como mucho, se ha adaptado su escritura.',
    no: 'Esa prueba es para palabras traídas de otro idioma, como "selfi" o "streamer". Esta se fabrica con piezas del español.'
  },

  // ── Pruebas transversales (§8) ─────────────────────────────────────────
  // No dicen de qué procedimiento es una palabra: resuelven una decisión
  // concreta (¿misma familia?, ¿la pieza crea palabra nueva?, ¿existe la
  // forma intermedia?). Por eso sus `no` avisan de que la prueba es buena
  // pero contesta a otra pregunta.

  'PRU-MORF-FAMILIA-01': {
    texto:  'Comparten raíz y significado de base.',
    simple: 'Comparten el mismo trozo Y hablan de lo mismo.',
    ok: 'Las dos condiciones a la vez: el mismo trozo y el mismo significado de base. Con una sola no basta.',
    no: 'Esa prueba decide si dos palabras son de la misma familia; no dice de qué manera se ha fabricado esta.'
  },

  'PRU-MORF-NUEVA-01': {
    texto:  '¿Crea palabra nueva (derivativo) o solo pone una etiqueta gramatical (flexivo)?',
    simple: '¿La pieza añadida crea otra palabra distinta, o solo dice cuántos hay o si es masculino o femenino?',
    ok: 'Es la pregunta que separa las dos piezas que más se confunden: un "cochecito" es otra cosa; "coches" es lo mismo, pero más de uno.',
    no: 'Esa pregunta decide qué clase de pieza se ha añadido, no de qué manera se ha fabricado la palabra entera.'
  },

  'PRU-MORF-INTERM-01': {
    texto:  '¿Existe la forma intermedia?',
    simple: 'Si le quito una sola pieza, ¿lo que queda existe?',
    ok: 'La forma intermedia es el detector: si no existe, las piezas entraron a la vez y no una detrás de otra.',
    no: 'Esa pregunta distingue entre poner las piezas de una en una o las dos a la vez; aquí lo que hay que decidir es otra cosa.'
  },

  // ── Heurísticos rechazados ─────────────────────────────────────────────
  // Solo como distractores, nunca como respuesta correcta. Cada `no` nombra
  // la falacia y trae un contraejemplo: es lo que convierte el error en
  // clase, en vez de en un simple «no».

  'HEUR-LONGITUD': {
    texto:  'Es larga, luego es compuesta.',
    simple: 'Es muy larga, así que seguro que está hecha de varias palabras.',
    heuristico: true,
    no: 'La longitud no dice nada de cómo se fabricó una palabra: "inmediatamente" es larguísima y no junta dos palabras; "ciempiés" es corta y sí.'
  },

  'HEUR-MAYUSCULAS': {
    texto:  'Va en mayúsculas, luego es sigla.',
    simple: 'Va toda en mayúsculas, así que está hecha con las primeras letras de otras palabras.',
    heuristico: true,
    no: 'Las mayúsculas son ortografía, no procedimiento: un rótulo puede escribir en mayúsculas cualquier palabra, y "láser", que se escribe en minúscula, sí nació de unas iniciales.'
  },

  'HEUR-PARECIDO': {
    texto:  'Empieza igual, luego es de la misma familia.',
    simple: 'Empieza igual que otra, así que son de la misma familia.',
    heuristico: true,
    no: 'Empezar igual es una casualidad frecuente: "campo" y "campeón" comparten las cinco primeras letras y no tienen nada que ver.'
  },

  'HEUR-DOS-PARTES': {
    texto:  'La puedo partir en dos, luego es compuesta.',
    simple: 'La puedo partir en dos trozos, así que está hecha de dos palabras.',
    heuristico: true,
    no: 'Casi cualquier palabra se puede partir en dos trozos. Lo que hay que comprobar es si esos trozos existen solos como palabras.'
  },

  'HEUR-MEMORIA': {
    texto:  'Lo sé porque lo he estudiado.',
    simple: 'Lo sé porque lo he estudiado.',
    heuristico: true,
    no: 'Acordarse no es una prueba: lo que cuenta es lo que puedes demostrar mirando la palabra, no lo que recuerdas de una lista.'
  }
};

// ── Matriz de vecinos confundibles (§7 del schema) ───────────────────────
//
// Cada par es una frontera donde el error es sistemático, no casual: son las
// parejas que la investigación de aula y el banco de pares mínimos señalan
// como las que de verdad discriminan. Gobiernan dos cosas: de dónde sale el
// distractor por defecto de un `clasifica_prueba` (su vecino, no una opción
// al azar) y qué ítems llevan `peso: 2`.
//
// Dos de los seis pares no son procedimientos, sino decisiones transversales
// (`flexivo`↔`derivativo` y `familia real`↔`parecido casual`): por eso la
// matriz se expresa por ID de prueba y no por nombre de procedimiento.

export const PARES_DISCRIMINANTES = [
  { etiqueta: 'flexivo ↔ derivativo',
    pruebas: ['PRU-MORF-NUEVA-01', 'PRU-MORF-DERIV-01'] },
  { etiqueta: 'compuesta léxica ↔ parasintética',
    pruebas: ['PRU-MORF-CLEX-01', 'PRU-MORF-PARA-01'] },
  { etiqueta: 'sigla ↔ acrónimo',
    pruebas: ['PRU-MORF-SIGLA-01', 'PRU-MORF-ACRO-01'] },
  { etiqueta: 'acortamiento ↔ abreviatura',
    pruebas: ['PRU-MORF-ACORT-01', 'PRU-MORF-ABREV-01'] },
  { etiqueta: 'compuesta sintagmática ↔ compuesta léxica',
    pruebas: ['PRU-MORF-CSINT-01', 'PRU-MORF-CLEX-01'] },
  { etiqueta: 'familia real ↔ parecido casual',
    pruebas: ['PRU-MORF-FAMILIA-01', 'HEUR-PARECIDO'] }
];

// El heurístico que más tienta en cada procedimiento. El distractor por
// defecto de un `clasifica_prueba` es «el vecino + la descomposición mal
// hecha» (§7): el vecino sale de PARES_DISCRIMINANTES y la descomposición
// mal hecha, de aquí.
const HEURISTICO_POR_DEFECTO = {
  simple:                  'HEUR-DOS-PARTES',
  derivada:                'HEUR-DOS-PARTES',
  compuesta_lexica:        'HEUR-LONGITUD',
  compuesta_sintagmatica:  'HEUR-DOS-PARTES',
  compuesta_culta:         'HEUR-LONGITUD',
  parasintetica:           'HEUR-DOS-PARTES',
  sigla:                   'HEUR-MAYUSCULAS',
  acronimo:                'HEUR-MAYUSCULAS',
  acortamiento:            'HEUR-MEMORIA',
  abreviatura:             'HEUR-MEMORIA',
  numeronimo:              'HEUR-MEMORIA',
  prestamo:                'HEUR-MEMORIA'
};

// procedimiento → su prueba. Se deriva del propio catálogo para que no pueda
// desincronizarse de él.
export const PRUEBA_DE_PROCEDIMIENTO = Object.freeze(
  Object.entries(PRUEBAS_MORFOLOGIA).reduce((acc, [id, p]) => {
    if (p.procedimiento) acc[p.procedimiento] = id;
    return acc;
  }, {})
);

// id de prueba → ids de sus vecinos confundibles (simétrico, derivado de
// PARES_DISCRIMINANTES).
export const VECINOS = Object.freeze(
  PARES_DISCRIMINANTES.reduce((acc, par) => {
    const [a, b] = par.pruebas;
    (acc[a] = acc[a] || []).push(b);
    (acc[b] = acc[b] || []).push(a);
    return acc;
  }, {})
);

// ── API pública ──────────────────────────────────────────────────────────

// Texto de la prueba. `enunciado` es el campo del ítem (`tecnico` | `simple`);
// por omisión, técnico. Si falta la variante simple, cae al técnico antes que
// dejar la opción en blanco. Un id desconocido se devuelve tal cual, para que
// un lote futuro con un id nuevo se vea menos pulido pero no rompa el render.
export function textoPrueba(id, enunciado) {
  const p = PRUEBAS_MORFOLOGIA[id];
  if (!p) return String(id || '');
  if (typeof p === 'string') return p; // tolerancia con el formato antiguo
  return (enunciado === 'simple' && p.simple) ? p.simple : p.texto;
}

// Microexplicación de una opción. `ok` dice si es la respuesta correcta; el
// texto puede llevar {palabra}, que se sustituye por la palabra del ítem.
export function microPrueba(id, opts) {
  const p = PRUEBAS_MORFOLOGIA[id];
  if (!p || typeof p === 'string') return '';
  const o = opts || {};
  const txt = o.ok ? (p.ok || '') : (p.no || '');
  return txt.replace(/\{palabra\}/g, o.palabra || 'esta palabra');
}

// Los distractores que el schema pide por defecto para un procedimiento: la
// prueba de su vecino confundible + un heurístico rechazado. Herramienta de
// autoría de lotes — el motor no la usa, lee los `distractores` del ítem.
export function distractoresSugeridos(procedimiento) {
  const propia = PRUEBA_DE_PROCEDIMIENTO[procedimiento];
  const vecinos = (VECINOS[propia] || []).filter(v => v !== propia);
  const heur = HEURISTICO_POR_DEFECTO[procedimiento] || 'HEUR-MEMORIA';
  return vecinos.length ? [vecinos[0], heur] : [heur];
}

// ¿Estas dos pruebas forman uno de los seis pares discriminantes? Es la
// condición que el schema (§7) traduce en `peso: 2`.
export function esParDiscriminante(a, b) {
  return (VECINOS[a] || []).includes(b);
}

// ¿Alguno de los distractores del ítem es el vecino confundible de su prueba?
// Si no lo es, el ítem se contesta descartando opciones lejanas y deja de
// medir la frontera que dice medir.
export function tieneVecinoComoDistractor(pruebaId, distractores) {
  return (distractores || []).some(d => esParDiscriminante(pruebaId, d));
}
