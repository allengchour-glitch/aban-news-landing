# 🎬 Seedance 2.0 Produkt-Ad-Prompts (2026-07-04)

> Lehre aus User-Video „Fastest Way to Create Product Ads Using Seedance 2 + Claude": kurze englische Ad-Keyword-Prompts,
> Original-Produktfoto als Referenz-Bild, „environmental sound only / no music", 9:16, „no text, no watermark".
> Pipeline: `node automation/seedance_video.mjs --image <CDN-URL> --prompt "<prompt>" --res 720p --dur <s> --ar 9:16 [--audio] --out reels/<x>.mp4`
> (Seedance 2.0 fast jetzt Default-Modell; ~$0.24/Sek → ~$1.20 pro 5-Sek-Clip. Braucht FAL_KEY am PC/VPS. DRY: `--dry`.)
> Musik: TikTok stumm (Trend-Sound in-App), IG/FB eigene lizenzfreie Musik (music_library.mjs) im Post drüberlegen.

## 💍 Wasserfester Edelstahl-Schmuck
1. **Gliederkette** (5s, audio aus): `A single stainless steel link chain necklace resting on dark wet slate, slow cinematic push-in, water droplets slide along the polished links catching soft studio light, gentle glints travel across the metal, shallow depth of field, premium luxury product commercial, environmental sound only, no music, no text, no watermark, 9:16 vertical`
2. **Armband am Handgelenk** (5s, aus): `Close-up of a stainless steel bracelet on a woman's wrist, she slowly turns her hand, the polished steel catches a moving highlight, soft natural window light, subtle sparkle across the surface, elegant slow motion, luxury jewelry ad, shallow depth of field, environmental sound only, no music, no text, no watermark, 9:16 vertical`
3. **Ohrringe (Creolen)** (4s, aus): `A pair of stainless steel hoop earrings suspended and gently rotating on a soft neutral background, cinematic orbit camera, clean rim light traces the curved metal edges, smooth reflections glide across the surface, minimalist premium product film, shallow focus, environmental sound only, no music, no text, no watermark, 9:16 vertical`
4. **Wassertest-Demo** (6s, audio AN = echtes Wasserplätschern passt): `A stainless steel pendant necklace under a slow stream of clear water, droplets bead and roll off the polished steel, the surface stays bright and clean, soft cinematic slow motion, dark moody background with a single soft light, macro detail, environmental sound only, no music, no text, no watermark, 9:16 vertical`
5. **Schmuckset Flatlay-to-Life** (5s, aus): `A matching set of stainless steel necklace and bracelet arranged as a flatlay on smooth beige stone, slow top-down camera rise, soft light sweeps across the pieces revealing gentle reflections, calm luxury unboxing mood, shallow depth of field, premium product commercial, environmental sound only, no music, no text, no watermark, 9:16 vertical`

## 👗 Sommermode / Sommerkleider (alle audio aus)
1. **Leinen-Maxikleid Promenade** (5s): `cinematic fashion ad, woman in flowing white linen maxi dress walking slowly along a seaside promenade, gentle fabric movement in the breeze, hem and hair drifting softly, warm golden-hour daylight, elegant relaxed pace, shallow depth of field, 9:16 vertical, no text, no watermark, environmental sound only, no music`
2. **Chiffon-Kleid Makro-Brise** (4s): `cinematic fashion ad, close-up of floral chiffon summer dress fluttering in a light sea breeze, delicate fabric ripples and translucent glow, soft natural daylight backlight, slow graceful motion, macro detail on fabric texture, 9:16 vertical, no text, no watermark, environmental sound only, no music`
3. **Trägerkleid Dachterrasse-Twirl** (6s): `cinematic fashion ad, woman slowly twirling in a light pastel strappy summer dress on a sunny rooftop terrace, skirt flaring gently outward, soft airy fabric movement in breeze, bright soft daylight, elegant and joyful, smooth camera, 9:16 vertical, no text, no watermark, environmental sound only, no music`
4. **Strandkleid am Wasser** (5s): `cinematic fashion ad, woman standing by the water in a light striped beach dress and sun hat, dress fabric and hat ribbon swaying gently in the wind, calm ocean behind, soft warm daylight, serene elegant mood, subtle camera push-in, 9:16 vertical, no text, no watermark, environmental sound only, no music`
5. **Boho-Kleid Blumenfeld** (6s): `cinematic fashion ad, woman walking through a sunlit flower field in an airy bohemian summer dress, loose fabric flowing and brushing against tall grass, gentle breeze lifting the hem, warm soft daylight, dreamy elegant atmosphere, slow tracking shot, 9:16 vertical, no text, no watermark, environmental sound only, no music`

## ⚽ Fan-Trikot selbst gestalten (generisch, keine Lizenzmarke; alle audio aus)
1. **360°-Hero-Rotation** (5s): `red football jersey slowly rotating 360 degrees on invisible mannequin, fabric gently sways, soft studio spotlight sweeping across surface, macro focus pull to chest emblem, cinematic sports apparel ad, subtle motion, premium studio lighting, dark seamless background, no text, no watermark, no logo`
2. **Stoff-Detail Makro** (4s): `extreme macro shot gliding over breathable red jersey fabric texture, light traveling across embroidered swiss cross and number, fine mesh detail shimmering, shallow depth of field, cinematic sports apparel ad, subtle slow motion, premium studio lighting, no text, no watermark, no logo`
3. **Anziehen Over-the-Head** (6s): `person pulling red jersey over head in slow motion, fabric flowing down onto shoulders, back reveals name and number, natural body movement, cinematic sports apparel ad, subtle motion, soft directional studio light, clean neutral background, no text overlay, no watermark, no logo`
4. **Wind-Fabric-Flow** (5s): `red jersey gently rippling in soft breeze on stand, fabric waving elegantly, slow lateral camera dolly past chest emblem, floating dust particles in light beam, cinematic sports apparel ad, subtle motion, premium studio lighting, dark backdrop, no text, no watermark, no logo`
5. **Personalisierungs-Reveal** (6s): `slow push-in from swiss cross emblem sweeping to jersey back showing custom name and number, smooth focus pull, gentle fabric shift, hero product spotlight, cinematic sports apparel ad, subtle motion, premium studio lighting, seamless dark background, no added text, no watermark, no logo`

---
**Geld-Hinweis (ehrlich):** Seedance 2.0 kostet echtes fal-Guthaben (~$1.20 pro 5-Sek-Clip fast/720p). Erst 1–2 Test-Clips prüfen,
bevor eine ganze Charge gerendert wird. v1 (günstiger) bleibt als Fallback in der Modell-Kette. Kein Auto-Render ohne FAL_KEY.
