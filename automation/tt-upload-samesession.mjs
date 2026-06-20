#!/usr/bin/env node
/* tt-upload-samesession.mjs — postet ein Reel auf TikTok ueber eine SCHON LAUFENDE Browserbase-Session
 * (gleiche Session = gleiche IP = Login haelt, anders als context-reuse auf Gratis-Plan).
 *
 * ENV: BROWSERBASE_API_KEY, TT_SESSION_ID, VIDEO_URL, CAPTION, GO=1 (sonst Dry: nicht posten)
 */
import fs from 'node:fs';
const KEY = process.env.BROWSERBASE_API_KEY;
const SID = process.env.TT_SESSION_ID;
const VIDEO = process.env.VIDEO_URL;
const CAPTION = process.env.CAPTION || '';
const GO = process.env.GO === '1';
if (!KEY || !SID || !VIDEO) { console.error('Fehlt KEY/SID/VIDEO'); process.exit(1); }

const { chromium } = await import('playwright-core');
const connectUrl = `wss://connect.browserbase.com?apiKey=${encodeURIComponent(KEY)}&sessionId=${SID}`;
console.log('Verbinde mit laufender Session', SID, '...');

// Video laden
const buf = Buffer.from(await (await fetch(VIDEO)).arrayBuffer());
fs.writeFileSync('/tmp/tt_post.mp4', buf);
console.log('Video geladen:', buf.length, 'bytes');

const browser = await chromium.connectOverCDP(connectUrl);
const ctx = browser.contexts()[0] || await browser.newContext();
const page = ctx.pages()[0] || await ctx.newPage();

await page.goto('https://www.tiktok.com/tiktokstudio/upload?lang=de', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(4000);
const u = page.url();
console.log('URL nach Navigation:', u);
if (/\/login/.test(u)) { await page.screenshot({ path: '/tmp/tt_post_fail.png' }); console.error('NICHT eingeloggt (auf /login).'); await browser.close(); process.exit(2); }

let set = false;
try { await page.setInputFiles('input[type="file"]', '/tmp/tt_post.mp4', { timeout: 12000 }); set = true; } catch {}
if (!set) for (const fr of page.frames()) { try { await fr.setInputFiles('input[type="file"]', '/tmp/tt_post.mp4', { timeout: 6000 }); set = true; break; } catch {} }
if (!set) { await page.screenshot({ path: '/tmp/tt_post_fail.png' }); console.error('Datei-Input nicht gefunden.'); await browser.close(); process.exit(3); }
console.log('Datei gesetzt — warte auf Verarbeitung ...');
await page.waitForTimeout(16000);

if (CAPTION) {
  try {
    const cap = page.locator('div[contenteditable="true"]').first();
    await cap.click({ timeout: 8000 });
    await page.keyboard.press('Control+a'); await page.keyboard.press('Delete');
    await cap.type(CAPTION, { delay: 10 });
  } catch (e) { console.error('Caption-Fehler:', e.message); }
}
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/tt_post_ready.png' });
console.log('Vorbereitet (Screenshot /tmp/tt_post_ready.png).');

if (!GO) { console.log('DRY — nicht gepostet (GO=1 zum Posten).'); await browser.close(); process.exit(0); }

// Posten-Button
const sels = ['button[data-e2e="post_video_button"]','button:has-text("Posten")','button:has-text("Post")'];
let posted = false;
for (const s of sels) { try { const l = page.locator(s).first(); await l.waitFor({ state:'visible', timeout:8000 }); await l.click(); posted = true; break; } catch {} }
if (!posted) { await page.screenshot({ path:'/tmp/tt_post_fail.png' }); console.error('Posten-Button nicht gefunden.'); await browser.close(); process.exit(4); }
await page.waitForTimeout(10000);
await page.screenshot({ path: '/tmp/tt_post_done.png' });
console.log('✓ GEPOSTET (Screenshot /tmp/tt_post_done.png).');
await browser.close();
