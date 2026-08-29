/* cascadas-morfologia.js — Las cascadas de rasgos morfológicos, por nivel
   Extraído de js/modules/maestro/index.js (hallazgo A8 de la auditoría
   técnica de ago-2026: datos lingüísticos incrustados en un módulo de
   interfaz).

   QUÉ ES UNA CASCADA. Cuando el alumno acierta la categoría de una palabra
   («Sustantivo»), la app le va preguntando sus rasgos uno a uno: clase →
   subtipo → género → número. Esa secuencia de preguntas, con las opciones
   de cada una, es la cascada de esa categoría. Aquí está escrita como dato
   puro; quien la pinta es `renderAttrSteps` en el módulo Maestro.

   Forma de cada paso:
     {id, label, opts:[{val, label}], dependsOn?:{step, val}, optional?}
       · id        — nombre del rasgo, tal cual viaja en `atrs` del banco.
       · label     — lo que lee el alumno.
       · opts      — respuestas posibles (`val` es el dato, `label` el texto).
       · dependsOn — el paso solo aparece si otro paso ya tiene ese valor
                     (p. ej. «contable/no contable» solo si es común).
       · optional  — no bloquea el confirmar ni penaliza si falta (F6a).

   LOS TRES NIVELES (docs/propuesta_niveles_morfologia.md):
     · aprendiz (N1) — sin cascada: solo se pide la categoría.
     · eso34   (N2) — MORPH_CASCADES_ESO34, subconjunto de rasgos esenciales.
     · maestro (N3) — receta PAU: MORPH_CASCADES_MAESTRO recorta o amplía
                      solo las categorías que lo necesitan; el resto cae al
                      fallback MORPH_CASCADES.
   `getCascadeForNivel(cat, nivel, atrs)` es la única puerta de entrada:
   resuelve el nivel, el dispatch por función del token y el fallback.

   POR QUÉ ESTE ARCHIVO ESTÁ SEPARADO. Tocar un rasgo (añadir una opción,
   corregir una etiqueta) no debería obligar a abrir un motor de 1.400
   líneas de renderizado, y un `git diff` de datos no debería mezclarse con
   uno de lógica. Además deja la puerta abierta a cargarlo en diferido:
   un alumno que no entra en Morfología no necesita descargarlo.

   OJO: los valores `val` tienen que coincidir EXACTAMENTE con los del banco
   de morfología de la Hoja (columna `atrs`). Un acento de más y el alumno
   falla un rasgo que ha acertado. */

// ── MORPHOLOGY CASCADE DEFINITIONS (PAU Murcia order) ───────────────
// Each category defines a sequence of steps.
// step: {id, label, opts: [{val, label}], dependsOn?: {step, val}}
export const MORPH_CASCADES = {
  'Sustantivo':{
    steps:[
      {id:'subtipo', label:'Clase', opts:[
        {val:'común', label:'Común'},{val:'propio', label:'Propio'}]},
      {id:'comun_sub', label:'Subtipo (común)', dependsOn:{step:'subtipo',val:'común'},
       opts:[{val:'contable',label:'Contable'},{val:'no contable',label:'No contable'}]},
      {id:'ind_col', label:'Individual / Colectivo', dependsOn:{step:'subtipo',val:'común'},
       opts:[{val:'individual',label:'Individual'},{val:'colectivo',label:'Colectivo'}]},
      {id:'conc_abs', label:'Concreto / Abstracto', dependsOn:{step:'subtipo',val:'común'},
       opts:[{val:'concreto',label:'Concreto'},{val:'abstracto',label:'Abstracto'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'ambiguo',label:'Ambiguo'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Adjetivo':{
    steps:[
      {id:'subtipo', label:'Clase', opts:[
        {val:'calificativo',label:'Calificativo'},{val:'relacional',label:'Relacional'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable (una terminación)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
      {id:'grado', label:'Grado', dependsOn:{step:'subtipo',val:'calificativo'},
       opts:[{val:'positivo',label:'Positivo'},{val:'comparativo superioridad',label:'Comparativo sup.'},
             {val:'comparativo inferioridad',label:'Comparativo inf.'},
             {val:'comparativo igualdad',label:'Comparativo igualidad'},
             {val:'superlativo absoluto',label:'Superlativo abs.'},
             {val:'superlativo relativo',label:'Superlativo rel.'}]},
    ]},
  'Artículo':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'determinado',label:'Determinado (el, la, los, las, lo)'},
        {val:'indeterminado',label:'Indeterminado (un, una, unos, unas)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro (lo)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
      {id:'forma', label:'Forma especial', opts:[
        {val:'ninguna',label:'Ninguna'},{val:'contracta',label:'Forma contracta (al / del)'}]},
    ]},
  'Pronombre personal':{
    steps:[
      {id:'persona', label:'Persona', opts:[
        {val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},
        {val:'tercera persona',label:'3ª persona'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
      {id:'género', label:'Género (si procede)', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro'},{val:'común',label:'Común (masc./fem.)'}]},
      {id:'acent', label:'Acentuación', opts:[
        {val:'tónico',label:'Tónico'},{val:'átono',label:'Átono'}]},
    ]},
  'Demostrativo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'determinante',label:'Determinante (ante sust.)'},
        {val:'adjetivo',label:'Adjetivo (pospuesto)'},
        {val:'pronombre',label:'Pronombre (sin sust.)'}]},
      {id:'cercanía', label:'Referencia espacial', opts:[
        {val:'cercanía al hablante',label:'Cercanía al hablante (este/a)'},
        {val:'distancia media',label:'Distancia media (ese/a)'},
        {val:'lejanía',label:'Lejanía (aquel/la)'},
        {val:'neutro',label:'Neutro (esto, eso, aquello)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro'},{val:'ambos',label:'Masc./Fem.'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Posesivo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'determinante',label:'Determinante (antepuesto)'},
        {val:'adjetivo',label:'Adjetivo (pospuesto)'}]},
      {id:'persona', label:'Persona del poseedor', opts:[
        {val:'primera persona',label:'1ª persona'},
        {val:'segunda persona',label:'2ª persona'},
        {val:'tercera persona',label:'3ª persona'}]},
      {id:'poseedores', label:'Nº de poseedores', opts:[
        {val:'un poseedor',label:'Un poseedor'},
        {val:'varios poseedores',label:'Varios poseedores'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Cuantificador':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'numeral',label:'Numeral (cantidad precisa)'},
        {val:'indefinido',label:'Indefinido (cantidad imprecisa)'}]},
      {id:'subtipo_num', label:'Clase de numeral', dependsOn:{step:'tipo',val:'numeral'},
       opts:[{val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},
             {val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
      {id:'subtipo_ind', label:'Clase de indefinido', dependsOn:{step:'tipo',val:'indefinido'},
       opts:[{val:'universal',label:'Universal (todo, cada, ambos, sendos)'},
             {val:'indefinido débil',label:'Indefinido débil (alguno, mucho, poco…)'}]},
      {id:'función_sint', label:'Función sintáctica', opts:[
        {val:'determinante',label:'Determinante (ante sust.)'},
        {val:'pronombre',label:'Pronombre (sin sust.)'},
        {val:'adjetivo',label:'Adjetivo (pospuesto)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    ]},
  'Relativo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'pronombre',label:'Pronombre (que, quien, el cual…)'},
        {val:'determinante',label:'Determinante (cuyo, cuanta…)'},
        {val:'adverbio',label:'Adverbio (donde, cuando, como, cuanto)'}]},
      {id:'género', label:'Género (si procede)', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable'}]},
      {id:'número', label:'Número (si procede)', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'invariable',label:'Invariable'}]},
    ]},
  'Interrogativo/Exclamativo':{
    steps:[
      {id:'subtipo', label:'Tipo', opts:[
        {val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
      {id:'función', label:'Función', opts:[
        {val:'pronombre',label:'Pronombre (qué, quién, cuál)'},
        {val:'determinante',label:'Determinante (qué, cuánto)'},
        {val:'adverbio',label:'Adverbio (cuándo, cómo, dónde)'}]},
      {id:'género', label:'Género (si procede)', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable'}]},
      {id:'número', label:'Número (si procede)', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'invariable',label:'Invariable'}]},
    ]},
  'Adverbio':{
    steps:[
      {id:'tipo', label:'Tipo semántico', opts:[
        {val:'lugar',label:'Lugar (aquí, ahí, allí, cerca…)'},
        {val:'tiempo',label:'Tiempo (hoy, ayer, siempre, nunca…)'},
        {val:'modo',label:'Modo (así, bien, mal, -mente)'},
        {val:'cantidad',label:'Cantidad (muy, bastante, poco, más…)'},
        {val:'aspecto',label:'Aspecto (ya, todavía, aún)'},
        {val:'afirmación',label:'Afirmación (sí, también, claro)'},
        {val:'negación',label:'Negación (no, tampoco)'},
        {val:'duda',label:'Duda (quizás, acaso, igual, posiblemente)'}]},
    ]},
  'Verbo':{
    steps:[
      {id:'perífrasis', label:'¿Forma parte de una perífrasis verbal?', opts:[
        {val:'no',label:'No, es un verbo simple o un tiempo compuesto'},
        {val:'sí',label:'Sí, es una perífrasis verbal (auxiliar + forma no personal)'}]},
      {id:'perif_tipo', label:'¿Qué forma tiene el verbo principal (núcleo)?', dependsOn:{step:'perífrasis',val:'sí'}, opts:[
        {val:'infinitivo',label:'Infinitivo (ej: ir a JUGAR, deber ESTUDIAR, tener que LEER)'},
        {val:'gerundio',label:'Gerundio (ej: estar JUGANDO, seguir CORRIENDO)'},
        {val:'participio',label:'Participio (ej: llevar VISTAS, tener COMPRADOS)'}]},
      {id:'perif_ger_info', label:'Perífrasis de gerundio → tempoaspectual', dependsOn:{step:'perif_tipo',val:'gerundio'}, opts:[
        {val:'sí — aspectual de gerundio',label:'Acción en proceso (estar/ir/seguir/andar/llevar/venir/continuar + gerundio)'}]},
      {id:'perif_par_info', label:'Perífrasis de participio → tempoaspectual', dependsOn:{step:'perif_tipo',val:'participio'}, opts:[
        {val:'sí — aspectual de participio',label:'Acción finalizada (llevar/tener + participio con concordancia)'}]},
      {id:'perif_inf_clase', label:'La perífrasis de infinitivo es…', dependsOn:{step:'perif_tipo',val:'infinitivo'}, opts:[
        {val:'modal',label:'Modal (expresa obligación, posibilidad o capacidad)'},
        {val:'tempoaspectual',label:'Tempoaspectual (informa sobre el desarrollo de la acción)'}]},
      {id:'perif_modal', label:'¿Qué tipo de perífrasis modal?', dependsOn:{step:'perif_inf_clase',val:'modal'}, opts:[
        {val:'sí — modal de obligación',label:'De obligación (haber de / haber que / deber / tener que + inf.)'},
        {val:'sí — modal de probabilidad',label:'De probabilidad o conjetura (deber de / venir a / poder + inf.)'},
        {val:'sí — modal de capacidad',label:'De capacidad (poder + inf.)'}]},
      {id:'perif_tempo', label:'¿Qué tipo de perífrasis tempoaspectual?', dependsOn:{step:'perif_inf_clase',val:'tempoaspectual'}, opts:[
        {val:'sí — tempoaspectual incoativa',label:'Comienzo de acción (ir a / empezar a / ponerse a / romper a / echarse a + inf.)'},
        {val:'sí — tempoaspectual terminativa',label:'Final de acción (dejar de / cesar de / acabar de / terminar de + inf.)'},
        {val:'sí — tempoaspectual reiterativa',label:'Repetición (soler / acostumbrar a / volver a + inf.)'}]},
      {id:'conjugación', label:'Conjugación', opts:[
        {val:'primera',label:'1ª conjugación (-ar)'},
        {val:'segunda',label:'2ª conjugación (-er)'},
        {val:'tercera',label:'3ª conjugación (-ir)'}]},
      {id:'persona', label:'Persona', opts:[
        {val:'primera persona',label:'1ª persona'},
        {val:'segunda persona',label:'2ª persona'},
        {val:'tercera persona',label:'3ª persona'},
        {val:'no personal',label:'Forma no personal (inf./ger./part.)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'no procede',label:'No procede (no personal)'}]},
      {id:'tiempo', label:'Tiempo', opts:[
        {val:'presente',label:'Presente'},
        {val:'pretérito imperfecto',label:'Pret. imperfecto'},
        {val:'pretérito perfecto simple',label:'Pret. perfecto simple'},
        {val:'pretérito perfecto compuesto',label:'Pret. perfecto compuesto'},
        {val:'pretérito pluscuamperfecto',label:'Pret. pluscuamperfecto'},
        {val:'futuro simple',label:'Futuro simple'},
        {val:'futuro compuesto',label:'Futuro compuesto'},
        {val:'condicional simple',label:'Condicional simple'},
        {val:'condicional compuesto',label:'Condicional compuesto'},
        {val:'infinitivo',label:'Infinitivo (no personal)'},
        {val:'gerundio',label:'Gerundio (no personal)'},
        {val:'participio',label:'Participio (no personal)'}]},
      {id:'modo', label:'Modo', opts:[
        {val:'indicativo',label:'Indicativo'},{val:'subjuntivo',label:'Subjuntivo'},
        {val:'imperativo',label:'Imperativo'},{val:'no personal',label:'No personal'}]},
      {id:'aspecto', label:'Aspecto', opts:[
        {val:'perfectivo',label:'Perfectivo (acción completa)'},
        {val:'imperfectivo',label:'Imperfectivo (acción incompleta)'},
        {val:'—',label:'No procede (forma no personal)'}]},
      {id:'voz', label:'Voz', opts:[
        // F5 (jul-2026): antes solo ofrecía "Activa" (no discriminaba nada).
        // La pasiva perifrástica ser+participio se analiza como VOZ PASIVA
        // del verbo, no como clase de perífrasis — coherencia con C.Ag. de
        // Sintaxis. Ver docs/propuesta_niveles_morfologia.md §3 (➑).
        {val:'activa',label:'Activa'},
        {val:'pasiva',label:'Pasiva (ser + participio)'}]},
    ]},
  'Preposición':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'simple',label:'Preposición simple (a, de, en, por…)'},
        {val:'locución prepositiva',label:'Locución prepositiva (a causa de, junto a…)'}]},
    ]},
  'Conjunción':{
    steps:[
      {id:'tipo', label:'Tipo', opts:[
        {val:'coordinante',label:'Coordinante'},{val:'subordinante',label:'Subordinante'}]},
      {id:'subtipo_coord', label:'Clase (coordinante)', dependsOn:{step:'tipo',val:'coordinante'},
       opts:[{val:'copulativa',label:'Copulativa (y, e, ni)'},
             {val:'disyuntiva',label:'Disyuntiva (o, u, o bien)'},
             {val:'adversativa',label:'Adversativa (pero, sino, mas)'},
             {val:'distributiva',label:'Distributiva (bien…bien, ora…ora)'}]},
      {id:'subtipo_sub', label:'Clase (subordinante)', dependsOn:{step:'tipo',val:'subordinante'},
       opts:[{val:'completiva',label:'Completiva (que, si)'},
             {val:'causal',label:'Causal (porque, ya que, puesto que…)'},
             {val:'concesiva',label:'Concesiva (aunque, si bien, por más que…)'},
             {val:'condicional',label:'Condicional (si, como, mientras…)'},
             {val:'final',label:'Final (para que, a fin de que…)'},
             {val:'temporal',label:'Temporal (cuando, mientras que, en cuanto…)'},
             {val:'ilativa',label:'Ilativa (conque, así que, luego…)'},
             {val:'consecutiva',label:'Consecutiva (tan…que, tanto…que)'},
             {val:'comparativa',label:'Comparativa (más…que, tan…como)'}]},
    ]},
  'Conector discursivo':{
    steps:[
      {id:'tipo', label:'Tipo de conector', opts:[
        {val:'aditivo',label:'Aditivo (además, asimismo, encima, es más…)'},
        {val:'contraste',label:'De contraste (sin embargo, no obstante, en cambio, ahora bien…)'},
        {val:'consecutivo',label:'Consecutivo (por tanto, en consecuencia, así pues, entonces…)'},
        {val:'organizador',label:'Organizador (en primer lugar, por otro lado, finalmente…)'},
        {val:'reformulador',label:'Reformulador (es decir, o sea, por ejemplo, en particular…)'},
        {val:'conclusión',label:'De conclusión (en conclusión, en resumen, en definitiva…)'}]},
    ]},
  'Interrogativo/Exclamativo':{
    steps:[
      {id:'función', label:'Función', opts:[
        {val:'determinante',label:'Determinante (acompaña a sustantivo: ¿Qué libro?, ¡Cuántas flores!)'},
        {val:'pronombre',label:'Pronombre (sustituye al nombre: ¿Qué dices?, ¡Quién lo diría!)'}]},
      {id:'tipo', label:'Tipo', opts:[
        {val:'interrogativo',label:'Interrogativo (pregunta: ¿qué?, ¿cuál?, ¿quién?, ¿cuánto?)'},
        {val:'exclamativo',label:'Exclamativo (exclamación: ¡qué!, ¡cuánto!, ¡quién!)'}]},
      {id:'género', label:'Género', opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},
        {val:'invariable',label:'Invariable (qué, quién)'}]},
      {id:'número', label:'Número', opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},
        {val:'invariable',label:'Invariable (qué)'}]},
    ]},
  'Interjección':{
    steps:[
      {id:'tipo', label:'Morfológico', opts:[
        {val:'propia',label:'Propia (oh, ay, olé, puaf, hola…)'},
        {val:'impropia',label:'Impropia (sustantivo, verbo o adj. como interjección)'}]},
      {id:'función', label:'Función', opts:[
        {val:'apelativa',label:'Apelativa / Directiva (¡Silencio! ¡Venga!)'},
        {val:'expresiva',label:'Expresiva / Sintomática (¡Ay! ¡Caramba!)'}]},
    ]},
  'Marca.Imp.':{
    steps:[
      {id:'tipo', label:'Tipo de marca', opts:[
        {val:'marca de impersonalidad',label:'Marca de impersonalidad — el "se" bloquea la aparición del sujeto gramatical'}]},
    ]},
  'Marca.Pas.Ref.':{
    steps:[
      {id:'tipo', label:'Tipo de marca', opts:[
        {val:'marca de pasiva refleja',label:'Marca de pasiva refleja — el "se" introduce el sujeto paciente'}]},
    ]},
};

// ── ESO 3.º–4.º Cascades — atributos esenciales (subset de Maestro) ──
// F5 (jul-2026): correcciones y adiciones del §3 de
// docs/propuesta_niveles_morfologia.md. Se reutilizan los steps de
// MORPH_CASCADES (maestro) donde coinciden en contenido, para no duplicar
// listas de opciones que puedan desincronizarse.
export const MORPH_CASCADES_ESO34 = {
  'Sustantivo':MORPH_CASCADES['Sustantivo'], // todos los atributos
  // ➊ clase (calificativo/relacional) + grado dependiente de clase — idéntico a maestro
  'Adjetivo':MORPH_CASCADES['Adjetivo'],
  // ➋ neutro (lo) + forma contracta (al/del); sin el paso "tipo" (determinado/indeterminado), que N2 no pregunta
  'Artículo':{steps:MORPH_CASCADES['Artículo'].steps.filter(s=>s.id!=='tipo')},
  // ➌ cercanía (este/ese/aquel) — idéntico a maestro
  'Demostrativo':MORPH_CASCADES['Demostrativo'],
  // ➍ un/varios poseedores; sin género (N2 no lo pregunta en posesivos)
  'Posesivo':{steps:MORPH_CASCADES['Posesivo'].steps.filter(s=>s.id!=='género')},
  'Cuantificador':{steps:[
    {id:'función_sint',label:'Función sintáctica',opts:[{val:'determinante',label:'Determinante'},{val:'pronombre',label:'Pronombre'},{val:'adjetivo',label:'Adjetivo'}]},
    {id:'tipo',label:'Tipo',opts:[{val:'numeral',label:'Numeral'},{val:'indefinido',label:'Indefinido'}]},
    {id:'subtipo_num',label:'Clase de numeral',dependsOn:{step:'tipo',val:'numeral'},opts:[{val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},{val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
    {id:'subtipo_ind',label:'Clase de indefinido',dependsOn:{step:'tipo',val:'indefinido'},opts:[{val:'universal',label:'Universal (todo, cada)'},{val:'indefinido débil',label:'Indefinido débil (mucho, poco, bastante)'},{val:'existencial',label:'Existencial (algún, ningún)'}]},
  ]},
  // ➎ Relativo (hoy sin cascada): solo función — se enseña en 4.º ESO y prepara Compuestas
  'Relativo':{steps:MORPH_CASCADES['Relativo'].steps.filter(s=>s.id==='función')},
  // ➏ Interr./Exclamativo (hoy sin cascada): tipo → función, sin género/número (eso ya es N3)
  'Interrogativo/Exclamativo':{steps:[
    {id:'tipo',label:'Tipo',opts:[{val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
    {id:'función',label:'Función',opts:[{val:'pronombre',label:'Pronombre (qué, quién, cuál)'},{val:'determinante',label:'Determinante (qué, cuánto)'},{val:'adverbio',label:'Adverbio (cuándo, cómo, dónde)'}]},
  ]},
  'Verbo':{steps:[
    {id:'conjugación',label:'Conjugación',opts:[{val:'primera',label:'1ª (-ar)'},{val:'segunda',label:'2ª (-er)'},{val:'tercera',label:'3ª (-ir)'}]},
    {id:'persona',label:'Persona',opts:[{val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'},{val:'no personal',label:'Forma no personal'}]},
    {id:'número',label:'Número',opts:[{val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'no procede',label:'No procede'}]},
    {id:'tiempo',label:'Tiempo',opts:[{val:'presente',label:'Presente'},{val:'pretérito imperfecto',label:'Pret. imperfecto'},{val:'pretérito perfecto simple',label:'Pret. perfecto simple'},{val:'pretérito perfecto compuesto',label:'Pret. perfecto compuesto'},{val:'pretérito pluscuamperfecto',label:'Pret. pluscuamperfecto'},{val:'futuro simple',label:'Futuro simple'},{val:'futuro compuesto',label:'Futuro compuesto'},{val:'condicional simple',label:'Condicional simple'},{val:'condicional compuesto',label:'Condicional compuesto'},{val:'infinitivo',label:'Infinitivo'},{val:'gerundio',label:'Gerundio'},{val:'participio',label:'Participio'}]},
    {id:'modo',label:'Modo',opts:[{val:'indicativo',label:'Indicativo'},{val:'subjuntivo',label:'Subjuntivo'},{val:'imperativo',label:'Imperativo'},{val:'no personal',label:'No personal'}]},
    ...MORPH_CASCADES['Verbo'].steps.filter(s=>s.id==='perífrasis'||s.id?.startsWith('perif_')),
    // ➐➑ aspecto (4.º ESO) + voz activa/pasiva (antes solo "activa") — mismos steps que maestro
    ...MORPH_CASCADES['Verbo'].steps.filter(s=>s.id==='aspecto'||s.id==='voz'),
  ]},
  'Adverbio':{steps:[
    {id:'tipo',label:'Tipo',opts:[{val:'lugar',label:'Lugar'},{val:'tiempo',label:'Tiempo'},{val:'modo',label:'Modo'},{val:'cantidad',label:'Cantidad'},{val:'negación',label:'Negación'},{val:'afirmación',label:'Afirmación'},{val:'duda',label:'Duda'}]},
  ]},
  'Pronombre personal':{steps:[
    {id:'persona',label:'Persona',opts:[{val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'}]},
    {id:'número',label:'Número',opts:[{val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    {id:'acent',label:'Acento',opts:[{val:'tónico',label:'Tónico (yo, tú, él…)'},{val:'átono',label:'Átono (me, te, se, lo…)'}]},
  ]},
  'Conjunción':{steps:[
    {id:'tipo',label:'Tipo',opts:[{val:'coordinante',label:'Coordinante'},{val:'subordinante',label:'Subordinante'}]},
    ...MORPH_CASCADES['Conjunción'].steps.filter(s=>s.dependsOn),
  ]},
};

// ── PAU (N3/maestro) overrides — F6a+F6b (jul-2026) ─────────────────────
// Solo las categorías que la receta PAU recorta o amplía respecto al nivel
// maestro compartido (MORPH_CASCADES); el resto de categorías caen al
// fallback MORPH_CASCADES[cat] vía getCascadeForNivel. Ver
// docs/propuesta_niveles_morfologia.md §4. Los determinantes con función
// pospuesta/pronominal se resuelven aparte, en MAESTRO_DISPATCH_CATS más
// abajo (necesitan conocer atrs.función del token, no solo cat+nivel).

// F6b: formación de palabras — atributo NUEVO y opcional (decisión 6 de
// Josele, §7): "simple/derivada/compuesta/parasintética", etiquetado
// progresivo desde las palabras jugosas de cada texto n3. step.optional
// (mecanismo de F6a) hace que nunca bloquee el confirmar ni penalice si no
// hay dato en el banco todavía.
export const FORMACION_STEP = {id:'formación', label:'Formación (opcional)', optional:true, opts:[
  {val:'simple',label:'Simple (una sola raíz, sin afijos: casa, azul)'},
  {val:'derivada',label:'Derivada (raíz + afijo: casita, inmoral)'},
  {val:'compuesta',label:'Compuesta (dos o más raíces: sacacorchos)'},
  {val:'parasintética',label:'Parasintética (prefijo + sufijo a la vez, sin base intermedia: entristecer)'}]};

export const MORPH_CASCADES_MAESTRO = {
  // Sustantivo propio: "hay que indicar EXCLUSIVAMENTE la categoría
  // gramatical y el tipo" — género/número solo se preguntan si es común,
  // y sin subclases semánticas (contable/colectivo/abstracto: eso es N2).
  // Formación solo tiene sentido si es común (los propios no se derivan/componen igual).
  'Sustantivo':{steps:[
    {id:'subtipo', label:'Clase', opts:[
      {val:'común',label:'Común'},{val:'propio',label:'Propio'}]},
    {id:'género', label:'Género', dependsOn:{step:'subtipo',val:'común'}, opts:[
      {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'ambiguo',label:'Ambiguo'}]},
    {id:'número', label:'Número', dependsOn:{step:'subtipo',val:'común'}, opts:[
      {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]},
    {...FORMACION_STEP, dependsOn:{step:'subtipo',val:'común'}},
  ]},
  // + terminación (una/dos/invariable) — dato nuevo, se aplica a calificativos y relacionales por igual.
  'Adjetivo':{steps:[
    ...MORPH_CASCADES['Adjetivo'].steps,
    {id:'terminación', label:'Terminación', opts:[
      {val:'una terminación',label:'Una terminación (cambia en plural: feliz/felices)'},
      {val:'dos terminaciones',label:'Dos terminaciones (masc./fem.: alto/alta)'},
      {val:'invariable',label:'Invariable (no cambia en plural: gratis)'}]},
    FORMACION_STEP,
  ]},
  // Aspecto pasa a opcional ("si dudas, no lo pongas, no penalizará" — el
  // doc PAU) + simple/compuesto para formas no personales (dato nuevo,
  // dependsOn persona='no personal' para no repetir la pregunta de tiempo).
  'Verbo':{steps:[
    ...MORPH_CASCADES['Verbo'].steps.map(s => s.id==='aspecto'
      ? {...s, label:'Aspecto (opcional en PAU — si dudas, no lo marques)', optional:true}
      : s),
    {id:'np_forma', label:'Simple / compuesto (forma no personal)', dependsOn:{step:'persona',val:'no personal'}, opts:[
      {val:'simple',label:'Simple (lograr, estudiando, vistas)'},
      {val:'compuesto',label:'Compuesto (haber logrado, habiendo llegado, habiendo sido visto)'}]},
    FORMACION_STEP,
  ]},
  // Artículo es SIEMPRE determinante (no tiene atrs.función alternativo) —
  // se le añade directamente aquí la taxonomía definido/cuantificador sin
  // necesitar el dispatcher por atrs de más abajo.
  'Artículo':{steps:[
    {id:'tipo_det', label:'Tipo de determinante', opts:[
      {val:'definido',label:'Definido'},{val:'cuantificador',label:'Cuantificador'}]},
    ...MORPH_CASCADES['Artículo'].steps,
  ]},
};

// F6b (jul-2026): taxonomía PAU de determinantes (definido/cuantificador),
// pospuestos tratados como Adjetivo (decisión 2 de Josele, §7 de la
// propuesta) y "demás pronombres" con receta unificada. A diferencia del
// resto de overrides de arriba, esto exige conocer atrs.función del TOKEN
// real, no solo cat+nivel — de ahí que getCascadeForNivel reciba un tercer
// parámetro `atrs` opcional. tipo_det no es un atributo real del banco: se
// deriva de la categoría (ver TIPO_DET_POR_CATEGORIA / getEffectiveCorrectAtrs_).
export const MAESTRO_DISPATCH_CATS = ['Demostrativo','Posesivo','Cuantificador','Interrogativo/Exclamativo','Relativo'];

export const TIPO_DET_POR_CATEGORIA = {
  'Artículo':'definido', 'Demostrativo':'definido', 'Posesivo':'definido',
  'Cuantificador':'cuantificador', 'Interrogativo/Exclamativo':'cuantificador',
  'Relativo':'definido', // "cuyo" = posesivo relativo, dentro de los DEFINIDOS (nota del doc PAU)
};

// El token real es la fuente de verdad para saber si es determinante,
// aunque el alumno todavía no haya contestado nada.
// Cuantificador guarda su función sintáctica en 'función_sint', no en
// 'función' como el resto (Demostrativo/Posesivo/Interr.Excl./Relativo) —
// bug real de nombre de campo detectado 2026-07-12 al implementar F6b.
export function getFuncionToken_(cat, atrs){
  if(!atrs) return '';
  return (cat === 'Cuantificador' ? atrs['función_sint'] : atrs['función']) || '';
}

export function getEffectiveCorrectAtrs_(token){
  const atrs = (token && token.atrs) || {};
  const funcion = getFuncionToken_(token && token.cat, atrs);
  const esDeterminante = token && (token.cat === 'Artículo' || funcion === 'determinante');
  if(esDeterminante && TIPO_DET_POR_CATEGORIA[token.cat]){
    return {...atrs, tipo_det: TIPO_DET_POR_CATEGORIA[token.cat]};
  }
  return atrs;
}

export const TIPO_DET_STEP_ = {id:'tipo_det', label:'Tipo de determinante', opts:[
  {val:'definido',label:'Definido'},{val:'cuantificador',label:'Cuantificador'}]};

export function buildMaestroDispatchCascade_(cat, atrs){
  const funcion = getFuncionToken_(cat, atrs);

  if(funcion === 'determinante'){
    if(cat==='Demostrativo') return {steps:[TIPO_DET_STEP_,
      {id:'cercanía',label:'Referencia espacial',opts:[
        {val:'cercanía al hablante',label:'Cercanía al hablante (este/a)'},
        {val:'distancia media',label:'Distancia media (ese/a)'},
        {val:'lejanía',label:'Lejanía (aquel/la)'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Posesivo') return {steps:[TIPO_DET_STEP_,
      {id:'persona',label:'Persona del poseedor',opts:[
        {val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'}]},
      {id:'poseedores',label:'Nº de poseedores',opts:[
        {val:'un poseedor',label:'Un poseedor'},{val:'varios poseedores',label:'Varios poseedores'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Cuantificador') return {steps:[TIPO_DET_STEP_,
      {id:'tipo',label:'Tipo',opts:[
        {val:'numeral',label:'Numeral (cantidad precisa)'},{val:'indefinido',label:'Indefinido (cantidad imprecisa)'}]},
      {id:'subtipo_num',label:'Clase de numeral',dependsOn:{step:'tipo',val:'numeral'},opts:[
        {val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},{val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
      {id:'subtipo_ind',label:'Clase de indefinido',dependsOn:{step:'tipo',val:'indefinido'},opts:[
        {val:'universal',label:'Universal (todo, cada, ambos, sendos)'},{val:'indefinido débil',label:'Indefinido débil (alguno, mucho, poco…)'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Interrogativo/Exclamativo') return {steps:[TIPO_DET_STEP_,
      {id:'tipo',label:'Tipo',opts:[
        {val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'invariable',label:'Invariable'}]}]};
    if(cat==='Relativo') return {steps:[TIPO_DET_STEP_,
      // "cuyo" — un solo caso real, sin tipo específico propio que preguntar
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
  }

  if(funcion === 'adjetivo'){
    // Pospuesto: "el doc los analiza como adjetivos con receta propia"
    // (decisión 2 de Josele, §7): demostrativo/posesivo pospuestos = Adjetivo.
    if(cat==='Demostrativo') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Posesivo') return {steps:[
      {id:'persona',label:'Persona del poseedor',opts:[
        {val:'primera persona',label:'1ª persona'},{val:'segunda persona',label:'2ª persona'},{val:'tercera persona',label:'3ª persona'}]},
      {id:'poseedores',label:'Nº de poseedores',opts:[
        {val:'un poseedor',label:'Un poseedor'},{val:'varios poseedores',label:'Varios poseedores'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Cuantificador') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
  }

  if(funcion === 'pronombre'){
    // "Demás pronombres": tipo (si cuantificador, subtipo) → género →
    // número — CUATRO aspectos en el cuantificador (el caso más completo
    // del doc PAU); los demás se quedan en género+número (o tipo+género+
    // número en interr./excl., que sí distingue interrogativo/exclamativo).
    if(cat==='Cuantificador') return {steps:[
      {id:'tipo',label:'Tipo',opts:[
        {val:'numeral',label:'Numeral (cantidad precisa)'},{val:'indefinido',label:'Indefinido (cantidad imprecisa)'}]},
      {id:'subtipo_num',label:'Clase de numeral',dependsOn:{step:'tipo',val:'numeral'},opts:[
        {val:'cardinal',label:'Cardinal'},{val:'ordinal',label:'Ordinal'},{val:'fraccionario',label:'Fraccionario'},{val:'multiplicativo',label:'Multiplicativo'}]},
      {id:'subtipo_ind',label:'Clase de indefinido',dependsOn:{step:'tipo',val:'indefinido'},opts:[
        {val:'universal',label:'Universal (todo, cada, ambos, sendos)'},{val:'indefinido débil',label:'Indefinido débil (alguno, mucho, poco…)'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Demostrativo') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'neutro',label:'Neutro (esto, eso, aquello)'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'}]}]};
    if(cat==='Relativo') return {steps:[
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'invariable',label:'Invariable (que)'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'invariable',label:'Invariable (que)'}]}]};
    if(cat==='Interrogativo/Exclamativo') return {steps:[
      {id:'tipo',label:'Tipo',opts:[
        {val:'interrogativo',label:'Interrogativo'},{val:'exclamativo',label:'Exclamativo'}]},
      {id:'género',label:'Género',opts:[
        {val:'masculino',label:'Masculino'},{val:'femenino',label:'Femenino'},{val:'invariable',label:'Invariable'}]},
      {id:'número',label:'Número',opts:[
        {val:'singular',label:'Singular'},{val:'plural',label:'Plural'},{val:'invariable',label:'Invariable'}]}]};
  }

  return null; // p.ej. Relativo con función='adverbio' — cae al cascade normal (MORPH_CASCADES)
}

/** Helper: returns the correct cascade for the active level */
export function getCascadeForNivel(cat, nivel, atrs){
  if(nivel === 'aprendiz') return {steps:[]};
  if(nivel === 'eso34') return MORPH_CASCADES_ESO34[cat] || {steps:[]};
  if(nivel === 'maestro'){
    if(MAESTRO_DISPATCH_CATS.includes(cat)){
      const dispatched = buildMaestroDispatchCascade_(cat, atrs);
      if(dispatched) return dispatched;
    }
    return MORPH_CASCADES_MAESTRO[cat] || MORPH_CASCADES[cat] || {steps:[]};
  }
  return MORPH_CASCADES[cat] || {steps:[]};
}
