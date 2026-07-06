# Informe: modo examen en morfología, sintagmas y las subfases del análisis sintáctico

**Fecha:** 2026-07-06 · **Autor:** Claude (Fable 5) · **Ejecutor previsto del plan:** Sonnet 5

Alcance pedido por Josele: funcionamiento y evaluación del modo examen en
**(a) morfología**, **(b) sintagmas** y **(c) los dos modos de análisis sintáctico que no
son análisis completo: «Solo NP» y «NP + Sujeto»** — comparados con el estándar ya
implantado en Simples (análisis completo) y Compuestas.

**Contexto pedagógico (Josele, 2026-07-06):** «Solo NP» y «NP + Sujeto» están pensados
para **1º ESO y la primera evaluación de 2º ESO**. Eso eleva la prioridad de la Fase 1:
son los alumnos más jóvenes quienes hoy reciben una nota que no mide lo que la tarjeta
promete, y quienes más se desorientan con fases fantasma que se autocompletan. Para ese
público el recorte real de fases es además una mejora de UX: sesiones más cortas, una
sola destreza por sesión, éxito visible.

---

## 1. El estándar de referencia (lo que ya cumplen Simples completo y Compuestas)

| # | Propiedad | Simples | Compuestas |
|---|-----------|---------|------------|
| 1 | Convocatoria del profesor con **PIN** y oraciones fijas | ✅ | ✅ |
| 2 | **Grupo obligatorio** | ✅ | ✅ |
| 3 | **Curva dura** 100/40/10/0 (vs 100/50/25/0 en práctica) | ✅ `_califDura` (sint:2479) | ✅ (compuestas:3809) |
| 4 | **Sin pistas ni feedback** revelador durante el examen | ✅ | ✅ |
| 5 | **Envío al GAS** con `versionCalificacion` | ✅ `saveResult` | ✅ |
| 6 | **Anti-duplicado + reintento** de envío | ✅ `_examSent`/`_pendingResult` | ✅ |
| 7 | Errores por función para el informe | ✅ | ✅ |
| 8 | Confirmación al salir del examen | ✅ | ✅ |
| 9 | Timer opcional del profesor | ✅ | ✅ |

---

## 2. Hallazgos por modo

### 2.A Subfases «Solo NP» y «NP + Sujeto» (análisis sintáctico, `sint/index.js`)

Es la parte con más incoherencias, porque **el sistema de subfases promete una cosa en la
UI y hace otra en el motor**:

**A1. [GRAVE] `SUBFASE_CONFIGS[*].phases` es configuración muerta.** Nadie lee el campo
`phases` (`solo_np: phases:[1]`, `np_sujeto: phases:[1,2]`, sint:74-76). Las transiciones
están cableadas: acertar el NP siempre lanza `transitionPhase(2)` (sint:1635) y acertar el
sujeto siempre lanza `transitionPhase(3)` (sint:1742/1783/1825). **En «Solo NP» el alumno
también hace la fase de sujeto**, y sus errores de sujeto puntúan con el peso más alto
(`W = {NP:1, SUJETO:3, FUNCION:3}`, sint:295). La tarjeta promete «Identifica el Núcleo del
Predicado» y el examen mide, sobre todo, el sujeto.

**A2. [GRAVE] La subfase es solo un filtro del banco, no un recorte de fases.** El GAS
filtra oraciones cuya columna `Subfase` mínima ≤ la pedida (Code_v6.gs:929-936). Esa
columna se auto-asigna con la heurística de Code_v6.gs:2472:
`sin funciones → solo_np · con CD/CI/CC → completo · resto → np_sujeto`.
Consecuencias:
- Una oración `np_sujeto` puede tener bloques de fase 3 (Atr., C.Rég., CPvo…): en un
  examen «NP + Sujeto» el alumno puede verse analizando funciones del predicado, y esos
  bloques **cuentan en la nota**.
- La heurística trata Atr./C.Rég. como más básicos que CD/CC, lo cual es pedagógicamente
  discutible.
- Las oraciones `solo_np` (sin funciones) atraviesan una fase 3 «fantasma» que se
  autocompleta (sint:1852/1868) — el alumno ve píldoras de fases que se marcan solas
  (las phase pills siempre pintan 3 fases, `maxPhase=3`, sint:1427).

**A3. [GRAVE] La nota no distingue subfase.** `calcDetailedScore` reparte SIEMPRE
NP(1) + Sujeto(3) + Funciones(3+…) sin mirar `G.subfase`. En un examen «Solo NP»:
el NP vale 1 punto de ~7 por oración; el resto son sujeto (no era el objetivo declarado)
y puntos de funciones **regalados** por la fase 3 autocompletada (0 errores → earned
completo sin jugar). La nota resultante no mide lo que dice medir.

**A4. [MEDIA] En práctica, elegir subfase no hace (casi) nada.** `loadOraciones('practice')`
no envía el parámetro `subfase` al GAS (solo lo envía la ruta de examen-con-filtros,
sint:1179-1190, y leyéndolo de localStorage del **panel del profesor**, no de la tarjeta
del alumno). La elección del alumno solo acaba como etiqueta en `G.subfase` (analíticas y
texto del resumen). Las tres tarjetas del login son, en práctica, cosméticas.

**A5. [MEDIA] UI engañosa en examen.** Al marcar «Examen», `setMode` muestra el campo PIN
pero **no oculta el selector de subfase** (sint:871-884): el alumno elige una profundidad
que será ignorada (en examen manda el PIN: `d.subfase || examSubfase`, sint:1310; el
fallback `localStorage['taller_exam_subfase']` solo existe en el navegador del profesor,
así que en el del alumno cae a 'completo').

**A6. [LEVE] Trazabilidad rota.** `saveResult` no envía `subfase` (sint:3004-3019): la
hoja Resultados mezcla notas de exámenes de distinta profundidad sin distinguirlas (solo
recuperable cruzando el PIN con la hoja de convocatorias). Incoherencia interna: las
analíticas de práctica SÍ envían `subfase` (sint:722).

**A7. [LEVE] `WEIGHTS` (sint:81, `{NP:2,SUJETO:4,PVPN:2,FUNCION:3}`) parece legacy** del
sistema anterior al rediseño de calificación; el motor usa `W` (sint:295). Verificar y
retirar si no tiene usos.

Lo que sí está bien: PIN + grupo obligatorio, curva dura, supresión de pistas, envío con
anti-duplicado, timer y reflexión funcionan igual en cualquier subfase porque son del
motor común.

### 2.B Morfología (módulo `maestro`)

El login ofrece «📝 Examen · Sin feedback · Nota» (`mm-exam`), pero:

- **[GRAVE] La nota no se envía a ningún sitio.** `showMaestroResults()` solo pinta en
  pantalla; no existe acción GAS ni hoja de resultados de morfología. El alumno cree que
  cuenta y el profesor nunca la ve.
- **[GRAVE] Sin PIN ni convocatoria**: textos aleatorios (`shuffle`) distintos por alumno,
  cuando quiera → notas no comparables.
- **[MEDIA] Feedback revelador en examen**: `showCorrectFlash('¡X correcta!')` + sonido +
  `popElement` se disparan también en examen cuando la categoría es correcta
  (maestro:1187-1195), contra el «Sin feedback» prometido.
- **[MEDIA] Nota lineal** `totalCorrect/totalAttempted`, sin curva dura ni
  `VERSION_CALIFICACION`; escala no comparable con Simples/Compuestas.
- **[MEDIA] Sin confirmación al salir** ni protección contra recarga; el botón
  «Saltar texto» sigue disponible en examen.
- **[LEVE] `MM` no guarda el grupo** (`startMaestro({name,email})`).

Además existe un **módulo morph legacy muerto** (`js/modules/morph/index.js`, dataset
hardcodeado con su propio `morphMode='exam'` a medias): la ruta `currentModule==='morph'`
de `handleStartAll` (sint:3695) es inalcanzable — no hay ningún setter de
`selectedMorphMode` ni panel `'morph'` en `LOGIN_PANELS`. Candidato a retirada.

### 2.C Sintagmas (`sintagmas/index.js`)

- **No tiene modo examen** (coherente: su mecánica es reintentar-hasta-acertar, no
  evaluable tal cual).
- **[MEDIA] Único modo académico invisible para el backend**: ni resultados ni analíticas
  (Chispa tiene `saveSesionChispa`; práctica de Simples tiene `sendPracticeAnalytics`).
- **[LEVE] «Nota X.X/10» engañosa** en la pantalla final (endSint:419): es
  `aciertos/clics`, con reintentos — semántica distinta de cualquier nota de examen; debería
  llamarse «precisión».

---

## 3. Plan de mejora por fases (para ejecutar con Sonnet 5)

Reglas transversales (CLAUDE.md + memoria): **un paso = un commit + push**, confirmar con
Josele entre pasos; GAS = pegar el .gs y redesplegar **como «Nueva versión»**, nunca «Nueva
implementación»; columnas SIEMPRE por nombre (`getColMap_`); sin tests automatizados;
terminología NGLE. Antes de tocar `js/modules/sint/index.js`, releer su sección en
`arquitectura.md`.

### Fase 0 — Decisión de diseño + limpieza (1 sesión corta)

- **0.1 (decisión de Josele, bloqueante para la Fase 1):** ¿qué debe significar la
  subfase? Recomendación: **recorte real de fases** — en `solo_np` la oración termina al
  acertar el NP; en `np_sujeto`, al resolver el sujeto. Alternativa (descartable): dejarla
  como mero filtro de banco y renombrar las tarjetas para que no prometan recorte.
  El público objetivo (1º ESO / 1ª eval. de 2º ESO) refuerza la recomendación: oraciones
  cortas de una sola destreza, sin exponer fases que aún no se han enseñado.
- **0.2** Retirar la ruta muerta del morph legacy (`handleStartAll`, sint:3695-3700) y
  archivar `js/modules/morph/index.js`; verificar y retirar `WEIGHTS` (sint:81) si no
  tiene usos. Anotar en `deuda_tecnica.md`.
- **0.3** Documentar en `arquitectura.md` el mapa real del examen por modo (media página).

### Fase 1 — Subfases honestas en el motor de Simples (frontend, 1-2 sesiones)

- **1.1** Recorte real: en los puntos de éxito de fase (sint:1635, 1742, 1783, 1825),
  consultar `SUBFASE_CONFIGS[G.subfase].phases`; si la fase siguiente no está incluida,
  llamar a `showSuccessScreen(o)` en vez de `transitionPhase(n)`.
- **1.2** `calcDetailedScore`: sumar al «avail» solo las fases de la subfase
  (`solo_np` → solo `W.NP`; `np_sujeto` → `W.NP + W.SUJETO`; sin `pvpnAvail` ni `fnAvail`
  cuando la fase 3 no se juega). Elimina tanto los puntos regalados como el peso indebido
  del sujeto en «Solo NP». Añadir sufijo a `VERSION_CALIFICACION` (p. ej. `-sf`) para
  distinguir notas pre/post cambio.
- **1.3** Phase pills (`updateTopBar`, sint:1427-1433): pintar solo las fases de la
  subfase activa.
- **1.4** Login: al elegir «Examen», ocultar `#subfase-block` (en `setMode`, sint:871) con
  una nota «La profundidad la fija el examen del profesor».
- **1.5** Práctica: pasar `subfase: selectedSubfase` a `getOraciones` para que el filtro
  de banco funcione también en práctica (o decisión explícita de no filtrar, documentada).
- Verificación visual con `preview_start` (taller-sintaxis, puerto 8765): jugar una
  oración en cada subfase, práctica y examen demo.

### Fase 2 — Trazabilidad de la subfase en resultados (GAS + frontend, 1 sesión)

- **2.1** `saveResult` (sint:3004): añadir `subfase` al payload. GAS: columna `Subfase` en
  la hoja de Resultados (crear por nombre si falta). **Redesplegar Nueva versión.**
- **2.2** Informe del profesor / `InformeExamen.gs`: mostrar la subfase junto a la nota
  para no comparar exámenes de distinta profundidad.
- **2.3** Revisar con Josele la heurística del auto-asignador de la columna `Subfase`
  (Code_v6.gs:2472): con el recorte de la Fase 1, `solo_np` puede admitir cualquier
  oración (la fase 3 ya no se juega), y `np_sujeto` no debería depender de si las
  funciones son CD/CC o Atr./C.Rég.

### Fase 3 — Examen de morfología honesto (frontend + GAS, 2 sesiones)

- **3.1** En `confirmToken` (maestro:1187-1195): si `MM.mode==='exam'`, sin
  `showCorrectFlash`/`popElement`/sonido de acierto; feedback neutro de «registrado».
  Ocultar «Saltar texto» en examen y añadir `confirm()` al salir (patrón sint:3464).
- **3.2** Guardar `grupo` en `MM` (pasarlo desde el login compartido).
- **3.3** GAS: acción `saveResultMorfologia` + hoja `Morfologia_Resultados` (Timestamp,
  Nombre, Email, Grupo, Nivel, Modo, Nota, TokensOk, TokensErr, TokensTotales,
  CatStats_JSON, VersionCalificacion). **Nueva versión.** Frontend: envío desde
  `showMaestroResults` con el patrón anti-duplicado/reintento de Simples; en práctica,
  envío silencioso opcional.
- **3.4 (solo si Josele lo pide):** examen de morfología con PIN (convocatoria con textos
  fijos, reusar el modelo de Simples) — o la vía barata: **misión de morfología con
  `calificacion:'examen'`** (la infra de misiones-examen existe desde 2026-07-01).

### Fase 4 — Sintagmas visible (1 sesión, independiente)

- **4.1** Analíticas silenciosas calcadas de Chispa: acción GAS `saveSesionSintagmas` +
  hoja `Sintagmas_Sesiones` (alumno, grupo, sintagmas completados, aciertos, errores,
  precisión, tiempo, errores por función JSON) con `sendBeacon`. Requiere pasar `grupo` a
  `startSintagmas`. **Nueva versión.**
- **4.2** Renombrar la «nota /10» final a **«Precisión»** (% + aciertos/errores).
- **4.3** Dejar escrito en `roadmap.md` que Sintagmas no tendrá modo examen mientras el
  motor sea reintentar-hasta-acertar.

**Orden recomendado:** 0 → 1 → 2 (núcleo del problema y lo que afecta a notas reales);
3 y 4 son independientes entre sí y pueden intercalarse. La Fase 1 cambia notas de examen:
como en el rediseño de 2026-06-16, **desplegar al cierre de una evaluación y avisar a los
alumnos**.
