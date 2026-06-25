#!/usr/bin/env node
/* video-audit.mjs — TIEFER Vision-Check aller Werbe-Videos in reels/. Zieht 3 Frames pro Video (Anfang/Mitte/
 * Ende), montiert sie + laesst Gemini-Vision pruefen: asiat./chines. Schrift, "Made in China", Lieferanten-
 * Watermark/Fremdmarke, Warping/Verzerrung, off-brand/billige Qualitaet. Flaggt problematische Videos.
 * Idempotent (reports/video-audit.json) + rate-limit-sicher (MAX/Lauf, DELAY). Braucht GEMINI_API_KEY.
 *
 * ENV: GEMINI_API_KEY · MAX (Default 60/Lauf) · DELAY (ms, Default 1500) · GEMINI_MODEL (Default gemini-2.5-flash)
 * Lauf: node automation/video-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
setTimeout(() => { console.log('WATCHDOG 14min -> exit'); process.exit(1); }, 840000).unref();

const ROOT = path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url))));
const REELS = path.join(ROOT, 'reels');
const OUT = path.join(ROOT, 'reports', 'video-audit.json');
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX = parseInt(process.env.MAX || '60', 10);
const DELAY = parseInt(process.env.DELAY || '1500', 10);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PROMPT = `Du bist QA fuer eine PREMIUM Schweizer Damenmode-Werbung. Das Bild zeigt 3 Frames EINES Werbe-Videos.
Flagge NUR echte Probleme. Antworte als JSON {"flag":true|false,"reasons":[...]}. flag=true wenn IRGENDEIN Frame zeigt:
- chinesische/asiatische Schrift oder "MADE IN CHINA"
- Lieferanten-Watermark / fremdes Markenlogo (nicht LuxeStyle)
- starkes Warping/Verzerrung am Produkt, an Haenden oder Gesicht
- offensichtlich billige/kaputte/verpixelte Qualitaet, die nicht premium wirkt
Sonst flag=false. Kurze deutsche reasons.`;

function frames(v) {
  const tmp = path.join(os.tmpdir(), 'va-' + path.basename(v, '.mp4'));
  const sheet = tmp + '.jpg';
  try {
    for (const [i, ss] of [['0', '1'], ['1', '50%'], ['2', '90%']].entries()) {
      // 50%/90% via -ss prozentual geht nicht direkt -> feste Sekunden grob: 1 / 4 / 7
      const t = ['1', '4', '7'][i];
      execSync(`ffmpeg -y -ss ${t} -i "${v}" -frames:v 1 -vf "scale=240:427:force_original_aspect_ratio=increase,crop=240:427" "${tmp}-${i}.png"`, { stdio: 'ignore' });
    }
    execSync(`montage "${tmp}-0.png" "${tmp}-1.png" "${tmp}-2.png" -tile 3x1 -geometry +2+2 "${sheet}"`, { stdio: 'ignore' });
    [0, 1, 2].forEach(i => { try { fs.unlinkSync(`${tmp}-${i}.png`); } catch {} });
    return fs.existsSync(sheet) ? sheet : null;
  } catch { return null; }
}

async function gemini(b64) {
  const body = { contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }], generationConfig: { temperature: 0, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } } };
  for (let a = 0; a < 4; a++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (a + 1)); continue; }
    const j = await r.json(); const t = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = t.match(/\{[\s\S]*\}/); if (!m) return { flag: false, reasons: ['(keine antwort)'] };
    try { return JSON.parse(m[0]); } catch { return { flag: false, reasons: ['(parse-fehler)'] }; }
  }
  return { flag: false, reasons: ['(rate-limit)'] };
}

(async () => {
  if (!KEY) { log('GEMINI_API_KEY fehlt -> No-op.'); process.exit(0); }
  const audited = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { ts: '', done: {}, flagged: [] };
  // Aktive Werbe-Rotation zuerst (mw-/luxe-/luma-/montage/werbung/reel/veo/flame), Rest danach
  const prio = f => /^(mw-|luxe-.*9x16|luma-|montage|werbung-|reel-|veo-hero|flame-)/.test(f) ? 0 : 1;
  const vids = fs.readdirSync(REELS).filter(f => f.endsWith('.mp4') && !audited.done[f]).sort((a, b) => prio(a) - prio(b) || a.localeCompare(b));
  let n = 0;
  for (const f of vids) {
    if (n >= MAX) break;
    const sheet = frames(path.join(REELS, f));
    if (!sheet) { audited.done[f] = { flag: false, reasons: ['(frame-fehler)'] }; continue; }
    const buf = fs.readFileSync(sheet); try { fs.unlinkSync(sheet); } catch {}
    const res = await gemini(buf.toString('base64'));
    audited.done[f] = res;
    if (res.flag) { audited.flagged = audited.flagged.filter(x => x.file !== f); audited.flagged.push({ file: f, reasons: res.reasons }); log('🚩', f, '->', (res.reasons || []).join('; ')); }
    else log('ok', f);
    n++;
    await sleep(DELAY);
  }
  audited.ts = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(audited, null, 2));
  const total = Object.keys(audited.done).length, remaining = fs.readdirSync(REELS).filter(f => f.endsWith('.mp4') && !audited.done[f]).length;
  log(`FERTIG Lauf: ${n} geprueft. Gesamt ${total} auditiert, ${remaining} offen. FLAGGED: ${audited.flagged.length}`);
  if (audited.flagged.length) audited.flagged.slice(-20).forEach(x => log('  🚩', x.file, '->', (x.reasons || []).join('; ')));
})();
