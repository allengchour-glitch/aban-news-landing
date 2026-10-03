# Social-Qualität — Stand 2026-10-03 00:33 UTC

Erzeugt von `automation/social_qualitaet_wache.mjs` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.

## Gelesen

- Instagram: 100 Beiträge (letzte 100, mit Aufrufen/Reichweite aus Insights)
- Facebook: 67 Seitenbeiträge + 1 Reels ohne Seitenbeitrag (letzte 60 Tage; Profil-/Titelbildwechsel ausgenommen)
- Metricool-Planer: 56 Einträge (−30/+7 Tage) · Pinterest-Analyse: 81 Pins
- Geprüft: 305 Beiträge, 357 Medien (ffprobe/ebur128/Tesseract)
- Shopify live: Gratisversand CH ab CHF 45 Warenkorb nach Rabatt (öffentliche Aussage «ab CHF 50» ist damit gedeckt) · Standard CHF 7 · Kanarienvogel Suche: ok (sku: und title: liefern 0 für Unsinn)
- ACHTUNG, nicht lesbar: Shopify-Produkte: [{"message":"Shopify antwortet nicht"}]

## Zusammenfassung

**16 Fehler · 111 Warnungen · 156 Hinweise** — Fehler/Warnungen in 103 von 305 Beiträgen.

Vorgeschlagene Aktionen (nichts davon ausgeführt):

- Facebook: 26 × Caption korrigieren · 6 × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]
- Instagram: 29 × Caption in der App korrigieren (API kann es nicht [Q2]) · 13 × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])
- TikTok/YouTube/Pinterest: 29 × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])
- Schutzregel: 0 Beiträge über 500 Aufrufe → nie löschen, nur Caption

| Klasse | Instagram | Facebook | TikTok | YouTube | Pinterest | Summe |
|---|---:|---:|---:|---:|---:|---:|
| DIREKTLINK | · | · | · | · | 60 | 60 |
| DOPPEL | 6 | 1 | · | · | 4 | 11 |
| ENGLISCH | 2 | · | · | · | · | 2 |
| FLOSKEL | 2 | 2 | · | · | 2 | 6 |
| FORMAT | 38 | 30 | · | · | 14 | 82 |
| PREIS | 23 | 23 | · | · | 20 | 66 |
| TON | 7 | 2 | · | · | · | 9 |
| VERSAND | 18 | 18 | · | · | 11 | 47 |

Produkt zugeordnet: 103 von 305 Beiträgen (Link 46, Ledger 2, Titel 55).

Dazu: 13 Facebook-Beiträge ohne Direktlink (Liste unten) · 99 Beiträge mit Preis, aber ohne sichere Produktzuordnung · 1 Beiträge mit nicht messbaren Medien.

## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)

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

### FEHLER · Instagram reel · 2026-07-27 09:02 UTC · 41 Aufrufe
- Post: https://www.instagram.com/reel/DbSmG3ijUtK/
- Text: «Welä Ohrring nimmsch — 1 oder 2? 👇 Schrib's i d Kommentär! 📌 Speicher der's · –10% mit WELCOME10 → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram karussell · 2026-09-26 07:09 UTC · 29 Aufrufe
- Post: https://www.instagram.com/p/DdvdzC8ETg1/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140953051350792
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: erste Zeile
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90–23.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-07-10 15:36 UTC · 23 Aufrufe
- Post: https://www.instagram.com/reel/DanhubhjvrJ/
- Text: «LuxeStyle in 43 Sekunden ✨ Mode, Schmuck, Sonnenbrillen & mehr — alles aus einem Schweizer Shop. Code WELCOME10 = -10% → luxestyle.ch»
- **FEHLER TON:** Video ohne Tonspur  
  → Vorschlag: stumm: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### FEHLER · Instagram reel · 2026-09-28 04:09 UTC · 17 Aufrufe
- Post: https://www.instagram.com/reel/Dd0SuSMlPf1/
- Text: «Das trägt jetzt jeder 👀 Sicherheitsschuhe mit Stahlkappe — für Werkstatt, Umzug und Garten. CHF 14.90 · Gratis Versand ab CHF 50 · Klarna …»
- Produkt: Sicherheits-Schuhe mit Stahlkappe (ACTIVE, https://luxestyle.ch/products/sicherheits-schuhe-mit-stahlkappe-695232, SKU CJ-CJNS109710401AZ) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 14.90, Shop CHF 27.90–41.90 («Sicherheits-Schuhe mit Stahlkappe», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-26 08:26 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/DdvmkBckZrO/ · Zwilling: https://www.facebook.com/reel/1684116469801173/
- Text: «Genau das hat gefehlt 👀 «Multifunktionaler Gemüseschneider mit Spiralschneider» — Dieser multifunktionale Gemüseschneider mit Handkurbel u…»
- Produkt: Multifunktionaler Gemüseschneider mit Spiralschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-gemuseschneider-mit-spiralsc-623700, SKU CJ-2409131134451623700) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 17.90, Shop CHF 21.90 («Multifunktionaler Gemüseschneider mit Spiralschneider», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Instagram reel · 2026-09-28 14:19 UTC · 12 Aufrufe
- Post: https://www.instagram.com/reel/Dd1YiSEDDur/ · Zwilling: https://www.facebook.com/reel/1451952913459706/
- Text: «Outfit fertig in 10 Sekunden 👀 «Laptop-Tasche für Herren» — Die vielseitige Laptop-Tasche für Herren ist der ideale Begleiter für Büro und…»
- Produkt: Laptop-Tasche für Herren (ACTIVE, https://luxestyle.ch/products/laptop-tasche-fur-herren-121536, SKU CJ-1735263488685121536) — Zuordnung: Link im Text
- **FEHLER PREIS:** Lockpreis: Caption CHF 16.90, Shop CHF 17.90 («Laptop-Tasche für Herren», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### FEHLER · Facebook album · 2026-09-26 07:10 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140953051350792 · Zwilling: https://www.instagram.com/p/DdvdzC8ETg1/
- Text: «Damen Hoodie Bequem mit Taschen und Langarm · CHF 19.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrl…»
- Produkt: Damen Hoodie Bequem mit Taschen und Langarm (ACTIVE, https://luxestyle.ch/products/damen-hoodie-bequem-mit-taschen-und-langarm-610500, SKU CJ-CJWY298995901AZ) — Zuordnung: erste Zeile
- **FEHLER PREIS:** Lockpreis: Caption CHF 19.90, Shop CHF 21.90–23.90 («Damen Hoodie Bequem mit Taschen und Langarm», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

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

<details><summary>87 Beiträge nur mit Warnungen (aufklappen)</summary>

### WARNUNG · Instagram reel · 2026-09-25 15:09 UTC · 126 Aufrufe
- Post: https://www.instagram.com/reel/Ddtv5Z1Epoh/ · Zwilling: https://www.facebook.com/reel/2342181933185415/
- Text: «Kleines Upgrade, grosser Glow 👀 «Pizzaroller und Teiglocher» — Dieses vielseitige Küchenwerkzeug vereinfacht die Zubereitung von Backwaren…»
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram reel · 2026-09-30 16:21 UTC · 103 Aufrufe
- Post: https://www.instagram.com/reel/Dd6wC1RiWEd/ · Zwilling: https://www.facebook.com/reel/1036507699423763/
- Text: «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, getragen von @tatjanalarsinamoira 💛 «Blumenkleid mit Schnürung» · CHF 24.90 «Mi…»
- Produkt: Blumenkleid mit Schnürung (ACTIVE, https://luxestyle.ch/products/blumenkleid-mit-schnurung-613000, SKU CJ-CJLY299268001AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 39.90, Shop CHF 24.90 («Blumenkleid mit Schnürung», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 20:27 UTC gepostet: https://www.instagram.com/p/Dd2CntDjDZs/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram reel · 2026-08-01 11:12 UTC · 83 Aufrufe
- Post: https://www.instagram.com/reel/DbftCVqDqVO/
- Text: ««Luftreiniger mit Feuchtigkeitsspender» ✨ Jetzt bei LuxeStyle — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭 🔗 l…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «eStyle — CHF 12.90. Blitzversand aus der Schweiz · −»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-10-02 15:21 UTC · 56 Aufrufe
- Post: https://www.instagram.com/reel/Dd_ywlfoMaE/ · Zwilling: https://www.facebook.com/reel/1628369782178782/
- Text: «Wusstest du das schon? 👀 «Handkurbel-Schäler für Äpfel und Birnen» — Dieser handliche Schäler revolutioniert das Schälen von Äpfeln und Bi…»
- Produkt: Handkurbel-Schäler für Äpfel und Birnen (ACTIVE, https://luxestyle.ch/products/handkurbel-schaler-fur-apfel-und-birnen-5235a8, SKU CJ-89D3EA68-37A4-4F3C-ADBE-8) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Handkurbel-Schäler für Äpfel und Birnen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-03 21:20 UTC · 43 Aufrufe
- Post: https://www.instagram.com/p/Dc1w4wMjkjZ/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122135101689350792
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-07-28 09:50 UTC · 43 Aufrufe
- Post: https://www.instagram.com/reel/DbVQd7GinD2/
- Text: ««Wimpernlift-Kit» ✨ Jetzt bei LuxeStyle — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WELCOME10 🇨🇭»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «eStyle — CHF 24.90. Blitzversand aus der Schweiz · −»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG ENGLISCH:** Englischer Lieferantentext im Video: the, keep, from, natural, make, are  
  → Vorschlag: englischer Bildtext: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

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

### WARNUNG · Instagram reel · 2026-07-28 09:17 UTC · 42 Aufrufe
- Post: https://www.instagram.com/reel/DbVMo7IDmbK/
- Text: ««Kürbis-Strichbürste für Hunde & Katzen – Selbstreinigend» ✨ Jetzt bei LuxeStyle — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «eStyle — CHF 21.90. Blitzversand aus der Schweiz · −»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-06-15 16:00 UTC · 42 Aufrufe
- Post: https://www.instagram.com/p/DZnMnHQlFEM/
- Text: «Kleiner Preis, grosse Wirkung ✨ Stiletto-Sandalette «Gala» – CHF 71.00 💾 Merk’s dir · folge für mehr Schweizer Finds · –10% mit WELCOME10 …»
- **WARNUNG FORMAT:** Bild 719×699 — Breite unter 1080  
  → Vorschlag: unscharf: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 09:49 UTC · 36 Aufrufe
- Post: https://www.instagram.com/p/DbVQaq0lhRv/
- Text: «Vintage-Look trifft modernen Schutz 😎 Polarisierte Gläser mit UV400 – dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxestyle.ch · Link in Bio»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «er mit UV400 – dank Blitzversand in 1-2 Tagen bei di»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «– dank Blitzversand in 1-2 Tagen bei dir! 🔗 luxesty»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-06-18 20:15 UTC · 35 Aufrufe
- Post: https://www.instagram.com/reel/DZvYKRdDI7O/
- Text: «Dini neue Lieblingsstück us LuxeStyle ✨ Blazer, Sneaker, Sonnebrille & meh – mit Code WELCOME10 grad –10%. 👉 luxestyle.ch 🇨🇭»
- **WARNUNG FORMAT:** Video 604×1076 unter 720×1280  
  → Vorschlag: zu kleine Auflösung: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

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

### WARNUNG · Instagram karussell · 2026-09-29 20:24 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/Dd4nKUeD_qe/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122141900139350792
- Text: «Strickpullover Rundhals Loose-Fit · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angesc…»
- Produkt: Strickpullover Rundhals Loose-Fit (ACTIVE, https://luxestyle.ch/products/strickpullover-rundhals-loose-fit-634500, SKU CJ-CJMY293330002BY) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90 («Strickpullover Rundhals Loose-Fit», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-09-23 02:11 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DdnNSHEDMja/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122140069977350792
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram bild · 2026-07-28 12:07 UTC · 25 Aufrufe
- Post: https://www.instagram.com/p/DbVgLAXHyd9/
- Text: «Dein Ganzkörper-Workout, wann und wo du willst 💪 Fünf Widerstandsstufen für maximale Flexibilität – mit Blitzversand aus der Schweiz direk…»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «Flexibilität – mit Blitzversand aus der Schweiz dir»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Instagram reel · 2026-08-18 18:42 UTC · 24 Aufrufe
- Post: https://www.instagram.com/reel/DcMSDwjFGHj/
- Text: ««Kerzenlicht-Aromadiffuser» ✨ Jetzt bei LuxeStyle — CHF 14.90. Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT · −10% mit Code…»
- **WARNUNG TON:** übersteuert: True Peak +0.7 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Instagram karussell · 2026-10-01 20:40 UTC · 22 Aufrufe
- Post: https://www.instagram.com/p/Dd9yh8cjF7b/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142453423350792
- Text: «Eleganter Wollmantel mit Revers und Bindegürtel · CHF 48.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür …»
- Produkt: Eleganter Wollmantel mit Revers und Bindegürtel (ACTIVE, https://luxestyle.ch/products/eleganter-wollmantel-mit-revers-und-bindegurte-615500, SKU CJ-CJYD290679701AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 48.90, Shop CHF 42.90–44.90 («Eleganter Wollmantel mit Revers und Bindegürtel», Zuordnung: erste Zeile)  
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

### WARNUNG · Pinterest pin · 2026-09-04 04:47 UTC · 14 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645579582500/
- Text: «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdicht und mit stimmungsvollem RGB-Licht. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «t. 🎶☀️ CHF 54.90 · Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Instagram reel · 2026-10-02 07:13 UTC · 13 Aufrufe
- Post: https://www.instagram.com/reel/Dd-695XlAkF/ · Zwilling: https://www.facebook.com/reel/2590638451401655/
- Text: «Küche, aber einfacher 👀 «Handmixer mit 5 Geschwindigkeiten» — Dieser Handmixer ist ein unverzichtbarer Helfer in jeder Küche. CHF 28.90 · …»
- Produkt: Handmixer mit 5 Geschwindigkeiten (ACTIVE, https://luxestyle.ch/products/handmixer-mit-5-geschwindigkeiten-694c50, SKU CJ-44E4345F-E33C-49EF-B436-9) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Handmixer mit 5 Geschwindigkeiten», Zuordnung: Link im Text)  
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

### WARNUNG · Instagram reel · 2026-10-01 23:12 UTC · 12 Aufrufe
- Post: https://www.instagram.com/reel/Dd-D2V1nTgU/ · Zwilling: https://www.facebook.com/reel/1111970258030994/
- Text: «Genau das hat gefehlt 👀 «Gemüseschneider mit Reiben und Hobeln» — Dieser praktische Küchenhelfer vereinfacht das Schneiden und Zerkleinern…»
- Produkt: Gemüseschneider mit Reiben und Hobeln (ACTIVE, https://luxestyle.ch/products/gemuseschneider-mit-reiben-und-hobeln-964352, SKU CJ-1387598618436964352) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Gemüseschneider mit Reiben und Hobeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

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

### WARNUNG · Instagram reel · 2026-09-24 20:26 UTC · 8 Aufrufe
- Post: https://www.instagram.com/reel/DdrvVenEe2j/ · Zwilling: https://www.facebook.com/reel/1076754371781935/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]

### WARNUNG · Facebook bild · 2026-09-30 19:09 UTC · 7 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142170619350792 · Zwilling: https://www.instagram.com/p/Dd7DUIujzrT/
- Text: «👀 Gerade besonders gefragt Y2K Harajuku Hoodie mit Nieten · CHF 20.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werkt…»
- Produkt: Y2K Harajuku Hoodie mit Nieten (ACTIVE, https://luxestyle.ch/products/y2k-harajuku-hoodie-mit-nieten-629700, SKU CJ-CJLS273231201AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 20.90, Shop CHF 18.90–19.90 («Y2K Harajuku Hoodie mit Nieten», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Instagram bild · 2026-10-02 09:11 UTC · 6 Aufrufe
- Post: https://www.instagram.com/p/Dd_IenVDLiC/ · Zwilling: https://www.facebook.com/122102579637350792/posts/122142592419350792
- Text: «🍂 Herbst-Favorit Britisches Teeservice «Luxury» · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür…»
- Produkt: Britisches Teeservice «Luxury» (ACTIVE, https://luxestyle.ch/products/britisches-teeservice-luxury-571968, SKU CJ-1533076372447571968) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Britisches Teeservice «Luxury»», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: IG-App (API ändert keine Caption) [Q2]

### WARNUNG · Facebook album · 2026-09-30 20:27 UTC · 6 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142184773350792 · Zwilling: https://www.instagram.com/p/Dd7MPHWj3ku/
- Text: «HD Mini-Projektor für Zuhause · CHF 98.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angeschrie…»
- Produkt: HD Mini-Projektor für Zuhause (ACTIVE, https://luxestyle.ch/products/home-hd-portable-projector-239616, SKU CJ-1727567465632239616) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 98.90, Shop CHF 86.90 («HD Mini-Projektor für Zuhause», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-23 02:08 UTC · 6 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122140069977350792 · Zwilling: https://www.instagram.com/p/DdnNSHEDMja/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-10-01 06:16 UTC · 3 Aufrufe
- Post: https://www.facebook.com/reel/1675461947335590/ · Zwilling: https://www.instagram.com/reel/Dd8Phq_GZlZ/
- Text: «Kleines Upgrade, grosser Glow 👀 «Multifunktionaler manueller Massageroller» — Dieser vielseitige Massageroller wurde entwickelt, um Muskel…»
- Produkt: Multifunktionaler manueller Massageroller (ACTIVE, https://luxestyle.ch/products/multifunktionaler-manueller-massageroller-851904, SKU CJ-1633750013945851904) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 25.90, Shop CHF 22.90 («Multifunktionaler manueller Massageroller», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

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

### WARNUNG · Facebook reel · 2026-10-01 23:12 UTC · 2 Aufrufe
- Post: https://www.facebook.com/reel/1111970258030994/ · Zwilling: https://www.instagram.com/reel/Dd-D2V1nTgU/
- Text: «Genau das hat gefehlt 👀 «Gemüseschneider mit Reiben und Hobeln» — Dieser praktische Küchenhelfer vereinfacht das Schneiden und Zerkleinern…»
- Produkt: Gemüseschneider mit Reiben und Hobeln (ACTIVE, https://luxestyle.ch/products/gemuseschneider-mit-reiben-und-hobeln-964352, SKU CJ-1387598618436964352) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 35.90, Shop CHF 31.90 («Gemüseschneider mit Reiben und Hobeln», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-09-29 10:10 UTC · 2 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141772387350792 · Zwilling: https://www.instagram.com/p/Dd3g5S9FA18/
- Text: «🍂 Herbst-Favorit Overknee-Stiefel mit Schnürung und Blockabsatz · CHF 41.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20…»
- Produkt: Overknee-Stiefel mit Schnürung und Blockabsatz (ACTIVE, https://luxestyle.ch/products/overknee-stiefel-mit-schnurung-und-blockabsatz-621200, SKU CJ-CJNS273407101AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 41.90, Shop CHF 36.90–38.90 («Overknee-Stiefel mit Schnürung und Blockabsatz», Zuordnung: erste Zeile)  
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
- Produkt: Warme Winter-Hausschuhe (ACTIVE, https://luxestyle.ch/products/warme-winter-hausschuhe-063744, SKU CJ-CJNY131339201AZ) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 33.90, Shop CHF 29.90 («Warme Winter-Hausschuhe», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook reel · 2026-10-02 07:14 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/2590638451401655/ · Zwilling: https://www.instagram.com/reel/Dd-695XlAkF/
- Text: «Küche, aber einfacher 👀 «Handmixer mit 5 Geschwindigkeiten» — Dieser Handmixer ist ein unverzichtbarer Helfer in jeder Küche. CHF 28.90 · …»
- Produkt: Handmixer mit 5 Geschwindigkeiten (ACTIVE, https://luxestyle.ch/products/handmixer-mit-5-geschwindigkeiten-694c50, SKU CJ-44E4345F-E33C-49EF-B436-9) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 28.90, Shop CHF 25.90 («Handmixer mit 5 Geschwindigkeiten», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook album · 2026-09-29 20:25 UTC · 1 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122141900139350792 · Zwilling: https://www.instagram.com/p/Dd4nKUeD_qe/
- Text: «Strickpullover Rundhals Loose-Fit · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür ehrlich angesc…»
- Produkt: Strickpullover Rundhals Loose-Fit (ACTIVE, https://luxestyle.ch/products/strickpullover-rundhals-loose-fit-634500, SKU CJ-CJMY293330002BY) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 27.90, Shop CHF 23.90 («Strickpullover Rundhals Loose-Fit», Zuordnung: erste Zeile)  
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
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Facebook reel · 2026-09-24 20:27 UTC · 1 Aufrufe
- Post: https://www.facebook.com/reel/1076754371781935/ · Zwilling: https://www.instagram.com/reel/DdrvVenEe2j/
- Text: «Warum hat das niemand früher gebaut? 👀 «Smartwatch mit Touchscreen, Herzfrequenz und SpO2» — Diese Smartwatch zeigt dir auf einem TFT-Bild…»
- **WARNUNG TON:** übersteuert: True Peak +1.3 dBTP  
  → Vorschlag: Ton verzerrt: löschen und sauber neu posten. Weg: FB-API DELETE /{post-id} [Q1]

### WARNUNG · Pinterest pin · 2026-09-23 04:46 UTC · 1 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581152144/
- Text: «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für natürliche Glow-Momente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Klarna. 💕 🔗 …»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG FLOSKEL:** Scam-Marker: «omente jeden Tag. ✨ Bezahl bequem auf Rechnung mit Kl»  
  → Vorschlag: Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook reel · 2026-10-02 15:21 UTC · 0 Aufrufe
- Post: https://www.facebook.com/reel/1628369782178782/ · Zwilling: https://www.instagram.com/reel/Dd_ywlfoMaE/
- Text: «Wusstest du das schon? 👀 «Handkurbel-Schäler für Äpfel und Birnen» — Dieser handliche Schäler revolutioniert das Schälen von Äpfeln und Bi…»
- Produkt: Handkurbel-Schäler für Äpfel und Birnen (ACTIVE, https://luxestyle.ch/products/handkurbel-schaler-fur-apfel-und-birnen-5235a8, SKU CJ-89D3EA68-37A4-4F3C-ADBE-8) — Zuordnung: Link im Text
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Handkurbel-Schäler für Äpfel und Birnen», Zuordnung: Link im Text)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-02 15:20 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142708879350792
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz weiss · CHF 27.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand ab …»
- (+ 2 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Spinnennetz»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

### WARNUNG · Facebook bild · 2026-10-02 09:11 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142592419350792 · Zwilling: https://www.instagram.com/p/Dd_IenVDLiC/
- Text: «🍂 Herbst-Favorit Britisches Teeservice «Luxury» · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür…»
- Produkt: Britisches Teeservice «Luxury» (ACTIVE, https://luxestyle.ch/products/britisches-teeservice-luxury-571968, SKU CJ-1533076372447571968) — Zuordnung: erste Zeile
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG PREIS:** veraltet: Caption CHF 26.90, Shop CHF 23.90 («Britisches Teeservice «Luxury»», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

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

### WARNUNG · Pinterest pin · 2026-10-02 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581916552/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Schweizer Lampion-Set · CHF 26.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versand…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Schweizer L»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Facebook album · 2026-10-01 20:40 UTC · 0 Aufrufe
- Post: https://www.facebook.com/122102579637350792/posts/122142453423350792 · Zwilling: https://www.instagram.com/p/Dd9yh8cjF7b/
- Text: «Eleganter Wollmantel mit Revers und Bindegürtel · CHF 48.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, dafür …»
- Produkt: Eleganter Wollmantel mit Revers und Bindegürtel (ACTIVE, https://luxestyle.ch/products/eleganter-wollmantel-mit-revers-und-bindegurte-615500, SKU CJ-CJYD290679701AZ) — Zuordnung: erste Zeile
- **WARNUNG PREIS:** veraltet: Caption CHF 48.90, Shop CHF 42.90–44.90 («Eleganter Wollmantel mit Revers und Bindegürtel», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

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

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833289/
- Text: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen bei dir Badeset Dino Duft Apfel · CHF 24.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Versa…»
- (+ 3 Hinweise, siehe Hinweis-Liste)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Badeset Din»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 04:46 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581833286/
- Text: «👀 Gerade besonders gefragt Mule-Sandalette «Nodo» · CHF 39.90 Kleiner Schweizer Shop aus Belp, kein Konzern. Lieferung 10–20 Werktage, daf…»
- (+ 1 Hinweis, siehe Hinweis-Liste)
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-10-01 02:23 UTC gepostet: https://www.pinterest.com/pin/1111333645581825930/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 02:21 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581825826/
- Text: «Abendkleid «Sirène» – High-Slit Meerjungfrau mit Schleppe 📦 Lieferzeit Schweiz: 10–20 Werktage · Direktversand ab Lieferantenlager · Versa…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-30 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645581751256/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

### WARNUNG · Pinterest pin · 2026-10-01 02:15 UTC · 0 Aufrufe
- Post: https://www.pinterest.com/pin/1111333645581825587/
- Text: «2-teiliges Leinen-Set «Provence» – Hemd & Wide-Leg-Hose 📦 Lieferzeit Schweiz: 10–20 Werktage · Direktversand ab Lieferantenlager · Versand…»
- **WARNUNG DOPPEL:** dasselbe Produkt schon am 2026-09-28 04:46 UTC gepostet: https://www.pinterest.com/pin/1111333645581583061/  
  → Vorschlag: Doppelpost: löschen und sauber neu posten. Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)

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
- Produkt: Plüsch Alligator (ACTIVE, https://luxestyle.ch/products/plusch-alligator-fga88595, SKU fortura-88595) — Zuordnung: erste Zeile
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «b Schweizer Lager – in 1–2 Werktagen bei dir Plüsch Alli»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG VERSAND:** Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «ab Schweizer Lager in 1–2 Werktagen · 30 Tage Rückgabe»  
  → Vorschlag: nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]
- **WARNUNG PREIS:** veraltet: Caption CHF 29.90, Shop CHF 26.90 («Plüsch Alligator», Zuordnung: erste Zeile)  
  → Vorschlag: Caption auf den Shop-Preis korrigieren. Weg: FB-API POST /{post-id} message=… [Q1]

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
- Produkt: Multifunktionaler runder Gemüseschneider (ACTIVE, https://luxestyle.ch/products/multifunktionaler-runder-gemuseschneider-be2e21, SKU CJ-CJJJCFCF00364-Red) — Zuordnung: erste Zeile
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

156 Hinweise in 134 Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu 78 Beiträge mit generischen Reichweiten-Hashtags (#foryou #trending #fyp #viral) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.

<details><summary>Liste</summary>

| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |
|---|---|---:|---|---|---|
| Instagram | 2026-08-01 | 83 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e — CHF 12.90. Blitzversand aus der Schweiz · −10% mit Code WEL» | https://www.instagram.com/reel/DbftCVqDqVO/ |
| Instagram | 2026-09-03 | 43 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Dc1w4wMjkjZ/ |
| Instagram | 2026-07-28 | 43 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e — CHF 24.90. Blitzversand aus der Schweiz · −10% mit Code WEL» | https://www.instagram.com/reel/DbVQd7GinD2/ |
| Instagram | 2026-07-28 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «r jeden Tag. ⌚ Blitzversand aus der Schweiz: in 1–2 Tagen bei d» | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 42 | DOPPEL | gleiche Warengruppe «uhr» 2 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVZgK_kv1U/ |
| Instagram | 2026-07-28 | 42 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «e — CHF 21.90. Blitzversand aus der Schweiz · −10% mit Code WEL» | https://www.instagram.com/reel/DbVMo7IDmbK/ |
| Instagram | 2026-07-28 | 36 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVQaq0lhRv/ |
| Instagram | 2026-06-14 | 36 | FORMAT | Bild 1024×1024 — Breite unter 1080 | https://www.instagram.com/p/DZj7svdktrN/ |
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
| Instagram | 2026-09-27 | 21 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Ddza2rvHVMo/ |
| Instagram | 2026-09-25 | 20 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddsmbc-DkJe/ |
| Instagram | 2026-09-23 | 20 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Ddoi3MMlLPX/ |
| Instagram | 2026-09-30 | 18 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd5qYj2AKyw/ |
| Instagram | 2026-09-29 | 17 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/Dd3g5S9FA18/ |
| Instagram | 2026-09-26 | 16 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DdvW8OwFLBZ/ |
| Instagram | 2026-09-24 | 16 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DdpyPQLFFjb/ |
| Instagram | 2026-07-28 | 16 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ4Z4lu5Q/ |
| Instagram | 2026-07-28 | 15 | DOPPEL | gleiche Warengruppe «uhr» 0 h nach https://www.instagram.com/p/DbVJV_SDkIz/ (Raster wirkt doppelt) | https://www.instagram.com/p/DbVJ3F3Fseo/ |
| Instagram | 2026-09-24 | 14 | FORMAT | Bild 1000×1000 — Breite unter 1080 | https://www.instagram.com/p/DdqcqhXm4wX/ |
| Pinterest | 2026-09-04 | 14 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1w4wMjkjZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582500/ |
| Instagram | 2026-10-02 | 13 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd-fGWZF66i/ |
| Instagram | 2026-09-30 | 12 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd6UQDolC60/ |
| Instagram | 2026-09-29 | 11 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd2wskBlPZN/ |
| Instagram | 2026-09-24 | 11 | FORMAT | Bild 720×630 — Breite unter 1080 | https://www.instagram.com/p/Ddr7Lk4nPix/ |
| Instagram | 2026-07-28 | 11 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DbVQ15-kqMv/ |
| Instagram | 2026-10-01 | 10 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd8c9kQkWlV/ |
| Instagram | 2026-09-28 | 8 | FORMAT | Bild 720×964 — Breite unter 1080 | https://www.instagram.com/p/Dd0ucPOjRpC/ |
| Pinterest | 2026-09-04 | 7 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dc1zAj-GoFP/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645579582505/ |
| Instagram | 2026-10-02 | 6 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/Dd_IenVDLiC/ |
| Facebook | 2026-09-23 | 6 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140069977350792 |
| Facebook | 2026-09-23 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140221003350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 1/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 3/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 4/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 5/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 1024×1024 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 6/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Facebook | 2026-09-03 | 5 | FORMAT | Bild 888×888 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) (Medium 7/8) | https://www.facebook.com/122102579637350792/posts/122135105943350792 |
| Instagram | 2026-10-02 | 4 | FORMAT | Bild 720×720 — Breite unter 1080 | https://www.instagram.com/p/DeAcgz8DcUF/ |
| Facebook | 2026-10-01 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142247113350792 |
| Facebook | 2026-10-01 | 3 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142247113350792 |
| Facebook | 2026-09-03 | 3 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122135101689350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 750×750 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142095595350792 |
| Facebook | 2026-09-30 | 2 | FORMAT | Bild 900×900 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141997921350792 |
| Facebook | 2026-09-29 | 2 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141772387350792 |
| Facebook | 2026-09-29 | 2 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141690895350792 |
| Facebook | 2026-09-28 | 1 | FORMAT | Bild 896×1200 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122141469087350792 |
| Facebook | 2026-09-26 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140943505350792 |
| Facebook | 2026-09-25 | 1 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140661457350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 883×773 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140607019350792 |
| Facebook | 2026-09-24 | 1 | FORMAT | Bild 1000×1000 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122140352715350792 |
| Pinterest | 2026-09-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd1YiSEDDur/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667871/ |
| Pinterest | 2026-09-29 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd2VJQIFPf6/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581667814/ |
| Pinterest | 2026-09-25 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdqcqhXm4wX/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581314388/ |
| Pinterest | 2026-09-24 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdoSCmhkuU7/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581236221/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdmhRxtjUIZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581153922/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/DdnatlxD0nV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152467/ |
| Pinterest | 2026-09-23 | 1 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/DdnNSHEDMja/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581152144/ |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142787947350792 |
| Facebook | 2026-10-02 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142708879350792 |
| Facebook | 2026-10-02 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142708879350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142592419350792 |
| Facebook | 2026-10-02 | 0 | FORMAT | Bild 800×800 — Breite unter 1080 (grösste Fassung, die Facebook gespeichert hat) | https://www.facebook.com/122102579637350792/posts/122142526185350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142448359350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142448359350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.facebook.com/122102579637350792/posts/122142400221350792 |
| Facebook | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.facebook.com/122102579637350792/posts/122142400221350792 |
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
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd8Phq_GZlZ/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581918302/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd9HHI8Er06/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916838/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd-D2V1nTgU/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916695/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd9yh8cjF7b/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916556/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd-fGWZF66i/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916553/ |
| Pinterest | 2026-10-02 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-02 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd9wpt-Hy9g/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916552/ |
| Pinterest | 2026-10-02 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd8c9kQkWlV/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581916551/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd6ZB2Djknh/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833693/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd7UPmeFVkk/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833550/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/reel/Dd6wC1RiWEd/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833432/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7MPHWj3ku/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833290/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7DUIujzrT/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833288/ |
| Pinterest | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «🇨🇭 Ab Schweizer Lager – in 1–2 Werktagen» | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-10-01 | 0 | VERSAND | Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «Belp, kein Konzern. Versand ab Schweizer Lager in 1–2 Werk» | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd7zdhfFDPa/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833289/ |
| Pinterest | 2026-10-01 | 0 | DIREKTLINK | Pin verlinkt https://www.instagram.com/p/Dd5qYj2AKyw/ statt einer Produktseite | https://www.pinterest.com/pin/1111333645581833286/ |
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

Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. 13 Beiträge ohne `luxestyle.ch/products/…`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — Weg: FB-API POST /{post-id} message=… [Q1]

<details><summary>Liste</summary>

- 2026-09-23 05:39 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140105137350792 · «EMS Mikrostrom Massagegerät · CHF 22.90 Kleiner Schweizer S…»
- 2026-09-23 02:08 UTC · 6 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140069977350792 · «Verwöhne deine Haut mit dem Rosenquarz Gua Sha Set – für na…»
- 2026-09-23 14:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140221003350792 · «Kristall-Set 3-teilig · CHF 29.90 Kleiner Schweizer Shop au…»
- 2026-09-03 21:39 UTC · 5 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135105943350792 · «Von allem etwas – 8 Lieblinge aus 8 Welten 🌍 Wisch dich du…»
- 2026-09-30 16:21 UTC · 3 Aufrufe · https://www.facebook.com/reel/1036507699423763/ · «Echt getragen, nicht im Studio fotografiert. Zwei Kleider, …»
- 2026-09-03 21:20 UTC · 3 Aufrufe · https://www.facebook.com/122102579637350792/posts/122135101689350792 · «Dein Sound für jedes Abenteuer – solarbetrieben, wasserdich…»
- 2026-09-26 06:10 UTC · 1 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140943505350792 · «🍂 Herbst-Favorit Martin Ankle Boots im britischen Casual-S…»
- 2026-08-05 09:02 UTC · 1 Aufrufe · https://www.facebook.com/reel/2325684204502310/ · «Mach dis eigets Teil 🎨 T-Shirt, Hoodie, Täsche oder Tasse …»
- 2026-09-27 20:01 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122141356965350792 · «🍂 Herbst-Favorit Kapuzen-Sweatshirt-Kleid mit Gürtel · CHF…»
- 2026-09-25 23:08 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140880307350792 · «🍂 Herbst-Favorit USB Aroma Diffusor mit Befeuchter · CHF 2…»
- 2026-09-25 16:33 UTC · 0 Aufrufe · https://www.facebook.com/122102579637350792/posts/122140807437350792 · «🍂 Herbst-Favorit Kurzer Fleece-Kapuzenpullover für Damen ·…»
- 2026-08-06 17:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1563305552100842/ · «LuxeStyle in 30 Sekunde 🇨🇭 Mode · Schmuck · Beauty · Selb…»
- 2026-08-04 09:02 UTC · 0 Aufrufe · https://www.facebook.com/reel/1044133014890179/ · «Das isch LuxeStyle 🇨🇭 Premium-Mode, Schmuck u Beauty us d…»

</details>

## Nicht prüfbar

- Preis ohne sichere Produktzuordnung (99): https://www.instagram.com/p/Dd5qYj2AKyw/ · https://www.instagram.com/p/Dd0EM26kdvw/ · https://www.instagram.com/p/Ddumv_9lNi3/ · https://www.instagram.com/p/Ddt5dW5FNsS/ · https://www.instagram.com/reel/Ddtv5Z1Epoh/ · https://www.instagram.com/p/DdsyP5Cl3v2/ · https://www.instagram.com/reel/Ddsmdr2CdwM/ · https://www.instagram.com/p/Ddsmbc-DkJe/ · https://www.instagram.com/p/Ddr7Lk4nPix/ · https://www.instagram.com/reel/DdrvVenEe2j/ · https://www.instagram.com/reel/Ddqcs8oCskw/ · https://www.instagram.com/p/DdqcqhXm4wX/ · https://www.instagram.com/p/DdqK05YFML3/ · https://www.instagram.com/p/DdpyPQLFFjb/ · https://www.instagram.com/p/DdpMLlyHJYD/ · https://www.instagram.com/p/Ddoi3MMlLPX/ · https://www.instagram.com/reel/DdoSCmhkuU7/ · https://www.instagram.com/p/DdnlCi-jkth/ · https://www.instagram.com/reel/DdnatlxD0nV/ · https://www.instagram.com/reel/DdmhRxtjUIZ/ · https://www.instagram.com/p/Dc1zAj-GoFP/ · https://www.instagram.com/p/Dc1w4wMjkjZ/ · https://www.instagram.com/reel/DcMSDwjFGHj/ · https://www.instagram.com/reel/DbftCVqDqVO/ · https://www.instagram.com/reel/DbVQd7GinD2/ …
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
