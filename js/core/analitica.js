/* analitica.js — Envío silencioso de analíticas de sesión al backend.
   M3 de la auditoría técnica (docs/Auditoria_Tecnica_2026-08.md): el mismo
   patrón (URLSearchParams + sendBeacon con fallback a fetch keepalive)
   estaba repetido casi literal en chispa, sintagmas y laboratorio.

   IMPORTANTE: sendBeacon exige que el payload vaya en la query string, NUNCA
   en el body — un POST de sendBeacon sin body ya se tragó semanas enteras de
   analíticas de Chispa en silencio (ver la nota de doPost en
   server/Code_v6.gs:2636). No "arreglar" esto pasando a POST con body. */
import { getApiUrl } from './api.js';
import { log } from './log.js';

export function enviarSesion(action, datos) {
  try {
    if (!datos || !datos.email) return; // sin alumno identificado, no hay a quién atribuir la fila
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    const params = new URLSearchParams({ action, ...datos });
    const url = apiUrl + '?' + params.toString();
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else fetch(url, { method: 'GET', keepalive: true }).catch(() => {});
  } catch (e) { log.warn('[analitica] enviarSesion falló:', action, e); }
}
