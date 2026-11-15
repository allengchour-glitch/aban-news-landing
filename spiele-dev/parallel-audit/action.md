# Action-Spiele: begrenzte erste Reparaturrunde

Stand: 15.11.2026. Arbeitsbaum `/tmp/aban-neon-coop`, bestehender Zweig `codex/neon-flug-koop`. Keine Commits, kein Push, kein Merge. Fremde Änderungen unverändert gelassen.

## Alle sieben Adressen eingeordnet

| Adresse | Tatsächlicher Inhalt | Änderung |
| --- | --- | --- |
| `neon-abyss.html` | Alte Weiterleitung zur Wildnis, kein eigenes Spiel | Titel/Beschreibung/Zieltext nennen jetzt das tatsächliche Ziel Neon Wildnis; unbelegte Detailversprechen entfernt. |
| `neon-colossus.html` | Alte Weiterleitung zur Wildnis, kein eigenes Spiel | Gleiche Korrektur. |
| `neon-duo.html` | Alte Weiterleitung zur Wildnis, kein eigenes Spiel | Gleiche Korrektur; keine neue Koop-Funktion. |
| `neon-dungeon.html?station=1` | Aktives 3D-Parcours-/Boss-Spiel | Zeitbasierter Kristallregen, nichtnegatives dt, Solo-Pause mit Button/Esc/P, Eingaben löschen, scrollbares Startmenü, Raumfeld-Tasten abfangen, Anleitung ohne Waffenknopf-Überdeckung auf kleinen Hochformaten. |
| `neon-jump.html?station=1` | Aktiver Platformer; lokaler Tastatur-Koop, mobil Solo | Pause mit Button/Esc/P und Fokusverlust; Eingaben löschen; Plattformphase aus Spielzeit; Kamera/Shake zeitbasiert glätten; HUD hält Platz für Pause frei. |
| `neon-racer.html?station=1` | Aktives Solo-Rennspiel | Kurvenversatz aus tatsächlich gefahrener Strecke, zeitbasierte Lenk-/Kamera-Glättung, Pause mit Button/Esc/P und Fokusverlust, Eingaben löschen, scrollbares Startmenü. |
| `neon-survivor.html?station=1` | Aktives Survival-Spiel, KI-/Online-Pfade vorhanden | Fokusverlust löscht Eingaben; Solo/KI pausiert. Pause ignoriert Tastenwiederholung und offene Bau-/Struktur-/Upgrade-Menüs; Musik folgt Pausenzustand; nichtnegatives dt. |

## Bestätigte Reproduktion vorher → nachher

Die Vorher-Dateien liegen sitzungslokal unter `/tmp/action-before/`. Zustandsproben laufen in Chromium mit kontrollierten rAF-Zeitpunkten. Nur diese Mechanikproben deaktivieren das Zeichnen; die zusätzlichen Render-Prüfungen laden unveränderte Spielantworten und zeichnen tatsächlich.

- **Racer, eine Sekunde ohne Lenken:** GEMESSEN bei 30/60/120 FPS: vorher seitlicher Abstand zur Kurvenmitte −2,038 / +2,096 / +7,000 Einheiten (bei 120 FPS schon am Rand). Nachher jeweils 0. Der Beschleunigungsintegrator hat weiterhin kleine normale Diskretisierungsunterschiede: Strecke 44,868 / 44,818 / 44,793.
- **Dungeon, Regenkristall von Höhe 20, nach 0,5 s:** GEMESSEN bei 30/60/120 FPS vorher Höhe 17,6 / 10,7 / 0,3; nachher jeweils 11,0. Beschleunigung und Rotation verwenden Sekunden.
- **Jump/Racer/Survivor, D halten und Fensterfokus verlieren:** vorher blieb der Rechts-Zustand gesetzt. Nachher werden die Zustände gelöscht und Solo pausiert. Dungeon löschte bereits Bewegungsinput, räumt jetzt auch Sprungpuffer/-halten ab.
- **Jump/Racer/Dungeon, Escape:** vorher lief Zeit/Strecke weiter. Nachher stoppt sie, Escape setzt fort; wiederholtes Keydown setzt Pause nicht fort. Jump-Plattformen bleiben während Pause unverändert.
- **Survivor, Escape-Keydown mit `repeat:true`:** vorher änderte sich Pause erneut. Nachher bleibt Pause bestehen.
- **Survivor, Baumenü öffnen und Pause-Button auslösen:** vorher `buildMenuOpen=true, paused=false`; nachher bleibt `paused=true`. Musik hält bei manueller Pause und im Baumenü an.
- **Dungeon, geöffnetes Raumcode-Feld fokussieren und Leertaste:** vorher startete der globale Handler das Spiel. Nachher bleibt die Eingabe im Feld.
- **Dungeon, 360×540:** echter Screenshot zeigte die Anleitung über dem Waffenknopf. Begrenzte Hochformatregel verschiebt sie darüber; rechteckige Überdeckung wird automatisch geprüft.
- **Abyss/Colossus/Duo:** vorher nannte der Text Survivor, obwohl Link und Timer zur Wildnis führten. Nachher stimmen Name, Link und tatsächliche automatische Weiterleitung überein.

## Gezielte QA

`spiele-dev/parallel-audit/action-qa.cjs` hat reproduzierbare Assertions, Exitcode 1 bei Fehlern und `finally` zum Schließen jedes eigenen Browsercontexts sowie des Browsers. `ACTION_BASE_URL` ist konfigurierbar; Vorgabe ist die finale Header-Vorschau `http://127.0.0.1:8112`. Keine TLS-Ausnahmen, kein `bypassCSP`, kein Entfernen von Headern.

```sh
ACTION_BASE_URL=http://127.0.0.1:8112 PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/parallel-audit/action-qa.cjs
```

Erfasst werden Mechanik, Fokusverlust, Pause/Fortsetzen, Wiederholung, Survivor-Menüschutz/Musik, echte mobile Render-Screenshots bei 360×540, sichtbare Menüanfänge, tatsächlich anklickbare Pause-Knöpfe, JS-Ausnahmen **und** Console-/CSP-/Netzfehler sowie die drei echten Weiterleitungen. Maximale Browseransicht 960×540. Screenshots/JSON liegen außerhalb des Repos unter `/tmp/action-qa-final/`.

Vorher-Gegenprobe mit demselben Assertions-Skript: GEMESSEN 31 Mechanikprüfungen, 24 Fehler, Exitcode 1 (`ACTION_SOURCE_ROOT=/tmp/action-before ACTION_MECHANICS_ONLY=1 ACTION_BASE_URL=http://127.0.0.1:8100`), darunter Raum-Eingabe, Kurvendrift, Regen, Fokusverlust und Pause. Die Baseline-Kopien sind nur sitzungslokal.

Finaler Lauf gegen **8112: GEMESSEN 53 Prüfungen, 0 Fehler, Exitcode 0**. Die vier echten Render-/CSP-/Netz-Smokes meldeten jeweils leere Fehlerlisten. Screenshots nach der letzten Änderung erneut geprüft, Dungeon-Anleitung liegt jetzt über dem Waffenknopf.

Zusätzlich: `node --check spiele-dev/parallel-audit/action-qa.cjs` und `git diff --check` nur für eigene Dateien. Die Screenshots aller vier aktiven Spiele wurden visuell angesehen; keine pauschale Fertigmeldung für die Spiele.

## Offene Grenzen und Übergabe

- `_headers` gehört dem Parent. Die alte Vorschau auf 8100 lieferte `frame-ancestors 'none'`/`X-Frame-Options: DENY` für Dungeon. Keine lokale Umgehung. Finale Tests nutzen 8112; die eigenständige Stations-/Blob-Bild-/Mikrofon-Integration prüft der Parent.
- Kein echter Zwei-Geräte-WebRTC-Test. Dungeon-Online hat bewusst **keine gemeinsame Pause**; der Knopf sagt das ausdrücklich, statt nur das lokale Bild einzufrieren. Survivor-Client bleibt für manuelle Pause gesperrt; Fokusverlust löscht online nur Eingaben. Lokaler Jump-Koop wurde nicht vollständig bis zum Ziel durchgespielt.
- Die allgemeine Shop-CI-Simulation wurde nicht ausgeführt: sie prüft laut Skript ausschließlich eingechecktes HEAD und verlangt vorheriges Committen; hier sind Commits ausdrücklich untersagt. Die neue Spiel-QA wurde direkt im Arbeitsbaum ausgeführt.
- Keine kompletten Kampagnen, Boss-Enden oder langen Schwierigkeitstests; keine Aussage über alle Geräte oder Bildwiederholraten. Keine neue Koop-Engine, keine bezahlten Assets/Dienste, keine Änderungen an `js/mp.js`, `js/arcade.js`, `js/vendor`.
- Bestehende zufällige Upgrade-Auswahl in Survivor nutzt weiterhin `sort(rnd()-0.5)`; ungleichmäßige Angebote sind ein offener separater Punkt, hier nicht umgebaut.

## Bestätigter Racer-HUD-Nachtrag (Review)

Nur `neon-racer.html`, die bestehende QA und dieser Bericht wurden für den Nachtrag geändert. Die rechte Symbolspalte ist jetzt im HUD-Raster fest reserviert; auf 320/360 px stehen Tempo/Münzen nebeneinander, die Distanz-/Rekordkarte darunter. Lange Zahlen dürfen umbrechen. Der Schild steht im selben Raster und wandert bei höheren Karten mit. Im echten Stations-Iframe bleibt Pause unter Mute, statt denselben Platz einzunehmen. Das Münzfeedback hellt die Karte kurz auf, statt sie über Nachbarkarten zu skalieren.

**Reproduktion vor der Korrektur:** GEMESSEN mit 15-stelligen Münz-/Distanz-/Rekordwerten bei 360 und 320 px: Münzkarte x=120,25…366,16, Rekordkarte x=374,16…594,20. Die Münzkarte überdeckte Mute; beide Karten ragten rechts aus dem Bild. Messdaten: `/tmp/action-racer-hud-before.json`, Ausgangsdatei: `/tmp/action-racer-hud-before.html`. Zusätzlich lag der sichtbare Review-Befund der normalen 360px-Ansicht vor.

**Nachher:** GEMESSEN bei 320 px enden die Karten bei x=254, Mute beginnt bei x=264 (10 px Abstand); bei 360 px sind es x=294 und x=304. Alle Paarungen aus Tempo, Münzen, Rekord, Mute, Schild, Pause und — im Iframe — Wildnis-Rückkehr wurden auf Überdeckung geprüft. Zusätzlich müssen alle Rechtecke vollständig im Viewport bleiben und ohne horizontales Text-Overflow auskommen. Kleine und 15-stellige Zahlen werden an beiden Breiten, direkt sowie im echten Stations-Iframe geprüft; ein großer gespeicherter Rekord wird vor dem Laden in localStorage gesetzt und seine Anzeige bestätigt. Die aufgeprägten Stresszahlen sind Testdaten, keine erspielten Rekorde.

**Erneuter vollständiger QA-Lauf auf 8112: GEMESSEN 71 Prüfungen, 0 Fehler, Exitcode 0** (bisherige 53 plus 18 HUD-Prüfungen). `node --check` und `git diff --check` ebenfalls grün. Der Browser wurde über `finally` geschlossen. Frische Screenshots: `/tmp/action-qa-final/racer-mobile.png` sowie `racer-hud-direct-320.png`, `racer-hud-direct-360.png`, `racer-hud-station-320.png`, `racer-hud-station-360.png` im selben Verzeichnis. Normale mobile Ansicht und die 320px-Stressansichten direkt/im Iframe visuell geprüft: keine HUD-/Symbol-/Schild-Überdeckung.

## Bestätigter Racer-Straßen-Nachtrag (Review)

Der sichtbare flache Straßenabschluss wurde am echten Straßenpool bestätigt. GEMESSEN vor der Korrektur: hintere Straßenkante bei Distanz 0/5/10/250/1000 jeweils z=2,5, während die Kamera bei z=11 steht; direkt vor einem Segmentwechsel höchstens z≈7,5. Damit fehlte Fahrbahn unter dem unteren Kameraausschnitt. Die gleiche QA mit `/tmp/action-road-before` als Quelle meldete 34 Mechanikprüfungen, zwei Fehler, Exitcode 1: rückwärtige Abdeckung und an absoluten Streckenabschnitten verankerte Mittellinien. Die Kurvendriftprüfung bestand bereits dort.

Begrenzte Korrektur nur am Pool: vier zusätzliche 5m-Abschnitte hinter Spieler/Kamera, unverändert 50 Abschnitte nach vorn. Fahrbahn, Randsteine, Schulterstreifen und Kanten nutzen denselben absoluten Segmentindex; auch die Mittellinien folgen diesem Index statt dem wechselnden Poolplatz. Kein Umbau von Kamera, Steuerung oder Landschaft.

GEMESSEN nachher: hintere Kante mindestens z=22,5 und damit 11,5m hinter der Kamera. Neue Assertions prüfen Abdeckung bei Distanz 0, 4,999, 5, 9,999, 10, 10,001, 249,999, 250 und 1000, lückenlose 5m-Folge, gemeinsame Kurvenpositionen aller acht Mesh-Reihen, erhaltene Vorwärtssicht sowie stabile Mittellinien. Die bestehenden 30/60/120-FPS-Kurvendriftprüfungen bleiben grün. Der frische echte Screenshot `/tmp/action-qa-final/racer-mobile.png` (14m) wurde angesehen: Asphalt und Schulterstreifen reichen bis über den unteren Bildrand; der schwarze/violette Abbruch ist weg.

Letzter vollständiger QA-Lauf auf **8112: GEMESSEN 74 Prüfungen, 0 Fehler, Exitcode 0**. Alle bisherigen Mechanik-/HUD-/Renderprüfungen plus drei Straßenprüfungen bestanden; `node --check` und `git diff --check` ebenfalls grün. Eigene Browser vollständig geschlossen.

## Eigene geänderte Pfade

`neon-abyss.html`, `neon-colossus.html`, `neon-dungeon.html`, `neon-duo.html`, `neon-jump.html`, `neon-racer.html`, `neon-survivor.html`, `spiele-dev/parallel-audit/action-qa.cjs`, `spiele-dev/parallel-audit/action.md`.
