#!/usr/bin/env bash
# Stellt den taeglichen Papier-Lauf auf v2 um: Ledger A (Bitcoin-Regel, mit Begruendung) + Ledger B (Korb). Nur Spielgeld, keine Schluessel, keine Orders.
# Rueckgaengig: bash BTC-TREND-PAPIER-V2.sh zurueck   (zurueck auf den alten Lauf; Ledger bleiben)
set -euo pipefail
SHA256="0d5885e4d9b785f768228e81d167898650323e4b2b9fafe83ba2473617f71337"
DIR=/opt/aban-btc-trend
[ "$(id -u)" = 0 ] || { echo "Als root ausfuehren"; exit 1; }
NODE="$(command -v node || true)"; [ -n "$NODE" ] || { echo "node fehlt"; exit 1; }
[ -d "$DIR" ] || { echo "$DIR fehlt: zuerst BTC-TREND-PAPIER.sh ausfuehren"; exit 1; }
SCRIPT=btc_trend_papier.mjs
if [ "${1:-}" != "zurueck" ]; then
  TMP="$(mktemp)"
  curl -fsSL "https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/dropship/papierbot-strategie-2411/papier_lauf_v2.mjs" -o "$TMP"
  echo "$SHA256  $TMP" | sha256sum -c - >/dev/null || { echo "PRUEFSUMME FALSCH, abgebrochen"; rm -f "$TMP"; exit 1; }
  install -m 0644 "$TMP" "$DIR/papier_lauf_v2.mjs"; rm -f "$TMP"
  SCRIPT=papier_lauf_v2.mjs; ARGS="$DIR"
else
  ARGS="$DIR/ledger-btc-trend.json"
fi
cp -n /etc/systemd/system/aban-btc-trend.service "$DIR/service.vorher" 2>/dev/null || true
cat > /etc/systemd/system/aban-btc-trend.service <<UNIT
[Unit]
Description=ABAN Papier-Lauf Bitcoin-Trend und Korb (nur Spielgeld)
[Service]
Type=oneshot
WorkingDirectory=$DIR
ExecStart=$NODE $DIR/$SCRIPT $ARGS
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DIR
PrivateTmp=true
UNIT
systemctl daemon-reload
systemctl start aban-btc-trend.service
journalctl -u aban-btc-trend.service -n 4 --no-pager
echo "BTC_TREND_V2_OK"
