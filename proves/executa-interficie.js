#!/usr/bin/env node
// Recorre l'aplicació com una persona, sense connexió i amb dades inventades.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { pathToFileURL } = require('url');
const playwright = require('playwright');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const { creaXlsx, creaOds, dniInventat } = require('./utilitats');

const navegador = playwright[process.env.NAVEGADOR || 'chromium'];
const url = pathToFileURL(path.join(__dirname, '..', 'dist', 'generador-taules-prova.html')).href;
const dirCaptures = process.env.CAPTURES;
let fallades = 0;
const comprova = (ok, text, detall) => {
  if (!ok) fallades++;
  console.log((ok ? '✓ ' : '✗ ') + text + (ok || detall === undefined ? '' : ' → ' + JSON.stringify(detall)));
};

const celles = (fila, valors) => `<row r="${fila}">${valors.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${fila}" t="inlineStr"><is><t>${v}</t></is></c>`).join('')}</row>`;
const dades = Array.from({ length: 12 }, (_, i) => celles(i + 2, ['Persona Secreta ' + i, dniInventat(40000000 + i), 'secret' + i + '@escola.cat', i % 2 ? 'Noia' : 'Noi', 'Comentari privat número ' + i + ' amb text']));
const llibre = creaXlsx({ fulls: [
  { nom: 'Llista', xml: '<worksheet><sheetData>' + celles(1, ['Nom', 'DNI', 'Correu', 'Gènere', 'Observacions']) + dades.join('') + '</sheetData></worksheet>' },
  { nom: 'Segona', xml: '<worksheet><sheetData>' + celles(1, ['Codi', 'Valor']) + celles(2, ['A-1', 'x']) + celles(3, ['A-2', 'y']) + '</sheetData></worksheet>' }
] });
const filaOds = (a, b) => `<table:table-row><table:table-cell office:value-type="string"><text:p>${a}</text:p></table:table-cell><table:table-cell office:value-type="string"><text:p>${b}</text:p></table:table-cell></table:table-row>`;
const ods = creaOds(`<table:table table:name="Dades">${filaOds('Nom', 'Observacions')}${filaOds('Secreta Persona', 'Text privat')}${filaOds('Altra Persona', 'Més text privat')}</table:table>`);

const audita = async (pagina, nom) => {
  for (const esquema of ['light', 'dark']) {
    await pagina.emulateMedia({ colorScheme: esquema });
    await pagina.evaluate(axe);
    const r = await pagina.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
    const v = r.violations.map((x) => x.id + ': ' + x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | '));
    comprova(v.length === 0, 'accessibilitat ' + nom + ' (' + esquema + ')', v);
  }
  await pagina.emulateMedia({ colorScheme: 'light' });
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtp-'));
  const xlsx = path.join(dir, 'privat.xlsx');
  fs.writeFileSync(xlsx, llibre);
  const fitxerOds = path.join(dir, 'privat.ods');
  fs.writeFileSync(fitxerOds, ods);

  const b = await navegador.launch();
  const context = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  await context.setOffline(true);
  const pagina = await context.newPage();
  const peticions = [], errors = [];
  context.on('request', (p) => { if (!/^(file|blob):/.test(p.url())) peticions.push(p.url()); });
  pagina.on('pageerror', (e) => errors.push(e.message));
  pagina.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const boto = (nom, p = pagina) => p.getByRole('button', { name: nom, exact: true });
  const captura = async (nom) => { if (dirCaptures) await pagina.screenshot({ path: path.join(dirCaptures, nom + '.png'), fullPage: true }); };

  await pagina.goto(url);
  await pagina.waitForSelector('html[data-motor]');
  comprova(await pagina.getAttribute('html', 'data-motor') === 'segon-pla', 'treballa en segon pla');
  await audita(pagina, 'inici');
  await captura('1-inici');

  await pagina.setInputFiles('input[type=file]', { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('hola') });
  await pagina.waitForSelector('.error:not(:empty)');
  comprova((await pagina.textContent('.error')).includes('format'), 'error de format');

  await pagina.setInputFiles('input[type=file]', xlsx);
  await pagina.waitForSelector('table');
  comprova(true, 'del carregar al resultat, sense cap decisió');
  const text = await pagina.textContent('table');
  comprova(!/Secreta|escola\.cat|privat/.test(text), 'la pantalla no mostra l\'original');
  comprova(await pagina.locator('tbody tr').count() === 12, 'mostra les files');
  await audita(pagina, 'resultat');
  await captura('2-resultat');

  // Segona passada: només canvia la columna indicada.
  const dniAbans = await pagina.locator('tbody tr:first-child td:nth-child(2)').textContent();
  await pagina.getByLabel('Què hi ha a la columna 1', { exact: true }).selectOption('buida');
  await pagina.waitForFunction(() => document.querySelector('tbody tr td').textContent === '');
  comprova(await pagina.locator('tbody tr:first-child td:nth-child(2)').textContent() === dniAbans, 'la resta de columnes no canvia');
  comprova(await pagina.evaluate(() => document.activeElement.getAttribute('data-control')) === 'tipus-0', 'el focus es queda a la columna canviada');

  await pagina.getByLabel('Títol de la columna 2', { exact: true }).fill('Identificador');
  await pagina.keyboard.press('Tab');
  await pagina.waitForFunction(() => document.querySelector('[data-control="titol-1"]').value === 'Identificador' && !document.getElementById('contingut').inert);

  await pagina.locator('summary').click();
  comprova((await pagina.textContent('details')).includes('Llista') && (await pagina.textContent('details')).includes('Noia'), 'mostra què s\'ha copiat');
  await audita(pagina, 'detall');

  await boto('Segona').click();
  comprova(await pagina.locator('tbody tr').count() === 2, 'canvia de pestanya');
  await boto('Llista').click();

  const [descarrega] = await Promise.all([pagina.waitForEvent('download'), boto('Baixa la taula').click()]);
  comprova(/^taula-prova_.*\.xlsx$/.test(descarrega.suggestedFilename()), 'baixa amb nom genèric');
  const fulls = GTP.lector.llegeix(new Uint8Array(fs.readFileSync(await descarrega.path())), 'a.xlsx').fulls;
  comprova(fulls.map((f) => f.nom).join() === 'Llista,Segona' && fulls[0].files[0][1] === 'Identificador', 'el resultat conserva pestanyes i títol nou', fulls[0].files[0]);
  comprova(!JSON.stringify(fulls).match(/Secreta|escola\.cat|privat/), 'el fitxer no conté l\'original');

  const abansTot = await pagina.locator('tbody tr:first-child td:nth-child(2)').textContent();
  await boto('Torna a generar-ho tot').click();
  await pagina.waitForFunction((a) => document.querySelector('tbody tr td:nth-child(2)').textContent !== a, abansTot);
  comprova(true, 'torna a generar-ho tot');

  await boto('Carrega un altre fitxer').click();
  await pagina.waitForSelector('.zona');
  await pagina.setInputFiles('input[type=file]', fitxerOds);
  await pagina.waitForSelector('table');
  comprova(!(await pagina.textContent('table')).includes('privat'), 'obre un .ods');

  comprova(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e)).length === 0, 'sense errors a la consola', errors);
  comprova(peticions.length === 0, 'cap petició de xarxa', peticions);

  // La política de seguretat ha d'aturar qualsevol connexió.
  let arribades = 0;
  const servidor = http.createServer((_, r) => { arribades++; r.end(); });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  await context.setOffline(false);
  await pagina.evaluate(async (desti) => {
    await fetch(desti + '/x', { mode: 'no-cors' }).catch(() => {});
    await new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = desti + '/x.png'; });
  }, 'http://127.0.0.1:' + servidor.address().port);
  comprova(arribades === 0, 'la política de seguretat bloqueja les connexions', arribades);
  servidor.close();

  const senseWorker = await context.newPage();
  await senseWorker.addInitScript(() => { window.Worker = function () { throw new Error('no'); }; });
  await senseWorker.goto(url);
  await senseWorker.waitForSelector('html[data-motor]');
  comprova(await senseWorker.getAttribute('html', 'data-motor') === 'local', 'alternativa sense procés en segon pla');
  await senseWorker.setInputFiles('input[type=file]', xlsx);
  await senseWorker.waitForSelector('table');
  comprova(true, 'funciona amb l\'alternativa');

  await b.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fallades ? fallades + ' fallades.' : 'Tot correcte.');
  process.exit(fallades ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
