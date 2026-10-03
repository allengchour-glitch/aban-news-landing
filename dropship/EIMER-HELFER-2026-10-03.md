# Eimer-Etikette in gemeinsamen gql-Helfern (Verbesserungsrunde 03.10.2026, 04:25 UTC)

## GEMESSEN
- `farbe_metafeld` (01:26 UTC) und `textbild_fix` (01:54 UTC) starben mit «12x gedrosselt (Eimer dauerhaft leer)», während die nächtlichen Massenläufe liefen: Bildtausch, Variantenbilder, Anstoss-Tags, Grind.
- Der Bildtausch schreibt über `heilversprechen_wache.gql`. Dieser Helfer wird von 5 Skripten importiert und wiederholte bei THROTTLED nur, ohne einen Boden im Eimer zu halten.
- Gemeinsam genutzte gql-Helfer ohne `nachlauf`: 15. Gefunden wurden 13 per Scan und 2 erst über die neue Regel (`hype_export_bauen`, `versand_jenachland`).
- Live-Probe nach dem Neustart (04:25): Eimer bei 6 von 2'000. Der Aufseher startet rund 25 Wächter gleichzeitig.

## GETAN
- `_nachlauf(d)` (eimer_etikette) ist jetzt in jedem dieser Helfer direkt nach dem JSON-Lesen eingebaut, mit Import-Rückfall: cj_order_engine, farbwerte_uebersetzen, farbwerte_zusammengesetzt, google_kategorie_pruefen, heilversprechen_wache, homepage_katalog_rotation, hype_kuratieren, klinge_ch_wache, material_metafeld_korrigieren, seo_desc_kuerzen, suchwort_tags, titel_kauderwelsch_wache, hype_export_bauen und versand_jenachland. `kollektion_doppel` delegiert an `kollektionstexte_nachbessern`, das den Boden schon hält.
- Neue Gehirn-Regel `helfer-ohne-eimer` (tools/zweites_gehirn.py): Sie meldet einen gql-Helfer mit eigenem HTTP-Aufruf, den eine andere Datei importiert und der kein `nachlauf` ruft. Selbsttest 16/16, Wache 0 NEU.

## OFFEN
- 155 Einzelskripte haben einen eigenen gql ohne Boden. Sie werden von niemandem importiert, deshalb hat diese Runde sie nicht angefasst. Die Regel `eimer-fehlt` deckt nur Anleger ab.
