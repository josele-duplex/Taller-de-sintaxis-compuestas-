// Generador del brief técnico y SEO (Word .docx)
// Se ejecuta: node build-brief-seo.js → Brief_Tecnico_SEO_Taller_Sintaxis.docx
// Destinatario del documento: agencia o profesional freelance de desarrollo web y SEO.
const path = require('path');
const fs = require('fs');

const docxPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak
} = require(docxPath);

// ── Paleta (la de la propia app: tinta marina + lápiz rojo) ───────
const AZUL   = '102A43';
const ROJO   = 'BE382C';
const GRIS   = '6C7F92';
const F_NOTA = 'F6E3E0';
const F_OK   = 'DFEDE6';
const F_AVISO= 'F5EAD6';
const F_CAB  = 'E7ECF2';

// ── Helpers ──────────────────────────────────────────────────────
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({
      text, bold: !!opts.bold, italics: !!opts.italics,
      color: opts.color, size: opts.size, font: opts.mono ? 'Consolas' : undefined,
    })],
  });
}

function pMix(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: runs,
  });
}

const t  = (text, o = {}) => new TextRun({ text, bold: !!o.b, italics: !!o.i, color: o.color, size: o.size });
const tm = (text) => new TextRun({ text, font: 'Consolas', size: 20 });

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 }, children: [new TextRun({ text })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 }, children: [new TextRun({ text })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 100 }, children: [new TextRun({ text })] });
}

function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: 'bullets', level }, spacing: { after: 80, line: 280 }, children: [new TextRun({ text })] });
}
function bulletMix(runs, level = 0) {
  return new Paragraph({ numbering: { reference: 'bullets', level }, spacing: { after: 80, line: 280 }, children: runs });
}
function step(text) {
  return new Paragraph({ numbering: { reference: 'steps', level: 0 }, spacing: { after: 100, line: 280 }, children: [new TextRun({ text })] });
}

// Bloque de código / URL en monoespaciada sobre fondo claro
function code(lines) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: 'F1F5F8', type: ShadingType.CLEAR },
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
        left:   { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
        right:  { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' },
      },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: lines.map(l => new Paragraph({
        spacing: { after: 0, line: 260 },
        children: [new TextRun({ text: l, font: 'Consolas', size: 18 })],
      })),
    })] })],
  });
}

// Caja destacada
function callout(titulo, texto, fill, barra) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left:   { style: BorderStyle.SINGLE, size: 14, color: barra },
        right:  { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      },
      margins: { top: 140, bottom: 140, left: 200, right: 200 },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: titulo.toUpperCase(), bold: true, size: 17, color: barra })] }),
        new Paragraph({ spacing: { after: 0, line: 280 }, children: [new TextRun({ text: texto })] }),
      ],
    })] })],
  });
}

// Tabla genérica de N columnas. rows[0] = cabecera.
function tabla(rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'C6D3DF' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, idx) => new TableRow({
      tableHeader: idx === 0,
      children: r.map((celda, ci) => new TableCell({
        borders,
        width: { size: widths[ci], type: WidthType.DXA },
        shading: { fill: idx === 0 ? F_CAB : 'FFFFFF', type: ShadingType.CLEAR },
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
        children: [new Paragraph({
          spacing: { after: 0, line: 260 },
          children: [new TextRun({ text: celda, bold: idx === 0, size: 19, color: idx === 0 ? AZUL : undefined })],
        })],
      })),
    })),
  });
}

const espacio = (n = 1) => Array.from({ length: n }, () => p('', { after: 0 }));

// ═════════════════════════════════════════════════════════════════
//  CONTENIDO
// ═════════════════════════════════════════════════════════════════
const c = [];

// ── Portada ──
c.push(new Paragraph({ spacing: { before: 2400, after: 0 }, children: [new TextRun({ text: 'BRIEF TÉCNICO Y DE POSICIONAMIENTO', size: 20, color: ROJO, bold: true })] }));
c.push(new Paragraph({ spacing: { before: 160, after: 0 }, children: [new TextRun({ text: 'Taller de Sintaxis', size: 64, bold: true, color: AZUL })] }));
c.push(new Paragraph({ spacing: { before: 200, after: 0 }, children: [new TextRun({ text: 'Sitio web de captación, aplicación instalable y estrategia de posicionamiento en buscadores', size: 26, color: GRIS })] }));
c.push(...espacio(2));
c.push(p('Documento dirigido a profesionales de desarrollo web y SEO.', { bold: true }));
c.push(p('Versión 1.0 · 2 de septiembre de 2026'));
c.push(p('Cliente: Josele Asensio — profesor de Lengua Castellana y autor de la aplicación.'));
c.push(new Paragraph({ children: [new PageBreak()] }));

// ── 1. Resumen ──
c.push(h1('1. Resumen del encargo'));
c.push(p('Taller de Sintaxis es una aplicación web educativa para el análisis morfológico y sintáctico del español, en uso real en aulas de Educación Secundaria y Bachillerato. Está desarrollada, probada y en producción.'));
c.push(pMix([
  t('Lo que se encarga no es la aplicación, sino '),
  t('el sitio web que la rodea', { b: true }),
  t(': un dominio propio con contenido orientado a búsqueda, una puesta a punto de la aplicación como app instalable (PWA) y la instrumentación necesaria para medir. El objetivo comercial es captar usuarios gratuitos por buscador y convertir a una parte del profesorado en licencias de pago.'),
]));
c.push(callout('Objetivo de negocio en una frase',
  'Que un alumno encuentre la herramienta en Google, la instale en su móvil, se la enseñe a su profesor, y que ese profesor compre una licencia docente.',
  F_OK, '2C7256'));
c.push(...espacio(1));
c.push(h2('1.1 Modelo de ingresos'));
c.push(tabla([
  ['Nivel', 'Público', 'Precio'],
  ['Gratuito', 'Alumnado. Sin registro ni datos personales', '0 €'],
  ['Licencia Docente', 'Profesor individual: panel, exámenes, informes', '29 €/curso'],
  ['Licencia de Departamento', 'Centro educativo, varios profesores', '149-249 €/curso'],
], [2400, 4560, 2400]));
c.push(...espacio(1));
c.push(p('La versión gratuita no es una demostración recortada: es un producto completo para el alumno que estudia solo. Lo que se vende es la capa de evaluación y seguimiento del profesorado.'));

// ── 2. Qué existe ya ──
c.push(h1('2. Qué existe ya — inventario técnico'));
c.push(callout('Lea esta sección antes de presupuestar',
  'La aplicación NO se reescribe. Está en producción, funciona y su arquitectura es deliberada. Cualquier propuesta que implique migrarla a un framework queda fuera del encargo.',
  F_NOTA, ROJO));
c.push(...espacio(1));
c.push(tabla([
  ['Elemento', 'Estado actual'],
  ['Frontend', 'SPA estática. HTML, CSS y módulos ES6 nativos. Aproximadamente 27.000 líneas de JavaScript propio'],
  ['Dependencias de terceros', 'Ninguna. Cero librerías en tiempo de ejecución'],
  ['Proceso de compilación', 'No existe. Lo que hay en el repositorio es lo que se ejecuta'],
  ['PWA', 'Parcial. Ya hay manifest.json y un service worker de ~190 líneas'],
  ['Backend', 'Google Apps Script sobre Hoja de cálculo. Solo lo usa la versión de pago'],
  ['Alojamiento actual', 'GitHub Pages'],
  ['Banco de contenidos', 'Varios cientos de oraciones analizadas con criterio NGLE, exportadas a TSV'],
], [2600, 6760]));
c.push(...espacio(1));
c.push(pMix([
  t('La ausencia de dependencias y de compilación es una '),
  t('ventaja', { b: true }),
  t(' para este encargo: rendimiento excelente por defecto, superficie de ataque mínima y auditoría trivial. Debe preservarse.'),
]));

// ── 3. Restricciones ──
c.push(h1('3. Restricciones no negociables'));
c.push(step('No reescribir la aplicación ni introducir framework, bundler ni TypeScript.'));
c.push(step('No introducir dependencias de terceros en tiempo de ejecución sin justificación expresa.'));
c.push(step('La versión gratuita no recoge ningún dato personal. El público es menor de edad. Se admite analítica agregada sin cookies; no se admite ningún identificador personal.'));
c.push(step('No se admite publicidad de ningún tipo en el sitio ni en la aplicación.'));
c.push(step('La terminología gramatical la fija el cliente y sigue la Nueva Gramática de la Lengua Española (NGLE). Ningún texto de la web puede alterarla. En caso de duda, se consulta.'));
c.push(step('El repositorio de código permanece privado. Se entrega y despliega solo el sitio.'));
c.push(...espacio(1));
c.push(callout('Sobre la terminología',
  'Es una restricción de producto, no una preferencia de estilo: el rigor terminológico es el argumento de venta principal frente a la competencia. Un texto de marketing que use un término incorrecto destruye credibilidad ante el profesorado, que es el comprador.',
  F_AVISO, '96631A'));

// ── 4. Alcance ──
c.push(h1('4. Alcance del encargo'));
c.push(h2('4.1 Incluido'));
c.push(bullet('Diseño y maquetación del sitio de captación (páginas estáticas, ver §5).'));
c.push(bullet('Integración de la aplicación existente bajo el mismo dominio, sin modificar su lógica.'));
c.push(bullet('Puesta a punto de la PWA: manifest, iconos, service worker, experiencia de instalación.'));
c.push(bullet('Plantillas para los dos tipos de contenido de posicionamiento (guías y oraciones analizadas).'));
c.push(bullet('Datos estructurados, mapa del sitio, robots, canónicas y metadatos.'));
c.push(bullet('Instrumentación de medición sin cookies y panel de seguimiento.'));
c.push(bullet('Investigación de palabras clave y calendario editorial de los primeros seis meses.'));
c.push(bullet('Traspaso documentado para que el cliente pueda publicar contenido sin asistencia técnica.'));
c.push(h2('4.2 Excluido'));
c.push(bullet('Redacción del contenido gramatical. Lo escribe el cliente, que es filólogo.'));
c.push(bullet('Modificación de los motores de análisis de la aplicación.'));
c.push(bullet('Pasarela de pago y gestión de licencias (fase posterior).'));
c.push(bullet('Aplicaciones nativas para tiendas. Descartadas de forma expresa.'));
c.push(bullet('Integraciones con plataformas educativas (fase posterior).'));

// ── 5. Arquitectura de la información ──
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(h1('5. Arquitectura de la información'));
c.push(p('Dominio previsto: tallerdesintaxis.com (pendiente de registro). Estructura de URL en español, sin parámetros, sin fechas, en minúsculas y con guiones.'));
c.push(code([
  '/                                    Inicio',
  '/app                                 La aplicación (versión gratuita)',
  '/licencias                           Comparativa de niveles y precios',
  '/licencias/profesor                  Licencia docente individual',
  '/licencias/centros                   Licencia de departamento',
  '/para-profesores                     Uso en el aula',
  '/para-alumnos                        Cómo estudiar con la herramienta',
  '/instalar                            Guía de instalación (Android / iPhone / PC)',
  '/guias/<concepto>                    Guías didácticas  → posicionamiento',
  '/oraciones/<oracion-slug>            Oraciones analizadas → posicionamiento',
  '/manual-profesor                     Manual existente, publicado como web',
  '/manual-alumno                       Manual existente, publicado como web',
  '/sobre-el-proyecto                   Autoría y origen del proyecto',
  '/contacto',
  '/aviso-legal   /privacidad   /terminos',
]));
c.push(...espacio(1));
c.push(callout('Activo disponible desde el primer día',
  'Los manuales de profesor y de alumno ya están redactados y maquetados en HTML. Publicarlos es contenido extenso, de calidad y con vocabulario exacto del sector, a coste cero. Deberían estar en línea antes que ninguna otra cosa.',
  F_OK, '2C7256'));
c.push(...espacio(1));
c.push(h2('5.1 Jerarquía de conversión'));
c.push(p('Cada página tiene una acción principal y solo una. No se compite entre llamadas a la acción.'));
c.push(tabla([
  ['Tipo de página', 'Acción principal', 'Acción secundaria'],
  ['Inicio', 'Abrir la aplicación', 'Ver licencias'],
  ['Guía', 'Practicar este concepto en la app', 'Guía relacionada'],
  ['Oración analizada', 'Analizar otra oración en la app', 'Guía del concepto implicado'],
  ['Para profesores', 'Ver licencias', 'Probar la versión gratuita'],
  ['Licencias', 'Contactar / contratar', 'Descargar el manual'],
], [2600, 3400, 3360]));

// ── 6. Requisitos técnicos ──
c.push(h1('6. Requisitos técnicos'));
c.push(h2('6.1 Rendimiento'));
c.push(p('El sitio de captación es estático: no hay excusa para no obtener métricas excelentes. Objetivos exigibles en móvil y con conexión 4G simulada:'));
c.push(tabla([
  ['Métrica', 'Objetivo'],
  ['Largest Contentful Paint (LCP)', 'Menor de 2,0 s'],
  ['Interaction to Next Paint (INP)', 'Menor de 200 ms'],
  ['Cumulative Layout Shift (CLS)', 'Menor de 0,1'],
  ['Peso de la página de inicio', 'Menor de 300 KB sin imágenes'],
  ['Puntuación Lighthouse (todas las categorías)', 'Igual o superior a 95'],
], [5600, 3760]));
c.push(...espacio(1));
c.push(bullet('Alojamiento en red de distribución de contenido (Cloudflare Pages o Netlify).'));
c.push(bullet('Tipografías locales o autoalojadas, con subconjunto de caracteres. Sin bloqueo de renderizado.'));
c.push(bullet('Imágenes en formato moderno, con dimensiones declaradas para evitar saltos de maquetación.'));
c.push(bullet('Sin JavaScript de terceros en las páginas de contenido.'));

c.push(h2('6.2 PWA — aplicación instalable'));
c.push(callout('Punto central de la comunicación',
  'La mayoría del público desconoce que una web puede instalarse como aplicación. El cliente quiere que esto sea un argumento de venta destacado, no una nota técnica al pie. La experiencia de instalación debe estar diseñada, no solo habilitada.',
  F_NOTA, ROJO));
c.push(...espacio(1));
c.push(bullet('Manifest completo: nombre, nombre corto, descripción, iconos maskable en todos los tamaños, pantalla de arranque, orientación y color de tema.'));
c.push(bullet('Service worker con estrategia de caché que permita uso real sin conexión, no solo la pantalla de carga.'));
c.push(bulletMix([
  t('Botón de instalación propio, capturando el evento '),
  tm('beforeinstallprompt'),
  t(' en navegadores compatibles.'),
]));
c.push(bulletMix([
  t('Instrucciones específicas para iPhone con capturas: Safari no ofrece instalación automática y requiere '),
  t('Compartir → Añadir a pantalla de inicio', { b: true }),
  t('. Es el punto de mayor abandono y necesita tratamiento visual explícito.'),
]));
c.push(bulletMix([
  t('Página '),
  tm('/instalar'),
  t(' con las tres rutas (Android, iPhone, ordenador) y verificación de que ha funcionado.'),
]));
c.push(bulletMix([
  t('Medición: eventos '),
  tm('appinstalled'),
  t(' y detección de arranque en modo '),
  tm('standalone'),
  t(' (ver §8).'),
]));

c.push(h2('6.3 Accesibilidad'));
c.push(p('Nivel exigido: WCAG 2.2 AA. No es opcional en un producto educativo: parte del público tiene adaptaciones curriculares y algunos centros lo exigen en su contratación.'));
c.push(bullet('Navegación completa por teclado con foco visible.'));
c.push(bullet('Contraste mínimo 4,5:1 en texto normal.'));
c.push(bullet('Estructura de encabezados correcta y jerárquica.'));
c.push(bullet('Texto alternativo en toda imagen informativa.'));
c.push(bullet('Respeto a la preferencia de movimiento reducido.'));

c.push(h2('6.4 Semántica y datos estructurados'));
c.push(p('Marcado Schema.org en JSON-LD, por tipo de página:'));
c.push(tabla([
  ['Página', 'Tipo de marcado'],
  ['Inicio y /app', 'SoftwareApplication (categoría EducationalApplication), con precio 0 y valoración si la hubiera'],
  ['Guías', 'Article o LearningResource, con autor identificado'],
  ['Oraciones analizadas', 'LearningResource + Question/Answer cuando el formato lo permita'],
  ['Preguntas frecuentes', 'FAQPage'],
  ['Instalar', 'HowTo'],
  ['Todo el sitio', 'Organization o Person, con enlace a los perfiles del autor'],
], [2600, 6760]));
c.push(...espacio(1));
c.push(pMix([
  t('El autor es un profesor en activo, filólogo, con la obra inscrita en el Registro de la Propiedad Intelectual. Esa autoría debe ser '),
  t('explícita y verificable', { b: true }),
  t(' en el marcado y en las páginas: es una señal de calidad y experiencia decisiva en contenido educativo.'),
]));

c.push(h2('6.5 Ámbito lingüístico'));
c.push(p('El contenido gramatical sigue la NGLE, que es panhispánica: vale para todo el ámbito del español. Lo local es la envoltura, no la gramática.'));
c.push(bullet('Idioma declarado: español. Un solo sitio, sin versiones por país en la primera fase.'));
c.push(bullet('Los términos «PAU», «selectividad» y «Bachillerato» posicionan muy bien en España y no significan nada en América. Se concentran en páginas específicas, no en el grueso del contenido.'));
c.push(bullet('El resto del contenido usa terminología neutra: «análisis sintáctico», «oración subordinada», «complemento directo».'));
c.push(bullet('Valorar hreflang solo si en el futuro se crean páginas diferenciadas por país. No en la primera fase.'));

// ── 7. SEO ──
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(h1('7. Estrategia de posicionamiento'));
c.push(p('El posicionamiento orgánico es el canal principal de captación, no un complemento. No hay presupuesto de publicidad de pago en la primera fase.'));

c.push(h2('7.1 Mapa de intención'));
c.push(tabla([
  ['Búsqueda tipo', 'Intención', 'Página destino'],
  ['análisis sintáctico', 'Herramienta', 'Inicio'],
  ['analizador sintáctico online gratis', 'Uso inmediato', 'Inicio / app'],
  ['cómo analizar oraciones compuestas', 'Aprender', 'Guía'],
  ['diferencia entre CD y CI', 'Duda concreta', 'Guía'],
  ['ejercicios de sintaxis resueltos', 'Practicar', 'Oraciones analizadas'],
  ['sintaxis PAU / selectividad', 'Preparar examen', 'Página específica España'],
  ['app para corregir sintaxis', 'Comprar', 'Licencias / profesor'],
  ['recursos para profesores de lengua', 'Descubrir', 'Para profesores'],
], [3200, 2400, 3760]));
c.push(...espacio(1));
c.push(p('Se solicita al proveedor investigación de palabras clave con volúmenes reales y dificultad, para España y para los principales mercados americanos, antes de fijar el calendario editorial.'));

c.push(h2('7.2 El activo diferencial: el banco de oraciones'));
c.push(p('El cliente dispone de varios cientos de oraciones ya analizadas con criterio NGLE coherente, con funciones sintácticas, subtipos y dificultad graduada. Es un activo que ningún competidor puede replicar con rapidez, porque exige trabajo de filólogo y no de programador.'));
c.push(callout('Advertencia crítica sobre contenido programático',
  'NO se generarán páginas automáticas en masa. Los buscadores penalizan el contenido de poco valor producido a escala. El plan acordado es publicar entre 50 y 80 oraciones seleccionadas a mano, cada una con análisis completo, explicación redactada y ejercicio enlazado, y ampliar solo si esas primeras posicionan. Cualquier propuesta que plantee volcar el banco entero será rechazada.',
  F_AVISO, '96631A'));
c.push(...espacio(1));
c.push(p('Cada página de oración debe aportar valor único: el análisis paso a paso, la explicación del porqué de cada función, los errores frecuentes y el enlace para practicar variantes en la aplicación.'));

c.push(h2('7.3 Enlazado interno'));
c.push(bullet('Cada oración analizada enlaza a la guía del concepto principal que ilustra.'));
c.push(bullet('Cada guía enlaza a entre tres y cinco oraciones que la ejemplifican.'));
c.push(bullet('Toda página de contenido enlaza a la aplicación con la práctica correspondiente.'));
c.push(bullet('Las páginas de contenido enlazan a «Para profesores», y solo esa enlaza a «Licencias». No se mezcla contenido didáctico con presión comercial.'));

c.push(h2('7.4 Competencia'));
c.push(p('Dos referencias directas conocidas en el mercado hispanohablante:'));
c.push(bulletMix([ t('EdAS', { b: true }), t(' (analisissintactico.com/edas) — editor para representar análisis sintácticos. No enseña ni corrige.') ]));
c.push(bulletMix([ t('Syntagma Digital', { b: true }), t(' (syntagmadigital.com) — el competidor más cercano: analiza y corrige ejercicios.') ]));
c.push(p('Se solicita análisis de su perfil de búsqueda y de sus contenidos con mejor rendimiento, como atajo para construir el calendario editorial.'));

// ── 8. Medición ──
c.push(h1('8. Medición e instrumentación'));
c.push(callout('Restricción de privacidad',
  'El público es menor de edad. Se admite exclusivamente analítica agregada sin cookies y sin identificadores personales (Plausible, Umami o Cloudflare Web Analytics). No se admite Google Analytics con configuración por defecto, ni píxeles publicitarios, ni ningún identificador que permita seguir a un individuo.',
  F_NOTA, ROJO));
c.push(...espacio(1));
c.push(h2('8.1 Eventos a instrumentar'));
c.push(tabla([
  ['Evento', 'Qué mide', 'Por qué importa'],
  ['Instalación de la PWA', 'Instalaciones efectivas', 'Es el equivalente a «descargas»'],
  ['Arranque en modo aplicación', 'Uso desde el icono instalado', 'Distingue usuario fiel de visita casual'],
  ['Apertura de la aplicación', 'Paso de web a producto', 'Conversión principal del contenido'],
  ['Ejercicio completado', 'Uso real, agregado', 'Prueba de valor ante editoriales'],
  ['Vista de la página de licencias', 'Interés comercial', 'Cabecera del embudo de venta'],
  ['Contacto enviado', 'Solicitudes de licencia', 'Conversión de negocio'],
], [2800, 3200, 3360]));
c.push(...espacio(1));
c.push(h2('8.2 Cuadro de seguimiento'));
c.push(p('Se solicita un panel mensual, legible por una persona no técnica, con seis cifras: visitas orgánicas, instalaciones, usuarios recurrentes a 30 días, ejercicios completados, vistas de licencias y contactos recibidos. El cliente utilizará esas cifras en negociaciones con editoriales, de modo que deben ser defendibles y estar documentadas en cuanto a método de cálculo.'));

// ── 9. Entregables ──
c.push(h1('9. Entregables y criterios de aceptación'));
c.push(tabla([
  ['Entregable', 'Criterio de aceptación'],
  ['Sitio web completo', 'Todas las páginas de §5 publicadas y enlazadas'],
  ['PWA a punto', 'Instalable y con uso sin conexión verificado en Android e iPhone reales'],
  ['Rendimiento', 'Objetivos de §6.1 cumplidos en móvil, con informe de verificación'],
  ['Accesibilidad', 'Auditoría WCAG 2.2 AA con incidencias resueltas'],
  ['Datos estructurados', 'Validados sin errores en la herramienta de pruebas de Google'],
  ['Plantillas de contenido', 'El cliente publica una guía y una oración sin ayuda técnica'],
  ['Investigación de palabras clave', 'Documento con volúmenes, dificultad y calendario a 6 meses'],
  ['Medición', 'Eventos de §8.1 funcionando y panel entregado'],
  ['Traspaso', 'Documentación y una sesión de formación grabada'],
], [3000, 6360]));
c.push(...espacio(1));
c.push(p('El cliente no es programador. Todo lo entregado debe poder mantenerse sin conocimientos técnicos: publicar una guía nueva no puede exigir tocar código ni ejecutar comandos.', { bold: true }));

// ── 10. Contexto ──
c.push(h1('10. Contexto para el proveedor'));
c.push(p('Información que ayuda a dimensionar la propuesta:'));
c.push(bullet('El proyecto lleva más de un año en uso real en aula, con alumnado de ESO y Bachillerato.'));
c.push(bullet('La obra está inscrita en el Registro de la Propiedad Intelectual.'));
c.push(bullet('Existe una campaña planificada de contacto con la RAE y con editoriales del sector, que se ejecutará en una fase posterior, cuando el sitio tenga datos de uso. Los materiales ya están redactados.'));
c.push(bullet('El calendario del cliente está condicionado por el curso escolar: los períodos de trabajo intensivo son las vacaciones de Navidad y de Semana Santa.'));
c.push(bullet('El horizonte de publicación previsto es la primavera de 2027.'));
c.push(...espacio(1));
c.push(callout('Lo que el cliente valora en una propuesta',
  'Comprensión del público docente por encima del despliegue técnico. Un proveedor que entienda por qué un jefe de departamento de Lengua desconfía de un producto con publicidad vale más que uno que ofrezca la maquetación más vistosa.',
  F_OK, '2C7256'));

// ── Anexo ──
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(h1('Anexo. Glosario para el cliente'));
c.push(p('Términos que aparecerán en las propuestas que reciba, explicados sin tecnicismos.'));
c.push(tabla([
  ['Término', 'Qué significa en la práctica'],
  ['PWA', 'Una web que se puede instalar como aplicación, con su icono en el móvil. Sin tiendas'],
  ['Service worker', 'La pieza que permite que la aplicación funcione sin conexión'],
  ['Core Web Vitals', 'Las tres medidas con las que Google juzga si una web es rápida y estable'],
  ['LCP', 'Cuánto tarda en verse lo importante de la página'],
  ['CLS', 'Cuánto se mueve la página mientras carga. Bajo es bueno'],
  ['Schema.org / JSON-LD', 'Etiquetas invisibles que explican a Google qué es cada página'],
  ['Canónica', 'La etiqueta que dice cuál es la versión buena de una página repetida'],
  ['Contenido programático', 'Páginas generadas en masa desde una base de datos. Útil, pero arriesgado'],
  ['Thin content', 'Páginas con poco valor. Google las penaliza'],
  ['WCAG 2.2 AA', 'El estándar de accesibilidad exigible a un producto educativo'],
  ['hreflang', 'La etiqueta que indica a qué país o idioma va dirigida una página'],
  ['Merchant of record', 'Una empresa que vende en tu nombre y se ocupa del IVA de cada país'],
], [2600, 6760]));

// ═════════════════════════════════════════════════════════════════
const doc = new Document({
  creator: 'Taller de Sintaxis',
  title: 'Brief técnico y SEO — Taller de Sintaxis',
  description: 'Documento de encargo para desarrollo web y posicionamiento',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22, color: '1F2933' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Calibri', color: AZUL },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: 'Calibri', color: ROJO },
        paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Calibri', color: AZUL },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Brief técnico y SEO — Taller de Sintaxis  ·  Página ', size: 18, color: GRIS }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRIS }),
        ],
      })] }),
    },
    children: c,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = 'Brief_Tecnico_SEO_Taller_Sintaxis.docx';
  fs.writeFileSync(out, buf);
  console.log('OK:', out, '(' + buf.length + ' bytes)');
});
