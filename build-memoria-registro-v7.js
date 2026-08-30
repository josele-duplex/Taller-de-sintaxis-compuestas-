/* Generador de la MEMORIA TÉCNICA Y DESCRIPTIVA DE LA AMPLIACIÓN (v7)
   para el Registro Territorial de la Propiedad Intelectual de la Región
   de Murcia.

   Ejecutar:  node build-memoria-registro-v7.js
   Salida:    Memoria_Ampliacion_Registro_PI_Taller_Sintaxis_v7.docx

   Mantiene la estructura y la tipografía (Georgia) de la memoria original
   de abril de 2026, que es la que el Registro ya conoce. Los datos que
   solo obran en poder del solicitante van RESALTADOS EN AMARILLO. */

const path = require('path');
const fs = require('fs');
const docxPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, convertInchesToTwip,
  TableLayoutType
} = require(docxPath);

/* Google Docs es mucho más estricto que LibreOffice al importar tablas: si el
   documento no declara la rejilla de columnas con anchos ABSOLUTOS (twips),
   colapsa la tabla y la pinta como una sola línea de texto. Por eso todas las
   tablas llevan `columnWidths`, disposición fija y anchos de celda en DXA en
   lugar de porcentajes. */
const ANCHO_PAGINA = 11906;          // A4 en twips
const MARGEN       = 1200;
const ANCHO_UTIL   = ANCHO_PAGINA - MARGEN * 2;   // 9506 twips

const FUENTE   = 'Georgia';
const MONO     = 'Consolas';
const TINTA    = '1F2937';
const ACENTO   = '7B341E';
const GRIS     = '6B7280';
const CABECERA = 'F3EDE3';
const CODIGO   = 'F7F7F5';

// ── Helpers ────────────────────────────────────────────────────────
function p(text, o = {}) {
  return new Paragraph({
    spacing: { after: o.after != null ? o.after : 140, line: 300 },
    alignment: o.center ? AlignmentType.CENTER : (o.just === false ? AlignmentType.LEFT : AlignmentType.JUSTIFIED),
    indent: o.indent ? { left: convertInchesToTwip(0.25) } : undefined,
    children: [new TextRun({ text, bold: !!o.bold, italics: !!o.italics,
      color: o.color || TINTA, size: o.size || 21, font: FUENTE })],
  });
}

function pMix(runs, o = {}) {
  return new Paragraph({
    spacing: { after: o.after != null ? o.after : 140, line: 300 },
    alignment: o.center ? AlignmentType.CENTER : (o.just === false ? AlignmentType.LEFT : AlignmentType.JUSTIFIED),
    children: runs,
  });
}

// Texto normal dentro de un pMix
function t(text, o = {}) {
  return new TextRun({ text, bold: !!o.bold, italics: !!o.italics,
    color: o.color || TINTA, size: o.size || 21, font: FUENTE });
}
// Dato que debe rellenar el solicitante: resaltado en amarillo
function amarillo(text) {
  return new TextRun({ text, bold: true, color: '7F1D1D', size: 21,
    font: FUENTE, highlight: 'yellow' });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 420, after: 200 },
    children: [new TextRun({ text, bold: true, color: ACENTO, size: 28, font: FUENTE })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 140 },
    children: [new TextRun({ text, bold: true, color: TINTA, size: 23, font: FUENTE })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, italics: true, color: TINTA, size: 21, font: FUENTE })],
  });
}
function bullet(text, o = {}) {
  return new Paragraph({
    numbering: { reference: 'vinetas', level: o.level || 0 },
    spacing: { after: 90, line: 290 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, color: TINTA, size: 21, font: FUENTE })],
  });
}
function bulletMix(runs, o = {}) {
  return new Paragraph({
    numbering: { reference: 'vinetas', level: o.level || 0 },
    spacing: { after: 90, line: 290 },
    alignment: AlignmentType.JUSTIFIED,
    children: runs,
  });
}
function code(lines) {
  return lines.map((l, i) => new Paragraph({
    spacing: { after: i === lines.length - 1 ? 160 : 0, line: 240 },
    shading: { type: ShadingType.CLEAR, fill: CODIGO },
    children: [new TextRun({ text: l || ' ', font: MONO, size: 15, color: '374151' })],
  }));
}
function celda(text, o = {}) {
  return new TableCell({
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    shading: o.head ? { type: ShadingType.CLEAR, fill: CABECERA } : undefined,
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    children: [new Paragraph({
      spacing: { after: 0, line: 260 },
      children: [new TextRun({ text, bold: !!o.head || !!o.bold,
        color: TINTA, size: o.size || 19, font: FUENTE })],
    })],
  });
}
function tabla(filas, anchos, conCabecera = true) {
  // Los anchos llegan en porcentaje; se convierten a twips absolutos y se
  // declaran en la rejilla para que Google Docs no colapse la tabla.
  const nCols = filas[0].length;
  const pct = anchos && anchos.length === nCols
    ? anchos
    : new Array(nCols).fill(100 / nCols);
  const dxa = pct.map(x => Math.round(ANCHO_UTIL * x / 100));
  // Cuadrar el redondeo contra el ancho útil exacto.
  dxa[nCols - 1] += ANCHO_UTIL - dxa.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: dxa,
    layout: TableLayoutType.FIXED,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 2, color: 'D6CFC4' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D6CFC4' },
      left:   { style: BorderStyle.SINGLE, size: 2, color: 'D6CFC4' },
      right:  { style: BorderStyle.SINGLE, size: 2, color: 'D6CFC4' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E0D8' },
      insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: 'E5E0D8' },
    },
    rows: filas.map((fila, i) => new TableRow({
      tableHeader: conCabecera && i === 0,
      children: fila.map((c, j) => celda(c, {
        head: conCabecera && i === 0,
        bold: !conCabecera && j === 0,
        width: dxa[j],
      })),
    })),
  });
}
function separador() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '· · ·', color: GRIS, size: 20, font: FUENTE })],
  });
}

module.exports = { p, pMix, t, amarillo, h1, h2, h3, bullet, bulletMix, code, tabla, separador, PageBreak,
  Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, PageNumber,
  FUENTE, MONO, TINTA, ACENTO, GRIS, ShadingType };

// ═══════════════════════════════════════════════════════════════════
//  CONTENIDO DE LA MEMORIA
// ═══════════════════════════════════════════════════════════════════
const cuerpo = [];
const A = (...xs) => xs.forEach(x => Array.isArray(x) ? cuerpo.push(...x) : cuerpo.push(x));

// ── PORTADA ────────────────────────────────────────────────────────
A(
  new Paragraph({ spacing: { after: 900 }, children: [new TextRun({ text: ' ' })] }),
  p('MEMORIA TÉCNICA Y DESCRIPTIVA', { center: true, bold: true, size: 26, color: GRIS }),
  p('DE LA AMPLIACIÓN DE LA OBRA', { center: true, bold: true, size: 26, color: GRIS, after: 480 }),
  p('TALLER DE SINTAXIS', { center: true, bold: true, size: 52, color: ACENTO, after: 140 }),
  p('Versión 7 · 2026', { center: true, size: 26, color: TINTA, after: 320 }),
  p('Sistema interactivo de análisis morfológico, sintáctico y metalingüístico, con manipulación guiada de la lengua y generación automática de evaluaciones',
    { center: true, italics: true, size: 21, color: GRIS, after: 900 }),
  p('AUTOR Y TITULAR', { center: true, bold: true, size: 19, color: GRIS, after: 100 }),
  p('José Luis Asensio Valera', { center: true, bold: true, size: 24, after: 60 }),
  p('DNI 23265690-V', { center: true, size: 21, after: 60 }),
  p('C/ Federico Chueca, 6 · 4.º D · 30880 Águilas (Murcia)', { center: true, size: 21, after: 900 }),
  p('DOCUMENTO AUXILIAR PARA LA AMPLIACIÓN DE LA INSCRIPCIÓN', { center: true, bold: true, size: 19, color: GRIS, after: 80 }),
  p('EN EL REGISTRO DE LA PROPIEDAD INTELECTUAL', { center: true, bold: true, size: 19, color: GRIS, after: 140 }),
  p('Registro Territorial de la Propiedad Intelectual de la Región de Murcia', { center: true, italics: true, size: 20, color: GRIS }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── NOTA PRELIMINAR ────────────────────────────────────────────────
A(
  h1('NOTA PRELIMINAR'),
  p('Este documento describe con fidelidad el estado real del programa a fecha de 30 de agosto de 2026. Los únicos datos que no se han podido consignar son los que constan exclusivamente en la documentación de la inscripción originaria que obra en poder del solicitante; aparecen resaltados en amarillo y deben rellenarse antes de presentar la solicitud:'),
  bulletMix([t('Número de asiento registral o de expediente de la inscripción originaria: '), amarillo('  ______________________  ')]),
  bulletMix([t('Fecha de la resolución de la inscripción originaria: '), amarillo('  ______________________  ')]),
  bulletMix([t('Fecha y lugar de la firma de la presente solicitud: '), amarillo('  ______________________  ')]),
  p('El resto del documento —autoría, descripción, arquitectura, algoritmos, extensión del código y relación de ficheros— está completo y verificado contra el código fuente que se acompaña.', { after: 240 }),
);

// ── FICHA ──────────────────────────────────────────────────────────
A(
  h1('FICHA DE LA AMPLIACIÓN'),
  tabla([
    ['Título de la obra', 'Taller de Sintaxis'],
    ['Subtítulo', 'Sistema interactivo de análisis morfológico, sintáctico y metalingüístico, con manipulación guiada de la lengua y generación automática de evaluaciones'],
    ['Autor y titular', 'José Luis Asensio Valera'],
    ['DNI del autor', '23265690-V'],
    ['Domicilio del autor', 'C/ Federico Chueca, 6 · 4.º D · 30880 Águilas (Murcia)'],
    ['Tipo de obra', 'Programa de ordenador (software) con base de datos original y metodología pedagógica propia'],
    ['Ámbito de inscripción', 'Registro Territorial de la Propiedad Intelectual de la Región de Murcia'],
    ['Versión inscrita originariamente', 'v6 (abril de 2026)'],
    ['Versión objeto de esta ampliación', 'v7 (agosto de 2026)'],
    ['Fecha de primera creación', 'Enero de 2026'],
    ['Fecha de esta versión', '30 de agosto de 2026'],
    ['Extensión del código fuente', 'Más de 46.000 líneas de código propio'],
    ['Ámbito de uso previsto', 'Educación Secundaria Obligatoria y Bachillerato (España y ámbito hispanohablante)'],
    ['Lengua del sistema', 'Español, con terminología conforme a RAE/NGLE'],
    ['Estado', 'En explotación real en el aula; uso compartido con el departamento de Lengua Castellana y Literatura mediante cuadernos independientes por profesor'],
  ], [30, 70], false),
  new Paragraph({ spacing: { after: 160 }, children: [] }),
  pMix([t('Asiento registral de la inscripción originaria que se amplía: '), amarillo('  ______________________  '),
        t('   ·   Fecha: '), amarillo('  ______________________  ')], { just: false }),
);

// ── DECLARACIÓN DE AUTORÍA ─────────────────────────────────────────
A(
  h1('DECLARACIÓN DE AUTORÍA'),
  p('Don José Luis Asensio Valera, con DNI 23265690-V, declara bajo su responsabilidad que es el único autor y titular exclusivo de todos los derechos de propiedad intelectual sobre la obra descrita en el presente documento y sobre las funcionalidades, el código y los contenidos didácticos que constituyen la ampliación aquí documentada. El desarrollo posterior a la inscripción originaria se ha realizado, como el anterior, de forma íntegramente independiente, con medios propios del autor, fuera de su jornada laboral y sin uso de recursos materiales de su centro de trabajo, sin cesión de derechos a terceros y sin relación laboral o contractual que atribuya la titularidad a otra persona física o jurídica.'),
  p('Esta declaración se formula a los efectos oportunos ante el Registro Territorial de la Propiedad Intelectual de la Región de Murcia, en cumplimiento del artículo 5 y concordantes del Real Decreto Legislativo 1/1996, de 12 de abril, por el que se aprueba el Texto Refundido de la Ley de Propiedad Intelectual, y al amparo del artículo 10.1.i) del mismo texto, que reconoce los programas de ordenador como obras protegidas.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 1. OBJETO DE LA AMPLIACIÓN ─────────────────────────────────────
A(
  h1('1. OBJETO DE LA AMPLIACIÓN'),
  h2('1.1 Qué se amplía'),
  p('La versión inscrita en abril de 2026 (v6) era un único fichero HTML autocontenido de unas 7.800 líneas, con un backend de unas 2.000, que cubría tres módulos didácticos: análisis de la oración simple, análisis morfológico y análisis de sintagmas, más un modo de práctica gamificada.'),
  p('Cuatro meses después, la obra ha multiplicado por seis su extensión y ha cambiado de naturaleza interna. Ya no es un fichero: es una aplicación modular de más de cuarenta y seis mil líneas de código propio, organizada en más de cincuenta módulos independientes, con siete módulos didácticos —dos de ellos completamente nuevos y de concepción original— y un sistema de evaluación con calificación verificada en servidor. La presente memoria documenta ese crecimiento a fin de ampliar la inscripción registral con la versión vigente del programa.'),
  p('Las novedades sustanciales son las siguientes:'),
  bullet('Dos módulos didácticos enteramente nuevos —«El Laboratorio de Oraciones» y «La Fábrica de Palabras»— que invierten el planteamiento de la obra original: en lugar de pedir al alumno que aplique etiquetas gramaticales que ya conoce, le hacen manipular la lengua para descubrir el comportamiento que esas etiquetas nombran, y solo después le entregan el nombre.'),
  bullet('Un motor nuevo de análisis de la oración compuesta, con esquema de datos propio, que no existía en la versión inscrita.'),
  bullet('La reelaboración del módulo morfológico en tres niveles curriculares con calificación ponderada por rasgos discriminantes.'),
  bullet('Un modo nuevo de identificación rápida de funciones sintácticas («Chispa»).'),
  bullet('Un sistema completo de evaluación: examen protegido por PIN en seis módulos, calificación calculada y verificada en el servidor, informes descargables para el profesorado y envío automático de resultados por correo a cada alumno.'),
  bullet('La ampliación del módulo Arcade de dos a cuatro submodalidades y la consolidación de la capa de gamificación pedagógica.'),
  bullet('Un sistema de cuadernos independientes por profesor que permite el uso departamental de la obra sin que los datos de un aula lleguen a otra.'),
  bullet('La reescritura completa de la arquitectura, del fichero monolítico a un sistema de módulos nativos de JavaScript, sin dependencias de terceros, con funcionamiento sin conexión.'),
  bullet('Un cuerpo sustancial de contenidos didácticos originales de creación propia —bancos de retos, canon de aceptabilidad, micro-lecciones, criterios de evaluación, manuales— descrito en el apartado 7.'),

  h2('1.2 Resumen del crecimiento respecto de la versión inscrita'),
  tabla([
    ['ELEMENTO', 'v6 (abril 2026, inscrita)', 'v7 (agosto 2026, esta ampliación)'],
    ['Arquitectura', 'Fichero HTML único autocontenido', 'Aplicación modular de página única, más de 50 módulos ES6 nativos'],
    ['Código de cliente', '≈ 7.800 líneas (HTML+CSS+JS juntos)', '≈ 25.000 líneas de JavaScript + ≈ 10.400 de HTML y CSS'],
    ['Backend', '≈ 2.000 líneas (un fichero)', '≈ 10.500 líneas en 13 ficheros de Google Apps Script'],
    ['Módulos didácticos', '3 (Simples, Morfología, Sintagmas)', '7 (Simples, Compuestas, Morfología, Sintagmas, Chispa, Laboratorio, Fábrica)'],
    ['Modos de práctica', 'Arcade con 2 submodos', 'Arcade con 4 submodos + gamificación transversal'],
    ['Banco de oraciones simples', 'Más de 240 oraciones analizadas', 'Más de 650 oraciones analizadas'],
    ['Bancos nuevos', '—', 'Oración compuesta (≈ 250 ejercicios), Laboratorio (≈ 210 retos), Fábrica (122 retos), corpus morfológico por niveles'],
    ['Evaluación', 'Examen con PIN en el módulo de simples; nota calculada en el navegador', 'Examen con PIN en seis módulos; nota calculada y firmada en el servidor, con vale de entrega de un solo uso'],
    ['Informes', 'Exportación CSV', 'Informe en hoja de cálculo con escala de color, ranking, errores por función, analíticas de evolución y envío por correo a cada alumno'],
    ['Usuarios docentes', 'Un solo profesor', 'Cuadernos independientes por profesor (uso departamental)'],
    ['Funcionamiento sin red', 'No', 'Sí: aplicación web progresiva con caché propia y guardián de arranque'],
  ], [22, 36, 42]),

  h2('1.3 Alineación normativa y curricular'),
  bullet('Terminología estricta conforme a la Nueva Gramática de la Lengua Española (RAE/NGLE, 2009). En la versión 7 esta exigencia se ha llevado hasta el detalle de la interfaz: el programa no emplea nunca el término «grupo» (usa «sintagma»), no muestra al alumno los términos «proposición principal» ni «proposición subordinada» —cada cláusula se denomina «oración» y se numera O1, O2, O3—, y la preposición sigue siendo el núcleo del sintagma preposicional.'),
  bullet('Currículo LOMLOE. Además de los contenidos de sintaxis y morfología ya cubiertos, la versión 7 incorpora el bloque de formación de palabras (1.º y 3.º de ESO, 1.º de Bachillerato) y digitaliza el trabajo de reflexión metalingüística que el currículo formula como «formular generalizaciones a partir de la observación, la comparación y la transformación».'),
  bullet('EBAU / PAU de la Región de Murcia. El flujo de análisis, las etiquetas de función y la pauta de respuesta modelo del nivel superior de morfología reproducen los criterios exigidos en la prueba de acceso a la universidad de la Región de Murcia.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 2. NOVEDADES FUNCIONALES ───────────────────────────────────────
A(
  h1('2. NOVEDADES FUNCIONALES DE LA VERSIÓN 7'),

  h2('2.1 El Laboratorio de Oraciones (módulo nuevo)'),
  p('El Laboratorio de Oraciones es el módulo más original de esta ampliación y responde a un problema que la obra inscrita no resolvía. Todos los módulos de la v6 eran «etiqueta primero»: presuponían que el alumno ya sabía qué es un complemento directo antes de abrir la aplicación. El Laboratorio cubre lo anterior a eso. No analiza oraciones: las manipula a propósito para que el alumno vea qué las sostiene. Su verbo no es «etiquetar», sino «operar»: sustituir, suprimir, conmutar, mover y transformar.'),
  p('Cada ejercicio del módulo —denominado «reto»— gira en torno a un mini-corpus de tres a seis oraciones emparentadas y se recorre en tres estaciones que el motor desbloquea en orden estricto: no se accede a la tercera sin haber superado las dos primeras.'),
  tabla([
    ['ESTACIÓN', 'QUÉ HACE EL ALUMNO', 'METALENGUAJE VISIBLE'],
    ['1 · Observa', 'Cuenta los «actores» que reclama el significado del verbo; señala qué cambia entre dos oraciones casi idénticas; detecta la oración que no sigue el patrón de la serie.', 'Ninguno'],
    ['2 · Manipula', 'Ejecuta los cinco experimentos (sustituye, suprime, cambia el número, mueve, transforma); emite juicios de gramaticalidad; resuelve pares mínimos; construye oraciones a partir de condiciones dadas (análisis inverso).', 'Ninguno'],
    ['3 · Etiqueta y prueba', 'Nombra por fin lo que ya ha conquistado y, sobre todo, elige la prueba que lo demuestra entre una opción correcta y distractores razonados.', 'Todo'],
  ], [18, 62, 20]),
  p('El módulo implementa diez tipos de ítem autocorregibles, todos de diseño propio, con validación por opciones de resultado salvo el análisis inverso, que se valida por piezas y casillas. El ítem de mayor complejidad es la investigación abierta del nivel superior: el alumno clasifica un corpus de oraciones con «se» por su comportamiento —antes de recibir ningún nombre— aplicando una cascada de decisión de tres pruebas que separa los siete valores del pronombre.', { after: 100 }),
  p('Dos rasgos merecen destacarse por su originalidad pedagógica y por su expresión concreta en el código:', { after: 100 }),
  bullet('El asterisco es contenido, no castigo. El módulo distingue tres marcas de aceptabilidad —agramatical, contrario a la norma culta y zona gris— y nunca marca con asterisco algo que un hablante nativo dice a diario: eso no enseñaría gramática, enseñaría que la forma de hablar del alumno está mal. La distinción se materializa en un canon cerrado de veintidós causas de agramaticalidad, cada una con su frontera explícita (apartado 4.4).'),
  bullet('El Laboratorio termina donde el módulo de oraciones simples empieza. Ningún ítem pide un análisis completo. Al cerrar un reto, un puente lanza el módulo de simples con esa misma oración ya cargada; y a la inversa, cuando un alumno falla tres veces la misma función en el módulo de simples, el sistema le ofrece practicarla en el Laboratorio. Los dos módulos se necesitan en lugar de solaparse.'),
  p('El módulo incorpora además dos artefactos acumulativos propios del alumno: la Caja de Pruebas del Detective, donde cada prueba conquistada añade su fila con el ejemplo del propio alumno, y un diario metalingüístico. Dispone de banco propio, examen propio con PIN y analíticas propias, independientes del resto de la aplicación.'),

  h2('2.2 La Fábrica de Palabras (módulo nuevo)'),
  p('La Fábrica de Palabras es el gemelo morfológico del Laboratorio y cubre un contenido que la obra inscrita no trataba en absoluto: la formación de palabras. Comparte su arquitectura de tres estaciones bloqueadas en orden y su principio rector —la etiqueta es punto de llegada, no de partida—, aplicados ahora a la palabra en lugar de a la oración.'),
  tabla([
    ['ESTACIÓN', 'QUÉ HACE EL ALUMNO', 'METALENGUAJE VISIBLE'],
    ['1 · Observa', 'Agrupa palabras en familias por el trozo con significado que comparten; detecta el intruso; empareja piezas comunes. Incluye trampas deliberadas de parecido casual (campo frente a campeón).', 'Ninguno'],
    ['2 · Manipula', 'Desmonta palabras cortándolas por sus junturas; monta palabras nuevas a partir de un banco de piezas revueltas, con rebote razonado de las combinaciones imposibles; decide si un par mínimo da «palabra nueva» o «la misma con un dato»; ordena cadenas de derivación; juzga formas inexistentes.', 'Ninguno'],
    ['3 · Etiqueta y prueba', 'Nombra las piezas, clasifica el procedimiento de formación y elige la prueba que lo demuestra frente a los distractores de su categoría vecina confundible.', 'Todo'],
  ], [18, 62, 20]),
  p('El módulo implementa diez tipos de ítem autocorregibles y trabaja los mismos tres niveles curriculares que el módulo morfológico. El ítem propio del nivel superior es la estructura secuenciada: desmontar la palabra en el orden real de su formación —des-[orden-ado] y no [des-orden]-ado— justificando cada corte con la pregunta de si existe la forma intermedia. Incluye asimismo un reto creativo, «Fabrica tu palabra», un Museo de palabras que conserva las creaciones del alumnado, una Mesa de Herramientas que acumula cada etiqueta conquistada y un repertorio propio de misiones diarias.'),
  p('El banco de la Fábrica está formado por 122 retos originales, distribuidos en tres niveles y organizados por procedimientos de formación (derivación, composición, parasíntesis, siglas, acrónimos, acortamientos, abreviaturas, numerónimos, préstamos y cultismos), con su matriz propia de vecinos confundibles.'),

  h2('2.3 Motor de análisis de la oración compuesta'),
  p('La versión inscrita no analizaba la oración compuesta. La v7 incorpora un motor completo y un esquema de datos propio que representa cada ejercicio mediante sus unidades léxicas, sus oraciones constituyentes, sus nexos y las relaciones entre ellas; cada oración constituyente lleva además su propio análisis interno de sujeto, predicado y funciones.'),
  p('El alumno recorre el análisis en cuatro pasos guiados —identificar los verbos, identificar los nexos, delimitar las oraciones y clasificar la relación entre ellas (coordinación con sus subtipos, subordinación con los suyos, y yuxtaposición)— con tres modalidades de uso: lectura comentada, práctica libre con retroalimentación escalonada y examen calificado. Dispone de retroalimentación propia (micro-lecciones y pistas específicas del módulo), banco propio y backend dedicado.'),

  h2('2.4 Análisis morfológico en tres niveles curriculares'),
  p('El módulo morfológico se ha reelaborado por completo en torno a tres niveles alineados con el currículo: identificación de categorías gramaticales (1.º y 2.º de ESO), análisis con atributos esenciales (3.º y 4.º de ESO) y pauta completa de la prueba de acceso a la universidad (Bachillerato).'),
  p('Cada categoría se analiza mediante una cascada de preguntas encadenadas cuyas ramas se adaptan al nivel elegido y a las propias elecciones previas del alumno. El sistema cubre la distinción entre determinante, pronombre y adjetivo; la clase del adjetivo y su terminación; la voz activa y pasiva; las perífrasis verbales; y la formación de palabras. Al cerrar cada palabra se muestra, a modo de modelo, la respuesta completa en una sola línea con el formato exigido en la prueba de acceso.'),
  p('La novedad de mayor calado no está en la interfaz sino en la calificación: los rasgos que verdaderamente discriminan (voz, función, clase) y las categorías de frontera pesan más que los rasgos automáticos, y el modo examen aplica una curva de corrección específica (apartados 5.3 y 5.4).'),

  h2('2.5 Modo «Chispa» de identificación rápida de funciones'),
  p('Modalidad nueva e independiente, orientada al reconocimiento ágil de funciones sintácticas. La aplicación presenta una oración y pide identificar de un vistazo la función solicitada, con dificultad creciente y mezclando material de los bancos de oración simple y de oración compuesta. Registra analíticas de uso de forma silenciosa para el profesorado, sin interferir en la experiencia del alumno.'),

  h2('2.6 Sistema de evaluación, calificación e informes'),
  p('El profesor genera un examen desde su panel, fija sus parámetros —grupo, evaluación, funciones que deben aparecer, funciones prohibidas, dificultad, subfase, número de ejercicios y temporizador— y lo activa mediante un código PIN de cuatro dígitos que comunica oralmente al alumnado. Seis de los siete módulos didácticos disponen ya de modo examen. En modo examen la aplicación no ofrece pistas ni revela la solución, y aplica una curva de calificación más estricta que la de la práctica libre.'),
  p('Los resultados se registran de forma persistente, con protección frente a envíos duplicados. El profesorado dispone de informes descargables en hoja de cálculo con notas por alumno, escala de cuatro colores, ranking, errores más frecuentes por función —ponderados por pilar, función y procedimiento—, minigráficos de evolución, tabla por grupo y una hoja de analítica evolutiva. El sistema permite además enviar automáticamente a cada alumno, por correo electrónico, su calificación y sus errores más frecuentes, mediante un diálogo que permite seleccionar grupo, intervalo de fechas y destinatarios uno a uno.'),

  h2('2.7 Módulo Arcade y gamificación pedagógica'),
  p('El módulo Arcade pasa de dos a cuatro submodalidades: Supervivencia (un error termina la partida), Contrarreloj (120 segundos, cada acierto suma 5), Duelo Fantasma (competición contra el propio récord del alumno o contra la media de su clase, con barra de diferencia en tiempo real) y Radar de Errores (partida construida sobre las funciones que ese alumno concreto viene fallando). Conserva la música sintética generada en tiempo real sin ficheros de audio y el ranking compartido del aula.'),
  p('Transversalmente, la capa de gamificación pedagógica se ha consolidado con escudos, daño diferenciado, bonificación por precisión, penalización escalada, medallas, sellos de dominio, indicadores de micro-progreso y de duda, curva de sesión y misiones diarias con repertorios propios por módulo.'),

  h2('2.8 Panel del profesor y cuadernos de profesor'),
  p('El panel del profesor centraliza la gestión del aula: manuales de uso, descarga de informes, configuración de grupos, subfase del examen, filtros de contenido, gestión del PIN y del temporizador, activación de exámenes y cuadros de mando por módulo.'),
  p('La novedad estructural de la v7 es el sistema de cuadernos. Cada profesor que usa la obra tiene su propio cuaderno —su copia de la hoja de datos y su propio despliegue de servidor— y la aplicación reconoce a cuál debe dirigir los datos mediante un parámetro del enlace que el alumno abre. El sistema no acepta cualquier dirección escrita en el enlace: solo funcionan los cuadernos que figuran en una lista blanca cerrada dentro del propio código, de modo que nadie pueda desviar, mediante un enlace fabricado, las notas y los correos de una clase entera hacia un servidor ajeno. La aplicación muestra en pantalla a qué cuaderno está apuntando y avisa al alumno, con posibilidad de deshacer, cuando un enlace cambia su cuaderno.'),

  h2('2.9 Otras mejoras funcionales'),
  bullet('Aplicación web progresiva: la obra funciona sin conexión gracias a una caché propia del armazón, con instalación fichero a fichero y reintento, y un guardián de arranque que detecta si la aplicación no se ha cargado entera y avisa al alumno en lugar de fallar en silencio.'),
  bullet('Perfil de alumno persistente entre sesiones y entre dispositivos.'),
  bullet('Glosario de términos gramaticales con etiquetado propio, accesible desde cualquier módulo.'),
  bullet('Retos guiados y preguntas de reflexión metalingüística integrados en el flujo de práctica.'),
  bullet('Refuerzo de la seguridad y la integridad de los datos del alumnado, detallado en el apartado 5.5.'),
  bullet('Interfaz renovada, con sistema de tokens de diseño, identidad visual propia (monograma de pluma y doble hélice) y estética editorial cuidada.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 3. ARQUITECTURA ────────────────────────────────────────────────
A(
  h1('3. ARQUITECTURA DE LA VERSIÓN 7'),

  h2('3.1 De un fichero a un sistema modular'),
  p('El cambio arquitectónico es el de mayor alcance de esta ampliación. La obra inscrita era un único fichero HTML autocontenido: interfaz, estilos, lógica de análisis, feedback y gamificación convivían en el mismo documento. La versión 7 es una aplicación de página única, estática y modular, en la que cada módulo didáctico, cada servicio compartido y cada conjunto de datos lingüísticos vive en su propio fichero y se carga mediante módulos nativos de JavaScript.'),
  p('La reescritura no ha sido cosmética. Ha exigido definir contratos explícitos entre módulos (una interfaz pública por módulo didáctico), separar los datos lingüísticos de la lógica que los pinta, centralizar la red, el enrutamiento, el perfil, el audio, la autenticación, el saneamiento de entradas y la limpieza de temporizadores en un núcleo común, y sostener siete motores de análisis distintos sin que ninguno dependa de las variables globales de otro.'),

  h2('3.2 Modelo arquitectónico'),
  tabla([
    ['CAPA', 'TECNOLOGÍA Y FUNCIÓN'],
    ['Interfaz', 'HTML5 y CSS3. Un documento de pantallas (≈ 1.600 líneas) y un sistema de estilos con tokens de diseño (≈ 6.800 líneas), más los manuales del profesor y del alumno como páginas propias.'],
    ['Lógica de cliente', 'JavaScript ES2022 con módulos nativos (≈ 25.000 líneas). Siete motores didácticos, el panel del profesor y su generador de informes, un núcleo de servicios compartidos, las capas de retroalimentación y gamificación, y los datos lingüísticos separados de la interfaz.'],
    ['Backend ligero', 'Google Apps Script (≈ 10.500 líneas en 13 ficheros), desplegado como aplicación web con dirección pública. Autenticación, entrega filtrada de ejercicios, precomputación y caché de exámenes, calificación en servidor, almacenamiento de resultados, informes, envío de correos y analíticas.'],
    ['Datos', 'Hoja de cálculo en la nube con hojas estructuradas, accesible únicamente a través del backend. Un cuaderno independiente por profesor.'],
  ], [20, 80]),

  h2('3.3 Diagrama de arquitectura'),
  code([
    '┌──────────────────────────────────────────────────────────────────┐',
    '│              USUARIO (alumno o docente)                          │',
    '│        Navegador web — ordenador, tableta o móvil                │',
    '│        Funciona sin conexión (aplicación web progresiva)         │',
    '└─────────────────────────────┬────────────────────────────────────┘',
    '                              │ Interacción',
    '                              ▼',
    '┌──────────────────────────────────────────────────────────────────┐',
    '│   FRONTEND — aplicación modular (≈ 25.000 líneas de JS)          │',
    '│                                                                  │',
    '│   MÓDULOS DIDÁCTICOS                                             │',
    '│    · sint/        Oración simple (3 fases)                       │',
    '│    · compuestas/  Oración compuesta (4 pasos)                    │',
    '│    · maestro/     Morfología (3 niveles curriculares)            │',
    '│    · sintagmas/   Estructura interna del sintagma                │',
    '│    · laboratorio/ Manipulación y juicio de gramaticalidad        │',
    '│    · fabrica/     Formación de palabras                          │',
    '│    · chispa/      Identificación rápida de funciones             │',
    '│    · arcade/      Práctica gamificada (4 submodos)               │',
    '│    · teacher/     Panel del profesor e informes                  │',
    '│                                                                  │',
    '│   NÚCLEO DE SERVICIOS                                            │',
    '│    core/ (red, enrutado, perfil, audio, auth, escapado,          │',
    '│           temporizadores, cuadernos)  ·  data/ (datos            │',
    '│           lingüísticos)  ·  feedback/ (micro-lecciones,          │',
    '│           pistas, seguimiento del error)  ·  gamification/       │',
    '│           (XP, niveles, rachas, misiones)  ·  glosario/          │',
    '└─────────────────────────────┬────────────────────────────────────┘',
    '                              │ Peticiones HTTP (fetch / sendBeacon)',
    '                              ▼',
    '┌──────────────────────────────────────────────────────────────────┐',
    '│   BACKEND — Google Apps Script (≈ 10.500 líneas, 13 ficheros)    │',
    '│                                                                  │',
    '│    Code_v6.gs        núcleo: entrega de ejercicios, exámenes,    │',
    '│                      calificación en servidor, caché y bloqueos  │',
    '│    Compuestas.gs     bancos, exámenes y resultados de compuestas │',
    '│    Laboratorio.gs    retos, examen y resultados del Laboratorio  │',
    '│    Formacion.gs      retos, examen y resultados de la Fábrica    │',
    '│    ChispaStats.gs    analíticas del modo Chispa                  │',
    '│    InformeExamen.gs · FormatoResultados.gs · Minigraficos.gs ·   │',
    '│    TablaGrupos.gs · AnaliticaEvolutiva.gs · EvolucionAlumnos.gs  │',
    '│    EnviarInformes.gs  informes, analíticas y correo al alumnado  │',
    '└─────────────────────────────┬────────────────────────────────────┘',
    '                              │ API de hoja de cálculo',
    '                              ▼',
    '┌──────────────────────────────────────────────────────────────────┐',
    '│   DATOS — un cuaderno (hoja de cálculo) por profesor             │',
    '│                                                                  │',
    '│    Oraciones_Banco · Compuestas_Banco · Morfologia_Textos        │',
    '│    Laboratorio_Banco · Formacion_Banco                           │',
    '│    Examenes_Config · Alumnos_Resultados · Compuestas_Resultados  │',
    '│    Ranking_Arcade · Misiones · Chispa_Stats · Diagnostico        │',
    '│    Analitica_Evolutiva · Panel_Profesor                          │',
    '└──────────────────────────────────────────────────────────────────┘',
  ]),

  h2('3.4 Volumen y organización del código'),
  p('El programa consta, en su versión vigente, de más de cuarenta y seis mil líneas de código fuente propio, repartidas del siguiente modo:'),
  tabla([
    ['COMPONENTE', 'EXTENSIÓN'],
    ['Lógica de cliente (JavaScript)', '25.025 líneas en más de 50 módulos'],
    ['Backend (Google Apps Script)', '10.502 líneas en 13 ficheros'],
    ['Estilos (CSS)', '6.765 líneas'],
    ['Interfaz y manuales (HTML)', '3.445 líneas'],
    ['Armazón sin conexión (Service Worker)', '192 líneas'],
    ['TOTAL DE CÓDIGO FUENTE PROPIO', 'Más de 45.900 líneas, sin contar la documentación técnica ni los bancos de datos'],
  ], [55, 45]),
  p('Los módulos didácticos de mayor extensión son el de la oración compuesta (5.658 líneas), el de la oración simple (4.186), el Laboratorio de Oraciones (1.878), la Fábrica de Palabras (1.652), el panel del profesor (1.646, más 968 de su generador de informes), la morfología (1.388) y el Arcade (1.141).'),

  h2('3.5 Ausencia deliberada de dependencias'),
  p('Es una seña de identidad de la obra su práctica ausencia de dependencias externas. No emplea ningún marco de trabajo (React, Vue, Angular), ninguna biblioteca de terceros para su lógica, ningún empaquetador, ningún preprocesador y ningún lenguaje transpilado. Se apoya exclusivamente en las interfaces de programación nativas del navegador: módulos ES6, Web Audio API para el sonido generado por síntesis, almacenamiento local para la persistencia de cliente, Service Worker para el funcionamiento sin conexión y las funciones de red estándar. La única biblioteca de terceros utilizada —la que escribe los ficheros de hoja de cálculo del informe del profesor— está incorporada al propio repositorio con licencia libre, en lugar de cargarse desde un servidor ajeno, precisamente para que la obra no dependa de nadie.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 4. ESTRUCTURAS DE DATOS ────────────────────────────────────────
A(
  h1('4. ESTRUCTURAS DE DATOS PROPIETARIAS'),
  p('La versión inscrita documentaba tres esquemas de datos originales (banco de oraciones, tokens morfológicos y resultados de examen), que se mantienen. La v7 añade tres esquemas nuevos, de diseño propio y con documentación normativa asociada, y un canon de aceptabilidad lingüística.'),

  h2('4.1 Esquema de la oración compuesta'),
  p('Cada ejercicio de oración compuesta se representa mediante cuatro colecciones —unidades léxicas, oraciones constituyentes, nexos y relaciones entre oraciones— y cada oración constituyente lleva su propio análisis interno completo. Las referencias se hacen siempre por texto, nunca por posición, para que la corrección de una errata en el banco no invalide el ejercicio entero.'),
  code([
    '{',
    '  "tokens":        ["Cuando", "llegó", "el", "tren", ",", "ya", "no", "quedaba", "sitio"],',
    '  "proposiciones": [',
    '    { "id": "O1", "texto": "ya no quedaba sitio",',
    '      "analisis_interno": { "sujeto": "sitio", "predicado": "…", "funciones": [ … ] } },',
    '    { "id": "O2", "texto": "Cuando llegó el tren",',
    '      "analisis_interno": { … } }',
    '  ],',
    '  "nexos":       [ { "texto": "Cuando", "tipo": "subordinante" } ],',
    '  "relaciones":  [ { "de": "O2", "a": "O1",',
    '                     "tipo": "subordinada", "subtipo": "CC Tiempo" } ]',
    '}',
  ]),

  h2('4.2 Esquema del reto del Laboratorio de Oraciones'),
  p('Cada fila de la hoja del Laboratorio es un reto completo, con sus columnas derivadas (nivel, curso mínimo, funciones tratadas, tipos de ítem, procedencia, marca de zona gris) y un objeto que contiene el corpus y la secuencia de ítems. El esquema define diez tipos de ítem, listas cerradas para todo lo que el motor interpreta, y una regla de metalenguaje por nivel y estación que impide que un ítem de las estaciones 1 y 2 muestre o pida una etiqueta gramatical. Este es un ítem real del banco, del tipo «qué cambia»:'),
  code([
    '{ "schema_version": "1.0", "id": "LB_0094", "nivel": "basico",',
    '  "titulo_problema": "¿Qué le pasa al verbo cuando son varios',
    '                      los que hacen la acción?",',
    '  "corpus": ["El perro ladra.", "Los perros ladran."],',
    '  "items": [',
    '    { "tipo": "que_cambia",',
    '      "oracion_a": "El perro ladra.",',
    '      "oracion_b": "Los perros ladran.",',
    '      "cambio": "El perro → Los perros",',
    '      "opciones": [',
    '        { "texto": "La palabra que dice la acción también pasa a hablar',
    '                    de varios: cambia con él.",',
    '          "ok": true,',
    '          "micro": "Los dos cambios van juntos y no por casualidad:',
    '                    \\"ladra\\" se convierte en \\"ladran\\" porque está',
    '                    obligado a acompañar a \\"los perros\\"." },',
    '        { "texto": "No cambia nada más en la oración.",',
    '          "ok": false,',
    '          "micro": "Fíjate bien: \\"ladra\\" también ha cambiado." } ] },',
    '    { "tipo": "manipulacion", "manipulacion": "cambia_numero", … } ] }',
  ]),
  p('Obsérvese que ninguna de las dos opciones nombra el sujeto ni la concordancia: el alumno de 2.º de ESO descubre el fenómeno antes de recibir su nombre. Cada opción, acertada o fallida, lleva su propia microexplicación: el distractor no se limita a estar mal, enseña.'),

  h2('4.3 Esquema del reto de la Fábrica de Palabras'),
  p('Estructura paralela a la del Laboratorio, con sus propios diez tipos de ítem y su propia lista cerrada de procedimientos de formación. Fragmento real del banco:'),
  code([
    '{ "schema_version": "1.0", "id": "FP_0001", "nivel": "basico",',
    '  "titulo_problema": "¿Qué piezas esconde la palabra \\"ilegal\\"?",',
    '  "corpus": ["ilegal", "legalizar", "legalidad"],',
    '  "items": [',
    '    { "tipo": "intruso",',
    '      "palabras": ["ilegal", "ilegítimo", "ilustre", "ilimitado"],',
    '      "respuesta": "ilustre",',
    '      "feedback": "\\"Ilustre\\" empieza igual, pero no comparte el trozo',
    '                   con significado de \\"legal\\"." },',
    '    { "tipo": "piezas", "modo": "cortar", "palabra": "ilegal",',
    '      "cortes": ["i", "legal"], "feedback": "…" },',
    '    { "tipo": "juicio", "forma": "*legali", "veredicto": "no_existe",',
    '      "causa": "orden_piezas",',
    '      "opciones_causa": ["orden_piezas", "falta_base"],',
    '      "forma_correcta": "ilegal", "explicacion": "…" } ] }',
  ]),

  h2('4.4 Canon de aceptabilidad: veintidós causas y tres marcas'),
  p('El canon de aceptabilidad es, probablemente, la pieza de contenido más delicada de la ampliación y no tiene equivalente en ningún material del mercado. Establece que no todo lo que «suena raro» es lo mismo, y obliga al banco entero a respetar la distinción:'),
  tabla([
    ['MARCA', 'QUÉ SIGNIFICA', 'CÓMO SE PREGUNTA'],
    ['✗ Agramatical', 'Se rompe la comprensión gramatical. Ningún hablante nativo lo dice.', 'Lleva asterisco. Se pide veredicto y causa.'],
    ['⚠ Norma culta', 'Se dice y se entiende; lo que falla es el registro formal.', 'Nunca lleva asterisco. No se pregunta si está mal, sino en qué situación no vale.'],
    ['⚖ Zona gris', 'Hay dos análisis defendibles.', 'Puntúan los dos si la justificación es coherente. Queda fuera del examen.'],
  ], [18, 44, 38]),
  p('El canon enumera veintidós causas —concordancia entre sujeto y verbo, concordancia del atributo, del determinante, del complemento predicativo y de los pronombres átonos; transitividad; orden imposible; régimen preposicional; pronombre cruzado; recíproco con sujeto singular; selección semántica; verbo pronominal sin su pronombre; pasiva refleja de verbo intransitivo; impersonal pluralizada; duplicación obligatoria; modo obligado; gradabilidad; queísmo y dequeísmo; leísmo y laísmo; concordancia ad sensum, entre otras—, cada una con su ejemplo canónico de contraste y con su frontera explícita: qué cuenta como esa causa y qué no. Lo acompaña una lista de fenómenos expresamente excluidos del corpus, que no es una recomendación sino un límite: marcar con asterisco algo que el alumno oye en su casa todos los días no enseña gramática, enseña que su forma de hablar está mal.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 5. ALGORITMOS ──────────────────────────────────────────────────
A(
  h1('5. ALGORITMOS Y LÓGICA ORIGINAL AÑADIDA'),
  p('Los algoritmos descritos en la memoria de la versión inscrita —el motor de retroalimentación escalonada, el motor de puntuación ponderada, el normalizador de etiquetas, las cascadas condicionales morfológicas y el patrón de precomputación y caché del backend— se mantienen y siguen operativos. Los que siguen son los que la versión 7 añade.'),

  h2('5.1 Motor de estaciones bloqueadas en orden'),
  p('En los dos módulos nuevos, «la etiqueta es punto de llegada» deja de ser una recomendación al profesor y pasa a ser una regla del motor. Cada reto se compone de ítems etiquetados por estación; el motor calcula la estación activa a partir de los ítems ya superados y no permite renderizar ningún ítem de la estación 3 mientras queden ítems pendientes en las estaciones 1 y 2. La regla de metalenguaje se aplica en el mismo punto: el motor valida, contra la lista cerrada de funciones y niveles, que ningún texto visible de un ítem de estación 1 o 2 contenga una etiqueta gramatical. Un lote de contenido que incumpla la regla es rechazado por el validador de bancos antes de llegar al alumno.'),

  h2('5.2 Cascada de decisión de los siete valores de «se»'),
  p('El ítem estrella del nivel superior del Laboratorio no pregunta al alumno qué clase de «se» tiene delante: le hace clasificar un corpus por comportamiento. La cascada aplica tres pruebas encadenadas y un subpaso que, en este orden, separan los siete valores del pronombre, y está diseñada para convivir con las etiquetas que el módulo de oraciones simples utiliza para el mismo fenómeno —el sistema explica al alumno por qué verá nombres distintos en un módulo y en otro en lugar de ocultar la discrepancia—. La cascada se validó contra el corpus real del banco, y las oraciones que resultan ser genuinamente ambiguas no se maquillan: se marcan como zona gris y quedan fuera del examen.'),

  h2('5.3 Ponderación morfológica por rasgos discriminantes'),
  p('La calificación morfológica de la versión inscrita trataba por igual todos los atributos de una palabra. La v7 introduce una ponderación que refleja lo que de verdad discrimina el conocimiento del alumno: los rasgos discriminantes —la voz del verbo, la función del cuantificador, la clase del adjetivo o del pronombre— valen el doble que los rasgos que se siguen automáticamente de la forma, y las categorías de frontera (aquellas en las que el alumno debe elegir entre determinante, pronombre y adjetivo) pesan tres veces. El modo examen aplica sobre ese cálculo una curva de corrección específica.'),

  h2('5.4 Curva de calificación diferenciada entre práctica y examen'),
  p('Un mismo acierto no vale lo mismo cuando el alumno tiene pistas a mano que cuando está examinándose. La v7 separa las dos curvas: en práctica libre, un elemento resuelto al primer intento vale el 100 %, al segundo el 50 % y al tercero el 25 %; en examen, el 100 %, el 40 % y el 10 %. Se reajustaron además los pesos por competencia del módulo de oraciones simples. La finalidad es explícita y de orden pedagógico: frenar la inflación de notas que producía una aplicación que perdona mucho, sin renunciar a que la práctica sea generosa.'),

  h2('5.5 Calificación en servidor y vale de entrega de un solo uso'),
  p('En la versión inscrita, la nota del examen se calculaba en el navegador del alumno y se enviaba al servidor. La versión 7 invierte por completo ese diseño, por una razón que conviene dejar escrita: los datos que la obra maneja son calificaciones de menores de edad, y un sistema en el que la nota la calcula el dispositivo del examinando no es un sistema de evaluación fiable.'),
  bullet('El cliente ya no envía la nota: envía las respuestas. El servidor recupera la configuración del examen, recalcula la calificación con la misma ponderación y la misma curva, y la nota que se registra es la suya.'),
  bullet('Cada entrega va acompañada de un vale de un solo uso emitido por el servidor al comenzar el examen. Un vale consumido no admite una segunda entrega, lo que cierra la posibilidad de repetir el envío hasta obtener un resultado mejor.'),
  bullet('La clave de acceso del profesorado falla cerrada: si el servidor no puede comprobarla, deniega el acceso en lugar de concederlo. Se eliminó asimismo cualquier clave de fábrica del código de cliente.'),
  bullet('Todo texto procedente del banco de datos se escapa antes de insertarse en la página; los ficheros exportados neutralizan las fórmulas que un dato malicioso pudiera contener; y la validación del PIN incorpora un freno frente a la prueba sistemática de códigos.'),

  h2('5.6 Lista blanca de cuadernos de profesor'),
  p('El sistema multiprofesor podría haberse resuelto de forma trivial haciendo que el enlace llevase la dirección del servidor de destino. No se hizo así: bastaría con fabricar un enlace para desviar las notas y los correos de una clase entera hacia un servidor ajeno. La aplicación acepta únicamente identificadores cortos que figuren en una lista cerrada escrita en su propio código; cualquier otro se ignora y la aplicación permanece en el cuaderno por defecto. La asignación se recuerda en el dispositivo, se muestra en pantalla y puede deshacerse.'),

  h2('5.7 Arranque resistente y funcionamiento sin conexión'),
  p('La obra se instala en el navegador como aplicación web progresiva. El armazón se precarga fichero a fichero —nunca en bloque, para que la ausencia de un solo recurso no invalide la instalación entera— con reintento antes de rendirse. Un guardián de arranque comprueba, al cargar, que todos los módulos se han inicializado, y avisa al alumno si no es así en lugar de dejarlo ante una pantalla que no responde. Cada módulo didáctico incorpora además defensas propias para no morir si un módulo hermano falla.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 6. METODOLOGÍA PEDAGÓGICA ──────────────────────────────────────
A(
  h1('6. METODOLOGÍA PEDAGÓGICA ORIGINAL AMPLIADA'),
  p('La memoria de la versión inscrita documentaba cuatro principios pedagógicos con respaldo empírico: andamiaje cognitivo, reducción de carga cognitiva, enseñanza contextualizada de la gramática y gamificación educativa. Los cuatro se mantienen y se aplican ahora también a los módulos nuevos. La versión 7 añade tres principios más, que son los que dan sentido al Laboratorio y a la Fábrica y que explican por qué esos dos módulos no son «más ejercicios», sino una inversión del planteamiento didáctico de la obra.'),

  h2('6.1 La etiqueta es punto de llegada, no de partida'),
  p('Fundamentado en la Secuencia Didáctica de Gramática de Camps y Zayas y en la investigación sobre enseñanza gramatical de Myhill y colaboradores. La obra inscrita, como prácticamente todo el material digital existente, presuponía el metalenguaje: pedía identificar un complemento directo a quien ya sabía qué era. Los módulos nuevos recorren el camino inverso —observación de un corpus, manipulación con verificación inmediata y solo al final formalización—, y lo hacen imponiendo el orden por diseño del motor, no por disciplina del profesor.'),
  p('La decisión de alcance que acompaña a este principio también es original y deliberada: la aplicación no intenta sustituir a la clase. Digitaliza aquello en lo que tiene ventaja comparativa sobre el aula —manipulación a escala con verificación instantánea y registro del error por categoría: treinta alumnos operando a la vez, cada uno con su respuesta comprobada— y deja al aula lo que es del aula: la pregunta-problema inicial en voz alta, la puesta en común y la definición construida entre todos.'),

  h2('6.2 Se evalúa la prueba, no la etiqueta'),
  p('Acertar el nombre no demuestra saber. En la estación 3 de los dos módulos nuevos, la clasificación nunca puntúa sola: puntúa el par formado por la etiqueta y la prueba que la sostiene. Cada ítem ofrece una prueba correcta y distractores construidos a propósito —típicamente la prueba de la categoría vecina confundible y la descomposición mal hecha—, y cada opción, acertada o fallida, lleva su microexplicación. La matriz de vecinos confundibles (flexivo frente a derivativo, compuesta frente a parasintética, sigla frente a acrónimo, familia léxica frente a parecido casual, y sus equivalentes sintácticos) es material original del autor.'),

  h2('6.3 El error, la duda y la zona gris son contenido'),
  p('El tratamiento de la agramaticalidad descrito en el apartado 4.4 es la aplicación más visible de este principio, pero no la única. Los ítems de frontera —aquellos en los que hay dos análisis defendibles— puntúan por igual las dos respuestas si van acompañadas de una justificación coherente, y se marcan como debate en lugar de resolverse por decreto. La aplicación registra además, junto al acierto, la duda: cuánto ha tardado el alumno y cuántas veces ha cambiado de opinión, información que llega al profesor sin penalizar al alumno.'),

  h2('6.4 Continuidad con los principios ya inscritos'),
  p('Los cuatro principios de la versión inscrita siguen vigentes y se han extendido: el andamiaje escalonado (comentario que hace pensar primero, pista concreta después, y solo si el alumno la pide) gobierna ahora también la retroalimentación de compuestas, del Laboratorio y de la Fábrica; la reducción de carga cognitiva rige las cascadas de los tres niveles morfológicos y las de la formación de palabras; las micro-lecciones contextuales se activan en los mismos términos; y la capa de gamificación se ha ampliado sin alterar el rigor del análisis.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 7. APORTACIÓN DIDÁCTICA ────────────────────────────────────────
A(
  h1('7. APORTACIÓN DIDÁCTICA ORIGINAL'),

  h2('7.1 Naturaleza de la aportación'),
  p('La obra no se agota en su condición de programa de ordenador: incorpora un cuerpo sustancial de contenidos didácticos originales, de creación propia del autor, elaborados conforme a la terminología de la Nueva Gramática de la Lengua Española y a los criterios de la prueba de acceso a la universidad de la Región de Murcia. Estos contenidos constituyen expresión protegida por el derecho de autor y forman parte inseparable del valor de la obra.'),
  p('A los efectos de esta memoria conviene precisar que la protección recae sobre la expresión concreta de dichos contenidos —los textos, los materiales, las secuencias y los criterios tal como han sido redactados y organizados por el autor— y no sobre las ideas, los métodos o los conceptos pedagógicos en abstracto, que la legislación excluye de protección. Lo que se documenta y se somete a registro es, por tanto, la realización concreta y original de ese trabajo didáctico.'),

  h2('7.2 Contenidos didácticos originales que integran la ampliación'),
  tabla([
    ['CONTENIDO', 'DESCRIPCIÓN'],
    ['Banco de retos del Laboratorio de Oraciones', 'Cerca de 210 retos originales en tres niveles, con su corpus, sus ítems autocorregibles, sus distractores razonados y su microexplicación por opción.'],
    ['Banco de retos de la Fábrica de Palabras', '122 retos originales en tres niveles, con la misma estructura y su propia matriz de vecinos confundibles.'],
    ['Canon de aceptabilidad del corpus agramatical', 'Las veintidós causas, sus tres marcas, el ejemplo canónico de contraste de cada una, su frontera y la lista de fenómenos expresamente excluidos del corpus.'],
    ['Cascada de los siete valores de «se»', 'Documento de diseño del ítem de investigación abierta: orden de las pruebas, frontera entre valores vecinos, zonas grises identificadas y mapa de convivencia con las etiquetas del módulo de simples.'],
    ['Banco de reflexión metalingüística', 'Ítems autocorregibles con enfoque metodológico propio (se evalúa la prueba y no la etiqueta; manipulación sintáctica frente a heurísticos) y distractores diseñados pedagógicamente.'],
    ['Modelo de análisis morfológico en tres niveles', 'Diseño, secuenciación y criterios de los niveles Categorías, Análisis y modelo PAU, tal como se expresan en el programa y en su documentación.'],
    ['Criterios de evaluación y calificación', 'Rúbrica que pondera los rasgos discriminantes, curvas diferenciadas de práctica y examen, y su fundamentación escrita.'],
    ['Micro-lecciones y retroalimentación escalonada', 'Textos explicativos propios asociados a cada tipo de error, con pistas contextuales graduadas, en los módulos de simples, compuestas, sintagmas, morfología, Laboratorio y Fábrica.'],
    ['Secuencias didácticas guiadas', 'Los pasos de análisis (simple, compuesta, sintagma), las cascadas morfológicas y las tres estaciones de los módulos nuevos, como itinerario didáctico.'],
    ['Bancos de oraciones y corpus propios', 'Más de 650 oraciones simples analizadas, el banco de oración compuesta y los corpus morfológicos de los tres niveles, todos de elaboración propia.'],
    ['Material de aula y modelo de respuesta', 'Tarjetas didácticas del módulo de compuestas, respuesta modelo del formato de la prueba de acceso y glosario de términos gramaticales.'],
    ['Manuales y guías', 'Manual del profesor, manual del alumno, guía de sesiones y protocolo de uso compartido con el departamento.'],
  ], [32, 68]),

  h2('7.3 Materiales de terceros excluidos del registro'),
  p('Algunos de los textos empleados en la aplicación a título de ejemplo o ilustración proceden de obras literarias de terceros (entre otros, fragmentos de obras de la literatura hispanoamericana). Dichos fragmentos se utilizan como cita e ilustración didáctica y no son objeto de la presente inscripción. El registro se refiere exclusivamente a las creaciones propias del autor: el programa, su arquitectura y los contenidos didácticos originales relacionados en el apartado 7.2. La única biblioteca de terceros incorporada al código —el escritor de ficheros de hoja de cálculo del informe del profesor— se utiliza al amparo de su licencia libre y queda igualmente excluida de la inscripción.'),
  p('Se hace constar, a los efectos que el Registro estime oportunos, que los materiales didácticos de carácter autónomo —el banco de reflexión metalingüística, el canon de aceptabilidad, los manuales o los bancos de retos de elaboración propia— podrían además ser objeto de inscripción como obras independientes de naturaleza literaria o educativa, con independencia del programa de ordenador.'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 8. COMPONENTES E HISTORIAL ─────────────────────────────────────
A(
  h1('8. COMPONENTES INCLUIDOS EN LA AMPLIACIÓN'),
  tabla([
    ['COMPONENTE', 'DESCRIPCIÓN Y EXTENSIÓN'],
    ['Código fuente del cliente', 'Más de 50 módulos de JavaScript ES6 (25.025 líneas), el documento de pantallas y los manuales en HTML (3.445 líneas), las hojas de estilo (6.765 líneas) y el armazón sin conexión (192 líneas).'],
    ['Código fuente del backend', 'Trece ficheros de Google Apps Script (10.502 líneas): núcleo, compuestas, Laboratorio, Fábrica, informes, envío de correo y analíticas.'],
    ['Base de datos estructurada', 'Exportación de la hoja de cálculo con sus hojas de bancos, configuraciones, resultados, rankings y analíticas.'],
    ['Bancos de contenido propios', 'Más de 650 oraciones simples analizadas, el banco de oración compuesta, los corpus morfológicos de tres niveles, cerca de 210 retos del Laboratorio y 122 retos de la Fábrica.'],
    ['Sistema de retroalimentación', 'Matrices de error específico y diccionarios base de sintaxis, morfología, sintagmas y compuestas, más las micro-lecciones y las pistas contextuales de cada módulo.'],
    ['Metodología pedagógica propia', 'Modelo de tres fases del análisis sintáctico, cuatro pasos de la oración compuesta, tres estaciones bloqueadas de los módulos nuevos, cascadas condicionales morfológicas, canon de aceptabilidad y criterios de calificación ponderada.'],
    ['Documentación de diseño', 'Documentos normativos de esquema y de canon, planes de producto de los dos módulos nuevos, criterios de ponderación, arquitectura y auditoría técnica.'],
    ['Diseño de interfaz', 'Sistema de tokens de diseño, paleta semántica de funciones sintácticas, tipografía y identidad visual propia (monograma de pluma y doble hélice).'],
  ], [30, 70]),

  h2('8.1 Historial de versiones'),
  p('Esta ampliación registra la versión 7 como versión vigente y completa de la obra. A efectos probatorios de antigüedad se deja constancia del histórico de desarrollo, con indicación de la versión inscrita originariamente:'),
  tabla([
    ['VERSIÓN', 'FECHA', 'HITO PRINCIPAL'],
    ['v1 – v2', 'Enero – febrero 2026', 'Prototipo funcional de análisis sintáctico básico. Solo frontend.'],
    ['v3 – v4', 'Febrero – marzo 2026', 'Integración con Google Apps Script y hoja de cálculo. Exámenes con PIN. Módulo morfológico básico.'],
    ['v5', 'Marzo 2026', 'Módulo de sintagmas. Módulo Arcade. Modo Proyector. Sistema de misiones.'],
    ['v6 (INSCRITA)', 'Abril 2026', 'Tres niveles morfológicos con cascadas condicionales. Motor de feedback escalonado completo. Micro-lecciones. Panel del profesor. Gamificación educativa. Versión objeto de la inscripción originaria.'],
    ['v6.1', 'Mayo – junio 2026', 'Reescritura modular de la arquitectura. Motor de oración compuesta. Informes del profesor y envío de calificaciones por correo. Rediseño del sistema de calificación.'],
    ['v6.2', 'Julio 2026', 'Modo Chispa. Morfología con ponderación por rasgos discriminantes. Examen con PIN en los módulos secundarios. Retos y reflexión metalingüística. Identidad visual propia.'],
    ['v7', 'Agosto 2026', 'El Laboratorio de Oraciones y La Fábrica de Palabras (módulos nuevos). Cuadernos independientes por profesor. Calificación verificada en servidor con vale de un solo uso. Funcionamiento sin conexión y arranque resistente. Versión objeto de esta ampliación.'],
  ], [16, 20, 64]),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 9. TITULARIDAD ─────────────────────────────────────────────────
A(
  h1('9. TITULARIDAD Y DERECHOS DE EXPLOTACIÓN'),
  p('El autor, D. José Luis Asensio Valera, declara ser titular exclusivo de todos los derechos de propiedad intelectual sobre la obra descrita en el presente documento y sobre la totalidad de las funcionalidades, el código y los contenidos didácticos que constituyen esta ampliación, en virtud del artículo 5 del Real Decreto Legislativo 1/1996, de 12 de abril, por el que se aprueba el Texto Refundido de la Ley de Propiedad Intelectual.'),
  p('La obra ha sido desarrollada íntegramente por el autor, fuera del horario laboral, con medios propios, y sin uso de recursos del centro educativo en el que presta servicio como docente. El autor no ha cedido, transmitido ni licenciado derecho alguno sobre la obra a terceros, ni ha firmado acuerdo alguno que atribuya la titularidad a otra persona física o jurídica. El hecho de que otros docentes del departamento puedan utilizar la aplicación en sus aulas mediante cuadernos independientes constituye un uso autorizado por el autor y no implica cesión ni cotitularidad de derecho alguno.'),
  p('El autor se reserva la totalidad de los derechos patrimoniales de explotación sobre la obra, incluyendo la reproducción, distribución, comunicación pública y transformación, conforme a los artículos 17 a 23 del mismo texto refundido.'),

  h2('9.1 Registros previos'),
  pMix([
    t('La obra fue inscrita en el Registro Territorial de la Propiedad Intelectual de la Región de Murcia en su versión 6, con número de asiento registral '),
    amarillo('  ______________________  '),
    t(' y fecha '),
    amarillo('  ______________________  '),
    t('. La presente solicitud tiene por objeto ampliar dicha inscripción a la versión 7 aquí documentada.'),
  ]),
  p('La obra ha sido asimismo depositada en el servicio de registro privado de obra digital Safe Creative, a efectos de prueba fehaciente adicional de la fecha de creación. Dicho depósito no sustituye al registro público, que se solicita para obtener la presunción legal de autoría del artículo 145.3 del Texto Refundido de la Ley de Propiedad Intelectual. Se hará constar en Safe Creative la nueva versión con la misma fecha que la presente solicitud.'),

  h1('10. FIRMA'),
  pMix([t('En Águilas, a '), amarillo('  ______  '), t(' de '), amarillo('  ______________  '), t(' de 2026.')], { after: 700 }),
  p('Fdo.: José Luis Asensio Valera', { bold: true, after: 60 }),
  p('DNI 23265690-V'),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── ANEXO ──────────────────────────────────────────────────────────
A(
  h1('ANEXO · RELACIÓN DE FICHEROS DE LA OBRA'),
  p('A efectos identificativos se relacionan los ficheros que componen el código fuente de esta versión del programa y los contenidos didácticos originales, cuyo contenido íntegro se aporta como material de la solicitud.'),

  h2('Interfaz y estilos'),
  bullet('index.html — documento de pantallas de la aplicación.'),
  bullet('manual-profesor.html, manual-alumno.html — manuales de uso.'),
  bullet('css/tokens.css, css/legacy.css, css/theme/new-ui.css — hojas de estilo.'),
  bullet('sw.js, manifest.json — armazón de funcionamiento sin conexión.'),

  h2('Módulos didácticos (js/modules)'),
  bullet('sint/index.js — motor de la oración simple.'),
  bullet('compuestas/index.js — motor de la oración compuesta.'),
  bullet('maestro/index.js — análisis morfológico en tres niveles.'),
  bullet('sintagmas/index.js — análisis de la estructura del sintagma.'),
  bullet('laboratorio/index.js — Laboratorio de Oraciones.'),
  bullet('fabrica/index.js — Fábrica de Palabras.'),
  bullet('chispa/index.js — identificación rápida de funciones.'),
  bullet('arcade/index.js — práctica gamificada con cuatro submodalidades.'),
  bullet('teacher/index.js e informe-excel.js — panel del profesor e informes.'),
  bullet('app.js — punto de entrada que integra todos los módulos.'),

  h2('Núcleo de servicios y datos (js/core, js/data, js/feedback, js/gamification, js/glosario)'),
  bullet('core/ — red, enrutado, perfil, almacenamiento, audio, autenticación, escapado, temporizadores y cuadernos de profesor.'),
  bullet('data/ — cascadas morfológicas, canon de aceptabilidad, repertorios de pruebas de sintaxis y de morfología, diccionarios y corpus de respaldo.'),
  bullet('feedback/ — micro-lecciones, pistas contextuales y seguimiento del error por función.'),
  bullet('gamification/ — experiencia, niveles, rachas, misiones y panel del alumno.'),
  bullet('glosario/ — glosario de términos gramaticales y etiquetado de funciones.'),

  h2('Backend (Google Apps Script)'),
  bullet('Code_v6.gs — backend principal.'),
  bullet('Compuestas.gs, Laboratorio.gs, Formacion.gs — backends de los módulos con banco propio.'),
  bullet('ChispaStats.gs — analíticas del modo Chispa.'),
  bullet('InformeExamen.gs, FormatoResultados.gs, Minigraficos.gs, TablaGrupos.gs, AnaliticaEvolutiva.gs, EvolucionAlumnos.gs, EnviarInformes.gs — informes, analíticas y envío de calificaciones.'),

  h2('Contenidos didácticos originales'),
  bullet('Banco_reflexion_metalinguistica.md — banco de ítems de reflexión metalingüística.'),
  bullet('docs/Canon_Agramaticalidad_Laboratorio.md — canon de aceptabilidad del corpus agramatical.'),
  bullet('docs/Cascada_Valores_del_SE_Laboratorio.md — diseño del ítem de investigación abierta.'),
  bullet('docs/Schema_Laboratorio_v1.0.md, docs/Schema_Formacion_v1.0.md — esquemas normativos de los bancos nuevos.'),
  bullet('docs/Laboratorio_Oraciones_Plan_Producto.md, docs/Fabrica_Palabras_Plan_Producto.md — planes de producto y especificación de los dos módulos nuevos.'),
  bullet('docs/propuesta_niveles_morfologia.md — diseño del modelo morfológico en tres niveles.'),
  bullet('docs/f9_ponderacion_morfologia.md — criterios de evaluación y calificación ponderada.'),
  bullet('docs/corpus_textos_n1_morfologia.md, docs/f8_corpus_n2n3_tokens.md — corpus morfológicos de elaboración propia.'),
  bullet('docs/TARJETAS_DIDACTICAS_CP.md — material de aula del módulo de compuestas.'),
  bullet('banco_export/ — exportación de los bancos de retos del Laboratorio y de la Fábrica y del banco de oraciones simples.'),
  bullet('Manual_Profesor_Taller_Sintaxis.docx, GUIA_SESIONES_Y_COMPARTIR.md — manuales y guías de uso.'),

  h2('Documentación técnica'),
  bullet('arquitectura.md — mapa completo de módulos, estado y backend.'),
  bullet('docs/Auditoria_Tecnica_2026-08.md — auditoría técnica de agosto de 2026 y sus dieciocho hallazgos, todos resueltos.'),
  bullet('deuda_tecnica.md, roadmap.md — deuda técnica conocida y desarrollo previsto.'),
);

// ═══════════════════════════════════════════════════════════════════
//  ENSAMBLADO DEL DOCUMENTO
// ═══════════════════════════════════════════════════════════════════
const doc = new Document({
  creator: 'José Luis Asensio Valera',
  title: 'Taller de Sintaxis v7 — Memoria de ampliación de inscripción',
  description: 'Memoria técnica y descriptiva de la ampliación de la inscripción en el Registro Territorial de la Propiedad Intelectual de la Región de Murcia',
  styles: {
    default: {
      document: { run: { font: FUENTE, size: 21, color: TINTA } },
    },
  },
  numbering: {
    config: [{
      reference: 'vinetas',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '·', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 240 } },
                   run: { font: FUENTE, size: 21, color: ACENTO } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 240 } },
                   run: { font: FUENTE, size: 21, color: ACENTO } } },
      ],
    }],
  },
  sections: [{
    properties: {
      page: {
        // Tamaño explícito: la rejilla de las tablas se calcula contra él.
        size: { width: ANCHO_PAGINA, height: 16838 },   // A4 vertical
        margin: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 180 },
          children: [new TextRun({
            text: 'Taller de Sintaxis · v7 · Memoria de ampliación de inscripción',
            font: FUENTE, size: 15, color: GRIS, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            children: ['— ', PageNumber.CURRENT, ' —'],
            font: FUENTE, size: 16, color: GRIS })],
        })],
      }),
    },
    children: cuerpo,
  }],
});

const salida = path.join(__dirname, 'Memoria_Ampliacion_Registro_PI_Taller_Sintaxis_v7.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(salida, buf);
  console.log('✔ Generado: ' + salida);
  console.log('  ' + (buf.length / 1024).toFixed(1) + ' KB · ' + cuerpo.length + ' bloques');
});
