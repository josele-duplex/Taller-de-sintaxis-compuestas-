/* data.js — Datos del glosario (terminos gramaticales)
   Extraido de index.html (Paso 8 de la migracion, mayo 2026)
   Lineas originales: 1265-1313. */

export const GLOS_DATA = [
  { cat:'sint', section:'Funciones sintácticas', items: [
    {abbr:'CD',       full:'Complemento Directo',       expl:'Sintagma nominal que recibe la acción del verbo. Se sustituye por «lo, la, los, las».', ex:'Veo el gato.'},
    {abbr:'CI',       full:'Complemento Indirecto',     expl:'Sintagma preposicional con «a» que indica el destinatario. Pregunta: ¿a quién?', ex:'Doy el libro a María.'},
    {abbr:'C.Rég.',   full:'Complemento de Régimen',    expl:'Sintagma preposicional cuya preposición es obligatoria; sin ella, la oración resulta agramatical.', ex:'Me acuerdo de ti (no «me acuerdo ti»).'},
    {abbr:'Atr.',     full:'Atributo',                  expl:'Sintagma adjetival, nominal o preposicional que califica al sujeto a través de un verbo copulativo (ser, estar, parecer).', ex:'Juan es ingeniero.'},
    {abbr:'CPvo',     full:'Complemento Predicativo',   expl:'Sintagma adjetival que modifica simultáneamente al sujeto (o al CD) y al verbo. Aparece con verbos no copulativos.', ex:'Entró cansado.'},
    {abbr:'C.Ag.',    full:'Complemento Agente',        expl:'Sintagma preposicional con «por» (a veces «de») que aparece en oraciones pasivas. Indica quién realiza la acción.', ex:'El cuadro fue pintado por Picasso.'},
    {abbr:'CC',       full:'Complemento Circunstancial',expl:'Añade circunstancias a la acción (cuándo, dónde, cómo, etc.). No es un argumento obligatorio.', ex:'Corrí en el parque ayer.'}
  ]},
  { cat:'cc', section:'Tipos de complemento circunstancial', items: [
    {abbr:'CC Tiempo',     full:'CC de Tiempo',     expl:'Indica cuándo se realiza la acción.', ex:'Corrí ayer.'},
    {abbr:'CC Lugar',      full:'CC de Lugar',      expl:'Indica dónde se realiza la acción.', ex:'Corro en el parque.'},
    {abbr:'CC Modo',       full:'CC de Modo',       expl:'Indica cómo se realiza la acción.', ex:'Habla claramente.'},
    {abbr:'CC Causa',      full:'CC de Causa',      expl:'Indica el motivo por el que se produce la acción. Pregunta: ¿por qué?', ex:'Llueve por la presión atmosférica.'},
    {abbr:'CC Finalidad',  full:'CC de Finalidad',  expl:'Indica el propósito o el objetivo de la acción. Pregunta: ¿para qué?', ex:'Estudio para aprender.'},
    {abbr:'CC Instrumento',full:'CC de Instrumento',expl:'Indica con qué medio o herramienta se realiza la acción.', ex:'Corto con tijeras.'},
    {abbr:'CC Compañía',   full:'CC de Compañía',   expl:'Indica con quién se realiza la acción.', ex:'Juego con mi hermano.'},
    {abbr:'CC Cantidad',   full:'CC de Cantidad',   expl:'Indica el grado o la intensidad con que se realiza la acción.', ex:'Comí mucho.'}
  ]},
  { cat:'marc', section:'Marcas especiales', items: [
    {abbr:'Marca.Pas.Ref.', full:'Marca de Pasiva Refleja', expl:'El «se» que aparece en construcciones de pasiva refleja, donde el sujeto paciente concuerda con el verbo.', ex:'Se vendieron los pisos.'},
    {abbr:'Marca.Imp.',     full:'Marca de Impersonalidad', expl:'El «se» de las oraciones impersonales, que no admiten sujeto gramatical.', ex:'Se vive bien aquí.'},
    {abbr:'Vocat.',         full:'Vocativo',                expl:'Sintagma nominal que sirve para llamar o apelar. Se separa del resto de la oración por comas y no cumple función sintáctica.', ex:'Juan, ¿vienes?'},
    {abbr:'Mod.Or.',        full:'Modificador Oracional',   expl:'Adverbio o sintagma adverbial que modifica al conjunto de la oración, no a un elemento concreto.', ex:'Obviamente, se equivocó.'}
  ]},
  { cat:'sntg', section:'Tipos de sintagma', items: [
    {abbr:'SN',   full:'Sintagma Nominal',       expl:'Tiene como núcleo un sustantivo. Estructura: [Modificadores] + Núcleo + [Complementos].', ex:'las casas antiguas.'},
    {abbr:'SP',   full:'Sintagma Preposicional', expl:'Comienza con una preposición que actúa como núcleo. Estructura: N (preposición) + Término.', ex:'de mi hermana.'},
    {abbr:'SAdj', full:'Sintagma Adjetival',     expl:'Tiene como núcleo un adjetivo. Puede llevar modificadores y complementos.', ex:'muy guapo de cara.'},
    {abbr:'SAdv', full:'Sintagma Adverbial',     expl:'Tiene como núcleo un adverbio. Admite modificadores intensificadores y complementos.', ex:'muy cerca de casa.'},
    {abbr:'SV',   full:'Sintagma Verbal',        expl:'Tiene como núcleo un verbo. Incluye los argumentos (CD, CI…) y los adjuntos (CC) del predicado.', ex:'comió manzanas en el parque.'}
  ]},
  { cat:'int', section:'Funciones internas del sintagma', items: [
    {abbr:'N',          full:'Núcleo',                            expl:'Elemento principal del sintagma. En un SP, el núcleo es la preposición.', ex:'En «las casas»: «casas». En «de mi hermana»: «de».'},
    {abbr:'Mod/Det.',   full:'Modificador determinante',          expl:'Artículos, demostrativos, posesivos. Acompañan al sustantivo y concretan su referencia.', ex:'«las» en «las casas»; «este» en «este libro»; «mi» en «mi amiga».'},
    {abbr:'Mod/Cuant.', full:'Modificador cuantificador',         expl:'Numerales, indefinidos, intensificadores. Acompañan al sustantivo, adjetivo o adverbio expresando cantidad o grado.', ex:'«dos» en «dos libros»; «muy» en «muy bien».'},
    {abbr:'Nexo',       full:'Nexo coordinante',                  expl:'Enlaza elementos del mismo nivel sintáctico (y, o, pero, ni…).', ex:'«y» en «libros y cuadernos»; «pero» en «guapo pero tonto».'},
    {abbr:'Aposición',  full:'Aposición',                         expl:'Un sustantivo o sintagma nominal modifica directamente a otro sustantivo vecino, sin nexos. Es una función a nivel de sintagma, dentro de un SN.', ex:'Mi amigo «el tendero» cerró la tienda; Madrid, «capital de España», está en el centro.'}
  ]},
  { cat:'sub', section:'Subelementos del sintagma', items: [
    {abbr:'SN/T',     full:'SN como Término',                expl:'Sintagma nominal que actúa como término dentro de un SP.', ex:'En «de mi hermana»: «mi hermana» es SN/T.'},
    {abbr:'SP/CN',    full:'SP como Complemento del Nombre', expl:'Sintagma preposicional que complementa al núcleo nominal de un SN superior.', ex:'En «las autorizaciones para la excursión»: «para la excursión» es SP/CN.'},
    {abbr:'SAdj/CN',  full:'SAdj como Complemento del Nombre',expl:'Sintagma adjetival que modifica al núcleo nominal del SN.', ex:'En «el libro antiguo»: «antiguo» es SAdj/CN.'},
    {abbr:'SAdv/T',   full:'SAdv como Término',              expl:'Sintagma adverbial que actúa como término dentro de un SP.', ex:'En «de muy lejos»: «muy lejos» es SAdv/T.'},
    {abbr:'CAdj',     full:'Complemento del Adjetivo',       expl:'Complemento que aparece dentro de un SAdj para modificar al adjetivo núcleo.', ex:'En «orgulloso de su éxito»: «de su éxito» es CAdj.'},
    {abbr:'CAdv',     full:'Complemento del Adverbio',       expl:'Complemento que aparece dentro de un SAdv para modificar al adverbio núcleo.', ex:'En «lejos de casa»: «de casa» es CAdv.'}
  ]}
];
