#!/bin/bash
# platte_wartung.sh — Plattenzustand messen, lose Git-Objekte packen, EINE Zeile «PLATTE: …» ausgeben (19.10.2026).
#
# GEMESSEN 19.10. 04:50 UTC: Dateisystem 95 % voll, 2,0 GB frei (feste Sitzungszuteilung, `df` zeigt 252 G Grösse und täuscht).
# .git = 13 GB, davon 7,0 GiB LOSE Objekte (78'715) — `gc.auto` steht auf 0 und in automation/ lief nie ein repack. Ein `git repack -d`
# (nur lose Objekte, nice, 18 Min) machte daraus 1,8 GB Pack: frei 2,0 → 7,1 GB (82 %). Jeder Commit legt die geänderten Ledger
# (_cj_lager.tsv, Exporte) als GANZE Blobs ab; ohne Packen wächst das ungebremst, bis Schreibvorgänge scheitern («No space left»).
#
# Entscheidung nach dem ZUSTAND, nie nach einer touch-Marke (Container startet ~stündlich neu und tötet den Lauf; Lehre 19.10.):
# lose Objekte > 1 GiB oder > 20'000 → packen (flock, nice, Timeout 55 min; ein abgebrochener Lauf lässt keine halben Packs zurück,
# der nächste Aufruf macht weiter). Es werden KEINE Dateien gelöscht und keine Historie verändert (`repack -d` ohne -a/-f).
#
#   bash automation/platte_wartung.sh            # messen + ggf. packen (im Hintergrund), Zeile ausgeben
#   bash automation/platte_wartung.sh --messen   # nur messen
#   bash automation/platte_wartung.sh --selbsttest
#
# Umgebung zum Testen: PLATTE_REPO (Repo), PLATTE_DF (statt `df`-Ausgabe «frei_KiB gesamt_KiB»), PLATTE_LOSE_KIB / PLATTE_LOSE_ANZAHL.

REPO=${PLATTE_REPO:-/home/user/aban-news-landing}
SCHWELLE_KIB=${PLATTE_SCHWELLE_KIB:-1048576}     # 1 GiB lose
SCHWELLE_ANZAHL=${PLATTE_SCHWELLE_ANZAHL:-20000}
WARN_FREI_KIB=${PLATTE_WARN_FREI_KIB:-1572864}   # unter 1,5 GB frei = ⚠️

messen() {
  local cnt
  cnt=$(git -C "$REPO" count-objects -v 2>/dev/null) || cnt=""
  LOSE_ANZAHL=${PLATTE_LOSE_ANZAHL:-$(printf '%s\n' "$cnt" | awk -F': ' '$1=="count"{print $2}')}
  LOSE_KIB=${PLATTE_LOSE_KIB:-$(printf '%s\n' "$cnt" | awk -F': ' '$1=="size"{print $2}')}
  PACK_KIB=$(printf '%s\n' "$cnt" | awk -F': ' '$1=="size-pack"{print $2}')
  : "${LOSE_ANZAHL:=0}" "${LOSE_KIB:=0}" "${PACK_KIB:=0}"
  if [ -n "${PLATTE_DF:-}" ]; then
    FREI_KIB=${PLATTE_DF%% *}; GESAMT_KIB=${PLATTE_DF##* }
  else
    read -r FREI_KIB GESAMT_KIB < <(df -Pk "$REPO" 2>/dev/null | awk 'NR==2{print $4, $2}')
  fi
  : "${FREI_KIB:=0}" "${GESAMT_KIB:=0}"
}

zeile() {
  local frei_gb lose_mb pack_gb warn=""
  frei_gb=$(awk -v k="$FREI_KIB" 'BEGIN{printf "%.1f", k/1048576}')
  lose_mb=$(awk -v k="$LOSE_KIB" 'BEGIN{printf "%d", k/1024}')
  pack_gb=$(awk -v k="$PACK_KIB" 'BEGIN{printf "%.1f", k/1048576}')
  [ "$FREI_KIB" -lt "$WARN_FREI_KIB" ] && warn="⚠️ "
  echo "${warn}PLATTE: frei ${frei_gb} GB · .git Pack ${pack_gb} GB + lose ${lose_mb} MB (${LOSE_ANZAHL} Objekte)${1:+ · $1}"
}

brauche_packen() { [ "$LOSE_KIB" -gt "$SCHWELLE_KIB" ] || [ "$LOSE_ANZAHL" -gt "$SCHWELLE_ANZAHL" ]; }

starte_packen() {
  # Läuft schon einer (eigene Sperre oder irgendein repack/gc auf diesem Repo)? Dann nichts tun.
  if pgrep -f "git.* (repack|gc)( |$)" >/dev/null 2>&1; then echo "packt bereits"; return 0; fi
  ( cd "$REPO" && setsid bash -c 'exec 9>/tmp/lock_git_repack.lock; flock -n 9 || exit 0
      echo "START $(date -u +%FT%TZ)"
      nice -n 10 timeout 3300 git -c pack.windowMemory=512m -c pack.threads=3 -c pack.deltaCacheSize=128m repack -d -q
      echo "ENDE rc=$? $(date -u +%FT%TZ)"' >> /tmp/git_repack.log 2>&1 9>&- </dev/null & )
  echo "Packen gestartet"
}

selbsttest() {
  local f=0 t=0
  chk() { t=$((t+1)); if [ "$2" != "$3" ]; then f=$((f+1)); echo "FAIL $1: erwartet «$3» bekommen «$2»"; fi; }
  PLATTE_DF="7000000 250000000" PLATTE_LOSE_KIB=100 PLATTE_LOSE_ANZAHL=10; messen
  chk "wenig lose: kein Packen" "$(brauche_packen && echo ja || echo nein)" nein
  case "$(zeile)" in "PLATTE: "*) w=ja;; *) w=nein;; esac
  chk "zeile ohne Warnung" "$w" ja
  PLATTE_LOSE_KIB=7000000; messen
  chk "7 GB lose: packen" "$(brauche_packen && echo ja || echo nein)" ja
  PLATTE_LOSE_KIB=10; PLATTE_LOSE_ANZAHL=30000; messen
  chk "30'000 Objekte: packen" "$(brauche_packen && echo ja || echo nein)" ja
  PLATTE_DF="1000000 250000000"; PLATTE_LOSE_ANZAHL=5; messen
  case "$(zeile)" in "⚠️"*) w=ja;; *) w=nein;; esac
  chk "unter 1,5 GB frei: Warnung" "$w" ja
  chk "Zahlen in der Zeile" "$(zeile | grep -c 'frei 1.0 GB')" 1
  PLATTE_DF="" ; unset PLATTE_DF PLATTE_LOSE_KIB PLATTE_LOSE_ANZAHL; messen
  chk "echtes Repo messbar" "$([ "$PACK_KIB" -gt 0 ] && echo ja || echo nein)" ja
  echo "platte_wartung Selbsttest: $((t-f))/$t"
  [ "$f" -eq 0 ]
}

case "${1:-}" in
  --selbsttest) selbsttest; exit $? ;;
  --messen)     messen; zeile; exit 0 ;;
esac
messen
if brauche_packen; then
  zeile "$(starte_packen)"
else
  zeile
fi
