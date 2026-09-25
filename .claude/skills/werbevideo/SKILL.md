---
name: werbevideo
description: Immer wenn aus Bildern ein Video werden soll - Werbevideo, Reel, TikTok, Produktvideo, Anzeige, Slideshow, Ken Burns, ffmpeg-Render - und immer wenn ein bestehendes Reel beurteilt oder verbessert werden soll. Enthält die gemessenen Regeln für die ersten drei Sekunden, die drawtext-Fallen und das Werkzeug, das ohne Zugangsdaten läuft.
---

# Aus Bildern ein Werbevideo — die teuer gelernten Regeln

Node ist **`/opt/node22/bin/node`**. ffmpeg und ffprobe sind da. Vor jedem Einsatz
`--selbsttest` laufen lassen, sonst ist jede Zahl ein Verdacht.

## Zuerst: es gibt schon etwas

| Zweck | Werkzeug |
|---|---|
| **Ein Produkt → ein Werbevideo** (Produktseite, Anzeige) | `node automation/produkt_werbevideo.mjs <handle>` |
| **Wann ist das Produkt im Video zu sehen?** | `node tools/video_hook.mjs reels/*.mp4` |
| Montage aus mehreren Produkten (Feed) | `N=5 dropship/ads/auto_render.sh` |
| Der eigentliche Renderer darunter | `dropship/ads/render_premium_reel.sh` |

⚠️ **`auto_render.sh` baut Montagen aus MEHREREN Produkten** (`[ "$k" -ge 2 ] || exit 0`, gemessen
19.09.). So ein Video darf **nie** auf eine Produktseite — es zeigt dort fremde Ware. Für die
Produktseite ist `produkt_werbevideo.mjs` da.

## Die ersten drei Sekunden gehören dem Produkt

**GEMESSEN (23.09., `tools/video_hook.mjs`, alle 107 Videos in `reels/`):** **57 zeigen das Produkt
erst ab 2,5–2,7 s**, 49 ab 0,0 s. Die 57 späten sind **genau die `render_premium_reel.sh`-Linie**
(48 davon `auto-*`) — davor steht deren 3,0-s-Marken-Karte.
⚠️ Nicht aus den ersten Dateien schliessen: **alphabetisch sortiert bündeln die ersten Einträge
eine einzige Produktionslinie.** Immer alle messen. **QUELLE (2026):** die ersten 3 Sekunden entscheiden
(Kennzahl *Hook Rate*), und man soll ausdrücklich **mit dem Produkt öffnen, nicht mit einer
Logo-Animation**. Die Marke gehört ans **Ende**.

Weiter aus denselben Quellen, als QUELLE zu behandeln (am eigenen Shop nicht nachgemessen):
- **85 PROZENT der Meta-Videoaufrufe laufen ohne Ton** → der Text muss im Bild stehen.
- Gute kurze vertikale Anzeigen sind **7–15 s** (unsere alten Reels: 17,3 s).
- Ein Produktvideo auf der Produktseite: **+10–25 PROZENT ATC** (Runde vom 13.09.).

Deckungsgleich mit der festen User-Regel aus `dropship/VIDEO-PRAEFERENZEN.md`: **kein Voiceover,
Text im Bild, Musik `automation/music/luxe-premium.wav`.**

## Vier Fallen beim Rendern

1. **`%` verschwindet in `drawtext` stillschweigend** → „PROZENT" schreiben.
2. **Emoji fehlen in DejaVu** und werden zu leeren Kästchen → nur in Captions, nie im Bild.
3. **Zeichenzahl ist nicht Pixelbreite.** Ein auf 34 Zeichen gedeckelter Haken lief trotzdem links
   und rechts aus dem Bild: „Taktische Outdoor Warnweste für" sind 31 Zeichen und bei 60 px
   **über 1080 px breit**. Breite **messen** (`textBreite()` misst mit ffmpeg selbst), nicht zählen.
4. **`zoompan` ruckelt**, wenn die Quelle klein ist → **vorher auf 2160×3840 hochskalieren**, dann
   rechnet zoompan auf feinem Raster (sub-pixel-glatt). Steht so in `render_premium_reel.sh:33`.

## Zwei Regeln fürs Ergebnis

- **Immer dieselbe Kamerafahrt ist eine Diaschau.** Im Wechsel: hinein, heraus, waagrecht,
  senkrecht. Ein Produkt mit nur **einem** Foto bekommt dasselbe Foto dreimal — aber mit drei
  **verschiedenen** Fahrten, sonst reicht es nicht auf 7 s.
- **Zwei Tonspuren ausgeben:** `<name>.mp4` mit Musik (FB/Ads) und `<name>-clean.mp4` mit leisem
  Tonbett (TikTok/IG). **Trend-Sounds dürfen nie ins File gebrannt werden**, die legt die App drüber.

## Und die wichtigste: hinsehen

Ein grüner Selbsttest beweist nur, dass der Code tut, was der Test prüft. **Ob der Test das Richtige
prüft, sieht man erst am Ergebnis.** `produkt_werbevideo.mjs` schreibt darum ein Deckblatt
(`produkt-<handle>.jpg`) — dieses Bild ansehen, bevor man „fertig" meldet. Genau so wurde die
Breiten-Falle gefunden, nachdem alle Zahlen grün waren.

## Zugangsdaten

Keine nötig. **GEMESSEN:** `https://luxestyle.ch/products/<handle>.js` liefert Titel, alle
Bild-Adressen und die Preise in Rappen ohne Token. Er **drosselt** aber (HTTP 429) nach vielen
Abrufen — das heisst „warte", nicht „Produkt fehlt".

Volle Herleitung mit allen Messungen: `dropship/LERNEN-BILD-ZU-VIDEO-2026-09-23.md`.
