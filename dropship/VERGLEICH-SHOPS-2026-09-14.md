# VERGLEICH — 10 Schweizer Shops gegen luxestyle.ch, gemessen (14.09.2026, 09:40–10:15 UTC)

Betreiber: «vergleiche andere seite mit unsere und verbessere unsere». Kein Eindruck, eine Tabelle:
`tools/shop_vergleich.mjs` (Selbsttest mit Gegenproben, 17 Prüfungen) holt Startseite + erste Produktseite jedes
Shops und zählt dieselben 32 Kennzahlen. Marken: **GEMESSEN** = hier gezählt. Galaxus/Zalando/Jumbo/Brack sperren
Rechenzentrums-IPs (403/0 B) → nicht messbar, nicht geraten.

## 1. Der eine Befund, der uns von ALLEN unterscheidet: Gewicht der Startseite

| | luxestyle.ch VORHER | Median 10 Vergleichsshops | Spanne |
|---|---|---|---|
| Startseite HTML | **7'082 KB** | ~400 KB | 125 (frei-form) – 1'427 (carpasus) |
| `<img>`-Tags | **1'122** | ~60 | 9 – 874 |
| Produktkarten | 408 (204 Produkte × 2) | — | — |
| Skripte (src) | 58 | 23 | 15 – 63 |

77 % unserer Sitzungen sind mobil. Ursache (GEMESSEN am HTML): Horizons `product-list` mit `layout_type: grid` +
`carousel_on_mobile: true` rendert **jede Reihe ZWEIMAL** (Raster `hidden--mobile` + Karussell `hidden--desktop`,
`snippets/resource-list.liquid` Z. 104/143). 17 Reihen × 12 Produkte × 2 = 408 Karten à 17 KB. Dazu **620 KB
identische Inline-SVG**: das Warenkorb-Icon 755× (420 B) und der «checkmark-burst» 184× (1,7 KB) — je Karte
vier Kopien desselben Icons.

**Änderungen (surgical, Backups in `theme_backup/*vor-*-0914`):**
1. `templates/index.json`: 17 Reihen `layout_type: grid` → `carousel` (Karussell auf Desktop UND Handy, einmal
   gerendert; Karten-Bildkarussell und Reihenzahl unverändert — der Betreiberwunsch «Karussell» 24.07. bleibt).
2. Warenkorb-Icon als **ein** `<symbol id="lx-icon-atc">` in `layout/theme.liquid`, `<use>` in
   `snippets/add-to-cart-button.liquid` + `snippets/quick-add.liquid` (368 `<use>` statt 368 Inline-Kopien).
   Nicht angefasst: `checkmark-burst` — seine CSS-Animation zielt auf innere Pfade (`.burst .line`), die durch
   `<use>` nicht erreichbar wären.

| Messung (`tools/shop_startseite.mjs`, 12 Abrufe) | vorher | nach 1 | nach 1+2 |
|---|---|---|---|
| Startseite | **6,92 MB**, 0 % Fehler, 484 ms | 3,83 MB, 0 % | **3,75 MB** (Einzelabruf; 12er-Lauf s. u.) |
| `<product-card>` | 408 | 188 | 188 |
| `<img>` | 1'122 | 583 | 583 |
| Produktseite (Kontrolle) | 0,55 MB | 0,55 MB | 0,56 MB |

WebFetch-Gegenprobe (fremder Ausgang): Startseite rendert «Gerade im Trend → Shop nach Kategorie → Bestseller»
mit Produkten und Preisen; Produktseite mit «In den Warenkorb legen», 7 Bildern, ohne Fehlertext.
⚠️ Beobachtung: der ERSTE Abruf nach jedem `themeFilesUpsert` antwortet HTTP 500 (12 KB), danach 200 —
Theme-Neukompilierung, kein Dauerfehler (12/12 ok danach).

**Was noch übrig ist (3,75 MB gegen ~0,4 MB):** 17 Reihen × ~215 KB. Hebel der Reihe nach: (a) `max_products`
12 → 8 je Reihe (−⅓, Position 9–12 im Karussell sieht fast niemand — nicht gemessen, darum nicht gemacht);
(b) `checkmark-burst` 310 KB nur mit Umbau der Animation; (c) srcset je Bild ~1,6 KB × 583. Kopfzeile/Mega-Menü
219 KB (286 Links) ist Betreiberwunsch «alles sichtbar».

## 2. Vertrauens- und Conversion-Bausteine (GEMESSEN, Startseite · Produktseite)

Wo wir **vorne** liegen: TWINT + Rechnung/Klarna sichtbar (nur 3 von 10 Vergleichsshops zeigen beides), Versand-
schwelle im Klartext (nur fiveskincare sonst), 30 Tage Rückgabe (tarastyle, carpasus, fiveskincare ebenso), Sticky-
Kaufleiste, Breadcrumb, Accordion, Cross-Sell, Video auf der Startseite, 6 Zahlungslogos (Spanne 0–9).

Wo **andere** etwas haben, das wir nicht haben:
| Baustein | Vergleichsshops | luxestyle.ch | Bewertung |
|---|---|---|---|
| WhatsApp-Kontakt | 4/10 (tarastyle, yvy, fiveskincare, manor) | ✗ | Betreiber-Nummer nötig — Option |
| Live-Chat-Widget | 2/10 (carpasus, tarastyle) | ✗ | Shopify Inbox ist gratis — App-Installation = Betreiber-Klick |
| Telefon sichtbar | 1/10 (frei-form) | ✗ (nur Impressum) | kein Muster |
| Popup-Werkzeug fürs E-Mail-Einsammeln | 7/10 | ✗ (Eigenbau-Popup, seit 13.09. Scroll-Trigger) | Nachmessen 27.09. |
| Rabattcode im Klartext | **0/10** | WELCOME10 4× auf der Startseite | Bei allen zehn ist der Code die Gegenleistung fürs E-Mail — Betreiber-Entscheid |
| Bewertungszahl je Produkt sichtbar | tarastyle 1 | 0 auf der geprüften Karte | 14'915 CJ-Reviews importiert, Prio-Liste #47 läuft |

## 3. Quellen und Grenzen
- Rohtabellen: unten (Ausgabe des Werkzeugs, 14.09. 09:42 UTC). Produktseite je Shop = erster Produktlink der
  Startseite (bei tarastyle ein Service-Termin, bei nuvonda ein Gutschein — Struktur zählt, nicht das Produkt).
- Nicht gemessen: Ladezeit im Browser (nur HTML-Bytes), Bilder-Bytes, Conversion der anderen.


## Startseiten

| Kennzahl | luxestyle.ch | tarastyle.ch | alunir.ch | nikin.com | yvy.ch | carpasus.ch | moi-basics.com | nuvonda.ch | frei-form.ch | fiveskincare.ch | manor.ch |
|---|---|---|---|---|---|---|---|---|---|---|---|
| kb | 7082 | 819 | 446 | 848 | 921 | 1427 | 288 | 325 | 125 | 243 | 397 |
| scripts | 58 | 36 | 26 | 63 | 22 | 19 | 15 | 17 | 26 | 23 | 16 |
| inline_js_kb | 164 | 395 | 112 | 183 | 55 | 318 | 194 | 69 | 19 | 95 | 266 |
| style_kb | 91 | 19 | 39 | 75 | 61 | 29 | 17 | 20 | 65 | 24 | 4 |
| imgs | 1122 | 110 | 249 | 138 | 9 | 874 | 17 | 61 | 21 | 27 | 29 |
| nav_links_header | 286 | 237 | 110 | 111 | 576 | 536 | 10 | 0 | 11 | 0 | 15 |
| title_len | 64 | 10 | 53 | 61 | 72 | 63 | 49 | 74 | 71 | 48 | 55 |
| desc_len | 196 | 300 | 145 | 166 | 314 | 221 | 313 | 161 | 154 | 148 | 138 |
| h1_len | 9 | 10 | 0 | 38 | 0 | 0 | 10 | 51 | 4 | 13 | 0 |
| json_ld_product | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| gratis_schwelle | 50 | — | — | — | — | — | — | — | — | 50 | — |
| rueckgabe_tage | 30 | 30 | — | 20 | — | 30 | — | — | 14 | — | — |
| lieferzeit | 10–20 Werktage | VERSAND 30 TAGE | 1-2 Arbeitstagen | Versand ab € 100 20 Tage | — | — | — | — | 2-4 Arbeitstage | — | — |
| twint | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ | ✗ | ✔ | ✗ |
| rechnung | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| schweiz_signal | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✗ |
| bewertungen | ✔ | ✔ | ✔ | ✔ | ✗ | ✔ | ✔ | ✗ | ✗ | ✔ | ✗ |
| bewertungen_zahl | 0 | — | — | — | — | — | — | — | — | — | — |
| zahlungslogos | 6 | 0 | 7 | 1 | 9 | 3 | 8 | 8 | 0 | 7 | 1 |
| chat_widget | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ | ✗ | ✗ | ✗ | ✗ | ✗ |
| whatsapp | ✗ | ✔ | ✗ | ✗ | ✔ | ✗ | ✗ | ✗ | ✗ | ✔ | ✔ |
| telefon_sichtbar | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ | ✗ | ✗ |
| presse | ✔ | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ | ✗ | ✗ | ✔ | ✗ |
| newsletter | ✔ | ✔ | ✔ | ✗ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| popup_werkzeug | ✗ | ✔ | ✔ | ✔ | ✔ | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ |
| code_klartext | WELCOME10/WELCOME10/WELCOME10/WELCOME10 | — | — | — | — | — | — | — | — | — | — |
| sticky_atc | ✔ | ✗ | ✔ | ✔ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ |
| breadcrumb | ✔ | ✔ | ✗ | ✗ | ✔ | ✗ | ✗ | ✔ | ✔ | ✔ | ✔ |
| accordion | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✗ | ✔ | ✗ |
| cross_sell | ✔ | ✔ | ✔ | ✗ | ✔ | ✔ | ✗ | ✗ | ✗ | ✔ | ✔ |
| video | ✔ | ✗ | ✔ | ✗ | ✔ | ✔ | ✔ | ✗ | ✗ | ✗ | ✗ |
| instagram | ✔ | ✔ | ✗ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

## Produktseiten

| Kennzahl | luxestyle.ch | tarastyle.ch | alunir.ch | nikin.com | yvy.ch | carpasus.ch | moi-basics.com | nuvonda.ch | frei-form.ch | fiveskincare.ch | manor.ch |
|---|---|---|---|---|---|---|---|---|---|---|---|
| kb | 559 | 3278 | 558 | 703 | 987 | 979 | n/a | 304 | 136 | 315 | 312 |
| scripts | 64 | 39 | 26 | 72 | 34 | 22 | n/a | 17 | 31 | 23 | 20 |
| inline_js_kb | 121 | 2768 | 130 | 262 | 62 | 395 | n/a | 94 | 23 | 98 | 206 |
| style_kb | 74 | 36 | 49 | 81 | 61 | 28 | n/a | 22 | 64 | 23 | 2 |
| imgs | 39 | 37 | 291 | 84 | 29 | 728 | n/a | 14 | 22 | 28 | 30 |
| nav_links_header | 286 | 237 | 110 | 111 | 576 | 536 | n/a | 0 | 11 | 0 | 15 |
| title_len | 54 | 54 | 52 | 30 | 56 | 53 | n/a | 36 | 49 | 55 | 43 |
| desc_len | 105 | 179 | 147 | 135 | 324 | 67 | n/a | 330 | 233 | 154 | 136 |
| h1_len | 36 | 35 | 20 | 22 | 19 | 23 | n/a | 36 | 38 | 22 | 35 |
| json_ld_product | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✔ | ✔ | ✔ |
| gratis_schwelle | 50 | — | — | — | — | — | n/a | — | — | 50 | — |
| rueckgabe_tage | 30 | 30 | — | 20 | — | 30 | n/a | — | 14 | 30 | — |
| lieferzeit | 1–3 Werktage | 1-3 Werktagen | 1-2 Arbeitstagen | 2-3 Werktagen | — | — | n/a | — | 2-4 Arbeitstage | 2 Arbeitstage | 2-3 Arbeitstagen |
| twint | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ | n/a | ✗ | ✗ | ✔ | ✗ |
| rechnung | ✔ | ✗ | ✔ | ✗ | ✔ | ✗ | n/a | ✗ | ✗ | ✗ | ✗ |
| schweiz_signal | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✔ | ✔ | ✗ |
| bewertungen | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✗ | ✔ | ✗ |
| bewertungen_zahl | 0 | 1 | — | — | — | — | n/a | — | — | — | — |
| zahlungslogos | 6 | 0 | 7 | 1 | 9 | 3 | n/a | 8 | 0 | 7 | 3 |
| chat_widget | ✗ | ✔ | ✗ | ✗ | ✗ | ✔ | n/a | ✗ | ✗ | ✗ | ✗ |
| whatsapp | ✗ | ✔ | ✗ | ✗ | ✔ | ✗ | n/a | ✗ | ✗ | ✔ | ✔ |
| telefon_sichtbar | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | ✔ | ✗ | ✗ |
| presse | ✗ | ✔ | ✗ | ✔ | ✗ | ✔ | n/a | ✗ | ✗ | ✔ | ✗ |
| newsletter | ✔ | ✔ | ✔ | ✗ | ✔ | ✔ | n/a | ✔ | ✔ | ✔ | ✔ |
| popup_werkzeug | ✗ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✗ | ✔ | ✗ |
| code_klartext | WELCOME10/WELCOME10 | — | — | — | — | — | n/a | — | — | — | — |
| sticky_atc | ✔ | ✗ | ✔ | ✔ | ✔ | ✗ | n/a | ✔ | ✗ | ✗ | ✔ |
| breadcrumb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✔ | ✔ | ✔ |
| accordion | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✗ | ✔ | ✔ |
| cross_sell | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | n/a | ✔ | ✗ | ✔ | ✔ |
| video | ✗ | ✔ | ✗ | ✗ | ✔ | ✗ | n/a | ✗ | ✗ | ✗ | ✔ |
| instagram | ✔ | ✔ | ✗ | ✔ | ✔ | ✔ | n/a | ✔ | ✔ | ✔ | ✔ |

- luxestyle.ch: https://luxestyle.ch/products/outdoor-wireless-powerbank-mit-kabel-618100
- tarastyle.ch: https://www.tarastyle.ch/products/permanent-bracelet-anmeldung-fur-den-weekday-service
- alunir.ch: https://www.alunir.ch/products/adventskalender-2026
- nikin.com: https://nikin.com/products/treehoodie-light-taupe
- yvy.ch: https://yvy.ch/products/round-bag
- carpasus.ch: https://carpasus.ch/de/products/carpasus-collar-stays
- moi-basics.com: —
- nuvonda.ch: https://nuvonda.ch/products/digitaler-nuvonda-geschenk-gutschein
- frei-form.ch: https://www.frei-form.ch/produkt/chessy-antrazit-132cm-x-132cm/
- fiveskincare.ch: https://fiveskincare.ch/products/abschminkoel
- manor.ch: https://www.manor.ch/de/p/10004216380
