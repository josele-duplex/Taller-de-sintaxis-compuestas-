/* informe-excel.js — Generador del informe Excel multi-hoja del profesor.
   Usa xlsx-js-style (fork de SheetJS, mismo API + soporte de estilos).
   La librería se carga en lazy desde teacher/index.js.
   Entry point: window.generarExcelInforme(datos).

   Hojas generadas:
     1) 📋 Resumen     — header de marca + 4 tarjetones + comparativa de grupos + top alumnos
     2) 👥 [Grupo X]   — una pestaña por grupo si hay 2-6 grupos
     3) 👥 Alumnos     — todos juntos con autofiltro y colores condicionales
     4) 📈 Evolución   — actividades de cada alumno en orden cronológico, con
                         tendencia (mini-gráfico de texto + media + ↑/↓/→)
     5) 🎯 Diagnóstico — top errores globales y por grupo, con barras visuales
     6) 📝 Detalle     — fila por actividad
     7) 📊 [Examen N]  — una pestaña por examen con su lista de alumnos
*/

(function(){
  'use strict';

  // ── Paleta corporativa ─────────────────────────────────────────────────
  const C = {
    marca:       '4F46E5',  // índigo Taller
    marcaDark:   '312E81',
    marcaText:   'FFFFFF',
    subheader:   'E0E7FF',  // lila claro para subcabeceras
    card1:       'EEF2FF',  // tarjetón índigo
    card2:       'F5F3FF',  // tarjetón violeta
    card3:       'ECFDF5',  // tarjetón verde
    card4:       'FFF7ED',  // tarjetón naranja
    ink:         '111827',
    muted:       '6B7280',
    border:      'D1D5DB',
    verdeBg:     'D1FAE5',  verdeText: '065F46',
    ambarBg:     'FEF3C7',  ambarText: '92400E',
    rojoBg:      'FEE2E2',  rojoText:  '991B1B',
    azulBg:      'DBEAFE',  azulText:  '1E40AF',
    grisBg:      'F3F4F6',  grisText:  '374151',
    headerTabla: '312E81',  headerTablaText: 'FFFFFF'
  };

  // ── Helpers de estilo ──────────────────────────────────────────────────
  function S_titulo(){
    return {
      font:      { bold:true, sz:16, color:{rgb:C.marcaText}, name:'Calibri' },
      fill:      { fgColor:{rgb:C.marcaDark} },
      alignment: { horizontal:'center', vertical:'center' }
    };
  }
  function S_subtitulo(){
    return {
      font:      { italic:true, sz:10, color:{rgb:C.muted} },
      alignment: { horizontal:'center' }
    };
  }
  function S_cardLabel(bg){
    return {
      font:      { bold:true, sz:9, color:{rgb:C.muted} },
      fill:      { fgColor:{rgb:bg} },
      alignment: { horizontal:'center', vertical:'center' },
      border:    bordeCompleto(bg)
    };
  }
  function S_cardValor(bg){
    return {
      font:      { bold:true, sz:22, color:{rgb:C.marcaDark}, name:'Calibri' },
      fill:      { fgColor:{rgb:bg} },
      alignment: { horizontal:'center', vertical:'center' },
      border:    bordeCompleto(bg)
    };
  }
  function S_seccion(){
    return {
      font:      { bold:true, sz:12, color:{rgb:C.marcaDark} },
      fill:      { fgColor:{rgb:C.subheader} },
      alignment: { horizontal:'left', vertical:'center' }
    };
  }
  function S_cabeceraTabla(){
    return {
      font:      { bold:true, sz:10, color:{rgb:C.headerTablaText} },
      fill:      { fgColor:{rgb:C.headerTabla} },
      alignment: { horizontal:'center', vertical:'center', wrapText:true },
      border:    bordeCompleto(C.border)
    };
  }
  function S_celda(extra){
    const base = {
      font:      { sz:10, color:{rgb:C.ink} },
      alignment: { vertical:'center' },
      border:    bordeCompleto(C.border)
    };
    return Object.assign(base, extra || {});
  }
  function S_celdaCentro(extra){
    return S_celda(Object.assign({ alignment:{ horizontal:'center', vertical:'center' } }, extra || {}));
  }
  function S_celdaNum(extra){
    return S_celda(Object.assign({ alignment:{ horizontal:'right', vertical:'center' } }, extra || {}));
  }
  // Escala pedagógica de 4 colores: 0-4 rojo · 5-6 amarillo · 7-8 verde · 9-10 azul.
  function coloresNota_(n){
    if (n === null || n === undefined || isNaN(n)) return { bg: C.grisBg, text: C.grisText };
    if (n >= 9)      return { bg: C.azulBg,  text: C.azulText  };
    if (n >= 7)      return { bg: C.verdeBg, text: C.verdeText };
    if (n >= 5)      return { bg: C.ambarBg, text: C.ambarText };
    return                    { bg: C.rojoBg,  text: C.rojoText  };
  }
  function S_nota(n){
    const c = coloresNota_(n);
    return S_celda({
      font:      { sz:10, bold:true, color:{rgb:c.text} },
      fill:      { fgColor:{rgb:c.bg} },
      alignment: { horizontal:'center', vertical:'center' }
    });
  }
  function S_footer(){
    return {
      font:      { italic:true, sz:9, color:{rgb:C.muted} },
      alignment: { horizontal:'center' }
    };
  }
  function bordeCompleto(rgb){
    const e = { style:'thin', color:{rgb:rgb} };
    return { top:e, bottom:e, left:e, right:e };
  }

  // ── Helpers de celda ───────────────────────────────────────────────────
  function cell(v, style){
    let t = 's';
    let val = (v === null || v === undefined) ? '' : v;
    if (typeof v === 'number')      t = 'n';
    else if (typeof v === 'boolean'){ t = 'b'; }
    else                             val = String(val);
    const c = { v: val, t: t };
    if (style) c.s = style;
    return c;
  }
  function fechaCorta(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    return dd + '/' + mm + '/' + d.getFullYear();
  }
  function fmtNota(n){
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toFixed(1);
  }
  function nombreHojaSeguro(name, max){
    // Excel: máx 31 chars, prohibidos / \ ? * [ ]
    const limpio = String(name || '').replace(/[\/\\\?\*\[\]:]/g, '·');
    return limpio.slice(0, max || 31);
  }
  function merge(r1,c1,r2,c2){
    return { s:{r:r1,c:c1}, e:{r:r2,c:c2} };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HOJA 1 — RESUMEN
  // ════════════════════════════════════════════════════════════════════════
  function buildResumen(datos){
    const r = datos.resumen || {};
    const rango = datos.rango || {};
    const aoa = [];
    const merges = [];

    // Fila 0: Título principal (merge A1:F1)
    aoa.push([
      cell('TALLER DE SINTAXIS · INFORME DE LA CLASE', S_titulo()),
      cell(''), cell(''), cell(''), cell(''), cell('')
    ]);
    merges.push(merge(0,0,0,5));

    // Fila 1: Subtítulo con rango
    aoa.push([
      cell('Periodo: ' + fechaCorta(rango.desde+'T00:00:00') + ' — ' + fechaCorta(rango.hasta+'T00:00:00')
           + '  ·  Generado el ' + fechaCorta(datos.fecha_generacion), S_subtitulo()),
      cell(''), cell(''), cell(''), cell(''), cell('')
    ]);
    merges.push(merge(1,0,1,5));

    // Fila 2: vacía
    aoa.push([cell(''), cell(''), cell(''), cell(''), cell(''), cell('')]);

    // Filas 3-4: Tarjetones de stats globales (A3:F4 → 4 tarjetones de ancho 1.5 cols)
    // Layout: cada tarjetón ocupa columnas A-B / C / D / E-F (con merges)
    const tarjetones = [
      { label:'ALUMNOS',      valor: String(r.total_alumnos || 0),                   bg: C.card1 },
      { label:'ACTIVIDADES',  valor: String(r.total_actividades || 0),               bg: C.card2 },
      { label:'NOTA MEDIA',   valor: fmtNota(r.nota_media),                          bg: C.card3 },
      { label:'% APROBADOS',  valor: String(r.pct_aprobados || 0) + '%',             bg: C.card4 }
    ];
    // Fila 3: labels
    aoa.push(tarjetones.map(t => cell(t.label, S_cardLabel(t.bg)))
                       .concat([cell(''), cell('')]).slice(0,6));
    // Fila 4: valores
    aoa.push(tarjetones.map(t => cell(t.valor, S_cardValor(t.bg)))
                       .concat([cell(''), cell('')]).slice(0,6));
    // (cada tarjetón ocupa 1 columna; no hace falta merge horizontal)

    // Fila 5: vacía
    aoa.push([cell('')]);

    // Fila 6: sección "COMPARATIVA DE GRUPOS"
    aoa.push([
      cell('COMPARATIVA DE GRUPOS', S_seccion()),
      cell('', S_seccion()), cell('', S_seccion()), cell('', S_seccion()), cell('', S_seccion()), cell('', S_seccion())
    ]);
    merges.push(merge(6,0,6,5));

    // Fila 7: cabecera tabla grupos
    aoa.push([
      cell('Grupo',       S_cabeceraTabla()),
      cell('Alumnos',     S_cabeceraTabla()),
      cell('Actividades', S_cabeceraTabla()),
      cell('Nota media',  S_cabeceraTabla()),
      cell('% Aprobados', S_cabeceraTabla()),
      cell('',            S_cabeceraTabla())
    ]);

    // Filas 8+: filas por grupo
    const grupos = (r.grupos || []);
    grupos.forEach(g => {
      aoa.push([
        cell(g.nombre,            S_celda()),
        cell(g.alumnos || 0,      S_celdaCentro()),
        cell(g.actividades || 0,  S_celdaCentro()),
        cell(fmtNota(g.nota_media), S_nota(g.nota_media)),
        cell((g.pct_aprobados || 0) + '%', S_celdaCentro()),
        cell('', S_celda())
      ]);
    });
    if (!grupos.length){
      aoa.push([cell('(sin datos en el rango)', S_celda()), cell(''),cell(''),cell(''),cell(''),cell('')]);
    }

    // 2 filas vacías
    aoa.push([cell('')]); aoa.push([cell('')]);

    // Sección "TOP ALUMNOS" + "NECESITAN REFUERZO"
    aoa.push([
      cell('TOP 5 ALUMNOS', S_seccion()), cell('', S_seccion()), cell('', S_seccion()),
      cell('NECESITAN REFUERZO', S_seccion()), cell('', S_seccion()), cell('', S_seccion())
    ]);
    merges.push(merge(aoa.length-1, 0, aoa.length-1, 2));
    merges.push(merge(aoa.length-1, 3, aoa.length-1, 5));

    // Cabecera
    aoa.push([
      cell('#',     S_cabeceraTabla()),
      cell('Alumno',S_cabeceraTabla()),
      cell('Nota',  S_cabeceraTabla()),
      cell('#',     S_cabeceraTabla()),
      cell('Alumno',S_cabeceraTabla()),
      cell('Nota',  S_cabeceraTabla())
    ]);

    const conNota = (datos.alumnos || []).filter(a => a.nota_media !== null && a.nota_media !== undefined);
    const top    = conNota.slice().sort((a,b) => b.nota_media - a.nota_media).slice(0,5);
    const bottom = conNota.slice().sort((a,b) => a.nota_media - b.nota_media).slice(0,5);
    for (let i=0; i<5; i++){
      const t = top[i], b = bottom[i];
      aoa.push([
        cell(t ? (i+1) : '',           S_celdaCentro()),
        cell(t ? t.nombre : '',         S_celda()),
        cell(t ? fmtNota(t.nota_media) : '', t ? S_nota(t.nota_media) : S_celdaCentro()),
        cell(b ? (i+1) : '',           S_celdaCentro()),
        cell(b ? b.nombre : '',         S_celda()),
        cell(b ? fmtNota(b.nota_media) : '', b ? S_nota(b.nota_media) : S_celdaCentro())
      ]);
    }

    // Footer
    aoa.push([cell('')]);
    aoa.push([
      cell('Generado por Taller de Sintaxis · taller-sintaxis · ' + fechaCorta(datos.fecha_generacion), S_footer()),
      cell(''), cell(''), cell(''), cell(''), cell('')
    ]);
    merges.push(merge(aoa.length-1, 0, aoa.length-1, 5));

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch:18 }, { wch:30 }, { wch:14 }, { wch:14 }, { wch:30 }, { wch:14 }
    ];
    ws['!rows'] = [
      { hpt:28 }, // título
      { hpt:18 }, // subtítulo
      {},
      { hpt:22 }, // labels tarjetones
      { hpt:42 }  // valores tarjetones
    ];
    ws['!merges'] = merges;
    ws['!freeze'] = { xSplit:0, ySplit:2 };
    return ws;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HOJA — ALUMNOS (todos o de un grupo)
  // ════════════════════════════════════════════════════════════════════════
  //  alumnos: array de objetos {nombre, grupo, n_actividades, nota_media, ...}
  //  tituloHoja: texto del título superior
  //  subtituloHoja: stats del grupo o "todos los grupos"
  // ════════════════════════════════════════════════════════════════════════
  function buildAlumnos(alumnos, tituloHoja, subtituloHoja){
    const aoa = [];
    const merges = [];

    // Fila 0: título
    aoa.push([
      cell(tituloHoja, S_titulo()),
      cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell('')
    ]);
    merges.push(merge(0,0,0,8));

    // Fila 1: subtítulo
    aoa.push([
      cell(subtituloHoja, S_subtitulo()),
      cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell('')
    ]);
    merges.push(merge(1,0,1,8));

    // Fila 2: vacía
    aoa.push([cell('')]);

    // Fila 3: cabecera de tabla
    const headers = ['Grupo','Nombre','Correo','Sesiones','Ejercicios','Nota media','Tiempo (min)','Última actividad','Top errores','Examen por subfase'];
    aoa.push(headers.map(h => cell(h, S_cabeceraTabla())));
    const headerRow = aoa.length;  // 0-indexed: 3

    // Fase 2 (jul-2026): etiquetas cortas para el desglose de examen por subfase
    const SUBFASE_LABELS = { solo_np:'Solo NP', np_sujeto:'NP+Sujeto', completo:'Completo', profundo:'Profundo' };

    // Filas 4+: alumnos (ya vienen ordenados por grupo+nombre desde el GAS)
    alumnos.forEach(a => {
      const sp = a.simples_practica || {};
      const ce = a.simples_examen   || {};
      const cp = a.compuestas       || {};
      const sesiones   = (sp.sesiones || 0);
      const ejercicios = (sp.ejercicios || 0) + (ce.intentos || 0) + (cp.intentos || 0);
      const topErr     = (a.errores_top || []).slice(0,3).map(e => e.funcion + ' (' + e.count + ')').join(', ');
      // Solo se rellena cuando el alumno ha hecho exámenes de más de una
      // profundidad — evita ruido en el caso normal (todo 'completo').
      const porSubfase = (ce.por_subfase || [])
        .map(s => (SUBFASE_LABELS[s.subfase] || s.subfase) + ': ' + fmtNota(s.nota_media) + ' (' + s.intentos + ')')
        .join(' · ');
      aoa.push([
        cell(a.grupo || '(sin grupo)', S_celda()),
        cell(a.nombre || '(sin nombre)', S_celda()),
        cell(a.correo || '', S_celda({ font:{sz:9,color:{rgb:C.muted}} })),
        cell(sesiones, S_celdaCentro()),
        cell(ejercicios, S_celdaCentro()),
        cell(fmtNota(a.nota_media), S_nota(a.nota_media)),
        cell(a.tiempo_min_total || 0, S_celdaCentro()),
        cell(a.ultima_actividad ? fechaCorta(a.ultima_actividad) : '—', S_celdaCentro()),
        cell(topErr || '—', S_celda({ font:{sz:9, color:{rgb:C.muted}} })),
        cell(porSubfase || '—', S_celda({ font:{sz:9, color:{rgb:C.muted}} }))
      ]);
    });
    if (!alumnos.length){
      aoa.push([
        cell('(sin alumnos en el rango)', S_celda()),
        cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell(''),cell('')
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch:12 }, { wch:26 }, { wch:32 }, { wch:9 }, { wch:11 },
      { wch:11 }, { wch:11 }, { wch:14 }, { wch:36 }, { wch:32 }
    ];
    ws['!rows'] = [ { hpt:28 }, { hpt:18 } ];
    ws['!merges'] = merges;
    ws['!freeze'] = { xSplit:0, ySplit:headerRow };
    if (alumnos.length){
      const lastRow = headerRow + alumnos.length;
      // Autofiltro sobre la cabecera + filas
      ws['!autofilter'] = { ref: 'A' + (headerRow) + ':J' + (lastRow) };
    }
    return ws;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HOJA — DIAGNÓSTICO PEDAGÓGICO
  // ════════════════════════════════════════════════════════════════════════
  function buildDiagnostico(datos){
    const aoa = [];
    const merges = [];
    const diag = datos.diagnostico_global || {};
    const top = diag.errores_top || [];
    const maxCount = top.length ? top[0].count : 0;

    // Título
    aoa.push([cell('DIAGNÓSTICO PEDAGÓGICO', S_titulo()), cell(''),cell(''),cell(''),cell('')]);
    merges.push(merge(0,0,0,4));

    // Recomendación
    aoa.push([
      cell(diag.recomendacion || '', S_subtitulo()),
      cell(''),cell(''),cell(''),cell('')
    ]);
    merges.push(merge(1,0,1,4));

    aoa.push([cell('')]);

    // ── A+B: CALIFICACIONES (estadísticas + histograma global) ──────────
    const est = (datos.resumen && datos.resumen.estadisticas) || null;
    if (est) {
      const filaSecc = aoa.length;
      aoa.push([
        cell('CALIFICACIONES DE LA CLASE', S_seccion()),
        cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion())
      ]);
      merges.push(merge(filaSecc,0,filaSecc,4));

      // Fila de estadísticas resumidas
      aoa.push([
        cell('Media: ' + fmtNota(est.media), S_celdaCentro({font:{bold:true,sz:10,color:{rgb:C.ink}}})),
        cell('Mediana: ' + fmtNota(est.mediana), S_celdaCentro()),
        cell('Máx: ' + fmtNota(est.max) + ' · Mín: ' + fmtNota(est.min), S_celdaCentro()),
        cell('Desv.: ' + fmtNota(est.desviacion), S_celdaCentro()),
        cell('Suspensos: ' + est.suspensos + '/' + est.n, S_celdaCentro({font:{bold:true,sz:10,color:{rgb:est.suspensos>est.aprobados?'C0392B':C.ink}}}))
      ]);
      aoa.push([cell('')]);

      // Histograma por tramos
      aoa.push([
        cell('Tramo',     S_cabeceraTabla()),
        cell('Alumnos',   S_cabeceraTabla()),
        cell('%',         S_cabeceraTabla()),
        cell('Distribución', S_cabeceraTabla()),
        cell('', S_cabeceraTabla())
      ]);
      // Los 4 tramos del histograma (Insuficiente/Suf.Bien/Notable/Sobresaliente)
      // se corresponden 1:1 con la escala de colores rojo/amarillo/verde/azul.
      const COLORES_TRAMO = [
        { bg: C.rojoBg,  text: C.rojoText  },
        { bg: C.ambarBg, text: C.ambarText },
        { bg: C.verdeBg, text: C.verdeText },
        { bg: C.azulBg,  text: C.azulText  }
      ];
      const maxTramo = Math.max.apply(null, est.histograma.map(t => t.count).concat([1]));
      est.histograma.forEach((t, i) => {
        const barra = '█'.repeat(Math.max(0, Math.round((t.count / maxTramo) * 22)));
        const col = COLORES_TRAMO[i] || { bg: C.grisBg, text: C.grisText };
        aoa.push([
          cell(t.etiqueta, S_celda({font:{bold:true,sz:10,color:{rgb:col.text}}, fill:{fgColor:{rgb:col.bg}}})),
          cell(t.count, S_celdaCentro({font:{bold:true,sz:10,color:{rgb:col.text}}, fill:{fgColor:{rgb:col.bg}}})),
          cell(t.pct + '%', S_celdaCentro({font:{bold:true,sz:10,color:{rgb:col.text}}, fill:{fgColor:{rgb:col.bg}}})),
          cell(barra, S_celda({font:{color:{rgb:col.text}}, fill:{fgColor:{rgb:col.bg}}})),
          cell('', S_celda({fill:{fgColor:{rgb:col.bg}}}))
        ]);
      });
      aoa.push([cell('')]); aoa.push([cell('')]);
    }

    // Sección global
    const filaTop = aoa.length;
    aoa.push([
      cell('TOP ERRORES DE LA CLASE', S_seccion()),
      cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion())
    ]);
    merges.push(merge(filaTop,0,filaTop,4));

    aoa.push([
      cell('#',         S_cabeceraTabla()),
      cell('Función',   S_cabeceraTabla()),
      cell('Errores',   S_cabeceraTabla()),
      cell('% del total', S_cabeceraTabla()),
      cell('Barra',     S_cabeceraTabla())
    ]);

    top.slice(0,15).forEach((e, i) => {
      const barra = maxCount ? '█'.repeat(Math.max(1, Math.round((e.count / maxCount) * 20))) : '';
      aoa.push([
        cell(i+1, S_celdaCentro()),
        cell(e.funcion, S_celda({ font:{bold:true, sz:10, color:{rgb:C.ink}} })),
        cell(e.count, S_celdaCentro()),
        cell(e.pct + '%', S_celdaCentro()),
        cell(barra, S_celda({ font:{ color:{rgb:C.marcaDark} } }))
      ]);
    });
    if (!top.length){
      aoa.push([cell('(sin errores registrados)', S_celda()), cell(''),cell(''),cell(''),cell('')]);
    }

    aoa.push([cell('')]); aoa.push([cell('')]);

    // ── TOP ERRORES DE COMPUESTAS (ponderado por bloques) ───────────────
    // Pilar×3 / Función×2 / Procedimental×1 (decisión Josele 2026-06-15).
    const cp = diag.errores_compuestas || {};
    const totalCP = Object.keys(cp).reduce((s,k) => s + (parseInt(cp[k])||0), 0);
    const CP_BLOQUES = [
      { titulo:'PILAR · Clasificación de la relación', peso:3, bg:C.card1, cats:[
          ['tipo',       'Tipo de composición (coord. / subord. / yuxt.)'],
          ['familia',    'Familia de subordinada (sustantiva / relativa / construcción)'],
          ['subtipo',    'Subtipo concreto'] ] },
      { titulo:'FUNCIÓN · Función de la subordinada', peso:2, bg:C.card3, cats:[
          ['funcion',    'Función de la subordinada'],
          ['funcion_sp', 'Función del SP (término de preposición)'] ] },
      { titulo:'PROCEDIMENTAL · Pasos previos', peso:1, bg:C.card4, cats:[
          ['verbos',     'Identificar núcleos verbales'],
          ['nexos',      'Identificar nexos'],
          ['delimitar',  'Delimitar proposiciones'],
          ['direccion',  'Dirección de la dependencia'] ] }
    ];
    // Máximo índice ponderado (count × peso) para escalar las barras.
    let maxIdxCP = 0;
    CP_BLOQUES.forEach(b => b.cats.forEach(([k]) => {
      const idx = (parseInt(cp[k])||0) * b.peso;
      if (idx > maxIdxCP) maxIdxCP = idx;
    }));

    aoa.push([
      cell('TOP ERRORES DE COMPUESTAS (ponderado)', S_seccion()),
      cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion())
    ]);
    merges.push(merge(aoa.length-1,0,aoa.length-1,4));
    aoa.push([
      cell('Índice = errores × peso del bloque. Pilar ×3 · Función ×2 · Procedimental ×1.',
        S_celda({ font:{ italic:true, sz:9, color:{rgb:C.muted} } })),
      cell(''),cell(''),cell(''),cell('')
    ]);
    merges.push(merge(aoa.length-1,0,aoa.length-1,4));

    if (!totalCP){
      aoa.push([cell('(sin exámenes de compuestas registrados en este rango)', S_celda()), cell(''),cell(''),cell(''),cell('')]);
      aoa.push([cell('')]); aoa.push([cell('')]);
    } else {
      CP_BLOQUES.forEach(b => {
        // Subcabecera del bloque
        aoa.push([
          cell(b.titulo + '  (peso ×' + b.peso + ')', S_celda({
            font:{ bold:true, sz:11, color:{rgb:C.marcaDark} },
            fill:{ fgColor:{rgb:b.bg} }
          })),
          cell('', S_celda({ fill:{ fgColor:{rgb:b.bg} } })),
          cell('', S_celda({ fill:{ fgColor:{rgb:b.bg} } })),
          cell('', S_celda({ fill:{ fgColor:{rgb:b.bg} } })),
          cell('', S_celda({ fill:{ fgColor:{rgb:b.bg} } }))
        ]);
        aoa.push([
          cell('Categoría', S_cabeceraTabla()),
          cell('Errores',   S_cabeceraTabla()),
          cell('Peso',      S_cabeceraTabla()),
          cell('Índice',    S_cabeceraTabla()),
          cell('Barra',     S_cabeceraTabla())
        ]);
        b.cats.forEach(([k, etiqueta]) => {
          const n = parseInt(cp[k]) || 0;
          const idx = n * b.peso;
          const barra = maxIdxCP ? '█'.repeat(Math.max(0, Math.round((idx / maxIdxCP) * 20))) : '';
          aoa.push([
            cell(etiqueta, S_celda({ font:{ sz:10, color:{rgb:C.ink} } })),
            cell(n,        S_celdaCentro()),
            cell('×' + b.peso, S_celdaCentro({ font:{ sz:10, color:{rgb:C.muted} } })),
            cell(idx,      S_celdaCentro({ font:{ bold:true, sz:10, color:{rgb:C.marcaDark} } })),
            cell(barra,    S_celda({ font:{ color:{rgb:C.marcaDark} } }))
          ]);
        });
        aoa.push([cell('')]);
      });
      aoa.push([cell('')]);
    }

    // Por grupo
    const grupos = datos.por_grupo || [];
    if (grupos.length){
      aoa.push([
        cell('TOP ERRORES POR GRUPO', S_seccion()),
        cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion()),cell('', S_seccion())
      ]);
      merges.push(merge(aoa.length-1,0,aoa.length-1,4));

      grupos.forEach(g => {
        aoa.push([cell('')]);
        aoa.push([
          cell('Grupo ' + g.nombre, S_celda({
            font:{ bold:true, sz:11, color:{rgb:C.marcaDark} },
            fill:{ fgColor:{rgb:C.subheader} }
          })),
          cell('Media: ' + fmtNota(g.nota_media), S_celdaCentro({
            fill:{ fgColor:{rgb:C.subheader} },
            font:{ sz:10, color:{rgb:C.muted} }
          })),
          cell('Aprobados: ' + (g.pct_aprobados||0) + '%', S_celdaCentro({
            fill:{ fgColor:{rgb:C.subheader} },
            font:{ sz:10, color:{rgb:C.muted} }
          })),
          cell('', S_celda({ fill:{ fgColor:{rgb:C.subheader} } })),
          cell('', S_celda({ fill:{ fgColor:{rgb:C.subheader} } }))
        ]);
        aoa.push([
          cell('#',       S_cabeceraTabla()),
          cell('Función', S_cabeceraTabla()),
          cell('Errores', S_cabeceraTabla()),
          cell('', S_cabeceraTabla()),
          cell('', S_cabeceraTabla())
        ]);
        const gMax = (g.diagnostico || []).length ? g.diagnostico[0].count : 0;
        const gtop = (g.diagnostico || []).slice(0,5);
        if (gtop.length){
          gtop.forEach((e,i) => {
            const barra = gMax ? '█'.repeat(Math.max(1, Math.round((e.count / gMax) * 18))) : '';
            aoa.push([
              cell(i+1, S_celdaCentro()),
              cell(e.funcion, S_celda()),
              cell(e.count, S_celdaCentro()),
              cell(barra, S_celda({ font:{ color:{rgb:C.marcaDark} } })),
              cell('', S_celda())
            ]);
          });
        } else {
          aoa.push([cell('(sin errores)', S_celda()), cell(''),cell(''),cell(''),cell('')]);
        }
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:6}, {wch:24}, {wch:11}, {wch:12}, {wch:32}];
    ws['!rows'] = [{ hpt:28 }, { hpt:24 }];
    ws['!merges'] = merges;
    return ws;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HOJA — DETALLE POR ACTIVIDAD
  // ════════════════════════════════════════════════════════════════════════
  function buildDetalle(datos){
    const aoa = [];
    const merges = [];
    const det = datos.detalle || [];

    aoa.push([cell('DETALLE POR ACTIVIDAD', S_titulo()),
              cell(''),cell(''),cell(''),cell(''),cell(''),cell('')]);
    merges.push(merge(0,0,0,6));

    aoa.push([cell(det.length + ' actividades en el rango seleccionado', S_subtitulo()),
              cell(''),cell(''),cell(''),cell(''),cell(''),cell('')]);
    merges.push(merge(1,0,1,6));

    aoa.push([cell('')]);

    const headers = ['Fecha','Grupo','Alumno','Tipo','Nota','Tiempo (min)','Detalle'];
    aoa.push(headers.map(h => cell(h, S_cabeceraTabla())));
    const headerRow = aoa.length;

    det.forEach(d => {
      aoa.push([
        cell(d.fecha ? fechaCorta(d.fecha) : '—', S_celdaCentro()),
        cell(d.grupo || '', S_celda()),
        cell(d.nombre || '', S_celda()),
        cell(d.tipo || '', S_celda({ font:{sz:9, color:{rgb:C.muted}} })),
        cell(fmtNota(d.nota), S_nota(d.nota)),
        cell(d.tiempo_min !== null && d.tiempo_min !== undefined ? d.tiempo_min : '—', S_celdaCentro()),
        cell(d.info || '', S_celda({ font:{sz:9, color:{rgb:C.muted}} }))
      ]);
    });
    if (!det.length){
      aoa.push([cell('(sin actividades en el rango)', S_celda()), cell(''),cell(''),cell(''),cell(''),cell(''),cell('')]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:12}, {wch:12}, {wch:26}, {wch:24}, {wch:9}, {wch:11}, {wch:36}];
    ws['!rows'] = [{ hpt:28 }, { hpt:18 }];
    ws['!merges'] = merges;
    ws['!freeze'] = { xSplit:0, ySplit:headerRow };
    if (det.length){
      ws['!autofilter'] = { ref: 'A' + headerRow + ':G' + (headerRow + det.length) };
    }
    return ws;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HOJA — EVOLUCIÓN POR ALUMNO (jul-2026)
  //  Reutiliza datos.detalle (ya trae correo/nombre/grupo/fecha/nota por
  //  actividad, sin tocar el backend) agrupado por alumno y ordenado
  //  cronológicamente. La "tendencia" es un mini-gráfico de texto (Unicode
  //  ▁▂▃▄▅▆▇█, no un SPARKLINE real: esa función es de Google Sheets, no
  //  existe en Excel — un SPARKLINE de fórmula se vería como #NAME? al abrir
  //  el .xlsx en Excel).
  // ════════════════════════════════════════════════════════════════════════
  const SPARK_CHARS = '▁▂▃▄▅▆▇█';
  function sparklineTexto_(notas){
    if (!notas.length) return '';
    return notas.map(n => {
      const idx = Math.max(0, Math.min(7, Math.round((n/10)*7)));
      return SPARK_CHARS[idx];
    }).join('');
  }

  function buildEvolucion(datos){
    const aoa = [];
    const merges = [];
    const det = (datos.detalle || []).slice();

    aoa.push([cell('EVOLUCIÓN POR ALUMNO', S_titulo()), cell(''),cell(''),cell(''),cell('')]);
    merges.push(merge(0,0,0,4));
    aoa.push([
      cell('Todas las actividades de cada alumno en el rango, en orden cronológico, con su tendencia de nota.', S_subtitulo()),
      cell(''),cell(''),cell(''),cell('')
    ]);
    merges.push(merge(1,0,1,4));
    aoa.push([cell('')]);

    // Agrupar por correo (clave estable); si falta, cae a nombre en minúsculas.
    const porAlumno = {};
    det.forEach(d => {
      const key = String(d.correo || d.nombre || '').trim().toLowerCase() || '(sin identificar)';
      if (!porAlumno[key]) porAlumno[key] = { nombre: d.nombre || '(sin nombre)', grupo: d.grupo || '', items: [] };
      if (!porAlumno[key].nombre && d.nombre) porAlumno[key].nombre = d.nombre;
      if (!porAlumno[key].grupo && d.grupo) porAlumno[key].grupo = d.grupo;
      porAlumno[key].items.push(d);
    });

    const alumnos = Object.values(porAlumno).sort((a,b) => {
      const g = (a.grupo||'').localeCompare(b.grupo||'');
      return g !== 0 ? g : (a.nombre||'').localeCompare(b.nombre||'');
    });

    if (!alumnos.length){
      aoa.push([cell('(sin actividades en el rango)', S_celda()), cell(''),cell(''),cell(''),cell('')]);
    }

    alumnos.forEach(al => {
      al.items.sort((a,b) => new Date(a.fecha||0) - new Date(b.fecha||0));
      const notas = al.items.map(i => i.nota).filter(n => n !== null && n !== undefined && !isNaN(n));
      const media = notas.length ? notas.reduce((a,b)=>a+b,0)/notas.length : null;
      let tendencia = '—';
      if (notas.length >= 2){
        const delta = notas[notas.length-1] - notas[0];
        tendencia = delta > 0.3 ? '↑ mejora' : (delta < -0.3 ? '↓ empeora' : '→ estable');
      }

      // Cabecera del alumno: nombre·grupo | sparkline de texto | nota media | tendencia
      const filaAlumno = aoa.length;
      aoa.push([
        cell(al.nombre + (al.grupo ? '  ·  ' + al.grupo : ''),
          S_celda({ font:{bold:true, sz:12, color:{rgb:C.marcaDark}}, fill:{fgColor:{rgb:C.subheader}} })),
        cell(sparklineTexto_(notas), S_celdaCentro({ fill:{fgColor:{rgb:C.subheader}}, font:{sz:14, color:{rgb:C.marcaDark}} })),
        cell(media !== null ? fmtNota(media) : '—', media !== null ? S_nota(media) : S_celdaCentro({fill:{fgColor:{rgb:C.subheader}}})),
        cell(tendencia, S_celdaCentro({ fill:{fgColor:{rgb:C.subheader}}, font:{bold:true, sz:10, color:{rgb:C.muted}} })),
        cell('', S_celda({ fill:{fgColor:{rgb:C.subheader}} }))
      ]);
      merges.push(merge(filaAlumno,0,filaAlumno,0));

      // Cabecera de la tabla de actividades de este alumno
      aoa.push([
        cell('Fecha',  S_cabeceraTabla()),
        cell('Tipo',   S_cabeceraTabla()),
        cell('Nota',   S_cabeceraTabla()),
        cell('Tiempo (min)', S_cabeceraTabla()),
        cell('Info',   S_cabeceraTabla())
      ]);

      al.items.forEach(it => {
        aoa.push([
          cell(it.fecha ? fechaCorta(it.fecha) : '—', S_celdaCentro()),
          cell(it.tipo || '', S_celda({ font:{sz:9, color:{rgb:C.muted}} })),
          cell(fmtNota(it.nota), S_nota(it.nota)),
          cell(it.tiempo_min !== null && it.tiempo_min !== undefined ? it.tiempo_min : '—', S_celdaCentro()),
          cell(it.info || '', S_celda({ font:{sz:9, color:{rgb:C.muted}} }))
        ]);
      });

      aoa.push([cell('')]); // separador entre alumnos
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:26}, {wch:14}, {wch:9}, {wch:13}, {wch:40}];
    ws['!merges'] = merges;
    return ws;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HOJA — EXAMEN INDIVIDUAL
  // ════════════════════════════════════════════════════════════════════════
  function buildExamen(ex){
    const aoa = [];
    const merges = [];
    aoa.push([cell('EXAMEN: ' + (ex.nombre || '(sin nombre)'), S_titulo()),
              cell(''),cell(''),cell('')]);
    merges.push(merge(0,0,0,3));

    const meta = [
      ex.modulo ? ex.modulo : '',
      'PIN: ' + ex.pin,
      ex.grupo ? 'Grupo: ' + ex.grupo : '',
      ex.evaluacion ? 'Evaluación: ' + ex.evaluacion : ''
    ].filter(Boolean).join('  ·  ');
    aoa.push([cell(meta, S_subtitulo()), cell(''),cell(''),cell('')]);
    merges.push(merge(1,0,1,3));

    aoa.push([cell('')]);

    // Tarjetones: intentos / media / aprobados
    aoa.push([
      cell('INTENTOS',     S_cardLabel(C.card1)),
      cell('NOTA MEDIA',   S_cardLabel(C.card3)),
      cell('% APROBADOS',  S_cardLabel(C.card4)),
      cell('FECHA',        S_cardLabel(C.card2))
    ]);
    aoa.push([
      cell(String(ex.intentos || 0),                S_cardValor(C.card1)),
      cell(fmtNota(ex.media),                       S_cardValor(C.card3)),
      cell((ex.pct_aprobados || 0) + '%',           S_cardValor(C.card4)),
      cell(ex.fecha_creacion ? fechaCorta(ex.fecha_creacion) : '—', S_cardValor(C.card2))
    ]);

    aoa.push([cell('')]);

    aoa.push([cell('CALIFICACIONES', S_seccion()), cell('', S_seccion()), cell('', S_seccion()), cell('', S_seccion())]);
    merges.push(merge(aoa.length-1, 0, aoa.length-1, 3));

    aoa.push([
      cell('Fecha',  S_cabeceraTabla()),
      cell('Alumno', S_cabeceraTabla()),
      cell('Grupo',  S_cabeceraTabla()),
      cell('Nota',   S_cabeceraTabla())
    ]);
    const headerRow = aoa.length;
    (ex.alumnos || []).forEach(a => {
      aoa.push([
        cell(a.fecha ? fechaCorta(a.fecha) : '—', S_celdaCentro()),
        cell(a.nombre || '', S_celda()),
        cell(a.grupo || '', S_celdaCentro()),
        cell(fmtNota(a.nota), S_nota(a.nota))
      ]);
    });
    if (!(ex.alumnos || []).length){
      aoa.push([cell('(sin intentos)', S_celda()), cell(''),cell(''),cell('')]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:12}, {wch:28}, {wch:14}, {wch:10}];
    ws['!rows'] = [{ hpt:28 }, { hpt:18 }, {}, { hpt:22 }, { hpt:42 }];
    ws['!merges'] = merges;
    return ws;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ENTRY POINT
  // ════════════════════════════════════════════════════════════════════════
  function generarExcelInforme(datos){
    if (typeof XLSX === 'undefined'){
      throw new Error('Librería XLSX no cargada (lazy load falló).');
    }
    const wb = XLSX.utils.book_new();

    // 1. Resumen
    XLSX.utils.book_append_sheet(wb, buildResumen(datos),
                                  nombreHojaSeguro('📋 Resumen'));

    // 2. Pestañas por grupo (regla adaptativa: 2-6 grupos)
    const grupos = datos.por_grupo || [];
    if (grupos.length >= 2 && grupos.length <= 6){
      grupos.forEach(g => {
        const correosGrupo = new Set(g.correos || []);
        const alumnosGrupo = (datos.alumnos || []).filter(a => correosGrupo.has(a.correo));
        const sub = (g.alumnos || 0) + ' alumnos · '
                  + (g.actividades || 0) + ' actividades · '
                  + 'media ' + fmtNota(g.nota_media) + ' · '
                  + (g.pct_aprobados || 0) + '% aprobados';
        const ws = buildAlumnos(alumnosGrupo, '👥 GRUPO ' + g.nombre, sub);
        XLSX.utils.book_append_sheet(wb, ws, nombreHojaSeguro('👥 ' + g.nombre, 31));
      });
    }

    // 3. Alumnos (todos)
    const r = datos.resumen || {};
    const subAll = (r.total_alumnos || 0) + ' alumnos · '
                 + (r.total_actividades || 0) + ' actividades · '
                 + 'media ' + fmtNota(r.nota_media) + ' · '
                 + (r.pct_aprobados || 0) + '% aprobados';
    XLSX.utils.book_append_sheet(wb,
      buildAlumnos(datos.alumnos || [], '👥 ALUMNOS (TODOS)', subAll),
      nombreHojaSeguro('👥 Alumnos'));

    // 3.5 Evolución por alumno (jul-2026)
    XLSX.utils.book_append_sheet(wb, buildEvolucion(datos),
                                  nombreHojaSeguro('📈 Evolución'));

    // 4. Diagnóstico
    XLSX.utils.book_append_sheet(wb, buildDiagnostico(datos),
                                  nombreHojaSeguro('🎯 Diagnóstico'));

    // 5. Detalle
    XLSX.utils.book_append_sheet(wb, buildDetalle(datos),
                                  nombreHojaSeguro('📝 Detalle'));

    // 6. Una pestaña por examen (solo si hay)
    const examenes = datos.examenes || [];
    examenes.forEach((ex, i) => {
      const nombreBase = '📊 ' + (ex.nombre || ('Examen ' + (i+1)));
      XLSX.utils.book_append_sheet(wb, buildExamen(ex), nombreHojaSeguro(nombreBase, 31));
    });

    // Nombre del fichero
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2,'0');
    const mm = String(hoy.getMonth()+1).padStart(2,'0');
    const filename = 'informe-clase-' + hoy.getFullYear() + '-' + mm + '-' + dd + '.xlsx';

    XLSX.writeFile(wb, filename);
  }

  if (typeof window !== 'undefined'){
    window.generarExcelInforme = generarExcelInforme;
  }
})();
