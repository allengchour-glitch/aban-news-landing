---
tags: [system, content]
quelle: TikTok @herr_tech
gelernt: 2026-09-12
---
# System 2 — Content-Maschine

Das Video: Claude scannt jeden Morgen, welche viralen Beiträge gerade funktionieren, baut daraus
eine eigene Version im eigenen Ton, fertiges Bild dazu, bis zu 10 Posts pro Tag. Belegt mit
8 Mio. LinkedIn-Views in 30 Tagen, 23 000 Profilbesuchern, 8000 neuen Followern.

## Stand hier — dieses System steht bereits

| Baustein | Datei |
|---|---|
| Trend-Lernen | `automation/second_brain.mjs`, Branch `brain/youtube` |
| Trends zu Captions | `automation/autopilot/trends_to_captions.mjs` |
| Bild-Generator | `automation/gen_post_image.py` (1080×1350 + 1080×1080) |
| Autopilot IG/FB/Threads | `automation/social-autopost-meta.mjs` |
| TikTok | `automation/tiktok-autopost.mjs`, `tiktok-cloud-autopost.mjs` |
| Reels | `dropship/ads/render_premium_reel.sh` |
| Selbst-Lern-Schleife | `automation/learn_from_analytics.mjs` |

## Die wichtigste Einschränkung

[[Masse-ist-kein-Hebel]]: bei LuxeStyle hat mehr Content gemessen **0** Käufe gebracht. Das
System zu erweitern ist hier kein Hebel. Das Video verkauft Reichweite; dieses Repo hat Reichweite
und keine Kaufabsicht.

Merksatz aus dem Video, der trotzdem stimmt: **„Content ist nie das Ziel, Content ist der Motor."**
Der Motor läuft. Es fehlt das Getriebe: [[Lead-Maschine]].

## Feste Präferenzen des Users

Alle Marketing-Videos **ohne Voiceover** (on-screen Text statt Stimme), Musik immer
`automation/music/luxe-premium.wav`. Quelle: `dropship/VIDEO-PRAEFERENZEN.md`.
