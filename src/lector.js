// Tria el lector segons el contingut real del fitxer, no només per l'extensió.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var MIME_ODS = 'application/vnd.oasis.opendocument.spreadsheet';

  function comencaAmb(bytes, signatura) {
    return signatura.every(function (b, i) { return bytes[i] === b; });
  }

  function llegeix(bytes, nomFitxer, opcions) {
    if (comencaAmb(bytes, [0xD0, 0xCF, 0x11, 0xE0])) throw new GTP.ErrorLectura('protegit-o-antic');
    if (comencaAmb(bytes, [0x50, 0x4B])) {
      var noms = GTP.zip.noms(bytes);
      if (noms.indexOf('xl/workbook.bin') >= 0) throw new GTP.ErrorLectura('format-no-admes');
      if (noms.indexOf('_rels/.rels') >= 0) return GTP.lectorXlsx.llegeix(bytes, opcions);
      if (noms.indexOf('content.xml') >= 0) {
        var mime = noms.indexOf('mimetype') >= 0 ? GTP.zip.text(GTP.zip.extreu(bytes, ['mimetype']).mimetype).trim() : '';
        if (mime.indexOf(MIME_ODS) === 0) return GTP.lectorOds.llegeix(bytes, opcions);
      }
      throw new GTP.ErrorLectura('format-no-admes');
    }
    if (/\.(csv|tsv|txt)$/i.test(nomFitxer || '')) return GTP.lectorCsv.llegeix(bytes);
    throw new GTP.ErrorLectura('format-no-admes');
  }

  GTP.lector = { llegeix: llegeix };
}(globalThis));
