# Especificacions · generador-taules-prova

| | |
| --- | --- |
| **Nom** | `generador-taules-prova` |
| **De qui és** | CodeCraft |
| **Codi curt** | `GTP` |
| **Estat** | Aprovat · 2026-11-09 |
| **Antecedent** | El repositori `anonimitzador-fulls`, que emmascarava els valors |
| **Llicència** | EUPL-1.2 |
| **Publicació** | Repositori públic a GitHub |

## 1. Objectiu

A partir d'un full de càlcul real, crear una taula **amb la mateixa forma i dades totalment inventades**, per fer demostracions i desenvolupaments amb eines d'IA. La taula ha de comportar-se com l'original (mateixes columnes, tipus i formats), sense que hi surti cap persona real. Tot passa a l'ordinador de qui l'utilitza.

## 2. Abast

### Dins de l'abast (1.0.0)

- Un sol fitxer HTML que s'obre amb el navegador, sense instal·lar res i sense connexió.
- Entrada: `.xlsx`, `.ods` i `.csv`.
- Sortida nova i creada des de zero: un `.csv` torna a ser `.csv`; un `.xlsx` o un `.ods` surten en `.xlsx`.
- Detecció automàtica del tipus de cada columna.
- Generació de totes les files de zero.
- Visualització del resultat i baixada.
- Segona passada amb indicacions per columna.

### Fora de l'abast (1.0.0)

- Conservar o barrejar valors reals de les files.
- Conservar les fórmules: la columna surt amb valors inventats.
- Conservar gràfics, imatges o colors de cel·la.
- Detectar el significat d'un text lliure.
- Relacions estadístiques entre columnes.
- Fitxers protegits amb contrasenya i `.xls` antics.
- Sortida `.ods`.

## 3. Usuaris

Una sola persona, sense comptes ni servidor. Ha de poder fer-ho sense coneixements tècnics.

## 4. Flux

1. **Carregar** el fitxer. L'aplicació l'analitza i genera el resultat sense preguntar res.
2. **Veure el resultat** i baixar-lo. Mai no es mostra l'original.
3. **Una altra passada**, només si cal: un menú a cada columna del resultat, i l'aplicació torna a generar.

## 5. Perfil de la taula

En carregar, de l'original només es conserva el **perfil**. Les files es descarten de la memòria.

| Es conserva | Exemple |
| --- | --- |
| Noms de pestanya, títols i ordre de columnes | `Curs`, `Telèfon` |
| Tipus de dada i format | data `dd/mm/aaaa`, 2 decimals |
| Nombre de files i proporció de cel·les buides | 1.200 files, 8 % buides |
| Nombre de valors distints | 340 |
| Rang aproximat de nombres i dates | de 3 a 10 |
| Patró de caràcters d'un codi | lletra, lletra, guió, quatre xifres |
| Categories repetides (R3) | `1r ESO`, `Noia` |
| Nombre de paraules de cada text, sense el text | 3, 18, 7 |
| Empremtes dels identificadors (R8) | no llegibles, amb sal de sessió |

## 6. Tipus de columna i generació

| Tipus | Com es genera | Exemple inventat |
| --- | --- | --- |
| Nom, cognoms, nom complet | Llista inclosa a l'aplicació | Marta Soler |
| DNI, NIE | Número aleatori amb lletra vàlida | 12345678A |
| Correu | A partir del nom de la fila, a `example.org` | marta.soler@example.org |
| Telèfon | Mateix patró i prefix mòbil o fix | 687 201 943 |
| IBAN | Mateix país, amb control vàlid | ES47 0182… |
| Codi postal | Prefix de província vàlid | 08225 |
| Municipi, adreça | Llista inclosa a l'aplicació | Sabadell |
| Data, data i hora | Dins del rang, amb el mateix format | 17/05/2012 |
| Enter, decimal, percentatge | Dins del rang, amb els mateixos decimals. **Continua sent un nombre** | 6,5 |
| Veritat o fals | Mateixa proporció aproximada | Sí |
| Categoria | Les categories admeses, en proporció semblant | 1r ESO |
| Codi amb patró | Xifra per xifra i lletra per lletra | KQ-7702 |
| Text lliure o variat | Lorem ipsum amb el mateix nombre de paraules (R14) | Dolor sit amet consectetur. |

## 7. Regles

**R1 · Cap valor real.** Del fitxer original només poden arribar al resultat els títols, els noms de pestanya i les categories admeses per R3.

**R2 · Automàtic.** No es demana cap decisió per generar el primer resultat. El que no es reconeix es tracta com a text variat.

**R3 · Categories.** Una columna només és de categories si cada valor admès apareix almenys 5 vegades i no té forma d'identificador. Un valor poc freqüent no arriba al resultat: es reparteix entre els admesos.

**R4 · Rangs sense extrems.** Els rangs es calculen sense el 5 % de valors més alts i més baixos, i s'arrodoneixen. Un valor excepcional no ha de definir el resultat.

**R5 · Forma de les dades.** Els nombres continuen sent nombres i les dates, dates. Un codi com `00123` continua sent text i conserva els zeros. Les cel·les buides mantenen una proporció semblant.

**R6 · Repeticions.** Una columna amb tots els valors únics continua tenint-los únics. Si una persona es repetia en diverses files, el resultat té el mateix nombre aproximat de valors distints.

**R7 · Coherència de fila.** Només es manté la coherència fàcil i útil per a una demostració: el correu surt del nom de la fila, el codi postal és del municipi de la fila i l'edat correspon a la data de naixement. No es reprodueix cap relació real entre columnes.

**R8 · Comprovació.** Un identificador generat que coincideixi amb un valor original es torna a generar. La comprovació fa servir empremtes amb una sal que només existeix durant la sessió.

**R9 · Relacions entre pestanyes.** Si una columna d'una pestanya conté els valors d'una altra, totes dues comparteixen els mateixos valors inventats, perquè els encreuaments funcionin.

**R10 · Segona passada.** Cada columna del resultat té un menú: canviar el tipus, canviar el títol, buidar-la, eliminar-la i regenerar. Treballa només amb el perfil.

**R11 · Fórmules.** Cap text del resultat s'ha de poder executar com a fórmula.

**R12 · Res més que valors.** El resultat es crea des de zero: sense comentaris, propietats, ni files, columnes o pestanyes amagades de l'original. Si la primera fila semblen dades i no títols, les columnes es diuen «Columna N».

**R13 · Vista.** Es mostren les primeres 50 files del resultat. La baixada les conté totes.

**R14 · Text lliure.** Cada text se substitueix per lorem ipsum amb exactament el mateix nombre de paraules que l'original. El fragment comença en una paraula aleatòria d'un passatge llarg, i continua pel principi si arriba al final, perquè no es repeteixi sempre el mateix text.

## 8. Requisits no funcionals

- **Sense xarxa.** Política de seguretat que bloqueja tota connexió.
- **Navegadors.** Darreres versions de Chrome, Edge, Firefox i Safari, en ordinador.
- **Volum.** 50.000 files i 100 columnes en menys de 30 s.
- **Accessibilitat.** WCAG AA i ús complet amb teclat.
- **Idioma.** Interfície i documentació en català.
- **Biblioteques.** Només `fflate`, amb versió fixada i suma comprovada.

## 9. Privacitat

- El fitxer original no surt de l'ordinador, i les seves files no es conserven després de l'anàlisi.
- Del fitxer només en poden sortir els títols, els noms de pestanya i les categories. Els títols i les categories són visibles al resultat, i s'han de revisar abans d'enviar-lo a una eina d'IA.
- Una dada inventada pot coincidir per atzar amb una de real, com un telèfon, un DNI o un nom.
- El resultat no ha de fer-se servir per enviar correus ni SMS reals.
- El fitxer original continua sent una dada personal i s'ha de custodiar igual.
- El repositori només conté dades inventades.

## 10. Criteris d'acceptació

- [x] Del carregar al resultat no cal cap decisió.
- [x] L'original no es mostra en cap moment.
- [x] Cap valor de les files originals apareix al resultat, excepte les categories admeses.
- [x] Un valor que apareix menys de 5 vegades no apareix al resultat.
- [x] Un valor extrem no apareix al resultat ni en defineix el rang.
- [ ] Els nombres i les dates es poden ordenar i sumar a Excel com a l'original.
- [x] Els DNI, NIE i IBAN generats superen la validació del dígit de control.
- [x] Un codi postal generat sempre té cinc xifres, també amb un zero inicial.
- [x] Una columna única continua sent única.
- [x] Cada text lliure generat té el mateix nombre de paraules que l'original.
- [x] Dos textos generats no comencen sempre per la mateixa paraula.
- [x] Dues pestanyes relacionades es poden encreuar al resultat.
- [x] La segona passada canvia només la columna indicada.
- [x] Un text que comença per `=` no s'executa.
- [x] Funciona sense connexió, sense cap petició de xarxa.
- [x] 50.000 × 100 dins del temps previst.
- [ ] Funciona als quatre navegadors.

## 11. Decisions de disseny

### DD-101 · 2026-11-09 · De l'anonimització a la generació
Context: la versió 1 feia revisar cada columna i emmascarava els valors. Les taules resultants no servien per fer demostracions, perquè trencaven tipus i formats.
Decisió: generar totes les files de zero a partir d'un perfil de la taula.
Conseqüències: desapareixen el càlcul de grups petits, l'informe i la decisió per columna. S'aprofiten els lectors, l'escriptor, el procés en segon pla, la política de seguretat i les proves corresponents.

### DD-102 · 2026-11-09 · Coherència limitada
Context: si tota la fila és inventada, reproduir les relacions reals no aporta informació.
Decisió: només es manté la coherència de R7.
Conseqüències: una edat i un curs poden no encaixar entre si.

## 12. Fases

0. Especificacions i vistiplau.
1. Perfil de la taula, amb proves.
2. Generadors i comprovació, amb proves.
3. Escriptura amb formats de data i decimals.
4. Interfície de carregar, resultat i segona passada.
5. Proves de navegadors, Excel, rendiment i accessibilitat.
6. Manual i README.
7. Publicació de la 1.0.0.

## 13. Riscos i pendents

- **Risc · Títols i pestanyes.** Es conserven per mantenir la forma, però poden contenir informació, com el nom d'una persona.
- **Risc · Detecció.** Una categoria mal detectada pot contenir dades reals. R3 ho limita, però cal revisar el resultat.
- **Risc · Norma de les aplicacions de Creixen.** Exigeix generar les dades de prova. Aquesta eina les genera, però parteix d'un fitxer real: cal confirmar que aquest ús és acceptable.
