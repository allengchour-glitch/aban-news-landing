// Ultimate Ad: 4 Winner-Produktbilder → Luma img2video (ray-flash-2, 9:16) → /tmp/ult/cN.mp4
import fs from 'node:fs';
const KEY = process.env.LUMA_API_KEY;
const LUMA = 'https://api.lumalabs.ai/dream-machine/v1/generations';
const MODEL = 'ray-flash-2';
const picks = JSON.parse(fs.readFileSync('/tmp/ult_pick.json', 'utf8'));
fs.mkdirSync('/tmp/ult', { recursive: true });
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PROMPTS = {
  'Moissanite-Herzkette «Coeur»': 'elegant slow camera push-in on a silver heart necklace, soft sparkle, luxury, cinematic, no text',
  'Blazer «Roma»': 'subtle elegant motion, fashion model in red blazer, soft studio light, cinematic, no text',
  'Crossbody «Lido»': 'slow rotating luxury handbag, soft daylight, premium product shot, cinematic, no text',
  'Stiletto-Sandalette «Gala»': 'elegant slow pan over a high heel sandal, glossy, luxury, cinematic, no text',
};
(async () => {
  const ids = [];
  for (const p of picks) {
    const body = { prompt: PROMPTS[p.label] || 'elegant slow cinematic product motion, luxury, no text',
      model: MODEL, resolution: '720p', duration: '5s', aspect_ratio: '9:16',
      keyframes: { frame0: { type: 'image', url: p.img } } };
    const r = await (await fetch(LUMA, { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
    if (!r.id) { console.log('FAIL', p.label, JSON.stringify(r).slice(0, 200)); continue; }
    ids.push({ id: r.id, label: p.label, price: p.price }); console.log('gen', p.label, r.id);
    await sleep(1500);
  }
  fs.writeFileSync('/tmp/ult_ids.json', JSON.stringify(ids));
  // Poll all
  const done = {};
  for (let round = 0; round < 60; round++) {
    await sleep(10000);
    let allDone = true;
    for (const it of ids) {
      if (done[it.id]) continue;
      const s = await (await fetch(`${LUMA}/${it.id}`, { headers: H })).json();
      if (s.state === 'completed' && s.assets?.video) {
        const buf = Buffer.from(await (await fetch(s.assets.video)).arrayBuffer());
        const i = ids.indexOf(it);
        fs.writeFileSync(`/tmp/ult/c${i}.mp4`, buf);
        done[it.id] = true; console.log('done', it.label, (buf.length / 1024 / 1024).toFixed(1) + 'MB');
      } else if (s.state === 'failed') { done[it.id] = 'failed'; console.log('failed', it.label); }
      else allDone = false;
    }
    if (allDone) break;
  }
  console.log('READY clips:', Object.values(done).filter(x => x === true).length);
})();
