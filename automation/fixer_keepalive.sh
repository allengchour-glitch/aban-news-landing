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
  [ -f /tmp/shop_token_refresh.sh ] && bash /tmp/shop_token_refresh.sh
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
  for L in produktdetails_vereinen preisboden farbwerte_zusammengesetzt suchwort_tags suchwort_mehrzahl google_identifier hauptbild_ohne_text umlaut_suchtags ss_statt_scharf_s bigbuy_abschied google_ads_kuration; do
    fehlt "$REPO/automation/$L.py" && continue
    grep -q "^FERTIG" "/tmp/$L.log" 2>/dev/null && continue      # durchgelaufen
    pause_kuehlt "$L" && continue                                # hat sich mit PAUSE verabschiedet
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
    ( cd "$REPO" && setsid bash -c \
        "exec 9>/tmp/lock_$L.lock; flock -n 9 || exit 0; $EXP exec python3 automation/$L.py" \
        >> "/tmp/$L.log" 2>&1 9>&- & )
    echo "$(date -u +%H:%M) restart $L"
    sleep 5
  done
  # Dasselbe für die langen NODE-Läufe. Eigener Block, weil der Prozesstest auf das erste
  # argv-Feld schaut und dort `node` statt `python3` steht — ein gemeinsamer Test hätte den
  # Lauf für tot gehalten und ihn im Zwei-Minuten-Takt ein zweites Mal gestartet.
  for N in cj_bild_backfill cj_variantenbild cj_kosten_backfill schulstart_import alt_text_backfill frosch_maske_import; do
    fehlt "$REPO/automation/$N.mjs" && continue
    grep -q "^FERTIG" "/tmp/$N.log" 2>/dev/null && continue
    pause_kuehlt "$N" && continue
    ps -eo args --no-headers | awk -v s="automation/$N.mjs" \
      '$1 ~ /node$/ && $2 == s {n++} END {exit(n?0:1)}' && continue
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
  # TOTE LINKS, einmal täglich: Ratgeber-Seiten verlinken Produkte, die inzwischen gelöscht
  # oder gedraftet sind. Am 20.08.2026 waren es 61 Links auf 25 veröffentlichten Seiten — jeder
  # Google-Besucher, der auf eine Empfehlung klickte, landete auf 404. Neue tote Links entstehen
  # bei JEDEM Draft-Lauf (keine-lieferanten-ref, Dubletten, Sperr-Tags), ohne dass die Texte
  # davon erfahren. Meldet nur; das Umhängen braucht eine Entscheidung.
  TL=/tmp/tote_links.log
  if [ -f "$REPO/automation/tote_links.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$TL" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$REPO" && setsid python3 automation/tote_links.py >> "$TL" 2>&1 9>&- & )
      echo "$(date -u +%H:%M) tote-links geprüft"
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
  sleep 120
done
