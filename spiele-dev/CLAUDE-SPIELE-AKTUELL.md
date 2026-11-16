# Claude Code: aktueller Spiele-Stand ·16.11.2026

Besitzerauftrag: Spiele fortlaufend verbessern, Änderungen regelmäßig sichern, eigene PRs nach echten Prüfungen veröffentlichen. Traumhaus bearbeitet eine andere Sitzung. Kein Shop-/Social-/Konto-/Secret-Eingriff.

## Live und öffentlich geprüft

- Mix Arena, PR3213: Figuren,3/5/7 Runden, Startkarten, Countdown, Revanche, XP/Level/Erfolge, sichere Wiederaufnahme; neun korrigierte Querformatlayouts.194 Node-/24 Arena-/139 Einbettungs-/7 Recovery-/17 Arcadebedingungen. Head02af489da, Merge78f14f5fb, Hauptseitenlauf43924427755 erfolgreich,42/42 normale HTTPS-Abgleiche grün. Live https://abannews.com/minispiele/
- Lebenspfad Atmosphäre/eigene Objekte, PR3214: acht Licht-/Himmelspaletten, Nebel/Berge, eigenes Willkommenstor, Erinnerungsplatz und Sternwarte. Drei GLBs zusammen254.156Bytes, lokales Blender4.3.2; direkter Higgsfield-Anschluss nicht vorhanden. Graph/alte Standorte unverändert,26 Replaykontrollpunkte identisch. Geprüfter Head5bd93574c, Mergee6cb01125, Hauptseitenlauf43925206449 erfolgreich,9/9 normale HTTPS-Abgleiche grün. Live https://abannews.com/lebenspfad

Bei beiden Releases jeweils sechs relevante echte CI-Prüfungen grün und alle vier Einrichtungs-/Secret-Schritte übersprungen. Quellen-/Browserprüfungen sind keine physischen Handy-FPS-/Safari-/öffentlichen Internet-Koop-Nachweise. Lokale Gesamt-CI konnte wegen read-only HOME nicht starten.

## Gesicherter Neon-PR – noch nicht live

Neon Flug, Branch `codex/neon-flug-ringe-belohnung`, Worktree `/workspace/aban-neon-flug-belohnung`: echte Höhensteuerung samt Koop/Kollisionen, sichtbar eingesammelte Ringe, begrenzte Animationen, einmalige XP-Abrechnung, optionaler60-Sekunden-Modus Neon-Schießen. HUD-Überlagerung korrigiert; Speicher-/WebLocks-Randfälle sind geprüft.66 Node+90 Browser-/Rendererbedingungen grün, korrekte3D-/HUD-Bilder gesichtet; echte PR-CI/Deploy stehen an. Gesicherter Draft-PR3217, Head `bbe12a5203074ed4f52e232d60802ecbf9e736ce`: https://github.com/allengchour-glitch/aban-news-landing/pull/3217 . Noch nicht gemergt/live. Kanonisch `spiele-dev/neon-flug/WEITERARBEIT.md`.

## Neuer Auftrag nach der Atmosphäre-Veröffentlichung

Besitzer: «charakter in lebenspfad gefällt mir nicht». Ausdrücklich gewählter Stil: **Kleine niedliche Figur – großer Kopf, kompakter Körper, verspielter Stil**. Diese Entscheidung ersetzt die vorläufige Annahme einer normal proportionierten Comicfigur. Neuer Worktree `/workspace/aban-lebenspfad-figur`, Branch `codex/lebenspfad-figur-neu`, Basismain e6cb01125. Native Figur sichtbar neu gestalten; vier Altersstufen, bestehende Anpassungen, Standhöhen und Koop erhalten. Keine Veröffentlichung dieser Figurenänderung bisher.

## Speichern und Pause nach Besitzerwunsch

Letzte Anweisung: «langsam speichern alles und token sparen». Weitere Erweiterungen kontrolliert angehalten. Die neue Figur ist ein ungeprüfter Entwurf; keine fertige Darstellung oder Veröffentlichung behaupten. Genauer Stand und lokale Wiederaufnahme in `spiele-dev/lebenspfad/FIGUR-NEU.md`. Branch `codex/lebenspfad-figur-neu` wird als Checkpoint gepusht; vor dem Weiterbauen frisches main/PR3217 lesen und normal mergen, kein Force-Push.

Neon-Fortsetzung: sechs echte Prüfungen am jeweils aktuellen Head (check2×, Brand-Voice2×, Cloudflare-Pages1×, Pre-deploy1×) abwarten. Nur dann exakten geprüften Head squash-mergen, Hauptseiten-Deploy `cf-deploy-mainsite.yml` bestätigen; vier Einrichtungs-/Secret-Schritte müssen übersprungen bleiben. Danach14 öffentliche Quellen-/Assetprüfungen:

```sh
GAME_ROOT="$PWD" GAME=neon-flug GAME_OUT=/tmp/neon-live RELEASE_COMMIT=<Deploy-Commit> python3 spiele-dev/release-qa/verify-game-release.py
```

Der Prüfer verwendet den echten Seiten-Injektor, Skript-/Stilvergleich und normale TLS-Verifikation; positives Original, zusätzliches Skript und geänderten Spielmodulpfad als Kontrollen. Nicht mit einer öffentlichen Browser-/Zwei-Geräte-Prüfung verwechseln. Gesamte lokale CI scheitert vor Start am read-only HOME; keine Umgehung.
