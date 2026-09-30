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
