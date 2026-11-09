// Lector de .ods. Només es llegeix content.xml, i d'ell només les taules.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var recorre = GTP.xml.recorre, zip = GTP.zip, LIMITS = GTP.LIMITS;

  function ocult(valor) { return valor === 'collapse' || valor === 'filter'; }

  function repeticio(valor) {
    var n = Number(valor || 1);
    return n >= 1 && isFinite(n) ? Math.floor(n) : 1;
  }

  function llegeixContingut(text) {
    var fulls = [], avisos = { errors: 0, senseValor: 0 };
    var estilsOcults = new Set(), estilActual = null;
    var full = null, fila = 0, columnaDefinida = 0, col = 0, filaActual = null, atributsFila = null;
    var cella = null, profunditat = 0, profunditatCella = 0, dinsParagraf = 0, excloure = 0, celles = 0;
    var taulaImbricada = 0;

    function valorCella(a, text) {
      if (a['calcext:value-type'] === 'error') { avisos.errors++; return null; }
      var tipus = a['office:value-type'];
      switch (tipus) {
        case 'float': case 'percentage': case 'currency': {
          var n = Number(a['office:value']);
          return isFinite(n) ? n : null;
        }
        case 'boolean': return a['office:boolean-value'] === 'true';
        case 'date': {
          var iso = a['office:date-value'] || '';
          var d = new Date(/T/.test(iso) ? iso + 'Z' : iso + 'T00:00:00Z');
          return isNaN(d.getTime()) ? (text || null) : d;
        }
        case 'string':
          return a['office:string-value'] !== undefined ? (a['office:string-value'] || null) : (text || null);
        case undefined:
          if (a['table:formula'] !== undefined) { avisos.senseValor++; return null; }
          return text || null;
        default:
          return text || null;
      }
    }

    recorre(text, {
      capturant: false,
      text: function (s) { cella.text += s; },
      obre: function (nom, a) {
        profunditat++;
        if (nom === 'style') { estilActual = a['style:family'] === 'table' ? a['style:name'] : null; return; }
        if (nom === 'table-properties') { if (estilActual && a['table:display'] === 'false') estilsOcults.add(estilActual); return; }
        if (cella) {
          if (nom === 'table') { taulaImbricada++; return; }
          if (taulaImbricada) return;
          if (nom === 'p' && profunditat === profunditatCella + 1) {
            if (cella.paragrafs++ > 0) cella.text += '\n';
            dinsParagraf++;
            this.capturant = true;
          } else if (dinsParagraf) {
            if (nom === 'annotation' || nom === 'note' || nom === 'frame') { excloure++; this.capturant = false; }
            else if (!excloure) {
              if (nom === 's') cella.text += ' '.repeat(Math.min(repeticio(a['text:c']), 1024));
              else if (nom === 'tab') cella.text += '\t';
              else if (nom === 'line-break') cella.text += '\n';
            }
          }
          return;
        }
        if (nom === 'table') {
          full = { nom: a['table:name'], amagat: estilsOcults.has(a['table:style-name']), files: [], columnesAmagades: new Set(), filesAmagades: new Set(), formats: {} };
          fulls.push(full);
          fila = 0; columnaDefinida = 0;
        } else if (!full) {
          return;
        } else if (nom === 'table-column') {
          var repetides = repeticio(a['table:number-columns-repeated']);
          if (ocult(a['table:visibility'])) {
            var fins = Math.min(columnaDefinida + repetides, LIMITS.columnes);
            for (var c = columnaDefinida; c < fins; c++) full.columnesAmagades.add(c);
          }
          columnaDefinida += repetides;
        } else if (nom === 'table-row') {
          filaActual = null; col = 0; atributsFila = a;
        } else if (nom === 'table-cell' || nom === 'covered-table-cell') {
          cella = { a: a, text: '', paragrafs: 0 };
          profunditatCella = profunditat;
        }
      },
      tanca: function (nom) {
        var nivell = profunditat--;
        if (cella) {
          if (nom === 'table' && taulaImbricada) { taulaImbricada--; return; }
          if (taulaImbricada) return;
          if (nom === 'annotation' || nom === 'note' || nom === 'frame') {
            if (excloure && --excloure === 0 && dinsParagraf) this.capturant = true;
            return;
          }
          if (nom === 'p' && dinsParagraf && nivell === profunditatCella + 1) {
            dinsParagraf--;
            this.capturant = false;
            return;
          }
          if (nivell === profunditatCella && (nom === 'table-cell' || nom === 'covered-table-cell')) {
            var valor = valorCella(cella.a, cella.text);
            var repeticions = repeticio(cella.a['table:number-columns-repeated']);
            if (valor !== null) {
              if (col + repeticions > LIMITS.columnes) throw new GTP.ErrorLectura('massa-gran');
              filaActual = filaActual || [];
              for (var i = 0; i < repeticions; i++) filaActual[col + i] = valor;
              celles += repeticions;
              if (celles > LIMITS.celles) throw new GTP.ErrorLectura('massa-gran');
            }
            col += repeticions;
            cella = null;
          }
          return;
        }
        if (nom === 'table-row' && full) {
          var repetides = repeticio(atributsFila && atributsFila['table:number-rows-repeated']);
          if (filaActual) {
            if (fila + repetides > LIMITS.files) throw new GTP.ErrorLectura('massa-gran');
            celles += filaActual.length * (repetides - 1);
            if (celles > LIMITS.celles) throw new GTP.ErrorLectura('massa-gran');
            var amagada = ocult(atributsFila['table:visibility']);
            for (var f = 0; f < repetides; f++) {
              full.files[fila + f] = filaActual;
              if (amagada) full.filesAmagades.add(fila + f);
            }
          }
          fila += repetides;
        } else if (nom === 'table') {
          full = null;
        } else if (nom === 'style') {
          estilActual = null;
        }
      }
    });
    return { fulls: fulls, avisos: avisos };
  }

  function llegeix(bytes, opcions) {
    var limit = opcions && opcions.limitEntrada;
    var manifest = zip.extreu(bytes, ['META-INF/manifest.xml'], limit)['META-INF/manifest.xml'];
    if (manifest && zip.text(manifest).indexOf('encryption-data') >= 0) throw new GTP.ErrorLectura('protegit-o-antic');
    return llegeixContingut(zip.text(zip.extreu(bytes, ['content.xml'], limit)['content.xml']));
  }

  GTP.lectorOds = { llegeix: llegeix };
}(globalThis));
