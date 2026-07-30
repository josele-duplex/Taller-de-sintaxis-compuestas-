// Generador del documento técnico del Laboratorio de Oraciones (Word .docx)
// Se ejecuta una vez: node build-doc-laboratorio.js → Laboratorio_Oraciones_Resumen_Tecnico.docx
// Mismos helpers y paleta que build-manual.js (no duplicar estilos: si cambia uno, cambia el otro).
const path = require('path');
const fs = require('fs');

const docxPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber,
} = require(docxPath);

// ── Helpers de estilo (idénticos a build-manual.js) ───────────────
const COLOR_PRIMARIO   = '7C3AED'; // violeta
const COLOR_SECUNDARIO = '2563EB'; // azul
const COLOR_VERDE      = '16A34A';
const COLOR_ROJO       = 'DC2626';
const COLOR_GRIS       = '6B7280';
const COLOR_FONDO_TIP  = 'EFF6FF';
const COLOR_FONDO_NOTA = 'FEF3C7';
const COLOR_FONDO_CODE = 'F3F4F6';

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

function callout(text, fillColor, accent) {
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
              left:   { style: BorderStyle.SINGLE, size: 12, color: accent || COLOR_PRIMARIO },
              right:  { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [new TextRun({ text })] })],
          }),
        ],
      }),
    ],
  });
}

// Tabla genérica: la fila 0 es cabecera. widths en DXA (suman 9360).
function table(rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, idx) => new TableRow({
      tableHeader: idx === 0,
      children: r.map((cell, c) => new TableCell({
        borders,
        width: { size: widths[c], type: WidthType.DXA },
        shading: { fill: idx === 0 ? 'EDE9FE' : (idx % 2 ? 'FFFFFF' : 'F9FAFB'), type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          spacing: { after: 0, line: 260 },
          children: [new TextRun({ text: cell, bold: idx === 0 || c === 0, size: 18 })],
        })],
      })),
    })),
  });
}

// Bloque de código: tabla 1x1, monoespaciada, una línea por párrafo.
function code(lines) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: COLOR_FONDO_CODE, type: ShadingType.CLEAR },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              left:   { style: BorderStyle.SINGLE, size: 12, color: COLOR_SECUNDARIO },
              right:  { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: lines.map(l => new Paragraph({
              spacing: { after: 0, line: 240 },
              children: [new TextRun({ text: l, font: 'Consolas', size: 16 })],
            })),
          }),
        ],
      }),
    ],
  });
}

function espacio() { return p(''); }

// ══════════════════════════════════════════════════════════════════
//  CONTENIDO
// ══════════════════════════════════════════════════════════════════
const children = [];

// ── Portada ───────────────────────────────────────────────────────
children.push(new Paragraph({
  spacing: { after: 0 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '🧪 El Laboratorio de Oraciones', size: 48, bold: true, color: COLOR_PRIMARIO })],
}));
children.push(new Paragraph({
  spacing: { after: 240 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Resumen técnico: funcionamiento, arquitectura, código y plan de construcción', size: 28, color: COLOR_SECUNDARIO })],
}));
children.push(new Paragraph({
  spacing: { after: 80 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Nuevo módulo del Taller de Sintaxis · v1.0 · 30 de julio de 2026', italics: true, color: COLOR_GRIS, size: 22 })],
}));
children.push(new Paragraph({
  spacing: { after: 320 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Documento de trabajo. El plan completo vive en docs/Laboratorio_Oraciones_Plan_Producto.md', italics: true, color: COLOR_GRIS, size: 20 })],
}));

children.push(callout(
  'En una frase: los módulos actuales enseñan a ETIQUETAR oraciones; el Laboratorio enseña a MANIPULARLAS para descubrir por qué cada etiqueta es la que es. Es la antesala de Simples, no su competencia.',
  COLOR_FONDO_TIP
));
children.push(espacio());

// ── 1. QUÉ ES Y QUÉ RESUELVE ──────────────────────────────────────
children.push(h1('1. Qué es y qué problema resuelve'));
children.push(p('Hoy los cuatro módulos de la app son «etiqueta-first»: dan por hecho que el alumno ya sabe qué es un CD antes de abrirlos. Por eso el plan de integración con el aula solo deja entrar la app en las últimas sesiones de cada unidad, cuando la etiqueta ya está dada.'));
children.push(p('El Laboratorio cubre lo que falta: las fases 1-3 del método (activación, observación de un corpus y manipulación), que hoy solo ocurren en clase y en papel. Con él, la app entra en la SEGUNDA sesión de la unidad de sintaxis, no en la penúltima.'));
children.push(p('Y de propina digitaliza la parte razonada (⚓) de las pruebas de bloque: el «¿cómo lo sabes? ¿qué prueba lo demuestra?» que hasta ahora tenía que ir obligatoriamente en papel porque ningún modo lo capturaba de forma autocorregible.'));

children.push(h2('Las tres ideas que lo definen'));
children.push(bullet('La función no se define, se comporta. El CD es «lo que admite lo/la, sobrevive como sujeto en la pasiva y no acepta le». El alumno conoce el comportamiento antes que el nombre.'));
children.push(bullet('El asterisco es contenido, no castigo. Los juicios de gramaticalidad (*Los niños juega) son un tipo de ejercicio de primera clase, con su corpus y su peso en la nota. Y se evalúa el porqué, no el veredicto.'));
children.push(bullet('El Laboratorio termina donde Simples empieza. Ningún ejercicio pide un análisis completo: el cierre de cada reto es un botón que lanza Simples con esa misma oración.'));

// ── 2. FUNCIONAMIENTO ─────────────────────────────────────────────
children.push(h1('2. Cómo funciona para el alumno'));
children.push(p('La unidad de juego es el «reto»: un mini-corpus de 3 a 6 oraciones emparentadas y tres estaciones que se desbloquean EN ORDEN. Ese bloqueo es la regla del motor que traduce «la etiqueta es punto de llegada» a código: no es una recomendación al profesor, es que el botón está deshabilitado.'));
children.push(table([
  ['Estación', 'Qué hace el alumno', 'Metalenguaje'],
  ['1 · Observa 🔍', 'Cuenta los «actores» que pide el verbo (dormir 1, romper 2, regalar 3); dice qué cambia entre dos oraciones casi idénticas; señala la que no sigue el patrón.', 'Ninguno'],
  ['2 · Manipula 🔧', 'Los cinco experimentos, los juicios de gramaticalidad, los pares mínimos y el análisis inverso. Es el corazón del módulo.', 'Ninguno'],
  ['3 · Etiqueta + prueba 🏷', 'Nombra lo ya conquistado y elige la prueba que lo demuestra. Es el Banco de reflexión metalingüística jugado.', 'Todo'],
], [1900, 5560, 1900]));
children.push(espacio());

children.push(h2('Los cinco experimentos (estación 2)'));
children.push(p('Son las cinco pruebas de la NGLE que el proyecto ya tenía inventariadas, jugadas una a una. El alumno no escribe texto libre: elige el resultado entre varias opciones, y cada opción lleva su microexplicación.'));
children.push(table([
  ['Experimento', 'Qué pregunta', 'Ejemplo'],
  ['SUSTITUYE', '¿Por qué pronombre se cambia?', 'Avisaron a los bomberos → Los avisaron (no «Les avisaron»)'],
  ['SUPRIME', '¿Se rompe la oración si lo quito?', '«toda la tarde» se quita; «de política» deja el verbo cojo'],
  ['CAMBIA EL NÚMERO', '¿Qué MÁS cambia con él?', 'El alumno salió contento → Los alumnos salieron contentos'],
  ['MUEVE', '¿Puede desplazarse?', 'Ayer llegó… / …llegó ayer'],
  ['TRANSFORMA', '¿Qué pasa en pasiva?', 'El cocinero prepara el menú → El menú es preparado por el cocinero'],
], [2100, 2900, 4360]));
children.push(espacio());

children.push(p('Además de los cinco, la estación 2 tiene cuatro tipos más: el juicio de gramaticalidad (veredicto + qué se rompe), el par mínimo (dos oraciones casi iguales: ¿qué ha cambiado de función?), el análisis inverso (no se da la oración: se dan las condiciones y el alumno la construye con piezas) y el caso frontera ⚖ (zona gris donde dos análisis puntúan).'));

children.push(callout(
  'Los pares mínimos y los análisis inversos NO se escriben de cero: se importan por identificador del banco R-07 del proyecto de Lengua (58 pares de sintaxis + 16 análisis inversos, ya curados por ti y marcados por nivel). El JSON del reto guarda «fuente_id»: PM-SINT-11, AI-SINT-08…',
  COLOR_FONDO_TIP
));
children.push(espacio());

children.push(h2('Las tres marcas del corpus con errores'));
children.push(p('Esta es la decisión más delicada del módulo y por eso está cerrada por escrito. Hay tres cosas distintas que NO se juegan igual:'));
children.push(table([
  ['Marca', 'Qué es', 'Cómo se juega'],
  ['✗ con asterisco', 'Error de comprensión gramatical: concordancia, régimen, función, transitividad. Ningún hablante lo dice.', 'Material central: se pide veredicto Y causa.'],
  ['⚠ sin asterisco', 'Error de norma culta: queísmo, dequeísmo, leísmo, laísmo. Se dice, pero no en registro formal.', 'Ejercicio aparte: se pregunta en qué situación no vale, no si «está mal».'],
  ['⚖ zona gris', 'Dos análisis posibles (La mayoría de los alumnos llegó / llegaron).', 'Puntúan las dos respuestas si la justificación es coherente. Fuera del examen.'],
], [2000, 3800, 3560]));
children.push(espacio());
children.push(pMix([
  new TextRun({ text: 'Queda fuera del corpus por completo: ', bold: true }),
  new TextRun({ text: 'la incorrección de origen social (haiga, cocretas), la ortografía, el léxico y los rasgos dialectales, incluidos los de la Región. El marco teórico manda tratar eso como variación social, no como material de análisis. Un asterisco sobre el habla de casa de un alumno de 2.º ESO cuesta más de lo que enseña.' }),
]));

children.push(h2('Cuatro reglas de pantalla, no negociables'));
children.push(step('El asterisco lo pinta la interfaz, no el dato: el JSON guarda la oración limpia.'));
children.push(step('Nunca una oración agramatical sola en pantalla: siempre junto a su gemela correcta. Una pantalla con solo el error acaba enseñando el error.'));
children.push(step('Al menos un ejercicio correcto por cada tres juicios: si todo está mal, el alumno contesta «mal» sin mirar.'));
children.push(step('Uno o dos juicios por reto; cuatro a seis por bloque de evaluación. El límite superior existe para que esto no se convierta en un test de corrección.'));

children.push(h2('Niveles'));
children.push(p('Se reutiliza la convención que ya usa la app (basico / medio / avanzado ↔ Aprendiz / ESO34 / Maestro) y el alcance de cada nivel es el de la unidad real del curso.'));
children.push(table([
  ['Nivel', 'Curso', 'Funciones en juego', 'Errores que se juegan'],
  ['basico', '2.º ESO', 'Sujeto, CD, CI, CC, NP. Sin pasiva.', 'Concordancia, transitividad, orden'],
  ['medio', '3.º-4.º ESO', '+ C.Rég., Atr., Atr. Loc., CPvo, C.Ag., CC con subtipo, Vocat., PN/PV', '+ régimen, pronombre cruzado, selección semántica; primer ⚠'],
  ['avanzado', '1.º BACH', '+ Marca.Pas.Ref., Marca.Imp., Marca.Pron., Dativo, Mod.Or. y periféricos', 'Todo, incluidos ⚠ de norma culta y ⚖ de zona gris'],
], [1300, 1500, 3480, 3080]));
children.push(espacio());
children.push(p('En basico no aparece ni una etiqueta: la estación 3 usa siempre la variante simplificada («¿cuál de estos cambios funciona?»), que es justo la que el Banco de reflexión dejaba anotada como pendiente de implementar.'));
children.push(pMix([
  new TextRun({ text: 'El ejercicio estrella del nivel avanzado son los valores de «se» ', bold: true }),
  new TextRun({ text: 'jugados como investigación: se sirve un corpus de 12-20 oraciones y el alumno las clasifica por comportamiento (¿concuerda el verbo con el elemento pospuesto? ¿se puede quitar el se? ¿hay pasiva equivalente?) antes de recibir los nombres. Es la pieza de mayor rendimiento EBAU del módulo.' }),
]));

children.push(h2('Modo examen'));
children.push(bullet('Solo estaciones 2 y 3 (la 1 es de aprendizaje).'));
children.push(bullet('Curva dura de examen 100/40/10/0, la misma del rediseño de calificación, frente a la de práctica 100/50/25/0.'));
children.push(bullet('El veredicto sin la causa no vale el ejercicio: acertar «suena mal» pero fallar QUÉ se rompe cae al tramo del 40 %. Es la traducción a nota de «se evalúa la justificación, no el acierto».'));
children.push(bullet('Los ejercicios de frontera pesan doble (Atr./CPvo, C.Rég./CC, CI/CC Finalidad, C.Ag./CC Causa, Marca.Pas.Ref./Marca.Imp.), igual que la ponderación F9 de morfología.'));
children.push(bullet('Sin pistas ni feedback hasta el final, orden aleatorio por alumno, captura de errores por categoría, anti-duplicado en el guardado.'));
children.push(bullet('Los ejercicios de zona gris ⚖ NO entran en el examen: un ejercicio con dos respuestas válidas es indefendible ante una reclamación.'));

// ── 3. ARQUITECTURA ───────────────────────────────────────────────
children.push(h1('3. Arquitectura: dónde vive cada cosa'));
children.push(p('Se respetan las reglas del proyecto: sin frameworks, sin bundler, sin TypeScript; módulos ES; window.X para los onclick; una pantalla más en index.html.'));

children.push(h2('Archivos nuevos (todo lo demás se reutiliza)'));
children.push(table([
  ['Archivo', 'Qué contiene'],
  ['js/modules/laboratorio/index.js', 'El motor: las tres estaciones, el bloqueo en orden, la corrección de cada tipo de ejercicio, el envío de analíticas.'],
  ['js/data/pruebas-sintaxis.js', 'Las 10 funciones del Banco de reflexión convertidas en datos: prueba correcta, distractores, microexplicaciones e identificadores estables (PRU-SINT-CI-01…).'],
  ['js/feedback/micro-lecciones-lab.js', 'Los textos de pista y de refuerzo del módulo.'],
  ['screen-laboratorio (en index.html)', 'La pantalla, registrada en showScreen() como las demás.'],
  ['scripts/validar-banco.mjs (modo nuevo)', 'No es un archivo nuevo: se le añade el modo «laboratorio» al validador que ya existe.'],
  ['server/Laboratorio.gs', 'Los endpoints del backend (ver §5).'],
], [3400, 5960]));
children.push(espacio());

children.push(h2('Qué se reutiliza tal cual'));
children.push(p('Esto es lo que hace el módulo barato: alrededor del 80 % ya está escrito y probado en la app.'));
children.push(table([
  ['Lo que hace falta', 'Ya existe en'],
  ['Arrastrar piezas a huecos', 'el motor iidd* de compuestas (se extrae el patrón, no se importa el módulo)'],
  ['Cascada de decisión (valores de se)', 'las cascadas de Maestro'],
  ['Distractores con reglas duras («para» nunca CI)', 'GrammarRules.filterTraps en js/modules/sint/index.js'],
  ['Etiquetas y colores de función', 'FUNC_ORAC y funcTagCss en js/glosario/tags.js'],
  ['Login, perfil, grupo obligatorio', 'core/profile.js y handleStartAll'],
  ['XP, rachas, misiones, ZDP', 'js/gamification/*'],
  ['Examen con PIN', 'el patrón de Simples y Compuestas en Code_v6.gs'],
  ['Analíticas silenciosas', 'el patrón de Chispa y Sintagmas (sendBeacon)'],
  ['Errores por categoría → informe', 'js/feedback/tracking.js e informe-excel.js'],
  ['Puente de vuelta desde Simples', 'taller_error_history en localStorage (ya cuenta los fallos por función)'],
], [4200, 5160]));
children.push(espacio());
children.push(p('Lo genuinamente nuevo son tres cosas: el esquema de datos, el motor de estaciones y el banco de pruebas de sintaxis. Nada más.'));

children.push(h2('Dónde vive en la app: card propia, con puente en los dos sentidos'));
children.push(bullet('Card propia en portada (pantalla screen-laboratorio), no una fase dentro de Simples. Motivo: el motor de Simples es uno de los dos grandes y su máquina de estados tiene contratos vivos con las subfases y el examen; meterle una estación previa es tocar justo lo que las reglas del proyecto dicen no tocar a la ligera. Además el Laboratorio se usa en sesiones donde Simples aún no tiene sentido.'));
children.push(bullet('Puente de ida: al acabar cada reto, botón «🔎 Analiza esta oración entera en Simples», que abre Simples con esa oración ya cargada.'));
children.push(bullet('Puente de vuelta: cuando un alumno falla tres veces la misma función en Simples, el feedback le ofrece «🧪 Practica esta función en el Laboratorio».'));
children.push(bullet('Portada: agrupar las tres cards de oración en un bloque «Oraciones» (Laboratorio · Simples · Compuestas). Decisión tuya.'));

// ── 4. EL CÓDIGO: DATOS ───────────────────────────────────────────
children.push(h1('4. El código (1): el esquema de datos'));
children.push(p('Decisión: hoja NUEVA en el Sheet, llamada Laboratorio_Banco, no una ampliación de Oraciones_Banco. Tres motivos:'));
children.push(bullet('La forma del dato es distinta: Oraciones_Banco es una fila por oración; aquí una fila es un reto entero, con su corpus y sus varios ejercicios.'));
children.push(bullet('Ampliar obligaría a añadir columnas vacías a las ~450 filas existentes y a tocar el motor de Simples, que lee esa hoja en producción.'));
children.push(bullet('Compuestas_Banco ya sentó el precedente: una hoja por módulo.'));
children.push(pMix([
  new TextRun({ text: 'Pero el solucionario sí se reutiliza: ', bold: true }),
  new TextRun({ text: 'el campo metadatos.origen_oracion_id apunta a una fila de Oraciones_Banco, así que el reto hereda el análisis ya validado (la app YA sabe qué es CD en esa oración, luego puede comprobar la sustitución esperada) y el puente a Simples es un salto directo, no una búsqueda por texto.' }),
]));
children.push(p('Columnas de la hoja: ID · Nivel · Curso_Min · Titulo_Problema · Funciones · Tipos_Item · JSON_Reto · Fuente · Zona_Gris · Activo. Se leen siempre POR NOMBRE (getColMap_), nunca por letra.'));

children.push(h2('Esquema «laboratorio v1.0» (contenido de la columna JSON_Reto)'));
children.push(p('Ejemplo real y completo de un reto de nivel medio (recortado a cuatro de sus seis ejercicios para que quepa):', { italics: true, color: COLOR_GRIS }));
children.push(code([
  '{',
  '  "schema_version": "1.0",',
  '  "id": "LB_0042",',
  '  "nivel": "medio",',
  '  "titulo_problema": "¿Por qué aquí funciona \'le\' y no \'lo\'?",',
  '  "corpus": [',
  '    "Entregó un ramo a su profesora.",',
  '    "Entregó un ramo para su profesora."',
  '  ],',
  '  "items": [',
  '    { "tipo": "valencia", "verbo": "entregar", "respuesta": 3,',
  '      "feedback": "Entregar pide tres: quien entrega, lo entregado y quien lo recibe." },',
  '',
  '    { "tipo": "manipulacion", "manipulacion": "sustituye",',
  '      "oracion": "Entregó un ramo a su profesora.",',
  '      "objetivo": { "texto": "a su profesora", "funcion": "CI" },',
  '      "opciones": [',
  '        { "texto": "Le entregó un ramo.", "ok": true,',
  '          "micro": "El pronombre que le corresponde es \'le\': es CI." },',
  '        { "texto": "La entregó un ramo.", "ok": false,',
  '          "micro": "\'La\' es el pronombre del CD; aquí el CD es \'un ramo\'." }',
  '      ] },',
  '',
  '    { "tipo": "juicio", "oracion": "María la escribió una carta a Juan.",',
  '      "veredicto": "agramatical", "marca": "agramatical",',
  '      "causa": "pronombre_cruzado",',
  '      "opciones_causa": ["pronombre_cruzado","concordancia_sv","regimen_prep"],',
  '      "gemela_correcta": "María le escribió una carta a Juan.",',
  '      "explicacion": "Cada función tiene su pronombre: \'a Juan\' es CI.",',
  '      "fuente_id": "PM-SINT-35" },',
  '',
  '    { "tipo": "etiqueta_prueba", "oracion": "Entregó un ramo a su profesora.",',
  '      "objetivo": { "texto": "a su profesora", "funcion": "CI" },',
  '      "prueba_id": "PRU-SINT-CI-01",',
  '      "distractores": ["PRU-SINT-CD-01","HEUR-PARA-QUIEN","HEUR-PREP-A"] }',
  '  ],',
  '  "zona_gris": false,',
  '  "metadatos": {',
  '    "origen_oracion_id": "OR_0117",',
  '    "origen_ud": "UD-D-3E-sint S3",',
  '    "curso_min": "3E"',
  '  }',
  '}',
]));
children.push(espacio());

children.push(h2('Las tres decisiones de diseño que importan en este esquema'));
children.push(bulletMix([
  new TextRun({ text: 'El objetivo se señala por TEXTO, no por número de palabra. ', bold: true }),
  new TextRun({ text: '"objetivo": { "texto": "a su profesora" } y el validador comprueba que ese texto aparece exactamente una vez en la oración. Es lo que hace el esquema escribible a mano por un filólogo: contar palabras es donde se cometen los errores silenciosos, y ya hay 55 identificadores desincronizados en el banco de compuestas por esa clase de fragilidad.' }),
]));
children.push(bulletMix([
  new TextRun({ text: 'Listas cerradas para todo. ', bold: true }),
  new TextRun({ text: '«manipulacion» solo puede ser sustituye / suprime / cambia_numero / mueve / transforma; «funcion» solo puede ser una de las de FUNC_ORAC en js/glosario/tags.js (única fuente de verdad, la que ya usa el validador actual); «causa» solo una de las 16 de la tabla de causas; «marca» solo agramatical / norma_culta / zona_gris. Si te equivocas escribiendo, el validador lo caza antes de que lo vea un alumno.' }),
]));
children.push(bulletMix([
  new TextRun({ text: 'Las pruebas se anclan por repertorio, no por oración. ', bold: true }),
  new TextRun({ text: '«prueba_id» apunta a js/data/pruebas-sintaxis.js: una entrada por función, reutilizada en cualquier oración que la tenga. Coste de contenido por reto: cero. Esta decisión ya estaba tomada en el Banco de reflexión y aquí solo se ejecuta.' }),
]));

children.push(h2('El validador'));
children.push(p('La semilla hablaba de «un validador Python gemelo», pero conviene aclararlo: en este repositorio no hay ningún validador de bancos en Python. El que existe y funciona es scripts/validar-banco.mjs (Node, sin dependencias, con sus listas cerradas ya sincronizadas con tags.js). Así que no se escribe uno nuevo: se le añade un modo.'));
children.push(code([
  'node scripts/validar-banco.mjs laboratorio banco_export/Laboratorio_Banco.tsv',
]));
children.push(espacio());
children.push(p('Comprueba, distinguiendo ❌ ERROR (el motor no lo entiende) de ⚠ AVISO (sospechoso pero no rompe):'));
children.push(bullet('El JSON se puede leer y la versión de esquema es conocida.'));
children.push(bullet('objetivo.texto aparece, y aparece una sola vez, en su oración.'));
children.push(bullet('Funciones y causas están en la lista cerrada, y la causa es compatible con el nivel del reto.'));
children.push(bullet('prueba_id y sus distractores existen en pruebas-sintaxis.js.'));
children.push(bullet('Hay exactamente una opción correcta por ejercicio cerrado, y toda opción tiene su microexplicación.'));
children.push(bullet('Todo juicio con asterisco tiene su gemela correcta, y hay al menos un control gramatical en los retos con tres o más juicios.'));
children.push(bullet('Los huecos del análisis inverso están cubiertos por las piezas que se ofrecen.'));
children.push(bullet('fuente_id tiene el formato PM-SINT-## o AI-SINT-##.'));

children.push(callout(
  'Tú validas el contenido; el validador valida el formato. Los ~30 retos del lote semilla te llegan ya pasados por el validador, así que en tu sesión de revisión solo juzgas lingüística, no comas ni corchetes.',
  COLOR_FONDO_TIP
));
children.push(espacio());

// ── 5. EL CÓDIGO: BACKEND ─────────────────────────────────────────
children.push(h1('5. El código (2): el backend en Apps Script'));
children.push(table([
  ['Endpoint / hoja', 'Para qué'],
  ['getRetosLaboratorio (GET)', 'Sirve los retos filtrando por nivel, curso o función.'],
  ['createExamLaboratorio_ / getExamConfigLaboratorio_', 'Crear y leer el examen con PIN, igual que en Simples y Compuestas.'],
  ['saveLaboratorioResult_ → hoja Laboratorio_Resultados', 'Solo resultados de examen con PIN (la separación que ya se hizo en compuestas).'],
  ['saveSesionLaboratorio_ → hoja Laboratorio_Practica_Log', 'Práctica libre, por sendBeacon: analíticas silenciosas.'],
  ['Columnas Reflexion, Caja_Pruebas_JSON, Errores_Categoria_JSON', 'Diario metalingüístico, caja de pruebas del alumno y errores por categoría.'],
], [4200, 5160]));
children.push(espacio());

children.push(callout(
  '⚠ Al desplegar: SIEMPRE «Nueva versión» de la implementación existente (Implementar → Gestionar implementaciones → lápiz → Nueva versión). Nunca «Nueva implementación»: genera otra URL y rompe la app en producción. Y todo endpoint que use sendBeacon hay que verificarlo DESPUÉS del redespliegue, no antes: el bug que se tragó en silencio las analíticas de Chispa durante semanas era exactamente eso.',
  COLOR_FONDO_NOTA, COLOR_ROJO
));
children.push(espacio());

children.push(h2('Un eje nuevo en el informe que casi no cuesta'));
children.push(p('Los errores del Laboratorio se clasifican por MANIPULACIÓN fallada (sustituye / suprime / cambia_numero / mueve / transforma), no solo por función. Eso te responde una pregunta que hoy no puedes hacerle a la app: no «qué función falla mi grupo» (eso ya lo sabes), sino «qué PRUEBA no sabe aplicar». Se añade como sección de la hoja Diagnóstico que ya existe, sin panel nuevo.'));

children.push(h2('Las tres piezas de acompañamiento'));
children.push(bullet('Caja de Pruebas del Detective: tabla personal que se rellena sola; cada prueba conquistada añade su fila con el ejemplo del propio alumno. Es la carta de estudio de la unidad, generada por el uso en vez de fotocopiada. El nombre ya existe en tu aula (etapa 7 de la hoja de ruta de 3.º ESO).'));
children.push(bullet('Cazador de contraejemplos: el alumno construye por piezas una pareja mínima propia (una oración correcta y su gemela que rompe algo) y declara qué se rompe. La app valida los huecos y la coherencia; el ingenio no puntúa, se expone en su Cuaderno de Campo. Es literalmente «la búsqueda de contraejemplos» del criterio LOMLOE 9.2.'));
children.push(bullet('Diario metalingüístico: «Antes pensaba que…, ahora he descubierto que…, y lo sé porque…». Reutiliza la columna Reflexion que ya existe y ya viaja a tu informe.'));

// ── 6. FASES Y MODELO ─────────────────────────────────────────────
children.push(h1('6. Fases de construcción y qué modelo de Claude usar en cada una'));
children.push(p('El criterio no es «esta fase es de Opus y esa de Sonnet», sino QUÉ DECISIÓN se toma en esa sesión concreta:'));
children.push(bulletMix([
  new TextRun({ text: 'Opus 5 ', bold: true, color: COLOR_PRIMARIO }),
  new TextRun({ text: 'cuando una decisión mal tomada se paga todo el curso: el esquema de datos, el canon lingüístico, el corpus con errores, la clasificación de los valores de «se». Piensa más y cuesta más, pero se hace UNA vez y lo demás se apoya en ella.' }),
]));
children.push(bulletMix([
  new TextRun({ text: 'Sonnet 5 ', bold: true, color: COLOR_VERDE }),
  new TextRun({ text: 'cuando el diseño ya está cerrado y lo que queda es ejecutar sobre patrones que ya existen en el repositorio: pantallas, endpoints, arrastrar y soltar, generar un lote de contenido siguiendo un canon ya fijado.' }),
]));
children.push(p('Total estimado: 14-16 sesiones de trabajo, de las cuales 3 son de Opus 5.', { bold: true }));
children.push(espacio());

children.push(table([
  ['Fase · sesión', 'Qué se construye', 'Modelo', 'Por qué ese modelo'],
  ['F0 · 1', 'Esquema «laboratorio v1.0» completo (tipos de ejercicio, listas cerradas, referencia por texto, origen_oracion_id) + modo «laboratorio» del validador.', 'Opus 5', 'Es la arquitectura de datos de todo el módulo: si el esquema queda cojo, se repaga en cada lote posterior. Mismo criterio con el que se fijó el esquema 1.2 de compuestas.'],
  ['F0 · 2', 'Hoja Laboratorio_Banco en el Sheet + endpoint getRetosLaboratorio.', 'Sonnet 5', 'Copia directa de getOraciones y getOracionesCompuestas. Cero decisiones nuevas.'],
  ['F0 · 3', 'Lote semilla de nivel medio: ~30 retos, importando los pares mínimos y análisis inversos de nivel [3E].', 'Sonnet 5', 'Contenido sobre un canon ya fijado. El filtro de calidad eres tú, no el modelo: tú validas el lote entero antes de publicar.'],
  ['F1 · 1-4', 'El motor de las estaciones 1-2: pantalla, bloqueo en orden, los cinco experimentos, juicios, pares mínimos, análisis inverso por huecos, XP y analíticas.', 'Sonnet 5', 'Reutiliza iidd*, filterTraps, la gamificación y sendBeacon. Es la fase más larga y la que menos decide.'],
  ['F2 · 1', 'js/data/pruebas-sintaxis.js (las 10 funciones con identificadores, distractores, microexplicaciones y variante simplificada de 1.º-2.º ESO) + el canon del corpus con errores: qué es ✗, qué ⚠ y qué ⚖.', 'Opus 5', 'Contenido pedagógico de precisión: un distractor mal razonado ENSEÑA un error. Y la frontera entre agramatical y norma culta es la decisión más delicada del módulo.'],
  ['F2 · 2-3', 'Estación 3 (etiqueta + prueba, con su variante simplificada), Caja de Pruebas, diario, los dos puentes con Simples.', 'Sonnet 5', 'Interfaz sobre un banco de pruebas ya cerrado en la sesión anterior.'],
  ['F3 · 1-2', 'Examen con PIN, hoja Laboratorio_Resultados, eje «prueba fallada» en la hoja Diagnóstico.', 'Sonnet 5', 'Copia del patrón ya implementado y probado en Simples y Compuestas.'],
  ['F4 · 1', 'Lote de nivel basico: ~25 retos de 2.º ESO, sin una sola etiqueta.', 'Sonnet 5', 'Contenido sobre canon ya fijado, igual que F0·3.'],
  ['F4 · 2', 'Cazador de contraejemplos + Cuaderno de Campo + misiones.', 'Sonnet 5', 'Mecánica nueva pero de bajo riesgo: la validación es por huecos y causa declarada, no editorial.'],
  ['F5 · 1', 'Los valores de «se» como investigación (corpus, criterios, cascada) + los ejercicios de zona gris + periféricos y Mod.Or.', 'Opus 5', 'El ejercicio más delicado y el de mayor rendimiento EBAU; decidir qué se acepta en la zona gris y por qué no se puede delegar.'],
  ['F5 · 2-3', 'Lote de nivel avanzado + implementación de la cascada de «se».', 'Sonnet 5', 'Ejecución sobre reglas ya fijadas en la sesión anterior.'],
], [1100, 3700, 900, 3660]));
children.push(espacio());

children.push(callout(
  'Cómo usar esta tabla en la práctica: al abrir cada sesión, cambia el modelo ANTES de empezar y dime en qué fase y sesión estamos («vamos con F2 sesión 1»). Si una sesión de Sonnet se topa con una decisión de canon que no estaba prevista, lo suyo es pararla y abrir esa decisión en una sesión de Opus, no resolverla de paso.',
  COLOR_FONDO_TIP
));
children.push(espacio());

children.push(h2('Calendario contra el curso 2026-27'));
children.push(p('La sintaxis de 2.º, 3.º y 1.º BACH cae en la 2.ª evaluación, así que hay más margen que con la Fábrica. Pero los lotes de exámenes de simples (nov.-dic.) y la deuda del banco de compuestas más la auditoría de «construcción» (ene.-feb.) MANDAN si hay conflicto.'));
children.push(table([
  ['Cuándo', 'Qué', 'Encaje de aula'],
  ['Nov.-dic. 2026', 'F0 (3 sesiones)', 'El lote semilla usa el mismo flujo docente→JSON que los lotes de examen de diciembre: se hacen en la misma tacada, no compiten.'],
  ['Dic. 2026 - ene. 2027', 'F1', 'El motor no toca Simples ni Compuestas: puede avanzar en paralelo a la deuda del banco CP.'],
  ['Ene. 2027', 'F2', '3.º ESO empieza su unidad de sintaxis: el Laboratorio entra en sus sesiones 2-3, con las tres estaciones y sin nota.'],
  ['Feb. 2027', 'F3', 'Examen listo para la prueba de bloque de sintaxis de 3.º, que ya está en la programación. Absorbe la parte razonada ⚓.'],
  ['Marzo 2027', 'F4', '2.º ESO llega a «La escena del verbo»: el nivel basico estrena a tiempo.'],
  ['Abril-mayo 2027', 'F5', '1.º BACH en la 3.ª evaluación; los valores de «se» como preparación EBAU.'],
], [1900, 900, 6560]));
children.push(espacio());
children.push(p('Si hay conflicto de tiempo, el Laboratorio se pausa tras F1. Consecuencia concreta y aceptable: 3.º ESO usaría solo las estaciones 1-2, sin estación 3 ni examen. Sigue siendo la antesala útil de su unidad, simplemente sin nota y con la parte razonada todavía en papel.'));

// ── 7. CÓMO TRABAJAR SIN ROMPER ───────────────────────────────────
children.push(h1('7. Cómo construir sin tocar lo que ya funciona'));
children.push(p('La intuición es buena: hay que poder construir el módulo nuevo sin poner en riesgo una app que ya usan alumnos. Pero la herramienta para eso no es duplicar la carpeta, es una RAMA de git. Duplicar crea dos copias que empiezan iguales y se separan un poco cada día; la rama crea una línea de trabajo paralela dentro del mismo proyecto, y se une cuando está lista.'));
children.push(table([
  ['', 'Duplicar la carpeta', 'Rama de git (recomendado)'],
  ['Si arreglas un fallo en la app', 'lo arreglas dos veces, o te olvidas de una', 'se arregla una vez y la rama lo recibe'],
  ['El backend (Sheet + Apps Script)', 'es UNO y compartido: las dos copias escriben en el mismo sitio', 'igual, pero con una hoja nueva propia: sin colisión'],
  ['GitHub Pages', 'un repositorio nuevo = otra dirección web que mantener', 'la dirección de siempre; la rama no se publica hasta que quieras'],
  ['Volver atrás', 'borrando carpetas a mano', 'un comando, y el historial queda'],
  ['Ver qué has cambiado', 'imposible: son dos árboles distintos', 'git diff te lo dice exactamente'],
], [2400, 3480, 3480]));
children.push(espacio());
children.push(pMix([
  new TextRun({ text: 'Y hay un detalle que decide la cuestión: ', bold: true }),
  new TextRun({ text: 'el backend es único. El Google Sheet y la implementación de Apps Script son los mismos para las dos copias, así que duplicar la carpeta NO aísla el riesgo donde de verdad está (un redespliegue mal hecho rompe la app en producción, vengas de la copia o del original). Lo que sí aísla ese riesgo es que el Laboratorio use hojas propias y endpoints propios, que es exactamente lo que hace el plan.' }),
]));
children.push(p('Además, el módulo está diseñado para no tocar los motores existentes: archivos nuevos, pantalla nueva, hojas nuevas. Los dos únicos puntos de contacto son una card en la portada y el botón de puente en el feedback de Simples. El riesgo real es bajo, y la rama lo cubre de sobra.'));
children.push(p('El flujo, en tres comandos:'));
children.push(code([
  'git checkout -b laboratorio       # crear la rama y entrar en ella',
  'git checkout main                 # volver a la app estable cuando quieras',
  'git merge laboratorio             # unir el trabajo cuando esté listo',
]));
children.push(espacio());
children.push(callout(
  'Si aun así prefieres la copia de carpeta porque te da tranquilidad verla aparte, se puede hacer: se llama «fork» y es una práctica legítima. Pero entonces conviene fijar desde el principio la fecha en la que las dos ramas se vuelven a juntar, porque una copia que vive separada seis meses no se reintegra: se reescribe.',
  COLOR_FONDO_NOTA
));
children.push(espacio());

// ── 8. DECISIONES PENDIENTES ──────────────────────────────────────
children.push(h1('8. Lo que está pendiente de tu decisión'));
children.push(table([
  ['Decisión', 'Propuesta'],
  ['Canon de aceptabilidad: qué «suena raro» cuenta como agramatical', 'Las tres marcas del §2 y las 16 causas. Tú cierras la lista y su nivel mínimo en la sesión de Opus de F2.'],
  ['Validación del lote semilla', 'Los ~30 retos de nivel medio, revisados enteros antes de publicar. Una sesión tuya, solo contenido.'],
  ['Colisión de portada', 'Agrupar en un bloque «Oraciones». Alternativa: card de temporada, visible solo mientras la unidad está en curso.'],
  ['¿Se suelta el papel de la parte razonada ⚓?', 'Mantener UNA pregunta en papel el primer curso y comparar con el examen del Laboratorio. Si correlacionan, se retira en 2027-28.'],
  ['Alcance', 'Catálogo de ejercicios cerrado. Si un ejercicio necesita analizar la oración entera, es de Simples.'],
  ['Prioridad', 'La Fábrica va delante (su unidad es de la 1.ª evaluación). El Laboratorio arranca cuando la Fábrica llega a F3.'],
], [3400, 5960]));
children.push(espacio());

children.push(callout(
  'Recordatorio de todas las sesiones: sigue pendiente el exportador de notas a iDoceo, esperando tu plantilla de ponderación (prevista para finales de septiembre de 2026).',
  COLOR_FONDO_NOTA
));

// ── DOCUMENTO ─────────────────────────────────────────────────────
const doc = new Document({
  creator: 'Taller de Sintaxis',
  title: 'El Laboratorio de Oraciones — resumen técnico',
  description: 'Funcionamiento, arquitectura, código y plan de construcción por fases del nuevo módulo Laboratorio de Oraciones.',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Calibri', color: COLOR_PRIMARIO },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: 'Calibri', color: COLOR_SECUNDARIO },
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
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'El Laboratorio de Oraciones — resumen técnico v1.0  ·  Página ', size: 18, color: COLOR_GRIS }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLOR_GRIS }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = 'Laboratorio_Oraciones_Resumen_Tecnico.docx';
  fs.writeFileSync(out, buf);
  console.log('OK:', out, '(' + buf.length + ' bytes)');
});
