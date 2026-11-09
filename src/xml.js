// Lector XML mínim, sense DOM, perquè funcioni també en un procés en segon pla.
// Rebutja DOCTYPE: així no hi ha entitats externes ni expansions recursives.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var BUIT = Object.freeze({});
  var ENTITATS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' };

  function corrupte() { throw new GTP.ErrorLectura('fitxer-malmes'); }

  function canviaEntitat(tot, cos) {
    if (cos.charAt(0) !== '#') return ENTITATS[cos];
    var codi = /^#[xX]/.test(cos) ? parseInt(cos.slice(2), 16) : parseInt(cos.slice(1), 10);
    if (!(codi >= 0 && codi <= 0x10FFFF)) return '';
    return String.fromCodePoint(codi);
  }

  function decodifica(text) {
    if (text.indexOf('&') < 0) return text;
    return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, canviaEntitat);
  }

  function nomLocal(nom) {
    var dos = nom.indexOf(':');
    return dos < 0 ? nom : nom.slice(dos + 1);
  }

  function esEspai(c) { return c === 32 || c === 9 || c === 10 || c === 13; }

  // El gestor té obre(nom, atributs), tanca(nom), text(cadena) i la propietat
  // «capturant», que indica si en aquell moment vol rebre text. Els noms d'element
  // arriben sense prefix; els d'atribut, tal com són al fitxer.
  function recorre(text, gestor) {
    var n = text.length, i = 0, oberts = 0;
    while (i < n) {
      var lt = text.indexOf('<', i);
      if (lt < 0) break;
      if (lt > i && gestor.capturant) gestor.text(decodifica(text.slice(i, lt)));
      var c = text.charCodeAt(lt + 1), fi;
      if (c === 33) {
        if (text.startsWith('<!--', lt)) {
          fi = text.indexOf('-->', lt + 4);
          if (fi < 0) corrupte();
          i = fi + 3;
        } else if (text.startsWith('<![CDATA[', lt)) {
          fi = text.indexOf(']]>', lt + 9);
          if (fi < 0) corrupte();
          if (gestor.capturant) gestor.text(text.slice(lt + 9, fi));
          i = fi + 3;
        } else {
          throw new GTP.ErrorLectura('xml-no-permes');
        }
        continue;
      }
      if (c === 63) {
        fi = text.indexOf('?>', lt + 2);
        if (fi < 0) corrupte();
        i = fi + 2;
        continue;
      }
      if (c === 47) {
        fi = text.indexOf('>', lt + 2);
        if (fi < 0) corrupte();
        oberts--;
        gestor.tanca(nomLocal(text.slice(lt + 2, fi).trim()));
        i = fi + 1;
        continue;
      }
      var j = lt + 1;
      while (j < n) {
        var cn = text.charCodeAt(j);
        if (esEspai(cn) || cn === 47 || cn === 62) break;
        j++;
      }
      if (j >= n || j === lt + 1) corrupte();
      var nom = nomLocal(text.slice(lt + 1, j));
      var atributs = null, buit = false;
      for (;;) {
        while (j < n && esEspai(text.charCodeAt(j))) j++;
        if (j >= n) corrupte();
        var ca = text.charCodeAt(j);
        if (ca === 62) { j++; break; }
        if (ca === 47) {
          if (text.charCodeAt(j + 1) !== 62) corrupte();
          buit = true;
          j += 2;
          break;
        }
        var igual = text.indexOf('=', j);
        if (igual < 0) corrupte();
        var nomAtribut = text.slice(j, igual).trim();
        j = igual + 1;
        while (j < n && esEspai(text.charCodeAt(j))) j++;
        var cometa = text.charAt(j);
        if (cometa !== '"' && cometa !== '\'') corrupte();
        var tancament = text.indexOf(cometa, j + 1);
        if (tancament < 0) corrupte();
        if (!atributs) atributs = {};
        atributs[nomAtribut] = decodifica(text.slice(j + 1, tancament));
        j = tancament + 1;
      }
      gestor.obre(nom, atributs || BUIT);
      if (buit) gestor.tanca(nom); else oberts++;
      i = j;
    }
    // Un document retallat no es dóna per bo: faltarien dades sense que ningú ho sabés.
    if (oberts !== 0) corrupte();
  }

  GTP.xml = { recorre: recorre };
}(globalThis));
