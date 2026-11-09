// Aprèn la forma de cada full. El que retorna no conté cap fila original.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var D = GTP.deteccio, esBuit = GTP.esBuit, CAP = D.CAP;
  var MIN_CATEGORIA = 5, MAX_CATEGORIES = 50, LLINDAR_FORMAT = 0.5;
  var AMB_EMPREMTA = { nomComplet: 1, nom: 1, cognoms: 1, dni: 1, correu: 1, telefon: 1, iban: 1, codiPostal: 1, municipi: 1, adreca: 1, patro: 1 };
  var RELACIONABLES = { dni: 1, correu: 1, telefon: 1, iban: 1, nomComplet: 1, patro: 1 };

  function normalitza(valor) { return GTP.textCella(valor).normalize('NFC').trim().toLowerCase(); }

  // Empremta no criptogràfica amb sal de sessió: serveix per comparar i no es pot llegir.
  function creaEmpremta(sal) {
    return function (text) {
      var h1 = 0xdeadbeef ^ sal, h2 = 0x41c6ce57 ^ sal;
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    };
  }

  function filaBuida(fila) {
    if (!fila) return true;
    for (var i = 0; i < fila.length; i++) if (!esBuit(fila[i])) return false;
    return true;
  }

  function trobaFilaTitols(full) {
    for (var f = 0; f < Math.min(full.files.length, 50); f++) {
      var fila = full.files[f];
      if (!fila) continue;
      var textos = 0;
      for (var c = 0; c < fila.length; c++) if (typeof fila[c] === 'string' && fila[c].trim() !== '') textos++;
      if (textos >= 2) return f;
    }
    for (var i = 0; i < full.files.length; i++) if (!filaBuida(full.files[i])) return i;
    return 0;
  }

  function filaSemblaDades(fila) {
    return fila.some(function (v) {
      if (typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) return true;
      return typeof v === 'string' && (D.esDniNie(v) || D.esCorreu(v) || D.esTelefon(v) || D.esIban(v) || (D.dataDeText(v) || {}).data);
    });
  }

  function proporcio(llista, prova) { return llista.length ? llista.filter(prova).length / llista.length : 0; }

  function percentils(ordenats) {
    var n = ordenats.length;
    return { baix: ordenats[Math.floor(n * 0.05)], alt: ordenats[Math.max(Math.ceil(n * 0.95) - 1, 0)] };
  }

  function arrodoneixRang(baix, alt, decimals) {
    var ample = Math.max(Math.abs(alt - baix), Math.pow(10, -decimals));
    var pas = Math.pow(10, Math.floor(Math.log10(ample)) - 1);
    if (decimals === 0) pas = Math.max(pas, 1);
    var inici = Math.floor(baix / pas) * pas, fi = Math.ceil(alt / pas) * pas;
    if (baix >= 0 && inici < 0) inici = 0;
    return { min: Number(inici.toFixed(decimals)), max: Number(fi.toFixed(decimals)) };
  }

  function decimalsDe(nombre) {
    var text = String(nombre), punt = text.indexOf('.');
    return punt < 0 || /e/i.test(text) ? 0 : text.length - punt - 1;
  }

  function mascaraCodi(text) {
    return text.replace(/\d/g, '9').replace(/\p{Lu}/gu, 'A').replace(/\p{Ll}/gu, 'a');
  }

  function frequencies(llista) {
    var mapa = new Map();
    llista.forEach(function (x) { mapa.set(x, (mapa.get(x) || 0) + 1); });
    return Array.from(mapa.entries()).sort(function (a, b) { return b[1] - a[1]; });
  }

  function categories(valors) {
    var mapa = new Map();
    valors.forEach(function (v) {
      var clau = normalitza(v), entrada = mapa.get(clau);
      if (entrada) entrada.pes++; else mapa.set(clau, { valor: v, pes: 1 });
    });
    return { distints: mapa.size, admeses: Array.from(mapa.values()).filter(function (c) { return c.pes >= MIN_CATEGORIA; }) };
  }

  function teFormaIdentificador(text) { return D.esDniNie(text) || D.esCorreu(text) || D.esTelefon(text) || D.esIban(text) || D.semblaNomPersona(text); }

  function mitjanaParaules(textos) {
    if (!textos.length) return 0;
    return textos.reduce(function (s, t) { return s + t.trim().split(/\s+/).length; }, 0) / textos.length;
  }

  function perfilNombre(col, nombres) {
    var ordenats = nombres.slice().sort(function (a, b) { return a - b; });
    col.decimals = Math.min(nombres.reduce(function (m, n) { return Math.max(m, decimalsDe(n)); }, 0), 6);
    var p = percentils(ordenats);
    col.rang = arrodoneixRang(p.baix, p.alt, col.decimals);
  }

  function perfilData(col, dates) {
    var ms = dates.map(function (d) { return d.getTime(); }).sort(function (a, b) { return a - b; });
    var p = percentils(ms), inici = new Date(p.baix), fi = new Date(p.alt);
    col.rangData = { min: Date.UTC(inici.getUTCFullYear(), inici.getUTCMonth(), 1), max: Date.UTC(fi.getUTCFullYear(), fi.getUTCMonth() + 1, 0) };
    col.teHora = proporcio(dates, function (d) { return d.getTime() % 86400000 !== 0; }) > 0.5;
  }

  function assigna(col, valors, titol) {
    var cap = D.normalitzaTitol(titol);
    var textos = valors.map(function (v) { return v instanceof Date ? '' : String(v); });
    var num = proporcio(valors, function (v) { return typeof v === 'number'; });
    col.numeric = num >= 0.9;
    function formaMajoritaria(prova) { return proporcio(textos, prova) >= LLINDAR_FORMAT; }

    if (valors.length && proporcio(valors, function (v) { return typeof v === 'boolean'; }) >= 0.9) {
      col.tipus = 'boolea';
      col.proporcioCert = proporcio(valors, function (v) { return v === true; });
      return;
    }
    if (CAP.text.test(cap)) { col.tipus = 'text'; return; }
    if (formaMajoritaria(D.esDniNie)) {
      col.tipus = 'dni';
      col.proporcioNie = proporcio(textos, function (t) { return /^[XYZ]/i.test(t.trim()); });
      return;
    }
    if (formaMajoritaria(D.esCorreu)) { col.tipus = 'correu'; return; }
    if (formaMajoritaria(D.esIban)) {
      col.tipus = 'iban';
      col.mostraIban = mascaraCodi(textos.filter(D.esIban)[0]);
      col.paisIban = textos.filter(D.esIban)[0].trim().slice(0, 2).toUpperCase();
      return;
    }
    if (formaMajoritaria(D.esTelefon) || (CAP.telefon.test(cap) && valors.length && formaMajoritaria(function (t) { return /\d{6}/.test(t.replace(/\D/g, '')); }))) {
      col.tipus = 'telefon';
      col.patronsTelefon = frequencies(textos.filter(D.esTelefon).map(mascaraTelefon)).slice(0, 5);
      return;
    }

    var dates = valors.filter(function (v) { return v instanceof Date; });
    var deText = valors.map(function (v) { return typeof v === 'string' ? D.dataDeText(v) : null; }).filter(function (r) { return r && r.data; });
    if (valors.length && dates.length / valors.length >= 0.8) { col.tipus = 'data'; perfilData(col, dates); return; }
    if (valors.length && deText.length / valors.length >= 0.8) {
      col.tipus = 'data';
      col.mascaraData = deText[0].mascara;
      perfilData(col, deText.map(function (r) { return r.data; }));
      return;
    }
    if (CAP.naixement.test(cap)) { col.tipus = 'data'; return; }
    if (CAP.postal.test(cap)) { col.tipus = 'codiPostal'; return; }
    if (CAP.adreca.test(cap)) { col.tipus = 'adreca'; return; }
    if (CAP.municipi.test(cap)) { col.tipus = 'municipi'; return; }
    if (CAP.dni.test(cap) || CAP.identificador.test(cap)) { assignaCodi(col, textos); return; }
    if (CAP.edat.test(cap)) {
      col.tipus = 'edat';
      var edats = textos.filter(function (t) { return /^\d+$/.test(t.trim()); }).map(Number);
      if (edats.length) perfilNombre(col, edats);
      return;
    }

    var cat = categories(valors);
    var cobertura = cat.admeses.reduce(function (s, c) { return s + c.pes; }, 0) / (valors.length || 1);
    var ambIdentitat = textos.length && proporcio(textos, teFormaIdentificador) >= 0.3;
    var esCatTitol = CAP.categoria.test(cap);
    if (esCatTitol && !ambIdentitat) { col.tipus = 'categoria'; col.categories = cat.admeses; return; }
    if (CAP.cognoms.test(cap)) { col.tipus = 'cognoms'; col.paraulesNom = Math.max(Math.round(mitjanaParaules(textos)), 1); return; }
    if (CAP.nom.test(cap)) {
      col.paraulesNom = Math.max(Math.round(mitjanaParaules(textos)), 1);
      col.tipus = col.paraulesNom >= 2 ? 'nomComplet' : 'nom';
      return;
    }
    if (col.numeric) {
      var nombres = valors.filter(function (v) { return typeof v === 'number'; });
      if (cat.distints <= 12 && cobertura >= 0.9 && nombres.every(Number.isInteger)) { col.tipus = 'categoria'; col.categories = cat.admeses; return; }
      col.tipus = 'nombre';
      perfilNombre(col, nombres);
      return;
    }
    var nombresText = textos.filter(function (t) { return /^[-+]?\d+([.,]\d+)?$/.test(t.trim()) && !/^[-+]?0\d/.test(t.trim()); });
    if (textos.length && nombresText.length / textos.length >= 0.9) {
      col.tipus = 'nombre';
      col.separadorDecimal = nombresText.some(function (t) { return t.indexOf(',') >= 0; }) ? ',' : '.';
      perfilNombre(col, nombresText.map(function (t) { return Number(t.trim().replace(',', '.')); }));
      col.decimals = nombresText.reduce(function (m, t) { var p = t.search(/[.,]/); return Math.max(m, p < 0 ? 0 : t.trim().length - p - 1); }, 0);
      return;
    }
    if (textos.length && proporcio(textos, D.semblaNomPersona) >= 0.6) {
      col.tipus = 'nomComplet';
      col.paraulesNom = Math.max(Math.round(mitjanaParaules(textos)), 2);
      return;
    }
    if (cat.admeses.length && cobertura >= 0.7 && cat.distints <= MAX_CATEGORIES && mitjanaParaules(textos) <= 5 && !ambIdentitat) {
      col.tipus = 'categoria';
      col.categories = cat.admeses;
      return;
    }
    if (textos.length && proporcio(textos, function (t) { return /\d/.test(t) && !/\s/.test(t.trim()) && t.length <= 40; }) >= 0.8) { assignaCodi(col, textos); return; }
    col.tipus = 'text';
  }

  function assignaCodi(col, textos) {
    col.tipus = 'patro';
    col.patrons = frequencies(textos.map(function (t) { return mascaraCodi(t.trim()); })).slice(0, 5);
  }

  // Conserva el prefix internacional i la primera xifra; la resta són posicions.
  function mascaraTelefon(text) {
    var net = text.trim(), m = /^(\+34|0034)?([\s.()-]*)(\d)/.exec(net);
    var cos = net.slice(m[0].length).replace(/\d/g, '9');
    return (m[1] || '') + m[2] + m[3] + cos.replace(/9/g, '#');
  }

  function perfilColumna(titol, valors, format, empremta) {
    var col = { titol: titol, numFiles: valors.length, format: format || null };
    var plens = valors.filter(function (v) { return !esBuit(v); });
    col.buides = valors.length ? 1 - plens.length / valors.length : 0;
    var conjunt = new Set(plens.map(normalitza));
    col.numDistints = conjunt.size;
    col.unic = plens.length > 1 && conjunt.size === plens.length;
    assigna(col, plens, titol);
    if (col.tipus === 'text') {
      col.paraules = valors.map(function (v) { return esBuit(v) ? 0 : String(GTP.textCella(v)).trim().split(/\s+/).length; });
    }
    if (AMB_EMPREMTA[col.tipus]) {
      col.empremtes = new Set();
      conjunt.forEach(function (text) { col.empremtes.add(empremta(text)); });
    }
    return { col: col, conjunt: conjunt };
  }

  function perfilFull(full, empremta) {
    var inicial = trobaFilaTitols(full);
    var filaTitols = full.files[inicial] || [];
    var senseTitols = filaSemblaDades(filaTitols);
    var primera = senseTitols ? inicial : inicial + 1;
    var files = [];
    for (var f = primera; f < full.files.length; f++) {
      if (!filaBuida(full.files[f]) && !full.filesAmagades.has(f)) files.push(full.files[f]);
    }
    var numColumnes = senseTitols ? 0 : filaTitols.length;
    files.forEach(function (fila) { if (fila.length > numColumnes) numColumnes = fila.length; });

    var columnes = [], transitoris = [];
    for (var c = 0; c < numColumnes; c++) {
      if (full.columnesAmagades.has(c)) continue;
      var valors = new Array(files.length);
      for (var i = 0; i < files.length; i++) valors[i] = files[i][c] === undefined ? null : files[i][c];
      var titolOriginal = senseTitols ? null : filaTitols[c];
      var titol = esBuit(titolOriginal) ? 'Columna ' + (columnes.length + 1) : GTP.textCella(titolOriginal).trim();
      if (esBuit(titolOriginal) && valors.every(esBuit)) continue;
      var resultat = perfilColumna(titol, valors, full.formats && full.formats[c], empremta);
      resultat.col.id = columnes.length;
      columnes.push(resultat.col);
      transitoris.push(resultat.conjunt);
    }
    return { perfil: { nom: full.nom, numFiles: files.length, columnes: columnes }, conjunts: transitoris };
  }

  // R9: una columna els valors de la qual són dins d'una altra pestanya.
  function detectaRelacions(fulls) {
    fulls.forEach(function (b, fb) {
      b.perfil.columnes.forEach(function (colB, cb) {
        if (!RELACIONABLES[colB.tipus] || colB.numDistints < 3) return;
        var millor = null;
        fulls.forEach(function (a, fa) {
          if (fa === fb) return;
          a.perfil.columnes.forEach(function (colA, ca) {
            if (colA.tipus !== colB.tipus || colA.numDistints < colB.numDistints) return;
            if (colA.numDistints === colB.numDistints && fa > fb) return;
            var comuns = 0;
            b.conjunts[cb].forEach(function (v) { if (a.conjunts[ca].has(v)) comuns++; });
            if (comuns / colB.numDistints >= 0.9 && (!millor || colA.numDistints > millor.distints)) millor = { full: fa, columna: ca, distints: colA.numDistints };
          });
        });
        if (millor) colB.relacio = { full: millor.full, columna: millor.columna };
      });
    });
  }

  function crea(llibre, opcions) {
    var aleatori = GTP.creaAleatori();
    var empremta = creaEmpremta(aleatori.enter(0x7fffffff));
    var fulls = llibre.fulls
      .filter(function (full) { return !full.amagat && full.files.some(function (f) { return !filaBuida(f); }); })
      .map(function (full) { return perfilFull(full, empremta); });
    if (!fulls.length) throw new GTP.ErrorLectura('fitxer-buit');
    detectaRelacions(fulls);
    return {
      origen: (opcions && opcions.origen) || 'xlsx', separador: opcions && opcions.separador,
      empremta: empremta, fulls: fulls.map(function (f) { return f.perfil; })
    };
  }

  GTP.perfil = { crea: crea, normalitza: normalitza };
}(globalThis));
