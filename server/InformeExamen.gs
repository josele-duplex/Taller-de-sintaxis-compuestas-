// ════════════════════════════════════════════════════════════════════════
//  InformeExamen.gs — Informe por correo tras un examen de Sintaxis (jul-2026)
//  ----------------------------------------------------------------------
//  A diferencia de EnviarInformes.gs (que manda un resumen AGREGADO de
//  actividad en un rango de fechas), este informe es sobre UN examen
//  concreto: la nota que sacó, el desglose de errores por función, y un
//  ejemplo didáctico de la prueba NGLE por cada función fallada — mismo
//  espíritu que REFLEXION_BANCO del frontend (js/modules/sint/index.js),
//  pero GAS no puede importar ese archivo, así que se mantiene aquí una
//  versión compacta y sincronizada a mano si cambia la terminología.
//
//  Dos formas de disparo:
//   - AUTOMÁTICO: el profesor marca la casilla "📧 Enviar informe..." al
//     crear el examen (columna Auto_Email en Examenes_Config). saveResult_
//     (Code_v6.gs) llama aquí justo después de guardar cada resultado.
//   - MANUAL: menú "📧 Enviar informes de un examen (PIN)…" — pide el PIN
//     y envía a quien no lo tenga ya marcado (columna Email_Enviado en
//     Alumnos_Resultados), para no duplicar con el automático.
// ════════════════════════════════════════════════════════════════════════

// Banco compacto de pruebas NGLE por función, para el correo. Mantener en
// sintonía con REFLEXION_BANCO del frontend si cambia la redacción.
function _bancoDidacticoFunc_(func) {
  const m = {
    'CD':      'Se sustituye por "lo/la/los/las" (pronombre átono); en pasiva pasa a ser el sujeto paciente.',
    'CI':      'Se sustituye por "le/les" (o "se" ante lo/la); no cambia al pasar la oración a pasiva.',
    'Atr':     'Se sustituye por el "lo" neutro invariable, y solo aparece con un verbo copulativo (ser/estar/parecer).',
    'CPvo':    'Concuerda a la vez con el verbo Y con un nombre (sujeto o CD): si cambia el número de ese nombre, el predicativo cambia también.',
    'CReg':    'El término se sustituye por "eso/ello" y la preposición queda pegada al verbo (p. ej. "confían en ello", nunca "confían ello").',
    'CC':      'Se puede suprimir o desplazar de sitio sin romper la oración; se sustituye por un adverbio comodín ("allí", "entonces", "así").'
  };
  return m[func] || '';
}

const _NOMBRE_FUNC_ = { 'CD':'Complemento Directo', 'CI':'Complemento Indirecto', 'Atr':'Atributo',
  'CPvo':'Complemento Predicativo', 'CReg':'Complemento de Régimen', 'CC':'Complementos Circunstanciales' };

// ¿Este PIN de examen tiene marcado el envío automático? Busca la fila
// ACTIVA más reciente con ese PIN en Examenes_Config (mismo patrón de
// búsqueda que getExamConfig_).
function _examTieneAutoEmail_(pin) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_EXAMS);
    if (!sheet || sheet.getLastRow() < 2) return false;
    const col = getColMap_(sheet);
    if (col['Auto_Email'] === undefined) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][col['PIN']]).trim() !== String(pin).trim()) continue;
      if (String(data[i][col['Estado']]).trim() !== 'activo') continue;
      return !!(parseInt(data[i][col['Auto_Email']]) || 0);
    }
    return false;
  } catch (e) { return false; }
}

// Construye y envía el correo a partir del PAYLOAD crudo que ya llega a
// saveResult_ (p.score, p.errCD…), sin tener que releer la hoja.
function _enviarInformeExamenAlumno_(p, email) {
  const nota = parseFloat(p.score) || 0;
  const errores = {
    'CD':   parseInt(p.errCD)   || 0,
    'CI':   parseInt(p.errCI)   || 0,
    'Atr':  parseInt(p.errAtr)  || 0,
    'CPvo': parseInt(p.errCPvo) || 0,
    'CReg': parseInt(p.errCReg) || 0,
    'CC':   parseInt(p.errCC)   || 0
  };
  const cuerpo = _construirCuerpoExamenAlumno_(p.name || '', p.examen || '', nota, errores);
  GmailApp.sendEmail(email, '📝 Resultado de tu examen — ' + (p.examen || 'Taller de Sintaxis'), cuerpo);
}

function _construirCuerpoExamenAlumno_(nombre, nombreExamen, nota, errores) {
  function n1(x) { return isNaN(x) ? '—' : Number(x).toFixed(1); }
  const L = [];
  L.push('Hola ' + nombre + ':');
  L.push('');
  L.push('Este es el resultado de tu examen' + (nombreExamen ? ' "' + nombreExamen + '"' : '') + '.');
  L.push('');
  L.push('📊 Tu nota: ' + n1(nota) + ' / 10');

  const fallados = Object.keys(errores).filter(f => errores[f] > 0).sort((a, b) => errores[b] - errores[a]);
  if (fallados.length === 0) {
    L.push('');
    L.push('¡No se registraron errores por función en este examen! Enhorabuena.');
  } else {
    L.push('');
    L.push('📌 Desglose de errores:');
    fallados.forEach(f => {
      L.push('  · ' + (_NOMBRE_FUNC_[f] || f) + ': ' + errores[f] + (errores[f] === 1 ? ' error' : ' errores'));
    });
    L.push('');
    L.push('💡 Para reconocerlas mejor la próxima vez:');
    fallados.forEach(f => {
      const ejemplo = _bancoDidacticoFunc_(f);
      if (ejemplo) L.push('  · ' + (_NOMBRE_FUNC_[f] || f) + ' — ' + ejemplo);
    });
  }

  L.push('');
  L.push('Un saludo,');
  L.push('Tu profesor');
  return L.join('\n');
}

// ── Envío MANUAL por PIN (menú) ──────────────────────────────────────────
// Pide el PIN con un prompt nativo (sin diálogo HTML: más económico y
// suficiente para esta tarea puntual) y envía solo a quien no tenga ya
// 'Email_Enviado' marcado (evita duplicar con el automático).
function menuEnviarInformesExamenPin() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('📧 Enviar informes de un examen', 'PIN del examen:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const pin = resp.getResponseText().trim();
  if (!pin) { ui.alert('PIN vacío. Nada que enviar.'); return; }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet || sheet.getLastRow() < 2) { ui.alert('No hay resultados guardados todavía.'); return; }
  const col = getColMap_(sheet);
  const data = sheet.getDataRange().getValues();

  let enviados = 0, yaEnviados = 0, fallos = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['PIN']]).trim() !== pin) continue;
    const yaTiene = col['Email_Enviado'] !== undefined && String(data[i][col['Email_Enviado']] || '').trim();
    if (yaTiene) { yaEnviados++; continue; }
    const email = String(data[i][col['Correo']] || '').trim();
    if (!email) continue;
    try {
      const errores = {
        'CD':   parseInt(data[i][col['Err_CD']])   || 0,
        'CI':   parseInt(data[i][col['Err_CI']])   || 0,
        'Atr':  parseInt(data[i][col['Err_Atr']])  || 0,
        'CPvo': parseInt(data[i][col['Err_CPvo']]) || 0,
        'CReg': parseInt(data[i][col['Err_CReg']]) || 0,
        'CC':   parseInt(data[i][col['Err_CC']])   || 0
      };
      const cuerpo = _construirCuerpoExamenAlumno_(
        String(data[i][col['Nombre']] || ''),
        String(data[i][col['Examen']] || ''),
        parseFloat(data[i][col['Nota']]) || 0,
        errores
      );
      GmailApp.sendEmail(email, '📝 Resultado de tu examen — ' + (String(data[i][col['Examen']] || '') || 'Taller de Sintaxis'), cuerpo);
      if (col['Email_Enviado'] !== undefined) sheet.getRange(i + 1, col['Email_Enviado'] + 1).setValue('manual');
      enviados++;
    } catch (e) { fallos++; }
  }

  ui.alert('✓ Enviados: ' + enviados + '\nYa estaban enviados: ' + yaEnviados + '\nFallos: ' + fallos +
    (enviados + yaEnviados + fallos === 0 ? '\n\n(No se encontró ningún resultado con ese PIN)' : ''));
}
