---
tags: [system]
quelle: Journal 2026-09-22 · 🩺 «mach alles besser» Runde 3
gelernt: 2026-09-22
---
# Fix = Wächter + Ersatztabelle + Bericht — sonst ist es keiner

Am 04.09. wurden 13 Heilversprechen von Hand entschärft, das Skript lag in /tmp; am 07.09. holte ein Rückholer ein Rizinusöl-Produkt aus dem Draft zurück, und am 22.09. bewarb es wieder «Förderung eines gesunden Haarwachstums». Gegenprobe über 51'341 Produkte: 95 Zusagen, kein Wächter für die Klasse. Eine Klasse, die man einmal von Hand repariert, kommt durch jeden Rückholer, Importer und Neuimport wieder. Regel: jede Reparatur einer Klasse endet mit einem täglichen Wächter (Aufseher), einer Ersatztabelle, einem Bericht in dropship/ und einem updated_at-Cursor — jetzt automation/heilversprechen_wache.py, Bericht dropship/HEILVERSPRECHEN.md. Dasselbe Prinzip: die Politur besuchter Seiten (Faktenblock, Sie→du) gehört in besuchte_seiten_lieferbar.py, nicht in die dritte Session-Runde von Hand.

Verwandt: [[Hypothese-mit-Datum]]
