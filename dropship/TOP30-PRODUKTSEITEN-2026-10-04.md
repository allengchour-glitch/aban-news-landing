# Tag 5 · Top-30 besuchte Produktseiten (04.10.2026, vorgezogen)

**Messung:** `automation/top_produktseiten_check.py` (ShopifyQL, Landeseiten Typ Product, nur Menschen, 30 T) — täglich im Aufseher.
Geprüft je Seite: kaufbar (oder 301 auf kaufbares Ziel) · ≥ 5 Bilder (POD/«Selbst gestalten» ≥ 2) · Grössen-Option bei
Kleidung/Schuhen · ≥ 4 kaufbare Empfehlungen. Lieferzeit nicht je Seite: der Lieferbalken im Theme hat einen else-Zweig.

## Wie das Theme die drei Bausteine zeigt (Live-Datei `templates/product.json`, gelesen 20:20 UTC)
- **Grössentabelle** (`pages['groessentabelle']`) nur, wenn eine Option «Grösse/Groesse/Size» heisst → Kleidung ohne
  Grössen-Option zeigt keine Tabelle. In den Top 30: 0 solche Fälle.
- **Lieferzeit**: Balken mit Datum je Lager-Tag (CH-Lager 1–3 T, sonst 14–28 T), Sa/So → Montag; erscheint immer.
- **Ergänzungen**: Sektion `product-recommendations`, `recommendation_type: related`, 4 Karten (Shopify-automatisch).
  «complementary» bräuchte Search & Discovery — Betreiber-Klick (USER-CHECKLISTE 09.06.), nicht nötig: 30/30 haben 4.

## Vorher → nachher
| | vorher | nachher |
|---|---|---|
| ohne Mangel | 24/30 | **30/30** |
| Entwürfe mit Besuchern | 3 «nicht kaufbar» | alle 3 haben 301 auf kaufbares Ziel → kein Mangel (Messer prüft das jetzt) |
| Kristall-Set (einzige Top-Seite mit Kauf, #1020) | 1 Bild | 5 Bilder |
| POD (Shirt 3, Sticker 2 Bilder) | Mangel | Ziel 2 (Druckvorschauen + Grössenvorschau, kein Fotoset) |

## ⛔ Kristall-Set: Seite und Lieferung passten nicht zusammen
- Einziges Bild: **12** beschriftete Kristallspitzen (englisch: «Red jasper», «unakite» …) — verkauft als «3-teilig»
  (Rosenquarz, Bergkristall, Amethyst, «Handschmeichler 4–6 cm», «Holz-Geschenkbox», «Schweizer DE-Guide»).
- Geliefert wird seit #1020 (CJ-Zuordnung 01.10.) **CJ Set1: 8 Spitzen in Holzbox** — Rosenquarz, Tigerauge, Citrin,
  Aventurin, Lapislazuli, Amethyst, Bergkristall, Obsidian (gemessen: CJ `product/query`, Variantenbild Set1).
- Weitere Fehler im Text: «Keine Glas-Imitate» (nicht belegbar), «DE-Guide» (liefert niemand), «Muster: Spitze»
  (Faktenblock las «Kristall**spitze**» als Textilmuster), Garantie «Keine Fragen · volle Rückerstattung» (widerspricht der
  Garantieseite: Rücksendung bei Nichtgefallen zahlt die Kundin), Google-Kategorie «Cosmetics», Typ «Beauty-Tools», Tags
  `gua sha`/`beauty tools`/`set` (→ Kollektion «Trainingsanzüge & Sets»).
- **Getan:** 5 Bilder aus den CJ-Fotos von Set1 (Lieferanten-Pfeile entfernt, Lieferumfang mit deutschen Steinnamen,
  zwei Detailausschnitte, leere Holzbox), altes 12-Steine-Bild gelöscht; Titel «Kristallspitzen-Set 8-teilig in Holzbox»
  (Handle bleibt), Text nur mit belegten Angaben (Gewicht ca. 220 g laut CJ), Rückgabe mit Link auf die Richtlinie,
  Typ «Wohnen & Deko», Tag `dekoration`, Google-Kategorie «Home & Garden > Decor». Backup: `_kristall_set_backup_2026-10-04.json`.
- Offen: `dropship/pinterest_pins_upload.csv` Zeile 70 (Hand-Upload-Datei) trägt noch «3-teilig» + altes Bild.

## Tag 5, zweiter Punkt: Meta-Datenzugang endet 05.10. 18:50 UTC → IG/FB über Metricool
- Umschaltung existiert seit 27.09. (`social_autopilot.sh`: `debug_token.data_access_expires_at` ≤ jetzt → Reel, Bild,
  Story, Karussell über Metricool).
- **Gemessen:** über Metricool lief bisher KEIN Instagram-/Facebook-Post bis zur Veröffentlichung (2 Reels vom 27.09.
  später vom Schnitt-Tor gesperrt, Bilder/Karussell nie, Stories nur Entwurf-Test). → Echttest siehe unten.
- **Nebenbefund Story-Stau:** seit 03.10. 19:08 keine Story. `story_bauen.py` schrieb die Jury-Sperre als
  `story-<handle>`, las aber nur `story_<handle>.jpg` → jeder Lauf prüfte dieselben 4 Durchfaller (53 Sperrzeilen, bis 12×
  dasselbe Produkt). Leser repariert (74 → 69 Kandidaten), erste Story gebaut (Jury 9.0) und über Metricool geschickt.
