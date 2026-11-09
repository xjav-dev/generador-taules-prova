# Generador de taules de prova

Crea una taula amb la mateixa forma que un full de càlcul real i dades totalment inventades, per fer demostracions i desenvolupaments amb eines d'IA. S'obre al navegador i treballa només a l'ordinador de qui la fa servir.

**Estat:** en proves.

Del fitxer original només en surten els títols, els noms de pestanya i les categories repetides. Revisa'ls abans de passar la taula a una eina d'IA.

## Desenvolupament

Cal Node.js 22, Playwright i axe-core.

```
npm run construeix   # genera dist/generador-taules-prova.html
npm run proves       # construeix i executa les proves
```

Les especificacions són a [ESPECIFICACIONS.md](ESPECIFICACIONS.md).

## Errors i suggeriments

Es poden comunicar a Issues, que són **públics**: no hi enganxis mai dades reals.

## Llicència

[EUPL-1.2](LICENSE).
