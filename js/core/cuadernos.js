/* cuadernos.js — Lista blanca de cuadernos de profesor (paso 3 del
   protocolo de compartir la app con el departamento, ago-2026).

   ─── QUÉ ES ESTO, EN CRISTIANO ────────────────────────────────────
   Cada profesor que use la app tiene SU cuaderno: su copia del Google
   Sheet y su propio despliegue de Apps Script. Este archivo es la
   lista —cerrada— de los cuadernos que la app acepta, y le pone a
   cada uno un nombre corto para poder nombrarlo en un enlace:

       https://…/index.html?prof=lucia

   Un alumno que abra ese enlace queda apuntando al cuaderno de Lucía;
   sus ejercicios, exámenes y analíticas van a la hoja de Lucía y no a
   la de nadie más.

   ─── POR QUÉ UNA LISTA Y NO LA URL EN EL ENLACE ───────────────────
   Porque si la app aceptara cualquier dirección escrita en el enlace,
   bastaría con inventarse un enlace para desviar a un servidor ajeno
   las notas y los correos de una clase entera. Solo funciona lo que
   está escrito AQUÍ; cualquier otro `?prof=` se ignora y la app se
   queda en el cuaderno por defecto.

   ─── PARA EL PROFESOR: DAR DE ALTA A UN COMPAÑERO ─────────────────
   1. Pídele la URL de SU despliegue de Apps Script (la que termina en
      /exec; la ve en Implementar → Gestionar implementaciones).
   2. Añade abajo un bloque igual que los que ya hay:
        - `id`: minúsculas, sin acentos ni espacios (es lo que irá en
          el enlace). No lo cambies nunca una vez repartido: los
          dispositivos ya asignados dejarían de reconocerlo.
        - `nombre`: lo que verán el alumno y el profesor en pantalla.
        - `url`: la dirección de su cuaderno.
   3. Guarda, haz commit y `git push`. En un minuto está publicado.
   4. Pásale su enlace: …/index.html?prof=SU_ID

   Para dar de baja a un compañero, borra su bloque. Los dispositivos
   que lo tuvieran asignado vuelven solos al cuaderno por defecto.

   ─── QUÉ HACE ESTE ARCHIVO, ADEMÁS DE LA LISTA ────────────────────
   Al arrancar la app mira si el enlace trae `?prof=…`. Si el nombre
   está en la lista, deja el dispositivo apuntando a ese cuaderno y lo
   recuerda; si no lo está, no hace nada y la app sigue como estaba.
   El distintivo en pantalla que avisa de todo esto llega en el paso 3. */

import { DEFAULT_API_URL, LS_API, LS_CUADERNO } from './constants.js';
import { getApiUrl } from './api.js';
import { log } from './log.js';

// Identificador del cuaderno que usa la app cuando el enlace no trae
// parámetro (o trae uno que no está en la lista). Es el de casa.
export const CUADERNO_POR_DEFECTO = 'josele';

// ── LA LISTA BLANCA ────────────────────────────────────────────────
// El primero reutiliza a propósito DEFAULT_API_URL de constants.js:
// así la dirección del cuaderno de casa sigue estando escrita en UN
// solo sitio y no hay dos copias que puedan acabar diciendo cosas
// distintas.
export const CUADERNOS = [
  {
    id: 'josele',
    nombre: 'Prof. Josele Asensio',
    url: DEFAULT_API_URL
  }
  // ── Plantilla para el siguiente compañero (copia, descomenta y
  //    rellena; no olvides la coma del bloque anterior) ──
  // ,{
  //   id: 'lucia',
  //   nombre: 'Prof.ª Lucía Ejemplo',
  //   url: 'https://script.google.com/macros/s/AAAA…AAAA/exec'
  // }
];

// Busca un cuaderno por su `id`. Devuelve el objeto o `null` si ese
// identificador no está en la lista (que es el caso de cualquier
// enlace inventado). Función pura: no toca localStorage ni la red.
// Nadie la llama todavía — la usará el paso 2.
export function buscarCuaderno(id) {
  const clave = String(id || '').trim().toLowerCase();
  if (!clave) return null;
  return CUADERNOS.find(c => c.id === clave) || null;
}

// ════════════════════════════════════════════════════════════════════
// EL PARÁMETRO DEL ENLACE  (paso 2)
// ════════════════════════════════════════════════════════════════════

// Nombre del parámetro:  …/index.html?prof=lucia
export const PARAM_CUADERNO = 'prof';

// Anota si ESTA carga de la página ha cambiado el cuaderno del
// dispositivo: {anterior:'josele'|null, nuevo:'lucia'}, o null si no ha
// cambiado nada. Lo leerá el paso 4 para mostrar el aviso en pantalla;
// aquí solo se toma nota, no se avisa a nadie todavía.
let _cambio = null;

// localStorage puede fallar (modo privado, cookies bloqueadas): que no
// tumbe el arranque de la app. Mismo criterio que core/storage.js.
function _leer(clave) {
  try { return localStorage.getItem(clave) || ''; } catch (e) { return ''; }
}
function _escribir(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) {}
}

/* Si el dispositivo tiene asignado un cuaderno que ya NO está en la
   lista (el compañero se fue del centro y borraste su bloque), vuelve
   al cuaderno de casa. Sin esto seguiría mandando los ejercicios a un
   despliegue que quizá ya ni existe, y nadie se enteraría.

   Contrapartida asumida: si en ESE dispositivo alguien había escrito
   además una URL a mano desde el panel del profesor, se pierde y hay
   que volver a escribirla. Pasa solo en el ordenador de un profesor,
   no en el de un alumno. */
function _volverAlCuadernoDeCasa() {
  const guardado = _leer(LS_CUADERNO);
  if (!guardado || buscarCuaderno(guardado)) return;
  log.warn('[cuadernos] El cuaderno asignado ya no está en la lista:', guardado,
           '— este dispositivo vuelve al cuaderno por defecto.');
  try {
    localStorage.removeItem(LS_CUADERNO);
    localStorage.removeItem(LS_API);
  } catch (e) {}
}

/* Lee `?prof=…` del enlace y, si es un cuaderno de la lista, deja el
   dispositivo apuntando a él. Se llama UNA vez al arrancar (app.js).
   Devuelve el cuaderno aplicado, o null si no había que hacer nada.

   Las tres reglas acordadas con Josele:

   1. Un enlace válido MANDA, aunque el dispositivo ya estuviera
      asignado a otro profesor. Es el acto más reciente de un profesor
      y es también la forma de arreglar un iPad mal asignado: se abre
      el enlace bueno y listo.
   2. Un enlace SIN parámetro no reinicia nada. Si reiniciara, un
      alumno de otra profesora que entrase por el enlace pelado
      (favoritos, app instalada, buscador) volvería en silencio al
      cuaderno de casa y sus notas acabarían donde no deben.
   3. Un `?prof=` que no esté en la lista se ignora por completo. */
export function aplicarCuadernoDelEnlace() {
  _volverAlCuadernoDeCasa();

  let pedido = '';
  try {
    pedido = new URLSearchParams(window.location.search).get(PARAM_CUADERNO) || '';
  } catch (e) {
    return null;
  }
  if (!pedido) return null;                      // regla 2

  const cuaderno = buscarCuaderno(pedido);
  if (!cuaderno) {                               // regla 3
    log.warn('[cuadernos] El enlace pide un cuaderno que no está en la lista:', pedido);
    return null;
  }

  const anterior = _leer(LS_CUADERNO) || null;
  if (anterior !== cuaderno.id) _cambio = { anterior: anterior, nuevo: cuaderno.id };

  // Se guardan DOS cosas, a propósito:
  //  · LS_CUADERNO recuerda DE QUIÉN es el cuaderno — para el
  //    distintivo en pantalla y para el panel del profesor.
  //  · LS_API es la dirección que ya consultaba toda la app a través de
  //    getApiUrl() (core/api.js). Al escribirla aquí, los exámenes, las
  //    analíticas y los bancos de oraciones cambian de destino sin
  //    tocar ni una línea de ningún módulo pedagógico.
  _escribir(LS_CUADERNO, cuaderno.id);
  _escribir(LS_API, cuaderno.url);

  log.debug('[cuadernos] Cuaderno activo:', cuaderno.id, '(' + cuaderno.nombre + ')');
  return cuaderno;
}

/* Devuelve el cuaderno al que apunta este dispositivo, o null si va al
   de casa (que es el caso de todos los alumnos de Josele).

   Comprueba además que la dirección guardada siga siendo la de ese
   cuaderno: si un profesor escribió otra URL a mano en su panel, la
   asignación por enlace ya no está mandando y no se debe seguir
   anunciando su nombre en pantalla — un distintivo que miente es peor
   que no tener distintivo. */
export function getCuadernoActivo() {
  const cuaderno = buscarCuaderno(_leer(LS_CUADERNO));
  if (!cuaderno) return null;
  if (getApiUrl() !== cuaderno.url) return null;
  return cuaderno;
}

/* Pinta —o esconde— el distintivo del cuaderno en la pantalla de inicio
   de sesión, esa en la que el alumno escribe su nombre, su correo y su
   grupo. Se llama cada vez que se entra en esa pantalla.

   Se muestra SOLO cuando el dispositivo apunta al cuaderno de otro
   profesor. Los alumnos de Josele —la inmensa mayoría— no ven ningún
   elemento nuevo, y quien sí lo ve tiene delante, justo antes de dar su
   nombre, a qué profesor van sus ejercicios y sus notas. */
export function pintarDistintivoCuaderno() {
  const caja = document.getElementById('login-cuaderno');
  if (!caja) return;

  const cuaderno = getCuadernoActivo();
  if (!cuaderno || cuaderno.id === CUADERNO_POR_DEFECTO) {
    caja.style.display = 'none';
    return;
  }

  const nombre = document.getElementById('login-cuaderno-nombre');
  if (nombre) nombre.textContent = cuaderno.nombre;
  caja.style.display = 'flex';
}

/* {anterior, nuevo} si esta carga de la página cambió de cuaderno;
   null en caso contrario. Para el aviso del paso 4. */
export function getCambioDeCuaderno() {
  return _cambio;
}
