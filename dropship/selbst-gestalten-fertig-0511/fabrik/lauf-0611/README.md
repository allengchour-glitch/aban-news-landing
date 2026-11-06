# Lauf 06.11.2026: Editor v6.2.0 im CDN (L3) und Canary «Tasse 403» als ENTWURF (L4)

Alles **GEMESSEN am 06.11.2026 zwischen 14:20 und 14:50 UTC**, soweit nicht anders gekennzeichnet. Nichts davon ist veröffentlicht: das Produkt ist ENTWURF, in keinem Verkaufskanal, in keiner Sammlung.

## 1. Editor v6.2.0 als Datei im Shopify-CDN (L3)

- Quelle: `pod/v6/lspod-designer-v6-6.2.0.js` (206 421 Byte, SHA-256 `b6fcfe1a0164069c6cdbbfee8eb08b990501b973adbbc1727c6f57795645018a`), Stand von PR #2909 (`6584dce`).
- Neue Datei, nichts Bestehendes geändert: `gid://shopify/GenericFile/77972815937927`, Name `lspod-designer-v6-6.2.0.js`, `mimeType application/javascript`.
- Adresse (das ist `LSPOD_EDITOR_URL`): `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/lspod-designer-v6-6.2.0.js?v=1793975783`
- **Das CDN liefert die Datei minifiziert aus:** gespeichert 206 421 Byte (`originalFileSize`), ausgeliefert 136 191 Byte (SHA-256 `98cdbdb9…`), mit und ohne `Accept-Encoding` gleich; `content-type: text/javascript`, `access-control-allow-origin: *`. Das ist bei v5 ebenso (Theme-Datei 51 378 Byte, im CDN 50 676 Byte). **Darum wurden alle Tests gegen die ausgelieferte Fassung wiederholt** (`V6_DATEI=<heruntergeladene Datei>`): `unit_test` 348, `editor_test` 393, `vorschau_test` 196, alle bestanden. Künftige Versionen immer so gegenprüfen.
- Namensregel: neue Version = neue Datei (`lspod-designer-v6-<Version>.js`), nie die alte überschreiben. Frühere Dateien: `lspod-designer-v2.js` bis `-v5.js`.
- Rücknahme: `fileDelete` auf die ID oben (nur sinnvoll, wenn kein Produkt die Adresse mehr nutzt).

## 2. Canary: Tasse 403 als ENTWURF (L4)

- Trockenlauf (Plan-Hash `0507054faa77a90d`, zweimal gleich): 1 anlegbar, 0 gesperrt, 17 von 17 Toren bestanden, 11 Varianten, CHF 26.90 (325 ml) und 27.90 (444 ml), Netto mindestens 4.50. Hinweise: `versand_je_groesse`, `kostenschaetzung`.
- LIVE 14:39 UTC mit exakt denselben Eingaben plus `ONLY=keramik-tasse-farbige-innenseite-selbst-gestalten` (Ledger `ledger.txt`, Protokoll `live-lauf.log`, Plan-Sicherung `sicherung/…plan.json`): Exit 0, `gid://shopify/Product/16697144705415`, Handle `keramik-tasse-farbige-innenseite-selbst-gestalten`, 11 Varianten (SKUs `9100403_<Printful-Variante>`), 7 Medien READY, **frisch gelesen gleich dem Plan**.
- Frisch gelesen (Admin API): Status DRAFT, `resourcePublicationsV2` leer (kein Kanal), keine Sammlung, Tags `sg-fabrik`, `sg-modell-403`, `sg-klasse-flach`, `selbst-gestalten`, `wunschdesign` u. a.; alle 11 Varianten `availableForSale: true`, `CONTINUE`, nicht verfolgt, Standort «Shop location» (die bestehende Tasse liegt dagegen verfolgt am Standort «Printful» mit 9999).
- Beschreibung trägt den Editor-Baustein (`lspod-designer-v6`, `lspod-karte`) und `<script src=<LSPOD_EDITOR_URL> defer>`.
- Rücknahme: `ZURUECK=1 LIVE=1 LEDGER=dropship/selbst-gestalten-fertig-0511/fabrik/lauf-0611/ledger.txt node automation/pod_modell/pod_modell.mjs` (löscht nur dieses DRAFT-Produkt ohne Kanal).

## 3. Browserprüfung der Entwurfsseite (private Vorschau, echtes Theme, Playwright)

Die Vorschau-Adresse enthält einen Schlüssel und steht deshalb NICHT im Repo (sie wird zur Laufzeit als `onlineStorePreviewUrl` per Admin API gelesen). Skripte in `werkzeuge/` (Scratch-Stand, Pfade fest).

- **Der Editor v6.2 aus dem CDN startet im echten Theme** (Desktop 1440 und Handy 390): `data-init-v6=1`, ein Canvas, Knöpfe Text, Sticker, Bild, Rückgängig, Wiederholen, Ebenen; kein seitliches Scrollen; **0 Seitenfehler** durch den Editor. Das Theme lädt daneben weiter den alten `lspod-designer-v5-safe.js` (Theme-Datei): kein Konflikt beobachtet.
- Der Umschalter «Auf dem Produkt» ist **nicht sichtbar**, weil die Tasse kein gespiegeltes Vorlagenfoto hat (so gewollt nach der Korrektur, Entscheid 8 offen).
- **Variantenwechsel** (Klick auf die Farb- und Grössenwahl): Preis 26.90 → 27.90 bei 444 ml, die Shopify-Variante im Formular wechselt (`…575559` Schwarz/325, `…641095` Rot/325, `…673863` Rot/444, `…739399` Blau/444). Eine nicht vorhandene Kombination (Dunkelblau/325 ml) zeigt rot «Diese Ausführung ist im Editor noch nicht eingerichtet. Bitte wähle oben eine andere Grösse oder Farbe.» und der Kauf sendet nichts.
- **Kaufweg (Anfrage abgefangen und abgebrochen, nichts im Warenkorb):** JSON-`POST` an `/cart/add…` mit `id` der gewählten Variante (Blau/444), `🎨 Design (default)`, `🖼️ Druckdatei (default)` (Cloudinary-Adresse) und `_pod_karte={"v":6,"m":403,"pv":17197,"sv":"<Shopify-Variante>","pl":["default"],"ap":0}`; `pv` 17197 stimmt mit dem SKU-Teil `9100403_17197` überein. Kein `_vorschau` (kein Spiegel), kein `qd` (Text ohne Raster).
- **Nebenwirkung:** die Prüfung lud beim Kaufklick ein Test-PNG (Text «Test Entwurf») zu Cloudinary hoch (`res.cloudinary.com/dwyi6kkrl/image/upload/v1793976626/xy1jxggytwmgpyvh4m1v.png`); der Upload-Preset ist weiter unsigniert beschreibbar (offener Entscheid 2 im Bauplan).

## 4. Wichtiger Messbefund: Entwurfsvorschau zeigt «Ausverkauft»

Auf der Entwurfsseite stehen alle Optionen auf `data-option-available="false"`. **Das ist ein Vorschau-Effekt unveröffentlichter Produkte, kein Fehler dieses Produkts:** zwei normale CJ-Entwürfe (`outdoor-bluetooth-speaker-…`, `premium-modern-shoe-rack-in-wood`, Admin `availableForSale: true`) zeigen in der Vorschau «Ausverkauft (1)», ein aktives CJ-Produkt (`faltbare-led-nachtlichtlampe-…`) dagegen «In den Warenkorb legen» und `true`. **Ob die Tasse nach dem Veröffentlichen kaufbar ist, ist deshalb UNGEMESSEN** und die erste Messung nach einer Veröffentlichung (Besitzer-Entscheid): `data-option-available`, Kaufknopf, Warenkorb-Eigenschaften, erste Bestellung bis zur Printful-Meldung.

## 5. Nicht gemessen, bewusst offen

- **Bestellweg (WP6):** `printful_sync.mjs` und `printful_bestellweg.mjs` kennen die neuen SKUs `9100403_<Printful-Variante>` und das Karten-Paket `_pod_karte` (v6) noch nicht; der erste echte POD-Auftrag läuft per Handstart mit Prüfung von Hand (Entscheid 4 vom 05.11.).
- Kanäle, Sammlung, Schaufenster, «Google & YouTube» (nicht, Entscheid 6): macht die Fabrik nie.
- Bilder der 7 Medien: Sichtprüfung auf Fremdmarken steht aus (Hinweis `bildinhalt`).
- Preis gegen Printful-Kosten unter echter Bestellung ungemessen (Kostenschätzung Einkauf = Katalogpreis mal 1,26).
- Vorlagenfoto der Tasse spiegeln (1 176 Dateien insgesamt) und die Rechte daran: Entscheide 8 und 10.

## Lehren

1. Das Shopify-CDN minifiziert hochgeladene `.js`-Dateien: nach dem Upload gegen die **ausgelieferte** Datei testen, nicht gegen die Quelle.
2. Entwurfsvorschauen zeigen «Ausverkauft» für jedes unveröffentlichte Produkt: Verfügbarkeit nie an der Vorschau messen.
3. Die Farb- und Grössenwahl dieses Themes besteht aus versteckten Radio-Feldern: im Browsertest per `input.click()` im Seitenkontext schalten (ein Playwright-Klick auf das Label läuft ins Zeitlimit).
4. Einen Kaufweg ohne Warenkorb-Eintrag prüft man mit `page.route('**/cart/add**', abort)`: die Anfrage samt Eigenschaften bleibt lesbar, ein abgebrochener Aufruf erscheint danach als `TypeError: Failed to fetch` und ist kein Produktfehler.
