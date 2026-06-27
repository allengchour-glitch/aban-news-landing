#!/usr/bin/env node
/* 📊 intelligence_digest.mjs — Tages-Intelligence-Digest (1 Datei + optional Telegram)
 *
 * Fasst zusammen, was die Autopilot-Suite gelernt & vorgeschlagen hat:
 *   - Wissensbasis-Kennzahlen (SECOND-BRAIN.md)
 *   - Top Trend-Produkt-Ideen (PRODUKT-IDEEN.md)
 *   - Anzahl Caption-Vorschläge (CAPTION-VORSCHLAEGE.md)
 *   - Seiten-Health-Score (automation/brain-state.json), falls vorhanden
 * Schreibt automation/autopilot/TAGES-DIGEST.md und sendet ihn — falls TELEGRAM_BOT_TOKEN +
 * TELEGRAM_CHAT_ID gesetzt sind — an Telegram. Reines Node, no-op-safe.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const AP = path.join(ROOT, 'automation', 'autopilot');
const read = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

const brain = read(path.join(ROOT, 'automation', 'SECOND-BRAIN.md'));
const ideen = read(path.join(AP, 'PRODUKT-IDEEN.md'));
const captions = read(path.join(AP, 'CAPTION-VORSCHLAEGE.md'));

const stat = (re, s) => { const m = s.match(re); return m ? m[1] : '–'; };
const hashN = stat(/(\d+)\s+Hashtags/, brain);
const hookN = stat(/(\d+)\s+Hooks/, brain);
const kwN = stat(/(\d+)\s+Keywords/, brain);
const topTags = (brain.match(/## [^\n]*Konsens-Hashtags[^\n]*\n((?:- [^\n]*\n){1,6})/) || [, ''])[1]
  .split('\n').map(l => (l.match(/#[A-Za-z0-9äöü]+/) || [''])[0]).filter(Boolean).join(' ');
const topIdeen = (ideen.match(/Trend-Lücken[^\n]*\n((?:- [^\n]*\n){1,5})/) || [, ''])[1].trim();
const capN = (captions.match(/### /g) || []).length;

let score = '–';
try { const bs = JSON.parse(read(path.join(ROOT, 'automation', 'brain-state.json'))); score = bs.score ?? bs.last?.score ?? '–'; } catch {}

const today = new Date().toISOString().slice(0, 10);
const digest = `# 📊 Aban Autopilot — Tages-Digest ${today}

**🧠 Wissensbasis:** ${hashN} Hashtags · ${hookN} Hooks · ${kwN} Keywords
**🔝 Top-Trend-Hashtags:** ${topTags || '–'}
**🛍️ Trend-Produkt-Ideen (Lücken):**
${topIdeen || '_keine_'}
**✍️ Caption-Vorschläge bereit:** ${capN}
**🩺 Seiten-Health-Score:** ${score}/100

_Quellen: SECOND-BRAIN.md · PRODUKT-IDEEN.md · CAPTION-VORSCHLAEGE.md · brain-state.json_
`;
fs.writeFileSync(path.join(AP, 'TAGES-DIGEST.md'), digest);
console.log(`✅ TAGES-DIGEST.md geschrieben.`);

// Optional: Telegram
const TOK = process.env.TELEGRAM_BOT_TOKEN, CHAT = process.env.TELEGRAM_CHAT_ID;
if (TOK && CHAT) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOK}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text: digest, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
    console.log(r.ok ? '✅ Digest an Telegram gesendet.' : `⚠️ Telegram HTTP ${r.status}`);
  } catch (e) { console.log('⚠️ Telegram-Fehler:', e.message); }
} else {
  console.log('ℹ️ TELEGRAM_BOT_TOKEN/CHAT_ID nicht gesetzt → nur Datei (kein Versand).');
}
