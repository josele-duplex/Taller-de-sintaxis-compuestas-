# Troubleshooting — Problemas recurrentes y diagnóstico

> **Cuándo cargar**: el usuario reporta un bug, un error de carga, datos que no aparecen o comportamiento raro tras un despliegue. **Cuándo NO**: para diseñar una función nueva (usa `conventions.md` / `schema_compuesta_v1_2.md`).

> Antes de aplicar cualquier fix, **lee el panel de diagnóstico técnico** que el módulo CP muestra en errores de carga. Esa información ahorra horas.

## Tabla de síntomas y causas más probables

| Síntoma | Causa más probable | Sección |
|---|---|---|
| "Acción desconocida: getOracionesCompuestas" | URL del API apunta a un GAS antiguo sin Compuestas | §1 |
| "Banco vacío o respuesta sin array de ejercicios" | Caché del GAS sirviendo datos viejos, o cabecera fantasma en columna K rompe `getColMap_()` | §2 |
| "Failed to fetch" / "Network error" | URL caducada / GAS sin desplegar / sin permisos públicos | §3 |
| Misma acción funciona en navegador pero no en app | Caché del navegador con HTML viejo o localStorage con URL vieja | §4 |
| "El GAS no funcionaba y de repente sí" | Propagación lenta de Apps Script tras despliegue | §5 |
| Columnas del lote importado no cuadran con seeds | TSV importado con separador equivocado | §6 |
| Filas duplicadas en Compuestas_Banco | Doble import sin borrar las previas | §7 |
| IDs heterogéneos en la hoja | Lotes con numeraciones distintas, o seeds OC_NNN sin migrar | §8 |
| Cambios al GAS no se reflejan en la app | El GAS no se redesplegó como nueva versión | §9 |

---

## §1 — "Acción desconocida: getOracionesCompuestas"

### Diagnóstico
El GAS responde, pero **con código antiguo que no conoce `getOracionesCompuestas`**. Es decir: hay al menos dos versiones del GAS desplegadas en URLs distintas, y la app está llamando a la URL antigua.

Esto ocurre cuando alguna vez se hizo "Nueva implementación" en lugar de "Nueva versión".

### Fix paso a paso

1. Apps Script → **Implementar → Gestionar implementaciones**.
2. Identifica cuál es la implementación que tiene el código actual (la que SÍ conoce `getOracionesCompuestas`). Para confirmarlo: copia su URL y pégala en el navegador con `?action=getOracionesCompuestas&mode=practice`. Si devuelve los ejercicios, es la correcta.
3. **Solución rápida (solo para tu navegador)**: en la app, toca 3 veces el ✒️ de la portada → panel del profesor → campo "URL del API" → pega la URL correcta → guardar.
4. **Solución definitiva**: actualizar el `DEFAULT_API_URL` del HTML (línea ~4367) con la URL correcta. Volver a desplegar el HTML.
5. **Solución más limpia**: archivar todas las implementaciones del GAS excepto la correcta. Gestionar implementaciones → tres puntos de cada vieja → Archivar.

### Prevención
**Regla de oro del GAS**: para actualizar, siempre "Implementar → Gestionar implementaciones → lápiz → Versión nueva". NUNCA "Nueva implementación".

---

## §2 — "Banco vacío" pese a tener filas

### Diagnóstico A: caché del GAS
El `CacheService` del GAS guarda el banco durante 5 minutos. Si recién importaste filas, puede estar sirviendo todavía la versión vieja vacía.

**Fix**: menú "🌳 Oración Compuesta → 🔄 Regenerar caché de compuestas".

### Diagnóstico B: cabecera fantasma rompe `getColMap_()`
`getColMap_()` construye `{nombre_columna: índice}` leyendo la fila 1. Si hay otra columna con el mismo nombre más allá de la columna J (típicamente una "ID" residual en columna K), la columna posterior gana en el diccionario. El GAS busca el ID en columna K (vacía), no encuentra nada y descarta todas las filas.

**Fix**: menú "🌳 Oración Compuesta → 🧹 Limpiar cabeceras fantasma". Luego "🔄 Regenerar caché de compuestas".

### Diagnóstico C: filtro de `Activo` excluye todo
Si por error todas las filas tienen vacía la columna H (`Activo`) o tienen un valor distinto de `Sí`, el endpoint las omite.

**Fix**: rellena manualmente la columna H con `Sí` en todas las filas; o ejecuta menú "🛠️ Crear/parchear hojas del módulo" que lo arregla.

---

## §3 — "Failed to fetch"

### Posibles causas
1. **GAS sin desplegar** o despliegue eliminado.
2. **Permisos**: el web app no está configurado como "Cualquiera, incluso anónimos". Esto pasa cuando se cambia accidentalmente a "Cualquiera con cuenta de Google".
3. **CORS**: raro, porque Apps Script ya devuelve cabeceras adecuadas. Pero si modificaste headers, revísalo.

### Fix
1. Verifica que la URL del API resuelve manualmente en el navegador con `?action=getOracionesCompuestas&mode=practice`. Si devuelve JSON, la URL es válida.
2. Si devuelve una pantalla de login de Google, los permisos están mal.
3. Volver a configurar: Apps Script → Implementar → Gestionar implementaciones → lápiz → "¿Quién tiene acceso?" → **Cualquiera**.

---

## §4 — La URL en el navegador funciona, pero la app sigue diciendo error

### Diagnóstico
- **Caché del navegador**: la app sigue ejecutando el HTML viejo.
- **localStorage** con la URL vieja: el panel del profesor sobrescribe `DEFAULT_API_URL`. Si guardaste ahí una URL vieja, gana sobre la del HTML.

### Fix
1. **Ctrl+F5** (Windows/Linux) o **Cmd+Shift+R** (Mac) para forzar recarga sin caché.
2. Si persiste: abre DevTools (F12) → pestaña Application → Local Storage → busca clave `LS_API` o similar → bórrala.
3. O entra al panel del profesor y pon la URL correcta a mano.

---

## §5 — "No funcionaba y de repente funciona"

### Diagnóstico
Apps Script tarda entre segundos y varios minutos en propagar el código nuevo a sus servidores. Mientras se propaga, distintas peticiones van a distintos servidores y unas tienen el código nuevo y otras el antiguo. Esto es **normal y esperado**.

### Recomendación
Tras cada despliegue del GAS, esperar 1-3 minutos antes de probar. Si tras 5 minutos sigue fallando, sospechar otra causa.

---

## §6 — Las columnas del lote importado no cuadran con los seeds

### Diagnóstico
Al importar un TSV, Google Sheets detectó **comma** o **autodetect** en lugar de **Tabulador**. El JSON_Compuesta tiene cientos de comas internas → se rompe en docenas de columnas.

### Fix
1. Borra todas las filas mal importadas.
2. Vuelve a importar con `Archivo → Importar → Subir`.
3. En el diálogo:
   - Tipo de separador: **Tabulador** (NO autodetect, NO coma)
   - Convertir texto en números: **No**
   - Ubicación: "Insertar nuevas filas en la hoja actual"

### Prevención
Cuando entregues un TSV a Josele, recuérdale siempre los 3 ajustes anteriores.

---

## §7 — Filas duplicadas en Compuestas_Banco

### Diagnóstico
Una importación se hizo dos veces (típicamente porque la primera salió mal y se reimportó sin borrar las filas previas).

### Fix
Menú "🌳 Oración Compuesta → 🧹 Limpiar duplicados". La función conserva la fila más abajo (asumida como la más reciente, normalmente la corregida) y borra las anteriores. Pide confirmación antes de actuar.

---

## §8 — IDs heterogéneos (mezclando OC_NNN y OC_NNNN)

### Diagnóstico
Los 5 seeds antiguos tenían formato `OC_001`, `OC_002`… (3 dígitos). Los lotes nuevos usan `OC_0006`, `OC_0007`… (4 dígitos).

### Fix
Menú "🌳 Oración Compuesta → 🔁 Migrar seeds a 4 dígitos". Renombra `OC_NNN` a `OC_0NNN` tanto en la columna A como dentro del campo `"id"` del JSON. Si el ID destino ya existe, NO migra esa fila y lo reporta.

---

## §9 — Cambios al GAS no se reflejan en la app

### Diagnóstico
Modificaste `Compuestas.gs` (u otro `.gs`) pero olvidaste **redesplegar como nueva versión**. El web app sigue ejecutando el código de la última versión publicada.

### Fix
Apps Script → **Implementar → Gestionar implementaciones**.
1. Localiza la implementación activa.
2. Pulsa el icono de lápiz (editar).
3. En el desplegable "Versión", selecciona **"Nueva versión"**.
4. En "Descripción", pon algo útil como "v6.5 — añadida función X".
5. Implementar.
6. Espera 1-3 minutos para propagación.

---

## Flujo de diagnóstico recomendado

Cuando Josele reporta "no funciona":

1. **Pídele el panel de diagnóstico técnico** del módulo CP (si fue un error de carga del banco). Es el atajo más eficaz.
2. Si dice "Acción desconocida": §1.
3. Si dice "Banco vacío": §2.
4. Si dice "Failed to fetch": §3.
5. Si el navegador resuelve pero la app no: §4.
6. Si funciona "sin hacer nada": §5 (propagación, normal).
7. Si trata de importación: §6 o §7.
8. Si modificó algo y no se refleja: §9.

**Nunca asumas que la URL del HTML y la URL real del GAS son la misma**. Es la causa #1 de problemas en este proyecto.
