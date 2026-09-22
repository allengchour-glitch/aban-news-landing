---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-17 · 📉; 2026-09-18 · 📬; 🎯; 🧹
gelernt: 2026-09-22
---
# Eine Null gilt erst nach Kanarienvogel, Feldnamen und Nachzählung

WebFetch meldete «kein JSON-LD» auf der Produktseite — und auch auf der Startseite, wo es nachweislich steht: die Markdown-Umwandlung wirft script-Blöcke weg. getTrackInfo meldete «Stationen: 0», weil die Routen unter data[0].routes mit Feldern acceptTime/acceptAddress liegen, nicht unter geratenen Namen. sessions_that_completed_checkout sagte 0 bei 2 echten Käufen; customersCount ignoriert seinen Filter still (Köder liefert dieselbe 1499); ls glob | wc -l zählte 11'818, find 1208. Regel: jedes «nichts gefunden» zuerst an einem bekannten Treffer prüfen (Kanarienvogel: freightCalculate mit dem Artikel aus #1018 = 16 Optionen), bei leeren Listen sorted(keys()) ansehen, und eine Kennzahl-Null durch Nachzählen der Sache selbst bestätigen.

Verwandt: [[Hypothese-mit-Datum]]
