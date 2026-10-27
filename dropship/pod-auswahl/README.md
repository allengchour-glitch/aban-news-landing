# «Selbst gestalten»: Material (mit Preis) und Handymodelle zur Auswahl

Stand 27.10.2026. Auftrag des Besitzers (drei Screenshots): Poster nur «Grösse» (er will **Material**), Handyhülle nur iPhone-Modelle (er will auch **Samsung**),
Hoodie nur «Grösse» (er will **Material mit Preis** und «alle anderen Produkte auch zur Auswahl»). Druckpartner ist **Printful**.

**Zustand: gebaut und im Trockenlauf geprüft. Nichts wurde im Shop, bei Printful oder sonst wo geschrieben.** Der Schreibweg (`LIVE=1`) ist nur gegen eine Attrappe getestet, nie gegen den echten Shop.

## Was das Werkzeug tut

`automation/pod_auswahl.mjs` (Trockenlauf ist die Vorgabe) legt je Produkt eine Option **«Material»** an Position 1 an und ergänzt neue Varianten.
Vorhandene Varianten bleiben unverändert (ID, SKU, Preis); sie bekommen nur den ersten Material-Wert.

| Produkt | Material-Werte | neu | gesamt |
|---|---|---|---|
| `poster-zum-selbstgestalten` | Poster matt (vorhanden) · Foto-Glanzpapier · Leinwand · Gerahmt · Schwarz / Weiss / Eiche | 14 | 18 |
| `unisex-hoodie-selbst-gestalten` | Baumwoll-Mix (vorhanden) · Premium-Baumwolle · Bio-Baumwolle | 11 | 19 |
| `unisex-t-shirt-selbst-gestalten` | Ringgarn-Baumwolle (vorhanden) · Klassische Baumwolle · Bio-Baumwolle · Heavyweight-Baumwolle | 24 | 33 |
| `hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten` | Hartschale MagSafe (vorhanden) · Hartschale (601 matt) · Klare Hülle (181) | 32 | 48 |
| `samsung-huelle-selbst-gestalten` (**neu, DRAFT**) | Hartschale matt · Hartschale glänzend · Klare Hülle · Slim-Hülle × 23 Galaxy-Modelle | 84 | 84 |

Dazu je Produkt ein Block **«Materialien im Vergleich»** in der Beschreibung, nur zwischen `<!-- lx-material-v1 -->` und `<!-- /lx-material-v1 -->` (idempotent).
Jede Angabe trägt einen Beleg (Printful-Produkt + wörtliche Textstelle); der Test prüft, dass die Textstelle in `beschreibungen.json` steht und jede Zahl im Beleg vorkommt.

## Preisregel (`automation/lib/pod_preise.mjs`)

USD→CHF 0.90 · Richtwert = max(Einkauf × 2.3, Einkauf + 12) · Netto ≥ 12 CHF nach Printful-Versand (CH, je Variante, `STANDARD`) und Zahlungsgebühr (3.4 % + 0.30 CHF auf den Erlös) ·
Erlös = Preis + (Preis < 50 ? 7 : 0) · Endpreis = kleinster Wert X.90, der beides erfüllt · über 149.90 oder ohne EU-Lager bei Printful: nicht angelegt (steht im Bericht).
`printful_reprice.priced()` rundet mit `ceil(x) − 0.10` und kann den Richtwert um bis zu 0.10 unterschreiten (Richtwert 21.00 → 20.90); hier nicht.
Die MwSt. ist in der Regel nicht abgezogen (so war der Auftrag formuliert).

## Befund: die vorhandenen «Hoodie»-SKUs sind ein Sweatshirt

`GET /products/variant/5426` (27.10.2026): `unisex-hoodie-selbst-gestalten` trägt SKUs `1726823_5426–5433`. Das ist bei Printful Produkt **145 «Unisex Crew Neck Sweatshirt | Gildan 18000»**
(White, ohne Kapuze), nicht der Hoodie Gildan 18500 (146, White = 5522–5529). Der Seitentext («Sweatshirt», 50 % Baumwolle / 50 % Polyester) passt zum Sweatshirt, Titel und Adresse nicht.
Der Plan führt das als **Blocker-Befund**: `LIVE=1` sperrt dieses Produkt, bis `BEFUND_OK=unisex-hoodie-selbst-gestalten` gesetzt ist (Entscheid des Besitzers: SKUs auf 5522–5529 umstellen oder «Sweatshirt» benennen).
Der Materialtext nennt beim Baumwoll-Mix ehrlich «Rundhals-Sweatshirt (Crew Neck)», bei Premium/Bio «Kapuzenpullover».

## Dateien

| Datei | Inhalt |
|---|---|
| `automation/pod_auswahl.mjs` | Kommando: Trockenlauf, `DATEN=holen`, `LIVE=1` |
| `automation/lib/pod_auswahl_spec.mjs` | Spezifikation (nur Daten): Materialien, Printful-Nummern, Belegtexte, Samsung-Produkt |
| `automation/lib/pod_auswahl_plan.mjs` | Planrechnung, rein (Spezifikation + Katalog + Versand + Bestand → Aktionen mit Preisen) |
| `automation/lib/pod_preise.mjs` | Preisregel, rein |
| `automation/lib/pod_auswahl_daten.mjs` | Datenpaket laden/auffrischen (nur lesende Abfragen) |
| `automation/lib/pod_auswahl_schreiben.mjs` | Schreibweg (nur hinter `LIVE=1`), mit hineingereichtem `gql` |
| `automation/lib/printful_platzierung.mjs` + `automation/printful_sync.mjs` | Fix der Druckplatzierung (siehe unten) |
| `dropship/pod-auswahl/*.json` | Datenpaket (Katalog, Beschreibungen, Versand, Bestand, SKU-Prüfung), gemessen 27.10.2026 |
| `automation/pod_auswahl_mutation.mjs` | Mutationsprobe (39 absichtliche Fehler) |

## Befehle

```bash
# Trockenlauf mit frischer Shopify-Abfrage (nur lesend); schreibt nach /tmp/pod_auswahl/ (plan.json, tabelle.md/.csv, nicht_angelegt.md, beschreibungen/, samsung_payload.json)
/opt/node22/bin/node automation/pod_auswahl.mjs
OFFLINE=1 /opt/node22/bin/node automation/pod_auswahl.mjs          # nur mit dem Datenpaket
ONLY=samsung-huelle-selbst-gestalten /opt/node22/bin/node automation/pod_auswahl.mjs
DATEN=holen /opt/node22/bin/node automation/pod_auswahl.mjs        # Datenpaket auffrischen (Printful GET/Versandberechnung, Shopify-Abfrage)
```

LIVE (erst nach Ansehen des Plans; Reihenfolge Poster, Hoodie, T-Shirt, iPhone, Samsung; mit `ONLY=` zuerst ein einzelnes Produkt):
`LIVE=1 PLAN=/tmp/pod_auswahl/plan.json ONLY=poster-zum-selbstgestalten node automation/pod_auswahl.mjs`. Der frisch berechnete Plan muss dem geprüften (Hash) gleichen, sonst Exit 3.
Vor dem ersten Schreiben: Sicherung `dropship/pod-sicherung/<handle>.json` (nie überschrieben). Danach frisch zurücklesen und mit dem Plan vergleichen (Abweichung → Exit 3).
Ledger `dropship/pod_auswahl_ledger.txt` (nur Erfolge werden übersprungen). Drei Fehler in Folge → Abbruch. `VARIANT_THROTTLE_EXCEEDED` → Exit 4, nicht wiederholen (der Auswahl-Lauf der Nacht braucht dasselbe Tageslimit; 165 neue Varianten).
Rückgängig ist nicht automatisiert: die neuen SKUs stehen im Plan, die Ausgangszustände in `pod-sicherung/`.

## Platzierung der Druckdatei (`printful_sync.mjs`)

`placementFor()` verglich die Shopify-`productType`-Zeichenkette («Handy-Zubehör», «Tassen & Becher», «Accessoires») mit Printful-Typen (`PHONE-CASE`, `MUG` …); Hüllen, Tassen, Flaschen gingen als `front` an Printful.
Jetzt: echter Printful-Typ der Variante (`GET /products/variant/<id>` → `product.type`, `product.files`), mit Zwischenspeicher, Rückfall auf die alte Zuordnung (`lib/printful_platzierung.mjs`).
Eine Platzierung → diese; Einzel-Typ → `default`; Bekleidung → `front`/`back` (die Printful-Doku zeigt `"type": "front"` am T-Shirt 4011; der Katalog nennt dieselbe Vorderseite `default`).

## Prüfung

```bash
for t in automation/lib/pod_preise_test.mjs automation/lib/printful_platzierung_test.mjs automation/lib/pod_auswahl_plan_test.mjs \
         automation/lib/pod_auswahl_daten_test.mjs automation/lib/pod_auswahl_schreiben_test.mjs automation/pod_auswahl_test.mjs; do /opt/node22/bin/node $t | tail -1; done
/opt/node22/bin/node automation/pod_auswahl_mutation.mjs     # alle 39 Mutanten müssen erkannt werden
bash automation/ci_simulation.sh                              # CI nachspielen (nach dem Commit)
```

## Offen (Entscheide, keine Fehler)

- Hoodie: siehe Befund. Ausserdem tragen vorhandene Preise teils unter 12 CHF Netto (nur Hinweis, nicht geändert): Poster 30×40 (11.74), mehrere T-Shirt-Grössen.
- Produkt-Metafeld `mm-google-shopping.material` bleibt je Produkt eines («Papier (matt)», «Baumwolle, Polyester, Elastan» …): für die neuen Materialien stimmt es im Merchant-Feed nicht mehr, sobald sie live sind.
- Beschreibungstexte ausserhalb des Blocks («Premium-Matt-Papier», «Mehrere Grössen 30×40 bis 70×100 cm», «Hoodie») wurden nicht angefasst.
- Leinwand 70×100 cm = Printful 28″×40″ (19321, ≈ 71×102 cm), CHF 141.90, als «abgeleitet» gekennzeichnet.
- Slim-Hülle nur matt (Printful 684 gibt es auch glänzend: 104 Varianten wären über der Grenze von 100).
