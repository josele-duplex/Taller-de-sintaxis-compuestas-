/* compuestas/index.js — Modulo de oraciones compuestas (CP)
   Extraido de index.html (Paso 9 sub-paso 1 de la migracion, mayo 2026)
   Lineas originales: 7693-11355 (IIFE completo).

   Cambio respecto al original:
   - Eliminada la primera de las dos definiciones duplicadas de
     'function mostrarToast' (lineas originales 10788-10817). En el
     index.html sloppy mode la segunda sobreescribia a la primera; en
     ES modules (strict) hay que dejar una sola. Comportamiento en
     runtime identico al original. Bug menor anotado en deuda_tecnica.md.

   El IIFE original se convierte en este modulo ES6:
   - El estado privado (state) queda como variable a nivel de modulo,
     equivalente al closure del IIFE.
   - Las funciones internas siguen siendo privadas (no exportadas).
   - El objeto que retornaba el IIFE se exporta como 'export const CP'.
   - Se asigna window.CP para compatibilidad con onclick='CP.X()' del HTML.

   Dependencias temporales en globales (resolveran via window.X tras
   Paso 10): getApiUrl, fetchWithRetry, fetchWithTimeout, playSuccess,
   playError, playComplete, playClick, awardXP, onSentenceCompleted,
   trackError, showCombo, showLevelUp. escHtml/escAttr se definen
   internamente al final del modulo. */

  let _examTimerInterval = null;

  const state = {
    ejercicios: [],         // banco completo (49+ ejercicios)
    filtered: [],           // banco tras aplicar filtros
    idx: 0,                 // índice actual dentro de filtered
    filtros: {              // filtros activos — inclusión (sets de strings)
      tipo:     new Set(),
      subtipo:  new Set(),
      nivel:    new Set(),
      n_props:  new Set()   // valores numéricos como strings ('2', '3', '4')
    },
    filtrosExcl: {          // filtros activos — exclusión dura
      tipo:     new Set(),
      subtipo:  new Set(),
      nivel:    new Set(),
      n_props:  new Set()
    },
    solucionVisible: false, // toggle de la caja de soluciones
    loaded: false,
    loadError: '',
    // ── Modo examen (Fase 1.5, mayo 2026) ────────────────────────────
    modoExamen: false,      // true cuando se cargó un examen por PIN
    examPin: '',            // PIN del examen activo
    examGrupo: '',          // grupo del examen (devuelto por GAS)
    examEval: '',           // evaluación del examen
    examName: '',           // nombre legible del examen
    examTimerMin: 0,        // duración del examen en minutos (0 = sin límite)
    examFasesActivas: null, // array de fases activas del examen ([0..5] = sin F6, [0..6] = con F6). null = práctica libre.
    examEmail: '',          // correo del alumno (recogido en formulario PIN)
    examAlumno: '',         // nombre del alumno
    examTiempoRestanteS: 0, // segundos restantes del countdown
    examTimerRunning: false, // true mientras el countdown está activo
    ejerciciosBanco: null,  // copia del banco antes de cargar el examen (para restaurar al salir)
    // ── Recolección de resultados del examen (Fase 1.5.C) ────────────
    // En examen NO enviamos por ejercicio (como hacemos en práctica).
    // Recolectamos cada resultado aquí y, al final, hacemos un único
    // envío agregado al endpoint saveResultadoCompuesta (singular).
    examResultados: [],     // array de payloads por ejercicio
    examEnviado: false,     // true tras envío agregado exitoso
    examEnviando: false,    // hay un envío en curso
    examErrorEnvio: '',     // último error del envío agregado
    // ── Persistencia ────────────────────────────────────────────────
    sessionId: generarSessionId(),   // ID anónimo de esta carga de página
    enviosPendientes: new Map(),     // Map<ejercicioId, payload> para reintentos
    // ── Resumen de sesión de práctica (mayo 2026) ───────────────────
    // Lista de ejercicios terminados en la sesión actual de práctica.
    // Se reinicia cada vez que se entra a iniciarPractica().
    // Solo se registra el PRIMER paso por el resumen de cada ejercicio;
    // si el alumno revisita un ejercicio anterior no se duplica.
    sessionResults: []               // [{id, texto, nota, aciertos, errores, internaHecha, tsISO}]
  };
  window.__CP_STATE__ = state; // depuración

  // Generar un ID de sesión anónimo. Formato: CP-AAAAMMDD-HHMMSS-XXXX (4 chars random)
  function generarSessionId(){
    const now = new Date();
    const ts = now.getFullYear().toString()
      + String(now.getMonth()+1).padStart(2,'0')
      + String(now.getDate()).padStart(2,'0')
      + '-'
      + String(now.getHours()).padStart(2,'0')
      + String(now.getMinutes()).padStart(2,'0')
      + String(now.getSeconds()).padStart(2,'0');
    const rnd = Math.floor(Math.random()*0x10000).toString(16).padStart(4,'0').toUpperCase();
    return 'CP-' + ts + '-' + rnd;
  }

  // A5: ¿Está la fase 6 (análisis interno) habilitada para la sesión actual?
  // - Práctica libre: siempre sí (el alumno decide en el pre-resumen).
  // - Examen: solo si state.examFasesActivas incluye el 6 (el profesor
  //   marcó "Pedir análisis interno" al crear el examen).
  function f6Habilitada(){
    if(!state.modoExamen) return true;
    return Array.isArray(state.examFasesActivas) && state.examFasesActivas.includes(6);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Entrada al módulo
  //
  // Nuevo flujo (mayo 2026, paridad con Sint): tras cargar el banco se
  // arranca DIRECTAMENTE con una oración aleatoria. El panel de filtros
  // se oculta y queda accesible mediante el botón "Filtros" del topbar
  // (volverFiltros). Cualquier filtro que aplique el alumno mezcla el
  // resultado y vuelve a la primera oración.
  // ─────────────────────────────────────────────────────────────────────
  function shuffleArr(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  async function enter(){
    showScreen('screen-compuestas');
    if(!state.loaded){
      await loadBanco();
    }
    if(state.loadError){
      renderError();
      return;
    }
    // Por defecto: banco completo (sin filtros), mezclado, primera oración.
    state.filtered = state.ejercicios.slice();

    // Fase 1.7: selector de misiones antes de empezar (paridad con Sint)
    if(typeof getMisionesForMode === 'function'){
      const misiones = await getMisionesForMode('compuestas');
      const errorHist = JSON.parse(localStorage.getItem('taller_error_history')||'{}');
      const hasErrors = Object.keys(errorHist.compuestas||{}).length > 0;
      if(misiones.length > 0 || hasErrors){
        showMissionSelector({modo:'compuestas', _continue: iniciarPractica});
        return;
      }
    }

    iniciarPractica();
  }

  // Variante de enter() para cuando se llega desde el login compartido
  // (mayo 2026, Paso 3 del rediseno de login). Diferencias con enter():
  //   1. Recibe name/email/grupo del login y los guarda en state para
  //      que el examen pueda reusarlos sin volver a pedirlos.
  //   2. Aterriza en la pantalla de filtros (renderFiltros), no en la
  //      primera oracion. Esto cumple la Opcion B elegida por el usuario.
  async function enterDesdeLogin({ name, email, grupo } = {}){
    showScreen('screen-compuestas');
    if(!state.loaded){
      await loadBanco();
    }
    if(state.loadError){
      renderError();
      return;
    }
    // Guardar la identidad del login para futuras llamadas (envio de
    // resultados, examen, etc.). state.examAlumno/Email/Grupo se usan ya
    // en validarPIN y en enviarResultadoExamen.
    if(name)  state.examAlumno = String(name).trim();
    if(email) state.examEmail  = String(email).trim().toLowerCase();
    if(grupo) state.examGrupo  = String(grupo).trim();
    // Banco completo (cualquier filtro lo aplicara el alumno desde
    // renderFiltros antes de empezar).
    state.filtered = state.ejercicios.slice();
    renderFiltros();
  }

  // Inicia el modo examen con datos pre-validados desde el login
  // compartido. Hace el fetch al GAS y, si todo va bien, arranca el
  // examen (iniciarPractica). Si falla, lanza un Error con un mensaje
  // legible para que el caller lo muestre en el panel del login.
  async function iniciarExamenDesdeLogin({ name, email, grupo, pin } = {}){
    if(!pin || !/^\d{4,6}$/.test(String(pin))){
      throw new Error('El PIN debe tener entre 4 y 6 digitos numericos.');
    }
    showScreen('screen-compuestas');
    if(!state.loaded){
      await loadBanco();
    }
    // Guardamos identidad antes del fetch (utiles si renderFiltros se
    // pinta despues de un error).
    state.examAlumno = String(name  || '').trim();
    state.examEmail  = String(email || '').trim().toLowerCase();
    state.examGrupo  = String(grupo || '').trim();

    const data = await fetchExamenCompuesta(String(pin).trim());
    const fasesExam = Array.isArray(data.fasesActivas) && data.fasesActivas.length > 0
      ? data.fasesActivas.map(n => parseInt(n)).filter(n => !isNaN(n))
      : [0,1,2,3,4,5,6];
    const validos = data.ejercicios.filter(isValidEjercicio);
    if(validos.length === 0){
      throw new Error('El examen tiene ejercicios pero ninguno pasa la validacion minima.');
    }
    validos.forEach(ej => {
      if(!ej.metadatos) ej.metadatos = {};
      ej.metadatos.fases_activas = fasesExam.slice();
    });
    if(state.ejerciciosBanco === null){
      state.ejerciciosBanco = state.ejercicios;
    }
    state.ejercicios = validos;
    state.filtered   = validos.slice();
    state.idx        = 0;
    state.modoExamen     = true;
    state.examPin        = String(pin).trim();
    state.examEval       = data.evaluacion   || '';
    state.examName       = data.nombreExamen || '';
    state.examTimerMin   = parseInt(data.timer) || 0;
    state.examFasesActivas = fasesExam;
    // Si el examen viene con grupo, prevalece (el profesor lo asigno).
    if(data.grupo) state.examGrupo = data.grupo;
    state.examResultados = [];
    state.examEnviado    = false;
    state.examEnviando   = false;
    state.examErrorEnvio = '';
    console.log('[CP examen] PIN', pin, '·', validos.length, 'ejercicios cargados · grupo:', state.examGrupo, '· eval:', state.examEval);
    showExamenBanner();
    iniciarPractica();
  }

  function exit(){
    if(!confirmarSalidaExamen()) return;
    if(state.modoExamen) salirModoExamen();
    showPortada();
  }
  window.cpExit = exit;

  // ─────────────────────────────────────────────────────────────────────
  // Carga del banco desde el GAS
  // ─────────────────────────────────────────────────────────────────────
  async function loadBanco(){
    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    wrap.innerHTML = `
      <div class="cp-loading">
        <div class="spinner"></div>
        <span>Cargando banco de oraciones compuestas…</span>
      </div>`;
    const apiUrl = getApiUrl();
    if(!apiUrl){
      state.loadError = 'No hay URL de API configurada. Ve al panel del profesor para configurarla.';
      renderError();
      return;
    }
    // Diagnóstico: guardamos el detalle de cada paso para mostrarlo si algo falla
    const diag = { url:'', status:null, contentType:'', rawText:'', parsedKeys:[], parsedSample:'' };
    try{
      const url = `${apiUrl}?action=getOracionesCompuestas&mode=practice`;
      diag.url = url;
      console.log('[CP] fetching:', url);
      const r = await fetchWithRetry(url, {}, {timeoutMs:12000, retries:2});
      diag.status = r.status;
      diag.contentType = r.headers ? (r.headers.get('content-type')||'') : '';
      console.log('[CP] response status:', r.status, 'content-type:', diag.contentType);
      if(!r.ok) throw new Error(`HTTP ${r.status}`);

      // Leemos como texto y lo parseamos a mano, así si viene HTML o algo raro lo veremos
      const rawText = await r.text();
      diag.rawText = rawText.slice(0, 500);
      console.log('[CP] raw response (first 500 chars):', diag.rawText);

      let d = null;
      try{ d = JSON.parse(rawText); }
      catch(parseErr){
        throw new Error('La respuesta no es JSON válido. Empieza por: ' + rawText.slice(0,100));
      }
      diag.parsedKeys = Object.keys(d||{});
      try{ diag.parsedSample = JSON.stringify(d).slice(0, 300); }catch(e){}
      console.log('[CP] parsed keys:', diag.parsedKeys);
      console.log('[CP] parsed sample:', diag.parsedSample);

      if(d && d.ok === false){
        throw new Error(d.error || 'El servidor respondió ok:false');
      }
      // Detectar el array de ejercicios bajo distintos nombres posibles
      const arr = Array.isArray(d?.ejercicios) ? d.ejercicios :
                  (Array.isArray(d?.compuestas) ? d.compuestas :
                  (Array.isArray(d?.oraciones) ? d.oraciones :
                  (Array.isArray(d?.data) ? d.data :
                  (Array.isArray(d) ? d : null))));
      if(!arr){
        throw new Error('No encuentro array de ejercicios. Claves recibidas: ' + diag.parsedKeys.join(', '));
      }
      console.log('[CP] arr.length antes de validar:', arr.length);
      if(arr.length === 0){
        throw new Error('El servidor devolvió un array de ejercicios vacío. Revisa Compuestas_Banco.');
      }
      const validados = arr.filter(isValidEjercicio);
      console.log('[CP] arr.length después de validar:', validados.length);
      if(validados.length === 0){
        // Muestra qué falla con el primer ejercicio para diagnóstico
        const sample = arr[0];
        const reasons = [];
        if(!sample || typeof sample !== 'object') reasons.push('no es objeto');
        else{
          if(!sample.id) reasons.push('falta id');
          if(!sample.texto) reasons.push('falta texto');
          if(!Array.isArray(sample.tokens)) reasons.push('tokens no es array');
          else if(sample.tokens.length===0) reasons.push('tokens vacío');
          if(!Array.isArray(sample.proposiciones)) reasons.push('oraciones no es array');
          else if(sample.proposiciones.length===0) reasons.push('oraciones vacío');
          if(!Array.isArray(sample.relaciones)) reasons.push('relaciones no es array');
        }
        throw new Error('Los ejercicios llegan, pero ninguno pasa la validación mínima. Primer ejercicio falla por: ' + (reasons.join(', ')||'razón desconocida') + '. Muestra: ' + JSON.stringify(sample).slice(0,200));
      }
      state.ejercicios = validados;
      state.loaded = true;
      state.loadError = '';
      console.log('[CP] Banco cargado correctamente:', state.ejercicios.length, 'ejercicios.');
    } catch(e){
      state.loadError = (e.message || String(e));
      // Anexar diagnóstico para que se vea en pantalla
      state.loadDiagnostic = diag;
      console.error('[CP] Error cargando banco:', e);
      console.error('[CP] Diagnóstico:', diag);
      state.loaded = false;
    }
  }

  // Validador mínimo: cada ejercicio debe tener id, texto, tokens, oraciones, relaciones
  function isValidEjercicio(ej){
    if(!ej || typeof ej !== 'object') return false;
    if(!ej.id || !ej.texto) return false;
    if(!Array.isArray(ej.tokens) || ej.tokens.length === 0) return false;
    if(!Array.isArray(ej.proposiciones) || ej.proposiciones.length === 0) return false;
    if(!Array.isArray(ej.relaciones)) return false;
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Filtrado
  // ─────────────────────────────────────────────────────────────────────
  function aplicarFiltros(){
    const cats = ['tipo', 'subtipo', 'nivel', 'n_props'];

    // Capa 1: exclusión dura (ejercicios con propiedades prohibidas → fuera)
    let filtered = state.ejercicios;
    cats.forEach(cat=>{
      if(state.filtrosExcl[cat].size > 0){
        filtered = filtered.filter(ej=>!state.filtrosExcl[cat].has(getEjVal(ej, cat)));
      }
    });

    // Capa 2: inclusión flexible (solo los que tienen al menos una propiedad deseada)
    const hayInclusiones = cats.some(cat=>state.filtros[cat].size > 0);
    if(hayInclusiones){
      const conDeseados = filtered.filter(ej=>
        cats.some(cat=>state.filtros[cat].size > 0 && state.filtros[cat].has(getEjVal(ej, cat)))
      );
      // Capa 3: fallback — si inclusión+exclusión vacía, quedarse con solo exclusión
      if(conDeseados.length > 0) filtered = conDeseados;
    }

    state.filtered = filtered;
    state.idx = 0;
  }

  function obtenerSubtipoPrincipal(ej){
    // 1) Buscar subtipo en alguna relación
    for(const r of (ej.relaciones||[])){
      if(r.subtipo) return r.subtipo;
    }
    // 2) Si no, buscar subtipo en una oración subordinada
    for(const p of (ej.proposiciones||[])){
      if(p.subtipo) return p.subtipo;
    }
    return '';
  }

  function getEjVal(ej, cat){
    if(cat === 'tipo')    return ej.tipo_oracion || '';
    if(cat === 'subtipo') return obtenerSubtipoPrincipal(ej);
    if(cat === 'nivel')   return (ej.metadatos && ej.metadatos.nivel) || '';
    if(cat === 'n_props') return String(ej.proposiciones?.length || 0);
    return '';
  }

  // Listas de filtros visibles (calculadas a partir del banco real)
  function calcularOpcionesFiltro(){
    const tipos = new Set(), subtipos = new Set(), niveles = new Set(), nprops = new Set();
    state.ejercicios.forEach(ej=>{
      if(ej.tipo_oracion) tipos.add(ej.tipo_oracion);
      const sub = obtenerSubtipoPrincipal(ej);
      if(sub) subtipos.add(sub);
      const nivel = (ej.metadatos && ej.metadatos.nivel) || '';
      if(nivel) niveles.add(nivel);
      nprops.add(String(ej.proposiciones?.length || 0));
    });
    // Filtros excluyentes: si el alumno tiene un tipo seleccionado, mostrar solo subtipos que aplican
    let subtiposFiltrados = Array.from(subtipos);
    if(state.filtros.tipo.size > 0){
      const tiposActivos = state.filtros.tipo;
      // Construir un mapa tipo → subtipos válidos para ese tipo
      const subtiposPorTipo = {};
      state.ejercicios.forEach(ej=>{
        const t = ej.tipo_oracion;
        if(!t || !tiposActivos.has(t)) return;
        const s = obtenerSubtipoPrincipal(ej);
        if(s){
          if(!subtiposPorTipo[t]) subtiposPorTipo[t] = new Set();
          subtiposPorTipo[t].add(s);
        }
      });
      subtiposFiltrados = [];
      Object.values(subtiposPorTipo).forEach(set=>set.forEach(s=>{
        if(!subtiposFiltrados.includes(s)) subtiposFiltrados.push(s);
      }));
    }
    return {
      tipos:    Array.from(tipos).sort(),
      subtipos: subtiposFiltrados.sort(),
      niveles:  ['basico','medio','avanzado'].filter(x=>niveles.has(x)),
      nprops:   Array.from(nprops).sort()
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render: vista de FILTROS
  // ─────────────────────────────────────────────────────────────────────
  function renderFiltros(){
    const strip = document.getElementById('cp-ctx-strip');
    if(strip) strip.style.display = 'none';
    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    if(state.loadError){
      renderError();
      return;
    }
    aplicarFiltros();
    const opc = calcularOpcionesFiltro();
    const total = state.ejercicios.length;
    const tras = state.filtered.length;

    document.getElementById('cp-counter').textContent = `Banco: ${total} ejercicios`;

    wrap.innerHTML = `
      <div class="cp-card">
        <h2>Explora el banco de oraciones compuestas</h2>
        <p class="cp-sub">Filtra por tipo, subtipo, nivel o número de oraciones. Cuando estés listo, pulsa <b>Empezar a practicar</b> para arrancar.</p>

        <div style="margin:6px 0 14px">
          <button type="button" id="cp-filter-help-btn" class="cp-btn-secondary"
                  aria-expanded="false" aria-controls="cp-filter-help"
                  onclick="CP.mostrarAyudaFiltros()"
                  style="font-size:.84rem;padding:6px 12px">
            ℹ️ ¿Cómo funcionan estos filtros?
          </button>
          <div id="cp-filter-help" role="region" aria-label="Ayuda de filtros" style="display:none;margin-top:10px;padding:12px 14px;background:rgba(15,118,110,0.06);border:1px solid rgba(15,118,110,0.18);border-radius:10px;font-size:.86rem;line-height:1.55;color:var(--portada-navy,#102A43)">
            <p style="margin:0 0 6px"><b>Cada chip tiene 3 estados</b> (toca para alternar):</p>
            <ul style="margin:0 0 6px 18px;padding:0">
              <li><span style="color:#15803D;font-weight:700">✓ Incluir</span> — solo verás oraciones que <b>tengan</b> esa característica.</li>
              <li><span style="color:#B91C1C;font-weight:700">✕ Excluir</span> — esas oraciones <b>no aparecerán</b>.</li>
              <li><b>Sin marca</b> — indistinto.</li>
            </ul>
            <p style="margin:0;color:var(--muted)">Si dejas todo en neutro, practicarás con el banco completo mezclado al azar. Mismo sistema que el de “funciones a practicar / funciones que no quiero que aparezcan” del análisis simple.</p>
          </div>
        </div>

        <div class="cp-stats">
          <div class="cp-stat">
            <div class="cp-stat-num">${total}</div>
            <div class="cp-stat-lbl">en el banco</div>
          </div>
          <div class="cp-stat">
            <div class="cp-stat-num">${tras}</div>
            <div class="cp-stat-lbl">tras filtros</div>
          </div>
        </div>

        <div class="cp-filter-block">
          <div class="cp-filter-label">Tipo de oración</div>
          <div class="cp-chip-grid" id="cp-f-tipo">
            ${opc.tipos.map(t=>chipHtml('tipo', t, etiquetaTipo(t))).join('')}
          </div>
        </div>

        <div class="cp-filter-block">
          <div class="cp-filter-label">Nivel</div>
          <div class="cp-chip-grid" id="cp-f-nivel">
            ${opc.niveles.map(n=>chipHtml('nivel', n, etiquetaNivel(n))).join('')}
          </div>
        </div>

        <div class="cp-filter-block">
          <div class="cp-filter-label">Nº de oraciones</div>
          <div class="cp-chip-grid" id="cp-f-nprops">
            ${opc.nprops.map(n=>chipHtml('n_props', n, n+' oraciones')).join('')}
          </div>
        </div>

        <div class="cp-filter-block">
          <div class="cp-filter-label">Subtipo específico</div>
          <div class="cp-chip-grid" id="cp-f-subtipo">
            ${opc.subtipos.map(s=>chipHtml('subtipo', s, etiquetaSubtipo(s))).join('')}
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;align-items:center">
          <button type="button" class="cp-btn-primary" id="cp-btn-go" ${tras===0?'disabled':''} onclick="CP.iniciarPractica()">
            ${tras===0 ? 'No hay ejercicios con esos filtros' : '✨ Empezar a practicar →'}
          </button>
          <button type="button" class="cp-btn-secondary" ${tras===0?'disabled':''} onclick="CP.iniciarLectura()">
            👁 Modo lectura
          </button>
          <button type="button" class="cp-btn-secondary" onclick="CP.limpiarFiltros()">Limpiar filtros</button>
        </div>
        <!-- El boton "Modo examen" se ha retirado de aqui (mayo 2026,
             Paso 3 del rediseno de login). El examen se elige ya en el
             login compartido y el PIN se introduce alli. -->
      </div>

      <div class="cp-tip">
        💡 <b>Práctica interactiva</b>: identifica los verbos y nexos de la oración paso a paso. <b>Modo lectura</b>: muestra el análisis completo sin evaluación (útil para auditar el banco).
      </div>
    `;

    // Ciclo tri-estado: neutro → incluir (verde) → excluir (rojo) → neutro
    document.querySelectorAll('#cp-wrap .cp-chip').forEach(ch=>{
      ch.addEventListener('click', ()=>{
        const cat = ch.dataset.cat;
        const val = ch.dataset.val;
        if(state.filtros[cat].has(val)){
          state.filtros[cat].delete(val);
          state.filtrosExcl[cat].add(val);    // incluir → excluir
        } else if(state.filtrosExcl[cat].has(val)){
          state.filtrosExcl[cat].delete(val); // excluir → neutro
        } else {
          state.filtros[cat].add(val);         // neutro → incluir
        }
        renderFiltros();
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // ENTRADA AL MODO EXAMEN
  // El PIN se introduce en el login compartido (#screen-login). La rama
  // currentModule==='compuestas' de handleStartAll llama a
  // CP.iniciarExamenDesdeLogin({name,email,grupo,pin}), que reutiliza
  // fetchExamenCompuesta (mas abajo) y arranca iniciarPractica().
  //
  // Hasta mayo 2026 existia aqui un 2o formulario interno duplicado
  // (entrarModoExamen, cancelarPIN, renderEntradaPIN, validarPIN) que
  // se eliminado en el Paso 4 del rediseno de login.
  // ─────────────────────────────────────────────────────────────────────

  // Llama al endpoint getExamenCompuesta del GAS y devuelve el objeto
  // { ok, ejercicios, timer, fasesActivas, pin, grupo, evaluacion, nombreExamen }.
  // Lanza Error en caso de fallo.
  async function fetchExamenCompuesta(pin){
    const apiUrl = getApiUrl();
    if(!apiUrl) throw new Error('No hay URL de API configurada. Avisa al profesor.');
    const url = `${apiUrl}?action=getExamenCompuesta&pin=${encodeURIComponent(pin)}`;
    console.log('[CP examen] fetching:', url);
    const r = await fetchWithRetry(url, {}, { timeoutMs: 12000, retries: 1 });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    let d;
    try { d = JSON.parse(text); }
    catch(e){ throw new Error('Respuesta no válida del servidor.'); }
    if(d && d.ok === false) throw new Error(d.error || 'Error desconocido del servidor.');
    if(!Array.isArray(d.ejercicios) || d.ejercicios.length === 0){
      throw new Error('El examen no contiene ejercicios.');
    }
    return d;
  }

  // Sale del modo examen y restaura el banco original.
  // Llamado desde abandonar/volverFiltros cuando state.modoExamen es true.
  function salirModoExamen(){
    if(!state.modoExamen) return;
    stopExamTimer();
    state.modoExamen   = false;
    state.examPin      = '';
    state.examGrupo    = '';
    state.examEval     = '';
    state.examName     = '';
    state.examTimerMin = 0;
    state.examEmail    = '';
    state.examAlumno   = '';
    state.examTiempoRestanteS = 0;
    state.examFasesActivas = null;
    // Reset del estado de envío (los datos se mantienen en localStorage hasta confirmar)
    state.examResultados   = [];
    state.examEnviado      = false;
    state.examEnviando     = false;
    state.examErrorEnvio   = '';
    // Restaurar el banco original (si lo teníamos guardado)
    if(state.ejerciciosBanco !== null){
      state.ejercicios     = state.ejerciciosBanco;
      state.filtered       = state.ejercicios.slice();
      state.ejerciciosBanco= null;
    }
    state.idx = 0;
    hideExamenBanner();
  }

  // ── Fase 1.5.B: Banner visual del modo examen ──
  // Se inserta como hermano del .cp-topbar dentro de #screen-compuestas.
  // Muestra "🎓 EXAMEN · NombreExamen · Grupo X · Eval. Y · PIN xxxx".
  // Se crea con showExamenBanner() (idempotente) y se quita con hideExamenBanner().

  function showExamenBanner(){
    const screen = document.getElementById('screen-compuestas');
    if(!screen) return;
    let banner = document.getElementById('cp-examen-banner');
    if(!banner){
      banner = document.createElement('div');
      banner.id = 'cp-examen-banner';
      banner.style.cssText = 'background:linear-gradient(135deg,#A855F7,#7C3AED);color:#fff;padding:7px 14px;font-size:.82rem;font-weight:700;text-align:center;border-bottom:2px solid #6D28D9;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;letter-spacing:.01em';
      const topbar = screen.querySelector('.cp-topbar');
      if(topbar && topbar.nextSibling){
        screen.insertBefore(banner, topbar.nextSibling);
      } else if(topbar){
        topbar.parentNode.insertBefore(banner, topbar.nextSibling);
      } else {
        screen.insertBefore(banner, screen.firstChild);
      }
    }
    const sepHtml = '<span style="opacity:.55">·</span>';
    const parts = ['<span>🎓 EXAMEN</span>'];
    if(state.examName)   parts.push('<span>' + escHtml(state.examName) + '</span>');
    if(state.examAlumno) parts.push('<span>' + escHtml(state.examAlumno) + '</span>');
    if(state.examGrupo)  parts.push('<span>Grupo ' + escHtml(state.examGrupo) + '</span>');
    if(state.examEval)   parts.push('<span>Eval. ' + escHtml(state.examEval) + '</span>');
    parts.push('<span>PIN ' + escHtml(state.examPin) + '</span>');
    if(state.examTimerMin > 0){
      parts.push('<span id="cp-exam-timer" style="font-family:monospace;font-weight:900;letter-spacing:.05em">⏱ --:--</span>');
    }
    banner.innerHTML = parts.join(sepHtml);
    banner.style.display = '';
  }

  function hideExamenBanner(){
    const banner = document.getElementById('cp-examen-banner');
    if(banner) banner.remove();
  }

  function startExamTimer(){
    if(!state.modoExamen || !state.examTimerMin) return;
    stopExamTimer();
    state.examTiempoRestanteS = state.examTimerMin * 60;
    state.examTimerRunning = true;
    _examTimerInterval = setInterval(()=>{
      if(!state.examTimerRunning){ stopExamTimer(); return; }
      if(state.examTiempoRestanteS <= 0){
        stopExamTimer();
        onTimerExpired();
        return;
      }
      state.examTiempoRestanteS--;
      _updateTimerDisplay();
    }, 1000);
    _updateTimerDisplay();
  }

  function stopExamTimer(){
    if(_examTimerInterval){ clearInterval(_examTimerInterval); _examTimerInterval = null; }
    state.examTimerRunning = false;
  }

  function _updateTimerDisplay(){
    const el = document.getElementById('cp-exam-timer');
    if(!el) return;
    const s = state.examTiempoRestanteS || 0;
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `⏱ ${mm}:${ss}`;
    el.style.color = s <= 60 ? '#FCA5A5' : (s <= 300 ? '#FDE68A' : '');
  }

  function onTimerExpired(){
    mostrarToast({ titulo: '⏱ Tiempo agotado', subtitulo: 'Enviando tu examen…', colorIdx: 1 });
    enviarResultadoExamen();
  }

  // Helper que pide confirmación al alumno antes de salir del examen.
  // Devuelve true si el alumno confirma (o si no estaba en modo examen).
  function confirmarSalidaExamen(){
    if(!state.modoExamen) return true;
    return window.confirm('¿Seguro que quieres salir del examen?\n\nPerderás todo el progreso de esta sesión y no podrás continuar con este PIN.');
  }
  window.CP_renderFiltros = renderFiltros;

  function chipHtml(categoria, valor, etiqueta){
    const incl = state.filtros[categoria].has(valor);
    const excl = state.filtrosExcl[categoria].has(valor);
    const cls  = excl ? 'excl' : (incl ? 'active' : '');
    const prefix = excl ? '✕ ' : (incl ? '✓ ' : '');
    return `<span class="cp-chip ${cls}" data-cat="${categoria}" data-val="${escAttr(valor)}">${prefix}${escHtml(etiqueta)}</span>`;
  }

  function limpiarFiltros(){
    ['tipo','subtipo','nivel','n_props'].forEach(k=>{
      state.filtros[k].clear();
      state.filtrosExcl[k].clear();
    });
    renderFiltros();
  }

  // Toggle del panel "Como funcionan los filtros" inline en la pantalla
  // de filtros. Se anade en renderFiltros (mayo 2026, Paso 3 login).
  function mostrarAyudaFiltros(){
    const panel = document.getElementById('cp-filter-help');
    const btn   = document.getElementById('cp-filter-help-btn');
    if(!panel) return;
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    if(btn) btn.setAttribute('aria-expanded', String(!open));
  }

  function iniciarLectura(){
    if(state.filtered.length === 0) return;
    state.idx = 0;
    state.solucionVisible = false;
    state.modoLectura = true;
    renderEjercicio();
  }

  function iniciarPractica(){
    if(state.filtered.length === 0) return;
    // Aleatoriedad: salvo en examen (orden fijado por el profesor),
    // mezclamos el banco filtrado antes de empezar.
    if(!state.modoExamen){
      state.filtered = shuffleArr(state.filtered);
    }
    state.idx = 0;
    state.modoLectura = false;
    // Reset del resumen de sesión: solo lo usamos en práctica (en examen
    // ya hay un resumen agregado propio).
    if(!state.modoExamen){
      state.sessionResults = [];
    }
    if(state.modoExamen) startExamTimer();
    iniciarFase0();
  }

  // Registra el resultado del ejercicio actual en el resumen de sesión
  // (solo práctica). Idempotente: si el alumno revisita el resumen del
  // mismo ejercicio no se vuelve a anotar.
  function registrarResultadoSesion(ej){
    if(state.modoExamen || !ej) return;
    if(state.sessionResults.some(r => r.id === ej.id)) return;
    const eng = state.engine;
    if(!eng) return;
    const totalAciertos = eng.verbosAciertos + eng.nexosAciertos + eng.f3Aciertos + (eng.f5Aciertos||0)
                          + (eng.interna.activo ? eng.interna.aciertos : 0);
    const totalErrores  = eng.verbosErrores + eng.nexosErrores + eng.f3Errores + (eng.f5Errores||0)
                          + (eng.interna.activo ? eng.interna.errores : 0);
    const nota = computeCompScore(eng, ej);
    state.sessionResults.push({
      id:           ej.id || '—',
      texto:        ej.texto || '',
      tipo:         ej.tipo_oracion || '',
      subtipo:      obtenerSubtipoPrincipal(ej) || '',
      nivel:        (ej.metadatos && ej.metadatos.nivel) || 'medio',
      nota:         nota,
      aciertos:     totalAciertos,
      errores:      totalErrores,
      internaHecha: !!(eng.interna && eng.interna.activo),
      tsISO:        new Date().toISOString()
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // MOTOR PEDAGÓGICO INTERACTIVO
  //
  // Estado del motor (vive dentro de state.engine):
  //   fase: 1 | 2 | 3 | 5 | 'interna_choice' | 'interna' | 'resumen'
  //   verbosCorrectos: Set<int>  — índices que el alumno DEBE seleccionar
  //   verbosSeleccionados: Set<int>
  //   verbosConfirmados: Set<int> — los que ya validamos (correctos)
  //   verbosErrados: Set<int>     — los que clicó mal (mostramos en rojo)
  //   verbosAciertos / verbosErrores: contadores
  //   nexosCorrectos, nexosSeleccionados, etc. — análogo para fase 2
  //   pistaUsada: bool
  // ═════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  // Detecta automáticamente una perífrasis o forma compuesta a partir del
  // verbo léxico, mirando los tokens vecinos. Útil cuando el banco no tiene
  // `indices_perifrasis` registrado.
  // Patrones reconocidos:
  //   - haber + participio (formas compuestas: "había salido", "ha comido")
  //   - estar + gerundio ("estaba estudiando")
  //   - ir + a + infinitivo ("voy a comer")
  //   - tener + que + infinitivo ("tiene que decirme")
  //   - poder/deber/querer + infinitivo ("puede venir", "debe estudiar")
  // ─────────────────────────────────────────────────────────────────────
  function detectarPerifrasisAuto(idxLexico, ej){
    const tokens = ej.tokens || [];
    const lex = tokens[idxLexico];
    if(!lex) return [idxLexico];
    const txt = (lex.texto||'').toLowerCase();
    // Helpers
    const esVerbo = t => t && t.categoria === 'verbo';
    const esTokenLow = (t, lista) => t && lista.includes((t.texto||'').toLowerCase());

    // Patrón 1: haber + participio (idxLexico es el participio)
    // Participios típicos: terminan en -ado, -ido (con variantes irregulares).
    const esParticipio = /(ado|ido|to|so|cho)$/.test(txt);
    if(esParticipio && idxLexico >= 1){
      const prev = tokens[idxLexico - 1];
      if(esVerbo(prev) && /^(h[aeáé]|hab[eaí]|hub|habr)/.test((prev.texto||'').toLowerCase())){
        return [prev.i, idxLexico];
      }
    }
    // Patrón 2: estar + gerundio (idxLexico es el gerundio terminado en -ndo)
    const esGerundio = /ndo$/.test(txt);
    if(esGerundio && idxLexico >= 1){
      const prev = tokens[idxLexico - 1];
      if(esVerbo(prev) && /^(est|estuv)/.test((prev.texto||'').toLowerCase())){
        return [prev.i, idxLexico];
      }
    }
    // Patrón 3: ir + a + infinitivo (idxLexico es el infinitivo)
    const esInfinitivo = /(ar|er|ir)(me|te|le|la|lo|las|los|nos|os|se)?$/.test(txt);
    if(esInfinitivo && idxLexico >= 2){
      const prev1 = tokens[idxLexico - 1];
      const prev2 = tokens[idxLexico - 2];
      if(prev1 && (prev1.texto||'').toLowerCase() === 'a' &&
         esVerbo(prev2) && /^(vo|va|íbamos|iba|ir)/.test((prev2.texto||'').toLowerCase())){
        return [prev2.i, prev1.i, idxLexico];
      }
      // Patrón 4: tener + que + infinitivo
      if(prev1 && (prev1.texto||'').toLowerCase() === 'que' &&
         esVerbo(prev2) && /^(ten|tuv|tendr)/.test((prev2.texto||'').toLowerCase())){
        return [prev2.i, prev1.i, idxLexico];
      }
      // Patrón 5: modal + infinitivo (poder, deber, querer, soler...)
      if(idxLexico >= 1){
        const p = tokens[idxLexico - 1];
        if(esVerbo(p) && /^(pued|pud|podr|deb|debí|debí|quie|quis|querr|suel|sol|solí)/.test((p.texto||'').toLowerCase())){
          return [p.i, idxLexico];
        }
      }
    }
    return [idxLexico];
  }

  function iniciarFase0(){
    const ej = state.filtered[state.idx];
    if(!ej){ renderEjercicio(); return; }
    // Inicializar estado del motor para este ejercicio.
    // verbosCorrectos: conjunto de TODOS los índices aceptables como verbo. Incluye:
    //   - verbo.indice (el léxico)
    //   - verbo.indices_perifrasis (todos los tokens de la perífrasis)
    // Permite clicar cualquier verbo de una perífrasis o de una forma compuesta.
    // verboPropByIdx: mapa índice → id de oración (para saber qué perífrasis se confirma de un solo clic)
    const verbosCorrectos = new Set();
    const verboPropByIdx = new Map();   // index → id de propos
    const perifByProp = new Map();      // id de propos → Set de índices de la perífrasis
    (ej.proposiciones||[]).forEach(p=>{
      if(p?.verbo?.indice === undefined) return;
      // El verbo léxico siempre es aceptable
      verbosCorrectos.add(p.verbo.indice);
      verboPropByIdx.set(p.verbo.indice, p.id);
      // Si hay perífrasis (>1 token), todos sus tokens son aceptables.
      // Si el banco no la registra, intentamos detectarla automáticamente.
      let perif = Array.isArray(p.verbo.indices_perifrasis) ? p.verbo.indices_perifrasis : null;
      if(!perif || perif.length <= 1){
        perif = detectarPerifrasisAuto(p.verbo.indice, ej);
      }
      const set = new Set(perif);
      perifByProp.set(p.id, set);
      set.forEach(i=>{
        verbosCorrectos.add(i);
        verboPropByIdx.set(i, p.id);
      });
    });
    const nexosCorrectos = new Set();
    const nexoByIdx = new Map();   // índice → Set con todos los índices del nexo (para locuciones)
    (ej.nexos||[]).forEach(n=>{
      if(!Array.isArray(n.indices)) return;
      const set = new Set(n.indices);
      n.indices.forEach(i=>{
        nexosCorrectos.add(i);
        nexoByIdx.set(i, set);
      });
    });
    // Para fase 3: índice del token → id de oración en el JSON ('pp', 'ps', 'p1'...)
    // Solo tokens que están en alguna `oracion.indices`. Los nexos como `que`
    // completivo NO están en indices y por tanto NO se piden al alumno.
    //
    // FILTRO IMPORTANTE: excluir tokens de PUNTUACIÓN aunque estén en prop.indices.
    // La puntuación NO es clickable (clickable=false en renderInteractTokens) y por
    // tanto el alumno nunca podría confirmarla. Sin este filtro, las oraciones con
    // aposición ("Tu objetivo, ganar el partido, está claro") se quedaban bloqueadas
    // en O1 porque las comas estaban en O1.indices pero no se podían marcar (bug
    // reportado mayo 2026).
    const tokenAProp = new Map();
    const _tokenById = new Map();
    (ej.tokens || []).forEach(t => _tokenById.set(t.i, t));
    (ej.proposiciones||[]).forEach((p, propIdx)=>{
      const propNum = propIdx + 1;  // O1, O2, O3...
      (p.indices||[]).forEach(i=>{
        const tok = _tokenById.get(i);
        if(tok && tok.categoria === 'puntuacion') return;  // saltar puntuación
        tokenAProp.set(i, propNum);
      });
    });
    state.engine = {
      fase: 1,
      tInicio: Date.now(),       // ms desde epoch al iniciar este ejercicio
      enviado: false,            // ya enviado a Sheets
      enviando: false,           // en curso
      errorEnvio: '',            // mensaje de error si falló
      verbosCorrectos,
      verboPropByIdx,
      perifByProp,
      verbosSeleccionados: new Set(),
      verbosConfirmados: new Set(),
      verbosErrados: new Set(),
      verbosAciertos: 0,
      verbosErrores: 0,
      verbosClickedOnce: new Set(),
      nexosCorrectos,
      nexoByIdx,
      nexosSeleccionados: new Set(),
      nexosConfirmados: new Set(),
      nexosErrados: new Set(),
      nexosAciertos: 0,
      nexosErrores: 0,
      nexosClickedOnce: new Set(),
      pistaUsadaF1: false,
      pistaUsadaF2: false,
      // ── Fase 3: delimitar oraciones ─────────────────────────────
      tokenAProp,                          // mapa correcto (índice → numProp)
      f3PropActiva: 1,                     // qué P_n está seleccionada como activa
      f3Asignaciones: new Map(),           // mapa actual del alumno: indice → numProp
      f3Confirmados: new Set(),            // tokens correctamente asignados
      f3Errados: new Map(),                // indice → numProp que el alumno asignó mal (para feedback)
      f3Aciertos: 0,
      f3Errores: 0,
      pistaUsadaF3: false,
      // ── Fase 5: relaciones entre oraciones ──────────────────────
      f5IdxActual: 0,                      // qué relación se está respondiendo (0..N-1)
      f5Respuestas: [],                    // [{tipo, tipoOk, origen, direccionOk, funcion, funcionOk, funcionSp, funcionSpOk}]
      f5Aciertos: 0,
      f5Errores: 0,
      // ── Fase 6: análisis interno de oraciones (Entrega 4 / Fase 1.4) ─
      interna: {
        activo:     false,           // se activa cuando el alumno elige "Analizar por dentro"
        saltado:    false,           // el alumno ha decidido saltar el análisis interno
        propIdx:    0,               // qué oración se está analizando (0..N-1)
        subPaso:    'predicado',     // 'predicado' | 'sujeto' | 'funciones'
        funcionIdx: 0,               // qué función dentro de la oración se está analizando
        respuestas: [],              // [{predicadoIndices, predicadoOk, sujetoIndices, sujetoTipo, sujetoOk, funcionesUsuario, funcionesOk}]
        aciertos:   0,
        errores:    0
      },
      // ── General ──────────────────────────────────────────────────────
      mensajeFeedback: null
    };
    // Pre-asignar los VERBOS confirmados de fase 1 a su oración correcta en fase 3
    // (los confirma fase 1, no debería el alumno reasignarlos en fase 3)
    // No los pre-asignamos al inicio, solo al entrar a fase 3 (porque fase 1 puede no haberse hecho aún).
    renderFase();
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL DEL MOTOR
  // ─────────────────────────────────────────────────────────────────────
  function renderFase(){
    const ej = state.filtered[state.idx];
    if(!ej){ return; }
    const eng = state.engine;
    if(!eng){ iniciarFase0(); return; }

    document.getElementById('cp-counter').textContent = `${state.idx+1} / ${state.filtered.length}`;
    updateCpStickyTop();
    updateCpCtxStrip();

    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;

    // [LEGACY] La fase 'interna_choice' quedó del flujo de mayo 2026
    // (pantalla intermedia tras paso 4). Desde la refactorización de
    // 2026-05-27 el flujo va directamente a fase='resumen', que decide
    // internamente si mostrar el pre-resumen (con el botón "Analizar por
    // dentro") o el resumen completo. Si por algún motivo cae un estado
    // antiguo en interna_choice, lo redirigimos al resumen.
    if(eng.fase === 'interna_choice'){
      eng.fase = 'resumen';
    }

    // ── Fase 1.4: análisis interno de oraciones ──────────────────────
    if(eng.fase === 'interna'){
      wrap.innerHTML = renderInternaHtml(ej);
      return;
    }

    if(eng.fase === 'resumen'){
      wrap.innerHTML = renderResumenHtml(ej);
      // Auto-envío a Sheets una sola vez (los flags `enviado` y `enviando` previenen duplicados)
      if(!eng.enviado && !eng.enviando && !eng.errorEnvio){
        enviarResultadoCompuestas(ej, false);
      }
      // ── Sonido + XP al completar (solo una vez por ejercicio) ─────────
      if(!eng.completadoYaCelebrado){
        eng.completadoYaCelebrado = true;
        if(typeof playComplete === 'function') playComplete();
        // Calcular XP según porcentaje de aciertos
        const totalAciertos = (eng.verbosAciertos||0) + (eng.nexosAciertos||0) +
                              (eng.f3Aciertos||0) + (eng.f5Aciertos||0);
        const totalErrores  = (eng.verbosErrores||0) + (eng.nexosErrores||0) +
                              (eng.f3Errores||0) + (eng.f5Errores||0);
        const total = totalAciertos + totalErrores;
        const pct = total > 0 ? Math.round((totalAciertos/total)*100) : 0;
        let xp = 10;                              // XP base por completar
        if(pct >= 80) xp += 5;                    // bonus por excelencia
        if(typeof awardXP === 'function'){
          awardXP(xp, 'compuestas');
          if(pct === 100 && typeof showCombo === 'function'){
            showCombo('¡Perfecto!', 5);
          }
        }
      }
      // Registro en el resumen de sesión: solo cuando el alumno está viendo
      // el resumen COMPLETO (no el pre-resumen). El pre-resumen aparece si
      // el ejercicio tiene análisis interno y el alumno aún no ha decidido.
      const tieneInternoSesion = (ej.proposiciones || []).every(p => p && p.analisis_interno);
      const enPreResumen = tieneInternoSesion && !eng.interna.activo && !eng.interna.saltado && f6Habilitada();
      if(!enPreResumen){
        registrarResultadoSesion(ej);
      }
      return;
    }

    // Determinar qué fases mostrar (skipear fase 2 si solo hay 1 oración)
    const tieneNexos = (ej.proposiciones||[]).length > 1 && (ej.nexos||[]).length > 0;
    const tieneRelaciones = (ej.relaciones||[]).length > 0;
    const unaSolaProp = (ej.proposiciones||[]).length === 1;

    // Fase 5: relaciones entre oraciones. UI también especial.
    if(eng.fase === 5){
      wrap.innerHTML = `
        ${renderProgressBar(eng.fase, tieneNexos, tieneRelaciones)}
        <div class="cp-oracion-recordatorio">${escHtml(ej.texto || '')}</div>
        ${renderInstruccion(eng.fase, ej)}
        ${renderResumenPropos(ej)}
        ${renderRelaciones5(ej)}
        ${eng.mensajeFeedback ? renderFeedback(eng.mensajeFeedback) : ''}
        ${renderActions(eng.fase, ej, tieneNexos)}
        ${!state.modoExamen ? `<div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap"><button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button></div>` : ''}
      `;
      // Listeners de las opciones de relación
      wrap.querySelectorAll('.cp-clasif-opt[data-q-rel]').forEach(el=>{
        el.addEventListener('click', ()=>{
          onRelacionClick(el.dataset.qRel, el.dataset.v);
        });
      });
      return;
    }

    // Fases 1, 2, 3 — la oración interactiva
    wrap.innerHTML = `
      ${renderProgressBar(eng.fase, tieneNexos, tieneRelaciones)}
      ${(eng.fase === 3) ? `<div class="cp-oracion-recordatorio">${escHtml(ej.texto || '')}</div>` : ''}
      ${renderInstruccion(eng.fase, ej)}
      <div class="cp-interact-card">
        <div class="cp-interact-text">${renderInteractTokens(ej)}</div>
        ${renderTally()}
        ${eng.mensajeFeedback ? renderFeedback(eng.mensajeFeedback) : ''}
        ${renderActions(eng.fase, ej, tieneNexos)}
      </div>
      ${!state.modoExamen ? `<div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap"><button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button></div>` : ''}
    `;
    // Listeners en los tokens
    wrap.querySelectorAll('.cp-tok[data-i]').forEach(el=>{
      el.addEventListener('click', ()=>{
        const i = parseInt(el.dataset.i,10);
        onTokenClick(i);
      });
    });
  }

  function renderProgressBar(faseActual, tieneNexos, tieneRelaciones){
    // s(faseInterna, label, numVisible). El numVisible es el que ve el alumno.
    // Internamente seguimos usando fase 5 para "clasificar y relacionar", pero al
    // alumno se lo presentamos como paso 4 (porque la antigua fase 4 ha desaparecido).
    const s = (faseInt, lbl, numVis)=>{
      let cls='';
      if(faseActual === 'resumen' || faseActual > faseInt) cls='done';
      else if(faseActual === faseInt) cls='active';
      return `<div class="cp-progress-step ${cls}"><span class="cp-step-num">${numVis}</span>${lbl}</div>`;
    };
    let visNum = 1;
    let html = '<div class="cp-progress">';
    html += s(1, 'Verbos', visNum++);
    if(tieneNexos) html += s(2, 'Nexos', visNum++);
    html += s(3, 'Delimitar', visNum++);
    if(tieneRelaciones) html += s(5, 'Clasificar y relacionar', visNum++);
    html += '</div>';
    return html;
  }

  function renderInstruccion(fase, ej){
    const nProps = (ej.proposiciones||[]).length;
    const nNexos = (ej.nexos||[]).length;
    if(fase === 1){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">🎯</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 1 · Identifica los verbos</h3>
            <p class="cp-instr-desc">Esta oración tiene <b>${nProps} verbo${nProps===1?'':'s'}</b> que son núcleo de oración. Toca cada uno. Si hay una perífrasis (como «está estudiando» o «había aprobado»), marca solo el verbo en participio o gerundio (el último).</p>
          </div>
        </div>`;
    }
    if(fase === 2){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">🔗</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 2 · Identifica los nexos</h3>
            <p class="cp-instr-desc">¿Qué palabra (o palabras) une las oraciones? Toca <b>${nNexos===1?'el nexo':'los '+nNexos+' nexos'}</b>. Pueden ser conjunciones («que», «y», «pero», «porque»…), pronombres relativos («que», «quien», «donde»…) o locuciones («para que», «a pesar de que»…).</p>
          </div>
        </div>`;
    }
    if(fase === 3){
      const eng = state.engine;
      const propActiva = eng.f3PropActiva;
      // Texto descriptivo de la P_n activa
      const lblPropAct = `O${propActiva}`;
      return `
        <div class="cp-instr cp-instr-grande cp-instr-fase3">
          <span class="cp-instr-emoji">📐</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 3 · Delimita las oraciones</h3>
            <p class="cp-instr-desc">Ahora vas a decir qué palabras forman cada oración. <b>Empieza por <span style="color:var(--cp-p${Math.min(propActiva,4)});font-weight:800">${lblPropAct}</span></b>: toca todas las palabras que pertenecen a esa oración. Cuando termines con ella, te llevaremos a la siguiente.</p>
          </div>
        </div>`;
    }
    if(fase === 5){
      const eng = state.engine;
      const ej2 = state.filtered[state.idx];
      const relIdx = eng.f5IdxActual;
      const totalRel = (ej2.relaciones||[]).length;
      const rel = (ej2.relaciones||[])[relIdx];
      const resp = eng.f5Respuestas[relIdx] || {};
      // Calcular sub-paso: ahora incluye familia (si sub) y subtipo (siempre que aplique)
      let subPaso = 'tipo';
      if(resp.tipoOk === true){
        if(rel && rel.tipo === 'subordinacion'){
          // Tras tipo: familia → subtipo → direccion → (funcion solo si no es redundante) → funcion_sp
          if(resp.familiaOk !== true){
            subPaso = 'familia';
          } else if(resp.subtipoOk !== true){
            subPaso = 'subtipo';
          } else if(resp.direccionOk !== true){
            subPaso = 'direccion';
          } else if(!funcionEsRedundante(rel) && resp.funcionOk !== true){
            subPaso = 'funcion';
          } else if(rel.funcion === 'termino_preposicion' && rel.funcion_sp && resp.funcionSpOk !== true){
            subPaso = 'funcion_sp';
          } else {
            subPaso = 'final';
          }
        } else if(rel && rel.tipo === 'coordinacion'){
          // Coordinación: tras tipo, preguntar subtipo (copulativa/adversativa/disyuntiva)
          if(resp.subtipoOk !== true){
            subPaso = 'subtipo';
          } else {
            subPaso = 'final';
          }
        } else {
          // Yuxtaposición: con el tipo basta
          subPaso = 'final';
        }
      }
      const titulos = {
        'tipo':       `¿Qué tipo de relación hay entre las oraciones?`,
        'familia':    `Has dicho que es subordinación. ¿Qué familia de subordinada es?`,
        'subtipo':    rel?.tipo === 'subordinacion' ? `¿Qué subtipo concreto de subordinada?` : `¿Qué tipo de coordinación?`,
        'direccion':  `¿Cuál depende de cuál?`,
        'funcion':    `¿Qué función desempeña la oración subordinada dentro de la principal?`,
        'funcion_sp': `Has dicho que es término de preposición. ¿Qué función tiene el sintagma preposicional completo?`,
        'final':      `Esta relación está respondida. Avanza a la siguiente.`
      };
      const descs = {
        'tipo':       'Pueden estar al mismo nivel (coordinación o yuxtaposición) o una depender de la otra (subordinación).',
        'familia':    'Las subordinadas se agrupan en tres grandes familias: sustantivas (hacen función de SN), de relativo (adjetivas: complementan a un sustantivo) y construcciones (antes llamadas adverbiales).',
        'subtipo':    'Esta es la clasificación más específica.',
        'direccion':  'En una subordinación, una es la principal (manda) y otra la subordinada (depende). Elige la flecha que mejor lo represente.',
        'funcion':    'La subordinada hace una función dentro de la principal: sujeto, complemento directo, complemento indirecto, atributo, etc.',
        'funcion_sp': 'Cuando una oración subordinada va dentro de un sintagma preposicional («de que…», «en que…», «para que…»), no es ella misma quien hace de complemento de régimen, CI, etc., sino el SP completo.',
        'final':      ''
      };
      // El alumno ve este como "Paso 4" (la antigua fase 4 ya no existe).
      const numPasoVisible = (((ej2.proposiciones||[]).length > 1 && (ej2.nexos||[]).length > 0) ? 4 : 3);
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">🔀</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso ${numPasoVisible} · Clasificar y relacionar</h3>
            <p class="cp-instr-desc">${titulos[subPaso]||''} ${descs[subPaso]||''}</p>
            <p style="font-size:.74rem;color:var(--muted);margin:4px 0 0">Relación ${relIdx+1} de ${totalRel}</p>
          </div>
        </div>`;
    }
    return '';
  }

  // ── CP STICKY ─────────────────────────────────────────────────────────
  // Ventana fija bajo la topbar que muestra el progreso del alumno:
  // fases 0-3 → tokens coloreados por rol; fases 4+ → chips de oración.

  function updateCpStickyTop(){
    try{
      const tb = document.querySelector('#screen-compuestas .cp-topbar');
      if(!tb) return;
      document.documentElement.style.setProperty('--cp-topbar-h', tb.offsetHeight+'px');
    }catch(e){}
  }
  window.addEventListener('resize', ()=>{ try{ updateCpStickyTop(); }catch(e){} });

  function updateCpCtxStrip(){
    const strip = document.getElementById('cp-ctx-strip');
    if(!strip) return;
    const ej = state.filtered && state.filtered[state.idx];
    if(!ej || !state.engine){ strip.style.display = 'none'; return; }
    // 2026-05-28: en la pantalla de puntuación (fase 'resumen') ocultamos la
    // franja de contexto. El resumen ya incluye el análisis completo PAU y
    // los diagnósticos; dejar la franja produce una banda residual sin uso.
    if(state.engine.fase === 'resumen'){ strip.style.display = 'none'; return; }
    const html = renderCpCtxStripHtml(ej);
    if(!html){ strip.style.display = 'none'; return; }
    strip.style.display = '';
    strip.innerHTML = html;
  }

  function renderCpCtxStripHtml(ej){
    const eng = state.engine;
    if(!eng) return '';
    const tokens = ej.tokens || [];
    let label = '', content = '';
    if(eng.fase === 1){
      label = 'Paso 1 · Verbos';
      content = `<div class="cp-ctx-words">${renderCpStickyToks(tokens, eng, 1)}</div>`;
    } else if(eng.fase === 2){
      label = 'Paso 2 · Nexos';
      content = `<div class="cp-ctx-words">${renderCpStickyToks(tokens, eng, 2)}</div>`;
    } else if(eng.fase === 3){
      label = 'Paso 3 · Oraciones';
      content = `<div class="cp-ctx-words">${renderCpStickyToks(tokens, eng, 3)}</div>`;
    } else if(eng.fase === 'interna'){
      // Vista nueva (B): análisis interno de la O actual con Sujeto/Predicado
      // arriba, funciones específicas debajo. Inspirada en las fichas didácticas.
      label = 'Análisis interno';
      content = renderCpStickyInterna(ej, eng);
      if(!content){ content = renderCpStickyProps(ej, eng); }
    } else {
      label = 'Oraciones';
      content = renderCpStickyProps(ej, eng);
    }
    if(!content) return '';
    return `<div class="ctx-label">${label}</div><div class="ctx-scroll">${content}</div>`;
  }

  function renderCpStickyToks(tokens, eng, fase){
    let html = '';
    for(let idx = 0; idx < tokens.length; idx++){
      const t = tokens[idx];
      const i = t.i;
      const cat = t.categoria || 'otro';
      let cls = 'cp-ctx-tok', badge = '';
      if(cat === 'puntuacion'){
        cls += ' cp-ctx-punt';
      } else if(fase >= 1 && eng.verbosConfirmados.has(i)){
        cls += ' cp-ctx-verbo';
        badge = '<span class="cp-ctx-badge">V</span>';
      } else if(fase >= 2 && eng.nexosConfirmados.has(i)){
        cls += ' cp-ctx-nexo';
        badge = '<span class="cp-ctx-badge" style="background:#92400E">Nx</span>';
      } else if(fase >= 3){
        const pN = eng.f3Asignaciones.get(i);
        if(pN) cls += ' cp-ctx-p' + Math.min(pN, 4);
      }
      const next = tokens[idx+1];
      const esAp = cat === 'puntuacion' && /^[¿¡]$/.test(t.texto||'');
      const join = esAp || (next && next.categoria === 'puntuacion');
      html += `<span class="${cls}">${escHtml(t.texto)}${badge}</span>${join?'⁠':' '}`;
    }
    return html.trimEnd();
  }

  // ── Sticky para fase 'interna' (B, mayo 2026) ─────────────────────
  // Inspirada en fichas didácticas: arriba etiquetas grandes Sujeto/Predicado
  // que abarcan varios bloques, en medio las palabras en una sola línea con
  // corchetes [...], debajo etiquetas pequeñas con la función específica de
  // cada bloque. Al pie, marca de la oración (O1, O2...).
  function renderCpStickyInterna(ej, eng){
    const propIdx = eng.interna.propIdx;
    // Si _idd aún no está inicializado para esta oración, lo iniciamos
    // (la sticky se renderiza antes que el body D&D).
    if(!_idd || !_idd.blocks || _idd._propIdx !== propIdx){
      _initIDD(ej, propIdx);
    }
    if(!_idd.blocks || _idd.blocks.length === 0) return '';
    const prop = (ej.proposiciones||[])[propIdx];
    if(!prop) return '';
    const propNum = propIdx + 1;
    const pCls = 'p' + Math.min(propNum, 4);

    // Etiqueta macro del predicado: V/N se decide por el predicado completo
    // (verbo + funciones), no por el verbo aislado. Es PN si así lo dice el
    // banco o si hay un Atributo entre las funciones.
    const aiHere = prop.analisis_interno || {};
    const tieneAtributo = (aiHere.funciones||[]).some(f => f && f.tipo === 'atributo');
    const esNominal = tieneAtributo || _normPredTipo((aiHere.predicado||{}).tipo||'') === 'nominal';
    const macroPredLbl = esNominal ? 'Predicado nominal' : 'Predicado verbal';

    // Agrupa bloques consecutivos por macro-categoría (Sujeto / Predicado)
    const blocks = _idd.blocks.map(b=>({
      ...b,
      macro: b.id === 'suj' ? 'Sujeto' : macroPredLbl,
      placed: _idd.slots[b.id] || null
    }));
    const groups = [];
    blocks.forEach(b=>{
      const last = groups[groups.length-1];
      if(last && last.macro === b.macro) last.cols++;
      else groups.push({macro:b.macro, cols:1, startCol: groups.reduce((s,g)=>s+g.cols, 1)});
    });
    // Recalcular startCol con los cols ya asignados
    let c = 1;
    groups.forEach(g=>{ g.startCol = c; c += g.cols; });
    const totalCols = blocks.length;

    // Fila 1 (macro): Sujeto / Predicado abarcando varias columnas.
    // OCULTAR las etiquetas macro ('Sujeto' / 'Predicado verbal/nominal') hasta
    // que el alumno haya confirmado el análisis. Mostrarlas desde el inicio
    // estaba dando la solución gratis (bug reportado mayo 2026).
    // Antes de confirmar: mostramos solo separadores neutros ('?').
    // Tras confirmar: revelamos la etiqueta correcta.
    const macroHtml = groups.map(g=>{
      const cls = g.macro === 'Sujeto' ? 'cp-stk-macro-suj' : 'cp-stk-macro-pred';
      const label = _idd.confirmed ? g.macro : '?';
      const extraCls = _idd.confirmed ? '' : ' cp-stk-macro-oculto';
      return `<div class="cp-stk-macro ${cls}${extraCls}" style="grid-column:${g.startCol}/${g.startCol+g.cols}">${label}</div>`;
    }).join('');

    // Fila 2 (palabras): cada bloque ocupa una columna
    let col = 1;
    const wordsHtml = blocks.map(b=>{
      const html = `<div class="cp-stk-words" style="grid-column:${col}/${col+1}">${escHtml(b.words)}</div>`;
      col++; return html;
    }).join('');

    // Fila 3 (etiqueta específica): rellena cuando el alumno ha colocado un tag
    col = 1;
    const fncHtml = blocks.map(b=>{
      const isPlaced = !!b.placed;
      const isCorrect = _idd.confirmed && _idd.slotOk[b.id] === true;
      const isWrong   = _idd.confirmed && _idd.slotOk[b.id] === false;
      const label = isPlaced
        ? escHtml(b.placed.label)
        : (b.id === 'pred' ? '?' : b.id === 'suj' ? '?' : '?');
      let cls = 'cp-stk-fnc';
      if(isCorrect) cls += ' cp-stk-fnc-ok';
      else if(isWrong) cls += ' cp-stk-fnc-err';
      else if(isPlaced) cls += ' cp-stk-fnc-placed';
      else cls += ' cp-stk-fnc-empty';
      const html = `<div class="${cls}" style="grid-column:${col}/${col+1}">${label}</div>`;
      col++; return html;
    }).join('');

    return `
      <div class="cp-stk-interna">
        <span class="cp-stk-bracket cp-stk-bracket-l ${pCls}">[</span>
        <div class="cp-stk-grid" style="grid-template-columns:repeat(${totalCols},auto)">
          ${macroHtml}
          ${wordsHtml}
          ${fncHtml}
        </div>
        <span class="cp-stk-bracket cp-stk-bracket-r ${pCls}">]</span>
        <span class="cp-stk-o-marker ${pCls}">O${propNum}</span>
      </div>`;
  }

  function renderCpStickyProps(ej, eng){
    const props = ej.proposiciones || [];
    const tokens = ej.tokens || [];
    const relaciones = ej.relaciones || [];
    const nexos = ej.nexos || [];

    // Helper: texto del nexo que conecta dos oraciones (propA y propB)
    // Prioridad: rel.nexo_ref → primer nexo cuyos índices caen entre las dos. Si
    // no encuentra ninguno, devuelve ''. Excluye nexos que ya están dentro de los
    // indices de propB (típicamente pronombres relativos), porque esos ya
    // aparecen en el texto del chip de propB y no hace falta duplicarlos.
    const nexusTextBetween = (propA, propB, rel)=>{
      let candidato = null;
      if(rel && rel.nexo_ref){
        candidato = nexos.find(n => n.id === rel.nexo_ref);
      }
      if(!candidato){
        const idxsA = (propA.indices || []);
        const idxsB = (propB.indices || []);
        if(idxsA.length === 0 || idxsB.length === 0) return '';
        const lastA = Math.max(...idxsA);
        const firstB = Math.min(...idxsB);
        candidato = nexos.find(n => {
          if(!Array.isArray(n.indices) || n.indices.length === 0) return false;
          const nmin = Math.min(...n.indices);
          const nmax = Math.max(...n.indices);
          return nmin > lastA && nmax < firstB;
        });
      }
      if(!candidato) return '';
      // Si todos los índices del nexo ya están dentro de propB (relativo), no duplicar
      const idxsBSet = new Set(propB.indices || []);
      const todosEnB = (candidato.indices || []).every(i => idxsBSet.has(i));
      if(todosEnB) return '';
      return candidato.forma || (Array.isArray(candidato.indices)
        ? candidato.indices.map(i => tokens.find(t => t.i === i)?.texto || '').join(' ')
        : '');
    };

    let html = '<div class="cp-ctx-props">';
    props.forEach((prop, idx)=>{
      const pNum = idx + 1;
      const pCls = 'p' + Math.min(pNum, 4);
      const isActiva = eng.fase === 'interna' && eng.interna && eng.interna.propIdx === idx;
      const idxs = (prop.indices || []).slice(0, 8);
      const shortText = idxs
        .map(i => tokens.find(t => t.i === i))
        .filter(Boolean)
        .map(t => t.texto)
        .join(' ');
      const needsDots = (prop.indices || []).length > 8;
      html += `<div class="cp-ctx-prop-chip ${pCls}${isActiva?' cp-ctx-prop-activa':''}">
        <span class="cp-ctx-prop-num">O${pNum}</span>
        <span class="cp-ctx-prop-text">${escHtml(shortText)}${needsDots?'…':''}</span>
      </div>`;

      // ── Flecha de relación + NEXO entre chips consecutivos ─────────────
      // El símbolo (→ ↔ ∥) aparece cuando el alumno ya respondió el TIPO; el
      // texto del nexo (que, porque, y, ...) aparece SIEMPRE para que el alumno
      // tenga la oración completa a la vista (bug reportado mayo 2026).
      if(idx < props.length - 1){
        const rel = relaciones.find(r =>
          (r.de === prop.id && r.a === props[idx+1].id) ||
          (r.de === props[idx+1].id && r.a === prop.id) ||
          (r.entre && r.entre.includes(prop.id) && r.entre.includes(props[idx+1].id))
        );
        const relIdx = relaciones.indexOf(rel);
        const f5r = relIdx >= 0 ? (eng.f5Respuestas && eng.f5Respuestas[relIdx]) : null;
        let sym = '·', cls = 'cp-ctx-rel-pending', titulo = 'Por resolver';
        if(rel && f5r && f5r.tipoOk){
          if(rel.tipo === 'subordinacion'){ sym = '→'; cls = 'cp-ctx-rel-sub';   titulo = 'Subordinación'; }
          else if(rel.tipo === 'coordinacion'){ sym = '↔'; cls = 'cp-ctx-rel-coord'; titulo = 'Coordinación';   }
          else { sym = '∥'; cls = 'cp-ctx-rel-yux'; titulo = 'Yuxtaposición'; }
        }
        const nexusTxt = nexusTextBetween(prop, props[idx+1], rel);
        const nexusHtml = nexusTxt
          ? `<span class="cp-ctx-nexus-text" title="Nexo">${escHtml(nexusTxt)}</span>`
          : '';
        html += `<span class="cp-ctx-rel ${cls}" title="${titulo}">${sym}${nexusHtml}</span>`;
      }
    });
    html += '</div>';
    return html;
  }
  // ─────────────────────────────────────────────────────────────────────

  function renderInteractTokens(ej){
    const eng = state.engine;
    const tokens = ej.tokens || [];
    let html = '';
    for(let idx = 0; idx < tokens.length; idx++){
      const t = tokens[idx];
      const cat = t.categoria || 'otro';
      const i = t.i;
      let cls = 'cp-tok';
      let clickable = (cat !== 'puntuacion');
      if(eng.fase === 1){
        if(eng.verbosConfirmados.has(i)) cls += ' correcto locked';
        else if(eng.verbosErrados.has(i)) cls += ' error locked';
        else if(eng.verbosSeleccionados.has(i)) cls += ' selected';
      } else if(eng.fase === 2){
        if(eng.verbosConfirmados.has(i)) cls += ' correcto locked';
        else if(eng.nexosConfirmados.has(i)) cls += ' correcto locked';
        else if(eng.nexosErrados.has(i)) cls += ' error locked';
        else if(eng.nexosSeleccionados.has(i)) cls += ' selected';
      } else if(eng.fase === 3){
        // En fase 3: cada token asignado a una oración se colorea
        // Los verbos confirmados quedan auto-asignados a su oración
        const propAsignada = eng.f3Asignaciones.get(i);
        if(propAsignada){
          cls += ' p' + Math.min(propAsignada, 4);
          // Si era un verbo confirmado en fase 1, lo bloqueamos visualmente
          if(eng.verbosConfirmados.has(i)){
            cls += ' verbo-locked locked';
            clickable = false;
          }
        }
      }
      if(cat === 'puntuacion'){ cls += ' puntuacion'; clickable = false; }
      const dataAttr = clickable ? `data-i="${i}"` : '';
      const tokHtml = `<span class="${cls}" ${dataAttr}>${escHtml(t.texto)}</span>`;
      // Aperturas: ¿ ¡ — se pegan a la palabra SIGUIENTE
      const esApertura = (cat === 'puntuacion' && /^[¿¡]$/.test(t.texto || ''));
      // Si el SIGUIENTE token es puntuación, unimos los dos con Word Joiner (\u2060)
      // para que NUNCA se separen en un salto de línea.
      const next = tokens[idx+1];
      if(esApertura){
        html += tokHtml + '\u2060';  // ¿/¡ pegado a la palabra siguiente
      } else if(next && next.categoria === 'puntuacion'){
        html += tokHtml + '\u2060';  // palabra pegada a su puntuación posterior
      } else if(cat === 'puntuacion'){
        html += tokHtml + ' ';
      } else {
        html += tokHtml + ' ';
      }
    }
    return html.trimEnd();
  }

  function renderTally(){
    const eng = state.engine;
    let ok, er;
    if(eng.fase === 1){ ok = eng.verbosAciertos; er = eng.verbosErrores; }
    else if(eng.fase === 2){ ok = eng.nexosAciertos; er = eng.nexosErrores; }
    else if(eng.fase === 3){ ok = eng.f3Aciertos; er = eng.f3Errores; }
    else if(eng.fase === 5){ ok = eng.f5Aciertos; er = eng.f5Errores; }
    else return '';
    return `
      <div class="cp-tally">
        <span class="cp-tally-item"><span class="cp-tally-num ok">${ok}</span> aciertos</span>
        <span class="cp-tally-item"><span class="cp-tally-num err">${er}</span> errores</span>
      </div>`;
  }

  function renderFeedback(msg){
    return `<div class="cp-feedback cp-feedback-${msg.tipo}">${msg.html}</div>`;
  }

  function renderActions(fase, ej, tieneNexos){
    const eng = state.engine;

    if(fase === 1 || fase === 2){
      const errCount = fase === 1 ? eng.verbosErrores : eng.nexosErrores;
      const pistaUsada = fase === 1 ? eng.pistaUsadaF1 : eng.pistaUsadaF2;
      // Para fase 1, una oración se considera "completa" si al menos UNO de los tokens
      // de su perífrasis está confirmado. Esto cuenta correctamente cuando hay formas compuestas.
      let propsCubiertas = 0;
      let propsTotales = (ej.proposiciones||[]).length;
      if(fase === 1){
        (ej.proposiciones||[]).forEach(p=>{
          const perif = eng.perifByProp.get(p.id);
          if(perif){
            for(const idx of perif){
              if(eng.verbosConfirmados.has(idx)){ propsCubiertas++; break; }
            }
          }
        });
      }
      const completos = (fase === 1)
        ? (propsCubiertas >= propsTotales)
        : (eng.nexosConfirmados.size >= eng.nexosCorrectos.size);
      const faltanFase1 = propsTotales - propsCubiertas;
      const faltanFase2 = eng.nexosCorrectos.size - eng.nexosConfirmados.size;

      return `
        <div class="cp-actions">
          ${(errCount >= 2 && !pistaUsada) ? `<button type="button" class="cp-btn-secondary" onclick="CP.pedirPista()">💡 Pista</button>` : ''}
          <button type="button" class="cp-btn-secondary cp-btn-skip" onclick="CP.saltarFase()" title="Avanzar sin completar este paso">Saltar paso →</button>
          <div class="cp-spacer"></div>
          ${completos
            ? `<button type="button" class="cp-btn-primary" onclick="CP.avanzarFase()">Siguiente fase →</button>`
            : `<span style="color:var(--muted);font-size:.82rem;font-style:italic">Faltan por encontrar: ${fase===1?faltanFase1:faltanFase2}</span>`
          }
        </div>`;
    }

    if(fase === 3){
      // Total de tokens que el alumno DEBE asignar correctamente
      const total = eng.tokenAProp.size;
      const completos = eng.f3Confirmados.size >= total;
      return `
        <div class="cp-actions">
          ${(eng.f3Errores >= 2 && !eng.pistaUsadaF3) ? `<button type="button" class="cp-btn-secondary" onclick="CP.pedirPista()">💡 Pista</button>` : ''}
          <button type="button" class="cp-btn-secondary cp-btn-skip" onclick="CP.saltarFase()" title="Avanzar sin completar este paso">Saltar paso →</button>
          <div class="cp-spacer"></div>
          ${completos
            ? `<button type="button" class="cp-btn-primary" onclick="CP.avanzarFase()">Siguiente fase →</button>`
            : `<span style="color:var(--muted);font-size:.82rem;font-style:italic">Tokens por asignar correctamente: ${total - eng.f3Confirmados.size}</span>`
          }
        </div>`;
    }

    if(fase === 5){
      const relIdx = eng.f5IdxActual;
      const ej2 = state.filtered[state.idx];
      const rel = (ej2.relaciones||[])[relIdx];
      const resp = (eng.f5Respuestas[relIdx]) || {};
      // ¿La relación actual está completa? Ahora incluye familia y subtipo.
      let completo = false;
      let pendienteMsg = 'Elige el tipo de relación';
      if(resp.tipoOk === true){
        if(rel.tipo === 'subordinacion'){
          if(resp.familiaOk !== true){
            pendienteMsg = 'Elige la familia';
          } else if(resp.subtipoOk !== true){
            pendienteMsg = 'Elige el subtipo';
          } else if(resp.direccionOk !== true){
            pendienteMsg = 'Elige la dirección';
          } else if(!funcionEsRedundante(rel) && resp.funcionOk !== true){
            pendienteMsg = 'Elige la función';
          } else if(rel.funcion === 'termino_preposicion' && rel.funcion_sp && resp.funcionSpOk !== true){
            pendienteMsg = 'Elige la función del SP';
          } else {
            completo = true;
          }
        } else if(rel.tipo === 'coordinacion'){
          // Para coordinación: tipo + subtipo
          if(resp.subtipoOk !== true){
            pendienteMsg = 'Elige el subtipo de coordinación';
          } else {
            completo = true;
          }
        } else {
          // Yuxtaposición: con el tipo basta
          completo = true;
        }
      }
      const ultimaRel = relIdx >= (ej2.relaciones||[]).length - 1;
      const textoBoton = ultimaRel ? 'Ver resumen →' : 'Siguiente relación →';
      return `
        <div class="cp-actions">
          <button type="button" class="cp-btn-secondary cp-btn-skip" onclick="CP.saltarFase()" title="Avanzar sin completar esta relación">Saltar relación →</button>
          <div class="cp-spacer"></div>
          ${completo
            ? `<button type="button" class="cp-btn-primary" onclick="CP.avanzarRelacionF5()">${textoBoton}</button>`
            : `<span style="color:var(--muted);font-size:.82rem;font-style:italic">${pendienteMsg}</span>`
          }
        </div>`;
    }
    return '';
  }

  // ─────────────────────────────────────────────────────────────────────
  // INTERACCIÓN: click en un token
  // ─────────────────────────────────────────────────────────────────────
  function onTokenClick(i){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;

    if(eng.fase === 1){
      // ¿Ya estaba confirmado o errado? Ignorar
      if(eng.verbosConfirmados.has(i) || eng.verbosErrados.has(i)) return;
      // ¿Lo había clicado ya y está en seleccionados? Quitar selección.
      if(eng.verbosSeleccionados.has(i)){
        eng.verbosSeleccionados.delete(i);
        eng.mensajeFeedback = null;
        renderFase();
        return;
      }
      // Click nuevo: validar inmediatamente
      if(eng.verbosCorrectos.has(i)){
        // Si el token forma parte de una perífrasis, confirmamos TODA la perífrasis
        // (todos sus tokens). Así el alumno solo necesita un click para reconocerla.
        const propId = eng.verboPropByIdx.get(i);
        const perif = propId ? eng.perifByProp.get(propId) : null;
        if(perif && perif.size > 1){
          // Solo cuenta 1 acierto por perífrasis (no uno por token)
          let yaConfirmados = 0;
          perif.forEach(idx=>{ if(eng.verbosConfirmados.has(idx)) yaConfirmados++; });
          if(yaConfirmados === 0){
            eng.verbosAciertos += 1;
          }
          perif.forEach(idx=>eng.verbosConfirmados.add(idx));
          const perifText = Array.from(perif).sort((a,b)=>a-b).map(idx=>ej.tokens[idx]?.texto||'').join(' ');
          eng.mensajeFeedback = {
            tipo:'ok',
            html: `✓ Correcto. «<b>${escHtml(perifText)}</b>» es el núcleo verbal de una oración (forma verbal compuesta o perífrasis).`
          };
          if(typeof playSuccess === 'function') playSuccess();
        } else {
          eng.verbosConfirmados.add(i);
          eng.verbosAciertos += 1;
          eng.mensajeFeedback = {
            tipo:'ok',
            html: '✓ Correcto. ' + descripcionVerboCorrecto(i, ej)
          };
          if(typeof playSuccess === 'function') playSuccess();
        }
      } else {
        eng.verbosErrados.add(i);
        eng.verbosErrores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: '✗ Ese no es el núcleo de una oración. ' + razonVerboIncorrecto(i, ej)
        };
        if(typeof playError === 'function') playError();
        if(typeof trackError === 'function') trackError('compuestas', 'verbo_NP');
      }
      renderFase();
      return;
    }

    if(eng.fase === 2){
      if(eng.nexosConfirmados.has(i) || eng.nexosErrados.has(i)) return;
      if(eng.nexosSeleccionados.has(i)){
        eng.nexosSeleccionados.delete(i);
        eng.mensajeFeedback = null;
        renderFase();
        return;
      }
      if(eng.nexosCorrectos.has(i)){
        // Si el token forma parte de una locución conjuntiva (nexo de varias palabras),
        // confirmamos TODOS sus tokens de una sola vez. Solo cuenta 1 acierto por nexo,
        // no uno por palabra. Mismo patrón que perífrasis en fase 1.
        const nexoIdxs = eng.nexoByIdx.get(i);
        if(nexoIdxs && nexoIdxs.size > 1){
          let yaConfirmados = 0;
          nexoIdxs.forEach(idx=>{ if(eng.nexosConfirmados.has(idx)) yaConfirmados++; });
          if(yaConfirmados === 0){
            eng.nexosAciertos += 1;
          }
          nexoIdxs.forEach(idx=>eng.nexosConfirmados.add(idx));
          const nexoText = Array.from(nexoIdxs).sort((a,b)=>a-b).map(idx=>ej.tokens[idx]?.texto||'').join(' ');
          eng.mensajeFeedback = {
            tipo:'ok',
            html: `✓ Correcto. «<b>${escHtml(nexoText)}</b>» es una locución conjuntiva: un nexo de varias palabras que funciona como una unidad.`
          };
          if(typeof playSuccess === 'function') playSuccess();
        } else {
          eng.nexosConfirmados.add(i);
          eng.nexosAciertos += 1;
          eng.mensajeFeedback = {
            tipo:'ok',
            html: '✓ Correcto. ' + descripcionNexoCorrecto(i, ej)
          };
          if(typeof playSuccess === 'function') playSuccess();
        }
      } else {
        eng.nexosErrados.add(i);
        eng.nexosErrores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: '✗ Ese no funciona como nexo entre oraciones. ' + razonNexoIncorrecto(i, ej)
        };
        if(typeof playError === 'function') playError();
        if(typeof trackError === 'function') trackError('compuestas', 'nexo');
      }
      renderFase();
      return;
    }

    if(eng.fase === 3){
      const propActiva = eng.f3PropActiva;
      const propCorrecta = eng.tokenAProp.get(i);  // puede ser undefined (token sin oración)
      const yaAsignado = eng.f3Asignaciones.get(i);
      const tok = ej.tokens[i];

      // Si está bloqueado (verbo confirmado), informar sin penalizar
      if(eng.verbosConfirmados.has(i) && yaAsignado){
        eng.mensajeFeedback = {
          tipo:'info',
          html: `Este verbo ya quedó asignado a O${yaAsignado} desde el paso anterior.`
        };
        renderFase();
        return;
      }

      // Si el token ya estaba asignado a la prop activa, quitarlo (toggle)
      if(yaAsignado === propActiva){
        eng.f3Asignaciones.delete(i);
        if(eng.f3Confirmados.has(i)){
          eng.f3Confirmados.delete(i);
          eng.f3Aciertos = Math.max(0, eng.f3Aciertos - 1);
        }
        eng.mensajeFeedback = null;
        renderFase();
        return;
      }

      // Token SIN oración asignable (típicamente un nexo)
      // No cuenta como error: damos feedback PEDAGÓGICO claro y aclaratorio.
      if(propCorrecta === undefined){
        // ¿Es un nexo? ¿De qué tipo?
        const nexoInfo = (ej.nexos||[]).find(n=>Array.isArray(n.indices) && n.indices.includes(i));
        if(nexoInfo){
          const cat = nexoInfo.categoria;
          if(cat === 'pronombre_relativo'){
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> es un pronombre relativo. Funciona como nexo aquí, pero además tiene su propia función sintáctica dentro de la oración a la que pertenece (eso lo veremos más adelante). Por ahora puedes dejarlo sin asignar a ninguna oración.`
            };
          } else if(cat === 'conjuncion'){
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> es una conjunción. Solo enlaza las oraciones; no forma parte de ninguna de ellas. Déjala sin asignar.`
            };
          } else if(cat === 'locucion_conjuntiva'){
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> forma parte de una locución conjuntiva (nexo de varias palabras). No se asigna a ninguna oración.`
            };
          } else {
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> es un nexo entre oraciones. No pertenece a ninguna de ellas.`
            };
          }
        } else {
          // Caso muy raro: algún token sin propietario y sin estar en nexos. Probablemente puntuación.
          eng.mensajeFeedback = {
            tipo:'info',
            html: `<b>«${escHtml(tok?.texto||'')}»</b> no se asigna a ninguna oración.`
          };
        }
        renderFase();
        return;
      }

      // Token que pertenece a la P_n activa: asignación correcta
      if(propCorrecta === propActiva){
        eng.f3Asignaciones.set(i, propActiva);
        if(!eng.f3Confirmados.has(i)){
          eng.f3Confirmados.add(i);
          eng.f3Aciertos += 1;
          if(typeof playSuccess === 'function') playSuccess();
        }
        eng.mensajeFeedback = null;
        // ¿Hemos completado P_activa?
        const tokensDeActiva = Array.from(eng.tokenAProp.entries())
          .filter(([_, p])=>p === propActiva)
          .map(([idx])=>idx);
        const completosActiva = tokensDeActiva.every(idx=>eng.f3Confirmados.has(idx));
        if(completosActiva){
          // ¿Hay siguiente P_n?
          const totalProps = (ej.proposiciones||[]).length;
          if(propActiva < totalProps){
            eng.f3PropActiva = propActiva + 1;
            // Si la siguiente P_n YA está completa (solo verbo, pre-asignado),
            // saltamos automáticamente hasta encontrar una P_n con tokens por asignar
            avanzarPropActivaSiCompleta(ej);
            if(eng.f3PropActiva <= totalProps){
              // Toast flotante animado en vez de mensaje en línea (más visible)
              mostrarToast({
                titulo: `¡O${propActiva} terminada!`,
                subtitulo: `Ahora identifica las palabras de O${eng.f3PropActiva}`,
                colorIdx: Math.min(eng.f3PropActiva, 4)
              });
            } else {
              // Saltamos todas las restantes (todas eran solo verbo)
              mostrarToast({
                titulo: `¡Has delimitado todas las oraciones!`,
                subtitulo: `Pulsa «Siguiente fase» para clasificarlas`,
                colorIdx: 0
              });
            }
            eng.mensajeFeedback = null;
          } else {
            mostrarToast({
              titulo: `¡Has delimitado todas las oraciones!`,
              subtitulo: `Pulsa «Siguiente fase» para clasificarlas`,
              colorIdx: 0
            });
            eng.mensajeFeedback = null;
          }
        }
        renderFase();
        return;
      }

      // Token que pertenece a OTRA oración (no la activa).
      // Esto NO se asigna y NO cuenta como error grave: es solo desorientación.
      // Damos feedback claro sobre dónde estamos y qué es ese token.
      eng.f3Errores += 1;  // sí lo contamos, pero solo para estadística (no penaliza el avance)
      if(typeof playError === 'function') playError();
      if(typeof trackError === 'function') trackError('compuestas', 'delimitar');
      eng.mensajeFeedback = {
        tipo:'warn',
        html: `<b>«${escHtml(tok?.texto||'')}»</b> pertenece a <b style="color:var(--cp-p${Math.min(propCorrecta,4)})">O${propCorrecta}</b>, no a <b style="color:var(--cp-p${Math.min(propActiva,4)})">O${propActiva}</b>. Ahora estamos identificando solo las palabras de <b style="color:var(--cp-p${Math.min(propActiva,4)})">O${propActiva}</b>.`
      };
      renderFase();
      return;
    }
  }

  // Mensajes pedagógicos contextuales
  function descripcionVerboCorrecto(i, ej){
    const tok = ej.tokens[i];
    // ¿Es un verbo léxico final de una perífrasis?
    const prop = (ej.proposiciones||[]).find(p=>p.verbo?.indice === i);
    if(prop?.verbo?.indices_perifrasis && prop.verbo.indices_perifrasis.length > 1){
      const perif = prop.verbo.indices_perifrasis.map(idx=>ej.tokens[idx]?.texto||'').join(' ');
      return `«${escHtml(tok?.texto||'')}» es el núcleo léxico de la perífrasis «${escHtml(perif)}».`;
    }
    return `«${escHtml(tok?.texto||'')}» es el verbo de una oración.`;
  }

  function razonVerboIncorrecto(i, ej){
    const tok = ej.tokens[i];
    if(!tok) return '';
    const cat = tok.categoria;
    // ¿Es un verbo, pero auxiliar de una perífrasis?
    for(const p of (ej.proposiciones||[])){
      const perif = p.verbo?.indices_perifrasis;
      if(Array.isArray(perif) && perif.includes(i) && p.verbo.indice !== i){
        return `«${escHtml(tok.texto)}» es el verbo auxiliar de una perífrasis. En las perífrasis se marca solo el verbo léxico (el último).`;
      }
    }
    if(cat === 'verbo'){
      return `«${escHtml(tok.texto)}» es una forma verbal, pero aquí no actúa como núcleo de una oración.`;
    }
    if(cat === 'sustantivo') return `«${escHtml(tok.texto)}» es un sustantivo.`;
    if(cat === 'adjetivo') return `«${escHtml(tok.texto)}» es un adjetivo.`;
    if(cat === 'adverbio') return `«${escHtml(tok.texto)}» es un adverbio.`;
    if(cat === 'pronombre') return `«${escHtml(tok.texto)}» es un pronombre.`;
    if(cat === 'pronombre_relativo') return `«${escHtml(tok.texto)}» es un pronombre relativo, no un verbo.`;
    if(cat === 'conjuncion') return `«${escHtml(tok.texto)}» es una conjunción.`;
    return `«${escHtml(tok.texto)}» no es un verbo.`;
  }

  function descripcionNexoCorrecto(i, ej){
    const tok = ej.tokens[i];
    const n = (ej.nexos||[]).find(nx=>Array.isArray(nx.indices) && nx.indices.includes(i));
    if(!n) return `«${escHtml(tok?.texto||'')}» une dos oraciones.`;
    const cat = n.categoria || 'conjuncion';
    const lblCat = {
      'conjuncion':'conjunción',
      'pronombre_relativo':'pronombre relativo',
      'locucion_conjuntiva':'locución conjuntiva',
      'puntuacion':'signo de puntuación con valor de nexo'
    }[cat] || cat;
    return `«${escHtml(n.forma||tok?.texto||'')}» es una ${escHtml(lblCat)} que une las oraciones.`;
  }

  function razonNexoIncorrecto(i, ej){
    const tok = ej.tokens[i];
    if(!tok) return '';
    const cat = tok.categoria;
    if(cat === 'verbo') return `«${escHtml(tok.texto)}» es un verbo (núcleo de oración), no un nexo entre ellas.`;
    if(cat === 'sustantivo') return `«${escHtml(tok.texto)}» es un sustantivo.`;
    if(cat === 'adjetivo') return `«${escHtml(tok.texto)}» es un adjetivo.`;
    if(cat === 'adverbio') return `«${escHtml(tok.texto)}» es un adverbio. Los adverbios no suelen funcionar como nexos entre oraciones.`;
    if(cat === 'pronombre') return `«${escHtml(tok.texto)}» es un pronombre personal, no un nexo.`;
    return `«${escHtml(tok.texto)}» no enlaza oraciones aquí.`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // AVANZAR DE FASE
  // ─────────────────────────────────────────────────────────────────────
  function avanzarFase(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const tieneNexos = (ej.proposiciones||[]).length > 1 && (ej.nexos||[]).length > 0;
    const unaSolaProp = (ej.proposiciones||[]).length === 1;

    if(eng.fase === 1){
      // Tras fase 1: ir a fase 2 si hay nexos, si no a fase 3 (delimitar)
      mostrarToast({
        titulo:'¡Verbos identificados!',
        subtitulo: tieneNexos ? 'Ahora vamos a por los nexos' : (!unaSolaProp ? 'Ahora vamos a delimitar las oraciones' : 'Ahora a clasificar la oración'),
        colorIdx: 1
      });
      if(tieneNexos){
        eng.fase = 2;
      } else if(!unaSolaProp){
        // Sin nexos pero con varias oraciones (yuxtaposición sin signo)
        eng.fase = 3;
        preAsignarVerbosFase3();
      } else {
        // Una sola oración: ir directamente a fase 5 (clasificar y relacionar)
        irFaseClasificarYRelacionar(ej);
      }
      eng.mensajeFeedback = null;
      renderFase();
      return;
    }
    if(eng.fase === 2){
      // Tras fase 2: ir a fase 3 (delimitar). Pre-asignar los verbos.
      mostrarToast({
        titulo:'¡Nexos identificados!',
        subtitulo:'Ahora delimita las palabras de cada oración',
        colorIdx: 2
      });
      eng.fase = 3;
      preAsignarVerbosFase3();
      eng.mensajeFeedback = null;
      renderFase();
      return;
    }
    if(eng.fase === 3){
      // Tras fase 3: ir a la fase de clasificar y relacionar.
      mostrarToast({
        titulo:'¡Proposiciones delimitadas!',
        subtitulo:'Ahora clasifica el tipo de oración y las relaciones',
        colorIdx: 3
      });
      irFaseClasificarYRelacionar(ej);
      eng.mensajeFeedback = null;
      renderFase();
      return;
    }
  }

  // Helper: ir a la fase de "clasificar y relacionar".
  // Si la oración solo tiene 1 oración, no hay relaciones → resumen directo.
  function irFaseClasificarYRelacionar(ej){
    const eng = state.engine;
    const tieneRelaciones = (ej.relaciones||[]).length > 0;
    if(tieneRelaciones){
      eng.fase = 5;
      eng.f5IdxActual = 0;
    } else {
      eng.fase = 'resumen';
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // SALTAR FASE — escape hatch para cuando el alumno se atranca o hay bug.
  // Marca la fase como saltada en una nota interna y avanza al siguiente paso.
  // ─────────────────────────────────────────────────────────────────────
  function saltarFase(){
    const eng = state.engine;
    if(!eng) return;
    eng.skippedFases = eng.skippedFases || new Set();
    if(eng.fase === 1 || eng.fase === 2 || eng.fase === 3){
      eng.skippedFases.add(eng.fase);
      eng.mensajeFeedback = null;
      // Si saltamos fase 1, pre-confirmamos todos los verbos correctos para que fase 3 funcione
      if(eng.fase === 1){
        eng.verbosCorrectos.forEach(idx=>eng.verbosConfirmados.add(idx));
      }
      // Si saltamos fase 3, pre-asignamos los tokens correctos para mantener coherencia
      if(eng.fase === 3){
        eng.tokenAProp.forEach((numProp, idx)=>{
          eng.f3Asignaciones.set(idx, numProp);
          eng.f3Confirmados.add(idx);
        });
      }
      avanzarFase();
      return;
    }
    if(eng.fase === 5){
      // Saltar la relación actual y pasar a la siguiente o al final
      eng.skippedFases.add('5_' + eng.f5IdxActual);
      eng.mensajeFeedback = null;
      avanzarRelacionF5();
      return;
    }
  }

  // Pre-asignar los verbos confirmados de fase 1 a su oración correcta
  // (para que al entrar a fase 3 el alumno los vea ya asignados y no tenga que repetirlos)
  function preAsignarVerbosFase3(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    eng.verbosConfirmados.forEach(i=>{
      const propCorrecta = eng.tokenAProp.get(i);
      if(propCorrecta){
        eng.f3Asignaciones.set(i, propCorrecta);
        eng.f3Confirmados.add(i);
        eng.f3Aciertos += 1;
      }
    });
    // Tras pre-asignar verbos: si la P_n activa ya está completa (caso de propos
    // que solo constan del verbo, como "hay quien piensa..." donde O1 = "hay"),
    // saltamos automáticamente a la siguiente P_n con tokens por asignar.
    avanzarPropActivaSiCompleta(ej);
  }

  // Avanza f3PropActiva al primer P_n que tenga tokens NO confirmados todavía.
  // Si todas están completas, no toca f3PropActiva.
  function avanzarPropActivaSiCompleta(ej){
    const eng = state.engine;
    const totalProps = (ej?.proposiciones||[]).length;
    while(eng.f3PropActiva <= totalProps){
      // ¿Tiene esta P_n tokens por asignar todavía?
      const tokensActiva = Array.from(eng.tokenAProp.entries())
        .filter(([_, p])=>p === eng.f3PropActiva)
        .map(([idx])=>idx);
      const pendientes = tokensActiva.filter(idx=>!eng.f3Confirmados.has(idx));
      if(pendientes.length > 0) return; // hay trabajo en esta P_n, parar aquí
      // Esta P_n está completa: pasar a la siguiente
      eng.f3PropActiva += 1;
    }
    // Si llegamos aquí, todas están completas (caso degenerado: oración con
    // solo verbos sueltos). Dejamos f3PropActiva apuntando más allá del total
    // para que renderActions detecte "completos" y muestre "Siguiente fase".
  }

  // PISTA: marca brevemente los tokens correctos restantes
  function pedirPista(){
    const eng = state.engine;
    if(!eng) return;
    let titulo = 'Pista', html = '';
    if(eng.fase === 1){
      eng.pistaUsadaF1 = true;
      const pendientes = Array.from(eng.verbosCorrectos).filter(i=>!eng.verbosConfirmados.has(i));
      html = `Te faltan <b>${pendientes.length}</b> verbo${pendientes.length===1?'':'s'} por marcar. Mira con atención las formas conjugadas.`;
    } else if(eng.fase === 2){
      eng.pistaUsadaF2 = true;
      const pendientes = Array.from(eng.nexosCorrectos).filter(i=>!eng.nexosConfirmados.has(i));
      html = `Te falta${pendientes.length===1?'':'n'} <b>${pendientes.length}</b> nexo${pendientes.length===1?'':'s'} por marcar. Busca conjunciones o pronombres relativos.`;
    } else if(eng.fase === 3){
      eng.pistaUsadaF3 = true;
      const totalPorAsignar = eng.tokenAProp.size - eng.f3Confirmados.size;
      const faltantesPorProp = new Map();
      eng.tokenAProp.forEach((numProp, i)=>{
        if(!eng.f3Confirmados.has(i)) faltantesPorProp.set(numProp, (faltantesPorProp.get(numProp)||0)+1);
      });
      const partes = [];
      faltantesPorProp.forEach((c, p)=>{ partes.push(`O${p}: ${c}`); });
      html = `Te faltan <b>${totalPorAsignar}</b> tokens por asignar (${partes.join(', ')}). Recuerda que algunos tokens pueden no pertenecer a ninguna oración (los nexos completivos).`;
    }
    if(html && typeof window.showPistaFlotante === 'function'){
      window.showPistaFlotante({titulo, html, tipo:'compuesta'});
    }
    renderFase();
  }

  // Familia inferida del subtipo correcto (para validar el sub-paso "familia")
  function familiaDelSubtipo(subtipo){
    if(!subtipo) return null;
    if(subtipo.startsWith('sustantiva')) return 'sustantiva';
    if(subtipo.startsWith('relativa')) return 'relativa';
    if(['temporal','locativa','modal','comparativa','condicional','final','causal','concesiva','ilativa_constr'].includes(subtipo)) return 'construccion';
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Helper de feedback escalonado para CP (Fase 1.3 mayo 2026)
  //
  // Llama a lookupScaffoldCP(marcada, real) para obtener {fijo, pista}
  // contextualizado, llama a trackError('compuestas', realId) para
  // contabilizar el fallo, decide vía shouldShowMicroLeccionCP si añadir
  // un botón "Ver lección", y devuelve un fragmento HTML listo para
  // insertar en eng.mensajeFeedback.html.
  //
  // Todas las dependencias (trackError, lookupScaffoldCP,
  // shouldShowMicroLeccionCP, openMicroLeccion) son funciones globales
  // expuestas por app.js. Se llaman vía window.X y se protegen con
  // typeof por si el módulo de feedback aún no estuviera cargado.
  // ─────────────────────────────────────────────────────────────────────
  function buildScaffoldFeedbackCP({titulo, realId, marcadaId, razon}){
    // 1. Track error (no bloqueante)
    if(typeof trackError === 'function'){
      try{ trackError('compuestas', realId); }catch(e){}
    }
    // 2. Lookup contextual fijo + pista
    let scaffold = {fijo:'', pista:''};
    if(typeof lookupScaffoldCP === 'function'){
      try{ scaffold = lookupScaffoldCP(marcadaId, realId); }catch(e){}
    }
    // 3. ¿Mostrar botón de lección? (también guarda el ID pendiente)
    let showLec = false;
    if(typeof shouldShowMicroLeccionCP === 'function'){
      try{ showLec = !!shouldShowMicroLeccionCP(realId); }catch(e){}
    }
    // 4. Construir HTML del feedback escalonado
    // El TÍTULO y el SCAFFOLD FIJO se quedan inline (feedback contextual breve).
    // La PISTA y la LECCIÓN se ofrecen como botones que abren la pista flotante
    // (A.1, mayo 2026) — siempre visible sin scroll, paleta teal/navy.
    const titHtml = `<div class="cp-feedback-title">✗ ${titulo}${razon ? '. ' + escHtml(razon) : '.'}</div>`;
    const fijoHtml = scaffold.fijo
      ? `<div class="cp-feedback-fijo" style="margin-top:8px;font-size:.92rem;line-height:1.45">${escHtml(scaffold.fijo)}</div>`
      : '';
    // Guardamos los datos para que el botón los pase a la ventana flotante.
    const pistaText = scaffold.pista || '';
    // shouldShowMicroLeccionCP ya guardó _pendingMicroLeccion en pista-ui.js,
    // pero también pedimos el id directo aquí por si lo usamos en el botón.
    const actionsHtml = (scaffold.pista || showLec)
      ? `<div class="cp-feedback-actions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
           ${scaffold.pista
             ? `<button type="button" class="cp-btn-pista" data-pista="${escAttr(pistaText)}" data-show-lec="${showLec?'1':''}" onclick="CP.abrirPistaFlotante(this)">💡 Ver pista</button>`
             : ''}
           ${showLec
             ? `<button type="button" class="cp-btn-leccion" onclick="if(window.openMicroLeccion)window.openMicroLeccion()">📖 Ver micro-lección</button>`
             : ''}
         </div>`
      : '';
    return titHtml + fijoHtml + actionsHtml;
  }

  // Helper invocado desde el botón "💡 Ver pista" del feedback. Abre la
  // pista flotante con el texto guardado en data-pista y, si procede,
  // ofrece también el botón "Ver micro-lección" en su footer.
  function abrirPistaFlotante(btn){
    if(!btn) return;
    const pista = btn.dataset.pista || '';
    const showLec = btn.dataset.showLec === '1';
    if(typeof window.showPistaFlotante !== 'function') return;
    window.showPistaFlotante({
      titulo: 'Pista',
      html: escHtml(pista),
      leccionId: showLec ? '__pending__' : '',
      tipo: 'compuesta'
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // FASE 5 — Relaciones entre oraciones
  // ═════════════════════════════════════════════════════════════════════

  // Mini-resumen visual de las oraciones ya clasificadas
  function renderResumenPropos(ej){
    const items = (ej.proposiciones||[]).map((p,idx)=>{
      const n = idx + 1;
      const colorCls = 'p' + Math.min(n, 4);
      const tipoLbl = etiquetaTipoProp(p.tipo);
      const subLbl = p.subtipo ? ' · ' + etiquetaSubtipoExtendida(p.subtipo) : '';
      return `
        <div class="cp-prop-mini ${colorCls}">
          <span class="cp-clasif-prop-id ${colorCls}">O${n}</span>
          <span style="font-weight:700">${escHtml(tipoLbl)}</span>
          <span style="color:var(--muted);font-size:.78rem">${escHtml(subLbl)}</span>
        </div>`;
    }).join('');
    return `
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">${items}</div>`;
  }

  function renderRelaciones5(ej){
    const eng = state.engine;
    const relIdx = eng.f5IdxActual;
    const rel = (ej.relaciones||[])[relIdx];
    if(!rel) return '';
    if(!eng.f5Respuestas[relIdx]) eng.f5Respuestas[relIdx] = {};
    const resp = eng.f5Respuestas[relIdx];

    // ¿Qué oraciones implica esta relación?
    const propIds = Array.isArray(rel.proposiciones) ? rel.proposiciones : [];
    // Calcular números visibles (O1, O2...) según el índice en ej.proposiciones
    const propIdToNum = new Map();
    (ej.proposiciones||[]).forEach((p,i)=>propIdToNum.set(p.id, i+1));
    const propNums = propIds.map(id=>propIdToNum.get(id));

    let html = `<div class="cp-clasif-prop-card">`;
    // Cabecera: muestra qué relación estamos respondiendo
    html += `
      <div class="cp-clasif-prop-header">
        <span style="font-weight:800;font-size:.92rem;color:var(--ink)">Relación ${relIdx+1} de ${ej.relaciones.length}:</span>
        ${propNums.map(n=>`<span class="cp-clasif-prop-id p${Math.min(n,4)}">O${n}</span>`).join('<span style="color:var(--muted);font-weight:800"> ↔ </span>')}
      </div>
    `;

    // ─── Sub-paso 1: TIPO de relación ─────────────────────────────────
    const opcionesTipo = [
      ['subordinacion','Subordinación','Una oración depende de otra y desempeña una función dentro de ella.'],
      ['coordinacion','Coordinación','Las oraciones están al mismo nivel, unidas por un nexo («y», «pero», «o»).'],
      ['yuxtaposicion','Yuxtaposición','Las oraciones están al mismo nivel, sin nexo (separadas por coma, punto y coma…).']
    ];
    html += `
      <div class="cp-clasif-q">
        <span class="cp-clasif-q-label">1. Tipo de relación</span>
        <div class="cp-clasif-opts cp-clasif-opts-vertical">
          ${opcionesTipo.map(([v,lbl,desc])=>{
            let cls = 'cp-clasif-opt cp-clasif-opt-familia';
            if(resp.tipo === v){
              if(resp.tipoOk === true) cls += ' correcto locked unica';
              else if(resp.tipoOk === false) cls += ' error';
              else cls += ' selected';
            }
            if(resp.tipoOk === true && resp.tipo !== v) cls += ' locked descartada';
            return `<button type="button" class="${cls}" data-q-rel="tipo" data-v="${v}">
              <span style="font-weight:800;display:block;margin-bottom:2px">${escHtml(lbl)}</span>
              <span style="font-size:.78rem;font-weight:500;opacity:.85">${escHtml(desc)}</span>
            </button>`;
          }).join('')}
        </div>
      </div>`;

    // ─── Sub-paso 2: FAMILIA (solo si tipo=subordinacion) ─────────────
    if(resp.tipoOk === true && rel.tipo === 'subordinacion'){
      const opcionesFamilia = [
        ['sustantiva','Sustantiva','Hace una función propia de un sintagma nominal (sujeto, CD, atributo…).'],
        ['relativa','De relativo (adjetiva)','Complementa a un sustantivo, como un adjetivo.'],
        ['construccion','Construcción','Antes llamadas adverbiales: temporales, causales, finales, condicionales, concesivas, ilativas.']
      ];
      html += `
        <div class="cp-clasif-q">
          <span class="cp-clasif-q-label">2. Familia de subordinada</span>
          <div class="cp-clasif-opts cp-clasif-opts-vertical">
            ${opcionesFamilia.map(([v,lbl,desc])=>{
              let cls = 'cp-clasif-opt cp-clasif-opt-familia';
              if(resp.familia === v){
                if(resp.familiaOk === true) cls += ' correcto locked unica';
                else if(resp.familiaOk === false) cls += ' error';
                else cls += ' selected';
              }
              if(resp.familiaOk === true && resp.familia !== v) cls += ' locked descartada';
              return `<button type="button" class="${cls}" data-q-rel="familia" data-v="${v}">
                <span style="font-weight:800;display:block;margin-bottom:2px">${escHtml(lbl)}</span>
                <span style="font-size:.78rem;font-weight:500;opacity:.85">${escHtml(desc)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    // ─── Sub-paso 3: SUBTIPO ───────────────────────────────────────────
    // Para subordinada: aparece tras familia OK; opciones filtradas por familia.
    // Para coordinada: aparece tras tipo OK; opciones fijas (copulativa/adversativa/disyuntiva).
    const mostrarSubtipo = (resp.tipoOk === true && (
      (rel.tipo === 'subordinacion' && resp.familiaOk === true) ||
      (rel.tipo === 'coordinacion')
    ));
    if(mostrarSubtipo){
      const opcionesSubtipo = obtenerOpcionesSubtipoF5(rel, resp.familia);
      const ordinal = (rel.tipo === 'coordinacion') ? '2' : '3';
      const labelSubtipo = (rel.tipo === 'coordinacion') ? 'Tipo de coordinación' : 'Subtipo concreto de subordinada';
      html += `
        <div class="cp-clasif-q">
          <span class="cp-clasif-q-label">${ordinal}. ${labelSubtipo}</span>
          <div class="cp-clasif-opts">
            ${opcionesSubtipo.map(([v,lbl])=>{
              let cls = 'cp-clasif-opt';
              if(resp.subtipo === v){
                if(resp.subtipoOk === true) cls += ' correcto locked unica';
                else if(resp.subtipoOk === false) cls += ' error';
                else cls += ' selected';
              }
              if(resp.subtipoOk === true && resp.subtipo !== v) cls += ' locked descartada';
              return `<button type="button" class="${cls}" data-q-rel="subtipo" data-v="${v}">${escHtml(lbl)}</button>`;
            }).join('')}
          </div>
        </div>`;
    }

    // ─── Sub-paso 4: DIRECCIÓN (solo si subordinacion y subtipo OK) ────
    if(resp.tipoOk === true && rel.tipo === 'subordinacion' && resp.subtipoOk === true && propIds.length === 2){
      const idA = propIds[0], idB = propIds[1];
      const nA = propIdToNum.get(idA), nB = propIdToNum.get(idB);
      const opcionesDireccion = [
        [idA, `O${nA} → O${nB}`, `O${nB} depende de O${nA}`],
        [idB, `O${nB} → O${nA}`, `O${nA} depende de O${nB}`]
      ];
      html += `
        <div class="cp-clasif-q">
          <span class="cp-clasif-q-label">4. Dirección de la dependencia</span>
          <div class="cp-clasif-opts cp-clasif-opts-vertical">
            ${opcionesDireccion.map(([v,lbl,desc])=>{
              let cls = 'cp-clasif-opt cp-clasif-opt-familia';
              if(resp.origen === v){
                if(resp.direccionOk === true) cls += ' correcto locked unica';
                else if(resp.direccionOk === false) cls += ' error';
                else cls += ' selected';
              }
              if(resp.direccionOk === true && resp.origen !== v) cls += ' locked descartada';
              return `<button type="button" class="${cls}" data-q-rel="direccion" data-v="${escAttr(v)}">
                <span style="font-weight:800;display:block;margin-bottom:2px">${escHtml(lbl)}</span>
                <span style="font-size:.78rem;font-weight:500;opacity:.85">${escHtml(desc)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    // ─── Sub-paso 5: FUNCIÓN (solo si subordinación y dirección OK Y no es redundante) ────
    if(resp.tipoOk === true && rel.tipo === 'subordinacion' && resp.direccionOk === true && !funcionEsRedundante(rel)){
      const opcionesFuncion = obtenerOpcionesFuncion(rel.funcion, rel.subtipo);
      if(opcionesFuncion.length > 0){
        html += `
          <div class="cp-clasif-q">
            <span class="cp-clasif-q-label">5. Función de la subordinada</span>
            <div class="cp-clasif-opts">
              ${opcionesFuncion.map(([v,lbl])=>{
                let cls = 'cp-clasif-opt';
                if(resp.funcion === v){
                  if(resp.funcionOk === true) cls += ' correcto locked unica';
                  else if(resp.funcionOk === false) cls += ' error';
                  else cls += ' selected';
                }
                if(resp.funcionOk === true && resp.funcion !== v) cls += ' locked descartada';
                return `<button type="button" class="${cls}" data-q-rel="funcion" data-v="${v}">${escHtml(lbl)}</button>`;
              }).join('')}
            </div>
          </div>`;
      }
    }

    // ─── Sub-paso 6: FUNCIÓN DEL SP (solo si la oración subordinada es término de preposición) ────────
    // Entrada: si la función ya está respondida O si se saltó por redundancia
    const funcionResueltaOSaltada = (resp.funcionOk === true) || funcionEsRedundante(rel);
    if(resp.tipoOk === true && rel.tipo === 'subordinacion' && resp.direccionOk === true &&
       funcionResueltaOSaltada && rel.funcion === 'termino_preposicion' && rel.funcion_sp){
      const opcionesFuncionSp = [
        ['c_regimen', 'Complemento de régimen'],
        ['ci', 'Complemento indirecto (CI)'],
        ['cc', 'Complemento circunstancial (CC)'],
        ['cn', 'Complemento del nombre (CN)'],
        ['c_adj', 'Complemento del adjetivo'],
        ['c_adv', 'Complemento del adverbio'],
        ['atributo', 'Atributo']
      ];
      html += `
        <div class="cp-clasif-q">
          <span class="cp-clasif-q-label">6. Función del sintagma preposicional</span>
          <div class="cp-clasif-opts">
            ${opcionesFuncionSp.map(([v,lbl])=>{
              let cls = 'cp-clasif-opt';
              if(resp.funcionSp === v){
                if(resp.funcionSpOk === true) cls += ' correcto locked unica';
                else if(resp.funcionSpOk === false) cls += ' error';
                else cls += ' selected';
              }
              if(resp.funcionSpOk === true && resp.funcionSp !== v) cls += ' locked descartada';
              return `<button type="button" class="${cls}" data-q-rel="funcion_sp" data-v="${v}">${escHtml(lbl)}</button>`;
            }).join('')}
          </div>
        </div>`;
    }

    html += `</div>`;
    return html;
  }

  // ─────────────────────────────────────────────────────────────────────
  // ¿La pregunta "Función de la subordinada" es redundante con el subtipo?
  // Cuando lo es, la saltamos para evitar pasos innecesarios.
  // - sustantiva_sujeto → función=sujeto. Redundante.
  // - sustantiva_cd → función=cd. Redundante (excepto CD preposicional con "a",
  //   pero como en el banco eso entra como termino_preposicion, no aplica aquí).
  // - sustantiva_atributo → función=atributo. Redundante.
  // - sustantiva_aposicion → función=aposicion. Redundante.
  // - sustantiva_termino_preposicion → función=termino_preposicion. Redundante
  //   en sí misma, pero el sub-paso 6 (función del SP) SÍ se pregunta porque aporta info nueva.
  // - relativa_especificativa/explicativa → función=cn. Redundante.
  // - relativa_libre/semilibre → función puede ser cualquiera. NO redundante.
  // - Construcciones (causal/final/...) → función predecible. Redundante.
  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  // ¿Es redundante preguntar "función de la subordinada" tras conocer
  // el subtipo? (decisión pedagógica del autor, mayo 2026).
  //
  // Cuando el subtipo determina por definición la función, no hace falta
  // pedirla — sería un paso vacío. Casos:
  //
  //   sustantiva_sujeto              → función = sujeto       (redundante)
  //   sustantiva_cd                  → función = cd           (redundante)
  //   sustantiva_atributo            → función = atributo     (redundante)
  //   sustantiva_aposicion           → función = aposición    (redundante)
  //   sustantiva_termino_preposicion → función = término       (redundante)
  //                                    PERO el sub-paso 6 (funcion_sp) sí se
  //                                    pregunta — aporta info nueva.
  //   relativa_especificativa        → función = CN           (redundante)
  //   relativa_explicativa           → función = CN           (redundante)
  //   relativa_libre / _semilibre    → función variable        (NO redundante)
  //   causal / final / temporal /
  //   condicional / concesiva /
  //   locativa / modal /
  //   ilativa_constr                 → función = CC del valor (redundante)
  //
  // IMPORTANTE: la decisión se basa SOLO en el subtipo, no en rel.funcion.
  // (Antes de mayo 2026 el check exigía además que rel.funcion del banco
  // coincidiera con la esperada; eso hacía que ejercicios con el campo
  // funcion vacío o ligeramente diferente preguntaran un paso innecesario.)
  // ─────────────────────────────────────────────────────────────────────
  function funcionEsRedundante(rel){
    if(!rel || rel.tipo !== 'subordinacion') return false;
    const sub = rel.subtipo || '';
    // Sustantivas: el subtipo YA contiene la función. Para término de preposición
    // saltamos el sub-paso 5 (función = término de preposición es obvio), pero
    // mantenemos el sub-paso 6 (función del SP) porque sí aporta info nueva.
    if(['sustantiva_sujeto','sustantiva_cd','sustantiva_atributo',
        'sustantiva_aposicion','sustantiva_termino_preposicion'].includes(sub)) return true;
    // Relativas con antecedente expreso → siempre CN
    if(sub === 'relativa_especificativa' || sub === 'relativa_explicativa') return true;
    // Construcciones: la función es CC con valor del subtipo (causal, final…)
    if(['causal','final','condicional','concesiva','temporal','locativa','modal','ilativa_constr'].includes(sub)) return true;
    return false;
  }

  // Opciones de subtipo para la fase fusionada (rel + subtipo). Coordinadas tienen
  // solo 3 (EBAU Murcia). Subordinadas dependen de la familia elegida por el alumno.
  function obtenerOpcionesSubtipoF5(rel, familiaElegida){
    if(rel.tipo === 'coordinacion'){
      return [
        ['copulativa','Copulativa'],
        ['adversativa','Adversativa'],
        ['disyuntiva','Disyuntiva']
      ];
    }
    if(rel.tipo === 'subordinacion'){
      if(familiaElegida === 'sustantiva'){
        return [
          ['sustantiva_sujeto','Sujeto'],
          ['sustantiva_cd','Complemento directo (CD)'],
          ['sustantiva_atributo','Atributo'],
          ['sustantiva_termino_preposicion','Término de preposición'],
          ['sustantiva_aposicion','Aposición']
        ];
      }
      if(familiaElegida === 'relativa'){
        return [
          ['relativa_especificativa','Especificativa (con antecedente)'],
          ['relativa_explicativa','Explicativa (con antecedente)'],
          ['relativa_libre','Libre (sin antecedente)'],
          ['relativa_semilibre','Semilibre (artículo + que)']
        ];
      }
      if(familiaElegida === 'construccion'){
        return [
          ['temporal','Temporal'],
          ['causal','Causal'],
          ['final','Final'],
          ['ilativa_constr','Ilativa'],
          ['condicional','Condicional'],
          ['concesiva','Concesiva']
        ];
      }
    }
    return [];
  }

  // Opciones de función filtradas por familia de la subordinada (similar a fase 4 subtipo)
  function obtenerOpcionesFuncion(funcionCorrecta, subtipoCorrecto){
    // Sustantivas → sujeto, cd, atributo, termino_preposicion, aposicion
    if((subtipoCorrecto||'').startsWith('sustantiva')){
      return [
        ['sujeto', 'Sujeto'],
        ['cd', 'Complemento directo (CD)'],
        ['atributo', 'Atributo'],
        ['termino_preposicion', 'Término de preposición'],
        ['aposicion', 'Aposición']
      ];
    }
    // Relativas → CN (con antecedente), incidental (explicativa), o sujeto/cd... (libres y semilibres)
    if((subtipoCorrecto||'').startsWith('relativa')){
      // Para libres/semilibres, podría asumir cualquier función nominal
      if(subtipoCorrecto === 'relativa_libre' || subtipoCorrecto === 'relativa_semilibre'){
        return [
          ['sujeto', 'Sujeto'],
          ['cd', 'Complemento directo (CD)'],
          ['ci', 'Complemento indirecto (CI)'],
          ['atributo', 'Atributo'],
          ['cn', 'Complemento del nombre (CN)']
        ];
      }
      // Especificativas y explicativas con antecedente → CN típicamente
      return [
        ['cn', 'Complemento del nombre (CN)'],
        ['incidental', 'Incidental (aclaración entre comas)']
      ];
    }
    // Construcciones (causal, final, temporal...)
    if(['temporal','locativa','modal','comparativa'].includes(subtipoCorrecto)){
      return [
        ['cc_temporal', 'CC de tiempo'],
        ['cc_locativo', 'CC de lugar'],
        ['cc_modal', 'CC de modo'],
        ['cc_comparativo', 'CC comparativo']
      ];
    }
    if(['condicional','final','causal','concesiva','ilativa_constr'].includes(subtipoCorrecto)){
      return [
        ['construccion_condicional', 'Construcción condicional'],
        ['construccion_final', 'Construcción final'],
        ['construccion_causal', 'Construcción causal'],
        ['construccion_concesiva', 'Construcción concesiva'],
        ['construccion_ilativa', 'Construcción ilativa']
      ];
    }
    return [];
  }

  function onRelacionClick(q, v){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    const relIdx = eng.f5IdxActual;
    const rel = (ej.relaciones||[])[relIdx];
    if(!rel) return;
    if(!eng.f5Respuestas[relIdx]) eng.f5Respuestas[relIdx] = {};
    const resp = eng.f5Respuestas[relIdx];

    if(q === 'tipo'){
      if(resp.tipoOk === true) return;
      resp.tipo = v;
      if(v === rel.tipo){
        resp.tipoOk = true;
        eng.f5Aciertos += 1;
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. Es una <b>${escHtml(v)}</b>.`
        };
        if(typeof playSuccess === 'function') playSuccess();
      } else {
        resp.tipoOk = false;
        eng.f5Errores += 1;
        // El helper ya llama a trackError internamente con el realId correcto
        // (rel.tipo). Sustituye al antiguo trackError('compuestas','tipo_relacion')
        // que no encajaba con FEEDBACK_COMPUESTAS ni con ERROR_TO_LECCION_CP.
        eng.mensajeFeedback = {
          tipo:'err',
          html: buildScaffoldFeedbackCP({
            titulo: `No es ${escHtml(v)}`,
            realId: rel.tipo,
            marcadaId: v,
            razon: 'Piensa bien si las oraciones están al mismo nivel o si una depende de la otra'
          })
        };
        if(typeof playError === 'function') playError();
        setTimeout(()=>{
          if(eng.f5IdxActual === relIdx){ resp.tipoOk = null; renderFase(); }
        }, 4500);
      }
      renderFase();
      return;
    }
    if(q === 'familia'){
      if(resp.familiaOk === true) return;
      resp.familia = v;
      const familiaCorrecta = familiaDelSubtipo(rel.subtipo);
      if(v === familiaCorrecta){
        resp.familiaOk = true;
        eng.f5Aciertos += 1;
        const nombres = {'sustantiva':'sustantiva','relativa':'de relativo (adjetiva)','construccion':'construcción'};
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. Es una subordinada <b>${escHtml(nombres[v]||v)}</b>.`
        };
        if(typeof playSuccess === 'function') playSuccess();
      } else {
        resp.familiaOk = false;
        eng.f5Errores += 1;
        // El helper trackError con el realId correcto (familia correcta)
        eng.mensajeFeedback = {
          tipo:'err',
          html: buildScaffoldFeedbackCP({
            titulo: `No es de la familia ${escHtml(v)}`,
            realId: familiaCorrecta,
            marcadaId: v,
            razon: 'Piensa en qué hace esta oración dentro de la principal'
          })
        };
        if(typeof playError === 'function') playError();
        setTimeout(()=>{
          if(eng.f5IdxActual === relIdx){ resp.familiaOk = null; renderFase(); }
        }, 4500);
      }
      renderFase();
      return;
    }
    if(q === 'subtipo'){
      if(resp.subtipoOk === true) return;
      resp.subtipo = v;
      // En coordinadas, el subtipo correcto está en rel.subtipo directamente.
      // En subordinadas, también.
      if(v === rel.subtipo){
        resp.subtipoOk = true;
        eng.f5Aciertos += 1;
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. Es <b>${escHtml(etiquetaSubtipoExtendida(v).toLowerCase())}</b>.`
        };
        if(typeof playSuccess === 'function') playSuccess();
      } else {
        resp.subtipoOk = false;
        eng.f5Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: buildScaffoldFeedbackCP({
            titulo: `No es ${escHtml(etiquetaSubtipoExtendida(v).toLowerCase())}`,
            realId: rel.subtipo,
            marcadaId: v,
            razon: ''
          })
        };
        if(typeof playError === 'function') playError();
        setTimeout(()=>{
          if(eng.f5IdxActual === relIdx){ resp.subtipoOk = null; renderFase(); }
        }, 4500);
      }
      renderFase();
      return;
    }
    if(q === 'direccion'){
      if(resp.direccionOk === true) return;
      resp.origen = v;
      const origenCorrecto = rel.direccion?.origen;
      if(v === origenCorrecto){
        resp.direccionOk = true;
        eng.f5Aciertos += 1;
        const propIdToNum = new Map();
        (ej.proposiciones||[]).forEach((p,i)=>propIdToNum.set(p.id, i+1));
        const nOrigen = propIdToNum.get(origenCorrecto);
        const idDestino = rel.direccion?.destino;
        const nDestino = propIdToNum.get(idDestino);
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. O${nOrigen} es la principal; O${nDestino} es la subordinada.`
        };
        if(typeof playSuccess === 'function') playSuccess();
      } else {
        resp.direccionOk = false;
        eng.f5Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: `✗ La dependencia va al revés. La principal es la que «manda», la que no depende de ninguna otra.`
        };
        if(typeof playError === 'function') playError();
        if(typeof trackError === 'function') trackError('compuestas', 'direccion');
        setTimeout(()=>{ resp.direccionOk = null; renderFase(); }, 1800);
      }
      renderFase();
      return;
    }
    if(q === 'funcion'){
      if(resp.funcionOk === true) return;
      resp.funcion = v;
      if(v === rel.funcion){
        resp.funcionOk = true;
        eng.f5Aciertos += 1;
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. La subordinada funciona como <b>${escHtml(nombreLargoFuncion(v))}</b>.`
        };
        if(typeof playSuccess === 'function') playSuccess();
      } else {
        resp.funcionOk = false;
        eng.f5Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: `✗ Esa no es la función correcta. Recuerda qué pregunta hace cada función: ¿qué? (CD), ¿a quién? (CI), ¿quién? (sujeto)…`
        };
        if(typeof playError === 'function') playError();
        if(typeof trackError === 'function') trackError('compuestas', 'funcion_' + (rel.funcion || 'desconocida'));
        setTimeout(()=>{ resp.funcionOk = null; renderFase(); }, 1800);
      }
      renderFase();
      return;
    }
    if(q === 'funcion_sp'){
      if(resp.funcionSpOk === true) return;
      resp.funcionSp = v;
      if(v === rel.funcion_sp){
        resp.funcionSpOk = true;
        eng.f5Aciertos += 1;
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. El SP completo funciona como <b>${escHtml(nombreLargoFuncion(v))}</b>.`
        };
        if(typeof playSuccess === 'function') playSuccess();
      } else {
        resp.funcionSpOk = false;
        eng.f5Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: `✗ El SP completo no funciona como ${escHtml(nombreLargoFuncion(v))}. Piensa qué pide el verbo o el sustantivo del que depende.`
        };
        if(typeof playError === 'function') playError();
        if(typeof trackError === 'function') trackError('compuestas', 'funcion_sp_' + (rel.funcion_sp || 'desconocida'));
        setTimeout(()=>{ resp.funcionSpOk = null; renderFase(); }, 1800);
      }
      renderFase();
      return;
    }
  }

  function avanzarRelacionF5(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    const totalRel = (ej.relaciones||[]).length;
    if(eng.f5IdxActual < totalRel - 1){
      const numCompletada = eng.f5IdxActual + 1;
      mostrarToast({
        titulo: `¡Relación ${numCompletada} resuelta!`,
        subtitulo: `Quedan ${totalRel - numCompletada} relacion${totalRel - numCompletada === 1 ? '' : 'es'} por analizar`,
        colorIdx: 2
      });
      eng.f5IdxActual += 1;
      eng.mensajeFeedback = null;
      renderFase();
    } else {
      // Última relación → resumen.
      // renderResumenHtml decide internamente si mostrar el "pre-resumen"
      // (solo análisis PAU + decisión de analizar por dentro) o el resumen
      // completo con puntuación, errores y diagnósticos.
      mostrarToast({
        titulo: '¡Clasificación completada!',
        subtitulo: 'Revisa el análisis y, si quieres, profundiza por dentro',
        colorIdx: 1
      });
      eng.fase = 'resumen';
      eng.mensajeFeedback = null;
      renderFase();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Fase 1.4: análisis interno de oraciones (Entrega 4)
  //
  // Punto de entrada cuando el alumno acepta "Analizar por dentro" tras
  // la clasificación. Inicializa eng.interna.respuestas[] (una por cada
  // oración), pone eng.fase = 'interna' y arranca por la primera
  // oración, sub-paso 'predicado'.
  // ─────────────────────────────────────────────────────────────────────
  function iniciarAnalisisInterno(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const props = ej.proposiciones || [];
    // Inicializar una respuesta vacía por oración
    eng.interna.activo = true;
    eng.interna.propIdx = 0;
    eng.interna.subPaso = 'predicado';
    eng.interna.funcionIdx = 0;
    eng.interna.respuestas = props.map(()=>({
      predicadoIndices: new Set(),
      predicadoOk: null,
      sujetoIndices: new Set(),
      sujetoTipo: null,           // 'lexico' | 'tacito' | 'impersonal' | null
      sujetoOk: null,
      funcionesUsuario: [],       // [{tokensIndices: Set, tipoElegido: string, ok: true|false|null}]
      funcionesOk: null
    }));
    eng.interna.aciertos = 0;
    eng.interna.errores = 0;
    eng.mensajeFeedback = null;
    eng.fase = 'interna';
    renderFase();
  }

  // Atajo desde la pantalla de elección: ir directamente al resumen,
  // sin pasar por el análisis interno.
  // [LEGACY] Quedó del flujo viejo (interna_choice). Hoy ya no hay botón
  // que la invoque, pero la mantenemos por si algún estado antiguo cae aquí.
  function irAResumen(){
    const eng = state.engine;
    if(!eng) return;
    eng.fase = 'resumen';
    eng.mensajeFeedback = null;
    renderFase();
  }

  // Desde el pre-resumen: el alumno renuncia al análisis interno y pasa
  // al resumen completo con su puntuación.
  function saltarAnalisisInterno(){
    const eng = state.engine;
    if(!eng) return;
    eng.interna.saltado = true;
    eng.mensajeFeedback = null;
    renderFase();
  }

  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  // Fase 1.4.B: ANÁLISIS INTERNO — Drag-and-drop (D) mayo 2026
  //
  // Reemplaza el sistema de cascada (3 sub-pasos con botones) por un
  // sistema de arrastrar-y-soltar al estilo del módulo de Simples:
  //   - Todos los bloques de la oración se muestran a la vez.
  //   - Un pool con 3 secciones (Predicado / Sujeto / Complementos)
  //     ofrece las etiquetas correctas + 2-3 distractores.
  //   - El alumno arrastra o hace clic para colocar etiquetas en los huecos.
  //   - "Confirmar" comprueba todo de una vez y muestra ✓/✗ por bloque.
  //
  // Estado en _idd (módulo), resultados en eng.interna.respuestas[].
  // ─────────────────────────────────────────────────────────────────────

  let _idd = {};                      // estado D&D de la prop actual
  let _iddDrag = {};                  // {id} etiqueta arrastrada
  let _iddSel  = {box:null, el:null}; // etiqueta seleccionada por clic

  // Normaliza el tipo de predicado a 'verbal' o 'nominal' sea cual sea el
  // valor exacto que use el banco ('PV', 'nominal', 'predicado verbal'…).
  function _normPredTipo(t){
    const s = (t||'').toLowerCase().trim();
    if(!s) return '';
    if(s === 'pv' || s.includes('verbal')) return 'verbal';
    if(s === 'pn' || s.includes('nominal')) return 'nominal';
    return s;
  }

  // ── Render principal del modo interna (D&D) ───────────────────────

  // Categorías de funciones para el pool de 3 secciones (A.3, mayo 2026).
  // Réplica conceptual del esquema Argumentos / Adjuntos / Marcas de Sint.
  const _ARGUMENTO_TIPOS = new Set([
    'cd','ci','atributo','cpvo','c_regimen','c_agente','termino_preposicion'
  ]);
  const _ADJUNTO_TIPOS = new Set([
    'cc','cc_temporal','cc_locativo','cc_modal','cc_causal','cc_final','cc_comparativo',
    // modelo unificado (junio 2026)
    'cc_lugar','cc_tiempo','cc_modo','cc_causa','cc_finalidad','cc_cantidad',
    'cc_compania','cc_instrumento','cc_beneficiario','dativo'
  ]);
  const _MARCA_TIPOS = new Set([
    'mod_oracional','vocativo','aposicion','cn','c_adj','c_adv',
    'incidental','marca_pas_ref'
  ]);
  // Atr. Loc. es argumento como el atributo.
  _ARGUMENTO_TIPOS.add('atributo_locativo');

  function _categoriaFunc(tipo){
    if(_ARGUMENTO_TIPOS.has(tipo)) return 'arg';
    if(_ADJUNTO_TIPOS.has(tipo) || (tipo||'').startsWith('cc')) return 'adj';
    if(_MARCA_TIPOS.has(tipo))     return 'mar';
    return 'arg';                  // default conservador
  }

  // Devuelve la etiqueta legible para los tipos internos del D&D.
  function _iddLabel(tipo){
    const m = {
      'np':'NP · Núcleo del predicado',
      'suj_lexico':'Sujeto léxico', 'suj_tacito':'Sujeto tácito (Ø)', 'suj_imp':'Impersonal'
    };
    return m[tipo] || etiquetaFuncion(tipo);
  }

  // Inicializa _idd para la oración propIdx del ejercicio ej.
  function _initIDD(ej, propIdx){
    const prop = (ej.proposiciones||[])[propIdx] || {};
    const ai = prop.analisis_interno || {};
    const tokens = ej.tokens || [];

    const getWords = idxs => idxs
      .map(i => tokens.find(t=>t.i===i)?.texto||'')
      .filter(Boolean).join(' ');
    const minIdx = idxs => (Array.isArray(idxs) && idxs.length>0)
      ? Math.min(...idxs) : 999;

    // Bloques ─────────────────────────────────────────────────
    const blocks = [];

    // Predicado
    const predIndices = (ai.predicado||{}).indices || [];
    const predWords = getWords(predIndices) || prop.verbo?.forma || '?';
    // El verbo es siempre Núcleo del Predicado. La distinción PV/PN
    // aplica al predicado completo (macro), no al verbo aislado.
    blocks.push({
      id:'pred', words:predWords, correctTipo:'np',
      section:'pred', sortIdx: minIdx(predIndices)
    });

    // Sujeto (siempre, incluso Ø)
    const sujTipo = (ai.sujeto||{}).tipo || '';
    const sujIndices = (ai.sujeto||{}).indices || [];
    const sujWords = sujIndices.length > 0 ? getWords(sujIndices)
                   : sujTipo==='tacito' ? '(Ø)' : sujTipo==='impersonal' ? '—' : null;
    if(sujWords !== null){
      const sujCorr = sujTipo==='lexico' ? 'suj_lexico'
                    : sujTipo==='tacito' ? 'suj_tacito' : 'suj_imp';
      // Si el sujeto no tiene posición textual (tácito/impersonal),
      // lo colocamos justo ANTES del predicado en el orden visual.
      const sujSort = sujIndices.length > 0 ? minIdx(sujIndices)
                                            : minIdx(predIndices) - 0.5;
      blocks.push({
        id:'suj', words:sujWords, correctTipo:sujCorr,
        section:'suj', sortIdx: sujSort
      });
    }

    // Funciones (una por cada complemento)
    const funcs = Array.isArray(ai.funciones) ? ai.funciones : [];
    funcs.forEach((f,i)=>{
      const fWords = getWords(f.indices||[]) || '?';
      // CC: el tipo correcto es el subtipo efectivo (cc_lugar, cc_tiempo…) si
      // el ejercicio lo trae. Si es un CC pelado (sin subtipo), queda 'cc'.
      const correctTipo = (f.tipo === 'cc' || (f.tipo||'').startsWith('cc_'))
        ? _ccTipoEfectivo(f)
        : f.tipo;
      blocks.push({
        id:`func_${i}`, words:fWords, correctTipo,
        section:'comp', sortIdx: minIdx(f.indices||[])
      });
    });

    // ── A.2: ordenar bloques por orden NATURAL de lectura ────────
    blocks.sort((a,b) => a.sortIdx - b.sortIdx);

    // ── A.3: pool con 5 secciones (Predicado, Sujeto, Argumentos,
    //         Adjuntos, Marcas y periféricos) con distractores ─────
    // Una sola etiqueta: el verbo es siempre Núcleo del Predicado.
    // PV / PN clasifica al predicado completo, no al verbo solo: se
    // muestra como label dinámico en la fila macro del sticky, no
    // como tag drag&drop.
    const predPool = [
      {id:'pd_np', label:'NP · Núcleo del predicado', tipo:'np'}
    ];
    const sujPool = [
      {id:'sd_lex', label:'Sujeto léxico',     tipo:'suj_lexico'},
      {id:'sd_tac', label:'Sujeto tácito (Ø)', tipo:'suj_tacito'},
      {id:'sd_imp', label:'Impersonal',         tipo:'suj_imp'}
    ];

    // Clasificar funciones correctas por categoría. Para los CC usamos el
    // tipo EFECTIVO (cc_lugar, cc_tiempo…) derivado de tipo+subtipo, de modo
    // que el resto del pool (detección de CC, colapso a "CC", validación) sea
    // coherente con el correctTipo que ya guardamos en cada block.
    const _tipoEf = f => ((f.tipo==='cc' || (f.tipo||'').startsWith('cc_')) ? _ccTipoEfectivo(f) : f.tipo);
    const correctsByCat = {arg:[], adj:[], mar:[]};
    funcs.forEach((f,i)=>{
      const te = _tipoEf(f);
      const cat = _categoriaFunc(te);
      correctsByCat[cat].push({
        id:`cd_${i}`, label:etiquetaFuncion(te), tipo:te
      });
    });

    // Distractores por categoría: 1-2 por sección que NO estén en las correctas
    const usados = new Set(funcs.map(_tipoEf));
    const buildDistractors = (set, prefix, n) => {
      const pool = [...set].filter(t => !usados.has(t));
      pool.sort(()=>Math.random()-.5);
      return pool.slice(0, n).map((t,i)=>({
        id:`${prefix}_d${i}`, label:etiquetaFuncion(t), tipo:t
      }));
    };
    const argDis = buildDistractors(_ARGUMENTO_TIPOS, 'ad', 2);
    const marDis = buildDistractors(_MARCA_TIPOS,     'md', 1);

    // ── Adjuntos con submenú de subtipo de CC (junio 2026) ───────────────
    // Todos los CC (con o sin subtipo) se ofrecen al alumno como UNA etiqueta
    // genérica "CC". Al soltarla sobre un hueco cuyo correctTipo es un CC con
    // subtipo (cc_lugar, cc_tiempo…), se abre un submenú para elegir el subtipo
    // exacto (igual que en oraciones simples). Así el correcto no se delata y
    // el alumno demuestra que sabe el subtipo.
    const hayCC = correctsByCat.adj.some(b => (b.tipo||'').startsWith('cc'));
    // Las correctas que son CC se colapsan a una sola etiqueta "CC" en el pool;
    // las correctas adjuntas que NO son CC (p. ej. dativo) se mantienen.
    const adjCorrectNoCC = correctsByCat.adj.filter(b => !(b.tipo||'').startsWith('cc'));
    const adjCCcorrect   = correctsByCat.adj.filter(b =>  (b.tipo||'').startsWith('cc'));
    // Una etiqueta genérica "CC" por cada hueco CC (para poder rellenar todos).
    const ccTags = adjCCcorrect.map((_, i) => ({ id:`cc_generic_${i}`, label:'CC', tipo:'cc' }));
    // Distractores adjuntos: si hay CC, añade un par de adjuntos no-CC como
    // distracción (p. ej. dativo); si no hay CC, distractores normales.
    const adjDis = hayCC
      ? buildDistractors(new Set(['dativo']), 'dd', 1)
      : buildDistractors(_ADJUNTO_TIPOS, 'dd', 2);

    const shuffle = arr => arr.sort(()=>Math.random()-.5);
    const argPool = shuffle([...correctsByCat.arg, ...argDis]);
    const adjPool = shuffle([...adjCorrectNoCC, ...ccTags, ...adjDis]);
    const marPool = shuffle([...correctsByCat.mar, ...marDis]);

    // Estado de slots ─────────────────────────────────────────
    const slots={}, slotOk={};
    blocks.forEach(b=>{ slots[b.id]=null; slotOk[b.id]=null; });

    _idd = {_propIdx:propIdx, blocks, slots, slotOk,
             predPool, sujPool, argPool, adjPool, marPool,
             confirmed:false};
    _iddDrag = {};
    _iddSel  = {box:null, el:null};
  }

  // Renderiza la oración compuesta COMPLETA (todos los tokens, incluidos
  // nexos y signos de puntuación, en orden natural) y resalta los tokens
  // pertenecientes a la oración que se está analizando. Mantiene la
  // técnica del Word Joiner para que la puntuación no salte de línea.
  function _renderOracionConPropDestacada(ej, prop){
    if(!Array.isArray(ej.tokens)) return escHtml(prop?.texto || ej?.texto || '');
    const propIdxs = new Set(prop?.indices || []);
    const tokens = ej.tokens;
    let html = '';
    for(let idx=0; idx<tokens.length; idx++){
      const t = tokens[idx];
      const cat = t.categoria || 'otro';
      const enProp = propIdxs.has(t.i);
      const cls = enProp ? 'iidd-prop-tok iidd-prop-tok-on' : 'iidd-prop-tok';
      const tokHtml = `<span class="${cls}">${escHtml(t.texto||'')}</span>`;
      const next = tokens[idx+1];
      const esApertura = (cat === 'puntuacion' && /^[¿¡]$/.test(t.texto||''));
      if(esApertura)                           html += tokHtml + '⁠';
      else if(next && next.categoria === 'puntuacion') html += tokHtml + '⁠';
      else                                     html += tokHtml + ' ';
    }
    return html.trimEnd();
  }

  function renderInternaHtml(ej){
    const eng = state.engine;
    const interna = eng.interna;
    const props = ej.proposiciones || [];
    const propIdx = interna.propIdx;
    const prop = props[propIdx];
    if(!prop) return '<div style="padding:20px;color:var(--muted)">Error: oración no disponible.</div>';

    // Inicializar D&D si cambiamos de oración o primera vez
    if(_idd._propIdx !== propIdx) _initIDD(ej, propIdx);

    const propNum = propIdx + 1;
    const totalProps = props.length;
    const colorVar = `var(--cp-p${Math.min(propNum,4)})`;

    const headerHtml = `
      <div class="iidd-header">
        <span class="iidd-prop-badge" style="background:${colorVar}">O${propNum}</span>
        <span class="iidd-prop-of">· ${totalProps} oracion${totalProps>1?'es':''}</span>
        <div class="iidd-prop-text">«${_renderOracionConPropDestacada(ej, prop)}»</div>
      </div>`;

    const instrHtml = `
      <p class="iidd-instr">
        Arrastra (o haz clic en) cada etiqueta y suéltala en el bloque que le corresponde.
        Cuando hayas asignado todas, pulsa <b>Confirmar</b>.
      </p>`;

    const blocksHtml = `
      <div class="iidd-grid" id="iidd-blocks">
        ${_idd.blocks.map(b=>_renderIddBlock(b)).join('')}
      </div>`;

    const poolHtml = `
      <div class="iidd-pool" id="iidd-pool">
        <div class="iidd-pool-sec iidd-pool-pred">
          <div class="iidd-pool-hdr"><span class="iidd-pool-icon">🔧</span>
            <div><div class="iidd-pool-title">Núcleo del predicado</div>
              <div class="iidd-pool-sub">El verbo es NP. PV/PN lo decide el predicado entero.</div></div></div>
          <div class="iidd-tags-wrap" id="iidd-pool-pred">${_buildIddPoolHtml(_idd.predPool)}</div>
        </div>
        <div class="iidd-pool-sec iidd-pool-suj">
          <div class="iidd-pool-hdr"><span class="iidd-pool-icon">👤</span>
            <div><div class="iidd-pool-title">Sujeto</div>
              <div class="iidd-pool-sub">¿Léxico, tácito o impersonal?</div></div></div>
          <div class="iidd-tags-wrap" id="iidd-pool-suj">${_buildIddPoolHtml(_idd.sujPool)}</div>
        </div>
        <div class="iidd-pool-sec iidd-pool-arg">
          <div class="iidd-pool-hdr"><span class="iidd-pool-icon">⚓</span>
            <div><div class="iidd-pool-title">Argumentos</div>
              <div class="iidd-pool-sub">Lo que el verbo exige</div></div></div>
          <div class="iidd-tags-wrap" id="iidd-pool-arg">${_buildIddPoolHtml(_idd.argPool)}</div>
        </div>
        <div class="iidd-pool-sec iidd-pool-adj">
          <div class="iidd-pool-hdr"><span class="iidd-pool-icon">🌿</span>
            <div><div class="iidd-pool-title">Adjuntos</div>
              <div class="iidd-pool-sub">Prescindibles, circunstanciales</div></div></div>
          <div class="iidd-tags-wrap" id="iidd-pool-adj">${_buildIddPoolHtml(_idd.adjPool)}</div>
        </div>
        <div class="iidd-pool-sec iidd-pool-mar">
          <div class="iidd-pool-hdr"><span class="iidd-pool-icon">🔖</span>
            <div><div class="iidd-pool-title">Marcas y periféricos</div>
              <div class="iidd-pool-sub">Operan sobre la oración</div></div></div>
          <div class="iidd-tags-wrap" id="iidd-pool-mar">${_buildIddPoolHtml(_idd.marPool)}</div>
        </div>
      </div>`;

    let actionHtml;
    if(_idd.confirmed){
      const allOk = _idd.blocks.every(b=>_idd.slotOk[b.id]===true);
      const nextLabel = propIdx < totalProps-1 ? 'Siguiente oración →' : '📋 Ver resumen';
      actionHtml = `
        <div class="iidd-action">
          <div class="iidd-result-badge ${allOk?'iidd-res-ok':'iidd-res-partial'}">
            ${allOk?'✅ ¡Todo correcto!':'⚠️ Revisa los marcados en rojo'}
          </div>
          <button type="button" class="cp-btn-primary" onclick="CP.iiddAvanzar()">${nextLabel}</button>
        </div>`;
    } else {
      const allFilled = _idd.blocks.every(b=>_idd.slots[b.id]!==null);
      actionHtml = `
        <div class="iidd-action">
          <button type="button" class="cp-btn-primary" id="iidd-confirm-btn"
            ${allFilled?'':'disabled'} onclick="CP.iiddConfirm()">✓ Confirmar análisis</button>
          <span class="iidd-hint" style="${allFilled?'display:none':''}">Asigna una etiqueta a cada bloque</span>
        </div>`;
    }

    return `
      <div class="iidd-wrap">
        ${headerHtml}
        ${instrHtml}
        ${blocksHtml}
        ${poolHtml}
        ${actionHtml}
        ${!state.modoExamen ? `<div style="margin-top:12px"><button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button></div>` : ''}
      </div>`;
  }

  // Render de un bloque con su hueco de drop
  function _renderIddBlock(b){
    const slot = _idd.slots[b.id];
    const ok   = _idd.slotOk[b.id];
    const slotCls = 'iidd-slot' + (ok===true?' iidd-slot-ok':ok===false?' iidd-slot-err':'');
    const dragAttr = _idd.confirmed ? '' : `draggable="true" ondragstart="CP.iiddDragStart(event,'${slot?.id}')"`;
    const slotContent = slot
      ? `<span class="iidd-tag${ok===false?'':' '+_iiddTipoCss(slot.tipo)} iidd-tag-placed${ok===false?' iidd-tag-wrong':''}"
           id="iidd-tg-${slot.id}" data-id="${slot.id}"
           ${dragAttr}
           onclick="CP.iiddTagClickSlot('${b.id}')">
           ${escHtml(slot.label)}
         </span>`
      : `<span class="iidd-slot-hint">← etiqueta</span>`;
    const errNote = ok===false
      ? `<div class="iidd-slot-correct">✓ ${escHtml(_iddLabel(b.correctTipo))}</div>` : '';
    return `
      <div class="iidd-blk">
        <div class="iidd-blk-words">${escHtml(b.words)}</div>
        <div class="${slotCls}" id="iidd-ds-${b.id}"
             ondragover="CP.iiddOver(event,'${b.id}')" ondragleave="CP.iiddLeave('${b.id}')"
             ondrop="CP.iiddDrop(event,'${b.id}')"
             onclick="CP.iiddSlotClick('${b.id}')">
          ${slotContent}
        </div>
        ${errNote}
      </div>`;
  }

  // Maps CP tipo → clase CSS de función (misma paleta que Sint funcTagCss)
  function _iiddTipoCss(tipo){
    if(tipo?.startsWith('cc')) return 'tag-f-cc';
    return {
      np:'tag-f-pv',
      suj_lexico:'tag-sn', suj_tacito:'tag-sn', suj_imp:'tag-sn', sujeto:'tag-sn',
      cd:'tag-f-cd', ci:'tag-f-ci', atributo:'tag-f-atr', cpvo:'tag-f-cpvo',
      c_regimen:'tag-f-creg', c_agente:'tag-f-cag',
      marca_pas_ref:'tag-f-pasref', mod_oracional:'tag-f-modor2', vocativo:'tag-f-voc2'
    }[tipo] || 'tag-func-lbl';
  }

  // Render de una sección del pool (filtra las ya colocadas)
  function _buildIddPoolHtml(poolArr){
    const placed = new Set(
      Object.values(_idd.slots).filter(Boolean).map(b=>b.id)
    );
    const visible = poolArr.filter(b=>!placed.has(b.id));
    if(!visible.length)
      return '<span class="iidd-pool-empty">Todas colocadas.</span>';
    return visible.map(b=>`
      <span class="iidd-tag ${_iiddTipoCss(b.tipo)}" id="iidd-tg-${b.id}" data-id="${b.id}"
        draggable="true"
        ondragstart="CP.iiddDragStart(event,'${b.id}')"
        onclick="CP.iiddTagClick(event,'${b.id}')">
        ${escHtml(b.label)}
      </span>`).join('');
  }

  // ── D&D handlers ──────────────────────────────────────────────────

  function iiddDragStart(e, id){
    if(!id) return;
    _iddDrag = {id};
    e.dataTransfer.effectAllowed = 'move';
  }
  function iiddOver(e, slotId){
    e.preventDefault();
    document.getElementById('iidd-ds-'+slotId)?.classList.add('iidd-ds-over');
  }
  function iiddLeave(slotId){
    document.getElementById('iidd-ds-'+slotId)?.classList.remove('iidd-ds-over');
  }
  function iiddDrop(e, slotId){
    e.preventDefault();
    iiddLeave(slotId);
    if(_iddDrag.id){ _iiddPlace(_iddDrag.id, slotId); _iddDrag = {}; }
  }
  // Helper: todas las etiquetas del pool (5 secciones)
  function _allIddTags(){
    return [
      ...(_idd.predPool||[]), ...(_idd.sujPool||[]),
      ...(_idd.argPool||[]),  ...(_idd.adjPool||[]),
      ...(_idd.marPool||[])
    ];
  }
  function iiddTagClick(e, id){
    e.stopPropagation();
    if(_idd.confirmed) return;
    if(_iddSel.el){ _iddSel.el.classList.remove('iidd-tag-sel');
      if(_iddSel.box?.id===id){ _iddSel={box:null,el:null}; return; } }
    const el = document.getElementById('iidd-tg-'+id);
    if(el) el.classList.add('iidd-tag-sel');
    _iddSel = {box: _allIddTags().find(b=>b.id===id)||null, el};
  }
  function iiddTagClickSlot(slotId){
    if(_idd.confirmed) return;
    const box = _idd.slots[slotId];
    if(!box) return;
    if(_iddSel.el) _iddSel.el.classList.remove('iidd-tag-sel');
    _idd.slots[slotId] = null;
    _iddSel = {box, el:null};
    _rebuildIddBlocks(); _rebuildIddPool();
    updateCpCtxStrip();
  }
  function iiddSlotClick(slotId){
    if(_idd.confirmed) return;
    if(!_iddSel.box) return;
    if(_iddSel.el) _iddSel.el.classList.remove('iidd-tag-sel');
    _iiddPlace(_iddSel.box.id, slotId);
    _iddSel = {box:null, el:null};
  }
  function _iiddPlace(tagId, slotId){
    if(_idd.confirmed) return;
    const tag = _allIddTags().find(b=>b.id===tagId);
    if(!tag) return;
    const block = _idd.blocks.find(b=>b.id===slotId);
    // Si el alumno coloca la etiqueta genérica "CC" sobre un hueco cuyo
    // correcto es un CC con subtipo, abrir submenú para elegir el subtipo.
    if(tag.tipo === 'cc' && block && (block.correctTipo||'').startsWith('cc_')){
      _abrirCcSubmenuIdd(tagId, slotId);
      return;
    }
    _iiddPlaceFinal(tagId, slotId, tag.tipo);
  }
  // Coloca definitivamente (con el tipo efectivo elegido) y refresca.
  function _iiddPlaceFinal(tagId, slotId, tipoEfectivo){
    const tag = _allIddTags().find(b=>b.id===tagId);
    if(!tag) return;
    Object.keys(_idd.slots).forEach(sid=>{ if(_idd.slots[sid]?.id===tagId) _idd.slots[sid]=null; });
    // Clonamos el tag para fijarle el tipo concreto sin alterar el del pool.
    _idd.slots[slotId] = { ...tag, tipo: tipoEfectivo };
    _rebuildIddBlocks(); _rebuildIddPool();
    updateCpCtxStrip();
  }
  // Submenú flotante para elegir el subtipo de CC (reutiliza .cc-submenu).
  function _cerrarCcSubmenuIdd(){
    document.getElementById('iidd-cc-submenu')?.remove();
  }
  function _abrirCcSubmenuIdd(tagId, slotId){
    _cerrarCcSubmenuIdd();
    const slotEl = document.getElementById('iidd-ds-'+slotId);
    const menu = document.createElement('div');
    menu.className = 'cc-submenu';
    menu.id = 'iidd-cc-submenu';
    const r = slotEl ? slotEl.getBoundingClientRect() : {left:window.innerWidth/2, bottom:window.innerHeight/2};
    const vw = window.innerWidth;
    let left = Math.min(Math.max(8, r.left), vw - 230);
    let top  = (r.bottom || 0) + 8;
    menu.style.cssText = `left:${left}px;top:${top}px`;
    menu.innerHTML = `<div class="cc-submenu-title">¿Qué tipo de CC es?</div>
      <div class="cc-submenu-grid">${_CC_SUBTIPOS_CP.map(st =>
        `<button type="button" class="cc-sub-btn" onclick="CP.iiddConfirmCcSubtipo('${tagId}','${slotId}','${st}')">${etiquetaFuncion(st)}</button>`
      ).join('')}</div>
      <button type="button" class="cc-sub-btn" style="margin-top:6px;opacity:.7" onclick="CP.iiddCancelCcSubtipo()">Cancelar</button>`;
    document.body.appendChild(menu);
  }
  function iiddConfirmCcSubtipo(tagId, slotId, subtipoTipo){
    _cerrarCcSubmenuIdd();
    _iiddPlaceFinal(tagId, slotId, subtipoTipo);
  }
  function iiddCancelCcSubtipo(){ _cerrarCcSubmenuIdd(); }
  function _rebuildIddBlocks(){
    const cont = document.getElementById('iidd-blocks');
    if(cont) cont.innerHTML = _idd.blocks.map(b=>_renderIddBlock(b)).join('');
    // Actualizar botón confirmar
    const btn = document.getElementById('iidd-confirm-btn');
    if(btn && !_idd.confirmed){
      const allFilled = _idd.blocks.every(b=>_idd.slots[b.id]!==null);
      btn.disabled = !allFilled;
      const hint = document.querySelector('.iidd-hint');
      if(hint) hint.style.display = allFilled ? 'none' : '';
    }
  }
  function _rebuildIddPool(){
    const wraps = [
      ['iidd-pool-pred', _idd.predPool],
      ['iidd-pool-suj',  _idd.sujPool],
      ['iidd-pool-arg',  _idd.argPool],
      ['iidd-pool-adj',  _idd.adjPool],
      ['iidd-pool-mar',  _idd.marPool]
    ];
    wraps.forEach(([id, pool])=>{
      const el = document.getElementById(id);
      if(el) el.innerHTML = _buildIddPoolHtml(pool);
    });
  }

  // ── Confirmar y avanzar ────────────────────────────────────────────

  function iiddConfirm(){
    const eng = state.engine;
    const ej  = state.filtered[state.idx];
    if(!eng || !ej) return;
    const propIdx = eng.interna.propIdx;
    const resp = eng.interna.respuestas[propIdx] || {};

    let aciertos=0, errores=0;
    _idd.blocks.forEach(b=>{
      const placed = _idd.slots[b.id];
      const isOk = !!placed && placed.tipo === b.correctTipo;
      _idd.slotOk[b.id] = isOk;
      if(isOk) aciertos++; else errores++;
    });
    eng.interna.aciertos += aciertos;
    eng.interna.errores  += errores;

    // Guardar en respuestas (compatible con renderResumenInternaHtml)
    const predBlock = _idd.blocks.find(b=>b.id==='pred');
    if(predBlock){ resp.predicadoOk = _idd.slotOk['pred']; }
    const sujBlock = _idd.blocks.find(b=>b.id==='suj');
    if(sujBlock){
      resp.sujetoTipo = _idd.slots['suj']?.tipo;
      resp.sujetoOk   = _idd.slotOk['suj'];
    }
    const funcBlocks = _idd.blocks.filter(b=>b.id.startsWith('func_'));
    resp.funcionesUsuario = funcBlocks.map(b=>({
      tipoElegido: _idd.slots[b.id]?.tipo||'', ok: _idd.slotOk[b.id]===true
    }));
    eng.interna.respuestas[propIdx] = resp;

    _idd.confirmed = true;
    if(aciertos===_idd.blocks.length && typeof playSuccess==='function') playSuccess();
    else if(typeof playError==='function') playError();

    renderFase();
  }

  function iiddAvanzar(){
    const eng = state.engine;
    const ej  = state.filtered[state.idx];
    if(!eng || !ej) return;
    const totalProps = (ej.proposiciones||[]).length;
    if(eng.interna.propIdx < totalProps-1){
      eng.interna.propIdx++;
      _idd = {};   // fuerza reinit en próximo render
      renderFase();
    } else {
      eng.fase = 'resumen';
      eng.mensajeFeedback = null;
      mostrarToast({titulo:'¡Análisis interno completado!', subtitulo:'Aquí tienes el resumen', colorIdx:1});
      renderFase();
    }
  }

  // ── Handlers públicos del análisis interno ──────────────────────────

  function onInternaPredBtn(tipoPulsado){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const interna = eng.interna;
    const prop = (ej.proposiciones || [])[interna.propIdx];
    if(!prop) return;
    const ai = prop.analisis_interno || {};
    const predTipoCorr = _normPredTipo((ai.predicado || {}).tipo || '');
    const esOk = _normPredTipo(tipoPulsado) === predTipoCorr;
    const resp = interna.respuestas[interna.propIdx] || {};
    resp.predicadoOk = esOk;
    interna.respuestas[interna.propIdx] = resp;
    if(esOk){ interna.aciertos++; if(typeof playSuccess === 'function') playSuccess(); }
    else     { interna.errores++;  if(typeof playError   === 'function') playError(); }
    renderFase();
  }

  function onInternaSujBtn(tipoPulsado){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const interna = eng.interna;
    const prop = (ej.proposiciones || [])[interna.propIdx];
    if(!prop) return;
    const ai = prop.analisis_interno || {};
    const sujTipoCorr = (ai.sujeto || {}).tipo || '';
    const esOk = tipoPulsado === sujTipoCorr;
    const resp = interna.respuestas[interna.propIdx] || {};
    resp.sujetoTipo = tipoPulsado;
    resp.sujetoOk = esOk;
    interna.respuestas[interna.propIdx] = resp;
    if(esOk){ interna.aciertos++; if(typeof playSuccess === 'function') playSuccess(); }
    else     { interna.errores++;  if(typeof playError   === 'function') playError(); }
    renderFase();
  }

  function onInternaFuncBtn(tipoPulsado){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const interna = eng.interna;
    const prop = (ej.proposiciones || [])[interna.propIdx];
    if(!prop) return;
    const ai = prop.analisis_interno || {};
    const funcs = Array.isArray(ai.funciones) ? ai.funciones : [];
    const funcIdx = interna.funcionIdx;
    const func = funcs[funcIdx];
    if(!func) return;
    const esOk = tipoPulsado === func.tipo;
    const resp = interna.respuestas[interna.propIdx] || {};
    if(!Array.isArray(resp.funcionesUsuario)) resp.funcionesUsuario = [];
    resp.funcionesUsuario[funcIdx] = { tipoElegido: tipoPulsado, ok: esOk };
    interna.respuestas[interna.propIdx] = resp;
    if(esOk){ interna.aciertos++; if(typeof playSuccess === 'function') playSuccess(); }
    else     { interna.errores++;  if(typeof playError   === 'function') playError(); }
    renderFase();
  }

  // Avanza al siguiente sub-paso dentro de la oración actual,
  // o a la siguiente oración cuando acabamos los 3 sub-pasos.
  function avanzarInternaSubPaso(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const interna = eng.interna;
    const prop = (ej.proposiciones || [])[interna.propIdx];
    const ai = (prop || {}).analisis_interno || {};
    const tieneSuj = !!(ai.sujeto || {}).tipo;
    const funcs = Array.isArray(ai.funciones) ? ai.funciones : [];

    if(interna.subPaso === 'predicado'){
      if(tieneSuj){
        interna.subPaso = 'sujeto';
        renderFase();
      } else if(funcs.length > 0){
        interna.subPaso = 'funciones';
        interna.funcionIdx = 0;
        renderFase();
      } else {
        _avanzarInternaProp(eng, ej);
      }

    } else if(interna.subPaso === 'sujeto'){
      if(funcs.length > 0){
        interna.subPaso = 'funciones';
        interna.funcionIdx = 0;
        renderFase();
      } else {
        _avanzarInternaProp(eng, ej);
      }

    } else if(interna.subPaso === 'funciones'){
      if(interna.funcionIdx < funcs.length - 1){
        interna.funcionIdx++;
        renderFase();
      } else {
        _avanzarInternaProp(eng, ej);
      }
    }
  }

  // Avanza a la siguiente oración o finaliza el análisis interno.
  // Llama a renderFase() internamente — no llamar a renderFase fuera.
  function _avanzarInternaProp(eng, ej){
    const totalProps = (ej.proposiciones || []).length;
    const prevIdx = eng.interna.propIdx;
    if(prevIdx < totalProps - 1){
      eng.interna.propIdx = prevIdx + 1;
      eng.interna.subPaso = 'predicado';
      eng.interna.funcionIdx = 0;
      mostrarToast({
        titulo: `O${prevIdx + 1} analizada ✓`,
        subtitulo: `Continuamos con O${prevIdx + 2}`,
        colorIdx: 0
      });
    } else {
      eng.fase = 'resumen';
      eng.mensajeFeedback = null;
      mostrarToast({
        titulo: '¡Análisis interno completado!',
        subtitulo: 'Aquí tienes el resumen',
        colorIdx: 1
      });
    }
    renderFase();
  }

  // ═════════════════════════════════════════════════════════════════════
  // [INACTIVO desde 2026-05-27]
  // redactarAnalisis() y redactarRelacionUnica() NO se están utilizando.
  // Eran la redacción discursiva en prosa que aparecía al finalizar el
  // análisis externo (paso 4). Desde 2026-05-27 ese hueco lo ocupa
  // renderModeloPAU() (vista dividida por O1/O2, estilo PAU), que es
  // pedagógicamente más clara.
  // Se conservan aquí por si en el futuro queremos reactivar la prosa
  // (por ejemplo, como vista alternativa o para imprimir).
  // No hay ningún `call site` activo en el módulo.
  // ═════════════════════════════════════════════════════════════════════
  // REDACCIÓN DEL ANÁLISIS SINTÁCTICO DISCURSIVO
  // Genera un párrafo explicativo del análisis al estilo profesor, basado en
  // el JSON del ejercicio. No depende de las respuestas del alumno: es lo que
  // el motor dice del ejercicio.
  // Opción A: plantillas paramétricas con la información disponible en el banco.
  // ─────────────────────────────────────────────────────────────────────
  function redactarAnalisis(ej){
    if(!ej || !Array.isArray(ej.proposiciones)) return '';
    const propos = ej.proposiciones;
    const relaciones = ej.relaciones || [];
    const tipo = ej.tipo_oracion;
    const nProps = propos.length;

    // Helpers
    const propPorId = new Map();
    propos.forEach((p,idx)=>propPorId.set(p.id, {p, num:idx+1}));
    const nexoTextoDeRel = (rel)=>{
      // Busca un nexo del ejercicio que pueda corresponder a esta relación
      const nexos = ej.nexos || [];
      if(rel.nexo_ref){
        const n = nexos.find(n=>n.id === rel.nexo_ref);
        if(n) return n.forma || (Array.isArray(n.indices) ? n.indices.map(i=>ej.tokens[i]?.texto||'').join(' ') : '');
      }
      // Fallback: el primer nexo del ejercicio
      const n = nexos[0];
      if(n) return n.forma || (Array.isArray(n.indices) ? n.indices.map(i=>ej.tokens[i]?.texto||'').join(' ') : '');
      return '';
    };
    const textoDeProp = (p)=>{
      if(!p) return '';
      // Reconstruir el texto de la oración a partir de sus tokens
      const idxs = Array.isArray(p.indices) ? p.indices.slice().sort((a,b)=>a-b) : [];
      if(idxs.length === 0) return '';
      return idxs.map(i=>ej.tokens[i]?.texto||'').join(' ').replace(/\s+([,.;:!?])/g,'$1');
    };
    const lblFuncion = (f)=>({
      'sujeto':'Sujeto',
      'cd':'Complemento Directo',
      'ci':'Complemento Indirecto',
      'atributo':'Atributo',
      'cn':'Complemento del Nombre',
      'c_regimen':'Complemento de Régimen',
      'c_adj':'Complemento del Adjetivo',
      'c_adv':'Complemento del Adverbio',
      'cc':'Complemento Circunstancial',
      'termino_preposicion':'término de preposición',
      'aposicion':'aposición'
    }[f] || f);
    const lblSubtipo = (s)=>({
      'copulativa':'copulativa',
      'adversativa':'adversativa',
      'disyuntiva':'disyuntiva',
      'sustantiva_sujeto':'sustantiva de sujeto',
      'sustantiva_cd':'sustantiva de complemento directo',
      'sustantiva_atributo':'sustantiva de atributo',
      'sustantiva_termino_preposicion':'sustantiva término de preposición',
      'sustantiva_aposicion':'sustantiva en aposición',
      'relativa_especificativa':'de relativo especificativa',
      'relativa_explicativa':'de relativo explicativa',
      'relativa_libre':'de relativo libre',
      'relativa_semilibre':'de relativo semilibre',
      'temporal':'temporal',
      'causal':'causal',
      'final':'final',
      'concesiva':'concesiva',
      'condicional':'condicional',
      'ilativa_constr':'ilativa',
      'modal':'modal',
      'locativa':'locativa'
    }[s] || s);

    // Caso 1: una sola oración (oración simple) — caso degenerado
    if(nProps === 1){
      return `<p>Esta es una oración simple (un único verbo): no es propiamente una oración compuesta.</p>`;
    }

    // Caso 2: oración con varias oraciones y una sola relación
    if(relaciones.length === 1){
      const rel = relaciones[0];
      return redactarRelacionUnica(rel, propPorId, textoDeProp, nexoTextoDeRel(rel), lblFuncion, lblSubtipo);
    }

    // Caso 3: oración con varias relaciones — texto general + cada relación
    let html = `<p>Oración compuesta formada por <b>${nProps} oraciones</b> y <b>${relaciones.length} relaciones</b>.</p>`;
    relaciones.forEach((rel, idx)=>{
      html += `<p>Relación ${idx+1}: ${redactarRelacionUnica(rel, propPorId, textoDeProp, nexoTextoDeRel(rel), lblFuncion, lblSubtipo, true)}</p>`;
    });
    return html;
  }

  // Redacta el análisis de UNA relación. Si `cuerpoSolo` es true, no incluye
  // la fórmula introductoria genérica "Oración compuesta por..."
  function redactarRelacionUnica(rel, propPorId, textoDeProp, nexoTexto, lblFuncion, lblSubtipo, cuerpoSolo){
    if(!rel) return '';
    const sub = rel.subtipo || '';
    const fn = rel.funcion || '';

    // COORDINACIÓN
    if(rel.tipo === 'coordinacion'){
      const conj = nexoTexto ? `«${escHtml(nexoTexto)}»` : 'una conjunción coordinante';
      const subLbl = lblSubtipo(sub) || 'coordinante';
      const intro = cuerpoSolo
        ? `coordinación ${escHtml(subLbl)}`
        : `<p>Oración compuesta por <b>coordinación ${escHtml(subLbl)}</b>.</p>`;
      const cuerpo = `<p>Las oraciones se unen mediante ${conj}, que funciona como nexo coordinante ${escHtml(subLbl)}. Ambas oraciones tienen la misma jerarquía sintáctica y son sintácticamente independientes entre sí.</p>`;
      return intro + cuerpo;
    }

    // YUXTAPOSICIÓN
    if(rel.tipo === 'yuxtaposicion'){
      const intro = cuerpoSolo
        ? `yuxtaposición`
        : `<p>Oración compuesta por <b>yuxtaposición</b>.</p>`;
      const cuerpo = `<p>Las oraciones se relacionan sin nexo, separadas únicamente por un signo de puntuación (coma, punto y coma o dos puntos). Ambas tienen la misma jerarquía sintáctica.</p>`;
      return intro + cuerpo;
    }

    // SUBORDINACIÓN
    if(rel.tipo === 'subordinacion'){
      const subLbl = lblSubtipo(sub) || 'subordinada';
      const dirOrigen = rel.direccion?.origen;
      const dirDestino = rel.direccion?.destino;
      const pp = propPorId.get(dirOrigen);
      const ps = propPorId.get(dirDestino);
      const ppTxt = pp ? textoDeProp(pp.p) : '';
      const psTxt = ps ? textoDeProp(ps.p) : '';
      const ppNum = pp ? pp.num : '?';
      const psNum = ps ? ps.num : '?';
      const verboPP = pp?.p?.verbo?.forma || pp?.p?.verbo?.texto || '';
      const nexo = nexoTexto ? `«${escHtml(nexoTexto)}»` : '';

      const intro = cuerpoSolo
        ? `subordinación ${escHtml(subLbl)}`
        : `<p>Oración compuesta por <b>subordinación ${escHtml(subLbl)}</b>.</p>`;

      let cuerpo = '';

      // ─── Sustantivas ──────────────────────────────────────────────
      if(sub.startsWith('sustantiva')){
        const fnLbl = lblFuncion(fn);
        cuerpo = `<p>La oración subordinada «${escHtml(psTxt)}» funciona como <b>${escHtml(fnLbl)}</b>`;
        if(verboPP) cuerpo += ` del verbo «${escHtml(verboPP)}»`;
        cuerpo += ` dentro de la oración principal (O${ppNum}).`;
        cuerpo += ` La subordinada está incrustada en el predicado de la principal y desempeña una función propia de un sintagma nominal.`;
        if(nexo) cuerpo += ` El nexo subordinante es ${nexo}.`;
        cuerpo += `</p>`;
        // Caso especial término de preposición
        if(sub === 'sustantiva_termino_preposicion' && rel.funcion_sp){
          const fspLbl = lblFuncion(rel.funcion_sp);
          cuerpo += `<p>La subordinada va dentro de un sintagma preposicional que, en conjunto, funciona como <b>${escHtml(fspLbl)}</b> de la oración principal.</p>`;
        }
        return intro + cuerpo;
      }

      // ─── Relativas ────────────────────────────────────────────────
      if(sub.startsWith('relativa')){
        cuerpo = `<p>La oración subordinada «${escHtml(psTxt)}» introducida por ${nexo || 'un relativo'}`;
        if(sub === 'relativa_especificativa' || sub === 'relativa_explicativa'){
          cuerpo += ` modifica a un sustantivo de la oración principal y funciona globalmente como <b>Complemento del Nombre</b>.`;
          if(sub === 'relativa_especificativa'){
            cuerpo += ` Al ser especificativa, restringe la referencia del sustantivo al que acompaña.`;
          } else {
            cuerpo += ` Al ser explicativa, añade información complementaria al sustantivo (separada por comas).`;
          }
        } else if(sub === 'relativa_libre'){
          cuerpo += ` carece de antecedente expreso y adquiere valor nominal. Funciona globalmente como <b>${escHtml(lblFuncion(fn) || 'sintagma nominal')}</b> en la oración principal.`;
        } else if(sub === 'relativa_semilibre'){
          cuerpo += ` está formada por artículo + relativo. Funciona globalmente como <b>${escHtml(lblFuncion(fn) || 'sintagma nominal')}</b> en la oración principal. El artículo pertenece a la principal y el relativo a la subordinada.`;
        }
        cuerpo += `</p>`;
        cuerpo += `<p>El relativo funciona simultáneamente como nexo subordinante y desempeña una función sintáctica dentro de la propia subordinada.</p>`;
        return intro + cuerpo;
      }

      // ─── Construcciones (causales, condicionales, finales, etc.) ───
      const valoresSemanticos = {
        'causal':'expresa la causa de lo enunciado en la principal',
        'final':'expresa la finalidad de la acción de la principal',
        'condicional':'expresa la condición necesaria para que se cumpla la acción de la principal',
        'concesiva':'expresa una objeción o dificultad que no impide el cumplimiento de la principal',
        'temporal':'expresa el momento o tiempo en que ocurre la acción principal',
        'ilativa_constr':'expresa una consecuencia o conclusión derivada de la principal',
        'modal':'expresa el modo en que se realiza la acción principal',
        'locativa':'expresa el lugar donde ocurre la acción principal'
      };
      const valor = valoresSemanticos[sub] || 'modifica el sentido de la principal';
      cuerpo = `<p>La oración subordinada «${escHtml(psTxt)}» ${valor}.`;
      if(nexo) cuerpo += ` Ambas oraciones se unen mediante el nexo subordinante ${nexo}.`;
      cuerpo += `</p>`;
      return intro + cuerpo;
    }

    return '';
  }

  // ═════════════════════════════════════════════════════════════════════
  // PERSISTENCIA EN GOOGLE SHEETS
  //
  // Envío del resultado de un ejercicio al GAS al terminar.
  // Estrategia:
  //   1. Construir payload con todo lo que el motor sabe del ejercicio.
  //   2. Intentar envío con navigator.sendBeacon (no bloqueante).
  //   3. Si sendBeacon no está disponible o falla, usar fetch().
  //   4. Mostrar estado en la UI: enviando / guardado / error.
  // ═════════════════════════════════════════════════════════════════════

  // IF-AT atenuada por fase: 0 err→100%, 1→50%, 2→25%, 3+→0%
  // Cada fase tiene un peso fijo; solo se puntúa si el alumno interactuó con ella.
  function computeCompScore(eng, ej){
    const fasesActivas = (ej.metadatos && Array.isArray(ej.metadatos.fases_activas))
      ? ej.metadatos.fases_activas : [1, 2, 3, 4, 5, 6];

    const tieneNexos = (ej.nexos||[]).length > 0 && (ej.proposiciones||[]).length > 1;
    const tieneRelaciones = (ej.relaciones||[]).length > 0;

    // Curva de penalización por fase (rediseño 2026-06-16, coherente con simples).
    // EXAMEN = dura (0→100% · 1→40% · 2→10% · 3+→0%): mide como en papel.
    // PRÁCTICA = suave (100/50/25/0): es para aprender, no castiga.
    const _penaltyFactor = state.modoExamen
      ? [1, 0.40, 0.10, 0]
      : [1, 0.50, 0.25, 0];
    const atenPenalty = (w, e) => {
      const n = e <= 0 ? 0 : (e >= 3 ? 3 : e);
      return w * _penaltyFactor[n];
    };

    let avail = 0, earned = 0;
    function addFase(w, ok, er){
      if ((ok + er) === 0) return;
      avail += w;
      earned += atenPenalty(w, er);
    }

    if (fasesActivas.includes(1))
      addFase(2, eng.verbosAciertos||0, eng.verbosErrores||0);
    if (fasesActivas.includes(2) && tieneNexos)
      addFase(2, eng.nexosAciertos||0, eng.nexosErrores||0);
    if (fasesActivas.includes(3))
      addFase(3, eng.f3Aciertos||0, eng.f3Errores||0);
    if ((fasesActivas.includes(4) || fasesActivas.includes(5)) && tieneRelaciones)
      addFase(4, eng.f5Aciertos||0, eng.f5Errores||0);
    if (fasesActivas.includes(6) && eng.interna && eng.interna.activo)
      addFase(3, eng.interna.aciertos||0, eng.interna.errores||0);

    return avail > 0 ? Math.round((earned / avail) * 100) / 10 : null;
  }

  function construirPayloadResultado(ej){
    const eng = state.engine;
    if(!eng || !ej) return null;
    // Fases saltadas: "1,3" si saltó 1 y 3
    const saltadas = [];
    if(eng.skippedFases && eng.skippedFases.has(1)) saltadas.push('1');
    if(eng.skippedFases && eng.skippedFases.has(2)) saltadas.push('2');
    if(eng.skippedFases && eng.skippedFases.has(3)) saltadas.push('3');
    // Pistas usadas
    const pistas = [];
    if(eng.pistaUsadaF1) pistas.push('1');
    if(eng.pistaUsadaF2) pistas.push('2');
    if(eng.pistaUsadaF3) pistas.push('3');
    // Duración en segundos
    const tFin = Date.now();
    const duracion = Math.round((tFin - (eng.tInicio || tFin)) / 1000);
    return {
      session_id:           state.sessionId,
      ejercicio_id:         ej.id || '',
      texto:                ej.texto || '',
      tipo_oracion:         ej.tipo_oracion || '',
      n_proposiciones:      (ej.proposiciones||[]).length,
      aciertos_verbos:      eng.verbosAciertos || 0,
      errores_verbos:       eng.verbosErrores || 0,
      aciertos_nexos:       eng.nexosAciertos || 0,
      errores_nexos:        eng.nexosErrores || 0,
      aciertos_delimitar:   eng.f3Aciertos || 0,
      errores_delimitar:    eng.f3Errores || 0,
      aciertos_clasificar:  (eng.f5Aciertos || 0),
      errores_clasificar:   (eng.f5Errores || 0),
      // Fase 1.4: contadores del análisis interno (si el alumno lo hizo)
      aciertos_interna:     (eng.interna && eng.interna.activo) ? eng.interna.aciertos : 0,
      errores_interna:      (eng.interna && eng.interna.activo) ? eng.interna.errores : 0,
      fases_saltadas:       saltadas.join(','),
      pistas_usadas:        pistas.join(','),
      duracion_segundos:    duracion,
      user_agent:           navigator.userAgent || '',
      nota:                 computeCompScore(eng, ej),
      // Fase 1.5: metadata del examen (vacíos en práctica)
      pin:                  state.modoExamen ? state.examPin : '',
      modo:                 state.modoExamen ? 'examen' : 'practica',
      grupo:                state.examGrupo || '',
      evaluacion:           state.examEval || '',
      nombre_examen:        state.examName || ''
    };
  }

  async function enviarResultadoCompuestas(ej, manual){
    const eng = state.engine;
    if(!eng || !ej) return;
    if(eng.enviado || eng.enviando) return;
    const url = getApiUrl();
    if(!url){
      eng.errorEnvio = 'API URL no configurada';
      renderFase();
      return;
    }
    const payload = construirPayloadResultado(ej);
    if(!payload) return;

    // Fase 1.5.C: en modo examen NO enviamos por ejercicio. Recolectamos
    // todos los resultados en state.examResultados y al final mandamos
    // un único payload agregado vía saveResultadoCompuesta (singular)
    // desde enviarResultadoExamen().
    if(state.modoExamen){
      // Evitar duplicados si el alumno entra/sale del resumen del mismo ej
      const yaRecolectado = state.examResultados.some(r => r.ejercicio_id === payload.ejercicio_id);
      if(!yaRecolectado){
        state.examResultados.push(payload);
        // Backup en localStorage por si el navegador se cierra
        try {
          localStorage.setItem('cp_exam_progress_' + state.examPin, JSON.stringify({
            sessionId: state.sessionId,
            ts: Date.now(),
            resultados: state.examResultados
          }));
        } catch(e){ /* localStorage lleno o desactivado: ignorar */ }
      }
      eng.enviado = true;          // marca el ejercicio como tratado
      eng.enviando = false;
      eng.errorEnvio = '';
      if(eng.fase === 'resumen') renderFase();
      return;
    }

    eng.enviando = true;
    eng.errorEnvio = '';
    if(eng.fase === 'resumen') renderFase();

    const body = JSON.stringify({
      action: 'saveResultadoCompuestas',
      payload: payload
    });

    // Estrategia 1: navigator.sendBeacon — no bloqueante, perfecto al cerrar página
    // Solo en envío AUTOMÁTICO. En manual usamos fetch para tener feedback de éxito/error.
    if(!manual && typeof navigator.sendBeacon === 'function'){
      try {
        const blob = new Blob([body], {type: 'text/plain;charset=UTF-8'});
        const ok = navigator.sendBeacon(url, blob);
        if(ok){
          eng.enviando = false;
          eng.enviado = true;
          if(eng.fase === 'resumen') renderFase();
          return;
        }
      } catch(e){ /* caemos al fetch */ }
    }

    // Estrategia 2: fetch con timeout
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(()=>ctrl.abort(), 10000);
      const res = await fetch(url, {
        method: 'POST',
        // No fijamos Content-Type a JSON para evitar el preflight CORS,
        // el GAS recibe el body raw y lo parsea con JSON.parse(e.postData.contents)
        body: body,
        signal: ctrl.signal,
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if(json && json.ok){
        eng.enviando = false;
        eng.enviado = true;
        eng.errorEnvio = '';
      } else {
        eng.enviando = false;
        eng.errorEnvio = (json && json.error) || 'Respuesta no válida del servidor';
      }
    } catch(err){
      eng.enviando = false;
      eng.errorEnvio = String(err && err.message || err);
    }
    if(eng.fase === 'resumen') renderFase();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Fase 1.5.C: envío AGREGADO del examen al endpoint singular
  // saveResultadoCompuesta (hoja Compuestas_Resultados con cabeceras PIN,
  // Modo, Total_Ejercicios, Completados, Nota, Fase0_Pts..Fase6_Pts,
  // Detalle_JSON). Se llama UNA VEZ al final del examen, agregando los
  // datos recolectados en state.examResultados durante la sesión.
  // ─────────────────────────────────────────────────────────────────────

  function construirPayloadExamenAgregado(){
    const ress = state.examResultados || [];
    const totalEjercicios = state.filtered.length;
    const completados = ress.length;

    // Nota global: media de las notas IF-AT por ejercicio (computeCompScore)
    const notasEj = ress.map(r => r.nota).filter(n => n !== null && n !== undefined);
    const nota = notasEj.length > 0
      ? Math.round((notasEj.reduce((a, b) => a + b, 0) / notasEj.length) * 10) / 10
      : 0;

    // Puntuación media por fase (% sobre 1, o null si la fase no se hizo en ningún ejercicio).
    // El backend acepta null y lo guarda como celda vacía.
    function avgFase(acKey, erKey){
      let ac = 0, er = 0;
      ress.forEach(r => { ac += r[acKey]||0; er += r[erKey]||0; });
      const t = ac + er;
      return t > 0 ? Math.round((ac/t) * 100) / 100 : null;
    }
    const fasesPts = {
      f0: null,                                                       // no aplica (intro)
      f1: avgFase('aciertos_verbos',     'errores_verbos'),
      f2: avgFase('aciertos_nexos',      'errores_nexos'),
      f3: avgFase('aciertos_delimitar',  'errores_delimitar'),
      f4: avgFase('aciertos_clasificar', 'errores_clasificar'),       // fusionada (4+5)
      f5: null,                                                       // fusionada en f4
      f6: avgFase('aciertos_interna',    'errores_interna')           // Fase 1.4 análisis interno
    };

    // Detalle por ejercicio (compact)
    const detalle = ress.map(r => ({
      id:                r.ejercicio_id,
      texto:             (r.texto || '').slice(0, 120),
      aciertos_verbos:   r.aciertos_verbos     || 0,
      errores_verbos:    r.errores_verbos      || 0,
      aciertos_nexos:    r.aciertos_nexos      || 0,
      errores_nexos:     r.errores_nexos       || 0,
      aciertos_delimitar: r.aciertos_delimitar || 0,
      errores_delimitar:  r.errores_delimitar  || 0,
      aciertos_clasificar:r.aciertos_clasificar|| 0,
      errores_clasificar: r.errores_clasificar || 0,
      aciertos_interna:   r.aciertos_interna   || 0,
      errores_interna:    r.errores_interna    || 0,
      duracion_segundos:  r.duracion_segundos  || 0,
      fases_saltadas:     r.fases_saltadas     || '',
      pistas_usadas:      r.pistas_usadas      || ''
    }));

    return {
      email:           state.examEmail  || '',
      name:            state.examAlumno || '',
      grupo:           state.examGrupo  || '',
      evaluacion:      state.examEval  || '',
      pin:             state.examPin   || '',
      modo:            'examen',
      totalEjercicios: totalEjercicios,
      completados:     completados,
      nota:            nota,
      fasesPts:        fasesPts,
      detalle:         detalle
    };
  }

  async function enviarResultadoExamen(){
    if(state.examEnviado || state.examEnviando) return;
    const url = getApiUrl();
    if(!url){
      state.examErrorEnvio = 'API URL no configurada';
      if(state.engine && state.engine.fase === 'resumen') renderFase();
      return;
    }
    if(!state.examResultados || state.examResultados.length === 0){
      state.examErrorEnvio = 'No hay resultados que enviar.';
      if(state.engine && state.engine.fase === 'resumen') renderFase();
      return;
    }
    state.examEnviando = true;
    state.examErrorEnvio = '';
    if(state.engine && state.engine.fase === 'resumen') renderFase();

    const payload = construirPayloadExamenAgregado();
    const body = JSON.stringify({
      action:  'saveResultadoCompuesta',  // SINGULAR
      ...payload
    });

    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(()=>ctrl.abort(), 15000);
      const res = await fetch(url, {
        method: 'POST',
        body: body,
        signal: ctrl.signal,
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if(json && json.ok){
        state.examEnviado    = true;
        state.examEnviando   = false;
        state.examErrorEnvio = '';
        // Limpiar el backup de localStorage tras envío exitoso
        try { localStorage.removeItem('cp_exam_progress_' + state.examPin); } catch(e){}
        console.log('[CP examen] Resultado agregado enviado', json.duplicate ? '(duplicado, ignorado por backend)' : '');
      } else {
        state.examEnviando   = false;
        state.examErrorEnvio = (json && json.error) || 'Respuesta no válida del servidor';
      }
    } catch(err){
      state.examEnviando   = false;
      state.examErrorEnvio = String(err && err.message || err);
    }
    if(state.engine && state.engine.fase === 'resumen') renderFase();
  }

  function renderResumenHtml(ej){
    const eng = state.engine;

    // ── Decidir si mostrar el "pre-resumen" o el resumen completo ─────
    // Pre-resumen: se ofrece cuando el ejercicio tiene análisis interno
    // disponible, el alumno aún no lo ha hecho ni lo ha saltado, y la
    // fase 6 está habilitada (siempre en práctica; en examen, solo si
    // el profesor marcó "Pedir análisis interno").
    const tieneInterno = (ej.proposiciones || []).every(p => p && p.analisis_interno);
    const preResumen = tieneInterno && !eng.interna.activo && !eng.interna.saltado && f6Habilitada();

    if(preResumen){
      return renderPreResumenHtml(ej);
    }

    const totalAciertos = eng.verbosAciertos + eng.nexosAciertos + eng.f3Aciertos + (eng.f5Aciertos||0);
    const totalErrores = eng.verbosErrores + eng.nexosErrores + eng.f3Errores + (eng.f5Errores||0);
    const total = totalAciertos + totalErrores;
    const porcentaje = total > 0 ? Math.round((totalAciertos / total) * 100) : 0;
    let icono = '🎯', titulo = 'Buen trabajo';
    if(porcentaje === 100){ icono = '🏆'; titulo = '¡Perfecto!'; }
    else if(porcentaje >= 75){ icono = '⭐'; titulo = 'Muy bien'; }
    else if(porcentaje >= 50){ icono = '👍'; titulo = 'Buen intento'; }
    else { icono = '📚'; titulo = 'Toca repasar'; }

    // ── Interpretación pedagógica de los errores ──────────────────────
    const diagnosticos = construirDiagnosticos(ej);

    const desglose = [
      ['Verbos', eng.verbosAciertos, eng.verbosErrores],
      ['Nexos', eng.nexosAciertos, eng.nexosErrores],
      ['Delimitar', eng.f3Aciertos, eng.f3Errores],
      ['Clasificar y relacionar', (eng.f5Aciertos||0), (eng.f5Errores||0)],
      // Fase 1.4: análisis interno (solo si el alumno lo realizó)
      ...(eng.interna.activo ? [['Análisis interno', eng.interna.aciertos, eng.interna.errores]] : [])
    ].filter(([_, ok, er])=>(ok+er) > 0);

    const desgloseHtml = desglose.map(([lbl, ok, er])=>{
      const tot = ok + er;
      const pct = tot > 0 ? Math.round((ok/tot)*100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 12px;background:var(--paper2);border-radius:8px;font-size:.82rem">
          <span style="font-weight:700;color:var(--ink2);min-width:90px">${lbl}</span>
          <span style="color:#15803D"><b>${ok}</b> ac.</span>
          <span style="color:#991B1B"><b>${er}</b> err.</span>
          <span style="color:var(--muted);margin-left:auto">${pct}%</span>
        </div>`;
    }).join('');

    const nota = computeCompScore(eng, ej);
    const notaColor = nota === null ? 'var(--muted)' : nota >= 5 ? '#15803D' : '#B91C1C';

    // Orden pedagógico (revisado 2026-05-28): puntuación → análisis completo
    // PAU → diagnósticos del análisis del alumno. El alumno ve primero cómo
    // es la oración bien analizada y luego los comentarios sobre lo que él hizo.
    return `
      <div class="cp-summary">
        <div class="cp-summary-icon">${icono}</div>
        <h2 class="cp-summary-title">${titulo}</h2>
        ${nota !== null ? `
          <div style="margin:10px 0 4px;font-size:2.4rem;font-weight:900;font-family:'Fraunces',serif;color:${notaColor};line-height:1">
            ${nota.toFixed(1)}<span style="font-size:1rem;font-weight:500;color:var(--muted)">&thinsp;/ 10</span>
          </div>
          <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Nota IF-AT</div>
        ` : ''}
        <div class="cp-summary-stats">
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${totalAciertos}</div>
            <div class="cp-summary-stat-lbl">Aciertos</div>
          </div>
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${totalErrores}</div>
            <div class="cp-summary-stat-lbl">Errores</div>
          </div>
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${porcentaje}<span style="font-size:1rem">%</span></div>
            <div class="cp-summary-stat-lbl">Acierto</div>
          </div>
        </div>
      </div>

      ${eng.interna.activo ? renderResumenInternaHtml(ej, eng.interna) : ''}

      ${desglose.length > 1 ? `
        <details style="margin-bottom:14px">
          <summary style="cursor:pointer;font-weight:700;color:var(--ink2);font-size:.88rem;padding:10px 14px;background:var(--paper2);border-radius:10px">Ver desglose por paso</summary>
          <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">
            ${desgloseHtml}
          </div>
        </details>` : ''}

      <!-- 2026-05-28: el análisis completo PAU pasa por encima de los
           diagnósticos «Lo que dice tu análisis». Así el alumno lee primero
           cómo es la oración bien analizada y después contrasta con los
           comentarios verdes/ámbar/rojos sobre lo que él hizo. -->
      <div class="cp-analisis-discursivo">
        <h3 class="cp-analisis-titulo">📝 Análisis completo de la oración</h3>
        <p class="cp-analisis-oracion">«${escHtml(ej.texto||'')}»</p>
        ${renderModeloPAU(ej)}
      </div>

      ${diagnosticos.length > 0 ? `
        <div class="cp-diag">
          <h3 class="cp-diag-title">📋 Lo que dice tu análisis</h3>
          ${diagnosticos.map(d=>`
            <div class="cp-diag-item cp-diag-${d.tipo}">
              <span class="cp-diag-emoji">${d.emoji}</span>
              <div class="cp-diag-body">
                <div class="cp-diag-h">${d.titulo}</div>
                <div class="cp-diag-msg">${d.mensaje}</div>
              </div>
            </div>
          `).join('')}
        </div>` : ''}

      ${state.modoExamen ? renderEstadoExamenHtml() : ''}

      <div class="cp-actions" style="border-top:none;padding-top:0">
        <div class="cp-spacer"></div>
        ${state.modoExamen ? '' : renderEstadoGuardado()}
        ${(state.idx > 0 && !state.modoExamen) ? `<button type="button" class="cp-btn-secondary" onclick="CP.anterior()">← Anterior</button>` : ''}
        ${renderBotonFinalizarSesion()}
        ${renderBotonFinalResumen()}
      </div>
    `;
  }

  // Botón secundario «🏁 Finalizar sesión». Solo en práctica y solo si
  // hay al menos un ejercicio terminado en la sesión actual. Cuando estás
  // en el último ejercicio el botón principal ya es «Ver resumen de sesión»,
  // por lo que aquí ocultamos el secundario para no duplicar.
  function renderBotonFinalizarSesion(){
    if(state.modoExamen) return '';
    const esUltimo = state.idx >= state.filtered.length - 1;
    if(esUltimo) return '';
    if((state.sessionResults || []).length === 0) return '';
    return `<button type="button" class="cp-btn-secondary" onclick="CP.finalizarSesion()" title="Termina aquí y mira el resumen de los ejercicios que has hecho">🏁 Finalizar sesión</button>`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Pre-resumen (mayo 2026): pantalla tras el paso 4 cuando hay análisis
  // interno disponible. Muestra el análisis PAU y propone profundizar
  // (Analizar por dentro) o ver la nota ya (Saltar y ver mi nota).
  // No incluye puntuación ni diagnósticos: aparecerán en el resumen completo.
  // ─────────────────────────────────────────────────────────────────────
  function renderPreResumenHtml(ej){
    return `
      <div class="cp-summary" style="text-align:center">
        <div class="cp-summary-icon">🎯</div>
        <h2 class="cp-summary-title">Has clasificado las oraciones</h2>
        <p style="color:var(--muted);font-size:.95rem;max-width:520px;margin:8px auto 18px;line-height:1.55">
          Este es el análisis completo de la oración. Si quieres, ahora puedes <b>profundizar</b> y analizar
          cada oración por dentro (sujeto, predicado y funciones). Después verás tu puntuación.
        </p>
      </div>

      <div class="cp-analisis-discursivo">
        <h3 class="cp-analisis-titulo">📝 Análisis completo de la oración</h3>
        <p class="cp-analisis-oracion">«${escHtml(ej.texto||'')}»</p>
        ${renderModeloPAU(ej)}
      </div>

      <div class="cp-actions" style="border-top:none;padding-top:0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:8px 0 12px">
        <button type="button" class="cp-btn-primary" onclick="CP.iniciarAnalisisInterno()">🔬 Analizar por dentro</button>
        <button type="button" class="cp-btn-secondary" onclick="CP.saltarAnalisisInterno()">Saltar y ver mi nota</button>
      </div>

      ${(state.idx > 0 && !state.modoExamen) ? `
        <div class="cp-actions" style="border-top:none;padding-top:0;justify-content:flex-start">
          <button type="button" class="cp-btn-secondary" onclick="CP.anterior()">← Anterior</button>
        </div>` : ''}
    `;
  }

  // Botón final del resumen — depende de si estamos en examen o práctica
  // y de si es el último ejercicio o no.
  function renderBotonFinalResumen(){
    const esUltimo = state.idx >= state.filtered.length - 1;
    if(!state.modoExamen){
      // Práctica: si hay resultados acumulados, el último ejercicio cierra
      // mostrando el resumen de sesión. Si no, se mantiene el atajo a filtros.
      if(esUltimo){
        return (state.sessionResults || []).length > 0
          ? `<button type="button" class="cp-btn-primary" onclick="CP.finalizarSesion()">🏁 Ver resumen de sesión</button>`
          : `<button type="button" class="cp-btn-primary" onclick="CP.volverFiltros()">Volver a filtros</button>`;
      }
      return `<button type="button" class="cp-btn-primary" onclick="CP.siguientePractica()">Siguiente ejercicio →</button>`;
    }
    // Modo examen
    if(!esUltimo){
      return `<button type="button" class="cp-btn-primary" onclick="CP.siguientePractica()">Siguiente ejercicio →</button>`;
    }
    // Último ejercicio + examen
    if(state.examEnviado){
      return `<button type="button" class="cp-btn-primary" onclick="CP.salirTrasEnvio()">✓ Salir del examen</button>`;
    }
    if(state.examEnviando){
      return `<button type="button" class="cp-btn-primary" disabled>⏳ Enviando examen…</button>`;
    }
    return `<button type="button" class="cp-btn-primary" onclick="CP.enviarResultadoExamen()">📤 Enviar examen y terminar</button>`;
  }

  // Indicador del estado del envío agregado del examen (sustituye al
  // estado por-ejercicio renderEstadoGuardado() durante el examen).
  function renderEstadoExamenHtml(){
    const nResultados = state.examResultados.length;
    const total = state.filtered.length;
    const esUltimo = state.idx >= total - 1;

    if(state.examEnviado){
      return `
        <div style="margin:12px 0;padding:14px 16px;background:#F0FDF4;border-left:4px solid #059669;border-radius:8px;color:#166534">
          <div style="font-weight:800;font-size:.95rem">✅ Examen enviado correctamente</div>
          <div style="font-size:.82rem;margin-top:4px;color:#15803D">Tu profesor podrá ver el resultado en el panel del profesor.</div>
        </div>`;
    }
    if(state.examEnviando){
      return `
        <div style="margin:12px 0;padding:14px 16px;background:#EFF6FF;border-left:4px solid #2563EB;border-radius:8px;color:#1E3A8A">
          <div style="font-weight:800;font-size:.95rem">⏳ Enviando examen al profesor…</div>
          <div style="font-size:.82rem;margin-top:4px;color:#1D4ED8">Espera unos segundos sin cerrar la página.</div>
        </div>`;
    }
    if(state.examErrorEnvio){
      return `
        <div style="margin:12px 0;padding:14px 16px;background:#FEF2F2;border-left:4px solid #DC2626;border-radius:8px;color:#991B1B">
          <div style="font-weight:800;font-size:.95rem">⚠ No se pudo enviar el examen</div>
          <div style="font-size:.82rem;margin-top:4px">${escHtml(state.examErrorEnvio)}</div>
          <div style="margin-top:8px"><button type="button" class="cp-btn-secondary" onclick="CP.enviarResultadoExamen()">🔄 Reintentar envío</button></div>
        </div>`;
    }
    // Estado inicial (ejercicio en curso o último sin enviar todavía)
    if(esUltimo){
      return `
        <div style="margin:12px 0;padding:14px 16px;background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:8px;color:#92400E">
          <div style="font-weight:800;font-size:.95rem">📤 Examen listo para enviar</div>
          <div style="font-size:.82rem;margin-top:4px">Has completado ${nResultados} de ${total} ejercicios. Pulsa <b>Enviar examen y terminar</b> para mandar tu resultado al profesor.</div>
        </div>`;
    }
    return `
      <div style="margin:12px 0;padding:10px 14px;background:#F8FAFC;border-left:3px solid var(--muted);border-radius:6px;color:var(--ink2);font-size:.82rem">
        💾 Resultado del ejercicio guardado localmente. Se enviará al profesor cuando completes el examen (${nResultados}/${total}).
      </div>`;
  }

  // Tras envío exitoso, el botón "Salir del examen" hace una limpieza
  // sin el confirm() habitual (porque el examen ya está enviado y no
  // hay nada que perder).
  function salirTrasEnvio(){
    if(state.modoExamen){
      renderPantallaFinalExamen();
      return;
    }
    state.engine = null;
    state.modoLectura = false;
    renderFiltros();
  }

  function renderPantallaFinalExamen(){
    stopExamTimer();
    const ress = state.examResultados || [];
    const notasEj = ress.map(r => r.nota).filter(n => n !== null && n !== undefined);
    const notaGlobal = notasEj.length > 0
      ? Math.round(notasEj.reduce((a, b) => a + b, 0) / notasEj.length * 10) / 10
      : null;
    const notaColor = notaGlobal !== null ? (notaGlobal >= 5 ? '#15803D' : '#B91C1C') : 'var(--muted)';

    const desglosRows = ress.map((r, i) => {
      const n = (r.nota !== null && r.nota !== undefined) ? r.nota.toFixed(1) : '—';
      const c = (r.nota !== null && r.nota !== undefined) ? (r.nota >= 5 ? '#15803D' : '#B91C1C') : 'var(--muted)';
      const txt = (r.texto || '').slice(0, 60) + ((r.texto || '').length > 60 ? '…' : '');
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 12px;background:var(--paper2);border-radius:8px;font-size:.82rem">
        <span style="color:var(--muted);min-width:24px">E${i + 1}</span>
        <span style="flex:1;color:var(--ink2)">${escHtml(txt)}</span>
        <span style="font-weight:700;color:${c}">${n}</span>
      </div>`;
    }).join('');

    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    document.getElementById('cp-counter').textContent = '🎓 Resultado del examen';

    wrap.innerHTML = `
      <div class="cp-summary" style="text-align:center">
        <div class="cp-summary-icon">🎓</div>
        <h2 class="cp-summary-title">Examen completado</h2>
        ${notaGlobal !== null ? `
          <div style="margin:10px 0 4px;font-size:3rem;font-weight:900;font-family:'Fraunces',serif;color:${notaColor};line-height:1">
            ${notaGlobal.toFixed(1)}<span style="font-size:1.1rem;font-weight:500;color:var(--muted)">&thinsp;/ 10</span>
          </div>
          <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">Nota global del examen (IF-AT)</div>
        ` : ''}
        <div class="cp-summary-stats">
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${ress.length}</div>
            <div class="cp-summary-stat-lbl">Completados</div>
          </div>
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${state.filtered.length}</div>
            <div class="cp-summary-stat-lbl">Total</div>
          </div>
        </div>
      </div>

      ${ress.length > 1 ? `
        <details style="margin-bottom:14px">
          <summary style="cursor:pointer;font-weight:700;color:var(--ink2);font-size:.88rem;padding:10px 14px;background:var(--paper2);border-radius:10px">Ver nota por ejercicio</summary>
          <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">${desglosRows}</div>
        </details>
      ` : ''}

      <div style="background:#F0FDF4;border-left:4px solid #059669;border-radius:8px;padding:12px 16px;color:#166534;font-size:.88rem;margin-bottom:16px">
        <div style="font-weight:700">✅ Resultado enviado al profesor</div>
        <div style="margin-top:3px;color:#15803D">Tu nota quedará registrada. Puedes cerrar esta página.</div>
      </div>

      <div style="text-align:center">
        <button type="button" class="cp-btn-secondary" onclick="CP.cerrarExamenFinal()">Cerrar y volver a la práctica</button>
      </div>
    `;
  }

  function cerrarExamenFinal(){
    salirModoExamen();
    state.engine = null;
    state.modoLectura = false;
    renderFiltros();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Resumen de sesión de práctica (mayo 2026)
  // Se activa al pulsar «🏁 Finalizar sesión» o «🏁 Ver resumen de sesión».
  // Muestra la lista de ejercicios terminados con su nota y un agregado
  // (nota media, aciertos/errores totales).
  // NO se enmarca como examen: solo es información de lo que el alumno
  // ha hecho en la práctica.
  // ─────────────────────────────────────────────────────────────────────
  function finalizarSesion(){
    if(state.modoExamen) return;
    // Registramos el ejercicio actual si aún no estaba en la lista
    // (por ejemplo si el alumno pulsa Finalizar desde el resumen).
    const ej = state.filtered[state.idx];
    if(ej && state.engine && state.engine.fase === 'resumen'){
      const tieneInterno = (ej.proposiciones || []).every(p => p && p.analisis_interno);
      const enPreResumen = tieneInterno && !state.engine.interna.activo && !state.engine.interna.saltado && f6Habilitada();
      if(!enPreResumen){
        registrarResultadoSesion(ej);
      }
    }
    renderPantallaFinalSesion();
  }

  function renderPantallaFinalSesion(){
    const ress = state.sessionResults || [];
    const n = ress.length;
    const notas = ress.map(r => r.nota).filter(x => x !== null && x !== undefined);
    const notaMedia = notas.length > 0
      ? Math.round(notas.reduce((a,b)=>a+b, 0) / notas.length * 10) / 10
      : null;
    const notaColor = notaMedia === null ? 'var(--muted)' : (notaMedia >= 5 ? '#15803D' : '#B91C1C');
    const aciertosTotal = ress.reduce((s,r)=>s + (r.aciertos||0), 0);
    const erroresTotal  = ress.reduce((s,r)=>s + (r.errores ||0), 0);
    const denominador   = aciertosTotal + erroresTotal;
    const pctGlobal     = denominador > 0 ? Math.round(aciertosTotal/denominador*100) : 0;

    // Mensaje según media
    let icono = '🎯', titulo = 'Sesión completada';
    if(notaMedia !== null){
      if(notaMedia >= 9)      { icono = '🏆'; titulo = 'Sesión excelente'; }
      else if(notaMedia >= 7) { icono = '⭐'; titulo = 'Buena sesión'; }
      else if(notaMedia >= 5) { icono = '👍'; titulo = 'Sesión aprobada'; }
      else                    { icono = '📚'; titulo = 'Toca repasar'; }
    }

    const filas = ress.map((r, i) => {
      const notaTxt = (r.nota !== null && r.nota !== undefined) ? r.nota.toFixed(1) : '—';
      const c = (r.nota !== null && r.nota !== undefined) ? (r.nota >= 5 ? '#15803D' : '#B91C1C') : 'var(--muted)';
      const txt = (r.texto || '').slice(0, 70) + ((r.texto || '').length > 70 ? '…' : '');
      const internaBadge = r.internaHecha
        ? `<span style="font-size:.68rem;background:#EFF6FF;color:#1E40AF;border-radius:99px;padding:1px 7px;margin-left:4px;font-weight:700">🔬 interno</span>`
        : '';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--paper2);border-radius:8px;font-size:.84rem">
          <span style="color:var(--muted);min-width:28px;font-weight:700">#${i + 1}</span>
          <div style="flex:1;color:var(--ink2);line-height:1.35">
            <div>${escHtml(txt)}${internaBadge}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:1px">${escHtml(r.id||'')} · ${r.aciertos} ac. · ${r.errores} err.</div>
          </div>
          <span style="font-weight:800;color:${c};min-width:36px;text-align:right">${notaTxt}</span>
        </div>`;
    }).join('');

    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    const cnt = document.getElementById('cp-counter');
    if(cnt) cnt.textContent = '🏁 Resumen de sesión';

    wrap.innerHTML = `
      <div class="cp-summary" style="text-align:center">
        <div class="cp-summary-icon">${icono}</div>
        <h2 class="cp-summary-title">${titulo}</h2>
        ${notaMedia !== null ? `
          <div style="margin:10px 0 4px;font-size:3rem;font-weight:900;font-family:'Fraunces',serif;color:${notaColor};line-height:1">
            ${notaMedia.toFixed(1)}<span style="font-size:1.1rem;font-weight:500;color:var(--muted)">&thinsp;/ 10</span>
          </div>
          <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">Nota media · ${n} ${n===1?'oración':'oraciones'}</div>
        ` : ''}
        <div class="cp-summary-stats">
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${n}</div>
            <div class="cp-summary-stat-lbl">${n===1?'Oración':'Oraciones'}</div>
          </div>
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${aciertosTotal}</div>
            <div class="cp-summary-stat-lbl">Aciertos</div>
          </div>
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${erroresTotal}</div>
            <div class="cp-summary-stat-lbl">Errores</div>
          </div>
          <div class="cp-summary-stat">
            <div class="cp-summary-stat-num">${pctGlobal}<span style="font-size:1rem">%</span></div>
            <div class="cp-summary-stat-lbl">Acierto</div>
          </div>
        </div>
      </div>

      ${n > 0 ? `
        <div style="margin-bottom:16px">
          <h3 style="font-family:'Fraunces',serif;font-size:1.05rem;color:var(--ink);margin:0 0 10px 4px">Detalle por oración</h3>
          <div style="display:flex;flex-direction:column;gap:6px">${filas}</div>
        </div>
      ` : `
        <div style="margin:12px 0;padding:14px 16px;background:var(--paper2);border-radius:10px;color:var(--muted);text-align:center;font-size:.88rem">
          No has terminado ninguna oración en esta sesión.
        </div>
      `}

      <div class="cp-actions" style="border-top:none;padding-top:0;justify-content:center;display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="cp-btn-secondary" onclick="CP.volverFiltros()">← Volver a filtros</button>
      </div>
    `;
  }

  // Sección plegable del resumen que muestra los resultados del análisis
  // interno (Fase 1.4) por oración — solo si el alumno lo hizo.
  function renderResumenInternaHtml(ej, interna){
    const props = ej.proposiciones || [];
    if(!props.length || !interna.respuestas.length) return '';

    const filas = props.map((prop, idx)=>{
      const resp = interna.respuestas[idx] || {};
      const ai = prop.analisis_interno || {};
      const propNum = idx + 1;
      const colorVar = `var(--cp-p${Math.min(propNum, 4)})`;

      // Predicado
      let predFila = '';
      const predTipoCorr = _normPredTipo((ai.predicado || {}).tipo || '');
      const tieneAtributoSum = (ai.funciones||[]).some(f => f && f.tipo === 'atributo');
      const esNomSum = tieneAtributoSum || predTipoCorr === 'nominal';
      if(resp.predicadoOk !== null && resp.predicadoOk !== undefined){
        const ctx = esNomSum ? ' (predicado nominal)' : ' (predicado verbal)';
        predFila = `<div style="font-size:.8rem">${resp.predicadoOk ? '✅' : '❌'} <b>NP</b> · Núcleo del predicado${ctx}</div>`;
      }

      // Sujeto
      let sujFila = '';
      const sujTipoCorr = (ai.sujeto || {}).tipo || '';
      if(sujTipoCorr && resp.sujetoOk !== null && resp.sujetoOk !== undefined){
        const lblMap = {lexico: 'léxico', tacito: 'tácito', impersonal: 'impersonal'};
        sujFila = `<div style="font-size:.8rem">${resp.sujetoOk ? '✅' : '❌'} Sujeto: <b>${lblMap[sujTipoCorr] || sujTipoCorr}</b></div>`;
      }

      // Funciones
      const funcs = Array.isArray(ai.funciones) ? ai.funciones : [];
      const funcFilas = funcs.map((f, fi)=>{
        const funcResp = (resp.funcionesUsuario || [])[fi];
        if(!funcResp || funcResp.ok === null || funcResp.ok === undefined) return '';
        return `<div style="font-size:.8rem">${funcResp.ok ? '✅' : '❌'} ${escHtml(etiquetaFuncion(f.tipo||''))}: «${escHtml((f.indices||[]).map(i=>ej.tokens[i]?.texto||'').filter(Boolean).join(' '))}»</div>`;
      }).join('');

      const contenido = (predFila || sujFila || funcFilas)
        ? `${predFila}${sujFila}${funcFilas}`
        : `<span style="font-size:.78rem;color:var(--muted)">Sin datos registrados</span>`;

      return `
        <div style="padding:10px 14px;background:var(--paper2);border-radius:8px;display:flex;flex-direction:column;gap:4px">
          <div style="font-weight:700;font-size:.83rem;color:${colorVar};margin-bottom:2px">O${propNum} · «${escHtml(prop.texto||'')}»</div>
          ${contenido}
        </div>`;
    }).join('');

    const total = interna.aciertos + interna.errores;
    const pct = total > 0 ? Math.round((interna.aciertos / total) * 100) : 0;

    return `
      <details style="margin-bottom:14px">
        <summary style="cursor:pointer;font-weight:700;color:var(--ink2);font-size:.88rem;padding:10px 14px;background:var(--paper2);border-radius:10px">
          🔬 Análisis interno · ${interna.aciertos} aciertos / ${interna.errores} errores (${pct}%)
        </summary>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
          ${filas}
        </div>
      </details>`;
  }

  // Indicador visual + botón manual de guardado.
  function renderEstadoGuardado(){
    const eng = state.engine;
    if(!eng) return '';
    if(eng.enviado){
      return `<span class="cp-save-state cp-save-ok" title="Guardado en Sheets">✓ Resultado guardado</span>`;
    }
    if(eng.enviando){
      return `<span class="cp-save-state cp-save-enviando">⏳ Guardando…</span>`;
    }
    if(eng.errorEnvio){
      return `
        <span class="cp-save-state cp-save-err" title="${escAttr(eng.errorEnvio)}">⚠ No se pudo guardar</span>
        <button type="button" class="cp-btn-secondary" onclick="CP.guardarManual()">🔄 Reintentar</button>
      `;
    }
    // Estado inicial: ofrecemos botón manual (autoguardado puede aún no haber terminado)
    return `<button type="button" class="cp-btn-secondary" onclick="CP.guardarManual()">💾 Guardar resultado</button>`;
  }

  // Acción del botón "Guardar resultado".
  function guardarManual(){
    const ej = state.filtered[state.idx];
    if(!ej) return;
    // Reseteamos el flag para permitir reintentos tras error
    if(state.engine){
      state.engine.enviado = false;
      state.engine.enviando = false;
      state.engine.errorEnvio = '';
    }
    enviarResultadoCompuestas(ej, true);
  }

  // Construye los diagnósticos pedagógicos personalizados según los errores cometidos.
  // No solo cuenta: interpreta. Cada diagnostico tiene {tipo: 'ok'|'aviso'|'fallo', emoji, titulo, mensaje}.
  function construirDiagnosticos(ej){
    const eng = state.engine;
    const diags = [];

    // ── VERBOS ─────────────────────────────────────────────────────────
    if(eng.verbosCorrectos.size > 0){
      if(eng.verbosErrores === 0){
        diags.push({
          tipo:'ok', emoji:'✅',
          titulo:'Identificaste todos los verbos a la primera',
          mensaje:'Sin titubeos. Distinguir formas verbales conjugadas es la base del análisis.'
        });
      } else {
        // ¿Confundió alguna perífrasis?
        let perifConfundida = false;
        eng.verbosErrados.forEach(i=>{
          for(const p of (ej.proposiciones||[])){
            const perif = p.verbo?.indices_perifrasis;
            if(Array.isArray(perif) && perif.includes(i) && p.verbo.indice !== i){
              perifConfundida = true;
              break;
            }
          }
        });
        if(perifConfundida){
          diags.push({
            tipo:'aviso', emoji:'⚠️',
            titulo:'Confundiste el auxiliar con el verbo léxico',
            mensaje:'En una perífrasis verbal («había aprobado», «está estudiando»), el verbo auxiliar y el léxico forman <b>un solo núcleo</b>. Solo se marca el último (el que lleva el significado principal).'
          });
        } else if(eng.verbosErrores >= 2){
          diags.push({
            tipo:'aviso', emoji:'⚠️',
            titulo:'Tuviste varios errores con los verbos',
            mensaje:'Recuerda: el núcleo de una oración es siempre un verbo en forma personal (conjugado). Las formas no personales (infinitivo, gerundio, participio) solo son núcleos cuando forman parte de una perífrasis.'
          });
        }
      }
    }

    // ── NEXOS ──────────────────────────────────────────────────────────
    if(eng.nexosCorrectos.size > 0){
      if(eng.nexosErrores === 0){
        diags.push({
          tipo:'ok', emoji:'✅',
          titulo:'Localizaste los nexos sin equivocarte',
          mensaje:'Identificar el nexo es clave para saber qué relación hay entre las oraciones.'
        });
      } else if(eng.nexosErrores >= 2){
        diags.push({
          tipo:'aviso', emoji:'⚠️',
          titulo:'Te costaron los nexos',
          mensaje:'Los nexos suelen ser palabras pequeñas: conjunciones («que», «y», «pero», «porque»), pronombres relativos («que», «quien», «donde») o locuciones de varias palabras («para que», «a pesar de que»).'
        });
      }
    }

    // ── FASE 3 — DELIMITAR ─────────────────────────────────────────────
    if(eng.tokenAProp.size > 0){
      if(eng.f3Errores === 0 && eng.f3Confirmados.size === eng.tokenAProp.size){
        diags.push({
          tipo:'ok', emoji:'✅',
          titulo:'Delimitaste las oraciones a la primera',
          mensaje:'Ver claramente dónde empieza y dónde acaba cada oración es lo más difícil. Lo has logrado.'
        });
      } else if(eng.f3Errores >= 3){
        diags.push({
          tipo:'aviso', emoji:'📐',
          titulo:'Te confundiste varias veces delimitando oraciones',
          mensaje:'Pista: empieza por el verbo de cada oración y ve añadiendo las palabras que dependen de él (su sujeto, sus complementos). El nexo casi nunca pertenece a ninguna oración.'
        });
      }
    }

    // ── FASE 5 — RELACIONES ────────────────────────────────────────────
    if(Array.isArray(eng.f5Respuestas) && eng.f5Respuestas.length > 0){
      const erroresTipoRel = eng.f5Respuestas.filter(r=>r && r.tipoOk === false).length;
      const erroresDir = eng.f5Respuestas.filter(r=>r && r.direccionOk === false).length;
      const erroresFunc = eng.f5Respuestas.filter(r=>r && r.funcionOk === false).length;
      const erroresFSp = eng.f5Respuestas.filter(r=>r && r.funcionSpOk === false).length;
      const totalErrF5 = erroresTipoRel + erroresDir + erroresFunc + erroresFSp;

      if(totalErrF5 === 0 && eng.f5Respuestas.some(r=>r && r.tipoOk === true)){
        diags.push({
          tipo:'ok', emoji:'✅',
          titulo:'Identificaste todas las relaciones correctamente',
          mensaje:'Tipo de relación, dirección y función: todo en orden. Tienes muy claro cómo se articulan las oraciones.'
        });
      } else {
        if(erroresTipoRel >= 1){
          diags.push({
            tipo:'aviso', emoji:'🔗',
            titulo:'Confundiste el tipo de relación',
            mensaje:'Recuerda: en la <b>subordinación</b> una oración depende de otra y hace una función dentro de ella. En la <b>coordinación</b> están al mismo nivel unidas por un nexo. En la <b>yuxtaposición</b> también al mismo nivel pero sin nexo, solo con signos.'
          });
        }
        if(erroresDir >= 1){
          diags.push({
            tipo:'aviso', emoji:'➡️',
            titulo:'Te equivocaste con la dirección de la subordinación',
            mensaje:'En O1 → O2, O1 es la principal (la que rige) y O2 es la subordinada (la que depende). Pregúntate cuál de las dos podría existir sola.'
          });
        }
        if(erroresFunc >= 1){
          diags.push({
            tipo:'aviso', emoji:'🎯',
            titulo:'Algún caso de función te despistó',
            mensaje:'La función de la subordinada es el papel que hace dentro de la principal: sujeto, CD, CN, CC… Si dudas, sustitúyela mentalmente por un pronombre («esto», «aquello»): la función que ese pronombre haría es la misma.'
          });
        }
        if(erroresFSp >= 1){
          diags.push({
            tipo:'aviso', emoji:'🧩',
            titulo:'La función del SP completo se te resistió',
            mensaje:'Cuando la subordinada es término de preposición, el sintagma preposicional completo (preposición + subordinada) cumple una función dentro de la principal: complemento de régimen, CI, CN, CC… Recuerda: en español, «para» nunca introduce CI; es CC de finalidad.'
          });
        }
      }
    }

    return diags;
  }

  // [ELIMINADO 2026-05-27] verAnalisis() — tras integrar el análisis PAU
  // directamente en el resumen, el botón "Ver análisis completo" desaparece.
  // La función ponía state.modoLectura=true dejando state.engine vivo, lo
  // que causaba un estado zombi: al pulsar "Siguiente" el alumno seguía en
  // modo lectura y no podía volver a entrar al motor de análisis.

  // Siguiente ejercicio en modo práctica
  function siguientePractica(){
    if(state.idx < state.filtered.length - 1){
      state.idx++;
      iniciarFase0();
    }
  }


  // Abandonar el ejercicio actual.
  // - En examen: pide confirmación y vuelve a filtros.
  // - En práctica con resultados acumulados: muestra el resumen de sesión
  //   en lugar de volver directamente a filtros (el alumno verá su trabajo
  //   antes de salir).
  // - En práctica sin resultados: vuelve a filtros directamente.
  function abandonar(){
    if(!confirmarSalidaExamen()) return;
    if(state.modoExamen){
      salirModoExamen();
      state.engine = null;
      state.modoLectura = false;
      renderFiltros();
      return;
    }
    if((state.sessionResults || []).length > 0){
      renderPantallaFinalSesion();
      return;
    }
    state.engine = null;
    state.modoLectura = false;
    renderFiltros();
  }

  // ─────────────────────────────────────────────────────────────────────
  // TOAST flotante animado.
  // Útil para celebrar el fin de una oración/fase con un mensaje visible
  // que NO requiera leer texto en la columna lateral.
  // ─────────────────────────────────────────────────────────────────────
  function mostrarToast(opts){
    const {titulo, subtitulo, colorIdx} = opts || {};
    // Quitar toast anterior si existe
    const prev = document.getElementById('cp-toast');
    if(prev) prev.remove();
    const toast = document.createElement('div');
    toast.id = 'cp-toast';
    toast.className = 'cp-toast' + (colorIdx ? ' cp-toast-p'+colorIdx : '');
    toast.innerHTML = `
      <div class="cp-toast-icon">🎉</div>
      <div class="cp-toast-body">
        <div class="cp-toast-titulo">${escHtml(titulo||'')}</div>
        ${subtitulo ? `<div class="cp-toast-sub">${escHtml(subtitulo)}</div>` : ''}
      </div>`;
    document.body.appendChild(toast);
    // Forzar animación de entrada
    requestAnimationFrame(()=>{
      toast.classList.add('show');
    });
    // Auto-cerrar después de 2.4s
    setTimeout(()=>{
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(()=>toast.remove(), 400);
    }, 2400);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render: vista del EJERCICIO (modo lectura)
  // ─────────────────────────────────────────────────────────────────────
  function renderEjercicio(){
    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    const ej = state.filtered[state.idx];
    if(!ej){
      wrap.innerHTML = renderEmptyHtml('No hay ningún ejercicio para mostrar.');
      return;
    }

    document.getElementById('cp-counter').textContent = `${state.idx+1} / ${state.filtered.length}`;

    const nivel = (ej.metadatos && ej.metadatos.nivel) || 'medio';
    const subtipo = obtenerSubtipoPrincipal(ej);
    const nprops = ej.proposiciones?.length || 0;

    wrap.innerHTML = `
      <div class="cp-meta-bar">
        <span class="cp-meta-pill"><b>${ej.id || '—'}</b></span>
        <span class="cp-meta-pill">${etiquetaTipo(ej.tipo_oracion||'?')}</span>
        ${subtipo ? `<span class="cp-meta-pill">${escHtml(etiquetaSubtipo(subtipo))}</span>` : ''}
        <span class="cp-meta-pill ${nivel}">${etiquetaNivel(nivel)}</span>
        <span class="cp-meta-pill">${nprops} ${nprops===1?'oración':'oraciones'}</span>
      </div>

      <div class="cp-oracion-card">
        <div class="cp-oracion-text">${renderTokens(ej)}</div>
        ${state.solucionVisible ? `
          <div class="cp-legend">
            <span class="cp-legend-item"><span class="cp-legend-swatch" style="background:#FEE2E2"></span>verbo</span>
            <span class="cp-legend-item"><span class="cp-legend-swatch" style="background:#DBEAFE"></span>conjunción</span>
            <span class="cp-legend-item"><span class="cp-legend-swatch" style="background:#E0E7FF"></span>pron. relativo</span>
          </div>
        ` : ''}
        ${ej.metadatos && ej.metadatos.consejo_inicial ? `
          <div class="cp-tip" style="margin-top:14px;margin-bottom:0">💡 ${escHtml(ej.metadatos.consejo_inicial)}</div>
        ` : ''}
      </div>

      <div style="margin-bottom:14px">
        <button type="button" class="cp-btn-secondary cp-toggle-sol" onclick="CP.toggleSolucion()">
          ${state.solucionVisible ? '🙈 Ocultar análisis' : '🔍 Ver análisis completo'}
        </button>
      </div>

      <div class="cp-solucion-content" style="display:${state.solucionVisible?'block':'none'}">
        ${renderModeloPAU(ej)}
      </div>

      <div class="cp-navbar">
        <button type="button" class="cp-btn-secondary" onclick="CP.anterior()" ${state.idx===0?'disabled':''}>← Anterior</button>
        <div class="cp-spacer"></div>
        <button type="button" class="cp-btn-secondary" onclick="CP.volverFiltros()">↑ Filtros</button>
        <button type="button" class="cp-btn-primary" onclick="CP.siguiente()" ${state.idx>=state.filtered.length-1?'disabled':''}>Siguiente →</button>
      </div>
    `;
  }

  function renderTokens(ej){
    if(!Array.isArray(ej.tokens)) return escHtml(ej.texto || '');
    // En modo lectura limpio (solución oculta), los tokens NO se colorean:
    // el alumno ve la oración tal cual. Solo al desplegar el análisis aparecen los colores.
    const colorear = state.solucionVisible;
    const tokens = ej.tokens;
    let html = '';
    for(let idx = 0; idx < tokens.length; idx++){
      const t = tokens[idx];
      const cat = t.categoria || 'otro';
      const cls = colorear ? `cp-token ${cat}` : 'cp-token';
      const tokHtml = `<span class="${cls}">${escHtml(t.texto||'')}</span>`;
      const next = tokens[idx+1];
      // Aperturas (¿ ¡) se pegan a la palabra siguiente
      const esApertura = (cat === 'puntuacion' && /^[¿¡]$/.test(t.texto || ''));
      if(esApertura){
        html += tokHtml + '\u2060';
      } else if(next && next.categoria === 'puntuacion'){
        html += tokHtml + '\u2060';
      } else if(cat === 'puntuacion'){
        html += tokHtml + ' ';
      } else {
        html += tokHtml + ' ';
      }
    }
    return html.trimEnd();
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODELO DEFINITIVO PAU
  // Render descriptivo del análisis de la oración compuesta para "Ver
  // análisis completo". Estilo PAU/EBAU Murcia: títulos en mayúsculas,
  // oraciones marcadas con • o ↳, nexo y función al final.
  // ═════════════════════════════════════════════════════════════════════

  // Devuelve la familia pedagógica de un subtipo de subordinada (NGLE):
  // 'sustantiva' | 'relativa' | 'adverbial' | 'construccion' | null
  function familiaPAU(subtipo){
    if(!subtipo) return null;
    if(subtipo.startsWith('sustantiva')) return 'sustantiva';
    if(subtipo.startsWith('relativa'))   return 'relativa';
    if(['temporal','locativa','modal','comparativa'].includes(subtipo)) return 'adverbial';
    if(['causal','final','condicional','concesiva','ilativa_constr'].includes(subtipo)) return 'construccion';
    return null;
  }

  // Etiqueta humana de la subordinada en el modelo PAU.
  function etiquetaSubordinadaPAU(subtipo){
    const fam = familiaPAU(subtipo);
    if(fam === 'sustantiva') return 'sustantiva';
    if(fam === 'relativa'){
      return ({
        relativa_especificativa: 'de relativo especificativa',
        relativa_explicativa:    'de relativo explicativa',
        relativa_libre:          'de relativo libre',
        relativa_semilibre:      'de relativo semilibre'
      })[subtipo] || 'de relativo';
    }
    if(fam === 'adverbial'){
      return ({
        temporal:    'adverbial temporal',
        locativa:    'adverbial de lugar',
        modal:       'adverbial de modo',
        comparativa: 'adverbial comparativa'
      })[subtipo] || 'adverbial';
    }
    if(fam === 'construccion'){
      return ({
        causal:         'causal',
        final:          'final',
        condicional:    'condicional',
        concesiva:      'concesiva',
        ilativa_constr: 'consecutiva'
      })[subtipo] || '';
    }
    return '';
  }

  // Etiqueta de la categoría del nexo, con artículo (para "introducida por …").
  function nombreCategoriaNexoPAU(cat){
    return ({
      conjuncion:          'la conjunción',
      locucion_conjuntiva: 'la locución conjuntiva',
      pronombre_relativo:  'el pronombre relativo',
      adverbio_relativo:   'el adverbio relativo',
      puntuacion:          'el signo de puntuación'
    })[cat] || 'el nexo';
  }

  // Etiqueta humana extendida de una función (la usada en el dictado PAU).
  function etiquetaFuncionPAU(f){
    return ({
      sujeto:              'Sujeto',
      cd:                  'Complemento Directo',
      ci:                  'Complemento Indirecto',
      atributo:            'Atributo',
      cpvo:                'Complemento Predicativo',
      c_regimen:           'Complemento de Régimen',
      termino_preposicion: 'Término de preposición',
      aposicion:           'Aposición',
      cn:                  'Complemento del Nombre',
      atributo_locativo:   'Atributo Locativo',
      dativo:              'Dativo',
      cc:                  'Complemento Circunstancial',
      // Modelo unificado cc_<subtipo> (junio 2026).
      cc_lugar:            'Complemento Circunstancial de Lugar',
      cc_tiempo:           'Complemento Circunstancial de Tiempo',
      cc_modo:             'Complemento Circunstancial de Modo',
      cc_causa:            'Complemento Circunstancial de Causa',
      cc_finalidad:        'Complemento Circunstancial de Finalidad',
      cc_cantidad:         'Complemento Circunstancial de Cantidad',
      cc_compania:         'Complemento Circunstancial de Compañía',
      cc_instrumento:      'Complemento Circunstancial de Instrumento',
      cc_beneficiario:     'Complemento Circunstancial de Beneficiario',
      // Aliases del esquema viejo (compatibilidad).
      cc_temporal:         'Complemento Circunstancial de Tiempo',
      cc_locativo:         'Complemento Circunstancial de Lugar',
      cc_modal:            'Complemento Circunstancial de Modo',
      cc_causal:           'Complemento Circunstancial de Causa',
      cc_final:            'Complemento Circunstancial de Finalidad',
      cc_instrumental:     'Complemento Circunstancial de Instrumento',
      cc_comparativo:      'Complemento Circunstancial de Comparación'
    })[f] || f;
  }

  // Subtipo de coordinación en mayúsculas para el título.
  function tituloSubtipoCoord(s){
    return ({
      copulativa:  'COPULATIVA',
      adversativa: 'ADVERSATIVA',
      disyuntiva:  'DISYUNTIVA'
    })[s] || (s||'').toUpperCase();
  }

  // Ordena un array de oraciones por su primera aparición textual.
  function ordenarPropsPorTextoPAU(props){
    return [...props].sort((a,b) => {
      const ia = (a.indices && a.indices.length) ? Math.min(...a.indices) : 9999;
      const ib = (b.indices && b.indices.length) ? Math.min(...b.indices) : 9999;
      return ia - ib;
    });
  }

  // Forma del verbo a mostrar: perífrasis completa si tiene >1 token, si no la forma.
  function formaVerboPAU(prop, ej){
    const indicesPer = (prop.verbo && Array.isArray(prop.verbo.indices_perifrasis))
      ? prop.verbo.indices_perifrasis : [];
    if(indicesPer.length > 1){
      const partes = indicesPer
        .map(i => (ej.tokens||[]).find(t => t.i === i)?.texto || '')
        .filter(Boolean);
      if(partes.length) return partes.join(' ');
    }
    return prop.verbo?.forma || '?';
  }

  // Bloque "• Label: «texto» (Verbo: forma)" o "↳ Label: ..."
  function bloquePropPAU(prefijo, label, prop, ej){
    return `
      <div class="cp-pau-prop">
        <div class="cp-pau-prop-label"><span class="cp-pau-prefix">${prefijo}</span> <b>${escHtml(label)}:</b></div>
        <div class="cp-pau-prop-text">«${escHtml(prop.texto || '')}»</div>
        <div class="cp-pau-prop-verbo">(Verbo: <i>${escHtml(formaVerboPAU(prop, ej))}</i>)</div>
      </div>`;
  }

  // Bloque "• Nexo:" o "• Nexo y función:" según corresponda.
  function bloqueNexoPAU(titulo, cuerpoHtml){
    return `
      <div class="cp-pau-nexo">
        <div class="cp-pau-prop-label"><span class="cp-pau-prefix">•</span> <b>${escHtml(titulo)}:</b></div>
        <div class="cp-pau-nexo-body">${cuerpoHtml}</div>
      </div>`;
  }

  function tituloPAU(texto){
    return `<div class="cp-pau-titulo">ORACIÓN COMPUESTA${texto ? ' POR ' + texto : ''}</div>`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // CASO COORDINADA
  // ─────────────────────────────────────────────────────────────────────
  function construirPAUCoord(ej, props){
    const relCoord = (ej.relaciones||[]).find(r => r.tipo === 'coordinacion');
    const subtipo = relCoord?.subtipo || '';
    const titulo = `COORDINACIÓN${subtipo ? ' ' + tituloSubtipoCoord(subtipo) : ''}`;
    const nexo = (ej.nexos||[])[0];
    const nexoTxt = nexo
      ? `${nombreCategoriaNexoPAU(nexo.categoria||'conjuncion')}${subtipo ? ' ' + (etiquetaSubtipoCoordPAU(subtipo)) : ''} <i>«${escHtml(nexo.forma||'')}»</i>.`
      : '<i>(sin nexo registrado)</i>';
    let cuerpo = '';
    props.forEach((p, i) => {
      cuerpo += bloquePropPAU('•', `Oración ${i+1}`, p, ej);
    });
    cuerpo += bloqueNexoPAU('Nexo', nexoTxt);
    return tituloPAU(titulo) + cuerpo;
  }

  // Subtipo coord en minúsculas para la prosa del nexo ("conjunción copulativa «y»").
  function etiquetaSubtipoCoordPAU(s){
    return ({
      copulativa: 'copulativa',
      adversativa: 'adversativa',
      disyuntiva: 'disyuntiva'
    })[s] || '';
  }

  // ─────────────────────────────────────────────────────────────────────
  // CASO YUXTAPUESTA
  // ─────────────────────────────────────────────────────────────────────
  function construirPAUYuxt(ej, props){
    const nexo = (ej.nexos||[])[0];
    const nexoTxt = nexo
      ? `signo de puntuación (<i>«${escHtml(nexo.forma||'')}»</i>).`
      : '<i>signo de puntuación.</i>';
    let cuerpo = '';
    props.forEach((p, i) => {
      cuerpo += bloquePropPAU('•', `Oración ${i+1}`, p, ej);
    });
    cuerpo += bloqueNexoPAU('Nexo', nexoTxt);
    return tituloPAU('YUXTAPOSICIÓN') + cuerpo;
  }

  // ─────────────────────────────────────────────────────────────────────
  // CASO SUBORDINADA (binaria principal + subordinada)
  // ─────────────────────────────────────────────────────────────────────
  function construirPAUSub(ej, props){
    const principal = props.find(p => p.tipo === 'principal');
    const subordinada = props.find(p => p.tipo === 'subordinada');
    if(!principal || !subordinada){
      // Estructura no esperada — fallback genérico.
      return construirPAUMixta(ej, props);
    }
    const fam = familiaPAU(subordinada.subtipo);
    const esConstruccion = fam === 'construccion';
    const titulo = esConstruccion ? '' : 'SUBORDINACIÓN';

    const etiquetaSub = etiquetaSubordinadaPAU(subordinada.subtipo);
    const labelSub = esConstruccion
      ? `Construcción ${etiquetaSub}`
      : `Oración subordinada ${etiquetaSub}`;

    // Orden textual: ¿quién aparece antes?
    let cuerpo = '';
    for(const p of props){
      if(p === principal)        cuerpo += bloquePropPAU('•', 'Oración principal', principal, ej);
      else if(p === subordinada) cuerpo += bloquePropPAU('↳', labelSub, subordinada, ej);
    }

    // Bloque nexo y función
    const nexo = (ej.nexos||[]).find(n => n.categoria !== 'puntuacion') || (ej.nexos||[])[0];
    const rel = (ej.relaciones||[]).find(r => r.tipo === 'subordinacion') || {};
    cuerpo += construirBloqueNexoYFuncionPAU(nexo, rel, subordinada, esConstruccion);

    return tituloPAU(titulo) + cuerpo;
  }

  function construirBloqueNexoYFuncionPAU(nexo, rel, subordinada, esConstruccion){
    // Construcciones: solo nexo, sin función.
    if(esConstruccion){
      if(!nexo) return bloqueNexoPAU('Nexo', '<i>(sin nexo registrado)</i>');
      const catLabel = nombreCategoriaNexoPAU(nexo.categoria||'conjuncion').replace(/^(la|el) /, '');
      return bloqueNexoPAU('Nexo',
        `${catLabel} <i>«${escHtml(nexo.forma||'')}»</i>.`);
    }
    // Sustantivas / relativas / adverbiales: nexo + función.
    if(!nexo){
      return bloqueNexoPAU('Nexo y función', '<i>(sin nexo registrado)</i>');
    }
    const intro = `introducida por ${nombreCategoriaNexoPAU(nexo.categoria||'conjuncion')} <i>«${escHtml(nexo.forma||'')}»</i>.`;
    let funcionTxt = '';
    const funcion = rel.funcion || subordinada.funcion;
    if(funcion === 'termino_preposicion'){
      const spFunc = rel.funcion_sp || '';
      const spLbl  = spFunc ? etiquetaFuncionPAU(spFunc) : '';
      funcionTxt = `La subordinada funciona como <b>Término de preposición</b>.`;
      if(spLbl){
        funcionTxt += `<br>El sintagma preposicional completo funciona como <b>${escHtml(spLbl)}</b>.`;
      }
    } else if(funcion){
      const lbl = etiquetaFuncionPAU(funcion);
      // Para relativas con antecedente expreso, la función es CN del antecedente.
      // Para relativas libres / semilibres, la función la hace la subordinada entera.
      funcionTxt = `La subordinada funciona como <b>${escHtml(lbl)}</b> de la oración principal.`;
      if(familiaPAU(subordinada.subtipo) === 'relativa'){
        if(subordinada.subtipo === 'relativa_especificativa' || subordinada.subtipo === 'relativa_explicativa'){
          funcionTxt = `La subordinada funciona como <b>${escHtml(lbl)}</b> de su antecedente.`;
        }
      }
    } else {
      funcionTxt = '<i>(función no registrada)</i>';
    }
    return bloqueNexoPAU('Nexo y función', `${intro}<br>${funcionTxt}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // CASO MIXTA o fallback
  // ─────────────────────────────────────────────────────────────────────
  function construirPAUMixta(ej, props){
    let cuerpo = '';
    props.forEach((p, i) => {
      let label;
      if(p.tipo === 'principal') label = 'Oración principal';
      else if(p.tipo === 'subordinada'){
        const fam = familiaPAU(p.subtipo);
        const sub = etiquetaSubordinadaPAU(p.subtipo);
        label = (fam === 'construccion') ? `Construcción ${sub}` : `Oración subordinada ${sub}`;
      } else if(p.tipo === 'coordinada') label = `Oración coordinada ${i+1}`;
      else label = `Oración ${i+1}`;
      const prefijo = (p.tipo === 'subordinada') ? '↳' : '•';
      cuerpo += bloquePropPAU(prefijo, label, p, ej);
    });
    // Listar nexos
    (ej.nexos||[]).forEach((n, i) => {
      const titNexo = (ej.nexos||[]).length > 1 ? `Nexo ${i+1}` : 'Nexo';
      const catLbl = nombreCategoriaNexoPAU(n.categoria||'conjuncion').replace(/^(la|el) /, '');
      cuerpo += bloqueNexoPAU(titNexo, `${catLbl} <i>«${escHtml(n.forma||'')}»</i>.`);
    });
    return tituloPAU('') + cuerpo;
  }

  // ─────────────────────────────────────────────────────────────────────
  // ENTRADA: el render principal que se llama desde "Ver análisis completo"
  // ─────────────────────────────────────────────────────────────────────
  function renderModeloPAU(ej){
    if(!ej || !Array.isArray(ej.proposiciones) || ej.proposiciones.length === 0) return '';
    const props = ordenarPropsPorTextoPAU(ej.proposiciones);
    const tipoOr = ej.tipo_oracion;
    let cuerpo;
    if(tipoOr === 'coordinada')       cuerpo = construirPAUCoord(ej, props);
    else if(tipoOr === 'yuxtapuesta') cuerpo = construirPAUYuxt(ej, props);
    else if(tipoOr === 'subordinada') cuerpo = construirPAUSub(ej, props);
    else                              cuerpo = construirPAUMixta(ej, props);
    return `<div class="cp-pau">${cuerpo}</div>`;
  }

  // Etiqueta de subtipo en versión "extendida pedagógica":
  // sustantiva_cd → "Sustantiva de complemento directo"
  function etiquetaSubtipoExtendida(s){
    const m = {
      'copulativa':'Copulativa','adversativa':'Adversativa','disyuntiva':'Disyuntiva',
      'distributiva':'Distributiva','explicativa':'Explicativa','ilativa_coord':'Ilativa',
      'sustantiva_sujeto':'Sustantiva de sujeto',
      'sustantiva_cd':'Sustantiva de complemento directo',
      'sustantiva_atributo':'Sustantiva de atributo',
      'sustantiva_termino_preposicion':'Sustantiva término de preposición',
      'sustantiva_aposicion':'Sustantiva en aposición',
      'relativa_especificativa':'Relativa especificativa',
      'relativa_explicativa':'Relativa explicativa',
      'relativa_libre':'Relativa libre',
      'relativa_semilibre':'Relativa semilibre',
      'condicional':'Condicional','final':'Final','causal':'Causal',
      'concesiva':'Concesiva','ilativa_constr':'Ilativa',
      'temporal':'Temporal','locativa':'Locativa',
      'modal':'Modal','comparativa':'Comparativa'
    };
    return m[s] || s;
  }

  // Nombre largo y pedagógico de cada función sintáctica
  function nombreLargoFuncion(f){
    const m = {
      'sujeto':'sujeto',
      'cd':'complemento directo',
      'ci':'complemento indirecto',
      'atributo':'atributo',
      'cpvo':'complemento predicativo',
      'c_regimen':'complemento de régimen',
      'c_agente':'complemento agente',
      'marca_pas_ref':'marca de pasiva refleja',
      'mod_oracional':'modificador oracional',
      'vocativo':'vocativo',
      'atributo_locativo':'atributo locativo',
      'dativo':'dativo',
      'cc':'complemento circunstancial',
      'cc_lugar':'complemento circunstancial de lugar',
      'cc_tiempo':'complemento circunstancial de tiempo',
      'cc_modo':'complemento circunstancial de modo',
      'cc_causa':'complemento circunstancial de causa',
      'cc_finalidad':'complemento circunstancial de finalidad',
      'cc_cantidad':'complemento circunstancial de cantidad',
      'cc_compania':'complemento circunstancial de compañía',
      'cc_instrumento':'complemento circunstancial de instrumento',
      'cc_beneficiario':'complemento circunstancial de beneficiario',
      'cc_temporal':'complemento circunstancial de tiempo',
      'cc_locativo':'complemento circunstancial de lugar',
      'cc_modal':'complemento circunstancial de modo',
      'cc_causal':'complemento circunstancial de causa',
      'cc_final':'complemento circunstancial de finalidad',
      'cc_comparativo':'complemento circunstancial comparativo',
      'termino_preposicion':'término de preposición',
      'aposicion':'aposición',
      'cn':'complemento del nombre',
      'c_adj':'complemento del adjetivo',
      'c_adv':'complemento del adverbio',
      'incidental':'incidental'
    };
    return m[f] || f;
  }

  function renderError(){
    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    const diag = state.loadDiagnostic || {};
    const diagHtml = (diag.url || diag.status !== null) ? `
      <details style="margin-top:14px;text-align:left;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px 12px;font-size:.78rem;color:#7F1D1D">
        <summary style="cursor:pointer;font-weight:700">Detalles técnicos del error (clic para expandir)</summary>
        <div style="margin-top:8px;font-family:monospace;word-break:break-all;line-height:1.4">
          <b>URL:</b> ${escHtml(diag.url||'(no se llegó a calcular)')}<br>
          <b>Status HTTP:</b> ${diag.status===null?'(sin respuesta)':diag.status}<br>
          <b>Content-Type:</b> ${escHtml(diag.contentType||'(no recibido)')}<br>
          <b>Claves del JSON:</b> ${escHtml((diag.parsedKeys||[]).join(', ')||'(no se parseó)')}<br>
          <b>Inicio respuesta:</b><br>
          <span style="display:block;background:#fff;padding:6px;border-radius:4px;margin-top:4px;max-height:120px;overflow:auto">${escHtml(diag.rawText||'(sin contenido)')}</span>
          <b style="display:block;margin-top:6px">Muestra parseada:</b>
          <span style="display:block;background:#fff;padding:6px;border-radius:4px;margin-top:4px;max-height:120px;overflow:auto">${escHtml(diag.parsedSample||'(no parseado)')}</span>
        </div>
      </details>` : '';
    wrap.innerHTML = `
      <div class="cp-card cp-empty">
        <div class="cp-empty-icon">⚠️</div>
        <div class="cp-empty-msg"><b>No se ha podido cargar el banco de oraciones compuestas.</b></div>
        <div class="cp-empty-err">${escHtml(state.loadError || 'Error desconocido.')}</div>
        ${diagHtml}
        <div style="margin-top:16px">
          <button type="button" class="cp-btn-primary" onclick="CP.reintentar()">Reintentar</button>
          <button type="button" class="cp-btn-secondary" onclick="cpExit()" style="margin-left:8px">Volver</button>
        </div>
      </div>`;
  }

  function renderEmptyHtml(msg){
    return `
      <div class="cp-card cp-empty">
        <div class="cp-empty-icon">🤷</div>
        <div class="cp-empty-msg">${escHtml(msg)}</div>
        <button type="button" class="cp-btn-secondary" onclick="CP.volverFiltros()">← Volver a filtros</button>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Navegación dentro del ejercicio
  // ─────────────────────────────────────────────────────────────────────
  function siguiente(){ if(state.idx < state.filtered.length-1){ state.idx++; state.solucionVisible=false; renderEjercicio(); } }
  function anterior(){  if(state.idx > 0){ state.idx--; state.solucionVisible=false; renderEjercicio(); } }
  function volverFiltros(){
    if(!confirmarSalidaExamen()) return;
    if(state.modoExamen) salirModoExamen();
    state.engine = null; state.modoLectura = false; renderFiltros();
  }
  function toggleSolucion(){ state.solucionVisible = !state.solucionVisible; renderEjercicio(); }

  async function reintentar(){
    state.loaded = false;
    state.loadError = '';
    await loadBanco();
    renderFiltros();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Etiquetado humano de valores técnicos
  // ─────────────────────────────────────────────────────────────────────
  function etiquetaTipo(t){
    return {
      'coordinada':'Coordinada',
      'subordinada':'Subordinada',
      'yuxtapuesta':'Yuxtapuesta',
      'mixta':'Mixta'
    }[t] || t;
  }
  function etiquetaNivel(n){
    return {
      'basico':'Básico',
      'medio':'Medio',
      'avanzado':'Avanzado'
    }[n] || n;
  }
  function etiquetaSubtipo(s){
    const m = {
      // coord
      'copulativa':'Copulativa', 'adversativa':'Adversativa', 'disyuntiva':'Disyuntiva',
      'distributiva':'Distributiva', 'explicativa':'Explicativa', 'ilativa_coord':'Ilativa',
      // sustantivas
      'sustantiva_sujeto':'Sustantiva (Sujeto)',
      'sustantiva_cd':'Sustantiva (CD)',
      'sustantiva_atributo':'Sustantiva (Atributo)',
      'sustantiva_termino_preposicion':'Sustantiva (Término de prep.)',
      'sustantiva_aposicion':'Sustantiva (Aposición)',
      // relativas
      'relativa_especificativa':'Relativa especificativa',
      'relativa_explicativa':'Relativa explicativa',
      'relativa_libre':'Relativa libre',
      'relativa_semilibre':'Relativa semilibre',
      // construcciones
      'condicional':'Condicional', 'final':'Final', 'causal':'Causal',
      'concesiva':'Concesiva', 'ilativa_constr':'Ilativa (construcción)',
      // adverbiales propias
      'temporal':'Temporal', 'locativa':'Locativa',
      'modal':'Modal', 'comparativa':'Comparativa'
    };
    return m[s] || s;
  }
  function etiquetaFuncion(f){
    const m = {
      'sujeto':'Sujeto', 'cd':'CD', 'ci':'CI',
      'atributo':'Atributo', 'atributo_locativo':'Atr. Locativo',
      'cpvo':'CPvo', 'dativo':'Dativo',
      'c_regimen':'C. Régimen', 'c_agente':'C. Agente',
      'marca_pas_ref':'Marca Pas. Refleja', 'mod_oracional':'Mod. Oracional',
      'vocativo':'Vocativo', 'cc':'CC',
      // Subtipos de CC — modelo unificado cc_<subtipo> (junio 2026).
      'cc_lugar':'CC Lugar', 'cc_tiempo':'CC Tiempo', 'cc_modo':'CC Modo',
      'cc_causa':'CC Causa', 'cc_finalidad':'CC Finalidad', 'cc_cantidad':'CC Cantidad',
      'cc_compania':'CC Compañía', 'cc_instrumento':'CC Instrumento',
      'cc_beneficiario':'CC Benef.',
      // Aliases del esquema viejo del motor (compatibilidad hacia atrás).
      'cc_temporal':'CC Tiempo', 'cc_locativo':'CC Lugar',
      'cc_modal':'CC Modo', 'cc_causal':'CC Causa', 'cc_final':'CC Finalidad',
      'cc_comparativo':'CC Comparativo',
      'termino_preposicion':'Término de prep.',
      'aposicion':'Aposición', 'cn':'CN', 'c_adj':'C. Adjetivo', 'c_adv':'C. Adverbio',
      'incidental':'Incidental',
      'construccion_condicional':'Constr. condicional',
      'construccion_final':'Constr. final',
      'construccion_causal':'Constr. causal',
      'construccion_concesiva':'Constr. concesiva',
      'construccion_ilativa':'Constr. ilativa'
    };
    return m[f] || f;
  }

  // Modelo unificado de subtipos de CC (junio 2026). Combina los tres formatos
  // posibles del banco en un único "tipo efectivo" cc_<subtipo>:
  //   1. Prompt v1.3:   {tipo:'cc', subtipo:'lugar'}     → 'cc_lugar'
  //   2. Motor viejo:   {tipo:'cc_locativo'}             → 'cc_lugar' (alias)
  //   3. CC pelado:     {tipo:'cc'} sin subtipo          → 'cc' (genérico)
  // Devuelve el tipo efectivo que se usa como correctTipo y para la etiqueta.
  const _CC_SUBTIPO_ALIAS = {
    // alias del motor viejo → forma canónica
    'cc_temporal':'cc_tiempo', 'cc_locativo':'cc_lugar',
    'cc_modal':'cc_modo', 'cc_causal':'cc_causa', 'cc_final':'cc_finalidad'
  };
  function _ccTipoEfectivo(func){
    const tipo = func && func.tipo;
    if(!tipo) return '';
    if(tipo === 'cc'){
      const sub = (func.subtipo || '').toString().trim().toLowerCase();
      // normaliza algún sinónimo de tildes
      const norm = sub === 'compañia' ? 'compania' : sub;
      return norm ? 'cc_' + norm : 'cc';
    }
    // tipo ya viene como cc_xxx: aplicar alias si procede
    if(tipo.startsWith('cc_')) return _CC_SUBTIPO_ALIAS[tipo] || tipo;
    return tipo;
  }
  // Lista de subtipos canónicos para el submenú (orden didáctico).
  const _CC_SUBTIPOS_CP = [
    'cc_lugar','cc_tiempo','cc_modo','cc_causa','cc_finalidad',
    'cc_cantidad','cc_compania','cc_instrumento','cc_beneficiario'
  ];
  function etiquetaTipoProp(t){
    return {
      'principal':'Principal',
      'subordinada':'Subordinada',
      'coordinada':'Coordinada',
      'yuxtapuesta':'Yuxtapuesta'
    }[t] || t;
  }
  // Helpers HTML
  function escHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escAttr(s){ return escHtml(s); }

  // Exportar API pública
export const CP = {
    enter, exit,
    enterDesdeLogin, iniciarExamenDesdeLogin,
    iniciarPractica, iniciarLectura,
    limpiarFiltros, mostrarAyudaFiltros,
    siguiente, anterior, volverFiltros, toggleSolucion,
    avanzarFase, avanzarRelacionF5, pedirPista, saltarFase,
    abrirPistaFlotante,
    iniciarAnalisisInterno, irAResumen, saltarAnalisisInterno,
    iiddDragStart, iiddOver, iiddLeave, iiddDrop,
    iiddTagClick, iiddTagClickSlot, iiddSlotClick,
    iiddConfirm, iiddAvanzar,
    iiddConfirmCcSubtipo, iiddCancelCcSubtipo,
    onInternaPredBtn, onInternaSujBtn, onInternaFuncBtn, avanzarInternaSubPaso,
    enviarResultadoExamen, salirTrasEnvio, cerrarExamenFinal,
    siguientePractica, abandonar, finalizarSesion,
    guardarManual,
    reintentar,
    _state: state
};

if (typeof window !== 'undefined') window.CP = CP;
