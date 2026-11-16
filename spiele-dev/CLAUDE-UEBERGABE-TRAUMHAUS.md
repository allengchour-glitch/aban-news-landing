# Traumhaus – dauerhafte Übergabe an Claude Code

Stand: 16. November 2026, UTC. Diese Datei ist der Einstieg für die nächste Sitzung und wird nach abgeschlossenen Arbeitspaketen aktualisiert. Ein Eintrag hier ist keine Bestätigung, dass Claude Code ihn bereits gelesen hat.

## Aktueller Auftrag und Stand

Der Besitzer möchte Traumhaus als Hauptspiel weiter ausbauen: grosse zusammenhängende Stadt, gute Optik und Animationen, Rennstrecken, funktionierender ÖV, abwechslungsreiche Missionen und gute Handy-Steuerung. Er hat Änderungen an der gesamten Stadt sowie Veröffentlichung freigegeben und zuletzt fortlaufende Verbesserungen mit regelmässiger Sicherung für Claude Code verlangt. Recherche, Umsetzung und tatsächliche Spielprüfung gehören zum Auftrag. Neuester Besitzerauftrag: fertigstellen und anschliessend nur Verbesserungen für Claude Code sammeln. Google Drive dient zusätzlich als Ablage von Projektberichten und Nachweisen; die Spielstände werden dadurch nicht automatisch synchronisiert.

| Arbeitspaket | Nachgewiesener Stand |
| --- | --- |
| Nordstadt und Missionen | [PR #3209](https://github.com/allengchour-glitch/aban-news-landing/pull/3209), Main-Commit `c3088227d`; veröffentlicht und öffentlich geprüft. |
| Stadtbild | [PR #3211](https://github.com/allengchour-glitch/aban-news-landing/pull/3211), Branch `codex/traumhaus-stadtbild-20261116`, Head `dbb7ba3680829ae50f411927a8f38be37d0778fb`. Alle vier PR-Prüfungen bestanden; gemergt als `1667fc056033e756cf55a52574c35da0c10c8f72`. Produktionslauf `43919014522` erfolgreich; Spielseite und beide JS-Dateien frisch mit HTTP 200 und neuen Stadtbild-Markern geprüft. ZIP und Vergleichsbilder im bestehenden Drive-Projektordner rückgelesen. |
| Kamera und Leistung | PR #3212, Merge `ab10d8f15ba42728b40563d4a2a1d6d85cfbb97d`. Vier PR-Prüfungen grün; Produktionslauf `43922995107` erfolgreich; Spielseite und Sichtmodul frisch mit HTTP 200 und neuen Kamera-/Himmel-/Filtermarkern geprüft. Lokale Kamera-/Touch-/Himmel-/Filterprüfungen bestanden, ZIP in Drive rückgelesen. |
| Strassenabschluss | PR #3216 wurde nach vier grünen PR-Prüfungen als `79644bd63f9bfeb0a61dc9ad712d31cf4d9b110b` zusammengeführt. Produktionslauf `43930575747` erfolgreich; Spielseite und Stadtmodul frisch mit HTTP 200 und den neuen Strassen-/Pausenmarkern geprüft. [Prüfbericht](TRAUMHAUS-STRASSEN.md). Quelle/Testnachweise und Vergleichsbilder in Drive rückgelesen. Letzter Besitzerauftrag: fertigstellen, Memory teilen; weitere Verbesserungen nur für Claude Code dokumentieren. |

Vor Weiterarbeit diesen Stand frisch gegen `git status`, `origin/main`, offene PRs und deren Dateien prüfen. Andere Sitzungen arbeiten parallel im Repository. Keine fremden Änderungen überschreiben oder einen vorhandenen Zweig blind auf `origin/main` zurücksetzen.

## Spiel und relevante Dateien

- `traumhaus.html`: Haupteinstieg und Spielschleife; enthält Kamera, Steuerung, ÖV, Missionseinbindung, Menüs, Speichern/Laden, Licht und Wetter. Funktionsnamen suchen; Zeilennummern verschieben sich häufig.
- `js/traumhaus-stadt.js`: gemeinsamer Stadtbauplan, Strassen und Routing, Gebäude, Kamerakollision, Rundkurs, Fahrzeuge und animierte Passanten. `plan()` ist die Quelle für Geometrie und zugehörige Orte.
- `js/traumhaus-sicht.js`: gezielter Sichtfeldfilter für registrierte statische Instanzgruppen, nur im Hauptbild ohne Schattenkarte.
- `js/traumhaus-stadtbild.js`: neue Grün- und Sitzmodule, Platzierung mit Freiraumprüfung, Instancing und Entfernungsausblendung.
- `js/traumhaus-missionen.js`: reine Missionszustände und Übergänge, ohne DOM oder eigene Geldauszahlung. `js/traumhaus-missionen.css` und `js/traumhaus-stadt.css` enthalten die dazugehörige Oberfläche.
- [Strassenbericht](TRAUMHAUS-STRASSEN.md), [Missionen-Bericht](TRAUMHAUS-MISSIONEN.md), [Stadtbild-Bericht](TRAUMHAUS-STADTBILD.md) und [Stadtleben/Recherchen](TRAUMHAUS-STADTLEBEN.md): Funktionsumfang, Gestaltungsgrundlagen und Prüfungen.
- [Traumhaus-Runbook](RUNBOOK-TRAUMHAUS.md) und `spiele-dev/tools/`: bestehende Messwerkzeuge und bekannte Fallen. Alte Grössenangaben und Wiederherstellungsbefehle im Runbook nicht ungeprüft übernehmen; aktueller Arbeitsbaum und `AGENTS.md` haben Vorrang.

## Bestehende Spielregeln erhalten

QUELLE: veröffentlichter Missionsstand. Ost- und Nordstadt haben zusammen 148 Gebäude, davon 84 in der Nordstadt. Das ist nicht die Gebäudezahl der gesamten Spielwelt. Fünf ÖV-Linien bedienen 22 Haltestellen; der Shuttle N5 verbindet Forum, Depot und Nordpark. Depot, Garage, Technikpunkt, Nordpark, Haltestellen und ihre Zufahrten müssen erreichbar bleiben.

Die vier Missionen haben jeweils drei Etappen. SETZUNG der Spielbalance: Kurier 180, Wagenüberführung 240, Technikdienst 180, Stadtexpress 220 Spiel-Dollar. Auszahlung nur nach vollständigem Abschluss und einmal je Mission und Spielstand; Wiederholung zahlt null. Die freiwillige Zeitvorgabe beim Stadtexpress darf den Abschluss nicht verhindern.

Fahraktionen verlangen ein stehendes Fahrzeug; die Überführung verlangt den markierten Auftragswagen. Die Reparatur benötigt drei aktive Sekunden, pausiert in Menüs und wird durch Weggehen oder Einsteigen unterbrochen. Parallelaktionen dürfen das Missions-GPS oder die Auszahlung nicht unbemerkt überschreiben.

Im Koop führt der Gastgeber den Auftrag. Missionsdaten liegen unter `stats.stadtMissionen` und werden mit dem Geld über `snapshot()`/`loadSnapshot()` gespeichert. Gastaktionen dürfen keine eigene Auszahlung oder dauerhafte Zustandsänderung erzeugen. Beim Laden müssen Reparaturzustand und Fahrzeugzuordnung sauber zurückgesetzt werden.

## Nachweise für den Stadtbild-Head

GEMESSEN im vollständigen Regressionslauf:

- 39 neue Platzobjekte: 19 Bäume und 20 Bänke an 20 Orten. Alle acht berücksichtigten Nordhöfe ausserhalb der Missions- und Nordparkflächen sind geprüft.
- 3’613 Bus-Stichproben ohne neue Hindernisse; alle 22 Haltestellen frei. Strassen, Rennkurs, Gleisstreifen und feste Passantenwege ohne neue Hindernisse.
- GPS-Routen zu Depot, Garage, Technikpunkt und Nordpark vorhanden.
- Missionswagen mit unveränderter Fahrzeugphysik über 222,645 Meter und fünf Wegpunkte gefahren; Überführung abgeschlossen. Gas und Lenkung kamen von einem Testcontroller, ohne Teleports entlang der Strecke.
- Keine JavaScript-Fehler. Zwölf Missionsprüfungen und die Modul-/Innenhofprüfungen bestanden. Syntax und Diff-Prüfung sauber.

GEMESSEN im isolierten Stadtmodulvergleich bei gleicher Kamera: Zeichenaufrufe 61 → 60, Materialien 9 → 9, gesamte Modulgeometrie 42’676 → 47’792 Dreiecke. Dieser Vergleich umfasst weder das ganze Spiel noch die zusätzlichen Grünmodule. Die Gebäudezahl und Gebäudekollider blieben identisch. Altstadt, Nordstadt und Seepark sowie Regen bei Tag und Nacht wurden visuell verglichen.

Die Tests nutzen Chromium mit Software-WebGL. **60 FPS auf einem echten Handy sind nicht nachgewiesen.** Vom Gerät des Besitzers ist nur «Handy» bekannt. Simulierte Fahrzeugfahrten, Funktionsproben und isolierte Zeichenbudgets nicht als menschliche Handy-Spieltests darstellen. Die Kollisionskamera verkürzt den Blick an engen Hochhäusern weiterhin bei Bedarf; die anschliessenden Verbesserungen stehen im Kamera-Bericht.

## Aktuelle Kamera-/Renderprüfung

Siehe [Kamera und Leistung](TRAUMHAUS-KAMERA-LEISTUNG.md). Elf Belohnungsimpulse lassen die Benutzerwinkel unverändert; native Zwei-Finger-Geste gibt der manuellen Kamera sofort Vorrang. Himmelskuppel/Wolken/Sterne begleiten die Kamera bis in die Aussenstadt, auch beim Fotografieren. Zwölf Filtertests bestanden; zehn A/B-Ansichten pixelidentisch. Nordstadt151→74 Zeichenaufrufe/160’999→82’915 Dreiecke. Offene Leistungsgrenze: Egoansicht Seepark2’241 Zeichenaufrufe.

## Aktuelle Strassenprüfung

GEMESSEN: Vier Ringmündungen mit 180 Fahrbahn- und 56 Gehwegproben frei. Bahnhof: 104 Bodenproben, beide Spuren je 15,51 Meter bei 23 km/h ohne Stillstand. Strand: 560 Proben ohne Pflanzenfreigabe oder feste Blockade. Rennnaht 0,687 → 0 Meter, Randsteintreffer in Zufahrt 128 → 0. Bauplan und 148 Stadtmodul-Kollider identisch. Der geometrische Schnitt wird nur beim Bau ausgeführt; neun Geometriefälle, unabhängige 15’808 Punktproben und Originalcode-Gegentest bestanden. Vollwelt: 174 Aufrufe, neun veränderte Meshes, zusammen 9,9 Millisekunden auf der Test-CPU. Final 16’776 Strassenproben, 80 GPS-Routen, 3’613 ÖV-Spurproben und 22 Ausstiegspunkte frei. Alle fünf ÖV-Linien mit tatsächlichem Ein-/Mit-/Aussteigen geprüft. Rennen: zwei Runden, 16 Checkpoints und 1’339,7 Meter gefahren, keine Strafzeit. Vier Tierläufe über je 200 Sekunden und realer Koppelabgleich bestanden. Tages-, Nacht- und Regenbilder geprüft. Die letzte Nordring-Ortstafel steht jetzt neben der Bauernhoffahrbahn: alle 23 betroffenen Schilder/Haltestellen erhalten, Hüllen gegen 195 Asphaltpolygone und 407 Gebäudevolumen geprüft; im frischen Browserbild 1,93 Meter Abstand zur nächsten Viertelfahrbahn, keine Konflikte.

Zusätzlich behoben: Bei Ergebnisdialog, Stadtpanel, Karte oder Renncountdown löste künstliches Dauerbremsen den Rückwärtsgang aus. Expliziter Pausenzweig verhindert dies. Alle 16 Kombinationen aus vier Sperren und 30/60/120 Hz beziehungsweise einem 0,4-Sekunden-Schritt bleiben exakt stehen; normales Fahren, Bremsen und Rückwärtsfahren sind im Vorher-/Nachhervergleich unverändert.

Testfallen: Parkplatz wird verzögert gebaut, gemeinsame Zufahrtsdaten müssen davor verfügbar sein. Schnitthelfer darf eigene Mittelstriche nicht als Gehwegrand behandeln. Vor ÖV-/Rennprobe Missions-Ergebnisdialog schliessen; er pausiert absichtlich Aktionen. THREE-Sprite-Raycasts brauchen eine Kamera oder einen Meshfilter. Diese im Testlauf gefundenen Probleme nicht als offene Spielregressionen behandeln.

## Prüfungen fortsetzen

Die folgenden lokalen Artefakte waren bei dieser Übergabe vorhanden; `/tmp` ist flüchtig und keine dauerhafte Sicherung:

- `/tmp/th-stadtbild-budget.txt`: isolierter Vorher-/Nachhervergleich.
- `/tmp/th-stadtbild-regression-innenhof.log`: vollständiger Stadtbild-/ÖV-/Fahrtest.
- `/tmp/th-stadtbild-test.cjs` und `/tmp/th-mission-engine-test.cjs`: reine Modulprüfungen.
- `/tmp/th-spieltest/spiele-dev/tools/th-stadtbild-regression-endstand.mjs`: Browserprüfung mit Sonden.
- `/tmp/th-spieltest/spiele-dev/tools/th-lib.mjs`: an die aktuelle Umgebung angepasste Browserbasis.

Testserver ausschliesslich an `127.0.0.1` binden. Vor einer Browserprüfung die aktuelle Produktionsdatei gezielt in den Testordner kopieren; nicht versehentlich nur die Testkopie verbessern. Auf `window._ladeOffen === 0` und die danach abgeschlossene Platzierung warten. Sonden innerhalb der Spiel-IIFE einfügen. Keine kompletten THREE-Szenen oder Haltestellenobjekte serialisieren; nur benötigte primitive Werte ausgeben.

Bei Kamera- oder Geometrieänderungen jeweils freie Gegenprobe, Gebäudegrenze, Strasse, Gehweg, Fahrzeugfahrt und gleiche Vorher-/Nachheransicht prüfen. Handy-Menüs in kleinen Quer- und Hochformaten prüfen, einschliesslich tatsächlicher Trefferflächen. Nach erfolgreichen passenden Tests nicht beliebig weiter testen; neue Befunde oder Änderungen begründen zusätzliche Läufe.

## Sichern und veröffentlichen

1. Nach jedem abgeschlossenen Arbeitspaket diese Datei aktualisieren: Branch/Commit, geänderte Dateien, Ergebnis, konkrete Nachweise, offene Fehler und nächster Schritt. Bei CI- oder Live-Erfolg die Statuszeile oben ersetzen, statt widersprüchliche Stände anzuhängen.
2. Fertige, geprüfte Änderungen in einem eigenen Zweig committen und hochladen. Dateien einzeln stagen; niemals `git add .`, `git add -A` oder Force-Push. Keine privaten Drive-Links, Zugangsdaten oder Nutzerspielstände ins Repository schreiben.
3. PR zuerst als Entwurf erstellen. Relevante echte Prüfungen abwarten: Quality Check, Deploy Check, Voice Linter und Cloudflare Pages; vorhandene weitere Pflichtprüfungen beachten. Die drei laut `AGENTS.md` dauerhaft fehlschlagenden Workers-Builds sind bekannt und kein Grund für eine Spieländerung.
4. Nach grünen Prüfungen den erwarteten PR-Head zusammenführen. Anschliessend den Produktionslauf «Cloudflare Pages — Hauptseite (abannews) Direct-Upload» bis zum Ergebnis verfolgen. Eine grüne PR-Prüfung allein ist noch kein Live-Nachweis.
5. Spielseite und betroffene JS-/CSS-Dateien frisch öffentlich abrufen, neue Funktionen im ausgelieferten Inhalt prüfen und den Live-Commit hier festhalten. Danach Projektbericht/Testnachweise in der vorgesehenen Google-Drive-Ablage aktualisieren. Keine erledigte Sicherung behaupten, bevor sie bestätigt ist.

Repository-Regeln: `AGENTS.md` lesen, keine Änderungen an fremden Projekten. Änderungen an Tests oder Workflows erfordern laut `AGENTS.md` zusätzlich `bash automation/ci_simulation.sh`. Laufende Testprozesse nur gezielt über ihre eigenen Prozesskennungen beenden; kein `pkill -f` oder `killall`.

## Higgsfield – aktueller Auftrag

Der Besitzer hat Higgsfield ausdrücklich einbezogen. Erste Generierung: Modell `tripo_3d`, Parkuhr als kleiner Orientierungspunkt, Zielbudget 1’500 Flächen, Textur standard, PBR aus. Kostenvoranschlag 5 Credits; Auftrag `6f107f39-ce69-42da-8c11-40a497a69890` wurde angenommen, ist jedoch mit Status `failed` beendet. Kein GLB erhalten; Kostenabrechnung beziehungsweise Rückerstattung nicht bestätigt. Nicht erneut absenden. Die leichte Nordpark-Grafik für eine Stadttafel wurde gestartet unter Auftrag `7c02cc48-8fe3-417e-8b68-6a698e6a21cf`, Modell `gpt_image_2_6`, Kostenschätzung 0,5 Credits. Auch dieser Auftrag ist mit Status `failed` beendet. Kein Bild erhalten, keine konkretere Ursache vom Dienst. Keine weiteren Generierungen gestartet und keine Erstattung behauptet. Beide Aufträge vor jedem weiteren Generierungsversuch im Higgsfield-Konto prüfen. Es wurde kein Higgsfield-Asset ins Spiel eingebaut.

## Nächste Arbeit durch Claude Code

Letzter Besitzerauftrag: dieses Paket fertigstellen; anschliessend nur weitere Verbesserungen suchen und für Claude Code dokumentieren. Keine weitere Umsetzung neuer Vorschläge in dieser Sitzung. Die priorisierte, noch nicht umgesetzte Liste steht in [Nächste Schritte](TRAUMHAUS-CLAUDE-NAECHSTE-SCHRITTE.md). Der Traumhaus-Verweis im gemeinsamen `SHARED-MEMORY.md` und der eigene Abschnitt in `docs/CODEX-CLAUDE-UEBERGABE.md` führen zu dieser Datei. Nach abgeschlossenen Paketen und erfolgreicher Veröffentlichung aktualisieren.

## Zurückgestellte, belegte Kandidaten

- Egoansicht Seepark: Profillauf2’293 Aufrufe vollständig zugeordnet. Frachtschiff `th15_frachtschiff.glb` allein424 Aufrufe bei18Materialien, Landbus `th40_bus.glb`176. Bündelung ist noch nicht bildlich gegengeprüft, daher nicht umgesetzt.
- Einstieg erklärt die Bauabnahme als einziges Ziel, obwohl Stadtmissionen vorhanden sind. Pokalmenü könnte einen sichtbaren Spielen-Hinweis erhalten.
- Rennknopf sagt aus der Ferne Rennen starten, setzt tatsächlich nurGPS. SituationsabhängigeBeschriftung wäre klarer.
- Higgsfield lieferte in beiden dokumentierten Aufträgen keinen fertigen Asset. Kein Modell oder Bild als fertig melden.
