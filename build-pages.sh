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

python3 tools/gen_markets_mini.py || true

rm -rf _site
mkdir -p _site

# Geschützte Kit-ZIPs aus DOWNLOAD_SALT (Cloudflare-Pages-Env) bauen →
# downloads/kits/<sha256(slug:salt)[:24]>.zip, exakt wie kit-download.js sie ausliefert.
# So funktioniert der Kauf-Download mit JEDEM dauerhaften Salt, ganz ohne GitHub Actions.
# No-op ohne DOWNLOAD_SALT; tolerant (bricht den Build nicht ab).
( command -v python3 >/dev/null 2>&1 && python3 automation/build_kit_zips.py ) || echo "build_kit_zips übersprungen"

# Seitensuche-Index aktuell halten (data/site-index.json) — damit die eigene Suche
# (suchmaschine.html) immer alle neuen Seiten findet. Tolerant; bricht den Build nicht ab.
( command -v python3 >/dev/null 2>&1 && python3 tools/build_search_index.py ) || echo "build_search_index übersprungen"

# Suchseiten fuer en/ fr/ it/ aus suchmaschine.html erzeugen — drei handgepflegte
# Kopien wuerden garantiert auseinanderdriften. Bricht LAUT ab, wenn sich die
# deutsche Vorlage geaendert hat (dann Skript und Vorlage abgleichen). Tolerant.
( command -v python3 >/dev/null 2>&1 && python3 tools/build_suche_sprachen.py ) || echo "build_suche_sprachen übersprungen"

# Neue Seiten in die sitemap.xml nachtragen + Dubletten entfernen. Es gibt keinen
# Generator, der die Sitemap neu baut — ohne diesen Schritt fehlen neue Rubriken
# bei Google (gemessen 2026-08-26: 21 Minispiele + 8 Märkte + 6 Seiten fehlten).
# Tolerant; bricht den Build nicht ab.
( command -v python3 >/dev/null 2>&1 && python3 tools/sitemap_luecken.py --fix ) || echo "sitemap_luecken übersprungen"

# Kaufberater-Pillar-Hub (kaufberater-schweiz.html) aus allen *-kaufen-schweiz.html neu bauen
# (Pillar-Cluster-SEO: alle Ratgeber ≤2 Klicks von der Startseite). Tolerant.
( command -v python3 >/dev/null 2>&1 && python3 tools/build_kaufberater_hub.py ) || echo "build_kaufberater_hub übersprungen"
( command -v python3 >/dev/null 2>&1 && python3 tools/build_ki_hub.py ) || echo "build_ki_hub übersprungen"

# RSS-Feed (feed.xml) aus den Newsletter-Ausgaben in archive/ — Distribution + Discoverability. Tolerant.
( command -v python3 >/dev/null 2>&1 && python3 tools/build_feed.py ) || echo "build_feed übersprungen"

# Portabel (kein rsync nötig): mit tar kopieren und dabei ausschließen.
tar -cf - \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./_site' \
  --exclude='./node_modules' \
  --exclude='./game' \
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
  --exclude='./server' \
  --exclude='./linkedin' \
  --exclude='./reports' \
  --exclude='./ki-tools-radar' \
  --exclude='./data/issue-*.html' \
  . | tar -xf - -C _site

# Pflicht-Checks: functions/ MUSS dabei sein (sonst sind /api/* tot).
test -d _site/functions && echo "functions/ ok" || { echo "::error::functions/ fehlt"; exit 1; }
test -f _site/_redirects && echo "_redirects ok"
test -f _site/_headers   && echo "_headers ok"

# aban-Engine in alle Seiten injizieren (gemeinsamer Kopf/Nav/Suche). Quelle bleibt sauber.
# Tolerant: bricht den Build nicht ab, falls node fehlt.
( command -v node >/dev/null 2>&1 && node automation/inject-engine.mjs _site ) || echo "inject-engine übersprungen (node fehlt)"

echo "Dateien im Deploy: $(find _site -type f | wc -l)"
echo "Dateien > 24 MiB (müssen 0 sein):"
find _site -type f -size +24M -printf '%s  %p\n' | sort -rn | head || true
