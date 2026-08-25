# Canon de aceptabilidad del corpus del Laboratorio
## Cómo se decide qué lleva asterisco, qué lleva ⚠ y qué no entra

**F2 · sesión 1 · 6 de agosto de 2026 · Norma editorial vigente**

> **Para qué sirve.** Este documento decide **qué se puede preguntar** en un juicio de gramaticalidad del Laboratorio y **cómo se redacta**. Es la parte del canon que un archivo de datos no puede contener: los datos guardan las 22 causas ([`js/data/canon-agramatical.js`](../js/data/canon-agramatical.js)), y aquí está el criterio para usarlas.
>
> **Quién lo lee.** Quien escriba un lote de retos (F0·3 `medio`, F4·1 `basico`, F5·2-3 `avanzado`) y quien valide uno. El motor no lee esto; lee el archivo de datos.
>
> **Fuentes:** `Laboratorio_Oraciones_Plan_Producto.md` §2.5 · `Schema_Laboratorio_v1.0.md` §5 · del proyecto de Lengua, `marco_teorico_didactico.md` §2.3 y el banco R-07 de pares mínimos.

---

## 1. El principio: tres marcas disjuntas

El marco teórico obliga a distinguir tres cosas que el alumno (y muchos manuales) mezclan en un solo cajón de «está mal». Mezclarlas es el error pedagógico que este corpus existe para evitar.

| Marca | Qué es | Lleva asterisco | Qué se le pregunta al alumno |
|---|---|---|---|
| **✗ agramatical** | Se rompe la comprensión gramatical: concordancia, régimen, función, transitividad. **Ningún hablante nativo lo dice.** | **Sí** | «¿Esta oración funciona?» + **¿qué se rompe?** |
| **⚠ norma culta** | Se dice y se entiende. Lo que falla es el registro formal: queísmo, dequeísmo, leísmo, laísmo, nombre propio con artículo. | **No, nunca** | «¿En qué situación **no** valdría?» — nunca «¿está mal?» |
| **⚖ zona gris** | Dos análisis defendibles. | **No** | «¿Qué dos análisis caben aquí?» — puntúan los dos |

La diferencia no es de gravedad, es de **naturaleza**. `*Los niños juega` no lo dice nadie; *La dije que viniera* lo dice media España todos los días. Preguntarlas igual enseña que las dos son «faltas», y eso es falso.

### 1.1 El árbol de decisión

Ante un ejemplo candidato, cuatro preguntas en este orden. La primera que dé «sí» decide.

1. **¿El ejemplo señala a un grupo de hablantes** —de dónde son, de qué familia vienen, cuánto han estudiado—? → **Fuera del corpus** (§3). No sigas.
2. **¿Lo diría un hablante nativo cualquiera, en conversación normal, sin darse cuenta?**
   - **No, no lo diría nadie** → **✗ agramatical**.
   - **Sí, se dice, pero no lo escribiría en un examen** → **⚠ norma culta**.
3. **¿Se puede defender la otra opción con un argumento gramatical?** → **⚖ zona gris**. (Ojo: «se puede defender», no «se oye a veces».)
4. **¿Ninguna de las anteriores?** → No es material de juicio. Puede ser un buen **par mínimo** (dos formas correctas con significados distintos), que es otro tipo de ítem y suele ser más rentable.

La pregunta 2 se contesta **preguntando a alguien**, no razonando: si dudas de si se dice, se dice. El juicio de un hablante es el dato, no la regla del manual.

---

## 2. Las cuatro reglas de composición

No negociables. Tres las comprueba el validador; la primera es del motor y ya está implementada.

1. **El asterisco lo pinta la pantalla, nunca el dato.** El JSON guarda siempre la oración limpia; la UI añade el `*` con su clase (`.lab-asterisco`) y la leyenda fija: «el asterisco marca lo que un hablante nativo no diría». Los ⚠ y los ⚖ no lo llevan — lo decide `llevaAsterisco(veredicto)`, no una comparación suelta en el render.
2. **Nunca una oración agramatical sola en pantalla.** Todo juicio ✗ lleva su `gemela_correcta`, y el feedback las muestra en contraste. Una pantalla con solo el error acaba enseñando el error.
3. **Un control por cada tres juicios.** Al menos un ítem con `veredicto: "gramatical"` en todo reto que tenga tres o más juicios. Si todo lo que se pregunta está mal, el alumno aprende a contestar «mal» sin mirar. *(ERROR del validador si falta.)*
4. **Densidad: 1-2 juicios por reto**, 4-6 en un bloque de evaluación formativa. El límite superior existe para que el módulo no se convierta en un test de corrección: el corazón del Laboratorio es la manipulación, no el juicio. *(AVISO del validador a partir de 3.)*

---

## 3. Lo que queda fuera del corpus

**No es una lista de recomendaciones: es el límite del módulo.** No hay código de causa para nada de esto, así que el schema no permite escribirlo.

| Queda fuera | Ejemplos | Por qué |
|---|---|---|
| Incorrección de origen social | *haiga*, *cocretas*, *dijistes* | Un asterisco sobre el habla de casa de un alumno de 2.º ESO no enseña gramática: le enseña que su familia habla mal. Es un coste que el módulo no paga. |
| Rasgos dialectales, **incluidos los de la Región** | aspiración de la ‑s, formas del habla murciana | Son variación geográfica. Se estudian como tal, en su sitio del currículo. |
| Ortografía y puntuación | *\*aver*, *haber / a ver* | No es sintaxis. |
| Léxico y propiedad | *\*Me dijo un tema muy interesante* | El alumno acertaría por vocabulario y el ítem dejaría de medir estructura. |
| Cualquier cosa que pueda leerse como burla del habla familiar del alumno | — | Regla de cierre: **en la duda, no entra.** Hay ejemplos de sobra sin rozar esto. |

El marco teórico es explícito: eso se aborda como **variación social**, no como material de análisis.

---

## 4. Las 22 causas y su frontera

La tabla completa —marca, veredicto, nivel mínimo, familia, etiqueta del alumno, ejemplo con su gemela y el criterio de frontera— vive en [`js/data/canon-agramatical.js`](../js/data/canon-agramatical.js), que es la fuente única. Aquí solo el mapa, con **la trampa concreta de cada una**: el caso que parece de esa causa y no lo es.

### Nivel `basico` — se rompe a oído, sin una sola etiqueta

| Causa | Ejemplo | La trampa |
|---|---|---|
| `concordancia_sv` | \**Los niños juega* | La concordancia con el significado (*La mayoría llegó/llegaron*) **no** es esto: es ⚖. |
| `concordancia_atr` | \**Las chicas están contentos* | Exige verbo copulativo. Con otro verbo es `concordancia_cpvo`, que es de `medio`. |
| `transitividad` | \**Pedro salió la casa* | Si el verbo sí admite complemento pero con otra preposición → `regimen_prep`. Si lo admite pero no de esa clase → `seleccion_semantica`. |
| `orden_imposible` | \**Casa la limpió Pedro la* | El español ordena con mucha libertad, y el experimento «mueve» enseña justamente eso. Si la permutación se puede decir con otra entonación, **no es un error**. |

### Nivel `medio` — aparece la frontera entre funciones vecinas

| Causa | Ejemplo | La trampa |
|---|---|---|
| `concordancia_cpvo` | \**Encontraron consciente a los heridos* | Verbo **no** copulativo. Gana valor si la palabra pudiera concordar con dos nombres. |
| `regimen_prep` | \**pienso de mi familia* | Comprobar que no exista lectura buena con la otra preposición (*pensar bien de alguien* existe). Si las dos se dicen, es par mínimo, no error. |
| `pronombre_cruzado` | \**María la escribió una carta a Juan* | Las **dos** funciones tienen que estar en la oración. Si el ejemplo se oye con naturalidad en zona laísta, la causa es `leismo_laismo` y la marca es ⚠. |
| `seleccion_semantica` | \**Presencié a los jugadores* | La más resbaladiza: casi todo se rescata con una lectura figurada. Si a alguien se le ocurre un contexto normal donde se diga, **el ítem no vale**. |
| `articulo_propio` ⚠ | *El Buñuel rodó…* | Fuera los casos normativos: *la Callas*, *El Cairo*, *La Manga*. |

### Nivel `avanzado` — Bachillerato y norma culta

| Causa | Ejemplo | La trampa |
|---|---|---|
| `pasiva_refleja_intrans` | \**se desapareció el acuerdo* | Cuidado con los verbos que admiten un *se* de otro valor (*se cayó*, *se murió*): ahí el *se* es correcto. |
| `duplicacion_obligatoria` | \**vi a ella* | Obligatoria con pronombre tónico y con complemento antepuesto. Con un SN pospuesto normal es **opcional**: no hay error. |
| `modo_obligado` | \**prefiero que viajas* | Fuera los verbos que admiten los dos con cambio de significado (*creo que viene / no creo que venga*). |
| `gradabilidad` | \**es muy infinito* | *«Muy único»* se oye en publicidad: es recurso expresivo, no error. Si admite lectura expresiva, no se escribe. |
| `queismo_dequeismo` ⚠ | *Me alegro que vengas* | Sin asterisco. Meter al lado la prueba operativa: sustituir por *eso* («me alegro **de** eso»). |
| `leismo_laismo` ⚠ | *La dije que viniera* | **Fuera el leísmo de persona masculina singular** (*le vi a Juan*), que la norma admite: marcarlo sería enseñar una regla falsa. |
| `concordancia_ad_sensum` ⚖ | *La mayoría… llegó / llegaron* | Única causa ⚖. Se juega como ítem `frontera`, **nunca** como `juicio`. |

---

## 5. Cómo se escribe un ítem

### 5.1 Un juicio ✗ (el caso normal)

```json
{ "tipo": "juicio",
  "oracion": "María la escribió una carta a Juan.",
  "veredicto": "agramatical",
  "causa": "pronombre_cruzado",
  "opciones_causa": ["pronombre_cruzado", "concordancia_sv", "regimen_prep"],
  "gemela_correcta": "María le escribió una carta a Juan.",
  "explicacion": "Cada función tiene su pronombre: 'a Juan' es quien recibe la carta, así que le corresponde 'le'.",
  "fuente_id": "PM-SINT-35" }
```

Checklist:

1. **Una sola cosa rota.** Si la oración falla por dos motivos, el alumno acierta el veredicto y falla la causa sin que eso signifique nada.
2. **La gemela cambia lo mínimo.** Idealmente una palabra. Si cambian tres, el contraste deja de señalar.
3. **Los distractores de `opciones_causa` tienen que tentar.** Uno de la **misma familia** obliga a mirar la oración; uno de familia lejana se descarta solo y el ítem mide menos de lo que parece. `opcionesCausaSugeridas(causa, nivel)` en el archivo de datos los propone ya ordenados.
4. **La causa tiene que ser de un nivel ≤ el del reto.** *(ERROR del validador.)*
5. **La explicación explica el mecanismo, no la etiqueta.** «Le corresponde *le*», no «porque es CI» — en estación 2 las etiquetas todavía no existen para el alumno.
6. **`fuente_id` si el ejemplo viene del banco R-07.** Se referencia, no se copia.

### 5.2 Un ítem ⚠ (norma culta)

Mismo tipo `juicio`, pero:

- `veredicto: "norma_culta"` — el validador da **ERROR** si una causa ⚠ lleva `veredicto: "agramatical"`.
- **Sin asterisco** (lo garantiza el motor).
- La `explicacion` habla de **situaciones**, no de corrección: «en una conversación no le chirría a nadie; en un examen o en una instancia, sí».
- La `gemela_correcta` es la forma de registro formal, y conviene que la explicación diga **cuál es la prueba** que la decide (sustituir por *eso*, comprobar qué pronombre pide el verbo).

### 5.3 Un ítem ⚖ (zona gris)

No es un `juicio`: es un ítem `frontera`, con **exactamente dos** opciones `ok: true`, cada una con su microexplicación, y obliga a `zona_gris: true` en el reto. Esa bandera es la que lo deja fuera del examen: un ejercicio con dos respuestas válidas es indefendible ante una reclamación.

---

## 6. Qué comprueba el validador y qué no

```bash
node scripts/validar-banco.mjs laboratorio banco_export/Laboratorio_Banco.tsv
```

**Sí comprueba** (❌ ERROR): causa en lista cerrada · causa compatible con el nivel del reto · veredicto esperado de esa causa · toda oración ✗ con su `gemela_correcta` · al menos un control gramatical en retos con 3+ juicios · al menos un juicio por reto · metalenguaje prohibido en estación 1 y en `basico` · `objetivo.texto` presente y único · `prueba_id` y distractores existentes en `pruebas-sintaxis.js`.

**No puede comprobar** — y es exactamente lo que hay que mirar a mano:

- Si el ejemplo **de verdad no lo diría nadie**. Es un juicio de hablante, no una regla.
- Si hay **una sola cosa rota**.
- Si los distractores de causa **tientan** o se descartan solos.
- Si el ejemplo **roza el habla de alguien** de la clase.

Por eso el filtro final del lote es humano, igual que en los lotes de compuestas.

---

## 7. Decisiones abiertas

| # | Asunto | Estado |
|---|---|---|
| 1 | La matriz de vecinos de `pruebas-sintaxis.js` tiene 9 pares (los del banco de reflexión); `LAB_PARES_DISCRIMINANTES` del validador tiene 7 y le faltan CD↔C.Rég., CPvo↔CC Modo y Vocat.↔Sujeto. Solo afecta al **aviso** de `peso: 2`, no a la corrección de ningún lote. | Pendiente de decidir si se alinean. |
| 2 | En los ítems `etiqueta_prueba` sobre Marca.Pas.Ref./Marca.Imp., el helper de autoría solo propone un distractor: la frontera es interna a `PRU-SINT-SE-01`. El candidato natural para el segundo es `PRU-SINT-SUJ-01` (el error real: dar por hecho que «a los culpables» manda en el verbo). Convertirlo en par fijo sería añadir un **décimo par** al banco de reflexión. | Decisión de canon, de Josele. |
| 3 | En `concordancia_ad_sensum`, el campo `ejemplo.mal` no contiene una oración mala, sino la otra lectura. Se llama así por uniformidad del formato. | Anotado; no se toca el formato por un solo caso. |

---

*Canon de aceptabilidad · Laboratorio de Oraciones · F2 sesión 1 (ago-2026). Fuente de datos: `js/data/canon-agramatical.js`. Relacionado: `Schema_Laboratorio_v1.0.md` §5, `Laboratorio_Oraciones_Plan_Producto.md` §2.5, `Banco_reflexion_metalinguistica.md`. Terminología NGLE del proyecto: sintagma (nunca «grupo»), oración y O1/O2/O3 (nunca «proposición»), «para» nunca introduce CI.*
