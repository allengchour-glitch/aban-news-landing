# Gemeinsamer Spiele-Stand für Claude Code ·16.11.2026

**Aktiver Besitzerauftrag: «mach die 2 fertig», danach «teile dann memory».** Die vorherige Pause ist aufgehoben. Neon Flug und die kleine niedliche Lebenspfad-Figur vollständig prüfen/veröffentlichen, danach Memory mit tatsächlichen Live-Belegen teilen. Bestehende Freigabe gilt; keine neue Rückfrage nötig. Traumhaus bleibt bei der anderen Sitzung. Keine Shop-/Social-/Konto-/Secret-Aktion.

## Bereits live

- Mix Arena PR3213, Merge78f14f5fb, Hauptseitenlauf43924427755,42/42 normale HTTPS-Prüfungen grün. Figuren/Runden/XP/Level/Revanche. https://abannews.com/minispiele/
- Lebenspfad Atmosphäre/Objekte PR3214, Mergee6cb01125, Lauf43925206449,9/9 HTTPS-Prüfungen grün. Eigene Blender-Modelle und Kapitellicht; kein Higgsfield-Anschluss genutzt. https://abannews.com/lebenspfad

## Neon Flug: Veröffentlichung läuft

PR3217 nach sechs echten grünen Prüfungen am Head4008cc562 gemergt: e023cc01f. Hauptseitenlauf43929567774 gestartet; öffentliche14-Abfrage-Prüfung danach erforderlich. Lokal66 Node+90 Browser-/Rendererbedingungen grün: echte Höhensteuerung/Touch, Ringe entfernen, Drohnenmodus, einmalige XP, lokale WebRTC-Verbindung. Keine öffentliche Zwei-Geräte-/Handy-FPS-Zusage. Details in `spiele-dev/neon-flug/WEITERARBEIT.md` und `PRUEFUNG-v4.json`.

## Lebenspfad-Figur: Fertigstellung läuft

PR3218, Branch `codex/lebenspfad-figur-neu`, Worktree `/workspace/aban-lebenspfad-figur`. Verbindlicher Stil: **kleine niedliche Figur, großer Kopf, kompakter Körper, verspielt**. Neues `character-art.js` ist bereits in HTML eingebunden. Zusätzliche Patchdatei nicht erneut blind anwenden. Figurfinish/Varianten/Alter/Familie/Bewegung/Save/Replay und Veröffentlichung stehen an; kanonisch `spiele-dev/lebenspfad/FIGUR-NEU.md`. Kein fertiges Live-Ergebnis behaupten.

## Abschluss und Memory

Keine weiteren unabhängigen Erweiterungen. Sechs relevante echte Headprüfungen abwarten (check2×, Brand-Voice2×, Cloudflare-Pages1×, Pre-deploy1×), exakten Head mergen, Hauptseiten-Deploy bestätigen. Vier Einrichtungs-/Secret-Schritte müssen übersprungen bleiben. Öffentlicher Prüfer `spiele-dev/release-qa/verify-game-release.py` nutzt echten Seitenbau, Byte-/Headerabgleich und normales TLS. Für Neon14, für die Figur samt vorhandenen Atmosphärenassets11 Anfragen. Keine TLS-Ausnahme. Gesamt-CI lokal durch read-only HOME blockiert, echte GitHub-Prüfungen getrennt.

Nach erfolgreicher Veröffentlichung beide Releasebelege in Memory/Claude-Übergabe ergänzen und dem Besitzer den gemeinsamen Übergabelink geben.
