# KATALOG AUS VERKEHRSSICHT — «verbessere katalog» (14.09.2026, 18:20–20:30 UTC)

Marken: GEMESSEN = hier nachgeprüft, mit Werkzeug und Zahl. Messgerät: `tools/verkehrsseiten_messen.py`
(Selbsttest mit Gegenprobe bestanden; misst Landeseiten-Produkte sitzungsgewichtet).

## 1. Wo der Katalog gesehen wird (GEMESSEN, ShopifyQL, 30 Tage)
| Landeseiten-Typ | Sitzungen | Warenkorb | Kasse |
|---|---:|---:|---:|
| Produktseite | **957** | 10 | 5 |
| Startseite | 208 | 2 | 2 |
| Kollektion | 92 | 0 | 0 |
| Seite / Blog / Suche | 85 | 0 | 0 |
→ Der Katalog wird zu 70 % über EINZELNE Produktseiten betreten (Google-Gratis-Einträge). «Katalog verbessern»
heisst zuerst: die Produkte, auf denen der Verkehr landet — nicht 52'000 gleich.

## 2. Vorher (GEMESSEN, 400 Landeseiten-Produkte der letzten 90 Tage, 3'257 Sitzungen)
- **167 Produkte (1'232 Sitzungen, 38 %) sind DRAFT** → die Seite ist ein 404. 114 davon BigBuy (Adidas/Puma/…,
  am 04.09. wegen `nicht-lieferbar-ch`/`ausverkauft-lieferant` zu Recht entworfen), 33 `keine-lieferanten-ref`,
  18 ohne Grund-Tag. In den letzten 30 Tagen nur noch 30 von 480 Sitzungen (6 %) — Google räumt die alten
  Einträge ab. 106 hatten schon eine Weiterleitung, **61 nicht** (281 Sitzungen).
- Auf den 221 AKTIVEN (1'955 Sitzungen), sitzungsgewichtet:

| Klasse | Sitzungen vorher | nachher |
|---|---:|---:|
| SEO-Beschreibung > 160 Zeichen (Google schneidet) | 832 | **0** |
| Floskel («Material: hochwertiges Material» als Faktenzeile) | 815 | 189 (Rest = «hochwertig» im Fliesstext) |
| USA/EU-Lieferzusage «je nach Land» (CJ, nicht POD) | 224 | **0** |
| Gewicht > 712 g (Verlustklasse, Information) | 140 | 140 |
| Sie-Anrede | 96 | 96 (kein deterministischer Fixer; Detektor zu grob, s. u.) |
| nur 1 Bild (ohne POD) | 20 | 20 |

## 3. Umgesetzt (deterministisch, live, gegengeprüft)
1. **Weiterleitungen:** 61 gedraftete Landeseiten → passende, per HTTP 200 geprüfte Kollektion (Wortüberlappung
   Handle/Titel ↔ Kollektion, sonst kleinste passende). 1'177 → 1'236 Redirects. Liste `dropship/_redirects_landeseiten_0914.tsv`.
2. **`automation/material_platzhalter.py`** (Selbsttest): Zeile `<li><strong>Material:</strong> hochwertiges Material</li>`
   entfernt — Landeseiten 49, **katalogweit 143 → 0** (Bulk-Export 52'215 aktive).
3. **USA-Lieferblock:** `versand_jenachland.py` im LISTE-Modus: 27 Landeseiten, dann **346 CJ + 475 POD katalogweit
   → Gegenprobe: 0 Produkte mit Block** (Suche «je nach Land» aktiv: 2 Treffer, 0 mit Block).
4. **`automation/seo_desc_kuerzen.py`** (Selbsttest): 1'050 SEO-Beschreibungen > 160 → ≤ 155 an Satz-/Wortgrenze, 0 Fehler.
5. Messgerät korrigiert (zählte Absicht als Fehler): leerer SEO-Titel = Shopify nimmt Produkttitel; Metafeld
   `custom.lieferzeit` rendert das Theme nicht; POD-Tag `printful_personalized_product` erkannt.

## 4. Zwei Sisyphus-Funde
- **Der tägliche Wächter erreichte sein Ende nie:** `versand_jenachland` (QUELLE=live) fand 1'000 Kandidaten, kam bis
  ~750 und wurde vom stündlichen Container-Neustart getötet — jeder Neustart begann vorne (Log: dreimal «… 150/1000»).
  Der Schwanz (346 CJ + 475 POD) trug den Block fünf Tage nach «FERTIG». Fix: Kandidatenliste rotiert hinter das
  zuletzt quittierte Produkt (`kandidaten_live`).
- **Alle 346 CJ-Produkte wurden am 14.09. 04:25 UTC zurückgeschrieben** (updatedAt), alle standen schon einmal als
  «ersetzt» im Ledger. Shopify-Events zeigen Textänderungen nicht; kein eigenes Ledger, kein Transkript um 04:2x —
  ein Fremdschreiber (zweite Session/Routine) mit alter Textbasis. Der tägliche Wächter heilt das jetzt, weil er
  durchläuft; der Schreiber selbst ist nicht benannt.

## 5. Nicht gemacht (bewusst)
- Sie-Anrede: Detektor trifft 25'631 von 52'215 — «Sie ist aus Polyester» (Pronomen) ist keine Anrede. Erst ein
  besserer Detektor, dann ein Lauf.
- Gewicht > 712 g: Verlustklasse, aber Betreiber 14.09.: «Katalog nicht verkleinern». Preisboden-Werkzeug bleibt zuständig.
- Kollektionsseiten (92 Sitzungen, 0 Warenkörbe) und Task #78 (Menü/Facetten): nächste Runde.
