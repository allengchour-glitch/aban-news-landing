# Neon-Flug: Audio-Abschlussprüfung

Ausgangsstand: `9dc1306ad`, Zweig `codex/neon-flug-koop`. Lokal geprüft am 15.11.2026. Nur `js/neon-flug/audio.mjs` sowie dieser Bericht und `audio-test.cjs` bearbeitet. Kein Commit, Push oder Deployment.

**GEMESSEN: Abschlusslauf 15.11.2026, 23:40:27 UTC, Chromium `159.0.8154.6`: 36 bestanden, 0 Fehler, Exitcode 0.** Lokale und ausgelieferte Audio-Datei haben dieselbe SHA-256: `a88024c6016d121a7a1c2e4c7438ec68a15b6d4db7bbe0f10eb7fd7e20d16f81`.

**GEMESSEN: Zwei Fehler vor der Korrektur reproduziert.**

- `tone(440, 0.3, 0)` erzeugte trotz Lautstärke null einen Nachlauf: Peak `0.000075009164`, RMS `0.000011859988`, 2400 Samples ungleich null im 1-Sekunden-Render. Die Hüllkurve endete bei `0.0001`; bis zum Oszillator-Stopp blieben weitere 50 ms Signal.
- Training starten, Ton einschalten, global stummschalten, Dash auslösen: Der AudioContext lief wieder, während die UI weiter „Ton einschalten“ zeigte. Der Browser-Analyser hinter dem Kompressor maß einen alten Nachlauf mit Peak `0.000662719074`, RMS `0.000114316583`. Auch Pause/Fortsetzen hob den suspendierten Zustand bei weiterhin ausgeschaltetem Ton auf. Neue Effekte waren durch `enabled=false` gesperrt; bereits geplante Töne liefen durch das bedingungslose `resume()` weiter.

Begrenzte Korrektur: `tone()` erzeugt bei Lautstärke ≤ 0 keine Knoten. `unlock()` setzt den Kontext nur bei eingeschaltetem Ton fort und suspendiert ihn sonst. Klangwerte, Kompressor, Musik und Effektmuster bleiben unverändert.

**GEMESSEN nach der Korrektur:**

| Offline-Render | Peak | RMS | Fenster |
| --- | ---: | ---: | ---: |
| `tone(..., 0)` | 0 | 0 | 1 s |
| Jeder der fünf Effekte bei 0 | 0 | 0 | je 4 s |
| Musik 0 / beide Regler 0 / global deaktiviert | 0 | 0 | je 30 s |
| Musik 35, ohne Effekte | 0.038884331 | 0.005969518 | 30 s |
| Musik 100, ohne Effekte | 0.108718373 | 0.015724926 | 30 s |
| Mischung Musik 35 / Effekte 55 | 0.097477168 | 0.012573380 | 30 s |
| Mischung Musik 100 / Effekte 100 | 0.208894745 | 0.024921546 | 30 s |

Mono, 48 kHz, echte Chromium-`OfflineAudioContext`-Samples. Musik: ein kompletter Durchlauf der vier Akkorde mit 64 Taktschlägen im Abstand 0,42 s, Level 0. Mischung: zusätzlich alle 0,84 s abwechselnd Ring, Treffer, Dash, Rettung, Sieg. In beiden Mischungen kein Sample mit Betrag ≥ 1. Alle Effekte liefern bei 55 ein positives Signal und bei 100 einen höheren RMS. `update(false, ...)` bleibt ohne Signal. Musik=0 plus Dash ergibt denselben Peak/RMS wie Dash allein (numerische Toleranz als **SETZUNG** `1e-10`). Peak ist der maximale Samplebetrag, RMS das quadratische Mittel über das gesamte angegebene Fenster; keine LUFS-Messung.

Echter Browserablauf unter den unveränderten CSP-/Permissions-Policy-Headern von `http://127.0.0.1:8113`: kein AudioContext vor Interaktion, Training ohne Tonfreigabe ohne neue Oszillatoren, Ton-Schalter aktiviert messbares Signal, Pause friert die Audio-Uhr ein, Fortsetzen liefert wieder Signal. Beide Lautstärkeregler wurden im echten Einstellungsdialog mit Home/Pfeiltasten bedient. Musik=0/Effekte=100 unterdrückt neue Musiknoten und lässt den echten Dash aktiv; Musik=100/Effekte=0 lässt Musik aktiv und erzeugt beim Dash keine Effektknoten. Globales Mute suspendiert den Kontext und bleibt nach Dash und Pause/Fortsetzen suspendiert. Explizites Entstummen, Flug verlassen und Lautstärkespeicherung nach Reload wurden ebenfalls geprüft. Keine JavaScript-Laufzeitfehler. Ein paralleler Analyser liest den Ausgang hinter dem echten Kompressor; sein Messzweig hat Gain 0. Eingefrorene Analyser-Daten eines suspendierten Kontextes werden ausdrücklich nicht als ausgehendes Signal bewertet.

Der Test importiert die exportierte Klasse direkt. `unlock()` selbst baut den Offline-Master samt Kompressor. Ausschließlich `state` und `currentTime` werden vor dem Offline-Scheduling adaptiert, weil Offline-Kontexte vor `startRendering()` suspendiert sind und die komplette Partitur vorab geplant wird. Oszillatoren, Hüllkurven, Gain, Kompressor und Rendering sind echte WebAudio-Implementierungen. Ein SHA-256-Vergleich prüft zusätzlich, dass Port 8113 dieselbe Audio-Datei wie der lokale Arbeitsbaum liefert. Gegenprobe vor dem Fix: 13 fehlgeschlagene Prüfungen; erster Lauf nach dem Fix: 30 bestanden. Der abschließende Lauf enthält zusätzlich Quellvergleich und fünf positive Effekt-/Lautstärkeprüfungen.

Reproduktion ohne Installation:

```sh
cd /tmp/aban-neon-coop
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers \
AUDIO_QA_JSON=/tmp/neon-audio-final.json \
node spiele-dev/abschlusspruefung/audio-test.cjs
```

`--probe` liefert Befunde trotz fehlgeschlagener Assertions; regulär führt jeder Fehler zu Exitcode 1. Pfade sind mit `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_BROWSERS_PATH` und `AUDIO_QA_URL` überschreibbar. Der vorhandene Header-Server muss laufen. Vollständige lokale Messdaten: `/tmp/neon-audio-before.json`, `/tmp/neon-audio-after.json`, `/tmp/neon-audio-final.json`.

Grenzen: Chromium headless, keine Hörprobe, keine Lautsprecher-/Geräteprüfung, kein Mikrofonzugriff; keine Aussage über subjektive Mischung, Klangqualität, andere Browser oder mobile Hardware. Bereits geplante positive Töne werden durch einen Lautstärkeregler nicht rückwirkend abgeschnitten und können nach Fortsetzen noch ausklingen (Musiknoten bis 2,55 s ab Notenstart); globales Mute stoppt dagegen die Audio-Uhr. Der gemessene Spitzenwert gilt für den beschriebenen Ablauf, nicht für jede denkbare gleichzeitige Effektfolge. Der Test ist ein manuell ausführbarer Abschlussprüfer und wurde nicht in fremde CI-Dateien eingehängt. Syntaxprüfungen und `git diff --check` bestanden. `bash automation/ci_simulation.sh` konnte nicht anlaufen: `mktemp` in `/home/agent` scheiterte am schreibgeschützten Dateisystem; das Werkzeug prüft außerdem nur den committeten Stand, nicht diese bewusst uncommittierten Änderungen.
