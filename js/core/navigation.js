/* navigation.js — Enrutamiento entre pantallas
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 2024-2039, 3875-3896.

   Dependencias temporales en globales (window.X): CP, LOGIN_PANELS,
   currentModule, selectedMode, setMode, buildSubfaseGrid,
   addDashboardButton, startLoadingTips, stopLoadingTips.
   Se resolverán como imports cuando los módulos correspondientes
   se extraigan (Pasos 6-9). */

import { applyProfileToLogin } from './profile.js';

export function showScreen(id) {
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
  // Start/stop loading tips rotator based on screen
  if (id === 'loading' || id === 'screen-loading') startLoadingTips();
  else stopLoadingTips();
  document.body.style.overflow = '';
}

export function showPortada() {
  showScreen('screen-portada');
  try { addDashboardButton(); } catch (e) {}
}

export function goModule(mod) {
  currentModule = mod;
  // El módulo de oración compuesta no requiere login: entra directo a su pantalla
  if (mod === 'compuestas') {
    if (typeof CP !== 'undefined' && CP.enter) CP.enter();
    return;
  }
  const panel = document.getElementById('login-module-panel');
  if (panel) panel.innerHTML = LOGIN_PANELS[mod] || '';
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
