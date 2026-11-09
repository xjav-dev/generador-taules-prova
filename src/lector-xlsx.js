// Lector de .xlsx. Només obté valors de cel·la i què està amagat: comentaris,
// imatges, propietats i taules dinàmiques no arriben a descomprimir-se.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var recorre = GTP.xml.recorre, zip = GTP.zip, LIMITS = GTP.LIMITS;

  var FORMATS_DATA = {};
  [14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 34, 35, 36, 50, 51, 52, 53, 54, 55, 56, 57, 58]
    .forEach(function (id) { FORMATS_DATA[id] = true; });

  function directori(cami) { return cami.slice(0, cami.lastIndexOf('/') + 1); }

  function resol(base, objectiu) {
    var cami = objectiu.charAt(0) === '/' ? objectiu.slice(1) : base + objectiu;
    var parts = [];
    cami.split('/').forEach(function (part) {
      if (part === '..') parts.pop();
      else if (part !== '.' && part !== '') parts.push(part);
    });
    return parts.join('/');
  }

  function llegeixRelacions(text) {
    var relacions = [];
    recorre(text, {
      capturant: false, tanca: function () {}, text: function () {},
      obre: function (nom, a) {
        if (nom === 'Relationship' && a.TargetMode !== 'External') {
          relacions.push({ id: a.Id, tipus: a.Type || '', objectiu: a.Target || '' });
        }
      }
    });
    return relacions;
  }

  function perTipus(relacions, final) {
    return relacions.filter(function (r) { return r.tipus.endsWith(final); })[0];
  }

  function esCert(valor) { return valor === '1' || valor === 'true'; }

  function atributId(a) {
    for (var clau in a) if (clau === 'id' || clau.endsWith(':id')) return a[clau];
    return undefined;
  }

  function llegeixLlibre(text) {
    var resultat = { data1904: false, fulls: [] };
    recorre(text, {
      capturant: false, tanca: function () {}, text: function () {},
      obre: function (nom, a) {
        if (nom === 'workbookPr') resultat.data1904 = esCert(a.date1904);
        else if (nom === 'sheet') resultat.fulls.push({ nom: a.name, amagat: !!a.state && a.state !== 'visible', id: atributId(a) });
      }
    });
    return resultat;
  }

  function desfesEscapes(text) {
    if (text.indexOf('_x') < 0) return text;
    return text.replace(/_x([0-9A-Fa-f]{4})_/g, function (tot, hex) { return String.fromCharCode(parseInt(hex, 16)); });
  }

  function llegeixCadenes(text) {
    var cadenes = [], actual = '', fonetica = 0;
    recorre(text, {
      capturant: false,
      text: function (s) { actual += s; },
      obre: function (nom) {
        if (nom === 'si') actual = '';
        else if (nom === 'rPh') fonetica++;
        else if (nom === 't' && !fonetica) this.capturant = true;
      },
      tanca: function (nom) {
        if (nom === 't') this.capturant = false;
        else if (nom === 'rPh') fonetica--;
        else if (nom === 'si') cadenes.push(desfesEscapes(actual));
      }
    });
    return cadenes;
  }

  function codiEsData(codi) {
    var net = codi
      .replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[[^\]]*\]/g, '')
      .replace(/[_*]./g, '').toLowerCase();
    if (/[yd]/.test(net)) return true;
    return /m/.test(net) && !/[hs]/.test(net);
  }

  function llegeixEstils(text) {
    var propis = {}, codis = {}, estils = [], dinsXfs = false;
    recorre(text, {
      capturant: false, text: function () {},
      obre: function (nom, a) {
        if (nom === 'numFmt') { propis[a.numFmtId] = codiEsData(a.formatCode || ''); codis[a.numFmtId] = a.formatCode || ''; }
        else if (nom === 'cellXfs') dinsXfs = true;
        else if (nom === 'xf' && dinsXfs) {
          var id = Number(a.numFmtId || 0);
          estils.push({ esData: !!FORMATS_DATA[id] || (codis[id] !== undefined && !!propis[id]), format: id === 0 || /^general$/i.test(codis[id] || '') ? null : codis[id] !== undefined ? { codi: codis[id] } : { id: id } });
        }
      },
      tanca: function (nom) { if (nom === 'cellXfs') dinsXfs = false; }
    });
    return estils;
  }

  // Excel compta des de 1899-12-30, però considera erròniament que 1900 és de traspàs.
  function serialAData(serial, data1904) {
    if (!isFinite(serial) || serial < 1) return null;
    var dies = data1904 ? serial + 1462 : (serial < 60 ? serial + 1 : serial);
    return new Date(Math.round((dies - 25569) * 86400000));
  }

  function columnaDeReferencia(ref) {
    var col = 0;
    for (var i = 0; i < ref.length; i++) {
      var c = ref.charCodeAt(i);
      if (c >= 65 && c <= 90) col = col * 26 + c - 64;
      else if (c >= 97 && c <= 122) col = col * 26 + c - 96;
      else break;
    }
    return col - 1;
  }

  function dataIso(text) {
    var d = new Date(text);
    return isNaN(d.getTime()) ? null : d;
  }

  function llegeixFull(text, info, cadenes, estils, data1904, avisos, comptador) {
    var full = { nom: info.nom, amagat: info.amagat, files: [], columnesAmagades: new Set(), filesAmagades: new Set(), formats: {} };
    var fila = -1, col = -1, tipus, estil, buffer, teFormula, dinsIs = false, fonetica = 0;

    function resolValor() {
      switch (tipus) {
        case 's': { var cadena = cadenes[Number(buffer)]; return cadena === undefined || cadena === '' ? null : cadena; }
        case 'inlineStr': case 'str': return buffer === '' ? null : desfesEscapes(buffer);
        case 'b': return esCert(buffer);
        case 'e': avisos.errors++; return null;
        case 'd': return dataIso(buffer);
        default: {
          if (buffer === '') { if (teFormula) avisos.senseValor++; return null; }
          var nombre = Number(buffer);
          if (!isFinite(nombre)) return null;
          if (estils[estil] && estils[estil].esData) { var data = serialAData(nombre, data1904); return data === null ? nombre : data; }
          return nombre;
        }
      }
    }

    recorre(text, {
      capturant: false,
      text: function (s) { buffer += s; },
      obre: function (nom, a) {
        switch (nom) {
          case 'col':
            if (esCert(a.hidden)) {
              var fins = Math.min(Number(a.max), LIMITS.columnes);
              for (var c = Number(a.min) - 1; c < fins; c++) full.columnesAmagades.add(c);
            }
            break;
          case 'row':
            fila = a.r ? Number(a.r) - 1 : fila + 1;
            col = -1;
            if (!(fila >= 0 && fila < LIMITS.files)) throw new GTP.ErrorLectura('fitxer-malmes');
            if (esCert(a.hidden)) full.filesAmagades.add(fila);
            break;
          case 'c':
            col = a.r ? columnaDeReferencia(a.r) : col + 1;
            if (!(col >= 0 && col < LIMITS.columnes)) throw new GTP.ErrorLectura('fitxer-malmes');
            tipus = a.t; estil = Number(a.s || 0); buffer = ''; teFormula = false; dinsIs = false;
            break;
          case 'f': teFormula = true; break;
          case 'v': if (tipus !== 'inlineStr') { buffer = ''; this.capturant = true; } break;
          case 'is': dinsIs = true; break;
          case 'rPh': fonetica++; break;
          case 't': if (dinsIs && !fonetica) this.capturant = true; break;
        }
      },
      tanca: function (nom) {
        if (nom === 'v' || nom === 't') this.capturant = false;
        else if (nom === 'rPh') fonetica--;
        else if (nom === 'c') {
          var valor = resolValor();
          if (valor !== null) {
            if (++comptador.celles > LIMITS.celles) throw new GTP.ErrorLectura('massa-gran');
            (full.files[fila] || (full.files[fila] = []))[col] = valor;
            if ((typeof valor === 'number' || valor instanceof Date) && !full.formats[col] && estils[estil] && estils[estil].format) full.formats[col] = estils[estil].format;
          }
        }
      }
    });
    return full;
  }

  function llegeix(bytes, opcions) {
    var limit = opcions && opcions.limitEntrada;
    var obte = function (cami) { return zip.text(zip.extreu(bytes, [cami], limit)[cami]); };
    var arrel = perTipus(llegeixRelacions(obte('_rels/.rels')), '/officeDocument');
    if (!arrel) throw new GTP.ErrorLectura('format-no-admes');
    var camiLlibre = resol('', arrel.objectiu);
    var nomLlibre = camiLlibre.slice(camiLlibre.lastIndexOf('/') + 1);
    if (!/\.xml$/i.test(nomLlibre)) throw new GTP.ErrorLectura('format-no-admes');
    var base = directori(camiLlibre);
    var llibre = llegeixLlibre(obte(camiLlibre));
    var relacions = llegeixRelacions(obte(base + '_rels/' + nomLlibre + '.rels'));
    var perId = {};
    relacions.forEach(function (r) { perId[r.id] = r; });

    var relCadenes = perTipus(relacions, '/sharedStrings');
    var relEstils = perTipus(relacions, '/styles');
    var cadenes = relCadenes ? llegeixCadenes(obte(resol(base, relCadenes.objectiu))) : [];
    var estils = relEstils ? llegeixEstils(obte(resol(base, relEstils.objectiu))) : [];
    var avisos = { errors: 0, senseValor: 0 }, comptador = { celles: 0 };

    var fulls = [];
    llibre.fulls.forEach(function (info) {
      var relacio = perId[info.id];
      if (!relacio || !relacio.tipus.endsWith('/worksheet')) return;
      fulls.push(llegeixFull(obte(resol(base, relacio.objectiu)), info, cadenes, estils, llibre.data1904, avisos, comptador));
    });
    return { fulls: fulls, avisos: avisos };
  }

  GTP.lectorXlsx = { llegeix: llegeix };
}(globalThis));
