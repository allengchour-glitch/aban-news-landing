# Lebenspfad: neue niedliche Figur – Implementierung abgeschlossen

Besitzerwahl: **kleine niedliche Figur, großer Kopf, kompakter Körper, verspielt**. Auftrag «mach die2 fertig», danach «teile dann memory», zuletzt «token sparen». Keine weiteren Erweiterungen. Parent übernimmt Veröffentlichung/Memory; aktueller Gesamtstand in `../CLAUDE-SPIELE-AKTUELL.md`. PR3218.

## Ergebnis

Eigene native Geometrie in `js/lebenspfad/character-art.js`: modellierter Kopf, integrierte Nase und Wangenfarbe, große Augen, Haare/Accessoires, passende Kleidung und Sneaker. Saubere Taillen-/Haarübergänge und geglättete Vordernaht. Materialbündelung erhält bewegliche Rig-Teile. Familie verwendet denselben Hersteller, feste Varianten ohne Spielzufallswerte und korrekte Sohlenhöhe. Vorhandene Farbwahlen, vier Alter, Blinzeln/Gang, Speichern und Koop-Looks bleiben erhalten. Neun Spezial-GLBs unverändert wählbar. Keine zusätzlichen Downloads für native Figuren; kein Higgsfield-Anschluss genutzt.

## GEMESSENE Prüfung

- `figur-neu-qa.cjs`:71/71 Browserbedingungen grün.25 Varianten jeweils Desktop/Mobil, vier Alter, Rig/Blinzeln/Gang, Familie, Save/Reload, deterministische Koop-Looks. Keine JS-/Shaderfehler. `belege-figur-neu/pruefung/ergebnis.json`.
- `charakter-glb-qa.cjs`:9/9 echte GLB-Vorschauen sichtbar und vollständig eingerahmt. `belege-figur-neu/glb/ergebnis.json`.
- `layout-qa.cjs`: fünf Layoutgrößen und sieben Stand-/Emotefixtures grün. Messung nutzt tatsächliche Rig-Beinunterkanten statt alter SphereGeometry-Form. Leere Füße bleiben rot; Grenzwert unverändert. `belege-figur-neu/stand-layout/results.json`.
- `familie-qa.cjs`: vier Familienstandfälle und Verbindungsweg bestanden. `belege-figur-neu/familienstand/ergebnis.json`.
- `lockstep-qa.cjs`:26 Kontrollpunkte, kompletter Endzustand und31 RNG-Aufrufe identisch zur Atmosphäreversion; Parent separat verglichen. `belege-figur-neu/{lockstep,replay-vergleich}.json`.
- Reproduzierter Streifen-NaN durch doppelte Profilhöhe korrigiert; negative Probe in `gegenprobe-streifen-nan.json`. Veraltete Standsonde separat als `gegenprobe-alte-standsonde.json` erhalten.
- Parent und Agent haben finale Portraits/Profil,25 Varianten, Altersbogen, Familie und Spielkamera tatsächlich angesehen. Endbilder in `final/` und `pruefung/`, historische Bilder in `vorher/` und `entwurf1/`.
- Defaultfigur Desktop ohne Brett/Schatten:32 statt60 Zeichenaufrufe,13.380 statt10.316 Dreiecke.25 Varianten29–33 Calls und11.256–16.232 Dreiecke. Keine FPS-/physische Handy-Zusage.

Lokale Gesamt-CI startet wegen read-only HOME nicht (`ci-simulation-final.txt`). Syntax und Diff sauber; direkte HTML-Validierung unverändert fünf alte Fehler/37 Warnungen. Echte PR-CI/Deploy/öffentlicher TLS-Quellenabgleich werden durch Parent separat belegt. Netz-Looks/Replay sind Fixtures, kein öffentlicher Internet-/NAT-Test.

## Reproduktion und Freeze

Browserwerkzeuge lokal: `PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright`, Chromium unter `/tmp/aban-browsers/`. Preview `LP_BASE=http://127.0.0.1:8187`; Ergebnisverzeichnis über `LP_OUT`. Diese temporären Pfade bei einer neuen Sitzung frisch prüfen. Bestehende Testdateien und Rohberichte enthalten den genauen Umfang.

`FREEZE-FIGUR.sha256` sichert Laufzeit und neue/geänderte Tests. Die historische `figur-neu-runtime.patch` ist schon integriert und darf nicht erneut angewandt werden. Keine weiteren Quelländerungen nach Freeze. Traumhaus-Arbeit unverändert übernommen; kein Shop-/Social-/Konto-/Secret-Eingriff. Neonv4 ist bereits live und14/14 öffentlich geprüft.
