# Neon Flug v4 – Freeze / Übergabe an Parent und Claude Code

**Veröffentlichungsnachtrag Parent:** PR3217 gemergt (e023cc01f), Hauptseitenlauf43929567774 erfolgreich, vier Einrichtungs-/Secret-Schritte übersprungen. Sechs relevante CI-Prüfungen am Head4008cc562 und14/14 normale öffentliche HTTPS-Prüfungen bestanden. Belege `belege-v4/veroeffentlichung.json` und `belege-v4/produktion.json`. Die folgenden Agenten-/Freeze-Angaben beschreiben die Implementierungsübergabe vor dieser Veröffentlichung.

Stand 16.11.2026, Arbeitszweig `codex/neon-flug-ringe-belohnung`, Basis `c3088227d`, Worktree `/workspace/aban-neon-flug-belohnung`. Keine Commits, kein Staging, Push, Merge oder Deploy durch diesen Agenten. Parent übernimmt Review, gezieltes Staging, CI und Veröffentlichung. Vorschau läuft auf Port 8186. Keine weiteren Agenten gestartet.

## Implementiert

- Klassische Kampagne bleibt Standard; Neon-Schießen ist eine Moduswahl im selben Einstieg. Host bestimmt den Modus. Training nutzt die identischen Regeln ohne XP oder Kampagnenfreischaltung.
- Echte X/Y-Koordinaten: WASD/Pfeile und relativer Zwei-Achsen-Touchstick, normierte Diagonalen, Grenzen X ±9 / Y ±3, zweidimensionale Ring-/Hindernis-/Rettungsabstände, gleiche Gastvorhersage und Netzwerkinputs. Hoch ist kein Dash mehr. Beide Renderer projizieren dieselbe echte Höhe. Hochformat kann nach dem Drehhinweis ausdrücklich weitergespielt werden.
- `collected`-IDs entfernen normale, goldene und Koop-Doppelringe auf Host und Replica. Ein normaler Ring gehört dem nächsten lebenden Piloten, nie beiden. Doppelringe verschwinden gemeinsam, wenn beide Seiten belegt sind. Verpasste Ringe bleiben ungesammelt. Wiederholtes Crossing wertet nicht erneut.
- Zeitbasierte Bank-/Schub-/Traileffekte und kurze Sammel-/Trefferbursts. Limits: 96 Partikel, 24 Trailpunkte je Pilot, 24 Feedbackereignisse und 16 Projektile. Trails im 40-ms-Takt. Reduzierte Bewegung unterdrückt Zusatzbewegung und Sammelpartikel; 3D-Sparmodus behält die Dustsperre.
- Combo-/Wärmezeile im eigenen Bereich des Resonanzfelds, Punkte-/Sammelmeldungen und Ergebnis mit bester Kette, Abschüssen und XP-Aufschlüsselung. Bestehende XP-Module bleiben nutzbar.
- Neon-Schießen: 60 Sekunden, zwei Treffer je Drohne, F oder gehaltene Touch-Feuertaste, Cooldown/Überhitzen/Abkühlen, echte Swept-Projektilprüfung, gemeinsame Abschüsse und Abschluss. Bis 100 zusätzliche Drohnen-XP, kein Freischalten klassischer Kapitel.
- Jede Runde hat eine eindeutige `runId`, Profil speichert eingelöste Kennungen. Ergebnisreload und Wiederholung geben keine zweite Belohnung. Ergebnisse überstehen Reload im Session-Speicher; beim nächsten Kapitel wird der alte Ergebnisstand auf beiden Clients gelöscht.
- XP-Schreiben unter Web Locks; ein später Abschluss überschreibt weder neuen Run noch Rolle/Name. Lock-Ablehnung fällt auf idempotentes Speichern zurück. Bei Quota bleiben XP/Claims in RAM: Disk und RAM werden vor dem Award zusammengeführt. UI weist auf Sitzungsspeicherung hin. Quota-Fortschritt überlebt keinen Seitenreload.
- Protokoll, Räume und Discovery auf **v4** angehoben. `js/mp.js`, `scenery.mjs`, Bergflächen-/Welttexturcode und fremde Projekte unverändert. Für schmalere Ansichten wurden nur Bildausschnitt/Kameraversatz angepasst, um Gleiter an den Rändern vollständig zu halten.

## GEMESSENE Prüfungen

| Prüfung | Ergebnis |
|---|---:|
| Node: bestehende Simulation/Profile/Timing/Scenery plus neue Features | 66 / 66 |
| Neue Canvas-/Eingabe-/Koop-/XP-Prüfungen | 22 / 22 |
| Parent-Gegenproben: HUD, spät zurückkehrender Lock, Lock-Ablehnung, Quota | 11 / 11 |
| WebGL-Zustände, Projektionsgrenzen, Ringtypen, Drohnen/Projektile, Sparmodus | 18 / 18 |
| Bestehender Kampagnen-WebRTC-Test | 10 / 10 |
| Bestehende Suche/Ausrüstung | 12 / 12 |
| Bestehende UI-/Menü-A11y-Prüfungen | 9 / 9 |
| Bestehender Gameplay-/Rettungstest | 6 / 6 |
| Bergbild-Kontinuitätsprobe | 2 / 2 |
| HTML-Validierung, JS-Syntax, `git diff --check` | bestanden |

Zusammen **66 Node + 90 Browser-/Rendererprüfungen**. Vollständige lokale Repo-CI und Veröffentlichung sind nicht behauptet; diese übernimmt Parent. Rohwerte: `PRUEFUNG-v4.json`. Ausführbare Befehle und bestehende Kontextgrenzen stehen in `README.md`.

Konkrete Nachweise:

- Echte Pfeil-/WASD-Eingaben bewegen die Simulation vertikal/horizontal; Pfeil hoch löst keinen Dash aus. Touchbewegung und Touchfeuer kommen aus Chromes Touch-Protokoll, nicht aus direkt gesetzten Koordinaten.
- Canvas zeichnet nach Sammlung 0 statt 1/1/2 Ringhälften. Gemessene Bildänderungen: 3550 / 3552 / 7114 Pixel für normal / Bonus / Duett. Replica wird aus serialisiertem autoritativem Zustand erzeugt.
- Echter lokaler WebRTC zwischen zwei Chromium-Fenstern: Gast-W verändert Host-Y, Gastfeuer erzeugt Host-Projektile, Drohnenabschuss wird repliziert. Zwei Fenster verhindern Chromiums Hintergrund-Tab-Drosselung. Discovery verwendet BroadcastChannel. **Keine Transportattrappe.** Das gemeinsame Browserprofil testet auch die einmalige lokale Belohnung unter Web Locks.
- Kampagnen-/Matchfinale werden per ausdrücklich verfügbarem Debug-Zeitraffer erzeugt. Storage-Race und Quota verwenden markierte Ergebnisfixtures. Kein vollständiger manueller Durchspielnachweis, keine öffentliche Internet-/Zwei-Geräte-Freigabe.
- Quota-Gegenprobe: vorhandenes Diskprofil 110 XP bleibt lesbar, nur `setItem` wirft. Erstes neues Ergebnis + Wiederholung: RAM 220, Disk 110. Zweiter neuer Run: RAM 330 mit 3 Claims, Disk weiter 110. Kein doppelter Award/kein Verlust innerhalb der Sitzung.
- Höhen ±3 numerisch in beiden Renderern bei 960×540, 844×390 und 1280×800: vollständige projizierte Rumpf-/Ringgeometrie im Bild; unterster 3D-Ringpunkt −4,45 liegt oberhalb Wasser −4,6. Ein anfänglicher seitlicher Flügelbeschnitt bei 1280×800 wurde korrigiert und erfolgreich nachgeprüft.
- HUD und echte Touch-Feuertaste bei **390×844, 640×360, 960×540** ohne Überschneidung mit HP/Aktionsfeld. Die neuen 390-/640-Bilder wurden auch vom Parent angesehen.
- Bergbildwerte unverändert: maximale Abschnittsgrenz-Differenz **0,6117002322 RGB**, normale Bewegung **5,1806216521**. `scenery.mjs` unverändert.
- Canvas-Kurzproben 960×540: **45,07 und 41,54 rAF/s**, Median **16,7 ms**, P95 **33,4 ms**. Je ca.4,55 Sekunden Messdauer entsprechen **4,55 Sekunden Simulation**, Phase playing. Kurze lokale Cloud-Messungen, keine Hardware-FPS-Zusage. Keine neue WebGL-FPS-Behauptung.

## Bildbelege / Grenzen

Artefakte liegen in `/tmp/neon-flug-v4-qa/`. Die anfänglichen `bounds-3d-*.png` sind schwarze Capture-Artefakte und **keine Bildbelege**. Der gezielte Nachlauf `capture-webgl.cjs` sichert Canvasdaten unmittelbar nach Rendern im selben Evaluate-Task; zwei Randbilder und ein Drohnenbild wurden erzeugt und vom Agenten sowie Parent separat angesehen. Details des letzten Bildreviews stehen im Freeze-Nachtrag unten.

Gültige HUD-Bilder: `hud-390x844.png`, `hud-640x360.png`, `hud-960x540.png`. Weitere Belege: `koop-shoot.png`, `result-reload.png`, `bounds-2d--3.png`, `bounds-2d-3.png`. Das ältere `touch-shoot.png` zeigt noch die behobene HUD-Überlagerung und ist kein finaler UI-Beleg.

## Dateiliste für gezieltes Staging

Laufzeit/Seite:

- `js/neon-flug/core.mjs`, `profile.mjs`, `timing.mjs`, `directory.mjs`
- `js/neon-flug/flight.mjs`, `flight.css`, `motion.mjs` (neu)
- `js/neon-flug/fast-view.mjs`, `view.mjs`
- `neon-flug.html`

Tests/Belege/Dokumentation unter `spiele-dev/neon-flug/`:

- Neu: `features.test.mjs`, `features-browser.cjs`, `review-browser.cjs`, `bounds-webgl.cjs`, `capture-webgl.cjs`, `browser-window.cjs`
- Bestehend angepasst: `profile.test.mjs`, `browser-test.cjs`, `matchmaking-test.cjs`, `ui-test.cjs`, `gameplay-audit.cjs`, `scenery-browser-test.cjs`, `performance-sample.cjs`
- `README.md`, `WEITERARBEIT.md`, `PRUEFUNG-v4.json`, `FREEZE-v4.sha256`

`FREEZE-v4.sha256` umfasst ausschließlich die geänderten Laufzeit-, HTML- und Testdateien. Parent kann mit `sha256sum -c spiele-dev/neon-flug/FREEZE-v4.sha256` den Freeze prüfen. Keine Änderungen außerhalb des zugewiesenen Neon-Bereichs.

## Finaler Freeze-Nachtrag

Parent hat `webgl-height--3.png`, `webgl-height-3.png` und `webgl-drones.png` selbst angesehen und den Bildpunkt abgeschlossen. Agent ebenfalls: beide Höhenränder mit vollständigen Gleitern/Ring, unterer Ring über der Wasserfläche, Drohnen sichtbar. Der gezielte WebGL-Browser ist wieder geschlossen; LP kann die 3D-Ressource nutzen. Die drei korrekten Dateien ersetzen die schwarzen `bounds-3d`-Capture-Artefakte als Bildbeleg.

**FREEZE: keine weiteren Quelländerungen oder Tests nach dieser Übergabe.** Kein eigener bestätigter Defekt offen. Restgrenzen: lokale Cloud-Kurzproben; öffentliches Internet/Zwei-Geräte-Koop nicht erneut geprüft; Finale per Debug-Zeitraffer; keine WebGL-Performanceaussage; Quota-RAM-Fortschritt übersteht keinen Seitenreload. Vollständige CI, Staging und Publikation liegen beim Parent. Alle Dateien bleiben uncommitted.
