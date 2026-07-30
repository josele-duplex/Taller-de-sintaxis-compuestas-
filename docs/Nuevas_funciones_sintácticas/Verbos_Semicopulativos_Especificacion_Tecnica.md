# Verbos Semicopulativos — Especificación Técnica de Implementación

### Taller de Sintaxis · Extensión para oración simple y oración compuesta

---

## 0\. Resumen ejecutivo

El documento fuente (`Verbos_semicopulativos.md`) contiene la teoría, la lista de verbos y un prompt-borrador para un motor de análisis. Es material lingüístico sólido pero **no es una especificación de implementación**: no define esquema de datos, no dice cómo se integra con las fases existentes, no deduplica la lista de verbos (aparece repartida en 4 bloques con solapamientos) y no resuelve varios casos límite que el motor va a encontrar en producción.

Este documento hace tres cosas:

1. **Consolida** la teoría en un modelo de datos único y sin duplicados (Sección 1).  
2. **Señala explícitamente** qué falta en el documento fuente y lo añade (Sección 2).  
3. **Especifica** el esquema JSON, la lógica de validación y el flujo UX para que Claude Code lo implemente directamente, tanto en el motor de oración simple como en el de oración compuesta (Secciones 3–9).

Todo lo marcado como **\[AÑADIDO\]** es contenido que no estaba en el documento fuente y que ha sido necesario crear para que la especificación sea implementable. Todo lo demás es una reorganización fiel del contenido original.

---

## 1\. Modelo lingüístico consolidado

### 1.1 Definición

Los verbos semicopulativos (pseudocopulativos) proceden de verbos plenos mediante gramaticalización: pierden su significado léxico original para funcionar como nexo entre un Sujeto y un Atributo. A diferencia de los copulativos puros (*ser, estar, parecer*), conservan un matiz aspectual (inicio, permanencia) o modal (apariencia, manifestación) que el verbo copulativo puro no aporta.

### 1.2 Protocolo de reconocimiento — 3 pruebas formalizadas

| \# | Prueba | Formulación operativa | Resultado esperado si es semicopulativo |
| :---- | :---- | :---- | :---- |
| 1 | **Esencia / argumentalidad** | Suprimir el segmento tras el verbo. ¿La oración queda anómala o el verbo recupera su significado pleno? | Sí → el segmento es imprescindible |
| 2 | **Pronombre "lo" (negativa)** | Sustituir el atributo por "lo". ¿Es agramatical? | Sí, la sustitución es agramatical (a diferencia de *ser/estar*, que sí la admiten) |
| 3 | **Adverbios "así" / "cómo" / "como" (positiva)** | Sustituir el atributo por uno de estos adverbios. ¿Es gramatical? | Sí, la sustitución funciona |

Las tres pruebas deben aplicarse conjuntamente. Ninguna por sí sola es concluyente (ver §8, casos límite).

### 1.3 Tabla maestra de verbos — consolidada y deduplicada

El documento fuente reparte los verbos en 4 bloques con solapamientos parciales (p. ej. *quedar(se)* e *ir* aparecen dos veces con matices distintos). Esta tabla es la versión única de referencia:

| Verbo | Categoría semántica | Nota de uso |
| :---- | :---- | :---- |
| hacerse | cambio | Atributos caracterizadores (admite *ser*). Admite atributo nominal: *se hizo un hombre* |
| ponerse | cambio | Estados circunstanciales/anímicos (admite *estar*) |
| quedarse / quedar | cambio **y** permanencia | Cambio: estado resultante de una acción (*se quedó mudo*). Permanencia: estado físico/situacional (*nos quedamos callados*). Desambiguar por contexto — ver §8 |
| volverse | cambio | Cambio de carácter o naturaleza, estable |
| resultar | cambio | Éxito/fracaso de un proceso. Admite atributo nominal: *resultó un éxito* |
| salir | cambio | Éxito/fracaso. Frecuente en construcciones evaluativas (*salió redondo, salió elegido*) |
| devenir | cambio | Registro culto/literario. Atributos nominales y adjetivales |
| tornarse | cambio | Sinónimo culto de *volverse/hacerse* |
| pasar a ser | cambio | Variante perifrástica |
| seguir / continuar | permanencia | Presupone estado previo |
| permanecer | permanencia | Duración de un estado |
| andar | permanencia | Estados a veces intermitentes o valorados negativamente. **Ambiguo con verbo pleno de movimiento** — ver §8 |
| mantenerse / conservarse | permanencia | El sujeto no cambia de condición |
| ir | permanencia | Gramaticalizado en contextos de estado persistente (*ir por la vida solo*) |
| mostrarse / presentarse | manifestación | Cómo se percibe externamente una propiedad |
| lucir | manifestación | Ponderación de apariencia física |
| verse | manifestación | Apariencia o sentimiento de estado |
| encontrarse / hallarse | manifestación | Estados circunstanciales/anímicos, próximos a *estar* |
| revelarse | manifestación | La propiedad se manifiesta de forma patente |
| aparecer | manifestación | Asimilado a verbos de apariencia |
| antojarse | manifestación | Valor modal cercano a *parecer*. Suele coaparecer con CI |
| pasar (inadvertido) | manifestación | Solo en locuciones fijas — no es semicopulativo fuera de ellas |
| venir | manifestación | Disposición, tamaño, relación necesaria (*venir estrecho, venirle de maravilla*) |

**\[AÑADIDO\]** Total consolidado: **22 verbos/lemas** en 3 categorías semánticas (cambio, permanencia, manifestación). El documento fuente citaba 24 entradas con 2 duplicados reales (*ir*, *quedar*) que aquí se resuelven en una sola entrada con nota de desambiguación.

### 1.4 Comportamiento del atributo semicopulativo

- **Imprescindible**: a diferencia del complemento predicativo de un verbo pleno (opcional), el atributo semicopulativo no puede eliminarse sin que la oración pierda sentido o el verbo recupere su lectura plena.  
- **No sustituible por "lo"**.  
- **Sustituible por "así" / "cómo" / "como"**.  
- **Categoría gramatical dominante**: adjetival y adverbial. Los atributos nominales son escasos y se restringen a *hacerse, resultar, sentirse* (y, por extensión razonable, *devenir* y *volverse* en registros cultos — **\[AÑADIDO\]**, no explícito en la fuente pero se sigue de la propia definición de "atributos nominales" que la fuente aplica a *devenir*).  
- **Concordancia obligatoria** en género y número con el sujeto, cuando el atributo es adjetivo o participio.  
- **Matiz semántico del auxiliar**: cambio → propiedad nueva tras proceso; permanencia → propiedad preexistente; manifestación → percepción externa de una propiedad.

### 1.5 Regla de decisión: Atributo vs Complemento Predicativo

```
¿El verbo, sin el segmento siguiente, conserva su significado normal
y la oración sigue siendo gramatical y completa?

├─ SÍ → el verbo es PLENO
│        → el segmento es CONTROVERTIBLE:
│           ¿es opcional y añade una cualidad simultánea a la acción?
│           → Complemento Predicativo (Llegó cansado)
│
└─ NO → el verbo es SEMICOPULATIVO (o copulativo puro si es ser/estar/parecer)
         → el segmento es OBLIGATORIO
         → Atributo (Se puso enfermo / El negocio salió redondo)
```

Esta regla de decisión **no estaba formalizada como árbol en el documento fuente** — aparecía como una nota de una línea ("Diferencia con el Predicativo"). **\[AÑADIDO\]** la formalización en árbol de decisión, necesaria para que el validador del motor la ejecute de forma determinista.

---

## 2\. Gaps del documento fuente — qué faltaba y qué se añade

El documento fuente es un buen resumen teórico pero, para ser implementable, necesitaba lo siguiente, todo añadido en este documento:

1. **Deduplicación de la lista de verbos** (§1.3) — la fuente repite *ir* y *quedar(se)* en dos secciones distintas sin unificarlos.  
2. **Formalización del protocolo de 3 pruebas** como tabla operativa, no como prosa (§1.2).  
3. **Árbol de decisión Atributo vs Predicativo** (§1.5) — la fuente lo menciona en una frase suelta.  
4. **Esquema JSON completo** para oración simple y oración compuesta (§3, §4) — inexistente en la fuente, que solo habla de "formato de salida" en prosa para un chatbot, no para una app con motor de fases.  
5. **Pseudocódigo de validación** determinista (§5) — la fuente da pruebas lingüísticas pero no dice cómo un programa las aplica sobre un JSON de ejercicio ya resuelto (las pruebas de sustitución son diálogo con el alumno, no verificación automática).  
6. **Integración con el flujo de fases existente**, tanto en el motor simple como en el de compuestas (§6) — no contemplado en la fuente, que asume un chatbot conversacional, no una UI de arrastrar-y-etiquetar.  
7. **Anotación completa de las 20 oraciones de prueba** en el esquema JSON real, palabra por palabra (§7) — la fuente las da como lista de frases en negrita sin estructura de datos.  
8. **Casos límite y ambigüedades** que el motor encontrará y que la fuente no resuelve: *andar* como verbo de movimiento pleno vs. semicopulativo, *quedar(se)* con doble categoría, verbos semicopulativos con sujeto tácito, atributo pronominalizado, coordinación de dos atributos (§8).  
9. **Checklist de implementación accionable** para Claude Code (§9).

---

## 3\. Esquema de datos — Oración simple

Se asume que el motor de oración simple ya distingue Predicado Nominal (con *ser/estar/parecer* → Atributo) de Predicado Verbal. La extensión consiste en añadir una tercera categoría de núcleo verbal.

```json
{
  "verbo": {
    "forma": "salió",
    "indice": 1,
    "tipo_predicado": "nominal",
    "categoria_verbo": "semicopulativo",
    "subtipo_semicopulativo": "cambio",
    "lema": "salir"
  },
  "atributo": {
    "indices": [2],
    "categoria": "adjetival",
    "concuerda_genero_numero": true,
    "sustituible_por_lo": false,
    "sustituible_por_asi": true
  }
}
```

| Campo | Valores | Notas |
| :---- | :---- | :---- |
| `tipo_predicado` | `"nominal"` | `"verbal"` | Ya existente en el motor para ser/estar/parecer; se reutiliza sin cambios |
| `categoria_verbo` | `"copulativo_puro"` | `"semicopulativo"` | `"pleno"` | **Campo nuevo**. copulativo\_puro \= ser/estar/parecer |
| `subtipo_semicopulativo` | `"cambio"` | `"permanencia"` | `"manifestacion"` | `null` | Solo si categoria\_verbo="semicopulativo" |
| `lema` | string | Forma canónica del verbo, para que el motor busque en la tabla maestra (§1.3) |
| `atributo.categoria` | `"adjetival"` | `"nominal"` | `"adverbial"` | Determina el color/clase visual del chip (reutiliza el sistema de colores sintácticos ya existente: adjetival → `--syn-adj-*`, nominal → `--syn-nominal-*`) |
| `atributo.concuerda_genero_numero` | boolean | Solo aplica si categoria="adjetival". Usado para la validación de concordancia (§5) |
| `atributo.sustituible_por_lo` | boolean | `false` para semicopulativos, `true` para copulativos puros. Se usa como dato pedagógico en la fase de justificación, no como pregunta al alumno |
| `atributo.sustituible_por_asi` | boolean | `true` para semicopulativos |

**Nota de compatibilidad:** si el motor de oración simple actual ya usa un campo distinto de `tipo_predicado` o `atributo`, Claude Code debe mapear estos nombres a los campos reales existentes en el código en lugar de crear un esquema paralelo. **\[AÑADIDO — advertencia de integración\]**: esta sección asume nombres de campo razonables pero no verificados contra el código fuente actual, que no se ha vuelto a auditar en esta sesión.

---

## 4\. Esquema de datos — Oración compuesta

Reutiliza la estructura `tokens[] / proposiciones[] / nexos[] / relaciones[]` ya implementada. Los cambios son aditivos:

```json
{
  "tokens": [
    { "i": 0, "texto": "El",      "categoria": "otro" },
    { "i": 1, "texto": "negocio", "categoria": "sustantivo" },
    { "i": 2, "texto": "salió",   "categoria": "verbo_semicopulativo" },
    { "i": 3, "texto": "redondo", "categoria": "otro" }
  ],
  "proposiciones": [
    {
      "id": "p1",
      "texto": "El negocio salió redondo",
      "indices": [0,1,2,3],
      "verbo": {
        "forma": "salió",
        "indice": 2,
        "lema": "salir",
        "categoria_verbo": "semicopulativo",
        "subtipo_semicopulativo": "cambio"
      },
      "tipo": "principal",
      "estructura": "personal",
      "predicado": {
        "tipo": "nominal",
        "atributo": {
          "indices": [3],
          "categoria": "adjetival",
          "concuerda_genero_numero": true
        }
      }
    }
  ]
}
```

| Campo nuevo | Ubicación | Descripción |
| :---- | :---- | :---- |
| `tokens[].categoria = "verbo_semicopulativo"` | tokens\[\] | Nuevo valor de la enum categoria (existente valores: sustantivo, verbo, conjuncion, pronombre\_relativo, adverbio\_relativo, puntuacion, otro) |
| `proposiciones[].verbo.categoria_verbo` | proposiciones\[\] | Igual que en oración simple (§3) |
| `proposiciones[].verbo.subtipo_semicopulativo` | proposiciones\[\] | Igual que en oración simple |
| `proposiciones[].predicado` | proposiciones\[\] | **Objeto nuevo**. Solo presente si la proposición tiene predicado nominal (copulativo puro o semicopulativo) |

Esto convive sin fricción con el resto del esquema del SDD: una proposición subordinada puede perfectamente tener un verbo semicopulativo en su interior (p. ej. *"Dijo que el examen resultaba fácil"* → la subordinada `que el examen resultaba fácil` tiene predicado nominal con atributo "fácil").

**Fase 7 (análisis interno):** cuando el alumno entra en el análisis interno de una proposición con verbo semicopulativo, el motor de oración simple hereda automáticamente `categoria_verbo` y `subtipo_semicopulativo` desde `proposiciones[].verbo` sin tener que volver a resolverlos — son el mismo dato, no se duplica el trabajo de anotación.

---

## 5\. Lógica de validación — pseudocódigo

El documento fuente da las 3 pruebas como algo que un chatbot conversacional "aplicaría" dialogando. En la app no hay diálogo: el alumno ya ha etiquetado el atributo y el motor **valida contra el JSON de solución**, no ejecuta las pruebas en tiempo real sobre lenguaje natural. **\[AÑADIDO\]** — esta distinción es clave y no estaba resuelta en la fuente.

```
función validarAtributoSemicopulativo(propuesta_alumno, solucion_json):

  // Paso 1 — clasificación del núcleo
  si propuesta_alumno.tipo_predicado != solucion_json.verbo.tipo_predicado:
      error("tipo_predicado_incorrecto")
      // p.ej. el alumno cree que es predicado verbal cuando es nominal

  // Paso 2 — categoría del verbo
  si propuesta_alumno.categoria_verbo != solucion_json.verbo.categoria_verbo:
      si solucion_json.verbo.categoria_verbo == "semicopulativo"
         y propuesta_alumno.categoria_verbo == "pleno":
            error("no_reconoce_semicopulativo",
                  pista: "Prueba a suprimir '" + atributo.texto + "'. "
                        + "¿La oración sigue siendo gramatical con el mismo sentido?")
      si no:
            error("categoria_verbo_incorrecta")

  // Paso 3 — función del segmento (Atributo vs C. Predicativo vs CC)
  si propuesta_alumno.funcion_segmento != "atributo"
     y solucion_json.verbo.categoria_verbo in ["copulativo_puro","semicopulativo"]:
        error("funcion_incorrecta",
              pista: "Este verbo no admite sustitución por 'lo' propia de "
                    + "copulativos puros, pero el segmento SÍ es obligatorio. "
                    + "Por tanto es Atributo, no Complemento Predicativo.")

  // Paso 4 — concordancia (solo si atributo es adjetival)
  si solucion_json.atributo.categoria == "adjetival":
      si NO concuerdaGeneroNumero(atributo.texto, sujeto.texto):
          warning("fallo_concordancia")  // detección de errores de redacción, no de análisis

  // Paso 5 — subtipo semántico (opcional, nivel avanzado)
  si fases_activas incluye "subtipo_semicopulativo":
      si propuesta_alumno.subtipo != solucion_json.verbo.subtipo_semicopulativo:
          error("subtipo_semantico_incorrecto",
                pista: sugerenciaPorLema(solucion_json.verbo.lema))
              // usa la tabla maestra §1.3 para dar la pista específica del verbo
```

---

## 6\. Integración con el flujo de fases existente

### 6.1 Oración simple

No se añade una fase nueva. Se extiende la fase existente de "Núcleo del Predicado":

- Cuando el alumno identifica el verbo, si el `lema` normalizado está en la tabla maestra (§1.3), el motor **no revela automáticamente** que es semicopulativo (eso destruiría el descubrimiento, mismo principio que en el mapa de compuestas). Simplemente permite que, en la fase siguiente ("Tipo de Predicado"), aparezcan las tres opciones: Verbal / Nominal (copulativo) / Nominal (semicopulativo) — **\[AÑADIDO\]**, esta tricotomía en la UI no existía porque hasta ahora solo había Verbal/Nominal.  
- Si el alumno marca "Nominal (semicopulativo)" correctamente, la fase de función pide etiquetar "Atributo" igual que con ser/estar/parecer. El chip visual usa el mismo color semántico de Atributo ya existente — no se inventa un color nuevo.  
- **Pista contextual on-demand** (siguiendo el principio de "asistente silencioso" ya establecido para compuestas): si el alumno se equivoca, la cápsula de ayuda ofrece la prueba de sustitución específica: *"Prueba a decir '...así'. ¿Funciona?"* Nunca aparece antes del error.

### 6.2 Oración compuesta

Se integra en las fases ya existentes sin crear fases nuevas:

- **Fase 0 (verbos)**: sin cambio funcional. El alumno marca el verbo igual que siempre; el motor internamente ya sabe si es semicopulativo por el JSON, pero no lo comunica.  
- **Fase 6 (función de la proposición subordinada) — o análisis interno en Fase 7**: si la proposición en cuestión tiene predicado nominal semicopulativo, aparece la etiqueta Atributo dentro de su análisis interno, exactamente igual que en oración simple. No requiere tocar las Fases 1–5 del motor de compuestas, que tratan la relación *entre* proposiciones, no la estructura *interna* de cada una.

**\[AÑADIDO\]** — el documento fuente no dice nada sobre integración de fases porque no conocía la arquitectura de la app; esta sección completa entera es nueva.

---

## 7\. Banco de ejercicios — las 20 oraciones anotadas

Las 20 oraciones de prueba del documento fuente, con anotación completa lista para insertar en `Oraciones_Banco` (motor simple) o `Compuestas_Banco` (si la oración es compuesta). Se marca con 🔶 las que requieren el motor de compuestas.

| \# | Oración | Verbo (lema) | Subtipo | Atributo | Categoría atributo |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | Peñaranda se hizo amigo de ellos. | hacerse | cambio | amigo de ellos | nominal (con SP complemento del nombre) |
| 2 | El viaje se me hacía eterno. | hacerse | cambio | eterno | adjetival (+ CI "me") |
| 3 🔶 | Entrenar se me hizo una obligación. | hacerse | cambio | una obligación | nominal (sujeto \= infinitivo "Entrenar") |
| 4 | La casa resultaba pequeña. | resultar | cambio | pequeña | adjetival |
| 5 | Susana se quedó atónita. | quedarse | cambio | atónita | adjetival |
| 6 | Samuel seguía triste. | seguir | permanencia | triste | adjetival |
| 7 | El sospechoso pasó inadvertido. | pasar | manifestación | inadvertido | adjetival (locución fija) |
| 8 | Carmen lucía bellísima en la fiesta. | lucir | manifestación | bellísima | adjetival (+ CC lugar "en la fiesta") |
| 9 | El profesor permaneció en silencio. | permanecer | permanencia | en silencio | adverbial (SP con valor adverbial) |
| 10 | La biblioteca se veía vacía. | verse | manifestación | vacía | adjetival |
| 11 | El Gobierno se muestra favorable. | mostrarse | manifestación | favorable | adjetival |
| 12 🔶 | La película vino precedida de una gran polémica. | venir | manifestación | precedida de una gran polémica | adjetival (participio \+ SP) |
| 13 | La cosa iba en serio. | ir | permanencia | en serio | adverbial |
| 14 | Iván anda preocupado últimamente. | andar | permanencia | preocupado | adjetival (+ CC tiempo "últimamente") |
| 15 | El negocio salió redondo. | salir | cambio | redondo | adjetival |
| 16 | El candidato salió elegido gobernador. | salir | cambio | elegido gobernador | adjetival (participio \+ atributo del atributo "gobernador") |
| 17 | Aquel hombre se volvió un ser huraño. | volverse | cambio | un ser huraño | nominal |
| 18 | El niño se puso enfermo. | ponerse | cambio | enfermo | adjetival |
| 19 | Rafa permanecía sentado mientras esperaba. | permanecer | permanencia | sentado | adjetival — 🔶 **oración compuesta completa**: subordinada temporal "mientras esperaba" |
| 20 | El departamento resultó pequeño para la familia. | resultar | cambio | pequeño | adjetival (+ CI/CC "para la familia") |

**\[AÑADIDO\]** — observaciones sobre el banco que no estaban en la fuente:

- Las oraciones **3, 12 y 19** tienen estructura interna que excede la oración simple básica (infinitivo como sujeto, participio con complemento, subordinada temporal). Se recomienda usarlas como ejercicios de nivel avanzado o revisarlas antes de insertarlas literalmente en el banco, para no introducir dos dificultades nuevas a la vez (semicopulativo \+ estructura compleja) en el mismo ejercicio.  
- La oración 16 (*"salió elegido gobernador"*) tiene un atributo interno de segundo grado (*"gobernador"* es atributo de *"elegido"*, no directamente del sujeto) — caso avanzado, ver §8.

---

## 8\. Casos límite y ambigüedades — \[AÑADIDO íntegramente\]

Ninguno de estos casos está resuelto en el documento fuente. Son necesarios porque el motor los va a encontrar en cuanto el banco de ejercicios crezca:

### 8.1 *Andar* — pleno vs. semicopulativo

*"Andar preocupado"* (semicopulativo) vs. *"Andar por el parque"* (pleno, movimiento). Regla de desambiguación para el validador: si el segmento tras "andar" es un SP con valor de lugar/dirección (*por, hacia, hasta*) → pleno. Si es un adjetivo, participio o SP no locativo → semicopulativo.

### 8.2 *Quedar(se)* — doble categoría semántica

*"Se quedó mudo"* (cambio, resultado de una acción) vs. *"Nos quedamos callados \[toda la tarde\]"* (permanencia). Regla de desambiguación: si hay un complemento temporal de duración o el contexto indica que el estado ya existía y simplemente continúa → permanencia. Si el estado es el resultado de un evento puntual anterior → cambio. Cuando el ejercicio no da contexto suficiente, el JSON debe fijar explícitamente el `subtipo_semicopulativo` en la solución y no dejarlo ambiguo para el alumno.

### 8.3 Atributo pronominalizado

*"Susana estaba atónita, y Marta también lo estaba"* — aquí "lo" retoma el atributo de un copulativo puro (*estar*), válido. Pero si el segundo verbo fuera semicopulativo (*"y Marta también se lo quedó"*) sería agramatical, que es justamente la prueba 2 del protocolo. El motor debe evitar generar ejercicios que muestren la sustitución agramatical como si fuera una opción correcta — es una prueba negativa, no una construcción real de la lengua.

### 8.4 Atributo del atributo (grado 2\)

Caso de la oración 16: *"salió elegido gobernador"*. "Elegido" es el atributo de "salió" (verbo semicopulativo), pero "gobernador" es a su vez un atributo de "elegido" dentro del participio. **Recomendación**: para la v1 del módulo, tratar todo el segmento *"elegido gobernador"* como un único atributo compuesto, sin desglosar el grado 2\. Desglosar exige una fase adicional de análisis interno del propio atributo, que se puede posponer a v2.

### 8.5 Verbos con sujeto tácito y CI simultáneo

Oraciones como *"El viaje se me hacía eterno"* tienen simultáneamente el verbo semicopulativo, su atributo, y un CI ("me") que no debe confundirse con el atributo. El validador debe comprobar que el alumno no incluya el pronombre CI dentro de los índices del atributo.

### 8.6 Verbos semicopulativos con "se" — no confundir con voz pasiva refleja ni con verbo pronominal puro

*"Se hizo"*, *"se puso"*, *"se quedó"* llevan un "se" que forma parte de la construcción pronominal del verbo semicopulativo, no es un CD ni un CI ni marca de pasiva. El tokenizador debe etiquetar este "se" con una categoría propia (`"se_pronominal_semicopulativo"` o similar) para que no quede huérfano ni sea etiquetable erróneamente por el alumno.

---

## 9\. Checklist de implementación para Claude Code

- [ ] Añadir `verbo_semicopulativo` como valor válido de `tokens[].categoria` en el esquema de oración compuesta.  
- [ ] Añadir `categoria_verbo` (copulativo\_puro / semicopulativo / pleno) y `subtipo_semicopulativo` (cambio / permanencia / manifestacion) al objeto verbo, en ambos motores (simple y compuesta).  
- [ ] Añadir el objeto `predicado.atributo` con `categoria`, `concuerda_genero_numero`, `sustituible_por_lo`, `sustituible_por_asi`.  
- [ ] Cargar la tabla maestra de 22 verbos (§1.3) como constante del motor (`LEMAS_SEMICOPULATIVOS`), indexada por lema, para resolución automática de `subtipo_semicopulativo` a partir del lema detectado.  
- [ ] Implementar el árbol de decisión Atributo vs Predicativo (§1.5) como función pura de validación, no como pregunta directa al alumno.  
- [ ] Implementar el pseudocódigo de validación de 5 pasos (§5), incluyendo los mensajes de pista específicos por tipo de error.  
- [ ] Extender la fase "Tipo de Predicado" del motor simple para ofrecer la tricotomía Verbal / Nominal-copulativo / Nominal-semicopulativo, sin revelar la respuesta antes del intento del alumno.  
- [ ] Verificar que Fase 7 (análisis interno de compuestas) hereda `categoria_verbo` y `subtipo_semicopulativo` sin duplicar la anotación.  
- [ ] Cargar en el banco las 17 oraciones simples directamente utilizables (todas menos la 3, 12 y 19, que requieren revisión o el motor de compuestas) más la oración 19 en `Compuestas_Banco` como ejercicio de subordinada temporal \+ semicopulativo.  
- [ ] Implementar las reglas de desambiguación de *andar* (§8.1) y *quedar(se)* (§8.2) en el generador de ejercicios o en la validación manual del banco, para que no se creen ejercicios ambiguos sin resolver.  
- [ ] Añadir categoría de tokenización para el "se" pronominal de construcción semicopulativa (§8.6), distinta de CD/CI/pasiva refleja.  
- [ ] Actualizar el glosario contextual de la app (hover semántico, ver Context Rail) con las entradas: "Verbo semicopulativo", "Atributo (semicopulativo)", con la definición breve de una línea siguiendo el mismo formato que el resto de entradas del glosario.

