# Untersucher 1: Printfuls Embedded Design Maker (EDM) für LuxeStyle

Stand: 05.11.2026, Messungen 20:50 bis 21:05 UTC. Marken: GEMESSEN = selbst nachgemessen, QUELLE = Dokumentation/Dritte (Link, Abrufdatum 05.11.2026), Hypothese, unbekannt.
Nebenwirkungen meiner Tests: keine. Die Nonce-Anfragen wurden mit HTTP 403 abgelehnt (es entstand weder Nonce noch Vorlage), Mockup-Aufgaben 0 von 6 benutzt, kein Auftrag, kein Shopify-Schreiben. Der Schlüssel steht in keiner Datei und in keinem Bericht.

## 0. Kurzfassung

**Empfehlung: EDM NEIN als Weg für diese Aufgabe. Nicht planbar, weil es ihn für uns heute nicht gibt (Zugang) und weil unser Schlüssel ihn technisch nicht ansprechen kann.** Nur ein 2-Minuten-Test des Besitzers bleibt sinnvoll (Abschnitt 8). Der Editor «wie in echt Printful» muss mit v6 selbst gebaut werden; die EDM-Dokumentation liefert dafür eine brauchbare Vorbildliste (Abschnitt 9).

Die fünf harten Befunde:

1. **Zugang nur über Printful Enterprise.** Die EDM-Doku beginnt mit «Before you can access the Embedded Design Maker (EDM) functionality, you must first request access through our enterprise form» (QUELLE developers.printful.com/docs/edm/). Printfuls Hilfeartikel «What is Printful Enterprise?»: «If you're an existing Printful merchant with at least $20,000 in monthly sales, you may qualify for Enterprise benefits» (QUELLE help.printful.com/hc/en-us/articles/50265711945361). Unser Shop: CHF 377.81 Umsatz in 30 Tagen (CLAUDE.md 03.11., alle Quellen zusammen, nicht nur Druckware), grob 2 % der Schwelle (Rechnung mit 1 USD ≈ 0.8 CHF, Annahme). Ob EDM-Zugang genau an diese Schwelle gebunden ist, steht nirgends (unbekannt); die Enterprise-Seite nennt EDM «BETA» (Seite undatiert).
2. **Unser Schlüssel kann es nicht (GEMESSEN).** `POST /embedded-designer/nonces` liefert HTTP 403 «This endpoint requires any of the following scopes granted: product_templates/write!». Der Schlüssel ist ein Store-Token mit nur `orders`, `sync_products`, `file_library`, `webhooks` (je mit `/read`). Die Scopes `product_templates*` gibt es laut Doku nur für Account-Tokens. Nötig wäre ein neuer Account-Token mit der Erweiterung «Embedded Design Maker» (Developer Portal).
3. **Der Printful-Store ist vom Typ «shopify», nicht «Manual Order / API» (GEMESSEN, widerspricht der Aufgabenbeschreibung).** `GET /stores` meldet `{"id":18288470,"name":"LuxeStyle","type":"shopify"}`; `GET /store/products` antwortet HTTP 400 «This API endpoint applies only to Printful stores based on the Manual Order / API platform»; `GET /sync/products` zeigt 87 773 gespiegelte Shop-Produkte (alle `synced: 0`, Printfuls Shopify-App spiegelt unseren ganzen Katalog). Der EDM-Schritt «Create sync product (`source: edm`)» ist laut Doku ein `/store/products`-Aufruf und damit für diesen Store nicht verfügbar. Ob «Bestellung aus Vorlage» (`POST /orders` mit `external_product_id`) an einem Shopify-Store läuft, ist undokumentiert und ohne Vorlage nicht testbar.
4. **Kosten und Bedingungen sind nirgends öffentlich** (kein Preis in Doku, Seite, Hilfe): unbekannt. Alles läuft über das Kontaktformular der Enterprise-Seite.
5. **Selbst bei Zugang bleibt Arbeit am Bestellweg und an der Preislogik** (Abschnitt 4 und 5), und Daten der Kundinnen liegen bei Printful (Abschnitt 6).

## 1. Was ist der EDM?

QUELLE: https://developers.printful.com/docs/edm/ (Abruf 05.11.2026; Dokuversion im Kopf «1.8.0», jüngster Changelog-Eintrag 1.9.1 vom 30.04.2025, also 6 Monate alt) und https://www.printful.com/enterprise/embedded-design-maker (Abruf 05.11.2026).

- Ein von Printful gehosteter Design Maker in einem iframe. Die Seite lädt `https://files.cdn.printful.com/embed/embed.js` (GEMESSEN: 6 990 Byte, HTTP 200, Cloudflare-Cache «HIT», zuletzt geändert 07.05.2025), das Skript legt eine iframe-Adresse `https://www.printful.com/embedded-designer?nonce=<Nonce>&locale=<Sprache>` an und spricht per `postMessage` mit ihr. Es prüft den Absender (`origin` = `https://www.printful.com`).
- Marketing: «white-label software», «599 premium products» (Printful-Seiten, undatiert). GEMESSEN: `GET /products` liefert 577 Produkte (0 `is_discontinued`), identisch mit den 577 Modell-Nummern unserer Inventur (0 nur im API, 0 nur bei uns). Die Zahl 599 ist nicht nachvollziehbar (Marketingzahl).
- **Nicht zu verwechseln:** Printfuls «Shopify Embedded Design Maker» (Blog 08.01.2026, https://www.printful.com/blog/shopify-embedded-product-creation) ist die Produktanlage der HÄNDLERIN im Shopify-Admin (Printful-App → «Create product»). Er ist für Kundinnen im Shop nicht gedacht und nicht einbettbar.
- Ebenfalls nicht dasselbe: Printfuls «Personalization» für Shopify (Hilfe https://help.printful.com/hc/en-us/articles/50264216563345): nur Textfelder, Printful liefert keine Eingabe im Shop («Printful doesn't provide a built-in way for customers to submit personalization details»), Bestellung kommt als Entwurf «Requires personalization», Text wird von Hand nachgetragen. Das ist kein Editor.

### Funktionen laut EDM-Doku (QUELLE)

| Bereich | Belegt in der EDM-Doku | Hinweis |
|---|---|---|
| Ebenen | Datei-Ebenen («Choose file»), Text-Ebenen, Clipart-Ebenen, je einzeln abschaltbar (`featureConfig.file_layers/text_layers/clipart_layers`); bis 5 Datei-Ebenen je Platzierung | Hochladen im Editor; zusätzlich Bild per Adresse (`setUrlImageLayer`, PNG/JPG, bis 50 MB, 15 000 px Empfehlung) |
| Platzierungen | alle Platzierungen des Produkts als Reiter; einzelne abschaltbar (`disabledPlacements`); `embroidery_large_center` bleibt immer verdeckt | Preis je Platzierung im Reiter (`showPricesInPlacementsTabs`) |
| Varianten | Farben und Grössen mehrfach wählbar; auf eine Farbe/eine Grösse begrenzbar (`allowOnlyOneColorToBeSelected`, `allowOnlyOneSizeToBeSelected`, «useful for using EDM as an order creation tool»); Vorauswahl und Sperre per Namen | Auswahl kommt als `selectedVariantIds` zurück |
| Stickerei/Optionen | Garnfarben, 3D-Puff, Untertechnik-Umschalter, `preselectedProductOptions` (`stitchColor`, `insidePocket`, `customBorderColor`) | Technik muss VOR dem Öffnen feststehen: «the technique picker is not available in the EDM» |
| Prüfung | `onDesignStatusUpdate` mit `designValid` und `errors[]` (Speichern gesperrt bei Fehlern), Modal-Variante (`useUserConfirmationErrors`), «This product isn't available»-Sperrseite, Liste nicht lieferbarer Varianten | dpi-Warnungen sind nicht ausdrücklich genannt (unbekannt, ob in `errors`) |
| Preis | Live-Preis je Variante und Platzierung (`onPricingStatusUpdate`), Währungen u. a. CHF, EUR, USD | Es ist Printfuls Preis, nicht unser Verkaufspreis |
| Sprache | `locale`: `en_US`, `it_IT`, `fr_FR`, `es_ES`, **`de_DE`**, `ja_JP`; übersetzt Oberfläche, Warnungen und Fehler | Deutsch ist vorhanden (de_DE, nicht de_CH) |
| Aussehen | CSS-Variablen (`--pf-sys-*`, `--pf-comp-*`), Navigations-Icons, Randradius; Mobil-Kopf/-Fuss als eigene Tokens (also Handy-Layout vorhanden) | Nicht änderbar: Lade-Spinner, Cliparts, SVG-Leerbilder; «works best with a light theme» |
| Vorschau | Abschnitt «Mockup view» (Changelog 1.8.1); Mockups per `POST /mockup-generator/create-task/{id}` mit `product_template_id` | Mockup-Adressen sind temporär |
| Dateibibliothek | eigene Bibliothek möglich (`custom_external_file_library` + `onFilePickerRequested`), frühere Dateien der Kundin nur mit `external_customer_id` | |

Aus dem Dashboard-Design-Maker (Blog https://www.printful.com/blog/design-maker-features, Abruf 05.11.2026) sind Hintergrund-Entferner, Mustergenerator, Quick Designs, Zoom/Raster und KI-Hochskalierung bekannt; **ob der EDM sie enthält, steht in der EDM-Doku nicht (unbekannt).** Die Enterprise-Seite erwähnt «AI tools that automatically upscale graphics».

## 2. Voraussetzungen (QUELLE + GEMESSEN)

| Frage | Befund |
|---|---|
| Freischaltung | Ja, nötig: Anfrage über das Enterprise-Formular (Name, E-Mail, Telefon, Website). Kein Selbstbedienungsweg in der Doku. |
| Plan/Schwelle | Enterprise-Hilfe: ab «$20,000 in monthly sales» «may qualify». EDM-Preis: unbekannt. |
| Token | «To work with Embedded Design Maker, you will need at least one token with "Embedded Designer" extension.» Die Extension stellt Zugriffsstufe und Scopes selbst ein. Zwei Tokens: einer «development purposes only», einer für Produktion. Scopes sind nach dem Anlegen nicht änderbar. |
| Domain | Im Developer Portal die erlaubten Domains eintragen («Printful will only listen to messages that come from your domain names»). Für uns: luxestyle.ch, ggf. au3j0y-hq.myshopify.com. |
| Store-Typ | Die Doku nennt keine Pflicht; ihr Beispielfluss nutzt `/store/products` (nur Manual Order/API) und `X-PF-Store-Id`. Unser Store: `shopify` (GEMESSEN). |
| Serverseite | Nonce nur vom Server holen («should be done from the back-end, to not expose the access token»). Bei uns heisst das ein Cloudflare Worker (oder Shopify-App-Proxy); heute gibt es keinen solchen Aufruf. |
| Shop-Seite | GEMESSEN 05.11.2026: luxestyle.ch sendet `content-security-policy: block-all-mixed-content; frame-ancestors 'none'; upgrade-insecure-requests` und `x-frame-options: DENY`. Das sperrt nur das Einbetten UNSERER Seite in fremde Seiten; Skript von files.cdn.printful.com und iframe von www.printful.com werden dadurch nicht blockiert (kein `script-src`/`frame-src`/`default-src`). |

## 3. API-Tests mit unserem Schlüssel (wörtlich, 05.11.2026 ca. 20:55 bis 21:03 UTC, ohne Schlüssel)

| Aufruf | HTTP | Antwort (gekürzt, wörtlich) |
|---|---|---|
| `GET /oauth/scopes` | 200 | Scopes: `orders/read`, `sync_products/read`, `orders`, `sync_products`, `file_library/read`, `file_library`, `webhooks/read`, `webhooks`; Anzeigename «… of the authorized store» (= Store-Token) |
| `GET /stores` | 200 | `{"id":18288470,"name":"LuxeStyle","type":"shopify"}`, `paging.total` 1 |
| `POST /embedded-designer/nonces` Body `{"external_product_id":"edm-probe-20261105-a"}` mit Header `X-PF-Store-Id` | **403** | `{"code":403,"result":"This endpoint requires any of the following scopes granted: product_templates/write!","error":{"reason":403,"message":"This endpoint requires any of the following scopes granted: product_templates/write!"}}` |
| dasselbe ohne `X-PF-Store-Id`, Body `…-b` | **403** | gleicher Text |
| `GET /product-templates?limit=5` | **403** | «This endpoint requires any of the following scopes granted: product_templates/read!» |
| `GET /store/products?limit=3` | **400** | «This API endpoint applies only to Printful stores based on the Manual Order / API platform. Find out more at Printful API docs.» |
| `GET /store` | 403 | «… scopes granted: stores_list/read!» |
| `GET /sync/products?limit=5` | 200 | `paging.total` **87773**, Einträge `synced: 0` (spiegelt den Shop) |
| `GET /products` | 200 | 577 Produkte, 0 eingestellt, Typen u. a. T-SHIRT 164, CUT-SEW 115, EMBROIDERY 74, SUBLIMATION 44, DTFILM 41 |
| `GET /orders?limit=1` ohne `X-PF-Store-Id` und mit fremder Store-Nummer | 200 / 200 | beide Male Store 18288470: Header wird ignoriert, Token ist an den Store gebunden |
| `GET https://www.printful.com/embedded-designer?nonce=invalid…&locale=de_DE` | **401** | HTML «Error occurred – Something went wrong on our side»; setzt 6 Cookies (`_session`, `dsr_setting`, `_pf_c`, `_pf_cp`, `_csrf`, `__cf_bm`, teils `SameSite=None`), kein `X-Frame-Options`/CSP-Frame-Kopf auf dieser Fehlerseite. Die echte Editor-Seite wurde nicht geladen (kein gültiger Nonce): Gewicht, Cookies und Tracker des echten Editors = unbekannt. |

Lesart: Der Nonce-Weg ist am Schlüssel gescheitert, nicht an der Anfrage. Die Doku verlangt dort «token extension `embedded_designer`», die Maschine nennt `product_templates/write`; beides hängt zusammen (die Extension setzt Scopes automatisch). Wir haben also keinen Hinweis darauf, dass der Zugang bei Printful für uns schon aktiviert ist.

## 4. Vom Design in den Warenkorb und zum Printful-Auftrag (QUELLE, abgeleitet)

Dokumentierter Ablauf (Docs «Embedded Designer integration», «Example flow»):

1. Seite öffnet sich, Server ruft `POST /embedded-designer/nonces` mit `external_product_id` (frei von uns vergeben, eindeutig je Entwurf), optional `external_customer_id`, `ip_address`, `user_agent` (bindet den Nonce). Nonce gilt zunächst 6 Stunden, wird bei Benutzung verlängert; ein neuer Nonce für dieselbe `external_product_id` macht den alten ungültig; **Speichern macht den Nonce ungültig** (zum Weiterbearbeiten neuer Nonce).
2. `new PFDesignMaker({elemId, nonce, externalProductId, initProduct:{productId}, locale:'de_DE', onTemplateSaved, onDesignStatusUpdate, …})`; Speichern per `sendMessage({event:'saveDesign'})`; `onTemplateSaved(templateId)` liefert die Printful-Vorlagen-Nummer.
3. `GET /product-templates/{id}` oder `/@{external_product_id}` liefert `product_id`, `available_variant_ids`, Farben, Grössen, Platzierungen mit Technik.
4. Optional Vorschau: `POST /mockup-generator/create-task/{product_id}` mit `product_template_id` und `variant_ids`, dann `GET /mockup-generator/task?task_key=…`; Ergebnis: `mockups[].mockup_url` (temporär) und `printfiles[].url`.
5. Bestellung: `POST /orders` mit `items[{variant_id, quantity, product_template_id | external_product_id}]` (keine Dateien nötig). Sind die Druckdateien der Vorlage noch nicht fertig, setzt Printful den Auftrag auf `onhold` und danach selbst auf `draft`; dann muss `POST /orders/{id}/confirm` folgen.
6. Aufräumen: `DELETE /product-templates/@{external_product_id}` (Scope `product_templates`).

Was das für UNSEREN Weg heisst (Warenkorb-Eigenschaften, `printful_sync.mjs`):

| Heute (v5/v6, Cloudinary-Datei als Zeilen-Eigenschaft) | Mit EDM |
|---|---|
| Eigenschaft `🖼️ Druckdatei (<Platzierung>)` = https-Adresse, Sync prüft Host-Liste, Auflösung, Konflikte | Eigenschaften `_pf_template_id` (Zahl) und `_pf_external_product_id`; keine Datei, kein Host, keine eigene Auflösungsprüfung (Printful prüft selbst; Prüfergebnis für uns nicht einsehbar) |
| Sync legt `POST /orders` mit `items[].files` an | Sync legt `POST /orders` mit `items[].product_template_id` an; zusätzlich `onhold`→`draft`→Bestätigen abfangen (neuer Zustand, neue Wartezeit) |
| SKU `<Modell>_<Variante>` im Shop bestimmt die Printful-Variante | Die Variante kommt aus `selectedVariantIds` (mit `allowOnlyOne…` genau eine); Shopify-Variante und Printful-Variante müssen zusammenpassen, sonst falsche Ware: Prüfung nötig |
| Kosten-Wächter gegen Shop-Erlös | derselbe, plus Zuschlag je Platzierung/Technik (z. B. Rückseite laut Printful +5.95 USD) |

Grenzen, die jeden Bau treffen:
- **Preis:** Der Shop-Preis steht vor dem Entwurf fest (Shopify-Variante). Der EDM zeigt Printfuls Preis je Variante und Platzierung (`onPricingStatusUpdate`), aber Shopify kennt keinen freien Zeilenpreis ohne Zusatzmittel (Funktion/Zusatzartikel). Zuschläge für Rückseite/Ärmel müssten als Shopify-Zusatzartikel oder feste Varianten abgebildet werden. Das ist beim eigenen Editor dasselbe Problem.
- **Vorschau «auf dem Produkt»:** nur über Mockup-Aufgabe (asynchron). Ratenbegrenzung laut Doku «Mockup Generator API task creation: 2–10 Anfragen pro Minute» (QUELLE https://developers.printful.com/docs/#tag/Rate-Limiting, einzeln vereinbarte höhere Grenzen möglich). Bei mehreren gleichzeitigen Kundinnen ist das der Engpass; der EDM-Editor selbst zeigt seine eigene Vorschau ohne unsere Aufgabe.
- **Sichtbarkeit:** «Templates created with EDM are not visible in https://printful.com dashboard». Bei Problemen sehen wir den Entwurf nur über die API (Mockup), nicht im Printful-Konto.
- **Vorlagen aus dem Dashboard** lassen sich im EDM nicht öffnen und umgekehrt.

## 5. Welche der 537 bestellbaren Modelle wären gestaltbar?

Die Doku nennt KEINE Produktliste und keine Ausschlussliste (unbekannt). `initProduct.productId` ist die Katalog-Nummer, also dieselbe wie `modelle.json` (GEMESSEN: 577 = 577). Eigene Zählung der dokumentierten Einschränkungen auf den 537 CH-bestellbaren Modellen (Auswertung der Rohdaten `sg/katalog/<id>.json`, GEMESSEN 05.11.2026):

- **Keines der 537 lässt sich aus der Doku heraus ausschliessen.** «Jewelry not supported via API»: keine Schmuck-Typen im Katalog.
- **50 Modelle haben mehr als eine Technik-Familie** (Direktdruck + Stickerei 23, Direktdruck + DTF 16, alle drei 9, DTF + Stickerei 2; Typen: T-SHIRT 42, EMBROIDERY 6, DTFILM 2). Weil der EDM die Technik nicht wählen lässt, müsste sie je Shopprodukt vor dem Öffnen festgelegt werden (`initProduct.technique`), also ein Shopprodukt je Technik.
- **9 Modelle** haben die Platzierung `embroidery_large_center`, die der EDM immer verdeckt (bei keinem ist sie die einzige).
- Nach unserer Klasse (CH-Rate vorhanden): FLACH 266, FLACH_MIT_HINWEIS 141, PANEL 130. Wie der EDM Schnittteil-/Panel-Produkte (CUT-SEW 114, SUBLIMATION 42, DIRECT-TO-FABRIC 21 unter den bestellbaren) bei Mehrfach-Ansichten bedient, ist unbekannt (Docs nennen nur Socken und Beutel mit `forceOrientation`; bei uns bestellbar: 3 Socken-, 8 Beutel-Modelle).
- Der EDM zeigt selbst «This product isn't available», wenn keine Variante lieferbar ist (Doku); unsere Ausblendliste `ausblenden.json` (40 Modelle) bleibt daneben nötig.

## 6. Kosten, Lizenz, Datenschutz, Technik, Risiko

| Punkt | Befund |
|---|---|
| Kosten EDM | unbekannt; kein Preis in Doku/Seiten. Enterprise-Kontakt. Hypothese: individuell verhandelt. |
| Kosten Druckware | wie bisher (Printful-Katalogpreis plus Zuschläge je Platzierung/Technik). Stickerei: Digitalisierungsgebühr «$3.95 per file» für Text, «$6.50» sonst (QUELLE Blog design-maker-features, Abruf 05.11.2026), fällt bei jedem Weg an. |
| Branding | Werbung als «white-label», Farben/Radius über CSS-Variablen änderbar; Spinner, Cliparts, Illustrationen nicht. Die iframe-Adresse zeigt printful.com; `embed.js` schreibt Adresse und Ereignisse in die Browser-Konsole (GEMESSEN im Quelltext). Fehlerseiten tragen Printful-Marke (GEMESSEN). |
| Lizenzen | Clipart: «over 50 clipart collections and nearly 3,000 individual graphics available for free» (Blog), Hintergrund-Entferner auch für Getty-Bilder. Antworten der Plattform tragen die Felder `contains_licensed_assets` und `contains_pro_content` (Doku «Create sync product»); was das für Kundinnen-Designs mit Clipart heisst, ist unbekannt. Markenrechte an hochgeladenen Bildern der Kundinnen: unsere AGB-Frage wie beim eigenen Editor. |
| Datenschutz | Uploads und Texte der Kundinnen liegen bei Printful (US-Firma; «Printful Enterprise is operated and provided by Printify, Inc.», Fusszeile der Enterprise-Seiten) schon VOR dem Kauf, auch bei Nichtkäuferinnen; `external_customer_id`, `ip_address`, `user_agent` sind freiwillig und sollten weggelassen werden. Aufbewahrungsdauer: unbekannt; Löschen nur per API (`DELETE /product-templates/@…`). Beim aktuellen Weg gehen Dateien an Cloudinary (auch Dritte), Printful erhält sie erst bei der Bestellung. Auftragsverarbeitung/DSG: ohne Vertrag mit Printful nicht entscheidbar. |
| Ladezeit | Lader 6,99 KB (GEMESSEN). Der Editor selbst ist ein ganzes Printful-App-Fenster; Gewicht unbekannt (ohne gültigen Nonce nicht messbar). |
| Mobilbedienung | Handy-Layout vorhanden (eigene Mobil-Tokens für Kopf, Fuss, Navigation; QUELLE). Bedienqualität auf dem Handy: unbekannt. |
| Drittanbieter-Cookies | Printful setzt auf der Fehlerseite 6 Cookies mit `SameSite=None` (GEMESSEN); Verhalten bei blockierten Drittanbieter-Cookies (Safari, Brave) im echten Editor: unbekannt. Bei uns wäre ein Cookie-Hinweis-Eintrag nötig. |
| Abhängigkeit/Ausfall | Fällt Printfuls Editor oder die Nonce-Anfrage aus, kann niemand gestalten. Absicherung nur mit eigenem Rückfall (v6/v5 behalten). Doku zuletzt 30.04.2025, Lader 07.05.2025; Enterprise-Seite nennt «BETA». |
| Mehrfenster | Neuer Nonce für dieselbe `external_product_id` macht den alten ungültig: zwei offene Tabs derselben Kundin stören sich, wenn die ID nicht je Sitzung eindeutig ist. |

## 7. Blocker (in der Reihenfolge der Schwere)

1. **Zugang:** Enterprise-Anfrage nötig; Hinweis auf 20 000 USD Monatsumsatz; unser Umsatz weit darunter; Ergebnis und Frist: unbekannt.
2. **Token:** aktueller Schlüssel Store-Token ohne `product_templates*` → 403; nötig ist ein neuer Account-Token mit der Erweiterung «Embedded Design Maker». Ob die Erweiterung im Portal für uns überhaupt sichtbar ist: unbekannt (Anmeldung am Developer Portal nötig, nicht Teil meines Zugangs).
3. **Store-Typ `shopify`:** Aufgabenbeschreibung «Manual Order / API» ist falsch; der dokumentierte Sync-Schritt entfällt, Bestellung aus Vorlage am Shopify-Store ungeprüft.
4. **Keine Preisauskunft, kein Vertrag/Datenschutzdokument:** Entscheidung über Kosten und Datenschutz nicht möglich.
5. **Preislogik/Bestellweg:** Zuschläge je Platzierung, Variantenabgleich, `onhold`→`draft`, Mockup-Rate 2 bis 10 je Minute. Das ist lösbar, aber nicht in einem Zug und nicht ohne Zugang prüfbar.

## 8. Empfehlung und kleinster nützlicher nächster Schritt

- **EDM: nein.** Weder Zeitplan noch Kosten lassen sich planen; keine Zusage von Printful.
- **Kostenloser Test durch den Besitzer (2 Minuten):** auf https://developers.printful.com/tokens/add-new-token (Anmeldung mit dem Printful-Konto) nachsehen, ob unter «Extensions» das Kästchen «Embedded Design Maker» wählbar ist. Wenn ja: Entwicklungs-Token («development purposes only») anlegen, Domain luxestyle.ch eintragen, dann kann ich in einem Durchgang die Nonce-Anlage testen und eine Wegwerf-Seite (`?view=edm`, nur Entwurf-Theme) mit einem T-Shirt bauen; Abbruchkriterien: Editor lädt auf dem Handy in unter 5 s, Vorlage speichert, `GET /product-templates/@…` antwortet. Wenn nein: Thema geschlossen.
- **Optional, ohne Erwartung:** das Enterprise-Formular ausfüllen (Website luxestyle.ch, Frage: Zugang für ein Shopify-Geschäft unter der Schwelle, Preise, Store-Typ Shopify, Datenverarbeitungsvertrag). Nicht darauf warten.
- **Weg für «Editor wie in echt Printful»:** v6 weiterbauen und die Vorbildliste unten abarbeiten; die Bestellkette (printful_sync) braucht dafür keinen EDM.

## 9. Vorbildliste für Editor v6 (aus der EDM-Doku, damit der eigene Editor Printful so nahe wie möglich kommt)

1. Platzierungen als Reiter mit Preis-Zuschlag je Reiter (`showPricesInPlacementsTabs`) und Sperre zusammenpassender Platzierungen (unser Katalog hat `conflicting_placements`).
2. Seitenleiste: Produkt (Farbe, Grösse), Datei, Text, Clipart, Ebenen; Ebenenreihenfolge, Duplizieren, Spiegeln, Drehen, Zuschneiden; Zoom und Raster der Druckfläche.
3. Text: Schrift, Grösse, Farbe, Buchstabenabstand, Kontur, Schatten, Bogen (Dashboard-Design-Maker, QUELLE Blog).
4. Gültigkeit mit Fehlerliste (`designValid`/`errors`): Speichern/In-den-Warenkorb gesperrt, bis Fehler behoben (zu kleine Auflösung, Design ausserhalb der Fläche, Pflichtoptionen wie Garnfarbe).
5. Modus «eine Farbe, eine Grösse» für den Kaufvorgang (`allowOnlyOne…`) und Liste nicht lieferbarer Varianten.
6. Live-Preis je Variante/Platzierung, aber mit unserem Verkaufspreis (CHF) statt Printfuls USD-Preis.
7. Sprache `de_DE`, ohne englische Reste; Handy mit Kopf-/Fusszeile eigener Bedienleiste.
8. Vorschau als «Mockup view»: bei uns über die Mockup-Aufgabe oder die vorhandenen Katalog-Vorlagenbilder; Rate beachten (2 bis 10 je Minute).
9. Optionen für Stickerei (Garnfarben, 3D-Puff) und Technik-Festlegung je Shopprodukt (50 Modelle mit mehreren Techniken).

## 10. Quellen (Abruf 05.11.2026)

- https://developers.printful.com/docs/edm/ (EDM-Doku, vollständig gelesen: Einleitung, Token, Nonce, embed.js, Datenstrukturen, Funktionen, Vorlagen-API, Beispielfluss, Changelog)
- https://developers.printful.com/docs/ (v1-Doku: Scopes, Kundentypen, Ratenbegrenzung, Products API, Basic use cases «Embedded Designer integration»)
- https://www.printful.com/enterprise/embedded-design-maker und https://www.printful.com/enterprise/product-customization
- https://help.printful.com/hc/en-us/articles/50265711945361-What-is-Printful-Enterprise und …/50265712057745-How-does-Printful-Enterprise-work
- https://help.printful.com/hc/en-us/articles/50264216563345-How-does-Printful-s-personalization-feature-for-Shopify-work
- https://www.printful.com/blog/shopify-embedded-product-creation (08.01.2026) und die Pressemitteilung dazu (https://www.tennessean.com/press-release/story/130791/…)
- https://www.printful.com/blog/design-maker-features
- Eigene Messungen: Rohdateien in /tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/edm/ (`edm_docs.md`, `api_docs_v1.md`, `embed.js`, `products.json`, `orderable_types.json`)
