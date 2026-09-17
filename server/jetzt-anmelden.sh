#!/usr/bin/env bash
# jetzt-anmelden.sh — EIN Befehl, der alles vorbereitet und den Anmelde-Browser startet.
#
# WARUM ES DAS GIBT (17.09.2026, nach vier Fehlversuchen):
# Die Hetzner-Web-Konsole verstuemmelt eingefuegte Befehle auf drei Arten, alle gemessen
# am Bildschirm des Betreibers:
#   1. sie frisst das ERSTE ZEICHEN jeder Zeile   (pkill -> kill, cd -> d, bash -> ash)
#   2. sie verschluckt ZEILENUMBRUECHE            (drei Befehle werden zu einem)
#   3. sie verwandelt Sonderzeichen               (&& wurde zu 77)
# Jede mehrzeilige Anleitung scheitert daran zwangslaeufig. Diese Datei loest das, indem
# es NICHTS mehr zu tippen gibt ausser einer Zeile aus Buchstaben, Schraegstrichen und
# Bindestrichen — und einem fuehrenden Leerzeichen, das die Konsole gefahrlos fressen darf:
#
#      bash /opt/luxe-agent/repo/server/jetzt-anmelden.sh
#
# (Mit SSH statt Web-Konsole braucht man das nicht — dort kommen Befehle unversehrt an.
#  Aber es soll auch dann gehen, wenn gerade nur die Konsole da ist.)
set -uo pipefail
REPO=/opt/luxe-agent/repo

echo "▶ 1/3  Verirrte SSH-Tunnel auf diesem Server beenden"
# ⚠️ Ein `ssh -L 9222:127.0.0.1:9222 root@46.225.75.125`, das AUF dem Server laeuft,
# zeigt auf den Server selbst. Es belegt Port 9222, und Chromium kommt nicht mehr dran.
# Das Verwirrende daran: curl meldet dann «Empty reply from server» statt «Connection
# refused» — es lauscht ja etwas, es antwortet nur nie. Der Fehler zeigt dadurch auf den
# Browser, obwohl er beim Tunnel liegt. Der Tunnel gehoert auf den eigenen Rechner.
if pgrep -f "ssh -L 9222" >/dev/null 2>&1; then
  pgrep -af "ssh -L 9222" | sed 's/^/    beende: /'
  pkill -f "ssh -L 9222" || true
  sleep 2
else
  echo "    keiner gefunden — gut"
fi

echo "▶ 2/3  Neuesten Stand holen"
git -C "$REPO" pull -q --ff-only 2>&1 | sed 's/^/    /' || echo "    (pull übersprungen)"

echo "▶ 3/3  Anmelde-Browser starten"
exec bash "$REPO/server/luxe-profil-anmelden.sh"
