#!/usr/bin/env node
/* metricool_tiktok_post.mjs — postet GENAU EIN Reel aus automation/reels_seed.csv ueber Metricool
 * auf TikTok (Metricool ist TikTok-Partner und darf oeffentlich posten; unsere eigene TikTok-App
 * haengt seit 18.08. in der Pruefung).
 *
 * REGELN (GEHIRN 10, alle Schichten):
 *  · postLock() — EIN Lock fuer alle Poster (/tmp/ig_post.lock); seen()/mark() — EIN Ledger
 *    (_posted_media.txt, Video-Basename, PLATTFORMUEBERGREIFEND: ein Video, das auf IG/FB lief,
 *    geht NICHT auf TikTok; TikTok bekommt ein eigenes, noch nie gepostetes Reel).
 *  · nur status=ready; vor dem Post Zeile auf 'posting' (Claim), nach Erfolg 'posted-tiktok'.
 *    Der Meta-Poster nimmt nur 'ready' → keine Ueberschneidung.
 *  · Produkt muss ACTIVE und im Onlineshop sein (Reel-ID cjreel-<pid>), sonst kein Post.
 *  · Metricool bekommt NUR das Netzwerk tiktok. IG/FB bleiben beim Meta-Poster.
 *
 * ENV: METRICOOL_USER_TOKEN (oder /tmp/metricool.env mit METRICOOL_USER_TOKEN=…) ·
 *      METRICOOL_USER_ID (4801419) · METRICOOL_BLOG_ID (6227837, gemessen 23.09.) · MC_TZ (Europe/Zurich) ·
 *      VORLAUF_MIN (Default 10: Veroeffentlichung in N Minuten) · DRY=1
 */
import fs from 'node:fs';
import { lock as postLock, seen as postSeen, mark as postMark } from './post_guard.mjs';
// 22.09.: Adresse vor dem Post pruefen — 14 von 22 «ready»-Reels waren 404 (CDN-Dateien weg). 4xx → archived-deadurl.
import { execFileSync as _exf } from 'node:child_process';
const erreichbar = u => { try { const c = _exf('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', '-r', '0-1000', u], { encoding: 'utf8' }).trim(); return /^20[06]$/.test(c) ? true : c; } catch { return 'curl'; } };
function ersterErreichbare(liste, urlVon, statusSetzen) {
  for (const r of liste) {
    const e = erreichbar(urlVon(r)); if (e === true) return r;
    if (/^4\d\d$/.test(String(e))) { statusSetzen(r, 'archived-deadurl'); console.log(`   Adresse tot (${e}) → archived-deadurl: ${urlVon(r).slice(-50)}`); }
    else console.log(`   Adresse antwortet ${e} → uebersprungen: ${urlVon(r).slice(-50)}`);
  }
  return null;
}


const CSV = 'automation/reels_seed.csv';
const DRY = process.env.DRY === '1';
function tokenLesen() {
  if (process.env.METRICOOL_USER_TOKEN) return process.env.METRICOOL_USER_TOKEN.trim();
  try { const m = /METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(fs.readFileSync('/tmp/metricool.env', 'utf8')); if (m) return m[1]; } catch {}
  return '';
}
const TOKEN = tokenLesen();
const USER = process.env.METRICOOL_USER_ID || '4801419';
const BLOG = process.env.METRICOOL_BLOG_ID || '6227837';   // 23.09.: simpleProfiles liefert Marke 6227837 (TikTok luxestyle.ch); 6394001 war eine unbelegte Altnotiz
const TZ = process.env.MC_TZ || 'Europe/Zurich';
const VORLAUF = parseInt(process.env.VORLAUF_MIN || '10', 10);
const BASE = 'https://app.metricool.com/api';
if (!TOKEN && !DRY) { console.log('Kein METRICOOL_USER_TOKEN (Env oder /tmp/metricool.env) → No-op.'); process.exit(0); }

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
const writeLedger = () => fs.writeFileSync(CSV, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');
const get = (r, k) => (r[idx[k]] || '').trim();

// 23.09.2026 PRUEFEN=1: Nachmessen statt glauben. «posted-tiktok» hiess bisher nur «bei Metricool GEPLANT»
// (der erste Post 380476730 wurde erst per Hand im Planer nachgelesen). Dieser Modus liest den Planer fuer
// alle Zeilen mit post_url `metricool:<id>` ohne TikTok-Adresse: PUBLISHED → `metricool:<id> tiktok:<url>`;
// ERROR/FAILED → status `tiktok-fehler` + Grund in post_url (Ampel meldet es; kein stiller Fehlschlag).
// Zeilen, die aelter als 2 h geplant und noch nicht veroeffentlicht sind, werden als «offen» gemeldet.
if (process.env.PRUEFEN === '1') {
  if (!TOKEN) { console.log('PRUEFEN: kein Token → No-op.'); process.exit(0); }
  const offen = rows.slice(1).filter(r => get(r, 'status') === 'posted-tiktok' && /^metricool:\d+$/.test(get(r, 'post_url')));
  if (!offen.length) { console.log('PRUEFEN: keine ungeprueften TikTok-Posts.'); process.exit(0); }
  const tag = d => d.toISOString().slice(0, 10);
  const von = new Date(Date.now() - 4 * 86400000), bis = new Date(Date.now() + 2 * 86400000);
  const r = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}&start=${tag(von)}T00:00:00&end=${tag(bis)}T23:59:59&timezone=${encodeURIComponent(TZ)}`, { headers: { 'X-Mc-Auth': TOKEN } });
  if (!r.ok) { console.error(`PRUEFEN: Planer antwortet ${r.status}`); process.exit(1); }
  const j = await r.json();
  const posts = Array.isArray(j) ? j : (j.data || j.posts || []);
  const byId = new Map(posts.map(p => [String(p.id), p]));
  let ok = 0, fehler = 0, wartet = 0;
  for (const row of offen) {
    const mid = get(row, 'post_url').split(':')[1];
    const p = byId.get(mid);
    if (!p) { console.log(`   ${get(row, 'id')}: Metricool-Post ${mid} nicht im Planer-Fenster → offen`); wartet++; continue; }
    const prov = (p.providers || []).find(x => x.network === 'tiktok') || {};
    const st = String(prov.status || p.status || '').toUpperCase();
    if (st === 'PUBLISHED' && prov.publicUrl) { row[idx.post_url] = `metricool:${mid} tiktok:${prov.publicUrl}`; ok++; console.log(`   ✅ ${get(row, 'id')} veroeffentlicht: ${prov.publicUrl}`); }
    else if (/ERROR|FAIL|REJECT|CANCEL/.test(st)) { row[idx.status] = 'tiktok-fehler'; row[idx.post_url] = `metricool-fehler:${mid} ${st} ${String(prov.detailedStatus || prov.error || '').slice(0, 120)}`; fehler++; console.log(`   ⚠️ ${get(row, 'id')} FEHLER: ${st} ${prov.detailedStatus || ''}`); }
    else { const alter = (Date.now() - Date.parse(get(row, 'posted_at') || 0)) / 3600000; wartet++; console.log(`   ${get(row, 'id')}: ${st || 'ohne Status'} (${alter.toFixed(1)} h seit Planung)${alter > 2 ? ' ⚠️ ueberfaellig' : ''}`); }
  }
  if (ok || fehler) writeLedger();
  console.log(`PRUEFEN: ${ok} veroeffentlicht, ${fehler} Fehler, ${wartet} offen`);
  process.exit(fehler ? 2 : 0);
}

// Kandidat: ready, Video noch nirgends gepostet, NICHT stumm (TikTok ohne Ton wirkt tot — Plan 26.08.:
// stumme Marken-Videos bekommen den Trend-Sound in der TikTok-App, nicht ueber Metricool). Produkt-Reels
// (cjreel-*, mit Musik aus der ffmpeg-Pipeline) zuerst, Marken-Videos danach.
const passt = r => get(r, 'status') === 'ready' && get(r, 'video_url') && !postSeen(get(r, 'video_url')) && !/stumm/i.test(get(r, 'video_url'));
const _alle = rows.slice(1).filter(passt);
const _reihe = [..._alle.filter(r => /raw\.githubusercontent/.test(get(r, 'video_url'))), ..._alle.filter(r => !/raw\.githubusercontent/.test(get(r, 'video_url')) && /^cjreel-/.test(get(r, 'id'))), ..._alle.filter(r => !/raw\.githubusercontent/.test(get(r, 'video_url')) && !/^cjreel-/.test(get(r, 'id')))];
const cand = ersterErreichbare(_reihe, r => get(r, 'video_url'), (r, st) => { r[idx.status] = st; writeLedger(); });
if (!cand) { console.log('Nichts faellig: kein ready-Reel, dessen Video noch nirgends gepostet wurde.'); process.exit(0); }

// Produkt noch kaufbar? (gleiche Regel wie meta_reel_post.mjs)
async function produktAktiv(postId) {
  // 23.09.2026: v2-Reels tragen die CJ-pid (18–19-stellig oder UUID), v1 die Shopify-ID (13–14-stellig) — siehe meta_reel_post.
  const m = /^cjreel-([0-9A-Za-z-]{6,})$/.exec(postId || '');
  const istShopifyId = /^\d{12,15}$/.test(m ? m[1] : '');
  if (!m) return { ok: true, grund: 'keine Produkt-ID im Reel-Namen' };
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const tok = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
  if (!tok) return { ok: false, grund: 'kein Shop-Token' };
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, { method: 'POST',
        headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: istShopifyId
          ? `{ product(id:"gid://shopify/Product/${m[1]}"){ status onlineStoreUrl } }`
          : `{ products(first:1, query:"sku:CJ-${m[1]}"){ nodes{ status onlineStoreUrl } } }` }) });
      const d = await r.json();
      const p = istShopifyId ? (d && d.data && d.data.product) : ((d && d.data && d.data.products && d.data.products.nodes && d.data.products.nodes[0]) || (d && d.data ? null : undefined));
      if (p === null) return { ok: false, grund: 'Produkt existiert nicht mehr' };
      if (p) return { ok: p.status === 'ACTIVE' && !!p.onlineStoreUrl, grund: `status ${p.status}, onlineStoreUrl ${p.onlineStoreUrl ? 'ja' : 'nein'}` };
    } catch {}
    await new Promise(r => setTimeout(r, 2000 * (a + 1)));
  }
  return { ok: false, grund: 'Shopify nicht erreichbar' };
}
const pa = await produktAktiv(get(cand, 'id'));
if (!pa.ok) {
  console.error(`⛔ Kein Post — Produkt nicht kaufbar/pruefbar (${pa.grund}): ${get(cand, 'id')}`);
  if (!DRY && /nicht mehr|status DRAFT|status ARCHIVED|onlineStoreUrl nein/.test(pa.grund)) { cand[idx.status] = 'produkt-nicht-aktiv'; writeLedger(); }
  process.exit(0);
}
const id = get(cand, 'id'), url = get(cand, 'video_url'), caption = get(cand, 'caption'), tags = get(cand, 'hashtags');
const text = `${caption}\n\n${(tags || '').split(/[,\s]+/).filter(Boolean).slice(0, 8).join(' ')}`.slice(0, 2100);
// Veroeffentlichungszeit in TZ, Format YYYY-MM-DDTHH:mm:ss
const wann = new Date(Date.now() + VORLAUF * 60000);
const teile = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(wann).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
const dateTime = `${teile.year}-${teile.month}-${teile.day}T${teile.hour === '24' ? '00' : teile.hour}:${teile.minute}:${teile.second}`;
console.log(`TikTok via Metricool: ${id}\n  Produkt: ${pa.grund}\n  Video: ${url.slice(0, 90)}\n  Zeit: ${dateTime} ${TZ}\n  Text: ${text.slice(0, 100)}…`);
if (DRY) { console.log('[DRY] wuerde jetzt normalisieren + auf TikTok planen.'); process.exit(0); }

const release = postLock(20);
cand[idx.status] = 'posting'; cand[idx.posted_at] = new Date().toISOString(); writeLedger();   // Claim VOR dem Post
try {
  const n = await fetch(`${BASE}/actions/normalize/image/url?url=${encodeURIComponent(url)}&userId=${USER}&blogId=${BLOG}`, { headers: { 'X-Mc-Auth': TOKEN } });
  const nt = await n.text();
  if (!n.ok) throw new Error(`normalize ${n.status}: ${nt.slice(0, 200)}`);
  let norm = ''; try { const j = JSON.parse(nt); norm = j.data?.url || j.url || (typeof j.data === 'string' ? j.data : '') || (typeof j === 'string' ? j : ''); } catch { norm = nt.trim().replace(/^"|"$/g, ''); }
  if (!norm) throw new Error('normalize: keine URL in der Antwort: ' + nt.slice(0, 120));
  const body = { publicationDate: { dateTime, timezone: TZ }, text, providers: [{ network: 'tiktok' }], media: [norm],
                 autoPublish: true, draft: false, shortener: false, tiktokData: { autoPublish: true } };
  const r = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}`, { method: 'POST',
    headers: { 'X-Mc-Auth': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const rt = await r.text();
  if (!r.ok) throw new Error(`schedule ${r.status}: ${rt.slice(0, 300)}`);
  let pid = ''; try { const j = JSON.parse(rt); pid = String(j.data?.id || j.id || ''); } catch {}
  postMark(url);                                                   // Ledger SOFORT (plattformuebergreifend)
  cand[idx.status] = 'posted-tiktok'; cand[idx.posted_at] = new Date().toISOString(); cand[idx.post_url] = pid ? `metricool:${pid}` : 'metricool'; writeLedger();
  console.log(`✅ auf TikTok geplant (${dateTime} ${TZ}), Metricool-Post ${pid || '?'} · Ledger aktualisiert → ${id} posted-tiktok`);
} catch (e) {
  cand[idx.status] = 'ready'; cand[idx.posted_at] = ''; writeLedger();   // Claim zurueck: nichts ist raus
  console.error('✗ Metricool-Post fehlgeschlagen:', String(e.message || e));
  process.exit(1);
} finally { release(); }
