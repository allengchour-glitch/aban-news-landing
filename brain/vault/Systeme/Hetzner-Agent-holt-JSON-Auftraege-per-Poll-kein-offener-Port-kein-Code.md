---
tags: [system]
quelle: Journal 2026-09-17 · 🖥️; 🏠; 🧪; 2026-09-18 · 🔁; 🤖
gelernt: 2026-09-22
---
# Hetzner-Agent: holt JSON-Aufträge per Poll, kein offener Port, kein Code aus Aufträgen

Server 46.225.75.125 (seit 22.06.) ist von hier unerreichbar (Port 22 gesperrt, 443 lauscht nicht), also holt er sich Aufträge selbst: JSON nach auftraege/offen/, Runner server/luxe_auftrag_runner.mjs führt nur feste Auftragsarten aus (Repo ist öffentlich — Shell aus der Warteschlange wäre Fernsteuerung), pusht Quittung, Screenshot und Teilergebnis zurück; eigener Klon /opt/luxe-agent/repo, weil der Deploy-Poller in /opt/abannews alle 3 Minuten reset --hard macht; CDP 9222 nur über SSH-Tunnel. Er schreibt bei jedem 5-Minuten-Lauf auftraege/_puls.json (bot_puls.py alarmiert nach 2 h), legt fällige wiederkehrende Aufträge über Datei-Datum an, claimt vor dem Handeln. Er ist das einzige ehrliche Fenster auf luxestyle.ch; Landkarte mit den Neins in dropship/HETZNER-SERVER.md.

Verwandt: [[Hypothese-mit-Datum]]
