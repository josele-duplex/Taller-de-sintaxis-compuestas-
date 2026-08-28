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

/* Escapa un valor para CSV neutralizando además el arranque de fórmula
   (C5, auditoría técnica ago-2026). Excel y LibreOffice ejecutan cualquier
   celda que empiece por = + - @ (o por tab / CR), así que un nombre de
   alumno puede convertirse en código que se ejecuta en el ordenador del
   profesor al abrir el CSV exportado. El prefijo ' la marca como texto sin
   que se vea al abrirla. Sustituye a las dos copias locales idénticas que
   había en teacher/index.js (solo entrecomillaban, sin neutralizar). */
export function escCSV(v) {
  if (v == null) return '""';
  let s = String(v).replace(/\r\n?/g, ' ');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
