# Tempel der Zwei – nächste Iteration

Stand: 16.11.2026. Umsetzung nur in `/tmp/aban-tempel-next`, Branch `codex/tempel-zwei-politur`, Ausgangspunkt `9dc1306ad`. Kein Commit, Push, Rebase oder Deployment durch diesen Worker. Parent integriert nach dem aktuellen Release.

## Umsetzung

Produktiv geändert: **nur `neon-zusammen.html`**. Keine Änderungen an Hub, globalen Headern, `js/mp.js` oder Vendor-Dateien; kein neuer Backend-Dienst.

- Eigenständiger Einstieg unter `/neon-zusammen.html`, auch ohne `?station=1`. Die Wildnis-Taste navigiert direkt zu `/neon-wildnis.html`; im Stations-iframe sendet sie weiter `mini-back`.
- Ruhiger Start mit Feuer-/Wasserrollen, eigenem Raum als Hauptaktion, sichtbarem Vierbuchstabencode, explizitem Kopieren mit echter Erfolgs-/Fehlermeldung und Beitreten per Enter. Schnellsuche und Solo bleiben verfügbar. Warten lässt das Menü scrollbar wachsen.
- Menü verwendet das vom Art-Worker gelieferte `/assets/tempel-zwei/cover-v1.webp`. Fehlt es, bleibt die integrierte SVG-Illustration sichtbar. Cover und [ART.md](ART.md) gehören dem Art-Worker; hier nur Referenz und Darstellung.
- Vier sichtbare Siegelschritte, dauerhafte Aufgaben für beide Rollen, zustandsabhängige Handlungsbeschreibung, Zielschilder in der aktuellen Kammer, Namen über Figuren und klar markierte eigene Rolle.
- Gemeinsame Tor-Belohnung mit Siegelmeldung, Klang und kurzem Effekt. Gemeinsamer Abschluss mit derselben Kristallzahl, Spielzeit und Punktzahl auf beiden Clients; persönlicher Rekordtext bleibt geräteabhängig.
- Bedienbare Aktions-, Wechsel- und Ruf-Buttons, tastaturbedienbarer Einstieg, Ton-Schalter mit Status, reduzierte Kamerabewegung bei entsprechender Betriebssystemeinstellung. Kleine Hochformate und mobile Querformate erhalten getrennte Layouts. Dies ist kein vollständiges WCAG-Audit.

## Bestätigte Korrekturen

1. **Fortschritt nach Partner-Tor:** In der Ausgangsversion standen nach denselben beiden Druckplatten ein Client auf Raum 1 und der andere auf Raum 2. `openGate` führt nun auch beim Empfang den Fortschritt und die Ziele weiter. Geöffnete Tore bleiben offen.
2. **Unsichtbarer rückwärtiger Wächtertreffer:** Bei `(0, -84)` hinter dem Wächter setzte der Ausgangscode die Figur auf `z=-66.2` zurück, obwohl der Strahl nach vorne zeigt. Die Trefferprüfung berücksichtigt nun zusätzlich die Vorwärtsrichtung. Ergebnis im direkten Vorher-/Nachher-Test: vorher Rückwurf, nachher Figur weiter bei `z=-84`.
3. **Gemeinsame Sammlungen:** Kristalle werden jetzt als zuverlässige, idempotente Ereignisse mit stabiler Objekt-ID übertragen, statt auf beiden Geräten allein aus interpolierten Positionen abgeleitet zu werden. Beide dürfen denselben Kristall berühren; er zählt einmal. Beim Verbindungsaufbau/-wiederaufbau werden bleibende Fortschritte monoton abgeglichen.
4. **Native Button-Tastatur:** Leertaste auf dem neuen Aktionsbutton löst genau eine Aktion aus. Der globale Handler darf nicht zusätzlich zum nativen Click die Pflanze und gleich danach ihren Hebel bedienen.
5. Keine Solo-Wechselaufforderung für eine fremde Elementkraft im Online-Modus. Nach endgültiger Trennung wird vorhandener Solo-Wechsel angezeigt; es wird keine Onlineperson erfunden.

Die vier Rätsel bleiben erhalten: zwei gleichzeitige Platten; Ember/Ranken und Aqua/Pflanze samt Hebeln; zwei Impulse innerhalb **1,2 Sekunden**; Wächter ablenken, Altäre aktivieren und hinten die Schattenplatte zum Rollentausch nutzen. Bewegung und Kollisionsmodell wurden nicht neu geschrieben.

## Lokal prüfen

Aus diesem Worktree den Server mit den **tatsächlichen `_headers`** starten:

```sh
PORT=8120 node spiele-dev/neon-flug/server.cjs
```

In einer zweiten Shell:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/tempel-zwei/qa.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/tempel-zwei/solo-ui.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/tempel-zwei/regressions.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/tempel-zwei/measure.cjs
```

Die Skripte verwenden lokal installiertes Playwright oder `PLAYWRIGHT_MODULE` (hier `/tmp/aban-games-audit/node_modules/playwright`). Für die obigen Aufrufe diese Variable entsprechend exportieren. Es gibt keinen TLS-Bypass. Die Vorher-Sonden lesen `9dc1306ad:neon-zusammen.html` aus Git und liefern genau diese HTML-Datei über denselben Header-Server an den Browser; sie ändern keine Produktivdatei. `before.cjs` erzeugt bei Bedarf die vier Vorher-Bilder neu.

## Nachweise und Grenzen

- [QA-Zweiclient](qa-results.json): echte `RTCPeerConnection`/DataChannels über die unveränderte lokale MP-Testengine `?mp=local`; Signaling via BroadcastChannel. Zwei Pages im selben Browser-Context, **keine simulierten Mitspieler**. Alle vier Rätsel bis zum gemeinsamen Sieg, abgelaufener Gleichklangimpuls mit erneutem Versuch, Rollenbeschränkung, Kristallzählung, Ping, Online-Pause, Abbruch und getrennte Rollen geprüft.
- [Solo/UI](solo-results.json): beide Figuren vor Rätseln per Positionsfixture vorbereitet; Aktionen, Wechsel und 1,2-s-Fenster mit echten Buttons/E/Q. **Alle vier geöffneten Tore per W durchquert.** Wächtertreffer setzt an den Raum-4-Eingang zurück und erhält drei offene Siegel. Hintere Schattenplatte, Rollenwechsel, vierter Ausgang und Abschluss mit beiden Figuren geprüft.
- Echte Touch-Ereignisse über Chromium-CDP: linker Daumen plus gleichzeitige Aktion, Touch-Cancel, Stillstand und Figurenwechsel. Virtuelle Viewports 390×844, 360×640 und 844×390. Kein Test auf physischem Mobilgerät.
- iframe-Nachrichten `mini-back` und `stationDone` mit endlichem Score sowie direkte Wildnis-Navigation geprüft. Der große Wildnis-Ladevorgang selbst ist nicht Teil dieses Spieltests.
- [Regressionen](regressions.json) halten die Ausgangsversion und korrigierte Version fest. Die Druckplatten-Race kann im Ausgangslauf unterschiedlich herum auftreten; auf der neuen Version müssen beide Clients Raum 2 erreichen.
- [Messung](measurement.json): WebGL-Draw-Aufrufe in begrenzten Messfenstern, 960×540 mit Software-WebGL. Menü und Solo-Pause rendern jetzt **0** Draw-Aufrufe hinter ihrer Abdeckung. Das ist ein Nachweis vermiedener Arbeit, keine Hardware-FPS-Aussage. Online-Pause simuliert und rendert weiter.
- Die langen Wege zwischen Objekten werden durch `__zs.tp` verkürzt. Das ist kein vollständig manuell durchgespielter Parcours. Produktions-Signaling, Mobilfunk/NAT/TURN, hohe Latenz, Wiederverbindung über reale Netze und sämtliche Hardware sind nicht damit geprüft. Das neue bleibende Fortschritts-Snapshot wurde im regulären Aufbau benutzt; ein erzwungener echter Netz-Reconnect wurde nicht gemessen.
- Keine Veröffentlichungsfreigabe oder vollständige Repo-CI durch diesen Worker. `automation/ci_simulation.sh` liest ausschließlich eingecheckten Code; die Integration/CI des noch uncommitteten Spielpakets übernimmt der Parent.

## Bilder

Alle Bilder sind begrenzte PNG-Einzelaufnahmen, keine Dauerrender-Aufzeichnung.

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Einstieg 960×540 | [Vorher](screens/before-desktop.png) | [Nachher](screens/after-desktop.png) |
| Spiel 960×540 | [Vorher](screens/before-game.png) | [Koop](screens/after-coop-room1.png) |
| Mobiler Einstieg 390×844 | [Vorher](screens/before-mobile.png) | [Nachher](screens/after-mobile.png) |
| Mobiles Spiel 390×844 | [Vorher](screens/before-mobile-game.png) | [Nachher](screens/after-mobile-game.png) |

Zusätzlich: [Raumcode](screens/after-lobby-code.png), [Wächter-Koop](screens/after-coop-guardian.png), [gemeinsamer Sieg](screens/after-victory.png), [Solo-Checkpoint](screens/after-solo-checkpoint.png), [kleines Hochformat](screens/after-mobile-small.png), [Querformat](screens/after-mobile-landscape.png), [ohne Cover](screens/after-cover-fallback.png).

## Integration durch den Parent

Der Hub erhält einen eigenen Tempel-Einstieg mit tatsächlichem lokalem Bestwert. Menü-Cover und Freigabe-/Quellnachweis stammen aus ART.md. Die Spiel-Metadaten nennen jetzt die vier Rätsel und verwenden dieses Cover. Das Raumpräfix `tempel3` trennt die erweiterten Fortschritts-/Kristallnachrichten von alten `tempel2`-Tabs; vorhandene lokale Bestwerte bleiben unter ihrem alten Schlüssel erhalten. Die öffentliche Seite braucht weiter die vorhandenen PeerJS-Vermittler.

### Aktives Spiel und Grafiklast

Der Parent hat nach der Übergabe zusätzlich während des Spielens gemessen:17,1rAF/s bei960×540 im Software-WebGL. Die Renderauflösung wird jetzt auf langsamen Renderern angepasst, und nur vier Fackellichter in der Nähe der beiden Figuren sind aktiv; sämtliche sichtbaren Flammen bleiben erhalten. Nachher29,2rAF/s, Median33,3ms,95.Perzentil50,1ms, Renderverhältnis0,55. Das ist eine begrenzte Cloud-Probe, keine Aussage über echte Handy-GPUs. Vorher/Nachher stehen in active-performance.json; performance.cjs wiederholt die aktive Probe. HUD-/Zieltexte bleiben als DOM scharf. Standard-Hardware startet mit höherer Auflösung, schwache Geräte reduzieren sie bei dauerhaft hoher Framezeit.
