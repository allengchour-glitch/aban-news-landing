#!/usr/bin/env bash
# Stellt den taeglichen Papier-Lauf auf FUENF Bots um (je 1000 Papier-USDT, getrennte Ledger). Nur Spielgeld, keine Schluessel, keine Orders.
# Rueckgaengig: bash BTC-TREND-PAPIER-V3.sh zurueck2   (zurueck auf v2; Ledger bleiben)
set -euo pipefail
SHA3="0257aa7f1f4f963c807c5da227462b3eced18f5916817c7aad4ce0477e1bda7e"
SHA2="0d5885e4d9b785f768228e81d167898650323e4b2b9fafe83ba2473617f71337"
DIR=/opt/aban-btc-trend
[ "$(id -u)" = 0 ] || { echo "Als root ausfuehren"; exit 1; }
NODE="$(command -v node || true)"; [ -n "$NODE" ] || { echo "node fehlt"; exit 1; }
[ -d "$DIR" ] || { echo "$DIR fehlt: zuerst BTC-TREND-PAPIER.sh und V2 ausfuehren"; exit 1; }
get() { local T; T="$(mktemp)"; curl -fsSL "https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/dropship/papierbot-strategie-2411/$1" -o "$T"; echo "$2  $T" | sha256sum -c - >/dev/null || { echo "PRUEFSUMME FALSCH ($1), abgebrochen"; rm -f "$T"; exit 1; }; install -m 0644 "$T" "$DIR/$1"; rm -f "$T"; }
if [ "${1:-}" = "zurueck2" ]; then SCRIPT=papier_lauf_v2.mjs; else get papier_lauf_v2.mjs "$SHA2"; get papier_lauf_v3.mjs "$SHA3"; SCRIPT=papier_lauf_v3.mjs; fi
cat > /etc/systemd/system/aban-btc-trend.service <<UNIT
[Unit]
Description=ABAN Papier-Laeufe (fuenf Bots, nur Spielgeld)
[Service]
Type=oneshot
WorkingDirectory=$DIR
ExecStart=$NODE $DIR/$SCRIPT $DIR
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DIR
PrivateTmp=true
UNIT
systemctl daemon-reload
systemctl start aban-btc-trend.service
journalctl -u aban-btc-trend.service -n 4 --no-pager
echo "PAPIER_FUENF_BOTS_OK"
