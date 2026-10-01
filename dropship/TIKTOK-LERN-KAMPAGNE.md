# TikTok-Lernkampagne (Betreiber 01.10.2026: «mach du bis kein geld drauf ist für lernen»)

## Auftrag
Nur das vorhandene Guthaben verbrauchen, nichts nachladen. Ziel = lernen, welche Produkte/Videos auf TikTok Klicks
und Warenkörbe bringen.

## Gemessen 01.10. (Konnektor = allengchour@gmail.com)
- BC «Luxestlye Ch» 7646326045779476481, Zahlungs-Portfolio 7646305748766655240 (SHARED): Bargeld CHF 93.28 total,
  laut Betreiber-Screenshot 86.29 verfügbar; verbunden mit beiden Konten:
  - «Luxestlye Ch» 7646326014504976401 (leer) ← dieses Konto nehmen
  - «Luxestlye Ch0524» 7643589765259493393 (Juni-Kampagne, beendet)
- Identitäten: 0 in beiden Konten, 0 TikTok-Konten im BC.

## Blocker (nur Betreiber)
TikTok lässt Anzeigen mit «eigener Identität» (Name + Logo, ohne TikTok-Konto) auf der TikTok-Platzierung
nicht mehr zu (API-Doku ad_create: seit 15.01.2026 für neue, auch für bestehende Konten). Es gehen nur noch
**Spark Ads** = Anzeigen über das TikTok-Konto @luxestyle.ch. Dafür muss @luxestyle.ch im BC verknüpft sein:
Business Center → Assets → TikTok-Konten → Hinzufügen → @luxestyle.ch → in der TikTok-App bestätigen.

## Plan, sobald verknüpft
- Kampagne TRAFFIC, **Gesamtbudget (BUDGET_MODE_TOTAL) CHF 80** = harter Deckel unter dem Guthaben.
- 1 Anzeigengruppe: Schweiz, 18+, nur TikTok-Platzierung, Ziel Klick, gleichmässig über ~4 Tage.
- 3–4 Spark Ads aus bestehenden @luxestyle.ch-Posts mit der besten Sehdauer (Metricool), je auf die
  Produktseite, Link mit `utm_source=tiktok&utm_medium=paid&utm_campaign=lernen-okt26`.
- Messen: TikTok (Klicks, CPC je Anzeige) + Shopify (Sitzungen, Warenkörbe, Kasse je UTM).
- Kein Pixel im Konto → Käufe misst Shopify, nicht TikTok.

## 01.10. — Anzeigen gebaut und geprüft (Betreiber «ein meisterwerk mit checken»)
Werkzeug neu: `automation/reel/anzeige_bauen.py` (Intro 3 Schnitte à ⅓ s, Clip, Farbfotos, bewegte Schlusskarte mit
Live-Preis; Gesichter frei: Hochformat liegt UNTER der Textzone y 430–1730). Produkte = stärkster Kaufbeleg
(nachfrage-/kunden-liebling), alle drei bei CJ lieferbar (product/query 01.10.: ok).

| Anzeige | Dauer | Tor (Hook/Still/LUFS) | Gemini-Jury | Datei |
|---|---|---|---|---|
| Abendkleid «Sirène» CHF 49.90 | 8,8 s | 9,04 / 33 % / −14,4 | **9,83** | `social/anzeigen/tiktok-lernen-sirene.mp4` |
| Abendkleid «Aurora» CHF 69.90 | 9,7 s | 8,63 / 30 % / −14,5 | **9,0** | `social/anzeigen/tiktok-lernen-aurora.mp4` |
| Leinen-Set «Provence» CHF 39.90 | 10,9 s | 7,15 / 27 % / −13,9 | **9,17** | `social/anzeigen/tiktok-lernen-provence.mp4` |

Korrekturen unterwegs (alle am Kontaktbogen/Tor/Jury belegt): 3:4-Bilder zu klein + STILL 55 % → Hochformat gross;
Vollbild legte Schriftzug/Hook aufs Gesicht → Bild unter die Textzone; Sirène STILL 64 % → Clip 2,5 s mit Fahrt,
schnellere Fotos; Hook + Preisband gleichzeitig (Jury: «redundant») → nacheinander; Aurora begann mit Studiofoto
(Jury: «inkonsistent») → Aussenaufnahmen zuerst; «Kauf auf Rechnung · Klarna · TWINT» (Kritik: TWINT ist kein
Rechnungskauf) → «TWINT · Rechnung (Klarna) · Karte».

**KI-Hinweis:** Sirène + Provence enthalten Veo-animierte Clips (08.06., aus Produktfotos). TikTok verlangt für
realistische KI-Inhalte ein Label — bei Spark Ads über das TikTok-Konto setzt man es in der App/im Ads Manager.

Kritik ChatGPT/Kimi (01.10.), geprüft: Lieferzeit steht auf der Produktseite («10–20 Werktage, Direktversand ab
Lieferantenlager») ✓; FAQ nennt Zoll ✓; offen/zu beachten: Einfuhr-MwSt ab ~CHF 62 Warenwert (Aurora 69.90),
Sirène 49.90 liegt 10 Rp. unter Gratisversand (7 Kassen, 0 Käufe — Versandkosten an der Kasse als möglicher Grund),
nur Deutschschweiz ansprechen (Sprache de), Kommentare in der Testphase aus.

## Entscheidregeln (vor dem Start festgelegt)
- Nach CHF 25 je Anzeige: Kosten/Klick > CHF 0.60 oder Klickrate < 0,5 % → Anzeige aus.
- Beste Anzeige = meiste Shopify-Warenkörbe je Franken (UTM), nicht die meisten Klicks.
- TikTok-Klicks vs. Shopify-Sitzungen: 20–40 % Lücke ist normal (In-App-Browser), kein Fehler.
- Bei 0 Käufen nach CHF 80: Ergebnis = welches Produkt/Video den billigsten Warenkorb bringt → Grundlage für
  organische Posts und die spätere Kampagne mit Pixel (Konto «LuxeStyle CH Ads»).

## ✅ 30.09. 21:16 UTC — drei Spark Ads angelegt (Routine trig_01K2gxc6YXt7kTcK3sbsFoQf)
Posts gemessen über `identity_video_get` (BC_AUTH_TT): alle drei organisch live, Status `ITEM_STATUS_HESITATE_RECOMMEND`
(tragen auch alle älteren Posts — kein Befund), `is_ai_generated: true` (KI-Kennzeichnung aus Metricool greift).

| Anzeige | ad_id | TikTok-Post | Zielseite (utm_content) |
|---|---|---|---|
| Sirène CHF 49.90 | 1877793049771441 | 7691427221021527329 | `/products/abendkleid-sirene-high-slit-meerjungfrau-mit-schleppe` (sirene) |
| Aurora CHF 69.90 | 1877793049796626 | 7691432399791476000 | `/products/abendkleid-aurora-satin-spaghettitrager-schlitz` (aurora) |
| Provence CHF 39.90 | 1877793049796642 | 7691437492066733344 | `/products/2-teiliges-leinen-set-provence-hemd-wide-leg-hose` (provence) |

- Alle mit CTA SHOP_NOW, `utm_source=tiktok&utm_medium=paid&utm_campaign=lernen-okt26`. Anzeigengruppe 1877789510086802
  (CH, Frauen 18–54, Ziel Klick, Gesamtbudget **CHF 80**, 30.09. 21:30 – 04.10. 21:30 UTC), Kampagne 1877789482580273.
- **Anzeigentext = Post-Text** (Spark Pull übernimmt die Caption; unser `ad_text` ohne Emoji wurde ersetzt — kein Fehler).
- Review: `ad_review_info` → alle drei `is_approved: true / ALL_AVAILABLE`; `ad_get` → `AD_STATUS_AUDIT` (Prüfung läuft noch).
- Nächste Messung: 01.10. abends — Ausgaben, CTR, CPC je Anzeige (`report_integrated_get`) + Shopify-Sitzungen mit
  `utm_campaign=lernen-okt26`; Entscheidregeln oben (nach CHF 25 je Anzeige: CPC > 0.60 oder CTR < 0,5 % → aus).

## 📏 01.10. 18:52 UTC — erste Messung (Routine trig_01DcoZoJLS4YPyxtPsbNpYyt)
TikTok `report_integrated_get` (Lebenszeit, Konto 7646326014504976401) · Shopify ShopifyQL `utm_campaign = 'lernen-okt26'` (3 T):

| Anzeige | Ausgaben CHF | Impr. | Klicks | CTR | CPC | Ø Sehdauer | Shopify-Sitz. | Warenkorb | Kasse | Kauf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Sirène | 7.85 | 5'359 | 37 | 0,69 % | 0.21 | 1,25 s | 45 | 0 | 0 | 0 |
| Aurora | 3.31 | 5'626 | 25 | 0,44 % | 0.13 | 1,13 s | 37 | 0 | 0 | 0 |
| Provence | 3.26 | 4'322 | 19 | 0,44 % | 0.17 | 1,06 s | 30 | 0 | 0 | 0 |
| **Total** | **14.42** | 15'307 | 81 | 0,53 % | 0.18 | | 112 | 0 | 0 | 0 |

- Alle drei `ENABLE` / `AD_STATUS_DELIVERY_OK`. **Entscheidregel greift noch nicht** (keine Anzeige hat CHF 25 erreicht) →
  nichts abgeschaltet, kein Budget geändert. Aurora + Provence liegen mit 0,44 % CTR unter der 0,5-%-Schwelle — bei CHF 25
  je Anzeige wieder prüfen.
- Shopify zählt MEHR Sitzungen (112) als TikTok Klicks (81) — erwartet war eine Lücke nach unten. Möglich: Mehrfach-Sitzungen
  derselben Person (In-App-Browser) oder Bot-Vorschauen; Befund festhalten, nicht deuten.
- Ø Sehdauer 1,06–1,25 s = wie organisch (Median 1,37 s, Videoschnitt-Skill): der Einstieg hält noch nicht. 0 Warenkörbe
  bei 112 Sitzungen → Produktseite/Preis ist die nächste Frage, nicht die Anzeige.
- Nächste Messung: wenn eine Anzeige CHF 25 erreicht (bei ~CHF 14/Tag Gesamttempo ca. 02./03.10.).
