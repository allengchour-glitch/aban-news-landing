---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-29
---
# Ein 404 an der Kundenseite kann ein Statusfehler sein, kein Messfehler

Hunde Seite 4 (28.09.2026): zwei von 50 Produkten, die die Abfrage title:hund* AND status:active geliefert hatte, lieferten an der Kundenseite 404. Nachgesehen statt vermutet: beide stehen auf DRAFT, publishedAt null, resourcePublicationsCount 0. Es ist der Suchindex-Fehler vom 14.09.2026, und die Nachmessung an der echten Seite hat ihn gefunden, ohne dass ich danach gesucht habe. Lehre: ein 404 in preis_nachmessen.mjs ist zuerst eine Frage an den Produktstatus, nicht ein Fehlschlag des Geraets. Erst danach entscheidet man, ob der Preis trotzdem stimmt (hier per productVariant abgefragt: 154.90 und 144.90 korrekt gesetzt, nur fuer niemanden sichtbar).

Verwandt: [[Hypothese-mit-Datum]]
