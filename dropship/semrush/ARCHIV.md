# Semrush-Archiv (Stand 05.10.2026, vor der Kündigung)

**API-Guthaben: 0** (gemessen 05.10. ~10:00 UTC: jede Abfrage → `no_api_units`). Alles unten ist im Repo gesichert und
bleibt nach der Kündigung nutzbar (`automation/suchvolumen.py`, `automation/semrush_positionen.py` lesen diese Dateien).

| Datei | Zeilen | Inhalt |
|---|---|---|
| `luxestyle_ch_top30_2026-10-02.csv` | 38 | eigene Rankings Platz ≤ 30 (Keyword, Platz, Volumen, KD, URL) |
| `luxestyle_ch_platz31-100_2026-10-02.csv` + `…teil2` | 128 + 240 | eigene Rankings Platz > 30 |
| `luxestyle_ch_alle_positionen_2026-10-05.csv` | 559 | **vollständige** Rankings CH (UI-Export Betreiber): 395 Begriffe, 75 neu ggü. 02.10.; Platz 11–20: 5, 21–30: 26 |
| `audit/` | — | Site-Audit-Exporte (Crawl 03.10.), Backlinks-PDF + Auswertungen |
| `positionen/2026-10-05_db_top40.csv` | 80 | Rankings Platz ≤ 40 am 05.10. (Vergleichsbasis Tracker) |
| `kategorie_suchvolumen_ch_2026-10-02.csv` | 478 | Suchvolumen/KD/CPC zu 350 Kollektionen |
| `kategorie_suchvolumen_ch_produktarten_2026-10-02.csv` | 836 | Volumen für 218 Google-Kategorien + 41 Menü-Kollektionen |
| `kategorie_suchvolumen_ch_verwandt-A…D_2026-10-02.csv` | 260 | verwandte Begriffe mit KD |
| `adventskalender_cluster_ch_2026-10-04.csv` | 30 | Begriffs-Cluster Adventskalender |
| `semrush_serp_ch_2026-10-02.csv` | 50 | wer vor uns steht (Top 5) für 10 Begriffe |
| `semrush_fragen_ch_2026-10-02.csv` | 13 | Fragen (Ratgeber-Themen) |
| `semrush_temu_shopping_ch_2026-10-02.csv` | 8 | Shopping-Anzeigen Temu CH |
| `keywords_erweiterung_ch_2026-10-05.csv` | 6'697 | Google-CH-Vorschläge (6'351 neu) + 19 mit Semrush-Volumen; 221 Kandidaten vorsortiert |
| `position_tracking_ziele.tsv` / `POSITION-TRACKING-KEYWORDS.txt` | ~240 | Zielbegriffe mit Ziel-URL (für eine Kampagne / den Tracker) |
| Berichte `*-2026-10-0*.md`, Ledger `_*.tsv` | — | alles Geschriebene mit Altwerten (umkehrbar) |

Umgesetzt mit diesen Daten (02.–05.10.): ~170 Produkt-SEO-Titel, ~55 Kollektions-SEO, 16 neue Kollektionen, 24+ Redirects,
192 interne Links, Kannibalisierung 7 Fälle. Wirkung messen nach dem Abo: Shopify-Analytics (Landeseiten aus Google) + Tracker.

## Nachtrag 05.10. 19:00 — vollständige Ranking-Liste umgesetzt
75 neue Begriffe ausgewertet: 13 aktive Produkte mit Suchbegriff im SEO-Titel (Glätteisen kabellos, Tagfahrlicht, Magnet-Vorhang,
Stehkragen Pullover Herren, Haarfänger Dusche, Katzen Intelligenzspielzeug, Bremsscheibenschloss, Zelt 2 Personen, Leder Rucksack
Laptop, Tür Organizer, Rucksack Berufsschule, Kuschelkissen, Luftsofa); 6 rankende ENTWÜRFE weitergeleitet (Velo-Licht → velo-radsport
statt sub-reise, Muschel → wohnen-dekoration, Trekkingzelt → camping-schlafen, Sonnensegel → garten-balkon, Bürostuhl →
buro-home-office, Oversized-Sonnenbrille → sonnenbrillen-alle; `sonnenbrillen-damen` ist selbst eine Weiterleitung).
Bewusst NICHT: «smart ring» (2'900/Mt, Platz 68) — SEO-Titel enthält den Begriff schon; «mini skateboard» rankt mit einem
Finger-Skateboard (andere Ware), «schrank schubladen» mit einem Wäsche-Faltbrett (andere Ware), «uhren adventskalender» mit einer
Retro-Uhr — Titel nicht auf fremde Suchabsicht biegen.
