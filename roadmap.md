# Roadmap y pendientes — Taller de Sintaxis v6

> Lista priorizada de funciones a medias o por hacer · Mayo 2026
> Basado en las conversaciones de las últimas sesiones de desarrollo

---

## 1. Cómo leer este roadmap

Cada elemento incluye:
- **Estado**: Pendiente / Iniciado / Diseñado.
- **Tipo**: Pedagógico / Técnico / De infraestructura.
- **Estimación**: tiempo aproximado de trabajo dedicado.
- **Cómo implementarlo**: enfoque acordado en las conversaciones previas.

---

## 2. Prioridad MÁXIMA · Hacer antes que nada más

### 2.1 Modularización del archivo monolítico

- **Estado**: Diseñado (estrategia completa en `estrategia_division.md`).
- **Tipo**: Técnico crítico.
- **Estimación**: 2-3 días completos.
- **Por qué es máxima**: cualquier mejora futura sufre por trabajar sobre 16.000 líneas en un único fichero. Modularizar **antes** de seguir añadiendo features evita que la deuda crezca.
- **Cómo**: ver `estrategia_division.md`.

### 2.2 Entrega 2 — Sistema de feedback escalonado para Compuestas

- **Estado**: Diseñado, parcialmente preparado (el sistema `trackError` ya está implementado en la Entrega 1 con claves por función).
- **Tipo**: Pedagógico.
- **Estimación**: 2-3 horas.
- **Cómo implementarlo**:
  1. Crear `FEEDBACK_COMPUESTAS` análogo a `FEEDBACK_SINTAXIS` de Sint. Estructura: array de objetos `{real, marcada, fijo, pista}`.
  2. Poblarlo con las **tarjetas didácticas tipo "X VS Y"** del archivo `Tarjetas_didácticas_compuestas.md` que envió el usuario.
  3. Modificar `onClasifClick` y `onRelacionClick` para que, al detectar una confusión `{real: X, marcada: Y}`, muestren el `fijo` (pregunta socrática) y la `pista` (pista concreta).
  4. Estilo visual: reutilizar `.fb-card-label` / `.fb-card-body` de Sint para mantener consistencia.

### 2.3 Entrega 3 — Micro-lecciones de Compuestas

- **Estado**: Diseñado, sistema `trackError` ya activo.
- **Tipo**: Pedagógico.
- **Estimación**: 3-4 horas.
- **Cómo implementarlo**:
  1. Crear `MICRO_LECCIONES_CP` análogo a `MICRO_LECCIONES` de Sint. Estructura: diccionario `id → {titulo, pasos: [...]}`. Cada paso es texto explicativo + opcionalmente quiz.
  2. Poblarlo con las **tarjetas conceptuales** del archivo del usuario (las que tienen título "Tarjeta N: Concepto X").
  3. Añadir entradas a `ERROR_TO_LECCION` para mapear las claves de `trackError('compuestas', X)` a IDs de micro-lección. Ejemplo: `'compuestas.subtipo_sustantiva_cd' → 'sustantivas_cd'`.
  4. Llamar a `updateMicroLeccionButton()` tras cada `trackError` para que aparezca el botón de "Ver lección" si se supera el umbral.

---

## 3. Prioridad ALTA · Cerrar el módulo de compuestas

### 3.1 Entrega 4 — Análisis interno de proposiciones

- **Estado**: Diseñado en el informe del proyecto. Schema ya existe en el banco (`analisis_interno` en 92% de los ejercicios).
- **Tipo**: Pedagógico, gran complejidad.
- **Estimación**: 1 día.
- **Cómo implementarlo** (Opción B del informe: mini-motor propio en CP):
  1. Al final de la fase fusionada "Clasificar y relacionar", **antes** del resumen, mostrar pantalla de elección: "Ver resumen" o "Analizar las proposiciones por dentro".
  2. Si el alumno elige "Analizar por dentro", lanzar un mini-motor que recorre cada proposición y hace 3 pasos: NP → Sujeto → Funciones del predicado.
  3. El estado del mini-motor vive en `state.interna` (sub-objeto). Datos a usar: `proposicion.analisis_interno.sujeto/predicado/funciones`.
  4. Reutilizar `funcTagCss()` del Core para los chips de función.
  5. Al final, mostrar el resumen global enriquecido con el desglose por proposición.

**Pre-requisito**: completar los 5 ejercicios viejos (OC_001–OC_005) que carecen de `analisis_interno`.

### 3.2 Auditoría y reconstrucción de oraciones embebidas

- **Estado**: Pendiente decisión final del usuario (ya aclaró: "el nexo debe estar en P3 aunque P3 esté dentro de P2").
- **Tipo**: Pedagógico / Datos.
- **Estimación**: 1 día.
- **Cómo implementarlo**:
  1. Auditar los ejercicios con 3+ proposiciones del banco (probablemente 5-10 ejercicios afectados).
  2. Reconstruir los `indices` de cada P_n para que la P más externa **excluya** los tokens que pertenecen a P más internas.
  3. Verificar que el motor de fase 3 funciona bien con la nueva estructura.

### 3.3 Adaptar `construirDiagnosticos()` a la fase fusionada

- **Estado**: Pendiente.
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

### 4.2 Login del alumno en el módulo de compuestas

- **Estado**: Sí guardado anónimo implementado en la Entrega de persistencia. Login real pendiente.
- **Tipo**: Funcional.
- **Estimación**: 1 hora.
- **Cómo implementarlo**:
  1. Reutilizar la pantalla de login de Sint (campos email + nombre + grupo).
  2. Validar email con `EMAIL_RE` ya existente.
  3. Pasar email/nombre/grupo en el payload de `saveResultadoCompuestas`.
  4. Modificar el GAS para guardarlos en columnas adicionales.

### 4.3 Modo examen con PIN en compuestas

- **Estado**: Backend ya soporta (`createExamenCompuesta_`, `getExamenCompuesta_`). Frontend no.
- **Tipo**: Funcional.
- **Estimación**: 1 día.
- **Cómo implementarlo**: clonar el flujo del modo examen de Sint. Pantallas: introducir PIN → cargar ejercicios pre-computados desde GAS → ejecutar examen sin filtros locales → guardar resultado con PIN y datos del examen.

### 4.4 Panel del profesor para compuestas

- **Estado**: Backend listo (`getResultadosCompuestasStats`). Frontend no.
- **Tipo**: Funcional.
- **Estimación**: 1 día.
- **Cómo implementarlo**:
  1. Añadir pestaña "Compuestas" en `screen-teacher`.
  2. Llamar a `getResultadosCompuestasStats` y mostrar tabla con: alumnos, fechas, ejercicios, % aciertos.
  3. Detección automática de qué ejercicios fallan más (los que tienen menor % medio de aciertos).
  4. Export CSV.

### 4.5 Vista de errores agregada por alumno

- **Estado**: Pendiente.
- **Tipo**: Funcional para profesor.
- **Estimación**: 4 horas.
- **Cómo implementarlo**: en el panel del profesor, una vista que diga "el alumno X falla mayoritariamente en sustantivas de CD" usando los datos de `trackError` agregados.

---

## 5. Prioridad BAJA · Mejoras "nice to have"

### 5.0 Cambiar fuente de `.cp-prop-text` a una más pedagógica

- **Estado**: Pendiente. Detectado durante la migración (Paso 2 CSS, mayo 2026): el texto de cada proposición en compuestas usa `font-family:'Fraunces',serif` (línea ~3686 de `css/styles.css`). Es la fuente "display" del proyecto, poco pedagógica para textos de análisis.
- **Tipo**: UI / Pedagógico.
- **Estimación**: 5 minutos.
- **Cómo implementarlo**: en `.cp-prop-text` cambiar a `'Lora',serif` (serif suave, legible) o a `'DM Sans','Nunito',sans-serif` (sans-serif, coherente con `.cp-oracion-text`). Verificar también si hay otros selectores CP con `'Fraunces'` que también deban revisarse.
- **Nota**: hubo un intento previo de cambio que no llegó a guardarse en este `index.html`.

### 5.1 Tests automatizados básicos

- **Estado**: No existe ningún test.
- **Tipo**: Infraestructura.
- **Estimación**: 1-2 días.
- **Cómo implementarlo**: tras modularizar, usar Vitest o Playwright para:
  - Tests unitarios de helpers puros (etiquetas, normalización).
  - Tests de integración del motor de CP simulando clicks.
  - Tests de schema del banco (validar que cada ejercicio cumple el esquema).

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

## 8. Cómo organizar las próximas semanas

Una propuesta de calendario realista:

### Semana 1 (días 1-3)

- Migrar a Claude Code y a la estructura modular (`estrategia_division.md`).
- Hacer commit inicial. Crear ramas (`main`, `dev`).
- Validar que la app sigue funcionando tras la división.

### Semana 1 (días 4-7)

- Entrega 2: feedback escalonado de compuestas.
- Entrega 3: micro-lecciones de compuestas.
- Adaptar diagnósticos a fase fusionada.

### Semana 2

- Completar 5 ejercicios viejos sin `analisis_interno`.
- Auditar oraciones embebidas y reconstruir JSON.
- Entrega 4: análisis interno de proposiciones.
- Completar subtipos faltantes del banco (lote nuevo de ejercicios).

### Semana 3

- Login y modo examen para compuestas.
- Panel del profesor para compuestas.
- Tests mínimos del motor de CP.

### Semana 4

- Pruebas reales con alumnos en clase.
- Iteración sobre bugs encontrados.
- Lanzamiento del pilotaje formal.

---

## 9. Próximo paso inmediato

Cuando estés en Claude Code con el proyecto migrado, los primeros tres comandos deberían ser:

1. "Lee `arquitectura.md`, `deuda_tecnica.md`, `roadmap.md` y `estrategia_division.md`."
2. "Procedemos con la modularización siguiendo `estrategia_division.md`."
3. "Una vez modularizado, atacamos la Entrega 2 (feedback escalonado)."

A partir de ahí, el ritmo será mucho más rápido que en la web.
