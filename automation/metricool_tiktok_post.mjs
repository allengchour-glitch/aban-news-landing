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
 *      VORLAUF_MIN (Default 10: Veroeffentlichung in N Minuten) · DRY=1 (zeigt den Body, plant und schreibt nichts)
 *      Direktlink (23.09., standardmaessig AUS, siehe dropship/DIREKTLINK.md): DIREKTLINK_TEXT=1 · DIREKTLINK_STICKER=1 ·
 *      DIREKTLINK=1 (beides) · MC_SMARTLINK_ID=<id>
 */
import { hashtagSet } from './lib/hashtags.mjs';
import { fbText, mitFolgen } from './lib/fb_text.mjs';   // 07.10.: FB-eigener Text (klickbarer Link + Folge-Zeile)
import fs from 'node:fs';
import { lock as postLock, seen as postSeen, mark as postMark, preisVeraltet, nachVorrang, montageErst, montagePruefen, montageQuelle, juryPruefen, modelSperre } from './post_guard.mjs';
// 22.09.: Adresse vor dem Post pruefen — 14 von 22 «ready»-Reels waren 404 (CDN-Dateien weg). 4xx → archived-deadurl.
import { execFileSync as _exf, spawnSync } from 'node:child_process';
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
// 23.09.2026 «metricool maximal nutzen»: derselbe Poster bedient jetzt auch YouTube Shorts (NETZ=youtube).
// Metricool hat sechs Kanaele verbunden (FB, IG, TikTok, Pinterest, YouTube, Threads); YouTube lag brach.
// Threads bleibt aus (Hausregel 07.07.). Alle Wachen (Lock, Ledger, Produkt aktiv, Adresse) gelten je Netz.
const NETZ = (process.env.NETZ || 'tiktok').toLowerCase();
// 27.09.2026 (Betreiber «metricool push über sozial»): NETZ=instagram plant das Reel auf Instagram UND Facebook ueber
// Metricool — der Weg, wenn der Meta-Seiten-Token fehlt (frischer Container). Ein Video, zwei Kanaele desselben Konzerns,
// wie der Graph-Poster (IG + FB-Zwilling). Threads bleibt draussen (Hausregel 07.07.).
if (!['tiktok', 'youtube', 'instagram'].includes(NETZ)) { console.error(`NETZ=${NETZ} nicht unterstuetzt (tiktok|youtube|instagram)`); process.exit(1); }
const POSTED = `posted-${NETZ}`, FEHLER = `${NETZ}-fehler`;
// Beste Stunde aus Metricools eigener Auswertung (/v2/scheduler/besttimes/{netz}) statt «jetzt + 10 Min»:
// innerhalb der naechsten FENSTER_H Stunden die Stunde mit dem hoechsten Wert. Scheitert die Abfrage → jetzt + VORLAUF.
const FENSTER_H = parseInt(process.env.FENSTER_H || '6', 10);
async function besteZeit() {
  const jetzt = Date.now() + VORLAUF * 60000;
  try {
    const tag = d => d.toISOString().slice(0, 19);
    const r = await fetch(`${BASE}/v2/scheduler/besttimes/${NETZ}?userId=${USER}&blogId=${BLOG}&start=${tag(new Date(Date.now() - 28 * 86400000))}&end=${tag(new Date())}&timezone=${encodeURIComponent(TZ)}`, { headers: { 'X-Mc-Auth': TOKEN } });
    const j = await r.json();
    const wert = {};   // "wochentag-stunde" → Wert (Metricool: dayOfWeek 1=Mo … 7=So)
    for (const d of j.data || []) for (const h of d.bestTimesByHour || []) wert[`${d.dayOfWeek}-${h.hourOfDay}`] = h.value;
    let best = null;
    for (let k = 0; k <= FENSTER_H; k++) {
      const t = new Date(jetzt + k * 3600000);
      const f = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(t).map(p => [p.type, p.value]));
      const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[f.weekday], hh = parseInt(f.hour, 10) % 24;
      const v = wert[`${wd}-${hh}`] ?? -1;
      if (!best || v > best.v) best = { t: k === 0 ? t : new Date(Math.floor(t.getTime() / 3600000) * 3600000 + 5 * 60000), v, wd, hh };
    }
    if (best && best.v > 0) { console.log(`   Bestzeit ${NETZ}: Tag ${best.wd} ${best.hh}:05 (Wert ${best.v}, Fenster ${FENSTER_H} h)`); return best.t < new Date(jetzt) ? new Date(jetzt) : best.t; }
  } catch (e) { console.log('   Bestzeit nicht lesbar → sofort:', String(e.message || e).slice(0, 80)); }
  return new Date(jetzt);
}
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
  const offen = rows.slice(1).filter(r => get(r, 'status') === POSTED && /^metricool:\d+$/.test(get(r, 'post_url')));
  if (!offen.length) { console.log(`PRUEFEN: keine ungeprueften ${NETZ}-Posts.`); process.exit(0); }
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
    const prov = (p.providers || []).find(x => x.network === NETZ) || {};
    const st = String(prov.status || p.status || '').toUpperCase();
    if (st === 'PUBLISHED' && prov.publicUrl) { row[idx.post_url] = `metricool:${mid} ${NETZ}:${prov.publicUrl}`; ok++; console.log(`   ✅ ${get(row, 'id')} veroeffentlicht: ${prov.publicUrl}`); }
    else if (/ERROR|FAIL|REJECT|CANCEL/.test(st)) { row[idx.status] = FEHLER; row[idx.post_url] = `metricool-fehler:${mid} ${st} ${String(prov.detailedStatus || prov.error || '').slice(0, 120)}`; fehler++; console.log(`   ⚠️ ${get(row, 'id')} FEHLER: ${st} ${prov.detailedStatus || ''}`); }
    else {
      // 24.09.: «ueberfaellig» misst ab dem GEPLANTEN Sendetermin (publicationDate aus dem Planer), nicht ab der Planung —
      // Bestzeit-Posts (z. B. 10:05 CH) standen sonst um 06:00 als «2.1 h ueberfaellig» im Log, obwohl nichts offen war.
      const pd = p.publicationDate && (p.publicationDate.dateTime || p.publicationDate);
      const termin = pd ? Date.parse(String(pd).replace(' ', 'T')) : Date.parse(get(row, 'posted_at') || 0);
      const seit = (Date.now() - termin) / 3600000; wartet++;
      const lage = seit < 0 ? `Termin in ${(-seit).toFixed(1)} h` : `${seit.toFixed(1)} h nach Termin${seit > 2 ? ' ⚠️ ueberfaellig' : ''}`;
      console.log(`   ${get(row, 'id')}: ${st || 'ohne Status'} (${lage})`);
    }
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
const _reihe = montageErst(nachVorrang([..._alle.filter(r => /raw\.githubusercontent/.test(get(r, 'video_url'))), ..._alle.filter(r => !/raw\.githubusercontent/.test(get(r, 'video_url')) && /^cjreel-/.test(get(r, 'id'))), ..._alle.filter(r => !/raw\.githubusercontent/.test(get(r, 'video_url')) && !/^cjreel-/.test(get(r, 'id')))], r => get(r, 'caption')), r => get(r, 'id'));   // 25.09. Saison-Vorrang (Herbst) zuerst
// 09.10.2026 (Betreiber «fb, zeige weniger asiaten»): Instagram+Facebook bekommen zuerst Reels, die das PRODUKT zeigen —
// Reels mit Gesicht in ≥ max_anteil der Bilder (reel_gesicht.py, gleich wessen Gesicht) werden hinten angestellt, nicht gesperrt.
// Nach Herkunft/Aussehen wird nicht sortiert. Regel data/kanal_formate.json → reel_gesicht.
{
  let _rg = {}; try { _rg = JSON.parse(fs.readFileSync(new URL('./data/kanal_formate.json', import.meta.url), 'utf8')).reel_gesicht || {}; } catch {}
  if ((_rg.netze || []).includes(NETZ)) {
    const _g = new Map(); try { for (const z of fs.readFileSync(new URL('../dropship/_reel_gesicht.tsv', import.meta.url), 'utf8').split('\n')) { const [id, a] = z.split('\t'); if (id && a) _g.set(id, +a); } } catch {}
    const _hinten = r => (_g.get(get(r, 'id')) ?? 0) >= (_rg.max_anteil ?? 0.3);
    const _vorn = _reihe.filter(r => !_hinten(r)), _rest = _reihe.filter(_hinten);
    if (_rest.length) console.log(`   Gesicht-Regel: ${_rest.length} Model-Reel(s) hinten angestellt (${NETZ})`);
    _reihe.splice(0, _reihe.length, ..._vorn, ..._rest);
  }
}
// DRY schreibt nichts (23.09.: vorher setzte schon der DRY-Lauf tote Adressen auf archived-deadurl).
const cand = ersterErreichbare(_reihe, r => get(r, 'video_url'), (r, st) => { if (DRY) return; r[idx.status] = st; writeLedger(); });
// 05.10.2026: Exit 3 statt 0 — «kein Kandidat» ist KEIN Post. Mit 0 setzte social_autopilot.sh die Kanal-Marke (TikTok 8 h,
// YouTube 12 h), als waere gepostet worden: 04.10. 20:13 YouTube «Nichts faellig» → naechster Versuch erst 08:13, obwohl um
// 20:17 neun Reels wieder ready waren (Ampel: YouTube 23,8 h ohne Post). Mit 3 bleibt die Marke alt, der 15-Minuten-Takt
// nimmt das naechste ready-Reel, sobald es da ist.
if (!cand) { console.log(`Nichts faellig: kein ready-Reel, dessen Video noch nirgends gepostet wurde (${NETZ}; Marke bleibt alt, Exit 3).`); process.exit(3); }

// 27.09.2026: Ohne Shop-Token (frischer Container, SHOPIFY_CLIENT_* nicht in der Umgebung) lag TikTok/YouTube 37 h still,
// obwohl der Metricool-Zugang da war. Ersatz: die OEFFENTLICHE Produktseite /products/<handle>.js — 200 + available =
// veroeffentlicht und kaufbar, Preise in Rappen. Handle aus der Caption (wie social_queue_saeubern). Strenger als der
// Token-Weg: ohne Handle oder bei Fehler KEIN Post (Exit 3), und ein 404 schreibt nichts ins Ledger — unsere IP kann
// eine veraltete Cache-Kopie sehen, ein Urteil «existiert nicht mehr» faellt deshalb nur mit Token.
function storefrontPruefung(caption) {
  // 27.09.2026 (von der Play-Store-App-Session gelernt): die Shopify STOREFRONT API liest ohne Token, frisch vom
  // Ursprung (myshopify-Domain, kein Bot-Cache unserer IP, keine 429 der Storefront-Seiten) — availableForSale + Preise.
  const m = /\/products\/([a-z0-9][a-z0-9-]*)/i.exec(caption || '');
  if (!m) return { ok: false, grund: 'kein Shop-Token und kein Produkt-Link in der Caption' };
  const q = JSON.stringify({ query: `{ product(handle:"${m[1]}"){ availableForSale onlineStoreUrl priceRange{ minVariantPrice{ amount } maxVariantPrice{ amount } } } }` });
  for (let a = 0; a < 3; a++) {
    const r = spawnSync('curl', ['-s', '--max-time', '25', '-H', 'Content-Type: application/json', '-d', q,
      'https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json'], { encoding: 'utf8' });
    try {
      const d = JSON.parse(r.stdout || '');
      if (d && d.data) {
        const p = d.data.product;
        if (!p) return { ok: false, grund: 'Storefront API: Produkt nicht veroeffentlicht (ohne Token, kein Urteil)' };
        return { ok: !!p.availableForSale, grund: `Storefront API ${p.availableForSale ? 'kaufbar' : 'nicht verfuegbar'} (ohne Token)`,
                 url: p.onlineStoreUrl || `https://luxestyle.ch/products/${m[1]}`,
                 min: parseFloat(p.priceRange.minVariantPrice.amount), max: parseFloat(p.priceRange.maxVariantPrice.amount) };
      }
    } catch {}
    spawnSync('sleep', [String(5 * (a + 1))]);
  }
  return { ok: false, grund: 'Storefront API nicht erreichbar (ohne Token, kein Urteil)' };
}

// Produkt noch kaufbar? (gleiche Regel wie meta_reel_post.mjs)
async function produktAktiv(postId) {
  // 23.09.2026: v2-Reels tragen die CJ-pid (18–19-stellig oder UUID), v1 die Shopify-ID (13–14-stellig) — siehe meta_reel_post.
  const m = /^cjreel-([0-9A-Za-z-]{6,})$/.exec(postId || '');
  const istShopifyId = /^\d{12,15}$/.test(m ? m[1] : '');
  if (!m) return { ok: true, grund: 'keine Produkt-ID im Reel-Namen' };
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const tok = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
  if (!tok) return storefrontPruefung(get(cand, 'caption'));
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, { method: 'POST',
        headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: istShopifyId
          ? `{ product(id:"gid://shopify/Product/${m[1]}"){ status onlineStoreUrl priceRangeV2{ minVariantPrice{ amount } maxVariantPrice{ amount } } } }`
          : `{ products(first:1, query:"sku:CJ-${m[1]}"){ nodes{ status onlineStoreUrl priceRangeV2{ minVariantPrice{ amount } maxVariantPrice{ amount } } } } }` }) });
      const d = await r.json();
      const p = istShopifyId ? (d && d.data && d.data.product) : ((d && d.data && d.data.products && d.data.products.nodes && d.data.products.nodes[0]) || (d && d.data ? null : undefined));
      if (p === null) return { ok: false, grund: 'Produkt existiert nicht mehr' };
      if (p) return { ok: p.status === 'ACTIVE' && !!p.onlineStoreUrl, grund: `status ${p.status}, onlineStoreUrl ${p.onlineStoreUrl ? 'ja' : 'nein'}`, url: p.onlineStoreUrl || '', min: parseFloat(p.priceRangeV2?.minVariantPrice?.amount || 'NaN'), max: parseFloat(p.priceRangeV2?.maxVariantPrice?.amount || 'NaN') };
    } catch {}
    await new Promise(r => setTimeout(r, 2000 * (a + 1)));
  }
  return { ok: false, grund: 'Shopify nicht erreichbar' };
}
const pa = await produktAktiv(get(cand, 'id'));
if (!pa.ok) {
  console.error(`⛔ Kein Post — Produkt nicht kaufbar/pruefbar (${pa.grund}): ${get(cand, 'id')}`);
  if (!DRY && /nicht mehr|status DRAFT|status ARCHIVED|onlineStoreUrl nein/.test(pa.grund)) { cand[idx.status] = 'produkt-nicht-aktiv'; writeLedger(); }
  // 26.09.2026: Exit 3 statt 0 — «übersprungen, kein Post» (dieselbe Regel wie meta_reel_post.mjs seit 23.09.). Mit 0 setzte
  // social_autopilot.sh die 12-h-Marke, als waere gepostet worden: TikTok + YouTube lagen 25.09. 15:10 und 26.09. 04:08 je
  // einen ganzen Termin still, obwohl 17 postbare Reels warteten.
  process.exit(3);
}
{ const pv = preisVeraltet(get(cand, 'caption'), pa.min, pa.max);   // 24.09.2026: eingebrannter Preis ≠ Live-Preis
  if (pv) { console.error(`⛔ Kein Post — Preis veraltet (${pv}): ${get(cand, 'id')}`); if (!DRY) { cand[idx.status] = 'preis-veraltet-skip'; writeLedger(); } process.exit(3); } }   // 3 = uebersprungen (s. oben)
// 27.09.2026 Betreiber «mache keine billige einfache post, jeder soll ein meisterwerk sein»: Meisterwerk-Tor an der
// fertigen Datei (Format, Dauer, Ton, Bewegung in der 1. Sekunde, Standbild-Anteil). Gemessen: 3 von 11 wartenden und
// 8 von 14 geposteten Reels hatten einen stehenden Einstieg — genau die Klasse, die TikTok (Ø 1,8 s von 11 s) verliert.
if (/^montage-/.test(get(cand, 'id') || '')) {   // 28.09.2026: Sammelvideo — alle 6 Bildpreise gegen den Shop
  const mp = montagePruefen(get(cand, 'video_url'));
  if (!mp.ok) { console.error(`⛔ Kein Post — Sammelvideo-Preise: ${mp.grund}`); if (!DRY) { cand[idx.status] = 'montage-preis-skip'; writeLedger(); } process.exit(3); }
  console.log(`  Sammelvideo: ${mp.grund}`);
}
{ const vu = get(cand, 'video_url'); const lm = /\/social\/reels\/([^/?#]+\.mp4)/.exec(vu);
  const quelle = montageQuelle(vu) || (lm && fs.existsSync(`social/reels/${lm[1]}`) ? `social/reels/${lm[1]}` : vu);
  const t = spawnSync('python3', ['automation/meisterwerk_tor.py', quelle], { encoding: 'utf8', timeout: 240000,
    env: { ...process.env, PREIS_SOLL: [...String(get(cand, 'caption') || '').matchAll(/CHF\s*(\d{1,4}[.,]\d{2})/g)].map(m => m[1]).join(',') } });   // 27.09.: Bildpreis = Caption-Preis
  if (t.status !== 0) {
    const zeile = (t.stdout || '').trim().split('\n').pop() || (t.stderr || '').slice(-120);
    console.error(`⛔ Kein Post — Meisterwerk-Tor: ${zeile.slice(0, 220)}`);
    if (!DRY && t.status === 4) { cand[idx.status] = 'meisterwerk-tor-skip'; writeLedger(); }
    process.exit(3);   // 3 = uebersprungen: naechster Durchlauf nimmt das naechste Reel
  }
  // 28.09.2026 Betreiber «mache jede post ein meisterwerk … jetzt hast du gemini» · «vision ai»: das Tor misst, die Jury SIEHT
  // (Fremdtext/Wasserzeichen, falsches Produkt, Hook ≠ Produkt, billige Wirkung). Kein Urteil (Exit 2) = kein Post, keine Marke.
  // 30.09.2026 Betreiber «immer sie markieren und auch andere orte»: Model-Material nur mit @tatjanalarsinamoira (post_guard.modelSperre)
  { const ms = modelSperre([quelle, get(cand, 'video_url')], get(cand, 'caption')); if (ms) { console.error('⛔ Kein Post —', ms); process.exit(3); } }
  const j = juryPruefen(quelle, get(cand, 'caption'), 'reel');
  if (j.status !== 0) {
    console.error(`⛔ Kein Post — Gemini-Jury: ${j.info}`);
    if (!DRY && j.status === 4) { cand[idx.status] = 'jury-skip'; writeLedger(); }
    process.exit(3);
  }
  console.log(`  Gemini-Jury: ${j.info}`); }
const id = get(cand, 'id'), url = get(cand, 'video_url'), tags = get(cand, 'hashtags');
// ── 23.09.2026 Paket «direktlink» — VORBEREITET, standardmaessig AUS. Ohne die Schalter bleibt der Body byte-gleich.
//  DIREKTLINK_TEXT=1: die Caption-Zeile «🔗 luxestyle.ch/products/… (Link in Bio)» ist auf TikTok FALSCH (Profil ohne
//    bioLink, gemessen 23.09.; Kanarienvogel: nike/gymshark tragen bioLink im selben HTML) und auf YouTube ebenso →
//    TikTok: Adresse ohne «(Link in Bio)»; YouTube: volle https-Adresse (in Shorts-Beschreibungen nicht klickbar, lesbar).
//  DIREKTLINK_STICKER=1: tiktokData.articleLink {url,title≤35} — laut Metricool-OpenAPI (ScheduledPostTikTokArticleLink)
//    «an external URL shown as a link sticker on the video», also fuer Videos vorgesehen. Ob TikTok ihn fuer
//    @luxestyle.ch (Privatkonto: commerceUser false, 553 Follower, gemessen 23.09.) anzeigt, ist UNBELEGT →
//    erst EIN begleiteter Post, danach PRUEFEN=1 (Status/detailedStatus) und Sichtprobe in der App.
//  DIREKTLINK=1 schaltet beide ein. MC_SMARTLINK_ID=<id> haengt zusaetzlich smartLinkData {targetUrl, ids} an — nur
//    sinnvoll, wenn die SmartLink-Seite aus linkinbio_sync.mjs existiert (gemessen 23.09.: 0 SmartLinks); Metricool
//    verknuepft SmartLinks im Planer mit Instagram-Posts, die Wirkung fuer TikTok/YouTube ist unbelegt.
const DL_TEXT = process.env.DIREKTLINK === '1' || process.env.DIREKTLINK_TEXT === '1';
const DL_STICKER = process.env.DIREKTLINK === '1' || process.env.DIREKTLINK_STICKER === '1';
const SMARTLINK_ID = (process.env.MC_SMARTLINK_ID || '').trim();
const produktUrl = (pa.url || '').replace(/^http:\/\//, 'https://');
const linkUtm = produktUrl ? `${produktUrl}?utm_source=${NETZ}&utm_medium=social&utm_campaign=${NETZ === 'youtube' ? 'short' : 'reel'}&utm_content=${encodeURIComponent(id)}` : '';
function captionMitDirektlink(c) {
  // 28.09.2026: Sammelvideos haben keine Produkt-URL — «(Link in Bio)» ist auf TikTok/YouTube trotzdem falsch (kein Bio-Link).
  if (!produktUrl) return c.replace(/\s*\(Link in Bio\)/g, '').replace(/🔗 luxestyle\.ch\//g, NETZ === 'youtube' ? '🔗 https://luxestyle.ch/' : '🔗 luxestyle.ch/');
  const zeile = NETZ === 'youtube' ? `🔗 ${produktUrl}` : `🔗 ${produktUrl.replace(/^https:\/\//, '')}`;
  const alt = /^.*luxestyle\.ch\/products\/[\w%-]+.*$/m;
  return alt.test(c) ? c.replace(alt, zeile) : `${c}\n${zeile}`;
}
const caption = DL_TEXT ? captionMitDirektlink(get(cand, 'caption')) : get(cand, 'caption');
// 04.10.2026 (Betreiber «hastag auch setzten für mehr follower»): Tags beim Posten neu wählen — gemessene Gewichte aus
// social/_lernen.json, Saison nach heutigem Datum, Plattform-Regel (IG/TikTok 5, YouTube #shorts vorne). Ohne Produktnamen
// in «…» bleibt die Queue-Liste (höchstens 5).
const produktName = (/«([^»]{4,})»/.exec(caption) || [])[1] || '';
const tagListe = produktName ? hashtagSet(produktName, { plattform: NETZ })
  : (NETZ === 'youtube' ? ['#shorts'] : []).concat((tags || '').split(/[,\s]+/).filter(t => t && t !== '#shorts')).slice(0, 5);
const text = `${caption}\n\n${tagListe.join(' ')}`.slice(0, 2100);
// Veroeffentlichungszeit in TZ, Format YYYY-MM-DDTHH:mm:ss
const wann = await besteZeit();
const teile = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(wann).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
const dateTime = `${teile.year}-${teile.month}-${teile.day}T${teile.hour === '24' ? '00' : teile.hour}:${teile.minute}:${teile.second}`;
console.log(`${NETZ} via Metricool: ${id}\n  Produkt: ${pa.grund}\n  Video: ${url.slice(0, 90)}\n  Zeit: ${dateTime} ${TZ}\n  Text: ${text.slice(0, 100)}…`);
// YouTube-Titel: der Produktname aus «…» der Caption, sonst die erste Zeile; max. 100 Zeichen inkl. #Shorts.
const ytTitel = (() => { const m = /«([^»]{4,})»/.exec(caption); const t = (m ? m[1] : caption.split('\n').find(z => z.trim().length > 8) || caption).replace(/[👀✨🔥]/gu, '').trim(); return (t.slice(0, 88) + ' #Shorts').trim(); })();
const ytTags = [...new Set([...tagListe, ...(tags || '').split(/[,\s]+/)].filter(Boolean).map(t => t.replace(/^#/, '')))].slice(0, 12);
if (NETZ === 'youtube') console.log(`  YouTube-Titel: ${ytTitel}`);
// 07.10.2026 (Betreiber «fb zu wenig follower»): IG und FB waren EIN Metricool-Post mit EINEM Text — Facebook bekam
// «(Link in Bio)» und keine Folge-Aufforderung (7 Follower, 659 Reel-Aufrufe → 0 Follows). Jetzt zwei Posts: IG mit IG-Text,
// FB-Reel mit klickbarem Produktlink + Folge-Zeile (lib/fb_text.mjs). Metricool kennt keinen Text je Netz.
const fbReelText = mitFolgen(fbText(text, produktUrl, 'reel'));
function bauBody(media, nur) {
  const netze = nur ? [{ network: nur }] : (NETZ === 'instagram' ? [{ network: 'instagram' }, { network: 'facebook' }] : [{ network: NETZ }]);
  const body = { publicationDate: { dateTime, timezone: TZ }, text: nur === 'facebook' ? fbReelText : text, providers: netze, media: [media],
                 autoPublish: true, draft: false, shortener: false };
  // TikTok verlangt die Kennzeichnung von Werbung fuer die eigene Marke (Content-Disclosure «Your brand»).
  if (NETZ === 'tiktok') body.tiktokData = { autoPublish: true, commercialContentOwnBrand: true, commercialContentThirdParty: false };
  if (NETZ === 'tiktok' && DL_STICKER && linkUtm) body.tiktokData.articleLink = { url: linkUtm, title: 'Zum Produkt' };
  if (NETZ === 'youtube') body.youtubeData = { title: ytTitel, type: 'short', privacy: 'public', category: 'HOWTO_STYLE',
                                               madeForKids: false, notifySubscribers: true, isAiGeneratedContent: false, tags: ytTags };
  if (NETZ === 'instagram' && nur !== 'facebook') body.instagramData = { autoPublish: true, type: 'REEL', showReelOnFeed: true, isAiGenerated: false };
  if (NETZ === 'instagram' && nur !== 'instagram') body.facebookData = { type: 'REEL' };
  if (SMARTLINK_ID && linkUtm) body.smartLinkData = { targetUrl: linkUtm, ids: [Number(SMARTLINK_ID)] };
  return body;
}
if (DRY) {
  console.log(`  Direktlink: Text ${DL_TEXT ? 'AN' : 'aus'} · Sticker ${DL_STICKER ? 'AN' : 'aus'} · SmartLink ${SMARTLINK_ID || 'aus'} · Produkt-URL ${linkUtm || '(keine: Reel ohne Produkt-ID)'}`);
  if (NETZ === 'instagram') {
    console.log(`[DRY] Instagram-Body:\n${JSON.stringify(bauBody('(normalisiert)', 'instagram'), null, 1)}`);
    console.log(`[DRY] Facebook-Body:\n${JSON.stringify(bauBody('(normalisiert)', 'facebook'), null, 1)}`);
  } else console.log(`[DRY] Body (media wird im echten Lauf ueber Metricool normalisiert, hier Platzhalter; NICHTS geplant):\n${JSON.stringify(bauBody(`(normalisiert aus ${url})`), null, 1)}`);
  process.exit(0);
}

const release = postLock(20);
cand[idx.status] = 'posting'; cand[idx.posted_at] = new Date().toISOString(); writeLedger();   // Claim VOR dem Post
try {
  const n = await fetch(`${BASE}/actions/normalize/image/url?url=${encodeURIComponent(url)}&userId=${USER}&blogId=${BLOG}`, { headers: { 'X-Mc-Auth': TOKEN } });
  const nt = await n.text();
  if (!n.ok) throw new Error(`normalize ${n.status}: ${nt.slice(0, 200)}`);
  let norm = ''; try { const j = JSON.parse(nt); norm = j.data?.url || j.url || (typeof j.data === 'string' ? j.data : '') || (typeof j === 'string' ? j : ''); } catch { norm = nt.trim().replace(/^"|"$/g, ''); }
  if (!norm) throw new Error('normalize: keine URL in der Antwort: ' + nt.slice(0, 120));
  const planen = async body => {
    const r = await fetch(`${BASE}/v2/scheduler/posts?userId=${USER}&blogId=${BLOG}`, { method: 'POST',
      headers: { 'X-Mc-Auth': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const rt = await r.text();
    if (!r.ok) throw new Error(`schedule ${r.status}: ${rt.slice(0, 300)}`);
    try { const j = JSON.parse(rt); return String(j.data?.id || j.id || ''); } catch { return ''; }
  };
  let pid = '';
  if (NETZ === 'instagram') {
    pid = await planen(bauBody(norm, 'instagram'));                 // IG zuerst: scheitert es, ist nichts raus (Claim zurück)
    try { const fid = await planen(bauBody(norm, 'facebook')); if (fid) pid += ` fb:${fid}`; console.log(`   facebook: eigener Text (Link klickbar + Folge-Zeile) geplant ${fid || '?'}`); }
    catch (fe) { console.error(`   ⚠️ Facebook-Reel nicht geplant (IG ist raus): ${String(fe.message || fe).slice(0, 200)}`); }
  } else {
    pid = await planen(bauBody(norm));
  }
  postMark(url);                                                   // Ledger SOFORT (plattformuebergreifend)
  cand[idx.status] = POSTED; cand[idx.posted_at] = new Date().toISOString(); cand[idx.post_url] = pid ? `metricool:${pid}` : 'metricool'; writeLedger();
  console.log(`✅ auf ${NETZ} geplant (${dateTime} ${TZ}), Metricool-Post ${pid || '?'} · Ledger aktualisiert → ${id} ${POSTED}`);
} catch (e) {
  cand[idx.status] = 'ready'; cand[idx.posted_at] = ''; writeLedger();   // Claim zurueck: nichts ist raus
  console.error('✗ Metricool-Post fehlgeschlagen:', String(e.message || e));
  process.exit(1);
} finally { release(); }
