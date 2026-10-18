# Social-Qualität — Stand 2026-10-18 20:14 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 121 Seitenbeiträge + 0 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 332 Einträge (−30/+7 Tage) · Pinterest-Analyse: 214 Pins
- Geprüft: 767 Beiträge, 833 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF ? Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF ? · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)
- ACHTUNG, nicht lesbar: Shopify-Produkte: [{"message":"Shopify antwortet nicht"}]

## Zusammenfassung

**1 Fehler · 230 Warnungen · 326 Hinweise** — Fehler/Warnungen in 200 von 767 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 39 × Caption korrigieren · 45 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 35 × Caption in der App korrigieren (API kann es nicht [Q2]) · 63 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 18 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | TikTok | YouTube | Pinterest | Summe |
|---|---:|---:|---:|---:|---:|---:|
| DIREKTLINK | · | · | · | · | 140 | 140 |
| DOPPEL | 58 | 40 | 1 | · | 7 | 106 |
| ENGLISCH | 2 | · | · | · | · | 2 |
| FLOSKEL | · | 1 | · | · | 1 | 2 |
| FORMAT | 61 | 52 | 1 | · | 20 | 134 |
| TEXT | 29 | 29 | · | · | · | 58 |
| TON | 2 | 2 | · | · | · | 4 |
| VERSAND | 36 | 44 | · | · | 31 | 111 |

Produkt zugeordnet: 0 von 767 Beiträgen (—).

Dazu: 38 Facebook-Beiträge ohne Direktlink (Liste unten) · 444 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 3 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

### FEHLER · Instagram video · 2026-10-19 18:30 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 398726684) · Zwilling: (geplant, Metricool 398726684)
- Text: «Ein kleiner Lichtblick für zuhause. Der Hasen-Wecker von LuxeStyle verbindet eine verspielte Form mit weichem Licht. Im Video siehst du das…»
- **FEHLER TON:** stumm: -70 LUFS  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

<details><summary>199 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · TikTok video · 2026-10-06 09:05 UTC · 261 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7693447501025791264
- Text: «Abendkleid «Sirène» – High-Slit Meerjungfrau mit Schleppe CHF 49.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/produc…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-30 22:25 UTC gepostet: https://www.tiktok.com/@luxestyle.ch/video/7691427221021527329  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · Pinterest pin · 2026-10-01 02:15 UTC · 40 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581825587/
- Text: «2-teiliges Leinen-Set «Provence» – Hemd & Wide-Leg-Hose 📦 Lieferzeit Schweiz: 10–20 Werktage · Direktversand ab Lieferantenlager · Versand…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645581583061/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 02:21 UTC · 38 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581825826/
- Text: «Abendkleid «Sirène» – High-Slit Meerjungfrau mit Schleppe 📦 Lieferzeit Schweiz: 10–20 Werktage · Direktversand ab Lieferantenlager · Versa…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-30 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645581751256/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-08 16:36 UTC · 36 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582483360/
- Text: «Hundeleine aus Rindsleder für mittlere bis grosse Hunde Diese Hundeleine aus Rindsleder ist für das Führen von Hunden mit einem Gewicht von…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 16:20 UTC gepostet: https://www.pinterest.com/pin/1111333645582482193/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-08 16:25 UTC · 36 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582482518/
- Text: «Hundeleine aus Rindsleder für mittlere bis grosse Hunde Diese Hundeleine aus Rindsleder ist für das Führen von Hunden mit einem Gewicht von…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 16:20 UTC gepostet: https://www.pinterest.com/pin/1111333645582482193/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-09 03:18 UTC · 33 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582522574/
- Text: «Elektrischer Nagelclipper für Kinder & Senioren Für den Alltag von Kindern und Senioren, die ihre Nägel selbst schneiden möchten. Masse 75,…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 16:42 UTC gepostet: https://www.pinterest.com/pin/1111333645582483861/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-09 03:11 UTC · 33 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582522235/
- Text: «Elektrischer Nagelclipper für Kinder & Senioren Für den Alltag von Kindern und Senioren, die ihre Nägel selbst schneiden möchten. Masse 75,…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 16:42 UTC gepostet: https://www.pinterest.com/pin/1111333645582483861/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-10-11 16:17 UTC · 20 Aufrufe
- Post: https://www.instagram.com/p/DeXESdoiK14/
- Text: «Stressfreie Krallenpflege für deine Fellnase – leise, schonend und dank LED super präzise! Elektrischer Krallenschleifer für Hund & Katze ·…»
- **WARNUNG FORMAT:** Bild 479×465 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-06 04:14 UTC · 18 Aufrufe
- Post: https://www.instagram.com/p/DeI5qoiCldf/
- Text: «🍂 Herbst-Favorit XXL Hoodie-Decke mit Taschen für Sie & Ihn · CHF 37.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- **WARNUNG FORMAT:** Bild 719×720 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-06 07:38 UTC · 17 Aufrufe
- Post: https://www.instagram.com/p/DeJQ7fniEOK/
- Text: «🍂 Herbst-Favorit Warme Touchscreen-Handschuhe für Ski und Velo · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-05 23:16 UTC gepostet: (geplant, Metricool 388937521)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram karussell · 2026-10-04 21:23 UTC · 17 Aufrufe
- Post: https://www.instagram.com/p/DeFl3ChjZAe/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122143403307350792
- Text: «Smart Hundespielzeug · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrieben · 30 …»
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild (Medium 2/7): remote, safe, durable, mode, colour  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-14 12:46 UTC · 16 Aufrufe
- Post: https://www.instagram.com/p/Deeai7xiIFW/
- Text: «🇨🇭 Ab Schweizer Lager – meist in 2–3 Werktagen bei dir Cap Frankreich · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand …»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «eizer Lager – meist in 2–3 Werktagen bei dir Cap Frankre»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-10-06 12:34 UTC · 16 Aufrufe
- Post: https://www.instagram.com/p/DeJyx5GCAz9/
- Text: «🍂 Herbst-Favorit Warme, wasserdichte High-Top Winterschuhe für Damen · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 12:28 UTC gepostet: (geplant, Metricool 389315472)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-29 16:27 UTC · 16 Aufrufe
- Post: https://www.instagram.com/p/Dd4L-PdjV4S/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141854365350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-09-30 20:27 UTC · 15 Aufrufe
- Post: https://www.instagram.com/p/Dd7MPHWj3ku/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142184773350792
- Text: «HD Mini-Projektor für Zuhause · CHF 98.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrie…»
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild (Medium 3/8): new, your, into  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram reel · 2026-10-01 06:15 UTC · 12 Aufrufe
- Post: https://www.instagram.com/reel/Dd8Phq_GZlZ/ · Zwilling: https://www.facebook.com/reel/1675461947335590/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler manueller Massageroller» — Dieser vielseitige Massageroller wurde entwickelt, um Muskel…»
- **WARNUNG TON:** übersteuert: True Peak +1.1 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-23 02:08 UTC · 6 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140069977350792
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 3 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833286/
- Text: «👀 Gerade besonders gefragt Mule-Sandalette «Nodo» · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, daf…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-01 02:23 UTC gepostet: https://www.pinterest.com/pin/1111333645581825930/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-10-01 02:10 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142247113350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Badeset Dino Duft Apfel · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Badeset Din»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Bild 540×540 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 2 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833289/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Badeset Dino Duft Apfel · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Badeset Din»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-30 04:46 UTC · 2 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581751255/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-13 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582886526/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Flagge Schweiz 90x90 cm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Flagge Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-05 04:47 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582184459/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Einweg-Pappbecher Bayern · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Vers…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Einweg-Papp»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-04 04:47 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582096689/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse Kellner · CHF 38.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-10-03 23:09 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143127673350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse Kellner · CHF 38.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-02 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581916552/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Schweizer Lampion-Set · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Schweizer L»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-09-25 15:10 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/2342181933185415/
- Text: «Kleines Upgrade, grosser Glow 👀 «Pizzaroller und Teiglocher» — Dieses vielseitige Küchenwerkzeug vereinfacht die Zubereitung von Backwaren…»
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-24 20:27 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1076754371781935/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-09-23 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152144/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-10-18 22:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4010882386892273841 · Zwilling: https://facebook.com/122108214291350792/posts/1130377682854663
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-18 22:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1130377682854663 · Zwilling: https://www.instagram.com/stories/luxestyle.ch/4010882386892273841
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-18 22:11 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DepguxkCA2G/
- Text: «Schöne Schleiereule · CHF 32.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Ab Schweizer Lager, Lieferdatum steht beim Artikel und in de…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-18 20:12 UTC gepostet: https://www.instagram.com/p/DepguxkCA2G/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-17 14:47 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DemJH5DiLM6/
- Text: «Deine Essentials. Dein Stil. Entdecke die Canvas-Schultertasche bei LuxeStyle. Produktdetails über den Link im Profil.»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-17 12:48 UTC gepostet: https://www.instagram.com/p/DemJH5DiLM6/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-17 14:47 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122147008677350792
- Text: «Deine Essentials. Dein Stil. Entdecke die Canvas-Schultertasche bei LuxeStyle und sieh dir die Produktdetails an: https://luxestyle.ch/prod…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-17 12:47 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122147008701350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-15 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DegfXRTjeww/ · Zwilling: https://facebook.com/reel/2190678898507248
- Text: «Endlich Ruhe beim Gassi? 👀 «Haustier-Reisematte für das Auto» — Diese vielseitige Haustier-Reisematte ist die ideale Lösung für den Transp…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-15 08:08 UTC gepostet: https://www.instagram.com/reel/DegfXRTjeww/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-15 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2190678898507248 · Zwilling: https://www.instagram.com/reel/DegfXRTjeww/
- Text: «Endlich Ruhe beim Gassi? 👀 «Haustier-Reisematte für das Auto» — Diese vielseitige Haustier-Reisematte ist die ideale Lösung für den Transp…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-15 08:06 UTC gepostet: https://www.facebook.com/reel/2190678898507248/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-10-15 04:47 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645583054455/
- Text: «🇨🇭 Ab Schweizer Lager – meist in 2–3 Werktagen bei dir Cap Frankreich · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand …»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «eizer Lager – meist in 2–3 Werktagen bei dir Cap Frankre»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-10-15 03:18 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Defwy5Nih1P/
- Text: «🍂 Herbst-Favorit U-förmige Wärmflasche für Nacken und Schultern · CHF 22.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-15 01:19 UTC gepostet: https://www.instagram.com/p/Defwy5Nih1P/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-14 22:59 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4008007859853510601
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-14 22:59 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1033832376365374
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-14 21:15 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DefHK6SCiaY/
- Text: «🍂 Herbst-Favorit Heizjacke mit USB-Anschluss · CHF 33.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür eh…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-14 19:16 UTC gepostet: https://www.instagram.com/p/DefHK6SCiaY/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-14 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Deex5cNAlVT/ · Zwilling: https://facebook.com/reel/2568460890318386
- Text: «Katzenschüssel 👀 «Verstellbarer Katzenschüssel 15°» — Das transparente Schüsselmaterial ist PC, die Basis aus ABS. CHF 34.90 · Gratis Vers…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-14 16:11 UTC gepostet: https://www.instagram.com/reel/Deex5cNAlVT/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-14 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2568460890318386 · Zwilling: https://www.instagram.com/reel/Deex5cNAlVT/
- Text: «Katzenschüssel 👀 «Verstellbarer Katzenschüssel 15°» — Das transparente Schüsselmaterial ist PC, die Basis aus ABS. CHF 34.90 · Gratis Vers…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-14 16:10 UTC gepostet: https://www.facebook.com/reel/2568460890318386/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-14 14:45 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Deeai7xiIFW/
- Text: «🇨🇭 Ab Schweizer Lager – meist in 2–3 Werktagen bei dir Cap Frankreich · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «eizer Lager – meist in 2–3 Werktagen bei dir Cap Frankre»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «weizer Lager, meist in 2–3 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-14 12:46 UTC gepostet: https://www.instagram.com/p/Deeai7xiIFW/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-14 14:45 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4007757829707978279
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-14 14:45 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1105629988875784
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram video · 2026-10-14 09:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/Dedzmhbilva/ · Zwilling: https://facebook.com/reel/1435030561403873
- Text: «Eleganter Damenmantel mit Fellkragen ab CHF 23.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/eleganter-damen…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-14 07:05 UTC gepostet: https://www.instagram.com/reel/Dedzmhbilva/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-14 09:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1435030561403873 · Zwilling: https://www.instagram.com/reel/Dedzmhbilva/
- Text: «Eleganter Damenmantel mit Fellkragen ab CHF 23.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/eleganter-damen…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-14 07:05 UTC gepostet: https://www.facebook.com/reel/1435030561403873/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-14 08:38 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DedwjaJjVgG/
- Text: «🍂 Herbst-Favorit Damenstiefel mit Klotzhacke aus Nappaleder · CHF 100.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 We…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-14 06:39 UTC gepostet: https://www.instagram.com/p/DedwjaJjVgG/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-14 06:30 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4007508642131091076
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-14 06:30 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1150424940979046
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-14 02:31 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DedGguMiJIS/
- Text: «Plüsch Schildkröte · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Ab Schweizer Lager, Lieferdatum steht beim Artikel und in der…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-14 00:32 UTC gepostet: https://www.instagram.com/p/DedGguMiJIS/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-13 22:28 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4007265566620733240
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-13 22:28 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1132919076087166
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-13 20:26 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Decc3rbiHnM/
- Text: «🍂 Herbst-Favorit Wollpullover mit Crewneck · CHF 59.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-13 18:28 UTC gepostet: https://www.instagram.com/p/Decc3rbiHnM/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-13 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DecNTqiFIRn/ · Zwilling: https://facebook.com/reel/974071779084749
- Text: «Dein Zuhause, gemütlicher 👀 «3D Acryl Notiztafel mit LED-Beleuchtung» — Diese stylische 3D Acryl Notiztafel ist ein echter Hingucker und p…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-13 16:12 UTC gepostet: https://www.instagram.com/reel/DecNTqiFIRn/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-13 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/974071779084749 · Zwilling: https://www.instagram.com/reel/DecNTqiFIRn/
- Text: «Dein Zuhause, gemütlicher 👀 «3D Acryl Notiztafel mit LED-Beleuchtung» — Diese stylische 3D Acryl Notiztafel ist ein echter Hingucker und p…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-13 16:12 UTC gepostet: https://www.facebook.com/reel/974071779084749/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-13 14:25 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4007022482753924717
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-13 14:25 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1886878665627199
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-13 14:24 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DebzXSjCNR9/
- Text: «🍂 Herbst-Favorit Nordische Fransen-Strickdecke · CHF 36.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-13 12:25 UTC gepostet: https://www.instagram.com/p/DebzXSjCNR9/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-13 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1651721633103658 · Zwilling: https://www.instagram.com/reel/DebVxsHilvx/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler Trimmer für Haar & Bart» — Dieses 2-in-1-Gerät ist ideal für die präzise Haarentfernung…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-13 08:06 UTC gepostet: https://www.facebook.com/reel/1651721633103658/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-13 08:16 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DebJMZ_iNbe/
- Text: «🍂 Herbst-Favorit Frauenkreppsohlen-Schnürstiefel in Grössen bis 43 · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-13 06:16 UTC gepostet: https://www.instagram.com/p/DebJMZ_iNbe/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-13 06:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4006775032466215354
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-13 06:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2016723762361517
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-13 01:45 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Deacex6CMSd/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Flagge Schweiz 90x90 cm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Flagge Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook video · 2026-10-12 21:36 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2237753940156858 · Zwilling: https://www.instagram.com/reel/DeZ__fxCT3V/
- Text: «Warum hat das niemand früher gebaut? 👀 «Kabellose Desinfektionspistole» — Diese kabellose Desinfektionspistole ist ein praktisches Gadget …»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-12 19:37 UTC gepostet: https://www.facebook.com/reel/2237753940156858/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-12 21:31 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4006512119566897222
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-12 21:31 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2167180690528566
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-12 19:33 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeZx5UMio15/
- Text: «🍂 Herbst-Favorit Kaschmir Strickpullover für Damen · CHF 57.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, da…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-12 17:34 UTC gepostet: https://www.instagram.com/p/DeZx5UMio15/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-12 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeZoLVmm3d9/ · Zwilling: https://facebook.com/reel/39269793555969001
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Kleine Möwe LED-Nachtlicht» — Dieses charmante Nachtlicht in Form einer kleinen Möwe sorgt für eine gemüt…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-12 16:10 UTC gepostet: https://www.instagram.com/reel/DeZoLVmm3d9/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-12 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/39269793555969001 · Zwilling: https://www.instagram.com/reel/DeZoLVmm3d9/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Kleine Möwe LED-Nachtlicht» — Dieses charmante Nachtlicht in Form einer kleinen Möwe sorgt für eine gemüt…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-12 16:08 UTC gepostet: https://www.facebook.com/reel/39269793555969001/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-12 13:25 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4006267502102867226
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-12 13:25 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1167699952884518
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-12 13:24 UTC · n/a Aufrufe · GEPLANT (ERROR (Media container not created by unknown cause))
- Post: (geplant, Metricool 393927807)
- Text: «Stylish hydriert durch den Tag – die Edelstahl-Trinkflasche «Hydro» hält deine Getränke perfekt kühl. Edelstahl-Trinkflasche «Hydro» 570 ml…»
- **WARNUNG FORMAT:** Bild 209×666 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-12 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeYw4c8jyf2/ · Zwilling: https://facebook.com/reel/3119094088287089
- Text: «Kennst du das schon? 👀 «Magnetisches 15W Wireless Ladegerät für iPhone» — Dieses kabellose Ladegerät ermöglicht schnelles und sicheres Lad…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-12 08:06 UTC gepostet: https://www.instagram.com/reel/DeYw4c8jyf2/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-12 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/3119094088287089 · Zwilling: https://www.instagram.com/reel/DeYw4c8jyf2/
- Text: «Kennst du das schon? 👀 «Magnetisches 15W Wireless Ladegerät für iPhone» — Dieses kabellose Ladegerät ermöglicht schnelles und sicheres Lad…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-12 08:05 UTC gepostet: https://www.facebook.com/reel/3119094088287089/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-12 07:16 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeYdhuADRLT/
- Text: «🍂 Herbst-Favorit Herren Trenchcoat im Biker-Stil · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafü…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-12 05:16 UTC gepostet: https://www.instagram.com/p/DeYdhuADRLT/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-12 04:14 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4005990656337651023
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-12 04:14 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1112592991221516
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-12 00:28 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeXu4_kCkbL/
- Text: «Business-Look trifft Frische-Kick: Das Ice-Silk-Poloshirt hält dich auch an langen Tagen cool. Herren Business-Poloshirt · CHF 27.90 Kleine…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-11 22:29 UTC gepostet: https://www.instagram.com/p/DeXu4_kCkbL/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-11 20:19 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeXSXXuFFk0/ · Zwilling: https://facebook.com/reel/1386696783627693
- Text: «Wusstest du das schon? 👀 «Vorratsbox für Getreide» — Diese praktische Vorratsbox aus lebensmittelechtem Polypropylen ist umweltfreundlich,…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-11 18:19 UTC gepostet: https://www.instagram.com/reel/DeXSXXuFFk0/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-11 20:19 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1386696783627693 · Zwilling: https://www.instagram.com/reel/DeXSXXuFFk0/
- Text: «Wusstest du das schon? 👀 «Vorratsbox für Getreide» — Diese praktische Vorratsbox aus lebensmittelechtem Polypropylen ist umweltfreundlich,…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-11 18:19 UTC gepostet: https://www.facebook.com/reel/1386696783627693/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-11 20:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4005748206734751578
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-11 20:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1758827255330179
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-11 18:16 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeXESdoiK14/
- Text: «Stressfreie Krallenpflege für deine Fellnase – leise, schonend und dank LED super präzise! Elektrischer Krallenschleifer für Hund & Katze ·…»
- **WARNUNG FORMAT:** Bild 513×498 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-11 16:17 UTC gepostet: https://www.instagram.com/p/DeXESdoiK14/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-11 12:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeWZ59WiJDw/ · Zwilling: https://facebook.com/reel/1681703129979200
- Text: «Wusstest du das schon? 👀 «Multicolor Lidschatten-Palette» — Diese vielseitige Lidschatten-Palette bietet eine umfassende Auswahl an Farbtö…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-11 10:07 UTC gepostet: https://www.instagram.com/reel/DeWZ59WiJDw/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-11 12:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1681703129979200 · Zwilling: https://www.instagram.com/reel/DeWZ59WiJDw/
- Text: «Wusstest du das schon? 👀 «Multicolor Lidschatten-Palette» — Diese vielseitige Lidschatten-Palette bietet eine umfassende Auswahl an Farbtö…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-11 10:05 UTC gepostet: https://www.facebook.com/reel/1681703129979200/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-11 11:25 UTC · n/a Aufrufe · GEPLANT (ERROR (The media could not be fetched from this URI: https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/social/stories/story_sportlicher-taillenformer-mit-reissverschluss-633000.jpg.Please check the limitations section in our development document for more information: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media#creating))
- Post: (geplant, Metricool 393176017)
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-11 11:25 UTC · n/a Aufrufe · GEPLANT (ERROR (Code: 400 - (#100) url should represent a valid URL))
- Post: (geplant, Metricool 393176023)
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-11 11:24 UTC · n/a Aufrufe · GEPLANT (ERROR (Media container not created by unknown cause))
- Post: (geplant, Metricool 393175631)
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Dekostoff Horror · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Dekostoff H»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram video · 2026-10-11 06:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeVwqBeilD9/ · Zwilling: https://facebook.com/reel/1659130978984248
- Text: «Wusstest du das schon? 👀 «360° drehbarer Laptop-Ständer für Tische» CHF 49.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyl…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-11 04:06 UTC gepostet: https://www.instagram.com/reel/DeVwqBeilD9/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-11 06:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1659130978984248 · Zwilling: https://www.instagram.com/reel/DeVwqBeilD9/
- Text: «Wusstest du das schon? 👀 «360° drehbarer Laptop-Ständer für Tische» CHF 49.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyl…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-11 04:05 UTC gepostet: https://www.facebook.com/reel/1659130978984248/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-11 01:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4005174408808790407
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-11 01:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1612008157085472
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-10 23:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeVBdfDlZk-/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Trolli Dracula · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab Sch…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Trolli Drac»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram video · 2026-10-10 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeUePPLEcKR/ · Zwilling: https://facebook.com/reel/1089649820718512
- Text: «Licht an, Stimmung an 👀 «ROCKBROS Velo Frontlicht USB-Ladefunktion» — Das ROCKBROS YQ-QD Velo Frontlicht sorgt für sichere Fahrten bei Nac…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-10 16:06 UTC gepostet: https://www.instagram.com/reel/DeUePPLEcKR/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-10 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1089649820718512 · Zwilling: https://www.instagram.com/reel/DeUePPLEcKR/
- Text: «Licht an, Stimmung an 👀 «ROCKBROS Velo Frontlicht USB-Ladefunktion» — Das ROCKBROS YQ-QD Velo Frontlicht sorgt für sichere Fahrten bei Nac…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-10 16:06 UTC gepostet: https://www.facebook.com/reel/1089649820718512/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-10 16:59 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeUWqhPijlX/
- Text: «🍂 Herbst-Favorit Eleganter Strickpullover mit Farbstreifen · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werk…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-10 15:00 UTC gepostet: https://www.instagram.com/p/DeUWqhPijlX/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-10 16:27 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4004910047481753141
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-10 16:27 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/4645907419067049
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-10 10:44 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeTrzCDiAqr/
- Text: «🍂 Herbst-Favorit Kerzenständer aus Glas im modernen Design · CHF 46.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werk…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-10 08:45 UTC gepostet: https://www.instagram.com/p/DeTrzCDiAqr/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram video · 2026-10-10 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeTnSaJDaDU/ · Zwilling: https://facebook.com/reel/968778666281645
- Text: «Endlich Ruhe beim Gassi? 👀 «Smart Roboter-Hund» — Der Smart Roboter-Hund ist ein interaktives Spielzeug, das Kinder unterhalten und gleich…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-10 08:05 UTC gepostet: https://www.instagram.com/reel/DeTnSaJDaDU/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-10 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/968778666281645 · Zwilling: https://www.instagram.com/reel/DeTnSaJDaDU/
- Text: «Endlich Ruhe beim Gassi? 👀 «Smart Roboter-Hund» — Der Smart Roboter-Hund ist ein interaktives Spielzeug, das Kinder unterhalten und gleich…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-10 08:05 UTC gepostet: https://www.facebook.com/reel/968778666281645/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-10 08:14 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4004661904370364806
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-10 08:14 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1718783476343876
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-10 04:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeS_HKKiGnr/
- Text: «🍂 Herbst-Favorit Hut, Handschuhe & Schal 3-in-1 Set · CHF 42.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, d…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-10 02:14 UTC gepostet: https://www.instagram.com/p/DeS_HKKiGnr/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-09 23:39 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4004402183730963521
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-09 23:39 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2957787077908740
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram video · 2026-10-09 22:59 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeSbdrIDCs2/ · Zwilling: https://facebook.com/reel/2355349111878887
- Text: «Dein Zuhause, gemütlicher 👀 «3D Glas Aroma Diffusor mit Farblicht» — Dieser 3D Glas Aroma Diffusor ist Luftbefeuchter, Aromatherapie-Gerät…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-09 21:03 UTC gepostet: https://www.instagram.com/reel/DeSbdrIDCs2/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-09 22:59 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2355349111878887 · Zwilling: https://www.instagram.com/reel/DeSbdrIDCs2/
- Text: «Dein Zuhause, gemütlicher 👀 «3D Glas Aroma Diffusor mit Farblicht» — Dieser 3D Glas Aroma Diffusor ist Luftbefeuchter, Aromatherapie-Gerät…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-09 21:02 UTC gepostet: https://www.facebook.com/reel/2355349111878887/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-09 22:24 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeSXF_ZlZ2W/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Totenkopf 30x20cm · CHF 75.– Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Totenkopf 3»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 21:38 UTC gepostet: (geplant, Metricool 392337765)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-09 21:38 UTC · n/a Aufrufe · GEPLANT (ERROR (The media could not be fetched from this URI: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/907104_2.jpg?v=1784974092.Please check the limitations section in our development document for more information: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media#creating))
- Post: (geplant, Metricool 392337765)
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Totenkopf 30x20cm · CHF 75.– Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Totenkopf 3»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram video · 2026-10-09 17:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeRyvAYjoHV/ · Zwilling: https://facebook.com/reel/1111127505180828
- Text: «Neu bei LuxeStyle 👀 «Doppelstrahl-Luftbefeuchter» — Dieser Luftbefeuchter mit grosser Kapazität spendet eine angenehme Atmosphäre in deine…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-09 15:07 UTC gepostet: https://www.instagram.com/reel/DeRyvAYjoHV/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-09 17:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1111127505180828 · Zwilling: https://www.instagram.com/reel/DeRyvAYjoHV/
- Text: «Neu bei LuxeStyle 👀 «Doppelstrahl-Luftbefeuchter» — Dieser Luftbefeuchter mit grosser Kapazität spendet eine angenehme Atmosphäre in deine…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-09 15:07 UTC gepostet: https://www.facebook.com/reel/1111127505180828/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-09 15:25 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4004153579656503771
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-09 15:25 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1790858235434864
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-09 15:24 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeRnDOrCJjU/ · Zwilling: https://facebook.com/122108214291350792/posts/122144834151350792
- Text: «🍂 Herbst-Favorit Herren Octopus High-top Retro Martin Boots · CHF 32.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 13:25 UTC gepostet: https://www.instagram.com/p/DeRnDOrCJjU/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-09 15:24 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144834151350792 · Zwilling: https://www.instagram.com/p/DeRnDOrCJjU/
- Text: «🍂 Herbst-Favorit Herren Octopus High-top Retro Martin Boots · CHF 32.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 13:25 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144834175350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-09 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeRCgwZiMNx/ · Zwilling: https://facebook.com/reel/28973798595570264
- Text: «Das Gadget, das alle wollen 👀 «Kabelloser Glättkamm mit Schnellaufheizung» — Der kabellose Glättkamm ist dein idealer Begleiter für unterw…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 08:06 UTC gepostet: https://www.instagram.com/reel/DeRCgwZiMNx/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-09 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/28973798595570264 · Zwilling: https://www.instagram.com/reel/DeRCgwZiMNx/
- Text: «Das Gadget, das alle wollen 👀 «Kabelloser Glättkamm mit Schnellaufheizung» — Der kabellose Glättkamm ist dein idealer Begleiter für unterw…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 08:05 UTC gepostet: https://www.facebook.com/reel/28973798595570264/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-09 09:22 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeQ9rh0il-z/ · Zwilling: https://facebook.com/122108214291350792/posts/122144722197350792
- Text: «🍂 Herbst-Favorit Color-Block Kapuzen-Sweatshirt mit halbem Reissverschluss · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lief…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 07:24 UTC gepostet: https://www.instagram.com/p/DeQ9rh0il-z/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-09 09:22 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144722197350792 · Zwilling: https://www.instagram.com/p/DeQ9rh0il-z/
- Text: «🍂 Herbst-Favorit Color-Block Kapuzen-Sweatshirt mit halbem Reissverschluss · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lief…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 07:23 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144722221350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-09 07:10 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4003904400325650310
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-09 07:10 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1769629007651538
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-09 03:14 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeQTc5Vipym/ · Zwilling: https://facebook.com/122108214291350792/posts/122144664435350792
- Text: «🍂 Herbst-Favorit Lange Damenstiefel mit Schnallen und Nieten · CHF 34.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 We…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 01:15 UTC gepostet: https://www.instagram.com/p/DeQTc5Vipym/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-09 03:14 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144664435350792 · Zwilling: https://www.instagram.com/p/DeQTc5Vipym/
- Text: «🍂 Herbst-Favorit Lange Damenstiefel mit Schnallen und Nieten · CHF 34.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 We…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-09 01:14 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144664459350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-08 22:55 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4003655778888419171
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 22:55 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1007026972403352
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram video · 2026-10-08 22:19 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DePxs6iiEY9/ · Zwilling: https://facebook.com/reel/1134807282612575
- Text: «Warum hat das niemand früher gebaut? 👀 «Kabelloser Haarglätter» — Die Temperatur kann zwischen 140°C und 200°C eingestellt werden. CHF 33.…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-08 20:19 UTC gepostet: https://www.instagram.com/reel/DePxs6iiEY9/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-08 22:19 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1134807282612575 · Zwilling: https://www.instagram.com/reel/DePxs6iiEY9/
- Text: «Warum hat das niemand früher gebaut? 👀 «Kabelloser Haarglätter» — Die Temperatur kann zwischen 140°C und 200°C eingestellt werden. CHF 33.…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-08 20:19 UTC gepostet: https://www.facebook.com/reel/1134807282612575/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-08 20:37 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DePmCTTFQxD/ · Zwilling: https://facebook.com/122108214291350792/posts/122144562615350792
- Text: «Blendfreies Schreibtischlicht, USB Monitor-Lichtleiste mit Bewegungssensor · CHF 44.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefe…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 18:38 UTC gepostet: https://www.instagram.com/p/DePmCTTFQxD/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 20:37 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144562615350792 · Zwilling: https://www.instagram.com/p/DePmCTTFQxD/
- Text: «Blendfreies Schreibtischlicht, USB Monitor-Lichtleiste mit Bewegungssensor · CHF 44.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefe…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 18:37 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144562639350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-08 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DePVOL1iMvu/
- Text: «Wusstest du das schon? 👀 «Mini-Heizplatte» CHF 16.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/mini-heizpl…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-08 16:12 UTC gepostet: https://www.instagram.com/reel/DePVOL1iMvu/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-08 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/2169948270224273
- Text: «Wusstest du das schon? 👀 «Mini-Heizplatte» CHF 16.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/mini-heizpl…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-08 16:10 UTC gepostet: https://www.facebook.com/reel/2169948270224273/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-08 14:42 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4003407662737452843
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 14:42 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2605319749911152
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-08 14:27 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeO7ruaisw7/ · Zwilling: https://facebook.com/122108214291350792/posts/122144497551350792
- Text: «🍂 Herbst-Favorit Kabellose Kaffeemühle mit USB-Ladefunktion · CHF 62.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 12:28 UTC gepostet: https://www.instagram.com/p/DeO7ruaisw7/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 14:27 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144497551350792 · Zwilling: https://www.instagram.com/p/DeO7ruaisw7/
- Text: «🍂 Herbst-Favorit Kabellose Kaffeemühle mit USB-Ladefunktion · CHF 62.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 12:27 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144497575350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-08 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeOd84ij9XP/ · Zwilling: https://facebook.com/reel/1411403190511856
- Text: «Wusstest du das schon? 👀 «Feuchtigkeitsspendender Lippen-Gloss» — Ein transparenter Lippen-Gloss, der Feuchtigkeit spendet und die Lippen …»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-08 08:08 UTC gepostet: https://www.instagram.com/reel/DeOd84ij9XP/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-08 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1411403190511856 · Zwilling: https://www.instagram.com/reel/DeOd84ij9XP/
- Text: «Wusstest du das schon? 👀 «Feuchtigkeitsspendender Lippen-Gloss» — Ein transparenter Lippen-Gloss, der Feuchtigkeit spendet und die Lippen …»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-08 08:06 UTC gepostet: https://www.facebook.com/reel/1411403190511856/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-08 08:20 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeORyZ1CMY-/ · Zwilling: https://facebook.com/122108214291350792/posts/122144398881350792
- Text: «🍂 Herbst-Favorit Overknee-Stiefel mit Stretch und klobigem Absatz · CHF 34.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 06:21 UTC gepostet: https://www.instagram.com/p/DeORyZ1CMY-/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 08:20 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144398881350792 · Zwilling: https://www.instagram.com/p/DeORyZ1CMY-/
- Text: «🍂 Herbst-Favorit Overknee-Stiefel mit Stretch und klobigem Absatz · CHF 34.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 06:21 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144398905350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-08 06:33 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4003161213806192433
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 06:33 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/978619887897924
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-08 02:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeNnywliqEU/ · Zwilling: https://facebook.com/122108214291350792/posts/122144344833350792
- Text: «🍂 Herbst-Favorit Jacquard Cashew Fransen-Schal für Damen · CHF 21.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkta…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 00:15 UTC gepostet: https://www.instagram.com/p/DeNnywliqEU/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-08 02:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144344833350792 · Zwilling: https://www.instagram.com/p/DeNnywliqEU/
- Text: «🍂 Herbst-Favorit Jacquard Cashew Fransen-Schal für Damen · CHF 21.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkta…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-08 00:14 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144344857350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-07 22:29 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4002917408813963223
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 22:29 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1448256603935309
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram video · 2026-10-07 21:18 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeNGCtKCTJH/ · Zwilling: https://facebook.com/reel/959057663390581
- Text: «Wusstest du das schon? 👀 «Matte Lippenmischung mit langer Haltbarkeit» — Diese Lippenmischung bietet ein mattes Finish und lässt sich leic…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 19:19 UTC gepostet: https://www.instagram.com/reel/DeNGCtKCTJH/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-07 21:18 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/959057663390581 · Zwilling: https://www.instagram.com/reel/DeNGCtKCTJH/
- Text: «Wusstest du das schon? 👀 «Matte Lippenmischung mit langer Haltbarkeit» — Diese Lippenmischung bietet ein mattes Finish und lässt sich leic…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 19:19 UTC gepostet: https://www.facebook.com/reel/959057663390581/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-07 19:42 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeM6_g-CGPE/ · Zwilling: https://facebook.com/122108214291350792/posts/122144259999350792
- Text: «Kleine Schrift? XXL Leselupe mit LED-Licht · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrli…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 17:43 UTC gepostet: https://www.instagram.com/p/DeM6_g-CGPE/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 19:42 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144259999350792 · Zwilling: https://www.instagram.com/p/DeM6_g-CGPE/
- Text: «Kleine Schrift? XXL Leselupe mit LED-Licht · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrli…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 17:42 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144260167350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-07 14:26 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4002674827776755702
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 14:26 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1854340455741753
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-07 13:25 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeMPyrgDSTK/ · Zwilling: https://facebook.com/122108214291350792/posts/122144135103350792
- Text: «🍂 Herbst-Favorit Locker geschnittenes Pullover-Kleid mit Schlitz · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–2…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 11:25 UTC gepostet: https://www.instagram.com/p/DeMPyrgDSTK/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 13:25 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144135103350792 · Zwilling: https://www.instagram.com/p/DeMPyrgDSTK/
- Text: «🍂 Herbst-Favorit Locker geschnittenes Pullover-Kleid mit Schlitz · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–2…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 11:25 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144135127350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook video · 2026-10-07 10:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/973700865257985 · Zwilling: https://www.instagram.com/reel/DeL4_VgFRha/
- Text: «Wusstest du das schon? 👀 «Elektrischer Handwärmer & Powerbank» — Dieser kompakte elektrische Handwärmer ist der ideale Begleiter für kalte…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-07 08:05 UTC gepostet: https://www.facebook.com/reel/973700865257985/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-07 10:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeL4_VgFRha/ · Zwilling: https://facebook.com/reel/973700865257985
- Text: «Wusstest du das schon? 👀 «Elektrischer Handwärmer & Powerbank» — Dieser kompakte elektrische Handwärmer ist der ideale Begleiter für kalte…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-07 08:07 UTC gepostet: https://www.instagram.com/reel/DeL4_VgFRha/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-07 07:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeLlNlDCnZV/ · Zwilling: https://facebook.com/122108214291350792/posts/122144061021350792
- Text: «4 Modi, Magnetschwebe-Motor, antibakterielle Box Reise-Schallzahnbürste · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferun…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 05:13 UTC gepostet: https://www.instagram.com/p/DeLlNlDCnZV/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 07:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144061021350792 · Zwilling: https://www.instagram.com/p/DeLlNlDCnZV/
- Text: «4 Modi, Magnetschwebe-Motor, antibakterielle Box Reise-Schallzahnbürste · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferun…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-07 05:13 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144061045350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-07 06:18 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4002428891834136794
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 06:18 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1451581983522147
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-07 01:12 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeK79H1CtxZ/ · Zwilling: https://facebook.com/122108214291350792/posts/122144002281350792
- Text: «🍂 Herbst-Favorit Gefütterter Kapuzenpullover mit Reissverschluss · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–2…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 23:13 UTC gepostet: https://www.instagram.com/p/DeK79H1CtxZ/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-07 01:12 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122144002281350792 · Zwilling: https://www.instagram.com/p/DeK79H1CtxZ/
- Text: «🍂 Herbst-Favorit Gefütterter Kapuzenpullover mit Reissverschluss · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–2…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 23:12 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122144002311350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook video · 2026-10-06 21:19 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/4575730245997130 · Zwilling: https://www.instagram.com/reel/DeKhZJQFSVO/
- Text: «Für die Katze, die alles darf 👀 «Magisches Katzenkratzbrett mit Orgel-Design» — Dieses innovative Kratzbrett bietet deiner Katze eine attr…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 19:19 UTC gepostet: https://www.facebook.com/reel/4575730245997130/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-06 21:19 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeKhZJQFSVO/ · Zwilling: https://facebook.com/reel/4575730245997130
- Text: «Für die Katze, die alles darf 👀 «Magisches Katzenkratzbrett mit Orgel-Design» — Dieses innovative Kratzbrett bietet deiner Katze eine attr…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 19:21 UTC gepostet: https://www.instagram.com/reel/DeKhZJQFSVO/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-06 21:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4002154922086432702
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 21:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1619664179635776
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-06 19:11 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4002093558739393234
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 19:11 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2078989949300333
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-06 18:34 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeKOacViqwo/ · Zwilling: https://facebook.com/122108214291350792/posts/122143921815350792
- Text: «🍂 Herbst-Favorit Französische Bulldogge Tasse · CHF 51.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür e…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 16:35 UTC gepostet: https://www.instagram.com/p/DeKOacViqwo/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 18:34 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122143921815350792 · Zwilling: https://www.instagram.com/p/DeKOacViqwo/
- Text: «🍂 Herbst-Favorit Französische Bulldogge Tasse · CHF 51.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür e…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 16:34 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122143921845350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook video · 2026-10-06 18:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1028099653587270 · Zwilling: https://www.instagram.com/reel/DeKLew8jcYs/
- Text: «Dein Hund wird es lieben 👀 «Schräge Keramik Futterschale für Haustiere» — Diese stilvolle Futterschale aus Keramik ist ideal für Katzen un…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 16:09 UTC gepostet: https://www.facebook.com/reel/1028099653587270/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram video · 2026-10-06 18:05 UTC · n/a Aufrufe
- Post: https://www.instagram.com/reel/DeKLew8jcYs/ · Zwilling: https://facebook.com/reel/1028099653587270
- Text: «Dein Hund wird es lieben 👀 «Schräge Keramik Futterschale für Haustiere» — Diese stilvolle Futterschale aus Keramik ist ideal für Katzen un…»
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 16:09 UTC gepostet: https://www.instagram.com/reel/DeKLew8jcYs/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-06 14:33 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeJyx5GCAz9/ · Zwilling: https://facebook.com/122108214291350792/posts/122143842039350792
- Text: «🍂 Herbst-Favorit Warme, wasserdichte High-Top Winterschuhe für Damen · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 12:28 UTC gepostet: (geplant, Metricool 389315472)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 12:28 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122143842039350792 · Zwilling: https://www.instagram.com/p/DeJyx5GCAz9/
- Text: «🍂 Herbst-Favorit Warme, wasserdichte High-Top Winterschuhe für Damen · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 10:28 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122143842081350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-06 11:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4001852907653196888
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 11:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1536489971575878
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-06 09:37 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeJQ7fniEOK/
- Text: «🍂 Herbst-Favorit Warme Touchscreen-Handschuhe für Ski und Velo · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-05 23:16 UTC gepostet: (geplant, Metricool 388937521)  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook video · 2026-10-06 08:05 UTC · n/a Aufrufe
- Post: https://facebook.com/reel/1070376882464307 · Zwilling: https://www.instagram.com/reel/DeJGbYgDqx8/
- Text: «2-teiliges Leinen-Set «Provence» – Hemd & Wide-Leg-Hose CHF 39.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 02:02 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122141410725350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-06 06:13 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/DeI5qoiCldf/ · Zwilling: https://facebook.com/122108214291350792/posts/122143775319350792
- Text: «🍂 Herbst-Favorit XXL Hoodie-Decke mit Taschen für Sie & Ihn · CHF 37.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 04:14 UTC gepostet: https://www.instagram.com/p/DeI5qoiCldf/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 06:13 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122143775319350792 · Zwilling: https://www.instagram.com/p/DeI5qoiCldf/
- Text: «🍂 Herbst-Favorit XXL Hoodie-Decke mit Taschen für Sie & Ihn · CHF 37.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Wer…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-06 04:14 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122143775343350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-06 02:31 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4001589669736798988
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-06 02:31 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/1952343909504273
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-05 23:16 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/122143702857350792
- Text: «🍂 Herbst-Favorit Warme Touchscreen-Handschuhe für Ski und Velo · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dieselbe Caption schon am 2026-10-05 21:16 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122143702881350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-10-05 15:10 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143628313350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Haarige Tarantel · CHF 22.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Haarige Tar»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-05 08:29 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143527681350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Liegender Plüschwolf · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Liegender P»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-05 02:28 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143463283350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Einweg-Pappbecher Bayern · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Vers…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Einweg-Papp»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-04 22:35 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4000746607703894231
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-04 22:35 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2101815593779290
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-04 20:13 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143388685350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Bingo Nummernbälle 1-90 · CHF 78.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Bingo Numme»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-04 05:12 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143185021350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Roter Papagei · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab Schw…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Roter Papag»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-02 15:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142708879350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz weiss · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-01 20:24 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142448359350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Schweizer Lampion-Set · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Schweizer L»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-01 14:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142400221350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Fahnenkette Schweizer Kantone · CHF 25.90 Kleiner Schweizer Shop aus Belp, kein Konzern.…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Fahnenkette»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Bild 709×507 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-09-29 16:27 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141854365350792 · Zwilling: https://www.instagram.com/p/Dd4L-PdjV4S/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-28 14:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141546235350792
- Text: «🛒 Schon von Kund:innen bestellt Multifunktionaler runder Gemüseschneider · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefer…»
- **WARNUNG FORMAT:** Bild 500×500 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest bild · 2026-09-26 01:19 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581377817
- Text: «Dieses 3D Puzzle in Form eines Halloween Schlosses ist ein Spass für Teenager von 7 bis 14 Jahren. Das Set besteht aus Papier und wird in e…»
- **WARNUNG FORMAT:** Bild 630×630 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest bild · 2026-09-24 10:34 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581245245
- Text: «Das runde Samt-Kürbis Kissen ist eine stilvolle und komfortable Ergänzung für jedes Zuhause. Mit seinem einzigartigen Design, das an ein ha…»
- **WARNUNG FORMAT:** Bild 703×703 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

</details>

## Hinweise (gesammelt)

326 Hinweise in 281 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 48 Beiträge mit generischen Reichweiten-Hashtags (#foryou #trending #fyp #viral) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| TikTok | 2026-10-17 | 236 | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.tiktok.com/@luxestyle.ch/video/7697628740955720993 |
| Pinterest | 2026-09-29 | 53 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd0ucPOjRpC/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667020/ |
| Facebook | 2026-10-05 | 42 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143702881350792 |
| Pinterest | 2026-09-29 | 28 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd2CntDjDZs/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667027/ |
| Instagram | 2026-10-17 | 26 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DemJH5DiLM6/ |
| Instagram | 2026-10-09 | 26 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeQTc5Vipym/ |
| Instagram | 2026-10-13 | 24 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DebzXSjCNR9/ |
| Instagram | 2026-10-14 | 23 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DefHK6SCiaY/ |
| Instagram | 2026-10-10 | 21 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeS_HKKiGnr/ |
| Instagram | 2026-09-30 | 21 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd5qYj2AKyw/ |
| Instagram | 2026-10-14 | 20 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «p, kein Konzern. Ab Schweizer Lager, Lieferdatum steht» | https://www.instagram.com/p/DedGguMiJIS/ |
| Instagram | 2026-10-09 | 20 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeRnDOrCJjU/ |
| Instagram | 2026-10-13 | 19 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DebJMZ_iNbe/ |
| Instagram | 2026-10-07 | 19 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeM6_g-CGPE/ |
| Instagram | 2026-10-07 | 19 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeMPyrgDSTK/ |
| Instagram | 2026-10-15 | 18 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Defwy5Nih1P/ |
| Instagram | 2026-10-09 | 18 | DOPPEL | gleiche Warengruppe «diffuser» 6 h nach https://www.instagram.com/reel/DeRyvAYjoHV/ (Raster wirkt doppelt) | https://www.instagram.com/reel/DeSbdrIDCs2/ |
| Instagram | 2026-10-06 | 17 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeJQ7fniEOK/ |
| Instagram | 2026-10-03 | 17 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeBKvd7jhgS/ |
| Instagram | 2026-10-01 | 17 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd8c9kQkWlV/ |
| Instagram | 2026-10-14 | 16 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – meist in 2–3 Werk» | https://www.instagram.com/p/Deeai7xiIFW/ |
| Instagram | 2026-10-14 | 16 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/Deeai7xiIFW/ |
| Instagram | 2026-10-14 | 16 | FORMAT | Bild 1079×984 — Breite unter 1080 | https://www.instagram.com/p/Deeai7xiIFW/ |
| Instagram | 2026-10-06 | 16 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeJyx5GCAz9/ |
| Instagram | 2026-09-29 | 16 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.instagram.com/p/Dd4L-PdjV4S/ |
| Instagram | 2026-09-29 | 16 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.instagram.com/p/Dd4L-PdjV4S/ |
| Instagram | 2026-10-03 | 15 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DeB0D9QldRF/ |
| Instagram | 2026-09-30 | 15 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd6UQDolC60/ |
| Pinterest | 2026-09-25 | 15 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddsmdr2CdwM/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314558/ |
| Instagram | 2026-09-29 | 14 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd2wskBlPZN/ |
| Pinterest | 2026-10-03 | 14 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeAcgz8DcUF/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005057/ |
| Pinterest | 2026-10-02 | 14 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd8c9kQkWlV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916551/ |
| Instagram | 2026-10-14 | 13 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DedwjaJjVgG/ |
| Instagram | 2026-10-10 | 13 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeTrzCDiAqr/ |
| Instagram | 2026-10-08 | 13 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeORyZ1CMY-/ |
| Instagram | 2026-10-06 | 13 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeKOacViqwo/ |
| Instagram | 2026-10-08 | 10 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DePmCTTFQxD/ |
| Instagram | 2026-10-03 | 10 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeCfMMDjHDg/ |
| Instagram | 2026-10-02 | 9 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeAcgz8DcUF/ |
| Pinterest | 2026-10-01 | 9 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7DUIujzrT/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833288/ |
| Instagram | 2026-10-13 | 8 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Decc3rbiHnM/ |
| Instagram | 2026-10-02 | 8 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd_IenVDLiC/ |
| Pinterest | 2026-10-03 | 8 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeBKvd7jhgS/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005058/ |
| Facebook | 2026-09-23 | 6 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140069977350792 |
| Facebook | 2026-09-23 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140221003350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 3/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 4/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 5/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 6/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 888×888 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 7/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Pinterest | 2026-10-03 | 5 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd-695XlAkF/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582006191/ |
| Pinterest | 2026-09-30 | 5 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd3g5S9FA18/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751252/ |
| Pinterest | 2026-09-23 | 5 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdmhRxtjUIZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581153922/ |
| Pinterest | 2026-09-26 | 4 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddumv_9lNi3/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581395389/ |
| Facebook | 2026-10-06 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143921845350792 |
| Facebook | 2026-10-01 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142247113350792 |
| Facebook | 2026-10-01 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142247113350792 |
| Pinterest | 2026-10-12 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeYB53qCntC/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582803226/ |
| Pinterest | 2026-10-04 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeB0D9QldRF/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096687/ |
| Pinterest | 2026-10-03 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd_ywlfoMaE/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005286/ |
| Pinterest | 2026-10-01 | 3 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd5qYj2AKyw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833286/ |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142095595350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141997921350792 |
| Facebook | 2026-09-29 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141690895350792 |
| Pinterest | 2026-10-11 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeVdFD2iN9N/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582710626/ |
| Pinterest | 2026-10-08 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeNnywliqEU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439041/ |
| Pinterest | 2026-10-07 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeJyx5GCAz9/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348293/ |
| Pinterest | 2026-10-01 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-10-01 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-10-01 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7zdhfFDPa/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-09-30 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645581751255/ |
| Pinterest | 2026-09-30 | 2 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645581751255/ |
| Pinterest | 2026-09-30 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd4L-PdjV4S/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751255/ |
| Pinterest | 2026-09-27 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdvW8OwFLBZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581487082/ |
| Pinterest | 2026-09-23 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdnatlxD0nV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152467/ |
| Facebook | 2026-10-06 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143842081350792 |
| Facebook | 2026-10-03 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122143127673350792 |
| Facebook | 2026-10-03 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122143127673350792 |
| Facebook | 2026-10-03 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143004745350792 |
| Facebook | 2026-10-03 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142918267350792 |
| Facebook | 2026-09-28 | 1 | FORMAT | Bild 896×1200 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141469087350792 |
| Facebook | 2026-09-26 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140943505350792 |
| Facebook | 2026-09-25 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140661457350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 883×773 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140607019350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140352715350792 |
| Pinterest | 2026-10-14 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DedSQZwiCEQ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582973182/ |
| Pinterest | 2026-10-13 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645582886526/ |
| Pinterest | 2026-10-13 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645582886526/ |
| Pinterest | 2026-10-13 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Deacex6CMSd/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582886526/ |
| Pinterest | 2026-10-12 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeXu4_kCkbL/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582803222/ |
| Pinterest | 2026-10-12 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeXESdoiK14/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582803221/ |
| Pinterest | 2026-10-11 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeUePPLEcKR/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582711512/ |
| Pinterest | 2026-10-11 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeTnSaJDaDU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582711404/ |
| Pinterest | 2026-10-11 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeVwqBeilD9/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582711133/ |
| Pinterest | 2026-10-11 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeTrzCDiAqr/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582710624/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeRyvAYjoHV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613582/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeRCgwZiMNx/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613534/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeSbdrIDCs2/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613528/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeSx7bvCjJY/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613176/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeS_HKKiGnr/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613173/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeRnDOrCJjU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613169/ |
| Pinterest | 2026-10-10 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeQ9rh0il-z/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582613164/ |
| Pinterest | 2026-10-08 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeLlNlDCnZV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439035/ |
| Pinterest | 2026-10-07 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeKOacViqwo/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348295/ |
| Pinterest | 2026-10-07 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeJQ7fniEOK/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348292/ |
| Pinterest | 2026-10-06 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeIQhGYCHEx/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582268400/ |
| Pinterest | 2026-10-05 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeFl3ChjZAe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582184461/ |
| Pinterest | 2026-10-05 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeEmhYDlNeA/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582184458/ |
| Pinterest | 2026-10-05 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645582184459/ |
| Pinterest | 2026-10-05 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645582184459/ |
| Pinterest | 2026-10-05 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeGIurYCRP7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582184459/ |
| Pinterest | 2026-10-04 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeBrflzjQ2Z/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582098666/ |
| Pinterest | 2026-10-04 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeCj3d4ggAV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582097301/ |
| Pinterest | 2026-10-04 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeDo7wrlPRO/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582097098/ |
| Pinterest | 2026-10-04 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645582096689/ |
| Pinterest | 2026-10-04 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645582096689/ |
| Pinterest | 2026-10-04 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeDNJ0iFD7G/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096689/ |
| Pinterest | 2026-10-03 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeAx76wEZSU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005789/ |
| Pinterest | 2026-10-03 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeAY2AIH1i3/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005059/ |
| Pinterest | 2026-10-03 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd_IenVDLiC/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005056/ |
| Pinterest | 2026-10-02 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd9HHI8Er06/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916838/ |
| Pinterest | 2026-10-02 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-02 | 1 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-02 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd9wpt-Hy9g/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-01 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd6ZB2Djknh/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833693/ |
| Pinterest | 2026-10-01 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd7UPmeFVkk/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833550/ |
| Pinterest | 2026-10-01 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd6wC1RiWEd/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833432/ |
| Pinterest | 2026-10-01 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7MPHWj3ku/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833290/ |
| Pinterest | 2026-10-01 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd6UQDolC60/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833287/ |
| Pinterest | 2026-09-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd1YiSEDDur/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667871/ |
| Pinterest | 2026-09-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd2VJQIFPf6/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667814/ |
| Pinterest | 2026-09-28 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd0SuSMlPf1/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583435/ |
| Pinterest | 2026-09-25 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdrvVenEe2j/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314528/ |
| Pinterest | 2026-09-25 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdqcqhXm4wX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314388/ |
| Pinterest | 2026-09-24 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdoSCmhkuU7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236221/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnNSHEDMja/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152144/ |
| Instagram | 2026-10-18 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «p, kein Konzern. Ab Schweizer Lager, Lieferdatum steht» | https://www.instagram.com/p/DepguxkCA2G/ |
| Instagram | 2026-10-18 | 0 | FORMAT | Bild 720×690 — Breite unter 1080 | https://www.instagram.com/p/DepguxkCA2G/ |
| Facebook | 2026-10-17 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122147008701350792 |
| Facebook | 2026-10-09 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144834175350792 |
| Facebook | 2026-10-09 | 0 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144664459350792 |
| Facebook | 2026-10-08 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144562639350792 |
| Facebook | 2026-10-08 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144398905350792 |
| Facebook | 2026-10-07 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144260167350792 |
| Facebook | 2026-10-07 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122144135127350792 |
| Facebook | 2026-10-06 | 0 | FORMAT | Bild 899×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143775343350792 |
| Facebook | 2026-10-05 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122143628313350792 |
| Facebook | 2026-10-05 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122143628313350792 |
| Facebook | 2026-10-05 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122143527681350792 |
| Facebook | 2026-10-05 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122143527681350792 |
| Facebook | 2026-10-05 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122143463283350792 |
| Facebook | 2026-10-05 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122143463283350792 |
| Facebook | 2026-10-04 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122143388685350792 |
| Facebook | 2026-10-04 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122143388685350792 |
| Facebook | 2026-10-04 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122143185021350792 |
| Facebook | 2026-10-04 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122143185021350792 |
| Facebook | 2026-10-03 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142856305350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142787947350792 |
| Facebook | 2026-10-02 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142708879350792 |
| Facebook | 2026-10-02 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142708879350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142592419350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142448359350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142448359350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142400221350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142400221350792 |
| Facebook | 2026-10-01 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142311637350792 |
| Facebook | 2026-09-29 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122141854365350792 |
| Facebook | 2026-09-29 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122141854365350792 |
| Facebook | 2026-09-27 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141356965350792 |
| Facebook | 2026-09-25 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140880307350792 |
| Facebook | 2026-09-25 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140807437350792 |
| Facebook | 2026-09-24 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140423395350792 |
| Pinterest | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581196150 |
| Pinterest | 2026-09-24 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «wertige Qualität ab Schweizer Lager. Details Marke: Wid» | https://www.pinterest.es/pin/1111333645581220663 |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581229813 |
| Facebook | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122140802565350792 |
| Instagram | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/Ddt2SkdjXMz/ |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581268333 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581294528 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581314086 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581329607 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581351838 |
| Pinterest | 2026-09-26 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581399587 |
| Pinterest | 2026-09-28 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581639687 |
| Pinterest | 2026-09-30 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581806200 |
| Pinterest | 2026-10-01 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581890633 |
| Pinterest | 2026-10-02 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581979393 |
| Pinterest | 2026-10-03 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645582070710 |
| Pinterest | 2026-10-04 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645582163305 |
| Instagram | 2026-10-05 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | (geplant, Metricool 388937521) |
| Facebook | 2026-10-05 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122143702857350792 |
| Instagram | 2026-10-06 | n/a | FORMAT | Bild 899×900 — Breite unter 1080 | https://www.instagram.com/p/DeI5qoiCldf/ |
| Facebook | 2026-10-06 | n/a | FORMAT | Bild 899×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122143775319350792 |
| Instagram | 2026-10-06 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeJQ7fniEOK/ |
| Instagram | 2026-10-06 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | (geplant, Metricool 389315472) |
| Facebook | 2026-10-06 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122143842039350792 |
| Instagram | 2026-10-06 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeJyx5GCAz9/ |
| Instagram | 2026-10-06 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeKOacViqwo/ |
| Facebook | 2026-10-06 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122143921815350792 |
| Instagram | 2026-10-07 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeMPyrgDSTK/ |
| Facebook | 2026-10-07 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122144135103350792 |
| Instagram | 2026-10-07 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeM6_g-CGPE/ |
| Facebook | 2026-10-07 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122144259999350792 |
| Instagram | 2026-10-08 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeORyZ1CMY-/ |
| Facebook | 2026-10-08 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122144398881350792 |
| Instagram | 2026-10-08 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DePmCTTFQxD/ |
| Facebook | 2026-10-08 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122144562615350792 |
| Instagram | 2026-10-09 | n/a | FORMAT | Bild 750×750 — Breite unter 1080 | https://www.instagram.com/p/DeQTc5Vipym/ |
| Facebook | 2026-10-09 | n/a | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122144664435350792 |
| Instagram | 2026-10-09 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeRnDOrCJjU/ |
| Facebook | 2026-10-09 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122144834151350792 |
| Instagram | 2026-10-09 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | (geplant, Metricool 392337765) |
| Instagram | 2026-10-09 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | (geplant, Metricool 392337765) |
| Instagram | 2026-10-09 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.instagram.com/p/DeSXF_ZlZ2W/ |
| Instagram | 2026-10-09 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.instagram.com/p/DeSXF_ZlZ2W/ |
| Instagram | 2026-10-09 | n/a | DOPPEL | gleiche Warengruppe «diffuser» 8 h nach https://www.instagram.com/reel/DeRyvAYjoHV/ (Raster wirkt doppelt) | https://www.instagram.com/reel/DeSbdrIDCs2/ |
| Pinterest | 2026-10-10 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645582593722 |
| Instagram | 2026-10-10 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeS_HKKiGnr/ |
| Instagram | 2026-10-10 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DeTrzCDiAqr/ |
| Instagram | 2026-10-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.instagram.com/p/DeVBdfDlZk-/ |
| Instagram | 2026-10-10 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.instagram.com/p/DeVBdfDlZk-/ |
| Instagram | 2026-10-10 | n/a | FORMAT | Bild 999×999 — Breite unter 1080 | https://www.instagram.com/p/DeVBdfDlZk-/ |
| Instagram | 2026-10-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | (geplant, Metricool 393175631) |
| Instagram | 2026-10-11 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | (geplant, Metricool 393175631) |
| Instagram | 2026-10-11 | n/a | FORMAT | Bild 724×1548 — Breite unter 1080 | (geplant, Metricool 393175631) |
| Instagram | 2026-10-13 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | (geplant, Metricool 393520121) |
| Instagram | 2026-10-13 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | (geplant, Metricool 393520246) |
| Instagram | 2026-10-13 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | (geplant, Metricool 393520277) |
| Pinterest | 2026-10-12 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645582850861 |
| Instagram | 2026-10-13 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.instagram.com/p/Deacex6CMSd/ |
| Instagram | 2026-10-13 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.instagram.com/p/Deacex6CMSd/ |
| Instagram | 2026-10-13 | n/a | FORMAT | Bild 750×750 — Breite unter 1080 | https://www.instagram.com/p/DebJMZ_iNbe/ |
| Instagram | 2026-10-13 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DebzXSjCNR9/ |
| Instagram | 2026-10-13 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/Decc3rbiHnM/ |
| Pinterest | 2026-10-14 | n/a | FORMAT | Bild 1000×1400 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645582952604 |
| Instagram | 2026-10-14 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «p, kein Konzern. Ab Schweizer Lager, Lieferdatum steht» | https://www.instagram.com/p/DedGguMiJIS/ |
| Instagram | 2026-10-14 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DedwjaJjVgG/ |
| Instagram | 2026-10-14 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – meist in 2–3 Werk» | https://www.instagram.com/p/Deeai7xiIFW/ |
| Instagram | 2026-10-14 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager, meist in 2» | https://www.instagram.com/p/Deeai7xiIFW/ |
| Instagram | 2026-10-14 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DefHK6SCiaY/ |
| Instagram | 2026-10-15 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/Defwy5Nih1P/ |
| Instagram | 2026-10-17 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/DemJH5DiLM6/ |
| Facebook | 2026-10-17 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122147008677350792 |
| Instagram | 2026-10-18 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «p, kein Konzern. Ab Schweizer Lager, Lieferdatum steht» | https://www.instagram.com/p/DepguxkCA2G/ |
| Instagram | 2026-10-18 | n/a | FORMAT | Bild 749×718 — Breite unter 1080 | https://www.instagram.com/p/DepguxkCA2G/ |
| Pinterest | 2026-10-18 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «wertige Qualität ab Schweizer Lager. Details Marke: Wid» | (geplant, Metricool 399398602) |
| Pinterest | 2026-10-18 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | (geplant, Metricool 399398602) |
| Pinterest | 2026-10-16 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DegfXRTjeww/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583141853/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dedzmhbilva/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583055861/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Deex5cNAlVT/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583055633/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Def39zmiGDM/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583054465/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DefHK6SCiaY/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583054460/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Defwy5Nih1P/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583054462/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DedwjaJjVgG/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583054449/ |
| Pinterest | 2026-10-15 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – meist in 2–3 Werk» | https://www.pinterest.com/pin/1111333645583054455/ |
| Pinterest | 2026-10-15 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager, meist in 2» | https://www.pinterest.com/pin/1111333645583054455/ |
| Pinterest | 2026-10-15 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Deeai7xiIFW/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645583054455/ |
| Pinterest | 2026-10-14 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DecNTqiFIRn/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582973327/ |
| Pinterest | 2026-10-14 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «p, kein Konzern. Ab Schweizer Lager, Lieferdatum steht» | https://www.pinterest.com/pin/1111333645582973181/ |
| Pinterest | 2026-10-14 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DedGguMiJIS/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582973181/ |
| Pinterest | 2026-10-14 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DebzXSjCNR9/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582973177/ |
| Pinterest | 2026-10-14 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Decc3rbiHnM/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582973178/ |
| Pinterest | 2026-10-14 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DebJMZ_iNbe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582973176/ |
| Pinterest | 2026-10-13 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeZoLVmm3d9/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582887134/ |
| Pinterest | 2026-10-13 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeYw4c8jyf2/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582886819/ |
| Pinterest | 2026-10-13 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Deam-qLCtFY/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582886532/ |
| Pinterest | 2026-10-13 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeZx5UMio15/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582886525/ |
| Pinterest | 2026-10-13 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeYdhuADRLT/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582886523/ |
| Pinterest | 2026-10-12 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeWZ59WiJDw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582804214/ |
| Pinterest | 2026-10-12 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeXSXXuFFk0/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582803372/ |
| Pinterest | 2026-10-11 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeUWqhPijlX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582710625/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeOd84ij9XP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582527656/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DePxs6iiEY9/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582527565/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DePVOL1iMvu/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582527228/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeQMyHViEAk/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582526827/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DePmCTTFQxD/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582526823/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeQTc5Vipym/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582526824/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeORyZ1CMY-/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582526821/ |
| Pinterest | 2026-10-09 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeO7ruaisw7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582526822/ |
| Pinterest | 2026-10-08 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeL4_VgFRha/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439367/ |
| Pinterest | 2026-10-08 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeNGCtKCTJH/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439340/ |
| Pinterest | 2026-10-08 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeNhaI_iIPU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439044/ |
| Pinterest | 2026-10-08 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeMPyrgDSTK/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439038/ |
| Pinterest | 2026-10-08 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeM6_g-CGPE/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582439040/ |
| Pinterest | 2026-10-07 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeKLew8jcYs/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348749/ |
| Pinterest | 2026-10-07 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeKhZJQFSVO/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348377/ |
| Pinterest | 2026-10-07 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeK8Kk_CA33/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348298/ |
| Pinterest | 2026-10-07 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeK79H1CtxZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582348296/ |
| Pinterest | 2026-10-06 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeHgEO_CXFD/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582268829/ |
| Pinterest | 2026-10-06 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeGnRjZD3Vl/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582268486/ |
| Pinterest | 2026-10-06 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeI5qoiCldf/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582268398/ |
| Pinterest | 2026-10-05 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeEta4YlMAG/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582184606/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeC_fFFH7ML/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096690/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeCfMMDjHDg/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096688/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd8Phq_GZlZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581918302/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd-D2V1nTgU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916695/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd9yh8cjF7b/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916556/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd-fGWZF66i/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916553/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd5OfrZCOZP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751961/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd4QyVLD_y2/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751795/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd3TIwtiGNg/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751497/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd4nKUeD_qe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751258/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd46LI9jPqv/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751256/ |
| Pinterest | 2026-09-29 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd2wskBlPZN/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667028/ |
| Pinterest | 2026-09-29 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd1YfDSDX-4/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667021/ |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddza9ySASTZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583062/ |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd0EM26kdvw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583061/ |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddza2rvHVMo/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583059/ |
| Pinterest | 2026-09-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdvmkBckZrO/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581487706/ |
| Pinterest | 2026-09-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdvdzC8ETg1/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581487084/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddutl8miAzn/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581396531/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddtv5Z1Epoh/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581396301/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdsyP5Cl3v2/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581395392/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddt5dW5FNsS/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581395388/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddqcs8oCskw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314612/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdqK05YFML3/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314394/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddsmbc-DkJe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314392/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdrLJiHlH7a/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314389/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddr7Lk4nPix/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314390/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnlCi-jkth/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236070/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdpMLlyHJYD/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236067/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdpyPQLFFjb/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236068/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddoi3MMlLPX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236066/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddn4MnOlCmw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236064/ |
| Pinterest | 2026-09-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdmhalZFAvs/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152143/ |

</details>

## Facebook ohne Direktlink

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 38 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-09-23 05:39 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140105137350792 · «EMS Mikrostrom Massagegerät · CHF 22.90 Kleiner Schweizer S…»
- 2026-09-23 02:08 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140069977350792 · «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für na…»
- 2026-09-23 14:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140221003350792 · «Kristall-Set 3-teilig · CHF 29.90 Kleiner Schweizer Shop au…»
- 2026-09-03 21:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135105943350792 · «Von allem etwas – 8 Lieblinge aus 8 Welten 🌍 Wisch dich du…»
- 2026-09-30 16:21 UTC · 3 Aufrufe · https://www.facebook.com/reel/1036507699423763/ · «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, …»
- 2026-09-26 06:10 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140943505350792 · «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-S…»
- 2026-09-27 20:01 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122141356965350792 · «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF…»
- 2026-09-25 23:08 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140880307350792 · «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 2…»
- 2026-09-25 16:33 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140807437350792 · «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen ·…»
- 2026-10-04 22:35 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2101815593779290 · «»
- 2026-10-06 02:31 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1952343909504273 · «»
- 2026-10-06 11:13 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1536489971575878 · «»
- 2026-10-06 19:11 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2078989949300333 · «»
- 2026-10-06 21:13 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1619664179635776 · «»
- 2026-10-07 06:18 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1451581983522147 · «»
- 2026-10-07 14:26 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1854340455741753 · «»
- 2026-10-07 22:29 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1448256603935309 · «»
- 2026-10-08 06:33 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/978619887897924 · «»
- 2026-10-08 14:42 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2605319749911152 · «»
- 2026-10-08 22:55 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1007026972403352 · «»
- 2026-10-09 07:10 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1769629007651538 · «»
- 2026-10-09 15:25 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1790858235434864 · «»
- 2026-10-09 23:39 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2957787077908740 · «»
- 2026-10-10 08:14 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1718783476343876 · «»
- 2026-10-10 16:27 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/4645907419067049 · «»
- 2026-10-11 01:13 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1612008157085472 · «»
- 2026-10-11 11:25 UTC · n/a Aufrufe · (geplant, Metricool 393176023) · «»
- 2026-10-11 20:13 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1758827255330179 · «»
- 2026-10-12 04:14 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1112592991221516 · «»
- 2026-10-12 13:25 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1167699952884518 · «»
- 2026-10-12 21:31 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2167180690528566 · «»
- 2026-10-13 06:13 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2016723762361517 · «»
- 2026-10-13 14:25 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1886878665627199 · «»
- 2026-10-13 22:28 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1132919076087166 · «»
- 2026-10-14 06:30 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1150424940979046 · «»
- 2026-10-14 14:45 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1105629988875784 · «»
- 2026-10-14 22:59 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1033832376365374 · «»
- 2026-10-18 22:13 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/1130377682854663 · «»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (444): https://www.instagram.com/p/DepguxkCA2G/ · https://www.instagram.com/reel/DegfXRTjeww/ · https://www.instagram.com/p/Def39zmiGDM/ · https://www.instagram.com/p/Defwy5Nih1P/ · https://www.instagram.com/p/DefHK6SCiaY/ · https://www.instagram.com/reel/Deex5cNAlVT/ · https://www.instagram.com/p/Deeai7xiIFW/ · https://www.instagram.com/reel/Dedzmhbilva/ · https://www.instagram.com/p/DedwjaJjVgG/ · https://www.instagram.com/p/DedSQZwiCEQ/ · https://www.instagram.com/p/DedGguMiJIS/ · https://www.instagram.com/p/Decc3rbiHnM/ · https://www.instagram.com/reel/DecNTqiFIRn/ · https://www.instagram.com/p/DebzXSjCNR9/ · https://www.instagram.com/p/DebJMZ_iNbe/ · https://www.instagram.com/p/Deam-qLCtFY/ · https://www.instagram.com/p/DeZx5UMio15/ · https://www.instagram.com/reel/DeZoLVmm3d9/ · https://www.instagram.com/reel/DeYw4c8jyf2/ · https://www.instagram.com/p/DeYdhuADRLT/ · https://www.instagram.com/p/DeYB53qCntC/ · https://www.instagram.com/p/DeXu4_kCkbL/ · https://www.instagram.com/reel/DeXSXXuFFk0/ · https://www.instagram.com/p/DeXESdoiK14/ · https://www.instagram.com/reel/DeWZ59WiJDw/ …
- Medien nicht messbar (3): https://www.pinterest.es/pin/1111333645581220663 (Download gescheitert) · (geplant, Metricool 393176017) (Download gescheitert) · (geplant, Metricool 393176023) (Download gescheitert)
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
