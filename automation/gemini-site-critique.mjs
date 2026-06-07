#!/usr/bin/env node
/* LuxeStyle — gemini-site-critique.mjs  (Gemini-gesteuerte Website-Kritik, Desktop + Mobil)
 *
 * Screenshottet die Live-Seiten von luxestyle.ch (Startseite + 1 Produkt- + 1 Collection-Seite)
 * in Desktop- UND Mobil-Viewport, schickt sie an Gemini (multimodal) als CRO/UX-Experte und
 * erzeugt einen PRIORISIERTEN Fix-Report (reports/site-critique-<datum>.md) + Telegram-Kurzfassung.
 *
 * Die "Fixes" wendet eine Claude-Session anschliessend an (der Report ist ihre Arbeits-Queue) —
 * optische Theme-Eingriffe automatisch live zu schreiben wäre zu riskant.
 *
 * No-op-safe: ohne GEMINI_API_KEY sauberer Leerlauf (Exit 0).
 *
 * ENV (NUR aus GitHub-Secrets/Repo-Variablen — nie im Code):
 *   GEMINI_API_KEY        (Pflicht — AI-Studio-Key; Vertex-AI optional via GEMINI_BASE_URL)
 *   GEMINI_MODEL          (optional, Default gemini-2.5-flash; bei Bedarf als Repo-Variable überschreiben)
 *   SITE_BASE_URL         (optional, Default https://luxestyle.ch)
 *   CRITIQUE_PATHS        (optional, Komma-Liste; Default "/, /collections/damen-mode, <erstes Produkt>")
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  (optional — Kurzfassung)
 *   DRY_RUN=1             (optional)
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = (process.env.SITE_BASE_URL || 'https://luxestyle.ch').replace(/\/$/, '');
const GEMINI_BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const DRY = process.env.DRY_RUN === '1';

if(!KEY && !DRY){
  console.log('Kein GEMINI_API_KEY → No-op. Setze GEMINI_API_KEY als Repo-Secret, dann läuft die Kritik-Schleife.');
  process.exit(0);
}

const paths = (process.env.CRITIQUE_PATHS || '/,/collections/damen-mode')
  .split(',').map(s => s.trim()).filter(Boolean);

const VIEWPORTS = [
  { name: 'mobil',   width: 390,  height: 844,  mobile: true  },
  { name: 'desktop', width: 1366, height: 900,  mobile: false },
];

// --- Screenshots via Playwright (in CI installiert) ---
async function shoot(){
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const shots = [];
  for(const p of paths){
    for(const vp of VIEWPORTS){
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile, deviceScaleFactor: vp.mobile ? 2 : 1,
        userAgent: vp.mobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      });
      const page = await ctx.newPage();
      const url = BASE + p;
      try{
        // domcontentloaded statt networkidle: Shopify-Seiten werden durch Tracking-Pixel nie "idle"
        // → networkidle lief immer in den 45s-Timeout. Danach durchscrollen für Lazy-Bilder.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.evaluate(async () => {
          await new Promise(res => {
            let y = 0;
            const step = () => {
              window.scrollBy(0, 900); y += 900;
              if (y < document.body.scrollHeight && y < 12000) setTimeout(step, 150);
              else { window.scrollTo(0, 0); setTimeout(res, 300); }
            };
            step();
          });
        });
        await page.waitForTimeout(1200);
        // Höhe auf max 6000px deckeln → keine Riesen-PNGs, die Gemini ausbremsen.
        const h = Math.min(6000, await page.evaluate(() => document.body.scrollHeight) || vp.height);
        const buf = await page.screenshot({ clip: { x: 0, y: 0, width: vp.width, height: h } });
        shots.push({ label: `${p} (${vp.name})`, b64: buf.toString('base64') });
        console.log('📸', url, vp.name, `${(buf.length/1024|0)}kB`);
      }catch(e){ console.error('Screenshot-Fehler', url, vp.name, e.message); }
      await ctx.close();
    }
  }
  await browser.close();
  return shots;
}

const SYSTEM_PROMPT = `Du bist ein erfahrener Senior-CRO- & UX-Designer für E-Commerce (Shopify, Schweizer Markt).
Du bewertest Screenshots des Online-Shops LuxeStyle CH (luxestyle.ch, Premium-Mode & Lifestyle, CHF, Zielgruppe Frauen 18–40).
Ziel des Shops: aus Besuchern KÄUFER machen. Bewerte schonungslos ehrlich, aber konkret und umsetzbar.

Analysiere besonders:
- Erster Eindruck / Hero (Klarheit des Nutzenversprechens, Premium-Wirkung, CTA sichtbar?)
- Mobile Usability (Touch-Targets, Lesbarkeit, Daumen-Reichweite, Sticky-CTA, kein horizontales Scrollen)
- Optische Konsistenz (Typografie, Abstände, Bildqualität, Farbharmonie, Marken-Look)
- Vertrauen (Reviews/Sterne, Trust-Badges, CH-Signale, Versand/Rückgabe sichtbar)
- Produktkacheln (gleichmässig? Preise klar? Sterne? zu viele ähnliche Gadget-Fotos?)
- Reibung im Funnel (zu viele Klicks, unklare Navigation, Ablenkung)

Gib AUSSCHLIESSLICH valides JSON zurück (kein Markdown), Schema:
{
 "gesamtnote": "<1-10>",
 "staerken": ["..."],
 "kritische_probleme": [
   {"prio":"hoch|mittel|niedrig","bereich":"Hero|Mobil|Navigation|Trust|Produktkacheln|Typografie|Performance|Sonstiges",
    "problem":"konkret was ist schlecht","fix":"konkrete Massnahme","umsetzbar_per":"API|Theme-Customizer|Copy|Bild"}
 ],
 "quick_wins": ["sofort umsetzbare Kleinigkeiten"]
}`;

async function critique(shots){
  const parts = [{ text: SYSTEM_PROMPT + '\n\nHier die Screenshots (je mit Label):' }];
  for(const s of shots){
    parts.push({ text: `\n— ${s.label} —` });
    parts.push({ inline_data: { mime_type: 'image/png', data: s.b64 } });
  }
  const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    }),
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ console.error('Gemini:', r.status, JSON.stringify(j).slice(0,400)); return null; }
  const txt = j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
  try{ return JSON.parse(txt); }catch{ console.error('Gemini-JSON nicht parsebar:', txt.slice(0,300)); return { raw: txt }; }
}

function toMarkdown(c, date){
  if(c.raw) return `# Gemini Site-Kritik — ${date}\n\n(Rohausgabe, nicht als JSON parsebar)\n\n${c.raw}\n`;
  const probs = (c.kritische_probleme||[]).sort((a,b)=>({hoch:0,mittel:1,niedrig:2}[a.prio]-{hoch:0,mittel:1,niedrig:2}[b.prio]));
  let m = `# Gemini Site-Kritik — ${date}\n\n**Gesamtnote: ${c.gesamtnote||'?'}/10**\n\n`;
  if(c.staerken?.length){ m += `## ✅ Stärken\n${c.staerken.map(s=>`- ${s}`).join('\n')}\n\n`; }
  m += `## 🔧 Kritische Probleme (nach Priorität)\n\n`;
  for(const p of probs){
    const icon = p.prio==='hoch'?'🔴':p.prio==='mittel'?'🟡':'🟢';
    m += `### ${icon} [${p.bereich}] ${p.problem}\n- **Fix:** ${p.fix}\n- **Umsetzbar per:** ${p.umsetzbar_per}\n\n`;
  }
  if(c.quick_wins?.length){ m += `## ⚡ Quick Wins\n${c.quick_wins.map(s=>`- ${s}`).join('\n')}\n`; }
  return m;
}

async function telegram(text){
  if(!TG_TOKEN || !TG_CHAT) return;
  const body = new URLSearchParams({ chat_id: TG_CHAT, text, disable_web_page_preview: 'true' });
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method:'POST', body }).catch(()=>{});
}

// --- Hauptlauf ---
const date = new Date().toISOString().slice(0,10);
if(DRY){ console.log('DRY_RUN: würde', paths.length, 'Pfade × 2 Viewports screenshotten und an Gemini senden.'); process.exit(0); }

console.log('Screenshots…');
const shots = await shoot();
if(shots.length===0){ console.error('Keine Screenshots — Abbruch.'); process.exit(1); }

console.log(`Gemini-Kritik (${MODEL}) über ${shots.length} Screenshots…`);
const c = await critique(shots);
if(!c){ console.error('Keine Kritik erhalten.'); process.exit(1); }

const md = toMarkdown(c, date);
const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'reports');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `site-critique-${date}.md`);
fs.writeFileSync(outFile, md);
console.log('✅ Report:', outFile);

const note = c.gesamtnote ? `Note ${c.gesamtnote}/10` : '';
const topProbs = (c.kritische_probleme||[]).filter(p=>p.prio==='hoch').slice(0,3).map(p=>`• ${p.bereich}: ${p.problem}`).join('\n');
await telegram(`🎨 Gemini Site-Kritik ${date} ${note}\nTop-Baustellen:\n${topProbs||'(keine hoch-prio)'}\n\nVoller Report im Repo: reports/site-critique-${date}.md`);
console.log('Fertig.');
