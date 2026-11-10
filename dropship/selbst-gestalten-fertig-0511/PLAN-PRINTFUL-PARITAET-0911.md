# Plan «Editor wie Printful» (09.11.2026)

> **Stand 10.11.2026 (P1 «Bestellweg härten» umgesetzt, in zwei Runden nachgehärtet, von drei unabhängigen Gegenlesern geprüft, nichts live):** P1 liegt im Repo (Zweig `claude/luxestyle-editor-paritaet-0911`); die erste Gegenprüfung fand 27 Punkte, die der Zweig `claude/luxestyle-bestellweg-haertung-1011` behebt (`dropship/wp6-0611/SYNC.md` 7.10), drei weitere Gegenleser fanden darauf 22 Punkte (4 wichtig, kein Blocker; SYNC.md 7.12, Zuordnung Fund → Änderung → Test → Mutanten). Für die Reihenfolge «Erst nach dem ersten echten Auftrag» weiter unten gilt jetzt: (1) das Skript schreibt nur bei ausdrücklichem `DRY_RUN=0` (Trockenlauf ist Vorgabe; der Workflow gibt `0` nur bei Zeitplan UND Freigabedatei oder bei Handstart mit entferntem Haken «Nur testen» weiter); (2) **automatisches Bestätigen** (`PRINTFUL_AUTO_CONFIRM=1`) wirkt nur zusammen mit gesetzter Kostenobergrenze (`PRINTFUL_MAX_KOSTEN_USD` über 0, sonst Exit 1) UND eingeschalteter KI-Kontrolle (`PRINTFUL_KI_KONTROLLE=pflicht`); bei KI «aus» bleibt jeder Auftrag Entwurf. Die Entscheidung «KI-Kontrolle: pflicht oder aus mit Sichtprüfung der ersten Dateien» ist damit zugleich die Entscheidung, ob jemals automatisch bestätigt wird; (3) die Bestellung wird vor dem Anlegen und vor dem Bestätigen frisch aus Shopify gelesen und mit dem Stand beim Planen verglichen (bezahlt, nicht storniert, kein Test, Anschrift, Positionen samt Mengen, Fulfillment-Orders, Stopp-Tag `printful-review`); (4) `dienst-standort-unklar` ist hart, und das Token muss Händler- und Dienst-Fulfillment-Orders lesen dürfen (Rechte-Prüfung, erster Beleg ist ein Trockenlauf in Actions; fehlt ein Recht, endet auch der Trockenlauf mit Exit 1); (5) eine Fulfillment-Order druckt nur mit dem Status `OPEN` oder `IN_PROGRESS` (`fulfillment-gehalten` sonst), und vor dem Anlegen wird ein Anspruch (`printful-anlegen-…`) gesetzt und nachgelesen. Die Erwartung «492/212/206» weiter unten ist der Stand des alten Zweigs; die Zahlen vom 10.11.2026 stehen in SYNC.md 7.7 und 7.12 (Bestellweg-Test 973, Platzierung 212, Sync 474, Preisanpassung 56, Mutationsprobe 523 von 523 Mutanten erkannt, 0 überlebt, 0 ungeklärt, 0 ungültig (drei Teile mit SHARD: 175 + 174 + 174; alle 523 durch eine benannte Prüfung, keiner nur durch eine Ausnahme im Test; voller Lauf am Commit `21b8988449`, 10.11.2026 16:59 bis 17:41 UTC)).

Entstanden am 09.11.2026 abends auf den Auftrag des Besitzers «kopiere editor von printful» / «alle bearbeitungs auswahl wie im printful» (Antwort auf die Rückfrage: Rückseite, Ärmel und weitere Druckflächen · alle Farben wie bei Printful · alles Sichtbare angleichen). Vier unabhängige Analysten (Abrechnung, Farben, Bestellweg, sichtbare Parität) und eine Synthese, alles nur lesend. **Printfuls Design Maker selbst wurde nie geöffnet** (kein Konto); alle Printful-Angaben stammen aus öffentlichen Seiten. Printfuls Code, Bilder, Symbole und Schriften werden nicht übernommen, nur Funktionen und Bedienung nachgebaut. Zahlen im Plan sind Schätzungen der Analysten, soweit nicht als GEMESSEN markiert; Aufwand in Arbeitsblöcken (AB), keine Termine.

## Antworten des Besitzers (09.11.2026 ca. 22:00 UTC, auf gezielte Fragen)

- **Rückseite:** mit Marge, rund CHF 8.30 (Printful-Kosten rund CHF 6.10; Netto mindestens CHF 2.00 nach Rabattcodes). Endpreis wird aus `pod/v6/werkzeug/preisformel.mjs` gerechnet und vor dem Live-Gang gezeigt.
- **Schatten bei weisser Schrift:** entfernen (gewollte Ausnahme von «Druckdatei byte-gleich» für weissen Text, Editor 6.4.1).
- **Farben:** «alle Farben wie Printful». Das bricht mehrere Limits (Varianten je Produkt 2 048, je Tag, Katalogfenster 250, Theme-Wähler), darum nur in Etappen mit Messung: Stufe 1 handverlesen und gemessen, dann Ausbau bis zu allen bestellbaren Farben je Modell. Farben, die Printful nur in Übersee lagert, brauchen zuerst eine Messung von Lieferzeit und Zoll (Tag `pod-uebersee`).
- **Test-Bestellung ohne Kartenzahlung** (Entwurfsbestellung als bezahlt markiert, Besitzer-E-Mail, ohne Mails, Tag `test-pod`, danach storniert): ja, erst nach dem Probeprodukt.
- Nicht gefragt, Standard des Plans: Preis-Modell = feste Pakete als Option «Druck» im Variantenpreis (nur auf Einmodell-Produkten, Shopify erlaubt höchstens 3 Optionen); Pilot = Shirt 71 (liegt am Standort «Shop location», nicht am Dienst-Standort «Printful»).

## Zusammenfassung der Synthese

Der Editor 6.4.0 kann Rückseite, Ärmel und Etiketten schon (pod/v6/lspod-designer-v6-6.4.0.js:1724-1808). Live angeboten wird nur "front", weil Abrechnung und Bestellweg fehlen (Karten mit --ohne-aufpreis --ohne-etiketten; plan.mjs:22-23 und :188 setzt "inklusive:false"). Zwei Drittel von "Editor wie Printful" sind darum Daten, Preis und Bestellweg, nicht Editor-Code. Reihenfolge: (1) Bestellweg und Sperre "kein Druck ohne Zahlung" im Repo, (2) Wegwerf-Proben zu Optionen und Limits, (3) Pilot Shirt 71 als Entwurf mit Farben und Paket "Druck", (4) erster Auftrag nur als Printful-Entwurf, (5) Freigabe, (6) Farben-Ausbau, (7) Editor-Parität gebündelt in einem Rollout.

Vier Funde der Gegenlesung, die keine der Analysen allein hatte: (a) Shopify erlaubt höchstens 3 Optionen (OPTIONS_OVER_LIMIT, in der Doku zu productOptionsCreate bestätigt). Die Option "Druck" (Abrechnung) passt daher nicht zusammen mit Farben auf Material-Produkten (Farben). Sie geht nur auf Einmodell-Produkten (Farbe, Grösse, Druck). (b) Admin-Abfrage heute: klassisches T-Shirt, Unisex-T-Shirt, Hoodie und Jutebeutel liegen am Dienst-Standort "Printful" (isFulfillmentService true), nur Shirt 71 liegt an "Shop location". Der Canary der Abrechnung (klassisches T-Shirt) wäre das riskanteste Produkt. (c) Das Kosten-Netz im Sync fängt eine Rückseite allein nicht, nach Bestellweg-Zahlen 4.93 > 4.00. (d) Drei Editor-Stände (6.4.1, 6.5.0, 6.6.0) hiessen drei Rollouts über 16 Beschreibungen. Bündeln.

Nachfrage ist unbekannt: 0 von 34 Bestellungen kamen über den Editor. Der Plan baut darum zuerst, was ohne Live-Risiko sicher ist.

## Phasen

### P0 · Lesende Messungen, Entscheide einholen

- **Ort:** Daten (nur Abfragen: Printful API, Shopify Admin) · **Live-Schreibzugriff:** nein · **Aufwand:** 1/2 AB (AB = Arbeitsblock, eine fokussierte Sitzung mit Bau, Test, Gegenlesung; Schätzung, keine Messung)

Nur Abfragen. (1) Printful-Auftragsliste lesend (GET /orders) auf Aufträge zu den 11 aktiven Dienst-Standort-Produkten und auf external_id-Muster: legt die Printful-App dort eigene Aufträge an? (2) Alle Rabattcodes mit Ausschlüssen (discountNodes vollständig; Abrechnung las nur 40). (3) Tag mengenrabatt-a auf den POD-Produkten gegenlesen (Abrechnung: 4 Treffer, von mir nicht nachgemessen). (4) Restkapazität des Variantenbudgets aus dropship/cj_varianten_ledger.txt. (5) Offene Entscheide (Liste unten) dem Besitzer kurz vorlegen.

- **Abhängigkeit:** keine

- **Rücknahme:** entfällt

- **Tests und Messung:** Messung vorher = diese Phase. Messskripte mit festen Eingabedateien im Repo testen. Ergebnis ist die Eingabe für P1 (Dienst-Standort) und P5 (Rabatt, Budget).

### P1 · Bestellweg härten und Sperre "kein Druck ohne Zahlung" bauen

- **Ort:** Bestellweg (Repo) + 4 Tests + Mutationsprobe · **Live-Schreibzugriff:** nein · **Aufwand:** 2 bis 3 AB

Nur Paket A des alten Zweigs origin/claude/luxestyle-wp6-bestellweg-0611 @1976706c1f einzeln holen: automation/lib/printful_bestellweg.mjs, automation/lib/printful_bestellweg_test.mjs, automation/printful_sync.mjs (nur Kopfkommentar), automation/printful_sync_test.mjs, dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs, dropship/wp6-0611/SYNC.md und OHNE-DESIGN.md. Nicht CLAUDE.md, nicht pod/v6, nicht das Theme-Paket. Dazu neu: (a) harter Befund "dienst-standort": Query um fulfillmentOrders{assignedLocation{location{isFulfillmentService}}} erweitern, Vorbild automation/cj_tracking.mjs:115 und :189-193. Ohne ihn druckt die Printful-App eventuell selbst, mit dem Muster-Design (ungemessen), und der Sync legt einen zweiten Auftrag an. (b) harter Befund "aufpreis-unbezahlt": gedruckte Plätze gegen das bezahlte Paket halten. Aufpreise aus prod.roh.product.files[].additional_price (printful_platzierung.mjs:144), nicht aus costs und nicht aus _pod_karte.ap (reiner Browserwert). Das bezahlte Paket kommt aus einer austauschbaren Funktion (Option "Druck" per selectedOptions, SKU-Präfix oder Metafeld), damit P5 das Modell frei wählen kann. Die Bestellabfrage printful_sync.mjs:128-132 holt heute nur variant{sku}. (c) Standardwerte angleichen: printful_sync.mjs:46-47 (AUTO_CONFIRM Standard an, KI pflicht) gegen printful-sync.yml:82-83 (0, aus). (d) optionaler Schalter PRINTFUL_MAX_KOSTEN_USD (absolute Obergrenze je Auftrag). (e) Ende-zu-Ende-Test mit den echten 6.4.0-Eigenschaften (Design, Druckdatei, _pod_karte mit ap, qd, sv, _vorschau): auf main gibt es 0 Tests mit _vorschau oder qd. (f) printful_reprice.mjs reparieren (variants(first:100) ohne Weiterblättern Z. 54, userErrors nur geloggt Z. 80-81), weil jede Preisanhebung für Aufpreise und Farben darüber läuft. Karte-widerspruch (pv, m) wird durch Paket A hart: erst P6 misst, ob 6.4.0 pv am Kaufklick richtig schreibt.

- **Abhängigkeit:** P0 liefert nur Eingaben, blockiert den Bau nicht

- **Rücknahme:** Zweig verwerfen. Nichts live: Der Zeitplan (13:37 UTC) liest ohne dropship/PRINTFUL-SYNC-FREI.txt nur (Datei fehlt, GEMESSEN heute).

- **Tests und Messung:** Erwartet grün 492/212/206 (so im Probe-Merge der Bestellweg-Analyse, von mir nicht nachgefahren; **Stand 10.11.2026 am Zweig der Härtung, selbst gefahren: 973/212/474, dazu die Preisanpassung 56**). Basislinie main 388/212/181. Volle Mutationsprobe (damals rund 13 min, heute rund 42 Minuten Wanduhr auf drei Prozessen, zusammen rund 2 Stunden Rechenzeit) selbst fahren: Paket-A-Angabe 207 von 207 ist nur die Angabe des Zweigs. Neue Mutanten für dienst-standort, aufpreis-unbezahlt, Kosten-Obergrenze und für das Lesen von Rückseite und Ärmel (heute nennt keiner der 13 Platzierungs- und Konflikt-Mutanten Rückseite oder Ärmel). Messung nachher: Zahlen und Mutationsprotokoll in bestellweg/README.md.

### P2 · Editor 6.4.1 bauen und einfrieren: Textfarbe nach Stoff, Kontrasthinweis, Handy-Lage

- **Ort:** Editor-Datei (neue Datei, SRI, editor-release.json). Ohne Rollout kein Live-Effekt. · **Live-Schreibzugriff:** nein · **Aufwand:** 1 bis 2 AB, Rollout später 1 AB

Eine neue unveränderliche Datei pod/v6/lspod-designer-v6-6.4.1.js, 6.4.0 bleibt bytegleich. (a) neuerText (Z. 1886): Standardfarbe Weiss oder #111111 nach Kontrast zu stoffFarbe (Z. 2299). Gerechnet in der Paritäts-Analyse: Kontrast #111111 gegen Stoff 1.01 (Jutebeutel schwarz), 1.04 (Shirt schwarz), 1.28 (Shirt navy), Schwelle des Editors 1.8 (Z. 107). Text-Ebenen mit unveränderter Standardfarbe folgen dem Variantenwechsel. (b) Kontrasthinweis auch in "Bearbeiten", heute nur in "Vorschau" (Z. 185, Aufruf Z. 2510). (c) Hinzufügen-Knöpfe im Handy im ersten Bildschirm (heute 738 bis 798 px unter dem Editor-Anfang, Z. 2832-2841; am Gerät ungemessen). (d) Schatten bei weisser Schrift (Z. 2200, rgba(0,0,0,.4)): Entscheid siehe Entscheide; Entfernen bricht die Zusage "Druckdatei byte-gleich zu 6.3.x" für Text mit Weiss und muss im README als gewollte Ausnahme stehen. Nur bauen und einfrieren; ob und wann ausgerollt wird, entscheidet P9.

- **Abhängigkeit:** Entscheid Schatten. Unabhängig von P1, parallel möglich. Rollout nur nach Absprache mit dem Rollout-Strang von Codex (pod/v6 ist dort zweimal kollidiert).

- **Rücknahme:** Datei nicht ausrollen, 6.4.0 bleibt. Nach Rollout: Pfadwechsel zurück auf 6.4.0 (wie 6.3.0 zu 6.3.1).

- **Tests und Messung:** Unit, Bearbeiten, Editor, Vorschau, Review-Gate wie bei 6.4.0 (370/984/393/196, im Gedächtnis angegeben) plus Mutationsprobe (245 Mutanten bei 6.4.0). Neue Prüfungen: Kontrastwahl je Kartenfarbe, Variantenwechsel, Hinweis in Bearbeiten. Beweis "Druckdatei, _pod_karte, Eigenschaften byte-gleich zu 6.4.0", ausser Weiss-Schatten. Unabhängiger Gegenleser auf das Delta (bei 6.4.0 hat das Delta der Schlussbehebung keiner gelesen). Messung vorher: Textfarbe und Kontrast je Karte (Skript über pod/v6/maps/*.karte.json). Nachher: gleiche Tabelle, Bild von Jutebeutel schwarz und Shirt navy.

### P3 · Kleine Parität ohne Editor: Grössentabelle in cm, Sticker-Daten

- **Ort:** Theme (Liquid-Block) + Daten (Metafeld). Kein Editor. · **Live-Schreibzugriff:** ja · **Aufwand:** 1 AB (Tabelle), Sticker nach Lizenzklärung 1 AB

Grössentabelle aus dem Printful-Katalog (sizes, cm) als Metafeld oder Liquid-Block neben der Grössenwahl der POD-Seiten. Gewicht: Seit Welle 1 (06.11.) gilt für selbst gestaltete Artikel keine Rückgabe wegen falscher Grösse. Vorher prüfen, ob die Seite groessentabelle schon verlinkt ist (ungemessen). Sticker-Bibliothek (stk-index.json, stk-<name>.png in Shopify Files) nur mit eigenen oder lizenzierten Motiven, keine Printful-Grafiken. Hüllen-Vorlagen als Vorschaudaten (README Entscheid 12).

- **Abhängigkeit:** keine

- **Rücknahme:** Theme-Datei aus Sicherung zurückschreiben, Rücklesen GLEICH (Muster wie lx-editor-vorlage-0911: apply.mjs mit ZURUECK=1). Metafeld leeren.

- **Tests und Messung:** Repo-Teil: Generator plus LiquidJS-Test, Mutationsprobe. Messung vorher: welche POD-Seiten verlinken die Tabelle (Seiten und Kopfzeilen, auch /fr). Nachher: Browsermessung Desktop und Handy auf 3 Seiten, 0 Liquid-Fehler. Wegen der Cloudflare-Drosselung höchstens 10 Seitenaufrufe je Messung.

### P4 · Wegwerf-Proben im Shop

- **Ort:** Daten (Shopify, Wegwerf-Produkt, Tag zz-test-loeschen) · **Live-Schreibzugriff:** ja · **Aufwand:** 1 AB Vorbereitung, 1/2 AB live

Mit einem Wegwerf-Produkt (Muster der Probe vom 28.10., pod-auswahl/README.md), danach löschen und Rest 0 prüfen: (1) dritte Option nachträglich auf ein Produkt mit zwei Optionen (productOptionsCreate, variantStrategy). Die Doku bestätigt das 3-Optionen-Limit, nicht ob das nachträgliche Hinzufügen geht. (2) Dubletten-SKU: gleiche Printful-Variante in zwei Paketen. Welche Werkzeuge stolpern (printful_lager.mjs:23 erkennt nur /^9000001_\d+$/, pod_variantenbilder, printful_reprice)? (3) Tageslimit für neue Varianten messen: Doku 1000 je Tag, beobachtet rund 9500, Ledger seit 06.11. nur 105 bis 171 je Tag. (4) 70, 236 und rund 470 Varianten und 84 Medien: Anlegedauer, Wähler im Theme, Seitengewicht (Googlebot 2 MiB), JSON-LD, Katalogfenster-Bedingung variants_count <= 250. Seitenmessung per Entwurfsvorschau (zeigt "Ausverkauft" nur als Artefakt, nie als Verfügbarkeit nehmen). (5) Variante an einem Produkt am Dienst-Standort: nur messbar, wenn ein Wegwerf-Produkt dort angelegt werden kann (ungemessen, wahrscheinlich nein).

- **Abhängigkeit:** Ja des Besitzers zum Schreiben im Shop; Fenster ausserhalb des Auswahl-Nachtlaufs (01:00 UTC); P0 (Budget)

- **Rücknahme:** productDelete des Wegwerf-Produkts, Kontrolle tag:zz-test-loeschen = 0 Treffer.

- **Tests und Messung:** Trockenlauf des Skripts als eigener Aufruf, danach live. Vorher/nachher: Variantenzahl des Shops und freies Budget aus dem Ledger. Ergebnisse als Protokoll im Repo, damit P5 und P8 mit Messwerten statt Annahmen rechnen.

### P5 · Paketmodell und Abrechnung bauen (Repo)

- **Ort:** Editor-Datei 6.5.0 + Daten (Plan, Karte) + Bestellweg · **Live-Schreibzugriff:** nein · **Aufwand:** 3 bis 4 AB

Nach Entscheid 1: Option "Druck" mit festen Paketen (Standard: "Nur Vorderseite" und "Vorder- und Rückseite") im Variantenpreis, nur auf Einmodell-Produkten der Fabrik (Farbe, Grösse, Druck = 3 Optionen). (a) automation/pod_modell/plan.mjs: Paketvarianten mit endpreis({aufpreisUsd}) (Z. 335-348), maxVarianten 100 auf 250 (plan.mjs:39 und tore.mjs:27), inklusive-Flag je Paket (Z. 188). (b) pod/v6/werkzeug/karte_fuer_editor.mjs ohne --ohne-aufpreis für Modelle mit Paketen. (c) Editor 6.5.0 (baut auf 6.4.1): Reiter ausserhalb des gewählten Pakets zeigen "Rückseite hinzufügen (+CHF 6.10)" und schalten die Theme-Option um oder sperren mit Hinweis. Welche der beiden Varianten, in P4/P6 messen (Hypothese). Keine stille Umstellung ohne Hinweis. (d) Sync-Sperre aus P1 an die Option anschliessen. (e) Preisregel nach Entscheid 2, nur Erhöhungen. (f) Tag mengenrabatt-a der POD-Produkte nach Entscheid. Verworfen: Zuschlagsprodukt als zweite Position (Menge und Zuschlag laufen im Warenkorb auseinander, Doku: can_update_quantity true; der Sync zählt Zuschlagszeilen nicht im Erlös, printful_bestellweg.mjs:483-499). Shopify Functions sind auf dem Plan "Shopify" (nicht Plus) für Custom Apps nicht nutzbar (QUELLE shopify.dev/docs/apps/build/functions), also bleibt der Sync die einzige harte Stelle. Bündelprodukte mit Material-Option (Unisex-T-Shirt, Hoodie) bekommen weder Pakete noch Farben, bis Einmodell-Produkte sie ersetzen.

- **Abhängigkeit:** P1, P4 (Optionen, SKU, Limit), Entscheide 1, 2, 3

- **Rücknahme:** Nichts live. Karten wieder mit --ohne-aufpreis bauen, Pakete entfernen.

- **Tests und Messung:** plan_test.mjs, tore_test.mjs und karte-Tests erweitern, Mutationsprobe für Preis (nie unter Netto-Boden, nur Erhöhung), Paketwahl, Sperre. Editor: Unit, Bearbeiten, Vorschau, Mutationsprobe. Rechenprobe von Hand an 3 Produkten (Preis, Rabatt -10 %, Menge 3). Messung vorher: Aufpreisstufen der Modelle (nur 17 Modelle ausgewertet, 537 bestellbar): alle Katalog-additional_price-Werte der 537 Modelle auszählen.

### P6 · Pilot Shirt 71 als Entwurf: Farben, Pakete, Test-Bestellung

- **Ort:** Daten (Entwurfsprodukt, Entwurfsbestellung), Bestellweg (Handstart), Editor (nur dieses Produkt) · **Live-Schreibzugriff:** ja · **Aufwand:** 2 AB

Fabrik-Canary Modell 71 (Entwurf, kein Kanal, keine Sammlung, Muster Tasse 403) an "Shop location", nicht klassisches T-Shirt. 12 handverlesene EU-Farben, S bis 2XL (rund 71 Varianten), mal 2 Pakete = rund 142. Glossar vorher ergänzen (17 EU-Farben ohne deutschen Namen bei 71, Gegenlesung durch einen Menschen). Editor 6.5.0 über die Beschreibung nur dieses Produkts laden, ohne Rollout. Messen mit abgefangenem Kauf (page.route auf cart/add): Positionspreis, Menge 3, Code WELCOME10, Versandschwelle, Express-Zahlung, Eigenschaften (pv, m, sv am Kaufklick). Ersatz für die Probebestellung des Besitzers (Entscheid 4 vom 05.11. war nein): Entwurfsbestellung per Admin (draftOrderCreate und -Complete als bezahlt markiert, ohne Kartenzahlung, Besitzer-E-Mail, ohne Mails, Tag test-pod) mit den Eigenschaften aus dem Editor. Dann Sync per Handstart, "Nur testen" aus, AUTO_CONFIRM=0. Prüfen: external_id LX<Nr>, Printful-Entwurf, Dateistatus beider Dateien, costs mit Rückseite, Wartezeit, ob die Admin-API die Unterstrich-Schlüssel liefert, Telegram. Danach Shopify-Test-Bestellung stornieren, Printful-Entwurf löschen. Zweiter Fahrzeug-Test ohne Aufpreis: Spiral-Notizbuch an "Shop location" mit zwei kostenlosen Platzierungen (Karte lspod-15451569324417.karte.json: front und back, aufpreisChf 0; Zuordnung zum Notizbuch aus der Paritäts-Analyse, nicht eigens geprüft).

- **Abhängigkeit:** P1, P4, P5; Ja des Besitzers zu Entwurf, Testbestellung und Printful-Entwurf; Variantenfenster frei

- **Rücknahme:** Produkt löschen (Fabrik-Ledger, ZURUECK=1 LIVE=1 pod_modell.mjs), Testbestellung stornieren und archivieren, Printful-Entwurf löschen, Tags entfernen.

- **Tests und Messung:** Fabrik-Tore (17 Tore wie bei Tasse 403), Plan-Hash, Rücklesen gleich Plan. Browser: Playwright Desktop und Handy, Farbwechsel, Paketwechsel, Karte gegen SKU. Messung vorher: Pilot-Dateien und Ledger; nachher: Protokoll in bestellweg/README.md (costs, Dateistatus, Dauer). Ergebnis entscheidet, ob "karte-widerspruch hart" bleibt.

### P7 · Freigabe Rückseite auf Shirt 71, erste echte Aufträge von Hand

- **Ort:** Daten + Bestellweg · **Live-Schreibzugriff:** ja · **Aufwand:** 1 AB, Kalenderzeit bestimmt die Bestellung

Nach bestandenem Pilot: Produkt veröffentlichen (Kanäle ohne "Google & YouTube", Entscheid vom 05.11.). Beschreibungs- und Rückgabetexte um den Satz zum Aufpreis ergänzen. Die ersten drei echten Aufträge mit Rückseite bleiben Printful-Entwürfe und werden vom Besitzer im Printful-Dashboard bestätigt (costs.total sichtbar). Erst danach AUTO_CONFIRM an, zuletzt dropship/PRINTFUL-SYNC-FREI.txt mit einem Satz zur Grundlage. Zweiten Handstart pro Tag erwägen, solange der Zeitplan nur einmal läuft (13:37 UTC).

- **Abhängigkeit:** P6 bestanden; Entscheide 3 und 4; echte Bestellung

- **Rücknahme:** Produkt auf Entwurf, Freigabedatei löschen, AUTO_CONFIRM=0.

- **Tests und Messung:** Messung: Anteil Aufträge mit Rückseite, Befunde aufpreis-unbezahlt, Netto je Auftrag aus costs gegen Erlös, Telegram gelesen. Vorher/nachher: Editor-Nutzung aus _pod_karte in Bestellungen (heute 0 von 34).

### P8 · Farben-Ausbau und Katalogfenster

- **Ort:** Daten (Varianten, Karte, Bilder) + Theme (Katalogfenster-Listen); Editor nur für Modelle mit festem Farbfoto (24 von 407, Schema 2) · **Live-Schreibzugriff:** ja · **Aufwand:** 3 bis 5 AB über mehrere Tage

Werkzeug "Farben nachziehen" (Repo ab sofort möglich, siehe sofortBeginn). Stufen: Stufe 1 = 12 Farben je Modell, nur EU-Lager, S bis 2XL (6 Modelle, zusammen 427 Varianten ohne Pakete); Stufe 2 nach 14 Tagen Beobachtung = 20 Farben (622); Endausbau begrenzt durch das 250er-Limit: mit 2 Paketen höchstens 125 Farbe-mal-Grösse-Kombinationen, also rund 25 Farben bei 5 Grössen (aus der Rechnung 250/2; Limit selbst in P4 messen). Je Farbe ein Variantenbild (pod_variantenbilder MAX_AUSSEHEN 12 und medienMax 20 anheben, plan.mjs:46). Theme: Paare in snippets/luxe-clothing-shop-offers.liquid (pricing_allowed_pairs) und Produkt-IDs in luxe-studio-blank-eligible.liquid ergänzen (nur MAIN, Sicherung, Rücklesen). Preise je Grösse über preisformel.mjs, farbneutral, nur Erhöhungen. Bündelprodukte und Dienst-Standort-Produkte erst nach P0-Ergebnis und Wegwerf-Probe.

- **Abhängigkeit:** P4 (Limits, Seitenmessung), P5 (Variantenstruktur, damit Farben nicht zweimal angelegt werden), Glossar, Variantenfenster

- **Rücknahme:** Ledger je Produkt, Varianten wieder löschen (nur ohne Bestellungen), Theme-Dateien aus Sicherung.

- **Tests und Messung:** Werkzeug gegen Attrappe mit Mutationsprobe, Trockenlauf Vorgabe, frisches Rücklesen. Messung vorher: Farben und Varianten je Produkt, Seitengewicht. Nachher: Wähler, Bildwechsel, Warenkorbbild, Katalogfenster zeigt die Paare, Lager-Wächter erkennt die SKUs. Nach Stufe 1 14 Tage Farbanteile in Warenkörben auswerten (Nachfrage heute unbekannt).

### P9 · Editor-Parität gross, ein Rollout

- **Ort:** Editor-Datei (nur dort lösbar); Sticker-Daten ausserhalb · **Live-Schreibzugriff:** ja · **Aufwand:** 6 bis 10 AB (Webfonts 1 bis 2, Fill 1, Vergrössern 1 bis 2, Download 1/2, Rollout 1 bis 2)

Alles, was nur im Editor geht, in 6.5.0 bündeln (6.4.1 und Pakete aus P5 fahren mit): Webfonts statt 5 Systemschriften (Z. 117-123, grep font-face 0 Treffer; Lizenz mit Selbst-Hosting prüfen, keine Printful-Schriften), Hintergrundfarbe (Fill) für Tasse, Hülle, Notizbuch, Mauspad, automatisches Vergrössern knapper Bilder statt hartem Stopp (Browser-Interpolation oder Dienst, Cloudinary-Plan ungeklärt), Download der Vorschau, Duplizieren auf andere Platzierung, Hinweis zum Knopf "Druckvorschau prüfen" (Z. 136). Danach, nach Bedarf: Vorder-und-Rückseite-Vorschau nebeneinander, Textbogen, Garnfarben (vor dem ersten Auftrag der Stickerei-Tasche klären), KI-Freistellen, Muster. Der Rollout läuft über Codex' Weg: neue Datei, SRI, editor-release.json, Stufen Tasse, Jutebeutel, Beobachtung, Full über 16 Beschreibungen, die drei Sperrseiten nie schreiben.

- **Abhängigkeit:** P2; Pakete aus P5 für den Rollout wegen der Reiter-Kopplung; Entscheide 8 und 9, Lizenzen

- **Rücknahme:** Pfadwechsel zurück auf die vorige Editor-Datei je Stufe in umgekehrter Reihenfolge.

- **Tests und Messung:** Wie 6.4.0: Unit, Bearbeiten, Editor, Vorschau, Review-Gate, beide Betriebsarten, Mutationsprobe (245 Mutanten bei 6.4.0 als Massstab). Neu: Test "Gleiche Vorschau" für Webfonts und Fill, Druckdatei-Invarianz für alte Entwürfe. Gegenleser unabhängig. Messung vorher/nachher: Druckdatei-Bytes gegen 6.4.0 für unveränderte Ebenen, CLS (bei 6.4.0 gab es einen Layoutsprung 0,20 bei verzögerten Vorschaudaten), Handy. Safari, Firefox und echtes Handy sind bisher nie gemessen.

## Sofort ohne Live-Risiko

- P1 komplett im Repo: Paket A einzeln auf frischem Zweig von origin/main holen (6 Dateien, siehe P1), die drei Tests (erwartet 492/212/206; tatsächlich am 10.11.2026: 973/212/474) und die volle Mutationsprobe selbst fahren (10.11.2026: 523 von 523 Mutanten erkannt, 0 überlebt, 0 ungeklärt, 0 ungültig (drei Teile mit SHARD: 175 + 174 + 174; alle 523 durch eine benannte Prüfung, keiner nur durch eine Ausnahme im Test; voller Lauf am Commit `21b8988449`, 10.11.2026 16:59 bis 17:41 UTC)). Danach Befund "dienst-standort" nach dem Muster automation/cj_tracking.mjs:115 und :189-193, Befund "aufpreis-unbezahlt" mit austauschbarer Paketfunktion, Defaults aus printful_sync.mjs:46-47 angleichen, optional PRINTFUL_MAX_KOSTEN_USD, Ende-zu-Ende-Test mit echten 6.4.0-Eigenschaften, printful_reprice.mjs reparieren.

- P2 im Repo: Editor 6.4.1 (Z. 1886 Textfarbe, Z. 185 und 2461-2476 Kontrasthinweis in Bearbeiten, Z. 2832-2841 Handy-Reihenfolge) bauen und einfrieren, ohne Rollout. Vorher den Entscheid zum Schatten (Z. 2200) einholen. Bis dahin Standard: Schatten entfernen.

- Werkzeug "Farben nachziehen" gegen eine Attrappe (productOptionsCreate, Varianten in Batches bis 100, SKU <Präfix>_<pv>, Preis je Variante aus preisformel.mjs, Ledger, Rücknahme, Rücklesen). Glossar-Ergänzungen vorschlagen (27 von 84 Farben bei 71, 29 von 50 bei 586, 6 bei 438, 4 bei 456, 1 bei 821; EU-Farben bei 71: 17). Grenzen nur als Parameter anheben (plan.mjs:39, tore.mjs:27, pod_variantenbilder MAX_AUSSEHEN, medienMax), bestehende Tests nachziehen.

- Grössentabelle: Generator aus dem Katalog (cm), Liquid-Block und LiquidJS-Test im Repo. Live erst auf Theme-Ja mit Sicherung.

- Test-Bestellung per Entwurfsbestellung: Skript im Trockenlauf bauen (Eingabe wird nur ausgegeben), mit Attrappe testen.

- Wegwerf-Proben (P4) als Skript mit Trockenlauf vorbereiten. Live erst nach dem Ja.

- P0 lesend: Printful-Auftragsliste, alle Rabattcodes, mengenrabatt-a-Tag, Variantenledger auswerten und ins Repo-Protokoll.

- Alle Aufpreisstufen der 537 bestellbaren Modelle aus dropship/codex-katalog/modelle.json auszählen (heute nur 17 ausgewertet), damit P5 mit dem vollen Katalog rechnet.

- Entscheide dem Besitzer in einer kurzen Frageliste vorlegen (unten), Antworten im Gedächtnis festhalten.

## Entscheide des Besitzers (mit Standard)

- **Aufpreis-Modell für Rückseite, Ärmel, Etiketten: feste Pakete als Option "Druck" im Variantenpreis (nur auf Einmodell-Produkten)?** Standard: Ja. Pakete "Nur Vorderseite" und "Vorder- und Rückseite", Ärmel und Etiketten später. Zuschlagsprodukt verworfen, Shopify Function auf diesem Plan nicht möglich. Bündelprodukte mit Material-Option bleiben "nur Vorderseite". Warum: Der Preis hängt an der Shopify-Variante und kann nicht gefälscht werden; die Menge multipliziert ihn mit. Shopify erlaubt höchstens 3 Optionen, daher nur mit Farbe und Grösse auf Einmodell-Produkten.

- **Preis der Rückseite: 1:1 weitergeben oder mit Marge?** Standard: Mit Marge: Netto mindestens CHF 2.00, das sind rund CHF 8.30 statt 6.10 (Abrechnungs-Rechnung, Kurs 0.90 ist eine Setzung, MWST-Status des Shops unbekannt). Warum: Bei 1:1 ist die Rückseite unter WELCOME10 (-10 %) und den 15-%-Codes ein Verlust von etwa 0.46 bis 0.73 CHF (beim Messkurs 0.82435 etwa 0.01 bis 0.28).

- **Was passiert, wenn nach der Zahlung eine Fläche gedruckt werden soll, die nicht bezahlt ist?** Standard: Auftrag bleibt Entwurf, Telegram-Meldung, der Besitzer entscheidet im Einzelfall (Nachzahlung per Entwurfsbestellung oder nur bezahlte Fläche drucken und Kundin informieren). Keine automatische Kundenmail. Warum: Ohne Antwort bleibt jeder Fall liegen; Kundenmails und Erstattungen sind Entscheide des Besitzers.

- **Darf Rückseite und Farben auf Produkten am Dienst-Standort "Printful" erst nach der Messung (P0) und einer Wegwerf-Probe freigegeben werden?** Standard: Ja, bis dahin nur Shirt 71 und Produkte an "Shop location" (Shirt 71, Tasse, Magnet, Mauspad, Spiral-Notizbuch, Samsung-Hülle). Warum: Admin-Abfrage heute: Unisex-T-Shirt, klassisches T-Shirt, Hoodie, Jutebeutel liegen am Dienst-Standort. Ob die Printful-App dort selbst Aufträge anlegt (mit dem Muster-Design), ist ungemessen; Doppel- oder Fehldruck wäre möglich.

- **Test-Bestellung ohne Kartenzahlung (Entwurfsbestellung als bezahlt markiert, Besitzer-E-Mail, ohne Mails, Tag test-pod, danach storniert)?** Standard: Ja, nach dem Pilot-Entwurf. Warum: Der Besitzer wollte keine Probebestellung (Entscheid 4 vom 05.11.); so wird der Bestellweg getestet, bevor Kundinnen ihn nutzen. Nebenwirkungen auf Zahlen und Flows ungemessen.

- **Wegwerf-Produkt im Shop anlegen und löschen (bis rund 500 Varianten), ausserhalb des Auswahl-Nachtlaufs?** Standard: Ja, nicht mehr als 500 neue Varianten je Tag, bis die Probe das Tageslimit zeigt. Warum: Doku sagt 1000 je Tag, beobachtet wurden rund 9500, das Ledger zeigt 105 bis 171 je Tag. Ohne Messung rechnet jede Phase mit einer Annahme.

- **Farben: 12 handverlesene EU-Farben je Modell, S bis 2XL, nur EU-Lager (keine Übersee-Farben)?** Standard: Ja. 3XL bis 5XL bleiben im Unisex-Produkt, die Auswahl der 12 nach Fabrik-Rangfolge (glossar.mjs:284) plus Besitzer-Korrekturen. Warum: Printful verlangt keinen Farbaufpreis, Übersee-Farben brächten Zoll und lange Lieferung (ungemessen). Welche Farben Kundinnen wählen, ist unbekannt.

- **Halbtransparenter Schatten bei weisser Schrift in Vorschau und Druckdatei (Z. 2200): entfernen?** Standard: Ja, entfernen. Das ist eine bewusste Ausnahme von "Druckdatei byte-gleich zu 6.3.x". Warum: Printfuls Hilfe rät bei DTG von Schatten und Halbtransparenz ab. Hypothese: Schwarz mit 40 % Deckkraft druckt als grauer Hof. Im echten Druck ungemessen.

- **Editor 6.4.1 (Textfarbe, Kontrast, Handy-Lage) sofort ausrollen oder mit 6.5.0 bündeln?** Standard: Jetzt bauen und einfrieren, Rollout gebündelt mit 6.5.0. Kein Notbehelf über die Standardvariante. Warum: Jeder Stand braucht einen Rollout über 16 Beschreibungen. 0 von 34 Bestellungen kamen über den Editor, der Fehler kostet heute kaum Umsatz.

- **Mengenrabatt auf selbst gestaltete Produkte: Tag mengenrabatt-a bei den POD-Produkten entfernen?** Standard: Ja, wenn P0 den Befund bestätigt (laut Abrechnungs-Analyse 4 Produkte: Keramik-Tasse, Dad-Cap, Trinkflasche, Kiss-Cut). Warum: Regel vom 27.10.: Personalisiertes ist ausgenommen. Der Titel-Regex in automation/lib/mengenrabatt.mjs:81-86 erkennt "Selbst gestalten" nicht. Der Rabatt würde auch den Paketaufpreis kürzen.

## Erst nach dem ersten echten Auftrag oder der Tasse

- Zeitplan des Printful-Sync (13:37 UTC) scharf: erst PRINTFUL_AUTO_CONFIRM, dann dropship/PRINTFUL-SYNC-FREI.txt, jeweils nach drei von Hand bestätigten Aufträgen mit Rückseite.

- Rückseite, Ärmel und Farben für die 11 aktiven Produkte am Dienst-Standort "Printful" (Unisex-T-Shirt, klassisches T-Shirt, Hoodie, Jutebeutel, Tasse, Dad-Cap, Umhängetasche, Hardcase-iPhone, Trinkflasche, Kiss-Cut, Stoffbeutel): erst nach dem P0-Ergebnis.

- Printful-Lager-Wächter scharf (dropship/PRINTFUL-LAGER-FREI.txt): printful_lager.mjs:292 lässt Dienst-Standort-Produkte aus, dort gibt es keinen Lagerschutz.

- Farben Stufe 2 (20 Farben) und Endausbau nach 14 Tagen Auswertung der Farbanteile in den Warenkörben.

- Fabrik-Canary Tasse veröffentlichen (Besitzer "warten" bis WP6 und erster Auftrag).

- Aufpreis-Platzierungen Ärmel und Etiketten als weitere Pakete; Stickerei (Alltags-Umhängetasche) erst nach der Klärung der Garnfarbe.

- KI-Kontrolle der Kundendatei entscheiden (PRINTFUL_KI_KONTROLLE: pflicht oder aus mit Sichtprüfung der ersten Dateien).

- Paket C (Warenkorb-Miniatur): vorher Basis-md5 von snippets/cart-products.liquid gegen 86a84bf9… prüfen, weil das Theme am 09.11. geändert wurde.

- Wirkung messen: Anteil Bestellungen mit Rückseite, Netto je Auftrag, Editor-Nutzung gegen Käufe; erst danach über Aufwand für Webfonts, Fill und KI-Freistellen neu entscheiden.

## Widersprüche zwischen den Analysen

- Drei-Optionen-Limit: Die Abrechnung will die Option "Druck" auf den Shirt-Seiten (+48 / +96 / +144 Varianten, nur auf Basis der heutigen 8 / 15 / 25 Varianten gerechnet). Die Farben-Analyse will Material mal Farbe mal Grösse beim Hoodie und bis 250 Varianten je Produkt. Das ergäbe 4 Optionen (OPTIONS_OVER_LIMIT, Doku bestätigt) bzw. mit 2 Paketen bis 500 Varianten. Auflösung: Pakete und Farben nur auf Einmodell-Produkten (Fabrik); Endausbau begrenzt (250 geteilt durch 2 Pakete geteilt durch 5 Grössen = rund 25 Farben).

- Pilotprodukt: Die Abrechnung wählt als Canary das klassische T-Shirt (8 Varianten). Bestellweg und Farben wählen Shirt 71. GEMESSEN heute per Admin: klassisches T-Shirt liegt am Dienst-Standort "Printful" (Doppelauftrag-Risiko ungemessen), Shirt 71 an "Shop location". Entscheid: Shirt 71.

- Netto-Rechnung: Abrechnung 4.03 für das klassische T-Shirt (Worst Case ohne Kundenversand; ich reproduziere 4.04 mit preisformel.mjs). Bestellweg "vorne netto 10.28" mit CHF 7 Versanderlös; mit den genannten Eingaben komme ich auf andere Werte. Die Zahlen sind nicht vergleichbar und keine belegt.

- Editor-Stände: Die Abrechnung verlangt 6.5.0 für die Paket-Kopplung, die Parität schlägt 6.4.1 klein und 6.5.0 gross vor, die Parität behauptet "Rückseite braucht keinen neuen Editor". Beides stimmt teilweise: Ohne Kopplung sieht der Käufer Rückseite, der Sync hält den Auftrag aber hart an (sicher, schlechte Bedienung). Auflösung: Sync-Sperre zuerst (P1), Kopplung im Editor als Bedienung (P5), 6.4.1 und 6.5.0 in einem Rollout.

- Variantenbudget: Doku 1000 je Tag, beobachtet rund 9500, Ledger 105 bis 171 je Tag seit 06.11. (14 410 am 02.11.). Abrechnung rechnet "weit unter 1000", Farben rechnet "ein Tag". Mit Pakete mal Farben liegt Stufe 1 für alle sechs Modelle bei rund 854 Varianten, knapp unter 1000. Keine Analyse hat das Limit gemessen.

- Lager: Farben setzt auf Strategie B des Lager-Wächters (nur melden, ausverkaufte Farbe bleibt kaufbar). Bestellweg stellt fest, dass der Sync den Bestand nicht vor dem Anlegen prüft; Code printful_lager.mjs:292 zeigt zusätzlich, dass Dienst-Standort-Produkte vom Wächter ausgelassen werden. Für diese Produkte gibt es keinen Lagerschutz.

- Produktbühne: Doku nennt 5 von 15 Seiten, die Messdatei der Parität 6 (mit Kiss-Cut), das Mobilbild von Kiss-Cut zeigt die flache Bühne. Unaufgelöst.

- Zuschlagsprodukt (Abrechnung B) gegen die Zahlen des Bestellwegs: Der Sync zählt Zuschlagszeilen nicht im Erlös (printful_bestellweg.mjs:483-499). Beide stützen die Ablehnung von B.

## Risiken

- Nachfrage unbekannt: 0 von 34 Bestellungen kamen über den Editor, die Ursache ist nicht gemessen. Die Phasen P5 bis P9 können viel Aufwand ohne Umsatzwirkung bedeuten. Darum Stopp-Messung nach P7.

- Dienst-Standort: Die Printful-App könnte für die 11 Produkte selbst Aufträge anlegen. Der Sync kennt den Standort nicht (git grep: 0 Treffer in printful_sync.mjs), printful_tracking.mjs lässt solche Zeilen aus (Z. 178-194), printful_lager.mjs:292 schützt sie nicht.

- Aufpreis ohne Abrechnung kostet Geld, und das Kosten-Netz greift zu spät: kostenPruefen prüft nur Mindestgewinn 4 CHF gegen den Erlös inklusive Versandanteil. Nach den Bestellweg-Zahlen bleibt eine Rückseite allein mit 4.93 über der Schwelle, erst Rückseite plus Ärmel (2.69) fällt in den Entwurf. Jedes Rabattcode-Szenario verschärft es.

- Variantenstruktur: 3-Optionen-Limit und 250er-Grenze (Katalogfenster variants_count <= 250, Liquid) kollidieren mit Farben mal Pakete. Das Tageslimit ist unbekannt (1000 oder 9500 je Tag). Ein Abbruch mitten im Produkt hinterlässt halbe Produkte.

- Parallelarbeit am selben Editor kollidiert (zweimal passiert). Jeder Editor-Stand braucht eigenen Rollout mit SRI und Stufen. Eine Datei, die per SRI gebunden ist, muss VOR der ersten Referenz fertig sein. Die Zusage "Druckdatei byte-gleich" wird durch den Schatten-Entscheid und die Textfarbe berührt.

- Zahlen auf Setzungen: Kurs 0.90, MWST-Status des Shops unbekannt, Versand 10.39 USD stammt von einem anderen T-Shirt, Katalogpreis weicht von der Rechnung für CH um -24 % bis +26 % ab. Das Netto je Produkt ist nicht belegt.

- Entwurfsbestellung als Test: Nebenwirkungen auf Zahlen, Flows, Merchant-Daten ungemessen; Printful-Entwurf angeblich ohne Belastung (nur Doku-Aussage).

- Rechte: Nur Funktionen und Bedienung nachbauen. Keine Printful-Cliparts, Schriften, Symbole, Mockup-Bilder; auch die gespiegelten Vorlagenbilder haben eine offene Rechtefrage (README Entscheid 10).

- Ausverkaufte Farben bleiben kaufbar (Strategie B meldet nur, Shirt-Varianten sind untracked mit CONTINUE). Mit mehr Farben steigt die Zahl möglicher Fehlverkäufe; der Sync prüft den Printful-Bestand vor dem Anlegen nicht.

- Mehr Farben und Pakete vergrössern Kanalkataloge (TikTok, Meta, Pinterest); Grenzen ungemessen. Google & YouTube ist für diese Produkte nicht betroffen, solange sie dort nicht veröffentlicht werden.

- Aufpreis hebt den Warenwert über die Versandschwelle (2 Shirts mit Rückseite rund CHF 61.80): gewollt, aber der Preisboden rechnet den Kundenversand mit 0, der Worst Case ist abgedeckt.

## Ungemessen

- Printfuls Design Maker selbst nie geöffnet (kein Konto): Lage der Bedienelemente, Standard-Textfarbe, Mockup-Ansichten, Handy-Bedienung sind nur aus öffentlichen Seiten abgeleitet. Die Zählungen dort widersprechen sich (Cliparts 3000 gegen 20 496).

- Verhalten der Printful-App bei Bestellungen von Produkten am Dienst-Standort (Doppelauftrag, falsches Motiv).

- Form und Zeitpunkt von costs und files[].status eines frischen Printful-Entwurfs; ob der Rückseiten-Zuschlag in costs.total steht (additional_fee oder subtotal); ob ein Entwurf unbelastet bleibt; ob Printful eine doppelte external_id selbst ablehnt.

- Ob die Admin-API die Unterstrich-Schlüssel (_pod_karte, _vorschau) an echten Bestellungen liefert (QUELLE shopify.dev: ja; in allen 34 Bestellungen kein einziger).

- Ob Shopify eine dritte Option nachträglich auf ein Produkt mit zwei Optionen zulässt; das Tageslimit für neue Varianten; Verhalten am Limit.

- Produktseite mit 70 bis 470 Varianten: Wähler, Ladezeit, Seitengewicht, JSON-LD, Handy. Warenkorb des MAIN-Themes mit Option "Druck".

- Nachfrage: welche Farben, ob Kundinnen Rückseite kaufen würden, Wirkung auf Käufe.

- Aktuelle Versandregel live (45 oder 50 Franken, VERSAND-SCHWELLE.md Stand 23.10.); alle Rabattcodes (nur 40 gelesen).

- Netto-Zahlen der Bestellweg-Analyse (10.28 / 4.93 / 2.69): mit den genannten Eingaben nicht reproduzierbar (meine Nachrechnung: gleiche Annahmen, anderes Ergebnis). Nur Grössenordnung.

- Aufpreisstufen der 537 Modelle (nur 17 ausgewertet); EU-Verfügbarkeit nach dem Katalogstand vom 08.11.

- Kiss-Cut: Messdatei meldet Produktbühne mit Reitern, das Mobilbild zeigt die flache Bühne ohne Reiter; die Desktop-Bilder sind noch 6.3.0. Widerspruch offen, für den Plan unerheblich.

- Safari, Firefox, echtes Handy, Bildschirmleser, Schriften anderer Plattformen für jeden neuen Editor-Stand.

- Wie schwarze oder weisse Schrift mit Schatten im echten DTG-Druck aussieht (Printful: schwarz auf schwarz grau und matt, bei uns nicht gemessen).

- Cloudinary-Plan und Kosten für KI-Funktionen (Vergrössern, Freistellen); Lizenzen von Schriften und vorhandenen Stickern.

- Ob die Karte lspod-15451569324417 wirklich zum Spiral-Notizbuch gehört (aus der Paritäts-Analyse geschlossen).
