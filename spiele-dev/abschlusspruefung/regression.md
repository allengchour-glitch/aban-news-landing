# Abschlussprüfung der Spiele – 15.11.2026

**GEMESSEN:** Minispiele 60/60, Wortspiele 642/642, Action 74/74 und Traumhaus 23/23 + 7/7 bestanden. **Keine vollständige grüne Gesamtabnahme:** Park erreicht in der vollständigen Welten-Suite die 120-s-Frist. Der isolierte Park-Test für Renderstillstand in Solo-Pause und mobilen Weiter-Tap besteht. Kein neuer Laufzeitdefekt ist durch diese Runde bestätigt; Parks übrige Eingabe-/Pausenbedingungen sind aktuell nicht vollständig nachgewiesen.

Arbeitsort `/tmp/aban-neon-coop`, Branch `codex/neon-flug-koop`, HEAD `9dc1306ad`. Prüfung am 15.11.2026, etwa 23:35–23:42 UTC, gegen **http://127.0.0.1:8113**, mit tatsächlich gelieferten CSP-/sonstigen Response-Headern. Alle eigenen Browser-Skripte liefen nacheinander. Kein Commit, Push, Publish oder Laufzeitcode-Eingriff durch diese Teilaufgabe. Gelesen: `AGENTS.md`, Arbeitsteilung sowie sämtliche bisherigen Gruppenberichte unter `parallel-audit`.

Die [Rohdaten](regression.json) enthalten sieben Läufe mit Exitcodes, vollständigen Logs, Ergebnisobjekten, Zusatzdiagnostik, Quellen-Hashes und den exakten temporären QA-Diffs. [Adressen und HTTP-Header](regression-adressen.json) klassifizieren alle 36 Adressen; sämtliche lokalen Seitenantworten waren HTTP 200. HTML-Weiterleitungen sind dabei erwartungsgemäß zunächst ebenfalls HTTP 200. Die 36 HTML-Dateien, `_headers` und die sechs bestehenden Gruppen-QA-Dateien hatten zu Beginn und Ende dieselben SHA-256-Werte. Eine spätere Audio-Reparatur ist durch diese Messung nicht automatisch geprüft.

| Lauf | GEMESSEN | Exitcode | Umfang / Grenze |
|---|---|---:|---|
| Minispiele | 60 bestanden, 0 Fehler | 0 | 40 Starts bei 390×540 / 900×540 und 20 gezielte Bedingungen; einschließlich Ende/Neustart und kontrolliertem Pong-Zeitvergleich |
| Wortspiele | 642 bestanden | 0 | 88 wiederhergestellte Tageswörter, 33 tatsächlich gelöste Brücken, Storage-/Tastatur-/Layoutproben |
| Action | 74 bestanden, 0 Fehler | 0 | Mechanik, Fokus/Pause, echte mobile Renderproben, Racer-Straße/HUD und drei Weiterleitungen |
| Welten vollständig | Wildnis 4, Zusammen 6, Lebenspfad 3, Realm 1 Bedingung bestanden; Park nur Lobby-Abbruch und Start | **1** | 172,93 s gesamt; Park bei 120-s-Frist im CDP-Touch-Aufruf unterbrochen |
| Park isoliert | 2/2 bestanden | 0 | 43,81 s; 390×540, kein Renderfortschritt über 300 ms Solo-Pause, echter Touch-Tap auf Weiter und anschließender Renderfortschritt |
| Traumhaus Interaktion | 23/23 bestanden | 0 | 68,23 s; echte Modelle, kleiner Zeichenpuffer während Eingabeproben, natives Startbild 844×390 |
| Traumhaus lokale Lobby | 7/7 bestanden | 0 | 3,70 s; zwei echte lokale WebRTC-/DataChannel-Seiten, Namen/Hoststart/Bauübertragung; GLBs absichtlich abgewiesen, Zeichnen aus |

Traumhaus lud in der Interaktionsprobe 389/389 angeforderte Modelle, `_ladeOffen=0`; 1035 Einträge in `_gebaeude`. Das ist ein Ladezustand dieses Laufs und keine vollständige Stadt-/Geometrieprüfung.

## Park: genaue Reproduktion und verbleibende Lücke

```sh
export PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright
export PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers
WELTEN_BASE_URL=http://127.0.0.1:8113 \
  WELTEN_OUT=/tmp/aban-final-regression/welten \
  node spiele-dev/parallel-audit/welten-qa.cjs
```

Vollständige Standardsuite, frischer Browser je Adresse. Park: 640×440 mit Touch, `?station=1&mp=local`, Laden abwarten → Koop-Suche → Abbrechen → Solo. Die ersten beiden protokollierten Bedingungen bestanden. Während der anschließenden CDP-Touch-Sequenz schloss die vorhandene 120-s-Frist den Context: `cdpSession.send: Target page, context or browser has been closed`, `deadline:true`, `ok:false`, `csp:null`, `errors:[]`, `console:[]`. Das Protokoll unterscheidet nicht, welcher einzelne CDP-Touch-Aufruf unterbrochen wurde. Kein reproduzierter falscher Spielzustand; Ursache von Langsamkeit und vollständige weitere Eingabe-/Pauseprüfung bleiben offen. Insbesondere ist `csp:null` keine bestandene CSP-Endprüfung.

```sh
WELTEN_BASE_URL=http://127.0.0.1:8113 WELTEN_GAMES=neon-park \
  WELTEN_PARK_MOBILE_ONLY=1 WELTEN_OUT=/tmp/aban-final-regression/park-idle \
  node spiele-dev/parallel-audit/welten-qa.cjs
```

Dieser genau einmal ausgeführte Folge-Lauf besteht beide vorhandenen Bedingungen mit `errors:[]`, `csp:[]`, `console:[]`. Screenshot `/tmp/aban-final-regression/park-idle/neon-park-pause-mobile.png`. Er ersetzt die fehlenden Touch-Abbruch-/Fokusverlust-/Tastatur-Pausenbedingungen des Volltests nicht. Frühere Park-Zeitabbrüche aus `parallel-audit/welten.md` bleiben damit als Vorgeschichte relevant.

## Konsole, CSP und konkrete QA-Probleme

- Wortspiele: keine erfassten JS-/Konsolen-/Netz-/CSP-Fehler. Action: keine Fehler im bestehenden Harness und auch keine Ereignisse im Zusatzbeobachter. Traumhaus Interaktion: ebenfalls keine Zusatzereignisse, JS- oder CSP-Blockaden.
- Minispiele: vorhandene JS-/CSP-Assertions bestanden. Das bestehende Skript erfasst allgemeine Konsolenfehler nicht vollständig; hier kein pauschaler Nachweis einer leeren Konsole und kein zusätzlicher Browserdurchlauf.
- Welten: Zusatzbeobachter erfasst **fünf** `pageerror` auf `about:blank`; Park isoliert **einen**. Wortlaut: `Failed to read the 'localStorage' property from 'Window': Access is denied for this document.` Die bestehende `context.addInitScript`-Funktion greift bereits auf dem opaken Startdokument auf `localStorage` zu. Die ursprünglichen später registrierten Seitenlistener sehen diese Fehler nicht. Alle Ereignisse bleiben in JSON erhalten; die eigentlichen Spielseiten meldeten keine JS-Fehler. Konkrete reine QA-Korrektur: als erste Zeile dieses Init-Skripts `if (location.origin === "null") return;` ergänzen. Dadurch bleiben sämtliche Initialisierung und CSP-Erfassung auf den echten HTTP-Spielseiten erhalten. Nicht in die geteilte Quelldatei eingespielt, da diese Teilaufgabe nur Abschlussbericht/JSON besitzt.
- Traumhaus-Lobby: **825** fehlgeschlagene GLB-Anfragen und **825** zugehörige Konsolenfehler `Failed to load resource: net::ERR_FAILED`, alle auf `.glb`-URLs. Sie entstehen durch das bestehende absichtliche `ctx.route("**/*.glb", r => r.abort())`. Keine übrigen Zusatzereignisse, keine JS-Ausnahme oder CSP-Blockade. Dieser Lauf hat ausdrücklich keine leere Konsole und bestätigt keine Modell-/Renderqualität im Koop.
- Der alte unbekannte Realm-Ressourcen-404 ist im Gruppenbericht dokumentiert. Im aktuellen Realm-Lauf sind `console:[]` und kein HTTP-/Netz-404 im Zusatzbeobachter erfasst. Nicht erneut reproduziert; keine Reparaturbehauptung. Realm überspringt im bestehenden Harness die abschließende CSP-Array-Abnahme und prüft die tatsächliche Weiterleitung.

Für die getrennte Fehleraufzeichnung ergänzte ausschließlich ein temporärer Node-Preload Listener auf neue Seiten; keine Fehlerfilter oder Assertions wurden gelockert. Die Original-QA-Dateien bleiben unverändert.

Traumhaus besitzt keinen Ausgabeordner-Schalter und würde neben die bestehenden QA-Quellen schreiben. Deshalb liefen temporäre Kopien unter `/tmp/aban-final-regression/harness/`, mit unverändertem `TH_SOURCE=/tmp/aban-neon-coop/traumhaus.html`, `TH_ORIGIN=http://127.0.0.1:8113`, `TH_LABEL=final`. Nur Ausgaben wurden auf `TH_QA_OUT` umgeleitet; in der verschobenen Interaktionskopie wurde zusätzlich der Quellwurzelpfad auf das reale Repository festgelegt. Exakte Diffs stehen in JSON. Konkrete dauerhafte reine QA-Portierung für beide Originalskripte: `const out = process.env.TH_QA_OUT || __dirname; fs.mkdirSync(out, { recursive: true });` und die drei Ausgabeziele `path.join(__dirname, ...)` durch `path.join(out, ...)` ersetzen. Diese temporäre Ausgabeportierung ist durch beide erfolgreichen Läufe geprüft; keine Runtime-Datei geändert. Der zusätzliche `about:blank`-Guard ist nur als konkrete ungetestete Quellkorrektur vorgeschlagen.

## Alle 36 Adressen

32 aktive Spiel-/Stationsadressen einschließlich des separat geprüften Flugspiels, vier Legacy-Weiterleitungen. Die zusätzliche bedingte Direktweiterleitung von Zusammen ändert dessen Einordnung als aktive Station nicht. HTTP-Erreichbarkeit allein gilt nicht als Funktionsnachweis.

| Adresse | Einordnung | Ergebnis dieser Teilaufgabe |
|---|---|---|
| `neon-abyss.html` | Legacy-Weiterleitung → Wildnis | PASS Weiterleitung; kein eigenes Spiel |
| `neon-colossus.html` | Legacy-Weiterleitung → Wildnis | PASS Weiterleitung; kein eigenes Spiel |
| `neon-dungeon.html` | Eigenständiges Spiel / Station | PASS Gruppen-QA |
| `neon-duo.html` | Legacy-Weiterleitung → Wildnis | PASS Weiterleitung; kein eigenes Spiel |
| `neon-flug.html` | Eigenständiges Spiel | Delegiert an Elterninstanz; hier nur HTTP |
| `neon-jump.html` | Eigenständiges Spiel / Station | PASS Gruppen-QA |
| `neon-park.html` | Eigenständiges Spiel / Station | TEIL: Vollsuite Zeitabbruch; isolierte Pause/Weiter PASS |
| `neon-racer.html` | Eigenständiges Spiel / Station | PASS Gruppen-QA |
| `neon-realm.html` | Legacy-Weiterleitung → Wildnis | PASS Weiterleitung; kein eigenes Spiel |
| `neon-survivor.html` | Eigenständiges Spiel / Station | PASS Gruppen-QA |
| `neon-wildnis.html` | Eigenständiges Spiel / Station | PASS Gruppen-QA |
| `neon-zusammen.html` | Station; direkt bedingte Wildnis-Weiterleitung | PASS als Station |
| `lebenspfad.html` | Eigenständiges Spiel / Station | PASS Gruppen-QA |
| `traumhaus.html` | Eigenständiges Spiel | PASS 23 Interaktion + 7 lokale Koop |
| `wort-des-tages.html` | Eigenständiges Einzelspiel | PASS Wortspiel-Suite |
| `wortbruecke.html` | Eigenständiges Einzelspiel | PASS Wortspiel-Suite |
| `minispiele/auto-rennen.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/ballon-pump.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/drei-gewinnt.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/elfmeter.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/farb-klick.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/hoch-tief.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/mathe-duell.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/maulwurf.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/memory.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/pong.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/punkte-jagd.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/quiz-buzzer.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/reaktions-duell.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/schere-stein-papier.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/schlange-duell.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/simon.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/stapel-turm.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/tap-duell.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/tauziehen.html` | Lokales Minispiel | PASS Starts + gezielte Probe |
| `minispiele/vier-gewinnt.html` | Lokales Minispiel | PASS Starts + gezielte Probe |

## Grenzen und Übergabe

**Blocker für eine vollständige Abnahme dieser Gruppe:** Park-Vollsuite bleibt unvollständig. Kein expliziter neuer Runtime-Blocker ist nachgestellt. Keine pauschale „alle Spiele fehlerfrei“-Aussage. Keine Laufzeitreparatur durch diese Teilaufgabe; Parent entscheidet über Veröffentlichung und weitere Schritte.

Vorhandene Produktgrenzen bleiben sichtbar: Park-Handknopf ohne verdrahtete Aktion; Lebenspfad-Menü stoppt nicht sämtliche laufenden Timer/Simulation; Survivor-Upgradeauswahl weiterhin mit zufälligem Sortiervergleich. Diese Punkte wurden nicht neu repariert oder vollständig nachgetestet. Ganze Kampagnen, sämtliche Stadt-/Katalogobjekte, Langzeit-Spielstände und alle Regelvarianten sind nicht durchgespielt.

Flugspiel, Audio und öffentliche Vermittlung gehören anderen Prüfern und wurden nicht dupliziert. QUELLE aktuelle Elterninstanz-/Nutzer-Steuerung: Flug-Echtzeitlauf fünf Minuten mit beiden Seiten über alle drei Kapitel bestanden; öffentlicher Browserpfad weiterhin TLS-blockiert, Audio-Reparatur läuft getrennt. Das sind keine Messungen dieses Berichts. Kein echter Hardware-, Handy-FPS-, Safari-, Voice- oder Internet-Koop-Nachweis durch diese Runde; keine TLS-/CSP-Ausnahme. Keine vollständige Repository-CI in dieser Abschlussrunde.

Eigene geänderte Repositorypfade: `spiele-dev/abschlusspruefung/regression.md`, `spiele-dev/abschlusspruefung/regression.json`, `spiele-dev/abschlusspruefung/regression-adressen.json`. Temporäre Logs, Screenshots, QA-Kopien und Runner liegen ausschließlich unter `/tmp/aban-final-regression/`. Dateien anderer Prüfer im selben Abschlussordner bleiben unberührt. Beim abschließenden Statuslesen waren fremde Änderungen an `js/neon-flug/audio.mjs` und `js/neon-flug/flight.css` sichtbar; diese sind nicht Gegenstand dieser Gruppenprüfung.
