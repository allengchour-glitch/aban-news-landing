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
exec 9>/tmp/fixer_keepalive.lock
flock -n 9 || { echo "$(date -u +%H:%M) Supervisor läuft bereits — dieser Start endet."; exit 0; }
while true; do
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
    setsid python3 /tmp/$p.py >> /tmp/$p.log 2>&1 & echo "$(date -u +%H:%M) restart $p"
    sleep 10
  done
  # Bestell-/Fulfill-Runner (Shell) mitlaufen lassen
  pgrep -f "/tmp/cj_fulfill_runner.sh" >/dev/null || { setsid bash /tmp/cj_fulfill_runner.sh >> /tmp/cj_fulfill_runner.log 2>&1 & echo "$(date -u +%H:%M) restart cj_fulfill_runner"; }
  # Website-Hygiene (Lieferanten-Leaks aus Kundentexten) mitlaufen lassen
  [ -f /tmp/website_hygiene_runner.sh ] && { pgrep -f "/tmp/website_hygiene_runner.sh" >/dev/null || { setsid bash /tmp/website_hygiene_runner.sh >> /tmp/website_hygiene_runner.log 2>&1 & echo "$(date -u +%H:%M) restart website_hygiene"; }; }
  # Social-Autopilot + Reel-Motor: liegen jetzt IM REPO (nicht mehr nur /tmp), überleben also
  # den nächsten Wipe. Beide haben eine eigene flock-Sperre, ein Doppelstart ist folgenlos.
  for S in social_autopilot reel_engine_runner; do
    [ -f "$HOME/aban-news-landing/automation/$S.sh" ] || continue
    pgrep -f "automation/$S.sh" >/dev/null || { setsid bash "$HOME/aban-news-landing/automation/$S.sh" >> /tmp/$S.log 2>&1 & echo "$(date -u +%H:%M) restart $S"; }
  done
  # HYPE-REIHE DER STARTSEITE, einmal täglich (Auftrag des Betreibers 12.08.2026: «wenn hype
  # vorbei produkt ändern»). Der Lauf nimmt abgelaufene Artikel aus der Reihe und füllt aus den
  # hinterlegten Themen nach — das ist der Teil, der ohne Zutun laufen muss, damit die Reihe
  # nicht ein halbes Jahr lang dieselben sechs Artikel zeigt.
  # ⚠️ Was er NICHT kann: neue Themen finden. Dafür braucht es eine Web-Recherche, und die
  # gehört an den Anfang jeder Session (siehe CLAUDE.md). Der Automat hält die Reihe frisch,
  # aktuell hält sie nur, wer nachschaut, was gerade läuft.
  HY=/tmp/hype_kuratieren.log
  if [ -f "$HOME/aban-news-landing/automation/hype_kuratieren.py" ]; then
    ALTER=$(( $(date +%s) - $(stat -c %Y "$HY" 2>/dev/null || echo 0) ))
    if [ "$ALTER" -gt 86400 ]; then
      ( cd "$HOME/aban-news-landing" && setsid python3 automation/hype_kuratieren.py >> "$HY" 2>&1 & )
      echo "$(date -u +%H:%M) hype_kuratieren gestartet"
    fi
  fi
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
                    exec bash /tmp/$R.sh" >> /tmp/$R.log 2>&1 &
    echo "$(date -u +%H:%M) restart $R"; sleep 3
  done
  sleep 120
done
