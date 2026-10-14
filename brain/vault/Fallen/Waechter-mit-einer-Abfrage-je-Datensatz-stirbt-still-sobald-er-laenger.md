---
tags: [falle, teuer-gelernt]
quelle: automation/tote_landeseiten.py, Journal 14.10. 🔗
gelernt: 2026-10-14
---
# Waechter mit einer Abfrage je Datensatz stirbt still, sobald er laenger als das Neustart-Fenster laeuft

14.10.2026: tote_landeseiten.py fragte jede der ~1'150 Landeseiten einzeln bei Shopify ab (13,5 Min. gemessen). Seit 13.10. endeten die Laeufe ohne Schlusszeile; der Aufseher holt nur Abstuerze mit Traceback nach, also lag die 404-Pruefung bis zum naechsten Tag still. Fix: Pakete a 40 (1,5 Min., gleiche Funde). Wichtig: was ein Paket nicht enthaelt, ist 'unbekannt' und wird einzeln nachgefragt — nie als 'geloescht' werten, sonst legt FIX eine Weiterleitung ueber ein aktives Produkt.

Verwandt: [[Hypothese-mit-Datum]]
