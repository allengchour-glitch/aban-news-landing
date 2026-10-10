# Fremdmarke als Ware: Harrods-Tasse, Fake-Xbox-Controller, «iPhone 12» (10.10.2026, «weiter»)

## Anlass

Beim Kuratieren der Wichtel-Seite stand die **«Harrods Keramik-Tasse»** (CJ, CHF 19.90) in der Auswahl.
- Auf **jedem Bild** steht das Harrods-Schriftlogo. Harrods verkauft nicht über chinesische Dropshipper, also ist das eine Fälschung.
- **Schon am 24.09. bekannt:** Beim Herbst-Kuratieren fiel die Tasse auf. Die Regel kam aber nur in `herbst_kuratieren.py` (GLOBAL_RAUS).
- Die Tasse blieb **aktiv, im Google-Kanal und in «Geschenke bis CHF 30»**.
- Google Merchant wertet «Counterfeit goods» als Grund für eine Kontosperre. Der Google-Kanal ist der einzige mit belegten Verkäufen.

## Gemessen

- **Titel-Scan über 52'167 aktive Produkte:** 277 Titel mit Markennamen.
  - Fast alle sind **Kompatibilität**: «Hülle für iPhone», «Controller-Halterung für PS4/PS5/Xbox», «Armband für Samsung Galaxy Watch».
  - Der Rest ist **Lizenzware** von Fortura CH (Kostüme Batman/Harry Potter, Folienballone Mickey Mouse, Plüsch Pikachu). Die meisten davon sind ohnehin nicht im Google-Kanal.
- Nach Regel und Lizenz-Filter (SKU `fortura-`/`bb-`/Druckware) blieben **16 Treffer**. Alle wurden am Bild geprüft (Kontaktbogen):

| Produkt | Befund am Bild | Urteil |
|---|---|---|
| Harrods Keramik-Tasse | Harrods-Logo auf jeder Tasse | **Entwurf**, `marke-faelschung` |
| Xbox 360 Wireless Controller | nachgemachte Xbox-360-Verpackung, chinesischer Text | **Entwurf**, `marke-faelschung` |
| «iPhone 12» (CHF 31.90) | Bilder = runde Billig-Smartwatch; Text verspricht A14-Chip, 5G, Ceramic Shield | **Entwurf**, `titel-bild-widerspruch`: unklar, was CJ liefert |
| Xiaomi Mi Band 1S / 2 / 3, Mi Band 6, Mijia Luftpumpe | sieht nach Xiaomi-Ware aus, Herkunft nicht prüfbar; Mi Band 1S (2015) für CHF 50.90 | `marken-pruefen` → aus Google, bleibt im Shop |
| 7 Controller/Gamepads «PS4», 1 Arcade-Joystick «PS3» | kein PlayStation-Logo erkennbar, zwei sind exakte DualShock-4-Nachbauten | `marken-pruefen` → aus Google, bleibt im Shop |
| Bausteinmodell Audi RS7 | kein Logo, Markenname nur in Titel/Text | `marken-pruefen` → aus Google |

**Google:** `google_sperrtags_durchsetzen.py` hat die 13 sofort aus allen Werbekanälen genommen (0 Fehler). Onlineshop, Shop-App und POS bleiben unberührt.

## Getan

- **Regel** `automation/data/marke_als_ware_regel.json`. Eine Marke im Titel ist ein Treffer, wenn sie weder steht
  - nach «für/fürs/kompatibel mit/,///&» (auch «für 49mm Apple Watch»),
  - nach einem Zubehörwort («Adapter iPhone», «Hardcase iPhone»),
  - noch vor einem Zubehörwort in den nächsten 40 Zeichen («-Hülle», «Ladestation», «Lüfter», «Tasten», «Sticker»).
  - **Ausnahme:** «Smart-Armband» ist die Ware selbst, nicht Zubehör.
  - **Ketten** gelten als erlaubt: «für Samsung Galaxy Watch», «für Xiaomi Mi Band».
  - Wörter wie «Galaxy-Projektor», «Off-White», «Stitch-Detail», «Bayern», «Yeti» stehen bewusst nicht in der Liste.
  - 60 Kanarien.
- **Bestand/Wächter** `automation/marke_als_ware.py`:
  - Kanarien, py=js 52'167/0.
  - **Aufseher täglich** (Block MARKE-ALS-WARE, startet nur bei grünen Kanarien in Python UND JS, über `shopify_schranke.sh`).
  - Neue Treffer bekommen `marken-pruefen` und landen in der Liste `dropship/MARKE-ALS-WARE.md` zum Sichten.
  - Status und Tags werden **live** gelesen, der Export kann bis 24 h alt sein.
  - Urteil nach Bildprüfung: `--draften ID GRUND=marke-faelschung`, erlaubte Ware mit Tag `marke-ok`.
- **Importer:** `cj_category_fill.mjs`, `cj_trending_import.mjs` und `cj_sku_import.mjs` überspringen Treffer nach dem Texten (`skip(marke-als-ware)`).
  - Geprüft wird der **deutsche Titel**, nicht der CJ-Name: Englische Zubehörnamen («Apple Watch Strap») würden sonst gesperrt.
- **Geschenkwelten** (`geschenk_unterwelten.py`) sperren Harrods/Starbucks/Disney & Co. zusätzlich im Titel.

## Abgrenzung zu bestehenden Regeln

- `marken_filter.mjs` / `markenanlehnung.py`: **Anlehnung** im Text («im Chanel-Stil») wird umgeschrieben. Eine Marke als Ware kennen sie nicht. Ihre Liste hat weder Harrods noch Xbox noch iPhone.
- `herbst_kuratieren.py` GLOBAL_RAUS: schützt nur die Herbst-Reihe. **Das war die Lücke vom 24.09.:** Ein Fund in einer Auswahl wurde als Auswahl-Regel gelöst, nicht als Warenurteil.

## Offen

- **Logo ohne Markennamen im Titel** sieht diese Regel nicht. Wäre die Tasse «Keramik-Tasse mit Schriftzug» betitelt, bliebe sie unsichtbar. Das braucht Bildprüfung, etwa als Stichprobe im Kontaktbogen neuer Importe.
- **Die 13 mit `marken-pruefen`:** Urteil je Produkt, wenn Zeit ist. Mi Band 1S/2 sind 2015/16-Modelle zu Preisen über dem damaligen Neupreis, also eher Entwurf.
