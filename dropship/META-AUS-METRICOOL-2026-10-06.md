# Nachmessung nach dem Meta-Ablauf (06.10.2026, Routine trig_013HUsEqgHvrSVwBuVe4hse7)

GEMESSEN 07:30 UTC:
- `/tmp/meta_token_status` = datenzugang-abgelaufen → Autopilot plant IG/FB über Metricool (wie am 27.09. gebaut).
- Metricool-Planer 05.10. 18:00 – 06.10.: Instagram + Facebook **PUBLISHED**: Bildpost Hoodie-Decke (IG + FB), Karussell
  Damenstiefel (IG + FB), Reel Leinen-Set «Provence» (IG + FB Reel), Story (IG + FB). Dazu TikTok 2, YouTube 1, Pinterest 1.
- **1 Fehler:** Bildpost «Warme Touchscreen-Handschuhe» — Facebook PUBLISHED, Instagram **ERROR** «The media could not be fetched
  from this URI» (Bild selbst ok: JPEG 800×800, HTTP 200 → Abruffehler auf Meta-Seite). Ledger sagte trotzdem `posted`.
- Ledger: posts_image.csv 2× `metricool:…`, ig_karussell.csv 1× seit 05.10.

KLASSE: «posted» = nur GEPLANT — für TikTok/YouTube gab es seit 23.09. `PRUEFEN=1`, für die IG/FB-Ledger nicht.

GETAN: `automation/metricool_ledger_pruefen.mjs` (CSV=posts_image.csv | ig_karussell.csv): PUBLISHED → URL ins Ledger;
IG-ERROR → EIN neuer Versuch nur auf Instagram (Medien + Text aus dem Planer, neu normalisiert; Produkt muss ACTIVE sein;
Facebook nie doppelt); 2. Fehler → `ig-fehler` + Grund. CSV-Rundreise verlustfrei geprüft. Im Autopilot alle 2 h.
Erster Lauf: 2 bestätigt (Hoodie-Decke, Damenstiefel), Handschuhe neu geplant (Metricool 389198264).
