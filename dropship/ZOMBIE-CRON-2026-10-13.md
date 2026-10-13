# Alter Server-Cron schreibt jeden Morgen den USA-Lieferblock zurück (13.10.2026)

## Kurz

- Seit Wochen erscheint jeden Morgen um ca. 04:10 UTC in Hunderten Produktbeschreibungen wieder der alte Block
  «📦 Lieferzeit (je nach Land): 🇨🇭 CH / 🇪🇺 EU: 10–18 Tage · 🇺🇸 USA: 12–22 Tage». Wir liefern nur in die Schweiz
  und nach Liechtenstein.
- **Ursache:** Die root-Crontab des Hetzner-Servers startet täglich um **04:00 UTC** `run-api-jobs.sh`. Das Skript
  stammt aus dem alten Klon `/opt/luxe/repo`, Zweig `claude/luxestyle-product-CizQ6`. Dieser Zweig ist seit dem
  06.09.2026 tot. Das Skript startet von dort rund 20 alte Shopify-Schreiber, darunter `delivery_block.mjs` (LIMIT 1000).
- **Abschalten kann nur der Betreiber.** Mein Versuch, dafür eine feste Wartungsaktion für den Hetzner-Agenten zu
  bauen, hat der Klassifikator abgelehnt («Remote Shell Writes»). Die Befehle für dich stehen unten.
- **Bis dahin:** Die Ampel meldet den Zustand stündlich, die Reparatur läuft jeden Morgen ab 04:25. Seiten mit
  Besuchern werden zuerst repariert.

## Belege (GEMESSEN 13.10.2026)

| # | Beleg | Quelle |
|---|---|---|
| 1 | Die root-Crontab enthält die Zeilen `0 4 * * * /opt/luxe/repo/automation/vps/run-api-jobs.sh …` und `*/10 * * * * … /opt/luxe/repo … /opt/luxe/vps-poll.log …` | Quittung `auftraege/erledigt/crontab_luxe-20260923-2215.json` |
| 2 | `run-api-jobs.sh` (Zweig CizQ6, letzter Commit 06.09. 14:36) setzt den Klon zuerst mit `git reset --hard` auf diesen Zweig. Danach laufen nacheinander feed_polish (300), enrich_apparel_descriptions (150), strip_nonapparel_feedblock (600), seo_polish (200), alt_text_backfill (120), **delivery_block (1000)**, honest_compareat (2000), set_trikot_prices, ad_manager, tiktok_capi, printful_perso_bridge `GO=1`, delivery_watchdog und stamp_alive | `git show origin/claude/luxestyle-product-CizQ6:automation/vps/run-api-jobs.sh` |
| 3 | `delivery_block.mjs` dort erzeugt Zeichen für Zeichen den gefundenen Block (`class="ls-liefer" data-tier=…`, «(je nach Land)», «🇺🇸 USA») und nimmt die ersten 1'000 aktiven Produkte | dieselbe Quelle, Zeile 34–50 |
| 4 | Heute wurden 746 Produkte mit diesem Block zwischen 04:10 und 04:22 UTC geschrieben, gleichmässig rund 60 pro Minute. Es waren die ältesten Produkte (Mai/Juni), viele davon Printful-Sticker. Sirène wurde um 04:10 getroffen, Aurora um 04:12 | Admin-API `updated_at`, `/tmp/zombie_ids_2026-10-13.json` |
| 5 | Der Kanarienvogel 15411554910593 stand um 04:09:30 auf `USA=JA` | `/tmp/zombie_wache.log` |
| 6 | Im Container lief zur Tatzeit kein Schreiber, der diesen Block erzeugen kann. Der GitHub-Workflow `delivery-block.yml` hat keinen Zeitplan (auskommentiert) | Prozessliste der Zombie-Wache; Workflow-Datei |

Das Log des Servers (`/opt/luxe/api-jobs.log`) habe ich **nicht** gelesen, weil ich keinen Zugang habe. Die
Zuordnung beruht auf den sechs Belegen oben.

**Im selben Fenster** änderten sich weitere rund 650 Produkte: zwischen 04:00 und 04:09 sowie zwischen 04:22 und 04:25.
Die Zeitfolge passt zu den Jobs vor und nach `delivery_block`. Welcher Job welches Produkt geändert hat, ist **nicht
belegt**. Bei der Stichprobe 04:22–04:25 (Caps, Armbänder) fand ich keinen Streichpreis, der auf honest_compareat
hinweist. Fest steht: Rund 1'400 Produkte werden jeden Morgen von altem Code angefasst, und jede dieser Änderungen
verbraucht Platz im gemeinsamen API-Eimer. Gegen 04:45 standen davon nur 847–861 von 2'000 Punkten zur Verfügung.

## Warum das so lange niemand fand

- Die Zombie-Wache meldet seit dem 23.09. einen «täglichen Rückschrieb um ~04:07 UTC». Gesucht wurde danach im
  Container (Prozesslisten), nicht in den Zeitplänen der anderen Maschinen.
- Die Crontab-Quittung vom 23.09. zeigte die Zeile `0 4 * * * … run-api-jobs.sh` schon. Damals ging es aber um die
  Frage, ob `/opt/luxe/repo` gelöscht werden darf. Dass dieselbe Zeile den täglichen Schaden um 04:00 erklärt, hat
  niemand verbunden.
- Die Reparatur meldete am 12.10. um 08:35 «0 offen» und am 13.10. um 04:28 «998 offen». Das sah nach einer blinden
  Suche aus und war in Wahrheit ein tägliches Ein- und Ausschalten.

**Lehre:** Meldet ein Wächter jeden Tag dieselbe Uhrzeit, zeigt das auf einen Zeitplan. Dann zuerst ALLE Zeitpläne
lesen: Container-Aufseher, Routinen, GitHub Actions, Server-Cron und Server-Timer. Erst danach Prozesse jagen.

## Für den Betreiber: abschalten (2 Minuten, Hetzner-Konsole als root)

```bash
crontab -l > /root/crontab-sicherung-2026-10-13.txt
crontab -l | sed '/^[^#].*\/opt\/luxe\/repo/ s/^/#aus-13.10. /' | crontab -
crontab -l | grep -c '^[^#].*/opt/luxe/repo'      # muss 0 ausgeben
```

- Damit werden beide alten Zeilen auskommentiert: `run-api-jobs.sh` (04:00) und `vps-cmd-poll.sh` (alle 10 Minuten).
  Beide setzen nur den toten Zweig auf.
- **Rückweg:** `crontab /root/crontab-sicherung-2026-10-13.txt`
- Die neuen Dienste (luxe-agent, luxe-waechter, abannews-deploy) laufen über systemd-Timer und sind davon nicht betroffen.
- **Alternativ** kannst du mir ausdrücklich erlauben, die Zeilen über den Hetzner-Agenten abzuschalten. Dann baue ich
  dafür eine feste Wartungsaktion mit Sicherung und Rückweg (`server/wartung.mjs`). Ohne deine Freigabe hat der
  Klassifikator das abgelehnt.

## Was im Shop läuft (ohne Server-Zugriff)

- **Wächter:** Die Ampel-Funktion `alter_lieferblock()` in `automation/betreiber_ampel.py` zählt jede Stunde live mit
  `productsCount` die aktiven Produkte mit «je nach Land». Zeigt sie 0, ist die Zeile weg. Erster Wert am 13.10. gegen
  04:45: **917**.
  - Steigt die Zahl jeden Morgen wieder, läuft der Cron noch.
  - Bleibt sie bei 0, ist er aus.
- **Reparatur:** Der Aufseher-Block `versand_jenachland` startet ab 04:25 mit `QUELLE=live` und `CAP=1200`.
  - Bei leerem Eimer schafft er nur 3–4 Produkte pro Minute.
  - **Vorrang 13.10.:** 163 beschädigte Seiten mit Besuch in den letzten 60 Tagen (332 Sitzungen) repariere ich
    gesondert und zuerst (`LISTE=/tmp/jenachland_besucht.txt`).
  - Aurora war um 04:50 repariert, Sirène um 04:47. WebFetch bestätigt das für beide öffentlichen Seiten: kein «USA»
    und kein «je nach Land».
- Der versuchte Umbau der Reparatur auf einen Bulk-Export ist verworfen. Seine Begründung («die Suche ist blind»)
  hat sich als falsch herausgestellt: Die Suche war nicht blind, der Block kam jeden Morgen neu.

## Offen

- Betreiber: die Cron-Zeilen abschalten (Befehl oben).
- Danach prüfen, ob die übrigen alten Jobs etwas gehalten haben, das heute noch gebraucht wird. Das Metafeld
  `luxe.vps_last_run` (stamp_alive) liest im aktuellen Zweig niemand (`grep -r vps_last_run` über .py/.mjs/.sh/.js: 0 Treffer).
