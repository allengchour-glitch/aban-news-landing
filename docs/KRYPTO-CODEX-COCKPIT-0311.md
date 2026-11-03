# Codex-Auftrag: Krypto-Cockpit «Übersicht» unabhängig prüfen und verbessern (03.11.2026)

Auftrag des Besitzers (03.11.2026, nachts): «das geht viel besser, mit sehr guter Übersicht und Optik und grafisch, schaue mit Codex zur Hilfe». Claude kann Codex aus seiner Cloud-Sitzung nicht aufrufen (kein Codex-CLI, kein Zugang). Darum steht der Auftrag hier als Datei; die nächste Codex-Sitzung liest ihn und antwortet nach dem Muster von `dropship/CODEX-FUNDE-2810.md`.

## Worum es geht
Das Cockpit (`tools/trading/krypto_bot/cockpit.html`, vom Server `cockpit.py` auf `127.0.0.1:8765` ausgeliefert) zeigte die Live-Trades des **Testnetz-Piloten** (BTC und ETH, Spielgeld) als lange Textlisten. Claude baut oben eine neue **«Übersicht»**: Kopfband mit Ampel, Konto und Gewinn mit Verlaufsdiagramm, Positionskarten mit **Kursleiter** (Stop, Einstieg, Jetzt, Liquidation), Auslastung des Kontos, Satelliten-Feld (Top-10-Experiment, `satellit.py`), Auftrags-Zeitstrahl, Lage-Kacheln. Die bisherigen Abschnitte bleiben darunter unter «Details».

- Stand der Arbeit: Branch `claude/krypto-cockpit-uebersicht-0311` (Pull Request folgt, die Bilder liegen im Bericht des Helfers und im PR).
- Neue Datenfelder in `stand()` (`cockpit.py`, nur lesend): `satellit`, `kurse`, Stop je Pilot-Markt.

## Aufgabe an Codex (in dieser Reihenfolge)
1. **Bilder ansehen** (1440×900 und 390×844, dunkel und hell, plus die Fälle «keine Positionen» und «Echtgeld»): Ist auf einen Blick klar, ob alles in Ordnung ist, wie viel im Spiel ist und wie weit jede Position von ihrem Stop entfernt ist? Was ist überladen, was fehlt, was ist schwer lesbar? Höchstens fünf Befunde, jeder mit Bildausschnitt und Vorschlag.
2. **Code-Review der reinen Funktionen** (Berechnung der Kursleiter-Position und der Prozentabstände, Auslastung, Ampel-Zähler) und der `stand()`-Erweiterungen: Randfälle (Stop fehlt, Kurs unter dem Stop, Short, 1000er-Verträge, leere Daten, Echtgeld-Modus).
3. **Verbesserungen als Pull Request** gegen den Branch, jede einzeln und klein, mit Vorher-/Nachher-Bild und einem Test, der ohne die Änderung rot ist.

## Regeln (nicht verhandelbar)
- **Nur Anzeige.** Nichts, was Aufträge, Stops, Hebel, Schalter oder Einstellungen ändert; die Knöpfe behalten ihr Verhalten und ihre `id`s.
- **Nicht anfassen:** `broker_*.py`, `pilot*.py`, `satellit*.py`, `sperre.py`, `autoupdate.py`, `pflege.py`, alle `.bat`/`.vbs` (Gelb/Rot, `docs/KRYPTO-AUTONOMIE.md`).
- Keine Netzzugriffe, keine CDN-Dateien, eine HTML-Datei; die Sicherheitskopfzeilen des Servers bleiben gültig. Keine Schlüssel, keine Geheimnisse in Dateien oder Berichten.
- Texte Deutsch mit «ss» (Schweiz), Zahlen im Format `de-CH`. Gewinn grün, Verlust rot, Warnung Bernstein; **nie Farbe allein** (immer Pfeil oder Wort).
- Echtgeld bleibt gesperrt; im Echtgeld-Fall muss die Anzeige das unübersehbar sagen.

## Prüfkriterien (messbar, sonst gilt es nicht als erledigt)
- `python3 tools/trading/krypto_bot/test_cockpit.py` grün.
- Kein seitliches Scrollen bei 390, 768 und 1440 Pixel Breite; Tippflächen mindestens 44 Pixel.
- Kontrast mindestens 4,5:1 in beiden Themen (gemessen, nicht geschätzt).
- Jeder Zahlenwert der Übersicht gleich dem Wert der Testdaten (von Hand gerechnete Erwartung).
- Tastaturbedienung der Ampel und der Schalter; `prefers-reduced-motion` respektiert; keine Konsolenfehler.

## Ungemessen (ehrlich)
Echter Browser und Windows des Besitzers (Brave), echte Daten eines Testnetz-Laufs, Darstellung bei sehr grossen Schriftgrössen.

## Antwortformat
Pro Befund: **Befund**, **Beleg** (Bild oder Zeile), **Vorschlag**, **erwartete Wirkung**, **ungemessen**. Nichts erfinden: wo Daten fehlen, so schreiben.
