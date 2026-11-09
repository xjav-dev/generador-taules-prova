// Interfície. Tot el que es mostra s'escriu amb textContent: mai no s'interpreta com a HTML.
(function () {
  'use strict';

  if (typeof document === 'undefined') { GTP.motor.escolta(); return; }

  var codiFont = document.currentScript.textContent;
  var UI = TEXTOS.ui, contingut = document.getElementById('contingut');
  var canal = null, resultat = null, pestanya = 0;

  function el(nom, propietats, fills) {
    var element = document.createElement(nom);
    Object.keys(propietats || {}).forEach(function (clau) {
      var valor = propietats[clau];
      if (valor === undefined || valor === null || valor === false) return;
      if (clau === 'text') element.textContent = valor;
      else if (clau === 'class') element.className = valor;
      else if (clau === 'value' || clau === 'selected') element[clau] = valor;
      else if (clau.slice(0, 2) === 'on') element.addEventListener(clau.slice(2), valor);
      else element.setAttribute(clau, valor === true ? '' : valor);
    });
    (fills || []).forEach(function (fill) { if (fill) element.appendChild(fill); });
    return element;
  }

  function canalLocal() {
    document.documentElement.setAttribute('data-motor', 'local');
    return function (ordre, dades) {
      return new Promise(function (resol, rebutja) {
        setTimeout(function () { try { resol(GTP.motor.executa(ordre, dades)); } catch (e) { rebutja(e.codi || 'intern'); } }, 50);
      });
    };
  }

  function creaCanal() {
    return new Promise(function (resol) {
      var treballador, pendents = {}, seguent = 1, acabat = false;
      function caiguda() { if (!acabat) { acabat = true; resol(canalLocal()); } }
      var espera = setTimeout(caiguda, 3000);
      try {
        treballador = new Worker(URL.createObjectURL(new Blob([codiFont], { type: 'text/javascript' })));
      } catch (e) { clearTimeout(espera); caiguda(); return; }
      treballador.onerror = function () { clearTimeout(espera); caiguda(); };
      treballador.onmessage = function (e) {
        var pendent = pendents[e.data.id];
        delete pendents[e.data.id];
        if (e.data.error) pendent.rebutja(e.data.error); else pendent.resol(e.data.resultat);
      };
      function crida(ordre, dades, transferibles) {
        return new Promise(function (resolCrida, rebutja) {
          var id = seguent++;
          pendents[id] = { resol: resolCrida, rebutja: rebutja };
          treballador.postMessage({ id: id, ordre: ordre, dades: dades }, transferibles || []);
        });
      }
      crida('hola').then(function () {
        clearTimeout(espera);
        if (acabat) return;
        acabat = true;
        document.documentElement.setAttribute('data-motor', 'segon-pla');
        resol(crida);
      });
    });
  }

  function motor(ordre, dades, transferibles) {
    var capa = document.getElementById('ocupat');
    document.getElementById('ocupat-text').textContent = UI.ocupat[ordre] || '';
    capa.hidden = false;
    contingut.inert = true;
    return Promise.resolve(canal).then(function (crida) { return crida(ordre, dades, transferibles); }).finally(function () {
      capa.hidden = true;
      contingut.inert = false;
    });
  }

  function textError(codi) { return TEXTOS.errors[codi] || TEXTOS.errors.intern; }

  function obreFitxer(fitxer, zonaError) {
    zonaError.textContent = '';
    fitxer.arrayBuffer().then(function (bytes) {
      return motor('obre', { bytes: bytes, nom: fitxer.name }, [bytes]);
    }).then(function (r) { resultat = r; pestanya = 0; pintaResultat(); contingut.focus(); })
      .catch(function (codi) { zonaError.textContent = textError(codi); });
  }

  function pintaInici() {
    var zonaError = el('p', { class: 'error', role: 'alert' });
    var entrada = el('input', {
      type: 'file', class: 'invisible', accept: '.xlsx,.ods,.csv,.tsv,.txt', 'aria-label': UI.etiquetaFitxer,
      onchange: function (e) { if (e.target.files[0]) obreFitxer(e.target.files[0], zonaError); e.target.value = ''; }
    });
    var zona = el('label', { class: 'zona' }, [document.createTextNode(UI.zona), el('small', { text: UI.zonaDetall }), entrada]);
    zona.addEventListener('dragover', function (e) { e.preventDefault(); zona.classList.add('actiu'); });
    zona.addEventListener('dragleave', function () { zona.classList.remove('actiu'); });
    zona.addEventListener('drop', function (e) {
      e.preventDefault();
      zona.classList.remove('actiu');
      if (e.dataTransfer.files[0]) obreFitxer(e.dataTransfer.files[0], zonaError);
    });
    contingut.replaceChildren(zona, zonaError, el('p', { class: 'explicacio', text: UI.explicacio }));
  }

  function aplicaCanvi(columna, canvi, enfocar) {
    motor('canvia', { full: pestanya, columna: columna, canvi: canvi }).then(function (r) {
      resultat = r;
      pintaResultat();
      var control = contingut.querySelector('[data-control="' + enfocar + '-' + columna + '"]');
      if (control) control.focus();
    }).catch(function (codi) { mostraError(codi); });
  }

  function mostraError(codi) {
    var zona = contingut.querySelector('.error');
    if (zona) zona.textContent = textError(codi);
  }

  function capcaleraColumna(columna, c) {
    var fora = columna.tipus === 'eliminar';
    return el('th', { scope: 'col', class: fora ? 'fora' : null }, [
      el('input', {
        type: 'text', value: columna.titol, 'aria-label': UI.titolColumna + ' ' + (c + 1), 'data-control': 'titol-' + c,
        onchange: function (e) { if (e.target.value.trim()) aplicaCanvi(c, { titol: e.target.value.trim() }, 'titol'); else e.target.value = columna.titol; }
      }),
      el('select', {
        'aria-label': UI.tipusColumna + ' ' + (c + 1), 'data-control': 'tipus-' + c,
        onchange: function (e) { aplicaCanvi(c, { tipus: e.target.value }, 'tipus'); }
      }, Object.keys(UI.tipus).map(function (t) { return el('option', { value: t, text: UI.tipus[t], selected: columna.tipus === t }); }))
    ]);
  }

  function llistaCopiats(etiqueta, valors) {
    return el('p', { text: etiqueta + ': ' + (valors.length ? valors.join(', ') : UI.cap) });
  }

  function baixa() {
    motor('exporta').then(function (r) {
      var url = URL.createObjectURL(new Blob([r.fitxer.bytes], { type: r.fitxer.mime }));
      var enllac = el('a', { href: url, download: r.fitxer.nom });
      document.body.appendChild(enllac);
      enllac.click();
      enllac.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }).catch(mostraError);
  }

  function pintaResultat() {
    var full = resultat.fulls[pestanya];
    var visibles = full.columnes.filter(function (c) { return c.tipus !== 'eliminar'; }).length;
    var barra = el('div', { class: 'barra' }, [
      el('p', { class: 'resum', text: UI.resum(full.numFiles, visibles) }),
      el('button', { type: 'button', class: 'boto', text: UI.baixa, onclick: baixa }),
      el('button', { type: 'button', class: 'boto secundari', text: UI.generaTot, onclick: function () {
        motor('regeneraTot').then(function (r) { resultat = r; pintaResultat(); }).catch(mostraError);
      } }),
      el('button', { type: 'button', class: 'boto secundari', text: UI.carrega, onclick: function () {
        motor('tanca').finally(function () { resultat = null; pintaInici(); });
      } })
    ]);
    var pestanyes = resultat.fulls.length > 1 ? el('ul', { class: 'pestanyes' }, resultat.fulls.map(function (f, i) {
      return el('li', {}, [el('button', { type: 'button', text: f.nom, 'aria-pressed': String(i === pestanya), onclick: function () { pestanya = i; pintaResultat(); } })]);
    })) : null;
    var taula = el('table', {}, [
      el('thead', {}, [el('tr', {}, full.columnes.map(capcaleraColumna))]),
      el('tbody', {}, full.files.map(function (fila) {
        return el('tr', {}, fila.map(function (valor, c) { return el('td', { text: valor, title: valor || null, class: full.columnes[c].tipus === 'eliminar' ? 'fora' : null }); }));
      }))
    ]);
    var copiats = el('details', {}, [
      el('summary', { text: UI.copiats }),
      el('p', { class: 'nota', text: UI.copiatsAvis }),
      llistaCopiats(UI.pestanyes, resultat.copiats.pestanyes),
      llistaCopiats(UI.titols, resultat.copiats.titols),
      llistaCopiats(UI.categories, resultat.copiats.categories)
    ]);
    contingut.replaceChildren.apply(contingut, [barra, el('p', { class: 'error', role: 'alert' }), pestanyes, el('div', { class: 'marc', tabindex: '0', role: 'region', 'aria-label': full.nom }, [taula]),
      el('p', { class: 'nota', text: UI.vista(full.files.length, full.numFiles) }), copiats].filter(Boolean));
  }

  ['dragover', 'drop'].forEach(function (nom) { document.addEventListener(nom, function (e) { e.preventDefault(); }); });
  document.querySelectorAll('[data-text]').forEach(function (element) { element.textContent = TEXTOS[element.getAttribute('data-text')]; });
  document.getElementById('versio').textContent = TEXTOS.versio + ' ' + VERSIO;
  canal = creaCanal();
  pintaInici();
}());
