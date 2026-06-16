// ════════════════════════════════════════════════════════════════════════
//  EnviarInformes.gs — Envío de informes personales por correo al alumnado
//  ----------------------------------------------------------------------
//  El profesor abre un diálogo desde el menú "🎓 Taller de Sintaxis →
//  📧 Enviar informes a alumnos…", elige un rango de fechas y un grupo,
//  carga la lista de alumnos (con su nota y nº de errores), marca a quién
//  enviar (todos por defecto, o sueltos) y confirma. A cada alumno le llega
//  un correo con su nota y las funciones que más falla.
//
//  Reutiliza la MISMA agregación del informe Excel (getInformeProfesor_),
//  así que no recalcula nada: nota media + errores_top por alumno.
//
//  Sustituye al GAS suelto de Gemini (enviarCorreosAlumnos): aquel solo
//  volcaba la fila de la hoja "Alumnos" sin informe de errores. NO se debe
//  pegar aquel en el proyecto porque su onOpen choca con el de Code_v6.gs.
//
//  Las funciones SIN guion bajo final (efCargarAlumnos, efEnviarInformes)
//  son las que invoca el diálogo vía google.script.run; las _privadas no se
//  exponen.
// ════════════════════════════════════════════════════════════════════════

// Punto de entrada del menú (ver onOpen en Code_v6.gs).
function menuEnviarInformesAlumnos() {
  const html = HtmlService.createHtmlOutput(_efDialogHtml_())
    .setWidth(460)
    .setHeight(560)
    .setTitle('📧 Enviar informes a alumnos');
  SpreadsheetApp.getUi().showModalDialog(html, '📧 Enviar informes a alumnos');
}

// ── Servidor: cargar la lista de alumnos para el diálogo ────────────────
// params: { from:'YYYY-MM-DD', to:'YYYY-MM-DD', grupo:'' }
// Devuelve { ok, rango, grupos:[...], alumnos:[{correo,nombre,grupo,nota,nErrores,top}] }
function efCargarAlumnos(params) {
  try {
    const inf = getInformeProfesor_({
      from:  params.from || '',
      to:    params.to   || '',
      grupo: params.grupo || '',
      tipo:  'todo'
    });
    if (!inf || !inf.ok) return { ok: false, error: (inf && inf.error) || 'No se pudo leer el informe.' };

    const alumnos = (inf.alumnos || [])
      .filter(a => a.correo && a.correo.indexOf('@') > -1)
      .map(a => ({
        correo:   a.correo,
        nombre:   a.nombre || a.correo,
        grupo:    a.grupo || '',
        nota:     (a.nota_media === null || a.nota_media === undefined) ? null : a.nota_media,
        nErrores: (a.errores_top || []).reduce((s, e) => s + (e.count || 0), 0),
        top:      (a.errores_top || []).slice(0, 5)
      }));

    // Lista de grupos disponibles (para el desplegable del diálogo)
    const grupos = {};
    (inf.alumnos || []).forEach(a => { if (a.grupo) grupos[a.grupo] = true; });

    return {
      ok: true,
      rango: (inf.rango ? (inf.rango.desde + ' a ' + inf.rango.hasta) : ''),
      grupos: Object.keys(grupos).sort(),
      alumnos: alumnos
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Servidor: enviar los correos a los alumnos seleccionados ────────────
// payload: { correos:[...], from, to, grupo }
function efEnviarInformes(payload) {
  try {
    const correos = (payload && payload.correos) || [];
    if (!correos.length) return { ok: false, error: 'No hay alumnos seleccionados.' };

    const inf = getInformeProfesor_({
      from:  payload.from || '',
      to:    payload.to   || '',
      grupo: payload.grupo || '',
      tipo:  'todo'
    });
    if (!inf || !inf.ok) return { ok: false, error: (inf && inf.error) || 'No se pudo leer el informe.' };

    const rango = inf.rango ? (inf.rango.desde + ' a ' + inf.rango.hasta) : '';
    const porCorreo = {};
    (inf.alumnos || []).forEach(a => { if (a.correo) porCorreo[a.correo.toLowerCase()] = a; });

    const seleccion = {};
    correos.forEach(c => { seleccion[String(c).toLowerCase()] = true; });

    let enviados = 0;
    const fallos = [];
    Object.keys(seleccion).forEach(correo => {
      const al = porCorreo[correo];
      if (!al) { fallos.push(correo + ' (sin datos)'); return; }
      try {
        GmailApp.sendEmail(
          al.correo,
          'Tu informe del Taller de Sintaxis',
          _construirCuerpoInformeAlumno_(al, rango)
        );
        enviados++;
      } catch (e) {
        fallos.push(al.correo + ' (' + e.message + ')');
      }
    });

    return { ok: true, enviados: enviados, fallos: fallos };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Cuerpo del correo personal de un alumno (texto plano) ───────────────
function _construirCuerpoInformeAlumno_(al, rango) {
  function n1(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : Number(x).toFixed(1); }
  const L = [];
  L.push('Hola ' + (al.nombre || '') + ':');
  L.push('');
  L.push('Este es tu informe personal del Taller de Sintaxis' + (rango ? ' (' + rango + ')' : '') + '.');
  L.push('');
  L.push('📊 Tu nota media: ' + n1(al.nota_media) + ' / 10');

  const sp = al.simples_practica || {}, se = al.simples_examen || {}, cp = al.compuestas || {};
  const detalles = [];
  if (sp.ejercicios) detalles.push('  · Práctica de oración simple: ' + n1(sp.nota_media) + ' (' + sp.ejercicios + ' oraciones)');
  if (se.intentos)   detalles.push('  · Exámenes de oración simple: ' + n1(se.nota_media));
  if (cp.intentos)   detalles.push('  · Oración compuesta: ' + n1(cp.nota_media));
  if (detalles.length) { L.push(''); L.push.apply(L, detalles); }

  const top = (al.errores_top || []).slice(0, 5);
  if (top.length) {
    L.push('');
    L.push('📌 Lo que más conviene que repases:');
    top.forEach((e, i) => {
      L.push('  ' + (i + 1) + '. ' + e.funcion + ' — ' + e.count + (e.count === 1 ? ' error' : ' errores'));
    });
    L.push('');
    L.push('Dedícale un repaso a esas funciones y verás cómo sube tu nota. ¡Tú puedes!');
  } else {
    L.push('');
    L.push('¡No tienes errores destacados registrados! Sigue así.');
  }

  L.push('');
  L.push('Un saludo,');
  L.push('Tu profesor');
  return L.join('\n');
}

// ── HTML del diálogo de selección y envío ───────────────────────────────
function _efDialogHtml_() {
  // Fechas por defecto: últimos 60 días.
  const hoy = new Date();
  const desde = new Date(hoy.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 10);

  return `
<!DOCTYPE html><html><head><base target="_top">
<style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1f2937;margin:0;padding:14px}
  h3{margin:0 0 8px;color:#312E81}
  label{font-weight:bold;font-size:12px;color:#6b7280;display:block;margin:8px 0 2px}
  input,select{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px}
  .row{display:flex;gap:8px}.row>div{flex:1}
  button{cursor:pointer;border:none;border-radius:6px;padding:8px 12px;font-size:13px;font-weight:bold}
  .primary{background:#4F46E5;color:#fff}.ghost{background:#eef2ff;color:#312E81}
  #lista{max-height:230px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;margin-top:8px;padding:6px}
  .al{display:flex;align-items:center;gap:8px;padding:4px 2px;border-bottom:1px solid #f3f4f6}
  .al small{color:#6b7280}
  #msg{margin-top:10px;font-size:12px;min-height:18px}
  .barra{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
</style></head><body>
  <h3>📧 Enviar informes a alumnos</h3>
  <div class="row">
    <div><label>Desde</label><input type="date" id="from" value="${fmt(desde)}"></div>
    <div><label>Hasta</label><input type="date" id="to" value="${fmt(hoy)}"></div>
  </div>
  <label>Grupo (vacío = todos)</label>
  <input type="text" id="grupo" placeholder="(todos)">
  <div class="barra">
    <button class="ghost" onclick="cargar()">🔄 Cargar alumnos</button>
    <span id="cuenta" style="font-size:12px;color:#6b7280"></span>
  </div>
  <div id="lista"><small style="color:#9ca3af">Pulsa "Cargar alumnos" para empezar.</small></div>
  <div class="barra">
    <label style="margin:0"><input type="checkbox" id="todos" onclick="marcarTodos()" style="width:auto"> Marcar/desmarcar todos</label>
    <button class="primary" onclick="enviar()">✉️ Enviar a seleccionados</button>
  </div>
  <div id="msg"></div>

<script>
  function params(){return {from:document.getElementById('from').value,to:document.getElementById('to').value,grupo:document.getElementById('grupo').value.trim()};}
  function setMsg(t,c){var m=document.getElementById('msg');m.textContent=t;m.style.color=c||'#6b7280';}
  function cargar(){
    setMsg('⏳ Cargando…');
    document.getElementById('lista').innerHTML='';
    google.script.run.withSuccessHandler(pintar).withFailureHandler(function(e){setMsg('⚠ '+e.message,'#b91c1c');}).efCargarAlumnos(params());
  }
  function pintar(r){
    if(!r.ok){setMsg('⚠ '+(r.error||'Error'),'#b91c1c');return;}
    var L=document.getElementById('lista');
    if(!r.alumnos.length){L.innerHTML='<small style="color:#9ca3af">Sin alumnos en ese rango/grupo.</small>';setMsg('');document.getElementById('cuenta').textContent='';return;}
    L.innerHTML=r.alumnos.map(function(a){
      var nota=(a.nota===null)?'—':a.nota.toFixed(1);
      return '<div class="al"><input type="checkbox" class="ck" value="'+a.correo+'" checked style="width:auto">'
        +'<div><b>'+a.nombre+'</b> <small>'+(a.grupo||'')+'</small><br><small>Nota '+nota+' · '+a.nErrores+' errores</small></div></div>';
    }).join('');
    document.getElementById('todos').checked=true;
    actualizarCuenta();
    setMsg('✓ '+r.alumnos.length+' alumnos cargados ('+r.rango+').','#047857');
  }
  function marcarTodos(){var c=document.getElementById('todos').checked;document.querySelectorAll('.ck').forEach(function(x){x.checked=c;});actualizarCuenta();}
  function actualizarCuenta(){var n=document.querySelectorAll('.ck:checked').length;document.getElementById('cuenta').textContent=n+' seleccionados';}
  document.addEventListener('change',function(e){if(e.target.classList&&e.target.classList.contains('ck'))actualizarCuenta();});
  function enviar(){
    var correos=Array.prototype.map.call(document.querySelectorAll('.ck:checked'),function(x){return x.value;});
    if(!correos.length){setMsg('Selecciona al menos un alumno.','#b45309');return;}
    if(!confirm('Se enviará un correo a '+correos.length+' alumno(s). ¿Continuar?'))return;
    setMsg('⏳ Enviando '+correos.length+' correos…');
    var p=params();p.correos=correos;
    google.script.run.withSuccessHandler(function(r){
      if(!r.ok){setMsg('⚠ '+(r.error||'Error'),'#b91c1c');return;}
      var t='✓ Enviados '+r.enviados+' correos.';
      if(r.fallos&&r.fallos.length)t+=' Fallos: '+r.fallos.join(', ');
      setMsg(t, r.fallos&&r.fallos.length?'#b45309':'#047857');
    }).withFailureHandler(function(e){setMsg('⚠ '+e.message,'#b91c1c');}).efEnviarInformes(p);
  }
</script>
</body></html>`;
}
