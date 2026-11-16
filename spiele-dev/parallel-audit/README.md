# Arcade: erste parallele Reparaturrunde

Entwurf auf `codex/neon-flug-koop`, PR3156. Keine Veröffentlichung oder Zusammenführung. Fünf Arbeitsagenten bearbeiteten getrennte Spielgruppen; die Elterninstanz prüfte Integration, gemeinsame Header, Hub und das Flugspiel.

Das [Inventar](inventar.json) enthält 36 Spiele-Adressen:20 lokale Minispiele und16 Haupt-/Stations-/Altadressen. Vier alte Adressen leiten zur Wildnis. Sie zählen nicht als eigenständige neue Spiele. Die beiden Übersichten sind zusätzlich geprüft.

## Ergebnis nach Spielgruppe

| Bereich | Konkrete Reparaturen | Nachweis und Grenzen |
|---|---|---|
| [Flugspiel](../neon-flug/README.md) | Stabile Felsform und Textur, saubere Kamerakante, echte Rettungsfrist, kein Sieg mit ausgefallenem Partner, zuverlässige Ergebnisansicht |96 gezielte Prüfbedingungen, lokale echte WebRTC-Clients und Bildvergleich; kein Handy- oder öffentlicher Internetnachweis |
| [20 Minispiele](minispiele.md) | Bildratenkorrektur bei Pong, erreichbare Handyknöpfe, sichere Neustarts, Touch/Maus-Wechsel, verdeckte Auswahl, freie Apfelzellen |60 Browser-Prüfbedingungen inkl.40 Starts und gezielten End-/Neustartproben; keine komplette Regelvariantenprüfung |
| [Action/Stationen](action.md) | Racer driftet nicht je nach Bildrate; Fahrbahn reicht hinter die Kamera, Anzeigen überlappen nicht; Dungeon-Regen nutzt Zeit; Pause, Fokusverlust und Menüs korrigiert |74 Bedingungen mit kontrollierter Zeit und echten mobilen Renderproben; keine vollständig durchgespielten Kampagnen |
| [Welten und Brettspiel](welten.md) | Kein Weiterlaufen durch verlorenes Loslassen, Solo-Pause in Park/Tempel ohne schwere Park-Renderarbeit unter dem Overlay, lokale Online-Pause verständlich benannt, keine Würfe hinter dem Lebenspfad-Menü |Gezielte Start-/Eingabe-/Pausenproben; genaue Endergebnisse und verbleibende Harness-Grenzen im Bericht |
| [Traumhaus](traumhaus.md) | Rechtsklick/Kneifgeste baut nicht versehentlich; Palette zoomt nicht mit; Kamera-/Joystick-Enden korrigiert |23 Interaktions- und7 lokale Koop-Prüfbedingungen; Welt-/Langzeitprüfung bleibt offen |
| [Zwei Wortspiele](wortspiele.md) | Keine doppelten Enter-Buchstaben, Entwürfe/Hinweise bleiben gespeichert, schmale Ansicht bedienbar, defensives Laden und Statusmeldungen |642 Bedingungen inkl.88 wiederhergestellter Tageslösungen und33 tatsächlich gelöster Brücken; kein Mehrtab-/dauerhafter Mitternachtsnachweis |

Eine bestandene Bedingung ist kein Nachweis, dass ein ganzes Spiel fehlerfrei oder fertig ist. Die Gruppenberichte unterscheiden echte Eingaben, gesetzte Testzustände, Renderprüfungen und offene Fälle.

## Gemeinsame Bild-/Einbettungsfehler

`_headers` erlaubt nur auf existierenden Spielrouten eigene Stationen/Minispiele, lokale Modell-Blobs, eingebettete Blob-Bilder und die beiden bereits verwendeten PeerJS-Vermittler. Ein tatsächlicher Blob-Bildabruf war trotz erlaubtem Blob-Fetch blockiert; beide werden jetzt getrennt geprüft. Lebenspfad und Traumhaus erlauben Mikrofon nur für denselben Ursprung und weiterhin nur mit Browserfreigabe. Andere Seiten behalten ihre globalen Einbettungs-/Mikrofonbeschränkungen.

23 bestandene Header-/Integrationsbedingungen. Die Browser-Gegenprobe lädt ein echtes Punkte-Jagd-iframe in Lebenspfad, eine echte Jump-Station in Wildnis, einen Modell-Blob und ein Blob-Bild. Mikrofonprüfung ausschließlich mit synthetischem Chromium-Testgerät. Kein Abschalten von CSP oder TLS-Prüfung, keine reale Aufnahme.

Der Hub verlinkt Aether Run direkt und zeigt aktuelle lokale Flug-XP statt des alten Flugrekords. Fortschrittszählung folgt den sieben vorhandenen Karten. Bei390px kein horizontaler Überlauf; der Link führt in den echten Hangar. Die lokale Vorschau unterstützt auch `/minispiele/`.

## Wiederholen

Node.js und Playwright/Chromium vorausgesetzt, UI-Test zusätzlich axe. Module und Browser dürfen außerhalb des Repositorys installiert sein.

```sh
PORT=8112 node spiele-dev/neon-flug/server.cjs
```

In einer zweiten Shell, mit für die eigene Installation passenden Modul-/Browserpfaden:

```sh
export PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright
export PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers
GAMES_TEST_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/headers-test.cjs
GAME_BASE_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/minispiele-qa.cjs
BASE_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/wortspiele-qa.cjs
```

Andere Gruppen haben eigene dokumentierte Modulvariablen; die genauen Aufrufe stehen in ihren Berichten. Nicht alle schweren Software-3D-Läufe gleichzeitig starten. Messungen unter `messungen/` und die Traumhaus-Gegenproben dokumentieren den tatsächlichen Lauf; die QA-Skripte liefern bei Fehler einen Exitcode ungleich0.

## Offen vor einer Veröffentlichung

Öffentliche Vermittlung, echte Zielgeräte/FPS, Audio-Mischung und längere Koop-/Balance-/Spielstandläufe sind nicht vollständig bestätigt. Cloud-Browser konnte den öffentlichen PeerJS-Pfad zuvor wegen Zertifikatsfehler nicht belegen; keine neue Änderung an Zertifikatsvertrauen oder TLS. Lokale WebRTC-Tests ersetzen diesen Nachweis nicht.

Die vollständige Repo-CI endet hier bei `mktemp` im schreibgeschützten `/home/agent`. Daher keine volle CI-Freigabe. Nichts automatisch mergen oder veröffentlichen.
