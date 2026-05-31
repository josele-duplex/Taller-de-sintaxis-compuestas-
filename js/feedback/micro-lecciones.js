/* micro-lecciones.js — Lecciones cortas + mapeo error -> leccion
   Extraido de index.html (Paso 7 de la migracion, mayo 2026)
   Lineas originales: 4524, 4526-4677, 4680-4686. */

export const ML_THRESHOLD = 3; // errors before suggesting micro-lesson

export const MICRO_LECCIONES = {
  'cd_ci': {
    tag: 'Lección · CD y CI',
    titulo: 'El Arquero, la Diana y el Beneficiario',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🎯</div>
            <strong style="color:#1D4ED8">CD — La Diana</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">Recibe directamente la acción del verbo. Se sustituye por <strong>lo/la/los/las</strong>.</p>
          </div>
          <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">👑</div>
            <strong style="color:#92400E">CI — El Beneficiario</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#78350F">A quién afecta la acción. Se sustituye por <strong>le/les</strong>. Siempre con la preposición <em>a</em>.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.88rem;font-style:italic;border-left:3px solid #6366F1">
          "El detective <strong>escondió</strong> <u>la carta</u> <span style="color:#1D4ED8;font-weight:800">CD</span>. Después, <strong>le</strong> <span style="color:#92400E;font-weight:800">CI</span> <strong>entregó</strong> <u>un sobre falso</u> <span style="color:#1D4ED8;font-weight:800">CD</span> al sospechoso."
        </div>
      `},
      {tipo:'quiz', pregunta:'«María cantó <u>una ópera</u> anoche.» ¿Qué función tiene "una ópera"?',
        opciones:['Sujeto','CD — es lo que cantó','CI — es a quién cantó','CC Modo'],
        correcta:1,
        explicacion:'Se sustituye por «la cantó». La ópera es el objeto directo de la acción de cantar.'},
      {tipo:'quiz', pregunta:'«El pirata le robó el mapa al capitán.» ¿Qué función tiene "al capitán"?',
        opciones:['CD — recibe la acción','CI — es el perjudicado','Sujeto','CC Lugar'],
        correcta:1,
        explicacion:'Se sustituye por «le». El capitán es quien sufre el robo (beneficiario/perjudicado). El mapa es el CD.'},
      {tipo:'quiz', pregunta:'En «Saludó a las nuevas vecinas», ¿qué función desempeña "a las nuevas vecinas"?',
        opciones:['CI — son las destinatarias del saludo','CD — prueba del género: "Las saludó"','C.Rég. — la preposición la exige el verbo','Sujeto'],
        correcta:1,
        explicacion:'Aplica la prueba del género: "a las nuevas vecinas" → "Las saludó". El pronombre es LAS (no LES), así que es CD de persona introducido por la preposición "a".'},
    ]
  },
  'pasivas': {
    tag: 'Lección · Pasivas',
    titulo: 'El arte de ocultar al culpable',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">📰</div>
            <strong style="color:#92400E">Pasiva Perifrástica</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#78350F"><strong>SER + participio</strong>. El culpable puede aparecer con «por»: el C. Agente.</p>
          </div>
          <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🕵️</div>
            <strong style="color:#991B1B">Pasiva Refleja</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#991B1B"><strong>SE + verbo 3.ª p.</strong> El culpable desaparece. El verbo concuerda con el sujeto paciente.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          ① <em>"El gobierno <strong>destruyó</strong> los documentos."</em> — Activa: culpable visible<br>
          ② <em>"Los documentos <strong>fueron destruidos</strong> por el gobierno."</em> — Perifrástica: C. Agente al final<br>
          ③ <em>"<strong>Se destruyeron</strong> los documentos."</em> — Refleja: culpable borrado
        </div>
      `},
      {tipo:'quiz', pregunta:'«Se venden pisos en el centro.» ¿Qué tipo de oración es?',
        opciones:['Activa','Pasiva perifrástica','Pasiva refleja — "pisos" concuerda con el verbo','Impersonal'],
        correcta:2,
        explicacion:'El verbo "venden" concuerda en plural con "pisos" (sujeto paciente). El "se" es marca de pasiva refleja.'},
      {tipo:'quiz', pregunta:'En «Los documentos fueron destruidos por el gobierno», ¿qué función tiene "por el gobierno"?',
        opciones:['CC Causa','CC Modo','C. Agente — ejecutor real de la acción','C. Régimen'],
        correcta:2,
        explicacion:'En voz pasiva (ser + participio), el sintagma con "por" que indica quién realizó la acción es el Complemento Agente.'},
      {tipo:'quiz', pregunta:'«Se buscan actores para la película.» ¿Qué tipo de oración es?',
        opciones:['Impersonal con "se" — no hay sujeto','Pasiva refleja — "actores" concuerda con el verbo','Activa transitiva','Pasiva perifrástica — lleva "ser + participio"'],
        correcta:1,
        explicacion:'Pasa el verbo a singular: "Se busca actor". "Actor" concuerda con "busca". Ese cambio obligado confirma que "actores" es el Sujeto Paciente. Es pasiva refleja.'},
    ]
  },
  'atr_cpvo': {
    tag: 'Lección · Atributo y CPvo',
    titulo: 'El Espejo y la Fotografía en Movimiento',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🪞</div>
            <strong style="color:#1D4ED8">Atributo — El Espejo</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">Solo con <strong>ser, estar, parecer</strong>. Funciona como un «=» entre sujeto y cualidad. Se sustituye por <strong>lo</strong>.</p>
          </div>
          <div style="background:#FFF7ED;border:2px solid #FDBA74;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">📸</div>
            <strong style="color:#9A3412">CPvo — La Foto en Movimiento</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#9A3412">Con verbos de <strong>acción</strong>. Doble cara: dice «cómo» pero <strong>concuerda</strong> con el sujeto en género y número.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          🪞 "Ana <strong>está</strong> <u>contenta</u>." → Atributo (verbo copulativo, se sustituye por «lo está»)<br>
          📸 "Ana <strong>llegó</strong> <u>contenta</u>." → CPvo (verbo de acción + concuerda con Ana)
        </div>
      `},
      {tipo:'quiz', pregunta:'«Los atletas llegaron exhaustos a la meta.» ¿Qué función tiene "exhaustos"?',
        opciones:['Atributo — con verbo copulativo','CC Modo — responde a «cómo»','CPvo — acción + concordancia con sujeto','CD'],
        correcta:2,
        explicacion:'"Llegar" es verbo de acción (no copulativo). "Exhaustos" concuerda con "los atletas" (masculino plural) y describe cómo llegaron. Es CPvo.'},
      {tipo:'quiz', pregunta:'«Los alumnos regresaron cansados de la excursión.» ¿Qué función tiene "cansados"?',
        opciones:['Atributo — con verbo copulativo','CC Modo — responde a «¿cómo?» y es invariable','CPvo — verbo de acción y concuerda con el sujeto','CD'],
        correcta:2,
        explicacion:'"Regresar" es verbo de acción. "Cansados" concuerda con "los alumnos" (plural masculino): si fueran alumnas, diríamos "cansadas". Esa concordancia obligatoria lo confirma como CPvo.'},
      {tipo:'quiz', pregunta:'«Marta es la jefa.» ¿Por qué "la jefa" es Atributo y no CD?',
        opciones:['Porque va detrás del verbo','Porque se sustituye por el pronombre neutro "LO" («Marta LO es»)','Porque es un sintagma nominal','Porque el verbo es transitivo'],
        correcta:1,
        explicacion:'En oraciones copulativas, el Atributo se identifica sustituyendo por el pronombre invariable "LO". "Marta LO es" funciona. Un CD se sustituiría por lo/la con género, lo que no se puede aquí.'},
    ]
  },
  'regimen_cc': {
    tag: 'Lección · Régimen y CC',
    titulo: 'El Ancla y el Decorado',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">⚓</div>
            <strong style="color:#991B1B">C. Régimen — El Ancla</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#991B1B">El verbo <strong>exige</strong> esa preposición. Si la quitas, la frase se rompe.</p>
            <p style="font-size:.78rem;color:#DC2626;margin-top:4px"><em>depender DE, pensar EN, soñar CON, fiarse DE, renunciar A</em></p>
          </div>
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🎨</div>
            <strong style="color:#1D4ED8">CC — El Decorado</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">Tú decides añadirlo. <strong>Prescindible y móvil.</strong> Responde a cuándo, dónde, cómo, por qué…</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          ⚓ "No me fío <strong>de</strong> nadie." → quita «de nadie» → *"No me fío" 🚫 (se rompe = Régimen)<br>
          🎨 "Estudié <strong>por la noche</strong>." → quita «por la noche» → "Estudié" ✓ (sobrevive = CC)
        </div>
      `},
      {tipo:'quiz', pregunta:'«Mi hermano se acostumbró al clima rápidamente.» ¿"al clima" es C. Régimen o CC?',
        opciones:['CC Lugar','CC Modo','C. Régimen — «acostumbrarse A» exige la preposición','CD'],
        correcta:2,
        explicacion:'El verbo «acostumbrarse» exige la preposición «a». Sin ella: *"se acostumbró" queda incompleto. Es C. Régimen.'},
      {tipo:'quiz', pregunta:'«Confío en tu palabra.» ¿"en tu palabra" es C. Régimen o CC?',
        opciones:['CC Lugar — responde a «¿dónde?»','CC Modo — expresa la manera de confiar','C. Régimen — «confiar EN» exige esa preposición por contrato','CD — se puede sustituir por «lo»'],
        correcta:2,
        explicacion:'Sustituye el término por "eso": "Confío en ESO". La preposición "en" se queda pegada al verbo y no puede eliminarse. El verbo "confiar" la exige por contrato. Es C. Régimen.'},
    ]
  },
  'impersonales': {
    tag: 'Lección · Impersonales y Pasiva Refleja',
    titulo: 'El Actor Invisible',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#F0FDF4;border:2px solid #86EFAC;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🕵️</div>
            <strong style="color:#166534">Pasiva Refleja</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#166534">SÍ tiene sujeto paciente que <strong>concuerda</strong> con el verbo.<br>«Se vende<strong>n</strong> piso<strong>s</strong>» → pisos = sujeto</p>
          </div>
          <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">👻</div>
            <strong style="color:#991B1B">Impersonal con «se»</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#991B1B">NO tiene sujeto. Verbo fijo en 3.ª persona <strong>singular</strong>.<br>«Se come bien aquí» → ¿quién? nadie concreto</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          <strong>La prueba:</strong> pasa el verbo a plural.<br>
          ✅ "Se vende<strong>n</strong> pisos" → «pisos» reacciona = Pasiva Refleja (hay sujeto)<br>
          🚫 "Se vive bien aquí" → *"Se vive<strong>n</strong>" imposible = Impersonal (no hay sujeto)
        </div>
      `},
      {tipo:'quiz', pregunta:'«En este restaurante se come de maravilla.» ¿Pasiva refleja o impersonal?',
        opciones:['Pasiva refleja — "de maravilla" es el sujeto','Impersonal — no hay sujeto, verbo fijo en singular','Activa — el sujeto está omitido','Pasiva perifrástica'],
        correcta:1,
        explicacion:'No hay ningún sustantivo que concuerde con el verbo. "Se come" queda fijo en 3ª singular. Es impersonal: el «se» borra al agente.'},
    ]
  },
  // ── Lecciones nuevas añadidas mayo 2026 ──────────────────────────────────
  'sujeto': {
    tag: 'Lección · El Sujeto',
    titulo: 'El Imán del Verbo',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:14px">
          <div style="background:#F0FDF4;border:2px solid #86EFAC;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🧲</div>
            <strong style="color:#166534">Sujeto — el sintagma nominal que 'manda' sobre el verbo</strong>
            <ul style="font-size:.82rem;margin:8px 0 0;color:#14532D;padding-left:16px">
              <li><strong>La marca de oro:</strong> concuerda en número y persona con el verbo.</li>
              <li><strong>El supertruco:</strong> cambia el verbo a plural. El elemento <em>obligado</em> a cambiar es el Sujeto.</li>
              <li><strong>Prohibición técnica:</strong> el Sujeto <em>nunca</em> lleva preposición delante.</li>
            </ul>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          🧲 <em>"Me <strong>gusta</strong> <u>la cocina tradicional</u>."</em><br>
          → Pasa el verbo a plural (<em>"gustan"</em>): "la cocina" → "las cocinas". Ese cambio forzoso señala al Sujeto.<br>
          <span style="color:#DC2626;font-size:.8rem">⚠ Nunca busques el sujeto preguntando «¿quién?»: te llevará a error en verbos como <em>gustar</em> o <em>encantar</em>.</span>
        </div>
      `},
      {tipo:'quiz', pregunta:'En «A mis primos les encantan las películas de terror», ¿qué función tiene "las películas de terror"?',
        opciones:['CI — son quienes «encantan»','Sujeto — concuerda con el verbo en número','CD — recibe la acción','CC Modo'],
        correcta:1,
        explicacion:'Si pasamos el verbo a singular ("encanta"), "las películas" debe cambiar a "la película". Ese cambio obligado confirma que es el Sujeto. El verbo gustar construye sujeto léxico que no coincide con «yo».'},
      {tipo:'quiz', pregunta:'En «Ana, trae las llaves», ¿qué función tiene "Ana"?',
        opciones:['Sujeto — realiza la acción de traer','Vocativo — apelación al interlocutor marcada por la coma','Atributo','CD'],
        correcta:1,
        explicacion:'El verbo "trae" está en 2.ª persona del imperativo y "Ana" es 3.ª persona: no concuerdan, así que no puede ser el Sujeto. Es Vocativo: llamada de atención al interlocutor, función extraoracional marcada por la coma.'},
    ]
  },
  'pn_pv': {
    tag: 'Lección · PN y PV',
    titulo: 'El Puente y el Motor',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🌉</div>
            <strong style="color:#1D4ED8">PN — El Puente</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">Verbos <strong>copulativos</strong> (<em>ser, estar, parecer</em>). No indican acción: conectan al sujeto con una cualidad o estado.</p>
            <p style="font-size:.78rem;color:#3B82F6;margin-top:4px">Lo esencial es el <strong>Atributo</strong>, no el verbo.</p>
          </div>
          <div style="background:#FFF7ED;border:2px solid #FDBA74;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">⚡</div>
            <strong style="color:#9A3412">PV — El Motor</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#9A3412">Verbo con <strong>significado pleno</strong> de acción o proceso (<em>comer, saltar, estudiar</em>).</p>
            <p style="font-size:.78rem;color:#EA580C;margin-top:4px">El verbo es el <strong>motor real</strong> de la frase.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          🌉 <em>"Ana <strong>está</strong> <u>contenta</u>."</em> → PN (<em>estar</em> = copulativo; el peso recae en "contenta" = Atributo)<br>
          ⚡ <em>"Ana <strong>come</strong> <u>la tarta</u>."</em> → PV (<em>comer</em> = acción real; el verbo es el motor)
        </div>
      `},
      {tipo:'quiz', pregunta:'«El cielo está despejado esta tarde.» ¿Qué tipo de predicado tiene?',
        opciones:['PV — "estar" expresa una acción','PN — "estar" es copulativo y "despejado" es el Atributo','PN — "esta tarde" es el Atributo','PV — hay un CD expreso'],
        correcta:1,
        explicacion:'"Estar" es verbo copulativo. La información principal recae en "despejado" (Atributo). Prueba: "El cielo lo está" → el "lo" sustituye a "despejado". Es Predicado Nominal.'},
      {tipo:'quiz', pregunta:'«Los niños juegan en el parque.» ¿Qué tipo de predicado tiene?',
        opciones:['PN — "jugar" es copulativo','PV — "jugar" tiene significado pleno de acción','PN — "en el parque" es el Atributo','PV — porque hay un CC Lugar'],
        correcta:1,
        explicacion:'"Jugar" no pertenece al grupo de los copulativos (ser, estar, parecer). Tiene significado pleno de acción. El verbo es el motor de la frase. Es Predicado Verbal.'},
    ]
  },
  'cc_finalidad': {
    tag: 'Lección · CC Finalidad',
    titulo: '¿Para qué? El propósito de la acción',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🎯</div>
            <strong style="color:#92400E">CC Finalidad</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#78350F">Sintagma <strong>preposicional</strong> que expresa el <strong>propósito</strong> de la acción. Introducido sobre todo por <em>para</em> (y por <em>a</em> con verbos de movimiento).</p>
            <p style="font-size:.78rem;color:#B45309;margin-top:4px">Responde a <strong>¿para qué?</strong></p>
          </div>
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🧪</div>
            <strong style="color:#1D4ED8">Pruebas</strong>
            <ul style="font-size:.82rem;margin:6px 0 0;color:#1E40AF;padding-left:16px">
              <li>Se sustituye por <strong>«para eso»</strong> o «para ello».</li>
              <li>Es <strong>prescindible</strong>: si lo quitas, la oración sigue siendo gramatical.</li>
              <li>OJO con «para» + persona → no es CI, es CC Finalidad.</li>
            </ul>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          🎯 <em>"Ahorra dinero <strong>para el viaje</strong>."</em> → quita el SP → "Ahorra dinero" ✓ (adjunto prescindible)<br>
          🎯 <em>"Encargó una tarta <strong>para su madre</strong>."</em> → «para su madre» = CC Finalidad (no CI, no lleva «le»)
        </div>
      `},
      {tipo:'quiz', pregunta:'En «Estudió mucho para el examen de conducir», ¿qué función tiene "para el examen de conducir"?',
        opciones:['Complemento Indirecto (CI)','Complemento de Régimen (C.Rég.)','CC Finalidad — indica el propósito de estudiar','Atributo'],
        correcta:2,
        explicacion:'"Para el examen" expresa el propósito (¿para qué estudia?) y es prescindible: "Estudió mucho" sigue siendo gramatical. Sustituye por "para eso". Es CC Finalidad.'},
      {tipo:'quiz', pregunta:'¿Cuál de estas oraciones contiene un CC Finalidad introducido por la preposición "a"?',
        opciones:['Saludó a su nuevo profesor','Vino a la entrega de diplomas','Entregó el regalo a su hermano','Llegó a las ocho'],
        correcta:1,
        explicacion:'Con verbos de movimiento, la preposición "a" puede introducir la meta/propósito de la acción. "Vino a la entrega" responde a "¿a qué vino?". En las otras: "a su nuevo profesor" es CD (persona), "a su hermano" es CI, "a las ocho" es CC Tiempo.'},
      {tipo:'quiz', pregunta:'En «Compró guantes para el frío», ¿por qué "para el frío" es CC y no un argumento del verbo?',
        opciones:['Porque el verbo "comprar" lo exige por contrato','Porque es una circunstancia opcional: "Compró guantes" sigue siendo correcto','Porque funciona como Sujeto','Porque lleva preposición'],
        correcta:1,
        explicacion:'Los complementos circunstanciales son adjuntos periféricos y prescindibles. La prueba decisiva es la supresión: si la oración sigue siendo gramatical sin el sintagma, no es argumento.'},
    ]
  },
  'cc_causa': {
    tag: 'Lección · CC Causa',
    titulo: '¿Por qué? El motivo de la acción',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🌧️</div>
            <strong style="color:#991B1B">CC Causa</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#991B1B">Sintagma preposicional que expresa el <strong>motivo, razón o causa</strong> del evento. Es <strong>prescindible</strong>.</p>
            <p style="font-size:.78rem;color:#DC2626;margin-top:4px">Preposiciones: <strong>por</strong> (la más frecuente), <em>de</em> (con sentimientos extremos), <em>con</em>, <em>ante</em>.</p>
          </div>
          <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">⚠️</div>
            <strong style="color:#92400E">No confundir con C. Agente</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#78350F">Ambos pueden empezar por <em>por</em>. El <strong>C. Agente</strong> es el ejecutor real en una pasiva perifrástica (ser + participio) y se convierte en sujeto al pasar a activa. El <strong>CC Causa</strong> solo explica el motivo, no ejecuta nada.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          🌧️ <em>"No salimos <strong>por la lluvia</strong>."</em> → motivo, no ejecutor → CC Causa (sustituye por "por eso").<br>
          🕵️ <em>"Fue arrestado <strong>por la policía</strong>."</em> → pasiva, la policía ejecuta → C. Agente (al pasar a activa: "La policía lo arrestó").<br>
          😱 <em>"Saltaba <strong>de alegría</strong>."</em> → causa extrema con preposición «de».
        </div>
      `},
      {tipo:'quiz', pregunta:'En «Muchos ciudadanos sufren por la crisis económica», ¿qué función tiene "por la crisis económica"?',
        opciones:['Complemento de Régimen (C.Rég.)','CC Causa — indica el motivo del sufrimiento','Complemento Agente (C.Ag.)','Atributo'],
        correcta:1,
        explicacion:'"Sufrir" no es pasiva perifrástica (no hay ser + participio), así que no puede ser C. Agente. "Por la crisis" explica el motivo del sufrimiento ("¿por qué sufren?"). Se sustituye por "por eso". Es CC Causa.'},
      {tipo:'quiz', pregunta:'¿En cuál de estas oraciones el sintagma subrayado es un CC Causa introducido por la preposición "de"?',
        opciones:['La mesa es de madera','Me acuerdo de tu hermano','Casi me desmayo del susto','Vengo de la biblioteca'],
        correcta:2,
        explicacion:'En "Casi me desmayo del susto", la preposición "de" introduce la causa extrema del desmayo. Sustituye por "por ese motivo": "Casi me desmayo por ese motivo". En las otras: "de madera" es CN (de qué material), "de tu hermano" es C.Rég. (acordarse exige "de"), "de la biblioteca" es CC Lugar.'},
      {tipo:'quiz', pregunta:'En «Lo regañaron por perezoso», ¿por qué "por perezoso" es CC Causa?',
        opciones:['Porque es exigido por el verbo "regañar" por contrato','Porque explica la razón de la acción y es prescindible: "Lo regañaron" sigue siendo gramatical','Porque indica quién realiza la acción en pasiva','Porque sustituye al CD'],
        correcta:1,
        explicacion:'Es un adjunto periférico y prescindible que aporta el motivo de la reprimenda. "Lo regañaron" sigue siendo correcto sin él. No es pasiva perifrástica (no hay ser+participio), así que no puede ser C. Agente.'},
    ]
  },
  'cc_cantidad': {
    tag: 'Lección · CC Cantidad',
    titulo: '¿Cuánto? Grado, medida e intensidad',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#F0FDF4;border:2px solid #86EFAC;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">📏</div>
            <strong style="color:#166534">CC Cantidad (adjunto)</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#14532D">Mide la <strong>intensidad o grado</strong> del verbo. Es <strong>opcional</strong>: si lo quitas, el verbo conserva su sentido pleno.</p>
            <p style="font-size:.78rem;color:#16A34A;margin-top:4px">Adverbios: <em>mucho, poco, bastante</em>… | SN: <em>dos veces, un montón</em> | SP: <em>en buena medida</em></p>
          </div>
          <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">⚖️</div>
            <strong style="color:#991B1B">Argumento cuantitativo (CD)</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#991B1B">Algunos verbos (<em>medir, pesar, costar, durar</em>) <strong>exigen</strong> la cantidad. Sin ella la frase se rompe: <em>*"El paquete pesa"</em>.</p>
            <p style="font-size:.78rem;color:#DC2626;margin-top:4px">La NGLE los analiza como <strong>Complemento Directo</strong>.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          📏 <em>"Entrena <strong>mucho</strong>."</em> → "Entrena" ✓ (adjunto opcional → CC Cantidad)<br>
          ⚖️ <em>"El paquete pesa <strong>diez kilos</strong>."</em> → *"El paquete pesa" 🚫 (argumento exigido → CD)
        </div>
      `},
      {tipo:'quiz', pregunta:'En «Los excursionistas caminaron bastante por la mañana», ¿qué función tiene "bastante"?',
        opciones:['Complemento Directo (CD)','CC Cantidad — indica la intensidad de caminar','Atributo','Sujeto'],
        correcta:1,
        explicacion:'El adverbio "bastante" indica la medida o intensidad de la acción y es prescindible: "Los excursionistas caminaron por la mañana" sigue siendo gramatical. Responde a "¿cuánto?". Es CC Cantidad.'},
      {tipo:'quiz', pregunta:'¿En cuál de estas oraciones el segmento subrayado es CC Cantidad y NO CD?',
        opciones:['La película dura dos horas','Esta bicicleta cuesta cien euros','Disfruté mucho con tu visita','El paquete pesa diez kilos'],
        correcta:2,
        explicacion:'En las otras tres, los verbos de medida (durar, costar, pesar) exigen el argumento cuantitativo: si lo quitas la frase se rompe. La NGLE los analiza como CD. En "Disfruté mucho", "mucho" es opcional ("Disfruté con tu visita" sigue siendo correcto) y responde a "¿cuánto?". Es CC Cantidad.'},
      {tipo:'quiz', pregunta:'En «Grita una barbaridad», ¿por qué "una barbaridad" es CC Cantidad y no CD?',
        opciones:['Porque es un SN definido','Porque concuerda en género con el sujeto','Porque indica un grado extremo de la acción y se puede eliminar: "Grita" sigue siendo correcto','Porque es el ejecutor de la acción'],
        correcta:2,
        explicacion:'"Una barbaridad" funciona aquí como locución adverbial de sentido cuantitativo (≈ "muchísimo"). Es un grupo nominal que actúa como adjunto del verbo: prescindible y responde a "¿cuánto grita?".'},
    ]
  },
  'vocativo': {
    tag: 'Lección · Vocativo',
    titulo: 'Ana, escucha: la llamada al interlocutor',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#FFF7ED;border:2px solid #FDBA74;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">📣</div>
            <strong style="color:#9A3412">Vocativo</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#9A3412">Función <strong>extraoracional</strong>: no forma parte del sujeto ni del predicado. Sirve para <strong>apelar al interlocutor</strong>.</p>
            <p style="font-size:.78rem;color:#C2410C;margin-top:4px">Suele ser un <strong>sintagma nominal</strong>. En la escritura aparece <strong>aislado por comas</strong>.</p>
          </div>
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🆚</div>
            <strong style="color:#1D4ED8">No confundir con Sujeto</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">El sujeto <strong>siempre concuerda</strong> con el verbo en número y persona. El vocativo <strong>no</strong>.</p>
            <p style="font-size:.78rem;color:#3B82F6;margin-top:4px">"Juan, ven": Juan es 3.ª persona; "ven" es 2.ª persona. No hay concordancia → no es sujeto.</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          📣 <em>"<strong>Ana</strong>, trae las llaves."</em> → vocativo al inicio (apelación)<br>
          📣 <em>"Trae las llaves, <strong>Ana</strong>."</em> → vocativo al final (mismo papel)<br>
          📣 <em>"Trae, <strong>Ana</strong>, las llaves."</em> → vocativo en medio, siempre entre comas
        </div>
      `},
      {tipo:'quiz', pregunta:'En «Camarero, tráiganos la cuenta», ¿qué función tiene "Camarero"?',
        opciones:['Sujeto — quien hace la acción','Vocativo — apelación al interlocutor, aislado por coma','Complemento Directo','Atributo'],
        correcta:1,
        explicacion:'"Tráiganos" es 3.ª persona de cortesía con sujeto tácito (usted/ustedes). "Camarero" no concuerda con el verbo y está aislado por una coma: es una llamada, no el sujeto. Es vocativo.'},
      {tipo:'quiz', pregunta:'En «Niños, quedaos quietos», ¿por qué "Niños" NO es el sujeto?',
        opciones:['Porque es un sintagma preposicional','Porque es una función extraoracional de llamada; el sujeto real está tácito (Ø Vosotros)','Porque funciona como Atributo','Porque va antes del verbo'],
        correcta:1,
        explicacion:'El vocativo sirve para llamar la atención; el sujeto rige la terminación del verbo. "Quedaos" es 2.ª del plural → sujeto tácito "Vosotros". "Niños" no es ese sujeto: es la apelación.'},
      {tipo:'quiz', pregunta:'¿Qué marca gráfica permite identificar al vocativo en un texto escrito?',
        opciones:['Un punto y seguido detrás del nombre','La ausencia total de signos','Una o varias comas que lo aíslan del resto','Mayúscula inicial'],
        correcta:2,
        explicacion:'El vocativo se aísla mediante comas para señalar que es una apelación fuera de la estructura predicativa principal. Esa coma es la marca decisiva para distinguirlo de un posible sujeto.'},
    ]
  },
  'reflexivos': {
    tag: 'Lección · Reflexivos y Dativos',
    titulo: 'Me, Te, Se: ¿Argumento o Matiz?',
    bloques: [
      {tipo:'concepto', html:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">🔄</div>
            <strong style="color:#1D4ED8">Reflexivo / Recíproco</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">El sujeto realiza <em>y recibe</em> la acción (reflexivo) o dos sujetos la intercambian (recíproco).</p>
            <p style="font-size:.78rem;color:#3B82F6;margin-top:4px">CD: <em>"Yo me lavo."</em> | CI: <em>"Yo me lavo <u>las manos</u>."</em></p>
          </div>
          <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:12px;padding:14px">
            <div style="font-size:1.3rem;margin-bottom:4px">✨</div>
            <strong style="color:#92400E">Dativo Ético / Aspectual</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#78350F">Pronombre que añade énfasis o matiz afectivo. <strong>No es argumento</strong>: si lo eliminas, la oración sigue siendo gramatical.</p>
            <p style="font-size:.78rem;color:#B45309;margin-top:4px"><em>"Se comió la tarta"</em> → <em>"Comió la tarta"</em> ✓ (solo pierde énfasis)</p>
          </div>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          <strong>La prueba del borrado:</strong> ¿Puedes quitar el pronombre y la oración sigue siendo gramatical con los mismos participantes?<br>
          ✅ Sí → es <strong>Dativo</strong> (ético o aspectual) &nbsp;|&nbsp; ❌ No → es <strong>reflexivo</strong> (CD o CI)
        </div>
      `},
      {tipo:'quiz', pregunta:'En «Se leyó el manual entero», ¿qué función tiene "se"?',
        opciones:['Marca de Pasiva Refleja — "el manual" es sujeto paciente','CI — destinatario de la lectura','Dativo Aspectual — añade énfasis de totalidad; "Leyó el manual" sigue siendo gramatical','Reflexivo CD — el sujeto recibe la acción'],
        correcta:2,
        explicacion:'Si suprimimos "se": "Leyó el manual" es perfectamente gramatical con el mismo significado. El "se" solo añade un matiz de completitud o énfasis. No es CI argumental ni reflexivo. Es Dativo aspectual.'},
      {tipo:'quiz', pregunta:'«Marina se peina cada mañana.» ¿Qué función tiene "se"?',
        opciones:['Dativo ético — añade énfasis','Reflexivo CD — Marina recibe la acción de peinarse a sí misma','Marca de Pasiva Refleja','CI — destinataria del peinado'],
        correcta:1,
        explicacion:'Marina realiza la acción de peinar Y la recibe sobre sí misma. Si quitamos "se": *"Marina peina" queda incompleto sin objeto. El "se" es argumento obligatorio: reflexivo en función de CD.'},
    ]
  }
};

// Map syntax function errors to micro-lessons
export const ERROR_TO_LECCION = {
  'CD': 'cd_ci', 'CI': 'cd_ci',
  'Sujeto': 'sujeto',
  // Vocativo tiene leccion propia desde mayo 2026 (antes iba a 'sujeto').
  'Vocativo': 'vocativo', 'Vocat.': 'vocativo',
  'PN': 'pn_pv', 'PV': 'pn_pv',                      // antes apuntaban a atr_cpvo (incorrecto)
  'Dativo': 'reflexivos',
  'C.Ag.': 'pasivas', 'Marca.Pas.Ref.': 'pasivas', 'Marca.Imp.': 'impersonales',
  'Atr.': 'atr_cpvo', 'CPvo': 'atr_cpvo',
  'C.Rég.': 'regimen_cc',
  // Lecciones especificas para CC (antes todas iban al 'regimen_cc' generico).
  'CC Finalidad': 'cc_finalidad',
  'CC Causa': 'cc_causa',
  'CC Cantidad': 'cc_cantidad',
  // El resto de CC sin leccion propia se queda en el generico de Regimen vs CC.
  'CC Tiempo': 'regimen_cc', 'CC Lugar': 'regimen_cc', 'CC Modo': 'regimen_cc',
  'CC Compañía': 'regimen_cc', 'CC Instrumento': 'regimen_cc',
  'CC': 'regimen_cc',
};
