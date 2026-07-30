Aquí tienes las secciones de código independientes y completamente adaptadas a la arquitectura de tu script **v6.3** (Code\_v6 (4).gs).  
Dado que Google Apps Script compila todos los archivos del proyecto bajo un mismo entorno global, puedes crear un archivo nuevo en el editor de scripts llamado Mejoras\_Panel.gs y pegar allí estos bloques de código, o bien añadirlos al final de tu archivo Code\_v6 (4).gs.

### **1\. Formato Condicional Elegante para Calificaciones y Alumnos**

**Para qué sirve:** Automatiza mediante código la escala de colores solicitada (0-4 rojo pastel, 5-6 amarillo, 7-8 verde, 9-10 azul corporativo con texto blanco). Al ejecutarse, busca las columnas exactas de "Nota" y "Nombre" de los estudiantes y pinta ambas celdas dinámicamente en las hojas de sintaxis simple (Alumnos\_Resultados) y sintaxis compuesta (Compuestas\_Resultados).  
JavaScript

```

/**
 * SECCIÓN 1: FORMATO CONDICIONAL DE CALIFICACIONES Y ALUMNOS
 * Aplica la escala de colores elegante (0-4 rojo, 5-6 amarillo, 7-8 verde, 9-10 azul oscuro)
 * tanto a las celdas de Notas como a las celdas de Nombre de los alumnos.
 */
function aplicarFormatoCondicionalNotas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // SHEET_RESULTS ya está definida globalmente como 'Alumnos_Resultados' en tu código principal
  const hojas = [SHEET_RESULTS, 'Compuestas_Resultados']; 
  
  hojas.forEach(nombreHoja => {
    const sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) return;
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    
    // Localizar de forma dinámica las columnas por sus cabeceras
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colNota = headers.indexOf('Nota') + 1;
    const colNombre = headers.indexOf('Nombre') + 1;
    
    if (colNota === 0 || colNombre === 0) return;
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();
    
    // Limpiar formatos previos para evitar conflictos de color acumulados
    sheet.getRange(2, colNota, lastRow - 1, 1).setBackground(null).setFontColor(null).setFontWeight('normal');
    sheet.getRange(2, colNombre, lastRow - 1, 1).setBackground(null).setFontColor(null).setFontWeight('normal');
    
    for (let i = 0; i < data.length; i++) {
      const filaActual = i + 2;
      const nota = parseFloat(data[i][colNota - 1]);
      
      if (isNaN(nota)) continue;
      
      let backColor = '#ffffff';
      let fontColor = '#000000';
      let fontWeight = 'normal';
      
      // Escala de colores elegante y pastel solicitada
      if (nota >= 0 && nota < 5) {
        backColor = '#fce8e6'; // Rojo suave / pastel
        fontColor = '#a51d24'; // Texto rojo oscuro legible
      } else if (nota >= 5 && nota < 7) {
        backColor = '#fef3d6'; // Amarillo suave
        fontColor = '#b06000'; // Texto ocre / marrón
      } else if (nota >= 7 && nota < 9) {
        backColor = '#e6f4ea'; // Verde suave
        fontColor = '#137333'; // Texto verde oscuro
      } else if (nota >= 9 && nota <= 10) {
        backColor = '#1a73e8'; // Azul elegante corporativo
        fontColor = '#ffffff'; // Texto blanco contrastado
        fontWeight = 'bold';
      }
      
      // Aplicar color en la fila correspondiente a la Nota y al Nombre del Alumno
      sheet.getRange(filaActual, colNota).setBackground(backColor).setFontColor(fontColor).setFontWeight(fontWeight);
      sheet.getRange(filaActual, colNombre).setBackground(backColor).setFontColor(fontColor).setFontWeight(fontWeight);
    }
  });
}

```

### **2 y 3\. Sparklines de Errores y Gráficos Métricos en "Panel Profesor"**

**Para qué sirve:** Inserta en el 📊 Panel\_Profesor fórmulas automáticas de minigráficos de celda (\=SPARKLINE) para evaluar visualmente las funciones sintácticas simples donde más fallan los alumnos (CD, CI, Atributo, etc.) en base a tus columnas Err\_CD, Err\_CI... Además, crea un bloque de rendimiento medio que calcula el promedio por grupo mediante funciones QUERY automáticas y despliega un gráfico nativo de barras de comparación.  
JavaScript

```

/**
 * SECCIÓN 2 y 3: DIAGNÓSTICO CON SPARKLINES Y GRÁFICOS MÉTRICOS EN EL PANEL
 * Agrega fórmulas Sparkline de color personalizadas para errores de funciones
 * y genera una gráfica nativa para comparar promedios de notas entre clases.
 */
function configurarMetricasYSparklinesPanel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const panel = ss.getSheetByName('📊 Panel_Profesor');
  if (!panel) return;
  
  // Definir inicio de la sección de diagnóstico de errores (ej. fila 35 del Panel)
  const startRow = 35;
  panel.getRange(startRow, 1).setValue('📊 DIAGNÓSTICO DE ERRORES SINTÁCTICOS (SPARKLINES)').setFontWeight('bold').setFontSize(12);
  
  const cabecerasErrores = ['Función Sintáctica', 'Total Errores Acumulados', 'Distribución Visual'];
  panel.getRange(startRow + 1, 1, 1, 3).setValues([cabecerasErrores]).setFontWeight('bold').setBackground('#f3f3f3');
  
  // Mapeo directo de tus columnas de errores en Alumnos_Resultados
  const funcionesSimples = [
    { name: 'Complemento Directo (CD)', col: 'Err_CD' },
    { name: 'Complemento Indirecto (CI)', col: 'Err_CI' },
    { name: 'Atributo (Atr)', col: 'Err_Atr' },
    { name: 'Complemento Predicativo (CPvo)', col: 'Err_CPvo' },
    { name: 'Complemento de Régimen (CReg)', col: 'Err_CReg' },
    { name: 'Complemento Circunstancial (CC)', col: 'Err_CC' }
  ];
  
  const resSheet = ss.getSheetByName(SHEET_RESULTS);
  if (resSheet) {
    const resHeaders = resSheet.getRange(1, 1, 1, resSheet.getLastColumn()).getValues()[0];
    
    funcionesSimples.forEach((func, idx) => {
      const colIdx = resHeaders.indexOf(func.col) + 1;
      if (colIdx === 0) return;
      const colLetra = colLetraA1_(colIdx);
      const rFila = startRow + 2 + idx;
      
      panel.getRange(rFila, 1).setValue(func.name);
      // Sumatorio dinámico desde la hoja de resultados simples
      panel.getRange(rFila, 2).setFormula(`=SUM(${SHEET_RESULTS}!${colLetra}2:${colLetra})`);
      // Fórmula SPARKLINE de barra horizontal en color rojo oscuro adaptada a Sheets
      panel.getRange(rFila, 3).setFormula(`=SPARKLINE(B${rFila}; {"charttype"\\"bar"; "max"\\MAX(B${startRow+2}:B${startRow+7}); "color1"\\"#a51d24"})`);
    });
  }
  
  // --- SECCIÓN 3: MÉTRICAS NATIVAS Y GRÁFICO POR CLASES ---
  const metricsRow = startRow + 10;
  panel.getRange(metricsRow, 1).setValue('📈 RENDIMIENTO Y CONTROL POR GRUPOS / CLASES').setFontWeight('bold').setFontSize(12);
  panel.getRange(metricsRow + 1, 1, 1, 2).setValues([['Grupo / Clase', 'Nota Media Promedio']]).setFontWeight('bold').setBackground('#f3f3f3');
  
  // Inyección de QUERY para obtener la nota media por grupo automáticamente
  panel.getRange(metricsRow + 2, 1).setFormula(`=QUERY(${SHEET_RESULTS}!A2:H; "SELECT D, AVG(H) WHERE D IS NOT NULL GROUP BY D LABEL AVG(H) ''")`);
  
  // Evitar duplicar el gráfico nativo en el panel si ya se creó previamente
  const charts = panel.getCharts();
  let existeGrafico = false;
  charts.forEach(c => {
    if (c.getOptions().get('title') === 'Rendimiento de Notas Medias por Clase') existeGrafico = true;
  });
  
  if (!existeGrafico) {
    const rangeData = panel.getRange(metricsRow + 2, 1, 6, 2);
    const nativeChart = panel.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(rangeData)
      .setPosition(metricsRow + 2, 4, 0, 0)
      .setOption('title', 'Rendimiento de Notas Medias por Clase')
      .setOption('colors', ['#1a73e8']) // Azul elegante para las barras estables
      .build();
    panel.insertChart(nativeChart);
  }
}

// Helper interno para convertir índices numéricos a letras de columna (A, B, C... Z, AA)
function colLetraA1_(col) {
  let temp, letter = '';
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

```

### **4\. Creación y Consolidación Temporal de la hoja "Analitica\_Evolutiva"**

**Para qué sirve:** Resuelve el requerimiento de crear la hoja unificada de histórico de uso si no existe. Lee y unifica cronológicamente de manera automática los registros de Alumnos\_Resultados (Sintaxis Simple), notas e internos JSON de Compuestas\_Resultados, y la actividad gamificada de Ranking\_Arcade. Los agrupa por intervalos mensuales para medir alumnos activos, minutos totales de trabajo e introduce una **escala de gradiente nativa por código** sobre la tasa de errores para auditar la efectividad real del aprendizaje a lo largo del año.  
JavaScript

```

/**
 * SECCIÓN 4: HOJA HISTÓRICA DE USO INTEGRAL Y ANÁLISIS EVOLUTIVO
 * Genera la estructura temporal unificada acumulando datos de todos los módulos
 * (Arcade, Simples, Compuestas) evaluando la tasa de error cronológica.
 */
function generarHojaAnaliticaEvolutiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombreHoja = 'Analitica_Evolutiva';
  let sheet = ss.getSheetByName(nombreHoja);
  
  if (!sheet) {
    sheet = ss.insertSheet(nombreHoja);
  } else {
    sheet.clear(); // Limpieza preventiva para actualizar la línea temporal limpia
  }
  
  const cabeceras = [
    'Intervalo Temporal', 
    'Alumnos Activos Únicos', 
    'Sesiones de Trabajo', 
    'Tiempo Total Invertido (Min)', 
    '% Uso Sintaxis Simple', 
    '% Uso Sintaxis Compuesta', 
    '% Uso Arcade / Otros',
    'Tasa de Errores Promedio'
  ];
  
  sheet.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]).setFontWeight('bold').setBackground('#0d47a1').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  
  const datosSimples = ss.getSheetByName(SHEET_RESULTS) ? ss.getSheetByName(SHEET_RESULTS).getDataRange().getValues() : [];
  const datosCompuestas = ss.getSheetByName('Compuestas_Resultados') ? ss.getSheetByName('Compuestas_Resultados').getDataRange().getValues() : [];
  const datosArcade = ss.getSheetByName(SHEET_ARCADE) ? ss.getSheetByName(SHEET_ARCADE).getDataRange().getValues() : [];
  
  const mapaPeriodos = {}; // Acumulador: { "AAAA-MM": { alumnos: Set, sesiones: 0, min: 0, simples: 0, compuestas: 0, otros: 0, errores: 0, total: 0 } }
  
  // Procesador y agrupador por fechas internas
  const mapearRegistro = (fechaRaw, email, modulo, estimacionMinutos, cuentaErrores, volumenEjercicios) => {
    if (!fechaRaw) return;
    const fecha = (fechaRaw instanceof Date) ? fechaRaw : new Date(fechaRaw);
    if (isNaN(fecha.getTime())) return;
    
    // Formato clave agrupador: Año - Mes
    const periodo = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
    
    if (!mapaPeriodos[periodo]) {
      mapaPeriodos[periodo] = {
        alumnos: new Set(), sesiones: 0, tiempo: 0, simples: 0, compuestas: 0, otros: 0, errores: 0, total: 0
      };
    }
    
    const p = mapaPeriodos[periodo];
    if (email) p.alumnos.add(email);
    p.sesiones += 1;
    p.tiempo += (estimacionMinutos || 0);
    p.errores += (cuentaErrores || 0);
    p.total += (volumenEjercicios || 1);
    
    if (modulo === 'simple') p.simples += 1;
    else if (modulo === 'compuesta') p.compuestas += 1;
    else p.otros += 1;
  };
  
  // Iteración sobre resultados Simples (Fecha=col 0, Correo=col 1, Total_Oraciones=col 9, Elem_Fallados=col 13)
  for (let i = 1; i < datosSimples.length; i++) {
    const row = datosSimples[i];
    mapearRegistro(row[0], row[1], 'simple', 3, parseInt(row[13]) || 0, parseInt(row[9]) || 1);
  }
  
  // Iteración sobre resultados Compuestas (Fecha=col 0, Correo=col 1, Completados=col 8, Nota=col 9)
  for (let i = 1; i < datosCompuestas.length; i++) {
    const row = datosCompuestas[i];
    const erroresEstimados = Math.max(0, Math.round(10 - parseFloat(row[9])));
    mapearRegistro(row[0], row[1], 'compuesta', 5, erroresEstimados, parseInt(row[8]) || 1);
  }
  
  // Iteración sobre módulo Arcade (Fecha=col 0, Correo=col 4)
  for (let i = 1; i < datosArcade.length; i++) {
    const row = datosArcade[i];
    mapearRegistro(row[0], row[4], 'arcade', 2, 0, 1);
  }
  
  // Volcar datos calculados a las celdas físicas de forma estructurada
  const periodosCronologicos = Object.keys(mapaPeriodos).sort();
  const matrizSalida = [];
  
  periodosCronologicos.forEach(per => {
    const p = mapaPeriodos[per];
    const totalModulos = p.simples + p.compuestas + p.otros;
    const avgErrores = p.total > 0 ? (p.errores / p.sesiones) : 0;
    
    matrizSalida.push([
      per,
      p.alumnos.size,
      p.sesiones,
      p.tiempo,
      totalModulos > 0 ? (p.simples / totalModulos) : 0,
      totalModulos > 0 ? (p.compuestas / totalModulos) : 0,
      totalModulos > 0 ? (p.otros / totalModulos) : 0,
      Math.round(avgErrores * 100) / 100
    ]);
  });
  
  if (matrizSalida.length > 0) {
    sheet.getRange(2, 1, matrizSalida.length, cabeceras.length).setValues(matrizSalida);
    // Aplicar formato de porcentajes automatizado a columnas E, F y G
    sheet.getRange(2, 5, matrizSalida.length, 3).setNumberFormat('0.0%');
    
    // Escala comparativa de gradiente en la columna H (Tasa de errores)
    // Nos permite constatar a simple vista si los fallos bajan mes a mes
    const rangoColor = sheet.getRange(2, 8, matrizSalida.length, 1);
    const gradiente = SpreadsheetApp.newConditionalFormatRule()
      .setGradientMaxColor('#fce8e6') // Mayor volumen de error = Alerta Roja
      .setGradientMinColor('#e6f4ea') // Reducción de fallos = Éxito Verde
      .setRanges([rangoColor])
      .build();
    
    const actuales = sheet.getConditionalFormatRules();
    actuales.push(gradiente);
    sheet.setConditionalFormatRules(actuales);
  }
}

```

### **🛠️ Paso Final: Integración en el Menú de la Hoja (**onOpen**)**

Para que puedas ejecutar estas funciones cómodamente con un clic desde la barra de herramientas de tu hoja de cálculo, localiza la función onOpen() de tu archivo principal (cerca de la línea 1691/2012) y añade estas tres nuevas opciones al menú del profesor de la siguiente manera:  
JavaScript

```

// Añade esto dentro de tu función onOpen() actual, justo debajo de tus otros items[cite: 269]:
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('🎓 Taller de Sintaxis'); // [cite: 269, 270]
  
  // Tus items existentes... [cite: 270]
  menu.addItem('📊 Actualizar Panel del Profesor', 'menuDashboard'); // [cite: 270]
  
  menu.addSeparator(); // [cite: 271]
  // NUEVOS ITEMS DE CONTROL AUTOMÁTICO:
  menu.addItem('🎨 Aplicar Escala Colores Elegante a Notas', 'aplicarFormatoCondicionalNotas');
  menu.addItem('📈 Forzar Inicialización de Sparklines y Gráficos', 'configurarMetricasYSparklinesPanel');
  menu.addItem('📅 Generar / Actualizar Analítica Evolutiva', 'generarHojaAnaliticaEvolutiva');
  
  menu.addToUi();
}

```

