# Reel-Warteschlange: Preis- und Statusprüfung war blind (26.09.2026, 04:40 UTC)

## Gemessen
- Um 04:08 UTC fielen TikTok (Metricool) und YouTube Short aus: beide Kandidaten trugen einen alten Preis
  (29.90 statt 35.90, 24.90 statt 29.90). Der Poster erkennt das erst beim Posten, markiert und bricht ab.
  Der Termin ist damit verloren, der nächste Versuch kommt einen Durchlauf später.
- Der tägliche Säuberer `social_queue_saeubern.py` sollte genau das vorher finden. Er lief um 01:13 UTC und meldete
  «42 → bleibt ready 42».
- Ursache: Er bestimmte das Produkt aus den Ziffern am Ende der Zeilen-ID. Bei Reels ist das die CJ-Produktnummer
  (`cjreel-1619229886437142528`), keine Shopify-ID. `nodes(ids:)` lieferte null, ohne Status und Preisband gab
  es kein Urteil. 4 Reels haben gar keine Ziffern-ID. Die Poster lesen dagegen den Produktlink der Caption.
- Ergebnis: **42 von 42 wartenden Reels ungeprüft** (weder «produkt-weg» noch «preis-veraltet»).

## Getan
- `produkt_schluessel()`: Der Handle aus `/products/<handle>` in der Caption hat Vorrang (derselbe Schlüssel wie
  in den Postern). Eine `cjreel-`-ID ohne Link bekommt kein Urteil. Die Ziffern-ID gilt nur noch für Bild-Posts,
  die am Ende die Shopify-ID tragen.
- `status_von_handles()`: je 40 Handles eine Suche. Ein nicht gefundener Handle bekommt **kein** Urteil
  («nicht gefunden» ist kein Beweis).
- Stichprobe vor dem Scharf-Lauf: alle 42 Reels einzeln gelesen. Die 25 Treffer tragen alle einen tieferen alten
  Preis als live (z. B. Fitness-Board 95.90 → 125.90, Mini-Elektrotopf 32.90 → 47.90), die 17 anderen liegen im Band.
- Scharf gelaufen: 25 Reels auf `preis-veraltet-skip`, 17 bleiben `ready` (≥ 5, Reel-Motor füllt nach).
  Bild-Queue unverändert 59/59.

## Offen
- Neu rendern mit dem aktuellen Preis geht von hier nicht: Der CJ-Videohost ist über den Proxy gesperrt.
  Die Zeilen bleiben lesbar und lassen sich von Hand zurücksetzen.
