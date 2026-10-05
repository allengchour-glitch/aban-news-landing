# Eimer-Etikette im Helfer `kaufwille_zeile.gql` (05.10.2026, Verbesserungsrunde 04:25 UTC)

**GEMESSEN:** `python3 tools/zweites_gehirn.py --wacht` → 1 NEU: `[helfer-ohne-eimer] automation/kaufwille_zeile.py`.
`kaufwille_zeile.gql` ist seit 04.10. der gemeinsame Shopify-Helfer von 13 Werkzeugen (kategorie_rein, kategorie_rein_2,
kategorie_ki, google_reiztitel, titel_sonderzeichen, seo_voll_fix, zusagen_abgleich, ek_luecke_cj, groessenwert_normieren,
filtergrenze_wache, sammeltyp_zaehler …) und der Fix-Agenten dieses Tages. Er hatte keinen Eimer-Boden und nur 3 Versuche
mit 3/6/9 s Pause. «Throttled» war damit nach ~18 s ein Abbruch, weshalb kategorie_rein am 04.10. eine eigene
30er-Warteschleife um jeden Aufruf brauchte (Klasse «drossel-ungeduldig», 03.10.).

**GETAN:**
- `eimer_etikette.nachlauf` nach jeder Antwort: unter dem Boden wird gewartet, bevor der nächste Schreiber den Eimer leert.
- Drosselung zählt getrennt von echten Fehlern: bis `GQL_GEDULD` (40) Drossel-Runden, Wartezeit aus `throttleStatus`
  = (max(Anfrage, 600) − verfügbar) / restoreRate, höchstens 30 s. HTTP 429 zählt als Drosselung. Echte Fehler: weiter 3 Versuche.
- Die Fehlermeldung behält «Throttled» (Aufrufer wie kategorie_rein/kategorie_rein_2 prüfen auf das Wort).

**NACHGEMESSEN:** `gql('{shop{name}}')` → LuxeStyle; `kaufwille_zeile.py` liefert die Zeile; Kanarienvogel `_drossel_warte`
(120 angefragt, 16 verfügbar, Rate 100 → 6,34 s; leere Antwort → 12 s); Zweites Gehirn danach **0 NEU**.

**Wächter:** Regel `helfer-ohne-eimer` im Zweiten Gehirn (läuft in jeder Verbesserungsrunde) — sie hat diesen Helfer gefunden.
