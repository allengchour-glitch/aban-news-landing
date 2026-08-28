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
  aeltere=$(ps -eo pid,etimes,args --no-headers \
    | awk -v me=$$ -v mysec="$(ps -o etimes= -p $$ | tr -d ' ')" \
      '$3=="bash" && $4 ~ /fixer_keepalive\.sh$/ && $1 != me \
       && ($2 > mysec || ($2 == mysec && $1 < me)) {n++} END{print n+0}')
  # ⚠️ NICHT SOFORT ABTRETEN. Die erste Fassung dieser Regel beendete den jüngeren
  # Supervisor auf der Stelle — und wenn der ältere Sekunden später starb, lief GAR KEINER
  # mehr. Genau das geschah am 14.08. um 01:22. Deshalb wird nach einer Pause noch einmal
  # nachgesehen: nur wer dann immer noch einen älteren findet, tritt ab. Seit der geerbte
  # Deskriptor geschlossen wird (9>&-), trägt ohnehin wieder die flock-Sperre; diese Regel
  # ist nur noch das Netz darunter und darf deshalb nie zur Ursache eines Ausfalls werden.
  if [ "$aeltere" -gt 0 ]; then
    sleep 5
    aeltere=$(ps -eo pid,etimes,args --no-headers \
      | awk -v me=$$ -v mysec="$(ps -o etimes= -p $$ | tr -d ' ')" \
        '$3=="bash" && $4 ~ /fixer_keepalive\.sh$/ && $1 != me \
         && ($2 > mysec || ($2 == mysec && $1 < me)) {n++} END{print n+0}')
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
  pgrep -f "/tmp/cj_fulfill_runner.sh" >/dev/null || { setsid bash /tmp/cj_fulfill_runner.sh >> /tmp/cj_fulfill_runner.log 2>&1 9>&- & echo "$(date -u +%H:%M) restart cj_fulfill_runner"; }
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
  for L in produktdetails_vereinen preisboden farbwerte_zusammengesetzt suchwort_tags suchwort_mehrzahl google_identifier hauptbild_ohne_text umlaut_suchtags ss_statt_scharf_s bigbuy_abschied google_ads_kuration versand_jenachland fremdzeichen_guard handle_messversprechen tote_kollektionslinks variant_value_clean menue_links google_kanal_luecke ohne_lieferantenref_guard pod_druckdatei groesse_im_farbwert farbwert_dubletten mass_im_farbwert; do
    fehlt "$REPO/automation/$L.py" && continue
    grep -q "^FERTIG" "/tmp/$L.log" 2>/dev/null && continue      # durchgelaufen
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
    # versand_jenachland braucht seine Kandidatenliste; ohne sie fände es nichts und
    # meldete stillschweigend Erfolg. Fehlt die Datei (Container gewiped), wird der Lauf
    # übersprungen statt ins Leere zu laufen — ein neuer Export ist dann fällig.
    if [ "$L" = versand_jenachland ] || [ "$L" = fremdzeichen_guard ]; then
      [ -f /tmp/versand_quelle.jsonl ] || continue
      EXP="QUELLE=/tmp/versand_quelle.jsonl"
    fi
    # groesse_im_farbwert liest seine Kandidaten aus einem Bulk-Export. Ohne die Datei
    # meldet es PAUSE statt ins Leere zu laufen — hier gar nicht erst starten.
    [ "$L" = groesse_im_farbwert ] && [ ! -f /tmp/groesse_im_farbwert.json ] && continue
    # farbwert_dubletten braucht einen Options-Export; ohne ihn meldet es PAUSE.
    if [ "$L" = farbwert_dubletten ] || [ "$L" = mass_im_farbwert ]; then
      [ -f /tmp/opts_frisch.jsonl ] || continue
      EXP="QUELLE=/tmp/opts_frisch.jsonl"
    fi
    date +%s > "/tmp/_start_$L"
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_$L.lock; flock -n 9 || exit 0; $EXP exec python3 automation/$L.py" \
        >> "/tmp/$L.log" 2>&1 9>&- & )
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
         CAP=300 exec /opt/node22/bin/node automation/cj_video_backfill.mjs" \
        >> /tmp/cj_video_backfill.log 2>&1 9>&- & )
    echo "$(date -u +%H:%M) start cj_video_backfill (300/Tag — User 19.08.: «überall mit videos, mache auch bei uns»)"
  fi
  # HYPE-REIHE DER STARTSEITE, einmal täglich (Auftrag des Betreibers 12.08.2026: «wenn hype
  # vorbei produkt ändern»). Der Lauf nimmt abgelaufene Artikel aus der Reihe und füllt aus den
  # hinterlegten Themen nach — das ist der Teil, der ohne Zutun laufen muss, damit die Reihe
  # nicht ein halbes Jahr lang dieselben sechs Artikel zeigt.
  # ⚠️ Was er NICHT kann: neue Themen finden. Dafür braucht es eine Web-Recherche, und die
  # gehört an den Anfang jeder Session (siehe CLAUDE.md). Der Automat hält die Reihe frisch,
  # aktuell hält sie nur, wer nachschaut, was gerade läuft.
  HY=/tmp/hype_kuratieren.log
  if [ -f "$REPO/automation/hype_kuratieren.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$HY" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      # NUR_RAEUMEN: unbeaufsichtigt nur Abgelaufenes abräumen — Neuaufnahme braucht den
      # Kontaktbogen-Blick einer betreuten Runde (15.08.: 5 untaugliche Bilder auf Position 1).
      ( cd "$REPO" && setsid env NUR_RAEUMEN=1 python3 automation/hype_kuratieren.py >> "$HY" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) hype_kuratieren gestartet (nur abräumen)"
    fi
  fi
  # IG-DUPLIKAT-WACHE, einmal täglich (User 18.08.: «poste nie mehr das gleiche»): ein
  # externer Planer re-postet die alte Queue ~alle 12 Tage; bis die Quelle gefunden ist,
  # löscht die Wache jeden neuen Doppelpost (ältester bleibt, nie >10 Likes).
  IW=/tmp/ig_dup_wache.log
  if [ -f "$REPO/automation/ig_dup_wache.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$IW" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid python3 automation/ig_dup_wache.py >> "$IW" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid sh -c '. /tmp/judgeme.env; . /tmp/cj_creds.env 2>/dev/null; . /tmp/secrets_env.sh 2>/dev/null; LIMIT=120 MIN_SCORE=4 PER=6 /opt/node22/bin/node automation/cj_reviews_import.mjs' >> "$RV2" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) cj-bewertungen gestartet"
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
      ( cd "$REPO" && setsid env FIX=1 CAP=1200 python3 automation/google_size_metafeld.py >> "$GS" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid env FIX=1 python3 automation/ratgeber_rueckverweis.py >> "$RV" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid python3 automation/tote_rabattcodes.py >> "$TR" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid python3 automation/veraltete_verweise.py >> "$VV" 2>&1 9>&- & )
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
      ( cd "$REPO" && CAP=60 setsid python3 automation/bild_quadrat_auffuellen.py >> "$BQ" 2>&1 9>&- & )
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
      ( cd "$REPO" && CAP=6000 FIX=1 setsid python3 automation/wahlversprechen.py >> "$WV" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) wahlversprechen geprüft"
    fi
  fi
  BD=/tmp/bilddubletten.log
  if [ -f "$REPO/automation/bilddubletten.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$BD" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && HASHCAP=4000 setsid python3 automation/bilddubletten.py >> "$BD" 2>&1 9>&- & )
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
      ( cd "$REPO" && CAP=150 setsid python3 automation/bild_gross_nachladen.py >> "$BG" 2>&1 9>&- & )
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
  KL=/tmp/kollektion_leer.log
  if [ -f "$REPO/automation/kollektion_leer.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$KL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid python3 automation/kollektion_leer.py >> "$KL" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) leere-kollektionen geprüft"
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
      if [ "$START" = 1 ]; then
        ( cd "$REPO" && setsid bash -c \
            "exec 9>/tmp/lock_versand_live.lock; flock -n 9 || exit 0; QUELLE=live IGNORIERE_LEDGER=1 exec python3 automation/versandaussagen_wahrheit.py" \
            >> "$VL" 2>&1 9>&- & )
        echo "$(date -u +%H:%M) versandaussagen Live-Kontrolle gestartet"
      fi
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
      ( cd "$REPO" && setsid python3 automation/merchant_sperre_durchsetzen.py >> "$MS" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid python3 automation/bb_unrentabel_guard.py >> "$BB" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid python3 automation/pod_designzwang.py >> "$PD" 2>&1 9>&- & )
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
      ( cd "$REPO" && setsid python3 automation/versandprofil_poster.py --scharf >> "$VP" 2>&1 9>&- & )
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
  if [ "$(date -u +%H)" = "16" ] && [ "$PRIO_OFFEN" = "1" ]; then
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
  for R in cj_runner2 cj_runner3 cj_runner4 cj_runner5; do
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
