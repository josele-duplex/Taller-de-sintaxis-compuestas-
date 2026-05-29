/* navigation.js — Enrutamiento entre pantallas
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 2024-2039, 3875-3896.

   Dependencias temporales en globales (window.X): CP, LOGIN_PANELS,
   currentModule, selectedMode, setMode, buildSubfaseGrid,
   addDashboardButton, startLoadingTips, stopLoadingTips.
   Se resolverán como imports cuando los módulos correspondientes
   se extraigan (Pasos 6-9). */

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
  if (mod === 'sint') {
    if (selectedMode) setMode(selectedMode);
    // Build subfase grid after panel renders
    setTimeout(buildSubfaseGrid, 0);
  }
  showScreen('login');
  setTimeout(() => document.getElementById('inp-name')?.focus(), 100);
}
