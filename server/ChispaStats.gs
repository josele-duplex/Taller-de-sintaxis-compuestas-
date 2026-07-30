// ════════════════════════════════════════════════════════════════════════
//  ChispaStats.gs — Estadísticas agregadas del modo Chispa (julio 2026)
//  ----------------------------------------------------------------------
//  Lee Chispa_Sesiones (una fila por segmento jugado, ver saveSesionChispa_
//  en Code_v6.gs) y añade al Panel_Profesor:
//    - Top de funciones más falladas (suma Errores_JSON de todas las filas)
//    - Temas más jugados (nº de segmentos por Tema)
//    - Totales: alumnos únicos, rondas jugadas, % de aciertos global
//
//  Se invoca desde crearDashboard_ junto a agregarTablaGrupos_ /
//  agregarMinigraficos_. Columnas por NOMBRE (getColMap_), mismo patrón
//  que el resto de mejoras del panel.
// ════════════════════════════════════════════════════════════════════════

function agregarStatsChispa_(sheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Chispa_Sesiones');
  let r = sheet.getLastRow() + 3;
  sheet.getRange(r, 1).setValue('⚡ CHISPA — uso y errores más comunes')
    .setFontWeight('bold').setFontSize(12).setBackground('#FEF3C7');
  sheet.getRange(r, 1, 1, 6).merge();
  r++;

  if (!sh || sh.getLastRow() < 2) {
    sheet.getRange(r, 1).setValue('Aún no hay sesiones de Chispa registradas').setFontColor('#999');
    return;
  }

  const col = getColMap_(sh);
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();

  const correos = {};
  const temas = {};
  const erroresFunc = {};
  let totalRondas = 0, totalAciertos = 0;
  data.forEach(row => {
    const correo = String(row[col['Correo']] || '').trim().toLowerCase();
    if (correo) correos[correo] = true;
    const tema = String(row[col['Tema']] || '(sin tema)');
    temas[tema] = (temas[tema] || 0) + 1;
    totalRondas += parseInt(row[col['Rondas']]) || 0;
    totalAciertos += parseInt(row[col['Aciertos']]) || 0;
    let errores = {};
    try { errores = JSON.parse(row[col['Errores_JSON']] || '{}') || {}; } catch (e) {}
    Object.keys(errores).forEach(f => { erroresFunc[f] = (erroresFunc[f] || 0) + (parseInt(errores[f]) || 0); });
  });

  // ── Totales ──
  const pctAciertos = totalRondas > 0 ? Math.round(totalAciertos / totalRondas * 100) : 0;
  sheet.getRange(r, 1).setValue('Alumnos: ' + Object.keys(correos).length + '  ·  Sesiones: ' + data.length +
    '  ·  Rondas jugadas: ' + totalRondas + '  ·  % aciertos global: ' + pctAciertos + '%')
    .setFontColor('#444').setFontStyle('italic');
  sheet.getRange(r, 1, 1, 6).merge();
  r += 2;

  // ── Top errores por función ──
  sheet.getRange(r, 1).setValue('Top funciones más falladas').setFontWeight('bold').setBackground('#f0f0f0');
  sheet.getRange(r, 1, 1, 2).merge();
  r++;
  const topErrores = Object.entries(erroresFunc).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topErrores.length === 0) {
    sheet.getRange(r, 1).setValue('Sin errores registrados').setFontColor('#999');
    r++;
  } else {
    const maxErr = topErrores[0][1];
    topErrores.forEach(([func, n]) => {
      sheet.getRange(r, 1).setValue(func);
      sheet.getRange(r, 2).setValue(n);
      const barLen = Math.max(1, Math.round((n / maxErr) * 20));
      sheet.getRange(r, 3).setValue('█'.repeat(barLen)).setFontColor('#DC2626');
      r++;
    });
  }
  r++;

  // ── Temas más jugados ──
  sheet.getRange(r, 1).setValue('Temas más jugados').setFontWeight('bold').setBackground('#f0f0f0');
  sheet.getRange(r, 1, 1, 2).merge();
  r++;
  const topTemas = Object.entries(temas).sort((a, b) => b[1] - a[1]);
  if (topTemas.length === 0) {
    sheet.getRange(r, 1).setValue('Sin datos').setFontColor('#999');
  } else {
    topTemas.forEach(([tema, n]) => {
      sheet.getRange(r, 1).setValue(tema);
      sheet.getRange(r, 2).setValue(n + ' sesión' + (n === 1 ? '' : 'es'));
      r++;
    });
  }
}
