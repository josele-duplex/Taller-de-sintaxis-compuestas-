// ════════════════════════════════════════════════════════════════════════
//  AnaliticaEvolutiva.gs — Hoja de uso global por semana (Mejora 4)
//  ----------------------------------------------------------------------
//  Crea/actualiza la hoja "📈 Analitica_Evolutiva" consolidando el uso de la
//  app SEMANA a SEMANA. Por cada semana (lunes) calcula:
//    · Alumnos únicos activos (por correo, en todas las hojas con correo)
//    · Sesiones/actividades totales (cada fila = 1)
//    · Tiempo total en minutos (Duracion_Segundos de Compuestas_Practica_Log)
//    · Distribución de uso por módulo (% Simples / Compuestas / Práctica / Arcade)
//    · Media de errores por alumno (para ver si disminuyen)
//  Cierra con un SPARKLINE de la evolución de la media de errores.
//
//  DECISIÓN DE DISEÑO (mejora sobre el prompt, que pedía fórmulas + luego GAS):
//  se construye 100% por GAS, leyendo columnas POR NOMBRE (getColMap_). Es más
//  robusto que las fórmulas QUERY semanales (frágiles con fechas y con las
//  letras desfasadas del documento) y se actualiza con un clic de menú.
//
//  Fuentes leídas: Alumnos_Resultados (examen Simples), Compuestas_Resultados
//  (examen Compuestas), Sesiones_Practica (práctica libre Simples — arreglado
//  jul-2026, antes no se leía), Compuestas_Practica_Log (práctica libre
//  Compuestas) y Ranking_Arcade.
//
//  LIMITACIONES conocidas (honestas):
//  - Compuestas_Practica_Log no guarda correo (es por sesión anónima): no suma
//    alumnos únicos, pero sí sesiones, tiempo y errores de práctica.
//  - "Tiempo (min)" sale de sumar Sesiones_Practica (Tiempo_Min) y
//    Compuestas_Practica_Log (Duracion_Segundos). Los exámenes (Alumnos_
//    Resultados, Compuestas_Resultados) no guardan duración, así que ese
//    tiempo no entra en el total — es solo tiempo de práctica libre.
// ════════════════════════════════════════════════════════════════════════

// Lunes (00:00) de la semana de una fecha, como objeto Date.
function _lunesDe_(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;   // 0 = lunes … 6 = domingo
  x.setDate(x.getDate() - dow);
  return x;
}

// Suma los errores de una fila según las columnas de error presentes.
function _sumaErroresFila_(row, col, nombresCols) {
  let s = 0;
  nombresCols.forEach(name => {
    if (col[name] !== undefined) {
      const v = parseFloat(row[col[name]]);
      if (!isNaN(v)) s += v;
    }
  });
  return s;
}

function actualizarAnaliticaEvolutiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const NAME = '📈 Analitica_Evolutiva';
  let sheet = ss.getSheetByName(NAME);
  if (!sheet) sheet = ss.insertSheet(NAME);
  sheet.clear();
  sheet.clearConditionalFormatRules();

  const hojaSimples    = (typeof SHEET_RESULTS !== 'undefined') ? SHEET_RESULTS : 'Alumnos_Resultados';
  const hojaCompuestas = (typeof SHEET_COMPUESTAS_RESULTADOS !== 'undefined') ? SHEET_COMPUESTAS_RESULTADOS : 'Compuestas_Resultados';
  const hojaPract      = (typeof SHEET_COMPUESTAS_PRACTICA_LOG !== 'undefined') ? SHEET_COMPUESTAS_PRACTICA_LOG : 'Compuestas_Practica_Log';

  // wk[key] = { inicio, correos:{}, sesiones, tiempoSeg, simples, comp, pract, arcade, errores }
  const wk = {};
  function bucket(fecha) {
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return null;
    const lunes = _lunesDe_(fecha);
    const key = Utilities.formatDate(lunes, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (!wk[key]) wk[key] = { inicio: key, correos: {}, sesiones: 0, tiempoSeg: 0, simples: 0, comp: 0, pract: 0, arcade: 0, errores: 0 };
    return wk[key];
  }

  // Lee una hoja y procesa cada fila con su fecha. cb(b, row, col).
  function procesar(name, colFecha, cb) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const col = getColMap_(sh);
    if (col[colFecha] === undefined) return;
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    data.forEach(row => {
      const b = bucket(new Date(row[col[colFecha]]));
      if (!b) return;
      cb(b, row, col);
    });
  }

  // ── Simples (Alumnos_Resultados) ──
  procesar(hojaSimples, 'Fecha', (b, row, col) => {
    b.sesiones++; b.simples++;
    const c = String(row[col['Correo']] || '').trim().toLowerCase(); if (c) b.correos[c] = true;
    b.errores += _sumaErroresFila_(row, col, ['Err_CD','Err_CI','Err_Atr','Err_CPvo','Err_CReg','Err_CC']);
  });

  // ── Compuestas (examen) ──
  procesar(hojaCompuestas, 'Fecha', (b, row, col) => {
    b.sesiones++; b.comp++;
    const c = String(row[col['Correo']] || '').trim().toLowerCase(); if (c) b.correos[c] = true;
  });

  // ── Práctica libre de Simples (Sesiones_Practica) ──
  // Arreglo jul-2026: esta hoja existía y se guardaba correctamente, pero
  // actualizarAnaliticaEvolutiva() nunca la leía — "Tiempo (min)" y buena
  // parte de "Sesiones" se quedaban en 0 aunque hubiera práctica libre real.
  procesar('Sesiones_Practica', 'Fecha', (b, row, col) => {
    b.sesiones++; b.pract++;
    const c = String(row[col['Correo']] || '').trim().toLowerCase(); if (c) b.correos[c] = true;
    if (col['Tiempo_Min'] !== undefined) {
      const t = parseFloat(row[col['Tiempo_Min']]); if (!isNaN(t)) b.tiempoSeg += t * 60;
    }
    b.errores += _sumaErroresFila_(row, col, ['Err_CD','Err_CI','Err_Atr','Err_CPvo','Err_CReg','Err_CC']);
  });

  // ── Práctica de compuestas (sin correo; sí duración y errores) ──
  procesar(hojaPract, 'Timestamp', (b, row, col) => {
    b.sesiones++; b.pract++;
    if (col['Duracion_Segundos'] !== undefined) {
      const t = parseFloat(row[col['Duracion_Segundos']]); if (!isNaN(t)) b.tiempoSeg += t;
    }
    b.errores += _sumaErroresFila_(row, col, ['Errores_Verbos','Errores_Nexos','Errores_Delimitar','Errores_Clasificar']);
  });

  // ── Arcade (Ranking_Arcade) ──
  procesar('Ranking_Arcade', 'Fecha', (b, row, col) => {
    b.sesiones++; b.arcade++;
    const c = String(row[col['Correo']] || '').trim().toLowerCase(); if (c) b.correos[c] = true;
  });

  // ── Cabecera de la hoja ──
  sheet.getRange('A1').setValue('📈 ANALÍTICA EVOLUTIVA — uso semanal del Taller de Sintaxis')
    .setFontSize(16).setFontWeight('bold').setFontColor('#1f4e78');
  sheet.getRange('A2').setValue('Actualizado: ' + new Date().toLocaleString('es-ES'))
    .setFontColor('#666').setFontSize(10);

  const header = ['Semana (lunes)', 'Alumnos únicos', 'Sesiones', 'Tiempo (min)',
                  '% Simples', '% Compuestas', '% Práctica', '% Arcade', 'Media errores/alumno'];
  sheet.getRange(4, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#e7f0f7');

  const keys = Object.keys(wk).sort();  // 'yyyy-MM-dd' ordena cronológicamente
  if (!keys.length) {
    sheet.getRange(5, 1).setValue('Aún no hay actividad registrada.').setFontColor('#999');
    sheet.setColumnWidth(1, 130);
    return;
  }

  const rows = keys.map(k => {
    const b = wk[k];
    const total = b.simples + b.comp + b.pract + b.arcade;
    const pct = x => total ? Math.round(x / total * 100) : 0;
    const nAl = Object.keys(b.correos).length;
    return [
      b.inicio,
      nAl,
      b.sesiones,
      Math.round(b.tiempoSeg / 60),
      pct(b.simples), pct(b.comp), pct(b.pract), pct(b.arcade),
      nAl ? Math.round(b.errores / nAl * 10) / 10 : 0
    ];
  });
  sheet.getRange(5, 1, rows.length, header.length).setValues(rows);

  // ── SPARKLINE de la evolución de la media de errores (col I) ──
  const fila = 5 + rows.length + 1;
  const ultimaFila = 5 + rows.length - 1;
  sheet.getRange(fila, 1).setValue('Evolución de la media de errores/alumno →').setFontWeight('bold');
  sheet.getRange(fila, 2).setFormula('=SPARKLINE(I5:I' + ultimaFila + ', {"charttype","line";"color","#CC0000"})');
  sheet.getRange(fila + 1, 1).setValue('(si la línea baja con las semanas, los alumnos mejoran)')
    .setFontColor('#999').setFontSize(9);

  sheet.setColumnWidth(1, 130);
  sheet.setFrozenRows(4);
  ss.setActiveSheet(sheet);
}
