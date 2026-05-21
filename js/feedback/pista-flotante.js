/* pista-flotante.js — Ventana flotante de pista (CP y Sint)
   Mayo 2026, A.1 del rediseño visual.

   Reemplaza la "caja amarilla" inline (.cp-feedback-pista, .fb-pista-box)
   por una tarjeta flotante posicionada en la esquina inferior derecha
   (o como bottom-sheet en móvil), siempre visible sin scroll. Diseño
   coherente para los dos módulos: paleta teal/navy en lugar de amarillo.

   API pública (expuesta en window via app.js):
     showPistaFlotante({titulo?, html, leccionId?, tipo?})
     closePistaFlotante()
*/

let _abierto = false;
let _onCloseCb = null;

// Asegurarse de que el contenedor existe en el DOM
function _ensureContainer(){
  let el = document.getElementById('pista-flotante');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'pista-flotante';
  el.setAttribute('role', 'complementary');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-label', 'Pista');
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}

/**
 * Muestra la ventana flotante de pista.
 *
 * @param {object} opts
 * @param {string} [opts.titulo='Pista']  - Título corto (aparece en el chip)
 * @param {string} opts.html              - Contenido HTML del cuerpo (escapado por el llamante)
 * @param {string} [opts.leccionId]       - ID de micro-lección si hay botón "Ver lección"
 * @param {string} [opts.tipo='sint']     - 'sint' o 'compuesta' (para el dispatcher de lecciones)
 * @param {Function} [opts.onClose]       - Callback al cerrar
 */
export function showPistaFlotante(opts){
  const o = opts || {};
  const titulo = o.titulo || 'Pista';
  const html   = o.html   || '';
  const lecId  = o.leccionId || '';
  const tipo   = o.tipo   || 'sint';
  _onCloseCb   = typeof o.onClose === 'function' ? o.onClose : null;

  const el = _ensureContainer();
  // Si vamos a abrir una pista distinta a la que ya hay, la sustituimos
  // sin animación de cierre/apertura (transición suave de contenido).
  el.innerHTML = `
    <div class="pf-card" role="dialog" aria-modal="false">
      <div class="pf-card-hdr">
        <span class="pf-card-chip">
          <span class="pf-card-icon" aria-hidden="true">💡</span>
          <span>${escapeBasic(titulo).toUpperCase()}</span>
        </span>
        <button type="button" class="pf-card-close" aria-label="Cerrar pista"
          onclick="closePistaFlotante()">✕</button>
      </div>
      <div class="pf-card-body">${html}</div>
      ${lecId ? `
        <div class="pf-card-footer">
          <button type="button" class="pf-card-leccion-btn"
            data-leccion="${escapeAttr(lecId)}"
            data-tipo="${escapeAttr(tipo)}"
            onclick="pfOpenLeccion(this)">📖 Ver micro-lección</button>
        </div>` : ''}
    </div>`;
  // Activar. Hacemos el reflow + add-class en frames separados con rAF para
  // garantizar que el navegador ve los dos estados (oculto → visible) y
  // dispara la transición.
  el.hidden = false;
  el.classList.remove('pf-open');
  // Forzar reflow leyendo offsetHeight
  void el.offsetHeight;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      el.classList.add('pf-open');
    });
  });
  _abierto = true;
}

export function closePistaFlotante(){
  const el = document.getElementById('pista-flotante');
  if(!el) return;
  el.classList.remove('pf-open');
  _abierto = false;
  // Esperar a que termine la transición antes de ocultar
  setTimeout(()=>{
    if(!_abierto && el){ el.hidden = true; el.innerHTML = ''; }
  }, 220);
  if(_onCloseCb){ try{ _onCloseCb(); }catch(e){} _onCloseCb = null; }
}

// Helper: ¿está abierta?
export function isPistaFlotanteOpen(){ return _abierto; }

// Helper interno para abrir la micro-lección desde el botón footer.
// Asume que pista-ui.js ya tiene `_pendingMicroLeccion` cargada
// (lo hace shouldShowMicroLeccionCP o updateMicroLeccionButton antes
// de mostrar la pista flotante). Cuando leccionId='__pending__' eso es
// exactamente la situación habitual.
export function pfOpenLeccion(btn){
  closePistaFlotante();
  setTimeout(()=>{
    if(typeof window.openMicroLeccion === 'function') window.openMicroLeccion();
  }, 230);
}

// Cerrar con Escape
window.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && _abierto) closePistaFlotante();
});

// ── Helpers locales ────────────────────────────────────────
function escapeBasic(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeAttr(s){
  return escapeBasic(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
