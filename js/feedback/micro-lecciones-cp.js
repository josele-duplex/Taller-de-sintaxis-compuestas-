/* micro-lecciones-cp.js — Lecciones cortas para el módulo de oraciones compuestas
   Creado en Fase 1.2 (mayo 2026) a partir de docs/TARJETAS_DIDACTICAS_CP.md.

   Análogo a MICRO_LECCIONES (módulo de simples), pero con contenido NGLE
   para los errores típicos de clasificación de proposiciones compuestas.

   Estructura idéntica a MICRO_LECCIONES:
     id → { tag, titulo, bloques: [{tipo:'concepto', html} | {tipo:'quiz', ...}] }

   ERROR_TO_LECCION_CP mapea los IDs internos de CP (sustantiva_cd,
   relativa_libre, copulativa, etc.) a IDs de lección. Cuando un alumno
   acumule >= ML_THRESHOLD errores en una misma categoría, la UI le
   ofrecerá la lección correspondiente. */

export const MICRO_LECCIONES_CP = {

  // ════════════════════════════════════════════════════════════════
  // Lección 1: Coordinación
  // ════════════════════════════════════════════════════════════════
  'coordinacion': {
    tag: 'Lección · Coordinación',
    titulo: 'Juntas pero independientes',
    bloques: [
      {tipo:'concepto', html:`
        <div style="background:var(--paper2);border-radius:12px;padding:14px;margin-bottom:14px;border-left:4px solid #16A34A">
          <strong>¿Coordinada o subordinada?</strong>
          <p style="font-size:.88rem;margin:6px 0 0">Una <strong>coordinada</strong> se une a otra <em>al mismo nivel</em>: si las separas con un punto, cada parte sigue siendo una oración completa.</p>
          <p style="font-size:.88rem;margin:6px 0 0">Una <strong>subordinada</strong> queda <em>integrada</em> dentro de otra cumpliendo una función (Sujeto, CD, complemento del nombre…).</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:#DCFCE7;border:2px solid #86EFAC;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:1.4rem">➕</div>
            <strong style="color:#15803D;font-size:.85rem">Copulativa</strong>
            <p style="font-size:.78rem;margin:4px 0 0;color:#166534"><em>y, e, ni, tanto…como</em><br>SUMA</p>
          </div>
          <div style="background:#DBEAFE;border:2px solid #93C5FD;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:1.4rem">↔️</div>
            <strong style="color:#1D4ED8;font-size:.85rem">Disyuntiva</strong>
            <p style="font-size:.78rem;margin:4px 0 0;color:#1E40AF"><em>o, u, bien…bien</em><br>ELECCIÓN</p>
          </div>
          <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:1.4rem">⚡</div>
            <strong style="color:#92400E;font-size:.85rem">Adversativa</strong>
            <p style="font-size:.78rem;margin:4px 0 0;color:#78350F"><em>pero, mas, sino que</em><br>CONTRASTE</p>
          </div>
        </div>
      `},
      {tipo:'quiz', pregunta:'«Juan lee el periódico <strong>y</strong> Pedro prepara el café.» ¿Qué tipo de oración es?',
        opciones:['Coordinada Copulativa','Coordinada Adversativa','Subordinada Sustantiva','Yuxtapuesta'],
        correcta:0,
        explicacion:'El nexo <em>y</em> suma dos hechos que coexisten. Cada proposición tiene sentido completo por sí sola.'},
      {tipo:'quiz', pregunta:'«No tengo tiempo <strong>ni</strong> ganas.» ¿Qué tipo de coordinación es?',
        opciones:['Disyuntiva (presenta alternativas)','Copulativa (suma negaciones)','Adversativa (contraste)','Yuxtapuesta'],
        correcta:1,
        explicacion:'El nexo <em>ni</em> tiene valor copulativo en contextos negativos: equivale a "y no". Las dos negaciones se acumulan en un solo bloque.'},
      {tipo:'concepto', html:`
        <div style="background:#FEF9C3;border:2px solid #FCD34D;border-radius:12px;padding:14px;margin-bottom:12px">
          <strong>💡 La trampa de "aunque"</strong>
          <p style="font-size:.88rem;margin:6px 0 0">El nexo <em>aunque</em> es un camaleón:</p>
          <ul style="font-size:.85rem;margin:6px 0 0;padding-left:20px">
            <li><strong>Coordinada Adversativa</strong>: cuando se puede sustituir por <em>pero</em> sin perder sentido y va con indicativo. <em>"Es caro, <strong>aunque</strong> bueno"</em>.</li>
            <li><strong>Construcción Concesiva</strong> (subordinada): cuando introduce un obstáculo que no impide la acción principal, especialmente con subjuntivo. <em>"Iré <strong>aunque</strong> llueva"</em>.</li>
          </ul>
        </div>
      `},
      {tipo:'quiz', pregunta:'«Iré a la playa <strong>aunque</strong> esté nublado.» ¿Cómo se clasifica?',
        opciones:['Coordinada Adversativa (equivale a "pero")','Construcción Concesiva (obstáculo ineficaz)','Coordinada Copulativa','Subordinada Sustantiva'],
        correcta:1,
        explicacion:'El verbo está en subjuntivo (<em>esté</em>) y no se puede cambiar por "pero" sin perder el matiz. Es un obstáculo posible que no impedirá la acción.'},
    ]
  },

  // ════════════════════════════════════════════════════════════════
  // Lección 2: Subordinadas sustantivas
  // ════════════════════════════════════════════════════════════════
  'sustantivas': {
    tag: 'Lección · Sustantivas',
    titulo: 'El truco de ESO',
    bloques: [
      {tipo:'concepto', html:`
        <div style="background:#EFF6FF;border:2px solid #93C5FD;border-radius:12px;padding:14px;margin-bottom:14px">
          <strong style="color:#1D4ED8">🎯 El SUPERTRUCO</strong>
          <p style="font-size:.9rem;margin:6px 0 0">Sustituye toda la subordinada (desde el nexo) por <strong>"ESO"</strong>. Si la frase sigue teniendo sentido, es una <strong>sustantiva</strong>.</p>
          <p style="font-size:.85rem;margin:8px 0 0;color:#1E3A5F;font-style:italic">"Quiero <span style="background:#FEF3C7;padding:1px 4px">que vengas</span>" → "Quiero <strong>ESO</strong>" ✓</p>
        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:.85rem;border-left:3px solid #6366F1">
          <strong>Las 5 funciones de una sustantiva:</strong>
          <ul style="margin:6px 0 0;padding-left:18px;line-height:1.6">
            <li><strong>Sujeto</strong>: concuerda con el verbo. "Me gusta <em>que vengas</em>" → me gustan <em>esas cosas</em>.</li>
            <li><strong>CD</strong>: se sustituye por <em>lo</em>. "Dijo <em>que ganaríamos</em>" → <em>lo</em> dijo.</li>
            <li><strong>Atributo</strong>: con ser/estar/parecer. "El problema es <em>que llueve</em>" → <em>lo</em> es.</li>
            <li><strong>Término de preposición</strong>: tras prep. exigida. "Me acordé <em>de que vendrías</em>" → me acordé <em>de eso</em>.</li>
            <li><strong>Aposición</strong>: junto a un sustantivo, sin preposición. "Su deseo, <em>que vinieras</em>, se cumplió".</li>
          </ul>
        </div>
      `},
      {tipo:'quiz', pregunta:'«Me encanta <strong>que me regalen flores</strong>.» ¿Qué función cumple la subordinada?',
        opciones:['Complemento Directo (CD)','Sujeto (concuerda con el verbo)','Atributo','Término de preposición'],
        correcta:1,
        explicacion:'Pasa el verbo a plural: <em>Me encantan ESAS COSAS</em>. La subordinada manda sobre el verbo → es el Sujeto.'},
      {tipo:'quiz', pregunta:'«El capitán dijo <strong>que ganaríamos</strong>.» ¿Qué función cumple?',
        opciones:['Sujeto','Complemento Directo (CD)','Atributo','Aposición'],
        correcta:1,
        explicacion:'Sustituye por LO: <em>El capitán LO dijo</em>. No concuerda con el verbo → es CD.'},
      {tipo:'concepto', html:`
        <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px;margin-bottom:12px">
          <strong style="color:#991B1B">⚠️ La trampa de "antes de que / después de que"</strong>
          <p style="font-size:.88rem;margin:6px 0 0;color:#7F1D1D">El análisis tradicional las trataba como adverbiales de tiempo. La <strong>NGLE</strong> dice otra cosa:</p>
          <p style="font-size:.85rem;margin:8px 0 0;color:#7F1D1D"><em>"La vi <span style="background:#FEF3C7;padding:1px 4px">antes de [que llegara]</span>"</em>:</p>
          <ul style="font-size:.85rem;margin:6px 0 0;padding-left:20px;color:#7F1D1D">
            <li><em>antes</em> es un adverbio (núcleo del sintagma adverbial).</li>
            <li><em>de [que llegara]</em> es un sintagma preposicional.</li>
            <li><em>que llegara</em> es una <strong>subordinada sustantiva</strong> en función de <strong>Término</strong>.</li>
          </ul>
          <p style="font-size:.85rem;margin:8px 0 0;color:#7F1D1D"><strong>Prueba:</strong> "La vi antes <strong>de ESO</strong>" ✓</p>
        </div>
      `},
      {tipo:'quiz', pregunta:'«Se marchó <strong>antes de que yo llegara</strong>.» Según la NGLE, ¿cómo se clasifica "que yo llegara"?',
        opciones:['Subordinada Adverbial de Tiempo','Subordinada Sustantiva (Término del SP)','Construcción Temporal autónoma','Subordinada de Relativo Libre'],
        correcta:1,
        explicacion:'Prueba: "Se marchó antes de ESO". La oración es término de la preposición <em>de</em>, dentro de un sintagma adverbial cuyo núcleo es <em>antes</em>.'},
    ]
  },

  // ════════════════════════════════════════════════════════════════
  // Lección 3: Subordinadas de relativo
  // ════════════════════════════════════════════════════════════════
  'relativas': {
    tag: 'Lección · Relativas',
    titulo: 'El truco de EL CUAL',
    bloques: [
      {tipo:'concepto', html:`
        <div style="background:#E5F4F1;border:2px solid #5EEAD4;border-radius:12px;padding:14px;margin-bottom:14px">
          <strong style="color:#115E59">🪞 El TRUCO de EL CUAL</strong>
          <p style="font-size:.9rem;margin:6px 0 0">Si puedes sustituir el nexo <em>que</em> por <strong>"el cual / la cual / los cuales / las cuales"</strong>, es una <strong>relativa</strong>.</p>
          <p style="font-size:.85rem;margin:8px 0 0;color:#134E4A;font-style:italic">"La película <span style="background:#FEF3C7;padding:1px 4px">que vi</span>" → "La película <strong>la cual</strong> vi" ✓</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="background:#DBEAFE;border:2px solid #93C5FD;border-radius:10px;padding:12px">
            <strong style="color:#1D4ED8;font-size:.9rem">Con antecedente</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#1E40AF">Hay un sustantivo expreso antes del nexo:</p>
            <ul style="font-size:.78rem;margin:4px 0 0;padding-left:16px;color:#1E40AF">
              <li><strong>Especificativa</strong>: sin comas, restringe. <em>"Los alumnos que estudien aprobarán"</em>.</li>
              <li><strong>Explicativa</strong>: entre comas, prescindible. <em>"Los alumnos, que estaban cansados, se fueron"</em>.</li>
            </ul>
          </div>
          <div style="background:#FAE8FF;border:2px solid #D8B4FE;border-radius:10px;padding:12px">
            <strong style="color:#6B21A8;font-size:.9rem">Sin antecedente expreso</strong>
            <p style="font-size:.82rem;margin:6px 0 0;color:#581C87">El nexo incorpora al antecedente:</p>
            <ul style="font-size:.78rem;margin:4px 0 0;padding-left:16px;color:#581C87">
              <li><strong>Libre</strong>: <em>quien, cuanto, donde, cuando, como</em>. "<em>Quien</em> mal anda…"</li>
              <li><strong>Semilibre</strong>: <em>el/la/los/las + que</em> con sustantivo elidido. "<em>El [chico] que</em> llegue tarde…"</li>
            </ul>
          </div>
        </div>
      `},
      {tipo:'quiz', pregunta:'«El libro <strong>que me prestaste</strong> es fascinante.» ¿Qué tipo de subordinada es?',
        opciones:['Sustantiva de CD','Relativa Especificativa (con antecedente)','Relativa Libre','Construcción Causal'],
        correcta:1,
        explicacion:'Hay antecedente expreso (<em>libro</em>) y va sin comas. Se puede sustituir <em>que</em> por <em>el cual</em>: "El libro EL CUAL me prestaste".'},
      {tipo:'quiz', pregunta:'«<strong>Quien</strong> mal anda, mal acaba.» ¿Cómo se clasifica?',
        opciones:['Relativa Especificativa','Relativa Libre (sin antecedente expreso)','Subordinada Sustantiva','Coordinada Adversativa'],
        correcta:1,
        explicacion:'<em>Quien</em> ya incluye en su significado "la persona que". No hay antecedente expreso: el nexo lo incorpora semánticamente.'},
      {tipo:'concepto', html:`
        <div style="background:#FAE8FF;border:2px solid #D8B4FE;border-radius:12px;padding:14px;margin-bottom:12px">
          <strong style="color:#6B21A8">🔄 El gran cambio NGLE: las antiguas adverbiales</strong>
          <p style="font-size:.88rem;margin:6px 0 0;color:#581C87">Los nexos <em>donde, cuando, como</em> sin antecedente ya NO son "adverbiales de lugar/tiempo/modo". La NGLE los analiza como <strong>relativas libres</strong> porque el nexo es un adverbio relativo que incorpora el antecedente:</p>
          <ul style="font-size:.85rem;margin:6px 0 0;padding-left:20px;color:#581C87">
            <li><em>donde</em> = "el lugar en que"</li>
            <li><em>cuando</em> = "el momento en que"</li>
            <li><em>como</em> = "la manera en que"</li>
          </ul>
        </div>
      `},
      {tipo:'quiz', pregunta:'«Aparqué <strong>donde</strong> pude.» Según la NGLE, ¿cómo se clasifica?',
        opciones:['Subordinada Adverbial de Lugar','Construcción Locativa','Relativa Libre (CCL)','Subordinada Sustantiva'],
        correcta:2,
        explicacion:'<em>Donde</em> equivale a "el lugar en que". La NGLE ya no usa "adverbial de lugar": son relativas libres con función circunstancial.'},
      {tipo:'quiz', pregunta:'«<strong>El que</strong> llegue tarde no entra.» ¿Qué tipo es?',
        opciones:['Relativa Libre','Relativa Semilibre (artículo + que con sustantivo elidido)','Sustantiva de Sujeto','Sustantiva con artículo'],
        correcta:1,
        explicacion:'Esquema "el + que" con un sustantivo invisible: "El [alumno] que llegue tarde". El artículo señala al núcleo elidido y la relativa funciona como su CN.'},
    ]
  },

  // ════════════════════════════════════════════════════════════════
  // Lección 4: Construcciones causales, finales e ilativas
  // ════════════════════════════════════════════════════════════════
  'construcciones_causa_finalidad': {
    tag: 'Lección · Causa, Finalidad e Ilación',
    titulo: 'Motivo vs Objetivo vs Consecuencia',
    bloques: [
      {tipo:'concepto', html:`
        <div style="background:#FEF3C7;border:2px solid #FCD34D;border-radius:12px;padding:14px;margin-bottom:14px">
          <strong style="color:#92400E">🎯 El cambiazo de "que"</strong>
          <p style="font-size:.9rem;margin:6px 0 0;color:#78350F">El nexo <em>que</em> es polivalente. Cuando no es relativo ni completivo, puede ser causal o final. La prueba:</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
            <div style="background:rgba(255,255,255,.5);border-radius:8px;padding:10px">
              <strong style="color:#78350F;font-size:.85rem">Causal — porque</strong>
              <p style="font-size:.8rem;margin:4px 0 0;color:#78350F"><em>"Abrígate, <strong>que</strong> hace frío"</em> → <em>"Abrígate, <strong>porque</strong> hace frío"</em> ✓</p>
              <p style="font-size:.75rem;margin:4px 0 0;color:#92400E">Indica el <strong>motivo</strong>.</p>
            </div>
            <div style="background:rgba(255,255,255,.5);border-radius:8px;padding:10px">
              <strong style="color:#78350F;font-size:.85rem">Final — para que</strong>
              <p style="font-size:.8rem;margin:4px 0 0;color:#78350F"><em>"Acércate, <strong>que</strong> te vea"</em> → <em>"Acércate, <strong>para que</strong> te vea"</em> ✓</p>
              <p style="font-size:.75rem;margin:4px 0 0;color:#92400E">Indica el <strong>propósito</strong>.</p>
            </div>
          </div>
        </div>
      `},
      {tipo:'quiz', pregunta:'«Cómelo, <strong>que</strong> está bueno.» ¿Qué construcción es?',
        opciones:['Construcción Causal (= porque está bueno)','Construcción Final (= para que esté bueno)','Coordinada Adversativa','Subordinada Sustantiva'],
        correcta:0,
        explicacion:'Sustituyendo por <em>porque</em> mantiene el sentido (motivo previo). Es causal.'},
      {tipo:'quiz', pregunta:'«Ven, <strong>que</strong> te diga una cosa.» ¿Qué construcción es?',
        opciones:['Construcción Causal','Construcción Final (= para que te diga)','Construcción Ilativa','Coordinada Copulativa'],
        correcta:1,
        explicacion:'El verbo va en subjuntivo (<em>diga</em>) y se sustituye por "para que". Es final: indica el propósito de venir.'},
      {tipo:'concepto', html:`
        <div style="background:#DBEAFE;border:2px solid #93C5FD;border-radius:12px;padding:14px;margin-bottom:12px">
          <strong style="color:#1D4ED8">🔗 Construcciones Ilativas</strong>
          <p style="font-size:.88rem;margin:6px 0 0;color:#1E3A5F">Presentan una <strong>consecuencia natural</strong> de lo dicho, sin intensificador.</p>
          <p style="font-size:.85rem;margin:8px 0 0;color:#1E40AF">Nexos típicos: <em>luego, así que, conque, por lo tanto</em>.</p>
          <p style="font-size:.85rem;margin:8px 0 0;color:#1E3A5F;font-style:italic">"Pienso, <strong>luego</strong> existo." → consecuencia lógica.<br>
          "Es tarde, <strong>conque</strong> date prisa." → continuación natural.</p>
          <p style="font-size:.82rem;margin:10px 0 0;color:#1E40AF"><strong>Truco "por lo tanto":</strong> si puedes sustituir el nexo por <em>"por lo tanto"</em> sin perder sentido, es ilativa.</p>
        </div>
      `},
      {tipo:'quiz', pregunta:'«No hay comida, <strong>así que</strong> iremos al súper.» ¿Cómo se clasifica?',
        opciones:['Construcción Causal','Construcción Final','Construcción Ilativa (consecuencia natural)','Coordinada Adversativa'],
        correcta:2,
        explicacion:'<em>Así que</em> equivale a "por lo tanto". Es una deducción natural sin necesidad de intensificador previo.'},
    ]
  },

  // ════════════════════════════════════════════════════════════════
  // Lección 5: Construcciones condicionales y concesivas
  // ════════════════════════════════════════════════════════════════
  'construcciones_condicion_concesion': {
    tag: 'Lección · Condición y Concesión',
    titulo: 'Hipótesis vs Obstáculo ineficaz',
    bloques: [
      {tipo:'concepto', html:`
        <div style="background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;padding:14px;margin-bottom:14px">
          <strong style="color:#991B1B">⚠️ El "como" camaleón</strong>
          <p style="font-size:.88rem;margin:6px 0 0;color:#7F1D1D">El nexo <em>como</em> cambia de valor según el <strong>modo verbal</strong>:</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
            <div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px">
              <strong style="color:#7F1D1D;font-size:.85rem">Indicativo → Causal</strong>
              <p style="font-size:.8rem;margin:4px 0 0;color:#991B1B"><em>"<strong>Como</strong> no me hacía caso, me fui"</em></p>
              <p style="font-size:.75rem;margin:4px 0 0;color:#7F1D1D">Verbo <em>hacía</em> (indicativo). Indica el <strong>motivo</strong>.</p>
            </div>
            <div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px">
              <strong style="color:#7F1D1D;font-size:.85rem">Subjuntivo → Condicional</strong>
              <p style="font-size:.8rem;margin:4px 0 0;color:#991B1B"><em>"<strong>Como</strong> no me hagas caso, te arrepentirás"</em></p>
              <p style="font-size:.75rem;margin:4px 0 0;color:#7F1D1D">Verbo <em>hagas</em> (subjuntivo). Indica <strong>condición o amenaza</strong>.</p>
            </div>
          </div>
        </div>
      `},
      {tipo:'quiz', pregunta:'«<strong>Como</strong> no llegues a tiempo, me iré sin ti.» ¿Cómo se clasifica?',
        opciones:['Construcción Causal','Construcción Condicional (subjuntivo = condición/amenaza)','Construcción Concesiva','Coordinada Adversativa'],
        correcta:1,
        explicacion:'Verbo <em>llegues</em> en subjuntivo. Equivale a "SI no llegas a tiempo…". Es condicional con valor de amenaza.'},
      {tipo:'concepto', html:`
        <div style="background:#DCFCE7;border:2px solid #86EFAC;border-radius:12px;padding:14px;margin-bottom:12px">
          <strong style="color:#15803D">🛑 "Aunque": ¿adversativa o concesiva?</strong>
          <p style="font-size:.88rem;margin:6px 0 0;color:#166534">El nexo <em>aunque</em> cambia de naturaleza según el contexto:</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
            <div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px">
              <strong style="color:#15803D;font-size:.85rem">Coordinada Adversativa</strong>
              <p style="font-size:.8rem;margin:4px 0 0;color:#166534">Si equivale a <em>pero</em> y hay pausa:</p>
              <p style="font-size:.78rem;margin:4px 0 0;color:#15803D;font-style:italic">"Es un libro caro, <strong>aunque</strong> bueno" = "Es caro, <strong>pero</strong> bueno".</p>
            </div>
            <div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px">
              <strong style="color:#15803D;font-size:.85rem">Construcción Concesiva</strong>
              <p style="font-size:.8rem;margin:4px 0 0;color:#166534">Si introduce un obstáculo que no impide (sobre todo con subjuntivo):</p>
              <p style="font-size:.78rem;margin:4px 0 0;color:#15803D;font-style:italic">"Iré a la playa <strong>aunque</strong> llueva".</p>
            </div>
          </div>
        </div>
      `},
      {tipo:'quiz', pregunta:'«El coche es viejo, <strong>aunque</strong> funciona bien.» ¿Cómo se clasifica?',
        opciones:['Coordinada Adversativa (= pero funciona bien)','Construcción Concesiva','Coordinada Copulativa','Construcción Causal'],
        correcta:0,
        explicacion:'El verbo va en indicativo (<em>funciona</em>) y se puede sustituir por "pero" manteniendo el sentido. Es coordinación adversativa.'},
      {tipo:'quiz', pregunta:'«<strong>Aunque</strong> lo intentes, no me convencerás.» ¿Cómo se clasifica?',
        opciones:['Coordinada Adversativa','Construcción Concesiva (obstáculo posible, no impide la acción)','Construcción Condicional','Subordinada Sustantiva'],
        correcta:1,
        explicacion:'El verbo va en subjuntivo (<em>intentes</em>). Introduce un obstáculo posible que no impedirá la acción principal: es concesiva.'},
    ]
  },

};

// ════════════════════════════════════════════════════════════════
// Mapeo: id de error CP → id de lección
// Se consulta desde tracking.js (shouldSuggestMicroLeccion) cuando
// el alumno acumula >= ML_THRESHOLD errores en una misma categoría.
// ════════════════════════════════════════════════════════════════
export const ERROR_TO_LECCION_CP = {
  // Tipo
  'coordinada': 'coordinacion',
  'subordinada': 'coordinacion',   // si confunde el tipo alto, la coord vs sub lo cubre la 1
  'yuxtapuesta': 'coordinacion',

  // Coordinada (subtipos)
  'copulativa': 'coordinacion',
  'disyuntiva': 'coordinacion',
  'adversativa': 'coordinacion',

  // Familia sustantiva
  'sustantiva': 'sustantivas',
  'sustantiva_sujeto': 'sustantivas',
  'sustantiva_cd': 'sustantivas',
  'sustantiva_atributo': 'sustantivas',
  'sustantiva_termino_preposicion': 'sustantivas',
  'sustantiva_aposicion': 'sustantivas',

  // Familia relativa
  'relativa': 'relativas',
  'relativa_especificativa': 'relativas',
  'relativa_explicativa': 'relativas',
  'relativa_libre': 'relativas',
  'relativa_semilibre': 'relativas',

  // Familia construcción
  'construccion': 'construcciones_causa_finalidad',
  'causal': 'construcciones_causa_finalidad',
  'final': 'construcciones_causa_finalidad',
  'ilativa_constr': 'construcciones_causa_finalidad',
  'temporal': 'construcciones_causa_finalidad',
  'condicional': 'construcciones_condicion_concesion',
  'concesiva': 'construcciones_condicion_concesion',
};
