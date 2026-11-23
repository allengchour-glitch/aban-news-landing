# Titelbild auf dem Handy: Startbild = erstes Videobild, Video startet früher (23.11.2026)

Grundlage: Besitzer 23.11. «titelbild lädt immernoch langsam» (Startseite, Handy).

## Befund (GEMESSEN 23.11., Pixel-5-Emulation, 4G 9 Mbit/s / 60 ms, CPU 4x, echte Seite)
- Das Standbild (Torbogen `luxe-wohnen-standbild-20261121.jpg`, 107 KB) erscheint nach ~1,6–2,6 s.
- Das eigentliche Titelvideo (`luxe-hero-handy-klein-1122.mp4`, 360×640, 524 KB, 32 s Schleife, Karussell mit Produktrahmen) lief erst nach **7,4–9,3 s** und zeigte dann eine **ganz andere Szene** als das Standbild (Sprung Torbogen → Rahmen-Karussell).
- Ursache 1: `assets/luxe-scroll-hero.js` ist ein Modul und läuft erst nach dem ganzen Dokument (~1 MB HTML, davon 573 KB Kopfbereich/Menü). Die Videoquelle wurde erst bei ~3,6–4,5 s gesetzt.
- Ursache 2: Danach blockieren Skripte den Hauptthread rund 5 s, darunter eine einzelne Aufgabe von 2 s. JS-Profil (Selbstzeit): Shopify-Pixel-Manager `/cdn/wpm/…js` 2,5 s (10 App-Pixel), Microsoft Clarity 1,0 s, Google-Tags 0,7 s, Meta 0,2 s, `account.js`/Shop-Login 0,2 s.
- Am Computer (ohne Drosselung) war es schon gut: Standbild 1,2 s, Video 2,0 s.

## LIVE (MAIN-Theme 214565814663, 23.11.2026 12:52:37–12:52:40 UTC)
| Datei | Änderung |
|---|---|
| `sections/luxe-edit-home.liquid` | Handy-`<picture><source>` mit dem ersten Videobild (gleiche Handy-Abfrage wie im Modul, ohne «reduzierte Bewegung»); `poster` entfällt bei gesetztem Handy-Standbild; Inline-Starter nach `</luxe-scroll-hero>` (startet das Video, sobald das Standbild geladen ist; tut nichts, wenn das Modul schon da ist oder der Hero nicht im Bild ist; bei Fehler vor dem Modul Quelle wieder weg; pausiert, wenn das Modul 10 s nach dem Start nicht kommt); Einblenden 0,35 s nur beim Einblenden und nur ohne «reduzierte Bewegung»; neue Einstellung `hero_campaign_mobile_image` |
| `templates/index.json` | `hero_campaign_mobile_image = shopify://shop_images/luxe-hero-handy-erstbild-2311.jpg` |

Neue Datei in Shopify-Dateien: `luxe-hero-handy-erstbild-2311.jpg` (MediaImage 78168353767815, 360×640, 18 KB, erstes Bild des Handy-Videos, per Browser-Canvas bei t=0 entnommen).
Sicherungen (byte-gleich mit dem Stand vor 12:52): `sicherung/*.vor-titelbild`. Endfassung: `neu/`.

## Gemessen nach dem Live-Gang (echte Seite, Handy, 4G, CPU 4x, n=5)
- Video sichtbar: Median **3,7 s** (2,5–3,8 s), vorher live 7,4–9,3 s.
- Standbild (LCP): Median 2,06 s (1,28–2,56 s), vorher live 1,6–2,6 s, also **praktisch gleich**. Bei 4G bestimmt das grosse Dokument den LCP, nicht die Bildgrösse.
- CLS 0. Auf dem Handy wird der Torbogen nicht mehr geladen, nur das 18-KB-Standbild.
- Öffentliche Seite über fremden Zugang (Firecrawl, maxAge 0) geprüft: Standbild, Starter und `<picture>` sind da, kein Torbogen-Poster, kein Liquid-Fehler.

Vorher im live-nahen Replay geprüft (Dokument gedrosselt über einen lokalen Server, `messung/messen2.mjs … netz`, n=5): Video sichtbar 7,66 → 3,09 s, LCP 1,53 → 1,57 s, CLS 0 → 0, load 7,88 → 7,60 s. Desktop (Replay): kein Rückschritt.
⚠️ Messgerät-Lehre: `messung/replay.mjs` liefert das Dokument per `route.fulfill` ungedrosselt aus und schönt dadurch den LCP (erste Zahl «1588 → 1068 ms» war so nicht haltbar). Ausserdem nimmt sein Median bei gerader Laufzahl den unteren Wert. Für Vergleiche: `messen2.mjs` im Modus `netz` und ungerade Laufzahl.

## Gegenprüfung (Workflow `wf_6e15dc31-42b`: 3 Prüfer Logik/Darstellung/Messung + Kritik)
Urteil: kein Blocker. Alle sieben Funde sind in der Endfassung behoben:
1. Wächter `customElements.get('luxe-scroll-hero')`: Der Starter tut nichts mehr, wenn das Modul schon entschieden hat (vorher spielte das Video unsichtbar weiter oder lud ein kaputtes Video doppelt).
2. Hero-im-Bild-Prüfung am Element statt `scrollY` zur Parse-Zeit.
3. Fehler-Listener: Bei einem Videofehler vor dem Modul bleibt kein toter «Video abspielen»-Knopf.
4. Einblenden nur beim Einblenden, also keine 0,35 s dunkle Ausblendung.
5. «Reduzierte Bewegung» behält den scharfen Torbogen.
6. Standbild nur bei ausdrücklich gesetztem Handy-Video.
7. 10-s-Pause ohne Modul (WCAG 2.2.2).

Nachgeprüft in echtem Chromium (`messung/t4_fin.mjs`, `t6_fin.mjs`): reduzierte Bewegung, Autoplay gesperrt, Video-404 und Normalfall verhalten sich wie vorher. Die einzige Ausnahme: beim 404 geht eine zweite Anfrage raus. Simulation `messung/sim_fin.mjs`: 10 Fälle in Ordnung.
Standbild und erstes Videobild weichen im Mittel um 1,3/255 ab, unter der clip-path-Linie um 0.

## Rücknahme
```bash
cd dropship/titelbild-handy-2311 && ./tok.sh          # Token per Client-Credentials in .tok
ZURUECK=1 python3 hochladen.py                         # Trockenlauf
ZURUECK=1 LIVE=1 python3 hochladen.py                  # zuerst index.json, dann der Abschnitt auf .vor-titelbild
```
Bricht nicht ab, wenn inzwischen jemand anderes `templates/index.json` geändert hat (die tägliche Katalog-Rotation schreibt sie), dann aber deren Änderungen mit zurücksetzen → vorher vergleichen.

## Offen (Entscheide des Besitzers, nicht umgesetzt)
- **Kopfbereich 573 KB HTML** (Menü mit ~1 460 Links, Desktop + Handy-Schublade) auf jeder Seite: der grösste Hebel für das erste Bild bei 4G.
- **App-Pixel/Tags**: 10 App-Pixel im Pixel-Manager, Clarity doppelt (App-Einbettung `clarity.js` und Clarity-Pixel), Google-Tags AW-/GT-. Jede entfernte oder gebündelte Messung macht das Handy schneller.
- **Schärfe**: Das Handy-Video und damit das Standbild haben 360×640. Ohne Video (Datensparen, 2G, iOS-Stromsparmodus) wirkt das Standbild weicher als der Torbogen. Abhilfe wäre ein Handy-Video samt erstem Bild in 720×1280.
- **Desktop**: Der Sprung Torbogen → Video-Karussell bleibt (Video nach ~2 s). Ein Desktop-Standbild aus dem ersten Bild des Desktop-Videos ginge analog.
- **iPhone/Safari**: nicht im echten WebKit geprüft. Einmal auf dem iPhone ansehen, normal und im Stromsparmodus.
