// Escriu el resultat des de zero, mantenint el tipus i el format de cada columna.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var MIDA_TROS = 8 * 1024 * 1024, MAX_TEXT_CELLA = 32767;
  var RISC_FORMULA = /^[=+\-@\t\r]/;
  var NOMBRE_SIMPLE = /^[-+]?\d+([.,]\d+)?$/;
  var NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var DATA_FIXA = new Date(2000, 0, 1);
  var XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  var ESTIL_TEXT = 1, ESTIL_DATA = 2, ESTIL_DATA_HORA = 3, PRIMER_PROPI = 4;

  function concatena(trossos) {
    var total = trossos.reduce(function (s, t) { return s + t.length; }, 0);
    var resultat = new Uint8Array(total), posicio = 0;
    trossos.forEach(function (tros) { resultat.set(tros, posicio); posicio += tros.length; });
    return resultat;
  }

  function creaAcumulador() {
    var codificador = new TextEncoder(), trossos = [], actual = [], mida = 0;
    function buida() { if (actual.length) trossos.push(codificador.encode(actual.join(''))); actual = []; mida = 0; }
    return {
      afegeix: function (text) { actual.push(text); mida += text.length; if (mida >= MIDA_TROS) buida(); },
      acaba: function () { buida(); return concatena(trossos); }
    };
  }

  function lletresColumna(index) {
    var text = '', n = index + 1;
    while (n > 0) { var resta = (n - 1) % 26; text = String.fromCharCode(65 + resta) + text; n = (n - 1 - resta) / 26; }
    return text;
  }

  function atributXml(text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function textXml(text) {
    return text
      .replace(/_(?=x[0-9A-Fa-f]{4}_)/g, '_x005F_')
      .replace(/[\u0000-\u0008\u000B-\u001F￾￿]/g, function (c) { return '_x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '_'; })
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function dataASerial(data) {
    var dies = data.getTime() / 86400000 + 25569;
    return dies < 61 ? dies - 1 : dies;
  }

  function teHora(data) { return data.getTime() % 86400000 !== 0; }

  function creaEstils() {
    var propis = [], perClau = new Map();
    return {
      indexDe: function (format) {
        var clau = format.id !== undefined ? 'i' + format.id : 'c' + format.codi;
        if (!perClau.has(clau)) { perClau.set(clau, PRIMER_PROPI + propis.length); propis.push(format); }
        return perClau.get(clau);
      },
      xml: function () {
        var numFmts = ['<numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>', '<numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/>'];
        var xfs = propis.map(function (format, i) {
          var id = format.id;
          if (id === undefined) { id = 166 + i; numFmts.push('<numFmt numFmtId="' + id + '" formatCode="' + atributXml(format.codi) + '"/>'); }
          return '<xf numFmtId="' + id + '" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>';
        });
        return XML + '<styleSheet xmlns="' + NS_MAIN + '"><numFmts count="' + numFmts.length + '">' + numFmts.join('') + '</numFmts>' +
          '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="' + (PRIMER_PROPI + propis.length) + '">' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" quotePrefix="1"/>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          xfs.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
      }
    };
  }

  function cellaXlsx(valor, ref, estilColumna) {
    if (valor === null || valor === undefined) return '';
    var estil = estilColumna ? ' s="' + estilColumna + '"' : '';
    if (typeof valor === 'number') return isFinite(valor) ? '<c r="' + ref + '"' + estil + '><v>' + valor + '</v></c>' : '';
    if (typeof valor === 'boolean') return '<c r="' + ref + '" t="b"><v>' + (valor ? 1 : 0) + '</v></c>';
    if (valor instanceof Date) {
      var estilData = estilColumna || (teHora(valor) ? ESTIL_DATA_HORA : ESTIL_DATA);
      return '<c r="' + ref + '" s="' + estilData + '"><v>' + dataASerial(valor) + '</v></c>';
    }
    var text = String(valor).slice(0, MAX_TEXT_CELLA);
    var protegit = RISC_FORMULA.test(text) ? ' s="' + ESTIL_TEXT + '"' : '';
    return '<c r="' + ref + '"' + protegit + ' t="inlineStr"><is><t xml:space="preserve">' + textXml(text) + '</t></is></c>';
  }

  function fullXlsx(full, estils) {
    var acumulador = creaAcumulador();
    var numColumnes = full.titols.length;
    var refs = new Array(numColumnes), estilsCol = new Array(numColumnes);
    for (var c = 0; c < numColumnes; c++) {
      refs[c] = lletresColumna(c);
      estilsCol[c] = full.formats[c] ? estils.indexDe(full.formats[c]) : 0;
    }
    acumulador.afegeix(XML + '<worksheet xmlns="' + NS_MAIN + '"><sheetData><row r="1">');
    full.titols.forEach(function (titol, i) { acumulador.afegeix(cellaXlsx(titol, refs[i] + '1', 0)); });
    acumulador.afegeix('</row>');
    for (var f = 0; f < full.numFiles; f++) {
      var numero = f + 2, parts = ['<row r="' + numero + '">'];
      for (var k = 0; k < numColumnes; k++) parts.push(cellaXlsx(full.columnes[k][f], refs[k] + numero, estilsCol[k]));
      parts.push('</row>');
      acumulador.afegeix(parts.join(''));
    }
    acumulador.afegeix('</sheetData></worksheet>');
    return acumulador.acaba();
  }

  function nomsDePestanya(fulls) {
    var usats = new Set();
    return fulls.map(function (full, i) {
      var base = String(full.nom || ('Full ' + (i + 1))).replace(/[\[\]:*?/\\]/g, '_').slice(0, 31) || ('Full ' + (i + 1));
      var nom = base, n = 2;
      while (usats.has(nom.toLowerCase())) { nom = base.slice(0, 27) + ' (' + (n++) + ')'; }
      usats.add(nom.toLowerCase());
      return nom;
    });
  }

  // fulls: [{ nom, titols, numFiles, columnes: [[valors]], formats: [format|null] }]
  function xlsx(fulls) {
    var codifica = function (text) { return new TextEncoder().encode(text); };
    var estils = creaEstils(), noms = nomsDePestanya(fulls);
    var numeros = fulls.map(function (_, i) { return i + 1; });
    var entrades = {};
    fulls.forEach(function (full, i) { entrades['xl/worksheets/sheet' + (i + 1) + '.xml'] = fullXlsx(full, estils); });
    entrades['[Content_Types].xml'] = codifica(XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      numeros.map(function (n) { return '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>');
    entrades['_rels/.rels'] = codifica(XML + '<Relationships xmlns="' + NS_PKG + '"><Relationship Id="rId1" Type="' + NS_REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    entrades['xl/workbook.xml'] = codifica(XML + '<workbook xmlns="' + NS_MAIN + '" xmlns:r="' + NS_REL + '"><sheets>' +
      numeros.map(function (n, i) { return '<sheet name="' + atributXml(noms[i]) + '" sheetId="' + n + '" r:id="rId' + n + '"/>'; }).join('') + '</sheets></workbook>');
    entrades['xl/_rels/workbook.xml.rels'] = codifica(XML + '<Relationships xmlns="' + NS_PKG + '">' +
      numeros.map(function (n) { return '<Relationship Id="rId' + n + '" Type="' + NS_REL + '/worksheet" Target="worksheets/sheet' + n + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (fulls.length + 1) + '" Type="' + NS_REL + '/styles" Target="styles.xml"/></Relationships>');
    entrades['xl/styles.xml'] = codifica(estils.xml());
    return g.fflate.zipSync(entrades, { level: 1, mtime: DATA_FIXA });
  }

  function campCsv(valor, separador) {
    var text;
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'number') text = separador === ';' ? String(valor).replace('.', ',') : String(valor);
    else if (typeof valor === 'boolean') text = valor ? 'TRUE' : 'FALSE';
    else if (valor instanceof Date) text = valor.toISOString().slice(0, teHora(valor) ? 19 : 10).replace('T', ' ');
    else { text = String(valor); if (RISC_FORMULA.test(text) && !NOMBRE_SIMPLE.test(text)) text = '\'' + text; }
    if (text.indexOf(separador) >= 0 || /["\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function csv(full, separador) {
    var sep = separador || ';', acumulador = creaAcumulador();
    acumulador.afegeix('﻿' + full.titols.map(function (t) { return campCsv(t, sep); }).join(sep) + '\r\n');
    for (var f = 0; f < full.numFiles; f++) {
      var parts = new Array(full.columnes.length);
      for (var c = 0; c < full.columnes.length; c++) parts[c] = campCsv(full.columnes[c][f], sep);
      acumulador.afegeix(parts.join(sep) + '\r\n');
    }
    return acumulador.acaba();
  }

  GTP.escriptor = { xlsx: xlsx, csv: csv };
}(globalThis));
