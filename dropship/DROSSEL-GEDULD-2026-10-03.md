# Drossel-Schleifen warten bis zum Eimer-Boden statt nur bis zur eigenen Anfrage (03.10.2026, Verbesserungsrunde 16:25)

## GEMESSEN
- `/tmp`-Logs, letzte Zeilen: `cj_versand_ch_guard` (12:11, «12x gedrosselt (Eimer dauerhaft leer)»), `fuellmenge_nachtragen` (16:12, THROTTLED) und `pinterest_pins_pruefen` («dauerhaft gedrosselt») endeten jeweils mit einem Absturz.
- Shopify-Eimer 16:28–16:30, alle 10 s gemessen: 62 · 54 · 61 · 40 · 50 · 21 · 16 · 73 · 136 · 96 · 66 · 120 von 2'000, Nachfluss 100/s.
- **Ursache in 30 Wächtern:** Die Wartezeit war `requestedQueryCost − currentlyAvailable` geteilt durch 100/s. Bei einer Anfrage zu 50 Punkten und 16 verfügbaren sind das **0,8 s**. Nach 12 Versuchen in rund 15 s gab der Wächter auf. Zum Vergleich: Die Massen-Schreiber halten den Eimer mit `eimer_etikette` auf 600; die Wächter dagegen schlüpften zwischen ihnen durch und verloren das Rennen.

## GETAN
- **30 Skripte** warten jetzt bis `max(Anfrage, 600) − verfügbar`, höchstens 30 s je Versuch:
  - 19 mit `_fehlt = …` (dort zusätzlich Geduld 12 → 40 Versuche)
  - 11 mit `_f`/`fehlt`
- Neue Regel `drossel-ungeduldig` in `tools/zweites_gehirn.py`: Köder wird gefangen, echte Fassung bleibt frei. Selbsttest 18/18, Befund 0.
- Alle geänderten Dateien `ast`-geprüft. `engine_keepalive.sh` spiegelt die Fassungen beim nächsten Lauf nach /tmp.
- Rechenprobe (verfügbar, Anfrage → Wartezeit alt / neu): (16, 50) → 0,8 s / 6,3 s · (300, 50) → 12 s / 3,5 s.

## OFFEN
- Nachmessen: In den nächsten Tagen sollten die Logs der Wächter mit FERTIG enden statt mit «gedrosselt».
- Wer den Eimer dauerhaft unter 600 hält, ist nicht eindeutig. Laufend waren cj_bild_backfill, cj_category_fill, google_fein_ki, cj_video_reel_engine und bild_werbetext_rueckholer, und alle haben die Etikette. Möglicher Grund: Mehrere Schreiber warten gemeinsam bis 600 und feuern dann gleichzeitig.
