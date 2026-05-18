/* diccionario-sintagmas.js — DICCIONARIO_BASE_SINTAGMAS
   Extraido de index.html (Paso 4 de la migracion, mayo 2026)
   Lineas originales: 1464-1472. */

export const DICCIONARIO_BASE_SINTAGMAS = {
  "SPrep/CN":{fijo:"¿Este grupo de palabras está modificando a la acción principal, o está 'pegado' a un sustantivo para darnos información exclusiva sobre él?",pista:"Si forma un bloque inseparable con un sustantivo, va dentro de su sintagma nominal. Si mueves el sustantivo, este complemento viaja con él."},
  "SAdj/CN":{fijo:"¿Este grupo de palabras está modificando a la acción principal, o está 'pegado' a un sustantivo para darnos información exclusiva sobre él?",pista:"Si forma un bloque inseparable con un sustantivo, va dentro de su sintagma nominal."},
  "CAdj":{fijo:"¿Esta información aclara cómo ocurre la acción, o solo sirve para completar el significado de la cualidad (adjetivo) que mencionamos antes?",pista:"Mira qué palabra tiene a su izquierda. Si ese bloque solo tiene sentido porque existe un adjetivo al que 'ayuda', vive dentro de su grupo."},
  "CAdv":{fijo:"¿Este dato nos da una circunstancia nueva de la acción, o solo está precisando a otro indicador de tiempo, lugar o modo que ya apareció?",pista:"Si mueves el adverbio principal a otra parte de la frase, ¿este complemento tiene que irse con él? Si es así, es su complemento."},
  "Mod/Det.":{fijo:"¿Esta palabra está 'modificando' a toda la frase, o su fuerza se agota simplemente presentando al núcleo del grupo?",pista:"Acompaña al núcleo para delimitarlo. Es un artículo, demostrativo o posesivo que no puede ir solo."},
  "Mod/Cuant.":{fijo:"¿Esta palabra añade una cualidad nueva, o funciona como un 'termómetro' para medir la intensidad de la palabra que tiene al lado?",pista:"Suele ser invariable y responde a '¿qué tan...?' o '¿en qué grado...?' respecto a otro elemento."},
  "SN/T":{fijo:"La preposición es solo un puente o enlace... ¿hacia qué 'destino' nos está llevando? ¿Cuál es la palabra que completa el sentido de ese enlace?",pista:"Es todo lo que queda dentro del grupo una vez que quitas el enlace (la preposición). Sin este elemento, la preposición se quedaría 'colgada' sin sentido."},
};
