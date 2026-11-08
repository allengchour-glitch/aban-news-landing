# R134 – «Selbst gestalten» live bereinigt

Stand: 08.11.2026, Europe/Zurich. Shopify wurde für diesen Lauf als **LuxeStyle / `luxestyle.ch` / CHF / Schweiz** bestätigt. Der Scope umfasst genau die veröffentlichte Seite, die zugehörige Collection und 17 ACTIVE-Produkte mit Selbstgestalten-Bezug. Er ist kein Printful-Produktions-, Checkout- oder Gesamttheme-Abnahmetest.

## Seite und Collection

Die veröffentlichte Page `gid://shopify/Page/698444710273` (`/pages/selbst-gestalten`, Template `selbst-gestalten`) beschreibt den Ablauf nun in vier Schritten: Produkt wählen, Motiv im Editor platzieren, Vorschau prüfen und in CHF bestellen. Die Lieferaussage ist neutral und verweist auf die im Checkout verfügbare Prognose; personalisierte Rückgaben sind korrekt mit der Richtlinie verknüpft. Der ungeeignete Zusatzlink `/collections/sg-alle` ist entfernt. Die Meta-Description nennt T-Shirt, Sweatshirt, Bio-Hoodie und Tasse sowie Schweiz und Liechtenstein, ohne eine feste Lieferzeit zu versprechen.

Collection `gid://shopify/Collection/689870963073` (`/collections/selbst-gestalten`) erhielt einen sachlichen Body und eine passende Meta-Description. Die bisherige pauschale Aussage, alle Artikel würden in der EU bedruckt, ist entfernt. Die Collection verweist auf Editor, Vorschau, CHF-Bestellung und die je Artikel, Ausführung und Zieladresse unterschiedliche Produktions- und Lieferprognose.

Die finale API-Gegenprobe bestätigt: Page veröffentlicht (`updatedAt` 04:57:54 UTC), kein `/collections/sg-alle`-Link und keine geprüfte feste Lieferzeit im Page-Body; Collection ohne pauschalen EU-Druckclaim (`updatedAt` 04:56:53 UTC).

## 17 aktive Produkte

Alle 17 Produkte wurden final als `ACTIVE` zurückgelesen. Ihre führenden festen Lieferzeitbanner wurden durch eine neutrale Aussage ersetzt: Druck auf Bestellung; Schätzung abhängig von Artikel, Ausführung, Produktionsstandort und Zieladresse; Checkout-Prognose verwenden, soweit verfügbar. In den geprüften Produktbeschreibungen und SEO-Feldern fehlen danach die beanstandeten festen Lieferfenster, oz-/Zoll-Angaben, geprüften englischen Platzhalter, `WELCOME10` und pauschalen 30-Tage-Meta-Claims.

Die Schlussgegenprobe bestätigt ausserdem für jedes der 17 Produkte weiterhin genau eine Einbindung von `lspod-designer-v5.js`. Varianten, SKUs, CHF-Preise, Inventarwerte und -regeln sowie Tags blieben gegenüber dem Vorzustand unverändert.

Die grösste Sachkorrektur betrifft Produkt `gid://shopify/Product/15422815699329`:

- Titel: **Unisex Sweatshirt & Bio-Hoodie – Selbst gestalten**
- Produkttyp: **Hoodies & Sweatshirts**
- Beschreibung trennt jetzt das Gildan-18000-Rundhals-Sweatshirt ohne Kapuze, S–5XL, 50 % Baumwolle / 50 % Polyester, vom Stanley/Stella-SASU009-Bio-Hoodie mit Kapuze, S–2XL, je nach Produktionsstandort 80–85 % Bio-Baumwolle / 15–20 % recyceltem Polyester.
- 17 Medien-Alttexte unterscheiden Sweatshirt und Bio-Hoodie, soweit die Aufnahme eindeutig ist; sonst verwenden sie eine neutrale kombinierte Bezeichnung.
- Der Browserbefund zeigte anschliessend eine falsche Editor-Bildbindung. Um 05:02 UTC wurde `data-img-map` für alle 13 Varianten gesetzt: acht Rundhalsvarianten verwenden das weisse Sweatshirtbild, fünf Bio-Hoodievarianten das offizielle Bild der Printful-Variante 20805. Die finale API-Rücklesung bestätigt ACTIVE, 13 Varianten, 13 Bildbindungen, genau eine v5-Einbindung und 17 Alttexte. Varianten, SKUs und Preise blieben unverändert.
- Die Optionsbezeichnung `Material` und der Wert `Bio-Baumwolle` blieben absichtlich unverändert. Eine Umbenennung in `Modell` benötigt zuerst einen Checkout-/Sync-Test.

Weitere gezielte Korrekturen:

- `Kiss-Cut Aufkleber` heisst sichtbar **Aufkleber mit Konturschnitt – Selbst gestalten**, Produkttyp `Aufkleber`; deutsche Beschreibung und SEO ohne feste Lieferzeit.
- Die iPhone-Seite verwendet den sichtbaren Titel **iPhone-Hülle – Selbst gestalten** und bereinigte SEO-Felder; der bestehende Handle mit `®` blieb wegen Redirect-/Ranking-Risiko unverändert.
- Beim Notizbuch wurden `Cover` und `Bullet Journaling` durch `Umschlag` und `Planungen` ersetzt; SEO wurde vervollständigt.
- Mousepad-SEO verwendet `Mauspad`; klassische und weitere Unisex-T-Shirts verloren schlechte Übersetzungen sowie geprüfte englische Resttexte.
- Die Tasse verspricht keinen vom Kundendesign unabhängigen «leuchtenden Aufdruck» mehr. Geprüfte `on-demand`-, pauschale EU-Produktions- und `WELCOME10`-Claims wurden aus den betroffenen Feldern entfernt.

## Kontrollierter Browserlauf

Der echte v5-Upload konnte in der Laufumgebung nicht abgeschlossen werden: Der Cloudinary-POST endete mit `net::ERR_FAILED`; der vorgeschaltete `OPTIONS`-Request erhielt HTTP 503 nach einem Upstream-Reset. Das ist ein aktueller technischer Blocker und kein Beleg für eine leere oder dauerhaft defekte Cloudinary-Konfiguration. Deshalb entstand in diesem Lauf keine neue Druckdatei und kein darauf beruhendes neues Warenkorbobjekt.

Ein kontrollierter Fallback mit einer zuvor erfolgreich erzeugten Cloudinary-Druckdatei bestätigte den nachfolgenden Shop-Pfad: `/cart/add.js` antwortete HTTP 200; der Warenkorb zeigte das richtige Produkt, die Variante `Ringgarn-Baumwolle / XS`, den Designtext und einen klickbaren Druckdateilink. Der Checkout öffnete auf `de-CH`, rechnete in CHF und bot als Lieferländer nur Schweiz und Liechtenstein. Es wurde keine Bestellung ausgelöst. Shop Pays automatische Weiterleitung blieb wegen eines Upstream-Blocks unbekannt.

Dabei wurde ein separater Live-Themefehler bestätigt: Bei CHF 27.90 Warenkorbwert meldet der Fortschritt noch CHF 27.66 bis zur CHF-50-Schwelle. Rechnerisch korrekt wären CHF 22.10. Dieser Fehler blieb unverändert; er benötigt einen frischen Theme-Guard-Diff und öffentliche Gegenprobe.

## Schutzregeln und Theme-Diff

Draft-PR [#2940](https://github.com/allengchour-glitch/aban-news-landing/pull/2940), Head und Remote-SHA `3a0e9261d0b46e72bdd9c666aeb437b6ea44ed09`, härtet die vorhandenen POD-Seiten- und Editor-Injection-Workflows. Seitenwrites sind standardmässig Trockenläufe, auf `main`, exakte Shop-/Seitenidentität, den frisch gelesenen Vorher- und Zielhash, eine zweite Gegenprobe unmittelbar vor der Mutation sowie eine unabhängige Rücklesung ohne Blind-Retry begrenzt. Die Designer-Injection ist standardmässig trocken und auf scharfen Lauf nur über die explizite Eingabe beschränkt. Lokal bestanden 70/70 Guard-, 75/75 Editor-Hintergrund- und 4/4 Shopify-Host-Prüfungen; 3/3 gezielte Mutanten wurden erkannt. Zwei unabhängige Schlussreviews meldeten keine Blocker; YAML-, Syntax- und Diff-Prüfungen sowie die vollständige Sparse-CI-Nachspielung sind grün. Die offizielle lokale CI-Simulation war nur durch `unshare: Operation not permitted` blockiert. Remote waren `tests`, `selbst-gestalten`, `lagerbestand` und Cloudflare Pages grün; drei bekannte Workers waren rot, Pre-deploy und eine externe Pages-Prüfung liefen bei der letzten Rücklesung noch. Der PR bleibt `OPEN`/`DRAFT`/ungemergt. Kein Workflowstart, Merge, Deployment oder Shop-/Printful-Write wurde daraus abgeleitet.

Eine frische read-only Gegenprobe des Live-MAIN-Themes `213013037447` bestätigte zusätzlich widersprüchliche POD-Texte: Collection-FAQ/USP nannten pauschal Lager, Tracking, 10–20 Tage und 30 Tage Rückgabe; Header/Footer enthielten ebenfalls pauschale Rückgabeaussagen. MAIN wurde nicht verändert. Nach exakter Live-MD5-Gegenprobe wurde daraus der unveröffentlichte Theme-Entwurf `213482963335` **LuxeStyle – Printful Fix 08.11.2026** dupliziert. Insgesamt erfolgten sieben bestätigte Datei-Writes im Entwurf: die vier validierten Dateien `layout/theme.liquid`, `templates/collection.json`, `sections/header-group.json` und `sections/footer-group.json`, danach `snippets/cart-summary.liquid`, ein enger zweiter Write von `sections/header-group.json` für «gratis ab CHF 50 Warenwert» und abschliessend ein enger zweiter Write von `templates/collection.json` für den neutralen Standard-FAQ-Zweig.

Die native Schlusslesung bestätigt Rolle `UNPUBLISHED`, `processing=false`, `processingFailed=false`, keine Fehler und die finalen MD5: Layout `4447d5a9a0410ec9190cd57819f4bc2f`, Collection `45925c29ff6b8d99e52e265be410996e`, Header `d6dc242ecb7992b11d0a794ab2da0790`, Footer `c2e6ce9d12ca172f84c7a19130c905e8` und Cart-Summary `50477696df6cfb1cf832a54a1cbb178f`.

Die finalen öffentlichen Previews antworteten HTTP 200 und nannten in `server-timing` Theme `213482963335`. Desktop mit 1440 px und Mobil mit 375 px zeigen keinen horizontalen Überlauf. Bei CHF 39.90 Warenkorbwert zeigen der obere Balken und die rechte Zusammenfassung je korrekt CHF 10.10 bis CHF 50 Warenwert; CHF 15.66 und «nach Rabatt» fehlen im Warenkorb-DOM. Der Header lautet sichtbar «Lieferung nur in die Schweiz & nach Liechtenstein · in der Schweiz gratis ab CHF 50 Warenwert», und sämtliche Header-Slides sind frei von «nach Rabatt». Die normale `damen-mode`-FAQ ist neutral, nennt CHF 50 Warenwert und CHF 7, aber keine feste 2–3-/10–20-Tage-Frist, kein «immer Tracking» und kein «nach Rabatt». POD-FAQ und normaler FAQ-Zweig sind getrennt; `sg-alle` zeigt die gemischte Ausnahme korrekt. Der Testwarenkorb wurde jeweils geleert; keine Bestellung. Der Entwurf ist nicht veröffentlicht.

MAIN wurde anschliessend mit seinen fünf alten MD5 exakt unverändert zurückgelesen: Layout `cf5ee5a64ca940edf4120b09c073e58f`, Collection `3ba28c329b5f8ccb03c99893a210cccd`, Header `d62af614af5a66f6f2ff60de226cfbb0`, Footer `9ff28afd87a683c7ce0d66e0d2facfdc` und Cart-Summary `88e224946155647e7ec46498b5aac870`. MAINs `updatedAt` blieb `2026-11-07T19:56:09Z`. Vor einer späteren Publikation bleiben eine frische MAIN-/Entwurfs-Gegenprobe und die weiterhin geltenden Theme-Publish-Grenzen erforderlich.

## Grenzen und nächster Schritt

Die Bereinigung ändert keine Variante, SKU, Preis-, Inventar- oder Printful-Zuordnung. Es gab keine Bestellung, keinen Printful-Auftrag, keinen Theme-Publish und kein Deployment.

Offen bleiben:

- Der live eingebundene Editor ist weiterhin Version 5. Die getestete Version 6.2 ist noch nicht breit live; der Canary ist DRAFT.
- Eine vollständige mobile Live-Abnahme vom Editor über einen neu erzeugten Druckfile und die Vorschau bis unmittelbar vor Bestellung sowie ein Printful-Produktions-/DPI-Test fehlen. Der nachgelagerte Warenkorb-/Checkoutpfad ist nur mit einer bestehenden Druckdatei bestätigt.
- `/fr/pages/selbst-gestalten` und verlinkte `/fr/products/...` deklarieren Französisch, liefern aber deutsche Inhalte; Editor v5 kennt nur Englisch oder den deutschen Fallback.
- Die globale Theme-FAQ beziehungsweise der Chatbot enthält weiterhin pauschale Lieferfenster von 7–14 beziehungsweise 10–20 Tagen. Kein globaler Theme-Write wurde ausgeführt.
- Verifizierte Körpermasse für 4XL/5XL fehlen; die generische Tabelle endet bei 3XL.
- Die tatsächliche globale Checkout-zu-Printful-Produktionszuordnung ist nicht als End-to-End-Abnahme belegt. Der begrenzte öffentliche Printful-GET-Versuch endete mit einem Upstream-Verbindungsfehler; das Ergebnis ist unbekannt und nicht leer.
- Der Warenkorb-Fortschritt berechnet den Restbetrag zur öffentlichen CHF-50-Schwelle falsch: CHF 27.66 statt CHF 22.10 bei CHF 27.90 Warenkorbwert.
- Draft-PR 2940 ist ungemergt; Pre-deploy und eine externe Pages-Prüfung liefen bei der letzten Rücklesung noch, drei bekannte Workers waren rot. Theme-Entwurf 213482963335 ist unveröffentlicht; MAIN 213013037447 blieb unverändert.

Nächster kontrollierter Schritt ist nach Behebung des Upload-/Upstream-Blockers ein abbrechbarer Live-Browserlauf auf Mobil und Desktop: bei den zwei Modellfamilien vollständig Produktwahl, Editorstart, neuen Upload, Platzierung, Vorschau, Variantenwechsel, Warenkorb und Checkout bis vor der zahlungspflichtigen Bestellung prüfen. Draft-PR 2940 erst nach abgeschlossenen restlichen Checks prüfen. Theme-Entwurf 213482963335 unveröffentlicht lassen und vor jeder weiteren Aktion frisch gegen MAIN lesen; die Preview-QA ersetzt keine Live-Publikationsabnahme. Parallel bleiben FR-Übersetzung, verifizierte 4XL/5XL-Masse und Printful-DPI/Produktionsmapping getrennte Aufgaben.
