# HYROX dashboard voor Mabel de Glas

Een simpele website met:
- alle gevonden races;
- PB / gemiddelde / trend;
- vergelijking van 2 races naast elkaar.

## Live via GitHub Pages
1. Push deze repo naar GitHub.
2. Zorg dat default branch `main` is.
3. Ga naar **Settings → Pages** en controleer dat de workflow deployment gebruikt wordt.
4. Na een push draait `.github/workflows/deploy-pages.yml` automatisch en krijg je een publieke URL.

## Realtime / automatische updates
- Workflow: `.github/workflows/update-data.yml`
- Draait elke 6 uur en probeert de data van `https://www.hyresult.com/athlete/mabel-de-glas` te vernieuwen.
- Als er nieuwe resultaten zijn, commit de workflow automatisch `athlete-data.json`.

## Let op
De scraper leest tekst uit de publieke HYRESULT-pagina. Als hun HTML-structuur verandert, moet `scripts/fetch-hyrox-data.mjs` mogelijk aangepast worden.
