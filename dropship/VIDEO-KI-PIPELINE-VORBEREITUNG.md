<!-- Auto-Recherche 2026-06-28 (Sammler-Session). NUR INFO / abholbereites Paket für die Video-/Content-Session ("er"),
falls gewünscht. Die Sammler-Session baut/postet NICHTS — sie hat nur recherchiert + an die bestehende Pipeline angedockt.
Quellen-Auslöser: User-Video youtube.com/watch?v=yOkUmfNdNIk + Tool-Recherche (10+ Quellen, Juni 2026). -->

# 🎬🤖 KI-Video-Pipeline — abholbereites Paket für die Video-Session

> **Was das ist:** Ein fertig recherchiertes „Pack & Play"-Paket, um **echte Produktfotos mit KI in 3–5-Sekunden-
> Hook-Clips zu animieren** und über die **bereits existierende** Reel-Pipeline zu branden + zu posten. Nichts hier ist
> aktiviert — es wartet auf die Video-Session.
>
> **Goldene Leitplanke (unverändert, `REEL-REGELN.md` Regel 1):** KI nur für **Bewegung/Mood**, NIE um Produkte zu
> erfinden/verfälschen. Startframe ist immer das **echte** Produktfoto. Jeder KI-Clip durchläuft das **Freigabe-Gate**
> (Regel 9), weil image-to-video das Produkt verformen kann.

---

## 0. Auslöser: das User-Video (ehrlich eingeordnet)

Video: **„$3000 Animated Website in 10 min with free AI tools"** (Kanal *Creativo*, 19.05.2026).
Workflow dort: ChatGPT → Google AI Studio → **Kling AI** (Bild→Video) → Cloudinary → **Netlify**.

- ✅ **Übernehmen:** der **Kling-AI-Baustein** (echte Bilder in Bewegung) — das ist der eine echte Hebel und passt 1:1
  in unsere Reel-Pipeline.
- ❌ **NICHT übernehmen:** Shop auf Netlify neu bauen (LuxeStyle = Shopify/Horizon, Checkout/TWINT bleibt!) und
  schwere **Video-Hintergründe** auf der Startseite — der Website-Audit (2026-06-27) hat gerade festgestellt, dass die
  Home mit **2,17 MB mobil zu schwer** ist. „Sieht teuer aus" ≠ „verkauft". Video-KI gehört in **Reels/Ads**, nicht in
  den Shop-Hintergrund.

---

## 1. Tool-Wahl (Recherche Juni 2026 — Preise ≈, vor Produktiveinsatz gegenchecken)

| Tool | Gratis-Stufe | Wasserzeichen | günstigster API-Preis | i2v / Dauer / 9:16 | Produkt-Treue |
|------|--------------|---------------|------------------------|---------------------|---------------|
| **Kling AI** | ~66 Credits/Tag (Reset tägl.) | Ja (Free-Web) | via fal: **Kling 2.5 $0.07/s**; 3.0 ~$0.075–0.14/s | Ja / 5–10 s / 9:16 ✓; bis 4K | **Beste** Treue, wenig Morphing |
| **Google Veo 3.1 / fast** (User hat „Veo 3.1 fast") | kein Dauer-Gratis (nur über Google-Abo) | SynthID | fast ~$0.10–0.15/s, Lite ~$0.03–0.08/s | Ja / bis 8 s / 9:16 ✓; 4K | Sehr stark (Stoff/Licht), nativer Ton |
| **Luma Dream Machine** (User hat es) | ~80 Cr./Tag, **watermarked + nicht kommerziell** | Ja (Free) | API ~ab $0.32/Generation | Ja / kurz / 9:16 ✓ | Solide, eher cinematisch |
| **fal.ai** (User hat es — Gateway) | kleiner Test-Free | modellabhängig (API meist keins) | **Wan 2.5 $0.05/s**, Kling 2.5 $0.07/s, Veo 3.1 fast $0.10/s | je Modell / 9:16 ✓ | = gewähltes Modell |
| Wan 2.x (Alibaba) | self-host gratis (eigene GPU) | self-host: keins | via fal **$0.05/s** (billigste API) | Ja / 5–10 s / 9:16 ✓ | gut bei einfachen Szenen |
| Hailuo/MiniMax, Runway, Pika | tägl./einmal. Test-Credits | Free meist Watermark | $9–28/Mo bzw. via fal | Ja | Pika Free zu schwach (480p) |

### Empfehlung für LuxeStyle
1. **Sofort gratis testen:** **Kling AI Free** (~66 Cr./Tag, beste Treue) — zum Ausprobieren am Handzettel.
   ⚠️ Free-Web-Output hat **Wasserzeichen** → nur zum Testen, nicht veröffentlichen.
2. **Für Automatisierung (bester Preis/Leistung):** **fal.ai als ein API-Zugang**, Modell **Kling 2.5 Turbo @ $0.07/s**
   (4-s-Clip ≈ $0.28) — beste Treue im Niedrigpreis. Für Masse/jeden-Cent: **Wan 2.5 @ $0.05/s** (4 s ≈ $0.20).
3. **Hero-Qualität (Budget egal):** **Kling 3.0** oder **Veo 3.1 (Quality)** — beide 4K.
4. **fal.ai vs. Luma direkt:** fal ist pay-per-use **ohne Abo**, gibt Modell-Auswahl (Kling/Wan/Veo/Luma/Hailuo) hinter
   EINER Abrechnung → für unseren Use-Case **günstiger + flexibler** als Lumas eigenes $30/Mo-Abo. Der User hat fal,
   Luma UND Veo 3.1 fast → **fal mit Kling 2.5 ist der empfohlene Default**, Veo 3.1 fast für Hero-Clips.

---

## 2. So dockt es an die BESTEHENDE Pipeline an (nichts neu erfinden)

Diese Dateien existieren bereits — der KI-Clip ist nur ein **neuer Opener** davor:

| Schritt | Bestehende Datei | Rolle |
|---|---|---|
| Produkt-Quelle | `automation/good_products.csv` | **15 echte ≥4★-Produkte** (`name,image_url,label`) — NUR diese animieren |
| Branding/Schnitt | `dropship/ads/render_premium_reel.sh` | Marken-Intro/Outro, Musik, Ken-Burns, On-Screen-Text, Hook, CTA |
| Hook-Variante | `dropship/ads/render_hook_reel.sh` | kürzeres Hook-Reel |
| Musik | `automation/music/luxe-premium.wav` | **Default, kein Voiceover** (Projekt-Regel); „krass" → `luxe-hype*.wav` |
| Posting-Queue | `automation/reels_seed.csv` | Spalten: `id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url` |
| Poster (NUR EINER!) | `automation/post-next-reel.mjs` · `tiktok-autopost.mjs` · `social-autopost-meta.mjs` | postet jede `ready`-Zeile **genau einmal** |
| Analytics-Lernen | `automation/reel-analytics.mjs` | was lief → mehr davon |

### Empfohlener End-to-End-Flow (Video-Session)
1. **Auswahl:** nächstes Produkt aus `good_products.csv` (nur ≥4★; das 3,3–3,54★-Sommerkleid u. Ä. **ausschließen**).
2. **Animieren:** `image_url` (echtes Foto) als Startframe → fal.ai (Kling 2.5, 9:16, 4 s) → roher Clip.
3. **Branden:** `render_premium_reel.sh <out.mp4> automation/music/luxe-premium.wav <img_dir>` — Intro/Outro/CTA/Hook
   drüber (oder den KI-Clip als ersten Shot in die Bildsequenz legen). On-Screen-Text nach `SUPER-VIDEO-PLAYBOOK.md`:
   **„PROZENT" statt `%`**, **keine Emoji im drawtext**, Safe-Zones unten ~15 % / rechts ~10 % frei.
4. **In die Queue, aber NICHT live:** Zeile an `reels_seed.csv` mit **`status=pending`** (Freigabe-Gate, Regel 9) —
   NICHT `ready`.
5. **Freigabe:** Clip sichten (verformt KI das Produkt? Schrift/Logo ok?) → bei OK `status=ready` setzen.
6. **Posten:** **genau EIN** Poster (Video-Session) postet die `ready`-Zeile. Caption pro Kanal (IG „Link in Bio",
   FB Produktlink, TikTok Link in Bio + 3–5 Hashtags aus dem Konsens-Pool).

---

## 3. Prompt-Vorlagen für produkttreue Animation (kein Morphing)

> Ziel: **Produkt bleibt exakt, nur sanfte glaubwürdige Bewegung.** Kamera bewegen, nicht das Objekt.

- **Standard (Produkt-Push-in):**
  `slow gentle camera push-in on the product, subtle parallax, soft natural light, the product stays identical — no shape change, preserve logo, text, proportions and colors, photoreal, fixed product, no distortion, 9:16`
- **Mode/Stoff:** `light breeze gently moves the fabric, slow dolly, soft studio light, garment stays identical, no morphing, 9:16`
- **Schmuck:** `slow rotation 10 degrees, sparkle/glint catches the light, product identical, sharp focus, no warping, 9:16`
- **Regeln:** Bewegung **minimal + konkret** beschreiben; **3–5 s** (länger = mehr Drift); **Hände/Gesichts-Close-ups
  meiden** (häufigste Verformung); **Audio aus** bei reinen Hooks (spart bei Veo ~33–40 %; Musik kommt eh aus
  `luxe-premium.wav`); **9:16 direkt anfordern** (1080×1920), nicht nachträglich croppen.

---

## 4. Kostenbremse (wichtig)
- **Erst Gratis** (Kling Free) zum Format-Test, dann sparsam über fal.
- **1 Clip pro Lauf** (`MAX_PER_RUN=1`-Denke), **4 s** statt 8 s, kein häufiger Cron — Veo/Kling rechnen pro Sekunde.
- Realistisch: 4-s-Clip ≈ **$0.20–0.28** (Wan/Kling via fal). 10 Produkt-Hooks ≈ **$2–3**. Hero in 4K teurer → sparsam.

---

## 5. Was nur der User kann (einmalig, falls Automatisierung gewünscht)
- **API-Key** hinterlegen: `FAL_KEY` (fal.ai) **oder** `GEMINI_API_KEY` (Veo via Google) **oder** Kling-Key — als
  GitHub/GitLab-Secret. (Der User hat Veo 3.1 fast, Luma und fal bereits — nur der Key/Secret fehlt im Repo.)
- Account-Logins / Web-UI-Schritte (Kling-Free-Test, fal-Dashboard) → User oder PC-Claude.
- Entscheiden, ob ein **kleiner Generator-Skript** (`automation/gen_ki_reel.mjs` + Workflow, no-op ohne Key,
  schreibt `status=pending`) gebaut werden soll — Spezifikation liegt fertig im Plan
  `/.claude/plans/…veo…` bzw. kann auf fal/Kling angepasst werden. **Die Sammler-Session baut das NICHT
  ungefragt** (Regel: „bevor du random erstellst, informiere dich gut" — hiermit erledigt; Bau auf Zuruf).

---

## 6. Verbote / Fallstricke
- ❌ **Regel 1:** keine KI-erfundenen/verfälschten Produkte — echtes Foto = Startframe, KI nur Bewegung.
- ❌ **Kein Free-Web-Output mit Wasserzeichen** veröffentlichen (Kling/Luma/Pika Free) → API/Bezahlstufe für Posts.
- ❌ **Kein TikTok-Wasserzeichen** auf IG (Originality-Score straft ab) — sauber exportieren.
- ❌ **% und Emoji nicht in ffmpeg-`drawtext`** (unsichtbar/leere Kästchen) — „PROZENT" + Emoji nur in der Caption.
- ❌ **Doppelposts:** Generator schreibt `pending`→(Freigabe)→`ready`; **EIN** Poster postet jede Zeile genau einmal.
- ❌ **Niedrig bewertete Produkte** (3,3–3,54★) nicht animieren/bewerben.
- ⚠️ Lange Clips/komplexe Szenen/Spiegelungen = mehr Artefakte → kurz + einfache Szene halten.

---

**Querverweise:** `dropship/SUPER-VIDEO-PLAYBOOK.md` (Hook/Schnitt/Text-Handwerk) · `dropship/REEL-REGELN.md` (Regel 1 + 9) ·
`dropship/VIDEO-PRAEFERENZEN.md` (kein Voiceover, luxe-premium-Musik) · `dropship/GRATIS-KAEUFER-TRAFFIC-PLAYBOOK.md` +
`dropship/WACHSTUMS-WISSENSBASIS.md` (wo Reels im Funnel wirken — und wo nicht).

> Recherche-Stand Juni 2026. KI-Preise ändern sich häufig — vor Produktiveinsatz auf fal.ai / in der Gemini-API-Preisliste
> gegenchecken. Erstellt von der Sammler-Session als Info; Umsetzung/Posting liegt bei der Video-Session.
