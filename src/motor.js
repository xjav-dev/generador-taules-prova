// Fa la feina pesada, en segon pla si el navegador ho permet. La pantalla només rep el resultat.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var FILES_VISTA = 50;
  var estat = null;

  function vistaFull(f) {
    var perfil = estat.perfil.fulls[f], valors = estat.fulls[f].valors;
    var files = [];
    for (var i = 0; i < Math.min(perfil.numFiles, FILES_VISTA); i++) {
      files.push(valors.map(function (columna) { return GTP.textCella(columna[i]); }));
    }
    return { nom: perfil.nom, numFiles: perfil.numFiles, columnes: perfil.columnes.map(function (c) { return { titol: c.titol, tipus: c.tipus }; }), files: files };
  }

  function vista() {
    var pestanyes = [], titols = new Set(), categories = new Set();
    estat.perfil.fulls.forEach(function (full) {
      pestanyes.push(full.nom);
      full.columnes.forEach(function (c) {
        if (c.tipus === 'eliminar') return;
        titols.add(c.titol);
        if (c.tipus === 'categoria' && c.categories) c.categories.forEach(function (x) { categories.add(GTP.textCella(x.valor)); });
      });
    });
    return {
      fulls: estat.perfil.fulls.map(function (_, f) { return vistaFull(f); }),
      copiats: { pestanyes: pestanyes, titols: Array.from(titols), categories: Array.from(categories) },
      format: estat.perfil.origen === 'csv' ? 'csv' : 'xlsx'
    };
  }

  function obre(dades) {
    estat = null;
    var llibre = GTP.lector.llegeix(new Uint8Array(dades.bytes), dades.nom);
    var origen = /\.(csv|tsv|txt)$/i.test(dades.nom) ? 'csv' : 'xlsx';
    var perfil = GTP.perfil.crea(llibre, { origen: origen, separador: llibre.separador });
    llibre = null;
    estat = GTP.generacio.crea(perfil);
    return vista();
  }

  function regeneraTot() { GTP.generacio.regeneraTot(estat); return vista(); }

  function canvia(dades) {
    GTP.generacio.canviaColumna(estat, dades.full, dades.columna, dades.canvi);
    return vista();
  }

  function formatDe(col) {
    if (col.format) return col.format;
    if (col.tipus === 'codiPostal' && col.numeric) return { codi: '00000' };
    return null;
  }

  function dataAvui() {
    var ara = new Date();
    return ara.getFullYear() + '-' + String(ara.getMonth() + 1).padStart(2, '0') + '-' + String(ara.getDate()).padStart(2, '0');
  }

  function exporta() {
    var fulls = estat.perfil.fulls.map(function (full, f) {
      var indexos = full.columnes.map(function (_, c) { return c; }).filter(function (c) { return full.columnes[c].tipus !== 'eliminar'; });
      return {
        nom: full.nom, numFiles: full.numFiles,
        titols: indexos.map(function (c) { return full.columnes[c].titol; }),
        columnes: indexos.map(function (c) { return estat.fulls[f].valors[c]; }),
        formats: indexos.map(function (c) { return formatDe(full.columnes[c]); })
      };
    });
    var esCsv = estat.perfil.origen === 'csv';
    return {
      fitxer: {
        nom: 'taula-prova_' + dataAvui() + (esCsv ? '.csv' : '.xlsx'),
        bytes: esCsv ? GTP.escriptor.csv(fulls[0], estat.perfil.separador) : GTP.escriptor.xlsx(fulls),
        mime: esCsv ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    };
  }

  var ORDRES = { obre: obre, regeneraTot: regeneraTot, canvia: canvia, exporta: exporta, tanca: function () { estat = null; return {}; }, hola: function () { return {}; } };

  function executa(ordre, dades) { return ORDRES[ordre](dades || {}); }

  function escolta() {
    g.onmessage = function (e) {
      var id = e.data.id;
      try {
        var resultat = executa(e.data.ordre, e.data.dades);
        g.postMessage({ id: id, resultat: resultat }, resultat.fitxer ? [resultat.fitxer.bytes.buffer] : []);
      } catch (error) {
        g.postMessage({ id: id, error: error.codi || 'intern' });
      }
    };
  }

  GTP.motor = { executa: executa, escolta: escolta };
}(globalThis));
