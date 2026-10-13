---
tags: [falle, teuer-gelernt]
quelle: Hetzner-Plan 13.10., wf_b1c94b55-f88
gelernt: 2026-10-13
---
# CJ teilt vor dem Bezahlen; createOrderV2 nie wiederholen

CJ teilt einen Auftrag vor dem Bezahlen (SD…-2). Doppel-Erkennung über den Stamm der cjOrderId. Anlegende Aufrufe genau einmal senden: verlorene Antwort + Wiederholung = mehrere Aufträge (Gegenprobe 4 POSTs = 4 Aufträge).

Verwandt: [[Hypothese-mit-Datum]]
