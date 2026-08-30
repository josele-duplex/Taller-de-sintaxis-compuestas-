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

   OJO — este archivo es solo la LISTA. Todavía no lo lee nadie: quien
   la use será el paso 2 del plan (leer el parámetro del enlace). */

import { DEFAULT_API_URL } from './constants.js';

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
