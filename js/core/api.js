/* api.js — Comunicación con el backend de Google Apps Script
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 939, 1782-1837. */

import { LS_API, DEFAULT_API_URL } from './constants.js';

export function getApiUrl() {
  return localStorage.getItem(LS_API) || DEFAULT_API_URL || '';
}

// ════════════════════════════════════════════════════════
// FETCH WITH TIMEOUT (AbortSignal fallback for older browsers)
// ════════════════════════════════════════════════════════
export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// fetchWithRetry: intenta fetchWithTimeout hasta `retries+1` veces, con backoff exponencial.
// El primer intento usa el timeout indicado; los reintentos van sumando tiempo extra
// porque suelen producirse cuando el servidor (Apps Script) está "frío".
//
// Uso: const r = await fetchWithRetry(url, {}, {timeoutMs:9000, retries:2});
export async function fetchWithRetry(url, options = {}, opts = {}) {
  const timeoutMs = opts.timeoutMs || 9000;
  const retries = (opts.retries === undefined) ? 2 : opts.retries;
  const onRetry = opts.onRetry || (() => {});
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Each retry gets a slightly longer timeout
      const tm = timeoutMs + (attempt * 4000);
      const r = await fetchWithTimeout(url, options, tm);
      // 200-299 = OK; otherwise treat as retryable error
      if (r.ok || r.status === 0) return r;
      // 4xx is not retryable (client error); 5xx is
      if (r.status >= 400 && r.status < 500) return r;
      lastErr = new Error('HTTP ' + r.status);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) {
      onRetry(attempt + 1, lastErr);
      // Backoff: 800ms, 2000ms, 4000ms
      const delay = 800 * Math.pow(2, attempt);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastErr || new Error('Fetch failed after retries');
}

// Pre-warm Apps Script (fire and forget). Llamar al cargar el panel del profesor
// y al iniciar sesión, para evitar el "primer intento falla por timeout".
export function warmupApi() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return;
  try {
    // No esperar la respuesta; solo despertar el GAS
    fetch(apiUrl + '?action=ping', { method: 'GET', cache: 'no-store' }).catch(() => {});
  } catch (e) {}
}
