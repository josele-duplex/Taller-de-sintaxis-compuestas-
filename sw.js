/* sw.js — Service Worker del Taller de Sintaxis
   Objetivo (fase 1, jul-2026): que la app se pueda instalar desde el
   navegador (iPad, móvil, PC) y que la INTERFAZ cargue sin conexión.

   Lo que NO hace esta primera versión (a propósito, ver conversación con
   Josele): no cachea el banco de oraciones ni permite hacer ejercicios ni
   guardar resultados sin conexión. Todas las peticiones a Apps Script
   (script.google.com) se dejan pasar sin tocar — siempre van en vivo.

   Estrategia para los archivos propios de la app (HTML/CSS/JS/assets):
   "network-first con respaldo en caché" — con conexión sirve SIEMPRE la
   versión de red (y la guarda para después); sin conexión sirve la copia
   guardada. Si no hay red y no hay caché, la petición falla como de
   costumbre (no hay nada que hacer sin haber visitado la app antes).

   OJO — antes esto era "stale-while-revalidate" (servía la caché al
   instante y refrescaba para la visita siguiente). Se cambió en jul-2026
   porque provocaba dos fallos difíciles de ver:
     1. tras cada despliegue, la primera carga mostraba la versión ANTERIOR;
     2. peor aún, podía mezclar versiones (index.html nuevo + módulos JS
        viejos), lo que hacía reaparecer bugs ya corregidos.
   Como la app no tiene build ni nombres de archivo con hash, no hay forma
   de distinguir "js/modules/compuestas/index.js v6" de "v7": la única
   estrategia segura es preguntar a la red primero.

   Para forzar que los usuarios recojan cambios grandes de golpe (en vez de
   ir refrescándose visita a visita), sube el número de CACHE_NAME.

   ⚠️ SHELL_ASSETS HAY QUE MANTENERLA AL DÍA. Cada módulo o archivo de datos
   nuevo que se añada a js/ debe entrar en la lista. Un archivo que no esté
   aquí no tiene copia de respaldo: si la red falla justo en él, el fetch
   handler no encuentra nada en caché y devuelve un error de red. Y como todo
   el frontend cuelga del grafo de imports de app.js, UN solo módulo caído
   tumba el arranque entero. Es exactamente lo que pasó el 17-ago-2026 en una
   carga en frío: fabrica, laboratorio, canon-agramatical y pruebas-sintaxis
   se habían añadido al proyecto pero nunca a esta lista. */
const CACHE_NAME = 'taller-sintaxis-shell-v7';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/legacy.css',
  './css/theme/new-ui.css',
  './assets/logo.png',
  './assets/logo_2.png',
  './assets/logo-portada.png',
  './js/app.js',
  './js/core/constants.js',
  './js/core/auth.js',
  './js/core/escape.js',
  './js/core/storage.js',
  './js/core/audio.js',
  './js/core/api.js',
  './js/core/navigation.js',
  './js/core/profile.js',
  './js/core/timers.js',
  './js/core/pwa.js',
  './js/data/diccionario-morfologia.js',
  './js/data/diccionario-sintaxis.js',
  './js/data/diccionario-sintagmas.js',
  './js/data/haber-forms.js',
  './js/data/canon-agramatical.js',
  './js/data/pruebas-sintaxis.js',
  './js/data/pruebas-morfologia.js',
  './js/glosario/tags.js',
  './js/glosario/data.js',
  './js/glosario/render.js',
  './js/gamification/levels.js',
  './js/gamification/missions.js',
  './js/gamification/missions-fabrica.js',
  './js/gamification/streak.js',
  './js/gamification/xp.js',
  './js/gamification/dashboard.js',
  './js/feedback/micro-lecciones.js',
  './js/feedback/micro-lecciones-cp.js',
  './js/feedback/pistas-sint.js',
  './js/feedback/pistas-compuestas.js',
  './js/feedback/tracking.js',
  './js/feedback/pista-ui.js',
  './js/feedback/pista-flotante.js',
  './js/modules/sint/index.js',
  './js/modules/compuestas/index.js',
  './js/modules/arcade/index.js',
  './js/modules/sintagmas/index.js',
  './js/modules/maestro/index.js',
  './js/modules/chispa/index.js',
  './js/modules/fabrica/index.js',
  './js/modules/laboratorio/index.js',
  './js/modules/teacher/index.js',
  './js/modules/teacher/informe-excel.js',
];

/* Precarga tolerante a fallos.

   NUNCA usar cache.addAll() aquí: si UN SOLO archivo de la lista devuelve
   404, addAll() rechaza, la instalación entera falla y —esto es lo grave—
   el Service Worker viejo sigue mandando indefinidamente, sirviendo su
   caché antigua. Es exactamente lo que pasó entre el 4 y el 7 de julio de
   2026: la lista incluía './js/modules/morph/index.js', ese módulo se
   archivó en _legacy/ y desde entonces ninguna instalación llegó a
   completarse en los dispositivos que ya tenían la app instalada.

   Con cache.put() archivo a archivo, un asset que falte se registra en la
   consola y el resto se guarda igual. */
async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const fallos = [];
  await Promise.all(SHELL_ASSETS.map(async (url) => {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) { fallos.push(url + ' → HTTP ' + res.status); return; }
      await cache.put(url, res);
    } catch (err) {
      fallos.push(url + ' → ' + err.message);
    }
  }));
  if (fallos.length) console.warn('[sw] Assets no cacheados:', fallos);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo interceptamos GET del propio origen. Todo lo demás (POST/GET a
  // script.google.com, fuentes de Google, etc.) pasa directo a la red:
  // los datos de la app (oraciones, resultados, exámenes) siempre en vivo.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: la red manda. Solo si falla (sin conexión) tiramos de
  // la copia guardada. Así un despliegue se ve en la PRIMERA carga y nunca
  // se mezclan archivos de dos versiones distintas.
  event.respondWith(responder(req));
});

/* Un fallo de red aquí no es un pixel torcido: si el archivo pedido es un
   módulo del grafo de app.js, devolver un error tumba el arranque entero de
   la app (ago-2026). Por eso el camino de error tiene tres oportunidades
   antes de rendirse: caché → segundo intento de red → error. */
async function responder(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return res;
  } catch (err) {
    // 1) Copia guardada, si la hay.
    const cached = await caches.match(req);
    if (cached) return cached;

    // 2) Sin copia: reintento único. Cubre el caso real que motivó esto —
    //    una carga en frío con muchas peticiones en paralelo donde el
    //    servidor deja caer alguna conexión suelta. Al recargar a mano iba
    //    todo bien, así que el reintento automático suele bastar.
    try {
      const res2 = await fetch(req);
      if (res2 && res2.ok) {
        const copy = res2.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res2;
    } catch (err2) {
      console.warn('[sw] Sin red y sin copia guardada:', req.url, err2.message);
      return Response.error();
    }
  }
}
