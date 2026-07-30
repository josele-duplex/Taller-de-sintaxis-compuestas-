# Plan de implementación — E3: Motor pedagógico interactivo

> **ARCHIVADO — esta función ya está implementada.** `roadmap.md` (raíz del repo) confirma "✅ Entrega 3 — análisis interno de proposiciones" hecho. Este documento es el diseño original, útil solo como referencia histórica o si Josele pide rediscutir el diseño de fondo. Para el estado y el código reales, usa `js/modules/compuestas/index.js` y `roadmap.md`, no este archivo.

## 1. Visión general

E3 transforma el módulo de Compuestas de un **visualizador de banco** (E2) en una **herramienta de evaluación del alumno**. El alumno deja de pulsar "Ver análisis" y pasa a **resolver el ejercicio paso a paso**, con la app evaluando cada acción.

**Distribución del trabajo**:
- Backend: cambios mínimos. El endpoint `getOracionesCompuestas` ya devuelve toda la información necesaria. Solo hay que añadir un endpoint nuevo `recordResultadoCompuesta` para persistir resultados.
- Frontend: la mayoría del trabajo. Hay que implementar las 7 fases pedagógicas, el sistema de evaluación, las micro-lecciones y el scoring.

## 2. Las 7 fases pedagógicas

Inspiradas en el sistema del módulo de oración simple, adaptadas a oración compuesta. El alumno avanza linealmente de la fase 0 a la 6.

### Fase 0 — Lectura inicial
- Mostrar la oración con todos los tokens neutros (sin colorear).
- Mostrar el `consejo_inicial` de los metadatos.
- Botón "Empezar análisis →".

### Fase 1 — Identificar verbos
- Pedirle al alumno que marque los **verbos principales** de la oración.
- En perífrasis: el alumno marca el verbo léxico; la app reconoce la perífrasis completa si los tokens previos están en `verbo.indices_perifrasis`.
- **Validación**: el conjunto de tokens marcados debe coincidir con `{p.verbo.indice for p in proposiciones}`.
- **Tantos verbos como proposiciones**: si el alumno marca menos o más, se le indica el número correcto.
- **Errores comunes**: marcar el auxiliar de una perífrasis, marcar un participio o gerundio que no es núcleo.

### Fase 2 — Localizar nexos
- Pedirle al alumno que identifique los **nexos** entre proposiciones (conjunciones, pronombres relativos, locuciones).
- Solo en oraciones con ≥2 proposiciones. Si es proposición única, esta fase se omite (no aplicable).
- **Validación**: el conjunto de tokens marcados debe coincidir con `{nexo.indices[0] for nexo in nexos}` (o todos los indices si la locución es multi-token).
- La puntuación que actúa como nexo en yuxtaposición (`nexo.categoria = "puntuacion"`) puede ser un caso especial: la app pregunta "¿hay yuxtaposición?" y el alumno responde sí/no.

### Fase 3 — Delimitar proposiciones
- Visualmente: pedirle al alumno que arrastre líneas verticales (o que pulse en los límites) para separar las proposiciones.
- Alternativa más fácil de implementar: para cada token, el alumno asigna "P1", "P2", "P3"… mediante chips clicables.
- **Validación**: cada token debe estar en la proposición correcta según `p.indices`.
- Tokens compartidos: en algunas estructuras, los nexos pueden estar dentro de la PS (pronombres relativos) o fuera (conjunciones). Esta sutileza está en el schema.

### Fase 4 — Clasificar cada proposición
- Para cada proposición delimitada: el alumno elige `tipo` (principal / subordinada / coordinada / yuxtapuesta) y, si subordinada, el `subtipo` (sustantiva de CD, relativa explicativa, etc.).
- **Validación**: comparar con `p.tipo` y `p.subtipo`.
- Esta fase usa **selectores** con las listas cerradas de subtipos.

### Fase 5 — Identificar relaciones
- Para cada par de proposiciones relacionadas: el alumno indica el tipo de relación (coordinación / subordinación / yuxtaposición) y, en subordinaciones, la dirección (cuál es PP, cuál es PS) y la función de la PS.
- **Visualización**: una matriz o líneas que conectan cajas de proposición.
- **Validación**: comparar con cada `relacion` del JSON.

### Fase 6 — Análisis interno (opcional, según nivel)
- Solo en nivel avanzado: para cada proposición, identificar sujeto, predicado y funciones del predicado.
- En nivel básico y medio: esta fase se omite.
- **Validación**: comparar con `p.analisis_interno`.

> El array `metadatos.fases_activas` indica qué fases mostrar para ese ejercicio. Permite ejercicios "introductorios" que solo recorren fases 0-2 (identificar verbos y nexos) y ejercicios "completos" que recorren las 7.

## 3. Sistema de scoring

Inspirado en el módulo de oración simple:
- Cada acción correcta: +1 al contador de aciertos.
- Cada acción incorrecta: -0 (no penalización agresiva), pero queda registrada en el contador de errores.
- Después de **3 errores en la misma fase**: lanzar la **micro-lección** correspondiente.
- Al final del ejercicio: nota sobre 10 = (aciertos / total_acciones) × 10, redondeado a 0.1.

## 4. Sistema de micro-lecciones

Como en oración simple, las micro-lecciones aparecen tras 3 errores acumulados en la misma fase o categoría. Usan tono **metafórico y narrativo**, no abstracto.

Micro-lecciones necesarias para compuestas:

1. **«Cómo se cuentan los verbos»** — para Fase 1, distingue perífrasis (un verbo) de verbos coordinados (varios).
2. **«El truco del nexo»** — para Fase 2, explica los conectores típicos (conjunciones vs pronombres relativos vs puntuación yuxtapuesta).
3. **«PP y PS, ¿quién manda?»** — para Fase 4-5, distingue principal de subordinada. Usa la metáfora de árbol genealógico.
4. **«Las funciones de la PS»** — para Fase 5, recuerda que una PS puede ser CD, CI, sujeto, atributo, etc., igual que cualquier sintagma.
5. **«Cuando la PS está dentro de una preposición»** — para Fase 5 en casos de `sustantiva_termino_preposicion` + `funcion_sp`. Explica que la PS no es CD, es término de prep, y el SP completo es lo que tiene función.

Cada micro-lección sigue la plantilla del módulo simple:
- Título narrativo (no técnico).
- Cuerpo con metáfora.
- Ejemplo concreto.
- Botón "Lo entendí, sigamos".

## 5. Persistencia: `Compuestas_Resultados`

Nueva tabla a poblar con cada ejercicio terminado. Columnas (probablemente):

| Columna | Contenido |
|---|---|
| Timestamp | Fecha y hora |
| AlumnoEmail | Email autenticado |
| AlumnoNombre | Nombre que puso al entrar |
| ID_Ejercicio | OC_NNNN |
| Modo | `practica` o `examen` |
| PIN | (solo en modo examen) |
| Aciertos | Número de acciones correctas |
| Errores | Número de acciones incorrectas |
| Nota | 0.0-10.0 |
| DuracionSegundos | Tiempo total |
| FasesCompletadas | "0,1,2,3,4,5" |
| ErroresPorFase_JSON | JSON con detalle: `{"fase_1": 0, "fase_2": 1, ...}` |
| MicroleccionesVistas | "1,3" o similar |

Endpoint nuevo en `Compuestas.gs`:

```javascript
function recordResultadoCompuesta_(params) {
  // params: alumno_email, alumno_nombre, id_ejercicio, modo, pin, aciertos, errores, nota, duracion, fases, errores_fase_json, microlecciones
  // valida → escribe fila → invalida caché de stats
  return {ok: true, fila: N};
}
```

## 6. Plan de implementación por sub-entregas

### E3.1 — Fases 0, 1, 2 (lectura + verbos + nexos) [2-3 horas]
- Reemplazar la vista actual del módulo CP por una vista con estado de fase (`state.fase`).
- Implementar Fase 0 (lectura) y botón de empezar.
- Implementar selección de tokens como verbos (Fase 1) con validación.
- Implementar selección de tokens como nexos (Fase 2) con validación.
- Por ahora, sin scoring ni persistencia. Solo el flujo interactivo.

### E3.2 — Fases 3, 4 (delimitar + clasificar) [3-4 horas]
- Sistema de asignación de tokens a proposiciones (Fase 3).
- Selectores de tipo y subtipo (Fase 4).
- Validación + retroalimentación inmediata.

### E3.3 — Fase 5 (relaciones) [3 horas]
- Visualización de relaciones entre proposiciones.
- Selectores de tipo, dirección y función.
- Caso especial: `sustantiva_termino_preposicion` + `funcion_sp`.

### E3.4 — Fase 6 + scoring + micro-lecciones [4 horas]
- Implementar Fase 6 para nivel avanzado.
- Scoring acumulado y resumen final.
- Sistema de micro-lecciones (5 lecciones diseñadas).

### E3.5 — Persistencia [1-2 horas]
- Endpoint `recordResultadoCompuesta` en `Compuestas.gs`.
- Llamada al endpoint al final del ejercicio.
- Hoja `Compuestas_Resultados` con cabeceras correctas.

### E3.6 — Polish + pruebas con alumnos reales [tiempo de Josele]
- Iterar sobre retroalimentación.
- Ajustar textos de micro-lecciones según observación en aula.

## 7. Diferencias de diseño respecto al módulo simple

| Aspecto | Oración simple | Oración compuesta |
|---|---|---|
| Fases | Variables (5-7 según subfase) | 7 fijas (0-6), seleccionables vía `fases_activas` |
| Selección | Click + arrastrar palabras a bloques | Click sobre tokens (chips) |
| Visualización | Bloques con fondo de color por sintagma | Cajas de proposición con borde lateral por tipo |
| Estructura | Plana (todas las funciones a la vez) | Jerárquica (proposiciones, luego dentro de cada una) |
| Micro-lecciones | 5 existentes (CD/CI, pasivas, atributo/CPvo, régimen/CC, impersonales) | 5 nuevas (verbos, nexos, PP/PS, funciones de PS, término de prep.) |
| Modo examen | PIN + filtros (implementado) | PIN + filtros (E4) |

## 8. Riesgos conocidos

- **Fase 3 (delimitar proposiciones) es la más difícil de implementar bien**. En oraciones con incrustaciones complejas (PS dentro de PP, con un CC en medio), la asignación de tokens es ambigua. Para los 49 ejercicios actuales del banco, las delimitaciones están claras, pero esto puede romperse en lotes futuros.
- **Validación de tokens en perífrasis**: el alumno marca el verbo léxico, pero la app debe aceptar también si marca el auxiliar (porque el alumno puede tener un criterio distinto). Decidir antes de implementar.
- **El JSON de los seeds OC_0001-OC_0005 no tiene `analisis_interno` completo**, así que en Fase 6 fallarán esos ejercicios. Solución: marcar `fases_activas: [0,1,2,3,4,5]` en sus metadatos (sin la 6).

## 9. Antes de empezar E3

Confirmar con Josele:
1. ¿Empezamos por E3.1 (verbos + nexos) como prueba pequeña, o por E3.2-E3.3 (lo más visible para el alumno)?
2. ¿Generamos primero un lote 004 que regenere los 5 seeds con `analisis_interno` completo? Es lo más limpio antes de E3.
3. ¿Activamos persistencia desde E3.1 o esperamos a E3.5?

Mi recomendación: E3.1 primero (pequeña entrega validable), seeds regenerados antes de E3.2, persistencia integrada desde el principio (cosa simple).
