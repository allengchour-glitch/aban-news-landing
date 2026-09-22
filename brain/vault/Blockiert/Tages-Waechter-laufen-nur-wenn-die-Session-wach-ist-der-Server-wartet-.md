---
tags: [blockiert, nur-user]
quelle: Journal 2026-09-21 · 🖥️; 💾 Betreiber-Entscheid Grow-Plan
gelernt: 2026-09-22
---
# Tages-Wächter laufen nur, wenn die Session wach ist — der Server wartet auf Geheimnisse

Der Container wird angehalten, sobald die Session ruht; alle Tages-Wächter und Reiniger laufen damit nur in Session-Arbeitszeit, und der grösste Hebel für «schneller automation» liegt nicht im Code. Paket gebaut: server/luxe-waechter-setup.sh (eigener Klon, feste Pfade nachgebildet — 26× Repo-Pfad, 33× /opt/node22, 260× /tmp-Geheimnisse —, Geheimnis-Lader, systemd alle 10 min). Was fehlt, kann nur der Betreiber: die Geheimnisse auf den Hetzner-Server legen (COWORK Punkt 7); die Ampel-Zeile verschwindet mit dem ersten luxe-waechter-Commit. Details dropship/HETZNER-SERVER.md. Ebenso Betreiber-Sache mit Frist: Dateispeicher voll bis zum Grow-Plan ~21.10. (_dateispeicher_entscheid.txt) — ein Entscheid mit Ablaufdatum ist eine Quittung, die abläuft und dann von selbst wieder ruft; bis dahin scheitern 5 Uploader in den Startlisten gewollt.

Verwandt: [[Hypothese-mit-Datum]]
