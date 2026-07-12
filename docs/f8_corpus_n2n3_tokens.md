# F8 · Primera tanda de textos n2/n3 desde Compuestas

**Fecha:** 2026-07-12 · **Estado:** tokenizado HECHO, validado, listo para que Josele
revise y promueva. Aprobado el listado de 5 oraciones en el chat.

## Origen

Fuente C del plan (`docs/plan_implementacion_morfologia.md` §2.2): el banco de
Compuestas (262 ejercicios) tiene datos **sintácticos**, no morfológicos — se ha
tomado solo el **texto** de cada oración elegida y se ha generado su
`Tokens_JSON` morfológico completo desde cero (mismo proceso que F3).

| Oración | Nivel | Palabras | Por qué |
|---|---|---|---|
| OC_0003 | n2 | 16 | relativo "que" |
| OC_0004 | n2 | 19 | concesiva "aunque" |
| OC_0053 | n3 | 18 | voz pasiva perifrástica ("fue cancelado") + causal |
| OC_0041 | n3 | 11 | "cuyo" (determinante-relativo, taxonomía PAU de F6b) |
| OC_0050 | n3 | 20 | relativo pronombre "quien" con antecedente explícito |

Todas más cortas que el ideal del plan (n2: 20-35 palabras; n3: 30-60) — el banco
de Compuestas no tiene muchas oraciones largas con estos rasgos concretos.
Aprobado explícitamente por Josele priorizar la riqueza gramatical sobre la
longitud exacta para esta primera tanda.

## Validado con harness Node (`scripts` no incluidos aún, hecho ad hoc en la sesión)

- Categorías válidas, IDs de token únicos, cobertura de palabras exacta.
- **Cada valor de atributo se comprobó contra las opciones reales de la cascada**
  (F5 para n2, F6b para n3, incluyendo `tipo_det` derivado) — 0 problemas.
- Cruzado también contra el otro nivel (por si algún día se sirven ahí vía
  relajación de F2): 0 problemas.

## Decisiones de criterio tomadas (revisar si no te convencen)

1. **"fue cancelado" (OC_0053) se tokeniza como UN SOLO token Verbo**, igual que
   ya hacía el banco con perífrasis modales/tempoaspectuales ("podía respirar",
   "había de recordar"), con `voz:"pasiva"` y `perífrasis:"no"` — siguiendo al
   pie de la letra la regla del documento PAU ("ser + participio es voz pasiva
   del verbo, NO una clase de perífrasis"). **No hay ningún ejemplo previo de
   pasiva perifrástica en el banco actual**, así que esta es la primera vez que
   se aplica el criterio — si Josele prefiere tokenizar "fue" y "cancelado" por
   separado, hay que decírmelo antes de que esto se convierta en el patrón que
   copien los próximos lotes.
2. Concreto/abstracto de sustantivos temporales (trimestre, madrugada, año) →
   **abstracto** (no son entidades perceptibles por los sentidos). Precios →
   también abstracto (valor/cantidad, no objeto físico).
3. Adjetivos relacionales sin grado (internacional, económica, transoceánico,
   principal) llevan `terminación` calculada mecánicamente (una/dos
   terminaciones según cambien o no de género) — y `formación:"derivada"` en
   los casos claros (internacional, económica, transoceánico), siguiendo el
   mismo criterio ligero de F7 (no exhaustivo, solo lo evidente).
4. "Hacienda" (nombre propio de institución) lleva género/número aunque a
   nivel n3 no se le pregunten (la cascada de N3 los omite para propios) —
   se rellenan igualmente porque a nivel N2 SÍ se preguntan (mismo token,
   dos niveles posibles).

## Hallazgos colaterales durante la tokenización (no corregidos, para la tarea de datdatos)

Al comparar contra el banco real para diseñar los criterios de arriba, aparecieron
más inconsistencias preexistentes, además de las ya registradas en `task_3f99fb62`:

- El "se" de pasiva refleja/impersonal (ej. "se vende") está tageado como
  **"Pronombre personal"** en el banco real, NO como "Marca.Pas.Ref." pese a que
  esa categoría existe en el código — hace que "Marca.Pas.Ref."/"Marca.Imp."
  sean, en la práctica, código sin uso real en los textos actuales.
- La forma contracta del artículo (al/del) aparece etiquetada de 3 formas
  distintas en el banco: `Artículo` con `forma:"contracta"` (correcto),
  `Artículo` con `forma:"contracción"` (ya normalizado en el código, ver
  `confirmToken`), y **`Preposición` con `tipo:"contracta"`** (esto último SÍ
  es un bug real: `MORPH_CASCADES['Preposición']` no tiene la opción
  "contracta", así que esos tokens concretos nunca se pueden acertar).
- Algunos tokens de Preposición contracta llevan un atributo `atrs.formación`
  con significado de "de + el" (desglose de la contracción) — **choca de
  nombre** con el atributo NUEVO `formación` de F6b/F7 (simple/derivada/
  compuesta/parasintética). Inofensivo en la práctica (la cascada nunca
  pregunta `formación` para Preposición), pero puede confundir en futuras
  auditorías.

Recomiendo ampliar `task_3f99fb62` (o crear una nueva) para cubrir también estos
tres puntos cuando se audite el banco completo.

## Cómo lo usas tú

1. Pega el contenido de `docs/f8_corpus_n2n3_tokens.tsv` en la hoja
   `Morfologia_Conversion` (columnas ya en el orden correcto: Fuente, Texto,
   Nivel_Destino, Tokens_JSON, Estado).
2. Revisa las 5 filas (llegan con Estado=`borrador`).
3. Si te convencen, cambia Estado a `revisado` en cada fila.
4. Menú → "🧬 Promover textos de Morfología revisados" (F1a, ya existe).
5. El banco n2 pasa de 39 a 41 textos activos; el n3, de 6 a 9.
