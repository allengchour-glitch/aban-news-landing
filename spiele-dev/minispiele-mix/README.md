# Minispiele-Mix

Besitzerentscheidung vom 16.11.2026: «Ein Rundenspiel – mehrere Minispiele nacheinander». `/minispiele/` startet deshalb jetzt einen zusammenhängenden Mix. Die bisherige Sammlung bleibt als aufklappbarer Übungsbereich erreichbar. Die Arcade zeigt vier Hauptkarten; neun weitere Einstiege stehen unter «Weitere Spielwelten & einzelne Disziplinen». Traumhaus-Code und Hauptspiel-Hero sind unverändert.

## Ablauf

- Zwei Spieler an einem Gerät, Namen frei wählbar. Kein neuer Online-Modus.
- Drei, fünf oder sieben zufällig gemischte Disziplinen aus zwanzig, ohne Wiederholung im selben Mix.
- Ein Sieg zählt drei Punkte, ein Remis je einen Punkt. Abbrechen gibt keine Punkte.
- Einführung → Disziplin → tatsächliches Ergebnis → Zwischenstand → nächste Runde → Gesamtsieger. Die jeweils ursprünglichen Spielernummern bleiben maßgeblich; Farben und Bildschirmseiten unterscheiden sich zwischen den Disziplinen.
- Der Mix wird ausschließlich im eigenen Speicherfeld `aban_mini_mix_v1` gesichert. Beim Neuladen bleibt die Wertung erhalten; eine unterbrochene Disziplin beginnt ungewertet neu.
- Eine eingebettete Disziplin läuft gleichzeitig. Danach wird ihr iframe entfernt und damit ihre Ausführung beendet. Ergebnisnachrichten müssen zum aktuellen Fenster, Ursprung, Spiel und einmaligen Rundenschlüssel passen. Doppelte Meldungen zählen nicht erneut.
- Der kleine Ergebnis-Loader bleibt außerhalb des Mix inaktiv. Einzelspiele und Lebenspfad behalten ihre bisherigen Abschlüsse und Wertungen.

## Prüfung

GEMESSEN am lokalen Stand mit Inhaltsversionen aller fünf neuen Assets:

- **134/134 Node-Prüfungen**: sieben Mix-Regel-/Nachrichtenprüfungen, 105 Originalfunktionsprüfungen der zwanzig Abschlüsse sowie vorhandene Mechanik- und Inventarprüfungen. Die VM-Zugänge setzen definierte Spielstände und führen danach die vollständige ursprüngliche Abschlusslogik aus; sie sind keine Browsernachweise.
- **17/17 Mix-Browserbedingungen**: echter Drei-gewinnt-Sieg durch Touch, tatsächliches Rhythmusergebnis und tatsächlicher Rennzieleinlauf, Gesamtwertung 6:3, Fortsetzen nach Neuladen, Abbruch ohne Punkte, Runden-Neustart nach Reload und keine JavaScript-Fehler. Nur die Reihenfolge wird als Speicher-Fixture vorgegeben; zwei Zeitspiele verwenden kontrollierte Browserzeit. Kein Ergebnis wird direkt gesetzt.
- **17/17 Übersichts-Browserbedingungen**: bestehende Direktstarts erreichbar, Traumhaus-Hero erhalten, Regeltexte auffindbar, kein horizontaler Überlauf bei 390×844, 640×360 und 1280×800. Vier Hauptkarten sichtbar, zwanzig Übungslinks aufklappbar.
- HTML-Validierung von `spiele.html` und `minispiele/index.html` sowie `git diff --check` sauber. Handy-/Desktopbilder angesehen.
- `https-qa.py` baut die 22 betroffenen HTML-Seiten mit dem echten `inject-engine.mjs`. Vier Gegenproben erkennen geänderte Spiellogik, Zusatzskripte und fehlenden Mix-Loader. Nach Bereitstellung: 34 normale HTTPS-Abrufe für Seiten/Aliasse und bytegenaue Assets mit/ohne Inhaltsversion; Vergleich der Skripte, Styles, CSP und Frame-Regeln.

Rohbelege liegen unter [belege](belege). Die ersten Browserversuche scheiterten an zu breiten bzw. durch CSS-Großschreibung beeinflussten Testselektoren; die anschließenden vollständigen Läufe sind grün. Die Gesamt-CI-Simulation stoppt vor ihrem Prüflauf, weil `/home/agent` schreibgeschützt ist. Echte GitHub-Prüfungen und öffentliche Bereitstellung werden im zugehörigen PR dokumentiert. Kein physischer Handy-FPS-, öffentlicher Browser- oder Internet-Koop-Nachweis.

```bash
node --test spiele-dev/minispiele-mix/*.test.cjs spiele-dev/minispiele-identitaet/mechanik.test.cjs spiele-dev/arcade-einzigartig/inventar-test.cjs
PORT=8183 node spiele-dev/neon-flug/server.cjs
MIX_BASE=http://127.0.0.1:8183 node spiele-dev/minispiele-mix/browser.cjs
MIX_PREFLIGHT=1 RELEASE_COMMIT=local python3 spiele-dev/minispiele-mix/https-qa.py
# Nach erfolgreichem Hauptseiten-Deploy:
RELEASE_COMMIT=<Merge-Commit> python3 spiele-dev/minispiele-mix/https-qa.py
```

Playwright/Chromium werden aus der vorhandenen Prüfumgebung verwendet. `PLAYWRIGHT_MODULE`, `MIX_BASE` und `MIX_OUT` erlauben getrennte Modul-, Server- und Belegpfade. Der Übersichts-Test verwendet `ARCADE_BASE` und `ARCADE_HUB_OUT`.
