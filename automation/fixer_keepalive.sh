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
  tail -1 "$log" 2>/dev/null | grep -q "^PAUSE" || return 1
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
      -X POST "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json" \
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

  for p in default_variant_fix textbild_fix bild_klein_fix cj_verfuegbarkeit coll_live_check sku_dup_scan promo_aus_beschreibung gfeed_restore farbe_metafeld cj_versand_ch_guard seo_versandschwelle_fix unpublizierte_finden lagerstand_hygiene; do
    [ -f /tmp/$p.py ] || continue
    pgrep -f "$p.py" >/dev/null && continue
    # ABKÜHLZEIT: Reiniger, die durchlaufen und fertig werden, dürfen nicht alle 2 Minuten
    # neu starten — sie würden den ganzen Katalog im Dauerlauf erneut abfragen und Shopify
    # grundlos drosseln. Erst wenn das Log COOLDOWN Sekunden alt ist, gibt es einen neuen Lauf.
    if [ -f /tmp/$p.log ]; then
      ALTER=$(( $(date +%s) - $(stat -c %Y /tmp/$p.log 2>/dev/null || echo 0) ))
      [ "$ALTER" -lt "${COOLDOWN:-1800}" ] && continue
    fi
    # GESTAFFELT STARTEN (11.08.2026): Werden alle dreizehn Reiniger in derselben Schleifen-
    # runde geweckt, scannen sie gemeinsam 29'000 Produkte und leeren Shopifys Abfragebudget
    # in Sekunden. Danach antwortet die API mit «Throttled» — und die Helfer deuten das, je
    # nach Bauart, als «keine Daten». Genau so wurde eben eine Auswertung mit «0 Produkte ab
    # CHF 300» beendet, obwohl es Hunderte sind. Zehn Sekunden Abstand kosten nichts und
    # halten das Budget flach. (Dieselbe Lehre wie beim gestaffelten CJ-Runner-Start.)
    setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 9>&- & echo "$(date -u +%H:%M) restart $p"
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
  if [ -f "$REPO/automation/optionen_export.py" ] && [ ! -f /tmp/opts_frisch.jsonl ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2 ~ /optionen_export\.py$/ {n++} END {exit(n?0:1)}'; then
      ( cd "$REPO" && setsid flock -n /tmp/lock_optionen_export.lock \
          python3 automation/optionen_export.py >> /tmp/optionen_export.log 2>&1 9>&- & )
      echo "$(date -u +%H:%M) optionen_export gestartet/fortgesetzt"
    fi
  fi
  for L in preisboden farbwerte_zusammengesetzt suchwort_tags suchwort_mehrzahl google_identifier hauptbild_ohne_text umlaut_suchtags ss_statt_scharf_s bigbuy_abschied google_ads_kuration versand_jenachland lieferblock_doppelt fremdzeichen_guard handle_messversprechen tote_kollektionslinks variant_value_clean menue_links google_kanal_luecke ohne_lieferantenref_guard pod_druckdatei groesse_im_farbwert farbwert_dubletten mass_im_farbwert quittungs_wache; do
    fehlt "$REPO/automation/$L.py" && continue
    # ⚠️ FERTIG IST KEIN AUSSCHALTER (04.09.2026). Bis heute hiess «FERTIG im Log» =
    # nie wieder starten — nur ein /tmp-Wipe hat die Waechter je wieder geweckt. Gemessen:
    # NEUN von ihnen ruhten seit dem 30./31.08., darunter `google_kanal_luecke` (der einzige
    # Kanal mit Verkaeufen), `ohne_lieferantenref_guard` (die #1008-Klasse) und
    # `handle_messversprechen` — waehrend der Grind taeglich hunderte Produkte anlegte.
    # FERTIG heisst «zu DIESEM Zeitpunkt nichts zu tun», nicht «fuer immer erledigt».
    # Es gilt deshalb nur noch 20 Stunden; danach ist der Waechter wieder faellig.
    if grep -q "^FERTIG" "/tmp/$L.log" 2>/dev/null; then
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
    case " versand_jenachland lieferblock_doppelt ss_statt_scharf_s fremdzeichen_guard " in
      *" $L "*) TXTLOCK="exec 8>/tmp/lock_produkttext.lock; flock -w 240 8 || exit 0;" ;;
      *)        TXTLOCK="" ;;
    esac
    date +%s > "/tmp/_start_$L"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_$L.lock; flock -n 9 || exit 0; $TXTLOCK $EXP exec python3 automation/$L.py" \
        >> "/tmp/$L.log" 2>&1 9>&- 8>&- & )
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
  if [ "$VSTD" = "16" ] || { [ "$VSTD" = "17" ] && [ "${VMIN:-0}" -lt 30 ]; }; then VORRANGZEIT=1; fi
  for N in cj_bild_backfill cj_variantenbild cj_kosten_backfill schulstart_import alt_text_backfill frosch_maske_import; do
    if [ "$VORRANGZEIT" = "1" ] && [ "$N" != "cj_kosten_backfill" ]; then
      case "$N" in cj_bild_backfill|cj_variantenbild) continue ;; esac
    fi
    fehlt "$REPO/automation/$N.mjs" && continue
    grep -q "^FERTIG" "/tmp/$N.log" 2>/dev/null && continue
    pause_kuehlt "$N" && continue
    dreht_sich_im_kreis "$N" && continue
    ps -eo args --no-headers | awk -v s="automation/$N.mjs" \
      '$1 ~ /node$/ && $2 == s {n++} END {exit(n?0:1)}' && continue
    date +%s > "/tmp/_start_$N"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_$N.lock; flock -n 9 || exit 0; CAP=900 exec /opt/node22/bin/node automation/$N.mjs" \
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
  # 🎬 LIEFERANTENVIDEOS NACHHOLEN — bewusst in kleinen Schlucken. Von 34'824 aktiven
  # Produkten zeigen nur 144 ein Video, und CJ hat für die allermeisten auch keines: von 15
  # geprüften Kandidaten kam bei allen 15 `productVideo: null` zurück. Ein Lauf über den
  # ganzen Katalog kostete darum ~31'000 CJ-Punkte für vielleicht hundert Videos und nähme
  # dem Grind das Tagesbudget weg (das am 14.08. um 19:19 Uhr bereits erschöpft war). 60
  # Anfragen pro Tag sind neben 100'000 nichts und sammeln über die Wochen ein, was da ist.
  if [ ! -f /tmp/videos_$(date -u +%F) ]; then
    touch "/tmp/videos_$(date -u +%F)"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_cj_video_backfill.lock; flock -n 9 || exit 0;
         PRIO=dropship/_video_prio.txt CAP=60 exec /opt/node22/bin/node automation/cj_video_backfill.mjs" \
        >> /tmp/cj_video_backfill.log 2>&1 9>&- & )
    # ⚠️ CAP 300 war sinnlos: der Plan deckelt bei 250 Videos FUER DEN GANZEN SHOP. Der
    # Lauf prueft den Deckel jetzt vorab und arbeitet PRIO zuerst ab — die Plaetze gehoeren
    # der Ware, die auf der Startseite steht, nicht der naechstbesten in Anlegereihenfolge.
    echo "$(date -u +%H:%M) start cj_video_backfill (PRIO sichtbare Ware, 60/Tag — User 19.08.: «überall mit videos, mache auch bei uns»)"
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
    if [ "$ALTER" -gt 86400 ]; then
      # NUR_RAEUMEN: unbeaufsichtigt nur Abgelaufenes abräumen — Neuaufnahme braucht den
      # Kontaktbogen-Blick einer betreuten Runde (15.08.: 5 untaugliche Bilder auf Position 1).
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_hype_kuratieren.lock; flock -n 9 || exit 0; env NUR_RAEUMEN=1 exec python3 automation/hype_kuratieren.py" >> "$HY" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_bestseller_rotation.lock; flock -n 9 || exit 0; exec python3 automation/bestseller_rotation.py" >> "$BR" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bestseller_rotation gestartet"
    fi
  fi
  # NEUHEITEN-ROTATION, einmal täglich (05.09.2026, Audit mobil-startseite: «Neuheiten 2026» und
  # «Elektronik» zeigten 10/12 dieselben Beamer — CREATED_DESC folgt dem Grind). Holt je Welt das
  # juengste brauchbare Produkt an den Anfang der MANUAL-Kollektion `neu-eingetroffen`. Idempotent je Tag.
  NR=/tmp/neuheiten_rotation.log
  if [ -f "$REPO/automation/neuheiten_rotation.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$NR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_ig_dup_wache.lock; flock -n 9 || exit 0; exec python3 automation/ig_dup_wache.py" >> "$IW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ig_dup_wache gestartet"
    fi
  fi
  # HYPE-REVIEWS, einmal täglich: echte CJ-Reviews (≥4★) für die Trend-Reihe zu Judge.me —
  # Social Proof genau dort, wo die Startseite hinzeigt. Bricht bei leeren CJ-Punkten sauber ab.
  HR=/tmp/reviews_hype.log
  if [ -f "$REPO/automation/reviews_hype_lauf.sh" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$HR" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      # 05.09.2026: ERST die sichtbare Ware. Der alte Lauf nahm eine Zufallsscheibe aus 53'000
      # Produkten (Trefferchance auf ein sichtbares ~0,3 %); von 187 Produkten in den Startseiten-
      # Reihen hatten nur 23 eine Bewertung. bewertungen_prio.py baut die Arbeitsliste, der Ledger
      # des Importers macht sie über Container-Neustarts hinweg fortsetzbar.
      ( cd "$REPO" && setsid sh -c 'python3 automation/bewertungen_prio.py >> "'"$RV2"'" 2>&1; . /tmp/judgeme.env; . /tmp/cj_creds.env 2>/dev/null; . /tmp/dienste.env 2>/dev/null; . /tmp/secrets_env.sh 2>/dev/null; export CJ_EMAIL="${CJ_EMAIL:-$(cat /tmp/cj_email 2>/dev/null)}" CJ_API_KEY="${CJ_API_KEY:-$(cat /tmp/cj_apikey 2>/dev/null)}"; P=dropship/_bewertungen_prio.txt; if [ -s "$P" ]; then ONLY="$(head -150 "$P" | paste -sd, -)" LIMIT=150 MIN_SCORE=4 PER=8 /opt/node22/bin/node automation/cj_reviews_import.mjs; else LIMIT=120 MIN_SCORE=4 PER=6 /opt/node22/bin/node automation/cj_reviews_import.mjs; fi' >> "$RV2" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_ratgeber_ohne_ware.lock; flock -n 9 || exit 0; exec python3 automation/ratgeber_ohne_ware.py" >> "$ROW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ratgeber-ohne-ware geprüft"
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c '
          python3 automation/kosten_export_bauen.py
          LIMIT=400 python3 automation/kosten_boden15_korrigieren.py' >> "$KOS" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) kostenwahrheit nachgezogen"
    fi
  fi
  TTK=/tmp/tiktok_karussell.log
  if [ -f "$REPO/automation/tiktok_karussell.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TTK" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c '
          MODUS=produkt ANZAHL=1 python3 automation/tiktok_karussell.py
          MODUS=top ANZAHL=1 SLIDES=7 SLUGZEIT=$(date -u +%m%d) python3 automation/tiktok_karussell.py
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_tote_landeseiten.lock; flock -n 9 || exit 0; env FIX=1 exec python3 automation/tote_landeseiten.py" >> "$TLS" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_google_size_metafeld.lock; flock -n 9 || exit 0; env FIX=1 CAP=1200 exec python3 automation/google_size_metafeld.py" >> "$GS" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_ratgeber_rueckverweis.lock; flock -n 9 || exit 0; env FIX=1 exec python3 automation/ratgeber_rueckverweis.py" >> "$RV" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
      echo "$(date -u +%H:%M) wahlversprechen geprüft"
    fi
  fi
  # Messversprechen an Wearables (Blutdruck/EKG/Blutzucker). Der Waechter existierte seit dem
  # 21.08., stand aber in KEINER Startliste und ist nie gelaufen — waehrenddessen hat der Grind
  # 104 neue Produkte mit genau diesen Aussagen angelegt, drei davon mit BLUTZUCKER. Das ist die
  # Klasse, bei der ein Irrtum gesundheitlich zaehlt (Lehre 11.08.). «Wer startet DICH neu?»
  WM=/tmp/wearable_mess.log
  if [ -f "$REPO/automation/wearable_messversprechen.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$WM" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
  DU=/tmp/produkt_du_lauf.log
  if [ -f "$REPO/automation/produkttexte_du_form.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$DU" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_produkttext.lock; flock -w 2400 9 || exit 0; exec > \"$DU\" 2>&1; \
           CAP=150 python3 automation/produkttexte_du_form.py && \
           WRITE=1 exec python3 automation/produkttexte_du_form.py" 9>&- & )
      echo "$(date -u +%H:%M) produkttexte_du_form gestartet"
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
        ( cd "$REPO" && setsid flock -n /tmp/lock_klassen_kontrolle.lock \
            env NEU=1 python3 automation/klassen_kontrolle.py > "$KK" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) klassen_kontrolle neu gestartet"
      fi
    fi
  fi
  BD=/tmp/bilddubletten.log
  if [ -f "$REPO/automation/bilddubletten.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BD" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && HASHCAP=4000 setsid bash -c "exec 9>/tmp/lock_bilddubletten.lock; flock -n 9 || exit 0; exec python3 automation/bilddubletten.py" >> "$BD" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bild-dubletten geprüft"
    fi
  fi
  TL=/tmp/tote_links.log
  if [ -f "$REPO/automation/tote_links.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_bestandsgroesse.lock; flock -n 9 || exit 0; exec python3 automation/bestandsgroesse_wache.py" >> "$BG" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) bestandsgroesse geprüft"
    fi
  fi
  KL=/tmp/kollektion_leer.log
  if [ -f "$REPO/automation/kollektion_leer.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid env QUELLE=live SEIT=$(date -u -d '2 days ago' +%F) \
          python3 automation/google_ads_kuration.py >> "$AK" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) ads_kuration Live-Nachzug gestartet"
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
  if [ -f "$REPO/automation/produktdetails_wahrheit.py" ] && [ -s "$PDF" ]; then
    if ! ps -eo args --no-headers | awk '$1 ~ /python3$/ && $2=="automation/produktdetails_wahrheit.py"{n++} END{exit(n?0:1)}'; then
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_produkttext.lock; flock -n 9 || exit 0; MODUS=floskel CAP=200 LISTE=dropship/_klassen/floskel-hochwertiges-material.txt exec python3 automation/produktdetails_wahrheit.py" \
          >> "$PDW" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) produktdetails_wahrheit (Floskel) gestartet"
    fi
  fi
  # PRODUKTDETAILS NACHMESSEN (08.09.2026): MELDET NUR — und laeuft bewusst VOR der
  # Vereinigung. Grund: Der Zombie ist belegt (506 «vereint»-Quittungen auf 150 Produkte, kein
  # einziges «live-schon-sauber»), der Verursacher aber nicht benannt. Wer den Block
  # zurueckschreibt, hinterlaesst dabei eine MINUTE in updatedAt — und die Vereinigung wuerde
  # genau diese Spur ueberschreiben. Erst messen, dann reparieren.
  PDNM=/tmp/pd_nachmessen.log
  if [ -f "$REPO/automation/produktdetails_nachmessen.py" ] && [ -s "$REPO/dropship/_klassen/produktdetails-doppelt.txt" ]; then
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
  if [ -f "$REPO/automation/produktdetails_vereinen.py" ] && [ -s "$PDL" ]; then
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
    if ! grep -q "^FERTIG:" "$SB" 2>/dev/null && [ "$SB_ALTER" -gt 43200 ]; then
      # ⚠️ Umleitung HINTER dem Schloss: `>` leert das Log schon beim Einrichten. Ein Lauf, der
      # am `flock -n` scheitert, haette hier gleich zwei Tore zurueckgesetzt — die «FERTIG:»-Zeile
      # waere weg (der Lauf finge von vorn an) und die mtime waere frisch (12-Stunden-Tor).
      ( cd "$REPO" && setsid bash -c \
          "exec 9>/tmp/lock_cj_specs_backfill.lock; flock -n 9 || exit 0; exec > \"$SB\" 2>&1; \
           LIMIT=30 exec /opt/node22/bin/node automation/cj_specs_backfill.mjs" 9>&- & )
      echo "$(date -u +%H:%M) cj_specs_backfill gestartet"
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && SEIT=$(date -u -d '3 days ago' +%F) setsid python3 \
          automation/medizin_zweck_guard.py >> "$MZ" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && SEIT=$(date -u -d '3 days ago' +%F) setsid python3 \
          automation/tierschutz_guard.py >> "$TS" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && SEIT=$(date -u -d '3 days ago' +%F) EXPORT=/nonexistent setsid python3 \
          automation/ueberwachung_waffen_guard.py >> "$UW" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_versandprofil_poster.lock; flock -n 9 || exit 0; exec python3 automation/versandprofil_poster.py" --scharf >> "$VP" 2>&1 9>&- & )
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
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && python3 automation/versandschwelle_rabatt.py --pruefen >> "$VR" 2>&1 \
        || echo "$(date -u +%F\ %H:%M) ⚠️ Versandschwelle passt nicht mehr zum höchsten Automatik-Rabatt" >> "$VR" )
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
  if { [ "$(date -u +%H)" = "16" ] && [ "$PRIO_OFFEN" = "1" ]; } || [ "$PAUSE_ZURUF" = "1" ]; then
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
