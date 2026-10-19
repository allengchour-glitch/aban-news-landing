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
# 19.10.2026 (Spähtrupp wf_62fc1cba, PL-1/PL-2): (a) NIE `--geometric`, `gc --auto` oder `repack -a` ohne `--keep-pack` bei diesem Packzustand (7,5 GiB in 25 Packs).
# (b) Freiplatz-Tor: Pack ≈ 25 % der losen Menge → packen nur, wenn frei ≥ 30 % lose + 0,5 GiB. (c) 4'208 verwaiste lose Objekte (189 MiB) bleiben für `repack -d`
# ewig lose und zählen mit → Schwelle auf «lose MINUS Rest nach dem letzten Packen» (Rest in /tmp/platte_rest.txt). (d) Schwelle 300 MiB/6'000 statt 1 GiB/20'000:
# ein Lauf dauert dann ~1 Minute, die lose Zone bleibt unter 0,5 GiB. (e) tmp_pack-Reste eines vom Neustart getöteten pack-objects räumen.
# (f) TMP-LEICHEN: Python-Tempfiles (/tmp/tmpXXXXXXXX[.jpg|.png|.mp4…], mkdtemp-Ordner) älter 24 h — 6'755 Dateien = 1,6 GiB + 1'974 Ordner, +450 MiB/Tag; Muster
# EXAKT tmp + 8 Zeichen (nie *.lock, kost*, Exporte).
#
#   bash automation/platte_wartung.sh            # messen + ggf. packen (im Hintergrund), Zeile ausgeben
#   bash automation/platte_wartung.sh --messen   # nur messen
#   bash automation/platte_wartung.sh --selbsttest
#
# Umgebung zum Testen: PLATTE_REPO (Repo), PLATTE_DF (statt `df`-Ausgabe «frei_KiB gesamt_KiB»), PLATTE_LOSE_KIB / PLATTE_LOSE_ANZAHL.

REPO=${PLATTE_REPO:-/home/user/aban-news-landing}
SCHWELLE_KIB=${PLATTE_SCHWELLE_KIB:-307200}      # 300 MiB lose (ohne Rest)
SCHWELLE_ANZAHL=${PLATTE_SCHWELLE_ANZAHL:-6000}
REST_DATEI=${PLATTE_REST:-/tmp/platte_rest.txt}   # «kib anzahl» der nach dem letzten Packen übrigen (unerreichbaren) losen Objekte
TMP_DIR=${PLATTE_TMP:-/tmp}
WARN_FREI_KIB=${PLATTE_WARN_FREI_KIB:-1572864}   # unter 1,5 GB frei = ⚠️

messen() {
  local cnt
  cnt=$(git -C "$REPO" count-objects -v 2>/dev/null) || cnt=""
  LOSE_ANZAHL=${PLATTE_LOSE_ANZAHL:-$(printf '%s\n' "$cnt" | awk -F': ' '$1=="count"{print $2}')}
  LOSE_KIB=${PLATTE_LOSE_KIB:-$(printf '%s\n' "$cnt" | awk -F': ' '$1=="size"{print $2}')}
  PACK_KIB=$(printf '%s\n' "$cnt" | awk -F': ' '$1=="size-pack"{print $2}')
  # 19.10. (Prüfung PL-3): scheitert `git count-objects` (kein Repo, Besitzerprüfung, Sperre), stand «Pack 0.0 GB + lose 0 MB» ohne Warnzeichen —
  # eine Messlücke sah aus wie ein sauberes Repo. Jetzt: MESSFEHLER=1, die Zeile sagt «Git-Messung fehlgeschlagen».
  MESSFEHLER=0; [ -z "$cnt" ] && [ -z "${PLATTE_LOSE_KIB:-}" ] && MESSFEHLER=1
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
  if [ "${MESSFEHLER:-0}" = 1 ]; then
    echo "⚠️ PLATTE: frei ${frei_gb} GB · .git unklar (git count-objects fehlgeschlagen)${1:+ · $1}"; return
  fi
  echo "${warn}PLATTE: frei ${frei_gb} GB · .git Pack ${pack_gb} GB + lose ${lose_mb} MB (${LOSE_ANZAHL} Objekte)${1:+ · $1}"
}

rest_lesen() { REST_KIB=""; REST_ANZ=""; [ -r "$REST_DATEI" ] && read -r REST_KIB REST_ANZ < "$REST_DATEI"; case "${REST_KIB:-}" in ''|*[!0-9]*) REST_KIB=0;; esac; case "${REST_ANZ:-}" in ''|*[!0-9]*) REST_ANZ=0;; esac; }
brauche_packen() {
  rest_lesen
  [ $(( LOSE_KIB - REST_KIB )) -gt "$SCHWELLE_KIB" ] || [ $(( LOSE_ANZAHL - REST_ANZ )) -gt "$SCHWELLE_ANZAHL" ]
}
platz_reicht() { [ "$FREI_KIB" -ge $(( LOSE_KIB * 3 / 10 + 524288 )) ]; }

# TMP-LEICHEN: nur Python-Tempnamen (tmp + genau 8 Zeichen [a-z0-9_], optional .endung), älter 24 h. Gibt «n Dateien x MB» aus (leer, wenn nichts).
tmp_leichen_raeumen() {
  # Name = tmp + genau 8 Zeichen [a-z0-9_] (Python tempfile) UND mindestens EINE Ziffer darunter: «tmp_zustand.json» hat 8 Zeichen ohne Ziffer und bleibt
  # (im Selbsttest 19.10. gefangen — ohne die Ziffernregel hätte das Muster eine Zustandsdatei treffen können). Echte Zufallsnamen haben in 94 % eine Ziffer.
  local re8='.*/tmp[a-z0-9_]{8}(\.[a-z0-9]{2,5})?' redz='.*/tmp[a-z0-9_]*[0-9][a-z0-9_]*(\.[a-z0-9]{2,5})?' vor n
  [ -d "$TMP_DIR" ] || return 0
  local sel=( -maxdepth 1 -regextype posix-extended -regex "$re8" -regex "$redz" -mmin +1440 )
  n=$(find "$TMP_DIR" "${sel[@]}" \( -type f -o -type d \) 2>/dev/null | wc -l)
  [ "${n:-0}" -gt 0 ] || return 0
  vor=$(find "$TMP_DIR" "${sel[@]}" \( -type f -o -type d \) -print0 2>/dev/null | xargs -0 -r du -sk 2>/dev/null | awk '{s+=$1} END{print s+0}')
  find "$TMP_DIR" -mindepth 1 "${sel[@]}" -type f -delete 2>/dev/null
  find "$TMP_DIR" -mindepth 1 "${sel[@]}" -type d -exec rm -rf {} + 2>/dev/null
  echo "TMP-LEICHEN: ${n} Einträge × $(( ${vor:-0} / 1024 )) MB geräumt"
}

# tmp_pack-Reste im Pack-Ordner (ein per SIGKILL beendetes pack-objects lässt sie liegen, bis 1,8 GB); nur wenn niemand packt und älter 2 h
tmp_pack_raeumen() {
  [ -d "$REPO/.git/objects/pack" ] || return 0
  pgrep -f "[g]it.* pack-objects" >/dev/null 2>&1 && return 0   # 19.10. (PL-2): `pgrep -x pack-objects` traf nie — der Prozessname (comm) ist «git»
  find "$REPO/.git/objects/pack" -maxdepth 1 -name 'tmp_*' -mmin +120 -delete 2>/dev/null
}

starte_packen() {
  # Läuft schon einer (eigene Sperre oder irgendein repack/gc auf diesem Repo)? Dann nichts tun.
  if pgrep -f "git.* (repack|gc)( |$)" >/dev/null 2>&1; then echo "packt bereits"; return 0; fi
  ( cd "$REPO" && setsid bash -c 'exec 9>/tmp/lock_git_repack.lock; flock -n 9 || exit 0
      echo "START $(date -u +%FT%TZ)"
      nice -n 10 timeout 3300 git -c pack.windowMemory=512m -c pack.threads=3 -c pack.deltaCacheSize=128m repack -d -q
      rc=$?
      # 19.10. (Prüfung wf_8ad620bc, PL-1): Rest NUR nach erfolgreichem Packen schreiben — nach ENOSPC/Timeout hielte er sonst die
      # ganze lose Menge für «unerreichbar» und die Wartung packte erst wieder, wenn 300 MiB MEHR dazukämen.
      [ "$rc" = 0 ] && git -C "$0" count-objects -v 2>/dev/null | awk -F": " '"'"'$1=="size"{k=$2} $1=="count"{n=$2} END{print k, n}'"'"' > "$1"
      echo "ENDE rc=$rc $(date -u +%FT%TZ)"' "$REPO" "$REST_DATEI" >> /tmp/git_repack.log 2>&1 9>&- </dev/null & ) >/dev/null 2>&1
  # ↑ 19.10. (AMP-1): die Klammer selbst auf /dev/null — sonst hielt sie das stdout von `$(starte_packen)` offen, und der Keepalive
  # wartete (ohne timeout) bis zum Ende von `git repack` (bis 55 min), noch vor dem Aufseher-Schritt.
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
  # 19.10.2026: Schwellen mit Rest, Freiplatz-Tor, TMP-Leichen
  REST_DATEI=$(mktemp); echo "190000 4208" > "$REST_DATEI"
  PLATTE_DF="7000000 250000000"; PLATTE_LOSE_KIB=224000; PLATTE_LOSE_ANZAHL=4448; messen
  chk "nur Rest lose (224 MB, 4448 Obj., Rest 190 MB/4208): kein Packen" "$(brauche_packen && echo ja || echo nein)" nein
  PLATTE_LOSE_KIB=700000; PLATTE_LOSE_ANZAHL=9000; messen
  chk "700 MB lose, Rest 190 MB: 510 MB > 300 MB → packen" "$(brauche_packen && echo ja || echo nein)" ja
  echo "10 10" > "$REST_DATEI"; PLATTE_LOSE_KIB=200000; PLATTE_LOSE_ANZAHL=7000; messen
  chk "7000 Objekte ohne Rest > 6000 → packen" "$(brauche_packen && echo ja || echo nein)" ja
  PLATTE_DF="700000 250000000"; PLATTE_LOSE_KIB=2000000; messen
  chk "zu wenig Platz (0,7 GB frei, 2 GB lose)" "$(platz_reicht && echo ja || echo nein)" nein
  PLATTE_DF="3000000 250000000"; messen
  chk "genug Platz (3 GB frei, 2 GB lose: Bedarf 1,1 GB)" "$(platz_reicht && echo ja || echo nein)" ja
  echo "kaputt" > "$REST_DATEI"; rest_lesen
  chk "kaputte Rest-Datei = 0" "$REST_KIB $REST_ANZ" "0 0"
  rm -f "$REST_DATEI"
  TMP_DIR=$(mktemp -d); mkdir -p "$TMP_DIR/tmpab12cd34" "$TMP_DIR/tmpzz99yy88" "$TMP_DIR/behalten_ordner"
  : > "$TMP_DIR/tmpab12cd34.jpg"; : > "$TMP_DIR/tmpzz99yy88.mp4"; : > "$TMP_DIR/tmpfrisch1.png"; : > "$TMP_DIR/tmp_zustand.json"
  : > "$TMP_DIR/lock_x.lock"; : > "$TMP_DIR/kost28.jsonl"; : > "$TMP_DIR/tmpAB12cd34.jpg"; : > "$TMP_DIR/tmpab12cd3.jpg"; : > "$TMP_DIR/tmpab12cd345.jpg"
  : > "$TMP_DIR/tmpalt12abc.mp4"
  for fn in tmpab12cd34.jpg tmpzz99yy88.mp4 tmpalt12abc.mp4; do touch -d "30 hours ago" "$TMP_DIR/$fn"; done   # NICHT «f»: das ist der Fehlerzähler dieser Funktion
  touch -d "30 hours ago" "$TMP_DIR/tmpab12cd34" "$TMP_DIR/tmpzz99yy88"
  touch -d "30 hours ago" "$TMP_DIR/tmpAB12cd34.jpg" "$TMP_DIR/tmpab12cd3.jpg" "$TMP_DIR/tmpab12cd345.jpg" "$TMP_DIR/tmp_zustand.json" "$TMP_DIR/lock_x.lock" "$TMP_DIR/kost28.jsonl"
  out=$(tmp_leichen_raeumen)
  chk "TMP: alte Tempnamen weg (3 Dateien + 2 Ordner)" "$(printf %s "$out" | grep -c '5 Einträge')" 1
  chk "TMP: frische Tempdatei bleibt" "$([ -e "$TMP_DIR/tmpfrisch1.png" ] && echo ja || echo nein)" ja
  chk "TMP: tmp_zustand.json bleibt (kein 8-Zeichen-Name)" "$([ -e "$TMP_DIR/tmp_zustand.json" ] && echo ja || echo nein)" ja
  chk "TMP: Lock bleibt" "$([ -e "$TMP_DIR/lock_x.lock" ] && echo ja || echo nein)" ja
  chk "TMP: Export bleibt" "$([ -e "$TMP_DIR/kost28.jsonl" ] && echo ja || echo nein)" ja
  chk "TMP: Gross-/Falschlängen bleiben" "$([ -e "$TMP_DIR/tmpAB12cd34.jpg" ] && [ -e "$TMP_DIR/tmpab12cd3.jpg" ] && [ -e "$TMP_DIR/tmpab12cd345.jpg" ] && echo ja || echo nein)" ja
  chk "TMP: fremder Ordner bleibt" "$([ -d "$TMP_DIR/behalten_ordner" ] && echo ja || echo nein)" ja
  chk "TMP: alter Tempname weg" "$([ -e "$TMP_DIR/tmpab12cd34.jpg" ] && echo ja || echo nein)" nein
  chk "TMP: zweiter Lauf räumt nichts mehr" "$(tmp_leichen_raeumen)" ""
  rm -rf "$TMP_DIR"
  TMP_DIR=${PLATTE_TMP:-/tmp}; REST_DATEI=${PLATTE_REST:-/tmp/platte_rest.txt}
  PLATTE_DF="" ; unset PLATTE_DF PLATTE_LOSE_KIB PLATTE_LOSE_ANZAHL; messen
  chk "echtes Repo messbar" "$([ "$PACK_KIB" -gt 0 ] && echo ja || echo nein)" ja
  echo "platte_wartung Selbsttest: $((t-f))/$t"
  [ "$f" -eq 0 ]
}

case "${1:-}" in
  --selbsttest) ( selbsttest ); exit $? ;;   # Unterschale: ein Fehler im Test darf NIE in den Hauptablauf (echtes Packen) durchfallen — 19.10. passiert
  --messen)     messen; zeile; exit 0 ;;
esac
messen
tmp_pack_raeumen
LEICHEN=$(tmp_leichen_raeumen)
if brauche_packen; then
  if platz_reicht; then
    zeile "$(starte_packen)${LEICHEN:+ · $LEICHEN}"
  else
    zeile "⚠️ zu wenig Platz zum Packen (frei < 30 % der losen Menge + 0,5 GB)${LEICHEN:+ · $LEICHEN}"
  fi
else
  zeile "${LEICHEN}"
fi
