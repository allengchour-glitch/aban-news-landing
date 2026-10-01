---
tags: [system]
quelle: Session
gelernt: 2026-09-29
---
# Mehr Felder abfragen erzwingt die Datei-Ablage

Hunde Seite 4 (28.09.2026): dieselbe Abfrage wie auf Seite 3 kam diesmal INLINE zurueck, also im Kontext - genau der Fall, der auf Seite 1 zum Abtippen zwang. Loesung: die Abfrage mit mehr Feldern wiederholen (descriptionHtml, sku, createdAt, compareAtPrice, inventoryItem.id). Ergebnis 103708 Zeichen, damit ueber der Grenze, und das Werkzeug legt sie als Datei unter tool-results/ ab. Danach jq und ein Node-Skript, null Abtippen. Die Datei-Ablage ist also nicht Glueck, sondern steuerbar: wer sie will, fragt mehr ab.

Verwandt: [[Hypothese-mit-Datum]]
