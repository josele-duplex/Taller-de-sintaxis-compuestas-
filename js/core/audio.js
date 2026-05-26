/* audio.js — Sistema de sonidos via Web Audio API (sin archivos de audio)
   Extraído de index.html (Paso 5 de la migración, mayo 2026)
   Líneas originales: 1227-1260.
   Estado privado del módulo: _audioCtx, _soundOn. */

import { LS_SOUND } from './constants.js';

let _audioCtx = null;
let _soundOn = localStorage.getItem(LS_SOUND) !== 'false';

function _getCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { _soundOn = false; }
  }
  return _audioCtx;
}

function _tone(freq, dur, type = 'sine', vol = 0.13) {
  if (!_soundOn) return;
  const ctx = _getCtx(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + dur);
}

export function playSuccess() {
  if (!_soundOn) return;
  _tone(523, .09, 'sine', .12);
  setTimeout(() => _tone(659, .09, 'sine', .12), 70);
  setTimeout(() => _tone(784, .14, 'sine', .14), 140);
}

export function playError() {
  if (!_soundOn) return;
  _tone(310, .12, 'triangle', .1);
  setTimeout(() => _tone(247, .16, 'triangle', .08), 100);
}

export function playComplete() {
  if (!_soundOn) return;
  _tone(523, .1, 'sine', .12);
  setTimeout(() => _tone(659, .1, 'sine', .12), 90);
  setTimeout(() => _tone(784, .1, 'sine', .12), 180);
  setTimeout(() => _tone(1047, .2, 'sine', .13), 270);
}

export function playClick() {
  if (!_soundOn) return;
  _tone(880, .04, 'sine', .07);
}

export function toggleSound() {
  _soundOn = !_soundOn;
  localStorage.setItem(LS_SOUND, String(_soundOn));
  const btn = document.getElementById('sound-toggle');
  if (btn) { btn.textContent = _soundOn ? '🔊' : '🔇'; btn.classList.toggle('muted', !_soundOn); }
  if (_soundOn) playClick();
}

export function initSoundBtn() {
  const btn = document.getElementById('sound-toggle');
  if (btn) { btn.textContent = _soundOn ? '🔊' : '🔇'; btn.classList.toggle('muted', !_soundOn); }
}

// Wrapper público de _tone para módulos que no tienen acceso al estado privado.
export function playTone(freq, dur, type = 'sine', vol = 0.13) { _tone(freq, dur, type, vol); }

// Accessor para módulos externos (p.ej. arcade) que necesitan saber si el sonido está activo.
// Cuando se modularicen todos los módulos, sustituirán las referencias a _soundOn por isSoundOn().
export function isSoundOn() { return _soundOn; }
