# Auditoría de la Fábrica de Palabras como módulo de morfología autorreflexiva — agosto 2026

**Fuente auditada:** «Auditoría fábrica de palabras. Morfología.md» (Descargas, 2026-08-26), informe externo de 30 apartados sobre el banco de la Fábrica.
**Contrastado con:** los 98 retos reales (`docs/lotes/Formacion_Banco_*.tsv`), el schema (`docs/Schema_Formacion_v1.0.md`, incluidas las ampliaciones v1.1 §12 y v1.2 §13), el repertorio de pruebas (`js/data/pruebas-morfologia.js`) y el motor (`js/modules/fabrica/index.js`).
**Continúa:** `docs/Plan_Revision_Fabrica_2026-08.md` (revisión del lote 1 y auditoría del Excel V2, del 2026-08-10).

Este documento es la referencia de la segunda revisión: qué del informe externo se acepta, qué se rebaja, qué se descarta y con qué datos se decide. De aquí sale el lote 3.

---

## 1. Verificación previa: los datos del informe son exactos

Antes de discutir el diagnóstico hay que saber si quien lo escribió leyó el banco de verdad. Lo leyó. El recuento de ítems coincide hasta la unidad:

| Tipo | Nº | | Tipo | Nº |
|---|---|---|---|---|
| `piezas` | 106 | | `agrupa` | 40 |
| `juicio` | 73 | | `par_minimo` | 18 |
| `intruso` | 69 | | `monta` | 16 |
| `clasifica_prueba` | 64 | | `frontera` | 9 |
| `cascada` | 44 | | `cadena` | 7 |

**98 retos · 446 ítems · media de 4,55 ítems por reto.** Dentro de `piezas`: 42 `cortar`, 50 `etiquetar`, 14 `capas`.

Que los números cuadren no valida el diagnóstico, pero obliga a tomarse el informe en serio: no es una impresión general, es una lectura del corpus.

---

## 2. El diagnóstico del informe, y en qué se equivoca

**Su tesis:** el banco enseña más a *reconstruir* («aquí está la palabra, descubre cómo está formada») que a *razonar sobre la reconstrucción* («aquí hay varias explicaciones, ¿qué evidencia decide entre ellas?»). Propone construir el equivalente morfológico del experimento sintáctico y organizar el módulo en cinco familias cognitivas, la quinta de las cuales —INVESTIGAR— estaría «ausente».

**La dirección es correcta. El diagnóstico de lo que falta, no.** El informe leyó los TSV y el schema, pero no leyó ni `js/data/pruebas-morfologia.js` ni el §12 del schema. Ese equivalente morfológico ya está escrito y aprobado:

- **El repertorio de pruebas** (`PRUEBAS_MORFOLOGIA`): 15 pruebas ancladas a procedimiento o transversales (`PRU-MORF-INTERM-01` «¿existe la forma intermedia?», `PRU-MORF-FAMILIA-01` «comparten raíz **y** significado de base», `PRU-MORF-NUEVA-01` derivativo/flexivo) y **5 heurísticos rechazados** (`HEUR-LONGITUD`, `HEUR-MAYUSCULAS`, `HEUR-PARECIDO`, `HEUR-DOS-PARTES`, `HEUR-MEMORIA`), que solo pueden aparecer como distractores —el validador da ERROR si uno se cuela como respuesta— y cada uno con su contraejemplo redactado.
- **La matriz de vecinos confundibles** (`PARES_DISCRIMINANTES`): el distractor por defecto de un `clasifica_prueba` no es una opción al azar, es el vecino que de verdad se confunde más el heurístico que más tienta.
- **El canon §12**: la escalera de tres pruebas en orden fijo (P1 forma intermedia → P2 significado construido sobre esa base → P3 selección categorial del afijo) con **regla de salida** explícita: si tras las tres siguen vivos dos análisis con significados distintos y ambos en uso, *no hay respuesta correcta* y el caso va a `frontera`, nunca a `capas`.

Conclusión que cambia las prioridades: **no falta filosofía ni infraestructura, falta contenido que las use.** No hay que abrir el motor; hay que escribir retos.

---

## 3. Lo que se acepta: las cuatro líneas del lote 3

### 3.1 «Posible» no es lo mismo que «inexistente» (informe §19-20) — ACEPTADA, es la idea nueva

Hoy el banco funciona de hecho con un juicio binario: la forma existe o está mal formada. Falta el tercer escalón, que es donde vive la **productividad morfológica**: *desrobotizar* no está en el diccionario y cualquier hablante la entiende y la aceptaría; *\*panidad* no. La distinción tiene cinco grados en el informe; al alumno le bastan tres: documentada / posible aunque no acuñada / imposible por restricción del sistema.

Coste: el veredicto `dudosa` (⚖) **ya existe** en el schema §3.7. Falta una causa nueva en la lista cerrada de §6, del tipo `no_lexicalizada` (veredicto `dudosa`, nivel `avanzado`). Es medio cambio de dato y ninguno de motor.

Precaución que el propio informe señala y hay que respetar: no identificar «no aparece en el diccionario» con «imposible». Es exactamente el matiz que la revisión de agosto ya aplicó a *\*blandar* («no funciona como paso intermedio», no «no existe» a secas).

### 3.2 El efecto de cada capa (informe §12-13) — ACEPTADA, pero sin el campo nuevo

«¿Qué hace `-al`? ¿Qué hace `-izar`? ¿Qué hace `-ción`?». Pasar de identificar piezas a **atribuir una función a cada operación** es el mismo salto que en sintaxis va de reconocer sintagmas a asignar funciones, y conecta con lo que el alumno necesita en EBAU: el cambio de categoría.

**Se rechaza el campo de metadatos `efecto_formativo`** que propone el informe. No hace falta: `par_minimo` ya pregunta «¿nueva o la misma?» con `opciones` de texto libre y `micro` en cada lado (schema §3.5). Basta con redactar esas opciones en términos de efecto —«crea un nombre de oficio» frente a «solo dice cuántos hay»— para tener la idea entera con cero cambios de motor. Es el mismo criterio con el que en agosto se descartó el bloque `calidad_didactica`: no se añaden campos que nadie consume todavía.

De paso resuelve la petición del informe de hacer crecer `par_minimo` (§14), que hoy tiene 18 ítems.

### 3.3 Parecido formal ≠ parentesco morfológico (informe §8) — ACEPTADA, es contenido puro

El ejemplo *mar / marítimo / marea / marejada / **matrimonio** / marinero* es excelente y da para un reto entero. La munición ya está en el banco: `HEUR-PARECIDO`, la prueba `PRU-MORF-FAMILIA-01` con su doble condición, y la causa `familia_falsa`.

Y sin embargo **hay un solo juicio con causa `familia_falsa` en 98 retos**. Es la mina peor explotada del banco. Nota de contenido ya registrada: *hechizo* **sí** es de la familia de *hacer*, así que no vale como intruso de esa familia (ver `Plan_Revision_Fabrica_2026-08.md` §5, Fase C).

### 3.4 Siglas y préstamos como morfología, no como ortografía (informe §22-23) — ACEPTADA

Es el apartado más fino del informe y señala un desequilibrio real: ese bloque hoy funciona como una lección de ortografía léxica. La pregunta que lo devuelve a la morfología es **¿cuándo una forma creada por reducción empieza a comportarse como una palabra ordinaria?**, y la prueba es que **acepta morfemas**: *ONG* no admite plural, *radar* sí (*radares*), *wifi* hace *wifis*, *tuit* ya da *tuitear* y *tuitero*.

En préstamos, la misma vuelta de tuerca: no «¿cuál es la forma correcta?» sino «¿qué ha tenido que cambiar esta palabra para entrar en el sistema del español?» (grafía, acentuación, plural, capacidad de derivar). Se codifica con `cascada` + `conclusion` y con `juicio`, que es lo que ya se decidió en agosto para no ampliar la lista cerrada de procedimientos.

### 3.5 Añadido nuestro: la «base inmediata» merece nombre propio (informe §16-17)

El informe pide convertirla en concepto transversal. Ya lo es —es el eje del canon §12— pero es **implícita**: el alumno la practica sin que nadie se la nombre. Ponerle nombre en la Mesa de Herramientas cuesta poco y le da una palabra con la que pensar. No es un tipo de ítem nuevo: es una entrada de repertorio.

---

## 4. Lo que se rebaja: la tabla de diez modelos nuevos (informe §29)

El informe propone 10 modelos nuevos y ~68 actividades. Cada tipo de ítem nuevo son cuatro cosas, no una: dibujante en el motor, regla en el validador, sección de schema y documentación. Al cruzarlos con lo que ya existe, **siete son ropa nueva sobre un cuerpo que ya está**:

| Modelo propuesto | Qué es en realidad |
|---|---|
| prueba de formación | `cascada` con `conclusion` + `clasifica_prueba` — **existe** |
| árbol de capas | `piezas`·`capas` — **existe** (14 ítems) |
| elige entre dos análisis | `frontera` — **existe** (9 ítems) |
| descarta una hipótesis | `capas.alternativa_rechazada` — **existe**, obligatoria de facto en `capas` |
| ambigüedad morfológica | `frontera` + causa `doble_analisis` — **existe**; un tipo aparte fragmentaría el banco |
| contraejemplo morfológico | los `HEUR-*` y su explicación — **existe** |
| construcción inversa | `monta` — **existe** |
| base inmediata | opción múltiple; cabe en `par_minimo` o en un tipo pequeño futuro |
| efecto de cada capa | `par_minimo` con las opciones reescritas — **sin motor nuevo** (§3.2) |
| palabra posible / imposible | `juicio` + veredicto `dudosa` + causa nueva — **cambio mínimo de dato** (§3.1) |

**Saldo:** de las ~68 actividades propuestas, unas 55 se pueden escribir hoy sin tocar una línea de JavaScript. Las tres ideas que sí piden algo son cambios de dato, no de motor. Se mantiene la decisión de agosto (§7 del plan anterior): **no engordar el motor**.

---

## 5. Tres cosas del informe que no se heredan

**1. El árbol de *desagradablemente* (§11) está mal planteado.** Propone elegir entre `agrado → agradable → desagradable → desagradablemente` y `agrado → agradablemente → ✗desagradablemente`. La segunda no es un análisis rival: es un espantapájaros, porque *-mente* se une siempre a un adjetivo y *desagradablemente* no puede salir de un adverbio. Un ítem así entrena a descartar por descarte. El rival auténtico es `des- + agradable` frente a `desagradable + -mente`, y ahí la respuesta es única — por eso ese caso ya se reconvirtió a `capas` en la revisión de agosto. Es el error que el canon §12.2 previene expresamente: **presentar como ambiguo lo que no lo es** es peor que no preguntarlo.

**2. La advertencia sobre la parasíntesis (§6) es válida, y el banco le da la razón con datos.** El canon evita la receta en teoría (P1 es solo la primera de tres pruebas), pero en el contenido real **20 de los 73 juicios —más de uno de cada cuatro— llevan la causa `parasintesis_incompleta`**. El alumno que juega mucho aprende, con razón estadística, que la respuesta suele ser «parasíntesis». Ese desequilibrio se compensa en el lote 3 escribiendo otras causas, no reescribiendo la prueba.

**3. Las citas a la RAE están sin referencia.** El informe invoca dos veces a la RAE (la definición de parasíntesis; el estudio de la creación léxica ocasional) sin sección localizable. Los documentos internos del proyecto sí citan (NGLE, UD, `docs/fuentes/`). Ninguna de esas afirmaciones puede pasar a un texto visible al alumno sin anclarla antes.

---

## 6. Lo que el informe no vio (sale de contar el banco)

- **El desequilibrio grave no es de tipos de ítem, sino de procedimientos.** `derivada` aparece en 33 retos; `parasintetica` en 12; `compuesta_lexica` en 8; y en el otro extremo `compuesta_culta` 3, `acronimo` 3, `numeronimo` 3, `abreviatura` 1, `acortamiento` 1. Doce procedimientos, y la mitad del banco gira sobre uno. El informe pide más `cadena` y más `par_minimo` —razonable—, pero el hueco mayor está en esta otra dimensión.
- **`interfijo` se etiqueta una sola vez en 98 retos** (y `vocal_cierre`, 4; `elemento_culto`, 5). Son las piezas que más discusión dan en clase y están casi ausentes.
- **13 filas del lote 2 tienen la columna `Zona_Gris` vacía** (las 85 anteriores dicen TRUE o FALSE). No rompe nada —el motor lee la bandera del JSON— y el validador no lo caza, porque solo comprueba el caso contrario (columna TRUE con JSON que no lo es). Conviene rellenarlas a FALSE antes de que alguien filtre por esa columna. Es el único defecto material encontrado en el banco.

---

## 7. La regla de metalenguaje, a propósito de la nota inicial de Josele

Josele abre el informe defendiendo que «prefijo» y «sufijo» son legítimos en ciertas situaciones, porque el alumno los trae de cursos anteriores. **La app ya le da la razón**, y conviene que quede escrito para no volver sobre ello:

- El alumno de `basico` **pulsa botones que dicen «prefijo», «raíz», «sufijo», «flexivo»** desde el primer reto: son las etiquetas de `piezas`·`etiquetar` (`ETIQUETAS_POR_NIVEL.basico` en el motor). Hay 51 usos de «prefijo»/«sufijo» como etiqueta en el banco.
- La regla §9 no prohíbe los términos: prohíbe que aparezcan **en el enunciado de la pregunta** en la estación 1 (cualquier nivel) y en cuatro tipos de la estación 2 de `basico`. El motivo no es purismo: «¿cuál es el prefijo de *ilegal*?» ya contiene la respuesta; «¿qué trozo se repite en estas palabras?» obliga a descubrirla. En la estación 3 el metalenguaje es libre a todos los niveles.

**Relajación posible si Josele la quiere** (decisión suya, no técnica): permitir *solo* «prefijo» y «sufijo» en la estación 2 de `basico`, bajando de ERROR a AVISO en `FP_META_PALABRAS` (`scripts/validar-banco.mjs`). Un cambio de una línea, sin efecto sobre el contenido ya escrito.

---

## 8. Orden de trabajo acordado

1. **Nada de motor todavía.** La Fase D del plan de agosto sigue abierta: falta que Josele juegue el lote 2 en el aula. Abrir modelos nuevos antes de ese retorno es construir sobre una hipótesis.
2. **Lote 3 «argumentativo», solo contenido**: ~20-25 retos desde `FP_0099` con las cuatro líneas de §3, ningún tipo de ítem nuevo, compensando de paso el sesgo hacia `derivada` y hacia `parasintesis_incompleta`.
3. **Un solo cambio de dato**, cuando el lote 3 lo pida de verdad: causa `no_lexicalizada` con veredicto `dudosa` (schema §6) + su regla en el validador. Media sesión.
4. **Higiene**: rellenar a FALSE las 13 `Zona_Gris` vacías del lote 2 y, si Josele lo aprueba, la relajación de §7.

---

## 9. Valoración final

El informe externo acierta en la dirección y se equivoca en el diagnóstico de lo que falta. La Fábrica no necesita una filosofía nueva —la tiene escrita en el §12 del schema y en el banco de pruebas—: necesita que esa filosofía llegue a más retos y a más procedimientos. De sus treinta apartados, cuatro ideas entran íntegras en el lote 3, una se incorpora como concepto con nombre, siete se resuelven con tipos que ya existen y tres se descartan con razones.

*Documento creado el 2026-08-26 (sesión 🟣 Opus 5). Continúa `docs/Plan_Revision_Fabrica_2026-08.md`.*
