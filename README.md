# HYROX dashboard voor Mabel de Glas

Een simpele website met:
- alle gevonden races;
- PB / gemiddelde / trend;
- vergelijking van 2 races naast elkaar;
- baseline-analyse: Amsterdam 2026 (eerste race) vs Rotterdam 2026 (tweede race);
- detailvergelijking per onderdeel (`totals`, `runs`, `workouts`, `splits`).

## Live via GitHub Pages
1. Push deze repo naar GitHub.
2. Zorg dat default branch `main` is.
3. Ga naar **Settings → Pages** en controleer dat de workflow deployment gebruikt wordt.
4. Na een push draait `.github/workflows/deploy-pages.yml` automatisch en krijg je een publieke URL.

## Realtime / automatische updates
- Workflow: `.github/workflows/update-data.yml`
- Draait elke 6 uur en probeert de data van `https://www.hyresult.com/athlete/mabel-de-glas` te vernieuwen.
- Als er nieuwe resultaten zijn, commit de workflow automatisch `athlete-data.json`.

## Verdiepte analyse invullen
- Bestand: `athlete-data.json`
- Vul in `analysis.categories` de metrics per tab in met waarden voor:
  - `baseline` = Amsterdam 2026
  - `second` = Rotterdam 2026
- Voor tijdmetrieken gebruik `type: "time"` met `HH:MM:SS`.
- Voor ranking/met numerieke data gebruik `type: "rank"` of `type: "number"`.

## Let op
- HYRESULT verandert soms HTML/anti-bot gedrag; daardoor is data scraping niet altijd stabiel.
- De site toont verbetering/verslechtering expliciet ten opzichte van de eerste race (baseline).
