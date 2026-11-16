# Bewegte Hintergründe für die Kategorieseiten (Testvorlage): Bericht

Stand: 16.11.2026 00:07 UTC (Arbeit 15.11. 22:25 bis 16.11. 00:07), Zeiten in UTC aus `date -u`. Ordner: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/bewegt1511`.
Herkunft der Aussagen: **GEMESSEN**, **QUELLE**, **Hypothese**, **unbekannt**.

## Kurzfassung

- Gebaut ist ein bewegter Kategoriekopf als **Zusatz** zum heutigen Kopf `lx-kopf-kompakt`. Der heutige Kopf bleibt unverändert und rendert weiter alles. Der neue Snippet `lx-kopf-bewegt` legt nur Stil, eine versteckte Clip-Bühne und ein kleines Skript dazu.
- **Nur als Testvorlage live** (seit 15.11. 23:16 UTC, letzte Fassung 16.11. 00:05 UTC): `?view=lxbewegt`. Für Kundinnen hat sich nichts geändert: alle sechs bestehenden Dateien haben vor und nach jedem Schreiben dieselbe Prüfsumme (GEMESSEN, vier Schreibvorgänge, nur eigene Dateien).
- **Desktop, alle Kategorieseiten:** die Fotos im Streifen driften langsam (Ken Burns, 17 bis 28 s je Foto, Massstab höchstens 1,08), der Streifen läuft beim Herausscrollen langsamer mit (Parallaxe, 30 % der Kopfhöhe), einmaliger Lichtglanz (2,4 s) über den Kopf.
- **Desktop ab 1100 px, 17 Kategorien mit passendem Clip:** statt der Fotos ein stummer, geloopter Produktclip rechts im Kopf, links weich ausgeblendet, dahinter ein unscharfer Farbschein desselben Bildes. Poster zuerst, Video erst nach dem Laden der Seite.
- **Handy:** keine Fotos, kein Clip, kein Knopf. Nur ein einmaliger, sanfter Goldschimmer hinter dem Titel (2,4 s, keine Höhe). Kopfhöhe und erstes Produktbild GEMESSEN identisch zu heute.
- **Higgsfield: 0 Credits.** Nur die sechs vorhandenen Story-Clips (Shopify Files) werden genutzt.

## Testlinks

- Clip: https://luxestyle.ch/collections/schmuck?view=lxbewegt
- Clip: https://luxestyle.ch/collections/weihnachten-2026?view=lxbewegt
- Clip: https://luxestyle.ch/collections/sub-beleuchtung?view=lxbewegt
- Clip: https://luxestyle.ch/collections/geschirr-tisch?view=lxbewegt
- Clip: https://luxestyle.ch/collections/sub-taschen?view=lxbewegt
- Clip: https://luxestyle.ch/collections/deko-objekte-accessoires?view=lxbewegt
- Fotostreifen mit Bewegung: https://luxestyle.ch/collections/damen-mode?view=lxbewegt
- Fotostreifen mit Bewegung: https://luxestyle.ch/collections/kueche-kochen?view=lxbewegt
- Jede andere Kategorie: `https://luxestyle.ch/collections/<handle>?view=lxbewegt`

## Clip-Zuordnung (Handles aus dem Hauptmenü gelesen, Mitgliedschaft per Admin-API, Clip am Bild geprüft)

Grundlage: `live/main-menu.json` (Menü `main-menu`, GEMESSEN 22:3x UTC), `live/produkt_sammlungen.json` (Sammlungen je Clip-Produkt), Bildbogen `fotos/clips_bogen.jpg` (je Clip vier Bilder bei 0, 1,25, 2,5 und 3,75 s, selbst angesehen).

| Clip | Was der Clip zeigt | Kategorien (Handle) | Begründung |
|---|---|---|---|
| S03 | Silbernes Tennisarmband, eine Steinreihe, auf Travertin | `schmuck`, `sub-armbaender`, `gliederarmbaender`, `zirkonia-strassarmbaender` | Produkt ist Mitglied aller vier Sammlungen; Armband ist Schmuck und Armband. Ausschnitt 1,45-fach vergrössert, weil das Armband im Clip klein ist. |
| S01 | Tulpen-Nachtlicht, Marmorkugel, Goldsockel, warmes Wohnzimmer | `sub-beleuchtung`, `nachtlichter-ambiente`, `wohnen-dekoration` | Produkt ist Mitglied aller drei; Leuchte im Wohnraum. |
| S05 | Box mit 9 beflockten Weihnachtskugeln, von oben | `weihnachten-2026`, `premium-geschenke` (Menü «Geschenke & Weihnachten») | Mitglied von `weihnachten-2026`. `premium-geschenke` selbst enthält das Produkt nicht, aber seine Untermenüs Weihnachten, Geschenke bis CHF 30 und Kleine Mitbringsel enthalten es. |
| S06 | Reisetasche aus Rindsleder auf einer Bank | `sub-taschen` (Menü «Taschen & Rucksäcke»), `damen-reisetaschen`, `herren-reisetaschen`, `sub-reise` | Mitglied der drei Untersammlungen; die Oberkategorie zeigt Taschen, das Produkt steht in ihrem Untermenü «Reise- & Sporttaschen». |
| S08 | Rosa Gusseisen-Teekanne auf Sockel | `geschirr-tisch`, `kaffee-tee-trinken`, `teekannen-kaffeeservice` | Mitglied aller drei. Der Sockel gehört nicht zum Lieferumfang (Inszenierung, Befund vom Story-Bericht). |
| S10 | 8 Kristallspitzen in Holzbox, Weihnachtslichter | `deko-objekte-accessoires` | Mitglied; Dekoobjekt. |

**Bewusst ohne Clip (Fotostreifen bleibt, mit Bewegung):**
- **Mode** (`damen-mode`, `fur-ihn`): kein Clip zeigt Kleidung. Der Reisebeutel ist nicht Mitglied dieser Sammlungen.
- **Küche** (`kueche-kochen`, «Küchenbedarf & Kochzubehör»): die Teekanne ist dort nicht Mitglied. Der Shop führt Teekannen seit 03.11. unter «Geschirr», getrennt von Küche (Besitzerwunsch «kochen geschirr trennen»). Soll die Teekanne trotzdem auf Küche: eine Zeile im Snippet (`kueche-kochen` zur Zeile von `s08`).
- Fail closed: ist das Clip-Produkt nicht mehr kaufbar oder gelöscht, gibt Liquid keine Bühne und keinen Textabstand aus; dann Fotostreifen (GEMESSEN im Nachbau, Fälle «ausverkauft» und «gelöscht»).

## Gestaltung

- Kopf: dunkle Bühne wie heute. Ab 1100 px mit Clip: Clip rechts, Breite `clamp(320px, 30vw, 460px)`, volle Kopfhöhe (höchstens 300 px), linke 42 % weich ausgeblendet, Ausschnitt und Zoom je Clip. Dahinter der Posterbildschein, 28 px unscharf, 42 % Deckkraft. Der Text bekommt rechts Platz (Abstand 90 % der Clipbreite), damit er den Clip nicht überdeckt.
- Fotostreifen (ohne Clip): je Foto eigene Drift (Richtung, 21, 25, 17, 28 s, abwechselnd hin und zurück).
- Bildschirmfotos (selbst angesehen): Live `fotos/live_bogen1.jpg` (Schmuck, Weihnachten, Beleuchtung, Geschirr), `fotos/live_bogen2.jpg` (Taschen, Dekoobjekte, Damen-Mode, Küche), Einzelbilder `fotos/live_<handle>_d.jpg`, Nachbau `fotos/nb_*.jpg`.
- Mein Urteil: wirkt deutlich hochwertiger, ruhig, das Produkt steht ganz im Bild. Schwächen: siehe «Offen».

## Technik

- Aufruf in `templates/collection.lxbewegt.json`, Abschnitt `lux_hero`:
  `{% render 'lx-kopf-bewegt', teil: 'kopf' %}{% render 'lx-kopf-kompakt' %}{% render 'lx-kopf-bewegt', teil: 'fuss' %}`
  Sonst ist die Vorlage eine Kopie der live gelesenen `templates/collection.json` (gleiche Abschnitte, gleiche Reihenfolge; geprüft per Vergleich, nur dieser eine Wert anders).
- `teil: 'kopf'` = Stil **vor** dem Kopf, damit Textabstand und Regeln vor dem ersten Zeichnen gelten. `teil: 'fuss'` = versteckte Bühne (`hidden`, Poster als `<picture>` mit 1-px-Platzhalter bis 1099 px, also am Handy kein Download) und ein Skript (rund 2,6 KB).
- Bewegung nur über `transform`, `translate`, `opacity`. Parallaxe per `animation-timeline` (benannte View-Timeline am Kopf, Bereich `exit`), sonst Rückfall per Skript mit `requestAnimationFrame`.
- Ken Burns startet erst, wenn die Seite und **alle Kopffotos geladen** sind (Klasse `lx-kb-drift`). Grund GEMESSEN: in der ersten Fassung wurde ein später geladenes, schon vergrössertes Foto zum LCP-Element, Damen-Mode LCP Median 720 → 2 240 ms (Nachbau, gedrosselt). Nach der Korrektur 668 → 704 ms, gleiches LCP-Element wie heute.
- Clip und Poster über den Shop-Pfad `/cdn/shop/files/…` (gleiche Herkunft, GEMESSEN HTTP 206 für mp4 und webp), nicht über `cdn.shopify.com` (zweite Verbindung).
- Video: erst nach `load`, 300 ms und Leerlauf; `muted`, `playsinline`, `loop`, `preload=metadata`, `aria-hidden`. Wird erst eingeblendet, wenn es spielt. Fehler oder gesperrtes Autoplay: Video weg, Poster bleibt, Knopf weg. Datensparmodus und 2G: nur Poster. Ausserhalb des Bildes pausiert.
- Knopf «Bewegung anhalten» (34 px, unten rechts, WCAG 2.2.2): hält Video, Ken Burns und Parallaxe an, Beschriftung wechselt auf «Bewegung fortsetzen», Wahl bleibt im Browser gespeichert (`localStorage`, Fehler abgefangen). Französisch: «Mettre l’animation en pause». Auf Clipseiten erscheint er erst, wenn das Video spielt (vorher läuft nichts länger als 5 s).
- `prefers-reduced-motion`: keine Klasse, keine Bewegung, kein Knopf, kein Glanz; Clipseiten zeigen das Standbild. Ohne JavaScript: Desktop wie heute (Fotostreifen still), am Handy nur der einmalige Schimmer (reines CSS, 2,4 s, darum ohne Knopf zulässig).
- Grösse: Snippet-Datei 12 462 Byte; ausgegebenes HTML je Seite rund 8,1 KB (Stil 4,1 KB, Bühne und Skript 3,1 bis 4,1 KB). GEMESSEN `wohnen-dekoration?view=lxbewegt` 2 000 327 Byte (heutige Seite 1 992 215 Byte, 40 min früher geholt).

## Messwerte

### Live, echte Seiten (`test/live_pruefen.cjs`, ein Seitenaufruf je 7 s, Analytik blockiert)

| Lauf (UTC) | Seiten | Ergebnis |
|---|---|---|
| Desktop 1440×900, 23:17 | schmuck, weihnachten-2026, sub-beleuchtung, geschirr-tisch, sub-taschen, deko-objekte-accessoires, damen-mode, kueche-kochen | alles OK: HTTP 200, 0 Liquid-Fehler, 0 Seitenfehler, kein seitliches Scrollen, Clip spielt auf den 6 Clipseiten (Video 206, Poster 200), Fotos driften auf den 2 anderen, Knopf sichtbar, Kopf beim ersten Zeichnen gleich wie nach dem Laden (y 251, Höhe 230), keine Verschiebung nur im Kopf, Parallaxe beim Herausscrollen |
| Handy 390×664, 23:19 | schmuck, weihnachten-2026, geschirr-tisch, damen-mode, kueche-kochen (je auch heute) | alles OK: Kopfhöhe 62 und erstes Produktbild bei 388 bis 389 px **wie heute**, also unter 664; kein Clip, kein Poster, kein Knopf geladen; Schimmer läuft; keine Verschiebung im Kopf |
| Desktop 23:30 (Fassung mit LCP-Korrektur) | schmuck, sub-beleuchtung, damen-mode, kueche-kochen | alles OK |
| Handy 23:31 | schmuck, damen-mode | alles OK |
| Desktop 23:49 (Fassung mit Shop-Pfad) | geschirr-tisch, weihnachten-2026, damen-mode | alles OK; HTML führt `data-video="/cdn/shop/files/lx-story-s08-quer-v1.mp4…"` (GEMESSEN 23:5x) |
| Handy 23:5x (Fassung mit Shop-Pfad) | weihnachten-2026, kueche-kochen | alles OK |
| Handy 00:05 und Desktop 00:06 (letzte Fassung, Schimmer ohne harte Kanten) | Handy: weihnachten-2026, damen-mode; Desktop: schmuck, kueche-kochen | alles OK, 0 Liquid-Fehler |

### LCP

| Messung | heute | Test | Bemerkung |
|---|---|---|---|
| Nachbau gedrosselt (40 ms, 10 Mbit/s), schmuck, 3 Läufe | 632 ms | 708 ms | Test-LCP ist der unscharfe Posterschein (`lx-kb__amb`) |
| Nachbau gedrosselt, damen-mode, nach Korrektur | 668 ms | 704 ms | gleiches Element |
| Nachbau gedrosselt, kueche-kochen, nach Korrektur | 656 ms | 620 ms | |
| Live gedrosselt, schmuck, 3 Läufe (vor Pfadwechsel) | 1 512 ms | 1 624 ms | Streuung heute 1 400 bis 1 916 |
| Live gedrosselt, damen-mode, 3 + 6 + 4 Läufe | 1 232 / 964 / 1 404 ms | 1 484 / 1 236 / 1 364 ms | uneinheitlich; im 3. Lauf TTFB 728 gegen 722, LCP minus TTFB 716 gegen 680 |

Ehrlich: kein sicherer Nachteil, aber auch kein Beweis für «gleich». Die Testvorlage hat eine Abfrage `?view=` (Hypothese: Cache des Shops kann anders greifen). Nach einem Umschalten an echten Zahlen messen.

### CLS

- Live und Nachbau: **keine Verschiebung, die nur den Kopf betrifft** (alle Läufe 0). Kopfhöhe beim ersten Zeichnen gleich wie nach dem Laden (alle Live-Desktopläufe).
- Gesamt-CLS schwankt schon heute (Verschiebung des ganzen Abschnitts bei 1100 px, Quellen Abschnitt, Kopf, Produktraster, auch ohne Testkopf). Abwechselnd gemessen, geschirr-tisch 1100 px, je 5 Läufe: Median heute 0,0271, Test 0,0114 (`mess/cls_geschirr_d1100.log`).

### Nachbau (gespeichertes echtes HTML, Testkopf lokal mit LiquidJS gerendert, `test/nachbau_test.cjs`)

- Geprüft je Seite und Fensterbreite (1440×900, 1100×800, 800×800, 390×664): kein seitliches Scrollen, keine Seitenfehler, Kopf oben und Abstand zum ersten Produktbild wie heute, Kopfhöhe bleibt nach dem Laden gleich, Text nicht abgeschnitten, Clip nur ab 1100 px, Fotostreifen ausgeblendet, Poster geladen, Clip spielt (dekodierte Bilder), Knopf sichtbar und überdeckt keinen Text, Text endet vor dem deckenden Teil des Clips, Ken Burns sichtbar, Massstab aus dem Stylesheet höchstens 1,08, Dauer 16 bis 28 s, oben keine Parallaxe-Verschiebung, Parallaxe beim Herausscrollen, am Handy: Kopfhöhe und erstes Produktbild gleich, unter 664, kein Clip und kein Poster geladen, Schimmer.
- `test/faelle_test.cjs`: reduzierte Bewegung (Clip- und Fotoseite), Datensparmodus, Autoplay gesperrt, ausverkauft, Produkt gelöscht, ohne JavaScript (Lage wie heute), Knopf mit Maus, Neuladen (Wahl gemerkt), Tastatur (Tab nach «Mehr anzeigen», Fokusrahmen, Enter, Leertaste), ausserhalb des Bildes pausiert und läuft wieder, Rückfall ohne scroll-gebundene CSS, Französisch.
- **Schlusslauf (Fassung mit Shop-Pfad, 23:50 bis 00:01 UTC):** `nachbau_test` 172 + 16 Prüfungen bestanden, 0 fehlgeschlagen (schmuck, damen-mode, weihnachten-2026, kueche-kochen bei 1440, 1100 und 390 px; schmuck bei 800 px); `faelle_test` 28 bestanden, 0 fehlgeschlagen. Danach nur noch der Verlauf des Handy-Schimmers geändert (CSS, keine Höhe): live nachgeprüft (oben), nicht nochmals im Nachbau.
- **Kontrast Handy-Schimmer GERECHNET:** stärkste Stelle Hintergrund #EDE3D0; Titel #1f1a12 rund 13:1, Beschreibung #3a3226 rund 9,6:1. Bild `fotos/handy_vergleich3.jpg` (links heute, rechts Test).

### Mutationsprobe (`test/mutationsprobe.mjs`, je Mutant eine Kopie des Snippets, die passende Prüfung, Quelle vorher und nachher gleich)

**15 von 15 erkannt, 0 überlebt** (Lauf 23:40 bis 23:47 UTC, `test/mutationsprobe_lauf1.log`; M16 neu gefasst und einzeln 23:48 UTC):

| Mutant | erkannt durch |
|---|---|
| M01 Handy-Sperre im Skript fehlt | Handy: Bewegungsklasse gesetzt |
| M02 Poster ohne Handy-Platzhalter | Handy: Poster geladen |
| M03 Textabstand neben dem Clip fehlt | Text reicht bei 1100 px in den Clip |
| M04 Ken Burns 1,12 | Keyframes aus dem Stylesheet über 1,08 |
| M05 reduzierte Bewegung im Skript ignoriert | Video geladen |
| M07 Datensparmodus ignoriert | Video geladen |
| M08 Autoplay-Sperre nicht abgefangen | Video bleibt, Knopf falsch |
| M09 nicht pausiert ausserhalb des Bildes | Clip läuft weiter |
| M10 Verfügbarkeit nicht geprüft | Bühne trotz «ausverkauft» |
| M11 Ken Burns ohne Skript | ohne JavaScript bewegt sich etwas |
| M12 Parallaxe-Bereich `cover` statt `exit` | oben schon 17 % verschoben |
| M13 Wahl nicht gemerkt | localStorage leer |
| M14 Rückfall-Skript fehlt | keine Parallaxe ohne CSS-Unterstützung |
| M15 Clip schon ab 750 px | Bühne bei 800 px |
| M16 Ken Burns ab Seitenstart (vor dem Laden) | LCP damen-mode 632 → 2 368 ms (Grenze +400 ms) |

- Nicht gezählt: M06 (nur die CSS-Regel für reduzierte Bewegung entfernt) ist gleichwertig, weil das Skript die Bewegungsklassen dann gar nicht setzt; die Regel ist eine zweite Sicherung. M17 (Bildprüfung in `drift()` entfernt) überlebt erwartungsgemäss: `drift()` läuft erst nach `load`, dann sind die Kopffotos schon geladen; die Prüfung schützt nur späte, faul geladene Fotos.

## Dateien

**Theme MAIN `gid://shopify/OnlineStoreTheme/213991391623` («LuxeStyle – SEO 14.11.2026», per `roles:[MAIN]` gelesen):**

| Datei | Art | md5 (Rücklesen GLEICH) |
|---|---|---|
| `snippets/lx-kopf-bewegt.liquid` | neu | `d84137f57851b747228a6afd1125c0ea` (12 462 Byte, 16.11. 00:05 UTC) |
| `templates/collection.lxbewegt.json` | neu | `bdb35745ee7d5c0722f9ad5f15cf4793` (9 405 Byte, 23:16 UTC) |

**Bestehend, nicht geändert (vor und nach jedem der vier Schreibvorgänge gleich, zuletzt 16.11. 00:05 UTC):**

| Datei | md5 |
|---|---|
| `templates/collection.json` | `f7592acb1a336cbcd98552693fd08ff4` |
| `snippets/lx-kopf-kompakt.liquid` | `a27ed6b6248968534648517fd58f8cd0` |
| `snippets/lx-kopf-pfad.liquid` | `69565ad5f8d9fde2fe6825f0afa87b5e` |
| `snippets/lx-kopf-chips.liquid` | `74104de0caa980fb1d751e0261f5d6bd` |
| `sections/main-collection.liquid` | `f928eda786bfa8cb29905a5ecf1ecd0c` |
| `layout/theme.liquid` | `62a77592ae9e0648d2ccec60bdf23979` |

Keine Shopify-Datei (Files) neu angelegt, keine Assets.

**Lokal:** (die 16 MB gespeichertes Seiten-HTML für den Nachbau sind gelöscht; neu holen mit `./holen.sh html/live "" schmuck damen-mode …`) `theme/` (Quellen), `apply_bewegt.mjs`, `umschalten.mjs`, `vorlage_bauen.mjs`, `shop.mjs`, `eingespielt.json` (Buch der eingespielten Stände), `nachbau.cjs`, `harness/render.mjs`, `test/` (Tests, Mutationsprobe, Live-Prüfung, LCP, CLS), `mess/` (Protokolle), `fotos/`, `live/` (gelesene Live-Dateien, Menü, Sammlungen), `holen.sh` (holt Seiten-HTML für den Nachbau, 7 s Takt).

## Werkzeuge

- `node apply_bewegt.mjs` Trockenlauf (Vorgabe). `LIVE=1` schreibt nur die zwei neuen Dateien, liest zurück, vergleicht die sechs bestehenden. `ZURUECK=1 LIVE=1` löscht nur die eigenen Dateien und nur, wenn sie noch unserem Stand entsprechen (Trockenlauf 23:20 UTC: würde genau die zwei löschen).
- `node umschalten.mjs` **(nur Trockenläufe ausgeführt, 15.11. 23:20 und 16.11. 00:06 UTC):** würde in `templates/collection.json` genau einen Wert ändern, `lux_hero.custom_liquid` von `{% render 'lx-kopf-kompakt' %}` auf die Zeile mit den drei Aufrufen. Bricht ab, wenn `collection.json` nicht mehr `f7592acb…` ist (`ERWARTET_MD5=<neu>` bestätigt bewusst) oder der Snippet fehlt oder fremd verändert ist. `LIVE=1` sichert vorher nach `sicherung/`. `ZURUECK=1 LIVE=1` setzt nur diesen Wert zurück.

## Rücknahme

1. Testvorlage entfernen: `ZURUECK=1 LIVE=1 node apply_bewegt.mjs` (löscht `snippets/lx-kopf-bewegt.liquid` und `templates/collection.lxbewegt.json`). Kundinnen merken nichts, weil nichts Live darauf zeigt.
2. Nach einem späteren Umschalten: erst `ZURUECK=1 LIVE=1 node umschalten.mjs`, dann Schritt 1.

## Offen und ungemessen

- Safari, iPhone, Firefox, echtes Gerät: nicht gemessen (nur Chromium). Firefox kennt `animation-timeline` nicht; dort greift der Skript-Rückfall (nur im Nachbau durch Abschalten der Unterstützung geprüft). Autoplay-Sperre nur nachgestellt.
- Mode und Küche ohne Clip (siehe oben). Für Mode bräuchte es einen Kleider-Clip (neue Credits, nicht erlaubt).
- Auf Clipseiten laden die zwei sofort geladenen Kopffotos trotzdem (vom unveränderten Kopf), obwohl sie ausgeblendet sind: Mehrlast rund zwei Bilder. Beheben ginge nur über eine Änderung an `lx-kopf-kompakt`.
- Clipseiten: das LCP-Element wird der unscharfe Posterschein. Video rund 0,37 bis 0,70 MB je Seite nach dem Laden.
- Seitengrösse `wohnen-dekoration` mit Testkopf 2,00 MB, noch 96 KB unter Googles Lesegrenze von 2 MiB (QUELLE Google-Blog 3/2026, nicht selbst geprüft).
- Die Beleuchtungs-Clips zeigen die oberste Tulpe zeitweise am oberen Rand.
- Textabstand rechts gilt nur auf Clipseiten ab 1100 px; lange Titel brechen dort früher um (Kopfhöhe blieb in allen Messungen 230 px).
- Wirkung auf Käufe unbekannt.
