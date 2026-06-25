#!/usr/bin/env node
/* storefront-audit.mjs - Storefront-Seiten von luxestyle.ch pruefen (Vision) + Probleme flaggen.
 * =============================================================================================
 * Besucht jede wichtige Storefront-Seite (oeffentlich, KEIN Login noetig), screenshottet sie und schickt
 * jeden Screenshot (falls GEMINI_API_KEY da) an Gemini-Vision. Flaggt: englischer Text wo Deutsch erwartet,
 * fehlende Kategorie-Navigation/Banner, kaputte/Platzhalter-Inhalte, Produktbilder mit Text-Overlay/asiatischer
 * Schrift, Layout-Probleme. NUR Report (kein Aendern am Shop). Laeuft am PC ueber CLOUD-AN / Brave-CDP 9222.
 *
 * START am PC:  node automation/local/storefront-audit.mjs
 * Voraussetzung: GEMINI_API_KEY (luxe-secrets.ps1, optional - ohne -> nur Screenshots) + Brave-agent 9222.
 * Output:        automation/local/storefront-shots/<slug>.png  +  reports/storefront-audit.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';
setTimeout(()=>{console.log("WATCHDOG 8min -> exit");process.exit(1);},480000).unref(); // 2026-06-25 Sweep: kein cmd-poll-Queue-Freeze

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'storefront-shots');
fs.mkdirSync(SHOT, { recursive: true });
const GKEY = process.env.GEMINI_API_KEY;
const GMODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Wichtige Storefront-Seiten (oeffentlich). Letzter Eintrag = eine Produktseite.
const URLS = [
  'https://luxestyle.ch/',
  'https://luxestyle.ch/collections/favoriten',
  'https://luxestyle.ch/collections/damen-mode',
  'https://luxestyle.ch/collections/fur-ihn',
  'https://luxestyle.ch/collections/premium-schmuck',
  'https://luxestyle.ch/collections/trends-gadgets',
  'https://luxestyle.ch/pages/faq',
  'https://luxestyle.ch/pages/versand',
  'https://luxestyle.ch/pages/rueckgabe',
  'https://luxestyle.ch/products/zirkonia-blumenring-offen-verstellbar-gold-oder-silber',
];

const slugify = (u) => {
  try {
    const p = new URL(u).pathname.replace(/\/+$/, '');
    return (p === '' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-')).toLowerCase();
  } catch { return 'page'; }
};

const PROMPT = `Du pruefst eine STORE-Seite des SCHWEIZER Premium-Mode-Shops LuxeStyle (luxestyle.ch).
Die Seite soll auf DEUTSCH sein, sauber wirken und eine klare Kategorie-Navigation + Banner zeigen.
Antworte als JSON {"flags":["kurz","kurz"]} - eine Liste konkreter Probleme, leer [] wenn alles ok.
Flagge NUR klare Probleme: englischer Text wo Deutsch erwartet (z.B. "Add to cart"/"Search"/"View all");
fehlende oder kaputte Kategorie-Navigation / fehlendes Hero-Banner; kaputte/Platzhalter-Inhalte
("lorem ipsum", leere Blocks, fehlende Bilder, 404); Produktbilder mit stoerendem Text-Overlay oder
chinesischer/asiatischer Schrift; offensichtliche Layout-Probleme (ueberlappend, abgeschnitten, verschoben).
Im Zweifel (sieht ok aus) nichts flaggen. Sei konkret und kurz pro Flag.`;

async function vision(buf) {
  if (!GKEY) return { flags: [] };
  if (buf.length > 4_000_000) return { flags: ['(Screenshot zu gross fuer Vision)'] };
  const body = { contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/png', data: buf.toString('base64') } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } } };
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:generateContent?key=${GKEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = t.match(/\{[\s\S]*\}/);
    if (m) { const o = JSON.parse(m[0]); return { flags: Array.isArray(o.flags) ? o.flags : [] }; }
  } catch (e) { return { flags: ['vision-fehler: ' + String(e).slice(0, 40)] }; }
  return { flags: [] };
}

(async () => {
  let ab; try { ab = await aiBrowser(); } catch { log('Kein Brave 9222.'); process.exit(1); }
  const p = ab.page;
  log('Modus:', ab.mode, '·', URLS.length, 'Seiten', GKEY ? '· mit Vision' : '· nur Screenshots (kein GEMINI_API_KEY)');
  const res = { ts: new Date().toISOString(), mode: ab.mode, checked: 0, findings: [] };
  for (const url of URLS) {
    const slug = slugify(url);
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      try { await p.keyboard.press('Escape'); } catch {} // Popups (Newsletter o.ae.) wegklicken
      await sleep(4000);
      const file = path.join(SHOT, `${slug}.png`);
      await p.screenshot({ path: file, fullPage: true });
      let flags = [];
      if (GKEY) { const v = await vision(fs.readFileSync(file)); flags = v.flags; }
      res.checked++;
      res.findings.push({ url, slug, flags });
      log(`${slug}: ${flags.length ? flags.length + ' Flag(s) -> ' + flags.join(' | ') : 'ok'}`);
    } catch (e) {
      const msg = String(e).slice(0, 80);
      res.findings.push({ url, slug, flags: ['ladefehler: ' + msg] });
      log(`${slug} Fehler:`, msg);
    }
  }
  try { fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'reports', 'storefront-audit.json'), JSON.stringify(res, null, 2)); } catch {}
  await ab.close().catch(() => {});
  const total = res.findings.reduce((n, f) => n + (f.flags ? f.flags.length : 0), 0);
  log(`Fertig: ${res.checked} Seiten geprueft, ${total} Flag(s). Report reports/storefront-audit.json`);
  process.exit(0);
})();
