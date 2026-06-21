#!/usr/bin/env node
/* LuxeStyle — gemini_dropship_learnings.mjs
 * Lässt Gemini die Erfolgsmuster der besten Dropshipping-/DTC-Fashion-Stores analysieren und daraus
 * einen PRIORISIERTEN, getaggten Aktionsplan für luxestyle.ch ableiten ([API]/[THEME]/[APP-USER]).
 * Schreibt reports/dropship-learnings-<datum>.md. Optional Telegram-Kurzfassung. No-op ohne GEMINI_API_KEY.
 * ENV: GEMINI_API_KEY (Pflicht) · GEMINI_MODEL (Default gemini-2.5-flash) · TELEGRAM_BOT_TOKEN/CHAT_ID (optional)
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

if (!KEY) { console.log('Kein GEMINI_API_KEY → No-op.'); process.exit(0); }

const PROMPT = `Du bist ein Top-Experte für E-Commerce-CRO und profitables Dropshipping (DTC-Fashion).

TEIL 1 — ERFOLGSMUSTER: Liste die konkreten, bewährten Taktiken, mit denen die erfolgreichsten
Dropshipping-/DTC-Fashion-Stores überdurchschnittlich konvertieren. Gliedere nach: Startseite,
Kollektions-/Kategorieseiten, Produktseite (PDP), Trust/Social Proof, Urgency/Scarcity, Angebote/Bundles,
Mobile-UX, Checkout, E-Mail/Retargeting, Reels/UGC. Jeweils stichpunktartig und SPEZIFISCH (nicht generisch).

TEIL 2 — AUDIT & AKTIONSPLAN für «LuxeStyle» (luxestyle.ch): Schweizer Damen-Fashion-Shop auf Shopify
Basic, Währung CHF, Sprache DE. Bereits vorhanden: Gratis-Versand ab CHF 65, TWINT, Code WELCOME10 (-10%),
14–30 Tage Rückgabe, Judge.me-Reviews, Smart-Collections, SEO/Alt-Texte. Gib einen PRIORISIERTEN
Aktionsplan (wichtigste/wirkungsvollste zuerst). Tagge JEDEN Punkt mit GENAU einem Tag am Zeilenanfang:
  [API]  = via Shopify Admin API umsetzbar (Produkt-/Kollektionstexte, Metafelder, Tags, Rabatte, SEO, Bundles)
  [THEME]= braucht Theme/Customizer (Layout, Sektionen, Sticky-ATC, Badges im Theme)
  [USER] = braucht App-Installation oder manuelle User-Aktion (Pixel, Ads, Domain, Token)
Sei konkret, Schweiz-spezifisch und sofort umsetzbar. Antworte auf DEUTSCH in sauberem Markdown.
Maximal ~1600 Wörter.`;

async function gemini() {
  const url = `${BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = { contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
                 generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('Gemini-Fehler:', r.status, JSON.stringify(j).slice(0, 400)); process.exit(0); }
  const parts = j?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join('').trim();
}
async function telegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, disable_web_page_preview: true })
    });
  } catch {}
}

(async () => {
  const md = await gemini();
  if (!md) { console.log('Leere Antwort → No-op.'); process.exit(0); }
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `dropship-learnings-${date}.md`);
  const header = `# Dropship-Erfolgsmuster & LuxeStyle-Aktionsplan (Gemini ${MODEL})\n\n> Erzeugt ${date}. Quelle: Gemini-Analyse erfolgreicher DTC-/Dropshipping-Fashion-Stores.\n\n`;
  fs.writeFileSync(file, header + md + '\n');
  console.log('Report:', file, `(${md.length} Zeichen)`);
  const apiCount = (md.match(/\[API\]/g) || []).length;
  await telegram(`📊 LuxeStyle Dropship-Learnings (${date}) erzeugt — ${apiCount} [API]-Punkte zum autonomen Umsetzen. Report im Repo: reports/dropship-learnings-${date}.md`);
})().catch(e => { console.error('Fehler:', e.message); process.exit(0); });
