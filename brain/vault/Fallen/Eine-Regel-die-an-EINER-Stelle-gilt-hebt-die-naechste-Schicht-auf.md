---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-21 · 🫀 Ein Herzschlag, der sich als Arbeit ausgab
gelernt: 2026-09-22
---
# Eine Regel, die an EINER Stelle gilt, hebt die nächste Schicht auf

Gemessen über 24 h: 274 Commits von luxe-agent, 273 davon nur auftraege/_puls.json, 248 unter «Auftrag erledigt (Hetzner-Agent)» — bei genau EINEM gelaufenen Auftrag. Die Stundenbremse im Runner war intakt; der Starter /usr/local/bin/luxe-auftrag committete und pushte alles, was unter auftraege/ schmutzig war, und wusste nichts von ihr. Wortgleich der Social-Stopp, der nur auf einem Zweig lag (17.09.). Regel: eine Regel gehört an die Stelle, die bei jedem Lauf frisch geladen wird (Runner aus dem Repo, nicht das Setup-Skript), Zwischenstand ausserhalb des Ordners, den die andere Schicht bewacht (/tmp/luxe_puls_lokal.json), und bei gescheitertem Push zurücksetzen. Wer git log liest, um Arbeit zu sehen, darf kein Rauschen finden.

Verwandt: [[Hypothese-mit-Datum]]
