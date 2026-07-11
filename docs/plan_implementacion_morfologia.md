# Plan de implementación · Modo Morfología (niveles + textos)

**Fecha:** 2026-07-11 · **Estado:** plan aprobable — NO se ha implementado nada.
**Integra:** (a) los 3 niveles de análisis ya validados (`docs/propuesta_niveles_morfologia.md`,
decisiones cerradas en su §7) y (b) el problema de los textos detectado por Josele:
demasiado largos y complejos para 1.º-2.º ESO, sin selección real por nivel.

---

## 1. Diagnóstico de los textos (datos reales de producción, 2026-07-11)

Auditados los 51 textos servidos por `getTextosMorfologia` en producción:

| Hallazgo | Detalle |
|---|---|
| **0 textos aptos para N1** | Los 40 «basico» tienen 19-36 palabras e incluyen conjunciones (1-3 por texto), pasivas reflejas (*se vende…*, *se divisan…*), perífrasis sueltas, *según/mediante*, vocativos… Densidad real: 3.º-4.º ESO |
| **La app no filtra por nivel académico** | `_loadMaestroTexts` (maestro/index.js:858) pide SIEMPRE `nivel=basico`, sea cual sea el nivel elegido (aprendiz/eso34/maestro). La columna Nivel del Sheet solo separa «arcade» |
| **Texto intruso** | id 22: **118 palabras** etiquetado «basico» (longitud de arcade) |
| **Bug de tildes** | ids 51-52: nivel escrito «**básico**» con tilde → `filterByNivel_` compara literal y NUNCA los sirve |
| **Tokens vacíos** | ids 12 y 32: sin tokens utilizables; la app los salta en silencio (el alumno nunca los ve, pero ocupan banco) |
| **Nivel «avanzado» inexistente** | El código lo contempla; ningún texto lo usa |

Conclusión: el diagnóstico pedagógico de Josele es correcto y además estructural — no
es solo que falten textos fáciles: **no existe el cauce para servirlos por nivel**.

## 2. Diseño de la solución de textos

### 2.1 Taxonomía de niveles de texto (columna `Nivel` del Sheet)

Alineada con los tres niveles académicos + arcade. Criterios de admisión **medibles**
(un validador automático los comprobará antes de subir nada):

| Nivel | Longitud | Debe tener | NO puede tener |
|---|---|---|---|
| `n1` (1.º-2.º ESO) | **8-15 palabras** (1-2 oraciones) | Solo las 9 categorías básicas; mayoría de sustantivos/adjetivos/verbos/determinantes | Perífrasis, relativos, conectores discursivos, *se* pasivo/impersonal, locuciones, **conjunciones** (decisión Josele; una *y* copulativa podrá entrar en tandas posteriores si él lo aprueba), interr./exclamativos, *según/mediante/cabe/so* |
| `n2` (3.º-4.º ESO) | 20-35 palabras | Repertorio ESO: perífrasis básicas, conjunciones coord./subord., demostrativos/posesivos/cuantificadores variados | Rarezas PAU (locuciones raras, *cuyo*, pasivas perifrásticas encadenadas) |
| `n3` (Bachillerato/PAU) | 30-60 palabras | Casos frontera: pasivas, perífrasis de probabilidad, relativos, locuciones etiquetadas, palabras con `formacion` | — |
| `arcade` | libre (largos) | — | — |

Reclasificación de lo existente: los 40 «basico» actuales → `n2` (es su nivel real);
id 22 → `arcade`; los literarios cortos de García Márquez (46-52) → `n3`; ids 12/32 →
arreglar tokens o desactivar; ids 51-52 → corregir la tilde. **N1 queda vacío y se
llena con textos nuevos (§2.2).**

Blindaje de código: `filterByNivel_` normalizará (minúsculas, sin tildes, trim) para
que «Básico », «n1», «N1» no vuelvan a perder textos en silencio.

### 2.2 De dónde salen los textos N1 (y los futuros n2/n3)

**Fuente A — Los ejemplos de Josele.** ⚠ En el mensaje decía «te pongo unos ejemplos
de textos sencillos» pero **no llegaron adjuntos** — hay que pedírselos: calibran la
dificultad exacta que quiere y son la semilla de la primera tanda.

**Fuente B — El banco de Simples (658 oraciones).** La idea de Josele es buena y
barata: muchas oraciones del banco son exactamente el tamaño N1 (*«El gato atrapó un
ratón»*). Matiz técnico importante: esas oraciones tienen datos **sintácticos**
(fase1/2/3), no morfológicos — reutilizarlas significa tomar su TEXTO y generar su
`Tokens_JSON` morfológico nuevo. Selección: filtrar por dificultad dinámica baja
(el GAS ya la calcula) y revisar contra la checklist N1. Un «texto» N1 = 1-3 oraciones
del banco agrupadas por tema cuando se pueda.

**Fuente C — El banco de Compuestas (250 ejercicios).** Útil para n2/n3 (traen
conjunciones, relativos y varias proposiciones — justo lo que esos niveles piden).
Mismo pipeline, prioridad posterior.

### 2.3 El pipeline de conversión (la «otra hoja» de Josele)

Propuesta que concilia su idea con el menor riesgo técnico:

1. **Hoja nueva `Morfologia_Conversion`** = *zona de trabajo* (staging). Columnas:
   `Fuente` (`simples:123` / `compuestas:OC_0045` / `josele` / `original`),
   `Texto`, `Nivel_Destino`, `Tokens_JSON`, `Estado` (borrador/revisado/promovido).
   Aquí caen los lotes convertidos ANTES de que los vea ningún alumno.
2. **Prompt maestro de lote de morfología** (nuevo, análogo a los de
   `lote_generation.md` del skill): entrada = oraciones elegidas + nivel destino;
   salida = TSV con `Tokens_JSON` etiquetado **al máximo detalle** (nivel maestro:
   los niveles recortan como vistas, así que se etiqueta una sola vez para los tres).
3. **Validador automático** (script en `scripts/`, patrón del validador de compuestas):
   comprueba la checklist del nivel (§2.1) sobre el `Tokens_JSON` — nunca más un
   texto de 118 palabras colado como básico.
4. **Revisión de Josele** en la hoja staging (columna Estado → «revisado»).
5. **Menú GAS «Promover textos revisados»**: copia los revisados a `Morfologia_Textos`
   con su nivel e invalida la caché. La hoja servida sigue siendo UNA (el precompute
   y `getTextosMorfologia_` no se duplican).

### 2.4 Selección por nivel en la app

- `_loadMaestroTexts` pasa a pedir el nivel real: aprendiz→`n1`, eso34→`n2`,
  maestro→`n3`, con **relajación automática** si el nivel pedido tiene pocos textos
  (baja al siguiente y avisa por consola — mismo patrón `subfaseRelajada` que ya usa
  Sintaxis; evita sesiones vacías mientras el banco N1 crece).
- El examen de morfología (`createExamMorfologia_`) ya guarda Nivel: solo alinear valores.
- Arcade no cambia.

## 3. Plan de ejecución por fases (una sesión ≈ una fase, un commit por fase)

Ordenado para atacar PRIMERO la urgencia de aula (alumnos de 1.º-2.º ESO a principio
de curso) y dejar las cascadas después:

| Fase | Contenido | Toca | Modelo | Notas |
|---|---|---|---|---|
| **F1a · Infraestructura** ✅ HECHO (commit b72a315) | Normalización de nivel en `filterByNivel_` (tildes/trim); hoja `Morfologia_Conversion` + `menuPromoverTextosMorfologia`; desplegable Nivel ampliado a n1/n2/n3 | GAS | **Sonnet** | Verificado con harness Node (4 bloques). **Pendiente: pegar en Apps Script y redesplegar Nueva versión** |
| **F1b · Reclasificación de datos** | Reclasificar los 51 textos existentes (basico→n2, id22→arcade, GM→n3, corregir tildes de nivel); arreglar/desactivar ids 12 y 32 (tokens vacíos) | Sheet (datos) | **Sonnet, con la tabla presentada a Josele antes de tocar el Sheet** | No bloquea F2/F3 |
| **F2 · Selección por nivel** | `_loadMaestroTexts` con nivel real + relajación; alinear examen | `maestro/index.js` | **Sonnet** | Verificable en preview con mocks |
| **F3 · Primera tanda N1** ✅ TOKENIZADO HECHO (2026-07-12) | Las 41 oraciones de Josele (`docs/corpus_textos_n1_morfologia.md`) tokenizadas al detalle completo, validadas (0 problemas), TSV listo en `docs/f3_corpus_n1_tokens.tsv` | contenido | **Claude (hecho) + revisión Josele (pendiente)** | Falta: Josele pega el TSV en `Morfologia_Conversion`, revisa, marca `revisado` y promueve (pasos exactos en el corpus doc §"Cómo lo usas tú"). No se usaron oraciones de Simples en esta primera tanda — Josele aportó las suyas directamente, más ricas pedagógicamente por venir ya graduadas en 3 tandas |
| **F4 · Cascadas N1** | Inventario 9 clases + mapeo interno (decisiones 1-2 del §7 de la propuesta) | `maestro/index.js` | **Sonnet** | Las cascadas son config declarativa, no motor |
| **F5 · Cascadas N2** | Las 8 correcciones (clase adjetivo, neutro/contracta, cercanía, poseedores, Relativo, Interr./Excl., aspecto, voz activa/pasiva) | `maestro/index.js` | **Sonnet** | |
| **F6 · Cascadas N3 (receta PAU)** | Taxonomía definido/cuantificador, terminación, np_forma simple/compuesto, aspecto «opcional», voz, sustantivo propio recortado + **«respuesta PAU» en una línea** | `maestro/index.js` | **Sonnet** | La más larga; puede partirse en 6a (cascadas) y 6b (respuesta PAU) |
| **F7 · Atributos progresivos** | `formacion` + locuciones multipalabra: mecánica en cascadas + etiquetado inicial en textos n3 | banco + `maestro/index.js` | **Sonnet + lotes** | Progresiva por diseño (decisiones 5-6) |
| **F8 · Textos n2/n3 desde Compuestas** | Segunda oleada de conversión (Fuente C) + textos tipo PAU nuevos | contenido | **Claude (lote) + Josele** | Sin prisa; el banco crece texto a texto |
| **F9 · Ponderación** | (APLAZADA a propósito) — se diseñará al llegar aquí, con los contenidos ya rodados | motor de puntuación | **Opus/Fable** | Única fase que toca el cálculo de nota |

Tras F1+F2+F3 ya tienes el modo usable en aula con 1.º-2.º ESO — aunque las cascadas
nuevas (F4-F6) todavía no estén, el N1 actual (solo categoría) con textos cortos
apropiados ya resuelve tu urgencia de principio de curso.

## 4. Qué necesito de Josele antes de arrancar

1. **Los textos de ejemplo** que mencionaste y no llegaron — pégalos en el chat tal
   cual; sirven para calibrar la checklist N1 y sembrar la primera tanda de F3.
2. Confirmación del plan de fases (o reordenación si prefieres cascadas antes que textos).
3. En F1 hay decisiones de datos que puedes querer supervisar (la reclasificación de
   los 51 textos existentes se hará con una tabla propuesta que revisarás antes de tocar
   el Sheet).

## 10. Ideas para después (aparcadas, 2026-07-12 — NO implementar sin retomar antes)

Surgidas al revisar los textos largos existentes (los "básico"/arcade actuales
de 20-35+ palabras, y las tandas 2-3 del corpus N1 si se reutilizan más
adelante en niveles superiores). Dos modos de juego nuevos para Morfología,
aprovechando motores YA construidos:

**F10a · "Morfo-Chispa"** — encuentra la categoría pedida entre varias fichas.
Encaje casi directo: Chispa (`js/modules/chispa/index.js`) ya hace exactamente
este mecanismo para Simples/Compuestas (fichas resaltadas, el alumno toca la
correcta). La morfología encaja MEJOR que la sintaxis porque cada token del
banco ya es una palabra con categoría propia — no hay que derivar tramos como
en Sintaxis. Coste estimado: bajo (nueva fuente de datos para un motor que ya
existe, sin tocar su UI).

**F10b · "Morfo-Arcade"** — encuentra TODAS las palabras de una categoría en
un texto corrido, contrarreloj (p. ej. "todos los sustantivos"). Pedagógicamente
más potente (barrido visual completo, no solo reconocer 1 de 4), pero es un
**mecanismo de interacción nuevo**: no es "elige 1 ficha" sino "toca varias
palabras dentro de un texto", con su propio feedback de acierto/fallo por
click. Se apoyaría en el motor de Contrarreloj de Arcade (vidas/tiempo/
ranking) pero la interacción en sí no existe todavía — coste medio-alto.

Los textos largos ya existentes (o las tandas 2-3 del corpus N1, con 9-15
palabras) son el tamaño natural para ambos; los textos de la tanda 1 (5-7
palabras) se quedarían cortos para "buscar todas las apariciones".

**Retomar cuando F1-F7 estén cerradas** — ninguna de las dos bloquea nada del
resto del plan; son mejoras de engagement, no de evaluación.

## 5. Vinculación

- `docs/propuesta_niveles_morfologia.md` — el QUÉ de los niveles (validado).
- Este documento — el CÓMO y el CUÁNDO, incluyendo los textos.
- Skill `taller-sintaxis` → `references/lote_generation.md` — patrón de prompts de lote
  al que se sumará el de morfología (F3).
