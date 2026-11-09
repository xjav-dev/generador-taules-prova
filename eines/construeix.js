#!/usr/bin/env node
// Genera dist/generador-taules-prova.html: un sol fitxer amb estils i codi inclosos i
// una CSP amb hash que només permet executar aquest codi i bloqueja tota connexió.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const arrel = path.join(__dirname, '..');
const llegeix = (fitxer) => fs.readFileSync(path.join(arrel, fitxer), 'utf8');
const hash = (text) => "'sha256-" + crypto.createHash('sha256').update(text, 'utf8').digest('base64') + "'";

// L'ordre importa: textos.js i la versió han d'existir abans que app.js.
const FITXERS_CODI = [
  'src/vendor/fflate.js', 'src/comu.js', 'src/xml.js', 'src/lector-zip.js', 'src/lector-xlsx.js',
  'src/lector-ods.js', 'src/lector-csv.js', 'src/lector.js', 'src/deteccio.js', 'src/perfil.js', 'src/dades-inventades.js',
  'src/generacio.js', 'src/escriptor.js', 'src/textos.js', 'src/motor.js', 'src/app.js'
];

const { version } = JSON.parse(llegeix('package.json'));
const avisLlicencia = '/*! fflate · ' + llegeix('src/vendor/fflate.LICENSE').replace(/\*\//g, '') + '*/';
const codi = [avisLlicencia, 'var VERSIO = ' + JSON.stringify(version) + ';']
  .concat(FITXERS_CODI.map(llegeix))
  .join('\n')
  .replace(/<\/(script)/gi, '<\\/$1');
const estils = llegeix('src/estils.css');

const csp = [
  "default-src 'none'",
  'script-src ' + hash(codi),
  'style-src ' + hash(estils),
  'worker-src blob:',
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

// Funcions de substitució: així un «$» dins del codi no s'interpreta com a patró.
const html = llegeix('src/index.html')
  .replace('{{CSP}}', () => csp)
  .replace('{{ESTILS}}', () => estils)
  .replace('{{SCRIPTS}}', () => codi);

fs.mkdirSync(path.join(arrel, 'dist'), { recursive: true });
const sortida = path.join(arrel, 'dist', 'generador-taules-prova.html');
fs.writeFileSync(sortida, html);
console.log('Generat dist/generador-taules-prova.html · v' + version + ' · ' + Math.round(html.length / 1024) + ' KB');
