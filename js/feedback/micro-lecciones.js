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
  }
};

// Map syntax function errors to micro-lessons
export const ERROR_TO_LECCION = {
  'CD': 'cd_ci', 'CI': 'cd_ci',
  'C.Ag.': 'pasivas', 'Marca.Pas.Ref.': 'pasivas', 'Marca.Imp.': 'impersonales',
  'Atr.': 'atr_cpvo', 'CPvo': 'atr_cpvo', 'PN': 'atr_cpvo', 'PV': 'atr_cpvo',
  'C.Rég.': 'regimen_cc',
  'CC Tiempo': 'regimen_cc', 'CC Lugar': 'regimen_cc', 'CC Modo': 'regimen_cc', 'CC Causa': 'regimen_cc', 'CC': 'regimen_cc',
};
