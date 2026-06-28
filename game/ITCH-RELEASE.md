# 🕹️ Neon-Flug auf itch.io veröffentlichen (Web-Build = echter Verkaufskanal)

> Der Web-Build ist der **autonome Pfad zum Verkaufen** (kein GPU/Store-Account-Zwang wie Steam).
> Die Cloud-Session baut + testet ihn komplett selbst; **hochladen kann nur der User** (itch-Account).

## Build erzeugen (macht die Cloud-Session)
```
node tools/itch_build.cjs neon-flug.html
# → dist/neon-flug/index.html (standalone) + dist/neon-flug-itch.zip
```
Der Build ist **eigenständig**: three.js ist inline eingebettet, interne Links zeigen auf
`https://abannews.com/...`. Verifiziert per `tools/game_smoke.cjs`-Harness: 0 JS-Fehler, **0 externe
Requests** (läuft offline im itch-Iframe). Das ZIP wird dem User direkt geliefert (nicht ins Repo committet).

## Auf itch.io hochladen (macht der User — 5 Minuten, gratis)
1. itch.io-Konto → **Dashboard → „Create new project"**.
2. **Kind of project: `HTML`**.
3. ZIP (`neon-flug-itch.zip`) hochladen → Häkchen **„This file will be played in the browser"**.
4. **Embed-Größe:** 960 × 640 (oder „Fullscreen-Button" aktivieren). Mobile-friendly: an.
5. Titel „Neon-Flug", Beschreibung (DE/EN — Vorlage in `game/STEAM-STORE.md`), Cover/Screenshots
   (kann die Cloud-Session als Screenshots liefern: `node tools/game_smoke.cjs`).
6. Pricing: „**No payments**" (gratis, Reichweite/Funnel) **oder** „**Paid / Pay what you want**" (echtes Geld).
7. Visibility **Public** → „Save & view page".

## Tipps
- **Gratis + Newsletter-Funnel** bringt anfangs mehr (Reichweite → Wishlist für die Steam-Version).
- **Tags** auf itch: `arcade`, `roguelite`, `3d`, `endless-runner`, `html5`, `singleplayer`.
- Später dieselbe Mechanik als **Steam-Build** (Godot, lokaler Claude) → Premium.
- Cover-Bild + 3–5 Screenshots liefert die Cloud-Session auf Zuruf (headless-Chromium-Shots).
