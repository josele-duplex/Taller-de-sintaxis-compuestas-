// ════════════════════════════════════════════════════════════════════════
//  TablaGrupos.gs — Comparativa por grupo en el Panel del Profesor (Mejora 3)
//  ----------------------------------------------------------------------
//  Añade al Panel_Profesor una tabla:
//    Grupo | Nº alumnos | Media nota | % Aprob. (≥5) | % Susp. (<5) | Mejor | Peor
//  combinando las notas de Alumnos_Resultados + Compuestas_Resultados, con
//  formato condicional nativo (escala verde-amarillo-rojo) en "Media nota" y
//  una fila de "tasa de finalización".
//
//  Se invoca desde crearDashboard_ (antes de los minigráficos).
//
//  MEJORAS sobre el prompt original:
//  - Los grupos se DESCUBREN dinámicamente de los datos (el doc los fijaba a
//    mano: 2ºA/2ºC/3ºA). Así aparece cualquier grupo nuevo sin tocar código.
//  - Columnas por NOMBRE (getColMap_), no por letra (las del doc estaban
//    desfasadas).
//  - El gráfico de barras nativo NO se crea por código (al reconstruirse el
//    panel se duplicaría); se explica cómo insertarlo a mano.
// ════════════════════════════════════════════════════════════════════════

function agregarTablaGrupos_(sheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaSimples    = (typeof SHEET_RESULTS !== 'undefined') ? SHEET_RESULTS : 'Alumnos_Resultados';
  const hojaCompuestas = (typeof SHEET_COMPUESTAS_RESULTADOS !== 'undefined') ? SHEET_COMPUESTAS_RESULTADOS : 'Compuestas_Resultados';

  // ── Recolectar (grupo, correo, nota) de ambas hojas de resultados ──
  const filas = [];
  [hojaSimples, hojaCompuestas].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const col = getColMap_(sh);
    if (col['Nota'] === undefined) return;
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    data.forEach(row => {
      const nota = parseFloat(row[col['Nota']]);
      if (isNaN(nota)) return;
      filas.push({
        grupo:  String(row[col['Grupo']] || '').trim() || '(sin grupo)',
        correo: String(row[col['Correo']] || '').trim().toLowerCase(),
        nota:   nota
      });
    });
  });

  // ── Agrupar por grupo ──
  const g = {};
  filas.forEach(f => {
    if (!g[f.grupo]) g[f.grupo] = { notas: [], correos: {} };
    g[f.grupo].notas.push(f.nota);
    if (f.correo) g[f.grupo].correos[f.correo] = true;
  });

  let r = sheet.getLastRow() + 3;
  sheet.getRange(r, 1).setValue('👥 COMPARATIVA POR GRUPO (simples + compuestas)')
    .setFontWeight('bold').setFontSize(12).setBackground('#e7f0f7');
  sheet.getRange(r, 1, 1, 7).merge();
  r++;

  const header = ['Grupo', 'Nº alumnos', 'Media nota', '% Aprob. (≥5)', '% Susp. (<5)', 'Mejor', 'Peor'];
  sheet.getRange(r, 1, 1, 7).setValues([header]).setFontWeight('bold').setBackground('#f0f0f0');
  r++;

  const grupos = Object.keys(g).sort((a, b) => a.localeCompare(b, 'es'));
  if (!grupos.length) {
    sheet.getRange(r, 1).setValue('Aún no hay notas registradas').setFontColor('#999');
    return;
  }

  const startData = r;
  const rows = grupos.map(name => {
    const o = g[name];
    const n = o.notas.length;
    const media = o.notas.reduce((a, b) => a + b, 0) / n;
    const aprob = o.notas.filter(x => x >= 5).length;
    return [
      name,
      Object.keys(o.correos).length,
      Math.round(media * 10) / 10,
      Math.round(aprob / n * 100),
      Math.round((n - aprob) / n * 100),
      Math.max.apply(null, o.notas),
      Math.min.apply(null, o.notas)
    ];
  });
  sheet.getRange(startData, 1, rows.length, 7).setValues(rows);

  // ── Formato condicional nativo en "Media nota" (col C): rojo→amarillo→verde
  const rngMedia = sheet.getRange(startData, 3, rows.length, 1);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#E67C73', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMidpointWithValue('#FFD666', SpreadsheetApp.InterpolationType.NUMBER, '5')
    .setGradientMaxpointWithValue('#57BB8A', SpreadsheetApp.InterpolationType.NUMBER, '10')
    .setRanges([rngMedia])
    .build();
  const rules = sheet.getConditionalFormatRules();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);

  r = startData + rows.length + 1;

  // ── Tasa de finalización: alumnos con nota / alumnos vistos en la app ──
  const conNota = {};
  filas.forEach(f => { if (f.correo) conNota[f.correo] = true; });
  const vistos = {};
  [hojaSimples, hojaCompuestas, 'Ranking_Arcade', 'Misiones_Resultados'].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const col = getColMap_(sh);
    if (col['Correo'] === undefined) return;
    const data = sh.getRange(2, col['Correo'] + 1, sh.getLastRow() - 1, 1).getValues();
    data.forEach(rw => { const c = String(rw[0] || '').trim().toLowerCase(); if (c) vistos[c] = true; });
  });
  const nNota = Object.keys(conNota).length;
  const nVist = Object.keys(vistos).length;
  const tasa = nVist ? Math.round(nNota / nVist * 100) : 0;
  sheet.getRange(r, 1).setValue(
    'Tasa de finalización (alumnos con nota / alumnos vistos): ' + nNota + '/' + nVist + ' = ' + tasa + '%'
  ).setFontColor('#444').setFontStyle('italic');
  sheet.getRange(r, 1, 1, 7).merge();
}
