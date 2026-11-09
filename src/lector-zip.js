// Accés als fitxers interns d'un .xlsx o .ods. Només es descomprimeix el que es
// demana pel nom, i mai res que declari una mida superior al límit.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};

  function noms(bytes) {
    var trobats = [];
    desar(bytes, function (entrada) { trobats.push(entrada.name); return false; });
    return trobats;
  }

  function desar(bytes, filtre) {
    try {
      return g.fflate.unzipSync(bytes, { filter: filtre });
    } catch (e) {
      if (e instanceof GTP.ErrorLectura) throw e;
      throw new GTP.ErrorLectura('fitxer-malmes');
    }
  }

  function extreu(bytes, nomsVolguts, limit) {
    var maxim = limit || GTP.LIMITS.midaEntrada;
    return desar(bytes, function (entrada) {
      if (nomsVolguts.indexOf(entrada.name) < 0) return false;
      if (entrada.originalSize > maxim) throw new GTP.ErrorLectura('massa-gran');
      return true;
    });
  }

  function text(octets) {
    if (!octets) return '';
    try {
      if (octets[0] === 0xFF && octets[1] === 0xFE) return new TextDecoder('utf-16le').decode(octets);
      if (octets[0] === 0xFE && octets[1] === 0xFF) return new TextDecoder('utf-16be').decode(octets);
      return new TextDecoder('utf-8').decode(octets);
    } catch (e) {
      throw new GTP.ErrorLectura('massa-gran');
    }
  }

  GTP.zip = { noms: noms, extreu: extreu, text: text };
}(globalThis));
