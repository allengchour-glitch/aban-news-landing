#!/usr/bin/env node
/* LuxeStyle — fb-group-post.mjs  (CH-FB-Gruppen-Posting → Page-Follower, Brave-CDP Port 9222)
 *
 * User 2026-06-17 „Facebook Follower sueche isch ou wichtig". FB hat KEINE saubere Follow-API +
 * blockt Automation am härtesten → einziger legitimer Wachstums-Hebel = in CH-Gruppen posten
 * (Reichweite → Profilbesuche → Page-Follows). SEHR konservativ: NUR 1 Gruppe pro Lauf, grosse
 * Pausen, Stopp bei Block, idempotent. Gruppen-URLs aus fb-groups.txt (nur wo man Mitglied ist).
 *
 * ⚠️ Risiko-Lehre: FB sperrt aggressiv. Lieber 1 hochwertiger Gruppen-Post/Tag als viele → Ban=Totalverlust.
 *
 * START (Brave --remote-debugging-port=9222, bei facebook.com eingeloggt):
 *   node automation/local/fb-group-post.mjs --dry   # ZUERST: nur diagnostizieren
 *   node automation/local/fb-group-post.mjs          # 1 Gruppe posten
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GROUPS = path.join(ROOT, 'automation', 'local', 'fb-groups.txt');
const DONE = path.join(ROOT, 'automation', 'local', 'fb-group-done.txt');
const SHOTS = path.join(ROOT, 'automation', 'local', 'fb-group-shots');
const CAP = Number(process.env.FB_GROUP_CAP || 1); // konservativ: 1 Gruppe/Lauf
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadGroups() {
  if (!fs.existsSync(GROUPS)) return [];
  return fs.readFileSync(GROUPS, 'utf8').split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && /facebook\.com\/groups\//.test(l));
}
// Nächste Caption + Bild aus der Queue (Top-Text-Karte) ziehen.
function nextPost() {
  try {
    const q = JSON.parse(fs.readFileSync(path.join(ROOT, 'automation/cloudflare/luxe-poster/src/queue.json'), 'utf8'));
    const img = q.find(x => x.type === 'image' && x.image);
    if (img) return { text: img.caption || 'Neu bi LuxeStyle ✨ luxestyle.ch · -10% mit WELCOME10', image: img.image };
  } catch {}
  return { text: 'Neui Teil bi LuxeStyle ✨ Schwiizer Shop · luxestyle.ch · -10% mit Code WELCOME10', image: null };
}

(async () => {
  const groups = loadGroups();
  if (!groups.length) { log('fb-groups.txt leer → No-op. (CH-Gruppen eintragen, in denen du Mitglied bist.)'); process.exit(0); }
  const done = fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8').split('\n').filter(Boolean) : [];
  // Rotation: heute eine andere Gruppe (Tages-Offset), die länger nicht dran war
  const todayKey = new Date().toISOString().slice(0, 10);
  const fresh = groups.filter(g => !done.includes(todayKey + ' ' + g));
  const targets = (fresh.length ? fresh : groups).slice(0, CAP);
  const post = nextPost();
  log(`${targets.length} Gruppe(n), Caption: ${post.text.slice(0, 50)}… ${DRY ? '(DRY)' : ''}`);

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222 (bei facebook.com eingeloggt sein).'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();

  for (const g of targets) {
    try {
      await p.goto(g, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(5000);
      if (DRY) { log('[dry] würde posten in', g); try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, 'grp.png') }); } catch {} continue; }
      // „Schreib etwas..."-Feld öffnen (mehrsprachig)
      const opener = p.getByText(/Schreib etwas|Write something|Beitrag erstellen|Create post/i).first();
      if (await opener.isVisible({ timeout: 6000 }).catch(() => false)) await opener.click();
      await sleep(2500);
      const box = p.getByRole('textbox').first();
      await box.click().catch(() => {});
      await box.type(post.text, { delay: 30 }).catch(() => {});
      await sleep(2000);
      // Blockade-Erkennung
      if (await p.getByText(/blockiert|blocked|temporarily/i).first().isVisible({ timeout: 1500 }).catch(() => false)) {
        log('⛔ FB-Block erkannt → stoppe sofort.'); break;
      }
      const postBtn = p.getByRole('button', { name: /^Posten$|^Post$/i }).first();
      if (await postBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await postBtn.click(); await sleep(4000);
        fs.appendFileSync(DONE, todayKey + ' ' + g + '\n');
        log('✅ gepostet in', g);
      } else { log('⚠️ Post-Button nicht gefunden — Screenshot.'); try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, 'nopost.png') }); } catch {} }
      await sleep(30000 + Math.random() * 30000); // grosse Pause
    } catch (e) { log('Fehler bei', g, e.message); }
  }
  log('Fertig (konservativ, 1 Gruppe/Lauf).');
  process.exit(0);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
