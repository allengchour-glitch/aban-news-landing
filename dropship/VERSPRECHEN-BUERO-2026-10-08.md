# «verbessere alles und sauber» — Versprechen ohne Beleg, Büro-Sammelkorb (08.10.2026, 20:20–21:00 UTC)

## 1. Liefer- und Eigenversprechen ohne Beleg

**Gefunden an der Seite mit dem meisten Kaufwillen ohne Kauf** (Leinen-Set «Provence»: 41 Sitzungen, 2 Warenkörbe,
0 Käufe): Google-Beschreibung «Schweizer Shop, schnelle Lieferung», auf derselben Seite «Lieferzeit Schweiz: 10–20 Werktage».

| GEMESSEN (51'720 aktive, Export 20:25 UTC) | Anzahl | Lieferzeit laut Seite |
|---|---:|---|
| SEO-Beschreibung «schnelle Lieferung» | 106 (+1 «Sofort Lieferbar») | 101× 10–20, 5× 7–14 Werktage |
| «Schweizer Lager» in SEO-Texten | 174 | alle Fortura (Schweizer Lieferant) → **richtig, bleibt** |
| «🇨🇭 Schweizer Shop · Qualität geprüft» im Text | 4 | seit 02.09. heisst der Baustein «Geprüfte Angaben» |
| «meistverkauft» im Text | 6 | 3 Verkäufe in 30 Tagen |
| «sofort lieferbar» im Text | 1 | 10–20 Werktage |

**Geändert: 118 Produkte, 0 Fehler** (107 SEO-Beschreibungen, 11 Texte), rückgelesen. «schnelle Lieferung» →
«Lieferung in die ganze Schweiz» (wahr, neutral). Live geprüft: Leinen-Set-Seite ohne «schnelle Lieferung».

**Regel + Wächter:** `automation/data/versprechen_regel.json` (19 Kanarien; Tempo-Wörter nur bei `ch-lager`, Fortura,
`eu-lager` = 2–7 Werktage) → `automation/versprechen_wache.py` täglich im Aufseher (eigener Bulk-Export) und
`versprechenSicher` im Importer-Einhängepunkt `textPolieren` (`cj_copy_prompt.mjs`, py=js 19/19,
`versprechen_gleichlauf_test.mjs`). An der Quelle: 5 Generatoren schrieben «schnelle Lieferung (7–14 Tage)»
(seo-optimizer.mjs, shop_brain.mjs, seo_catalog_fix.py, catalog_enrich.py, premium_import.mjs) → korrigiert.

Warum der Fix vom 12.08. nicht hielt: `lieferzeit_widerspruch.py` war ein Einmal-Lauf ohne Wächter, las nur Titel/Text
(nicht SEO) — und der Importer brachte «Zigarettenhalter mit Band – Sofort Lieferbar» als neues Produkt zurück.

## 2. Büro & Home Office (Menü) — Typ ist kein Beleg

Die CJ-Gruppe «Büro & Home Office» ist ein Sammelkorb (heute Morgen bei Google behoben, `data/buero_korb.json`). Der
**Shop-Typ** blieb «Büro & Home Office» und war in `kategorie_rein_2.py` KERN-Typ (= Mitglied ohne Bürowort). Im Menü
standen: Badebomben, Gartenfee, Golf-Adventskalender, Jakobsmuschel mit Perle, Glücksmünze, Halloween-Süssigkeitenschale,
Regenschirm, Anatomiemodelle, Tischtennis-Kleber.

- KERN aus, Bürowort-Liste erweitert (Füller, Bleistift, Spitzer, Aktenvernichter, Tastenkappen, Marker …), «katzen(?!ohr)»,
  Vase/Dekotablett/Plüsch gesperrt → **25 raus, 2 rein** (135 → 112), Tag-Ledger `dropship/_kategorie_rein_2_tags.tsv`.
- `automation/buero_korb_typ.py` (neu, täglich nach kategorie_rein_2): Typ aus der Shopify-Kategorie, nur ausserhalb
  Büro-Zweig (os-, el-7-8) und ohne Bürowort → **14 Typen nachgezogen, 0 Fehler** (Badebomben → Beauty & Pflege,
  Gartenfee → Wohnen & Deko, Tischtennis-Kleber → Sport & Outdoor …), 35 echte Büroware bleibt, 8 ohne ableitbaren Typ bleiben.
- «Büro & Schreibwaren» (nicht im Menü, Regel Tag `buero` mit Kleidern/Kissen/Luftbefeuchtern) zeigt jetzt denselben
  sauberen Tag `kat-buero` (alte Regel in `dropship/_kategorie_rein_regeln_alt.json`).
- Stichprobe der übrigen KERN-Kollektionen (Baby & Kinder 414, Haustier 482 nur über Typ): Typ dort belegt (Kinderschuhe,
  Spielzeug-Lastwagen, Näpfe, Halsbänder) — kein Handlungsbedarf.

## 3. Abgeschnittene Titel

2 alte Titel endeten mitten im Wort («… Passendes Halsketten-», «… Büro- und») → repariert (Schmuckset Halskette &
Armband; «Arbeitshose» war laut Text eine Used-Look-Jeans). Der Importer kürzt seit August an Wortgrenzen (`kuerzen()` in
`stueckzahl.mjs`) — keine neuen Fälle (51'720 gemessen: 2).
