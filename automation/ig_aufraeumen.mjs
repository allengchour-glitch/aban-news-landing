// ig_aufraeumen.mjs — löscht Instagram-Beiträge, die nicht (mehr) passen (Betreiber 25.09.2026: «lösche die post die nicht
// passen automatisch»). Anlass: Screenshot des IG-Profils mit Lieferanten-Werbetext im Bild («LED multifunctional desk lamp»)
// und einem wiederholten Produkt (Gua-Sha, Juni + September).
//
// GRÜNDE (jeder live nachgeprüft, nie aus einem Ledger allein):
//   TEXT     Bildpost (IMAGE, Lieferantenbild) mit ≥ 5 Wörtern Lieferantentext im Bild — bildtext_pruefen.py KACHELN=1 (geeicht 25.09.:
//            Lampe 15 Wörter, saubere Posts ≤ 3). Karussells und Reels NIE: sie tragen unsere eigene Beschriftung.
//   PRODUKT  das beworbene Produkt ist nicht mehr kaufbar (DRAFT/ARCHIVED/gelöscht/ohne Onlineshop) — der Link in Bio führt ins Leere.
//            «Shopify nicht erreichbar» = unklar = behalten.
//   DOPPEL   dasselbe Produkt ist mehrfach live: behalten wird der Beitrag mit den meisten Aufrufen (bei Gleichstand der ältere).
// SCHUTZ:
//   • nie ein Beitrag mit > 500 Aufrufen (Hausregel), nie einer, dessen Aufrufe nicht lesbar sind;
//   • nie jünger als 6 h (Meta zählt Aufrufe verzögert; ein frischer Post hätte immer «0»);
//   • Tagesbudget TAGES_MAX (Vorgabe 5): Nach 120 FB-Löschungen am 23.09. setzte Meta eine Spam-Sperre — jede Antwort mit
//     Sperrhinweis beendet den Lauf sofort;
//   • Ledger dropship/_ig_geloescht.txt (Zeitpunkt, ID, Grund, Permalink, Caption-Anfang) — gelöscht ist nicht rückholbar,
//     deshalb steht vorher alles im Log;
//   • DRY ist Vorgabe; SCHARF=1 löscht. Rücklesen: gilt erst als gelöscht, wenn die ID auch im Medien-Listing fehlt.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SCHARF = process.env.SCHARF === '1';
const TAGES_MAX = parseInt(process.env.TAGES_MAX || '5', 10);
const MAX_AUFRUFE = parseInt(process.env.MAX_AUFRUFE || '500', 10);
const MIN_ALTER_H = parseFloat(process.env.MIN_ALTER_H || '6');
const TIEFE = parseInt(process.env.TIEFE || '300', 10);
const TEXT_MIN = parseInt(process.env.TEXT_MIN || '5', 10);
const LEDGER = 'dropship/_ig_geloescht.txt';
const V = 'v21.0';
const IG = fs.readFileSync('/tmp/meta_ig_id', 'utf8').trim();
const T = fs.readFileSync('/tmp/meta_page_token', 'utf8').trim();
const SHOPTOK = fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim() : '';
const warte = ms => new Promise(r => setTimeout(r, ms));
const HEUTE = new Date().toISOString().slice(0, 10);

const SPERRE = /spam|community|temporarily blocked|rate limit|too many|limit reached|vor spam|Aktion blockiert/i;
async function g(pfad, opt = {}) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://graph.facebook.com/${V}/${pfad}${pfad.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(T)}`, opt);
      return await r.json();
    } catch { await warte(2000 * (a + 1)); }
  }
  return { error: { message: 'netz' } };
}

// ── 1. Live-Beiträge holen ───────────────────────────────────────────────────────────────────────────────────────
const posts = [];
let weiter = `${IG}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp,caption&limit=100`;
while (weiter && posts.length < TIEFE) {
  const d = await g(weiter);
  if (d.error) { console.log('⛔ Medien-Listing nicht lesbar:', d.error.message); process.exit(2); }
  posts.push(...(d.data || []));
  const n = d.paging?.next; weiter = n ? n.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+\//, '').replace(/[&?]access_token=[^&]+/, '') : '';
}
console.log(`Live-Beiträge: ${posts.length}`);

// ── 2. Zuordnung Beitrag → Produkt (Caption-Link, sonst unsere Ledger) ─────────────────────────────────────────────
function csvZeilen(datei) {
  if (!fs.existsSync(datei)) return [];
  const t = fs.readFileSync(datei, 'utf8'); const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  const kopf = rows.shift() || []; const ix = Object.fromEntries(kopf.map((h, i) => [h.trim(), i]));
  return rows.filter(r => r.length > 1).map(r => ({ id: r[ix.id] || '', post_url: r[ix.post_url] || '', bild: ix.image_url !== undefined ? (r[ix.image_url] || '') : '' }));
}
const zuordnung = new Map();   // IG-Media-ID → Zeilen-ID
const quellbild = new Map();   // IG-Media-ID → unser Quellbild (Shopify-CDN; den IG-CDN sperrt der Proxy, gemessen 25.09.)
for (const d of ['social/posts_image.csv', 'automation/reels_seed.csv', 'social/posts_carousel.csv'])
  for (const z of csvZeilen(d)) for (const m of (z.post_url.match(/\d{15,}/g) || [])) { zuordnung.set(m, z.id.trim()); if (z.bild) quellbild.set(m, z.bild.trim()); }

function produktSchluessel(p) {
  const link = /luxestyle\.ch\/products\/([\w%-]+)/.exec(p.caption || '');
  if (link) return { art: 'handle', wert: decodeURIComponent(link[1]) };
  const zid = zuordnung.get(p.id) || '';
  const pid = /(\d{12,})\s*$/.exec(zid); if (pid) return { art: 'pid', wert: pid[1] };
  const cj = /^cjreel-([0-9A-Za-z-]{6,})$/.exec(zid); if (cj) return { art: 'sku', wert: `CJ-${cj[1]}` };
  if (zid && !/^(kimi|edit|ki|clip|promo|marke|brand)-/.test(zid) && /-/.test(zid)) return { art: 'handle', wert: zid.replace(/-\d{4}-\d{2}-\d{2}$/, '') };
  return null;
}
const shopCache = new Map();
async function kaufbar(s) {
  const k = `${s.art}:${s.wert}`; if (shopCache.has(k)) return shopCache.get(k);
  if (!SHOPTOK) return { ok: null, grund: 'kein Shop-Token' };
  const q = s.art === 'pid' ? `{ product(id:"gid://shopify/Product/${s.wert}"){ id status onlineStoreUrl title } }`
    : s.art === 'handle' ? `{ productByHandle(handle:${JSON.stringify(s.wert)}){ id status onlineStoreUrl title } }`
    : `{ productVariants(first:1, query:${JSON.stringify('sku:' + s.wert)}){ nodes{ product{ id status onlineStoreUrl title } } } }`;
  let erg = { ok: null, grund: 'Shopify nicht erreichbar' };
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json', { method: 'POST',
        headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      const d = await r.json();
      if (d?.data) {
        const p = d.data.product ?? d.data.productByHandle ?? d.data.productVariants?.nodes?.[0]?.product ?? null;
        // ⚠️ 25.09. Trockenlauf: «nicht gefunden» über einen HANDLE ist KEIN Beweis für «gelöscht». Alte Queue-IDs
        // («meta-roma-ig», «savanna-2026-06-06») sind keine Handles, und umbenannte Handles liefern ebenfalls null.
        // Der Blazer Roma ist ACTIVE und stand trotzdem als «existiert nicht mehr» auf der Löschliste. Nur eine
        // Produkt-ID, die nicht mehr existiert, gilt als weg. Alles andere ist unklar und bleibt stehen.
        erg = p ? { ok: p.status === 'ACTIVE' && !!p.onlineStoreUrl, grund: `${p.status}${p.onlineStoreUrl ? '' : ', ohne Onlineshop'}`, gid: p.id, titel: p.title }
                : s.art === 'pid' ? { ok: false, grund: 'Produkt existiert nicht mehr (ID)' }
                : { ok: null, grund: `${s.art} ${s.wert} nicht gefunden (unklar)` };
        break;
      }
    } catch {}
    await warte(2000 * (a + 1));
  }
  shopCache.set(k, erg); return erg;
}

async function aufrufe(id) {
  const d = await g(`${id}/insights?metric=views`);
  const v = d?.data?.[0]?.values?.[0]?.value;
  return typeof v === 'number' ? v : null;
}
function bildWoerter(url) {
  try {
    const raus = execFileSync('python3', [new URL('./bildtext_pruefen.py', import.meta.url).pathname, '--url', url],
      { encoding: 'utf8', timeout: 150000, env: { ...process.env, KACHELN: '1' } });
    const n = parseInt(String(raus).trim().split('\n').pop(), 10); return Number.isNaN(n) ? -1 : n;
  } catch { return -1; }
}

// ── Facebook-Seite: Zwillinge der IG-Beiträge (der Autopilot postet Bild/Reel auf beide Kanäle) ────────────────────
const SEITE = '1049840534888592';
const fbPosts = [];
{ let w = `${SEITE}/posts?fields=id,message,created_time&limit=100`;
  while (w && fbPosts.length < 1500) {
    const d = await g(w); if (d.error) { console.log('⚠️ FB-Liste nicht lesbar → Facebook bleibt unangetastet:', d.error.message); break; }
    fbPosts.push(...(d.data || []));
    const n = d.paging?.next; w = n ? n.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+\//, '').replace(/[&?]access_token=[^&]+/, '') : '';
  } }
const fnorm = s => String(s || '').toLowerCase().replace(/[^a-z0-9äöü]+/g, ' ').trim().slice(0, 40);
function fbZwilling(p) {
  const k = fnorm(p.caption); if (k.length < 20) return { notiz: 'FB: Caption zu kurz für Zuordnung' };
  const t = Date.parse(p.timestamp);
  const tr = fbPosts.filter(f => fnorm(f.message).startsWith(k) && Math.abs(Date.parse(f.created_time) - t) <= 3 * 3.6e6);
  if (tr.length === 1) return { id: tr[0].id, notiz: '' };
  return { notiz: tr.length ? `FB: ${tr.length} Treffer → unangetastet` : 'FB: kein Zwilling' };
}
// Gelöscht = die ID antwortet mit Fehler 100 (IG, Reel) oder 10 (Seiten-Post, Lehre 23.09.). Jeder andere Zustand = noch da.
async function weg(id) {
  const r = await g(`${id}?fields=id`);
  // gemessen 25.09.: IG gelöscht = 100/33 «Unsupported get request»; FB gelöscht = 10 «Object does not exist»; existierend = OK
  const e = r.error; if (!e) return false;
  return (e.code === 100 && e.error_subcode === 33) || /does not exist/i.test(e.message || '');
}

// ── 3. Gründe sammeln ─────────────────────────────────────────────────────────────────────────────────────────────
const jetzt = Date.now();
const info = [];
for (const p of posts) {
  const alterH = (jetzt - Date.parse(p.timestamp)) / 3.6e6;
  const x = { p, alterH, gruende: [], notiz: [], schluessel: produktSchluessel(p) };
  const bildUrl = quellbild.get(p.id) || '';
  // TEXT nur bei LIEFERANTEN-Bildern (Trockenlauf 25.09.: die Regel traf auch unsere eigenen Juni-Gestaltungen
  // «wt-marco», «post-skelettuhr», «aurora-text» mit 4–7 eigenen Wörtern). Eigene Bilder: Präfix post-/wt-/pin-/meta-/
  // edit-, «-text-» im Namen, oder aus dem Repo/abannews.com. Ohne bekanntes Quellbild keine TEXT-Prüfung.
  const eigenesBild = !/cdn\.shopify\.com/.test(bildUrl) || /\/files\/(post|wt|pin|meta|edit|b|c|d)-|-text-/.test(bildUrl);
  if (p.media_type === 'IMAGE' && bildUrl && !eigenesBild) {
    const n = bildWoerter(bildUrl);
    // Löschschwelle 5, nicht 4 (Sichtbogen 25.09.: «Pois»-Armband las 4 Wörter aus dem Stoffmuster, kein Text im Bild).
    // Der Poster überspringt schon ab 4 — Überspringen ist umkehrbar, Löschen nicht.
    if (n >= TEXT_MIN) x.gruende.push(`TEXT ${n} Wörter im Bild`); else if (n < 0) x.notiz.push('Bildtext unlesbar');
  }
  if (x.schluessel) {
    const k = await kaufbar(x.schluessel); x.produkt = k;
    if (k.ok === false) x.gruende.push(`PRODUKT ${k.grund}`);
  }
  info.push(x);
}
// DOPPEL: je Produkt (Shopify-GID, sonst Schlüssel) behält der Beitrag mit den meisten Aufrufen
const gruppen = new Map();
for (const x of info) { const k = x.produkt?.gid; if (k) (gruppen.get(k) || gruppen.set(k, []).get(k)).push(x); }   // nur sicher zugeordnete Posts
for (const x of info) x.aufrufe = null;
const brauchtAufrufe = new Set(info.filter(x => x.gruende.length).map(x => x.p.id));
for (const [, gr] of gruppen) if (gr.length > 1) gr.forEach(x => brauchtAufrufe.add(x.p.id));
for (const x of info) if (brauchtAufrufe.has(x.p.id)) x.aufrufe = await aufrufe(x.p.id);
for (const [k, gr] of gruppen) {
  if (gr.length < 2) continue;
  const lesbar = gr.filter(x => x.aufrufe !== null); if (lesbar.length !== gr.length) { gr.forEach(x => x.notiz.push('DOPPEL: Aufrufe nicht alle lesbar → keiner gelöscht')); continue; }
  // behalten wird bevorzugt ein Beitrag OHNE eigenen Löschgrund, sonst ginge das Produkt ganz vom Profil
  const bleib = [...gr].sort((a, b) => (a.gruende.length > 0) - (b.gruende.length > 0) || (b.aufrufe - a.aufrufe) || (Date.parse(a.p.timestamp) - Date.parse(b.p.timestamp)))[0];
  for (const x of gr) if (x !== bleib) x.gruende.push(`DOPPEL von ${bleib.p.permalink} (${bleib.aufrufe} Aufrufe)`);
}

// ── 4. Schutz + Budget ────────────────────────────────────────────────────────────────────────────────────────────
const heuteSchon = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(z => z.startsWith(HEUTE) && z.includes('\tgeloescht\t')).length : 0;
const kandidaten = info.filter(x => x.gruende.length).sort((a, b) => (b.gruende.some(g => g.startsWith('TEXT')) - a.gruende.some(g => g.startsWith('TEXT'))) || (a.aufrufe ?? 1e9) - (b.aufrufe ?? 1e9));
let budget = Math.max(0, TAGES_MAX - heuteSchon), geloescht = 0;
console.log(`Kandidaten: ${kandidaten.length} · heute schon gelöscht: ${heuteSchon} · Budget: ${budget}${SCHARF ? '' : ' [DRY]'}`);
for (const x of kandidaten) {
  const kurz = (x.p.caption || '').split('\n')[0].slice(0, 60);
  const zeile = `${x.p.media_type} ${x.p.permalink} · ${x.aufrufe ?? '?'} Aufrufe · ${x.alterH.toFixed(0)} h · ${x.gruende.join(' + ')} · «${kurz}»`;
  if (x.aufrufe === null) { console.log(`   ⏸ Aufrufe unlesbar → behalten: ${zeile}`); continue; }
  if (x.aufrufe > MAX_AUFRUFE) { console.log(`   ⏸ > ${MAX_AUFRUFE} Aufrufe → behalten: ${zeile}`); continue; }
  if (x.alterH < MIN_ALTER_H) { console.log(`   ⏸ jünger als ${MIN_ALTER_H} h → später: ${zeile}`); continue; }
  if (budget <= 0) { console.log(`   ⏳ Tagesbudget erschöpft → morgen: ${zeile}`); continue; }
  console.log(`   🗑  ${SCHARF ? 'LÖSCHE' : 'würde löschen'}: ${zeile}`);
  if (!SCHARF) { budget--; continue; }
  const r = await g(x.p.id, { method: 'DELETE' });
  if (r.error) {
    console.log(`      ⛔ ${r.error.message}`);
    if (SPERRE.test(r.error.message || '')) { console.log('⛔ Sperrhinweis von Meta → Lauf beendet'); break; }
    continue;
  }
  await warte(5000);
  // Rücklesen über die ID selbst. Die erste Fassung suchte in den neuesten 100 des Listings, dort steht ein Juni-Post aber
  // ohnehin nicht → er wäre IMMER als «gelöscht» quittiert worden (gefunden 25.09. vor dem ersten Juni-Kandidaten).
  if (!(await weg(x.p.id))) { console.log('      ⚠️ DELETE ohne Fehler, aber noch lesbar → nicht als gelöscht quittiert'); continue; }
  // Facebook-Zwilling: gleicher Textanfang, ≤ 3 h Abstand, GENAU einer — sonst bleibt Facebook unangetastet.
  const zw = fbZwilling(x.p); let fbNotiz = zw.notiz;
  if (zw.id) {
    const rf = await g(zw.id, { method: 'DELETE' });
    if (rf.error) { fbNotiz = `FB-Fehler: ${rf.error.message.slice(0, 80)}`; if (SPERRE.test(rf.error.message || '')) { console.log('⛔ Sperrhinweis von Meta (FB) → Lauf beendet'); break; } }
    else { await warte(3000); fbNotiz = (await weg(zw.id)) ? `FB ${zw.id} gelöscht` : `FB ${zw.id}: DELETE ohne Fehler, noch lesbar`; }
  }
  fs.appendFileSync(LEDGER, `${new Date().toISOString()}\tgeloescht\t${x.p.id}\t${x.gruende.join(' + ')}\t${x.p.permalink}\t${x.aufrufe}\t${kurz.replace(/\t/g, ' ')}\t${x.p.timestamp}\t${fbNotiz}\n`);
  geloescht++; budget--;
  console.log(`      ✅ gelöscht (ID nicht mehr lesbar) · ${fbNotiz}`);
  await warte(45000);   // Takt wie fb_caption_korrektur (Spam-Schutz)
}
console.log(`FERTIG ${new Date().toISOString()}: ${geloescht} gelöscht${SCHARF ? '' : ' (DRY)'} · ${kandidaten.length} Kandidaten`);
