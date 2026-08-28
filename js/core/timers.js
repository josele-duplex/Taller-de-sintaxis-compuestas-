/* timers.js — Registro central de limpieza de temporizadores.
   Creado para A6 de la auditoría técnica (docs/Auditoria_Tecnica_2026-08.md):
   antes, cleanAllTimers() vivía en sint/index.js con una lista escrita a
   mano (G, ARC, MC) y los módulos posteriores (CP, FAB, LAB) nunca llegaron
   a entrar en ella, así que sus temporizadores sobrevivían a la navegación.

   Cada módulo con un temporizador activo se registra aquí; navigation.js
   llama a limpiarTodo() en cualquier cambio de pantalla. */
import { log } from './log.js';

const _limpiadores = new Set();

export function registrarLimpieza(fn) {
  if (typeof fn === 'function') _limpiadores.add(fn);
  return () => _limpiadores.delete(fn);
}

export function limpiarTodo() {
  _limpiadores.forEach(fn => {
    try { fn(); } catch (e) { log.warn('[timers] limpiador falló', e); }
  });
}
