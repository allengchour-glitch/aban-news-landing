# Sidekick-Empfehlungen umgesetzt: Kaufweg am Handy, drei Produktseiten, Startseiten-Fokus, Werbetest-Plan (10.10.2026)

Betreiber leitete vier Empfehlungen von Shopify Sidekick weiter. Reihenfolge der Umsetzung: erst messen (Kaufweg), dann die Seiten, dann die Startseite, Werbung zuletzt.

## 1. Kaufweg auf dem Handy getestet (`tools/kaufweg_handy.mjs`)

**Werkzeug:**
- echtes Chromium, 390×844, Touch, iPhone-Kennung
- Weg: Startseite → Tipp auf erste Produktkarte → Variante → «In den Warenkorb» → Warenkorb → Kasse mit Testadresse `kaufweg-test@example.com`, ohne Zahlung
- je Schritt Bild und die y-Position von Preis, Auswahl, Kaufknopf und Versandangabe

| Befund | Gemessen | Getan |
|---|---|---|
| Preis nicht im ersten Bildschirm | Leinen-Set: Brotkrumen 2 Zeilen + Titel 3 Zeilen (h3) → Preis bei y=910 (Bildschirm 844) | Handy-CSS im Brotkrumen-Block: Produktname nicht doppelt, Titel 1.5rem → **Preis im ersten Bildschirm** (Vorher/Nachher-Bild) |
| Falsche Brotkrumen | Leinen-Set unter «🎁 Geschenke & Weihnachten › Sets & Bundles»: der Ausschluss prüfte nur Untermenüs, nicht den Elternpunkt | Elternmenüs mit «Geschenke» ausgeschlossen → «Home › Damen-Mode» |
| Englisch im Warenkorb | Überschrift «Cart», Knopf «Auschecken» | «Warenkorb» (templates/cart.json), «Zur Kasse» (locales/de.json `content.checkout`) |
| Versandkosten | Warenkorb: «Noch CHF 10.10 bis zum Gratis-Versand · CHF 39.90 + CHF 7.00 Versand = CHF 46.90» | in Ordnung, keine späte Überraschung |
| **Lieferdatum widersprüchlich** | Produktseite «26. Okt. – 9. Nov.» (heute + 14–28 T), Kasse «Voraussichtliche Zustellung **Di., 20. Okt**». `deliveryPromiseSettings.processingTime` = P1D; CJ versendet gemessen nach 4–7 Tagen | **Betreiber-Klick** (API kann es nicht schreiben, auch `unstable` nicht): Bearbeitungszeit 4 Werktage → `COWORK-BEFEHL.md` |
| Cookie-Banner | Startseite: im ersten Bildschirm unten (104 px), Produktseite erst nach Scrollen (seit 07.10.) | unverändert (Einwilligung nötig) |
| Variantenwahl | Farben + Grössen klar, Hinweis «fällt kleiner aus», Mass-Tabelle; Kaufknopf aktiv | in Ordnung |

Theme-Sicherung vorher: `dropship/_theme_vorher_2026-10-10_kaufweg/` (product.json, cart.json, de.json, index.json).

## 2. Drei Produktseiten (Sirène, Aurora, Provence)

**Auswahl:** grösste belegte Nachfrage, gemessen über Sitzungen, Warenkörbe und Verkäufe seit Mai.
- **Leinen-Set «Provence»:** einmal verkauft (#1014), 197 Sitzungen, 6 Warenkörbe
- **«Sirène»:** 228 Sitzungen, 4–6 Warenkörbe
- **«Aurora»:** 159 Sitzungen, 0 Warenkörbe

Bilder je 8–12 in allen Farben, Bildprüfung ohne Befund.

| Seite | vorher | jetzt |
|---|---|---|
| **Sirène** | kein Material, keine Pflege, kein Lieferumfang; **allgemeine EU-Tabelle XS–3XL** (Kleid nur S–XL, widerspricht «fällt klein aus») | + «Schulterfreier Carmen-Ausschnitt» (auf allen Bildern, war nicht erwähnt); Kasten **Im Paket** (Kleid; Schuhe/Schmuck nicht dabei), **Grösse wählen** (S–XL, Hinweis, Grössenberatung per Mail laut Herstellertabelle), **Anlässe** (Weihnachtsfeier, Silvester, Gala), **Lieferung** (10–20 Werktage, Dezember-Feste bis Mitte November bestellen; CHF 7, ab 50 gratis); EU-Tabelle entfernt |
| **Aurora** | Liste ungeschlossen (`<ul>` erst am Dokumentende zu) | Liste repariert; + Weihnachtsfeier & Silvester; + **Im Paket**, **Lieferung** (gratis Versand) |
| **Provence** | «perfekt für Sommer …»; Tasche und Armreifen auf allen Bildern, kein Lieferumfang; keine Pflege | «für Brunch, Reise und milde Herbsttage»; **Im Paket** (Bluse + Hose; Tasche, Armreifen, Sandalen nicht dabei), **Im Herbst tragen**, **Pflege** (Link Ratgeber «Leinen pflegen»), **Lieferung** |

- Vorher-Stand liegt in `dropship/_pdp_vorher_2026-10-10.json`.
- Live per WebFetch geprüft.
- **Bewertungen:** Echte Bewertungen gibt es noch keine (Judge.me 0). Erfundene gibt es nicht (Hausregel).

## 3. Startseite: eine Hauptkategorie

**Entscheid Damenmode.** Gemessen:
- Mode hat die meisten Sitzungen und Warenkörbe.
- Mode wurde wiederholt gekauft: Leinen-Set #1014, Kleider #1013, Cargo-Hose #1022.
- Der Hero sagt schon «Kleider entdecken».

**Umsetzung:**
- **Neue Kollektion** `/collections/damenmode-favoriten` «Damenmode – unsere Favoriten»:
  - 12 Stück, Tag `fokus-damenmode`, Sortierung MANUAL, in 9 Kanälen
  - die drei überarbeiteten Seiten plus Herbst/Festtage: Trenchcoat, Strickkleider, Cape-Mantel, Langarm-Kleid
  - ehrlicher Text zu Grösse und Lieferung
- **Reihe `mode_row`** von Platz 12 direkt unter Hero und Vorteilsleiste verschoben, Katalog `damen-mode` (gross) → `damenmode-favoriten`.
- Der Rotations-Automat lässt feste Reihen in Ruhe.
- **«Gerade im Trend»** steht jetzt an Platz 2 statt direkt unter dem Hero (Abweichung vom Auftrag 12.08., wegen der Fokus-Empfehlung).
- **Live:** «Damenmode – unsere Favoriten» als erste Reihe (WebFetch).

## 4. Werbetest

Plan mit Voraussetzungen, Gewinnschwelle (Sirène ~CHF 26 je Kauf), Budgetvorschlag CHF 70 und Abbruchregeln: `dropship/WERBETEST-PLAN-2026-10-10.md`.

**Messgerät** `tools/werbetest_trichter.py` (ShopifyQL je `utm_campaign`): Sitzungen → Warenkorb → Kasse → Kauf.
- Befund: TikTok-Lernkampagne 548 → 8 → **6 Kasse → 0 Kauf**
- ChatGPT 112 → 6 → 2 → 1

## Offen

- **Betreiber:** Bearbeitungszeit 4 Werktage (Kasse), danach Kaufweg nachmessen.
- **CJ-Reset 00:00 UTC:** echte Masse je Grösse und Material für die drei Kleider holen und eintragen. Sirène hat kein Material.
- **Preisfrage Sirène:** CHF 49.90 liegt 10 Rappen unter der Gratis-Versand-Schwelle. Betreiber entscheidet.
- **Kristall-Set:** Adresse `kristall-set-3-teilig`, Titel «8-teilig», verkauft als «3-teilig» für CHF 36.90, heute CHF 29.90. Prüfen, ob Ware und Bild noch zusammenpassen.
