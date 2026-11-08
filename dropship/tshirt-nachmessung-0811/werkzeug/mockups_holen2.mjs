// Nachmessung 08.11.2026 (Besitzer: «messes nach aber erst am sonntag 21 uhr»): T-Shirt-Modelle 71, 586, 456, je Vorderseite, Weiss M, zwei Lagen des Designs.
// Printful-Mockup-Generator, höchstens 6 Aufgaben (Auftrag), nacheinander, nur POST create-task + GET task + Download des Ergebnisbilds. Schlüssel nur aus der Umgebung.
// Nutzung: node mockups_holen2.mjs <name> [...]   Schreibt out2/<name>.json und <name>.jpg in diesen Ordner. Keine Wiederholung bei Fehler.
import fs from 'node:fs';
const KEY = process.env.PRINTFUL_API_KEY, STORE = process.env.PRINTFUL_STORE_ID;
if (!KEY || !STORE) { console.error('Zugang fehlt'); process.exit(2); }
const HDR = { Authorization: `Bearer ${KEY}`, 'X-PF-Store-Id': STORE, 'Content-Type': 'application/json' };
const API = 'https://api.printful.com';
const PHOTO = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/59641_1_256ba8dc-9abe-45f1-b1c8-54c696fe7aed.jpg?v=1784844378';
const pos = (top) => ({ area_width: 1800, area_height: 2400, width: 1000, height: 992, top, left: 400 });
const mk = (pid, vid, top) => ({ pid, body: { variant_ids: [vid], format: 'jpg', width: 800, files: [{ placement: 'front', image_url: PHOTO, position: pos(top) }] } });
const SPECS = {
  s71t: mk(71, 4012, 300), s71l: mk(71, 4012, 1200),
  s586t: mk(586, 15125, 300), s586l: mk(586, 15125, 1200),
  s456t: mk(456, 11865, 300), s456l: mk(456, 11865, 1200),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('out2', { recursive: true });
for (const name of process.argv.slice(2)) {
  const sp = SPECS[name]; if (!sp) { console.log('unbekannt', name); continue; }
  const rec = { name, pid: sp.pid, request: sp.body, start: new Date().toISOString() };
  const res = await fetch(`${API}/mockup-generator/create-task/${sp.pid}`, { method: 'POST', headers: HDR, body: JSON.stringify(sp.body) });
  rec.postStatus = res.status; rec.rl = { limit: res.headers.get('x-ratelimit-limit'), remaining: res.headers.get('x-ratelimit-remaining'), reset: res.headers.get('x-ratelimit-reset') };
  const j = await res.json().catch(() => ({}));
  rec.post = j;
  console.log(name, 'POST', res.status, JSON.stringify(rec.rl), JSON.stringify(j).slice(0, 160));
  const key = j?.result?.task_key;
  if (!key) { fs.writeFileSync(`out2/${name}.json`, JSON.stringify(rec, null, 1)); console.log('KEIN task_key, Abbruch dieses Modells (keine Wiederholung)'); continue; }
  const t0 = Date.now(); await sleep(8000);
  let final = null;
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${API}/mockup-generator/task?task_key=${encodeURIComponent(key)}`, { headers: HDR });
    const x = await r.json().catch(() => ({}));
    const st = x?.result?.status;
    if (st === 'completed' || st === 'failed' || (r.status >= 400 && r.status !== 429)) { final = x; break; }
    await sleep(3000);
  }
  rec.doneMs = Date.now() - t0; rec.final = final;
  const m = final?.result?.mockups?.[0];
  if (m?.mockup_url) {
    const b = Buffer.from(await (await fetch(m.mockup_url)).arrayBuffer());
    fs.writeFileSync(`${name}.jpg`, b); rec.bytes = b.length; rec.mockup = { placement: m.placement, variant_ids: m.variant_ids, extra: (m.extra || []).length };
  }
  fs.writeFileSync(`out2/${name}.json`, JSON.stringify(rec, null, 1));
  console.log(name, 'fertig', rec.doneMs, 'ms', final?.result?.status, rec.bytes || '', final?.result?.error ? JSON.stringify(final.result.error) : '');
  await sleep(20000);
}
