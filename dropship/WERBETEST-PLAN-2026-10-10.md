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
| **Kanal** | **Google Shopping zuerst** (Messung 10.10. 17:45, ShopifyQL 90 T nach Herkunft: Google-Suche 404 Sitzungen → 12 Warenkorb → 9 Kasse → **3 Käufe**; TikTok 910 → 4 → 2 → 0; Facebook 815 → 0; Pinterest 115 → 3 → 1 → 0). Sirène ist im Kanal «Google & YouTube». Kampagne in Google Ads als Standard-Shopping, Produktgruppe nur Sirène (bzw. Tag `fokus-damenmode`), Suffix `utm_source=google&utm_medium=cpc&utm_campaign=sirene-test`. TikTok (Werbekonto «Luxestyle_adv», Vertrag offen) erst als zweiter Test — ⚠️ 10.10. ~17:56 UTC: Konnektor `advertiser_info_get` auf 7691398659300179974 = **40001 «No permission»** (am 01.10. noch lesbar). ⚠️ ungeprüft: ob ein Google-Ads-Konto existiert. **Kein Google-Ads-Konnektor verbunden** (Registry: nur Drittanbieter wie Adspirer/Windsor/Supermetrics) → Kampagne + Zahlungsmittel legt der Betreiber an (Shopify-App «Google & YouTube» → Kampagnen), ich führe per Bildschirmfoto und messe danach täglich |
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

## Stand 10.10. 18:30 UTC

- **Google-Ads-Konto 719-826-3241** (allengchour@gmail.com), neu; Betreiber hat am 10.10. **CHF 70.00 manuell eingezahlt** (Mastercard ••1878), Guthaben 70.00, Kosten 0. Die Shopify-App «Google & YouTube» zeigt «Problem mit Google Ads-Konto», ihr Einrichtungsschritt «Verknüpfung mit Google Ads-Konto» ist **übersprungen**; installierte Tags AW-18174567886, GT-WVRZQPLZ.
- **Sirène trägt `mm-google-shopping.custom_label_0 = werbetest`** (gesetzt 18:30 per API) → in Google Ads Produktgruppe «Benutzerdefiniertes Label 0 = werbetest», Rest ausschliessen (sichtbar nach Feed-Abgleich, einige Stunden).
- Kampagne: Standard-Shopping (nicht Performance Max), Schweiz, CHF 10/Tag, «Klicks maximieren» mit CPC-Limit CHF 0.60, Ende 17.10., Suchnetzwerk-Partner aus, Suffix `utm_source=google&utm_medium=cpc&utm_campaign=sirene-test`.
- **18:50 UTC: Kampagne «Sales-Shopping-1» (ID 24340093418) angelegt**, CHF 10/Tag, Status «Ausstehend – Anzeigen werden überprüft», 0 Kosten. Artikel-IDs im Feed = `shopify_zz_15412915110273_<variant>` (8 Stück).
  ⚠️ Erste Unterteilung war VERKEHRT herum: die 8 Sirène-IDs «Ausgeschlossen», «Alles andere» aktiv → Betreiber angewiesen umzudrehen (Sirène einschliessen, Rest ausschliessen). Vor dem ersten Ausspielen nachprüfen.
- **19:15 UTC GEMESSEN (ShopifyQL, utm_campaign=sirene-test):** Kampagne lief in der Stunde 19:00 schon aus — **10 bezahlte Klicks, alle auf FREMDEN Produkten**
  (Gel-Nagellackstift 2, Nachtlicht, Baustellenset, Heizgerät, Nagelclipper, Katzennapf, Stuhlhusse, PKW-Service-Center, Stoppuhr), weil «Alles andere» beim
  Umbauen kurz aktiv war. Gute Nachricht: der URL-Suffix wirkt (utm_source=google, utm_medium=cpc). Ausgabe dafür ≤ CHF ~6 (geschätzt, Konto zeigt den Betrag).
- **Ampel-Zeile «WERBETEST»** (`betreiber_ampel.werbetest()`, Steuerdatei `dropship/_werbetest_aktiv.json` bis 17.10. + 3 T): Trichter seit Start, Obergrenze
  Ausgaben = Tagesbudget × Tage, Stopp-Regel CHF 30 ohne Warenkorb, ⚠️ Sitzungen auf fremden Produkten (Landeseite ≠ Sirène-Handle).
- **19:58 UTC:** Shop zeigt heute 19 bezahlte Klicks (utm_campaign=sirene-test), **alle auf fremden Produkten, 0 auf dem Kleid**. Seit der Messung um ~19:55 sind 3 neue dazugekommen
  → die Produktgruppen-Umstellung wirkt noch nicht (oder ist nicht gespeichert). Die Google-Ads-App zeigt 0 Klicks, das ist Verzögerung (Google: «Berichterstellung erfolgt nicht in Echtzeit»).
  Entscheid bis zum Bild der Produktgruppen: Kampagne pausieren.
