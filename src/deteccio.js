// Reconeix el tipus d'una columna pel títol i pel format dels valors.
(function (g) {
  'use strict';
  var GTP = g.GTP = g.GTP || {};
  var LLETRES_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

  function paraules(llista) { return new RegExp('(^| )(' + llista + ')( |$)'); }

  var CAP = {
    text: paraules('observacions?|observaciones?|comentaris?|comentarios?|comments?|remarks|descripcio|descripcion|description|motiu|motivo|incidencies|incidencia|incidencias|notes internes'),
    dni: paraules('dni|nif|nie|passaport|pasaporte|passport'),
    correu: paraules('correu|correo|email|e mail|mail'),
    telefon: paraules('telefon|telefono|tel|phone|mobil|movil'),
    iban: paraules('iban|compte bancari|cuenta bancaria'),
    identificador: paraules('nia|ralc|cip|tis|targeta sanitaria|tarjeta sanitaria|nss|seguretat social|seguridad social|expedient|expediente|id|codi|codigo'),
    adreca: paraules('adreca|direccion|address|domicili|domicilio|carrer|calle'),
    naixement: paraules('naixement|nacimiento|birth|birthdate|dob'),
    postal: paraules('codi postal|codigo postal|cp|c p|postal|zip'),
    municipi: paraules('municipi|municipio|poblacio|poblacion|ciutat|ciudad|city|localitat|localidad'),
    edat: paraules('edat|edad|age'),
    cognoms: paraules('cognom|cognoms|apellido|apellidos|surname|last name'),
    nom: paraules('nom|nombre|name|alumne|alumna|alumno|persona|tutor|tutora|pare|mare|padre|madre|first name'),
    categoria: paraules('genere|genero|gender|sexe|sexo|curs|curso|grup|grupo|classe|clase|nacionalitat|nacionalidad|pais|country|escola|escuela|centre|centro|provincia|districte|distrito|estat|estado')
  };

  function normalitzaTitol(text) {
    return String(text === null || text === undefined ? '' : text)
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/·/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function lletraDni(numero) { return LLETRES_DNI.charAt(numero % 23); }

  function esDniNie(text) {
    var m = /^([XYZ]?)(\d{7,8})-?([A-Z])$/i.exec(text.trim().replace(/[ .]/g, ''));
    if (!m) return false;
    var prefix = m[1].toUpperCase();
    if (prefix ? m[2].length !== 7 : m[2].length !== 8) return false;
    return lletraDni(Number((prefix ? 'XYZ'.indexOf(prefix) : '') + m[2])) === m[3].toUpperCase();
  }

  function restaIban(net) {
    var reordenat = net.slice(4) + net.slice(0, 4), resta = 0;
    for (var i = 0; i < reordenat.length; i++) {
      var c = reordenat.charCodeAt(i);
      var digits = c >= 65 ? String(c - 55) : reordenat.charAt(i);
      for (var j = 0; j < digits.length; j++) resta = (resta * 10 + Number(digits.charAt(j))) % 97;
    }
    return resta;
  }

  function esIban(text) {
    var net = text.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(net) && restaIban(net) === 1;
  }

  function esCorreu(text) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim()); }
  function esTelefon(text) { return /^(\+34|0034)?[6789]\d{8}$/.test(text.replace(/[\s.()-]/g, '')); }
  function semblaNomPersona(text) { return /^\p{Lu}[\p{L}'’-]+(\s+(de|del|la|i|y|\p{Lu}[\p{L}'’-]+)){1,4}$/u.test(text.trim()); }

  function diaValid(any, mes, dia) {
    if (!(any >= 1900 && any <= 2100)) return null;
    var data = new Date(Date.UTC(any, mes - 1, dia));
    return data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia ? data : null;
  }

  // Sense any de dues xifres: es podria llegir de massa maneres.
  function dataDeText(text) {
    var net = String(text).trim(), m;
    if ((m = /^(\d{4})([/.-])(\d{1,2})\2(\d{1,2})(?:[T ].*)?$/.exec(net))) {
      return { data: diaValid(+m[1], +m[3], +m[4]), mascara: { ordre: 'ama', separador: m[2], zeros: m[3].length === 2 } };
    }
    if ((m = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4})(?: .*)?$/.exec(net))) {
      return { data: diaValid(+m[4], +m[3], +m[1]), mascara: { ordre: 'dma', separador: m[2], zeros: m[1].length === 2 } };
    }
    return null;
  }

  GTP.deteccio = {
    CAP: CAP, normalitzaTitol: normalitzaTitol, lletraDni: lletraDni, restaIban: restaIban, esDniNie: esDniNie,
    esIban: esIban, esCorreu: esCorreu, esTelefon: esTelefon, semblaNomPersona: semblaNomPersona, dataDeText: dataDeText
  };
}(globalThis));
