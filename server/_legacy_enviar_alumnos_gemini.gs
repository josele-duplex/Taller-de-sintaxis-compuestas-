// ════════════════════════════════════════════════════════════════════════
//  LEGACY / REFERENCIA — Envío simple de la hoja "Alumnos" (Gemini)
//  ----------------------------------------------------------------------
//  ⚠️ NO PEGAR ESTE ARCHIVO EN EL PROYECTO DE APPS SCRIPT TAL CUAL.
//  Está SUPERADO por EnviarInformes.gs (menú "📧 Enviar informes a alumnos…"),
//  que además del volcado de datos envía a cada alumno su informe de errores.
//
//  Se conserva solo como referencia histórica. Su función onOpen original se
//  ha renombrado a onOpen_LEGACY_NO_USAR para que NO compita con el onOpen
//  real del proyecto (Code_v6.gs), ya que Apps Script solo admite un onOpen.
// ════════════════════════════════════════════════════════════════════════

function onOpen_LEGACY_NO_USAR() {
  var ui = SpreadsheetApp.getUi();
  // Crea el botón personalizado en la barra de tareas superior
  ui.createMenu('📧 Enviar Alumnos')
      .addItem('Enviar Datos de la Hoja', 'enviarCorreosAlumnos')
      .addToUi();
}

function enviarCorreosAlumnos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Busca la hoja respetando el emoji del nombre original
  var sheet = ss.getSheetByName("👥 Alumnos") || ss.getSheetByName("Alumnos");

  if (!sheet) {
    SpreadsheetApp.getUi().alert('No se ha encontrado la hoja llamada "👥 Alumnos" o "Alumnos". Por favor, verifica el nombre.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var encabezados = null;
  var correosEnviados = 0;

  // Recorremos todas las filas del documento
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // La columna C es el índice 2 (A=0, B=1, C=2)
    var correo = row[2] ? row[2].toString().trim() : "";

    // Si la celda de la columna C contiene un correo válido...
    if (correo && correo.indexOf('@') > -1) {

      // Si todavía no sabemos cuáles son los encabezados,
      // asumimos que están en la fila justo arriba del primer correo
      if (!encabezados && i > 0) {
        encabezados = data[i - 1];
      }

      // En caso de que no haya fila anterior, creamos encabezados por defecto
      if (!encabezados) {
        encabezados = row.map(function(_, index) {
          return "Columna " + String.fromCharCode(65 + index);
        });
      }

      // Configuración del correo electrónico
      var asunto = "Información y actualización - Hoja Alumnos";
      var cuerpo = "Hola:\n\nTe compartimos los datos correspondientes a tu registro en la hoja de Alumnos:\n\n";

      // Añadimos de forma dinámica todos los datos de su fila
      for (var j = 0; j < row.length; j++) {
        var nombreEtiqueta = encabezados[j] ? encabezados[j].toString().trim() : "Dato " + (j + 1);
        // Evitamos añadir datos si la columna no tiene nombre o está vacía
        if (nombreEtiqueta !== "") {
          cuerpo += "• " + nombreEtiqueta + ": " + row[j] + "\n";
        }
      }

      cuerpo += "\nUn saludo cordial.";

      // Envío del correo electrónico a través de Gmail
      GmailApp.sendEmail(correo, asunto, cuerpo);
      correosEnviados++;
    }
  }

  // Aviso en pantalla al finalizar
  SpreadsheetApp.getUi().alert('¡Proceso completado! Se han enviado ' + correosEnviados + ' correos a los destinatarios de la columna C.');
}
