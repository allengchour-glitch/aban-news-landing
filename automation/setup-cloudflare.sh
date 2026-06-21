#!/usr/bin/env bash
# =============================================================================
#  setup-cloudflare.sh — schaltet die Geld- & Live-Hebel frei (interaktiv).
# -----------------------------------------------------------------------------
#  Setzt die noetigen Cloudflare-Pages-Secrets (du fuegst jeden Wert selbst ein)
#  und legt die Inserate-Datenbank an:
#    • STRIPE_API_KEY   -> Shop liefert das Kit nach Zahlung aus (Geld!)
#    • DOWNLOAD_SALT    -> korrekter Download-Hash der Kit-ZIPs
#    • GROQ_API_KEY     -> Gratis-KI auf der Website (/api/generate, Frag aban)
#    • D1 "inserate"    -> echte Kleinanzeigen
#
#  Kein Auto-Deploy, keine stillen Aenderungen: jeder Secret-Wert wird interaktiv
#  abgefragt (wrangler secret put). Idempotent wiederholbar.
#
#  Voraussetzung (nur du, Konto-Zugang):
#    einmal:  npx wrangler login     ODER     export CLOUDFLARE_API_TOKEN=...
#    Token-Rechte: Pages:Edit + D1:Edit (von einer erlaubten IP ausfuehren).
#
#  Aufruf:  bash automation/setup-cloudflare.sh [PAGES_PROJEKT]    (Default: abannews)
# =============================================================================
set -euo pipefail

PROJ="${1:-abannews}"
DB_NAME="inserate"
SCHEMA="db/inserate-schema.sql"
WR="npx --yes wrangler@latest"

[ -f "$SCHEMA" ] || { echo "❌ $SCHEMA fehlt (im Repo-Wurzelverzeichnis ausfuehren)."; exit 1; }

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if ! $WR whoami >/dev/null 2>&1; then
    echo "❌ Nicht eingeloggt. Einmal:  npx wrangler login"
    echo "   ODER:  export CLOUDFLARE_API_TOKEN=...  (Pages:Edit + D1:Edit), von erlaubter IP."
    exit 1
  fi
fi

put_secret() {  # $1 = Secret-Name, $2 = Beschreibung
  echo "── Secret '$1' setzen ($2) ──"
  echo "   Wert eingeben (wird nicht angezeigt). Leer lassen + Enter = ueberspringen."
  if $WR pages secret put "$1" --project-name "$PROJ"; then echo "   ✅ $1 gesetzt"; else echo "   ⏭️  $1 uebersprungen/Fehler"; fi
}

echo "==> Projekt: $PROJ"
put_secret STRIPE_API_KEY "Shop-Auslieferung nach Zahlung — GELD"
put_secret DOWNLOAD_SALT  "Download-Hash der Kit-ZIPs"
put_secret GROQ_API_KEY   "Gratis-KI auf der Website"

echo "── D1 '$DB_NAME' anlegen + Schema einspielen ──"
$WR d1 create "$DB_NAME" 2>/dev/null || echo "   (existiert vermutlich schon — ok)"
$WR d1 execute "$DB_NAME" --remote --file="$SCHEMA" --yes

cat <<EOF

✅ Secrets gesetzt + D1 bereit.

⚠️ EIN Dashboard-Klick fuer die Inserate-DB (Binding):
   Workers & Pages → $PROJ → Settings → Functions → D1 database bindings →
   Add → Variable: DB → Datenbank: $DB_NAME → Save → dann Redeploy.

Pruefen (nach Redeploy):
   curl -s "https://abannews.com/api/inserate-list" | head      # kein "error":"db"
   # Kauf-Test: ein Kit ueber den Stripe-Link kaufen -> Download muss kommen.
EOF
