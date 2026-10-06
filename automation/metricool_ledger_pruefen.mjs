#!/usr/bin/env node
// metricool_ledger_pruefen.mjs — Nachmessen der IG/FB-Posts, die seit dem Meta-Ablauf (05.10.2026) über Metricool laufen.
//
// ANLASS (06.10.2026, Routine «Meta aus → prüfen»): Bildpost «Warme Touchscreen-Handschuhe» stand im Ledger
// social/posts_image.csv als `posted · metricool:388937521`, im Planer aber Instagram = ERROR («The media could not be
// fetched from this URI») — Facebook mit demselben Bild war PUBLISHED. Das Bild selbst war in Ordnung (JPEG 800×800,
// HTTP 200): ein Abruffehler auf Meta-Seite. «posted» hiess nur «bei Metricool GEPLANT». Für TikTok/YouTube gibt es
// dieses Nachmessen seit 23.09. (metricool_tiktok_post.mjs PRUEFEN=1), für die IG-Bild-/Karussell-Ledger fehlte es.
//
// Je Ledger-Zeile mit status=posted und post_url `metricool:<id>` (ohne Ergebnis-Vermerk), geplant in den letzten 4 Tagen:
//   PUBLISHED      → post_url «metricool:<id> instagram:<url>»
//   ERROR (1. Mal) → EIN neuer Versuch nur auf Instagram (gleiche Medien + Text aus dem Planer, URLs neu normalisiert),
//                    post_url «metricool:<neu> retry-von:<alt>» — Facebook wird NICHT wiederholt (Doppelpost-Verbot)
//   ERROR (2. Mal) → status «ig-fehler», post_url «metricool-fehler:<id> <Grund>» (Ampel/Log, kein stiller Fehlschlag)
//   sonst          → offen (Termin noch nicht erreicht oder Planer ohne Status)
//
// ENV: CSV=social/posts_image.csv (oder social/ig_karussell.csv) · DRY=1 (nichts schreiben, nichts neu planen)
import fs from 'node:fs';

const CSV = process.env.CSV || 'social/posts_image.csv';
const DRY = process.env.DRY === '1';
const USER = process.env.METRICOOL_USER_ID || '4801419';
const BLOG = process.env.METRICOOL_BLOG_ID || '6227837';
const TZ = 'Europe/Zurich';
const BASE = 'https://app.metricool.com/api';
function tokenLesen() {
  if (process.env.METRICOOL_USER_TOKEN) return process.env.METRICOOL_USER_TOKEN;
  try { const m = /METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(fs.readFileSync('/tmp/metricool.env', 'utf8')); if (m) return m[1]; } catch {}
  return '';
}
const TOKEN = tokenLesen();
if (!TOKEN) { console.log('METRICOOL-PRUEFEN: kein Token → No-op.'); process.exit(0); }

// RFC-4180-Leser (Captions enthalten Zeilenumbrüche und Kommas in Anführungszeichen)
function parse(txt) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const esc = x => /[",\n]/.test(x ?? '') ? '"' + String(x).replace(/"/g, '""') + '"' : (x ?? '');
const rows = parse(fs.readFileSync(CSV, 'utf8'));
const kopf = rows[0]; const idx = Object.fromEntries(kopf.map((k, i) => [k, i]));
for (const k of ['status', 'post_url']) if (!(k in idx)) { console.error(`METRICOOL-PRUEFEN: ${CSV} ohne Spalte ${k}`); process.exit(1); }
const get = (r, k) => (r[idx[k]] || '').trim();

const offen = rows.slice(1).filter(r => /^posted/.test(get(r, 'status')) && /^metricool:\d+(?: metricool:\d+)?(?: retry-von:\d+)?$/.test(get(r, 'post_url')));
if (!offen.length) { console.log(`METRICOOL-PRUEFEN ${CSV}: keine ungeprueften Posts.`); process.exit(0); }

const tag = d => d.toISOString().slice(0, 10);
const r = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}&start=${tag(new Date(Date.now() - 4 * 86400000))}T00:00:00&end=${tag(new Date(Date.now() + 86400000))}T23:59:59&timezone=${encodeURIComponent(TZ)}`, { headers: { 'X-Mc-Auth': TOKEN } });
if (!r.ok) { console.error(`METRICOOL-PRUEFEN: Planer antwortet ${r.status}`); process.exit(1); }
const j = await r.json();
const byId = new Map((Array.isArray(j) ? j : (j.data || [])).map(p => [String(p.id), p]));

async function normalisiere(url) {
  const n = await fetch(`${BASE}/actions/normalize/image/url?url=${encodeURIComponent(url)}&userId=${USER}&blogId=${BLOG}`, { headers: { 'X-Mc-Auth': TOKEN } });
  const t = await n.text(); let u = '';
  try { const x = JSON.parse(t); u = x.data?.url || x.url || (typeof x.data === 'string' ? x.data : '') || (typeof x === 'string' ? x : ''); } catch { u = t.trim().replace(/^"|"$/g, ''); }
  return n.ok && u ? u : '';
}
// Poster-Regel: vor jedem Post (auch einem neuen Versuch) muss das Produkt ACTIVE und im Onlineshop sein.
async function produktAktiv(handle) {
  let tok = ''; try { tok = fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim(); } catch {}
  if (!tok || !handle) return false;
  const x = await fetch('https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json', { method: 'POST',
    headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'query($h:String!){productByIdentifier(identifier:{handle:$h}){status onlineStoreUrl}}', variables: { h: handle } }) });
  const p = ((await x.json()).data || {}).productByIdentifier;
  return !!(p && p.status === 'ACTIVE' && p.onlineStoreUrl);
}
async function neuPlanen(p) {
  const media = [];
  for (const m of p.media || []) { const u = await normalisiere(m); if (!u) return ''; media.push(u); }
  const typ = (p.instagramData && p.instagramData.type) || 'POST';
  const body = { publicationDate: { dateTime: new Date(Date.now() + 5 * 60e3).toISOString().slice(0, 19), timezone: 'UTC' },
                 text: p.text || '', providers: [{ network: 'instagram' }], media, autoPublish: true, draft: false, shortener: false,
                 instagramData: { autoPublish: true, type: typ } };
  const x = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}`, { method: 'POST', headers: { 'X-Mc-Auth': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await x.text(); if (!x.ok) { console.error('   Neuplanung:', x.status, t.slice(0, 160)); return ''; }
  try { const y = JSON.parse(t); return String(y.data?.id || y.id || ''); } catch { return ''; }
}

let ok = 0, retry = 0, fehler = 0, wartet = 0;
for (const row of offen) {
  const pu = get(row, 'post_url'); const mid = pu.split(' ')[0].split(':')[1]; const war = /retry-von:/.test(pu);
  const p = byId.get(mid);
  const name = get(row, 'id') || get(row, 'slug');
  if (!p) { wartet++; console.log(`   ${name}: ${mid} nicht im Planer-Fenster → offen`); continue; }
  const prov = (p.providers || []).find(x => x.network === 'instagram') || (p.providers || [])[0] || {};
  const st = String(prov.status || '').toUpperCase();
  if (st === 'PUBLISHED' && prov.publicUrl) { row[idx.post_url] = `${pu} ${prov.network}:${prov.publicUrl}`; ok++; console.log(`   ✅ ${name}: ${prov.publicUrl}`); continue; }
  if (/ERROR|FAIL|REJECT/.test(st)) {
    const grund = String(prov.detailedStatus || '').slice(0, 110);
    if (!war && prov.network === 'instagram') {
      const handle = 'produkte' in idx ? get(row, 'produkte').split(/\s+/)[0] : get(row, 'id');
      const aktiv = await produktAktiv(handle);
      const neu = !aktiv ? '' : (DRY ? 'DRY' : await neuPlanen(p));
      if (!aktiv) console.log(`   ${name}: Produkt ${handle} nicht (mehr) kaufbar → kein neuer Versuch`);
      if (neu) { row[idx.post_url] = `metricool:${neu} retry-von:${mid}`; retry++; console.log(`   🔁 ${name}: IG ${st} («${grund.slice(0, 60)}») → neu geplant ${neu}`); continue; }
    }
    row[idx.status] = 'ig-fehler'; row[idx.post_url] = `metricool-fehler:${mid} ${st} ${grund}`; fehler++;
    console.log(`   ⚠️ ${name}: ${st} ${grund}`); continue;
  }
  wartet++; console.log(`   ${name}: ${st || 'ohne Status'} → offen`);
}
if (!DRY && (ok || retry || fehler)) fs.writeFileSync(CSV, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');
console.log(`METRICOOL-PRUEFEN ${CSV}: ${ok} veroeffentlicht · ${retry} neu geplant · ${fehler} Fehler · ${wartet} offen${DRY ? ' · DRY' : ''}`);
process.exit(fehler ? 2 : 0);
