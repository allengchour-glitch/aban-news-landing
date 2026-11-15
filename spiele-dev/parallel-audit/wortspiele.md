# Wortspiele: begrenzter Reparaturdurchgang

Arbeitsstand: `/tmp/aban-neon-coop`, Zweig `codex/neon-flug-koop`. Nur die beiden zugewiesenen Spiele bearbeitet; kein Commit, Push, Merge oder Deployment. Fremde Änderungen bleiben erhalten.

## Geprüfte Adressen und Regeln

- `/wort-des-tages.html`: eigenständiges Tagesrätsel, kein Redirect. Fünf Buchstaben A–Z, sechs gültige Versuche; richtige Stellen werden vor vorhandenen Buchstaben gezählt. Der Tag richtet sich unverändert nach dem lokalen Kalender seit Januar 2026.
- `/wortbruecke.html`: eigenständiges Tagesrätsel, kein Redirect. Ein Wort verbindet die beiden Begriffe; beliebig viele Versuche, Hinweise lassen den letzten Buchstaben offen. Umlaute und AE/OE/UE werden gleich behandelt. Tageswechsel unverändert nach UTC.
- Beide Spiele sind Einzelspiele. Es gibt keine behauptete Online-Verbindung, Mitspieler oder Koop-Funktion. Neuladen setzt das laufende Tagesrätsel fort; kein neuer Reset-Knopf, der Tagesfortschritt löschen würde.

## Bestätigte Reproduktionen und Reparaturen

| Eingabe / Zustand | Vorher gemessen | Nachher geprüft |
|---|---|---|
| Wortbrücke bei 320 px Breite | Dokument 331 px breit; Raten-Zeile läuft über | Dokument 320 px breit, Eingabe und Raten bedienbar; alle Brücken-Gewinnansichten ohne horizontalen Überlauf |
| Wortbrücke: Hinweis, falsches Wort, Neuladen | 1 Versuch / 1 Hinweis wird zu 0 / 0; aufgedeckter Buchstabe weg | Versuch, Hinweis, Aufdeckung und noch nicht abgeschickte Eingabe bleiben erhalten |
| Wort des Tages: T klicken, Enter | `TT` statt `T` (globaler Handler und native Button-Aktivierung) | Enter prüft genau einmal, kein zusätzlicher Buchstabe |
| Wort des Tages: Strg+C | `C` wird ins Brett geschrieben | Browser-Tastenkürzel verändern die Eingabe nicht |
| Wort des Tages: angefangene Eingabe, Neuladen | Eingabe verschwindet | Entwurf bleibt erhalten; abgegebene Versuche erzeugen keinen zweiten Entwurf |
| `aban_wdt_stats = null` / `aban_brk = null` | TypeError auf `streak` / `day`, Spielinitialisierung bricht ab | Defensive Wiederherstellung; Spielen bleibt möglich |
| Veraltete Serie nach ausgelassenem Tag | Gespeicherte 5 bzw. 8 werden weiterhin angezeigt | Anzeige 0; ältere Statistikwerte bleiben gespeichert |
| Frischer Seitenbesuch | Browser fragt `/favicon.ico` an, HTTP 404 | Beide Seiten verlinken vorhandenes `/favicon.svg`, HTTP 200 |

Die Serien-Reproduktion wurde zusätzlich mit den vor dem Edit gesicherten Original-HTML-Dateien unter den echten Preview-Headern wiederholt. Bereits gültige gelöste Tagesstände und alte Statistikwerte bleiben kompatibel. Inkonsistente Endflags werden aus den erhaltenen Versuchen abgeleitet, statt einen siebten Versuch zuzulassen.

Zusätzliche kleine Korrekturen: benanntes Wortbrücken-Eingabefeld, echtes Formular für Enter und mobile Eingabeaktionen, Live-Statusmeldungen, verständliche Bewertung der einzelnen Buchstaben auch ohne Farberkennung, sichtbarer Tastaturfokus, dunklere Bewertungsfarben, reduzierte Animationen bei entsprechender Systemeinstellung, Musikschalter mit Namen/Schaltzustand und Platz in der schmalen Kopfzeile. Kopierfehler werden sichtbar gemeldet und erzeugen keine unbehandelten Promise-Fehler.

## Gezielte QA

Ausführen im Worktree:

```sh
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright \
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers \
BASE_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/wortspiele-qa.cjs
```

Der Test setzt Tagesdaten und Storage ausschließlich im eigenen Browserkontext. Alle Assertions führen bei Fehler zu einem von null verschiedenen Exitcode; der eigene Browser wird im `finally` geschlossen. Er prüft echte gelieferte CSP-Header, `securitypolicyviolation`, JS-Fehler, Konsolenfehler, fehlgeschlagene Requests und HTTP-Fehler. Nur nachweisliche `ERR_ABORTED`-Favicon-Anfragen beim schnellen Navigieren werden separat protokolliert; die Favicon-Ressource muss selbst HTTP 200 und SVG liefern. Keine Headeränderungen, deaktivierte CSP oder TLS-Ausnahmen.

Abgedeckt: Touch-Tastatur und physische Tasten, Löschen, ungültiges Wort ohne Versuchsverbrauch, Doppelbuchstabenwertung, Gewinn und Verlust, Eingabesperre am Ende, fortgesetzte und alte Speicherstände, Tageswechsel beim erneuten Öffnen, unterbrochene Serien, Speicherausfall, Teilen per Enter, Kopiererfolg und verweigerte Zwischenablage. Alle kuratierten Tageswörter werden als vorhandene Gewinnstände wiederhergestellt; sämtliche Wortbrücken werden über das echte Eingabefeld gelöst, einschließlich Umlaut-Umschriften. Screenshots bei 320×540 und 960×540; keine großen oder parallelen Dauercaptures.

GEMESSEN: Finaler Lauf nach der Portabilitätskorrektur mit explizitem `PLAYWRIGHT_MODULE` und `PLAYWRIGHT_BROWSERS_PATH` auf Port 8112 **PASS, 642 Prüfungen, Exit 0**. Alle 88 Tageswörter wiederhergestellt, alle 33 Wortbrücken tatsächlich gelöst. Keine JS-, Konsolen-, HTTP- oder CSP-Fehler; auch keine abgebrochenen Favicon-Anfragen in diesem Lauf. Syntaxprüfung beider HTML-Skripte, `node --check` des Tests und `git diff --check` ebenfalls erfolgreich. Mobile und Desktop-Screenshots visuell geprüft. Lokale Screenshots und maschinenlesbare Messung liegen unter `/tmp/wortspiele-audit/`. Der ältere generische `tools/game_smoke.cjs` wird durch diese gezielte Prüfung ersetzt: Er verwendet einen eigenen Server ohne `_headers` und einen 900×600-Viewport.

## Offene Grenzen

- Kein Vollwörterbuch ergänzt: Wort des Tages akzeptiert weiterhin die kuratierte Liste. Keine linguistische Vollprüfung sämtlicher möglichen Alternativlösungen der Wortbrücken.
- Tageswechsel auf einer dauerhaft geöffneten Seite sowie gleichzeitige Bearbeitung desselben Rätsels in mehreren Tabs wurden nicht implementiert oder als gelöst behauptet.
- Ohne verfügbaren Browser-Speicher ist Spielen möglich, dauerhafte Speicherung jedoch nicht. Keine echte Mobilhardware, Screenreader oder native Betriebssystem-Teilen-Oberfläche geprüft.
- Die beiden Wortspiele benötigen weder Blob-Modelle noch eingebettete Stationen oder Mikrofon. Die vom Parent bestätigten gemeinsamen CSP-Probleme und `_headers` bleiben vollständig beim Parent; aus diesem Durchgang keine zusätzlichen CSP-Funde an den beiden Wortspielen.

Geänderte Pfade: `wort-des-tages.html`, `wortbruecke.html`, `spiele-dev/parallel-audit/wortspiele-qa.cjs`, `spiele-dev/parallel-audit/wortspiele.md`.
