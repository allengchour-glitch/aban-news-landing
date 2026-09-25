# Social-Qualität — Stand 2026-09-25 00:11 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 65 Seitenbeiträge + 0 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 28 Einträge (−30/+7 Tage) · Pinterest-Analyse: 18 Pins
- Geprüft: 211 Beiträge, 228 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF 45 Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF 7 · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)

## Zusammenfassung

**58 Fehler · 52 Warnungen · 44 Hinweise** — Fehler/Warnungen in 90 von 211 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 6 × Caption korrigieren · 6 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 24 × Caption in der App korrigieren (API kann es nicht [Q2]) · 38 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 16 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | TikTok | YouTube | Pinterest | Summe |
|---|---:|---:|---:|---:|---:|---:|
| DIREKTLINK | · | · | · | · | 12 | 12 |
| DOPPEL | 19 | 5 | · | · | 1 | 25 |
| FLOSKEL | 2 | 2 | · | · | 2 | 6 |
| FORMAT | · | 16 | · | · | 5 | 21 |
| PREIS | 14 | 4 | 2 | 3 | 8 | 31 |
| PRODUKT | 27 | · | · | · | · | 27 |
| VERSAND | 31 | · | · | · | 1 | 32 |

Produkt zugeordnet: 123 von 211 Beiträgen (Ledger 25, Link 90, Titel 8).

Dazu: 42 Facebook-Beiträge ohne Direktlink (Liste unten) · 23 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 158 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

### FEHLER · TikTok video · 2026-09-23 06:37 UTC · 546 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7688585316826877216
- Text: «Kennst du das schon? 👀 «Tragbarer Smart-Projektor P62, HD-Auflösung» — Dieser tragbare Projektor P62 projiziert Inhalte von deinem Smartph…»
- Produkt: Tragbarer Smart-Projektor P62, HD-Auflösung (ACTIVE, https://luxestyle.ch/products/tragbarer-smart-projektor-p62-hd-auflosung-844800, SKU CJ-1443876506416844800) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 86.90, Shop CHF 96.90 («Tragbarer Smart-Projektor P62, HD-Auflösung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · Instagram reel · 2026-09-23 04:09 UTC · 222 Aufrufe
- Post: https://www.instagram.com/reel/DdnatlxD0nV/ · Zwilling: https://www.facebook.com/reel/1064048703271346/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-08-01 11:12 UTC · 83 Aufrufe
- Post: https://www.instagram.com/reel/DbftCVqDqVO/
- Text: ««Luftreiniger mit Feuchtigkeitsspender» ✨ Jetzt bei LuxeStyle — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭 🔗 l…»
- Produkt: Luftreiniger mit Feuchtigkeitsspender (ACTIVE, https://luxestyle.ch/products/luftreiniger-mit-feuchtigkeitsspender-889dfb, SKU CJ-CJXFZNZN00558-Black) — Zuordnung: Link im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJXFZNZN00558-Black, 10–20 Werktage): «e — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **FEHLER PREIS:** Lockpreis: Caption CHF 12.90, Shop CHF 16.90 («Luftreiniger mit Feuchtigkeitsspender», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-06-12 12:05 UTC · 57 Aufrufe
- Post: https://www.instagram.com/reel/DZfDSPokQA9/
- Text: «LuxeStyle – dein Schweizer Online-Shop ✨ Premium-Looks zu fairen Preisen: Mode für Sie & Ihn, Schmuck, Beauty & mehr. Mit «Selbst gestalten…»
- **FEHLER VERSAND:** Auslandsversand zugesagt (Shop liefert nur CH): «, Tasse & Tasche 🎨 Weltweiter Versand · 30 Tage Rückgabe · -10»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-06-21 17:37 UTC · 54 Aufrufe
- Post: https://www.instagram.com/reel/DZ20gmnE_Ig/
- Text: «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selbst-gestalten — alles us eim Schwiizer Shop. 💾 Spicher's · gratis Versand ab CHF…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «hop. 💾 Spicher's · gratis Versand ab CHF 65 · –10% WELCOME10 →» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-14 08:53 UTC · 49 Aufrufe
- Post: https://www.instagram.com/p/DZj2_xDkrT-/
- Text: «Kaminfeuer-Vibes ohne echtes Feuer 🔥 Flame Diffuser · 7 Farben + Luftbefeuchter – CHF 64 💾 Speicher dir das · 👇 Würdest du? Schreib es �…»
- Produkt: Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humidifier (DRAFT, nicht im Onlineshop) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humid…» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 64.00, Shop CHF 49.90 («Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humid…», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-29 00:08 UTC · 47 Aufrufe
- Post: https://www.instagram.com/p/DbWyoHKEtoI/
- Text: «Gepflegter Bart in Perfektion – mit Öl, Balsam, Bürste und Schere alles in einem Set. 🧔 Blitzversand aus der Schweiz und bequem Kauf auf R…»
- Produkt: Bart-Pflegeset Premium 4-teilig · Öl, Balsam, Bürste, Schere (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-gepflegter-bart-in-perfektion-mi-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Bart-Pflegeset Premium 4-teilig · Öl, Balsam, Bürste, Schere» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-gepflegter-bart-in-perfektion-mi-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «es in einem Set. 🧔 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:50 UTC · 43 Aufrufe
- Post: https://www.instagram.com/reel/DbVQd7GinD2/
- Text: ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭»
- Produkt: Wimpernlift-Kit (ACTIVE, https://luxestyle.ch/products/wimpernlift-kit-161984, SKU CJ-CJCZ1533149-Same as Photo) — Zuordnung: Ledger cjreel-15449432981889
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJCZ1533149-Same as P, 10–20 Werktage): «e — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-14 08:54 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/DZj3GkPElk0/
- Text: «Dein Zuhause = Spa 🌿 Smart Diffuser XXL · Bluetooth + App, deckt 200m² – CHF 154 💾 Speicher dir das · 👇 Welcher Duft wär deiner? · –10% …»
- Produkt: Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Räume (DRAFT, nicht im Onlineshop) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Rä…» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 154.00, Shop CHF 119.90 («Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Rä…», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:17 UTC · 42 Aufrufe
- Post: https://www.instagram.com/reel/DbVMo7IDmbK/
- Text: ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» ✨ Jetzt bei LuxeStyle — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code …»
- Produkt: Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend (ACTIVE, https://luxestyle.ch/products/kurbis-strichburste-fur-hunde-katzen-selbstrei-066368, SKU CJ-CJMY1547493-Pumpkin) — Zuordnung: Ledger cjreel-15449432916353
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJMY1547493-Pumpkin, 10–20 Werktage): «e — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 18:07 UTC · 41 Aufrufe
- Post: https://www.instagram.com/p/DbWJX_tD8cG/
- Text: «Verwöhnzeit für dich: Die Selfcare-Box mit Jade Roller, Seiden-Kissenbezug und Duftkerzen bringt Wellness direkt nach Hause. 💆‍♀️✨ Dank Bl…»
- Produkt: Selfcare-Box Wellness – Jade Roller + Seiden-Kissenbezug + Duftkerzen (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-verw-hnzeit-f-r-dich-die-selfcar-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Selfcare-Box Wellness – Jade Roller + Seiden-Kissenbezug + …» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-verw-hnzeit-f-r-dich-die-selfcar-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Hause. 💆‍♀️✨ Dank Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 16:07 UTC · 40 Aufrufe
- Post: https://www.instagram.com/p/DbV7nAODtnB/
- Text: «Dein stylishes XL-Portemonnaie aus Echtleder mit 12 Kartenfächern und RFID-Schutz – Ordnung trifft Eleganz! 🖤 Blitzversand aus der Schweiz…»
- Produkt: Damen Portemonnaie XL Echtleder · 12 Kartenfächer & RFID (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-dein-stylishes-xl-portemonnaie-a-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Damen Portemonnaie XL Echtleder · 12 Kartenfächer & RFID» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-stylishes-xl-portemonnaie-a-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «trifft Eleganz! 🖤 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 21:07 UTC · 39 Aufrufe
- Post: https://www.instagram.com/p/DbWd5w_kso0/
- Text: «Drei traumhafte Ohrring-Paare, hypoallergen und sanft zu deinen Ohren ✨ Dank Blitzversand aus der Schweiz funkeln sie schon bald an dir – b…»
- Produkt: Damen Ohrring-Set 3 Paare · Edelstahl 925, Hypoallergen (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-drei-traumhafte-ohrring-paare-hy-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Damen Ohrring-Set 3 Paare · Edelstahl 925, Hypoallergen» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-drei-traumhafte-ohrring-paare-hy-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «deinen Ohren ✨ Dank Blitzversand aus der Schweiz fun»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-23 17:00 UTC · 39 Aufrufe
- Post: https://www.instagram.com/p/DZ757I_ibQv/
- Text: «Dis nöie Lieblingsteil? 👀 Armkette «Papillon» 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME10 👉 luxestyle.ch/products/arm…»
- Produkt: Armkette «Papillon» · Schmetterling, Roségold & Perlmutt (DRAFT, nicht im Onlineshop, SKU cj-papillon-armkette) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Armkette «Papillon» · Schmetterling, Roségold & Perlmutt» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 15:08 UTC · 38 Aufrufe
- Post: https://www.instagram.com/p/DbV02viDIZT/
- Text: «Maritimer Style für echte Männer – dieses Lederarmband mit Edelstahl-Anker setzt ein starkes Statement. ⚓ Dank Blitzversand aus der Schweiz…»
- Produkt: Herren Lederarmband Edelstahl-Anker · Premium Maritime Style (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-maritimer-style-f-r-echte-m-nner-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Herren Lederarmband Edelstahl-Anker · Premium Maritime Style» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-maritimer-style-f-r-echte-m-nner-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «s Statement. ⚓ Dank Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-16 19:48 UTC · 37 Aufrufe
- Post: https://www.instagram.com/p/DZqLfkiH3Oa/
- Text: «Viu Style für wenig Gäud ✨ Vitamin-C-Serum «Glow» 💾 Merk’s dir · folg für meh Schwiizer Finds · –10% mit WELCOME10 👉 luxestyle.ch/product…»
- **FEHLER PRODUKT:** Direktlink /products/vitamin-c-serum-glow-straffend-strahlend findet kein Produkt (404)  
  → Vorschlag: Link tot: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 20:07 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DbWXJFgEqOw/
- Text: «Ruhe auf Knopfdruck: Diese Bluetooth-Kopfhörer mit Active Noise Cancellation begleiten dich bis zu 40 Stunden. 🎧 Blitzversand aus der Schw…»
- Produkt: Bluetooth Kopfhörer ANC · Active Noise Cancellation, 40h Akku (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-ruhe-auf-knopfdruck-diese-blueto-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Bluetooth Kopfhörer ANC · Active Noise Cancellation, 40h Ak…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-ruhe-auf-knopfdruck-diese-blueto-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «s zu 40 Stunden. 🎧 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-12 05:28 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DarlvirF8yD/
- Text: «Das mues i ha 🤍 Filzhut «Montana» 👇 Wele nimmsch? Schrib’s i d Kommentär · –10% mit WELCOME10 👉 luxestyle.ch/products/filzhut-montana-br…»
- Produkt: Filzhut «Montana» · Breitkrempiger Wollfilz-Fedora (DRAFT, nicht im Onlineshop, SKU cj-hut-montana) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Filzhut «Montana» · Breitkrempiger Wollfilz-Fedora» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:44 UTC · 35 Aufrufe
- Post: https://www.instagram.com/p/DZicunuk5Dr/
- Text: «Aufblasbares Pool-Spiel «3-Gewinnt» 🎯 Wurfspiel mit 8 Bällen – CHF 29.90 Der Hit für Pool, Garten & Party. 🇨🇭 Gratis-Versand ab CHF 65 ·…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «arten & Party. 🇨🇭 Gratis-Versand ab CHF 65 · –10% WELCOME10 👉» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-14 23:28 UTC · 33 Aufrufe
- Post: https://www.instagram.com/p/Dayq7jnCPrE/
- Text: «Genau das hat mir gefehlt 🙌 Mini-Tasche «Perla» 👇 Wele nimmsch? Schrib’s i d Kommentär · –10% mit WELCOME10 👉 luxestyle.ch/products/mini…»
- Produkt: Mini-Handtasche «Perla» · Perlen-Rivet Bag (DRAFT, nicht im Onlineshop, SKU cj-bag-perla) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Mini-Handtasche «Perla» · Perlen-Rivet Bag» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-19 11:03 UTC · 33 Aufrufe
- Post: https://www.instagram.com/p/DZw9yVkmviH/
- Text: «Viu Style für wenig Gäud ✨ 3D Gesichtsroller 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME10 👉 luxestyle.ch/products/3d-li…»
- Produkt: 3D Lifting Gesichtsroller · Gold (DRAFT, nicht im Onlineshop, SKU cj-3droller) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «3D Lifting Gesichtsroller · Gold» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 19:07 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbWQMHCFG28/
- Text: «Dein Fitness-Upgrade ist da: AMOLED-Display, über 100 Sportmodi und 7 Tage Akkulaufzeit! ⌚ Blitzversand aus der Schweiz und bequem Kauf auf…»
- Produkt: Smartwatch Pro AMOLED · Herzfrequenz, 100+ Sportmodi, 7 Tage Akku (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-dein-fitness-upgrade-ist-da-amol-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Smartwatch Pro AMOLED · Herzfrequenz, 100+ Sportmodi, 7 Tag…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-fitness-upgrade-ist-da-amol-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «age Akkulaufzeit! ⌚ Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 14:11 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbVuTmFkkec/
- Text: «Schlank, sicher und richtig edel: Unser Unisex Slim Wallet aus Echtleder schützt dank RFID-Blocker deine Karten – in 7 Farben für Sie und I…»
- Produkt: Unisex Slim Wallet RFID · 7 Farben Echtleder für Sie und Ihn (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-schlank-sicher-und-richtig-edel--15
- **FEHLER PRODUKT:** Beworbenes Produkt «Unisex Slim Wallet RFID · 7 Farben Echtleder für Sie und Ihn» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-schlank-sicher-und-richtig-edel--15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «für Sie und Ihn. 🖤 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:43 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DZicnMck2Vc/
- Text: «Solar-Windspiel «Libelle» 🪻 Farbwechsel-LED, wetterfest (2er-Set) – CHF 44.90 Stimmungsvolle Deko für Garten & Balkon, ganz ohne Strom. 🇨…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «nz ohne Strom. 🇨🇭 Gratis-Versand ab CHF 65 👉 luxestyle.ch» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-29 23:28 UTC · 31 Aufrufe
- Post: https://www.instagram.com/p/DbZS2rNDCPk/
- Text: «Für di oder zum Verschänke? 🎁 Sonnenbrille «Riviera» 💾 Merk’s dir · folg für meh Schwiizer Finds · –10% mit WELCOME10 👉 luxestyle.ch/pro…»
- Produkt: Sonnenbrille «Riviera» · Oversize Square mit Gold-Detail (DRAFT, nicht im Onlineshop, SKU cj-sun-riviera) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Sonnenbrille «Riviera» · Oversize Square mit Gold-Detail» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-19 20:13 UTC · 31 Aufrufe
- Post: https://www.instagram.com/p/DZx8x0Jnywk/
- Text: «Genau das hesch gsuecht, gäu? 🙌 Ring-Set «Eternità» ↗️ Teil das mit dyre beschte Fründin 💛 · –10% mit WELCOME10 👉 luxestyle.ch/products/…»
- Produkt: Ring-Set «Eternità» · stapelbares Tropfen-Ring-Set, Silber (DRAFT, nicht im Onlineshop, SKU cj-eternita-ringset) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Ring-Set «Eternità» · stapelbares Tropfen-Ring-Set, Silber» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-17 05:28 UTC · 30 Aufrufe
- Post: https://www.instagram.com/p/Da4duA7iFiV/
- Text: «Weles isch dis Lieblingsteil? 🤍 Chiffon-Stola «Soirée» 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME10 👉 luxestyle.ch/pro…»
- Produkt: Chiffon-Stola «Soirée» · Eleganter Abend-Schal (DRAFT, nicht im Onlineshop, SKU cj-schal-soiree) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Chiffon-Stola «Soirée» · Eleganter Abend-Schal» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-23 17:28 UTC · 30 Aufrufe
- Post: https://www.instagram.com/p/DZ79CNvlqJ3/
- Text: «Kleiner Preis, grosse Wirkung ✨ Seidenschal «Lyon» 💾 Merk’s dir · folg für meh Schwiizer Finds · –10% mit WELCOME10 👉 luxestyle.ch/produc…»
- Produkt: Seidenschal «Lyon» · Eleganter Halstuch-Schal (DRAFT, nicht im Onlineshop, SKU cj-schal-lyon) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Seidenschal «Lyon» · Eleganter Halstuch-Schal» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-29 00:12 UTC · 28 Aufrufe
- Post: https://www.instagram.com/p/DbWzLsdDpmX/
- Text: «Dein stylisher Sommer-Begleiter: Die vegane Crossbody-Bag mit praktischem Smartphone-Fach! ☀️👜 Blitzversand aus der Schweiz und Kauf auf R…»
- Produkt: Crossbody-Bag Vegan · Sommer-Tasche mit Smartphone-Fach (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-dein-stylisher-sommer-begleiter--15
- **FEHLER PRODUKT:** Beworbenes Produkt «Crossbody-Bag Vegan · Sommer-Tasche mit Smartphone-Fach» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-stylisher-sommer-begleiter--15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «artphone-Fach! ☀️👜 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 23:07 UTC · 28 Aufrufe
- Post: https://www.instagram.com/p/DbWrtD9jSC2/
- Text: «Sonne, See und ganz viel Platz – dein XL Strandtuch aus Bio-Baumwolle bleibt dank sandfreiem Stoff angenehm sauber. ☀️ Dank Blitzversand au…»
- Produkt: XL Strandtuch Bio-Baumwolle 180x100cm · Sandfrei, mit Tragebeutel (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-sonne-see-und-ganz-viel-platz-de-15
- **FEHLER PRODUKT:** Beworbenes Produkt «XL Strandtuch Bio-Baumwolle 180x100cm · Sandfrei, mit Trage…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-sonne-see-und-ganz-viel-platz-de-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ehm sauber. ☀️ Dank Blitzversand aus der Schweiz bis»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-14 08:55 UTC · 28 Aufrufe
- Post: https://www.instagram.com/p/DZj3JToEh9u/
- Text: «Sternenhimmel im Schlafzimmer 🌌 Galaxy-Projektor mit Musik & Fernbedienung – CHF 52 💾 Merk dir das für den nächsten Cozy-Abend · 👇 Nacht…»
- Produkt: Sternenhimmel Projektor · Baby Nachtlicht mit Musik (DRAFT, nicht im Onlineshop, SKU PROJ-PANDA-001) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Sternenhimmel Projektor · Baby Nachtlicht mit Musik» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 52.00, Shop CHF 39.90 («Sternenhimmel Projektor · Baby Nachtlicht mit Musik», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-14 08:38 UTC · 27 Aufrufe
- Post: https://www.instagram.com/p/DZj1TCwEvpK/
- Text: «Stopp — das musst du sehen ✋ Camping-Ventilator «Nomad» – CHF 64.00 💾 Speicher dir das für später · –10% mit WELCOME10 👉 luxestyle.ch/pro…»
- Produkt: Camping-Deckenventilator «Nomad» · 2-in-1 mit LED-Laterne, Fernbedienung & Akku (ARCHIVED, nicht im Onlineshop, SKU CJ-NOMAD-FAN) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Camping-Deckenventilator «Nomad» · 2-in-1 mit LED-Laterne, …» ist ARCHIVED, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 64.00, Shop CHF 49.90 («Camping-Deckenventilator «Nomad» · 2-in-1 mit LED-Laterne, …», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-08-18 18:42 UTC · 24 Aufrufe
- Post: https://www.instagram.com/reel/DcMSDwjFGHj/
- Text: ««Kerzenlicht-Aromadiffuser» ✨ Jetzt bei LuxeStyle — CHF 14.90. Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT · −10% mit Code…»
- Produkt: Kerzenlicht-Aromadiffuser (ACTIVE, https://luxestyle.ch/products/kerzenlicht-aromadiffuser-412288, SKU CJ-CJJT154827201AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 17.90–22.90 («Kerzenlicht-Aromadiffuser», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-18 17:00 UTC · 24 Aufrufe
- Post: https://www.instagram.com/p/DZvB59tmFt3/
- Text: «Wusste nicht, dass ich das brauche 👀 Stroh-Shopper «Capri» 👇 Markier öpper, wo das bruucht · –10% mit WELCOME10 👉 luxestyle.ch/products/…»
- Produkt: Stroh-Shopper «Capri» · Geflochtene Schultertasche (DRAFT, nicht im Onlineshop, SKU cj-bag-capri) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Stroh-Shopper «Capri» · Geflochtene Schultertasche» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-09-24 08:24 UTC · 21 Aufrufe
- Post: https://www.instagram.com/reel/Ddqcs8oCskw/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxest…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 30.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:42 UTC · 21 Aufrufe
- Post: https://www.instagram.com/p/DZiceA3k9fi/
- Text: «Holz-Lesezähler «Leseheld» 🦊 Montessori-Tier-Tracker – CHF 14.90 Motiviert Kinder zum Lesen, nachhaltig aus Holz. 🇨🇭 Gratis-Versand ab C…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «ltig aus Holz. 🇨🇭 Gratis-Versand ab CHF 65 👉 luxestyle.ch» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 21:55 UTC · 19 Aufrufe
- Post: https://www.instagram.com/p/DbWjcLymW6l/
- Text: «Stilvoll verreisen mit dem Travel-Set Premium – Reisepass-Hülle, Kartenetui und Toilettentasche in einem! ✈️ Mit Blitzversand aus der Schwe…»
- Produkt: Travel-Set Premium · Reisepass-Hülle + Kartenetui + Toilettentasche (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-stilvoll-verreisen-mit-dem-trave-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Travel-Set Premium · Reisepass-Hülle + Kartenetui + Toilett…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-stilvoll-verreisen-mit-dem-trave-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «he in einem! ✈️ Mit Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-23 12:12 UTC · 16 Aufrufe
- Post: https://www.instagram.com/reel/DdoSCmhkuU7/ · Zwilling: https://www.facebook.com/reel/1441807861146512/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 39.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-24 23:28 UTC · 13 Aufrufe
- Post: https://www.instagram.com/p/DbMa4apjNFY/
- Text: «Stopp — das musst du sehen ✋ Crossbody «Lido» 💾 Spicher dr das für spöter · –10% mit WELCOME10 👉 luxestyle.ch/products/crossbody-tasche-l…»
- Produkt: Crossbody-Tasche «Lido» · Gewebte Colorblock Bag (DRAFT, nicht im Onlineshop, SKU cj-bag-lido) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Crossbody-Tasche «Lido» · Gewebte Colorblock Bag» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 17:08 UTC · 12 Aufrufe
- Post: https://www.instagram.com/p/DbWCiqijoyV/
- Text: «Zeitlos elegant und hautfreundlich – dieses Edelstahl-Armband passt zu jedem Look ✨ Blitzversand aus der Schweiz & Kauf auf Rechnung machen…»
- Produkt: Damen-Armband Edelstahl · Minimalistisch & Hypoallergen (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-zeitlos-elegant-und-hautfreundli-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Damen-Armband Edelstahl · Minimalistisch & Hypoallergen» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-zeitlos-elegant-und-hautfreundli-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «sst zu jedem Look ✨ Blitzversand aus der Schweiz & K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Pinterest pin · 2026-09-22 13:02 UTC · 5 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093478/
- Text: «Futterspender für Hunde Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futteraufnahme verlangsamt. Er besteht…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Instagram reel · 2026-09-24 20:26 UTC · 3 Aufrufe
- Post: https://www.instagram.com/reel/DdrvVenEe2j/ · Zwilling: https://www.facebook.com/reel/1076754371781935/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 28.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Pinterest pin · 2026-09-22 13:04 UTC · 3 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093635/
- Text: «Intelligenter Sensor-Seifenspender aus Edelstahl Der JAVA Jiahua Intelligente Sensor-Seifenspender überzeugt durch sein modernes, schlichte…»
- Produkt: Intelligenter Sensor-Seifenspender aus Edelstahl (ACTIVE, https://luxestyle.ch/products/intelligenter-sensor-seifenspender-aus-edelsta-068032, SKU CJ-1744234003089068032) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 38.90, Shop CHF 45.90 («Intelligenter Sensor-Seifenspender aus Edelstahl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-22 18:16 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581116334/
- Text: «Verstellbare Teleskop-Faszienrolle aus Schaumstoff Diese anpassbare Teleskop-Faszienrolle aus Schaumstoff ist ein vielseitiges Hilfsmittel …»
- Produkt: Verstellbare Teleskop-Faszienrolle aus Schaumstoff (ACTIVE, https://luxestyle.ch/products/verstellbare-teleskop-faszienrolle-aus-schaums-877824, SKU CJ-1797463325324877824) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 31.90, Shop CHF 43.90 («Verstellbare Teleskop-Faszienrolle aus Schaumstoff», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-22 13:07 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093873/
- Text: «Figurformendes ärmelloses Kleid Dieses elegante ärmellose Kleid schmeichelt der Figur und sorgt für einen raffinierten Auftritt. Der hohe T…»
- Produkt: Figurformendes ärmelloses Kleid (ACTIVE, https://luxestyle.ch/products/figurformendes-armelloses-kleid-600300, SKU CJ-CJLY293212301AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 27.90, Shop CHF 33.90 («Figurformendes ärmelloses Kleid», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-22 13:05 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093717/
- Text: «Webcam mit Full HD & LED-Ringlicht Die Full HD Webcam mit integriertem Ringlicht ist ideal für Online-Kurse, Live-Streams und Videokonferen…»
- Produkt: Webcam mit Full HD & LED-Ringlicht (ACTIVE, https://luxestyle.ch/products/webcam-mit-full-hd-led-ringlicht-108608, SKU CJ-1387226045287108608) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 28.90 («Webcam mit Full HD & LED-Ringlicht», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-22 13:03 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093546/
- Text: «Beheizbare Hausschuhe mit Temperaturregelung Diese beheizbaren Hausschuhe halten deine Füsse im Haus warm. · CHF 34.90 bei LuxeStyle CH — G…»
- Produkt: Beheizbare Hausschuhe mit Temperaturregelung (ACTIVE, https://luxestyle.ch/products/beheizbare-hausschuhe-mit-temperaturregelung-615500, SKU CJ-CJYD216355003CX) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 34.90, Shop CHF 41.90 («Beheizbare Hausschuhe mit Temperaturregelung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-09-24 20:27 UTC · n/a Aufrufe
- Post: https://www.facebook.com/reel/1076754371781935/ · Zwilling: https://www.instagram.com/reel/DdrvVenEe2j/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 28.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · TikTok video · 2026-09-24 18:05 UTC · n/a Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7689134487266970913
- Text: «Training ohne Studio 👀 «11-teiliges Fitnessband-Set» — Dieses 11-teilige Fitnessband-Set unterstützt dich beim täglichen Training. CHF 26.…»
- Produkt: 11-teiliges Fitnessband-Set · 11 Stück (ACTIVE, https://luxestyle.ch/products/11-teiliges-fitnessband-set-11-stuck-130624, SKU CJ-1385891886799130624) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 26.90, Shop CHF 31.90 («11-teiliges Fitnessband-Set · 11 Stück», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · YouTube video · 2026-09-24 16:30 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/V0oNnyp47Lg
- Text: «Wusstest du das schon? 👀 «Sit-Up-Hilfe mit Saugnapf für Bauchmuskeln» — Diese Sit-Up-Hilfe unterstützt dich beim Bauchmuskeltraining zu Ha…»
- Produkt: Sit-Up-Hilfe mit Saugnapf für Bauchmuskeln (ACTIVE, https://luxestyle.ch/products/sit-up-hilfe-mit-saugnapf-fur-bauchmuskeln-617216, SKU CJ-1379707815668617216) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 33.90, Shop CHF 41.90 («Sit-Up-Hilfe mit Saugnapf für Bauchmuskeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-09-24 10:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/05xytYjA4NQ
- Text: «Das Teil, nach dem alle fragen 👀 «Offener Manschetten-Armreif aus Titanstahl» — Dieser Armreif aus hochwertigem Edelstahl besticht durch s…»
- Produkt: Offener Manschetten-Armreif aus Titanstahl (ACTIVE, https://luxestyle.ch/products/offener-manschetten-armreif-aus-titanstahl-628800, SKU CJ-2603021237101628800) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 15.90, Shop CHF 24.90 («Offener Manschetten-Armreif aus Titanstahl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook reel · 2026-09-24 08:25 UTC · n/a Aufrufe
- Post: https://www.facebook.com/reel/1074059645370975/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 https:…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 30.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-24 04:50 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581236221/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 39.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · YouTube video · 2026-09-23 18:54 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/joD73lTVlGM
- Text: «Dein neues Lieblingsteil? 👀 «Matcha-Set mit Schale und Zubehör» — Dieses vierteilige Matcha-Set ist ideal für die traditionelle Zubereitun…»
- Produkt: Matcha-Set mit Schale und Zubehör (ACTIVE, https://luxestyle.ch/products/matcha-set-mit-schale-und-zubehor-218560, SKU CJ-1736982514977218560) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 27.90, Shop CHF 40.90 («Matcha-Set mit Schale und Zubehör», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook reel · 2026-09-23 12:13 UTC · n/a Aufrufe
- Post: https://www.facebook.com/reel/1441807861146512/ · Zwilling: https://www.instagram.com/reel/DdoSCmhkuU7/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 39.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-23 04:53 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152467/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-22 13:02 UTC gepostet: https://www.pinterest.com/pin/1111333645581093478/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-09-23 04:09 UTC · n/a Aufrufe
- Post: https://www.facebook.com/reel/1064048703271346/ · Zwilling: https://www.instagram.com/reel/DdnatlxD0nV/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>33 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · Instagram bild · 2026-09-03 21:20 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Dc1w4wMjkjZ/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122135101689350792
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- Produkt: Outdoor Bluetooth Speaker Solar – RGB-Licht, Wasserdicht & Tragbar (ACTIVE, https://luxestyle.ch/products/outdoor-bluetooth-speaker-solar-rgb-licht-wasserdicht-tragbar, SKU CJ-CJYS260671001AZ) — Zuordnung: Ledger kimi-dein-sound-f-r-jedes-abenteuer-s-15
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-18 11:28 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Da7rtpFCKEO/
- Text: «Weles nimmsch – 1, 2 oder 3? 👀 Herren-Sneaker «Marco» 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME10 👉 luxestyle.ch/prod…»
- Produkt: Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer (ACTIVE, https://luxestyle.ch/products/herren-sneaker-marco-leder-optik-retro-trainer, SKU CJNS292151801AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-14 16:00 UTC gepostet: https://www.instagram.com/p/DZkn0zVAV0p/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 11:09 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DbVZgK_kv1U/
- Text: «Zeitlos elegant am Handgelenk – Saphirglas, Edelstahl und 50 m Wasserdichtigkeit für jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tage…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «it für jeden Tag. ⌚ Blitzversand aus der Schweiz: in»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «nd aus der Schweiz: in 1–2 Tagen bei dir. 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-14 11:28 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DaxYiDjFa2B/
- Text: «Hesch das scho gseh? 🇨🇭 Stiletto-Sandalette «Gala» ↗️ Teil das mit dyre beschte Fründin 💛 · –10% mit WELCOME10 👉 luxestyle.ch/products/…»
- Produkt: Stiletto-Sandalette «Gala» · Violett, Knöchelriemen (ACTIVE, https://luxestyle.ch/products/stiletto-sandalette-gala-violett-knochelriemen, SKU CJNS291823709IR) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-15 16:00 UTC gepostet: https://www.instagram.com/p/DZnMnHQlFEM/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-06-15 16:00 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DZnMnHQlFEM/
- Text: «Kleiner Preis, grosse Wirkung ✨ Stiletto-Sandalette «Gala» – CHF 71.00 💾 Merk’s dir · folge für mehr Schweizer Finds · –10% mit WELCOME10 …»
- Produkt: Stiletto-Sandalette «Gala» · Violett, Knöchelriemen (ACTIVE, https://luxestyle.ch/products/stiletto-sandalette-gala-violett-knochelriemen, SKU CJNS291823709IR) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 71.00, Shop CHF 54.90 («Stiletto-Sandalette «Gala» · Violett, Knöchelriemen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-06-14 16:00 UTC · 40 Aufrufe
- Post: https://www.instagram.com/p/DZkn0zVAV0p/
- Text: «Stopp — das musst du sehen ✋ Herren-Sneaker «Marco» – CHF 71.00 👇 Markier jemanden, der das braucht · –10% mit WELCOME10 👉 luxestyle.ch/p…»
- Produkt: Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer (ACTIVE, https://luxestyle.ch/products/herren-sneaker-marco-leder-optik-retro-trainer, SKU CJNS292151801AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 71.00, Shop CHF 54.90 («Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-06-14 08:39 UTC · 39 Aufrufe
- Post: https://www.instagram.com/p/DZj1V9zEqRp/
- Text: «Wusste nicht, dass ich das brauche 👀 Gua-Sha-Set «Jade» – CHF 45.00 💾 Speicher dir das für später · –10% mit WELCOME10 👉 luxestyle.ch/pr…»
- Produkt: Gua-Sha-Set «Jade» · Massage-Tool & Rosehip-Öl (ACTIVE, https://luxestyle.ch/products/gua-sha-set-jade-massage-tool-rosehip-ol, SKU CJMB289246601AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 45.00, Shop CHF 34.90 («Gua-Sha-Set «Jade» · Massage-Tool & Rosehip-Öl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DbVQaq0lhRv/
- Text: «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser mit UV400 – dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxestyle.ch · Link in Bio»
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «er mit UV400 – dank Blitzversand in 1-2 Tagen bei di»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «– dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-08-14 17:00 UTC · 35 Aufrufe
- Post: https://www.instagram.com/p/DcBzNlkkTvn/
- Text: «Lueg mau das aa 😍 Statement-Ohrringe «Onyx» 👇 Wele nimmsch? Schrib’s i d Kommentär · –10% mit WELCOME10 👉 luxestyle.ch/products/statemen…»
- Produkt: Statement-Ohrringe «Onyx» · Geometrisch, Schwarz (ACTIVE, https://luxestyle.ch/products/statement-ohrringe-onyx-geometrisch-schwarz, SKU CJLX292477201AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-14 17:31 UTC gepostet: https://www.instagram.com/p/DZkySdhCGCa/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-06-14 17:31 UTC · 35 Aufrufe
- Post: https://www.instagram.com/p/DZkySdhCGCa/
- Text: «Das gibt es so kaum in der Schweiz 🇨🇭 Statement-Ohrringe «Onyx» – CHF 39.00 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME…»
- Produkt: Statement-Ohrringe «Onyx» · Geometrisch, Schwarz (ACTIVE, https://luxestyle.ch/products/statement-ohrringe-onyx-geometrisch-schwarz, SKU CJLX292477201AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 39.00, Shop CHF 29.90 («Statement-Ohrringe «Onyx» · Geometrisch, Schwarz», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbVQZSWFoni/
- Text: «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet mit RFID-Schutz begleitet dich überallhin. 🖤 Bestelle heute und geniesse Blitzve…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «heute und geniesse Blitzversand direkt aus der Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-15 23:28 UTC · 31 Aufrufe
- Post: https://www.instagram.com/p/Da1PuUCCNYa/
- Text: «Weles nimmsch – 1, 2 oder 3? 👀 Zirkonia-Kette «Stella» 💾 Spicher dr das für spöter · –10% mit WELCOME10 👉 luxestyle.ch/products/zirkonia…»
- Produkt: Zirkonia-Kette «Stella» · Kleeblatt-Anhänger, Silber-Optik (ACTIVE, https://luxestyle.ch/products/zirkonia-kette-stella-kleeblatt-anhanger-silber-optik, SKU CJLX292557401AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-17 19:00 UTC gepostet: https://www.instagram.com/p/DZsq027lBQs/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 12:07 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DbVgLAXHyd9/
- Text: «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Widerstandsstufen für maximale Flexibilität – mit Blitzversand aus der Schweiz direk…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Flexibilität – mit Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-23 02:11 UTC · 18 Aufrufe
- Post: https://www.instagram.com/p/DdnNSHEDMja/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140069977350792
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Pinterest pin · 2026-09-04 04:47 UTC · 13 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645579582500/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-07-28 09:20 UTC · 9 Aufrufe
- Post: https://www.instagram.com/p/DbVM_eOkkED/
- Text: «Sanftes Licht für müde Augen – diese dimmbare LED-Lampe mit USB-C macht Homeoffice zum Vergnügen ✨💡 Blitzversand aus der Schweiz, bequem a…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «e zum Vergnügen ✨💡 Blitzversand aus der Schweiz, be»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-01 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174639) · Zwilling: (geplant, Metricool 381174639)
- Text: «Leicht wie eine Wolke, hoch im Trend: «Cloud» in Spitzen-Mesh. ☁️ CHF 39.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 luxestyle…»
- Produkt: Plateau-Sneaker «Cloud» · Spitzen-Mesh, geschnürt (ACTIVE, https://luxestyle.ch/products/plateau-sneaker-cloud-spitzen-mesh-geschnurt, SKU CJNS292489901AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-08-01 18:01 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122126948979350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-10-01 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174639) · Zwilling: (geplant, Metricool 381174639)
- Text: «Leicht wie eine Wolke, hoch im Trend: «Cloud» in Spitzen-Mesh. ☁️ CHF 39.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 luxestyle…»
- Produkt: Plateau-Sneaker «Cloud» · Spitzen-Mesh, geschnürt (ACTIVE, https://luxestyle.ch/products/plateau-sneaker-cloud-spitzen-mesh-geschnurt, SKU CJNS292489901AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-07-09 17:00 UTC gepostet: https://www.instagram.com/p/DalGn3IoAOt/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-30 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174605) · Zwilling: (geplant, Metricool 381174605)
- Text: «Kleeblatt-Glück am Hals: «Stella» in Silber-Optik mit Zirkonia. 🍀 CHF 39.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 luxestyl…»
- Produkt: Zirkonia-Kette «Stella» · Kleeblatt-Anhänger, Silber-Optik (ACTIVE, https://luxestyle.ch/products/zirkonia-kette-stella-kleeblatt-anhanger-silber-optik, SKU CJLX292557401AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-07-27 17:28 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122125517757350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-09-30 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174605) · Zwilling: (geplant, Metricool 381174605)
- Text: «Kleeblatt-Glück am Hals: «Stella» in Silber-Optik mit Zirkonia. 🍀 CHF 39.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 luxestyl…»
- Produkt: Zirkonia-Kette «Stella» · Kleeblatt-Anhänger, Silber-Optik (ACTIVE, https://luxestyle.ch/products/zirkonia-kette-stella-kleeblatt-anhanger-silber-optik, SKU CJLX292557401AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-17 19:00 UTC gepostet: https://www.instagram.com/p/DZsq027lBQs/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-29 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174579) · Zwilling: (geplant, Metricool 381174579)
- Text: «Kapuzen-Shirt + Jogger im abgestimmten Set. «Costa» – entspannt und clean. CHF 59.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 …»
- Produkt: Herren-Set «Costa» · Kapuzen-Shirt + Jogger (ACTIVE, https://luxestyle.ch/products/herren-set-costa-kapuzen-shirt-jogger, SKU CJTW292464301AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-07-31 00:28 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122126510301350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-09-29 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174579) · Zwilling: (geplant, Metricool 381174579)
- Text: «Kapuzen-Shirt + Jogger im abgestimmten Set. «Costa» – entspannt und clean. CHF 59.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 …»
- Produkt: Herren-Set «Costa» · Kapuzen-Shirt + Jogger (ACTIVE, https://luxestyle.ch/products/herren-set-costa-kapuzen-shirt-jogger, SKU CJTW292464301AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-07-07 23:28 UTC gepostet: https://www.instagram.com/p/DagpXU7lWqF/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-28 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174538) · Zwilling: (geplant, Metricool 381174538)
- Text: «Für den grossen Auftritt: «Gala» in Violett mit Knöchelriemen. 💜 CHF 54.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe 🇨🇭 🔗 luxestyle…»
- Produkt: Stiletto-Sandalette «Gala» · Violett, Knöchelriemen (ACTIVE, https://luxestyle.ch/products/stiletto-sandalette-gala-violett-knochelriemen, SKU CJNS291823709IR) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-15 16:00 UTC gepostet: https://www.instagram.com/p/DZnMnHQlFEM/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-27 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174454) · Zwilling: (geplant, Metricool 381174454)
- Text: «Ein Detail, das den ganzen Look trägt. «Onyx» – geometrisch, schwarz, elegant. 🖤 CHF 29.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe �…»
- Produkt: Statement-Ohrringe «Onyx» · Geometrisch, Schwarz (ACTIVE, https://luxestyle.ch/products/statement-ohrringe-onyx-geometrisch-schwarz, SKU CJLX292477201AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-07-31 11:28 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122126640459350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-09-27 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174454) · Zwilling: (geplant, Metricool 381174454)
- Text: «Ein Detail, das den ganzen Look trägt. «Onyx» – geometrisch, schwarz, elegant. 🖤 CHF 29.90 · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe �…»
- Produkt: Statement-Ohrringe «Onyx» · Geometrisch, Schwarz (ACTIVE, https://luxestyle.ch/products/statement-ohrringe-onyx-geometrisch-schwarz, SKU CJLX292477201AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-14 17:31 UTC gepostet: https://www.instagram.com/p/DZkySdhCGCa/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-26 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174344) · Zwilling: (geplant, Metricool 381174344)
- Text: «Retro-Trainer in Leder-Optik, die zu allem passen. «Marco» – clean, bequem, jeden Tag. 👟 CHF 54.90 · Gratis-Versand ab CHF 50 · 30 Tage Rü…»
- Produkt: Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer (ACTIVE, https://luxestyle.ch/products/herren-sneaker-marco-leder-optik-retro-trainer, SKU CJNS292151801AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-07-29 11:28 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122125986075350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Instagram bild · 2026-09-26 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174344) · Zwilling: (geplant, Metricool 381174344)
- Text: «Retro-Trainer in Leder-Optik, die zu allem passen. «Marco» – clean, bequem, jeden Tag. 👟 CHF 54.90 · Gratis-Versand ab CHF 50 · 30 Tage Rü…»
- Produkt: Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer (ACTIVE, https://luxestyle.ch/products/herren-sneaker-marco-leder-optik-retro-trainer, SKU CJNS292151801AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-14 16:00 UTC gepostet: https://www.instagram.com/p/DZkn0zVAV0p/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-25 18:00 UTC · n/a Aufrufe · GEPLANT (PENDING (Pending))
- Post: (geplant, Metricool 381174227) · Zwilling: (geplant, Metricool 381174227)
- Text: «Dein Abend-Ritual: «Jade» Gua-Sha-Set mit Rosehip-Öl. Kühlt, strafft, entspannt – in 5 Minuten. ✨ CHF 34.90 · Gratis-Versand ab CHF 50 · 30…»
- Produkt: Gua-Sha-Set «Jade» · Massage-Tool & Rosehip-Öl (ACTIVE, https://luxestyle.ch/products/gua-sha-set-jade-massage-tool-rosehip-ol, SKU CJMB289246601AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-14 08:39 UTC gepostet: https://www.instagram.com/p/DZj1V9zEqRp/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest bild · 2026-09-24 10:34 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581245245
- Text: «Das runde Samt-Kürbis Kissen ist eine stilvolle und komfortable Ergänzung für jedes Zuhause. Mit seinem einzigartigen Design, das an ein ha…»
- **WARNUNG FORMAT:** Bild 703×703 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-23 08:26 UTC · n/a Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140138311350792 · Zwilling: https://www.instagram.com/p/Ddn4MnOlCmw/
- Text: «Verwöhne deine Haut mit dem Jade Roller Premium – für einen strahlenden, frischen Teint ✨ Doppelseitig für Gesicht und Augenpartie 💚 🔗 lu…»
- **WARNUNG FORMAT:** Bild 480×480 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-09-23 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152144/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-23 02:08 UTC · n/a Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140069977350792 · Zwilling: https://www.instagram.com/p/DdnNSHEDMja/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-03 21:20 UTC · n/a Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122135101689350792 · Zwilling: https://www.instagram.com/p/Dc1w4wMjkjZ/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

</details>

## Hinweise (gesammelt)

44 Hinweise in 38 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 80 Beiträge mit generischen Reichweiten-Hashtags (#foryou #fyp #trending #viral) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| Instagram | 2026-06-14 | 43 | DOPPEL | gleiche Warengruppe «diffuser» 0 h nach https://www.instagram.com/p/DZj2_xDkrT-/ (Raster wirkt doppelt) | https://www.instagram.com/p/DZj3GkPElk0/ |
| Instagram | 2026-07-28 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «r jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tagen bei d» | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 42 | DOPPEL | gleiche Warengruppe «uhr» 2 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 39 | DOPPEL | gleiche Warengruppe «ohrringe» 36 h nach https://www.instagram.com/reel/DbSmG3ijUtK/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbWd5w_kso0/ |
| Instagram | 2026-07-28 | 32 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e und geniesse Blitzversand direkt aus der Schweiz! ✨ 🔗 luxestyle.ch» | https://www.instagram.com/p/DbVQZSWFoni/ |
| Instagram | 2026-07-28 | 32 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ5lEFlXc/ |
| Instagram | 2026-07-28 | 25 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ibilität – mit Blitzversand aus der Schweiz direkt zu dir nach» | https://www.instagram.com/p/DbVgLAXHyd9/ |
| Instagram | 2026-07-28 | 16 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ4Z4lu5Q/ |
| Instagram | 2026-07-28 | 15 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ3F3Fseo/ |
| Pinterest | 2026-09-04 | 13 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1w4wMjkjZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582500/ |
| Instagram | 2026-07-28 | 9 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Vergnügen ✨💡 Blitzversand aus der Schweiz, bequem auf Rechnun» | https://www.instagram.com/p/DbVM_eOkkED/ |
| Instagram | 2026-09-23 | 7 | DOPPEL | gleiche Warengruppe «gesichtsroller» 6 h nach https://www.instagram.com/p/DdnNSHEDMja/ (Raster wirkt doppelt) | https://www.instagram.com/p/Ddn4MnOlCmw/ |
| Pinterest | 2026-09-04 | 7 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1zAj-GoFP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582505/ |
| Facebook | 2026-09-24 | n/a | FORMAT | Bild 883×773 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140607019350792 |
| Facebook | 2026-09-24 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140423395350792 |
| Facebook | 2026-09-24 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140352715350792 |
| Facebook | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140221003350792 |
| Facebook | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140069977350792 |
| Facebook | 2026-09-22 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122139992853350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 3/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 4/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 5/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 6/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 888×888 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 7/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122135101689350792 |
| Facebook | 2026-07-28 | n/a | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125730535350792 |
| Facebook | 2026-07-28 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125687731350792 |
| Pinterest | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581196150 |
| Pinterest | 2026-09-24 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «wertige Qualität ab Schweizer Lager. Details Marke: Wid» | https://www.pinterest.es/pin/1111333645581220663 |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581229813 |
| Instagram | 2026-09-25 | n/a | DOPPEL | gleiche Warengruppe «gesichtsroller» 64 h nach https://www.instagram.com/p/DdnNSHEDMja/ (Raster wirkt doppelt) | (geplant, Metricool 381174227) |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581268333 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581294528 |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdoSCmhkuU7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236221/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnlCi-jkth/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236070/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdpMLlyHJYD/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236067/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdpyPQLFFjb/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236068/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddoi3MMlLPX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236066/ |
| Pinterest | 2026-09-24 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddn4MnOlCmw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236064/ |
| Pinterest | 2026-09-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdmhRxtjUIZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581153922/ |
| Pinterest | 2026-09-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdnatlxD0nV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152467/ |
| Pinterest | 2026-09-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdmhalZFAvs/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152143/ |
| Pinterest | 2026-09-23 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnNSHEDMja/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152144/ |

</details>

## Facebook ohne Direktlink

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 42 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-09-23 14:39 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122140221003350792 · «Kristall-Set 3-teilig · CHF 29.90 Kleiner Schweizer Shop au…»
- 2026-09-23 08:26 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122140138311350792 · «Verwöhne deine Haut mit dem Jade Roller Premium – für einen…»
- 2026-09-23 05:39 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122140105137350792 · «EMS Mikrostrom Massagegerät · CHF 22.90 Kleiner Schweizer S…»
- 2026-09-23 02:08 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122140069977350792 · «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für na…»
- 2026-09-22 19:48 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122139992853350792 · «Verwandle dein Zuhause in eine pure Wohlfühloase mit unsere…»
- 2026-09-03 21:39 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122135105943350792 · «Von allem etwas – 8 Lieblinge aus 8 Welten 🌍 Wisch dich du…»
- 2026-09-03 21:20 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122135101689350792 · «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdich…»
- 2026-08-06 17:02 UTC · n/a Aufrufe · https://www.facebook.com/reel/1563305552100842/ · «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selb…»
- 2026-08-05 09:02 UTC · n/a Aufrufe · https://www.facebook.com/reel/2325684204502310/ · «Mach dis eigets Teil 🎨 T-Shirt, Hoodie, Täsche oder Tasse …»
- 2026-08-04 09:02 UTC · n/a Aufrufe · https://www.facebook.com/reel/1044133014890179/ · «Das isch LuxeStyle 🇨🇭 Premium-Mode, Schmuck u Beauty us d…»
- 2026-08-02 17:02 UTC · n/a Aufrufe · https://www.facebook.com/reel/1058200293322585/ · «Hoi zäme! 🇨🇭 Bi LuxeStyle git's Premium-Mode us de Schwiz…»
- 2026-07-31 17:02 UTC · n/a Aufrufe · https://www.facebook.com/reel/1077464014964104/ · «Statement-Shirt mit DYM Design 💀🌸 — du designsch, mir dru…»
- 2026-07-30 17:01 UTC · n/a Aufrufe · https://www.facebook.com/reel/1041448861959257/ · «Dis eigete Täschli 🐱 — Motiv ufladä, fertig isch dis Unika…»
- 2026-07-29 09:01 UTC · n/a Aufrufe · https://www.facebook.com/reel/1560906292437695/ · «Dini Tasse, din Spruch ☕ — sälber gestaltet, perfekts Gesch…»
- 2026-07-29 00:12 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125859139350792 · «Dein stylisher Sommer-Begleiter: Die vegane Crossbody-Bag m…»
- 2026-07-29 00:08 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125858557350792 · «Gepflegter Bart in Perfektion – mit Öl, Balsam, Bürste und …»
- 2026-07-28 23:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125850463350792 · «Sonne, See und ganz viel Platz – dein XL Strandtuch aus Bio…»
- 2026-07-28 21:55 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125836441350792 · «Stilvoll verreisen mit dem Travel-Set Premium – Reisepass-H…»
- 2026-07-28 21:06 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125830309350792 · «Drei traumhafte Ohrring-Paare, hypoallergen und sanft zu de…»
- 2026-07-28 20:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125820037350792 · «Ruhe auf Knopfdruck: Diese Bluetooth-Kopfhörer mit Active N…»
- 2026-07-28 19:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125807617350792 · «Dein Fitness-Upgrade ist da: AMOLED-Display, über 100 Sport…»
- 2026-07-28 18:19 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125784061350792 · «Zeitlos elegant und hautfreundlich – dieses Edelstahl-Armba…»
- 2026-07-28 18:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125792899350792 · «Verwöhnzeit für dich: Die Selfcare-Box mit Jade Roller, Sei…»
- 2026-07-28 16:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125770141350792 · «Dein stylishes XL-Portemonnaie aus Echtleder mit 12 Kartenf…»
- 2026-07-28 15:08 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125756107350792 · «Maritimer Style für echte Männer – dieses Lederarmband mit …»
- 2026-07-28 14:11 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125744305350792 · «Schlank, sicher und richtig edel: Unser Unisex Slim Wallet …»
- 2026-07-28 13:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125730535350792 · «Verwandle das Kinderzimmer in einen magischen Sternenhimmel…»
- 2026-07-28 12:07 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125717983350792 · «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Wide…»
- 2026-07-28 11:19 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125690011350792 · «Verwöhne deine Haut mit dem Jade Roller & Gua Sha Set für e…»
- 2026-07-28 11:09 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125704783350792 · «Zeitlos elegant am Handgelenk – Saphirglas, Edelstahl und 5…»
- 2026-07-28 10:53 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125687731350792 · «Essenszeit ohne Chaos – diese weichen Silikon-Lätzchen fang…»
- 2026-07-28 09:51 UTC · n/a Aufrufe · https://www.facebook.com/reel/1466744632141442/ · ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Liefer…»
- 2026-07-28 09:49 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125687197350792 · «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser …»
- 2026-07-28 09:49 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125687119350792 · «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet m…»
- 2026-07-28 09:19 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125676835350792 · «Sanftes Licht für müde Augen – diese dimmbare LED-Lampe mit…»
- 2026-07-28 09:17 UTC · n/a Aufrufe · https://www.facebook.com/reel/1562821878956452/ · ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» …»
- 2026-07-28 09:12 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125673679350792 · «Statement am Handgelenk 🔗 Cuban-Link-Armband, Edelstahl & …»
- 2026-07-28 09:11 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125673631350792 · «Für ihn: maritimer Style 🤎 Leder-Armband «Anker» mit Edels…»
- 2026-07-28 08:52 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125662153350792 · «Zarte Eleganz fürs Handgelenk ✨ Damenuhr «Petite» mit Perlm…»
- 2026-07-28 08:52 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125662063350792 · «Sportlich-elegant 🌊 Edelstahl-Sportuhr «Pacific» mit GMT-B…»
- 2026-07-28 08:52 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125661925350792 · «Echter Uhrmacher-Luxus ⚙️ Automatik-Skelettuhr mit offenem …»
- 2026-07-28 08:48 UTC · n/a Aufrufe · https://www.facebook.com/122102579637350792/posts/122125661085350792 · «Zeitlos am Handgelenk ⌚ Herrenuhr Edelstahl mit Saphirglas,…»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (23): https://www.instagram.com/p/DdqK05YFML3/ · https://www.instagram.com/p/Dc1zAj-GoFP/ · https://www.instagram.com/p/DbVMG4okgei/ · https://www.instagram.com/p/DbVMFlsknPT/ · https://www.instagram.com/p/DbVJ5lEFlXc/ · https://www.instagram.com/p/DbVJ4Z4lu5Q/ · https://www.instagram.com/p/DbVJ3F3Fseo/ · https://www.instagram.com/p/DbVJV_SDkIz/ · https://www.instagram.com/reel/DaxHrZODx43/ · https://www.instagram.com/p/DZj7svdktrN/ · https://www.instagram.com/p/DZicunuk5Dr/ · https://www.instagram.com/p/DZicnMck2Vc/ · https://www.instagram.com/p/DZiclNMEw26/ · https://www.instagram.com/p/DZiceA3k9fi/ · https://www.instagram.com/p/DZicbunk2o5/ · https://www.facebook.com/122102579637350792/posts/122135105943350792 · https://www.facebook.com/122102579637350792/posts/122135101689350792 · https://www.facebook.com/122102579637350792/posts/122125673679350792 · https://www.facebook.com/122102579637350792/posts/122125673631350792 · https://www.facebook.com/122102579637350792/posts/122125662153350792 · https://www.facebook.com/122102579637350792/posts/122125662063350792 · https://www.facebook.com/122102579637350792/posts/122125661925350792 · https://www.facebook.com/122102579637350792/posts/122125661085350792
- Medien nicht messbar (158): https://www.instagram.com/p/Ddr7Lk4nPix/ (Download gescheitert) · https://www.instagram.com/reel/DdrvVenEe2j/ (Download gescheitert) · https://www.instagram.com/p/DdrLJiHlH7a/ (Download gescheitert) · https://www.instagram.com/reel/Ddqcs8oCskw/ (Download gescheitert) · https://www.instagram.com/p/DdqcqhXm4wX/ (Download gescheitert) · https://www.instagram.com/p/DdqK05YFML3/ (Download gescheitert) · https://www.instagram.com/p/DdpyPQLFFjb/ (Download gescheitert) · https://www.instagram.com/p/DdpMLlyHJYD/ (Download gescheitert) · https://www.instagram.com/p/Ddoi3MMlLPX/ (Download gescheitert) · https://www.instagram.com/reel/DdoSCmhkuU7/ (Download gescheitert) · https://www.instagram.com/p/Ddn4MnOlCmw/ (Download gescheitert) · https://www.instagram.com/p/DdnlCi-jkth/ (Download gescheitert) · https://www.instagram.com/reel/DdnatlxD0nV/ (Download gescheitert) · https://www.instagram.com/p/DdnNSHEDMja/ (Download gescheitert) · https://www.instagram.com/p/DdmhalZFAvs/ (Download gescheitert) · https://www.instagram.com/reel/DdmhRxtjUIZ/ (Download gescheitert) · https://www.instagram.com/p/Dc1zAj-GoFP/ (Download gescheitert) · https://www.instagram.com/p/Dc1w4wMjkjZ/ (Download gescheitert) · https://www.instagram.com/reel/DcMSDwjFGHj/ (Download gescheitert) · https://www.instagram.com/p/DcBzNlkkTvn/ (Download gescheitert) · https://www.instagram.com/p/Db41mIWldvA/ (Download gescheitert) · https://www.instagram.com/reel/DbftCVqDqVO/ (Download gescheitert) · https://www.instagram.com/p/DbZS2rNDCPk/ (Download gescheitert) · https://www.instagram.com/p/DbWzLsdDpmX/ (Download gescheitert) · https://www.instagram.com/p/DbWyoHKEtoI/ (Download gescheitert)
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
