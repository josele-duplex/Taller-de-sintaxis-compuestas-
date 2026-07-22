/* sw.js — Service Worker del Taller de Sintaxis
   Objetivo (fase 1, jul-2026): que la app se pueda instalar desde el
   navegador (iPad, móvil, PC) y que la INTERFAZ cargue sin conexión.

   Lo que NO hace esta primera versión (a propósito, ver conversación con
   Josele): no cachea el banco de oraciones ni permite hacer ejercicios ni
   guardar resultados sin conexión. Todas las peticiones a Apps Script
   (script.google.com) se dejan pasar sin tocar — siempre van en vivo.

   Estrategia para los archivos propios de la app (HTML/CSS/JS/assets):
   "stale-while-revalidate" — sirve la copia en caché al instante y, en
   paralelo, pide la versión de red para refrescar la caché de cara a la
   próxima carga. Si no hay red y no hay caché, la petición falla como de
   costumbre (no hay nada que hacer sin haber visitado la app antes).

   Para forzar que los usuarios recojan cambios grandes de golpe (en vez de
   ir refrescándose visita a visita), sube el número de CACHE_NAME. */
const CACHE_NAME = 'taller-sintaxis-shell-v4';

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
  './js/core/pwa.js',
  './js/data/diccionario-morfologia.js',
  './js/data/diccionario-sintaxis.js',
  './js/data/diccionario-sintagmas.js',
  './js/data/haber-forms.js',
  './js/glosario/tags.js',
  './js/glosario/data.js',
  './js/glosario/render.js',
  './js/gamification/levels.js',
  './js/gamification/missions.js',
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
  './js/modules/morph/index.js',
  './js/modules/sintagmas/index.js',
  './js/modules/maestro/index.js',
  './js/modules/chispa/index.js',
  './js/modules/teacher/index.js',
  './js/modules/teacher/informe-excel.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
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

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
