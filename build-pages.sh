#!/usr/bin/env bash
# Baut ein sauberes Publish-Verzeichnis _site/ für den Cloudflare-Pages-Git-Deploy.
#
# Warum: Das Repo enthält schwere/nicht-öffentliche Verzeichnisse (v. a.
# video-prototypes/ mit Dateien > 25 MiB = Cloudflare-Pages-Limit). Ein direkter
# Git-Upload würde daran scheitern. Dieses Skript kopiert nur die echte Website
# (inkl. functions/ = Pages-Edge-API, _headers, _redirects) nach _site/ und spiegelt
# damit exakt die Excludes des bisherigen GitHub-Action-Direct-Upload-Deploys.
#
# Cloudflare-Pages-Einstellung:
#   Build command:            bash build-pages.sh
#   Build output directory:   _site
set -euo pipefail

rm -rf _site
mkdir -p _site

# Portabel (kein rsync nötig): mit tar kopieren und dabei ausschließen.
tar -cf - \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./_site' \
  --exclude='./node_modules' \
  --exclude='./video-prototypes' \
  --exclude='./reels' \
  --exclude='./social' \
  --exclude='./dropship' \
  --exclude='./ki-schriftsteller' \
  --exclude='./luxestyle-3d' \
  --exclude='./luxestyle-shop' \
  --exclude='./mediakit' \
  --exclude='./tools' \
  --exclude='./automation' \
  --exclude='./linkedin' \
  --exclude='./reports' \
  --exclude='./ki-tools-radar' \
  . | tar -xf - -C _site

# Pflicht-Checks: functions/ MUSS dabei sein (sonst sind /api/* tot).
test -d _site/functions && echo "functions/ ok" || { echo "::error::functions/ fehlt"; exit 1; }
test -f _site/_redirects && echo "_redirects ok"
test -f _site/_headers   && echo "_headers ok"
echo "Dateien im Deploy: $(find _site -type f | wc -l)"
echo "Dateien > 24 MiB (müssen 0 sein):"
find _site -type f -size +24M -printf '%s  %p\n' | sort -rn | head || true
