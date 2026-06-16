// ════════════════════════════════════════════════════════════════════════
//  FormatoResultados.gs — Colorear filas de resultados por nota (Mejora 1)
//  ----------------------------------------------------------------------
//  Aplica la escala pedagógica de 4 colores a las celdas "Nombre" y "Nota"
//  de Alumnos_Resultados y Compuestas_Resultados, para revisar la hoja de un
//  vistazo (coherente con la escala del informe Excel del profesor).
//
//  MEJORA respecto al prompt original: localiza las columnas POR NOMBRE con
//  getColMap_ (no por letra). El documento daba letras desfasadas — p.ej. en
//  Compuestas_Resultados la Nota NO es la columna G sino la J — así que pintar
//  por letra habría coloreado columnas equivocadas. Por nombre es inmune a
//  cambios de orden de columnas.
//
//  DISPARO: se ejecuta DESDE EL MENÚ. No se usa onEdit porque las filas las
//  añade la app web (escritura programática) y onEdit solo salta con ediciones
//  manuales en la interfaz. Si se quisiera automático, habría que llamar a
//  colorearHojaResultados_ al final de saveResult_/saveResultadoCompuesta_ o
//  usar un trigger temporal.
// ════════════════════════════════════════════════════════════════════════

// Escala de 4 colores. 0-4.9 rojo · 5-6.9 amarillo · 7-8.9 verde · 9-10 azul.
// Las filas sin nota válida se dejan en blanco.
function _colorNota_(n) {
  if (n === '' || n === null || n === undefined || isNaN(n)) return { bg: '#FFFFFF', fg: '#000000' };
  const v = Number(n);
  if (v >= 9) return { bg: '#1F3864', fg: '#FFFFFF' };   // azul oscuro · texto blanco
  if (v >= 7) return { bg: '#D9EAD3', fg: '#274E13' };   // verde pastel · verde oscuro
  if (v >= 5) return { bg: '#FFF2CC', fg: '#7D6608' };   // amarillo pastel · marrón
  return        { bg: '#FFCCCC', fg: '#990000' };        // rojo pastel · rojo oscuro
}

// Colorea las celdas Nombre + Nota de una hoja. Devuelve el nº de filas tratadas.
function colorearHojaResultados_(nombreHoja) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) return 0;                       // hoja inexistente: nada que hacer
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;                  // solo cabecera o vacía

  const col = getColMap_(sheet);
  const cNota   = col['Nota'];
  const cNombre = col['Nombre'];
  if (cNota === undefined) return 0;          // sin columna Nota no hay qué colorear

  const n = lastRow - 1;                      // filas de datos (sin cabecera)
  // Leemos SOLO la columna Nota (lectura única, eficiente con cientos de filas).
  const notas = sheet.getRange(2, cNota + 1, n, 1).getValues();

  const bg = [], fg = [];
  for (let i = 0; i < n; i++) {
    const c = _colorNota_(notas[i][0]);
    bg.push([c.bg]);
    fg.push([c.fg]);
  }

  // Escritura en lote: una llamada de fondo + una de color por columna.
  sheet.getRange(2, cNota + 1, n, 1).setBackgrounds(bg).setFontColors(fg);
  if (cNombre !== undefined) {
    sheet.getRange(2, cNombre + 1, n, 1).setBackgrounds(bg).setFontColors(fg);
  }
  return n;
}

// Punto de entrada del menú: colorea ambas hojas de resultados.
function aplicarFormatoCondicionalNotas() {
  const ui = SpreadsheetApp.getUi();
  const hojaSimples    = (typeof SHEET_RESULTS !== 'undefined') ? SHEET_RESULTS : 'Alumnos_Resultados';
  const hojaCompuestas = (typeof SHEET_COMPUESTAS_RESULTADOS !== 'undefined') ? SHEET_COMPUESTAS_RESULTADOS : 'Compuestas_Resultados';
  const a = colorearHojaResultados_(hojaSimples);
  const c = colorearHojaResultados_(hojaCompuestas);
  ui.alert('🎨 Notas coloreadas',
    'Filas coloreadas por su nota (Nombre + Nota):\n' +
    '  • ' + hojaSimples + ': ' + a + '\n' +
    '  • ' + hojaCompuestas + ': ' + c,
    ui.ButtonSet.OK);
}
