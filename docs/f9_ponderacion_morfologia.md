# F9 · Ponderación de la nota de Morfología

**Fecha:** 2026-07-14 · **Estado:** implementado (`js/modules/maestro/index.js`),
verificado con harness + preview. **DESPLEGAR AL CIERRE DE EVALUACIÓN + avisar de
la escala a los alumnos** (mismo requisito que B1/B2 de Simples, doc
`Investigación_evaluación.md`).

Cambio **solo cliente**: la nota se computa y se envía como string; el GAS solo la
guarda. No toca backend ni el guardado. `VERSION_CALIFICACION_MORFO` sube a
`'2026-07-14'` para distinguir resultados en el Sheet.

## Decisiones de Josele (2026-07-14)

1. **Rasgos discriminantes ×2, automáticos ×1.** Discriminantes = los que deciden
   la clase o su comportamiento: `subtipo`/clase, `función`/`función_sint`,
   `tipo_det`, `voz`, `perífrasis` y sus sub-pasos. Automáticos = todo lo demás
   (género, número, persona, conjugación, tiempo, modo, grado, terminación,
   aspecto, cercanía, poseedores, formación, np_forma, acent, tipo…).
2. **Categoría frontera 3, resto 2.** Frontera = las que obligan a decidir
   determinante/pronombre/adjetivo (Demostrativo, Posesivo, Cuantificador,
   Relativo, Interrogativo/Exclamativo). En N1 (aprendiz) la categoría es plana
   (2): el alumno solo ve las 9 clases genéricas, no distingue frontera.
3. **Curva dura de examen** (como Simples): por palabra, sobre el bloque de rasgos
   normales (no la categoría, que es la puerta): `0 fallos→100%, 1→40%, 2→10%,
   3+→0%`. Práctica = lineal ponderada. Los rasgos opcionales (aspecto en PAU) no
   penalizan ni entran en la curva.

Todo en un único punto de ajuste por si se quiere retocar:
`MORPH_STEPS_DISCRIMINANTES`, `MORPH_CATS_FRONTERA`, `MORPH_EXAM_ATTR_CURVE`.

## Diagnóstico del profesor: intacto

La nota usa puntos **ponderados**; pero `catStats` (% por categoría del informe) y
los contadores "tokens sin/con error" siguen en puntos **RAW** sin ponderar, para
que "en qué categorías falla el alumno" no se distorsione con los pesos ni con la
curva de examen.

## Arreglo de justicia incluido en F9

La ponderación destapó (no causó) un fallo vivo desde F6a/F6b: el N3 empezó a
preguntar rasgos nuevos (`terminación` en adjetivos, `formación`) que el banco
antiguo no tiene → **ni un alumno perfecto llegaba al 100%**. Corregido: un rasgo
**solo se pregunta y se puntúa si el banco tiene la respuesta**
(`morphStepAnswerable_`), con el default implícito `perífrasis` ausente = "no".
Efecto secundario deseado: el etiquetado progresivo (F7) va **activando** esos
rasgos a medida que se rellenan, sin tocar código. De paso, la "Respuesta PAU" ya
no muestra "no" para verbos simples.

## Impacto real (harness contra tokens n3 reales)

| Escenario (verbo n3, 8 rasgos) | Práctica | **Examen** | Sistema viejo |
|---|---|---|---|
| Perfecto | 100% | 100% | 100% |
| 1 fallo (rasgo automático) | 92% | **55%** | 90% |
| 1 fallo (voz, discriminante) | 83% | **55%** | 90% |
| 2 fallos | 83% | **32%** | 80% |
| 3 fallos | 67% | **25%** | 70% |

- Categoría **frontera fallada** (relativo mal clasificado) → 0% (la categoría es
  la puerta; frontera vale 3 de puerta frente a 2 de las fáciles).
- Texto n3 completo fallando 1 rasgo automático de cada 3 palabras: práctica 9.5,
  **examen 8.7**, viejo 9.4.

⚠→✅ **Aviso trasladado a Josele y ya resuelto (2026-07-14, mismo día):** la
curva dura era severa en verbos (1 fallo → 55%). Confirmado que era por tener
8-9 rasgos frente a los 3-5 del resto — **suavizada solo para Verbo**
(`MORPH_EXAM_ATTR_CURVE_VERBO`), el resto de categorías conserva la curva
original sin cambios:

| Fallos | Verbo (curva suave) | Resto de categorías (curva dura, sin cambio) |
|---|---|---|
| 0 | 100% | 100% |
| 1 | **74%** (antes 55%) | 57% |
| 2 | **55%** | 36% |
| 3 | **44%** | 29% |
| 4 | 36% | — |
| 5 | 29% | — |
| 6+ | 25%→0% | — |

Verificado en preview: "asumió" (Verbo, 7 rasgos respondidos correctos) → 10/10
sin errores de consola.

## Vinculación

- `docs/propuesta_niveles_morfologia.md` §1 (categoría vs "lo que discrimina").
- [[project-rediseno-calificacion]] — B1/B2 de Simples/Compuestas, misma filosofía
  (pesos = importancia pedagógica en ambos modos; curva dura solo en examen).
