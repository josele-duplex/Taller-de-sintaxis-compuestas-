# Plan B4 — Examen mixto (simples + compuestas) · Diseño federado

**Fecha del estudio:** 2026-07-09 · **Estado:** aprobado por Josele, pendiente de implementar.
**Historia:** el diseño original (memoria `project_evaluacion_examenes_plan` §7, mayo 2026) fue
DESCARTADO por Josele el 2026-05-28 por su riesgo: hoja monolítica con los dos payloads,
hoja de resultados nueva, y alternancia de motores por ejercicio ("mezclado"). Este plan lo
REABRE con una arquitectura distinta que elimina ese riesgo. **Este documento sustituye al §7
del plan antiguo — no implementar aquello.**

---

## 1. Idea central: federar, no fusionar

Un examen mixto = **un examen de simples + un examen de compuestas que comparten PIN**,
encadenados en secuencia estricta ("Parte 1 → Parte 2"), cada uno corriendo en su motor
intacto, guardando en su hoja de siempre. La nota global ponderada **se calcula al leer**
(vista servidor), nunca se escribe como dato duplicado.

Qué NO se hace (y por qué):

| Descartado | Motivo |
|---|---|
| Hoja `Examenes_Mixtos` | Innecesaria: el marcador y los pesos caben en 3 columnas nuevas de `Examenes_Config` (auto-migradas por `ensureSheetHeaders_`) |
| Hoja `Mixtos_Resultados` | Peligrosa: duplicaría datos que ya viven en `Alumnos_Resultados` + `Compuestas_Resultados` y podría desincronizarse. La nota global es una **vista** calculada al leer |
| Modo "mezclado" (alternar motores por ejercicio) | Era EL riesgo señalado en el plan antiguo (§9): coordinar el ciclo de vida de dos motores en la misma sesión. Con secuencia estricta agrupada ese problema desaparece. Pedagógicamente el examen por bloques es lo normal (EBAU también) |
| `saveResultadoExamenMixto_` | No hay nada nuevo que guardar: cada parte usa su endpoint de siempre (`saveResult` / `saveResultadoCompuesta`), con su anti-duplicado ya probado |

## 2. Decisiones pedagógicas (cerradas con Josele, 2026-07-09)

1. **Pesos configurables al crear el examen; default simples 40% / compuestas 60%.**
   Validar que sumen 100.
2. **El alumno ve la nota de cada parte al terminarla** (comportamiento actual de cada
   motor, sin tocar) **y la nota global ponderada al final de la Parte 2.**
3. **Parte 2 no realizada → estado «incompleto»**: el panel/informe muestra la nota de
   simples y el aviso; NO se calcula nota global automática con 0. El profesor decide.
4. **Orden fijo: Parte 1 simples → Parte 2 compuestas** (dificultad ascendente).
5. **Timer independiente por parte** (cada motor ya tiene el suyo; el profesor fija ambos
   al crear).
6. **Nomenclatura**: para el profesor «Examen mixto»; para el alumno **«Examen en dos
   partes»** («Parte 1 · Oraciones simples», «Parte 2 · Oración compuesta»). Terminología
   NGLE de siempre; P1/P2/P3, nunca PP/PS.

## 3. Diseño técnico

### 3.1 Backend (GAS) — todo en `server/Code_v6.gs` salvo lo indicado

**a) 3 columnas nuevas en `Examenes_Config`** (vía `ensureSheetHeaders_`, sin migración manual):
`Mixto` ('Sí'/''), `Peso_Simples` (número, ej. 40), `Peso_Compuestas` (número, ej. 60).

**b) `crearExamenMixto_(params)`** — endpoint nuevo con `requiereClaveProfesor_`. Orquesta:
1. Llama a `createExam_(paramsSimples)` (mismo PIN). Si falla → devuelve el error, no sigue.
2. Llama a `createExamenCompuesta_(paramsCompuestas)` (mismo PIN, `Compuestas.gs:368`).
3. **Rollback si el paso 2 falla**: poner `Estado='cerrado'` en la fila recién creada de
   `Examenes_Config` y devolver `{ok:false, error:'...'}` explicando qué mitad falló
   (típico: filtros de compuestas sin resultados). Nunca dejar medio examen activo.
4. Si ambas van bien: escribir `Mixto='Sí'` + pesos en la fila de `Examenes_Config` e
   invalidar la caché `exam_<pin>` (para que `getExamConfig_` sirva el flag).
5. Ambas funciones create ya cierran exámenes activos previos con el mismo PIN en su
   propia hoja — la coherencia de cierre es automática.

Parámetros: `{pin, grupo, evaluacion, nombreExamen, pesoSimples, pesoCompuestas,`
`simples:{nOraciones, timerMin, subfase, funciones...}, compuestas:{tipoOracion, subtipo,`
`nivelMax, nProposicionesMax, nEjercicios, timerMin, fasesActivas}}`. Validar
`pesoSimples+pesoCompuestas===100` y PIN `/^\d{4,6}$/`.

**c) `getExamConfig_` devuelve el flag**: si la fila tiene `Mixto==='Sí'`, añadir al JSON de
respuesta `mixto:true, pesoSimples, pesoCompuestas`. OJO: la respuesta se cachea
(`exam_<pin>`) — el flag debe entrar ANTES de cachear.

**d) `getResultadosMixtos_(params)`** — endpoint nuevo con `requiereClaveProfesor_`. Es la
"vista join": dado `pin` (o listado de todos los PIN con `Mixto='Sí'`):
1. Lee pesos de `Examenes_Config`.
2. Lee `Alumnos_Resultados` filtrado por PIN → mapa email→{nota, nombre, grupo, fecha}.
3. Lee `Compuestas_Resultados` filtrado por PIN → ídem.
4. Join por email (normalizado lowercase/trim):
   - ambas partes → `notaGlobal = notaS*pesoS/100 + notaC*pesoC/100` (redondeo 1 decimal),
     `estado:'completo'`
   - solo parte 1 → `notaGlobal:null, estado:'incompleto_p2'`
   - solo parte 2 (raro pero posible) → `notaGlobal:null, estado:'incompleto_p1'`
5. Devuelve `{ok:true, pesos:{...}, resultados:[{email,nombre,grupo,notaSimples,`
   `notaCompuestas,notaGlobal,estado}]}`.
Todo por nombre de columna (`getColMap_`), nunca por índice.

**e) Registro en dispatchers**: `crearExamenMixto` y `getResultadosMixtos` como actions de
`doGet` (con guard de clave, mismo patrón que `createExam`). Añadir JSDoc (convención B7).

**f) Correo automático tras examen** (`InformeExamen.gs:60`, `_enviarInformeExamenAlumno_`,
invocado desde `saveResult_` ~Code_v6.gs:2138): hoy solo simples envía correo; compuestas
no envía nada. En examen mixto el alumno recibiría 1 correo tras la Parte 1 con solo la
nota de simples → confuso. **Decisión: en `saveResult_`, si la fila de `Examenes_Config`
del PIN tiene `Mixto='Sí'`, NO llamar a `_enviarInformeExamenAlumno_`** (marcar
`Email_Enviado='mixto_pendiente'`). El correo del mixto (con las 3 notas) queda como
mejora futura del menú manual de `EnviarInformes.gs` — apuntado en §6, no bloquea.

### 3.2 Frontend

**a) Entrada (sin cambios de UX para el alumno)**: entra por el módulo Simples, modo
Examen, con su PIN — flujo actual de `sint/index.js:1281-1342`. Al recibir la config, si
`d.mixto === true`:
- guardar en `sessionStorage` `taller_mixto_<pin>` = `{pesoSimples, pesoCompuestas,
  grupo, evaluacion, nombreExamen}`;
- mostrar aviso previo (modal o banner en la pantalla de carga): «Este examen tiene dos
  partes: Parte 1 · Oraciones simples (X min) y Parte 2 · Oración compuesta (Y min). La
  Parte 2 empezará al terminar la Parte 1.»;
- lanzar `_launchGame` normal (motor intacto).

**b) Puente Parte 1 → Parte 2** en `goResults()` (`sint/index.js:2725`): si
`G.mode==='exam'` y existe el marcador mixto del PIN, tras el `submitResult` OK:
- actualizar el marcador: `{...anterior, parte1:'ok', notaSimples:score}`;
- en la pantalla de resultados, sustituir el botón de salida por **«Continuar con la
  Parte 2 →»** que llama a `window.CP.iniciarExamenDesdeLogin({name, email, grupo, pin})`
  (`compuestas/index.js:177`, mismo camino que usa `handleStartAll` en
  `sint/index.js:3777`). No auto-lanzar sin click: el alumno decide cuándo (respiro).

**c) Final de la Parte 2**: en la pantalla final del examen de compuestas (tras el envío
agregado, `compuestas/index.js` ~3993-4100), si existe el marcador mixto del PIN con
`parte1:'ok'`: añadir bloque «Resultado del examen en dos partes»: nota Parte 1 · nota
Parte 2 · **nota global ponderada** (cálculo client-side SOLO para mostrar; la oficial es
la del join servidor). Luego `sessionStorage.removeItem('taller_mixto_<pin>')`.

**d) Reanudación tras caída** (cabo suelto resuelto):
- *Mismo dispositivo*: si al entrar con el PIN el marcador ya tiene `parte1:'ok'`,
  ofrecer «Ya completaste la Parte 1 (nota guardada). ¿Continuar con la Parte 2?» y
  saltar directo a `CP.iniciarExamenDesdeLogin`.
- *Otro dispositivo / marcador perdido*: el alumno rehace la Parte 1; al enviar,
  `saveResult_` devuelve `{ok:true, duplicate:true}` y conserva el primer intento (red de
  seguridad servidor ya existente). Pierde tiempo pero no corrompe datos. Aceptado.
- Nota: usar `sessionStorage` para el flujo normal pero **duplicar el marcador en
  `localStorage`** (mismo objeto) para sobrevivir al cierre de pestaña; limpiar ambos al
  completar la Parte 2. Clave única por PIN evita colisiones entre exámenes.

**e) Panel del profesor** (`js/modules/teacher/index.js`):
- Crear: sección nueva «Examen mixto» reutilizando los formularios existentes de simples
  (~:242-319) y compuestas, más campos de pesos (default 40/60) — llama a
  `crearExamenMixto`.
- Ver: pestaña/tabla nueva clonando el patrón de `loadCpDashboard()` (~:362-497) contra
  `getResultadosMixtos` — columnas Email · Nombre · Grupo · Nota P1 · Nota P2 · **Global**
  · Estado (⚠️ incompleto resaltado). Export CSV con el mismo helper que ya usa CP.

### 3.3 Verificaciones obligatorias antes de dar por cerrada cada fase

- `node --check js/modules/sint/index.js` y `node --check js/modules/compuestas/index.js`
  tras tocarlos (regla del skill).
- `new Function(src)` sobre los `.gs` tocados (mismo sanity-check que en B7).
- E2E con preview (`taller-sintaxis`, puerto 8765) + GAS real: crear examen mixto de
  prueba (PIN dummy), hacerlo entero como alumno, verificar: fila en `Alumnos_Resultados`,
  fila en `Compuestas_Resultados`, join correcto en el panel, caso incompleto (cerrar
  pestaña tras Parte 1 y reabrir), caso duplicate.
- `menuAutotest` del GAS pasa en verde tras el redespliegue.

## 4. Fases de implementación (un commit por fase, push tras commit)

| Fase | Contenido | Archivos | Modelo | Sesión |
|---|---|---|---|---|
| **M1** | GAS: columnas `Mixto`/pesos + `crearExamenMixto_` con rollback + flag en `getExamConfig_` + supresión de correo + dedup-check | `server/Code_v6.gs` (+lectura `Compuestas.gs`) | Sonnet | 1ª |
| **M2** | GAS: `getResultadosMixtos_` (vista join) + registro en dispatcher + JSDoc | `server/Code_v6.gs` | Sonnet | 1ª |
| **M3** | Panel profesor: crear mixto + tabla de resultados + CSV | `js/modules/teacher/index.js`, `index.html` | Sonnet | 2ª |
| **M4** | Frontend alumno: detección `mixto` en config, aviso «dos partes», puente en `goResults`, marcador sesión/local | `js/modules/sint/index.js` | **Opus/Fable** | 3ª |
| **M5** | Frontend alumno: bloque final con nota global en compuestas + reanudación + limpieza marcador | `js/modules/compuestas/index.js` | **Opus/Fable** | 3ª |
| **M6** *(opcional, no bloquea)* | Informe Excel: sección mixtos en `getInformeProfesor_`/`informe-excel.js`; correo manual mixto en `EnviarInformes.gs` | varios | Sonnet | 4ª |

- **Regla de despliegue**: M1+M2 exigen redespliegue del GAS como **Nueva versión de la
  implementación existente** (NUNCA Nueva implementación). M3-M5 son frontend puro
  (recordar `.nojekyll`/Pages ya resuelto). Probar M4-M5 contra el GAS ya redesplegado.
- **Por qué Opus/Fable en M4-M5**: son las fases que tocan los dos motores grandes
  (regla 4 de CLAUDE.md: leer `arquitectura.md` §4.1/§4.2 antes); el riesgo real del
  proyecto vive ahí, no en el GAS.
- **Momento de despliegue a alumnos**: igual que el rediseño de calificación — mejor
  fuera de un periodo de exámenes activo; el primer uso real con un grupo piloto.

## 5. Checklist anti-cabos-sueltos (verificar TODOS antes de cerrar B4)

- [ ] `crearExamenMixto_` hace rollback si falla la mitad de compuestas.
- [ ] `getExamConfig_` mete `mixto/pesos` ANTES de cachear (`exam_<pin>`), y
      `crearExamenMixto_` invalida esa caché y `compexam_<pin>`.
- [ ] **Verificar que `saveResultadoCompuesta_` (`Compuestas.gs:626`) tiene dedup
      email+PIN como `saveResult_`; si no, añadirlo en M1.**
- [ ] Correo automático suprimido en Parte 1 de mixtos (`Email_Enviado='mixto_pendiente'`).
- [ ] Join por email normalizado (lowercase+trim) — mismo criterio que los dedup.
- [ ] Estado «incompleto» visible y resaltado en el panel; NUNCA nota global auto-0.
- [ ] Pesos validados (suma 100) en GAS Y en el formulario del profesor.
- [ ] Marcador `taller_mixto_<pin>` en sessionStorage+localStorage, limpiado al acabar P2.
- [ ] Texto del alumno: «Examen en dos partes», nunca «mixto»; NGLE intacta.
- [ ] Limitación documentada al profesor (tooltip en el form): **no reutilizar el PIN de
      un mixto para un examen normal posterior** — la mitad de compuestas quedaría
      activa y accesible por el login de examen de CP. Usar PIN nuevo por examen.
- [ ] Timer de cada parte funciona de forma independiente (probado E2E).
- [ ] E2E completo + `menuAutotest` verde + memoria de Claude actualizada al cerrar.

## 6. Mejoras futuras explícitamente FUERA de alcance de B4

- Correo al alumno con las 3 notas del mixto (extensión de `EnviarInformes.gs`).
- Sección de mixtos en el informe Excel (M6, opcional).
- Modo «mezclado» (alternancia por ejercicio): descartado, no retomar sin decisión nueva.
- Exportador iDoceo: pendiente de la plantilla de ponderación de Josele (sept. 2026) —
  cuando llegue, el join de `getResultadosMixtos_` es justo la fuente que necesitará.

## 7. Estimación

4 sesiones de trabajo (M1-M5; M6 aparte). Frente a las 5-7 del diseño monolítico
descartado, con dos hojas y un endpoint de escritura menos que mantener.
