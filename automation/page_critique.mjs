#!/usr/bin/env node
/* LuxeStyle — page_critique.mjs
 * Multi-KI-Kritik-Schwarm: zieht die Live-Seiten und lässt mehrere Modelle (Groq, Gemini, GPT/…) UNABHÄNGIG
 * eine schonungslose CRO/UX-Kritik + konkrete Verbesserungen liefern → reports/page-critique.md.
 * Nutzt den vorhandenen Multi-Provider-Router (automation/ai/ai_generate.mjs). Braucht mind. 1 KI-Key (GROQ/GEMINI/…);
 * ohne Key = Template-Fallback (bricht nie). ENV: die KI-Keys aus luxe-secrets.ps1 / .env.
 * CLI: node automation/page_critique.mjs [url1 url2 …]  (Default: Home + WM-Trikot-Produktseite)
 */
import { generate, hasKey } from './ai/ai_generate.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const URLS = process.argv.slice(2);
if (!URLS.length) URLS.push('https://luxestyle.ch/', 'https://luxestyle.ch/products/wm-trikot-selbst-gestalten');

function visibleText(html){
  return String(html||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim().slice(0,6000);
}
async function fetchText(u){ try{ const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}}); return visibleText(await r.text()); }catch(e){ return `(Fehler beim Laden: ${e.message})`; } }

const SYSTEM = 'Du bist ein knallharter CRO/UX- und E-Commerce-Experte für einen Schweizer Onlineshop (LuxeStyle, luxestyle.ch, Mobile-First). Antworte NUR auf Deutsch, konkret und priorisiert, keine Floskeln.';
function prompt(pages){ return `Hier ist der sichtbare Textinhalt von Shop-Seiten:\n\n${pages}\n\nAufgabe: Nenne die 8 WICHTIGSTEN, konkreten Verbesserungen, um aus Besuchern KÄUFER zu machen (Vertrauen, Mobile, Klarheit, Buy-Box, Trust-Signale, Reibung im Checkout). Pro Punkt: 1 Satz Problem + 1 Satz konkrete Lösung. Priorisiert nach Wirkung. Sei schonungslos ehrlich.`; }

const PROVIDERS = ['groq','gemini','openai','mistral','openrouter','cloudflare'];

const pages = (await Promise.all(URLS.map(async u=>`### ${u}\n${await fetchText(u)}`))).join('\n\n');
let md = `# 🧠 Multi-KI-Seiten-Kritik (LuxeStyle)\n\nGeprüfte Seiten:\n${URLS.map(u=>`- ${u}`).join('\n')}\n\n`;
let ran=0;
for (const pv of PROVIDERS){
  if (!hasKey(pv)) { continue; }
  try{
    const { text, provider } = await generate({ system:SYSTEM, prompt:prompt(pages), order:[pv], maxTokens:900, humanize:false });
    md += `\n---\n\n## Kritik von ${pv}${provider&&provider!==pv?` (→ ${provider})`:''}\n\n${text}\n`;
    ran++;
    console.log(`✓ Kritik von ${pv}`);
  }catch(e){ md += `\n---\n\n## ${pv}: Fehler (${e.message})\n`; }
}
if (!ran){ md += `\n_(Kein KI-Key aktiv → keine echte Kritik. GROQ_API_KEY/GEMINI_API_KEY setzen.)_\n`; }
try{ mkdirSync('reports',{recursive:true}); }catch{}
writeFileSync('reports/page-critique.md', md);
console.log(`\nFertig: ${ran} KI-Kritiken → reports/page-critique.md`);
