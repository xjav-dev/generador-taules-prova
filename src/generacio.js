// Inventa totes les files a partir del perfil. Mai no té accés a les files originals.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var D = GTP.deteccio, I = GTP.inventades;
  var LLIGATS_A_PERSONA = { nomComplet: 1, nom: 1, cognoms: 1, dni: 1, correu: 1, telefon: 1, iban: 1, codiPostal: 1, municipi: 1, adreca: 1, patro: 1 };
  var SEMPRE_UNICS = { dni: 1, correu: 1, telefon: 1, iban: 1, patro: 1 };
  var SENSE_REINTENT = { nom: 1, cognoms: 1, codiPostal: 1, municipi: 1 };
  var COMPTEN_PERSONES = { nomComplet: 1, nom: 1, dni: 1, correu: 1, telefon: 1, iban: 1, patro: 1 };
  var MAX_INTENTS = 60, DATA_MIN = Date.UTC(2000, 0, 1), DATA_MAX = Date.UTC(2020, 11, 31), DIA = 86400000;
  var LLETRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function digits(a, n) { var t = ''; for (var i = 0; i < n; i++) t += a.enter(10); return t; }
  function slug(text) { return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ''); }
  function ponderat(a, parelles) {
    var total = parelles.reduce(function (s, p) { return s + p[1]; }, 0), r = a.real() * total;
    for (var i = 0; i < parelles.length; i++) { r -= parelles[i][1]; if (r < 0) return parelles[i][0]; }
    return parelles[0][0];
  }
  function barreja(llista, a) {
    for (var i = llista.length - 1; i > 0; i--) { var j = a.enter(i + 1), t = llista[i]; llista[i] = llista[j]; llista[j] = t; }
    return llista;
  }

  function normalitzaEmpremta(perfil, text) { return perfil.empremta(String(text).normalize('NFC').trim().toLowerCase()); }

  function prohibits(perfil, fulls, tipus) {
    var conjunt = new Set();
    fulls.forEach(function (f) {
      perfil.fulls[f].columnes.forEach(function (c) {
        if (c.tipus === tipus && c.empremtes) c.empremtes.forEach(function (e) { conjunt.add(e); });
      });
    });
    return conjunt;
  }

  function triaEvitant(a, perfil, llista, prohibit, clau) {
    var opcio = a.tria(llista);
    for (var i = 0; i < MAX_INTENTS && prohibit.has(normalitzaEmpremta(perfil, clau ? clau(opcio) : opcio)); i++) opcio = a.tria(llista);
    return opcio;
  }

  function creaPersona(estat, univers) {
    var a = estat.a, p = estat.perfil;
    var lloc = triaEvitant(a, p, I.llocs, univers.prohibitsMunicipi, function (l) { return l[0]; });
    var cp = lloc[1] + a.enter(lloc[2] - lloc[1] + 1);
    return {
      nom: triaEvitant(a, p, I.noms, univers.prohibitsNom),
      cognom1: triaEvitant(a, p, I.cognoms, univers.prohibitsCognom),
      cognom2: triaEvitant(a, p, I.cognoms, univers.prohibitsCognom),
      municipi: lloc[0], cp: String(cp).padStart(5, '0'), carrer: a.tria(I.carrers), numero: 1 + a.enter(180)
    };
  }

  function persona(estat, univers, i, rol) {
    var clau = i + ':' + (rol || 0), p = univers.persones.get(clau);
    if (!p) { p = creaPersona(estat, univers); univers.persones.set(clau, p); }
    return p;
  }

  function usatsCompartits(estat, tipus) {
    if (!estat.usats.has(tipus)) estat.usats.set(tipus, new Set());
    return estat.usats.get(tipus);
  }

  function generaDni(a, col) {
    if (a.real() < (col.proporcioNie || 0)) {
      var prefix = a.enter(3), cos = digits(a, 7);
      return 'XYZ'.charAt(prefix) + cos + D.lletraDni(Number(prefix + cos));
    }
    var numero = 10000000 + a.enter(90000000);
    return numero + D.lletraDni(numero);
  }

  function generaTelefon(a, col) {
    var patrons = col.patronsTelefon && col.patronsTelefon.length ? col.patronsTelefon : [['6########', 1]];
    var text = ponderat(a, patrons).replace(/#/g, function () { return a.enter(10); });
    return col.numeric ? Number(text.replace(/\D/g, '')) : text;
  }

  function generaIban(a, col) {
    var pais = col.paisIban || 'ES', mascara = col.mostraIban || 'AA9999999999999999999999';
    var net = mascara.replace(/\s/g, ''), bban = '';
    for (var i = 4; i < net.length; i++) bban += net.charAt(i) === '9' ? a.enter(10) : LLETRES.charAt(a.enter(26));
    var control = String(98 - D.restaIban(pais + '00' + bban)).padStart(2, '0');
    var complet = pais + control + bban, posicio = 0;
    return mascara.replace(/\S/g, function () { return complet.charAt(posicio++); });
  }

  function generaPatro(a, col) {
    var patrons = col.patrons && col.patrons.length ? col.patrons : [['AA-9999', 1]];
    var text = ponderat(a, patrons).replace(/[9Aa]/g, function (c) {
      if (c === '9') return a.enter(10);
      var lletra = LLETRES.charAt(a.enter(26));
      return c === 'A' ? lletra : lletra.toLowerCase();
    });
    if (col.numeric) { var net = text.replace(/\D/g, '').replace(/^0/, String(1 + a.enter(9))); return Number(net || 1); }
    return text;
  }

  function generaLligat(estat, col, p, intent) {
    var a = estat.a;
    switch (col.tipus) {
      case 'nom': return p.nom;
      case 'cognoms': return (col.paraulesNom || 1) >= 2 ? p.cognom1 + ' ' + p.cognom2 : p.cognom1;
      case 'nomComplet': {
        var base = intent ? a.tria(I.noms) + ' ' + a.tria(I.cognoms) : p.nom + ' ' + p.cognom1;
        return (col.paraulesNom || 2) >= 3 ? base + ' ' + p.cognom2 : base;
      }
      case 'dni': return generaDni(a, col);
      case 'correu': return slug(p.nom) + '.' + slug(p.cognom1) + (intent ? intent : '') + '@example.org';
      case 'telefon': return generaTelefon(a, col);
      case 'iban': return generaIban(a, col);
      case 'codiPostal': return col.numeric ? Number(p.cp) : p.cp;
      case 'municipi': return p.municipi;
      case 'adreca': return p.carrer + ', ' + (intent ? 1 + a.enter(180) : p.numero);
      case 'patro': return generaPatro(a, col);
      default: return null;
    }
  }

  function arrelDe(estat, f, c) {
    var full = f, columna = c, salts = 0;
    while (estat.perfil.fulls[full].columnes[columna].relacio && salts++ < 10) {
      var r = estat.perfil.fulls[full].columnes[columna].relacio;
      full = r.full; columna = r.columna;
    }
    return { full: full, columna: columna, clau: full + ':' + columna };
  }

  function valorsLligats(estat, f, c) {
    var full = estat.fulls[f], col = estat.perfil.fulls[f].columnes[c], a = estat.a;
    var arrel = arrelDe(estat, f, c), colArrel = estat.perfil.fulls[arrel.full].columnes[arrel.columna];
    var univers = full.univers, memoria = estat.memoria.get(arrel.clau);
    if (!memoria) { memoria = { valors: new Map(), usats: new Set() }; estat.memoria.set(arrel.clau, memoria); }
    var distints = colArrel.numDistints;
    var limita = distints > 0 && distints < univers.mida && !SENSE_REINTENT[col.tipus];
    // Els identificadors no es poden repetir entre columnes: tres correus són tres correus.
    var usats = SEMPRE_UNICS[col.tipus] ? usatsCompartits(estat, col.tipus) : memoria.usats;
    var valors = full.assignacio.map(function (indexPersona) {
      if (a.real() < col.buides) return null;
      var clau = limita ? indexPersona % distints : indexPersona;
      if (memoria.valors.has(clau)) return memoria.valors.get(clau);
      var p = persona(estat, univers, indexPersona, colArrel.rol), valor = null, intent = 0;
      for (; intent < MAX_INTENTS; intent++) {
        valor = generaLligat(estat, col, p, intent);
        if (SENSE_REINTENT[col.tipus]) break;
        var coincideix = col.empremtes && col.empremtes.has(normalitzaEmpremta(estat.perfil, valor));
        var repetit = (SEMPRE_UNICS[col.tipus] || col.unic) && usats.has(valor);
        if (!coincideix && !repetit) break;
      }
      if (intent === MAX_INTENTS && (SEMPRE_UNICS[col.tipus] || col.unic) && typeof valor === 'string') valor = valor + ' ' + (usats.size + 1);
      usats.add(valor);
      memoria.valors.set(clau, valor);
      return valor;
    });
    if (col.igualA) {
      valors = valors.map(function (valor, r) {
        var origen = col.igualA[r];
        return origen >= 0 && full.valors[origen] ? full.valors[origen][r] : valor;
      });
    }
    return valors;
  }

  function textData(data, mascara, teHora) {
    var d = String(data.getUTCDate()), m = String(data.getUTCMonth() + 1), any = String(data.getUTCFullYear());
    if (mascara.zeros) { d = d.padStart(2, '0'); m = m.padStart(2, '0'); }
    var cos = mascara.ordre === 'ama' ? any + mascara.separador + m + mascara.separador + d : d + mascara.separador + m + mascara.separador + any;
    return teHora ? cos + ' ' + data.toISOString().slice(11, 16) : cos;
  }

  function generaDates(estat, col, n) {
    var a = estat.a, rang = col.rangData || { min: DATA_MIN, max: DATA_MAX }, usats = new Set();
    var dates = new Array(n);
    for (var i = 0; i < n; i++) {
      var ms, intent = 0;
      do {
        ms = rang.min + Math.floor(a.real() * (rang.max - rang.min + DIA));
        if (!col.teHora) ms -= ms % DIA;
      } while (col.unic && usats.has(ms) && intent++ < MAX_INTENTS);
      usats.add(ms);
      dates[i] = new Date(ms);
    }
    return dates;
  }

  function generaNombres(estat, col, n) {
    var a = estat.a, rang = col.rang || { min: col.tipus === 'edat' ? 18 : 0, max: col.tipus === 'edat' ? 65 : 100 };
    var decimals = col.decimals || 0, usats = new Set(), seguent = rang.max + 1;
    var valors = new Array(n);
    for (var i = 0; i < n; i++) {
      var v, intent = 0;
      do {
        v = decimals === 0 ? rang.min + a.enter(Math.max(Math.floor(rang.max - rang.min) + 1, 1)) : Number((rang.min + a.real() * (rang.max - rang.min)).toFixed(decimals));
      } while (col.unic && usats.has(v) && intent++ < MAX_INTENTS);
      if (col.unic && usats.has(v)) v = seguent++;
      usats.add(v);
      valors[i] = col.separadorDecimal ? v.toFixed(decimals).replace('.', col.separadorDecimal) : v;
    }
    return valors;
  }

  function loremDe(a, paraules) {
    var banc = I.lorem, inici = a.enter(banc.length), parts = new Array(paraules);
    for (var i = 0; i < paraules; i++) parts[i] = banc[(inici + i) % banc.length];
    var text = parts.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1) + '.';
  }

  function ambBuides(a, col, valors) { return valors.map(function (v) { return a.real() < col.buides ? null : v; }); }

  function generaSolta(estat, f, c) {
    var col = estat.perfil.fulls[f].columnes[c], n = estat.perfil.fulls[f].numFiles, a = estat.a, full = estat.fulls[f];
    var buit = new Array(n).fill(null);
    switch (col.tipus) {
      case 'buida': case 'eliminar': return buit;
      case 'data': {
        var dates = generaDates(estat, col, n);
        full.dates[c] = dates;
        return ambBuides(a, col, dates.map(function (d) { return col.mascaraData ? textData(d, col.mascaraData, col.teHora) : d; }));
      }
      case 'edat': {
        var naixement = estat.perfil.fulls[f].columnes.filter(function (x) { return x.tipus === 'data' && D.CAP.naixement.test(D.normalitzaTitol(x.titol)); })[0];
        if (naixement && full.dates[naixement.id]) {
          var ara = Date.now();
          return full.dates[naixement.id].map(function (d) { return a.real() < col.buides ? null : Math.floor((ara - d.getTime()) / (365.2425 * DIA)); });
        }
        return ambBuides(a, col, generaNombres(estat, col, n));
      }
      case 'nombre': return ambBuides(a, col, generaNombres(estat, col, n));
      case 'boolea': {
        var cert = col.proporcioCert === undefined ? 0.5 : col.proporcioCert;
        return ambBuides(a, col, buit.map(function () { return a.real() < cert; }));
      }
      case 'categoria': {
        var opcions = col.categories && col.categories.length ? col.categories.map(function (x) { return [x.valor, x.pes]; })
          : ['Categoria A', 'Categoria B', 'Categoria C'].map(function (x) { return [x, 1]; });
        return ambBuides(a, col, buit.map(function () { return ponderat(a, opcions); }));
      }
      default: {
        if (col.paraules) return col.paraules.map(function (p) { return p ? loremDe(a, p) : null; });
        return ambBuides(a, col, buit.map(function () { return loremDe(a, 8); }));
      }
    }
  }

  function generaColumna(estat, f, c) {
    var col = estat.perfil.fulls[f].columnes[c];
    return LLIGATS_A_PERSONA[col.tipus] ? valorsLligats(estat, f, c) : generaSolta(estat, f, c);
  }

  function preparaUniversos(estat) {
    var perfil = estat.perfil, pare = perfil.fulls.map(function (_, i) { return i; });
    function arrel(x) { while (pare[x] !== x) x = pare[x]; return x; }
    perfil.fulls.forEach(function (full, f) {
      full.columnes.forEach(function (col) { if (col.relacio) pare[arrel(f)] = arrel(col.relacio.full); });
    });
    var universos = new Map();
    perfil.fulls.forEach(function (full, f) {
      var maxim = 0;
      full.columnes.forEach(function (col) { if (COMPTEN_PERSONES[col.tipus] && col.numDistints > maxim) maxim = col.numDistints; });
      var persones = Math.min(maxim || full.numFiles, full.numFiles) || 1;
      var clau = arrel(f), u = universos.get(clau);
      if (!u) { u = { mida: 0, persones: new Map(), fulls: [] }; universos.set(clau, u); }
      u.mida = Math.max(u.mida, persones);
      u.fulls.push(f);
      estat.fulls[f] = { univers: u, persones: persones, dates: {} };
    });
    universos.forEach(function (u) {
      u.prohibitsNom = prohibits(perfil, u.fulls, 'nom');
      u.prohibitsCognom = prohibits(perfil, u.fulls, 'cognoms');
      u.prohibitsMunicipi = prohibits(perfil, u.fulls, 'municipi');
    });
  }

  function assignaPersones(estat, f) {
    var a = estat.a, full = estat.fulls[f], n = estat.perfil.fulls[f].numFiles;
    var totes = new Array(full.univers.mida);
    for (var i = 0; i < totes.length; i++) totes[i] = i;
    var escollides = barreja(totes, a).slice(0, full.persones);
    var assignacio = new Array(n);
    for (var r = 0; r < n; r++) assignacio[r] = r < escollides.length ? escollides[r] : escollides[a.enter(escollides.length)];
    full.assignacio = barreja(assignacio, a);
  }

  function ordreColumnes(columnes) {
    // Les dates primer: l'edat en depèn.
    return columnes.map(function (_, c) { return c; }).sort(function (x, y) { return (columnes[y].tipus === 'data') - (columnes[x].tipus === 'data'); });
  }

  function omple(estat) {
    estat.memoria = new Map();
    estat.usats = new Map();
    estat.perfil.fulls.forEach(function (fullPerfil, f) {
      assignaPersones(estat, f);
      estat.fulls[f].valors = [];
      ordreColumnes(fullPerfil.columnes).forEach(function (c) { estat.fulls[f].valors[c] = generaColumna(estat, f, c); });
    });
  }

  function crea(perfil) {
    var estat = { perfil: perfil, a: GTP.creaAleatori(), fulls: [], memoria: new Map(), usats: new Map() };
    preparaUniversos(estat);
    omple(estat);
    return estat;
  }

  function regeneraTot(estat) {
    estat.fulls.forEach(function (full) { full.univers.persones.clear(); full.dates = {}; });
    omple(estat);
  }

  // R10: només canvia la columna indicada.
  function canviaColumna(estat, f, c, canvi) {
    var col = estat.perfil.fulls[f].columnes[c];
    if (canvi.titol !== undefined) col.titol = canvi.titol;
    if (canvi.tipus === undefined) return;
    if (canvi.tipus !== col.tipus) {
      col.tipus = canvi.tipus;
      delete col.relacio;
      delete col.igualA;
      var mateixaFamilia = function (t) { return t === col.tipus || (t === 'nom' && col.tipus === 'nomComplet') || (t === 'nomComplet' && col.tipus === 'nom'); };
      col.rol = estat.perfil.fulls[f].columnes.reduce(function (m, x, i) { return i !== c && mateixaFamilia(x.tipus) && x.rol !== undefined ? Math.max(m, x.rol + 1) : m; }, 0);
    }
    estat.memoria.delete(f + ':' + c);
    estat.fulls[f].valors[c] = generaColumna(estat, f, c);
  }

  GTP.generacio = { crea: crea, regeneraTot: regeneraTot, canviaColumna: canviaColumna };
}(globalThis));
