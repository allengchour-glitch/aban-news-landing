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

**Sechs Personen erreichten aus TikTok die Kasse, keine kaufte.** In der Kasse sahen sie ein Lieferdatum, das früher lag als auf der Produktseite (Leinen-Set 39.90 dazu CHF 7 Versand; Sirène 49.90 und Aurora 69.90 sind versandfrei, Kassen-Schwelle CHF 45 nach Rabatt). Der Kaufweg-Test vom 10.10. bestätigt das (`dropship/KAUFWEG-HANDY-2026-10-10.md`).

## Vor dem Start (Voraussetzungen)

1. ✅ **Betreiber-Klick erledigt 10.10. 17:24 UTC:** Modus «Automatisiert» → «Manuell», Fulfillment-Zeit 3 Werktage (API: `processingTime` P3D). Nachgemessen (Kaufweg Sirène): Kasse **«Do., 29. Okt – Do., 12. Nov»**, Produktseite 26. Okt – 9. Nov — die Kasse verspricht nichts mehr Früheres.
2. ✅ Produktseiten «Sirène», «Aurora», «Provence» überarbeitet: Lieferumfang, Anlässe, Lieferung, keine irreführende Grössentabelle.
3. ✅ Preis und Lieferzeit stehen jetzt im ersten Handy-Bildschirm (Titel kleiner, Brotkrumen kürzer).
4. ✅ Startseite: «Damenmode – unsere Favoriten» direkt unter dem Hero.
5. ⏳ Echte Masse und Material von CJ für die drei Kleider (CJ-Abfragetopf heute leer; nach dem Reset 00:00 UTC).

## Testvorschlag

| | |
|---|---|
| **Produkt** | Abendkleid «Sirène» — meiste Warenkörbe aus TikTok (4–6), Saison Weihnachtsfeier/Silvester, 10 Bilder |
| **Versand** | ~~Preisfrage: 49.90 liege 10 Rappen unter der Schwelle~~ — **FALSCH, korrigiert 17:30:** der Tarif «Kostenloser Versand» greift in der Kasse ab **CHF 45** (nach Rabatt, `warenkorb_einig.py` 09.10.; das Band sagt bewusst «ab CHF 50»). Gemessen: Warenkorb «Gratis-Versand gesichert · Du zahlst CHF 49.90», Kasse «Kostenloser Versand». Keine Preisänderung nötig. Alternative Produkt: «Aurora» CHF 69.90, Gewinn ~CHF 40, aber 0 Warenkörbe aus 159 TikTok-Besuchen |
| **Gewinnschwelle** | Preis 49.90 (versandfrei) − Einkauf (~CHF 20.75) − Fracht (~CHF 8) − Zahlgebühr (~1.75) ≈ **CHF 19 je Kauf** (die frühere «26» rechnete die CHF 7 Versand als Einnahme mit) |
| **Budget** | CHF 70: 7 Tage à CHF 10 |
| **Kanal** | **Google Shopping zuerst** (Messung 10.10. 17:45, ShopifyQL 90 T nach Herkunft: Google-Suche 404 Sitzungen → 12 Warenkorb → 9 Kasse → **3 Käufe**; TikTok 910 → 4 → 2 → 0; Facebook 815 → 0; Pinterest 115 → 3 → 1 → 0). Sirène ist im Kanal «Google & YouTube». Kampagne in Google Ads als Standard-Shopping, Produktgruppe nur Sirène (bzw. Tag `fokus-damenmode`), Suffix `utm_source=google&utm_medium=cpc&utm_campaign=sirene-test`. TikTok (Werbekonto «Luxestyle_adv», Vertrag offen) erst als zweiter Test. ⚠️ ungeprüft: ob ein Google-Ads-Konto existiert |
| **Link** | Google: Shopping-Anzeige führt auf die Produktseite + Suffix oben. TikTok (falls zweiter Test): `https://luxestyle.ch/products/abendkleid-sirene-high-slit-meerjungfrau-mit-schleppe?utm_source=tiktok&utm_medium=paid&utm_campaign=sirene-test` |
| **Zielgruppe** | Frauen 25–54, Schweiz, Interessen Mode / Party / Hochzeit |
| **Inhalt** | Reel aus den Produktbildern (Werkzeug `automation/reel/schnitt.py`), Hook «Abendkleid für die Weihnachtsfeier», Preis im Bild |

## Messung und Abbruchregeln

Täglich: `BUDGET=<ausgegeben> MARGE=19 python3 tools/werbetest_trichter.py sirene-test`

- **Stopp nach CHF 30**, wenn 0 Warenkörbe. Das Produkt oder die Zielgruppe trägt dann nicht.
- **Weiter bis CHF 70**, wenn die Warenkorb-Quote ≥ 3 % ist (doppelt so hoch wie in der Oktober-Kampagne).
- **Erfolg**, wenn Kosten je Kauf ≤ CHF 19. Dann vorsichtig verdoppeln.
- **Wenn die Kasse wieder Abbrecher hat, aber keine Käufe:** Kasse prüfen (`tools/kaufweg_handy.mjs`), nicht mehr Budget.
- **Vergleichsmassstab:** ChatGPT-Besucher (5.4 % Warenkorb, 0.9 % Kauf, gratis).
