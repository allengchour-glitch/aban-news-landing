# LuxeStyle — Social-Video-Ads (Reels / TikTok / Stories / Feed)

Stand: 2026-05-31 · Shop: **LuxeStyle** · Domain: **luxestyle.ch**

Vier fertige Werbeclips, je **mit eingebetteter Musik**, in Marken-Optik
(Creme `faf7f2` · Anthrazit `2c2c2c` · Gold `b8915a`, Serif-Headlines).
CTA durchgängig: **10 % Rabatt mit Code `WELCOME10`** (Code ist im Shop aktiv).

## Deliverables

| Datei | Format | Länge | Inhalt |
|-------|--------|-------|--------|
| `luxestyle_bestseller_9x16.mp4` | 1080×1920 (9:16) | ~20,5 s | Bestseller-Montage, 10 Live-Top-10-Produkte |
| `luxestyle_bestseller_1x1.mp4`  | 1080×1080 (1:1)  | ~20,5 s | dito, für Feed |
| `luxestyle_tour_9x16.mp4`       | 1080×1920 (9:16) | ~15,4 s | Live-Website-Tour (Auto-Scroll) |
| `luxestyle_tour_1x1.mp4`        | 1080×1080 (1:1)  | ~15,4 s | dito, für Feed |
| `luxestyle_hook_9x16.mp4`       | 1080×1920 (9:16) | ~8,5 s  | Schnelle TikTok-Hook-Version (10 Flashes) |
| `luxestyle_hook_1x1.mp4`        | 1080×1080 (1:1)  | ~8,5 s  | dito, für Feed |

Alle: H.264 / yuv420p + AAC-Stereo, `+faststart` (web-optimiert).
Die fertigen MP4s wurden direkt im Chat geliefert (nicht im Repo, um es schlank zu halten).
Im Repo liegen die **reproduzierbaren Render-Skripte** + Poster-Frames.

## Verwendungszweck
Für Meta (Instagram/Facebook Reels & Feed), TikTok und Stories. **Nicht** auf der
Live-Seite eingebettet — das Live-Theme ist schreibgesperrt. Für TikTok/Reels ggf.
zusätzlich den nativen Sound-Layer nutzen; die Clips haben aber bereits eine eigene Tonspur.

## Aktueller finaler Stil: „Modern v2" (mit Voiceover)
Auf Kundenwunsch umgestellt von der eleganten Serif-Optik auf einen **modernen** Look:
- Hintergrund Near-White `f4f3f1`, **fette Sans-Serif** (DejaVu Sans Bold), linksbündig.
- Vollflächiges Produkt, **Produkt-Counter „01/10"**, Gold-Akzentbalken.
- Animierte Typo (slide-up + fade-in via `drawtext` t-Ausdrücke), **„slideleft"-Übergänge**.
- Skripte: `render_modern.sh`, `hook_modern.sh`, `tour_modern.sh`. Output: `luxestyle_modern*`.

**Audio:** Musik **+ deutsche Sprecherstimme** (Voiceover). Stimme via Google-TTS
(`voiceover.sh`), gemischt mit **Sidechain-Ducking** (Musik dippt unter der Stimme).
Loudnorm `-14 LUFS`, Audiospur als Default.

## Verwendete Produkte (Modern-Set, 10)
Basis war die Live-„⭐ Top 10 Bestseller"; auf Kundenwunsch wurden 4 ersetzt
(Aurora→Lederarmband-Pfad: Aurora, Uhr, Salzlampe, Ladegerät raus):
1. Herren Lederarmband — CHF 29.90   *(ersetzt Himalaya Salzkristall-Lampe)*
2. Flame Diffuser Premium — CHF 49.90
3. Jade Roller & Gua Sha Set — CHF 14.90
4. Damen Portemonnaie XL — CHF 54.90   *(ersetzt 3-in-1 Wireless Charger)*
5. Wellness-Tablett Bambus — CHF 44.90
6. Mini Robo-Diffuser Auto — CHF 19.90
7. Bambus Aroma Diffuser — CHF 39.90
8. Seiden-Kissenbezug — CHF 39.90   *(ersetzt Galaxy Aurora Projektor)*
9. Slim Wallet Echtleder — CHF 49.90
10. Anti-Aging Serum — CHF 29.90   *(ersetzt Klassische Herrenuhr)*

> Hinweis: Eine ältere Variante in eleganter Serif-Optik mit der Live-Top-10-Auswahl
> existiert weiterhin via `render.sh` (siehe Git-Historie).

## Musik (lizenziert)
Adobe Stock, Free-Collection, royalty-free nach Lizenzierung über das verbundene Konto:
- Montage: **„Inspirational Uplifting Corporate"** — Adobe Stock ID `506618408`
- Website-Tour: **„Elegant Calm Corporate Music"** — Adobe Stock ID `506618148`

## Reproduktion / Pipeline
Voraussetzungen: `ffmpeg` (Distro-Paket), Node + Playwright (Chromium), DejaVu-Fonts.

```
# 1) Bestseller-Montage (beide Formate)
bash dropship/ads/render.sh            # erwartet Produktbilder in /tmp/ads/img/01..10
                                       # + Musik /tmp/ads/music/uplifting.wav

# 2) Website-Tour aufnehmen (Playwright, ignoreHTTPSErrors)
NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node dropship/ads/tour.js            # schreibt webm nach /tmp/ads/tour/<fmt>/

# 3) Tour zusammenbauen (Intro/Outro-Cards + Musik /tmp/ads/music/elegant.wav)
bash dropship/ads/tour_assemble.sh

# 4) TikTok-Hook (8,5 s) — nutzt die Segment-Clips aus Schritt 1
bash dropship/ads/hook.sh
```

Technik-Notizen:
- Ken-Burns-Zoom via `zoompan` (z = `min(1+0.0011*on,1.075)`), Crossfades via `xfade` (0,5 s).
- Overlays via `drawtext` (Serif/Sans, UTF-8 aus Textdateien) + `drawbox` (Goldlinie).
- Tour-Aufnahme bei CSS-Viewport-Größe (540×960 / 600×600), danach 2× Lanczos-Upscale,
  damit kein graues Padding entsteht. Cookie-Banner wird automatisch akzeptiert.

## Mode-/Kleider-Montage (Zusatz, 2026-05-31)
Auf Kundenwunsch eine eigene **Sommer-Mode-Montage** mit echten Model-Fotos:
- `luxestyle_mode_9x16.mp4` (1080×1920) + `luxestyle_mode_1x1.mp4` (1080×1080), ~21 s, mit Musik.
- Intro „LUXESTYLE · SOMMER-MODE · 2026", 9 Kleider + 1 Herrenhemd, Outro WELCOME10.
- Skript: `dropship/ads/render_mode.sh` (Bilder in `/tmp/ads/imgmode/01..10.jpg`, Musik `uplifting.wav`).
- Produkte: Savanna · Sirène (Abend) · Lumea · Brise · Fleurette · Daisy · Bali · Bluette · Noir · Herrenhemd Monsieur.
- In Shopify Files: 9:16 = `gid://shopify/Video/69552327754113`. 1:1 im Chat geliefert.

## Ablage in Shopify
Die beiden 9:16-Hero-Clips liegen jetzt in **Shopify Admin → Content → Files**
(via `stagedUploadsCreate` → GCS-POST 204 → `fileCreate`, contentType VIDEO):
- Top-10-Bestseller-Montage: `gid://shopify/Video/69552316612993`
- Website-Tour: `gid://shopify/Video/69552316645761`
(Der frühere Container-Fehler bei der Signatur-Übertragung tritt nicht mehr auf.)
Die 1:1- und Hook-Versionen wurden direkt im Chat geliefert.

## Optional / To-do
- Bei Bedarf auch 1:1- + Hook-Clips nach Shopify Files spiegeln (gleicher Weg).
- Varianten mit anderem Musik-Track oder Live-„Top 10"-Produkten auf Wunsch.
