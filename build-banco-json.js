// Genera los bancos de datos de la versión ligera (data/banco-*.json).
// Fase 1 del plan técnico (Plan_Estrategico_Web.md §11.8): congelar en JSON
// estático lo que hoy sirve el backend, para que la app funcione sin él.
//
// Por ahora solo compuestas (arranque por Chispa, decisión 11-sep-2026).
// Cuando se haga simples/morfología, este script gana una sección más —
// mismo patrón, mismo archivo.
//
// Uso: node build-banco-json.js

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DATA_DIR = path.join(DIR, 'data');

function leerTSV(ruta) {
  const raw = fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '');
  const lineas = raw.split(/\r?\n/).filter(l => l.length > 0);
  const header = lineas[0].split('\t');
  return lineas.slice(1).map(l => {
    const cols = l.split('\t');
    const fila = {};
    header.forEach((h, i) => fila[h] = cols[i] ?? '');
    return fila;
  });
}

function leerIdsMarcados(rutaCSV) {
  const raw = fs.readFileSync(rutaCSV, 'utf8').replace(/^﻿/, '');
  const lineas = []; let campo = '', fila = [], enComillas = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (enComillas) { if (c === '"') { if (raw[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; } else campo += c; }
    else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\r') { /* ignora */ }
    else if (c === '\n') { fila.push(campo); lineas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo.length || fila.length) { fila.push(campo); lineas.push(fila); }
  const header = lineas[0];
  const iId = header.indexOf('id'), iInc = header.indexOf('INCLUIR');
  const ids = new Set();
  lineas.slice(1).forEach(f => { if ((f[iInc] || '').trim() !== '') ids.add(f[iId]); });
  return ids;
}

// ── Compuestas ───────────────────────────────────────────────────────────
// El servidor (Compuestas.gs, readCompBancoFromSheet_ + stripInternalMeta_)
// no transforma el contenido: solo hace JSON.parse(JSON_Compuesta) y lo sirve
// tal cual, con metaclaves _tipo_oracion etc. añadidas y luego quitadas antes
// de responder. Aquí replicamos exactamente ese resultado final: un array de
// objetos JSON_Compuesta puros, sin metaclaves, en el mismo formato exacto
// que ya consumen chispa/index.js y compuestas/index.js.
function generarBancoCompuestas() {
  const idsMarcados = leerIdsMarcados(path.join(DIR, 'Seleccion_Compuestas_Light.csv'));
  const filas = leerTSV(path.join(DIR, 'banco_export', 'Compuestas_Banco.tsv'));

  const ejercicios = [];
  const errores = [];
  filas.forEach(r => {
    if (!idsMarcados.has(r.ID)) return;
    if (r.Activo !== 'Sí') { errores.push(r.ID + ': marcada pero no Activa en el TSV'); return; }
    try {
      ejercicios.push(JSON.parse(r.JSON_Compuesta));
    } catch (e) {
      errores.push(r.ID + ': JSON_Compuesta no parsea (' + e.message + ')');
    }
  });

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  const destino = path.join(DATA_DIR, 'banco-compuestas.json');
  fs.writeFileSync(destino, JSON.stringify(ejercicios), 'utf8');

  return { destino, total: ejercicios.length, esperados: idsMarcados.size, errores };
}

const r = generarBancoCompuestas();
console.log('OK:', path.relative(DIR, r.destino), '—', r.total, 'ejercicios (' + r.esperados, 'marcados en el CSV)');
if (r.errores.length) {
  console.log('\nAVISOS:');
  r.errores.forEach(e => console.log('  -', e));
}
if (r.total !== r.esperados) {
  console.log('\n⚠ El total escrito no coincide con lo marcado — revisa los avisos de arriba.');
}
