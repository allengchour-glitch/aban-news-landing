#!/usr/bin/env node
/* LuxeStyle — luma_agents_video.mjs  (Weg C v2: Luma AGENTS-API, hands-free generate+attach)
 *
 * Macht aus dem Produkt-Hauptbild ein Bewegungs-Video über die **Agents-API**
 * (agents.lumalabs.ai/v1, Modell ray-3.2) und hängt es direkt ans Produkt
 * (attach_video_to_product.mjs). Läuft autonom über eine Produktliste bis das
 * Luma-Guthaben leer ist (HTTP „Insufficient credits").
 *
 * Secrets/Env:
 *   LUMA_API_KEY            (Agents-Key, Format luma-api-…)
 *   SHOPIFY_SHOP            (au3j0y-hq.myshopify.com)
 *   SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET   (oder SHOPIFY_ADMIN_TOKEN) — fürs Anhängen
 *
 * CLI:
 *   node automation/luma_agents_video.mjs --pids 123,456,789
 *   node automation/luma_agents_video.mjs --in dropship/video_pids.txt   (eine GID/ID je Zeile)
 *   --concurrency 3   (Agents-Limit ist 4 → 3 ist sicher)
 *   --no-attach       nur rendern + nach reels/ ablegen
 *   --dry             nur zeigen
 *
 * No-op: ohne LUMA_API_KEY → Exit 0.
 * Limits gelernt: max ~4 gleichzeitige Jobs (429 „concurrent…"); GET-by-id mit UA pollen;
 * fertige MP4 in output[0].url (S3, ~1h gültig → sofort laden).
 */
import fs from 'node:fs';
import path from 'node:path';
import { attachVideo, getFeaturedImageUrl } from './attach_video_to_product.mjs';

const KEY = process.env.LUMA_API_KEY || '';
const BASE = 'https://agents.lumalabs.ai/v1/generations';
const UA = 'Mozilla/5.0';
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = flag('--dry'), NO_ATTACH = flag('--no-attach');
const CONC = Number(val('--concurrency', '3'));

let ids = [];
const pidsFlag = val('--pids', ''); if (pidsFlag) ids = pidsFlag.split(',');
const inIdx = args.indexOf('--in');
if (inIdx >= 0 && args[inIdx + 1]) ids = ids.concat(fs.readFileSync(args[inIdx + 1], 'utf8').split(/\r?\n/));
ids = [...new Set(ids.map(s => s.trim()).filter(Boolean).map(x => x.startsWith('gid://') ? x : `gid://shopify/Product/${x}`))];

if (!KEY) { console.error('LUMA_API_KEY fehlt → No-op.'); process.exit(0); }
if (!ids.length) { console.error('Keine IDs. --pids 1,2 ODER --in datei.txt'); process.exit(1); }
const REELS = path.resolve('reels'); fs.mkdirSync(REELS, { recursive: true });

const prompt = (t) => `Premium e-commerce product showcase of "${t}". Slow elegant cinematic camera, gentle smooth ` +
  `push-in, soft studio lighting, shallow depth of field. Product stays sharp and centered, no warping, ` +
  `no text, no logos, no extra objects. Calm, high-end, stable.`;

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'User-Agent': UA }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch {}
  return { ok: r.ok, status: r.status, j, txt };
}
const isCredit = (s) => /insufficient|credit|402/i.test(s) && !/concurrent/i.test(s);

(async () => {
  const queue = ids.slice(); const active = new Map(); let credit = false, done = 0, failed = 0;
  while ((queue.length || active.size) && !credit) {
    while (queue.length && active.size < CONC && !credit) {
      const pid = queue[0];
      let title = '', img = '';
      try { ({ title, url: img } = await getFeaturedImageUrl(pid)); } catch (e) { console.error('skip(no img)', pid, e.message); queue.shift(); continue; }
      if (!img) { console.error('skip(no img)', pid); queue.shift(); continue; }
      if (DRY) { console.error('[dry]', pid, title); queue.shift(); continue; }
      const res = await api('POST', BASE, { model: 'ray-3.2', type: 'video', prompt: prompt(title), aspect_ratio: '9:16', video: { resolution: '720p', duration: '5s', start_frame: { url: img } } });
      if (res.ok && res.j.id) { active.set(pid, { gid: res.j.id, title }); queue.shift(); console.error('SUBMIT', pid, res.j.id); await new Promise(r => setTimeout(r, 2000)); }
      else if (isCredit(res.txt)) { console.error('CREDIT_EXHAUSTED', res.txt.slice(0, 80)); credit = true; }
      else { await new Promise(r => setTimeout(r, 8000)); break; } // 429 concurrent/rate → warten
    }
    for (const [pid, info] of [...active]) {
      const res = await api('GET', `${BASE}/${info.gid}`);
      const st = res.j.state;
      if (st === 'completed') {
        const u = (res.j.output || [])[0]?.url;
        active.delete(pid);
        if (u) {
          const out = path.join(REELS, `agents-${pid.split('/').pop()}.mp4`);
          fs.writeFileSync(out, Buffer.from(await (await fetch(u)).arrayBuffer()));
          if (!NO_ATTACH) { try { await attachVideo({ productId: pid, file: out, alt: `${info.title} – Produktvideo` }); console.error('DONE+ATTACH', pid); done++; } catch (e) { console.error('attach-fail', pid, e.message); failed++; } }
          else { console.error('DONE', pid, out); done++; }
        } else { console.error('completed-no-url', pid); failed++; }
      } else if (st === 'failed') { active.delete(pid); console.error('FAILED', pid, res.j.failure_reason); failed++; }
    }
    if (active.size) await new Promise(r => setTimeout(r, active.size >= CONC ? 8000 : 4000));
  }
  console.error(`FERTIG. attached=${done} failed=${failed} credit_leer=${credit} rest=${queue.length}`);
})();
