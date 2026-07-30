/**
 * ParcheLoteLiterario.gs — Arregla los 4 ejercicios del lote literario que
 * dejaban al alumno sin salida en el paso 4 «Clasificar y relacionar».
 * Detectado el 29-jul-2026 auditando Compuestas_Banco.
 *
 * ── QUÉ ESTABA MAL ────────────────────────────────────────────────────────
 * El motor compara la respuesta del alumno con `rel.subtipo` y con
 * `rel.direccion.origen`. Si el subtipo no es uno de los de la lista cerrada,
 * o si falta la dirección en una subordinación, NINGÚN botón coincide nunca:
 * todas las respuestas se marcan mal y el sub-paso se reinicia a los 1,8 s.
 * El alumno no puede terminar el ejercicio.
 *
 * ── CÓMO SE USA (no hace falta redesplegar: es solo menú) ─────────────────
 *   1. Pega este archivo en Apps Script como archivo nuevo.
 *   2. Hoja → menú del Taller → «Compuestas» → «Previsualizar parche lote
 *      literario». NO escribe nada: solo dice qué cambiaría.
 *   3. Si el informe te cuadra, «Aplicar parche lote literario».
 *
 * Es idempotente: se puede ejecutar dos veces sin estropear nada (la segunda
 * dirá «ya estaba» en todo).
 *
 * ── DECISIONES LINGÜÍSTICAS ───────────────────────────────────────────────
 * Todo lo que toca este parche sigue la convención que ya usa el propio
 * banco, comprobada contando los 262 ejercicios vivos:
 *   · el relativo SÍ va en los índices de la subordinada (25 de 25);
 *   · la conjunción «porque» NO va en los índices de la causal (19 de 19);
 *   · la completiva «que» NO va en los índices de la sustantiva (31 de 35);
 *   · en las semilibres el artículo va DENTRO de la subordinada (14 de 14);
 *   · las causales llevan funcion:'construccion_causal' (19 de 20).
 * Las dos decisiones que NO son mecánicas están marcadas con «CRITERIO» y
 * explicadas en el informe que sale por pantalla.
 */

// Cada entrada: se localiza la fila por su Texto (NO por ID: hay IDs
// duplicados en el banco, p. ej. dos filas se sirven como OC_0014).
const PARCHE_LOTE_LITERARIO = [
  {
    texto: 'Nuestras vidas son los ríos que van a dar en la mar .',
    nota: 'Manrique. Solo le faltaba la dirección de la dependencia.',
    cambios: function (ej) {
      const out = [];
      const r = buscarRel_(ej, 'r1');
      if (!r) return ['⚠ no encuentro la relación r1'];
      out.push(fijar_(r, 'direccion', { origen: 'pp', destino: 'ps' },
                      'dirección de la dependencia (pp → ps)'));
      return out;
    }
  },
  {
    texto: 'No perdono a la muerte enamorada , no perdono a la vida desatenta .',
    nota: 'Miguel Hernández. Estaba como coordinación con subtipo «yuxtapuesta»; '
        + 'no hay nexo, solo una coma: es yuxtaposición.',
    cambios: function (ej) {
      const out = [];
      out.push(fijar_(ej, 'tipo_oracion', 'yuxtapuesta', 'tipo de oración'));
      (ej.proposiciones || []).forEach(function (p) {
        out.push(fijar_(p, 'tipo', 'yuxtapuesta', 'tipo de la oración ' + p.id));
      });
      const r = buscarRel_(ej, 'r1');
      if (!r) return out.concat(['⚠ no encuentro la relación r1']);
      out.push(fijar_(r, 'tipo', 'yuxtaposicion', 'tipo de relación'));
      out.push(fijar_(r, 'subtipo', 'yuxtaposicion_simple', 'subtipo de relación'));
      // La coma se queda registrada como nexo (categoria: puntuacion) porque
      // es lo que ya hacen las otras yuxtapuestas del banco. Si prefieres que
      // el paso 2 no pida marcar la coma, eso es un cambio de convención para
      // TODAS las yuxtapuestas, no solo para esta.
      return out;
    }
  },
  {
    texto: 'No es oro todo lo que reluce .',
    nota: 'CRITERIO: «lo que» es artículo neutro + relativo → relativa '
        + 'SEMILIBRE (estaba «relativa», que no es un subtipo, y la oración '
        + 'decía «libre»). Y «todo lo que reluce» es el SUJETO de «es», no un '
        + 'CN: «oro» es el atributo. Estaba puesto como CN.',
    cambios: function (ej) {
      const out = [];
      const ps = buscarProp_(ej, 'ps');
      if (ps) {
        out.push(fijar_(ps, 'subtipo', 'relativa_semilibre', 'subtipo de la oración ps'));
        out.push(fijar_(ps, 'funcion', 'sujeto', 'función de la oración ps'));
      }
      const r = buscarRel_(ej, 'r1');
      if (!r) return out.concat(['⚠ no encuentro la relación r1']);
      out.push(fijar_(r, 'subtipo', 'relativa_semilibre', 'subtipo de relación'));
      out.push(fijar_(r, 'funcion', 'sujeto', 'función de la subordinada'));
      out.push(fijar_(r, 'direccion', { origen: 'pp', destino: 'ps' },
                      'dirección de la dependencia (pp → ps)'));
      return out;
    }
  },
  {
    texto: 'Vine a Comala porque me dijeron que acá vivía Pedro Páramo .',
    nota: 'Rulfo. Le faltaban las dos direcciones, «sustantiva» no es un '
        + 'subtipo (es CD de «dijeron») y las dos subordinadas se comían su '
        + 'propio nexo en los índices, con lo que el paso 3 (delimitar) '
        + 'también salía mal.',
    cambios: function (ej) {
      const out = [];
      const ps1 = buscarProp_(ej, 'ps1');
      if (ps1) {
        // [3,4,5] «porque me dijeron» → [4,5] «me dijeron»: «porque» es el nexo.
        out.push(fijar_(ps1, 'indices', [4, 5], 'palabras de ps1 (fuera «porque»)'));
        out.push(fijar_(ps1, 'funcion', 'construccion_causal', 'función de ps1'));
      }
      const ps2 = buscarProp_(ej, 'ps2');
      if (ps2) {
        // [6..10] «que acá vivía…» → [7..10]: la completiva «que» es el nexo.
        out.push(fijar_(ps2, 'indices', [7, 8, 9, 10], 'palabras de ps2 (fuera «que»)'));
        out.push(fijar_(ps2, 'subtipo', 'sustantiva_cd', 'subtipo de ps2'));
      }
      const r1 = buscarRel_(ej, 'r1');
      if (r1) {
        out.push(fijar_(r1, 'direccion', { origen: 'pp', destino: 'ps1' },
                        'dirección de r1 (pp → ps1)'));
        out.push(fijar_(r1, 'funcion', 'construccion_causal', 'función de r1'));
      }
      const r2 = buscarRel_(ej, 'r2');
      if (r2) {
        out.push(fijar_(r2, 'subtipo', 'sustantiva_cd', 'subtipo de r2'));
        out.push(fijar_(r2, 'direccion', { origen: 'ps1', destino: 'ps2' },
                        'dirección de r2 (ps1 → ps2)'));
        out.push(fijar_(r2, 'funcion', 'cd', 'función de r2'));
      }
      return out;
    }
  }
];

// Nivel de los 4: van sin `metadatos`, así que no tienen nivel, y desde el
// arreglo del filtro (que ahora cruza categorías de verdad) un ejercicio sin
// nivel desaparece en cuanto el alumno marca cualquier nivel. Les pongo uno
// para que sean alcanzables. Cámbialo si no te cuadra.
const NIVEL_LOTE_LITERARIO = {
  'Nuestras vidas son los ríos que van a dar en la mar .': 'avanzado',
  'No perdono a la muerte enamorada , no perdono a la vida desatenta .': 'medio',
  'No es oro todo lo que reluce .': 'medio',
  'Vine a Comala porque me dijeron que acá vivía Pedro Páramo .': 'avanzado'
};

// ── Helpers ──────────────────────────────────────────────────────────────

function buscarRel_(ej, id) {
  return (ej.relaciones || []).filter(function (r) { return r.id === id; })[0] || null;
}
function buscarProp_(ej, id) {
  return (ej.proposiciones || []).filter(function (p) { return p.id === id; })[0] || null;
}

// Fija obj[clave] = valor y devuelve una línea de informe. Si ya valía eso,
// lo dice y no cuenta como cambio (de ahí que el parche sea idempotente).
function fijar_(obj, clave, valor, descripcion) {
  const antes = JSON.stringify(obj[clave] === undefined ? null : obj[clave]);
  const despues = JSON.stringify(valor);
  if (antes === despues) return '   = ya estaba: ' + descripcion;
  obj[clave] = valor;
  return '   ✎ ' + descripcion + ': ' + antes + ' → ' + despues;
}

// Normaliza para comparar textos: colapsa espacios y quita los invisibles
// que suele meter el copiar y pegar desde Word.
function normTexto_(s) {
  return String(s == null ? '' : s)
    .replace(/ /g, ' ')                       // espacio duro
    .replace(/[​-‍﻿]/g, '')        // invisibles del copiar y pegar
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Núcleo ───────────────────────────────────────────────────────────────

function parchearLoteLiterario_(aplicar) {
  const sheet = ensureCompBancoSheet_();
  const col = getColMap_(sheet);
  if (col['Texto'] === undefined || col['JSON_Compuesta'] === undefined) {
    return { ok: false, error: 'Faltan las columnas Texto o JSON_Compuesta en Compuestas_Banco.' };
  }
  const ultima = sheet.getLastRow();
  if (ultima < 2) return { ok: false, error: 'Compuestas_Banco está vacía.' };

  const datos = sheet.getRange(2, 1, ultima - 1, sheet.getLastColumn()).getValues();
  const lineas = [];
  let filasTocadas = 0;
  let cambiosTotales = 0;

  PARCHE_LOTE_LITERARIO.forEach(function (entrada) {
    const buscado = normTexto_(entrada.texto);
    const coincidencias = [];
    for (let i = 0; i < datos.length; i++) {
      if (normTexto_(datos[i][col['Texto']]) === buscado) coincidencias.push(i);
    }

    lineas.push('');
    lineas.push('«' + entrada.texto + '»');
    lineas.push('   ' + entrada.nota);

    if (coincidencias.length === 0) {
      lineas.push('   ⚠ NO ENCONTRADA en la hoja. Nada que hacer.');
      return;
    }
    if (coincidencias.length > 1) {
      lineas.push('   ⚠ Aparece en ' + coincidencias.length + ' filas ('
                + coincidencias.map(function (i) { return i + 2; }).join(', ')
                + '). Parcheo todas.');
    }

    coincidencias.forEach(function (i) {
      const nFila = i + 2;
      const raw = String(datos[i][col['JSON_Compuesta']] || '');
      const ej = safeParseJSON(raw);
      if (!ej) {
        lineas.push('   ⚠ Fila ' + nFila + ': el JSON no se puede leer. La salto.');
        return;
      }

      lineas.push('   Fila ' + nFila + ' (ID de la columna: ' + datos[i][col['ID']]
                + ' · id dentro del JSON: ' + ej.id + ')');

      const informe = entrada.cambios(ej) || [];

      // Nivel, si le falta.
      const nivel = NIVEL_LOTE_LITERARIO[entrada.texto];
      if (nivel) {
        if (!ej.metadatos) ej.metadatos = {};
        informe.push(fijar_(ej.metadatos, 'nivel', nivel, 'nivel (no tenía ninguno)'));
      }

      informe.forEach(function (l) { lineas.push(l); });
      const nCambios = informe.filter(function (l) { return l.indexOf('✎') !== -1; }).length;
      cambiosTotales += nCambios;

      if (nCambios === 0) {
        lineas.push('   → nada que cambiar.');
        return;
      }
      filasTocadas++;
      if (aplicar) {
        sheet.getRange(nFila, col['JSON_Compuesta'] + 1)
             .setValue(JSON.stringify(ej));
        // La columna Subtipo (visible en la hoja) se deja como está: es
        // informativa y no la usa el motor. Se sincroniza aparte si quieres.
        lineas.push('   → ESCRITO en la fila ' + nFila + '.');
      } else {
        lineas.push('   → (previsualización: no se ha escrito nada)');
      }
    });
  });

  return {
    ok: true,
    aplicado: !!aplicar,
    filasTocadas: filasTocadas,
    cambiosTotales: cambiosTotales,
    informe: lineas.join('\n')
  };
}

// ── Entradas de menú ─────────────────────────────────────────────────────

function menuPreviewParcheLoteLiterario() {
  const ui = SpreadsheetApp.getUi();
  const r = parchearLoteLiterario_(false);
  if (!r.ok) { ui.alert('Parche lote literario', r.error, ui.ButtonSet.OK); return; }
  ui.alert('Previsualización — NO se ha escrito nada',
    'Cambiaría ' + r.cambiosTotales + ' campos en ' + r.filasTocadas + ' filas.\n'
    + r.informe, ui.ButtonSet.OK);
}

function menuAplicarParcheLoteLiterario() {
  const ui = SpreadsheetApp.getUi();
  const previo = parchearLoteLiterario_(false);
  if (!previo.ok) { ui.alert('Parche lote literario', previo.error, ui.ButtonSet.OK); return; }
  if (previo.cambiosTotales === 0) {
    ui.alert('Parche lote literario', 'No hay nada que cambiar: ya está todo aplicado.', ui.ButtonSet.OK);
    return;
  }
  const resp = ui.alert('¿Aplicar el parche?',
    'Se van a modificar ' + previo.cambiosTotales + ' campos en ' + previo.filasTocadas
    + ' filas de Compuestas_Banco.\n\n'
    + 'Haz antes una copia de la Hoja (Archivo → Hacer una copia) si quieres red de seguridad.\n\n'
    + '¿Sigo?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  const r = parchearLoteLiterario_(true);
  ui.alert('Parche aplicado',
    'Modificados ' + r.cambiosTotales + ' campos en ' + r.filasTocadas + ' filas.\n'
    + r.informe, ui.ButtonSet.OK);
}
