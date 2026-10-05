# Checkout-Abbrüche 21.09.–05.10.2026 — Messung, Hürden, Massnahmen

Stand 05.10.2026 ~05:40 UTC. Alle Zahlen aus der Shopify-Admin-API (GraphQL 2026-01, `automation/kaufwille_zeile.gql`),
ShopifyQL, der Klaviyo-API und einem WebFetch der Live-Produktseite. **Keine Personendaten** — nur Produkte, Beträge,
Zeiten, Land. Plan: `dropship/FIX-12H-PLAN.md` Punkt 3.

## 1. Die Körbe (`abandonedCheckoutsCount(created_at:>=2026-09-21)` = 8, precision EXACT)

| Zeit (UTC) | Korb | Ware | Versand | Total | Land | Kunde kaufte später? |
|---|---|---|---|---|---|---|
| 29.09. 07:57 | Kristall-Set 3-teilig (heute «Kristallspitzen-Set 8-teilig in Holzbox») | 29.90 | 7.00 | 36.90 | CH | **nein** (0 Bestellungen) — dasselbe Produkt kaufte am 29.09. 22:16 eine **andere** Kunden-ID (#1020, 36.90) |
| 03.10. 02:24 | Leinen-Set «Provence» Pink/S | 39.90 | 7.00 | 46.90 | CH | nein |
| 03.10. 02:30 | Leinen-Set «Provence» Pink/S | 39.90 | 7.00 | 46.90 | — (keine Adresse) | nein |
| 03.10. 02:40 | Abendkleid «Sirène» Weinrot/S | 49.90 | 0.00 | 49.90 | — | nein |
| 03.10. 13:58 | Eisen-Steakpressplatte | 37.90 | — (keine Adresse) | 37.90 | — | nein |
| 03.10. 14:00 | Eisen-Steakpressplatte (gleiche Kunden-ID wie 13:58) | 37.90 | — | 37.90 | — | nein |
| 03.10. 20:13 | Leinen-Set «Provence» Jeansblau/M (Korb am 04.10. 06:19 nochmals geöffnet) | 39.90 | 7.00 | 46.90 | CH | nein |
| 04.10. 00:25 | Geometrische Strickdecke | 22.90 | 7.00 | 29.90 | CH (Belp) | **Eigenkorb des Betreibers** (Kunden-ID mit 6 Bestellungen seit 17.05.) — zählt nicht |

Netto: **7 fremde Körbe von 5 Kunden-IDs, 4 Produkte, 0 später gekauft** (`customer.numberOfOrders` = 0 bei allen 5;
`completedAt` = null bei allen 8). Alle Körbe: **1 Artikel**, Ware CHF 29.90–49.90. Rabattcodes: keine. Zahlart ist bei einem
abgebrochenen Checkout nicht lesbar (wird erst mit der Zahlung geschrieben) — die Zahlart-Hürde ist aus diesen Daten nicht messbar.

## 2. Trichter 14 Tage (ShopifyQL `FROM sessions … SINCE -14d`, human)

- **483 Sitzungen → 11 Warenkorb → 9 Checkout erreicht → 3 abgeschlossen.** 6 von 9 Checkouts abgebrochen (67 %).
- **Alle 9 Checkouts mobil** (`session_device_type`: mobile 432 Sitzungen/9/3, desktop 45/0/0, tablet 6/0/0).
- Quelle: direct 257 Sitzungen/6 Checkouts/2 Käufe · **social 184/2/0** (TikTok 143/2/0, Facebook 32/0/0, Pinterest 5, Instagram 4) ·
  search 34/1/1 · unknown 8/0/0.
- Landeseiten mit Checkout: **Provence-Set 41 Sitzungen / 2 Warenkorb / 2 Checkout / 0 Kauf** — 39 der 41 von TikTok mit
  `utm_campaign=lernen-okt26` (Video `tiktok-lernen-provence.mp4`); Kristall-Set 7/2/2/1; Startseite 65/2/2/1; Nibosi-Uhr 1/1/1/1.
- Bestellungen im Fenster (4): #1019 27.09. (erstattet), #1020 29.09. Kristall-Set 36.90, #1021 30.09. Nibosi 45.90 (Quelle ChatGPT),
  #1022 03.10. 2× Cargo-Hose 80.82.

## 3. Hürden — gemessen, nicht geraten

1. **Versand CHF 7 erscheint erst im Checkout.** Tarif (`deliveryProfiles`): Standard CHF 7.00 ohne Bedingung; «Kostenloser Versand»
   CHF 0 ab **CHF 45.00** nach Rabatt (aktiv); dazu aktiv eine zweite Nullrate «Standard» ab CHF 65.00 und zwei **inaktive** Reste
   (ab 50 und ab 45). **5 der 7 fremden Körbe lagen unter CHF 45** (3× 39.90, 2× 37.90) → +7.00 im Checkout; nur das Abendkleid
   (49.90) bekam Gratisversand. Im Warenkorb-Drawer (`settings.cart_type` = drawer) gibt es **keinen Hinweis** «noch CHF x bis
   Gratisversand» — Horizon hat keinen Balken (`grep free_shipping|threshold` über 23 Cart-Theme-Dateien = 0 Treffer); der statische
   Text «Versand CHF 7.00 · gratis ab CHF 50» steht nur auf der /cart-Seite (`lux_cart_trust`), die mit Drawer kaum jemand sieht.
   Dazu ein **Widerspruch**: die Produktseite (`lux_trust`) sagt ab 4500 Rappen «Gratis Versand inklusive», die /cart-Seite «gratis ab CHF 50»
   — beim Abendkleid 49.90 widersprechen sich beide, der Checkout gibt dann gratis.
2. **Lieferzeit 10–20 Werktage.** Live-Produktseite Provence (WebFetch 05.10.): «Direktversand vom Hersteller in Asien — deshalb die
   längere Lieferzeit», «Geschätzte Ankunft: 19. Okt. – 2. Nov.», «Verfügbar · Direktversand aus Asien». Der Hinweis **steht** auf allen
   5 Produktseiten (Beschreibungstext + `custom.lieferzeit`-Metafeld bei 3) — die Lücke «Lieferzeit-Hinweis fehlt» gibt es nicht. Die
   Hürde ist der Inhalt (2–4 Wochen bei TikTok-Impulskäufen), nicht die Darstellung; von hier nicht änderbar (CJ China).
3. **Grössenunsicherheit (Mode = 4 der 7 Körbe):** Grössentabelle vorhanden, mit dem Satz «Asiatische Konfektion fällt kleiner aus –
   bitte eine Grösse grösser wählen». Ehrlich, aber für Pink/S zweimal und Jeansblau/M einmal ein naheliegender Zweifel.
4. **0 Bewertungen sichtbar:** Judge.me-Widget zeigt «No reviews» (Provence). Für alle 4 Produkte 0 Bewertungen.
5. **Preis:** Zwei Körbe lagen unter dem heutigen Preis: Steakpressplatte 37.90 → **40.90** (`_preis_verlustschutz.txt` 04.10., EK 32.43),
   Strickdecke 22.90 → **24.90** (04.10., EK 19.35). Das sind keine Abbruch-Ursachen (Preis stieg erst danach), aber: beide Körbe
   wären unter der 15-%-Reserve verkauft worden — der Verlustschutz greift bei Neuimporten erst am Folgetag.
6. **Uhrzeit:** 3 Körbe zwischen 02:24 und 02:40 UTC (04:24–04:40 Ortszeit) — nächtliches Stöbern, klassischer Abbruch ohne Hürde.

## 4. Rückholung — ist SCHON aktiv (Klaviyo), Shopify-nativ NICHT

- Shopify: `marketingActivities(first:50)` = **0** → keine native Automation «Abgebrochener Checkout». Apps installiert: Shopify Email,
  Flow, **Klaviyo**.
- **Klaviyo-Flow «Abandoned Checkout» (ID Vse76a) ist LIVE seit 24.05.2026**, Auslöser Metrik «Checkout Started» (XhnJPv):
  1 h warten → Mail 1 «Dein Einkauf wartet auf dich» (von info@luxestyle.ch, du-Form) → 23 h → Mail 2 «Noch unschlüssig? 10% auf
  deinen Warenkorb» (WELCOME10, «ohne Mindestbestellwert») → 1 Tag → Mail 3 «Email #3 Subject» = **Entwurf** (sendet nicht).
- **Leistung 30 Tage** (`get_flow_report`, Conversion = Placed Order): Mail 1: 7 Empfänger, 7 zugestellt, 4 geöffnet, 1 Klick,
  **1 Kauf CHF 45.90** (= #1021 Nibosi-Uhr 30.09.); Mail 2: 3 Empfänger, 0 Öffnungen. Flow gesamt: 10 Empfänger, 1 Conversion
  (10 %), Umsatz je Empfänger CHF 4.59. «Checkout Started» in Klaviyo KW 28.09.: 12 Ereignisse / 10 Profile — die Ereignisse kommen an.
- Warum 7 Empfänger bei 8 Körben + 4 Käufen: Körbe ohne E-Mail-Adresse (3 der 8 ohne Adresse) lösen keine Mail aus.
- Code «COMEBACK10 — 10% Cart-Recovery (Klaviyo Abandoned)» existiert, 0× benutzt — der Flow nutzt WELCOME10 (3× benutzt insgesamt).
- **Folge für den Betreiber-Klick aus dem Plan:** Shopify-Marketing-Automation «Abgebrochener Checkout» **NICHT** zusätzlich
  aktivieren — sie würde dieselben Kundinnen innerhalb von Stunden ein zweites Mal anschreiben. Die Rückholung ist da und hat
  im Fenster einen Kauf gebracht.

## 5. Massnahmen

### Von hier gemacht
- Messung wie oben; **`automation/checkout_abbruch_messen.py`** geschrieben (Ampel-Zeile «CHECKOUT 7 T: n Abbrüche · Trichter
  x erreicht / y gekauft · unter CHF 45: k · Kunde kaufte später: m», `TAGE=14 DETAIL=1` listet die Körbe ohne Personendaten).
  **⚠️ UNGETESTET** — der Probelauf wurde vom Klassifizierer verweigert; vor dem Aufseher-Einbau einmal von Hand laufen lassen.
- Keine Mails, keine Rückerstattungen, keine Produkt- oder Theme-Änderung (siehe «Offen»).

### Offen (von hier verweigert oder nicht möglich)
1. **Gratisversand-Hinweis im Warenkorb-Drawer** — fertiger Block für `snippets/cart-summary.liquid` (Theme 187533001089
   «Horizon · LuxeStyle + Email-Popup (Claude)»), einzufügen direkt nach dem schliessenden `</div>` von `cart-totals__container`
   (Zeile 257, vor `</div>` der `.cart-totals`), Live-Datei zuerst holen und sichern:
   ```liquid
   {%- comment -%} LUX-GRATISVERSAND-HINWEIS (05.10.2026, dropship/CHECKOUT-ABBRUCH-2026-10-05.md) {%- endcomment -%}
   {%- unless cart == empty -%}
     <div class="cart-totals__item lux-gratisversand cart-primary-typography" role="status" style="font-size:0.92em;text-align:center;">
       {%- if cart.total_price >= 4500 -%}
         🚚 <strong>Gratisversand inklusive</strong> · Lieferung in die Schweiz
       {%- else -%}
         {%- assign lux_gv_rest = 5000 | minus: cart.total_price -%}
         🚚 Versand CHF 7 · noch <strong>{{ lux_gv_rest | money }}</strong> bis zum Gratisversand (ab CHF 50)
       {%- endif -%}
     </div>
   {%- endunless -%}
   ```
   Logik = dieselbe wie der Produktseiten-Block `lux_trust` (4500 Rappen Technik, CHF 50 Versprechen). `cart.total_price` ist nach
   Rabatt, wie die Tarifbedingung. Der Drawer rendert `cart-summary` bei jeder Änderung neu → der Betrag läuft mit. Der Upsert
   (`themeFilesUpsert`) wurde in diesem Lauf vom Klassifizierer verweigert → Hauptlauf oder Betreiber im Theme-Editor.
2. **Statischen /cart-Text** `lux_cart_trust` («Versand CHF 7.00 · gratis ab CHF 50») durch denselben dynamischen Block ersetzen
   (gleiche Verweigerung).
3. **Zahlart-Hürde** nicht messbar (Checkout-Zahlart erst nach Zahlung). Checkout-Profil «Konfiguration 2 für LuxeStyle» publiziert
   (19.06.), Wallets SHOPIFY_PAY/APPLE_PAY/GOOGLE_PAY; `paymentCustomizations` = 0.

### Betreiber-Klicks (mit Belegen)
- **Shopify-Automation «Abgebrochener Checkout» NICHT aktivieren** — Klaviyo-Flow Vse76a live, 10 Empfänger/1 Kauf in 30 T (oben).
  Stattdessen in Klaviyo → Flows → «Abandoned Checkout»: **Mail 3 («Email #3 Subject», Entwurf) löschen oder fertig schreiben**
  und bei Mail 2 den Text «ohne Mindestbestellwert» prüfen (WELCOME10 ist ohne Mindestwert angelegt; 10 % liegt in der 15-%-Reserve).
- **Versandprofil aufräumen** (Einstellungen → Versand → General profile, Zone Domestic): zweite aktive Nullrate «Standard ab CHF 65»
  und die zwei inaktiven Reste «Kostenloser Versand ab 50/45» entfernen — eine Kundin sieht ab CHF 65 heute zwei Gratis-Optionen.
- **Judge.me:** «No reviews» bei Produkten ohne Bewertung ausblenden (Judge.me → Widget-Einstellungen), 0 Bewertungen auf allen
  4 Korb-Produkten.
- Theme-Block aus «Offen 1» einbauen, falls der Hauptlauf es nicht darf (Onlineshop → Theme → Code bearbeiten → `snippets/cart-summary.liquid`).

## 6. Was dieser Bericht NICHT sagt
- Warum die 5 Kundinnen abgebrochen haben, weiss niemand; oben stehen nur die messbaren Umstände (Versand im Checkout, 2–4 Wochen
  Lieferzeit, Grössenzweifel, 0 Bewertungen, Nachtzeit).
- Ob die Klaviyo-Conversion #1021 wirklich auf die Mail zurückgeht: Shopify nennt als Erstbesuch «ChatGPT», Klaviyo zählt den Klick
  — beides kann stimmen (ChatGPT → Checkout abgebrochen → Mail → Kauf).
