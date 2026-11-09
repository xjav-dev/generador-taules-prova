// Lector de .csv. Tot es llegeix com a text: «00123» no ha de perdre els zeros.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var CANDIDATS = [';', ',', '\t', '|'];

  function decodifica(bytes) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes);
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return new TextDecoder('windows-1252').decode(bytes);
    }
  }

  function comptaPerLinia(text, separador, maxLinies) {
    var comptes = [], actual = 0, cometes = false;
    for (var i = 0; i < text.length && comptes.length < maxLinies; i++) {
      var c = text.charAt(i);
      if (c === '"') cometes = !cometes;
      else if (!cometes && c === separador) actual++;
      else if (!cometes && c === '\n') { comptes.push(actual); actual = 0; }
    }
    if (comptes.length < maxLinies && actual) comptes.push(actual);
    return comptes;
  }

  function detectaSeparador(text) {
    var millor = ',', puntuacio = 0;
    CANDIDATS.forEach(function (separador) {
      var comptes = comptaPerLinia(text, separador, 50);
      if (!comptes.length) return;
      var freq = {}, moda = 0;
      comptes.forEach(function (n) { freq[n] = (freq[n] || 0) + 1; if (n > 0 && (!moda || freq[n] > freq[moda])) moda = n; });
      if (!moda) return;
      var valor = freq[moda] / comptes.length * 1000 + moda;
      if (valor > puntuacio) { puntuacio = valor; millor = separador; }
    });
    return millor;
  }

  function llegeix(bytes) {
    var text = decodifica(bytes);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var separador = null;
    var directiva = /^sep=(.)\r?\n/i.exec(text.slice(0, 16));
    if (directiva) { separador = directiva[1]; text = text.slice(directiva[0].length); }
    if (!separador) separador = detectaSeparador(text);

    var files = [], fila = [], camp = '', cometes = false, celles = 0;
    function tancaCamp() {
      fila.push(camp === '' ? null : camp);
      if (camp !== '' && ++celles > GTP.LIMITS.celles) throw new GTP.ErrorLectura('massa-gran');
      camp = '';
    }
    function tancaFila() {
      tancaCamp();
      files.push(fila.some(function (v) { return v !== null; }) ? fila : undefined);
      fila = [];
      if (files.length > GTP.LIMITS.files) throw new GTP.ErrorLectura('massa-gran');
    }
    for (var i = 0, n = text.length; i < n; i++) {
      var c = text.charAt(i);
      if (cometes) {
        if (c !== '"') camp += c;
        else if (text.charAt(i + 1) === '"') { camp += '"'; i++; }
        else cometes = false;
      } else if (c === '"' && camp === '') cometes = true;
      else if (c === separador) tancaCamp();
      else if (c === '\n') tancaFila();
      else if (c === '\r') { if (text.charAt(i + 1) === '\n') i++; tancaFila(); }
      else camp += c;
    }
    if (camp !== '' || fila.length) tancaFila();
    while (files.length && files[files.length - 1] === undefined) files.pop();
    return {
      fulls: [{ nom: 'Dades', amagat: false, files: files, columnesAmagades: new Set(), filesAmagades: new Set(), formats: {} }],
      separador: separador,
      avisos: { errors: 0, senseValor: 0 }
    };
  }

  GTP.lectorCsv = { llegeix: llegeix };
}(globalThis));
