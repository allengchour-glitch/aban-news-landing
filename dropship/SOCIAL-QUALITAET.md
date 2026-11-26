# Social-Qualität — Stand 2026-11-26 05:51 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 173 Seitenbeiträge + 0 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 300 Einträge (−30/+7 Tage) · Pinterest-Analyse: 50 Pins
- Geprüft: 623 Beiträge, 960 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF ? Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF ? · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)

## Zusammenfassung

**103 Fehler · 232 Warnungen · 362 Hinweise** — Fehler/Warnungen in 247 von 623 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 35 × Caption korrigieren · 73 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 23 × Caption in der App korrigieren (API kann es nicht [Q2]) · 57 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 59 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | Pinterest | TikTok | YouTube | Summe |
|---|---:|---:|---:|---:|---:|---:|
| CODE | 4 | 4 | · | 4 | · | 12 |
| DIREKTLINK | · | · | 50 | · | · | 50 |
| DOPPEL | 40 | 37 | 4 | 7 | 5 | 93 |
| ENGLISCH | 1 | · | · | · | · | 1 |
| FORMAT | 79 | 100 | 34 | 50 | · | 263 |
| PREIS | 5 | 27 | 3 | 1 | · | 36 |
| PRODUKT | 5 | 9 | 5 | · | · | 19 |
| TEXT | 9 | 9 | · | · | · | 18 |
| TON | 18 | 21 | · | 22 | 17 | 78 |
| VERSAND | 35 | 57 | 25 | 9 | 1 | 127 |

Produkt zugeordnet: 292 von 623 Beiträgen (Ledger 17, Link 206, Titel 69).

Dazu: 123 Facebook-Beiträge ohne Direktlink (Liste unten) · 165 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 2 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

### FEHLER · TikTok video · 2026-11-15 12:00 UTC · 272 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7708352119962733856
- Text: «Wichtelgeschenk unter CHF 20? Dieser Panda wartet schon 🐼 Plüsch Panda, 15 cm, empfohlen ab 3 Jahren · CHF 19.90 Schweiz: ab Schweizer Lag…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-05 18:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7704735970611973408  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-10 18:00 UTC · 269 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7706590233550277921
- Text: «Wichteln in der Familie und ein Kind ab 2 Jahren auf der Liste? 🚜 Der BRUDER Roadmax Traktor hat ein detailliertes Führerhaus, grosse Prof…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-11 12:00 UTC · 264 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7706868169293434144
- Text: «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis CHF 30: LED Tulpen-Planet CHF 28.90, Keramikbecher CHF 17.90, Tennisarmband ab CH…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-23 13:00 UTC · 260 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7711336362770697505
- Text: «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warmem LED-Licht, in sechs Farben wählbar. Betrieb mit AAA-Batterie (nicht enthalten…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-10 10:00 UTC · 258 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7706466549053361440
- Text: «Ein kleines Mitbringsel gesucht? Der Waschbär hilft 🧸 Plüsch Waschbär, 14 cm · CHF 20.90 · empfohlen ab 3 Jahren, nicht für Kinder unter 3…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-07 12:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7705383335169658144  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-17 13:00 UTC · 257 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7709109765963533601
- Text: «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt, schneidet und zerkleinert, mit Saugfuss für mehr Stabilität und drei Edelstahl…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-13 09:00 UTC · 257 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7707563517016018209
- Text: «Eine Decke, die man anziehen kann 🛋️ XXL Hoodie-Decke mit Taschen, für Frauen und Männer · CHF 37.90 Schweiz: Lieferung 10–20 Werktage Ver…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-04 18:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7704364538862308641  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-13 18:00 UTC · 254 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7707703142586010912
- Text: «Ein Plüschtier für Kinder ab 3 Jahren? 🐧 Der Plüsch Kaiserpinguin ist 26 cm gross und ab 3 Jahren empfohlen – nicht geeignet für Kinder un…»
- Produkt: Plüsch Kaiserpinguin 26 cm (ACTIVE, https://luxestyle.ch/products/plusch-kaiserpinguin-26-cm-fga17842, SKU fortura-17842) — Zuordnung: erste Zeile
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-18 12:00 UTC · 251 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7709465451138534689
- Text: «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und Zwiebelhacker mit Edelstahlklingen. Zerkleinert auch anderes Gemüse. Shop: luxe…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-14 12:00 UTC · 251 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7707980998968937760
- Text: «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in Schwarz, Blau oder Braun mit Hufeisen-Schnalle aus Edelstahl, Länge 20 oder 22 cm…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-10 14:00 UTC · 251 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7706528046089506081
- Text: «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16, ab 3 Jahren · CHF 26.90 Schweiz: ab Schweizer Lage…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-14 09:00 UTC · 249 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7707934434254802208
- Text: «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? 🍪 Ein nachgebildeter Keks auf brauner Spange (4 g, Kunstharz), wahlweise als Her…»
- Produkt: Haarspange Keks (ACTIVE, https://luxestyle.ch/products/schokoladen-ohrring-haarstecker-609700, SKU CJJT298338704DW) — Zuordnung: erste Zeile
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 15.90 («Haarspange Keks», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-11 09:00 UTC · 249 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7706821431014772001
- Text: «Eine Uhr in Roségold, fertig zum Verschenken 🎁 Elegante Damenuhr mit Box, vier Farbkombinationen · CHF 40.90 Schweiz: Lieferung 10–20 Werk…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-06 18:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7705106204585954592  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-12 18:00 UTC · 248 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7707331704163224865
- Text: «Fürs Wichteln oder den Adventstisch noch eine Idee gesucht? 🦌 Der Kerzenhalter aus Eisen ist als Hirsch beziehungsweise Elch gestaltet, mi…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-12 09:00 UTC · 247 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7707192679620283681
- Text: «Ein Rucksack mit USB-Anschluss fürs Pendeln 🎒 Leichter Laptop-Rucksack, 14 oder 17 Zoll, USB-Schnittstelle (ohne Kabel) · ab CHF 44.90 je …»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-08 12:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7705754377784479008  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-14 18:00 UTC · 246 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7708074199721512225
- Text: «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfahrer mit Rennrad und Helm, Gliedmassen und Kopf sind beweglich, die Hände greifen…»
- Produkt: bworld Rennrad mit Radfahrer (ACTIVE, https://luxestyle.ch/products/bworld-rennrad-mit-radfahrer-fga063110, SKU fortura-063110) — Zuordnung: erste Zeile
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-11 18:00 UTC · 244 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7706960660818775329
- Text: «Wer hat schon ein Hochlandrind als Kuscheltier? 🐮 Plüsch Hochlandrind, 25 cm · CHF 35.90 Schweiz: ab Schweizer Lager · Lieferdatum beim Ar…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-03 18:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7703993914889358625  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-17 19:00 UTC · 243 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7709203187554651425
- Text: «Licht im Detail: der Sternenlicht-Projektor für Schlafzimmer. Welche Ausführung welche Scheiben mitbringt, steht beim Artikel. Shop: luxest…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-20 19:30 UTC · 239 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7710323035911245089
- Text: «Licht wie Wasserwellen. ✨ Die LED-Wasserwellen-Projektionsleuchte wirft bewegte Lichtmuster an Wand und Decke. Schau dir den Effekt im Vide…»
- Produkt: LED Wasserwellen Projektionsleuchte (ACTIVE, https://luxestyle.ch/products/led-wasserwellen-projektionsleuchte-677504, SKU CJ-CJYD188109102BY) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-21 13:00 UTC · 230 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7710593991275859232
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-05 13:00 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7704656794383076641  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-11-22 13:00 UTC · 227 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7710964953187994912
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Auch in…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · Instagram reel · 2026-11-18 09:09 UTC · 136 Aufrufe
- Post: https://www.instagram.com/reel/Df4JbXMFFpv/
- Text: «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und Zwiebelhacker arbeitet mit einem einfachen Druckmechanismus. Er zerkleinert Zwi…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-11-17 19:07 UTC · 135 Aufrufe
- Post: https://www.instagram.com/reel/Df2pCebjIRK/
- Text: «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt, schneidet und zerkleinert, mit Saugfuss für mehr Stabilität und drei Edelstahl…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-11-10 11:08 UTC · 79 Aufrufe
- Post: https://www.instagram.com/reel/Dfjwjw9Co7L/
- Text: «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16, ab 3 Jahren · CHF 26.90 Ab Schweizer Lager · Liefe…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-16 18:07 UTC · 33 Aufrufe
- Post: https://www.facebook.com/reel/1130119220008240/
- Text: «Licht im Detail. Entdecke den Sternenlicht-Projektor und prüfe die gewünschte Ausführung auf der Produktseite: https://luxestyle.ch/product…»
- Produkt: Sternenlicht-Projektor für Schlafzimmer (ACTIVE, https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544, SKU CJSN139239101AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-20 08:04 UTC gepostet: https://www.facebook.com/reel/932383226401475/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram bild · 2026-10-21 14:11 UTC · 24 Aufrufe
- Post: https://www.instagram.com/p/Dewl1jMiLfV/
- Text: «Dein persönliches Glückskleeblatt – funkelnde Zirkonia auf feinstem 999 Silber. 999 Silber-Armband «Trèfle» · CHF 69.90 Kleiner Schweizer S…»
- Produkt: 999 Silber-Armband «Trèfle» – Kleeblatt mit Zirkonia (DRAFT, nicht im Onlineshop, SKU CJSL291550201AZ) — Zuordnung: Ledger kimi-dein-pers-nliches-gl-ckskleeblat-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «999 Silber-Armband «Trèfle» – Kleeblatt mit Zirkonia» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-pers-nliches-gl-ckskleeblat-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-11-14 14:06 UTC · 23 Aufrufe
- Post: https://www.instagram.com/reel/DfuYIc7gPGV/
- Text: «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in Schwarz, Blau oder Braun mit Hufeisen-Schnalle aus Edelstahl, Länge 20 oder 22 cm…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-11-11 08:03 UTC · 20 Aufrufe
- Post: https://www.instagram.com/reel/DfmAeS9Afbe/
- Text: «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis CHF 30, jedes mit Preis und Lieferzeit: LED Tulpen-Planet (CHF 28.90), Retro-Voge…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-10-26 18:11 UTC · 20 Aufrufe
- Post: https://www.instagram.com/p/De95S0FjbwN/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122149020849350792
- Text: «Leuchtender Schaukelgeist 👻 Grosse Geisterfigur für draussen: integrierte Beleuchtung, schaukelt vor und zurück. Für Türeingang, Garten un…»
- Produkt: Leuchtender Halloween-Schaukelgeist (ACTIVE, https://luxestyle.ch/products/leuchtender-halloween-schaukelgeist-627400, SKU CJYD304327501AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 27.90–58.90 («Leuchtender Halloween-Schaukelgeist», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-11-16 18:09 UTC · 16 Aufrufe
- Post: https://www.instagram.com/reel/Dfz9umbEZMH/
- Text: «Licht im Detail. Entdecke den Sternenlicht-Projektor und prüfe die gewünschte Ausführung über den Link im Profil.»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-11-24 19:31 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/DgItj4-EyCB/
- Text: «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekorativem Besatz gibt es in Weiss oder Gold und in vier Grössen. Shop: luxestyle.ch…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-11-23 19:31 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/DgGIxIMEVYf/
- Text: «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warmem LED-Licht, in sechs Farben wählbar. Betrieb mit AAA-Batterie (nicht enthalten…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-14 14:03 UTC · 12 Aufrufe
- Post: https://www.facebook.com/reel/2152756682106461/ · Zwilling: https://www.instagram.com/reel/DfuYIc7gPGV/
- Text: «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in Schwarz, Blau oder Braun mit Hufeisen-Schnalle aus Edelstahl, Länge 20 oder 22 cm…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · TikTok video · 2026-11-24 13:00 UTC · 10 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7711707348577815841
- Text: «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekorativem Besatz gibt es in Weiss oder Gold und in vier Grössen. Shop: luxestyle.ch…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · Instagram reel · 2026-11-24 09:11 UTC · 5 Aufrufe
- Post: https://www.instagram.com/reel/DgHmRgOj--s/
- Text: «Krone Seekönigin CHF 30.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/krone-seekonigin-fgabo64556 (Link in B…»
- Produkt: Krone Seekönigin (DRAFT, nicht im Onlineshop, SKU fortura-BO64556) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Krone Seekönigin» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-18 09:06 UTC · 5 Aufrufe
- Post: https://www.facebook.com/reel/1170411215638982/ · Zwilling: https://www.instagram.com/reel/Df4JbXMFFpv/
- Text: «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und Zwiebelhacker arbeitet mit einem einfachen Druckmechanismus. Er zerkleinert Zwi…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-11-17 19:04 UTC · 5 Aufrufe
- Post: https://www.facebook.com/reel/1810576186820157/ · Zwilling: https://www.instagram.com/reel/Df2pCebjIRK/
- Text: «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt, schneidet und zerkleinert, mit Saugfuss für mehr Stabilität und drei Edelstahl…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Pinterest pin · 2026-10-30 04:46 UTC · 4 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584431684/
- Text: «Mealprep ohne Handarbeit 🥕 Gemüse in 5–10 Sekunden, Fleisch in 10–20 Sekunden. Eier-Rührgang fürs Verquirlen, Entsafter-Gang für Früchte –…»
- Produkt: Elektrischer Fleischwolf 5L – Küchenmaschine (DRAFT, nicht im Onlineshop, SKU CJYD181444603CX) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Elektrischer Fleischwolf 5L – Küchenmaschine» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-27 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645584171516/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-10-04 13:11 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/2185021565388865/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Weihnachtsgirlande Handschuh-Design mit Lichtern» — Für eine festliche Stimmung in deinem Zuhause sorgt d…»
- Produkt: Weihnachtsgirlande Handschuh-Design mit Lichtern (ACTIVE, https://luxestyle.ch/products/weihnachtsgirlande-handschuh-design-mit-lichte-647500, SKU CJYD256168401AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 22.90, Shop CHF 24.90–25.90 («Weihnachtsgirlande Handschuh-Design mit Lichtern», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook bild · 2026-10-01 02:10 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142247113350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Badeset Dino Duft Apfel · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- Produkt: Badeset Dino Duft Apfel (DRAFT, nicht im Onlineshop, SKU fortura-AC6057117) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Badeset Dino Duft Apfel» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Badeset Din»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Badeset Dino Duft Apfel», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Bild 540×540 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-11-21 19:31 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1127606873213670/ · Zwilling: https://www.instagram.com/reel/DgA_KbCHL02/
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-05 17:11 UTC gepostet: https://www.facebook.com/reel/1651496333243305/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-11-11 08:03 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1020905711027186/ · Zwilling: https://www.instagram.com/reel/DfmAeS9Afbe/
- Text: «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis CHF 30, jedes mit Preis und Lieferzeit: LED Tulpen-Planet (CHF 28.90), Retro-Voge…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook bild · 2026-10-26 18:10 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122149020849350792 · Zwilling: https://www.instagram.com/p/De95S0FjbwN/
- Text: «Leuchtender Schaukelgeist 👻 Grosse Geisterfigur für draussen: integrierte Beleuchtung, schaukelt vor und zurück. Für Türeingang, Garten un…»
- Produkt: Leuchtender Halloween-Schaukelgeist (ACTIVE, https://luxestyle.ch/products/leuchtender-halloween-schaukelgeist-627400, SKU CJYD304327501AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 27.90–58.90 («Leuchtender Halloween-Schaukelgeist», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### FEHLER · Facebook bild · 2026-10-03 23:09 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143127673350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse Kellner · CHF 38.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- Produkt: Geldbörse Kellner (DRAFT, nicht im Onlineshop, SKU fortura-26666) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Geldbörse Kellner» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-28 04:10 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/4670891903189580/
- Text: «Das trägt jetzt jeder 👀 Sicherheitsschuhe mit Stahlkappe — für Werkstatt, Umzug und Garten. CHF 14.90 · Gratis Versand ab CHF 50 · Klarna …»
- Produkt: Arbeitsschuhe mit Stahlkappe (ACTIVE, https://luxestyle.ch/products/sicherheits-schuhe-mit-stahlkappe-695232, SKU CJ-CJNS109710401AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 27.90–41.90 («Arbeitsschuhe mit Stahlkappe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Pinterest pin · 2026-11-25 04:52 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645586563409/
- Text: «Krone Seekönigin CHF 30.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/krone-seekonigin-fgabo64556 (Link in B…»
- Produkt: Krone Seekönigin (DRAFT, nicht im Onlineshop, SKU fortura-BO64556) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Krone Seekönigin» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook video · 2026-11-24 20:30 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1167074269356113 · Zwilling: https://www.instagram.com/reel/DgItj4-EyCB/
- Text: «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekorativem Besatz gibt es in Weiss oder Gold und in vier Grössen. Shop: luxestyle.ch…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-24 19:31 UTC gepostet: https://www.facebook.com/reel/1167074269356113/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-24 20:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgItj4-EyCB/ · Zwilling: https://facebook.com/reel/1167074269356113
- Text: «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekorativem Besatz gibt es in Weiss oder Gold und in vier Grössen. Shop: luxestyle.ch…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-24 19:31 UTC gepostet: https://www.instagram.com/reel/DgItj4-EyCB/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-24 19:31 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1167074269356113/ · Zwilling: https://www.instagram.com/reel/DgItj4-EyCB/
- Text: «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekorativem Besatz gibt es in Weiss oder Gold und in vier Grössen. Shop: luxestyle.ch…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · YouTube video · 2026-11-24 13:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/JJTCor-K_AE
- Text: «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekorativem Besatz gibt es in Weiss oder Gold und in vier Grössen. Farben, Grössen, a…»
- Produkt: Tennisarmband mit dekorativem Besatz (ACTIVE, https://luxestyle.ch/products/dreifachklinken-tennisarmband-mit-zirkon-613400, SKU CJSL271600801AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-06 12:00 UTC gepostet: https://www.youtube.com/shorts/EJBUhkOy4MA  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Instagram video · 2026-11-24 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgHmRgOj--s/
- Text: «Krone Seekönigin CHF 30.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/krone-seekonigin-fgabo64556 (Link in B…»
- Produkt: Krone Seekönigin (DRAFT, nicht im Onlineshop, SKU fortura-BO64556) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Krone Seekönigin» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-24 09:11 UTC gepostet: https://www.instagram.com/reel/DgHmRgOj--s/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook video · 2026-11-24 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/3724514894371132
- Text: «Krone Seekönigin CHF 30.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/krone-seekonigin-fgabo64556 ➕ Folge Lu…»
- Produkt: Krone Seekönigin (DRAFT, nicht im Onlineshop, SKU fortura-BO64556) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Krone Seekönigin» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-24 09:08 UTC gepostet: https://www.facebook.com/reel/3724514894371132/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-11-24 09:08 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/3724514894371132/
- Text: «Krone Seekönigin CHF 30.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/krone-seekonigin-fgabo64556 ➕ Folge Lu…»
- Produkt: Krone Seekönigin (DRAFT, nicht im Onlineshop, SKU fortura-BO64556) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Krone Seekönigin» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Pinterest pin · 2026-11-24 04:58 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645586487736/
- Text: «Augenmaske Teufel CHF 35.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/augenmaske-teufel-fga908485 (Link in …»
- Produkt: Augenmaske Teufel (DRAFT, nicht im Onlineshop, SKU fortura-908485) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Augenmaske Teufel» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Instagram video · 2026-11-23 20:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgGIxIMEVYf/ · Zwilling: https://facebook.com/reel/1119757074237666
- Text: «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warmem LED-Licht, in sechs Farben wählbar. Betrieb mit AAA-Batterie (nicht enthalten…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-23 19:31 UTC gepostet: https://www.instagram.com/reel/DgGIxIMEVYf/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-23 19:31 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1119757074237666/ · Zwilling: https://www.instagram.com/reel/DgGIxIMEVYf/
- Text: «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warmem LED-Licht, in sechs Farben wählbar. Betrieb mit AAA-Batterie (nicht enthalten…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-23 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgF4_78ADJJ/
- Text: «Augenmaske Teufel CHF 35.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/augenmaske-teufel-fga908485 (Link in …»
- Produkt: Augenmaske Teufel (DRAFT, nicht im Onlineshop, SKU fortura-908485) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Augenmaske Teufel» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook video · 2026-11-23 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2046068790130057
- Text: «Augenmaske Teufel CHF 35.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/augenmaske-teufel-fga908485 ➕ Folge L…»
- Produkt: Augenmaske Teufel (DRAFT, nicht im Onlineshop, SKU fortura-908485) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Augenmaske Teufel» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · YouTube video · 2026-11-23 13:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/ffb5OLzHhBY
- Text: «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warmem LED-Licht, in sechs Farben wählbar. Betrieb mit AAA-Batterie (nicht enthalten…»
- Produkt: Ewige Rose mit LED-Licht (ACTIVE, https://luxestyle.ch/products/ewige-rose-mit-led-licht-718080, SKU CJ-CJJT134315801AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-11 13:00 UTC gepostet: https://www.youtube.com/shorts/FoD_2LfxjCw  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Pinterest bild · 2026-11-23 12:29 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645586424229
- Text: «📦 Lieferzeit Schweiz: 10–20 Werktage · Direktversand ab Lieferantenlager · Versand nur in die Schweiz und nach Liechtenstein Robuste Cargo…»
- **FEHLER VERSAND:** Liechtenstein erwähnt (Markt = nur CH seit 22.09.): «in die Schweiz und nach Liechtenstein Robuste Cargo-Hose im Am»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook video · 2026-11-22 20:30 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1159321203228440 · Zwilling: https://www.instagram.com/reel/DgDj-JsDr5m/
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Im Vide…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-07 17:09 UTC gepostet: https://www.facebook.com/reel/908936765536062/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-22 20:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgDj-JsDr5m/ · Zwilling: https://facebook.com/reel/1159321203228440
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Im Vide…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-07 17:09 UTC gepostet: https://www.instagram.com/reel/Dfcrxn_GvhT/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-22 19:31 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1159321203228440/ · Zwilling: https://www.instagram.com/reel/DgDj-JsDr5m/
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Im Vide…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-07 17:09 UTC gepostet: https://www.facebook.com/reel/908936765536062/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · YouTube video · 2026-11-22 13:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/Gt0FkdqJfRo
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Im Vide…»
- Produkt: LED-Wasser-Speaker mit 3D-Ton (ACTIVE, https://luxestyle.ch/products/led-wasser-speaker-mit-3d-ton-e17c58, SKU CJ-CJXFBXYS00001-Black) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-07 19:30 UTC gepostet: https://www.youtube.com/shorts/nPtCEHwHRz0  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook video · 2026-11-21 20:30 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1127606873213670 · Zwilling: https://www.instagram.com/reel/DgA_KbCHL02/
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-05 17:11 UTC gepostet: https://www.facebook.com/reel/1651496333243305/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-21 20:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgA_KbCHL02/ · Zwilling: https://facebook.com/reel/1127606873213670
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-05 17:14 UTC gepostet: https://www.instagram.com/reel/DfXilV7nPDy/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · YouTube video · 2026-11-21 13:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/b6dRizv39RE
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- Produkt: Anti-Gravitations-Duftbefeuchter mit schwebenden Tropfen (ACTIVE, https://luxestyle.ch/products/anti-gravitations-duftbefeuchter-mit-schwebend-903040, SKU CJ-CJJT170517301AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-05 20:00 UTC gepostet: https://www.youtube.com/shorts/E7tx0nVBju8  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-20 19:30 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/D3QLJigVfpw
- Text: «Licht wie Wasserwellen. ✨ Die LED-Wasserwellen-Projektionsleuchte wirft bewegte Lichtmuster an Wand und Decke. Schau dir den Effekt im Vide…»
- Produkt: LED Wasserwellen Projektionsleuchte (ACTIVE, https://luxestyle.ch/products/led-wasserwellen-projektionsleuchte-677504, SKU CJ-CJYD188109102BY) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-12 16:00 UTC gepostet: https://www.youtube.com/shorts/8ZH31Vrxd5g  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-19 19:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/N6ud3swkxFs
- Text: «Licht im Detail: ein Blick auf den Sternenlicht-Projektor. Die gewünschte Ausführung auf der Produktseite prüfen: https://luxestyle.ch/prod…»
- Produkt: Sternenlicht-Projektor für Schlafzimmer (ACTIVE, https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544, SKU CJSN139239101AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-18 18:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/u7maUT-AgXM
- Text: «Der Knoblauch- und Zwiebelhacker zerkleinert Zwiebeln, Knoblauch und anderes Gemüse per Druck. Edelstahlklingen, mehrschichtiger Aufbau für…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook video · 2026-11-18 10:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1170411215638982 · Zwilling: https://www.instagram.com/reel/Df4JbXMFFpv/
- Text: «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und Zwiebelhacker arbeitet mit einem einfachen Druckmechanismus. Er zerkleinert Zwi…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-18 09:06 UTC gepostet: https://www.facebook.com/reel/1170411215638982/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-18 10:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Df4JbXMFFpv/ · Zwilling: https://facebook.com/reel/1170411215638982
- Text: «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und Zwiebelhacker arbeitet mit einem einfachen Druckmechanismus. Er zerkleinert Zwi…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-18 09:09 UTC gepostet: https://www.instagram.com/reel/Df4JbXMFFpv/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook video · 2026-11-17 20:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1810576186820157 · Zwilling: https://www.instagram.com/reel/Df2pCebjIRK/
- Text: «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt, schneidet und zerkleinert, mit Saugfuss für mehr Stabilität und drei Edelstahl…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-17 19:04 UTC gepostet: https://www.facebook.com/reel/1810576186820157/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-17 20:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Df2pCebjIRK/ · Zwilling: https://facebook.com/reel/1810576186820157
- Text: «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt, schneidet und zerkleinert, mit Saugfuss für mehr Stabilität und drei Edelstahl…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-17 19:07 UTC gepostet: https://www.instagram.com/reel/Df2pCebjIRK/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · YouTube video · 2026-11-17 18:30 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/Qb17SsAax3Y
- Text: «8 Fächer, kompakt verstaut. Die Medizin-Box mit 8 Fächern lässt sich zusammenklappen. Im kurzen Video siehst du die Aufteilung und das Öffn…»
- Produkt: Medizin-Box mit 8 Fächern (ACTIVE, https://luxestyle.ch/products/medizin-box-mit-8-fachern-612200, SKU CJJT254323201AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-17 13:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/M8R5SmT-w7g
- Text: «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt, schneidet und zerkleinert, mit Saugfuss für mehr Stabilität und drei Edelstahl…»
- Produkt: 3-in-1 Gemüsehobel mit Scharfen Messern (ACTIVE, https://luxestyle.ch/products/3-in-1-gemusehobel-mit-scharfen-messern-940928, SKU CJ-CJCF173757401AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Instagram video · 2026-11-16 19:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Dfz9umbEZMH/
- Text: «Licht im Detail. Entdecke den Sternenlicht-Projektor und prüfe die gewünschte Ausführung über den Link im Profil.»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-16 18:09 UTC gepostet: https://www.instagram.com/reel/Dfz9umbEZMH/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook video · 2026-11-16 19:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1130119220008240
- Text: «Licht im Detail. Entdecke den Sternenlicht-Projektor und prüfe die gewünschte Ausführung auf der Produktseite: https://luxestyle.ch/product…»
- Produkt: Sternenlicht-Projektor für Schlafzimmer (ACTIVE, https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544, SKU CJSN139239101AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-20 08:04 UTC gepostet: https://www.facebook.com/reel/932383226401475/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · YouTube video · 2026-11-14 16:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/0rPdx6l8fhs
- Text: «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in Schwarz, Blau oder Braun mit Hufeisen-Schnalle aus Edelstahl, Länge 20 oder 22 cm…»
- Produkt: Geflochtenes Lederarmband mit Hufeisen-Schnalle (ACTIVE, https://luxestyle.ch/products/geflochtenes-lederarmband-mit-hufeisen-schnall-639500, SKU CJSL276540401AZ) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook video · 2026-11-14 15:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2152756682106461 · Zwilling: https://www.instagram.com/reel/DfuYIc7gPGV/
- Text: «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in Schwarz, Blau oder Braun mit Hufeisen-Schnalle aus Edelstahl, Länge 20 oder 22 cm…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-14 14:03 UTC gepostet: https://www.facebook.com/reel/2152756682106461/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-14 15:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfuYIc7gPGV/ · Zwilling: https://facebook.com/reel/2152756682106461
- Text: «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in Schwarz, Blau oder Braun mit Hufeisen-Schnalle aus Edelstahl, Länge 20 oder 22 cm…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-14 14:06 UTC gepostet: https://www.instagram.com/reel/DfuYIc7gPGV/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · YouTube video · 2026-11-14 10:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/JqfSBJEJwEc
- Text: «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfahrer mit Rennrad und Helm, Gliedmassen und Kopf sind beweglich, die Hände greifen…»
- Produkt: bworld Rennrad mit Radfahrer (ACTIVE, https://luxestyle.ch/products/bworld-rennrad-mit-radfahrer-fga063110, SKU fortura-063110) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-13 10:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/DDjWSjBNH5c
- Text: «Ein Plüschtier für Kinder ab 3 Jahren? 🐧 Der Plüsch Kaiserpinguin ist 26 cm gross und ab 3 Jahren empfohlen, nicht geeignet für Kinder unt…»
- Produkt: Plüsch Kaiserpinguin 26 cm (ACTIVE, https://luxestyle.ch/products/plusch-kaiserpinguin-26-cm-fga17842, SKU fortura-17842) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-12 10:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/JjSKvRPiwy4
- Text: «Fürs Wichteln oder den Adventstisch noch eine Idee gesucht? 🦌 Der Kerzenhalter aus Eisen ist als Hirsch beziehungsweise Elch gestaltet, mi…»
- Produkt: Weihnachts-Kerzenhalter aus Eisen (ACTIVE, https://luxestyle.ch/products/weihnachtsdeer-kerzenhalter-aus-eisen-1b5d86, SKU CJJZGJSD00854-Black) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-11 16:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/XfE1-B8iqb8
- Text: «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis CHF 30, jedes mit Preis und Lieferzeit: LED Tulpen-Planet (CHF 28.90), Retro-Voge…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-11-11 10:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/TdL1K__wXak
- Text: «Wer hat schon ein Hochlandrind als Kuscheltier? 🐮 Plüsch Hochlandrind, 25 cm · CHF 35.90 Ab Schweizer Lager · Lieferdatum beim Artikel. Ve…»
- Produkt: Plüsch Hochlandrind (ACTIVE, https://luxestyle.ch/products/plusch-hochlandrind-fga59641, SKU fortura-59641) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook video · 2026-11-11 09:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1020905711027186 · Zwilling: https://www.instagram.com/reel/DfmAeS9Afbe/
- Text: «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis CHF 30, jedes mit Preis und Lieferzeit: LED Tulpen-Planet (CHF 28.90), Retro-Voge…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-11 08:03 UTC gepostet: https://www.facebook.com/reel/1020905711027186/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-11 09:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfmAeS9Afbe/ · Zwilling: https://facebook.com/reel/1020905711027186
- Text: «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis CHF 30, jedes mit Preis und Lieferzeit: LED Tulpen-Planet (CHF 28.90), Retro-Voge…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-11 08:03 UTC gepostet: https://www.instagram.com/reel/DfmAeS9Afbe/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · YouTube video · 2026-11-10 16:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/OGGwUgaN1Js
- Text: «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16, ab 3 Jahren · CHF 26.90 Ab Schweizer Lager · Liefe…»
- Produkt: JCB Mikrobagger 8010 CTS (ACTIVE, https://luxestyle.ch/products/jcb-mikrobagger-8010-cts-fga062003, SKU fortura-062003) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook video · 2026-11-10 12:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1704177608010716 · Zwilling: https://www.instagram.com/reel/Dfjwjw9Co7L/
- Text: «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16, ab 3 Jahren · CHF 26.90 Ab Schweizer Lager · Liefe…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-10 11:05 UTC gepostet: https://www.facebook.com/reel/1704177608010716/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram video · 2026-11-10 12:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Dfjwjw9Co7L/ · Zwilling: https://facebook.com/reel/1704177608010716
- Text: «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16, ab 3 Jahren · CHF 26.90 Ab Schweizer Lager · Liefe…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-10 11:08 UTC gepostet: https://www.instagram.com/reel/Dfjwjw9Co7L/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-11-10 11:05 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1704177608010716/ · Zwilling: https://www.instagram.com/reel/Dfjwjw9Co7L/
- Text: «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikrobagger 8010 CTS, Massstab 1:16, ab 3 Jahren · CHF 26.90 Ab Schweizer Lager · Liefe…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · YouTube video · 2026-11-10 10:00 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/t2GbsFcFWak
- Text: «Wichteln in der Familie und ein Kind ab 2 Jahren auf der Liste? 🚜 Der BRUDER Roadmax Traktor hat ein detailliertes Führerhaus, grosse Prof…»
- Produkt: BRUDER ROADMAX Traktor · Nr. 03451 (ACTIVE, https://luxestyle.ch/products/bruder-roadmax-traktor-fga03451, SKU fortura-03451) — Zuordnung: Link im Text
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook bild · 2026-10-29 12:15 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149607853350792 · Zwilling: https://www.instagram.com/p/DfE4L6AiEFG/
- Text: «Mealprep ohne Handarbeit 🥕 Gemüse in 5–10 Sekunden, Fleisch in 10–20 Sekunden. Eier-Rührgang fürs Verquirlen, Entsafter-Gang für Früchte –…»
- Produkt: Elektrischer Fleischwolf 5L – Küchenmaschine (DRAFT, nicht im Onlineshop, SKU CJYD181444603CX) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Elektrischer Fleischwolf 5L – Küchenmaschine» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Instagram bild · 2026-10-29 12:15 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfE4L6AiEFG/ · Zwilling: https://facebook.com/122108214291350792/posts/122149607853350792
- Text: «Mealprep ohne Handarbeit 🥕 Gemüse in 5–10 Sekunden, Fleisch in 10–20 Sekunden. Eier-Rührgang fürs Verquirlen, Entsafter-Gang für Früchte –…»
- Produkt: Elektrischer Fleischwolf 5L – Küchenmaschine (DRAFT, nicht im Onlineshop, SKU CJYD181444603CX) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Elektrischer Fleischwolf 5L – Küchenmaschine» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild: stainless, steel, high, and, cleaning  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Pinterest bild · 2026-10-27 17:10 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645584210524
- Text: «Leuchtender Schaukelgeist für draussen Beleuchtete Geisterfigur mit Schaukelbewegung für Türeingang, Garten und Vorplatz. Robuster Kunststo…»
- Produkt: Leuchtender Halloween-Schaukelgeist (ACTIVE, https://luxestyle.ch/products/leuchtender-halloween-schaukelgeist-627400, SKU CJYD304327501AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 27.90–58.90 («Leuchtender Halloween-Schaukelgeist», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-27 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645584171519/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest bild · 2026-10-27 14:40 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645584199400
- Text: «Elektrischer Fleischwolf 5L – Küchenmaschine Fünf Stufen: 8000 U/min für Gemüse und Obst, 10000 U/min für Fleisch, Karotten und Kürbis. Daz…»
- Produkt: Elektrischer Fleischwolf 5L – Küchenmaschine (DRAFT, nicht im Onlineshop, SKU CJYD181444603CX) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Elektrischer Fleischwolf 5L – Küchenmaschine» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-27 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645584171516/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-27 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584171519/
- Text: «Leuchtender Schaukelgeist 👻 Grosse Geisterfigur für draussen: integrierte Beleuchtung, schaukelt vor und zurück. Für Türeingang, Garten un…»
- Produkt: Leuchtender Halloween-Schaukelgeist (ACTIVE, https://luxestyle.ch/products/leuchtender-halloween-schaukelgeist-627400, SKU CJYD304327501AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 27.90–58.90 («Leuchtender Halloween-Schaukelgeist», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-27 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584171516/
- Text: «Elektrischer Fleischwolf 5L 🔪 Fleisch, Gemüse, Zwiebeln, Knoblauch und Kräuter – ein Gerät für Wurst, Füllungen, Saucen und Babynahrung. C…»
- Produkt: Elektrischer Fleischwolf 5L – Küchenmaschine (DRAFT, nicht im Onlineshop, SKU CJYD181444603CX) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Elektrischer Fleischwolf 5L – Küchenmaschine» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook bild · 2026-10-05 15:10 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143628313350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Haarige Tarantel · CHF 22.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- Produkt: Haarige Tarantel (DRAFT, nicht im Onlineshop, SKU fortura-98264) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Haarige Tarantel» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Haarige Tar»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook bild · 2026-10-02 15:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142708879350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz weiss · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- Produkt: Spinnennetz weiss (DRAFT, nicht im Onlineshop, SKU fortura-95405) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Spinnennetz weiss» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 24.90 («Spinnennetz weiss», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook bild · 2026-10-01 14:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142400221350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Fahnenkette Schweizer Kantone · CHF 25.90 Kleiner Schweizer Shop aus Belp, kein Konzern.…»
- Produkt: Fahnenkette Schweizer Kantone (DRAFT, nicht im Onlineshop, SKU fortura-88144) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Fahnenkette Schweizer Kantone» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Fahnenkette»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Fahnenkette Schweizer Kantone», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Bild 709×507 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-09-28 14:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1451952913459706/
- Text: «Outfit fertig in 10 Sekunden 👀 «Laptop-Tasche für Herren» — Die vielseitige Laptop-Tasche für Herren ist der ideale Begleiter für Büro und…»
- Produkt: Laptop-Tasche für Herren (ACTIVE, https://luxestyle.ch/products/laptop-tasche-fur-herren-121536, SKU CJYD192115801AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 17.90 («Laptop-Tasche für Herren», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

<details><summary>144 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · Pinterest pin · 2026-11-12 04:47 UTC · 44 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645585520882/
- Text: «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? 🍪 Ein nachgebildeter Keks auf brauner Spange (4 g, Kunstharz), wahlweise als Her…»
- Produkt: Haarspange Keks (ACTIVE, https://luxestyle.ch/products/schokoladen-ohrring-haarstecker-609700, SKU CJJT298338704DW) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 15.90 («Haarspange Keks», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram karussell · 2026-11-11 11:16 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DfmWjVnDWbs/
- Text: «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? 🍪 Ein nachgebildeter Keks auf brauner Spange (4 g, Kunstharz), wahlweise als Her…»
- Produkt: Haarspange Keks (ACTIVE, https://luxestyle.ch/products/schokoladen-ohrring-haarstecker-609700, SKU CJJT298338704DW) — Zuordnung: erste Zeile
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 15.90 («Haarspange Keks», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-11-02 17:04 UTC · 37 Aufrufe
- Post: https://www.instagram.com/p/DfPzMzQjZWv/
- Text: «Wichteln mit Kindern ab 3 Jahren und Budget unter CHF 20? 🐼 Der Plüsch Panda ist 15 cm gross und für Kinder ab 3 Jahren empfohlen, ein Wic…»
- Produkt: Plüsch Panda 15 cm (ACTIVE, https://luxestyle.ch/products/plusch-panda-15-cm-fga25867, SKU fortura-25867) — Zuordnung: erste Zeile
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 19.90 («Plüsch Panda 15 cm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-11-10 17:08 UTC · 33 Aufrufe
- Post: https://www.instagram.com/p/DfkaAekDZzD/
- Text: «Wichteln in der Familie und ein Kind ab 2 Jahren auf der Liste? 🚜 Der BRUDER Roadmax Traktor hat ein detailliertes Führerhaus, grosse Prof…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG FORMAT:** Bild 718×392 — Breite unter 1080 (Medium 2/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram karussell · 2026-11-07 10:03 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/Dfb7AZuCAtQ/
- Text: «Wichteln steht an und du suchst etwas für einen gemütlichen Sofaabend? 🛋️ Übergrosser Kapuzenpullover mit Taschen, der dich warm einpackt …»
- Produkt: XXL Hoodie-Decke mit Taschen für Sie & Ihn (ACTIVE, https://luxestyle.ch/products/xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264, SKU CJ-CJSY1589450-Short pink-On) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FORMAT:** Bild 719×720 — Breite unter 1080 (Medium 1/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-27 07:21 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/De_TqrLCINz/
- Text: «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von Widmann – für alle, die an Halloween auffallen wollen. CHF 35.90 Noch rechtzeitig…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-10-27 16:51 UTC · 30 Aufrufe
- Post: https://www.instagram.com/p/DfAU7Keigyq/
- Text: «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin 🧛‍♀️ Von Widmann – macht aus jedem schwarzen Outfit einen Halloween-Look. CHF 24…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-10-26 16:41 UTC · 29 Aufrufe
- Post: https://www.instagram.com/p/De9vCzBiq0U/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122149007373350792
- Text: «Für kleine Hexen 🧙‍♀️ Kleid und Hut von Widmann – fertig für die Halloween-Runde. Grössen stehen auf der Produktseite. CHF 38.90 Bestell j…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-10-26 07:11 UTC · 27 Aufrufe
- Post: https://www.instagram.com/p/De8tuEIjcBl/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122148913683350792
- Text: «Das Gebiss, das aus jedem Outfit einen Vampir macht 🧛 Graf-Dracula-Gebiss in Weiss, verkauft im Bündel zu 10 Stück – genug für die ganze G…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-10-28 07:31 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DfB5nhuilNe/
- Text: «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann in Erwachsenengrösse. Das Bild zeigt es mit Zubehör – was genau im Lieferumfang …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-11-14 10:03 UTC · 20 Aufrufe
- Post: https://www.instagram.com/p/Dft8g1YjeOX/
- Text: «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfahrer mit Rennrad und Helm, Gliedmassen und Kopf sind beweglich, die Hände greifen…»
- Produkt: bworld Rennrad mit Radfahrer (ACTIVE, https://luxestyle.ch/products/bworld-rennrad-mit-radfahrer-fga063110, SKU fortura-063110) — Zuordnung: erste Zeile
- **WARNUNG FORMAT:** Bild 424×484 — Breite unter 1080 (Medium 1/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Bild 408×467 — Breite unter 1080 (Medium 2/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-24 22:08 UTC · 10 Aufrufe
- Post: https://www.instagram.com/p/DgI_hZMiihx/
- Text: «🍂 Herbst-Favorit Lässiger Kapuzenpullover für Damen · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, d…»
- Produkt: Lässiger Kapuzenpullover für Damen (ACTIVE, https://luxestyle.ch/products/lassiger-kapuzenpullover-fur-damen-612700, SKU CJ-CJWY276566601AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-24 21:31 UTC gepostet: (geplant, Metricool 440859498)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest pin · 2026-10-30 04:46 UTC · 7 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584431687/
- Text: «Relaxed Fit Hoodie «Cosy» – mit Fell-Panel und Kordelzug. Für kühle Abende: lockerer Schnitt, weicher Look, Kordelzug zum Anpassen. ab CHF …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-29 19:00 UTC gepostet: https://www.pinterest.es/pin/1111333645584392071  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-29 04:46 UTC · 7 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584344653/
- Text: «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann in Erwachsenengrösse. Das Bild zeigt es mit Zubehör – was genau im Lieferumfang …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-30 19:09 UTC · 7 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142170619350792
- Text: «👀 Gerade besonders gefragt Y2K Harajuku Hoodie mit Nieten · CHF 20.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkt…»
- Produkt: Y2K Harajuku Hoodie mit Nieten (ACTIVE, https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700, SKU CJ-CJLS273231201AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 20.90, Shop CHF 18.90–19.90 («Y2K Harajuku Hoodie mit Nieten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook album · 2026-11-14 10:02 UTC · 5 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122153165379350792 · Zwilling: https://www.instagram.com/p/Dft8g1YjeOX/
- Text: «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfahrer mit Rennrad und Helm, Gliedmassen und Kopf sind beweglich, die Hände greifen…»
- Produkt: bworld Rennrad mit Radfahrer (ACTIVE, https://luxestyle.ch/products/bworld-rennrad-mit-radfahrer-fga063110, SKU fortura-063110) — Zuordnung: erste Zeile
- **WARNUNG FORMAT:** Bild 424×484 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG FORMAT:** Bild 408×467 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook album · 2026-11-11 11:15 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122152554969350792 · Zwilling: https://www.instagram.com/p/DfmWjVnDWbs/
- Text: «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? 🍪 Ein nachgebildeter Keks auf brauner Spange (4 g, Kunstharz), wahlweise als Her…»
- Produkt: Haarspange Keks (ACTIVE, https://luxestyle.ch/products/schokoladen-ohrring-haarstecker-609700, SKU CJJT298338704DW) — Zuordnung: erste Zeile
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 15.90 («Haarspange Keks», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Facebook bild · 2026-10-27 16:50 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122149221183350792 · Zwilling: https://www.instagram.com/p/DfAU7Keigyq/
- Text: «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin 🧛‍♀️ Von Widmann – macht aus jedem schwarzen Outfit einen Halloween-Look. CHF 24…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Pinterest pin · 2026-10-27 04:46 UTC · 3 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584171515/
- Text: «Das Gebiss, das aus jedem Outfit einen Vampir macht 🧛 Graf-Dracula-Gebiss in Weiss, verkauft im Bündel zu 10 Stück – genug für die ganze G…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-10-01 06:16 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1675461947335590/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler manueller Massageroller» — Dieser vielseitige Massageroller wurde entwickelt, um Muskel…»
- Produkt: Multifunktionaler manueller Massageroller (ACTIVE, https://luxestyle.ch/products/multifunktionaler-manueller-massageroller-851904, SKU CJAM170235201AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Multifunktionaler manueller Massageroller», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG TON:** übersteuert: True Peak +3.7 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-30 21:38 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/944992101525899/
- Text: «Für die Katze, die alles darf 👀 «Schaukelspielzeug für Katzen mit Bällen» — Dieses Schaukelspielzeug bietet deiner Katze eine unterhaltsam…»
- Produkt: Schaukelspielzeug für Katzen mit Bällen (ACTIVE, https://luxestyle.ch/products/schaukelspielzeug-fur-katzen-mit-ballen-627776, SKU CJ-1392687111479627776) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-30 16:21 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1036507699423763/
- Text: «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, getragen von @tatjanalarsinamoira 💛 «Blumenkleid mit Schnürung» · CHF 24.90 «Mi…»
- Produkt: Blumenkleid mit Schnürung (ACTIVE, https://luxestyle.ch/products/blumenkleid-mit-schnurung-613000, SKU CJ-CJLY299268001AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 39.90, Shop CHF 24.90 («Blumenkleid mit Schnürung», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 20:27 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122141619129350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-30 13:00 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1666245875100500/
- Text: «Dein Hund wird es lieben 👀 «Hunde-Geschirr mit Leine, tragbar» — Dieses tragbare Hundegeschirr mit passender Leine ist ideal für den tägli…»
- Produkt: Hunde-Geschirr mit Leine, tragbar (ACTIVE, https://luxestyle.ch/products/hunde-geschirr-mit-leine-tragbar-224832, SKU CJGY204617501AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Hunde-Geschirr mit Leine, tragbar», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-29 17:10 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1516076157227660/
- Text: «Küche, aber einfacher 👀 «Schnellauftauplatte für die Küche» — Die Schnellauftauplatte aus Aluminium ist ein praktischer Helfer in jeder Kü…»
- Produkt: Schnellauftauplatte für die Küche (ACTIVE, https://luxestyle.ch/products/schnellauftauplatte-fur-die-kuche-750720, SKU CJ-1422455623806750720) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 37.90, Shop CHF 33.90 («Schnellauftauplatte für die Küche», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-10-28 04:46 UTC · 2 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584259054/
- Text: «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von Widmann – für alle, die an Halloween auffallen wollen. CHF 35.90 Noch rechtzeitig…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-10-27 07:20 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122149125927350792 · Zwilling: https://www.instagram.com/p/De_TqrLCINz/
- Text: «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von Widmann – für alle, die an Halloween auffallen wollen. CHF 35.90 Noch rechtzeitig…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Facebook reel · 2026-10-03 17:09 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/2588196088320012/
- Text: «Küche, aber einfacher 👀 «Tragbarer Mini-Entsafter» CHF 25.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 https://luxestyle.ch/prod…»
- Produkt: Tragbarer Mini-Entsafter (ACTIVE, https://luxestyle.ch/products/tragbarer-mini-entsafter-227840, SKU CJCJ165377401AZ) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG TON:** übersteuert: True Peak +2.4 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-10-01 23:12 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1111970258030994/
- Text: «Genau das hat gefehlt 👀 «Gemüseschneider mit Reiben und Hobeln» — Dieser praktische Küchenhelfer vereinfacht das Schneiden und Zerkleinern…»
- Produkt: Gemüseschneider mit Reiben und Hobeln (ACTIVE, https://luxestyle.ch/products/gemuseschneider-mit-reiben-und-hobeln-964352, SKU CJCJ110520601AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90–32.90 («Gemüseschneider mit Reiben und Hobeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-09-30 12:18 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142095595350792
- Text: «👀 Gerade besonders gefragt Leinenhemd Langarm · CHF 16.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür e…»
- Produkt: Leinenhemd Langarm – Lässig & Bequem (ACTIVE, https://luxestyle.ch/products/leinenhemd-langarm-lassig-bequem-621700, SKU CJ-CJDS293306601AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 16.90, Shop CHF 14.90–15.90 («Leinenhemd Langarm – Lässig & Bequem», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-09-29 08:11 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/2103258493619795/
- Text: «Wusstest du das schon? 👀 «Vegetarische Schredder-Box» CHF 33.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 https://luxestyle.ch/p…»
- Produkt: Gemüseschneider mit Auffangbox · 8 Einsätze (ACTIVE, https://luxestyle.ch/products/vegetarische-schredder-box-342016, SKU CJCF182948501AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Gemüseschneider mit Auffangbox · 8 Einsätze», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-09-29 03:09 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141690895350792
- Text: «🍂 Herbst-Favorit Warme Winter-Hausschuhe · CHF 33.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlic…»
- Produkt: Warme Winter-Hausschuhe (ACTIVE, https://luxestyle.ch/products/warme-winter-hausschuhe-063744, SKU CJ-CJNY131339201AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Warme Winter-Hausschuhe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-28 07:30 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122149359501350792 · Zwilling: https://www.instagram.com/p/DfB5nhuilNe/
- Text: «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann in Erwachsenengrösse. Das Bild zeigt es mit Zubehör – was genau im Lieferumfang …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Pinterest pin · 2026-10-28 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584259055/
- Text: «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin 🧛‍♀️ Von Widmann – macht aus jedem schwarzen Outfit einen Halloween-Look. CHF 24…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-10-26 16:41 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122149007373350792 · Zwilling: https://www.instagram.com/p/De9vCzBiq0U/
- Text: «Für kleine Hexen 🧙‍♀️ Kleid und Hut von Widmann – fertig für die Halloween-Runde. Grössen stehen auf der Produktseite. CHF 38.90 Bestell j…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Facebook reel · 2026-10-03 08:56 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1435922085340582/
- Text: «Neu bei LuxeStyle 👀 «Elektrischer Flaschenöffner mit Zubehör» — Dieser elektrische Flaschenöffner ist ein praktischer Helfer für jeden Wei…»
- Produkt: Elektrischer Flaschenöffner mit Zubehör (ACTIVE, https://luxestyle.ch/products/elektrischer-flaschenoffner-mit-zubehor-701952, SKU CJYD192135501AZ) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-10-03 00:33 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1592675712339198/
- Text: «Wusstest du das schon? 👀 «Plüsch-Entenküken mit Quietschelement» — Dieses charmante Plüsch-Entenküken ist das ideale Beissspielzeug für de…»
- Produkt: Plüsch-Entenküken mit Quietschelement (ACTIVE, https://luxestyle.ch/products/plusch-entenkuken-mit-quietschelement-584064, SKU CJGY113421701AZ) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-30 02:09 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/4547476865491835/
- Text: «Dein Hund wird es lieben 👀 «10er-Pack verstellbare PU-Hundehalsbänder mit Glöckchen» — Dieses Set enthält zehn hochwertige Hundehalsbänder…»
- Produkt: 10er-Pack verstellbare PU-Hundehalsbänder mit Glöckchen (ACTIVE, https://luxestyle.ch/products/10er-pack-verstellbare-pu-hundehalsbander-mit-001792, SKU CJGY127906701AZ) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook album · 2026-09-29 20:25 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141900139350792
- Text: «Strickpullover Rundhals Loose-Fit · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angesc…»
- Produkt: Strickpullover Rundhals Loose-Fit (ACTIVE, https://luxestyle.ch/products/strickpullover-rundhals-loose-fit-634500, SKU CJ-CJMY293330002BY) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90 («Strickpullover Rundhals Loose-Fit», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-09-28 23:09 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1408158774777080/
- Text: «Dein Hund wird es lieben 👀 «Reflektierendes Hunde-Brustgeschirr mit Leine» — Dieses Brustgeschirr mit Leine hilft dir, deinen Hund beim Sp…»
- Produkt: Reflektierendes Hunde-Brustgeschirr mit Leine (ACTIVE, https://luxestyle.ch/products/reflektierendes-hunde-brustgeschirr-mit-leine-050816, SKU CJGY197522901AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90–23.90 («Reflektierendes Hunde-Brustgeschirr mit Leine», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · TikTok bild · 2026-11-29 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442297184)
- Text: «Fünf Farben, ein Kartenetui: Welche passt zu dir? Kartenetui aus Aluminiumlegierung im schlichten, minimalistischen Stil. Für Kreditkarten …»
- (+ 4 Hinweise, siehe Hinweis-Liste)
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «bis morgen, 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: Metricool-API PATCH /v2/scheduler/posts/{id} [Q3]

### WARNUNG · Facebook bild · 2026-11-29 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442297277) · Zwilling: (geplant, Metricool 442297277)
- Text: «Rot, Blau, Schwarz, Dunkelgrau oder Silber? 💳 Das Kartenetui ist aus einer Aluminiumlegierung, schlicht und minimalistisch. Darin haben de…»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «bis morgen, 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-29 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442297277) · Zwilling: (geplant, Metricool 442297277)
- Text: «Rot, Blau, Schwarz, Dunkelgrau oder Silber? 💳 Das Kartenetui ist aus einer Aluminiumlegierung, schlicht und minimalistisch. Darin haben de…»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «bis morgen, 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · TikTok bild · 2026-11-28 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296035)
- Text: «Warmlicht, Farblicht oder ohne Licht? Wisch durch. 🎄 Weihnachtsgirlande aus PVC mit Kiefernzapfen, roten Beeren und roten Schleifen. Erhäl…»
- (+ 4 Hinweise, siehe Hinweis-Liste)
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «ck Week bis 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: Metricool-API PATCH /v2/scheduler/posts/{id} [Q3]

### WARNUNG · Facebook bild · 2026-11-28 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296414) · Zwilling: (geplant, Metricool 442296414)
- Text: «Warmlicht, Farblicht oder ganz ohne Licht: welche nimmst du? 🎄 Die Weihnachtsgirlande ist aus PVC und mit Kiefernzapfen, roten Beeren und …»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «ck Week bis 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-28 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296414) · Zwilling: (geplant, Metricool 442296414)
- Text: «Warmlicht, Farblicht oder ganz ohne Licht: welche nimmst du? 🎄 Die Weihnachtsgirlande ist aus PVC und mit Kiefernzapfen, roten Beeren und …»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «ck Week bis 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · TikTok bild · 2026-11-27 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442295898)
- Text: «Ein Bommel oder zwei: welche Wichtel hängst du auf? Weihnachts-Plüschfiguren im 5er-Set, aus Stoff, mit Schlaufe zum Aufhängen. Zwei Modell…»
- (+ 4 Hinweise, siehe Hinweis-Liste)
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «. 🖤 Black Friday: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: Metricool-API PATCH /v2/scheduler/posts/{id} [Q3]

### WARNUNG · Facebook bild · 2026-11-27 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296266) · Zwilling: (geplant, Metricool 442296266)
- Text: «Fünf Wichtel für deine Weihnachtsdeko 🎄 Die Weihnachts-Plüschfiguren im 5er-Set sind aus Stoff. Jede Figur trägt eine andere Mütze und hat…»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «. 🖤 Black Friday: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-27 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296266) · Zwilling: (geplant, Metricool 442296266)
- Text: «Fünf Wichtel für deine Weihnachtsdeko 🎄 Die Weihnachts-Plüschfiguren im 5er-Set sind aus Stoff. Jede Figur trägt eine andere Mütze und hat…»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «. 🖤 Black Friday: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · TikTok bild · 2026-11-26 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442295748)
- Text: «Gelb oder Dunkelblau: Welcher Kaffeebecher wäre deiner? Kaffeebecher aus Edelstahl, 300 ml, ohne Henkel, minimalistisches Design. Sechs Aus…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «ck Week bis 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: Metricool-API PATCH /v2/scheduler/posts/{id} [Q3]

### WARNUNG · Facebook bild · 2026-11-26 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296165) · Zwilling: (geplant, Metricool 442296165)
- Text: «Kaffeebecher in Gelb oder Dunkelblau? ☕ Der Kaffeebecher ist aus Edelstahl und fasst 300 ml. Er kommt ohne Henkel aus, das Design ist schli…»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «ck Week bis 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-26 17:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 442296165) · Zwilling: (geplant, Metricool 442296165)
- Text: «Kaffeebecher in Gelb oder Dunkelblau? ☕ Der Kaffeebecher ist aus Edelstahl und fasst 300 ml. Er kommt ohne Henkel aus, das Design ist schli…»
- **WARNUNG CODE:** Rabattaussage ohne aktiven Code/Streichpreis: «ck Week bis 30.11.: 15 % Rabatt ab CHF 80 Bestellwe»  
  → Vorschlag: belegen oder streichen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-11-26 06:48 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4038713227336327979 · Zwilling: https://facebook.com/122108214291350792/posts/1132723009367868
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-26 06:48 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1132723009367868 · Zwilling: https://www.instagram.com/stories/luxestyle.ch/4038713227336327979
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-26 06:47 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgMY9TnCEZ0/
- Text: «Herz-Muschel-Anhänger · CHF 14.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrieben · 30…»
- Produkt: Herz-Muschel-Anhänger · Titanstahl, wasserfest (Stahl/Roségold/Gold) (ACTIVE, https://luxestyle.ch/products/herz-muschel-anhanger-titanstahl-wasserfest-stahl-rosegold-gold, SKU CJLX291705301AZ) — Zuordnung: Ledger kimi-ein-herz-aus-muschelglanz-das-je-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-26 05:48 UTC gepostet: https://www.instagram.com/p/DgMY9TnCEZ0/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-25 23:09 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgLkcbbih2p/
- Text: «Dein Herz schlägt für den Mond – diese zarte Herz-Mond-Kette umschmeichelt dein Schlüsselbein wie ein leiser Liebesbeweis. Herz-Mond-Halske…»
- Produkt: Herz-Mond-Halskette · zarte Schlüsselbein-Kette (Silber-Optik) (ACTIVE, https://luxestyle.ch/products/herz-mond-halskette-zarte-schlusselbein-kette-silber-optik, SKU CJLX291744001AZ) — Zuordnung: Ledger kimi-dein-herz-schl-gt-f-r-den-mond-d-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 22:10 UTC gepostet: https://www.instagram.com/p/DgLkcbbih2p/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-11-25 18:45 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgLGVw1MQhp/ · Zwilling: https://facebook.com/reel/3315392165333852
- Text: «Kleiner Cartoon-Dampfer 👀 «Kleiner Cartoon-Dampfer» — Dieser kleine, tragbare Dampfer ist ideal für den Einsatz zu Hause. CHF 15.90 · Grat…»
- Produkt: Kleiner Cartoon-Dampfer (ACTIVE, https://luxestyle.ch/products/kleiner-cartoon-dampfer-953088, SKU CJ-CJJT130154801AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 17:46 UTC gepostet: https://www.instagram.com/reel/DgLGVw1MQhp/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-25 18:45 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/3315392165333852 · Zwilling: https://www.instagram.com/reel/DgLGVw1MQhp/
- Text: «Kleiner Cartoon-Dampfer 👀 «Kleiner Cartoon-Dampfer» — Dieser kleine, tragbare Dampfer ist ideal für den Einsatz zu Hause. CHF 15.90 · Grat…»
- Produkt: Kleiner Cartoon-Dampfer (ACTIVE, https://luxestyle.ch/products/kleiner-cartoon-dampfer-953088, SKU CJ-CJJT130154801AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 17:46 UTC gepostet: https://www.facebook.com/reel/3315392165333852/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-11-25 18:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122155692567350792 · Zwilling: https://www.instagram.com/p/DgLCN9uCEQ2/
- Text: «Black Week bei LuxeStyle 🖤 15 % auf alles ab CHF 80 – automatisch im Warenkorb, kein Code nötig. Nur bis Montag, 30. November. Mode, Techn…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-25 17:10 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122155692591350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-25 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgLCN9uCEQ2/ · Zwilling: https://facebook.com/122108214291350792/posts/122155692567350792
- Text: «Black Week bei LuxeStyle 🖤 15 % auf alles ab CHF 80 – automatisch im Warenkorb, kein Code nötig. Nur bis Montag, 30. November. Mode, Techn…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-25 17:11 UTC gepostet: https://www.instagram.com/p/DgLCN9uCEQ2/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-25 16:58 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgK5-yeiEgG/
- Text: «Verwandle jeden Raum in ein Meer aus warmem Sonnenuntergangslicht – 16 Farben, stufenlos dimmbar. Sonnenuntergang-Projektionslampe · CHF 24…»
- Produkt: Sonnenuntergang-Projektionslampe · 16 Farben, dimmbar (ACTIVE, https://luxestyle.ch/products/sunset-projection-lamp-16-colors-adjustable, SKU LX-LAMP-WHITE) — Zuordnung: Ledger kimi-verwandle-jeden-raum-in-ein-meer-15
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 15:59 UTC gepostet: https://www.instagram.com/p/DgK5-yeiEgG/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-25 16:48 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4038290459973227569
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-25 16:48 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1137322895573577
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-25 10:49 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgKPvmNjXWe/
- Text: «Neu bei LuxeStyle 🇨🇭 Thermo-Isolierbecher · Edelstahl, hält warm & kalt (Suppe & Kaffee) · CHF 16.90 Kleiner Schweizer Shop aus Belp, kei…»
- Produkt: Thermo-Isolierbecher · Edelstahl, hält warm & kalt (Suppe & Kaffee) (ACTIVE, https://luxestyle.ch/products/thermo-isolierbecher-edelstahl-halt-warm-kalt-suppe-kaffee, SKU CJYD291498201AZ) — Zuordnung: Ledger kimi-geniesse-deine-suppe-oder-deinen-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 09:49 UTC gepostet: https://www.instagram.com/p/DgKPvmNjXWe/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-11-25 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgKLDwFhH2H/ · Zwilling: https://facebook.com/reel/1046219018530122
- Text: «Dreifach-Ladegerät 👀 «Dreifach-Ladegerät» — Das Dreifach-Ladegerät ist ein vielseitiges Zubehör für dein Smartphone. ab CHF 14.90 · Gratis…»
- Produkt: Dreifach-Ladegerät (ACTIVE, https://luxestyle.ch/products/dreifach-ladegerat-366912, SKU CJ-CJJT160595101AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 09:11 UTC gepostet: https://www.instagram.com/reel/DgKLDwFhH2H/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-25 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1046219018530122 · Zwilling: https://www.instagram.com/reel/DgKLDwFhH2H/
- Text: «Dreifach-Ladegerät 👀 «Dreifach-Ladegerät» — Das Dreifach-Ladegerät ist ein vielseitiges Zubehör für dein Smartphone. ab CHF 14.90 · Gratis…»
- Produkt: Dreifach-Ladegerät (ACTIVE, https://luxestyle.ch/products/dreifach-ladegerat-366912, SKU CJ-CJJT160595101AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 09:08 UTC gepostet: https://www.facebook.com/reel/1046219018530122/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-25 06:38 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4037983436081357460
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-25 06:38 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1769104184686817
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-25 04:38 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgJlSVjij_s/
- Text: «Rechteckig, Unisex Armbanduhr «Rettangolo» · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrli…»
- Produkt: Armbanduhr «Rettangolo» – Rechteckig, Unisex (ACTIVE, https://luxestyle.ch/products/armbanduhr-rettangolo-rechteckig-unisex, SKU CJNS291439601AZ) — Zuordnung: Ledger kimi-edles-design-trifft-auf-zeitlose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-25 03:38 UTC gepostet: https://www.instagram.com/p/DgJlSVjij_s/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-24 23:07 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgI_hZMiihx/
- Text: «🍂 Herbst-Favorit Lässiger Kapuzenpullover für Damen · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, d…»
- Produkt: Lässiger Kapuzenpullover für Damen (ACTIVE, https://luxestyle.ch/products/lassiger-kapuzenpullover-fur-damen-612700, SKU CJ-CJWY276566601AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-24 21:31 UTC gepostet: (geplant, Metricool 440859498)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-24 21:32 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4037708344793383110
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-24 21:32 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1711660407183180
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram video · 2026-11-24 18:39 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DgIg5ebCokG/ · Zwilling: https://facebook.com/reel/2423587991713335
- Text: «Lenkrad-Tisch 👀 «Lenkrad-Tisch für unterwegs» — Dieser multifunktionale Lenkrad-Tisch ist dein idealer Begleiter für unterwegs. CHF 19.90 …»
- Produkt: Lenkrad-Tisch für unterwegs (ACTIVE, https://luxestyle.ch/products/lenkrad-tisch-fur-unterwegs-8f43ff, SKU CJ-CJQCNBFX00015-black) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-24 17:41 UTC gepostet: https://www.instagram.com/reel/DgIg5ebCokG/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-24 18:39 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2423587991713335 · Zwilling: https://www.instagram.com/reel/DgIg5ebCokG/
- Text: «Lenkrad-Tisch 👀 «Lenkrad-Tisch für unterwegs» — Dieser multifunktionale Lenkrad-Tisch ist dein idealer Begleiter für unterwegs. CHF 19.90 …»
- Produkt: Lenkrad-Tisch für unterwegs (ACTIVE, https://luxestyle.ch/products/lenkrad-tisch-fur-unterwegs-8f43ff, SKU CJ-CJQCNBFX00015-black) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-24 17:40 UTC gepostet: https://www.facebook.com/reel/2423587991713335/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-24 12:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgH2wQqCM9D/
- Text: «Schneemann, Elch oder Weihnachtsmann: wer sitzt bei dir mit am Tisch? 🎄 Der weihnachtliche Stuhlbezug aus Fleece kommt über die Rückenlehn…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-23 17:00 UTC gepostet: (geplant, Metricool 427963400)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-23 20:30 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1119757074237666 · Zwilling: https://www.instagram.com/reel/DgGIxIMEVYf/
- Text: «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warmem LED-Licht, in sechs Farben wählbar. Betrieb mit AAA-Batterie (nicht enthalten…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-23 19:31 UTC gepostet: https://www.facebook.com/reel/1119757074237666/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-11-22 17:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122154980013350792 · Zwilling: https://www.instagram.com/p/DgDMUNDCrB5/
- Text: «Was liegt bei dir unter dem Baum, bevor die Geschenke kommen? 🎄 Die Christbaumdecke mit goldenen Pailletten-Schneeflocken liegt rund um de…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-22 16:04 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122154980043350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-22 17:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DgDMUNDCrB5/ · Zwilling: https://facebook.com/122108214291350792/posts/122154980013350792
- Text: «Was liegt bei dir unter dem Baum, bevor die Geschenke kommen? 🎄 Die Christbaumdecke mit goldenen Pailletten-Schneeflocken liegt rund um de…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-22 16:05 UTC gepostet: https://www.instagram.com/p/DgDMUNDCrB5/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-11-16 14:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 428827820)
- Text: «Krallenpflege für Hund und Katze 🐾 Entdecke den elektrischen Krallenschleifer und prüfe die Anwendungshinweise im Shop. Gewöhne dein Tier …»
- **WARNUNG FORMAT:** Bild 513×498 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest bild · 2026-11-14 20:00 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645585728818
- Text: «bworld Rennrad mit Radfahrer: Gliedmassen und Kopf sind beweglich, für Kinder ab 4 Jahren. CHF 25.90, ab Schweizer Lager. Gratis Versand ab…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FORMAT:** Bild 424×484 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-11-14 19:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1135077642457526
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-14 19:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4030399378929278711
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-14 11:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122153165379350792 · Zwilling: https://www.instagram.com/p/Dft8g1YjeOX/
- Text: «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfahrer mit Rennrad und Helm, Gliedmassen und Kopf sind beweglich, die Hände greifen…»
- Produkt: bworld Rennrad mit Radfahrer (ACTIVE, https://luxestyle.ch/products/bworld-rennrad-mit-radfahrer-fga063110, SKU fortura-063110) — Zuordnung: erste Zeile
- **WARNUNG FORMAT:** Bild 424×484 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]
- **WARNUNG FORMAT:** Bild 408×467 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-14 11:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Dft8g1YjeOX/ · Zwilling: https://facebook.com/122108214291350792/posts/122153165379350792
- Text: «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfahrer mit Rennrad und Helm, Gliedmassen und Kopf sind beweglich, die Hände greifen…»
- Produkt: bworld Rennrad mit Radfahrer (ACTIVE, https://luxestyle.ch/products/bworld-rennrad-mit-radfahrer-fga063110, SKU fortura-063110) — Zuordnung: erste Zeile
- **WARNUNG FORMAT:** Bild 424×484 — Breite unter 1080 (Medium 1/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Bild 408×467 — Breite unter 1080 (Medium 2/2)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-11-13 17:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2328213768002859
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-13 17:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4029600117769811437
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-12 18:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122152805589350792 · Zwilling: https://www.instagram.com/p/Dfpjy_liBHC/
- Text: «Fürs Wichteln oder den Adventstisch noch eine Idee gesucht? 🦌 Der Kerzenhalter aus Eisen ist als Hirsch beziehungsweise Elch gestaltet, mi…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-12 17:09 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122152805613350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-12 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Dfpjy_liBHC/ · Zwilling: https://facebook.com/122108214291350792/posts/122152805589350792
- Text: «Fürs Wichteln oder den Adventstisch noch eine Idee gesucht? 🦌 Der Kerzenhalter aus Eisen ist als Hirsch beziehungsweise Elch gestaltet, mi…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-12 17:11 UTC gepostet: https://www.instagram.com/p/Dfpjy_liBHC/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-11-12 12:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1160757549758550
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-12 12:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4028738486185832383
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook video · 2026-11-12 10:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1436435851997086 · Zwilling: https://www.instagram.com/reel/DfosgS9Dmrr/
- Text: «Wellen aus Licht an der Wand. 🌊 Die Projektionsleuchte wirft sanfte Wasserwellen an Wand und Decke, die Lichtfarbe wählst du per Fernbedie…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-12 09:06 UTC gepostet: https://www.facebook.com/reel/1436435851997086/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-11-12 10:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfosgS9Dmrr/ · Zwilling: https://facebook.com/reel/1436435851997086
- Text: «Wellen aus Licht an der Wand. 🌊 Die Projektionsleuchte wirft sanfte Wasserwellen an Wand und Decke, die Lichtfarbe wählst du per Fernbedie…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-12 09:07 UTC gepostet: https://www.instagram.com/reel/DfosgS9Dmrr/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-11 20:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1441367000897943 · Zwilling: https://www.instagram.com/reel/DfnMYppDaGx/
- Text: «Eine Rose im Glascover mit warmem LED-Licht. 🌹 In sechs Farben wählbar, passend für Dekoration, Partys oder Hochzeiten. Betrieb mit AAA-Ba…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-11 19:06 UTC gepostet: https://www.facebook.com/reel/1441367000897943/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-11-11 20:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfnMYppDaGx/ · Zwilling: https://facebook.com/reel/1441367000897943
- Text: «Eine Rose im Glascover mit warmem LED-Licht. 🌹 In sechs Farben wählbar, passend für Dekoration, Partys oder Hochzeiten. Betrieb mit AAA-Ba…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-11 19:07 UTC gepostet: https://www.instagram.com/reel/DfnMYppDaGx/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-11-11 12:15 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122152554969350792 · Zwilling: https://www.instagram.com/p/DfmWjVnDWbs/
- Text: «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? 🍪 Ein nachgebildeter Keks auf brauner Spange (4 g, Kunstharz), wahlweise als Her…»
- Produkt: Haarspange Keks (ACTIVE, https://luxestyle.ch/products/schokoladen-ohrring-haarstecker-609700, SKU CJJT298338704DW) — Zuordnung: erste Zeile
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 15.90 («Haarspange Keks», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-11 12:15 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfmWjVnDWbs/ · Zwilling: https://facebook.com/122108214291350792/posts/122152554969350792
- Text: «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? 🍪 Ein nachgebildeter Keks auf brauner Spange (4 g, Kunstharz), wahlweise als Her…»
- Produkt: Haarspange Keks (ACTIVE, https://luxestyle.ch/products/schokoladen-ohrring-haarstecker-609700, SKU CJJT298338704DW) — Zuordnung: erste Zeile
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 15.90 («Haarspange Keks», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-10 12:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1702365811464870
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-10 12:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4027288926552636904
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-11-09 16:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1158068536959635
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-09 16:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4026671048136770884
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook video · 2026-11-07 18:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/908936765536062
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Im Vide…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-07 17:09 UTC gepostet: https://www.facebook.com/reel/908936765536062/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-11-07 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Dfcrxn_GvhT/
- Text: «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt farbige Fontänen sprudeln, mit zwei Lautsprechern und 3.5-mm-Anschluss. Im Vide…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-07 17:09 UTC gepostet: https://www.instagram.com/reel/Dfcrxn_GvhT/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-11-07 11:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122151676791350792 · Zwilling: https://www.instagram.com/p/Dfb7AZuCAtQ/
- Text: «Wichteln steht an und du suchst etwas für einen gemütlichen Sofaabend? 🛋️ Übergrosser Kapuzenpullover mit Taschen, der dich warm einpackt …»
- Produkt: XXL Hoodie-Decke mit Taschen für Sie & Ihn (ACTIVE, https://luxestyle.ch/products/xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264, SKU CJ-CJSY1589450-Short pink-On) — Zuordnung: erste Zeile
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-06 04:14 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122143775343350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook video · 2026-11-06 10:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/4144146969049814 · Zwilling: https://www.instagram.com/reel/DfZPoGfEY3s/
- Text: «Funkelnd, leicht und zeitlos: das Tennisarmband mit Zirkon. ✨ Folge uns für neue Geschenkideen. Link in Bio: luxestyle.ch»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-06 09:04 UTC gepostet: https://www.facebook.com/reel/4144146969049814/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-11-06 10:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfZPoGfEY3s/ · Zwilling: https://facebook.com/reel/4144146969049814
- Text: «Funkelnd, leicht und zeitlos: das Tennisarmband mit Zirkon. ✨ Folge uns für neue Geschenkideen. Link in Bio: luxestyle.ch»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-06 09:06 UTC gepostet: https://www.instagram.com/reel/DfZPoGfEY3s/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-05 18:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1651496333243305
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-05 17:11 UTC gepostet: https://www.facebook.com/reel/1651496333243305/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-11-05 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfXilV7nPDy/
- Text: «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-Duftbefeuchter scheinen die Tropfen langsam nach oben zu fliessen, dazu befeucht…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-11-05 17:14 UTC gepostet: https://www.instagram.com/reel/DfXilV7nPDy/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-11-04 18:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122151029157350792 · Zwilling: https://www.instagram.com/p/DfU9OUFirl-/
- Text: «Wichteln im Büro und noch eine Idee für ihn, der pendelt? 🎒 Schlicht und einfarbig aus Polyester, mit USB-Schnittstelle (ohne Kabel) und i…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-04 17:07 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122151029181350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-11-04 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfU9OUFirl-/ · Zwilling: https://facebook.com/122108214291350792/posts/122151029157350792
- Text: «Wichteln im Büro und noch eine Idee für ihn, der pendelt? 🎒 Schlicht und einfarbig aus Polyester, mit USB-Schnittstelle (ohne Kabel) und i…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-04 17:08 UTC gepostet: https://www.instagram.com/p/DfU9OUFirl-/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-11-04 10:00 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2924566081262394 · Zwilling: https://www.instagram.com/reel/DfUGxW7kYzw/
- Text: «Die Wasserwellen-Lampe taucht den Raum in warmes, bewegtes Licht. 🌊✨ Ein ruhiger Akzent für dein Zuhause. Folge uns für neue Ideen. Link i…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-04 09:04 UTC gepostet: https://www.facebook.com/reel/2924566081262394/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-11-04 10:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DfUGxW7kYzw/ · Zwilling: https://facebook.com/reel/2924566081262394
- Text: «Die Wasserwellen-Lampe taucht den Raum in warmes, bewegtes Licht. 🌊✨ Ein ruhiger Akzent für dein Zuhause. Folge uns für neue Ideen. Link i…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-11-04 09:12 UTC gepostet: https://www.instagram.com/reel/DfUGxW7kYzw/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-11-02 18:00 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122150523675350792 · Zwilling: https://www.instagram.com/p/DfPzMzQjZWv/
- Text: «Wichteln mit Kindern ab 3 Jahren und Budget unter CHF 20? 🐼 Der Plüsch Panda ist 15 cm gross und für Kinder ab 3 Jahren empfohlen, ein Wic…»
- Produkt: Plüsch Panda 15 cm (ACTIVE, https://luxestyle.ch/products/plusch-panda-15-cm-fga25867, SKU fortura-25867) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 19.90 («Plüsch Panda 15 cm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-11-02 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfPzMzQjZWv/ · Zwilling: https://facebook.com/122108214291350792/posts/122150523675350792
- Text: «Wichteln mit Kindern ab 3 Jahren und Budget unter CHF 20? 🐼 Der Plüsch Panda ist 15 cm gross und für Kinder ab 3 Jahren empfohlen, ein Wic…»
- Produkt: Plüsch Panda 15 cm (ACTIVE, https://luxestyle.ch/products/plusch-panda-15-cm-fga25867, SKU fortura-25867) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 19.90 («Plüsch Panda 15 cm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook album · 2026-11-02 17:03 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122150523675350792 · Zwilling: https://www.instagram.com/p/DfPzMzQjZWv/
- Text: «Wichteln mit Kindern ab 3 Jahren und Budget unter CHF 20? 🐼 Der Plüsch Panda ist 15 cm gross und für Kinder ab 3 Jahren empfohlen, ein Wic…»
- Produkt: Plüsch Panda 15 cm (ACTIVE, https://luxestyle.ch/products/plusch-panda-15-cm-fga25867, SKU fortura-25867) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.00, Shop CHF 19.90 («Plüsch Panda 15 cm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Facebook bild · 2026-10-30 18:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149890741350792 · Zwilling: https://www.instagram.com/p/DfIICZiiK-5/
- Text: «24 Türchen für Erwachsene 🎄 Charm-Armband-Adventskalender: 24 Teile zum Selbstgestalten (Ausführung Gold: 13 Anhänger, 9 Perlen, 2 Armbänd…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-30 17:31 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149890765350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-30 18:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfIICZiiK-5/ · Zwilling: https://facebook.com/122108214291350792/posts/122149890741350792
- Text: «24 Türchen für Erwachsene 🎄 Charm-Armband-Adventskalender: 24 Teile zum Selbstgestalten (Ausführung Gold: 13 Anhänger, 9 Perlen, 2 Armbänd…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-30 17:32 UTC gepostet: https://www.instagram.com/p/DfIICZiiK-5/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-29 18:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149668387350792 · Zwilling: https://www.instagram.com/p/DfFjLOiiv54/
- Text: «Relaxed Fit Hoodie «Cosy» – mit Fell-Panel und Kordelzug. Für kühle Abende: lockerer Schnitt, weicher Look, Kordelzug zum Anpassen. ab CHF …»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-29 17:31 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149668453350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-29 18:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfFjLOiiv54/ · Zwilling: https://facebook.com/122108214291350792/posts/122149668387350792
- Text: «Relaxed Fit Hoodie «Cosy» – mit Fell-Panel und Kordelzug. Für kühle Abende: lockerer Schnitt, weicher Look, Kordelzug zum Anpassen. ab CHF …»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-29 17:32 UTC gepostet: https://www.instagram.com/p/DfFjLOiiv54/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-29 17:20 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149659717350792 · Zwilling: https://www.instagram.com/p/DfFbHVPDebx/
- Text: «Kapuzenrobe mit Gruselfaktor 💀 Kostüm «Screaming Souls» von Widmann in Erwachsenengrösse – für Partys, Maskenbälle und die Fasnachtszeit. …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-29 16:20 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149659741350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-29 17:20 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfFbHVPDebx/ · Zwilling: https://facebook.com/122108214291350792/posts/122149659717350792
- Text: «Kapuzenrobe mit Gruselfaktor 💀 Kostüm «Screaming Souls» von Widmann in Erwachsenengrösse – für Partys, Maskenbälle und die Fasnachtszeit. …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-29 16:21 UTC gepostet: https://www.instagram.com/p/DfFbHVPDebx/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-29 08:40 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149574079350792 · Zwilling: https://www.instagram.com/p/DfEfiMfik--/
- Text: «Gänsehaut garantiert 👻 Gruselpuppe, 50 cm, weiss, von Widmann – bringt Horror-Stimmung in Deko und Party. CHF 19.90 🇨🇭 Ab Schweizer Lage…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-29 07:40 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149574103350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-29 08:40 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfEfiMfik--/ · Zwilling: https://facebook.com/122108214291350792/posts/122149574079350792
- Text: «Gänsehaut garantiert 👻 Gruselpuppe, 50 cm, weiss, von Widmann – bringt Horror-Stimmung in Deko und Party. CHF 19.90 🇨🇭 Ab Schweizer Lage…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-29 07:41 UTC gepostet: https://www.instagram.com/p/DfEfiMfik--/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-28 17:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149460067350792 · Zwilling: https://www.instagram.com/p/DfC3fbFimqy/
- Text: «Verhülle dich wie Dracula 🧛 Schwarzer Umhang von Widmann. Im Lieferumfang ist der Umhang – Hut, Perücke und Accessoires auf dem Bild sind …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-28 16:31 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149460091350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-28 17:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfC3fbFimqy/ · Zwilling: https://facebook.com/122108214291350792/posts/122149460067350792
- Text: «Verhülle dich wie Dracula 🧛 Schwarzer Umhang von Widmann. Im Lieferumfang ist der Umhang – Hut, Perücke und Accessoires auf dem Bild sind …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-28 16:31 UTC gepostet: https://www.instagram.com/p/DfC3fbFimqy/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-28 08:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149359471350792 · Zwilling: https://www.instagram.com/p/DfB5nhuilNe/
- Text: «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann in Erwachsenengrösse. Das Bild zeigt es mit Zubehör – was genau im Lieferumfang …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-28 07:30 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149359501350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-28 08:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfB5nhuilNe/ · Zwilling: https://facebook.com/122108214291350792/posts/122149359471350792
- Text: «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann in Erwachsenengrösse. Das Bild zeigt es mit Zubehör – was genau im Lieferumfang …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-28 07:31 UTC gepostet: https://www.instagram.com/p/DfB5nhuilNe/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-27 17:50 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149221159350792 · Zwilling: https://www.instagram.com/p/DfAU7Keigyq/
- Text: «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin 🧛‍♀️ Von Widmann – macht aus jedem schwarzen Outfit einen Halloween-Look. CHF 24…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-27 16:50 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149221183350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-27 17:50 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DfAU7Keigyq/ · Zwilling: https://facebook.com/122108214291350792/posts/122149221159350792
- Text: «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin 🧛‍♀️ Von Widmann – macht aus jedem schwarzen Outfit einen Halloween-Look. CHF 24…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-27 16:51 UTC gepostet: https://www.instagram.com/p/DfAU7Keigyq/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-27 08:20 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122149125897350792 · Zwilling: https://www.instagram.com/p/De_TqrLCINz/
- Text: «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von Widmann – für alle, die an Halloween auffallen wollen. CHF 35.90 Noch rechtzeitig…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-27 07:20 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122149125927350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-27 08:20 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/De_TqrLCINz/ · Zwilling: https://facebook.com/122108214291350792/posts/122149125897350792
- Text: «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von Widmann – für alle, die an Halloween auffallen wollen. CHF 35.90 Noch rechtzeitig…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-27 07:21 UTC gepostet: https://www.instagram.com/p/De_TqrLCINz/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest pin · 2026-10-27 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645584171518/
- Text: «Für kleine Hexen 🧙‍♀️ Kleid und Hut von Widmann – fertig für die Halloween-Runde. Grössen stehen auf der Produktseite. CHF 38.90 Bestell j…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-10-26 07:10 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122148913683350792 · Zwilling: https://www.instagram.com/p/De8tuEIjcBl/
- Text: «Das Gebiss, das aus jedem Outfit einen Vampir macht 🧛 Graf-Dracula-Gebiss in Weiss, verkauft im Bündel zu 10 Stück – genug für die ganze G…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen bei dir Gratis Vers»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Meta Business Suite (Post stammt von Metricool, API ändert nur eigene Posts) [Q1]

### WARNUNG · Facebook reel · 2026-10-05 15:12 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/2161699004730499/
- Text: «Endlich Ruhe beim Gassi? 👀 «Hundegeschirr-Set für kleine bis mittelgrosse Hunde» — Dieses bequeme und atmungsaktive Hundegeschirr-Set ist …»
- Produkt: Hundegeschirr-Set für kleine bis mittelgrosse Hunde (ACTIVE, https://luxestyle.ch/products/hundegeschirr-set-fur-kleine-bis-mittelgrosse-e4d174, SKU CJJJCWGY02089-Macaran-S) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-10-05 08:29 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143527681350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Liegender Plüschwolf · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand …»
- Produkt: Liegender Plüschwolf (ACTIVE, https://luxestyle.ch/products/liegender-pluschwolf-fga87797, SKU fortura-87797) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Liegender P»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-10-05 06:55 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1564870908288266/
- Text: «Das trägt jetzt jeder 👀 «Business Rucksack für Reise und Alltag» — Dieser schlichte Rucksack ist dein idealer Begleiter für Business, Reis…»
- Produkt: Business Rucksack für Reise und Alltag (ACTIVE, https://luxestyle.ch/products/business-rucksack-fur-reise-und-alltag-879296, SKU CJYD178798601AZ) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-10-05 02:28 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143463283350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Einweg-Pappbecher Bayern · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Vers…»
- Produkt: Einweg-Pappbecher Bayern (ACTIVE, https://luxestyle.ch/products/einweg-pappbecher-bayern-fga918b, SKU fortura-918-B) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Einweg-Papp»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-04 20:13 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143388685350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Bingo Nummernbälle 1-90 · CHF 78.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- Produkt: Bingo Nummernbälle 1-90 (ACTIVE, https://luxestyle.ch/products/bingo-nummernballe-1-90-fga82017, SKU fortura-82017) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Bingo Numme»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-04 05:12 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143185021350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Roter Papagei · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab Schw…»
- Produkt: Roter Papagei (ACTIVE, https://luxestyle.ch/products/roter-papagei-fga930741, SKU fortura-930741) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Roter Papag»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-10-02 15:21 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1628369782178782/
- Text: «Wusstest du das schon? 👀 «Handkurbel-Schäler für Äpfel und Birnen» — Dieser handliche Schäler revolutioniert das Schälen von Äpfeln und Bi…»
- Produkt: Handkurbel-Schäler für Äpfel und Birnen (ACTIVE, https://luxestyle.ch/products/handkurbel-schaler-fur-apfel-und-birnen-5235a8, SKU CJJJCFCF01639-Black gold) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90–24.90 («Handkurbel-Schäler für Äpfel und Birnen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook album · 2026-10-01 20:40 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142453423350792
- Text: «Eleganter Wollmantel mit Revers und Bindegürtel · CHF 48.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür …»
- Produkt: Eleganter Wollmantel mit Revers und Bindegürtel (ACTIVE, https://luxestyle.ch/products/eleganter-wollmantel-mit-revers-und-bindegurte-615500, SKU CJ-CJYD290679701AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 48.90, Shop CHF 42.90–44.90 («Eleganter Wollmantel mit Revers und Bindegürtel», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-01 20:24 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142448359350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Schweizer Lampion-Set · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand…»
- Produkt: Schweizer Lampion-Set (ACTIVE, https://luxestyle.ch/products/schweizer-lampion-set-fga86780, SKU fortura-86780) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Schweizer L»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Schweizer Lampion-Set», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-10-01 14:21 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1414626847469539/
- Text: «Für die Katze, die alles darf 👀 «Katzen-Spielzeug mit Futterspender» — Dieses multifunktionale Katzenspielzeug wurde entwickelt, um deine …»
- Produkt: Katzen-Spielzeug mit Futterspender (ACTIVE, https://luxestyle.ch/products/katzen-spielzeug-mit-futterspender-190208, SKU CJMY103886001AZ) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-09-29 16:27 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141854365350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- Produkt: Plüsch Alligator (ACTIVE, https://luxestyle.ch/products/plusch-alligator-fga88595, SKU fortura-88595) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 29.90, Shop CHF 26.90 («Plüsch Alligator», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-28 14:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141546235350792
- Text: «🛒 Schon von Kund:innen bestellt Multifunktionaler runder Gemüseschneider · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefer…»
- Produkt: Runder Gemüseschneider mit Handkurbel (ACTIVE, https://luxestyle.ch/products/multifunktionaler-runder-gemuseschneider-be2e21, SKU CJ-CJJJCFCF00364-Red) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Bild 500×500 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-09-27 20:01 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141356965350792
- Text: «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, …»
- Produkt: Kapuzen-Sweatshirt-Kleid mit Gürtel (ACTIVE, https://luxestyle.ch/products/kapuzen-sweatshirt-kleid-mit-gurtel-604900, SKU CJ-CJLY291801901AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Kapuzen-Sweatshirt-Kleid mit Gürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

</details>

## Hinweise (gesammelt)

362 Hinweise in 263 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 4 Beiträge mit generischen Reichweiten-Hashtags (#foryou #trending #fyp) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| TikTok | 2026-11-15 | 272 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «F 19.90 Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7708352119962733856 |
| TikTok | 2026-11-10 | 269 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «F 45.90 Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7706590233550277921 |
| TikTok | 2026-11-11 | 264 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager Versand CHF 7, ab C» | https://www.tiktok.com/@luxestyle.ch/video/7706868169293434144 |
| TikTok | 2026-11-06 | 263 | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 1/2) | https://www.tiktok.com/@luxestyle.ch/video/7705106204585954592 |
| TikTok | 2026-11-06 | 263 | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.tiktok.com/@luxestyle.ch/video/7705106204585954592 |
| TikTok | 2026-11-10 | 258 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «eeignet Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7706466549053361440 |
| TikTok | 2026-11-17 | 254 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/3) | https://www.tiktok.com/@luxestyle.ch/video/7709156775815056672 |
| TikTok | 2026-11-17 | 254 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/3) | https://www.tiktok.com/@luxestyle.ch/video/7709156775815056672 |
| TikTok | 2026-11-17 | 254 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/3) | https://www.tiktok.com/@luxestyle.ch/video/7709156775815056672 |
| TikTok | 2026-11-23 | 253 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | https://www.tiktok.com/@luxestyle.ch/video/7711414095441906977 |
| TikTok | 2026-11-23 | 253 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | https://www.tiktok.com/@luxestyle.ch/video/7711414095441906977 |
| TikTok | 2026-11-23 | 253 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | https://www.tiktok.com/@luxestyle.ch/video/7711414095441906977 |
| TikTok | 2026-11-23 | 253 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | https://www.tiktok.com/@luxestyle.ch/video/7711414095441906977 |
| TikTok | 2026-11-10 | 251 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «F 26.90 Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7706528046089506081 |
| TikTok | 2026-11-08 | 247 | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.tiktok.com/@luxestyle.ch/video/7705754377784479008 |
| TikTok | 2026-11-11 | 244 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «F 35.90 Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7706960660818775329 |
| TikTok | 2026-11-20 | 242 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/3) | https://www.tiktok.com/@luxestyle.ch/video/7710253723938835744 |
| TikTok | 2026-11-20 | 242 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/3) | https://www.tiktok.com/@luxestyle.ch/video/7710253723938835744 |
| TikTok | 2026-11-20 | 242 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/3) | https://www.tiktok.com/@luxestyle.ch/video/7710253723938835744 |
| TikTok | 2026-11-19 | 241 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | https://www.tiktok.com/@luxestyle.ch/video/7709931161593629985 |
| TikTok | 2026-11-19 | 241 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | https://www.tiktok.com/@luxestyle.ch/video/7709931161593629985 |
| TikTok | 2026-11-19 | 241 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | https://www.tiktok.com/@luxestyle.ch/video/7709931161593629985 |
| TikTok | 2026-11-19 | 241 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | https://www.tiktok.com/@luxestyle.ch/video/7709931161593629985 |
| TikTok | 2026-11-22 | 238 | FORMAT | Bild 864×1080 — Breite unter 1080 | https://www.tiktok.com/@luxestyle.ch/video/7711043114382675232 |
| TikTok | 2026-11-24 | 227 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | https://www.tiktok.com/@luxestyle.ch/video/7711785685035846951 |
| TikTok | 2026-11-24 | 227 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | https://www.tiktok.com/@luxestyle.ch/video/7711785685035846951 |
| TikTok | 2026-11-24 | 227 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | https://www.tiktok.com/@luxestyle.ch/video/7711785685035846951 |
| TikTok | 2026-11-24 | 227 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | https://www.tiktok.com/@luxestyle.ch/video/7711785685035846951 |
| TikTok | 2026-11-18 | 222 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/3) | https://www.tiktok.com/@luxestyle.ch/video/7709559779290533152 |
| TikTok | 2026-11-18 | 222 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/3) | https://www.tiktok.com/@luxestyle.ch/video/7709559779290533152 |
| TikTok | 2026-11-18 | 222 | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/3) | https://www.tiktok.com/@luxestyle.ch/video/7709559779290533152 |
| TikTok | 2026-11-05 | 208 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «F 19.90 Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7704735970611973408 |
| TikTok | 2026-11-05 | 208 | FORMAT | Bild 974×1067 — Breite unter 1080 (Medium 1/2) | https://www.tiktok.com/@luxestyle.ch/video/7704735970611973408 |
| TikTok | 2026-11-05 | 208 | FORMAT | Bild 1072×1080 — Breite unter 1080 (Medium 2/2) | https://www.tiktok.com/@luxestyle.ch/video/7704735970611973408 |
| TikTok | 2026-11-04 | 163 | FORMAT | Bild 899×900 — Breite unter 1080 (Medium 1/2) | https://www.tiktok.com/@luxestyle.ch/video/7704364538862308641 |
| TikTok | 2026-11-04 | 163 | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.tiktok.com/@luxestyle.ch/video/7704364538862308641 |
| TikTok | 2026-11-03 | 154 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «F 35.90 Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7703993914889358625 |
| TikTok | 2026-11-03 | 154 | FORMAT | Bild 910×903 — Breite unter 1080 (Medium 1/2) | https://www.tiktok.com/@luxestyle.ch/video/7703993914889358625 |
| TikTok | 2026-11-07 | 133 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «eeignet Schweiz: ab Schweizer Lager · Lieferdatum beim» | https://www.tiktok.com/@luxestyle.ch/video/7705383335169658144 |
| TikTok | 2026-11-07 | 133 | FORMAT | Bild 958×926 — Breite unter 1080 (Medium 1/2) | https://www.tiktok.com/@luxestyle.ch/video/7705383335169658144 |
| TikTok | 2026-11-07 | 133 | FORMAT | Bild 932×915 — Breite unter 1080 (Medium 2/2) | https://www.tiktok.com/@luxestyle.ch/video/7705383335169658144 |
| Instagram | 2026-11-10 | 79 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren · CHF 26.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.instagram.com/reel/Dfjwjw9Co7L/ |
| Facebook | 2026-10-05 | 75 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143702881350792 |
| Instagram | 2026-11-13 | 54 | FORMAT | Bild 720×831 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfrgKNZiF-m/ |
| Instagram | 2026-11-13 | 54 | FORMAT | Bild 720×892 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfrgKNZiF-m/ |
| Instagram | 2026-11-08 | 46 | FORMAT | Bild 910×903 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfefwCPCPMy/ |
| Instagram | 2026-10-31 | 45 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfKl5_fiKxd/ |
| Instagram | 2026-10-31 | 45 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfKl5_fiKxd/ |
| Pinterest | 2026-11-12 | 44 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfmWjVnDWbs/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585520882/ |
| Instagram | 2026-11-11 | 42 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfmWjVnDWbs/ |
| Instagram | 2026-11-11 | 42 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfmWjVnDWbs/ |
| Instagram | 2026-10-29 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 19.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.instagram.com/p/DfEfiMfik--/ |
| Instagram | 2026-11-12 | 39 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dfpjy_liBHC/ |
| Instagram | 2026-10-28 | 38 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 26.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.instagram.com/p/DfC3fbFimqy/ |
| Instagram | 2026-11-11 | 37 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Werktage. Nr. 4 ab Schweizer Lager, das Lieferdatum st» | https://www.instagram.com/p/Dfm3hybik4g/ |
| Instagram | 2026-11-02 | 37 | FORMAT | Bild 974×1067 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfPzMzQjZWv/ |
| Instagram | 2026-11-02 | 37 | FORMAT | Bild 1079×1087 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfPzMzQjZWv/ |
| Instagram | 2026-11-15 | 33 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfwhWf3DeS1/ |
| Instagram | 2026-11-15 | 33 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfwhWf3DeS1/ |
| Instagram | 2026-11-10 | 33 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «3451 · CHF 45.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.instagram.com/p/DfkaAekDZzD/ |
| Instagram | 2026-11-10 | 33 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfkaAekDZzD/ |
| Instagram | 2026-10-30 | 33 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DfIICZiiK-5/ |
| Instagram | 2026-10-30 | 33 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfHe3yXiJmd/ |
| Instagram | 2026-10-30 | 33 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfHe3yXiJmd/ |
| Instagram | 2026-11-07 | 32 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/Dfb7AZuCAtQ/ |
| Instagram | 2026-10-27 | 32 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «g vor Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/De_TqrLCINz/ |
| Instagram | 2026-10-29 | 31 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 47.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.instagram.com/p/DfFbHVPDebx/ |
| Instagram | 2026-10-24 | 31 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/De4UMgvDRsl/ |
| Instagram | 2026-11-15 | 30 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktseite. Artikel ab Schweizer Lager: das Lieferdatum st» | https://www.instagram.com/p/DfxD0rljRxX/ |
| Instagram | 2026-10-27 | 30 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «t für Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/DfAU7Keigyq/ |
| Instagram | 2026-10-25 | 30 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/De6_2-_jcxn/ |
| Pinterest | 2026-10-31 | 30 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfHe3yXiJmd/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584515007/ |
| Instagram | 2026-10-26 | 29 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «amstag klappt: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/De9vCzBiq0U/ |
| Instagram | 2026-11-01 | 28 | FORMAT | Bild 1000×1000 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfMhdfhCnTb/ |
| Instagram | 2026-11-01 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfMhdfhCnTb/ |
| Instagram | 2026-11-03 | 27 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfRwLoNjYvW/ |
| Instagram | 2026-11-03 | 27 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfRwLoNjYvW/ |
| Instagram | 2026-10-26 | 27 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «.90 · 10 Stück 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/De8tuEIjcBl/ |
| Instagram | 2026-10-26 | 27 | FORMAT | Bild 908×903 — Breite unter 1080 | https://www.instagram.com/p/De8tuEIjcBl/ |
| Instagram | 2026-11-05 | 26 | FORMAT | Bild 958×926 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfW5ymJCil5/ |
| Instagram | 2026-11-05 | 26 | FORMAT | Bild 932×915 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfW5ymJCil5/ |
| Instagram | 2026-10-23 | 26 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/De1vaw9CKCq/ |
| Instagram | 2026-10-28 | 25 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «te. CHF 55.90 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/DfB5nhuilNe/ |
| Instagram | 2026-10-20 | 25 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DetU8uyiLco/ |
| Instagram | 2026-10-21 | 24 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dewl1jMiLfV/ |
| Instagram | 2026-11-04 | 22 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DfU9OUFirl-/ |
| Instagram | 2026-10-22 | 22 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DezKtHIjQ2A/ |
| Instagram | 2026-10-21 | 22 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dev5vjRitZl/ |
| Instagram | 2026-10-20 | 21 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeuBB75CteR/ |
| Instagram | 2026-11-11 | 20 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager. Versand CHF 7, ab» | https://www.instagram.com/reel/DfmAeS9Afbe/ |
| Instagram | 2026-10-22 | 17 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeyeiaJDRUz/ |
| Instagram | 2026-10-19 | 15 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DercO_2jRNr/ |
| Pinterest | 2026-11-12 | 13 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Werktage. Nr. 4 ab Schweizer Lager, das Lieferdatum st» | https://www.pinterest.com/pin/1111333645585520885/ |
| Pinterest | 2026-11-12 | 13 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dfm3hybik4g/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585520885/ |
| Pinterest | 2026-11-13 | 12 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DfosgS9Dmrr/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585600899/ |
| Instagram | 2026-11-24 | 10 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DgI_hZMiihx/ |
| Instagram | 2026-11-25 | 9 | FORMAT | Bild 1024×1024 — Breite unter 1080 | https://www.instagram.com/p/DgLkcbbih2p/ |
| Instagram | 2026-11-25 | 9 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DgKPvmNjXWe/ |
| Facebook | 2026-11-07 | 9 | FORMAT | Bild 899×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122151676791350792 |
| Facebook | 2026-11-07 | 9 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122151676791350792 |
| Facebook | 2026-11-13 | 8 | FORMAT | Bild 810×935 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122152968393350792 |
| Facebook | 2026-11-13 | 8 | FORMAT | Bild 749×928 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122152968393350792 |
| Pinterest | 2026-10-30 | 7 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfFjLOiiv54/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584431687/ |
| Pinterest | 2026-10-29 | 7 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «te. CHF 55.90 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.pinterest.com/pin/1111333645584344653/ |
| Pinterest | 2026-10-29 | 7 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfB5nhuilNe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584344653/ |
| Pinterest | 2026-11-12 | 6 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager. Versand CHF 7, ab» | https://www.pinterest.com/pin/1111333645585521258/ |
| Pinterest | 2026-11-12 | 6 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DfmAeS9Afbe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585521258/ |
| Facebook | 2026-11-12 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122152805613350792 |
| Pinterest | 2026-11-12 | 5 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DfnMYppDaGx/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585521108/ |
| Facebook | 2026-11-08 | 4 | FORMAT | Bild 910×903 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122151902703350792 |
| Pinterest | 2026-11-05 | 4 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DfUGxW7kYzw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584942016/ |
| Pinterest | 2026-10-30 | 4 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfE4L6AiEFG/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584431684/ |
| Instagram | 2026-11-25 | 3 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DgJlSVjij_s/ |
| Facebook | 2026-11-11 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122152554969350792 |
| Facebook | 2026-11-11 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122152554969350792 |
| Facebook | 2026-11-10 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «3451 · CHF 45.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.facebook.com/122102579637350792/posts/122152413699350792 |
| Facebook | 2026-11-10 | 3 | FORMAT | Bild 896×896 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122152413699350792 |
| Facebook | 2026-11-10 | 3 | FORMAT | Bild 896×489 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122152413699350792 |
| Facebook | 2026-10-27 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «t für Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.facebook.com/122102579637350792/posts/122149221183350792 |
| Facebook | 2026-10-06 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143921845350792 |
| Pinterest | 2026-11-15 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DfuYIc7gPGV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585762664/ |
| Pinterest | 2026-11-10 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfhM84LDRo7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585366316/ |
| Pinterest | 2026-11-08 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dfb7AZuCAtQ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585201186/ |
| Pinterest | 2026-11-04 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfRwLoNjYvW/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584858020/ |
| Pinterest | 2026-10-27 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «.90 · 10 Stück 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.pinterest.com/pin/1111333645584171515/ |
| Pinterest | 2026-10-27 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/De8tuEIjcBl/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584171515/ |
| Facebook | 2026-11-15 | 2 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122153363619350792 |
| Facebook | 2026-11-15 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122153363619350792 |
| Facebook | 2026-11-11 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager. Versand CHF 7, ab» | https://www.facebook.com/reel/1020905711027186/ |
| Facebook | 2026-11-03 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122150671701350792 |
| Facebook | 2026-11-03 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122150671701350792 |
| Facebook | 2026-10-27 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «g vor Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.facebook.com/122102579637350792/posts/122149125927350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142095595350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141997921350792 |
| Facebook | 2026-09-29 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141690895350792 |
| Pinterest | 2026-11-11 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren · CHF 26.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.pinterest.com/pin/1111333645585443687/ |
| Pinterest | 2026-11-11 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dfjwjw9Co7L/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585443687/ |
| Pinterest | 2026-11-07 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DfZPoGfEY3s/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585110327/ |
| Pinterest | 2026-10-31 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfIICZiiK-5/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584515006/ |
| Pinterest | 2026-10-30 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 47.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.pinterest.com/pin/1111333645584431685/ |
| Pinterest | 2026-10-30 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfFbHVPDebx/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584431685/ |
| Pinterest | 2026-10-30 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 19.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.pinterest.com/pin/1111333645584431682/ |
| Pinterest | 2026-10-30 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfEfiMfik--/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584431682/ |
| Pinterest | 2026-10-28 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «g vor Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.pinterest.com/pin/1111333645584259054/ |
| Pinterest | 2026-10-28 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/De_TqrLCINz/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584259054/ |
| Facebook | 2026-11-15 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktseite. Artikel ab Schweizer Lager: das Lieferdatum st» | https://www.facebook.com/122102579637350792/posts/122153422575350792 |
| Facebook | 2026-11-11 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Werktage. Nr. 4 ab Schweizer Lager, das Lieferdatum st» | https://www.facebook.com/122102579637350792/posts/122152600473350792 |
| Facebook | 2026-11-04 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122151029181350792 |
| Facebook | 2026-10-30 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122149890765350792 |
| Facebook | 2026-10-28 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 26.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.facebook.com/122102579637350792/posts/122149460091350792 |
| Facebook | 2026-10-28 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «te. CHF 55.90 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.facebook.com/122102579637350792/posts/122149359501350792 |
| Facebook | 2026-10-26 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «amstag klappt: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.facebook.com/122102579637350792/posts/122149007373350792 |
| Facebook | 2026-10-06 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143842081350792 |
| Facebook | 2026-10-03 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143004745350792 |
| Facebook | 2026-10-03 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142918267350792 |
| Facebook | 2026-09-28 | 1 | FORMAT | Bild 896×1200 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141469087350792 |
| Pinterest | 2026-11-15 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dft8g1YjeOX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585762270/ |
| Pinterest | 2026-11-13 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dfpjy_liBHC/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585600451/ |
| Pinterest | 2026-11-07 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfaHBaADcge/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585109379/ |
| Pinterest | 2026-11-05 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfU9OUFirl-/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584941425/ |
| Pinterest | 2026-10-29 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 26.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.pinterest.com/pin/1111333645584344654/ |
| Pinterest | 2026-10-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfC3fbFimqy/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584344654/ |
| Pinterest | 2026-10-28 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «t für Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.pinterest.com/pin/1111333645584259055/ |
| Pinterest | 2026-10-28 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfAU7Keigyq/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584259055/ |
| Instagram | 2026-11-26 | 0 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DgMY9TnCEZ0/ |
| Facebook | 2026-11-10 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren · CHF 26.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.facebook.com/reel/1704177608010716/ |
| Facebook | 2026-11-05 | 0 | FORMAT | Bild 958×926 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122151208125350792 |
| Facebook | 2026-11-05 | 0 | FORMAT | Bild 932×915 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122151208125350792 |
| Facebook | 2026-11-02 | 0 | FORMAT | Bild 974×1067 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122150523675350792 |
| Facebook | 2026-11-01 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122150225715350792 |
| Facebook | 2026-11-01 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122150225715350792 |
| Facebook | 2026-10-31 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122150077461350792 |
| Facebook | 2026-10-31 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122150077461350792 |
| Facebook | 2026-10-30 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://www.facebook.com/122102579637350792/posts/122149835727350792 |
| Facebook | 2026-10-30 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://www.facebook.com/122102579637350792/posts/122149835727350792 |
| Facebook | 2026-10-29 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 47.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.facebook.com/122102579637350792/posts/122149659741350792 |
| Facebook | 2026-10-29 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 19.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.facebook.com/122102579637350792/posts/122149574103350792 |
| Facebook | 2026-10-26 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «.90 · 10 Stück 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.facebook.com/122102579637350792/posts/122148913683350792 |
| Facebook | 2026-10-26 | 0 | FORMAT | Bild 908×903 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122148913683350792 |
| Facebook | 2026-10-17 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122147008701350792 |
| Facebook | 2026-10-09 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144834175350792 |
| Facebook | 2026-10-09 | 0 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144664459350792 |
| Facebook | 2026-10-08 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144562639350792 |
| Facebook | 2026-10-08 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144398905350792 |
| Facebook | 2026-10-07 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144260167350792 |
| Facebook | 2026-10-07 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144135127350792 |
| Facebook | 2026-10-06 | 0 | FORMAT | Bild 899×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143775343350792 |
| Facebook | 2026-10-03 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142856305350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142787947350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142592419350792 |
| Facebook | 2026-10-01 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142311637350792 |
| Facebook | 2026-09-27 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141356965350792 |
| Facebook | 2026-10-29 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122149607853350792 |
| Instagram | 2026-10-29 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DfE4L6AiEFG/ |
| Pinterest | 2026-10-27 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584199400 |
| Facebook | 2026-10-30 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122149835727350792 |
| Facebook | 2026-10-30 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122149835727350792 |
| Instagram | 2026-10-30 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfHe3yXiJmd/ |
| Instagram | 2026-10-30 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfHe3yXiJmd/ |
| Pinterest | 2026-10-30 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584451897 |
| Facebook | 2026-10-31 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122150077461350792 |
| Facebook | 2026-10-31 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122150077461350792 |
| Instagram | 2026-10-31 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfKl5_fiKxd/ |
| Instagram | 2026-10-31 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfKl5_fiKxd/ |
| Pinterest | 2026-10-31 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584560451 |
| Facebook | 2026-11-01 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122150225715350792 |
| Facebook | 2026-11-01 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122150225715350792 |
| Instagram | 2026-11-01 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfMhdfhCnTb/ |
| Instagram | 2026-11-01 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfMhdfhCnTb/ |
| Pinterest | 2026-11-01 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584618601 |
| Facebook | 2026-10-27 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «g vor Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://facebook.com/122108214291350792/posts/122149125897350792 |
| Instagram | 2026-10-27 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «g vor Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/De_TqrLCINz/ |
| Facebook | 2026-10-27 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «t für Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://facebook.com/122108214291350792/posts/122149221159350792 |
| Instagram | 2026-10-27 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «t für Samstag: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/DfAU7Keigyq/ |
| Facebook | 2026-10-28 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «te. CHF 55.90 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://facebook.com/122108214291350792/posts/122149359471350792 |
| Instagram | 2026-10-28 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «te. CHF 55.90 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/DfB5nhuilNe/ |
| Facebook | 2026-11-02 | n/a | FORMAT | Bild 974×1067 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122150523675350792 |
| Instagram | 2026-11-02 | n/a | FORMAT | Bild 974×1067 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfPzMzQjZWv/ |
| Facebook | 2026-11-05 | n/a | FORMAT | Bild 958×926 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122151208125350792 |
| Facebook | 2026-11-05 | n/a | FORMAT | Bild 932×915 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122151208125350792 |
| Instagram | 2026-11-05 | n/a | FORMAT | Bild 958×926 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfW5ymJCil5/ |
| Instagram | 2026-11-05 | n/a | FORMAT | Bild 932×915 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfW5ymJCil5/ |
| Facebook | 2026-11-08 | n/a | FORMAT | Bild 910×903 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122151902703350792 |
| Instagram | 2026-11-08 | n/a | FORMAT | Bild 910×903 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfefwCPCPMy/ |
| Facebook | 2026-11-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «3451 · CHF 45.90 Ab Schweizer Lager · Lieferdatum beim» | https://facebook.com/122108214291350792/posts/122152413699350792 |
| Facebook | 2026-11-10 | n/a | FORMAT | Bild 896×896 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122152413699350792 |
| Facebook | 2026-11-10 | n/a | FORMAT | Bild 896×489 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122152413699350792 |
| Instagram | 2026-11-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «3451 · CHF 45.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.instagram.com/p/DfkaAekDZzD/ |
| Instagram | 2026-11-10 | n/a | FORMAT | Bild 896×896 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfkaAekDZzD/ |
| Instagram | 2026-11-10 | n/a | FORMAT | Bild 896×489 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfkaAekDZzD/ |
| Facebook | 2026-11-13 | n/a | FORMAT | Bild 810×935 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122152968393350792 |
| Facebook | 2026-11-13 | n/a | FORMAT | Bild 749×928 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122152968393350792 |
| Instagram | 2026-11-13 | n/a | FORMAT | Bild 810×935 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfrgKNZiF-m/ |
| Instagram | 2026-11-13 | n/a | FORMAT | Bild 749×928 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfrgKNZiF-m/ |
| Facebook | 2026-10-28 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 26.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://facebook.com/122108214291350792/posts/122149460067350792 |
| Instagram | 2026-10-28 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 26.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.instagram.com/p/DfC3fbFimqy/ |
| Facebook | 2026-10-29 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 19.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://facebook.com/122108214291350792/posts/122149574079350792 |
| Instagram | 2026-10-29 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 19.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.instagram.com/p/DfEfiMfik--/ |
| Facebook | 2026-10-29 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 47.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://facebook.com/122108214291350792/posts/122149659717350792 |
| Instagram | 2026-10-29 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 47.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | https://www.instagram.com/p/DfFbHVPDebx/ |
| Facebook | 2026-10-30 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122149890741350792 |
| Instagram | 2026-10-30 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DfIICZiiK-5/ |
| Facebook | 2026-10-30 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 20.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | (geplant, Metricool 410489437) |
| Instagram | 2026-10-30 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «CHF 20.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | (geplant, Metricool 410489437) |
| Facebook | 2026-10-31 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «henende! Kostüme ab Schweizer Lager gibt es auch für Ma» | (geplant, Metricool 410489487) |
| Facebook | 2026-10-31 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «· CHF 36.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | (geplant, Metricool 410489487) |
| Instagram | 2026-10-31 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «henende! Kostüme ab Schweizer Lager gibt es auch für Ma» | (geplant, Metricool 410489487) |
| Instagram | 2026-10-31 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «· CHF 36.90 🇨🇭 Ab Schweizer Lager: kommt nach Hallowe» | (geplant, Metricool 410489487) |
| Pinterest | 2026-11-02 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ür unter CHF 20. Ab Schweizer Lager, Gratis Versand ab» | https://www.pinterest.es/pin/1111333645584739148 |
| Pinterest | 2026-11-02 | n/a | FORMAT | Bild 974×1067 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584739148 |
| Pinterest | 2026-11-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584824184 |
| Pinterest | 2026-11-04 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584908875 |
| Pinterest | 2026-11-05 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «onaten geeignet. Ab Schweizer Lager, Gratis Versand ab» | https://www.pinterest.es/pin/1111333645584992381 |
| Pinterest | 2026-11-05 | n/a | FORMAT | Bild 958×926 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645584992381 |
| Pinterest | 2026-11-06 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «en und draussen. Ab Schweizer Lager.» | https://www.pinterest.es/pin/1111333645585075187 |
| Pinterest | 2026-11-07 | n/a | FORMAT | Bild 899×900 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585165201 |
| Facebook | 2026-11-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122150671701350792 |
| Facebook | 2026-11-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122150671701350792 |
| Instagram | 2026-11-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfRwLoNjYvW/ |
| Instagram | 2026-11-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfRwLoNjYvW/ |
| Facebook | 2026-11-04 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122151029157350792 |
| Instagram | 2026-11-04 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DfU9OUFirl-/ |
| Facebook | 2026-11-07 | n/a | FORMAT | Bild 899×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122151676791350792 |
| Facebook | 2026-11-07 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122151676791350792 |
| Instagram | 2026-11-07 | n/a | FORMAT | Bild 899×900 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/Dfb7AZuCAtQ/ |
| Instagram | 2026-11-07 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/Dfb7AZuCAtQ/ |
| Instagram | 2026-11-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Werktage. Nr. 4 ab Schweizer Lager, das Lieferdatum st» | https://www.instagram.com/p/Dfm3hybik4g/ |
| Facebook | 2026-11-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Werktage. Nr. 4 ab Schweizer Lager, das Lieferdatum st» | https://facebook.com/122108214291350792/posts/122152600473350792 |
| Facebook | 2026-11-11 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122152554969350792 |
| Facebook | 2026-11-11 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122152554969350792 |
| Instagram | 2026-11-11 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfmWjVnDWbs/ |
| Instagram | 2026-11-11 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfmWjVnDWbs/ |
| Facebook | 2026-11-12 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122152805589350792 |
| Instagram | 2026-11-12 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/Dfpjy_liBHC/ |
| Instagram | 2026-11-15 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktseite. Artikel ab Schweizer Lager: das Lieferdatum st» | https://www.instagram.com/p/DfxD0rljRxX/ |
| Facebook | 2026-11-15 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktseite. Artikel ab Schweizer Lager: das Lieferdatum st» | https://facebook.com/122108214291350792/posts/122153422575350792 |
| Pinterest | 2026-11-09 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hat. CHF 35.90, ab Schweizer Lager. Gratis Versand ab» | https://www.pinterest.es/pin/1111333645585334490 |
| Pinterest | 2026-11-09 | n/a | FORMAT | Bild 910×903 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585334490 |
| Facebook | 2026-11-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren · CHF 26.90 Ab Schweizer Lager · Lieferdatum beim» | https://facebook.com/reel/1704177608010716 |
| Instagram | 2026-11-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren · CHF 26.90 Ab Schweizer Lager · Lieferdatum beim» | https://www.instagram.com/reel/Dfjwjw9Co7L/ |
| Facebook | 2026-11-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager. Versand CHF 7, ab» | https://facebook.com/reel/1020905711027186 |
| Instagram | 2026-11-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager. Versand CHF 7, ab» | https://www.instagram.com/reel/DfmAeS9Afbe/ |
| YouTube | 2026-11-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktage, der Panda ab Schweizer Lager. Versand CHF 7, ab» | https://www.youtube.com/shorts/XfE1-B8iqb8 |
| Facebook | 2026-11-15 | n/a | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/2) | https://facebook.com/122108214291350792/posts/122153363619350792 |
| Facebook | 2026-11-15 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 2/2) | https://facebook.com/122108214291350792/posts/122153363619350792 |
| Instagram | 2026-11-15 | n/a | FORMAT | Bild 750×750 — Breite unter 1080 (Medium 1/2) | https://www.instagram.com/p/DfwhWf3DeS1/ |
| Instagram | 2026-11-15 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (Medium 2/2) | https://www.instagram.com/p/DfwhWf3DeS1/ |
| Pinterest | 2026-11-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren. CHF 45.90, ab Schweizer Lager. Gratis Versand ab» | https://www.pinterest.es/pin/1111333645585411436 |
| Pinterest | 2026-11-10 | n/a | FORMAT | Bild 896×896 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585411436 |
| Pinterest | 2026-11-12 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585570374 |
| Pinterest | 2026-11-13 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ile). CHF 30.90, ab Schweizer Lager. Gratis Versand ab» | https://www.pinterest.es/pin/1111333645585648112 |
| Pinterest | 2026-11-13 | n/a | FORMAT | Bild 810×935 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585648112 |
| Pinterest | 2026-11-14 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hren. CHF 25.90, ab Schweizer Lager. Gratis Versand ab» | https://www.pinterest.es/pin/1111333645585728818 |
| Pinterest | 2026-11-16 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585894050 |
| Pinterest | 2026-11-17 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645585969787 |
| Pinterest | 2026-11-18 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586046686 |
| Pinterest | 2026-11-19 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586122186 |
| Pinterest | 2026-11-20 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586199993 |
| Pinterest | 2026-11-22 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586374437 |
| Pinterest | 2026-11-23 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586455105 |
| Pinterest | 2026-11-24 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586533213 |
| TikTok | 2026-11-21 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | (geplant, Metricool 436692567) |
| TikTok | 2026-11-21 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | (geplant, Metricool 436692567) |
| TikTok | 2026-11-21 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | (geplant, Metricool 436692567) |
| TikTok | 2026-11-21 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | (geplant, Metricool 436692567) |
| Pinterest | 2026-11-21 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 436692585) |
| Pinterest | 2026-11-25 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586606714 |
| Pinterest | 2026-11-26 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 440688086) |
| Pinterest | 2026-11-27 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 440688163) |
| Pinterest | 2026-11-28 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 440688256) |
| Pinterest | 2026-11-29 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 440688313) |
| Pinterest | 2026-11-30 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 440688386) |
| Instagram | 2026-11-24 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | (geplant, Metricool 440859498) |
| Instagram | 2026-11-24 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DgI_hZMiihx/ |
| Instagram | 2026-11-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DgJlSVjij_s/ |
| Instagram | 2026-11-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DgKPvmNjXWe/ |
| Pinterest | 2026-11-25 | n/a | FORMAT | Bild 790×790 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645586586680 |
| Pinterest | 2026-11-27 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 442295388) |
| Pinterest | 2026-11-26 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 442295464) |
| Pinterest | 2026-11-28 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 442295588) |
| TikTok | 2026-11-26 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/2) | (geplant, Metricool 442295748) |
| TikTok | 2026-11-26 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/2) | (geplant, Metricool 442295748) |
| TikTok | 2026-11-27 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | (geplant, Metricool 442295898) |
| TikTok | 2026-11-27 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | (geplant, Metricool 442295898) |
| TikTok | 2026-11-27 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | (geplant, Metricool 442295898) |
| TikTok | 2026-11-27 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | (geplant, Metricool 442295898) |
| TikTok | 2026-11-28 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | (geplant, Metricool 442296035) |
| TikTok | 2026-11-28 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | (geplant, Metricool 442296035) |
| TikTok | 2026-11-28 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | (geplant, Metricool 442296035) |
| TikTok | 2026-11-28 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | (geplant, Metricool 442296035) |
| TikTok | 2026-11-29 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 1/4) | (geplant, Metricool 442297184) |
| TikTok | 2026-11-29 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 2/4) | (geplant, Metricool 442297184) |
| TikTok | 2026-11-29 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 3/4) | (geplant, Metricool 442297184) |
| TikTok | 2026-11-29 | n/a | FORMAT | Bild 864×1080 — Breite unter 1080 (Medium 4/4) | (geplant, Metricool 442297184) |
| Pinterest | 2026-11-30 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 442297377) |
| Instagram | 2026-11-25 | n/a | FORMAT | Bild 1024×1024 — Breite unter 1080 | https://www.instagram.com/p/DgLkcbbih2p/ |
| Instagram | 2026-11-26 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DgMY9TnCEZ0/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgIg5ebCokG/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563840/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgHmRgOj--s/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563409/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgItj4-EyCB/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563362/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgIWW9DiPuy/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563151/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgH4AiPCMye/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563148/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgH2wQqCM9D/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563145/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgJlSVjij_s/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563143/ |
| Pinterest | 2026-11-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgI_hZMiihx/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586563142/ |
| Pinterest | 2026-11-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgGIxIMEVYf/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586488021/ |
| Pinterest | 2026-11-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgF4_78ADJJ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586487736/ |
| Pinterest | 2026-11-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgFQ3QejYQi/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586487285/ |
| Pinterest | 2026-11-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgDj-JsDr5m/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586407000/ |
| Pinterest | 2026-11-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DgDMUNDCrB5/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586406453/ |
| Pinterest | 2026-11-22 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DgA_KbCHL02/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586321122/ |
| Pinterest | 2026-11-20 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Df4JbXMFFpv/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586153932/ |
| Pinterest | 2026-11-20 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Df2pCebjIRK/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645586153444/ |
| Pinterest | 2026-11-17 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dfz9umbEZMH/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585925164/ |
| Pinterest | 2026-11-17 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfzospyCESH/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585924943/ |
| Pinterest | 2026-11-16 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ktseite. Artikel ab Schweizer Lager: das Lieferdatum st» | https://www.pinterest.com/pin/1111333645585846171/ |
| Pinterest | 2026-11-16 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfxD0rljRxX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585846171/ |
| Pinterest | 2026-11-16 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DfwhWf3DeS1/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645585846170/ |
| Pinterest | 2026-10-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/De95S0FjbwN/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584171519/ |
| Pinterest | 2026-10-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/De9JzUmDZLw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584171516/ |
| Pinterest | 2026-10-27 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «amstag klappt: 🇨🇭 Versand ab Schweizer Lager, meist in 2» | https://www.pinterest.com/pin/1111333645584171518/ |
| Pinterest | 2026-10-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/De9vCzBiq0U/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645584171518/ |

</details>

## Facebook ohne Direktlink

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 123 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-11-04 09:04 UTC · 211 Aufrufe · https://www.facebook.com/reel/2924566081262394/ · «Die Wasserwellen-Lampe taucht den Raum in warmes, bewegtes …» · App: Metricool
- 2026-11-05 17:11 UTC · 95 Aufrufe · https://www.facebook.com/reel/1651496333243305/ · «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-…» · App: Metricool
- 2026-11-07 17:09 UTC · 87 Aufrufe · https://www.facebook.com/reel/908936765536062/ · «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt…» · App: Metricool
- 2026-11-11 19:06 UTC · 53 Aufrufe · https://www.facebook.com/reel/1441367000897943/ · «Eine Rose im Glascover mit warmem LED-Licht. 🌹 In sechs Fa…» · App: Metricool
- 2026-11-12 09:06 UTC · 21 Aufrufe · https://www.facebook.com/reel/1436435851997086/ · «Wellen aus Licht an der Wand. 🌊 Die Projektionsleuchte wir…» · App: Metricool
- 2026-11-14 14:03 UTC · 12 Aufrufe · https://www.facebook.com/reel/2152756682106461/ · «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in S…» · App: Metricool
- 2026-11-07 10:02 UTC · 9 Aufrufe · https://www.facebook.com/122102579637350792/posts/122151676791350792 · «Wichteln steht an und du suchst etwas für einen gemütlichen…» · App: Metricool
- 2026-11-06 09:04 UTC · 9 Aufrufe · https://www.facebook.com/reel/4144146969049814/ · «Funkelnd, leicht und zeitlos: das Tennisarmband mit Zirkon.…» · App: Metricool
- 2026-11-13 11:15 UTC · 8 Aufrufe · https://www.facebook.com/122102579637350792/posts/122152968393350792 · «Ein Plüschtier für Kinder ab 3 Jahren? 🐧 Der Plüsch Kaiser…» · App: Metricool
- 2026-11-18 09:06 UTC · 5 Aufrufe · https://www.facebook.com/reel/1170411215638982/ · «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und…» · App: Metricool
- 2026-11-17 19:04 UTC · 5 Aufrufe · https://www.facebook.com/reel/1810576186820157/ · «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt…» · App: Metricool
- 2026-11-14 10:02 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122153165379350792 · «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfah…» · App: Metricool
- 2026-11-12 17:09 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122152805613350792 · «Fürs Wichteln oder den Adventstisch noch eine Idee gesucht?…» · App: Metricool
- 2026-11-08 10:02 UTC · 4 Aufrufe · https://www.facebook.com/122102579637350792/posts/122151902703350792 · «Wichteln in Sicht und noch kein Geschenk für sie? 🎁 Ein Ho…» · App: Metricool
- 2026-11-06 17:09 UTC · 4 Aufrufe · https://www.facebook.com/122102579637350792/posts/122151516747350792 · «Noch ein Wichtelgeschenk für ein Kind ab 3 gesucht? 🏗️ Der…» · App: Metricool
- 2026-11-11 11:15 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122152554969350792 · «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? �…» · App: Metricool
- 2026-11-10 17:07 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122152413699350792 · «Wichteln in der Familie und ein Kind ab 2 Jahren auf der Li…» · App: Metricool
- 2026-11-09 11:15 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122152122969350792 · «Wichteln steht an und das Geschenk für sie fehlt noch? 🎁 M…» · App: Metricool
- 2026-10-27 16:50 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149221183350792 · «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin �…» · App: Metricool
- 2026-09-30 16:21 UTC · 3 Aufrufe · https://www.facebook.com/reel/1036507699423763/ · «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, …»
- 2026-11-21 19:31 UTC · 2 Aufrufe · https://www.facebook.com/reel/1127606873213670/ · «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-…» · App: Metricool
- 2026-11-15 10:02 UTC · 2 Aufrufe · https://www.facebook.com/122102579637350792/posts/122153363619350792 · «Die Wichtelrunde steht an und dir fehlt noch eine Idee? 🎁 …» · App: Metricool
- 2026-11-11 08:03 UTC · 2 Aufrufe · https://www.facebook.com/reel/1020905711027186/ · «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis C…» · App: Metricool
- 2026-11-03 11:15 UTC · 2 Aufrufe · https://www.facebook.com/122102579637350792/posts/122150671701350792 · «Fürs Wichteln noch ein Geschenk für Sie gesucht? 🎁 Edelsta…» · App: Metricool
- 2026-10-27 07:20 UTC · 2 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149125927350792 · «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von W…» · App: Metricool
- 2026-11-17 16:04 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122153862027350792 · «Schwalbe oder Schmetterling? ☕ Die Retro-Keramiktasse mit T…» · App: Metricool
- 2026-11-16 15:04 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122153622417350792 · «Weinrot, Dunkelgrün oder Kaffeefarbe: Welche Farbe passt an…» · App: Metricool
- 2026-11-15 15:03 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122153422575350792 · «Wann kommt meine Bestellung? Ehrlich erklärt: so liefern wi…» · App: Metricool
- 2026-11-11 16:03 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122152600473350792 · «5 Geschenke bis CHF 30, jedes mit Preis und Lieferzeit. 1. …» · App: Metricool
- 2026-11-04 17:07 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122151029181350792 · «Wichteln im Büro und noch eine Idee für ihn, der pendelt? �…» · App: Metricool
- 2026-10-30 17:31 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149890765350792 · «24 Türchen für Erwachsene 🎄 Charm-Armband-Adventskalender:…» · App: Metricool
- 2026-10-28 16:31 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149460091350792 · «Verhülle dich wie Dracula 🧛 Schwarzer Umhang von Widmann. …» · App: Metricool
- 2026-10-28 07:30 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149359501350792 · «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann …» · App: Metricool
- 2026-10-26 16:41 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149007373350792 · «Für kleine Hexen 🧙‍♀️ Kleid und Hut von Widmann – fertig f…» · App: Metricool
- 2026-11-25 17:10 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122155692591350792 · «Black Week bei LuxeStyle 🖤 15 % auf alles ab CHF 80 – auto…» · App: Metricool
- 2026-11-24 19:31 UTC · 0 Aufrufe · https://www.facebook.com/reel/1167074269356113/ · «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekor…» · App: Metricool
- 2026-11-24 16:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122155461849350792 · «Vier Alpakas für deinen Weihnachtsbaum. 🦙 Im Set sind 4 An…» · App: Metricool
- 2026-11-23 19:31 UTC · 0 Aufrufe · https://www.facebook.com/reel/1119757074237666/ · «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warm…» · App: Metricool
- 2026-11-23 16:04 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122155212573350792 · «Schneemann, Elch oder Weihnachtsmann: wer sitzt bei dir mit…» · App: Metricool
- 2026-11-22 19:31 UTC · 0 Aufrufe · https://www.facebook.com/reel/1159321203228440/ · «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt…» · App: Metricool
- 2026-11-22 16:04 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122154980043350792 · «Was liegt bei dir unter dem Baum, bevor die Geschenke komme…» · App: Metricool
- 2026-11-20 16:04 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122154525537350792 · «Ein Tannenbaum, der leuchtet und zugleich eine Musikbox ist…» · App: Metricool
- 2026-11-19 16:05 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122154278445350792 · «Schminklicht zum Mitnehmen ✨ Der LED-Schminkspiegel ist tra…» · App: Metricool
- 2026-11-18 16:05 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122154064431350792 · «Rot oder Grün: welche Farbe hängst du auf? 🎄 Der Weihnacht…» · App: Metricool
- 2026-11-10 11:05 UTC · 0 Aufrufe · https://www.facebook.com/reel/1704177608010716/ · «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikroba…» · App: Metricool
- 2026-11-05 11:15 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122151208125350792 · «Fürs Wichteln oder als kleines Mitbringsel noch etwas Weich…» · App: Metricool
- 2026-11-02 17:03 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122150523675350792 · «Wichteln mit Kindern ab 3 Jahren und Budget unter CHF 20? �…» · App: Metricool
- 2026-11-01 10:30 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122150225715350792 · «LED-Fahrradrucksack mit Blinker – Funk-Fernbedienung und wa…» · App: Metricool
- 2026-10-31 16:31 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122150077461350792 · «LED Solar-Lichterkette XL – 8 Leuchtmodi, wetterfest für Ga…» · App: Metricool
- 2026-10-30 11:31 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149835727350792 · «Rugged Smartwatch X5 – 5 ATM wasserdicht, GPS und Bluetooth…» · App: Metricool
- 2026-10-29 17:31 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149668453350792 · «Relaxed Fit Hoodie «Cosy» – mit Fell-Panel und Kordelzug. F…» · App: Metricool
- 2026-10-29 16:20 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149659741350792 · «Kapuzenrobe mit Gruselfaktor 💀 Kostüm «Screaming Souls» vo…» · App: Metricool
- 2026-10-29 07:40 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122149574103350792 · «Gänsehaut garantiert 👻 Gruselpuppe, 50 cm, weiss, von Widm…» · App: Metricool
- 2026-10-26 07:10 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122148913683350792 · «Das Gebiss, das aus jedem Outfit einen Vampir macht 🧛 Graf…» · App: Metricool
- 2026-09-27 20:01 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122141356965350792 · «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF…»
- 2026-10-29 18:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149668387350792 · «Relaxed Fit Hoodie «Cosy» – mit Fell-Panel und Kordelzug. F…»
- 2026-10-30 12:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149835727350792 · «Rugged Smartwatch X5 – 5 ATM wasserdicht, GPS und Bluetooth…»
- 2026-10-31 17:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122150077461350792 · «LED Solar-Lichterkette XL – 8 Leuchtmodi, wetterfest für Ga…»
- 2026-11-01 11:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122150225715350792 · «LED-Fahrradrucksack mit Blinker – Funk-Fernbedienung und wa…»
- 2026-10-27 08:20 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149125897350792 · «Untot und blutverschmiert 🧟 Kostüm «Priester Zombie» von W…»
- 2026-10-27 17:50 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149221159350792 · «Schwarz-rot, lang, mit Pony: die Perücke für die Vampirin �…»
- 2026-10-28 08:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149359471350792 · «Der Auftritt für den Grafen 🦇 Kostüm «Vampir» von Widmann …»
- 2026-11-02 18:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122150523675350792 · «Wichteln mit Kindern ab 3 Jahren und Budget unter CHF 20? �…»
- 2026-11-05 12:15 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122151208125350792 · «Fürs Wichteln oder als kleines Mitbringsel noch etwas Weich…»
- 2026-11-06 18:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122151516747350792 · «Noch ein Wichtelgeschenk für ein Kind ab 3 gesucht? 🏗️ Der…»
- 2026-11-08 11:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122151902703350792 · «Wichteln in Sicht und noch kein Geschenk für sie? 🎁 Ein Ho…»
- 2026-11-10 18:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122152413699350792 · «Wichteln in der Familie und ein Kind ab 2 Jahren auf der Li…»
- 2026-11-13 12:15 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122152968393350792 · «Ein Plüschtier für Kinder ab 3 Jahren? 🐧 Der Plüsch Kaiser…»
- 2026-11-14 11:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122153165379350792 · «Wichtelgeschenk für ein Kind ab 4 Jahren gesucht? 🎁 Radfah…»
- 2026-10-28 17:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149460067350792 · «Verhülle dich wie Dracula 🧛 Schwarzer Umhang von Widmann. …»
- 2026-10-29 08:40 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149574079350792 · «Gänsehaut garantiert 👻 Gruselpuppe, 50 cm, weiss, von Widm…»
- 2026-10-29 17:20 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149659717350792 · «Kapuzenrobe mit Gruselfaktor 💀 Kostüm «Screaming Souls» vo…»
- 2026-10-30 18:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122149890741350792 · «24 Türchen für Erwachsene 🎄 Charm-Armband-Adventskalender:…»
- 2026-10-30 08:30 UTC · n/a Aufrufe · (geplant, Metricool 410489437) · «Der Klassiker für kleine Hexen 🧙‍♀️ Hexenhut für Kinder – …»
- 2026-10-31 10:15 UTC · n/a Aufrufe · (geplant, Metricool 410489487) · «Frohes Halloween 🎃 Wir wünschen dir ein gruseliges Wochene…»
- 2026-11-03 12:15 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122150671701350792 · «Fürs Wichteln noch ein Geschenk für Sie gesucht? 🎁 Edelsta…»
- 2026-11-04 18:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122151029157350792 · «Wichteln im Büro und noch eine Idee für ihn, der pendelt? �…»
- 2026-11-07 11:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122151676791350792 · «Wichteln steht an und du suchst etwas für einen gemütlichen…»
- 2026-11-09 12:15 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122152122969350792 · «Wichteln steht an und das Geschenk für sie fehlt noch? 🎁 M…»
- 2026-11-04 10:00 UTC · n/a Aufrufe · https://facebook.com/reel/2924566081262394 · «Die Wasserwellen-Lampe taucht den Raum in warmes, bewegtes …»
- 2026-11-06 10:00 UTC · n/a Aufrufe · https://facebook.com/reel/4144146969049814 · «Funkelnd, leicht und zeitlos: das Tennisarmband mit Zirkon.…»
- 2026-11-11 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122152600473350792 · «5 Geschenke bis CHF 30, jedes mit Preis und Lieferzeit. 1. …»
- 2026-11-09 16:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1158068536959635 · «»
- 2026-11-10 12:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1702365811464870 · «»
- 2026-11-12 12:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1160757549758550 · «»
- 2026-11-13 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2328213768002859 · «»
- 2026-11-14 19:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1135077642457526 · «»
- 2026-11-05 18:00 UTC · n/a Aufrufe · https://facebook.com/reel/1651496333243305 · «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-…»
- 2026-11-07 18:00 UTC · n/a Aufrufe · https://facebook.com/reel/908936765536062 · «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt…»
- 2026-11-11 12:15 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122152554969350792 · «Wichtelgeschenk für sie gesucht, das unter CHF 20 bleibt? �…»
- 2026-11-12 18:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122152805589350792 · «Fürs Wichteln oder den Adventstisch noch eine Idee gesucht?…»
- 2026-11-15 16:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122153422575350792 · «Wann kommt meine Bestellung? Ehrlich erklärt: so liefern wi…»
- 2026-11-11 20:00 UTC · n/a Aufrufe · https://facebook.com/reel/1441367000897943 · «Eine Rose im Glascover mit warmem LED-Licht. 🌹 In sechs Fa…»
- 2026-11-10 12:00 UTC · n/a Aufrufe · https://facebook.com/reel/1704177608010716 · «Ein Bagger, dessen Aufsatz um 360° schwenkt 🏗️ JCB Mikroba…»
- 2026-11-11 09:00 UTC · n/a Aufrufe · https://facebook.com/reel/1020905711027186 · «11.11. und noch keine Geschenkidee? 🎁 Fünf Geschenke bis C…»
- 2026-11-14 15:00 UTC · n/a Aufrufe · https://facebook.com/reel/2152756682106461 · «Wichtelgeschenk für sie gesucht? 🎁 Geflochtenes Leder in S…»
- 2026-11-15 11:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122153363619350792 · «Die Wichtelrunde steht an und dir fehlt noch eine Idee? 🎁 …»
- 2026-11-12 10:00 UTC · n/a Aufrufe · https://facebook.com/reel/1436435851997086 · «Wellen aus Licht an der Wand. 🌊 Die Projektionsleuchte wir…»
- 2026-11-16 16:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122153622417350792 · «Weinrot, Dunkelgrün oder Kaffeefarbe: Welche Farbe passt an…»
- 2026-11-17 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122153862027350792 · «Schwalbe oder Schmetterling? ☕ Die Retro-Keramiktasse mit T…»
- 2026-11-18 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122154064431350792 · «Rot oder Grün: welche Farbe hängst du auf? 🎄 Der Weihnacht…»
- 2026-11-19 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122154278445350792 · «Schminklicht zum Mitnehmen ✨ Der LED-Schminkspiegel ist tra…»
- 2026-11-20 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122154525537350792 · «Ein Tannenbaum, der leuchtet und zugleich eine Musikbox ist…»
- 2026-11-13 09:00 UTC · n/a Aufrufe · (geplant, Metricool 426612259) · «Acht Kristallspitzen in einer Holzbox. 💎 Natur pur, für de…»
- 2026-11-22 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122154980013350792 · «Was liegt bei dir unter dem Baum, bevor die Geschenke komme…»
- 2026-11-23 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122155212573350792 · «Schneemann, Elch oder Weihnachtsmann: wer sitzt bei dir mit…»
- 2026-11-17 20:00 UTC · n/a Aufrufe · https://facebook.com/reel/1810576186820157 · «Zucchini wird zu Spiralen. 🥒 Der 3-in-1 Gemüsehobel hobelt…»
- 2026-11-18 10:00 UTC · n/a Aufrufe · https://facebook.com/reel/1170411215638982 · «Knoblauch und Zwiebeln per Druck hacken: der Knoblauch- und…»
- 2026-11-21 20:30 UTC · n/a Aufrufe · https://facebook.com/reel/1127606873213670 · «Wasser, das zu schweben scheint. 💧 Beim Anti-Gravitations-…»
- 2026-11-22 20:30 UTC · n/a Aufrufe · https://facebook.com/reel/1159321203228440 · «Wassersäulen, die leuchten. 🎶 Der LED-Wasser-Speaker lässt…»
- 2026-11-23 20:30 UTC · n/a Aufrufe · https://facebook.com/reel/1119757074237666 · «Eine Rose, die leuchtet. 🌹 Eine Rose im Glascover mit warm…»
- 2026-11-24 20:30 UTC · n/a Aufrufe · https://facebook.com/reel/1167074269356113 · «Funkelnd, leicht und zeitlos. ✨ Das Tennisarmband mit dekor…»
- 2026-11-21 17:00 UTC · n/a Aufrufe · (geplant, Metricool 436691726) · «Erst puzzeln, dann Schmuck verstauen 🧩 Dieses Schmuckkästc…»
- 2026-11-24 17:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122155461849350792 · «Vier Alpakas für deinen Weihnachtsbaum. 🦙 Im Set sind 4 An…»
- 2026-11-24 21:32 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1711660407183180 · «»
- 2026-11-25 18:00 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/122155692567350792 · «Black Week bei LuxeStyle 🖤 15 % auf alles ab CHF 80 – auto…»
- 2026-11-25 06:38 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1769104184686817 · «»
- 2026-11-25 16:48 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1137322895573577 · «»
- 2026-11-26 17:00 UTC · n/a Aufrufe · (geplant, Metricool 442296165) · «Kaffeebecher in Gelb oder Dunkelblau? ☕ Der Kaffeebecher is…»
- 2026-11-27 17:00 UTC · n/a Aufrufe · (geplant, Metricool 442296266) · «Fünf Wichtel für deine Weihnachtsdeko 🎄 Die Weihnachts-Plü…»
- 2026-11-28 17:00 UTC · n/a Aufrufe · (geplant, Metricool 442296414) · «Warmlicht, Farblicht oder ganz ohne Licht: welche nimmst du…»
- 2026-11-29 17:00 UTC · n/a Aufrufe · (geplant, Metricool 442297277) · «Rot, Blau, Schwarz, Dunkelgrau oder Silber? 💳 Das Kartenet…»
- 2026-11-26 06:48 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1132723009367868 · «»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (165): https://www.instagram.com/p/DgMY9TnCEZ0/ · https://www.instagram.com/p/DgLCN9uCEQ2/ · https://www.instagram.com/p/DgIWW9DiPuy/ · https://www.instagram.com/p/DgH2wQqCM9D/ · https://www.instagram.com/p/DgFQ3QejYQi/ · https://www.instagram.com/p/DgDMUNDCrB5/ · https://www.instagram.com/p/DfzospyCESH/ · https://www.instagram.com/reel/DfuYIc7gPGV/ · https://www.instagram.com/p/Dfpjy_liBHC/ · https://www.instagram.com/p/Dfm3hybik4g/ · https://www.instagram.com/reel/DfmAeS9Afbe/ · https://www.instagram.com/p/DfkaAekDZzD/ · https://www.instagram.com/reel/Dfjwjw9Co7L/ · https://www.instagram.com/p/DfhM84LDRo7/ · https://www.instagram.com/p/DfU9OUFirl-/ · https://www.instagram.com/p/DfMhdfhCnTb/ · https://www.instagram.com/p/DfKl5_fiKxd/ · https://www.instagram.com/p/DfIICZiiK-5/ · https://www.instagram.com/p/DfHe3yXiJmd/ · https://www.instagram.com/p/DfFjLOiiv54/ · https://www.instagram.com/p/DfFbHVPDebx/ · https://www.instagram.com/p/DfEfiMfik--/ · https://www.instagram.com/p/DfC3fbFimqy/ · https://www.instagram.com/p/DfB5nhuilNe/ · https://www.instagram.com/p/DfAU7Keigyq/ …
- Medien nicht messbar (2): https://facebook.com/reel/1119757074237666 (Download gescheitert) · (geplant, Metricool 442296266) (Messung gescheitert: kein Bild-/Videostrom lesbar)
- TikTok/YouTube: Format und Ton werden an der hochgeladenen Datei gemessen (Repo `social/reels/` bzw. Metricool-Medium), nicht an der Plattform-Fassung.

## Was per API ginge — Quellen (abgerufen 23.09.2026)

- **[Q1] Facebook-Seitenbeiträge** — https://developers.facebook.com/docs/pages-api/posts : Update per `POST /{page_post_id}`, Löschen per `DELETE /{page_post_id}`, Recht `pages_manage_posts`; «An app can only update a Page post if the post was made using that app.» Die Video-Referenz (https://developers.facebook.com/docs/graph-api/reference/video/) dokumentiert kein Update/Delete — Reels über ihren Seitenbeitrag.
- **[Q2] Instagram-Media** — https://developers.facebook.com/docs/instagram-platform/reference/instagram-media : Updating = nur `comment_enabled` (Caption NICHT änderbar). Deleting = `DELETE /<IG_MEDIA_ID>` nur «Instagram API with Facebook login», **Facebook User access token**, Rechte `instagram_basic` + `instagram_manage_contents`; «Non-ad posts, Stories, Reels and entire carousel albums are supported.» Unser Zugang ist ein Seiten-Token → Löschen aus dieser Umgebung laut Doku nicht vorgesehen.
- **[Q3] Metricool** — OpenAPI (`/tmp/mc_swagger.json`): `DELETE /v2/scheduler/posts/{id}` und `PATCH /v2/scheduler/posts/{id}` betreffen **geplante** Beiträge; veröffentlichte TikTok-/YouTube-Posts lassen sich darüber nicht zurückholen.

## Prüfen / erneut laufen lassen

```
/opt/node22/bin/node automation/social_qualitaet_wache.mjs            # voller Lauf, schreibt diesen Bericht
LIMIT=10 DRY=1 /opt/node22/bin/node automation/social_qualitaet_wache.mjs   # Stichprobe, schreibt nichts
MEDIEN=0 /opt/node22/bin/node automation/social_qualitaet_wache.mjs   # nur Texte/Preise/Produkte (schnell)
```
