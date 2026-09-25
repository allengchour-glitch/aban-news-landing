---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-15
---
# status:active liefert auch Entwuerfe

products(query: status:active) lieferte am 2026-09-14 das Produkt 15447562486145 zurueck, dessen status DRAFT ist, das in null Kanaelen publiziert ist und dessen Seite 404 liefert. Die Gegenprobe direkt danach arbeitet korrekt: id mit status:active leer, mit status:draft gefunden, status:zzzgibtesnicht leer. Der Suchindex hinkt hinterher. Folge: eine Stichprobe ueber status:active ist nicht garantiert aktiv, ein Prozentsatz daraus misst etwas anderes als er behauptet. Status je Produkt einzeln nachfragen, bevor man ihn meldet. Quelle: dropship/LERNEN-PREISE-VARIANTEN-2026-09-14.md

Verwandt: [[Hypothese-mit-Datum]]
