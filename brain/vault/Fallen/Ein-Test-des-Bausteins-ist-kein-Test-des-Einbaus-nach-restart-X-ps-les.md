---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-21 · 🚧 Sechs Stunden ohne einen einzigen Tages-Wächter
gelernt: 2026-09-22
---
# Ein Test des Bausteins ist kein Test des Einbaus — nach «restart X» ps lesen

Die Shopify-Schranke war in der Sandbox grün (3 Prozesse / 2 Plätze) und sperrte sechs Stunden lang 26 Tages-Wächter und alle 13 Reiniger aus: inline in bash -c schlossen die inneren Anführungszeichen den äusseren String, $_s expandierte leer, der Rest lief als Dateiname — 89× «line 412: No such file» im Aufseher-Log, und «restart X» stand trotzdem da, weil es VOR dem Start geschrieben wird. Der touch-Anspruch hätte die 26 Namen 24 h als «gelaufen» geführt: Anspruch plus gescheiterter Start = ein Tag Blindheit mit gutem Gewissen. Platz 2 lag zudem auf Deskriptor 8, wo die Produkttext-Werkzeuge ihr TXTLOCK halten. Regel: Logik in eine Datei (exec "$@", keine Quoting-Ebenen), Einbau am echten Aufruf prüfen (nach «restart X» muss ps einen Prozess mit diesem Namen zeigen); engine_keepalive.sh zählt jetzt neue Shell-Fehler des Aufsehers seit dem letzten Tick.

Verwandt: [[Hypothese-mit-Datum]]
