/* canon-agramatical.js — Canon de aceptabilidad del corpus del Laboratorio
   Laboratorio de Oraciones · F2 · sesión 1 (ago-2026)

   Las 22 causas del schema (§5 de docs/Schema_Laboratorio_v1.0.md), con lo que
   el schema NO guarda: qué marca lleva cada una (✗ / ⚠ / ⚖), cómo se le nombra
   al alumno, con qué ejemplo canónico se contrasta y —lo que de verdad importa
   al escribir un lote— dónde está su frontera: qué cuenta como esa causa y qué
   no.

   POR QUÉ ESTE ARCHIVO EXISTE. El principio rector viene del marco teórico
   (§2.3) y es la decisión más delicada del módulo: **no todo lo que "suena
   raro" es lo mismo**.

     ✗ agramatical  — se rompe la comprensión gramatical. Ningún hablante nativo
                      lo dice. Lleva asterisco. Se pide veredicto Y causa.
     ⚠ norma culta  — se dice y se entiende; lo que falla es el registro formal.
                      NUNCA lleva asterisco. No se pregunta «¿está mal?», se
                      pregunta «¿en qué situación no vale?».
     ⚖ zona gris    — hay dos análisis defendibles. Puntúan los dos si la
                      justificación es coherente. Fuera del examen.

   Confundir las tres es el error pedagógico que este corpus existe para evitar.
   Un asterisco sobre algo que el alumno oye en su casa todos los días no
   enseña gramática: enseña que su forma de hablar está mal. Por eso la lista
   FUERA_DEL_CORPUS de más abajo no es una recomendación, es un límite.

   QUIÉN LEE ESTO:
     · el motor (js/modules/laboratorio/index.js) — etiquetas del alumno,
       símbolos y la regla del asterisco;
     · quien escribe un lote — el campo `criterio` de cada causa y las reglas
       editoriales del documento hermano;
     · el validador (scripts/validar-banco.mjs) tiene su propia copia de
       causa → nivel mínimo → veredicto, deliberadamente: es un script Node sin
       imports del front. Si un día se toca una de las dos, hay que tocar la
       otra — está anotado en los dos sitios.

   Documento hermano (reglas de redacción del corpus, lo que un archivo de
   datos no puede contener): docs/Canon_Agramaticalidad_Laboratorio.md.

   Fuentes: docs/Laboratorio_Oraciones_Plan_Producto.md §2.5 · Schema §5 ·
   marco_teorico_didactico.md §2.3 (proyecto de Lengua) · banco R-07 de pares
   mínimos, de donde salen los ejemplos con `fuente_id`. */

// ── Las tres marcas ──────────────────────────────────────────────────────
// `asterisco` es la regla 1 del plan §2.5: el asterisco lo pinta la UI, nunca
// el dato. El JSON del reto guarda siempre la oración limpia.

export const MARCAS = {
  agramatical: {
    simbolo: '✗',
    asterisco: true,
    titulo: 'No funciona',
    que_es: 'Se rompe la gramática: ningún hablante nativo lo diría.',
    pregunta: '¿Esta oración funciona?'
  },
  norma_culta: {
    simbolo: '⚠',
    asterisco: false,
    titulo: 'Se dice, pero cuidado con el registro',
    que_es: 'Se dice y se entiende. Lo que falla no es la gramática: es la norma culta, la que se espera en un examen, en una instancia o en un periódico.',
    pregunta: '¿En qué situación NO valdría esta oración?'
  },
  zona_gris: {
    simbolo: '⚖',
    asterisco: false,
    titulo: 'Es debatible',
    que_es: 'Las dos opciones son defendibles. Lo que se evalúa no es cuál eliges, sino que sepas explicar por qué.',
    pregunta: '¿Qué dos análisis caben aquí?'
  }
};

// La leyenda fija que acompaña a todo asterisco en pantalla (plan §2.5.1).
// Se muestra tal cual: es la que impide que el alumno lea el asterisco como
// una corrección de su forma de hablar.
export const LEYENDA_ASTERISCO = 'El asterisco marca lo que un hablante nativo no diría.';

// Los cuatro veredictos del schema (enum cerrado de `juicio.veredicto`) con su
// cara visible. Tres de ellos apuntan a una marca; `gramatical` es el control
// (regla 3 del plan §2.5: al menos un ítem correcto por cada tres juicios, o el
// alumno aprende a contestar «mal» sin mirar).
export const VEREDICTOS = {
  gramatical:  { icon: '✓', label: 'Funciona bien',           marca: null },
  agramatical: { icon: '✗', label: 'No funciona',             marca: 'agramatical' },
  norma_culta: { icon: '⚠', label: 'Se dice, pero cuidado',   marca: 'norma_culta' },
  dudoso:      { icon: '⚖', label: 'Es debatible',            marca: 'zona_gris' }
};

export const ORDEN_VEREDICTOS = ['gramatical', 'agramatical', 'norma_culta', 'dudoso'];

// ── Las 22 causas ────────────────────────────────────────────────────────
//
// Eran 16 hasta ago-2026. Las tres primeras nuevas (concordancia_det_nombre,
// concordancia_atono, atono_plural_discordante) salieron de una auditoría del
// banco: 6 juicios etiquetaban como concordancia_sv errores que no lo eran, y
// la explicación que leía el alumno era correcta mientras la causa que tenía
// que elegir era falsa. No había hueco en la lista para lo que de verdad
// pasaba en esas oraciones.
//
// Ampliación de 2026-08-20 (bloque de valores de «se», paso A —
// docs/Cascada_Valores_del_SE_Laboratorio.md §6.3): tres causas más
// (impersonal_pluralizada, reciproco_sujeto_singular, verbo_pronominal_sin_se)
// que el corpus de «se» necesita para sus juicios y que ninguna de las 19
// anteriores nombraba. 19 → 22, mismo patrón: retrocompatible, sin subir
// schema_version.
//
// Campos:
//   marca     — ✗ / ⚠ / ⚖ (clave de MARCAS).
//   veredicto — el que el schema exige para esa causa. El validador da ERROR
//               si no coinciden: un queísmo con veredicto "agramatical" es
//               precisamente la confusión que el corpus quiere evitar.
//   nivelMin  — antes de ese nivel la causa no aparece.
//   familia   — de qué va el error. Gobierna de dónde salen los distractores
//               de `opciones_causa`: un distractor de la misma familia obliga a
//               mirar la oración; uno de familia lejana se descarta solo.
//   etiqueta  — cómo se le nombra al alumno. Sin metalenguaje: estos textos se
//               ven en estación 2, donde las etiquetas todavía no existen.
//   rompe     — qué se rompe, en términos técnicos (para el profesor y para el
//               informe, nunca para la pantalla del alumno).
//   ejemplo   — { mal, bien }. `bien` es la gemela correcta: regla 2 del plan
//               §2.5 — nunca una oración agramatical sola en pantalla.
//   criterio  — LA FRONTERA. Qué cuenta como esta causa y qué no. Es lo que se
//               consulta al escribir un lote, y lo que evita que dos causas se
//               solapen y el ítem tenga dos respuestas buenas.

export const CAUSAS = {

  // ── basico: solo lo que se rompe a oído, sin saber una sola etiqueta ──

  concordancia_sv: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'basico',
    familia: 'concordancia',
    etiqueta: 'El verbo no concuerda con quien hace la acción',
    rompe: 'Número o persona entre el sujeto y el verbo.',
    ejemplo: { mal: 'Los niños juega en el patio.', bien: 'Los niños juegan en el patio.' },
    criterio: 'Solo el desajuste de número o persona con el sujeto. Si el sujeto va detrás del verbo el ítem sigue valiendo (*Llegó los invitados), y ahí es más rentable. NO entra la concordancia con el significado (La mayoría llegó/llegaron): eso es zona gris, no error.'
  },

  concordancia_atr: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'basico',
    familia: 'concordancia',
    etiqueta: 'La palabra que describe no concuerda con quien hace la acción',
    rompe: 'El Atr. no concuerda en género o número con el sujeto.',
    ejemplo: { mal: 'Las chicas están contentos.', bien: 'Las chicas están contentas.' },
    criterio: 'Exige verbo copulativo (ser, estar, parecer). Con cualquier otro verbo el desajuste es concordancia_cpvo, que es de nivel medio: la frontera entre las dos causas es el verbo, no la palabra que describe. Fuente: PM-SINT-22.'
  },

  concordancia_det_nombre: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'basico',
    familia: 'concordancia',
    etiqueta: 'Esas dos palabras van juntas y no dicen el mismo número',
    rompe: 'Determinante y nombre discordantes en género o número dentro del mismo sintagma.',
    ejemplo: { mal: 'Ayer compramos las entrada.', bien: 'Ayer compramos las entradas.' },
    criterio: 'El desajuste está DENTRO del sintagma nominal, entre el determinante y su nombre — no con el verbo. Es la frontera con concordancia_sv, y confundirlas era un fallo real y repetido del banco (auditoría de ago-2026): la prueba operativa es que al corregirlo cambia el nombre o el determinante, nunca la forma verbal. Si lo que cambia es el verbo, la causa es concordancia_sv. NO se usa para el pronombre átono con su antecedente (Le … a sus amigos): eso son las dos causas de átono.'
  },

  transitividad: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'basico',
    familia: 'seleccion',
    etiqueta: 'El verbo no admite eso que recibe la acción',
    rompe: 'Verbo intransitivo con CD.',
    ejemplo: { mal: 'Pedro salió la casa.', bien: 'Pedro salió de la casa.' },
    criterio: 'El verbo no admite CD de ninguna clase. Si el verbo sí admite complemento pero exige una preposición concreta que se ha sustituido (*pienso de mi familia), es regimen_prep. Si lo admite pero no de ese tipo de cosa (*Presencié a los jugadores), es seleccion_semantica. Fuente: PM-SINT-09.'
  },

  orden_imposible: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'basico',
    familia: 'orden',
    etiqueta: 'Ese orden de palabras no es posible',
    rompe: 'Permutación que rompe la estructura del sintagma o de la oración.',
    ejemplo: { mal: 'Casa la limpió Pedro la.', bien: 'Pedro limpió la casa.' },
    criterio: 'El orden tiene que ser IMPOSIBLE, no raro ni marcado. El español ordena con mucha libertad y el módulo enseña justamente eso en el experimento «mueve»: si una permutación se puede decir con otra entonación o en otro contexto, no es un error, es un desplazamiento. Casos seguros: determinante detrás de su nombre, pronombre átono separado de su verbo, preposición sin término.'
  },

  // Las dos causas del pronombre átono discordante con su antecedente. Van
  // SEPARADAS a propósito, y es la decisión de canon de ago-2026: el desajuste
  // no vale lo mismo en las dos direcciones. Un plural donde el antecedente es
  // uno solo (*A Elena les gusta) no lo dice nadie; un singular donde el
  // antecedente es plural (Le escribió a sus amigos) lo dice y lo escribe media
  // España, incluida la prensa. Meterlas en la misma causa obligaba a elegir
  // entre poner asterisco a lo segundo o quitárselo a lo primero, y las dos
  // opciones enseñaban algo falso.

  concordancia_atono: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'basico',
    familia: 'pronombre',
    etiqueta: 'Ese pronombre habla de varios y la persona es una sola',
    rompe: 'Pronombre átono en plural con antecedente singular.',
    ejemplo: { mal: 'A Elena les gusta el chocolate.', bien: 'A Elena le gusta el chocolate.' },
    criterio: 'Solo esta dirección: átono PLURAL con antecedente SINGULAR. Es la que ningún hablante nativo produce, y por eso lleva ✗. La dirección contraria (átono singular con antecedente plural) es atono_plural_discordante y va con ⚠ SIN asterisco. Frontera con pronombre_cruzado: ahí el error es de FUNCIÓN (la por le), aquí es solo de NÚMERO, con la función bien elegida.'
  },

  atono_plural_discordante: {
    marca: 'norma_culta', veredicto: 'norma_culta', nivelMin: 'basico',
    familia: 'pronombre',
    etiqueta: 'Ese pronombre se dice, pero la norma pide el plural',
    rompe: 'Átono singular (le) con antecedente plural: discordancia extendida, no agramaticalidad.',
    ejemplo: { mal: 'Le escribió una carta a sus amigos.', bien: 'Les escribió una carta a sus amigos.' },
    criterio: 'SIN asterisco, y esto es lo importante: la discordancia de «le» con un antecedente plural está extendidísima en el habla y aparece en el escrito culto, así que la NGLE la trata como discordancia, no como oración rota. La pregunta del ítem es en qué situación no vale, NUNCA si está mal. Es además la ÚNICA causa ⚠ de nivel basico: el alumno de 2.º ESO se encuentra aquí por primera vez con la marca de registro, y el ítem tiene que dejar clarísimo que la oración se entiende y se dice. La dirección contraria (*A Elena les gusta) es concordancia_atono y sí lleva ✗.'
  },

  // ── medio: aparece la frontera entre funciones vecinas ──

  concordancia_cpvo: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'medio',
    familia: 'concordancia',
    etiqueta: 'La palabra que describe no concuerda con aquello de lo que habla',
    rompe: 'El CPvo no concuerda con el nombre al que se refiere (sujeto o CD).',
    ejemplo: { mal: 'Encontraron consciente a los heridos.', bien: 'Encontraron conscientes a los heridos.' },
    criterio: 'Verbo NO copulativo (si lo es, la causa es concordancia_atr). El ítem gana valor cuando la palabra podría concordar con dos nombres distintos y solo una opción es la buena — es la frontera Atr./CPvo, que pesa 2.'
  },

  regimen_prep: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'medio',
    familia: 'preposicion',
    etiqueta: 'Esa preposición no es la que exige el verbo',
    rompe: 'Preposición fija del verbo sustituida por otra.',
    ejemplo: { mal: 'Pienso de mi familia todos los días.', bien: 'Pienso en mi familia todos los días.' },
    criterio: 'El verbo exige una preposición concreta y se ha puesto otra. Comprobación obligatoria antes de escribir el ítem: que no exista una lectura buena con la preposición cambiada (pensar de sí existe en «pensar bien de alguien»; hablar de y hablar con son las dos correctas). Si las dos se dicen, no hay error: hay par mínimo, que es otro tipo de ítem. Fuente: PM-SINT-29.'
  },

  pronombre_cruzado: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'medio',
    familia: 'pronombre',
    etiqueta: 'Ese pronombre es el de la otra función de la oración',
    rompe: 'Pronombre de CD donde corresponde el de CI, o al revés, estando las dos funciones presentes.',
    ejemplo: { mal: 'María la escribió una carta a Juan.', bien: 'María le escribió una carta a Juan.' },
    criterio: 'Las DOS funciones tienen que estar en la oración: es lo que hace el error visible y lo que lo separa del laísmo (⚠, avanzado), donde no hay cruce sino uso extendido de la norma no culta. Regla dura: si el ejemplo se oye con naturalidad en zonas laístas o leístas, la causa es leismo_laismo y la marca es ⚠, no ✗. Fuente: PM-SINT-35.'
  },

  // Nueva de 2026-08-20 (bloque de valores de «se», docs/Cascada_Valores_del_SE_Laboratorio.md
  // §6.3): el corpus del bloque B (rama paradigmática) trae un error clásico del recíproco
  // que ninguna causa anterior nombraba.

  reciproco_sujeto_singular: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'medio',
    familia: 'pronombre',
    etiqueta: 'Ese «se» dice que la acción va de uno a otro, y aquí solo hay una persona',
    rompe: '«se» recíproco con sujeto en singular: el recíproco exige como mínimo dos participantes.',
    ejemplo: { mal: 'Ana se escribieron cartas.', bien: 'Ana y Luis se escribieron cartas.' },
    criterio: 'Solo cuenta cuando el verbo admite la prueba «el uno al otro» / «mutuamente» y el sujeto nombra a una sola persona. El recíproco exige como mínimo dos participantes, así que el arreglo NO puede ser tocar el verbo (Ana escribió cartas ya no es recíproco, es otra acción): tiene que ser añadir un segundo sujeto. Es la misma lógica que concordancia_sv pero sobre el pronombre «se», no sobre la forma verbal: allí se corrige el verbo, aquí se corrige el sujeto.'
  },

  seleccion_semantica: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'medio',
    familia: 'seleccion',
    etiqueta: 'El verbo no admite esa clase de complemento',
    rompe: 'El verbo admite el complemento, pero no de ese tipo semántico.',
    ejemplo: { mal: 'Presencié a los jugadores.', bien: 'Presencié el partido.' },
    criterio: 'El verbo sí es transitivo: lo que falla es la clase de cosa. Es la causa más resbaladiza del corpus, porque casi todo se puede rescatar con imaginación o con una lectura figurada. Solo se escribe cuando el rescate es forzado; si a alguien se le ocurre un contexto normal donde se diga, el ítem no vale. Fuente: PM-SINT-36.'
  },

  // Nueva de 2026-08-20 (mismo origen que reciproco_sujeto_singular): la rama
  // paradigmática de la cascada de «se» también trae verbos que no existen sin él.

  verbo_pronominal_sin_se: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'medio',
    familia: 'seleccion',
    etiqueta: 'Ese verbo no existe sin su «se»',
    rompe: 'Verbo pronominal (arrepentirse, quejarse, atreverse…) usado sin el «se» que forma parte de él.',
    ejemplo: { mal: 'Alfonso arrepintió.', bien: 'Alfonso se arrepintió.' },
    criterio: 'Solo verbos genuinamente pronominales, los que no existen sin «se» (arrepentirse, quejarse, atreverse, jactarse…). NO cuenta con verbos que admiten «se» de forma opcional y con matiz (comer/comerse, ir/irse): ahí quitar el «se» no rompe nada, solo cambia el matiz, y no hay ítem. Frontera con transitividad: ahí falta o sobra un complemento; aquí falta una pieza del propio verbo, sin la cual la oración no se sostiene.'
  },

  articulo_propio: {
    marca: 'norma_culta', veredicto: 'norma_culta', nivelMin: 'medio',
    familia: 'norma',
    etiqueta: 'El nombre propio no lleva artículo en registro formal',
    rompe: 'Nombre propio de persona precedido de artículo.',
    ejemplo: { mal: 'El Buñuel rodó su primera película en París.', bien: 'Buñuel rodó su primera película en París.' },
    criterio: 'SIN asterisco: se dice, y muchísimo, en el habla familiar de media España. La pregunta del ítem es en qué situación no vale, no si está mal. Quedan fuera los casos en que el artículo es normativo (apellidos de artistas: la Callas; topónimos con artículo: El Cairo, La Manga). Fuente: PM-SINT-34.'
  },

  // ── avanzado: construcciones de Bachillerato y norma culta ──

  pasiva_refleja_intrans: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'avanzado',
    familia: 'seleccion',
    etiqueta: 'Ese verbo no admite esta construcción',
    rompe: 'Pasiva refleja construida sobre un verbo que no admite pasiva.',
    ejemplo: { mal: 'Se desapareció el acuerdo entre las partes.', bien: 'Desapareció el acuerdo entre las partes.' },
    criterio: 'La pasiva refleja necesita un verbo transitivo. Cuidado con los verbos que admiten un se de otro valor (se cayó, se murió, se fue): ahí el se es correcto y no hay error ninguno. El ítem solo vale si la única lectura posible del se es la de pasiva refleja. Fuente: PM-SINT-54.'
  },

  // Nueva de 2026-08-20 (bloque de valores de «se», docs/Cascada_Valores_del_SE_Laboratorio.md
  // §6.3): el error que confunde impersonal con pasiva refleja en la dirección contraria a
  // pasiva_refleja_intrans — aquí el verbo SÍ admite la construcción, pero se pluraliza cuando
  // no debía.

  impersonal_pluralizada: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'avanzado',
    familia: 'seleccion',
    etiqueta: 'El verbo copia el plural de quien recibe la acción, y aquí no debía',
    rompe: 'Verbo de una construcción impersonal con «se» pluralizado por atracción del CD de persona pospuesto (marcado con «a»); el impersonal es siempre 3.ª persona del singular.',
    ejemplo: { mal: 'Se han pagado a todos los proveedores.', bien: 'Se ha pagado a todos los proveedores.' },
    criterio: 'Solo cuenta cuando el sintagma pospuesto lleva «a» de persona: esa «a» es la marca de que la construcción es impersonal, no pasiva refleja, así que el verbo tiene que quedarse invariable en 3.ª persona del singular. Si se quita la «a» (Se han pagado las facturas), la construcción pasa a ser pasiva refleja y el plural es correcto: ahí no hay error. No es concordancia_sv: la impersonal con «se» no tiene sujeto, así que no hay nada con lo que el verbo tenga que concordar.'
  },

  duplicacion_obligatoria: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'avanzado',
    familia: 'pronombre',
    etiqueta: 'Falta el pronombre que tenía que repetirse',
    rompe: 'Falta el pronombre átono obligatorio con pronombre tónico o con complemento antepuesto.',
    ejemplo: { mal: 'Vi a ella en la puerta del instituto.', bien: 'La vi a ella en la puerta del instituto.' },
    criterio: 'La duplicación es obligatoria con pronombre tónico (a ella, a mí) y con complemento antepuesto (A los ganadores les dieron…). Con un sintagma nominal pospuesto normal es opcional (Le di el libro a Juan / Di el libro a Juan): ahí NO hay error y no se escribe ítem. Fuente: PM-SINT-55.'
  },

  modo_obligado: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'avanzado',
    familia: 'modo',
    etiqueta: 'El verbo pide aquí otra forma',
    rompe: 'Indicativo donde el verbo principal exige subjuntivo.',
    ejemplo: { mal: 'Prefiero que viajas en tren.', bien: 'Prefiero que viajes en tren.' },
    criterio: 'Solo verbos que imponen el modo sin discusión (querer, preferir, pedir, esperar, dudar…). Quedan fuera los que admiten los dos con cambio de significado (creo que viene / no creo que venga; entiendo que viene / entiendo que venga): con esos hay par mínimo, no error. Fuente: PM-SINT-49.'
  },

  gradabilidad: {
    marca: 'agramatical', veredicto: 'agramatical', nivelMin: 'avanzado',
    familia: 'seleccion',
    etiqueta: 'Ese adjetivo no admite ese grado',
    rompe: 'Cuantificador de grado sobre un adjetivo no graduable.',
    ejemplo: { mal: 'El universo es muy infinito.', bien: 'El universo es infinito.' },
    criterio: 'Adjetivos absolutos de verdad (infinito, eterno, único, perfecto en su sentido estricto). Ojo con el uso expresivo: «muy único» se oye en publicidad y en el habla enfática, y ahí es un recurso, no un error de gramática. Si el ejemplo admite lectura expresiva, no se escribe. Fuente: PM-SINT-58.'
  },

  queismo_dequeismo: {
    marca: 'norma_culta', veredicto: 'norma_culta', nivelMin: 'avanzado',
    familia: 'preposicion',
    etiqueta: 'Sobra o falta una preposición delante de «que»',
    rompe: 'Preposición ante que añadida (dequeísmo) o suprimida (queísmo).',
    ejemplo: { mal: 'Me alegro que vengas a la fiesta.', bien: 'Me alegro de que vengas a la fiesta.' },
    criterio: 'SIN asterisco: se dice, y en toda la península. La pregunta es de registro. El ítem gana si trae al lado la prueba operativa —sustituir la subordinada por eso: «me alegro DE eso» / «pienso eso»—, que es lo que el alumno se lleva puesto al examen.'
  },

  leismo_laismo: {
    marca: 'norma_culta', veredicto: 'norma_culta', nivelMin: 'avanzado',
    familia: 'pronombre',
    etiqueta: 'Ese pronombre se dice, pero no es el que pide la norma',
    rompe: 'le por lo, o la por le, fuera de lo que la norma culta admite.',
    ejemplo: { mal: 'La dije que viniera pronto.', bien: 'Le dije que viniera pronto.' },
    criterio: 'SIN asterisco, y con cuidado extra: es un rasgo geográfico, no un descuido. La pregunta es de registro. Queda FUERA el leísmo de persona masculina singular (le vi a Juan), que la norma admite sin reservas: escribirlo como error sería enseñar una regla falsa.'
  },

  concordancia_ad_sensum: {
    marca: 'zona_gris', veredicto: 'dudoso', nivelMin: 'avanzado',
    familia: 'concordancia',
    etiqueta: 'Concuerda con el significado, no con la forma',
    rompe: 'Concordancia con el sentido (plural) frente a la forma (singular), o al revés.',
    ejemplo: { mal: 'La mayoría de los alumnos llegaron tarde.', bien: 'La mayoría de los alumnos llegó tarde.' },
    criterio: 'ÚNICA causa ⚖ del corpus, y las dos opciones son correctas: aquí `ejemplo.mal` no es una oración mala, es la otra lectura (el campo se llama así por uniformidad del formato). Obliga a zona_gris:true en el reto y eso la deja fuera del examen. Se juega como ítem `frontera`, nunca como `juicio`.'
  }
};

// ── Lo que queda FUERA del corpus, sin excepción ─────────────────────────
//
// No es una lista de recomendaciones. Es el límite del módulo, y viene del
// marco teórico (§2.3): estas cosas se abordan como variación —social,
// geográfica, de escritura—, no como material de análisis gramatical. No hay
// código de causa para ellas, así que el schema no permite escribirlas.

export const FUERA_DEL_CORPUS = [
  { que: 'Incorrección de origen social',
    ejemplos: ['haiga', 'cocretas', 'dijistes'],
    por_que: 'Un asterisco sobre el habla de casa de un alumno de 2.º ESO no enseña gramática: le enseña que su familia habla mal. Es un coste pedagógico que el módulo no paga.' },
  { que: 'Rasgos dialectales, incluidos los de la Región de Murcia',
    ejemplos: ['aspiración de la -s final', 'formas del habla murciana'],
    por_que: 'Son variación geográfica: se estudian como tal, en su sitio del currículo, no como error.' },
  { que: 'Ortografía y puntuación',
    ejemplos: ['*aver', '*a ver si vienes / haber'],
    por_que: 'No es sintaxis. Tiene su propio lugar en la app y en la programación.' },
  { que: 'Léxico y propiedad',
    ejemplos: ['*Me dijo un tema muy interesante'],
    por_que: 'El juicio se enturbia: el alumno acierta por vocabulario y el ítem deja de medir estructura.' },
  { que: 'Cualquier ejemplo que pueda leerse como burla del habla familiar del alumno',
    ejemplos: [],
    por_que: 'Regla de cierre: en la duda, no entra. El corpus tiene ejemplos de sobra sin necesidad de rozar esto.' }
];

// ── Derivados y API ──────────────────────────────────────────────────────

const ORDEN_NIVEL = { basico: 1, medio: 2, avanzado: 3 };

// Etiqueta del alumno. Un código desconocido se devuelve tal cual, para que un
// lote futuro con una causa nueva se vea sin pulir pero no rompa el render.
export function etiquetaCausa(codigo) {
  const c = CAUSAS[codigo];
  return c ? c.etiqueta : String(codigo || '');
}

export function marcaDeCausa(codigo) {
  const c = CAUSAS[codigo];
  return c ? MARCAS[c.marca] : null;
}

// ¿Se pinta asterisco? Depende del VEREDICTO, no de la causa: es la regla 1 del
// plan §2.5 y la razón de que norma_culta y dudoso nunca lo lleven.
export function llevaAsterisco(veredicto) {
  const v = VEREDICTOS[veredicto];
  return !!(v && v.marca && MARCAS[v.marca] && MARCAS[v.marca].asterisco);
}

// La pregunta que encabeza el ítem. Un ⚠ NO se pregunta «¿esta oración
// funciona?» —funciona, se dice y se entiende—, se pregunta por la situación.
export function preguntaDeVeredicto(veredicto) {
  const v = VEREDICTOS[veredicto];
  const m = v && v.marca ? MARCAS[v.marca] : null;
  return (m && m.pregunta) || MARCAS.agramatical.pregunta;
}

// Las causas disponibles hasta un nivel (incluido).
export function causasDeNivel(nivel) {
  const tope = ORDEN_NIVEL[nivel] || 3;
  return Object.keys(CAUSAS).filter(k => (ORDEN_NIVEL[CAUSAS[k].nivelMin] || 1) <= tope);
}

// Las `opciones_causa` sugeridas al escribir un lote: la correcta primero (el
// motor las baraja) y detrás las que de verdad tientan. El orden de preferencia
// es misma familia → misma marca → resto, y dentro de cada grupo las del nivel
// más cercano: un distractor de familia lejana o de otro nivel se descarta sin
// mirar la oración, y entonces el ítem mide menos de lo que parece.
// Herramienta de autoría — el motor lee las `opciones_causa` del ítem, no esto.
export function opcionesCausaSugeridas(codigo, nivel, cuantas) {
  const c = CAUSAS[codigo];
  if (!c) return [];
  const n = cuantas || 3;
  const propio = ORDEN_NIVEL[c.nivelMin] || 1;
  const rango = k => (CAUSAS[k].familia === c.familia ? 0 : CAUSAS[k].marca === c.marca ? 1 : 2);
  const resto = causasDeNivel(nivel || c.nivelMin)
    .filter(k => k !== codigo)
    .sort((a, b) => (rango(a) - rango(b))
      || (Math.abs((ORDEN_NIVEL[CAUSAS[a].nivelMin] || 1) - propio)
        - Math.abs((ORDEN_NIVEL[CAUSAS[b].nivelMin] || 1) - propio)));
  return [codigo, ...resto].slice(0, n);
}
