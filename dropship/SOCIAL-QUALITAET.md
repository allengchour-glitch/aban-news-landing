# Social-Qualität — Stand 2026-09-23 20:19 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 59 Seitenbeiträge + 0 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 4 Einträge (−30/+7 Tage) · Pinterest-Analyse: 8 Pins
- Geprüft: 171 Beiträge, 192 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF 45 Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF 7 · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)

## Zusammenfassung

**45 Fehler · 75 Warnungen · 94 Hinweise** — Fehler/Warnungen in 86 von 171 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 21 × Caption korrigieren · 5 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 15 × Caption in der App korrigieren (API kann es nicht [Q2]) · 44 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 1 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | TikTok | YouTube | Pinterest | Summe |
|---|---:|---:|---:|---:|---:|---:|
| DIREKTLINK | · | · | · | · | 2 | 2 |
| DOPPEL | 12 | · | · | · | · | 12 |
| ENGLISCH | 6 | · | · | · | · | 6 |
| FLOSKEL | 2 | 2 | · | · | 1 | 5 |
| FORMAT | 41 | 32 | · | · | 1 | 74 |
| PREIS | 9 | 1 | · | · | · | 10 |
| PRODUKT | 27 | · | · | · | · | 27 |
| TON | 5 | · | · | · | · | 5 |
| VERSAND | 31 | 42 | · | · | · | 73 |

Produkt zugeordnet: 90 von 171 Beiträgen (Ledger 20, Link 65, Titel 5).

Dazu: 43 Facebook-Beiträge ohne Direktlink (Liste unten) · 23 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 0 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

### FEHLER · Instagram reel · 2026-08-01 11:12 UTC · 83 Aufrufe
- Post: https://www.instagram.com/reel/DbftCVqDqVO/ · Zwilling: https://www.facebook.com/reel/1585736366595262/
- Text: ««Luftreiniger mit Feuchtigkeitsspender» ✨ Jetzt bei LuxeStyle — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭 🔗 l…»
- Produkt: Luftreiniger mit Feuchtigkeitsspender (ACTIVE, https://luxestyle.ch/products/luftreiniger-mit-feuchtigkeitsspender-889dfb, SKU CJ-CJXFZNZN00558-Black) — Zuordnung: Link im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJXFZNZN00558-Black, 10–20 Werktage): «e — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **FEHLER PREIS:** Lockpreis: Caption CHF 12.90, Shop CHF 15.90 («Luftreiniger mit Feuchtigkeitsspender», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-16 17:01 UTC · 79 Aufrufe
- Post: https://www.instagram.com/reel/Da3ILUnjkRu/
- Text: «Wasserfescht & edel: 1 oder 2? 👇 Welä passt zu dir? Schrib's! ↗️ Teil's mit dyre beschte Fründin · –10% WELCOME10 → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

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
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humid…» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 64.00, Shop CHF 49.90 («Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humid…», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-29 00:08 UTC · 47 Aufrufe
- Post: https://www.instagram.com/p/DbWyoHKEtoI/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125858557350792
- Text: «Gepflegter Bart in Perfektion – mit Öl, Balsam, Bürste und Schere alles in einem Set. 🧔 Blitzversand aus der Schweiz und bequem Kauf auf R…»
- Produkt: Bart-Pflegeset Premium 4-teilig · Öl, Balsam, Bürste, Schere (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-gepflegter-bart-in-perfektion-mi-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Bart-Pflegeset Premium 4-teilig · Öl, Balsam, Bürste, Schere» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-gepflegter-bart-in-perfektion-mi-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «es in einem Set. 🧔 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:50 UTC · 43 Aufrufe
- Post: https://www.instagram.com/reel/DbVQd7GinD2/ · Zwilling: https://www.facebook.com/reel/1466744632141442/
- Text: ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭»
- Produkt: Wimpernlift-Kit (ACTIVE, https://luxestyle.ch/products/wimpernlift-kit-161984, SKU CJ-CJCZ1533149-Same as Photo) — Zuordnung: Ledger cjreel-15449432981889
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJCZ1533149-Same as P, 10–20 Werktage): «e — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Video: the, keep, from, natural, make, are  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-14 08:54 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/DZj3GkPElk0/
- Text: «Dein Zuhause = Spa 🌿 Smart Diffuser XXL · Bluetooth + App, deckt 200m² – CHF 154 💾 Speicher dir das · 👇 Welcher Duft wär deiner? · –10% …»
- Produkt: Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Räume (DRAFT, nicht im Onlineshop) — Zuordnung: Link im Text
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Rä…» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 154.00, Shop CHF 119.90 («Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Rä…», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:17 UTC · 42 Aufrufe
- Post: https://www.instagram.com/reel/DbVMo7IDmbK/ · Zwilling: https://www.facebook.com/reel/1562821878956452/
- Text: ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» ✨ Jetzt bei LuxeStyle — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code …»
- Produkt: Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend (ACTIVE, https://luxestyle.ch/products/kurbis-strichburste-fur-hunde-katzen-selbstrei-066368, SKU CJ-CJMY1547493-Pumpkin) — Zuordnung: Ledger cjreel-15449432916353
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJMY1547493-Pumpkin, 10–20 Werktage): «e — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 18:07 UTC · 41 Aufrufe
- Post: https://www.instagram.com/p/DbWJX_tD8cG/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125792899350792
- Text: «Verwöhnzeit für dich: Die Selfcare-Box mit Jade Roller, Seiden-Kissenbezug und Duftkerzen bringt Wellness direkt nach Hause. 💆‍♀️✨ Dank Bl…»
- Produkt: Selfcare-Box Wellness – Jade Roller + Seiden-Kissenbezug + Duftkerzen (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-verw-hnzeit-f-r-dich-die-selfcar-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Selfcare-Box Wellness – Jade Roller + Seiden-Kissenbezug + …» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-verw-hnzeit-f-r-dich-die-selfcar-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Hause. 💆‍♀️✨ Dank Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-27 09:02 UTC · 41 Aufrufe
- Post: https://www.instagram.com/reel/DbSmG3ijUtK/
- Text: «Welä Ohrring nimmsch — 1 oder 2? 👇 Schrib's i d Kommentär! 📌 Speicher der's · –10% mit WELCOME10 → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 16:07 UTC · 40 Aufrufe
- Post: https://www.instagram.com/p/DbV7nAODtnB/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125770141350792
- Text: «Dein stylishes XL-Portemonnaie aus Echtleder mit 12 Kartenfächern und RFID-Schutz – Ordnung trifft Eleganz! 🖤 Blitzversand aus der Schweiz…»
- Produkt: Damen Portemonnaie XL Echtleder · 12 Kartenfächer & RFID (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-dein-stylishes-xl-portemonnaie-a-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Damen Portemonnaie XL Echtleder · 12 Kartenfächer & RFID» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-stylishes-xl-portemonnaie-a-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «trifft Eleganz! 🖤 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 21:07 UTC · 39 Aufrufe
- Post: https://www.instagram.com/p/DbWd5w_kso0/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125830309350792
- Text: «Drei traumhafte Ohrring-Paare, hypoallergen und sanft zu deinen Ohren ✨ Dank Blitzversand aus der Schweiz funkeln sie schon bald an dir – b…»
- Produkt: Damen Ohrring-Set 3 Paare · Edelstahl 925, Hypoallergen (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-drei-traumhafte-ohrring-paare-hy-15
- (+ 2 Hinweise, siehe Hinweis-Liste)
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
- Post: https://www.instagram.com/p/DbV02viDIZT/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125756107350792
- Text: «Maritimer Style für echte Männer – dieses Lederarmband mit Edelstahl-Anker setzt ein starkes Statement. ⚓ Dank Blitzversand aus der Schweiz…»
- Produkt: Herren Lederarmband Edelstahl-Anker · Premium Maritime Style (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-maritimer-style-f-r-echte-m-nner-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
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
- Post: https://www.instagram.com/p/DbWXJFgEqOw/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125820037350792
- Text: «Ruhe auf Knopfdruck: Diese Bluetooth-Kopfhörer mit Active Noise Cancellation begleiten dich bis zu 40 Stunden. 🎧 Blitzversand aus der Schw…»
- Produkt: Bluetooth Kopfhörer ANC · Active Noise Cancellation, 40h Akku (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-ruhe-auf-knopfdruck-diese-blueto-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
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
- Post: https://www.instagram.com/p/DbWQMHCFG28/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125807617350792
- Text: «Dein Fitness-Upgrade ist da: AMOLED-Display, über 100 Sportmodi und 7 Tage Akkulaufzeit! ⌚ Blitzversand aus der Schweiz und bequem Kauf auf…»
- Produkt: Smartwatch Pro AMOLED · Herzfrequenz, 100+ Sportmodi, 7 Tage Akku (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-dein-fitness-upgrade-ist-da-amol-15
- **FEHLER PRODUKT:** Beworbenes Produkt «Smartwatch Pro AMOLED · Herzfrequenz, 100+ Sportmodi, 7 Tag…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-fitness-upgrade-ist-da-amol-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «age Akkulaufzeit! ⌚ Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild: the, this, with, for, and  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 14:11 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbVuTmFkkec/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125744305350792
- Text: «Schlank, sicher und richtig edel: Unser Unisex Slim Wallet aus Echtleder schützt dank RFID-Blocker deine Karten – in 7 Farben für Sie und I…»
- Produkt: Unisex Slim Wallet RFID · 7 Farben Echtleder für Sie und Ihn (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-schlank-sicher-und-richtig-edel--15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Unisex Slim Wallet RFID · 7 Farben Echtleder für Sie und Ihn» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-schlank-sicher-und-richtig-edel--15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «für Sie und Ihn. 🖤 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:43 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DZicnMck2Vc/
- Text: «Solar-Windspiel «Libelle» 🪻 Farbwechsel-LED, wetterfest (2er-Set) – CHF 44.90 Stimmungsvolle Deko für Garten & Balkon, ganz ohne Strom. 🇨…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «nz ohne Strom. 🇨🇭 Gratis-Versand ab CHF 65 👉 luxestyle.ch» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild: waterproof, gift, color, changing  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

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
- Post: https://www.instagram.com/p/DbWzLsdDpmX/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125859139350792
- Text: «Dein stylisher Sommer-Begleiter: Die vegane Crossbody-Bag mit praktischem Smartphone-Fach! ☀️👜 Blitzversand aus der Schweiz und Kauf auf R…»
- Produkt: Crossbody-Bag Vegan · Sommer-Tasche mit Smartphone-Fach (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-dein-stylisher-sommer-begleiter--15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Crossbody-Bag Vegan · Sommer-Tasche mit Smartphone-Fach» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-dein-stylisher-sommer-begleiter--15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «artphone-Fach! ☀️👜 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 23:07 UTC · 28 Aufrufe
- Post: https://www.instagram.com/p/DbWrtD9jSC2/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125850463350792
- Text: «Sonne, See und ganz viel Platz – dein XL Strandtuch aus Bio-Baumwolle bleibt dank sandfreiem Stoff angenehm sauber. ☀️ Dank Blitzversand au…»
- Produkt: XL Strandtuch Bio-Baumwolle 180x100cm · Sandfrei, mit Tragebeutel (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-sonne-see-und-ganz-viel-platz-de-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «XL Strandtuch Bio-Baumwolle 180x100cm · Sandfrei, mit Trage…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-sonne-see-und-ganz-viel-platz-de-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ehm sauber. ☀️ Dank Blitzversand aus der Schweiz bis»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-14 08:55 UTC · 28 Aufrufe
- Post: https://www.instagram.com/p/DZj3JToEh9u/
- Text: «Sternenhimmel im Schlafzimmer 🌌 Galaxy-Projektor mit Musik & Fernbedienung – CHF 52 💾 Merk dir das für den nächsten Cozy-Abend · 👇 Nacht…»
- Produkt: Sternenhimmel Projektor · Baby Nachtlicht mit Musik (DRAFT, nicht im Onlineshop, SKU PROJ-PANDA-001) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
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

### FEHLER · Instagram bild · 2026-06-18 17:00 UTC · 24 Aufrufe
- Post: https://www.instagram.com/p/DZvB59tmFt3/
- Text: «Wusste nicht, dass ich das brauche 👀 Stroh-Shopper «Capri» 👇 Markier öpper, wo das bruucht · –10% mit WELCOME10 👉 luxestyle.ch/products/…»
- Produkt: Stroh-Shopper «Capri» · Geflochtene Schultertasche (DRAFT, nicht im Onlineshop, SKU cj-bag-capri) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Stroh-Shopper «Capri» · Geflochtene Schultertasche» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-07-10 15:36 UTC · 23 Aufrufe
- Post: https://www.instagram.com/reel/DanhubhjvrJ/
- Text: «LuxeStyle in 43 Sekunden ✨ Mode, Schmuck, Sonnenbrillen & mehr — alles aus einem Schweizer Shop. Code WELCOME10 = -10% → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:42 UTC · 21 Aufrufe
- Post: https://www.instagram.com/p/DZiceA3k9fi/
- Text: «Holz-Lesezähler «Leseheld» 🦊 Montessori-Tier-Tracker – CHF 14.90 Motiviert Kinder zum Lesen, nachhaltig aus Holz. 🇨🇭 Gratis-Versand ab C…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «ltig aus Holz. 🇨🇭 Gratis-Versand ab CHF 65 👉 luxestyle.ch» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-28 21:55 UTC · 19 Aufrufe
- Post: https://www.instagram.com/p/DbWjcLymW6l/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125836441350792
- Text: «Stilvoll verreisen mit dem Travel-Set Premium – Reisepass-Hülle, Kartenetui und Toilettentasche in einem! ✈️ Mit Blitzversand aus der Schwe…»
- Produkt: Travel-Set Premium · Reisepass-Hülle + Kartenetui + Toilettentasche (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-stilvoll-verreisen-mit-dem-trave-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Travel-Set Premium · Reisepass-Hülle + Kartenetui + Toilett…» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-stilvoll-verreisen-mit-dem-trave-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «he in einem! ✈️ Mit Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-07-24 23:28 UTC · 13 Aufrufe
- Post: https://www.instagram.com/p/DbMa4apjNFY/
- Text: «Stopp — das musst du sehen ✋ Crossbody «Lido» 💾 Spicher dr das für spöter · –10% mit WELCOME10 👉 luxestyle.ch/products/crossbody-tasche-l…»
- Produkt: Crossbody-Tasche «Lido» · Gewebte Colorblock Bag (DRAFT, nicht im Onlineshop, SKU cj-bag-lido) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Crossbody-Tasche «Lido» · Gewebte Colorblock Bag» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-07-28 17:08 UTC · 12 Aufrufe
- Post: https://www.instagram.com/p/DbWCiqijoyV/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125784061350792
- Text: «Zeitlos elegant und hautfreundlich – dieses Edelstahl-Armband passt zu jedem Look ✨ Blitzversand aus der Schweiz & Kauf auf Rechnung machen…»
- Produkt: Damen-Armband Edelstahl · Minimalistisch & Hypoallergen (DRAFT, nicht im Onlineshop) — Zuordnung: Ledger kimi-zeitlos-elegant-und-hautfreundli-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Damen-Armband Edelstahl · Minimalistisch & Hypoallergen» ist DRAFT, nicht im Onlineshop (Zuordnung: Ledger kimi-zeitlos-elegant-und-hautfreundli-15)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «sst zu jedem Look ✨ Blitzversand aus der Schweiz & K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Facebook reel · 2026-08-01 11:13 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1585736366595262/ · Zwilling: https://www.instagram.com/reel/DbftCVqDqVO/
- Text: ««Luftreiniger mit Feuchtigkeitsspender» ✨ Jetzt bei LuxeStyle — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭 🔗 l…»
- Produkt: Luftreiniger mit Feuchtigkeitsspender (ACTIVE, https://luxestyle.ch/products/luftreiniger-mit-feuchtigkeitsspender-889dfb, SKU CJ-CJXFZNZN00558-Black) — Zuordnung: Link im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJXFZNZN00558-Black, 10–20 Werktage): «e — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **FEHLER PREIS:** Lockpreis: Caption CHF 12.90, Shop CHF 15.90 («Luftreiniger mit Feuchtigkeitsspender», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-08-06 17:02 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1563305552100842/
- Text: «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selbst-gestalten — alles us eim Schwiizer Shop. 💾 Spicher's · gratis Versand ab CHF…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «hop. 💾 Spicher's · gratis Versand ab CHF 65 · –10% WELCOME10 →» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-07-30 10:12 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/2179163992934147/
- Text: ««HD-Lace Haarperücke aus echtem Haar» ✨ Jetzt bei LuxeStyle — CHF 140.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭 🔗 lu…»
- Produkt: HD-Lace Haarperücke aus echtem Haar (ACTIVE, https://luxestyle.ch/products/hd-lace-haarperucke-aus-echtem-haar-252352, SKU CJ-CJZR166097115OL) — Zuordnung: Link im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJZR166097115OL, 10–20 Werktage): «— CHF 140.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-07-28 09:51 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1466744632141442/ · Zwilling: https://www.instagram.com/reel/DbVQd7GinD2/
- Text: ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭»
- Produkt: Wimpernlift-Kit (ACTIVE, https://luxestyle.ch/products/wimpernlift-kit-161984, SKU CJ-CJCZ1533149-Same as Photo) — Zuordnung: «Name» im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJCZ1533149-Same as P, 10–20 Werktage): «e — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-07-28 09:17 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1562821878956452/ · Zwilling: https://www.instagram.com/reel/DbVMo7IDmbK/
- Text: ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» ✨ Jetzt bei LuxeStyle — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code …»
- Produkt: Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend (ACTIVE, https://luxestyle.ch/products/kurbis-strichburste-fur-hunde-katzen-selbstrei-066368, SKU CJ-CJMY1547493-Pumpkin) — Zuordnung: «Name» im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJMY1547493-Pumpkin, 10–20 Werktage): «e — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Video 360×640 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

<details><summary>43 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · Instagram reel · 2026-06-12 11:25 UTC · 61 Aufrufe
- Post: https://www.instagram.com/reel/DZe-yKMt4Cq/
- Text: «LuxeStyle 🇨🇭 dein Schweizer Online-Shop — Mode, Schmuck, Beauty & dein eigenes Design ✨ −10% mit WELCOME10 · 🔗 Link in Bio selbstgestalt…»
- **WARNUNG TON:** übersteuert: True Peak +1.1 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-03 21:20 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Dc1w4wMjkjZ/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122135101689350792
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- Produkt: Outdoor Bluetooth Speaker Solar – RGB-Licht, Wasserdicht & Tragbar (ACTIVE, https://luxestyle.ch/products/outdoor-bluetooth-speaker-solar-rgb-licht-wasserdicht-tragbar, SKU CJ-CJYS260671001AZ) — Zuordnung: Ledger kimi-dein-sound-f-r-jedes-abenteuer-s-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-18 11:28 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Da7rtpFCKEO/
- Text: «Weles nimmsch – 1, 2 oder 3? 👀 Herren-Sneaker «Marco» 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME10 👉 luxestyle.ch/prod…»
- Produkt: Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer (ACTIVE, https://luxestyle.ch/products/herren-sneaker-marco-leder-optik-retro-trainer, SKU CJNS292151801AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-14 16:00 UTC gepostet: https://www.instagram.com/p/DZkn0zVAV0p/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 11:09 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DbVZgK_kv1U/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125704783350792
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
- **WARNUNG FORMAT:** Bild 719×699 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-06-14 16:00 UTC · 40 Aufrufe
- Post: https://www.instagram.com/p/DZkn0zVAV0p/
- Text: «Stopp — das musst du sehen ✋ Herren-Sneaker «Marco» – CHF 71.00 👇 Markier jemanden, der das braucht · –10% mit WELCOME10 👉 luxestyle.ch/p…»
- Produkt: Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer (ACTIVE, https://luxestyle.ch/products/herren-sneaker-marco-leder-optik-retro-trainer, SKU CJNS292151801AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 71.00, Shop CHF 54.90 («Herren-Sneaker «Marco» · Leder-Optik, Retro-Trainer», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-06-14 08:39 UTC · 39 Aufrufe
- Post: https://www.instagram.com/p/DZj1V9zEqRp/
- Text: «Wusste nicht, dass ich das brauche 👀 Gua-Sha-Set «Jade» – CHF 45.00 💾 Speicher dir das für später · –10% mit WELCOME10 👉 luxestyle.ch/pr…»
- Produkt: Gua-Sha-Set «Jade» · Massage-Tool & Rosehip-Öl (ACTIVE, https://luxestyle.ch/products/gua-sha-set-jade-massage-tool-rosehip-ol, SKU CJMB289246601AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 45.00, Shop CHF 34.90 («Gua-Sha-Set «Jade» · Massage-Tool & Rosehip-Öl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DbVQaq0lhRv/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125687197350792
- Text: «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser mit UV400 – dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxestyle.ch · Link in Bio»
- (+ 1 Hinweis, siehe Hinweis-Liste)
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

### WARNUNG · Instagram reel · 2026-06-18 20:15 UTC · 35 Aufrufe
- Post: https://www.instagram.com/reel/DZvYKRdDI7O/
- Text: «Dini neue Lieblingsstück us LuxeStyle ✨ Blazer, Sneaker, Sonnebrille & meh – mit Code WELCOME10 grad –10%. 👉 luxestyle.ch 🇨🇭»
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-06-14 17:31 UTC · 35 Aufrufe
- Post: https://www.instagram.com/p/DZkySdhCGCa/
- Text: «Das gibt es so kaum in der Schweiz 🇨🇭 Statement-Ohrringe «Onyx» – CHF 39.00 👇 Würdest du? Schreib’s in die Kommentare · –10% mit WELCOME…»
- Produkt: Statement-Ohrringe «Onyx» · Geometrisch, Schwarz (ACTIVE, https://luxestyle.ch/products/statement-ohrringe-onyx-geometrisch-schwarz, SKU CJLX292477201AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 39.00, Shop CHF 29.90 («Statement-Ohrringe «Onyx» · Geometrisch, Schwarz», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbVQZSWFoni/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125687119350792
- Text: «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet mit RFID-Schutz begleitet dich überallhin. 🖤 Bestelle heute und geniesse Blitzve…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «heute und geniesse Blitzversand direkt aus der Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-15 23:28 UTC · 31 Aufrufe
- Post: https://www.instagram.com/p/Da1PuUCCNYa/
- Text: «Weles nimmsch – 1, 2 oder 3? 👀 Zirkonia-Kette «Stella» 💾 Spicher dr das für spöter · –10% mit WELCOME10 👉 luxestyle.ch/products/zirkonia…»
- Produkt: Zirkonia-Kette «Stella» · Kleeblatt-Anhänger, Silber-Optik (ACTIVE, https://luxestyle.ch/products/zirkonia-kette-stella-kleeblatt-anhanger-silber-optik, SKU CJLX292557401AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-11 12:07 UTC gepostet: https://www.instagram.com/p/DZcexeCFkyf/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 12:07 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DbVgLAXHyd9/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125717983350792
- Text: «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Widerstandsstufen für maximale Flexibilität – mit Blitzversand aus der Schweiz direk…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Flexibilität – mit Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-08-18 18:42 UTC · 24 Aufrufe
- Post: https://www.instagram.com/reel/DcMSDwjFGHj/
- Text: ««Kerzenlicht-Aromadiffuser» ✨ Jetzt bei LuxeStyle — CHF 14.90. Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT · −10% mit Code…»
- Produkt: Kerzenlicht-Aromadiffuser (ACTIVE, https://luxestyle.ch/products/kerzenlicht-aromadiffuser-412288, SKU CJ-CJJT154827201AZ) — Zuordnung: Link im Text
- **WARNUNG TON:** übersteuert: True Peak +0.7 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-06-17 19:00 UTC · 23 Aufrufe
- Post: https://www.instagram.com/p/DZsq027lBQs/
- Text: «Genau das hesch gsuecht, gäu? 🙌 Zirkonia-Kette «Stella» – CHF 39.90 👇 Wele nimmsch? Schrib’s i d Kommentär · –10% mit WELCOME10 👉 luxest…»
- Produkt: Zirkonia-Kette «Stella» · Kleeblatt-Anhänger, Silber-Optik (ACTIVE, https://luxestyle.ch/products/zirkonia-kette-stella-kleeblatt-anhanger-silber-optik, SKU CJLX292557401AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-11 12:07 UTC gepostet: https://www.instagram.com/p/DZcexeCFkyf/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-22 19:48 UTC · 19 Aufrufe
- Post: https://www.instagram.com/p/DdmhalZFAvs/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122139992853350792
- Text: «Verwandle dein Zuhause in eine pure Wohlfühloase mit unserem Premium Bambus Aroma Diffuser ✨ Mit Kauf auf Rechnung mit Klarna war Relaxen n…»
- Produkt: Premium Bambus Aroma Diffuser 300ml (ACTIVE, https://luxestyle.ch/products/premium-bambus-aroma-diffuser-300ml, SKU LX-11-PREMIUM-BAMBUS-AROMA-D) — Zuordnung: Ledger kimi-verwandle-dein-zuhause-in-eine-p-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild: color, change  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-23 02:11 UTC · 18 Aufrufe
- Post: https://www.instagram.com/p/DdnNSHEDMja/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140069977350792
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Pinterest pin · 2026-09-04 04:47 UTC · 12 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645579582500/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-07-28 09:20 UTC · 9 Aufrufe
- Post: https://www.instagram.com/p/DbVM_eOkkED/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122125676835350792
- Text: «Sanftes Licht für müde Augen – diese dimmbare LED-Lampe mit USB-C macht Homeoffice zum Vergnügen ✨💡 Blitzversand aus der Schweiz, bequem a…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «e zum Vergnügen ✨💡 Blitzversand aus der Schweiz, be»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild: with, the, light  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-23 08:26 UTC · 6 Aufrufe
- Post: https://www.instagram.com/p/Ddn4MnOlCmw/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140138311350792
- Text: «Verwöhne deine Haut mit dem Jade Roller Premium – für einen strahlenden, frischen Teint ✨ Doppelseitig für Gesicht und Augenpartie 💚 🔗 lu…»
- Produkt: Jade Roller Premium Doppelseitig (ACTIVE, https://luxestyle.ch/products/jade-roller-premium-doppelseitig, SKU LX-22-JADE-ROLLER-PREMIUM-DO) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-jade-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FORMAT:** Bild 480×480 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild: made, from, natural, stone, our, are  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-23 08:26 UTC · 4 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140138311350792 · Zwilling: https://www.instagram.com/p/Ddn4MnOlCmw/
- Text: «Verwöhne deine Haut mit dem Jade Roller Premium – für einen strahlenden, frischen Teint ✨ Doppelseitig für Gesicht und Augenpartie 💚 🔗 lu…»
- **WARNUNG FORMAT:** Bild 480×480 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook bild · 2026-09-23 02:08 UTC · 4 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140069977350792 · Zwilling: https://www.instagram.com/p/DdnNSHEDMja/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-03 21:20 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122135101689350792 · Zwilling: https://www.instagram.com/p/Dc1w4wMjkjZ/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-29 00:12 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125859139350792 · Zwilling: https://www.instagram.com/p/DbWzLsdDpmX/
- Text: «Dein stylisher Sommer-Begleiter: Die vegane Crossbody-Bag mit praktischem Smartphone-Fach! ☀️👜 Blitzversand aus der Schweiz und Kauf auf R…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «artphone-Fach! ☀️👜 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-29 00:08 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125858557350792 · Zwilling: https://www.instagram.com/p/DbWyoHKEtoI/
- Text: «Gepflegter Bart in Perfektion – mit Öl, Balsam, Bürste und Schere alles in einem Set. 🧔 Blitzversand aus der Schweiz und bequem Kauf auf R…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «es in einem Set. 🧔 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 23:07 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125850463350792 · Zwilling: https://www.instagram.com/p/DbWrtD9jSC2/
- Text: «Sonne, See und ganz viel Platz – dein XL Strandtuch aus Bio-Baumwolle bleibt dank sandfreiem Stoff angenehm sauber. ☀️ Dank Blitzversand au…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ehm sauber. ☀️ Dank Blitzversand aus der Schweiz bis»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 21:55 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125836441350792 · Zwilling: https://www.instagram.com/p/DbWjcLymW6l/
- Text: «Stilvoll verreisen mit dem Travel-Set Premium – Reisepass-Hülle, Kartenetui und Toilettentasche in einem! ✈️ Mit Blitzversand aus der Schwe…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «he in einem! ✈️ Mit Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 21:06 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125830309350792 · Zwilling: https://www.instagram.com/p/DbWd5w_kso0/
- Text: «Drei traumhafte Ohrring-Paare, hypoallergen und sanft zu deinen Ohren ✨ Dank Blitzversand aus der Schweiz funkeln sie schon bald an dir – b…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «deinen Ohren ✨ Dank Blitzversand aus der Schweiz fun»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 20:07 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125820037350792 · Zwilling: https://www.instagram.com/p/DbWXJFgEqOw/
- Text: «Ruhe auf Knopfdruck: Diese Bluetooth-Kopfhörer mit Active Noise Cancellation begleiten dich bis zu 40 Stunden. 🎧 Blitzversand aus der Schw…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «s zu 40 Stunden. 🎧 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 19:07 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125807617350792 · Zwilling: https://www.instagram.com/p/DbWQMHCFG28/
- Text: «Dein Fitness-Upgrade ist da: AMOLED-Display, über 100 Sportmodi und 7 Tage Akkulaufzeit! ⌚ Blitzversand aus der Schweiz und bequem Kauf auf…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «age Akkulaufzeit! ⌚ Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 18:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125784061350792 · Zwilling: https://www.instagram.com/p/DbWCiqijoyV/
- Text: «Zeitlos elegant und hautfreundlich – dieses Edelstahl-Armband passt zu jedem Look ✨ Blitzversand aus der Schweiz & Kauf auf Rechnung machen…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «sst zu jedem Look ✨ Blitzversand aus der Schweiz & K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 18:07 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125792899350792 · Zwilling: https://www.instagram.com/p/DbWJX_tD8cG/
- Text: «Verwöhnzeit für dich: Die Selfcare-Box mit Jade Roller, Seiden-Kissenbezug und Duftkerzen bringt Wellness direkt nach Hause. 💆‍♀️✨ Dank Bl…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Hause. 💆‍♀️✨ Dank Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 16:07 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125770141350792 · Zwilling: https://www.instagram.com/p/DbV7nAODtnB/
- Text: «Dein stylishes XL-Portemonnaie aus Echtleder mit 12 Kartenfächern und RFID-Schutz – Ordnung trifft Eleganz! 🖤 Blitzversand aus der Schweiz…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «trifft Eleganz! 🖤 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 15:08 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125756107350792 · Zwilling: https://www.instagram.com/p/DbV02viDIZT/
- Text: «Maritimer Style für echte Männer – dieses Lederarmband mit Edelstahl-Anker setzt ein starkes Statement. ⚓ Dank Blitzversand aus der Schweiz…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «s Statement. ⚓ Dank Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 14:11 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125744305350792 · Zwilling: https://www.instagram.com/p/DbVuTmFkkec/
- Text: «Schlank, sicher und richtig edel: Unser Unisex Slim Wallet aus Echtleder schützt dank RFID-Blocker deine Karten – in 7 Farben für Sie und I…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «für Sie und Ihn. 🖤 Blitzversand aus der Schweiz und»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 12:07 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125717983350792 · Zwilling: https://www.instagram.com/p/DbVgLAXHyd9/
- Text: «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Widerstandsstufen für maximale Flexibilität – mit Blitzversand aus der Schweiz direk…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Flexibilität – mit Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 11:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125690011350792
- Text: «Verwöhne deine Haut mit dem Jade Roller & Gua Sha Set für ein natürliches Facelift ✨ Blitzversand aus der Schweiz direkt zu dir nach Hause …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ürliches Facelift ✨ Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 11:09 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125704783350792 · Zwilling: https://www.instagram.com/p/DbVZgK_kv1U/
- Text: «Zeitlos elegant am Handgelenk – Saphirglas, Edelstahl und 50 m Wasserdichtigkeit für jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tage…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «it für jeden Tag. ⌚ Blitzversand aus der Schweiz: in»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «nd aus der Schweiz: in 1–2 Tagen bei dir. 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 09:49 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125687197350792 · Zwilling: https://www.instagram.com/p/DbVQaq0lhRv/
- Text: «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser mit UV400 – dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxestyle.ch · Link in Bio»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «er mit UV400 – dank Blitzversand in 1-2 Tagen bei di»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «– dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 09:49 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125687119350792 · Zwilling: https://www.instagram.com/p/DbVQZSWFoni/
- Text: «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet mit RFID-Schutz begleitet dich überallhin. 🖤 Bestelle heute und geniesse Blitzve…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «heute und geniesse Blitzversand direkt aus der Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-07-28 09:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122125676835350792 · Zwilling: https://www.instagram.com/p/DbVM_eOkkED/
- Text: «Sanftes Licht für müde Augen – diese dimmbare LED-Lampe mit USB-C macht Homeoffice zum Vergnügen ✨💡 Blitzversand aus der Schweiz, bequem a…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «e zum Vergnügen ✨💡 Blitzversand aus der Schweiz, be»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

</details>

## Hinweise (gesammelt)

94 Hinweise in 65 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 75 Beiträge mit generischen Reichweiten-Hashtags (#foryou #trending #viral #fyp) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| Instagram | 2026-06-14 | 49 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZj2_xDkrT-/ |
| Instagram | 2026-07-29 | 47 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbWyoHKEtoI/ |
| Instagram | 2026-09-03 | 43 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Dc1w4wMjkjZ/ |
| Instagram | 2026-06-14 | 43 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DZj3GkPElk0/ |
| Instagram | 2026-06-14 | 43 | DOPPEL | gleiche Warengruppe «diffuser» 0 h nach https://www.instagram.com/p/DZj2_xDkrT-/ (Raster wirkt doppelt) | https://www.instagram.com/p/DZj3GkPElk0/ |
| Instagram | 2026-07-28 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «r jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tagen bei d» | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 42 | DOPPEL | gleiche Warengruppe «uhr» 2 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 41 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DbWJX_tD8cG/ |
| Instagram | 2026-07-28 | 40 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbV7nAODtnB/ |
| Instagram | 2026-06-14 | 40 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZkn0zVAV0p/ |
| Instagram | 2026-07-28 | 39 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbWd5w_kso0/ |
| Instagram | 2026-07-28 | 39 | DOPPEL | gleiche Warengruppe «ohrringe» 36 h nach https://www.instagram.com/reel/DbSmG3ijUtK/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbWd5w_kso0/ |
| Instagram | 2026-06-14 | 39 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZj1V9zEqRp/ |
| Instagram | 2026-07-28 | 38 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DbV02viDIZT/ |
| Instagram | 2026-07-28 | 36 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DbWXJFgEqOw/ |
| Instagram | 2026-07-28 | 36 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVQaq0lhRv/ |
| Instagram | 2026-06-14 | 36 | FORMAT | Bild 1024×1024 — Breite unter 1080 | https://www.instagram.com/p/DZj7svdktrN/ |
| Instagram | 2026-06-14 | 35 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZkySdhCGCa/ |
| Instagram | 2026-06-13 | 35 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZiclNMEw26/ |
| Instagram | 2026-07-28 | 32 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DbVuTmFkkec/ |
| Instagram | 2026-07-28 | 32 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e und geniesse Blitzversand direkt aus der Schweiz! ✨ 🔗 luxestyle.ch» | https://www.instagram.com/p/DbVQZSWFoni/ |
| Instagram | 2026-07-28 | 32 | FORMAT | Bild 1024×1024 — Breite unter 1080 | https://www.instagram.com/p/DbVQZSWFoni/ |
| Instagram | 2026-07-28 | 32 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ5lEFlXc/ |
| Instagram | 2026-06-13 | 30 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZicbunk2o5/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 1000×1000 — Breite unter 1080 (Medium 1/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 3/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 4/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 5/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 1024×1024 — Breite unter 1080 (Medium 6/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 7/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-07-29 | 28 | FORMAT | Bild 720×960 — Breite unter 1080 | https://www.instagram.com/p/DbWzLsdDpmX/ |
| Instagram | 2026-07-28 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbWrtD9jSC2/ |
| Instagram | 2026-06-14 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZj3JToEh9u/ |
| Instagram | 2026-07-28 | 25 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVnEXyDsG-/ |
| Instagram | 2026-07-28 | 25 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ibilität – mit Blitzversand aus der Schweiz direkt zu dir nach» | https://www.instagram.com/p/DbVgLAXHyd9/ |
| Instagram | 2026-07-28 | 25 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVgLAXHyd9/ |
| Instagram | 2026-06-17 | 23 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DZsq027lBQs/ |
| Instagram | 2026-09-22 | 19 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DdmhalZFAvs/ |
| Instagram | 2026-07-28 | 19 | FORMAT | Bild 950×950 — Breite unter 1080 | https://www.instagram.com/p/DbWjcLymW6l/ |
| Instagram | 2026-09-23 | 18 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DdnNSHEDMja/ |
| Instagram | 2026-07-28 | 16 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ4Z4lu5Q/ |
| Instagram | 2026-07-28 | 15 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ3F3Fseo/ |
| Instagram | 2026-09-23 | 12 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddoi3MMlLPX/ |
| Instagram | 2026-07-28 | 12 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbWCiqijoyV/ |
| Pinterest | 2026-09-04 | 12 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1w4wMjkjZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582500/ |
| Instagram | 2026-07-28 | 11 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVQ15-kqMv/ |
| Instagram | 2026-07-28 | 9 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Vergnügen ✨💡 Blitzversand aus der Schweiz, bequem auf Rechnun» | https://www.instagram.com/p/DbVM_eOkkED/ |
| Pinterest | 2026-09-04 | 7 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1zAj-GoFP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582505/ |
| Instagram | 2026-09-23 | 6 | DOPPEL | gleiche Warengruppe «gesichtsroller» 6 h nach https://www.instagram.com/p/DdnNSHEDMja/ (Raster wirkt doppelt) | https://www.instagram.com/p/Ddn4MnOlCmw/ |
| Facebook | 2026-09-23 | 4 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140069977350792 |
| Facebook | 2026-09-22 | 4 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122139992853350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 3/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 4/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 5/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 6/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 888×888 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 7/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-23 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140221003350792 |
| Facebook | 2026-09-03 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122135101689350792 |
| Facebook | 2026-07-29 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «one-Fach! ☀️👜 Blitzversand aus der Schweiz und Kauf auf Rechnu» | https://www.facebook.com/122102579637350792/posts/122125859139350792 |
| Facebook | 2026-07-29 | 0 | FORMAT | Bild 750×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125859139350792 |
| Facebook | 2026-07-29 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «einem Set. 🧔 Blitzversand aus der Schweiz und bequem Kauf auf» | https://www.facebook.com/122102579637350792/posts/122125858557350792 |
| Facebook | 2026-07-29 | 0 | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125858557350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «auber. ☀️ Dank Blitzversand aus der Schweiz bist du morgen scho» | https://www.facebook.com/122102579637350792/posts/122125850463350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125850463350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «einem! ✈️ Mit Blitzversand aus der Schweiz und Kauf auf Rechnu» | https://www.facebook.com/122102579637350792/posts/122125836441350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 950×950 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125836441350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «n Ohren ✨ Dank Blitzversand aus der Schweiz funkeln sie schon b» | https://www.facebook.com/122102579637350792/posts/122125830309350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125830309350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «40 Stunden. 🎧 Blitzversand aus der Schweiz und bequem Kauf auf» | https://www.facebook.com/122102579637350792/posts/122125820037350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125820037350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «kkulaufzeit! ⌚ Blitzversand aus der Schweiz und bequem Kauf auf» | https://www.facebook.com/122102579637350792/posts/122125807617350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «u jedem Look ✨ Blitzversand aus der Schweiz & Kauf auf Rechnung» | https://www.facebook.com/122102579637350792/posts/122125784061350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125784061350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e. 💆‍♀️✨ Dank Blitzversand aus der Schweiz und Kauf auf Rechnu» | https://www.facebook.com/122102579637350792/posts/122125792899350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125792899350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ft Eleganz! 🖤 Blitzversand aus der Schweiz und bequem auf Rech» | https://www.facebook.com/122102579637350792/posts/122125770141350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125770141350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «tement. ⚓ Dank Blitzversand aus der Schweiz und Kauf auf Rechnu» | https://www.facebook.com/122102579637350792/posts/122125756107350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125756107350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ie und Ihn. 🖤 Blitzversand aus der Schweiz und bequem Kauf auf» | https://www.facebook.com/122102579637350792/posts/122125744305350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125744305350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125730535350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ibilität – mit Blitzversand aus der Schweiz direkt zu dir nach» | https://www.facebook.com/122102579637350792/posts/122125717983350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125717983350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «hes Facelift ✨ Blitzversand aus der Schweiz direkt zu dir nach» | https://www.facebook.com/122102579637350792/posts/122125690011350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125690011350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «r jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tagen bei d» | https://www.facebook.com/122102579637350792/posts/122125704783350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125687731350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125687197350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e und geniesse Blitzversand direkt aus der Schweiz! ✨ 🔗 luxestyle.ch» | https://www.facebook.com/122102579637350792/posts/122125687119350792 |
| Facebook | 2026-07-28 | 0 | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122125687119350792 |
| Facebook | 2026-07-28 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Vergnügen ✨💡 Blitzversand aus der Schweiz, bequem auf Rechnun» | https://www.facebook.com/122102579637350792/posts/122125676835350792 |
| Pinterest | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581196150 |

</details>

## Facebook ohne Direktlink

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 43 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-09-23 08:26 UTC · 4 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140138311350792 · «Verwöhne deine Haut mit dem Jade Roller Premium – für einen…»
- 2026-09-23 05:39 UTC · 4 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140105137350792 · «EMS Mikrostrom Massagegerät · CHF 22.90 Kleiner Schweizer S…»
- 2026-09-23 02:08 UTC · 4 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140069977350792 · «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für na…»
- 2026-09-22 19:48 UTC · 4 Aufrufe · https://www.facebook.com/122102579637350792/posts/122139992853350792 · «Verwandle dein Zuhause in eine pure Wohlfühloase mit unsere…»
- 2026-09-03 21:39 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135105943350792 · «Von allem etwas – 8 Lieblinge aus 8 Welten 🌍 Wisch dich du…»
- 2026-09-23 14:39 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140221003350792 · «Kristall-Set 3-teilig · CHF 29.90 Kleiner Schweizer Shop au…»
- 2026-09-03 21:20 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135101689350792 · «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdich…»
- 2026-08-05 09:02 UTC · 1 Aufrufe · https://www.facebook.com/reel/2325684204502310/ · «Mach dis eigets Teil 🎨 T-Shirt, Hoodie, Täsche oder Tasse …»
- 2026-08-02 17:02 UTC · 1 Aufrufe · https://www.facebook.com/reel/1058200293322585/ · «Hoi zäme! 🇨🇭 Bi LuxeStyle git's Premium-Mode us de Schwiz…»
- 2026-08-06 17:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1563305552100842/ · «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selb…»
- 2026-08-04 09:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1044133014890179/ · «Das isch LuxeStyle 🇨🇭 Premium-Mode, Schmuck u Beauty us d…»
- 2026-07-31 17:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1077464014964104/ · «Statement-Shirt mit DYM Design 💀🌸 — du designsch, mir dru…»
- 2026-07-30 17:01 UTC · 0 Aufrufe · https://www.facebook.com/reel/1041448861959257/ · «Dis eigete Täschli 🐱 — Motiv ufladä, fertig isch dis Unika…»
- 2026-07-29 09:01 UTC · 0 Aufrufe · https://www.facebook.com/reel/1560906292437695/ · «Dini Tasse, din Spruch ☕ — sälber gestaltet, perfekts Gesch…»
- 2026-07-29 00:12 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125859139350792 · «Dein stylisher Sommer-Begleiter: Die vegane Crossbody-Bag m…»
- 2026-07-29 00:08 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125858557350792 · «Gepflegter Bart in Perfektion – mit Öl, Balsam, Bürste und …»
- 2026-07-28 23:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125850463350792 · «Sonne, See und ganz viel Platz – dein XL Strandtuch aus Bio…»
- 2026-07-28 21:55 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125836441350792 · «Stilvoll verreisen mit dem Travel-Set Premium – Reisepass-H…»
- 2026-07-28 21:06 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125830309350792 · «Drei traumhafte Ohrring-Paare, hypoallergen und sanft zu de…»
- 2026-07-28 20:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125820037350792 · «Ruhe auf Knopfdruck: Diese Bluetooth-Kopfhörer mit Active N…»
- 2026-07-28 19:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125807617350792 · «Dein Fitness-Upgrade ist da: AMOLED-Display, über 100 Sport…»
- 2026-07-28 18:19 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125784061350792 · «Zeitlos elegant und hautfreundlich – dieses Edelstahl-Armba…»
- 2026-07-28 18:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125792899350792 · «Verwöhnzeit für dich: Die Selfcare-Box mit Jade Roller, Sei…»
- 2026-07-28 16:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125770141350792 · «Dein stylishes XL-Portemonnaie aus Echtleder mit 12 Kartenf…»
- 2026-07-28 15:08 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125756107350792 · «Maritimer Style für echte Männer – dieses Lederarmband mit …»
- 2026-07-28 14:11 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125744305350792 · «Schlank, sicher und richtig edel: Unser Unisex Slim Wallet …»
- 2026-07-28 13:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125730535350792 · «Verwandle das Kinderzimmer in einen magischen Sternenhimmel…»
- 2026-07-28 12:07 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125717983350792 · «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Wide…»
- 2026-07-28 11:19 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125690011350792 · «Verwöhne deine Haut mit dem Jade Roller & Gua Sha Set für e…»
- 2026-07-28 11:09 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125704783350792 · «Zeitlos elegant am Handgelenk – Saphirglas, Edelstahl und 5…»
- 2026-07-28 10:53 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125687731350792 · «Essenszeit ohne Chaos – diese weichen Silikon-Lätzchen fang…»
- 2026-07-28 09:51 UTC · 0 Aufrufe · https://www.facebook.com/reel/1466744632141442/ · ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzv…»
- 2026-07-28 09:49 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125687197350792 · «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser …»
- 2026-07-28 09:49 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125687119350792 · «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet m…»
- 2026-07-28 09:19 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125676835350792 · «Sanftes Licht für müde Augen – diese dimmbare LED-Lampe mit…»
- 2026-07-28 09:17 UTC · 0 Aufrufe · https://www.facebook.com/reel/1562821878956452/ · ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» …»
- 2026-07-28 09:12 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125673679350792 · «Statement am Handgelenk 🔗 Cuban-Link-Armband, Edelstahl & …»
- 2026-07-28 09:11 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125673631350792 · «Für ihn: maritimer Style 🤎 Leder-Armband «Anker» mit Edels…»
- 2026-07-28 08:52 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125662153350792 · «Zarte Eleganz fürs Handgelenk ✨ Damenuhr «Petite» mit Perlm…»
- 2026-07-28 08:52 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125662063350792 · «Sportlich-elegant 🌊 Edelstahl-Sportuhr «Pacific» mit GMT-B…»
- 2026-07-28 08:52 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125661925350792 · «Echter Uhrmacher-Luxus ⚙️ Automatik-Skelettuhr mit offenem …»
- 2026-07-28 08:48 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122125661085350792 · «Zeitlos am Handgelenk ⌚ Herrenuhr Edelstahl mit Saphirglas,…»
- 2026-07-26 09:01 UTC · 0 Aufrufe · https://www.facebook.com/reel/1028258120108254/ · «Sommer-Looks wo uffalle ☀️ Premium-Mode us de Schwiz ab CHF…»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (23): https://www.instagram.com/p/Dc1zAj-GoFP/ · https://www.instagram.com/p/DbVMG4okgei/ · https://www.instagram.com/p/DbVMFlsknPT/ · https://www.instagram.com/p/DbVJ5lEFlXc/ · https://www.instagram.com/p/DbVJ4Z4lu5Q/ · https://www.instagram.com/p/DbVJ3F3Fseo/ · https://www.instagram.com/p/DbVJV_SDkIz/ · https://www.instagram.com/reel/DaxHrZODx43/ · https://www.instagram.com/p/DZj7svdktrN/ · https://www.instagram.com/p/DZicunuk5Dr/ · https://www.instagram.com/p/DZicnMck2Vc/ · https://www.instagram.com/p/DZiclNMEw26/ · https://www.instagram.com/p/DZiceA3k9fi/ · https://www.instagram.com/p/DZicbunk2o5/ · https://www.facebook.com/122102579637350792/posts/122135105943350792 · https://www.facebook.com/122102579637350792/posts/122135101689350792 · https://www.facebook.com/122102579637350792/posts/122125673679350792 · https://www.facebook.com/122102579637350792/posts/122125673631350792 · https://www.facebook.com/122102579637350792/posts/122125662153350792 · https://www.facebook.com/122102579637350792/posts/122125662063350792 · https://www.facebook.com/122102579637350792/posts/122125661925350792 · https://www.facebook.com/122102579637350792/posts/122125661085350792 · https://www.facebook.com/reel/1028258120108254/
- Medien nicht messbar (0): —
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
