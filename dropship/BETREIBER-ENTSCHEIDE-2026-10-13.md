# Betreiber-Entscheide 13.10.2026 (abends)

Quelle: Chat 13.10.2026 ~21:00 UTC, wörtlich «A ja, B ja, C ja, D ja», davor «cj kostüme ja, versandprofil ja mache es sauber und so».
Grundlage: `dropship/MEHR-KAEUFER-2026-10-13.md` (Richter «mehr Käufer»), `dropship/KAUFSTRECKE-SEITEN-2026-10-13.md`, `dropship/KASSEN-PRUEFUNG-2026-10-13.md`.

| # | Entscheid | Umsetzung | Wer |
|---|---|---|---|
| A | Google-Werbetest «geschenke-test»: 13 Geschenk-Produkte über Artikel-IDs, CHF 10/Tag, Gebot ≤ 0.50, Abbruch bei CHF 30 ohne Warenkorb, kein Nachladen ohne neuen Entscheid | Sitzung: ID-Liste + Schreibsperre-Liste (`dropship/WERBETEST-GESCHENKE-VORBEREITUNG-2026-10-13.md`), `_werbetest_aktiv.json` umstellen, täglich `tools/werbetest_trichter.py`. Betreiber: Google & YouTube → Ads-Konto verknüpfen, Kampagne Produktgruppen nach Artikel-ID (nur die 13), Screenshot vor dem Einschalten, aktivieren | beide |
| B | Fortura-Probebestellung (Draculagebiss CHF 15.90, Versand gratis), Eigenbestellung, zählt nicht als Kunde | Erst wenn der Trockentest der Kette grün ist (`dropship/FORTURA-KETTE-TROCKEN-2026-10-13.md`); danach Kette bis Zustellung beobachten, Tage notieren | Betreiber bestellt |
| C | «Gratis-Versand für Ware ab Schweizer Lager» darf beworben werden (Kasse rechnet reine CH-Lager-Körbe schon mit 0.00) | Warenkorb rechnet wie die Kasse (S1), Produktseite mit Zeichen `profil-ch-lager`: «Gratis-Versand für Ware ab Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50)», immer «in der Schweiz»; Notschalter = Produkt-Zeichen | Sitzung |
| D | WELCOME10-Falle 45–49.99: Gratis-Tarif CH ab CHF 40.50 (statt 45) | In ALLEN Profilen mit CH-Zone gleich (General, CH-Lager, ggf. Druck auf Bestellung), vorher Margenprüfung der Produkte 40.50–44.99 (melden, nicht blockieren); Band/Texte «gratis ab CHF 50» bleiben (stimmen weiter); Wächter (`versand_band_wache.py`, `ch_lager_profil.py tarife_pruefen()`, `versand_transit_wache.py`) auf die neue Schwelle | Sitzung |
| — | CJ-Halloween-Kostüme/Partydeko 15.10.–01.11. aus TikTok, FB/IG, Pinterest | `automation/anlass_social_sperre.py` (Workflow wfp5ykfvr) | Sitzung |
| — | Eigenes Versandprofil «Druck auf Bestellung» (Seite = Kasse) | `automation/druck_profil.py` (Workflow wfp5ykfvr), nur live, wenn kein Testkorb teurer wird | Sitzung |
