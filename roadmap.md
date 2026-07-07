# Roadmap y pendientes — Taller de Sintaxis v6

> Lista priorizada de funciones a medias o por hacer · Creado mayo 2026
> **Revisado mayo 2026** tras completar la modularización y varias sesiones
> de desarrollo. Cada entrada lleva estado real (✅/🟡/🔴).

---

## 0. Hecho desde la creación del roadmap (resumen)

Trabajo completado que en su día estaba en este roadmap o surgió después:

- ✅ **Modularización** del monolito (era prioridad máxima 2.1).
- ✅ **Entrega 2** — feedback escalonado de compuestas (`pistas-compuestas.js`).
- ✅ **Entrega 3** — micro-lecciones de compuestas (`micro-lecciones-cp.js`).
- ✅ **Entrega 4** — análisis interno de proposiciones (drag & drop `iidd*` en CP).
- ✅ **Login del alumno en compuestas** (4.2) — login compartido unificado.
- ✅ **Modo examen con PIN en compuestas** (4.3) — `iniciarExamenDesdeLogin`.
- ✅ **Panel del profesor para compuestas** (4.4) — + ampliado con dashboard.
- ✅ **Colores de funciones Sint↔CP unificados** (7.5.1).
- ✅ **Rediseño premium de portada + logo nuevo** (no estaba en el roadmap).
- ✅ **Perfil persistente** (nombre/email/grupo en localStorage).
- ✅ **Grupo obligatorio** en todos los módulos académicos.
- ✅ **Separación `Compuestas_Resultados` / `Compuestas_Practica_Log`** + estética azul.
- ✅ **Resumen del banco de compuestas** (menú profesor).
- ✅ **Micro-lecciones nuevas**: CC Finalidad, CC Causa, CC Cantidad, Vocativo,
  ampliación de Sujeto. Normalización `Vocativo → Vocat.`.

Sigue pendiente lo de las secciones 3 (cerrar contenido del banco CP),
4.5 (vista de errores por alumno) y 5 (nice-to-have, incluidos tests).

---

## 1. Cómo leer este roadmap

Cada elemento incluye:
- **Estado**: Pendiente / Iniciado / Diseñado.
- **Tipo**: Pedagógico / Técnico / De infraestructura.
- **Estimación**: tiempo aproximado de trabajo dedicado.
- **Cómo implementarlo**: enfoque acordado en las conversaciones previas.

---

## 2. ✅ Prioridad MÁXIMA original — TODO HECHO

### 2.1 Modularización del archivo monolítico — ✅ HECHO

Completada en mayo 2026. El monolito de ~16.000 líneas se repartió en docenas
de módulos ES. Ver `estrategia_division.md` y `arquitectura.md`.

### 2.2 Entrega 2 — Feedback escalonado para Compuestas — ✅ HECHO

Implementado en `js/feedback/pistas-compuestas.js` (`FEEDBACK_COMPUESTAS`,
`DICCIONARIO_BASE_COMPUESTAS`), conectado a `lookupScaffold` con `tipo='compuesta'`.

### 2.3 Entrega 3 — Micro-lecciones de Compuestas — ✅ HECHO

Implementado en `js/feedback/micro-lecciones-cp.js` (`MICRO_LECCIONES_CP`).

---

## 3. Prioridad ALTA · Cerrar el módulo de compuestas

### 3.1 Entrega 4 — Análisis interno de proposiciones — ✅ HECHO

Implementado: la API `CP` expone el flujo de análisis interno con drag & drop
(`iiddDragStart`, `iiddOver`, `iiddDrop`, `iiddTagClick`, `iiddSlotClick`,
`iiddConfirm`, `iiddAvanzar`, `onInternaPredBtn`, `onInternaSujBtn`,
`onInternaFuncBtn`). Tras "Clasificar y relacionar" el alumno puede analizar
cada proposición por dentro (NP → Sujeto → Funciones).

**Deuda residual**: los 5 ejercicios viejos (OC_0001–OC_0005) siguen sin
`analisis_interno` completo (ver `deuda_tecnica.md` 1.2). No se deben tocar
sin avisar; se regenerarán en un lote futuro.

### 3.2 Auditoría y reconstrucción de oraciones embebidas

- **Estado**: Pendiente decisión final del usuario (ya aclaró: "el nexo debe estar en P3 aunque P3 esté dentro de P2").
- **Tipo**: Pedagógico / Datos.
- **Estimación**: 1 día.
- **Cómo implementarlo**:
  1. Auditar los ejercicios con 3+ proposiciones del banco (probablemente 5-10 ejercicios afectados).
  2. Reconstruir los `indices` de cada P_n para que la P más externa **excluya** los tokens que pertenecen a P más internas.
  3. Verificar que el motor de fase 3 funciona bien con la nueva estructura.

### 3.3 Adaptar `construirDiagnosticos()` a la fase fusionada

- **Estado**: 🔴 PENDIENTE (verificado mayo 2026: sigue en
  `js/modules/compuestas/index.js:4566`).
- **Tipo**: Limpieza tras refactor.
- **Estimación**: 1 hora.
- **Cómo implementarlo**: el resumen interpretativo todavía habla de "fase 4" y "fase 5" como si fueran pasos separados. Hay que reescribir los mensajes hablando de un solo paso "clasificar y relacionar" con sub-pasos.

### 3.4 Completar subtipos faltantes en el banco

- **Estado**: Pendiente.
- **Tipo**: Pedagógico / Datos.
- **Estimación**: 1-2 días.
- **Cómo implementarlo**: usar el prompt generador de oraciones compuestas v1.2 (que ya tiene el usuario) y pedirle a Claude que genere lotes específicos:
  - 10 sustantivas de aposición.
  - 10 construcciones temporales y finales.
  - 10 subordinadas adverbiales propias (modal, locativa).
  - 8 coordinadas explicativas y distributivas.
  - 5 relativas semilibres.

---

## 4. Prioridad MEDIA · Mejoras transversales

### 4.1 Plantillas de análisis discursivo Opción B (textos ricos)

- **Estado**: Opción A implementada. Opción B pendiente.
- **Tipo**: Pedagógico.
- **Estimación**: 2 días, requiere ampliar schema.
- **Cómo implementarlo**:
  1. Ampliar el schema del banco con campos opcionales:
     - `antecedente_indices` en proposiciones de relativo.
     - `sintagma_completo_texto` para casos de término preposición.
     - `funcion_interna_relativo` (función que el relativo desempeña dentro de la PS).
  2. Reescribir `redactarAnalisis()` para usar estos campos cuando estén disponibles.
  3. Si el campo falta, caer a la plantilla de Opción A.

### 4.2 Login del alumno en el módulo de compuestas — ✅ HECHO

Implementado en mayo 2026. Compuestas pasa por el **login compartido** con
nombre + email + grupo (obligatorio). El perfil se persiste en localStorage
(`taller_profile`) y se pre-rellena en futuras entradas. Ver `core/profile.js`,
`core/navigation.js` (`goModule`) y `CP.enterDesdeLogin`.

### 4.3 Modo examen con PIN en compuestas — ✅ HECHO

Implementado en mayo 2026. El alumno elige "📝 Examen" en el login compartido
e introduce el PIN allí mismo. `handleStartAll` llama a
`CP.iniciarExamenDesdeLogin({name, email, grupo, pin})`, que usa
`fetchExamenCompuesta` y arranca el examen. Se eliminó el 2.º formulario de PIN
interno que existía (duplicado). El resultado se guarda en `Compuestas_Resultados`.

### 4.4 Panel del profesor para compuestas — ✅ HECHO + AMPLIADO

- **Estado base** (2026-05-28): panel "🧩 Resultados de Compuestas" en el
  frontend del profesor; `loadCpDashboard()`/`exportCpCSV()` en
  `teacher/index.js`; endpoint `getResultadosCompuestas_` en `Compuestas.gs`.
  Stats (total/media/aprobadas/suspendidas) + tabla + export CSV.
- **Ampliación** (mayo 2026, panel del Sheet): el dashboard del Sheet
  (`crearDashboard_` en `Code_v6.gs`) ahora tiene un bloque "🌳 MÓDULO ORACIÓN
  COMPUESTA" con métricas (oraciones activas, exámenes activos, resultados de
  examen, registros de práctica libre, intentos hoy, nota media 30 días),
  tabla de exámenes activos y top alumnos. Además, menú "📊 Ver resumen de mi
  banco" (compuestas) con conteos por tipo/subtipo/nivel/nº props/relaciones.
- **Pendiente opcional (no bloqueante)**: detección automática de qué
  ejercicios fallan más (menor % medio de aciertos).

### 4.5 Vista de errores agregada por alumno

- **Estado**: Pendiente.
- **Tipo**: Funcional para profesor.
- **Estimación**: 4 horas.
- **Cómo implementarlo**: en el panel del profesor, una vista que diga "el alumno X falla mayoritariamente en sustantivas de CD" usando los datos de `trackError` agregados.

---

## 5. Prioridad BAJA · Mejoras "nice to have"

### 5.-1 Sintagmas: analíticas silenciosas — ✅ HECHO (jul-2026), sin examen por decisión

**Estado**: hecho (Fase 4 del informe `docs/Informe_examen_modos_secundarios.md`).
Sintagmas registra ahora sus sesiones en `Sintagmas_Sesiones` (GAS
`saveSesionSintagmas_`), igual que Chispa: alumno, grupo, sintagmas completados,
aciertos, errores, precisión, tiempo y errores por categoría (Núcleo/Tipo de
sintagma/función), enviado con `sendBeacon` al terminar o al salir.

**Decisión explícita, no revisar sin motivo nuevo**: Sintagmas **no tendrá modo
examen** mientras su motor sea "reintentar hasta acertar" (el alumno no puede fallar
y avanzar; vuelve a intentarlo hasta dar con la respuesta). Eso hace que una nota de
examen no sea comparable a la de Simples/Compuestas. La pantalla final ya no dice
"Nota X.X/10" — dice "% de precisión", para no sugerir que es una calificación.

### 5.0 ~~Cambiar fuente de `.cp-prop-text`~~ — OBSOLETO

El selector `.cp-prop-text` ya no existe en el CSS actual (verificado mayo
2026). La estructura de proposiciones de compuestas cambió en algún refactor
posterior. Entrada retirada del roadmap.

### 5.1 Tests automatizados básicos

- **Estado**: 🔴 PENDIENTE. Cero tests (ver `deuda_tecnica.md` 2.9).
- **Tipo**: Infraestructura.
- **Estimación**: 1-2 tardes.
- **Cómo implementarlo (enfoque sencillo, SIN frameworks)**:
  1. **Validador del banco** (Python): ampliar `scripts/validate_compuesta.py`
     para recorrer el banco entero y avisar de etiquetas mal escritas. Y uno
     equivalente para simples (`Oraciones_Banco`).
  2. **Tests de funciones puras** (Node, `node archivo.test.js`): empezar por
     `GrammarRules.applyAll` (cubre los bugs "por"/"para" ya conocidos),
     `normalizeOracion`, `ScoringEngine.toGrade`. Requiere extraerlas a su
     propio archivo importable.
  3. **Runner mínimo** `tests/run.js` que cuente OK/FALLA.
  - NO usar Jest/Vitest/Playwright: mantenimiento alto para este perfil.

### 5.2 PWA (Progressive Web App)

- **Estado**: No diseñado.
- **Tipo**: Infraestructura.
- **Estimación**: 1 día.
- **Por qué**: permitir instalarla en móvil/tablet sin pasar por App Store, funcionar offline para el banco ya descargado.
- **Cómo implementarlo**: añadir manifest.json + service worker que cachee la app y el banco.

### 5.3 Sistema de notificaciones internas para el profesor

- **Estado**: No diseñado.
- **Tipo**: Pedagógico.
- **Estimación**: 4 horas.
- **Por qué**: avisar al profesor "Lucía ha completado 5 ejercicios con 90% acierto" o "Juan se ha atascado 3 veces en el mismo concepto".

### 5.4 Selector de tipo de letra y tamaño

- **Estado**: No diseñado.
- **Tipo**: Accesibilidad.
- **Estimación**: 2 horas.
- **Por qué**: alumnos con dislexia agradecen poder cambiar la tipografía.

### 5.5 Modo oscuro

- **Estado**: No diseñado.
- **Tipo**: Cosmético.
- **Estimación**: 1 día (porque tocaría auditar todos los colores).
- **Por qué**: cada vez más alumnos lo piden.

---

## 6. Trabajo paralelo · Materiales pedagógicos

Tareas que no son código pero sí del proyecto:

### 6.1 Acuerdo de uso en beta (Ref. TS-BETA-2026)

- **Estado**: Ya producido.
- **Acción**: solo falta que las familias lo firmen cuando empiece el pilotaje.

### 6.2 Pilot pack completo

- **Estado**: Ya producido (invitación, encuesta NPS, formularios, etc.).
- **Acción**: lanzar pilotaje cuando el módulo de compuestas esté completo.

### 6.3 Documentación para profesores

- **Estado**: Pendiente.
- **Estimación**: 1-2 días de escritura.
- **Qué incluir**: cómo crear un examen, cómo interpretar los resultados, cómo dar acceso a nuevos grupos.

### 6.4 Vídeos demostrativos

- **Estado**: Pendiente.
- **Estimación**: 1 día de grabación + edición.
- **Por qué**: para la fase de comercialización con la Consejería de Educación de Murcia.

---

## 7. Comercialización · Negocio

Trabajo paralelo de desarrollo de negocio:

### 7.1 Outreach a la Consejería de Educación de Murcia

- **Estado**: Acuerdo de uso listo. Producto en validación.
- **Cuándo**: tras pilotar en al menos 3 grupos durante un trimestre.

### 7.2 Conversaciones con editoriales

- **Estado**: Pendiente.
- **Cuándo**: después de la Consejería. Editoriales niche tipo Sansy primero.

### 7.3 Aceleradores e inversión

- **Estado**: Identificados (Lanzadera, Emerge Education, Brighteye Ventures, MurciaBAN, SeedRocket).
- **Cuándo**: solo si la fase de Consejería+editoriales no cuaja y se decide ir por venture capital.

### 7.4 Registro de propiedad intelectual

- **Estado**: Hecho en Registro de Propiedad Intelectual de Murcia y Safe Creative.

---

## 7.5 Apuntes de diseño visual (mayo 2026)

### 7.5.1 Unificar colores de funciones sintácticas Sint↔CP
- **Estado**: ✅ HECHO (commit `4173c88` — C.5, mayo 2026).
- **Implementación**: helper `_iiddTipoCss(tipo)` en `js/modules/compuestas/index.js`
  mapea los tipos internos de CP (`cd`, `ci`, `cc_*`, `atributo`, `pv`, `suj_lexico`…)
  a las mismas clases `tag-f-*` / `tag-sn` que usa Sint. Aplicado en
  `_buildIddPoolHtml` (pool del D&D) y en `_renderIddBlock` (etiquetas
  colocadas, excepto cuando están en estado de error — `iidd-tag-wrong`
  conserva el rojo de error).
- **Resultado**: el alumno ve el mismo color para CD/CI/CC/Atr/PV/PN/Sujeto/etc.
  en oraciones simples y compuestas. Pista visual transversal consolidada.

---

## 8. Qué queda por hacer (estado mayo 2026)

El calendario original de "semanas" quedó superado: casi todo lo que estaba
planificado para las semanas 1-3 ya está hecho. Lo que sigue abierto, por
orden de utilidad:

**Contenido del banco de compuestas (sección 3)**
- 3.2 Auditar oraciones embebidas (3+ proposiciones) y reconstruir `indices`.
- 3.4 Completar subtipos faltantes (lote nuevo de ejercicios).
- Completar `analisis_interno` de OC_0001–OC_0005.

**Limpieza pedagógica/técnica**
- 3.3 Adaptar `construirDiagnosticos()` (terminología "fase 4/5" obsoleta).
- 1.9 (deuda) Micro-lecciones que faltan: NP, CC Tiempo/Lugar/Modo/Compañía/
  Instrumento, Mod.Or., Conector.

**Profesor / analítica**
- 4.5 Vista de errores agregada por alumno.
- Detección automática de ejercicios más fallados (mejora de 4.4).

**Infraestructura**
- 5.1 / deuda 2.9 Tests mínimos (validador de banco + funciones puras).
- 4.3 (deuda) Auditar y reducir el CSS legacy.

**Producto / negocio (sección 6 y 7)**
- Documentación para profesores, vídeos demostrativos, pilotaje en aula.

---

## 9. Pendientes de validar contra datos reales

Algunas tareas dependen de mirar el Sheet de producción, no solo el código:

- ¿Cuántos ejercicios del banco tienen 3+ proposiciones y `indices` solapados?
- ¿Qué subtipos están realmente vacíos hoy en `Compuestas_Banco`?
  (El menú "📊 Ver resumen de mi banco" de compuestas ahora da estos conteos.)
- El bug pedagógico "por la lluvia" (CC Causa que se muestra como CC Finalidad)
  quedó aparcado a la espera de una captura del JSON real de esa fila.
