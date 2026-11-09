#!/usr/bin/env node
'use strict';
const { GTP, creaComprovador, creaXlsx, creaOds, zip, strToU8 } = require('./utilitats');
const t = creaComprovador();
const llegeix = (bytes, nom, op) => GTP.lector.llegeix(bytes, nom, op);
const iso = (d) => d.toISOString().slice(0, 10);

// --- XLSX ---
const cadenes = `<sst><si><t>Nom</t></si><si><r><t>Joa</t></r><r><t>n</t></r><rPh><t>FONETICA</t></rPh></si><si><t>a&amp;b_x000D_c</t></si><si><t></t></si></sst>`;
const estils = `<styleSheet><numFmts><numFmt numFmtId="170" formatCode="dd/mm/yyyy"/><numFmt numFmtId="171" formatCode="&quot;dies&quot; 0"/><numFmt numFmtId="172" formatCode="h:mm"/></numFmts>
<cellStyleXfs><xf numFmtId="14"/></cellStyleXfs><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="170"/><xf numFmtId="171"/><xf numFmtId="172"/></cellXfs></styleSheet>`;
const llibre = llegeix(creaXlsx({
  cadenes, estils,
  fulls: [
    { nom: 'Visible', xml: `<worksheet><cols><col min="3" max="4" hidden="1"/></cols><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>2</v></c></row>
      <row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>7.5</v></c><c r="C2" s="1"><v>44927</v></c><c r="D2" s="2"><v>44927</v></c><c r="E2" s="3"><v>12</v></c><c r="F2" s="4"><v>0.5</v></c></row>
      <row r="3" hidden="1"><c r="A3" t="b"><v>1</v></c><c r="B3" t="e"><v>#REF!</v></c><c r="C3"><f>A1</f></c><c r="D3" t="str"><f>A1</f><v>Calculat</v></c><c r="E3" t="inlineStr"><is><t>En línia</t></is></c></row>
      <row><c t="s"><v>3</v></c><c><v>1</v></c><c><v>2</v></c></row>
    </sheetData></worksheet>` },
    { nom: 'Oculta', estat: 'veryHidden', xml: `<x:worksheet xmlns:x="u"><x:sheetData><x:row r="1"><x:c r="B1"><x:v>9</x:v></x:c></x:row></x:sheetData></x:worksheet>` }
  ],
  extres: { 'xl/comments1.xml': '<comments>SECRET</comments>', 'docProps/core.xml': '<core>Autor</core>' }
}), 'a.xlsx');
const f = llibre.fulls[0].files;
t.igual(llibre.fulls.map((x) => [x.nom, x.amagat]), [['Visible', false], ['Oculta', true]], 'xlsx: pestanyes i ocultació');
t.igual(f[0][0], 'Nom', 'xlsx: cadena compartida');
t.igual(f[0][2], 'a&b\rc', 'xlsx: entitats i escapes _x000D_');
t.igual(f[1][0], 'Joan', 'xlsx: text enriquit sense fonètica');
t.igual(f[1][1], 7.5, 'xlsx: nombre');
t.igual(iso(f[1][2]), '2023-01-01', 'xlsx: data per format integrat');
t.igual(iso(f[1][3]), '2023-01-01', 'xlsx: data per format propi');
t.igual(f[1][4], 12, 'xlsx: un literal entre cometes no fa de data');
t.igual(f[1][5], 0.5, 'xlsx: una hora no es converteix en data');
t.igual([f[2][0], f[2][1], f[2][2], f[2][3], f[2][4]], [true, undefined, undefined, 'Calculat', 'En línia'], 'xlsx: booleà, error, fórmula sense valor, fórmula i text en línia');
t.igual(llibre.avisos, { errors: 1, senseValor: 1 }, 'xlsx: avisos');
t.igual([f[3][0], f[3][1], f[3][2]], [undefined, 1, 2], 'xlsx: fila i cel·les sense referència');
t.igual([...llibre.fulls[0].columnesAmagades], [2, 3], 'xlsx: columnes amagades');
t.igual([...llibre.fulls[0].filesAmagades], [2], 'xlsx: files amagades');
t.igual(llibre.fulls[1].files[0][1], 9, 'xlsx: espais de noms amb prefix');
t.comprova(!JSON.stringify(llibre).includes('SECRET') && !JSON.stringify(llibre).includes('FONETICA'), 'xlsx: no llegeix comentaris ni fonètica');

const d1904 = llegeix(creaXlsx({
  estils, llibrePr: '<workbookPr date1904="1"/>',
  fulls: [{ nom: 'A', xml: '<worksheet><sheetData><row r="1"><c r="A1" s="1"><v>43465</v></c></row></sheetData></worksheet>' }]
}), 'b.xlsx');
t.igual(iso(d1904.fulls[0].files[0][0]), '2023-01-01', 'xlsx: sistema de dates 1904');
const d1900 = llegeix(creaXlsx({
  estils, fulls: [{ nom: 'A', xml: '<worksheet><sheetData><row r="1"><c r="A1" s="1"><v>59</v></c><c r="B1" s="1"><v>61</v></c></row></sheetData></worksheet>' }]
}), 'c.xlsx');
t.igual(d1900.fulls[0].files[0].map(iso), ['1900-02-28', '1900-03-01'], 'xlsx: error del 29 de febrer de 1900');

// --- Seguretat del lector ---
t.errorDe(() => llegeix(new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 1, 2]), 'a.xlsx'), 'protegit-o-antic', 'rebutja protegits i .xls');
t.errorDe(() => llegeix(strToU8('hola'), 'a.pdf'), 'format-no-admes', 'rebutja formats desconeguts');
t.errorDe(() => llegeix(zip({ 'a.txt': 'x' }), 'a.xlsx'), 'format-no-admes', 'rebutja un zip que no és un full');
t.errorDe(() => llegeix(zip({ 'xl/workbook.bin': 'x', '_rels/.rels': '' }), 'a.xlsb'), 'format-no-admes', 'rebutja .xlsb');
t.errorDe(() => llegeix(strToU8('PKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'), 'a.xlsx'), 'fitxer-malmes', 'zip malmès');
const ambDoctype = creaXlsx({ fulls: [{ nom: 'A', xml: '<!DOCTYPE x [<!ENTITY a "b">]><worksheet><sheetData/></worksheet>' }] });
t.errorDe(() => llegeix(ambDoctype, 'a.xlsx'), 'xml-no-permes', 'rebutja DOCTYPE');
const grossa = creaXlsx({ fulls: [{ nom: 'A', xml: '<worksheet><sheetData>' + ' '.repeat(5000) + '</sheetData></worksheet>' }] });
t.errorDe(() => llegeix(grossa, 'a.xlsx', { limitEntrada: 2000 }), 'massa-gran', 'rebutja entrades que declaren massa mida');
t.errorDe(() => llegeix(creaXlsx({ fulls: [{ nom: 'A', xml: '<worksheet><sheetData><row r="9999999"/></sheetData></worksheet>' }] }), 'a.xlsx'), 'fitxer-malmes', 'rebutja files fora de límit');
t.errorDe(() => llegeix(creaXlsx({ fulls: [{ nom: 'A', xml: '<worksheet><sheetData><row r="1"' }] }), 'a.xlsx'), 'fitxer-malmes', 'XML truncat');

t.errorDe(() => llegeix(creaXlsx({ fulls: [{ nom: 'A', xml: '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c></row>' }] }), 'a.xlsx'), 'fitxer-malmes', 'XML retallat en un punt on les etiquetes són correctes');

// --- ODS ---
const ods = llegeix(creaOds(`
  <table:table table:name="Dades"><table:table-column table:number-columns-repeated="2"/><table:table-column table:visibility="collapse"/>
    <table:table-header-rows><table:table-row>
      <table:table-cell office:value-type="string"><text:p>Nom<text:s text:c="2"/>complet</text:p></table:table-cell>
      <table:table-cell office:value-type="float" office:value="3.5"><text:p>3,5</text:p></table:table-cell>
      <table:table-cell office:value-type="date" office:date-value="2023-01-02"><text:p>02/01/23</text:p></table:table-cell>
      <table:table-cell office:value-type="boolean" office:boolean-value="true"><text:p>CERT</text:p></table:table-cell>
    </table:table-row></table:table-header-rows>
    <table:table-row table:visibility="collapse">
      <table:table-cell office:value-type="string" table:number-columns-repeated="2"><office:annotation><text:p>COMENTARI</text:p></office:annotation><text:p>Línia 1</text:p><text:p>Línia 2</text:p></table:table-cell>
      <table:covered-table-cell/>
      <table:table-cell table:formula="of:=A1"/>
      <table:table-cell table:formula="of:=1/0" calcext:value-type="error" office:value-type="string"><text:p>#DIV/0!</text:p></table:table-cell>
    </table:table-row>
    <table:table-row table:number-rows-repeated="1000000"><table:table-cell table:number-columns-repeated="1024"/></table:table-row>
    <table:table-row table:number-rows-repeated="2"><table:table-cell office:value-type="float" office:value="1"><draw:frame><text:p>FORMA</text:p></draw:frame><text:p>1</text:p></table:table-cell></table:table-row>
  </table:table>
  <table:table table:name="Amagat" table:style-name="ta2"><table:table-row><table:table-cell office:value-type="string" office:string-value="Valor"/></table:table-row></table:table>
`, '<style:style style:name="ta2" style:family="table"><style:table-properties table:display="false"/></style:style>'), 'a.ods');
const of = ods.fulls[0];
t.igual(of.files[0].slice(0, 2), ['Nom  complet', 3.5], 'ods: text amb espais i nombre');
t.igual(iso(of.files[0][2]), '2023-01-02', 'ods: data');
t.igual(of.files[0][3], true, 'ods: booleà');
t.igual(of.files[1].slice(0, 2), ['Línia 1\nLínia 2', 'Línia 1\nLínia 2'], 'ods: paràgrafs i columnes repetides, sense comentari');
t.igual(ods.avisos, { errors: 1, senseValor: 1 }, 'ods: avisos');
t.igual([...of.columnesAmagades], [2], 'ods: columna amagada');
t.igual([...of.filesAmagades], [1], 'ods: fila amagada');
t.igual([of.files[1000002][0], of.files[1000003][0]], [1, 1], 'ods: files repetides sense expandir les buides');
t.comprova(!JSON.stringify(ods).includes('COMENTARI') && !JSON.stringify(ods).includes('FORMA'), 'ods: no llegeix comentaris ni formes');
t.igual([ods.fulls[1].amagat, ods.fulls[1].files[0][0]], [true, 'Valor'], 'ods: pestanya amagada');
t.errorDe(() => llegeix(zip({ mimetype: 'application/vnd.oasis.opendocument.spreadsheet', 'META-INF/manifest.xml': '<m><encryption-data/></m>', 'content.xml': 'x' }), 'a.ods'), 'protegit-o-antic', 'ods: rebutja xifrats');
t.errorDe(() => llegeix(creaOds('<table:table table:name="A"><table:table-row table:number-rows-repeated="99999999"><table:table-cell office:value-type="float" office:value="1"/></table:table-row></table:table>'), 'a.ods'), 'massa-gran', 'ods: repeticions desmesurades');

// --- CSV ---
const csv = (text, nom) => llegeix(strToU8(text), nom || 'a.csv').fulls[0].files;
t.igual(csv('a;b;c\r\n1;"x;y";\r\n'), [['a', 'b', 'c'], ['1', 'x;y', null]], 'csv: punt i coma, cometes i buit');
t.igual(csv('a,b\n"c ""d""",\n'), [['a', 'b'], ['c "d"', null]], 'csv: coma i cometes dobles');
t.igual(csv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']], 'csv: tabulador sense salt final');
t.igual(csv('sep=|\na|b\n'), [['a', 'b']], 'csv: directiva sep=');
t.igual(csv('a,b\n"línia\n2",1\n'), [['a', 'b'], ['línia\n2', '1']], 'csv: salt de línia dins de cometes');
t.igual(csv('codi;nom\n00123;x\n'), [['codi', 'nom'], ['00123', 'x']], 'csv: conserva els zeros');
t.igual(csv('﻿a;b\n'), [['a', 'b']], 'csv: BOM');
t.igual(llegeix(new Uint8Array([0x63, 0x61, 0xE7, 0x3B, 0x62, 0x0A]), 'a.csv').fulls[0].files, [['caç', 'b']], 'csv: Windows-1252');

t.acaba();
