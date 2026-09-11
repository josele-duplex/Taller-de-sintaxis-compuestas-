/* navigation.js — Enrutamiento entre pantallas
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 2024-2039, 3875-3896.

   Dependencias temporales en globales (window.X): CP, LOGIN_PANELS,
   currentModule, selectedMode, setMode, buildSubfaseGrid,
   addDashboardButton, startLoadingTips, stopLoadingTips.
   Se resolverán como imports cuando los módulos correspondientes
   se extraigan (Pasos 6-9). */

import { applyProfileToLogin } from './profile.js';
import { pintarDistintivoCuaderno, pintarAvisoDeCambio } from './cuadernos.js';
import { limpiarTodo } from './timers.js';
import { LIGHT } from './constants.js';

// Fábrica y Laboratorio no entran en la versión ligera (Plan_Estrategico_Web.md
// §2.1.2, decisión de Josele): botón visible y pulsable, pero en vez de abrir
// el módulo muestra qué hace y que llegará más adelante — nunca "Premium",
// eso abriría un segundo muro de pago que no es el que se ha decidido vender.
const PROXIMAMENTE_INFO = {
  fabrica: { titulo: '🏭 La Fábrica de Palabras', desc: 'Desmonta y monta palabras: raíces, prefijos, sufijos… descubre de qué están hechas.' },
  laboratorio: { titulo: '🧪 El Laboratorio de Oraciones', desc: 'Rompe oraciones a propósito para ver qué las sostiene: sustituye, suprime, juzga si funcionan.' },
};

function mostrarProximamente(mod) {
  const info = PROXIMAMENTE_INFO[mod];
  if (!info) return;
  const titulo = document.getElementById('prox-titulo');
  const desc = document.getElementById('prox-desc');
  if (titulo) titulo.textContent = info.titulo;
  if (desc) desc.textContent = info.desc;
  document.getElementById('proximamente-overlay')?.classList.add('open');
}

export function showScreen(id) {
  // A6 (auditoría técnica ago-2026): centraliza la limpieza de temporizadores
  // de todos los módulos registrados (antes solo cubría sint/arcade/maestro).
  limpiarTodo();
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  // Try the id directly first (e.g. 'screen-portada'), then with 'screen-' prefix
  let el = document.getElementById(id) || document.getElementById('screen-' + id);
  if (el) {
    el.style.display = 'flex';
    el.classList.add('active');
  }
  // Start/stop loading tips rotator based on screen.
  // Guarda: si sint/index.js no llegó a cargar (p.ej. el Service Worker falló
  // en un módulo), startLoadingTips/stopLoadingTips no existen y no deben
  // tumbar la navegación entera.
  try {
    if (id === 'loading' || id === 'screen-loading') { if (typeof startLoadingTips === 'function') startLoadingTips(); }
    else if (typeof stopLoadingTips === 'function') stopLoadingTips();
  } catch (e) {}
  document.body.style.overflow = '';
}

export function showPortada() {
  showScreen('screen-portada');
  try { addDashboardButton(); } catch (e) {}
}

export function goModule(mod) {
  if (LIGHT && (mod === 'fabrica' || mod === 'laboratorio')) {
    mostrarProximamente(mod);
    return;
  }
  currentModule = mod;
  // Compuestas pasa por el login unificado (mayo 2026, Paso 3):
  // mismo nombre/email/grupo que el resto y eleccion de modo
  // (practica o examen con PIN) desde el panel.
  const panel = document.getElementById('login-module-panel');
  if (panel) panel.innerHTML = LOGIN_PANELS[mod] || '';
  // Examen con PIN: FUERA de la versión ligera (requiere que un profesor lo
  // configure en la Hoja — no tiene sentido sin centro, decisión ya tomada
  // en el plan). Se quita el botón de modo en vez de dejarlo y que falle
  // silenciosamente al no encontrar el PIN en ningún backend.
  if (LIGHT) {
    ['mc-exam', 'mm-exam', 'mc-cp-exam'].forEach(id => document.getElementById(id)?.remove());
  }
  // Hook CSS para la estética «arcade años 90»: solo cuando el módulo es Arcade.
  const scrLogin = document.getElementById('screen-login');
  if (scrLogin) scrLogin.classList.toggle('login-arcade', mod === 'arcade');
  // El campo grupo compartido (#campo-grupo) es obligatorio para todos los
  // modulos academicos. Arcade tiene su propio campo (inp-arc-grupo) dentro
  // de su LOGIN_PANEL, asi que ocultamos el compartido para no duplicar.
  const campoGrupo = document.getElementById('campo-grupo');
  if (campoGrupo) campoGrupo.style.display = (mod === 'arcade') ? 'none' : '';
  if (mod === 'sint') {
    if (selectedMode) setMode(selectedMode);
    // Build subfase grid after panel renders
    setTimeout(buildSubfaseGrid, 0);
  }
  // Distintivo del cuaderno de destino: se pinta ANTES de mostrar la
  // pantalla para que no aparezca de golpe con el login ya a la vista.
  try { pintarDistintivoCuaderno(); } catch (e) {}
  // Y, si este enlace acaba de cambiar el cuaderno, el aviso con la
  // salida. Va despues: puede esconder el distintivo de la linea de arriba.
  try { pintarAvisoDeCambio(); } catch (e) {}
  showScreen('login');
  // Pre-rellenar nombre/email/grupo si hay perfil guardado de una sesion
  // anterior. Si no hay, applyProfileToLogin() es un no-op silencioso.
  setTimeout(() => {
    try { applyProfileToLogin(); } catch (e) {}
    // Si el nombre ya esta puesto, saltamos el foco al primer campo vacio.
    const nameVal = document.getElementById('inp-name')?.value || '';
    if (!nameVal) document.getElementById('inp-name')?.focus();
    else document.getElementById('inp-email')?.focus();
  }, 100);
}
