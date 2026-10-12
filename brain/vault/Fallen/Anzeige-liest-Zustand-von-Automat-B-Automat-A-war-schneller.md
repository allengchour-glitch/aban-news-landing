---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-12
---
# Anzeige liest Zustand von Automat B, Automat A war schneller

Bestell-Ampel las nur den 2-h-Abgleich; der Bestell-Automat hatte LX1025 längst angelegt. Fix: Ledger mitlesen + Abgleich auslösen, wenn die Quelle jünger ist (-nt).

Verwandt: [[Hypothese-mit-Datum]]
