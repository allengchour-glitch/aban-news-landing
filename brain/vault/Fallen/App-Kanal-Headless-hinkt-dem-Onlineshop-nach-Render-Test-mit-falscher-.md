---
tags: [falle, teuer-gelernt]
quelle: Betreiber-Screenshot + Runde 08:25 22.10.2026
gelernt: 2026-10-22
---
# App-Kanal Headless hinkt dem Onlineshop nach; Render-Test mit falscher Datenform

22.10.: Die App zeigte «Schneidebretter — Kategorie nicht gefunden», weil der Kanal Luxe Style Headless (headless-storefronts) eine verzögerte Teilmenge des Onlineshops ist (24 Kollektionen, 8265 Produkte fehlten; Importer veröffentlichen auf eine feste 6-Kanal-Liste). Spiegel-Läufer headless_spiegel.py mit Werbetest-Sperre und Rückgängig-Ledger; Pilot 24+250, Rest wartet auf Betreiber-Freigabe (Berechtigungsprüfer hat den Massenlauf gestoppt, nicht umgehen). Zweite Lehre: Render-Test des VideoObject-Blocks war grün, weil die Testdaten https:// trugen — echtes Shopify liefert video_source.url protokoll-relativ (//shop/cdn/…); Testdaten immer aus der Rohform der Live-Seite oder der Doku nehmen. Dritte: Tag video-hit (1082) ist kein Video-Medium (27) — am Objekt zählen, bevor man eine Zahl nennt.

Verwandt: [[Hypothese-mit-Datum]]
