# Convenciones lingüísticas y terminológicas

> **Cuándo cargar**: vas a escribir, revisar o corregir etiquetas de función sintáctica, subtipos de proposición, o cualquier texto que vea el alumno. **Cuándo NO**: dudas de arquitectura de código (usa `architecture.md` o `arquitectura.md` del repo) o de estado del proyecto (usa memoria).

Este documento es la fuente única de verdad sobre **qué palabras y abreviaturas se usan en cada parte del proyecto**. Cualquier cambio aquí debe ser explícitamente aprobado por Josele.

## 1. Funciones sintácticas (módulo oración simple, `Oraciones_Banco`)

### Argumentos
- `Sujeto`
- `CD` (NO «Complemento Directo»)
- `CI` (NO «Complemento Indirecto»)
- `Atr.` (con punto. NO «Atributo» ni «Atr»)
- `CPvo` (NO «Complemento Predicativo»)
- `C.Rég.` (con dos puntos. NO «C. Régimen», NO «C.Reg.», NO «Complemento de Régimen»)
- `C.Ag.` (con dos puntos. NO «C.Agente»)

### Adjuntos (los 8 CC permitidos)
- `CC Tiempo`, `CC Lugar`, `CC Modo`, `CC Causa`, `CC Finalidad`, `CC Compañía`, `CC Instrumento`, `CC Cantidad`
- **NO inventar más CC** (nada de «CC Procedencia», «CC Concesivo», «CC Condicional»). Si dudas: procedencia → CC Lugar; concesivo y condicional → CC Modo.

### Marcas
- `Marca.Pas.Ref.` (marca de pasiva refleja, con puntos finales)
- `Marca.Imp.` (marca de impersonalidad, con puntos finales)
- `Mod.Or.` (modificador oracional)
- `Vocat.` (vocativo)
- `Conector`

### Etiquetas prohibidas
- ❌ `Aposición` (no existe en el motor; el contenido va dentro del SN como `SN/CN`)
- ❌ `Dat.Et.` (dativo ético — no se etiqueta)
- ❌ `N (V. Pronominal)`, `N (V. Pasivo)` (no existen)
- ❌ «Modificador de la acción», «Atributo locativo», «Enlace», «Nexo» (en sintagmas preposicionales se usa solo `N`)

## 2. Sintagmas y estructura interna

- Tipos de sintagma: `SN`, `SP`, `SAdj`, `SAdv`, `SV`
- **«sintagma» NUNCA «grupo»** — esto es una decisión NGLE asumida en todo el proyecto.
- **«adyacente» NUNCA** — usar el nombre de la función real.
- **Preposición = núcleo del SP** — siempre etiquetada como `N`. El término del SP va envuelto en `SN/T`, `SAdj/T`, `SAdv/T`, `SP/T`.
- Etiquetas dentro de SN: `Mod/Det.` (determinante), `Mod/Cuant.` (cuantificador), `N` (núcleo), `SPrep/CN` (complemento preposicional del nombre), `SAdj/CN` (complemento adjetival), `SN/CN` (aposición).
- Etiquetas dentro de SAdj/SAdv: `Mod/Cuant.`, `N`.

## 3. Convenciones de sujeto

- Sujeto expreso: el sintagma tal cual (`El profesor`, `Los niños`).
- Sujeto tácito (elidido recuperable): `(S.O. Yo)`, `(S.O. Tú)`, `(S.O. Él/Ella)`, `(S.O. Nosotros/as)`, `(S.O. Vosotros/as)`, `(S.O. Ellos/as)`. S.O. = Sujeto Omitido.
- Oración impersonal o sin sujeto expreso: `---` (tres guiones).
- Pasiva refleja: el sujeto paciente es el SN que concuerda con el verbo (sin convención especial).

## 4. Regla dura: «para» NUNCA introduce CI

En PAU/EBAU Murcia, el CI se introduce **únicamente** por:
- preposición `a` («Le di un libro a María»)
- pronombre átono («Le di un libro»)

Los SP con `para` son **CC Finalidad**, no CI. Esto es innegociable.

## 5. Perífrasis verbales

- Son **un solo núcleo del predicado**.
- En la columna `Verbo` de `Oraciones_Banco` se escribe la perífrasis completa (`hay que estudiar`, `está trabajando`, `puede llover`).
- En el JSON de la oración simple no se desglosa en auxiliar + principal.
- En el JSON de oración compuesta v1.2:
  - `verbo.indice` apunta al **verbo léxico** (el último).
  - `verbo.indices_perifrasis` (opcional) lista todos los tokens de la perífrasis, incluido el verbo léxico.

## 6. Niveles

| Etiqueta interna | Nombre humano | Nivel escolar aprox. |
|---|---|---|
| `basico` / Aprendiz | Básico | Inicio ESO |
| `medio` / ESO34 | Medio | 3.º-4.º ESO |
| `avanzado` / Maestro | Avanzado | Bachillerato / EBAU |

## 7. Convenciones de oración compuesta (schema 1.2)

### Etiquetas visibles al alumno
- **`O1`, `O2`, `O3`** para identificar cada oración de la compuesta (NUNCA «PP», «PS», «pp», «ps», y NUNCA «P1/P2/P3»: esa era la convención de un diseño anterior que nunca llegó a implementarse así — corregido jul-2026 tras comprobar que `js/modules/compuestas/index.js` usa `O${n}` en todas partes, sin una sola excepción).
- La app llama a cada una **«oración»**, nunca «proposición», ni en las etiquetas cortas ni en el texto largo («Oración principal», «Oración subordinada», «Oración coordinada»). El campo interno del JSON sí se llama `proposiciones` (es el nombre del array en el schema), pero eso es dato, no texto que vea el alumno — no lo confundas con la terminología de interfaz.
- El orden O1, O2, O3 corresponde al orden de aparición en `ej.proposiciones[]`.

### Símbolos de relación
- Subordinación: `O1 → O2` (O1 contiene/rige a O2)
- Coordinación: `O1 ↔ O2` (mismo nivel)
- Yuxtaposición: `O1 ∥ O2` (mismo nivel, sin nexo)

### Redacción explícita
La forma canónica de explicar una relación es **en prosa completa, sin abreviaturas**:

> "La oración subordinada sustantiva (O2) funciona como complemento directo del verbo «dijo» dentro de la oración principal (O1)."

NO se usa redacción telegráfica tipo `pp ↘ ps : CD`.

Para casos de término de preposición + `funcion_sp`:

> "La oración subordinada sustantiva (O2) es término de la preposición que la introduce. El sintagma preposicional completo funciona como complemento de régimen (del verbo «se enteraron») dentro de la oración principal (O1)."

### Sujeto tácito en compuestas
- `analisis_interno.sujeto.tipo = "tacito"`, `indices: []` (vacío). NO añadir token Ø.
- Para sujeto impersonal: `tipo = "impersonal"`, `indices: []`.

### Pasiva refleja en compuestas
- El pronombre `se` se trata como token aparte.
- Dentro de `analisis_interno.funciones`, aparece con `tipo: "marca_pas_ref"` y `indices: [N]`.

### Conjunción completiva vs pronombre relativo
- **Conjunción `que`** (de completivas): NO va en `indices` de la PS. Solo en `nexos[]`.
- **Pronombre relativo `que/quien/donde/cuyo`**: SÍ va en `indices` de la PS, porque cumple una función interna dentro de ella.

### Negación
La palabra `no` de negación NO se etiqueta como función separada en `analisis_interno.funciones`. Se incluye en los `indices` del predicado o del CC correspondiente sin función propia.

## 8. Listas cerradas de subtipos y funciones (compuestas v1.2)

### Subtipos de coordinación
`copulativa`, `disyuntiva`, `adversativa`, `distributiva`, `explicativa`, `ilativa_coord`

### Subtipos de subordinación sustantiva
`sustantiva_sujeto`, `sustantiva_cd`, `sustantiva_atributo`, `sustantiva_termino_preposicion`, `sustantiva_aposicion`

⚠️ `sustantiva_c_regimen` **NO EXISTE** en schema 1.2. Si la PS es término de preposición, usa `sustantiva_termino_preposicion` + `funcion_sp` con el valor adecuado.

### Subtipos de subordinación relativa
`relativa_especificativa`, `relativa_explicativa`, `relativa_libre`, `relativa_semilibre`

### Construcciones (causales, finales, condicionales, concesivas, ilativas)
`condicional`, `final`, `causal`, `concesiva`, `ilativa_constr`

### Subordinadas adverbiales propias
`temporal`, `locativa`, `modal`, `comparativa`

### Funciones de la PS (campo `relacion.funcion`)
- Sustantivas: `sujeto`, `cd`, `atributo`, `termino_preposicion`, `aposicion`
- Relativas: `cn`, `incidental`, o también `sujeto`/`cd`/etc. si la relativa libre/semilibre lo asume
- Construcciones: `construccion_condicional`, `construccion_final`, `construccion_causal`, `construccion_concesiva`, `construccion_ilativa`
- Adverbiales: `cc_temporal`, `cc_locativo`, `cc_modal`, `cc_comparativo`
- Coordinadas/yuxtapuestas: `null`

### Valores válidos de `funcion_sp` (solo cuando subtipo = `sustantiva_termino_preposicion`)
`c_regimen`, `ci`, `cc`, `cn`, `c_adj`, `c_adv`, `atributo`

### Funciones del predicado (campo `analisis_interno.funciones[].tipo`)
`cd`, `ci`, `cc`, `atributo`, `cpvo`, `c_regimen`, `c_agente`, `marca_pas_ref`, `mod_oracional`, `vocativo`

> Nota: el campo `funciones[].tipo` usa `cc` genérico, no `cc_temporal`/`cc_locativo` etc. La subtipificación de CC vive solo en `relacion.funcion` para subordinadas adverbiales propias.
