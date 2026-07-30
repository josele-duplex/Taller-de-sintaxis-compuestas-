# Generación de lotes de ejercicios

> **Cuándo cargar**: el usuario quiere generar oraciones/ejercicios nuevos en lote (simples o compuestas). **Cuándo NO**: para anotar un puñado de oraciones a mano ya dadas por el usuario — eso no necesita el flujo de prompt+TSV+importación, solo `conventions.md`/`schema_compuesta_v1_2.md`. Nombres de archivo de los prompts: verifica siempre contra `docs/Nuevas_funciones_sintácticas/` del repo, cambian de versión con frecuencia — no confíes en el número que cites aquí sin comprobarlo.

## 1. Prompts maestros existentes

Hay dos prompts maestros listos para usar con cualquier IA (Claude, GPT, Gemini). **Antes de usarlos, mira qué versión es la más alta que hay en `docs/Nuevas_funciones_sintácticas/` — no asumas que es la que se cita aquí.**

### Para oraciones simples
- **Archivo**: `docs/Nuevas_funciones_sintácticas/PROMPT_Analisis_Sintactico_Simples_v1_3.md` en el repo (comprueba la cabecera: puede haber una versión más alta).
- **Hoja destino**: `Oraciones_Banco`.
- **Schema**: 8 columnas fijas (estable desde inicio del proyecto).
- **Estructura**: prompt con lista cerrada de funciones válidas, schema de `Estructura_JSON` y `Tags_JSON`.

### Para oraciones compuestas
- **Archivo**: `docs/Nuevas_funciones_sintácticas/Prompt_Generador_Compuestas_v1_5.md` en el repo al momento de escribir esto (comprueba si hay una v1.6+; la numeración del prompt sube más rápido que la del schema de datos — ver `schema_compuesta_v1_2.md` §0).
- **Hoja destino**: `Compuestas_Banco`.
- **Schema**: 10 columnas + JSON Compuesta v1.2 (con las ampliaciones de §0 de `schema_compuesta_v1_2.md`).
- **Estructura**: prompt con listas cerradas de subtipos y funciones + una sección 0 de "reglas duras" (desde v1.5) que evita ejercicios que el alumno no puede terminar.

## 2. Flujo recomendado para generar un lote nuevo

### Paso 1: Decidir qué tipos de ejercicios necesitas
- ¿Qué subtipos están infrarrepresentados en el banco? (para el estado real del banco, no lo asumas de este documento — ver §4).
- ¿Qué nivel (básico/medio/avanzado)?
- ¿Qué cantidad? Por lote: 15-25 ejercicios. Más allá la IA pierde calidad.

### Paso 2: Personalizar el prompt
Abrir el prompt de compuestas vigente (§1). Rellenar los parámetros `{{N}}`, `{{N_BAS}}`, `{{N_MED}}`, `{{N_AVA}}` con los valores deseados.

**Desde v1.5, no rellenes `{{ID_START}}` ni le pidas a la IA que numere**: la columna `ID` y el campo `id` del JSON se dejan vacíos (`""`); el menú del Sheet ("🔢 Asignar IDs automáticamente") los rellena después de importar. Si trabajas con una versión de prompt anterior a 1.5, sí puede pedir `{{ID_START}}` — comprueba la cabecera del prompt que estés usando.

### Paso 3: Enviar a la IA
Copiar el prompt entero (cabecera con parámetros + cuerpo) y pegarlo en la IA junto con: "Genérame los ejercicios siguiendo este prompt".

### Paso 4: Recibir el TSV
La IA devuelve un bloque TSV con cabecera y N filas. Guardarlo como `Compuestas_Lote_NNN.tsv` (sustituye NNN por el número de lote).

### Paso 5: Validar
- **Validación rápida** (manual): abrir el TSV en un editor de texto, comprobar que tiene N+1 líneas (cabecera + N) y que cada línea tiene 10 tabuladores.
- **Validación profunda** (programática): ejecutar `node scripts/validar-banco.mjs compuestas archivo.tsv` desde la raíz del repo. Detecta problemas de schema 1.2 (ver la lista completa de reglas en `schema_compuesta_v1_2.md` §7).

### Paso 6: Importar
Sheet → Archivo → Importar → Subir → seleccionar el TSV.

**CRÍTICO**:
- Tipo de separador: **Tabulador** (NO autodetect, NO coma).
- Convertir texto en números: **No**.
- Ubicación: "Insertar nuevas filas en la hoja actual".

### Paso 7: Auto-numerar y verificar
- Menú "🌳 Oración Compuesta → 🔢 Asignar IDs automáticamente" para asignar los IDs (recuerda: desde v1.5 el lote llega con `ID` vacío a propósito).
- Menú "🔍 Auditar Compuestas_Banco" para detectar duplicados/cabeceras fantasma.
- Menú "🔄 Regenerar caché" para que la app coja los datos nuevos.

### Paso 8: Probar en la app
Abrir el módulo Compuestas. Los nuevos ejercicios deberían aparecer. Si no: revisar la auditoría.

## 3. Errores típicos en lotes generados por IA

### Error 1: Subtipo eliminado
La IA usa `sustantiva_c_regimen` (anterior a schema 1.2).

**Fix manual**: en cada fila afectada, abrir el JSON, cambiar `subtipo: "sustantiva_c_regimen"` por `subtipo: "sustantiva_termino_preposicion"` + añadir `funcion_sp: "c_regimen"` en la relación.

**Prevención**: el prompt vigente ya advierte explícitamente contra este error.

### Error 2: «que» completivo dentro de indices de la PS
La IA incluye el `que` como token de la PS, pero NGLE lo deja fuera (solo en `nexos[]`).

**Fix manual**: quitar el índice del `que` de `proposicion.indices`. Verificar que el rango de tokens de la PS no incluye el conector.

### Error 3: Olvido de `indices_perifrasis`
La IA marca solo el verbo léxico, sin listar la perífrasis completa.

**Fix manual**: en proposiciones con perífrasis, añadir el campo. No es crítico (el JSON sigue siendo válido), pero es recomendado.

### Error 4: Tokens mal categorizados
La IA pone `categoria: "adverbio"` para una preposición, etc.

**Fix manual**: revisar la columna de tokens y reasignar categorías. Usar la lista cerrada: `sustantivo`, `adjetivo`, `verbo`, `adverbio`, `pronombre`, `pronombre_relativo`, `conjuncion`, `puntuacion`, `otro`.

### Error 5: Falta `funcion_sp` en término de preposición
La IA marca `subtipo: "sustantiva_termino_preposicion"` pero olvida `funcion_sp` en la relación.

**Fix manual**: añadir `funcion_sp` con el valor correcto (`c_regimen` para verbos con régimen, `ci` para verbos con CI preposicional, `cc` para SP adverbiales, `cn` para complementos de un sustantivo, `c_adj` para complementos de adjetivo, `c_adv` para complementos de adverbio).

### Error 6: `analisis_interno` ausente o incompleto
Algunos JSONs antiguos no tienen `analisis_interno`. Sin él, las fases interactivas del motor pedagógico no pueden evaluar ese ejercicio.

**Fix**: regenerar el ejercicio con el prompt vigente.

### Error 7 (desde v1.5): la IA numera los IDs ella misma
No es un error de schema, pero desaprovecha la auto-numeración del Sheet y puede colisionar con IDs ya usados.

**Fix**: dejar `id`/`ID` vacíos al pedir el lote; si ya llegó numerado, no pasa nada — el menú "Asignar IDs automáticamente" puede renumerar igualmente.

## 4. Estado real del banco: NO lo busques en este documento

Este archivo describe el **proceso** de generar lotes, no el inventario de qué subtipos o cuántos ejercicios hay hoy en `Compuestas_Banco` — ese dato cambia cada pocas semanas y aquí se quedaría obsoleto sin que nadie lo note (le pasó una vez a otro archivo de este mismo skill, ver `architecture.md`). Para el estado real:
- `roadmap.md` y `deuda_tecnica.md` en la raíz del repo.
- La memoria automática de Claude Code (`project_bugs_compuestas_jul2026.md` y similares) para lo más reciente con fecha.
- El menú "🔍 Auditar Compuestas_Banco" del propio Sheet, que es la fuente de verdad viva.

## 5. Convención de TSV

Por qué TSV y no CSV:
- El JSON de la columna G tiene cientos de comas. CSV requiere quotación o escape complejo, propenso a errores.
- TSV usa tabulador, que no aparece en el JSON. Limpio y fiable.

Reglas del TSV:
- **Una fila por ejercicio**, sin saltos de línea dentro de campos (el validador lo detecta comparando el número de columnas de cada fila contra la cabecera).
- **Cabecera obligatoria** en la primera fila.
- **Campos NO entre comillas**. Texto plano.
- **Comillas dobles internas** (en JSON): se dejan tal cual (`"`). No se escapan (`""` ni `\"`).
- **Unicode UTF-8** sin BOM. Tildes y eñes directos.

## 6. Ejemplos de uso de los prompts

### Lote pequeño para probar
```
Genérame 5 ejercicios siguiendo el prompt anterior. Distribución:
- 2 coordinadas (1 copulativa, 1 adversativa)
- 2 subordinadas sustantivas (1 CD, 1 término de prep + funcion_sp: c_regimen)
- 1 subordinada relativa especificativa
Niveles: 2 básicos, 2 medios, 1 avanzado.
```

### Lote temático
```
Genérame 15 ejercicios sobre subordinadas adverbiales propias (temporales, locativas, modales).
Niveles: 5 básicos, 7 medios, 3 avanzados.
```

### Lote de corrección
```
Te paso 5 ejercicios JSON con errores. Corrígelos según el schema 1.2 y devuélveme el TSV.
[pegar JSONs]
```
