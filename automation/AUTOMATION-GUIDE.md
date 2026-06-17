# 🤝 Automation-Guide für den Autopilot (Katalog/Content-Session)

> User 2026-06-17 „bring ihm Automation bei". Diese Bausteine baut die Social-Session (CizQ6).
> Der Autopilot (`luxestyle-autopilot.yml`, Katalog/CJ/BigBuy/Content) kann sie direkt mitnutzen.
> ALLE sind **no-op-safe** (ohne Key kein Crash), Keys NUR aus ENV (nie ins öffentliche Repo).
> ⚠️ Social-POSTEN bleibt bei CizQ6 (Cloudflare-Worker = einziger Meta-Poster). Autopilot postet NICHT.

## 1) KI-Text mit Fallback — `automation/ai/ai_generate.mjs`
Für Produktbeschreibungen, Titel, SEO, Content — bricht NIE (8 Provider → Template).
```bash
GROQ_API_KEY=… node automation/ai/ai_generate.mjs --system "Du bist Schweizer Produkttexter, Mundart-nah, kein Deutschland." "Schreib eine 2-Satz-Produktbeschreibung für: <Produktname>"
```
Als Modul: `import { generate } from './ai/ai_generate.mjs'` → `await generate({system,prompt,json})`.
Reihenfolge groq→gemini→together→deepseek→openrouter→cloudflare→mistral→openai. **Empfohlen: GROQ + GEMINI (gratis, live).**

## 2) Gratis Bild-KI — `automation/ai/image_gen.mjs`
Hintergründe/Lifestyle/Banner (NIE echtes Produkt fälschen). Pollinations (kein Key) → CF → HF.
```bash
node automation/ai/image_gen.mjs "elegant swiss product backdrop, soft light" out.jpg --w 1080 --h 1920
```

## 3) Bild-QA (Gemini Vision) — `automation/image-audit.mjs`  ← WICHTIG für neue Importe!
Findet Watermark / asiat.-arab. Schrift / MADE IN CHINA / fremde-Shop-Logos / Vorher-Nachher auf Produktbildern.
**Jeden CJ/BigBuy-Import damit prüfen**, bevor er live geht. Report-Modus (kein Auto-DRAFT).
```bash
GEMINI_API_KEY=… MAX=400 node automation/image-audit.mjs
```
⚠️ Prompt flaggt NUR Bild-Hygiene, NIE Marken/POD/Demo-Geräte (sonst Fehlalarm).

## 4) Google-Merchant-Feed ready — `automation/feed_polish.mjs` + `enrich_apparel_descriptions.mjs`
Setzt Kategorie + condition + gender/age + custom_product katalogweit (idempotent, resümierbar, MAX/Lauf).
```bash
SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… MAX=800 node automation/feed_polish.mjs
```
Helfer exportiert: `import { categorize, genderOf, ageOf, G } from './feed_polish.mjs'` (läuft beim Import NICHT mit).

## 5) Trends + Gesundheit — `trends/trend_scan.mjs` · `health-check.mjs`
`trend_scan.mjs` = Google-Trends-CH (gratis) + KI-Ideen (CH/Mundart). `health-check.mjs` = was lebt (Provider/Tools).

## 6) BigBuy-Import (Merchant-ready) — `dropship/bigbuy_import.mjs`
Legt BigBuy-EU-Produkte ACTIVE/6-Kanäle/CHF/GTIN/Kategorie/condition an, idempotent (EAN-Ledger), 429-Backoff.
⚠️ BigBuy rate-limitet hart → vom PC/inkrementell, nicht massenhaft aus der Cloud.

## 7) Setup/Reproduzierbar — `automation/setup-free-stack.sh`
Installiert yt-dlp/gallery-dl/Pillow + Health-Check. Container ephemer → Skripte sind die Wahrheit.

## Goldene Regeln (teuer gelernt)
- **No-op-safe** + **ENV-Keys** (nie Repo). **Idempotent** (Ledger). **STRIKT Schweiz** (kein DE). **Mundart**.
- **NIE** Botox/Serum/fremd-gebrandetes Öl/asiat.Schrift/Watermark/Fake-Reviews — jedes Bild prüfen (image-audit).
- **Branch** claude/luxestyle-product-CizQ6, nie direkt main. Detail-Wissen: `dropship/MASTER-A-Z.md` + `automation/brain/knowledge.json`.
