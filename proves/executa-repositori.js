#!/usr/bin/env node
// Vigila que al repositori (que és públic) no hi entri cap dada real.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');

const EXTENSIONS_PROHIBIDES = /\.(xlsx|xlsm|xls|ods|csv|tsv|zip)$/i;
const CORREU = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const DOMINIS_PERMESOS = /@(exemple\.cat|example\.(com|org|net)|escola(-real)?\.cat)$/i;
const DNI_NIE = /\b([XYZ]?\d{7,8})-?([A-Z])\b/g;
const LLETRES_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
const LLICENCIA = 'LICENSE';
const TERCERS = /^src\/vendor\//;

function dniValid(numero, lletra) {
  const n = Number(numero.replace('X', '0').replace('Y', '1').replace('Z', '2'));
  return LLETRES_DNI[n % 23] === lletra;
}

let incidencies = 0;
const avisa = (text) => { incidencies++; console.log('✗ ' + text); };

const fitxers = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(Boolean);

for (const fitxer of fitxers) {
  if (EXTENSIONS_PROHIBIDES.test(fitxer)) { avisa('fitxer de dades prohibit: ' + fitxer); continue; }
  if (fitxer === LLICENCIA || TERCERS.test(fitxer)) continue;
  const text = fs.readFileSync(fitxer, 'utf8');
  for (const correu of text.match(CORREU) || []) {
    if (!DOMINIS_PERMESOS.test(correu)) avisa('adreça de correu no inventada a ' + fitxer);
  }
  for (const [, numero, lletra] of text.matchAll(DNI_NIE)) {
    if (dniValid(numero, lletra)) avisa('possible DNI/NIE real a ' + fitxer);
  }
}

// El codi de tercers ha de ser exactament el que es va revisar.
const crypto = require('crypto');
const tercers = JSON.parse(fs.readFileSync('src/vendor/VERSIONS.json', 'utf8'));
const hashFflate = crypto.createHash('sha256').update(fs.readFileSync('src/vendor/fflate.js')).digest('hex');
if (hashFflate !== tercers.fflate.sha256Fitxer) avisa('src/vendor/fflate.js no coincideix amb la versió revisada');

console.log(fitxers.length + ' fitxers revisats, ' + incidencies + ' incidències.');
process.exit(incidencies ? 1 : 0);
