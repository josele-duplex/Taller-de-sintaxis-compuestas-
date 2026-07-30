# Plan de implementación — E4: Modo examen con PIN para compuestas

> **ARCHIVADO — esta función ya está implementada.** `roadmap.md` (raíz del repo) confirma "✅ Modo examen con PIN en compuestas (4.3)" hecho. Este documento es el diseño original, útil solo como referencia histórica. Para el estado y el código reales, usa `Server/Compuestas.gs` y `roadmap.md`, no este archivo.

## 1. Visión general

E4 añade al módulo de Compuestas la posibilidad de que el profesor configure exámenes con PIN, igual que ya existe para oración simple. El backend ya tiene **buena parte implementada** en `Compuestas.gs`; el trabajo es mayoritariamente frontend + UX del panel del profesor.

**Pre-requisito**: E3 debe estar al menos parcialmente completa, porque el modo examen necesita el motor pedagógico para evaluar.

## 2. Backend (ya implementado o casi)

En `Compuestas.gs` ya están las funciones:
- `crearExamenCompuestas_(params)` — crea un examen con PIN, filtros, nº ejercicios, timer.
- `getExamenCompuestas_(params)` — devuelve la configuración + ejercicios para un PIN.
- `recordResultadoCompuesta_(params)` — graba el resultado del alumno (también en modo práctica).

La hoja `Compuestas_Examenes` ya tiene su esquema. Columnas:
- `PIN`, `FechaCreacion`, `ProfesorEmail`, `Activo`, `NEjercicios`, `TimerSegundos`, `Filtros_JSON`, `Ejercicios_IDs_JSON`.

## 3. Frontend — qué hay que hacer

### 3.1 Pantalla de selección de modo
Al entrar al módulo, presentar dos opciones:
- **Modo práctica** (lo actual, sin restricciones).
- **Modo examen** → pide PIN.

```
[ENTRA AL MÓDULO]
   ↓
[Modo Práctica]   [Modo Examen]
                       ↓
                  [Pide PIN]
                       ↓
                  [Valida con backend]
                       ↓
                  [Pide nombre + email]
                       ↓
                  [Lanza ejercicios secuenciales]
```

### 3.2 Validación del PIN
- Llamada `getExamenCompuestas?pin=XXXX`.
- Si el PIN no existe o está inactivo: error claro.
- Si existe: devuelve `{ejercicios: [...], timer: N, n_ejercicios: M}`.

### 3.3 Email de alumno
- Igual que en oración simple: solo aceptar dominios `@murciaeduca.es`, `@alu.murciaeduca.es`, `@gmail.com`.
- Validar antes de empezar.

### 3.4 Timer global
- Si el examen tiene `timer_segundos > 0`, mostrar countdown.
- Al expirar: enviar resultado parcial automático y mostrar "Tiempo agotado".

### 3.5 Avance secuencial sin retroceso
- En examen NO se permite volver a un ejercicio anterior.
- Se elimina el botón "← Anterior".
- Solo "Siguiente →".

### 3.6 Resultado final
- Mostrar nota global, tiempo usado, desglose por ejercicio.
- Enviar resultado completo a `recordResultadoCompuesta`.
- Opcionalmente enviar email al profesor (lo hace `Code_v6.gs` ya en sintaxis simple; replicar patrón).

## 4. Panel del profesor — qué hay que añadir

En la pantalla `screen-teacher`, añadir una sección "Exámenes de Oración Compuesta" con:

### 4.1 Crear nuevo examen
Formulario:
- **PIN**: 4-6 dígitos numéricos (o generado automáticamente).
- **Número de ejercicios**: 5, 10, 15, 20.
- **Timer**: 10, 20, 30, 45 minutos (o sin timer).
- **Filtros**:
  - Tipo de oración: chips múltiples.
  - Subtipo: chips múltiples.
  - Nivel: chips múltiples.
  - Nº de proposiciones: chips múltiples.

Al pulsar "Crear examen":
- Llamada a `crearExamenCompuestas` con los parámetros.
- El backend selecciona N ejercicios al azar que cumplen los filtros.
- Se guarda en `Compuestas_Examenes` con un PIN único.
- Se muestra el PIN al profesor con instrucciones para repartirlo en clase.

### 4.2 Lista de exámenes activos
Tabla con: PIN, fecha de creación, número de ejercicios, número de alumnos que ya lo han hecho, nota media, botones (Ver resultados / Desactivar).

### 4.3 Ver resultados de un examen
Tabla con: alumno, nota, tiempo, desglose por ejercicio. Botón "Exportar CSV" como en oración simple.

## 5. Estructura de `crearExamenCompuestas_` (backend, ya existe)

```javascript
function crearExamenCompuestas_(params) {
  // params: pin, n_ejercicios, timer_segundos, filtros_json
  // 1. Valida que el PIN no exista ya
  // 2. Lee Compuestas_Banco
  // 3. Aplica filtros
  // 4. Si hay menos ejercicios que los pedidos → error
  // 5. Selecciona N al azar
  // 6. Escribe fila nueva en Compuestas_Examenes
  return {ok: true, pin: 'XXXX', nEjerciciosReales: N};
}
```

## 6. Validaciones críticas

- **PIN único**: no se puede crear dos exámenes con el mismo PIN simultáneamente. Si se intenta, error.
- **Email obligatorio**: en modo examen, el email es obligatorio (en práctica es opcional). Sin email → no se permite empezar.
- **No reentrada**: si un alumno ya hizo un examen (mismo PIN + email), no se le permite hacerlo otra vez. La validación es en backend: comprobar `Compuestas_Resultados`.
- **Cero ejercicios disponibles**: si los filtros del examen restringen demasiado, error claro al profesor.

## 7. Diferencias con el examen de oración simple

| Aspecto | Simple | Compuesta |
|---|---|---|
| Hoja de config | `Examenes_Config` | `Compuestas_Examenes` |
| Hoja de resultados | `Alumnos_Resultados` | `Compuestas_Resultados` |
| Pin | Numérico 4-6 | Numérico 4-6 (mismo formato) |
| Filtros | Por subfase + función | Por tipo + subtipo + nivel + nº prop |
| Email | Validado | Validado |
| Timer | Configurable | Configurable |
| Reentrada | Bloqueada | Bloqueada |

## 8. Plan de implementación

### E4.1 — Pantalla de selección de modo + flujo PIN [2 horas]
- Reemplazar `CP.enter()` para mostrar primero selector práctica/examen.
- Si examen: pedir PIN, validar, pedir email+nombre, lanzar.
- Si práctica: comportamiento actual.

### E4.2 — Timer + secuencia bloqueada [1-2 horas]
- Componente de timer global.
- Bloqueo de botón "Anterior".
- Manejo de tiempo agotado.

### E4.3 — Resultado final [1-2 horas]
- Pantalla de resumen con nota global y desglose.
- Envío a `recordResultadoCompuesta` con detalles del examen.

### E4.4 — Panel del profesor [3-4 horas]
- Formulario de creación de examen.
- Lista de exámenes activos.
- Vista de resultados.
- Exportación CSV.

### E4.5 — Validaciones + pruebas reales [1-2 horas]
- Reentrada bloqueada.
- PIN único.
- Filtros restrictivos.
- Pruebas reales con alumnos en aula.

## 9. Antes de empezar E4

Confirmar con Josele:
1. ¿Los exámenes deben permitir retroceso o no? (Mi recomendación: no, igual que oración simple.)
2. ¿El alumno ve la nota al final del examen, o queda oculta hasta que el profesor la libere? (En oración simple ahora se ve. Mantener.)
3. ¿Se envía email al profesor al terminar cada alumno, o solo agregado al cerrar el examen? (Decidir según volumen estimado.)

## 10. Riesgos

- **Concurrencia**: si 30 alumnos abren el mismo PIN simultáneamente, el backend GAS tiene cuotas. Mitigación: cachear la config del examen tras la primera lectura (5 min).
- **Pérdida de conexión durante examen**: si el alumno cierra el navegador a la mitad, su progreso se pierde (no se guarda parcial). Mitigación opcional: guardar cada 30 segundos en localStorage. Pero esto puede generar bug si el alumno reabre y la pestaña conflictúa.
- **Pegar respuestas**: con el modo lectura visible (E2), si el examen está mal aislado del modo práctica, el alumno podría abrir otra pestaña y ver el análisis completo. Mitigación: deshabilitar el módulo "Oración Compuesta práctica" durante un examen, o más simple: el examen no usa el código de práctica, usa un componente aparte que jamás muestra el análisis.
