# «TWINT Zahlung sichtbar»: Zahlungs-Symbole im Shop (LIVE 04.11.2026)

Auftrag Besitzer 04.11.: «twint zahlung sichtbar». **Auslegung (meine, vom Besitzer nicht bestätigt):** TWINT soll dort zu sehen sein, wo Kundschaft ihre Zahlungsart sucht, nicht nur als Text.

## Messlage vorher (GEMESSEN 04.11., Live-Shop)
- TWINT stand nur als **Text** im Shop: Vertrauenszeile der Produktseite («🔒 Kauf auf Rechnung — Klarna · TWINT · Karten · PayPal»), Aufzählung auf der Warenkorb-Seite, Assistent. **Kein Zahlungs-Symbol** in Fusszeile, Produktseite, Warenkorb oder Schublade; die Express-Zeile zeigt nur Shop Pay, PayPal, Google Pay.
- Das Theme hat einen fertigen Block `blocks/payment-icons.liquid`, der aber nirgends eingebaut war.
- Wegwerf-Vorlage (`templates/page.lxtest.liquid`, danach gelöscht): `shop.enabled_payment_types` = american_express, apple_pay, google_pay, klarna, master, paypal, shopify_pay, **twint**, unionpay, usdc, visa. Shopify liefert für `twint` das offizielle Symbol (`payment_type_svg_tag`).

## Was live ist
Neues Snippet `snippets/lx-zahlungsarten.liquid` (offizielle Shopify-Symbole, **nur was im Shop wirklich aktiviert ist**, TWINT zuerst, dann Visa, Mastercard, Amex, PayPal, Klarna, Apple Pay, Google Pay; UnionPay, USDC und Shop Pay werden bewusst nicht gezeigt). Beschriftung folgt der Sprache («Bezahlen mit» / «Payer avec» / «Pay with»). Keine Reihe, wenn keine Zahlungsart aktiv ist. Jede Reihe trägt ein eigenes Präfix für die festen Symbol-IDs (`produkt-pi-twint`, `fuss-pi-twint`, `korb-pi-twint`), damit keine doppelten IDs entstehen.

| Stelle | Datei | Wirkung |
|---|---|---|
| Produktseite, direkt unter dem Vertrauensblock | `templates/product.json`, neuer Block `lux_zahlungsarten` | acht Symbole, linksbündig |
| Fusszeile, zwischen Link-Spalten und unterer Leiste | `sections/footer-group.json`, neuer Abschnitt `custom_liquid_lxzahlung` | alle Seiten, zentriert |
| Warenkorb-Seite und Schublade, unter Kasse und Express-Zahlung | `snippets/cart-summary.liquid` | in der Schublade nur bei Fensterhöhe ab 760 px (darunter wäre die Reihe angeschnitten; Kasse und Express-Zahlung bleiben immer zu 100 % sichtbar) |

Nicht angefasst: `templates/product.luxe-studio.json` (zweite Produktvorlage, trägt keine Vertrauenszeile), Preise, Versand- und Rabatt-Texte, Checkout (Shopify-gehostet).

## Prüfung
- `patches_test.mjs`: 40 Prüfungen (Basis-md5, Rundweg byte-gleich, Form der JSON-Vorlagen, Klammern, keine Preis-/Versand-/Rabattaussage; mit `LIQUIDJS_DIR=<Ordner mit npm install liquidjs>` zusätzlich echtes Rendern: Reihenfolge, nur aktivierte Arten, Leerfall, drei Sprachen, 24 verschiedene IDs bei drei Reihen). **Mutationsprobe 20 von 21 erkannt** (die eine gleichwertig: ein unbenutzter Export).
- Live eingespielt mit `LIVE=1 node dropship/zahlung-0411/apply.mjs` (Snippet zuerst, dann die drei Dateien, Rücklesen aller vier GLEICH). Der **Rückweg wurde einmal praktisch gefahren** (alle drei Dateien wieder auf den Original-md5, Snippet gelöscht) und danach die verbesserte Fassung neu eingespielt.

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/zahlung-0411/apply.mjs` stellt die drei Dateien aus `sicherung/*.vor` wieder her und löscht das Snippet (nur, wenn live noch exakt der eingespielte Stand liegt, sonst Exit 3).

## Offen / Grenzen
- Wirkung auf Verkäufe **ungemessen** (Kontrolle Mi 05.11., Mo 10.11.: Kaufquote Produktseite → Warenkorb → Kasse, TWINT-Anteil der Zahlungen; Stand 03.11.: 3 TWINT-Zahlungen, 17,9 % des Volumens).
- Auf den Handy-Browsern mit Leisten (sichtbare Höhe unter 760 px) fehlt die Reihe in der Schublade; sie steht dort weiter auf Produktseite, Warenkorb-Seite und in der Fusszeile.
- TWINT ist **kein Express-Knopf** (Shopify bietet ihn nur im Checkout an); das Symbol zeigt die Möglichkeit, es ersetzt keine Auswahl.
- Nur Chromium gemessen (Desktop 1440, 1366×680, Handy 390).
