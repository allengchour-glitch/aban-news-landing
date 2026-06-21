#!/usr/bin/env bash
# =============================================================================
#  setup-cloudflare.sh — schaltet die 2 letzten Live-Hebel in EINEM Lauf frei:
#    (1) D1-Datenbank "inserate" anlegen + Schema einspielen   -> echte Inserate
#    (2) GROQ_API_KEY als Pages-Secret setzen                  -> Gratis-KI live
#
#  Voraussetzung (das EINZIGE, was nur du tun kannst — Konto-Zugang):
#    entweder einmal:  npx wrangler login
#    oder als Env:     export CLOUDFLARE_API_TOKEN=...   (Pages:Edit + D1:Edit)
#
#  Aufruf:
#    bash automation/setup-cloudflare.sh <PAGES_PROJEKTNAME>
#  Beispiel:
#    bash automation/setup-cloudflare.sh abannews
# =============================================================================
set -euo pipefail

PROJ="${1:-}"
DB_NAME="inserate"
SCHEMA="db/inserate-schema.sql"
WR="npx --yes wrangler@latest"

if [ -z "$PROJ" ]; then
  echo "❌ Bitte Pages-Projektnamen angeben:  bash automation/setup-cloudflare.sh <PROJEKT>"
  echo "   (Cloudflare-Dashboard → Workers & Pages → dein Projekt → Name oben)"
  exit 1
fi
if [ ! -f "$SCHEMA" ]; then echo "❌ $SCHEMA fehlt."; exit 1; fi

# Auth prüfen
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ℹ️  Kein CLOUDFLARE_API_TOKEN gesetzt — prüfe wrangler-Login …"
  if ! $WR whoami >/dev/null 2>&1; then
    echo "❌ Nicht eingeloggt. Führe einmal aus:  npx wrangler login"
    echo "   ODER setze:  export CLOUDFLARE_API_TOKEN=...  (Rechte: Pages:Edit + D1:Edit)"
    exit 1
  fi
fi

echo "── (1/3) D1-Datenbank '$DB_NAME' anlegen ──"
# Idempotent: wenn sie existiert, weiter (Fehler ignorieren).
$WR d1 create "$DB_NAME" 2>/dev/null || echo "   (existiert vermutlich schon — ok)"

echo "── (2/3) Schema einspielen (remote) ──"
$WR d1 execute "$DB_NAME" --remote --file="$SCHEMA" --yes

echo "── (3/3) GROQ_API_KEY als Pages-Secret setzen ──"
echo "   (gleich wird der Key abgefragt — füge deinen rotierten Groq-Key ein)"
$WR pages secret put GROQ_API_KEY --project-name "$PROJ" || \
  echo "   ⚠️ Konnte Secret nicht setzen — im Dashboard nachholen (Settings → Variables)."

cat <<EOF

✅ D1 + Schema erledigt, Secret gesetzt.

⚠️ EIN letzter Klick im Dashboard (D1-Binding lässt sich nicht zuverlässig per CLI an ein
   Pages-Projekt hängen): Workers & Pages → $PROJ → Settings → Functions →
   D1 database bindings → Add → Variable: DB → Datenbank: $DB_NAME → Save → Redeploy.

Danach prüfen:
   curl -s https://abannews.com/api/inserate-list | head
   (sollte JSON ohne "error":"db" liefern)
EOF
