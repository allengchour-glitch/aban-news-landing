---
tags: [falle, teuer-gelernt]
quelle: dropship/GOOGLE-BLOCKER-FIX-2026-10-03.md
gelernt: 2026-10-03
---
# Google Image too small kann ein Variantenbild meinen

GEMESSEN 03.10.2026: 14 Produkte mit 'Image too small' hatten alle Hauptbilder >= 500 px; zu klein waren 45 Varianten-Bilder (bis 188x245). Google nimmt je Variante deren Bild (Bekleidung min. 250 px). Fix: Bild mit Lanczos auf 600 px, stagedUploadsCreate + fileUpdate ersetzt die Datei, Media-ID und Variantenzuordnung bleiben (google_variantenbild_gross.py).

Verwandt: [[Hypothese-mit-Datum]]
