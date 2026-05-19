/* pista-ui.js — UI de pistas escalonadas y micro-lecciones
   Extraído de index.html (Paso 7 de la migración, mayo 2026)
   Líneas originales: 4699-4806, 7609-7610, 7646-7682.

   Estado privado: _pistaTimer, _pistaCountdown, _pendingMicroLeccion, _mlStep.
   Dependencias temporales en globales: closeFb, openOverlay, closeOverlay
   (se resolverán cuando los módulos correspondientes se extraigan en Paso 9). */

import { playClick, playSuccess, playError } from '../core/audio.js';
import { MICRO_LECCIONES, ERROR_TO_LECCION } from './micro-lecciones.js';
import { MICRO_LECCIONES_CP, ERROR_TO_LECCION_CP } from './micro-lecciones-cp.js';
import { shouldSuggestMicroLeccion } from './tracking.js';

// ── Estado privado del módulo ──
let _pistaTimer = null;
let _pistaCountdown = null;
let _pendingMicroLeccion = null;     // ID de la lección a mostrar
let _pendingMicroLeccionTipo = 'sint'; // 'sint' o 'compuesta'
let _mlStep = 0;

// Helper interno: devuelve el diccionario de lecciones que corresponde al tipo actual.
function _getCurrentLecMap() {
  return _pendingMicroLeccionTipo === 'compuesta' ? MICRO_LECCIONES_CP : MICRO_LECCIONES;
}

// ════════════════════════════════════════════════════════
// Pistas escalonadas en el overlay de feedback
// ════════════════════════════════════════════════════════

/**
 * Limpia los timers de pista del módulo (timeout + countdown). Tras la
 * migración (Paso 7) _pistaTimer y _pistaCountdown son variables privadas
 * de este módulo, así que ni Sint ni CP pueden hacer clearTimeout(_pistaTimer)
 * directamente. Esta función expone el comportamiento al exterior.
 */
export function clearPistaTimers() {
  clearTimeout(_pistaTimer);
  clearInterval(_pistaCountdown);
}

export function showPista() {
  clearTimeout(_pistaTimer);
  clearInterval(_pistaCountdown);
  const btn = document.getElementById('fb-pista-btn');
  const box = document.getElementById('fb-pista-content');
  if (!btn || !box) return;
  btn.style.display = 'none';
  // Render as structured card (label + body)
  const pistaText = box.dataset.pistaText || '';
  box.className = 'fb-card fb-pista-card';
  box.innerHTML =
    '<div class="fb-card-label"><span>🧩</span><span>Pista</span></div>' +
    '<div class="fb-card-body"></div>';
  box.querySelector('.fb-card-body').textContent = pistaText;
  box.style.display = 'block';
  playClick();
}

export function _startPistaCountdown() {
  let secs = 3;
  const timerEl = document.getElementById('fb-pista-timer');
  const btnTxt = document.getElementById('fb-pista-btn-txt');
  if (timerEl) { timerEl.style.display = 'inline'; timerEl.textContent = secs; }
  if (btnTxt) btnTxt.textContent = 'Reflexiona un momento…';
  clearInterval(_pistaCountdown);
  _pistaCountdown = setInterval(() => {
    secs--;
    if (timerEl) timerEl.textContent = secs;
    if (secs <= 0) {
      clearInterval(_pistaCountdown);
      const btn = document.getElementById('fb-pista-btn');
      if (btn) { btn.disabled = false; }
      if (timerEl) timerEl.style.display = 'none';
      if (btnTxt) btnTxt.textContent = 'Ver pista';
    }
  }, 1000);
}

// ════════════════════════════════════════════════════════
// Micro-lección: overlay con bloques (concepto + quiz)
// ════════════════════════════════════════════════════════

// Show/hide micro-lesson button in Sint's feedback overlay (#fb-leccion-wrap).
// Comportamiento original Sint sin cambios — solo añado el reset del tipo a 'sint'.
export function updateMicroLeccionButton(funcion) {
  const wrap = document.getElementById('fb-leccion-wrap');
  if (!wrap) return;
  if (shouldSuggestMicroLeccion(funcion)) {
    _pendingMicroLeccion = ERROR_TO_LECCION[funcion];
    _pendingMicroLeccionTipo = 'sint';
    wrap.style.display = 'block';
  } else {
    wrap.style.display = 'none';
  }
}

// Variante para CP: no usa #fb-leccion-wrap (CP tiene su propio UI inline).
// Si la lección debe sugerirse, almacena el ID pendiente y devuelve true.
// CP usa el booleano para decidir si pinta su propio botón "Ver lección".
export function shouldShowMicroLeccionCP(funcion) {
  if (shouldSuggestMicroLeccion(funcion, 'compuesta')) {
    _pendingMicroLeccion = ERROR_TO_LECCION_CP[funcion];
    _pendingMicroLeccionTipo = 'compuesta';
    return true;
  }
  return false;
}

// Open the micro-lesson overlay. Usa la lección guardada en
// _pendingMicroLeccion + el tipo en _pendingMicroLeccionTipo para
// determinar de qué diccionario (MICRO_LECCIONES o MICRO_LECCIONES_CP)
// hay que leer la lección.
export function openMicroLeccion() {
  if (!_pendingMicroLeccion) return;
  const lec = _getCurrentLecMap()[_pendingMicroLeccion];
  if (!lec) return;
  if (typeof closeFb === 'function') closeFb(); // close Sint feedback if applicable
  _mlStep = 0;
  document.getElementById('ml-tag').textContent = lec.tag;
  document.getElementById('ml-title').textContent = lec.titulo;
  renderMlStep(lec);
  openOverlay('ml-overlay');
}

export function renderMlStep(lec) {
  const bloque = lec.bloques[_mlStep];
  if (!bloque) {
    // Finished
    document.getElementById('ml-body').innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:2.5rem;margin-bottom:10px">🎉</div>
        <h3 style="font-size:1.1rem;font-weight:900;color:var(--green);margin-bottom:6px">¡Micro-lección completada!</h3>
        <p style="color:var(--muted);font-size:.88rem">Vuelve al análisis e inténtalo de nuevo.</p>
        <button type="button" class="btn btn-primary" style="margin-top:16px" onclick="closeMicroLeccion()">Volver al análisis</button>
      </div>`;
    document.getElementById('ml-quiz').style.display = 'none';
    renderMlProgress(lec);
    return;
  }

  if (bloque.tipo === 'concepto') {
    document.getElementById('ml-body').innerHTML = bloque.html;
    document.getElementById('ml-quiz').style.display = 'none';
    document.getElementById('ml-quiz').innerHTML = `
      <div style="text-align:center">
        <button type="button" class="btn btn-primary" onclick="mlNext()">Siguiente →</button>
      </div>`;
    document.getElementById('ml-quiz').style.display = 'block';
  }
  else if (bloque.tipo === 'quiz') {
    document.getElementById('ml-body').innerHTML = `
      <p style="font-weight:700;margin-bottom:12px;color:var(--ink)">${bloque.pregunta}</p>`;
    const quizEl = document.getElementById('ml-quiz');
    quizEl.innerHTML = bloque.opciones.map((opt, i) => `
      <button type="button" class="btn btn-ghost" style="width:100%;text-align:left;padding:12px 16px;margin-bottom:8px;font-size:.88rem;border:2px solid var(--border);border-radius:10px"
        onclick="mlAnswer(${i},${bloque.correcta},'${_pendingMicroLeccion}',${_mlStep})"
        id="ml-opt-${i}">${opt}</button>
    `).join('');
    quizEl.style.display = 'block';
  }
  renderMlProgress(lec);
}

export function renderMlProgress(lec) {
  const el = document.getElementById('ml-progress');
  el.innerHTML = lec.bloques.map((_, i) =>
    `<div style="width:10px;height:10px;border-radius:50%;background:${i < _mlStep ? 'var(--green)' : i === _mlStep ? 'var(--blue)' : 'var(--border)'}"></div>`
  ).join('') + `<div style="width:10px;height:10px;border-radius:50%;background:${_mlStep >= lec.bloques.length ? 'var(--green)' : 'var(--border)'}"></div>`;
}

export function mlNext() {
  if (!_pendingMicroLeccion) return;
  _mlStep++;
  renderMlStep(_getCurrentLecMap()[_pendingMicroLeccion]);
}

export function mlAnswer(chosen, correct, lecId, stepIdx) {
  const lec = _getCurrentLecMap()[lecId];
  if (!lec) return;
  const bloque = lec.bloques[stepIdx];
  // Disable all buttons
  document.querySelectorAll('[id^="ml-opt-"]').forEach(b => b.disabled = true);
  const chosenBtn = document.getElementById('ml-opt-' + chosen);
  const correctBtn = document.getElementById('ml-opt-' + correct);
  if (chosen === correct) {
    if (chosenBtn) chosenBtn.style.cssText += 'border-color:#059669;background:#F0FDF4;color:#166534;font-weight:700';
    playSuccess();
  } else {
    if (chosenBtn) chosenBtn.style.cssText += 'border-color:#DC2626;background:#FEF2F2;color:#991B1B;text-decoration:line-through';
    if (correctBtn) correctBtn.style.cssText += 'border-color:#059669;background:#F0FDF4;color:#166534;font-weight:700';
    playError();
  }
  // Show explanation
  const quizEl = document.getElementById('ml-quiz');
  quizEl.innerHTML += `
    <div style="margin-top:12px;padding:12px 14px;background:${chosen === correct ? '#F0FDF4' : '#FEF3C7'};border-radius:10px;font-size:.85rem;border-left:3px solid ${chosen === correct ? '#059669' : '#F59E0B'}">
      <strong>${chosen === correct ? '✅ ¡Correcto!' : '💡 No exactamente.'}</strong> ${bloque.explicacion}
    </div>
    <div style="text-align:center;margin-top:12px">
      <button type="button" class="btn btn-primary" onclick="mlNext()">${_mlStep < lec.bloques.length - 1 ? 'Siguiente →' : 'Finalizar'}</button>
    </div>`;
}

export function closeMicroLeccion() {
  closeOverlay('ml-overlay');
  _pendingMicroLeccion = null;
  _pendingMicroLeccionTipo = 'sint';
}
