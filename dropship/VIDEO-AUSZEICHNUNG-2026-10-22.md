# Video-Auszeichnung (VideoObject) für Produktseiten (22.10.2026, Betreiber «video ja»)

## GEMESSEN
- Live-Theme: **kein** `VideoObject` (438 Theme-Dateien gelesen; JSON-LD nur in `sections/product-information.liquid` und `layout/theme.liquid`).
- **Korrektur meiner Zahl:** «1'082 aktive Produkte tragen ein Video» war falsch. 1'082 tragen das TAG `video-hit`; ein echtes **Video-Medium** haben nur **27** (alle Shopify-Videos). Dauer 0,9–48 s, Median 5,2 s, 13 unter 5 s. Entschieden wird deshalb am Medium, nie am Tag.
- Von 4 Video-Produktseiten im Test stehen 1 im Google-Index, 3 sind Google unbekannt.
- Die Produkt-Sektion wird nur von `templates/product.json` gerendert (`featured-product-information` ist eine eigene Sektion).

## Block und Prüfung
Quelle `dropship/theme_patches/video_auszeichnung_2026-10-22.liquid` (eigenes JSON-LD neben dem Product-Block, dessen Bewertungs-Logik unberührt bleibt). Einbau: `automation/video_auszeichnung_einbauen.py` (Trockenlauf: +2'941 Zeichen, Gegenprobe «Block entfernen = Original» besteht; `--scharf` mit Backup nach `dropship/theme_patches/product-information.vorher-2026-10-22.liquid`, Race-Schutz, Rücklesen).

Drei unabhängige Prüfer (Shopify-Liquid, Google-Spezifikation, Regression) — Befunde, die ich eingebaut habe:
1. **hoch (beide):** `video_source.url` kommt in echtem Shopify **protokoll-relativ** (`//luxestyle.ch/cdn/shop/videos/…mp4?v=0`, auf der Live-Seite gemessen). Mein erster Render-Test benutzte https-Testdaten und sah es nicht. → `https:` wird vorangestellt (wie beim Vorschaubild); Test nutzt jetzt die echte Form.
2. **mittel:** Die Beschreibung verklebte Wörter («…ausSchnell…», 34 von 50 gemessenen Produkten). → vor dem Strippen an jedem schliessenden Tag trennen, Leerraum normalisieren, `&amp; &nbsp; &quot;` auflösen.
3. **mittel:** Das Einbauwerkzeug verlangte Marken, die der Block nicht trug. → `LUX-VIDEO-JSONLD` / `/LUX-VIDEO-JSONLD` eingefügt; erneutes Einbauen ersetzt statt zu verdoppeln.
4. **niedrig:** Kommentar behauptete falsche Pflichtfelder (Pflicht bei Google: name, thumbnailUrl, uploadDate; empfohlen: description, contentUrl). → korrigiert.
Nicht übernommen (optional laut Prüfer): `duration`, uploadDate mit Zeitzone (`%:z` in Shopify unbelegt).

Wache: `automation/video_auszeichnung_kanarien.py` (14 statische Regeln + Render-Test mit 11 Fällen, wenn python-liquid vorhanden; **9 Mutanten werden erkannt**; täglich im Aufseher).

## EHRLICHE ERWARTUNG (Prüfer, QUELLE Google)
**Kein erwarteter Sichtbarkeitsgewinn.** Google indexiert Videos nur von Watch-Seiten; eine Produktseite mit Zusatzvideo gilt ausdrücklich nicht als solche (Search-Console-Hilfe «Video indexing report»). Zusätzlich liegt das `<video>` im Live-Shop erst nach Klick im DOM. Der Block ist Datenpflege: kostenlos, ungefährlich, aber nicht der Hebel. Echte Video-Sichtbarkeit bräuchte eigene Watch-Seiten — bei 27 Clips unverhältnismässig. Ich hatte vorher gesagt, es lohne sich erst nach den Hauptkategorien; das bleibt richtig.

## STATUS: NICHT LIVE
Der Live-Einbau (`themeFilesUpsert` auf `sections/product-information.liquid`) wurde vom Berechtigungsprüfer des Auto-Modus **abgelehnt** (ohne Begründung). Ich habe ihn nicht umgangen. Alles andere ist fertig. Zum Einbauen:
`python3 automation/video_auszeichnung_einbauen.py --scharf` (nach dem Einbau in `theme_marken_wache.py` die Marke `luxe_vid` eintragen und die Ampel prüfen lassen).

Nachmessung nach dem Einbau: Search Console → «Videoindexierung»; per `inspect_urls` auf einer der 27 Seiten nach `richResultType` «Video» sehen (nur wenn die Seite neu abgerufen wurde).
