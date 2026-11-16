# Gemeinsamer Spiele-Stand für Claude Code ·16.11.2026

**Aktiver Besitzerauftrag: «mach die 2 fertig», danach «teile dann memory».** Die vorherige Pause ist aufgehoben. Neon Flug und die kleine niedliche Lebenspfad-Figur vollständig prüfen/veröffentlichen, danach Memory mit tatsächlichen Live-Belegen teilen. Bestehende Freigabe gilt; keine neue Rückfrage nötig. Traumhaus bleibt bei der anderen Sitzung. Keine Shop-/Social-/Konto-/Secret-Aktion.

## Bereits live

- Mix Arena PR3213, Merge78f14f5fb, Hauptseitenlauf43924427755,42/42 normale HTTPS-Prüfungen grün. Figuren/Runden/XP/Level/Revanche. https://abannews.com/minispiele/
- Lebenspfad Atmosphäre/Objekte PR3214, Mergee6cb01125, Lauf43925206449,9/9 HTTPS-Prüfungen grün. Eigene Blender-Modelle und Kapitellicht; kein Higgsfield-Anschluss genutzt. https://abannews.com/lebenspfad

## Neon Flug: live und geprüft

PR3217: sechs relevante echte CI-Prüfungen am Head4008cc562 grün, Mergee023cc01f. Hauptseitenlauf43929567774 erfolgreich, vier Einrichtungs-/Secret-Schritte übersprungen. GEMESSEN **14/14 normale öffentliche HTTPS-Prüfungen bestanden**: tatsächlicher Seitenbau, Skripte/Styles/Sicherheitsheader und bytegleiche Module. Lokal66 Node+90 Browser-/Rendererbedingungen grün: echte Höhensteuerung/Touch, Ringe entfernen, Drohnenmodus, einmalige XP, lokale WebRTC-Verbindung. Keine öffentliche Zwei-Geräte-/Handy-FPS-Zusage. https://abannews.com/neon-flug

Belege: `spiele-dev/neon-flug/belege-v4/{veroeffentlichung,produktion}.json`; Detailprüfung `PRUEFUNG-v4.json` und `WEITERARBEIT.md` im selben Spieleordner.

## Lebenspfad-Figur: abschließende Prüfung

PR3218, Branch `codex/lebenspfad-figur-neu`, Worktree `/workspace/aban-lebenspfad-figur`. Verbindlicher Stil umgesetzt: **kleine niedliche Figur, großer Kopf, kompakter Körper, verspielt**. Eigenes natives Geometriemodul; Elternreview von Portrait, Profil, allen25 Varianten, vier Altersstufen und Familie abgeschlossen. Keine zusätzlichen Texturen oder GLB-Downloads für native Figuren. Default32 statt60 Zeichenaufrufe; Dreiecke13.380 statt10.316, keine FPS-Zusage.

GEMESSEN71 Browserbedingungen grün:25 Varianten jeweils Desktop/Mobil, Alters-/Bodenkontakt, Rig/Gang/Blinzeln, Familie, gespeicherte Wahl nach Reload und deterministische Koop-Looks. Streifen-NaN reproduziert und korrigiert; Neun echte Spezial-GLB-Vorschauen, fünf Layoutgrößen/sieben Stand- und Emotefixtures sowie Replay bestanden:26 Kontrollpunkte, Endzustand und31 RNG-Aufrufe identisch zur Atmosphäreversion. Veröffentlichung folgt. Kanonisch `spiele-dev/lebenspfad/FIGUR-NEU.md`. Bereits eingebundene Patchdatei nicht erneut anwenden. Noch keinen Live-Abschluss der Figur behaupten.

## Abschluss und Memory

Keine weiteren unabhängigen Erweiterungen. Sechs relevante echte Headprüfungen abwarten (check2×, Brand-Voice2×, Cloudflare-Pages1×, Pre-deploy1×), exakten Head mergen, Hauptseiten-Deploy bestätigen. Vier Einrichtungs-/Secret-Schritte müssen übersprungen bleiben. Öffentlicher Prüfer `spiele-dev/release-qa/verify-game-release.py` nutzt echten Seitenbau, Byte-/Headerabgleich und normales TLS. Für Neon14, für die Figur samt vorhandenen Atmosphärenassets11 Anfragen. Keine TLS-Ausnahme. Gesamt-CI lokal durch read-only HOME blockiert, echte GitHub-Prüfungen getrennt.

Nach erfolgreicher Veröffentlichung beide Releasebelege in Memory/Claude-Übergabe ergänzen und dem Besitzer den gemeinsamen Übergabelink geben.
