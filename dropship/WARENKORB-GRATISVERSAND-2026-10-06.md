# Warenkorb-Drawer zeigte keine Versandkosten — Hinweis live (06.10.2026)

## GEMESSEN
- **Landeseiten 14 Tage** (ShopifyQL, `GROUP BY landing_page_path`): Abendkleid Sirène 227 Sitzungen / 4 Warenkorb / 2 Checkout / 0 Kauf ·
  Leinen-Set Provence 178 / 4 / **4** / 0 · Abendkleid Aurora 158 / 0 / 0 / 0 · Startseite 122 / 6 / 6 / 1.
  Die drei Kleider-Seiten: 563 Sitzungen → 8 Warenkorb → 6 Checkout → **0 Kauf**.
- Checkout-Abbrüche 21.09.–05.10. (`CHECKOUT-ABBRUCH-2026-10-05.md`): **5 von 7 fremden Körben unter CHF 45** → im Checkout erstmals
  «Versand CHF 7.00» (Provence 39.90 → 46.90).
- Tarif (`deliveryProfiles`, General profile, CH): Standard **CHF 7.00**, aktive Nullrate **ab CHF 45** (zweite Nullrate ab 65, zwei
  inaktive Reste). Versprechen auf Seiten, Policies, /cart und in `zusagen_abgleich.py`: **«gratis ab CHF 50»** (45 = bewusster Puffer
  für den automatischen 10-%-Rabatt ab 2 Artikeln).
- Theme «Horizon · LuxeStyle + Email-Popup (Claude)» (MAIN), Warenkorb = Drawer: `snippets/cart-summary.liquid` enthielt **0×**
  «gratis/Versand» — nur die /cart-Seite (`templates/cart.json`, `lux_cart_trust`) nannte die Schwelle.

## GETAN
- `automation/warenkorb_gratisversand.py`: fügt nach der Steuer-Notiz in `.cart-totals__container` einen Block ein (Anker muss genau
  1× vorkommen, Marke `LUX-GRATISVERSAND-HINWEIS`, Live-Datei vorher nach `/tmp/cart-summary.vor-gratisversand.*.liquid` gesichert,
  zurückgelesen). Regel = Produktseiten-Block `lux_trust`: Korb ≥ 45 → «🚚 Gratisversand inklusive · Lieferung in der Schweiz»,
  darunter → «🚚 Versand CHF 7 · noch X bis zum Gratisversand (ab CHF 50)». `cart.total_price` = nach Rabatt (wie die Tarifbedingung).
- **Live geprüft** mit eigenem Testkorb (Storefront, Cookie-Sitzung, danach geleert): Provence 1× (39.90) → «noch **CHF 10.10** bis zum
  Gratisversand (ab CHF 50)»; 2× (71.82 nach Mengenrabatt) → «**Gratisversand inklusive**».
- Wächter `--pruefen` (Kanarien 5/5): Hinweis im Live-Snippet? Theme MAIN? Standardversand = 7.00? aktive Gratis-Rate ≤ 45 ≤ 50?
  Im Aufseher täglich (`fixer_keepalive.sh`); fehlt nur der Hinweis (Theme-Update), fügt er ihn einmal neu ein, Tarif-Abweichung meldet er.

## OFFEN
- Wirkung messen: Checkout-Abbrüche unter CHF 45 und Warenkorb→Checkout→Kauf der Kleider-Seiten in 7/14 Tagen
  (`checkout_abbruch_messen.py`, Ampel «CHECKOUT 7 T»).
- Betreiber-Klick (unverändert aus dem 05.10.-Bericht): Versandprofil aufräumen — zweite aktive Nullrate «Standard ab 65» und die zwei
  inaktiven Reste entfernen.
