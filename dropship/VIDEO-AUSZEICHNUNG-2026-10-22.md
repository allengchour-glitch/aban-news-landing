# Video-Auszeichnung (VideoObject) für Produktseiten (22.10.2026, Betreiber «video ja»)

## GEMESSEN
- Live-Theme: **kein** `VideoObject` (438 Theme-Dateien gelesen; JSON-LD nur in `sections/product-information.liquid` und `layout/theme.liquid`).
- **Zwei Korrekturen meiner Zahlen.** (1) «1'082 aktive Produkte tragen ein Video» war falsch: 1'082 tragen das TAG `video-hit`. (2) Meine Folgerung «nur 27 haben ein Video» war ebenfalls falsch: ich las nur die ersten 12 Medien und nur die getaggten. **Vollzählung des Regressions-Prüfers (Admin-API, alle aktiven): 547 von 56'652 aktiven Produkten haben ein Video-Medium, nur 33 davon das Tag.** Alle 547 sind READY mit MP4 und Vorschaubild; Dauer 0,9–125 s, Median 21,7 s; höchste MP4: 720p 313, 480p 165, 1080p 69. **Der Block würde also auf 547 Produktseiten erscheinen.** Entschieden wird am Medium, nie am Tag.
- Von 4 Video-Produktseiten im Test stehen 1 im Google-Index, 3 sind Google unbekannt.
- Die Produkt-Sektion wird nur von `templates/product.json` gerendert (`featured-product-information` ist eine eigene Sektion).

## Rollout-Protokoll (Regressions-Prüfer) — vor dem Live-Gang beachten
`sections/product-information.liquid` ist die Hauptsektion JEDER Produktseite (einzige Verwendung: `templates/product.json`). Ein Liquid-**Syntax**fehler träfe alle ~56'000 aktiven Produktseiten (Galerie, Kaufbox, Google-Einträge), ein Laufzeitfehler nur die 547 Video-Seiten (sichtbarer Text «Liquid error»). Ob `themeFilesUpsert` die Syntax serverseitig prüft, ist UNBELEGT; der lokale Test beweist die Shopify-Syntax nicht (der Prüfer hat sie mit dem Referenz-Liquid in 4 Modi geparst: 0 Fehler).
1. Backup + md5 festhalten (Original-md5 `2c437a49bbb0b68a8b04afe6b45af6a2`, 14'113 Byte; der Einbauer sichert nach `dropship/theme_patches/product-information.vorher-2026-10-22.liquid`).
2. Upsert, `userErrors` prüfen, Rücklesen (macht der Einbauer).
3. Binnen 2 Minuten 1 Video-Seite + 3 Kontrollseiten laden, aber **nur Antworten mit `render;dur` im Server-Timing-Header werten** (sonst Cache-Kopie; 2 von 6 Abrufen kamen ohne). Bei «Liquid error», fehlender Kaufbox oder fehlendem Produkt-JSON-LD sofort zurückrollen. «Block noch nicht sichtbar» ist KEIN Rückrollgrund (Cache-Verzug).
4. Nach dem Live-Gang (Checkliste): genau 1 `VideoObject` je Video-Seite (Kontrolle 0), alle `ld+json` parsen, Variantenwechsel + Quick-Add im Browser (`tools/browser.mjs`), Rich-Results-Test/URL-Inspektion auf 3 Video-URLs, Merchant-Center am Folgetag (kein Anstieg «Product page unavailable»). Erwartung: Video-Seite +~940 Byte, Kontrolle ±2 Byte.
Rückweg: frisch lesen, Block zwischen den Marken entfernen, md5 mit der Vorher-md5 vergleichen; nur bei Konflikt das Backup voll zurückspielen.

## Block und Prüfung
Quelle `dropship/theme_patches/video_auszeichnung_2026-10-22.liquid` (eigenes JSON-LD neben dem Product-Block, dessen Bewertungs-Logik unberührt bleibt). Einbau: `automation/video_auszeichnung_einbauen.py` (Trockenlauf: +2'941 Zeichen, Gegenprobe «Block entfernen = Original» besteht; `--scharf` mit Backup nach `dropship/theme_patches/product-information.vorher-2026-10-22.liquid`, Race-Schutz, Rücklesen).

Drei unabhängige Prüfer (Shopify-Liquid, Google-Spezifikation, Regression) — Befunde, die ich eingebaut habe:
1. **hoch (beide):** `video_source.url` kommt in echtem Shopify **protokoll-relativ** (`//luxestyle.ch/cdn/shop/videos/…mp4?v=0`, auf der Live-Seite gemessen). Mein erster Render-Test benutzte https-Testdaten und sah es nicht. → `https:` wird vorangestellt (wie beim Vorschaubild); Test nutzt jetzt die echte Form.
2. **mittel:** Die Beschreibung verklebte Wörter («…ausSchnell…», 34 von 50 gemessenen Produkten). → vor dem Strippen an jedem schliessenden Tag trennen, Leerraum normalisieren, `&amp; &nbsp; &quot;` auflösen.
3. **mittel:** Das Einbauwerkzeug verlangte Marken, die der Block nicht trug. → `LUX-VIDEO-JSONLD` / `/LUX-VIDEO-JSONLD` eingefügt; erneutes Einbauen ersetzt statt zu verdoppeln.
4. **niedrig:** Kommentar behauptete falsche Pflichtfelder (Pflicht bei Google: name, thumbnailUrl, uploadDate; empfohlen: description, contentUrl). → korrigiert.
Nicht übernommen (optional laut Prüfer): `duration`, uploadDate mit Zeitzone (`%:z` in Shopify unbelegt).

Wache: `automation/video_auszeichnung_kanarien.py` (prüft die QUELLE: statische Regeln + Render-Test, wenn python-liquid vorhanden; **9 Mutanten werden erkannt**; täglich im Aufseher). **Noch keine Live-Wache:** nach dem Einbau die Marken `LUX-VIDEO-JSONLD`, `luxe_vid`, `"@type": "VideoObject"` und (Schutz der Bewertungs-Logik) `replace_first: '"@type":"Product",'` in `theme_marken_wache.MARKEN` eintragen; diese Wache läuft täglich — in der ersten Stunde nach dem Einbau zusätzlich von Hand prüfen.

## EHRLICHE ERWARTUNG (Prüfer, QUELLE Google)
**Kein erwarteter Sichtbarkeitsgewinn.** Google indexiert Videos nur von Watch-Seiten; eine Produktseite mit Zusatzvideo gilt ausdrücklich nicht als solche (Search-Console-Hilfe «Video indexing report»). Zusätzlich liegt das `<video>` im Live-Shop erst nach Klick im DOM. Der Block ist Datenpflege: kostenlos, ungefährlich, aber nicht der Hebel. Echte Video-Sichtbarkeit bräuchte eigene Watch-Seiten — bei 547 Clips unverhältnismässig. Ich hatte vorher gesagt, es lohne sich erst nach den Hauptkategorien; das bleibt richtig.

## STATUS: NICHT LIVE
Der Live-Einbau (`themeFilesUpsert` auf `sections/product-information.liquid`) wurde vom Berechtigungsprüfer des Auto-Modus **abgelehnt** (ohne Begründung). Ich habe ihn nicht umgangen. Alles andere ist fertig. Zum Einbauen:
`python3 automation/video_auszeichnung_einbauen.py --scharf` (nach dem Einbau in `theme_marken_wache.py` die Marke `luxe_vid` eintragen und die Ampel prüfen lassen).

Nachmessung nach dem Einbau: Search Console → «Videoindexierung»; per `inspect_urls` auf einer der 547 Seiten nach `richResultType` «Video» sehen (nur wenn die Seite neu abgerufen wurde).

## Weitere Befunde des Regressions-Prüfers (nicht Teil dieses Patches)
- `uploadDate` = Produkt-Veröffentlichungsdatum, nicht Video-Upload (bei 16 von 33 geprüften Seiten kam das Video später); Liquid kennt kein Video-Datum — bekannte Ungenauigkeit.
- `contentUrl` zeigt die höchste MP4 (720/1080p), die Seite bindet im `<template>` nur die 480p-Quelle ein.
- **Neuer Kandidat für eine eigene Runde:** Auf ProductGroup-Seiten hängt das `aggregateRating` (Patch vom 22.09.) laut Live-Stand an `hasVariant[0]`, das ProductGroup selbst bekommt keines — der erste Treffer von `"@type":"Product",` ist die erste Variante. Ob Google die Sterne so anzeigt, ist UNBELEGT; am `inspect_urls` einer frisch abgerufenen Produktseite («Product snippets» → aggregateRating) messen.
