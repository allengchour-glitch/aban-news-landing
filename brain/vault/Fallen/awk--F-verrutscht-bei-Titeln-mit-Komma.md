---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-29
---
# awk -F, verrutscht bei Titeln mit Komma

Hunde Seite 4 (28.09.2026): die Gegenprobe Mutation gegen Plan-CSV meldete 46 gegen 37 Zeilen und sah wie ein Fehler in der Mutation aus. Ursache war der Vergleich selbst: neun Produkttitel enthalten ein Komma (Hochliegendes Hunde-Bett mit abnehmbarem Schirm, 36 Zoll), die Titel stehen als JSON-Zeichenkette in Anfuehrungszeichen, und awk -F, zaehlt das Komma im Feld mit. Die Felder verrutschen, die Zeile faellt aus dem Filter. Mit einem echten CSV-Leser: 46 gegen 46, exakt gleich. Dieselbe Klasse wie die fehlende Wortgrenze bei 3to4 und bei /schal/: das Muster sieht richtig aus und misst etwas anderes. Wer eine Gegenprobe baut, prueft zuerst, ob die Gegenprobe selbst ausschlaegt - hier eingebaut, ein erfundener Preis muss genau eine Abweichung erzeugen.

Verwandt: [[Hypothese-mit-Datum]]
