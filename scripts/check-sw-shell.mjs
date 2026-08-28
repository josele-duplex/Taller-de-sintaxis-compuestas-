#!/usr/bin/env node
/* check-sw-shell.mjs — Verifica que SHELL_ASSETS de sw.js cubre todo el
 * JS/CSS versionado.
 *
 * Existe porque esta lista se ha desincronizado DOS veces (jul-2026 y
 * ago-2026) y en ambas la app dejó de arrancar en frío, sin ningún error
 * visible (ver cabecera de sw.js). No es un test automatizado en el
 * sentido de la regla 5 del CLAUDE.md (no prueba comportamiento
 * pedagógico): es un verificador de consistencia de despliegue.
 *
 * USO (desde la carpeta del proyecto, antes de cada git push):
 *   node scripts/check-sw-shell.mjs
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const sw = readFileSync('sw.js', 'utf8');
const ini = sw.indexOf('const SHELL_ASSETS');
const lista = sw.slice(ini, sw.indexOf('];', ini));
const declarados = new Set([...lista.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]));

const versionados = execSync('git ls-files js css', { encoding: 'utf8' })
  .split('\n')
  .filter(f => /\.(js|css)$/.test(f) && !f.includes('/_legacy/'));

const faltan = versionados.filter(f => !declarados.has(f));
if (faltan.length) {
  console.error('✗ Faltan en SHELL_ASSETS de sw.js:\n  ' + faltan.join('\n  '));
  process.exit(1);
}
console.log(`✓ SHELL_ASSETS cubre los ${versionados.length} archivos js/css versionados.`);
