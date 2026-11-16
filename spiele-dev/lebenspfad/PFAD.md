# Lebenspfad: neuer Wegverlauf

Benutzerfolgeauftrag vom 16.11.2026: Auch den Pfad ändern und verbessern.
Ausgangspunkt ist die veröffentlichte Landschaft aus PR3185 / 4222ff1a3.

## Änderung

Der Weg führt durch acht zusammenhängende Kapitelbögen. Felder sind nach
Bogenlänge verteilt; vier Nebenrouten werden mit freiem Abstand zum Hauptweg
angeordnet. Ihre Ein- und Ausgänge bleiben dieselben logischen Felder.

Kleinere, flachere Steinfelder ersetzen die gedrängten hohen Scheiben.
Gerundete, eingefasste Verbindungen, Richtungspfeile und acht Kapitelmarken
machen den Verlauf lesbarer. Gabelschilder zeigen die tatsächliche Richtung
beider Wege. Stärkere Schrift und ein Abstand zum Pfosten halten sie lesbar.
Feldzeichen liegen als Einlagen auf dem Stein, damit sie die Figuren nicht verdecken.
Die mitlaufende Familie steht auch zwischen zwei Feldern auf der Wegoberfläche.

Die Umgebung folgt dem neuen Verlauf: 32 geplante Bauplätze mit ebenen
Geländeflächen für Gebäude, Requisiten, Winterfiguren und Gabelschilder.
PBR-Modelle werden vor ihrer Drehung um den Fußmittelpunkt normalisiert.
Bäume und neue Teiche berücksichtigen die Bauplätze. Eine im ersten Bilddurchgang
bestätigte Rutsche auf Nebenroute162 wurde versetzt.

175 Feld-IDs und Typen, 178 gerichtete Verbindungen, vier Gabelungen, Kurzmodus-
Sprünge35→72 /89→126, Wertung und Speicherformat bleiben erhalten. Vorhandene
Spielstände laden die Figur auf derselben Feld-ID im neuen Verlauf. Neue Module
und geänderte Landschaftsmodule tragen Inhalts-Hashes. Keine neue Bibliothek,
Asset-Anfrage, Konto-/Secret-Einrichtung oder Änderung des Netzwerkprotokolls.

## Messungen und Gegenproben

GEMESSEN an den tatsächlich erzeugten Three-r128-Feldgeometrien:

| Draufsicht-Geometrie | Vorher | Nachher |
| --- | ---: | ---: |
| Überlappende Sockelpaare | 104 | 0 |
| Ungewollte Kreuzung | 1 | 0 |
| Verbindung durch fremden Sockel | 17 | 0 |
| Kleinster Kantenabstand zwischen Sockeln | −2,963 | +0,259 |
| Reguläre Schrittlänge | 1,809–11,917 | 4,659–5,969 |

- 13 Geometrie-/Graphprüfungen bestanden. Alle16 Kombinationen der vier
  Abzweigungen erreichen das Ziel in Voll- und Kurzmodus; dies sind Graph-
  Traversierungen, keine32 separat gespielten Kampagnen. Die alte Originaldatei
  schlägt bei den drei Geometriebedingungen fehl; alte Radien/fehlendes neues
  Modul sind außerdem erwartete Unterschiede der Feature-Fixture.
- 13 Bauplatzprüfungen bestanden: echte Register, deterministische Platzierung,
  unveränderte Eingaben/Zufallsfolge, freie Felder und Verbindungen,160 Bodenproben
  an Bauplätzen und875 Proben an den tatsächlichen Feldbasen.
- Wegdarstellung:178 korrekte Verbindungen und3.213 Höhenabfragen gegen einen
  echten Three-Raycaster. Familien-Fixture bestätigt Partnerunterkante0,290
  auf dem Verbindungsweg statt Bodenhöhe0.
- 16 Kapitelansichten bei1280×800 /390×844 ohne Browserfehler. Transformierte
  undurchsichtige Vertices von22 geladenen Modellgruppen halten Felder und
  Verbindungen frei; kleinste konservative Abstände1,587 /2,564 Einheiten.
- Fünf Layoutgrößen erneut grün:25 erreichbare HUD-Mittelpunkte,15 freie
  Überlappungspaare und sieben Stand-/Gesten-Snapshots. Alle neuen Feldplattformen
  liegen auf derselben Höhe; die alte Höhenstaffelung ist dafür nicht nötig.
- Echter kurzer Solo-Lauf bis zum Lebensabend:18 Würfe, zwölf Entscheidungen,
  Save/Reload identisch, Abschluss genau einmal und neues Leben bedienbar.
  Keine Positions-, Würfel- oder Zustandsfixtures in dieser Kampagne.
- Zweiclient-Lockstep-Replay:16 Würfe, neun Entscheidungen, zwei Gabelungen.
  Alle26 Kontrollpunkt-Hashes, Vollzustände und31 Spiel-RNG-Aufrufe stimmen mit
  der vorherigen veröffentlichten Landschaft überein. End-Saat47926930.
  Geordnete Transportattrappen, kein echter Internet-/PeerJS-Verbindungstest.

Bilder und Daten: [belege-pfad](belege-pfad/). Die Kapitelaufnahmen verwenden
ausdrücklich Positions-/Kamerafixtures. Sie sind von der echten Solo-Kampagne
und vom Online-Replay getrennt.

## Zeichenaufwand

GEMESSEN in Chromium/SwiftShader bei1280×800, DPR1, Auto-Profil, Renderverhältnis
0,55 und Schatten aus, jeweils sechs Sekunden auf dem Startfeld:

| Messwert | Landschaft aus PR3185 | Neuer Pfad |
| --- | ---: | ---: |
| rAF/s | 12,09 | 19,54 |
| Median Frameabstand | 83,3 ms | 50,0 ms |
| 95. Perzentil | 100,1 ms | 66,7 ms |
| Zeichenaufrufe im letzten Bild | 243 | 138 |
| Dreiecke im letzten Bild | 47.231 | 24.216 |

Das vergleicht die gesamte Weg- und Umgebungsanordnung: Andere Abstände und
kleinere Felder verändern auch den sichtbaren Bildausschnitt. Keine isolierte
Batching-Beschleunigung, keine60FPS- oder physische Handy-Zusage. Neue Wege
enthalten insgesamt6.604 Dreiecke und sind räumlich in48er-Zellen aufgeteilt.

## Wiederholen / Bereitstellung

```sh
PORT=8150 node spiele-dev/neon-flug/server.cjs
node spiele-dev/lebenspfad/path-qa.cjs
node spiele-dev/lebenspfad/path-art-qa.cjs
node spiele-dev/lebenspfad/world-sites-qa.cjs
```

`LP_REPORT` wählt einen Berichtspfad; `LP_HTML` lädt bei der Graphprüfung eine
alte Originaldatei für die rote Gegenprobe. Weitere Browseraufrufe stehen in
VERBESSERUNGEN.md / LANDSCHAFT.md. Playwright und Chromium müssen installiert sein.

`ci_simulation.sh` wurde versucht, scheitert hier vor dem Start an
`mktemp -p "$HOME"` im schreibgeschützten `/home/agent`. Keine Umgehung.
Reale PR-CI, freigegebener Hauptseitenlauf und anschließender HTTPS-Vergleich
werden gesondert bestätigt. Öffentliche Browser-Aufrufe bleiben in dieser Cloud
durch deren Zertifikatsvertrauen blockiert; keine TLS-Ausnahme. Reale Handys,
Safari, NAT und Voice-Chat hier nicht geprüft. Kein Shop-/Social-Eingriff.
