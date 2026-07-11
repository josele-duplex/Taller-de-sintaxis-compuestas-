# Corpus de textos N1 · Modo Morfología

**Fuente:** Josele, 2026-07-11 (45 oraciones en 3 tandas graduadas).
**Destino:** primera tanda del nivel `n1` (fase F3 del
`plan_implementacion_morfologia.md`). Estas oraciones aún NO están en el Sheet:
falta generarles el `Tokens_JSON` (prompt de lote + validador + revisión) y
promoverlas vía `Morfologia_Conversion`.
**Regla de composición (fijada por Josele):** una sola forma verbal simple por
oración; sin conjunciones ni locuciones.

**Auditoría contra la checklist N1 (2026-07-11):** ✅ 0 conjunciones en las 45.
Longitudes: T1 = 5-7 palabras · T2 = 9-13 · T3 = 11-15. Cuatro casos frontera
marcados ⚠ abajo, con sustitución propuesta pendiente de decisión de Josele.

## Tanda 1 — iniciación (5-7 palabras)

| # | Oración | Estado |
|---|---|---|
| 1 | El gato duerme en el sofá. | ✅ |
| 2 | Ayer llovió mucho en la ciudad. | ✅ |
| 3 | Mañana visitaré a mis abuelos. | ✅ |
| 4 | La niña dibuja un árbol enorme. | ✅ |
| 5 | Los alumnos leen un libro interesante. | ✅ |
| 6 | El sol brilla sobre las montañas. | ✅ |
| 7 | Mi padre cocina una tortilla deliciosa. | ✅ |
| 8 | El tren llegó tarde a la estación. | ✅ |
| 9 | Los niños juegan en el patio. | ✅ |
| 10 | La profesora corrige los exámenes. | ✅ |
| 11 | Elena compró un vestido azul. | ✅ |
| 12 | El viento mueve las hojas secas. | ✅ |
| 13 | Los peces nadan en el río claro. | ✅ |
| 14 | Carlos escribe una carta larga. | ✅ |
| 15 | La luna ilumina el cielo oscuro. | ✅ |

## Tanda 2 — consolidación (9-13 palabras)

| # | Oración | Estado |
|---|---|---|
| 1 | Los alumnos de segundo curso presentaron su trabajo final ante toda la clase. | ✅ |
| 2 | Mi abuela guarda fotografías antiguas dentro de una caja de madera. | ✅ |
| 3 | El profesor explicó la lección con ejemplos muy claros esta mañana. | ✅ |
| 4 | Un perro pequeño ladró furiosamente detrás de la valla del jardín. | ✅ |
| 5 | La biblioteca municipal ofrece talleres gratuitos para los estudiantes jóvenes. | ✅ |
| 6 | Durante el verano pasado visitamos varios pueblos de la sierra murciana. | ✅ |
| 7 | El panadero prepara cada madrugada el pan fresco del barrio entero. | ✅ |
| 8 | Los turistas fotografiaron el castillo desde la plaza principal del pueblo. | ✅ |
| 9 | Aquella tormenta inesperada sorprendió a los pescadores en alta mar. | ⚠ *«en alta mar»* es locución adverbial fijada. Propuesta: «…sorprendió a los pescadores **en la costa**.» (o mantener y analizarla palabra a palabra: en/alta/mar) |
| 10 | La orquesta interpretó una sinfonía preciosa en el teatro municipal. | ✅ |
| 11 | Los científicos descubrieron una especie nueva en la selva amazónica. | ✅ |
| 12 | Mi hermana pequeña colecciona pegatinas de animales exóticos desde hace años. | ⚠ *«desde **hace** años»* mete un SEGUNDO verbo — rompe la regla de una sola forma verbal. Propuesta: «…de animales exóticos **desde pequeña**.» |
| 13 | El entrenador corrigió la postura de los jugadores durante el partido. | ✅ |
| 14 | Aquel escritor famoso firmó ejemplares de su última novela ayer tarde. | ✅ |
| 15 | La lluvia torrencial inundó varias calles del centro histórico. | ✅ |

## Tanda 3 — ampliación (11-15 palabras)

| # | Oración | Estado |
|---|---|---|
| 1 | Los estudiantes de tercero organizaron una exposición fotográfica sobre la historia reciente del instituto. | ✅ |
| 2 | Mi tío construyó una pequeña cabaña de madera junto al río durante las vacaciones pasadas. | ⚠ *«junto a»* es locución preposicional escolar. Propuesta: «…cabaña de madera **en la orilla del** río…» |
| 3 | El director del colegio anunció nuevas actividades extraescolares para los alumnos de secundaria. | ✅ |
| 4 | Aquella anciana vendía flores frescas cada mañana en el mercado del pueblo. | ✅ |
| 5 | Los bomberos rescataron a varios excursionistas atrapados en la montaña tras la tormenta. | ✅ (*atrapados* = participio en función adjetiva; se etiqueta Adjetivo en N1) |
| 6 | La compañía de teatro representó una obra clásica en el auditorio del parque central. | ✅ |
| 7 | Mi vecina cultiva tomates orgánicos en un huerto pequeño detrás de su casa. | ✅ |
| 8 | El equipo de baloncesto ganó el campeonato regional después de una temporada complicada. | ⚠ *«después de»* es locución preposicional escolar. Propuesta: «…el campeonato regional **tras** una temporada complicada.» (*tras* = preposición simple) |
| 9 | Los arqueólogos encontraron restos antiguos bajo los cimientos de aquella iglesia medieval. | ✅ |
| 10 | La editorial publicó una nueva colección de cuentos para lectores jóvenes. | ✅ |
| 11 | Aquel músico callejero tocaba melodías tristes cada tarde en la plaza mayor. | ✅ |
| 12 | Los agricultores de la zona recogieron una cosecha abundante este otoño pasado. | ✅ |
| 13 | Mi prima estudia enfermería en una universidad muy prestigiosa de la capital. | ✅ |
| 14 | El guardián del museo vigilaba las salas principales durante toda la noche. | ✅ |
| 15 | Los vecinos del barrio celebraron una fiesta popular en las calles adornadas. | ✅ |

## Notas para la fase F3 (conversión)

- **Agrupación**: cada oración puede ser un mini-texto por sí sola (T1) o agruparse
  de 2 en 2 por afinidad temática (T2-T3) — decidir al convertir.
- **Etiquetado**: se genera `Tokens_JSON` al máximo detalle (nivel maestro) aunque
  N1 solo pregunte la categoría — así los mismos textos sirven para N2/N3 sin
  re-etiquetar.
- **Nota de futuro**: si estos textos se reutilizan en N3, los tres casos de
  locución (si se mantienen) deberán etiquetarse como locución multipalabra.
- Los 4 ⚠ quedan pendientes de la decisión de Josele: sustituir (propuestas arriba)
  o mantener con análisis palabra a palabra.
