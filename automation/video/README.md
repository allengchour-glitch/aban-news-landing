# 🎬 LuxeStyle — Video-Build-Skripte (NIE VERLIEREN — User 2026-06-17)

> „Spichere jedes Video, Gehirn nid vergässe, dass i alli mau wieder cha zämesetze."
> Diese Skripte (früher nur in /tmp = weg bei Container-Neustart) sind jetzt PERSISTENT im Repo.
> Register aller Videos: **`VIDEO-REGISTRY.json`** (Name · Produkte · Build-Skript · Musik · CDN-URL).

## Skripte → Video
| Skript | Output | Beschreibung |
|---|---|---|
| `build_hero_ad.py` | `reels/luxe-hero-ad.mp4` | Schnelles A-Video, 16 Top-Produkte (Ken-Burns), Hook+CTA |
| `build_jewelry_cinematic.py` | `reels/luxe-jewelry-cinematic.mp4` | Cinematisch Schmuck (6 Bilder), elegant |
| `luma_generate_clips.mjs` + `assemble_ultimate.py` | `reels/luxe-ultimate-ad.mp4` | Luma img2video (4 Produkte animiert) + Montage |
| `luma_generate_clips.mjs` + `assemble_fashion.py` | `reels/luxe-fashion-motion.mp4` | Luma Mode-Clips + Montage |
| `build_montage.py` / `build_montage_fast.py` | `reels/luxe-(main-showcase\|showcase-fast).mp4` | Bild-Montagen (ruhig / schnell) |

## Zutaten (alles im Repo / via Key)
- **Produkte:** `automation/top_products.csv` · **Text-Karten:** `social/text_image_map.json`
- **Musik:** `automation/music/music_library.mjs` (CC-BY, Entscheid A) · **Schrift:** DejaVuSans-Bold
- **Luma:** `LUMA_API_KEY` (ray-flash-2, ~9000 Credits) · **Upload:** `automation/upload_to_shopify_cdn.mjs`
- **Queue:** `social/video_queue.csv` → Worker postet IG/FB; TikTok via `tiktok-cycle.ps1`

## Neu zusammensetzen (Beispiel ultimate)
```bash
LUMA_API_KEY=… node automation/video/luma_generate_clips.mjs      # erzeugt /tmp/ult/c*.mp4
python3 automation/video/assemble_ultimate.py                      # → reels/luxe-ultimate-ad.mp4
SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… node automation/upload_to_shopify_cdn.mjs reels/luxe-ultimate-ad.mp4
```
Pfade in den /tmp-basierten Skripten ggf. anpassen (sie nutzen /tmp als Arbeitsordner).
