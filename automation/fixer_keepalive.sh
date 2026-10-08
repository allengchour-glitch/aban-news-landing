#!/bin/bash
# Hält alle Katalog-Reiniger am Leben (Turn-Reaping killt sie sonst). Alle Scripts sind resumable
# (eigene Cursor-Dateien) → Neustart setzt fort, keine Doppelarbeit.
#
# ⚠️ EINZEL-SPERRE (2026-08-09 teuer gelernt): Ohne sie liefen nach mehreren Neustarts DREI
# Supervisoren gleichzeitig. Jeder prüfte "läuft der Runner schon?" und startete bei Nein einen —
# im selben Zeitfenster taten das alle drei. Ergebnis nach 28 Minuten: 13 Kopien JE Runner,
# also 52 Prozesse, die gemeinsam auf CJ und Shopify eindroschen. Der pgrep-Test allein genügt
# nicht, weil zwischen Prüfung und Start ein Rennen entsteht (dieselbe TOCTOU-Falle wie beim
# Social-Doppelpost). flock stellt sicher, dass es diesen Prozess nur EINMAL gibt.
# ⚠️ WO LIEGT DAS REPO? NICHT unter $HOME. Diese Zeile ist die Lehre eines still
# verlorenen halben Tages: $HOME ist hier /root, das Repo liegt unter
# /home/user/aban-news-landing. Jeder Block, der unter dem Heimatverzeichnis nachsah,
# fand die Datei nicht und übersprang sie — und zwar LAUTLOS, weil ein `[ -f … ] || continue`
# wie ein berechtigtes «ist nicht installiert» aussieht. Betroffen waren die vier langen
# Katalog-Läufe, der Social-Autopilot, der Reel-Motor UND die tägliche Hype-Reihe, also
# ausgerechnet der Dauerauftrag «wenn Hype vorbei, Produkt ändern». Der Supervisor meldete
# dabei durchgehend gesunde Neustarts der übrigen Dienste.
# Der Pfad kommt deshalb aus dem Skript SELBST und nicht aus einer Umgebungsannahme.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ein fehlender Dienst darf nicht LAUTLOS übersprungen werden — genau das hat den Fehler oben
# einen Tag lang verdeckt. Wer nichts sagt, sieht aus wie «alles in Ordnung». Gemeldet wird
# einmal je Datei, damit das Log nicht alle zwei Minuten dasselbe wiederholt.
# ⚠️ NEUSTART-STURM (20.08.2026): Der Aufseher übersprang nur Läufe mit «FERTIG» im Log.
# Ein Lauf, der sich planmässig mit «PAUSE …» beendet (nichts zu tun, CJ-Punkte leer, Shopify
# antwortet nicht), galt dagegen als tot und wurde im ZWEI-MINUTEN-Takt neu gestartet — mit je
# einem Shopify-Token-Holen und einer CJ-Anmeldung. bigbuy_abschied lief so ~700-mal am Tag ins
# «PAUSE (Paket läuft bis 15.09.)», cj_variantenbild hämmerte Shopify so lange, bis es gar nicht
# mehr antwortete (die Meldung «Shopify antwortet nicht» war die FOLGE, nicht die Ursache).
# Wer sich mit PAUSE verabschiedet, hat nichts zu tun — eine Stunde Ruhe kostet nichts.
pause_kuehlt() {
  local log="/tmp/$1.log"
  [ -f "$log" ] || return 1
  # 23.09. 23:10 (Pruefer): v2-Skripte schreiben JEDE Zeile mit UTC-Zeitpraefix («23:05:22 PAUSE: …») — ohne die
  # optionale Zeitgruppe sah der Aufseher keine PAUSE/FERTIG mehr und startete den Bild-Nachfueller bei jedem Tick neu.
  tail -1 "$log" 2>/dev/null | grep -qE "^([0-9:]{8} |[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,12}Z )?PAUSE" || return 1
  local alter=$(( $(date +%s) - $(stat -c %Y "$log" 2>/dev/null || echo 0) ))
  [ "$alter" -lt 3600 ]
}

# 🔁 KURZSCHLUSS-WÄCHTER (21.08.2026, teuer gelernt). Der Aufseher startet einen Lauf neu,
# solange dessen Log keine FERTIG-Zeile trägt. Ein Wächter, der seine Befunde nur MELDET,
# erreicht sein FERTIG aber nie — `fremdzeichen_guard` lief so 131-mal im Zwei-Minuten-Takt
# über einen 74-MB-Export, für EINEN Befund, der auf eine Menschenentscheidung wartet.
# Unterschieden wird nach LAUFZEIT, nicht nach Logtext: Ein Lauf, der binnen 60 s endet, ist
# fertig geworden (oder sofort abgestürzt) — er wurde nicht mitten in der Arbeit vom
# Turn-Reaping erwischt. Wer fünfmal hintereinander so schnell endet, dreht sich im Kreis und
# wird für eine Stunde ausgesetzt; ein Lauf, der echte Arbeit leistet, setzt den Zähler
# zurück. Das schützt die langen Katalog-Läufe, die den schnellen Neustart wirklich brauchen.
# 24.09.2026: ABSTURZ NACHHOLEN. 49 Tagesläufe hängen am Tor «Log älter als 24 h». Ein Lauf, der mit Traceback
# endet, hat sein Log trotzdem frisch geschrieben — er war damit einen ganzen Tag gesperrt. Gemessen heute: ein
# Shopify-Aussetzer um 02:17 legte sechs Läufe bis morgen still (Neuheiten-Rotation der Startseite, Google-Kanal-
# Säuberung, Querbeet, leere Kollektionen, Versandprofil, Versandschwelle). Wahr, wenn das Log mit einem Fehler
# endet, der letzte Versuch ≥ 60 min her ist und heute höchstens 3 Nachholversuche liefen.
absturz_nachholen() {
  local log="$1" a z n
  [ -f "$log" ] || return 1
  a=$(( $(date +%s) - $(stat -c %Y "$log") ))
  [ "$a" -ge 3600 ] || return 1
  tail -n 3 "$log" | grep -qE "Traceback|Error|Exception" || return 1
  z="/tmp/_nachgeholt_$(basename "$log" .log)_$(date -u +%Y%m%d)"
  n=$(cat "$z" 2>/dev/null); case "$n" in (''|*[!0-9]*) n=0 ;; esac
  [ "$n" -lt 3 ] || return 1
  echo $(( n + 1 )) > "$z"
  echo "$(date -u +%H:%M) Absturz nachholen: $(basename "$log") (Versuch $(( n + 1 ))/3)"
  return 0
}

# still_gestorben LOG — 25.09.2026: Der Container startet ~stündlich neu. Ein Tageslauf, der dabei stirbt,
# hinterlässt KEINE Fehlerzeile (absturz_nachholen sieht nur Traceback/Error) — und weil der Anspruch
# (touch) VOR dem Start gesetzt wird, gilt der Tag als erledigt. Gemessen: Fortura-Bestandsabgleich
# 25.09. 02:10 geladen, beim Neustart gestorben, nächster Versuch erst nach 20 h → Bestand 30 h alt.
# NUR für Jobs, deren LETZTE Zeile IMMER FERTIG oder PAUSE ist (sonst beweist das Fehlen nichts):
# letzte Schreibung vor dem Container-Start + keine Schlusszeile = gestorben. Höchstens 3×/Tag.
# letzter_lauf LOG — gibt nur die Zeilen ab der letzten «START »-Marke aus (ohne Marke: das ganze Log).
# REGEL (29.09., ChatGPT-Kritik #2): Ein Skript darf «START » NUR als erste Zeile seines Laufs schreiben (Bedeutung wie
# die Aufseher-Marke). Eine «START …»-Zeile mitten im Lauf würde den Laufabschnitt abschneiden.
letzter_lauf() {
  [ -f "$1" ] || return 0
  if grep -q "^START " "$1"; then
    awk '/^START /{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' "$1"
  else
    cat "$1"
  fi
}

still_gestorben() {
  local log="$1" boot z n
  [ -f "$log" ] || return 1
  boot=$(( $(date +%s) - $(cut -d. -f1 /proc/uptime) ))
  [ "$(stat -c %Y "$log")" -lt "$boot" ] || return 1
  # 29.09.: nur Zeilen NACH der letzten «START »-Marke zählen. Mit tail -n 3 galt ein Lauf, der nach 1 Zeile starb,
  # als fertig, weil darüber noch das FERTIG vom Vortag stand (Fortura-Bestand 04:13 gestorben, 11 h kein Nachholen).
  # Logs ohne Marke behalten das alte Verhalten.
  if grep -q "^START " "$log"; then
    # 29.09. (ChatGPT-Kritik #5, nachgemessen): verankert wie das Haupttor — «nicht FERTIG» mitten im Text zählt nicht.
    letzter_lauf "$log" | grep -qE "^([0-9:]{8} |[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,12}Z )?(FERTIG|PAUSE)" && return 1
  else
    tail -n 3 "$log" | grep -qE "FERTIG|PAUSE" && return 1
  fi
  z="/tmp/_still_$(basename "$log" .log)_$(date -u +%Y%m%d)"
  n=$(cat "$z" 2>/dev/null); case "$n" in (''|*[!0-9]*) n=0 ;; esac
  [ "$n" -lt 3 ] || return 1
  echo $(( n + 1 )) > "$z"
  echo "$(date -u +%H:%M) Still gestorben (Container-Neustart) → nachholen: $(basename "$log") (Versuch $(( n + 1 ))/3)"
  return 0
}

dreht_sich_im_kreis() {
  local n="$1" start="/tmp/_start_$1" zaehler="/tmp/_schnellende_$1" gemeckert="/tmp/_kreis_gemeldet_$1"
  if [ -f "$start" ]; then
    local dauer=$(( $(date +%s) - $(cat "$start" 2>/dev/null || echo 0) ))
    rm -f "$start"
    if [ "$dauer" -lt 60 ]; then
      local vor; vor=$(cat "$zaehler" 2>/dev/null)
      case "$vor" in (''|*[!0-9]*) vor=0 ;; esac
      echo $(( vor + 1 )) > "$zaehler"
    else
      : > "$zaehler"   # hat echte Arbeit geleistet
    fi
  fi
  # ⚠️ `: > datei` hinterlaesst eine LEERE Datei, keine 0 — `cat` gelingt dann und liefert
  # "", das `|| echo 0` feuert nie, und `[ "" -ge 5 ]` bricht mit «integer expression
  # expected» ab. Stand seit dem Einbau am 21.08. in jedem Logdurchlauf. Deshalb wird der
  # Wert erst gelesen, dann auf eine Zahl geprueft.
  local stand; stand=$(cat "$zaehler" 2>/dev/null)
  case "$stand" in (''|*[!0-9]*) stand=0 ;; esac
  [ "$stand" -ge 5 ] || return 1
  # Ausgesetzt — aber nur eine Stunde, danach neuer Versuch (der Befund kann behoben sein).
  if [ -f "$gemeckert" ] && [ $(( $(date +%s) - $(stat -c %Y "$gemeckert") )) -gt 3600 ]; then
    rm -f "$gemeckert" "$zaehler"; return 1
  fi
  [ -f "$gemeckert" ] || { : > "$gemeckert"
    echo "$(date -u +%H:%M) ⚠️ $n endet immer wieder binnen Sekunden ohne FERTIG — 1 h ausgesetzt (Endlos-Neustart)"; }
  return 0
}

fehlt() {
  [ -f "$1" ] && return 1
  local marke="/tmp/_fehlt_$(basename "$1").marke"
  [ -f "$marke" ] || { echo "$(date -u +%H:%M) ⚠️ FEHLT: $1 — Dienst läuft nicht"; : > "$marke"; }
  return 0
}

# ⛔ NIEMALS `rm -f /tmp/fixer_keepalive.lock` VOR DEM START. Die Sperre wird vom Kernel
# freigegeben, sobald der Halter stirbt — sie zu löschen ist nie nötig und hebt genau den
# Schutz auf, für den sie da ist: der neue Prozess legt eine NEUE Datei an und sperrt einen
# anderen Inode, der alte Halter merkt davon nichts. So liefen am 13.08. zwei Supervisoren
# nebeneinander, und am 09.08. waren es drei mit 52 Runner-Kopien. Läuft schon einer, endet
# der Zweitstart hier von selbst — das ist die richtige Antwort, kein Hindernis.
# ⚠️ 9>&- AN JEDEM KINDSTART — die Wurzel zweier Rätsel dieses Tages.
# Ein `exec 9>datei; flock -n 9` vererbt den Deskriptor an JEDES Kind. Die Sperre gehört
# damit nicht mehr dem Supervisor allein, sondern der ganzen Nachkommenschaft. Folgen,
# beide am 13.08. beobachtet: (1) Der Supervisor stirbt, ein Reiniger lebt weiter — und
# hält die Sperre; jeder neue Start endet mit «läuft bereits», obwohl kein Supervisor
# läuft. Gefunden über /proc/<pid>/fd/9: es war textbild_fix.py. (2) Umgekehrt konnten
# zwei Supervisoren nebeneinander laufen, weil die Sperre zwischen Eltern und Kindern
# hin und her ging. Der Schiedsrichter über die kleinere PID bleibt als zweite Wache
# bestehen; die Ursache ist aber diese Zeile.
# 🔖 EIGENE FASSUNG QUITTIEREN (28.08.2026). Ein laufender Aufseher liest sein Skript
# NICHT neu — der Schleifenrumpf ist beim ersten Durchlauf geparst. Wer einen neuen Waechter
# einträgt, hat ihn deshalb erst nach dem naechsten Neustart wirklich registriert; heute
# standen `bilddubletten` und `wahlversprechen` stundenlang im Skript und liefen nie.
# Der Zeitstempel taugt nicht als Erkennung: `git reset --hard` beim Snapshot-Vorspulen
# setzt die mtime neu, ohne dass sich der Inhalt geaendert haben muss. Also die PRÜFSUMME.
md5sum "$0" 2>/dev/null | cut -d' ' -f1 > /tmp/_fixer_version
exec 9>/tmp/fixer_keepalive.lock
flock -n 9 || { echo "$(date -u +%H:%M) Supervisor läuft bereits — dieser Start endet."; exit 0; }
while true; do
  # 06.10.2026: FORTURA-BESTAND ZUERST. Gemessen: Claim 16:37, PAUSE 16:42 (Shopify antwortete nicht), danach 3,5 h kein
  # zweiter Versuch — der Aufseher loggte je Container-Stunde nur ~5 min (18:09–18:13, 19:08–19:12) und erreichte den Block
  # bei Zeile ~2260 nie vor dem nächsten Neustart. Bestand ist Kundenschutz; der Block selbst ist billig (Start im Hintergrund).
  # 📦 FORTURA-BESTAND (04.10.2026 neu): Anspruch (claim, 2 h) getrennt vom Erfolg (stamp, 20 h — setzt fortura_bestand_taeglich.sh
  # bei FERTIG). Gemessen 04.10.: zwei Läufe starben still (06:18, 08:30), still_gestorben sah den zweiten nicht (Log-Zeit ≥ Boot),
  # Bestand 36 h eingefroren. Mit dem Claim holt sich ein toter Lauf nach 2 h von selbst nach — ohne Neustart-Erkennung, ohne 3/Tag.
  # Ersetzt den bisherigen Block «FB=/tmp/fortura_bestand.stamp … fi».
  FB=/tmp/fortura_bestand.stamp; FBC=/tmp/fortura_bestand.claim; FBL=/tmp/fortura_bestand.log
  if [ -f /tmp/fortura_env.sh ] \
     && [ $(( $(date +%s) - $(stat -c %Y "$FB" 2>/dev/null || echo 0) )) -gt 72000 ] \
     && [ $(( $(date +%s) - $(stat -c %Y "$FBC" 2>/dev/null || echo 0) )) -gt 7200 ] \
     && ! ps -eo args --no-headers | awk '$1=="bash" && $2 ~ /fortura_bestand_taeglich\.sh$/ {f=1} END{exit(f?0:1)}'; then
    touch "$FBC"
    ( cd "$REPO" && setsid bash -c "exec 8>&- 9>&-; exec bash automation/fortura_bestand_taeglich.sh" >> "$FBL" 2>&1 & )
    echo "$(date -u +%H:%M) Fortura-Bestand: Tageslauf gestartet (letzter Erfolg vor $(( ( $(date +%s) - $(stat -c %Y "$FB" 2>/dev/null || echo 0) ) / 3600 )) h)"
  fi
  # 06.10.2026: billige Hintergrund-Starter ebenfalls VORN (der Aufseher erreicht späte Blöcke vor dem Neustart oft nicht).
  # KATEGORIE-FEIN (06.10.2026, Betreiber «feinkategorie und filter verbessern»): grobe Shopify-Kategorie (Typ-Signal) über die
  # feine Google-Kategorie verfeinern — nur Nachfahren, Titelprobe für Kleid/Rock/Hose/Schmuck/Fitness, Shopifys offizielle
  # Zuordnung. Stündlich versucht (flock gegen Doppel, Export 6 h im Cache, Ledger idempotent — ~100/min, der Erstlauf über
  # ~22k braucht mehrere Container-Stunden), Selbsttest vorher.
  KF=/tmp/kategorie_fein.log
  if [ -f "$REPO/automation/kategorie_fein.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KF" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 3300 ] && ( cd "$REPO" && timeout 30 python3 automation/kategorie_fein.py --selbsttest > /dev/null 2>&1 ); then
      touch "$KF"
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_kategorie_fein.lock; flock -n 9 || exit 0; \
          SCHARF=1 CAP=30000 timeout 5400 python3 automation/kategorie_fein.py" >> "$KF" 2>&1 9>&- & )
    fi
  fi
  # CJ-LAGER (06.10.2026, Betreiber «cj lagerstatus check und dann unser webseite auch bei alle produkten» + «ja ich will» schneller
  # → Grind 4 → 3 Runner): Bestand je Variante (product/query + features=enable_inventory, 1 Anfrage je Produkt) → Bestand 0 =
  # «ausverkauft» (DENY), zurück = CONTINUE. STÜNDLICH als vierter CJ-Verbraucher am gemeinsamen Takt (statt nur im Fenster):
  # er bekommt ~¼ der Anfragen, bis der Tagestopf leer ist, und endet dann sauber. flock gegen Doppel, Ledger idempotent.
  CL=/tmp/cj_lager.log
  # 07.10.2026 (Prüf-Routine 01:45): der Anspruch (touch) galt 55 min — starb der Lauf am Container-Neustart, blieb die
  # Stunde gesperrt. Gemessen: Fenster 00:00–01:30 brachte nur 840 statt 4'000 Prüfungen (Lauf 00:12 tot um ~00:20, Log
  # still bis 01:45). Jetzt: 55 min nur nach SAUBEREM Ende (letzte Zeile «CJ-LAGER: {…}»); gestorben oder im Vorrang-Fenster
  # → 10 min. flock verhindert weiter Doppel, Ledger macht den Neustart idempotent.
  CL_SPERRE=3300
  tail -n 3 "$CL" 2>/dev/null | grep -q '^CJ-LAGER: {' || CL_SPERRE=600
  source "$REPO/automation/cj_vorrang_fenster.sh" 2>/dev/null && cj_vorrang_zeit && CL_SPERRE=600
  if [ -f "$REPO/automation/cj_lager_abgleich.py" ] && [ $(( $(date +%s) - $(stat -c %Y "$CL" 2>/dev/null || echo 0) )) -gt "$CL_SPERRE" ] \
     && ( cd "$REPO" && timeout 30 python3 automation/cj_lager_abgleich.py --selbsttest > /dev/null 2>&1 ); then
    touch "$CL"
    ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_cj_lager.lock; flock -n 9 || exit 0; \
        CAP=4000 timeout 3500 python3 automation/cj_lager_abgleich.py" >> "$CL" 2>&1 9>&- & )
  fi
  # ALTER-IM-FARBWERT (06.10.2026, Verbesserungsrunde): «White-6 TO 9M» als einzige Option → Farbe + neue Option «Grösse»
  # («6–9 Monate»); liest den täglichen Optionen-Export von farbmuster_filter.py, nur eindeutige Fälle, Ledger.
  AF=/tmp/alter_im_farbwert.log
  if [ -f "$REPO/automation/alter_im_farbwert.py" ] && [ -s /tmp/farbmuster_export.jsonl ] \
     && [ $(( $(date +%s) - $(stat -c %Y "$AF" 2>/dev/null || echo 0) )) -gt 72000 ] \
     && ( cd "$REPO" && timeout 30 python3 automation/alter_im_farbwert.py --selbsttest > /dev/null 2>&1 ); then
    touch "$AF"
    ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_alter_im_farbwert.lock; flock -n 9 || exit 0; \
        SCHARF=1 timeout 3000 python3 automation/alter_im_farbwert.py" >> "$AF" 2>&1 9>&- & )
  fi
  # KLEIDER-MERKMALE (06.10.2026, Betreiber «Länge + Ärmel aus Titel»): shopify.skirt-dress-length-type / sleeve-length-type
  # aus eindeutigen Titelwörtern, nur erlaubte Kategorien, nie überschreiben. Täglich (neue Feinkategorien → neue Kandidaten).
  KM=/tmp/kleider_merkmale.log
  if [ -f "$REPO/automation/kleider_merkmale.py" ] && [ $(( $(date +%s) - $(stat -c %Y "$KM" 2>/dev/null || echo 0) )) -gt 72000 ] \
     && ( cd "$REPO" && timeout 30 python3 automation/kleider_merkmale.py --selbsttest > /dev/null 2>&1 ); then
    touch "$KM"
    ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_kleider_merkmale.lock; flock -n 9 || exit 0; \
        SCHARF=1 timeout 1800 python3 automation/kleider_merkmale.py" >> "$KM" 2>&1 9>&- & )
  fi
  # 🤖 HANDY-BOT (07.10.2026, Betreiber «entwickle eine bot für automation»): holt Befehle vom ntfy-Thema «<thema>-befehl»,
  # antwortet (nur lesen), und schickt einmal am Morgen den Tagesbericht. Am RUNDENBEGINN, weil Befehle sonst erst nach einer
  # ganzen Runde beantwortet würden (Lehre 06.10.: hintere Blöcke erreicht der Aufseher je Container-Stunde kaum).
  if [ -f "$REPO/automation/handy_bot.py" ]; then
    ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_handy_bot.lock; flock -n 9 || exit 0; \
        timeout 240 python3 automation/handy_bot.py --abholen; timeout 300 python3 automation/handy_bot.py --tagesbericht" \
        >> /tmp/handy_bot.log 2>&1 9>&- & )
  fi
  # 🧠 KNOWLEDGE-BASE-WACHE (07.10.2026): die App «Knowledge Base» legt Fakten mit KI-Vorschlägen an (06.10. falsch: «ohne
  # Zwischenhändler», «50–70 % unter Boutiquen», Geschenkverpackung ja). Täglich: neue/abweichende Fakten melden, nichts schreiben.
  if [ -f "$REPO/automation/knowledge_base_fakten.py" ] && [ ! -f /tmp/kb_wache_$(date -u +%F) ]; then
    touch "/tmp/kb_wache_$(date -u +%F)"
    ( cd "$REPO" && timeout 120 python3 automation/knowledge_base_fakten.py --wache >> /tmp/knowledge_base_wache.log 2>&1 & )
  fi
  # ⚠️ HERZSCHLAG GLEICH ZU RUNDENBEGINN (29.08.2026). Bis heute stand er nur GANZ AM ENDE
  # der Runde (vor dem sleep 120). Eine Runde dauert aber laenger als die 10-Minuten-Schwelle,
  # gegen die engine_keepalive prueft — allein die 13 Reiniger werden mit je 10 s Abstand
  # gestartet, dazu kommen Katalog-Laeufe. Folge: Der Aufseher galt bei JEDEM Lauf als
  # «haengt (Herzschlag kalt)» und wurde getoetet und neu gestartet — mitten in der Arbeit,
  # immer wieder. Live beobachtet: Herzschlag 398'301 s alt, waehrend der Aufseher gerade
  # Waechter startete und ins Log schrieb.
  # Der Herzschlag bedeutet «ich mache Fortschritt», nicht «ich bin fertig». Er gehoert
  # deshalb an den ANFANG der Runde und wird am Ende erneut geschrieben.
  date +%s > /tmp/_fixer_herzschlag
  bash "$REPO/automation/ocr_waisen.sh" 2>/dev/null   # 30.09.2026: verwaiste tesseract (Last-Stau) — jede Runde
  # ZWEITE WACHE, unabhängig von flock. Am 13.08. liefen zweimal zwei Supervisoren, obwohl
  # beide dieselbe Sperrdatei offen hatten UND die Sperre nachweislich gehalten wurde — die
  # flock-Semantik über exec/setsid/geerbte Deskriptoren hinweg ist hier offenbar nicht
  # verlässlich. Deshalb entscheidet ein zweites Kriterium: Der ÄLTESTE Supervisor gewinnt,
  # wer einen älteren sieht, tritt ab.
  #
  # ⚠️ 20.08.2026 — DIESE WACHE WAR SELBST DIE URSACHE DER AUSFÄLLE. Sie verglich
  # PID-NUMMERN («wer eine kleinere PID sieht, tritt ab») und setzte damit voraus, dass
  # eine kleinere PID einen älteren Prozess bedeutet. **Der PID-Zähler läuft um.** In diesem
  # Container standen gleichzeitig PID 3601 (50 Minuten alt) und PID 29404 (70 Minuten alt) —
  # die KLEINERE Nummer gehörte dem JÜNGEREN Prozess. Der wirklich älteste Supervisor sah
  # daraufhin eine «kleinere PID», hielt sich für den Zweitstart und trat ab; übrig blieb der
  # jüngere. Beobachtet als «21:20 älterer Supervisor läuft weiterhin (PID 11195 tritt ab)»,
  # wobei 11195 der älteste war. Weil jeder Neustart die Konstellation neu würfelt, stand der
  # Aufseher immer wieder still — und mit ihm ALLE täglichen Qualitäts-Wächter.
  # Entschieden wird jetzt nach LAUFZEIT (etimes, Sekunden seit Start). Die ist monoton und
  # kennt keinen Überlauf. Die PID bleibt nur noch Schiedsrichter bei exakt gleicher Laufzeit —
  # dort genügt sie, weil beide Seiten dieselbe Antwort erhalten.
  # ⚠️ 29.08.2026 — ZWEI FALLEN IN DIESEN VIER ZEILEN, beide gemessen statt vermutet.
  #
  # 1. EIN LEERES `mysec` KIPPT DEN VERGLEICH VON ZAHLEN AUF ZEICHENKETTEN. `mysec` kommt aus
  #    `ps -o etimes= -p $$`; scheitert dieser Aufruf einmal (Last, Fork-Grenze), ist die
  #    Variable leer, und awk vergleicht `$2 > ""` als STRING — das ist für jede Laufzeit wahr.
  #    Dann gilt JEDER andere Supervisor als älter. Sichtbar wurde es an der Logzeile «älterer
  #    Supervisor ist inzwischen weg — PID 30992 übernimmt»: **55-mal an einem Tag, immer mit
  #    DERSELBEN PID**, während durchgehend genau ein Aufseher lief (Laufzeit 8,7 h,
  #    Herzschlag 78 s). Es wurde also nie etwas übernommen.
  #    Harmlos war nur der Zweig, der zufällig zog. Der andere hätte `exit 0` ausgeführt und
  #    einen gesunden Aufseher beendet, weil ein `ps` nichts zurückgab — dieselbe Klasse wie
  #    «eine PID ist ein Name, kein Zeitstempel» (20.08.), nur eine Ebene tiefer: **eine
  #    fehlgeschlagene Messung darf nicht als Messwert weiterlaufen.**
  #    Jetzt: Ist `mysec` keine Zahl, wird die Prüfung diese Runde ÜBERSPRUNGEN. Die
  #    flock-Sperre trägt ohnehin; dieses Netz darf nie selbst zur Ursache werden.
  #
  # 2. FORKS TRAGEN DIE KOMMANDOZEILE DES ELTERNPROZESSES. Am 27.08. wurde dafür in
  #    `engine_keepalive.sh` die Sitzungs-Regel eingeführt (nur `pid == sid` ist ein echter
  #    Aufseher) — **hier fehlte sie**, dieselbe Lehre am Geschwister-Ort unangewandt.
  #    Der per `setsid` gestartete Aufseher ist Sitzungsführer, seine Forks sind es nie.
  mysec="$(ps -o etimes= -p $$ | tr -d ' ')"
  case "$mysec" in
    ''|*[!0-9]*) aeltere=0 ;;          # Messung fehlgeschlagen -> KEIN Befund
    *) aeltere=$(ps -eo pid,sid,etimes,args --no-headers \
         | awk -v me=$$ -v mysec="$mysec" \
           '$1==$2 && $4=="bash" && $5 ~ /fixer_keepalive\.sh$/ && $1 != me \
            && ($3+0 > mysec+0 || ($3+0 == mysec+0 && $1 < me)) {n++} END{print n+0}') ;;
  esac
  # ⚠️ NICHT SOFORT ABTRETEN. Die erste Fassung dieser Regel beendete den jüngeren
  # Supervisor auf der Stelle — und wenn der ältere Sekunden später starb, lief GAR KEINER
  # mehr. Genau das geschah am 14.08. um 01:22. Deshalb wird nach einer Pause noch einmal
  # nachgesehen: nur wer dann immer noch einen älteren findet, tritt ab. Seit der geerbte
  # Deskriptor geschlossen wird (9>&-), trägt ohnehin wieder die flock-Sperre; diese Regel
  # ist nur noch das Netz darunter und darf deshalb nie zur Ursache eines Ausfalls werden.
  if [ "$aeltere" -gt 0 ]; then
    sleep 5
    mysec="$(ps -o etimes= -p $$ | tr -d ' ')"
    case "$mysec" in
      ''|*[!0-9]*) aeltere=0 ;;
      *) aeltere=$(ps -eo pid,sid,etimes,args --no-headers \
           | awk -v me=$$ -v mysec="$mysec" \
             '$1==$2 && $4=="bash" && $5 ~ /fixer_keepalive\.sh$/ && $1 != me \
              && ($3+0 > mysec+0 || ($3+0 == mysec+0 && $1 < me)) {n++} END{print n+0}') ;;
    esac
    if [ "$aeltere" -gt 0 ]; then
      echo "$(date -u +%H:%M) älterer Supervisor läuft weiterhin (PID $$ tritt ab)"
      exit 0
    fi
    echo "$(date -u +%H:%M) älterer Supervisor ist inzwischen weg — PID $$ übernimmt"
  fi
  # ZUERST das Shopify-Token frisch halten. Es ist nur ~24 h gültig; läuft es ab, scheitern ALLE
  # Reiniger lautlos («keine Daten») und der Supervisor startet sie endlos ins Leere.
  # Repo-Fassung hat Vorrang: der Snapshot-Rewind stellt unter /tmp alte Staende her.
  if [ -f "$REPO/automation/shop_token_refresh.sh" ]; then bash "$REPO/automation/shop_token_refresh.sh"
  elif [ -f /tmp/shop_token_refresh.sh ]; then bash /tmp/shop_token_refresh.sh; fi

  # ── TOR: KEIN SCHREIBEN OHNE ANTWORTENDE API (05.09.2026) ───────────────────────────
  # Am 05.09. war die Custom-App weg ("app_not_installed"); das Token liess sich nicht mehr
  # erneuern. Gemessen ignorieren 68 der schreibenden Werkzeuge die OBERE Fehlerebene der
  # GraphQL-Antwort: faellt die Auth aus, kommt `data:null` ohne `userErrors` zurueck — der
  # Lauf haelt das fuer Erfolg und quittiert. Belegt an zwei POD-Produkten, die zweimal als
  # «ersetzt» im Ledger stehen und den alten Lieferblock live weitertragen. Eine falsche
  # Quittung ueberspringt den Fall FUER IMMER, also ist ein toter Zugang gefaehrlicher als
  # ein stiller Stillstand. Der Aufseher prueft deshalb EINMAL je Runde, ob die API
  # ueberhaupt antwortet, und laesst die Waechter sonst gar nicht erst los.
  if [ -s /tmp/cj_shop_token.txt ]; then
    _api=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 \
      -X POST "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json" \
      -H "X-Shopify-Access-Token: $(cat /tmp/cj_shop_token.txt)" \
      -H 'Content-Type: application/json' --data-binary '{"query":"{shop{id}}"}' 2>/dev/null)
  else
    _api=000
  fi
  if [ "$_api" != "200" ]; then
    # ⚠️ Nicht bei JEDER Runde melden: alle 2 Minuten dieselbe Zeile sind ueber Nacht ~700
    # Wiederholungen, und eine Meldung, die sich staendig wiederholt, liest niemand mehr
    # (Lehre 29.08.). Voll melden beim ERSTEN Mal und danach hoechstens alle 30 Minuten.
    _jetzt=$(date -u +%s); _letzt=$(cat /tmp/_api_tot_gemeldet 2>/dev/null || echo 0)
    case "$_letzt" in ''|*[!0-9]*) _letzt=0;; esac
    if [ $((_jetzt - _letzt)) -ge 1800 ]; then
      echo "$(date -u +%H:%M) ⛔ SHOPIFY ANTWORTET NICHT (HTTP $_api) — Waechter werden NICHT gestartet."
      echo "$(date -u +%H:%M)    Grund pruefen: Custom-App installiert? Token erneuerbar? Danach laeuft alles von selbst weiter."
      echo "$_jetzt" > /tmp/_api_tot_gemeldet
    fi
    [ -x "$REPO/automation/autocommit.sh" ] && bash "$REPO/automation/autocommit.sh" >/dev/null 2>&1
    sleep 120
    continue
  fi
  # Erholung ausdruecklich melden — sonst merkt niemand, dass es wieder laeuft.
  if [ -f /tmp/_api_tot_gemeldet ]; then
    echo "$(date -u +%H:%M) ✅ Shopify antwortet wieder — Waechter laufen weiter."
    rm -f /tmp/_api_tot_gemeldet
  fi

  # ── MOTOREN SELBST AM LEBEN HALTEN (29.08.2026) ─────────────────────────────────────
  # Bis heute hing die ganze Motorenschicht an der stuendlichen Routine: Nur SIE rief
  # engine_keepalive.sh auf. Antwortet die Session eine Weile nicht — Turn-Reaping,
  # Kontextende, ein haengender Aufruf — stehen CJ-Runner, Reel-Motor, Hygiene und
  # Auto-Committer, und niemand im Container merkt es. Der Aufseher lebt zwar weiter, aber
  # er startet nur seine eigenen Waechter, nicht die Motoren.
  # Jetzt ruft er sie alle 20 Minuten selbst nach. Damit ist die Schichtung vollstaendig:
  #   Stundenroutine  →  haelt den AUFSEHER      (ausserhalb des Containers, rewind-fest)
  #   Aufseher        →  haelt die MOTOREN       (hier)
  #   Motoren         →  halten ihre eigene Arbeit
  # ⚠️ OHNE_AUFSEHER=1 ist PFLICHT: Ohne den Schalter wuerde engine_keepalive den Aufseher
  # pruefen — und einen mit kaltem Herzschlag toeten. Der Aufseher schreibt aber genau
  # waehrend dieses Aufrufs keinen Herzschlag. Er wuerde sich selbst erschlagen.
  MOT=/tmp/_motoren_nachgezogen
  ALTER_MOT=$(( $(date +%s) - $(stat -c %Y "$MOT" 2>/dev/null || echo 0) ))
  if [ "$ALTER_MOT" -gt 1200 ] && [ -f "$REPO/automation/engine_keepalive.sh" ]; then
    date +%s > "$MOT"
    ( cd "$REPO" && OHNE_AUFSEHER=1 timeout 300 bash automation/engine_keepalive.sh \
        >> /tmp/engine_keepalive_vom_aufseher.log 2>&1 ) &
    echo "$(date -u +%H:%M) Motoren nachgezogen (durch den Aufseher)"
  fi

  for p in default_variant_fix textbild_fix bild_klein_fix cj_verfuegbarkeit cj_varianten_wache coll_live_check sku_dup_scan promo_aus_beschreibung gfeed_restore farbe_metafeld cj_versand_ch_guard seo_versandschwelle_fix versandschwelle_blog_kollektion google_sperrtags_durchsetzen helvetismen_tags unpublizierte_finden lagerstand_hygiene; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null && continue
    # ABKÜHLZEIT: Reiniger, die durchlaufen und fertig werden, dürfen nicht alle 2 Minuten
    # neu starten — sie würden den ganzen Katalog im Dauerlauf erneut abfragen und Shopify
    # grundlos drosseln. Erst wenn das Log COOLDOWN Sekunden alt ist, gibt es einen neuen Lauf.
    if [ -f /tmp/$p.log ]; then
      ALTER=$(( $(date +%s) - $(stat -c %Y /tmp/$p.log 2>/dev/null || echo 0) ))
      # ⚠️ 21.09.2026: 1800 s → 14400 s. Der Container startet ETWA STUENDLICH neu (gemessen
      # 07:10, 08:09, 09:08, 09:14 je «up 0 min»); mit 30 min Abkuehlzeit begann jeder dieser
      # Katalog-Scanner (sku_dup_scan sammelt alle 51'000, textbild_fix, farbe_metafeld …)
      # nach JEDEM Neustart von vorn und kam nie durch — bei 60-100 Punkten je Seite gegen
      # einen Eimer von 2'000. Es sind Tagesreiniger, keine Bestellwaechter: vier Stunden
      # Abstand kosten nichts und lassen den Eimer den uebrigen Waechtern.
      [ "$ALTER" -lt "${COOLDOWN:-14400}" ] && continue
    fi
    # GESTAFFELT STARTEN (11.08.2026): Werden alle dreizehn Reiniger in derselben Schleifen-
    # runde geweckt, scannen sie gemeinsam 29'000 Produkte und leeren Shopifys Abfragebudget
    # in Sekunden. Danach antwortet die API mit «Throttled» — und die Helfer deuten das, je
    # nach Bauart, als «keine Daten». Genau so wurde eben eine Auswertung mit «0 Produkte ab
    # CHF 300» beendet, obwohl es Hunderte sind. Zehn Sekunden Abstand kosten nichts und
    # halten das Budget flach. (Dieselbe Lehre wie beim gestaffelten CJ-Runner-Start.)
    # ⚠️ 21.09.2026 — SCHRANKE: hoechstens ZWEI Shopify-Waechter zugleich. Gemessen um 09:44:
    # drei laufende Reiniger hielten den Eimer bei 15/2000, und ein vierter starb trotz
    # gerechneter Wartezeit mit «12x gedrosselt (Eimer dauerhaft leer)». Geduld je Waechter
    # reicht nicht, wenn sich alle gleichzeitig den Nachlauf von 100 Punkten/s teilen — nur
    # eine Schranke von aussen (zwei flock-Plaetze, die anderen warten bis 15 min) laesst
    # jeden Lauf durchkommen. Der Platz wird per exec-Deskriptor an python vererbt und beim
    # Prozessende vom Kernel freigegeben. ⚠️ NICHT inline in den bash -c-String schreiben —
    # 10:11–16:20 stand sie dort und startete SECHS STUNDEN keinen Waechter (Quoting-Ebenen,
    # siehe Kopf von shopify_schranke.sh).
    SCHRANKE_NAME=reiniger_slot SCHRANKE_PLAETZE=1 setsid bash "$REPO/automation/shopify_schranke.sh" python3 /tmp/$p.py >> /tmp/$p.log 2>&1 9>&- & echo "$(date -u +%H:%M) restart $p"
    sleep 10
  done
  # Bestell-/Fulfill-Runner (Shell) mitlaufen lassen
  # 01.09.: REPO-Fassung starten, nicht /tmp — ein /tmp-Wipe hat den Bestell-Runner sonst
  # dauerhaft still gelegt («No such file or directory» im Log), und niemand merkte es.
  pgrep -f "cj_fulfill_runner.sh" >/dev/null || { setsid bash "$REPO/automation/cj_fulfill_runner.sh" >> /tmp/cj_fulfill_runner.log 2>&1 9>&- & echo "$(date -u +%H:%M) restart cj_fulfill_runner (Repo-Fassung)"; }
  # Website-Hygiene (Lieferanten-Leaks aus Kundentexten) mitlaufen lassen
  [ -f /tmp/website_hygiene_runner.sh ] && { pgrep -f "/tmp/website_hygiene_runner.sh" >/dev/null || { setsid bash /tmp/website_hygiene_runner.sh >> /tmp/website_hygiene_runner.log 2>&1 9>&- & echo "$(date -u +%H:%M) restart website_hygiene"; }; }
  # Social-Autopilot + Reel-Motor: liegen jetzt IM REPO (nicht mehr nur /tmp), überleben also
  # den nächsten Wipe. Beide haben eine eigene flock-Sperre, ein Doppelstart ist folgenlos.
  # ⛔ STOPP-RIEGEL. Der Betreiber hat am 13.08.2026 angeordnet, dass auf Instagram nichts
  # mehr doppelt erscheint. Solange dropship/_SOCIAL_STOPP existiert, werden die Poster gar
  # nicht erst gestartet. Das ist die einzige Wache, die nicht davon abhängt, dass eine
  # andere Wache richtig arbeitet — die fünf bestehenden (Lock, Claim, Inhalts-Sperre,
  # Live-IG-Abgleich, gemeinsamer Lock) haben offensichtlich nicht gereicht.
  for S in social_autopilot reel_engine_runner; do
    [ -f "$REPO/dropship/_SOCIAL_STOPP" ] && continue
    fehlt "$REPO/automation/$S.sh" && continue
    pgrep -f "automation/$S.sh" >/dev/null || { setsid bash "$REPO/automation/$S.sh" >> /tmp/$S.log 2>&1 9>&- & echo "$(date -u +%H:%M) restart $S"; }
  done
  # LANGE KATALOG-LÄUFE aus dem Repo am Leben halten. Sie brauchen Stunden für 30'000
  # Produkte und werden vom Turn-Reaping zuverlässig gekillt — heute zweimal mitten im Lauf.
  # Alle drei sind resumable (eigenes Ledger je Skript), ein Neustart setzt also fort statt
  # von vorn zu beginnen. Die Sperre verhindert, dass zwei Kopien dasselbe Ledger schreiben.
  # ⚠️ Ohne `setsid` sterben sie mit dem Turn — genau daran sind sie heute gescheitert.
  # ⚠️ 22.08.2026 — ohne_lieferantenref_guard AUFGENOMMEN. Er stand in KEINER Startliste
  # (dieselbe Lücke wie beim Aufseher selbst, Lehre 19.08.: «wer startet DICH neu?»).
  # Folge: acht Altprodukte aus den ersten Sessions standen weiter ACTIVE und verkäuflich —
  # WALLET-BLK, WATCH-001, JADE-SET-001, LED-001, BAND-001, SUNGLASS-BLK, BABY-BIB-001,
  # PROJ-PANDA-001 — alle mit frei getippter SKU, hinter der KEIN Lieferant steht, alle auf
  # `CONTINUE` mit erfundenem Bestand (35 bis 100 Stück). Genau das Muster von Bestellung
  # #1008: bezahlt, nie lieferbar. Der Wächter erkennt sie längst (er prüft seit dem 20.08.
  # die FORM der SKU, nicht das Präfix) — er lief nur nie.
  # OPTIONS-EXPORT: Eingabe fuer drei Variantenwert-Waechter (farbwert_dubletten,
  # mass_im_farbwert, groesse_im_farbwert). Er wurde am 23.08. von Hand gebaut, der
  # /tmp-Wipe hat ihn geloescht — und alle drei meldeten fuenf Tage PAUSE, ohne dass es
  # auffiel. Ein Werkzeug, dessen Eingabe niemand herstellt, ist ein Einmal-Lauf, kein
  # Waechter. Der Export ist fortsetzbar (Container-Neustart) und laeuft unter Sperre.
  # ⚠️ 21.09.2026: Hier stand nur `[ ! -f /tmp/opts_frisch.jsonl ]` — der Export wurde
  # gebaut, wenn die Datei FEHLTE, und danach nie wieder: gemessen war sie vom 04.09.,
  # 17 Tage alt, und drei Waechter (umlaut_suchtags, farbwert_dubletten, mass_im_farbwert)
  # lasen sie als «frisch». Jetzt zusaetzlich: aelter als 7 Tage → neu bauen (der Exporter
  # schreibt nach .teil und ersetzt atomar, die alte Datei bleibt bis dahin gueltig).
  OPTS_ALTER=$(( $(date +%s) - $(stat -c %Y /tmp/opts_frisch.jsonl 2>/dev/null || echo 0) ))
  if [ -f "$REPO/automation/optionen_export.py" ] && { [ ! -f /tmp/opts_frisch.jsonl ] || [ "$OPTS_ALTER" -gt 604800 ]; }; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2 ~ /optionen_export\.py$/ {n++} END {exit(n?0:1)}'; then
      ( cd "$REPO" && setsid flock -n /tmp/lock_optionen_export.lock \
          python3 automation/optionen_export.py >> /tmp/optionen_export.log 2>&1 9>&- & )
      echo "$(date -u +%H:%M) optionen_export gestartet/fortgesetzt"
    fi
  fi
  # 28.09.2026: preisboden + farbwerte_zusammengesetzt lesen /tmp/export.jsonl (status, priceRangeV2) — nach einem Ad-hoc-
  # Export im falschen Format (Tag-Export vom 27.09. 20:08) starben beide je Lauf an KeyError 'status', bis zu 24 h lang,
  # weil hype_export_bauen nur einmal täglich im Hype-Lauf prüft. Deshalb hier: Format falsch → sofort neu bauen (unter Sperre).
  if [ -f "$REPO/automation/hype_export_bauen.py" ] && ! ( cd "$REPO" && python3 -c "import sys;sys.path.insert(0,'automation');import hype_export_bauen as h;sys.exit(0 if h.format_ok('/tmp/export.jsonl') else 1)" 2>/dev/null ); then
    ( cd "$REPO" && flock -n /tmp/lock_hype_export.lock python3 automation/hype_export_bauen.py >> /tmp/hype_export_bauen.log 2>&1 )
    echo "$(date -u +%H:%M) export.jsonl im falschen Format → neu gebaut"
  fi
  for L in preisboden farbwerte_zusammengesetzt suchwort_tags suchwort_mehrzahl google_identifier hauptbild_ohne_text umlaut_suchtags ss_statt_scharf_s bigbuy_abschied google_ads_kuration versand_jenachland lieferblock_doppelt fremdzeichen_guard handle_messversprechen tote_kollektionslinks variant_value_clean menue_links ohne_lieferantenref_guard pod_druckdatei groesse_im_farbwert farbwert_dubletten mass_im_farbwert quittungs_wache heilversprechen_wache liechtenstein_raus produkttexte_du_form verlustbringer social_queue_saeubern jury_nachbessern bild_queue_captions_ehrlich google_feedback_wache bild_mini_entfernen kategorie_wache bild_heilversprechen styling_floskel_wache heilversprechen_seo_wache koll_seo_laengen beleuchtung_tags_fix kollektion_accessoires_fix ig_gepostet_tags herbst_kuratieren google_titel_reparatur bild_werbetext_rueckholer kollektion_doppel preis_verlustschutz fortura_ek_nachtragen kinder_sicherheit fuellmenge_nachtragen nachfrage_liebling social_saison_vorrang gfeed_anstupsen google_kategorie_fein schmuck_tag_heilen saison_tags_nachtragen; do
    fehlt "$REPO/automation/$L.py" && continue
    # ⚠️ FERTIG IST KEIN AUSSCHALTER (04.09.2026). Bis heute hiess «FERTIG im Log» =
    # nie wieder starten — nur ein /tmp-Wipe hat die Waechter je wieder geweckt. Gemessen:
    # NEUN von ihnen ruhten seit dem 30./31.08., darunter `google_kanal_luecke` (der einzige
    # Kanal mit Verkaeufen), `ohne_lieferantenref_guard` (die #1008-Klasse) und
    # `handle_messversprechen` — waehrend der Grind taeglich hunderte Produkte anlegte.
    # FERTIG heisst «zu DIESEM Zeitpunkt nichts zu tun», nicht «fuer immer erledigt».
    # Es gilt deshalb nur noch 20 Stunden; danach ist der Waechter wieder faellig.
    # ⚠️ 23.09.2026 (Verbesserungs-Audit): Hier stand `grep -q "^FERTIG"` über das GANZE kumulative Log. Ein Lauf,
    # der abbrach (ohne Schlusszeile), blieb dann bis zu 20 h gesperrt, weil irgendein FERTIG von vorgestern im Log
    # stand — gemessen: versand_jenachland 894 von 994 offen, ohne_lieferantenref_guard ab Produkt 20'000 ungeprüft.
    # Massgeblich ist nur, womit der LETZTE Lauf endete.
    # ZOMBIE-NACHLAUF: Der Lieferblock «je nach Land … USA» kommt täglich um ~04:07 UTC zurück (Schreiber unbenannt,
    # Journal Nachtrag 38). versand_jenachland läuft deshalb zusätzlich einmal täglich nach 04:25 UTC, egal ob FERTIG.
    ZN=0
    if [ "$L" = versand_jenachland ]; then
      HM=$(date -u +%H%M); ZS=$(cat /tmp/_start_versand_jenachland 2>/dev/null || echo 0)
      [ "$HM" -ge 425 ] 2>/dev/null && [ "$HM" -lt 700 ] 2>/dev/null && [ "$ZS" -lt "$(date -u -d 'today 04:25' +%s)" ] && ZN=1
    fi
    # ⚠️ 29.09.2026: `tail -n 3` sah das FERTIG des VORTAGS über der einen Zeile eines Laufs, der beim Container-Neustart
    # starb (preis_verlustschutz 29.09. 04:09: «Kandidaten: 2788 …», keine Schlusszeile → 16 h «erledigt», 63 Verlustartikel
    # blieben kaufbar). Jeder Start schreibt jetzt «START … (Aufseher)» ins Log; gewertet wird nur, was DANACH kam.
    # Logs ohne Marke (vor dem ersten neuen Start) behalten das alte Verhalten.
    if [ "$ZN" = 0 ] && letzter_lauf "/tmp/$L.log" | tail -n 3 | grep -qE "^([0-9:]{8} |[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,12}Z )?FERTIG"; then
      F_ALTER=$(( $(date +%s) - $(stat -c %Y "/tmp/$L.log" 2>/dev/null || echo 0) ))
      [ "$F_ALTER" -lt 72000 ] && continue
    fi
    pause_kuehlt "$L" && continue                                # hat sich mit PAUSE verabschiedet
    dreht_sich_im_kreis "$L" && continue                         # endet immer sofort ohne FERTIG
    # ⚠️ NICHT `pgrep -f`. Steht das Suchmuster in der eigenen Kommandozeile, findet pgrep
    # sich selbst und meldet «läuft» für einen toten Lauf — heute stand `suchwort_tags` so
    # eine Viertelstunde still, während jede Prüfung Vollzug meldete. Verglichen werden
    # deshalb die ARGUMENTE: erstes Feld python3, zweites der Skriptpfad.
    ps -eo args --no-headers | awk -v s="automation/$L.py" \
      '$1 ~ /python3$/ && $2 == s {n++} END {exit(n?0:1)}' && continue
    # ⚠️ DIE BILDPRÜFUNG BRAUCHT FRISCHE DATEN. Ihr Vorgabe-Export ist der Schnappschuss
    # vom 12.08.; die 5'481 seither importierten Produkte kämen darin gar nicht vor und
    # blieben für immer ungeprüft — genau die, die Google jetzt als «Promotional overlay on
    # image» meldet. /tmp/ocr_export_keep.jsonl wird aus einem Bulk-Export gebaut.
    EXP=""; [ "$L" = hauptbild_ohne_text ] && [ -f /tmp/ocr_export_keep.jsonl ] \
      && EXP="EXPORT=/tmp/ocr_export_keep.jsonl"
    [ "$L" = umlaut_suchtags ] && [ -f /tmp/opts_keep.jsonl ] && EXP="QUELLE=/tmp/opts_keep.jsonl"
    # versand_jenachland sucht seine Kandidaten seit dem 05.09.2026 SELBST. Die Phrase war
    # bis zum 08.09. «USA: 12-22 Tage» — mit BINDESTRICH, waehrend der Text einen
    # Halbgeviertstrich und ein <strong> zwischen «USA:» und der Zahl traegt; sie fand 463
    # von 996 Produkten und der Lauf meldete FERTIG. Jetzt «je nach Land» (996, mit einem
    # Unsinnswort gegengeprueft: 0).
    # ⚠️ 08.09.2026: Hier stand «gibt es /tmp/versand_quelle.jsonl noch, wird sie bevorzugt».
    # Genau das ist die Falle, gegen die der Absatz darueber geschrieben wurde: eine Export-Datei
    # in /tmp altert und meldet Vollzug ueber eine Vergangenheit. Es gilt ausnahmslos live.
    # Dazu CAP hoch: die Klasse ist am 08.09. mit 996 gemessen worden, der Standard-CAP haette
    # sie in Tagesscheiben zerlegt.
    if [ "$L" = versand_jenachland ]; then EXP="QUELLE=live CAP=1200"; fi
    # fuellmenge_nachtragen (25.09.2026): schreibt NUR ml+oz-bestätigte Werte und dropship/_fuellmenge_gesichtet.json;
    # nimmt die Text-Sperre selbst (LOCK_NB) — deshalb nicht in der TXTLOCK-Liste.
    [ "$L" = fuellmenge_nachtragen ] && EXP="WRITE=1"
    # liechtenstein_raus (22.09.2026, Weg B): Seiten + Rechtstexte jeden Lauf (Wache gegen Rueckkehr der
    # Phrase), Produkte in Tagesscheiben; steht VOR produkttexte_du_form, damit es nach einem Neustart den
    # Text-Lock zuerst bekommt — der Du-Form-Lauf haelt ihn sonst die ganze Stunde.
    if [ "$L" = liechtenstein_raus ]; then EXP="CAP=1500"; fi
    # 23.09. abends: google_titel_reparatur ist ohne SCHARF=1 ein Trockenlauf (schreibt nichts, meldet nur) — als
    # Tageswächter braucht er den Schalter; die Text-Sperre holt er sich selbst je Produkt (kurze Wartezeit statt Nie).
    if [ "$L" = google_titel_reparatur ]; then EXP="SCHARF=1 TEXT_WARTE=30 TEXT_WARTE_NACH=10"; fi
    # 23.09. 23:50: kollektion_doppel — zwei Kollektionen mit EINER Regel (13 Paare gemessen, z. B. halloween/halloween-2026,
    # puma/marke-puma): Bleiberin nach Menue > Startseite > Rotation > Kanaele > Text, die andere abgemeldet + 301,
    # Ledger dropship/_kollektion_doppel.txt. Standard ist Trockenlauf — als Tageswaechter scharf.
    if [ "$L" = kollektion_doppel ]; then EXP="SCHARF=1"; fi
    # verlustbringer (23.09.2026, Gegenpruefung 22.09.): draftet Ware, bei der JEDE Variante auch mit CHF 7
    # Versanderloes verliert (Kinder-Autositz 14.90/EK 25.07 und Maskenset 16.90/EK 49.32 standen in 6 Kanaelen).
    # Standard des Skripts ist Trockenlauf — scharf NUR ueber SCHARF=1. Liest /tmp/kost28.jsonl der Kosten-Kette
    # (weiter unten, taeglich); ohne die Datei gar nicht starten, aelter als 3 Tage meldet das Skript selbst PAUSE.
    # «heben» (Preis) wird nur gemeldet (Preisschreiber-Absprache offen). Live lesen vor, ruecklesen nach jeder
    # Mutation; Tags verlust-auto-draft + marge-verlust-draft (letzteren kennen die Rueckholer). Kein FERTIG,
    # solange «raus» offen ist → die Schleife setzt beim naechsten Tick fort (CAP 300 je Lauf, ~1'315 offen).
    if [ "$L" = bild_queue_captions_ehrlich ] || [ "$L" = kategorie_wache ] || [ "$L" = bild_heilversprechen ]; then EXP="SCHARF=1"; fi
    # 02.10.2026: Saison-Tags (halloween) für Neuware ohne Tag — nur hinzufügen, Standard trocken → hier scharf.
    [ "$L" = saison_tags_nachtragen ] && EXP="SCHARF=1"
    # 23.09.: herbst_kuratieren nur RAEUMEN (Sperr-Tags raus, nach 30.11. Tag weg) — Neuaufnahmen nur in betreuten Laeufen.
    [ "$L" = herbst_kuratieren ] && EXP="NUR_RAEUMEN=1"
    if [ "$L" = verlustbringer ]; then [ -f /tmp/kost28.jsonl ] || continue; EXP="SCHARF=1 CAP=300 EXPORT=/tmp/kost28.jsonl"; fi
    # 24.09.2026 Betreiber «ändere preise so das ich nie verlust mache» → Entscheid «Codes bleiben, Preise decken 25 %»:
    # jeder Preis muss den grössten Code (25 %) plus Gratisversand tragen. Nur heben; Faktor > 2 → Variante DENY statt
    # absurdem Preis. Fortsetzbar über das Ledger, FERTIG erst wenn alle Kandidaten durch sind (dann Tageslauf).
    if [ "$L" = preis_verlustschutz ]; then [ -f /tmp/kost28.jsonl ] || continue; EXP="SCHARF=1 EXPORT=/tmp/kost28.jsonl"; fi
    # 24.09.2026: Fortura-EK aus dem Feed (VP1 × VE + DPD, × 1.081) — ohne EK schützt preis_verlustschutz nichts.
    # Feed: fortura_bestand_taeglich.sh legt /tmp/fortura_feed_neu.csv täglich ab. Nur Varianten OHNE EK.
    if [ "$L" = fortura_ek_nachtragen ]; then { [ -f /tmp/fortura_feed_neu.csv ] && [ -f /tmp/kost28.jsonl ]; } || continue; EXP="SCHARF=1"; fi
    # ⚠️ 08.09.2026: Hier stand «ohne /tmp/versand_quelle.jsonl gar nicht erst starten».
    # Diese Datei stellt kein Werkzeug mehr her — der Waechter wurde deshalb bei JEDEM Lauf
    # uebersprungen, im ganzen Container gab es nicht einmal ein Log. Er liest jetzt die
    # Arbeitsliste des taeglichen Klassen-Vollscans (ein Scan, viele Arbeitslisten).
    if [ "$L" = fremdzeichen_guard ]; then
      KL="$REPO/dropship/_klassen/fern-stliche-zeichen-im-produkttext.txt"
      [ -s "$KL" ] || continue          # keine Klasse gemessen = nichts zu tun
      EXP="LISTE=$KL"
    fi
    # groesse_im_farbwert liest seine Kandidaten aus einem Bulk-Export. Ohne die Datei
    # meldet es PAUSE statt ins Leere zu laufen — hier gar nicht erst starten.
    [ "$L" = groesse_im_farbwert ] && [ ! -f /tmp/groesse_im_farbwert.json ] && continue
    # farbwert_dubletten braucht einen Options-Export; ohne ihn meldet es PAUSE.
    if [ "$L" = farbwert_dubletten ] || [ "$L" = mass_im_farbwert ]; then
      [ -f /tmp/opts_frisch.jsonl ] || continue
      EXP="QUELLE=/tmp/opts_frisch.jsonl"
    fi
    # ⚠️ 08.09.2026: Hier nahm JEDER Waechter nur sein EIGENES Schloss (`lock_$L.lock`).
    # Das verhindert den Doppelstart DESSELBEN Werkzeugs — nicht aber, dass zwei
    # VERSCHIEDENE Massen-Schreiber gleichzeitig auf `descriptionHtml` gehen. Genau das
    # ist heute passiert: der Aufseher-Lauf von `versand_jenachland` und ein Handstart
    # unter dem geteilten Schloss liefen 10 Minuten nebeneinander (236 Doppelquittungen
    # im Ledger). Folgenlos, weil beide dasselbe schreiben — aber es ist die Zombie-Klasse
    # vom 15.08., und beim naechsten Paar waere es ein Ueberschreiben.
    # Vier Werkzeuge dieser Liste schreiben Produkttext (gemessen, nicht vermutet):
    # produktdetails_vereinen · versand_jenachland · ss_statt_scharf_s · fremdzeichen_guard.
    # Sie nehmen zusaetzlich das GETEILTE Schloss — mit `-w`, damit ein kurz belegtes
    # Schloss keinen Lauf verschluckt, aber nicht laenger als der Container lebt.
    # Regel seit 03.09.: EIN Lock, EIN Ledger — nie ein eigener Lockfile je Werkzeug.
    # ⚠️ produktdetails_vereinen steht hier NICHT mehr: es hat weiter unten einen eigenen
    # Startblock mit LISTE= (Arbeitsliste des Klassen-Scans). In dieser Schleife lief es
    # OHNE LISTE, las den Export vom 30.08. und meldete «0 doppelte Bloecke» — und sein
    # laufender Prozess liess den richtigen Lauf per ps-Pruefung aussetzen (08.09.2026).
    # ⚠️ produkttexte_du_form steht NICHT in dieser Liste: das Skript nimmt den Text-Lock SELBST (flock LOCK_EX).
    # Mit TXTLOCK erbte es fd 8 samt gehaltenem Lock und wartete dann auf sich selbst (22.09.2026: 52 Min
    # locks_lock_inode_wait, 0 Zeilen im Ledger — jeder automatische Start seit dem 21.09. stand so).
    # ⚠️ 23.09.2026 DEADLOCK: hier stand «$TXTLOCK … exec shopify_schranke» — erst Text-Sperre, dann Platz. Mit
    # produkttexte_du_form (haelt einen Platz, nimmt die Text-Sperre je Produkt) war das ein Kreis: liechtenstein_raus
    # hielt fd 8 und wartete auf einen Platz, du_form hielt den Platz und wartete auf fd 8; sechs Tages-Waechter
    # standen bis zu 3 h dahinter. Jetzt IMMER erst Platz (Schranke), dann Text-Sperre (mit_textsperre.sh, 240 s Frist).
    case " versand_jenachland lieferblock_doppelt ss_statt_scharf_s fremdzeichen_guard heilversprechen_wache liechtenstein_raus " in
      *" $L "*) TXTLOCK="bash automation/mit_textsperre.sh" ;;
      *)        TXTLOCK="" ;;
    esac
    # Massen-Schreiber (Stunden je Lauf) in eine EIGENE Spur mit 1 Platz — auf der Tages-Spur belegten
    # produkttexte_du_form und variant_value_clean am 23.09. beide Plaetze ueber Stunden.
    SPUR=""
    case " produkttexte_du_form variant_value_clean kategorie_wache preis_verlustschutz " in
      *" $L "*) SPUR="SCHRANKE_NAME=massen_slot SCHRANKE_PLAETZE=1" ;;
    esac
    # 24.09.2026: Sechs Tageswächter sind nach EINEM sauberen Durchgang fertig, schreiben aber keine FERTIG-Zeile — das Tor
    # oben hielt sie deshalb für unfertig und startete sie bei JEDEM Tick neu (Log-Enden identisch dreifach, OCR stündlich).
    # Für diese Liste setzt der Aufseher die Zeile nach Exit 0 selbst. NICHT für Wächter, die FERTIG bewusst weglassen,
    # solange Arbeit offen ist (verlustbringer, versand_jenachland …) — die bleiben ausserhalb der Liste.
    NACH=""
    case " social_queue_saeubern bild_queue_captions_ehrlich ig_gepostet_tags suchwort_mehrzahl herbst_kuratieren koll_seo_laengen " in
      *" $L "*) NACH=1 ;;
    esac
    date +%s > "/tmp/_start_$L"
    if [ -n "$NACH" ]; then
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_$L.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; $EXP $SPUR bash automation/shopify_schranke.sh $TXTLOCK python3 automation/$L.py && echo \"FERTIG \$(date -u +%FT%TZ) (Tageslauf sauber beendet, Aufseher)\"" \
          >> "/tmp/$L.log" 2>&1 9>&- 8>&- & )
    else
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_$L.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; $EXP $SPUR exec bash automation/shopify_schranke.sh $TXTLOCK python3 automation/$L.py" \
        >> "/tmp/$L.log" 2>&1 9>&- 8>&- & )
    fi
    echo "$(date -u +%H:%M) restart $L"
    sleep 5
  done
  # Dasselbe für die langen NODE-Läufe. Eigener Block, weil der Prozesstest auf das erste
  # argv-Feld schaut und dort `node` statt `python3` steht — ein gemeinsamer Test hätte den
  # Lauf für tot gehalten und ihn im Zwei-Minuten-Takt ein zweites Mal gestartet.
  # ⚠️ 23.08.2026 — DAS VORRANG-FENSTER GALT NUR FUER DEN GRIND. `engine_keepalive.sh`
  # stoppt zwischen 16:00 und 17:30 UTC die vier Grind-Runner, damit der Kosten-Backfill
  # CJs Punkte bekommt — aber die uebrigen CJ-Verbraucher liefen weiter. Gemessen im
  # Fenster: der Punkte-Eimer fiel in 25 Sekunden von 447 auf 287, obwohl kein Runner
  # lief. `cj_variantenbild` und `cj_bild_backfill` sind nicht dringend und warten.
  # NICHT pausiert wird `cj_fulfill_runner` — der bearbeitet echte Kundenbestellungen.
  VSTD=$(date -u +%H); VMIN=$(date -u +%M | sed 's/^0//')
  VORRANGZEIT=0
  # 06.10.2026: Fenster aus cj_vorrang_fenster.sh (Reset gemessen 00:00 UTC; um 16:00 war der Topf jeden Tag leer).
  source "$REPO/automation/cj_vorrang_fenster.sh"
  if cj_vorrang_zeit; then VORRANGZEIT=1; fi
  for N in cj_bild_backfill cj_variantenbild cj_kosten_backfill schulstart_import alt_text_backfill frosch_maske_import; do
    if [ "$VORRANGZEIT" = "1" ] && [ "$N" != "cj_kosten_backfill" ]; then
      # 01.10.2026 (Grow, «fülle bilder»): cj_bild_backfill darf ins Fenster — ausserhalb verbraucht der Grind das CJ-Tageslimit
      # bis zum Abend (gemessen: Eimer leer ab ~18:40, Lauf kam seit Stunden nicht über 14 Produkte). Nur cj_variantenbild wartet.
      case "$N" in cj_variantenbild) continue ;; esac
    fi
    fehlt "$REPO/automation/$N.mjs" && continue
    # ⚠️ 22.09.2026: «FERTIG» hielt cj_bild_backfill seit 30.08. fest (es hatte «0 Kandidaten»
    # gemeldet, weil der Export keine SKUs mehr traegt) — waehrend 831 CJ-Produkte mit EINEM
    # Bild dastanden. Fuer Backfills gilt dieselbe 20-h-Regel wie in der Python-Schleife;
    # nur die Einmal-Importe (schulstart, frosch_maske) bleiben nach FERTIG aus.
    case "$N" in
      schulstart_import|frosch_maske_import) grep -q "^FERTIG" "/tmp/$N.log" 2>/dev/null && continue ;;
      *) if letzter_lauf "/tmp/$N.log" | tail -n 3 | grep -qE "^([0-9:]{8} |[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,12}Z )?FERTIG" && [ $(( $(date +%s) - $(stat -c %Y "/tmp/$N.log" 2>/dev/null || echo 0) )) -lt 72000 ]; then continue; fi ;;
    esac
    pause_kuehlt "$N" && continue
    dreht_sich_im_kreis "$N" && continue
    ps -eo args --no-headers | awk -v s="automation/$N.mjs" \
      '$1 ~ /node$/ && $2 == s {n++} END {exit(n?0:1)}' && continue
    date +%s > "/tmp/_start_$N"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_$N.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; CAP=900 exec /opt/node22/bin/node automation/$N.mjs" \
        >> "/tmp/$N.log" 2>&1 9>&- & )
    echo "$(date -u +%H:%M) restart $N"
    sleep 5
  done
  # 🎒 SCHULSTART-IMPORT (Betreiber 15.08.2026). Läuft, bis die zwei recherchierten
  # Rucksäcke importiert sind — der Wrapper drosselt sich selbst auf einen Versuch je 30 Min
  # und meldet SCHULSTART FERTIG, sobald das Ledger beide trägt.
  if ! grep -q "^SCHULSTART FERTIG" /tmp/schulstart_lauf.log 2>/dev/null; then
    ps -eo args --no-headers | grep -v grep | grep -q "automation/schulstart_lauf.sh" ||       ( cd "$REPO" && setsid bash -c           "exec 9>/tmp/lock_schulstart.lock; flock -n 9 || exit 0; exec bash automation/schulstart_lauf.sh"           >> /tmp/schulstart_lauf.log 2>&1 9>&- & )
  fi
  # 🧵 POD-EDITOR-QA (22.09.2026): `pod_editor_qa.mjs` stand in KEINER Startliste und hatte kein
  # Log — Regel 4 verlangt 0 Befunde nach jeder POD-Aenderung. Einmal am Tag, 30 Editor-Produkte,
  # ~20 s. Bei Befunden steht die Zeile im Log UND hier im Aufseher-Log (engine_keepalive greift ⚠️).
  if [ ! -f /tmp/pod_qa_$(date -u +%F) ] && [ -f "$REPO/automation/pod_editor_qa.mjs" ]; then
    touch "/tmp/pod_qa_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_pod_editor_qa.lock; flock -n 9 || exit 0; /opt/node22/bin/node automation/pod_editor_qa.mjs; rc=\$?; [ \$rc -ne 0 ] && echo \"\$(date -u +%H:%M) ⚠️ POD-EDITOR-QA: Befunde (exit \$rc) — siehe /tmp/pod_editor_qa.log\"; exit 0" \
        >> /tmp/pod_editor_qa.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start pod_editor_qa (täglich)"
  fi
  # 🔎 SOCIAL-QUALITAET (23.09.2026): Der Waechter las am 23.09. 143 FB-Beitraege und fand 120 Loeschfaelle — aber
  # er stand in keiner Startliste. Einmal am Tag, NUR LESEN (Bericht dropship/SOCIAL-QUALITAET.md); Loeschen bleibt
  # ein Betreiber-Ja je Runde (automation/fb_qualitaet_loeschen.mjs). Medien-Cache in /tmp, ~10 min.
  if [ ! -f /tmp/social_qualitaet_$(date -u +%F) ] && [ -f "$REPO/automation/social_qualitaet_wache.mjs" ]; then
    touch "/tmp/social_qualitaet_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_social_qualitaet.lock; flock -n 9 || exit 0; timeout 2400 /opt/node22/bin/node automation/social_qualitaet_wache.mjs | tail -3" \
        >> /tmp/social_qualitaet.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start social_qualitaet_wache (täglich, nur lesen)"
  fi
  # 📱 STARTSEITEN-OPTIK (30.09.2026, Betreiber-Screenshot «bild fehlt» + «solche und ähnliche fehler nicht mehr
  # passieren»): rendert luxestyle.ch in 390 px im echten Chromium und meldet Leerräume > 90 px in einer Sektion,
  # kaputte/leere/winzige Bilder und waagrechtes Scrollen. Nur lesen → dropship/STARTSEITE-OPTIK.md + Ampel «OPTIK».
  if [ ! -f /tmp/startseite_optik_$(date -u +%F) ] && [ -f "$REPO/automation/startseite_optik_wache.mjs" ]; then
    touch "/tmp/startseite_optik_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_startseite_optik.lock; flock -n 9 || exit 0; timeout 900 /opt/node22/bin/node automation/startseite_optik_wache.mjs" \
        >> /tmp/startseite_optik.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start startseite_optik_wache (täglich, nur lesen)"
  fi
  # 💾 SPEICHER-AUFRÄUMUNG (30.09.2026, Betreiber «Duplikat-Bilder löschen»): läuft ~75 min, der Container startet stündlich neu →
  # fortsetzen, bis im Log FERTIG steht (Nachweis-Liste dropship/_speicher_geloescht.tsv überspringt Erledigtes). Exporte in /tmp.
  if [ -s /tmp/speicher_drafts.jsonl ] && [ -s /tmp/speicher_aktiv.jsonl ] && ! tail -n 1 /tmp/speicher_duplikat.log 2>/dev/null | grep -q '^FERTIG'; then
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_speicher_duplikat.lock; flock -n 9 || exit 0; EXPORT_DRAFT=/tmp/speicher_drafts.jsonl EXPORT_AKTIV=/tmp/speicher_aktiv.jsonl SCHARF=1 N=6000 python3 automation/speicher_duplikat_bilder.py" \
        >> /tmp/speicher_duplikat.log 2>&1 9>&- & )
  fi
  # 🎬 TOR-REPARATUR (30.09.2026): vom Meisterwerk-Tor gesperrte Reels (HOOK < 3,0, fester Einstieg 2 s) mit der
  # bewegtesten Sekunde neu schneiden (reel_neu_rendern.py MODUS=hook, Tor Pflicht → wieder ready); fehlende Quellen fragt
  # tor_quellen_anfragen.mjs beim Server an (Merkliste 24 h). Ergebnis-Dateien + Queue sichert git_sichern.sh.
  if [ ! -f /tmp/reel_tor_reparatur_$(date -u +%F) ] && [ -f "$REPO/automation/reel/reel_neu_rendern.py" ]; then
    touch "/tmp/reel_tor_reparatur_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_reel_tor_reparatur.lock; flock -n 9 || exit 0; echo START \$(date -u +%FT%H:%MZ); \
         MODUS=hook SCHARF=1 timeout 3000 python3 automation/reel/reel_neu_rendern.py | grep -E 'ERSETZT|DURCHGEFALLEN|FERTIG'; \
         MODUS=preis SCHARF=1 timeout 3000 python3 automation/reel/reel_neu_rendern.py | grep -E 'ERSETZT|DURCHGEFALLEN|FERTIG'; \
         SCHARF=1 timeout 900 /opt/node22/bin/node automation/reel/tor_quellen_anfragen.mjs | grep -E '📮|FERTIG'; \
         bash automation/git_sichern.sh 'Reel-Tor-Reparatur: neu geschnitten + Quellen angefragt [skip ci]' social/reels automation/reels_seed.csv auftraege/offen" \
        >> /tmp/reel_tor_reparatur.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start reel_tor_reparatur (täglich)"
  fi
  # 🏷️ REEL-PREIS-REPARATUR alle 3 h (02.10.2026): nach der Preissenkung (350'008 Varianten, −11 %) sperrte der Säuberer
  # 12 von 18 wartenden Reels als preis-veraltet — die Tages-Reparatur oben war schon gelaufen, die Queue wäre bis morgen
  # leergelaufen. Läuft nur, wenn preis-veraltet-skip-Zeilen warten; Quelle: Server-Download oder Shopify-Produktvideo.
  RPR=/tmp/reel_preis_reparatur.log
  if [ -f "$REPO/automation/reel/reel_neu_rendern.py" ] && grep -q ',preis-veraltet-skip,' "$REPO/automation/reels_seed.csv" 2>/dev/null; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$RPR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 10800 ]; then
      touch "$RPR"
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_reel_tor_reparatur.lock; flock -n 9 || exit 0; echo START \$(date -u +%FT%H:%MZ); \
           MODUS=preis SCHARF=1 timeout 3000 python3 automation/reel/reel_neu_rendern.py | grep -E 'ERSETZT|DURCHGEFALLEN|FERTIG'; \
           bash automation/git_sichern.sh 'Reel-Preis-Reparatur [skip ci]' social/reels automation/reels_seed.csv" \
          >> "$RPR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) start reel_preis_reparatur (3 h, wartende preis-veraltete Reels)"
    fi
  fi
  # ✎ FB-CAPTION-KORREKTUR (23.09.2026, Betreiber «bearbeite selber wens nicht stimmt wie zb versandkosten»): feste
  # Ersetzungstabelle (Blitzversand/«in 1–2 Tagen»/CHF 65/Lockpreis), 45 s Takt, Abbruch beim ersten Meta-Sperrhinweis.
  # Erstlauf 23.09.: 7 von 25, dann Spam-Sperre nach 120 Löschungen — der tägliche Lauf macht dort weiter.
  if [ ! -f /tmp/fb_caption_$(date -u +%F) ] && [ -f "$REPO/automation/fb_caption_korrektur.mjs" ] && [ -s /tmp/meta_page_token ]; then
    touch "/tmp/fb_caption_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_fb_caption.lock; flock -n 9 || exit 0; SCHARF=1 timeout 3000 /opt/node22/bin/node automation/fb_caption_korrektur.mjs | grep -E '✅|✗|⛔|FERTIG'" \
        >> /tmp/fb_caption_korrektur.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start fb_caption_korrektur (täglich)"
  fi
  # 🗑️ IG AUFRÄUMEN (Betreiber 25.09.2026: «lösche die post die nicht passen automatisch»). Gründe TEXT (Lieferantentext
  # im Lieferantenbild, ≥ 5 Wörter), PRODUKT (nicht mehr kaufbar, nur sicher zugeordnet), DOPPEL (behält den besten);
  # der FB-Zwilling (gleicher Textanfang, ≤ 3 h, genau einer) geht mit.
  # Schutz: > 500 Aufrufe nie, < 6 h nie, 5 je Tag, 45 s Takt, Abbruch beim ersten Meta-Sperrhinweis. Ledger _ig_geloescht.txt.
  if [ ! -f /tmp/ig_aufraeumen_$(date -u +%F) ] && [ -f "$REPO/automation/ig_aufraeumen.mjs" ] && [ -s /tmp/meta_page_token ]; then
    touch "/tmp/ig_aufraeumen_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_ig_aufraeumen.lock; flock -n 9 || exit 0; SCHARF=1 timeout 3000 /opt/node22/bin/node automation/ig_aufraeumen.mjs" \
        >> /tmp/ig_aufraeumen.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start ig_aufraeumen (täglich, max 5)"
  fi
  # 🎬 LOKALE CJ-VIDEOS ANHÄNGEN (02.10.2026, Betreiber «grow videos push»): rohe CJ-Videos, die der Server für den Reel-Motor
  # schon geholt hat, gehören an ihre Produktseite — ohne CJ-Aufruf, also jederzeit (nicht nur im Vorrang-Fenster). Stündlich,
  # solange offen; Ledger = das des Nachtrags; neue Server-Downloads kommen über video_prio_index.py dazu. Grow-Deckel 1'000.
  VLA=/tmp/video_lokal_anhaengen.log
  if [ -f "$REPO/automation/video_lokal_anhaengen.mjs" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$VLA" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 3000 ] || absturz_nachholen "$VLA"; then
      touch "$VLA"
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_video_lokal.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\";
          python3 automation/video_prio_index.py; SCHARF=1 PAARE=dropship/_video_lokal_paare.json exec timeout 3300 /opt/node22/bin/node automation/video_lokal_anhaengen.mjs" \
          >> "$VLA" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) start video_lokal_anhaengen (lokale CJ-Videos an Produktseiten)"
    fi
  fi
  # 🎬 LIEFERANTENVIDEOS NACHHOLEN — bewusst in kleinen Schlucken. Von 34'824 aktiven
  # Produkten zeigen nur 144 ein Video, und CJ hat für die allermeisten auch keines: von 15
  # geprüften Kandidaten kam bei allen 15 `productVideo: null` zurück. Ein Lauf über den
  # ganzen Katalog kostete darum ~31'000 CJ-Punkte für vielleicht hundert Videos und nähme
  # dem Grind das Tagesbudget weg (das am 14.08. um 19:19 Uhr bereits erschöpft war). 60
  # Anfragen pro Tag sind neben 100'000 nichts und sammeln über die Wochen ein, was da ist.
  # 01.10.2026 GROW: Deckel 1'000 statt 250 Videos (Shopify-Hilfe; Upload-Probe wieder offen). Gemessen: die Tagesläufe
  # starteten zu irgendeiner Stunde, wenn der Grind die CJ-Punkte längst verbraucht hatte (Logs enden nach «Kandidaten»,
  # 0 Videos) → Start nur noch IM VORRANG-FENSTER (16:00–17:30, Grind ruht) und 250 statt 60.
  # 06.10.2026: Fenster liegt jetzt DIREKT nach dem Punkte-Reset (gemessen 00:00 UTC, cj_vorrang_fenster.sh + cj_reset_wache.py) —
  # um 16:00 war der Topf jeden Tag leer (05.10. 16:14: sofort 16900500, 0 Videos).
  # 02.10.2026 «grow videos push»: 375 von 403 Prüfungen (93 %) fanden KEIN Video → Vorrangliste jetzt aus dem Video-Index
  # (`video_prio_index.py`: nur Produkte, deren CJ-pid laut product/list ein Video hat; sichtbare zuerst; 502 offen).
  # 07.10.2026 (Plan Tag 8): heute 00:15–00:22 17 Videos, dann Container-Neustart — der Tages-Stempel liess keinen zweiten
  # Start zu (Rest des Fensters verschenkt). START-Marke + still_gestorben → im selben Fenster bis 3× nachholen.
  if [ "$VORRANGZEIT" = "1" ] && { [ ! -f /tmp/videos_$(date -u +%F) ] || still_gestorben /tmp/cj_video_backfill.log; }; then
    touch "/tmp/videos_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_cj_video_backfill.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\";
         python3 automation/video_prio_index.py; PRIO=dropship/_video_prio_index.txt CAP=250 exec /opt/node22/bin/node automation/cj_video_backfill.mjs" \
        >> /tmp/cj_video_backfill.log 2>&1 9>&- & )
    # ⚠️ CAP 300 war sinnlos: der Plan deckelt bei 250 Videos FUER DEN GANZEN SHOP. Der
    # Lauf prueft den Deckel jetzt vorab und arbeitet PRIO zuerst ab — die Plaetze gehoeren
    # der Ware, die auf der Startseite steht, nicht der naechstbesten in Anlegereihenfolge.
    echo "$(date -u +%H:%M) start cj_video_backfill (PRIO sichtbare Ware, 250/Tag im Vorrang-Fenster — User 19.08.: «überall mit videos, mache auch bei uns»)"
  fi
  # HYPE-REIHE DER STARTSEITE, einmal täglich (Auftrag des Betreibers 12.08.2026: «wenn hype
  # vorbei produkt ändern»). Der Lauf nimmt abgelaufene Artikel aus der Reihe und füllt aus den
  # hinterlegten Themen nach — das ist der Teil, der ohne Zutun laufen muss, damit die Reihe
  # nicht ein halbes Jahr lang dieselben sechs Artikel zeigt.
  # ⚠️ Was er NICHT kann: neue Themen finden. Dafür braucht es eine Web-Recherche, und die
  # gehört an den Anfang jeder Session (siehe CLAUDE.md). Der Automat hält die Reihe frisch,
  # aktuell hält sie nur, wer nachschaut, was gerade läuft.
  # ⚠️ 04.09.2026 — EINE SPERRE JE WAECHTER. Die taeglichen Waechter wurden bisher allein
  # ueber das ALTER ihres Logs gestartet. Das ist kein Prozess-Test: Ein Lauf, der lange
  # arbeitet und nichts schreibt, laesst die Log-Uhr stehen — und der Aufseher startet in
  # jeder Runde einen weiteren. Gemessen liefen SIEBEN google_size_metafeld gleichzeitig und
  # haben den geteilten Shopify-Eimer auf 57 von 2000 gedrueckt; jede andere Arbeit lief
  # daraufhin in «Throttled» und meldete leere Ergebnisse. Jeder Waechter nimmt jetzt eine
  # eigene flock-Sperre; ein Zweitstart endet von selbst.
  HY=/tmp/hype_kuratieren.log
  if [ -f "$REPO/automation/hype_kuratieren.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$HY" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$HY"; then
      touch "$HY"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # NUR_RAEUMEN: unbeaufsichtigt nur Abgelaufenes abräumen — Neuaufnahme braucht den
      # Kontaktbogen-Blick einer betreuten Runde (15.08.: 5 untaugliche Bilder auf Position 1).
      # 14.09.: Vorher den Export frisch halten (MAXALTER 86400 = No-op, wenn er juenger ist) — die
      # Neuaufnahme las sonst /tmp/export.jsonl vom 30.08. und sah kein neues Thema (Task #75).
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_hype_kuratieren.lock; flock -n 9 || exit 0; python3 automation/hype_export_bauen.py; NUR_RAEUMEN=1 exec python3 automation/hype_kuratieren.py" >> "$HY" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) hype_kuratieren gestartet (nur abräumen)"
    fi
  fi
  # QUERBEET, einmal täglich: aus jeder der 20 Welten ein Stück in EINE Reihe
  # (Betreiber 03.09.: «von bissel allen kategorien etwas»). Anders als die Hype-Reihe
  # darf das unbeaufsichtigt laufen — die Auswahl hängt nicht am Bild-Augenschein,
  # sondern an harten Bedingungen (≥3 Bilder, ab CHF 19, Google-Kanal, kein Risiko-Tag),
  # und ein Fehlgriff steht höchstens 10 Tage, dann räumt der nächste Lauf ihn weg.
  QB=/tmp/querbeet.log
  if [ -f "$REPO/automation/querbeet_kuratieren.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$QB" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$QB"; then
      touch "$QB"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_querbeet_kuratieren.lock; flock -n 9 || exit 0; exec python3 automation/querbeet_kuratieren.py" >> "$QB" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) querbeet_kuratieren gestartet"
    fi
  fi
  # BESTSELLER-ROTATION, einmal täglich (Betreiber 31.08.: «bestseller immernoch die gleichen
  # produkten»): mischt die MANUAL-Kollektion `bestseller` mit Datums-Seed — die Startseiten-
  # Reihe zeigt so jeden Tag eine andere Auswahl der 18 Bewertungssieger. Idempotent je Tag.
  BR=/tmp/bestseller_rotation.log
  if [ -f "$REPO/automation/bestseller_rotation.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BR"; then
      touch "$BR"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_bestseller_rotation.lock; flock -n 9 || exit 0; exec python3 automation/bestseller_rotation.py" >> "$BR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bestseller_rotation gestartet"
    fi
  fi
  # BESTSELLER-AUFFUELLEN, einmal täglich (10.09.2026): Die Reihe «⭐ Unsere Bestseller» stand
  # bei 20 aktiven von 32 — die Sieger, aus denen sie am 29.08. kuratiert wurde, waren inzwischen
  # gedraftet (ausverkauft-lieferant / keine-lieferanten-ref / ghost-sale). Eine Reihe, die
  # «Bestseller» heisst und keine bewerteten Produkte mehr zeigt, ist eine leere Behauptung.
  # Ergaenzt aus Judge.me nur, was die BADGE-Bedingung erfuellt (≥4,0 ★ UND ≥3 Stimmen), hoechstens
  # 2 je Warengruppe (sonst siebenmal Kueche), und ENTFERNT nie etwas. Laeuft VOR der Rotation.
  BA=/tmp/bestseller_auffuellen.log
  if [ -f "$REPO/automation/bestseller_auffuellen.py" ] && [ -f /tmp/judgeme.env ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BA" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BA"; then
      touch "$BA"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_bestseller_auffuellen.lock; flock -n 9 || exit 0; WRITE=1 exec python3 automation/bestseller_auffuellen.py" >> "$BA" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bestseller_auffuellen gestartet"
    fi
  fi
  # NEUHEITEN-ROTATION, einmal täglich (05.09.2026, Audit mobil-startseite: «Neuheiten 2026» und
  # «Elektronik» zeigten 10/12 dieselben Beamer — CREATED_DESC folgt dem Grind). Holt je Welt das
  # juengste brauchbare Produkt an den Anfang der MANUAL-Kollektion `neu-eingetroffen`. Idempotent je Tag.
  NR=/tmp/neuheiten_rotation.log
  if [ -f "$REPO/automation/neuheiten_rotation.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$NR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$NR"; then
      touch "$NR"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_neuheiten_rotation.lock; flock -n 9 || exit 0; exec python3 automation/neuheiten_rotation.py" >> "$NR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) neuheiten_rotation gestartet"
    fi
  fi
  # IG-DUPLIKAT-WACHE, einmal täglich (User 18.08.: «poste nie mehr das gleiche»): ein
  # externer Planer re-postet die alte Queue ~alle 12 Tage; bis die Quelle gefunden ist,
  # löscht die Wache jeden neuen Doppelpost (ältester bleibt, nie >10 Likes).
  IW=/tmp/ig_dup_wache.log
  if [ -f "$REPO/automation/ig_dup_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$IW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$IW"; then
      touch "$IW"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_ig_dup_wache.lock; flock -n 9 || exit 0; exec python3 automation/ig_dup_wache.py" >> "$IW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ig_dup_wache gestartet"
    fi
  fi
  # HYPE-REVIEWS, einmal täglich: echte CJ-Reviews (≥4★) für die Trend-Reihe zu Judge.me —
  # Social Proof genau dort, wo die Startseite hinzeigt. Bricht bei leeren CJ-Punkten sauber ab.
  HR=/tmp/reviews_hype.log
  if [ -f "$REPO/automation/reviews_hype_lauf.sh" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$HR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$HR"; then
      touch "$HR"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash automation/reviews_hype_lauf.sh >> "$HR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) hype-reviews Lauf gestartet"
    fi
  fi
  # TRESOR: Zugangsdaten nach einem Snapshot-Rewind zurückholen. /tmp wird mitgedreht — eine
  # Datei von NACH dem Snapshot (24.08. 15:36) ist danach weg, eine ältere überlebt. Die
  # Judge.me-Token vom 28.08. waren so schon nach Stunden verschwunden, und der tägliche
  # Bewertungs-Import endete als No-op. Sie liegen jetzt in einem Shop-Metafeld
  # (`ls_tresor`, Definition ausdrücklich mit storefront:NONE) und werden hier zurückgelegt.
  # Ins Repo dürfen sie nicht — es ist öffentlich.
  if [ -f "$REPO/automation/tresor.py" ]; then
    for PAAR in "judgeme:/tmp/judgeme.env" "cj:/tmp/cj_creds.env" "tiktok:/tmp/tt_creds.env" "dienste:/tmp/dienste.env" "meta:/tmp/meta.env"; do
      NAME="${PAAR%%:*}"; ZIEL="${PAAR#*:}"
      [ -s "$ZIEL" ] && continue
      if ( cd "$REPO" && python3 automation/tresor.py env "$NAME" "$ZIEL" >/dev/null 2>&1 ); then
        echo "$(date -u +%H:%M) $ZIEL aus dem Tresor wiederhergestellt"
      fi
    done
    # ⚠️ Die Einzelwert-Dateien, die die Social-Poster erwarten, aus meta.env ableiten.
    if [ -s /tmp/meta.env ]; then
      . /tmp/meta.env 2>/dev/null
      [ -n "$META_PAGE_TOKEN" ] && [ ! -s /tmp/meta_page_token ] && printf %s "$META_PAGE_TOKEN" > /tmp/meta_page_token && chmod 600 /tmp/meta_page_token
      [ -n "$META_APP_SECRET" ] && [ ! -s /tmp/meta_app_secret ] && printf %s "$META_APP_SECRET" > /tmp/meta_app_secret && chmod 600 /tmp/meta_app_secret
      [ -n "$META_IG_ID" ] && [ ! -s /tmp/meta_ig_id ] && printf %s "$META_IG_ID" > /tmp/meta_ig_id
    fi
  fi
  # ⚠️ SHOPIFY_CLIENT_ID/SECRET liegen bewusst NICHT im Tresor: Der Tresor IST ein Shop-Metafeld,
  # man braucht sie also, um ihn überhaupt zu öffnen. Sie im Tresor abzulegen wäre ein Schlüssel,
  # der im abgeschlossenen Schrank liegt. Sie gehören in die Umgebungs-Einstellungen des Kontos —
  # das ist der einzige Ort, den weder Rewind noch Container-Wechsel erreicht.
  # ECHTE CJ-BEWERTUNGEN, einmal täglich: Von 31 Produkten mit Besuchern hatte am 28.08.2026
  # genau EINES eine Bewertung — nicht wegen kaputter Technik (Judge.me hält 1'193 Bewertungen
  # auf 216 Produkten, die Shopify-Metafelder sind synchron), sondern wegen Abdeckung: 216 von
  # 49'000 sind 0,4 %. Der Lauf holt AUSSCHLIESSLICH echte Kundenkommentare vom Lieferanten
  # (≥4★, Mindestlänge) — erfundene Bewertungen sind ausgeschlossen.
  # ⚠️ Er braucht JUDGEME_PRIVATE_TOKEN aus /tmp/judgeme.env. Die Datei liegt in /tmp und
  # überlebt den Snapshot-Rewind NICHT; fehlt sie, endet der Lauf sauber als No-op.
  RV2=/tmp/cj_reviews_import.log
  if [ -f "$REPO/automation/cj_reviews_import.mjs" ] && [ -f /tmp/judgeme.env ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$RV2" 2>/dev/null || echo 0) ))
    # 08.10.2026 (Plan Tag 9): GEMESSEN — die letzten zwei Tagesläufe starben am stündlichen Container-Neustart nach 31 bzw.
    # 38 von 150 Produkten und kamen erst 24 h später wieder; von 2'695 Neuimporten waren 107 geprüft. Jetzt: START-Marke,
    # Schlusszeile FERTIG, still_gestorben holt nach; und solange eine volle Charge echten Fortschritt meldet («WEITER»,
    # rohe pids kosten keine CJ-Punkte), folgt nach einer Stunde die nächste Charge.
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$RV2" || still_gestorben "$RV2" \
       || { [ "$ALTER" -gt 3600 ] && letzter_lauf "$RV2" | grep -q "^FERTIG: .*WEITER"; }; then
      touch "$RV2"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      echo "START $(date -u +%FT%TZ) cj_reviews_import" >> "$RV2"
      # 05.09.2026: ERST die sichtbare Ware. Der alte Lauf nahm eine Zufallsscheibe aus 53'000
      # Produkten (Trefferchance auf ein sichtbares ~0,3 %); von 187 Produkten in den Startseiten-
      # Reihen hatten nur 23 eine Bewertung. bewertungen_prio.py baut die Arbeitsliste, der Ledger
      # des Importers macht sie über Container-Neustarts hinweg fortsetzbar.
      ( cd "$REPO" && setsid sh -c 'python3 automation/bewertungen_prio.py >> "'"$RV2"'" 2>&1; . /tmp/judgeme.env; . /tmp/cj_creds.env 2>/dev/null; . /tmp/dienste.env 2>/dev/null; . /tmp/secrets_env.sh 2>/dev/null; export CJ_EMAIL="${CJ_EMAIL:-$(cat /tmp/cj_email 2>/dev/null)}" CJ_API_KEY="${CJ_API_KEY:-$(cat /tmp/cj_apikey 2>/dev/null)}"; P=dropship/_bewertungen_prio.txt; if [ -s "$P" ]; then ONLY="$(head -400 "$P" | paste -sd, -)" LIMIT=400 MIN_SCORE=1 PER=8 /opt/node22/bin/node automation/cj_reviews_import.mjs; else LIMIT=120 MIN_SCORE=1 PER=6 /opt/node22/bin/node automation/cj_reviews_import.mjs; fi' >> "$RV2" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) cj-bewertungen gestartet"
    fi
  fi
  # TOTE LANDESEITEN, einmal täglich: Seiten, auf denen tatsächlich Besucher ankamen, die aber
  # nicht mehr kaufbar sind. Am 28.08.2026 waren das 76 von 234 — 12'320 Suchen im Monat allein
  # bei den rankenden. Die täglichen Wächter draften laufend Ware; keiner von ihnen weiss, ob
  # die Seite Verkehr hatte. Der Lauf legt NUR bei eindeutig gleichartigem aktivem Produkt
  # (Ähnlichkeit >= 0.70) selbst eine Weiterleitung an, alles andere kommt in den Bericht.
  # ⚠️ Er veröffentlicht NIE ein Draft — jedes hat einen Grund im Tag.
  # TIKTOK-KARUSSELL + VIDEO, einmal täglich: baut aus der Trend-Kollektion einen
  # mehrseitigen Foto-Post (Slides 1080x1920) und schneidet daraus ein 9:16-Video —
  # einmal ohne Ton (für den TikTok-Trend-Sound) und einmal mit eigener Musik.
  # ⚠️ Es POSTET NICHTS. TikToks Content-Posting-API steht für diesen Shop weiter in Review
  # (`unauthorized_client`); der einzige Weg, der heute funktioniert, ist der Upload von Hand
  # über tiktokstudio/upload. Das Werkzeug legt also nur das fertige Material bereit.
  # ⚠️ Es fasst kein Produkt zweimal an (eigenes Ledger + reels_seed.csv) — Doppelpost-Verbot.
  # RATGEBER OHNE WARE, einmal täglich: meldet veröffentlichte Ratgeber, die Ware mit NAMEN
  # und PREIS bewerben, zu der es nichts Aktives gibt — und solche ohne einen einzigen
  # kaufbaren Produktlink. Die Klasse waechst nach: jedes Mal, wenn ein Waechter ein Produkt
  # draftet (keine-lieferanten-ref, Dubletten, Medizinprodukte), wird ein Ratgeber, der es
  # bewirbt, zur Falschaussage. Gemessen am 28.08.: der Ratgeber mit dem zweitmeisten
  # Suchverkehr des Shops (77 Sitzungen) fuehrte auf KEIN kaufbares Produkt.
  # ⚠️ MELDET NUR. Ein automatisch untergeschobener Ersatzartikel ist ein Koederwechsel.
  ROW=/tmp/ratgeber_ohne_ware.log
  if [ -f "$REPO/automation/ratgeber_ohne_ware.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$ROW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$ROW"; then
      touch "$ROW"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_ratgeber_ohne_ware.lock; flock -n 9 || exit 0; exec python3 automation/ratgeber_ohne_ware.py" >> "$ROW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ratgeber-ohne-ware geprüft"
    fi
  fi
  # HAENGENDE SERVER-QUITTUNGEN (01.10.2026): «laufend» > 3 h wird geschlossen, wenn das Nachholen nachweislich
  # geregelt ist (Download → Merkliste 24 h; Pin → späterer Lauf las die Pinnwand; lesende Aufträge). Alles andere
  # bleibt in der Ampel. Ohne das meldete die Ampel 8 h lang dieselben zwei Downloads — Rauschen verdeckt Pannen.
  if [ -f "$REPO/automation/auftrag_haenger_schliessen.py" ]; then
    AH=$( cd "$REPO" && SCHARF=1 timeout 120 python3 automation/auftrag_haenger_schliessen.py 2>&1 | tail -1 )
    case "$AH" in "FERTIG: 0 "*) ;; *) echo "$(date -u +%H:%M) haenger: $AH"
      ( cd "$REPO" && bash automation/git_sichern.sh "Server-Quittungen: hängende geschlossen [skip ci]" auftraege/erledigt >/dev/null 2>&1 ) ;; esac
  fi
  # SPEICHER KÜRZEN (01.10.2026, Betreiber «a dann b aber nicht das fehler gibt»): Läufe dauern Stunden, der Container startet
  # stündlich neu → hier fortsetzen, bis die Fertig-Marke liegt. Ledger dropship/_speicher_kuerzen.tsv macht es idempotent.
  for SKK in aktiv-max10 cj-entwurf; do
    [ -f "$REPO/automation/speicher_bilder_kuerzen.py" ] || break
    [ -f "$REPO/dropship/_speicher_kuerzen_fertig_$SKK.txt" ] && continue
    # flock je Klasse: läuft schon ein Lauf, beendet sich der neue sofort (kein Doppelstart)
    ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_speicher_kuerzen_$SKK.lock; flock -n 9 || exit 0; \
        KLASSE=$SKK SCHARF=1 N=8000 exec python3 automation/speicher_bilder_kuerzen.py" >> "/tmp/speicher_kuerzen_$SKK.log" 2>&1 & )
  done
  # GOOGLE-NEUIMPORT (01.10.2026, Betreiber «google rangliste cj sachen pushen»): neue Ware sofort mit Google-Kategorie +
  # Geschlecht statt erst durch die Tagesläufer (13/25 Neuimporte standen ohne Kategorie im einzigen Kanal mit Verkäufen).
  GN=/tmp/google_neuimport.log
  if [ -f "$REPO/automation/google_neuimport.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GN" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 3300 ]; then
      touch "$GN"
      ( cd "$REPO" && SCHARF=1 STUNDEN=3 timeout 600 python3 automation/google_neuimport.py >> "$GN" 2>&1 )
    fi
  fi
  # 05.10.2026 (Bereich «kategorie», unverändert aus dem Ursprungsergebnis; Nachbesserung erhöht nur die Kanarienzahl 17 → 26):
  # Kanarienvögel der Titelregeln VOR dem scharfen kategorie_wache-Lauf — eine Regeländerung, die einen der 26 Fälle (Steckdose,
  # Adventskalender Blind Box, Stunt-Hund mit Fernbedienung, Saugroboter/Staubsauger-Roboter/Roboter-Staubsauger, Tierkamera,
  # Katzen-Laserpointer, Futterautomat, Trainingsjacke …) kippt, darf nicht schreiben. Ohne Shop-Zugriff, < 1 s.
  if [ -f "$REPO/automation/kategorie_wache.py" ]; then
    if ! ( cd "$REPO" && timeout 60 python3 automation/kategorie_wache.py --test > /tmp/kategorie_kanarien.log 2>&1 ); then
      echo "$(date -u +%H:%M) ⚠️ KATEGORIE-KANARIEN: $(grep -c '❌' /tmp/kategorie_kanarien.log) von $(grep -c '^  ' /tmp/kategorie_kanarien.log) Regeln falsch — kategorie_wache NICHT scharf starten (SCHARF-Block Z. ~945 überspringen), Regeln prüfen"
      touch /tmp/kategorie_wache.kanarien_fehler
    else
      rm -f /tmp/kategorie_wache.kanarien_fehler
    fi
  fi
  # Hinweis für den SCHARF-Block (Z. ~945): davor `[ -f /tmp/kategorie_wache.kanarien_fehler ] && skip` einbauen.
  # KATEGORIE-NEUWARE (02.10.2026, Verbesserungsrunde): der Grind legt ~250 Produkte/Tag an, die Tageswache ordnete sie
  # erst bis zu 24 h später ein (Ampel 285 ohne Kategorie) — stündlich, nur Produkte ohne Kategorie, Sperre im Skript.
  KW=/tmp/kategorie_neuware.log
  if [ -f "$REPO/automation/kategorie_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 3300 ] && [ ! -f /tmp/kategorie_wache.kanarien_fehler ]; then
      touch "$KW"
      ( cd "$REPO" && SCHARF=1 CAP=1500 timeout 900 python3 automation/kategorie_wache.py >> "$KW" 2>&1 )
      # danach Kinderkleidung bei Google auf den Babyzweig + age_group (liest die eben gesetzte Shopify-Kategorie)
      [ -f "$REPO/automation/kinder_google_pfad.py" ] && ( cd "$REPO" && SCHARF=1 timeout 600 python3 automation/kinder_google_pfad.py >> "$KW" 2>&1 )
    fi
  fi
  # GOOGLE-KATEGORIE-UMZUG (05.10.2026, Verbesserungsrunde): grobe Sammelzweige (Fitness/Decor/Pet/Kitchen/Tools) mit eindeutigem
  # Warenwort in den richtigen Zweig (Velohelm → Bicycle Helmets, Nackenkissen → Bedding > Pillows …); Fein-Stufe darf nur
  # innerhalb verfeinern, KI-Stufe ruht ohne Guthaben. Täglich, eigener frischer Bulk-Export, Kanarienvögel im Skript (Abbruch).
  GKU=/tmp/google_kategorie_umzug.log
  if [ -f "$REPO/automation/google_kategorie_umzug.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GKU" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GKU"; then
      touch "$GKU"
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_google_kategorie_umzug.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
          SCHARF=1 timeout 2400 python3 automation/google_kategorie_umzug.py 2>&1 | grep -v '^     '; \
          SCHARF=1 ZEIGEN=0 timeout 900 python3 automation/werkzeug_korb_shop.py 2>&1 | grep -v '^   '; \
          SCHARF=1 ZEIGEN=0 timeout 600 python3 automation/aroma_kategorie.py 2>&1 | grep -E '^(PLAN|FERTIG|ABBRUCH)'; \
          SCHARF=1 timeout 1800 python3 automation/haar_fein.py 2>&1 | grep -E '^(HAAR-FEIN|Kanarien|Google-Pfad)'; \
          SCHARF=1 timeout 2400 python3 automation/kosmetik_fein.py 2>&1 | grep -E '^(KOSMETIK-FEIN|Kanarien|Google-Pfad)'; \
          SCHARF=1 timeout 900 python3 automation/nagel_fein.py 2>&1 | grep -E '^(NAGEL|FERTIG)'; \
          SCHARF=1 timeout 900 python3 automation/rc_fein.py 2>&1 | grep -E '^(RC-FEIN|Kanarien|Google-Pfad)'; \
          SCHARF=1 timeout 1500 python3 automation/uhren_fein.py 2>&1 | grep -E '^(UHREN-FEIN|Kanarien|Google-Pfad)'; \
          SCHARF=1 timeout 1500 python3 automation/titelprobe_fein.py 2>&1 | grep -E '^(TITELPROBE|Google-Pfad|Kanarien)'; \
          SCHARF=1 timeout 2400 python3 automation/kleid_rock_tags.py 2>&1 | grep -E '^(KLEID-ROCK|Kanarien)'; \
          SCHARF=1 timeout 2400 python3 automation/schuhe_fein.py 2>&1 | grep -E '^(SCHUH|FERTIG)'; \
          SCHARF=1 timeout 1800 python3 automation/spielzeug_trennung.py 2>&1 | grep -E '^(SPIELZEUG|FERTIG)'; \
          SCHARF=1 timeout 2400 python3 automation/shopify_fein.py 2>&1 | grep -E '^(SHOPIFY-FEIN|FERTIG|⚠️)'; \
          SCHARF=1 timeout 600 python3 automation/google_id_zu_name.py 2>&1 | grep -E '^(GOOGLE-ID|Google-Pfad)'" >> "$GKU" 2>&1 9>&- & )
    # 08.10.2026 (Betreiber «ordne alles sauber ein»): nagel_fein.py NACH kosmetik_fein — CJ nennt Press-on-Sets (Grössen XS–L,
    # Jelly-Kleber) «Nagelsticker»; nur Grössenoption/Beschreibung trennen sie von echten Stickern (96 + 34 gesetzt). kosmetik_fein
    # überspringt die hier gesetzten Press-on-Produkte und vergröbert seit heute nie (shopify-feiner/google-feiner).
    # 08.10.2026 (Betreiber «weiter feinkategorie verbessern»): shopify_fein.py — 27'897 aktive standen in Shopify auf einer Klasse
    # MIT Unterklassen, Google hat darunter kein Blatt (Clothing Tops 4'671, Handbags 880, Pants 772, Ladegeräte 742, Halsbänder 733,
    # Leinen 727, Jacken 715, Näpfe 544, Kissen 250) → Titelregeln je Elternklasse aus data/shopify_fein.json (Kanarien 164/164),
    # nur exakt die Elternklasse wird angefasst, Google bleibt; neue Klasse = JSON-Block, kein neues Skript.
    # 08.10.2026 (Betreiber «saubere trennung»): spielzeug_trennung.py — Bausteine/Holzpuzzles trugen Typ «Spass-Elektronik» + Tag rc
    # (841/1'040 rc nicht ferngesteuert, alle in der RC-Kollektion) → rc nur bei RC-/Elektronik-Wort, Typ «Spielzeug & Spiele»;
    # dieselbe Regel im Importer (cj_category_fill.mjs spielzeugTrennung, data/spielzeug_trennung.json, Gleichlauf 1'040/0).
    # 08.10.2026 (Betreiber «verbessere feinkataloge»): schuhe_fein.py — 5'646 Schuhe standen in Shopify nur auf «Shoes» (aa-8;
    # Google hat darunter keine Klasse, kategorie_fein kam nie weiter) → Sneakers/Stiefel/Sandalen/… + Kinderzweig aus dem Titel,
    # nur grobe aa-8/aa-8-11 werden angefasst (Kanarien 52/52), Google bleibt «Shoes».
    # 08.10.2026 (Betreiber «weiter fein katalog verbessern»): titelprobe_fein.py — Kleidung/Schmuck, deren Titel der
    # Google-Klasse widerspricht (142 «Dresses» waren Röcke/Blusen/Nachthemden), setzt Google + Shopify aus dem Titelwort;
    # kleid_rock_tags.py bindet die Kollektionen «Kleider»/«Röcke» (Tags kategorie-kleid/-rock) an Kategorie + Titel.
    # 07.10.2026 (Betreiber «alles andere auch»): uhren_fein.py trennt Uhr/Smartwatch/Armband (Shopify aa-6-11/-12/-10-1),
    # google_id_zu_name.py übersetzt nackte Google-Nummern («567», «1») in Pfade (Titelwort zuerst).
    # 07.10.2026 (Betreiber «das muss perfekt sein» / «super mache mehr»): haar_fein.py löst Googles Sammelkorb «Hair Care» auf
    # (Glätteisen/Föhn/Bürsten fein, Gesichtsdampfer/Rasierer/Munddusche/Luftreiniger in ihren Zweig), kosmetik_fein.py ordnet
    # «Cosmetics» per Titelwort fein (Pinsel → Makeup Brushes, Press-on → False Nails …) — beide setzen Google UND Shopify.
    # 07.10.2026: aroma_kategorie.py — Diffuser/Luftbefeuchter/Duftöl in Shopify- UND Google-Kategorie (154 standen als Cosmetic Tools / Hair Care).
    # 07.10.2026: werkzeug_korb_shop.py zieht danach die SHOP-Seite nach (Typ, Shopify-Kategorie, Tags werkzeug/heimwerken)
    # für alles, was der Umzug aus «Hardware > Tools» geholt hat — Kalimba nicht mehr im Werkzeug-Regal.
    elif [ -s "$GKU" ]; then
      grep '^FERTIG' "$GKU" | tail -1 | sed "s/^/$(date -u +%H:%M) Google-Umzug: /"
    fi
  fi
  # KATEGORIE-FEIN + KLEIDER-MERKMALE → seit 06.10.2026 am Rundenbeginn (siehe dort).
  # GOOGLE-FEIN-KI (02.10.2026, Betreiber «google push und coole fein kategorien»): ~7'100 Google-Kanal-Produkte in groben
  # Zweigen → Gemini + ChatGPT wählen den Unterpfad, geschrieben nur bei Einigkeit. 2 Arbeiter (4 = ChatGPT-429), flock je Anteil,
  # bis die Fertig-Marke dropship/_google_fein_ki_fertig_KvonN.txt steht (übersteht Container-Neustarts über das Ledger).
  if [ -f "$REPO/automation/google_fein_ki.py" ] && [ -f /tmp/google_fein_ki_export.jsonl ]; then
    for GK in 1 2; do
      [ -f "$REPO/dropship/_google_fein_ki_fertig_${GK}von2.txt" ] && continue
      # 02.10.: nacheinander statt parallel — zwei Arbeiter leerten das Groq-Minutenkontingent, der SEO-Autopilot hing in 429
      [ "$GK" = 2 ] && [ ! -f "$REPO/dropship/_google_fein_ki_fertig_1von2.txt" ] && continue
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_google_fein_ki_$GK.lock; flock -n 9 || exit 0; \
          EXPORT=/tmp/google_fein_ki_export.jsonl SCHARF=1 TEIL=$GK/2 GROQ_MODELL=openai/gpt-oss-20b GROQ_AUSWEICH= exec python3 automation/google_fein_ki.py" >> "/tmp/google_fein_ki_$GK.log" 2>&1 & )
    done
  fi
  # OBERKLASSE-NEUIMPORT (08.10.2026, Verbesserungsrunde): ~70 Neuimporte/Tag landen bei Google auf einer Oberklasse (CJ-Gruppe
  # stempelt nur den Korb; gemessen 483 seit 01.10.). Die KI-Stufe oben lief nur EINMAL über einen festen Export (02.10.).
  # Täglich: (1) oberklasse_lernen.py — Regeln gelernt aus 16'351 geprüften Urteilen vom 07.10. (Gegenprobe 80/20 ≥ 95 % Pflicht,
  # sonst schreibt es nichts); (2) der Rest ohne Regel → google_fein_ki.py (Zwei-Modell-Einigkeit, nur innerhalb der Oberklasse).
  # KI-Stufe mit dem MASSEN-Modell gpt-oss-20b ohne Ausweichen (zweitmodell.py: 120b/qwen bleiben für Bestellungen + SEO);
  # Kontingent leer → Lauf endet, Ledger hält den Stand, nächster Tag macht weiter.
  OKL=/tmp/oberklasse_lernen.log
  if [ -f "$REPO/automation/oberklasse_lernen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$OKL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$OKL"; then
      touch "$OKL"
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_oberklasse_lernen.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
          SCHARF=1 TAGE=14 KI_EXPORT=/tmp/oberklasse_ki.jsonl timeout 1800 python3 automation/oberklasse_lernen.py 2>&1 | grep -E '^(OBERKLASSE|GEGENPROBE|  KI-Export|Präzision)'; \
          EXPORT=/tmp/oberklasse_ki.jsonl SCHARF=1 GROQ_MODELL=openai/gpt-oss-20b GROQ_AUSWEICH= timeout 3600 python3 automation/google_fein_ki.py 2>&1 | grep -E '^(geprüft|FERTIG|PAUSE)'" >> "$OKL" 2>&1 9>&- & )
    fi
  fi
  # SEO-AUTOPILOT (02.10.2026, Betreiber «mach besser als soro»): täglich EIN Ratgeber aus echter CH-Suchnachfrage
  # (Google-Vorschläge gl=ch), nur Themen mit ≥ 6 kaufbaren Produkten, Faktenprüfung durch Zweitmodell, FAQ-JSON-LD;
  # danach Wirkungsmessung (dropship/SEO-AUTOPILOT.md) und 15 bestehende Artikel aufwerten (passende Produkte + FAQ/JSON-LD,
  # Text unverändert; Produktblock alle 30 T neu). Marke je Tag, flock gegen Doppelstart.
  SA_MARKE="/tmp/seo_autopilot_$(date -u +%F).done"
  if [ -f "$REPO/automation/seo_autopilot.py" ] && [ ! -f "$SA_MARKE" ] && [ "$(date -u +%H)" -ge 7 ]; then
    ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_seo_autopilot.lock; flock -n 9 || exit 0; \
        SCHARF=1 MAX=1 timeout 1800 python3 automation/seo_autopilot.py && touch '$SA_MARKE'; \
        timeout 300 python3 automation/seo_autopilot.py --messen; \
        SCHARF=1 N=15 timeout 2400 python3 automation/seo_autopilot.py --auffrischen" >> /tmp/seo_autopilot.log 2>&1 & )
  fi
  # INDEXNOW (02.10.2026, Betreiber «programmiere tools selber» statt Apps wie «IndexNow Kit»): ChatGPT, Copilot und
  # DuckDuckGo lesen den Bing-Index; 2 der letzten 4 Bestellungen kamen über ChatGPT. Täglich ≤ 10'000 Seiten an IndexNow,
  # jede Adresse höchstens alle 30 T (nur Neues/Rückstand). Schlüssel-Datei: luxestyle.ch/<key>.txt → CDN (Redirect).
  IXN=/tmp/indexnow_melden.log
  if [ -f "$REPO/automation/indexnow_melden.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$IXN" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$IXN" || still_gestorben "$IXN"; then
      touch "$IXN"
      ( cd "$REPO" && timeout 1800 python3 automation/indexnow_melden.py >> "$IXN" 2>&1 )
      echo "$(date -u +%H:%M) indexnow_melden: $(tail -1 "$IXN")"
    fi
  fi
  # GESCHENK-WELTEN (02.10.2026, 12-Tage-Plan Tag 3): «für Sie/Ihn/Kinder» nach Warenart statt Tag-UND (vorher 22/24 Schmuck,
  # 22/24 Uhren, 16/24 Babykleider). Täglich neu wählen (Neuimporte, Drafts fallen raus), Tags nachziehen, erste 48 reihum.
  GW=/tmp/geschenk_unterwelten.log
  if [ -f "$REPO/automation/geschenk_unterwelten.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GW" || still_gestorben "$GW"; then
      touch "$GW"
      ( cd "$REPO" && SCHARF=1 timeout 2400 python3 automation/geschenk_unterwelten.py >> "$GW" 2>&1 )
      echo "$(date -u +%H:%M) geschenk_unterwelten: $(grep -c 'Reihenfolge' "$GW") Welten · $(tail -1 "$GW")"
    fi
  fi
  # PRODUKTTYP-VEREINHEITLICHEN (02.10.2026, Betreiber «feinkategorie filter verbessern?»): die Facette «Produkttyp»
  # zeigte Gadget+Gadgets, Beauty Tools+Beauty-Tool+Beauty-Tools … Importer erzeugen die Dubletten neu → täglich auf den
  # Haupttyp legen (Sperre: kein Produkt fällt aus einer TYPE-Regel-Kollektion; Editor/POD nie).
  PT=/tmp/produkttyp_vereinheitlichen.log
  if [ -f "$REPO/automation/produkttyp_vereinheitlichen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$PT" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$PT" || still_gestorben "$PT"; then
      touch "$PT"
      ( cd "$REPO" && SCHARF=1 timeout 1800 python3 automation/produkttyp_vereinheitlichen.py >> "$PT" 2>&1 )
      echo "$(date -u +%H:%M) produkttyp_vereinheitlichen: $(tail -1 "$PT")"
    fi
  fi
  # FARBMUSTER-FILTER (02.10.2026): genormtes Farbfeld shopify.color-pattern aus der Option «Farbe» (19 Grundfarben,
  # lux-farbe-*), damit der Storefront-Filter «Farbe» lesbar ist (Rohwerte: 35'545). Täglich für Neuimporte.
  FM=/tmp/farbmuster_filter.log
  if [ -f "$REPO/automation/farbmuster_filter.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$FM" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$FM" || still_gestorben "$FM"; then
      touch "$FM"
      ( cd "$REPO" && SCHARF=1 timeout 3000 python3 automation/farbmuster_filter.py >> "$FM" 2>&1 )
      echo "$(date -u +%H:%M) farbmuster_filter: $(tail -1 "$FM")"
    fi
  fi
  # GRÖSSENWERT-KAUDERWELSCH (02.10.2026): seit dem Filter «Grösse» stehen alle Grössenwerte offen in der Facette
  # («L Code-Need To Order Without Toolkit»). Liest den Export von farbmuster_filter (darum DANACH), bereinigt eindeutige
  # Muster, meldet den Rest.
  GK=/tmp/groessenwert_kauderwelsch.log
  if [ -f "$REPO/automation/groessenwert_kauderwelsch.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GK"; then
      touch "$GK"
      ( cd "$REPO" && SCHARF=1 timeout 900 python3 automation/groessenwert_kauderwelsch.py >> "$GK" 2>&1 )
      echo "$(date -u +%H:%M) $(tail -1 "$GK")"
      # 04.10.2026: eine Schreibweise je Grösse im Filter («140cm»→«140 cm», «US 10»→«US10», «S to M»→«S/M», «F»→Einheitsgrösse)
      ( cd "$REPO" && SCHARF=1 timeout 1800 python3 automation/groessenwert_normieren.py >> "$GK" 2>&1 )
      echo "$(date -u +%H:%M) groessenwert_normieren: $(tail -1 "$GK")"
    fi
  fi
  # GOOGLE-NACHFRAGE-LÜCKE (02.10.2026, Betreiber «weiter push überall»): 57 % der Google-Sitzungen (150 T) landeten auf
  # Seiten, die heute Entwürfe sind (Dry Bag 82, Rizinus-Set 55) — Google listet nur Kaufbares. Täglich: tote Google-
  # Landeseiten mit Nachfrage → generischer CJ-Suchauftrag VORNE in cj_search_queue.txt (Hausregeln, Marken, Saison).
  GN=/tmp/google_nachfrage_luecke.log
  if [ -f "$REPO/automation/google_nachfrage_luecke.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GN" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GN" || still_gestorben "$GN"; then
      touch "$GN"
      ( cd "$REPO" && timeout 900 python3 automation/google_nachfrage_luecke.py >> "$GN" 2>&1 )
      echo "$(date -u +%H:%M) google_nachfrage_luecke: $(tail -1 "$GN")"
    fi
  fi
  # TITEL-KAUDERWELSCH (01.10.2026, 12-Tage-Plan Tag 1, Grind wieder an): Neuimporte mit erfundenen Wörtern
  # («Inflierbares» statt «Aufblasbares») — Gemini + ChatGPT müssen dasselbe Wort finden, sonst nur Meldung. Alle 6 h.
  TK=/tmp/titel_kauderwelsch_wache.log
  if [ -f "$REPO/automation/titel_kauderwelsch_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 21600 ] || absturz_nachholen "$TK"; then
      touch "$TK"
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_titel_kauderwelsch.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
          SCHARF=1 exec timeout 1800 python3 automation/titel_kauderwelsch_wache.py" >> "$TK" 2>&1 9>&- & )
    fi
    tail -n 1 "$TK" 2>/dev/null | grep -q "korrigiert" && tail -n 1 "$TK" | grep -qv " 0 korrigiert, 0 gemeldet" \
      && echo "$(date -u +%H:%M) titel_kauderwelsch: $(tail -n 1 "$TK")"
  fi
  # GOOGLE-BILDTAUSCH AUSGEROLLT (01.10.2026, Betreiber «push shop mehr»): A/B ausgewertet — getauscht 10/13 von Google frei-
  # gegeben, Kontrolle 0/25 → alle «Inappropriate image» laufen (Gemini + ChatGPT einig, nur vorhandene Bilder, Ledger je Produkt).
  # Alle 2 h, solange offen; der Lauf endet mit FERTIG, wenn nichts mehr offen ist. Neustart-fest über das Ledger.
  GBT=/tmp/google_bild_tausch.log
  if [ -f "$REPO/automation/google_bild_tausch.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GBT" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 7200 ] || absturz_nachholen "$GBT" || still_gestorben "$GBT"; then
      touch "$GBT"
      # 03.10.2026 12:30 WECHSELBETRIEB: Mit fester Reihenfolge und N=60 kam der Lauf nie über die erste Klasse hinaus
      # (~11 Produkte/h, Container-Neustart stündlich) — 265 «Restricted adult content» warteten unbegrenzt. Jetzt
      # beginnt jeder Lauf bei der nächsten Klasse (Zähler /tmp/gbt_klasse_idx) und nimmt je Klasse höchstens 8.
      GBT_IDX=$(( ($(cat /tmp/gbt_klasse_idx 2>/dev/null || echo 0) + 1) % 3 )); echo "$GBT_IDX" > /tmp/gbt_klasse_idx
      case "$GBT_IDX" in
        0) GBT_REIHE="'Inappropriate image' 'Restricted adult content' 'Promotional overlay on image'" ;;
        1) GBT_REIHE="'Restricted adult content' 'Promotional overlay on image' 'Inappropriate image'" ;;
        *) GBT_REIHE="'Promotional overlay on image' 'Inappropriate image' 'Restricted adult content'" ;;
      esac
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_google_bild_tausch.lock; flock -n 9 || exit 0; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
          for K in $GBT_REIHE; do \
            KLASSE=\"\$K\" EIN_MODELL=1 SCHARF=1 N=8 timeout 1200 python3 automation/google_bild_tausch.py; done" >> "$GBT" 2>&1 9>&- & )
    fi
  fi
  # GOOGLE REIZWORT-TITEL (04.10.2026, 12-h-Fixlauf): «Sexy …», «Spicy Girl», «verführerisch» im Google-Kanal → sachlich
  # (51 Titel + 19 SEO-Titel; Kanarienvögel 10/10, Hot Wheels/«Sexysmart» bleiben). Täglich, damit Neuimporte nachziehen.
  # Ein zusätzlicher Bildtausch-Tageslauf (N=40) wurde bewusst NICHT eingebaut: der Engpass ist das Groq-Vision-Kontingent
  # (~200k Tokens/Tag je Organisation), nicht N — und dasselbe Modell vergleicht die Variantenbilder echter Bestellungen.
  GRT=/tmp/google_reiztitel.log
  if [ -f "$REPO/automation/google_reiztitel.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GRT" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      touch "$GRT"
      ( cd "$REPO" && SCHARF=1 timeout 900 python3 automation/google_reiztitel.py >> "$GRT" 2>&1 )
      echo "$(date -u +%H:%M) google_reiztitel: $(tail -1 "$GRT" | cut -c1-90)"
    fi
  fi
  # 03.10.2026: drei Bildklassen statt einer (Adult/Überlagerung mit eigenem Prompt); EIN_MODELL=1 greift nur, wenn der
  # Zweitprüfer leer ist (Groq-Tageskontingent JE Modell) — gemessen 35/46 getauschte frei (76 %) gegen 4/19 unberührte.
  # GOOGLE «Image too small» (03.10.2026): zu kleine VARIANTEN-Bilder (< 250 px) per fileUpdate an Ort und Stelle auf 600 px.
  GVG=/tmp/google_variantenbild_gross.log
  if [ -f "$REPO/automation/google_variantenbild_gross.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GVG" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GVG"; then
      touch "$GVG"
      ( cd "$REPO" && SCHARF=1 timeout 1500 python3 automation/google_variantenbild_gross.py >> "$GVG" 2>&1 )
      echo "$(date -u +%H:%M) $(tail -1 "$GVG")"
    fi
  fi
  # TOP-30-PRODUKTSEITEN (04.10.2026, 12-Tage-Plan Tag 5): meistbesuchte Landeseiten (30 T, Menschen) täglich auf
  # kaufbar/301, ≥ 5 Bilder (POD ≥ 2), Grössen-Option bei Kleidung (sonst keine Grössentabelle), 4 Empfehlungen.
  # Schreibt nichts im Shop; Mängel stehen im Log und in der Aufseher-Zeile.
  T30=/tmp/top_produktseiten.log
  if [ -f "$REPO/automation/top_produktseiten_check.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$T30" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$T30"; then
      touch "$T30"
      ( cd "$REPO" && timeout 900 python3 automation/top_produktseiten_check.py > "$T30" 2>&1 )
      echo "$(date -u +%H:%M) $(tail -1 "$T30") · Mängel: $(grep -vE ' ok( |$)|^TOP' "$T30" | awk '{print $NF}' | head -5 | tr '\n' ' ')"
    fi
  fi
  # SEO-VOLL-AUDIT (04.10.2026, Betreiber «semrush push · überprüf alle produkten und fix»): Semrush-Site-Audit-Klassen
  # lokal über alle aktiven Produkte (doppelte Titel/Metas, H1 im Text, zu lang, Alt-Text) und Reparatur NUR an
  # seo.title/seo.description/Alt-Text, Altwerte im Ledger. Semrush selbst crawlt nur 100 Seiten (10'000 Einheiten/Übersicht).
  SVA=/tmp/seo_voll_audit.log
  if [ -f "$REPO/automation/seo_voll_audit.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$SVA" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$SVA"; then
      touch "$SVA"
      ( cd "$REPO" && timeout 1500 python3 automation/seo_voll_audit.py >> "$SVA" 2>&1 \
        && SCHARF=1 timeout 2400 python3 automation/seo_voll_fix.py >> "$SVA" 2>&1 )
      echo "$(date -u +%H:%M) SEO-Voll-Audit: $(grep '^SCHARF' "$SVA" | tail -1)"
      # 08.10.2026 KLIMAAUSSAGEN (Art. 3 Abs. 1 lit. x UWG): liest denselben frischen Export (kein zweiter Bulk), nimmt
      # «klimaneutral»/«spart CO2» aus Produkttexten (Regel automation/data/klima_regel.json, auch im Importer) und
      # meldet veröffentlichte Seiten/Blog/Kollektionen in dropship/KLIMAAUSSAGEN.md. GEMESSEN 08.10.: 11 Produkte + 2 Seiten.
      if [ -f "$REPO/automation/klimaaussagen_wache.py" ]; then
        ( cd "$REPO" && SCHARF=1 timeout 1200 python3 automation/klimaaussagen_wache.py >> "$SVA" 2>&1 )
        echo "$(date -u +%H:%M) $(grep -E '^(FERTIG|PAUSE): KLIMA|^PAUSE' "$SVA" | tail -1)"
      fi
    fi
  fi
  # FILTERGRENZE (04.10.2026): Shopify zeigt KEINE Filter, wenn eine Kollektion > 5'000 aktive Produkte hat (gemessen:
  # Schuhe 5'498 ohne, 4'293 mit; Schmuck & Uhren 4'932 mit). Meldet Menü-Kollektionen ab 4'800, damit Importe sie nicht still kippen.
  FGW=/tmp/filtergrenze_wache.log
  if [ -f "$REPO/automation/filtergrenze_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$FGW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      touch "$FGW"
      ( cd "$REPO" && timeout 600 python3 automation/filtergrenze_wache.py >> "$FGW" 2>&1 )
      echo "$(date -u +%H:%M) $(tail -1 "$FGW")"
    fi
  fi
  # KATEGORIE-KI (04.10.2026, Verbesserungsrunde kategorie-typ): aktive Produkte ohne Kategorie, die KEINE Titelregel
  # trifft, bekommen sie per Zwei-Modell-Einigkeit (Titel + Beschreibung, nur die 93 bekannten Pfade; Eltern/Kind →
  # gröberer Pfad; Kontingent leer → sauberer Abbruch). Läuft NACH kategorie_wache (Regeln zuerst), einmal täglich.
  if [ -f "$REPO/automation/kategorie_ki.py" ]; then
    KK=/tmp/kategorie_ki.log
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && SCHARF=1 MAX=60 timeout 900 python3 automation/kategorie_ki.py >> "$KK" 2>&1 )
      echo "KATEGORIE-KI: $(grep -E '^FERTIG|ABBRUCH' "$KK" | tail -1)"
    fi
  fi
  # ---- Titel-Sonderzeichen + doppelte Stückzahl (04.10.2026, Neuimport-Qualität): täglich, Neuware 72 h + Voll-Export falls frisch
  TS=/tmp/titel_sonderzeichen.log
  if [ -f "$REPO/automation/titel_sonderzeichen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      EXP=""; [ -f /tmp/kost28.jsonl ] && [ $(( $(date +%s) - $(stat -c %Y /tmp/kost28.jsonl) )) -lt 259200 ] && EXP=/tmp/kost28.jsonl
      ( cd "$REPO" && SCHARF=1 EXPORT="$EXP" timeout 1800 python3 automation/titel_sonderzeichen.py >> "$TS" 2>&1 )
    fi
    [ -f "$TS" ] && echo "$(date -u +%H:%M) titel_sonderzeichen: $(tail -n 1 "$TS")"
  fi
  # KATEGORIEN REIN 2 (04.10.2026): Kinder & Baby, Haustier/Hunde/Katzen, Handy, Ladegeräte, Aroma, Büro → Tag kat-… (Bulk-Mutation)
  KR2L=/tmp/kategorie_rein_2.log
  if [ -f "$REPO/automation/kategorie_rein_2.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KR2L" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      touch "$KR2L"
      ( cd "$REPO" && SCHARF=1 timeout 3300 python3 automation/kategorie_rein_2.py >> "$KR2L" 2>&1 )
      echo "$(date -u +%H:%M) kategorie_rein_2: $(grep -c '^==' "$KR2L") Kategorien geprüft · $(grep -c 'Bulk tags' "$KR2L") Bulk-Läufe · $(grep -c '⛔' "$KR2L") gestoppt"
    fi
  fi
# --- Dünne Produkttexte (< 40 Wörter) sachlich neu schreiben — täglich, NACH seo_voll_audit (05.10.2026) ---
DT=/tmp/produkttext_duenn.log
# ⏸ 05.10.2026 03:30: ANGEHALTEN — Prüfer fand in den ersten 44 Texten «Diamanten» bei Strass (UWG), Farben/Grössen ohne Optionen,
# «Leder» neben «Material: Kunststoff», «Grösse 12» aus einem Müll-Namen. Erst Tore reparieren + NACHPRUEFEN, dann Marke löschen.
if [ -f "$REPO/automation/produkttext_duenn.py" ] && [ -s /tmp/seo_voll_audit.json ] && [ ! -f "$REPO/dropship/_duenne_texte_angehalten" ]; then
  ALTER=$(( $(date +%s) - $(stat -c %Y "$DT" 2>/dev/null || echo 0) ))
  if [ "$ALTER" -gt 86400 ]; then
    ( cd "$REPO" && SCHARF=1 LIMIT=40 TEXT_MODELLE="openai/gpt-oss-120b,openai/gpt-oss-20b" timeout 3000 python3 automation/produkttext_duenn.py >> "$DT" 2>&1 )
    echo "DUENNE-TEXTE: $(grep -c '^✍️' "$DT" 2>/dev/null) geschrieben gesamt · $(grep '^BILANZ\|^⏸' "$DT" | tail -1 | cut -c1-140)"
  fi
fi
# RICARDO-FEED (05.10.2026, Betreiber «kannst du ricardo machen»): Fortura-Ware mit ≥ CHF 5 nach 12 % Provision, Bestand LIVE,
# täglich neu nach dropship/ricardo/ricardo_feed.csv (Autocommitter pusht; Ricardo holt die Datei per URL). Meldet nur Fehler.
if [ -f "$REPO/automation/ricardo_feed.py" ] && [ $(( $(date +%s) - $(stat -c %Y /tmp/ricardo_feed.stamp 2>/dev/null || echo 0) )) -gt 86400 ]; then
  touch /tmp/ricardo_feed.stamp
  ( cd "$REPO" && timeout 1800 python3 automation/ricardo_feed.py > /tmp/ricardo_feed.log 2>&1 ) || echo "$(date -u +%H:%M) $(tail -n 1 /tmp/ricardo_feed.log)"
fi
# POPUP-TOR (05.10.2026, Clarity-Befund Betreiber): Newsletter-Popup nie vor 20/30 s und nie neben dem Cookie-Banner.
# Liest die LIVE-Datei sections/footer-group.json alle 6 h; meldet nur, wenn das Tor fehlt (Theme-Editor/App kann überschreiben).
if [ -f "$REPO/automation/popup_tor_wache.py" ] && [ $(( $(date +%s) - $(stat -c %Y /tmp/popup_tor.stamp 2>/dev/null || echo 0) )) -gt 21600 ]; then
  touch /tmp/popup_tor.stamp
  ( cd "$REPO" && timeout 120 python3 automation/popup_tor_wache.py > /tmp/popup_tor.log 2>&1 ) || echo "$(date -u +%H:%M) $(tail -n 1 /tmp/popup_tor.log)"
fi
# ===== Folgerunde 05.10.2026 (wf_f1d1b5b0-276): Wächter aus 11 Bereichen =====
# --- Dünne Texte: Nachprüfung der Tore (05.10.2026, Nachbesserung: Stückzahl-/Set-Tor, Varianten-Tor auch < 40 Wörter) — liest alle Ledger-Handles live, schreibt nichts, CJ nur aus Cache
DTN=/tmp/produkttext_duenn_nachpruefen.log
if [ -f "$REPO/automation/produkttext_duenn.py" ] && [ ! -f "$REPO/dropship/_duenne_texte_angehalten" ] && { [ ! -f "$DTN" ] || [ $(( $(date +%s) - $(stat -c %Y "$DTN") )) -gt 82800 ]; }; then
    ( cd "$REPO" && NACHPRUEFEN=1 BILD_AUS=1 timeout 1500 python3 automation/produkttext_duenn.py > "$DTN" 2>&1 )
    Z=$(grep "^NACHPRUEFEN:" "$DTN" | tail -1)
    T=$(echo "$Z" | grep -o "[0-9]* mit Tor-Treffern" | grep -o "^[0-9]*")
    if [ -n "$T" ] && [ "$T" -gt 0 ]; then
        echo "TEXTE-TORE: ⚠️ $Z — Treffer in $DTN (✗-Zeilen); Wache bleibt an, Treffer von Hand neu schreiben"
        echo "$(date -u +%Y-%m-%dT%H:%MZ) — NACHPRUEFEN $T Tor-Treffer, siehe /tmp/produkttext_duenn_nachpruefen.log" > "$REPO/dropship/_duenne_texte_angehalten"
    else
        echo "TEXTE-TORE: ${Z:-unklar (kein NACHPRUEFEN-Ergebnis)}"
    fi
fi
  # ---- FR-Stand (05.10.2026, Plan Punkt 10; Nachbesserung: Emoji-Handles dekodiert, None = Lücke): Ampel-Zeile, nur lesen, 1×/Tag ----
  FRS=/tmp/fr_stand.log
  if [ -f "$REPO/automation/fr_stand.py" ]; then
    if [ ! -f "$FRS" ] || [ "$(( $(date +%s) - $(stat -c %Y "$FRS") ))" -gt 86400 ]; then
      ( cd "$REPO" && timeout 900 python3 automation/fr_stand.py > "$FRS" 2>&1 )
    fi
    tail -1 "$FRS" 2>/dev/null | grep -q 'FR:' && echo "$(tail -1 "$FRS")" || echo "FR: unklar (kein Ergebnis in $FRS)"
  fi
  # GOOGLE-BILDTAUSCH: SPERRE-PROBE + RÜCKLESE + QUOTE (05.10.2026, Prüfer «Ledger ≠ Live» / «Sperre aus /tmp = 0»):
  # textbild_fix lief als /tmp-Spiegelkopie, bildtausch_sperre.py löste REPO als «/» auf → Sperre leer, 83 Tausche zurückgedreht.
  # Täglich: (1) Sperre GENAU so messen, wie der Aufseher sie nutzt (Import aus /tmp) — 0 heisst Pfad-/Spiegel-Fehler, laut melden;
  # (2) Ledger-neu == live media[0]? sonst nachsetzen (nur ACTIVE + im Google-Kanal); (3) Trefferquote je Art aus dem jüngsten
  # google_feedback_wache-Stand. Alle drei Zeilen gehören in den Tick-Bericht.
  GBR=/tmp/google_bild_ruecklese.log
  if [ -f "$REPO/automation/google_bild_tausch.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GBR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      touch "$GBR"
      SP=$(cd /tmp && python3 -c 'import bildtausch_sperre as b; print(len(b.gesperrte_handles()))' 2>/dev/null || echo 0)
      case "$SP" in ''|*[!0-9]*) SP=0 ;; esac
      if [ "$SP" -gt 0 ]; then echo "$(date -u +%H:%M) BILDTAUSCH-SPERRE aus /tmp = $SP"; \
      else echo "$(date -u +%H:%M) ⚠️ BILDTAUSCH-SPERRE aus /tmp = 0 — textbild_fix/bild_klein_fix würden Tausche zurückdrehen (bildtausch_sperre.py nach /tmp spiegeln, REPO prüfen)"; fi
      ( cd "$REPO" && SCHARF=1 timeout 1200 python3 automation/google_bild_tausch.py --ruecklesen >> "$GBR" 2>&1 )
      echo "$(date -u +%H:%M) $(grep RUECKLESE "$GBR" | tail -1 | cut -c1-160)"
      ( cd "$REPO" && timeout 120 python3 automation/google_bildtausch_bilanz.py 2>&1 | tail -1 | cut -c1-200 )
    fi
  fi
  # ── Jury-Kontingent (05.10.2026, neu, z. B. direkt nach der REEL-KADENZ-Zeile): sagt in jedem Tick, ob alle Bild-Jurys leer sind
  #    (Gemini 402, OpenAI leer, Groq-Bildmodell qwen/qwen3.8-27b auf jedem Schlüssel gemerkt) und ob der Rückfall auf frühere ok-Urteile trägt.
  #    Kein Aufruf eines Modells, nur Marken + Jury-Cache; Prüferbefund Plan 23: «kein Urteil» blockierte IG/FB-Reels 16 Ticks lang unsichtbar.
  if [ -f "$REPO/automation/gemini_jury.py" ] && [ $(( $(date +%s) - $(stat -c %Y /tmp/jury_kontingent.stamp 2>/dev/null || echo 0) )) -gt 3600 ] && touch /tmp/jury_kontingent.stamp && ( cd "$REPO" && timeout 60 python3 automation/gemini_jury.py x --kontingent >/dev/null 2>&1 ); then
    JR=0; for u in $(cd "$REPO" && python3 -c "import csv;[print(r['video_url']) for r in csv.DictReader(open('automation/reels_seed.csv',encoding='utf-8')) if r['status']=='ready' and 'instagram' in r['platforms']]" 2>/dev/null); do
      ( cd "$REPO" && timeout 30 python3 automation/gemini_jury.py "$u" --rueckfall-pruefen >/dev/null 2>&1 ) && JR=$((JR+1)); done
    echo "⚠️ JURY-KONTINGENT: alle Bildmodelle leer (Marken /tmp/groq_leer_1..3 $(stat -c %y /tmp/groq_leer_1 2>/dev/null | cut -c12-16) UTC) · Rückfall trägt $JR ready-Reel(s) · Story/Bild warten · $(wc -l < "$REPO/dropship/_jury_rueckfall.tsv" 2>/dev/null || echo 0) Rückfall-Posts gesamt"
  fi
  # ── GROQ-VORRANG-RESERVE (05.10.2026, Verbesserungsrunde): Bildmodell auf Schlüssel 3 nur für Posts (gemini_jury.py) und
  #    Bestellungen (cj_variante_bild.py) — Massenläufe hatten es um 04:20/10:33 aufgebraucht, die Jury lehnte jeden Post ab.
  #    Stündlich: Selbsttest der Regel (6 Kanarienvögel, ohne Modellaufruf); meldet nur bei Fehler.
  if [ -f "$REPO/automation/zweitmodell.py" ]; then
    ( cd "$REPO" && timeout 30 python3 automation/zweitmodell.py --reserve-test >/tmp/groq_reserve_test.log 2>&1 ) \
      || echo "⚠️ GROQ-RESERVE: $(tail -n 1 /tmp/groq_reserve_test.log) — Massenläufe könnten das Post-Kontingent wieder aufbrauchen"
  fi
# SUCHE-WACHE (05.10.2026, Bereich Suche, FIX-12H Punkt 11): misst täglich, ob die Shop-Vorschlagsliste die 26 volumenstärksten
# Semrush-Begriffe trifft und ob oben Fremdware steht («schuhe» → Schulrucksäcke). Nur lesend (Storefront, kein Token), Ledger
# dropship/_suche_wache.tsv, Bericht dropship/SUCHE-2026-10-05.md. suchwort_tags.py läuft weiter in der Werkzeug-Schleife oben.
SW=/tmp/suche_wache.log
if [ -f "$REPO/automation/suche_wache.py" ]; then
  ALTER=$(( $(date +%s) - $(stat -c %Y "$SW" 2>/dev/null || echo 0) ))
  if [ "$ALTER" -gt 86400 ]; then
    ( cd "$REPO" && echo "$(date -u +%FT%TZ) START suche_wache (Aufseher)" >> "$SW" && timeout 600 python3 automation/suche_wache.py >> "$SW" 2>&1 )
    echo "$(date -u +%H:%M) suche_wache gelaufen: $(grep -E '^SUCHE' "$SW" | tail -1)"
  fi
  grep -E '^SUCHE' "$SW" 2>/dev/null | tail -1
fi
  # 05.10.2026 (titel-neuimport, Nachbesserung Prüfer): SEO-Titel-Grenze — Shopify kappt seo.title still bei 70 Zeichen; die Importer
  # bauen ihn jetzt über seo_titel.mjs, der Bestand wird täglich repariert (nur Klassen gekappt/Doppelmenge, Rücklesen = Gleichheit,
  # Ledger dropship/_seo_titel_grenze.tsv) und danach ziehen Bild-Alts korrigierter Titel nach (alt_nach_titel.py, Ledger _alt_nach_titel.tsv).
  # Ampel «SEO-TITEL: …» bei jedem Lauf (leer = Titel ist KEIN Fehler, Theme zeigt «Titel – LuxeStyle»).
  if [ ! -f /tmp/seo_titel_grenze_$(date -u +%F) ] && [ -f "$REPO/automation/seo_titel_grenze.py" ]; then
    touch "/tmp/seo_titel_grenze_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_seo_titel_grenze.lock; flock -n 9 || exit 0; SCHARF=1 TAGE=14 timeout 600 python3 automation/seo_titel_grenze.py | tail -2; SCHARF=1 timeout 900 python3 automation/alt_nach_titel.py | tail -1" \
        >> /tmp/seo_titel_grenze.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start seo_titel_grenze + alt_nach_titel (täglich)"
  fi
  if [ -f "$REPO/automation/seo_titel_grenze.py" ]; then
    ( cd "$REPO" && NUR=messen TAGE=14 timeout 120 python3 automation/seo_titel_grenze.py 2>/dev/null || echo "SEO-TITEL: unklar (Messung ohne Antwort)" )
  fi
  # 📰 BLOG-LINKZIELE + BLOG-PREISE (05.10.2026, Fix-12h Punkt 18; Nachbesserung 07:30: beide Wachen lesen jetzt auch ABSOLUTE
  # luxestyle.ch-Links — 49 Stueck in den Artikeln, einer war echt tot und wurde uebersehen). blog_linkziele_wache.py misst AM URSPRUNG
  # (Admin-API, nicht der Bot-Cache unserer IP; Filterrouten /collections/<k>/<tag> und Redirects gelten als lebendig) und schreibt
  # NICHTS — Ampel «BLOG-LINKS: N tote Ziele …», Details /tmp/blog_linkziele.json; tote Ziele → Hand-Zuordnung
  # (dropship/BLOG-BEWERTUNGEN-2026-10-05.md, Muster scratchpad/blog_nachbesserung_fix.py), nie Entwürfe republizieren.
  # blog_preise_aktualisieren.py SCHREIBT (articleUpdate ersetzt den ganzen Body → nie parallel zu anderen Blog-Schreibern,
  # darum shopify_schranke + eigener flock): Live-Preis in Anker/Karte, «(Stand …)» auf heute, Ledger
  # dropship/_blog_preise_ledger.tsv + Vorher-Bodies dropship/_blog_preise_vorher/. Beide ~20–60 s, einmal am Tag.
  BLW=/tmp/blog_linkziele_wache.log; BPA=/tmp/blog_preise_aktualisieren.log
  if [ -f "$REPO/automation/blog_linkziele_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BLW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BLW"; then
      touch "$BLW"
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_blog_linkziele.lock; flock -n 9 || exit 0; exec >> \"$BLW\" 2>&1; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
           exec bash automation/shopify_schranke.sh python3 automation/blog_linkziele_wache.py" 9>&- & )
    fi
    if [ -s "$BLW" ] && tail -n 3 "$BLW" | grep -q "Traceback\\|BLOG-LINKS: unklar"; then
      echo "$(date -u +%H:%M) ⚠️ Blog-Linkziele: letzter Lauf unklar ($BLW)"
    elif [ -s "$BLW" ]; then
      Z=$(grep '^BLOG-LINKS:' "$BLW" | tail -n 1); echo "$(date -u +%H:%M) $Z"
      echo "$Z" | grep -q '^BLOG-LINKS: 0 tote' || echo "$(date -u +%H:%M) ⚠️ Blog verlinkt tote Ziele — Hand-Zuordnung nach dropship/BLOG-BEWERTUNGEN-2026-10-05.md"
    fi
  fi
  if [ -f "$REPO/automation/blog_preise_aktualisieren.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BPA" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BPA"; then
      touch "$BPA"
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_blog_preise.lock; flock -n 9 || exit 0; exec >> \"$BPA\" 2>&1; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
           SCHARF=1 LIMIT=40 exec bash automation/shopify_schranke.sh python3 automation/blog_preise_aktualisieren.py" 9>&- & )
    fi
    if [ -s "$BPA" ] && tail -n 3 "$BPA" | grep -q "Traceback\\|BLOG-PREISE: unklar"; then
      echo "$(date -u +%H:%M) ⚠️ Blog-Preise: letzter Lauf unklar ($BPA)"
    elif [ -s "$BPA" ]; then
      echo "$(date -u +%H:%M) $(grep '^BLOG-PREISE:' "$BPA" | tail -n 1)"
    fi
  fi
# INTERNE-LINKS (05.10.2026, Semrush-Umsetzung 2): ls-verwandt-Blöcke in 149 Kollektionstexten — Ziele müssen kaufbar bleiben.
# Wöchentlich (Montag, einmal über Stempel): prüfen, dann idempotent ergänzen (nur fehlende Blöcke neuer Kollektionen). Rückweg: --zurueck.
ILW=/tmp/interne_links_$(date -u +%G-%V).stamp
if [ -f "$REPO/automation/interne_links.py" ] && [ "$(date -u +%u)" = "1" ] && [ ! -f "$ILW" ]; then
  touch "$ILW"
  ( cd "$REPO" && timeout 900 python3 automation/interne_links.py --pruefen 2>&1 | tail -1 | tee -a /tmp/interne_links.log )
  ( cd "$REPO" && SCHARF=1 timeout 1800 python3 automation/interne_links.py --scharf >> /tmp/interne_links.log 2>&1; grep "^geschrieben" /tmp/interne_links.log | tail -1 )
fi
# REGEL-KANARIEN (05.10.2026, Semrush Runde 3): Welten/Anker in interne_links.py + Semrush-Kategorien (169 Fälle) — stündlich,
# < 1 s, ohne Shop. Fehler = eine Regeländerung kippt einen bekannten Fall → melden (die Tagesläufe würden Fremdware taggen/verlinken).
RK1=$(cd "$REPO" && timeout 60 python3 automation/interne_links.py --kanarien 2>&1 | tail -1)
RK2=$(cd "$REPO" && timeout 60 python3 automation/kategorie_rein_semrush.py 2>&1 | tail -1)
case "$RK1 $RK2" in *"Fehler 0"*"Fehler 0"*) : ;; *) echo "$(date -u +%H:%M) ⚠️ REGEL-KANARIEN: interne_links «$RK1» · semrush-kategorien «$RK2»" ;; esac
# --- Checkout-Abbruch-Ampel (05.10.2026, dropship/CHECKOUT-ABBRUCH-2026-10-05.md) — täglich, nur messen (Probelauf 08:05 UTC ok).
if [ -f "$REPO/automation/checkout_abbruch_messen.py" ] && [ ! -f /tmp/checkout_abbruch_$(date -u +%F).stamp ]; then
  touch /tmp/checkout_abbruch_$(date -u +%F).stamp
  ( cd "$REPO" && timeout 170 python3 automation/checkout_abbruch_messen.py 2>&1 | tail -1 | tee -a /tmp/checkout_abbruch.log )
fi
# --- Mengenangaben in Kollektionstexten (08.10.2026, Plan Tag 10, dropship/SEO-TAG10-2026-10-08.md) — täglich:
#     «über 7'000 Artikel» stand bei 4'913 aktiven, «rund 160» bei 250 — Draften/Neuimporte verschieben die Zahl jeden Tag.
#     kollektion_mengen_wache.py führt «über/rund N Artikel» auf zwei Stellen nach (Kanarien 12/12, Altwert im Ledger).
if [ -f "$REPO/automation/kollektion_mengen_wache.py" ] && [ ! -f /tmp/kollektion_mengen_$(date -u +%F).stamp ]; then
  touch /tmp/kollektion_mengen_$(date -u +%F).stamp
  ( cd "$REPO" && SCHARF=1 setsid timeout 1500 bash automation/shopify_schranke.sh python3 automation/kollektion_mengen_wache.py >> /tmp/kollektion_mengen.log 2>&1 & )   # Hintergrund: Aufseher wartet nicht
fi
# --- «Winter & Kälte» per Tag (08.10.2026, dropship/SEO-TAG10-2026-10-08.md) — täglich, auch Neuimporte:
#     Titel-ODER-Regel zog Boxhandschuhe, Lockenstab «mit Keramikheizung», beheizbare Wimpernzangen … (27/497) → Tag aus
#     data/winter_kaelte.json (ja minus nein, Kanarien 26/26), Kollektion = Tag-Regel. Hintergrund, Aufseher wartet nicht.
if [ -f "$REPO/automation/winter_kaelte_tags.py" ] && [ ! -f /tmp/winter_kaelte_$(date -u +%F).stamp ]; then
  touch /tmp/winter_kaelte_$(date -u +%F).stamp
  ( cd "$REPO" && SCHARF=1 setsid timeout 2400 bash automation/shopify_schranke.sh python3 automation/winter_kaelte_tags.py >> /tmp/winter_kaelte.log 2>&1 & )
fi
# --- Versand-Hinweis im Warenkorb-Drawer (06.10.2026, dropship/WARENKORB-GRATISVERSAND-2026-10-06.md) — täglich prüfen:
#     Hinweis noch im Live-Snippet (Theme-Updates überschreiben Snippets), Tarif CH 7.00 / gratis ab ≤ 45 passt zum Text.
#     Fehlt nur der Hinweis → einmal neu einfügen (idempotent, Anker-geprüft, Sicherung in /tmp); Tarif-Abweichung nur melden.
if [ -f "$REPO/automation/warenkorb_gratisversand.py" ] && [ ! -f /tmp/warenkorb_versand_$(date -u +%F).stamp ]; then
  touch /tmp/warenkorb_versand_$(date -u +%F).stamp
  WV=$(cd "$REPO" && timeout 120 python3 automation/warenkorb_gratisversand.py --pruefen 2>&1 | tail -1)
  case "$WV" in
    *"Hinweis fehlt"*) ( cd "$REPO" && SCHARF=1 timeout 120 python3 automation/warenkorb_gratisversand.py 2>&1 | tail -1 ) | sed "s/^/$(date -u +%H:%M) warenkorb-versand neu: /" ;;
    *"⚠️"*) echo "$(date -u +%H:%M) $WV" ;;
  esac
  echo "$WV" >> /tmp/warenkorb_versand.log
fi
# --- Google: Rückgabe-/Versandregel als Organization-Markup (06.10.2026, dropship/GOOGLE-ORG-RICHTLINIEN-2026-10-06.md) — täglich:
#     Markup noch im Live-Header? Tarif (CHF 7 / gratis ab 45) = Markup? Fehlt nur das Markup → einmal neu einfügen.
if [ -f "$REPO/automation/google_org_richtlinien.py" ] && [ ! -f /tmp/google_org_richtlinien_$(date -u +%F).stamp ]; then
  touch /tmp/google_org_richtlinien_$(date -u +%F).stamp
  GO=$(cd "$REPO" && timeout 120 python3 automation/google_org_richtlinien.py --pruefen 2>&1 | tail -1)
  case "$GO" in
    *"Markup fehlt"*) ( cd "$REPO" && SCHARF=1 timeout 120 python3 automation/google_org_richtlinien.py 2>&1 | tail -1 ) | sed "s/^/$(date -u +%H:%M) google-org-richtlinien neu: /" ;;
    *"⚠️"*) echo "$(date -u +%H:%M) $GO" ;;
  esac
  echo "$GO" >> /tmp/google_org_richtlinien.log
fi
# --- Hype-Recherche OHNE Session (06.10.2026, Betreiber «tool installieren selber programmieren»): eigenes «Perplexity»
#     (tools/recherche.py, Groq gpt-oss + browser_search) → Produktarten → Gegenprobe productsCount → dropship/HYPE-RECHERCHE.md.
#     Täglich einmal; THEMEN in hype_kuratieren.py ändert weiter nur die Verbesserungsrunde (Ablehnungsklassen).
if [ -f "$REPO/automation/hype_recherche.py" ] && [ ! -f /tmp/hype_recherche_$(date -u +%F).stamp ] && [ "$(date -u +%H)" -ge 6 ]; then
  touch /tmp/hype_recherche_$(date -u +%F).stamp
  HR=$(cd "$REPO" && timeout 400 python3 automation/hype_recherche.py 2>&1 | tail -1)
  echo "$(date -u +%F\ %H:%M) $HR" >> /tmp/hype_recherche.log
  case "$HR" in *FEHLER*|*kaputt*) echo "$(date -u +%H:%M) ⚠️ $HR" ;; esac
fi
  # 05.10.2026 (Fixlauf preis-marge): EK-Lücke CJ + Neuware-Verlustschutz, täglich. 87 aktive CJ-Produkte ohne EK waren für
  # preis_verlustschutz unsichtbar (10 echte Verlustbringer, 47 bei CJ ausgelistet); Neuimporte kennt der Tagesläufer erst mit dem
  # nächsten Voll-Export (371 Varianten unter Boden am 05.10.). ek_luecke_cj.py: Backfill/Nachtrag NUR_IDS → Verlustschutz live →
  # alle Produkte der letzten 36 h live → Rest ohne EK bei CJ 1602002 DRAFT. Braucht /tmp/kost28.jsonl (Kosten-Kette) und CJ-Token.
  EKL=/tmp/ek_luecke_cj.log
  if [ -f "$REPO/automation/ek_luecke_cj.py" ] && [ -f /tmp/kost28.jsonl ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$EKL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      echo "=== $(date -u '+%F %T') Start durch fixer_keepalive ===" >> "$EKL"
      ( cd "$REPO" && SCHARF=1 CAP=60 timeout 3000 python3 automation/ek_luecke_cj.py >> "$EKL" 2>&1 )
      echo "ek_luecke_cj: $(tail -1 "$EKL" | cut -c1-140)"
    fi
  fi
# ZUSAGEN-ABGLEICH (05.10.2026, Bereich Vertrauen & Recht): misst täglich die Widerspruchs-Phrasen (Keine Fragen,
# Geld-zurück, Versand aus Belp, 7 Tage die Woche, verbotene Seiten-Phrasen) und bringt den Produktblock idempotent
# zurück auf die Richtlinie. Seiten/Policies werden nur gemessen (einmalige Ersetzungen, schon erledigt).
ZA=/tmp/zusagen_abgleich.log
if [ -f "$REPO/automation/zusagen_abgleich.py" ]; then
  ALTER=$(( $(date +%s) - $(stat -c %Y "$ZA" 2>/dev/null || echo 0) ))
  if [ "$ALTER" -gt 86400 ]; then
    ( cd "$REPO" && exec 9>/tmp/lock_produkttext.lock && flock -w 240 9 && SCHARF=1 CAP=300 NUR=produkte timeout 900 python3 automation/zusagen_abgleich.py >> "$ZA" 2>&1 )
    ( cd "$REPO" && timeout 300 python3 automation/zusagen_abgleich.py >> "$ZA" 2>&1 )
    echo "$(date -u +%H:%M) zusagen_abgleich gelaufen: $(grep -E '^(ZUSAGEN|RABATT-TERMINE)' "$ZA" | tail -1)"
  fi
  grep -E '^(ZUSAGEN|RABATT-TERMINE)' "$ZA" 2>/dev/null | tail -1
fi
  # 🎞️ REEL-CDN-ABGLEICH (05.10.2026, Social-Gesundheit): ready-Reels, deren lokale Datei ≠ CDN-Kopie (neu gerendert, CDN alt)
  # → CDN per fileUpdate ersetzen + Adresse in reels_seed.csv nachtragen. Ohne das sehen Poster/Metricool den alten Bildpreis.
  RCDN=/tmp/reel_cdn_abgleich.log
  if [ -f "$REPO/automation/reel/reel_neu_rendern.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$RCDN" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      touch "$RCDN"
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_reel_tor_reparatur.lock; flock -n 9 || exit 0; echo START \$(date -u +%FT%H:%MZ); \
           MODUS=cdn SCHARF=1 timeout 1500 python3 automation/reel/reel_neu_rendern.py | grep -E 'ERSETZT|GESCHEITERT|FERTIG'; \
           bash automation/git_sichern.sh 'Reel-CDN-Abgleich [skip ci]' automation/reels_seed.csv" \
          >> "$RCDN" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) start reel_cdn_abgleich (täglich, ready-Reels lokal≠CDN)"
    fi
  fi
# ── Mobil & Tempo (05.10.2026): 4 Theme-Patches idempotent halten (Preload LCP-Hero, Lazy-Autoplay Videos, Mobil-sizes, srcset-Stufen).
#    Theme-Editor/Horizon-Update kann sie überschreiben; findet ein Patch seinen Anker nicht (Tati-Block gelöscht), lässt er die Datei in Ruhe.
LOG=/tmp/mobil_tempo_patch.log
if [ -f "$REPO/automation/mobil_tempo_patch.py" ]; then ALTER=$(( $(date +%s) - $(stat -c %Y "$LOG" 2>/dev/null || echo 0) )); else ALTER=0; fi
if [ "$ALTER" -gt 86400 ]; then
  ( cd "$REPO" && SCHARF=1 timeout 300 python3 automation/mobil_tempo_patch.py >> "$LOG" 2>&1 )
  echo "MOBIL-TEMPO: $(grep -c 'schon gepatcht' "$LOG" | tail -1) Patches geprüft · $(tail -1 "$LOG" | cut -c1-120)"
fi
# ── Bildlast beim Öffnen (08.10.2026, Plan-Tag 11): Startseite 390 px OHNE Scrollen. Vorher 150 Bilddateien / 9'390 KB
#    (Horizon product-card.js nahm jedem Karussell-Zweitbild das lazy weg; Cover immer eager) → mobil_tempo_patch_2.py: 38 / 1'008 KB.
#    Täglich: Patch idempotent halten (Theme-Update überschreibt assets/product-card.js) + messen (Grenze 60 Bilder / 3'000 KB → ⚠️).
BLL=/tmp/startseite_bildlast.log
if [ -f "$REPO/automation/startseite_bildlast.mjs" ]; then ALTER=$(( $(date +%s) - $(stat -c %Y "$BLL" 2>/dev/null || echo 0) )); else ALTER=0; fi
if [ "$ALTER" -gt 86400 ]; then
  echo "START $(date -u +%FT%H:%MZ)" >> "$BLL"
  ( cd "$REPO" && SCHARF=1 timeout 300 python3 automation/mobil_tempo_patch_2.py 2>&1 | grep -E '^  |geschrieben|Rücklesen|FEHLER' >> "$BLL" )
  ( cd "$REPO" && setsid bash -c "timeout 240 /opt/node22/bin/node automation/startseite_bildlast.mjs" >> "$BLL" 2>&1 & )
  echo "$(date -u +%H:%M) start startseite_bildlast (täglich) · letzte: $(grep '^BILDLAST' "$BLL" | tail -1 | cut -c1-150)"
fi
  # KATEGORIEN REIN (04.10.2026): Titel ∧ Produkttyp ∧ Ausschluss je Menü-Kategorie → Tag kat-… (Ringe, Taschen, Deko, …)
  KRL=/tmp/kategorie_rein.log
  if [ -f "$REPO/automation/kategorie_rein.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KRL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$KRL"; then
      touch "$KRL"
      ( cd "$REPO" && SCHARF=1 timeout 3000 python3 automation/kategorie_rein.py >> "$KRL" 2>&1 )
      echo "$(date -u +%H:%M) kategorie_rein: $(grep -c '^==' "$KRL") Kategorien geprüft"
    fi
  fi
  # AKTIV OHNE BILD (01.10.2026, Speicher-Weg B): Rückholer schalten Entwürfe ACTIVE, ohne Bilder zu prüfen. Wer den Tag
  # `bilder-geloescht-speicher` trägt und aktiv ohne Bild ist, geht zurück auf DRAFT (`wartet-auf-bilder`). Eine Suchabfrage.
  if [ -f "$REPO/automation/aktiv_ohne_bild_wache.py" ]; then
    AOB=$( cd "$REPO" && timeout 120 python3 automation/aktiv_ohne_bild_wache.py 2>&1 | tail -1 )
    case "$AOB" in "FERTIG: 0 aktive ohne Bild → DRAFT, 0 "*) ;; *) echo "$(date -u +%H:%M) aktiv_ohne_bild: $AOB" ;; esac
  fi
  # PINTEREST-PINS, einmal taeglich (22.09.2026, Betreiber «push mehr» Besucher): legt N Auftraege fuer den
  # Hetzner-Agenten an (je Auftrag EIN Pin, Quittung ueber auftraege/erledigt + Pinnwand). Pinterest steht nicht
  # unter dropship/_SOCIAL_STOPP. Idempotent: gibt es heute schon Auftraege, passiert nichts.
  PP=/tmp/pinterest_pins_planen.log
  if [ -f "$REPO/automation/pinterest_pins_planen.sh" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$PP" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$PP"; then
      touch "$PP"
      ( cd "$REPO" && bash automation/pinterest_pins_planen.sh >> "$PP" 2>&1 )
      echo "$(date -u +%H:%M) pinterest_pins_planen: $(tail -1 "$PP")"
    fi
  fi
  # RANKENDE SEITEN, einmal taeglich. Zwei Dinge, die nur dort zaehlen, wo Google uns
  # schon zeigt — dem einzigen Kanal mit belegten Verkaeufen:
  # (1) tote_rankings.py: rankt eine Adresse, die es nicht mehr zu kaufen gibt und die
  #     auch keine 301 auffaengt? Jeder Draft-Lauf kann so eine Seite still toeten.
  #     ⚠️ MELDET NUR. Welcher Ersatz richtig ist, haengt am Produkt; ein Draft wird nie
  #     veroeffentlicht, um einen Link zu retten (nicht bestellbar = teurer als ein 404).
  # (2) snippet_rankende_seiten.py: setzt den Suchergebnis-Text aus dem ersten Satz der
  #     Beschreibung. Schreibt nur bei Bausteintext, laesst eigene Texte in Ruhe.
  TRK=/tmp/tote_rankings.log
  if [ -f "$REPO/automation/tote_rankings.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TRK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TRK"; then
      touch "$TRK"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_tote_rankings.lock; flock -n 9 || exit 0; exec python3 automation/tote_rankings.py" >> "$TRK" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tote-rankings geprüft"
    fi
  fi
  # (3) startseiten_video_wahrheit.py (05.09.2026): Das Spotlight-Video der Startseite
  #     traegt Preise und Titel EINGEBRANNT — was fest im Video steht, altert wie fest
  #     getippte Preise im HTML (lux_spotlight_favs, 30.08.). Haelt das Manifest
  #     dropship/_startseiten_video.json taeglich gegen den Shop. ⚠️ MELDET NUR.
  SVW=/tmp/startseiten_video.log
  if [ -f "$REPO/automation/startseiten_video_wahrheit.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$SVW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$SVW"; then
      touch "$SVW"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_startseiten_video.lock; flock -n 9 || exit 0; exec python3 automation/startseiten_video_wahrheit.py" >> "$SVW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) startseiten-video geprüft"
    fi
  fi
  # 05.09.2026: Wache über die FREMDE Social-Warteschlange (Metafeld luxestyle.social_queue), aus der
  # ein PC-Skript täglich 17:00 MESZ auf Instagram postet — ohne unsere Doppelpost-/Wahrheits-Wachen.
  # Alle 6 h, damit die 06:00-Füllung der anderen Session vor 15:00 UTC geprüft ist. FIX=1 pausiert
  # (umkehrbar), MELDET in dropship/SOCIAL-QUEUE-WACHE.md.
  SQW=/tmp/social_queue_wache.log
  if [ -f "$REPO/automation/social_queue_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$SQW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 21600 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_social_queue_wache.lock; flock -n 9 || exit 0; FIX=1 exec python3 automation/social_queue_wache.py" >> "$SQW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) social-queue-wache gestartet"
    fi
  fi
  SNP=/tmp/snippet_rankende.log
  if [ -f "$REPO/automation/snippet_rankende_seiten.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$SNP" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$SNP"; then
      touch "$SNP"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # Erst die rankenden Seiten (schnell, meist ein No-op), dann eine Tagesrate aus dem
      # Katalog. Der Shop steht auf KEINER Seite 1 — die Suchverkaeufe kommen aus dem langen
      # Schwanz, also ist jede Produktseite ein Los und ein Baustein-Snippet verschenkt es.
      # CAP haelt den Lauf klein, damit er sich nicht mit dem CJ-Grind um Shopifys Eimer prügelt.
      ( cd "$REPO" && setsid sh -c 'python3 automation/snippet_rankende_seiten.py;
          MODUS=katalog CAP=250 python3 automation/snippet_rankende_seiten.py' >> "$SNP" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) snippet-rankende + katalog gestartet"
    fi
  fi
  # KOSTENWAHRHEIT, einmal täglich: `cj_kosten_backfill.mjs` trug bis zum 28.08. eine eigene
  # Frachtrechnung mit `max(15, …)` — ein Boden, der seit dem 23.08. widerlegt ist (CJ live:
  # 20 g → CHF 4.34). Unterhalb von 712 g bläht er jede Kostenzahl um bis zu CHF 10 auf.
  # Folge: 4'042 aktive Produkte galten als «unter Einstand», obwohl sie Gewinn bringen —
  # und diese Zahl ist die Grundlage JEDER Margenentscheidung.
  # Der Lauf rechnet die alte Fracht heraus und die richtige ein; er braucht dafür KEINE
  # CJ-Punkte, die Zahlen stehen alle in Shopify. Preise werden NICHT angefasst.
  # ⚠️ Zuerst der Export, sonst läuft die Korrektur ins Leere. Beide sind selbst-drosselnd:
  # der Export baut nur, wenn seiner älter als ein Tag ist.
  KOS=/tmp/kosten_boden15.log
  if [ -f "$REPO/automation/kosten_boden15_korrigieren.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KOS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$KOS"; then
      touch "$KOS"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c '
          python3 automation/kosten_export_bauen.py &&
          SIGNATUR=1 LIMIT=5000 python3 automation/kosten_boden15_korrigieren.py   # 05.10. Betreiber «nicht drosseln»: 400 → 5000' >> "$KOS" 2>&1 9>&- & )
      # 21.09.: && — der Export-Bauer gibt bei unvollstaendigem Download Exit 3; vorher lief der
      # Verbraucher trotzdem und starb jede Nacht an einem JSONDecodeError (Log 02:13).
      echo "$(date -u +%H:%M) kostenwahrheit nachgezogen"
    fi
  fi
  TTK=/tmp/tiktok_karussell.log
  if [ -f "$REPO/automation/tiktok_karussell.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TTK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TTK"; then
      touch "$TTK"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c '
          # 24.09.2026 «pushe mehr herbstsachen»: bis 30.11. an geraden Tagen das TikTok-Produkt-Set aus den Herbst-Favoriten
          if [ "$(date -u +%Y%m%d)" -le 20261130 ] && [ $(( $(date -u +%j | sed "s/^0*//") % 2 )) = 0 ]; then
            MODUS=produkt ANZAHL=1 QUELLE=herbst-favoriten KICKER="Herbst-Favorit" python3 automation/tiktok_karussell.py
          else
            MODUS=produkt ANZAHL=1 python3 automation/tiktok_karussell.py
          fi
          MODUS=top ANZAHL=1 SLIDES=7 SLUGZEIT=$(date -u +%m%d) python3 automation/tiktok_karussell.py
          # 23.09.2026 Instagram-Karussells (4:5): taeglich 2 Produkt-Sets, montags dazu ein Top-Set; danach
          # Push, weil der Autocommitter nur dropship/ mitnimmt und Instagram die Bilder von raw.githubusercontent holt.
          # 24.09.2026: bis 30.11. eines der zwei IG-Sets aus den Herbst-Favoriten (Saisonware: KICKER statt «Neu im Shop»)
          if [ "$(date -u +%Y%m%d)" -le 20261130 ]; then
            FORMAT=ig MODUS=produkt ANZAHL=1 python3 automation/tiktok_karussell.py
            FORMAT=ig MODUS=produkt ANZAHL=1 QUELLE=herbst-favoriten KICKER="Herbst-Favorit" python3 automation/tiktok_karussell.py
          else
            FORMAT=ig MODUS=produkt ANZAHL=2 python3 automation/tiktok_karussell.py
          fi
          [ "$(date -u +%u)" = 1 ] && FORMAT=ig MODUS=top ANZAHL=1 SLIDES=7 SLUGZEIT=$(date -u +%m%d) python3 automation/tiktok_karussell.py
          bash automation/git_sichern.sh "IG-Karussell-Slides [skip ci]" social/instagram social/ig_karussell.csv >/dev/null || echo "IG-Slides: Push fehlgeschlagen"
          python3 automation/tiktok_video.py
          python3 automation/tiktok_cowork_auftrag.py' >> "$TTK" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tiktok-karussell gebaut + Cowork-Auftrag fortgeschrieben"
    fi
  fi
  # Post-Kontrolle (31.08.): merkt, wenn der PC-Autoposter (schtasks 17:31) steht —
  # 3 Tage unveraenderter videoCount bei freier Queue = Bericht. MELDET NUR.
  TPK=/tmp/tiktok_post_kontrolle.log
  if [ -f "$REPO/automation/tiktok_post_kontrolle.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TPK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TPK"; then
      touch "$TPK"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c '
          python3 automation/tiktok_post_kontrolle.py' >> "$TPK" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tiktok-post-kontrolle gestartet"
    fi
  fi
  # Woechentliches Kompilations-Reel («Meisterwerk», Betreiber-Auftrag 30.08.): reiht die
  # gepruueften Hook-Slides der Woche zu EINEM Reel. Sonntags, einmal pro Woche.
  MWL=/tmp/tiktok_meisterwerk.log
  if [ -f "$REPO/automation/tiktok_meisterwerk.py" ] && [ "$(date -u +%u)" = "7" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$MWL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 518400 ]; then
      ( cd "$REPO" && setsid bash -c '
          python3 automation/tiktok_meisterwerk.py
          python3 automation/tiktok_cowork_auftrag.py' >> "$MWL" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tiktok-meisterwerk gebaut"
    fi
  fi
  TLS=/tmp/tote_landeseiten.log
  if [ -f "$REPO/automation/tote_landeseiten.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TLS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TLS"; then
      touch "$TLS"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_tote_landeseiten.lock; flock -n 9 || exit 0; FIX=1 exec python3 automation/tote_landeseiten.py" >> "$TLS" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tote-landeseiten geprüft"
    fi
  fi
  # GOOGLE-ATTRIBUT `size`, einmal täglich: Google verlangt es bei Bekleidung und Schuhen;
  # fehlt es, wird das Angebot in Shopping-Ergebnissen beschnitten — im einzigen Kanal mit
  # belegten Verkäufen. Am 28.08.2026 trug KEIN geprüftes Kleid ein `size`, obwohl alle eine
  # saubere Grössen-Option haben. `cj_category_fill.mjs` schreibt es seither selbst mit;
  # `cj_sku_import` und `cj_trending_import` schreiben gar keine Varianten-Attribute — für
  # deren Ware ist DIESER Lauf der Schreiber beim nächsten Produkt.
  GS=/tmp/google_size_metafeld.log
  if [ -f "$REPO/automation/google_size_metafeld.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GS"; then
      touch "$GS"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_google_size_metafeld.lock; flock -n 9 || exit 0; FIX=1 CAP=1200 exec python3 automation/google_size_metafeld.py" >> "$GS" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) google-size Nachtrag gestartet"
    fi
  fi
  # RATGEBER-RÜCKVERWEIS, einmal täglich: Die veröffentlichten Ratgeber holen Google-Besucher
  # und verlinken von dort auf Produkte — der Weg zurück fehlte am 28.08.2026 bei 67 von 67
  # Produkten. Wer über Google direkt auf der PRODUKTSEITE landet (beim Rizinusöl-Set 43 von
  # 391 Sitzungen in 30 Tagen, die zweitgrösste Landeseite des Shops), findet dort keine
  # Antwort auf «wie wende ich das an» — obwohl der Shop genau diesen Text besitzt. Der Lauf
  # hängt NUR an; jeder neue Ratgeber erzeugt neue Lücken, deshalb täglich.
  RV=/tmp/ratgeber_rueckverweis.log
  if [ -f "$REPO/automation/ratgeber_rueckverweis.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$RV" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$RV"; then
      touch "$RV"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_ratgeber_rueckverweis.lock; flock -n 9 || exit 0; FIX=1 exec python3 automation/ratgeber_rueckverweis.py" >> "$RV" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ratgeber-rueckverweis gestartet"
    fi
  fi
  # TOTE RABATTCODES, einmal täglich: abgelaufene Aktionscodes überleben in zeitlosen
  # Ratgeber-Texten weiter. Am 20.08.2026 bewarben SECHS veröffentlichte Seiten Codes, die
  # seit Juni tot waren (PAPA25, LAUNCH30, GENTLEMAN30, PARENTBUNDLE) — darunter drei
  # SEO-Ratgeber, die über Google dauerhaft Besucher bringen. Wer so einen Code an der Kasse
  # eintippt, bekommt eine Fehlermeldung und bricht ab. Der Wächter meldet nur; welcher Code
  # ersetzt wird, ist eine Entscheidung.
  TR=/tmp/tote_rabattcodes.log
  if [ -f "$REPO/automation/tote_rabattcodes.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TR"; then
      touch "$TR"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_tote_rabattcodes.lock; flock -n 9 || exit 0; exec python3 automation/tote_rabattcodes.py" >> "$TR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tote-rabattcodes geprüft"
    fi
  fi
  # VERALTETE VERWEISE, einmal täglich: Behördenlinks und Alt-Domains überleben in
  # Rechtstexten, die nie wieder jemand liest. Am 24.08.2026 verwiesen das Impressum und
  # zwei AGB-Fassungen auf die EU-ODR-Plattform — abgeschaltet seit 20.07.2025. tote_links
  # prüft nur /products/-Links, tote_rabattcodes nur Codes; für VERWEISE gab es keinen
  # Wächter. Meldet nur (dropship/VERALTETE-VERWEISE.md); Rechtstexte schreibt niemand blind um.
  VV=/tmp/veraltete_verweise.log
  if [ -f "$REPO/automation/veraltete_verweise.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$VV" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$VV"; then
      touch "$VV"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_veraltete_verweise.lock; flock -n 9 || exit 0; exec python3 automation/veraltete_verweise.py" >> "$VV" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) veraltete-verweise geprüft"
    fi
  fi
  # TOTE LINKS, einmal täglich: Ratgeber-Seiten verlinken Produkte, die inzwischen gelöscht
  # oder gedraftet sind. Am 20.08.2026 waren es 61 Links auf 25 veröffentlichten Seiten — jeder
  # Google-Besucher, der auf eine Empfehlung klickte, landete auf 404. Neue tote Links entstehen
  # bei JEDEM Draft-Lauf (keine-lieferanten-ref, Dubletten, Sperr-Tags), ohne dass die Texte
  # davon erfahren. Meldet nur; das Umhängen braucht eine Entscheidung.
  # BILD QUADRATISCH AUFFÜLLEN, einmal täglich: 618 aktive Produkte tragen `bild-zu-klein`,
  # weil kein Bild 500×500 auf BEIDEN Kanten erreicht. Bei 293 davon ist die LÄNGERE Kante
  # längst ≥ 500 (633×497 — drei Pixel zu wenig). Der Lauf ergänzt an den kurzen Seiten Rand
  # in der gemessenen Randfarbe des Bildes; das Foto selbst wird nicht gestreckt und nicht
  # hochskaliert. Ist auch die längere Kante < 500, bleibt der Tag stehen — dort hilft nur
  # besseres Quellmaterial, und CJ hat keines (618 Quittungen in _bild_gross_cj.txt).
  BQ=/tmp/bild_quadrat.log
  if [ -f "$REPO/automation/bild_quadrat_auffuellen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BQ" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BQ"; then
      touch "$BQ"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && CAP=60 setsid bash -c "exec 9>/tmp/lock_bild_quadrat_auffuellen.lock; flock -n 9 || exit 0; exec python3 automation/bild_quadrat_auffuellen.py" >> "$BQ" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bild-quadrat gestartet"
    fi
  fi
  # 🖼️ BILD-DUBLETTEN, einmal täglich. Anlass: Betreiber-Screenshot vom 27.08.2026 —
  # zwei Armbaender nebeneinander auf der Startseite, gleicher Preis, GLEICHES FOTO, zwei
  # Produkte. Titel-, SKU- und Bild-URL-Vergleich sehen das alle nicht; der BILDINHALT schon.
  # HASHCAP begrenzt die Downloads je Lauf — der Ledger waechst ueber die Tage in den
  # Katalog hinein, statt 46'000 Bilder auf einmal zu ziehen.
  # 🏷️ WAHLVERSPRECHEN, einmal täglich (nur melden). 135 von 800 geprüften Neuimporten
  # versprechen im Text eine Auswahl, die das Produkt nicht hat — die Kundin sucht die
  # Grössen-/Farbwahl, findet keine und geht. Betrifft auch die Seite mit dem meisten
  # Suchtraffic (Rizinusöl-Wickel-Set, 36 von 147 Suchsitzungen im Monat).
  WV=/tmp/wahlversprechen.log
  if [ -f "$REPO/automation/wahlversprechen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$WV" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$WV" || still_gestorben "$WV"; then
      touch "$WV"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # ⚠️ MIT FIX=1, aber bewusst eng: Der Lauf fasst NUR reine Absaetze und eindeutige
      # Listenpunkte an, nie einen Absatz mit Auszeichnung, und schreibt jede Streichung ins
      # Ledger. Erste Charge am 27.08.: 500 geprueft, 89 gemeldet, 28 bereinigt — die uebrigen
      # 61 tragen eine zweite Aussage und bleiben fuer eine Hand liegen.
      # ⚠️ 04.09.2026: ARBEITSLISTE statt Katalog-Durchlauf. Der Cursor-Weg blaettert 6'000
      # Produkte durch, um die Treffer zu finden, die der Klassen-Vollscan laengst kennt —
      # live gemessen sind es 1'337. Die Liste ist die Quelle; ohne sie bleibt der Cursor-Weg
      # als Netz (das Werkzeug faellt bei LISTE='' von selbst darauf zurueck).
      WVL="$REPO/dropship/_klassen/auswahl-versprechen-bei-einer-variante.txt"
      [ -s "$WVL" ] || WVL=""
      # ⚠️ 05.09.2026: DIE UMLEITUNG GEHOERT HINTER DAS SCHLOSS. Die Shell richtet Umleitungen
      # VOR dem Kommando ein. Gemessen, nicht angenommen — und der Unterschied ist genau EIN
      # Zeichen: Mit `>>` bleibt das Log unberuehrt (ein Oeffnen im Anhaengemodus aendert die
      # mtime nicht, nur ein Schreiben tut das). Mit `>` wird es beim Scheitern des Schlosses
      # GELEERT und traegt die aktuelle Zeit. Wo ein 24-Stunden-Tor auf dieser mtime sitzt,
      # markiert sich ein blockierter Waechter damit selbst als «heute gelaufen» — und der
      # Bericht des letzten echten Laufs ist weg. Betroffen waren `artikelnummer_entfernen`
      # und `produkttexte_du_form`; beide standen hinter einem Dauerlaeufer, der das geteilte
      # Schloss stundenlang haelt. Hier ist die Umleitung nur zur Einheitlichkeit nachgezogen.
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_produkttext.lock; flock -n 9 || exit 0; exec >> \"$WV\" 2>&1; \
           CAP=6000 FIX=1 LISTE=\"$WVL\" exec python3 automation/wahlversprechen.py" 9>&- & )
      # ⚠️ 15.09.2026: Hier stand nur «geprüft» — unabhaengig davon, was der Lauf tat.
      # Der Waechter brach seit dem 09.09. bei JEDEM Lauf sofort mit AttributeError ab
      # (m.start() vor dem `if m`, dazu BESCHREIBEND erst 90 Zeilen spaeter definiert), und
      # sechs Tage lang meldete diese Zeile trotzdem Vollzug. Der Lauf ist abgekoppelt, sein
      # Ergebnis ist hier also noch nicht bekannt — gepruef wird deshalb das Log des VORIGEN
      # Laufs. Ein Absturz wird damit spaetestens im naechsten Zyklus sichtbar statt nie.
      if [ -s "$WV" ] && tail -n 25 "$WV" | grep -q "Traceback\|Error:"; then
        echo "$(date -u +%H:%M) ⚠️ wahlversprechen: letzter Lauf endete mit Fehler ($WV)"
      else
        echo "$(date -u +%H:%M) wahlversprechen gestartet"
      fi
    fi
  fi
  # 🎨 AUSWAHL NACHRÜSTEN (08.10.2026, Betreiber am «Adventskalender Geschenkbox»: «rot oder pink auswahl, checke das auch bei
  # anderen produkten»). Die Klassenliste oben (5'511 aktive mit EINER Variante, deren Text eine Wahl verspricht — seit heute
  # auch nackte Farbnamen «in Rot oder Pink erhältlich») wird bei CJ nachgemessen (auswahl_fehlt_messen, idempotent, ~1'200/h
  # über cj_takt) und, wo CJ die Varianten führt, zur echten Auswahl umgebaut (auswahl_nachruesten: exakte CJ-SKU je Variante,
  # eigenes Bild — fehlende werden seit dem Grow-Plan nachgeladen —, Preis nie tiefer, Rücklesen + Rückbau, Abbruch beim ersten
  # Schreibfehler). Stündlich versucht (flock), damit der lange Messlauf über die Container-Neustarts kommt.
  # 08.10.2026 20:00 (ganzer Katalog): bis zu drei Optionen (Farbe × Grösse …), Stecker → EU, Reste per KI + Zweitprüfer;
  # CAP 150/h, MANUELL- und Fehlerfälle werden gemerkt (dropship/_auswahl_manuell.tsv, _auswahl_fehler.tsv) und übersprungen.
  # Notbremse: Datei dropship/_auswahl_scharf_aus anlegen → nur noch messen.
  AN=/tmp/auswahl_nachruesten.log
  if [ -f "$REPO/automation/auswahl_nachruesten.py" ] && [ -s "$REPO/dropship/_klassen/auswahl-versprechen-bei-einer-variante.txt" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$AN" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 3300 ]; then
      touch "$AN"
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_auswahl.lock; flock -n 9 || exit 0; exec >> \"$AN\" 2>&1; \
          echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; \
          LISTE=dropship/_klassen/auswahl-versprechen-bei-einer-variante.txt MIN_BILDER=1 LIMIT=6000 \
            timeout 1800 python3 automation/auswahl_fehlt_messen.py 2>&1 | tail -2; \
          if [ -e dropship/_auswahl_scharf_aus ]; then echo 'SCHARF aus (dropship/_auswahl_scharf_aus)'; exit 0; fi; \
          SCHARF=1 CAP=150 MAX_FEHLER=3 ZEIT_S=1200 timeout 2400 python3 automation/auswahl_nachruesten.py 2>&1 | grep -E '^(FERTIG|PAUSE|Abbruch|  ⛔|  ✅)' | tail -200" 9>&- & )
      if [ -s "$AN" ] && tail -n 30 "$AN" | grep -q "Traceback\|⛔"; then
        echo "$(date -u +%H:%M) ⚠️ auswahl_nachruesten: letzter Lauf mit Fehler ($AN)"
      else
        echo "$(date -u +%H:%M) auswahl messen+nachrüsten gestartet"
      fi
    fi
  fi
  # 🔪 KEINE KLINGE IM VERKAUF, DIE KEIN LIEFERANT LIEFERN KANN (16.09.2026, #1017).
  # CJ schickte ein bezahltes Damast-Taschenmesser aus Shanghai zurueck: verbotener
  # Artikel, keine Linie in die Schweiz. Derselbe Kunde hatte dieselbe Ware schon am
  # 03.09. bestellt (#1016) — zweimal dieselbe Ursache, zweimal Geld zurueck.
  # Der Befund, der diesen Waechter noetig macht: `cj_versand_ch_sichtbar.py` hatte
  # bereits am 03./04.09. fuer 535 Handles «KEINE CH-Option → DRAFT» protokolliert, und
  # am 16.09. standen 95 davon immer noch im Verkauf. Ein Urteil, das niemand
  # vollstreckt, ist keine Sicherung — diese Zeile vollstreckt es taeglich.
  # FIX=1 ist hier richtig: die Ware kann nicht ausgeliefert werden, jeder Tag im
  # Verkauf ist eine Geisterbestellung in Wartestellung. Gedraftet wird, nie geloescht.
  # 27.09.2026 (#1019): Beworbene CJ-Ware täglich auf «bei CJ ausgelistet» nachprüfen. cj_verfuegbarkeit.py prüft jedes
  # Produkt nur EINMAL — der Halloween-Schaukelgeist war beim Import lieferbar, wurde später ausgelistet und am 27.09.
  # verkauft. Ausgelistet → DRAFT + cj-entfernt (tagsAdd). Braucht /tmp/_cjtok (Keepalive schreibt es); ohne Token
  # Exit 2 «KEIN Urteil» statt «0 ausgelistet».
  CAW=/tmp/cj_ausgelistet_sichtbar.log
  if [ -f "$REPO/automation/cj_ausgelistet_sichtbar.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$CAW" 2>/dev/null || echo 0) ))
    # 28.09.2026 (Betreiber «1019 sachen nicht mehr solche passieren»): Stufe A = alles Sichtbare (777: Kollektionen ganz,
    # besuchte Seiten 90 T, Social-Warteschlangen, Kunden-Lieblinge) täglich; Stufe B = übriger CJ-Bestand (46'224) rollierend,
    # 1500/Lauf, jedes Produkt spätestens alle 30 T. Ledger dropship/_cj_nachpruefung.tsv macht jeden Lauf neustartfest —
    # darum auch still_gestorben (Container ~stündlich neu, ein Lauf dauert ~45 min; FERTIG-Zeile ist unbedingt).
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$CAW" || still_gestorben "$CAW"; then
      touch "$CAW"
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_cj_ausgelistet.lock; flock -n 9 || exit 0; exec >> \"$CAW\" 2>&1; \
           exec python3 automation/cj_ausgelistet_sichtbar.py" 9>&- & )
    fi
  fi
  KLW=/tmp/klinge_ch_wache.log
  if [ -f "$REPO/automation/klinge_ch_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KLW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$KLW"; then
      touch "$KLW"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # Umleitung hinter dem Schloss und mit `>>` — siehe wahlversprechen oben.
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_klinge_ch.lock; flock -n 9 || exit 0; exec >> \"$KLW\" 2>&1; \
           FIX=1 exec python3 automation/klinge_ch_wache.py" 9>&- & )
      # Ergebnis des VORIGEN Laufs melden, nicht den Start (Lehre 15.09.). Die Wache
      # meldet «unklar» statt Ruhe, wenn sie ihre Quelle nicht lesen kann — das ist
      # der Zustand, der hier sichtbar werden MUSS.
      if [ -s "$KLW" ] && tail -n 25 "$KLW" | grep -q "Traceback\|Error:\|unklar"; then
        echo "$(date -u +%H:%M) ⚠️ Klingen-Wache: letzter Lauf unklar ($KLW)"
      elif [ -s "$KLW" ]; then
        echo "$(date -u +%H:%M) $(grep 'KLINGEN-WACHE' "$KLW" | tail -n 1)"
      else
        echo "$(date -u +%H:%M) Klingen-Wache gestartet (erster Lauf)"
      fi
    fi
  fi
  # 🔪 KLINGEN-TOR-KANARIENVOGEL (22.09.2026): taeglich rein lesend, ~2 s — faellt er, laeuft das Ping-Pong wieder.
KLT=/tmp/test_klingen_tor.log
  if [ -f "$REPO/automation/test_klingen_tor.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KLT" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$KLT"; then
      ( cd "$REPO" && python3 automation/test_klingen_tor.py --live >> "$KLT" 2>&1 || echo "$(date -u +%F' '%H:%M) KLINGEN-TOR FEHLER (Exit $?)" >> "$KLT" )
    fi
    if [ -s "$KLT" ] && tail -n 30 "$KLT" | grep -q "FEHLER\|Ping-Pong laeuft wieder"; then
      echo "⚠️ KLINGEN-TOR: Kanarienvogel gefallen — tail -30 $KLT"
    fi
  fi

  # ⭐ UNECHTE BEWERTUNGEN BEI JUDGE.ME — taeglicher LESE-Waechter (22.09.2026). Anlass: Bewertung
  # 1335720164 («Test»/«Probelauf», 5★, Shop-Ebene) stand seit 14.09. veroeffentlicht und zaehlte in
  # der Startseiten-Zahl mit; angelegt von einer fremden Session mit dem OEFFENTLICHEN Token.
  # Hausregel: NIE Fake-Reviews (UWG). Die Wache schreibt NICHTS — Befund → dropship/JUDGEME-WACHE.md,
  # Ampel-Zeile «JUDGEME: N verdaechtig …»; ausblenden (PUT curated=spam) entscheidet ein Mensch.
  # Judge.me-API, nicht Shopify → keine shopify_schranke; Zugang liest das Skript aus /tmp/judgeme.env.
  # Gemessen: ~108 Seiten je rating, ~2 Min; page klemmt bei 100 → das Skript paginiert je rating.
  JMW=/tmp/judgeme_fake_wache.log
  if [ -f "$REPO/automation/judgeme_fake_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$JMW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$JMW"; then
      touch "$JMW"   # Anspruch VOR dem Start — Tor-Frage ist das Log-Alter, der Lauf schreibt erst nach ~2 Min (Lehre 21.09.)
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_judgeme_wache.lock; flock -n 9 || exit 0; exec >> \"$JMW\" 2>&1; \
           exec python3 automation/judgeme_fake_wache.py" 9>&- & )
      # Ergebnis des VORIGEN Laufs melden, nicht den Start (Lehre 15.09.). «unklar» MUSS sichtbar werden.
      if [ -s "$JMW" ] && tail -n 5 "$JMW" | grep -q "Traceback\|JUDGEME: unklar"; then
        echo "$(date -u +%H:%M) ⚠️ Judge.me-Wache: letzter Lauf unklar ($JMW)"
      elif [ -s "$JMW" ]; then
        echo "$(date -u +%H:%M) $(grep '^JUDGEME:' "$JMW" | tail -n 1)"
      else
        echo "$(date -u +%H:%M) Judge.me-Wache gestartet (erster Lauf)"
      fi
    fi
  fi

  # 🛒 VERKAUFEN WIR AUF UNSEREN MEISTBESUCHTEN SEITEN WARE, DIE NIE ANKOMMT? (18.09.2026)
  # Anlass: Die meistbesuchte SUCHSEITE des ganzen Shops (Rizinusoel-Wickel-Set, 18 Sitzungen
  # in 30 Tagen, 2 Warenkoerbe) stand ACTIVE und kaufbar — tracked:false, inventoryPolicy
  # CONTINUE — mit Bestand NUR im US-Lager und 0 Versandoptionen CN->CH. Wer dort gekauft
  # haette, waere die sechste Erstattung geworden: 5 von 9 externen Bestellungen wurden bereits
  # erstattet, weil der Lieferant nicht liefern konnte.
  # WARUM NEBEN cj_verfuegbarkeit.py: der laeuft ueber alle 51'338 Produkte, braucht dafuer Tage
  # und stand am 16.09. auf einem Cursor fest. Dieser hier fragt NUR die ~45 Seiten, auf denen in
  # 60 Tagen wirklich ein Mensch gelandet ist — die Liste holt er sich selbst per ShopifyQL.
  # Das sind die einzigen Seiten, bei denen ein Fehlurteil heute Geld kostet.
  # ⚠️ ER DRAFTET NICHT von sich aus. Bei der Klingen-Wache ist FIX=1 richtig, weil die Kategorie
  # kategorisch verboten ist. Hier haengt das Urteil an einer Einzelmessung je Produkt — und eine
  # CJ-Drosselung duerfte niemals die bestbesuchten Seiten des Shops draften. Vollstreckt wird
  # ueber die Sichtbarkeit: die Befundzahl steht in dieser stuendlichen Ausgabe, die Liste in
  # dropship/_besuchte_seiten_nicht_lieferbar.txt. (Der Kanarienvogel im Skript bricht ohnehin
  # ab, falls CJ fuer ALLES 0 Optionen meldet.)
  # Besuchte-Seiten-Wache (05.10., Prüfer-Befund 9 / Plan 12) — ERSETZT den Block ab «BSL=/tmp/besuchte_seiten_lieferbar.log».
  # Tageslauf (Pflichtliste verkauft 90 T ∪ Landeseiten 30/60/150 T, MAX_PRODUKTE 100) über eigenen Stempel, nicht über das Log-Alter
  # (der NUR_NEIN-Lauf schreibt ins selbe Log). PAUSE (CJ-Punkte < Reserve) → nach ≥ 2 h erneut, höchstens 6×/Tag.
  # Bestätigungslauf NUR_NEIN=1 (zweites NEIN ≥ 12 h nach dem ersten) frühestens 12 h nach dem Tageslauf, 1×/Tag, nur wenn ein NEIN im Ledger steht.
  # 05.10. 07:2x (Prüfer-Nachbesserung): versandfaehig() kennt jetzt die SKU-Form «Stamm-Farbwort» (Hängematte, Gemüseschneider) und cj() kodiert
  # Query-Werte — unverändert an diesem Block; der Guard wird von engine_keepalive nach /tmp gespiegelt (Repo-Fassung gewinnt).
  BSL=/tmp/besuchte_seiten_lieferbar.log
  BSL_TAG=/tmp/besuchte_seiten_tageslauf.stamp
  if [ -f "$REPO/automation/besuchte_seiten_lieferbar.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BSL" 2>/dev/null || echo 0) ))
    ALTER_TAG=$(( $(date +%s) - $(stat -c %Y "$BSL_TAG" 2>/dev/null || echo 0) ))
    PAUSIERT=0; [ -s "$BSL" ] && letzter_lauf "$BSL" | grep -q "^PAUSE" && PAUSIERT=1
    PZ="/tmp/_pause_besuchte_$(date -u +%Y%m%d)"; PN=$(cat "$PZ" 2>/dev/null); case "$PN" in (''|*[!0-9]*) PN=0 ;; esac
    NNZ="/tmp/_nurnein_besuchte_$(date -u +%Y%m%d)"
    START_BSL=""; NN=0
    if [ "$ALTER_TAG" -gt 86400 ] || absturz_nachholen "$BSL" || still_gestorben "$BSL"; then
      START_BSL="tageslauf"; touch "$BSL_TAG"
    elif [ "$PAUSIERT" = 1 ] && [ "$ALTER" -ge 7200 ] && [ "$PN" -lt 6 ]; then
      echo $(( PN + 1 )) > "$PZ"; START_BSL="nach PAUSE, Versuch $(( PN + 1 ))/6"
    elif [ "$ALTER_TAG" -ge 43200 ] && [ ! -f "$NNZ" ] && awk -F'\t' '$3=="NEIN"' "$REPO/dropship/_besuchte_seiten_geprueft.tsv" 2>/dev/null | grep -q .; then
      touch "$NNZ"; START_BSL="NUR_NEIN-Bestätigung"; NN=1
    fi
    if [ -n "$START_BSL" ]; then
      touch "$BSL"   # Anspruch VOR dem Start (21.09.)
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_besuchte_lieferbar.lock; flock -n 9 || exit 0; exec >> \"$BSL\" 2>&1; \
           NUR_NEIN=$NN exec python3 automation/besuchte_seiten_lieferbar.py < /dev/null" 9>&- & )
      echo "$(date -u +%H:%M) Besuchte-Seiten-Wache gestartet ($START_BSL)"
    fi
    # Ergebnis des VORIGEN Laufs melden, nie den Start (Lehre 15.09.).
    if [ -s "$BSL" ] && tail -n 40 "$BSL" | grep -q "^ABBRUCH\|Traceback"; then
      echo "$(date -u +%H:%M) ⚠️ Besuchte-Seiten-Wache: letzter Lauf abgebrochen ($BSL)"
    elif [ "$PAUSIERT" = 1 ]; then
      echo "$(date -u +%H:%M) $(letzter_lauf "$BSL" | grep '^PAUSE' | tail -n 1)"
    elif [ -s "$BSL" ]; then
      echo "$(date -u +%H:%M) $(grep '^LIEFERBAR:' "$BSL" | tail -n 1) · $(grep '^FERTIG:' "$BSL" | tail -n 1)"
    else
      echo "$(date -u +%H:%M) Besuchte-Seiten-Wache gestartet (erster Lauf)"
    fi
  else
    echo "$(date -u +%H:%M) ⚠️ automation/besuchte_seiten_lieferbar.py FEHLT"
  fi
  # Google-Kanal-Luecke. Google ist der EINZIGE Kanal mit belegten Verkaeufen
  # (4 von 10 Bestellungen); Pinterest/TikTok/Meta tragen den Katalog zwar auch,
  # haben aber nie verkauft. Gemessen 16.09.: 2'497 aktive Produkte lagen ausserhalb
  # des Kanals — 1'667 davon zu Recht (Kostueme = Merchant-Kontosperre-Risiko,
  # Klingen, Tabak, Heilversprechen), aber 830 grundlos. Das ist Gratis-Reichweite,
  # die brachliegt. Der Schliesser hat ZWEI unabhaengige Pruefungen (Tags UND Titel)
  # und laesst im Zweifel draussen: ein bisschen weniger Reichweite kostet fast
  # nichts, eine Merchant-Sperre kostet den einzigen Kanal, der verkauft.
  GKL=/tmp/google_kanal_luecke.log
  if [ -f "$REPO/automation/google_kanal_luecke.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GKL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GKL"; then
      touch "$GKL"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_google_kanal.lock; flock -n 9 || exit 0; exec >> \"$GKL\" 2>&1; \
           WRITE=1 exec python3 automation/google_kanal_luecke.py" 9>&- & )
      # Ergebnis des VORIGEN Laufs melden, nicht den Start (Lehre 15.09.).
      if [ -s "$GKL" ] && tail -n 25 "$GKL" | grep -q "Traceback\|Error:"; then
        echo "$(date -u +%H:%M) ⚠️ Google-Kanal-Schliesser: letzter Lauf mit Fehler ($GKL)"
      elif [ -s "$GKL" ]; then
        echo "$(date -u +%H:%M) Google-Kanal: $(grep 'FERTIG:' "$GKL" | tail -n 1)"
      else
        echo "$(date -u +%H:%M) Google-Kanal-Schliesser gestartet (erster Lauf)"
      fi
    fi
  fi
  # Pinterest-Warteschlange NUR MELDEN, nie automatisch schreiben: die Zeilen zu
  # loeschen ist unumkehrbar, und ein Produkt kann zurueckkommen. Gemessen 16.09.:
  # 202 von 202 Pins versprachen «weltweiter Versand» (wir liefern nur CH) und 85
  # verlinkten auf Ware, die es nicht mehr gibt. Eine fertige Warteschlange ist
  # keine gepruefte Warteschlange — zwischen Befuellen und Senden raeumen wir selbst
  # den Katalog um.
  PPP=/tmp/pinterest_pins_pruefen.log
  if [ -f "$REPO/automation/pinterest_pins_pruefen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$PPP" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 604800 ]; then
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_pin_pruef.lock; flock -n 9 || exit 0; exec >> \"$PPP\" 2>&1; \
           exec python3 automation/pinterest_pins_pruefen.py" 9>&- & )
      if [ -s "$PPP" ] && tail -n 30 "$PPP" | grep -q "entfernt (Ware weg"; then
        echo "$(date -u +%H:%M) Pinterest-Queue: $(grep 'entfernt (Ware weg' "$PPP" | tail -n 1 | sed 's/^ *//')"
      fi
    fi
  fi
  # Messversprechen an Wearables (Blutdruck/EKG/Blutzucker). Der Waechter existierte seit dem
  # 21.08., stand aber in KEINER Startliste und ist nie gelaufen — waehrenddessen hat der Grind
  # 104 neue Produkte mit genau diesen Aussagen angelegt, drei davon mit BLUTZUCKER. Das ist die
  # Klasse, bei der ein Irrtum gesundheitlich zaehlt (Lehre 11.08.). «Wer startet DICH neu?»
  WM=/tmp/wearable_mess.log
  if [ -f "$REPO/automation/wearable_messversprechen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$WM" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$WM"; then
      touch "$WM"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # Umleitung hinter dem Schloss — siehe wahlversprechen oben.
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_produkttext.lock; flock -n 9 || exit 0; exec >> \"$WM\" 2>&1; \
           QUELLE=live CAP=200 exec python3 automation/wearable_messversprechen.py" 9>&- & )
      echo "$(date -u +%H:%M) wearable_messversprechen geprüft"
    fi
  fi
  # SELBSTKONTROLLE: zaehlt die bekannten Falschaussage-Klassen AM OBJEKT (voller
  # Katalog live, tag-tolerante Muster) statt ueber die Shopify-Suche. Grund: an EINEM
  # Tag stand hier dreimal «Klasse auf 0», dreimal falsch, jedes Mal weil mit demselben
  # Werkzeug gemessen wurde, mit dem repariert wurde. MELDET NUR — Bericht
  # dropship/KLASSEN-KONTROLLE.md, ohne Befund wird er geloescht.
  # ⚠️ Laeuft ZULETZT und pausiert 0,5 s je Seite: der Scan zieht den Shopify-Eimer sonst
  # leer und die uebrigen Waechter melden Drosselung als «nicht ladbar» — eine Kontrolle,
  # die die Kontrollierten aushungert, misst am Ende sich selbst.
  # Drafts wiederbeleben, die CJ jetzt DOCH in die Schweiz liefert. Anlass: der CJ-Agent hat
  # am 04.09. den Kanal «CJPacket EQ Sensitive» freigeschaltet — das Messer aus Bestellung
  # #1016 hat damit eine CH-Linie. 1'001 Produkte stehen mit `cj-nicht-versendbar-ch` auf
  # DRAFT; eine Quittung gilt nur fuer die Welt, in der sie ausgestellt wurde, also wird jede
  # Absage neu gemessen. Es prueft Risiko-Tags, die LIVE-Fracht und die Marge und publiziert
  # nur in Online Store + Shop — ueber Google entscheidet der eigene Waechter.
  CVR=/tmp/cj_versand_ch_revive.log
  if [ -f "$REPO/automation/cj_versand_ch_revive.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$CVR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 43200 ]; then
      ( cd "$REPO" && setsid flock -n /tmp/lock_cj_versand_revive.lock \
          env CAP=120 python3 automation/cj_versand_ch_revive.py >> "$CVR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) cj_versand_ch_revive gestartet"
    fi
  fi
  # ── Netzstecker-Wache (14.09.2026): Netzgeraete mit EINER Shop-Variante gegen CJs
  # Stecker-Versionen halten. Die Dampfglaettbuerste stand in der Hype-Reihe, CJ fuehrt sie nur
  # als CN/US/UK — kein EU-Stecker (die #1018-Klasse). Kein EU -> DRAFT stecker-unpassend-ch;
  # EU vorhanden, aber unsere SKU ist nicht die EU-SKU -> NUR melden (STECKER-UNKLAR.md).
  # 10 CJ-Punkte je Produkt, deshalb CAP 150 je Tag; laeuft mit 1 req/s.
  CST=/tmp/cj_stecker_pruefen.log
  if [ -f "$REPO/automation/cj_stecker_pruefen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$CST" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 43200 ] && ! grep -q "^FERTIG" "$CST" 2>/dev/null; then
      ( cd "$REPO" && setsid flock -n /tmp/lock_cj_stecker.lock \
          env CAP=150 python3 automation/cj_stecker_pruefen.py >> "$CST" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) cj_stecker_pruefen gestartet"
    fi
  fi
  # 14.09. Task #76: die «unklar-eu-vorhanden»-Faelle des Pruefers deterministisch aufloesen —
  # genau EINE EU-Variante bei CJ (oder gleiche Farbe wie unsere Varianten-SKU) -> EU-SKU setzen +
  # Faktenzeile; Farbwahl unbekannt -> Tag stecker-unklar, aus der Hype-Reihe. 10 CJ-Punkte je Produkt.
  # 14.09.2026 «mach 8 produkte aber fuelle die ganze webseite mit anderen katalogen»: Startseite
  # 8 Produkte je Reihe, 8 Wechsel-Reihen drehen taeglich durch 25 Kataloge (Saison zuerst). Idempotent.
  HKR=/tmp/homepage_katalog_rotation.log
  if [ -f "$REPO/automation/homepage_katalog_rotation.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$HKR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$HKR"; then
      touch "$HKR"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && flock -n /tmp/lock_homepage_katalog_rotation.lock \
          python3 automation/homepage_katalog_rotation.py >> "$HKR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) homepage_katalog_rotation gestartet"
    fi
  fi
  CSE=/tmp/cj_stecker_eu_setzen.log
  if [ -f "$REPO/automation/cj_stecker_eu_setzen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$CSE" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 43200 ] && ! grep -q "^FERTIG" "$CSE" 2>/dev/null; then
      ( cd "$REPO" && setsid flock -n /tmp/lock_cj_stecker_eu.lock \
          env CAP=60 python3 automation/cj_stecker_eu_setzen.py >> "$CSE" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) cj_stecker_eu_setzen gestartet"
    fi
  fi
  # ── Zombie-Wache: WER schreibt einen reparierten Text zurueck? (04.09.2026) ────────────
  # 987 USA-Lieferzusagen lebten wieder, 978 davon standen als repariert im Ledger. Kein
  # Werkzeug BAUT den Block neu — jemand schreibt einen ALTEN descriptionHtml zurueck. Die
  # Logs des Tatzeitpunkts waren laengst ueberschrieben; wenn kein Log mehr da ist, fragt man
  # nicht die Vergangenheit, sondern stellt eine Falle. Dauerlaeufer, deshalb hier.
  if [ -f "$REPO/automation/zombie_wache.sh" ]; then
    if ! ps -eo args --no-headers | grep -q "[z]ombie_wache.sh"; then
      ( setsid bash "$REPO/automation/zombie_wache.sh" > /dev/null 2>&1 9>&- & )
      echo "$(date -u +%H:%M) zombie_wache gestartet"
    fi
  fi

  # ── Lieferanten-Artikelnummern aus dem Kundentext (04.09.2026) ─────────────────────────
  # Die Klasse waechst mit dem Grind nach: CJ-Texte nennen «mit der Artikelnummer Ltao7547…».
  # Unter dem GETEILTEN Produkttext-Schloss — zwei Massen-Schreiber auf descriptionHtml sind
  # die Zombie-Klasse vom 15.08.
  AN=/tmp/artikelnummer.log
  if [ -f "$REPO/automation/artikelnummer_entfernen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$AN" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$AN"; then
      touch "$AN"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # ⚠️ Umleitung hinter dem Schloss — und sie war hier `>`, hat das Log eines blockierten
      # Laufs also nicht nur angefasst, sondern GELEERT (der Bericht des letzten echten Laufs war weg).
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_produkttext.lock; flock -w 1800 9 || exit 0; exec > \"$AN\" 2>&1; \
           exec python3 automation/artikelnummer_entfernen.py" 9>&- & )
      echo "$(date -u +%H:%M) artikelnummer_entfernen gestartet"
    fi
  fi

  # ── Sie→du in Produkttexten (04.09.2026) ──────────────────────────────────────────────
  # Der Shop duzt ueberall, die CJ-Texte des alten Prompts siezen. Erst Analyse, dann
  # Schreiben — beides unter dem GETEILTEN Produkttext-Schloss.
  # ⚠️ Dass dieser Massen-Textschreiber automatisch laufen darf, haengt an drei Dingen:
  #   1. die Pruefungen sind in BEIDE Richtungen getestet (Sache-«Sie» erlaubt, Anrede-«Sie»
  #      blockiert; echte Frage erlaubt, Aussage-aus-Imperativ blockiert),
  #   2. jeder geschriebene Text wird VORHER nach dropship/_produkttexte_du_form_alt.jsonl
  #      gesichert — im REPO, nicht in /tmp (dort ueberlebt eine Sicherung weder den Wipe
  #      noch den naechsten Sammellauf, der die Arbeitsdatei ueberschreibt),
  #   3. das Tageskontingent ist klein. Ohne den Rueckweg waere ein systematischer Fehler
  #      unumkehrbar — dann gehoerte das Schreiben in eine gelesene Entscheidung.
  # 22.09.2026: der alte Startblock hier ist WEG — er hielt den Text-Lock auf fd 9 und vererbte ihn an das Skript,
  # das denselben Lock selbst nimmt (Selbst-Deadlock, s. o.); ausserdem kannte das Skript kein WRITE= mehr.
  # produkttexte_du_form laeuft jetzt NUR ueber die Tages-Schleife oben (eigener Lock, ohne TXTLOCK).
  # ── Reparatur der schon geduzten Produkttexte (22.09.2026) ────────────────────────────────
  # Regeln in um() sind gewachsen; Alt-Texte tragen «entscheidst du sich»/«Tragst du es». Idempotent ueber
  # dropship/_du_form_reparatur_done.txt; laeuft, bis alle Ledger-Eintraege geprueft sind, dann nie mehr.
  if [ -f "$REPO/automation/produkttexte_du_form_reparatur.py" ]; then
    R_OFFEN=$(comm -23 <(awk -F'\t' '$3=="du"||$3=="teilweise"||$3=="um-ohne-wirkung"||$3~/^verdacht:/{print $1}' "$REPO/dropship/_du_form_done.txt" 2>/dev/null | sort -u) \
                       <(cut -f1 "$REPO/dropship/_du_form_reparatur_done.txt" 2>/dev/null | sort -u) | wc -l)
    if [ "$R_OFFEN" -gt 0 ] && ! flock -n /tmp/lock_du_form_reparatur.lock true 2>/dev/null; then
      echo "$(date -u +%H:%M) du_form_reparatur laeuft ($R_OFFEN offen)"
    elif [ "$R_OFFEN" -gt 0 ] && ! flock -n /tmp/lock_produkttext.lock true 2>/dev/null; then
      echo "$(date -u +%H:%M) du_form_reparatur wartet: Text-Lock belegt ($R_OFFEN offen)"   # 22.09.: nie hinter dem Stundenlauf anstellen
    elif [ "$R_OFFEN" -gt 0 ]; then
      ( cd "$REPO" && setsid bash -c \
          "exec 8>&- 9>&-; exec 7>/tmp/lock_du_form_reparatur.lock; flock -n 7 || exit 0; exec python3 automation/produkttexte_du_form_reparatur.py" \
          >> /tmp/produkttexte_du_form_reparatur.log 2>&1 8>&- 9>&- & )
      echo "$(date -u +%H:%M) du_form_reparatur gestartet ($R_OFFEN offen)"
    fi
  fi

  # KLASSEN-KONTROLLE: der Vollscan ueber 52'000 Produkte dauert laenger als ein
  # Container-Leben (Neustart etwa stuendlich, Lehre 03.09.). Er ist deshalb seit dem
  # 04.09. fortsetzbar — und darf NICHT hinter einem 24-Stunden-Tor stehen: ein Teilscan,
  # der einmal taeglich eine Stunde laeuft, braucht Wochen und meldet solange TEILSCAN.
  # Regel: laeuft er, bleibt er in Ruhe. Ist er MITTENDRIN und tot, wird sofort fortgesetzt
  # (Cursor, Log anhaengen). Ist er FERTIG, faengt er hoechstens einmal taeglich neu an.
  KK=/tmp/klassen_kontrolle.log
  if [ -f "$REPO/automation/klassen_kontrolle.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KK" 2>/dev/null || echo 0) ))
    KK_N=$(ps -eo args --no-headers | awk '$1 ~ /python3?$/ && $2 ~ /klassen_kontrolle\.py$/' | wc -l)
    if [ "${KK_N:-0}" -eq 0 ]; then
      if [ -s "$KK" ] && ! grep -q "^FERTIG" "$KK" 2>/dev/null; then
        ( cd "$REPO" && setsid flock -n /tmp/lock_klassen_kontrolle.lock \
            python3 automation/klassen_kontrolle.py >> "$KK" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) klassen_kontrolle fortgesetzt"
      elif [ "$ALTER" -gt 86400 ]; then
        touch "$KK"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
        ( cd "$REPO" && setsid flock -n /tmp/lock_klassen_kontrolle.lock \
            env NEU=1 python3 automation/klassen_kontrolle.py > "$KK" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) klassen_kontrolle neu gestartet"
      fi
    fi
  fi
  BD=/tmp/bilddubletten.log
  if [ -f "$REPO/automation/bilddubletten.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BD" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BD"; then
      touch "$BD"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && HASHCAP=4000 setsid bash -c "exec 9>/tmp/lock_bilddubletten.lock; flock -n 9 || exit 0; exec python3 automation/bilddubletten.py" >> "$BD" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bild-dubletten geprüft"
    fi
  fi
  TL=/tmp/tote_links.log
  if [ -f "$REPO/automation/tote_links.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TL"; then
      touch "$TL"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # ZUERST die umbenannten Handles nachziehen, DANN pruefen. Sonst meldet der Waechter
      # jeden Handle-Wechsel (Messversprechen-Fix, Handle-Kuerzung) taeglich als «GELÖSCHT»,
      # obwohl eine 301 greift und das Produkt lebt — ein Bericht mit Dauerbefund wird nicht
      # mehr gelesen. Das Nachziehen ist rein mechanisch (301-Ziel muss ACTIVE sein);
      # ein ECHTER toter Link bleibt liegen und gehoert dem Bericht.
      ( cd "$REPO" && setsid sh -c 'python3 automation/interne_links_nachziehen.py; python3 automation/tote_links.py' >> "$TL" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) interne-links nachgezogen + tote-links geprüft"
    fi
  fi
  # 🛡️ GOOGLE-/WERBEKANAL-SÄUBERER, einmal täglich, LIVE über die letzten 7 Tage (02.09.2026).
  # Stand bis heute in KEINER Startliste und las /tmp/export.jsonl vom 30.08. — 18 Feuerzeuge
  # und 10 Rauchartikel aus späteren Importen standen unbemerkt bei Google, 37 in TikTok/
  # Facebook/Pinterest. Die Importer publizieren in alle sechs Kanäle; dieser Lauf holt
  # Rauch/Waffe/Erotik aus allen VIER Werbekanälen, Refurb/Marke nur aus Google.
  GS=/tmp/google_kanal_saeubern.log
  if [ -f "$REPO/automation/google_kanal_saeubern.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$GS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$GS"; then
      touch "$GS"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && SEIT=7 setsid bash -c "exec 9>/tmp/lock_google_kanal_saeubern.lock; flock -n 9 || exit 0; exec python3 automation/google_kanal_saeubern.py" >> "$GS" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) google-kanal-saeuberer (live, 7 Tage) gestartet"
    fi
  fi
  # BILD-ZU-KLEIN-NACHLAUF, einmal täglich: 642 aktive Produkte hatten am 25.08.2026 KEIN
  # Bild >=500x500 (Merchant-Vorwarnung «Image too small»). Der Lauf holt CJs Originale nach
  # (Masse aus dem Dateikopf, nur READY wird uebernommen, FAILED wird geloescht) und quittiert
  # «kein-grosses-bild-bei-cj» als ehrliche Endstation. Stoppt selbst bei CJ-Code 16900500.
  BG=/tmp/bild_gross.log
  if [ -f "$REPO/automation/bild_gross_nachladen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BG" 2>/dev/null || echo 0) ))
    # ⚠️ 25.08.2026: Lief der Lauf ins leere CJ-Tagesbudget («0 bearbeitet»), verschenkt das
    # 24-h-Gate einen ganzen Tag — dann reicht 2 h Abstand fuer den naechsten Versuch
    # (Punkte fliessen nach; der Lauf selbst stoppt bei 16900500 sauber).
    GATE=86400
    tail -3 "$BG" 2>/dev/null | grep -q "Tagesbudget erschoepft" && GATE=7200
    if [ "$ALTER" -gt "$GATE" ]; then
      ( cd "$REPO" && CAP=150 setsid bash -c "exec 9>/tmp/lock_bild_gross_nachladen.lock; flock -n 9 || exit 0; exec python3 automation/bild_gross_nachladen.py" >> "$BG" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bild-gross-nachladen gestartet"
    fi
  fi
  # LEERE KOLLEKTIONEN, einmal täglich: Am 21.08.2026 waren 14 im Onlineshop veröffentlichte
  # Kollektionen für Besucherinnen komplett leer (0 kaufbare Produkte) und 3 weitere hatten
  # genau eines — darunter die Kampagnenseite `tiktok-viral` und `picknick-strand` mitten in
  # der Saison. Alle lieferten 200 mit Werbetext und darunter «Keine Produkte gefunden.».
  # ⚠️ `productsCount` ZÄHLT DRAFTS MIT — nach dieser Zahl wären nur 3 von 17 aufgefallen;
  # der Wächter zählt deshalb einzeln mit `status`. Neue Löcher entstehen bei JEDEM Draft-Lauf
  # (keine-lieferanten-ref, Dubletten, Sperr-Tags). Meldet nur — Füllen oder Unveröffentlichen
  # (dann IMMER erst 301-Weiterleitung!) braucht eine Entscheidung.
  # BESTANDSGRÖSSE, einmal täglich: Am 05.09.2026 hat ein fremder Lauf 20'953 Produkte auf
  # Entwurf gesetzt (Kriterium «kein bild-ok»), der aktive Katalog fiel von ~53'300 auf 35'144
  # und 32 Landeseiten mit Verkehr wurden zu 404 — darunter die grösste Produkt-Landeseite des
  # Shops. KEINE der 194 Wachen hat es gemeldet: sie prüfen Klassen INNERHALB der aktiven Ware,
  # keine prüft die ZAHL der aktiven Ware. Gefunden wurde es einen Tag später über den Trichter.
  # Meldet nur; ein Massenschritt in der Gegenrichtung gehört dem Betreiber.
  BG=/tmp/bestandsgroesse.log
  if [ -f "$REPO/automation/bestandsgroesse_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BG" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BG"; then
      touch "$BG"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_bestandsgroesse.lock; flock -n 9 || exit 0; exec python3 automation/bestandsgroesse_wache.py" >> "$BG" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bestandsgroesse geprüft"
    fi
  fi
  KL=/tmp/kollektion_leer.log
  if [ -f "$REPO/automation/kollektion_leer.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$KL"; then
      touch "$KL"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_kollektion_leer.lock; flock -n 9 || exit 0; exec python3 automation/kollektion_leer.py" >> "$KL" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) leere-kollektionen geprüft"
    fi
  fi
  # PHANTOM-WARE IN KOLLEKTIONSTEXTEN, einmal taeglich: Am 08.09.2026 bewarben drei
  # Kollektionstexte mit gemessenem Suchverkehr Ware, die es nicht kaufbar gibt —
  # `camping-kueche` Geschirrspueler von Bosch/Samsung/Whirlpool, `sommer` das
  # «Markgraefin Kleid» (3 Treffer, alle DRAFT), und `frontpage` (die STARTSEITE)
  # «Casio Damenuhren» und «Dolce & Gabbana «The One»». Der Ratgeber-Waechter kennt
  # diese Klasse seit dem 28.08. — aber nur fuer Blogartikel; Kollektionstexte stehen
  # auf JEDER Kategorieseite ueber der Ware und hat nie jemand geprueft. MELDET NUR.
  KTW=/tmp/kollektionstexte_wahrheit.log
  if [ -f "$REPO/automation/kollektionstexte_wahrheit.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KTW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$KTW"; then
      touch "$KTW"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_kollektionstexte_wahrheit.lock; flock -n 9 || exit 0; exec python3 automation/kollektionstexte_wahrheit.py" >> "$KTW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) kollektionstexte-wahrheit geprüft"
    fi
  fi
  # FARBCODES IN DER VARIANTEN-AUSWAHL, einmal täglich gegen LIVE: Am 20.08.2026 stand bei
  # 151 aktiven Produkten der CJ-Artikelcode im Dropdown «Farbe» — «A039 Black», «E7916 White».
  # Titel und Beschreibung waren sauber; die beiden alten Reiniger (farbcode_bereinigen.py,
  # titelcode_entfernen.py) fassen die OPTIONSWERTE nämlich nie an, dabei ist der Code dort für
  # die Kundin unausweichlich — sie MUSS ihn anklicken. Der Importer schreibt sie nicht mehr
  # (cj_category_fill.mjs), aber ältere Läufe und andere Wege legen weiter welche an.
  FO=/tmp/farbcode_optionswerte.log
  if [ -f "$REPO/automation/farbcode_optionswerte.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$FO" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$FO"; then
      touch "$FO"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid env QUELLE=live SEIT=$(date -u -d '3 days ago' +%F) \
          python3 automation/farbcode_optionswerte.py >> "$FO" 2>&1 9>&- & )
      ( cd "$REPO" && setsid env QUELLE=live SEIT=$(date -u -d '3 days ago' +%F) \
          python3 automation/farbcode_rein_melden.py >> "$FO" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) farbcode-optionswerte Live-Nachzug gestartet"
    fi
  fi
  # ADS-KURATION NACHZUG, einmal täglich gegen LIVE: der Export-Lauf deckt nur den
  # Schnappschuss ab, der CJ-Grind legt täglich neue 1-Bild-/Billig-Produkte an — ohne
  # Nachzug wüchse «Over capacity» einfach nach (Backfill-Regel vom 12.08.).
  AK=/tmp/ads_kuration_live.log
  if [ -f "$REPO/automation/google_ads_kuration.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$AK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$AK"; then
      touch "$AK"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid env QUELLE=live SEIT=$(date -u -d '2 days ago' +%F) \
          python3 automation/google_ads_kuration.py >> "$AK" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ads_kuration Live-Nachzug gestartet"
    fi
  fi
  # STOREFRONT VON AUSSEN, einmal taeglich (17.09.2026). Das ist der Auftrag, der «so oft
  # wie es geht» wirklich verdient: seit dem 19.08. steht gemessen fest, dass unsere
  # eigene IP eine stundenalte Bot-Cache-Kopie bekommt — 125 Abrufe ueber 50 Minuten
  # lieferten ausnahmslos die alte Startseite. Von hier aus ist die oeffentliche Seite
  # also GRUNDSAETZLICH nicht pruefbar, egal wie oft man es versucht.
  # Der Hetzner-Agent sitzt woanders im Netz. Diese Zeile legt ihm den Auftrag hin; er
  # holt ihn im 5-Minuten-Takt ab, voellig unabhaengig davon, ob ich wach bin.
  # ⚠️ Idempotent ueber einen Zeitstempel — nicht stuendlich 24 Auftraege erzeugen.
  # 📦 FORTURA-BESTAND (24.09.2026): Der Abgleich Feed → Shop hing am Import-Runner und stand seit 21.08. still
  # (34 Tage eingefroren, 248 Varianten verkauften Ware, die Fortura nicht mehr hatte). Eigener Tagesstart, unabhaengig
  # von Import-Pause und Grind-Schalter.
  # ⭐ BEWERTUNGEN NACHHOLEN (24.09.2026, Betreiber «bewertungen push»): 1–3★-Kommentare fuer 2'072 Produkte, die nur
  # 4–5★ zeigen. Ein Lauf dauert Stunden, der Container startet stuendlich neu → fortsetzen, bis das Log FERTIG sagt.
  BN=/tmp/bewertungen_nachholen.log
  if [ -f /tmp/judgeme.env ] && ! letzter_lauf "$BN" | tail -n 3 | grep -q "^FERTIG" \
     && ! ps -eo args --no-headers | awk '$1=="bash" && $2 ~ /bewertungen_nachholen\.sh$/ {f=1} END{exit(f?0:1)}' \
     && ! { tail -n 1 "$BN" 2>/dev/null | grep -q "^PAUSE" && [ $(( $(date +%s) - $(stat -c %Y "$BN") )) -lt 3600 ]; }; then
    ( cd "$REPO" && setsid bash -c "exec 8>&- 9>&-; echo \"START \$(date -u +%FT%TZ) (Aufseher)\"; exec bash automation/bewertungen_nachholen.sh" >> "$BN" 2>&1 & )
    echo "$(date -u +%H:%M) Bewertungen nachholen: fortgesetzt"
  fi
  # 📦 FORTURA-BESTAND → seit 06.10.2026 am RUNDENBEGINN (siehe dort).
  SF=/tmp/storefront_auftrag.stamp
  if [ $(( $(date +%s) - $(stat -c %Y "$SF" 2>/dev/null || echo 0) )) -gt 72000 ]; then
    mkdir -p "$REPO/auftraege/offen"
    TAG=$(date -u +%Y-%m-%d)
    cat > "$REPO/auftraege/offen/storefront-$TAG.json" <<JSON
{
  "id": "storefront-$TAG",
  "typ": "skript",
  "skript": "storefront_wahrheit.mjs",
  "warum": "Taegliche Pruefung der oeffentlichen Seite von einer ECHTEN Besucher-IP. Von unserer eigenen IP ist sie nicht pruefbar (Bot-Cache, 19.08. gemessen). Handy-Breite, weil 77 % des Verkehrs Handy ist."
}
JSON
    ( cd "$REPO" && git add auftraege >/dev/null 2>&1 \
      && git -c user.name=luxe-keepalive -c user.email=keepalive@luxestyle.ch \
           commit -q -m "Storefront-Pruefung $TAG fuer den Hetzner-Agenten [skip ci]" >/dev/null 2>&1 \
      && ( git push -q origin HEAD:claude/luxestyle-status-tztnn1 >/dev/null 2>&1 \
           || echo "$(date -u +%H:%M) Storefront-Auftrag liegt lokal, Autocommitter nimmt ihn mit" ) )
    touch "$SF"
    echo "$(date -u +%H:%M) Storefront-Auftrag $TAG an den Agenten uebergeben"
  fi

  # KANAL-ZUSAGEN, einmal taeglich (17.09.2026). Am 10.08. wurde «Gratis-Versand ab
  # CHF 65» aus dem Theme entfernt — auf dem oeffentlichen Pinterest-Profil stand es am
  # 17.09. immer noch, fuenf Wochen spaeter. Der Grund ist strukturell: die Korrektur
  # durchsuchte den SHOP, und Kanaele sind kein Shop. Captions und Pin-Texte liegen in
  # CSV-Warteschlangen, in die nie ein Waechter gesehen hat.
  # Rein LESEND — er meldet, er aendert nichts. Deshalb braucht er kein Schloss.
  # Stand 17.09.: 24 Fundstellen, davon 0 noch ausstehend (alle posted/skip). Meldet
  # sich erst wieder, wenn eine Zeile mit falscher Zusage RAUSGEHEN koennte.
  KZ=/tmp/kanal_zusagen.log
  if [ -f "$REPO/tools/kanal_zusagen_pruefen.py" ]; then
    if [ $(( $(date +%s) - $(stat -c %Y "$KZ" 2>/dev/null || echo 0) )) -gt 86400 ]; then
      touch "$KZ"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      python3 "$REPO/tools/kanal_zusagen_pruefen.py" > "$KZ" 2>&1
      OFFEN=$(grep -o "GEHT NOCH RAUS: [0-9]*" "$KZ" | head -1 | grep -o "[0-9]*")
      # Nur melden, wenn wirklich etwas rausgehen koennte — sonst ist es Rauschen,
      # und Rauschen macht eine Meldung unglaubwuerdig (Lehre Betreiber-Ampel).
      [ "${OFFEN:-0}" -gt 0 ] && echo "$(date -u +%H:%M) ⚠️ KANAL-ZUSAGEN: $OFFEN wartende Zeile(n) mit veralteter Zusage — $KZ"
    fi
  fi
  # ZWEITES GEHIRN, taeglich: prueft den eigenen Bestand gegen die teuer gelernten Lehren
  # (tools/zweites_gehirn.py). Gemeldet wird NUR, was seit der Grundlinie NEU dazugekommen
  # ist — der Altbestand von 143 Befunden wuerde sonst jeden Tag dieselbe Zeile erzeugen,
  # und «eine Zeile, die sich in jedem Durchgang wiederholt, ist keine Meldung» (29.08.).
  # Der Selbsttest laeuft im Werkzeug VOR jeder Meldung: faengt eine Regel ihren eigenen
  # Koeder nicht, wird gar nichts gemeldet.
  # CJ-BESTELLWACHE alle 2 h. Auftrag Betreiber 17.08.: «sage mir bescheid wen was änderet».
  # ⚠️ GEFUNDEN 17.09. vom zweiten Gehirn: dieses Skript stand in KEINER Startliste, und
  # dropship/_cj_order_watch_state.json wurde zuletzt am 24.08. geschrieben — dreieinhalb
  # Wochen alt. Die Bestell-Ampel liest genau diese Datei fuer die Spalte «LX-Stand».
  # Schaden bisher keiner (0 offene Bestellungen), aber bei der naechsten Bestellung haette
  # die Ampel einen drei Wochen alten Stand als aktuellen gemeldet. Wieder die Frage aus
  # Lehre 19.08.: «wer startet DICH?» — hier lautete die Antwort: niemand.
  CJW=/tmp/cj_order_watch.log
  if [ -f "$REPO/automation/cj_order_watch.py" ] && [ -f /tmp/cj_token.json ]; then
    if [ $(( $(date +%s) - $(stat -c %Y "$CJW" 2>/dev/null || echo 0) )) -gt 7200 ]; then
      ( cd "$REPO" && python3 automation/cj_order_watch.py > "$CJW" 2>&1 )
      grep -q "AENDERUNG\|ÄNDERUNG" "$CJW" && { echo "$(date -u +%H:%M) 📦 CJ-BESTELLUNG geaendert:"; grep "AENDERUNG\|ÄNDERUNG" "$CJW" | head -5; }
    fi
  fi

  ZG=/tmp/zweites_gehirn.log
  if [ -f "$REPO/tools/zweites_gehirn.py" ]; then
    if [ $(( $(date +%s) - $(stat -c %Y "$ZG" 2>/dev/null || echo 0) )) -gt 86400 ]; then
      touch "$ZG"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      python3 "$REPO/tools/zweites_gehirn.py" --wacht > "$ZG" 2>&1
      NEUE=$(grep -o "· [0-9]* NEU" "$ZG" | head -1 | grep -o "[0-9]*")
      [ "${NEUE:-0}" -gt 0 ] && { echo "$(date -u +%H:%M) ⚠️ ZWEITES GEHIRN: $NEUE neue Regelverstoesse seit der Grundlinie"; grep "NEU \[" "$ZG" | head -5; }
    fi
  fi

  # VERSANDAUSSAGEN-LIVE-KONTROLLE alle 3 Tage: Am 17.08. standen 4'356 Produkte WIEDER mit
  # dem alten EU/USA-Block da, obwohl sie im Ledger als erledigt geführt waren (Zombie-
  # Muster vom 15.08., Verursacher unbekannt). Der Live-Modus prüft nach INHALT, nicht nach
  # Ledger — er findet also jede Wiederauferstehung und tilgt sie.
  VL=/tmp/versand_live.log
  if [ -f "$REPO/automation/versandaussagen_wahrheit.py" ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/versandaussagen_wahrheit.py"{n++} END{exit(n?0:1)}'; then
      # ⚠️ 17.08.: Ein reiner Alterscheck liess einen GEKILLTEN Lauf 3 Tage liegen (Log war
      # frisch, Prozess tot, 2'356 Produkte blieben falsch). Abgeschlossen ist ein Lauf nur,
      # wenn die Schlusszeile «Produkte geschrieben:» im Log steht — sonst sofort fortsetzen.
      ALTER=$(( $(date +%s) - $(stat -c %Y "$VL" 2>/dev/null || echo 0) ))
      START=0
      if ! grep -q "Produkte geschrieben:" "$VL" 2>/dev/null; then START=1
      elif [ "$ALTER" -gt 259200 ]; then mv "$VL" "$VL.alt" 2>/dev/null; START=1; fi
      # ⚠️ EIN Schloss fuer ALLE Schreiber auf descriptionHtml (03.09.2026).
      # Jeder Schreiber hatte seinen EIGENEN Lockfile — das verhindert nur seinen
      # eigenen Doppelstart, nicht zwei VERSCHIEDENE Werkzeuge auf demselben Feld.
      # Gemessen: versandaussagen und trust_baustein liefen gleichzeitig; trust haelt
      # seinen Seitentext bis zu 15 s, in dieser Luecke schreibt es die eben gemachte
      # Reparatur zurueck (Zombie-Klasse 15.08.). Dieselbe Lehre wie post_guard:
      # EIN Lock, EIN Ledger — nie ein eigener Lockfile je Werkzeug.
      # ⚠️⚠️ 08.09.2026: Dieser Kommentarblock stand ZWISCHEN «bash -c \» und seinem
      # Argument. Ein Backslash-Zeilenumbruch klebt die naechste Zeile an — und das war
      # ein Kommentar. Folge: `bash: -c: option requires an argument`, der Lauf startete
      # 166-mal NICHT, und die Zeile darunter meldete trotzdem «gestartet». Ein Kommentar
      # gehoert VOR das Kommando, nie in eine fortgesetzte Zeile.
      if [ "$START" = 1 ]; then
        ( cd "$REPO" && setsid bash -c \
            "exec 9>/tmp/lock_produkttext.lock; flock -n 9 || exit 0; QUELLE=live IGNORIERE_LEDGER=1 exec python3 automation/versandaussagen_wahrheit.py" \
            >> "$VL" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) versandaussagen Live-Kontrolle gestartet"
      fi
    fi
  fi
  # PRODUKTDETAILS-FLOSKEL (04.09.2026): «Material: hochwertiges Material» ist eine Werbefloskel
  # in einem FAKTENFELD. Gemessen sind alle 124 Faelle eine TEILMENGE der 150 doppelten Bloecke:
  # der erste Block ist sauber, die Floskel steht im zweiten. Deshalb laeuft dieser Lauf VOR
  # produktdetails_vereinen — sonst uebernimmt die Vereinigung die Floskel in den Sammelblock.
  # ⚠️ LISTE ignoriert bewusst das Ledger: alle 124 standen als «erledigt» quittiert und trugen
  # die Floskel trotzdem live. Eine Quittung sagt, was einmal geschrieben wurde, nicht was gilt.
  PDF="$REPO/dropship/_klassen/floskel-hochwertiges-material.txt"
  PDW=/tmp/pd_wahrheit.log
  # ⚠️ 23.09.2026 (Audit): Hier stand «flock -n 9 || exit 0» — bei belegter Text-Sperre endete der
  # Start still, und das Log zählte trotzdem 1'091× «gestartet» (letzter echter Lauf 22.09. 02:09).
  # Jetzt: Sperre VORHER prüfen und ehrlich «wartet» loggen; Kandidaten LIVE (QUELLE=live) statt der
  # veralteten Arbeitsliste (93 Zeilen, live 228); höchstens alle 4 h ein Lauf.
  PDST=/tmp/_pd_wahrheit_start
  if [ -f "$REPO/automation/produktdetails_wahrheit.py" ] \
     && [ $(( $(date +%s) - $(stat -c %Y "$PDST" 2>/dev/null || echo 0) )) -gt 14400 ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/produktdetails_wahrheit.py"{n++} END{exit(n?0:1)}'; then
      if flock -n /tmp/lock_produkttext.lock true; then
        touch "$PDST"
        ( cd "$REPO" && setsid bash -c \
            "exec 8>&-; exec 9>/tmp/lock_produkttext.lock; flock -w 60 9 || exit 0; MODUS=floskel CAP=300 QUELLE=live exec python3 automation/produktdetails_wahrheit.py" \
            >> "$PDW" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) produktdetails_wahrheit (Floskel, live) gestartet"
      else
        echo "$(date -u +%H:%M) produktdetails_wahrheit wartet: Text-Lock belegt"
      fi
    fi
  fi
  # PRODUKTDETAILS NACHMESSEN (08.09.2026): MELDET NUR — und laeuft bewusst VOR der
  # Vereinigung. Grund: Der Zombie ist belegt (506 «vereint»-Quittungen auf 150 Produkte, kein
  # einziges «live-schon-sauber»), der Verursacher aber nicht benannt. Wer den Block
  # zurueckschreibt, hinterlaesst dabei eine MINUTE in updatedAt — und die Vereinigung wuerde
  # genau diese Spur ueberschreiben. Erst messen, dann reparieren.
  PDNM=/tmp/pd_nachmessen.log
  # ⚠️ 14.09.: Dieser Melder hatte KEIN Tages-Tor und lief jede Runde neu — 137 Vollmessungen
  # ueber 593 Produkte in sechs Tagen (Shopify-Eimer), und seit dem Text-Hash-Ledger je Lauf 593
  # Zeilen. Eine Falle misst einmal am Tag; ein Fenster von 24 h reicht, um den Schreiber zu nennen.
  PDNM_ALTER=$(( $(date +%s) - $(stat -c %Y "$PDNM" 2>/dev/null || echo 0) ))
  if [ -f "$REPO/automation/produktdetails_nachmessen.py" ] && [ -s "$REPO/dropship/_klassen/produktdetails-doppelt.txt" ] && [ "$PDNM_ALTER" -gt 72000 ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/produktdetails_nachmessen.py"{n++} END{exit(n?0:1)}'; then
      ( cd "$REPO" && setsid bash -c "exec python3 automation/produktdetails_nachmessen.py" >> "$PDNM" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) produktdetails_nachmessen (Falle) gestartet"
    fi
  fi
  # PRODUKTDETAILS DOPPELT (04.09.2026): Der Block «Produktdetails» stand bei 1'542 aktiven
  # Produkten ZWEIMAL untereinander, teils mit widersprüchlichem Material. Das Werkzeug gibt es
  # seit dem 11.08. — es las aber /tmp/export.jsonl (Stand 30.08.) und meldete deshalb täglich
  # «0 doppelte Blöcke», während die Klasse live 1'542 gross war. ⚠️ Ein Werkzeug, dessen Quelle
  # veraltet, meldet Vollzug über eine Vergangenheit. Es liest jetzt die Arbeitsliste des
  # täglichen Klassen-Vollscans (LISTE) und holt jeden Text unmittelbar vor dem Schreiben LIVE.
  # Läuft unter dem GETEILTEN Produkttext-Schloss — zwei Massen-Schreiber auf descriptionHtml
  # sind die Zombie-Klasse vom 15.08.
  PDL="$REPO/dropship/_klassen/produktdetails-doppelt.txt"
  PDV=/tmp/pd_vereinen.log
  # 22.09.2026: nur starten, wenn der geteilte Text-Lock FREI ist — sonst meldete der Block alle 2 Min
  # «gestartet», waehrend `flock -n` im Kind sofort mit exit 0 endete (Reparaturlauf hielt den Lock stundenlang).
  if [ -f "$REPO/automation/produktdetails_vereinen.py" ] && [ -s "$PDL" ] && flock -n /tmp/lock_produkttext.lock true 2>/dev/null; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/produktdetails_vereinen.py"{n++} END{exit(n?0:1)}'; then
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_produkttext.lock; flock -n 9 || exit 0; LISTE=dropship/_klassen/produktdetails-doppelt.txt LEDGER=dropship/_produktdetails_vereint4.txt exec python3 automation/produktdetails_vereinen.py" \
          >> "$PDV" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) produktdetails_vereinen gestartet"
    fi
  fi
  # TRUST-BAUSTEIN-WAHRHEIT (02.09.2026): «✅ Geprüfte Qualität» → «✅ Geprüfte Angaben» in den
  # Produkttexten (über 10'000; JSON-LD und Google-Feed lesen product.description roh, die
  # Laufzeit-Ausblendung im Theme hilft dort nicht). Läuft in Chargen von 2500 bis die
  # Schlusszeile «FERTIG:» im Log steht (Index erschöpft); danach Ruhe.
  # ⚠️ REIHENFOLGE (04.09.2026): Dieser Block steht bewusst ZULETZT unter dem geteilten
  # Produkttext-Schloss. Alle Schreiber nehmen es mit «flock -n» — wer zuerst startet,
  # gewinnt, die anderen treten sofort ab. Mit 21'949 kosmetischen Faellen und CAP=2500
  # hielt dieser Lauf das Schloss ~40 Minuten und die KLEINEN, endlichen Klassen kamen
  # nie an die Reihe. Endliche Klassen zuerst, der Dauerlaeufer zuletzt — und mit
  # kleinerer Charge, damit er das Schloss oefter freigibt.
  TB=/tmp/trust_baustein.log
  if [ -f "$REPO/automation/trust_baustein_wahrheit.py" ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/trust_baustein_wahrheit.py"{n++} END{exit(n?0:1)}'; then
      if ! grep -q "^FERTIG:" "$TB" 2>/dev/null; then
        ( cd "$REPO" && setsid bash -c \
            "exec 9>/tmp/lock_produkttext.lock; flock -n 9 || exit 0; CAP=1200 exec python3 automation/trust_baustein_wahrheit.py" \
            >> "$TB" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) trust_baustein_wahrheit gestartet"
      fi
    fi
  fi
  # DATEISPEICHER (04.09.2026, Betreiber «datei speicher regeln»): Der Shopify-Dateispeicher
  # ist voll — seit dem 01.09. scheitert JEDER Upload in die Dateien-Bibliothek mit
  # FILE_STORAGE_LIMIT_EXCEEDED (TikTok-Queue, Befehlskanal, Kundinnenfotos). Gemessen sind
  # die 4'000 neuesten Dateien ausnahmslos Produktbilder aus dem September (912 MB); der
  # Grind legt ~1 GB pro Tag an. Der grösste sicher löschbare Block sind die Medien der
  # BigBuy-ENTWÜRFE — der Lieferant ist seit dem 10.07. abgeschaltet (Betreiber-Entscheid),
  # die Ware ist nicht kaufbar, und das PRODUKT bleibt vollständig bestehen; gelöscht wird
  # nur das Bildmaterial. ⚠️ Der Lauf fasst NIE ein aktives Produkt an (Prüfung am Objekt).
  DSL=/tmp/dateispeicher.log
  if [ -f "$REPO/automation/dateispeicher_aufraeumen.py" ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/dateispeicher_aufraeumen.py"{n++} END{exit(n?0:1)}'; then
      # Tor auf dem ZUSTAND, nicht auf dem Log (05.09.): «Klasse vollstaendig durchlaufen» stand
      # im Log vom Lauf UNTER dem Stichtag — das Log ist ein Zeugnis ueber die Vergangenheit.
      # Das Skript selbst haelt in /tmp/dateispeicher_klassen_fertig.txt fest, welche Klasse
      # OHNE Abkuerzung durch ist; erst wenn alle drei (KLASSEN-Standard im Skript) dort
      # stehen, gibt es nichts mehr zu tun.
      if [ "$(sort -u /tmp/dateispeicher_klassen_fertig.txt 2>/dev/null | grep -c .)" -lt 3 ]; then
        ( cd "$REPO" && setsid bash -c \
            "exec 9>/tmp/lock_dateispeicher.lock; flock -n 9 || exit 0; DRY=0 CAP=2500 PARALLEL=4 exec python3 automation/dateispeicher_aufraeumen.py" \
            >> "$DSL" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) dateispeicher_aufraeumen gestartet"
      fi
    fi
  fi
  # CH-VERSENDBARKEIT SICHTBARER CJ-WARE (03.09.2026, Klasse Bestellung #1016): Klingen/Schärfer, Such-
  # Landeseiten, Hype, Bestseller per freightCalculate CN→CH; ohne Option → DRAFT + cj-nicht-versendbar-ch.
  # Läuft gegen den geteilten CJ-Eimer langsam (~1–2/min) und stirbt mit jedem Container-Neustart —
  # der Aufseher startet ihn neu, bis ein Lauf «FERTIG: geprüft 0» meldet (keine Kandidaten mehr).
  VS=/tmp/cj_versand_ch_sichtbar.log
  if [ -f "$REPO/automation/cj_versand_ch_sichtbar.py" ] && [ -f /tmp/cj_token_shared.txt ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/cj_versand_ch_sichtbar.py"{n++} END{exit(n?0:1)}'; then
      if ! grep -q "^FERTIG: geprüft 0 " "$VS" 2>/dev/null; then
        ( cd "$REPO" && setsid bash -c \
            "exec 9>/tmp/lock_cj_versand_sichtbar.lock; flock -n 9 || exit 0; FIX=1 exec python3 automation/cj_versand_ch_sichtbar.py" \
            >> "$VS" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) cj_versand_ch_sichtbar gestartet"
      fi
    fi
  fi
  # FAKTENBLOCK-NACHTRAG FUER LANDESEITEN (02.09.2026): cj_specs_backfill.mjs traegt den
  # Produktdetails-Block aus CJ-Daten dort nach, wo Menschen ankommen (dropship/_cj_specs_prio.txt,
  # ShopifyQL-Landeseiten). Kostet CJ-Punkte (~20 je Produkt) → einmal taeglich, LIMIT 30, bis
  # die Schlusszeile «FERTIG:» im Log steht. Log-Alter statt Prozess (Lauf dauert Minuten).
  SB=/tmp/cj_specs_backfill.log
  if [ -f "$REPO/automation/cj_specs_backfill.mjs" ] && [ -f "$REPO/dropship/_cj_specs_prio.txt" ]; then
    SB_ALTER=$(( $(date +%s) - $(stat -c %Y "$SB" 2>/dev/null || echo 0) ))
    # ⚠️ 22.09.2026: Hier stand `! grep -q "^FERTIG:" "$SB"` — und NIEMAND setzt das Log je zurueck.
    # Sobald der Lauf einmal «FERTIG» schrieb, war das Tor fuer immer zu: 249 neue Prio-Eintraege
    # der Politur (besuchte Seiten) haetten nie einen Faktenblock bekommen. Die Frage ist nicht
    # «stand da mal FERTIG», sondern «gibt es Prio-Handles ohne Quittung» (prio minus done).
    SB_OFFEN=$(comm -23 <(cut -f1 "$REPO/dropship/_cj_specs_prio.txt" | sort -u) <(cut -f1 "$REPO/dropship/_cj_specs_done.txt" 2>/dev/null | sort -u) | wc -l)
    if [ "$SB_OFFEN" -gt 0 ] && [ "$SB_ALTER" -gt 43200 ]; then
      # ⚠️ Umleitung HINTER dem Schloss: `>` leert das Log schon beim Einrichten. Ein Lauf, der
      # am `flock -n` scheitert, haette hier gleich zwei Tore zurueckgesetzt — die «FERTIG:»-Zeile
      # waere weg (der Lauf finge von vorn an) und die mtime waere frisch (12-Stunden-Tor).
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_cj_specs_backfill.lock; flock -n 9 || exit 0; exec > \"$SB\" 2>&1; \
           LIMIT=400 exec /opt/node22/bin/node automation/cj_specs_backfill.mjs" 9>&- & )   # 27.09.: 30 → 400 (Prio-Liste um 45k erweitert, Betreiber «push die infos von cj auch in shop»)
      echo "$(date -u +%H:%M) cj_specs_backfill gestartet ($SB_OFFEN offen)"
    fi
  fi
  # GOOGLE-SPERREN DURCHSETZEN, einmal täglich. Am 14.08.2026 standen ALLE 16 Produkte, die
  # wegen von Google selbst gemeldeter Richtlinienverstösse aus dem Kanal genommen worden
  # waren, wieder drin — zurückgeholt von `gfeed_restore.py` (14) und
  # `google_kanal_nachziehen.py` (2). Beide lesen jetzt `google_sperrliste.py`, aber ein
  # dritter Publizierer kann morgen dasselbe tun. Dieser Lauf prüft 17 Produkt-IDs und
  # kostet Sekunden; er ist die Versicherung gegen den Publizierer, den wir noch nicht kennen.
  MS=/tmp/merchant_sperre_durchsetzen.log
  if [ -f "$REPO/automation/merchant_sperre_durchsetzen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$MS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$MS"; then
      touch "$MS"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_merchant_sperre_durchsetzen.lock; flock -n 9 || exit 0; exec python3 automation/merchant_sperre_durchsetzen.py" >> "$MS" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) merchant_sperre_durchsetzen gestartet"
    fi
  fi
  # BIGBUY-VERSANDFALLE DURCHSETZEN, einmal täglich gegen LIVE (20.08.2026). BigBuy liefert
  # in die CH nur über SEUR ab ~EUR 27.94 Fracht — ein Artikel für CHF 12.90 kostet bei jedem
  # Verkauf rund CHF 20 mehr, als er einbringt. Der Bereinigungslauf vom 10.07. hat ~2'100
  # solcher Artikel gedraftet, ZWEI standen am 20.08. wieder ACTIVE im Google-Kanal — beide
  # im Ledger `_bb_cleanup_done.txt` als erledigt vermerkt und danach von `gfeed_restore.py`
  # bzw. `google_kanal_nachziehen.py` zurückgeholt. Genau die Falle aus §46+23-Audit: ein
  # Einmal-Lauf gegen einen Export plus Erledigt-Ledger schützt NICHT gegen den Publizierer,
  # der danach kommt. Dieser Lauf fragt den LIVE-Stand und kennt kein Ledger.
  BB=/tmp/bb_unrentabel_guard.log
  if [ -f "$REPO/automation/bb_unrentabel_guard.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BB" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$BB"; then
      touch "$BB"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_bb_unrentabel_guard.lock; flock -n 9 || exit 0; exec python3 automation/bb_unrentabel_guard.py" >> "$BB" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bb_unrentabel_guard gestartet"
    fi
  fi
  # MEDIZINISCHE ZWECKBESTIMMUNG, einmal täglich über die Neuimporte der letzten 3 Tage.
  # Seit dem 14.08. prüfen `cj_category_fill.mjs` und `cj_sku_import.mjs` schon beim Anlegen
  # (automation/medizin_zweck.mjs) — dieser Lauf ist die zweite Reihe für den Importer, den
  # wir noch nicht kennen, und für Ware, deren Text nachträglich geändert wurde. Er liest
  # bewusst LIVE (SEIT=…) statt aus dem Voll-Export: der Export vom 12.08. kannte das
  # «Kabellose WiFi Otoskop» vom 13.08. nicht, das live im Google-Kanal stand.
  MZ=/tmp/medizin_zweck_guard.log
  if [ -f "$REPO/automation/medizin_zweck_guard.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$MZ" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$MZ"; then
      touch "$MZ"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # 25.09.2026: Nur-Neuimporte (3 Tage) prüfte seit der Grind-Pause 0 Produkte je Lauf — zurückgeholte und nachträglich
      # geänderte Altware lief nie durch (Hallux-Schiene, Hämorrhoidenkissen). Einmal je 7 Tage deshalb der GANZE Bestand.
      MZ_SEIT=$(date -u -d '3 days ago' +%F); MZ_VOLL="$REPO/dropship/_medizin_voll_stand.txt"; MZ_STEMPEL=/dev/null
      MZ_LETZT=$(cat "$MZ_VOLL" 2>/dev/null || echo 2000-01-01)
      if [ "$(date -u -d "$MZ_LETZT" +%s 2>/dev/null || echo 0)" -lt "$(date -u -d '7 days ago' +%s)" ]; then
        MZ_SEIT=2020-01-01; MZ_STEMPEL="$MZ_VOLL"
      fi
      # Stempel erst nach Exit 0 (25.09.2026, Nachtrag 84 — ein Neustart mitten in der Vollrunde verschob sie sonst um 7 Tage).
      ( cd "$REPO" && setsid bash -c "SEIT=$MZ_SEIT python3 automation/medizin_zweck_guard.py && date -u +%F > '${MZ_STEMPEL:-/dev/null}'" \
          >> "$MZ" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) medizin_zweck_guard gestartet"
    fi
  fi
  # TIERSCHUTZ TSchV Art. 76, einmal täglich über die Neuimporte der letzten 3 Tage.
  # Am 16.08. wurden zwei Schock-Halsbänder als Sofortmassnahme gedraftet; am 20.08. standen
  # VIERZEHN solche Geräte aktiv in allen sechs Kanälen — zwölf davon in den sieben Tagen davor
  # neu angelegt, drei am Tag, nachdem eine engere Wache in den Importer geschrieben worden war.
  # Ein Einmal-Ledger meldet bei dieser Klasse «fertig», während der Shop wieder voll davon ist.
  # Meldet nur; Reparatur bewusst mit FIX=1 von Hand, damit niemand blind draftet.
  TS=/tmp/tierschutz_guard.log
  if [ -f "$REPO/automation/tierschutz_guard.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TS" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$TS"; then
      touch "$TS"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # 25.09.2026: wie Medizin/Waffen — Nur-Neuimporte sehen seit der Grind-Pause fast nichts; je 7 Tage der GANZE Bestand,
      # Stempel erst nach Exit 0 (Nachtrag 84/85).
      TS_SEIT=$(date -u -d '3 days ago' +%F); TS_VOLL="$REPO/dropship/_tierschutz_voll_stand.txt"; TS_STEMPEL=/dev/null
      TS_LETZT=$(cat "$TS_VOLL" 2>/dev/null || echo 2000-01-01)
      if [ "$(date -u -d "$TS_LETZT" +%s 2>/dev/null || echo 0)" -lt "$(date -u -d '7 days ago' +%s)" ]; then
        TS_SEIT=2020-01-01; TS_STEMPEL="$TS_VOLL"
      fi
      ( cd "$REPO" && setsid bash -c "SEIT=$TS_SEIT python3 automation/tierschutz_guard.py && date -u +%F > '$TS_STEMPEL'" \
          >> "$TS" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tierschutz_guard gestartet"
    fi
  fi
  # 🔎 VERDECKTE ÜBERWACHUNG + WAFFEN, einmal täglich über die Neuimporte der letzten 3 Tage.
  # ⚠️ 28.08.2026 — DER WÄCHTER STAND IN KEINER STARTLISTE. `grep -c ueberwachung_waffen_guard`
  # ergab in fixer_keepalive.sh UND engine_keepalive.sh je 0; sein Ledger stammte vom 14.08.,
  # seither sind 5'421 neue aktive Produkte entstanden. Dieselbe Lücke wie beim Aufseher selbst
  # (Lehre 19.08.: «Wer startet DICH neu?»). Gefunden wurden dabei zwei ACTIVE Geräte im
  # Google-Kanal, die genau deshalb monatelang niemand gesehen hätte: ein Diktiergerät im
  # Armbanduhr-Gehäuse und eine WLAN-Minikamera mit «diskreter Audioaufnahme».
  # Er liest LIVE (SEIT=…), nicht aus /tmp/export.jsonl — der Export ist ein Schnappschuss vom
  # 12.08. und kennt keinen einzigen dieser Fälle. Unbeaufsichtigt nimmt er nur aus dem
  # Google-Kanal und setzt ein Tag; auf DRAFT setzt er ausschliesslich die handverlesenen,
  # bildgeprüften Fälle aus dem festen BILDGEPRUEFT-Verzeichnis im Skript — er kann also nicht
  # von sich aus neue Ware draften.
  UW=/tmp/ueberwachung_waffen_guard.log
  if [ -f "$REPO/automation/ueberwachung_waffen_guard.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$UW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$UW"; then
      touch "$UW"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # 25.09.2026: Nur-Neuimporte (3 Tage) prüften seit der Grind-Pause 1 Seite je Lauf — Altware mit neuer Regel
      # (Feuerzeug in Pistolenform, Titel ohne Waffenwort) lief nie durch; der geteilte /tmp/export.jsonl trägt KEINEN
      # Beschreibungstext (0 von 49'892), Textanker-Regeln wären dort blind. Einmal je 7 Tage deshalb der GANZE Bestand
      # live. Stempel erst NACH erfolgreichem Lauf (Exit 0): ein Container-Neustart mitten in der Runde (Nachtrag 84)
      # verschiebt sie sonst um eine Woche.
      UW_SEIT=$(date -u -d '3 days ago' +%F); UW_VOLL="$REPO/dropship/_waffen_voll_stand.txt"; UW_STEMPEL=/dev/null
      UW_LETZT=$(cat "$UW_VOLL" 2>/dev/null || echo 2000-01-01)
      if [ "$(date -u -d "$UW_LETZT" +%s 2>/dev/null || echo 0)" -lt "$(date -u -d '7 days ago' +%s)" ]; then
        UW_SEIT=2020-01-01; UW_STEMPEL="$UW_VOLL"
      fi
      ( cd "$REPO" && setsid bash -c "SEIT=$UW_SEIT EXPORT=/nonexistent python3 automation/ueberwachung_waffen_guard.py && date -u +%F > '$UW_STEMPEL'" \
          >> "$UW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ueberwachung_waffen_guard gestartet"
    fi
  fi
  # 🏷️ BILD-ALT-TEXTE der Neuimporte, einmal täglich über die letzten Tage (20.08.2026).
  # Warum zusätzlich zu `alt_text_backfill.mjs` weiter unten: der sortiert CREATED_AT
  # ABSTEIGEND und merkt sich einen Cursor. Neue Produkte entstehen aber genau VORNE in
  # dieser Sortierung — also hinter dem Cursor, der dort längst vorbeigelaufen ist. Ein
  # Neuestes-zuerst-Sweep mit Cursor kann deshalb NIE etwas sehen, was nach seinem Start
  # angelegt wurde. Am 18.08. um 23:41 schrieb er zudem «FERTIG» ins Log, und der
  # ^FERTIG-Test im Node-Block startet einen so quittierten Lauf nie wieder. Ab da lief kein
  # Alt-Text-Nachfüller mehr, während der CJ-Grind täglich rund 2'000 Produkte nachlegte:
  # 5'739 aktive Produkte ab dem 17.08. trugen je genau EINEN Alt-Text statt sechs bis acht,
  # und bei rund 9 % von ihnen war ausgerechnet das HAUPTBILD das leere — das Bild der
  # Kollektionskachel, des Warenkorbs, der Google-Bildersuche und des Merchant-Feeds.
  # Dieser Lauf arbeitet deshalb über ein ZEITFENSTER gegen LIVE statt über einen Cursor
  # (dieselbe Bauart wie medizin_zweck_guard) und kennt kein dauerhaftes Erledigt-Zeichen.
  AT=/tmp/alt_texte_nachziehen.log
  if [ -f "$REPO/automation/alt_texte_nachziehen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$AT" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$AT"; then
      touch "$AT"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_alt_fenster.lock; flock -n 9 || exit 0; exec python3 automation/alt_texte_nachziehen.py" \
          >> "$AT" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) alt_texte_nachziehen gestartet"
    fi
  fi
  # DESIGNZWANG der «Selbst gestalten»-Produkte, einmal täglich nachziehen (14.08.2026).
  # Der Schutz liegt in vier Theme-Dateien (blocks/buy-buttons, sections/product-information,
  # snippets/quick-add, snippets/cart-summary). Ein Horizon-Update überschreibt genau solche
  # Dateien und würde den Schutz still entfernen — die Startseite sähe unverändert aus, aber
  # jedes POD-Produkt wäre wieder ohne Druckdatei kaufbar. Das Skript ist idempotent: es liest
  # die vier Dateien, findet die Marke LSPOD-DESIGNZWANG und tut nichts. Nur wenn die Marke
  # fehlt, schreibt es sie zurück. Kostet eine Abfrage pro Tag.
  PD=/tmp/pod_designzwang.log
  if [ -f "$REPO/automation/pod_designzwang.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$PD" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$PD"; then
      touch "$PD"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_pod_designzwang.lock; flock -n 9 || exit 0; exec python3 automation/pod_designzwang.py" >> "$PD" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) pod_designzwang gestartet"
    fi
  fi
  # VERSANDPROFILE einmal täglich prüfen (14.08.2026). Gelato und Printful legen jedes neu
  # synchronisierte POD-Produkt automatisch in ihr Format-Profil. Steht dort ein CH-Tarif
  # über 0.00, addiert Shopify ihn zum Tarif des Standardprofils — ein einziger solcher
  # Artikel im Korb kippt dann den «Gratis-Versand ab CHF 50», den Ankündigungsleiste,
  # Produktseite und Warenkorb-Balken versprechen. Genau so waren 166 Varianten betroffen.
  # Das Skript holt jede ACTIVE-Variante aus solchen Profilen ins Standardprofil zurück und
  # ist idempotent: ist nichts Neues dazugekommen, findet es 0 und schreibt nichts.
  VP=/tmp/versandprofil_poster.log
  if [ -f "$REPO/automation/versandprofil_poster.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$VP" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$VP"; then
      touch "$VP"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # 24.09.2026: «--scharf» stand AUSSERHALB der bash-c-Zeichenkette — bash nahm es als $0, Python bekam es nie.
      # Der Wächter lief so seit seinem Einbau nur als Probelauf («Probelauf. Mit --scharf schreiben.»).
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_versandprofil_poster.lock; flock -n 9 || exit 0; exec python3 automation/versandprofil_poster.py --scharf" >> "$VP" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) versandprofil_poster gestartet"
    fi
  fi
  # VERSANDSCHWELLE gegen RABATTE prüfen, einmal täglich (14.08.2026). Shopify misst die
  # Bedingung «Gratis-Versand ab …» am Betrag NACH Abzug der Rabatte. Der Automatik-Rabatt
  # «2+ Artikel -10%» drückte deshalb Körbe mit CHF 50.00–55.55 Warenwert unter die Schwelle:
  # die Leiste versprach Gratis-Versand, die Kasse verlangte CHF 7.00. Behoben, indem die
  # Bedingung auf 45.00 = 50.00 × 0.9 steht. Sie bricht wieder, sobald jemand einen
  # AUTOMATIK-Rabatt über 10 % anlegt. Deshalb NUR PRÜFEN, nicht selbst nachziehen — ein
  # Skript, das die Schwelle einem 30-%-Rabatt hinterherzieht, verschenkt still den Versand.
  VR=/tmp/versandschwelle_rabatt.log
  if [ -f "$REPO/automation/versandschwelle_rabatt.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$VR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$VR"; then
      touch "$VR"   # 21.09.2026: Anspruch VOR dem Start — die Tor-Frage ist das Log-Alter, und ein Lauf, der erst nach Minuten schreibt (oder am Shopify-Platz wartet), wurde nach 120 s ein zweites Mal gestartet (Bewertungs-Import 2x gemessen)
      # ⚠️ 21.09.2026: Hier stand `|| echo "⚠️ Versandschwelle passt nicht …"` — bei JEDEM Exit≠0.
      # Ein Absturz (Drossel, Token, Netz) und der echte Fachbefund lieferten beide Code 1, und
      # das Log meldete seit dem 10.09. TAEGLICH eine Abweichung, die es nie gab (jeder
      # gelungene Lauf sagt «OK — nichts zu tun»). Ein Wrapper, der aus jedem Fehler den
      # Fachbefund macht, erfindet Befunde. Jetzt: Exit 3 = Abweichung, sonst «nicht messbar».
      ( cd "$REPO" && python3 automation/versandschwelle_rabatt.py --pruefen >> "$VR" 2>&1; rc=$?
        case $rc in
          0) ;;
          3) echo "$(date -u +%F\ %H:%M) ⚠️ Versandschwelle passt nicht mehr zum höchsten Automatik-Rabatt — repariere (--scharf)" >> "$VR"
             # 22.09.2026: Der Befund stand nur hier im Log, und niemand las ihn. Gemessen 22.09.: Tarif ≥45 AUS,
             # ≥50 AN (nach dem 21.09. 22:13 umgestellt, kein Eintrag) → Totzone Warenwert 50.00–55.55 zahlte
             # CHF 7 trotz Zusage «Gratis ab 50». Die Rechnung ist deterministisch (beworben × (1 − Rabatt)) und
             # vom Betreiber am 14.08./15.09. so entschieden → der Wächter darf sie selbst wiederherstellen.
             python3 automation/versandschwelle_rabatt.py --scharf >> "$VR" 2>&1 \
               && echo "$(date -u +%F\ %H:%M) ✅ Versandschwelle wiederhergestellt" >> "$VR" \
               || echo "$(date -u +%F\ %H:%M) ⚠️ Versandschwelle NICHT repariert (Exit $?)" >> "$VR" ;;
          *) echo "$(date -u +%F\ %H:%M) ⚠️ versandschwelle_rabatt NICHT MESSBAR (Exit $rc, meist Drossel) — kein Fachbefund" >> "$VR" ;;
        esac )
      echo "$(date -u +%H:%M) versandschwelle_rabatt geprüft"
    fi
  fi
  # 🎯 PRIORITÄTSFENSTER 16:00–17:00 UTC (15.08.2026, teuer gelernt): Das CJ-Punktebudget
  # resetted um 16:00 UTC, und die vier Grind-Runner frassen es binnen Minuten weg — die
  # Prio-Jobs (Schulstart-Import, Variantenbilder) standen dadurch TAGELANG auf PAUSE, obwohl
  # sie jeden Durchlauf brav neu starteten. Im Fenster: Runner-Wrapper beenden (laufende
  # Node-Kinder klingen aus, das kostet nur einen Batch) und NICHT neu starten; der N-Block
  # oben startet die Prio-Jobs im 2-Min-Takt, die dann konkurrenzlos ziehen. Ab 17:00 läuft
  # der Grind normal weiter. Fenster entfällt, sobald beide Prio-Logs FERTIG melden.
  PRIO_OFFEN=0
  grep -q "^FERTIG" /tmp/schulstart_import.log 2>/dev/null || PRIO_OFFEN=1
  grep -q "^FERTIG" /tmp/cj_variantenbild.log 2>/dev/null || PRIO_OFFEN=1
  # 03.09.2026: Pause auch auf Zuruf (dropship/_GRIND_PAUSE_BIS = UTC-Epoche), dieselbe Regel wie in
  # engine_keepalive.sh — sonst startet DIESER Block die Runner 20 Minuten nach dem Stopp wieder.
  PAUSE_ZURUF=0; PBF="$REPO/dropship/_GRIND_PAUSE_BIS"
  if [ -f "$PBF" ] && [ "$(tr -dc 0-9 < "$PBF")" -gt "$(date -u +%s)" ] 2>/dev/null; then PAUSE_ZURUF=1; fi
  source "$REPO/automation/cj_vorrang_fenster.sh"
  if { cj_vorrang_zeit && [ "$PRIO_OFFEN" = "1" ]; } || [ "$PAUSE_ZURUF" = "1" ]; then
    touch /tmp/cj_prio_fenster
    pkill -f "cj_runner_template.sh" 2>/dev/null
    echo "$(date -u +%H:%M) Prio-Fenster: Grind-Runner pausiert (Punkte den Prio-Jobs)"
  else
  rm -f /tmp/cj_prio_fenster
  # CJ-Grind-Runner mitlaufen lassen (Turn-Reaping killt sie sonst jede Runde)
  # ⚠️ MIT SPERRE STARTEN (12.08.2026). Der pgrep-Test allein genügt nicht: `engines_up.sh`
  # prüft und startet dieselben Runner, und wer zwischen fremder Prüfung und fremdem Start
  # startet, erzeugt eine zweite Kopie. Genau so lief heute jeder Runner doppelt. Die
  # Sperre gehört dem laufenden Runner für seine ganze Lebensdauer — ein Zweitstart endet
  # dann von selbst, egal von welcher Seite er kommt. Gleicher Sperrname wie in engines_up.sh.
  # ⚠️ 04.09.2026 — GRIND-DROSSEL AUCH HIER. dropship/_GRIND_RUNNER_ZAHL begrenzt die Zahl
  # der Runner (Dateispeicher voll: der Grind legt ~1 GB Bilder pro Tag an). Dieser Block ist
  # der ZWEITE Runner-Starter neben engine_keepalive.sh — wer nur einen drosselt, sieht 20
  # Minuten spaeter wieder vier laufen. Dieselbe Geschwister-Falle wie bei der Zuruf-Pause.
  GRZ=$(tr -dc '0-9' < "$REPO/dropship/_GRIND_RUNNER_ZAHL" 2>/dev/null)
  case "$GRZ" in ''|*[!0-9]*) GRZ=4;; esac
  [ "$GRZ" -gt 4 ] && GRZ=4
  ERLAUBT=""; i=2; while [ "$i" -lt $((2+GRZ)) ]; do ERLAUBT="$ERLAUBT cj_runner$i"; i=$((i+1)); done
  for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
    case " $ERLAUBT " in *" $R "*) ;; *)
      pgrep -f "cj_runner_template.sh $R" >/dev/null && {
        echo "$(date -u +%H:%M) $R gestoppt (Grind-Drossel: $GRZ)"
        pkill -f "cj_runner_template.sh $R" 2>/dev/null; }
      continue ;;
    esac
    [ -f /tmp/$R.sh ] || continue
    pgrep -f "cj_runner_template.sh $R" >/dev/null && continue
    setsid bash -c "exec 9>/tmp/lock_cj_runner_template-$R.lock; flock -n 9 || exit 0;
                    exec bash /tmp/$R.sh" >> /tmp/$R.log 2>&1 9>&- &
    echo "$(date -u +%H:%M) restart $R"; sleep 3
  done
  fi
  # ⚠️ 23.08.2026 — HERZSCHLAG. Von aussen war bisher nur «0 Instanzen» und «>1
  # Instanzen» erkennbar. Ein Aufseher, der LEBT aber haengt (z. B. in do_wait auf
  # ein Kind, siehe Lehre 0f), besteht jede Prozesspruefung und startet trotzdem
  # keinen Waechter mehr. Heute stand er so von 07:36 bis 08:48 still, waehrend
  # beide Stunden-Routinen «AUFSEHER laeuft» meldeten. Diese Datei wird in JEDER
  # Runde angefasst; engine_keepalive.sh raeumt einen kalten Aufseher ab.
  date +%s > /tmp/_fixer_herzschlag
  sleep 120
done
