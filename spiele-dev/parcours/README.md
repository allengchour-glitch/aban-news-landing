# Jump · Lichtschienen

Eigenständige Traversal-Ergänzung in `neon-jump.html`: neun gekrümmte Lichtschienen
auf den drei vorhandenen Strecken. Im Sprung automatisch einrasten, bis zum Ende
gleiten und einen Team-Impuls sichern. Abspringen ist jederzeit möglich; danach
bleibt ein Luftsprung. Drei Impulse öffnen das Portal, das bei gemeinsamer Ankunft
in 0,85 Spielsekunden den Transfer abschliesst.

Impulse und Schienen-Checkpoints bleiben bei einem Sturz erhalten. `R` bzw.
„Checkpoint“ setzt alle lokalen Spieler ohne zusätzlichen Tod zurück. Normale
Checkpoints dürfen keine noch fehlende Pflichtschiene überspringen. Schalter,
Solo-Torhaltezeit, Koop-Druckplatten und die bisherigen Stationsmeldungen
(`stationDone` mit `coins*5+25`, `mini-back`) bleiben erhalten.

Dateien: HTML-Anbindung und Darstellung in `neon-jump.html`, reine Fahrlogik in
`js/parcours/lichtschienen.js`, zusätzliches Layout in `css/parcours.css`.
Keine neuen Assets oder Bibliotheken.

Prüfen ohne Browser/GPU:

```sh
node --test spiele-dev/parcours/*.test.cjs
```

GEMESSEN: 26 Tests bestanden. Reine Fahrlogik bei 30/60/120 FPS; echte HTML-Schleife
mit THREE-Geometrie und DOM/Renderer-Stubs für Landungen, alle neun ersprungenen
Einstiege bei 30/60 FPS, Abspringen, Doppelsprung, Pause, Retry, Team-Checkpoints,
Schalter, gesperrtes Portal, gemeinsames Finale und unverändertes Stationsprotokoll.

Browser nur nach GPU-Freigabe durch den Parent, vorhandenen Server verwenden:

```sh
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright \
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers \
node spiele-dev/parcours/browser-qa.cjs
```

GEMESSEN nach Freigabe: neun Browserprüfungen bestanden, keine JS-/Console-Fehler.
Unveränderte Seite mit echter Tastatureingabe: erste Schiene und Retry. Alle drei
Streckenfinale und Koop mit lokal injiziertem Test-Hook: Einstieg versetzt die
Figur an die Schiene, danach laufen tatsächliche Schienenfahrten und Portalprüfung;
der Hook setzt keine Impulse. Touch-Solo und iframe-Autostart/`mini-back` geprüft.
HTTP-Antworten behalten die tatsächlichen CSP-Header des Servers auf Port 8182.
Ein Browser, im `finally` geschlossen. Bilder/Protokoll unter `/tmp/aban-jump-qa/`.

Grenzen: Kein vollständiger menschlicher Durchlauf aller Zwischenplattformen.
Software-WebGL ist kein Leistungsnachweis für echte Mobilgeräte. Nach der
Bildprüfung wurden Startknöpfe vor die optionale Figurenwahl gerückt, die Kamera
beim Streckenstart ausgerichtet, der mobile Retry-Knopf vom Münzzähler nach unten
versetzt und die geschlossene Zielflagge gedimmt. GEMESSEN im abschließenden Parent-Lauf: dieselben neun Browserprüfungen am finalen
Stand grün; Menü, Schienen-/Portalbilder und Touch-Ansicht geöffnet und geprüft.
Belege im gemeinsamen Arcade-Prüfordner. CI, Commit und Veröffentlichung beim Parent.
