# Social-Qualität — Stand 2026-10-05 00:00 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 79 Seitenbeiträge + 0 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 67 Einträge (−30/+7 Tage) · Pinterest-Analyse: 107 Pins
- Geprüft: 353 Beiträge, 400 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF 45 Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF 7 · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)

## Zusammenfassung

**70 Fehler · 160 Warnungen · 162 Hinweise** — Fehler/Warnungen in 188 von 353 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 39 × Caption korrigieren · 7 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 37 × Caption in der App korrigieren (API kann es nicht [Q2]) · 13 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 92 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | TikTok | YouTube | Pinterest | Summe |
|---|---:|---:|---:|---:|---:|---:|
| DIREKTLINK | · | · | · | · | 72 | 72 |
| DOPPEL | 6 | 1 | · | · | 6 | 13 |
| ENGLISCH | 3 | · | · | · | · | 3 |
| FLOSKEL | 2 | 2 | · | · | 1 | 5 |
| FORMAT | 39 | 34 | · | · | 16 | 89 |
| PREIS | 34 | 37 | 17 | 9 | 56 | 153 |
| PRODUKT | 1 | 1 | · | 1 | 3 | 6 |
| TEXT | 1 | 1 | · | · | · | 2 |
| TON | 7 | 2 | · | · | · | 9 |
| VERSAND | 15 | 16 | · | · | 9 | 40 |

Produkt zugeordnet: 283 von 353 Beiträgen (Titel 66, Link 204, Ledger 13).

Dazu: 12 Facebook-Beiträge ohne Direktlink (Liste unten) · 17 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 1 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

### FEHLER · TikTok video · 2026-09-26 10:38 UTC · 279 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7689760653929647392
- Text: «Das fehlt in jeder Küche 👀 «Antihaft Silikon Küchenhelfer Set» — Dieses vielseitige Küchenhelfer-Set aus hochwertigem Silikon ist die idea…»
- Produkt: Antihaft Silikon Küchenhelfer Set (ACTIVE, https://luxestyle.ch/products/antihaft-silikon-kuchenhelfer-set-602100, SKU CJ-2406150920131602100) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 34.90, Shop CHF 52.90 («Antihaft Silikon Küchenhelfer Set», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-09-24 18:05 UTC · 278 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7689134487266970913
- Text: «Training ohne Studio 👀 «11-teiliges Fitnessband-Set» — Dieses 11-teilige Fitnessband-Set unterstützt dich beim täglichen Training. CHF 26.…»
- Produkt: 11-teiliges Fitnessband-Set (ACTIVE, https://luxestyle.ch/products/11-teiliges-fitnessband-set-11-stuck-130624, SKU CJ-1385891886799130624) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 26.90, Shop CHF 27.90 («11-teiliges Fitnessband-Set», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-10-04 18:05 UTC · 255 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7692845305338924320
- Text: «Neu bei LuxeStyle 👀 «Weihnachtskranz Zuckerstangen-Baum Girlande» — Für die weihnachtliche Dekoration deines Zuhauses eignet sich diese Gi…»
- Produkt: Weihnachts-Türkranz mit Zuckerstangen-Deko (ACTIVE, https://luxestyle.ch/products/weihnachtskranz-zuckerstangen-baum-girlande-656200, SKU CJ-2510170658171656200) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 26.90 («Weihnachts-Türkranz mit Zuckerstangen-Deko», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · TikTok video · 2026-09-23 18:51 UTC · 249 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7688774439244287265
- Text: «Licht an, Stimmung an 👀 «Cosmo Dog Sternenhimmel Projektionslampe» — Die Cosmo Dog Sternenhimmel Projektionslampe taucht jeden Raum in ein…»
- Produkt: Cosmo Dog Sternenhimmel Projektionslampe (ACTIVE, https://luxestyle.ch/products/cosmo-dog-sternenhimmel-projektionslampe-605200, SKU CJ-2408290840481605200) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 29.90, Shop CHF 34.90 («Cosmo Dog Sternenhimmel Projektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### FEHLER · Instagram reel · 2026-09-23 04:09 UTC · 224 Aufrufe
- Post: https://www.instagram.com/reel/DdnatlxD0nV/ · Zwilling: https://www.facebook.com/reel/1064048703271346/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-08-01 11:12 UTC · 83 Aufrufe
- Post: https://www.instagram.com/reel/DbftCVqDqVO/
- Text: ««Luftreiniger mit Feuchtigkeitsspender» ✨ Jetzt bei LuxeStyle — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭 🔗 l…»
- Produkt: Luftreiniger mit Feuchtigkeitsspender (ACTIVE, https://luxestyle.ch/products/luftreiniger-mit-feuchtigkeitsspender-889dfb, SKU CJ-CJXFZNZN00558-Black) — Zuordnung: Link im Text
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJXFZNZN00558-Black, 10–20 Werktage): «e — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **FEHLER PREIS:** Lockpreis: Caption CHF 12.90, Shop CHF 14.90 («Luftreiniger mit Feuchtigkeitsspender», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-16 17:01 UTC · 79 Aufrufe
- Post: https://www.instagram.com/reel/Da3ILUnjkRu/
- Text: «Wasserfescht & edel: 1 oder 2? 👇 Welä passt zu dir? Schrib's! ↗️ Teil's mit dyre beschte Fründin · –10% WELCOME10 → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-06-21 17:37 UTC · 54 Aufrufe
- Post: https://www.instagram.com/reel/DZ20gmnE_Ig/
- Text: «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selbst-gestalten — alles us eim Schwiizer Shop. 💾 Spicher's · gratis Versand ab CHF…»
- **FEHLER VERSAND:** Gratis-Schwelle CHF 65 statt 50: «hop. 💾 Spicher's · gratis Versand ab CHF 65 · –10% WELCOME10 →» (live: gratis ab CHF 45 nach Rabatt → öffentliche Aussage 50)  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:50 UTC · 43 Aufrufe
- Post: https://www.instagram.com/reel/DbVQd7GinD2/
- Text: ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭»
- Produkt: Wimpernlift-Kit (ACTIVE, https://luxestyle.ch/products/wimpernlift-kit-161984, SKU CJ-CJCZ1533149-Same as Photo) — Zuordnung: Ledger cjreel-15449432981889
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJCZ1533149-Same as P, 10–20 Werktage): «e — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Video: the, keep, from, natural, make, are  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-07-28 09:17 UTC · 42 Aufrufe
- Post: https://www.instagram.com/reel/DbVMo7IDmbK/
- Text: ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» ✨ Jetzt bei LuxeStyle — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code …»
- Produkt: Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend (ACTIVE, https://luxestyle.ch/products/kurbis-strichburste-fur-hunde-katzen-selbstrei-066368, SKU CJ-CJMY1547493-Pumpkin) — Zuordnung: Ledger cjreel-15449432916353
- **FEHLER VERSAND:** Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU CJ-CJMY1547493-Pumpkin, 10–20 Werktage): «e — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code WEL»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **FEHLER PREIS:** Lockpreis: Caption CHF 21.90, Shop CHF 29.90 («Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend», Zuordnung: Ledger cjreel-15449432916353)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-27 09:02 UTC · 41 Aufrufe
- Post: https://www.instagram.com/reel/DbSmG3ijUtK/
- Text: «Welä Ohrring nimmsch — 1 oder 2? 👇 Schrib's i d Kommentär! 📌 Speicher der's · –10% mit WELCOME10 → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram karussell · 2026-09-25 06:10 UTC · 31 Aufrufe
- Post: https://www.instagram.com/p/DdsyP5Cl3v2/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140679829350792
- Text: «Geflochtener Aufbewahrungskorb · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschri…»
- Produkt: Geflochtener Aufbewahrungskorb (DRAFT, nicht im Onlineshop, SKU CJ-2607150739361604900) — Zuordnung: erste Zeile
- **FEHLER PRODUKT:** Beworbenes Produkt «Geflochtener Aufbewahrungskorb» ist DRAFT, nicht im Onlineshop (Zuordnung: erste Zeile)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram karussell · 2026-09-26 07:09 UTC · 29 Aufrufe
- Post: https://www.instagram.com/p/DdvdzC8ETg1/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140953051350792
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: erste Zeile
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90–23.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-24 08:24 UTC · 29 Aufrufe
- Post: https://www.instagram.com/reel/Ddqcs8oCskw/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxest…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 26.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-08-18 18:42 UTC · 24 Aufrufe
- Post: https://www.instagram.com/reel/DcMSDwjFGHj/
- Text: ««Kerzenlicht-Aromadiffuser» ✨ Jetzt bei LuxeStyle — CHF 14.90. Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT · −10% mit Code…»
- Produkt: Kerzenlicht-Aromadiffuser (ACTIVE, https://luxestyle.ch/products/kerzenlicht-aromadiffuser-412288, SKU CJ-CJJT154827201AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 16.90–22.90 («Kerzenlicht-Aromadiffuser», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG TON:** übersteuert: True Peak +0.7 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-07-10 15:36 UTC · 23 Aufrufe
- Post: https://www.instagram.com/reel/DanhubhjvrJ/
- Text: «LuxeStyle in 43 Sekunden ✨ Mode, Schmuck, Sonnenbrillen & mehr — alles aus einem Schweizer Shop. Code WELCOME10 = -10% → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Pinterest pin · 2026-09-22 13:07 UTC · 22 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093873/
- Text: «Figurformendes ärmelloses Kleid Dieses elegante ärmellose Kleid schmeichelt der Figur und sorgt für einen raffinierten Auftritt. Der hohe T…»
- Produkt: Figurformendes ärmelloses Kleid (ACTIVE, https://luxestyle.ch/products/figurformendes-armelloses-kleid-600300, SKU CJ-CJLY293212301AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 27.90, Shop CHF 29.90 («Figurformendes ärmelloses Kleid», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Instagram reel · 2026-09-23 12:12 UTC · 19 Aufrufe
- Post: https://www.instagram.com/reel/DdoSCmhkuU7/ · Zwilling: https://www.facebook.com/reel/1441807861146512/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 34.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-28 04:09 UTC · 17 Aufrufe
- Post: https://www.instagram.com/reel/Dd0SuSMlPf1/
- Text: «Das trägt jetzt jeder 👀 Sicherheitsschuhe mit Stahlkappe — für Werkstatt, Umzug und Garten. CHF 14.90 · Gratis Versand ab CHF 50 · Klarna …»
- Produkt: Sicherheits-Schuhe mit Stahlkappe (ACTIVE, https://luxestyle.ch/products/sicherheits-schuhe-mit-stahlkappe-695232, SKU CJ-CJNS109710401AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 27.90–41.90 («Sicherheits-Schuhe mit Stahlkappe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-10-04 13:10 UTC · 16 Aufrufe
- Post: https://www.instagram.com/reel/DeEta4YlMAG/ · Zwilling: https://www.facebook.com/reel/2185021565388865/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Weihnachtsgirlande Handschuh-Design mit Lichtern» — Für eine festliche Stimmung in deinem Zuhause sorgt d…»
- Produkt: Weihnachtsgirlande Handschuh-Design mit Lichtern (ACTIVE, https://luxestyle.ch/products/weihnachtsgirlande-handschuh-design-mit-lichte-647500, SKU CJ-2510170716351647500) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 22.90, Shop CHF 24.90 («Weihnachtsgirlande Handschuh-Design mit Lichtern», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Pinterest pin · 2026-09-22 13:02 UTC · 14 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093478/
- Text: «Futterspender für Hunde Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futteraufnahme verlangsamt. Er besteht…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Instagram reel · 2026-09-28 14:19 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/Dd1YiSEDDur/ · Zwilling: https://www.facebook.com/reel/1451952913459706/
- Text: «Outfit fertig in 10 Sekunden 👀 «Laptop-Tasche für Herren» — Die vielseitige Laptop-Tasche für Herren ist der ideale Begleiter für Büro und…»
- Produkt: Laptop-Tasche für Herren (ACTIVE, https://luxestyle.ch/products/laptop-tasche-fur-herren-121536, SKU CJ-1735263488685121536) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 17.90 («Laptop-Tasche für Herren», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-26 08:26 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/DdvmkBckZrO/ · Zwilling: https://www.facebook.com/reel/1684116469801173/
- Text: «Genau das hat gefehlt 👀 «Multifunktionaler Gemüseschneider mit Spiralschneider» — Dieser multifunktionale Gemüseschneider mit Handkurbel u…»
- Produkt: Multifunktionaler Gemüseschneider mit Spiralschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-gemuseschneider-mit-spiralsc-623700, SKU CJ-2409131134451623700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 21.90 («Multifunktionaler Gemüseschneider mit Spiralschneider», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Pinterest pin · 2026-09-22 13:04 UTC · 12 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093635/
- Text: «Intelligenter Sensor-Seifenspender aus Edelstahl Der JAVA Jiahua Intelligente Sensor-Seifenspender überzeugt durch sein modernes, schlichte…»
- Produkt: Intelligenter Sensor-Seifenspender aus Edelstahl (ACTIVE, https://luxestyle.ch/products/intelligenter-sensor-seifenspender-aus-edelsta-068032, SKU CJ-1744234003089068032) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 38.90, Shop CHF 40.90 («Intelligenter Sensor-Seifenspender aus Edelstahl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-22 13:05 UTC · 10 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093717/
- Text: «Webcam mit Full HD & LED-Ringlicht Die Full HD Webcam mit integriertem Ringlicht ist ideal für Online-Kurse, Live-Streams und Videokonferen…»
- Produkt: Webcam mit Full HD & LED-Ringlicht (ACTIVE, https://luxestyle.ch/products/webcam-mit-full-hd-led-ringlicht-108608, SKU CJ-1387226045287108608) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 24.90 («Webcam mit Full HD & LED-Ringlicht», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-01 20:26 UTC · 8 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581888945/
- Text: «Elektrischer Fleischwolf 5L – Küchenmaschine Dieser elektrische Fleischwolf ist eine vielseitige Küchenmaschine, die dir bei der Zubereitun…»
- Produkt: Elektrischer Fleischwolf 5L – Küchenmaschine (DRAFT, nicht im Onlineshop, SKU CJ-2046148911407656962) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «Elektrischer Fleischwolf 5L – Küchenmaschine» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Instagram reel · 2026-09-25 04:28 UTC · 8 Aufrufe
- Post: https://www.instagram.com/reel/Ddsmdr2CdwM/ · Zwilling: https://www.facebook.com/reel/1125979450087730/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Farbprojektionslampe» — Die Farbprojektionslampe ist ein einzigartiges Lichtobjekt, das deine Räume in ei…»
- Produkt: Farbprojektionslampe (ACTIVE, https://luxestyle.ch/products/farbprojektionslampe-619700, SKU CJ-2408210642591619700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 20.90 («Farbprojektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-24 20:26 UTC · 8 Aufrufe
- Post: https://www.instagram.com/reel/DdrvVenEe2j/ · Zwilling: https://www.facebook.com/reel/1076754371781935/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 25.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Facebook reel · 2026-09-23 04:09 UTC · 5 Aufrufe
- Post: https://www.facebook.com/reel/1064048703271346/ · Zwilling: https://www.instagram.com/reel/DdnatlxD0nV/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-24 08:25 UTC · 4 Aufrufe
- Post: https://www.facebook.com/reel/1074059645370975/
- Text: «Dein neues Lieblingsteil? 👀 «Schwimmboje mit Doppelairbag & Rucksack» CHF 24.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 https:…»
- Produkt: Schwimmboje mit Doppelairbag & Rucksack (ACTIVE, https://luxestyle.ch/products/schwimmboje-mit-doppelairbag-rucksack-782336, SKU CJ-1408332641408782336) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 26.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-22 18:16 UTC · 4 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581116334/
- Text: «Verstellbare Teleskop-Faszienrolle aus Schaumstoff Diese anpassbare Teleskop-Faszienrolle aus Schaumstoff ist ein vielseitiges Hilfsmittel …»
- Produkt: Verstellbare Teleskop-Faszienrolle aus Schaumstoff (ACTIVE, https://luxestyle.ch/products/verstellbare-teleskop-faszienrolle-aus-schaums-877824, SKU CJ-1797463325324877824) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 31.90, Shop CHF 38.90 («Verstellbare Teleskop-Faszienrolle aus Schaumstoff», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-22 13:03 UTC · 4 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581093546/
- Text: «Beheizbare Hausschuhe mit Temperaturregelung Diese beheizbaren Hausschuhe halten deine Füsse im Haus warm. · CHF 34.90 bei LuxeStyle CH — G…»
- Produkt: Beheizbare Hausschuhe mit Temperaturregelung (DRAFT, nicht im Onlineshop, SKU CJ-CJYD216355003CX) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 34.90, Shop CHF 36.90 («Beheizbare Hausschuhe mit Temperaturregelung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **FEHLER PRODUKT:** Beworbenes Produkt «Beheizbare Hausschuhe mit Temperaturregelung» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-10-04 13:11 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/2185021565388865/ · Zwilling: https://www.instagram.com/reel/DeEta4YlMAG/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Weihnachtsgirlande Handschuh-Design mit Lichtern» — Für eine festliche Stimmung in deinem Zuhause sorgt d…»
- Produkt: Weihnachtsgirlande Handschuh-Design mit Lichtern (ACTIVE, https://luxestyle.ch/products/weihnachtsgirlande-handschuh-design-mit-lichte-647500, SKU CJ-2510170716351647500) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 22.90, Shop CHF 24.90 («Weihnachtsgirlande Handschuh-Design mit Lichtern», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook album · 2026-09-26 07:10 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140953051350792 · Zwilling: https://www.instagram.com/p/DdvdzC8ETg1/
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90–23.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-25 04:28 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1125979450087730/ · Zwilling: https://www.instagram.com/reel/Ddsmdr2CdwM/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Farbprojektionslampe» — Die Farbprojektionslampe ist ein einzigartiges Lichtobjekt, das deine Räume in ei…»
- Produkt: Farbprojektionslampe (ACTIVE, https://luxestyle.ch/products/farbprojektionslampe-619700, SKU CJ-2408210642591619700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 20.90 («Farbprojektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-23 12:13 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1441807861146512/ · Zwilling: https://www.instagram.com/reel/DdoSCmhkuU7/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 34.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-10-02 20:34 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581977242/
- Text: «LED-Schneeflocken-String mit Farbwechsel Für festliche Dekorationen in heimischer Atmosphäre sorgt dieser LED-String. Er besteht aus 4 Mete…»
- Produkt: LED-Schneeflocken-Lichterkette mit Farbwechsel (ACTIVE, https://luxestyle.ch/products/led-schneeflocken-string-mit-farbwechsel-607700, SKU CJ-2608240915361607700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 26.90 («LED-Schneeflocken-Lichterkette mit Farbwechsel», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-29 05:05 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581667871/
- Text: «Outfit fertig in 10 Sekunden 👀 «Laptop-Tasche für Herren» — Die vielseitige Laptop-Tasche für Herren ist der ideale Begleiter für Büro und…»
- Produkt: Laptop-Tasche für Herren (ACTIVE, https://luxestyle.ch/products/laptop-tasche-fur-herren-121536, SKU CJ-1735263488685121536) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 17.90 («Laptop-Tasche für Herren», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-09-28 04:10 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/4670891903189580/
- Text: «Das trägt jetzt jeder 👀 Sicherheitsschuhe mit Stahlkappe — für Werkstatt, Umzug und Garten. CHF 14.90 · Gratis Versand ab CHF 50 · Klarna …»
- Produkt: Sicherheits-Schuhe mit Stahlkappe (ACTIVE, https://luxestyle.ch/products/sicherheits-schuhe-mit-stahlkappe-695232, SKU CJ-CJNS109710401AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 27.90–41.90 («Sicherheits-Schuhe mit Stahlkappe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Facebook reel · 2026-09-26 08:27 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1684116469801173/ · Zwilling: https://www.instagram.com/reel/DdvmkBckZrO/
- Text: «Genau das hat gefehlt 👀 «Multifunktionaler Gemüseschneider mit Spiralschneider» — Dieser multifunktionale Gemüseschneider mit Handkurbel u…»
- Produkt: Multifunktionaler Gemüseschneider mit Spiralschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-gemuseschneider-mit-spiralsc-623700, SKU CJ-2409131134451623700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 21.90 («Multifunktionaler Gemüseschneider mit Spiralschneider», Zuordnung: Link im Text)  
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
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 25.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### FEHLER · Pinterest pin · 2026-09-24 04:50 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581236221/
- Text: «Alltag, aber glänzender 👀 «Wasserdichte Damenuhr mit Metallarmband» — Diese Armbanduhr zeigt dir zuverlässig die Zeit an und ist ein schön…»
- Produkt: Wasserdichte Damenuhr mit Metallarmband (ACTIVE, https://luxestyle.ch/products/wasserdichte-damenuhr-mit-metallarmband-2a910e, SKU CJ-0402F562-D0B3-4AD4-9262-A) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 32.90, Shop CHF 34.90 («Wasserdichte Damenuhr mit Metallarmband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-23 04:53 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152467/
- Text: «Endlich Ruhe beim Gassi? 👀 «Futterspender für Hunde» — Dieser Futterspender ist ein interaktives Spielzeug für deinen Hund, das die Futter…»
- Produkt: Futterspender für Hunde (ACTIVE, https://luxestyle.ch/products/futterspender-fur-hunde-bc09f6, SKU CJ-F5BA858E-89C8-4A3C-8DDD-4) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90 («Futterspender für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-22 13:02 UTC gepostet: https://www.pinterest.com/pin/1111333645581093478/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-04 21:29 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582162811/
- Text: «Smartwatch mit Sprachassistent und NFC Für den Alltag und beim Sport hast du mit dieser Smartwatch alle wichtigen Funktionen am Handgelenk.…»
- Produkt: Smartwatch mit Sprachassistent und NFC (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-sprachassistent-und-nfc-909376, SKU CJ-1640991018503909376) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 42.90, Shop CHF 45.90 («Smartwatch mit Sprachassistent und NFC», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-04 21:28 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582162695/
- Text: «Weitläufiger Flurblumen‑Mantel XL Für kalte Tage, wenn du dich warm halten möchtest, bietet dieser Flurblumen‑Mantel aus Polyester einen an…»
- Produkt: Weiter Mantel mit Blumenmuster, XL (ACTIVE, https://luxestyle.ch/products/weitlaufiger-flurblumen-mantel-xl-601800, SKU CJ-CJYD290999401AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 25.90 («Weiter Mantel mit Blumenmuster, XL», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-04 21:27 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582162603/
- Text: «MP3-Player mit Touch-Display Für unterwegs, wenn du Musik hören möchtest. Der kompakte MP3-Player wiegt 150 g, unterstützt die Wiedergabe v…»
- Produkt: MP3-Player mit Touch-Display (ACTIVE, https://luxestyle.ch/products/mp3-player-mit-touch-display-075584, SKU CJ-1493151552075075584) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 25.90, Shop CHF 27.90 («MP3-Player mit Touch-Display», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-04 21:26 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582162491/
- Text: «Krokodillmuster Lederschuhe mit Metallbremse Für den Büroalltag und legere Anlässe schützen diese Lederschuhe mit spitzem Zeh und Metallbre…»
- Produkt: Herren-Lederschuhe mit Krokomuster und Metallschnallen (ACTIVE, https://luxestyle.ch/products/krokodillmuster-lederschuhe-mit-metallbremse-630900, SKU CJ-2610011000311630900) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 33.90, Shop CHF 35.90 («Herren-Lederschuhe mit Krokomuster und Metallschnallen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-04 21:16 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582161803/
- Text: «Mini Bluetooth Lautsprecher mit Spiegel Für den Alltag, wenn du Musik hören und gleichzeitig dein Make‑up prüfen willst, bietet dieser komp…»
- Produkt: Mini Bluetooth Lautsprecher mit Spiegel (ACTIVE, https://luxestyle.ch/products/mini-bluetooth-lautsprecher-mit-spiegel-821120, SKU CJ-1635901211666821120) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 20.90, Shop CHF 21.90 («Mini Bluetooth Lautsprecher mit Spiegel», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-04 21:15 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582161737/
- Text: «Slim-Fit Down-Jackett mit weissem Federfüllung An kalten Wintertagen hält dieser Jackett dich warm, ohne dich zu beschweren. Er enthält 51–…»
- Produkt: Slim-Fit Daunenjacke mit weisser Federfüllung (ACTIVE, https://luxestyle.ch/products/slim-fit-down-jackett-mit-weissem-federfullung-636300, SKU CJ-CJYD290729202BY) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 28.90, Shop CHF 30.90–31.90 («Slim-Fit Daunenjacke mit weisser Federfüllung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-03 20:34 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582067880/
- Text: «Künstliche Nägel im Magazin-Stil Für einen besonderen Anlass oder einfach, um deine Hände zu verschönern, sind diese künstlichen Nägel eine…»
- Produkt: Künstliche Nägel im Magazin-Stil (ACTIVE, https://luxestyle.ch/products/kunstliche-nagel-im-magazin-stil-985728, SKU CJ-1485148178150985728) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90 («Künstliche Nägel im Magazin-Stil», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-03 20:28 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582067413/
- Text: «Bluetooth Smartwatch MAX7 – 1,32" Display Für den Alltag, wenn du unterwegs bist, bietet diese Smartwatch ein kompaktes 1,32" Display. Die …»
- Produkt: Bluetooth Smartwatch MAX7 – 1,32" Display (ACTIVE, https://luxestyle.ch/products/bluetooth-smartwatch-max7-1-32-display-578688, SKU CJ-1634490915710578688) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 44.90, Shop CHF 47.90 («Bluetooth Smartwatch MAX7 – 1,32" Display», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-10-03 20:27 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582067326/
- Text: «Cowboy-Longsleeve-Kleid in Dunkelblau Für den Büroalltag bietet es ein luftiges, lockeres Design. Das Kleid ist aus 100 % Baumwolle geferti…»
- Produkt: Jeanskleid mit langen Ärmeln in Dunkelblau (ACTIVE, https://luxestyle.ch/products/cowboy-longsleeve-kleid-in-dunkelblau-618000, SKU CJ-2610010909131618000) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 24.90 («Jeanskleid mit langen Ärmeln in Dunkelblau», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Facebook reel · 2026-09-28 14:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1451952913459706/ · Zwilling: https://www.instagram.com/reel/Dd1YiSEDDur/
- Text: «Outfit fertig in 10 Sekunden 👀 «Laptop-Tasche für Herren» — Die vielseitige Laptop-Tasche für Herren ist der ideale Begleiter für Büro und…»
- Produkt: Laptop-Tasche für Herren (ACTIVE, https://luxestyle.ch/products/laptop-tasche-fur-herren-121536, SKU CJ-1735263488685121536) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 17.90 («Laptop-Tasche für Herren», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · Pinterest pin · 2026-09-28 04:52 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581583435/
- Text: «Das trägt jetzt jeder 👀 Sicherheitsschuhe mit Stahlkappe — für Werkstatt, Umzug und Garten. CHF 14.90 · Gratis Versand ab CHF 50 · Klarna …»
- Produkt: Sicherheits-Schuhe mit Stahlkappe (ACTIVE, https://luxestyle.ch/products/sicherheits-schuhe-mit-stahlkappe-695232, SKU CJ-CJNS109710401AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 27.90–41.90 («Sicherheits-Schuhe mit Stahlkappe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · YouTube video · 2026-09-27 22:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/UH9JgDDEm0c
- Text: «Dein neues Lieblingsteil? 👀 «Business Rucksack Herren mit Hartschale» — Dieser Business Rucksack für Herren kombiniert Funktionalität mit …»
- Produkt: Business Rucksack Herren mit Hartschale (ACTIVE, https://luxestyle.ch/products/business-rucksack-herren-mit-hartschale-605400, SKU CJ-2407111004261605400) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 53.90, Shop CHF 56.90 («Business Rucksack Herren mit Hartschale», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Pinterest pin · 2026-09-27 04:58 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581487706/
- Text: «Genau das hat gefehlt 👀 «Multifunktionaler Gemüseschneider mit Spiralschneider» — Dieser multifunktionale Gemüseschneider mit Handkurbel u…»
- Produkt: Multifunktionaler Gemüseschneider mit Spiralschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-gemuseschneider-mit-spiralsc-623700, SKU CJ-2409131134451623700) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 21.90 («Multifunktionaler Gemüseschneider mit Spiralschneider», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-27 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581487084/
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90–23.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · YouTube video · 2026-09-26 16:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/jhtQZw_SZOI
- Text: «Wusstest du das schon? 👀 «3-in-1 Bambus Dispenser für Folien und Wachspapier» — Dieser praktische 3-in-1 Dispenser aus Bambus bringt Ordnu…»
- Produkt: 3-in-1 Bambus Dispenser für Folien und Wachspapier (DRAFT, nicht im Onlineshop, SKU CJ-1772531457106386944) — Zuordnung: Link im Text
- **FEHLER PRODUKT:** Beworbenes Produkt «3-in-1 Bambus Dispenser für Folien und Wachspapier» ist DRAFT, nicht im Onlineshop (Zuordnung: Link im Text)  
  → Vorschlag: Produkt nicht kaufbar: löschen und sauber neu posten. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

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
- **FEHLER PREIS:** Lockpreis: Caption CHF 24.90, Shop CHF 26.90 («Schwimmboje mit Doppelairbag & Rucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-25 04:50 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581314558/
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Farbprojektionslampe» — Die Farbprojektionslampe ist ein einzigartiges Lichtobjekt, das deine Räume in ei…»
- Produkt: Farbprojektionslampe (ACTIVE, https://luxestyle.ch/products/farbprojektionslampe-619700, SKU CJ-2408210642591619700) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 20.90 («Farbprojektionslampe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · Pinterest pin · 2026-09-25 04:50 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581314528/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- Produkt: Smartwatch mit Touchscreen, Herzfrequenz und SpO2 (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-touchscreen-herzfrequenz-und-sp-118592, SKU CJ-1723156051115118592) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 25.90 («Smartwatch mit Touchscreen, Herzfrequenz und SpO2», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### FEHLER · YouTube video · 2026-09-24 16:30 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/V0oNnyp47Lg
- Text: «Wusstest du das schon? 👀 «Sit-Up-Hilfe mit Saugnapf für Bauchmuskeln» — Diese Sit-Up-Hilfe unterstützt dich beim Bauchmuskeltraining zu Ha…»
- Produkt: Sit-Up-Hilfe mit Saugnapf für Bauchmuskeln (ACTIVE, https://luxestyle.ch/products/sit-up-hilfe-mit-saugnapf-fur-bauchmuskeln-617216, SKU CJ-1379707815668617216) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 33.90, Shop CHF 36.90 («Sit-Up-Hilfe mit Saugnapf für Bauchmuskeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · YouTube video · 2026-09-24 10:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/05xytYjA4NQ
- Text: «Das Teil, nach dem alle fragen 👀 «Offener Manschetten-Armreif aus Titanstahl» — Dieser Armreif aus hochwertigem Edelstahl besticht durch s…»
- Produkt: Offener Manschetten-Armreif aus Titanstahl (ACTIVE, https://luxestyle.ch/products/offener-manschetten-armreif-aus-titanstahl-628800, SKU CJ-2603021237101628800) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 15.90, Shop CHF 21.90 («Offener Manschetten-Armreif aus Titanstahl», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### FEHLER · Facebook album · 2026-09-24 05:48 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140391547350792 · Zwilling: https://www.instagram.com/p/DdqK05YFML3/
- Text: «🎃 Halloween-Deko: Sprechende Kürbis-Süssigkeitenschale · CHF 23.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage…»
- Produkt: Sprechende Kürbis-Süssigkeitenschale (ACTIVE, https://luxestyle.ch/products/sprechende-kurbis-sussigkeitenschale-727424, SKU CJ-1702149960650727424) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 23.90, Shop CHF 31.90 («Sprechende Kürbis-Süssigkeitenschale», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### FEHLER · YouTube video · 2026-09-23 18:54 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/joD73lTVlGM
- Text: «Dein neues Lieblingsteil? 👀 «Matcha-Set mit Schale und Zubehör» — Dieses vierteilige Matcha-Set ist ideal für die traditionelle Zubereitun…»
- Produkt: Matcha-Set mit Schale und Zubehör (ACTIVE, https://luxestyle.ch/products/matcha-set-mit-schale-und-zubehor-218560, SKU CJ-1736982514977218560) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 27.90, Shop CHF 35.90 («Matcha-Set mit Schale und Zubehör», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

<details><summary>121 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · TikTok video · 2026-09-23 06:37 UTC · 554 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7688585316826877216
- Text: «Kennst du das schon? 👀 «Tragbarer Smart-Projektor P62, HD-Auflösung» — Dieser tragbare Projektor P62 projiziert Inhalte von deinem Smartph…»
- Produkt: Tragbarer Smart-Projektor P62, HD-Auflösung (ACTIVE, https://luxestyle.ch/products/tragbarer-smart-projektor-p62-hd-auflosung-844800, SKU CJ-1443876506416844800) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 86.90, Shop CHF 85.90 («Tragbarer Smart-Projektor P62, HD-Auflösung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-10-01 18:50 UTC · 291 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7691743033481530656
- Text: «Dein neues Lieblingsteil? 👀 «Reise-Anzugtasche mit Schuhfach» — Mit einem Fassungsvermögen von 45 Litern bietet sie ausreichend Platz für …»
- Produkt: Reise-Anzugtasche mit Schuhfach (ACTIVE, https://luxestyle.ch/products/reise-anzugtasche-mit-schuhfach-601000, SKU CJ-2408040216121601000) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 74.90, Shop CHF 65.90 («Reise-Anzugtasche mit Schuhfach», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-28 10:05 UTC · 289 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7690494409925725473
- Text: «Dein Zuhause, gemütlicher 👀 «Lederrucksack Vintage Herren Rindsleder» — Der Lederrucksack im Vintage-Stil ist ein praktischer Begleiter fü…»
- Produkt: Lederrucksack Vintage Herren Rindsleder (ACTIVE, https://luxestyle.ch/products/lederrucksack-vintage-herren-rindsleder-782016, SKU CJ-1746117627677782016) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 91.90, Shop CHF 89.90 («Lederrucksack Vintage Herren Rindsleder», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-10-01 08:05 UTC · 288 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7691576663536061728
- Text: «Neu bei LuxeStyle 👀 «3D Rosen Eiswürfelform aus Silikon» — Diese vielseitige Silikonform in Rosenform ist ein echtes Multitalent für deine…»
- Produkt: 3D Rosen Eiswürfelform aus Silikon (ACTIVE, https://luxestyle.ch/products/3d-rosen-eiswurfelform-aus-silikon-915776, SKU CJ-1384754765635915776) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 19.90, Shop CHF 16.90 («3D Rosen Eiswürfelform aus Silikon», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-30 18:05 UTC · 287 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7691361202701651232
- Text: «Neu bei LuxeStyle 👀 «Schneidebrett aus Bambus mit Schublade» — Dieses rechteckige Schneidebrett aus Bambus ist eine praktische Ergänzung f…»
- Produkt: Schneidebrett aus Bambus mit Schublade (ACTIVE, https://luxestyle.ch/products/schneidebrett-aus-bambus-mit-schublade-578176, SKU CJ-1399597314246578176) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 104.90, Shop CHF 91.90 («Schneidebrett aus Bambus mit Schublade», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-10-02 10:05 UTC · 283 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7691978646071840033
- Text: «Wusstest du das schon? 👀 «Weinöffner mit Luftdruckpumpe» — Dieser handliche Weinöffner macht das Entkorken jeder Weinflasche zum Kinderspi…»
- Produkt: Weinöffner mit Luftdruckpumpe (ACTIVE, https://luxestyle.ch/products/weinoffner-mit-luftdruckpumpe-198db1, SKU CJ-0EA586E3-C468-433C-8E4E-B) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Weinöffner mit Luftdruckpumpe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-29 10:36 UTC · 274 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7690873425883090208
- Text: «Das fehlt in jeder Küche 👀 «Küchen-Roller» CHF 53.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/kuchen-roll…»
- Produkt: Küchen-Roller (ACTIVE, https://luxestyle.ch/products/kuchen-roller-169408, SKU CJ-1696914549217169408) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 53.90, Shop CHF 46.90 («Küchen-Roller», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-10-01 10:36 UTC · 272 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7691615811559116065
- Text: «Das fehlt in jeder Küche 👀 «Multifunktionale Abtropfschale für die Küche» — Diese multifunktionale Abtropfschale ist ein praktischer Helfe…»
- Produkt: Multifunktionale Abtropfschale für die Küche (ACTIVE, https://luxestyle.ch/products/multifunktionale-abtropfschale-fur-die-kuche-450240, SKU CJ-1411894303965450240) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 16.90, Shop CHF 14.90 («Multifunktionale Abtropfschale für die Küche», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-30 10:05 UTC · 271 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7691236478021684513
- Text: «Frühstück in 2 Minuten 👀 «7-teiliges Küchenhelfer-Set, Edelstahl & Silikon» — Dieses 7-teilige Küchenhelfer-Set aus hochwertigem 304er Ede…»
- Produkt: 7-teiliges Küchenhelfer-Set, Edelstahl & Silikon (ACTIVE, https://luxestyle.ch/products/7-teiliges-kuchenhelfer-set-edelstahl-silikon-652864, SKU CJ-1405082598895652864) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 50.90, Shop CHF 44.90 («7-teiliges Küchenhelfer-Set, Edelstahl & Silikon», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-10-02 18:05 UTC · 269 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7692102762787622177
- Text: «Endlich Ruhe beim Gassi? 👀 «LED Leuchtgeschirr für Hunde» — Dieses LED-Leuchtgeschirr für Hunde sorgt für mehr Sicherheit bei Spaziergänge…»
- Produkt: LED Leuchtgeschirr für Hunde (ACTIVE, https://luxestyle.ch/products/led-leuchtgeschirr-fur-hunde-205184, SKU CJ-1742131093098205184) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 24.90 («LED Leuchtgeschirr für Hunde», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-29 08:05 UTC · 269 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7690834465081281825
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Bluetooth, NFC und GPS» — Eine Smartwatch, die dir bei der täglichen Navigation, Ge…»
- Produkt: Smartwatch mit Bluetooth, NFC und GPS (ACTIVE, https://luxestyle.ch/products/smartwatch-mit-bluetooth-nfc-und-gps-551296, SKU CJ-1745985820810551296) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 50.90, Shop CHF 44.90 («Smartwatch mit Bluetooth, NFC und GPS», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-27 23:06 UTC · 268 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7690324471063874848
- Text: «Das trägt jetzt jeder 👀 «Minimalistischer Multifunktions-Reiserucksack» — Dieser 19-Zoll-Rucksack aus strapazierfähigem Oxford-Gewebe biet…»
- Produkt: Minimalistischer Multifunktions-Reiserucksack (ACTIVE, https://luxestyle.ch/products/minimalistischer-multifunktions-reiserucksack-452480, SKU CJ-1763435329618452480) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 107.90, Shop CHF 106.90 («Minimalistischer Multifunktions-Reiserucksack», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · TikTok video · 2026-09-29 18:37 UTC · 266 Aufrufe
- Post: https://www.tiktok.com/@luxestyle.ch/video/7690997466870697248
- Text: «Kennst du das schon? 👀 «Dream Sternenhimmel Projektor HD Laser» — Der Dream Sternenhimmel Projektor HD Laser verwandelt jeden Raum in eine…»
- Produkt: Dream Sternenhimmel Projektor HD Laser (ACTIVE, https://luxestyle.ch/products/dream-sternenhimmel-projektor-hd-laser-849664, SKU CJ-1747176162884849664) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 41.90, Shop CHF 37.90 («Dream Sternenhimmel Projektor HD Laser», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]

### WARNUNG · Instagram reel · 2026-10-02 15:21 UTC · 131 Aufrufe
- Post: https://www.instagram.com/reel/Dd_ywlfoMaE/ · Zwilling: https://www.facebook.com/reel/1628369782178782/
- Text: «Wusstest du das schon? 👀 «Handkurbel-Schäler für Äpfel und Birnen» — Dieser handliche Schäler revolutioniert das Schälen von Äpfeln und Bi…»
- Produkt: Handkurbel-Schäler für Äpfel und Birnen (ACTIVE, https://luxestyle.ch/products/handkurbel-schaler-fur-apfel-und-birnen-5235a8, SKU CJ-89D3EA68-37A4-4F3C-ADBE-8) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Handkurbel-Schäler für Äpfel und Birnen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-09-25 15:09 UTC · 126 Aufrufe
- Post: https://www.instagram.com/reel/Ddtv5Z1Epoh/ · Zwilling: https://www.facebook.com/reel/2342181933185415/
- Text: «Kleines Upgrade, grosser Glow 👀 «Pizzaroller und Teiglocher» — Dieses vielseitige Küchenwerkzeug vereinfacht die Zubereitung von Backwaren…»
- Produkt: Pizzaroller und Teiglocher (ACTIVE, https://luxestyle.ch/products/pizzaroller-und-teiglocher-279296, SKU CJ-1391639510676279296) — Zuordnung: Link im Text
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram reel · 2026-09-30 16:21 UTC · 118 Aufrufe
- Post: https://www.instagram.com/reel/Dd6wC1RiWEd/ · Zwilling: https://www.facebook.com/reel/1036507699423763/
- Text: «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, getragen von @tatjanalarsinamoira 💛 «Blumenkleid mit Schnürung» · CHF 24.90 «Mi…»
- Produkt: Blumenkleid mit Schnürung (ACTIVE, https://luxestyle.ch/products/blumenkleid-mit-schnurung-613000, SKU CJ-CJLY299268001AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 39.90, Shop CHF 24.90 («Blumenkleid mit Schnürung», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 20:27 UTC gepostet: https://www.instagram.com/p/Dd2CntDjDZs/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-09-03 21:20 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Dc1w4wMjkjZ/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122135101689350792
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- Produkt: Outdoor Bluetooth Speaker Solar – RGB-Licht, Wasserdicht & Tragbar (ACTIVE, https://luxestyle.ch/products/outdoor-bluetooth-speaker-solar-rgb-licht-wasserdicht-tragbar, SKU CJ-CJYS260671001AZ) — Zuordnung: Ledger kimi-dein-sound-f-r-jedes-abenteuer-s-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-09-28 23:09 UTC · 42 Aufrufe
- Post: https://www.instagram.com/reel/Dd2VJQIFPf6/ · Zwilling: https://www.facebook.com/reel/1408158774777080/
- Text: «Dein Hund wird es lieben 👀 «Reflektierendes Hunde-Brustgeschirr mit Leine» — Dieses Brustgeschirr mit Leine hilft dir, deinen Hund beim Sp…»
- Produkt: Reflektierendes Hunde-Brustgeschirr mit Leine (ACTIVE, https://luxestyle.ch/products/reflektierendes-hunde-brustgeschirr-mit-leine-050816, SKU CJ-1761567715766050816) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Reflektierendes Hunde-Brustgeschirr mit Leine», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 11:09 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DbVZgK_kv1U/
- Text: «Zeitlos elegant am Handgelenk – Saphirglas, Edelstahl und 50 m Wasserdichtigkeit für jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tage…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «it für jeden Tag. ⌚ Blitzversand aus der Schweiz: in»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «nd aus der Schweiz: in 1–2 Tagen bei dir. 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DbVQaq0lhRv/
- Text: «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser mit UV400 – dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxestyle.ch · Link in Bio»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «er mit UV400 – dank Blitzversand in 1-2 Tagen bei di»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «– dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-09-29 17:09 UTC · 32 Aufrufe
- Post: https://www.instagram.com/reel/Dd4QyVLD_y2/ · Zwilling: https://www.facebook.com/reel/1516076157227660/
- Text: «Küche, aber einfacher 👀 «Schnellauftauplatte für die Küche» — Die Schnellauftauplatte aus Aluminium ist ein praktischer Helfer in jeder Kü…»
- Produkt: Schnellauftauplatte für die Küche (ACTIVE, https://luxestyle.ch/products/schnellauftauplatte-fur-die-kuche-750720, SKU CJ-1422455623806750720) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 37.90, Shop CHF 33.90 («Schnellauftauplatte für die Küche», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 32 Aufrufe
- Post: https://www.instagram.com/p/DbVQZSWFoni/
- Text: «Stilvoll schlank, maximal sicher – unser Echtleder-Wallet mit RFID-Schutz begleitet dich überallhin. 🖤 Bestelle heute und geniesse Blitzve…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «heute und geniesse Blitzversand direkt aus der Schw»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-25 16:33 UTC · 29 Aufrufe
- Post: https://www.instagram.com/p/Ddt5dW5FNsS/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140807437350792
- Text: «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen · CHF 35.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkta…»
- Produkt: Kurzer Fleece-Kapuzenpullover für Damen (ACTIVE, https://luxestyle.ch/products/kurzer-fleece-kapuzenpullover-fur-damen-619400, SKU CJ-CJYD264678401AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Kurzer Fleece-Kapuzenpullover für Damen», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-10-01 20:40 UTC · 28 Aufrufe
- Post: https://www.instagram.com/p/Dd9yh8cjF7b/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142453423350792
- Text: «Eleganter Wollmantel mit Revers und Bindegürtel · CHF 48.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür …»
- Produkt: Eleganter Wollmantel mit Revers und Bindegürtel (ACTIVE, https://luxestyle.ch/products/eleganter-wollmantel-mit-revers-und-bindegurte-615500, SKU CJ-CJYD290679701AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 48.90, Shop CHF 42.90–44.90 («Eleganter Wollmantel mit Revers und Bindegürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-09-29 20:24 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/Dd4nKUeD_qe/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141900139350792
- Text: «Strickpullover Rundhals Loose-Fit · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angesc…»
- Produkt: Strickpullover Rundhals Loose-Fit (ACTIVE, https://luxestyle.ch/products/strickpullover-rundhals-loose-fit-634500, SKU CJ-CJMY293330002BY) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90 («Strickpullover Rundhals Loose-Fit», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-23 02:11 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DdnNSHEDMja/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140069977350792
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 12:07 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DbVgLAXHyd9/
- Text: «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Widerstandsstufen für maximale Flexibilität – mit Blitzversand aus der Schweiz direk…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Flexibilität – mit Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-25 23:08 UTC · 24 Aufrufe
- Post: https://www.instagram.com/p/Ddumv_9lNi3/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140880307350792
- Text: «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, da…»
- Produkt: USB Aroma Diffusor mit Befeuchter (ACTIVE, https://luxestyle.ch/products/usb-aroma-diffusor-mit-befeuchter-465152, SKU CJ-1525035291772465152) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («USB Aroma Diffusor mit Befeuchter», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-30 19:09 UTC · 21 Aufrufe
- Post: https://www.instagram.com/p/Dd7DUIujzrT/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142170619350792
- Text: «👀 Gerade besonders gefragt Y2K Harajuku Hoodie mit Nieten · CHF 20.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkt…»
- Produkt: Y2K Harajuku Hoodie mit Nieten (ACTIVE, https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700, SKU CJ-CJLS273231201AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 20.90, Shop CHF 18.90–19.90 («Y2K Harajuku Hoodie mit Nieten», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-27 20:01 UTC · 21 Aufrufe
- Post: https://www.instagram.com/p/Ddza2rvHVMo/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141356965350792
- Text: «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, …»
- Produkt: Kapuzen-Sweatshirt-Kleid mit Gürtel (ACTIVE, https://luxestyle.ch/products/kapuzen-sweatshirt-kleid-mit-gurtel-604900, SKU CJ-CJLY291801901AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Kapuzen-Sweatshirt-Kleid mit Gürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-29 10:10 UTC · 17 Aufrufe
- Post: https://www.instagram.com/p/Dd3g5S9FA18/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141772387350792
- Text: «🍂 Herbst-Favorit Overknee-Stiefel mit Schnürung und Blockabsatz · CHF 41.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20…»
- Produkt: Overknee-Stiefel mit Schnürung und Blockabsatz (ACTIVE, https://luxestyle.ch/products/overknee-stiefel-mit-schnurung-und-blockabsatz-621200, SKU CJ-CJNS273407101AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 41.90, Shop CHF 36.90–38.90 («Overknee-Stiefel mit Schnürung und Blockabsatz», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-09-30 13:00 UTC · 16 Aufrufe
- Post: https://www.instagram.com/reel/Dd6ZB2Djknh/ · Zwilling: https://www.facebook.com/reel/1666245875100500/
- Text: «Dein Hund wird es lieben 👀 «Hunde-Geschirr mit Leine, tragbar» — Dieses tragbare Hundegeschirr mit passender Leine ist ideal für den tägli…»
- Produkt: Hunde-Geschirr mit Leine, tragbar (ACTIVE, https://luxestyle.ch/products/hunde-geschirr-mit-leine-tragbar-224832, SKU CJ-1794612172111224832) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Hunde-Geschirr mit Leine, tragbar», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-26 06:09 UTC · 16 Aufrufe
- Post: https://www.instagram.com/p/DdvW8OwFLBZ/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140943505350792
- Text: «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-Stil · CHF 43.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 W…»
- Produkt: Martin Ankle Boots im britischen Casual-Stil (ACTIVE, https://luxestyle.ch/products/martin-ankle-boots-im-britischen-casual-stil-600000, SKU CJ-CJNS217947101AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 43.90, Shop CHF 38.90 («Martin Ankle Boots im britischen Casual-Stil», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-29 16:27 UTC · 15 Aufrufe
- Post: https://www.instagram.com/p/Dd4L-PdjV4S/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141854365350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- Produkt: Plüsch Alligator (ACTIVE, https://luxestyle.ch/products/plusch-alligator-fga88595, SKU fortura-88595) — Zuordnung: erste Zeile
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG PREIS:** veraltet: Caption CHF 29.90, Shop CHF 26.90 («Plüsch Alligator», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-10-02 07:13 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/Dd-695XlAkF/ · Zwilling: https://www.facebook.com/reel/2590638451401655/
- Text: «Küche, aber einfacher 👀 «Handmixer mit 5 Geschwindigkeiten» — Dieser Handmixer ist ein unverzichtbarer Helfer in jeder Küche. CHF 28.90 · …»
- Produkt: Handmixer mit 5 Geschwindigkeiten (ACTIVE, https://luxestyle.ch/products/handmixer-mit-5-geschwindigkeiten-694c50, SKU CJ-44E4345F-E33C-49EF-B436-9) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Handmixer mit 5 Geschwindigkeiten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-10-01 23:12 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/Dd-D2V1nTgU/ · Zwilling: https://www.facebook.com/reel/1111970258030994/
- Text: «Genau das hat gefehlt 👀 «Gemüseschneider mit Reiben und Hobeln» — Dieser praktische Küchenhelfer vereinfacht das Schneiden und Zerkleinern…»
- Produkt: Gemüseschneider mit Reiben und Hobeln (ACTIVE, https://luxestyle.ch/products/gemuseschneider-mit-reiben-und-hobeln-964352, SKU CJ-1387598618436964352) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Gemüseschneider mit Reiben und Hobeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram karussell · 2026-09-30 20:27 UTC · 13 Aufrufe
- Post: https://www.instagram.com/p/Dd7MPHWj3ku/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142184773350792
- Text: «HD Mini-Projektor für Zuhause · CHF 98.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrie…»
- Produkt: HD Mini-Projektor für Zuhause (ACTIVE, https://luxestyle.ch/products/home-hd-portable-projector-239616, SKU CJ-1727567465632239616) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 98.90, Shop CHF 86.90 («HD Mini-Projektor für Zuhause», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild (Medium 3/8): new, your, into  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram reel · 2026-09-29 08:11 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/Dd3TIwtiGNg/
- Text: «Wusstest du das schon? 👀 «Vegetarische Schredder-Box» CHF 33.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/…»
- Produkt: Gemüseschneider mit Auffangbox · 8 Einsätze (ACTIVE, https://luxestyle.ch/products/vegetarische-schredder-box-342016, SKU CJ-1694549489312342016) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Gemüseschneider mit Auffangbox · 8 Einsätze», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-28 14:18 UTC · 13 Aufrufe
- Post: https://www.instagram.com/p/Dd1YfDSDX-4/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141546235350792
- Text: «🛒 Schon von Kund:innen bestellt Multifunktionaler runder Gemüseschneider · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefer…»
- Produkt: Multifunktionaler runder Gemüseschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-runder-gemuseschneider-be2e21, SKU CJ-CJJJCFCF00364-Red) — Zuordnung: erste Zeile
- **WARNUNG FORMAT:** Bild 480×480 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest pin · 2026-10-01 20:16 UTC · 11 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581888230/
- Text: «Midikleid mit Zopfmuster und Blumenprint Dieses ärmellose Midikleid präsentiert sich im eleganten Zopfmuster und ist mit einem charmanten b…»
- Produkt: Midikleid mit Zopfmuster und Blumenprint (ACTIVE, https://luxestyle.ch/products/midikleid-mit-zopfmuster-und-blumenprint-600200, SKU CJ-CJLY296508601AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-29 04:47 UTC gepostet: https://www.pinterest.com/pin/1111333645581667020/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-09-29 03:09 UTC · 11 Aufrufe
- Post: https://www.instagram.com/p/Dd2wskBlPZN/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141690895350792
- Text: «🍂 Herbst-Favorit Warme Winter-Hausschuhe · CHF 33.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlic…»
- Produkt: Warme Winter-Hausschuhe (ACTIVE, https://luxestyle.ch/products/warme-winter-hausschuhe-063744, SKU CJ-CJNY131339201AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Warme Winter-Hausschuhe», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-10-01 06:15 UTC · 10 Aufrufe
- Post: https://www.instagram.com/reel/Dd8Phq_GZlZ/ · Zwilling: https://www.facebook.com/reel/1675461947335590/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler manueller Massageroller» — Dieser vielseitige Massageroller wurde entwickelt, um Muskel…»
- Produkt: Multifunktionaler manueller Massageroller (ACTIVE, https://luxestyle.ch/products/multifunktionaler-manueller-massageroller-851904, SKU CJ-1633750013945851904) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Multifunktionaler manueller Massageroller», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG TON:** übersteuert: True Peak +1.1 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-10-02 09:11 UTC · 7 Aufrufe
- Post: https://www.instagram.com/p/Dd_IenVDLiC/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142592419350792
- Text: «🍂 Herbst-Favorit Britisches Teeservice «Luxury» · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür…»
- Produkt: Britisches Teeservice «Luxury» (ACTIVE, https://luxestyle.ch/products/britisches-teeservice-luxury-571968, SKU CJ-1533076372447571968) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Britisches Teeservice «Luxury»», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-09-30 19:09 UTC · 7 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142170619350792 · Zwilling: https://www.instagram.com/p/Dd7DUIujzrT/
- Text: «👀 Gerade besonders gefragt Y2K Harajuku Hoodie mit Nieten · CHF 20.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkt…»
- Produkt: Y2K Harajuku Hoodie mit Nieten (ACTIVE, https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700, SKU CJ-CJLS273231201AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 20.90, Shop CHF 18.90–19.90 («Y2K Harajuku Hoodie mit Nieten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-02 20:17 UTC · 6 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581976237/
- Text: «Multifunktionaler runder Gemüseschneider Der multifunktionale Gemüseschneider ist ein praktisches Küchengerät, das dir hilft, Gemüse, Karto…»
- Produkt: Multifunktionaler runder Gemüseschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-runder-gemuseschneider-be2e21, SKU CJ-CJJJCFCF00364-Red) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-29 04:47 UTC gepostet: https://www.pinterest.com/pin/1111333645581667021/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook album · 2026-09-30 20:27 UTC · 6 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142184773350792 · Zwilling: https://www.instagram.com/p/Dd7MPHWj3ku/
- Text: «HD Mini-Projektor für Zuhause · CHF 98.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrie…»
- Produkt: HD Mini-Projektor für Zuhause (ACTIVE, https://luxestyle.ch/products/home-hd-portable-projector-239616, SKU CJ-1727567465632239616) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 98.90, Shop CHF 86.90 («HD Mini-Projektor für Zuhause», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-23 02:08 UTC · 6 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140069977350792 · Zwilling: https://www.instagram.com/p/DdnNSHEDMja/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- Produkt: Rosenquarz Gua Sha Set (ACTIVE, https://luxestyle.ch/products/rosenquarz-gua-sha-set, SKU LX-21-ROSENQUARZ-GUA-SHA-SET) — Zuordnung: Ledger kimi-verw-hne-deine-haut-mit-dem-rose-15
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-02 20:26 UTC · 4 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581976832/
- Text: «Nibosi Quarzuhr mit Edelstahlband Diese Quarzuhr ist ein praktisches Accessoire für deinen Alltag und zeigt dir stets zuverlässig die Zeit …»
- Produkt: Nibosi Quarzuhr mit Edelstahlband (ACTIVE, https://luxestyle.ch/products/nibosi-quarzuhr-mit-edelstahlband-e89d0a, SKU CJ-65D5329E-AA72-43AD-910B-F) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 38.90, Shop CHF 34.90 («Nibosi Quarzuhr mit Edelstahlband», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 20:27 UTC · 3 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581889000/
- Text: «Y2K Harajuku Hoodie mit Nieten Dieses trendige zweiteilige Set im Harajuku-Stil ist perfekt für Teenager und junge Erwachsene, die einen au…»
- Produkt: Y2K Harajuku Hoodie mit Nieten (ACTIVE, https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700, SKU CJ-CJLS273231201AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 20.90, Shop CHF 18.90–19.90 («Y2K Harajuku Hoodie mit Nieten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-01 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645581833288/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-10-01 06:16 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1675461947335590/ · Zwilling: https://www.instagram.com/reel/Dd8Phq_GZlZ/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler manueller Massageroller» — Dieser vielseitige Massageroller wurde entwickelt, um Muskel…»
- Produkt: Multifunktionaler manueller Massageroller (ACTIVE, https://luxestyle.ch/products/multifunktionaler-manueller-massageroller-851904, SKU CJ-1633750013945851904) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Multifunktionaler manueller Massageroller», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-01 02:10 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142247113350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Badeset Dino Duft Apfel · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- Produkt: Badeset Dino Duft Apfel (ACTIVE, https://luxestyle.ch/products/badeset-dino-duft-apfel-fgaac6057117, SKU fortura-AC6057117) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Badeset Din»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Badeset Dino Duft Apfel», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Bild 540×540 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-30 16:21 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1036507699423763/ · Zwilling: https://www.instagram.com/reel/Dd6wC1RiWEd/
- Text: «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, getragen von @tatjanalarsinamoira 💛 «Blumenkleid mit Schnürung» · CHF 24.90 «Mi…»
- Produkt: Blumenkleid mit Schnürung (ACTIVE, https://luxestyle.ch/products/blumenkleid-mit-schnurung-613000, SKU CJ-CJLY299268001AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 39.90, Shop CHF 24.90 («Blumenkleid mit Schnürung», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 20:27 UTC gepostet: https://www.facebook.com/122102579637350792/posts/122141619129350792  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-30 13:00 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1666245875100500/ · Zwilling: https://www.instagram.com/reel/Dd6ZB2Djknh/
- Text: «Dein Hund wird es lieben 👀 «Hunde-Geschirr mit Leine, tragbar» — Dieses tragbare Hundegeschirr mit passender Leine ist ideal für den tägli…»
- Produkt: Hunde-Geschirr mit Leine, tragbar (ACTIVE, https://luxestyle.ch/products/hunde-geschirr-mit-leine-tragbar-224832, SKU CJ-1794612172111224832) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Hunde-Geschirr mit Leine, tragbar», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-09-29 17:10 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1516076157227660/ · Zwilling: https://www.instagram.com/reel/Dd4QyVLD_y2/
- Text: «Küche, aber einfacher 👀 «Schnellauftauplatte für die Küche» — Die Schnellauftauplatte aus Aluminium ist ein praktischer Helfer in jeder Kü…»
- Produkt: Schnellauftauplatte für die Küche (ACTIVE, https://luxestyle.ch/products/schnellauftauplatte-fur-die-kuche-750720, SKU CJ-1422455623806750720) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 37.90, Shop CHF 33.90 («Schnellauftauplatte für die Küche», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-03 21:20 UTC · 3 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122135101689350792 · Zwilling: https://www.instagram.com/p/Dc1w4wMjkjZ/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-02 20:28 UTC · 2 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581976932/
- Text: «2-in-1 Glätteisen & Lockenstab mit Display Dieses vielseitige 2-in-1 Styling-Tool vereint Glätteisen und Lockenstab in einem Gerät. Kreiere…»
- Produkt: 2-in-1 Glätteisen & Lockenstab mit Display (ACTIVE, https://luxestyle.ch/products/2-in-1-glatteisen-lockenstab-mit-display-590400, SKU CJ-1603213630399590400) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 24.90 («2-in-1 Glätteisen & Lockenstab mit Display», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-10-01 23:12 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1111970258030994/ · Zwilling: https://www.instagram.com/reel/Dd-D2V1nTgU/
- Text: «Genau das hat gefehlt 👀 «Gemüseschneider mit Reiben und Hobeln» — Dieser praktische Küchenhelfer vereinfacht das Schneiden und Zerkleinern…»
- Produkt: Gemüseschneider mit Reiben und Hobeln (ACTIVE, https://luxestyle.ch/products/gemuseschneider-mit-reiben-und-hobeln-964352, SKU CJ-1387598618436964352) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Gemüseschneider mit Reiben und Hobeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-30 12:18 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142095595350792 · Zwilling: https://www.instagram.com/p/Dd6UQDolC60/
- Text: «👀 Gerade besonders gefragt Leinenhemd Langarm · CHF 16.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür e…»
- Produkt: Leinenhemd Langarm – Lässig & Bequem (ACTIVE, https://luxestyle.ch/products/leinenhemd-langarm-lassig-bequem-621700, SKU CJ-CJDS293306601AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 16.90, Shop CHF 14.90–15.90 («Leinenhemd Langarm – Lässig & Bequem», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-29 10:10 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141772387350792 · Zwilling: https://www.instagram.com/p/Dd3g5S9FA18/
- Text: «🍂 Herbst-Favorit Overknee-Stiefel mit Schnürung und Blockabsatz · CHF 41.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20…»
- Produkt: Overknee-Stiefel mit Schnürung und Blockabsatz (ACTIVE, https://luxestyle.ch/products/overknee-stiefel-mit-schnurung-und-blockabsatz-621200, SKU CJ-CJNS273407101AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 41.90, Shop CHF 36.90–38.90 («Overknee-Stiefel mit Schnürung und Blockabsatz», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-09-29 08:11 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/2103258493619795/
- Text: «Wusstest du das schon? 👀 «Vegetarische Schredder-Box» CHF 33.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 https://luxestyle.ch/p…»
- Produkt: Gemüseschneider mit Auffangbox · 8 Einsätze (ACTIVE, https://luxestyle.ch/products/vegetarische-schredder-box-342016, SKU CJ-1694549489312342016) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Gemüseschneider mit Auffangbox · 8 Einsätze», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-29 03:09 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141690895350792 · Zwilling: https://www.instagram.com/p/Dd2wskBlPZN/
- Text: «🍂 Herbst-Favorit Warme Winter-Hausschuhe · CHF 33.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlic…»
- Produkt: Warme Winter-Hausschuhe (ACTIVE, https://luxestyle.ch/products/warme-winter-hausschuhe-063744, SKU CJ-CJNY131339201AZ) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Warme Winter-Hausschuhe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-03 23:09 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122143127673350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse Kellner · CHF 38.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- Produkt: Geldbörse Kellner (ACTIVE, https://luxestyle.ch/products/geldborse-kellner-fga26666, SKU fortura-26666) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-02 20:24 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581976713/
- Text: «Blumenkleid mit Schnürung Dieses schicke Kleid ist mit einem blumigen Muster bedruckt und hat eine figurbetonte Taille. Es ist aus Polyeste…»
- Produkt: Blumenkleid mit Schnürung (ACTIVE, https://luxestyle.ch/products/blumenkleid-mit-schnurung-613000, SKU CJ-CJLY299268001AZ) — Zuordnung: Link im Text
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-29 04:47 UTC gepostet: https://www.pinterest.com/pin/1111333645581667027/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-10-02 07:14 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/2590638451401655/ · Zwilling: https://www.instagram.com/reel/Dd-695XlAkF/
- Text: «Küche, aber einfacher 👀 «Handmixer mit 5 Geschwindigkeiten» — Dieser Handmixer ist ein unverzichtbarer Helfer in jeder Küche. CHF 28.90 · …»
- Produkt: Handmixer mit 5 Geschwindigkeiten (ACTIVE, https://luxestyle.ch/products/handmixer-mit-5-geschwindigkeiten-694c50, SKU CJ-44E4345F-E33C-49EF-B436-9) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Handmixer mit 5 Geschwindigkeiten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-02 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581916552/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Schweizer Lampion-Set · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand…»
- Produkt: Schweizer Lampion-Set (ACTIVE, https://luxestyle.ch/products/schweizer-lampion-set-fga86780, SKU fortura-86780) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Schweizer L»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Schweizer Lampion-Set», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833289/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Badeset Dino Duft Apfel · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- Produkt: Badeset Dino Duft Apfel (ACTIVE, https://luxestyle.ch/products/badeset-dino-duft-apfel-fgaac6057117, SKU fortura-AC6057117) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Badeset Din»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Badeset Dino Duft Apfel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook album · 2026-09-29 20:25 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141900139350792 · Zwilling: https://www.instagram.com/p/Dd4nKUeD_qe/
- Text: «Strickpullover Rundhals Loose-Fit · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angesc…»
- Produkt: Strickpullover Rundhals Loose-Fit (ACTIVE, https://luxestyle.ch/products/strickpullover-rundhals-loose-fit-634500, SKU CJ-CJMY293330002BY) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90 («Strickpullover Rundhals Loose-Fit», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-09-29 05:04 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581667814/
- Text: «Dein Hund wird es lieben 👀 «Reflektierendes Hunde-Brustgeschirr mit Leine» — Dieses Brustgeschirr mit Leine hilft dir, deinen Hund beim Sp…»
- Produkt: Reflektierendes Hunde-Brustgeschirr mit Leine (ACTIVE, https://luxestyle.ch/products/reflektierendes-hunde-brustgeschirr-mit-leine-050816, SKU CJ-1761567715766050816) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Reflektierendes Hunde-Brustgeschirr mit Leine», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-09-28 23:09 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1408158774777080/ · Zwilling: https://www.instagram.com/reel/Dd2VJQIFPf6/
- Text: «Dein Hund wird es lieben 👀 «Reflektierendes Hunde-Brustgeschirr mit Leine» — Dieses Brustgeschirr mit Leine hilft dir, deinen Hund beim Sp…»
- Produkt: Reflektierendes Hunde-Brustgeschirr mit Leine (ACTIVE, https://luxestyle.ch/products/reflektierendes-hunde-brustgeschirr-mit-leine-050816, SKU CJ-1761567715766050816) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Reflektierendes Hunde-Brustgeschirr mit Leine», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-26 06:10 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140943505350792 · Zwilling: https://www.instagram.com/p/DdvW8OwFLBZ/
- Text: «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-Stil · CHF 43.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 W…»
- Produkt: Martin Ankle Boots im britischen Casual-Stil (ACTIVE, https://luxestyle.ch/products/martin-ankle-boots-im-britischen-casual-stil-600000, SKU CJ-CJNS217947101AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 43.90, Shop CHF 38.90 («Martin Ankle Boots im britischen Casual-Stil», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-09-25 15:10 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/2342181933185415/ · Zwilling: https://www.instagram.com/reel/Ddtv5Z1Epoh/
- Text: «Kleines Upgrade, grosser Glow 👀 «Pizzaroller und Teiglocher» — Dieses vielseitige Küchenwerkzeug vereinfacht die Zubereitung von Backwaren…»
- Produkt: Pizzaroller und Teiglocher (ACTIVE, https://luxestyle.ch/products/pizzaroller-und-teiglocher-279296, SKU CJ-1391639510676279296) — Zuordnung: Link im Text
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-09-23 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152144/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram bild · 2026-10-04 22:35 UTC · n/a Aufrufe
- Post: https://www.instagram.com/stories/luxestyle.ch/4000746607703894231 · Zwilling: https://facebook.com/122108214291350792/posts/2101815593779290
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook bild · 2026-10-04 22:35 UTC · n/a Aufrufe
- Post: https://facebook.com/122108214291350792/posts/2101815593779290 · Zwilling: https://www.instagram.com/stories/luxestyle.ch/4000746607703894231
- Text: «»
- **WARNUNG TEXT:** Beitrag ohne Text  
  → Vorschlag: Caption ergänzen. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-10-04 21:30 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582162899/
- Text: «Plüsch-Hundegeschirr mit Leine Dieses weiche Hundegeschirr mit Leine ist für tägliche Spaziergänge mit deinem Haustier gedacht. Es besteht …»
- Produkt: Plüsch-Hundegeschirr mit Leine (ACTIVE, https://luxestyle.ch/products/plusch-hundegeschirr-mit-leine-744320, SKU CJ-1612024004418744320) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Plüsch-Hundegeschirr mit Leine», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram karussell · 2026-10-04 21:23 UTC · 0 Aufrufe
- Post: https://www.instagram.com/p/DeFl3ChjZAe/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122143403307350792
- Text: «Smart Hundespielzeug · CHF 30.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrieben · 30 …»
- Produkt: Smart Hundespielzeug (ACTIVE, https://luxestyle.ch/products/smart-hundespielzeug-346624, SKU CJ-1356909656152346624) — Zuordnung: erste Zeile
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Bild (Medium 2/7): remote, safe, durable, mode, colour  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Pinterest pin · 2026-10-04 21:17 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582161862/
- Text: «USB-Heizkissen mit Graphen-Technologie Dieses tragbare Heizkissen sorgt für wohlige Wärme, egal ob zu Hause oder unterwegs. Das weiche Flan…»
- Produkt: USB-Heizkissen mit Graphen-Technologie (ACTIVE, https://luxestyle.ch/products/usb-heizkissen-mit-graphen-technologie-acad9f, SKU CJ-FFDB5A27-5965-46FE-A884-3) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («USB-Heizkissen mit Graphen-Technologie», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

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

### WARNUNG · Pinterest pin · 2026-10-04 04:47 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582096689/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse Kellner · CHF 38.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- Produkt: Geldbörse Kellner (ACTIVE, https://luxestyle.ch/products/geldborse-kellner-fga26666, SKU fortura-26666) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Geldbörse K»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-03 20:30 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582067570/
- Text: «Kinder-Halbstiefel aus Kunstleder Diese modischen Halbstiefel sind für Kinder konzipiert, die bequeme und robuste Schuhe für den Alltag ben…»
- Produkt: Kinder-Halbstiefel aus Kunstleder (ACTIVE, https://luxestyle.ch/products/kinder-halbstiefel-aus-kunstleder-356928, SKU CJ-CJBB106168901AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90–24.90 («Kinder-Halbstiefel aus Kunstleder», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-03 20:26 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582067229/
- Text: «Silikon-Gesichtsreinigungsbürste Diese Silikon-Gesichtsreinigungsbürste nutzt Ultraschall-Vibrationen, um deine Haut sanft und effektiv zu …»
- Produkt: Silikon-Gesichtsreinigungsbürste (ACTIVE, https://luxestyle.ch/products/silikon-gesichtsreinigungsburste-0787a2, SKU CJ-9AFB5911-3201-45F6-905D-1) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 36.90, Shop CHF 32.90 («Silikon-Gesichtsreinigungsbürste», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-03 20:25 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582067156/
- Text: «Kinder Erdbeer-Halbschuhe Diese Kinder-Halbschuhe sind für Kinder im Alter von 1 bis 3 Jahren geeignet und begleiten sie bei ihren ersten S…»
- Produkt: Kinder Erdbeer-Halbschuhe (ACTIVE, https://luxestyle.ch/products/kinder-erdbeer-halbschuhe-332480, SKU CJ-CJBB105690701AZ) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90–26.90 («Kinder Erdbeer-Halbschuhe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-03 05:08 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582006191/
- Text: «Küche, aber einfacher 👀 «Handmixer mit 5 Geschwindigkeiten» — Dieser Handmixer ist ein unverzichtbarer Helfer in jeder Küche. CHF 28.90 · …»
- Produkt: Handmixer mit 5 Geschwindigkeiten (ACTIVE, https://luxestyle.ch/products/handmixer-mit-5-geschwindigkeiten-694c50, SKU CJ-44E4345F-E33C-49EF-B436-9) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Handmixer mit 5 Geschwindigkeiten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-03 04:51 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582005286/
- Text: «Wusstest du das schon? 👀 «Handkurbel-Schäler für Äpfel und Birnen» — Dieser handliche Schäler revolutioniert das Schälen von Äpfeln und Bi…»
- Produkt: Handkurbel-Schäler für Äpfel und Birnen (ACTIVE, https://luxestyle.ch/products/handkurbel-schaler-fur-apfel-und-birnen-5235a8, SKU CJ-89D3EA68-37A4-4F3C-ADBE-8) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Handkurbel-Schäler für Äpfel und Birnen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-03 04:47 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645582005056/
- Text: «🍂 Herbst-Favorit Britisches Teeservice «Luxury» · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür…»
- Produkt: Britisches Teeservice «Luxury» (ACTIVE, https://luxestyle.ch/products/britisches-teeservice-luxury-571968, SKU CJ-1533076372447571968) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Britisches Teeservice «Luxury»», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-10-02 15:21 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1628369782178782/ · Zwilling: https://www.instagram.com/reel/Dd_ywlfoMaE/
- Text: «Wusstest du das schon? 👀 «Handkurbel-Schäler für Äpfel und Birnen» — Dieser handliche Schäler revolutioniert das Schälen von Äpfeln und Bi…»
- Produkt: Handkurbel-Schäler für Äpfel und Birnen (ACTIVE, https://luxestyle.ch/products/handkurbel-schaler-fur-apfel-und-birnen-5235a8, SKU CJ-89D3EA68-37A4-4F3C-ADBE-8) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Handkurbel-Schäler für Äpfel und Birnen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-02 15:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142708879350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz weiss · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- Produkt: Spinnennetz weiss (ACTIVE, https://luxestyle.ch/products/spinnennetz-weiss-fga95405, SKU fortura-95405) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 24.90 («Spinnennetz weiss», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-02 09:11 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142592419350792 · Zwilling: https://www.instagram.com/p/Dd_IenVDLiC/
- Text: «🍂 Herbst-Favorit Britisches Teeservice «Luxury» · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür…»
- Produkt: Britisches Teeservice «Luxury» (ACTIVE, https://luxestyle.ch/products/britisches-teeservice-luxury-571968, SKU CJ-1533076372447571968) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Britisches Teeservice «Luxury»», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · YouTube video · 2026-10-02 09:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/H0npELU4qGQ
- Text: «Dein neues Lieblingsteil? 👀 «Flip Reise-Rucksack mit grossem Fassungsvermögen» — Der Flip Reise-Rucksack ist dein idealer Begleiter für un…»
- Produkt: Flip Reise-Rucksack mit grossem Fassungsvermögen (ACTIVE, https://luxestyle.ch/products/flip-reise-rucksack-mit-grossem-fassungsvermog-626300, SKU CJ-2407250317401626300) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Flip Reise-Rucksack mit grossem Fassungsvermögen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### WARNUNG · Pinterest pin · 2026-10-02 05:22 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581918302/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler manueller Massageroller» — Dieser vielseitige Massageroller wurde entwickelt, um Muskel…»
- Produkt: Multifunktionaler manueller Massageroller (ACTIVE, https://luxestyle.ch/products/multifunktionaler-manueller-massageroller-851904, SKU CJ-1633750013945851904) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Multifunktionaler manueller Massageroller», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-02 04:50 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581916695/
- Text: «Genau das hat gefehlt 👀 «Gemüseschneider mit Reiben und Hobeln» — Dieser praktische Küchenhelfer vereinfacht das Schneiden und Zerkleinern…»
- Produkt: Gemüseschneider mit Reiben und Hobeln (ACTIVE, https://luxestyle.ch/products/gemuseschneider-mit-reiben-und-hobeln-964352, SKU CJ-1387598618436964352) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Gemüseschneider mit Reiben und Hobeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-02 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581916556/
- Text: «Eleganter Wollmantel mit Revers und Bindegürtel · CHF 48.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür …»
- Produkt: Eleganter Wollmantel mit Revers und Bindegürtel (ACTIVE, https://luxestyle.ch/products/eleganter-wollmantel-mit-revers-und-bindegurte-615500, SKU CJ-CJYD290679701AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 48.90, Shop CHF 42.90–44.90 («Eleganter Wollmantel mit Revers und Bindegürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook album · 2026-10-01 20:40 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142453423350792 · Zwilling: https://www.instagram.com/p/Dd9yh8cjF7b/
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

### WARNUNG · Facebook bild · 2026-10-01 14:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142400221350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Fahnenkette Schweizer Kantone · CHF 25.90 Kleiner Schweizer Shop aus Belp, kein Konzern.…»
- Produkt: Fahnenkette Schweizer Kantone (ACTIVE, https://luxestyle.ch/products/fahnenkette-schweizer-kantone-fga88144, SKU fortura-88144) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Fahnenkette»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Fahnenkette Schweizer Kantone», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG FORMAT:** Bild 709×507 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · YouTube video · 2026-10-01 07:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/Zonmp68fz88
- Text: «Das eine Teil fürs Wohnzimmer 👀 «Toastbrot Kissen mit Kopfstütze» — Dieses originelle Kissen in Form eines Toastbrots ist die perfekte Erg…»
- Produkt: Toastbrot Kissen mit Kopfstütze (ACTIVE, https://luxestyle.ch/products/toastbrot-kissen-mit-kopfstutze-329792, SKU CJ-1369554622951329792) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 45.90, Shop CHF 39.90 («Toastbrot Kissen mit Kopfstütze», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### WARNUNG · Pinterest pin · 2026-10-01 04:55 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833693/
- Text: «Dein Hund wird es lieben 👀 «Hunde-Geschirr mit Leine, tragbar» — Dieses tragbare Hundegeschirr mit passender Leine ist ideal für den tägli…»
- Produkt: Hunde-Geschirr mit Leine, tragbar (ACTIVE, https://luxestyle.ch/products/hunde-geschirr-mit-leine-tragbar-224832, SKU CJ-1794612172111224832) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Hunde-Geschirr mit Leine, tragbar», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 04:49 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833432/
- Text: «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, getragen von @tatjanalarsinamoira 💛 «Blumenkleid mit Schnürung» · CHF 24.90 «Mi…»
- Produkt: Blumenkleid mit Schnürung (ACTIVE, https://luxestyle.ch/products/blumenkleid-mit-schnurung-613000, SKU CJ-CJLY299268001AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 39.90, Shop CHF 24.90 («Blumenkleid mit Schnürung», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-29 04:47 UTC gepostet: https://www.pinterest.com/pin/1111333645581667027/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833290/
- Text: «HD Mini-Projektor für Zuhause · CHF 98.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrie…»
- Produkt: HD Mini-Projektor für Zuhause (ACTIVE, https://luxestyle.ch/products/home-hd-portable-projector-239616, SKU CJ-1727567465632239616) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 98.90, Shop CHF 86.90 («HD Mini-Projektor für Zuhause», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833288/
- Text: «👀 Gerade besonders gefragt Y2K Harajuku Hoodie mit Nieten · CHF 20.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkt…»
- Produkt: Y2K Harajuku Hoodie mit Nieten (ACTIVE, https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700, SKU CJ-CJLS273231201AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 20.90, Shop CHF 18.90–19.90 («Y2K Harajuku Hoodie mit Nieten», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · YouTube video · 2026-09-30 16:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/9SU_ita0W4c
- Text: «Dein Zuhause, gemütlicher 👀 «Drehbares Gewürzregal aus Edelstahl und Glas» — Dieses drehbare Gewürzregal ist eine praktische und stilvolle…»
- Produkt: Drehbares Gewürzregal aus Edelstahl und Glas (ACTIVE, https://luxestyle.ch/products/drehbares-gewurzregal-aus-edelstahl-und-glas-434880, SKU CJ-1407291261517434880) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 84.90, Shop CHF 74.90 («Drehbares Gewürzregal aus Edelstahl und Glas», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### WARNUNG · YouTube video · 2026-09-30 06:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/mExO4nzFD-U
- Text: «Frühstück in 2 Minuten 👀 «Vierloch-Bratpfanne aus Aluminiumlegierung» — Diese vielseitige Vierloch-Bratpfanne ist ideal für ein schnelles …»
- Produkt: Vierloch-Bratpfanne aus Aluminiumlegierung (ACTIVE, https://luxestyle.ch/products/vierloch-bratpfanne-aus-aluminiumlegierung-970944, SKU CJ-1402526990677970944) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («Vierloch-Bratpfanne aus Aluminiumlegierung», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### WARNUNG · Pinterest pin · 2026-09-30 05:00 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581751795/
- Text: «Küche, aber einfacher 👀 «Schnellauftauplatte für die Küche» — Die Schnellauftauplatte aus Aluminium ist ein praktischer Helfer in jeder Kü…»
- Produkt: Schnellauftauplatte für die Küche (ACTIVE, https://luxestyle.ch/products/schnellauftauplatte-fur-die-kuche-750720, SKU CJ-1422455623806750720) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 37.90, Shop CHF 33.90 («Schnellauftauplatte für die Küche», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-30 04:53 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581751497/
- Text: «Wusstest du das schon? 👀 «Vegetarische Schredder-Box» CHF 33.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭 🔗 luxestyle.ch/products/…»
- Produkt: Gemüseschneider mit Auffangbox · 8 Einsätze (ACTIVE, https://luxestyle.ch/products/vegetarische-schredder-box-342016, SKU CJ-1694549489312342016) — Zuordnung: Link im Text
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Gemüseschneider mit Auffangbox · 8 Einsätze», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-30 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581751258/
- Text: «Strickpullover Rundhals Loose-Fit · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angesc…»
- Produkt: Strickpullover Rundhals Loose-Fit (ACTIVE, https://luxestyle.ch/products/strickpullover-rundhals-loose-fit-634500, SKU CJ-CJMY293330002BY) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90 («Strickpullover Rundhals Loose-Fit», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-30 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581751255/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- Produkt: Plüsch Alligator (ACTIVE, https://luxestyle.ch/products/plusch-alligator-fga88595, SKU fortura-88595) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG PREIS:** veraltet: Caption CHF 29.90, Shop CHF 26.90 («Plüsch Alligator», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-30 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581751252/
- Text: «🍂 Herbst-Favorit Overknee-Stiefel mit Schnürung und Blockabsatz · CHF 41.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20…»
- Produkt: Overknee-Stiefel mit Schnürung und Blockabsatz (ACTIVE, https://luxestyle.ch/products/overknee-stiefel-mit-schnurung-und-blockabsatz-621200, SKU CJ-CJNS273407101AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 41.90, Shop CHF 36.90–38.90 («Overknee-Stiefel mit Schnürung und Blockabsatz», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-29 16:27 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141854365350792 · Zwilling: https://www.instagram.com/p/Dd4L-PdjV4S/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alligator · CHF 29.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab S…»
- Produkt: Plüsch Alligator (ACTIVE, https://luxestyle.ch/products/plusch-alligator-fga88595, SKU fortura-88595) — Zuordnung: Link im Text
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 29.90, Shop CHF 26.90 («Plüsch Alligator», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · YouTube video · 2026-09-29 16:05 UTC · n/a Aufrufe
- Post: https://www.youtube.com/shorts/LqRpvz639VI
- Text: «Küche, aber einfacher 👀 «Multifunktions-Entsaftermixer» — Dieser Entsaftermixer bereitet dir frische Säfte oder Smoothies für zu Hause ode…»
- Produkt: Multifunktions-Entsaftermixer (ACTIVE, https://luxestyle.ch/products/multifunktions-entsaftermixer-618368, SKU CJ-1772618405682618368) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 34.90, Shop CHF 30.90 («Multifunktions-Entsaftermixer», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: YouTube Studio (kein YouTube-Token hier) [Q3]

### WARNUNG · Pinterest pin · 2026-09-29 04:47 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581667028/
- Text: «🍂 Herbst-Favorit Warme Winter-Hausschuhe · CHF 33.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlic…»
- Produkt: Warme Winter-Hausschuhe (ACTIVE, https://luxestyle.ch/products/warme-winter-hausschuhe-063744, SKU CJ-CJNY131339201AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Warme Winter-Hausschuhe», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-28 14:19 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141546235350792 · Zwilling: https://www.instagram.com/p/Dd1YfDSDX-4/
- Text: «🛒 Schon von Kund:innen bestellt Multifunktionaler runder Gemüseschneider · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Liefer…»
- Produkt: Multifunktionaler runder Gemüseschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-runder-gemuseschneider-be2e21, SKU CJ-CJJJCFCF00364-Red) — Zuordnung: Link im Text
- **WARNUNG FORMAT:** Bild 500×500 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat)  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-09-28 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581583059/
- Text: «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, …»
- Produkt: Kapuzen-Sweatshirt-Kleid mit Gürtel (ACTIVE, https://luxestyle.ch/products/kapuzen-sweatshirt-kleid-mit-gurtel-604900, SKU CJ-CJLY291801901AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Kapuzen-Sweatshirt-Kleid mit Gürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-27 20:01 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141356965350792 · Zwilling: https://www.instagram.com/p/Ddza2rvHVMo/
- Text: «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF 28.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, …»
- Produkt: Kapuzen-Sweatshirt-Kleid mit Gürtel (ACTIVE, https://luxestyle.ch/products/kapuzen-sweatshirt-kleid-mit-gurtel-604900, SKU CJ-CJLY291801901AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Kapuzen-Sweatshirt-Kleid mit Gürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest pin · 2026-09-27 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581487082/
- Text: «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-Stil · CHF 43.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 W…»
- Produkt: Martin Ankle Boots im britischen Casual-Stil (ACTIVE, https://luxestyle.ch/products/martin-ankle-boots-im-britischen-casual-stil-600000, SKU CJ-CJNS217947101AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 43.90, Shop CHF 38.90 («Martin Ankle Boots im britischen Casual-Stil», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-26 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581395389/
- Text: «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, da…»
- Produkt: USB Aroma Diffusor mit Befeuchter (ACTIVE, https://luxestyle.ch/products/usb-aroma-diffusor-mit-befeuchter-465152, SKU CJ-1525035291772465152) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («USB Aroma Diffusor mit Befeuchter», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-09-26 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581395388/
- Text: «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen · CHF 35.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkta…»
- Produkt: Kurzer Fleece-Kapuzenpullover für Damen (ACTIVE, https://luxestyle.ch/products/kurzer-fleece-kapuzenpullover-fur-damen-619400, SKU CJ-CJYD264678401AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Kurzer Fleece-Kapuzenpullover für Damen», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest bild · 2026-09-26 01:19 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581377817
- Text: «Dieses 3D Puzzle in Form eines Halloween Schlosses ist ein Spass für Teenager von 7 bis 14 Jahren. Das Set besteht aus Papier und wird in e…»
- **WARNUNG FORMAT:** Bild 630×630 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook bild · 2026-09-25 23:08 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140880307350792 · Zwilling: https://www.instagram.com/p/Ddumv_9lNi3/
- Text: «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, da…»
- Produkt: USB Aroma Diffusor mit Befeuchter (ACTIVE, https://luxestyle.ch/products/usb-aroma-diffusor-mit-befeuchter-465152, SKU CJ-1525035291772465152) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 24.90, Shop CHF 21.90 («USB Aroma Diffusor mit Befeuchter», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-25 16:33 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140807437350792 · Zwilling: https://www.instagram.com/p/Ddt5dW5FNsS/
- Text: «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen · CHF 35.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkta…»
- Produkt: Kurzer Fleece-Kapuzenpullover für Damen (ACTIVE, https://luxestyle.ch/products/kurzer-fleece-kapuzenpullover-fur-damen-619400, SKU CJ-CJYD264678401AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Kurzer Fleece-Kapuzenpullover für Damen», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Pinterest bild · 2026-09-24 10:34 UTC · n/a Aufrufe
- Post: https://www.pinterest.es/pin/1111333645581245245
- Text: «Das runde Samt-Kürbis Kissen ist eine stilvolle und komfortable Ergänzung für jedes Zuhause. Mit seinem einzigartigen Design, das an ein ha…»
- **WARNUNG FORMAT:** Bild 703×703 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

</details>

## Hinweise (gesammelt)

162 Hinweise in 148 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 73 Beiträge mit generischen Reichweiten-Hashtags (#foryou #trending #fyp #viral) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| Instagram | 2026-09-03 | 43 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Dc1w4wMjkjZ/ |
| Instagram | 2026-07-28 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «r jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tagen bei d» | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 42 | DOPPEL | gleiche Warengruppe «uhr» 2 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 36 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVQaq0lhRv/ |
| Instagram | 2026-07-28 | 32 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e und geniesse Blitzversand direkt aus der Schweiz! ✨ 🔗 luxestyle.ch» | https://www.instagram.com/p/DbVQZSWFoni/ |
| Instagram | 2026-07-28 | 32 | FORMAT | Bild 1024×1024 — Breite unter 1080 | https://www.instagram.com/p/DbVQZSWFoni/ |
| Instagram | 2026-07-28 | 32 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ5lEFlXc/ |
| Instagram | 2026-09-25 | 29 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddt5dW5FNsS/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 1000×1000 — Breite unter 1080 (Medium 1/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 3/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 4/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 5/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 1024×1024 — Breite unter 1080 (Medium 6/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-03 | 28 | FORMAT | Bild 720×720 — Breite unter 1080 (Medium 7/8) | https://www.instagram.com/p/Dc1zAj-GoFP/ |
| Instagram | 2026-09-23 | 25 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DdnNSHEDMja/ |
| Instagram | 2026-07-28 | 25 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVnEXyDsG-/ |
| Instagram | 2026-07-28 | 25 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «ibilität – mit Blitzversand aus der Schweiz direkt zu dir nach» | https://www.instagram.com/p/DbVgLAXHyd9/ |
| Instagram | 2026-07-28 | 25 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVgLAXHyd9/ |
| Instagram | 2026-09-25 | 24 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddumv_9lNi3/ |
| Instagram | 2026-09-30 | 21 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd5qYj2AKyw/ |
| Instagram | 2026-09-27 | 21 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Ddza2rvHVMo/ |
| Instagram | 2026-09-25 | 20 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddsmbc-DkJe/ |
| Instagram | 2026-09-23 | 20 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddoi3MMlLPX/ |
| Instagram | 2026-09-29 | 17 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Dd3g5S9FA18/ |
| Instagram | 2026-09-26 | 16 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DdvW8OwFLBZ/ |
| Instagram | 2026-09-24 | 16 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DdpyPQLFFjb/ |
| Instagram | 2026-07-28 | 16 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ4Z4lu5Q/ |
| Instagram | 2026-10-02 | 15 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd-fGWZF66i/ |
| Instagram | 2026-07-28 | 15 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ3F3Fseo/ |
| Instagram | 2026-09-24 | 14 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DdqcqhXm4wX/ |
| Instagram | 2026-09-30 | 12 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd6UQDolC60/ |
| Instagram | 2026-10-01 | 11 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd8c9kQkWlV/ |
| Instagram | 2026-09-29 | 11 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd2wskBlPZN/ |
| Instagram | 2026-09-24 | 11 | FORMAT | Bild 720×630 — Breite unter 1080 | https://www.instagram.com/p/Ddr7Lk4nPix/ |
| Instagram | 2026-07-28 | 11 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVQ15-kqMv/ |
| Instagram | 2026-10-03 | 10 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeBKvd7jhgS/ |
| Instagram | 2026-10-03 | 8 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DeB0D9QldRF/ |
| Instagram | 2026-09-28 | 8 | FORMAT | Bild 720×964 — Breite unter 1080 | https://www.instagram.com/p/Dd0ucPOjRpC/ |
| Instagram | 2026-10-03 | 7 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeCfMMDjHDg/ |
| Instagram | 2026-10-02 | 7 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd_IenVDLiC/ |
| Facebook | 2026-09-23 | 6 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140069977350792 |
| Instagram | 2026-10-04 | 5 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DeEmhYDlNeA/ |
| Instagram | 2026-10-02 | 5 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeAcgz8DcUF/ |
| Facebook | 2026-09-23 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140221003350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 3/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 4/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 5/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 6/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 888×888 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 7/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122135101689350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142095595350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141997921350792 |
| Facebook | 2026-09-29 | 2 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141772387350792 |
| Facebook | 2026-09-29 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141690895350792 |
| Pinterest | 2026-10-01 | 2 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd5qYj2AKyw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833286/ |
| Facebook | 2026-10-03 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143004745350792 |
| Facebook | 2026-10-03 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142918267350792 |
| Facebook | 2026-09-28 | 1 | FORMAT | Bild 896×1200 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141469087350792 |
| Facebook | 2026-09-26 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140943505350792 |
| Facebook | 2026-09-25 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140661457350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 883×773 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140607019350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140352715350792 |
| Pinterest | 2026-10-02 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd9wpt-Hy9g/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-01 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7zdhfFDPa/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-09-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd1YiSEDDur/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667871/ |
| Pinterest | 2026-09-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd2VJQIFPf6/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667814/ |
| Pinterest | 2026-09-25 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdqcqhXm4wX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314388/ |
| Pinterest | 2026-09-24 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdoSCmhkuU7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236221/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdmhRxtjUIZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581153922/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdnatlxD0nV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152467/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnNSHEDMja/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152144/ |
| Facebook | 2026-10-04 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122143266639350792 |
| Facebook | 2026-10-03 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142856305350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142787947350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142592419350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142526185350792 |
| Facebook | 2026-10-01 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142311637350792 |
| Facebook | 2026-09-27 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141356965350792 |
| Facebook | 2026-09-25 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140880307350792 |
| Facebook | 2026-09-25 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140807437350792 |
| Facebook | 2026-09-24 | 0 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140423395350792 |
| Pinterest | 2026-09-23 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581196150 |
| Pinterest | 2026-09-24 | n/a | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «wertige Qualität ab Schweizer Lager. Details Marke: Wid» | https://www.pinterest.es/pin/1111333645581220663 |
| Pinterest | 2026-09-24 | n/a | FORMAT | Bild 1000×1500 — Breite unter 1080 | https://www.pinterest.es/pin/1111333645581229813 |
| Facebook | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://facebook.com/122108214291350792/posts/122140802565350792 |
| Instagram | 2026-09-25 | n/a | FORMAT | Bild 800×800 — Breite unter 1080 | https://www.instagram.com/p/Ddt2SkdjXMz/ |
| Instagram | 2026-09-25 | n/a | DOPPEL | gleiche Warengruppe «gesichtsroller» 64 h nach https://www.instagram.com/p/DdnNSHEDMja/ (Raster wirkt doppelt) | https://www.instagram.com/p/Ddt2SkdjXMz/ |
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
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeBrflzjQ2Z/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582098666/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeCj3d4ggAV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582097301/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeDo7wrlPRO/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582097098/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeDNJ0iFD7G/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096689/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeC_fFFH7ML/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096690/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeB0D9QldRF/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096687/ |
| Pinterest | 2026-10-04 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeCfMMDjHDg/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582096688/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd-695XlAkF/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582006191/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DeAx76wEZSU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005789/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd_ywlfoMaE/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005286/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeAY2AIH1i3/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005059/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeBKvd7jhgS/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005058/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DeAcgz8DcUF/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005057/ |
| Pinterest | 2026-10-03 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd_IenVDLiC/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645582005056/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd8Phq_GZlZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581918302/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd9HHI8Er06/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916838/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd-D2V1nTgU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916695/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd9yh8cjF7b/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916556/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd-fGWZF66i/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916553/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd8c9kQkWlV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916551/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd6ZB2Djknh/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833693/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd7UPmeFVkk/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833550/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd6wC1RiWEd/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833432/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7MPHWj3ku/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833290/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7DUIujzrT/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833288/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd6UQDolC60/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833287/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd5OfrZCOZP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751961/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd4QyVLD_y2/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751795/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd3TIwtiGNg/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751497/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd4nKUeD_qe/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751258/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd4L-PdjV4S/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751255/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd46LI9jPqv/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751256/ |
| Pinterest | 2026-09-30 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd3g5S9FA18/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581751252/ |
| Pinterest | 2026-09-29 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd2CntDjDZs/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667027/ |
| Pinterest | 2026-09-29 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd2wskBlPZN/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667028/ |
| Pinterest | 2026-09-29 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd0ucPOjRpC/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667020/ |
| Pinterest | 2026-09-29 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd1YfDSDX-4/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667021/ |
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

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 12 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-09-23 05:39 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140105137350792 · «EMS Mikrostrom Massagegerät · CHF 22.90 Kleiner Schweizer S…»
- 2026-09-23 02:08 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140069977350792 · «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für na…»
- 2026-09-23 14:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140221003350792 · «Kristall-Set 3-teilig · CHF 29.90 Kleiner Schweizer Shop au…»
- 2026-09-03 21:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135105943350792 · «Von allem etwas – 8 Lieblinge aus 8 Welten 🌍 Wisch dich du…»
- 2026-09-30 16:21 UTC · 3 Aufrufe · https://www.facebook.com/reel/1036507699423763/ · «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, …»
- 2026-09-03 21:20 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135101689350792 · «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdich…»
- 2026-09-26 06:10 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140943505350792 · «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-S…»
- 2026-09-27 20:01 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122141356965350792 · «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF…»
- 2026-09-25 23:08 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140880307350792 · «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 2…»
- 2026-09-25 16:33 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140807437350792 · «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen ·…»
- 2026-08-06 17:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1563305552100842/ · «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selb…»
- 2026-10-04 22:35 UTC · n/a Aufrufe · https://facebook.com/122108214291350792/posts/2101815593779290 · «»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (17): https://www.instagram.com/p/Dd5qYj2AKyw/ · https://www.instagram.com/p/Dd0EM26kdvw/ · https://www.instagram.com/p/DdqK05YFML3/ · https://www.instagram.com/p/Dc1zAj-GoFP/ · https://www.instagram.com/p/DbVMG4okgei/ · https://www.instagram.com/p/DbVMFlsknPT/ · https://www.instagram.com/p/DbVJ5lEFlXc/ · https://www.instagram.com/p/DbVJ4Z4lu5Q/ · https://www.instagram.com/p/DbVJ3F3Fseo/ · https://www.instagram.com/p/DbVJV_SDkIz/ · https://www.instagram.com/reel/DaxHrZODx43/ · https://www.facebook.com/122102579637350792/posts/122140221003350792 · https://www.facebook.com/122102579637350792/posts/122135105943350792 · https://www.facebook.com/122102579637350792/posts/122135101689350792 · https://www.tiktok.com/@luxestyle.ch/video/7691427221021527329 · https://www.tiktok.com/@luxestyle.ch/video/7691432399791476000 · https://www.tiktok.com/@luxestyle.ch/video/7691437492066733344
- Medien nicht messbar (1): https://www.pinterest.es/pin/1111333645581220663 (Download gescheitert)
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
