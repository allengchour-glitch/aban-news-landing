#!/usr/bin/env bash
# Handy-Steuerung der Papier-Bots ueber Telegram (/status, /pause, /weiter, /reset). Nur Spielgeld, keine Boersenschluessel, keine Orders.
# Voraussetzung: V3 laeuft (BTC-TREND-PAPIER-V3.sh). Der Bot-Token wird hier auf dem Server getippt, nie im Chat.
# Rueckgaengig: bash BTC-TREND-PAPIER-STEUERUNG.sh weg   (stoppt den Dienst und loescht die Token-Datei; Ledger bleiben)
set -euo pipefail
SHA3="fed3ce8bfed7b275dec25dcc20c8f2353302b20339dcaecf4d3cc2e8ef9fdc64"
SHAS="1fe8c63f4ff020fc6cfc2dfae59d4a00553733cc8d21593c9d9c7b6c315dcfef"
SHAT="98c315fff1f9ea859421f75d37718a0d301fafc83ead04c0512431091f79f1e6"
DIR=/opt/aban-btc-trend; ENVF=/etc/aban-steuerung.env
[ "$(id -u)" = 0 ] || { echo "Als root ausfuehren"; exit 1; }
if [ "${1:-}" = "weg" ]; then systemctl disable --now aban-steuerung.service 2>/dev/null || true; rm -f /etc/systemd/system/aban-steuerung.service "$ENVF"; systemctl daemon-reload; echo "STEUERUNG_WEG_OK"; exit 0; fi
NODE="$(command -v node || true)"; [ -n "$NODE" ] || { echo "node fehlt"; exit 1; }
[ -f "$DIR/papier_lauf_v2.mjs" ] || { echo "Zuerst BTC-TREND-PAPIER-V3.sh ausfuehren"; exit 1; }
get() { local T; T="$(mktemp)"; curl -fsSL "https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/dropship/papierbot-strategie-2411/$1" -o "$T"; echo "$2  $T" | sha256sum -c - >/dev/null || { echo "PRUEFSUMME FALSCH ($1), abgebrochen"; rm -f "$T"; exit 1; }; install -m 0644 "$T" "$DIR/$1"; rm -f "$T"; }
get papier_lauf_v3.mjs "$SHA3"; get steuerung.mjs "$SHAS"; get telegram_steuerung.mjs "$SHAT"
if [ ! -f "$ENVF" ]; then
  read -rsp "Telegram-Bot-Token (Eingabe bleibt unsichtbar): " TOK; echo
  read -rp "Deine Telegram-Chat-Nummer (nur Ziffern, aus @userinfobot): " CH; echo
  [[ "$TOK" =~ ^[0-9]+:[A-Za-z0-9_-]{30,}$ ]] || { echo "Token sieht falsch aus"; exit 1; }
  [[ "$CH" =~ ^[0-9]+$ ]] || { echo "Chat-Nummer sieht falsch aus"; exit 1; }
  umask 077; printf 'TG_TOKEN=%s\nTG_CHAT=%s\n' "$TOK" "$CH" > "$ENVF"
fi
chmod 600 "$ENVF"
cat > /etc/systemd/system/aban-steuerung.service <<UNIT
[Unit]
Description=ABAN Papier-Bots Handy-Steuerung (Telegram, nur Spielgeld)
After=network-online.target
[Service]
EnvironmentFile=$ENVF
WorkingDirectory=$DIR
ExecStart=$NODE $DIR/telegram_steuerung.mjs $DIR
Restart=always
RestartSec=10
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DIR
PrivateTmp=true
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now aban-steuerung.service
sleep 2; systemctl is-active aban-steuerung.service
echo "STEUERUNG_OK: schreibe deinem Bot /status"
