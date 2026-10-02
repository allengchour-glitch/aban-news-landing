# Reels nach der Preissenkung (02.10.2026, Verbesserungsrunde 16:25 UTC)

**Gemessen:** Nach der Preissenkung (350'008 Varianten, Median −11 %) markierte `social_queue_saeubern.py` 12 von 18 wartenden
Reels und 1 von 43 Bildposts als `preis-veraltet-skip` — der Preis ist ins Video eingebrannt und jetzt zu hoch. Die tägliche
Reparatur (`reel_neu_rendern.py MODUS=preis`) war heute schon vor der Senkung gelaufen → Queue wäre bis morgen auf 6 gefallen.
Von 36 gesperrten Reels hatten 34 keine lokale Quelle; 32 der zugehörigen Produkte haben kein Video in Shopify (Reel-Motor v2
holt CJ-Videos direkt, ohne sie ans Produkt zu hängen) → Quelle nur über den Server-Auftrag (`tor_quellen_anfragen.mjs`, täglich).
Ein Preis-Flicken auf dem fertigen Video ist verworfen: das Preisfeld liegt auf einem halbtransparenten Band über bewegtem Grund.

**Getan:**
- `reel_neu_rendern.py`: Rückfall-Quelle = Video des Shopify-Produkts (`shopify_quelle`, Cache /tmp/reel_quellen/); im Modus
  `preis` auch ohne lokale alte Reel-Datei. 2 Reels sofort neu gerendert (Tor bestanden), Queue ready 6 → 8.
- Aufseher: REEL-PREIS-REPARATUR alle 3 h, solange `preis-veraltet-skip`-Zeilen warten (vorher nur 1×/Tag).

**Offen:** 32 Reels warten auf Quellvideos vom Server (Merkliste 24 h); Reels mit Variantenspanne (z. B. 14.90–37.90) bleiben
von Hand.
