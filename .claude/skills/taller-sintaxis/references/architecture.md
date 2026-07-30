# Arquitectura del proyecto Taller de Sintaxis

> **La fuente de verdad para la estructura de código es `arquitectura.md` en la
> raíz del repo** (mapa completo de módulos JS, estado, localStorage,
> convenciones de código, flujo de arranque). Este archivo NO la repite —
> solo añade lo que es específico del trabajo con el Sheet/GAS y no vive en
> ese documento. Si algo de aquí contradice `arquitectura.md`, gana
> `arquitectura.md` (se actualiza con cada sesión de código; esto es memoria
> de más largo plazo).
>
> El proyecto **ya no es un HTML monolítico**: desde mayo 2026 está
> modularizado en `js/modules/`, `js/core/`, `js/data/`, `js/feedback/`,
> `js/gamification/`, `js/glosario/`, con `index.html` reducido a solo
> markup. Para pendientes ver `roadmap.md`; para deuda técnica,
> `deuda_tecnica.md` — los tres en la raíz del repo.

## 1. Visión general

```
┌──────────────────────────────────────┐
│  Frontend — SPA estática modular      │  index.html + js/**/*.js (ES modules)
└──────────────┬───────────────────────┘
               │ fetch (HTTPS)
               ▼
┌──────────────────────────────────────┐
│  Google Apps Script web app          │  ← Backend
│  Server/Code_v6.gs + Compuestas.gs + otros
└──────────────┬───────────────────────┘
               │ SpreadsheetApp
               ▼
┌──────────────────────────────────────┐
│  Google Sheets                       │  ← Base de datos
│  Múltiples hojas, una por entidad    │
└──────────────────────────────────────┘
```

- **Hosting del frontend**: GitHub Pages (URL pública) o servidor local para pruebas.
- **El GAS expone un endpoint único** (`doGet`/`doPost`) que despacha por el parámetro `action`.

## 2. El backend (Apps Script)

### Archivos `.gs` (carpeta `Server/`)
- `Code_v6.gs` — entrada principal (`doGet`, `doPost`), dispatcher, motor de oraciones simples.
- `Compuestas.gs` — todo el módulo de oración compuesta: endpoints, banco, examen, resultados, auditoría/limpieza.
- Otros `.gs` de apoyo: `EnviarInformes.gs`, `FormatoResultados.gs`, `Minigraficos.gs`, `TablaGrupos.gs`, `AnaliticaEvolutiva.gs`.

### Helpers compartidos importantes
- `getColMap_(sheet)` — construye `{nombreCol: índice}` leyendo la fila 1. **Sensible a cabeceras fantasma**: si una columna posterior se llama igual que una anterior, la posterior gana. Revisar siempre la integridad de la fila 1 si algo no carga. Léelo por NOMBRE, nunca por letra de columna.
- `safeParseJSON(str)` — parseo defensivo, devuelve `null` si no parsea (tolera 1-4 caracteres extra al final, error frecuente en JSON generado por IA).
- `ensureCompBancoSheet_()` — devuelve la hoja `Compuestas_Banco`, creándola con cabeceras si no existe.

### Caché
- `CacheService.getScriptCache()` cachea el banco leído (claves `compuestas_all_practice` / `compuestas_all_exam`, 5 minutos). Invalidar tras importaciones masivas vía menú "🔄 Regenerar caché de compuestas".

### Despliegue del GAS — REGLA DE ORO
**SIEMPRE** "Implementar → Gestionar implementaciones → lápiz (Editar) → Nueva versión" del despliegue activo. **NUNCA** "Nueva implementación" — genera una URL distinta y la app en producción se queda apuntando a la vieja (síntoma típico: "Acción desconocida" porque sirve código antiguo).

### Funciones útiles del menú del Sheet (tras instalar `Compuestas.gs`)
Menú "🌳 Oración Compuesta": crear/parchear hojas, auditar banco, limpiar duplicados/cabeceras fantasma, migrar seeds a 4 dígitos, asignar IDs automáticamente, regenerar caché, resumen de resultados.

## 3. Las hojas de cálculo — schema por columna

`arquitectura.md` §5.4 lista todas las hojas activas. Aquí el detalle columna-por-columna de las dos que llevan lógica de parseo en el backend:

### `Oraciones_Banco` (8 columnas, 1-indexadas en `Code_v6.gs`)
| # | Columna | Contenido |
|---|---|---|
| A | `Oracion_Texto` | Texto completo de la oración |
| B | `Sujeto` | Sujeto literal · `(S.O. ...)` si tácito · `---` si impersonal |
| C | `Verbo` | Verbo conjugado (o perífrasis completa) |
| D | `Tipo_Predicado` | `Predicado Verbal` / `Predicado Nominal` / `Predicado Verbal (Pasiva Refleja)` — el backend deriva `fase3.tipo_predicado` ('PV'/'PN') de esta columna con `.includes('Nominal')` |
| E | `Estructura_JSON` | Array JSON de segmentos del predicado (`segmento`, `función`, `sintagma`, `naturaleza`, `estructura`, `consejo`) |
| F | `Activo` | `Sí` |
| G | `Tags_JSON` | `{tipo_oracion, predicado, funciones_presentes, dificultad}` |
| H | `Subfase` | `solo_np` / `np_sujeto` / `completo` / `profundo` |

Ver `PROMPT_Analisis_Sintactico_Simples_v1_3.md` (en `docs/Nuevas_funciones_sintácticas/` del repo) para el schema completo con ejemplos.

### `Compuestas_Banco` (10 columnas)
| # | Columna | Contenido |
|---|---|---|
| A | `ID` | `OC_NNNN` (4 dígitos) |
| B | `Texto` | Texto plano de la oración |
| C | `Tipo_Oracion` | `coordinada` / `subordinada` / `yuxtapuesta` / `mixta` |
| D | `Subtipo` | ver listas cerradas en `conventions.md` |
| E | `Nivel` | `basico` / `medio` / `avanzado` |
| F | `N_Proposiciones` | número entero |
| G | `JSON_Compuesta` | JSON completo del ejercicio — ver `schema_compuesta_v1_2.md` |
| H | `Activo` | `Sí` o vacío |
| I | `Tags_JSON` | metadatos auxiliares (no crítico) |
| J | `Notas_Internas` | texto libre para el profesor |

## 4. Flujo de datos típico (oración compuesta, modo lectura)

1. Alumno entra a la app → pulsa "Oración Compuesta" en portada → `goModule('compuestas')`.
2. `CP.enter()` → `loadBanco()` si no está cargado → `fetch(URL?action=getOracionesCompuestas&mode=practice)`.
3. GAS lee `Compuestas_Banco`, devuelve `{ok: true, ejercicios: [...], total: N, mode: 'practice'}`.
4. `CP` valida cada ejercicio con `isValidEjercicio(ej)`, guarda en `state.ejercicios`.
5. Filtros → `state.filtered` se recalcula → navegación con `state.idx`.

Para el resto de módulos (Sint, Arcade, Morph, etc.) el patrón es análogo: `fetch` a un `action` distinto, GAS lee la hoja correspondiente por `getColMap_`, arma el objeto que espera el frontend.

## 5. Estado del proyecto y pendientes

No se documenta aquí para evitar que quede desfasado (es exactamente lo que le pasó a la versión anterior de este archivo, que describía un HTML monolítico ya inexistente). Consulta:
- `roadmap.md` (raíz del repo) — pendientes con estado real.
- La memoria automática de Claude Code (`project_migration_progress.md` y demás `project_*`) — estado de sesión a sesión, con fechas.
