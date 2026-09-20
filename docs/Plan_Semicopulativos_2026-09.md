# Plan · Verbos semicopulativos, microlección y orden aleatorio (sep-2026)

Origen: 20-sep-2026. Josele prueba «La biblioteca se veía vacía» en práctica libre y
la app da error tanto con Predicado Nominal como con Predicado Verbal. Además
observa que las oraciones semicopulativas «salen siempre las primeras».

Fuente lingüística: NGLE (Manual), §37-38 — resumen en
`docs/Nuevas_funciones_sintácticas/Verbos_Semicopulativos_Especificacion_Tecnica.md`
y en el .md que aportó Josele (definición, 3 pruebas, 3 clases: cambio /
permanencia / manifestación).

---

## 0. Diagnóstico (hecho el 20-sep-2026, sesión Opus)

### 0.1 «Siempre da error» — NO es un bug del motor ni de los datos

- La fila del banco está marcada como `Predicado Nominal (Semicopulativo)` y el
  GAS la sirve como `tipo_predicado: 'PNS'` (`Server/Code_v6.gs:593`).
- Desde jul-2026 (commit `dbe6103`) la fase 3 tiene **tres** respuestas: las dos
  tarjetas grandes PV / PN y, debajo, un botón pequeño, gris y discontinuo
  «PN·SC» (`js/modules/sint/index.js:2240`, `css/legacy.css:266`). Para una
  oración PNS, **solo PN·SC es correcta**: PV y PN cuentan como error.
- Ni el propio autor lo vio → es un **problema de diseño pedagógico y de
  interfaz**, no de código roto. Un alumno que razona bien («no es acción, es
  atributivo → PN») es penalizado por no haber visto un botón secundario.
- Agravantes encontrados al auditar:
  - `trackError('sintaxis','PNS')` no tiene micro-lección asociada:
    `ERROR_TO_LECCION` (`js/feedback/micro-lecciones.js:535`) no conoce `'PNS'`.
  - Las lecciones «PN y PV» (`pn_pv`) y «Atributo y CPvo» (`atr_cpvo`) no
    mencionan los semicopulativos.
  - `pistas-sint.js` solo tiene el par real PN / marcada PV. No hay andamiaje
    para real PNS / marcada PN ni real PNS / marcada PV: el alumno recibe el
    texto genérico del diccionario base.
  - El «Refuerzo personalizado» usa las funciones más falladas como filtro del
    banco; `'PNS'` como «función» no coincide con nada en `funciones_presentes`.
  - Sí existe: entrada `PNS` en el glosario (`diccionario-sintaxis.js:26`) con
    las 3 pruebas, y la ronda de Chispa «Atr. semicopulativo vs CPvo».

### 0.2 Datos: las 17 oraciones simples PNS son coherentes

Filas 643-659 de `banco_export/Oraciones_Banco.tsv`, todas `Activo = Sí`,
subfase `completo`, JSON válido, Atr. siempre presente, sintagma correcto.
Dos dudas lingüísticas para Josele — **resueltas el 20-sep-2026**:

| Oración | Duda | Decisión |
| :-- | :-- | :-- |
| El viaje se **me** hacía eterno. | «me» etiquetado CI. ¿Es CI o «Dativo» (de interés)? La app tiene ambas etiquetas. | Se queda como CI. |
| El candidato salió **elegido gobernador**. | Atr. = SAdj «elegido gobernador» (dif. 3). Correcto según NGLE, pero es el caso más duro del lote. | Se elimina del banco (no se rebaja de nivel). |

En compuestas hay 13 filas con semicopulativos (lote de jul-2026); el motor de
compuestas no distingue PNS y no necesita hacerlo (Atr. dentro de la O).

### 0.3 Orden aleatorio: NO se ha podido reproducir

- `shuffle()` (Fisher-Yates) es correcto y **se aplica** en práctica
  (`js/modules/sint/index.js:1607`). Ni misión activa, ni reto, ni filtros lo
  saltan. `Math.random` no está sobrescrito.
- Prueba empírica: 6 arranques de práctica libre contra el GAS real (658
  oraciones). Las 17 PNS quedan repartidas de forma uniforme; primeras
  oraciones distintas cada vez. 500 barajados en la propia página: media de
  0,38 PNS en cualquier ventana de 17 posiciones (lo esperado).
- Aritmética: con 17 PNS entre 658, la probabilidad de ver **al menos una** en
  las 10 primeras oraciones es ≈ 23 %; en las 20 primeras ≈ 41 %. Que
  «aparezcan pronto» es normal; que aparezcan **siempre las primeras** no lo
  sostiene el código. Hipótesis más probable: azar + sesgo de atención (se
  estaban buscando precisamente esas).
- La versión ligera (`data/banco-simple.json`, 165 oraciones) solo tiene 2 PNS:
  tampoco explica el patrón.

Conclusión: no se «arregla» algo que funciona. Se deja un **paso de
verificación con Josele** (§1, S0) antes de cerrar el punto.

---

## 1. Plan de ejecución (una sesión = un commit, salvo que se indique)

### S0 · Verificación del orden aleatorio (Josele solo, 10 min, sin Claude)

Tres entradas en práctica libre (versión completa, sin misión, sin filtros).
Anotar las 3 primeras oraciones de cada entrada. Si en las 3 entradas la
primera oración es semicopulativa → abrir sesión **Sonnet** con la consola
del navegador (F12 → Console) y pegar la línea `[_launchGame] oraciones: …`.
Si no → punto cerrado; se anota en `roadmap.md` como «no reproducible».

### S1 · Fase 3 en dos tiempos: PN → ¿copulativo o semicopulativo? — **Sonnet**, sesión nueva

Decisión de diseño (recomendada; alternativa B más abajo):

1. Se conservan **dos** tarjetas grandes: PV y PN. Desaparece el botón «minor».
2. Oración PNS + alumno marca **PN** → **correcto, sin error** (razonó bien:
   es oración atributiva, NGLE). Aparece un segundo paso corto dentro de la
   misma tarjeta: «¿Con qué tipo de verbo?» → «Copulativo (ser, estar,
   parecer)» / «Semicopulativo (ponerse, quedarse, seguir, verse…)».
3. Fallar el segundo paso sí cuenta (`pvpnErrors`, `trackError('sintaxis','PNS')`)
   y muestra andamiaje con las 3 pruebas (supresión, «lo» ✗, «así» ✓).
4. Oración PNS + alumno marca **PV** → error, con andamiaje específico
   real PNS / marcada PV (nuevo par en `pistas-sint.js`).
5. Oración PN «pura» + alumno marca PN → segundo paso también aparece
   (copulativo puro es la respuesta). Así el paso no delata que la oración es
   semicopulativa. Oraciones PV → sin segundo paso, como ahora.
6. Modo examen: mismo flujo, sin pistas (ya lo gobierna `G.mode`).
7. Etiqueta final: «✓ Predicado Nominal (verbo semicopulativo)».

Alternativa B (descartada salvo que Josele la prefiera): tres tarjetas iguales
PV / PN / PN·SC. Más simple, pero presenta PN·SC como categoría paralela a PN,
que no es lo que dice la NGLE.

Archivos: `js/modules/sint/index.js` (render fase 3 ≈ l. 2225-2295:
`pvpnLabel`, `selectPvPn`), `css/legacy.css` (`.pvpn-*`), `js/feedback/pistas-sint.js`
(pares PNS/PV, PNS/PN, PN/PNS), `js/data/diccionario-sintaxis.js` (revisar
texto PNS). Comprobar `node --check` y probar en navegador con «La
biblioteca se veía vacía» (banco real) y con la mock `m07` (sin API).
Nota: la versión ligera (`build-light.js`) copia `js/` entero, así que
hereda el cambio en la próxima build; avisar al informático si ya tiene copia.

### S2 · Micro-lección «Verbos semicopulativos» — **Opus** (contenido pedagógico), sesión nueva

- Nueva entrada `'semicopulativos'` en `MICRO_LECCIONES`
  (`js/feedback/micro-lecciones.js`), mismo formato que `pn_pv` / `atr_cpvo`:
  - Bloque concepto: «el verbo que se vació» (gramaticalización), las 3
    pruebas en tabla, las 3 clases NGLE con 2-3 verbos cada una
    (cambio: ponerse, hacerse, volverse, quedarse, salir · permanencia:
    seguir, permanecer, continuar, andar, mantenerse · manifestación: verse,
    encontrarse, mostrarse, lucir, presentarse).
  - 3-4 quiz: (a) ¿PN o PV? con verbo semicopulativo; (b) Atr. vs CPvo (mismo
    verbo con sentido pleno vs vaciado: «salió a la calle» / «salió redondo»);
    (c) prueba del «lo»: ser/estar vs quedarse; (d) clase semántica.
- Mapeo: `ERROR_TO_LECCION['PNS'] = 'semicopulativos'`.
- Un párrafo puente en `pn_pv` («ser/estar/parecer… y sus primos vaciados») y
  otro en `atr_cpvo` (semicopulativo → Atributo obligatorio, no CPvo).
- Terminología: «sintagma», «oración», PAU; nunca «grupo» ni casos latinos.

### S3 · Rastro del error PNS en analíticas e informes — ✅ HECHO (20-sep-2026)

- Excluir `'PN'`, `'PV'`, `'PNS'` del filtro de banco del «Refuerzo
  personalizado» — hecho en commits 38084db/9c6f176/9380580 (`CLAVES_NO_FILTRABLES`
  en `js/feedback/tracking.js`).
- Etiqueta legible («Tipo de predicado (semicopulativo)») para `'PNS'` —
  commit `4e060cc`. Al auditar se descubrió que el dato ni siquiera llegaba
  al backend (no había columna para PN/PV/PNS en `Alumnos_Resultados` ni
  `Sesiones_Practica`), así que la tarea creció de "poner una etiqueta" a
  tender el tubo completo:
  - `sint/index.js`: contador `se.pnsErrors` (paralelo a `pvpnErrors`, solo
    cuenta la confusión copulativo/semicopulativo) → `computeErrByFunc_` →
    `submitResult`/`sendPracticeAnalytics` (`errPNS`).
  - Resumen de sesión: desglose por función y "Tendencia general" usan
    `errorLabel()` (`js/feedback/tracking.js`) en vez de la clave cruda.
  - `Code_v6.gs`: columna nueva `Err_PNS` en ambos sheets; `getInformeProfesor_`
    agrega directamente con la etiqueta legible (`ETIQUETA_PNS_`), así que
    el informe Excel del profesor (hoja 🎯 Diagnóstico, top errores por
    alumno/grupo/global) la hereda sin tocar `informe-excel.js`.
  - Redesplegado como Nueva versión y verificado end-to-end: petición real
    de prueba (`saveSesionPractica`, grupo `TEST_E2E_PNS`) → `{"ok":true}` →
    confirmado por Josele en el informe Excel real con la etiqueta correcta.

### S4 · Datos: dudas del lote y ampliación — ✅ decisiones tomadas 20-sep-2026

- «El viaje se me hacía eterno.»: se queda como CI, sin cambios.
- «El candidato salió elegido gobernador.»: se elimina del banco (fila 656 del
  TSV local `banco_export/Oraciones_Banco.tsv`, ya borrada; **pendiente que
  Josele borre la fila equivalente en la hoja `Oraciones_Banco` del Sheet**,
  que es la fuente real — el TSV es solo un espejo local ignorado por git).
- Ampliación a ~30 oraciones: descartada por ahora. El banco se queda en 16
  oraciones PNS activas tras el borrado.

### S5 · Cierre — **Sonnet** (o al final de S3)

- `roadmap.md`: mover a hecho; `deuda_tecnica.md`: nada nuevo si S3 cierra limpio.
- Memoria de Claude: `project_semicopulativos.md`.
- Recordatorio vigente: integración iDoceo (pendiente de la plantilla de
  ponderación de Josele, fin de sept-2026).

---

## 2. Orden y dependencias

S0 (Josele) ∥ S1 → S2 → S3 → S5. S4 es independiente y puede ir cuando se quiera.
S1 y S2 son las que ve el alumno; se despliegan al hacer push (GitHub Pages).
Ambas hacen la app **más benévola** (PN deja de ser error en PNS), así que
no hay riesgo de perjudicar notas en curso.

Estimación: S1 ≈ 1 sesión media; S2 ≈ 1 sesión media; S3 ≈ 1 sesión corta;
S4 ≈ 1 sesión corta + generación de lote.
