#!/usr/bin/env bash
# anmeldung-fertig.sh — beendet den Anmelde-Browser, startet den Agenten und laesst ihn
# sofort nachmessen, WAS die Anmeldung wirklich gebracht hat.
#
# Das Nachmessen ist der Punkt: am 17.09. meldete der erste Durchgang «angemeldet:
# Google Merchant», waehrend der Browser auf Googles Einwilligungswand mit «Sign in»
# stand. Wer sich auf das Gefuehl verlaesst, sich eben angemeldet zu haben, glaubt genau
# solche Meldungen. Deshalb wird gemessen, nicht angenommen.
set -uo pipefail
REPO=/opt/luxe-agent/repo
PROFIL="${PROFIL:-/var/lib/luxe-agent/chrome-profil}"

echo "▶ Browser beenden (die Anmeldungen bleiben im Profil gespeichert)"
pkill -f -- "--user-data-dir=$PROFIL" 2>/dev/null || true
sleep 3
pkill -9 -f -- "--user-data-dir=$PROFIL" 2>/dev/null || true

echo "▶ Auftrag anlegen: nachmessen, wo das Profil wirklich angemeldet ist"
mkdir -p "$REPO/auftraege/offen"
cat > "$REPO/auftraege/offen/anmeldungen-nach-login.json" <<'JSON'
{
  "id": "anmeldungen-nach-login",
  "typ": "skript",
  "skript": "anmeldungen_pruefen.mjs",
  "warum": "Direkt nach dem Anmelden gemessen statt angenommen. Der Melder sagt jetzt null statt true, wo er es nicht weiss (Einwilligungswand, Bot-Pruefung)."
}
JSON
git -C "$REPO" add auftraege >/dev/null 2>&1
git -C "$REPO" -c user.name=luxe-agent -c user.email=agent@luxestyle.ch \
    commit -q -m "Nach dem Anmelden nachmessen [skip ci]" >/dev/null 2>&1 \
  && git -C "$REPO" push -q origin HEAD:claude/luxestyle-status-tztnn1 >/dev/null 2>&1 \
  && echo "    ✅ Auftrag gepusht" || echo "    ⚠️ Auftrag liegt lokal, der Agent nimmt ihn beim naechsten Lauf mit"

echo "▶ Agent wieder starten"
systemctl start luxe-agent.timer 2>/dev/null || true
systemctl is-active luxe-agent.timer | sed 's/^/    Timer: /'
echo
echo "Fertig. Das Ergebnis steht in ein paar Minuten in auftraege/erledigt/."
