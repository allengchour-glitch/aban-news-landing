# R135 – Druckvorschau vor dem Warenkorb

Stand: 08.11.2026, Europe/Zurich. Dieser Lauf umfasst die neue v5-Druckvorschau, den begrenzten v6.3-Tassen-Pilot im unveröffentlichten Theme `213482963335` sowie die einmalige Tagesprüfung von Shop, Metricool und Klaviyo. MAIN blieb unverändert; es gab keinen Theme-Publish, Checkout oder Auftrag.

## v5-Druckvorschau im Theme-Entwurf

Im Theme `213482963335` **LuxeStyle – Printful Fix 08.11.2026** wurde genau eine weitere Datei geändert: `assets/lspod-designer-v5-safe.js`. Sie wuchs von 51'378 auf 63'950 Bytes. Die MD5 änderte sich von `be85494be069a484807b65ee32261a8a` auf `abc4e9d6dee7716e1bd3439d8280ebfb`, die SHA-256 von `70140421381326aff999bd84094b9997eda3e9432037def69185d65ff003e808` auf `0cc241059ef8dc9cfca6f2a162db8c32f99dc85c131e75aa7e4dbebeb8b28a47`. Der Upsert meldete keine User Errors; die unmittelbare Rücklesung bestätigte `processing=false` und `processingFailed=false`.

Das aktive MAIN-Theme `213013037447` blieb für dieses Asset exakt auf MD5 `be85494be069a484807b65ee32261a8a`. Es wurde kein Theme veröffentlicht. Damit ist die neue Druckvorschau ausschliesslich im unveröffentlichten Entwurf vorhanden; der Live-v5-Hauptpfad ist dadurch noch nicht korrigiert.

## Produktgetreue Vorschau ohne erfundene Geometrie

Die Vorschau arbeitet in zwei klar getrennten Modi:

- Liegt eine streng validierte, datierte `data-print-template-map` aus `printful_catalog_api` vor, werden nur passende Placement-, Template-, Printfile- und Printful-Varianten-IDs, gültige Koordinaten, passendes Seitenverhältnis und eine HTTPS-Vorlage von einem erlaubten Printful-CDN-Host akzeptiert.
- Ohne solche Map erscheint die exakt erzeugte PNG-Druckdatei auf einem Karoraster mit dem Hinweis: «Druckdatei; Produktdarstellung und Druckgrösse sind hier nicht massstabsgetreu.» Es werden weder Produktform noch Druckbereich oder Massstab erfunden.
- Eine vorhandene, aber ungültige Map wird nicht still als einfacher Modus behandelt. Sie sperrt den Warenkorb und benennt die fehlerhaften Druckbereichsdaten.

Jede gestaltete Seite muss einzeln geöffnet und über eine echte Checkbox bestätigt werden. Erst danach wird der Warenkorb-CTA freigegeben. Eine Änderung am Design oder an der Variante verwirft die Bestätigung. Der Variantenauszug zeigt Material, Farbe und Grösse nur, wenn diese Optionen am konkreten Produkt vorhanden sind.

Der Dialog besitzt `role="dialog"`, `aria-modal="true"`, verknüpfte Überschrift und Beschreibung, Live-Status, beschriftete Checkbox, Fokusfalle, Escape-Schliessen und Fokus-Rückgabe. Die Bedienelemente sind mindestens 44 Pixel hoch. Die 375-Pixel-Prüfung blieb innerhalb des Viewports und ohne horizontalen Überlauf.

## Tests und echter Draft-Warenkorbpfad

`node --check`, Playwright-Fixture, gültige Map, exakter PNG-Fallback, Vorder-/Rückseitenbestätigung, Design- und Varianteninvalidierung, Sperre bei ungültiger Map sowie Dialog-/375-Pixel-Prüfung bestanden. Der echte Draft-Smoke auf `unisex-hoodie-selbst-gestalten` lud das Asset `/cdn/shop/t/27/assets/lspod-designer-v5-safe.js?v=2064868001234033451794118096`, bestätigte die Fallback-Prüfung und liess den Warenkorb bei `item_count: 0`.

Der anschliessende begrenzte End-to-End-Test nutzte `unisex-t-shirt-selbst-gestalten`, Variante `55777948008833`, Ringgarn-Baumwolle / XS, bei 375×812 Pixeln:

- Vor Bestätigung blieb der CTA deaktiviert und erzeugte keinen Request an `/cart/add.js`.
- Cloudinary antwortete HTTP 200.
- `/cart/add.js` antwortete HTTP 200; es gab genau einen Request.
- Der Warenkorb enthielt die richtige Variante sowie `🎨 Design = Text: "E2E TEST 08.11"` und eine HTTPS-Cloudinary-PNG unter `🖼️ Druckdatei`.
- `/cart/clear.js` antwortete HTTP 200; danach war `item_count: 0`.
- Es gab keinen Checkout und keine Bestellung.

Der erste Harness-Lauf erreichte Cloudinary, Cart-Add und Cart-Clear bereits erfolgreich, verlor aber nach dem Redirect den JavaScript-Kontext vor der Property-Prüfung. Erst der korrigierte Wiederholungslauf belegt die vollständige oben beschriebene Kette. Beide isolierten Testwarenkörbe wurden geleert.

## Tagesprüfung: Shop, Planung und Kennzahlen

Shopify wurde für diesen Lauf als LuxeStyle / `luxestyle.ch` / CHF / Schweiz und Metricool als brandId `6227837` / `Europe/Zurich` samt den sechs erwarteten Kanalidentitäten bestätigt.

Der Sternenlicht-Projektor `gid://shopify/Product/15521256604033` ist ACTIVE und öffentlich kaufbar. Er hat sieben aktuelle Varianten A–G zu CHF 34.90–51.90; die historische Variante `56197916361089` ist veraltet. Die aktuellen Varianten sind untracked, `CONTINUE`, Menge 0 und `availableForSale=true`. Tags sind vorhanden und enthalten keinen Social-Sperrtag. Die offene Zuordnung der Ausführungen sowie die fehlende Rechtebindung blockieren jedoch weiterhin jede Social-Ausspielung.

Die Keramik-Tasse `gid://shopify/Product/15422823465345` ist ACTIVE. Ihre drei aktuellen Varianten kosten CHF 22.90, 25.90 und 23.90; sie sind tracked, `CONTINUE`, mit Menge 9999 und kaufbar. Die Tags enthalten keinen Sperrtag. Aus dem Zähler folgt keine Lieferzeitzusage.

Für 08.–14.11.2026 lieferte Metricool 30 Planobjekte mit 30 UUIDs und 47 `PENDING`-Kanalzuständen. Es gab keine kanalgleiche nichtleere Doppelkopie. Elf Videoobjekte bleiben Entwürfe mit Auto-Publish aus; 19 Fotoobjekte blieben unverändert. Bei fünf Objekten fehlt eine Facebook-/Instagram-Caption. Ihre Versandclaims sind nicht geprüft; daraus folgt kein Publikationsauftrag.

Die Kennzahlen 01.–07.11.2026 sind nur teilweise abgedeckt und werden nicht auf fehlende Tage hochgerechnet: Instagram 642 Views und fünf bekannte Interaktionen an drei Tagen; Facebook 400 Views und eine Interaktion an einem Tag; TikTok 1'720 Views, vier Likes, null Kommentare und ein Share an sechs Tagen; Pinterest 4'440 Impressionen und 57 Interaktionen an fünf Tagen; YouTube 165 Views an fünf Tagen, Interaktionen unbekannt; Threads nur am 07.11. mit 0/0, die übrigen Tage unbekannt. Diese Kanalwerte belegen keine Verkäufe.

## Klaviyo und Verkaufsentwurf

Klaviyo-Konto `XWqMAD` meldet USD; Shopify bleibt CHF. Die Placed-Order-Metrik ist `W7XTVD`. Abandoned Checkout `Vse76a`, Welcome Series `VbLQj6` und Post-Purchase `RnTvsY` sind aktuell alle `draft`. Im Teilbericht 01.–07.11. fehlen Daten für `Vse76a` und bleiben unbekannt; `VbLQj6` meldet eine Zustellung/eine Öffnung, `RnTvsY` vier Zustellungen/eine Öffnung. Es werden keine Währungen oder Revenue-Summen vermischt.

Das Capture-HTML ist live, während die Forms-API keine Form liefert. `XEGbTB` ist der Checkout-Recovery-/Warenkorbrückgewinnungs-Flow und aktuell draft; sein 10-Prozent-Claim ist nicht bestätigt. Als einzige Flowverbesserung bleibt ein neutraler Email-2-Textdiff für `XEGbTB` zur Freigabe vorbereitet. Kein Flow wurde aktiviert oder geändert.

Als konkrete Verkaufsaktion bleibt beim Projektor der Zusatz **«Preis pro Auswahl: Der angezeigte Preis gilt für die aktuell gewählte Ausführung.»** zur Freigabe vorbereitet. Er wurde nicht in Shopify geschrieben.

## Content-Master

Der bestehende Master `luxe_sternenprojektor_master_20261018` wurde als 18-Sekunden-Storyboard fortgeführt. Hook A lautet «Dein Raum. Neues Licht.», Hook B «Licht im Detail.». Das Detailsegment bleibt bei 17.20–18.80 Sekunden mit Crop x210; Crop x300 gilt für das Bedienungssegment 3.00–8.60 Sekunden. Die Pflichtmusik `automation/music/luxe-premium.wav` ist vorhanden, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`; Rechte-, Hör- und Mixabnahme sind offen. Es gibt weiterhin keine neue Master-MP4.

Sechs kanalangepasste Text-/UTM-Entwürfe wurden vorbereitet. Alle Kanäle bleiben wegen fehlender A–G-Produktbindung, offener kommerzieller Rechte und fehlender freigabefähiger MP4 gesperrt. Es wurde nichts über Metricool terminiert oder veröffentlicht.

## v6.3-Repository-Guard und begrenzter Tassen-Pilot

Draft-PR [#2944](https://github.com/allengchour-glitch/aban-news-landing/pull/2944), Base `main`, Head und Remote-SHA `ea877d4487c52eaf2290cd92dd988f61f14d1aa1`, enthält den v6.3-Quellstand mit SHA-256 `38e4b18ea6411a7669283a0893daae4c808dae0a939a341da15ae877e5a21c4a`. Die Testdatei-Hashes sind Unit `9a6c56632078b5207ca4a97d10fb173ff84fb1802bdcb318015831850e58b965`, Editor `d11bd05e007fe4c8a33f768632d992cc1e5757daf7ed2bf7f453cf760ed4ee9d` und Vorschau `f9e255a6d4d35265f4cb10c5f87b4db27f7c7d1e75468efb7e7f35c6fec4c012`.

Lokal bestanden 1'057 v6.3-Prüfungen sowie 393 Editor- und 196 Vorschau-Rückwärtsprüfungen für v6.2; das Schlussreview meldete keine Blocker. Remote waren Voice zweimal, Tests, Selbstgestalten, Lagerbestand und Cloudflare Pages grün. Der repo-weite Deploy-Check endete nach acht Minuten während der HTML-Gesamtprüfung als `cancelled`; keine HTML-Datei wurde geändert. Drei externe Workers-Builds meldeten ohne Annotation `FAILURE`, ein externer Förder-Radar-Check war zuletzt noch ausstehend. PR2944 bleibt Draft/ungemergt; daraus folgt kein Deployment.

Nach unabhängiger Daten-/Contractprüfung wurden im weiterhin `UNPUBLISHED` Theme `213482963335` genau vier Pilotdateien geschrieben und frisch zurückgelesen (`processing=false`, `updatedAt` 06:41:45 UTC):

- `layout/theme.liquid`: MD5 `4447d5a9a0410ec9190cd57819f4bc2f` → `fe3e85d7da50eb8f0b8152350d1a79f1`, 62'235 Bytes.
- `assets/lspod-designer-v6-6.3.0.js`: neu, MD5 `403cbd9ff0883b0676daf209b33765e6`, 224'552 Bytes, SHA-256 `38e4b18ea6411a7669283a0893daae4c808dae0a939a341da15ae877e5a21c4a`.
- `assets/lspod-karte-19.json`: neu, MD5 `f6aafc1cf13e9456cd78602ad02399b4`, 2'690 Bytes.
- `assets/lspod-vorschau-19.json`: neu, MD5 `45f219ece6df8d8e93733d6adf191c05`, 1'410 Bytes.

Das v5-Draft-Asset blieb auf MD5 `abc4e9d6dee7716e1bd3439d8280ebfb`. Ausschliesslich `keramik-tasse-selbst-gestalten`, Produkt `gid://shopify/Product/15422823465345`, nutzt im Entwurf v6.3 im Modus `karte`; das Produkt blieb ACTIVE und `updatedAt=2026-11-08T04:58:27Z`. Es gab keinen Produktwrite. Die Varianten 325/444/591 ml binden auf Printful 1320/4830/16586. Alle anderen Produkte bleiben auf v5.

Die Browserbelege sind bewusst getrennt:

- Die Matrixprüfung bestand für alle drei Varianten und Produktansichten, DPI-Sperre, Design- und Varianteninvalidierung sowie 375 Pixel. Vor der Freigabe gab es null Uploads und null Cart-Adds; Cart-Clear endete mit HTTP 200/Count0.
- Der FormData-Wrapper bewies die exakte Bytegleichheit zwischen Review-PNG und ausgehendem Datei-Blob: 88'716 Bytes, SHA-256 `384401a5df9472e28d8014eb3f33a153d6c34f8529075be28c5ef062dc94fbc6`. In diesem instrumentierten Lauf kam kein Netzrequest zustande; der Netzstatus dieses Wrappers ist unbekannt.
- In getrennten echten Läufen bestanden die 325-ml- und 591-ml-Wege jeweils mit zweimal Cloudinary HTTP 200, `/cart/add.js` HTTP 200 und `/cart/clear.js` HTTP 200/Count0.

Mehrere kombinierte Harnessläufe waren wegen Instrumentierungs- und Variantenstatusproblemen nicht vollständig grün. Deshalb wird ausdrücklich kein einzelner durchgehend grüner Kombiharness behauptet. Die getrennten Matrix-, Byte- und Netzwerkbelege stützen den begrenzten Draft-Pilot; sie beweisen keine MAIN-Reife oder physische Printful-Produktion.

MAIN `213013037447` blieb unverändert: Rolle MAIN, Layout-MD5 `cf5ee5a64ca940edf4120b09c073e58f`, v5-MD5 `be85494be069a484807b65ee32261a8a`; v6.3-, Karten- und Vorschauassets fehlen dort. Kein Publish, Checkout, Auftrag oder Bestellung; Warenkorb geleert.

## Grenzen und nächster Schritt

Der v5-E2E gilt für eine T-Shirt-Variante und der v6.3-Pilot für die drei Tassenvarianten. Nicht belegt sind die übrigen Selbstgestalten-Produkte, weitere Medienarten, physische DPI-/Druckqualität, Printful-Produktion, Checkout und Bestellung. PR2944 bleibt Draft; Theme213482963335 bleibt UNPUBLISHED. Die Live-v5-Flächen bleiben unverändert.

Nächster kontrollierter Schritt ist eine frische MAIN-/Draft-Gegenprobe nach Abschluss der offenen externen PR-Checks und vor jeder möglichen Publikationsentscheidung. Erst danach darf ein begrenzter Publish-Diff zur gesonderten Freigabe vorgelegt werden. Aus diesem Pilot folgt keine automatische MAIN-Publikation.
