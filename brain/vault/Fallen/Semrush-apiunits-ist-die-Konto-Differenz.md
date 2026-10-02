---
tags: [falle, teuer-gelernt]
quelle: dropship/semrush/README.md
gelernt: 2026-10-02
---
# Semrush api_units ist die Konto-Differenz

02.10.2026: Das Feld api_units in jeder Semrush-MCP-Antwort ist die Differenz des Kontostands, nicht der Preis des eigenen Aufrufs. Fünf parallele Agenten zählten sich gegenseitig mit (Summe 22'440 statt ~20k). Kosten nur messen, wenn ein Agent allein am Konto ist. Weitere Fallen: display_filter-Wert muss String sein ("90"), als Zahl NOTHING FOUND; phrase_questions kostet 520–640 je Aufruf unabhängig von der Zeilenzahl; ohne Saldo-Bericht ist das Restguthaben nicht messbar.

Verwandt: [[Hypothese-mit-Datum]]
