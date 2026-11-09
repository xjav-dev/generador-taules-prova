// Tots els textos visibles de l'aplicació.
var TEXTOS = globalThis.TEXTOS = {
  titol: 'Generador de taules de prova',
  avisLocal: 'Crea una taula amb la mateixa forma que la teva i dades inventades. El fitxer no surt d\'aquest ordinador.',
  versio: 'versió',
  errors: {
    'fitxer-malmes': 'No s\'ha pogut llegir el fitxer. Pot estar malmès.',
    'xml-no-permes': 'El fitxer conté una estructura que no s\'admet per seguretat.',
    'massa-gran': 'El fitxer és massa gran per obrir-lo en aquest navegador.',
    'protegit-o-antic': 'El fitxer està protegit amb contrasenya o és un .xls antic. Treu-li la contrasenya o desa\'l com a .xlsx.',
    'fitxer-buit': 'El fitxer no té dades.',
    'format-no-admes': 'Aquest format no s\'admet. Fes servir .xlsx, .ods o .csv.',
    'intern': 'S\'ha produït un error inesperat. Torna a carregar el fitxer.'
  },
  ui: {
    ocupat: { obre: 'Creant la taula…', regeneraTot: 'Tornant a generar…', canvia: 'Actualitzant la columna…', exporta: 'Preparant la baixada…' },
    etiquetaFitxer: 'Fitxer', zona: 'Carrega un full de càlcul', zonaDetall: 'o arrossega\'l aquí. Formats: .xlsx, .ods i .csv.',
    explicacio: 'L\'aplicació reconeix cada columna i inventa totes les files. No veuràs l\'original.',
    resum: function (f, c) { return f + (f === 1 ? ' fila i ' : ' files i ') + c + (c === 1 ? ' columna inventades' : ' columnes inventades'); },
    baixa: 'Baixa la taula', generaTot: 'Torna a generar-ho tot', carrega: 'Carrega un altre fitxer',
    vista: function (v, t) { return 'Es mostren les primeres ' + v + ' de ' + t + ' files. La baixada les conté totes.'; },
    titolColumna: 'Títol de la columna', tipusColumna: 'Què hi ha a la columna',
    copiats: 'Què s\'ha copiat de l\'original', copiatsAvis: 'Revisa-ho abans de passar la taula a una eina d\'IA.',
    pestanyes: 'Pestanyes', titols: 'Títols de columna', categories: 'Categories repetides', cap: 'Cap',
    tipus: {
      nomComplet: 'Nom complet', nom: 'Nom', cognoms: 'Cognoms', dni: 'DNI o NIE', correu: 'Correu', telefon: 'Telèfon', iban: 'IBAN',
      codiPostal: 'Codi postal', municipi: 'Municipi', adreca: 'Adreça', data: 'Data', edat: 'Edat', nombre: 'Nombre', boolea: 'Sí o no',
      categoria: 'Categoria', patro: 'Codi', text: 'Text lliure', buida: 'Buidar', eliminar: 'Eliminar'
    }
  }
};
