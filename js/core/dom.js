/* dom.js — Helpers de DOM compartidos entre módulos.
   M3 de la auditoría técnica (docs/Auditoria_Tecnica_2026-08.md): _el(id)
   estaba duplicada al carácter entre fabrica/index.js y laboratorio/index.js. */
export function _el(id) { return document.getElementById(id); }
