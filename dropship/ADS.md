# LuxeStyle — Social-Video-Ads (Reels / TikTok / Stories / Feed)

Stand: 2026-05-31 · Shop: **LuxeStyle** · Domain: **luxestyle.ch**

Vier fertige Werbeclips, je **mit eingebetteter Musik**, in Marken-Optik
(Creme `#faf7f2` · Anthrazit `#2c2c2c` · Gold `#b8915a`, Serif-Headlines).
CTA durchgängig: **10 % Rabatt mit Code `WELCOME10`** (Code ist im Shop aktiv).

## Deliverables

| Datei | Format | Länge | Inhalt |
|-------|--------|-------|--------|
| `luxestyle_bestseller_9x16.mp4` | 1080×1920 (9:16) | ~20,5 s | Bestseller-Montage, 10 Hero-Produkte |
| `luxestyle_bestseller_1x1.mp4`  | 1080×1080 (1:1)  | ~20,5 s | dito, für Feed |
| `luxestyle_tour_9x16.mp4`       | 1080×1920 (9:16) | ~15,4 s | Live-Website-Tour (Auto-Scroll) |
| `luxestyle_tour_1x1.mp4`        | 1080×1080 (1:1)  | ~15,4 s | dito, für Feed |

Alle: H.264 / yuv420p + AAC-Stereo, `+faststart` (web-optimiert).
Die fertigen MP4s wurden direkt im Chat geliefert (nicht im Repo, um es schlank zu halten).
Im Repo liegen die **reproduzierbaren Render-Skripte** + Poster-Frames.

## Verwendungszweck
Für Meta (Instagram/Facebook Reels & Feed), TikTok und Stories. **Nicht** auf der
Live-Seite eingebettet — das Live-Theme ist schreibgesperrt. Für TikTok/Reels ggf.
zusätzlich den nativen Sound-Layer nutzen; die Clips haben aber bereits eine eigene Tonspur.

## Bestseller-Montage — verwendete Produkte (Quelle: Collection „Home page")
1. Diver Pro Automatic 200M — CHF 149.90
2. Klassische Herrenuhr — CHF 129.90
3. Smartwatch Pro AMOLED — CHF 79.90  *(Produktbild aus Listing freigestellt/zugeschnitten)*
4. Bluetooth Kopfhörer ANC — CHF 69.90
5. 3-in-1 Wireless Charger — CHF 39.90
6. Slim Wallet Echtleder — CHF 49.90
7. Damen Portemonnaie XL — CHF 54.90
8. Herren Lederarmband — CHF 29.90
9. Seiden-Kissenbezug — CHF 39.90
10. Anti-Aging Serum — CHF 29.90

> **Hinweis Konsistenz:** Die Live-Startseite zeigt im Abschnitt „⭐ Top 10 Bestseller"
> eine andere Auswahl (Himalaya-Salzlampe, Flame Diffuser …). Die Montage nutzt bewusst
> die höherpreisigen Premium-Heroes der „Home page"-Collection. Beide Sets sind echte
> LuxeStyle-Produkte. Bei Bedarf kann die Montage auf das Live-„Top 10"-Set umgestellt werden.

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
```

Technik-Notizen:
- Ken-Burns-Zoom via `zoompan` (z = `min(1+0.0011*on,1.075)`), Crossfades via `xfade` (0,5 s).
- Overlays via `drawtext` (Serif/Sans, UTF-8 aus Textdateien) + `drawbox` (Goldlinie).
- Tour-Aufnahme bei CSS-Viewport-Größe (540×960 / 600×600), danach 2× Lanczos-Upscale,
  damit kein graues Padding entsteht. Cookie-Banner wird automatisch akzeptiert.

## Optional / To-do
- Upload nach **Shopify Admin → Content → Files**: per Drag-and-Drop (Staged-GCS-Upload
  via API schlug im Container an der Signatur-Übertragung fehl — kein Blocker).
- Varianten mit anderem Musik-Track oder Live-„Top 10"-Produkten auf Wunsch.
