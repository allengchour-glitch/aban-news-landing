#!/usr/bin/env bash
# Installiert den taeglichen Papier-Lauf "Bitcoin ueber SMA100, sonst Cash" (nur Spielgeld, keine Schluessel, keine Orders).
# Rueckgaengig: bash BTC-TREND-PAPIER.sh weg
set -euo pipefail
COMMIT="7920be5d3fba86f61f623310cbefcf66c25be09a"
SHA256="372397b98d87f155700ab53c49e855c440051db2a33611edfc05b5016d372587"
DIR=/opt/aban-btc-trend
if [ "${1:-}" = "weg" ]; then
  systemctl disable --now aban-btc-trend.timer 2>/dev/null || true
  rm -f /etc/systemd/system/aban-btc-trend.service /etc/systemd/system/aban-btc-trend.timer
  systemctl daemon-reload; echo "ENTFERNT (Ledger bleibt in $DIR)"; exit 0
fi
[ "$(id -u)" = 0 ] || { echo "Als root ausfuehren"; exit 1; }
NODE="$(command -v node || true)"; [ -n "$NODE" ] || { echo "node fehlt"; exit 1; }
mkdir -p "$DIR"
TMP="$(mktemp)"
curl -fsSL "https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/$COMMIT/dropship/papierbot-strategie-2411/btc_trend_papier.mjs" -o "$TMP"
echo "$SHA256  $TMP" | sha256sum -c - >/dev/null || { echo "PRUEFSUMME FALSCH, abgebrochen"; rm -f "$TMP"; exit 1; }
install -m 0644 "$TMP" "$DIR/btc_trend_papier.mjs"; rm -f "$TMP"
cat > /etc/systemd/system/aban-btc-trend.service <<UNIT
[Unit]
Description=ABAN Papier-Lauf Bitcoin-Trend (nur Spielgeld)
[Service]
Type=oneshot
WorkingDirectory=$DIR
ExecStart=$NODE $DIR/btc_trend_papier.mjs $DIR/ledger-btc-trend.json
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DIR
PrivateTmp=true
UNIT
cat > /etc/systemd/system/aban-btc-trend.timer <<UNIT
[Unit]
Description=Taeglich nach Tagesschluss (UTC)
[Timer]
OnCalendar=*-*-* 00:10:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now aban-btc-trend.timer
systemctl start aban-btc-trend.service
journalctl -u aban-btc-trend.service -n 3 --no-pager
echo "BTC_TREND_PAPIER_OK"
