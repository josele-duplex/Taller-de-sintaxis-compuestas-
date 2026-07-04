/* pwa.js — Registro del Service Worker (instalación + shell offline).
   Fase 1 (jul-2026): solo cachea la interfaz (HTML/CSS/JS/assets), no el
   banco de oraciones ni los resultados. Ver sw.js para la estrategia.

   No hace nada bajo file:// (los Service Workers exigen http/https) ni si
   el navegador no los soporta — en ambos casos la app sigue funcionando
   igual que hasta ahora, solo que sin instalación ni modo offline. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('[pwa] Service Worker registrado.', reg.scope))
      .catch((err) => console.warn('[pwa] No se pudo registrar el Service Worker.', err));
  });
}
