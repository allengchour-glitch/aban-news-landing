# «Selbst gestalten»: Material (mit Preis) und Handymodelle zur Auswahl

Stand 27.10.2026. Auftrag des Besitzers (drei Screenshots): Poster nur «Grösse» (er will **Material**), Handyhülle nur iPhone-Modelle (er will auch **Samsung**),
Hoodie nur «Grösse» (er will **Material mit Preis** und «alle anderen Produkte auch zur Auswahl»). Druckpartner ist **Printful**.

**Zustand: gebaut, nach einer unabhängigen Prüfung korrigiert (Korrekturrunde 27.10.2026), im Trockenlauf geprüft. Nichts wurde im Shop, bei Printful oder sonst wo geschrieben.**
Der Schreibweg (`LIVE=1`) ist nur gegen eine Attrappe getestet, nie gegen den echten Shop.
**LIVE ist für drei der fünf Produkte gesperrt, bis der Besitzer entschieden hat** (Abschnitt «Blocker-Befunde»). Frei sind Poster und die neue Samsung-Hülle.

## Was das Werkzeug tut

`automation/pod_auswahl.mjs` (Trockenlauf ist die Vorgabe) legt je Produkt eine Option **«Material»** an Position 1 an und ergänzt neue Varianten.
Vorhandene Varianten bleiben unverändert (ID, SKU, Preis); sie bekommen nur den ersten Material-Wert.

| Produkt | Material-Werte | neu | gesamt | LIVE |
|---|---|---|---|---|
| `poster-zum-selbstgestalten` | Poster matt (vorhanden) · Foto-Glanzpapier · Leinwand · Gerahmt · Schwarz / Weiss / Eiche | 14 | 18 | frei |
| `unisex-hoodie-selbst-gestalten` | Baumwoll-Mix (vorhanden) · Premium-Baumwolle · Bio-Baumwolle | 11 | 19 | **gesperrt (2 Befunde)** |
| `unisex-t-shirt-selbst-gestalten` | Ringgarn-Baumwolle (vorhanden) · Klassische Baumwolle · Bio-Baumwolle · Heavyweight-Baumwolle | 24 | 33 | **gesperrt (1 Befund)** |
| `hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten` | Hartschale MagSafe (vorhanden) · Hartschale (601 matt) · Klare Hülle (181) | 32 | 48 | **gesperrt (1 Befund)** |
| `samsung-huelle-selbst-gestalten` (**neu, DRAFT**) | Hartschale matt · Hartschale glänzend · Klare Hülle · Slim-Hülle × 23 Galaxy-Modelle | 84 | 84 | frei |

Dazu je Produkt ein Block **«Materialien im Vergleich»** in der Beschreibung, nur zwischen `<!-- lx-material-v1 -->` und `<!-- /lx-material-v1 -->` (idempotent).
Jede Angabe trägt einen Beleg (Printful-Produkt + wörtliche Textstelle); der Test prüft, dass die Textstelle in `beschreibungen.json` steht und jede Zahl im Beleg vorkommt.
Gibt es mehrere Materialien, sagt der Block ausdrücklich, dass sich der Text weiter oben auf das **vorhandene** Material bezieht.

## Blocker-Befunde: LIVE für das Produkt gesperrt, bis der Besitzer entschieden hat

Jeder Befund wird **einzeln** bestätigt: `BEFUND_OK=<handle>:<code>` (nie pauschal für ein Produkt, sonst deckt eine alte Bestätigung einen neuen Befund zu).
Der Befundtext in `nicht_angelegt.md` nennt die Wege samt gerechneten Zahlen. `LIVE=1` ohne Bestätigung beendet den Lauf mit Exit 5.

| Produkt | Code | Was | Wege |
|---|---|---|---|
| Hoodie | `sku-anderes-produkt` | Die vorhandenen SKUs `1726823_5426–5433` sind bei Printful das **Crewneck-Sweatshirt** (Produkt 145, Gildan 18000), nicht der Hoodie Gildan 18500 (146, White = 5522–5529). | (1) Material ehrlich «Sweatshirt (Rundhals)» nennen, SKUs bleiben; (2) SKUs auf 5522–5529 umstellen: Einkauf 22.63–30.63 statt 19.17–27.17 USD, Preise nach Regel S–XL 46.90 statt 38.90 … 5XL 63.90 statt 55.90 (Versand 11.39 USD gemessen); (3) Sweatshirt und Hoodies als zwei Produkte. Umstellung und Umbenennung sind nicht Teil des Werkzeugs. |
| Hoodie | `sku-in-anderem-produkt` | «Premium-Baumwolle» (Cotton Heritage M2580, White): 6 der Varianten gibt es im Shop schon als eigenes Produkt `premium-hoodie-selbst-gestalten` (DRAFT, Tags u. a. `ghost-sale-risiko`, `keine-lieferanten-ref`, deren Bedeutung nicht im Repo steht), Preis dort 56.90–64.90, hier geplant 57.90–66.90. | `OHNE=unisex-hoodie-selbst-gestalten:Premium-Baumwolle` (Einzelprodukt bleibt) oder Einzelprodukt ablösen/umleiten, Preise angleichen, dann `BEFUND_OK=…:sku-in-anderem-produkt` |
| T-Shirt | `sku-in-anderem-produkt` | «Klassische Baumwolle» (Gildan 5000, White): 8 Varianten gibt es schon als `klassisches-unisex-t-shirt-selbst-gestalten` (ACTIVE), Preis dort 23.90–38.90, hier 24.90–36.90. Der dortige Preis 23.90 (S–XL) liegt mit Netto 11.70 unter der Regel von 12. | `OHNE=unisex-t-shirt-selbst-gestalten:Klassische Baumwolle` oder Einzelprodukt ablösen, Preise angleichen (Netto prüfen), dann `BEFUND_OK=…` |
| iPhone | `magsafe-irrefuehrend` | Titel und Fliesstext versprechen MagSafe®; nur «Hartschale MagSafe» hat die Magnete, «Hartschale» (601) und «Klare Hülle» (181) nicht. 32 der 48 Varianten betroffen. Bei personalisierter Ware ist die Rückgabe ausgeschlossen (`ls-pod-retoure`), ein Fehlkauf wäre nicht rückgängig zu machen. | (1) Titel und Text von Hand «entmagsafen», MagSafe® nur beim Material «Hartschale MagSafe» nennen (danach verschwindet der Befund von selbst); (2) `OHNE=<handle>:Hartschale,<handle>:Klare Hülle`; (3) statt Printful 181 die MagSafe®-Klarhülle 799 nehmen (Änderung der Spezifikation). Der Materialblock sagt bei «Hartschale» und «Klare Hülle» schon «ohne MagSafe®-Magnete». |

Mit `ONLY=poster-zum-selbstgestalten,samsung-huelle-selbst-gestalten` laufen die freien Produkte; die gesperrten werden dann nicht angefasst und der Lauf endet mit Exit 0.

## Hinweise (sperren nicht, stehen in `nicht_angelegt.md`)

- **Text ausserhalb des Blocks** (`text-ausserhalb-block`): Der Haupttext beschreibt weiter nur das vorhandene Material. Poster: «Mattes Premium-Papier», «Premium-Matt-Papier, randlos bedruckt», «30×40 bis 70×100 cm».
  T-Shirt: 142 g/m², «100 % gekämmte und ringgesponnene Baumwolle», «Vorgewaschener Stoff», «Material: Baumwolle, Polyester». Hoodie: «Sweatshirt», 50 % Baumwolle / 50 % Polyester, «Elastan». iPhone: «Mattes oder glänzendes Finish» (es gibt nur matt und klar).
  Titel und Haupttext werden **nicht angefasst** (Auftrag: nur zwischen den Kommentarmarken ändern). Der Plan sucht die Stellen frisch im Shop-Text und zitiert sie wörtlich; der Block verweist auf den Unterschied.
  **Besitzerentscheid:** Texte materialneutral fassen und Zahlen nur im Block nennen.
- **Preisleiter** (`preisleiter-nicht-monoton`): Foto-Glanzpapier A2 (CHF 25.90) ist grösser und billiger als 30×40 (CHF 28.90), wegen Printfuls Katalogpreis (A2 10.25 USD, 12×16″ 13.53 USD); auch billiger als Poster matt A2 (28.90). Die Regel ist eingehalten, im Shop wirkt es unstimmig.
  Besitzer: A2 auf mindestens den Preis von 30×40 anheben (weicht von «kleinster X.90» ab) oder weglassen.
- **Katalog-Lücken** (fünf Kombinationen des Posters, die Printful nicht führt): Foto-Glanzpapier/70×100, Leinwand/A2, Gerahmt Schwarz/Weiss/Eiche je 70×100. Dazu Gerahmt Schwarz 50×70 (Printful 9358, in der EU nicht lieferbar). Alle stehen in `nicht_angelegt.md`; nichts wurde erfunden.
- **Netto ohne Kundenversand** (`netto-nur-mit-kundenversand`): siehe Preisregel.

## Preisregel (`automation/lib/pod_preise.mjs`)

USD→CHF 0.90 · Richtwert = max(Einkauf × 2.3, Einkauf + 12) · Netto ≥ 12 CHF nach Printful-Versand (CH, je Variante, `STANDARD`) und Zahlungsgebühr (3.4 % + 0.30 CHF auf den Erlös) ·
Erlös = Preis + (Preis < 50 ? 7 : 0) · Endpreis = kleinster Wert X.90, der beides erfüllt · über 149.90 oder ohne EU-Lager bei Printful: nicht angelegt (steht im Bericht).
`printful_reprice.priced()` rundet mit `ceil(x) − 0.10` und kann den Richtwert um bis zu 0.10 unterschreiten (Richtwert 21.00 → 20.90); hier nicht.
Die MwSt. ist in der Regel nicht abgezogen (so war der Auftrag formuliert).

**Annahme der Vorgabe: Netto ≥ 12 gilt unter CHF 50 nur, solange der Kunde die CHF 7 Versand zahlt**, die Variante also allein im Warenkorb liegt. Liegt sie mit anderer Ware im Warenkorb ab CHF 50, entfällt der Versandbeitrag
und das Netto sinkt (Beispiel 5599797_11576: Preis 24.90, Erlös 31.90 → Netto 12.67; ohne die 7 CHF 5.90). Gemessen am Plan (27.10.2026): 144 der 165 neuen Preise liegen unter CHF 50, bei 140 davon wäre das Netto ohne Kundenversand unter 12 CHF
(tiefstes 5.69: iPhone- und Samsung-Hüllen 21.90). Die Tabelle weist deshalb eine zweite Spalte **«Netto ohne Kundenversand CHF»** aus, der Plan einen Hinweis je Produkt. Das ist die vorgegebene Regel, kein Fehler im Code.

## Dateien

| Datei | Inhalt |
|---|---|
| `automation/pod_auswahl.mjs` | Kommando: Trockenlauf, `DATEN=holen`, `DATEN=skuindex`, `LIVE=1` |
| `automation/lib/pod_auswahl_spec.mjs` | Spezifikation (nur Daten): Materialien, Printful-Nummern, Belegtexte, Textkonflikte, Samsung-Produkt |
| `automation/lib/pod_auswahl_plan.mjs` | Planrechnung, rein (Spezifikation + Katalog + Versand + Bestand + SKU-Index → Aktionen mit Preisen und Befunden) |
| `automation/lib/pod_preise.mjs` | Preisregel, rein |
| `automation/lib/pod_auswahl_daten.mjs` | Datenpaket laden/auffrischen (nur lesende Abfragen), SKU-Index |
| `automation/lib/pod_auswahl_gql.mjs` | GraphQL-Zugang des Schreibwegs: Mutationen werden **nie still wiederholt** (siehe unten) |
| `automation/lib/pod_auswahl_schreiben.mjs` | Schreibweg (nur hinter `LIVE=1`), mit hineingereichtem `gql`; Exit-Codes |
| `automation/lib/printful_platzierung.mjs` + `automation/printful_sync.mjs` | Fix der Druckplatzierung (siehe unten) |
| `dropship/pod-auswahl/*.json` | Datenpaket (Katalog, Beschreibungen, Versand, Bestand, SKU-Prüfung, SKU-Index), gemessen 27.10.2026 |
| `automation/pod_auswahl_mutation.mjs` | Mutationsprobe (69 absichtliche Fehler) |

`sku_index.json`: welche der neuen Printful-Nummern im Shop schon in **anderen** Produkten als SKU stehen (Abfrage `tag:wunschdesign OR tag:printful_personalized_product OR sku:*_*`, 491 Produkte gelesen).
Ohne den Index meldet der Plan «nicht geprüft» statt zu raten.

## Befehle

```bash
# Trockenlauf mit frischer Shopify-Abfrage (nur lesend); schreibt nach /tmp/pod_auswahl/ (plan.json, tabelle.md/.csv, nicht_angelegt.md, beschreibungen/, samsung_payload.json)
/opt/node22/bin/node automation/pod_auswahl.mjs
OFFLINE=1 /opt/node22/bin/node automation/pod_auswahl.mjs          # nur mit dem Datenpaket
ONLY=samsung-huelle-selbst-gestalten /opt/node22/bin/node automation/pod_auswahl.mjs
OHNE='unisex-t-shirt-selbst-gestalten:Klassische Baumwolle' /opt/node22/bin/node automation/pod_auswahl.mjs   # Material nicht aufnehmen (ändert den Plan-Hash)
DATEN=holen /opt/node22/bin/node automation/pod_auswahl.mjs        # Datenpaket auffrischen (Printful GET/Versandberechnung, Shopify-Abfrage)
DATEN=skuindex /opt/node22/bin/node automation/pod_auswahl.mjs     # nur den SKU-Index auffrischen (Shopify-Abfrage)
```

LIVE (erst nach Ansehen des Plans und nach den Entscheiden; Reihenfolge Poster, Hoodie, T-Shirt, iPhone, Samsung; mit `ONLY=` zuerst ein einzelnes Produkt):
`LIVE=1 PLAN=/tmp/pod_auswahl/plan.json ONLY=poster-zum-selbstgestalten node automation/pod_auswahl.mjs`. Der frisch berechnete Plan muss dem geprüften (Hash) gleichen, sonst Exit 3.
`OHNE=` muss im Trockenlauf und bei `LIVE=1` gleich gesetzt sein. Vor dem ersten Schreiben: Sicherung `dropship/pod-sicherung/<handle>.json` (nie überschrieben). Danach frisch zurücklesen und mit dem Plan vergleichen (Abweichung → Exit 3).
Ledger `dropship/pod_auswahl_ledger.txt` (nur Erfolge werden übersprungen). Rückgängig ist nicht automatisiert: die neuen SKUs stehen im Plan, die Ausgangszustände in `pod-sicherung/`.

**Exit-Codes** (die letzte Zeile der Ausgabe nennt den Grund: «ENDE: Exit n – …»; ein Wrapper darf «0» nur sehen, wenn wirklich alles Geplante ausgeführt ist):

| Exit | Bedeutung |
|---|---|
| 0 | alles Geplante ausgeführt (oder laut Ledger schon erledigt) |
| 1 | mindestens ein Produkt mit FEHLER, drei Fehler in Folge, Eingabefehler oder Verstoss im Plan |
| 3 | Abweichung: Zustand im Shop ≠ Plan (Lauf sofort beendet) |
| 4 | `VARIANT_THROTTLE_EXCEEDED`: Tageslimit für neue Varianten erreicht (nicht wiederholen; der Auswahl-Lauf der Nacht braucht dasselbe Limit, 165 neue Varianten) |
| 5 | mindestens ein Produkt im Lauf GESPERRT (Blocker-Befund nicht bestätigt); mit `ONLY=` ausserhalb der gesperrten Produkte wird daraus 0 |

**Mutationen werden nie still wiederholt** (`pod_auswahl_gql.mjs`). `lib/shopify_gql.mjs` ist für lesende Wächter gebaut und wiederholt bei Netzfehler, Zeitüberschreitung und HTTP 5xx bis zu sechsmal. Bei einer Mutation wäre das gefährlich:
war die erste Anfrage schon ausgeführt und nur die Antwort ging verloren, legt die Wiederholung zum Beispiel mit `productSet` ein zweites Samsung-Produkt mit 84 Varianten an und verbraucht das Tageslimit. Darum bekommen Mutationen `versuche: 1`;
nur eine nachweislich nicht ausgeführte Anfrage (`Throttled`, HTTP 429) wird mit wachsender Pause wiederholt, das Tageslimit nie. Der nächste Lauf liest den Shop frisch und ergänzt, was fehlt.

## Platzierung der Druckdatei (`printful_sync.mjs`)

`placementFor()` verglich die Shopify-`productType`-Zeichenkette («Handy-Zubehör», «Tassen & Becher», «Accessoires») mit Printful-Typen (`PHONE-CASE`, `MUG` …); Hüllen, Tassen, Flaschen gingen als `front` an Printful.
Jetzt: echter Printful-Typ der Variante (`GET /products/variant/<id>` → `product.type`, `product.files`), mit Zwischenspeicher, Rückfall auf die alte Zuordnung (`lib/printful_platzierung.mjs`).
Eine Platzierung → diese; Einzel-Typ → `default`; Bekleidung → `front`/`back` (die Printful-Doku zeigt `"type": "front"` am T-Shirt 4011; der Katalog nennt dieselbe Vorderseite `default`).

## NICHT anwenden: `printful_reprice` auf «Selbst gestalten»

Der manuelle Workflow «Printful-Reprice» (`.github/workflows/printful-reprice.yml`, `automation/printful_reprice.mjs`, Vorgabe-Tag `wunschdesign`) setzt mit `apply=true` jeden Preis auf `ceil(max(Einkauf × 2.3, Einkauf + 12)) − 0.10`,
**ohne Versand und Gebühr**. Er würde 43 der 165 neuen Preise senken, 40 davon unter Netto 12 CHF (Beispiele: Glanz-A2 von 25.90 auf 21.90, Netto 8.95; gerahmt A2 von 106.90 auf 100.90, Netto 6.73).
Darum **überspringt `printful_reprice.mjs` die fünf Produkte aus `pod_auswahl_spec.mjs`**; `AUCH_AUSWAHL=1` hebt die Sperre auf (nur mit Absicht). Die Preise dieser Produkte kommen aus `lib/pod_preise.mjs` (`endpreis()`).

## Prüfung

```bash
for t in automation/lib/pod_preise_test.mjs automation/lib/printful_platzierung_test.mjs automation/lib/pod_auswahl_plan_test.mjs \
         automation/lib/pod_auswahl_daten_test.mjs automation/lib/pod_auswahl_gql_test.mjs automation/lib/pod_auswahl_schreiben_test.mjs automation/pod_auswahl_test.mjs; do /opt/node22/bin/node $t | tail -1; done
/opt/node22/bin/node automation/pod_auswahl_mutation.mjs     # alle 69 Mutanten müssen erkannt werden
bash automation/ci_simulation.sh                              # CI nachspielen (nach dem Commit)
```

## Offen (Entscheide des Besitzers, keine Fehler im Code)

- Die vier Blocker-Befunde oben (Hoodie 2, T-Shirt 1, iPhone 1).
- Texte ausserhalb des Blocks materialneutral fassen (Poster, T-Shirt, Hoodie, iPhone); Preisleiter Foto-Glanzpapier A2.
- Vorhandene Preise tragen teils unter 12 CHF Netto (nur Hinweis, nicht geändert): Poster 30×40 (11.74), mehrere T-Shirt-Grössen (z. B. 5599797_9526: 10.44).
- Produkt-Metafeld `mm-google-shopping.material` bleibt je Produkt eines («Papier (matt)», «Baumwolle, Polyester, Elastan» …): für die neuen Materialien stimmt es im Merchant-Feed nicht mehr, sobald sie live sind.
- Leinwand 70×100 cm = Printful 28″×40″ (19321, ≈ 71×102 cm), CHF 141.90, als «abgeleitet» gekennzeichnet.
- Slim-Hülle nur matt (Printful 684 gibt es auch glänzend: 104 Varianten wären über der Grenze von 100).
- Wenige Materialangaben sind wörtlich belegt, aber knapp formuliert (Leinwand «insgesamt 3,18 cm dick» ist die Herstellerangabe zur ganzen Leinwand; Grössenhinweise stehen nur «bei diesem Material»).
