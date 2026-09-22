/* cj_video_reel_engine.mjs (v2, 22.09.2026) — CJ-Produktvideos → gebrandete 9:16-Reels → Reel-Queue.
 *
 * WARUM v2 (gemessen 22.09.): Die v1 suchte «tag:video-hit MIT VIDEO-media» — der Tag steht an JEDEM
 * Import, echte Videos hatten 144 von 34'824 Produkten; der Motor meldete seit Wochen «neue Reels: 0».
 * Dazu ist der Shopify-Dateispeicher voll (CDN-Upload «Verarbeitung FAILED»). Beides umgangen:
 *   · Quelle = CJ selbst: POST /product/queryVideosByProductId {productId} → videoUrl (Download braucht
 *     den Referer developers.cjdropshipping.com, sonst 403). Produkt-ID steckt in der SKU «CJ-<pid>».
 *   · Ablage = dieses (öffentliche) Repo unter social/reels/ — Instagram nimmt die raw.githubusercontent-
 *     Adresse an (Container FINISHED, 22.09. gemessen). Übergang bis zum Grow-Plan (~21.10.), dann CDN.
 *   · Qualitätsschwelle: ACTIVE, Preis ≥ 14.90, ≥ 2 Bilder, keine Kostüm-/Erotik-/Klingen-Titel,
 *     Kategorien bunt gemischt (balanceByCategory), nie ein Produkt zweimal (Ledger + CSV + Post-Ledger).
 *   · Optik/Text: Hook je Thema (lernt aus social/_lernen.json, wenn vorhanden), Titel zweizeilig,
 *     Caption Hook + Nutzen + Preis + CTA, Hashtags Kategorie + Konsens-Pool (SECOND-BRAIN).
 *   · Quittung NUR nach erfolgreichem Push (die Adresse muss erreichbar sein, bevor der Poster sie sieht).
 * ENV: BATCH=3 · SCAN=240 · DRY=1 (nur zeigen) · SHOPIFY_ADMIN_TOKEN oder /tmp/cj_shop_token.txt ·
 *      CJ_TOKEN oder /tmp/cj_token.json
 */
import fs from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { nachlauf } from './eimer_etikette.mjs';
import { takt as cjTakt } from './cj_takt.mjs';
import { catKey, tagsFor, balanceByCategory } from './lib/reel-category.mjs';
import { seen as postSeen, produktGepostet } from './post_guard.mjs';

const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const BATCH = parseInt(process.env.BATCH || '3', 10);
const SCAN = parseInt(process.env.SCAN || '240', 10);
const DRY = process.env.DRY === '1';
const FRAGEN = parseInt(process.env.FRAGEN || '200', 10);  // CJ-Anfragen je Lauf (Video-Quote gemessen 22.09.: 1 von 80 — die Importer haengten Videos nur bei cj_category_fill an)
const CSV = 'automation/reels_seed.csv';
const LEDGER = 'dropship/_cj_reel_gebaut.txt';            // pid → nur nach Erfolg
const KEINVIDEO = 'dropship/_cj_reel_kein_video.txt';      // pid → CJ hat kein Video (nicht nochmal fragen)
const MEDIEN = 'social/reels';
const BRANCH = 'claude/luxestyle-status-tztnn1';
const RAW = `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/${BRANCH}/${MEDIEN}/`;
const MUSIC = ['luxe-cinematic-house.wav', 'luxe-lounge-sax.wav', 'luxe-house1.wav', 'luxe-hype-pro.mp3', 'luxe-liquid-dnb.wav', 'luxe-orchestra.wav'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
// pid → stabile Zahl (auch fuer UUID-pids wie F5BA858E-…; GEMESSEN 22.09.: Number(...) gab NaN → Hook «undefined», Musik «undefined»)
const num = p => { let h = 0; for (const c of String(p)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };


const TOK = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json') ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
if (!TOK) { console.log('Kein Shopify-Token (SHOPIFY_ADMIN_TOKEN oder /tmp/cj_shop_token.txt) → No-op.'); process.exit(0); }
if (!CJT) { console.log('Kein CJ-Token (/tmp/cj_token.json) → No-op.'); process.exit(0); }

async function gql(q, v) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query: q, variables: v }) });
      const j = await r.json(); await nachlauf(j);
      if (j.data) return j;
      if (JSON.stringify(j.errors || '').includes('hrottl')) { await sleep(4000); continue; }
      console.log('  gql:', JSON.stringify(j.errors || j).slice(0, 160)); return null;
    } catch (e) { await sleep(2000); }
  }
  return null;
}
async function cjVideo(pid) {
  await cjTakt();
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/queryVideosByProductId', { method: 'POST', headers: { 'CJ-Access-Token': CJT, 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: String(pid) }) });
      const j = await r.json();
      if (j && j.code === 1600200) { await sleep(8000); continue; }     // Drossel: warten
      if (j && j.code === 16900500) throw new Error('CJ-Tagesbudget erschoepft');
      const d = Array.isArray(j?.data) ? j.data : [];
      const v = d.filter(x => x && x.videoUrl).sort((a, b) => (b.videoSize || 0) - (a.videoSize || 0))[0];
      return v ? v.videoUrl : '';
    } catch (e) { if (/Tagesbudget/.test(String(e))) throw e; await sleep(3000); }
  }
  return '';
}

// ---------------------------------------------------------------- Text
const VERBOTEN = /kost[uü]m|erotik|sex|dildo|vibrator|messer|klinge|schwert|tabak|vape|e-?zigarette|waffe|airsoft/i;
function thema(t) {
  const s = t.toLowerCase();
  if (/hund|katze|haustier|welpe|\bpet\b/.test(s)) return 'haustier';
  if (/fitness|yoga|training|hantel|widerstand|faszien|sport/.test(s)) return 'fitness';
  if (/küche|kuchen|mixer|kaffee|tee|entsafter|grill|messbecher|topf|pfanne/.test(s)) return 'kueche';
  if (/kind|baby|kleinkind|spielzeug|lern/.test(s)) return 'kinder';
  if (/lampe|licht|led|deko|vase|kerze|diffuser|aroma|kissen|decke|organizer|regal/.test(s)) return 'home';
  if (/beamer|projektor|kopfhörer|kopfhoerer|lautsprecher|ladegerät|kabel|usb|bluetooth|smart|kamera|drohne|gadget|tracker|hülle|huelle/.test(s)) return 'gadget';
  if (/serum|gua|roller|creme|pflege|haar|nagel|wimper|augenbraue|makeup|make-up|massage|beauty|glätt/.test(s)) return 'beauty';
  if (/kette|ohrring|armreif|armband|\bring\b|schmuck|anhänger|uhr/.test(s)) return 'schmuck';
  if (/kleid|rock|bluse|hose|jacke|mantel|hoodie|shirt|pullover|sneaker|schuh|tasche|rucksack|gürtel|schal|cap|mütze/.test(s)) return 'mode';
  return 'allgemein';
}
const HOOKS = {
  haustier: ['Dein Hund wird es lieben', 'Für die Katze, die alles darf', 'Endlich Ruhe beim Gassi?'],
  fitness: ['Training ohne Studio', 'Kleines Teil, grosse Wirkung', '10 Minuten, jeden Tag'],
  kueche: ['Küche, aber einfacher', 'Das fehlt in jeder Küche', 'Frühstück in 2 Minuten'],
  kinder: ['Für kleine Entdecker', 'Ruhe im Kinderzimmer?', 'Lernen, das Spass macht'],
  home: ['Dein Zuhause, gemütlicher', 'Das eine Teil fürs Wohnzimmer', 'Licht an, Stimmung an'],
  gadget: ['Kennst du das schon?', 'Das Gadget, das alle wollen', 'Warum hat das niemand früher gebaut?'],
  beauty: ['Dein 2-Minuten-Ritual', 'Salon-Feeling zuhause', 'Kleines Upgrade, grosser Glow'],
  schmuck: ['Das Teil, nach dem alle fragen', 'Schmuck, der bleibt', 'Alltag, aber glänzender'],
  mode: ['Dein neues Lieblingsteil?', 'Outfit fertig in 10 Sekunden', 'Das trägt jetzt jeder'],
  allgemein: ['Neu bei LuxeStyle', 'Genau das hat gefehlt', 'Wusstest du das schon?'],
};
function lernen() { try { return JSON.parse(fs.readFileSync('social/_lernen.json', 'utf8')); } catch { return {}; } }
function hookFuer(th, pid, title = '') {
  const L = lernen(); let list = HOOKS[th] || HOOKS.allgemein;
  // Tierart beachten (22.09.: «Für die Katze, die alles darf» stand auf dem Futterspender für Hunde)
  if (/hund|welpe|gassi/i.test(title)) list = list.filter(h => !/katze/i.test(h));
  else if (/katze|kater|kitten/i.test(title)) list = list.filter(h => !/hund|gassi/i.test(h));
  if (!list.length) list = HOOKS.allgemein;
  const gew = (L.hooks || {});                                   // {hookText: score}
  const best = [...list].sort((a, b) => (gew[b] || 0) - (gew[a] || 0));
  const top = best.slice(0, 2);                                   // die zwei besten rotieren, Rest bleibt im Spiel
  const n = num(pid) % 3;
  return n === 2 ? list[num(pid) % list.length] : top[n % top.length];
}
function kurzTitel(title) {
  let t = title.replace(/\s*[·•|]\s*.*$/, '').replace(/\s+[–—-]\s+.*$/, '').replace(/:.*$/, '').trim();
  if (t.length < 12) t = title.trim();
  return t;
}
function zeilen(title) {
  const t = kurzTitel(title); const rest = title.slice(title.indexOf(t) + t.length).replace(/^\s*[·•|:–—-]\s*/, '').trim();
  const w = t.split(/\s+/); let a = '', b = '';
  for (const x of w) { if ((a + ' ' + x).trim().length <= 26 && !b) a = (a + ' ' + x).trim(); else b = (b + ' ' + x).trim(); }
  if (!b && rest && rest.length <= 30) b = rest;
  if (b.length > 30) b = b.slice(0, 29).trim() + '…';
  return [a, b];
}
function nutzen(desc) {
  const s = (desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const satz = s.split(/(?<=[.!?])\s+/).find(x => x.length >= 30 && x.length <= 150 && !/\bSie\b|\bIhr[e]?\b|Lieferzeit|Werktag|Versand|CHF/.test(x));
  return satz ? satz.replace(/[.!?]$/, '') : '';
}
const POOL = ['#trending', '#viral', '#fyp', '#ootd', '#style', '#shopping'];
function hashtags(title, pid) {
  const base = tagsFor(title).split(/\s+/);
  const k = num(pid) % POOL.length;
  const extra = [POOL[k], POOL[(k + 1) % POOL.length]];
  return [...new Set([...base, '#reels', ...extra])].slice(0, 9).join(' ');
}
const esc = x => /[",\n]/.test(x) ? '"' + String(x).replace(/"/g, '""') + '"' : x;
function appendReel(id, url, cap, tags, platforms) {
  let csv = fs.readFileSync(CSV, 'utf8'); if (!csv.endsWith('\n')) csv += '\n';
  csv += [id, new Date().toISOString().slice(0, 10), url, esc(cap), esc(tags), esc(platforms), 'ready', '', ''].join(',') + '\n';
  fs.writeFileSync(CSV, csv);
}
function gitPush(dateien, msg) {
  for (let a = 0; a < 3; a++) {
    try {
      execSync(`git add ${dateien.map(f => `'${f}'`).join(' ')} && git commit -q -m '${msg} [skip ci]' ; git fetch -q origin ${BRANCH} && git -c rebase.autoStash=true rebase -q FETCH_HEAD && timeout 60 git push -q origin ${BRANCH}`, { stdio: 'pipe' });
      return true;
    } catch (e) { execSync('git rebase --abort 2>/dev/null; true', { stdio: 'pipe' }); }
  }
  return false;
}

// ---------------------------------------------------------------- Kandidaten
const gebaut = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
const keinVideo = new Set(fs.existsSync(KEINVIDEO) ? fs.readFileSync(KEINVIDEO, 'utf8').split('\n').map(s => s.split('\t')[0].trim()).filter(Boolean) : []);
const inCsv = new Set((fs.readFileSync(CSV, 'utf8').match(/^cjreel-(\d+)/gm) || []).map(s => s.replace('cjreel-', '')));
const kand = []; let cursor = null, gescannt = 0;
// Index-Kandidaten zuerst (cj_video_index.mjs, 22.09.): Produkte, die laut CJ-Kategorieliste ein Video
// haben — der Motor fragt dann fast nur noch Treffer statt 1 von 80. Nachschlag im Shop per SKU-OR-Suche
// (20 je Aufruf, gemessen 22.09.), gleiche Schwellen wie der Scan.
const INDEX = 'dropship/_cj_video_index.json';
const idx = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : null;
const idxPids = idx ? Object.keys(idx.shop_video || {}).filter(p => !gebaut.has(p) && !keinVideo.has(p) && !inCsv.has(p)) : [];
let idxKand = 0;
for (let i = 0; i < Math.min(idxPids.length, 200); i += 20) {
  const q = idxPids.slice(i, i + 20).map(p => `sku:CJ-${p}`).join(' OR ');
  const r = await gql(`query($q:String){ products(first:20, query:$q){ nodes{ id title handle status tags mediaCount{count} description(truncateAt:260) variants(first:1){nodes{price sku}} } } }`, { q });
  if (!r) break;
  for (const n of r.data.products.nodes) {
    const sku = n.variants.nodes[0]?.sku || ''; const m = /^CJ-([0-9A-Za-z-]{10,})/.exec(sku); if (!m || !idxPids.includes(m[1])) continue;
    const pid = m[1]; const price = parseFloat(n.variants.nodes[0]?.price || '0');
    if (n.status !== 'ACTIVE' || price < 14.9 || (n.mediaCount?.count || 0) < 2 || VERBOTEN.test(n.title)) continue;
    if (produktGepostet(`«${kurzTitel(n.title)}»`, `cjreel-${pid}`)) continue;
    kand.push({ pid, title: n.title.trim(), handle: n.handle, price, desc: n.description || '', tags: n.tags || [], idx: true }); idxKand++;
  }
}
if (idx) console.log(`Video-Index: ${idxPids.length} offene Treffer → ${idxKand} Kandidaten (Index-Stand ${(idx.stand || '').slice(0, 16)})`);
while (gescannt < SCAN && idxKand < BATCH * 3) {
  const r = await gql(`query($c:String){ products(first:50, after:$c, sortKey:CREATED_AT, reverse:true, query:"status:active tag:cj-real"){ pageInfo{hasNextPage endCursor} nodes{ id title handle tags mediaCount{count} description(truncateAt:260) variants(first:1){nodes{price sku}} } } }`, { c: cursor });
  if (!r) break;
  const pg = r.data.products;
  for (const n of pg.nodes) {
    gescannt++;
    const sku = n.variants.nodes[0]?.sku || ''; const m = /^CJ-([0-9A-Za-z-]{10,})/.exec(sku); if (!m) continue;
    const pid = m[1]; const price = parseFloat(n.variants.nodes[0]?.price || '0');
    if (gebaut.has(pid) || keinVideo.has(pid) || inCsv.has(pid)) continue;
    if (price < 14.9 || (n.mediaCount?.count || 0) < 2 || VERBOTEN.test(n.title)) continue;
    if (produktGepostet(`«${kurzTitel(n.title)}»`, `cjreel-${pid}`)) continue;
    kand.push({ pid, title: n.title.trim(), handle: n.handle, price, desc: n.description || '', tags: n.tags || [] });
  }
  if (!pg.pageInfo.hasNextPage) break;
  cursor = pg.pageInfo.endCursor;
}
// Hype/neu zuerst, dann bunt nach Kategorie
const prio = x => (x.tags.includes('hype-jetzt') ? 0 : x.tags.includes('neuheit') || x.tags.includes('neu') ? 1 : 2);
const reihe = [...balanceByCategory(kand.filter(x => x.idx).sort((a, b) => prio(a) - prio(b)), x => x.title), ...balanceByCategory(kand.filter(x => !x.idx).sort((a, b) => prio(a) - prio(b)), x => x.title)];
console.log(`Kandidaten: ${kand.length} von ${gescannt} gescannt (Schwelle: ACTIVE, ≥CHF 14.90, ≥2 Bilder, nie gepostet)${DRY ? ' · DRY' : ''}`);

// ---------------------------------------------------------------- Bauen
fs.mkdirSync('/tmp/reelbuild', { recursive: true }); fs.mkdirSync(MEDIEN, { recursive: true });
let made = 0, gefragt = 0;
const letzteMusik = fs.existsSync('/tmp/_reel_last_music') ? fs.readFileSync('/tmp/_reel_last_music', 'utf8').trim() : '';
for (const k of reihe) {
  if (made >= BATCH || gefragt >= FRAGEN) break;
  gefragt++;
  let vurl = '';
  try { vurl = await cjVideo(k.pid); } catch (e) { console.log('  ✗ ' + e.message + ' — Lauf endet'); break; }
  if (!vurl) { if (!DRY) fs.appendFileSync(KEINVIDEO, `${k.pid}\t${new Date().toISOString().slice(0, 10)}\n`); continue; }
  const th = thema(k.title), hook = hookFuer(th, k.pid, k.title), [z1, z2] = zeilen(k.title);
  const benefit = nutzen(k.desc);
  const cap = `${hook} 👀\n«${kurzTitel(k.title)}»${benefit ? ` — ${benefit}.` : ''}\n\nCHF ${k.price.toFixed(2)} · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭\n🔗 luxestyle.ch/products/${k.handle} (Link in Bio)`;
  const tags = hashtags(k.title, k.pid);
  console.log(`→ ${k.pid} [${th}] ${k.title.slice(0, 60)} · CHF ${k.price}\n   Hook: ${hook} · Titel: ${z1} / ${z2}\n   Video: ${vurl.slice(0, 70)}`);
  if (DRY) { made++; continue; }
  const src = `/tmp/reelbuild/src_${k.pid}.mp4`, out = `/tmp/reelbuild/reel_${k.pid}.mp4`;
  try {
    execFileSync('curl', ['-s', '-L', '--max-time', '180', '-H', 'Referer: https://developers.cjdropshipping.com/', '-o', src, vurl], { stdio: 'ignore' });
    if (!fs.existsSync(src) || fs.statSync(src).size < 200000) { console.log('   Video zu klein/leer'); fs.rmSync(src, { force: true }); continue; }
    let dur = 0; try { dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' })); } catch {}
    if (dur && dur < 3) { console.log('   Video kuerzer als 3 s'); continue; }
    let musik = MUSIC[num(k.pid) % MUSIC.length]; if (musik === letzteMusik) musik = MUSIC[(MUSIC.indexOf(musik) + 1) % MUSIC.length];
    execFileSync('bash', ['automation/reel/make_reel.sh', src, out, z1, z2, `CHF ${k.price.toFixed(2)}`, hook, 'automation/music/' + musik], { stdio: 'ignore', env: { ...process.env, START: String(Math.min(2, dur / 4 || 0)) } });
    if (!fs.existsSync(out) || fs.statSync(out).size < 100000) { console.log('   Render fehlgeschlagen'); continue; }
    const datei = `reel_${k.pid}.mp4`; fs.copyFileSync(out, `${MEDIEN}/${datei}`);
    const url = RAW + datei;
    if (!gitPush([`${MEDIEN}/${datei}`], `Reel ${k.pid} (${th})`)) { console.log('   Push fehlgeschlagen — Reel verworfen, naechster Lauf'); fs.rmSync(`${MEDIEN}/${datei}`, { force: true }); continue; }
    // erreichbar?
    let code = '';
    try { code = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', '-r', '0-1000', url], { encoding: 'utf8' }); } catch {}
    if (!/^20[06]$/.test(code)) { console.log(`   Adresse antwortet ${code} — Reel bleibt im Repo, Zeile folgt beim naechsten Lauf`); continue; }
    appendReel(`cjreel-${k.pid}`, url, cap, tags, 'instagram,facebook');
    fs.appendFileSync(LEDGER, k.pid + '\n'); fs.writeFileSync('/tmp/_reel_last_music', musik);
    gitPush([CSV, LEDGER, KEINVIDEO], `Reel-Queue: ${k.pid} ready`);
    made++; console.log(`   ✅ Reel ${made}/${BATCH} → queue (${url.slice(-40)})`);
  } catch (e) { console.log('   Fehler:', String(e.message || e).slice(0, 120)); }
  finally { fs.rmSync(src, { force: true }); fs.rmSync(out, { force: true }); }
}
if (!DRY && fs.existsSync(KEINVIDEO)) gitPush([KEINVIDEO], 'Reel-Motor: kein-Video-Ledger');
console.log(`FERTIG. neue Reels: ${made} | CJ gefragt: ${gefragt} | Kandidaten: ${kand.length}`);
