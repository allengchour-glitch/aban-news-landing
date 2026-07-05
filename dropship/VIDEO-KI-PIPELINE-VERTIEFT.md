<!-- Auto-Recherche 2026-07-05 (Sammler-Session). NUR INFO fuer die Video-/Shop-Session. Vertieft VIDEO-KI-PIPELINE-VORBEREITUNG.md: fal.ai-API-Code, Prompt-Bibliothek, gen_ki_reel.mjs-Bauplan, QA. Umsetzung/Posting/Ads liegt bei den zustaendigen Sessions. -->

# Video-KI-Pipeline VERTIEFT — Umsetzung & Profi-Details

> **Ergänzung zu `dropship/VIDEO-KI-PIPELINE-VORBEREITUNG.md`** (Tool-Vergleich, Grund-Andockung, Basis-Prompts)
> und `dropship/VIDEO-ADS-PAID-READINESS.md` (Creative-Anatomie, TikTok/Meta-Setup).
> Hier steht das **operative Wie**: exakte fal.ai-API, fertige Kategorie-Prompts, konkreter `gen_ki_reel.mjs`-Bauplan,
> Qualitäts-Troubleshooting, Verbote. Nicht duplizieren — nur vertiefen.
>
> **Marken-Regeln (gelten hier durchgehend):** Produkt echt (KI nur Bewegung/Mood, nie das Produkt „neu erfinden"),
> **kein Voiceover** (Musik `automation/music/luxe-premium.wav`, on-screen Text separat), nur **≥4★-Produkte**
> (`automation/good_products.csv`), Pixel `D8EKVR3C77U6KT5BTBD0`, Auto-Smart-Kampagnen AUS, 20 CHF/Tag = Lerngeld.
> Stand-Fakt aus CLAUDE.md: **GitHub Actions gesperrt → nur `workflow_dispatch`/lokal/GitLab-CI, 0 aktive Crons.**

---

## 1) fal.ai-API konkret

Ein einheitlicher Client (`@fal-ai/client`), ein Auth-Mechanismus (`FAL_KEY`), drei austauschbare Model-IDs mit
identischem Request-Muster. Für den Markenfall (echtes Produktfoto = erster Frame, KI nur Bewegung, kein Audio)
schickt man bei allen dreien nur `image_url` + `prompt` und lässt Audio bewusst weg.

### 1.1 Client & Auth

```bash
npm i @fal-ai/client          # v1.7.0 (2025-10-17). @fal-ai/serverless-client ist DEPRECATED.
export FAL_KEY=...            # bzw. als GitHub-Actions/GitLab-CI-Secret (wie SHOPIFY_CLIENT_ID)
```

```js
import { fal } from '@fal-ai/client';
// FAL_KEY wird beim Import automatisch aus der Umgebung gelesen — fal.config() ist optional:
fal.config({ credentials: process.env.FAL_KEY });
```

`FAL_KEY` **nie** client-seitig/committen — lebt nur server-/CI-seitig (das Repo läuft ohnehin über Node-Skripte in
`automation/`). Da Actions gesperrt sind: lokal per `/opt/node22/bin/node` **oder** über `.gitlab-ci.yml`, `FAL_KEY` dort
als Secret.

### 1.2 Die drei Model-IDs + Input-Schemata (gegen fal-Modellseiten verifiziert)

| Kürzel | Model-ID | Wichtige Input-Felder | `aspect_ratio`? | `duration`-Typ |
|---|---|---|---|---|
| **kling** | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` | `prompt`, `image_url`, `duration` `'5'`\|`'10'`, `negative_prompt` (Default `"blur, distort, and low quality"`), `cfg_scale` (Default 0.5), `tail_image_url` (opt. End-Frame) | **NEIN** (kommt aus dem Bild) | **String** `'5'` |
| **wan** | `fal-ai/wan-25-preview/image-to-video` | `prompt` (max 1500 Zeichen), `image_url`, `resolution` `'480p'`\|`'720p'`\|`'1080p'` (Default `1080p`), `duration` `5`\|`10`, `audio_url` (opt.), `negative_prompt` (max 500), `enable_prompt_expansion` (Default true), `seed` | **NEIN** (kommt aus dem Bild) | **Zahl** `5` |
| **veo** | `fal-ai/veo3.1/fast/image-to-video` | `prompt`, `image_url`, `aspect_ratio` (`auto`/`16:9`/`9:16`), `resolution`, `generate_audio` (bool), `duration`, `negative_prompt` | **JA** (auf `9:16` setzen) | (siehe Modellseite) |

**Günstige, produkttreue Standard-Wahl für Kleidung/Produkt = Kling.** Wan 2.5 ist Preview (`wan-25-preview` → ID kann
sich auf stabile `wan/v2.5` ändern, vor Produktionslauf gegenchecken). Veo nur, wenn Kamera-/Physik-Qualität den
Aufpreis rechtfertigt — dann **`generate_audio: false`** (kein Voiceover + spart Geld).

### 1.3 Request/Response — Result-Shape (häufigste Migrations-Falle)

Der neue Client wrappt **alles** in `{ data, requestId }`. Die Video-URL liegt unter:

```js
result.data.video.url      // ✅ v1.x Client
// NICHT result.video.url  ← das zeigen nur alte Beispiele/Modellseiten
```

Robust beide abfangen: `const vurl = r?.data?.video?.url || r?.video?.url;` — sonst „Keine Video-URL", obwohl der
Render lief (und schon Geld gekostet hat).

### 1.4 Polling / Queue-Flow (Pflicht für Video — nie `fal.run`)

Generierung dauert oft 30–120 s. `fal.run` blockiert und läuft in Timeouts. **Immer Queue.**

**A) Einfachster Weg für ein CI-Skript, das ohnehin wartet — `fal.subscribe` (pollt automatisch bis COMPLETED):**

```js
const result = await fal.subscribe(MODEL, {
  input: { image_url, prompt, duration: '5', negative_prompt, cfg_scale: 0.5 },
  logs: true,
  onQueueUpdate: (u) => { if (u.status === 'IN_PROGRESS') u.logs?.forEach(l => console.log(l.message)); },
});
const videoUrl = result.data.video.url;
```

**B) Echte Async (Webhook/eigenes Polling):** `fal.queue.submit(MODEL, { input, webhookUrl })` → `request_id`, dann
`fal.queue.status(MODEL, { requestId, logs: true })` (`IN_QUEUE`→`IN_PROGRESS`→`COMPLETED`), dann
`fal.queue.result(MODEL, { requestId })`.

**C) Reines fetch/curl (Stil wie `cj_gaps_import.mjs`, ohne SDK):**

```bash
# 1) submit
curl -X POST https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video \
  -H "Authorization: Key $FAL_KEY" -H "Content-Type: application/json" \
  -d '{"image_url":"https://cdn.shopify.com/.../produkt-9x16.jpg","prompt":"slow cinematic push-in, soft studio light, subtle fabric movement","duration":"5"}'
# -> { request_id, status_url, response_url, cancel_url, queue_position }
# 2) poll bis COMPLETED
curl "https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/requests/$ID/status?logs=1" \
  -H "Authorization: Key $FAL_KEY"
# 3) Ergebnis
curl "https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/requests/$ID/response" \
  -H "Authorization: Key $FAL_KEY"   # -> video.url
```

### 1.5 Bild hochladen — bei uns meist unnötig

`automation/good_products.csv` Spalte 2 ist **bereits eine öffentliche `https://cdn.shopify.com/...jpg`-URL** → direkt
als `image_url` durchreichen (spart den einzigen fummeligen Node-Schritt). Nur wenn kein öffentliches Bild vorliegt:

```js
import { readFile } from 'node:fs/promises';
const buf = await readFile('./pod/tees/produkt-9x16.jpg');
const file = new File([buf], 'produkt-9x16.jpg', { type: 'image/jpeg' });   // Node 18+/20+: File/Blob global
const imageUrl = await fal.storage.upload(file);   // -> https://v3.fal.media/files/...
```
(Voraussetzung wie bei bestehender Bild-Regel: **HTTP 200**; temporäre `quick/`-URLs teils 404 → nicht direkt nutzen.)

### 1.6 Kosten pro 5-s-Clip (verifiziert, USD)

| Modell | 5 s | 10 s | pro Zusatz-s |
|---|---|---|---|
| **Kling 2.1 Standard** | **$0.25** | $0.50 | $0.05 |
| **Kling 2.5 Turbo Pro** | **$0.35** | $0.70 | $0.07 |
| **Wan 2.5** 480p / 720p / 1080p | $0.25 / $0.50 / $0.75 | ×2 | $0.05 / $0.10 / $0.15 |
| **Veo 3.1 Fast** 1080p ohne Audio / mit Audio | $0.50 / $0.75 | ×2 | $0.10 / $0.15 |

Fazit: KI-Bewegung ist Cent-Sache (~0,20–0,70 CHF/Clip). **Günstigste brauchbare Testwahl: Kling 2.1 Standard 5 s
($0.25) oder Wan 480p ($0.25).** fal ist pay-as-you-go **ohne Cap** → Budget-Bremse im Skript ist Pflicht (siehe §3).

### 1.7 Fehlerbehandlung / Retry

- fal re-queued Runner-Fehler (503/504/Connection) automatisch bis 10×. Eigene Retries nur für Netzwerk/Timeout
  (Backoff bis 3×, dann Clip überspringen + Ledger setzen).
- **422 Unprocessable Entity = kaputter Input → NICHT retryen**, sondern fixen. Typische Auslöser:
  `duration` als Zahl bei Kling (braucht String), Prompt >1500 Zeichen bei Wan.

```js
async function i2vSafe(args, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await i2v(args); }
    catch (e) {
      const s = e?.status ?? e?.response?.status;
      if (s === 422) { console.error('ValidationError, skip:', e.body || e.message); return null; }
      if (i === tries) throw e;
      await new Promise(r => setTimeout(r, 2000 * i));   // Backoff
    }
  }
}
```

---

## 2) Prompt-Bibliothek pro Kategorie

**Goldene Regel (quellenübergreifend, wichtigster Punkt der ganzen Pipeline):**
Im i2v-Prompt **NIEMALS das Aussehen beschreiben** (Farbe, Stoff, Modell, Palette, Licht-Look) — das liefert schon das
Referenzbild. Jede Wiederholung erzeugt konkurrierende Instruktionen → Drift/Verformung. Der Prompt beschreibt
**ausschließlich Bewegung**: (1) **eine** Kamerabewegung, (2) 2–3 Aktions-Beats mit Zeitstempeln, (3) einen
kategorie-spezifischen Negativprompt.

Falsch: `a woman in a navy dress with a gold necklace`. Richtig: nur Kamera + Beats + Negativ.

**Produkttreue** kommt **nicht** primär vom `cfg_scale` (der steuert Text-Treue, nicht Bild-Erhalt), sondern von:
kurze Dauer (5 s), sanfte Motion-Wörter (`gentle/slow/slight/subtle`), lokalisierte Bewegung (nur Kamera + ein Detail),
präziser Negativprompt.

**Settings-Spickzettel:** `cfg_scale = 0.5` (Korridor 0.3–0.7, bei „zu wild" Richtung 0.6–0.7), `duration = 5`,
9:16, 1080p@30fps. Rotation max ~30–35°. **Kamera-Vokabular das Kling versteht:** dolly, tracking, crane/jib, pan, tilt,
orbit, handheld, steadicam; für Luxus-Ruhe `locked-off / locked composition with slight handheld drift` + `slow push-in`.

**Basis-Negativ (immer anhängen):**
```
motion blur, warping, morphing, flickering, inconsistent lighting, extra limbs, unnatural physics,
background shifting, watermark, text overlay, low quality, compression artifacts
```

### 2.1 Damenkleid / Mode (5 s, cfg 0.5, 9:16)

1. **Stoff-Fluss am Model:** `Fashion editorial 35mm, locked composition with slight handheld drift. The model rotates 30 degrees clockwise over 5 seconds, gentle wind animates the fabric and hair, soft natural light.`
2. **Walk-Cycle:** `Tracking shot at walking pace, slight handheld. The subject walks slowly toward camera, 0-5s continuous walk, fabric and hair moving naturally.`
3. **Kleid-Detail-Reveal:** `Slow dolly push-in, locked-off. 0-2s hemline sways gently, 2-5s fabric settles, subtle light shift across the material.`
4. **Lookbook-Turn:** `Fashion editorial medium shot, slight push-in. 0-2s subtle weight shift, 2-4s 30 degree turn, 4-5s settle, soft window light.`
5. **Wind-Only (Studio/Freisteller):** `Locked-off. Subtle wind animation on fabric only, gentle drape movement 0-5s, static background.`

**Negativ (Mode):** `warping limbs, frozen legs, warping body, warping hair, morphing face, jittery background, extra limbs, distortion, flickering, motion blur, watermark`

### 2.2 Schmuck / Ketten (5 s, cfg 0.5–0.6, meist Macro)

1. **Try-On Ring/Kette:** `Macro close-up, slight handheld drift. 0-2s fingers/neck subtly relax, 2-4s slight rotation to catch light on the stone, 4-5s rests. Preserve product shape.`
2. **Glanz-Spiel:** `Locked-off macro, slow 20 degree camera orbit 0-5s, ambient light plays across the metal and gemstone, subtle sparkle highlights only.`
3. **Hero-Rotation liegend:** `Locked-off, slow 35 degree rotation 0-5s, soft overhead key light, subtle shadow shift only, keep proportions.`
4. **Dangling-Ohrring:** `Macro, locked composition. 0-2s earring sways gently, 2-5s settles, soft directional light catches facets.`

**Negativ (Schmuck):** `melted ring, deformed stone, warping fingers, mirrored text, deformed metal, duplicated gemstone, flickering reflections, morphing, distortion, watermark, extra fingers`

### 2.3 Taschen / Schuhe / Accessoires (5 s, cfg 0.5)

1. **Tasche am Model:** `Fashion editorial 35mm slow tracking shot, a leather tote on the shoulder, slow walking motion 0-5s, golden hour street, fabric and strap move naturally.`
2. **Produkt-Hero-Rotation:** `Locked-off, slow 35 degree rotation 0-5s, soft overhead key light, subtle shadow shift only, preserve product shape and label text.`
3. **Sonnenbrille Try-On:** `Macro close-up, slight push-in. 0-2s subtle head tilt, 2-4s light glints across the lenses, 4-5s settle.`
4. **Schuh-Detail:** `Locked-off macro, gentle 25 degree camera pan 0-5s, soft studio light, subtle reflection travels across the surface.`

**Negativ (Accessoires):** `melted edges, mirrored text, deformed packaging, warping bag, deformed glass, duplicated straps, morphing logo, distortion, flickering, watermark`

### 2.4 Beauty-Tools — Jade Roller, Gua Sha, Mini-Diffuser (5 s, cfg 0.5)

1. **Tool in Hand:** `Macro close-up, locked-off. A hand holding the tool, 0-2s slow lift, 2-4s gentle rotation to show the surface, 4-5s rests. Preserve product shape, maintain proportions.`
2. **Anwendung (ruhig):** `Soft daylight, locked composition. 0-2s tool glides slowly along the cheek, 2-5s continues gently, calm expression.` — Negativ: `warping skin, warping hand, morphing face, jittery eyes`
3. **Serum/Diffuser-Drop:** `Macro close-up. A glass dropper above a slate surface, single drop falls 0-2s, ripples 2-5s, soft overhead light.` — Negativ: `warping dropper, frozen drop, melted glass`
4. **Diffuser-Mist:** `Locked-off, subtle steadicam float 0-5s, gentle mist rises softly, soft ambient light, subtle glow.` — Negativ: `flickering, warping device, mirrored text, distortion`

### 2.5 Sonderfälle

- **Text/Logo auf Produkt** (Schmuck-Gravur, Taschen-Marke, Verpackung): Kling erfindet bei Bewegung Fake-/Spiegelschrift.
  Gegenmittel: `mirrored text, deformed packaging, melted edges` in den Negativprompt + Rotation ≤35° + Positiv-Hinweis
  `maintain label text / preserve product shape / keep proportions`. Notfalls Logo per Detail-Crop aus dem Bewegungsbereich nehmen.
- **Menschen im Bild** (Model trägt Ware): Gesichter/Hände sind die größten Drift-Quellen. Beats ruhig halten
  (Kopfdrehung ≤30°, kein Gehen >5 s), `morphing face, warping face` verbieten — **nicht** `frozen face` (das erzwingt
  ungewollte Gesichtsbewegung). Für maximale Produkttreue lieber **Macro-Detailshots ohne Gesicht**.
- **First/Last-Frame-Trick für Formtreue:** Start-Frame = echtes Produktfoto, End-Frame = leicht anderer Winkel/Zoom
  desselben Fotos (gleiche Palette/Belichtung!). Kling interpoliert nur dazwischen → keine Form-Verzerrung. Bei Kling
  über `tail_image_url`.

---

## 3) Automatisierungs-Bauplan `automation/gen_ki_reel.mjs`

**Kernidee: nicht bei Null anfangen.** `automation/veo-hero-clip.mjs` (Gemini/Veo) ist der 1:1-Bauplan — es enthält
schon `readGood()` (aus `good_products.csv`), `balanceByCategory` (aus `./lib/reel-category.mjs`), `.veo_pointer`-Ledger,
`buildPrompt()` (kein Morphing), `queueReel()` (→ `reels_seed.csv`). `gen_ki_reel.mjs` = **dieselbe Struktur**, nur:
(1) `fal.subscribe` statt Gemini-Longrunning, (2) ein echter **Branding-Schritt** via ffmpeg (veo-hero brandet NICHT!),
(3) harte **Kostenbremse** mit Spend-Ledger.

### 3.1 Architektur / Ablauf

1. Guard: `if (!process.env.FAL_KEY && !DRY) { console.log('Kein FAL_KEY → No-op.'); process.exit(0); }`
2. `readGood()` aus `good_products.csv` (ist bereits die kuratierte ≥4★-Liste via `list_by_rating.mjs` → **kein eigener Rating-Call**).
3. `balanceByCategory` (Themenmix, nicht 5× Schmuck) — 1:1 übernehmen.
4. Pointer `automation/.ki_pointer` (Round-Robin-Index) bestimmt nächstes Produkt → Idempotenz ohne Doppel-Render.
5. Budget-Check (Spend-Ledger, siehe unten). Bei Überschreitung sauber `exit 0` (kein `throw`).
6. `fal.subscribe` mit `image_url` = Shopify-CDN-URL direkt (**kein** `fal.storage.upload`).
7. Fertigen Clip per `fetch` → `reels/ki-clip-<name>-<date>.mp4` laden.
8. **Branding:** `render_ki_reel.sh` (crop 9:16 + Lower-Third + Intro/Outro + `luxe-premium.wav` + `-clean.mp4`).
9. Zeile in `reels_seed.csv` anhängen, `status = pending` (Default, QA-Gate).
10. Pointer + Spend-Ledger zurückschreiben.

### 3.2 Skript-Kern

```js
#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fal } from '@fal-ai/client';
import { balanceByCategory } from './lib/reel-category.mjs';

const DRY    = process.env.DRY_RUN === '1';
const MODEL  = process.env.FAL_MODEL || 'fal-ai/kling-video/v2.1/standard/image-to-video';
const DUR    = parseInt(process.env.KI_DURATION || '5', 10);
const MAX    = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10));
const BUDGET = parseFloat(process.env.MONTHLY_BUDGET_USD || '10');
const MUSIC  = process.env.MUSIC || 'automation/music/luxe-premium.wav';
const PRICE  = {
  'fal-ai/kling-video/v2.1/standard/image-to-video': 0.25,
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': 0.35,
  'fal-ai/wan-25-preview/image-to-video': 0.50,
};
if (!process.env.FAL_KEY && !DRY) { console.log('Kein FAL_KEY → No-op.'); process.exit(0); }
```

### 3.3 Spend-Ledger + Budget-Stop (Pflicht — fal hat kein Cap)

```js
const SPEND = 'dropship/ki_reel_spend.json';
const month = new Date().toISOString().slice(0, 7);
let led = { month, spentUsd: 0 };
try { led = JSON.parse(fs.readFileSync(SPEND, 'utf8')); } catch {}
if (led.month !== month) led = { month, spentUsd: 0 };   // Monatsreset
const cost = PRICE[MODEL] ?? 0.25;
if (led.spentUsd + cost > BUDGET) {
  console.log(`Budget ${BUDGET}$ erreicht (${led.spentUsd.toFixed(2)}$) → No-op.`);
  process.exit(0);
}
// ... nach erfolgreichem Render:
led.spentUsd += cost; if (!DRY) fs.writeFileSync(SPEND, JSON.stringify(led));
```

Dreistufige Bremse: (1) `MAX_PER_RUN` (Default **1**) Clips/Lauf, (2) `MONTHLY_BUDGET_USD` (Default **10**),
(3) `DRY_RUN=1` loggt nur Modell+Preis+Bild.

### 3.4 fal-Call + Download (image_url direkt, kein Upload)

```js
const prompt = buildMotionPrompt(p.label || p.name);
if (DRY) { console.log(`DRY: ${MODEL} ${DUR}s ~$${cost} <- ${p.image_url}`); continue; }
const r = await fal.subscribe(MODEL, {
  input: {
    prompt, image_url: p.image_url,
    duration: (MODEL.includes('wan') ? DUR : String(DUR)),   // Wan=Zahl, Kling=String!
    negative_prompt: 'blur, warp, morph, extra fingers, distorted product, text, watermark, logo, low quality',
    cfg_scale: 0.5,
  },
  logs: true,
  onQueueUpdate: u => { if (u.status === 'IN_PROGRESS') process.stdout.write('.'); },
});
const vurl = r?.data?.video?.url || r?.video?.url;
if (!vurl) { console.error('Keine Video-URL', JSON.stringify(r).slice(0, 300)); continue; }
const clip = `reels/ki-clip-${p.name}-${date}.mp4`;
fs.writeFileSync(clip, Buffer.from(await (await fetch(vurl)).arrayBuffer()));
```

### 3.5 Motion-Prompt (produkttreu, analog `buildPrompt` in veo-hero-clip.mjs)

```js
function buildMotionPrompt(label) {
  return `Cinematic product video for a premium Swiss boutique. Subject: ${label}. Very subtle motion only: `
    + `slow soft push-in dolly and gentle parallax with softly drifting daylight. Subject stays centered and facing `
    + `camera. NO rotation, no 360/180 spin, no orbit, no flipping, no shape change. The product stays EXACTLY true to `
    + `the reference image: same colours, same design, no distortion, no added or missing parts. Soft natural daylight, `
    + `shallow depth of field, warm premium grade, editorial luxury mood. No text, no logo, no watermark. Stabilized `
    + `locked framing, vertical 9:16, high quality.`;
}
```

### 3.6 Branding-Schritt `dropship/ads/render_ki_reel.sh` (NEU)

`render_premium_reel.sh` ist **nicht** wiederverwendbar — es rendert `zoompan` aus **Standbildern**; auf einen fal-Clip
angewandt bekäme man Standbild-Zoom statt der KI-Bewegung. Deshalb ein schlankes eigenes Skript, das Farben/Fonts/Timings
1:1 aus `render_premium_reel.sh` recycelt (`BG=0xf4f3f1`, `INK=0x2c2c2c`, `GOLD=0xb8915a`, DejaVuSans-Bold).

```bash
#!/usr/bin/env bash
set -euo pipefail
FF="ffmpeg -nostdin -y -hide_banner -loglevel error"
SANS=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
CLIP=$1; OUT=$2; MUSIC=$3; NAME=${4:-LuxeStyle}
W=$(mktemp -d); GOLD=0xb8915a
printf '%s' "$NAME" > "$W/n.txt"   # Umlaute/Doppelpunkte SICHER via textfile (nicht inline!)
# 1) Clip -> 1080x1920 ERZWINGEN (Kling liefert oft ~1:1!) + Lower-Third
$FF -i "$CLIP" -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,\
 drawbox=x=0:y=1610:w=1080:h=310:color=black@0.34:t=fill,\
 drawbox=x=80:y=1700:w=8:h=120:color=${GOLD}:t=fill,\
 drawtext=fontfile=${SANS}:textfile=${W}/n.txt:fontcolor=white:fontsize=52:x=118:y=1710,\
 drawtext=fontfile=${SANS}:text='luxestyle.ch':fontcolor=white@0.85:fontsize=30:x=118:y=1772[v]" \
 -map '[v]' -an -c:v libx264 -pix_fmt yuv420p -crf 19 -r 30 "$W/body.mp4"
# 2) Intro/Outro Standbilder aus render_premium_reel.sh kopieren -> $W/intro.mp4 $W/outro.mp4
# 3) xfade-Concat intro+body+outro (Muster steht 1:1 in render_premium_reel.sh)
# 4) Musik + clean-Variante (fuer Trend-Sound in-App):
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/final.mp4"); FADE=$(echo "$DUR-1.4"|bc -l)
$FF -i "$W/final.mp4" -i "$MUSIC" -filter_complex \
 "[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=${FADE}:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map '[a]' -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
$FF -i "$W/final.mp4" -i "$MUSIC" -filter_complex \
 "[1:a]volume=-30dB,afade=t=in:st=0:d=0.8[a]" \
 -map 0:v -map '[a]' -c:v copy -c:a aac -b:a 128k -shortest "${OUT%.*}-clean.mp4"
```

### 3.7 Branding aufrufen + `reels_seed.csv`-Zeile

```js
const out = `reels/ki-${p.name}-${date}.mp4`;
// execFileSync (Array-Args) -> KEINE Shell-Injection ueber Produktnamen:
execFileSync('bash', ['dropship/ads/render_ki_reel.sh', clip, out, MUSIC, (p.label || p.name)], { stdio: 'inherit' });
// Header exakt (verifiziert): id,scheduled_date,video_url,caption,hashtags,platforms,status,posted_at,post_url
const row = [
  `ki-${p.name}-${date}`, date, `https://abannews.com/${out}`,
  `${p.label} ✨ -10% mit Code WELCOME10 · 🔗 Link in Bio`,
  pickTags(`${p.name} ${p.label}`), 'tiktok,instagram',
  (process.env.AUTO_READY === '1' ? 'ready' : 'pending'), '', '',
];
fs.appendFileSync('automation/reels_seed.csv', row.map(esc).join(',') + '\n');
```

### 3.8 status=pending (QA-Gate) — bewusste Entscheidung

Der bestehende Autopilot `automation/tiktok-autopost.mjs` filtert **hart `status === 'ready'`** (Z. 162);
`veo-hero-clip.mjs` reiht direkt `'ready'` ein. → Mit `status='pending'` bleibt jeder Reel liegen, bis ihn jemand nach
Sichtung auf `ready` setzt. **Empfehlung: `pending` als Default** (KI kann bei Schmuck/feinen Details trotz
Negativprompt warpen → menschliche QA-Sichtung vor dem Posten) **+ `AUTO_READY=1` für Vollautomatik**. Im Skript-Header
dokumentieren, damit die nächste Session nicht rätselt, warum nichts postet.

### 3.9 Workflow-Andockung

Eigener `.github/workflows/ki-reel.yml` mit **`workflow_dispatch`** (NICHT `schedule` — Cron-Nulldiät wegen
Actions-Sperre), der `npm ci` + `node automation/gen_ki_reel.mjs` mit Secret `FAL_KEY` läuft und `reels/*.mp4` +
`reels_seed.csv` committet. Solange Actions gesperrt: **lokal (`/opt/node22/bin/node`) oder GitLab-CI**.
⚠️ **Workflow-`name:` NIE mit Doppelpunkt** (bricht YAML-Trigger → 422, teuer gelernt).

---

## 4) Qualitäts-Troubleshooting + QA-Checkliste

KI-Video-Fehler sind 2026 zu ~80 % **generierungsseitig** vermeidbar, bevor man postprocessiert. Erst wenn ein Clip
generierungsseitig sauber ist, lohnt Postprocessing.

### 4.1 Ursachen → Hebel

| Fehler | Ursache | Hebel |
|---|---|---|
| Morphing/Drift | zu lange Clips + zu starke Bewegung + zu viele Objekte | **3–5 s** statt lang; stitchen statt ein langer Clip |
| Flicker/Belichtungssprung | gemischte/mehrere Lichtquellen, „dramatisches Licht" | `consistent soft light, no lighting changes` |
| Gesicht schmilzt | extreme Emotion/Mundbewegung + Extreme-Close-up | ruhige Beats, `morphing face` verbieten |
| Hand/Finger-Artefakt | Hände prominent + komplexe Pose | Macro ohne Hände; sonst ruhig halten |
| Text/Logo-Matsch | Text jemals in der Generierung | Text NIE generieren → nur als Post-Overlay |

**Weitere Hebel:** Motion-Strength moderat (Stufe ~4–5 von 10, nie Max; weiche Verben statt `spinning/rushing`);
**nur EINE Kamerabewegung** pro Shot (zwei = Jitter/Tearing); Negativ-Preset fest hinterlegen; Referenz-Anker
(First/Last-Frame = echtes Produktfoto); beim Retest **nur EINE Variable** ändern; bei fast-gutem Clip **Seed fixieren**
und nur eine Prompt-Kleinigkeit tunen, bei Face/Finger-Bug **neuen Seed** würfeln (3 Varianten, beste nehmen).

### 4.2 Verwerfen vs. Retten

- **NEU generieren** (Post hilft nicht): falsche Fingerzahl/verschmolzene Hände, Gesicht wechselt Identität, Objekt
  teleportiert/verschwindet, Text der lesbar sein soll → **Struktur-/Geometriefehler**.
- **Im Post rettbar:** Belichtungs-/Farb-Flicker (Deflicker/Grading), leichtes Ruckeln (Interpolation), Weichheit/Rauschen
  (Upscaling), fehlende Textur (Grain) → **Oberflächen-/Zeitfehler**.

### 4.3 Postprocessing (nur nach QA, nur bei sauberen Clips)

- **Interpolation (GRATIS, Budget-Hebel):** RIFE (GitHub `hzwer/ECCV2022-RIFE`) bzw. GUI **Flowframes** (lokal, GPU) →
  24/30 fps zu 60/120 fps. ffmpeg-Notlösung ohne GPU:
  `ffmpeg -i clip.mp4 -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1" clip_60.mp4`
  (schlechter als RIFE, Ghosting an Kanten bei viel Bewegung).
- **Upscaling (nur wenn sichtbar unscharf):** Topaz Video AI (`Astra` mit Scene-Detection / `Aion` Interpolation,
  Abo ab ~299 USD/Jahr — für 20-CHF-Budget meist unnötig). **Krea-Upscaler kann das Produkt-Aussehen VERÄNDERN**
  („kreativ") → für Produkttreue riskant, Topaz konservativ bevorzugen.
- **Waxy-Fix** nach Upscaling: Denoise runter + `Add Grain` 1.5–2.5; immer höchste Bitrate als Input.
- **Reihenfolge:** KI-Clip (3–5 s, höchste Bitrate) → **QA** → (opt. Upscale) → (opt. Interpolate 60 fps) →
  `render_ki_reel.sh` mit on-screen Text + `luxe-premium.wav`.

### 4.4 QA-Checkliste (pro Clip abhaken, vor `pending`→`ready`)

1. Objektposition/-größe Frame-zu-Frame stabil, kein Teleportieren
2. Licht konstant, kein Flackern
3. Produktform/-farbe identisch Anfang vs. Ende
4. Bewegung wirkt geerdet, nicht „schwebend"
5. Keine Hände/Finger-Artefakte im sichtbaren Bereich
6. Kein lesbarer KI-Text/-Logo (Text/Preis erst im Post-Overlay)
7. Cliplänge ≤ 5 s

Fällt EIN Punkt aus der „Verwerfen"-Kategorie durch → **neu generieren** (nicht flicken).

### 4.5 LuxeStyle-konkret

≥4★-Heroes: Slim Wallet 5.0, Herrenuhr 5.0, Jade Roller 5.0, Mini Robo-Diffuser 4.8, Bali 4.93. Klare symmetrische
Produkte (Uhr, Wallet, Roller) = ideal für First/Last-Frame-Ankern, wenig Gesicht/Hände nötig. Diffuser mit Dampf =
perfekt für Micro-Motion (Dampf/Licht bewegt sich, Produkt steht). **Schmuck-Nahaufnahmen riskant** (Reflexe flackern)
→ Motion sehr niedrig + `consistent soft light, no lighting changes` + 3 s.

---

## 5) Verbote & Fallen (dicht)

**API / Client**
- `result.data.video.url`, **nicht** `result.video.url` (v1.x wrappt in `data`). Häufigster Migrations-Bug — beide abfangen.
- **Kling & Wan haben KEINEN `aspect_ratio`** — Seitenverhältnis kommt aus dem Bild. Für 9:16 entweder Bild vorher auf
  1080×1920 croppen **oder** (empfohlen bei uns) im `render_ki_reel.sh` per `crop=1080:1920` erzwingen. Nur Veo hat echten `aspect_ratio`.
- `duration`-Typ modellabhängig: **Kling = String** `'5'`, **Wan = Zahl** `5`. Falsch → 422.
- Nie `fal.run` für Video (blockiert, Timeout) → immer `fal.subscribe`/Queue.
- **422 nicht retryen** (Input fixen), nur 5xx/Timeout retryen.
- `FAL_KEY` nie client-seitig/committen; `image_url` muss HTTP 200 sein.
- `wan-25-preview` ist Preview → ID vor Produktionslauf gegenchecken. Veo an Google-Content-Policies gebunden.

**Prompting**
- **Aussehen im Prompt wiederholen = Hauptursache für Verformung.** Nur Kamera + Beats + Negativ.
- `cfg_scale` steuert **Text-Treue, nicht Bild-Erhalt** — kein Wunderregler; Produkttreue = kurz + sanft + Negativ.
- 10 s driften ~doppelt so stark wie 5 s (und kosten doppelt) → 5 s Default.
- Negativprompt hat bei Kling **keinen brauchbaren Default für uns** → immer Basis- + Kategorie-Set setzen.
- `frozen face` NICHT verbieten, wenn Gesicht statisch sein soll (erzwingt sonst Bewegung); `morphing/warping face` verbieten.

**Skript / Pipeline**
- `render_premium_reel.sh` **kann keinen Video-Clip branden** (zoompan aus Standbildern) → separates `render_ki_reel.sh`.
- `status='pending'` wird vom Autopiloten (`tiktok-autopost.mjs`, filtert `'ready'`) **nicht** gepostet → bewusst
  entscheiden (`AUTO_READY=1` oder pending→ready-Sichtung), im Header dokumentieren.
- Produktnamen mit Umlaut/Doppelpunkt/Komma brechen `drawtext` inline und CSV → immer `textfile=` + `esc()`-CSV-Quoting.
- `fal.storage.upload`/`File`-Konstrukt hier **überflüssig** (Bild ist schon öffentliche URL) → nicht einbauen.
- **Ohne Budget-Ledger frisst ein versehentlich scharfer Cron echtes Geld** (fal = kein Cap). `MONTHLY_BUDGET_USD` +
  Spend-Datei sind Pflicht. Actions ohnehin gesperrt → nur `workflow_dispatch`/lokal, Workflow-`name:` ohne Doppelpunkt.
- Erste 2–3 Clips pro Kategorie als **DRY-Test** behandeln (wie `cj_gaps` DRY-FIRST), bevor eine Batch läuft.

---

## Quellen (Kern)

- fal Kling 2.5 Turbo Pro i2v: `https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/api`
- fal Kling 2.1 Standard/Pro i2v (cfg 0.5, 5s $0.25/$0.45): `https://fal.ai/models/fal-ai/kling-video/v2.1/pro/image-to-video`
- fal Wan 2.5 i2v: `https://fal.ai/models/fal-ai/wan-25-preview/image-to-video/api`
- fal Veo 3.1 Fast i2v: `https://fal.ai/models/fal-ai/veo3.1/fast/image-to-video`
- fal Queue-REST: `https://fal.ai/docs/model-apis/model-endpoints/queue` · Client: `https://fal.ai/docs/model-apis/client`
- `@fal-ai/client` v1.7.0: `https://www.npmjs.com/package/@fal-ai/client` · `https://github.com/fal-ai/fal-js/releases`
- fal Pricing: `https://fal.ai/pricing`
- Kling Prompt-/Fix-Guides: `https://fal.ai/learn/devs/kling-2-6-pro-prompt-guide` · `https://kling.ai/blog/fix-ai-video-drift-consistency-guide` · `https://videoai.me/blog/kling-ai-image-to-video-prompts`
- Postprocessing: `https://flowframes.app/` · `https://github.com/hzwer/ECCV2022-RIFE` · `https://www.topazlabs.com/topaz-video`
- Repo: `automation/veo-hero-clip.mjs` (Struktur-Vorlage), `dropship/ads/render_premium_reel.sh` (Branding-Muster),
  `automation/tiktok-autopost.mjs` Z. 162 (`status==='ready'`-Filter), `automation/good_products.csv` (≥4★, Spalten `name,image_url,label`).
