# 🎬 Produkt-Video-Recipe: „drehendes Produkt, glänzend, toller Hintergrund" (User 2026-06-29 „merke dir das")

Standard für KI-Produkt-Werbung (Reels/Ads). Auslöser: cmd-poll-Befehl **`aurora-ai`** (Vorlage; pro Produkt anpassen).
Läuft am **PC** (Keys liegen dort: `FAL_KEY` + `GEMINI_API_KEY` + `ELEVENLABS_API_KEY`). Cloud kann die Keys NICHT.

## Pipeline (4 Schritte)
1. **Hero-Bild mit tollem Hintergrund** — `automation/nanobanana_lifestyle.mjs --image <produktfoto-url> --title "<name>" --style jewelry --out social/ai-lifestyle/<slug>-hero.png`
   (Gemini „Nano Banana" verwandelt das ECHTE Produktfoto in ein Premium-Studio-/Lifestyle-Bild mit schönem Hintergrund. Styles: jewelry/seetest/model/bag/home/beauty…)
2. **Drehendes, glänzendes Video** — `automation/seedance_video.mjs --image <hero.png> --prompt "luxury jewelry commercial, product slowly rotates/turns on a turntable, dazzling sparkle + glossy reflections, elegant background with soft bokeh + aurora glow, cinematic slow motion, no text" --res 720p --dur 5 --ar 9:16 --out reels/seedance-<slug>-N.mp4`
   (fal.ai/Seedance = Bild→Video, ~$0.11–0.22/Clip. Kurze ENGLISCHE Ad-Keywords > lange Prompts. „no text" — Text backen wir selbst in Post.)
3. **Stimme** — `automation/elevenlabs_tts.mjs "<deutsches Skript>" reports/<slug>-vo.mp3` (ELEVEN_VOICE_ID=Ljh056ZotKDfGTc2jGL4 = Bettina, warm). **ODER** User liefert HeyGen-Audio. **Piper = zu billig, nicht nutzen.**
4. **Assembly (Cloud, ffmpeg):** Seedance-Clips per `xfade` (weiche Fades, KEIN fadeblack) → Premium-Grade (`eq` sat/contrast + `vignette`) → VO `loudnorm=I=-15` + Musik (`music_library.mjs pick`, Kevin MacLeod CC-BY, `volume≈0.18`, afade) → Safe-Zone-Text (`drawtext`, y≤1500) → 1080×1920, `libx264 -pix_fmt yuv420p +faststart`.

## Lehren (FEST)
- **Kein Geflacker:** echtes i2v (Seedance) ODER Ken-Burns NUR mit Hi-Res-Vorskalierung (`scale=2160` vor `zoompan`, split für bg/fg) + weiche `xfade=fade` (kein fadeblack) + statische (nicht pro-Frame animierte) eq/vignette.
- **Stimme:** ElevenLabs/HeyGen, NIE piper (User: „mag ich gar nicht").
- **Bild-Check Pflicht:** jedes Quellbild ansehen (keine asiatische Schrift/Watermark) vor Nutzung.
- **Sound-Regel:** TikTok = stumm hochladen (Trend-Sound in App); Meta/IG+FB = Musik einbacken.
- **3D echt vs Pseudo:** Seedance(fal)=echte 3D-Bewegung (gewählt). Luma=403 (Key fixen). Veo=Google-Setup. „Alle" nur bei Bedarf (Kosten).

## 🎬 LEHRE — TikTok Smart+ Video-Upload (User 2026-06-29 „du musst lernen klick / merke für spätere videos")
- Nach `setInputFiles` meldet TikTok oft **„Fehlgeschlagen — Optimierung erforderlich"** (Reel-Specs nicht 100% konform).
- **FIX (im Bot eingebaut):** Haken **„Fehlgeschlagene Videos optimieren"** setzen (alle Checkboxen mit „optimier" im Label) + den blauen **„Hochladen"**-Button im Modal per DOM-Klick → TikTok optimiert das Video selbst.
- **Besser/präventiv:** Reels VOR dem Upload TikTok-konform encodieren — `ffmpeg -vf scale=720:1280 -c:v libx264 -pix_fmt yuv420p -r 30 -b:v 4M -movflags +faststart` (9:16, H.264, ≤~500MB). Dann keine Optimierungs-Schleife nötig.
- Allgemein „klick lernen": fiddlige Buttons/Checkboxen lieber per `frame.evaluate(()=>el.click())` (DOM-Klick) als per Playwright-Locator — umgeht Overlay/Actionability-Probleme.

## 📺 GELERNT von YouTube — "AI Jewelry ad" (Runway Bliss, 12k Views, User 2026-06-29)
Stil eines erfolgreichen KI-Schmuck-Ads zum Klauen:
- **ON-MODEL statt nur Produktfoto:** Schmuck AN einer Frau getragen (Hals/Dekolleté), warmes Editorial-Licht → emotionaler + konversionsstärker als Produkt-auf-Seide. Nano-Banana-Prompt: "elegant young woman wearing this exact necklace on her neck, warm editorial lighting, soft beige tones, premium fashion editorial, photoreal, close-up neck/decollete".
- **CUTOUT + PFEIL-Element:** kleines freigestelltes Produktbild (weisser BG) eingeblendet + geschwungener Pfeil (drawtext/Overlay) der auf die getragene Stelle zeigt = "Produkt -> so sitzt es". Starker Aufmerksamkeits-Hook.
- **Warme Editorial-Toene** (beige/gold), cleane Komposition, ~12s, Hashtags #aijewelry #adcreative #editorial.
- ANWENDEN: aurora-ai/jewelry-Reels -> 1x On-Model-Hero (Nano Banana) + 1x Produkt-Cutout, Seedance-Bewegung, Cutout-Pfeil-Overlay in der ffmpeg-Assembly.

## 📺 GELERNT — ÉBISA (ebisa.ch, SCHWEIZER KONKURRENT!) "Personalisierte Gravur-Halskette" (User 2026-06-29)
- 🇨🇭 DIREKTER CH-Konkurrent (ebisa.ch): personalisierte Gravur-Schmuck, Geschenk-/Emotions-Positionierung. Beobachten!
- STIL = STORY/EMOTION, nicht Produkt: cinematische KI-Szene (2 Freundinnen Cafe, golden hour, Bokeh, eine traegt+beruehrt die Kette). Verkauft das GEFUEHL/den Moment.
- Cinematic-Film-Look + REALISTISCHE MENSCHEN (echter Werbespot-Look, KI). Produkt subtil getragen, kein Close-up.
- Geschenk-Bedeutungs-Copy ("Schmuck, der Erinnerungen traegt", Name/Datum/Botschaft gravieren).
- ANWENDEN: warme Geschenk-Story-Copy + getragene Kette. Volle KI-Menschen-Szenen (ÉBISA-Niveau) = Text-zu-Video (Veo/Kling/Runway) noetig -> fuer spaeter, wenn Zugang/Budget. Bis dahin: On-Model-Hero (Nano Banana) + emotionale Geschenk-Hooks.
- KOMBI-REZEPT Schmuck-Ad: (1) On-Model getragen (Runway-Bliss-Stil) + (2) Geschenk-Emotion-Hook (ÉBISA-Stil) + (3) Cutout+Pfeil + (4) warmes Editorial-Grade.
