# MiniMax H3: Clip aus Produktfoto (2.11.2026)

**Anlass:** Der Besitzer schickte ein TikTok zu MiniMax H3 («ja schaue ob das funktioniert dann baue das ein») und legte `MINIMAX_API_KEY` als GitHub-Secret an.

## Befund (QUELLE: Lizenztext und Doku, 2.11.2026)
- **Offene Gewichte lokal: nein.** 33 Mrd. Parameter, Anleitung startet mit 4 GPUs. Zudem verbietet die Lizenz (V.4, Anhang A Nr. 1), Ergebnisse ausserhalb des «Applicable Territory» (weltweit ausser EU, UK, Südkorea, USA) zu nutzen oder zu zeigen: unsere Social-Reels sind dort abrufbar. Nicht erlaubt nach Wortlaut; Auslegung offen, keine Rechtsauskunft.
- **API: ja.** `POST https://api.minimax.io/v2/video_generation` → `task_id`; `GET https://api.minimax.io/v2/query/video_generation/{task_id}` → `task.status` (`queued|running|succeeded|failed|cancelled`), Video unter `task.content.url`. Bild-Eintrag `{type:'image_url', image_url:{url}, role:'first_frame'}` (offizielles Beispielskript). Modelle `MiniMax-H3-Lite|Highspeed|H3|Max`, Auflösungen 480P/768P (H3 auch 2K), 4–15 s.
- **Unbekannt:** Preis je Sekunde (nicht in der Doku), Plattform-Bedingungen für kommerzielle Nutzung der API-Ergebnisse (vom Besitzer zu lesen), Qualität bei unseren Produktfotos.

## Was gebaut ist
- `automation/minimax_h3_clip.mjs`: ein Foto → ein Clip. **Vorgabe Trockenlauf** (druckt nur die Anfrage, nur eine HEAD-Prüfung des Bildes). `LIVE=1` sendet genau eine Anfrage, wartet höchstens 20 Minuten, lädt das Video, entfernt den Modell-Ton und legt `automation/music/luxe-premium.wav` darunter (Besitzer-Regel: ohne Stimme, «neue Musik»). Daneben `BEGLEITTEXT.txt` mit KI-Hinweis.
- Schutz (SETZUNG): höchstens 8 s je Clip, ein Clip je Lauf, Standardmodell Lite/768P, Eingabe wird nie still korrigiert, Bild muss https sein und einen Bildtyp liefern, Schlüssel nur im Authorization-Header.
- `.github/workflows/minimax-h3-clip.yml`: nur von Hand, Vorgabe Trockenlauf, Secret nur im Schritt «Clip», Ergebnis als Artefakt (14 Tage). Nichts wird veröffentlicht.
- Tests `automation/minimax_h3_clip_test.mjs` (8, ohne Netz); Mutationsprobe: 7 von 8 Schutzänderungen erkannt (die achte, ein Schlüssel zusätzlich in einem zweiten Header an denselben Server, ist harmlos).

## Ungetestet
Der Ablauf gegen die echte API ist **nicht** gelaufen (kein Schlüssel in der Cloud-Sitzung, Secrets liegen nur in Workflows). Der erste echte Lauf ist der Test; er kostet Geld und braucht das Ja des Besitzers.

## Bedienung
Actions → «MiniMax H3: ein Produkt-Clip» → `image_url`, `prompt`, `duration`; zuerst ohne `live` (Trockenlauf), dann mit `live: true`.
Auflagen beim Veröffentlichen: KI-Inhalte öffentlich als KI-erzeugt kennzeichnen; Marketing-Videos ohne Stimme.
