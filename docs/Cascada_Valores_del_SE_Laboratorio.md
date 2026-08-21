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
- **«Se considera una persona especial»** — reflexivo (*se considera a sí mismo…*, con «una persona especial» como CPvo) o pasiva refleja («una persona especial» como sujeto de la pasiva). **Corrección 21-ago-2026, tras revisión externa**: aquí decía que la pluralización decide («se consideran personas especiales»), y es falso — el plural sigue admitiendo la lectura reflexiva con sujeto tácito plural (*[ellos] se consideran personas especiales*), así que no desambigua nada. Lo que sí deshace la duda es un **sujeto explícito** (*ella se considera una persona especial* → fuerza reflexivo), el mismo mecanismo que ya usa el caso de la persiana de arriba.
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

## 8. PASO 2 (diseño del ítem, sin código) · 20-ago-2026 · PENDIENTE DE APROBACIÓN

Qué se decide aquí: la estructura JSON del décimo tipo de ítem del schema, `investigacion`. Qué NO se decide: ni una línea del motor que lo ejecuta (PASO 3) — pero para dibujar el JSON hace falta asumir cómo lo va a leer ese motor, así que esta sección da por buena la decisión de §6.4 (`dependsOn` con array) y la aplica.

### 8.1 Dónde vive: un tipo de motor más, no una estación nueva

El schema (`Schema_Laboratorio_v1.0.md` §3) tiene nueve tipos de ítem repartidos en tres estaciones fijas, y ninguno sirve para esto: `investigacion` no es una manipulación (no hay una única `oracion` + `objetivo` + resultado), no es un juicio, y no es `etiqueta_prueba` porque ahí el sintagma **ya viene etiquetado** y solo hay que citar la prueba — aquí no hay etiqueta hasta el último peldaño. Hace falta un tipo nuevo.

**Propuesta: estación 3.** La definición de esa estación en el plan de producto (`Laboratorio_Oraciones_Plan_Producto.md` §2.3) es «nombrar lo ya conquistado y elegir la prueba que lo demuestra» — que es exactamente lo que hace cada peldaño de la cascada: el alumno no manipula la oración, elige qué prueba aplica y por qué, y al final nombra el valor. Es la misma mecánica que `etiqueta_prueba` (3.1: «¿qué prueba lo demuestra?»), repetida varias veces en cadena en vez de una sola.

Consecuencia de esta propuesta sobre las reglas de composición del reto (§2.1 del schema): un reto de "se" satisface la regla «al menos un ítem de estación 3» solo con `investigacion`, pero sigue necesitando **al menos un ítem de estación 1 y de estación 2** (probablemente un `juicio` con alguna de las tres causas nuevas) para no romper esa regla — no puede ser un reto hecho solo de `investigacion`. Lo marco como pregunta abierta en §8.7: es la primera vez que el módulo pide un reto con esta forma.

### 8.2 El repertorio compartido: `CASCADA_SE`

Igual que las pruebas de la §8 del schema no se escriben en cada reto (§7.3: «el contenido pedagógico se ancla por repertorio, no por reto»), **el árbol de la cascada tampoco**. Vive una sola vez, junto a `PRUEBAS_SINTAXIS` en `js/data/pruebas-sintaxis.js`; cada ítem solo aporta el camino que recorre una oración concreta.

Aplicando la cascada de §2 y reutilizando, donde ya existen, los valores cerrados que SE-01 y SE-04 declaran en su propio campo `funcion` (así no se inventa una segunda codificación para lo mismo):

```js
export const CASCADA_SE = [
  { id: 'sustitucion',  pruebaId: 'PRU-SINT-SE-05',
    opts: ['si', 'no'] },                                    // P0 · ¿reaparece le/les?

  { id: 'paradigma',    pruebaId: 'PRU-SINT-SE-02',
    dependsOn: { paso: 'sustitucion', val: 'no' },
    opts: ['cambia', 'no_cambia'] },                          // P1 · tronco

  { id: 'concordancia', pruebaId: 'PRU-SINT-SE-01',
    dependsOn: { paso: 'paradigma', val: 'no_cambia' },
    opts: ['Marca.Pas.Ref.', 'Marca.Imp.'] },                 // A1 · reusa los valores que SE-01 ya declara

  { id: 'refuerzo',     pruebaId: 'PRU-SINT-SE-03',
    dependsOn: { paso: 'paradigma', val: 'cambia' },
    opts: ['a_si_mismo', 'uno_al_otro', 'ninguno'] },          // B1

  { id: 'funcion',      pruebaId: null,
    dependsOn: { paso: 'refuerzo', val: ['a_si_mismo', 'uno_al_otro'] },
    opts: ['CD', 'CI'] },                                     // subpaso · sin prueba propia, es «¿hay otro CD?»

  { id: 'supresion',    pruebaId: 'PRU-SINT-SE-04',
    dependsOn: { paso: 'refuerzo', val: 'ninguno' },
    opts: ['Marca.Pron.', 'Dativo'] },                         // B2 · reusa los valores que SE-04 ya declara
];
```

Notas de esta tabla:

- **`sustitucion`, `paradigma` y `refuerzo` inventan nombres de rama** (`cambia`/`no_cambia`, `a_si_mismo`/`uno_al_otro`/`ninguno`) porque, tal como ya explica el comentario de SE-02/SE-03 en el código, esos peldaños deciden una familia, no una función — no hay una etiqueta de `FUNC_ORAC` que resumirles.
- **`concordancia` y `supresion` NO inventan nada**: usan literalmente los mismos strings que SE-01 y SE-04 ya declaran en su `funcion` (`Marca.Pas.Ref.`/`Marca.Imp.`, `Marca.Pron.`/`Dativo`). Un peldaño y su prueba dicen lo mismo con el mismo dato — coherente con lo que ya pedía el punto 3 de §5.4.
- **`funcion` reusa `CD`/`CI` de `FUNC_ORAC` tal cual**, no una versión en minúscula: es el mismo campo que ya usa `objetivo.funcion` en `manipulacion` y `etiqueta_prueba`, así que el validador puede comprobarlo contra la misma lista cerrada sin código nuevo.
- El `dependsOn` con array de `funcion` es la aplicación directa de la decisión de §6.4.

### 8.3 El ítem `investigacion`

```json
{ "tipo": "investigacion",
  "oracion": "Se cortó el flequillo sin ayuda.",
  "camino": { "sustitucion": "no", "paradigma": "cambia", "refuerzo": "a_si_mismo", "funcion": "CI" },
  "valor": "reflexivo",
  "funcion_final": "CI",
  "explicacion": "Admite «se cortó el flequillo a sí misma»: reflexivo. Y como ya hay otro CD en la oración («el flequillo»), el «se» no puede ser también CD — tiene que ser CI.",
  "fuente_id": "A2-EJ5-f" }
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `oracion` | ✔ | La oración sobre la que se investiga. Misma regla que `manipulacion`: si está en el `corpus` del reto, mejor (AVISO si no). |
| `camino` | ✔ | Objeto `{ id_del_paso: valor_elegido }`, **exactamente** los pasos de `CASCADA_SE` cuyo `dependsOn` queda satisfecho por los pasos anteriores del propio `camino` — ni de más ni de menos. Es el mismo papel que `correctAtrs` en `MORPH_CASCADES` (`js/modules/maestro/index.js`): la ruta correcta que el motor comprueba paso a paso, mostrando solo lo que aplica. |
| `valor` | ✔ | Uno de los **siete valores** (lista cerrada nueva, `VALORES_SE`): `variante_le` · `reflexivo` · `reciproco` · `morfema_verbal` · `dativo_aspectual` · `pasiva_refleja` · `impersonal`. Tiene que ser consistente con el último paso de `camino` (tabla de derivación en §8.4) — lo comprueba el validador, no se confía en que quien escribe el lote haga la cuenta bien. |
| `funcion_final` | según `valor` | Solo los tres valores que **sí** son una función real en Simples la llevan (§5.2 del documento): `variante_le` → siempre `CI`; `reflexivo`/`reciproco` → `CD` o `CI`, el que diga `camino.funcion`. Los otros cuatro (morfema verbal, dativo aspectual, pasiva refleja, impersonal) no llevan este campo — no ocupan hueco de función, son marcas, y forzarles un valor sería inventar un dato falso. |
| `explicacion` | ✔ | Igual que en `juicio`: qué se ha descubierto, en lenguaje de alumno — nunca «es CI», sino el mecanismo. |
| `fuente_id` | — | Aquí no es `PM-SINT-NN`: las 14 oraciones no vienen del banco R-07 sino del ejercicio 5 de la fuente A2 citada en §1. Propongo `A2-EJ5-a`..`A2-EJ5-n` (letra de la fila de la tabla de §3), formato nuevo que habría que sumar al patrón validado de `fuente_id` (`^PM-SINT-\d{2}$` \| `^AI-SINT-\d{2}$` hoy). |

**Por qué `valor` va explícito y no se deriva en tiempo de ejecución.** Podría calcularse siempre desde el último paso de `camino` (es una tabla fija de 7 filas). Se guarda explícito de todos modos por el mismo motivo que `juicio` guarda `causa` Y `veredicto` pudiendo derivarse uno del otro: es más barato para el validador comparar dos campos que reimplementar la lógica de la cascada, y un lote mal escrito lo delata al instante en vez de fallar en silencio en el motor.

### 8.4 Contra el corpus real: las doce oraciones que no son zona gris

Las 14 filas del ejercicio 5 (§3) menos las dos zonas grises (h, l — van como `frontera`, no como `investigacion`, ver §8.5) y confirmando que el diseño cubre los siete valores sin huecos:

| # | `camino` | `valor` | `funcion_final` |
|---|---|---|---|
| a | `{sustitucion:no, paradigma:cambia, refuerzo:ninguno, supresion:Marca.Pron.}` | `morfema_verbal` | — |
| b | `{sustitucion:si}` | `variante_le` | `CI` |
| c | `{sustitucion:no, paradigma:cambia, refuerzo:ninguno, supresion:Dativo}` | `dativo_aspectual` | — |
| d | `{sustitucion:no, paradigma:no_cambia, concordancia:Marca.Pas.Ref.}` | `pasiva_refleja` | — |
| e | `{sustitucion:no, paradigma:cambia, refuerzo:uno_al_otro, funcion:CD}` | `reciproco` | `CD` |
| f | `{sustitucion:no, paradigma:cambia, refuerzo:a_si_mismo, funcion:CI}` | `reflexivo` | `CI` |
| g | `{sustitucion:no, paradigma:cambia, refuerzo:ninguno, supresion:Marca.Pron.}` | `morfema_verbal` | — |
| i | `{sustitucion:no, paradigma:cambia, refuerzo:uno_al_otro, funcion:CI}` | `reciproco` | `CI` |
| j | `{sustitucion:no, paradigma:no_cambia, concordancia:Marca.Pas.Ref.}` | `pasiva_refleja` | — |
| k | `{sustitucion:no, paradigma:no_cambia, concordancia:Marca.Imp.}` | `impersonal` | — |
| m | `{sustitucion:no, paradigma:cambia, refuerzo:ninguno, supresion:Dativo}` | `dativo_aspectual` | — |
| n | `{sustitucion:no, paradigma:cambia, refuerzo:ninguno, supresion:Marca.Pron.}` | `morfema_verbal` | — |

Las doce caben en la forma propuesta sin excepciones ni campos ad hoc, y entre ellas agotan los siete valores (③ y ⑥ y ④ y ⑤ aparecen dos veces cada uno, como ya contaba §3). Es la comprobación de que el JSON aguanta antes de aprobarlo, igual que §3 lo fue para la cascada misma.

### 8.5 Lo que NO cambia

Confirmado contra §4 y §7 del PASO 1, que ya lo decidían y este paso no toca:

- Las **tres zonas grises** (h, l, y «Se comunicó por correo») siguen siendo ítems `frontera` — el tipo ya existe, con sus dos `opciones` de `ok: true`, `peso: 2` y fuera del examen por `zona_gris: true`. No usan `investigacion`.
- Los **pares mínimos de los ejercicios 11-12** siguen siendo `par_minimo` tal cual. Tampoco usan `investigacion`.

`investigacion` es solo para el peldaño de clasificación por comportamiento — el resto del reto de "se" se sigue construyendo con los nueve tipos que ya existían.

### 8.6 Ajustes que le pediría al schema (propuesta, no aplicada todavía)

Si se aprueba lo de arriba, `Schema_Laboratorio_v1.0.md` necesitaría, en el mismo commit que dé de alta el motor (PASO 3):

1. Añadir `investigacion` a la tabla de §3 (décimo tipo, estación 3 — o la que se decida en §8.7.1).
2. Documentar `CASCADA_SE` junto al catálogo de `prueba_id` (§8 del schema), con la misma lógica de «se fija ahora, se implementa después» que ya se usó con los diez `prueba_id` originales.
3. Sumar `VALORES_SE` a la lista de listas cerradas de §7.2.
4. Sumar el patrón `^A2-EJ5-[a-n]$` (o el que se decida) a los formatos válidos de `fuente_id` del §8 del schema.
5. Una regla de validación específica: que `camino` no tenga pasos de más ni de menos según el `dependsOn` de `CASCADA_SE`, y que `valor`/`funcion_final` sean consistentes con el último paso — es la parte no trivial del validador nuevo, y la única realmente distinta de lo que el validador ya sabe hacer.

### 8.7 Lo que necesito que apruebes (PASO 2)

1. **8.7.1 — La estación.** Propongo estación 3. Si no convence, la alternativa es estación 2 (encaja peor con la definición del plan, pero es defendible porque cada peldaño *manipula* una prueba antes de nombrar nada). Sea cual sea, hay que decidir si un reto de "se" puede saltarse el ítem obligatorio de estación 2 o si tiene que llevar igualmente un `juicio` — mi lectura es que no se salta nada: un reto de "se" lleva su `investigacion` (estación 3) Y su `juicio` con alguna de las tres causas nuevas (estación 2), como cualquier otro reto `avanzado`.

   **✅ APROBADO por Josele (21-ago-2026): estación 3, y el reto lleva investigacion (estación 3) + juicio (estación 2).**
2. **La forma de `camino`**: objeto `{paso: valor}` en vez de, por ejemplo, un array ordenado de pasos. Lo propongo así porque es más corto de escribir a mano y más fácil de validar (basta mirar las claves), pero pierde el orden explícito en que el alumno los recorrió — que el motor puede reconstruir solo con el propio `dependsOn`, así que no debería hacer falta.

   **✅ APROBADO por Josele (21-ago-2026): objeto `{paso: valor}`.**
3. **Que `valor` vaya explícito y no derivado** (razón en §8.3), igual que `causa` + `veredicto` en `juicio`.

   **✅ APROBADO por Josele (21-ago-2026): `valor` explícito.**
4. **El formato nuevo de `fuente_id`** para las 14 oraciones del ejercicio 5, `A2-EJ5-[a-n]`.

   **✅ APROBADO por Josele (21-ago-2026): `A2-EJ5-[a-n]`.**
5. **Los cinco ajustes de §8.6** al schema, para cuando arranque el PASO 3.

   **✅ APROBADO por Josele (21-ago-2026): los cinco.**

**PASO 2 aprobado en su totalidad (21-ago-2026). Se continúa con el PASO 3.**

---

## 9. PASO 3 y PASO 4 — hecho (21-ago-2026)

Motor completo, de dato a pantalla:

- **PASO 3** (código, sin contenido): `CASCADA_SE` + `VALORES_SE` en `js/data/pruebas-sintaxis.js`; el tipo `investigacion` documentado en `Schema_Laboratorio_v1.0.md` (§3.10, §7.2, §8.1); el modo `laboratorio` de `scripts/validar-banco.mjs` valida `camino` (sin pasos de más ni de menos, según el propio `dependsOn` de la cascada), `valor` (derivado de la tabla de §8.4 y comparado contra lo declarado) y el formato `A2-EJ5-[a-n]` de `fuente_id`.
- **PASO 4** (motor visual, `js/modules/laboratorio/index.js`): el ítem se juega peldaño a peldaño, con el rastro de lo recorrido visible encima de la pregunta viva. Decisión pedagógica de Josele: al fallar un peldaño se corrige y se **reconduce** al camino bueno — nunca se deja seguir una rama falsa hasta el final — y el ítem solo cuenta como acierto si no hubo ningún fallo. Al cerrar, conquista la prueba que decidió el valor (Caja de Pruebas del Detective, igual que `etiqueta_prueba`) y, al cerrar el **reto**, si hubo alguna investigación limpia, muestra la tabla de equivalencias de 7 filas de §5.4 (valor → etiqueta en Simples).

**Contenido real** (`banco_export/Laboratorio_Banco_avanzado_lote1.tsv`, bloque H, LB_0184-LB_0187): las 12 oraciones no ambiguas de §8.4 más las 2 zonas grises de §4 (`h`, `l`, como ítems `frontera`), agrupadas por la frontera que cada una prueba — B2 (morfema verbal ↔ dativo aspectual), B1 (reflexivo ↔ recíproco), A1 (pasiva refleja ↔ impersonal) y P0 (variante de *le*). Los tres juicios agramaticales de las causas nuevas de §5 usan literalmente los ejemplos que ya fijaba este documento (`*Alfonso arrepintió`, `*Ana se escribieron cartas`, `*Se han pagado a todos los proveedores`) — no se inventó ningún ejemplo agramatical nuevo. Validado con `scripts/validar-banco.mjs` (0 errores sobre las 24 filas del archivo) y jugado entero en el navegador contestando bien los cuatro retos (100 % en los cuatro, cero errores de consola). La tercera zona gris del ejercicio 13 (*Se comunicó por correo*, pensada como `analisis_inverso`) queda sin escribir — es la única pieza de §3-§4 que no entró en este bloque.

**Pendiente real, no de diseño:** pegar las 4 filas nuevas de `Laboratorio_Banco_avanzado_lote1.tsv` (bloque H) en el Google Sheet — el archivo local es la fuente de trabajo, el Sheet es la fuente de verdad de producción.

---

*PASO 1 · diseño · 19-ago-2026 · PASO 2 · diseño del ítem · 20-ago-2026 · aprobado 21-ago-2026 · PASO 3 (motor de datos) y PASO 4 (motor visual + contenido del bloque H) · 21-ago-2026. Terminología NGLE del proyecto: sintagma (nunca «grupo»), oración y O1/O2/O3 (nunca «proposición»), «para» nunca introduce CI.*
