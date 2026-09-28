# Reel-Videofenster zu klein — 28.09.2026

**Anlass:** Betreiber-Screenshot TikTok (Lederrucksack, 274 Aufrufe): «das video ist sehr klein?»

**GEMESSEN:**
- `make_reel.sh` setzte das Video in ein Band von 600–1180 px Höhe (580 hoch).
  Eine 9:16-Quelle stand dort 326×580 px gross, das sind 9 % der Bildfläche.
- Von 21 wartenden Reels waren 8 Hochformate (Fensterbreite 326–436 px) und 5 quadratisch (580 px), nur 8 füllten die Breite.
- Der Hook «Dein Zuhause, gemütlicher» auf dem Rucksack kam daher, dass `thema()` «led» (LED-Lampe) auch in «**Led**er» fand.
  Gegenprobe an 49'836 Titeln: 2'118 wechseln das Thema, davon 934 Lederartikel von home → mode.
  Dazu kamen «rock» in «Schnelltrocknend» (Hemd), «cap» in «Strick-Cape» und «tee» in «Frottee».

**GETAN:**
- `make_reel.sh`: Das Band liegt jetzt bei 390–1170 (780 hoch).
  - Quer- und Quadratformat nutzen die volle Breite (quadratisch neu 780×780).
  - Hochformat bis 1,3:1 wird 780 hoch.
  - Steiler (9:16) wird 600 breit und mittig auf 780 beschnitten, 73 % der Höhe bleiben.
  - Hochformat hat damit **2,5× Fläche**.
  - Der Hook (nur 0–3,2 s) liegt halbdurchsichtig über dem oberen Videorand.
  - Test mit 4 Seitenverhältnissen per Kontaktbogen bestanden.
- `cj_video_reel_engine.mjs` `thema()`: Wortgrenzen für led, tee, gua, rock, cap. Neu in der Mode-Liste: hemd, cardigan, strick, stiefel,
  sandal, ballerina; neu bei Schmuck: ohrhänger. «uhr» und «kind» bleiben ohne Grenze (sonst fielen Uhrenbox und Lauflernschuhe weg). 10/10 Kanarienvögel richtig.
- Neues Skript `automation/reel/reel_neu_rendern.py` rendert die wartenden Reels mit gleichem Text, Preis und gleicher Musik neu, aus der Server-Quelle, und das Meisterwerk-Tor ist Pflicht.
  - **8 von 13 ersetzt** (neue Fensterbreite 600 bzw. 780 px, gleiche Adresse).
  - 3 fielen am Hook-Tor durch (Bewegung in der 1. Sekunde 1,0–1,7 < 3). Sie bleiben in der alten Fassung, und die Poster prüfen sie ohnehin.
  - 2 haben keine Quelle.

**OFFEN:**
- Der bereits gepostete TikTok (Lederrucksack) bleibt, wie er ist.
- `make_reel.sh` filtert keine Fremdtexte aus der Quelle, der USB-Mixer zeigt z. B. englische CJ-Untertitel.
  Die Dauerlösung ist der Wechsel des Motors auf `schnitt.py` (Fremdtext-OCR, Produktfenster nach Bildenergie).
