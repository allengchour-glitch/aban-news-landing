# Zugang weg nach frischem Container (26.09.2026, 12:10 UTC)

## Gemessen
- 12:09 UTC `uptime` 0 min, Repo = flacher Klon von `main` (c0ddf32) unter dem Namen `claude/luxestyle-status-tztnn1`,
  CJ-Ledger 7'588 statt 53'789, `/tmp` leer. Arbeitsbaum sauber → Branch auf `origin/claude/luxestyle-status-tztnn1`
  gesetzt (nichts verloren, die 50 «lokalen» Commits waren `main`).
- Umgebung: `SHOPIFY_CLIENT_ID/_SECRET` = 0, `CJ_*` = 0, `METRICOOL_USER_TOKEN` = 1.
  Fehlen: `/tmp/cj_shop_token.txt`, `/tmp/meta_page_token`, `/tmp/cj_token.json`, `/tmp/fortura_env.sh`.
- Folgen: letzter Bildpost 06:10 UTC; 12:12 Autopilot «Kein Shop-Token → No-op» für YouTube und Pinterest,
  Instagram/Facebook pausiert; Bestell-Ampel «unklar». Alle Post-Quittungen der letzten 30 h stammen aus der
  Cloud-Sitzung, keine vom Hetzner-Server → das Posten hängt allein an diesem Container.
- Der Tresor (Shop-Metafeld `ls_tresor`) ist ohne Shop-Token nicht lesbar.
- **Die Betreiber-Ampel schwieg ganz:** `main()` endete mit `return`, sobald der Shop-Token fehlte.

## Getan
- `automation/betreiber_ampel.py`: `zugang_weg()` meldet fehlende Zugänge als erste Zeile
  «⛔ ZUGANG WEG: …» (nur Dateinamen, nie Inhalte); 19 von 25 Prüfungen laufen auch ohne Shop-Token weiter,
  die 6 tokenpflichtigen werden übersprungen; eine abstürzende Prüfung meldet «unklar» statt die Ampel zu beenden.
- Gegenprobe mit Wegwerf-Dateien: alle da → still; leere Datei → gemeldet; Server ohne Meta → still.

## Offen (Betreiber)
- `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` als Umgebungsvariablen der Claude-Umgebung setzen
  (überleben jeden Container-Wechsel; danach holt `shop_token_refresh.sh` den Token und der Tresor liefert den Rest).
  Bis dahin posten Instagram, Facebook, TikTok, YouTube und Pinterest nicht.
