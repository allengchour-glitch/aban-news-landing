# Werbetest-Plan: ein Produkt, kleines Budget, Messung bis zum Kauf (10.10.2026)

Grundlage: Sidekick-Empfehlung 4 («Erst danach gezielt Werbung testen … nicht nur Klicks messen»). **Budget und Start entscheidet der Betreiber.**
Dieser Plan legt fest, was vorher erledigt sein muss, was getestet wird und wann der Test als gescheitert gilt.

## Was die letzte Kampagne zeigt (gemessen, `tools/werbetest_trichter.py`)

| Quelle / Kampagne (30 T) | Sitzungen | Warenkorb | Kasse erreicht | Kauf |
|---|---|---|---|---|
| TikTok `lernen-okt26` (CHF 80, 01.–04.10.) | 548 | 8 (1.5 %) | **6** | **0** |
| ChatGPT-Empfehlungen (gratis) | 112 | 6 (5.4 %) | 2 | 1 |
| Facebook `autopilot` (Posts) | 96 | 0 | 0 | 0 |
| ohne Kampagne (direkt) | 1'078 | 20 (1.9 %) | 13 | 2 |

**Sechs Personen erreichten aus TikTok die Kasse, keine kaufte.** In der Kasse sahen sie zwei Dinge zum ersten Mal: CHF 7 Versand und ein Lieferdatum, das früher lag als auf der Produktseite. Der Kaufweg-Test vom 10.10. bestätigt das (`dropship/KAUFWEG-HANDY-2026-10-10.md`).

## Vor dem Start (Voraussetzungen)

1. ⏳ **Betreiber-Klick:** Bearbeitungszeit 1 → 4 Werktage, damit das Kassen-Datum zur Produktseite passt (`COWORK-BEFEHL.md`, oberster Punkt). Ohne ihn verspricht die Kasse ~20.10., die Seite 26.10.–9.11.
2. ✅ Produktseiten «Sirène», «Aurora», «Provence» überarbeitet: Lieferumfang, Anlässe, Lieferung, keine irreführende Grössentabelle.
3. ✅ Preis und Lieferzeit stehen jetzt im ersten Handy-Bildschirm (Titel kleiner, Brotkrumen kürzer).
4. ✅ Startseite: «Damenmode – unsere Favoriten» direkt unter dem Hero.
5. ⏳ Echte Masse und Material von CJ für die drei Kleider (CJ-Abfragetopf heute leer; nach dem Reset 00:00 UTC).

## Testvorschlag

| | |
|---|---|
| **Produkt** | Abendkleid «Sirène» — meiste Warenkörbe aus TikTok (4–6), Saison Weihnachtsfeier/Silvester, 10 Bilder |
| **Preisfrage (Betreiber)** | CHF 49.90 liegt **10 Rappen unter** der Gratis-Versand-Schwelle; in der Kasse kommen CHF 7 dazu. Entweder Preis CHF 50.90 (dann gratis Versand, Gewinn je Kauf ~CHF 21 statt ~26) oder so lassen. Alternative Produkt: «Aurora» CHF 69.90, Versand gratis, Gewinn ~CHF 40, aber 0 Warenkörbe aus 159 TikTok-Besuchen |
| **Gewinnschwelle** | Preis − Einkauf (~CHF 20.75) − Fracht (~CHF 8) − Zahlgebühr ≈ **CHF 26 je Kauf** (bei CHF 49.90 + 7 Versand) |
| **Budget** | CHF 70: 7 Tage à CHF 10 |
| **Kanal** | TikTok (neues Werbekonto «Luxestyle_adv», Vertrag noch offen, 0 Pixel) oder Meta; Messung läuft über Shopify, nicht über das Pixel |
| **Link** | `https://luxestyle.ch/products/abendkleid-sirene-high-slit-meerjungfrau-mit-schleppe?utm_source=tiktok&utm_medium=paid&utm_campaign=sirene-test` |
| **Zielgruppe** | Frauen 25–54, Schweiz, Interessen Mode / Party / Hochzeit |
| **Inhalt** | Reel aus den Produktbildern (Werkzeug `automation/reel/schnitt.py`), Hook «Abendkleid für die Weihnachtsfeier», Preis im Bild |

## Messung und Abbruchregeln

Täglich: `BUDGET=<ausgegeben> MARGE=26 python3 tools/werbetest_trichter.py sirene-test`

- **Stopp nach CHF 30**, wenn 0 Warenkörbe. Das Produkt oder die Zielgruppe trägt dann nicht.
- **Weiter bis CHF 70**, wenn die Warenkorb-Quote ≥ 3 % ist (doppelt so hoch wie in der Oktober-Kampagne).
- **Erfolg**, wenn Kosten je Kauf ≤ CHF 26. Dann vorsichtig verdoppeln.
- **Wenn die Kasse wieder Abbrecher hat, aber keine Käufe:** Kasse prüfen (`tools/kaufweg_handy.mjs`), nicht mehr Budget.
- **Vergleichsmassstab:** ChatGPT-Besucher (5.4 % Warenkorb, 0.9 % Kauf, gratis).
