#!/usr/bin/env node
/* post-audit.mjs - Alte Posts ueberall pruefen (Vision) + klare Verstoesse loeschen.
 * =============================================================================================
 * User 2026-06-21 "alte post mit tool/videos analysieren ueberall, loeschen falls was nicht passt, entscheide du".
 * Oeffnet das Profil (Stagehand/Brave CDP 9222), screenshottet die obersten N Posts, schickt jeden an
 * Gemini-Vision und flaggt VERSTOESSE: asiatische/chinesische Schrift, "MADE IN CHINA", Lieferanten-Watermark,
 * starkes Text-Overlay/Collage, unscharf/billig, Off-Brand. KONSERVATIV: nur klare Verstoesse -> loeschen.
 * DRY ist Standard (nur Report + Screenshots). Mit --go werden geflaggte Posts geloescht.
 *
 * START am PC:  node automation/local/post-audit.mjs --platform ig            (DRY-Audit)
 *               node automation/local/post-audit.mjs --platform tiktok --go   (loescht Verstoesse)
 *               node automation/local/post-audit.mjs --platform fb --n 12
 * Voraussetzung: GEMINI_API_KEY (luxe-secrets.ps1) + Brave-agent 9222 eingeloggt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'post-audit-shots');
fs.mkdirSync(SHOT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? (process.argv[i + 1] || d) : d; };
const PLATFORM = (arg('--platform', 'ig') || 'ig').toLowerCase();
const N = parseInt(arg('--n', '10'), 10);
const GO = process.argv.includes('--go');
const GKEY = process.env.GEMINI_API_KEY;
const GMODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROFILE = {
  ig: 'https://www.instagram.com/luxestyle.ch/',
  tiktok: 'https://www.tiktok.com/@luxestyle.ch',
  fb: 'https://www.facebook.com/profile.php?id=1049840534888592',
};
const PROMPT = `Du pruefst einen Social-Media-Post eines SCHWEIZER Premium-Mode-Shops (LuxeStyle).
Flagge NUR klare Marken-/Qualitaets-Verstoesse. Antworte als JSON {"delete":true|false,"grund":"kurz"}.
delete=true NUR wenn EINDEUTIG: chinesische/asiatische Schrift im Bild/Verpackung; "MADE IN CHINA"; Lieferanten-Watermark
(z.B. ZHUMENG); starkes stoerendes Text-Overlay/Vorher-Nachher-Collage; sehr unscharf/billig/verpixelt; klar off-brand/irrefuehrend.
Im Zweifel (sieht ok/premium aus) delete=false. Sei konservativ.`;

async function vision(buf) {
  if (!GKEY) return { delete: false, grund: '(kein GEMINI_API_KEY)' };
  if (buf.length > 4_000_000) return { delete: false, grund: '(zu gross)' };
  const body = { contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/png', data: buf.toString('base64') } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } } };
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:generateContent?key=${GKEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = t.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (e) { return { delete: false, grund: 'vision-fehler: ' + String(e).slice(0, 40) }; }
  return { delete: false, grund: '(keine Antwort)' };
}

(async () => {
  let ab; try { ab = await aiBrowser(); } catch { log('Kein Brave 9222.'); process.exit(1); }
  const p = ab.page;
  log('Modus:', ab.mode, '· Plattform:', PLATFORM, '· N:', N, GO ? '· LOESCHEN' : '· DRY');
  const res = { ts: new Date().toISOString(), platform: PLATFORM, mode: ab.mode, dry: !GO, checked: 0, flagged: [], deleted: 0 };
  try {
    await p.goto(PROFILE[PLATFORM] || PROFILE.ig, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(6000);
    if (/login|anmelden|sign in/i.test((await p.content()).slice(0, 2500))) { log('Nicht eingeloggt.'); res.error = 'NOT_LOGGED_IN'; }
    else {
      await p.screenshot({ path: path.join(SHOT, `${PLATFORM}-grid.png`) });
      for (let i = 0; i < N; i++) {
        try {
          if (ab.mode === 'stagehand') await ab.act(`oeffne den Post Nummer ${i + 1} im Profil-Grid (von oben links nach rechts gezaehlt)`).catch(() => {});
          await sleep(2500);
          const file = path.join(SHOT, `${PLATFORM}-post-${i + 1}.png`);
          await p.screenshot({ path: file });
          const buf = fs.readFileSync(file);
          const v = await vision(buf); res.checked++;
          log(`Post ${i + 1}: delete=${v.delete} (${v.grund})`);
          if (v.delete) {
            res.flagged.push({ n: i + 1, grund: v.grund });
            if (GO && ab.mode === 'stagehand' && PLATFORM !== 'ig') { // IG-API/Browser-Delete fragil -> nur fb/tiktok auto
              try { await ab.act('oeffne das Mehr-Optionen-Menue (...) dieses Posts und klicke Loeschen/Delete, dann bestaetige'); await sleep(3000); res.deleted++; log(`  -> geloescht.`); } catch (e) { log('  loeschen fehlgeschlagen:', String(e).slice(0, 50)); }
            }
          }
          // zurueck zum Grid
          if (ab.mode === 'stagehand') await ab.act('gehe zurueck zum Profil-Grid (Browser zurueck / schliessen)').catch(() => {});
          await sleep(1500);
        } catch (e) { log(`Post ${i + 1} Fehler:`, String(e).slice(0, 50)); }
      }
    }
  } catch (e) { log('Fehler:', String(e).slice(0, 80)); res.error = String(e).slice(0, 100); }
  try { fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'reports', `post-audit-${PLATFORM}.json`), JSON.stringify(res, null, 2)); } catch {}
  await ab.close().catch(() => {});
  log(`Fertig: ${res.checked} geprueft, ${res.flagged.length} geflaggt, ${res.deleted} geloescht. Report reports/post-audit-${PLATFORM}.json`);
  process.exit(0);
})();
