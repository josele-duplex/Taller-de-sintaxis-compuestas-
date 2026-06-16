// ════════════════════════════════════════════════════════════════════════
//  Minigraficos.gs — SPARKLINE en el Panel del Profesor (Mejora 2)
//  ----------------------------------------------------------------------
//  Añade 3 minigráficos al final del 📊 Panel_Profesor:
//    · Funciones más falladas (simples)      — barras rojas
//    · Tipos de error (compuestas, práctica)  — barras naranjas
//    · Evolución de la nota media por examen  — línea azul
//
//  Se invoca desde crearDashboard_ (Code_v6.gs) ANTES de fijar anchos, para
//  que los SPARKLINE se reescriban en cada "Actualizar Panel" (el panel se
//  reconstruye con sheet.clear(), así que no pueden quedarse sueltos).
//
//  MEJORA respecto al prompt original: las fórmulas SPARKLINE/QUERY se generan
//  con las columnas REALES resueltas por getColMap_ (no con las letras del
//  documento, que estaban desfasadas). Las sumas auxiliares y la QUERY de
//  apoyo se escriben junto a cada gráfico (sumas en C–H; QUERY de la evolución
//  en J–K) para que los datos sean transparentes.
// ════════════════════════════════════════════════════════════════════════

// Convierte un índice de columna base-0 (el que da getColMap_) en su letra A1.
function _colLetter_(i0) {
  let n = i0 + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// Pinta el bloque de minigráficos al final de la hoja del panel.
function agregarMinigraficos_(sheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let r = sheet.getLastRow() + 3;

  // Cabecera de la sección
  sheet.getRange(r, 1).setValue('📉 MINIGRÁFICOS (tendencias)')
    .setFontWeight('bold').setFontSize(12).setBackground('#e7f0f7');
  sheet.getRange(r, 1, 1, 6).merge();
  r += 2;

  const hojaSimples = (typeof SHEET_RESULTS !== 'undefined') ? SHEET_RESULTS : 'Alumnos_Resultados';
  const hojaPract   = (typeof SHEET_COMPUESTAS_PRACTICA_LOG !== 'undefined') ? SHEET_COMPUESTAS_PRACTICA_LOG : 'Compuestas_Practica_Log';

  // ── MG1 — Funciones más falladas (simples): barras rojas ──────────────
  const rs = ss.getSheetByName(hojaSimples);
  if (rs) {
    const col = getColMap_(rs);
    const errs = [['Err_CD','CD'],['Err_CI','CI'],['Err_Atr','Atr'],['Err_CPvo','CPvo'],['Err_CReg','C.Rég'],['Err_CC','CC']];
    const pres = errs.filter(e => col[e[0]] !== undefined);
    if (pres.length) {
      sheet.getRange(r, 1).setValue('Funciones más falladas (simples)').setFontWeight('bold');
      sheet.getRange(r, 3, 1, pres.length).setValues([pres.map(e => e[1])]).setFontColor('#666').setFontSize(9);
      const sums = pres.map(e => { const L = _colLetter_(col[e[0]]); return "=SUM('" + hojaSimples + "'!" + L + "2:" + L + ")"; });
      sheet.getRange(r + 1, 3, 1, sums.length).setFormulas([sums]);
      const c1 = _colLetter_(2), c2 = _colLetter_(2 + pres.length - 1); // datos en C..
      sheet.getRange(r, 2).setFormula('=SPARKLINE(' + c1 + (r + 1) + ':' + c2 + (r + 1) + ', {"charttype","column";"color1","#CC0000"})');
      r += 3;
    }
  }

  // ── MG2 — Tipos de error (compuestas, práctica): barras naranjas ──────
  const cp = ss.getSheetByName(hojaPract);
  if (cp) {
    const col = getColMap_(cp);
    const errs = [['Errores_Verbos','Verbos'],['Errores_Nexos','Nexos'],['Errores_Delimitar','Delimitar'],['Errores_Clasificar','Clasificar']];
    const pres = errs.filter(e => col[e[0]] !== undefined);
    if (pres.length) {
      sheet.getRange(r, 1).setValue('Tipos de error (compuestas, práctica)').setFontWeight('bold');
      sheet.getRange(r, 3, 1, pres.length).setValues([pres.map(e => e[1])]).setFontColor('#666').setFontSize(9);
      const sums = pres.map(e => { const L = _colLetter_(col[e[0]]); return "=SUM('" + hojaPract + "'!" + L + "2:" + L + ")"; });
      sheet.getRange(r + 1, 3, 1, sums.length).setFormulas([sums]);
      const c1 = _colLetter_(2), c2 = _colLetter_(2 + pres.length - 1);
      sheet.getRange(r, 2).setFormula('=SPARKLINE(' + c1 + (r + 1) + ':' + c2 + (r + 1) + ', {"charttype","column";"color1","#E69138"})');
      r += 3;
    }
  }

  // ── MG3 — Evolución de la nota media por examen (simples): línea azul ─
  if (rs) {
    const col = getColMap_(rs);
    if (col['Examen'] !== undefined && col['Nota'] !== undefined) {
      const eL = _colLetter_(col['Examen']);
      const hL = _colLetter_(col['Nota']);
      const lastL = _colLetter_(rs.getLastColumn() - 1);
      sheet.getRange(r, 1).setValue('Evolución de la nota media por examen (simples)').setFontWeight('bold');
      // QUERY auxiliar en J–K: [examen, media de nota] por examen.
      const q = "=IFERROR(QUERY('" + hojaSimples + "'!A2:" + lastL +
                ", \"select " + eL + ", avg(" + hL + ") where " + hL + " is not null group by " + eL +
                " order by " + eL + " label avg(" + hL + ") ''\", 0), )";
      sheet.getRange(r, 10).setFormula(q); // columna J
      sheet.getRange(r, 2).setFormula('=SPARKLINE(K' + r + ':K' + (r + 40) + ', {"charttype","line";"color","#1F3864"})');
      sheet.getRange(r + 1, 1).setValue('(ordenado por nombre de examen · datos auxiliares en col. J–K)')
        .setFontColor('#999').setFontSize(9);
      r += 3;
    }
  }

  // Limitación de SPARKLINE: muestra tendencia pero no ejes ni valores. Para
  // un análisis fino, el informe Excel del profesor o un gráfico nativo son
  // mejores; estos minigráficos son un vistazo rápido siempre visible.
}
