// Genera dist-light/: la versión pública sin backend, sin panel del
// profesor y sin la URL real de tu Google Sheet.
// Fase 3 del plan técnico (Plan_Estrategico_Web.md §11.9). El repositorio
// fuente NO cambia de comportamiento: esto solo LEE los archivos y escribe
// una copia aparte con los ajustes de la versión ligera.
// Uso: node build-light.js

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, 'dist-light');

// Lista blanca a propósito: más segura que una lista negra para algo que
// decide qué se publica al mundo. Lo que no está aquí, no se copia.
const ARCHIVOS_RAIZ = ['index.html', 'manual-alumno.html', 'manifest.json', 'sw.js'];
const CARPETAS_COMPLETAS = ['css', 'assets', 'data'];
// js/ se copia entero salvo esto (panel del profesor: ~2600 líneas que son
// exactamente la capa de centro escolar que NO va en la versión gratuita).
const EXCLUIR_DE_JS = ['modules/teacher'];

function copiarDir(origen, destino, excluirRel, relBase) {
  fs.mkdirSync(destino, { recursive: true });
  for (const nombre of fs.readdirSync(origen)) {
    const relPath = relBase ? relBase + '/' + nombre : nombre;
    if (excluirRel.includes(relPath)) continue;
    const rutaOrigen = path.join(origen, nombre);
    const rutaDestino = path.join(destino, nombre);
    if (fs.statSync(rutaOrigen).isDirectory()) {
      copiarDir(rutaOrigen, rutaDestino, excluirRel, relPath);
    } else {
      fs.copyFileSync(rutaOrigen, rutaDestino);
    }
  }
}

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

ARCHIVOS_RAIZ.forEach(f => {
  const origen = path.join(DIR, f);
  if (fs.existsSync(origen)) fs.copyFileSync(origen, path.join(OUT, f));
});
CARPETAS_COMPLETAS.forEach(c => {
  const origen = path.join(DIR, c);
  if (fs.existsSync(origen)) copiarDir(origen, path.join(OUT, c), [], '');
});
copiarDir(path.join(DIR, 'js'), path.join(OUT, 'js'), EXCLUIR_DE_JS, '');

// ── Parches sobre la copia (nunca sobre el original) ──────────────────────

// 1. La bandera y la URL del backend.
const constantsPath = path.join(OUT, 'js', 'core', 'constants.js');
let constantsSrc = fs.readFileSync(constantsPath, 'utf8');
constantsSrc = constantsSrc.replace('export const LIGHT = false;', 'export const LIGHT = true;');
constantsSrc = constantsSrc.replace(
  /export const DEFAULT_API_URL = '[^']*';/,
  "export const DEFAULT_API_URL = ''; // versión ligera: sin backend, a propósito"
);
fs.writeFileSync(constantsPath, constantsSrc, 'utf8');

// 2. app.js ya no debe intentar importar el panel del profesor (el archivo
//    no existe en esta copia — un import roto aborta TODO el arranque).
const appJsPath = path.join(OUT, 'js', 'app.js');
fs.writeFileSync(appJsPath, fs.readFileSync(appJsPath, 'utf8').replace("import './modules/teacher/index.js';\n", ''), 'utf8');

// 3. index.html: el <script> del informe Excel apunta a un módulo que ya no está.
const indexPath = path.join(OUT, 'index.html');
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace('<script defer src="js/modules/teacher/informe-excel.js"></script>\n', ''), 'utf8');

// 4. sw.js: quitar del precache lo que esta copia ya no tiene (no es
//    obligatorio —el propio sw.js precarga tolerante a fallos—, pero evita
//    404 innecesarios en cada instalación).
const swPath = path.join(OUT, 'sw.js');
let swSrc = fs.readFileSync(swPath, 'utf8');
["  './vendor/xlsx.bundle.js',\n", "  './js/modules/teacher/index.js',\n", "  './js/modules/teacher/informe-excel.js',\n"]
  .forEach(linea => { swSrc = swSrc.replace(linea, ''); });
fs.writeFileSync(swPath, swSrc, 'utf8');

// vendor/ (xlsx.bundle.js) no está en la lista blanca de arriba, así que ya
// no se ha copiado — el informe Excel es cosa del panel del profesor.

// ── Verificación básica antes de darlo por bueno ──────────────────────────
const constantsFinal = fs.readFileSync(constantsPath, 'utf8');
const okLight = /export const LIGHT = true;/.test(constantsFinal);
const urlMatch = constantsFinal.match(/DEFAULT_API_URL = '([^']*)'/);
const okUrl = urlMatch && urlMatch[1] === '';
const okSinTeacher = !fs.existsSync(path.join(OUT, 'js', 'modules', 'teacher'));
const okSinVendor = !fs.existsSync(path.join(OUT, 'vendor'));

console.log('OK: dist-light/ generado.');
console.log('  LIGHT = true en la copia:', okLight);
console.log('  DEFAULT_API_URL vacía en la copia:', okUrl);
console.log('  js/modules/teacher/ ausente:', okSinTeacher);
console.log('  vendor/ ausente:', okSinVendor);
if (!okLight || !okUrl || !okSinTeacher || !okSinVendor) {
  console.log('\n⚠ Algo no salió como se esperaba — revisa antes de publicar esto.');
}
