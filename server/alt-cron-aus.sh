#!/usr/bin/env bash
# alt-cron-aus.sh — schaltet die root-Cron-Zeilen ab, die Code aus dem toten Klon /opt/luxe/repo starten.
# Betreiber-Freigabe 13.10.2026: «mach du hetzner» (nach dem Befund dropship/ZOMBIE-CRON-2026-10-13.md).
#
# GEMESSEN 13.10.2026: Die root-Crontab des Servers trägt seit Juni zwei Zeilen aus der Zeit vor dem Agenten:
#   0 4 * * *    /opt/luxe/repo/automation/vps/run-api-jobs.sh      (täglich 04:00 UTC)
#   */10 * * * * cd /opt/luxe/repo && bash automation/vps/vps-cmd-poll.sh
# Beide setzen den Klon hart auf den Zweig claude/luxestyle-product-CizQ6 (letzter Commit 06.09.2026, tot) und
# starten von dort rund 20 alte Shopify-Schreiber — u. a. delivery_block.mjs, der jeden Morgen ab ~04:07 UTC in
# bis zu 1'000 Produktbeschreibungen den alten Block «Lieferzeit (je nach Land) … 🇺🇸 USA: 12–22 Tage» zurück-
# schrieb (13.10.: 746 Produkte, darunter die Top-Kleider Sirène und Aurora; wir liefern nur CH und LI).
#
# Was das Skript tut (idempotent):
#   aus (Standard): jede NICHT auskommentierte Zeile mit «/opt/luxe/repo» bekommt die Marke «#luxe-aus-toter-zweig »
#                   vorangestellt. Vorher eine Sicherung der ganzen Crontab (Modus 600) unter $SICHERUNG_DIR.
#   --zurueck:      nimmt genau diese Marke wieder weg (Rückweg ohne Handarbeit).
# Ausgegeben werden NUR Zahlen und der Pfad der Sicherung — nie eine Crontab-Zeile (sie kann Zugangsdaten tragen;
# die Quittung landet im öffentlichen Repo). Die Zeilen zeigt die Wartungsaktion danach in der Allowlist-Form
# (crontabZeile in server/wartung.mjs).
set -euo pipefail
MARKE='#luxe-aus-toter-zweig '
MUSTER='/opt/luxe/repo'
SICHERUNG_DIR="${SICHERUNG_DIR:-/var/lib/luxe-agent}"
modus="${1:-aus}"
case "$modus" in aus|--zurueck) ;; *) echo "unbekannter Modus: $modus"; exit 2 ;; esac

alt="$(crontab -l 2>/dev/null || true)"
if [ "$modus" = aus ]; then
  neu="$(printf '%s\n' "$alt" | awk -v m="$MARKE" -v p="$MUSTER" '
    /^[[:space:]]*#/ { print; next }
    index($0, p) > 0 { print m $0; next }
    { print }')"
else
  neu="$(printf '%s\n' "$alt" | awk -v m="$MARKE" '
    index($0, m) == 1 { print substr($0, length(m) + 1); next }
    { print }')"
fi
if [ "$alt" = "$neu" ]; then
  echo "nichts zu tun"
else
  mkdir -p "$SICHERUNG_DIR"
  # Name mit Modus + PID und noclobber: eine Sicherung wird nie überschrieben (Test 13.10.: «aus» und «zurück» in
  # derselben Sekunde überschrieben sonst die erste Sicherung — genau die, die man für den Rückweg braucht).
  sicherung="$SICHERUNG_DIR/crontab-sicherung-$(date -u +%Y%m%dT%H%M%SZ)-${modus#--}-$$.txt"
  ( umask 077; set -o noclobber; printf '%s\n' "$alt" > "$sicherung" )
  printf '%s\n' "$neu" | crontab -
  echo "Sicherung: $sicherung"
fi
jetzt="$(crontab -l 2>/dev/null || true)"
aktiv="$(printf '%s\n' "$jetzt" | grep -v '^[[:space:]]*#' | grep -cF "$MUSTER" || true)"
aus="$(printf '%s\n' "$jetzt" | grep -cF "$MARKE" || true)"
echo "aktiv mit $MUSTER: $aktiv"
echo "abgeschaltet (Marke): $aus"
if [ "$modus" = aus ] && [ "$aktiv" != 0 ]; then echo "FEHLER: noch aktive Zeilen"; exit 1; fi
exit 0
