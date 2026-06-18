# 🧠 LuxeStyle — GRATIS-KI-STACK (jede KI in ihrer Stärke, User 2026-06-18 „suche alle gratis KI zur Hilfe, jede in deine Stärke")

> Prinzip: **EIN Router pro Aufgabe** probiert mehrere Gratis-Anbieter der Reihe nach durch — fällt einer aus
> (Quota/429/down), nimmt er den nächsten; ohne jeden Key = Template/Cache-Fallback → **Automation bricht NIE**.
> Keys NUR aus ENV/`luxe-secrets.ps1` (NIE ins Repo). ✅=schon verdrahtet · ➕=nice-to-add (Key/PC nötig).

---

## ✍️ TEXT (Captions, Hooks, Beschreibungen, Chat-Antworten)
**Router: `automation/ai/ai_generate.mjs`** — Kette: groq → gemini → openrouter → cloudflare → mistral → openai → Template.
| KI | Stärke | Status |
|---|---|---|
| **Groq (Llama/Mixtral)** | **#1 Tempo** — blitzschnell, grosszügiges Gratis-Limit → Massen-Captions/Hooks | ✅ `GROQ_API_KEY` gesetzt |
| **Google Gemini Flash** | Reasoning + lange Kontexte + **Vision** (Bild-Analyse) | ✅ `GEMINI_API_KEY` gesetzt |
| **OpenRouter** | Sammel-Gateway zu vielen Gratis-Modellen (DeepSeek/Qwen) — breiter Fallback | ✅ optional `OPENROUTER_API_KEY` |
| **Mistral** | solide EU-Modelle, eigenes Gratis-Tier | ✅ optional `MISTRAL_API_KEY` |
| **Cloudflare Workers AI** | Llama im Worker, gratis-Tier | ✅ optional |
| **Claude (ich)** | beste Strategie/Mundart/Redaktion, Memory-Pflege | ✅ diese Session |

## 🖼️ BILD (Hintergründe, Lifestyle, Banner, Story-Backdrops)
**Router: `automation/ai/image_gen.mjs`** — Kette: pollinations → cloudflare → huggingface.
| KI | Stärke | Status |
|---|---|---|
| **Pollinations (FLUX)** | **KEIN Key, unbegrenzt** → Default für Backdrops/Banner | ✅ verdrahtet |
| **Cloudflare FLUX-schnell** | schneller Gratis-Tier, sauberer Output | ✅ (Key optional) |
| **HuggingFace FLUX.1** | Modell-Vielfalt über Inference-API | ✅ `HF_API_KEY` optional |
| **Ideogram** | **Text-IM-Bild** (Schrift in Grafik korrekt) — für Sale-Karten/Preis-Banner | ➕ Web/PC, kein API-Gratis |
| **Leonardo.ai** | 150 Tokens/Tag, viele Stile, **kein Wasserzeichen** | ➕ PC/Web |
| **Google Gemini (Nano-Banana)** | bester Gratis-Bildgen mit Text-Rendering (~20/Tag) | ➕ über Gemini-Key erweiterbar |
| **Craiyon / Mage / Dezgo** | 0-Signup-Notfall | ➕ Web |
> ⚠️ KI-Bilder NUR Hintergrund/Lifestyle — **NIE ein echtes Produkt fälschen** (Misrepresentation).

## 🎬 VIDEO (Reels, Produkt-Clips)
| KI | Stärke | Status |
|---|---|---|
| **ffmpeg-Builder** (`build_masterpiece.py`/`build_montage_fast.py`) | **Default** — Bild→Reel, Ken-Burns, Text, Musik, 100% gratis/offline | ✅ Standard |
| **Luma Dream Machine (ray-flash-2)** | Bild→Video, echte Bewegung; ~9600 Credits Guthaben | ✅ `luma_product_video.mjs` (Key transient) |
| **Kling V3.0 Turbo** | beste Image-to-Video-Physik, tägliche Gratis-Credits, kein WZ | ➕ PC/Web |
| **Veo 3 / ZSky** | Top-Realismus, Video **mit Ton** | ➕ Web (Gratis-Limit) |
| **Pika** | 150 Gratis-Credits/Monat für Motion | ➕ Web |

## 🎵 MUSIK & 🎙️ STIMME
| KI | Stärke | Status |
|---|---|---|
| **music_library** (Kevin MacLeod CC-BY) | **kommerziell-frei** → Standard für Live-Ads | ✅ `automation/music/music_library.mjs` |
| **ElevenLabs Music** | moderne Tracks, kommerziell (Gratis-Tier) | ✅ `automation/eleven-music.mjs` (Key) |
| **Suno** | echte Songs **mit Gesang** (Live-Ad = Pro) | ➕ PC-Port |
| **piper TTS (Kerstin)** | gratis/offline DE-Voiceover | ✅ verdrahtet |
| **ElevenLabs TTS** | natürlichste Stimme | ✅ `elevenlabs_tts.mjs` (Key) |

## 👁️ ANALYSE / VISION
| KI | Stärke | Status |
|---|---|---|
| **Gemini Vision** | Bild-Audit (Watermark/asiat. Schrift), Frame-QA | ✅ `automation/image-audit.mjs` |
| **Claude (ich)** | Strategie, Trend-Auswertung, Memory, Code | ✅ |
| **Google-Trends-CH** | gratis Trend-Signale (kein Key) | ✅ `automation/trends/trend_scan.mjs` |

---
## 📌 Fazit
- **Schon nutzbar ohne 1 Klick:** Text (Groq+Gemini), Bild (Pollinations), Video (ffmpeg+Luma), Musik (CC-BY+ElevenLabs), Voice (piper), Vision (Gemini) — alles über Router mit Fallback.
- **Grösster Gratis-Zuwachs mit minimalem Aufwand:** **Ideogram/Leonardo** für Text-in-Bild-Sale-Karten + **Kling/Pika** für bewegte Produkt-Clips (PC/Web, kein API nötig).
- Health-Check `automation/health-check.mjs` zeigt live, welche Provider antworten.

### Quellen (Recherche 2026-06-18)
- BasedLabs — Best Free AI Image Generators 2026: https://www.basedlabs.ai/articles/best-ai-image-generator-free
- zPlatform — 60 Best Free AI Image Generators 2026: https://zplatform.ai/best-ai-tools/best-free-ai-image-generators/
- BIGVU — Best Free AI Image-to-Video 2026: https://bigvu.tv/blog/best-free-ai-image-video-generators-2026-tested-ranked/
- WaveSpeed — 8 Best Free AI Video Generators 2026: https://wavespeed.ai/blog/posts/best-free-ai-video-generators-2026/
- Wireflow — 10 Free AI Video Generators in Browser 2026: https://www.wireflow.ai/blog/top-10-free-ai-video-generators-you-can-use-online-in-2026
