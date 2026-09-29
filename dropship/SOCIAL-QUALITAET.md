# Social-Qualität — Stand 2026-09-29 00:10 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 45 Seitenbeiträge + 0 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 32 Einträge (−30/+7 Tage) · Pinterest-Analyse: 38 Pins
- Geprüft: 215 Beiträge, 254 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF 45 Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF 7 · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)

## Zusammenfassung

**48 Fehler · 19 Warnungen · 69 Hinweise** — Fehler/Warnungen in 61 von 215 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 9 × Caption korrigieren · 2 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 24 × Caption in der App korrigieren (API kann es nicht [Q2]) · 3 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 23 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | TikTok | YouTube | Pinterest | Summe |
|---|---:|---:|---:|---:|---:|---:|
| DIREKTLINK | · | · | · | · | 32 | 32 |
| DOPPEL | 8 | · | · | · | 1 | 9 |
| FLOSKEL | 2 | 2 | · | · | 2 | 6 |
| FORMAT | · | 19 | · | · | 11 | 30 |
| PREIS | 10 | 7 | 3 | 3 | 12 | 35 |
| PRODUKT | 2 | 1 | · | · | 1 | 4 |
| VERSAND | 19 | · | · | · | 1 | 20 |

Produkt zugeordnet: 134 von 215 Beiträgen (Link 96, Titel 27, Ledger 11).

Dazu: 14 Facebook-Beiträge ohne Direktlink (Liste unten) · 18 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 126 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

### FEHLER · TikTok video · 2026-09-23 06:37 UTC · 552 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7688585316826877216
- Text: «Kennst du das schon? 👀 «Tragbarer Smart-Projektor P62, HD-Auflösung» — Dieser tragbare Projektor P62 projiziert Inhalte von deinem Smartph…»
- Produkt: Tragbarer Smart-Projektor P62, HD-Auflösung (ACTIVE, https://luxestyle.ch/products/tragbarer-smart-projektor-p62-hd-auflosung-844800, SKU CJ-1443876506416844800) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 86.90, Shop CHF 96.90 («Tragbarer Smart-Projektor P62, HD-Auflösung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-09-24 18:05 UTC · 275 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7689134487266970913
- Text: «Training ohne Studio 👀 «11-teiliges Fitnessband-Set» — Dieses 11-teilige Fitnessband-Set unterstützt dich beim täglichen Training. CHF 26.…»
- Produkt: 11-teiliges Fitnessband-Set · 11 Stück (ACTIVE, https://luxestyle.ch/products/11-teiliges-fitnessband-set-11-stuck-130624, SKU CJ-1385891886799130624) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 26.90, Shop CHF 31.90 («11-teiliges Fitnessband-Set · 11 Stück», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-09-23 18:51 UTC · 247 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7688774439244287265
- Text: «Licht an, Stimmung an 👀 «Cosmo Dog Sternenhimmel Projektionslampe» — Die Cosmo Dog Sternenhimmel Projektionslampe taucht jeden Raum in ein…»
- Produkt: Cosmo Dog Sternenhimmel Projektionslampe (ACTIVE, https://luxestyle.ch/products/cosmo-dog-sternenhimmel-projektionslampe-605200, SKU CJ-2408290840481605200) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 29.90, Shop CHF 38.90 («Cosmo Dog Sternenhimmel Projektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · Instagram reel · 2026-09-23 04:09 UTC · 223 Aufrufe
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

### FEHLER · Instagram bild · 2026-06-10 05:55 UTC · 53 Aufrufe
- Post: https://www.instagram.com/p/DZZPZIYk_l4/
- Text: «Neu: Abendkleid «Aurora» · Satin mit Schlitz 🤍 Eleganz für deinen grossen Auftritt — Hochzeit, Gala & Event. Schweizer Shop · Gratis-Versa…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «t. Schweizer Shop · Gratis-Versand ab CHF 65 · –10% mit Code WEL» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:50 UTC · 43 Aufrufe
- Post: https://www.instagram.com/reel/DbVQd7GinD2/
- Text: ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭»
- Produkt: Wimpernlift-Kit (ACTIVE, https://luxestyle.ch/products/wimpernlift-kit-161984, SKU CJ-CJCZ1533149-Same as Photo) — Zuordnung: Ledger cjreel-15449432981889
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJCZ1533149-Same as P, 10–20 Werktage): «e — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:17 UTC · 42 Aufrufe
- Post: https://www.instagram.com/reel/DbVMo7IDmbK/
- Text: ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» ✨ Jetzt bei LuxeStyle — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code …»
- Produkt: Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend (ACTIVE, https://luxestyle.ch/products/kurbis-strichburste-fur-hunde-katzen-selbstrei-066368, SKU CJ-CJMY1547493-Pumpkin) — Zuordnung: Ledger cjreel-15449432916353
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJMY1547493-Pumpkin, 10–20 Werktage): «e — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **FEHLER PREIS:** Lockpreis: Caption CHF 21.90, Shop CHF 29.90 («Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend», Zuordnung: Ledger cjreel-15449432916353)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-09 22:16 UTC · 41 Aufrufe
- Post: https://www.instagram.com/p/DZYa7OkE7d1/
- Text: «Neu entdeckt: Abendkleid «Aurora» · Satin mit Schlitz 🤍 Schweizer Shop · Gratis-Versand ab CHF 65 → https://luxestyle.ch/products/abendkle…»
- Produkt: Abendkleid «Aurora» · Satin, Spaghettiträger & Schlitz (ACTIVE, https://luxestyle.ch/products/abendkleid-aurora-satin-spaghettitrager-schlitz, SKU CJYD292633701AZ) — Zuordnung: Link im Text
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «🤍 Schweizer Shop · Gratis-Versand ab CHF 65 → https://luxestyle» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-16 19:48 UTC · 37 Aufrufe
- Post: https://www.instagram.com/p/DZqLfkiH3Oa/
- Text: «Viu Style für wenig Gäud ✨ Vitamin-C-Serum «Glow» 💾 Merk’s dir · folg für meh Schwiizer Finds · –10% mit WELCOME10 👉 luxestyle.ch/product…»
- **FEHLER PRODUKT:** Direktlink /products/vitamin-c-serum-glow-straffend-strahlend findet kein Produkt (404)  
  → Vorschlag: Link tot: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-09 23:01 UTC gepostet: https://www.instagram.com/reel/DZYgBAnDwDC/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:44 UTC · 35 Aufrufe
- Post: https://www.instagram.com/p/DZicunuk5Dr/
- Text: «Aufblasbares Pool-Spiel «3-Gewinnt» 🎯 Wurfspiel mit 8 Bällen – CHF 29.90 Der Hit für Pool, Garten & Party. 🇨🇭 Gratis-Versand ab CHF 65 ·…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «arten & Party. 🇨🇭 Gratis-Versand ab CHF 65 · –10% WELCOME10 👉» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:43 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DZicnMck2Vc/
- Text: «Solar-Windspiel «Libelle» 🪻 Farbwechsel-LED, wetterfest (2er-Set) – CHF 44.90 Stimmungsvolle Deko für Garten & Balkon, ganz ohne Strom. 🇨…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «nz ohne Strom. 🇨🇭 Gratis-Versand ab CHF 65 👉 luxestyle.ch» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-24 08:24 UTC · 26 Aufrufe
- Post: https://www.instagram.com/reel/Ddqcs8oCskw/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxest…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 30.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-08-18 18:42 UTC · 24 Aufrufe
- Post: https://www.instagram.com/reel/DcMSDwjFGHj/
- Text: ««Kerzenlicht-Aromadiffuser» ✨ Jetzt bei LuxeStyle — CHF 14.90. Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT · −10% mit Code…»
- Produkt: Kerzenlicht-Aromadiffuser (ACTIVE, https://luxestyle.ch/products/kerzenlicht-aromadiffuser-412288, SKU CJ-CJJT154827201AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 17.90–22.90 («Kerzenlicht-Aromadiffuser», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram karussell · 2026-09-26 07:09 UTC · 22 Aufrufe
- Post: https://www.instagram.com/p/DdvdzC8ETg1/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140953051350792
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: erste Zeile
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90–26.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram bild · 2026-06-13 19:42 UTC · 21 Aufrufe
- Post: https://www.instagram.com/p/DZiceA3k9fi/
- Text: «Holz-Lesezähler «Leseheld» 🦊 Montessori-Tier-Tracker – CHF 14.90 Motiviert Kinder zum Lesen, nachhaltig aus Holz. 🇨🇭 Gratis-Versand ab C…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «ltig aus Holz. 🇨🇭 Gratis-Versand ab CHF 65 👉 luxestyle.ch» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-23 12:12 UTC · 17 Aufrufe
- Post: https://www.instagram.com/reel/DdoSCmhkuU7/ · Zwilling: https://www.facebook.com/reel/1441807861146512/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 39.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram karussell · 2026-09-25 06:10 UTC · 15 Aufrufe
- Post: https://www.instagram.com/p/DdsyP5Cl3v2/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140679829350792
- Text: «Geflochtener Aufbewahrungskorb · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschri…»
- Produkt: Geflochtener Aufbewahrungskorb (DRAFT, nicht im Onlineshop, SKU CJ-2607150739361604900) — Zuordnung: erste Zeile
- **FEHLER PRODUKT:** Beworbenes Produkt «Geflochtener Aufbewahrungskorb» ist DRAFT, nicht im Onlineshop (Zuordnung: erste Zeile)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-09-25 04:28 UTC · 7 Aufrufe
- Post: https://www.instagram.com/reel/Ddsmdr2CdwM/ · Zwilling: https://www.facebook.com/reel/1125979450087730/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Farbprojektionslampe» — Die Farbprojektionslampe ist ein einzigartiges Lichtobjekt, das deine Räume in ei…»
- Produkt: Farbprojektionslampe (ACTIVE, https://luxestyle.ch/products/farbprojektionslampe-619700, SKU CJ-2408210642591619700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 23.90 («Farbprojektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-24 20:26 UTC · 7 Aufrufe
- Post: https://www.instagram.com/reel/DdrvVenEe2j/ · Zwilling: https://www.facebook.com/reel/1076754371781935/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 28.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Facebook reel · 2026-09-23 04:09 UTC · 5 Aufrufe
- Post: https://www.facebook.com/reel/1064048703271346/ · Zwilling: https://www.instagram.com/reel/DdnatlxD0nV/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-22 13:02 UTC · 5 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093478/
- Text: «Futterspender für Hunde Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futteraufnahme verlangsamt. Er besteht…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-09-24 08:25 UTC · 4 Aufrufe
- Post: https://www.facebook.com/reel/1074059645370975/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 https:…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 30.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-22 13:04 UTC · 3 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093635/
- Text: «Intelligenter Sensor-Seifenspender aus Edelstahl Der JAVA Jiahua Intelligente Sensor-Seifenspender überzeugt durch sein modernes, schlichte…»
- Produkt: Intelligenter Sensor-Seifenspender aus Edelstahl (ACTIVE, https://luxestyle.ch/products/intelligenter-sensor-seifenspender-aus-edelsta-068032, SKU CJ-1744234003089068032) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 38.90, Shop CHF 45.90 («Intelligenter Sensor-Seifenspender aus Edelstahl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook album · 2026-09-26 07:10 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140953051350792 · Zwilling: https://www.instagram.com/p/DdvdzC8ETg1/
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90–26.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-25 04:28 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1125979450087730/ · Zwilling: https://www.instagram.com/reel/Ddsmdr2CdwM/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Farbprojektionslampe» — Die Farbprojektionslampe ist ein einzigartiges Lichtobjekt, das deine Räume in ei…»
- Produkt: Farbprojektionslampe (ACTIVE, https://luxestyle.ch/products/farbprojektionslampe-619700, SKU CJ-2408210642591619700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 23.90 («Farbprojektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-23 12:13 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1441807861146512/ · Zwilling: https://www.instagram.com/reel/DdoSCmhkuU7/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 39.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook album · 2026-09-25 06:11 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140679829350792 · Zwilling: https://www.instagram.com/p/DdsyP5Cl3v2/
- Text: «Geflochtener Aufbewahrungskorb · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschri…»
- Produkt: Geflochtener Aufbewahrungskorb (DRAFT, nicht im Onlineshop, SKU CJ-2607150739361604900) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Geflochtener Aufbewahrungskorb» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Facebook reel · 2026-09-24 20:27 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1076754371781935/ · Zwilling: https://www.instagram.com/reel/DdrvVenEe2j/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 28.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-24 04:50 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581236221/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 39.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-23 04:53 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152467/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-22 13:02 UTC gepostet: https://www.pinterest.com/pin/1111333645581093478/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

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

### FEHLER · Pinterest pin · 2026-09-27 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581487084/
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 24.90–26.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-26 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581395392/
- Text: «Geflochtener Aufbewahrungskorb · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschri…»
- Produkt: Geflochtener Aufbewahrungskorb (DRAFT, nicht im Onlineshop, SKU CJ-2607150739361604900) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PRODUKT:** Beworbenes Produkt «Geflochtener Aufbewahrungskorb» ist DRAFT, nicht im Onlineshop (Zuordnung: erste Zeile)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-25 04:52 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581314612/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxest…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 30.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-25 04:50 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581314558/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Farbprojektionslampe» — Die Farbprojektionslampe ist ein einzigartiges Lichtobjekt, das deine Räume in ei…»
- Produkt: Farbprojektionslampe (ACTIVE, https://luxestyle.ch/products/farbprojektionslampe-619700, SKU CJ-2408210642591619700) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 23.90 («Farbprojektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-25 04:50 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581314528/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 28.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

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

### FEHLER · Facebook album · 2026-09-24 05:48 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140391547350792 · Zwilling: https://www.instagram.com/p/DdqK05YFML3/
- Text: «🎃 Halloween-Deko: Sprechende Kürbis-Süssigkeitenschale · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage…»
- Produkt: Sprechende Kürbis-Süssigkeitenschale (ACTIVE, https://luxestyle.ch/products/sprechende-kurbis-sussigkeitenschale-727424, SKU CJ-1702149960650727424) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 36.90 («Sprechende Kürbis-Süssigkeitenschale», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · YouTube video · 2026-09-23 18:54 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/joD73lTVlGM
- Text: «Dein neues Lieblingsteil? 👀 «Matcha-Set mit Schale und Zubehör» — Dieses vierteilige Matcha-Set ist ideal für die traditionelle Zubereitun…»
- Produkt: Matcha-Set mit Schale und Zubehör (ACTIVE, https://luxestyle.ch/products/matcha-set-mit-schale-und-zubehor-218560, SKU CJ-1736982514977218560) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 27.90, Shop CHF 40.90 («Matcha-Set mit Schale und Zubehör», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

<details><summary>15 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · Instagram bild · 2026-09-03 21:20 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Dc1w4wMjkjZ/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122135101689350792
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- Produkt: Outdoor Bluetooth Speaker Solar – RGB-Licht, Wasserdicht & Tragbar (ACTIVE, https://luxestyle.ch/products/outdoor-bluetooth-speaker-solar-rgb-licht-wasserdicht-tragbar, SKU CJ-CJYS260671001AZ) — Zuordnung: Ledger kimi-dein-sound-f-r-jedes-abenteuer-s-15
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 11:09 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DbVZgK_kv1U/
- Text: «Zeitlos elegant am Handgelenk – Saphirglas, Edelstahl und 50 m Wasserdichtigkeit für jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tage…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «it für jeden Tag. ⌚ Blitzversand aus der Schweiz: in»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «nd aus der Schweiz: in 1–2 Tagen bei dir. 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-06-15 16:00 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DZnMnHQlFEM/
- Text: «Kleiner Preis, grosse Wirkung ✨ Stiletto-Sandalette «Gala» – CHF 71.00 💾 Merk’s dir · folge für mehr Schweizer Finds · –10% mit WELCOME10 …»
- Produkt: Stiletto-Sandalette «Gala» · Violett, Knöchelriemen (ACTIVE, https://luxestyle.ch/products/stiletto-sandalette-gala-violett-knochelriemen, SKU CJNS291823709IR) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 71.00, Shop CHF 54.90 («Stiletto-Sandalette «Gala» · Violett, Knöchelriemen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DbVQaq0lhRv/
- Text: «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser mit UV400 – dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxestyle.ch · Link in Bio»
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «er mit UV400 – dank Blitzversand in 1-2 Tagen bei di»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «– dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbVQZSWFoni/
- Text: «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet mit RFID-Schutz begleitet dich überallhin. 🖤 Bestelle heute und geniesse Blitzve…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «heute und geniesse Blitzversand direkt aus der Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-23 02:11 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DdnNSHEDMja/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140069977350792
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 12:07 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DbVgLAXHyd9/
- Text: «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Widerstandsstufen für maximale Flexibilität – mit Blitzversand aus der Schweiz direk…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Flexibilität – mit Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Pinterest pin · 2026-09-04 04:47 UTC · 13 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645579582500/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-23 02:08 UTC · 6 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140069977350792 · Zwilling: https://www.instagram.com/p/DdnNSHEDMja/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-03 21:20 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122135101689350792 · Zwilling: https://www.instagram.com/p/Dc1w4wMjkjZ/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-09-23 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152144/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-28 14:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141546235350792 · Zwilling: https://www.instagram.com/p/Dd1YfDSDX-4/
- Text: «🛒 Schon von Kund:innen bestellt Multifunktionaler runder Gemüseschneider · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefer…»
- Produkt: Multifunktionaler runder Gemüseschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-runder-gemuseschneider-be2e21, SKU CJ-CJJJCFCF00364-Red) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Bild 500×500 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest bild · 2026-09-26 01:19 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581377817
- Text: «Dieses 3D Puzzle in Form eines Halloween Schlosses ist ein Spass für Teenager von 7 bis 14 Jahren. Das Set besteht aus Papier und wird in e…»
- **WARNUNG FORMAT:** Bild 630×630 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-09-25 18:00 UTC · n/a Aufrufe
- Post: https://www.instagram.com/p/Ddt2SkdjXMz/ · Zwilling: https://facebook.com/122108214291350792/posts/122140802565350792
- Text: «Dein Abend-Ritual: «Jade» Gua-Sha-Set mit Rosehip-Öl. Kühlt, strafft, entspannt – in 5 Minuten. ✨ CHF 34.90 · Gratis-Versand ab CHF 50 · 30…»
- Produkt: Gua-Sha-Set «Jade» · Massage-Tool & Rosehip-Öl (ACTIVE, https://luxestyle.ch/products/gua-sha-set-jade-massage-tool-rosehip-ol, SKU CJMB289246601AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-06-10 18:55 UTC gepostet: https://www.instagram.com/p/DZaopvjIHvm/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest bild · 2026-09-24 10:34 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581245245
- Text: «Das runde Samt-Kürbis Kissen ist eine stilvolle und komfortable Ergänzung für jedes Zuhause. Mit seinem einzigartigen Design, das an ein ha…»
- **WARNUNG FORMAT:** Bild 703×703 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

</details>

## Hinweise (gesammelt)

69 Hinweise in 63 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 76 Beiträge mit generischen Reichweiten-Hashtags (#foryou #trending #fyp #viral) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| Instagram | 2026-06-10 | 45 | DOPPEL | gleiche Warengruppe «gesichtsroller» 20 h nach https://www.instagram.com/reel/DZYfQcHnbIM/ (Raster wirkt doppelt) | https://www.instagram.com/p/DZaopvjIHvm/ |
| Instagram | 2026-07-28 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «r jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tagen bei d» | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 42 | DOPPEL | gleiche Warengruppe «uhr» 2 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 32 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e und geniesse Blitzversand direkt aus der Schweiz! ✨ 🔗 luxestyle.ch» | https://www.instagram.com/p/DbVQZSWFoni/ |
| Instagram | 2026-07-28 | 32 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ5lEFlXc/ |
| Instagram | 2026-07-28 | 25 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ibilität – mit Blitzversand aus der Schweiz direkt zu dir nach» | https://www.instagram.com/p/DbVgLAXHyd9/ |
| Instagram | 2026-07-28 | 16 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ4Z4lu5Q/ |
| Instagram | 2026-07-28 | 15 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ3F3Fseo/ |
| Pinterest | 2026-09-04 | 13 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1w4wMjkjZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582500/ |
| Pinterest | 2026-09-04 | 7 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1zAj-GoFP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582505/ |
| Facebook | 2026-09-23 | 6 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140069977350792 |
| Facebook | 2026-09-23 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140221003350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 3/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 4/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 5/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 6/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 888×888 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 7/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122135101689350792 |
| Facebook | 2026-09-28 | 1 | FORMAT | Bild 896×1200 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141469087350792 |
| Facebook | 2026-09-26 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140943505350792 |
| Facebook | 2026-09-25 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140661457350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 883×773 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140607019350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140352715350792 |
| Pinterest | 2026-09-25 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdqcqhXm4wX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314388/ |
| Pinterest | 2026-09-24 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdoSCmhkuU7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236221/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdmhRxtjUIZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581153922/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdnatlxD0nV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152467/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnNSHEDMja/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152144/ |
| Facebook | 2026-09-27 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141356965350792 |
| Facebook | 2026-09-25 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140880307350792 |
| Facebook | 2026-09-25 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140807437350792 |
| Facebook | 2026-09-24 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140423395350792 |
| Pinterest | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581196150 |
| Pinterest | 2026-09-24 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «wertige Qualität ab Schweizer Lager. Details Marke: Wid» | https://www.pinterest.es/pin/1111333645581220663 |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581229813 |
| Instagram | 2026-09-25 | n/a | DOPPEL | gleiche Warengruppe «gesichtsroller» 64 h nach https://www.instagram.com/p/DdnNSHEDMja/ (Raster wirkt doppelt) | https://www.instagram.com/p/Ddt2SkdjXMz/ |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581268333 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581294528 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581314086 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581329607 |
| Pinterest | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581351838 |
| Pinterest | 2026-09-26 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581399587 |
| Pinterest | 2026-09-28 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581639687 |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd0SuSMlPf1/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583435/ |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddza9ySASTZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583062/ |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd0EM26kdvw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583061/ |
| Pinterest | 2026-09-28 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddza2rvHVMo/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581583059/ |
| Pinterest | 2026-09-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdvmkBckZrO/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581487706/ |
| Pinterest | 2026-09-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdvdzC8ETg1/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581487084/ |
| Pinterest | 2026-09-27 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdvW8OwFLBZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581487082/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddutl8miAzn/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581396531/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddtv5Z1Epoh/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581396301/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdsyP5Cl3v2/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581395392/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddumv_9lNi3/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581395389/ |
| Pinterest | 2026-09-26 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Ddt5dW5FNsS/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581395388/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddqcs8oCskw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314612/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Ddsmdr2CdwM/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314558/ |
| Pinterest | 2026-09-25 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdrvVenEe2j/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314528/ |
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

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 14 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-09-23 05:39 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140105137350792 · «EMS Mikrostrom Massagegerät · CHF 22.90 Kleiner Schweizer S…»
- 2026-09-23 02:08 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140069977350792 · «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für na…»
- 2026-09-23 14:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140221003350792 · «Kristall-Set 3-teilig · CHF 29.90 Kleiner Schweizer Shop au…»
- 2026-09-03 21:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135105943350792 · «Von allem etwas – 8 Lieblinge aus 8 Welten 🌍 Wisch dich du…»
- 2026-09-03 21:20 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135101689350792 · «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdich…»
- 2026-09-26 06:10 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140943505350792 · «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-S…»
- 2026-08-05 09:02 UTC · 1 Aufrufe · https://www.facebook.com/reel/2325684204502310/ · «Mach dis eigets Teil 🎨 T-Shirt, Hoodie, Täsche oder Tasse …»
- 2026-08-02 17:02 UTC · 1 Aufrufe · https://www.facebook.com/reel/1058200293322585/ · «Hoi zäme! 🇨🇭 Bi LuxeStyle git's Premium-Mode us de Schwiz…»
- 2026-09-27 20:01 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122141356965350792 · «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF…»
- 2026-09-25 23:08 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140880307350792 · «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 2…»
- 2026-09-25 16:33 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140807437350792 · «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen ·…»
- 2026-08-06 17:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1563305552100842/ · «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selb…»
- 2026-08-04 09:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1044133014890179/ · «Das isch LuxeStyle 🇨🇭 Premium-Mode, Schmuck u Beauty us d…»
- 2026-07-31 17:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1077464014964104/ · «Statement-Shirt mit DYM Design 💀🌸 — du designsch, mir dru…»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (18): https://www.instagram.com/p/Dd0EM26kdvw/ · https://www.instagram.com/p/DdqK05YFML3/ · https://www.instagram.com/p/Dc1zAj-GoFP/ · https://www.instagram.com/p/DbVMG4okgei/ · https://www.instagram.com/p/DbVMFlsknPT/ · https://www.instagram.com/p/DbVJ5lEFlXc/ · https://www.instagram.com/p/DbVJ4Z4lu5Q/ · https://www.instagram.com/p/DbVJ3F3Fseo/ · https://www.instagram.com/p/DbVJV_SDkIz/ · https://www.instagram.com/reel/DaxHrZODx43/ · https://www.instagram.com/p/DZj7svdktrN/ · https://www.instagram.com/p/DZicunuk5Dr/ · https://www.instagram.com/p/DZicnMck2Vc/ · https://www.instagram.com/p/DZiclNMEw26/ · https://www.instagram.com/p/DZiceA3k9fi/ · https://www.instagram.com/p/DZicbunk2o5/ · https://www.facebook.com/122102579637350792/posts/122135105943350792 · https://www.facebook.com/122102579637350792/posts/122135101689350792
- Medien nicht messbar (126): https://www.instagram.com/reel/Dd2VJQIFPf6/ (Download gescheitert) · https://www.instagram.com/p/Dd2CntDjDZs/ (Download gescheitert) · https://www.instagram.com/reel/Dd1YiSEDDur/ (Download gescheitert) · https://www.instagram.com/p/Dd1YfDSDX-4/ (Download gescheitert) · https://www.instagram.com/p/Dd0ucPOjRpC/ (Download gescheitert) · https://www.instagram.com/reel/Dd0SuSMlPf1/ (Download gescheitert) · https://www.instagram.com/p/Dd0EM26kdvw/ (Download gescheitert) · https://www.instagram.com/p/Ddza9ySASTZ/ (Download gescheitert) · https://www.instagram.com/p/Ddza2rvHVMo/ (Download gescheitert) · https://www.instagram.com/reel/DdvmkBckZrO/ (Download gescheitert) · https://www.instagram.com/p/DdvdzC8ETg1/ (Download gescheitert) · https://www.instagram.com/p/DdvW8OwFLBZ/ (Download gescheitert) · https://www.instagram.com/reel/Ddutl8miAzn/ (Download gescheitert) · https://www.instagram.com/p/Ddumv_9lNi3/ (Download gescheitert) · https://www.instagram.com/p/Ddt5dW5FNsS/ (Download gescheitert) · https://www.instagram.com/reel/Ddtv5Z1Epoh/ (Download gescheitert) · https://www.instagram.com/p/DdsyP5Cl3v2/ (Download gescheitert) · https://www.instagram.com/reel/Ddsmdr2CdwM/ (Download gescheitert) · https://www.instagram.com/p/Ddsmbc-DkJe/ (Download gescheitert) · https://www.instagram.com/p/Ddr7Lk4nPix/ (Download gescheitert) · https://www.instagram.com/reel/DdrvVenEe2j/ (Download gescheitert) · https://www.instagram.com/reel/Ddqcs8oCskw/ (Download gescheitert) · https://www.instagram.com/p/DdqcqhXm4wX/ (Download gescheitert) · https://www.instagram.com/p/DdqK05YFML3/ (Download gescheitert) · https://www.instagram.com/p/DdpyPQLFFjb/ (Download gescheitert)
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
