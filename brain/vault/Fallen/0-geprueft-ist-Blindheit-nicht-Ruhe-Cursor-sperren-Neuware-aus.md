---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-19 · 🕳️ Ein Cursor, der «neueste zuerst» sortiert
gelernt: 2026-09-22
---
# «0 geprüft» ist Blindheit, nicht Ruhe — Cursor sperren Neuware aus

Der Ghost-Sale-Wächter lief mit CREATED_AT reverse:true (neueste zuerst) und after:<cursor>; alles Neuere lag VOR dem Cursor und war nie erreichbar, der Cursor wurde am Durchgangsende nie gelöscht. Gemessen: 2'000 Produkte nie gefragt, alle 600 neuesten cj-real fehlten im Ledger (darunter die Hype-Reihe), drei Tage «FERTIG: 0 geprüft». Reparatur = Löschung: das append-only-Ledger macht den Lauf schon idempotent, ein Cursor ist überflüssig. Regel: «0 zu prüfen, weil alle N im Ledger» anders melden als «0 gesehen»; bei absteigender Sortierung nie mit persistentem Cursor paginieren. Offen: ein «ok» ohne Verfallsdatum wird nie wieder gefragt.

Verwandt: [[Hypothese-mit-Datum]]
