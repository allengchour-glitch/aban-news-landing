# Codex: Wasserwellen-Lampe, Foto-Vergleichsmuster

QUELLE: [Inhaberbriefing](../CODEX-REEL-LAMPE-0211.md), Git-Blob `ffcd7b23212bb8d93637197868cb81056567c8ed`. Eigenständiges Muster zur Ansicht, Claudes Fassung wurde nicht verwendet. Keine Veröffentlichung oder Queue; kein Ersatz des offenen professionellen Film-Masters.

GEMESSEN: MP4 tatsächlich lokal gerendert, Dauer **9.000000 s**, Dateigrösse **952271 Byte**, **270 Videoframes**, **1080 × 1920**, **30 fps**, H.264/yuv420p und AAC/48 kHz/Stereo. Vollständig mit ffmpeg decodiert, Exitstatus ohne Decodierfehler. SHA-256: `b1b7d3f665704d447018aeae4a6d4ef0364b2bbb3be0ce75b14b714ff7a7ae05`.

## Schnitt und Text

SETZUNG: folgende Gestaltung und Zeitfenster sind im abgegebenen Skript festgelegt; keine Animation der Lichtmuster oder Produktfunktion, keine Zoomfahrt.

| Zeit in Sekunden (SETZUNG) | Bild | Exakter Text |
|---|---|---|
| 0.0–3.0 | Ganzes Produktfoto auf heller Karte; Creme, dunkle Serifentypografie | `Wasserwellen-` / `Lampe`, darunter `Ein warmer Akzent.` |
| 3.0–3.2 | Kurze Überblendung zum dunklen Layout; beide Texte während des Übergangs anteilig sichtbar | Text der angrenzenden Abschnitte |
| 3.2–6.0 | Zwei feste Bildfenster: echte Wandprojektion links, leuchtendes Produktdetail rechts | `Warmes Licht.` |
| 6.0–6.2 | Kurze Überblendung zur hellen Schlusskarte | Text der angrenzenden Abschnitte |
| 6.2–9.0 | Vollständige Produktansicht, kleinere Namenszeile und Markenabschluss | `Wasserwellen-Lampe`, darunter `LuxeStyle · luxestyle.ch` |

SETZUNG: Im Unterschied zu einfachen Foto-Zooms wechseln Produktkarte, zweigeteilte Detailansicht und Schlusskarte. Feste Rahmen, Weissraum und Hell/Dunkel-Wechsel bilden die Gestaltung. Die vorhandene Wasserwellen-Optik bleibt fotografisch; keine erfundene bewegte Lichtprojektion.

## Quellen und Ausschnitte

GEMESSEN: Nur die drei im Briefing genannten JPEGs wurden geladen (je HTTP 200, image/jpeg); das Skript prüft ihre vollständigen SHA-256 vor dem Render. Keine fremden Videos oder KI-Dienste. Alle Zahlen in dieser Ausschnittliste sind SETZUNG des Skripts:

- Produktfoto: proportional ganz dargestellt, keine Form- oder Logoänderung.
- Wandfoto: Ausschnitt x=190, y=0, Breite=340, Höhe=510; im Video Breite=434, Höhe=651.
- Tischfoto: Ausschnitt x=339, y=505, Breite=190, Höhe=275; im Video Breite=434, Höhe=628 mit Rand. Die linken Gerätepartien sind bewusst als Detail angeschnitten.

GEMESSEN durch Sichtprüfung der Originale: Raumfotos enthalten ausserhalb der verwendeten Fenster Fremdschrift, Marken und private Bilder. Diese Bereiche werden durch die genannten Ausschnitte nicht gezeigt. Die Briefing-Angabe «sauber» gilt daher nicht pauschal für das vollständige Original.

QUELLE: Produktbezeichnung/Fotografiezuordnung aus dem Briefing; keine neue Shopify-, CJ-, Varianten-, Kaufbarkeits- oder kommerzielle Rechteprüfung in diesem Musterauftrag.

GEMESSEN: Musik aus `automation/music/luxe-premium.wav`, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`, frisch gegen Main-Blob `61de48704b2b3ae22fb028e6cf0a3c88e4826a7c` geprüft. SETZUNG: Quellsekunden 0–9, Einblendung 0.08 s, Ausblendung ab 8.2 s für 0.8 s, Pegelfaktor 0.8. Kein Voiceover. Der separate neue Musik-Hörentwurf wird hier nicht eingesetzt.

## Selbstprüfung und Grenzen

GEMESSEN: Aus genau der abgegebenen MP4 wurden Einzelbilder bei **1.5 s**, **4.5 s**, **7.5 s** exportiert und von Codex angesehen. In diesen Stichproben sind die Texte vollständig im Bild und lesbar; keine sichtbare Fremdschrift, fremden Logos, privaten Fotos oder Wasserzeichen. Das vollständige Produkt ist in Anfangs- und Schlusskarte zu sehen; der angeschnittene Mittelteil ist eine Detailansicht.

GEMESSEN/visueller Befund: Der kleine Ausschnitt des Tischfotos wirkt im Videoframe weicher als das weisse Produktfoto. SETZUNG: die Vergrösserung dieses Ausschnitts beträgt rund 2.28-fach in der Breite. Noch nicht gut: diese Quellauflösung begrenzt Details; feste Fotos belegen keine tatsächliche Bewegung oder Bedienung. Keine manuelle Hörabnahme, Plattform-Oberflächenprobe oder pauschale Qualitäts-/Werberechtefreigabe behauptet. Das Urteil über die Gestaltung und den Vergleich fällt der Inhaber.

GEMESSEN: Das Skript wurde lokal nachgespielt und mit `bash -n` geprüft. ffmpeg meldet bei der JPEG-Decodierung eine reparierte fehlende EOI-Markierung sowie veraltete Filter-/Pixelformat-Hinweise; der finale Render und das vollständige Decodieren enden erfolgreich. Kein Workflow gestartet, keine Geheimnisse verwendet, nichts publiziert oder in `automation/reels_seed.csv` geschrieben.

## Reproduktion

SETZUNG: Benötigt bash, curl, sha256sum, ffmpeg/ffprobe mit drawtext/libx264/AAC und die im Skript genannten DejaVu-Schriften. Sparse-Checkout nur der Musik und dieser Aufgabe genügt; kein vollständiger Repo-Download. Aus einem solchen Checkout:

```bash
bash dropship/reel-vergleich-0211/codex-lampe.sh
```

Das Skript stoppt bei abweichenden Quell-/Musikhashes; es schreibt nur die lokale MP4 neben sich und temporäre Dateien. Schriftdateien/ffmpeg-Version können die binäre Reproduktion beeinflussen. Keine automatische Veröffentlichung oder Git-Aktion im Skript.

## ffprobe-Ausgabe (GEMESSEN)

```json
{
  "programs": [],
  "stream_groups": [],
  "streams": [
    {
      "index": 0,
      "codec_name": "h264",
      "codec_type": "video",
      "width": 1080,
      "height": 1920,
      "pix_fmt": "yuv420p",
      "avg_frame_rate": "30/1",
      "duration": "9.000000",
      "nb_frames": "270"
    },
    {
      "index": 1,
      "codec_name": "aac",
      "codec_type": "audio",
      "sample_rate": "48000",
      "channels": 2,
      "avg_frame_rate": "0/0",
      "duration": "9.000000",
      "nb_frames": "423"
    }
  ],
  "format": {
    "duration": "9.000000",
    "size": "952271"
  }
}
```
