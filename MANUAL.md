# Manual del Generador de taules de prova

Aquesta aplicació crea una taula amb la mateixa forma que un full de càlcul i amb les files totalment inventades. Serveix per fer demostracions i desenvolupaments amb eines d'IA sense fer servir dades de persones reals.

## Com es fa servir

1. Baixa el fitxer `generador-taules-prova.html` de la pàgina de versions del repositori.
2. Obre'l amb doble clic. S'obre al navegador i no cal instal·lar res ni tenir connexió.
3. Arrossega-hi un full `.xlsx`, `.ods` o `.csv`.
4. Revisa el resultat i prem **Baixa la taula**.

Un `.csv` torna a sortir en `.csv`. Un `.xlsx` o un `.ods` surten en `.xlsx`.

## Si alguna columna no et convenç

Sota el títol de cada columna hi ha un menú amb el tipus detectat.

- Tria un altre tipus i només es torna a generar aquella columna.
- Tria **Buidar** o **Eliminar** si no la necessites.
- Escriu sobre el títol per canviar-lo.
- **Torna a generar-ho tot** inventa de nou totes les files.

## Què es genera

| Tipus | Resultat |
| --- | --- |
| Nom, cognoms, nom complet | Noms de la llista de l'aplicació |
| DNI o NIE | Número inventat amb lletra vàlida |
| Correu | Fet a partir del nom de la fila, a `example.org` |
| Telèfon | Mateix patró que l'original |
| IBAN | Mateix país, amb control vàlid |
| Codi postal i municipi | Coherents entre si dins de la fila |
| Adreça | Carrer i número inventats |
| Data | Dins d'un rang semblant, amb el mateix format |
| Edat | Coherent amb la data de naixement, si n'hi ha |
| Nombre | Dins d'un rang semblant, amb els mateixos decimals |
| Sí o no | En una proporció semblant |
| Categoria | Les categories repetides, en una proporció semblant |
| Codi | Mateix patró, xifra per xifra i lletra per lletra |
| Text lliure | Lorem ipsum amb el mateix nombre de paraules |

Les cel·les buides es mantenen en una proporció semblant. Si una columna d'una pestanya conté els valors d'una altra, les dues comparteixen els valors inventats i es poden encreuar.

## Què surt del fitxer original

Només els **noms de pestanya**, els **títols de columna** i les **categories que es repeteixen almenys 5 vegades**. Ho pots consultar a **Què s'ha copiat de l'original**.

Revisa-ho abans de passar la taula a una eina d'IA. Si un títol o una pestanya contenen el nom d'una persona, canvia el títol o la pestanya.

## Què cal tenir en compte

- L'aplicació no mostra l'original i no conserva les files després d'analitzar-lo.
- El fitxer original continua sent una dada personal i s'ha de custodiar igual.
- Una dada inventada pot coincidir per atzar amb una de real, com un telèfon, un DNI o un nom. No facis servir la taula per enviar correus ni SMS reals.
- Les fórmules, els colors i els gràfics no passen al resultat. Una columna amb fórmules surt amb valors inventats.
- No admet fitxers protegits amb contrasenya ni `.xls` antics.
- Les files, columnes i pestanyes amagades no passen al resultat.

## Comprovar el fitxer baixat

Cada versió es publica amb la seva suma SHA-256. Al Terminal del Mac:

```
shasum -a 256 generador-taules-prova.html
```

El resultat ha de coincidir amb el fitxer `.sha256` de la mateixa versió.

## Errors i suggeriments

Es poden comunicar a la pestanya Issues del repositori, que és **pública**. No hi enganxis mai dades reals, captures amb dades ni fitxers de treball.
