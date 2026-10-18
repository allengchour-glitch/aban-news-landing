---
tags: [falle, teuer-gelernt]
quelle: dropship/METRICOOL-PLANER-2026-10-18.md
gelernt: 2026-10-18
---
# Metricool-Entwürfe erscheinen nie: der Planer braucht einen eigenen Wächter

18.10.2026: Von ChatGPT in Metricool angelegte Produkt-Videos standen als draft=true und autoPublish=false im Planer; zwei Termine (18:30/18:45) verstrichen ohne Post, weil die Poster nur ihre eigenen Ledger kennen. Zwei Produkte lagen doppelt im Planer. Jetzt: automation/metricool_planer_wache.py liest den Planer (UEBERFAELLIG, ENTWURF_BALD, FEHLER, HAENGT, DOPPELT, ERSETZT, INAKTIV), Zeile METRICOOL-PLANER im Keepalive; vier Videos freigegeben, je eines pro Tag; Reel-Motor für die Produkte gesperrt. Regel: Entwurf oder autoPublish=false ist kein Post; fremd angelegte Posts zählen für das Doppelpost-Verbot.

Verwandt: [[Hypothese-mit-Datum]]
