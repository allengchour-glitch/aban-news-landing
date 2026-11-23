# Auftrag an Codex: rund 100 Papiertrades am Tag (ABAN-Papierbot)

Stand 23.11.2026. Auftraggeber: Besitzer («es traidet zu wenig», «100 trades täglich ca», «du bist jetzt chef»). Claude leitet und nimmt ab, Codex baut. **Nur Papiergeld.** Keine Echtgeld-Pfade, keine Orders, keine Transfers, keine Börsenschlüssel, nichts an `/opt/abannews`. Lieferung wie bisher privat in Drive, mit Prüfsummen und einem hash-gepinnten Starter, den der Besitzer selbst auf Hetzner ausführt.

## Ziel
Der Papierdienst soll an einem normalen Tag rund 100 Papiertrades abschliessen (Spanne 70 bis 130), ohne die bestehenden Schutzregeln aufzuweichen.

## Grenzen (nicht verhandelbar)
- Höchstens 8 gleichzeitige Strategiepositionen zu je 100 Papier-USDT (Papier-Maximum bleibt).
- Tageslimit: höchstens 150 Papiertrades je Tag, danach Pause bis Mitternacht Europe/Zurich.
- Verlustserie-Pause und Abkühlzeit bleiben. Stops und modelliertes Stoprisiko bleiben.
- Gebühr und Slippage nicht verstecken: der im Dienst gerechnete Satz wird angezeigt.

## Umsetzung
1. Lockerung nur über Einstellungen des Profils (`scalping-aggressiv-v1` oder ein neues Profil `scalping-viel-v1`), nicht über das Entfernen von Prüfungen. Jede gelockerte Schwelle mit Grund und altem Wert dokumentieren.
2. Dashboard-Pflichtanzeige: Trades heute, Gebühren heute, Netto nach Gebühren heute, Durchschnitt je Trade, Anzahl blockierter Signale je Regel («warum nicht gehandelt»). Fehlende Zahlen als «—», nie als Null.
3. Gebührensatz aus dem Dienst lesen und anzeigen (nicht fest im Anzeigecode).

## Abnahme durch Claude (vor Auslieferung an den Besitzer)
- Alle bestehenden Tests grün, dazu neue Tests für Tageslimit, Pause, Anzeige «—», Gebührenanzeige; Mutationsprobe an den neuen Grenzen (Tageslimit, Positionen, Pause).
- Rechenlauf auf aufgezeichneten öffentlichen Binance-Daten: Trades je Tag, Gebühren, Netto nach Gebühren, **im Vergleich zum alten Profil**. Wird das Netto deutlich schlechter, steht das offen im Bericht; ein schlechteres Netto verhindert die Auslieferung nicht, muss aber benannt sein.
- Prüfsummen von ZIP, Bootstrap und Starter in der Übergabe; Starter prüft beide per fest eingetragener SHA256 (wie `BINANCE-PAPIERBUDGET.sh`).
- Keine Datei mit Echtgeld-Pfaden im Serverpaket (Positivliste).

## Ehrliche Erwartung
Bei angenommen 0,1 % Gebühr je Seite kosten 100 Trades zu 100 USDT rund 20 USDT am Tag. Mehr Trades sind nur dann besser, wenn das Signal im Mittel mehr als die Gebühren verdient. Das ist ein Papier-Test, kein Gewinnversprechen.

## Rückmeldung
Bericht wie üblich in `CLAUDE-CODE-BOT-AKTUELL.md`: GEMESSEN, UNGEMESSEN, Prüfsummen, ein Befehl für den Besitzer.
