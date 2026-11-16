# Mix Arena: ein vollständiger Minispiele-Abend

Besitzerauftrag vom16.11.2026: «Ein Rundenspiel – mehrere Minispiele nacheinander», danach «verbessere mehr alles wie ein komplettes spiel». Die gemeinsame Arena unter `/minispiele/` verbindet die20 Disziplinen mit eigenen Figuren, Einführung, Rundenkarte, Gesamtwertung, Fortschritt und Revanche. Zwei Personen spielen an einem Gerät. Die einzelne Trainingshalle bleibt aufklappbar; die Arcade behält vier sichtbare Hauptkarten.

## Spielablauf

1. Namen, Figuren und3/5/7 Runden wählen. Die ersten drei Disziplinen enthalten Kopf, Tempo und Geschick; keine Disziplin kommt im selben Match doppelt vor.
2. Vor jeder Disziplin stehen Ziel, zwei konkrete Tipps und die tatsächlichen P1/P2-Steuerungen. Die Figuren-/Namenkarten bleiben eindeutig, auch wenn Farben oder Seiten innerhalb der ursprünglichen Spiele wechseln.
3. Ein gemeinsamer Countdown führt direkt in das Originalspiel. Sichere Namenslabels verwenden ausschließlich Text; vorhandene Startknöpfe werden einmal betätigt. Nur ein iframe läuft gleichzeitig.
4. Sieg gibt3 Punkte, Remis je1 Punkt. Abgeschlossene Originalspiele melden ihre echten Ergebnisse; passende Quelle, Ursprung, Rundenschlüssel und Disziplin sind erforderlich. Doppelte oder alte Meldungen werden verworfen.
5. Finale mit Pokal/Gleichstand, Aufstellung aller Rundenergebnisse und Arena-XP. Revanche behält Namen, Figuren und Disziplinreihenfolge, setzt die Punkte zurück und erhält eine neue Match-ID.

## Unterbrechen und Wiederherstellen

Die gemeinsame Speicherung `aban_mix_arena_v2` enthält Partie, Geräteprofil und Einstellungen in einem Schreibvorgang. Der bisherige Schlüssel `aban_mini_mix_v1` bleibt erhalten und wird beim ersten Start migriert. Eine laufende Runde beginnt nach Neuladen ungewertet von vorn; fertige Ergebnisse bleiben erhalten.

Unterbrechen oder ein verborgener Tab entfernen die laufende Disziplin. Das ist ein Neustart der aktuellen Runde, keine Simulation einer angehaltenen Spieluhr. Nur die ausdrücklich gewählte Aktion «Runde auslassen» schreibt einen Abschluss ohne Punkte. Ladefehler bieten Wiederholen und Rückkehr. Bei gesperrtem Speicher läuft das Match im Arbeitsspeicher weiter und meldet die fehlende Sicherung.

## Arena-Pass und Klänge

- 20 XP pro gewerteter Runde, zusätzlich40 XP für ein Match ohne Auslassen. Alle100 XP steigt das gemeinsame Geräteprofil ein Level auf.
- Vier Grundfiguren; Eule abLevel3 und Drache abLevel5. Freischaltungen sind kosmetisch.
- Vier Erfolge: erstes vollständiges Match, zehn verschiedene Disziplinen, sieben Runden ohne Auslassen und höchstens ein Punkt Abstand im Finale.
- Ein Match wird einmal abgerechnet; die jüngsten100 Match-IDs werden zur Wiederholungsabwehr gehalten. Keine serverseitig gesicherten Konten oder manipulationssichere Rangliste behauptet.
- Kurze synthetische Spielklänge sind abschaltbar und zunächst aus. Auch die vorhandenen Simon-Töne folgen im Mix dem Schalter; Einzelspiel/Lebenspfad bleiben unverändert. Kein Musikdownload und keine neuen Hintergrund-Audioschleifen.

## Gestaltung und Einbettung

Eigene leichte SVG-Arena statt großer Hintergrundvideos. Gemeinsame dunkle Rahmen, ausreichend große Bedienelemente, Figurenwahl und ruhige Übergänge; reduzierte Bewegung wird respektiert. Bilder und Systemschriften benötigen keine externen Dienste.

Die eingebettete Ergebnisbrücke bleibt außerhalb gültiger Mix-Runden vollständig DOM-passiv. Originalfarben und Spiellogik bleiben erhalten. Der doppelte Zurückknopf ist nur verborgen, wenn die Shell selbst Unterbrechen anbietet; bei kurzem Querformat bleibt der echte Kind-Rückweg sichtbar. Doppelte Fußlinks entfallen im iframe, sie stehen im Arenamenü. Freistehende Hinweise haben auf dem dunklen Rahmen hellen Kontrast.

Die visuelle Prüfung zeigte zunächst abgeschnittene Brett-/Aktionsflächen bei640×360. Das eigene [Querformat-Stylesheet](../../css/minispiele-mix-landscape.css) ordnet neun Disziplinen gezielt nebeneinander an. Canvas-Größen bleiben an die Original-Resize-Handler gekoppelt. Details und gemessene Grenzen in [landscape-notes.md](landscape-notes.md).

## Reproduzieren und Nachweise

```bash
node --test spiele-dev/minispiele-mix/*.test.cjs spiele-dev/minispiele-identitaet/mechanik.test.cjs spiele-dev/arcade-einzigartig/inventar-test.cjs
PORT=8184 node spiele-dev/neon-flug/server.cjs
node spiele-dev/minispiele-mix/arena-browser.cjs
node spiele-dev/minispiele-mix/embedded-browser.cjs
node spiele-dev/minispiele-mix/recovery-browser.cjs
MIX_PREFLIGHT=1 RELEASE_COMMIT=local python3 spiele-dev/minispiele-mix/https-qa.py
# Nach erfolgreichem Hauptseiten-Deploy:
RELEASE_COMMIT=<Deploy-Commit> python3 spiele-dev/minispiele-mix/https-qa.py
```

`PLAYWRIGHT_MODULE`, `MIX_BASE` und `MIX_OUT` erlauben vorhandene Playwright-Installationen, andere Previewports und getrennte Belegordner. `browser.cjs` bleibt als Einstieg zur neuen vollständigen Arena-Prüfung erhalten.

GEMESSEN am abschließenden Stand mit Inhaltsversionen:194/194 Node-Prüfungen,24/24 Arena-Browserbedingungen,139/139 Einbettungsbedingungen,7/7 Wiederherstellungsbedingungen und17/17 Arcade-Bedingungen grün. Der Durchlauf spielt Drei gewinnt, Tipp-Duell und Schalt-Rennen tatsächlich bis zum6:3-Finale. Nur die Reihenfolge ist als Speicher-Fixture vorgegeben; zwei Zeitspiele verwenden kontrollierte Browserzeit. Die20 Einbettungen prüfen Laden, echte Rückkehr und Überlauf in zwei Touchformaten, zusätzlich neun kurze Querlayouts mit echten Randfeld-/Touch-Aktionen; sie ersetzen keine20 vollständigen Partien. Netzwerk404 im Wiederherstellungstest ist gezielt erzeugt, danach wird die echte Seite gespielt. Tonprobe: Haupt- und Simon-Audiokontext laufen bei aktivem Klang; Stummschalten setzt den aktiven Kindschalter zurück. Das ist kein Hörqualitätsnachweis.

HTML- und Diffprüfungen sind sauber. Die verlangte lokale Gesamt-CI-Simulation stoppt am schreibgeschützten `/home/agent`. Echte CI, Bereitstellung und öffentliche Quellenprüfung stehen im zugehörigen PR und im fortlaufenden [Claude-Arbeitsstand](WEITERARBEIT.md). Historische Belege des ersten Minispiele-Mix bleiben unter `belege/`; neue Arena-Belege stehen unter `belege-arena/`.

Der öffentliche Quellenprüfer baut22 HTML-Seiten mit dem echten Seiten-Injektor und prüft Seiten/Aliasse, bytegleiche Assets, Skriptreihenfolge, Styles und Sicherheitsheader über normale TLS-Verbindungen. Keine TLS-Ausnahme. Kein physischer Handy-FPS-, Safari- oder Internet-Koop-Nachweis; dies ist ein lokales Zwei-Personen-Spiel.
