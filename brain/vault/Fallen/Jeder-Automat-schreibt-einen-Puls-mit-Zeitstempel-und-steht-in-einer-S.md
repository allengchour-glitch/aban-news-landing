---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-18 · 🤖; 2026-09-17 · 🧠; 2026-09-18 · 🧹; 2026-09-17 · 🩺
gelernt: 2026-09-22
---
# Jeder Automat schreibt einen Puls mit Zeitstempel und steht in einer Startliste

Der Hetzner-Runner endete bei leerer Warteschlange mit exit 0 ohne Spur — acht Stunden Stille waren nicht entscheidbar; 0 Stellen in automation/ tools/ bewachten ihn. fortura_img_runner lag nur in /tmp und war weg (Lehre 2 zum dritten Mal), engine_keepalive übersprang ihn still mit [ -f ] || continue; cj_order_watch stand in keiner Startliste, sein State war 3,5 Wochen alt. Zwölf «kaputte» Wächter waren gesund (Traceback am Ende = Drosselabbruch mit Cursor). Regel: Puls VOR der Arbeitsentscheidung schreiben, Alarm erst nach definiertem Alter (fehlende Datei = «noch kein Puls», nicht «tot»), Starter melden Fehlendes laut, Dauerläufer ins Repo, der Log-Tail sagt WIE nicht WANN, Diagnose-Ausgaben in den Kladde-Ordner.

Verwandt: [[Hypothese-mit-Datum]]
