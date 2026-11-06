# Vorschau auf dem Produkt: Printful-Mockup-Generator (A) gegen Canvas im Browser (B)

Untersucher 2, Stand 05.11.2026 abends (UTC 21:00 bis 21:15). Marken: GEMESSEN = selbst gemessen am 05.11.2026, QUELLE = Dokumentation (Link, Abruf 05.11.2026), Hypothese, unbekannt.
Ordner: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/mock/`

## 1. Ergebnis in sechs Sätzen

1. **B (Canvas im Browser) reproduziert die Printful-Produktbilder für Kleidungsstücke praktisch pixelgleich**, weil die Printful-Vorlagen (`GET /mockup-generator/templates/<id>`) genau die Ebenen sind, aus denen Printful selbst rendert: Hintergrundfarbe oder -textur, Design in der Druckfläche, Vorlagenbild obendrauf. GEMESSEN am Hoodie 294 (Schwarz und Weiss): Design-Rahmen höchstens 1 bis 4 px neben dem Printful-Mockup (800 px Bild), Stoff-Grauwert 26,1 gegen 26,1 (Schwarz) und 236,4 gegen 236,9 (Weiss), mittlere Abweichung 3,0 bzw. 3,5 von 255 je Kanal über alle Kleidungs-Pixel.
2. **B ist live bedienbar**: Neuzeichnen kostet bei 1000 px Zeichenfläche 1 bis 8 ms (Raster) und die Bildrate bleibt bei 15 bis 24 ms je Bild; Farbwechsel braucht nur das Vorlagenbild des Modells (12 bis 342 KB, danach zwischengespeichert), Platzierungs-Reiter (vorne, hinten, Ärmel) funktionieren mit denselben Daten.
3. **B deckt nicht alles realistisch ab**: von 537 in die Schweiz bestellbaren Modellen haben 294 (55 %) ein Foto-Vorlagenbild (Kleidung, Taschen, Mützen, Hüllen), 243 (45 %) nur ein Raster-Layout (davon 123 Allover-Modelle, dazu Poster, Tassen, Postkarten); dort zeigt B ohne Sonderbau nur das Layout, für Tasse und Papier habe ich Zusatz-Adapter gebaut und gemessen.
4. **A (Printful-Mockup-Generator) liefert die schönsten Bilder** (Models, Seitenansichten, echte Stickerei, Tasse in 3D, Hülle am Handy), braucht aber 4,6 bis 11,4 s je Aufgabe, ein öffentlich erreichbares Design-Bild, einen Server (der Printful-Schlüssel darf nicht in den Browser) und ist auf **10 neue Aufgaben je 60 s je Store** begrenzt (GEMESSEN am Header, QUELLE Docs).
5. **Empfehlung: Mischung.** B als Live-Vorschau beim Gestalten (Fotovorlagen-Modelle sofort, Tasse/Poster mit Adapter), und das B-Bild als JPEG (25 bis 65 KB, 8 bis 66 ms Export) an den Warenkorb-Eintrag hängen; A nur dort, wo B unehrlich wäre (Stickerei, Allover) und nur als Knopf «Echtes Vorschaubild erzeugen» hinter einem Server-Relais mit eigener Drosselung, oder intern einmal je Bestellung als Prüfbild.
6. **Nichts davon ist live**, nichts im Shop oder bei Printful geschrieben, kein Auftrag; verbraucht: genau 6 Mockup-Aufgaben (Obergrenze erreicht), sonst nur lesende Abfragen.

## 2. Weg A: Printful Mockup Generator (API v1)

### 2.1 Parameter (QUELLE https://developers.printful.com/docs/ , Abschnitt «Mockup Generator API», Abruf 05.11.2026)
- Aufgabe anlegen: `POST /mockup-generator/create-task/{product_id}`, Body: `variant_ids[]`, `format` (`jpg`|`png`, PNG mit Transparenz), `width` (50 bis 2000, Vorgabe 1000), `option_groups[]` und `options[]` (Ansichten, aus `GET /mockup-generator/printfiles/{id}`), `product_options{}` (z. B. `lifelike`, bei Stickerei Garnfarben), `files[]` mit `placement`, `image_url` und `position{area_width, area_height, width, height, top, left}` (alles relativ zur Druckfläche, bei `fill_mode: fit|cover`), oder `product_template_id` statt `files`.
- Ergebnis abholen: `GET /mockup-generator/task?task_key=...`, Status `pending` bis `completed`, Ergebnis `mockups[]` (je Platzierung und Variantengruppe `mockup_url`, dazu `extra[]` mit `title/option/option_group/url`) und `printfiles[]` (von Printful gebaute Druckdatei).
- Docs: erste Abfrage nicht vor 10 s, Mockup-URLs sind vorübergehend (Text sagt 72 h an einer Stelle, «a day» an anderer), Limit 20 000 erzeugte Dateien je Konto und 24 h, Aufgaben-Limit siehe 2.3, bei Überschreitung 60 s Sperre.
- **Ohne `option_groups` liefert Printful «das erste verfügbare Mockup»**; mit Angaben viele Ansichten (Docs: «bigger task processing times»).
- API v2 (`POST /v2/mockup-tasks`, `mockup_style_ids`, `mockup_width_px`) existiert (QUELLE https://developers.printful.com/docs/v2-beta/ , Abruf 05.11.2026); dort gilt der Leaky-Bucket mit Standard 120 je 60 s für alle Endpunkte, «künftig höher oder niedriger je Endpunkt». GEMESSEN: der Schlüssel liest v2 (`GET /v2/catalog-products/294/mockup-styles` HTTP 200, Header `x-ratelimit-policy: 120;w=60`). **Das Limit für `POST /v2/mockup-tasks` ist unbekannt** (nicht getestet, hätte eine der 6 Aufgaben gekostet).

### 2.2 Messung an sechs Modellen (Design: LuxeStyle-Logo bzw. Foto des Plüsch-Hochlandrinds, beide öffentlich auf luxestyle.ch bzw. cdn.shopify.com)
Skript `run_mockup.mjs`, Rohdaten `out/<name>.json`, Bilder `mockups/<name>/`. Abfrage erst nach 4 s, dann alle 3 s: Zeiten sind obere Grenzen mit rund 3 s Auflösung. «Fertig» = Zeit von POST-Beginn bis `completed`.

| Modell | Varianten | Ansichten/Dateien | POST | Fertig | Dateigrösse (800 px, JPEG) | Header nach POST (limit / remaining / reset) |
|---|---|---|---|---|---|---|
| 294 Hoodie Bella+Canvas 3719 | 2 (Weiss M, Schwarz M) | 20 (je 10: Ghost vorne/links/rechts/hinten, Men's vorne/links/links-vorne/hinten/rechts/rechts-vorne) | 0,74 s | 11,4 s | im Mittel 44 KB | 10 / 9 / 60 |
| 19 Tasse | 2 (11 oz, 15 oz) | 6 (Standard, «Handle on Left», «Front view») | 0,47 s | 7,9 s | 30 KB | 10 / 8 / 22 |
| 171 Poster 10×10 Zoll | 1 | 1 | 0,43 s | höchstens 4,6 s | 90 KB | 10 / 9 / 60 |
| 181 iPhone-15-Klarhülle | 1 | 2 (Hülle allein, «Case with phone») | 0,36 s | 11,0 s | 61 KB | 10 / 8 / 25 |
| 206 Dad Hat (Stickerei vorne) | 1 (Khaki) | 7 (Hauptbild, 5 Flat-Ansichten, Produktdetail) | 0,48 s | 7,9 s | 58 KB | 10 / 9 / 60 |
| 257 Allover-T-Shirt Herren | 1 (Weiss M) | 4 (vorne, links, rechts, hinten; Foto vorne, Logo hinten) | 0,47 s | höchstens 4,7 s | 83 KB | 10 / 8 / 21 |

- **Laufzeit GEMESSEN: 4,6 bis 11,4 s, kein Zusammenhang nur mit der Dateizahl** (Hülle: 2 Dateien, 11,0 s; Allover: 4 Dateien, ≤ 4,7 s). Für Live-Ziehen und Skalieren zu langsam; für «Vorschau prüfen» mit Wartebalken tragbar.
- **Ratenlimit GEMESSEN:** alle sechs POST-Antworten tragen `x-ratelimit-limit: 10` (Lesezugriffe: 120). Das ist der Wert «etablierter Store» (QUELLE Docs: 10 je 60 s, neue Stores 2). Der Zähler lief als festes 60-s-Fenster (`reset: 60` beim ersten Aufruf, dann 22, 25, 21 abwärts). **Mehrfach `remaining: 8` mit Reset 21 bis 25 s**, obwohl ich zwischen den Aufgaben über 30 s wartete: im selben Store hat ein anderer Verbraucher kurz vorher eine Aufgabe angelegt (vermutlich ein paralleler Agent). Der Zähler gilt je Store, nicht je Absender. Eine 429-Antwort habe ich nicht herbeigeführt (hätte die 60-s-Sperre für alle ausgelöst); Verhalten bei Überschreitung nur aus den Docs.
- **Mockup-URL-Lebensdauer GEMESSEN:** `x-amz-expiration: expiry-date="Mon, 09 Nov 2026 00:00:00 GMT", rule-id="AutoDelete"` für eine am Do 05.11. 21:00 erzeugte Datei: rund 75 Stunden; die Docs-Angabe «72 h» stimmt (die Löschung rundet auf Mitternacht). **Bilder müssen sofort gespeichert werden.**
- Hosting des Bildes: Printful holt `image_url` selbst, also öffentlich nötig. Die Rückgabe `printfiles[].url` zeigt, dass Printful dabei die Druckdatei in Druckgrösse selbst baut.

### 2.3 Qualität (Bilder angesehen, Contact-Sheets `sheet_hoodie.jpg`, `sheet_A1.jpg`, `sheet_A2.jpg`)
- Hoodie: Model-Foto und Ghost-Bild, Design sitzt an der richtigen Stelle, Hintergrund des JPG-Fotos bleibt als weisse Box sichtbar (so würde es gedruckt, auf Weiss unsichtbar).
- Tasse: 3D-Foto mit Henkel links/rechts und Frontansicht, Logo umlaufend, wirkt echt.
- Hülle: Hülle auf dem Handy und Hülle allein, echte Kameraaussparung.
- Mütze: **echte Stickerei-Optik** (Fadenstruktur, Garnfarben Schwarz und Gold aus `product_options.thread_colors_front_large`; `embroidery_type: flat`), Innenansicht, Seiten.
- Allover-Shirt: Model vorne, Seiten, Rücken, Muster läuft über die Nähte.
- Poster: flache Fläche mit Schatten (kein Rahmen, kein Wandbild).

### 2.4 Taugt A für eine öffentliche Vorschau bei vielen Kundinnen?
- **Nicht als Live-Vorschau.** Rechnung (Hypothese, aus den Messwerten): 10 Aufgaben je Minute je Store ergeben höchstens 600 je Stunde. Jede vorschauende Kundin braucht je Änderung eine Aufgabe, 5 bis 11 s Wartezeit und ein öffentliches Design-Bild. Der Zähler ist mit allen anderen Mockup-Verbrauchern im Store geteilt; ein Skript, das 10 Aufgaben in einer Minute anlegt, sperrt alle anderen 60 s (Missbrauchsrisiko).
- **Nur mit Server-Relais:** der Printful-Schlüssel darf nicht in die Seite. Es braucht also einen Server (Cloudflare-Worker `workers/shop-brain` existiert im Repo) mit eigener Drosselung (z. B. je Besucher eine Aufgabe je 30 s, global höchstens 6 je Minute, damit Reserve bleibt).
- Das Design-Bild ist beim Warenkorb schon öffentlich: GEMESSEN im Quelltext der Referenzkopie `pod/live/lspod-designer-v5-safe.js`: der Editor lädt Bilder und die gebackene Druckdatei **ungesigned zu Cloudinary** (`api.cloudinary.com/v1_1/<Name>/auto/upload`, `secure_url`) und legt sie als `properties[...]` in den Warenkorb-Eintrag (`/cart/add` per fetch). Eine `image_url` für Printful ist also vorhanden.
- Kosten: die Docs nennen keinen Preis für Mockup-Aufgaben; in den 6 Aufgaben beobachtete ich keine Belastung (am Konto nicht nachgesehen): unbekannt.

## 3. Weg B: Vorschau im Browser (Canvas)

Prototyp: `proto.html` (reines HTML/JS, Daten `config.json`, Design-Bilder lokal `photo.jpg`, `logo.png`), Aufruf `proto.html?m=<Modell>&d=foto|logo&cw=300&dpr=2`; Datenbau `build_config.py` (liest die lebende Vorlagenantwort je Modell, wählt Variante und Platzierung); Screenshots `shots/m<Modell>.jpg`, Überblick `sheet_B_all.jpg`, Vergleich A gegen B `sheet_AB.jpg`.

### 3.1 Das Rezept (aus den Printful-Vorlagen, QUELLE Docs «Layout templates» und eigene Prüfung)
Je Variante liefert `GET /mockup-generator/templates/<id>` (`variant_mapping` → Vorlage je Platzierung): `background_color` (Variantenfarbe, z. B. `#0c0c0c` Schwarz, `#fabbd8` Lilac), optional `background_url` (Stofftextur für Heather-Farben oder bei Zip-Hoodies das farbige Basisfoto), `image_url` (Vorlagenbild, GEMESSEN: PNG mit **opakem Weiss ausserhalb des Kleidungsstücks und Schatten/Falten innerhalb**, deshalb «…whitebg.png»), `template_width/height` (3000 oder 728), `print_area_*` in Vorlagenpixeln, `is_template_on_front`.
Zeichenreihenfolge: Hintergrund (Farbe oder Textur) → Design, auf die Druckfläche beschnitten → Vorlagenbild obendrauf. Das Vorlagenbild auf dem CDN ist 1000 px gross, `template_width` aber 3000: skaliert wird über das Verhältnis (Zeichenfläche geteilt durch `template_width`).
Die Druckdatei für die Bestellung bleibt davon getrennt: `printfile` (Pixel, dpi, `fit|cover`) bestimmt die Exportgrösse.

### 3.2 Geometrie und Farbe gegen Printful geprüft (GEMESSEN, `geom/`, `geomcmp.py`, 800×800 px, gleiche Position wie in der A-Aufgabe)
| Fall | Printful-Mockup (Rahmen x1,y1–x2,y2) | Canvas | Abweichung |
|---|---|---|---|
| Hoodie 294 Schwarz, Foto | 305,201–496,391 | 304,202–495,391 | Mitte −1,0 / +0,5 px, Grösse 100 % / 99,5 % |
| Hoodie 294 Weiss, Tier (orange Pixel) | 317,219–483,384 | 315,223–483,384 | Mitte −1,0 / +2,0 px |
| iPhone-15-Hülle, Tier | 277,304–521,540 | 277,304–518,537 | Mitte −1,5 / −1,5 px, Grösse 98,8 % |
| Hoodie Stoff-Grau Schwarz | 26,1 | 26,1 | 0 |
| Hoodie Stoff-Grau Weiss | 236,9 | 236,4 | 0,5 |
| alle Kleidungs-Pixel Hoodie (Schwarz / Weiss) | – | – | mittlere Abweichung 3,0 / 3,5 von 255 je Kanal |
Mütze: Position und Grösse stimmen im Auge; **nicht zahlenmässig vergleichbar** (Printful rendert Stickerei mit Garnfarben und Kurve neu; mein Mass fand wegen des Stoffverlaufs keinen sauberen Rahmen): unbekannt.

### 3.3 Zehn Modelle, Bilder angesehen
| Modell | B-Bild | Urteil |
|---|---|---|
| 294 Hoodie (vorne, hinten, linker Ärmel) | Ghost-Bild, Farben Schwarz/Weiss/Lilac, drei Platzierungen | gleich wie Printful-Ghost; Ärmel in Seitenansicht |
| 692 Zip-Hoodie (vorne, hinten) | Basisfoto je Farbe + Vorlage | richtig: Reissverschluss teilt das Design (Druckfläche 1302×867 quer); Model-Fotos nicht möglich |
| 71 T-Shirt (vorne, gross, 4 Farben inkl. Heather-Textur) | Ghost-Bild | gleich wie Printful-Ghost; `front` und `front_large` schliessen sich laut `conflicting_placements` aus (in der Oberfläche abfangen) |
| 19 Tasse 11 oz | **nur mit Adapter**: Katalogfoto 1320 (grau, 700×1000), Design auf Zylinder abgebildet (Eichung von Hand: Körper x 220 bis 600, Druckhöhe y 290 bis 735), Foto multipliziert | plausibel und der A-Ansicht ähnlich; die Vorlage selbst ist nur ein Faltraster mit Beschriftung; Handarbeit je Tassengrösse |
| 171 Poster / 3 Leinwand | **Adapter «Papier mit Schatten»**; die Vorlage ist nur ein Raster | entspricht dem flachen Printful-Mockup; ohne Rahmen/Wand |
| 206 Dad Hat (vorne, hinten) | Fotovorlage in Garnfarbe | Lage stimmt, aber **Druck-Optik statt Stickerei**: ein Foto sieht aus, als wäre es gedruckt, was bei Stickerei nicht geht; A zeigt echte Stickerei |
| 367 Bio-Jutebeutel | Fotovorlage | gut, 2 Farben |
| 181 iPhone-15-Hülle | Basisfoto mit Hülle + Überlagerung, Design hinter Kameraloch | gleich wie Printful (Hülle am Handy) |
| 257 Allover-Shirt | **nur Schnittmuster-Layout** (Vorderteil mit «Safe Print Area») | keine Produktansicht; ehrlich als «Schnittvorschau» kennzeichnen oder A nehmen |

### 3.4 Leistung (GEMESSEN, headless Chromium auf der CI-Maschine, Software-Raster: Handys sind unbekannt)
- Datenmenge je Modell kalt (nur Printful-CDN): 294: 224 KB (1 Datei), 692: 342 KB (6 Dateien), 71: 293 KB (2), 206: 266 KB (1), 367: 183 KB, 181: 41 KB, 257: 12 KB, Tasse 23 KB; Poster/Leinwand 0 KB. Zwischengespeichert danach 0.
- Neuzeichnen bei 1000 px Zeichenfläche (500 CSS-px, DPR 2): 1 bis 8 ms Raster, 15,4 bis 24,1 ms je Bild mit Bildwiederholung (60-Hz-Takt). Bei 2000 px: 11 bis 35 ms Raster, 21 bis 55 ms je Bild. Verschieben und Skalieren im Bildtakt ist bei 1000 px gesichert, bei 2000 px je nach Gerät knapp (unbekannt auf Handys).
- Export der Druckdatei in Printful-Pixelgrösse (PNG): 1800×1800 = 2,2 MB in 78 ms, 1800×2400 = 2,2 MB in 81 ms, 2700×1050 (Tasse) = 0,9 MB in 48 ms, 1650×600 = 0,3 MB in 32 ms.
- Export der Vorschau als JPEG 800×800 (Q 0,85): Hoodie 32 KB in 8 ms, T-Shirt 25 KB in 66 ms, Hülle 65 KB in 50 ms, Mütze 33 KB in 44 ms. **Tasse scheitert (`SecurityError: Tainted canvas`)**.
- Grösse der verdichteten Vorlagen-Konfiguration je Modell (statt der 542-KB-Rohantwort beim T-Shirt): 8,8 bis 222 KB, gezippt 0,7 bis 8,9 KB.

### 3.5 CORS (GEMESSEN, Header `Origin: http://127.0.0.1:8765`)
- `files.cdn.printful.com/m/...` (Ghost-/Flat-/Case-Vorlagen und Texturen) und `.../o/upload/api-template/...` senden `access-control-allow-origin: *`: Zeichnen, Pixel lesen und Export gehen.
- `files.cdn.printful.com/products/<id>/<variante>.jpg` (Katalogfotos, z. B. Tasse) senden **keinen** CORS-Kopf: Anzeigen geht, die Zeichenfläche ist danach «tainted», Export und Pixelzugriff scheitern. Abhilfe: Foto einmal auf Shopify Files spiegeln (cdn.shopify.com sendet `access-control-allow-origin: *`).
- Eigene Designbilder: luxestyle.ch und cdn.shopify.com senden CORS `*`; Cloudinary-Bilder des Editors werden schon mit `crossOrigin="anonymous"` geladen.

### 3.6 Abdeckung im Katalog (GEMESSEN an `sg/katalog/*.json`, Primärplatzierung je Modell)
Von 577 Modellen: 318 Fotovorlage (Bildpfad `/m/...`), 259 Raster-Layout (`api-template` oder `generator`). Von den 537 CH-bestellbaren: **294 Fotovorlage, 243 Layout**; nach Klasse: FLACH 186 Foto / 80 Layout, FLACH_MIT_HINWEIS 101 / 40, PANEL 7 / 123. Bei 106 Modellen liegt das Design **über** dem Vorlagenbild (`is_template_on_front: false`, ohne Etiketten); der Code behandelt es, ich habe es an keinem der zehn Modelle ausgelöst (ungemessen).

### 3.7 Schwächen von B (ehrlich)
1. Nur Ghost-/Flat-Bilder wie bei Printful «Ghost»; **keine Model-Fotos, keine Seitenansichten mit Schwung** (A hat sie).
2. Stickerei (Mütze, Taschen mit Stickerei; 74 Modelle der Gruppe EMBROIDERY, 72 davon mit Fotovorlage) wird als Druck gezeigt; für Fotos irreführend. Abhilfe: Design auf 1 bis 3 Garnfarben reduzieren und mit Stich-Muster überlagern (nicht gebaut), oder A.
3. Allover/Panel: nur Schnittlayout.
4. Gewölbte Dinge (Tasse, Flaschen, 11 DRINKWARE) brauchen je Form eine Hand-Eichung.
5. Das Design liegt flach unter den Falten: bei sehr dunklen Stoffen sieht ein dunkles Design (Logo auf Schwarz) fast unsichtbar aus: das ist ehrlich (so druckt Printful ohne «lifelike»), sollte im Editor einen Kontrast-Hinweis auslösen.
6. Weisse JPG-Hintergründe erscheinen als weisse Box (wie im Druck); Hinweis «transparentes PNG» steht im Editor schon.

## 4. A gegen B in einer Tabelle
| Kriterium | A Mockup-API | B Canvas |
|---|---|---|
| Wartezeit | 4,6 bis 11,4 s je Aufgabe (GEMESSEN) | 0 bis 8 ms Neuzeichnen, kalt 0,4 bis 1,6 s (Bilder laden) |
| Live ziehen/skalieren | nein | ja |
| Parallelität/Limit | 10 Aufgaben je 60 s je Store, geteilt, 60 s Sperre; 20 000 Dateien je Tag (QUELLE) | unbegrenzt (Browser der Kundin) |
| Server/Schlüssel nötig | ja (Relais, Drosselung) | nein (nur statische Vorlagendaten und CDN-Bilder) |
| Öffentliches Design-Bild nötig | ja | nein (lokal im Browser) |
| Kleidung, Taschen, Hüllen | sehr gut, mit Model-Fotos | gleich dem Ghost-Bild (Abweichung 3/255) |
| Mütze/Stickerei | echt | Druck-Optik (irreführend bei Fotos) |
| Tasse | echtes 3D | Adapter, plausibel |
| Allover | Model-Foto | nur Layout |
| Poster | flach mit Schatten | gleich |
| Mockup-URLs | laufen nach rund 75 h ab, sofort sichern | eigenes JPEG, kein Ablauf |
| Abdeckung | alle Modelle (Docs; 6 getestet) | 294 von 537 Fotovorlage, 243 nur Layout |

## 5. Empfehlung
**Mischung: B live, A gezielt.**

1. **B in den Editor v6 einbauen** (Platzierungs-Reiter, Farbwahl und Druckfläche sind dort schon vorgesehen): Ebenenrezept, Platzierung relativ zur Druckfläche, Farbwechsel aus `background_color/-url`, Export der Druckdatei in Printful-Pixeln. Vorlagendaten einmal je Modell mit dem Bau-Skript aus `GET /mockup-generator/templates/<id>` holen (537 Aufrufe sind bei 120/min rund 5 Minuten), verdichten (1 bis 9 KB gezippt je Modell) und als Theme-Datei oder Metafeld ausliefern; **Bilder auf Shopify Files spiegeln** (Hotlinking von `files.cdn.printful.com` mit `?v=`-Versionen ist unbelegt stabil; die `products/`-Fotos ohne CORS auf jeden Fall).
2. **Beim «In den Warenkorb»** das B-Bild als JPEG (25 bis 65 KB) über denselben Cloudinary-Weg hochladen und als Eigenschaft `_vorschau` an den Eintrag hängen: die Bestellung trägt dann genau das, was die Kundin gesehen hat (Prüfbild für uns, bei Reklamation).
3. **A nur für Klassen, in denen B unehrlich ist:** Stickerei (Garnfarben-Auswahl) und Allover/Panel (123 Modelle), als Knopf «Echtes Vorschaubild erzeugen» (Wartebalken 5 bis 12 s) hinter einem Relais (Worker) mit Drosselung je Besucher und global (höchstens 6 je Minute, damit 4 von 10 Plätzen für Bestell-Prüfbilder bleiben). Alternativ nur intern: je Bestellzeile nach der Zahlung eine Aufgabe als Prüfbild neben dem B-Bild.
4. **Reihenfolge der Arbeit (Aufwand ist Hypothese, ohne Gewähr):** B-Kern 1 bis 2 Tage (der Prototyp hat rund 150 Zeilen), Datenbau und Spiegeln 1 Tag, Tasse/Papier-Adapter 1 Tag (3 Tassenfotos eichen), Warenkorb-Vorschau-Eigenschaft 0,5 Tag, Stickerei-Look 1 Tag, A-Relais 1 bis 2 Tage.

### Risiken
- A: Schlüssel im Relais (nie im Browser); Missbrauch sperrt den ganzen Store für 60 s (nicht die Bestellanlage, die zählt im allgemeinen Topf von 120); Zähler wird mit anderen Printful-Skripten geteilt (GEMESSEN: Fremdverbraucher); Mockup-Dateien laufen nach 75 h ab; v2-Limit unbekannt.
- B: Printful kann Vorlagenbilder oder Geometrie ändern (`?v=`), dann stimmen gespiegelte Bilder nicht mehr: Bau-Skript regelmässig wiederholen und die Abweichung wie hier gegen ein Printful-Mockup messen; ungetestet sind die 106 Modelle mit Design über dem Vorlagenbild und die 28 Hüllen-Geometrien einzeln.
- Beide: «sieht aus wie Printful» heisst nicht «druckt genau so»: Garnfarben-Reduktion, Rand, Weiss-auf-Weiss und DPI müssen im Editor als Warnung stehen (v6 hat dpi-Warnung).

## 6. Unbekannt oder nicht gemessen
- Verhalten bei 429 (nicht ausgelöst), Limit für `POST /v2/mockup-tasks`, Preis der Mockup-Aufgaben.
- Renderzeiten auf echten Handys (gemessen nur headless auf der CI-Maschine).
- `lifelike`-Effekt (dunkles Design auf dunklem Stoff) und weitere Ansichten (Falten, Lifestyle) in A nicht getestet (Aufgabenobergrenze).
- Mütze: Stickerei in B nicht zahlenmässig gegen A vergleichbar.
- Wirkung auf Käufe unbekannt (Hypothese: eine echte Vorschau senkt Abbrüche vor dem Warenkorb; nicht belegt).

## 7. Dateien
- Prototyp und Daten: `proto.html`, `config.json`, `build_config.py`, `live/t<id>.json` (lebende Vorlagen), `shoot.mjs`, `geom.mjs`, `geomcmp.py`, `bench.mjs`, `thumb.mjs`, `first.mjs`
- A-Läufe: `run_mockup.mjs`, `out/*.json`, `mockups/*/`
- Bilder: `shots/m*.jpg` (je Modell), `sheet_B_all.jpg` (zehn Modelle), `sheet_AB.jpg` (A links, B rechts: Hoodie, Hülle, Mütze, Tasse), `sheet_A1.jpg`, `sheet_A2.jpg`, `sheet_hoodie.jpg`
- Zahlen: `shots/bench.json`, `shots/stats.json`, `geom/geom_result.json`
- Lokaler Server (nur 127.0.0.1:8765) für die Prototyp-Aufrufe: `python3 -m http.server 8765 --bind 127.0.0.1` im Ordner.
