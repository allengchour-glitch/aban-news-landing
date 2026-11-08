# YouTube-Studio für oio

Zielkanal laut Screenshot: https://www.youtube.com/@oio-o7s. Kontozuordnung ist noch nicht bestätigt. Ein YouTube-Kanal ist bereits in Metricool verbunden; dessen Kanal-ID wurde dem Screenshot nicht sicher zugeordnet. Bestehende pausierte Upload-Abläufe bleiben pausiert.

Thematischer Vorschlag: praktische KI und Automationen für kleine Betriebe. Drei originale Kurzskripte behandeln E-Mail-Entwürfe, Angebots-Nachfassen und Shop-Prüfungen. Die Kanalbeschreibung ist ein Entwurf. Kein Kanal wurde erstellt oder umbenannt.

```bash
python3 tools/youtube_studio/studio.py /tmp/youtube-folge --render --folge 0
```

Der Renderer benötigt ffmpeg mit libx264 und DejaVu Sans. Er baut ein stummes vertikales Textvideo (720 × 1280, 28 Sekunden), Skript und Metadaten. Das ist ein erster Videoentwurf zur Sichtung. Keine Sprachmodell-Anbindung, Voiceover-Erzeugung oder Trend-Recherche ist enthalten. Es werden nur die drei vorhandenen Folgen gebaut; neue Themen entstehen nicht unbegrenzt von selbst.

Der GitHub-Ablauf baut wöchentlich ein Entwurfspaket mit den drei Folgen. Er veröffentlicht nichts und hat keine YouTube-Zugangsdaten. Für automatische Uploads fehlen die bestätigte Kanal-ID, die OAuth-Verbindung dieses Kanals und eine geprüfte Upload-Strecke. Für die Wachstumsauswertung fehlen kanalspezifische Aufrufe, Wiedergabezeiten und Abonnentenzahlen. Werte bleiben unbekannt statt als null ausgegeben zu werden.

Nach einer Veröffentlichung: Wiedergabezeit und Abonnenten pro Video vergleichen, Format einzeln verändern und erneut messen. Keine Followerzahl oder Einnahme ist versprochen. Das Büro zeigt getrennt, ob ein Skript, ein Video oder eine Veröffentlichung wirklich nachgewiesen ist.
