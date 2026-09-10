// Ajusta las selecciones YA marcadas a mano (columna INCLUIR) hasta el objetivo:
// si faltan, añade más respetando un reparto proporcional a lo más usado;
// si sobran, quita primero las más difíciles. No toca ninguna marca existente
// salvo las mínimas necesarias para llegar al objetivo.
// Uso: node completar-seleccion.js

const fs = require('fs');
const path = require('path');
const DIR = __dirname;

// ── CSV genérico (mismo formato que build-seleccion-banco.js) ──────────────
function leerCSV(nombre) {
  const raw = fs.readFileSync(path.join(DIR, nombre), 'utf8').replace(/^﻿/, '');
  const filas = [];
  let campo = '', fila = [], enComillas = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (enComillas) {
      if (c === '"') { if (raw[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; }
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\r') { /* ignora */ }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo.length || fila.length) { fila.push(campo); filas.push(fila); }
  const header = filas[0];
  return { header, filas: filas.slice(1).map(f => { const o = {}; header.forEach((h, i) => o[h] = f[i] ?? ''); return o; }) };
}

function csvCampo(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function escribirCSV(nombre, columnas, filas) {
  const bom = '﻿';
  const cuerpo = filas.map(f => columnas.map(c => csvCampo(f[c])).join(',')).join('\r\n');
  fs.writeFileSync(path.join(DIR, nombre), bom + columnas.join(',') + '\r\n' + cuerpo + '\r\n', 'utf8');
}

const marcada = v => (v || '').trim() !== '';

// ════════════════════════════════════════════════════════════════════════
// SIMPLES
// ════════════════════════════════════════════════════════════════════════

const TARGET_SIMPLES = 150;

function completarSimples() {
  const { header, filas } = leerCSV('Seleccion_Simple_Light.csv');
  filas.forEach(f => f._funciones = f['Funciones'] ? f['Funciones'].split(' + ') : []);

  // Frecuencia real en TODO el banco (658 oraciones) = "lo más usado en español"
  // dentro de este banco, que es la única vara de medir que tenemos.
  const freqTotal = {};
  filas.forEach(f => f._funciones.forEach(fn => freqTotal[fn] = (freqTotal[fn] || 0) + 1));
  const sumaFreq = Object.values(freqTotal).reduce((a, b) => a + b, 0);

  // Objetivo por función: proporcional a su frecuencia real, con un suelo de
  // "al menos 3 (o todas las que haya, si hay menos)" para que ninguna
  // desaparezca del todo por ser minoritaria.
  const objetivoPorFuncion = {};
  Object.keys(freqTotal).forEach(fn => {
    const proporcional = Math.round(TARGET_SIMPLES * freqTotal[fn] / sumaFreq);
    const suelo = Math.min(3, freqTotal[fn]);
    objetivoPorFuncion[fn] = Math.max(proporcional, suelo);
  });

  const actualPorFuncion = {};
  Object.keys(freqTotal).forEach(fn => actualPorFuncion[fn] = 0);
  filas.filter(f => marcada(f.INCLUIR)).forEach(f => f._funciones.forEach(fn => actualPorFuncion[fn]++));

  function puntuar(f) {
    // Valor = cuánto ayuda a cerrar los déficits todavía abiertos.
    let valor = 0;
    f._funciones.forEach(fn => {
      const deficit = objetivoPorFuncion[fn] - actualPorFuncion[fn];
      if (deficit > 0) valor += deficit;
    });
    // Desempate suave: menos funciones (menos solapamiento) y menos palabras.
    valor += (10 - Math.min(10, f._funciones.length)) * 0.01;
    valor -= Number(f['Nº de palabras'] || 0) * 0.001;
    return valor;
  }

  const objetivo = TARGET_SIMPLES;
  const marcadasIni = filas.filter(f => marcada(f.INCLUIR)).length;
  const diferencia = objetivo - marcadasIni;
  const cambios = { añadidas: [], quitadas: [] };

  if (diferencia > 0) {
    const disponibles = filas.filter(f => !marcada(f.INCLUIR));
    for (let i = 0; i < diferencia && disponibles.length; i++) {
      let mejorIdx = -1, mejorValor = -Infinity;
      disponibles.forEach((f, idx) => {
        const v = puntuar(f);
        if (v > mejorValor) { mejorValor = v; mejorIdx = idx; }
      });
      const [elegida] = disponibles.splice(mejorIdx, 1);
      elegida.INCLUIR = 'x';
      elegida._funciones.forEach(fn => actualPorFuncion[fn]++);
      cambios.añadidas.push(elegida);
    }
  } else if (diferencia < 0) {
    const candidatas = filas.filter(f => marcada(f.INCLUIR))
      .sort((a, b) => Number(b['Dificultad (1-5)']) - Number(a['Dificultad (1-5)']));
    for (let i = 0; i < -diferencia; i++) {
      candidatas[i].INCLUIR = '';
      cambios.quitadas.push(candidatas[i]);
    }
  }

  escribirCSV('Seleccion_Simple_Light.csv', header, filas);

  const finalPorFuncion = {};
  Object.keys(freqTotal).forEach(fn => finalPorFuncion[fn] = 0);
  filas.filter(f => marcada(f.INCLUIR)).forEach(f => f._funciones.forEach(fn => finalPorFuncion[fn]++));

  return { marcadasIni, objetivo, cambios, objetivoPorFuncion, finalPorFuncion, freqTotal };
}

// ════════════════════════════════════════════════════════════════════════
// COMPUESTAS
// ════════════════════════════════════════════════════════════════════════

// Etiquetas reales del alumno — copiadas de etiquetaSubtipo() en
// js/modules/compuestas/index.js (única fuente de verdad de la UI).
const ETIQUETA_SUBTIPO_ALUMNO = {
  copulativa: 'Copulativa', adversativa: 'Adversativa', disyuntiva: 'Disyuntiva',
  distributiva: 'Distributiva', explicativa: 'Explicativa', ilativa_coord: 'Ilativa',
  sustantiva_sujeto: 'Sustantiva (Sujeto)', sustantiva_cd: 'Sustantiva (CD)',
  sustantiva_atributo: 'Sustantiva (Atributo)', sustantiva_termino_preposicion: 'Sustantiva (Término de prep.)',
  sustantiva_aposicion: 'Sustantiva (Aposición)',
  relativa_especificativa: 'Relativa especificativa', relativa_explicativa: 'Relativa explicativa',
  relativa_libre: 'Relativa libre', relativa_semilibre: 'Relativa semilibre',
  condicional: 'Condicional', final: 'Final', causal: 'Causal',
  concesiva: 'Concesiva', ilativa_constr: 'Ilativa (construcción)',
  temporal: 'Temporal', locativa: 'Locativa', modal: 'Modal', comparativa: 'Comparativa',
};
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

const TOPE_SUBTIPO = {
  sustantiva_cd: 8, sustantiva_sujeto: 8, sustantiva_termino_preposicion: 8,
  relativa_especificativa: 8, copulativa: 8, adversativa: 8, causal: 8, condicional: 8,
  disyuntiva: 6, relativa_explicativa: 6, relativa_libre: 6, relativa_semilibre: 6, temporal: 6,
  sustantiva_aposicion: 4, concesiva: 4, ilativa_constr: 4, final: 4,
  ilativa_coord: 99, sustantiva_atributo: 99,
};

const TARGET_COMPUESTAS = 80;

function completarCompuestas() {
  const { header, filas } = leerCSV('Seleccion_Compuestas_Light.csv');
  filas.forEach(f => {
    const partes = f['Tipo / subtipo'].split(' · ');
    f._tipoOracion = partes[0];
    f._subtipos = partes[1] ? partes[1].split(' + ') : [];
  });

  const actualPorSubtipo = {};
  Object.keys(TOPE_SUBTIPO).forEach(s => actualPorSubtipo[s] = 0);
  filas.filter(f => marcada(f.INCLUIR)).forEach(f => f._subtipos.forEach(s => { if (s in actualPorSubtipo) actualPorSubtipo[s]++; }));

  function puntuar(f) {
    let valor = 0;
    f._subtipos.forEach(s => {
      const tope = TOPE_SUBTIPO[s];
      if (tope === undefined) return;
      const deficit = tope - actualPorSubtipo[s];
      if (deficit > 0) valor += Math.min(deficit, tope); // no sobre-premiar los de tope 99
    });
    valor += (6 - Math.min(6, f._subtipos.length)) * 0.01;
    valor -= Number(f['Nº de palabras'] || 0) * 0.001;
    return valor;
  }

  const marcadasIni = filas.filter(f => marcada(f.INCLUIR)).length;
  const diferencia = TARGET_COMPUESTAS - marcadasIni;
  const cambios = { añadidas: [], quitadas: [] };

  if (diferencia > 0) {
    const disponibles = filas.filter(f => !marcada(f.INCLUIR));
    for (let i = 0; i < diferencia && disponibles.length; i++) {
      let mejorIdx = -1, mejorValor = -Infinity;
      disponibles.forEach((f, idx) => {
        const v = puntuar(f);
        if (v > mejorValor) { mejorValor = v; mejorIdx = idx; }
      });
      const [elegida] = disponibles.splice(mejorIdx, 1);
      elegida.INCLUIR = 'x';
      elegida._subtipos.forEach(s => { if (s in actualPorSubtipo) actualPorSubtipo[s]++; });
      cambios.añadidas.push(elegida);
    }
  } else if (diferencia < 0) {
    const candidatas = filas.filter(f => marcada(f.INCLUIR))
      .sort((a, b) => Number(b['Dificultad (1-5)']) - Number(a['Dificultad (1-5)']));
    for (let i = 0; i < -diferencia; i++) {
      candidatas[i].INCLUIR = '';
      cambios.quitadas.push(candidatas[i]);
    }
  }

  // Relabel a la terminología real del alumno (verificada en el código, ver mensaje).
  filas.forEach(f => {
    const etiquetas = f._subtipos.map(s => ETIQUETA_SUBTIPO_ALUMNO[s] || s);
    f['Tipo / subtipo'] = etiquetas.length ? `${cap(f._tipoOracion)} · ${etiquetas.join(' + ')}` : cap(f._tipoOracion);
  });

  escribirCSV('Seleccion_Compuestas_Light.csv', header, filas);

  const finalPorSubtipo = {};
  Object.keys(TOPE_SUBTIPO).forEach(s => finalPorSubtipo[s] = 0);
  filas.filter(f => marcada(f.INCLUIR)).forEach(f => f._subtipos.forEach(s => { if (s in finalPorSubtipo) finalPorSubtipo[s]++; }));

  return { marcadasIni, objetivo: TARGET_COMPUESTAS, cambios, finalPorSubtipo };
}

// ════════════════════════════════════════════════════════════════════════

console.log('=== Completando selección ya marcada a mano ===\n');

console.log('── Simples ──');
const rS = completarSimples();
console.log(`Marcadas antes: ${rS.marcadasIni}  ->  objetivo: ${rS.objetivo}  ->  ${rS.cambios.añadidas.length ? 'añadidas ' + rS.cambios.añadidas.length : 'quitadas ' + rS.cambios.quitadas.length}`);
if (rS.cambios.añadidas.length) {
  console.log('Añadidas:', rS.cambios.añadidas.map(f => f.id).join(', '));
}
if (rS.cambios.quitadas.length) {
  console.log('Quitadas (más difíciles):', rS.cambios.quitadas.map(f => f.id).join(', '));
}
console.log('\nReparto final vs. objetivo proporcional (función: final / objetivo / frecuencia real en el banco):');
Object.keys(rS.freqTotal).sort((a, b) => rS.freqTotal[b] - rS.freqTotal[a]).forEach(fn => {
  console.log(`  ${fn.padEnd(16)} ${String(rS.finalPorFuncion[fn]).padStart(3)} / ${String(rS.objetivoPorFuncion[fn]).padStart(3)} / ${rS.freqTotal[fn]}`);
});

console.log('\n── Compuestas ──');
const rC = completarCompuestas();
console.log(`Marcadas antes: ${rC.marcadasIni}  ->  objetivo: ${rC.objetivo}  ->  ${rC.cambios.añadidas.length ? 'añadidas ' + rC.cambios.añadidas.length : 'quitadas ' + rC.cambios.quitadas.length}`);
if (rC.cambios.añadidas.length) {
  console.log('Añadidas:', rC.cambios.añadidas.map(f => f.id).join(', '));
}
if (rC.cambios.quitadas.length) {
  console.log('Quitadas (más difíciles):', rC.cambios.quitadas.map(f => f.id).join(', '));
}
console.log('\nReparto final por subtipo (final / tope):');
Object.entries(TOPE_SUBTIPO).sort((a, b) => rC.finalPorSubtipo[b[0]] - rC.finalPorSubtipo[a[0]]).forEach(([s, tope]) => {
  console.log(`  ${s.padEnd(30)} ${String(rC.finalPorSubtipo[s]).padStart(3)} / ${tope}`);
});

console.log('\n=== Hecho. Revisa las dos columnas INCLUIR: se han añadido/quitado solo las marcas necesarias. ===');
