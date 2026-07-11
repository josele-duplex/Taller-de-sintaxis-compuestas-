# Propuesta · Los tres niveles del modo Morfología

**Fecha:** 2026-07-11 · **Estado:** propuesta pedagógica para revisión de Josele — SIN
evaluación ni ponderación (eso viene después, en el plan de implementación).
**Encargo:** reestructurar el modo Morfología en tres niveles de profundidad coherentes
con el currículo real de ESO y Bachillerato y con lo que la PAU pide de verdad, al nivel
de madurez que ya tienen los módulos de sintaxis.

## 0. Fuentes utilizadas

1. **Modelo PAU** («Nos preparamos (modelo PAU)», tema *La reflexión morfológica* del
   libro de 1.º Bach, `proyecto_plan_de_trabajo_lengua/.../1ºBACH_La_reflexion_morfologica.md`).
   La pregunta de morfología de la PAU (4b) es: *«Analiza cómo están formadas las
   siguientes palabras, indicando para cada una sus constituyentes y procedimiento
   empleado»* — es decir, **formación de palabras**, no análisis exhaustivo de atributos.
   En el análisis sintáctico (4a) las categorías se nombran con economía («sustantivo»,
   sin género ni número).
2. **Tema completo de 1.º Bach** (mismo archivo): clases de palabras con sus
   *límites entre categorías* (nombre/adjetivo, determinante/pronombre,
   relacional/calificativo, perífrasis, locuciones) — el corazón de lo que se
   discrimina en Bachillerato.
3. **Referencia de Morfología y Sintaxis** del proyecto de aula (síntesis 1.º ESO–1.º Bach).
4. **Índices del libro por curso**: 1.º ESO recorre todas las categorías con atributos
   básicos (sustantivo/adjetivo → determinantes/pronombres → verbo → invariables);
   3.º ESO consolida con *clases de palabras + locuciones + sintagmas*.
5. **Estado actual de la app** (`js/modules/maestro/index.js`): tres niveles
   `aprendiz` (solo categoría), `eso34` (subconjunto), `maestro` (cascada completa).

> **Nota de honestidad:** Josele mencionó un «documento PAU» específico. No se ha
> encontrado como archivo aparte; la propuesta se basa en el modelo PAU del libro (fuente 1)
> y en su directriz explícita («la PAU solo pide identificar el sustantivo, sin más
> atributos»). Si existe ese documento oficial, conviene contrastarlo antes de implementar
> el Nivel 3.

## 1. Principio rector: tres verbos, tres momentos del currículo

Cada nivel responde a una operación cognitiva distinta, alineada con un tramo del currículo:

| Nivel | Operación | Tramo | Pregunta típica |
|---|---|---|---|
| **N1 · Categorías** | **Identificar** | 1.º–2.º ESO | «¿Qué clase de palabra es?» |
| **N2 · Análisis** | **Analizar** | 3.º–4.º ESO | «Di todo lo que sabes de esta palabra» |
| **N3 · PAU** | **Discriminar** | Bachillerato | «¿*Que* es conjunción o relativo? ¿Cómo está formada *geolocalización*?» |

La clave del N3 (donde había más dudas… en realidad el N2, ver §3) es que **no es un
N2 con más pasos, sino un nivel con MENOS pasos y mejor elegidos**: la PAU da por
sabida la flexión (género, número, persona) y pregunta justo lo que distingue a un
alumno maduro — los casos frontera, las perífrasis y la formación de palabras.

**El banco no cambia.** Los tokens ya llevan todos los atributos (nivel maestro actual);
cada nivel es una *vista* que pregunta un subconjunto. Las únicas adiciones son atributos
opcionales nuevos (formación de palabras, perífrasis pasiva) que se etiquetan
progresivamente sin romper nada.

## 2. Nivel 1 · Categorías (1.º–2.º ESO) — se mantiene, con un ajuste de inventario

Como ahora: el alumno solo indica la **categoría** de cada palabra. Sin cascadas.

**Único cambio propuesto — el inventario visible.** Hoy el N1 ofrece las etiquetas finas
del banco (Artículo, Demostrativo, Posesivo, Cuantificador, Relativo…). El libro de
1.º ESO enseña **9 clases**: sustantivo, adjetivo, determinante, pronombre, verbo,
adverbio, preposición, conjunción, interjección. Propuesta: en N1 el alumno elige entre
esas 9 (más Puntuación), y la app traduce internamente:

| Etiqueta del banco | En N1 el alumno responde… |
|---|---|
| Artículo | Determinante |
| Demostrativo / Posesivo / Cuantificador / Interr.-Excl. con `función: determinante` (o `adjetivo`) | Determinante |
| Ídem con `función: pronombre` | Pronombre |
| Pronombre personal | Pronombre |
| Relativo (`función: pronombre/determinante`) | Pronombre / Determinante |
| Relativo (`función: adverbio`) | Adverbio |
| Conector discursivo, Marca.Imp., Marca.Pas.Ref. | **No aparecen**: los textos de N1 se seleccionan sin estos fenómenos |

Ventaja pedagógica: un alumno de 1.º ESO no debe distinguir «cuantificador» de
«artículo» — debe consolidar la muralla determinante/pronombre, que es exactamente lo
que su libro le pide. La distinción fina llega en N2 de forma natural.

## 3. Nivel 2 · Análisis (3.º–4.º ESO) — el puente, categoría a categoría

Es el nivel del «análisis completo de toda la vida»: el que se pide en los ejercicios de
la ESO y el que en 2.º Bach «se da por sabido». Parte del `eso34` actual con estas
correcciones y adiciones (cada una justificada):

| Categoría | Pasos del N2 | Cambios vs. `eso34` actual |
|---|---|---|
| **Sustantivo** | común/propio → contable/no contable → individual/colectivo → concreto/abstracto → género → número | Ninguno (ya estaba completo, y es correcto: es EL contenido de la ESO) |
| **Adjetivo** | **clase (calificativo/relacional)** → género → número → grado *(solo si calificativo)* | ➊ AÑADIR clase: hoy `eso34` no la pregunta, pero pide *grado* a todos los adjetivos — **incoherencia actual**: los relacionales no tienen grado (NGLE; el propio libro lo subraya). La clase se enseña en 3.º-4.º ESO y arregla la cascada |
| **Artículo** | determinado/indeterminado → género (con **neutro *lo***) → número → **contracta (al/del)** | ➋ AÑADIR neutro y contracta: contenido de la ESO, y el banco ya lo etiqueta (`forma: contracta`) |
| **Pronombre personal** | persona → número → tónico/átono | Ninguno |
| **Demostrativo** | función (det./pron.) → **cercanía (este/ese/aquel)** → género (con neutro) → número | ➌ AÑADIR cercanía: contenido de 1.º-3.º ESO, coste bajísimo (se lee en la palabra) y refuerza la deixis |
| **Posesivo** | función (det./adj.) → persona → **un/varios poseedores** → número | ➍ AÑADIR poseedores: distinción clásica de la ESO (*mi/nuestro*) que hoy solo pregunta el nivel maestro |
| **Cuantificador** | tipo (numeral/indefinido) → subclase → función sintáctica | Ninguno (género/número se omiten a propósito: poco informativos aquí) |
| **Relativo** | función (pronombre/determinante/adverbio) | ➎ AÑADIR: hoy `eso34` no tiene cascada (cae a solo-categoría). La función del relativo se enseña en 4.º ESO y prepara las compuestas |
| **Interr./Exclamativo** | tipo (interr./excl.) → función (det./pron./adv.) | ➏ AÑADIR (hoy sin cascada): mismo argumento |
| **Verbo** | perífrasis (¿sí/no? → tipo) → conjugación → persona → número → tiempo → modo → **aspecto** | ➐ AÑADIR aspecto (contenido de 4.º ESO, presente en la Referencia del proyecto de aula). ➑ ELIMINAR el paso *voz* tal como existe en maestro (solo tiene la opción «activa»: no discrimina nada). La pasiva se trata como perífrasis, ver ➒ |
| **Adverbio** | tipo semántico | Ninguno |
| **Preposición** | simple / locución prepositiva | Ninguno |
| **Conjunción** | coordinante/subordinante → clase | Ninguno |
| **Conector discursivo** | tipo (aditivo, contraste, consecutivo…) | Ninguno (es contenido de cohesión de 4.º ESO) |
| **Interjección** | propia/impropia → expresiva/apelativa | Ninguno |
| **Marca.Imp. / Marca.Pas.Ref.** | reconocimiento de la marca | Ninguno — coherencia directa con el módulo de Sintaxis |

➒ **Adición transversal (N2 y N3): perífrasis pasiva.** La cascada actual de perífrasis
no contempla *ser + participio* (pasiva perifrástica). Es una laguna de coherencia con
el módulo de Sintaxis, donde la pasiva y el C. Agente son centrales. Se añade como
opción del tipo de perífrasis. *(Requiere revisar el etiquetado de los textos del banco
que contengan pasivas.)*

## 4. Nivel 3 · PAU (Bachillerato) — economía y discriminación

Redefinición completa del actual `maestro`. Regla de oro (directriz de Josele +
modelo PAU): **si la PAU lo da por sabido, no se pregunta**. Fuera género, número,
persona, conjugación, aspecto. Se pregunta solo lo que un corrector de PAU espera que
el alumno sepa *distinguir*:

| Categoría | Pasos del N3 | Por qué esto y no más |
|---|---|---|
| **Sustantivo** | *(solo categoría)* | Ejemplo literal de Josele: la PAU pide «sustantivo» y punto |
| **Adjetivo** | clase (calificativo/relacional) | Distinción viva en Bachillerato: alimenta la pregunta de *marcas de subjetividad* (los valorativos) del comentario PAU |
| **Artículo** | *(solo categoría)* | Nada que discriminar a este nivel |
| **Pronombre personal** | *(solo categoría)* | Su función sintáctica (CD/CI) pertenece al módulo de Sintaxis — no duplicar |
| **Demostrativo / Posesivo / Cuantificador** | función (det./pron./adj.) | LA confusión clásica que la PAU sí penaliza; el resto (cercanía, poseedores…) se da por sabido |
| **Relativo** | función (pron./det./adv.) | El caso estrella *que* relativo vs. *que* conjunción se juega ya al elegir la categoría; la función completa el cuadro |
| **Interr./Exclamativo** | función (det./pron./adv.) | Ídem (cómo/como, qué/que) |
| **Verbo** | perífrasis (¿sí/no? → clase completa, **incluida pasiva**) → forma (personal / infinitivo / gerundio / participio) → tiempo y modo | Las perífrasis son EL contenido verbal de Bachillerato (un solo núcleo → afecta al análisis sintáctico de 4a). Tiempo y modo se mantienen porque el comentario PAU los usa (subjuntivo/condicional como marcas de subjetividad) |
| **Adverbio** | tipo semántico | Barato y útil (los -mente enlazan con formación y subjetividad) |
| **Preposición** | simple / locución prepositiva | Las locuciones son contenido explícito de 3.º ESO a PAU |
| **Conjunción** | coordinante/subordinante → clase | Núcleo de la pregunta 4a-opción 2 (relaciones entre oraciones) — coherencia total con el módulo de Compuestas |
| **Conector discursivo** | tipo | Alimenta la pregunta 2 de la PAU (mecanismos de cohesión) |
| **Marcas (se)** | reconocimiento | Coherencia con Sintaxis (pasiva refleja / impersonal) |
| **⭐ Formación de palabras** *(transversal, nuevo)* | procedimiento: simple / derivada / compuesta / parasintética *(extensible: sigla, acrónimo, préstamo)* | **Es la pregunta de morfología real de la PAU (4b)**. Se propone como paso adicional SOLO en tokens etiquetados con el atributo nuevo `formacion` (etiquetado progresivo del banco: se empieza por las palabras jugosas de cada texto — *hiperconsumismo, geolocalización…*) |

**Fase futura (fuera de este alcance):** la segmentación completa en constituyentes
(raíz, prefijos, sufijos, morfemas flexivos) que pide la PAU exige otro tipo de
ejercicio (marcar segmentos dentro de la palabra), no una cascada de opciones. Se
propone como módulo/ejercicio aparte más adelante; el paso «procedimiento» del N3 ya
cubre la mitad de la pregunta 4b con la mecánica actual.

## 5. Los textos también escalan

Los tres niveles no se distinguen solo por las preguntas, sino por los textos:

- **N1**: oraciones/textos sin relativos, sin conectores discursivos, sin *se* pasivo o
  impersonal, sin perífrasis rebuscadas. (Los textos actuales de nivel básico sirven.)
- **N2**: textos con el repertorio ESO completo (perífrasis modales y aspectuales,
  relativos, conectores).
- **N3**: textos tipo PAU (editoriales, ensayo divulgativo) **ricos en casos frontera**:
  *que* conjunción vs. relativo, *como/cómo*, *se* en sus valores, perífrasis pasivas y
  de probabilidad, adjetivos relacionales vs. calificativos, y palabras derivadas o
  compuestas jugosas etiquetadas con `formacion`.

## 6. Resumen de cambios respecto al código actual

| | Se mantiene | Se corrige | Se añade | Se elimina |
|---|---|---|---|---|
| **N1** (`aprendiz`) | Mecánica solo-categoría | — | Inventario reducido a las 9 clases + traducción interna | Etiquetas finas visibles |
| **N2** (`eso34`) | La mayoría de cascadas | Grado solo a calificativos (➊) | Clase del adjetivo, neutro/contracta, cercanía, poseedores, Relativo, Interr./Excl., aspecto, perífrasis pasiva | — |
| **N3** (`maestro` → **PAU**) | Perífrasis (ampliada), tiempo/modo, conjunciones, conectores | Filosofía: de «todo» a «lo que discrimina» | Paso de formación de palabras (atributo opcional del banco) | Género/número/persona/ conjugación/aspecto/voz, subclases del sustantivo, grados, cercanía, poseedores… |

**Nombres propuestos en la interfaz** (los actuales Aprendiz/ESO34/Maestro dejan de
describir bien el N3): **«Categorías (1.º–2.º ESO)» · «Análisis (3.º–4.º ESO)» ·
«PAU (Bachillerato)»**. Internamente pueden conservarse las claves `aprendiz/eso34/maestro`
para no tocar el backend.

## 7. Preguntas abiertas para Josele (decidir antes de implementar)

1. **N1, inventario reducido**: ¿de acuerdo con que el alumno de 1.º-2.º ESO responda
   «Determinante»/«Pronombre» genéricos (la app traduce), o prefieres mantener las
   etiquetas finas actuales también en N1?
2. **Posesivo pospuesto en N1** (*el libro mío*): con el inventario reducido, ¿lo
   mapeamos a «Determinante» (simplificación asumible) o a «Adjetivo» (más NGLE pero
   más confuso en 1.º ESO)?
3. **N2, aspecto verbal**: ¿lo incluimos (contenido de 4.º ESO) o lo dejamos fuera
   para no alargar la cascada del verbo, ya de por sí la más larga?
4. **N3, formación de palabras**: ¿confirmas el enfoque de atributo opcional
   (`formacion`) con etiquetado progresivo del banco? Implica que al principio pocos
   tokens tendrán la pregunta, e irá creciendo texto a texto.
5. **¿Un cuarto uso, «repaso 2.º Bach»?** No se propone un nivel 4: el N3 ya ES el de
   2.º Bach. Pero si algún grupo tuyo necesitara re-practicar flexión en Bachillerato,
   siempre puede bajarse a N2 — conviene decirlo en el manual del profesor.

## 8. Encaje técnico (nota breve, sin evaluación)

- Los tres niveles son **vistas sobre el mismo banco**: `getCascadeForNivel(cat, nivel)`
  ya existe y solo cambia qué subconjunto de pasos devuelve. Sin migración de datos.
- Adiciones al banco: atributo opcional `formacion` en tokens seleccionados; opción
  `pasiva` en perífrasis (revisar textos con pasivas); los textos nuevos de N3 se
  añaden por la vía normal (`Morfologia_Textos`).
- El mapeo N1 (etiqueta fina → clase genérica) es una función pura de
  `(cat, atrs.función)` — pequeña y sin efectos sobre N2/N3.
- **Todo lo relativo a puntuación/ponderación queda explícitamente fuera** de este
  documento; se abordará cuando Josele valide los contenidos (siguiente fase, con el
  plan de implementación para Sonnet).
