# Kritik · 2026-09-29 21:21 UTC · 3889 Zeichen · 699 s
> HINWEISE, keine Belege — jeden Befund am Objekt nachmessen, bevor danach gehandelt wird.

## Kimi

# Kritische Prüfung der Reparatur

Vorweg: `pause_kuehlt`, `dreht_sich_im_kreis`, `shopify_schranke.sh`, die Aufrufstelle von `still_gestorben`, die Bedeutung von `ZS`/`HM`/`$NACH`, die Zyklusfrequenz des Aufsehers und die FERTIG-Schreibweise der Python-Skripte sind nicht im Ausschnitt — diese Punkte kann ich nicht beurteilen und markiere sie entsprechend.

---

**1. Regression in `still_gestorben`: unverankerter Substring-Grep über das GESAMTE Segment**
· Das Tor prüft verankert und auf die letzten 3 Zeilen begrenzt (`^...FERTIG` via `tail -n 3`), `still_gestorben` dagegen mit `grep -qE "FERTIG|PAUSE"` über **alle** Zeilen nach der letzten START-Marke, ohne Zeilenanker. Jede beliebige Laufzeitausgabe, die die Teilstrings «FERTIG» oder «PAUSE» enthält («überspringe FERTIGe Artikel», «PAUSE-Kandidaten», Fehlertexte), markiert einen toten Lauf als erledigt. Das ist schlechter als das alte `tail -n 3`-Verhalten, das du ersetzen wolltest. Das Incident-Log zeigt, dass die Skripte kandidatenbezogene Statuszeilen schreiben («Kandidaten: 2788 …») — Worttreffer sind realistisch.
· Nachprüfen: Testlog bauen: `START …`, dann Zeile `Prüfe PAUSE-Regeln`, dann «Tod» (keine Schlusszeile), `still_gestorben` aufrufen → Rückgabe 1 = Befund bestätigt. Zusätzlich Bestandslogs: `awk '/^START /{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' /tmp/X.log | grep -nE "FERTIG|PAUSE"` und jede Fundstelle von Hand klassifizieren.

**2. `/proc/uptime` liefert im Container die Host-Uptime → `still_gestorben` ist wahrscheinlich tot**
· `boot=$(( $(date +%s) - $(cut -d. -f1 /proc/uptime) ))`: Unter Docker/Kubernetes (ohne lxcfs) zeigt `/proc/uptime` die **Host**-Uptime. Läuft der Host seit Wochen, ist `mtime < boot` für jede Logdatei im Container falsch → die Funktion returnt immer 1 → das gesamte «nachholen (Versuch n/3)»-Sicherheitsnetz läuft nie. Falls ihr lxcfs/VM nutzt, entfällt das — kann ich nicht beurteilen.
· Nachprüfen: `docker exec <container> cat /proc/uptime` mit `cat /proc/uptime` auf dem Host vergleichen (identisch = Bug). Oder im Container: `echo $(( $(date +%s) - $(cut -d. -f1 /proc/uptime) ))` und mit dem tatsächlichen Container-Startzeitpunkt abgleichen.

**3. Retry-Budget 3/Tag ist mit «Container startet stündlich neu» unvereinbar**
· Der Zähler `/tmp/_still_*_$(date -u +%Y%m%d)` zählt **Erkennungen**, nicht erfolgreiche Läufe, und wird nur um Mitternacht UTC zurückgesetzt. Drei unglückliche Container-Kills eines länger laufenden Wächters (z. B. 04:30, 05:30, 06:30) verbrauchen das Budget → für den Rest des Tages kein Nachholen mehr — genau der Schaden («11 h kein Nachholen»), nur kleiner. Zusätzlich wird der Zähler erhöht, **bevor** der Neustart erfolgt ist; schlägt der fehl, ist das Budget trotzdem verbrannt (Aufrufstelle nicht sichtbar — kann ich nicht beurteilen).
· Nachprüfen: Log mit mtime vor Boot präparieren, `still_gestorben` 4× aufrufen → 4. Aufruf returnt 1, ohne dass je ein Lauf stattfand.

**4. Wurzelursache nur halb behoben: «fertig» bleibt Logzeile + 20-h-Heuristik**
· Die START-Marke hilft nur, wenn heute bereits ein START geschrieben wurde. Für Wächter ohne heutigen START gilt weiterhin: FERTIG von gestern + `F_ALTER < 72000` = «erledigt». Konsequenz: Jeder Wächter außerhalb des ZN-Fensters (04:25–07:00) läuft effektiv auf einem **20-Stunden-Zyklus statt eines Tageszyklus** — FERTIG gestern 20:00 → heute 04:00 übersprungen → Lauf erst 16:00 → morgen 12:00 usw. (Drift). Und: Ohne sichtbaren Scheduling-Code kann ich nicht beurteilen, welche der 55 Wächter das ZN-Fenster überhaupt abdeckt.
· Nachprüfen: `grep "^START " /tmp/<wächter>.log | cut -c7-16 | uniq -c` über mehrere Tage → Startzeiten driften sichtbar nach hinten.
· Bessere Alternative 1: Der Wrapper schreibt bereits `FERTIG 2026-09-29T…Z …` — dann reicht `grep "^FERTIG $(date -u +%F)"` (Datum des Tages muss im FERTIG stehen). Das behebt den Originalfehler ohne START-Marken, ohne Segment-Logik, ohne 20-h-Heuristik. Voraussetzung: alle FERTIG-Quellen (auch Python) datieren ihre Zeile.
· Bessere Alternative 2: Statusdatei pro Wächter (`/tmp/_state_$L`, atomar per `mv`): `{datum, start_ts, done_ts}`. Tor prüft `datum == heute && done_ts gesetzt`. Kein Parsing kumulativer Logs, keine Substring-Kollisionen, keine Ordnungsannahmen.

**5. START wird erst im Kind geschrieben → zwei blinde Fenster**
· (a) Stirbt der Container zwischen Spawn und `echo "START …"` (Prozessstart, flock, echo = ms-Fenster, aber 55 Wächter × stündlicher Restart), ist der Versuch unsichtbar; die letzte Marke ist die von gestern, und liegt deren FERTIG < 20 h zurück, gilt der Wächter als erledigt — Originalfehler in schmalerem Fenster. (b) `flock -n 9 || exit 0` schreibt **nichts** — kein Eintrag ins Wächter-Log, aber der Aufseher meldet trotzdem `restart $L`. Ein verweigerter Start ist forensisch nicht von einem erfolgreichen zu unterscheiden.
· Besser: START **synchron im Aufseher vor dem Spawn** ins Log schreiben (dann existiert kein Fenster zwischen Entscheidung und Marke), und im Kind bei flock-Verweigerung eine Zeile «START abgelehnt (Lock belegt)» schreiben.
· Nachprüfen: `flock /tmp/lock_X.lock -c 'sleep 300'` starten, Tor triggern → Aufseher sagt «restart X», `/tmp/X.log` zeigt nichts = Befund bestätigt.

**6. Garantielücke: Nur die zwei gezeigten Spawn-Stellen schreiben START**
· Die Reparatur ist nur so stark wie das Invarianten-Versprechen «jeder Start schreibt START». Jeder andere Startpfad — manueller Lauf, anderes Skript, cron/systemd im Image, interner Aufruf in `shopify_schranke.sh` — reaktiviert den Originalfehler lautlos: Der so gestartete Lauf schreibt keine Marke, stirbt, und das FERTIG des Vortags im selben Segment gilt weiter.
· Nachprüfen: `grep -rn "shopify_schranke\|python3 automation/" --include='*.sh' --include='*.service' --include='*cron*' <repo>`, `crontab -l`, `systemctl list-timers`, Doku/Runbooks auf manuelle Startanleitungen.

**7. Non-NACH-Zweig schreibt selbst nie FERTIG**
· Der Else-Zweig endet mit `exec bash automation/shopify_schranke.sh …` — kein `&& echo FERTIG`. Woher kommt die FERTIG-Zeile dieser Wächter? Python? Schranke? Wenn keins schreibt: Dauer-Restart nach jedem erfolgreichen Lauf (`dreht_sich_im_kreis` fängt nur «endet sofort», keine langen erfolgreichen Läufe ohne FERTIG). Kann ich ohne die Skripte nicht beurteilen.
· Nachprüfen: Einen Non-NACH-Wächter kontrolliert laufen lassen, danach `tail -n 5 /tmp/$L.log` → steht dort ein zum Regex `^([0-9:]{8} |ISO )?FERTIG` passendes FERTIG?

**8. NACH-Zweig: FERTIG hängt am Exitcode der Schranke**
· `… schranke.sh … python3 … && echo "FERTIG …"`: Startet `shopify_schranke.sh` Hintergrundprozesse oder verschluckt es Exitcodes (`cmd; exit 0`-Muster, kein `wait`), wird FERTIG zu früh oder trotz Fehlschlag geschrieben — und die neue Segment-Logik glaubt es dann. Kann ich nicht beurteilen.
· Nachprüfen: `bash automation/shopify_schranke.sh true; echo $?` und `… false; echo $?`; Code auf `wait`/`set -e`/Exit-Propagation lesen.

**9. Marker-Namensraum nicht reserviert**
· Das awk-Muster `/^START /` trifft **jede** Logzeile, die mit «START » beginnt — auch Ausgaben der Wächter selbst. Meist fail-safe, aber: eine Zeile «START Bereinigung» **nach** dem echten FERTIG plus anschließender Tod → Segment leer → Restart trotz erledigter Arbeit.
· Nachprüfen: `grep -h "^START " /tmp/*.log | grep -vc "(Aufseher)"` — jeder Treffer ≠ 0 ist eine fremde START-Zeile. Besser: unverwechselbare Marke, z. B. `=====AUFSEHER-START <datum>=====`.

**10. Ungeprüfte Idempotenz-Annahme**
· Das gesamte Design startet bei Zweifel neu. Der Incident-Wächter heißt `preis_verlustschutz` und mutiert Produkte (63 Verlustartikel). Befund 1, 5 und 9 erzeugen Fälle, in denen ein **fertiger** Wächter erneut läuft. Ist ein Zweitlauf harmlos (idempotent), oder werden Preisänderungen/Sperrungen doppelt angewendet? Kann ich nicht beurteilen.
· Nachprüfen: Einen Wächter zweimal hintereinander laufen lassen und Produktstände/Änderungshistorie in Shopify diffen.

**11. FERTIG-Regex deckt Formatdrift nicht ab**
· Das optionale Präfix `[0-9:.]{8,12}Z` schließt Millisekunden-Formate jenseits von ~4 Nachkommastellen und Komma-Formate aus; Zeilen wie `== FERTIG ==` matchen nie. Wrapper-FERTIG (`FERTIG <ISO>Z (…)`) und etwaige Python-FERTIG-Zeilen haben vermutlich unterschiedliche Formate — Drift erzeugt Restart-Schleifen fertiger Wächter.
· Nachprüfen: `grep -ho ".*FERTIG.*" /tmp/*.log | sed 's/[0-9]/#/g' | sort | uniq -c | sort -rn | head -20` → alle Formate gegen den Regex prüfen.

**12. TOCTOU und unbegrenztes Logwachstum (Betriebsrisiken)**
· `letzter_lauf` liest die Datei zweimal (`grep -q`, dann `awk`); das Tor liest, während das Kind schreibt — inkonsistente Sicht innerhalb eines Zyklus, konvergiert erst nächsten Zyklus (bei stündlichem Tod evtl. zu spät). Zudem wachsen die kumulativen Logs unbegrenzt: Vollscan × 55 Wächter × Zyklus; und jede externe Rotation/Truncation entfernt START-Marken → Fallback = alter Fehler.
· Nachprüfen: `du -sh /tmp/*.log | sort -rh | head`, `ls /etc/logrotate.d/`, Wachstum über eine Woche beobachten.

**13. Kleinigkeiten**
· `HM -lt 700` begrenzt das ZN-Fenster auf 04:25–**06:59** (07:xx fällt raus) — Absicht? Kann ich nicht beurteilen.
· `date -u -d 'today 04:25'` ist GNU-Syntax; in einem busybox/alpine-Image schlägt das fehl. Nachprüfen: `docker exec <container> date -u -d 'today 04:25' +%s`.
· Tagesgrenze ist UTC-Mitternacht = 01:00/02:00 MESZ — «Tageswächter»-Semantik und Zähler-Reset folgen nicht dem Geschäftstag. Prüfen, ob das für eure Prozesse relevant ist.
· Zählerdatei wird ohne Sperre geschrieben (`echo > "$z"` nicht atomar) — bei parallelen Aufseher-Instanzen verlorene Updates. Läuft der Aufseher garantiert als Singleton? Kann ich nicht beurteilen.

---

**Fazit als Prüfungsurteil:** Die Reparatur behebt nur den gemeldeten Sonderfall (START vorhanden, danach gestorben) und führt mit Befund 1 eine neue Fehlklassifikation ein. Befund 2 ist vor Produktivgang zwingend zu verifizieren — falls bestätigt, ist das komplette Nachhol-Netz wirkungslos. Die robuste Lösung (Befund 4) ist ein datierter FERTIG-Match oder eine atomare Statusdatei statt Segment-Parsing in wachsenden Logs, plus START-Schreiben im Aufseher vor dem Spawn (Befund 5).

