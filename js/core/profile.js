/* profile.js — Persistencia local de la identidad del alumno
   (Paso 1 del rediseno de login, mayo 2026)

   Guarda y restaura {name, email, grupo} entre sesiones y modulos para
   que el alumno no tenga que volver a identificarse cada vez que entra
   a un modulo. Vive solo en localStorage del navegador; no se envia a
   ningun sitio. El alumno puede limpiarlo desde el banner "no soy yo".
*/

import { LS_PROFILE } from './constants.js';

/* Devuelve {name, email, grupo, savedAt} o null. Es defensivo: si el
   localStorage esta corrupto o no parsea, devuelve null sin romper. */
export function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return {
      name:    typeof p.name    === 'string' ? p.name    : '',
      email:   typeof p.email   === 'string' ? p.email   : '',
      grupo:   typeof p.grupo   === 'string' ? p.grupo   : '',
      savedAt: typeof p.savedAt === 'number' ? p.savedAt : 0
    };
  } catch (e) { return null; }
}

/* Guarda {name,email,grupo}. Requiere al menos name y email; grupo es
   opcional en este paso (se hara obligatorio en el Paso 2). */
export function saveProfile({ name, email, grupo } = {}) {
  try {
    const p = {
      name:    (name  || '').trim(),
      email:   (email || '').trim().toLowerCase(),
      grupo:   (grupo || '').trim(),
      savedAt: Date.now()
    };
    if (!p.name || !p.email) return;
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
  } catch (e) {}
}

/* Borra el perfil guardado. */
export function clearProfile() {
  try { localStorage.removeItem(LS_PROFILE); } catch (e) {}
}

/* Pre-rellena los inputs del login con el perfil guardado y muestra el
   banner "Hola, [nombre]" si lo hay. Devuelve true si se aplico perfil. */
export function applyProfileToLogin() {
  const p = loadProfile();
  const nameInp   = document.getElementById('inp-name');
  const emailInp  = document.getElementById('inp-email');
  const grupoSel  = document.getElementById('inp-grupo');
  const arcGrupo  = document.getElementById('inp-arc-grupo');
  const greet     = document.getElementById('login-greeting');
  const greetName = document.getElementById('login-greeting-name');

  if (!p) {
    if (greet) greet.style.display = 'none';
    return false;
  }

  // Solo rellenamos si el input esta vacio, para no pisar lo que el alumno
  // este escribiendo en una segunda entrada de la misma pestana.
  if (nameInp  && !nameInp.value)  nameInp.value  = p.name  || '';
  if (emailInp && !emailInp.value) emailInp.value = p.email || '';
  if (grupoSel && !grupoSel.value && p.grupo) grupoSel.value = p.grupo;
  if (arcGrupo && !arcGrupo.value && p.grupo) arcGrupo.value = p.grupo;

  if (greet && greetName) {
    greetName.textContent = p.name;
    greet.style.display = 'flex';
  }
  return true;
}

/* Maneja el click en el boton "no soy yo": borra el perfil, resetea los
   inputs visibles y devuelve el foco al campo nombre. */
export function resetProfile() {
  clearProfile();
  ['inp-name','inp-email','inp-grupo','inp-arc-grupo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const greet = document.getElementById('login-greeting');
  if (greet) greet.style.display = 'none';
  setTimeout(() => document.getElementById('inp-name')?.focus(), 50);
}
