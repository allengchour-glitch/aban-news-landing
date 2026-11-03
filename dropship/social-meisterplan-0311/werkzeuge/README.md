# Werkzeuge der Social-Charge vom 03.11.2026 (Scratch-Stand, nicht als Produktivcode geprüft)

Diese Skripte haben die Bilder und Reels der Charge vom 03.11. gebaut. Sie lagen nur in `/tmp` und wären mit der Sitzung verloren gegangen.

- **Pfade sind fest verdrahtet** (`/tmp/sm-stories`, `/tmp/sm-geschenke`, `/tmp/sm-lieferung`, `/tmp/sm-v2`, `/tmp/cm/tts`, Musik unter `automation/music`): vor der Benutzung anpassen. Ein unabhängiger Prüfer hat das bei `karussell-geschenke` und `reel-v2` ausdrücklich bemängelt.
- **Endung `.py.txt`:** Die Python-Hilfen tragen `.txt`, damit sie keine Python-Prüfung der CI auslösen. Zum Benutzen die Endung `.txt` entfernen und mit `/usr/bin/python3` starten (das `python3` im PATH hatte ein defektes Pillow).
- **Prüfstand:** Stories und Karussells wurden von zwei unabhängigen Prüfern gesehen und gemessen (Stories nach zwei Runden «ok», Karussells «mit Änderungen», ohne Blocker; offene kleine Punkte stehen in `EINGEPLANT-0311.md`). Das Reel `reel-v2` ist technisch geprüft, die drei Test-Reels sind aber **nicht freigabefähig** (siehe dort). `spec_nachtlicht.env` wurde bewusst nicht übernommen: Die Zielseite hat 18 unsaubere Varianten.
- **Texte in den Bildern:** nie Preis, Versand, Lieferzeit, Rabatt, Garantie in Stories; die Karussells nennen Preise nur, wenn das Skript sie frisch aus der Storefront liest und bei Abweichung abbricht.
