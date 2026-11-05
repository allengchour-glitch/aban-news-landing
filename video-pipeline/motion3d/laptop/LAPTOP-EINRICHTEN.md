# Laptop einrichten: Pia in 3D auf deiner Grafikkarte rendern

Die Cloud-Sitzung hat keine Grafikkarte und erreicht deinen Laptop nicht. Mit diesem Paket rendert dein Laptop selbst und braucht dafür nur drei Programme. Windows zuerst, danach Mac oder Linux.

## Einmalig (Windows)

1. Eingabeaufforderung öffnen (Windows-Taste, «cmd»).
2. Programme holen: `winget install Git.Git OpenJS.NodeJS.LTS Gyan.FFmpeg`
3. Eingabeaufforderung schliessen und neu öffnen.
4. Nur die nötigen Ordner holen (klein und schnell):
   `git clone --depth 1 --filter=blob:none --sparse https://github.com/allengchour-glitch/aban-news-landing.git`
   `cd aban-news-landing`
   `git sparse-checkout set video-pipeline/motion video-pipeline/motion3d`
   `git checkout ccr-ddb1c57a-s4a0zc`
5. Browser für den Renderer: `npm install -g playwright` und danach `npx playwright install chromium`
6. Prüfen: `node -v` (22 oder höher), `ffmpeg -version`.

## Rendern

1. Probe (8 Sekunden): `cd video-pipeline\motion3d` und `laptop\render-laptop.bat --dauer 8`
2. Ganzes Video: `laptop\render-laptop.bat` (Doppelklick im Ordner geht auch).
3. Ergebnis: `video-pipeline\motion3d\ausgabe\folge2-stumm.mp4`. Stimme und Musik mischt die Sitzung danach dazu.

Mac oder Linux: `brew install node ffmpeg git` (Linux: Paketverwaltung), dann dieselben Schritte 4 bis 6 und `bash laptop/render-laptop.sh`.

## Prüfen, ob die Grafikkarte arbeitet

- In Chrome `chrome://gpu` öffnen: bei «WebGL2» soll «Hardware accelerated» stehen.
- Beim Rendern im Task-Manager (Leistung, GPU) steigt die Auslastung.
- Die Zeit je Bild steht im Terminal. Mit Grafikkarte sind es meist ein bis wenige Zehntelsekunden, ohne etwa drei Sekunden. (Mit Grafikkarte nicht gemessen.)

## Wenn etwas nicht geht

- «playwright nicht gefunden»: Schritt 5 wiederholen.
- Schwarzes Bild oder Fehler zu WebGL: Grafiktreiber aktualisieren, dann nochmal.
- Es bleibt bei drei Sekunden je Bild: der Renderer nutzt die CPU. Dann `--webgl sw` entfernen oder Treiber prüfen und mir die Meldung schicken.

## Variante: direkt von der Sitzung aus

Du kannst Claude Desktop starten (oder `claude remote-control` im Repo-Ordner) und den Ordner freigeben. Dann kann die Sitzung die Befehle selbst auf deinem Laptop ausführen. Ob dein Konto die Funktion hat, ist nicht belegt.

## Danach

Schicke mir die Datei `folge2-stumm.mp4` (oder lade sie in den Ordner `ausgabe` im Repo). Ich mische Stimme und Musik und prüfe das Ergebnis.
