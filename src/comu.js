// Peces compartides pels mòduls: error de lectura i límits.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};

  function ErrorLectura(codi) {
    this.name = 'ErrorLectura';
    this.codi = codi;
    this.message = codi;
  }
  ErrorLectura.prototype = Object.create(Error.prototype);
  ErrorLectura.prototype.constructor = ErrorLectura;

  GTP.ErrorLectura = ErrorLectura;
  GTP.LIMITS = {
    files: 1048576,
    columnes: 16384,
    celles: 20000000,
    midaEntrada: 512 * 1024 * 1024
  };

  GTP.creaAleatori = function () {
    var memoria = new Uint32Array(4096), posicio = memoria.length;
    function uint32() {
      if (posicio >= memoria.length) { g.crypto.getRandomValues(memoria); posicio = 0; }
      return memoria[posicio++];
    }
    // Enter uniforme entre 0 i maxim-1, sense el biaix de fer només el mòdul.
    function enter(maxim) {
      var limit = Math.floor(0x100000000 / maxim) * maxim, valor;
      do { valor = uint32(); } while (valor >= limit);
      return valor % maxim;
    }
    return {
      enter: enter,
      real: function () { return (uint32() * 2097152 + (uint32() >>> 11)) / 9007199254740992; },
      tria: function (llista) { return llista[enter(llista.length)]; }
    };
  };

  // Text per mostrar una cel·la a la pantalla.
  GTP.textCella = function (valor) {
    if (valor === null || valor === undefined) return '';
    if (valor instanceof Date) {
      var iso = valor.toISOString();
      return valor.getTime() % 86400000 === 0 ? iso.slice(0, 10) : iso.slice(0, 16).replace('T', ' ');
    }
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    return String(valor);
  };

  // Una cel·la és buida si no té valor o si només conté espais.
  GTP.esBuit = function (valor) {
    return valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '');
  };
}(globalThis));
