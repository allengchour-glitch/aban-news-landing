# Traumhaus – begrenzte Reparaturrunde, 15.11.2026

Arbeitsort: `/tmp/aban-neon-coop`, Branch `codex/neon-flug-koop`. Ein eigenes Spiel im Umfang: `/traumhaus.html`; `traumhaus.webmanifest` ist das Installationsmanifest, kein weiteres Spiel. In `_redirects` wurde kein Traumhaus-Alias gefunden. Keine Welt-Neuskalierung, kein Redesign, keine Shared-JS-/Vendor-/Header-Aenderung, kein Commit/Push/Merge.

Gelesen: `AGENTS.md`, die relevanten Runbook-Abschnitte zu HUD, Steuerung, Sonden, Software-Renderer und Koop sowie `th-lib.mjs`, `th-bauen.mjs`, `th-steuerung.mjs`, `th-koop.mjs`, `probe-r107.mjs`. Sonden laufen innerhalb der IIFE wie im vorhandenen Werkzeug. Browserfenster: 844×390, Koop 720×405, jeweils eigene Browser und Abschluss im `finally`.

## Bestaetigte Fehler und Reparaturen

Alle fuenf Fehler wurden am unveraenderten HTML im echten Browser nachgestellt. Der gesicherte Ausgangsstand `/tmp/traumhaus-parallel-before.html` entspricht `HEAD:traumhaus.html` (SHA-256 `05b1df1dbb1899a860a592aba746bb0d789aa7b423833ee4fe88d5d312e927e5`). Gemessene Vorherwerte stehen in `traumhaus-before.json`.

| Eingabe | Vorher GEMESSEN | Nachher GEMESSEN |
| --- | --- | --- |
| Kurzer Rechtsklick mit Wandwerkzeug | 1 ungewollte Wand, −25 $ | 0 Waende, 0 $ Kosten |
| Mausrad ueber Baupalette | Kamera-Zoom 40 → 47,8809 | bleibt 40; auf Leinwand zoomt es weiterhin |
| Kurze Zwei-Finger-Geste, dann beide loslassen | 1 ungewollte Wand, −25 $ | 0 Waende, 0 $ Kosten |
| Nach Kneifen einen Finger weiterziehen | Kamera-Drehung 0 | −0,15 rad bei 25 px Zug |
| Joystick-Capture verlieren ohne pointerup | Richtung x=0,95, Rennsignal bleibt an | Richtung 0/0, Rennsignal aus |

Reparatur: Maus-Tipps brauchen eine aktive linke Leinwand-Geste. Das Mausrad wird auf der Leinwand behandelt. Eine begonnene Zwei-Finger-Kamerageste bleibt bis zum letzten Finger eine Kamerageste; der verbleibende Finger startet ohne Positionssprung weiter. `lostpointercapture` beendet den Joystick wie `pointerup`/`pointercancel`.

## Gezielte Pruefung

Abschluss auf Preview **8112** mit finaler `img-src blob:`-Regel: **23/23** Interaktionspruefungen und **7/7** lokale Koop-Pruefungen bestanden, beide Exit 0. Keine JS-Ausnahme und keine CSP-Blockade in beiden Laeufen. Bereits der Zwischenstand auf 8110 bestand dieselben fachlichen Pruefungen.

GEMESSEN am Ende der interaktiven QA: Ladeschlange 389/389, `_ladeOffen=0`, 1032 Eintraege in `_gebaeude`. Das ist eine Bezugsgroesse fuer diesen Lauf, keine vollstaendige geometrische Ruhepruefung der Stadt.

Interaktionspruefung umfasst zusaetzlich: Solo → Moduswahl → Begruessung → Spiel, sichtbare Startknoepfe im Handy-Querformat, kontrollierte Gegenprobe am echten Canvas, Linksklick mit 25-$-Buchung, Rueckgaengig und Wiederholen, Ein-Finger-Tipp, Wandzug mit sieben Waenden fuer 175 $, ein Rueckgaengig fuer den gesamten Zug, WASD und Loslassen/Fensterwechsel. Beide kleinen Startbilder wurden angesehen; keine neue Layout-Aenderung war fuer die bestaetigten Eingabefehler notwendig. Bilddateien zeigen den Startzustand, keine vollstaendige Stadtbegehung.

Lokaler Koop: zwei echte `RTCPeerConnection`-/DataChannel-Seiten mit `?mp=local`, beide Namen vor dem Start, Startknopf nur beim Host, Start erreicht beide Seiten und eine vom Host gebaute Bodenplatte erreicht den Gast. Modell-Anfragen sind dabei wie im bestehenden `th-koop` absichtlich abgewiesen, Rendern ist fuer diese reine Netz-/Lobbypruefung abgeschaltet. Keine vorgetaeuschten Online-Mitspieler; Host/Gast sind die beiden Testseiten.

Beide QA-Skripte verwenden `TH_ORIGIN` (Vorgabe 8112), optional `TH_SOURCE`, `TH_LABEL`, `TH_PLAYWRIGHT`. Assertion-Fehler enden mit Exit 1, Harness-/Zeitlimitfehler mit Exit 2. Header werden beibehalten, CSP-Konsolenmeldungen werden geprueft, kein `ignoreHTTPSErrors`, keine deaktivierte CSP. Die interaktive QA laedt die echten Modelle und speichert zusaetzlich Ladezaehler und Antwortheader in JSON. Nur der Zeichenpuffer wird waehrend der Interaktionen auf 280×170 verkleinert; Kamera, Welt und HUD bleiben unveraendert. Fuer das Kontrollbild wird nativ 844×390 gezeichnet.

Ein erster Wiederholungslauf auf 8112 endete beim Auslesen des sichtbaren Intro-Knopfs im 30-s-Harnesslimit (Exit 2). Danach Zeichenpuffer bereits beim Start verkleinert und das dokumentierte langsame Laden mit 120-s-Limit beruecksichtigt; der komplette frische Lauf und anschliessend der Koop-Lauf bestanden. Keine Produktionsaenderung wegen dieses Harness-Zeitlimits.

```sh
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers TH_ORIGIN=http://127.0.0.1:8112 node spiele-dev/parallel-audit/traumhaus-qa.cjs
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers TH_ORIGIN=http://127.0.0.1:8112 node spiele-dev/parallel-audit/traumhaus-lobby-qa.cjs
node spiele-dev/tools/th-lint.mjs
```

Vorher reproduzieren: `TH_SOURCE=/tmp/traumhaus-parallel-before.html TH_LABEL=before` zur interaktiven QA hinzufuegen. Der erste Vorherlauf verwendete 8100 mit alten Headern und endete erwartungsgemaess mit Exit 1: fuenf Interaktionsfehler, keine JS-Ausnahme; zusaetzlich 264 CSP-Konsolenmeldungen fuer Modell-Blob-Fetches. Diese gemeinsame Header-Ursache gehoert dem Parent; sie wird nicht den Traumhaus-Eingabereparaturen zugeschrieben.

Statische Pruefung: alle ausfuehrbaren Inline-Skripte mit `node --check`, beide QA-Skripte mit `node --check`, `git diff --check` und bestehendes `th-lint.mjs` (92 Werkzeuge, 124 Sonden-Literale) bestanden. Die volle `th-alle`-Weltpruefung wurde nicht ausgefuehrt: sie verwendet alte feste Browser-/Repositorypfade, groessere Browserfenster und schreibt ausserhalb der zugewiesenen Audit-Dateien. Keine Weltgeometrie wurde geaendert.

## Grenzen

Kein abgeschlossener Gesamtaudit des grossen Spiels: Internetvermittlung, andere Geraete/Netze, Voice mit echter Berechtigung, Koop-Abbruch/Wiedereinstieg, lange Spielstaende, alle Katalogobjekte und Stadtinteraktionen bleiben offen. WASD-Richtung ist geprueft; fluessige Bewegung und FPS auf echter Handy-/Safari-Hardware sind damit nicht belegt. Touch-Kameragesten sind mit reproduzierbaren DOM-Touchereignissen geprueft, Joystick/Maus mit echten Browser-Pointerereignissen. Keine FPS-Zusagen aus SwiftShader.

## Geaenderte Pfade dieser Teilaufgabe

- `traumhaus.html`
- `spiele-dev/parallel-audit/traumhaus.md`
- `spiele-dev/parallel-audit/traumhaus-qa.cjs`
- `spiele-dev/parallel-audit/traumhaus-lobby-qa.cjs`
- `spiele-dev/parallel-audit/traumhaus-before.json`
- `spiele-dev/parallel-audit/traumhaus-after.json`
- `spiele-dev/parallel-audit/traumhaus-lobby-after.json`
- `spiele-dev/parallel-audit/traumhaus-before-mobile.png`
- `spiele-dev/parallel-audit/traumhaus-after-mobile.png`
