// Genera dist-light/: la versión pública sin backend, sin panel del
// profesor y sin la URL real de tu Google Sheet.
// Fase 3 del plan técnico (Plan_Estrategico_Web.md §11.9). El repositorio
// fuente NO cambia de comportamiento: esto solo LEE los archivos y escribe
// una copia aparte con los ajustes de la versión ligera.
// Uso: node build-light.js

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// ── Dónde va a vivir la copia publicada (decidido el 12-sep-2026) ───────
// La app ligera se sirve en <dominio>/app/ y la raíz del dominio queda
// libre para la web de captación (Plan_Estrategico_Web.md §5 y §7). Por eso
// dist-light/ reproduce la carpeta EXACTA que publica el alojamiento: la
// app dentro de app/, y en la raíz una página que reenvía a app/ mientras
// no exista la portada web. Si el dominio o la ruta cambiaran, este es el
// ÚNICO sitio donde tocarlo (lo leen también el sitemap y los metadatos).
const URL_PUBLICA = 'https://tallerdesintaxis.com';
const RUTA_APP = '/app/';

const OUT_RAIZ = path.join(DIR, 'dist-light');
const OUT = path.join(OUT_RAIZ, 'app');
const urlApp = URL_PUBLICA + RUTA_APP;

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

if (fs.existsSync(OUT_RAIZ)) fs.rmSync(OUT_RAIZ, { recursive: true, force: true });
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

// 3. index.html: el panel del profesor (screen-teacher + su modal de
//    contraseña) y el <script> del informe Excel ya no tienen quien los
//    abra sin teacher/index.js — se quitan de verdad, no se dejan inertes.
const indexPath = path.join(OUT, 'index.html');
let indexSrc = fs.readFileSync(indexPath, 'utf8');
indexSrc = indexSrc.replace('<script defer src="js/modules/teacher/informe-excel.js"></script>\n', '');
indexSrc = indexSrc.replace(/<!-- TEACHER PANEL -->\n<div id="screen-teacher"[\s\S]*?\n<\/div>\n\n\n/, '');
indexSrc = indexSrc.replace(/<!-- TEACHER PASSWORD MODAL -->\n<div class="overlay" id="teacher-modal"[\s\S]*?\n<\/div>\n\n\n/, '');
// 3b. Metadatos de página: la og:image del fuente apunta a la versión
//     completa (única URL absoluta pública que existe hoy); aquí se reescribe
//     al dominio de la ligera y se añaden canonical + og:url, que solo tienen
//     sentido cuando se sabe en qué URL vive la copia.
const ORIGEN_COMPLETA = 'https://josele-duplex.github.io/Taller-de-sintaxis-compuestas-/';
indexSrc = indexSrc.split(ORIGEN_COMPLETA).join(urlApp);
indexSrc = indexSrc.replace(
  '</title>\n',
  '</title>\n<link rel="canonical" href="' + urlApp + '">\n<meta property="og:url" content="' + urlApp + '">\n'
);
fs.writeFileSync(indexPath, indexSrc, 'utf8');

// 4. sw.js: quitar del precache lo que esta copia ya no tiene (no es
//    obligatorio —el propio sw.js precarga tolerante a fallos—, pero evita
//    404 innecesarios en cada instalación).
const swPath = path.join(OUT, 'sw.js');
let swSrc = fs.readFileSync(swPath, 'utf8');
["  './vendor/xlsx.bundle.js',\n", "  './js/modules/teacher/index.js',\n", "  './js/modules/teacher/informe-excel.js',\n"]
  .forEach(linea => { swSrc = swSrc.replace(linea, ''); });
fs.writeFileSync(swPath, swSrc, 'utf8');

// 5. manifest.json: "PAU" en la descripción es metadato de instalación
//    (lo que ve el alumno al añadir la app a la pantalla de inicio), no
//    solo texto interno — mismo criterio de Fase 5 que las 4 cadenas de
//    la interfaz (Plan_Estrategico_Web.md §11.12/§11.14).
const manifestPath = path.join(OUT, 'manifest.json');
fs.writeFileSync(
  manifestPath,
  fs.readFileSync(manifestPath, 'utf8').replace(' / PAU"', '"'),
  'utf8'
);

// vendor/ (xlsx.bundle.js) no está en la lista blanca de arriba, así que ya
// no se ha copiado — el informe Excel es cosa del panel del profesor.

// ── Raíz del dominio: reenvío a app/ ──────────────────────────────────────
// Hasta que exista la web de captación, quien entre por la raíz debe acabar
// en la app. La página lleva `noindex` para que el buscador no la tome por
// contenido, y `canonical` apuntando a la app. Es un respaldo que funciona
// en cualquier alojamiento; si el servicio permite un reenvío 301 de / a
// /app/, es preferible (lo dice Traspaso_Informatico.md) y esta página no
// molesta.
const redirectHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Taller de Sintaxis</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${urlApp}">
<meta http-equiv="refresh" content="0; url=app/">
</head>
<body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center">
<p>Abriendo el <a href="app/">Taller de Sintaxis</a>…</p>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT_RAIZ, 'index.html'), redirectHtml, 'utf8');

// ── robots.txt y sitemap.xml (solo en la copia ligera) ────────────────────
// La ligera es la versión que debe indexar el buscador; la completa se
// comparte por enlace directo y no compite por posicionamiento
// (Plan_Estrategico_Web.md §8). Los dos archivos van en la raíz del dominio
// —es donde los buscadores los buscan—, nunca dentro de app/. El sitemap es
// mínimo a propósito: solo la portada de la app. Las páginas de contenido
// (/guias/, /oraciones/) son otra fase del plan y se añadirán cuando existan.
fs.writeFileSync(
  path.join(OUT_RAIZ, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + URL_PUBLICA + '/sitemap.xml\n',
  'utf8'
);
fs.writeFileSync(
  path.join(OUT_RAIZ, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  '  <url><loc>' + urlApp + '</loc></url>\n' +
  '</urlset>\n',
  'utf8'
);

// ── Verificación básica antes de darlo por bueno ──────────────────────────
const constantsFinal = fs.readFileSync(constantsPath, 'utf8');
const okLight = /export const LIGHT = true;/.test(constantsFinal);
const urlMatch = constantsFinal.match(/DEFAULT_API_URL = '([^']*)'/);
const okUrl = urlMatch && urlMatch[1] === '';
const okSinTeacher = !fs.existsSync(path.join(OUT, 'js', 'modules', 'teacher'));
const okSinVendor = !fs.existsSync(path.join(OUT, 'vendor'));
const indexFinal = fs.readFileSync(indexPath, 'utf8');
const okSinHtmlTeacher = !indexFinal.includes('screen-teacher');
const okMeta = indexFinal.includes('<link rel="canonical" href="' + urlApp + '">') && !indexFinal.includes('github.io');
const okRaiz = fs.existsSync(path.join(OUT_RAIZ, 'index.html')) && fs.existsSync(path.join(OUT, 'index.html'));
const okSeo = fs.existsSync(path.join(OUT_RAIZ, 'robots.txt')) && fs.readFileSync(path.join(OUT_RAIZ, 'sitemap.xml'), 'utf8').includes('<loc>' + urlApp + '</loc>');

console.log('OK: dist-light/ generado (la app en dist-light/app/, publicable en ' + urlApp + ').');
console.log('  LIGHT = true en la copia:', okLight);
console.log('  DEFAULT_API_URL vacía en la copia:', okUrl);
console.log('  js/modules/teacher/ ausente:', okSinTeacher);
console.log('  vendor/ ausente:', okSinVendor);
console.log('  HTML del panel del profesor ausente en index.html:', okSinHtmlTeacher);
console.log('  app/index.html + reenvío en la raíz:', okRaiz);
console.log('  robots.txt + sitemap.xml en la raíz:', okSeo);
console.log('  canonical/og:url al dominio de la ligera, sin rastro de github.io:', okMeta);
if (!okLight || !okUrl || !okSinTeacher || !okSinVendor || !okSinHtmlTeacher || !okRaiz || !okSeo || !okMeta) {
  console.log('\n⚠ Algo no salió como se esperaba — revisa antes de publicar esto.');
}
