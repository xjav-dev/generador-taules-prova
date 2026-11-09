#!/usr/bin/env node
// Comprova que del fitxer original només en passi la forma. Tot són dades inventades.
'use strict';
const { GTP, creaComprovador, creaXlsx, dniInventat, strToU8 } = require('./utilitats');
const t = creaComprovador();
const D = GTP.deteccio;
const { unzipSync, strFromU8 } = globalThis.fflate;

const celles = (fila, valors, estils = {}) => `<row r="${fila}">${valors.map((v, i) => {
  const ref = String.fromCharCode(65 + i) + fila;
  if (v === null) return '';
  if (typeof v === 'number') return `<c r="${ref}"${estils[i] ? ` s="${estils[i]}"` : ''}><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`;
}).join('')}</row>`;

const dnis = Array.from({ length: 40 }, (_, i) => dniInventat(30000000 + i * 7));
const NOMS_REALS = 'Xènia Ysern Zapatero Quintana';
const titols = ['Nom', 'DNI', 'Correu', 'Telèfon', 'Data de naixement', 'Codi postal', 'Municipi', 'Curs', 'Nota', 'Quantitat', 'Observacions', 'Referència', 'Diversos'];
const fileres = [];
for (let i = 0; i < 40; i++) {
  fileres.push(celles(i + 3, [
    NOMS_REALS.split(' ')[i % 2] + ' ' + NOMS_REALS.split(' ')[2 + (i % 2)] + ' ' + i, dnis[i], 'real' + i + '@escola-real.cat', '612 000 ' + String(100 + i), 40000 + i * 3,
    '0822' + (i % 7), 'Poble Secret', i === 0 ? 'Curs únic secret' : (i % 2 ? '1r ESO' : '2n ESO'), 5 + (i % 5) + 0.25, i === 7 ? 999999 : 100 + i,
    'Comentari molt privat sobre una situació ' + i, 'REF-' + String(1000 + i), i % 3 ? 'paraula' + i + ' lliure' : null
  ], { 4: 1, 8: 2, 9: 3 }));
}
fileres.push(celles(43, ['Fila Amagada', dniInventat(99999999)]).replace('<row r="43"', '<row r="43" hidden="1"'));
const estils = '<styleSheet><numFmts count="2"><numFmt numFmtId="170" formatCode="dd/mm/yyyy"/><numFmt numFmtId="171" formatCode="#,##0.00"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="170"/><xf numFmtId="2"/><xf numFmtId="171"/></cellXfs></styleSheet>';
const llibreXlsx = creaXlsx({
  estils,
  fulls: [
    { nom: 'Alumnat', xml: `<worksheet><cols><col min="14" max="14" hidden="1"/></cols><sheetData>${celles(1, ['Títol secret del document'])}${celles(2, titols)}${fileres.join('')}</sheetData></worksheet>` },
    { nom: 'Matrícules', xml: `<worksheet><sheetData>${celles(1, ['DNI', 'Import'])}${dnis.slice(0, 20).map((d, i) => celles(i + 2, [d, 100 + i])).join('')}</sheetData></worksheet>` },
    { nom: 'Oculta', estat: 'hidden', xml: `<worksheet><sheetData>${celles(1, ['Secret', 'Altre'])}${celles(2, ['DadaPestanyaOculta', 'x'])}</sheetData></worksheet>` }
  ],
  extres: { 'docProps/core.xml': '<core>AutorSecret</core>', 'xl/comments1.xml': '<c>ComentariSecret</c>' }
});

const v = GTP.motor.executa('obre', { bytes: llibreXlsx.buffer.slice(llibreXlsx.byteOffset, llibreXlsx.byteOffset + llibreXlsx.byteLength), nom: 'privat.xlsx' });
const full = v.fulls[0];
const tipus = Object.fromEntries(full.columnes.map((c) => [c.titol, c.tipus]));
t.igual(tipus, { Nom: 'nomComplet', DNI: 'dni', Correu: 'correu', 'Telèfon': 'telefon', 'Data de naixement': 'data', 'Codi postal': 'codiPostal', Municipi: 'municipi', Curs: 'categoria', Nota: 'nombre', Quantitat: 'nombre', Observacions: 'text', 'Referència': 'patro', Diversos: 'text' }, 'detecta els tipus sense preguntar');
t.igual(v.fulls.map((f) => f.nom), ['Alumnat', 'Matrícules'], 'no inclou pestanyes amagades');
t.igual(full.numFiles, 40, 'mateix nombre de files, sense les amagades');
t.igual(full.files.length, 40, 'vista limitada');

const { fitxer } = GTP.motor.executa('exporta');
const bytes = fitxer.bytes;
t.comprova(/^taula-prova_\d{4}-\d{2}-\d{2}\.xlsx$/.test(fitxer.nom), 'nom genèric');
const interns = unzipSync(bytes);
const tot = Object.values(interns).map((b) => strFromU8(b)).join('\n');
['Títol secret', 'Xènia', 'Ysern', 'escola-real', '612 000', 'Poble Secret', 'Curs únic secret', 'molt privat', 'REF-1', 'paraula1', 'Fila Amagada', 'DadaPestanyaOculta', 'AutorSecret', 'ComentariSecret', '999999'].forEach((s) => t.comprova(!tot.includes(s), 'cap rastre de: ' + s));
dnis.forEach((d) => t.comprova(!tot.includes(d), 'cap DNI original'));
t.comprova(Object.keys(interns).every((n) => /^(\[Content_Types\]|_rels\/\.rels|xl\/(workbook|styles|_rels\/workbook\.xml|worksheets\/sheet\d+))/.test(n)), 'només les parts imprescindibles');

const llegit = GTP.lector.llegeix(bytes, 'a.xlsx').fulls;
const files = llegit[0].files;
const idx = Object.fromEntries(files[0].map((h, i) => [h, i]));
const col = (nom) => files.slice(1).map((f) => f[idx[nom]]);
t.igual(files[0], titols, 'mateixos títols i ordre');
t.igual(files.length, 41, 'files correctes');
t.comprova(col('DNI').every(D.esDniNie), 'DNI amb lletra vàlida');
t.igual(new Set(col('DNI')).size, 40, 'DNI únics');
t.comprova(col('Correu').every((c) => /@example\.org$/.test(c)), 'correus a example.org');
t.comprova(col('Telèfon').every((c) => /^612 \d{3} \d{3}$|^6\d\d \d{3} \d{3}$/.test(c)), 'telèfons amb el mateix patró', col('Telèfon').slice(0, 2));
t.comprova(col('Codi postal').every((c) => /^\d{5}$/.test(c)), 'codi postal de cinc xifres');
t.comprova(col('Data de naixement').every((d) => d instanceof Date), 'les dates continuen sent dates');
t.comprova(col('Nota').every((n) => typeof n === 'number'), 'els nombres continuen sent nombres');
t.comprova(col('Quantitat').every((n) => n < 1000), 'un valor extrem no defineix el rang', Math.max(...col('Quantitat')));
t.igual([...new Set(col('Curs'))].sort(), ['1r ESO', '2n ESO'], 'només categories admeses');
t.comprova(col('Referència').every((r) => /^[A-Z]{3}-\d{4}$/.test(r)), 'codi amb el mateix patró', col('Referència').slice(0, 2));
t.comprova(/numFmt numFmtId="\d+" formatCode="dd\/mm\/yyyy"/.test(strFromU8(interns['xl/styles.xml'])) && /#,##0\.00/.test(strFromU8(interns['xl/styles.xml'])), 'conserva els formats de data i nombre');

// R7 coherència
const fila = files[1], nomF = fila[idx.Nom], correuF = fila[idx.Correu];
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
t.comprova(correuF.startsWith(slug(nomF.split(' ')[0]) + '.' + slug(nomF.split(' ')[1])), 'el correu surt del nom de la fila', [nomF, correuF]);
const llocs = new Map(GTP.inventades.llocs.map((l) => [l[0], l]));
t.comprova(files.slice(1).every((f) => { const l = llocs.get(f[idx.Municipi]); const cp = Number(f[idx['Codi postal']]); return l && cp >= l[1] && cp <= l[2]; }), 'el codi postal és del municipi');

// R14 text
const obs = col('Observacions');
t.comprova(obs.every((o, i) => o.replace(/\.$/, '').split(' ').length === 'Comentari molt privat sobre una situació X'.split(' ').length), 'mateix nombre de paraules');
t.comprova(new Set(obs.map((o) => o.split(' ')[0].toLowerCase())).size > 5, 'els textos no comencen sempre igual');
t.comprova(obs.every((o) => /^[A-Z]/.test(o) && o.endsWith('.')), 'textos ben formats');
// R9 relació entre pestanyes
const conjuntA = new Set(col('DNI'));
const dnisB = llegit[1].files.slice(1).map((f) => f[0]);
t.comprova(dnisB.every((d) => conjuntA.has(d)), 'les pestanyes es poden encreuar');
t.igual(new Set(dnisB).size, 20, 'mateix nombre de valors a la segona pestanya');

// Unitat: buides i repeticions
const creaPerfil = (filesT, op) => GTP.perfil.crea({ fulls: [{ nom: 'A', amagat: false, files: filesT, columnesAmagades: new Set(), filesAmagades: new Set(), formats: {} }] }, op);
const gran = [['Codi persona', 'Extra']].concat(Array.from({ length: 200 }, (_, i) => ['P-' + String(i % 10).padStart(4, '0'), i % 2 ? null : 'hola']));
const est = GTP.generacio.crea(creaPerfil(gran));
t.igual(new Set(est.fulls[0].valors[0]).size, 10, 'es manté el nombre de valors distints');
const buides = est.fulls[0].valors[1].filter((x) => x === null).length;
t.comprova(buides > 60 && buides < 140, 'proporció de buides semblant', buides);

// R12 sense títols
const senseTitols = creaPerfil([[dniInventat(12345678), 'real@escola.cat'], [dniInventat(23456789), 'altre@escola.cat']]);
t.igual(senseTitols.fulls[0].columnes.map((c) => c.titol), ['Columna 1', 'Columna 2'], 'si la primera fila són dades, no es fan servir com a títols');
t.igual(senseTitols.fulls[0].numFiles, 2, 'i es compten com a files');

// Perfil sense dades
const perfilText = JSON.stringify(creaPerfil([['Nom', 'Observacions'], ['Secretíssima Persona', 'text molt secret'], ['Altra Secreta', 'mes coses']]), (k, v) => (v instanceof Set ? [...v] : v));
t.comprova(!/Secret|secret|coses/.test(perfilText), 'el perfil no conté valors');

// R10 segona passada
GTP.motor.executa('obre', { bytes: llibreXlsx.buffer.slice(llibreXlsx.byteOffset, llibreXlsx.byteOffset + llibreXlsx.byteLength), nom: 'privat.xlsx' });
const abans = GTP.motor.executa('regeneraTot').fulls[0];
const despres = GTP.motor.executa('canvia', { full: 0, columna: 9, canvi: { tipus: 'buida' } }).fulls[0];
t.comprova(despres.files.every((f) => f[9] === ''), 'la columna indicada canvia');
t.comprova(despres.files.every((f, i) => f[0] === abans.files[i][0] && f[1] === abans.files[i][1]), 'la resta no canvia');
const eliminat = GTP.motor.executa('canvia', { full: 0, columna: 10, canvi: { tipus: 'eliminar' } });
const reescrit = GTP.lector.llegeix(GTP.motor.executa('exporta').fitxer.bytes, 'a.xlsx').fulls[0].files[0];
t.comprova(!reescrit.includes('Observacions') && reescrit.length === 12, 'eliminar treu la columna');
t.comprova(!eliminat.copiats.titols.includes('Observacions'), 'la llista de títols copiats s\'actualitza');
const titolNou = GTP.motor.executa('canvia', { full: 0, columna: 0, canvi: { titol: 'Persona' } });
t.igual(titolNou.fulls[0].columnes[0].titol, 'Persona', 'canviar el títol');
t.igual(titolNou.fulls[0].files[0][0], despres.files[0][0], 'canviar el títol no regenera');
const canvi = GTP.motor.executa('canvia', { full: 0, columna: 8, canvi: { tipus: 'telefon' } });
t.comprova(/^6/.test(canvi.fulls[0].files[0][8]), 'canviar de tipus usa valors per defecte');

// CSV
const csvBytes = strToU8('Nom;Import;Data;Observacions\nAnna Puig;12,50;01/03/2012;Text privat aquí\nJoan Vall;7,25;02/03/2012;Un altre\nPere Riu;3,75;03/03/2012;Més coses\n');
const vc = GTP.motor.executa('obre', { bytes: csvBytes.buffer.slice(csvBytes.byteOffset, csvBytes.byteOffset + csvBytes.byteLength), nom: 'a.csv' });
t.igual(vc.format, 'csv', 'un csv torna a ser csv');
const sortidaCsv = new TextDecoder().decode(GTP.motor.executa('exporta').fitxer.bytes).trim().split('\r\n').map((l) => l.split(';'));
t.igual(sortidaCsv[0], ['Nom', 'Import', 'Data', 'Observacions'], 'títols del csv');
t.comprova(sortidaCsv.slice(1).every((f) => /^\d+,\d{2}$/.test(f[1]) && /^\d{2}\/\d{2}\/\d{4}$/.test(f[2])), 'mateix format de text', sortidaCsv[1]);
t.comprova(!sortidaCsv.flat().some((x) => /Anna|Joan|Pere|privat/.test(x)), 'sense valors originals');

// Un format General (LibreOffice el desa com a format propi) no ha de convertir dates en nombres.
const ambGeneral = creaXlsx({
  estils: '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="General"/></numFmts><cellXfs><xf numFmtId="164"/><xf numFmtId="14"/></cellXfs></styleSheet>',
  fulls: [{ nom: 'A', xml: '<worksheet><sheetData>' + celles(1, ['Títol solt']) + celles(2, ['Quan', 'Què']) + Array.from({ length: 6 }, (_, i) => celles(i + 3, [40000 + i, 'x' + i], { 0: 1 })).join('') + '</sheetData></worksheet>' }]
});
GTP.motor.executa('obre', { bytes: ambGeneral.buffer.slice(ambGeneral.byteOffset, ambGeneral.byteOffset + ambGeneral.byteLength), nom: 'a.xlsx' });
const datesG = GTP.lector.llegeix(GTP.motor.executa('exporta').fitxer.bytes, 'a.xlsx').fulls[0].files.slice(1).map((f) => f[0]);
t.comprova(datesG.every((d) => d instanceof Date), 'les dates no es converteixen en nombres', datesG.slice(0, 2));

// Escriptor
const risc = GTP.escriptor.xlsx([{ nom: 'A/B', titols: ['=T'], numFiles: 2, columnes: [['=1+1', '@x']], formats: [null] }]);
const lr = GTP.lector.llegeix(risc, 'a.xlsx').fulls[0];
t.igual([lr.nom, lr.files[1][0]], ['A_B', '=1+1'], 'text com a fórmula i nom de pestanya vàlid');
t.comprova(/s="1" t="inlineStr"/.test(strFromU8(unzipSync(risc)['xl/worksheets/sheet1.xml'])), 'estil de text protegit');
t.comprova(new TextDecoder().decode(GTP.escriptor.csv({ titols: ['a'], numFiles: 1, columnes: [['=1+1']] }, ';')).includes('\'=1+1'), 'csv neutralitza');

t.acaba();
