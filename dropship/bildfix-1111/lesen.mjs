// lesen.mjs: liest Produkte (Handles) nur lesend und baut je Produkt einen Kontaktbogen aller Bilder.
// Aufruf: NODE_USE_ENV_PROXY=1 node dropship/bildfix-1111/lesen.mjs <handles.txt> <ausgabeordner>
// Schreibt <ausgabe>/stand.json (Medien in Reihenfolge, Masse, Alt-Text, welche Varianten welches Bild tragen)
// und <ausgabe>/blatt/<handle>.jpg (Kacheln mit Nummer, Grösse, H = Hauptbild, V = Variantenbild).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const [listeDatei, aus] = process.argv.slice(2);
if (!listeDatei || !aus) { console.log('Aufruf: node lesen.mjs <handles.txt> <ausgabeordner>'); process.exit(2); }
const handles = readFileSync(listeDatei, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
});
const tj = await tr.json().catch(() => null);
const tok = tj && tj.access_token;
if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status); process.exit(2); }
const gql = async (q, v) => {
  const j = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query: q, variables: v }),
  })).json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
  return j.data;
};
const Q = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status
  featuredMedia{ id }
  media(first:50){ nodes{ id alt mediaContentType status ... on MediaImage{ image{ url width height } } } }
  variants(first:100){ nodes{ id title media(first:1){ nodes{ id } } } } } }`;

mkdirSync(join(aus, 'blatt'), { recursive: true });
mkdirSync(join(aus, 'kachel'), { recursive: true });
const font = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'].find(existsSync);
const stand = [];
for (const h of handles) {
  const p = (await gql(Q, { h })).productByIdentifier;
  if (!p) { console.log('FEHLT', h); stand.push({ handle: h, fehlt: true }); continue; }
  const variantBild = {};
  for (const v of p.variants.nodes) {
    const m = v.media.nodes[0]?.id;
    if (m) (variantBild[m] ||= []).push(v.title);
  }
  const medien = p.media.nodes.map((m, i) => ({
    pos: i + 1, id: m.id, typ: m.mediaContentType, status: m.status, alt: m.alt || '',
    url: m.image?.url || null, b: m.image?.width || null, h: m.image?.height || null,
    haupt: m.id === p.featuredMedia?.id, varianten: variantBild[m.id] || [],
  }));
  stand.push({ handle: p.handle, id: p.id, titel: p.title, status: p.status, varianten: p.variants.nodes.length, medien });
  // Kontaktbogen
  const dir = join(aus, 'kachel', p.handle.replace(/[^a-z0-9-]/gi, '_'));
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const m of medien) {
    if (!m.url) continue;
    n += 1;
    const roh = join(dir, `roh_${String(n).padStart(2, '0')}.jpg`);
    const r = await fetch(m.url + (m.url.includes('?') ? '&' : '?') + 'width=360');
    writeFileSync(roh, Buffer.from(await r.arrayBuffer()));
    const label = `${m.pos}  ${m.b}x${m.h}${m.haupt ? '  H' : ''}${m.varianten.length ? '  V' + m.varianten.length : ''}`;
    const k = join(dir, `k_${String(n).padStart(2, '0')}.png`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', roh, '-vf',
      `scale=300:300:force_original_aspect_ratio=decrease,pad=300:330:(ow-iw)/2:30:white,drawtext=fontfile=${font}:text='${label}':x=6:y=6:fontsize=18:fontcolor=black`,
      '-frames:v', '1', k]);
  }
  if (n) {
    const spalten = Math.min(n, 5), zeilen = Math.ceil(n / spalten);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, 'k_%02d.png'),
      '-vf', `tile=${spalten}x${zeilen}:padding=4:color=gray`, '-frames:v', '1', '-q:v', '4', join(aus, 'blatt', `${p.handle.replace(/[^a-z0-9-]/gi, '_')}.jpg`)]);
  }
  console.log('ok', p.handle, p.status, 'Bilder', medien.length, 'Varianten', p.variants.nodes.length);
}
writeFileSync(join(aus, 'stand.json'), JSON.stringify({ gelesen: new Date().toISOString(), produkte: stand }, null, 1));
console.log('fertig', stand.length);
