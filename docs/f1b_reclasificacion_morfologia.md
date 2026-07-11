# F1b · Tabla de reclasificación de `Morfologia_Textos`

**Fecha:** 2026-07-12 · **Estado:** propuesta para revisión de Josele — NADA aplicado todavía.
Datos leídos en vivo de producción vía `getTextosMorfologia` (51 textos), coinciden con
la auditoría de `plan_implementacion_morfologia.md` §1.

## Regla general

Los 40 textos actuales con `Nivel=basico` (ids 1-40) tienen 25-42 palabras, con
conjunciones, perífrasis, *se* pasivo/impersonal, *según/mediante*… → su nivel real
es **n2** (3.º-4.º ESO), no n1. Se reclasifican todos a `n2` **excepto** las 3
excepciones de la tabla siguiente.

## Cambios de columna `Nivel`

| ids | Nivel actual | Nivel nuevo | Motivo |
|---|---|---|---|
| 1-40 excepto 22 (39 textos, incluye 12 y 32) | `basico` | **n2** | Densidad real 3.º-4.º ESO (regla general). 12 y 32 quedan en n2 *y además* Activo=No (ver tabla siguiente) |
| **22** | `basico` | **arcade** | Texto intruso: 141 palabras (tamaño arcade, no básico) |
| 41-45 | `arcade` | *(sin cambio)* | Ya correctos — textos largos inventados (131-159 palabras) |
| 46, 47, 48, 50, 51, 52 | `arcade` (4) / `básico` con tilde (2) | **n3** | Fragmentos literarios de García Márquez (*Cien años de soledad*), sintaxis compleja propia de Bachillerato/PAU. De paso corrige el bug de la tilde en 51/52 |

`n1` queda **vacío** — se llenará al promover el TSV de F3 (41 oraciones ya tokenizadas,
pendiente de que las pegues en `Morfologia_Conversion` y las promuevas).

## Cambios de columna `Activo`

| ids | Motivo |
|---|---|
| **12, 32** | `Tokens_JSON` vacío (0 tokens) — la app ya los salta en silencio, pero ocupan banco y podrían colarse en el pool de relajación de F2. Se marcan `Activo=No` hasta que se les generen tokens (no se tocan hoy; no es parte de este alcance) |

## Resumen del resultado tras aplicar

| Nivel | Antes | Después |
|---|---|---|
| n1 | 0 | 0 (pendiente F3→promoción) |
| n2 | 0 | 39 (incluye los ids 12 y 32, que además quedan Activo=No) |
| n3 | 0 | 6 |
| arcade | 9 | 6 (pierde 46,47,48,50 hacia n3; gana 22) |
| basico/básico (legado) | 51 | 0 |
| Activo=No | 0 | 2 (ids 12, 32) |

Total se conserva: 39+6+6 = 51. ✓

## APROBADO 2026-07-12 — implementado

Función de menú GAS `menuReclasificarMorfologia` (patrón idéntico a
`menuPromoverTextosMorfologia` de F1a) que aplica esta tabla exacta por ID.
Es idempotente: solo escribe celdas cuyo valor cambia, así que ejecutarla dos
veces no duplica nada. Verificada con harness Node contra los 51 textos reales
(fetch en vivo vía API 2026-07-12): 46 cambios de nivel + 2 de Activo en la
primera pasada, 0 cambios en la segunda (idempotencia confirmada), conteos
finales n2=39/n3=6/arcade=6 exactamente como en la tabla de arriba.

**Pendiente de Josele:** pegar `Code_v6.gs` en Apps Script, redesplegar como
Nueva versión, y ejecutar el menú "🧬 Reclasificar textos de Morfología (F1b)"
una vez (Mantenimiento → …). Después de eso conviene ejecutar también
"🧬 Promover textos de Morfología revisados" si ya has revisado el TSV de F3
en `Morfologia_Conversion`, para que N1 deje de estar vacío.
