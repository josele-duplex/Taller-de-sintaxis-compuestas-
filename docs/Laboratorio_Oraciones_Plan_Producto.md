# El Laboratorio de Oraciones — plan de producto y especificación
## Gemelo sintáctico de «La Fábrica de Palabras»: manipular oraciones y juzgar gramaticalidad para cubrir las fases 1-3 del método

**v1.0 · 30 de julio de 2026 · Estado: propuesta para decisión de Josele**

> **Qué resuelve.** El plan de integración app↔aula deja entrar la app solo *después* de la fase de etiqueta de cada unidad, porque Simples, Sintagmas y Compuestas son etiqueta-first: presuponen que el alumno ya sabe qué es un CD antes de abrirlos. El Laboratorio cubre las fases **1-3** del método (activación → observación de corpus → manipulación), que hoy solo ocurren en el aula y en papel. Con él, la app acompaña la unidad de sintaxis **desde la segunda sesión**, no desde la penúltima; y digitaliza por primera vez la **parte razonada ⚓** de las pruebas de bloque (el «¿cómo lo sabes?»), hasta ahora obligatoriamente en papel.
>
> **Fuentes usadas** (leídas, no de memoria): `docs/Laboratorio_Oraciones_Semilla.md` (decisiones cerradas, §4) y `docs/Fabrica_Palabras_Plan_Producto.md` (estructura y patrón) de este repo; `Banco_reflexion_metalinguistica.md`; del proyecto de Lengua, `documentos_base/marco_teorico_didactico.md` §§1.2, 2.1, 2.3, 3.3, `documentos_base/Plan-integracion_app-taller-sintaxis.md` §§3-6, `documentos_base/catalogo/gramatica.md` y el banco curado R-07 `bancos_ejercicios/pares_minimos/` (`INDICE`, `sintaxis.md`, `analisis-inverso.md`); de este repo, `arquitectura.md`, `js/glosario/tags.js`, `js/modules/sint/index.js` (`GrammarRules`, `FUNC_WEIGHT`) y `scripts/validar-banco.mjs`.

---

## 0. La tesis de producto (lo que decidiría un desarrollador senior)

**No construir un «segundo analizador».** Ya hay tres motores que etiquetan oraciones (Simples, Sintagmas, Compuestas) y un cuarto que las reconoce a velocidad (Chispa). Lo que falta no es más etiqueta: es el paso previo. El Laboratorio no analiza oraciones — **las rompe a propósito para ver qué las sostiene**. Su verbo no es *etiquetar*, es *operar*: sustituir, suprimir, conmutar, permutar, transformar (marco §1.2, principio 2).

Lo que la app hace mejor que el aula, igual que en la Fábrica: **manipulación a escala con verificación instantánea**. Un profesor puede pedir en voz alta «cambiad el número del sujeto» y comprobar tres respuestas; la app comprueba treinta, una por alumno, y registra cuál de las cinco pruebas falla cada grupo. Lo que se queda en el aula sigue siendo del aula: la pregunta-problema inicial (fase 1 oral), la puesta en común y la definición construida entre todos (fase 4 dialogada).

**Tres decisiones estructurales que se derivan del marco teórico:**

1. **La función no se define, se comporta.** Cada función sintáctica se presenta como *un haz de reacciones a manipulaciones*: el CD es lo que admite *lo/la*, sobrevive como sujeto en la pasiva y no acepta *le*. El alumno conoce el comportamiento antes que el nombre. Es el principio 1 del marco («la etiqueta es punto de llegada») convertido en regla del motor: las estaciones 1-2 no muestran ni piden metalenguaje.
2. **El asterisco es contenido, no castigo.** El error y la duda son material de trabajo (marco §2.3): los juicios de gramaticalidad son un tipo de ítem de primera clase, con su corpus, sus reglas editoriales (§2.5) y su peso en la nota. Y se evalúa **el porqué, no el veredicto**: acertar que algo «suena mal» sin decir qué se rompe vale poco (§5.4).
3. **El Laboratorio termina donde Simples empieza.** Ningún ítem pide un análisis completo. El cierre de cada reto es un puente explícito («ahora analiza tú esta misma oración entera») que lanza el módulo Simples con esa oración. Esto acota el alcance y hace que los dos módulos se necesiten en lugar de solaparse.

---

## 1. El módulo en una pantalla

**Nombre de cara al alumno:** 🧪 **El Laboratorio de Oraciones**. La metáfora es la del experimento (hipótesis → prueba → conclusión), coherente con la Secuencia Didáctica de Gramática de Camps y con el «Detective de oraciones» de la unidad de 3.º ESO, cuya *caja de pruebas* es literalmente la pieza de acompañamiento de §4.1.

**Unidad de juego: el «reto»** (un miniciclo de la SDG). Cada reto gira sobre un mini-corpus de 3-6 oraciones emparentadas y tiene tres estaciones que se desbloquean **en orden**:

| Estación | Fase del método | Qué hace el alumno | Metalenguaje visible |
|---|---|---|---|
| **1 · Observa** 🔍 | Fase 2 (observación de corpus) | Contar los «actores» que pide el verbo; decir qué cambia entre dos oraciones casi idénticas; señalar la que no sigue el patrón | **Ninguno** |
| **2 · Manipula** 🔧 | Fase 3 (manipulación, el núcleo) | Los 5 experimentos (sustituye · suprime · cambia el número · mueve · transforma), juicios de gramaticalidad, pares mínimos y análisis inverso | **Ninguno** (a lo sumo «este trozo», «la oración se rompe») |
| **3 · Etiqueta + prueba** 🏷 | Fase 4 (formalización) | Nombrar lo ya conquistado **y elegir la prueba que lo demuestra** — es el `Banco_reflexion_metalinguistica.md` jugado | Todo — y aquí se gana |

Al cerrar cada estación 3, la prueba conquistada añade su fila a la **Caja de Pruebas del Detective** (§4.1), con el ejemplo del propio alumno.

**Dónde vive (resuelve el punto 3 de la semilla §5): card propia en portada, con puente a Simples en los dos sentidos.**

- **Card propia** (`screen-laboratorio`, módulo `js/modules/laboratorio/index.js`), no fase previa dentro de Simples. Razones: (a) el motor de Simples es uno de los dos grandes y su máquina de estados `G` tiene contratos vivos con las subfases y el examen — meterle una estación previa es tocar lo que la regla 4 de `CLAUDE.md` manda no tocar a la ligera; (b) el Laboratorio se usa en sesiones donde Simples todavía no tiene sentido (el alumno no conoce las etiquetas), así que necesita entrada propia; (c) su banco, su examen y sus analíticas son independientes.
- **Puente de ida** (fin de cada reto): botón «🔎 Analiza esta oración entera en Simples», que abre Simples con la oración del reto ya cargada (usa el `metadatos.origen_oracion_id` del schema, §5.1).
- **Puente de vuelta** (lo que lo hace valioso para el profesor): cuando un alumno falla tres veces la misma función en Simples, el feedback ofrece «🧪 Practica esta función en el Laboratorio». Reutiliza `taller_error_history`, que ya cuenta esos fallos.
- **Colisión de portada:** agrupar visualmente las tres cards de oración en un bloque «Oraciones» (Laboratorio · Simples · Compuestas), espejo de la agrupación «Palabras» propuesta para la Fábrica. Decisión de Josele (§7.6).

**Lo que queda fuera a propósito (control de alcance):** el análisis completo de la oración (es de Simples); los sintagmas internos (es de Sintagmas); la oración compuesta (es de Compuestas — el Laboratorio nivel avanzado trabaja sobre oraciones simples y sobre los valores de *se*, no sobre subordinación); la fase 1 del método (la pregunta-problema en voz alta, que es del aula) y la fase 5 (aplicación al texto propio, que es del porfolio — la app solo la recuerda al cerrar sesión).

---

## 2. Tipos de ítem (catálogo cerrado, todos autocorregibles)

Cada tipo transpone un tipo de tarea del catálogo del marco (§3.3): Tipo 1 (manipulación) es la estación 2 entera; Tipo 2 (diagnóstico de gramaticalidad) son los juicios; Tipo 3 (emparejamiento semántico-sintáctico) es la valencia intuitiva de la estación 1; Tipo 5 (investigación abierta) es el ítem estrella del nivel avanzado. Ningún tipo nuevo entra sin pasar por este catálogo.

Todos los ítems se validan por **opciones de resultado** —el alumno elige qué queda tras la manipulación, o si funciona— salvo el análisis inverso, que se valida por piezas/slots (semilla §4).

### 2.1 Estación 1 · Observa (sin etiquetas)

| # | Ítem | Mecánica | Ejemplo real |
|---|---|---|---|
| 1.1 | **¿Cuántos actores?** (valencia intuitiva) | Elegir 1, 2 o 3 según lo que el significado del verbo reclama; luego arrastrar los actores de la oración a sus casillas sin nombrarlos | *dormir* (1) · *romper* (2) · *regalar* (3) — entrada por el significado de Zayas, es la etapa 1 de `HR-D-2E-sint` |
| 1.2 | **¿Qué cambia?** | Dos oraciones mínimamente contrastadas; marcar el trozo que ha cambiado y elegir la consecuencia entre 3 opciones sin metalenguaje | *La profesora explica / Las profesoras explican* → «también ha cambiado la palabra que dice la acción» (`PM-SINT-02`) |
| 1.3 | **El intruso de la serie** | Marcar la oración que no sigue el patrón de las demás | serie de sujetos pospuestos + una con complemento de lugar delante: *En la biblioteca trabajan muchos estudiantes* (`PM-SINT-05`) |

Feedback de estación 1: nunca nombra la etiqueta. Dice «al cambiar *la profesora* por *las profesoras*, el verbo se ha visto obligado a cambiar también: van juntos», no «es el sujeto».

### 2.2 Estación 2 · Manipula (el corazón del módulo)

Los cinco experimentos son las cinco pruebas de la NGLE que el proyecto ya inventarió, jugadas una a una:

| # | Ítem | Mecánica | Ejemplo real |
|---|---|---|---|
| 2.1 | **SUSTITUYE** | Se marca un trozo y se pide elegir la oración resultante entre 3-4 candidatas (una correcta, las demás con el pronombre de la función vecina) | *Avisaron **a los bomberos*** → ✓ *Los avisaron* · ✗ *Les avisaron* (la trampa del *a*, banco de reflexión §2) |
| 2.2 | **SUPRIME** | ¿Qué queda si lo quito? Tres opciones: sigue funcionando / el verbo queda cojo / cambia de significado | *Hablaron **de política** toda la tarde*: *toda la tarde* se suprime, *de política* deja el verbo cojo (banco §4) |
| 2.3 | **CAMBIA EL NÚMERO** | Se cambia el número de un trozo y hay que elegir la oración entera resultante: el ítem se gana si el alumno arrastra el cambio a todo lo que concuerda | *El alumno salió contento* → *Los alumnos salieron contentos* (dos cosas cambian, no una: banco §6) |
| 2.4 | **MUEVE** | Reordenar arrastrando, o juzgar si el desplazamiento es posible | *Ayer llegó… / …llegó ayer* ✓ (`PM-SINT-16`) frente a un C.Rég. que no se despega del verbo |
| 2.5 | **TRANSFORMA** | Activa↔pasiva: elegir la versión transformada correcta | *El cocinero prepara el menú / El menú es preparado por el cocinero* (`PM-SINT-10`) |
| 2.6 | **Juicio de gramaticalidad** | ¿Funciona o no? + **elegir qué se rompe** de la lista cerrada de causas (§2.5). El veredicto solo no basta | \**Pedro salió la casa* (`PM-SINT-09`) · \**pienso de mi familia* (`PM-SINT-29`) · \**Las chicas están contentos* (`PM-SINT-22`) |
| 2.7 | **Par mínimo** | Dos oraciones casi idénticas: ¿qué ha cambiado de función? Opciones = pares de funciones (con metalenguaje solo si el nivel lo permite; en `basico`, paráfrasis) | *carta **a** su amiga / carta **para** su amiga* (`PM-SINT-11`) · *Se detuvo el ladrón / Se detuvo al ladrón* (`PM-SINT-07`, el más rentable del banco) |
| 2.8 | **Análisis inverso** | No se da la oración: se dan las condiciones y el alumno la **construye** arrastrando piezas de un banco (validación por slots, como «Fabrica tu palabra») | «Construye una oración con el sujeto detrás del verbo» (`AI-SINT-08`) · «…con un adjetivo que concuerde con el CD, no con el sujeto» (`AI-SINT-09`) |
| 2.9 | **Caso frontera (zona gris)** ⚖ | Ítem marcado como debate: dos análisis puntúan si van con la justificación coherente | *La mayoría de los alumnos llegó / llegaron* — el ejemplo del propio marco §2.3.a: la pregunta no es «cuál está mal» sino «qué dos análisis hay aquí» |

Los ítems 2.7 y 2.8 se **importan por ID** del banco R-07 del proyecto de Lengua (58 pares + 16 análisis inversos ya curados y marcados por nivel). El campo `fuente_id` del schema guarda `PM-SINT-11` / `AI-SINT-08`: el contenido no se duplica, se referencia — misma política que el propio banco R-07 aplica con sus fuentes.

### 2.3 Estación 3 · Etiqueta + prueba

Esta estación **es** `Banco_reflexion_metalinguistica.md`, ya especificado (10 funciones, con su prueba ✓, sus distractores ✗ razonados y microexplicación en cada opción). Aquí solo se decide cómo se juega:

| # | Ítem | Mecánica | Ejemplo real |
|---|---|---|---|
| 3.1 | **¿Qué prueba lo demuestra?** | El sintagma aparece ya etiquetado en su oración; 1 prueba correcta + 2-3 distractores (la prueba del vecino confundible + un heurístico rechazado), cada opción con microexplicación | «*Las gemelas parecían **cansadas***. ¿Qué prueba demuestra que es Atr.?» ✓ *Las gemelas **lo** parecían* · ✗ «concuerda y podría suprimirse» (CPvo) · ✗ «responde a *¿cómo?*» (heurístico) |
| 3.2 | **Variante sin metalenguaje** (nivel `basico`) | Mismo ítem, enunciado simplificado: «¿cuál de estos cambios funciona?». Implementa la nota de escalado que el banco dejaba anotada como no implementada | «*Me gustan **las novelas de aventuras***. ¿Cuál de estos cambios funciona?» ✓ *Me gusta la novela* · ✗ *Las gusto* |
| 3.3 | **Tu ejemplo para la caja** | Al acertar la prueba, el alumno la fija con **un ejemplo propio** construido por piezas (mismo validador de slots que 2.8). Esa fila entra en la Caja de Pruebas (§4.1) | prueba del CI → el alumno fabrica una oración donde *le* funcione |

Cierre del reto: puente a Simples (§1) + recordatorio de fase 5 («busca en tu último texto una oración con dos complementos y comprueba cuál admite *lo*»).

### 2.4 Matriz de vecinos confundibles (fuente de los distractores)

Ya cerrada en el banco de reflexión y se adopta tal cual: Sujeto↔CD · CD↔CI · CD↔C.Rég. · Atr.↔CPvo · CPvo↔CC Modo · CI↔CC Finalidad · C.Ag.↔CC Causa · Vocat.↔Sujeto · Marca.Pas.Ref.↔Marca.Imp. El distractor por defecto de cada función es **su vecino + un heurístico rechazado** («¿quién?», «¿a quién?», «¿para quién?», «lleva *a*, luego es CI», «lleva *por*, luego es CC Causa»). Regla dura del proyecto que el motor hereda de `GrammarRules.filterTraps`: con **«para» nunca se ofrece CI como correcta**, solo como distractor.

### 2.5 Reglas editoriales del corpus agramatical (resuelve el punto 2 de la semilla §5)

**El principio rector viene del marco §2.3:** hay que distinguir tres cosas que no se juegan igual.

| Marca | Qué es | Cómo se juega | Ejemplo |
|---|---|---|---|
| **✗ con asterisco** | Error de **comprensión gramatical**: concordancia, régimen, función, transitividad. Ningún hablante nativo lo dice | Material central de los juicios (2.6). Se pide veredicto **y causa** | \**Los niños juega* |
| **⚠ sin asterisco** | Error de **norma culta**: queísmo, dequeísmo, leísmo, laísmo, nombre propio con artículo. Se dice, pero no en registro formal | Ítem aparte, etiquetado «⚠ cuidado con el registro», nunca con asterisco. Se pregunta *en qué situación* no vale, no si «está mal» | ⚠ *La dije que viniera* |
| **⚖ zona gris** | Dos análisis posibles, o aceptabilidad variable | Ítem 2.9: puntúan las dos respuestas si la justificación es coherente | ⚖ *La mayoría de los alumnos llegó/llegaron* |

**Queda fuera del corpus por completo:** incorrección normativa de origen social (*haiga*, *cocretas*), ortografía, léxico y rasgos dialectales —incluidos los de la Región— y cualquier cosa que pueda leerse como burla del habla familiar del alumno. El marco es explícito: eso se aborda como **variación social**, no como material de análisis. Un asterisco sobre el habla de casa de un alumno de 2.º ESO es un coste pedagógico que el módulo no va a pagar.

**Tipos de agramaticalidad por nivel (lista cerrada, es el enum `causa` del schema):**

| Código de causa | Qué se rompe | Ejemplo (ID del banco cuando existe) | Nivel mín. | Marca |
|---|---|---|---|---|
| `concordancia_sv` | número/persona entre sujeto y verbo | \**Los niños juega* | basico | ✗ |
| `concordancia_atr` | el Atr. no concuerda con el sujeto | \**Las chicas están contentos* (`PM-SINT-22`) | basico | ✗ |
| `transitividad` | verbo intransitivo con CD | \**Pedro salió la casa* (`PM-SINT-09`) | basico | ✗ |
| `orden_imposible` | permutación que rompe la estructura | \**Casa la limpió Pedro la* | basico | ✗ |
| `concordancia_cpvo` | el CPvo no concuerda con su nombre | \**Encontraron consciente a los heridos* | medio | ✗ |
| `regimen_prep` | preposición fija del verbo sustituida | \**pienso de mi familia* (`PM-SINT-29`) | medio | ✗ |
| `pronombre_cruzado` | pronombre de CD donde va el de CI o al revés | \**María la escribió una carta a Juan* (`PM-SINT-35`) | medio | ✗ |
| `seleccion_semantica` | el verbo no admite ese complemento | \**Presencié a los jugadores* (`PM-SINT-36`) | medio | ✗ |
| `articulo_propio` | nombre propio con artículo | *El Buñuel…* (`PM-SINT-34`) | medio | ⚠ |
| `pasiva_refleja_intrans` | pasiva refleja con verbo intransitivo | \**se desapareció el acuerdo* (`PM-SINT-54`) | avanzado | ✗ |
| `duplicacion_obligatoria` | falta el pronombre átono obligatorio | \**vi a ella* (`PM-SINT-55`) | avanzado | ✗ |
| `modo_obligado` | indicativo donde el verbo exige subjuntivo | \**prefiero que viajas* (`PM-SINT-49`) | avanzado | ✗ |
| `gradabilidad` | adjetivo no graduable con cuantificador | \**es muy infinito* (`PM-SINT-58`) | avanzado | ✗ |
| `queismo_dequeismo` | preposición ante *que* añadida o suprimida | *Me alegro que vengas* | avanzado | ⚠ |
| `leismo_laismo` | *le* por *lo*, *la* por *le* | *La dije que viniera* | avanzado | ⚠ |
| `concordancia_ad_sensum` | concordancia con el significado, no con la forma | *La mayoría… llegó/llegaron* | avanzado | ⚖ |

**Cuatro reglas de UI y de composición, no negociables una vez aceptadas:**

1. **El asterisco lo pinta la UI, no el dato.** El JSON guarda la oración limpia y su marca (`marca: "agramatical"`); la pantalla añade `*` con clase propia (`.lab-asterisco`, rojo del sistema de tokens) y una leyenda fija: «el asterisco marca lo que un hablante nativo no diría».
2. **Nunca una oración agramatical sola en pantalla.** Todo juicio ✗ se muestra **junto a su gemela correcta** (o la ofrece el feedback inmediato). Se juzga por contraste; una pantalla con solo el error acaba enseñando el error.
3. **Al menos un control gramatical por cada tres juicios.** Si todo lo que se pregunta está mal, el alumno aprende a contestar «mal» sin mirar. El schema exige `veredicto: "gramatical"` en al menos un ítem de cada reto que tenga tres o más juicios.
4. **Densidad:** cada reto lleva **1-2 juicios** (semilla §4: al menos uno); un bloque de evaluación formativa lleva **4-6**, que es lo que el marco §2.3 pide por unidad. El límite superior existe para que el módulo no se convierta en un test de corrección.

---

## 3. Niveles curriculares (mismos tres niveles que el resto de la app)

Reutiliza la convención existente `basico` / `medio` / `avanzado` ↔ Aprendiz / ESO34 / Maestro. El alcance de cada nivel es exactamente el de la unidad real del curso, sin inventar progresión nueva. Las etiquetas son las del repertorio del código (`FUNC_ORAC` en `js/glosario/tags.js`), no otras.

| Nivel | Curso ancla | Unidad fuente | Funciones en juego | Experimentos | Agramaticalidad |
|---|---|---|---|---|---|
| **basico** (Aprendiz) | 2.º ESO (repaso en 1.º) | `UD-D-2E-sint` «La escena del verbo» | Sujeto, CD, CI, CC (sin subtipo fino), NP | Sustituye (*lo/la*, *le*), cambia el número, mueve. Sin pasiva | Solo ✗ de concordancia, transitividad y orden |
| **medio** (ESO34) | 3.º ESO y 4.º | `UD-D-3E-sint` «Detective de oraciones» + `UD-D-04b` (valencia y argumentales) | + C.Rég., Atr., Atr. Loc., CPvo, C.Ag., CC con subtipo, Vocat., PN/PV | Los cinco, incluida activa↔pasiva | + régimen, pronombre cruzado, selección semántica; primer ⚠ |
| **avanzado** (Maestro) | 1.º BACH | `UD-D-1B-sint` (parte de oración simple) | + Marca.Pas.Ref., Marca.Imp., Marca.Pron., Dativo, Mod.Or. y los periféricos | Los cinco + transformaciones cruzadas (impersonal↔pasiva refleja) | Todo, incluidos ⚠ de norma culta y ⚖ de zona gris |

**El ítem estrella de `avanzado` es la investigación de los valores de *se***, jugada como Tipo 5 del marco («aquí tenéis veinte enunciados con *se*: investigad cuántos valores distintos tiene»): el reto sirve un corpus de 12-20 oraciones y el alumno las clasifica por **comportamiento** antes de recibir los nombres —¿concuerda el verbo con el elemento pospuesto? ¿se puede quitar el *se*? ¿hay pasiva equivalente?—. La cascada de decisión es la del banco de reflexión §10. Es la pieza más valiosa para EBAU del módulo y la que ninguna app de español al uso tiene, igual que la estructura secuenciada lo era en la Fábrica.

En `basico` **no aparece ni una etiqueta**: la estación 3 usa siempre la variante 3.2 («¿cuál de estos cambios funciona?»). La primera vez que un alumno del proyecto ve la palabra «sujeto» en la app sigue siendo en Simples, no aquí.

---

## 4. Las tres piezas de acompañamiento

### 4.1 La Caja de Pruebas del Detective (sistematización digital)
Gemela de la Mesa de Herramientas de la Fábrica, y con nombre que ya existe en el aula: la etapa 7 de `HR-D-3E-sint` la llama así y la usa como carta de estudio. Tabla personal que se rellena sola: cada prueba conquistada en la estación 3 añade su fila (función + prueba + **el ejemplo del propio alumno**, el que construyó en el ítem 3.3). Exportable e imprimible → la carta de estudio de la unidad, generada por el uso y no fotocopiada. Vacía en la primera sesión, llena antes de la prueba de bloque.

### 4.2 «Cazador de contraejemplos» (el reto creativo)
Producto final jugable, gemelo de «Fabrica tu palabra» y con la misma propiedad: **semiabierto pero autocorregible en lo que importa**. El alumno construye por piezas una **pareja mínima propia**: una oración que cumpla una condición y su gemela que la rompa, declarando de la lista cerrada **qué se rompe**. La app valida los slots y la coherencia entre la pieza cambiada y la causa declarada; el ingenio de la oración no puntúa, se expone en su **Cuaderno de Campo** personal. Es exactamente lo que el criterio LOMLOE 9.2 llama «la búsqueda de contraejemplos», y es evaluable porque el procedimiento se verifica solo.

### 4.3 Diario metalingüístico
Al cerrar sesión, campo opcional con la plantilla del marco: *«Antes pensaba que…, ahora he descubierto que…, y lo sé porque…»*. Reutiliza tal cual el patrón de la columna `Reflexion` de retos y misiones, que ya existe y ya viaja al informe del profesor. Coste casi nulo, y es el instrumento nº 1 de la tabla de evaluación formativa del marco §3.4.

---

## 5. Arquitectura técnica (mínima novedad, máxima reutilización)

Coherente con las reglas del repo: sin frameworks, ES modules, `window.X` para `onclick`, un módulo nuevo `js/modules/laboratorio/index.js` + pantalla `screen-laboratorio` registrada en `showScreen`.

### 5.1 Datos — hoja nueva `Laboratorio_Banco` (resuelve el punto 1 de la semilla §5)

**Decisión: hoja nueva, no extensión de `Oraciones_Banco`.** Razones: (a) la cardinalidad es distinta —`Oraciones_Banco` es una fila por oración con su `Estructura_JSON` de 4 fases; aquí la unidad es el reto, con un mini-corpus y N ítems heterogéneos—; (b) extender obligaría a añadir columnas vacías en las ~450 filas existentes y a tocar el validador y el motor de Simples, que leen esa hoja en producción; (c) `Compuestas_Banco` ya sentó el precedente de hoja propia por módulo. **Pero se reutiliza el solucionario**: `metadatos.origen_oracion_id` apunta a una fila de `Oraciones_Banco`, de modo que el reto hereda el análisis canónico ya validado (la app *ya sabe* qué es CD en esa oración → puede generar y comprobar la sustitución esperada) y el puente a Simples es un salto directo, no una búsqueda por texto.

Columnas: `ID · Nivel · Curso_Min · Titulo_Problema · Funciones · Tipos_Item · JSON_Reto · Fuente · Zona_Gris · Activo`. **Se leen siempre por nombre** (`getColMap_`), nunca por letra.

Schema **laboratorio v1.0** en `JSON_Reto`:

```json
{
  "schema_version": "1.0",
  "id": "LB_0042",
  "nivel": "medio",
  "titulo_problema": "¿Por qué aquí funciona 'le' y no 'lo'?",
  "corpus": [
    "Entregó un ramo a su profesora.",
    "Entregó un ramo para su profesora."
  ],
  "items": [
    { "tipo": "valencia", "verbo": "entregar", "respuesta": 3,
      "feedback": "Entregar pide tres: quien entrega, lo entregado y quien lo recibe." },

    { "tipo": "manipulacion", "manipulacion": "sustituye",
      "oracion": "Entregó un ramo a su profesora.",
      "objetivo": { "texto": "a su profesora", "funcion": "CI" },
      "opciones": [
        { "texto": "Le entregó un ramo.", "ok": true,
          "micro": "El pronombre que le corresponde es 'le': es CI." },
        { "texto": "La entregó un ramo.", "ok": false,
          "micro": "'La' es el pronombre del CD; aquí el CD es 'un ramo'." },
        { "texto": "Entregó un ramo de ello.", "ok": false,
          "micro": "'eso/ello' con la preposición pegada es la prueba del C.Rég." }
      ] },

    { "tipo": "juicio", "oracion": "María la escribió una carta a Juan.",
      "veredicto": "agramatical", "marca": "agramatical",
      "causa": "pronombre_cruzado",
      "opciones_causa": ["pronombre_cruzado", "concordancia_sv", "regimen_prep"],
      "gemela_correcta": "María le escribió una carta a Juan.",
      "explicacion": "Cada función tiene su pronombre: 'a Juan' es CI, así que le corresponde 'le'.",
      "fuente_id": "PM-SINT-35" },

    { "tipo": "par_minimo",
      "oracion_a": "Escribió una carta a su amiga.",
      "oracion_b": "Escribió una carta para su amiga.",
      "cambio": "a → para",
      "opciones": [
        { "texto": "CI → CC Finalidad", "ok": true,
          "micro": "Con 'para' nunca hay CI: 'le' ya no funciona y el trozo se puede desplazar." },
        { "texto": "CI → CD", "ok": false, "micro": "El CD sigue siendo 'una carta'." }
      ],
      "fuente_id": "PM-SINT-11" },

    { "tipo": "etiqueta_prueba", "oracion": "Entregó un ramo a su profesora.",
      "objetivo": { "texto": "a su profesora", "funcion": "CI" },
      "prueba_id": "PRU-SINT-CI-01",
      "distractores": ["PRU-SINT-CD-01", "HEUR-PARA-QUIEN", "HEUR-PREP-A"] },

    { "tipo": "analisis_inverso",
      "consigna": "Construye una oración con sujeto, CD de persona (con 'a') y CI.",
      "piezas": ["El árbitro", "a los jugadores", "al entrenador", "presentó", "les"],
      "slots": [
        { "rol": "Sujeto", "acepta": ["El árbitro"] },
        { "rol": "NP", "acepta": ["presentó"] },
        { "rol": "CD", "acepta": ["a los jugadores"] },
        { "rol": "CI", "acepta": ["al entrenador"] }
      ],
      "comprobacion": "sustitucion_pronominal",
      "fuente_id": "AI-SINT-02" }
  ],
  "zona_gris": false,
  "metadatos": {
    "origen_oracion_id": "OR_0117",
    "origen_ud": "UD-D-3E-sint S3",
    "curso_min": "3E"
  }
}
```

Notas de diseño del schema:

- **El objetivo se referencia por texto, no por índice.** `objetivo.texto` debe aparecer **exactamente una vez** en la oración (lo comprueba el validador). Es la decisión que hace el schema escribible a mano por un filólogo: contar palabras es donde se cometen los errores silenciosos, y ya hay 55 ids desincronizados en el banco de compuestas por esa clase de fragilidad.
- **Listas cerradas:** `manipulacion` ∈ {`sustituye`, `suprime`, `cambia_numero`, `mueve`, `transforma`}; `funcion` ∈ `FUNC_ORAC` de `js/glosario/tags.js` (única fuente de verdad, ya usada por el validador actual); `causa` ∈ la tabla de §2.5; `marca` ∈ {`agramatical`, `norma_culta`, `zona_gris`}.
- **Anclaje de las pruebas por repertorio**, decisión ya tomada en el banco de reflexión: `prueba_id` apunta a `js/data/pruebas-sintaxis.js`, una entrada por función reutilizada en cualquier oración que la tenga. **Cero trabajo por reto.** Ese archivo se genera convirtiendo `Banco_reflexion_metalinguistica.md` en datos, con IDs estables (`PRU-SINT-SUJ-01`, `PRU-SINT-CD-01`, …, `HEUR-QUIEN`, `HEUR-PARA-QUIEN` para los heurísticos rechazados) y con el campo `enunciado_simple` que implementa la variante de 1.º-2.º ESO que el banco dejaba pendiente.
- **Validador**: nuevo modo del validador que ya existe. La semilla hablaba de «validador Python gemelo», pero en este repo el gemelo real es `scripts/validar-banco.mjs` (Node, sin dependencias, con sus listas cerradas ya sincronizadas con `tags.js`); no hay validador Python de bancos. Se añade el modo `laboratorio`:

  ```bash
  node scripts/validar-banco.mjs laboratorio banco_export/Laboratorio_Banco.tsv
  ```

  Comprueba: JSON parseable · `schema_version` conocida · `objetivo.texto` presente y único en su oración · funciones y causas en lista cerrada · `prueba_id` y distractores existentes en `pruebas-sintaxis.js` · exactamente una opción `ok: true` por ítem cerrado · toda opción con `micro` · todo juicio ✗ con `gemela_correcta` · al menos un control `gramatical` en retos con 3+ juicios · slots del análisis inverso cubiertos por las piezas ofrecidas · `fuente_id` con formato `PM-SINT-##`/`AI-SINT-##` · causa compatible con el nivel del reto (§2.5). Distingue ❌ ERROR de ⚠ AVISO, como el validador actual.
- **Josele valida el lote semilla completo antes de publicar**, igual que con los lotes de compuestas. El filtro de calidad es humano.

### 5.2 Reutilización directa (nada de esto se escribe de cero)

| Necesidad | Ya existe | Dónde |
|---|---|---|
| Arrastrar piezas a slots (análisis inverso, valencia) | motor `iidd*` de compuestas | `js/modules/compuestas/index.js` (extraer patrón, no importar el módulo) |
| Opciones con microexplicación y feedback escalonado | patrón del banco de reflexión + micro-lecciones | `js/feedback/*` (nuevo `micro-lecciones-lab.js`) |
| Cascada de decisión (valores de *se*) | cascadas de Maestro | `js/modules/maestro/index.js` |
| Distractores con reglas duras («para» nunca CI) | `GrammarRules.filterTraps` | `js/modules/sint/index.js:61` |
| Etiquetas y colores de función | `FUNC_ORAC`, `funcTagCss`, `tagContent` | `js/glosario/tags.js` |
| Login, perfil, grupo obligatorio | login compartido | `core/profile.js`, `handleStartAll` |
| XP, rachas, misiones, ZDP | gamificación completa | `js/gamification/*` |
| Examen con PIN | patrón de Simples y Compuestas | `Code_v6.gs` §examen |
| Analíticas silenciosas | patrón Chispa/Sintagmas (`sendBeacon`) | GAS `saveSesion*` |
| Errores por categoría → informe | `trackError` + informe Excel | `js/feedback/tracking.js`, `teacher/informe-excel.js` |
| Puente de vuelta desde Simples | contador de fallos por función | `taller_error_history` (localStorage) |

Lo genuinamente nuevo son tres cosas: el schema, el motor de estaciones con su bloqueo en orden, y `pruebas-sintaxis.js`. Todo lo demás es patrón ya probado en el repo.

### 5.3 Backend (GAS, siempre «Nueva versión»)

- `getRetosLaboratorio` (GET, filtros `nivel` / `curso` / `funcion`) · `createExamLaboratorio_` / `getExamConfigLaboratorio_` · `saveLaboratorioResult_` → hoja `Laboratorio_Resultados` (solo examen con PIN, como se separó en compuestas) · `saveSesionLaboratorio_` → hoja `Laboratorio_Practica_Log` (práctica libre, vía `sendBeacon`) · columnas `Reflexion` (diario), `Caja_Pruebas_JSON` y `Errores_Categoria_JSON`.
- **Ojo al desplegar:** el bug de `sendBeacon` en `doPost` que se tragó en silencio las analíticas de Chispa durante semanas ya está arreglado, pero cualquier endpoint nuevo que use `sendBeacon` debe verificarse **después** del redespliegue, no antes. Y el redespliegue es siempre «Nueva versión» de la implementación existente (regla 1 de `CLAUDE.md`).
- **De propina, un eje nuevo en el informe que no cuesta casi nada:** los errores del Laboratorio se categorizan por **manipulación fallada** (`sustituye` / `suprime` / `cambia_numero` / `mueve` / `transforma`), no solo por función. Eso responde al profesor una pregunta que hoy no puede hacer: *no* «qué función falla mi grupo» (eso ya lo sabe), sino «**qué prueba no sabe aplicar**». Se añade como sección de la hoja `Diagnóstico` existente, sin panel nuevo.

### 5.4 Modo examen

Aplicado desde el día 1 con las lecciones ya incorporadas al resto de la app:

- **Solo estaciones 2-3** (la 1 es de aprendizaje, semilla §4).
- **Curva dura de examen 100/40/10/0**, la misma del rediseño de calificación, frente a la de práctica 100/50/25/0.
- **El veredicto sin la causa no vale el ítem.** Un juicio acertado con la causa correcta puntúa 100; acertar «suena mal» pero fallar qué se rompe cae al tramo 40 de la curva. No hay atajo por adivinar: es la traducción a nota del principio «se evalúa la justificación, no el acierto».
- **Ponderación por rasgo discriminante** (misma lógica que la F9 de morfología y los pesos de `FUNC_WEIGHT`): los ítems que caen sobre una frontera pesan doble — Atr./CPvo, C.Rég./CC, CI/CC Finalidad, C.Ag./CC Causa, Marca.Pas.Ref./Marca.Imp. Los ítems de reconocimiento de CC básico pesan 1.
- **Sin pistas ni feedback hasta el final**, ítems en orden aleatorio por alumno, captura de errores por categoría para el Top ponderado del informe, anti-duplicado en el guardado.
- **Los ítems ⚖ de zona gris no entran en el examen** (solo en práctica): un ítem con dos respuestas válidas es indefendible ante una reclamación. Entran en la nota solo si el profesor activa la casilla correspondiente al crear el PIN, y entonces puntúan ambas respuestas.
- **Consecuencia de aula:** este examen **es** la parte razonada ⚓ digitalizada. El patrón de prueba de bloque del plan de integración pasa de «app (análisis) + 1-3 preguntas razonadas en papel» a «app (análisis en Simples) + app (razonamiento en Laboratorio)», dejando el papel para lo que la app sigue sin cubrir. Josele decide si suelta el papel del todo o mantiene una pregunta (§7.5).

---

## 6. Fases de construcción (resuelve el punto 5 de la semilla §5)

**Convención de modelo**, la misma del resto del proyecto: 🟣 **Opus** donde una decisión mal tomada se paga todo el curso (schema, canon lingüístico, corpus agramatical); 🟢 **Sonnet** para ejecución sobre un diseño ya cerrado. El criterio es *qué decisión se toma en esa sesión concreta*, no la fase entera.

| Fase | Sesión | Qué se hace | Modelo | Por qué |
|---|---|---|---|---|
| **F0** | 1 | **Schema `laboratorio v1.0`** de `Laboratorio_Banco` (tipos de ítem, listas cerradas, referencia por texto, `origen_oracion_id`) + modo `laboratorio` de `validar-banco.mjs` | 🟣 **Opus** | Es la arquitectura de datos de todo el módulo: si el schema queda cojo se repaga en cada lote. Mismo criterio con el que se fijó el schema 1.2 de compuestas |
| F0 | 2 | Hoja `Laboratorio_Banco` en el Sheet + endpoint `getRetosLaboratorio` | 🟢 Sonnet | Ejecución directa sobre `getOraciones` / `getOracionesCompuestas` |
| F0 | 3 | **Lote semilla `medio`** (~30 retos: sujeto/CD/CI/C.Rég./Atr./CPvo, importando los `PM-SINT` y `AI-SINT` de nivel `[3E]`) | 🟢 Sonnet → validado por Josele | Contenido sobre canon ya fijado; el filtro de calidad es humano. Se empieza por `medio` y no por `basico` porque el compromiso de aula más cercano es la sintaxis de 3.º ESO en la 2.ª evaluación, y porque el banco R-07 está curado sobre todo en `[3E]` |
| **F1** | 1-4 | Motor de estaciones 1-2: pantalla, bloqueo en orden, los cinco experimentos, juicios, pares mínimos, análisis inverso por slots, XP y analíticas silenciosas | 🟢 Sonnet | Reutiliza `iidd*`, `filterTraps`, gamificación y `sendBeacon`; sin decisiones de arquitectura nuevas |
| **F2** | 1 | **`js/data/pruebas-sintaxis.js`**: las 10 funciones del banco de reflexión con IDs estables, distractores, microexplicaciones y `enunciado_simple` (variante 1.º-2.º ESO) + **canon de aceptabilidad** del corpus agramatical (§2.5: qué es ✗, qué ⚠, qué ⚖) | 🟣 **Opus** | Contenido pedagógico de precisión: un distractor mal razonado enseña un error, y la frontera agramatical/norma es la decisión más delicada del módulo |
| F2 | 2-3 | Estación 3 (etiqueta + prueba, con su variante simplificada), Caja de Pruebas del Detective, diario metalingüístico, puentes con Simples en los dos sentidos | 🟢 Sonnet | UI sobre el banco de pruebas ya cerrado |
| **F3** | 1-2 | Examen PIN, `Laboratorio_Resultados`, eje «prueba fallada» en la hoja `Diagnóstico` | 🟢 Sonnet | Copia del patrón ya implementado en Simples y Compuestas |
| **F4** | 1 | Lote `basico` (~25 retos de 2.º ESO, sin una sola etiqueta) | 🟢 Sonnet → validado por Josele | Contenido sobre canon ya fijado |
| F4 | 2 | «Cazador de contraejemplos» + Cuaderno de Campo + misiones | 🟢 Sonnet | Mecánica nueva de bajo riesgo: la validación es por slots y causa declarada, no editorial |
| **F5** | 1 | **Valores de *se*** como investigación (cascada, corpus, criterios de clasificación) + ítems ⚖ de zona gris + periféricos y Mod.Or. | 🟣 **Opus** | El ítem más delicado del módulo y el de mayor rendimiento EBAU; la zona gris exige decidir qué se acepta y por qué |
| F5 | 2-3 | Lote `avanzado` + implementación de la cascada de *se* | 🟢 Sonnet | Ejecución sobre reglas ya fijadas |

**Total: ~14-16 sesiones de trabajo**, 3 de ellas 🟣 Opus (schema, banco de pruebas + canon agramatical, valores de *se*).

**Calendario honesto contra el curso 2026-27.** La sintaxis de 2.º, 3.º y 1.º BACH cae en la **2.ª evaluación**, así que hay más margen que con la Fábrica, pero el calendario ya está comprometido: los lotes de exámenes de simples son de **nov.-dic.** y la deuda del banco de compuestas más la auditoría «construcción» son de **ene.-feb.**, y ambos **mandan**.

| Cuándo | Qué | Encaje de aula |
|---|---|---|
| **Nov.-dic. 2026** | F0 (las 3 sesiones) | El lote semilla usa el mismo flujo docente→JSON que los lotes de examen de diciembre: se hacen en la misma tacada, no compiten |
| **Dic. 2026 – ene. 2027** | F1 | El motor de estaciones 1-2 no toca nada de Simples ni de Compuestas: puede avanzar en paralelo a la deuda del banco CP |
| **Ene. 2027** | F2 | 3.º ESO empieza `UD-D-3E-sint` en la 2.ª evaluación: el Laboratorio entra en sus **sesiones 2-3** como antesala, con las tres estaciones y sin nota |
| **Feb. 2027** | F3 | Examen PIN listo para la prueba de bloque de sintaxis de 3.º, que ya está comprometida en la programación → absorbe la parte ⚓ |
| **Marzo 2027** | F4 | 2.º ESO llega a «La escena del verbo»; el nivel `basico` estrena a tiempo |
| **Abril-mayo 2027** | F5 | 1.º BACH en la 3.ª evaluación; los valores de *se* como preparación EBAU |

**Si hay conflicto de tiempo, el Laboratorio se pausa tras F1** (igual que la Fábrica se pausa tras F3). Consecuencia concreta y aceptable: 3.º ESO usaría solo las estaciones 1-2, sin estación 3 ni examen — sigue siendo la antesala útil de su unidad, simplemente sin nota y con la parte ⚓ todavía en papel.

**Consecuencia sobre el plan de integración app↔aula:** cuando F1-F2 estén desplegadas, deja de ser cierto que «la app solo entra después de la fase de etiqueta». Hay que actualizar entonces `Plan-integracion_app-taller-sintaxis.md` §3 (regla de estreno) y §§4.2-4.5, donde cada unidad de sintaxis gana una entrada 📲 temprana. **La regla que no cambia:** la app nunca abre un concepto — la pregunta-problema oral de la fase 1 sigue siendo de la sesión 1 en el aula, y el Laboratorio entra en la 2 o la 3.

---

## 7. Riesgos y decisiones que solo puede tomar Josele (resuelve el punto 6 de la semilla §5)

| # | Decisión / riesgo | Propuesta del plan |
|---|---|---|
| 1 | **Canon de aceptabilidad de los juicios**: ¿qué «suena raro» cuenta como agramatical? | Tres marcas explícitas y disjuntas (§2.5): ✗ agramatical (error de comprensión, con asterisco), ⚠ norma culta (sin asterisco, se pregunta por el registro), ⚖ zona gris (dos respuestas puntúan). Todo lo dialectal o de origen social queda **fuera del corpus**. Josele cierra la lista de causas y su nivel mínimo en la sesión 🟣 de F2 |
| 2 | **Validación del lote semilla** | Los ~30 retos de `medio` se validan enteros antes de publicar (1 sesión suya), como con los lotes de compuestas. El validador (§5.1) le llega ya pasado: solo juzga contenido, no formato |
| 3 | **Colisión de portada** | Agrupar las tres cards de oración en un bloque «Oraciones» (Laboratorio · Simples · Compuestas). Alternativa si se ve cargado: el Laboratorio como card destacada de temporada, visible solo mientras la unidad de sintaxis está en curso |
| 4 | **Riesgo de sustituir el descubrimiento del aula** | La estación 1 es *observación de corpus* (fase 2), no la pregunta-problema (fase 1). Regla escrita: el Laboratorio nunca abre la unidad; entra en la sesión 2-3, después del arranque oral. Es la misma regla que ya rige para el resto de módulos |
| 5 | **¿Se suelta el papel de la parte razonada ⚓?** | Propuesta: mantener **una** pregunta en papel el primer curso (2026-27) y comparar sus resultados con los del examen del Laboratorio. Si correlacionan, el papel se retira en 2027-28. Cambiar de instrumento de evaluación sin ese contraste es asumir un riesgo que no hace falta asumir |
| 6 | **Alcance** (la tentación de meter análisis completo, sintagmas o subordinación) | Catálogo de ítems cerrado (§2); lo que no está ahí no entra en v1. El límite duro es el puente a Simples: si un ítem requiere analizar la oración entera, es de Simples |
| 7 | **Reutilización del banco R-07 por ID** | El contenido se referencia (`fuente_id`), no se copia: si el banco de Lengua corrige un par mínimo, el reto no queda desincronizado en silencio. Coste: el enunciado sí se escribe en el JSON (el banco R-07 solo guarda punteros, no texto íntegro) — así que la sincronía es de *criterio*, no automática |
| 8 | **Orden de prioridad** | Los lotes de exámenes de diciembre y la deuda del banco de compuestas de ene-feb **mandan**. La Fábrica va delante (su unidad de aula es de la 1.ª evaluación); el Laboratorio arranca cuando la Fábrica llega a F3 |

---

## 8. Por qué esta propuesta gana (resumen para decidir)

1. **Rompe el techo estructural de la app.** Hoy la app no puede entrar hasta que el aula ha terminado de etiquetar. El Laboratorio la mete en la sesión 2 de cada unidad de sintaxis, en los cuatro cursos donde hay sintaxis. Es el cambio de encaje con el aula más grande que puede hacer un módulo nuevo.
2. **Digitaliza la parte razonada ⚓, que es la que el proyecto dice que más importa.** El plan de integración lleva el «¿cómo lo sabes?» obligatoriamente en papel porque ningún modo lo captura de forma autocorregible. La estación 3 lo captura, y con curva de examen y ponderación discriminante.
3. **Es el módulo más barato en contenido de todos los planificados.** La estación 3 ya está escrita (`Banco_reflexion_metalinguistica.md`: 10 funciones con prueba, distractores razonados y matriz de vecinos); los ítems de par mínimo y análisis inverso ya están curados y marcados por nivel (58 + 16 en el banco R-07, validados por el docente); el solucionario de las manipulaciones sale de las ~450 oraciones ya analizadas de `Oraciones_Banco`. Se escribe el motor, no el contenido.
4. **Reutiliza ~80 % de infraestructura existente** (arrastrar piezas, cascadas, `filterTraps`, examen PIN, gamificación, analíticas, informes). Lo genuinamente nuevo son el schema, el motor de estaciones y `pruebas-sintaxis.js`.
5. **Cierra tres pendientes de una tacada**: la variante de 1.º-2.º ESO del banco de reflexión, que el propio banco dejaba anotada como no implementada (§2.3, ítem 3.2); un eje de informe que el profesor no tiene hoy —qué **prueba** no sabe aplicar su grupo, no qué función falla (§5.3)—; y el retro-porte del patrón de tres estaciones que el plan de la Fábrica dejaba apuntado como camino abierto («una futura estación *¿cuántos actores pide este verbo?* antes de la fase 1 de Simples»): aquí está, y sin tocar Simples.
6. **Diferencial de mercado real.** Hay apps que corrigen análisis sintácticos. No hay ninguna en español que haga *juicios de gramaticalidad con causa razonada*, pares mínimos y análisis inverso validado por piezas, con registro por prueba fallada. Junto con la Fábrica, es la pareja de piezas que convierte la app de «corrector de análisis» en «entrenador de razonamiento gramatical» — que es exactamente el lenguaje del currículo LOMLOE y el que da peso a la conversación con la Consejería y las editoriales.

---

*Plan de producto «El Laboratorio de Oraciones» · v1.0 (jul-2026) · Propuesta pendiente de decisión de Josele. Gemelo sintáctico de `Fabrica_Palabras_Plan_Producto.md`. Relacionado: `Laboratorio_Oraciones_Semilla.md` (decisiones cerradas), `Banco_reflexion_metalinguistica.md` (la estación 3), `roadmap.md`; del proyecto de Lengua: `documentos_base/marco_teorico_didactico.md`, `documentos_base/Plan-integracion_app-taller-sintaxis.md`, `documentos_base/Calendario-operativo_app-taller-sintaxis_2026-27.md`, `bancos_ejercicios/pares_minimos/` (banco R-07). Terminología NGLE del proyecto en todo el módulo: sintagma (nunca «grupo»), oración y O1/O2/O3 (nunca «proposición» ni P1/P2/P3), «para» nunca introduce CI, heurísticos de pregunta solo como distractores; niveles `basico`/`medio`/`avanzado` ↔ Aprendiz/ESO34/Maestro.*
