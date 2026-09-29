---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-29
---
# Zwei KI-Modelle einig ist kein Beweis — beide irrten bei proc-uptime

GEMESSEN 29.09.: ChatGPT (gpt-5.5) und Kimi (kimi-k3) prüften unabhängig die START-Marken-Reparatur und behaupteten BEIDE, /proc/uptime zeige im Container die Host-Uptime (still_gestorben sei damit tot). Ein Befehl widerlegte es: uptime 22 min = PID 1 seit 20:57. Echt war dagegen der Befund, den ebenfalls beide nannten: unverankertes grep FERTIG|PAUSE in still_gestorben (behoben, Kanarienvögel 2/2). Werkzeug: automation/kritik.py (beide parallel; Kimi nur temperature 1, Streaming gegen Proxy-Abbruch bei 300 s).

Verwandt: [[Hypothese-mit-Datum]]
