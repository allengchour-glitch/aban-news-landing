---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Eine zu grosse Abfrageantwort landet als Datei und das ist ein Vorteil

GEMESSEN 2026-09-27: die Abfrage fuer Seite 3 der Hundeprodukte lieferte 62410 Zeichen, zu gross fuer den Kontext, und das Werkzeug legte sie als Datei unter tool-results/ ab. Damit liess sich alles mit jq und einem Node-Skript verarbeiten - kein einziger Wert von Hand uebertragen, anders als auf Seite 1 und 2, wo je 50 Produkte abgetippt und danach Ziffer fuer Ziffer gegengeprueft werden mussten. Lehre: bei grossen Seiten lieber MEHR Felder abfragen und die abgelegte Datei auswerten, als weniger abfragen und abtippen. Eine Handuebertragung ist immer eine Fehlerquelle, die die spaetere Nachmessung an der Kundenseite NICHT faengt - die prueft nur, ob der Shop zeigt was geplant war, nicht ob der Plan richtig war.

Verwandt: [[Hypothese-mit-Datum]]
