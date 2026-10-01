---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Ein erfundener Cursor liefert eine leere Seite mit hasNextPage false

GEMESSEN 2026-09-27: zwei Hundeprodukte hatten mehr als 50 Varianten (55 und 99), die Abfrage lieferte nur 50. Um den Rest zu holen habe ich den Cursor GERATEN - und bekam nodes: [] mit hasNextPage: false zurueck. Das ist von 'es gibt nichts mehr' nicht zu unterscheiden. Haette ich es geglaubt, waeren 5 bzw. 49 Varianten stillschweigend unbepreist geblieben und der Stand-Block haette 'vollstaendig' behauptet. Der echte Cursor kommt aus pageInfo { endCursor } derselben Verbindung; damit kamen die fehlenden Varianten sofort. Dieselbe Klasse wie die geratene Collection-ID vom 13.09.: Cursor und IDs werden abgefragt, nie geraten. Anschliessend die Lueckenlosigkeit belegen (erste + (n-1)*32768 === letzte), dann kann man die IDs rechnen statt abzutippen.

Verwandt: [[Hypothese-mit-Datum]]
