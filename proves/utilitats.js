// Ajudes de les proves. Tots els fitxers es generen en temps d'execució amb dades inventades.
'use strict';
const path = require('path');

const src = path.join(__dirname, '..', 'src');
globalThis.fflate = require(path.join(src, 'vendor', 'fflate.js'));
['comu', 'xml', 'lector-zip', 'lector-xlsx', 'lector-ods', 'lector-csv', 'lector', 'deteccio', 'perfil', 'dades-inventades', 'generacio', 'escriptor', 'textos', 'motor']
  .forEach((m) => require(path.join(src, m + '.js')));

const GTP = globalThis.GTP;
const { zipSync, strToU8 } = globalThis.fflate;

function creaComprovador() {
  let fallades = 0, total = 0;
  return {
    comprova(ok, text, detall) {
      total++;
      if (!ok) { fallades++; console.log('✗ ' + text + (detall === undefined ? '' : ' → ' + JSON.stringify(detall))); }
    },
    igual(obtingut, esperat, text) {
      const a = JSON.stringify(obtingut), b = JSON.stringify(esperat);
      this.comprova(a === b, text, { obtingut: a, esperat: b });
    },
    errorDe(funcio, codi, text) {
      try { funcio(); this.comprova(false, text, 'no ha fallat'); } catch (e) { this.comprova(e.codi === codi, text, e.codi || e.message); }
    },
    acaba() {
      console.log(total + ' comprovacions, ' + fallades + ' fallades.');
      process.exit(fallades ? 1 : 0);
    }
  };
}

function zip(fitxers) {
  const entrades = {};
  for (const nom of Object.keys(fitxers)) entrades[nom] = typeof fitxers[nom] === 'string' ? strToU8(fitxers[nom]) : fitxers[nom];
  return zipSync(entrades);
}

const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';

// Crea un .xlsx mínim. fulls: [{ nom, xml, estat }]. extres: altres fitxers interns.
function creaXlsx({ fulls, cadenes, estils, llibrePr = '', extres = {} }) {
  const relacions = fulls.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`);
  if (cadenes) relacions.push(`<Relationship Id="rId100" Type="${NS}/sharedStrings" Target="sharedStrings.xml"/>`);
  if (estils) relacions.push(`<Relationship Id="rId101" Type="${NS}/styles" Target="/xl/styles.xml"/>`);
  const fitxers = {
    '_rels/.rels': `<Relationships xmlns="${NS_PKG}"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns:r="${NS}">${llibrePr}<sheets>${fulls.map((f, i) => `<sheet name="${f.nom}" sheetId="${i + 1}" r:id="rId${i + 1}"${f.estat ? ` state="${f.estat}"` : ''}/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${NS_PKG}">${relacions.join('')}</Relationships>`
  };
  fulls.forEach((f, i) => { fitxers[`xl/worksheets/sheet${i + 1}.xml`] = f.xml; });
  if (cadenes) fitxers['xl/sharedStrings.xml'] = cadenes;
  if (estils) fitxers['xl/styles.xml'] = estils;
  return zip(Object.assign(fitxers, extres));
}

function creaOds(cos, estilsAuto = '') {
  return zip({
    mimetype: 'application/vnd.oasis.opendocument.spreadsheet',
    'META-INF/manifest.xml': '<manifest:manifest xmlns:manifest="urn:x"/>',
    'content.xml': `<?xml version="1.0"?><office:document-content xmlns:office="o" xmlns:table="t" xmlns:text="x" xmlns:style="s" xmlns:calcext="c"><office:automatic-styles>${estilsAuto}</office:automatic-styles><office:body><office:spreadsheet>${cos}</office:spreadsheet></office:body></office:document-content>`
  });
}

// DNI inventat amb la lletra correcta, calculat aquí perquè el repositori no en contingui cap.
function dniInventat(numero) {
  return String(numero).padStart(8, '0') + 'TRWAGMYFPDXBNJZSQVHLCKE'[numero % 23];
}

module.exports = { GTP, creaComprovador, creaXlsx, creaOds, zip, dniInventat, strToU8 };
