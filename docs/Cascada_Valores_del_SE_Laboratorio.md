# Los siete valores de «se» — cascada de decisión y convivencia con Simples

**PASO 1 (diseño, sin código) · 19-ago-2026 · 🟣 Opus 5 · PENDIENTE DE APROBACIÓN**

Documento de diseño del ítem estrella del nivel `avanzado` del Laboratorio de Oraciones: la investigación abierta de los valores de *se* (Tipo 5 del marco — el alumno clasifica un corpus **por comportamiento** antes de recibir los nombres).

> **Qué se decide aquí:** el orden de las pruebas, qué separa cada valor de su vecino, y cómo conviven los siete valores del Laboratorio con las etiquetas del módulo Simples.
> **Qué NO se decide aquí:** la estructura JSON del ítem (PASO 2) ni una sola línea de código (PASO 3).

**Fuentes.** La lista de siete valores viene fijada por Josele en `proyecto_plan_de_trabajo_lengua/…/1BACH/Gramatica_02_Sintaxis-oracion-simple-y-compuesta_1BACH.md`, SESIÓN 4 («clave para la EBAU»). El fundamento NGLE (paradigmático / no paradigmático / variante de *le*) y el corpus vienen de `…/materiales/morfologia_sintaxis/Reflexion_sintactica_complet_1Bach.md` §5. Lo ya operativo en la app: `Banco_reflexion_metalinguistica.md` §10, `js/data/pruebas-sintaxis.js` (`PRU-SINT-SE-01`), `js/modules/maestro/index.js` (`MORPH_CASCADES`), `docs/Schema_Laboratorio_v1.0.md`.

---

## 1. Lo que ya existe hoy, y por qué se queda corto

`PRU-SINT-SE-01` y el §10 del banco de reflexión resuelven **una sola frontera de las seis**: pasiva refleja ↔ impersonal, con la prueba de la concordancia con el elemento pospuesto. Es un peldaño excelente —de hecho es el más rentable en EBAU— pero es el último de una cascada que empieza mucho antes: para llegar a preguntarse si el verbo concuerda con lo pospuesto, el alumno ya ha tenido que descartar que ese *se* sea un falso *le*, un reflexivo, un recíproco, un morfema del verbo o un dativo aspectual.

Los retos LB_0164-LB_0167 del lote avanzado ya usan `PRU-SINT-SE-01` correctamente. **Nada de lo que sigue los invalida**: la cascada completa los envuelve, no los sustituye.

---

## 2. La cascada completa: tres pruebas y un subpaso

El principio de ordenación es el del método: **primero lo que se ve, después lo que se manipula, y lo más fino al final**. Cada peldaño se decide con una manipulación, nunca con una pregunta al verbo.

```
                    ¿Qué valor tiene este «se»?
                              │
 P0 · ¿Va delante de lo / la / los / las?      ← prueba de la sustitución
          │ SÍ                                    (deshaz el pronombre del CD:
          │  «Se lo recordé» → «Recordé el          si reaparece "le/les", era él)
          │   examen a Ana» → «LE recordé»
          └──────────────► ① VARIANTE DE LE/LES
          │ NO
                              │
 P1 · ¿Cambia el «se» al cambiar la persona del sujeto?   ← prueba del paradigma
          │                                                  (la línea que traza
          │                                                   la NGLE en §5)
          ├── NO cambia («Se venden pisos» → *«me vendo pisos») ──► RAMA A
          └── SÍ cambia («Se lava» → «me lavo / te lavas»)      ──► RAMA B


 RAMA A · el «se» es fijo, siempre tercera persona (NO PARADIGMÁTICO)
 └ A1 · ¿Concuerda el verbo con el elemento pospuesto?   ← PRU-SINT-SE-01, ya existe
        ├── SÍ  «Se necesita un camarero / Se necesitan camareros» ──► ⑥ PASIVA REFLEJA
        └── NO  «Se busca al culpable / Se busca a los culpables»  ──► ⑦ IMPERSONAL

        Refuerzos (no deciden solos, confirman): la pasiva refleja admite pasiva
        equivalente («Los resultados serán publicados»); la impersonal aparece con
        verbo intransitivo y con «a + persona».


 RAMA B · el «se» alterna me/te/se/nos/os (PARADIGMÁTICO)
 └ B1 · ¿Admite «a sí mismo» o «el uno al otro»?   ← prueba del refuerzo
        ├── «a sí mismo/a»                    ──► ② REFLEXIVO
        ├── «el uno al otro / mutuamente»     ──► ③ RECÍPROCO
        │    (exige sujeto plural)
        └── ninguno de los dos ──────────────────► B2

        Subpaso común a ② y ③ · ¿hay OTRO CD en la oración?
              NO  → el «se» es CD   («Se peina» · «Se incordiaron»)
              SÍ  → el «se» es CI   («Se cortó el flequillo» · «Se lanzaron una mirada»)

 └ B2 · ¿Puedo quitar el «se»?   ← prueba de la supresión
        ├── SÍ, y la oración sigue diciendo lo mismo (solo pierde el matiz de
        │   'entero, de una vez'): «Se bebió el zumo» → «Bebió el zumo»
        │   + sujeto animado + CD delimitado             ──► ⑤ DATIVO ASPECTUAL
        └── NO: sin «se» la oración no existe («*Alfonso arrepintió») o el verbo
            pasa a decir otra cosa («El agua se salió» ≠ «El agua salió»)
                                                          ──► ④ MORFEMA VERBAL
```

**Por qué este orden y no otro.**

- **P0 va primero porque se ve.** Es el único peldaño que se resuelve mirando la oración: solo hay falso *le* delante de *lo/la/los/las*. Ponerlo el primero le ahorra al alumno aplicar tres pruebas a un caso que se cierra en un segundo. Y le vacuna contra la trampa gemela: en «Se **le** han caído los cuadros» hay *se* y hay *le*, y precisamente por eso ese *se* **no** es el falso *le*.
- **P1 es el tronco porque es la línea de la NGLE.** Paradigmático (varía con la persona) frente a no paradigmático (siempre *se*) es la partición que sostiene todo lo demás en §5 de la fuente. Además es una prueba barata y no falla nunca.
- **B1 va antes que B2, y este orden no es negociable.** La supresión sola no separa el dativo aspectual del reflexivo de CI: «Se lava las manos» → «Lava las manos» también es gramatical. Lo que las separa es que solo una admite «a sí misma». Si se invierte el orden, la cascada fabrica falsos dativos aspectuales.
- **B2 exige «sigue diciendo lo mismo», no «sigue funcionando».** Es la palanca fina del peldaño más difícil: «El agua salió de la garrafa» funciona, pero ya no dice lo que decía «El agua **se** salió». Ese matiz —la voz media— es lo que separa ④ de ⑤, y por eso el criterio se refuerza con dos rasgos objetivos del dativo aspectual: sujeto animado y CD delimitado.

---

## 3. La cascada, probada contra el corpus real

Las catorce oraciones del **ejercicio 5** de la fuente A2 pasadas por la cascada. Es la comprobación de que el diseño aguanta antes de escribir nada:

| # | Oración | P0 | P1 | Peldaño que decide | Valor | «se» = |
|---|---|---|---|---|---|---|
| a | Se ha despertado dos veces esta noche. | no | parad. | B2 · no se puede quitar | ④ morfema verbal | — |
| b | Ayer **se lo** recordé de nuevo. | **sí** | — | P0 · vuelve *le* | ① variante de *le* | CI |
| c | Se sabe la letra de memoria. | no | parad. | B2 · se quita, dice lo mismo | ⑤ dativo aspectual | — |
| d | Se publicarán los resultados en la web. | no | no par. | A1 · el verbo concuerda | ⑥ pasiva refleja | — |
| e | Se incordiaron varias veces en clase. | no | parad. | B1 · el uno al otro | ③ recíproco | CD |
| f | Se cortó el flequillo sin ayuda. | no | parad. | B1 · a sí misma | ② reflexivo | CI |
| g | El agua se salió de la garrafa. | no | parad. | B2 · quitarlo cambia el verbo | ④ morfema verbal | — |
| h | Se bajó la persiana por el sol. | no | *(las dos)* | **zona gris** (§4) | ⑥ / ⑤ | — |
| i | Se lanzaron una mirada desafiante. | no | parad. | B1 · el uno al otro | ③ recíproco | CI |
| j | Se recogió todo en pocos minutos. | no | no par. | A1 · el verbo concuerda | ⑥ pasiva refleja | — |
| k | Se trabaja hasta las tres. | no | no par. | A1 · el verbo no se mueve | ⑦ impersonal | — |
| l | Se considera una persona especial. | no | *(las dos)* | **zona gris** (§4) | ② / ⑥ | CD / — |
| m | Se bebió el zumo de limón sin azúcar. | no | parad. | B2 · se quita, dice lo mismo | ⑤ dativo aspectual | — |
| n | Se le han caído los cuadros de la pared. | no | parad. | B2 · no se puede quitar | ④ morfema verbal | — |

**Resultado: el ejercicio 5 cubre los siete valores** (3 morfema verbal, 3 pasiva refleja, 2 reflexivo, 2 recíproco, 2 dativo aspectual, 1 variante de *le*, 1 impersonal) y además regala dos ambigüedades genuinas. Es exactamente el corpus que pide un Tipo 5: para el reto principal no hace falta inventar ni una oración.

---

## 4. Las zonas grises que trae el corpus

Tres casos con dos análisis defendibles. En el schema son ítems `frontera` (`zona_gris: true`, dos opciones con `ok: true`, `peso: 2`, excluidos del examen):

- **«Se bajó la persiana por el sol»** — pasiva refleja (*la persiana fue bajada*) o dativo aspectual con sujeto personal (*él se bajó la persiana*). Se deshace añadiendo el sujeto.
- **«Se considera una persona especial»** — reflexivo (*se considera a sí mismo…*, con «una persona especial» como CPvo) o pasiva refleja (*se consideran personas especiales*). La pluralización decide.
- **«Se comunicó por correo»** (ejercicio 13 de la fuente, planteado ya por el libro como ambigüedad) — lectura activa (*Ana se comunicó por correo*) frente a pasiva (*se comunicó la decisión por correo*). El propio ejercicio pide deshacerla añadiendo sintagmas: es un `analisis_inverso` perfecto.

Los **ejercicios 11 y 12** son pares mínimos ya construidos para la frontera A1, y entran tal cual como ítems `par_minimo`: *Se entregó a tiempo* / *Se llegó a tiempo* · *Se entrará a las 9* / *Se terminará a las 9* · *Se trabajó poco el problema* / *Se trabajó poco en el problema* · *Se valora a los estudiantes* / *Se valora el estudio*.

---

## 5. El conflicto con Simples, resuelto

### 5.1 El diagnóstico corregido

El planteamiento de partida era: «el Laboratorio necesita siete valores y Simples solo etiqueta cuatro cosas». **Comprobado contra el código real, el desajuste es menor de lo que parecía, y el que va atrasado es el prompt, no el motor.**

`REGLA 2` de `PROMPT_Analisis_Sintactico_Simples_v1_3.md` lista cuatro salidas (`Marca.Pas.Ref.`, `Marca.Imp.`, pronominal, función plena). Pero la lista cerrada real —`FUNC_ORAC` en `js/glosario/tags.js`— tiene desde junio de 2026 dos etiquetas más que el prompt no menciona: **`Marca.Pron.`** y **`Dativo`**. Con esas seis, los siete valores caben sin ampliar nada.

Verificado en los datos reales del banco (`banco_export/…Oraciones_Banco.tsv`): `Marca.Pas.Ref.` 98 usos · `Marca.Pron.` 28 · `Marca.Imp.` 26 · `Dativo` **0**.

### 5.2 El mapa de convivencia

| # | Valor en el Laboratorio | Etiqueta en Simples | Estado |
|---|---|---|---|
| ① | variante de *le/les* | `CI` | ✔ ya en REGLA 2 («falso *se*») |
| ② | reflexivo | `CD` o `CI` (función plena) | ✔ ya en REGLA 2 |
| ③ | recíproco | `CD` o `CI` (función plena) | ⚠ **hueco**: REGLA 2 no lo nombra |
| ④ | morfema verbal | `Marca.Pron.` | ⚠ el prompt va por detrás del motor |
| ⑤ | dativo aspectual | `Dativo` | ⚠ etiqueta viva pero **sin un solo dato** |
| ⑥ | marca de pasiva refleja | `Marca.Pas.Ref.` | ✔ |
| ⑦ | marca de impersonal | `Marca.Imp.` | ✔ |

**Recomendación: NO ampliar `FUNC_ORAC`.** Los siete valores encajan en seis etiquetas que ya existen. Tocar la lista cerrada es caro (afecta a Simples, al glosario, a los colores, al validador y a ~450 oraciones del banco) y aquí no compra nada.

### 5.3 Un detalle del dato que hay que respetar

En los datos reales, `Marca.Pron.` **no se aplica al *se* suelto, sino al verbo entero**: el segmento es «se arrepintió», con estructura interna `{"se":"N (morf. pronominal)","arrepintió":"N"}`. Es coherente con la doctrina del proyecto (el verbo pronominal es un solo núcleo) y tiene consecuencia directa en el Laboratorio: cuando el alumno llegue a ④, lo que ha descubierto es que **ese *se* no ocupa ningún hueco del análisis porque es parte del verbo**. La cascada y el análisis dicen lo mismo con palabras distintas, y eso es justo lo que hay que hacerle ver.

### 5.4 Qué le decimos al alumno cuando vea nombres distintos

El riesgo es real: el mismo alumno de 1.º BACH usa los dos módulos, y el puente de ida a Simples (§9 del schema) puede llevarle a la misma oración con otro nombre encima. La respuesta honesta cabe en una frase:

> **El valor te dice qué es ese «se». La etiqueta te dice qué hueco ocupa en el análisis. No hay siete etiquetas porque no todos los valores ocupan hueco.**

Tres de los siete valores **sí** son una función, y ahí los dos módulos coinciden literalmente (① es CI; ② y ③ son CD o CI). Los otros cuatro **no son funciones**: dos avisan de que la oración es pasiva refleja o impersonal, uno avisa de que el *se* es parte del verbo, y el último es un dativo que se puede suprimir. Que en Simples aparezcan como «marcas» no es otra clasificación: es la misma, contada desde el análisis.

Propuesta de implementación (para PASO 3, no ahora): el cierre del reto muestra una **tabla de equivalencias de siete filas** —el valor descubierto, y con qué etiqueta lo verá en Simples—, y el botón «Practica esta oración en Simples» solo se ofrece después de esa tabla. Coste: un bloque de HTML estático, cero contenido por reto.

---

## 6. Lo que la cascada le pide al PASO 2 (avance, no decisión)

Cuatro cosas que el schema v1.0 hoy no cubre. Estado a 2026-08-20 (paso C):

1. ✅ **Cuatro pruebas nuevas en `js/data/pruebas-sintaxis.js`**: `PRU-SINT-SE-02` (paradigma), `-03` (a sí mismo / el uno al otro), `-04` (supresión), `-05` (sustitución por *le/les*). `-01` se queda intacta. Hecho en el paso A (commit `70c7444`).
2. ✅ **El campo `funcion` de una prueba no sirve para estas.** Resuelto sin ampliar el schema: SE-02 y SE-03 deciden una rama, no una función de `FUNC_ORAC`, así que se quedan sin `funcion` (el campo es opcional en toda prueba). SE-05 tampoco lo declara aunque resuelve CI, porque esa función ya tiene su prueba general (`PRU-SINT-CI-01`) y declararlo aquí la pisaría en `PRUEBA_DE_FUNCION`. Solo SE-04 lo declara (`['Marca.Pron.', 'Dativo']`), porque esas dos etiquetas no tenían ninguna otra prueba. Hecho en el paso A.
3. ✅ **Falta una causa de agramaticalidad.** Añadida como `impersonal_pluralizada` (nivel `avanzado`, veredicto `agramatical`) al validador y al schema en el paso A (commit `70c7444`), y completada con marca/etiqueta/ejemplo/criterio en `js/data/canon-agramatical.js` en el paso B (commit `a2514c3`), junto con `reciproco_sujeto_singular` y `verbo_pronominal_sin_se`, que el propio corpus de *se* también necesitaba y que no estaban previstas en esta lista original de cuatro puntos. 19 → 22 causas.
4. ✅ **Decidido, sin código todavía — un detalle del motor de cascadas.** El `dependsOn` de `MORPH_CASCADES` (`js/modules/maestro/index.js`, motor de morfología) compara contra **un** valor (`{step, val}`); el subpaso de función de §2 depende de dos (reflexivo *o* recíproco). Decisión: **admitir un array en `val`** (`{step:'refuerzo', val:['reflexivo','reciproco']}`, comprobado con `Array.isArray(val) ? val.includes(depVal) : depVal===val`), no duplicar el paso — duplicar crearía dos pasos con el mismo `id` lógico, lo que rompe cualquier cosa que indexe por paso (guardado de respuesta, render, corrección) y obliga a mantener dos copias sincronizadas del mismo texto. Es además el patrón que ya usa este mismo módulo para campos multivaluados (`funcion: ['Marca.Pas.Ref.', 'Marca.Imp.']` en SE-01, `['Marca.Pron.', 'Dativo']` en SE-04), así que es coherente con el resto del dato.
   **Sin implementar aún, a propósito:** el Laboratorio no tiene motor de cascada propio — SE-01..05 son fichas de pista (texto + `ok`/`no`), no un árbol de pasos ejecutable, y `MORPH_CASCADES` es el motor de morfología, un módulo distinto ya en producción que ningún paso de morfología necesita ampliar hoy. Tocarlo ahora sería una ampliación especulativa de un motor crítico para un consumidor que no existe todavía. La decisión queda anotada aquí para cuando el PASO 3 construya el árbol ejecutable del reto de investigación de "se" en el Laboratorio: ese motor nuevo nace ya admitiendo array en `dependsOn.val`, sin necesidad de tocar `MORPH_CASCADES`.

---

## 7. Lo que necesito que apruebes (PASO 1)

1. **La cascada de §2**: el orden P0 → P1 → {A1 | B1 → B2} y el subpaso de función.
2. **El diagnóstico de §5.1**: no se amplía `FUNC_ORAC`; el desajuste real está en `PROMPT_Analisis_Sintactico_Simples_v1_3.md`, que ignora `Marca.Pron.` y `Dativo` y no nombra el recíproco. Actualizarlo a v1.4 es tarea aparte de este módulo — dime si la abro o la dejo anotada.
3. **El mensaje al alumno de §5.4** y la tabla de equivalencias en el cierre del reto.
4. **Las tres zonas grises de §4** como ítems `frontera` (fuera del examen).
5. **El aviso de §6.3**: hace falta una causa nueva, `impersonal_pluralizada`.

---

*PASO 1 · diseño · 19-ago-2026. Terminología NGLE del proyecto: sintagma (nunca «grupo»), oración y O1/O2/O3 (nunca «proposición»), «para» nunca introduce CI.*
