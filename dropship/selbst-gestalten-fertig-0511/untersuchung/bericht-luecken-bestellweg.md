# Untersucher 3: Lücken und Bestellweg bis zum Auftrag (Stand 05.11.2026, Messungen 21:05 bis 21:30 UTC)

Marken: **GEMESSEN** = selbst nachgemessen (05.11.2026), **QUELLE** = Dritte oder Repo-Doku (Link/Datei genannt), **Annahme/Hypothese** = nicht belegt, **unbekannt**.
Rohdaten und Skripte liegen alle in `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/luecke/` (Dateinamen unten genannt).

## 0. Kurzfassung (5 Sätze)

1. **Die Kette «Editor → Warenkorb → Printful-Auftrag» funktioniert technisch**: Der Live-Editor legt ein Design samt Druckdatei in den Warenkorb, und die gehärtete Planlogik (`lib/printful_bestellweg.mjs`) macht daraus ohne Befund einen sauberen Printful-Auftrag (Jutebeutel 1 Seite, T-Shirt Vorne+Hinten, und ein nachgestellter v6-Fall mit Ärmel). Mit einer echten Bestellung wurde sie aber **noch nie** durchlaufen (0 von 34 Shopify-Bestellungen (#1003 bis #1036) trugen Editor-Eigenschaften und gingen an Printful).
2. **Grösster Blocker: Die Vorschau im live wirksamen Editor v5 stimmt nicht mit dem Druck überein.** Gemessen am echten Printful-Mockup druckt dasselbe Design **2,8-mal (Tasche) bis 3,4-mal (T-Shirt) kleiner** und an anderer Stelle, als es der Editor auf dem Produktfoto zeigt. Grund: Der Editor zeichnet auf dem ganzen Produktfoto, Printful druckt in die Druckfläche (Tasche: 37 % der Bildbreite). Editor v6 behebt das (Bühne = echte Druckfläche), ist aber nicht live.
3. **Zweiter Blocker: Aufpreise** (Rückseite +5.95 USD, Ärmel +2.49 USD …): v5 bietet «Hinten» bei 15 Produkten gratis an (Warenkorb zeigt CHF 24.90 für Vorne+Hinten); v6 zeigt den Aufpreis nur an, rechnet ihn nicht ab. Der Kosten-Wächter im Sync hält solche Aufträge als Entwurf an, schützt also vor stillem Verlust, aber die Bestellung bleibt liegen.
4. **Dritter Blocker: Es gibt nichts, das den Auftrag auslöst.** Die Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` existiert nicht (GEMESSEN), der Zeitplan in `main` ist pausiert (Memory), und die KI-Kontrolle ist Pflicht (ohne funktionierenden Gemini-Schlüssel, Memory: HTTP 402, wird jeder Auftrag Entwurf).
5. **Designstudio (`?view=luxe-studio`): in den Bestell-Editor aufgehen lassen, den Zugang sofort abklemmen.** Es ist eine Sackgasse (GEMESSEN: «Entwurf behalten» schliesst nur das Fenster, null Warenkorb-/Upload-Anfragen), und das Katalogfenster `?view=luxe-gestalten` schickt alle 32 Produkte × 3 Links = 96 Links dorthin.

---

## 1. Funktionsvergleich: Printful Design Maker | live Editor v5 | neuer Editor v6

Quellen Printful (alle abgerufen 05.11.2026): Blog «10 Printful Design Maker features» (https://www.printful.com/blog/design-maker-features, 16.04.2026), Hilfe «How does the Design Maker work?» (https://help.printful.com/hc/en-us/articles/50264179910673), «How can I transform a design in the Design Maker?» (https://help.printful.com/hc/en-us/articles/50264129164305), Produktseite https://www.printful.com/design-maker. Zum Embedded Design Maker (EDM) siehe `work/edm/bericht.md` (anderer Untersucher: für uns heute nicht erreichbar, Store-Token ohne `product_templates*`, Store-Typ `shopify`).
v5 = `pod/live/lspod-designer-v5-safe.js` (selbst gelesen, live bei 412×915 und 1280×900 getestet). v6 = `pod/v6/lspod-designer-v6.js` + README (gelesen, Screenshots `scratchpad/sg/v6shots/` angesehen; nicht live, daher nur Code/README, nicht am Shop gemessen).

| # | Funktion | Printful | v5 (live) | v6 (nicht live) | Lücke | Aufwand | Nutzen für die Kundin |
|---|---|---|---|---|---|---|---|
| 1 | **Echte Druckfläche** sichtbar (Grid, Sicherheitsrand, Mass) | Grid-Symbol zeigt Druckfläche; Druckqualität-Warnung | **Nein.** Leinwand = ganzes Produktfoto (quadratisch, 1200×1200). GEMESSEN: Druck 2,8× (Tasche) bis 3,4× (T-Shirt) kleiner als Vorschau (Abschnitt 2) | Ja: Bühne im Seitenverhältnis der Druckfläche, gestrichelt, «Druckfläche 30,5 × 40,6 cm», Rest = «wird nicht gedruckt» | v6 nicht live | M (Live-Plan Schritt 1–5) | **hoch (Blocker)** |
| 2 | **Platzierungen** (Vorne, Hinten, Ärmel, Etikett, Schnittteile) | alle als Reiter | nur Vorne/Hinten, nur bei 15 der 32 Produkte (GEMESSEN: 15× `data-img-back`) | alle Platzierungen der Modellkarte als Reiter, Sperren bei Konflikten, Punktmarke bei belegten Reitern | Aufpreis nicht abgerechnet (B2) | M | hoch |
| 3 | **Aufpreis je Platzierung** sichtbar und abgerechnet | Preis im Reiter (EDM: `showPricesInPlacementsTabs`) | gar nicht: «Hinten» ist gratis (GEMESSEN: Warenkorb CHF 24.90 für Vorne+Hinten) | Anzeige «+ CHF 6.10», aber nicht im Warenkorbpreis | Abrechnung fehlt (Preis anheben / Zusatzartikel / Platzierung nicht anbieten) | M | hoch |
| 4 | **Exakte Werte** (Position, Rotation, Grösse, Breite/Höhe getrennt) | Transform-Tab: Rotation, Scale, Breite/Höhe mit «Lock proportions» | X %, Y %, Grösse %, Drehung °, Deckkraft % (Prozent der Leinwand, nicht der Druckfläche) | X/Y in cm, Schrifthöhe mm, Foto-Breite cm, Drehung, Deckkraft; Mitte horizontal/vertikal | Breite und Höhe nicht getrennt (nur proportional) | S | mittel |
| 5 | **Ausrichten / Spiegeln / Drehen / Zuschneiden** | Knöpfe links, Rotationsfeld, Crop | Spiegeln, 90°, Zuschneiden, Einrasten in der Mitte; kein Ausrichten links/rechts/oben/unten | wie v5 plus «Mitte horizontal/vertikal» | Ausrichten an Druckflächenrand fehlt | S | gering |
| 6 | **Zoom** für Feinarbeit | Zoom-Knopf (nicht bei Allover) | nein | «Auf Druckfläche zoomen» / «Ganze Vorlage zeigen» | keine | – | mittel |
| 7 | **Ebenen** (Reihenfolge, Duplizieren, Löschen, Mischen von Datei/Text/Grafik) | Layers-Panel, Drag & Drop | Ebenenleiste, ▲▼, Duplizieren, Vorne/Hinten, Löschen | gleich | Drag & Drop der Liste fehlt | S | gering |
| 8 | **Rückgängig / Wiederholen** | ja | ja (Strg+Z/Y) | ja (60 Schritte) | keine | – | hoch (vorhanden) |
| 9 | **Text**: Schriften | «hundreds of fonts» (QUELLE Blog «How to create designs for print-on-demand»), Grösse, Farbe, Buchstabenabstand, Kontur oder Schatten, **Bogen** | **5 Systemschriften** (Helvetica/Georgia/Brush Script/Arial Black/Courier), je nach Gerät anders; Farben 8 + frei; fett/kursiv; Ausrichtung; Abstand; Kontur; Zeilenhöhe; kein Schatten, kein Bogen | gleich wie v5 | **Schrift gerätabhängig: zwei Geräte liefern verschiedene Druckdateien für denselben Text** (Hypothese zur Form, belegt nur im Code: keine Webfonts); Bogen/Schatten fehlen | M (Webfonts als woff2 in Shopify Files, `document.fonts.load` vor dem Zeichnen) | hoch |
| 10 | **Cliparts / Quick Designs** | 50+ Sammlungen, ca. 3 000 Grafiken, Quick Designs | 28 Emoji + wenige PNG-Sticker (`stk-index.json`, Rückfall 18 Namen) | gleich | kleine Bibliothek; Lizenz für Ausbau klären | L | mittel |
| 11 | **Eigenes Bild** hochladen, Qualitätsprüfung | PNG/JPG, Dateibibliothek, dpi-Warnung, **Auto-Hochskalieren** | PNG/JPG/WebP bis 10 MB; keine dpi-Warnung (v5-Regel 420 px laut v6-README); keine Bibliothek früherer Dateien | dpi auf dem Produkt, Warnung unter Katalog-Mindest-dpi (nie gegen 1200 px gemessen); keine Bibliothek | kein Hochskalieren, keine Bibliothek | M | hoch |
| 12 | **Hintergrund entfernen** | KI-Knopf (auch für Getty-Bilder) | «Freistellen» = Farbschlüssel aus den vier Ecken (nur einfarbige Hintergründe) | gleich | KI-Freistellung (z. B. Cloudinary-Zusatzdienst/Dienst eines Dritten: Kosten und Datenschutz klären) | M | mittel bis hoch |
| 13 | **Hintergrundfarbe/-grafik der Fläche** (Tasse, Hülle, Allover) | ja | nein | nein | fehlt | S–M | mittel |
| 14 | **Muster-Werkzeug** (Allover, Schuhe, Trinkgefässe) | ja (Pattern) | nein | nein; Schnittteile als Zeichnung, kein «Motiv auf alle Teile» | fehlt | L | mittel (14 Allover-Produkte im Shop) |
| 15 | **Vorschau auf dem Produkt** (Mockup, 3D) | «Mockups»-Knopf, Mockup-Generator, 3D | **nur das flache Druckbild** auf Karos, Beschriftung «Genau das wird gedruckt», nur die aktive Seite (GEMESSEN im Code und Ablauf) | flache Printful-Schablone in echter Lage (kein Foto-Mockup) | realistisches Mockup nur über Printfuls Mockup-Generator (Rate laut Doku 2 bis 10 Aufgaben/Minute) | M (flach, v6) / L (Foto-Mockup via Worker) | hoch |
| 16 | **Farbe/Grösse wählen im Editor** | Seitenleiste, Preis je Variante | über den Shopify-Wähler; Hintergrundfoto wechselt nur bei 3 Produkten (`data-img-map`), sonst bleibt das Foto stehen; Abfrage alle 500 ms | Vorlage in Variantenfarbe (Näherung: Farbfläche, kein Foto) | Farbvorlage nur Näherung | S | mittel |
| 17 | **Grössentabelle / Produktdetails** | Produktseite im Editor | nein | nein (Katalog hat `sizes`, wird nicht angezeigt) | fehlt | S | mittel |
| 18 | **Gültigkeitsprüfung** (Fehlerliste, Speichern gesperrt) | Druckqualität-Warnung, ausserhalb der Fläche; EDM `designValid/errors` | nur: leer, Datei > 10 MB, Upload-Fehler | dpi-Warnung, Hinweis «ausserhalb wird nicht gedruckt», Sperren; kein harter Stopp | harter Stopp bei Mindest-dpi fehlt | S | mittel |
| 19 | **Stickerei**: Garnfarben, Digitalisierungsgebühr | ja | nicht vorgesehen | Hinweise, **keine Garnfarben-Wahl** (der Sync verlangt sie als Pflichtoption, sonst Entwurf) | Garnfarben-Wahl fehlt; Gebühr (3.95/6.50 USD je Datei, QUELLE Blog) nicht modelliert | M | gering (1 Produkt: Dad-Cap) |
| 20 | **Entwurf speichern / weiterbearbeiten** | Vorlage speichern, Dateibibliothek | **nein** (GEMESSEN im Code: kein `localStorage`/`sessionStorage`); aus dem Warenkorb gibt es keinen Weg zurück in den Editor | nein | Design geht beim Verlassen der Seite verloren | M | mittel bis hoch (Handy) |
| 21 | **Platz auf dem Bildschirm** | ganzes Fenster | Desktop 1280×900: Editor nur **376 px** breit in der rechten Spalte (GEMESSEN); Handy 412: 380 px | dieselbe Spalte (Mock) | Vollbild-Dialog wie beim Designstudio für Handy und Desktop | M | mittel |
| 22 | **Sprache** | de_DE | de/en, fr fällt auf de | de/en | fr fehlt | S | gering |
| 23 | **Dateirichtlinien** | Tab «File guidelines» | nein | Hinweise je Platzierung | kurzer Hilfetext | S | gering |

Nicht verglichen, weil bei uns nicht vorgesehen: Premium-Bilder (Getty), 3D-Ansicht für Allover, Multi-Produkt-Übernahme («Add and edit»).

---

## 2. Bestellweg Ende-zu-Ende (ohne zu bezahlen)

### 2.1 Was ich getan habe (alles mit normaler Chrome-Kennung, nacheinander, Warenkorb danach geleert)

| Lauf | Fenster | Produkt | Ablauf | Ergebnis |
|---|---|---|---|---|
| 1 | 412×915 (Touch, Android-Kennung) | `bio-jutebeutel-selbst-gestalten` (SKU `2069171_10458`, Variante Oyster) | Text «Luxe Test» → «🛒 Mit meinem Design in den Warenkorb» | Weiterleitung auf `/cart`, 1 Position CHF 32.90; Warenkorb mit `/cart/change.js` geleert (`item_count 0`) |
| 2 | 1280×900 | gleiches Produkt | gleicher Ablauf | **identisches Ergebnis** (andere Datei, gleiche Schlüssel); geleert |
| 3 | 412×915 | `klassisches-unisex-t-shirt-selbst-gestalten` (SKU `8481330_11576`, S) | Text vorne «Luxe Test», Reiter «Hinten», Text «Rueckseite» | 1 Position CHF 24.90 für **beide Seiten**; geleert |

Dateien: `live_cart.cjs` (Skript), `cart_m412.json`, `cart_d1280_bio-jutebeut.json`, `cart_m412_klassisches-.json` (+ `_netz.json` mit Netzmitschnitt), Bilder `cart_*_1_text.jpg`, `cart_m412_2_cart.jpg`.
Es gab keine Seitenfehler des Editors; die Konsole zeigte nur Shopify-Rauschen (shop.app-Frame, Monorail).

### 2.2 Was im Warenkorb steht (GEMESSEN, `/cart.js`)

Jutebeutel (1 Seite):
```
properties = {
  "🎨 Design":    "Text: \"Luxe Test\"",
  "🖼️ Druckdatei": "https://res.cloudinary.com/dwyi6kkrl/image/upload/v1793912923/tsiqvkuuawrchdhjqnf3.png"
}
sku = 2069171_10458 · variant_id 55777965539713 · Preis 3290 · Bild = Blanko-Produktfoto
```
T-Shirt zweiseitig: vier Schlüssel `Vorne · 🎨 Design`, `Vorne · 🖼️ Druckdatei`, `Hinten · 🎨 Design`, `Hinten · 🖼️ Druckdatei`, je Seite eine eigene Cloudinary-Datei.
Netzmitschnitt: erst `POST api.cloudinary.com/v1_1/dwyi6kkrl/auto/upload` (unsigned, Preset), dann `POST /cart/add.js` mit `{"id","quantity":1,"properties":{…}}`, dann `window.location = /cart`. Es gibt keinen weiteren Aufruf (kein Server von uns, kein Printful beim Kauf).

### 2.3 Die Druckdatei (GEMESSEN, `druck_m412.png`, `h.txt`)

| Merkmal | Wert |
|---|---|
| Host | `res.cloudinary.com/dwyi6kkrl` (Cloudinary-Konto des Shops, unsignierter Upload; die Adresse ist öffentlich abrufbar, `cache-control: public, immutable, max-age=2592000`, `access-control-allow-origin: *`) |
| Format | PNG, 8 Bit, **RGBA (mit Transparenz)**, nicht interlaced, **ohne dpi-Angabe** (kein `pHYs`), ohne Farbprofil |
| Grösse | **1200 × 1200 px**, 40 621 Byte (ein Satz Text) |
| Pixel je Produkt | gleich für alle Produkte ausser Poster (`data-ref=2400`, `data-ratio=1.414` → 2400×3394): GEMESSEN an `/collections/selbst-gestalten-1/products.json`, nur das Poster setzt es |
| Erreichbarkeit für Printful | **ja**: Printfuls Mockup-Generator hat die Cloudinary-Adresse abgerufen und ein Mockup geliefert (2 Mockup-Aufgaben `gt-998500474`, `gt-998500758`, kein Auftrag) |
| Aufbewahrung | unbekannt (Cloudinary-Kontoplan und Löschregeln nicht einsehbar); meine 4 Testdateien (`tsiqvkuuawrchdhjqnf3`, `dnssurj9drxp0dtejan3`, `r0veayu5ehpfj2p1zy7q`, `uqxmj2lx79yt7nrd1b8b`) bleiben dort liegen (ca. 40 KB je Stück, ich habe keinen Löschzugang) |

### 2.4 Kommt die Datei so bei Printful an? (Planlogik mit echten Daten gefahren, nur lesend)

Ich habe die echten Warenkorb-Eigenschaften aus 2.2 in `planeBestellung()` der gehärteten Fassung (`automation/lib/printful_bestellweg.mjs`, nur importiert, nichts verändert) gefüttert, mit echten Printful-GETs (`/products/variant/…`, `/mockup-generator/printfiles|templates/…`), echtem Datei-Kopf von Cloudinary und einer Attrappe für die KI-Kontrolle (`plan.mjs`, `plan_v6.mjs`, `plan_ergebnis*.json`). Kein `POST` an Printful.

| Fall | Gesendet würde (Auftragsposition) | Befunde |
|---|---|---|
| A Jutebeutel, v5-Schlüssel | `variant_id 10458`, `files:[{type:"front", url}]` | **keine** |
| B Klass. T-Shirt, `Vorne ·`/`Hinten ·` | `variant_id 11576`, `files:[{type:"front"},{type:"back"}]` | **keine** |
| C Unisex-T-Shirt 71, v6-Schlüssel nachgestellt (`🖼️ Druckdatei (front)`, `(back)`, `(sleeve_left)`, `_pod_karte` mit `dt:{front:"default"}`) | `variant_id 4011`, `files:[{type:"default"},{type:"back"},{type:"sleeve_left"}]` | **keine** |

- **Format/dpi:** PNG ist erlaubt. Rechnung mit der Funktion `wirklicheDpi` gegen die Katalog-Druckdatei: Jutebeutel 1200 px auf 1500×1500@150 = **120 dpi** (Mindest 75, ok); T-Shirt 1200 px auf 1800×2400@150 (fit) = **100 dpi** (Mindest 75, ok); Tasse 11 oz = 343 dpi; **Kuscheldecke (Modell 395, 6450×4950@150) = 28 dpi, Mindest 75: zu klein** → Befund `aufloesung`, Entwurf. Das deckt sich mit der Doku Strom 3 (`dropship/selbst-gestalten-fertig-0511/bestellweg/README.md`): 18 von 37 v5-Produkten fallen mit 1200 px unter die Mindest-dpi (QUELLE; ich habe 6 selbst nachgerechnet, 1 davon fällt durch). Solche Bestellungen bleiben bewusst Entwurf.
- **Platzierung:** v5-Schlüssel ohne «Hinten»/«Back» gelten als Vorderseite, `platzierungenFuerDateien` bildet sie auf die Dateiliste des Printful-Produkts ab; Printful-Dokumentation nennt `type: "front"` und `"default"` in ihren Beispielen (api_docs_v1.md Z. ~4048 und ~4091). **Mehrere Platzierungen** (v6) werden über `🖼️ Druckdatei (<ID>)` und `_pod_karte.dt` sauber getrennt (Fall C, keine Befunde). Die veraltete Warnung im v6-README («printful_sync liest nur vorne/hinten») gilt für die **gehärtete** Fassung nicht mehr.
- **Variante ohne Zuordnung:** SKU ohne `_<Zahl>` am Ende → harter Befund `ohne-variante`, kein Auftrag, Tag `printful-review`, eine Telegram-Meldung (Code gelesen, Test `printful_sync_test.mjs` laut Doku; von mir nicht ausgelöst). 31 der 32 Produkte der Sammlung tragen eine solche SKU, und jede findet ein Katalogmodell (GEMESSEN offline: 0 ohne Modell). Ausnahme: der Bügeltransfer (SKU `TRANSFER-A3`/`TRANSFER-A5`, kein Printful-Produkt, Tags ohne `wunschdesign`): bei ihm meldet der Sync `druckdatei-ohne-pod` (Code gelesen), er bleibt Handarbeit (so lief #1024).
- **Nicht ausgeblendete Ware:** Von den 32 Produkten liegt keines in der Ausblendliste `dropship/codex-katalog/ausblenden.json` (40 Modelle), und keine ausgeblendete Variante steht im Shop (GEMESSEN offline gegen die Sammlungsdaten von 20:38 UTC). Kein Handlungsbedarf bei den vorhandenen Produkten; die Liste wirkt erst bei neuen (Modell-Fabrik).
- **Der Auftrag besteht nur aus** `{external_id "LX<Nr>", recipient, items:[{variant_id, quantity, files, options?, external_id}]}`: **keine `position`**, keine `retail_costs`, keine `packing_slip`/`gift`-Angaben, kein Versandwunsch (Printful-Standard). Empfänger: Name, Adresse, Land, PLZ, E-Mail, Telefon aus Shopify.

### 2.5 Die zentrale Lücke: Vorschau ≠ Druck (GEMESSEN)

Versuch: die Datei aus dem Warenkorb als Mockup an Printful geben, mit der Position, die Printfuls Doku für «fit» beschreibt (quadratisches Bild in voller Breite der Druckfläche, mittig; `mock.mjs`, Bilder `img/mock_tote.jpg`, `img/mock_tee.jpg`), und mit dem Bildschirmfoto des Editors vergleichen (`cart_m412_1_text.jpg`).

| | Text im Editor (Vorschau) | Text im Mockup (Druck) | Faktor |
|---|---|---|---|
| Jutebeutel | 118 px breit = 31 % der Leinwand = **50 % der Taschenbreite**, Mitte bei **42 %** der Bildhöhe | 111 px von 1000 = 11 % des Bildes = **18 % der Taschenbreite**, Mitte bei **61 %** der Bildhöhe | **2,8× kleiner**, 19 % der Bildhöhe tiefer |
| Klass. T-Shirt | 118 px = **49 % der Shirtbreite** (242 px) | 111 px = **14 % der Shirtbreite** (773 px) | **3,4× kleiner** |

Erklärung (GEMESSEN am Katalog): Für den Jutebeutel (Modell 367) ist die Druckfläche 1110×1110 von 3000×3000 Vorlagen-Pixeln = **37 % der Bildbreite**, linke Kante bei 31,6 %, obere bei 45,4 %. Das Foto im Editor (`data-img-front`) ist praktisch dasselbe Bild wie Printfuls Vorlage (Tasche = 61,8 % der Bildbreite in beiden, gemessen mit Pixelzählung). Der Editor behandelt das ganze Foto als Leinwand; gedruckt wird die Leinwand aber in die Druckfläche: 1/0,37 = 2,7, das passt zur gemessenen 2,8. Beim T-Shirt (Druckfläche 1800×2400, die 1200×1200-Datei wird breitenfüllend und mittig eingepasst) und bei der Tasse (Druckfläche 2700×1050: die quadratische Datei füllt nur 39 % der Breite, Rechnung) ist es dasselbe Muster.

Grenzen der Aussage: (a) Das Mockup nutzte die **dokumentierte** «fit»-Regel; was Printful bei einem **Auftrag ohne `position`** tut, steht in der Doku nicht und ist **ungemessen** (Annahme: dieselbe Regel). Der Beleg wäre beim ersten Auftrag die Datei `items[].files[type=preview]` (Printful erzeugt sie selbst, GEMESSEN am Auftrag #1033: `type: preview`, 1000×1000, `visible: false`). (b) Die Zahlen gelten für diese zwei Produkte und je einen Text; Bilder wurden mit den Pixeln der Screenshots ausgemessen (±5 %). (c) Die Beschriftung des Editors «🖼️ Genau das wird gedruckt» in der Druck-Vorschau ist für die Lage/Grösse auf dem Produkt irreführend, sie meint nur die Datei.

Folge für die Kundin: Sie platziert einen Schriftzug gross auf der Brust und erhält ihn klein und tiefer. Das ist der typische Reklamationsgrund. v6 (Bühne = Druckfläche, Datei in der Pixelgrösse des Printfiles, Mass in cm) behebt es in der Konstruktion; ein Browser-Livetest von v6 am Shop steht aus.

### 2.6 Was sieht die Kundin nach dem Klick?

| Ort | Was sie sieht | Marke |
|---|---|---|
| Warenkorbseite | Zeile «🎨 Design: Text: "Luxe Test"» und «🖼️ Druckdatei:» mit **72-px-Miniatur des flachen Entwurfs** und Link «Dein Entwurf ansehen» (Theme `snippets/cart-products.liquid`, Zeilen 238–248, seit 19.10.). **Das Positionsbild der Position bleibt das leere Produktfoto.** | GEMESSEN (Screenshot `cart_m412_2_cart.jpg`) |
| Kasse (Checkout) | Shopify zeigt Zeilen-Eigenschaften im Checkout; ein Unterstrich am Anfang des Schlüssels blendet sie aus (QUELLE: community.shopify.dev «Docs for line item properties needs updating»). Die Schlüssel «🎨 Design»/«🖼️ Druckdatei» beginnen nicht mit `_`, die Kundin sähe also die **rohe Cloudinary-Adresse**. | QUELLE; **nicht gemessen** (ich habe die Kasse nicht geöffnet, um die Statistik «Kasse erreicht» nicht zu verfälschen) |
| Bestätigungsmail / Bestellstatusseite | Standardvorlagen geben Eigenschaften als Text aus (Schlüssel: Wert); ob der Shop die Vorlagen angepasst hat, ist per API nicht lesbar (Benachrichtigungsvorlagen sind in der Admin-API nicht abfragbar, unbekannt). Hypothese: Text und rohe Adresse, kein Bild. | Hypothese |
| Versandmail | `printful_tracking.mjs` meldet die Sendung täglich 15:23 UTC über `fulfillmentCreate` mit Versandmail (Doku, Memory); ohne Bild vom Design. | QUELLE |

Bei Printful (nicht beim Kunden) erzeugt jede Auftragsposition automatisch ein `preview`-Bild (GEMESSEN #1033: 3 Positionen, je ein `preview` 1000×1000), das wir der Kundin nie zeigen.

### 2.7 Weitere Befunde am Weg

- **Es gibt keinen Weg am Editor vorbei auf der Produktseite oder der Sammlung** (GEMESSEN 412×915): kein Standard-Kaufknopf, keine Sticky-Leiste, kein Schnellkauf auf den Karten; der Knopf «🎨 Zuerst dein Design gestalten» springt zum Editor. Offen ist nur der direkte Weg (`/cart/add.js`, Shop-App, Google-Link mit `?variant=`): Hypothese, nicht ausprobiert. Dort greift im Sync der harte Befund `keine-druckdatei`: die Kundin hätte dann bezahlt, ohne dass etwas gedruckt werden kann.
- **Bisher durchgelaufene Bestellungen mit Editor-Eigenschaften:** nur #1024 (Bügeltransfer, 11.10., Schlüssel `🎨 Design` und `🖼️ Druckdatei`, nicht über Printful). #1005 (WM-Trikot, Tag `wunschdesign`) trug **keine** Eigenschaften, #1033 (Sticker) kam über das Produkt-Metafeld `custom.print_file` (GEMESSEN: Shopify-Abfrage aller 34 Bestellungen #1003 bis #1036, 05.11. 21:2x UTC). Der Pfad Editor → Printful ist also nie mit einer Kundin gelaufen.
- **Kosten:** Für das klassische T-Shirt (Shop CHF 24.90) rechnet die Preisformel des Repos mit Printfuls Preis 9.44 USD (GEMESSEN `GET /products/variant/11576`) und den Aufpreisen laut Katalog (Rückseite 5.95, Ärmel 2.49, Etikett aussen 2.49, innen 0.99, Stickerei 2.95; GEMESSEN). Rechnung mit **Annahme** Versand 10.39 USD (Messwert eines anderen T-Shirts aus dem Memory): nur Vorderseite **+CHF 4.04**, Vorder- plus Rückseite **−CHF 1.31** je Stück. Jutebeutel (Shop CHF 32.90, Preis 15.87 USD): +7.53 bzw. +2.18 (Versand 8.00 USD geschätzt). Der Kosten-Wächter (`PRINTFUL_MIN_NETTO_CHF`, Vorgabe 0) würde das Verlust-T-Shirt als Entwurf anhalten.
- **Bestätigen kostet:** Der Sync legt zuerst einen Entwurf an und bestätigt danach (zweiter Aufruf). Printful belastet die hinterlegte Zahlungsart; beim Fall #1033 scheiterte die Karte zuerst («Invalid Card Number»). Das fängt der Sync als Befund `zahlung-fehlgeschlagen` auf (Doku).
- **Auslöser fehlt (GEMESSEN):** `dropship/PRINTFUL-SYNC-FREI.txt` ist nicht vorhanden; `.github/workflows/printful-sync.yml` im Arbeitsbaum hat den vorbereiteten Zeitplan (06:41 und 13:37 UTC), schreibt aber nur mit der Datei; in `main` ist der Zeitplan laut Memory seit 13.06. pausiert (nicht von mir nachgeprüft).
- **KI-Kontrolle ist Pflicht** (`PRINTFUL_KI_KONTROLLE=pflicht`): Laut Memory ist das Gemini-Guthaben leer (HTTP 402); der Prompt prüft ausserdem nur «leer/unscharf/hasserfüllt», **keine Markenrechte**.
- **Zwei Editoren auf einer Seite:** Die Produktbeschreibung lädt zusätzlich `lspod-designer-v5.js` (wirkungslos wegen Guard); die Theme-Datei lädt nur, wenn die Beschreibung `lspod-designer` enthält. Beim Umstellen auf v6 muss der Block ersetzt werden (v6-README Live-Plan Schritt 5).

---

## 3. Designstudio (`?view=luxe-studio`)

**Gemessen (412×915, Chromium, `studio.cjs`):** Einstieg «Im Vollbild gestalten» → Schritt 1 «Weiter: gestalten» → Schritt 2 «Vorschau ansehen» → Schritt 3 «Weiter gestalten» | «Entwurf behalten». Nach dem Klick auf «Entwurf behalten»: Dialog zu (`open:false`), Adresse gleich, **keine Anfrage an Warenkorb oder Cloudinary** (die fünf `checkout-web`-Skripte, die im Mitschnitt auftauchen, sind Shopifys Vorladen, nicht vom Studio); im Dialog 0 Links und 0 Formulare. Der Hinweistext auf der Seite sagt «es wird nichts bestellt». Der Quelltext-Befund eines anderen Untersuchers (Z. 145 schreibt in eine Klasse, die es nicht gibt; `state.step` wird nie zurückgesetzt) deckt sich mit meiner Messung (`work/A/studio.md`).
**Wege hinein (GEMESSEN, curl):** Sammlungsseiten `/collections/selbst-gestalten-1` und `/collections/selbst-gestalten`: 0 Links auf `view=luxe-studio` (sie führen auf die normale Produktseite mit Editor). Das **Katalogfenster `?view=luxe-gestalten`: 96 Links** `…/products/<handle>?view=luxe-studio` (32 Produkte × 3). Wer dort einsteigt, landet in der Vorschau-Sackgasse.

| Option | Urteil |
|---|---|
| Bleiben, wie es ist | **Nein.** Sackgasse, bestellt nichts, keine Druckfläche (`printArea` fehlt in den Daten, deshalb immer «neutral»/«Druckvorlage noch offen»), Bilder nur als `blob:`-Adressen (gehen beim Verlassen der Seite verloren), nur 3 Schriften, keine Rückseite, kein Upload (GEMESSEN im Code durch den anderen Untersucher). |
| Verschwinden | **Sofort für die Kundinnen:** die 96 Links im Katalogfenster auf `…/products/<handle>?variant=<id>#lspod-start` umstellen (Sprungziel und Fokus gibt es bereits, Memory 04.11.). Die Studio-Dateien können ruhen, bis v6 live ist. |
| In den Bestell-Editor aufgehen | **Ja, als Ziel.** Übernehmen aus dem Studio: der Vollbild-Dialog (auf dem Handy und auf dem Desktop hat v5 nur 376–380 px Breite), der Dreischritt «Produkt wählen → Motiv gestalten → Vorschau prüfen mit Preis» und der Produktwechsel aus dem Katalog. Nicht übernehmen: die Studio-Ebenenlogik (v6 kann alles davon). Der letzte Schritt muss in den Warenkorb führen. Aufwand M, nach v6-Live. |

---

## 4. Was fehlt bis zur echten Bestellung (priorisiert)

### BLOCKER (ohne diese Punkte nicht verkaufen oder sicher Reklamationen)

1. **Vorschau ≠ Druck im live Editor v5** (2,8× bis 3,4× kleiner, andere Lage; Abschnitt 2.5). Betroffen: alle 31 aktiven Produkte. → v6 nach dem Live-Plan im Pilot (Entwurfsprodukt) prüfen und umstellen; bis dahin entweder die Produkte vom Kauf nehmen oder im Editor deutlich zeigen, dass das Foto nicht die Druckfläche ist. Test danach: dieselbe Messung (Mockup gegen Bildschirm) am v6-Produkt.
2. **Aufpreise für Rückseite/Ärmel/Etiketten** (Abschnitt 2.7: -1.31 CHF je Stück beim T-Shirt mit Rückseite, Rechnung mit Annahme Versand). Entscheid des Besitzers: Preis anheben / «Zusatzdruck»-Artikel als zweite Position / Platzierungen mit Aufpreis nicht anbieten (Karte ohne sie bauen). Die v5-«Hinten»-Reiter bei 15 Produkten kosten schon heute Geld, sobald jemand bestellt (der Kosten-Wächter hält solche Aufträge nur an).
3. **Auslöser und Freigabe des Sync:** Freigabedatei und Zeitplan fehlen; KI-Kontrolle ohne funktionierenden Schlüssel macht jede Bestellung zum Entwurf. Entscheid: `PRINTFUL_KI_KONTROLLE=aus` setzen oder Guthaben laden; für die **ersten drei Aufträge `PRINTFUL_AUTO_CONFIRM=0`** (Entwurf prüfen, Printfuls `preview`-Bild mit der Vorschau der Kundin vergleichen, Aufträge von Hand bestätigen). Erst danach die Freigabedatei legen.
4. **Mindest-Auflösung:** 18 von 37 v5-Produkten (u. a. Kuscheldecke 28 dpi gegen Mindest 75, selbst nachgerechnet) können mit der festen 1200-px-Datei nie bestätigt werden. Diese Produkte bleiben bis v6 nicht verkaufbar (Entwurf) oder laufen immer über Handarbeit. Die verbleibenden 19 sind unkritisch.
5. **Bestellung ohne Design:** Es braucht einen festgelegten Ablauf (Mail an die Kundin, Rückerstattung), weil der Sync hart stoppt (`keine-druckdatei`). Hypothese zu den Wegen (Shop-App, Google-Link, Direkt-URL), nicht ausprobiert.

### WICHTIG (vor dem Bewerben, zum Teil vor der ersten Kundin)

6. **Das Gesehene nach dem Kauf:** Warenkorb zeigt eine flache 72-px-Miniatur, **keine Ansicht auf dem Produkt**; Kasse und Mail zeigen vermutlich die rohe Adresse. Massnahmen: Schlüssel der Adresse mit `_` beginnen (aus dem Checkout verbergen) und die sichtbare Zeile «Design: …» behalten (S); das Printful-`preview` bzw. ein eigenes Foto-Mockup in Mail und Warenkorb (M bis L); Mailvorlage prüfen (nur der Besitzer sieht sie).
7. **Realistische Vorschau** («Vorschau auf Produkt»): im Editor v6 flache Schablone in echter Lage (vorhanden); ein Foto-Mockup wäre ein Cloudflare-Worker-Aufruf an Printfuls Mockup-Generator (Rate 2–10 Aufgaben/min laut Doku, Zwischenspeicher je Datei). Ungemessen: Dauer; die zwei Aufgaben von mir kamen schon beim ersten Abruf zurück.
8. **Schriften:** nur 5 Systemschriften, je Gerät anders gezeichnet: gleiche Eingabe, andere Druckdatei. Webfonts (M).
9. **Druckdatei-Hosting und Datenschutz:** Kundenbilder liegen öffentlich erreichbar bei Cloudinary (unsigned, Aufbewahrung unbekannt, Konto-Limits unbekannt); die Datenschutzerklärung und die Zusage, bis zum Druck verfügbar zu bleiben, sind zu prüfen (Besitzer).
10. **Design speichern / aus dem Warenkorb zurück zum Editor** (M): sonst muss die Kundin neu beginnen; auf dem Handy geht bei einem Tab-Wechsel alles verloren (Hypothese zum Verhalten, im Code gibt es keinen Speicher).
11. **Rechtliches:** Rückgabe bei personalisierter Ware (die Meta von mindestens 42 «Selbst gestalten»-Produkten sagt «30 Tage Rückgabe», der Kasten schliesst sie aus; offen seit 28.10., QUELLE Memory 04.11.), Markenrechte an Kundenmotiven (KI-Kontrolle prüft das nicht). Besitzerentscheid.
12. **Desktop:** Editor-Breite 376 px bei 1280 px Fenster (GEMESSEN). Vollbild-Dialog (aus dem Studio übernehmen, M).
13. **Stickerei-Produkte** (Dad-Cap): Garnfarben-Wahl fehlt im Editor, der Sync verlangt sie: bleibt Entwurf. Entweder Garnfarben in v6 (M) oder das Produkt nicht anbieten.

### SCHÖN

14. Bibliothek mit Cliparts und Quick Designs (L, Lizenz klären), KI-Freistellung (M), Hintergrundfarbe/-grafik der Fläche (S–M), Muster-Werkzeug und «Motiv auf alle Teile» für Allover (L), Bogen- und Schattentext (S–M), Raster/Hilfslinien (S), Grössentabelle im Editor (S), Dateirichtlinien-Hilfe (S), Hochskalieren (M), Dateibibliothek (M), Sprache fr (S).

---

## 5. Ungeprüft / Grenzen

- **v6 nicht am Shop gemessen** (nicht live; nur Code, README, Screenshots). Alle v6-Aussagen sind Doku/Code, die Prüfung am echten Produkt steht im Live-Plan Schritt 4.
- Kasse, Bestätigungsmail und Bestellstatusseite **nicht gesehen** (Kasse bewusst nicht geöffnet; Mailvorlagen nicht lesbar).
- Das Verhalten von Printful bei Dateien **ohne `position`** im Auftrag ist ungemessen (Mockup mit der dokumentierten Regel stand stellvertretend). Ein Entwurfsauftrag war mir nicht erlaubt.
- Zahlenangaben aus Screenshots (Textbreiten) ±5 %.
- Versandkosten in der Margenrechnung sind **Annahmen** (10.39 USD für ein anderes T-Shirt aus dem Memory, 8.00 USD geschätzt für den Beutel); Printful stellt 8,1 % Steuer zusätzlich in Rechnung (Memory), im Kosten-Wächter abgezogen wie in der Preisformel.
- Die Printful-Doku zum EDM ist im Bericht des anderen Untersuchers (`work/edm/bericht.md`); Fazit dort: EDM kein Weg (403 für unseren Schlüssel, Store-Typ `shopify`). Ich habe es nicht erneut getestet.

## 6. Nebenwirkungen meiner Tests (vollständig)

- 3 Testwarenkörbe im Live-Shop (Headless-Chromium), alle mit `/cart/change.js` geleert (`item_count 0` jeweils bestätigt). Kein Checkout, keine Bestellung. Shopify-Statistik kann 3 «In den Warenkorb»-Ereignisse und Seitenaufrufe aus Rechenzentrums-Adressen enthalten.
- 4 Dateien (je ca. 40 KB) bei Cloudinary hochgeladen (siehe 2.3), nicht löschbar für mich.
- 2 Printful-Mockup-Aufgaben (von höchstens 6 erlaubt), kein Auftrag, kein Entwurf; Printful-GETs (`/orders/183834327`, `/orders/165452870`, `/products/variant/…`, `/mockup-generator/printfiles|templates/…`).
- Shopify: eine lesende GraphQL-Abfrage (alle 34 Bestellungen, Zeilen-Eigenschaften und Tags), kein Schreiben.
- Firecrawl: 5 Aufrufe (Suche Design Maker, Blog, Hilfeseite, Suche Shopify-Eigenschaften; ein Abruf der Printful-v1-Doku lief ins Zeitlimit, dafür nutzte ich die vom anderen Untersucher gespeicherte Kopie `work/edm/api_docs_v1.md`).
- Lesende `git`-Aufrufe (`status`, `log`, `diff --stat` je einmal), nichts geschrieben. Kein Commit, kein Klonen.
- Dateien im Repo unverändert (Dateien nur gelesen); alle Skripte und Ergebnisse unter `…/ds/work/luecke/`.
- Der Printful-Schlüssel steht in keiner Datei und in keinem Bericht.

## 7. Dateiverzeichnis (`…/ds/work/luecke/`)

`live_cart.cjs` (Ablauf Editor→Warenkorb), `cart_m412.json`, `cart_d1280_bio-jutebeut.json`, `cart_m412_klassisches-.json`, `*_netz.json` (Netzmitschnitt), `cart_*_1_text.jpg`/`cart_m412_2_cart.jpg` (Bilder), `druck_m412.png` + `h.txt` (Druckdatei und Kopfzeilen), `plan.mjs`/`plan_v6.mjs`/`plan_ergebnis*.json` (Planlogik mit echten Daten), `mock.mjs` + `img/mock_tote.jpg`/`img/mock_tee.jpg` (Mockups), `bbox.cjs` (Pixelzählung Tasche), `dpi.mjs` (Rechnung), `studio.cjs` + `studio_schritt3.jpg`, `bypass.cjs` + `bypass_pdp.jpg`, `v5.pretty.js` (v5 lesbar gemacht), `order_1033.json`/`order_old.json` (Printful-Aufträge, nur Lesen), `pf_blog_features.md` (Auszug Printful-Blog).
