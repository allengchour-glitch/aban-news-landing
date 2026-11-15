# Codex-Theme «Kaufhinweis 15.11.2026»: sieben Dateien auf MAIN übernommen (15.11.2026)

**Entscheid des Besitzers (15.11.2026, Antwort auf meine Frage):** «7 Dateien übernehmen (Empfohlen)».
Gemeint sind die sieben Dateien, die Codex in R230/R232 im unveröffentlichten Theme
`214040805767` «LuxeStyle – Kaufhinweis 15.11.2026» gebaut und der Besitzer mit «ja live» freigegeben hatte.
Codex konnte sie nicht live schalten (der Connector lehnt `theme_publish` für nicht selbst angelegte
Themes ab, R235).

## Warum nicht einfach das Codex-Theme veröffentlichen

GEMESSEN 15.11.2026 ca. 22:25 UTC (`md5.mjs`, alle Dateien beider Themes, Ergebnis `ergebnis.txt`):

- Das Codex-Theme wurde morgens als Kopie von MAIN angelegt. Seither hat MAIN den ganzen Tag weitere
  Änderungen bekommen.
- **6 Dateien gibt es nur in MAIN** (Scroll-Story `lx-story*`, Testseite `?view=lxstory`).
- **16 Dateien unterscheiden sich.** Davon sind 7 die freigegebenen Codex-Dateien. 6 weitere sind
  Änderungen, die MAIN seit dem Morgen bekommen hat: Kategorie-Kopf, Sammlungsseite, Scroll-Szene.
  Dazu kommen `layout/theme.liquid` (auf beiden Seiten geändert, MAIN trägt die Ankündigungsleiste),
  `snippets/cart-summary.liquid` (nur im Codex-Theme geändert) und `assets/luxestyle-manifest.json`.
- Ein Veröffentlichen hätte alle Änderungen des Tages zurückgedreht. Bei den letzten zwei Dateien
  wäre zudem eine Fassung mit unbekanntem Urheber live gegangen. Codex selbst schreibt dazu
  (R239): «nicht abgenommen».

## Was übernommen wurde

LIVE 15.11.2026 22:35:02 UTC, `uebernahme.mjs`, Ziel MAIN `213991391623`:

| Datei | Inhalt (laut Codex) |
|---|---|
| `blocks/buy-buttons.liquid` | Kaufhinweis direkt über den Kaufknöpfen (R230, Rizinusöl-Wickel) |
| `sections/footer-group.json` | Erfolgssatz des Newsletter-Popups (R229) |
| `assets/luxe-edit.css` | Einkaufswelten als Bildkarten (R232) |
| `sections/luxe-edit-home.liquid` | Einkaufswelten als Bildkarten (R232) |
| `locales/de.schema.json` | Editor-Felder der Bildkarten (R232) |
| `locales/en.default.schema.json` | Editor-Felder der Bildkarten (R232) |
| `templates/index.json` | zwei neue Kategoriebilder, Kinder & Baby und Schmuck (R232) |

**Bewusst NICHT übernommen:**

- `layout/theme.liquid`: MAIN trägt heute die Ankündigungsleiste. Die Fassung im Codex-Theme ist älter.
- `snippets/cart-summary.liquid`: Urheber unbekannt, von niemandem abgenommen (Codex R239).
- `assets/luxestyle-manifest.json`: Datei, die Codex beim Speichern schreibt, ohne Wirkung auf die Seite.

**Sicherung im Werkzeug:**

- Vor dem Schreiben musste jede MAIN-Datei genau die MD5 aus `basis_md5.json` haben.
- Zusätzlich durfte `updatedAt` nicht nach dem 15.11. 09:34 UTC liegen. Sonst hätte jemand die Datei inzwischen geändert.
- Die Fassungen vorher und nachher liegen in `sicherung/`.

## Messung danach

**Messgerät:** Playwright, Rechner der Sitzung, 15.11.2026 ab 22:36 UTC, öffentliche Seite.

| Was | Ergebnis |
|---|---|
| Handy 390 × 844, Einkaufswelten | 16 Karten in 2 Spalten, 16 von 16 Bildern geladen, kein seitliches Scrollen |
| Datenmenge der 16 Bilder | 220 183 Byte zusammen, je Bild 7 bis 31 KB |
| Rizinusöl-Wickel (ID 16592643817863) | Hinweis «Schwarz nur mit Klett, als Set oder Nackenwickel» und «Rizinusöl ist nicht enthalten.» steht direkt über Menge und Kaufknöpfen |
| Newsletter-Popup | neuer Satz «Deine Anmeldung wurde übermittelt» 1-mal, alter Satz «Dein Code ist auch gleich» 0-mal |
| Gratisversand-Rechnung (5556) | unverändert, 6 Fundstellen |
| Desktop 1440 × 900 | 16 Karten in 4 Spalten, 16 von 16 Bildern geladen, weisse Titel lesbar, CLS 0,0012, 0 Seitenfehler, kein seitliches Scrollen; `/fr` und `/collections/weihnachten-2026` ohne Fehler |

Die Bilder werden 320 px breit ausgeliefert und 173 px gross angezeigt. Auf Bildschirmen mit doppelter
Pixeldichte können sie leicht weich wirken. Das ist nicht gemessen.

## Urteil der Gegenprüfung (22:41 bis 22:43 UTC): «nachbessern», nicht zurücknehmen

- **Technisch sauber (GEMESSEN):**
  - Die 7 Dateien auf MAIN sind byte-gleich der Fassung «nachher».
  - `layout/theme.liquid` und `snippets/cart-summary.liquid` sind unverändert.
  - Die Gratisversand-Rechnung ist unverändert.
  - Der Kaufhinweis erscheint nur beim Rizinusöl-Wickel.
  - Der kompakte Kategoriekopf ist nicht berührt.
- **Wichtig 1, behoben 22:53 UTC (siehe unten):** 5 von 16 Karten zeigten angeschnittene Schrift alter Banner:
  - Damenmode: «Premium-Looks für jeden Auftritt»
  - Herrenmode: «clean, bequem, zeitlos»
  - Schuhe: «Pumps für den Sommer»
  - Wohnen und Deko: «Double happiness»
  - Geschenkideen: «FLOWERS STUDIO»

  Sichtbar wurde die Schrift erst durch die vollflächigen Karten. Vorher waren es 48 px kleine Vorschaubilder.
- **Wichtig 2, Entscheid beim Besitzer:** Die Bildkarten schieben die Produkte nach unten.
  - GEMESSEN durch Nachstellen des alten Zustands in derselben Seite: Desktop +677 px (erstes Produkt bei y 2113 statt 1436), Handy +900 px (2493 statt 1593).
  - Möglich wären Handy-Karten im Format 4:3 statt 1:1 (GERECHNET rund 344 px weniger), oder nur 8 Bildkarten und der Rest kompakt.
  - Nicht geändert: Der Besitzer hat diese Gestaltung mit «ja live» freigegeben.
- **Klein:**
  - Fünf Welten zeigen Produktfotos auf Weiss, unter dem Verlauf grau.
  - Bei dreifacher Pixeldichte laden die 16 Bilder zusammen 660 KB. Sie laden verzögert, das LCP-Element ist das Hero-Video.
  - Der erste Satz des Kaufhinweises hat keinen Schlusspunkt. Er ist wörtlich aus der Beschreibung geschnitten, darum nicht geändert.
  - Beim Überfahren mit der Maus gab es keine Rückmeldung. Behoben, siehe unten.
- **Widerlegt:** «französische Überschrift mit Akzent statt Apostroph». `locales/fr.json` enthält das richtige Zeichen ’ (GEMESSEN). Was der Prüfer sah, war die Schriftdarstellung.

## Nachbesserung «Einkaufswelten» 15.11.2026 22:53 UTC (`welten/`)

- **Motive:**
  - 10 Entwürfe mit Higgsfield `gpt_image_2_6` (4:5, 1k, high), zusammen rund 15 Credits.
  - Gleicher Stil wie Codex' Motive für Kinder und Schmuck: Cream und Taupe, keine Schrift, keine Logos, keine Personen.
  - Je Welt ein Motiv von Hand gewählt, siehe `welten/motive-gewaehlt.jpg`. Der Ausschnitt 4:3 (Desktop) und 1:1 (Handy) wurde vorher gerechnet und angesehen.
  - Ablage in Shopify Files als `luxestyle-einkaufswelt-{damenmode,herrenmode,schuhe,wohnen,geschenke}-20261115.png`, alle READY.
- **Theme (`welten/welten_bilder.mjs`, Trockenlauf Vorgabe, Basis-MD5-Prüfung, Sicherung `welten/sicherung/`):**
  - Die Sektion bekommt 5 weitere Bildwähler (`worlds_women_image`, `…men…`, `…shoes…`, `…home…`, `…gifts…`), gleiches Muster wie Kinder und Schmuck.
  - Dazu die Beschriftungen in `locales/de.schema.json` und `en.default.schema.json`, die Werte in `templates/index.json` und ein ruhiger Hover in `assets/luxe-edit.css`: Bild zoomt auf 1,045, nur mit Maus, nicht bei reduzierter Bewegung, auch bei Tastaturfokus.
  - Offline-Test `welten/test_welten.mjs`: 22 Prüfungen.
- **Falle:** Beim gemeinsamen Schreiben aller 5 Dateien hat Shopify die neuen Einstellungen in `templates/index.json` **still verworfen**, weil die Sektion die Felder in diesem Moment noch nicht kannte. Das Rücklesen zeigte es («ABWEICHUNG»). `welten/index_nachtrag.mjs` schrieb die Vorlage danach allein, Rücklesen GLEICH.
  - Lehre: Eine Vorlage, die neue Sektionsfelder setzt, erst nach der Sektion in einem eigenen Aufruf schreiben.
- **Rücknahme:**

  ```bash
  cd dropship/codex-theme-uebertrag-1511/welten && ZURUECK=1 LIVE=1 PHASE=theme node welten_bilder.mjs
  ```

  Sie setzt nur Dateien zurück, die noch der Fassung «nach» gleichen. Die Bilder in Shopify Files bleiben liegen und sind harmlos.

## Stufe 2 bis 4: alle 16 Karten mit eigenem Motiv (15.11.2026, 23:02 bis 23:29 UTC)

**Auftrag des Besitzers:** «mache es wie codex? oder verbessere?», dann «vergiss higgsfield nicht zu nutzen».
Meine Auslegung (nicht bestätigt): die übrigen Karten im selben Stil verbessern, mit Higgsfield.

- **Stufe 2 (`welten/welten2.mjs`, 23:02 UTC):**
  - 7 weitere Motive: Selbst gestalten, Taschen, Uhren, Küche, Elektronik, Gaming, Hundewelt (ruhender Hund, in Stufe 3 ersetzt). Ausgewählt nach Kontaktbogen, siehe `welten/motive-stufe2.jpg`.
  - Auf dem Handy (bis 760 px) sind die Karten 4:3 statt 1:1 (CSS-Block `lx-welten-1511b`).
  - **GEMESSEN (Playwright, 390 × 844):** das erste Produkt steht 346 px weiter oben als nach der Übernahme der Codex-Karten. Gegenüber dem Zustand vor der Übernahme bleiben die Karten trotzdem länger (Entscheid des Besitzers vom «ja live» unverändert).
  - Test `welten/test_welten2.mjs`: 33 Prüfungen.
- **Stufe 3 (`welten/welten3.mjs`, 23:18 UTC):**
  - Beauty und Sport hatten fest eingebaute Szenen im Liquid-Code. Neu entscheidet ein Schalter `lx_eigenes_motiv`: steht ein eigenes Motiv im Editor, gewinnt es, sonst bleibt die alte Szene.
  - Hundewelt: Hund im Pullover statt Produktfoto auf Weiss. Der Kopf sitzt oben im Bild, darum `object-position: 50% 12%` nur für diese Karte (Ausschnitt 4:3 vorher gerechnet). Kontaktbogen `welten/motive-stufe3.jpg`.
  - Titel brachen bei 761 bis 1099 px und auf kleinen Handys mitten im Wort («Damenmo-de»). CSS-Block `lx-welten-1511c`: Silbentrennung nach Wörterbuch, Schriftgrösse mit `clamp()` je Breite.
  - Test `welten/test_welten3.mjs`: 22 Prüfungen.
- **Higgsfield:** Modell `gpt_image_2_6`, 4:5, 1k, high, rund 1,5 Credits je Bild. Stufe 1 rund 15 Credits; Stufe 2 und 3 nicht einzeln nachgezählt.
- **Jetzt live:** alle 16 Karten zeigen `luxestyle-einkaufswelt-*-20261115.png` (2 von Codex, 14 von mir). Keine Schrift, keine Logos, keine Personen.
- **Falle (zweimal passiert):** Shopify verwarf die neuen Einstellungen in `templates/index.json` still, auch wenn die Vorlage 1 s nach der Sektion geschrieben wurde. Stufe 3 wartet darum 15 s und schreibt die Vorlage allein. Rücklesen aller Dateien GLEICH.
- **Nachmessung Stufe 3 (23:19 bis 23:26 UTC, drei unabhängige Prüfer, Urteil «ok»):**
  - GEMESSEN bei 14 Breiten von 320 bis 1920 px: 16 Karten, kein seitliches Scrollen, kein Titel über dem Kartenrand, kein Titel auf dem Pfeil.
  - Alle 16 Karten zeigen die Dateien vom 15.11.
  - Einziger Wortumbruch: «Geschenk-ideen» bei 320 und 344 px, mit Bindestrich an der richtigen Silbe.
  - `/fr` ohne Wortbruch.
  - Drei kleine Härtungen vorgeschlagen, siehe Stufe 4.
  - Hinweis für später: Elektronik und Gaming zeigen beide Kopfhörer, Sport zeigt nur Fitness drinnen.
- **Stufe 4 (`welten/welten4.mjs`, LIVE 23:29 UTC, Rücklesen GLEICH):**
  - «Geschenkideen» trennt jetzt fest mit weichem Trennzeichen (`replace: 'Geschenkideen', 'Geschenk&shy;ideen'`). Die automatische Silbentrennung hängt am Wörterbuch des Browsers. Ohne sie brach das Wort als «Geschenkidee / n».
  - Hundewelt: Ausschnitt `50% 5%` statt `12%`. Der Kopf hat oben Luft, die Leine bleibt im Bild. Simulation: `welten/hund-ausschnitt-12-gegen-5.jpg`.
  - `sizes` über 1440 px: `410px` statt `320px`. GEMESSEN bei 1920 px: es lädt das 480er-Bild statt des 320er-Bilds, das vorher auf 402 px hochgezogen wurde.
  - Selbst nachgemessen 23:30 UTC (320, 344, 390, 1440, 1920 px): weiches Trennzeichen im Titel, «Geschenk-» / «ideen» im Bild, Hund `50% 5%`, 16 Karten, kein seitliches Scrollen, 0 Seitenfehler.
  - Test `welten/test_welten4.mjs`: 18 Prüfungen.
  - **Unabhängige Prüfung (23:32 bis 23:35 UTC, drei Seitenaufrufe, Urteil «ok»):**
    - Roh-HTML: genau einmal `Geschenk&shy;ideen`, `410px` 16-mal, `320px` 0-mal.
    - Mit erzwungenem `hyphens:manual` bricht der Titel bei 320, 344 und 360 px weiterhin «Geschenk-» / «ideen».
    - `/fr` unverändert («Idées cadeaux»).
    - Hund `50% 5%` bei allen Breiten, Kopf ganz im Bild.
    - Bei 1920 px wird das 480er-Bild für eine 402 px breite Karte gewählt.
    - 16 Karten, kein seitliches Scrollen, 0 Seitenfehler.
    - Kleiner Hinweis: Der zugängliche Name des Links enthält in Chromium das weiche Trennzeichen. Bildschirmleser lesen es üblicherweise nicht vor. Nur bei Bedarf `aria-label` ergänzen.
    - Ungemessen: Safari/iOS, Firefox, Bildschirmfaktor 2 und 3.
- **Wiedervorlage:** das Geschenk-Motiv ist weihnachtlich. Nach dem 06.01. ersetzen.
- **Rücknahme in umgekehrter Reihenfolge** (jede Stufe setzt nur Dateien zurück, die noch ihrer Fassung «nach» gleichen):

  ```bash
  cd dropship/codex-theme-uebertrag-1511/welten
  ZURUECK=1 LIVE=1 PHASE=theme node welten4.mjs
  ZURUECK=1 LIVE=1 PHASE=theme node welten3.mjs
  ZURUECK=1 LIVE=1 PHASE=theme node welten2.mjs
  ZURUECK=1 LIVE=1 PHASE=theme node welten_bilder.mjs
  ```

## Rücknahme

```bash
cd dropship/codex-theme-uebertrag-1511 && ZURUECK=1 LIVE=1 node uebernahme.mjs
```

Die Rücknahme stellt eine Datei nur dann zurück, wenn MAIN noch genau der Fassung «nachher» entspricht.
Eine Datei, die inzwischen jemand anderes geändert hat, bleibt unberührt.

## Für Codex

- Theme `214040805767` **nicht veröffentlichen** und den Besitzer auch nicht mehr darum bitten: es ist älter als MAIN.
- Die sieben Dateien sind auf MAIN. Neue Theme-Arbeit von einer frischen Kopie von MAIN beginnen.
