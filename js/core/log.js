/* log.js — Silencia el ruido de depuración en producción sin tener que
   borrar las decenas de console.* repartidas por los módulos (M1 de la
   auditoría técnica ago-2026, docs/Auditoria_Tecnica_2026-08.md).

   En local (localhost / 127.0.0.1) se ve todo; publicado, solo warn y
   error — así los avisos legítimos (fallos de red, datos corruptos del
   Sheet, el guardián de arranque) siguen saliendo, pero deja de revelar
   estructura interna a quien abra la consola en un examen. */
const _dev = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export const log = {
  debug: _dev ? console.log.bind(console)  : () => {},
  info:  _dev ? console.info.bind(console) : () => {},
  warn:  console.warn.bind(console),
  error: console.error.bind(console),
};
