// Generador del manual del profesor (Word .docx)
// Se ejecuta una vez: node build-manual.js → Manual_Profesor_Taller_Sintaxis.docx
const path = require('path');
const fs = require('fs');

// Cargar docx desde el global
const docxPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  TabStopType, TabStopPosition, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak
} = require(docxPath);

// ── Helpers de estilo ─────────────────────────────────────────────
const COLOR_PRIMARIO   = '7C3AED'; // violeta
const COLOR_SECUNDARIO = '2563EB'; // azul
const COLOR_VERDE      = '16A34A';
const COLOR_AMBER      = 'D97706';
const COLOR_GRIS       = '6B7280';
const COLOR_FONDO_TIP  = 'EFF6FF';
const COLOR_FONDO_NOTA = 'FEF3C7';

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({ text, bold: !!opts.bold, italics: !!opts.italics, color: opts.color, size: opts.size })],
  });
}

function pMix(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: runs,
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 80, line: 280 },
    children: [new TextRun({ text })],
  });
}

function bulletMix(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 80, line: 280 },
    children: runs,
  });
}

function step(text) {
  return new Paragraph({
    numbering: { reference: 'steps', level: 0 },
    spacing: { after: 100, line: 280 },
    children: [new TextRun({ text })],
  });
}

function stepMix(runs) {
  return new Paragraph({
    numbering: { reference: 'steps', level: 0 },
    spacing: { after: 100, line: 280 },
    children: runs,
  });
}

// Caja destacada (consejo / nota) con un único Paragraph dentro de una tabla 1x1
function callout(text, fillColor) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: fillColor, type: ShadingType.CLEAR },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              left:   { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARIO },
              right:  { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                spacing: { after: 0, line: 280 },
                children: [new TextRun({ text })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Tabla de pasos clave / valor (2 columnas)
function tableKV(rows, opts = {}) {
  const col1 = opts.col1 || 3200;
  const col2 = opts.col2 || 6160;
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: col1 + col2, type: WidthType.DXA },
    columnWidths: [col1, col2],
    rows: rows.map((r, idx) => new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: col1, type: WidthType.DXA },
          shading: { fill: idx === 0 ? 'EDE9FE' : 'F9FAFB', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true, size: 20 })] })],
        }),
        new TableCell({
          borders,
          width: { size: col2, type: WidthType.DXA },
          shading: { fill: idx === 0 ? 'EDE9FE' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: r[1], size: 20 })] })],
        }),
      ],
    })),
  });
}

// ── Contenido del manual ──────────────────────────────────────────
const children = [];

// Portada
children.push(new Paragraph({
  spacing: { after: 0 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Taller de Sintaxis', size: 52, bold: true, color: COLOR_PRIMARIO })],
}));
children.push(new Paragraph({
  spacing: { after: 240 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Manual breve para el profesor', size: 32, color: COLOR_SECUNDARIO })],
}));
children.push(new Paragraph({
  spacing: { after: 80 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Aplicación web para enseñar análisis sintáctico del español (NGLE / EBAU Murcia).', italics: true, color: COLOR_GRIS, size: 22 })],
}));
children.push(new Paragraph({
  spacing: { after: 360 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Cuatro módulos: Oración simple · Oración compuesta · Sintagmas · Morfología.', italics: true, color: COLOR_GRIS, size: 22 })],
}));

children.push(callout(
  'Lo importante: trastear la app como alumno (los 4 módulos), luego desbloquear el panel del profesor (3 toques en el icono ✒️ del pie de página, contraseña «profe123»), y desde ahí crear un examen para tus alumnos. El resto son detalles.',
  COLOR_FONDO_TIP
));
children.push(p(''));

// ── 1. CÓMO EMPEZAR ───────────────────────────────────────────────
children.push(h1('1. Cómo empezar'));
children.push(p('Abre el enlace en cualquier navegador moderno (Chrome, Firefox, Edge, Safari). No hay que instalar nada y funciona en móvil, tablet y ordenador.'));
children.push(p('La pantalla de inicio tiene cuatro tarjetas grandes con los cuatro módulos. Pulsa cualquiera para entrar. Para volver siempre hay un botón «← Atrás» o el logo arriba a la izquierda.'));

// ── 2. LOS CUATRO MÓDULOS ─────────────────────────────────────────
children.push(h1('2. Los cuatro módulos'));
children.push(tableKV([
  ['Módulo', 'Qué hace'],
  ['Oración simple', 'Identifica el verbo, el sujeto y las funciones del predicado en oraciones simples. Es el módulo principal y el más maduro.'],
  ['Oración compuesta', 'Analiza oraciones compuestas paso a paso: verbos, nexos, delimitación de proposiciones, clasificación y (opcional) análisis interno.'],
  ['Sintagmas', 'Analiza la estructura interna de un sintagma (núcleo, determinantes, complementos…).'],
  ['Morfología', 'Etiqueta cada palabra de un texto con su categoría gramatical en tres niveles de dificultad.'],
]));

// ── 3. FLUJO DEL ALUMNO ───────────────────────────────────────────
children.push(h1('3. Flujo del alumno — pruébalo tú primero'));
children.push(p('Hazlo así, con una oración corta, para ver el flujo completo en 2-3 minutos.', { italics: true, color: COLOR_GRIS }));

children.push(h2('A. Oración simple'));
children.push(step('Pulsa la tarjeta «Oración simple».'));
children.push(step('En la pantalla de filtros, deja todo marcado y pulsa «Practicar».'));
children.push(step('Te aparece una oración. Pulsa sobre la palabra (o palabras) que sean el verbo conjugado. La app te dirá si has acertado o no, y te dará pista si te equivocas.'));
children.push(step('Después marcas el sujeto.'));
children.push(step('Por último, arrastras las etiquetas (CD, CI, Atributo, CC, etc.) sobre los bloques del predicado.'));
children.push(step('Al terminar, ves un resumen con tu nota, los aciertos y los fallos.'));

children.push(h2('B. Oración compuesta'));
children.push(step('Pulsa la tarjeta «Oración compuesta».'));
children.push(step('Filtros: tipos (coordinada / subordinada / yuxtapuesta / mixta), subtipos (sustantiva, relativa, condicional…), nivel y número de proposiciones.'));
children.push(step('La práctica te lleva por seis fases: identificar verbos, identificar nexos, delimitar cada proposición, clasificar el tipo de relación, marcar la función de las subordinadas, y (opcional) analizar el interior de cada proposición.'));
children.push(step('Al final, resumen con la nota y un análisis modelo al estilo PAU.'));

children.push(callout(
  'Truco para ir rápido cuando estés probando: en cualquier momento, pulsa «Saltar esta oración» para no completar todas las fases. No falsea la nota porque la nota se calcula sobre lo que el alumno responde.',
  COLOR_FONDO_TIP
));
children.push(p(''));

// ── 4. FILTROS ────────────────────────────────────────────────────
children.push(h1('4. Filtros — elegir qué practicar'));
children.push(p('Los filtros son la forma de adaptar la práctica al nivel de cada grupo. En el módulo de Oración simple, cada función gramatical (Sujeto, CD, CI, Atr., CPvo, C.Rég., C.Ag., los CC, etc.) tiene una casilla independiente. Hay dos columnas:'));
children.push(bullet('Funciones que el alumno DEBE encontrar — el motor prioriza oraciones que las contengan.'));
children.push(bullet('Funciones que NO deben aparecer — el motor las excluye (útil para alumnos de 1º que aún no han visto el C.Ag. o el C.Rég., por ejemplo).'));
children.push(p('En el módulo de Oración compuesta, los filtros funcionan con un sistema de tres estados (toca en cada chip para alternar):'));
children.push(bullet('Neutro (gris): el subtipo puede aparecer o no.'));
children.push(bullet('Verde (incluir): se prioriza este subtipo.'));
children.push(bullet('Rojo (excluir): nunca aparecerá.'));
children.push(p('Esto te permite, por ejemplo, configurar una sesión exclusivamente de «relativas explicativas» o «todo menos las yuxtapuestas».'));

// ── 5. PUNTUACIÓN ─────────────────────────────────────────────────
children.push(h1('5. Puntuación: ponderación y evaluación'));
children.push(p('Tanto en práctica como en examen, la nota se calcula con un sistema IF-AT atenuado por bloque (similar al de las tarjetas rasca de exámenes universitarios):'));
children.push(tableKV([
  ['Errores en un bloque', 'Crédito que cuenta'],
  ['0 errores', '100% del peso'],
  ['1 error',  '50% del peso'],
  ['2 errores', '25% del peso'],
  ['3 o más errores', '0%'],
]));
children.push(p('Cada función tiene un peso pedagógico. El Sujeto vale más que un Complemento Circunstancial; los argumentos del verbo (CD, CI, Atr., C.Rég., C.Ag., CPvo) pesan más que los adjuntos. El verbo (NP) y el sujeto son los dos elementos que más pesan.'));
children.push(p('En oraciones compuestas, las seis fases tienen sus pesos propios (verbos 2, nexos 2, delimitar 3, clasificar/relacionar 4, análisis interno 3). Si haces un examen sin análisis interno, la nota se renormaliza automáticamente sobre las fases que sí cuentan.'));
children.push(callout(
  'Para que un alumno apruebe (5 sobre 10), debe acertar más o menos el 60-70 % de los bloques. La curva está calibrada para que un alumno que sigue las clases saque ≥6, uno excelente ≥9, y uno que solo adivina ronde el 3.',
  COLOR_FONDO_NOTA
));
children.push(p(''));

// ── 6. PANEL DEL PROFESOR ─────────────────────────────────────────
children.push(h1('6. Acceder al panel del profesor'));
children.push(p('El panel del profesor está oculto a los alumnos. Para entrar:'));
children.push(stepMix([
  new TextRun({ text: 'Baja hasta el pie de página (footer). Hay un texto pequeño con un icono ' }),
  new TextRun({ text: '✒️', bold: true }),
  new TextRun({ text: ' (una pluma).' }),
]));
children.push(stepMix([
  new TextRun({ text: 'Toca/click ' }),
  new TextRun({ text: 'tres veces seguidas', bold: true }),
  new TextRun({ text: ' sobre la pluma.' }),
]));
children.push(stepMix([
  new TextRun({ text: 'Aparece un cuadro de contraseña. Introduce: ' }),
  new TextRun({ text: 'profe123', bold: true }),
  new TextRun({ text: ' (la contraseña por defecto). Pulsa «Acceder».' }),
]));
children.push(p('Verás un panel con varias secciones: URL del backend, crear examen de simples, crear examen de compuestas, resultados, misiones, informe del profesor en Excel.'));

children.push(callout(
  'Una vez dentro, puedes cambiar la contraseña en cualquier momento desde el propio panel para que no sea «profe123». Eso evita que un alumno curioso adivine la entrada.',
  COLOR_FONDO_TIP
));
children.push(p(''));

// ── 7. CREAR EXAMEN DE SIMPLES ────────────────────────────────────
children.push(h1('7. Crear un examen de oraciones simples'));
children.push(p('Desde el panel, busca la sección «Crear examen». Los campos:'));
children.push(tableKV([
  ['Campo', 'Qué pones'],
  ['PIN',          '4 dígitos numéricos que darás a los alumnos. Pulsa 🎲 para que te genere uno al azar.'],
  ['Grupo',        'Ej. «2ºA», «1ºBach-B». Se guarda en cada resultado para filtrar después.'],
  ['Evaluación',   'Ej. «1ª», «2ª». Igual que arriba: organiza los resultados.'],
  ['Nombre',       'Texto libre. Ej. «Examen unidad 3 — sustantivas».'],
  ['Funciones',    'Marca las funciones que el examen evaluará. Puedes excluir las que no hayas visto.'],
  ['Subfase',      '«Solo NP» / «NP + Sujeto» / «Análisis completo» según hasta dónde quieras evaluar.'],
  ['Nº oraciones', 'Cuántas oraciones recibe cada alumno. 0 = todas las que cumplan los filtros.'],
  ['Timer (min)',  'Tiempo máximo. 0 = sin límite.'],
]));
children.push(p('Pulsa «🚀 Activar examen». La app pre-computa las oraciones y deja el PIN listo. Los alumnos lo introducirán en el botón «🎓 Modo examen» del módulo «Oración simple».'));

// ── 8. CREAR EXAMEN DE COMPUESTAS ─────────────────────────────────
children.push(h1('8. Crear un examen de oraciones compuestas'));
children.push(p('Misma idea, en la sección «🚀 Crear examen de Compuestas». Además de PIN, grupo, evaluación y nombre:'));
children.push(bullet('Tipo de oración (todas / coordinada / subordinada / yuxtapuesta / mixta).'));
children.push(bullet('Subtipos concretos (despliega para ver el listado de coordinadas, sustantivas, relativas, construcciones y adverbiales).'));
children.push(bullet('Nivel máximo (básico / medio / avanzado).'));
children.push(bullet('Nº máximo de proposiciones por oración.'));
children.push(bullet('Nº de ejercicios + Timer.'));

children.push(callout(
  '⚠ Importante — chip «Pedir análisis interno de las proposiciones». Desmarcado por defecto. Si lo dejas desmarcado, los alumnos analizan en cinco fases (verbos, nexos, delimitar, clasificar, relacionar) y reciben directamente la nota. Si lo marcas, además les pide analizar el interior de cada proposición (más completo, pero más largo). Para exámenes tipo EBAU, normalmente desmárcalo.',
  COLOR_FONDO_NOTA
));
children.push(p(''));
children.push(p('Pulsa «🚀 Activar examen» y luego «🔎 Probar PIN actual» para comprobar que se ha creado correctamente.'));

children.push(h2('Cómo entran los alumnos'));
children.push(step('Abren la app, pulsan «Oración compuesta».'));
children.push(stepMix([
  new TextRun({ text: 'En la pantalla de filtros, abajo, ven «¿Tienes un PIN del profesor?» y pulsan ' }),
  new TextRun({ text: '🎓 Modo examen', bold: true }),
  new TextRun({ text: '.' }),
]));
children.push(step('Escriben su nombre completo, su correo y el PIN.'));
children.push(step('Resuelven los ejercicios. Aparece un banner morado arriba con el nombre del examen, el timer y el PIN.'));
children.push(step('Al final pulsan «📤 Enviar examen y terminar». Su resultado queda guardado.'));

children.push(h2('Ver los resultados'));
children.push(p('En el mismo panel, sección «🧩 Resultados de Compuestas». Filtra por grupo, evaluación o modo (examen/práctica). Botón «📥 CSV» para descargar la tabla. También hay un dashboard con la media, aprobados y suspendidos.'));
children.push(p('Para los exámenes de simples, los resultados están en la sección equivalente más arriba en el panel.'));

// ── 9. SINTAGMAS ──────────────────────────────────────────────────
children.push(h1('9. Módulo Sintagmas — breve'));
children.push(p('Pensado para repasar la estructura interna de un sintagma. El alumno recibe un sintagma (nominal, adjetival, preposicional, verbal, adverbial) y debe etiquetar cada elemento: núcleo, determinantes, modificadores, complementos, etc.'));
children.push(p('Útil como apoyo: si en oración simple un alumno acierta la función pero no entiende por qué un grupo es SP y no SN, ven a este módulo. La nota se calcula igual (IF-AT atenuada).'));

// ── 10. MORFOLOGÍA ────────────────────────────────────────────────
children.push(h1('10. Módulo Morfología — breve'));
children.push(p('Etiquetado morfológico palabra a palabra. Tres niveles seleccionables al entrar:'));
children.push(bullet('Aprendiz (1º-2º ESO): categorías básicas (sustantivo, verbo, adjetivo, determinante, etc.).'));
children.push(bullet('ESO 3-4: amplía con preposiciones, conjunciones, formas verbales no personales, pronombres por subtipo.'));
children.push(bullet('Maestro (Bachillerato): cascada completa, incluye género, número, persona, tiempo, modo, aspecto.'));
children.push(p('La app toma textos breves (poemas, fragmentos literarios) y pide etiquetar las palabras una a una. Tiene su propia puntuación porcentual.'));

// ── 11. CONSEJOS FINALES ──────────────────────────────────────────
children.push(h1('11. Consejos para empezar'));
children.push(bullet('La primera vez, dedica 15 minutos a probar la app como alumno. Es la mejor forma de entender qué van a vivir tus alumnos.'));
children.push(bullet('Empieza por la oración simple, con subfase «Solo NP» o «NP + Sujeto» si tu grupo no ha visto aún las funciones del predicado. Sube a «Completo» cuando estén listos.'));
children.push(bullet('Para un primer examen en aula, marca un PIN sencillo (ej. 2024), pon un timer cómodo (20-30 min) y desactiva las funciones que no hayáis dado.'));
children.push(bullet('Los resultados se guardan en Google Sheets. Si necesitas la nota oficial, descarga el CSV o pídeme el «Informe del profesor» que genera un Excel multi-hoja.'));
children.push(bullet('Si algo se queda «pillado» en clase, dile al alumno que recargue la pestaña. La aplicación guarda el progreso del examen en el navegador (localStorage), así que no pierde lo hecho.'));

children.push(callout(
  'Cualquier duda o problema, escríbeme. Esta aplicación se desarrolla activamente y los avisos sobre fallos o sugerencias se incorporan en pocas semanas.',
  COLOR_FONDO_TIP
));

// ── DOCUMENTO ─────────────────────────────────────────────────────
const doc = new Document({
  creator: 'Taller de Sintaxis',
  title: 'Manual del profesor — Taller de Sintaxis',
  description: 'Guía breve para profesores que prueban el Taller de Sintaxis por primera vez.',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 34, bold: true, font: 'Calibri', color: COLOR_PRIMARIO },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Calibri', color: COLOR_SECUNDARIO },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } },
        }],
      },
      {
        reference: 'steps',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4 (los profesores en España imprimen A4)
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Manual del profesor — Taller de Sintaxis  ·  Página ', size: 18, color: COLOR_GRIS }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLOR_GRIS }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = 'Manual_Profesor_Taller_Sintaxis.docx';
  fs.writeFileSync(out, buf);
  console.log('OK:', out, '(' + buf.length + ' bytes)');
});
