# Katalogmanifest für den offiziellen Printful-EDM-Rollout

> Stand: 8. November 2026. Dieses Manifest ist ein vollständiger Auditkatalog und ausdrücklich keine Laufzeit-Allowlist. Alle EDM-Freigaben bleiben fail-closed.

## Ergebnis

- Shopify wurde für den definierten Selbstgestalten-Umfang vollständig und gezielt gelesen: **41 Produkte / 398 Varianten**. Alle 398 Shopify-Variant-GIDs sind positiv, global eindeutig und NFC-normalisiert.
- Status: **19 ACTIVE / 245 Varianten** und **22 DRAFT / 153 Varianten**. DRAFT bleibt gesperrt.
- Provider: **39 Printful-Produkte / 377 Varianten** sind auf eine aktuelle Printful-Produkt- und Variant-ID aufgelöst. Davon sind 18 Produkte / 244 Varianten ACTIVE und 21 Produkte / 133 Varianten DRAFT.
- `buegeltransfer-selbst-gestalten` ist ACTIVE, aber als **Mister-DTF / NON_PRINTFUL_FULFILLMENT** blockiert.
- `wm-trikot-selbst-gestalten` ist DRAFT; für seine 20 Varianten fehlt eine belegte Printful-Zuordnung. Provider und Printful-IDs bleiben `unknown`/`null`.
- Die transparente iPhone-Hülle ist vollständig als Printful-Modell **181** mit 31 aktuellen Shopify-Varianten belegt. Die farbige Tasse ist als Modell **403** mit 11 Varianten belegt, bleibt jedoch DRAFT.
- Die aktuelle Printful-Gegenprobe umfasst genau 45 relevante Modelle mit je einem öffentlichen Produktaufruf: **45/45 HTTP 200, 2’257 Varianten, 0 eingestellte Modelle**. Jede der 377 behaupteten Zuordnungen wurde gegen den aktuellen Variantenbesitz des Modells geprüft.
- `edmEligible` ist auf Produkt- und Variantenebene überall `false`: Token-Scopes und Domainbindung, Nonce-Backend sowie der Bestellweg sind technisch noch nicht frisch Ende-zu-Ende bestätigt.
- `mockupEligible` ist nur für `keramik-tasse-selbst-gestalten` und seine drei exakt belegten Varianten `1320`, `4830`, `16586` wahr. Nur dort liegen zusätzlich positive Shopify-/Printful-IDs und konkrete Druckflächengeometrien vor.

## Integrität

- Vollständiger Shopify-Snapshot: `32459e3668fc2df941820dbe034d0405b87e5a836d6f6486edfb1545d29c5cb3`
- Printful-Variantenbesitz: `19c24a357a6d66ac882c3d786d430108b3aa8c1348f9678bf0a0bbd9e2047530`
- Generiertes Katalogmanifest: `0634449e2d5a5f7a9791afbeacdf38f1a7229ab3d20c47a0c6721a2e92a07d3d`
- Der Generator prüft 41/398, GID-Eindeutigkeit, Produktidentität, Status, Variantenzahl, NFC, Provider-Splits, aktuellen Printful-Variantenbesitz und die fail-closed Flags.
- `tools/build-catalog-manifest.py --check` vergleicht das Manifest bytegenau mit den Quellen.

## Produktabdeckung

| Shopify-Status | Provider | Varianten | exakt gepaart | Printful-Modelle | Technik (aktueller Default) | Mockup | Handle |
|---|---|---:|---:|---|---|---|---|
| DRAFT | printful | 1 | 1 | 279 | CUT-SEW | nein | `allover-rucksack-selbst-gestalten` |
| DRAFT | printful | 6 | 6 | 282 | CUT-SEW | nein | `allover-sport-bh-selbst-gestalten` |
| ACTIVE | printful | 1 | 1 | 84 | CUT-SEW | nein | `allover-stoffbeutel-selbst-gestalten` |
| DRAFT | printful | 5 | 5 | 242 | CUT-SEW | nein | `allover-yoga-leggings-selbst-gestalten` |
| ACTIVE | printful | 1 | 1 | 1552 | EMBROIDERY | nein | `alltags-umhangetasche-selbst-gestalten` |
| DRAFT | printful | 4 | 4 | 843 | DTG | nein | `baby-jersey-body-selbst-gestalten` |
| DRAFT | printful | 12 | 12 | 1553 | EMBROIDERY | nein | `baumwolltasche-mit-langen-henkeln-selbst-gestalten` |
| ACTIVE | printful | 2 | 2 | 367 | DTG | nein | `bio-jutebeutel-selbst-gestalten` |
| DRAFT | printful | 11 | 11 | 1483 | CUT-SEW | nein | `boardshorts-mit-allover-druck-selbst-gestalten` |
| ACTIVE | mister-dtf | 1 | 0 | unbekannt | modellabhängig / unbekannt | nein | `buegeltransfer-selbst-gestalten` |
| ACTIVE | printful | 1 | 1 | 206 | EMBROIDERY | nein | `dad-cap-selbst-gestalten` |
| ACTIVE | printful | 1 | 1 | 788 | SUBLIMATION | nein | `edelstahl-trinkflasche-mit-strohhalm-selbst-gestalten` |
| DRAFT | printful | 7 | 7 | 272 | CUT-SEW | nein | `einteiliger-allover-badeanzug-selbst-gestalten` |
| ACTIVE | printful | 48 | 48 | 181, 601, 798 | modellabhängig / unbekannt | nein | `hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten` |
| DRAFT | printful | 11 | 11 | 403 | SUBLIMATION | nein | `keramik-tasse-farbige-innenseite-selbst-gestalten` |
| ACTIVE | printful | 3 | 3 | 19 | SUBLIMATION | ja | `keramik-tasse-selbst-gestalten` |
| ACTIVE | printful | 4 | 4 | 358 | DIGITAL | nein | `kiss-cut-aufkleber-selbst-gestalten` |
| DRAFT | printful | 2 | 2 | 83 | CUT-SEW | nein | `kissen-zum-selbstgestalten` |
| ACTIVE | printful | 8 | 8 | 438 | DTG | nein | `klassisches-unisex-t-shirt-selbst-gestalten` |
| DRAFT | printful | 6 | 6 | 896 | CUT-SEW | nein | `kleid-mit-schlitz-und-allover-druck-selbst-gestalten` |
| DRAFT | printful | 2 | 2 | 395 | SUBLIMATION | nein | `kuscheldecke-selbst-gestalten` |
| DRAFT | printful | 2 | 2 | 394 | SUBLIMATION | nein | `laptop-sleeve-selbst-gestalten` |
| ACTIVE | printful | 3 | 3 | 656 | DIGITAL | nein | `magnet-zum-selbstgestalten` |
| ACTIVE | printful | 1 | 1 | 518 | SUBLIMATION | nein | `mauspad-selbst-gestalten` |
| DRAFT | printful | 18 | 18 | 3, 171, 268, 304 | DIGITAL | nein | `poster-zum-selbstgestalten` |
| DRAFT | printful | 6 | 6 | 380 | DTG | nein | `premium-hoodie-selbst-gestalten` |
| DRAFT | printful | 7 | 7 | 400 | CUT-SEW | nein | `recycelte-allover-jogginghosen-selbst-gestalten` |
| DRAFT | printful | 11 | 11 | 388 | CUT-SEW | nein | `recycelter-unisex-allover-hoodie-selbst-gestalten` |
| DRAFT | printful | 11 | 11 | 320 | CUT-SEW | nein | `recycelter-unisex-allover-pullover-selbst-gestalten` |
| ACTIVE | printful | 84 | 84 | 267, 684, 686 | modellabhängig / unbekannt | nein | `samsung-huelle-selbst-gestalten` |
| ACTIVE | printful | 15 | 15 | 71 | DTG | nein | `shirt-zum-selbstgestalten` |
| ACTIVE | printful | 1 | 1 | 474 | DIGITAL | nein | `spiral-notizbuch-selbst-gestalten` |
| DRAFT | printful | 2 | 2 | 259 | SUBLIMATION | nein | `strandtuch-selbst-gestalten` |
| ACTIVE | printful | 2 | 2 | 19 | SUBLIMATION | nein | `tasse-zum-selbstgestalten` |
| DRAFT | printful | 1 | 1 | 84 | CUT-SEW | nein | `tote-zum-selbstgestalten` |
| ACTIVE | printful | 31 | 31 | 181 | UV | nein | `transparente-iphone®-hulle-selbst-gestalten` |
| DRAFT | printful | 7 | 7 | 390 | CUT-SEW | nein | `unisex-allover-bomberjacke-selbst-gestalten` |
| ACTIVE | printful | 13 | 13 | 145, 821 | DTG | nein | `unisex-hoodie-selbst-gestalten` |
| ACTIVE | printful | 25 | 25 | 71, 456, 586 | DTG | nein | `unisex-t-shirt-selbst-gestalten` |
| DRAFT | printful | 1 | 1 | 1562 | EMBROIDERY | nein | `urban-umhangetasche-selbst-gestalten` |
| DRAFT | unknown | 20 | 0 | unbekannt | modellabhängig / unbekannt | nein | `wm-trikot-selbst-gestalten` |

## Verwendung

- `data/catalog-manifest.json` enthält alle 41 Produkte und 398 Varianten als Auditdaten, einschliesslich DRAFT und blockierter Provider. Es darf nicht direkt als Runtime-Allowlist geladen werden.
- `data/product-manifest.json` bleibt die getrennte, engere Laufzeit-Allowlist. DRAFT-Varianten und Mister-DTF dürfen dort nie freigegeben werden.
- `provider: "printful"` ist für einen Relay-Aufruf zwingend. Zusätzlich müssen Produkt und Variante `mockupEligible: true` sein; die Variante braucht positive IDs und mindestens eine Druckfläche mit positiver Breite und Höhe.
- Printful-Variant-IDs sind nicht als globaler Reverse-Key zu verwenden: 23 IDs werden absichtlich von mehreren Shopify-Varianten referenziert. Die stabile Zuordnung ist Shopify-Produkt/Variante plus Printful-Produkt/Variante.
- SKU-Präfixe sind keine Printful-Modell-IDs. Modellzuordnungen stammen aus der Handle-Karte beziehungsweise den dokumentierten Ausnahmen 181 und 403; jede Variant-ID wurde danach gegen das aktuell gelesene Modell geprüft.

## Verifikation

```text
python3 dropship/printful-edm-r137/tools/build-catalog-manifest.py --check
node --test dropship/printful-edm-r137/test/catalog-manifest.test.mjs
```

Beide Prüfungen waren beim Erstellen grün. Es wurden keine Shop-, Printful- oder Remote-Schreibvorgänge ausgeführt.
