// Generador de la nota técnica breve (2 páginas) para el técnico de informática
// que contratará y gestionará dominio, alojamiento y posicionamiento.
// Se ejecuta: node build-brief-corto.js → Nota_Tecnica_Alojamiento_Taller_Sintaxis.docx
//
// IMPORTANTE: este documento NO contiene modelo de ingresos, precios, licencias,
// planes estratégicos ni contenido pedagógico. Solo información técnica.
// La versión completa (con negocio) es Brief_Tecnico_SEO_Taller_Sintaxis.docx.
const path = require('path');
const fs = require('fs');

const docxPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber
} = require(docxPath);

const AZUL = '102A43';
const ROJO = 'BE382C';
const GRIS = '6C7F92';
const F_CAB = 'E7ECF2';

const BODY = 20;   // 10 pt
const ANCHO = 9640;

function p(text, o = {}) {
  return new Paragraph({
    spacing: { after: o.after ?? 80, line: 245 },
    children: [new TextRun({ text, bold: !!o.b, italics: !!o.i, color: o.color, size: o.size || BODY })],
  });
}
function pMix(runs, o = {}) {
  return new Paragraph({ spacing: { after: o.after ?? 80, line: 245 }, children: runs });
}
const t  = (text, o = {}) => new TextRun({ text, bold: !!o.b, italics: !!o.i, color: o.color, size: o.size || BODY });
const tm = (text) => new TextRun({ text, font: 'Consolas', size: 18 });

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 180, after: 80 }, children: [new TextRun({ text })] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 50, line: 240 }, children: [new TextRun({ text, size: BODY })] });
}
function bulletMix(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 50, line: 240 }, children: runs });
}

function code(lines) {
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      shading: { fill: 'F1F5F8', type: ShadingType.CLEAR },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
      },
      margins: { top: 90, bottom: 90, left: 140, right: 140 },
      children: lines.map(l => new Paragraph({ spacing: { after: 0, line: 230 }, children: [new TextRun({ text: l, font: 'Consolas', size: 16 })] })),
    })] })],
  });
}

function aviso(titulo, texto) {
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      shading: { fill: 'F6E3E0', type: ShadingType.CLEAR },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 14, color: ROJO },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: [
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: titulo.toUpperCase(), bold: true, size: 16, color: ROJO })] }),
        new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: texto, size: BODY })] }),
      ],
    })] })],
  });
}

function tabla(rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((celda, ci) => new TableCell({
        borders,
        width: { size: widths[ci], type: WidthType.DXA },
        shading: { fill: i === 0 ? F_CAB : 'FFFFFF', type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 110, right: 110 },
        children: [new Paragraph({ spacing: { after: 0, line: 235 }, children: [new TextRun({ text: celda, bold: i === 0, size: 18, color: i === 0 ? AZUL : undefined })] })],
      })),
    })),
  });
}

const hueco = (n = 1) => Array.from({ length: n }, () => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '', size: 12 })] }));

// ═══════════════════════════════════════════════════════════
const c = [];

c.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'NOTA TÉCNICA', size: 17, bold: true, color: ROJO })] }));
c.push(new Paragraph({ spacing: { before: 60, after: 40 }, children: [new TextRun({ text: 'Taller de Sintaxis — alojamiento, dominio y posicionamiento', size: 32, bold: true, color: AZUL })] }));
c.push(new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'Documento para el técnico responsable de la infraestructura web · 2 de septiembre de 2026', size: 17, color: GRIS })] }));

c.push(h1('1. Objeto'));
c.push(p('Taller de Sintaxis es una aplicación web educativa, en producción desde hace más de un año. Se encarga la contratación y gestión de dominio y alojamiento, el sitio web que la acompañará, la parte de la instalación en el móvil que vive fuera del código de la app, la instrumentación de estadísticas y el posicionamiento en buscadores. La aplicación en sí no se modifica.'));

c.push(h1('2. Cómo está construida la aplicación'));
c.push(tabla([
  ['Elemento', 'Situación actual'],
  ['Tipo', 'SPA estática: HTML, CSS y módulos ES6 nativos servidos tal cual'],
  ['Código propio', '~27.000 líneas de JavaScript'],
  ['Dependencias y compilación', 'Ninguna de las dos. Sin React ni jQuery; lo que hay en el repositorio es lo que se sirve'],
  ['PWA', 'Parcial: ya hay manifest.json y un service worker (~190 líneas)'],
  ['Alojamiento y repositorio', 'Hoy en GitHub Pages. El repositorio es privado: se entrega el sitio, no el código'],
], [2500, 7140]));
c.push(p('La ausencia de dependencias y de compilación es deliberada y debe conservarse.'));

c.push(h1('3. La aplicación funciona en paralelo a Google Sheets'));
c.push(p('Es el punto que conviene entender antes de dimensionar nada. Hay dos piezas independientes:'));
c.push(code([
  'Navegador ──▶  Sitio + aplicación estáticos      ◀── ESTO es lo que se aloja',
  '     └── HTTPS ──▶  Google Apps Script (…/exec) ──▶ Google Sheets',
  '                    (infraestructura de Google)  ◀── AJENO al encargo',
]));
c.push(p('La aplicación pide sus datos y envía resultados a una URL de Google Apps Script por HTTPS desde el navegador. Ese despliegue vive en la infraestructura de Google, no consume recursos del alojamiento y no forma parte del encargo.'));
c.push(bullet('El alojamiento solo sirve archivos estáticos: no hace falta PHP, ni base de datos, ni proceso de servidor.'));
c.push(bullet('Las peticiones al backend salen del navegador del usuario, no del servidor: no hay que configurar proxy ni CORS en el alojamiento.'));
c.push(aviso('No tocar el despliegue de Apps Script',
  'Si en algún momento hubiera que actualizarlo, debe hacerse SIEMPRE como «Nueva versión» de la implementación existente, nunca como «Nueva implementación»: eso genera una URL distinta y deja la aplicación rota en producción. En cualquier caso, queda fuera de este encargo y lo gestiona el autor.'));

c.push(h1('4. Se publicarán dos versiones de la aplicación'));
c.push(p('Del mismo repositorio se generan dos compilaciones mediante una bandera. Afecta al despliegue y a la indexación.'));
c.push(tabla([
  ['', 'Versión ligera (pública)', 'Versión completa'],
  ['Backend', 'Ninguno. Los datos viajan como JSON dentro de la propia app', 'Google Apps Script (§3)'],
  ['Conexiones salientes', 'Ninguna', 'Al backend'],
  ['Uso sin conexión', 'Total', 'Parcial'],
  ['Acceso', 'Abierto', 'Restringido'],
  ['Indexación', 'Sí. Es la que recibe todo el posicionamiento', 'No. Debe excluirse de los buscadores'],
], [1700, 4200, 3740]));
c.push(bulletMix([ t('Ambas se despliegan en rutas distintas del mismo dominio y deben poder publicarse por separado. La completa se excluye de la indexación con '), tm('noindex'), t(' y en '), tm('robots.txt'), t('.') ]));
c.push(aviso('Comprobación obligatoria antes de cada despliegue de la versión ligera',
  'La versión ligera NO debe contener la URL del backend de Google Apps Script. No basta con ocultar la funcionalidad: la cadena no puede aparecer en ningún archivo publicado. Buscarla en los archivos generados debe ser un paso fijo del proceso de despliegue, automatizado si es posible.'));

c.push(h1('5. Requisitos del alojamiento'));
c.push(bullet('Alojamiento estático sobre CDN. Cloudflare Pages o Netlify cubren el caso en su plan gratuito.'));
c.push(bulletMix([ t('Dominio propio con HTTPS y renovación automática de certificado, gestión de DNS y redirección al canónico. La aplicación se sirve bajo el mismo dominio, en '), tm('/app'), t('.') ]));
c.push(bullet('Despliegue reproducible y verificable: debe constar qué versión está publicada. Hay antecedentes de despliegues que fallaron en silencio y sirvieron una versión antigua durante días.'));
c.push(bulletMix([ t(' Cabeceras de caché coordinadas con el service worker (el fallo típico de una PWA es servir una versión obsoleta para siempre): el '), tm('index.html'), t(' y el service worker sin caché agresiva; los recursos versionados, sí.') ]));

c.push(h1('6. PWA — aplicación instalable'));
c.push(p('Punto central de la comunicación del sitio. El trabajo está repartido; conviene no presupuestar la parte ajena:', { after: 50 }));
c.push(pMix([
  t('Lo hace el autor, porque es código de la aplicación: ', { b: true }),
  t('manifest completo con iconos maskable y pantalla de arranque · service worker con caché que permita uso real sin conexión y versionado que fuerce la actualización · botón de instalación propio capturando '),
  tm('beforeinstallprompt'),
  t('.'),
], { after: 50 }));
c.push(p('Entra en este encargo:', { b: true, after: 40 }));
c.push(bullet('Cabeceras de caché del alojamiento coordinadas con el service worker (§5). Es el punto por el que una PWA se rompe desde fuera del código.'));
c.push(bulletMix([ t('Página '), tm('/instalar'), t(' con las tres rutas —Android, iPhone y ordenador— y capturas paso a paso. En iPhone, Safari no ofrece instalación automática y exige '), t('Compartir → Añadir a pantalla de inicio', { b: true }), t(': es el punto de mayor abandono.') ]));
c.push(bulletMix([
  t('Iconos: '), t('ya existen', { b: true }),
  t(' (SVG, .ico, 16, 32, 180 y 512 px). Falta únicamente una '),
  t('variante «maskable»', { b: true }),
  t(': Android recorta el icono a la forma del sistema —círculo o cuadrado redondeado según el fabricante— y un icono normal queda encajonado y pequeño. Requiere una versión del logotipo con el dibujo dentro del 80 % central y el fondo extendido hasta el borde. Es el único trabajo de diseño pendiente; el ajuste del manifest lo hace el autor.'),
]));
c.push(bullet('Verificación de que la instalación funciona en dispositivos Android e iPhone reales.'));

c.push(h1('7. Estadísticas y privacidad'));
c.push(aviso('Restricción de obligado cumplimiento',
  'El público es menor de edad: no se recoge ningún dato personal y no se admiten cookies de seguimiento, píxeles publicitarios ni identificadores individuales. Solo analítica agregada sin cookies (Plausible, Umami o Cloudflare). Google Analytics con configuración por defecto queda descartado.'));
c.push(p('Eventos que hay que instrumentar:'));
c.push(tabla([
  ['Evento', 'Qué mide'],
  ['Instalación de la PWA', 'Instalaciones efectivas — el equivalente a «descargas»'],
  ['Arranque en modo standalone', 'Uso desde el icono instalado, frente a visita en pestaña'],
  ['Apertura de la aplicación', 'Paso del sitio web a la aplicación'],
  ['Ejercicio completado', 'Volumen de uso real, agregado y anónimo'],
  ['Formulario de contacto enviado', 'Solicitudes recibidas'],
], [3100, 6540]));
c.push(p('Se pide un panel mensual legible por una persona no técnica, con el método de cálculo documentado.'));

c.push(h1('8. Rendimiento y accesibilidad'));
c.push(p('Se mide en móvil con conexión 4G simulada. Igual que en la PWA, la frontera importa: el sitio y la aplicación tienen dueños distintos.', { after: 60 }));
c.push(p('Objetivos exigibles en las páginas del sitio:', { b: true, after: 50 }));
c.push(tabla([
  ['LCP', 'INP', 'CLS', 'Lighthouse', 'Peso del inicio'],
  ['< 2,0 s', '< 200 ms', '< 0,1', '≥ 95 en todas las categorías', '< 300 KB sin imágenes'],
], [1500, 1600, 1200, 3340, 2000]));
c.push(p('Entra en este encargo:', { b: true, after: 40 }));
c.push(bullet('CDN con compresión y HTTP/2 o superior, y cabeceras de caché correctas (§5).'));
c.push(bullet('Tipografías autoalojadas y con subconjunto de caracteres, imágenes en formato moderno con dimensiones declaradas y sin JavaScript de terceros en las páginas de contenido.'));
c.push(bullet('Accesibilidad WCAG 2.2 AA en las páginas del sitio: navegación por teclado con foco visible, contraste mínimo 4,5:1 y jerarquía correcta de encabezados.'));
c.push(p('Lo hace el autor, porque es código de la aplicación:', { b: true, after: 40 }));
c.push(bulletMix([
  t('El rendimiento y la accesibilidad dentro de '), tm('/app'),
  t('. La aplicación es un documento de ~120 KB más módulos JavaScript propios; optimizarla es trabajo de código y no se presupuesta aquí.'),
]));
c.push(bulletMix([
  t('Se pide, eso sí, que el proveedor '), t('mida', { b: true }), t(' '), tm('/app'),
  t(' y entregue el informe junto al del sitio: detectar el problema entra en el encargo, corregirlo es del autor.'),
]));

c.push(h1('9. Posicionamiento en buscadores'));
c.push(p('Canal principal de captación: no hay presupuesto de publicidad. El contenido lo redacta el autor; se encarga la estructura, las plantillas y el trabajo técnico.'));
c.push(bulletMix([ t('URL en español, en minúsculas, con guiones y sin parámetros ni fechas. Mapa del sitio, '), tm('robots.txt'), t(', canónicas y metadatos por plantilla.') ]));
c.push(bullet('Datos estructurados en JSON-LD: SoftwareApplication en inicio y aplicación, Article o LearningResource en contenido, FAQPage y HowTo donde corresponda.'));
c.push(bullet('Autoría explícita y verificable en el marcado: la obra está inscrita en el Registro de la Propiedad Intelectual.'));
c.push(bullet('Investigación de palabras clave con volúmenes y dificultad reales (España y principales mercados americanos), y plantillas de contenido que el autor pueda rellenar sin tocar código.'));

c.push(h1('10. Restricciones y límites del encargo'));
c.push(pMix([
  t('No se hace: ', { b: true }),
  t('reescribir la aplicación ni migrarla a un framework · introducir bundler, TypeScript o dependencias en ejecución · tocar el backend de Google Apps Script · redactar los contenidos del sitio · aplicaciones nativas para tiendas (descartadas).'),
]));
c.push(pMix([
  t('Sí se hace: ', { b: true }),
  t('dominio, DNS, HTTPS y alojamiento · sitio web, plantillas y despliegue · página de instalación y verificación de la PWA · estadísticas e instrumentación · estructura, marcado y trabajo técnico de posicionamiento.'),
]));
c.push(p('El autor no es programador. Todo lo entregado debe poder mantenerse y ampliarse sin conocimientos técnicos, y el traspaso incluye documentación y una sesión de formación grabada.', { b: true }));

// ═══════════════════════════════════════════════════════════
const doc = new Document({
  creator: 'Taller de Sintaxis',
  title: 'Nota técnica — alojamiento, dominio y posicionamiento',
  styles: {
    default: { document: { run: { font: 'Calibri', size: BODY, color: '1F2933' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Calibri', color: AZUL },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 0 } },
    ],
  },
  numbering: {
    config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 400, hanging: 220 } } } }] }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1133, bottom: 900, left: 1133 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Taller de Sintaxis — nota técnica  ·  ', size: 16, color: GRIS }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRIS }),
          new TextRun({ text: ' / ', size: 16, color: GRIS }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRIS }),
        ],
      })] }),
    },
    children: c,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = 'Nota_Tecnica_Alojamiento_Taller_Sintaxis.docx';
  fs.writeFileSync(out, buf);
  console.log('OK:', out, '(' + buf.length + ' bytes)');
});
