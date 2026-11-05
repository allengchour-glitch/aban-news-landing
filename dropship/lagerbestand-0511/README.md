# Lagerbestand verbessern und anzeigen (05.11.2026)

Auftrag des Besitzers 05.11.: «lagerbestand verbessern und anzeigen». Auslegung (meine, nicht bestätigt): die Produktseite soll ehrlich zeigen, ob und wie viel da ist, und der Bestand dahinter soll stimmen.

## Messung (GEMESSEN 05.11.2026 07:16 UTC, nur lesend)
- 56 524 aktive Produkte, 591 154 Varianten. **98,7 % ungetrackt** (CJ, Druck): dort gibt es keine Bestandszahl, nur «kaufbar». Echte Zahlen haben nur die **3 998 Fortura-Varianten** (2 371 Produkte).
- Fortura-Bestand im Shop **12 Tage alt** (letzter Abgleich 24.10., danach nur eine Bestellung). Gegen den Feed vom 04.11. 23:02 UTC: **925 von 3 998 aktiven Varianten weichen ab** (23 %; am 28.10. waren es 450), **79 sind kaufbar, obwohl Fortura nichts liefern kann** (54 davon Fortura-Spalte 0 oder kleiner: die Klasse von Bestellung #1027, Fortura-Storno). Trockenlauf des unveränderten Abgleichs: 1 884 von 8 416 Varianten (mit Entwürfen) zu ändern, 161 davon auf 0; ACTIVE-verkaufbar 2 258 → 2 195.
- Die Produktseite sagte «Auf Lager · versandbereit» nach **Produktebene** (auch bei ausverkaufter gewählter Variante) und zeigte immer ein Lieferdatum. Eine Bestandszahl gab es nirgends.
- Reichweite einer «Nur noch N»-Anzeige klein: 51 Fortura-Seiten mit 58 von 1 475 Landungen (3,9 %, 30 Tage; verzerrt durch die wohl automatisierte Sommerware-Welle), 9 Seiten mit niedriger Menge und 10 Sitzungen. Nutzen = Ehrlichkeit, Wirkung auf Käufe unbekannt (Hypothese).

## Was LIVE ist (05.11.2026 11:33 UTC, MAIN-Theme, `templates/product.json`, Block `lux_delivery`)
Einspielen mit `apply_theme.mjs` (Trockenlauf Vorgabe, `LIVE=1`, Sicherung `sicherung/product.json.vor`, Rücklesen GLEICH, Seitenprüfung mit Rückweg). Prüfsumme vorher `2139c465…`, nachher `41af3663…`.
- **Variantenbewusst:** Pille und Lieferbox richten sich nach der **gewählten Ausführung**. Ausverkaufte Ausführung: rote Pille «Diese Ausführung ist ausverkauft» (Produkt ganz weg: «Momentan ausverkauft»), **keine Lieferbox**. Vorher stand «Auf Lager» neben dem deaktivierten Knopf.
- **Variantenwechsel:** das Theme rendert Custom-Liquid-Blöcke beim Wechsel nicht neu. Ein kleines Skript im Block hört auf `variant:update` (Theme-Ereignis) und tauscht den Inhalt des Containers `data-lx-delivery="<Produkt-ID>"` gegen den serverseitig gerenderten der neuen Ausführung (nur gleiche Produkt-ID; kein Netz, kein eval, try/catch). Container trägt `aria-live="polite"`.
- **Fallback-Lieferdatum:** `snippets/meta-tags.liquid` fügt per Skript eine Box «Voraussichtliche Lieferung» ein, wenn «Lieferung voraussichtlich» nicht auf der Seite steht. Im Ausverkauft-Zweig steht darum ein versteckter Satz (`<span hidden data-lx-kein-liefertermin>`), der diesen Fallback ruhig stellt. Für Liechtenstein fügt der Fallback weiter eine Box ein (war schon vorher so).
- **Bestandszahl «Nur noch N»: eingebaut, aber DUNKEL.** Sie erscheint nur, wenn ALLES gilt: Tag `fortura`/`ch-lager`, Zweig «Schweizer Lager», Variante `inventory_management == 'shopify'` und `inventory_policy == 'deny'`, Variante kaufbar, **gültiger Frische-Stempel** (Shop-Metafeld `luxe.fortura_bestand_stand`, Text-Zeitstempel mit Datum und Uhrzeit, höchstens 26 h alt, höchstens 5 min in der Zukunft), Notschalter `luxe.bestand_anzeige` nicht «aus». Menge 1–3: «Nur noch N auf Lager» (1: «Nur noch 1 Stück …»), 4–5: «Nur noch wenige auf Lager», ab 6 nichts Besonderes (orange nur bei 1–5). **Den Stempel gibt es noch nicht** (der Abgleich schreibt ihn erst nach einem Lauf): bis dahin sieht niemand eine Zahl. CJ, Druck, EU-Lager: nie eine Zahl.
- **Notschalter** `luxe.bestand_anzeige` (Shop-Metafeld, Text): fehlt oder leer, `1`, `true`, `an`, `ein`, `ja`, `on` = an; **jeder andere Wert = aus** (fail-closed).

## Gemessen am Live-Shop
- Testvorlage `?view=lxtest` (inzwischen gelöscht), danach Produktion ohne Query (Chrome-Kennung, Playwright, `kostum-sensemann-fgss0052`: XL kaufbar, XXL kaufbar, XXXL ausverkauft): XXXL → «Diese Ausführung ist ausverkauft», keine Lieferbox, versteckter Satz da, keine Fallback-Box, Knopf «Ausverkauft [disabled]»; zurück auf XXL/XL → «Auf Lager · versandbereit» mit Lieferbox; Direktlink `?variant=` auf XXXL gleich; Handy 390 px und Desktop 1440 px; 0 Seitenfehler. Ganz ausverkauftes `langes-hippiekleid-gr-m-ft90654-2`: Container und Satz da, keine «Bestelle jetzt»-Box.
- Nicht live gemessen: Cache-Verhalten nach einer Bestandsänderung (früher bis ~22 min Verzug bei zeitabhängigen Inhalten), Combined Listings (Shop nutzt sie nicht), Screenreader.

## Tests (alle lokal grün, 05.11.)
- `delivery_test.mjs` **104 880 von 104 880** (Matrix 89 600 gegen unabhängig gerechnetes Orakel, Vergleich alt/neu 1 120 Fälle zeichengleich, echtes Ruby-Liquid 5.14.0 strikt), Mutationsprobe **59 von 59** erkannt (7 gleichwertige benannt).
- `wechsel_browser_test.mjs` (Chromium, kein Netz) **89 von 89**.
- `apply_theme_test.mjs` **371**, `stempel_test.mjs` **487**, `kette_test.mjs` **121**, `feed_holen_test.mjs` **212**; `stempel_mutation.mjs` (143 Mutanten).
- In der CI als Job `lagerbestand` (ohne Ruby und Browser). Der Test des Blocks braucht LiquidJS (`LIQUIDJS_DIR`).
- Zwei unabhängige Prüfrunden (je ein Prüfer je Bauteil, Funde einzeln nachgestellt): Runde 1 fand einen Blocker (Block aktualisiert sich bei Variantenwechsel nicht) und den Fallback-Fund, beide behoben; Runde 2 «Freigabe mit Auflagen», kein Blocker.

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs` (schreibt die Sicherung zurück, nur wenn die Datei noch dem eingespielten Stand entspricht). Nur die Zahlen aus: Metafeld `luxe.bestand_anzeige` = `0`.

## Fortura-Abgleich LIVE gelaufen (05.11.2026 11:46–11:56 UTC, Besitzer: «Fortura-Abgleich jetzt live starten»)
- Aus der Sitzung mit dem unveränderten Skript `automation/fortura_bestand_sync.mjs` (SHA1 `0dc13536…`), Feed vom 04.11. 23:02 UTC (12,9 h alt, 20 309 Zeilen), Puffer 1. Erst Stufe 1 (100 Varianten, ACTIVE zuerst), frisch nachgelesen 100 von 100 gleich Soll; dann der Rest. **Ergebnis: 1 884 Varianten geändert (161 davon auf 0), 0 offen**; alle 1 884 frisch aus dem Shop nachgelesen = Soll. **Nachprüfung (Trockenlauf Shop gegen Feed): 8 416 unverändert, 0 zu ändern.** ACTIVE verkaufbar 2 258 → 2 195; die 79 «kaufbar trotz Feed 0» sind weg.
- Protokoll mit alt/neu je Variante: `lauf-0511/_fortura_bestand_log.tsv` (Spalten: Zeit, Feed-Fingerabdruck, SKU, **vorher**, **nachher**, Status, Grund, Meldung, InventoryItem-ID, Produktstatus). Rücknahme: kein Skript; die Spalte «vorher» je Zeile mit `inventorySetQuantities` zurückschreiben (nicht empfohlen: der alte Stand war falsch).
- **Frische-Stempel gesetzt:** `luxe.fortura_bestand_stand = 2026-11-05T11:57:00Z` (Gate bestanden: Live-Exit 0, Nachprüfung 0 Abweichung, Feed 12,9 h, offen 0). Damit ist «Nur noch N» **bis 06.11. ca. 13:57 UTC (26 h)** sichtbar und fällt danach von selbst auf «Auf Lager» zurück, solange kein neuer Abgleich läuft. Live gemessen: `skull-stab-150-cm-ftbo73206` «Nur noch 1 Stück auf Lager · versandbereit», `kostum-bier-party-fgss1058` «Nur noch 2 auf Lager», `kostum-spider-witch-fgss4176` (Menge 5) «Nur noch wenige auf Lager», `kostum-sensemann-fgss0052` «Auf Lager».
- **Dauerbetrieb fehlt noch:** der Workflow `fortura-bestand.yml` läuft erst, wenn die Repo-Secrets `FORTURA_FTP_USER`/`FORTURA_FTP_PW` gesetzt sind und der Besitzer die Freigabedatei `dropship/FORTURA-BESTAND-FREI.txt` anlegt (Anleitung `FORTURA-BESTAND-ANLEITUNG.md`). Der Stempel wurde in dieser Sitzung mit einer Freigabedatei im Scratch gesetzt, nicht aus dem Repo.

## Fortura-Abgleich (Bestand verbessern): Workflow gebaut, Dauerbetrieb NICHT eingeschaltet
- Das erprobte Skript `automation/fortura_bestand_sync.mjs` (byte-gleich der Fassung vom Zweig `claude/luxestyle-status-tztnn1`, SHA1 `0dc13536…`) lief vom 04. bis 24.10. täglich. Regel: Soll = max(0, Spalte «Lagerbestand Fortura» − 1 Puffer − committed); Bazar-Bestand zählt nicht (Lehre #1027).
- Neu: Workflow `.github/workflows/fortura-bestand.yml` (täglich 03:51 UTC; ohne Freigabedatei nur Trockenlauf; Schreiben nur mit `dropship/FORTURA-BESTAND-FREI.txt`; `null_erlauben` nur bei Handstart), Feed-Skript, Frische-Stempel `automation/fortura_bestand_stempel.mjs` (setzt `luxe.fortura_bestand_stand` nur nach einem sauberen Lauf, dessen Nachprüfung höchstens 1 % Abweichung zeigt). Anleitung für den Besitzer: `FORTURA-BESTAND-ANLEITUNG.md`.
- Ein erster Live-Versuch aus der Sitzung wurde vom Berechtigungssystem abgelehnt und nicht umgangen; nach dem ausdrücklichen Auftrag des Besitzers lief er (siehe oben). Offen beim Besitzer: Secrets `FORTURA_FTP_USER`/`FORTURA_FTP_PW` als Repo-Secrets, Freigabedatei.
- Ungemessen: der erste Lauf in GitHub Actions (Erreichbarkeit, Zertifikat), ob der alte Hetzner-Abgleich wirklich aus ist (zwei Schreiber), Wirkung auf Stornos.

## Bekannte Grenzen
- Die Zahl ist so frisch wie `inventory_quantity` in Shopify, nicht wie der Feed: Bewegungen bei Fortura zwischen zwei Abgleichen sieht der Block nicht (Stempel begrenzt nur das Alter des letzten Abgleichs; im ungünstigen Fall bis ~62 h hinter dem Feed).
- Die Texte im Block sind deutsch (wie der Rest des Blocks; auf `/fr` und `/en` nicht übersetzt).
- «Verfügbar · Direktversand aus Asien» bei ungetrackter CJ-Ware ist selbst unbelegt (CJ-Lieferbarkeit nicht flächendeckend geprüft): Textwechsel auf 53 000 Seiten wäre ein Besitzerentscheid.
- Im Job-Log des Fortura-Abgleichs stehen die ersten 25 Planzeilen (SKU, Menge, Titel); das Repo ist öffentlich.
