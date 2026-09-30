---
tags: [falle, teuer-gelernt]
quelle: dropship/REEL-TOR-MOTOR-2026-09-30.md
gelernt: 2026-09-30
---
# Tor auch in den Erzeuger einbauen

30.09.2026: Das Meisterwerk-Tor (HOOK >= 3,0) stand nur in den Reel-Postern; der Reel-Motor renderte mit festem Einstieg und prüfte nie → 14 von 14 Postversuchen abgewiesen, Queue voller Ausschuss. Fix: reel/hook_start.py wählt die bewegteste Sekunde als START, der Motor ruft das Tor selbst und legt Durchgefallene in dropship/_reel_tor_abgelehnt.txt statt in die Queue. Regel: Jede Abnahme vor dem Veröffentlichen gehört auch in jeden Erzeuger.

Verwandt: [[Hypothese-mit-Datum]]
