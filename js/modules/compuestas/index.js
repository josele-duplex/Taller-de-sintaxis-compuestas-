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

  const state = {
    ejercicios: [],         // banco completo (49+ ejercicios)
    filtered: [],           // banco tras aplicar filtros
    idx: 0,                 // índice actual dentro de filtered
    filtros: {              // filtros activos (sets de strings)
      tipo:     new Set(),
      subtipo:  new Set(),
      nivel:    new Set(),
      n_props:  new Set()   // valores numéricos como strings ('2', '3', '4')
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
    examTimerMin: 0,        // duración (reservado para futuro timer)
    pinInputView: false,    // estamos mostrando el formulario de PIN
    pinError: '',           // último mensaje de error del PIN
    pinLoading: false,      // hay una petición de carga en curso
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
    enviosPendientes: new Map()      // Map<ejercicioId, payload> para reintentos
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
          if(!Array.isArray(sample.proposiciones)) reasons.push('proposiciones no es array');
          else if(sample.proposiciones.length===0) reasons.push('proposiciones vacío');
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

  // Validador mínimo: cada ejercicio debe tener id, texto, tokens, proposiciones, relaciones
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
    state.filtered = state.ejercicios.filter(ej=>{
      if(state.filtros.tipo.size > 0 && !state.filtros.tipo.has(ej.tipo_oracion||'')) return false;
      // subtipo: usa el subtipo de la primera relación de subordinación o coordinación, o el del primer prop
      const subtipoEj = obtenerSubtipoPrincipal(ej);
      if(state.filtros.subtipo.size > 0 && !state.filtros.subtipo.has(subtipoEj||'')) return false;
      const nivel = (ej.metadatos && ej.metadatos.nivel) || '';
      if(state.filtros.nivel.size > 0 && !state.filtros.nivel.has(nivel)) return false;
      const np = String(ej.proposiciones?.length || 0);
      if(state.filtros.n_props.size > 0 && !state.filtros.n_props.has(np)) return false;
      return true;
    });
    state.idx = 0;
  }

  function obtenerSubtipoPrincipal(ej){
    // 1) Buscar subtipo en alguna relación
    for(const r of (ej.relaciones||[])){
      if(r.subtipo) return r.subtipo;
    }
    // 2) Si no, buscar subtipo en una proposición subordinada
    for(const p of (ej.proposiciones||[])){
      if(p.subtipo) return p.subtipo;
    }
    return '';
  }

  // ─────────────────────────────────────────────────────────────────────
  // Mapeo de IDs internos de proposiciones (pp, ps, p1...) a etiquetas
  // legibles P1, P2, P3... según el orden en que aparecen en ej.proposiciones.
  // El alumno nunca debería ver "pp" o "ps": esos son artefactos técnicos.
  // ─────────────────────────────────────────────────────────────────────
  function buildPropLabelMap(ej){
    const map = {};
    (ej.proposiciones||[]).forEach((p, i)=>{
      map[p.id] = 'P' + (i+1);
    });
    return map;
  }
  function propLabel(propId, labelMap){
    return labelMap[propId] || propId;
  }

  // Texto descriptivo: «proposición principal», «proposición subordinada sustantiva»…
  // Se usa en la redacción explícita de relaciones.
  function descripcionPropTipo(p){
    if(!p) return 'proposición';
    if(p.tipo === 'principal') return 'proposición principal';
    if(p.tipo === 'coordinada') return 'proposición coordinada';
    if(p.tipo === 'yuxtapuesta') return 'proposición yuxtapuesta';
    if(p.tipo === 'subordinada'){
      const s = p.subtipo || '';
      if(s.startsWith('sustantiva')) return 'proposición subordinada sustantiva';
      if(s.startsWith('relativa'))   return 'proposición subordinada adjetiva (de relativo)';
      if(['temporal','locativa','modal','comparativa'].includes(s)) return 'proposición subordinada adverbial';
      if(['condicional','final','causal','concesiva','ilativa_constr'].includes(s)) return 'construcción ' + s.replace('_constr','');
      return 'proposición subordinada';
    }
    return 'proposición';
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
    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    if(state.loadError){
      renderError();
      return;
    }
    // Fase 1.5: si estamos en la pantalla de entrada de PIN, renderizar eso
    if(state.pinInputView){
      renderEntradaPIN();
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
        <p class="cp-sub">Filtra por tipo, subtipo, nivel o número de proposiciones. Cuando estés listo, pulsa <b>Ver primera oración</b> para empezar a explorar.</p>

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
          <div class="cp-filter-label">Nº de proposiciones</div>
          <div class="cp-chip-grid" id="cp-f-nprops">
            ${opc.nprops.map(n=>chipHtml('n_props', n, n+' propos.')).join('')}
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

        <div style="margin-top:14px;padding-top:14px;border-top:1px dashed var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:.85rem;color:var(--muted)">¿Tienes un PIN del profesor?</span>
          <button type="button" class="cp-btn-secondary" onclick="CP.entrarModoExamen()">🎓 Modo examen</button>
        </div>
      </div>

      <div class="cp-tip">
        💡 <b>Práctica interactiva</b>: identifica los verbos y nexos de la oración paso a paso. <b>Modo lectura</b>: muestra el análisis completo sin evaluación (útil para auditar el banco).
      </div>
    `;

    // Activar listeners de chips
    document.querySelectorAll('#cp-wrap .cp-chip').forEach(ch=>{
      ch.addEventListener('click', ()=>{
        const cat = ch.dataset.cat;
        const val = ch.dataset.val;
        if(state.filtros[cat].has(val)) state.filtros[cat].delete(val);
        else state.filtros[cat].add(val);
        renderFiltros();
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Fase 1.5.A: ENTRADA AL MODO EXAMEN
  // El alumno introduce un PIN y el módulo carga los ejercicios pre-
  // computados desde GAS (endpoint getExamenCompuesta). Una vez cargados,
  // se llama a iniciarPractica() y el flujo continúa como práctica normal.
  // ─────────────────────────────────────────────────────────────────────

  // Activa la pantalla de entrada de PIN (sustituye el card de filtros).
  function entrarModoExamen(){
    state.pinInputView = true;
    state.pinError = '';
    state.pinLoading = false;
    renderFiltros();
  }

  // Cancela la entrada de PIN y vuelve a la pantalla de filtros.
  function cancelarPIN(){
    state.pinInputView = false;
    state.pinError = '';
    state.pinLoading = false;
    renderFiltros();
  }

  // Pinta el formulario de PIN (sustituye al card de filtros mientras
  // state.pinInputView === true).
  function renderEntradaPIN(){
    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;
    document.getElementById('cp-counter').textContent = '🎓 Modo examen';
    const loading = state.pinLoading;
    const error = state.pinError;

    wrap.innerHTML = `
      <div class="cp-card" style="max-width:480px;margin:0 auto">
        <h2 style="display:flex;align-items:center;gap:10px"><span>🎓</span> Modo examen</h2>
        <p class="cp-sub">Introduce el PIN que te ha dado tu profesor para cargar el examen.</p>

        <div style="margin:20px 0">
          <label for="cp-pin-input" style="display:block;font-weight:700;margin-bottom:6px;font-size:.88rem;color:var(--ink2)">PIN del examen</label>
          <input type="text" id="cp-pin-input" inputmode="numeric" pattern="\\d{4,6}" maxlength="6"
            placeholder="4-6 dígitos"
            ${loading ? 'disabled' : ''}
            style="width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:10px;font-size:1.2rem;letter-spacing:.3em;text-align:center;font-weight:700;font-family:inherit">
        </div>

        ${error ? `<div style="color:#991B1B;background:#FEF2F2;padding:10px 14px;border-radius:8px;font-size:.85rem;margin-bottom:14px;border-left:3px solid #DC2626">⚠ ${escHtml(error)}</div>` : ''}

        ${loading
          ? `<div style="text-align:center;padding:20px;color:var(--muted)"><div class="spinner"></div><div style="margin-top:8px">Cargando examen…</div></div>`
          : `<div style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="cp-btn-primary" onclick="CP.validarPIN()">✓ Validar PIN</button>
              <button type="button" class="cp-btn-secondary" onclick="CP.cancelarPIN()">← Cancelar</button>
            </div>`
        }
      </div>
    `;

    // Auto-focus en el input + Enter dispara la validación
    if(!loading){
      setTimeout(()=>{
        const inp = document.getElementById('cp-pin-input');
        if(!inp) return;
        inp.focus();
        inp.addEventListener('keydown', e=>{
          if(e.key === 'Enter'){ e.preventDefault(); validarPIN(); }
        });
      }, 50);
    }
  }

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

  // Handler del botón "Validar PIN": lee el input, valida formato,
  // llama al backend y, si todo va bien, sustituye el banco por los
  // ejercicios del examen y arranca iniciarPractica().
  async function validarPIN(){
    const inp = document.getElementById('cp-pin-input');
    if(!inp) return;
    const pin = String(inp.value || '').trim();
    if(!pin || !/^\d{4,6}$/.test(pin)){
      state.pinError = 'El PIN debe tener entre 4 y 6 dígitos numéricos.';
      renderFiltros();
      return;
    }
    state.pinError = '';
    state.pinLoading = true;
    renderFiltros();

    try {
      const data = await fetchExamenCompuesta(pin);
      // Validar mínimamente los ejercicios (mismo filtro que el banco normal)
      const validos = data.ejercicios.filter(isValidEjercicio);
      if(validos.length === 0){
        throw new Error('El examen tiene ejercicios pero ninguno pasa la validación mínima.');
      }
      // Guardar el banco original para poder volver
      if(state.ejerciciosBanco === null){
        state.ejerciciosBanco = state.ejercicios;
      }
      // Sustituir el banco por los ejercicios del examen
      state.ejercicios = validos;
      state.filtered   = validos.slice();
      state.idx        = 0;
      // Metadata del examen
      state.modoExamen  = true;
      state.examPin     = pin;
      state.examGrupo   = data.grupo        || '';
      state.examEval    = data.evaluacion   || '';
      state.examName    = data.nombreExamen || '';
      state.examTimerMin= parseInt(data.timer) || 0;
      state.pinInputView= false;
      state.pinLoading  = false;
      state.pinError    = '';
      // Reset del estado de envío del examen
      state.examResultados   = [];
      state.examEnviado      = false;
      state.examEnviando     = false;
      state.examErrorEnvio   = '';
      console.log('[CP examen] PIN', pin, '·', validos.length, 'ejercicios cargados · grupo:', state.examGrupo, '· eval:', state.examEval);
      // Mostrar banner del modo examen y arrancar la práctica
      showExamenBanner();
      iniciarPractica();
    } catch(e){
      state.pinLoading = false;
      state.pinError   = String(e && e.message || e);
      renderFiltros();
    }
  }

  // Sale del modo examen y restaura el banco original.
  // Llamado desde abandonar/volverFiltros cuando state.modoExamen es true.
  function salirModoExamen(){
    if(!state.modoExamen) return;
    state.modoExamen   = false;
    state.examPin      = '';
    state.examGrupo    = '';
    state.examEval     = '';
    state.examName     = '';
    state.examTimerMin = 0;
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
    if(state.examName)  parts.push('<span>' + escHtml(state.examName) + '</span>');
    if(state.examGrupo) parts.push('<span>Grupo ' + escHtml(state.examGrupo) + '</span>');
    if(state.examEval)  parts.push('<span>Eval. ' + escHtml(state.examEval) + '</span>');
    parts.push('<span>PIN ' + escHtml(state.examPin) + '</span>');
    banner.innerHTML = parts.join(sepHtml);
    banner.style.display = '';
  }

  function hideExamenBanner(){
    const banner = document.getElementById('cp-examen-banner');
    if(banner) banner.remove();
  }

  // Helper que pide confirmación al alumno antes de salir del examen.
  // Devuelve true si el alumno confirma (o si no estaba en modo examen).
  function confirmarSalidaExamen(){
    if(!state.modoExamen) return true;
    return window.confirm('¿Seguro que quieres salir del examen?\n\nPerderás todo el progreso de esta sesión y no podrás continuar con este PIN.');
  }
  window.CP_renderFiltros = renderFiltros;

  function chipHtml(categoria, valor, etiqueta){
    const activo = state.filtros[categoria].has(valor);
    return `<span class="cp-chip ${activo?'active':''}" data-cat="${categoria}" data-val="${escAttr(valor)}">${escHtml(etiqueta)}</span>`;
  }

  function limpiarFiltros(){
    state.filtros.tipo.clear();
    state.filtros.subtipo.clear();
    state.filtros.nivel.clear();
    state.filtros.n_props.clear();
    renderFiltros();
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
    iniciarFase0();
  }

  // ═════════════════════════════════════════════════════════════════════
  // MOTOR PEDAGÓGICO INTERACTIVO (E3.1 — fases 0, 1, 2)
  //
  // Estado del motor (vive dentro de state.engine):
  //   fase: 0 | 1 | 2 | 'resumen'
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
    // verboPropByIdx: mapa índice → id de proposición (para saber qué perífrasis se confirma de un solo clic)
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
    // Para fase 3: índice del token → id de proposición en el JSON ('pp', 'ps', 'p1'...)
    // Solo tokens que están en alguna `proposicion.indices`. Los nexos como `que`
    // completivo NO están en indices y por tanto NO se piden al alumno.
    const tokenAProp = new Map();
    (ej.proposiciones||[]).forEach((p, propIdx)=>{
      const propNum = propIdx + 1;  // P1, P2, P3...
      (p.indices||[]).forEach(i=>{
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
      // ── Fase 3: delimitar proposiciones ─────────────────────────────
      tokenAProp,                          // mapa correcto (índice → numProp)
      f3PropActiva: 1,                     // qué P_n está seleccionada como activa
      f3Asignaciones: new Map(),           // mapa actual del alumno: indice → numProp
      f3Confirmados: new Set(),            // tokens correctamente asignados
      f3Errados: new Map(),                // indice → numProp que el alumno asignó mal (para feedback)
      f3Aciertos: 0,
      f3Errores: 0,
      pistaUsadaF3: false,
      // ── Fase 4: clasificar proposiciones ────────────────────────────
      f4IdxActual: 0,                      // qué proposición se está clasificando (0..N-1)
      f4Respuestas: [],                    // [{tipo, subtipo, tipoOk, subtipoOk}]
      f4Aciertos: 0,
      f4Errores: 0,
      // ── Fase 5: relaciones entre proposiciones ──────────────────────
      f5IdxActual: 0,                      // qué relación se está respondiendo (0..N-1)
      f5Respuestas: [],                    // [{tipo, tipoOk, origen, direccionOk, funcion, funcionOk, funcionSp, funcionSpOk}]
      f5Aciertos: 0,
      f5Errores: 0,
      // ── Fase 6: análisis interno de proposiciones (Entrega 4 / Fase 1.4) ─
      interna: {
        activo:     false,           // se activa cuando el alumno elige "Analizar por dentro"
        propIdx:    0,               // qué proposición se está analizando (0..N-1)
        subPaso:    'predicado',     // 'predicado' | 'sujeto' | 'funciones'
        funcionIdx: 0,               // qué función dentro de la proposición se está analizando
        respuestas: [],              // [{predicadoIndices, predicadoOk, sujetoIndices, sujetoTipo, sujetoOk, funcionesUsuario, funcionesOk}]
        aciertos:   0,
        errores:    0
      },
      // ── General ──────────────────────────────────────────────────────
      mensajeFeedback: null
    };
    // Pre-asignar los VERBOS confirmados de fase 1 a su proposición correcta en fase 3
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

    const wrap = document.getElementById('cp-wrap');
    if(!wrap) return;

    // ── Fase 1.4 (mayo 2026): pantalla de elección post-clasificación ──
    if(eng.fase === 'interna_choice'){
      const totalProps = (ej.proposiciones || []).length;
      const tieneInterno = (ej.proposiciones || []).every(p => p && p.analisis_interno);
      wrap.innerHTML = `
        <div class="cp-summary" style="text-align:center">
          <div class="cp-summary-icon">🎯</div>
          <h2 class="cp-summary-title">Has clasificado las proposiciones</h2>
          <p style="color:var(--muted);font-size:.95rem;max-width:480px;margin:8px auto 22px;line-height:1.55">
            ¿Quieres ver el <b>resumen del análisis</b> ya, o prefieres <b>profundizar</b> analizando cada
            proposición por dentro (sujeto, predicado y funciones)?
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px">
            <button type="button" class="cp-btn-secondary" onclick="CP.irAResumen()">📋 Ver resumen</button>
            ${tieneInterno ? `<button type="button" class="cp-btn-primary" onclick="CP.iniciarAnalisisInterno()">🔬 Analizar por dentro</button>` : ''}
          </div>
          ${!tieneInterno ? `
            <p style="color:var(--muted);font-size:.78rem;margin-top:14px;font-style:italic">
              Este ejercicio no incluye análisis interno de las ${totalProps} proposiciones.
            </p>` : ''}
        </div>
      `;
      return;
    }

    // ── Fase 1.4: análisis interno de proposiciones ──────────────────────
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
                              (eng.f3Aciertos||0) + (eng.f4Aciertos||0) + (eng.f5Aciertos||0);
        const totalErrores  = (eng.verbosErrores||0) + (eng.nexosErrores||0) +
                              (eng.f3Errores||0) + (eng.f4Errores||0) + (eng.f5Errores||0);
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
      return;
    }

    // Determinar qué fases mostrar (skipear fase 2 si solo hay 1 proposición)
    const tieneNexos = (ej.proposiciones||[]).length > 1 && (ej.nexos||[]).length > 0;
    const tieneRelaciones = (ej.relaciones||[]).length > 0;
    const unaSolaProp = (ej.proposiciones||[]).length === 1;

    // Fase 4 tiene una UI distinta (no oración con tokens, sino una "tarjeta-pregunta")
    if(eng.fase === 4){
      wrap.innerHTML = `
        ${renderProgressBar(eng.fase, tieneNexos, tieneRelaciones)}
        <div class="cp-oracion-recordatorio">${escHtml(ej.texto || '')}</div>
        ${renderInstruccion(eng.fase, ej)}
        ${renderClasificacion(ej)}
        ${eng.mensajeFeedback ? renderFeedback(eng.mensajeFeedback) : ''}
        ${renderActions(eng.fase, ej, tieneNexos)}
        <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
          <button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button>
        </div>
      `;
      // Listeners de las opciones
      wrap.querySelectorAll('.cp-clasif-opt[data-q]').forEach(el=>{
        el.addEventListener('click', ()=>{
          onClasifClick(el.dataset.q, el.dataset.v);
        });
      });
      return;
    }

    // Fase 5: relaciones entre proposiciones. UI también especial.
    if(eng.fase === 5){
      wrap.innerHTML = `
        ${renderProgressBar(eng.fase, tieneNexos, tieneRelaciones)}
        <div class="cp-oracion-recordatorio">${escHtml(ej.texto || '')}</div>
        ${renderInstruccion(eng.fase, ej)}
        ${renderResumenPropos(ej)}
        ${renderRelaciones5(ej)}
        ${eng.mensajeFeedback ? renderFeedback(eng.mensajeFeedback) : ''}
        ${renderActions(eng.fase, ej, tieneNexos)}
        <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
          <button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button>
        </div>
      `;
      // Listeners de las opciones de relación
      wrap.querySelectorAll('.cp-clasif-opt[data-q-rel]').forEach(el=>{
        el.addEventListener('click', ()=>{
          onRelacionClick(el.dataset.qRel, el.dataset.v);
        });
      });
      return;
    }

    // Fases 0, 1, 2, 3 — la oración interactiva
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
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
        <button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button>
      </div>
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
    if(fase === 0){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">📖</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Lee la oración con atención</h3>
            <p class="cp-instr-desc">Cuando estés preparado, pulsa <b>Empezar</b> para analizarla paso a paso.</p>
          </div>
        </div>`;
    }
    if(fase === 1){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">🎯</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 1 · Identifica los verbos</h3>
            <p class="cp-instr-desc">Esta oración tiene <b>${nProps} verbo${nProps===1?'':'s'}</b> que son núcleo de proposición. Toca cada uno. Si hay una perífrasis (como «está estudiando» o «había aprobado»), marca solo el verbo en participio o gerundio (el último).</p>
          </div>
        </div>`;
    }
    if(fase === 2){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">🔗</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 2 · Identifica los nexos</h3>
            <p class="cp-instr-desc">¿Qué palabra (o palabras) une las proposiciones? Toca <b>${nNexos===1?'el nexo':'los '+nNexos+' nexos'}</b>. Pueden ser conjunciones («que», «y», «pero», «porque»…), pronombres relativos («que», «quien», «donde»…) o locuciones («para que», «a pesar de que»…).</p>
          </div>
        </div>`;
    }
    if(fase === 3){
      const eng = state.engine;
      const propActiva = eng.f3PropActiva;
      // Texto descriptivo de la P_n activa
      const lblPropAct = `P${propActiva}`;
      return `
        <div class="cp-instr cp-instr-grande cp-instr-fase3">
          <span class="cp-instr-emoji">📐</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 3 · Delimita las proposiciones</h3>
            <p class="cp-instr-desc">Ahora vas a decir qué palabras forman cada proposición. <b>Empieza por <span style="color:var(--cp-p${Math.min(propActiva,4)});font-weight:800">${lblPropAct}</span></b>: toca todas las palabras que pertenecen a esa proposición. Cuando termines con ella, te llevaremos a la siguiente.</p>
          </div>
        </div>`;
    }
    if(fase === 4){
      const eng = state.engine;
      const propIdx = eng.f4IdxActual;
      const p = (ej.proposiciones||[])[propIdx];
      const resp = eng.f4Respuestas[propIdx] || {};
      // Calcular el sub-paso aquí (no depender de eng.f4SubPaso que puede no estar todavía)
      let subPaso = 'tipo';
      if(resp.tipoOk === true){
        if(p && p.tipo === 'subordinada'){
          subPaso = (resp.familiaOk === true) ? 'subtipo' : 'familia';
        } else if(p && p.tipo === 'coordinada'){
          subPaso = 'subtipo';
        } else {
          subPaso = 'final';
        }
      }
      const propNum = propIdx + 1;
      const colorP = `var(--cp-p${Math.min(propNum,4)})`;
      const titulos = {
        'tipo': `¿Qué tipo de proposición es <span style="color:${colorP};font-weight:800">P${propNum}</span>?`,
        'familia': `Has dicho que <span style="color:${colorP};font-weight:800">P${propNum}</span> es subordinada. ¿Qué clase de subordinada?`,
        'subtipo': `Última pregunta sobre <span style="color:${colorP};font-weight:800">P${propNum}</span>. ¿Qué subtipo concreto?`,
        'final': `<span style="color:${colorP};font-weight:800">P${propNum}</span> está clasificada. Continúa con la siguiente.`
      };
      const descs = {
        'tipo': 'Elige una de las cuatro opciones de abajo.',
        'familia': 'Las subordinadas se agrupan en tres grandes familias: sustantivas (hacen función de SN), de relativo (adjetivas: complementan a un sustantivo) y construcciones (antes llamadas adverbiales).',
        'subtipo': 'Esta es la clasificación más específica. Si dudas, lee bien la proposición de nuevo.',
        'final': ''
      };
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">🏷️</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Paso 4 · Clasifica cada proposición</h3>
            <p class="cp-instr-desc">${titulos[subPaso]||''} ${descs[subPaso]||''}</p>
            <p style="font-size:.74rem;color:var(--muted);margin:4px 0 0">Proposición ${propIdx+1} de ${(ej.proposiciones||[]).length}</p>
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
        'tipo':       `¿Qué tipo de relación hay entre las proposiciones?`,
        'familia':    `Has dicho que es subordinación. ¿Qué familia de subordinada es?`,
        'subtipo':    rel?.tipo === 'subordinacion' ? `¿Qué subtipo concreto de subordinada?` : `¿Qué tipo de coordinación?`,
        'direccion':  `¿Cuál depende de cuál?`,
        'funcion':    `¿Qué función desempeña la proposición subordinada dentro de la principal?`,
        'funcion_sp': `Has dicho que es término de preposición. ¿Qué función tiene el sintagma preposicional completo?`,
        'final':      `Esta relación está respondida. Avanza a la siguiente.`
      };
      const descs = {
        'tipo':       'Pueden estar al mismo nivel (coordinación o yuxtaposición) o una depender de la otra (subordinación).',
        'familia':    'Las subordinadas se agrupan en tres grandes familias: sustantivas (hacen función de SN), de relativo (adjetivas: complementan a un sustantivo) y construcciones (antes llamadas adverbiales).',
        'subtipo':    'Esta es la clasificación más específica.',
        'direccion':  'En una subordinación, una es la principal (manda) y otra la subordinada (depende). Elige la flecha que mejor lo represente.',
        'funcion':    'La subordinada hace una función dentro de la principal: sujeto, complemento directo, complemento indirecto, atributo, etc.',
        'funcion_sp': 'Cuando una proposición subordinada va dentro de un sintagma preposicional («de que…», «en que…», «para que…»), no es ella misma quien hace de complemento de régimen, CI, etc., sino el SP completo.',
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

  // ─────────────────────────────────────────────────────────────────────
  // FASE 3: selector de proposición activa (encima de la oración)
  // ─────────────────────────────────────────────────────────────────────
  function renderPropSelector(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    const nProps = (ej.proposiciones||[]).length;
    let html = `<div class="cp-prop-selector"><span class="cp-prop-selector-label">Asignar a:</span>`;
    for(let n = 1; n <= nProps; n++){
      const activo = eng.f3PropActiva === n ? 'active' : '';
      // Contar cuántos tokens hay actualmente asignados a esta P_n
      let count = 0;
      eng.f3Asignaciones.forEach(v=>{ if(v===n) count++; });
      html += `<button type="button" class="cp-prop-btn ${activo}" data-p="${n}">P${n}<span class="cp-prop-btn-count">${count}</span></button>`;
    }
    html += `</div>`;
    return html;
  }

  function renderInteractTokens(ej){
    const eng = state.engine;
    const tokens = ej.tokens || [];
    let html = '';
    for(let idx = 0; idx < tokens.length; idx++){
      const t = tokens[idx];
      const cat = t.categoria || 'otro';
      const i = t.i;
      // En fase 0 los tokens NO son clicables, solo lectura
      let cls = 'cp-tok';
      let clickable = (cat !== 'puntuacion');
      if(eng.fase === 0){
        clickable = false;
      } else if(eng.fase === 1){
        if(eng.verbosConfirmados.has(i)) cls += ' correcto locked';
        else if(eng.verbosErrados.has(i)) cls += ' error locked';
        else if(eng.verbosSeleccionados.has(i)) cls += ' selected';
      } else if(eng.fase === 2){
        if(eng.verbosConfirmados.has(i)) cls += ' correcto locked';
        else if(eng.nexosConfirmados.has(i)) cls += ' correcto locked';
        else if(eng.nexosErrados.has(i)) cls += ' error locked';
        else if(eng.nexosSeleccionados.has(i)) cls += ' selected';
      } else if(eng.fase === 3){
        // En fase 3: cada token asignado a una proposición se colorea
        // Los verbos confirmados quedan auto-asignados a su proposición
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
    if(eng.fase === 0) return '';
    let ok, er;
    if(eng.fase === 1){ ok = eng.verbosAciertos; er = eng.verbosErrores; }
    else if(eng.fase === 2){ ok = eng.nexosAciertos; er = eng.nexosErrores; }
    else if(eng.fase === 3){ ok = eng.f3Aciertos; er = eng.f3Errores; }
    else if(eng.fase === 4){ ok = eng.f4Aciertos; er = eng.f4Errores; }
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
    if(fase === 0){
      return `
        <div class="cp-actions">
          <div class="cp-spacer"></div>
          <button type="button" class="cp-btn-primary" onclick="CP.avanzarFase()">Empezar →</button>
        </div>`;
    }
    const eng = state.engine;

    if(fase === 1 || fase === 2){
      const errCount = fase === 1 ? eng.verbosErrores : eng.nexosErrores;
      const pistaUsada = fase === 1 ? eng.pistaUsadaF1 : eng.pistaUsadaF2;
      // Para fase 1, una proposición se considera "completa" si al menos UNO de los tokens
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

    if(fase === 4){
      const propIdx = eng.f4IdxActual;
      const resp = eng.f4Respuestas[propIdx] || {};
      // Comprobar si esta proposición ya está respondida según su tipo:
      const p = (ej.proposiciones||[])[propIdx];
      const tipoOk = resp.tipoOk === true;
      const requiereFamilia = p && p.tipo === 'subordinada';
      const familiaOk = !requiereFamilia || (resp.familiaOk === true);
      const requiereSubtipo = p && (p.tipo === 'subordinada' || p.tipo === 'coordinada');
      const subtipoOk = !requiereSubtipo || (resp.subtipoOk === true);
      const completo = tipoOk && familiaOk && subtipoOk;

      const ultimaProp = propIdx >= (ej.proposiciones||[]).length - 1;
      const tieneRelaciones = (ej.relaciones||[]).length > 0;
      let pendienteMsg = 'Elige el tipo';
      if(tipoOk && !familiaOk) pendienteMsg = 'Elige la familia';
      else if(tipoOk && familiaOk && !subtipoOk) pendienteMsg = 'Elige el subtipo';
      let textoBoton;
      if(!ultimaProp) textoBoton = 'Siguiente proposición →';
      else textoBoton = tieneRelaciones ? 'Pasar a relaciones →' : 'Ver resumen →';
      return `
        <div class="cp-actions">
          <button type="button" class="cp-btn-secondary cp-btn-skip" onclick="CP.saltarFase()" title="Avanzar sin completar esta proposición">Saltar proposición →</button>
          <div class="cp-spacer"></div>
          ${completo
            ? `<button type="button" class="cp-btn-primary" onclick="CP.avanzarPropF4()">${textoBoton}</button>`
            : `<span style="color:var(--muted);font-size:.82rem;font-style:italic">${pendienteMsg}</span>`
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
            html: `✓ Correcto. «<b>${escHtml(perifText)}</b>» es el núcleo verbal de una proposición (forma verbal compuesta o perífrasis).`
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
          html: '✗ Ese no es el núcleo de una proposición. ' + razonVerboIncorrecto(i, ej)
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
          html: '✗ Ese no funciona como nexo entre proposiciones. ' + razonNexoIncorrecto(i, ej)
        };
        if(typeof playError === 'function') playError();
        if(typeof trackError === 'function') trackError('compuestas', 'nexo');
      }
      renderFase();
      return;
    }

    if(eng.fase === 3){
      const propActiva = eng.f3PropActiva;
      const propCorrecta = eng.tokenAProp.get(i);  // puede ser undefined (token sin proposición)
      const yaAsignado = eng.f3Asignaciones.get(i);
      const tok = ej.tokens[i];

      // Si está bloqueado (verbo confirmado), informar sin penalizar
      if(eng.verbosConfirmados.has(i) && yaAsignado){
        eng.mensajeFeedback = {
          tipo:'info',
          html: `Este verbo ya quedó asignado a P${yaAsignado} desde el paso anterior.`
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

      // Token SIN proposición asignable (típicamente un nexo)
      // No cuenta como error: damos feedback PEDAGÓGICO claro y aclaratorio.
      if(propCorrecta === undefined){
        // ¿Es un nexo? ¿De qué tipo?
        const nexoInfo = (ej.nexos||[]).find(n=>Array.isArray(n.indices) && n.indices.includes(i));
        if(nexoInfo){
          const cat = nexoInfo.categoria;
          if(cat === 'pronombre_relativo'){
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> es un pronombre relativo. Funciona como nexo aquí, pero además tiene su propia función sintáctica dentro de la proposición a la que pertenece (eso lo veremos más adelante). Por ahora puedes dejarlo sin asignar a ninguna proposición.`
            };
          } else if(cat === 'conjuncion'){
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> es una conjunción. Solo enlaza las proposiciones; no forma parte de ninguna de ellas. Déjala sin asignar.`
            };
          } else if(cat === 'locucion_conjuntiva'){
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> forma parte de una locución conjuntiva (nexo de varias palabras). No se asigna a ninguna proposición.`
            };
          } else {
            eng.mensajeFeedback = {
              tipo:'info',
              html: `<b>«${escHtml(tok?.texto||'')}»</b> es un nexo entre proposiciones. No pertenece a ninguna de ellas.`
            };
          }
        } else {
          // Caso muy raro: algún token sin propietario y sin estar en nexos. Probablemente puntuación.
          eng.mensajeFeedback = {
            tipo:'info',
            html: `<b>«${escHtml(tok?.texto||'')}»</b> no se asigna a ninguna proposición.`
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
                titulo: `¡P${propActiva} terminada!`,
                subtitulo: `Ahora identifica las palabras de P${eng.f3PropActiva}`,
                colorIdx: Math.min(eng.f3PropActiva, 4)
              });
            } else {
              // Saltamos todas las restantes (todas eran solo verbo)
              mostrarToast({
                titulo: `¡Has delimitado todas las proposiciones!`,
                subtitulo: `Pulsa «Siguiente fase» para clasificarlas`,
                colorIdx: 0
              });
            }
            eng.mensajeFeedback = null;
          } else {
            mostrarToast({
              titulo: `¡Has delimitado todas las proposiciones!`,
              subtitulo: `Pulsa «Siguiente fase» para clasificarlas`,
              colorIdx: 0
            });
            eng.mensajeFeedback = null;
          }
        }
        renderFase();
        return;
      }

      // Token que pertenece a OTRA proposición (no la activa).
      // Esto NO se asigna y NO cuenta como error grave: es solo desorientación.
      // Damos feedback claro sobre dónde estamos y qué es ese token.
      eng.f3Errores += 1;  // sí lo contamos, pero solo para estadística (no penaliza el avance)
      if(typeof playError === 'function') playError();
      if(typeof trackError === 'function') trackError('compuestas', 'delimitar');
      eng.mensajeFeedback = {
        tipo:'warn',
        html: `<b>«${escHtml(tok?.texto||'')}»</b> pertenece a <b style="color:var(--cp-p${Math.min(propCorrecta,4)})">P${propCorrecta}</b>, no a <b style="color:var(--cp-p${Math.min(propActiva,4)})">P${propActiva}</b>. Ahora estamos identificando solo las palabras de <b style="color:var(--cp-p${Math.min(propActiva,4)})">P${propActiva}</b>.`
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
    return `«${escHtml(tok?.texto||'')}» es el verbo de una proposición.`;
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
      return `«${escHtml(tok.texto)}» es una forma verbal, pero aquí no actúa como núcleo de una proposición.`;
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
    if(!n) return `«${escHtml(tok?.texto||'')}» une dos proposiciones.`;
    const cat = n.categoria || 'conjuncion';
    const lblCat = {
      'conjuncion':'conjunción',
      'pronombre_relativo':'pronombre relativo',
      'locucion_conjuntiva':'locución conjuntiva',
      'puntuacion':'signo de puntuación con valor de nexo'
    }[cat] || cat;
    return `«${escHtml(n.forma||tok?.texto||'')}» es una ${escHtml(lblCat)} que une las proposiciones.`;
  }

  function razonNexoIncorrecto(i, ej){
    const tok = ej.tokens[i];
    if(!tok) return '';
    const cat = tok.categoria;
    if(cat === 'verbo') return `«${escHtml(tok.texto)}» es un verbo (núcleo de proposición), no un nexo entre ellas.`;
    if(cat === 'sustantivo') return `«${escHtml(tok.texto)}» es un sustantivo.`;
    if(cat === 'adjetivo') return `«${escHtml(tok.texto)}» es un adjetivo.`;
    if(cat === 'adverbio') return `«${escHtml(tok.texto)}» es un adverbio. Los adverbios no suelen funcionar como nexos entre proposiciones.`;
    if(cat === 'pronombre') return `«${escHtml(tok.texto)}» es un pronombre personal, no un nexo.`;
    return `«${escHtml(tok.texto)}» no enlaza proposiciones aquí.`;
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

    if(eng.fase === 0){
      eng.fase = 1;
      eng.mensajeFeedback = null;
      renderFase();
      return;
    }
    if(eng.fase === 1){
      // Tras fase 1: ir a fase 2 si hay nexos, si no a fase 3 (delimitar)
      mostrarToast({
        titulo:'¡Verbos identificados!',
        subtitulo: tieneNexos ? 'Ahora vamos a por los nexos' : (!unaSolaProp ? 'Ahora vamos a delimitar las proposiciones' : 'Ahora a clasificar la oración'),
        colorIdx: 1
      });
      if(tieneNexos){
        eng.fase = 2;
      } else if(!unaSolaProp){
        // Sin nexos pero con varias proposiciones (yuxtaposición sin signo)
        eng.fase = 3;
        preAsignarVerbosFase3();
      } else {
        // Una sola proposición: ir directamente a fase 5 (clasificar y relacionar)
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
        subtitulo:'Ahora delimita las palabras de cada proposición',
        colorIdx: 2
      });
      eng.fase = 3;
      preAsignarVerbosFase3();
      eng.mensajeFeedback = null;
      renderFase();
      return;
    }
    if(eng.fase === 3){
      // Tras fase 3: saltar la fase 4 antigua e ir directamente a la fusionada.
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
    if(eng.fase === 4){
      // Caso legacy: la fase 4 antigua ya no se usa. Si por algún motivo se llega aquí,
      // pasamos directamente a la nueva fase 5 (clasificar y relacionar).
      irFaseClasificarYRelacionar(ej);
      renderFase();
      return;
    }
  }

  // Helper: ir a la fase de "clasificar y relacionar" (la antigua fase 5).
  // Si la oración solo tiene 1 proposición, no hay relaciones → resumen directo.
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
    if(eng.fase === 4){
      // Saltar la proposición actual y pasar a la siguiente o al final de fase 4
      eng.skippedFases.add('4_' + eng.f4IdxActual);
      eng.mensajeFeedback = null;
      avanzarPropF4();
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

  // Pre-asignar los verbos confirmados de fase 1 a su proposición correcta
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
    // que solo constan del verbo, como "hay quien piensa..." donde P1 = "hay"),
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
    if(eng.fase === 1){
      eng.pistaUsadaF1 = true;
      const pendientes = Array.from(eng.verbosCorrectos).filter(i=>!eng.verbosConfirmados.has(i));
      eng.mensajeFeedback = {
        tipo:'info',
        html: `💡 Pista: te faltan <b>${pendientes.length}</b> verbo${pendientes.length===1?'':'s'}. Mira con atención las formas conjugadas.`
      };
    } else if(eng.fase === 2){
      eng.pistaUsadaF2 = true;
      const pendientes = Array.from(eng.nexosCorrectos).filter(i=>!eng.nexosConfirmados.has(i));
      eng.mensajeFeedback = {
        tipo:'info',
        html: `💡 Pista: te falta${pendientes.length===1?'':'n'} <b>${pendientes.length}</b> nexo${pendientes.length===1?'':'s'}. Busca conjunciones o pronombres relativos.`
      };
    } else if(eng.fase === 3){
      eng.pistaUsadaF3 = true;
      const totalPorAsignar = eng.tokenAProp.size - eng.f3Confirmados.size;
      // Detectar a qué proposiciones le faltan tokens
      const faltantesPorProp = new Map();
      eng.tokenAProp.forEach((numProp, i)=>{
        if(!eng.f3Confirmados.has(i)){
          faltantesPorProp.set(numProp, (faltantesPorProp.get(numProp)||0)+1);
        }
      });
      const partes = [];
      faltantesPorProp.forEach((c, p)=>{
        partes.push(`P${p}: ${c}`);
      });
      eng.mensajeFeedback = {
        tipo:'info',
        html: `💡 Pista: te faltan <b>${totalPorAsignar}</b> tokens por asignar (${partes.join(', ')}). Recuerda que algunos tokens pueden NO pertenecer a ninguna proposición (los nexos completivos).`
      };
    }
    renderFase();
  }

  // ═════════════════════════════════════════════════════════════════════
  // FASE 4 — Clasificar cada proposición
  // ═════════════════════════════════════════════════════════════════════

  function renderClasificacion(ej){
    const eng = state.engine;
    const propIdx = eng.f4IdxActual;
    const p = (ej.proposiciones||[])[propIdx];
    if(!p) return '';
    const propNum = propIdx + 1;
    const colorCls = 'p' + Math.min(propNum, 4);
    // Asegurar que existe respuesta para este índice
    if(!eng.f4Respuestas[propIdx]) eng.f4Respuestas[propIdx] = {};
    const resp = eng.f4Respuestas[propIdx];

    // Determinar el sub-paso actual
    // 'tipo' → pregunta tipo. Si correcto y es subordinada → 'familia'. Si es coord → 'subtipo'.
    // 'familia' → pregunta familia (sustantiva/relativa/construccion). Si correcto → 'subtipo'.
    // 'subtipo' → pregunta subtipo concreto dentro de la familia.
    let subPaso = 'tipo';
    if(resp.tipoOk === true){
      if(p.tipo === 'subordinada'){
        if(resp.familiaOk === true) subPaso = 'subtipo';
        else subPaso = 'familia';
      } else if(p.tipo === 'coordinada'){
        subPaso = 'subtipo';
      } else {
        // Principal o yuxtapuesta: ya terminamos esta proposición
        subPaso = 'final';
      }
    }
    eng.f4SubPaso = subPaso;

    // Opciones de tipo (3 reales para EBAU Murcia: principal, subordinada, coordinada — yuxtapuesta aparece solo si la oración lo es)
    const opcionesTipo = [
      ['principal','Principal'],
      ['subordinada','Subordinada'],
      ['coordinada','Coordinada'],
      ['yuxtapuesta','Yuxtapuesta']
    ];

    let html = `
      <div class="cp-clasif-prop-card ${colorCls}">
        <div class="cp-clasif-prop-header">
          <span class="cp-clasif-prop-id ${colorCls}">P${propNum}</span>
          <span style="font-size:.78rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em">${propIdx+1} de ${ej.proposiciones.length}</span>
        </div>
        <div class="cp-clasif-prop-text">«${escHtml(p.texto||'')}»</div>
    `;

    // ─── SUB-PASO 1: TIPO ──────────────────────────────────────────────
    html += `
      <div class="cp-clasif-q">
        <span class="cp-clasif-q-label">1. Tipo de proposición</span>
        <div class="cp-clasif-opts">
          ${opcionesTipo.map(([v,lbl])=>{
            let cls = 'cp-clasif-opt';
            if(resp.tipo === v){
              if(resp.tipoOk === true) cls += ' correcto locked';
              else if(resp.tipoOk === false) cls += ' error';
              else cls += ' selected';
            }
            if(resp.tipoOk === true && resp.tipo !== v) cls += ' locked';
            return `<button type="button" class="${cls}" data-q="tipo" data-v="${v}">${escHtml(lbl)}</button>`;
          }).join('')}
        </div>
      </div>
    `;

    // ─── SUB-PASO 2: FAMILIA (solo para subordinadas) ──────────────────
    if(resp.tipoOk === true && p.tipo === 'subordinada'){
      const opcionesFamilia = [
        ['sustantiva','Sustantiva',`Hace una función propia de un sintagma nominal (sujeto, CD, atributo…).`],
        ['relativa','De relativo (adjetiva)',`Complementa a un sustantivo, como un adjetivo.`],
        ['construccion','Construcción',`Antes llamadas adverbiales: temporales, causales, finales, condicionales, concesivas, ilativas.`]
      ];
      html += `
        <div class="cp-clasif-q">
          <span class="cp-clasif-q-label">2. ¿Qué familia de subordinada?</span>
          <div class="cp-clasif-opts cp-clasif-opts-vertical">
            ${opcionesFamilia.map(([v,lbl,desc])=>{
              let cls = 'cp-clasif-opt cp-clasif-opt-familia';
              if(resp.familia === v){
                if(resp.familiaOk === true) cls += ' correcto locked';
                else if(resp.familiaOk === false) cls += ' error';
                else cls += ' selected';
              }
              if(resp.familiaOk === true && resp.familia !== v) cls += ' locked';
              return `<button type="button" class="${cls}" data-q="familia" data-v="${v}">
                <span style="font-weight:800;display:block;margin-bottom:2px">${escHtml(lbl)}</span>
                <span style="font-size:.78rem;font-weight:500;opacity:.85">${escHtml(desc)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    // ─── SUB-PASO 3: SUBTIPO CONCRETO ──────────────────────────────────
    const mostrarSubtipo = (resp.tipoOk === true && p.tipo === 'coordinada') ||
                          (resp.tipoOk === true && resp.familiaOk === true);
    if(mostrarSubtipo){
      const opcionesSubtipo = obtenerOpcionesSubtipo(p.tipo, p.subtipo, resp.familia);
      const ordinal = (p.tipo === 'coordinada') ? '2' : '3';
      html += `
        <div class="cp-clasif-q">
          <span class="cp-clasif-q-label">${ordinal}. Subtipo concreto</span>
          <div class="cp-clasif-opts">
            ${opcionesSubtipo.map(([v,lbl])=>{
              let cls = 'cp-clasif-opt';
              if(resp.subtipo === v){
                if(resp.subtipoOk === true) cls += ' correcto locked';
                else if(resp.subtipoOk === false) cls += ' error';
                else cls += ' selected';
              }
              if(resp.subtipoOk === true && resp.subtipo !== v) cls += ' locked';
              return `<button type="button" class="${cls}" data-q="subtipo" data-v="${v}">${escHtml(lbl)}</button>`;
            }).join('')}
          </div>
        </div>`;
    }

    html += `</div>`;
    return html;
  }

  // Familia inferida del subtipo correcto (para validar el sub-paso "familia")
  function familiaDelSubtipo(subtipo){
    if(!subtipo) return null;
    if(subtipo.startsWith('sustantiva')) return 'sustantiva';
    if(subtipo.startsWith('relativa')) return 'relativa';
    if(['temporal','locativa','modal','comparativa','condicional','final','causal','concesiva','ilativa_constr'].includes(subtipo)) return 'construccion';
    return null;
  }

  // Devuelve la lista de subtipos a mostrar al alumno, filtrada por familia (si aplica)
  function obtenerOpcionesSubtipo(tipo, subtipoCorrecto, familiaElegida){
    if(tipo === 'coordinada'){
      // EBAU Murcia: solo 3 coordinadas
      return [
        ['copulativa','Copulativa'],
        ['adversativa','Adversativa'],
        ['disyuntiva','Disyuntiva']
      ];
    }
    if(tipo === 'subordinada'){
      // Filtramos según la familia que ELIGIÓ el alumno (que ya validamos correcta)
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

  // ─────────────────────────────────────────────────────────────────────
  // Resolver el subtipo correcto de una proposición.
  // En coordinadas, la propiedad "copulativa/adversativa/disyuntiva" pertenece
  // a la RELACIÓN de coordinación, no a cada proposición. Buscamos en relaciones.
  // En subordinadas, el subtipo sí está en la propia proposición.
  // ─────────────────────────────────────────────────────────────────────
  function subtipoCorrectoDePropos(p, ej){
    if(!p) return null;
    if(p.subtipo) return p.subtipo;  // disponible en la propia propos (subordinadas)
    // Coordinadas: buscar la relación de coordinación que incluye esta proposición
    if(p.tipo === 'coordinada'){
      for(const r of (ej?.relaciones || [])){
        if(r.tipo !== 'coordinacion') continue;
        const propIds = Array.isArray(r.proposiciones) ? r.proposiciones : [];
        if(propIds.includes(p.id) && r.subtipo) return r.subtipo;
      }
    }
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
    const titHtml = `<div class="cp-feedback-title">✗ ${titulo}${razon ? '. ' + escHtml(razon) : '.'}</div>`;
    const fijoHtml = scaffold.fijo
      ? `<div class="cp-feedback-fijo" style="margin-top:8px;font-size:.92rem;line-height:1.45">${escHtml(scaffold.fijo)}</div>`
      : '';
    const pistaHtml = scaffold.pista
      ? `<div class="cp-feedback-pista-wrap" style="margin-top:10px">
           <button type="button" class="cp-feedback-pista-btn" style="background:#FEF9C3;border:1.5px solid #CA8A04;color:#78350F;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.82rem;font-weight:700" onclick="this.nextElementSibling.style.display='block';this.style.display='none'">💡 Ver pista</button>
           <div class="cp-feedback-pista" style="display:none;margin-top:8px;padding:10px 12px;background:#FEF9C3;border-left:3px solid #CA8A04;border-radius:0 8px 8px 0;font-size:.88rem;color:#78350F;line-height:1.45">${escHtml(scaffold.pista)}</div>
         </div>`
      : '';
    const lecHtml = showLec
      ? `<div style="margin-top:12px;text-align:center">
           <button type="button" class="cp-feedback-lec-btn" style="background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-size:.85rem;font-weight:800;box-shadow:0 2px 8px rgba(124,58,237,.3)" onclick="if(window.openMicroLeccion)window.openMicroLeccion()">📖 Ver micro-lección</button>
         </div>`
      : '';
    return titHtml + fijoHtml + pistaHtml + lecHtml;
  }

  function onClasifClick(q, v){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    const propIdx = eng.f4IdxActual;
    const p = (ej.proposiciones||[])[propIdx];
    if(!p) return;
    if(!eng.f4Respuestas[propIdx]) eng.f4Respuestas[propIdx] = {};
    const resp = eng.f4Respuestas[propIdx];

    if(q === 'tipo'){
      if(resp.tipoOk === true) return;  // ya está bloqueado
      resp.tipo = v;
      if(v === p.tipo){
        resp.tipoOk = true;
        eng.f4Aciertos += 1;
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. P${propIdx+1} es una proposición ${escHtml(etiquetaTipoProp(v).toLowerCase())}.`
        };
      } else {
        resp.tipoOk = false;
        eng.f4Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: buildScaffoldFeedbackCP({
            titulo: `P${propIdx+1} no es ${escHtml(etiquetaTipoProp(v).toLowerCase())}`,
            realId: p.tipo,
            marcadaId: v,
            razon: razonTipoIncorrecto(v, p)
          })
        };
        // Permitir que vuelva a intentar (timeout extendido a 4500ms para
        // dar tiempo a leer la pista contextualizada y el botón de lección)
        setTimeout(()=>{
          if(eng.f4IdxActual === propIdx){
            resp.tipoOk = null;
            renderFase();
          }
        }, 4500);
      }
      renderFase();
      return;
    }

    if(q === 'familia'){
      if(resp.familiaOk === true) return;
      resp.familia = v;
      const familiaCorrecta = familiaDelSubtipo(p.subtipo);
      if(v === familiaCorrecta){
        resp.familiaOk = true;
        eng.f4Aciertos += 1;
        const nombres = {'sustantiva':'sustantiva','relativa':'de relativo (adjetiva)','construccion':'construcción'};
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. Es una subordinada <b>${escHtml(nombres[v]||v)}</b>.`
        };
      } else {
        resp.familiaOk = false;
        eng.f4Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: buildScaffoldFeedbackCP({
            titulo: `No es de la familia ${escHtml(v)}`,
            realId: familiaCorrecta,
            marcadaId: v,
            razon: ''
          })
        };
        setTimeout(()=>{
          if(eng.f4IdxActual === propIdx){
            resp.familiaOk = null;
            renderFase();
          }
        }, 4500);
      }
      renderFase();
      return;
    }

    if(q === 'subtipo'){
      if(resp.subtipoOk === true) return;
      resp.subtipo = v;
      // El subtipo correcto puede estar en la propia proposición (subordinadas)
      // o en la relación de coordinación (coordinadas).
      const subtipoOk = subtipoCorrectoDePropos(p, ej);
      if(v === subtipoOk){
        resp.subtipoOk = true;
        eng.f4Aciertos += 1;
        eng.mensajeFeedback = {
          tipo:'ok',
          html: `✓ Correcto. Es <b>${escHtml(etiquetaSubtipoExtendida(v).toLowerCase())}</b>.`
        };
      } else {
        resp.subtipoOk = false;
        eng.f4Errores += 1;
        eng.mensajeFeedback = {
          tipo:'err',
          html: buildScaffoldFeedbackCP({
            titulo: `No es ${escHtml(etiquetaSubtipoExtendida(v).toLowerCase())}`,
            realId: subtipoOk,  // ojo: aquí subtipoOk es el ID del subtipo correcto
            marcadaId: v,
            razon: ''
          })
        };
        setTimeout(()=>{
          // Solo desbloqueamos si el alumno sigue en la misma proposición
          if(eng.f4IdxActual === propIdx){
            resp.subtipoOk = null;
            renderFase();
          }
        }, 4500);
      }
      renderFase();
      return;
    }
  }

  function razonTipoIncorrecto(elegido, p){
    // Sugerencia pedagógica suave
    const correcto = p.tipo;
    if(elegido === 'principal' && correcto !== 'principal'){
      return 'La proposición principal es la que «manda», la que no depende de ninguna otra.';
    }
    if(elegido === 'subordinada' && correcto !== 'subordinada'){
      return 'Una subordinada depende de otra proposición y desempeña una función (CD, CI, sujeto, etc.).';
    }
    if(elegido === 'coordinada' && correcto !== 'coordinada'){
      return 'Las coordinadas están al mismo nivel, unidas por un nexo coordinante («y», «pero», «o»).';
    }
    if(elegido === 'yuxtapuesta' && correcto !== 'yuxtapuesta'){
      return 'La yuxtaposición se da SIN nexo, solo con signos de puntuación.';
    }
    return '';
  }

  function avanzarPropF4(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(eng.f4IdxActual < (ej.proposiciones||[]).length - 1){
      eng.f4IdxActual += 1;
      eng.mensajeFeedback = null;
      renderFase();
    } else {
      // Última proposición clasificada: ¿hay relaciones?
      const tieneRelaciones = (ej.relaciones||[]).length > 0;
      if(tieneRelaciones){
        eng.fase = 5;
        eng.f5IdxActual = 0;
        eng.mensajeFeedback = null;
      } else {
        eng.fase = 'resumen';
        eng.mensajeFeedback = null;
      }
      renderFase();
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // FASE 5 — Relaciones entre proposiciones
  // ═════════════════════════════════════════════════════════════════════

  // Mini-resumen visual de las proposiciones ya clasificadas
  function renderResumenPropos(ej){
    const items = (ej.proposiciones||[]).map((p,idx)=>{
      const n = idx + 1;
      const colorCls = 'p' + Math.min(n, 4);
      const tipoLbl = etiquetaTipoProp(p.tipo);
      const subLbl = p.subtipo ? ' · ' + etiquetaSubtipoExtendida(p.subtipo) : '';
      return `
        <div class="cp-prop-mini ${colorCls}">
          <span class="cp-clasif-prop-id ${colorCls}">P${n}</span>
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

    // ¿Qué proposiciones implica esta relación?
    const propIds = Array.isArray(rel.proposiciones) ? rel.proposiciones : [];
    // Calcular números visibles (P1, P2...) según el índice en ej.proposiciones
    const propIdToNum = new Map();
    (ej.proposiciones||[]).forEach((p,i)=>propIdToNum.set(p.id, i+1));
    const propNums = propIds.map(id=>propIdToNum.get(id));

    let html = `<div class="cp-clasif-prop-card">`;
    // Cabecera: muestra qué relación estamos respondiendo
    html += `
      <div class="cp-clasif-prop-header">
        <span style="font-weight:800;font-size:.92rem;color:var(--ink)">Relación ${relIdx+1} de ${ej.relaciones.length}:</span>
        ${propNums.map(n=>`<span class="cp-clasif-prop-id p${Math.min(n,4)}">P${n}</span>`).join('<span style="color:var(--muted);font-weight:800"> ↔ </span>')}
      </div>
    `;

    // ─── Sub-paso 1: TIPO de relación ─────────────────────────────────
    const opcionesTipo = [
      ['subordinacion','Subordinación','Una proposición depende de otra y desempeña una función dentro de ella.'],
      ['coordinacion','Coordinación','Las proposiciones están al mismo nivel, unidas por un nexo («y», «pero», «o»).'],
      ['yuxtaposicion','Yuxtaposición','Las proposiciones están al mismo nivel, sin nexo (separadas por coma, punto y coma…).']
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
        [idA, `P${nA} → P${nB}`, `P${nB} depende de P${nA}`],
        [idB, `P${nB} → P${nA}`, `P${nA} depende de P${nB}`]
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

    // ─── Sub-paso 6: FUNCIÓN DEL SP (solo si la PS es término de preposición) ────────
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
  // - sustantiva_termino_preposicion → función=termino_preposicion + sub-paso función SP. NO redundante (hay info nueva).
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
  //   sustantiva_termino_preposicion → función = término + funcion_sp
  //                                                            (NO redundante,
  //                                                             se pregunta SP)
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
    // Sustantivas con función obvia (excepto término de preposición)
    if(['sustantiva_sujeto','sustantiva_cd','sustantiva_atributo','sustantiva_aposicion'].includes(sub)) return true;
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
            razon: 'Piensa bien si las proposiciones están al mismo nivel o si una depende de la otra'
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
            razon: 'Piensa en qué hace esta proposición dentro de la principal'
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
          html: `✓ Correcto. P${nOrigen} es la principal; P${nDestino} es la subordinada.`
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
      // Última relación → pantalla de elección (Fase 1.4 mayo 2026):
      // antes de ir al resumen ofrecer al alumno la opción de analizar
      // las proposiciones por dentro (sujeto, predicado, funciones).
      // Si elige "Ver resumen" se va directo; si elige "Analizar por dentro"
      // se entra al mini-motor de análisis interno (eng.fase = 'interna').
      mostrarToast({
        titulo: '¡Clasificación completada!',
        subtitulo: '¿Quieres profundizar en cada proposición?',
        colorIdx: 1
      });
      eng.fase = 'interna_choice';
      eng.mensajeFeedback = null;
      renderFase();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Fase 1.4: análisis interno de proposiciones (Entrega 4)
  //
  // Punto de entrada cuando el alumno acepta "Analizar por dentro" tras
  // la clasificación. Inicializa eng.interna.respuestas[] (una por cada
  // proposición), pone eng.fase = 'interna' y arranca por la primera
  // proposición, sub-paso 'predicado'.
  // ─────────────────────────────────────────────────────────────────────
  function iniciarAnalisisInterno(){
    const eng = state.engine;
    const ej = state.filtered[state.idx];
    if(!eng || !ej) return;
    const props = ej.proposiciones || [];
    // Inicializar una respuesta vacía por proposición
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
  function irAResumen(){
    const eng = state.engine;
    if(!eng) return;
    eng.fase = 'resumen';
    eng.mensajeFeedback = null;
    renderFase();
  }

  // ─────────────────────────────────────────────────────────────────────
  // Fase 1.4.B: ANÁLISIS INTERNO — Render + handlers
  //
  // El mini-motor recorre cada proposición con 3 sub-pasos:
  //   'predicado'  → tipo de predicado (PV / PN)
  //   'sujeto'     → tipo de sujeto (léxico / tácito / impersonal)
  //   'funciones'  → identificar cada complemento del predicado (CD, CI…)
  //
  // El estado vive en eng.interna (inicializado en iniciarAnalisisInterno).
  // Todas las funciones render son puras (devuelven HTML); los handlers
  // mutan eng.interna.respuestas[] y llaman a renderFase().
  // ─────────────────────────────────────────────────────────────────────

  // Normaliza el tipo de predicado a 'verbal' o 'nominal' sea cual sea el
  // valor exacto que use el banco ('PV', 'nominal', 'predicado verbal'…).
  function _normPredTipo(t){
    const s = (t||'').toLowerCase().trim();
    if(!s) return '';
    if(s === 'pv' || s.includes('verbal')) return 'verbal';
    if(s === 'pn' || s.includes('nominal')) return 'nominal';
    return s;
  }

  // ── Render principal del modo interna ──────────────────────────────

  function renderInternaHtml(ej){
    const eng = state.engine;
    const interna = eng.interna;
    const props = ej.proposiciones || [];
    const propIdx = interna.propIdx;
    const prop = props[propIdx];
    if(!prop){
      return '<div style="padding:20px;color:var(--muted)">Error: proposición no disponible.</div>';
    }
    const ai = prop.analisis_interno || {};
    const resp = interna.respuestas[propIdx] || {};
    const subPaso = interna.subPaso;
    const propNum = propIdx + 1;
    const totalProps = props.length;
    const colorVar = `var(--cp-p${Math.min(propNum, 4)})`;

    // Barra de progreso del análisis interno
    const subPasoLabels = {predicado: 'Predicado', sujeto: 'Sujeto', funciones: 'Funciones'};
    const progressHtml = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--surface2);border-radius:10px;margin-bottom:12px;font-size:.83rem;flex-wrap:wrap">
        <span style="font-weight:800;color:${colorVar}">P${propNum}</span>
        <span style="color:var(--muted)">de ${totalProps} proposición${totalProps > 1 ? 'es' : ''}</span>
        <span style="margin-left:auto;font-weight:600;color:var(--ink2)">${subPasoLabels[subPaso] || subPaso}</span>
      </div>`;

    // Texto de la proposición
    const propTextHtml = `
      <div style="padding:10px 14px;background:var(--surface2);border-radius:10px;margin-bottom:14px;font-style:italic;font-size:.97rem;color:var(--ink);line-height:1.55">
        «${escHtml(prop.texto || '')}»
      </div>`;

    let bodyHtml = '';
    if(subPaso === 'predicado')  bodyHtml = _renderInternaPredHtml(prop, ai, resp);
    else if(subPaso === 'sujeto') bodyHtml = _renderInternaSujHtml(ej, prop, ai, resp);
    else if(subPaso === 'funciones') bodyHtml = _renderInternaFuncsHtml(ej, ai, resp);

    return `
      <div style="max-width:600px;margin:0 auto">
        ${progressHtml}
        ${propTextHtml}
        ${bodyHtml}
        <div style="margin-top:16px">
          <button type="button" class="cp-btn-secondary" onclick="CP.abandonar()">← Volver a filtros</button>
        </div>
      </div>`;
  }

  // ── Sub-paso: Predicado (PV vs PN) ─────────────────────────────────

  function _renderInternaPredHtml(prop, ai, resp){
    const predTipoCorr = _normPredTipo((ai.predicado || {}).tipo || '');
    const verbForm = escHtml(prop.verbo?.forma || '?');

    // Sin datos → pantalla informativa + avanzar
    if(!predTipoCorr){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">ℹ️</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Tipo de predicado</h3>
            <p class="cp-instr-desc" style="color:var(--muted)">Este ejercicio no incluye datos sobre el tipo de predicado.</p>
            <div style="margin-top:10px">
              <button type="button" class="cp-btn-primary" onclick="CP.avanzarInternaSubPaso()">Siguiente →</button>
            </div>
          </div>
        </div>`;
    }

    // Ya respondido → feedback
    if(resp.predicadoOk !== null && resp.predicadoOk !== undefined){
      const esOk = resp.predicadoOk;
      const esVerbal = predTipoCorr === 'verbal';
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">${esOk ? '✅' : '❌'}</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">${esOk ? '¡Correcto!' : 'No era eso.'}</h3>
            <p class="cp-instr-desc">Esta proposición tiene un <b>Predicado ${esVerbal ? 'Verbal (PV)' : 'Nominal (PN)'}</b>.
              ${esVerbal
                ? `El verbo «<b>${verbForm}</b>» es pleno (no copulativo): el predicado verbal expresa la acción, proceso o estado.`
                : `El verbo «<b>${verbForm}</b>» es copulativo (<i>ser, estar, parecer…</i>): enlaza el sujeto con el atributo.`
              }
            </p>
            <div style="margin-top:10px">
              <button type="button" class="cp-btn-primary" onclick="CP.avanzarInternaSubPaso()">Siguiente →</button>
            </div>
          </div>
        </div>`;
    }

    // Pregunta
    return `
      <div class="cp-instr cp-instr-grande">
        <span class="cp-instr-emoji">🔍</span>
        <div class="cp-instr-body">
          <h3 class="cp-instr-titulo">¿Qué tipo de predicado tiene esta proposición?</h3>
          <p class="cp-instr-desc">Fíjate en el verbo «<b>${verbForm}</b>»: ¿es un verbo pleno (acción/estado) o es un verbo copulativo (<i>ser, estar, parecer</i>) que enlaza sujeto con atributo?</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
            <button type="button" class="cp-btn-secondary" onclick="CP.onInternaPredBtn('verbal')">Predicado Verbal (PV)</button>
            <button type="button" class="cp-btn-secondary" onclick="CP.onInternaPredBtn('nominal')">Predicado Nominal (PN)</button>
          </div>
        </div>
      </div>`;
  }

  // ── Sub-paso: Sujeto (léxico / tácito / impersonal) ────────────────

  function _renderInternaSujHtml(ej, prop, ai, resp){
    const suj = ai.sujeto || {};
    const sujTipoCorr = suj.tipo || '';
    const verbForm = escHtml(prop.verbo?.forma || '?');

    // Sin datos → skip
    if(!sujTipoCorr){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">ℹ️</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Sujeto</h3>
            <p class="cp-instr-desc" style="color:var(--muted)">Este ejercicio no incluye datos sobre el sujeto.</p>
            <div style="margin-top:10px">
              <button type="button" class="cp-btn-primary" onclick="CP.avanzarInternaSubPaso()">Siguiente →</button>
            </div>
          </div>
        </div>`;
    }

    // Ya respondido → feedback
    if(resp.sujetoOk !== null && resp.sujetoOk !== undefined){
      const esOk = resp.sujetoOk;
      const labelMap = {
        'lexico':      'léxico (aparece explícito en el texto)',
        'tacito':      'tácito o elíptico (se deduce por la desinencia verbal)',
        'impersonal':  'oración impersonal (no hay sujeto)'
      };
      const sujLabel = labelMap[sujTipoCorr] || sujTipoCorr;
      // Si el sujeto es léxico, mostrar su texto
      let sujTextoHtml = '';
      if(sujTipoCorr === 'lexico' && Array.isArray(suj.indices) && suj.indices.length > 0){
        const sujTexto = suj.indices.map(i => ej.tokens[i]?.texto || '').filter(Boolean).join(' ');
        sujTextoHtml = ` El sujeto es «<b>${escHtml(sujTexto)}</b>».`;
      }
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">${esOk ? '✅' : '❌'}</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">${esOk ? '¡Correcto!' : 'No era eso.'}</h3>
            <p class="cp-instr-desc">El sujeto de esta proposición es <b>${sujLabel}</b>.${sujTextoHtml}</p>
            <div style="margin-top:10px">
              <button type="button" class="cp-btn-primary" onclick="CP.avanzarInternaSubPaso()">Siguiente →</button>
            </div>
          </div>
        </div>`;
    }

    // Pregunta
    return `
      <div class="cp-instr cp-instr-grande">
        <span class="cp-instr-emoji">👤</span>
        <div class="cp-instr-body">
          <h3 class="cp-instr-titulo">¿Cuál es el sujeto de esta proposición?</h3>
          <p class="cp-instr-desc">Observa el verbo «<b>${verbForm}</b>» y la proposición entera: ¿aparece el sujeto en el texto, está sobrentendido por la forma verbal, o es una construcción impersonal?</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            <button type="button" class="cp-btn-secondary" onclick="CP.onInternaSujBtn('lexico')">👁️ Sujeto léxico</button>
            <button type="button" class="cp-btn-secondary" onclick="CP.onInternaSujBtn('tacito')">🌫️ Sujeto tácito</button>
            <button type="button" class="cp-btn-secondary" onclick="CP.onInternaSujBtn('impersonal')">⚡ Impersonal</button>
          </div>
        </div>
      </div>`;
  }

  // ── Sub-paso: Funciones del predicado (CD, CI, CC…) ────────────────

  function _renderInternaFuncsHtml(ej, ai, resp){
    const funcs = Array.isArray(ai.funciones) ? ai.funciones : [];

    // Sin funciones → informar + avanzar
    if(funcs.length === 0){
      return `
        <div class="cp-instr cp-instr-grande">
          <span class="cp-instr-emoji">✓</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">Sin complementos adicionales</h3>
            <p class="cp-instr-desc">Esta proposición no tiene complementos del predicado registrados en el banco.</p>
            <div style="margin-top:10px">
              <button type="button" class="cp-btn-primary" onclick="CP.avanzarInternaSubPaso()">Siguiente →</button>
            </div>
          </div>
        </div>`;
    }

    const funcIdx = state.engine.interna.funcionIdx;
    const func = funcs[funcIdx];
    if(!func) return '<div style="color:var(--muted);padding:12px">Error interno.</div>';

    const funcTexto = (func.indices || []).map(i => ej.tokens[i]?.texto || '').filter(Boolean).join(' ');
    const funcTipoCorr = func.tipo || '';
    const funcLabelCorr = etiquetaFuncion(funcTipoCorr);
    const funcProgress = `<div style="font-size:.78rem;color:var(--muted);margin-bottom:6px">Complemento ${funcIdx + 1} de ${funcs.length}</div>`;

    // Ya respondido este funcIdx
    const funcRespArr = Array.isArray(resp.funcionesUsuario) ? resp.funcionesUsuario : [];
    const funcResp = funcRespArr[funcIdx];
    if(funcResp && funcResp.ok !== null && funcResp.ok !== undefined){
      const esOk = funcResp.ok;
      return `
        <div class="cp-instr cp-instr-grande">
          ${funcProgress}
          <span class="cp-instr-emoji">${esOk ? '✅' : '❌'}</span>
          <div class="cp-instr-body">
            <h3 class="cp-instr-titulo">${esOk ? '¡Correcto!' : 'No era eso.'}</h3>
            <p class="cp-instr-desc">«<b>${escHtml(funcTexto)}</b>» es el <b>${escHtml(funcLabelCorr)}</b> de esta proposición.</p>
            <div style="margin-top:10px">
              <button type="button" class="cp-btn-primary" onclick="CP.avanzarInternaSubPaso()">
                ${funcIdx < funcs.length - 1 ? 'Siguiente función →' : 'Siguiente →'}
              </button>
            </div>
          </div>
        </div>`;
    }

    // Pregunta: botones con las funciones más comunes
    const FUNC_BTNS = [
      ['cd','CD'], ['ci','CI'], ['cc','CC'], ['atributo','Atributo'],
      ['cpvo','CPvo'], ['c_regimen','C. Régimen'], ['c_agente','C. Agente'],
      ['cn','CN'], ['aposicion','Aposición'], ['mod_oracional','Mod. Oracional'],
      ['termino_preposicion','Término prep.'], ['vocativo','Vocativo'],
      ['cc_temporal','CC Temporal'], ['cc_locativo','CC Locativo'],
      ['cc_modal','CC Modal']
    ];
    const funcBtnsHtml = FUNC_BTNS.map(([tipo, lbl]) =>
      `<button type="button" class="cp-btn-secondary" style="font-size:.82rem;padding:6px 10px" onclick="CP.onInternaFuncBtn('${tipo}')">${lbl}</button>`
    ).join('');

    return `
      <div class="cp-instr cp-instr-grande">
        ${funcProgress}
        <span class="cp-instr-emoji">🏷️</span>
        <div class="cp-instr-body">
          <h3 class="cp-instr-titulo">¿Qué función desempeña este sintagma?</h3>
          <p class="cp-instr-desc" style="margin-bottom:10px">«<b>${escHtml(funcTexto)}</b>»</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${funcBtnsHtml}
          </div>
        </div>
      </div>`;
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

  // Avanza al siguiente sub-paso dentro de la proposición actual,
  // o a la siguiente proposición cuando acabamos los 3 sub-pasos.
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

  // Avanza a la siguiente proposición o finaliza el análisis interno.
  // Llama a renderFase() internamente — no llamar a renderFase fuera.
  function _avanzarInternaProp(eng, ej){
    const totalProps = (ej.proposiciones || []).length;
    const prevIdx = eng.interna.propIdx;
    if(prevIdx < totalProps - 1){
      eng.interna.propIdx = prevIdx + 1;
      eng.interna.subPaso = 'predicado';
      eng.interna.funcionIdx = 0;
      mostrarToast({
        titulo: `P${prevIdx + 1} analizada ✓`,
        subtitulo: `Continuamos con P${prevIdx + 2}`,
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

  // ─────────────────────────────────────────────────────────────────────
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
      // Reconstruir el texto de la proposición a partir de sus tokens
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

    // Caso 1: una sola proposición (oración simple) — caso degenerado
    if(nProps === 1){
      return `<p>Esta oración tiene una sola proposición; no es propiamente una oración compuesta.</p>`;
    }

    // Caso 2: oración con varias proposiciones y una sola relación
    if(relaciones.length === 1){
      const rel = relaciones[0];
      return redactarRelacionUnica(rel, propPorId, textoDeProp, nexoTextoDeRel(rel), lblFuncion, lblSubtipo);
    }

    // Caso 3: oración con varias relaciones — texto general + cada relación
    let html = `<p>Oración compuesta formada por <b>${nProps} proposiciones</b> y <b>${relaciones.length} relaciones</b>.</p>`;
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
      const cuerpo = `<p>Las proposiciones se unen mediante ${conj}, que funciona como nexo coordinante ${escHtml(subLbl)}. Ambas proposiciones tienen la misma jerarquía sintáctica y son sintácticamente independientes entre sí.</p>`;
      return intro + cuerpo;
    }

    // YUXTAPOSICIÓN
    if(rel.tipo === 'yuxtaposicion'){
      const intro = cuerpoSolo
        ? `yuxtaposición`
        : `<p>Oración compuesta por <b>yuxtaposición</b>.</p>`;
      const cuerpo = `<p>Las proposiciones se relacionan sin nexo, separadas únicamente por un signo de puntuación (coma, punto y coma o dos puntos). Ambas tienen la misma jerarquía sintáctica.</p>`;
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
        cuerpo = `<p>La proposición subordinada «${escHtml(psTxt)}» funciona como <b>${escHtml(fnLbl)}</b>`;
        if(verboPP) cuerpo += ` del verbo «${escHtml(verboPP)}»`;
        cuerpo += ` dentro de la proposición principal (P${ppNum}).`;
        cuerpo += ` La subordinada está incrustada en el predicado de la principal y desempeña una función propia de un sintagma nominal.`;
        if(nexo) cuerpo += ` El nexo subordinante es ${nexo}.`;
        cuerpo += `</p>`;
        // Caso especial término de preposición
        if(sub === 'sustantiva_termino_preposicion' && rel.funcion_sp){
          const fspLbl = lblFuncion(rel.funcion_sp);
          cuerpo += `<p>La subordinada va dentro de un sintagma preposicional que, en conjunto, funciona como <b>${escHtml(fspLbl)}</b> de la proposición principal.</p>`;
        }
        return intro + cuerpo;
      }

      // ─── Relativas ────────────────────────────────────────────────
      if(sub.startsWith('relativa')){
        cuerpo = `<p>La proposición subordinada «${escHtml(psTxt)}» introducida por ${nexo || 'un relativo'}`;
        if(sub === 'relativa_especificativa' || sub === 'relativa_explicativa'){
          cuerpo += ` modifica a un sustantivo de la proposición principal y funciona globalmente como <b>Complemento del Nombre</b>.`;
          if(sub === 'relativa_especificativa'){
            cuerpo += ` Al ser especificativa, restringe la referencia del sustantivo al que acompaña.`;
          } else {
            cuerpo += ` Al ser explicativa, añade información complementaria al sustantivo (separada por comas).`;
          }
        } else if(sub === 'relativa_libre'){
          cuerpo += ` carece de antecedente expreso y adquiere valor nominal. Funciona globalmente como <b>${escHtml(lblFuncion(fn) || 'sintagma nominal')}</b> en la proposición principal.`;
        } else if(sub === 'relativa_semilibre'){
          cuerpo += ` está formada por artículo + relativo. Funciona globalmente como <b>${escHtml(lblFuncion(fn) || 'sintagma nominal')}</b> en la proposición principal. El artículo pertenece a la principal y el relativo a la subordinada.`;
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
      cuerpo = `<p>La proposición subordinada «${escHtml(psTxt)}» ${valor}.`;
      if(nexo) cuerpo += ` Ambas proposiciones se unen mediante el nexo subordinante ${nexo}.`;
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
      aciertos_clasificar:  (eng.f4Aciertos || 0) + (eng.f5Aciertos || 0),
      errores_clasificar:   (eng.f4Errores || 0) + (eng.f5Errores || 0),
      // Fase 1.4: contadores del análisis interno (si el alumno lo hizo)
      aciertos_interna:     (eng.interna && eng.interna.activo) ? eng.interna.aciertos : 0,
      errores_interna:      (eng.interna && eng.interna.activo) ? eng.interna.errores : 0,
      fases_saltadas:       saltadas.join(','),
      pistas_usadas:        pistas.join(','),
      duracion_segundos:    duracion,
      user_agent:           navigator.userAgent || '',
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

    // Aciertos/errores totales (todas las fases sumadas)
    let acTotal = 0, erTotal = 0;
    ress.forEach(r => {
      acTotal += (r.aciertos_verbos||0) + (r.aciertos_nexos||0) + (r.aciertos_delimitar||0) + (r.aciertos_clasificar||0);
      erTotal += (r.errores_verbos||0)  + (r.errores_nexos||0)  + (r.errores_delimitar||0)  + (r.errores_clasificar||0);
    });
    const total = acTotal + erTotal;
    const pct   = total > 0 ? acTotal / total : 0;
    // Nota sobre 10 con 2 decimales
    const nota  = Math.round(pct * 10 * 100) / 100;

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
      // CP no tiene pantalla de login todavía (item 4.2 del roadmap).
      // El backend acepta email/name vacíos (sin dedup en ese caso).
      email:           '',
      name:            '',
      grupo:           state.examGrupo || '',
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
    const totalAciertos = eng.verbosAciertos + eng.nexosAciertos + eng.f3Aciertos + eng.f4Aciertos + (eng.f5Aciertos||0);
    const totalErrores = eng.verbosErrores + eng.nexosErrores + eng.f3Errores + eng.f4Errores + (eng.f5Errores||0);
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
      ['Clasificar', eng.f4Aciertos, eng.f4Errores],
      ['Relaciones', (eng.f5Aciertos||0), (eng.f5Errores||0)],
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

    return `
      <div class="cp-summary">
        <div class="cp-summary-icon">${icono}</div>
        <h2 class="cp-summary-title">${titulo}</h2>
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

      <div class="cp-analisis-discursivo">
        <h3 class="cp-analisis-titulo">📝 Análisis sintáctico</h3>
        <p class="cp-analisis-oracion">«${escHtml(ej.texto||'')}»</p>
        <div class="cp-analisis-cuerpo">${redactarAnalisis(ej)}</div>
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

      ${desglose.length > 1 ? `
        <details style="margin-bottom:14px">
          <summary style="cursor:pointer;font-weight:700;color:var(--ink2);font-size:.88rem;padding:10px 14px;background:var(--paper2);border-radius:10px">Ver desglose por paso</summary>
          <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">
            ${desgloseHtml}
          </div>
        </details>` : ''}

      ${eng.interna.activo ? renderResumenInternaHtml(ej, eng.interna) : ''}

      ${state.modoExamen ? renderEstadoExamenHtml() : ''}

      <div class="cp-actions" style="border-top:none;padding-top:0">
        <button type="button" class="cp-btn-secondary" onclick="CP.verAnalisis()">🔍 Ver análisis completo</button>
        <div class="cp-spacer"></div>
        ${state.modoExamen ? '' : renderEstadoGuardado()}
        ${(state.idx > 0 && !state.modoExamen) ? `<button type="button" class="cp-btn-secondary" onclick="CP.anterior()">← Anterior</button>` : ''}
        ${renderBotonFinalResumen()}
      </div>
    `;
  }

  // Botón final del resumen — depende de si estamos en examen o práctica
  // y de si es el último ejercicio o no.
  function renderBotonFinalResumen(){
    const esUltimo = state.idx >= state.filtered.length - 1;
    if(!state.modoExamen){
      // Práctica: comportamiento original
      return esUltimo
        ? `<button type="button" class="cp-btn-primary" onclick="CP.volverFiltros()">Volver a filtros</button>`
        : `<button type="button" class="cp-btn-primary" onclick="CP.siguientePractica()">Siguiente ejercicio →</button>`;
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
    if(state.modoExamen) salirModoExamen();
    state.engine = null;
    state.modoLectura = false;
    renderFiltros();
  }

  // Sección plegable del resumen que muestra los resultados del análisis
  // interno (Fase 1.4) por proposición — solo si el alumno lo hizo.
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
      if(predTipoCorr && resp.predicadoOk !== null && resp.predicadoOk !== undefined){
        const lbl = predTipoCorr === 'verbal' ? 'PV' : predTipoCorr === 'nominal' ? 'PN' : predTipoCorr;
        predFila = `<div style="font-size:.8rem">${resp.predicadoOk ? '✅' : '❌'} Predicado: <b>${lbl}</b></div>`;
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
          <div style="font-weight:700;font-size:.83rem;color:${colorVar};margin-bottom:2px">P${propNum} · «${escHtml(prop.texto||'')}»</div>
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
            mensaje:'Recuerda: el núcleo de una proposición es siempre un verbo en forma personal (conjugado). Las formas no personales (infinitivo, gerundio, participio) solo son núcleos cuando forman parte de una perífrasis.'
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
          mensaje:'Identificar el nexo es clave para saber qué relación hay entre las proposiciones.'
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
          titulo:'Delimitaste las proposiciones a la primera',
          mensaje:'Ver claramente dónde empieza y dónde acaba cada proposición es lo más difícil. Lo has logrado.'
        });
      } else if(eng.f3Errores >= 3){
        diags.push({
          tipo:'aviso', emoji:'📐',
          titulo:'Te confundiste varias veces delimitando proposiciones',
          mensaje:'Pista: empieza por el verbo de cada proposición y ve añadiendo las palabras que dependen de él (su sujeto, sus complementos). El nexo casi nunca pertenece a ninguna proposición.'
        });
      }
    }

    // ── FASE 4 — CLASIFICAR ────────────────────────────────────────────
    if(eng.f4Respuestas.length > 0){
      const erroresTipo = eng.f4Respuestas.filter(r=>r && r.tipoOk === false).length;
      const erroresFamilia = eng.f4Respuestas.filter(r=>r && r.familiaOk === false).length;
      const erroresSubtipo = eng.f4Respuestas.filter(r=>r && r.subtipoOk === false).length;

      if(erroresTipo === 0 && erroresFamilia === 0 && erroresSubtipo === 0 && eng.f4Respuestas.some(r=>r && r.tipoOk === true)){
        diags.push({
          tipo:'ok', emoji:'✅',
          titulo:'Clasificaste cada proposición correctamente',
          mensaje:'Tipo, familia y subtipo: todo bien a la primera. Dominas la taxonomía.'
        });
      } else {
        if(erroresTipo >= 1){
          diags.push({
            tipo:'aviso', emoji:'🏷️',
            titulo:'Confundiste el tipo de alguna proposición',
            mensaje:'Recuerda: <b>principal</b> es la que «manda» y no depende de nadie. <b>Subordinada</b> hace una función dentro de otra (CD, CI, sujeto, complemento del nombre…). <b>Coordinada</b> está al mismo nivel que otra, unida por «y», «pero», «o». <b>Yuxtapuesta</b> también está al mismo nivel pero sin nexo, solo con coma o punto y coma.'
          });
        }
        if(erroresFamilia >= 1){
          diags.push({
            tipo:'aviso', emoji:'🌳',
            titulo:'Te confundiste con la familia de subordinada',
            mensaje:'Las <b>sustantivas</b> hacen función de SN (puedes sustituirlas por «esto», «eso»). Las <b>de relativo</b> complementan a un sustantivo, como un adjetivo. Las <b>construcciones</b> (antes adverbiales) expresan tiempo, causa, finalidad, condición, concesión, ilación.'
          });
        }
        if(erroresSubtipo >= 1){
          diags.push({
            tipo:'aviso', emoji:'🔖',
            titulo:'Algún subtipo no era el que pensabas',
            mensaje:'No te preocupes: distinguir subtipos exige práctica. Vuelve a las definiciones cuando puedas y prueba con otra oración similar.'
          });
        }
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
          mensaje:'Tipo de relación, dirección y función: todo en orden. Tienes muy claro cómo se articulan las proposiciones.'
        });
      } else {
        if(erroresTipoRel >= 1){
          diags.push({
            tipo:'aviso', emoji:'🔗',
            titulo:'Confundiste el tipo de relación',
            mensaje:'Recuerda: en la <b>subordinación</b> una proposición depende de otra y hace una función dentro de ella. En la <b>coordinación</b> están al mismo nivel unidas por un nexo. En la <b>yuxtaposición</b> también al mismo nivel pero sin nexo, solo con signos.'
          });
        }
        if(erroresDir >= 1){
          diags.push({
            tipo:'aviso', emoji:'➡️',
            titulo:'Te equivocaste con la dirección de la subordinación',
            mensaje:'En P1 → P2, P1 es la principal (la que rige) y P2 es la subordinada (la que depende). Pregúntate cuál de las dos podría existir sola.'
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

  // Tras el resumen: ir a la vista de análisis completo del ejercicio actual
  function verAnalisis(){
    state.modoLectura = true;
    state.solucionVisible = true;
    renderEjercicio();
  }

  // Siguiente ejercicio en modo práctica
  function siguientePractica(){
    if(state.idx < state.filtered.length - 1){
      state.idx++;
      iniciarFase0();
    }
  }


  // Abandonar el ejercicio actual y volver a filtros (sin perder estado del banco)
  function abandonar(){
    if(!confirmarSalidaExamen()) return;
    if(state.modoExamen) salirModoExamen();
    state.engine = null;
    state.modoLectura = false;
    renderFiltros();
  }

  // ─────────────────────────────────────────────────────────────────────
  // TOAST flotante animado.
  // Útil para celebrar el fin de una proposición/fase con un mensaje visible
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
        <span class="cp-meta-pill">${nprops} ${nprops===1?'proposición':'proposiciones'}</span>
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
        ${renderProposiciones(ej)}
        ${renderNexos(ej)}
        ${renderRelaciones(ej)}
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

  function renderProposiciones(ej){
    if(!Array.isArray(ej.proposiciones) || ej.proposiciones.length===0) return '';
    const labelMap = buildPropLabelMap(ej);
    const items = ej.proposiciones.map(p=>{
      const tipo = p.tipo || '?';
      const claseTipo = tipoToClase(tipo);
      const sub = p.subtipo ? etiquetaSubtipo(p.subtipo) : '';
      const fn = p.funcion ? etiquetaFuncion(p.funcion) : '';
      const ai = p.analisis_interno || {};
      const suj = ai.sujeto || {};
      const pred = ai.predicado || {};
      const funcs = Array.isArray(ai.funciones) ? ai.funciones : [];

      const verbo = (p.verbo && p.verbo.forma) ? p.verbo.forma : '?';
      const perif = (p.verbo && Array.isArray(p.verbo.indices_perifrasis) && p.verbo.indices_perifrasis.length>1)
        ? p.verbo.indices_perifrasis.map(i=>ej.tokens[i]?.texto||'').filter(Boolean).join(' ')
        : '';

      const sujText = suj.tipo==='lexico' ? (suj.indices||[]).map(i=>ej.tokens[i]?.texto||'').filter(Boolean).join(' ')
                    : suj.tipo==='tacito' ? '(tácito)'
                    : suj.tipo==='impersonal' ? '(impersonal)'
                    : '—';

      const funcsText = funcs.map(f=>{
        const txt = (f.indices||[]).map(i=>ej.tokens[i]?.texto||'').filter(Boolean).join(' ');
        return `${etiquetaFuncion(f.tipo||'')}${txt? ': «'+escHtml(txt)+'»': ''}`;
      }).join(' · ');

      return `
        <div class="cp-prop ${claseTipo}">
          <div class="cp-prop-header">
            <span class="cp-prop-id">${propLabel(p.id, labelMap)}</span>
            <span class="cp-prop-tipo">${etiquetaTipoProp(tipo)}${sub?' · '+escHtml(sub):''}${fn?' · '+escHtml(fn):''}</span>
          </div>
          <div class="cp-prop-text">«${escHtml(p.texto||'')}»</div>
          <div class="cp-prop-details">
            <b>Verbo:</b> ${escHtml(perif || verbo)}
            ${pred.tipo ? ` · <b>Predicado:</b> ${pred.tipo}` : ''}
            · <b>Sujeto:</b> ${escHtml(sujText)}
            ${funcsText ? `<br><b>Funciones del predicado:</b> ${funcsText}` : ''}
          </div>
        </div>`;
    }).join('');
    return `
      <div style="margin-bottom:8px">
        <div class="cp-list-title" style="margin-bottom:8px">Proposiciones (${ej.proposiciones.length})</div>
        <div class="cp-props-wrap">${items}</div>
      </div>`;
  }

  function renderNexos(ej){
    if(!Array.isArray(ej.nexos) || ej.nexos.length===0) return '';
    const items = ej.nexos.map(n=>{
      const cat = n.categoria || 'conjuncion';
      const funcInterna = n.funcion_interna ? ` <span style="color:var(--muted);font-size:.78rem">(función interna: ${escHtml(etiquetaFuncion(n.funcion_interna))})</span>` : '';
      return `<div class="cp-list-item"><b>«${escHtml(n.forma||'')}»</b> · ${escHtml(etiquetaCategoriaNexo(cat))}${funcInterna}</div>`;
    }).join('');
    return `
      <div class="cp-list-card">
        <div class="cp-list-title">Nexos (${ej.nexos.length})</div>
        ${items}
      </div>`;
  }

  function renderRelaciones(ej){
    if(!Array.isArray(ej.relaciones) || ej.relaciones.length===0) return '';
    const labelMap = buildPropLabelMap(ej);
    // Diccionario auxiliar para acceder a cada proposición por id rápidamente
    const propById = {};
    (ej.proposiciones||[]).forEach(p=>{ propById[p.id] = p; });

    const items = ej.relaciones.map((r, idx)=>{
      const tipo = r.tipo || '?';
      const propIds = Array.isArray(r.proposiciones) ? r.proposiciones : [];
      const labels = propIds.map(id=>propLabel(id, labelMap));

      // Símbolo según tipo de relación:
      //   subordinación  → P1 → P2  (la primera contiene/rige la segunda)
      //   coordinación   → P1 ↔ P2  (mismo nivel)
      //   yuxtaposición  → P1 ∥ P2  (mismo nivel, sin nexo)
      let separador = ' + ';
      if(tipo === 'subordinacion') separador = ' → ';
      else if(tipo === 'coordinacion') separador = ' ↔ ';
      else if(tipo === 'yuxtaposicion') separador = ' ∥ ';
      const esquema = labels.map(l=>`<b>${escHtml(l)}</b>`).join(separador);

      // Título: "Subordinación · Sustantiva de complemento directo"
      let tituloRel = '';
      if(tipo === 'subordinacion') tituloRel = '<b>Subordinación</b>';
      else if(tipo === 'coordinacion') tituloRel = '<b>Coordinación</b>';
      else if(tipo === 'yuxtaposicion') tituloRel = '<b>Yuxtaposición</b>';
      const sub = r.subtipo ? ` · ${escHtml(etiquetaSubtipoExtendida(r.subtipo))}` : '';

      // Redacción explícita en prosa.
      const explicacion = construirExplicacionRelacion(r, labelMap, propById, ej);

      return `
        <div class="cp-list-item">
          <div style="margin-bottom:6px">${idx+1}. ${tituloRel}${sub}: ${esquema}</div>
          <div style="color:var(--ink2);font-size:.85rem;line-height:1.55">${explicacion}</div>
        </div>`;
    }).join('');
    return `
      <div class="cp-list-card">
        <div class="cp-list-title">Relaciones entre proposiciones (${ej.relaciones.length})</div>
        ${items}
      </div>`;
  }

  // Devuelve la redacción explícita de una relación, en prosa completa,
  // sin abreviaturas, mencionando las funciones por su nombre largo.
  function construirExplicacionRelacion(r, labelMap, propById, ej){
    const tipo = r.tipo;
    const propIds = Array.isArray(r.proposiciones) ? r.proposiciones : [];
    if(propIds.length < 2) return '<i style="color:var(--muted)">Sin proposiciones suficientes.</i>';

    // Coordinación
    if(tipo === 'coordinacion'){
      const lbls = propIds.map(id=>propLabel(id, labelMap));
      const nexo = r.nexo ? obtenerFormaNexo(r.nexo, ej) : '';
      const enumPS = lbls.length === 2
        ? `Las proposiciones <b>${lbls[0]}</b> y <b>${lbls[1]}</b>`
        : `Las proposiciones ${lbls.map(l=>`<b>${l}</b>`).join(', ').replace(/, ([^,]+)$/, ' y $1')}`;
      const tipoCoord = r.subtipo ? etiquetaSubtipoExtendida(r.subtipo) : 'coordinación';
      const nexoStr = nexo ? ` mediante el nexo «${escHtml(nexo)}»` : '';
      return `${enumPS} están coordinadas (${escHtml(tipoCoord).toLowerCase()})${nexoStr}. Tienen el mismo nivel sintáctico: ninguna depende de la otra.`;
    }

    // Yuxtaposición
    if(tipo === 'yuxtaposicion'){
      const lbls = propIds.map(id=>propLabel(id, labelMap));
      const enumPS = lbls.length === 2
        ? `Las proposiciones <b>${lbls[0]}</b> y <b>${lbls[1]}</b>`
        : `Las proposiciones ${lbls.map(l=>`<b>${l}</b>`).join(', ').replace(/, ([^,]+)$/, ' y $1')}`;
      return `${enumPS} están yuxtapuestas. Se unen sin nexo, solo mediante signos de puntuación. Tienen el mismo nivel sintáctico.`;
    }

    // Subordinación: siempre binaria
    if(tipo === 'subordinacion'){
      const origenId  = r.direccion?.origen  || propIds[0];
      const destinoId = r.direccion?.destino || propIds[1];
      const origenLbl  = propLabel(origenId, labelMap);
      const destinoLbl = propLabel(destinoId, labelMap);
      const origenProp  = propById[origenId];
      const destinoProp = propById[destinoId];

      const descPS = descripcionPropTipo(destinoProp);
      const descPP = descripcionPropTipo(origenProp);

      // ¿Qué verbo de la principal rige la subordinada? Si la PP tiene un solo verbo, lo decimos.
      const verboPP = origenProp?.verbo?.forma || '';
      const verboStr = verboPP ? ` (del verbo «${escHtml(verboPP)}»)` : '';

      // Función de la PS: la describimos por su nombre largo
      const funcion = r.funcion || '';
      const funcionLargo = nombreLargoFuncion(funcion);

      // Caso especial: término de preposición + funcion_sp
      if(funcion === 'termino_preposicion' && r.funcion_sp){
        const funcSpLargo = nombreLargoFuncion(r.funcion_sp);
        return `La <b>${escHtml(descPS)}</b> (<b>${destinoLbl}</b>) es <b>término de la preposición</b> que la introduce. El sintagma preposicional completo funciona como <b>${escHtml(funcSpLargo)}</b>${verboStr} dentro de la ${escHtml(descPP)} (<b>${origenLbl}</b>).`;
      }

      // Caso construcciones (condicional, final, causal, concesiva)
      if(funcion.startsWith('construccion_')){
        const nombreConstr = funcion.replace('construccion_','');
        return `La <b>${escHtml(descPS)}</b> (<b>${destinoLbl}</b>) forma con la ${escHtml(descPP)} (<b>${origenLbl}</b>) una <b>construcción ${escHtml(nombreConstr)}</b>. Ambas se relacionan por dependencia, no por subordinación a una función argumental.`;
      }

      // Caso general
      if(funcion){
        return `La <b>${escHtml(descPS)}</b> (<b>${destinoLbl}</b>) funciona como <b>${escHtml(funcionLargo)}</b>${verboStr} dentro de la ${escHtml(descPP)} (<b>${origenLbl}</b>).`;
      }
      // Sin función explícita
      return `La <b>${escHtml(descPS)}</b> (<b>${destinoLbl}</b>) depende sintácticamente de la ${escHtml(descPP)} (<b>${origenLbl}</b>).`;
    }
    return '';
  }

  // Devuelve la forma textual del nexo dado su id, leyendo de ej.nexos
  function obtenerFormaNexo(nexoId, ej){
    if(!nexoId || !Array.isArray(ej.nexos)) return '';
    const n = ej.nexos.find(x=>x.id===nexoId);
    return n?.forma || '';
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
      'cc':'complemento circunstancial',
      'cc_temporal':'complemento circunstancial de tiempo',
      'cc_locativo':'complemento circunstancial de lugar',
      'cc_modal':'complemento circunstancial de modo',
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
      'atributo':'Atributo', 'cpvo':'CPvo',
      'c_regimen':'C. Régimen', 'c_agente':'C. Agente',
      'marca_pas_ref':'Marca Pas. Refleja', 'mod_oracional':'Mod. Oracional',
      'vocativo':'Vocativo', 'cc':'CC',
      'cc_temporal':'CC Temporal', 'cc_locativo':'CC Locativo',
      'cc_modal':'CC Modal', 'cc_comparativo':'CC Comparativo',
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
  function etiquetaTipoProp(t){
    return {
      'principal':'Principal',
      'subordinada':'Subordinada',
      'coordinada':'Coordinada',
      'yuxtapuesta':'Yuxtapuesta'
    }[t] || t;
  }
  function tipoToClase(t){
    return {
      'principal':'principal',
      'subordinada':'subordinada',
      'coordinada':'coordinada',
      'yuxtapuesta':'yuxtapuesta'
    }[t] || '';
  }
  function etiquetaTipoRelacion(t){
    return {
      'subordinacion':'<b>Subordinación</b>',
      'coordinacion':'<b>Coordinación</b>',
      'yuxtaposicion':'<b>Yuxtaposición</b>'
    }[t] || t;
  }
  function etiquetaCategoriaNexo(c){
    return {
      'conjuncion':'conjunción',
      'pronombre_relativo':'pronombre relativo',
      'locucion_conjuntiva':'locución conjuntiva',
      'puntuacion':'signo de puntuación'
    }[c] || c;
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
    iniciarPractica, iniciarLectura,
    limpiarFiltros,
    siguiente, anterior, volverFiltros, toggleSolucion,
    avanzarFase, avanzarPropF4, avanzarRelacionF5, pedirPista, saltarFase,
    iniciarAnalisisInterno, irAResumen,
    onInternaPredBtn, onInternaSujBtn, onInternaFuncBtn, avanzarInternaSubPaso,
    entrarModoExamen, cancelarPIN, validarPIN,
    enviarResultadoExamen, salirTrasEnvio,
    verAnalisis, siguientePractica, abandonar,
    guardarManual,
    reintentar,
    _state: state
};

if (typeof window !== 'undefined') window.CP = CP;
