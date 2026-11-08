# Ranking-/SEO-Analyse luxestyle.ch (08.11.2026 abends)

Auftrag des Besitzers: «mach die webseite fix fertig mit 0 fehler. ranking push sowie semrush» (meine Auslegung: technische Fehler der Website beheben und das Ranking nach messbaren Hebeln verbessern; Semrush als Messlatte).

## Semrush
`mcp__Semrush__projects` und `site_audit` melden `no_api_units` (aktives Abo, aber zu wenige API-Einheiten, nicht wiederholbar). Das muss der Besitzer unter https://www.semrush.com/mcp-access lösen. Bis dahin ersetzen ein eigener Crawl und die kostenlosen Quellen (Search Console, `inspect_urls`) die Messlatte; **die Zahl «0 Fehler» im Sinne von Semrush ist damit nicht gemessen.**

## Messung (nur lesend, 14 Agenten, Workflow `wf_3d407677-0d6`, dazu eigener Crawl)
GEMESSEN mit der Search Console (OpenSEO, kostenlos) am 08.11.2026:
- Die Verbindung liefert erst **ab 04.10.2026** Daten (0 Zeilen davor). Langzeittrend nicht messbar.
- 28 Tage (09.10.–05.11.): **96 Klicks, 15 721 Impressionen, CTR 0,61 %, Position rund 51**, 91–94 % Schweiz. 77–79 % der Klicks sind anonymisierte Suchanfragen.
- 87 % der Seiten-Impressionen stehen ab Position 20. Klicks kommen fast nur von Startseite (Marke) und dem Rizinusöl-Wickel (Position 7,1, CTR 8,2 %): 30 von 116 Klicks.
- Impressionen wuchsen von KW41 auf KW44 um 112 %, die Klicks blieben bei 19–30 je Woche (Rauschen).
- Index: Stichprobe 50 Menü-Kategorien unverändert 17 indexiert (34 %); unter 100 Produkten nur 18,9 %, ab 100 Produkten 50,2 %. Die Liste `INDEX-LISTE-0811.md` wurde dank Anträgen zu 9 von 10 aufgenommen, die Listen a, b, c stehen bei 0 von 29. Technik (Grösse, noindex, Canonical) erklärt die Nicht-Indexierung nicht.
- GA4 ist im OpenSEO-Projekt nicht verbunden (`ga4_not_connected`): Sitzungen, Warenkörbe und Käufe je Landingpage sind **unbekannt**, die Bot-Vermutung zur Direkt-Welle ist weder bestätigt noch widerlegt.
- Plätze 1–3 gehören bei 17 von 30 Begriffen Fachhändlern und Spezialshops (Firecrawl-Stichprobe, Standort Schweiz).
- **Fazit des Workflows (Hypothese):** Die nahen Chancen sind klein (Position 5–30 mit zusammen rund 1 700 Impressionen in 33 Tagen); selbst ein voller Erfolg ergäbe rechnerisch höchstens rund 30 Klicks je 33 Tage. Vorrang haben billige Aufräumschritte vor grossen Umbauten.

## Umgesetzt (LIVE 08.11.2026 ca. 22:45 UTC): 404-Adressen mit Impressionen
Von 271 priorisierten Adressen mit Impressionen lieferten 18 HTTP 404 (1 138 Impressionen) und 23 HTTP 301 (1 269 Impressionen), zusammen 12,1 % der Impressionen. Zehn der 404-Adressen (alles Entwürfe, im Shop gelesen) bekamen eine **301-Weiterleitung** (`dropship/seo-404-0811/weiterleitungen.mjs`, Trockenlauf Vorgabe, Ledger `ledger.json` mit den Shopify-IDs, Rücknahme `ZURUECK=1 LIVE=1`):
- `polyester-aufbewahrungstasche-634900` (Position 9,7 für «gepolsterte tasche») → Geschwisterprodukt `…-460096` (aktiv)
- `bartpflege-set-600400` → `bartpflege-set-mit-mikro-nadel-roller-d5add9` (aktiv); `bartburste-540865` → `/collections/herren-grooming`; `mobelfolie-…-772546` → `/collections/wohnen-dekoration`
- `schwingerhose-fgahb2887ml` (3 Klicks in 3 Monaten; Fortura beim Lieferanten ausverkauft) → `/collections/ft-herrenkostuem`
- fünf «Selbst gestalten»-Entwürfe (Allover-Hoodie, Jogginghosen, Bomberjacke, Kissen, Kuscheldecke; zusammen 697 Impressionen auf Position 49–82) → `/collections/selbst-gestalten`

Gelesen nach dem Anlegen: **10 von 10 liefern HTTP 301 auf das richtige Ziel** (curl mit Browser-Kennung). Das Skript lenkt nie ein aktives Produkt um und prüft, dass das Ziel existiert.
**Achtung bei Rückkehr:** wird eines dieser Produkte wieder aktiviert, zuerst seine Weiterleitung löschen (Shopify liefert eine vorhandene Weiterleitung vor der Produktseite aus, belegt ist das nur für Weiterleitung gegen Weiterleitung; für Produktseiten ist es meine Annahme).
Nicht angefasst: Emoji-Handles (`transportbox-petgo-…🐾`, `🌙-sleep-ritual-box-…`: Position über 100, Kodierung heikel), die 23 bestehenden 301 (teils auf wechselnde Sammlungen: drei Sternenprojektoren auf drei Ziele; Vereinheitlichung ist offen).

## Offene Chancen (Reihenfolge laut Workflow, alle Hypothesen)
2. Organische Sitzungen/Käufe je Landingpage per ShopifyQL lesen und prüfen, ob es eine Search-Console-Domain-Property mit längerem Verlauf gibt.
3. Weihnachtspyjama: Sammlung `weihnachtspyjama-familie` (325 Impr., Position 24,3) und zwei Produkte wechseln sich je Suchanfrage ab; Rollen trennen und intern verlinken (zeitkritisch bis Dezember).
4. Katzen-Trinkbrunnen: DE-Sammlung stärken (die FR-Sammlung ist seit 07.11. `noindex`); das Produkt `trinkbrunnen-fur-haustiere-411520` ist laut Titel ein Anti-Schwapp-Wassernapf, kein Brunnen.
5. Indexierungsanträge für die Listen a, b, c (Besitzer, Grenze pro Tag nicht belegt).
6. Dubletten-Paare unter den Kategorien unterscheidbar machen (`herren-/damen-weitere-taschen` mit gleichem H1 und gleicher Meta-Beschreibung, `smartwatches`/`smartwatches-wearables`, …).
7. Nachmessung der Verschlankung vom 04.11. und der FR-Sperre vom 07.11.: Index 11.11. und 18.11., Klicks 18.–25.11.
8. Herkunft der `?variant=`-Adressen klären (347 URLs mit 1 136 Impressionen; Google wählt dort die Variantenadresse als Canonical).
10. Strukturierte Daten (`shippingDetails`, `hasMerchantReturnPolicy`): grösserer Umbau, Besitzer-Entscheid (Rückgabefrist 30 Tage gegen die Regel für bedruckte Ware).

## Eigener Site-Audit (Crawl, nur lesend)
Siehe Abschnitt am Ende dieser Datei (Zahlen aus `dropship/seo-ranking-0811/crawl_ergebnis.md`, soweit gelaufen).

## Lehren
- Eine Regex-Zählung «Bilder ohne alt» zählte `<img` in einer Skript-Zeichenkette (Chat-Suche) auf jeder Seite mit: Messgerät vor der Zahl prüfen (die Zahl 1 je Seite war ein Fehlalarm).
- Der Crawl über alle 125 Unter-Sitemaps ist mit Pausen langsam (rund 130 Seiten pro Minute mit zwei Arbeitern, vorher 5 s je Seite): Stichprobe der Sammlungen statt Vollcrawl.
