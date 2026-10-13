> Betreiber 13.10. abends: «hetzner habe ich nur für dich gemacht, also pushe das auf max».
> Workflow wf_64a3317b-610: 3 Mess-Spuren, ein Skeptiker, ein Richter. Hier steht das Urteil des Richters unverändert.
> **Umsetzungsstand (Hauptsitzung):**
> - Schritt 2 ✅ 13.10. ~19:45 UTC, Commit 0dc1d9630. Die Spitze der fälligen Prüfungen in 48 h sank von 7'641/h auf 991/h, Selbsttest 17/17.
> - Schritte 1, 3, 4, 5 und 11: im Workflow wf_b1c94b55-f88.
> - Schritte 6–10: folgen; Schritt 6 erst nach 14.10. 04:10 UTC.

# Plan «Hetzner auf Maximum» (Richter, 13.10.2026)

## 1. Lage in 4 Sätzen

1. **Der Server läuft zuverlässig, aber er tut wenig.** Bis 19:30 UTC hat er heute 211 Commits gemacht (GEMESSEN, `git log --author=luxe-waechter --since="2026-10-13 00:00"`), der Puls kam um 19:12 mit «leer» (GEMESSEN, `auftraege/_puls.json`). Seine Arbeit beschränkt sich auf Bestell-, Zahl-, Versand- und Video-Wächter: 44–161 CJ-Aufrufe pro Stunde, in der Cloud sind es 195–2'000 (GEMESSEN, `dropship/_cj_takt_*.json`, Spur 1).
2. **Lange Läufe kommen auf keinem der beiden Rechner zu Ende.** Sehr wahrscheinlich beendet systemd am Ende jedes 10-Minuten-Takts alle gestarteten Motoren: `Type=oneshot`, kein KillMode (GEMESSEN, `server/luxe-waechter-setup.sh` Z. 110–117). Ob das wirklich passiert, bleibt eine VERMUTUNG, bis Schritt 1 gemessen ist. Dazu räumt ein falscher Rewind-Alarm etwa 4× am Tag alles ab: 27 Fälle in 7 Tagen (GEMESSEN, `git log`). Betroffen sind die Kundenschutz-Prüfung (~45 min), die Google-Feedback-Wache (466 s) und der Reel-Bau. Die Cloud hilft nicht aus, denn sie lebt an ruhigen Tagen nur ~8 % des Tages (GEMESSEN 11.10., `/tmp/fixer_keepalive.log`).
3. **Es fehlt Laufzeit, nicht Kontingent.** Die harten Grenzen sind der CJ-Topf (~125'000 Punkte pro Tag verbraucht, heute ab 04:26 leer; GEMESSEN, `cj_runner*.log` und `cj_reset_wache.py`) und Groq (heute um 08:28 leer, GEMESSEN). Weitere KI-Schlüssel auf dem Server bringen keinen einzigen Punkt dazu.
4. **Der grösste Hebel:** Die langen Wächter-Läufe gehören fest und dauerhaft auf den Server, und zwar als eigene systemd-Einheiten mit Speicher- und Zeitgrenze und nur für eine Rolle. Vorher müssen Fehlalarm, Platz und Swap erledigt sein. Doppelarbeit wird dabei abgebaut und nicht verdoppelt.

## 2. Selbst machbar (über git, ohne Betreiber)

**1. Server-Zustand nachmessen (heute, nur lesen)**
- **Änderung:** Neue rein lesende Wartungsaktion `waechter_zustand` in `server/wartung.mjs` mit Test in `wartung.test.mjs`. Sie liest:
  - `systemctl show luxe-waechter -p Type,KillMode,ActiveState,ExecMainStartTimestamp,InactiveEnterTimestamp`
  - `journalctl -u luxe-waechter --since -3h` gefiltert auf «Consumed … wall clock» und «Deactivated». Daraus ergibt sich die echte Takt-Dauer, ohne dass die Messung zwischen zwei Takte fallen muss.
  - `ps -eo etimes,comm` (nur Skriptnamen), `python3 -c 'import scipy, av'`, `ffmpeg -version | head -1`, `git stash list | wc -l` im Wächter-Klon, `df -h / /tmp`, `free -m`, `swapon --show`, das Alter von `/tmp/_fixer_herzschlag`, ob `/tmp/export.jsonl` und `/tmp/kost28.jsonl` existieren, die Log-Fehler von `cj_ausgelistet_sichtbar` und `besuchte_seiten_lieferbar` sowie `systemctl list-units 'luxe-m-*'`.
  - Dazu `auftraege/wiederkehrend/server-zustand.json` (`alle_tage: 1`, Vorlage wie `storefront.json`) und je ein einmaliger Auftrag für `server_runner_bilanz.mjs` und die Wartung `platte`.
- **Doppellauf-Schutz:** Läuft nur auf dem Server über den Agenten.
- **Prüfung danach:** Das Ergebnis liegt in `auftraege/erledigt/`. Die Felder `KillMode` und Takt-Dauer bestätigen oder widerlegen Befund 2. Ausserdem werden die offenen Punkte vom 06.10. geklärt: /tmp-Belegung (damals 97 %), Platte (damals 88 %), scipy/av vorhanden ja/nein.
- **Rückweg:** Die wiederkehrende Datei löschen. Die Aktion ist harmlos, weil sie nur liest.

**2. Lagerabgleich-Berg verteilen (heute, vor 21 Uhr UTC)**
- **Änderung:** In `automation/cj_lager_abgleich.py` (Z. 37, `RECHECK_TAGE=7`) bekommt jedes Produkt einen festen Versatz: `7 + hash(pid) % 8` Tage. Besuchte und beworbene Produkte werden nach 2 Tagen neu geprüft.
- **Warum:** 16'564 «ok»-Prüfungen vom 07.10. werden zwischen 13.10. 21 Uhr und 14.10. 19 Uhr gleichzeitig fällig, bis 2'307 pro Stunde (GEMESSEN, `dropship/_cj_lager.tsv`). Das sind VERMUTUNG ~146'000 Punkte, mehr als ein ganzer Tagestopf.
- **Doppellauf-Schutz:** Der Hash ist auf beiden Rechnern gleich, also entsteht dieselbe Fälligkeitsliste. Erst mit Schritt 7 läuft der Abgleich nur noch auf dem Server.
- **Prüfung danach:** Eine Python-Zählung über `_cj_lager.tsv` zeigt höchstens ~250 fällige Prüfungen pro Stunde. Die Zeile «fällig» in `dropship/CJ-LAGER.md` bleibt am 14.10. zweistellig.
- **Rückweg:** `git revert`.

**3. Doppelte CJ-Bestellung zeitlich trennen**
- **Änderung:** In `automation/cj_order_engine.py` liest jeder Rechner die CJ-Liste direkt vor `createOrderV2` (Z. 490) noch einmal über `cj_bestellnummern()` (Z. 336). Bisher geschieht das nur am Laufbeginn (Z. 390). Die Cloud legt nur Bestellungen an, die älter als 15 Minuten sind (Shopify `createdAt`). Der Server legt sofort an.
- **Zusätzlicher Wächter:** `cj_zahlung_offen.py` warnt in der Ampel, wenn dieselbe LX-Nummer bei CJ zweimal vorkommt, und legt für die zweite Bestellung **nie** einen Zahllink vor. Wegen des Zahllink-Dauerauftrags vom 11.10. würde sie sonst wirklich bezahlt.
- **Doppellauf-Schutz:** Die Sperre `flock` gilt heute nur je Rechner (GEMESSEN, `cj_fulfill_runner.sh` Z. 14). Die 15-Minuten-Grenze trennt die beiden Rechner zeitlich. Fällt der Server aus, legt die Cloud nach 15 Minuten trotzdem an.
- **Prüfung danach:** Ein Selbsttest mit vier Fällen: frische Bestellung, alte Bestellung, LX schon bei CJ, doppelte LX. In `dropship/_cj_orders_done.txt` taucht keine LX zweimal auf. Bisher gab es 3× «bereits-bei-cj» und keinen Doppelfall (GEMESSEN). Ob CJ eine doppelte orderNumber selbst ablehnt, ist nicht gemessen.
- **Rückweg:** `git revert`.

**4. Falschen Rewind-Alarm abstellen**
- **Änderung:** In `automation/engine_keepalive.sh` Z. 625 löst `hinten > 5` nur noch aus, wenn `/proc/uptime` unter 1'800 s liegt. Ein echter Snapshot-Restore passiert nur beim Booten. Sonst wird nichts unternommen; das Mergen übernimmt der Autocommit.
- **Warum:** Jeder Fehlalarm tötet alle Motoren, legt einen neuen Stash an (nie `drop`) und holt per Union absichtlich gelöschte Ledger-Zeilen zurück (Zombie-Ledger).
- **Doppellauf-Schutz:** Nicht nötig. In der Cloud bleibt das Verhalten beim Neustart gleich.
- **Prüfung danach:** Ein Selbsttest mit hoher und niedriger Uptime. Die Zahl der Commits «Ledger-Union + Quittungs-Rückspiel» von `luxe-waechter` sinkt pro Tag von ~4 auf 0. Die Stash-Zahl aus Schritt 1 wächst nicht mehr.
- **Rückweg:** `git revert`.

**5. Reihenfolge der Geheimnisse reparieren**
- **Änderung:** In `engine_keepalive.sh` wird `/etc/luxe/secrets.env` (Z. 224–225) vor den Block `fortura_env` (Z. 75) und `env_datei` (Z. 92–95) geladen. Werte nie loggen.
- **Doppellauf-Schutz:** Nicht nötig. In der Cloud fehlt die Datei, dort wirkt die Änderung nicht.
- **Prüfung danach:** Bis der Betreiber Schlüssel einträgt, ist nichts zu sehen. Danach meldet Schritt 1 `/tmp/fortura_env.sh` und `/tmp/cj_konten.env` als vorhanden (nur die Namen).
- **Rückweg:** `git revert`.

**6. Platz und Puffer (frühestens 14.10. nach 04:10 UTC)**
- **Änderung:**
  - (a) `server/platte-schlank.sh` Z. 32: Der grep zählt nur noch Cron-Zeilen, die nicht auskommentiert sind. Heute blockieren die von `alt_cron_aus` auskommentierten Zeilen die Löschung.
  - (b) Neue Aktion `alt_klon_loeschen` in `wartung.mjs`. Sie läuft nur, wenn `crontab -l` keine aktive Zeile mit `/opt/luxe/repo` hat. Unversionierte Dateien rettet sie vorher nach `/root/luxe-alt-rettung`, nie ins Repo. `alt_cron_zurueck` wird danach entfernt.
  - (c) Danach `platte_schlank` (gc). gc braucht freien Platz in Packgrösse, deshalb erst löschen.
  - (d) Neue Aktionen `swap_an`/`swap_aus`: 2 GB, nur wenn mindestens 4 GB frei sind, fstab-Eintrag mit Marke.
- **Doppellauf-Schutz:** Nur der Server.
- **Prüfung danach:**
  - Am 14.10. nach 04:10 bleibt die Ampel `alter_lieferblock()` bei 0. Das ist die Bedingung, bevor gelöscht wird.
  - Danach meldet Schritt 1 die Platte unter ~75 %. Am 06.10. waren es 88 % (GEMESSEN), heute VERMUTUNG über 90 %. `swapon --show` zeigt 2G.
- **Rückweg:** Für Swap `swap_aus`. **Das Löschen ist nicht umkehrbar.** Der Code bleibt im Remote-Zweig CizQ6, die lokalen Logs gehen verloren. Deshalb ist für das Löschen eine Freigabe nötig (Teil 3).
- **Hinweis:** Der Gewinn von ~6,9 GB (GEMESSEN 23.09.) ist befristet. Das Repo wächst um bis zu ~0,25 GB pro Tag, vor allem durch Ledger (Gegenprüfung M6). Danach also gc regelmässig laufen lassen.

**7. Rollenteilung mit Arbeitsnachweis, Berichte nur bei Inhaltsänderung schreiben**
- **Änderung:**
  - `data/host_rollen.json` (Werte server/cloud/beide) und `automation/host_rolle.sh` mit der Funktion `rolle_hier <job>`. Abgefragt wird sie in den Startschleifen von `fixer_keepalive.sh` (heute 0 Host-Weichen, GEMESSEN) und `engine_keepalive.sh`.
  - **Nur auf dem Server:** cj_lager_abgleich, cj_zahlung_offen, versand_stillstand, verkauf_ziel, kategorie_fein, google_feedback_wache und die übrigen reinen Shopify-Tageswächter.
  - **Nur in der Cloud:** social_autopilot, Grind und Such-Runner, alle Wächter, die KI-Schlüssel brauchen.
  - **Auf beiden:** cj_fulfill_runner (zeitlich getrennt über Schritt 3).
  - `verkauf_ziel.py`, `cj_zahlung_offen.py` und `cj_lager_abgleich.py` schreiben nur noch, wenn sich der Inhalt geändert hat.
- **Doppellauf-Schutz:** Der Server schreibt nach jedem erfolgreichen Lauf `dropship/_server_rolle.json` (Job → Zeitstempel). Ist ein Eintrag älter als 2 h, übernimmt die Cloud diesen Job. Als Signal taugen weder `bot_puls.py` noch `_puls.json`, denn beide messen den Agenten (GEMESSEN, `luxe_auftrag_runner.mjs` Z. 233). Auch der letzte Commit taugt nicht, weil der Autocommit weiterläuft, wenn die Wächter still sind.
- **Prüfung danach:**
  - Selbsttest mit Gegenprobe: Ist der Nachweis frisch, schweigt die Cloud; ist er alt, übernimmt sie.
  - Solange der Nachweis frisch ist, hat `KATEGORIE-FEIN.md` 0 Cloud-Commits. Heute waren es 13 aus der Cloud und 17 vom Server (GEMESSEN).
  - `_verkauf_gewinn_stand.json` fällt von ~190 auf unter 30 Commits pro Tag (GEMESSEN 24 h: 127 Cloud + 65 Server).
- **Rückweg:** In `data/host_rollen.json` alles auf «beide» setzen.

**8. Dauerläufer auf dem Server (Kandidat A in geänderter Form)**
- **Voraussetzung:** Schritte 1, 4, 6d und 7 sind erledigt.
- **Änderung:** Auf dem Server (`ubuntu-4gb-*`) startet `starte()` ausgewählte Rollen-Jobs mit `systemd-run --unit=luxe-m-<name> --collect -p MemoryMax=… -p RuntimeMaxSec=3600 -p EnvironmentFile=/etc/luxe/secrets.env -p WorkingDirectory=/opt/luxe-waechter/repo nice -n 10 …`.
  - Transiente Einheiten erben die Umgebung **nicht**. Ohne `EnvironmentFile` fehlen die Schlüssel.
  - `RuntimeMaxSec` ersetzt den stündlichen Neustart, den der Server nicht hat (106 Tage Uptime am 06.10., GEMESSEN).
  - Erste Welle: cj_ausgelistet_sichtbar, besuchte_seiten_lieferbar, google_feedback_wache. Danach cj_kosten_backfill und cj_video_backfill. Alles andere stirbt weiter mit dem Takt.
  - Der Autocommit bleibt an den Takt gebunden, damit `platte_schlank` beim Anhalten des Timers Ruhe im Klon hat.
- **Doppellauf-Schutz:** Vor jedem Start prüft `systemctl is-active luxe-m-<name>`, ob der Job schon läuft. Die Rolle aus Schritt 7 gilt zusätzlich.
- **Prüfung danach:**
  - Schritt 1 zeigt `luxe-m-*`-Einheiten, die älter als 10 Minuten sind.
  - `dropship/GOOGLE-FEEDBACK.md` bekommt täglich einen Commit von `luxe-waechter`. Seit 07.10. waren es 0 (GEMESSEN, Spur 2).
  - Die Abdeckung von cj_ausgelistet_sichtbar steigt von 1'995/46'552 in 30 Tagen (GEMESSEN). Sichtbar ist das an den Server-Commits auf `dropship/_cj_nachpruefung.tsv`.
- **Rückweg:** In `data/host_rollen.json` `"dauerlauf": false` setzen, dann startet der nächste Takt nichts mehr. Laufende Jobs enden spätestens nach 1 h. Sofort geht es über die neue Aktion `motoren_stopp` (`systemctl stop 'luxe-m-*'`).
- **Freigabe:** Das ist eine Systemänderung, siehe Teil 3.

**9. Reels auf dem Server bauen**
- **Voraussetzung:** Schritte 1, 7 und 8.
- **Änderung:**
  - Im Server-Block von `engine_keepalive.sh` (Z. 237–243) kommen per apt `python3-scipy`, `python3-av`, `ffmpeg` und `fonts-dejavu-core` dazu. `schnitt.py` lädt scipy beim Start (GEMESSEN, Z. 73). Ohne scipy baut der Server nie, unabhängig von KillMode.
  - Auf dem Server `TAKT=1800`. Der Standard schläft nach je 3 Reels 21'600 s (GEMESSEN, `reel_engine_runner.sh` Z. 49).
  - `SCHNITT_THREADS=1`, Start über Schritt 8 mit `MemoryMax` ~1200M (VERMUTUNG).
- **Doppellauf-Schutz:** Die Rolle «server». Die Cloud baut nur, wenn der Reel-Eintrag in `_server_rolle.json` älter als 6 h ist. Damit ist R8 (Doppelbau) gelöst. Den Doppelpost sperrt weiter post_guard.
- **Prüfung danach:** `dropship/_cj_reel_gebaut.txt` bekommt mindestens 3 Zeilen pro Tag vom Server. Seit 06.10. war es 1 (GEMESSEN). Die Zahl «ready» in `automation/reels_seed.csv` steigt von 21 (GEMESSEN 13.10.) wieder über 30.
- **Rückweg:** Rolle auf «cloud» setzen.

**10. Grind-Reserve für den Kundenschutz**
- **Änderung:** In `automation/cj_takt.py` und `.mjs`: Nach der ersten Antwort `16900500` des Tages pausieren die Grind-Skripte (cj_category_fill, cj_perpetual, cj_specs_backfill, cj_queue_runner) bis 00:00 UTC. Ein Marker in `/tmp` und in `dropship/` macht das auf beiden Rechnern sichtbar. Bestell- und Kundenschutz-Jobs bekommen den Nachfluss. Auch der Bestellweg kostet Punkte: product/query, variant/query und freightCalculate je 10 (Gegenprüfung M10).
- **Doppellauf-Schutz:** Der Marker gilt für beide Rechner.
- **Prüfung danach:** Nach dem ersten 16900500 zeigt der Takt-Bericht für die Grind-Skripte 0 Aufrufe. Heute waren es nach 04:30 noch 1'577 + 289 (GEMESSEN). Die Zahl «offen» bei besuchte_seiten_lieferbar sinkt.
- **Folge:** VERMUTUNG 25–30 % weniger Neuimporte. Das betrifft den Grow-Auftrag vom 01.10. und gehört in die Meldung an den Betreiber.
- **Rückweg:** Schalter aus.

**11. Keine Bilder aus angemeldeten Sitzungen ins öffentliche Repo**
- **Änderung:** In `server/luxe_auftrag_runner.mjs` bleiben Screenshots aus Pinterest, Merchant und Shopify-Admin auf dem Server unter `/var/lib/luxe-agent/`. Ins Repo kommt nur ein Text-Ergebnis, andere Bilder als JPEG mit höchstens 200 KB.
- **Prüfung danach:** In `auftraege/ergebnis/` kommen keine neuen PNG-Dateien aus angemeldeten Diensten mehr dazu. Seit 06.10. waren es 82 Pinterest-Bilder (Gegenprüfung).
- **Rückweg:** `git revert`.

**Nebenbefund, nicht Teil dieses Plans:** `alt_text_backfill` stürzt ~220-mal am Tag mit «<!DOCTYPE» in `shTok()` ab (GEMESSEN, `/tmp/alt_text_backfill.log`). Das gehört in eine eigene Aufgabe.

## 3. Braucht den Betreiber

**a) Schlüssel auf dem Server**

Alles in einer SSH-Sitzung. Erst eintragen, wenn die Sitzung meldet «Schritte 5 und 7 sind live». Vorher kämpfen beide Rechner um dasselbe Kontingent.

```
CJ2_API_KEY='…'
CJ3_API_KEY='…'
FORTURA_FTP_USER='…'
FORTURA_FTP_PW='…'
AZURE_SPEECH_KEY='…'        (optional, erst mit Schritt 9)
AZURE_SPEECH_REGION='…'     (optional; Ressource switzerlandnorth laut reel_engine_runner.sh Z. 40)
```

- **CJ2/CJ3:** Der Lagerabgleich bekommt eigene Kontingente, je 1'000 Abfragen pro Tag (GEMESSEN 06.10.), und das rund um die Uhr. Das schont den Haupttopf um bis zu ~20'000 Punkte pro Tag (VERMUTUNG, 2'000 × 10).
- **Fortura:** Der Bestand der CH-Lager-Kostüme (Halloween) wird auch nachts abgeglichen. Der Gewinn ist klein: In der Cloud gab es seit 06.10. keine stillen Abbrüche (Spur 2).
- **Azure:** Stimme bei jeder zweiten Reel (Betreiber «stimme maximal» seit 23.09.).
- **Bitte NICHT eintragen:** `GROQ_API_KEY`, `GROQ_API_KEY2`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `METRICOOL_USER_TOKEN`. Ein Groq- oder Gemini-Schlüssel schaltet auf dem Server automatisch den Grind ein (KI_DA, `engine_keepalive.sh` Z. 399–402). Die Vorlage in `luxe-waechter-setup.sh` listet diese Zeilen als «optional»; sie bleiben leer. Begründung in Teil 5.

**Anleitung in 5 Schritten:**
1. Am PC ein Terminal öffnen und `ssh root@46.225.75.125` eingeben. SSH ist am bequemsten, weil man dort Schlüssel einfügen kann. Wenn SSH abweist: console.hetzner.cloud → Server «ubuntu-4gb-nbg1-1» → Symbol `>_` (Console). Das Root-Passwort lässt sich dort unter «Rescue» neu setzen (`dropship/HETZNER-SERVER.md` Z. 116–117).
2. `nano /etc/luxe/secrets.env` eingeben.
3. Mit den Pfeiltasten ans Dateiende gehen und die Zeilen oben eintragen, jeden Wert in einfachen Anführungszeichen. Speichern mit Ctrl+O, Enter, dann Ctrl+X.
4. `chmod 600 /etc/luxe/secrets.env` eingeben. Zur Kontrolle ohne Werte: `grep -oE '^(CJ2_API_KEY|CJ3_API_KEY|FORTURA_FTP_USER|FORTURA_FTP_PW|AZURE_SPEECH_KEY)=.' /etc/luxe/secrets.env | cut -d= -f1` zeigt nur die Namen.
5. `systemctl start luxe-waechter.service` eingeben. Das startet sofort einen Takt; ohne diesen Befehl greift es spätestens nach 10 Minuten, weil die Datei bei jedem Takt neu geladen wird (`engine_keepalive.sh` Z. 224–225). Danach der Sitzung «eingetragen» schreiben. Sie prüft am nächsten Server-Zustand, ob `/tmp/cj_konten.env` und `/tmp/fortura_env.sh` entstanden sind.

**b) Freigaben (ein Satz im Chat genügt)**
- **Löschen von `/opt/luxe/repo`** (~6,9 GB, GEMESSEN 23.09.). Nicht umkehrbar: Die lokalen Logs api-jobs.log und vps-poll.log gehen verloren, der Code bleibt auf GitHub im Zweig CizQ6. Frühestens am 14.10. nach 04:10 UTC, wenn die Zombie-Ampel 0 zeigt. Bei `alt_cron_aus` hat der Klassifikator ohne ausdrückliches Ja abgelehnt.
- **Systemänderungen Swap 2 GB und Dauer-Einheiten `luxe-m-*`** (Schritte 6d und 8). «Pushe das auf max» deckt das vermutlich. Die Sitzung nennt beide trotzdem einzeln im Bericht.

**c) Grösserer Server: nicht jetzt**

Kein gemessener Engpass verlangt ihn: Last 0,52 bei 2 CPU (GEMESSEN 06.10.). Platte und RAM lassen sich mit Schritt 6 gratis entlasten.

- **Neu prüfen nur, wenn** Schritt 1 nach Schritt 6 zeigt: MemAvailable dauerhaft unter 300 MB, Swap-Nutzung dauerhaft über 1 GB, oder Platte nach gc über 90 %.
- **Preise:** CX23 €5.99 und CX33 (4 vCPU, 8 GB) €8.99, inkl. IPv4, ohne MwSt (QUELLE https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/, 09.09.2026). Eine andere Quelle nennt CX33 €6.49 ohne IPv4 (QUELLE https://www.bitdoze.com/md/hetzner-cloud-cost-optimized-plans.md). Die beiden Quellen widersprechen sich.
- **Verfügbarkeit:** «Cost-Optimized» steht am 13.10. auf «Currently not available» (GEMESSEN, Spur 3 über hetzner.com). Dann gilt Regular CPX22 €19.99 (QUELLE Schmalbach). Im Panel prüfen.
- **Beim Umstellen:** Nur CPU/RAM wählen, damit es umkehrbar bleibt. Der Server startet dabei kurz neu.

**d) «Brauche ich Netlify?» — Nein**

Den Shop trägt Shopify, abannews.com baut der Hetzner-Timer nach Cloudflare Pages (`server/README.md`). Du hast Netlify heute schon auf Free gestellt (Commit bdf562835, 19:03 UTC). Es wirkt ab ~22.10.; am 23.10. nachmessen. Falls Netflix gemeint war: Das hat mit dem Shop nichts zu tun.

## 4. Reihenfolge nach Wirkung auf «Kunden, die kaufen»

| Rang | Schritt | Wirkung | Frühestens / Voraussetzung |
|---|---|---|---|
| 1 | 3 Doppelbestellung trennen | Bestellsicherheit: echtes Geld, der Zahllink-Dauerauftrag würde die Doppelbestellung zum Zahlen vorlegen | sofort, nur Code |
| 2 | 2 Lager-Berg verteilen | Bestellsicherheit: ohne Verteilung frisst der Berg heute Nacht die Punkte für Bestellweg und Kundenschutz | heute vor 21 Uhr UTC |
| 3 | 8 (1. Welle) Kundenschutz-Dauerläufer | Weniger Geisterverkäufe wie #1019. Abdeckung heute 4 % in 30 Tagen (GEMESSEN 1'995/46'552) | nach 1, 4, 6d, 7 |
| 4 | 8 Google-Feedback-Wache | Sortiment und Verkehr im einzigen Kanal mit Verkäufen. Die Zahl war bis 39 h alt (GEMESSEN) | wie 3 |
| 5 | 9 Reels auf dem Server | Verkehr. Warteschlange 21 «ready», Bedarf ~9 pro Tag, also VERMUTUNG leer in ~2 Tagen | nach 1, 7, 8 |
| 6 | 10 Grind-Reserve | Bestellsicherheit, kostet Sortiment-Zuwachs | nach 7 |
| 7 | 3a Schlüssel CJ2/CJ3 und Fortura | Lager und CH-Kostüme auch nachts aktuell | nach 5 und 7 |
| 8 | 11 Ergebnisbilder | Sicherheit, keine direkte Wirkung auf Kunden | jederzeit |
| Grundlage | 1 Messen, 4 Fehlalarm, 5 Geheimnisse, 6 Platz/Swap, 7 Rollen | keine direkte Wirkung, aber Voraussetzung für Rang 3–7 | zeitlich zuerst: 1 heute, 4/5 heute, 6 ab 14.10. 04:10, dann 7 |

## 5. Verworfen

- **KillMode=process für den ganzen Dienst (Kandidat A wie vorgeschlagen).**
  - Alle 227 Wächter würden dauernd auf beiden Rechnern laufen, und der Server hat keinen stündlichen Neustart, der Hänger abräumt.
  - Dazu ~10 Motoren à 66–102 MB plus /tmp im RAM plus git gc mit bis 2,7 GB (GEMESSEN 23.09.) auf 3,8 GB ohne Swap.
  - Ersetzt durch Schritt 8: gezielte Einheiten mit Speicher- und Zeitgrenze.
  - `ExitType=cgroup` scheidet ebenfalls aus: Die Einheit bliebe aktiv, und der Timer würde nicht mehr feuern.
- **Groq-, Gemini- oder DeepSeek-Schlüssel auf den Server (Server-Grind).** Die Schlüssel teilen sich eine Groq-Organisation mit demselben Kontingent (heute um 08:28 leer), Gemini antwortet mit 402, und der CJ-Topf ist heute ab 04:26 leer (alles GEMESSEN). Zwei Grinds heissen Doppelimporte, weil die Titel-Wache unzuverlässig ist (Regel 16c).
- **Metricool-Token auf den Server.** `/tmp/ig_post.lock` gilt nur je Rechner, also droht ein Doppelpost (Regel 10). Metricool plant ohnehin voraus. Der Social-Autopilot ist laut Schritt 7 eine reine Cloud-Rolle.
- **Bestell-Motor nur auf dem Server.** Fällt der Server aus, gibt es keinen Ersatz. Stattdessen zeitliche Trennung (Schritt 3).
- **`tmp.mount` abschalten.** Das braucht einen Neustart, den `wartung.mjs` verbietet. Swap (Schritt 6d) entlastet auch das tmpfs.
- **Teilklon für den Wächter jetzt.** Erst gc nach dem Löschen versuchen. Ein Teilklon braucht beim Merge Netz und bringt Umzugsrisiko.
- **8-GB-Server jetzt.** Kein gemessener Engpass, siehe 3c.
- **Netlify kündigen als offene Aufgabe.** Ist erledigt (Free ab ~22.10.).
- **Diese Aussagen aus den Spuren sind widerlegt:**
  - «Bestell-Endpunkte kosten 0 Punkte»: Sie kosten 3 × 10 Punkte (Gegenprüfung M10).
  - «Repo +1,5 MB pro Reel»: Seit 06.10. kamen nur 6 Reel-Dateien und 20 MB ins Repo (M6).
  - «`bot_puls.py` als Ausfall-Signal»: Es misst den Agenten, nicht den Wächter (M12).
  - «CJ-Punkte verfallen nachts»: CJ füllt laufend nach. Der echte Gewinn ist, dass Läufe zu Ende kommen.
  - «Hin und Her bei CJ-ZAHLUNG-OFFEN.md 14–15 Uhr»: In diesem Fenster schrieb nur der Server (M15).

Dateien:
- Messskript der Gegenprüfung: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/hetzner/skeptiker/wachstum.py`
- Selbst nachgeprüft: `/home/user/aban-news-landing/server/luxe-waechter-setup.sh`, `/home/user/aban-news-landing/automation/engine_keepalive.sh`, `/home/user/aban-news-landing/server/platte-schlank.sh`, `/home/user/aban-news-landing/automation/reel/schnitt.py`, `/home/user/aban-news-landing/automation/reel_engine_runner.sh`, `/home/user/aban-news-landing/automation/bot_puls.py`, `/home/user/aban-news-landing/automation/cj_order_engine.py`, `/home/user/aban-news-landing/server/wartung.mjs`, `/home/user/aban-news-landing/dropship/KREDITKARTE-WECHSEL-2026-10-13.md`
