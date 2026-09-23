#!/usr/bin/env node
/* ig_karussell_post.mjs — postet GENAU EIN Slide-Set (4:5, aus tiktok_karussell.py FORMAT=ig) als
 * Instagram-Karussell und danach als Facebook-Album. Betreiber 23.09.2026: «insta karusell brauchen».
 *
 * Quelle: social/ig_karussell.csv (slug,modus,slides,ordner,produkte,caption,status), Bilder liegen im Repo
 * unter social/instagram/<slug>/NN.jpg und werden von raw.githubusercontent geholt (oeffentliches Repo;
 * derselbe Weg wie die Reels seit 22.09.). Ein Set, das noch nicht gepusht ist, antwortet 404 → der Poster
 * pusht es selbst (unter der Repo-Sperre) und prueft erneut.
 *
 * WACHEN (GEHIRN 10, alle Schichten):
 *  · postLock() — EIN Lock fuer alle Poster (/tmp/ig_post.lock) inkl. Betreiber-Stopp.
 *  · Produkt-Sperre: produktGepostet(caption, slug) — dieselbe Ware nie zweimal (Bild-, Reel-, Karussell-Poster).
 *    Top-Sets (mehrere Produkte) laufen, wenn mindestens die Haelfte der Ware noch nie beworben wurde.
 *  · Live-Abgleich: die letzten 25 IG-Posts nach Caption-Signatur (Plattform-Wahrheit schlaegt Ledger).
 *  · Produkt muss ACTIVE und im Onlineshop sein (productByHandle; Slug == Handle ist Vertragsbasis).
 *  · Jede Bildadresse wird vor dem Post geprueft (200); nach dem Post wird jedes Bild im gemeinsamen Ledger
 *    gemerkt (mark) und jede Ware einzeln (produktMerken) — sonst kaeme sie spaeter als Einzelpost wieder.
 *  · Erst claimen (posting), dann posten; IG zuerst, FB nur nach IG-Erfolg; Status posted-ig-fb / posted-ig.
 *
 * ENV: IG_USER_ID (/tmp/meta_ig_id) · META_ACCESS_TOKEN (/tmp/meta_page_token) · FB_PAGE_ID · DRY=1 · NUR_SLUG=<slug>
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { lock as postLock, seen as postSeen, mark as postMark, produktGepostet, produktMerken, fbSeitenIdentitaet } from './post_guard.mjs';

const V = 'v21.0';
const IG_ID = process.env.IG_USER_ID || (fs.existsSync('/tmp/meta_ig_id') ? fs.readFileSync('/tmp/meta_ig_id', 'utf8').trim() : '');
const FB_ID = process.env.FB_PAGE_ID || '1049840534888592';
const TOK = process.env.META_ACCESS_TOKEN || (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token', 'utf8').trim() : '');
const DRY = process.env.DRY === '1';
const CSV = 'social/ig_karussell.csv';
const BRANCH = 'claude/luxestyle-status-tztnn1';
const RAW = `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/${BRANCH}/`;
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const STOK = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
const schlaf = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(CSV)) { console.log('Keine Queue (social/ig_karussell.csv) → No-op.'); process.exit(0); }

// ---------------------------------------------------------------- CSV (mehrzeilige Captions in Anfuehrungszeichen)
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}
const esc = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
const idx = Object.fromEntries(rows[0].map((h, i) => [h.trim(), i]));
const get = (r, k) => (r[idx[k]] || '').trim();
const setzen = (r, k, v) => { r[idx[k]] = v; };
if (idx.posted_at === undefined) { rows[0].push('posted_at', 'post_url'); idx.posted_at = rows[0].length - 2; idx.post_url = rows[0].length - 1; }
const writeLedger = () => fs.writeFileSync(CSV, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');

// ---------------------------------------------------------------- Kandidat
const capSig = s => (s || '').toLowerCase().replace(/[#@].*/s, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 45);
const bereit = rows.slice(1).filter(r => get(r, 'status') === 'ready' && (!process.env.NUR_SLUG || get(r, 'slug') === process.env.NUR_SLUG));
// Produkt-Sets zuerst (ein Produkt, klare Wache), Top-Sets danach
bereit.sort((a, b) => (get(a, 'modus') === 'produkt' ? 0 : 1) - (get(b, 'modus') === 'produkt' ? 0 : 1));
if (!bereit.length) { console.log('Nichts faellig: kein ready-Karussell.'); process.exit(0); }

async function gql(q, v) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': STOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) });
      const d = await r.json(); if (d && d.data) return d.data;
    } catch {}
    await schlaf(2000 * (a + 1));
  }
  return null;
}
async function produktLive(handle) {
  if (!STOK) return { ok: false, grund: 'kein Shop-Token' };
  const d = await gql(`query($h:String!){ productByHandle(handle:$h){ status onlineStoreUrl title } }`, { h: handle });
  if (!d) return { ok: false, grund: 'Shopify nicht erreichbar' };
  const p = d.productByHandle; if (!p) return { ok: false, grund: 'Produkt existiert nicht mehr' };
  return { ok: p.status === 'ACTIVE' && !!p.onlineStoreUrl, grund: `status ${p.status}, onlineStoreUrl ${p.onlineStoreUrl ? 'ja' : 'nein'}`, title: p.title };
}
const http = u => { try { return execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', u], { encoding: 'utf8' }).trim(); } catch { return 'curl'; } };
function pushen(pfade, msg) {
  const cmd = `if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then git rebase --quit 2>/dev/null || rm -rf .git/rebase-merge .git/rebase-apply; fi; git add ${pfade.map(p => `'${p}'`).join(' ')} && (git diff --cached --quiet || git commit -q -m '${msg.replace(/'/g, '')}'); git fetch -q origin ${BRANCH} && git -c rebase.autoStash=true rebase -q FETCH_HEAD && timeout 90 git push -q origin ${BRANCH}`;
  try { execFileSync('flock', ['-w', '180', '/tmp/git_repo.lock', 'bash', '-c', cmd], { stdio: 'ignore' }); return true; } catch { return false; }
}
async function g(pfad, params) {
  const body = new URLSearchParams({ ...params, access_token: TOK });
  const r = await fetch(`https://graph.facebook.com/${V}/${pfad}`, { method: 'POST', body });
  const j = await r.json(); if (j.error) throw new Error(j.error.message); return j;
}
async function igLiveHas(caption) {
  const want = capSig(caption); if (!want || !IG_ID || !TOK) return false;
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(`https://graph.facebook.com/${V}/${IG_ID}/media?fields=caption&limit=25&access_token=${encodeURIComponent(TOK)}`); const j = await r.json(); if (Array.isArray(j.data)) return j.data.some(p => capSig(p.caption) === want); } catch {}
    await schlaf(2000 * (a + 1));
  }
  console.error('⚠️ IG-Live-Abgleich nicht erreichbar → nur lokale Wachen.'); return false;
}

let cand = null, bilder = [], caption = '', handles = [];
for (const r of bereit) {
  const slug = get(r, 'slug'), ordner = get(r, 'ordner'), n = parseInt(get(r, 'slides') || '0', 10);
  handles = get(r, 'produkte').split(/\s+/).filter(Boolean);
  caption = get(r, 'caption').replace(/ ⏎ /g, '\n').replace(/⏎/g, '\n');
  // Produkt-Sperre (plattformuebergreifend, nach WARE)
  const schon = handles.filter(h => produktGepostet(caption, h));
  if (get(r, 'modus') === 'produkt' ? schon.length : schon.length * 2 > handles.length) { console.log(`   ⛔ Ware schon beworben (${schon.join(',')}) → posted-dup-produkt: ${slug}`); if (!DRY) { setzen(r, 'status', 'posted-dup-produkt'); writeLedger(); } continue; }
  // Produkt live? (Produkt-Sets: der Slug ist das Handle)
  if (get(r, 'modus') === 'produkt') {
    const pl = await produktLive(slug);
    if (!pl.ok) { console.log(`   ⛔ ${slug}: ${pl.grund}`); if (!DRY && /existiert nicht|status DRAFT|status ARCHIVED|onlineStoreUrl nein/.test(pl.grund)) { setzen(r, 'status', 'produkt-nicht-aktiv'); writeLedger(); } continue; }
  }
  // Bilder erreichbar? sonst pushen und erneut pruefen
  bilder = Array.from({ length: n }, (_, i) => `${RAW}${ordner}/${String(i + 1).padStart(2, '0')}.jpg`);
  let codes = bilder.map(http);
  if (codes.some(c => c !== '200') && fs.existsSync(ordner)) {
    console.log(`   Bilder noch nicht gepusht (${codes.join(',')}) → Push`);
    if (!DRY) { pushen([ordner, CSV], `IG-Karussell-Slides ${slug} [skip ci]`); await schlaf(8000); codes = bilder.map(http); }
  }
  if (codes.some(c => c !== '200')) { console.log(`   ⛔ ${slug}: Bilder antworten ${codes.join(',')} → uebersprungen`); continue; }
  if (bilder.some(b => postSeen(b))) { console.log(`   ⛔ ${slug}: Bild schon gepostet (gemeinsamer Ledger)`); if (!DRY) { setzen(r, 'status', 'posted-dup-skip'); writeLedger(); } continue; }
  cand = r; break;
}
if (!cand) { console.log('Kein postbares Karussell.'); process.exit(0); }
console.log(`Karussell: ${get(cand, 'slug')} (${get(cand, 'modus')}, ${bilder.length} Slides)\n${caption.slice(0, 200)}…`);
if (DRY) { console.log('[DRY] wuerde jetzt IG-Karussell + FB-Album posten.'); process.exit(0); }
if (!IG_ID || !TOK) { console.error('⛔ IG_USER_ID / META_ACCESS_TOKEN fehlen.'); process.exit(1); }
if (await igLiveHas(caption)) { console.log('⛔ Auf IG bereits live (Caption-Signatur) → posted-dup-live'); setzen(cand, 'status', 'posted-dup-live'); writeLedger(); process.exit(0); }

const release = postLock(20);
setzen(cand, 'status', 'posting'); setzen(cand, 'posted_at', new Date().toISOString()); writeLedger();
let igId = null;
try {
  const kinder = [];
  for (const b of bilder) { const j = await g(`${IG_ID}/media`, { image_url: b, is_carousel_item: 'true' }); kinder.push(j.id); await schlaf(1200); }
  const c = await g(`${IG_ID}/media`, { media_type: 'CAROUSEL', children: kinder.join(','), caption });
  for (let i = 0; i < 12 && !igId; i++) {
    await schlaf(5000);
    try { igId = (await g(`${IG_ID}/media_publish`, { creation_id: c.id })).id; }
    catch (e) { console.log(`   … warte (${e.message.slice(0, 60)})`); }
  }
  if (!igId) throw new Error('IG-Karussell nicht veroeffentlicht (12 Versuche)');
  for (const b of bilder) postMark(b);                       // Ledger SOFORT nach IG
  for (const h of handles) produktMerken(caption, h);
  setzen(cand, 'status', 'posted-ig'); setzen(cand, 'post_url', `ig:${igId}`); writeLedger();
  console.log(`✅ IG-Karussell veroeffentlicht ${igId}`);
} catch (e) {
  setzen(cand, 'status', 'ready'); setzen(cand, 'posted_at', ''); writeLedger();
  console.error('✗ IG-Karussell fehlgeschlagen:', String(e.message || e)); release(); process.exit(1);
}
// Facebook: unveroeffentlichte Fotos + Beitrag mit attached_media (Album) — nur nach IG-Erfolg
try {
  const ident = await fbSeitenIdentitaet(TOK, FB_ID); if (!ident.ok) throw new Error(`FB-Seitenwache: ${ident.grund}`);
  const fbIds = [];
  for (const b of bilder) { const f = await g(`${FB_ID}/photos`, { url: b, published: 'false' }); fbIds.push(f.id); await schlaf(800); }
  const feld = {}; fbIds.forEach((id, i) => { feld[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  const fb = await g(`${FB_ID}/feed`, { message: caption, ...feld });
  setzen(cand, 'status', 'posted-ig-fb'); setzen(cand, 'post_url', `ig:${igId} fb:${fb.id}`); writeLedger();
  console.log(`✅ FB-Album veroeffentlicht ${fb.id}`);
} catch (e) { console.error(`⚠️ FB fehlgeschlagen (IG ist raus): ${e.message}`); }
finally { release(); }
fs.appendFileSync('dropship/_karussell_done.txt', `${new Date().toISOString()}\t${igId}\t${get(cand, 'slug')}\n`);
pushen([CSV, 'dropship/_karussell_done.txt', 'dropship/_posted_media.txt'], `IG-Karussell gepostet: ${get(cand, 'slug')} [skip ci]`);
console.log('FERTIG.');
