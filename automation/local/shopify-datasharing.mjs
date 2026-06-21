#!/usr/bin/env node
/* shopify-datasharing.mjs - klickt im Shopify-TikTok-Kanal "Datenfreigabe = Maximum" (= CAPI/Events-API an).
 * User 2026-06-21 "du machst die klicks": Bot klickt die Datenfreigabe selbst (Stagehand via Brave-CDP 9222).
 * START: node automation/local/shopify-datasharing.mjs   (DRY)   |   AUTO_GO=1 node ... (klickt+speichert)
 * Voraussetzung: brave-agent bei admin.shopify.com eingeloggt + GEMINI/GROQ-Key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiBrowser } from '../lib/ai-browser.mjs';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const SHOT = path.join(ROOT, 'automation', 'local', 'datasharing-shots');
fs.mkdirSync(SHOT, { recursive: true });
const HANDLE = process.env.SHOP_HANDLE || 'luxestyle-ch';
const GO = process.env.AUTO_GO === '1';
const URL = `https://admin.shopify.com/store/${HANDLE}/apps/tiktok-ads-2/shopify_app`;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const diag = async (p, n) => { try { await p.screenshot({ path: path.join(SHOT, n + '.png') }); } catch {} };

(async () => {
  let ab; try { ab = await aiBrowser(); } catch { log('Kein Brave 9222.'); process.exit(1); }
  const p = ab.page;
  const res = { ts: new Date().toISOString(), mode: ab.mode, dry: !GO, steps: [] };
  const A = async (instr, name) => { try { await ab.act(instr); res.steps.push(name + ':ok'); } catch (e) { res.steps.push(name + ':' + String(e).slice(0, 35)); log('act!', name, String(e).slice(0, 45)); } await sleep(2500); if (name) await diag(p, name); };
  try {
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(7000);
    try { await p.keyboard.press('Escape'); } catch {}
    await diag(p, '01-open');
    if (ab.mode !== 'stagehand') { res.result = 'AI_INAKTIV'; log('Stagehand nicht aktiv.'); }
    else {
      await A('oeffne die Einstellungen / Settings des TikTok-Kanals', '02-settings');
      await A('gehe zum Menuepunkt "Datenfreigabe" (Data sharing)', '03-datasharing');
      await A('stelle die Datenfreigabe auf "Maximum" (waehle die hoechste/erweiterte Stufe)', '04-maximum');
      if (!GO) { res.result = 'DRY_OK'; log('DRY: nicht gespeichert.'); }
      else { await A('klicke Speichern/Save um die Datenfreigabe-Einstellung zu bestaetigen', '05-saved'); res.result = 'SAVED'; }
    }
  } catch (e) { res.result = res.result || 'ERROR'; res.error = String(e).slice(0, 100); log('Fehler:', String(e).slice(0, 70)); }
  try { fs.writeFileSync(path.join(ROOT, 'reports', 'datasharing-last-run.json'), JSON.stringify(res, null, 2)); } catch {}
  await ab.close().catch(() => {});
  log('Fertig:', res.result, '·', res.steps.join(' | '));
  process.exit(0);
})();
