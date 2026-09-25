---
tags: [system]
quelle: dropship/LERNEN-BILD-ZU-VIDEO-2026-09-23.md
gelernt: 2026-09-23
---
# Ein Foto reicht fuer ein Video - aber nicht dieselbe Kamerafahrt

Ein Produkt mit nur einem Bild kommt mit einem Segment nie auf die empfohlenen 7 Sekunden (gerechnet 4,85 s). Der Selbsttest fiel deswegen um und hatte recht, nicht der Code. segmentFolge() in automation/produkt_werbevideo.mjs laesst ein einzelnes Foto dreimal laufen, aber mit verschiedener Kamerafahrt (zoom hinein / heraus / waagrecht / senkrecht im Wechsel). Die Gegenprobe prueft ausdruecklich, dass die drei Segmente drei UNTERSCHIEDLICHE Fahrten bekommen - dreimal dieselbe waere eine Diaschau. Der Kniff gegen das Ruckeln stand schon im Repo: Quelle auf 2160x3840 hochskalieren, BEVOR zoompan rechnet.

Verwandt: [[Hypothese-mit-Datum]]
