---
tags: [system]
quelle: Journal 2026-10-06 19:05
gelernt: 2026-10-06
---
# Eigenes Perplexity über Groq browser_search

Groq gpt-oss-120b mit tools browser_search (tool_choice required) sucht und öffnet Seiten serverseitig, gratis, ~10 s, echte URLs. Quellen aus executed_tools lesen (URL: auch umbrochen), nicht aus dem Antworttext. Direkte Suche von unserer IP taugt nicht (Bing: Pizzerien in Genf, DDG 202). Werkzeug tools/recherche.py, täglich automation/hype_recherche.py mit Gegenprobe productsCount und Kanarie Ladestation.


**Traegt der Skill `recherchieren`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
