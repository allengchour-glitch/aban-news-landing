# Kategorie-Kacheln: Menü-Links vom Typ HTTP (16.11.2026)

Anlass: Der Besitzer meldete am 16.11. «codex seite verbessert neue memory». Codex hat die
Kategorieseiten neu gebaut (R266 bis R268, Theme `214169584007` vom Besitzer veröffentlicht).
Codex schrieb selbst: geprüft wurden 4 Fälle, keine Vollprüfung aller Kategorieseiten. Diese
Prüfung holt das nach.

## Befund (GEMESSEN 16.11. abends)

- Codex' Abschnitte `lx-collection-welten` (Kopf und Bildkacheln) und `lx-collection-details`
  (Beschreibung und Nachbar-Kategorien unten) holen die Unterkategorien aus dem Metafeld
  `lux.unterfilter` und aus dem Hauptmenü. Im Menü zählen sie nur Einträge vom Typ
  `collection_link`.
- Im Hauptmenü sind die meisten Hauptpunkte und viele Unterpunkte als normaler Link (Admin:
  `type: HTTP`) auf `/collections/<handle>` gespeichert: Damen, Herren, Geschenke, Schuhe,
  Taschen, Uhren, Beauty, Wohnen, Elektronik, Gaming, Kinder, Haustiere, Highlights, Herbst,
  Sport & Party.
- Folge: **34 Übersichtsseiten zeigen 0 Kacheln**, obwohl das Menü 3 bis 28 Unterkategorien
  nennt (u. a. `damen-mode` 28, `fur-ihn` 23, `sub-taschen` 22, `premium-geschenke` 14,
  `elektronik-technik` 15, `sub-haustier` 12). Blattseiten unter einem HTTP-Eltern-Eintrag
  zeigen unten keine Nachbar-Kategorien (z. B. `haustier-hunde`, `kostueme-fasnacht`).
- Vorbestehend (eigenes Snippet `lx-kopf-pfad` vom 11.11.): steht dieselbe Sammlung als
  Hauptpunkt und als Unterpunkt im Menü, verlinkt der Pfad auf die eigene Seite (`beauty-pflege`,
  `elektronik-technik`, `bestseller`, `fitness-training`).

## Änderung (Fassung 3)

Drei unabhängige Prüfer haben Fassung 1 gelesen und gegengeprüft (Liquid, Rückschritte, Wirkung).
Fassung 2 und 3 setzen ihre bestätigten Funde um.

- Neues Snippet `snippets/lx-menu-knoten.liquid`: findet die Sammlung im Menü über den Handle
  aus der Link-URL (beide Linktypen, auch `/fr/`, Emoji-Handles per `url_decode`; Links mit
  Unterpfad, Seiten und Blogs zählen nicht). Kinder = Kinder der Treffer auf Ebene 2; nur wenn
  diese leer sind, die des Treffers auf Ebene 1 (so bekommt `fitness-training` 8 eigene Kacheln
  statt 27 aus dem Hauptpunkt «Sport & Party»). Eltern und Nachbarn = erster Treffer mit
  Sammlungs-URL. Ausgegeben wird auch die Menü-Beschriftung (Kachel und Nachbar zeigen sie;
  so bleiben «Damen»/«Herren»-Paare unterscheidbar). `smoke-zubehoer` (18+) nie als Kachel
  oder Nachbar.
- `lx-collection-welten`: Codex' Menü-Schleife bleibt für den **Pfad** unverändert (kein Pfad
  und kein JSON-LD ändert sich, ausser den vier Selbst-Links). Kacheln kommen aus dem Snippet,
  nur ausserhalb der Kompaktansicht (Seite 2, Filter: dort keine Arbeit mehr). Ab 4 Kacheln vier
  Spalten (ab 750 px); ab 5 Kacheln zeigt das Raster nur die ersten 4 (Desktop eine Reihe, Handy
  zwei Reihen) und den Knopf «Alle N Kategorien anzeigen» (fr/en übersetzt; ohne JavaScript sind
  alle sichtbar; nach dem Klick Fokus auf die erste neue Kachel). Titel werden nicht gekürzt,
  lange Wörter getrennt (`hyphens:auto`); zwischen 750 und 1099 px steht der Pfeil oben rechts
  wie auf dem Handy, ab 1100 px lässt der Titel Platz für den Pfeil.
- `lx-collection-details`: Nachbarn aus dem Snippet; die Eltern-Sammlung und die eigene
  Sammlung erscheinen nie als Nachbar; Blattseite nur, wenn kein Kind wirklich existiert.
- `lx-collection-welten-card`: zeigt die Menü-Beschriftung; holt das Ersatzbild per
  `for … limit: 1` statt `products.first`.
- `lx-kopf-pfad`: im Menü-Rückfall nie die eigene Seite als Eltern-Eintrag.
- `patch.py` erzeugt alle vier Dateien aus den gesicherten Live-Ständen; jeder Anker muss genau
  einmal vorkommen, sonst Abbruch.
- `apply.mjs`: Trockenlauf Vorgabe; `LIVE=1` sichert die vier Live-Dateien nach `sicherung/`,
  bricht ab, wenn eine davon nicht dem gesicherten Stand entspricht, schreibt Snippet, Kachel,
  Pfad, Details, Welten und liest alle zurück. Rücknahme: `ZURUECK=1 LIVE=1 node apply.mjs`
  (nur Dateien, die seit dem Einspielen niemand geändert hat; das Snippet bleibt ungenutzt).

## Prüfung vor dem Einspielen (GEMESSEN 16.11. 21:20 bis 22:03 UTC)

- **Testansicht:** dieselben Dateien als neue Dateien `*-lxtest` plus `templates/collection.lxtest.json`
  im MAIN-Theme, abrufbar mit `?view=lxtest`; die Live-Vorlage blieb unberührt. Die eingespielten
  Dateien sind byte-gleich mit den geprüften (bis auf die Namen der `-lxtest`-Snippets).
- **Orakel** (`orakel_pruefen.mjs`: Kinder, Eltern, Nachbarn aus dem Admin-Menü unabhängig gerechnet):
  Fassung 2 auf 24 Seiten, Fassung 3 auf 16 Seiten. Kacheln und Nachbarn wie im Menü (Ausnahmen
  erklärt: Metafeld `lux.unterfilter` hat bei `gaming`, `damen-kleider` Vorrang; bei `party-deko-ch`
  steht die Pfad-Eltern-Kategorie nicht zusätzlich als Nachbar). Pfad und JSON-LD gleich wie live,
  ausser `fitness-training`, `elektronik-technik`, `beauty-pflege`, `bestseller` (Selbst-Link weg).
  `/fr/` zeigt «Afficher les N catégories». Seite 2 und Filter: keine Kacheln. 0 Liquid-Fehler.
- **Browser** (Playwright, Testansicht unter der echten Adresse ausgeliefert, 390 und 1440 px, mit
  und ohne JavaScript, 5 Seiten): erstes Produkt Handy 1 007 bis 1 048 px, Desktop 792 bis 849 px
  (live vorher bei `damen-kleider` 2 783 und 2 391 px, bei `kochen-grillen-backen` 1 119 und 1 290 px).
  Ohne JavaScript alle Kacheln sichtbar, Knopf aus. Kein seitliches Scrollen, keine Seitenfehler.
- **Titel** (5 Seiten, 10 Breiten von 320 bis 1440 px): 0 Titel über die Kachel hinaus, 0 unter dem
  Pfeil, keiner gekürzt.
- **Seitengrösse:** die sieben grössten Seiten bleiben unter 2 MiB (grösste `sub-baby-kids`
  2 086 102 Byte, +18 001 durch 12 Kacheln).
- **Serverzeit:** nicht trennbar, der Shop liefert aus dem Seiten-Cache (13 bis 26 ms bei live und
  Test). Vorher (Fassung 1, Prüfer) rund +120 bis +250 ms bei kaltem Cache; Fassung 3 rechnet im Abschnitt `welten` auf
  Seite 2 und bei Filtern keine Kacheln mehr und lädt je Kachel nur ein Produkt (der Abschnitt `details` läuft weiter, siehe Nachprüfung 17.11.).
- **Prüfer:** 3 unabhängige Prüfer je Fassung (Liquid mit Ruby-Liquid-Render aller 1 732
  Sammlungen, Bedienung im Browser, Wirkung), jeder wichtige Fund von 2 Gegenprüfern nachgestellt.
  Fassung 3: 1 wichtiger Fund (3-Zeilen-Grenze schnitt Titel ab) behoben und gegengeprüft;
  «erstes Produkt nicht im ersten Bild» nach Umstellung auf eine Reihe auf «klein» herabgestuft.

## Live (16.11.2026, 22:05:29 UTC)

- `LIVE=1 node apply.mjs` nach eigenem Trockenlauf: 5 Dateien geschrieben, Rücklesen 5 von 5 GLEICH.
  Die Testdateien (`*-lxtest`, `templates/collection.lxtest.json`) sind danach gelöscht (22:12 UTC).
- **Live nachgemessen (22:07 bis 22:11 UTC):** 24 Seiten mit `NUR_LIVE=1 node orakel_pruefen.mjs`:
  Kacheln und Nachbarn wie im Menü, 0 Liquid-Fehler. Gegen den Stand vor dem Einspielen ändert sich
  der Pfad auf genau den 4 Selbst-Link-Seiten, sonst auf keiner. Browser live (`damen-mode`,
  `sub-ringe`, `gaming`, 390 und 1440 px, mit und ohne JavaScript): erstes Produkt 1 023 bis 1 048 px
  (Handy) und 819 px (Desktop), Knopf klappt auf, ohne JavaScript alle Kacheln, keine Fehler.
- **Ungemessen:** Safari und echtes Handy, Wirkung auf Käufe, Serverzeit bei kaltem Cache.

## Offen (Entscheid des Besitzers, Standard «bleibt»)

- Handy: das erste Produkt steht auf Seiten mit Kacheln knapp unter dem ersten Bild (rund 1 000 px
  bei 844 px Fensterhöhe). Das ist Codex' Gestaltung (Kacheln vor den Produkten). Möglich wären
  2 Kacheln auf dem Handy oder eine waagrechte Kachelleiste.
- Menü: «Sport & Party» zeigt auf `fitness-training`, `smoke-zubehoer` (18+) steht unter Geschenke,
  einige Sammlungen stehen zweimal im Menü (Pfad und Nachbarn kommen dann aus verschiedenen Treffern,
  z. B. `party-deko-ch`).
- Wirkung auf Käufe: ungemessen. Vergleich Einstiege, Kachel-Klicks und Warenkörbe dieser Seiten
  14 Tage nach gegen 14 Tage vor dem 16.11.

## Lehren

- Ein Abruf direkt nach `themeFilesUpsert` zeigte noch den alten Stand. Nach einem
  Theme-Schreibzugriff 1 bis 2 Minuten warten oder jede Messung wiederholen.
- Codex prüfte 4 Fälle; der Fehler lag in der Datenform (Menü-Linktyp), nicht im Code-Pfad der
  Fälle. Eine Vollprüfung aller Menü-Seiten gegen ein Orakel aus den Admin-Daten fand ihn.
- Die erste Fassung änderte nebenbei den Pfad auf rund 264 Seiten (Sammlungstitel statt
  Menü-Beschriftung). Erst die Prüfer fanden es. Bei einem Fix neben fremdem Code die
  bestehende Ausgabe als Gleichheitsbedingung mitmessen (Pfad und JSON-LD byte-gleich).

## Nachprüfung 17.11.2026 (Vollscan live und Abgleich der 22 Funde der ersten Prüferrunde)

Die erste Prüferrunde (47 Agenten) prüfte Fassung 1 und kam erst nach dem Live-Gang zurück. Ihre 22 Funde wurden gegen den
Live-Stand (Fassung 3) abgeglichen: 5 Prüfer mit nur lokalen Daten, danach je ein Skeptiker, der jede Entwarnung widerlegen sollte
(24 Agenten, keine Abrufe am Shop). Werkzeuge und Zahlen in `nachpruefung/`.

**Vollscan nach dem Fix (GEMESSEN 16.11. 22:30 bis 23:45 UTC, 742 von 742 Menü-Seiten, Seite 1, ohne Filter):**
- alle HTTP 200, 0 Liquid-Fehler, 0 `noindex`, je genau ein H1, überall Produkte;
- Seiten mit Kacheln 140 auf 175 (35 neu), Kacheln gesamt 642 auf 988, auf keiner Seite weniger als vorher; Nachbarn auf 566 Seiten; Knopf auf 94 Seiten (Regel «mehr als 4 Kacheln» auf allen 742 Seiten erfüllt);
- Orakel: bei allen 88 Seiten ohne Metafeld-Vorrang stehen alle Menü-Kinder als Kachel; 0 Selbst-Links, 0 mal `smoke-zubehoer`, 0 Kacheln ohne Bild; Pfad und JSON-LD ohne Selbst-Link;
- Grösse: keine Seite über 2 097 152 Byte (grösste `sub-baby-kids` 2 085 951, Reserve 11 201); über 2 000 000 Byte jetzt 6 Seiten (vorher 5), neu `wohnen-dekoration` (1 983 050 auf 2 001 966). Mittel +1 492 Byte je neuer Kachel;
- die fünf Live-Dateien sind byte-gleich dem geprüften Stand (`sicherung/neu.md5.json`), im Theme liegt keine `*-lxtest`-Datei mehr.
- Messbasis für den Vorher-nachher-Vergleich der Wirkung: `nachpruefung/scan_nachher_kurz.json`.

**Urteil über die 22 Funde:**

| Gruppe | Funde | Stand |
|---|---|---|
| Behoben, Entwarnung hält die Gegenprüfung | 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 13, 15 | 12 von 22. Insbesondere Pfad und JSON-LD: gleich dem Codex-Stand auf 742 von 742 Seiten, ausser den 4 Selbst-Link-Seiten (Fassung 1 hätte 264 Seiten geändert). Leistung im Abschnitt `welten` (kein `products.first`, nichts auf Seite 2 und bei Filtern). |
| Teilweise: Entwarnung widerlegt | 12, 14, 17, 20 | siehe unten |
| Menü, nicht Code | 8, 9, 19 | Entscheid des Besitzers (Menü bereinigen) |
| Code, klein, nicht eingespielt | 16, 18, 21 | Kandidaten für eine Fassung 4 |

**Was bleibt (alles GEMESSEN am Live-Scan, soweit nicht als Hypothese markiert):**
1. **`party-deko-ch` wurde schlechter** (Fund 12/14): Pfad «Geschenkverpackung & Boxen», aber 17 gemischte Nachbarn (Rucksäcke, Yoga, Camping …) statt 4 Deko. Grund: die Seite steht zweimal im Menü (30 Seiten doppelt, 29 unter verschiedenen Eltern). Der Pfad nimmt den letzten Sammlungs-Link, die Nachbarn den ersten Treffer. Dieselbe Klasse mit Besserungen: `hochzeitsgeschenke` (13 Geschenk-Kategorien statt 4 Deko), `diamond-painting` 6, `notizbuecher-journaling` 5, `modellbau` 5, `schreibtischlampen` 14 (8 Büro und 6 Beleuchtung); `auto-ladegeraete` 7 statt 10 (3 Auto-Kategorien fehlen). **Beste Behebung per Menü:** den HTTP-Eintrag «Sport & Party > Partydeko & Ballone» entfernen (Nachbildung: `party-deko-ch` hat dann genau die 4 Deko-Nachbarn und behält alle Besserungen). Eine Code-Regel «Eltern-Hinweis an lx-menu-knoten» stellt `party-deko-ch` auch her, kostet aber die fünf Besserungen (Nachbildung, Hypothese).
2. **31 Seiten haben einen Gruppentitel als Eltern im Pfad** (Fund 17): «Highlights» 9, «Sport & Party» 10, «Herbst & Übergang» 12. Die 10 unter «Sport & Party» nennen `fitness-training` als Eltern, und diese Seite zeigt nur ihre 8 Fitness-Kacheln (Sackgasse, bei Codex war es genauso mit 0 Kacheln). 3 Seiten stehen doppelt im Menü (`kostueme-ch-lager`, `fussball-fanshop`, `sub-reise`). `fitness-training` selbst ist behoben (8 eigene Kacheln statt 27 Gruppenkinder).
3. **Titel bei vergrösserter Systemschrift** (Fund 20): bei Standardschrift 4 Zeilen und mehr nur bei 40 Titeln (360 px), 4 (390 px), 0 ab 412 px; der Pfeil bleibt überall frei (921 Titel, 0 Überdeckung). Bei 125 % Schrift überdecken bei 360 px 83 von 921 Titeln den Pfeil (65 sichtbar, 52 von 175 Seiten), 3 Titel sind oben abgeschnitten (Chromium-Emulation; ob Android die Schrift so durchreicht, ist Hypothese). Ursache: feste Kartenhöhe 160 px, Titel unten verankert, Pfeil oben rechts (Codex' Gestaltung). Vorschlag an Codex: mitwachsende Karte statt fester Höhe.
4. **Menüfragen** (Funde 8, 9, 19): `parfum-duefte` zeigt unter «Körper, Mund & Düfte» die Kacheln Körperpflege, Fusspflege, Mundpflege (kein Parfum); `vorhaenge-gardinen-rollos` zeigt «Wecker» zweimal und «Wandbilder & Poster» neben «Wandbilder & Wanddeko» mit gleichem Bild; `bestseller` («⭐ Bestbewertet») zeigt 9 Kacheln der Gruppe «Highlights» (Ventilatoren, Fussball, EU-Lager), `jacken-outdoor` 16 Kacheln der Gruppe «Herbst & Übergang» (mit Heizdecken, Handwärmern).
5. **Doppelte Kachelbilder** (Fund 16, kosmetisch): 28 Gruppen auf 24 Seiten zeigen dasselbe Bild (56 von 988 Kacheln, 5,7 %). Grund: Sammlungen ohne eigenes Bild nehmen das Bild des ersten Produkts, und zwei Schwestersammlungen haben dasselbe erste Produkt. 21 der 24 Seiten hatten es schon bei Codex. Neu durch den Fix: `sub-taschen` (4 Paare), `sub-haustier` (1), `werkzeug-maschinen` (1). Behebung: eigenes Sammlungsbild ohne Präfix `pinnwand-` (Daten) oder im Code das erste noch nicht verwendete Bild der ersten 4 Produkte.
6. **Seitengrösse** (Fund 18): kein Verstoss, aber die Reserve ist dünn (`sub-baby-kids` 11 201 Byte). Ein Kandidat: `widths: '320, 480, 640, 800'` statt sieben Breiten in `lx-collection-welten-card.liquid` spart rund 300 Byte je Kachel (Hypothese aus einer Stichprobe, nicht live gemessen). Ob Google bei 2 000 000 oder 2 097 152 Byte abschneidet, ist Hypothese (QUELLE Google-Blog 3/2026, nicht selbst geprüft); nach jeder Menü- oder Produktänderung `sub-baby-kids` und `wohnen-dekoration` neu wiegen.
7. **`details` rechnet weiter auf Seite 2 und bei Filtern** (Fund 21, korrigiert den Satz oben): 7 047 `collections[]`-Abfragen je Aufruf über alle 742 Seiten, davon 2 193 verworfen (157 Seiten, keine Blattseite). Kandidat Fassung 4: in der `lx_kinder_liste`-Schleife nach `assign lx_has_children = true` ein `break`, und `capture lx_sibling_links` nur bei `lx_is_leaf`. Gemessen mit Ruby Liquid 5.14 und Zähler-Attrappe: 7 047 auf 4 317 Abfragen (minus 39 %), die Anzeige auf allen 742 Seiten gleich. Wirkung auf die Serverzeit ungemessen (der Shop liefert aus dem Seiten-Cache, kalte Proben fehlen); darum nicht eingespielt.

**Entscheid für Fassung 4:** nicht jetzt. Zuerst der Menü-Entscheid des Besitzers (die Punkte 1, 2, 4 verschwinden damit ohne Code); danach 5 kalte Server-Timing-Proben je Seite (`damen-mode`, `sub-taschen`, `damen-schuhe`, mit eigenem Query-Parameter) vor und nach `break`/`widths`.

**Lehren:**
- Eine Prüferrunde, die länger läuft als der Live-Gang, prüft veralteten Code: Prüfer immer an die eingefrorene Fassung binden und das Ergebnis gegen den heutigen Live-Stand abgleichen, statt es zu übernehmen.
- «Entwarnung» einer Prüferin ist eine Behauptung: bei 4 von 19 Urteilen fand der Skeptiker einen Rest (Doppeleinträge im Menü zählen nicht als reine Menüfrage, wenn der Code den ersten statt den passenden Treffer wählt).
- Eine README-Aussage wie «rechnet nichts mehr» gilt nur für den Abschnitt, den man gemessen hat.
- Bei 100 % belegter Platte (Allowance) zuerst die Prüfer-Abrufe (HTML) löschen, nicht die Ergebnisdateien.
