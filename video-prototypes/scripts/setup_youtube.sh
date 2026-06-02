#!/usr/bin/env bash
# =============================================================================
#  YouTube-Auto-Setup  —  EIN Kommando, dann läuft alles von allein.
#
#  Macht den einmaligen Google-Login, holt das Refresh-Token und trägt die
#  3 GitHub-Secrets automatisch ein. Danach veröffentlicht der Workflow
#  .github/workflows/youtube.yml alle 2 Tage selbstständig den nächsten Clip.
#
#  Aufruf (aus dem Ordner video-prototypes/):
#      bash scripts/setup_youtube.sh
#
#  Voraussetzungen, die NUR DU einmal erledigen kannst (Google verlangt es):
#    1. https://console.cloud.google.com  ->  Projekt anlegen
#    2. "YouTube Data API v3" aktivieren
#    3. Anmeldedaten -> OAuth-Client-ID -> Typ "Desktop" -> JSON herunterladen
#    4. Datei hier ablegen als:  video-prototypes/client_secret.json
#  Dann dieses Skript starten — den Rest macht es.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."          # -> video-prototypes/
REPO="${REPO:-allengchour-glitch/aban-news-landing}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "▶ YouTube-Auto-Setup für $REPO"

# --- 1) Python-Abhängigkeiten -------------------------------------------------
say "1/4  Installiere Python-Pakete ..."
python3 -m pip install -q --upgrade \
  google-api-python-client google-auth-oauthlib google-auth-httplib2

# --- 2) OAuth-Client prüfen ---------------------------------------------------
if [ ! -f client_secret.json ]; then
  cat <<EOF

❌  client_secret.json fehlt. Einmalig anlegen:
    1. https://console.cloud.google.com  ->  Projekt anlegen
    2. "YouTube Data API v3" aktivieren
    3. Anmeldedaten -> OAuth-Client-ID -> Typ "Desktop" -> JSON laden
    4. Hier ablegen als:  video-prototypes/client_secret.json
    Danach dieses Skript erneut starten.
EOF
  exit 1
fi

# --- 3) Refresh-Token holen (öffnet einmal den Browser) -----------------------
say "2/4  Google-Login (Browser öffnet sich) ..."
OUT="$(python3 scripts/yt_get_refresh_token.py)"
echo "$OUT"
CID="$(echo "$OUT"  | sed -n 's/^YT_CLIENT_ID *= *//p'     | tr -d ' ')"
CSEC="$(echo "$OUT" | sed -n 's/^YT_CLIENT_SECRET *= *//p' | tr -d ' ')"
RTOK="$(echo "$OUT" | sed -n 's/^YT_REFRESH_TOKEN *= *//p' | tr -d ' ')"

if [ -z "$CID" ] || [ -z "$CSEC" ] || [ -z "$RTOK" ]; then
  echo "❌  Konnte die 3 Werte nicht auslesen. Bitte oben manuell kopieren."; exit 1
fi

# --- 4) GitHub-Secrets setzen -------------------------------------------------
say "3/4  Trage GitHub-Secrets ein ..."
if command -v gh >/dev/null 2>&1; then
  gh secret set YT_CLIENT_ID     -R "$REPO" --body "$CID"
  gh secret set YT_CLIENT_SECRET -R "$REPO" --body "$CSEC"
  gh secret set YT_REFRESH_TOKEN -R "$REPO" --body "$RTOK"
  say "✅  Secrets gesetzt."

  say "4/4  Test-Upload?"
  read -r -p "Jetzt 1 Clip testweise hochladen? [y/N] " yn
  if [ "${yn:-N}" = "y" ] || [ "${yn:-N}" = "Y" ]; then
    gh workflow run youtube.yml -R "$REPO" -f count=1
    echo "✅  Lauf gestartet — Status: gh run list -R $REPO -w youtube.yml"
  fi
else
  cat <<EOF

⚠️  GitHub-CLI 'gh' nicht gefunden — bitte 3 Secrets einmal manuell eintragen:
    https://github.com/$REPO/settings/secrets/actions

      YT_CLIENT_ID     = $CID
      YT_CLIENT_SECRET = $CSEC
      YT_REFRESH_TOKEN = $RTOK

   (gh installieren: https://cli.github.com  — dann läuft dieses Skript voll automatisch.)
EOF
fi

say "Fertig. Ab jetzt veröffentlicht der Cron alle 2 Tage automatisch den nächsten Clip. 🎬"
