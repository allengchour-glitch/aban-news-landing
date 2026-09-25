#!/usr/bin/env node
/* meta_reel_post.mjs — postet das nächste fällige VIDEO aus automation/reels_seed.csv
 * als Instagram-REEL + Facebook-Seitenvideo (Meta Graph API). Threads: NIE (User 2026-07-07:
 * «threads nichts mehr posten erst wenn follower da sind»).
 *
 * QUALITÄTS-KADENZ (User: «poste weniger, aber besser»): max 1 Post pro Lauf und
 * MIN_GAP_H (Default 48h) Abstand zum letzten IG-Post aus dem Ledger → 3–4 Posts/Woche.
 * DOPPELPOST-SCHUTZ (GEHIRN 10): nur status=ready; nach Erfolg → status=posted-ig-fb.
 *
 * ENV: META_ACCESS_TOKEN (oder /tmp/meta_page_token) · IG_USER_ID (oder /tmp/meta_ig_id) ·
 *      FB_PAGE_ID (Default 1049840534888592) · [DRY=1] · [MIN_GAP_H=48]
 * EXIT: 0 = gepostet oder nichts faellig · 1 = Fehler · 3 = Kandidat uebersprungen/quittiert, kein Post (naechster Lauf bald)
 */
import fs from 'node:fs';
import { preisVeraltet, markierungFehlt, lock as postLock, seen as postSeen, mark as postMark, fbSeitenIdentitaet, familieKuerzlich, familieMerken, nachVorrang } from './post_guard.mjs';
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
const V = 'v21.0';
const DRY = process.env.DRY === '1';
const MIN_GAP_H = parseFloat(process.env.MIN_GAP_H || '48');
const TOK = (process.env.META_ACCESS_TOKEN || (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token', 'utf8') : '')).trim();
const IG = (process.env.IG_USER_ID || (fs.existsSync('/tmp/meta_ig_id') ? fs.readFileSync('/tmp/meta_ig_id', 'utf8') : '')).trim();
const FB = (process.env.FB_PAGE_ID || '1049840534888592').trim();
if (!TOK || !IG) { console.error('Kein Token/IG-ID (META_ACCESS_TOKEN + IG_USER_ID oder /tmp/meta_page_token + /tmp/meta_ig_id).'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 23.09.2026 (Audit-Befund 18): Facebook hat keine Bio, ein Link im FB-Text ist direkt klickbar. Das FB-Video bekommt
// statt «luxestyle.ch/products/… (Link in Bio)» die Produktseite (onlineStoreUrl) mit UTM; Instagram behaelt seine
// Caption. Gleiche Funktion wie in social-autopost-meta.mjs und ig_karussell_post.mjs.
const FB_UTM = 'utm_source=facebook&utm_medium=social&utm_campaign=autopilot';
function fbLink(shopUrl, inhalt) {
  const basis = /^https:\/\/(www\.)?luxestyle\.ch\//i.test(shopUrl || '') ? shopUrl : 'https://luxestyle.ch/';
  return `${basis}${basis.includes('?') ? '&' : '?'}${FB_UTM}${inhalt ? `&utm_content=${inhalt}` : ''}`;
}
function fbText(caption, shopUrl, inhalt) {
  const link = fbLink(shopUrl, inhalt);
  const BIO = /\s*[–—·|-]?\s*\(?\s*link\s+in\s+(?:der\s+)?bio\b(?:\s*\))?/gi;   // Leerzeichen danach bleiben (sonst klebt ein #Hashtag an der URL)
  const DOM = /(?<![@#\w.\/-])(?:https?:\/\/)?(?:www\.)?luxestyle\.ch(?:\/[^\s)]*)?/i;
  const zeilen = String(caption || '').split('\n');
  let i = zeilen.findIndex(z => /link\s+in\s+(?:der\s+)?bio/i.test(z));
  if (i < 0) i = zeilen.findIndex(z => DOM.test(z) && !/^\s*#/.test(z));
  if (i < 0) {                                  // keine Shop-Zeile: Link vor die Hashtags setzen
    const h = zeilen.findIndex(z => /^\s*#\S/.test(z));
    if (h < 0) zeilen.push(`👉 ${link}`); else zeilen.splice(h, 0, `👉 ${link}`, '');
    return zeilen.join('\n');
  }
  const z = zeilen[i].replace(BIO, '');
  zeilen[i] = (DOM.test(z) ? z.replace(DOM, link) : z.trim() ? `${z.trimEnd()} 👉 ${link}` : `👉 ${link}`).trimEnd();
  return zeilen.join('\n');
}

async function api(path, params, method = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: TOK });
  // Retry gegen transiente Netz-/DNS-Fehler (Container-Poll darf nicht crashen)
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://graph.facebook.com/${V}/${path}${method === 'GET' ? '?' + body : ''}`,
        method === 'GET' ? {} : { method, body });
      return await r.json();
    } catch (e) { if (a === 4) return { error: { message: 'net: ' + String(e).slice(0, 60) } }; await sleep(2500); }
  }
}

// CSV robust parsen (Anführungszeichen mit Kommas)
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const esc = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;

// ── GEMEINSAMER Lock (post_guard: /tmp/ig_post.lock) gegen parallele Läufe JEDES Posters.
//    ⚠️ FRÜHER eigener /tmp/meta_reel_post.lock → serialisierte NICHT gegen video-/social-/
//    story-autopost (die auf /tmp/ig_post.lock liegen). Zwei Poster konnten denselben Reel
//    (gleiches Video 'ready' in reels_seed.csv UND video_queue.csv) gleichzeitig hochladen →
//    Doppelpost auf IG. Jetzt teilen sich ALLE 5 Poster EINEN Lock → nie zwei gleichzeitig,
//    und der gemeinsame Ledger (_posted_media.txt) greift dadurch script-übergreifend.
if (!DRY) postLock();

const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
const head = rows[0];
const idx = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
const today = new Date().toISOString().slice(0, 10);
const writeLedger = () => fs.writeFileSync(CSV, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');

// Stale-Recovery: hängengebliebene 'posting'-Zeilen (>30min ohne Abschluss) NICHT neu posten —
// sie könnten live sein (Post-vor-Commit-Fenster). Auf 'posting-unklar' setzen für manuelle Prüfung.
for (const r of rows.slice(1)) {
  if ((r[idx.status] || '').trim() === 'posting') {
    const t = Date.parse(r[idx.posted_at] || '') || 0;
    if (Date.now() - t > 30 * 60000) { r[idx.status] = 'posting-unklar-pruefen'; }
  }
}
if (!DRY) writeLedger();

// Kadenz-Wache: letzter IG-Post aus dem Ledger
let lastPosted = 0;
for (const r of rows.slice(1)) {
  if ((r[idx.status] || '').startsWith('posted') && r[idx.posted_at]) {
    const t = Date.parse(r[idx.posted_at]); if (t > lastPosted) lastPosted = t;
  }
}
if (lastPosted && (Date.now() - lastPosted) < MIN_GAP_H * 3600000) {
  console.log(`Kadenz-Wache: letzter Post vor ${((Date.now() - lastPosted) / 3600000).toFixed(1)}h (<${MIN_GAP_H}h) → kein Post.`);
  process.exit(3);   // 23.09.: nicht gepostet → Autopilot setzt seine 8-h-Marke NICHT (sonst wurden aus 6 h fast 12 h)
}

// ⛔ INHALTS-SPERRE (GEHIRN 10, «darf kein Doppelpost mehr passieren»): jedes je gepostete Video
//    (Basename der URL, plattform-übergreifend) merken → nie zweimal posten, auch wenn es in einer
//    zweiten ready-Zeile steht oder der Status-Flow mal durcheinanderkam.
const vkey = u => (u || '').split('?')[0].split('/').pop().toLowerCase();
const postedVideos = new Set();
for (const r of rows.slice(1)) {
  const st = (r[idx.status] || '').trim();
  if (st.startsWith('posted') || st === 'posting') { const k = vkey(r[idx.video_url]); if (k) postedVideos.add(k); }
}
// Nächste fällige Zeile: ready + instagram + fällig + Video noch NIE gepostet
const _passt = r => (r[idx.status] || '').trim() === 'ready'
  && /instagram/i.test(r[idx.platforms] || '')
  && (r[idx.scheduled_date] || '9999') <= today
  && !postedVideos.has(vkey(r[idx.video_url]))
  && !postSeen(r[idx.video_url])
  && !familieKuerzlich(r[idx.caption]);   // 23.09. Neunte Schicht: Warengruppe nicht zweimal in 72 h (alle Kanaele)
// 22.09.: v2-Reels (neues Design, Ablage raw.githubusercontent) zuerst, dann die aelteren
const _alle = rows.slice(1).filter(_passt);
const _reihe = nachVorrang([..._alle.filter(r => /raw\.githubusercontent/.test(r[idx.video_url] || '')), ..._alle.filter(r => !/raw\.githubusercontent/.test(r[idx.video_url] || ''))], r => r[idx.caption]);   // 25.09. Saison-Vorrang (Herbst) vor v2/alt
const cand = ersterErreichbare(_reihe, r => r[idx.video_url] || '', (r, st) => { r[idx.status] = st; if (!DRY) writeLedger(); });   // DRY schreibt nichts
if (!cand) { console.log('Nichts fällig (kein ready+instagram+due, oder alle Videos schon gepostet).'); process.exit(0); }
// Harte Doppelpost-Sperre direkt vor dem Post (Gürtel + Hosenträger + gemeinsamer Ledger)
if (postedVideos.has(vkey(cand[idx.video_url])) || postSeen(cand[idx.video_url])) { console.error('⛔ Video bereits gepostet — Doppelpost verhindert.'); process.exit(0); }

// ⛔⛔ LIVE-IG-ABGLEICH (GEHIRN 10, «darf kein Doppelpost mehr passieren»): der einzige wasserdichte
//    Check ist gegen die WAHRHEIT auf IG selbst — fängt Posts, die im ungeschützten Fenster entstanden
//    und NICHT im Ledger landeten (genau die Lücke, die 2026-07-12 den Doppelpost verursachte).
//    Normalisierte Caption-Basis (erste ~40 Zeichen, ohne Emoji/Sonderzeichen) als Signatur.
const capSig = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
async function igLiveHas(caption) {
  const want = capSig(caption);
  if (!want) return false;
  for (let a = 0; a < 3; a++) {
    const d = await api(`${IG}/media`, { fields: 'caption,permalink,timestamp', limit: '25' }, 'GET');
    if (d && Array.isArray(d.data)) {
      const hit = d.data.find(p => capSig(p.caption) === want);
      if (hit) { console.error(`⛔ LIVE-DOPPELPOST verhindert — gleiche Caption ist auf IG schon live: ${hit.permalink}`); return true; }
      return false;                       // Abfrage erfolgreich, kein Treffer → sauber
    }
    await sleep(2000 * (a + 1));           // Lesefehler (Token/Netz) → kurz retry
  }
  console.error('⚠️ IG-Live-Abgleich nicht erreichbar (3× Fehler) → verlasse mich auf lokale Wachen.');
  return false;                            // Nie erreichbar → nicht das Posten blockieren (lokale Wachen greifen)
}
// 23.09.2026: Treffer QUITTIEREN — vorher blieb die Zeile «ready», wurde jeden Lauf wieder gewaehlt und blockierte die Reel-Queue.
// Exit 3 = «kein Post in diesem Lauf, ohne Fehler» → der Autopilot setzt seine Kadenz-Marke NICHT und versucht es im naechsten Durchlauf.
if (await igLiveHas(cand[idx.caption])) { if (!DRY) { cand[idx.status] = 'posted-dup-live'; postMark(cand[idx.video_url]); writeLedger(); } process.exit(3); }

// ── PRODUKT NOCH KAUFBAR? (GEHIRN 10 «vor Post prüfen, dass das Produkt noch ACTIVE ist» — bis 22.09.2026
//    lebte diese Regel nur im Kopf; der Autopilot postet ohne Menschen, also gehört sie hierher.)
//    Die Reel-ID traegt die Produkt-ID (cjreel-<pid>). Status ueber die Admin-API mit dem Shop-Token aus
//    /tmp/cj_shop_token.txt. Nicht ACTIVE → Zeile wird 'produkt-nicht-aktiv' und der Lauf endet ohne Post
//    (der naechste Lauf nimmt den naechsten Kandidaten). Ist die Pruefung selbst nicht moeglich
//    (kein Token, Netz), wird NICHT gepostet: ein Reel fuer ein gedraftetes Produkt ist ein toter Link in
//    der Bio, und «nicht pruefbar» ist kein «aktiv».
async function produktAktiv(postId) {
  // 23.09.2026: v2-Reels heissen cjreel-<CJ-pid> (numerisch 18–19-stellig ODER UUID wie F5BA858E-…), v1-Reels
  // cjreel-<Shopify-Produkt-ID> (13–14-stellig). Die alte Fassung fragte JEDE Zahl als Shopify-ID ab →
  // «Produkt existiert nicht mehr» fuer den aktiven Projektor (Zeile faelschlich produkt-nicht-aktiv) und
  // «keine Produkt-ID» fuer UUID-pids (Tor uebersprungen). Jetzt: Shopify-ID direkt, CJ-pid per SKU-Suche.
  const m = /^cjreel-([0-9A-Za-z-]{6,})$/.exec(postId || '');
  if (!m) return { ok: true, grund: 'keine Produkt-ID im Reel-Namen' };
  const istShopifyId = /^\d{12,15}$/.test(m[1]);
  const query = istShopifyId
    ? `{ product(id:"gid://shopify/Product/${m[1]}"){ status onlineStoreUrl priceRangeV2{ minVariantPrice{ amount } maxVariantPrice{ amount } } } }`
    : `{ products(first:1, query:"sku:CJ-${m[1]}"){ nodes{ status onlineStoreUrl priceRangeV2{ minVariantPrice{ amount } maxVariantPrice{ amount } } } } }`;
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const tok = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
  if (!tok) return { ok: false, grund: 'kein Shop-Token' };
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, { method: 'POST',
        headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }) });
      const d = await r.json();
      const p = istShopifyId ? (d && d.data && d.data.product) : ((d && d.data && d.data.products && d.data.products.nodes && d.data.products.nodes[0]) || (d && d.data ? null : undefined));
      if (p === null) return { ok: false, grund: 'Produkt existiert nicht mehr' };
      if (p) return { ok: p.status === 'ACTIVE' && !!p.onlineStoreUrl, grund: `status ${p.status}, onlineStoreUrl ${p.onlineStoreUrl ? 'ja' : 'nein'}`, url: p.onlineStoreUrl || '', min: parseFloat(p.priceRangeV2?.minVariantPrice?.amount || 'NaN'), max: parseFloat(p.priceRangeV2?.maxVariantPrice?.amount || 'NaN') };
    } catch (e) { /* retry */ }
    await sleep(2000 * (a + 1));
  }
  return { ok: false, grund: 'Shopify nicht erreichbar' };
}
let shopUrl = '';
// 23.09.2026: Sammel-Reels (promo-…) werben fuer MEHRERE Produkte mit Preisen im Bild. Das Video traegt ein
// Manifest (MP4-Kommentar); `promo_montage.py --pruefen` vergleicht jedes Produkt live (ACTIVE + Preis). Exit 3 =
// veraltet → Zeile 'promo-veraltet', kein Post. FB-Link = die Kollektion aus der Caption.
async function promoPruefen(postId, videoUrl, caption) {
  const datei = (String(videoUrl || '').match(/\/(social\/reels\/[\w.-]+\.mp4)(?:\?|$)/) || [])[1];
  if (!datei || !fs.existsSync(datei)) return { ok: false, grund: 'Promo-Datei nicht im Repo — Manifest nicht pruefbar' };
  const koll = (String(caption || '').match(/luxestyle\.ch\/collections\/[\w-]+/) || [])[0];
  try {
    const aus = _exf('python3', ['automation/reel/promo_montage.py', '--pruefen', datei], { encoding: 'utf8', timeout: 180000 });
    return { ok: true, grund: aus.trim().split('\n').pop(), url: koll ? `https://${koll}` : '' };
  } catch (e) {
    const aus = `${e.stdout || ''}${e.stderr || ''}`.trim().split('\n').slice(-4).join(' | ');
    return { ok: false, veraltet: e.status === 3, grund: `Promo-Pruefung Exit ${e.status}: ${aus.slice(0, 300)}` };
  }
}
{
  const pa = /^promo-/.test(cand[idx.id] || '')
    ? await promoPruefen(cand[idx.id], cand[idx.video_url], cand[idx.caption])
    : await produktAktiv(cand[idx.id]);
  if (!pa.ok && pa.veraltet && !DRY) { cand[idx.status] = 'promo-veraltet'; writeLedger(); console.error(`⛔ Kein Post — ${pa.grund}`); process.exit(3); }
  shopUrl = pa.url || '';
  if (!pa.ok) {
    console.error(`⛔ Kein Post — Produkt nicht kaufbar/pruefbar (${pa.grund}): ${cand[idx.id]}`);
    if (!DRY && /nicht mehr|status DRAFT|status ARCHIVED|onlineStoreUrl nein/.test(pa.grund)) { cand[idx.status] = 'produkt-nicht-aktiv'; writeLedger(); }
    process.exit(3);
  }
  { const pv = preisVeraltet(cand[idx.caption], pa.min, pa.max);   // 24.09.2026: eingebrannter Preis ≠ Live-Preis
    if (pv) { console.error(`⛔ Kein Post — Preis veraltet (${pv}): ${cand[idx.id]}`); if (!DRY) { cand[idx.status] = 'preis-veraltet-skip'; writeLedger(); } process.exit(3); } }
  console.log(`  Produkt: ${pa.grund}`);
}
const [id, , url, caption, tags] = [cand[idx.id], 0, cand[idx.video_url], cand[idx.caption], cand[idx.hashtags]];
const text = `${caption}\n\n${(tags || '').split(/[,\s]+/).filter(Boolean).slice(0, 12).join(' ')}`;
const fbTextReel = fbText(text, shopUrl, 'reel');   // FB: klickbarer Produktlink statt «(Link in Bio)»
console.log(`Post: ${id}\n  Video: ${url.slice(0, 90)}\n  Caption: ${text.slice(0, 100)}…`);
if (DRY) {
  console.log('[DRY] würde jetzt IG-Reel + FB-Video posten (nichts gepostet, nichts geschrieben).');
  console.log(`── Instagram-Caption ──\n${text}\n── Facebook-Text ──\n${fbTextReel}`);
  process.exit(0);
}

// ── CLAIM: Zeile SOFORT als 'posting' markieren + Ledger schreiben, BEVOR gepostet wird.
//    Schließt das «Post-vor-Commit»-Fenster: stirbt der Prozess jetzt, steht die Zeile auf
//    'posting' (nicht mehr 'ready') → kein zweiter Lauf postet denselben Reel erneut.
cand[idx.status] = 'posting';
cand[idx.posted_at] = new Date().toISOString();
writeLedger();

let igPermalink = '';
// 1) Instagram Reel
{ // Einwilligungs-Bedingung der Kundin: ihr Material nur MIT Markierung (04.09.2026).
  const fehlt = markierungFehlt(url, text, cand[idx.id]);
  if (fehlt) { console.error('⛔', fehlt); cand[idx.status] = 'markierung-fehlt'; writeLedger(); process.exit(3); } }
// 25.09.2026 (Betreiber-Screenshot IG-Profil): Im Profilraster schneidet IG Reels auf 3:4, also y 240–1680, und das Reel-Symbol
// liegt über y 270–355. Reels, die VOR der Layout-Korrektur (overlay.py KOPF_Y 250 / HOOK_Y 400) gebaut wurden, zeigen auf dem
// Cover (Frame 0) ein halb abgeschnittenes LUXESTYLE und einen Hook unter dem Symbol. Neu rendern geht nicht (CJ-Videohost per
// Proxy gesperrt). Deshalb nehmen alte Reels das Cover bei 3,5 s: Der Hook ist bis 3,2 s eingeblendet, danach zeigt die Kachel
// Produkt, Titel und Preis. Neue Reels behalten Frame 0 samt Hook.
const LAYOUT_NEU_AB = Date.parse(process.env.LAYOUT_NEU_AB || '2026-09-25T18:15:00Z');
const altesLayout = (() => {
  const m = /social\/reels\/([^/?#]+\.mp4)/.exec(url);            // Repo-Reel: Dateizeit ist die Wahrheit
  if (m && fs.existsSync(`social/reels/${m[1]}`)) {
    try {   // git setzt die mtime beim Auschecken neu → Commit-Zeit der Datei, nicht die Dateizeit
      const t = Date.parse(String(_exf('git', ['log', '-1', '--format=%cI', '--', `social/reels/${m[1]}`], { encoding: 'utf8' })).trim());
      if (!Number.isNaN(t)) return t < LAYOUT_NEU_AB;
    } catch {}
  }
  return (cand[idx.scheduled_date] || '').trim().slice(0, 10) <= '2026-09-25';   // CDN-Reels: alle vor der Korrektur gebaut
})();
const c = await api(`${IG}/media`, { media_type: 'REELS', video_url: url, caption: text, share_to_feed: 'true', ...(altesLayout ? { thumb_offset: '3500' } : {}) });
if (altesLayout) console.log('   Cover bei 3,5 s (Reel mit altem Layout, Hook im Raster sonst abgeschnitten)');
if (!c.id) { console.error('IG-Container-Fehler:', JSON.stringify(c).slice(0, 300)); cand[idx.status] = 'ready'; writeLedger(); process.exit(1); }
for (let a = 0; a < 30; a++) {
  await sleep(8000);
  const st = await api(`${c.id}`, { fields: 'status_code' }, 'GET');
  if (st.status_code === 'FINISHED') break;
  if (st.status_code === 'ERROR') { console.error('IG-Verarbeitung fehlgeschlagen:', JSON.stringify(st).slice(0, 200)); cand[idx.status] = 'ready'; writeLedger(); process.exit(1); }
}
const pub = await api(`${IG}/media_publish`, { creation_id: c.id });
if (pub.id) {
  // ✅ IG ist LIVE → SOFORT committen (vor dem langsamen FB-Schritt), sonst droht Re-Post bei Abbruch.
  cand[idx.status] = 'posted-ig-fb';
  cand[idx.posted_at] = new Date().toISOString();
  cand[idx.post_url] = pub.id;
  postMark(url);                    // gemeinsamer Ledger: kein anderer Poster wiederholt dieses Video
  familieMerken(cand[idx.caption], 'reel');
  writeLedger();
  const perma = await api(`${pub.id}`, { fields: 'permalink' }, 'GET');
  igPermalink = perma.permalink || pub.id;
  cand[idx.post_url] = igPermalink; writeLedger();
  console.log('✅ Instagram-Reel live:', igPermalink);
} else {
  // Publish fehlgeschlagen (kein IG-Post entstanden) → zurück auf ready
  console.error('IG-Publish-Fehler:', JSON.stringify(pub).slice(0, 300));
  cand[idx.status] = 'ready'; cand[idx.posted_at] = ''; writeLedger(); process.exit(1);
}
// 2) Facebook-Seitenvideo (best effort — Ledger ist bereits committet, FB-Fehler löst KEINEN Re-Post aus)
const fbIdent = await fbSeitenIdentitaet(TOK, FB);
if (!fbIdent.ok) { console.error('⛔ FB-Seitenwache:', fbIdent.grund); }
const fb = fbIdent.ok ? await api(`${FB}/videos`, { file_url: url, description: fbTextReel }) : { error: 'FB-Seitenwache: ' + fbIdent.grund };
console.log(fb.id ? `✅ Facebook-Video live: ${fb.id}` : `FB-Fehler (IG war ok, Ledger committet): ${JSON.stringify(fb).slice(0, 200)}`);
console.log('Ledger aktualisiert →', id, 'posted-ig-fb');
