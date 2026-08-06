/* pruebas-sintaxis.js — Banco de pruebas de sintaxis
   Laboratorio de Oraciones · F2 · sesión 1 (ago-2026)

   Este archivo es el repertorio de PRUEBAS que el alumno elige en los ítems
   `etiqueta_prueba` de la estación 3: la prueba no se redacta en cada reto, se
   apunta con su `prueba_id` (decisión §7.3 de docs/Schema_Laboratorio_v1.0.md).
   Un lote de 30 retos no son 30 redacciones de la prueba del CI.

   Es la conversión a datos de `Banco_reflexion_metalinguistica.md` (10
   funciones, con su prueba ✓, sus distractores ✗ razonados y su matriz de
   vecinos confundibles). Los identificadores estaban fijados desde F0·1 en el
   §8 del schema, porque el lote semilla los usa; aquí se les pone contenido.

   Qué trae cada entrada:
     · texto  — el enunciado TÉCNICO, el que ve un alumno de 3.º ESO o de
                Bachillerato. Sale del banco de reflexión, no se inventa aquí.
     · simple — la misma prueba SIN metalenguaje, para `enunciado: "simple"`
                (obligatorio en nivel `basico`, §3.9 del schema). Implementa la
                «nota de nivel» que el banco de reflexión dejaba escrita como
                NO IMPLEMENTADA desde julio. Vocabulario permitido: «trozo»,
                «oración», «verbo», «palabra», «cambiar», «quitar», «mover» —
                y los pronombres, que son palabras, no metalenguaje. Ni una
                etiqueta, ni una sigla (lo comprueba el validador en el dato
                del reto, §4.2).
     · funcion — la función que la prueba demuestra. Cadena de FUNC_ORAC
                (js/glosario/tags.js) o array cuando la prueba resuelve una
                frontera entera. 'CC' es el nombre de familia: la prueba del CC
                vale igual para CC Lugar, CC Tiempo, CC Finalidad…
     · ok     — microexplicación al acertar: por qué esa prueba cierra el caso.
     · no     — microexplicación al fallar: qué demostraría de verdad esa
                prueba. Redactada SIN depender de la oración del ítem («esa
                prueba serviría para X, como en "ejemplo"»), que es lo que la
                hace reutilizable en los 30 retos de un lote.

   **El `no` va en interrogativo, no en veredicto.** Decisión adoptada en el
   anexo del plan de producto (2026-08-06) y destinada expresamente a esta
   sesión: el fallo no se cierra con «Incorrecto», se devuelve como pregunta
   («¿Seguro? Prueba a decirlo aquí: ¿funciona?»). El alumno vuelve a la
   manipulación en vez de quedarse con la etiqueta corregida — que es todo el
   método del módulo en una línea de texto.

   Los HEUR-* son heurísticos RECHAZADOS: razonamientos que suenan bien y son
   falsos. Es la regla no negociable del proyecto contra las preguntas al verbo
   («¿quién?», «¿a quién?», «¿para quién?»): solo pueden aparecer como
   distractores, nunca como respuesta correcta — el validador da ERROR si uno
   se cuela en `prueba_id`. Por eso no llevan `ok`: no hay acierto posible.

   Formato de id: ^PRU-SINT-[A-Z]+-\d{2}$ (pruebas) | ^HEUR-[A-Z-]+$.

   Gemelo de js/data/pruebas-morfologia.js: misma forma, mismos nombres de
   función pública. Si algún día un archivo importara los dos, hay que aliasar
   en el import (`import { textoPrueba as textoPruebaMorf } …`).

   Fuentes: Banco_reflexion_metalinguistica.md (banco por función y matriz de
   vecinos) · docs/Schema_Laboratorio_v1.0.md §8 (ids) y §4.2 (metalenguaje por
   nivel) · docs/Laboratorio_Oraciones_Plan_Producto.md §2.3, §2.4 y anexo. */

export const PRUEBAS_SINTAXIS = {

  // ── Las 10 pruebas del banco de reflexión (§8 del schema) ──────────────

  'PRU-SINT-SUJ-01': {
    texto:  'Si cambio el número del verbo, este sintagma cambia con él: están obligados a concordar.',
    simple: 'Si pongo el verbo en plural, este trozo también tiene que cambiar.',
    funcion: 'Sujeto',
    ok: 'La concordancia es obligada: cambia uno y el otro no tiene más remedio que cambiar. Por eso no hace falta preguntar quién hace nada — basta con mirar qué se mueve con el verbo.',
    no: '¿Seguro? Esa prueba demuestra la concordancia obligada con el verbo, como en «Los voluntarios repartieron → El voluntario repartió». Cambia aquí el número del verbo: ¿arrastra a {trozo}?'
  },

  'PRU-SINT-CD-01': {
    texto:  'Lo sustituyo por lo / la / los / las; y si paso la oración a pasiva, este sintagma se convierte en el sujeto.',
    simple: 'Puedo cambiar este trozo por lo, la, los o las, y la oración sigue funcionando.',
    funcion: 'CD',
    ok: 'Lo decide el pronombre, no la preposición: «Avisaron a los bomberos» lleva a y aun así admite los, no les.',
    no: '¿Seguro? Esa prueba demuestra que un trozo admite lo / la / los / las, como en «Repartieron mantas → Las repartieron». Pruébalo con {trozo}: ¿suena bien?'
  },

  'PRU-SINT-CI-01': {
    texto:  'Lo sustituyo por le / les (y por se cuando va delante de lo o la: se lo entregué). Al pasar a pasiva no cambia.',
    simple: 'Puedo cambiar este trozo por le o les, y la oración sigue funcionando.',
    funcion: 'CI',
    ok: 'le / les es su pronombre, y lo sigue siendo aunque la oración se dé la vuelta. Ojo con la frontera de al lado: con para nunca funciona le.',
    no: '¿Seguro? Esa prueba demuestra que un trozo admite le / les, como en «Entregó un ramo a su profesora → Le entregó un ramo». ¿Puedes decirlo con {trozo}?'
  },

  'PRU-SINT-CREG-01': {
    texto:  'Sustituyo el término por eso / ello y la preposición se queda pegada al verbo: confían en sus hijos → confían en ello, nunca *confían ello.',
    simple: 'Si cambio este trozo por «eso», la palabra de delante (en, de, con…) no se puede quitar: se queda pegada al verbo.',
    funcion: 'C.Rég.',
    ok: 'La preposición no la trae el trozo: la exige el verbo. Por eso no se cae al sustituir, y por eso al quitar el trozo entero el verbo queda cojo.',
    no: '¿Seguro? Esa prueba demuestra que la preposición la exige el verbo y no se cae al sustituir, como en «Hablaron de política → Hablaron de ello». ¿Pasa eso con {trozo}?'
  },

  'PRU-SINT-ATR-01': {
    texto:  'Lo sustituyo por lo neutro e invariable, y solo funciona con ser, estar o parecer: Las gemelas parecían cansadas → Las gemelas lo parecían.',
    simple: 'Puedo cambiar este trozo por «lo» — siempre «lo», aunque se hable de varias: «Ellas son listas → Ellas lo son».',
    funcion: 'Atr.',
    ok: 'Ese lo es invariable: no se convierte en la ni en los aunque el sujeto sea femenino o plural. Y solo aparece con ser, estar o parecer.',
    no: '¿Seguro? Esa prueba demuestra la sustitución por lo neutro con un verbo copulativo, como en «El bloque es muy antiguo → El bloque lo es». ¿Es ese el verbo que tienes delante?'
  },

  'PRU-SINT-CPVO-01': {
    texto:  'Doble cara: modifica al verbo y a la vez concuerda con un nombre (el sujeto o el CD). Si cambio el número de ese nombre, este sintagma cambia también. El verbo NO es copulativo.',
    simple: 'Si pongo en plural la palabra de la que habla, este trozo también cambia: «El alumno salió contento → Los alumnos salieron contentos».',
    funcion: 'CPvo',
    ok: 'Las dos caras a la vez: acompaña al verbo y arrastra el número de un nombre. Un trozo invariable no haría lo segundo.',
    no: '¿Seguro? Esa prueba pide un trozo que cambie de número con un nombre y un verbo que no sea ser, estar ni parecer, como en «Encontraron consciente al herido → Encontraron conscientes a los heridos». ¿Es lo que tienes aquí?'
  },

  'PRU-SINT-CAG-01': {
    texto:  'Transformo la oración a voz activa y este sintagma pasa a ser el sujeto: El muro fue derribado por el viento → El viento derribó el muro. Solo en pasiva (ser + participio).',
    simple: 'Si le doy la vuelta a la oración, este trozo pasa a ser quien hace la acción: «El muro fue derribado por el viento → El viento derribó el muro».',
    funcion: 'C.Ag.',
    ok: 'Lo decide la transformación, no la preposición: por introduce muchas cosas, pero solo aquí el trozo pasa a hacer la acción al darle la vuelta a la oración.',
    no: '¿Seguro? Esa prueba exige que la oración esté en pasiva (ser + participio) y que al pasarla a activa el trozo se convierta en sujeto, como en «La ciudad fue fundada por los romanos → Los romanos fundaron la ciudad». ¿Se puede hacer con {trozo}?'
  },

  'PRU-SINT-CC-01': {
    texto:  'Lo puedo suprimir o desplazar sin que la oración se rompa, y es invariable. Comodín según el subtipo: allí (Lugar), entonces (Tiempo), así (Modo).',
    simple: 'Puedo quitar este trozo, o moverlo de sitio, y la oración sigue funcionando.',
    funcion: 'CC',
    ok: 'Se quita, se mueve y nunca cambia de forma: exactamente lo que no puede hacer un trozo que el verbo exige. Y es la salida de la frontera con para — «Ahorra para el viaje» se mueve y se quita, así que no admite le.',
    no: '¿Seguro? Esa prueba demuestra que un trozo se puede quitar y mover sin romper la oración, como toda la tarde en «Hablaron de política toda la tarde». ¿De verdad sobra {trozo}?'
  },

  'PRU-SINT-VOC-01': {
    texto:  'Va aislado por comas, no concuerda con el verbo y lo puedo sustituir por ¡Oye!: Profesora, ¿qué ejercicio es? → ¡Oye!, ¿qué ejercicio es?',
    simple: 'Va separado por comas y puedo cambiarlo por «¡Oye!» sin que la oración se rompa.',
    funcion: 'Vocat.',
    ok: '¡Oye! es la prueba limpia: sirve para llamar a alguien, y por eso no puede ocupar el sitio de quien hace la acción — ahí sonaría imposible.',
    no: '¿Seguro? Esa prueba pide un trozo aislado por comas y sustituible por «¡Oye!», como en «Profesora, ¿qué ejercicio es?». ¿Funciona con {trozo}?'
  },

  'PRU-SINT-SE-01': {
    texto:  '¿Concuerda el verbo con el elemento pospuesto? Si concuerda, es pasiva refleja (Se venden pisos → los pisos se venden); si el verbo queda fijo en singular, es impersonal (Se busca a los culpables).',
    simple: 'Pongo en plural lo que va detrás del verbo: si el verbo cambia con él, van juntos; si el verbo se queda igual, no.',
    funcion: ['Marca.Pas.Ref.', 'Marca.Imp.'],
    ok: 'La concordancia es el único criterio fiable: «Se necesitan camareros» cambia el verbo con camareros; «Se busca a los culpables» no lo cambia, por muchos culpables que haya.',
    no: '¿Seguro? Esa prueba consiste en mirar si el verbo cambia de número con lo que va detrás, como en «Se necesita camarero → Se necesitan camareros». ¿Es eso lo que hay que decidir aquí?'
  },

  // ── Heurísticos RECHAZADOS (solo distractores; sin `ok`) ────────────────
  //
  // Los cinco primeros son preguntas al verbo: el método las rechaza porque no
  // manipulan nada — el alumno puede acertar con ellas durante meses y fallar
  // el día que la oración no es la típica. Los tres últimos son la otra
  // familia de trampas: dar por hecho que la preposición decide la función.

  'HEUR-QUIEN': {
    texto:  'Pregunto ¿quién? y lo que responde es este sintagma.',
    simple: 'Pregunto «¿quién?» y este trozo es la respuesta.',
    heuristico: true,
    no: 'Esa pregunta falla justo donde más importa: en «Me gustan las cocinas» uno responde «a mí», y quien manda en el verbo es «las cocinas». La prueba buena es cambiar el número del verbo y ver qué se mueve con él.'
  },

  'HEUR-A-QUIEN': {
    texto:  'Pregunto ¿a quién? al verbo.',
    simple: 'Pregunto «¿a quién?» y este trozo es la respuesta.',
    heuristico: true,
    no: '¿A quién? responde igual en «Avisaron a los bomberos» (que admite los) y en «Entregó un ramo a su profesora» (que admite le): la pregunta no distingue las dos. El pronombre sí.'
  },

  'HEUR-PARA-QUIEN': {
    texto:  'Pregunto ¿para quién? al verbo.',
    simple: 'Pregunto «¿para quién?» y este trozo es la respuesta.',
    heuristico: true,
    no: 'Esa pregunta mezcla dos cosas distintas y arrastra a poner para donde no toca. Compruébalo: en «Ahorra para el viaje», le no funciona, y el trozo se puede mover y quitar.'
  },

  'HEUR-COMO': {
    texto:  'Responde a la pregunta ¿cómo?',
    simple: 'Pregunto «¿cómo?» y este trozo es la respuesta.',
    heuristico: true,
    no: '¿Cómo? responde igual en «Las gemelas parecían cansadas», en «El alumno salió contento» y en «Lo hizo así»: tres cosas distintas con la misma pregunta. Hay que probar la sustitución o el cambio de número, no preguntar.'
  },

  'HEUR-DE-QUE': {
    texto:  'Responde a la pregunta ¿de qué?',
    simple: 'Pregunto «¿de qué?» y este trozo es la respuesta.',
    heuristico: true,
    no: 'Muchos trozos que sobran responden también a ¿de qué?. Lo que decide es otra cosa: si al sustituir por eso la preposición se queda pegada al verbo, y si al quitar el trozo el verbo queda cojo.'
  },

  'HEUR-PREP-A': {
    texto:  'Lleva la preposición a, luego es CI.',
    simple: 'Lleva «a» delante, así que ya sé lo que es.',
    heuristico: true,
    no: 'Es el error más repetido del curso: «Avisaron a los bomberos» lleva a y admite los, no les. La preposición no decide nada; decide el pronombre.'
  },

  'HEUR-PREP-PARA': {
    texto:  'Lleva la preposición para, luego es CI.',
    simple: 'Lleva «para» delante, así que ya sé lo que es.',
    heuristico: true,
    no: 'Con para nunca hay CI: es regla dura. Pruébalo en «Ahorra para el viaje» — le no funciona, y el trozo se puede mover y quitar. Eso es un CC de finalidad.'
  },

  'HEUR-PREP-POR': {
    texto:  'Lleva la preposición por, luego es CC Causa.',
    simple: 'Lleva «por» delante, así que ya sé lo que es.',
    heuristico: true,
    no: 'Por introduce las dos cosas: «El muro fue derribado por el viento» se puede dar la vuelta (el viento derribó el muro) y «Lo dejó por miedo» no. Lo decide la transformación, no la preposición.'
  }
};

// ── Matriz de vecinos confundibles (banco de reflexión, §2.4 del plan) ────
//
// Son las fronteras donde el error es sistemático, no casual. Gobiernan dos
// cosas: de dónde sale el distractor por defecto de un `etiqueta_prueba` (su
// vecino, no una opción lejana que se descarta sola) y qué ítems llevan
// `peso: 2` en el examen.
//
// La matriz del banco tiene NUEVE pares. Aquí aparecen ocho: el noveno
// (Marca.Pas.Ref. ↔ Marca.Imp.) es una frontera INTERNA a PRU-SINT-SE-01 —
// esa prueba resuelve los dos lados con la misma pregunta—, así que no genera
// un par de pruebas distintas y se marca aparte, en FRONTERAS_INTERNAS.
//
// OJO (divergencia conocida, pendiente de decisión): LAB_PARES_DISCRIMINANTES
// de scripts/validar-banco.mjs lista siete pares POR FUNCIÓN y no incluye
// CD↔C.Rég., CPvo↔CC Modo ni Vocat.↔Sujeto, que el banco de reflexión sí
// tiene. Es un aviso de `peso: 2` que hoy no se emite; no afecta a la
// corrección de ningún lote.

export const PARES_DISCRIMINANTES = [
  { etiqueta: 'Sujeto ↔ CD',
    pruebas: ['PRU-SINT-SUJ-01', 'PRU-SINT-CD-01'] },
  { etiqueta: 'CD ↔ CI',
    pruebas: ['PRU-SINT-CD-01', 'PRU-SINT-CI-01'] },
  { etiqueta: 'CD ↔ C.Rég.',
    pruebas: ['PRU-SINT-CD-01', 'PRU-SINT-CREG-01'] },
  { etiqueta: 'Atr. ↔ CPvo',
    pruebas: ['PRU-SINT-ATR-01', 'PRU-SINT-CPVO-01'] },
  { etiqueta: 'CPvo ↔ CC Modo',
    pruebas: ['PRU-SINT-CPVO-01', 'PRU-SINT-CC-01'] },
  { etiqueta: 'CI ↔ CC Finalidad',
    pruebas: ['PRU-SINT-CI-01', 'PRU-SINT-CC-01'] },
  { etiqueta: 'C.Rég. ↔ CC',
    pruebas: ['PRU-SINT-CREG-01', 'PRU-SINT-CC-01'] },
  { etiqueta: 'C.Ag. ↔ CC Causa',
    pruebas: ['PRU-SINT-CAG-01', 'PRU-SINT-CC-01'] },
  { etiqueta: 'Vocat. ↔ Sujeto',
    pruebas: ['PRU-SINT-VOC-01', 'PRU-SINT-SUJ-01'] }
];

// Fronteras que una sola prueba resuelve por dentro: no dan distractor, pero
// sí son ítems de peso 2 (el ítem cae sobre la frontera aunque la prueba sea
// la misma para las dos salidas).
export const FRONTERAS_INTERNAS = [
  { etiqueta: 'Marca.Pas.Ref. ↔ Marca.Imp.', prueba: 'PRU-SINT-SE-01' }
];

// El heurístico que más tienta en cada función. El distractor por defecto de un
// `etiqueta_prueba` es «el vecino + un heurístico rechazado» (§3.9 del schema):
// el vecino sale de PARES_DISCRIMINANTES y el heurístico, de aquí.
const HEURISTICO_POR_DEFECTO = {
  'Sujeto':          'HEUR-QUIEN',
  'CD':              'HEUR-PREP-A',
  'CI':              'HEUR-PARA-QUIEN',
  'C.Rég.':          'HEUR-DE-QUE',
  'Atr.':            'HEUR-COMO',
  'CPvo':            'HEUR-COMO',
  'C.Ag.':           'HEUR-PREP-POR',
  'CC':              'HEUR-COMO',
  'CC Finalidad':    'HEUR-PARA-QUIEN',
  'CC Causa':        'HEUR-PREP-POR',
  'CC Modo':         'HEUR-COMO',
  'Vocat.':          'HEUR-QUIEN',
  // El se: la tentación real no es una preposición, es inventar un sujeto
  // preguntando «¿quién?» en «Se busca a los culpables».
  'Marca.Pas.Ref.':  'HEUR-QUIEN',
  'Marca.Imp.':      'HEUR-QUIEN'
};

// El vecino que toca cuando una prueba tiene varios y la función no basta para
// elegirlo sola. Pasa entero con el CC: PRU-SINT-CC-01 es la prueba de toda la
// familia, así que su lista de vecinos mezcla los de CC Modo (CPvo), CC
// Finalidad (CI) y CC Causa (C.Ag.), y sin esta tabla el distractor sugerido
// para «Ahorra para el viaje» podía salir siendo la prueba del CPvo — un
// distractor que se descarta solo y no mide la frontera que dice medir.
const VECINO_POR_FUNCION = {
  'CD':           'PRU-SINT-CI-01',    // la frontera que de verdad se falla
  'C.Rég.':       'PRU-SINT-CC-01',    // ¿se puede quitar o deja el verbo cojo?
  'CC':           'PRU-SINT-CREG-01',
  'CC Modo':      'PRU-SINT-CPVO-01',
  'CC Finalidad': 'PRU-SINT-CI-01',
  'CC Causa':     'PRU-SINT-CAG-01'
};

// función → su prueba. Se deriva del propio catálogo para que no pueda
// desincronizarse de él. Los subtipos de CC ('CC Lugar', 'CC Benef.'…) no se
// listan: los resuelve pruebaDeFuncion() cayendo a la familia 'CC'.
export const PRUEBA_DE_FUNCION = Object.freeze(
  Object.entries(PRUEBAS_SINTAXIS).reduce((acc, [id, p]) => {
    if (!p.funcion) return acc;
    (Array.isArray(p.funcion) ? p.funcion : [p.funcion]).forEach(f => { acc[f] = id; });
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

// La prueba de una función, tolerando los subtipos de CC: 'CC Lugar',
// 'CC Finalidad'… comparten la prueba de la familia. Devuelve null si la
// función no tiene prueba en el repertorio (PN, PV, Conector, Dativo…): el
// ítem `etiqueta_prueba` no debería existir para ellas.
export function pruebaDeFuncion(funcion) {
  const f = String(funcion || '');
  if (PRUEBA_DE_FUNCION[f]) return PRUEBA_DE_FUNCION[f];
  if (f.startsWith('CC ')) return PRUEBA_DE_FUNCION['CC'] || null;
  return null;
}

// Texto de la prueba. `enunciado` es el campo del ítem (`tecnico` | `simple`);
// por omisión, técnico. Si falta la variante simple, cae al técnico antes que
// dejar la opción en blanco. Un id desconocido se devuelve tal cual, para que
// un lote futuro con un id nuevo se vea menos pulido pero no rompa el render.
export function textoPrueba(id, enunciado) {
  const p = PRUEBAS_SINTAXIS[id];
  if (!p) return String(id || '');
  if (typeof p === 'string') return p; // tolerancia con el formato antiguo
  return (enunciado === 'simple' && p.simple) ? p.simple : p.texto;
}

// Microexplicación de una opción. `ok` dice si es la respuesta correcta; el
// texto puede llevar {trozo}, que se sustituye por el sintagma señalado en el
// ítem (`objetivo.texto`). Los heurísticos no tienen `ok`: si alguna vez se
// pidiera el suyo, devuelve cadena vacía en vez de inventar un acierto.
export function microPrueba(id, opts) {
  const p = PRUEBAS_SINTAXIS[id];
  if (!p || typeof p === 'string') return '';
  const o = opts || {};
  const txt = o.ok ? (p.ok || '') : (p.no || '');
  return txt.replace(/\{trozo\}/g, o.trozo ? `«${o.trozo}»` : 'este trozo');
}

// ¿Este id es un heurístico rechazado? Nunca puede ser respuesta correcta.
export function esHeuristico(id) {
  const p = PRUEBAS_SINTAXIS[id];
  return !!(p && p.heuristico) || /^HEUR-/.test(String(id || ''));
}

// Los distractores que el schema pide por defecto para una función: la prueba
// de su vecino confundible + un heurístico rechazado. Herramienta de autoría
// de lotes — el motor no la usa, lee los `distractores` del ítem.
//
// Excepción conocida: Marca.Pas.Ref. y Marca.Imp. devuelven solo el heurístico,
// porque su frontera es interna a PRU-SINT-SE-01 y no hay una prueba vecina que
// ofrecer. El schema pide 2-3 distractores, así que en esos ítems el segundo se
// escribe a mano (candidato natural: PRU-SINT-SUJ-01, que es el error real —
// dar por hecho que «a los culpables» de «Se busca a los culpables» manda en el
// verbo). Convertir eso en un par fijo de la matriz sería añadir un décimo par
// al banco de reflexión: decisión de canon, no de código.
export function distractoresSugeridos(funcion) {
  const f = String(funcion || '');
  const propia = pruebaDeFuncion(f);
  const vecinos = (VECINOS[propia] || []).filter(v => v !== propia);
  const preferido = VECINO_POR_FUNCION[f] || (f.startsWith('CC ') ? VECINO_POR_FUNCION['CC'] : null);
  const vecino = (preferido && vecinos.includes(preferido)) ? preferido : vecinos[0];
  const heur = HEURISTICO_POR_DEFECTO[f]
    || (f.startsWith('CC ') ? HEURISTICO_POR_DEFECTO['CC'] : null)
    || 'HEUR-QUIEN';
  return vecino ? [vecino, heur] : [heur];
}

// ¿Estas dos pruebas forman uno de los pares discriminantes? Es la condición
// que el schema (§6) traduce en `peso: 2`.
export function esParDiscriminante(a, b) {
  return (VECINOS[a] || []).includes(b);
}

// ¿Alguno de los distractores del ítem es el vecino confundible de su prueba?
// Si no lo es, el ítem se contesta descartando opciones lejanas y deja de
// medir la frontera que dice medir.
export function tieneVecinoComoDistractor(pruebaId, distractores) {
  return (distractores || []).some(d => esParDiscriminante(pruebaId, d));
}
