// ════════════════════════════════════════════════════════════════════════
//  EvolucionAlumnos.gs — Historial completo de cada alumno, curso a curso
//  ----------------------------------------------------------------------
//  Crea/actualiza la hoja "🎓 Evolucion_Alumnos": un bloque por alumno con
//  TODAS sus actividades (Simples examen + práctica libre, Compuestas
//  examen + práctica) en orden cronológico, más un SPARKLINE real de
//  Google Sheets con la evolución de su nota (a diferencia del informe
//  Excel del profesor, que usa un mini-gráfico de texto porque SPARKLINE
//  es una función de Sheets, no de Excel — aquí sí se puede usar tal cual).
//
//  Pensado para verse SIEMPRE actualizado dentro del propio Sheet, sin
//  tener que generar ningún informe — para eso está el Excel del profesor
//  (informe-excel.js), pensado para compartir con profesores sin acceso
//  a este Sheet.
//
//  Reutiliza los mismos lectores que getInformeProfesor_ (Code_v6.gs):
//  leerSimplesExamen_, leerSimplesPractica_, leerCompuestasRes_. Se llaman
//  sin filtro de fecha ni de grupo — todo el histórico disponible — y
//  LUEGO se filtra por "Mis grupos" (ver getMisGruposConfigurados_ en
//  Code_v6.gs, menú ⚙️ Avanzado → 🎓 Configurar mis grupos). Necesario
//  porque, si este Sheet se comparte con otro profesor, sus alumnos SÍ
//  deben guardarse aquí (para que él pueda pedir su propio informe Excel
//  filtrando por su grupo), pero esta vista fija en el Sheet debe mostrar
//  solo los del dueño del Sheet. Si no se ha configurado nada, se muestran
//  todos con un aviso visible en la propia hoja.
//
//  Identidad del alumno: por correo (en minúsculas), igual que el resto
//  del proyecto. Si el mismo alumno usa dos correos distintos a lo largo
//  del curso (p.ej. con o sin "alu."), saldrá como dos bloques separados —
//  riesgo asumido por Josele (conversación 2026-07): la solución sería un
//  listado fijo de alumnos por grupo al empezar curso, pendiente de si se
//  implementa más adelante.
// ════════════════════════════════════════════════════════════════════════

const SHEET_EVOLUCION_ALUMNOS = '🎓 Evolucion_Alumnos';

function actualizarEvolucionAlumnos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_EVOLUCION_ALUMNOS);
  if (!sheet) sheet = ss.insertSheet(SHEET_EVOLUCION_ALUMNOS);
  sheet.clear();
  sheet.clearConditionalFormatRules();

  // Rango amplísimo: todo el histórico guardado, de cualquier curso.
  const from = new Date(2020, 0, 1);
  const to   = new Date(2099, 11, 31, 23, 59, 59);

  const simplesEx = leerSimplesExamen_(ss, from, to, '');
  const simplesPr = leerSimplesPractica_(ss, from, to, '');
  const comp      = leerCompuestasRes_(ss, from, to, '');

  const detalle = [];
  simplesEx.forEach(r => detalle.push({
    fecha: r.fecha, correo: r.correo, nombre: r.nombre, grupo: r.grupo,
    tipo: 'Sintaxis · examen', nota: r.nota, info: r.examen || ''
  }));
  simplesPr.forEach(r => detalle.push({
    fecha: r.fecha, correo: r.correo, nombre: r.nombre, grupo: r.grupo,
    tipo: 'Sintaxis · práctica', nota: r.nota, info: (r.oracionesHechas || 0) + ' oraciones'
  }));
  comp.forEach(r => detalle.push({
    fecha: r.fecha, correo: r.correo, nombre: r.nombre, grupo: r.grupo,
    tipo: 'Compuestas · ' + (String(r.modo).toLowerCase() === 'examen' ? 'examen' : 'práctica'),
    nota: r.nota, info: (r.completados || 0) + '/' + (r.totalEjercicios || 0) + ' ejercicios'
  }));

  // ── Filtrar a "mis grupos" (jul-2026) ──
  // Si compartes este Sheet con otros profesores, sus alumnos SÍ deben
  // guardarse en Alumnos_Resultados/Compuestas_Resultados (para que ellos
  // puedan pedir su propio informe Excel filtrando por su grupo), pero
  // esta vista fija en el Sheet debe mostrar solo los tuyos.
  const misGrupos = getMisGruposConfigurados_();
  const sinConfigurar = misGrupos.length === 0;
  const detalleFiltrado = sinConfigurar
    ? detalle
    : detalle.filter(d => misGrupos.indexOf(String(d.grupo || '').trim()) !== -1);

  // ── Agrupar por correo (clave estable); si falta, cae al nombre ──
  const porAlumno = {};
  detalleFiltrado.forEach(d => {
    const key = d.correo || String(d.nombre || '').toLowerCase().trim() || '(sin identificar)';
    if (!porAlumno[key]) porAlumno[key] = { nombre: d.nombre || '(sin nombre)', grupo: d.grupo || '', items: [] };
    if (!porAlumno[key].nombre && d.nombre) porAlumno[key].nombre = d.nombre;
    if (!porAlumno[key].grupo && d.grupo) porAlumno[key].grupo = d.grupo;
    porAlumno[key].items.push(d);
  });

  const alumnos = Object.keys(porAlumno).map(k => porAlumno[k]).sort((a, b) => {
    const g = (a.grupo || '').localeCompare(b.grupo || '');
    return g !== 0 ? g : (a.nombre || '').localeCompare(b.nombre || '');
  });

  // ── Cabecera de la hoja ──
  sheet.getRange('A1').setValue('🎓 EVOLUCIÓN POR ALUMNO — historial completo del curso')
    .setFontSize(16).setFontWeight('bold').setFontColor('#1f4e78');
  sheet.getRange('A2').setValue('Actualizado: ' + new Date().toLocaleString('es-ES') +
    '  ·  ' + alumnos.length + ' alumnos con actividad registrada' +
    (sinConfigurar ? '' : '  ·  filtrado a: ' + misGrupos.join(', ')))
    .setFontColor('#666').setFontSize(10);

  if (sinConfigurar) {
    sheet.getRange('A3').setValue(
      '⚠ No has configurado "Mis grupos" (menú ⚙️ Avanzado → 🎓 Configurar mis grupos). ' +
      'Si compartes este Sheet con otro profesor, esta lista puede incluir también a SUS alumnos.'
    ).setFontColor('#B45309').setFontWeight('bold').setFontSize(10);
  }

  if (!alumnos.length) {
    sheet.getRange('A5').setValue('Aún no hay actividad registrada' +
      (sinConfigurar ? '.' : ' para los grupos configurados.')).setFontColor('#999');
    sheet.setColumnWidth(1, 220);
    ss.setActiveSheet(sheet);
    return;
  }

  let fila = 5;
  alumnos.forEach(al => {
    al.items.sort((a, b) => (a.fecha ? a.fecha.getTime() : 0) - (b.fecha ? b.fecha.getTime() : 0));
    const notas = al.items.map(i => i.nota).filter(n => typeof n === 'number' && !isNaN(n));
    const media = notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null;

    // Fila de cabecera del alumno: Nombre·Grupo | (vacío) | Nota media | (vacío) | Sparkline
    const filaAlumno = fila;
    sheet.getRange(filaAlumno, 1, 1, 5).setBackground('#e7f0f7');
    sheet.getRange(filaAlumno, 1).setValue(al.nombre + (al.grupo ? '  ·  ' + al.grupo : ''))
      .setFontWeight('bold').setFontSize(12).setFontColor('#1f4e78');
    if (media !== null) {
      const c = _colorNota_(media);
      sheet.getRange(filaAlumno, 3).setValue(media)
        .setBackground(c.bg).setFontColor(c.fg).setFontWeight('bold')
        .setHorizontalAlignment('center');
    }
    fila++;

    // Cabecera de la tabla de actividades de este alumno
    sheet.getRange(fila, 1, 1, 4).setValues([['Fecha', 'Tipo', 'Nota', 'Info']])
      .setFontWeight('bold').setBackground('#e0e7ff');
    fila++;

    const filaPrimeraNota = fila;
    al.items.forEach(it => {
      sheet.getRange(fila, 1).setValue(it.fecha || '').setNumberFormat('dd/mm/yyyy');
      sheet.getRange(fila, 2).setValue(it.tipo || '');
      if (typeof it.nota === 'number' && !isNaN(it.nota)) {
        const c = _colorNota_(it.nota);
        sheet.getRange(fila, 3).setValue(it.nota)
          .setBackground(c.bg).setFontColor(c.fg).setHorizontalAlignment('center');
      }
      sheet.getRange(fila, 4).setValue(it.info || '');
      fila++;
    });
    const filaUltimaNota = fila - 1;

    // SPARKLINE real de la evolución de nota (Google Sheets sí lo soporta).
    if (notas.length >= 2) {
      sheet.getRange(filaAlumno, 5).setFormula(
        '=SPARKLINE(C' + filaPrimeraNota + ':C' + filaUltimaNota + ',{"charttype","line";"color","#4F46E5"})'
      );
    }

    fila += 2; // separador antes del siguiente alumno
  });

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 70);
  sheet.setColumnWidth(4, 280);
  sheet.setColumnWidth(5, 140);
  sheet.setFrozenRows(4);
  ss.setActiveSheet(sheet);
}
