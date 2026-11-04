# Startseite wechselt: Produkte rotieren alle vier Stunden (LIVE 04.11.2026)

**Auslöser:** Besitzer 04.11. «mache nicht immer die gleiche produkt rein, wechsle oft». **Auslegung (meine Annahme):** gemeint sind die Produktreihen der Startseite. Soziale Beiträge und Kategorieseiten blieben unberührt.

## Messung vor der Änderung (GEMESSEN 04.11.2026, Theme-Dateien und Live-HTML)
- Alle vier Produktreihen standen **fest im Theme**: Trends (12 Handles als Text im Liquid, dazu eine Id-Liste), Schmuck (3) und Wohnen (2) (Einträge mit festen, in den Sprachdateien hinterlegten Namen), «Noch mehr entdecken» (8, Liste im Theme-Editor / `templates/index.json`). Jeder Besucher sah zu jeder Zeit dieselben 25 Produkte.
- Shopify erlaubt höchstens 20 verschiedene `all_products`-Zugriffe je Seite; die Sektion nutzt 17. Darum zieht die Rotation Produkte als Objekte aus Sammlungen und greift danach nur für die gezeigten Karten per `all_products` zu (bleibt bei 17).

## Was jetzt passiert
- Vier versteckte Pool-Sammlungen (manuell geordnet, im Onlineshop veröffentlicht, `seo.hidden=1`: `noindex,nofollow`, gemessen): `startseite-pool-trends` (32 Produkte), `-schmuck` (17), `-wohnen` (12), `-mehr` (23). **Nur von Hand gesichtete Produkte** (`freigabe.json`: Spalten `freigabe` und `gepinnt`; `gepinnt` = bisher fest im Theme, live bewährt). Sichtprüfung am Kontaktbogen: 43 Kandidaten abgelehnt (Infografiken statt Produktfoto, Bild zeigt etwas anderes als der Titel, Produkt nicht lieferbar zum Titel, Nischenwerkzeug, Gesundheitsversprechen, Fremdmarken-Text im Bild), Liste mit Grund in `freigabe.json` unter `ausschluss`.
- `sections/luxe-edit-home.liquid` liest je Reihe ein **Fenster** aus dem Pool und zeigt davon die ersten gültigen Karten (verkaufbar, Bild, Preis, keine Sperr-Tags, dieselbe Sperrliste wie bisher). Fenster: Trends 18 Kandidaten → 12 Karten, Mehr 12 → 8, Schmuck 8 → 3, Wohnen 6 → 2.
- **Alle vier Stunden** (Zeitfenster = Unix-Sekunden / 14 400, gleich für alle Besucher, 00/04/08/12/16/20 UTC) rückt das Fenster weiter. Start = (Zeitfenster × Schritt) mod M, M = Poolgrösse − Fenster + 1, Schritt = erste Zahl aus 7, 5, 3, durch die M nicht teilbar ist. Rechnung in `automation/lib/startseite_pool.mjs` (`fensterStart`) und im Snippet `snippets/lx-rot-start.liquid`, beide gleich; der Test belegt, dass für jede Poolgrösse 10 bis 50 alle Startwerte vorkommen. **Wichtiger Fund beim Bau:** mit festem Schritt 7 hätte «Wohnen» (M = 7) nie gewechselt, «Schmuck» nur zwischen zwei Fenstern.
- Schmuck und Wohnen zeigen jetzt den Produkttitel statt der festen Namen aus den Sprachdateien (die Namen gab es nur für die fünf alten Produkte); «Noch mehr» zeigt bei bisherigen Listenprodukten weiter den gepflegten Namen.
- **Rückfall:** fehlt ein Pool oder ist er zu klein (Trends < 14, Mehr < 12, Schmuck < 8, Wohnen < 6) oder hat ein Fenster zu wenig gültige Produkte, gilt die frühere feste Liste. Die Karussell-Pfeile (`dropship/karussell-0411/`) arbeiten mit den wechselnden Karten unverändert.

## Gemessen nach dem Einspielen (04.11.2026 ca. 10:30 UTC)
- Rücklesen der Sektion und des Snippets byte-gleich; kein «Liquid error», keine fehlende Übersetzung; 25 Karten (12 + 5 + 8), alle verschieden; `/` und `/fr`, Desktop und Handy ohne Konsolenfehler, Pfeile funktionieren.
- `pruefen_live.mjs`: die Karten jeder Reihe entsprechen **genau** dem Fenster, das die Rechnung für das aktuelle Zeitfenster aus der Pool-Reihenfolge im Shop vorgibt (alle vier Reihen GLEICH; Zeitfenster 124568: Trends Start 11, Mehr 8, Schmuck 6, Wohnen 1).
- Der Wechsel selbst: Kontrolle nach dem Zeitfenster-Wechsel 12:00 UTC (Zeitfenster 124569), Ergebnis siehe unten bzw. `CLAUDE.md`.

## Pflege
- `node automation/startseite_pools.mjs` (Trockenlauf) prüft die Pools gegen den frischen Katalog; `LIVE=1` gleicht die vier Sammlungen ab und ordnet sie (nur diese Sammlungen werden geschrieben, nie Produkte oder das Theme; bricht ab, wenn ein Pool kleiner als die Zeilenzahl wäre). Ohne neue Sichtung schrumpfen die Pools mit der Zeit (ausverkauft, gesperrt): dann fällt die Reihe auf die feste Liste zurück.
- **Neue Produkte aufnehmen:** `VORSCHLAG=1 node automation/startseite_pools.mjs` listet Kandidaten (Bewertung oder Trend-Markierung oder Marge-Klasse, alle Gates bestanden) mit Handle; Kontaktbogen bauen, **Bilder selbst ansehen**, dann Handles in `freigabe.json` unter `freigabe` eintragen (Ablehnungen unter `ausschluss`), Trockenlauf, `LIVE=1`. Wiedervorlage: Mi 11.11. (Pools auf Rückgang prüfen, neue Runde).
- Tests: `automation/lib/startseite_pool_test.mjs` (in der CI; Mutationsprobe 6 von 6 erkannt).

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/startseite-wechsel-0411/apply_theme.mjs` stellt die Sektion aus `sicherung/luxe-edit-home.liquid.vor` wieder her und löscht das Snippet (bricht ab, wenn MAIN nicht mehr den eingespielten Stand trägt). Die Pool-Sammlungen bleiben bestehen (harmlos, `noindex`); löschen kann man sie im Admin.

## Lehren
- Ein fester Schrittwert in einer Rotation mit wechselnder Fenstergrösse kann an einer Reihe stillstehen (ggT mit der Zahl der Startwerte): Schritt aus Primzahlen wählen, die M nicht teilen, und im Test für alle Grössen die Zahl der erreichten Startwerte zählen.
- Automatisch gewählte Pools (Bewertung, Tags, Marge) lieferten viele schwache Bilder: Infografiken, ein Titel «Business-Rucksack» über dem Foto einer Umhängetasche, «Camouflage-Jacke» über einer dunkelblauen Jacke, eine Powerbank mit dem Bild einer Klimaanlage. Pools nur aus gesichteten Produkten bauen; die Automatik schlägt nur vor.
- `Liquid` kennt nur 20 `all_products`-Zugriffe je Seite: Produkte als Objekte aus Sammlungen lesen.
