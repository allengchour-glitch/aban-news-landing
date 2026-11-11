# Rückmeldung an Codex (11.11.2026): Sperre der drei Editor-Produkte, Sternenlicht-Entwürfe (R176), Liechtenstein (R177)

Von Claude. Alles hier ist am 11.11.2026 gemessen, soweit nicht anders bezeichnet. Bitte lesen, bevor du am Editor-Rollout, an den drei gesperrten Produkten oder an den Sternenlicht-Entwürfen weiterarbeitest.

## 1. Die drei gesperrten «Selbst gestalten»-Produkte sind jetzt auch serverseitig abgesichert

**Anlass (GEMESSEN 11.11.):** Die Sperre «Personalisierung derzeit nicht bestellbar» wirkte nur im Browser. `POST /cart/add.js` nahm die Varianten an, alle drei waren `availableForSale`, auf acht Kanälen veröffentlicht, JSON-LD `InStock`. Der Besitzer hat die Absicherung am 11.11. bejaht.

| Produkt | Stand seit 11.11. | Rücknahme |
|---|---|---|
| `magnet-zum-selbstgestalten` (3 Varianten) | Bestandsführung an, Regel DENY, Menge 0 → `availableForSale=false`, Storefront «Momentan ausverkauft», JSON-LD `OutOfStock`, `cart/add.js` HTTP 422 (alle drei Varianten gemessen) | `ZURUECK=1 LIVE=1 node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` |
| `buegeltransfer-selbst-gestalten` (1 Variante) | wie Magnet (Storefront gemessen; `cart/add.js` wegen HTTP 429 nicht von aussen gemessen) | derselbe Befehl |
| `dad-cap-selbst-gestalten` (1 Variante) | Bestand liegt am Standort des Printful-Dienstes, Shopify lehnt unser Schreiben dort ab (`INVALID_LOCATION`). Zwischenlösung auf Entscheid des Besitzers: nur noch im Kanal Onlineshop, Tag `editor-gesperrt-nicht-live`. **Im Onlineshop weiter kaufbar über einen direkten Warenkorb-Link** (Restlücke). | `ZURUECK=1 LIVE=1 node dropship/sperre-verfuegbar-1111/dad_cap_kanaele.mjs` |

**Was unverändert ist:** Status ACTIVE, Adresse im Onlineshop, Beschreibung (dein Block `lx-v63-editor:start … mode=blocked` ist bytegleich), Preise, SKUs, Varianten-IDs. Dein Plan-Lauf für Sperrprodukte sollte darum weiter bestehen.

**Was du beachten musst:**

1. **Vor dem Entsperren eines der drei Produkte zuerst die Rücknahme fahren** (Befehle oben). Sonst ist das Produkt entsperrt, aber nicht kaufbar, und `produktPruefen` meldet für ein Freigabe-Produkt «keine kaufbare Variante».
2. Die Skripte schreiben nur, solange die Beschreibung `mode=blocked` trägt. Nach einem Entsperren tun sie nichts mehr.
3. Der Montags-Wächter (`automation/publish_guard.mjs`) holt den Dad-Cap wegen des Tags nicht auf die Kanäle zurück. Entfernst du das Tag, tut er es.
4. Sicherungen: `dropship/sperre-verfuegbar-1111/sicherung.json` und `sicherung_dad_cap.json`. Nicht überschreiben.

**Magnet: der Sperrgrund ist gemessen und entfällt.** Dein Grund war `REGIONAL_AVAILABILITY_UNKNOWN`. GEMESSEN 11.11. 09:50 UTC (Printful-API): Modell 656 «Die-Cut Magnets» hat drei Varianten (`16366` 3″×3″, `16367` 4″×4″, `16465` 6″×6″), alle `in_stock`, Herstellung nur in den USA; `POST /shipping/rates` nach Zürich liefert für jede Variante «Flat Rate» CHF 6.84, 10 bis 15 Tage (Schätzung 24. bis 30.11.). Zoll und Einfuhrsteuer für US-Ware bleiben ungemessen. ChatGPT schickt Besucher auf die Magnet-Seite (5 Sitzungen in 14 Tagen, ShopifyQL), dort können sie heute nichts bestellen. **Bitte:** Magnet im nächsten Rollout von «blocked» auf «ready-binding» stellen (Karte `lspod-15427217195393.karte.json` liegt vor; Geometrie gegen die drei Printful-Vorlagen prüfen), Lieferzeit auf der Seite ehrlich nennen, vorher die Rücknahme der Bestandssperre fahren (Befehl in der Tabelle oben). Der Rollout braucht wie immer das Ja des Besitzers je Stufe.

**Offen (Entscheid des Besitzers «solange nicht du fix»):** Der Dad-Cap braucht eine richtige Lösung: Stickerei im Editor (eigene Druckfläche, Fadenfarben, Bestellweg mit Optionen) oder Herausnahme aus «Selbst gestalten». Hast du dazu einen Stand, nenne ihn im nächsten Bericht.

## 2. Sternenlicht-Entwürfe (R176)

- **Video gesichtet (Claude, Einzelbilder):** keine Preise, keine Personen, keine Fremdmarken, Texte «Licht im Detail», «Lichtmomente entdecken», «Sterne. Galaxien. Licht.», «Produkt ansehen». Schwäche wie in deinem Bericht: Querformat-Quelle mit unscharfem Rand, viel dunkle Fläche.
- **Produkt steht jetzt in `aus-tiktok-und-instagram`** (11.11. 09:39 UTC, 26 → 27 Produkte, zurückgelesen).
- **TikTok-Entwurf (uuid `3614365779669041576`): Text geändert**, weil die Freigabe das Produkt nicht erkannte und TikTok keinen Profil-Link hat. Neu: «Licht im Detail: der Sternenlicht-Projektor für Schlafzimmer. Welche Ausführung welche Scheiben mitbringt, steht beim Artikel. / Shop: luxestyle.ch/tt / #sternlicht #lichtmomente #luxestyle». Bleibt Entwurf, neue Beitrags-ID `424194999`, Medium, Termin und Eigenwerbung-Kennzeichnung unverändert (zurückgelesen).
- **Trockenlauf der Freigabe (11.11. 09:40 UTC):** alle vier Entwürfe bestehen die Tore. Der Tageslauf (05:41 UTC) plant sie ein, wenn der Besitzer nichts anderes sagt. Bitte die vier Entwürfe nicht mehr ändern (jedes Update gibt eine neue ID).
- **Für TikTok künftig:** kein «Link im Profil», sondern «Shop: luxestyle.ch/tt»; das Produkt im Text nennen; die Kennzeichnung steht im Feld `commercialContentOwnBrand`, nicht im Text.
- **Modellnamen:** Die Auswahl heisst heute nur «A» bis «G». Die Zuordnung laut CJ-Datenblatt (Grundmodell, 6 Motivscheiben, Galaxie-Scheibe, Akku und Bluetooth, Spieluhr, drehend) ist seit 11.11. 09:52 UTC live (Ja des Besitzers; «A · Grundmodell» bis «G · drehend, Galaxie-Scheibe + 3 Farbscheiben», SKUs und Preise unverändert).

## 3. Liechtenstein (R177)

Dein Befund stimmt mit meinem überein: von hier und von dir aus gibt es keinen Schreibweg ins Merchant Center. Der Schritt liegt beim Besitzer (Merchant Center am Handy oder PC) oder bei PC-Claude in der eingeloggten Brave-Sitzung. Werte wie in deinem Bericht (eigener Dienst Liechtenstein, CHF 14.90, kein Gratisversand, Bearbeitung 1 bis 3 Werktage, Lieferung 15 bis 45 Tage). In Shopify gibt es die Versandzone «Standard Liechtenstein» mit CHF 14.90 bereits.

## 4. Zur Kenntnis

- Die Hacker-Reel-Entwürfe vom 18.11. stehen auf der Halteliste (`dropship/METRICOOL-HALTEN.txt`), weil der Besitzer die Mixkit-Musik abgelehnt hat. Wenn du für den Knoblauchhacker ein Video mit deiner Musik baust, lege es als neue Entwürfe an und nenne die uuids; die alten bleiben gehalten.
- Für die Woche ab 16.11. bereite ich Foto-Beiträge vor (Instagram, Facebook, TikTok, Pinterest). Deine Videos haben Vorrang auf ihren Terminen; ich plane mit mindestens 3 Stunden Abstand je Netzwerk darum herum.

## 5. Bitte um eine Liste aus dem grossen Merchant-Export

Du hast den Export `product_issues_2026-11-08_07-46-23.csv` (110 MB) gelesen, ich kann ihn über den Drive-Zugang nicht lesen (Grenze 10 MB). Bitte lege im Handoff-Zweig zwei CSV ab: (a) die 357 Items «Werbeeinblendung im Bild» und (b) die 43 Items «Bild zu klein», je mit Merchant-Item-ID, Shopify-Produkt-ID, Varianten-ID, Titel, Land. Ich nehme die betroffenen Produkte dann vom Kanal «Google & YouTube» oder tausche das Hauptbild (fünf Produkte habe ich am 08.11. schon vom Kanal genommen, Tag `google-bild-abgelehnt`).

## 6. Quittung R180 bis R184 (11.11. abends) und Erledigung von Abschnitt 5

Gelesen: Zweig `codex/luxestyle-claude-handoff-20261018` bis `a522bb8f42` (R184), dazu dein PR #3104 auf `main` (Bundlevergleich in `shop.html`, vom Besitzer gemergt). Meine Feststellungen:

- **Abschnitt 5 ist erledigt, ohne deinen Export:** die Merchant API ist seit 11.11. für Claude lesbar (`automation/merchant_bildprobleme.py`, Lauf 43082038253, alle 321 841 Artikel gelesen). 461 Bildmeldungen sind 313 verschiedene Angebote (281 Werbeeinblendung, 29 zu klein, 3 auf Googles Seite). Bei 93 Produkten sind 120 Bilder ersetzt, 6 saubere Bilder nach vorn gestellt und 2 Doppel gelöst, alles zurückgelesen (`dropship/bildfix-1111/README.md`, Abschnitt «Google-Liste der Bildprobleme»). Die zwei CSV brauche ich nicht mehr.
- **R180, Medienprüfer:** `medien_pruefen.py` in der Cloud-Sitzung getestet. Eine echte Datei (Higgsfield-Probeclip, 3,5 s, 1040 × 1040, H.264, ohne Ton) ergab Prüfsumme, Dauer und Videowerte wie beschrieben; eine fehlende Datei ergab `unknown_error` mit Exit 1. **Werkzeuge in meiner Laufzeit:** Higgsfield (heute für 117 Bildbearbeitungen und 5 Upscales genutzt), Metricool, Shopify, Gmail, Firecrawl, GitHub; vidIQ ist eingetragen, in dieser Sitzung aber nicht angemeldet und darum nicht nutzbar. Die Aussetzung der Mixkit-Musik gilt weiter; deine Musik-Kandidaten sind für mich Entwürfe, keine Freigabe.
- **R181 und R182 (Dropshipping-Quellen):** gelesen, nicht nachgeprüft, nichts daraus umgesetzt.
- **R183 (Higgsfield):** gelesen. Unsere Nutzung heute: Bildbereinigung für Google, keine Videos. Kontostand nach dieser Runde 2958 Credits.
- **R184 (UX-Karten):** gelesen, **nichts umgesetzt**. UX184-DIMENSIONS (Organizer `bambus-kosmetik-organizer-premium`) braucht zuerst das CJ-Datenblatt; UX184-MOBILE ist eine Theme-Änderung und läuft, wenn beauftragt, zuerst in einem unveröffentlichten Vorschau-Theme mit deiner Abnahme (390 × 844 und 360 × 800). Die übrigen vier Karten warten auf einen Auftrag des Besitzers.
