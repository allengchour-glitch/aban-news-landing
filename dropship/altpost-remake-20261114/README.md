# Vasen-Remake · wiederhergestellt am 15.11.2026

Zwei unveröffentlichte Entwürfe aus dem vorhandenen älteren Clip `reels/clip-craquele-vase.mp4`: neues Layout, Gesamtansicht/Detail/Markenabschluss, gut lesbare Texte und kleiner Hinweis «Videoentwurf». Keine neue Bildgenerierung und keine Aussage, dass der alte Beitrag aktuell online ist. Quelle und Produkteigenschaften wurden nicht live im Shop bestätigt.

Die Ausgaben liegen unter `reels/entwuerfe/altpost-remake-20261114/`:

- `vase-layout-neu-ohne-ton.mp4`
- `vase-layout-neu-mit-musik.mp4`

Die Musikversion übernimmt dieselbe H.264-Bildspur ohne erneute Videokodierung. Sie verwendet Mixkit «Serene View», Nr. 443, ab Sekunde 16. Musik sanft ein-/ausgeblendet, Zielpegel −24 LUFS, True-Peak-Grenze −2 dBTP. Lizenzbeleg: `automation/music/CREDITS.txt`, Mixkit Stock Music Free License laut gespeichertem Nachweis vom 02.11.2026; keine separate Weitergabe der Musikdatei. Keine Hörprüfung behauptet.

Vorgabe: 10,2 Sekunden, 306 Bilder bei 30 fps, 1080 × 1920, H.264. Wiederherstellung der am 14.11. besprochenen Fassung nach Ersetzung des Cloud-Workspaces. Tatsächliche Prüfung in `qa.json`.

Nachbau vom Repository-Root:

```bash
python3 dropship/altpost-remake-20261114/render.py
```

Benötigt FFmpeg/FFprobe, Python 3 und DejaVu-Schriften. Kein Konto, Token oder Netzwerk im Renderer. Keine Social-Veröffentlichung, kein Eintrag in Metricool, keine Änderungen an Shop, Freigabelisten oder produktiven Warteschlangen.
