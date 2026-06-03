#!/usr/bin/env bash
# LuxeStyle - baut den kompletten 3D-Katalog mit EINEM Befehl.
# Erzeugt alle STLs nach samples/. Voraussetzung: openscad im PATH.
#   bash build_all.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p samples

echo "== Tiere =="
for k in cat bear rabbit fish paw dog heart star butterfly; do
  openscad -o "samples/tier_$k.stl" -D "kind=\"$k\"" animal.scad >/dev/null 2>&1 \
    && echo "  ok tier_$k"
done

echo "== Einkaufswagen-Chip =="
openscad -o samples/token_chf2.stl -D 'coin="chf2"' -D 'txt="AC"' cart_token.scad >/dev/null 2>&1 && echo "  ok cart_token"

echo "== Beispiel-Personalisierung =="
python3 make.py keychain  "Mia"            --out samples/keychain_Mia.stl        >/dev/null && echo "  ok keychain_Mia"
python3 make.py nameplate "Familie Mueller" --out samples/nameplate_Mueller.stl  >/dev/null && echo "  ok nameplate_Mueller"
python3 make.py caketopper "Happy Birthday" --out samples/caketopper.stl         >/dev/null && echo "  ok caketopper"

echo "== fertig: $(ls samples/*.stl | wc -l) STL-Dateien in samples/ =="
