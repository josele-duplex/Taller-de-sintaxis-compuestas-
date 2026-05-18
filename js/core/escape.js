/* escape.js — Sanitización HTML
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 11336-11341 (estaban dentro del IIFE de CP).
   Promovido a Core para reuso. */

export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function escAttr(s) {
  return escHtml(s);
}
