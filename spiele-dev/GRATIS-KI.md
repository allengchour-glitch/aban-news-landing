# 🆓 Gratis-KI-Quellen (Stand 27.07.2026 — geprüft aus der Cloud-Session)

| Quelle | Status | Nutzung |
|---|---|---|
| **Pollinations BILD** (`image.pollinations.ai/prompt/<urlencoded>?width=&height=&nologo=true&seed=`) | ✅ GRATIS, keyless, funktioniert durch den Proxy | Texturen (kachelbar, "no objects, tileable material swatch" in den Prompt!), OG-Banner, Game-Art. 512px ≈ 30-100KB |
| Pollinations TEXT | ❌ seit 2026 paywalled (402) | – |
| **Kimi/Moonshot API** | ❌ Guthaben leer ("suspended, insufficient balance") — User müsste aufladen | war: kimi-k3, Schwärme, JSON-Mode |
| Gemini API | ❌ kein Key in der Cloud-Session (nur als GitHub-Actions-Secret) | Actions-Workflows nutzen ihn |
| piper-TTS lokal | ❌ Container-Recycle löscht ihn — pro Session neu installierbar | Voiceover (Marketing: bewusst OHNE Voice) |
| Meshy (3D) | ❔ Key nur in Actions-Secrets | GLB-Modelle (frühere Sessions) |

## Gelerntes
- **KI-Fallen:** Textur-Prompts ohne "no objects / material swatch" liefern Requisiten im Bild (Schüsseln in den Fliesen!). IMMER visuell prüfen vor Commit.
- **Traumhaus-Hook-System:** `ladeTex("textures/th/<name>.jpg")` — Dateien einfach liefern, Code hat Flachfarben-Fallback (Android-sicher). Bediente Hooks: parkett, marmor, teppich, laminat, rasen, backstein, putz, sand.
- OG-Banner: `og-arcade.jpg` (1200×630, Synthwave) für spiele.html.
