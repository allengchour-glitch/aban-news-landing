#!/usr/bin/env node
/* metricool_pinterest_pin.mjs — setzt GENAU EINEN Produkt-Pin über Metricool auf Pinterest.
 *
 * Warum (23.09.2026, Betreiber «metricool maximal nutzen»): Metricool hat Pinterest (luxestyleCH, 15 Boards)
 * verbunden, gepinnt wurde bisher nur über den Browser-Agenten auf dem Server — und der steht seit 22.09.
 * 21:03 still. Pinterest ist nach Google der zweitbeste Besucherkanal (71 Sitzungen/30 T), und ein Pin
 * verlinkt direkt aufs Produkt (anders als IG/TikTok «Link in Bio»).
 *
 * Auswahl: aktive, im Pinterest-Kanal publizierte Produkte aus den Verkaufs-Reihen (Trend, Bestbewertet,
 * Neu, Saison), ≥2 Bilder, ab CHF 19, ohne Sperr-Tag, ohne Heilversprechen-Wort, noch nie gepinnt
 * (Ledger dropship/_pinterest_pins.txt) und Hauptbild noch nirgends gepostet (post_guard seen()).
 * Board nach Warengruppe (Titel/Typ), Fallback «Geschenkideen Schweiz». Link mit UTM, damit Shopify
 * die Besuche Pinterest/Metricool zuordnet.
 * ENV: METRICOOL_USER_TOKEN (oder /tmp/metricool.env) · DRY=1 · VORLAUF_MIN (10)
 *      NUR_LISTE=n → druckt die nächsten n Kandidaten-Handles (eine Zeile je Handle) und endet, ohne zu pinnen —
 *      für `python3 automation/bild_formate.py $(NUR_LISTE=3 node automation/metricool_pinterest_pin.mjs)`.
 *      PIN_BRANCH (claude/luxestyle-status-tztnn1) = Zweig, auf dem social/pins/ öffentlich liegt.
 *
 * 23.09.2026 abends (Paket «bildformate»), GEMESSEN:
 *  - DOPPEL-PIN: «Interaktives Katzenspielzeug» steht ZWEIMAL auf Pinterest — 22.09. 14:57 vom Hetzner-Agenten
 *    (Quittung auftraege/erledigt/pinterest-pin-2026-09-22-5.json), 23.09. 18:55 von diesem Skript (Metricool
 *    380861865, PUBLISHED). Dieses Skript kannte nur sein eigenes Ledger. Jetzt zählt als «schon gepinnt»:
 *    eigenes Ledger ∪ Hetzner-Quittungen ∪ PLATTFORM (Metricool getPins 365 T + geplante Pins ±30 T).
 *    Ist die Plattform nicht lesbar, wird NICHT gepinnt (Plattform-Wahrheit schlägt jeden Ledger).
 *  - FORMAT: 138 Pins seit Juni, 0 im Pinterest-Format 2:3; Bild-Pins 1:1 → 5.1 Impressionen/Pin (76),
 *    4:5 → 14.0 (27). Jetzt nimmt der Pin die 2:3-Fassung aus automation/bild_formate.py (social/pins/<handle>.jpg),
 *    wenn (a) das Manifest social/pins/_index.tsv denselben Preis und dasselbe Hauptbild wie der Shop jetzt trägt,
 *    (b) die raw-URL HTTP 200 liefert und (c) ihre SHA-1 dem Manifest entspricht (= gepusht). Sonst Rohbild wie bisher.
 *  - BOARD: Haustier-Ware landete mangels Board in «Geschenkideen Schweiz». Zuordnung «Hund & Katze» steht bereit
 *    und greift, sobald das Board existiert (Anlegen = Betreiber-/Hauptagent-Entscheid, API kann es:
 *    POST /v2/scheduler/boards/pinterest).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { lock as postLock, seen as postSeen, mark as postMark } from './post_guard.mjs';

const NUR_LISTE = parseInt(process.env.NUR_LISTE || '0', 10);
const DRY = process.env.DRY === '1' || NUR_LISTE > 0;
const PIN_BRANCH = process.env.PIN_BRANCH || 'claude/luxestyle-status-tztnn1';
// PIN_RAW_BASE / PIN_INDEX nur für Tests (lokaler Server, Manifest-Kopie) — im Betrieb nie setzen.
const RAW_PINS = process.env.PIN_RAW_BASE || `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/${PIN_BRANCH}/social/pins/`;
const PIN_INDEX = process.env.PIN_INDEX || 'social/pins/_index.tsv';
const HETZNER_QUITTUNGEN = 'auftraege/erledigt';
const HAUSTIER_BOARD = 'Hund & Katze';
const log = (...a) => { if (!NUR_LISTE) console.log(...a); };
const tokenLesen = () => { if (process.env.METRICOOL_USER_TOKEN) return process.env.METRICOOL_USER_TOKEN.trim();
  try { const m = /METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(fs.readFileSync('/tmp/metricool.env', 'utf8')); if (m) return m[1]; } catch {} return ''; };
const TOKEN = tokenLesen();
const USER = process.env.METRICOOL_USER_ID || '4801419', BLOG = process.env.METRICOOL_BLOG_ID || '6227837';
const TZ = 'Europe/Zurich', BASE = 'https://app.metricool.com/api';
const VORLAUF = parseInt(process.env.VORLAUF_MIN || '10', 10);
const LEDGER = 'dropship/_pinterest_pins.txt';
const PINTEREST_PUB = 'gid://shopify/Publication/302994456961';
const SHOP = 'au3j0y-hq.myshopify.com';
const SHOPTOK = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
if (!TOKEN && !DRY) { console.log('Kein METRICOOL_USER_TOKEN → No-op.'); process.exit(0); }
if (!SHOPTOK) { console.log('Kein Shop-Token → No-op.'); process.exit(0); }

// 23.09.2026 (Halloween-Auftritt): NUR_QUELLE=<handle> beschraenkt auf EINE Kollektion; dropship/_pinterest_vorrang.txt
// (Zeilen «handle<TAB>JJJJ-MM-TT») stellt Saison-Kollektionen bis zum Datum NACH VORN — sonst kaeme Halloween erst dran,
// wenn hype-jetzt/bestseller/neu erschoepft sind (5. Stelle), also nie vor dem 31.10. Die Datei ist eine Queue, kein Post.
const VORRANG = 'dropship/_pinterest_vorrang.txt';
const STANDARD_QUELLEN = ['hype-jetzt', 'bestseller', 'neu-eingetroffen', 'weihnachten-2026', 'halloween', 'geschenke-unter-50-franken'];
const heute = new Date().toISOString().slice(0, 10);
const vorrang = fs.existsSync(VORRANG) ? fs.readFileSync(VORRANG, 'utf8').split('\n').map(z => z.split('\t')).filter(([h, bis]) => h && (!bis || bis.trim() >= heute)).map(([h]) => h.trim()) : [];
const QUELLEN = process.env.NUR_QUELLE ? [process.env.NUR_QUELLE] : [...vorrang, ...STANDARD_QUELLEN.filter(q => !vorrang.includes(q))];
// Ein Produkt, das schon als IG-/TikTok-Karussell laeuft, wird nicht zusaetzlich gepinnt (Regel 10: nie dasselbe Produkt
// zweimal, auch nicht plattformuebergreifend). Beide Ledger tragen «handle<TAB>slug<TAB>modus».
const karussellHandles = new Set(['dropship/_ig_karussell.txt', 'dropship/_tiktok_karussell.txt'].flatMap(f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map(z => z.split('\t')[0].trim()).filter(Boolean) : []));
const SPERR = new Set(['nicht-bewerben', 'nur-onlineshop', '18plus', 'raucher', 'erotik', 'kostuem', 'kostüm', 'refurbished',
  'medizinprodukt-pruefen', 'marken-pruefen', 'lizenz-risiko', 'lizenz-nicht-bewerben', 'adult-nicht-bewerben', 'gmc-adult-pull',
  'messer-nicht-bewerben', 'smoke-zubehoer', 'waffe-pruefen', 'verdeckte-ueberwachung', 'google-policy-flag', 'arzneimittel-ohne-zulassung']);
const HEIL = /schmerz|heil|migräne|krampfader|fettverbrenn|abnehmen|cellulite|arthr|rheuma|diabetes|entgift|detox|blutdruck|haarausfall|schnarch|inkontinenz/i;
// Board-Zuordnung: erstes passendes Muster gewinnt (Reihenfolge = Spezifität).
const BOARDS = [
  // Haustier zuerst (sonst «Hundekissen» → Schlaf, «Katzenspielzeug» → Geschenk). Fallen: «Katzenauge»-Brille,
  // «Hundert», Schmuck-«Halsband» (Choker) — deshalb kein nacktes /katz|hund|halsband/.
  [/\bhund(?!ert)|\bkatze(?!n?aug)|haustier|heimtier|welpe|kätzchen|kratzbaum|futterspender|napf\b|hundeleine|katzenklo/i, HAUSTIER_BOARD],
  [/herren|männer/i, 'Herrenmode Schweiz'],
  [/kette|ohrring|armband|armreif|\bring\b|schmuck|anhänger|uhr\b|uhren/i, 'Schmuck & Accessoires'],
  [/(?<!hand)schuh|sandal|sneaker|stiefel|loafer|pumps|boots?\b/i, 'Schuhe & Sandalen'],
  [/kleid|bluse|\brock\b|damen|jumpsuit|top\b/i, 'Sommerkleider & Damenmode 2026'],
  [/leder|geldbörse|portemonnaie|tasche|gürtel|rucksack|wallet/i, 'Leder & Accessoires'],
  [/diffuser|aroma|schlaf|kissen|kerze|duft/i, 'Schlaf & Aromatherapie'],
  [/beauty|pflege|haar|nagel|make-?up|wimper|gua|jade|kosmetik|lippen/i, 'Beauty & Pflege'],
  [/massage|wellness|yoga|entspann|sauna/i, 'Wellness & Self-Care'],
  [/küche|koch|pfanne|topf|tasse|becher|grill|messbecher|gemüse|backen|matcha|kaffee|\btee\b/i, 'Küche & Genuss'],
  [/lampe|licht|deko|vase|organizer|aufbewahrung|regal|teppich|wohn/i, 'Wohnen & Deko'],
  [/gadget|beamer|projektor|lautsprecher|kopfhörer|ladegerät|ladestation|kabel|smart|kamera|drohne|usb|bluetooth/i, 'Tech & Gadgets'],
];

async function gql(query, variables = {}) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST',
        headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
      const d = await r.json();
      if (d.data) return d;
      if (!JSON.stringify(d.errors || '').includes('THROTTLED')) throw new Error(JSON.stringify(d.errors).slice(0, 200));
    } catch (e) { if (a === 3) throw e; }
    await new Promise(r => setTimeout(r, 3000 * (a + 1)));
  }
  throw new Error('Shopify antwortet nicht');
}
const mc = async (pfad, opt = {}) => {
  const r = await fetch(`${BASE}${pfad}${pfad.includes('?') ? '&' : '?'}userId=${USER}&blogId=${BLOG}`, { ...opt, headers: { 'X-Mc-Auth': TOKEN, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const t = await r.text(); if (!r.ok) throw new Error(`${pfad.split('?')[0]} ${r.status}: ${t.slice(0, 200)}`); try { return JSON.parse(t); } catch { return t; }
};

// ---- «schon gepinnt» aus DREI Quellen (Doppel-Pin Katzenspielzeug 22./23.09.) --------------------------
const handleAusLink = l => { const m = /\/products\/([^/?#\s]+)/.exec(String(l || '')); try { return m ? decodeURIComponent(m[1]).toLowerCase() : ''; } catch { return m ? m[1].toLowerCase() : ''; } };
const zeitStempel = d => d.toISOString().slice(0, 19);
const gepinnt = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(z => z.split('\t')[1]).filter(Boolean) : []);
const nLedger = gepinnt.size;
let nHetzner = 0;
try {
  for (const f of fs.readdirSync(HETZNER_QUITTUNGEN).filter(f => /^pinterest-pin-.*\.json$/.test(f))) {
    try { for (const h of (JSON.parse(fs.readFileSync(`${HETZNER_QUITTUNGEN}/${f}`, 'utf8')).ergebnis?.gepinnt || [])) { const k = typeof h === 'string' ? h : h?.handle; if (k && !gepinnt.has(k)) { gepinnt.add(k); nHetzner++; } } } catch {}
  }
} catch {}
let nPlattform = 0, plattformOk = false;
if (TOKEN) {
  try {
    const jetzt = new Date(), vor = new Date(Date.now() - 365 * 864e5), bald = new Date(Date.now() + 30 * 864e5), vorkurz = new Date(Date.now() - 30 * 864e5);
    const pins = (await mc(`/v2/analytics/posts/pinterest?from=${zeitStempel(vor)}&to=${zeitStempel(new Date(jetzt.getTime() + 864e5))}&timezone=${encodeURIComponent(TZ)}`)).data || [];
    const geplant = ((await mc(`/v2/scheduler/posts?start=${zeitStempel(vorkurz)}&end=${zeitStempel(bald)}&timezone=${encodeURIComponent(TZ)}`)).data || [])
      .filter(p => (p.providers || []).some(x => x.network === 'pinterest') && !(p.providers || []).every(x => /ERROR|FAIL/i.test(x.status || '')));
    const vorher = gepinnt.size;
    for (const l of [...pins.map(p => p.link), ...geplant.map(p => p.pinterestData?.pinLink)]) { const h = handleAusLink(l); if (h) gepinnt.add(h); }
    nPlattform = gepinnt.size - vorher; plattformOk = true;
    log(`Schon gepinnt: Ledger ${nLedger} · Hetzner-Quittungen +${nHetzner} · Plattform ${pins.length} Pins + ${geplant.length} geplant → +${nPlattform} · zusammen ${gepinnt.size} Handles`);
  } catch (e) { console.error('⚠ Pinterest-Bestand über Metricool nicht lesbar:', String(e.message || e).slice(0, 160)); }
}
if (process.env.PRUEF_HANDLE) {  // Kanarienvogel: PRUEF_HANDLE=<handle> DRY=1 → sagt, ob der Handle als gepinnt gilt
  const h = process.env.PRUEF_HANDLE.toLowerCase();
  console.log(`PRUEF_HANDLE ${h}: ${gepinnt.has(h) ? 'GILT ALS GEPINNT' : 'nicht gepinnt'} (Plattform ${plattformOk ? 'gelesen' : 'NICHT gelesen'})`);
  process.exit(0);
}
if (!plattformOk) {
  if (!DRY) { console.error('⛔ Ohne Plattform-Bestand kein Pin (Doppel-Pin-Schutz).'); process.exit(1); }
  log(`[DRY] Plattform nicht gelesen — nur Ledger ${nLedger} + Hetzner +${nHetzner}.`);
}
const text = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// ---- 2:3-Fassung aus automation/bild_formate.py (nur wenn Preis + Hauptbild noch stimmen und gepusht) ----
const pinIndex = (() => {
  const m = new Map();
  try {
    const [kopf, ...zeilen] = fs.readFileSync(PIN_INDEX, 'utf8').split('\n').filter(Boolean);
    const sp = kopf.split('\t');
    for (const z of zeilen) { const w = z.split('\t'); const r = Object.fromEntries(sp.map((k, i) => [k, w[i] || ''])); m.set(`${r.name}\t${r.format}`, r); }
  } catch {}
  return m;
})();
async function pinFassung(k) {
  const roh = { url: k.bild.url, art: 'Rohbild' };
  const m = pinIndex.get(`${k.handle}\tpin`);
  if (!m) return { ...roh, grund: 'keine 2:3-Fassung im Manifest' };
  const min = parseFloat(k.priceRangeV2.minVariantPrice.amount).toFixed(2), max = parseFloat(k.priceRangeV2.maxVariantPrice.amount).toFixed(2);
  if (m.preis_min !== min || m.preis_max !== max) return { ...roh, grund: `Preis im Bild ${m.preis_text} ≠ Shop ${min}/${max} → neu rendern` };
  if (m.bild !== k.bild.url.split('?')[0]) return { ...roh, grund: 'Hauptbild seit dem Rendern getauscht → neu rendern' };
  const url = `${RAW_PINS}${m.datei}?v=${m.sha1}`;
  try {
    const r = await fetch(url);
    if (r.status !== 200) return { ...roh, grund: `raw HTTP ${r.status} (noch nicht gepusht?)` };
    const sha = crypto.createHash('sha1').update(Buffer.from(await r.arrayBuffer())).digest('hex').slice(0, 16);
    if (sha !== m.sha1) return { ...roh, grund: 'raw-Stand ≠ Manifest (Push ausstehend)' };
    return { url, art: '2:3-Fassung', grund: `${m.preis_text}, ${m.kb} KB, ${m.erstellt}` };
  } catch (e) { return { ...roh, grund: `raw nicht erreichbar (${String(e.message || e).slice(0, 60)})` }; }
}

const kandidaten = [];
const ZIEL = Math.max(1, NUR_LISTE);
for (const quelle of QUELLEN) {
  const d = await gql(`query($h:String!,$p:ID!){ collectionByHandle(handle:$h){ products(first:100, sortKey:BEST_SELLING){ nodes{
    id handle title productType tags status onlineStoreUrl descriptionHtml publishedOnPublication(publicationId:$p)
    priceRangeV2{ minVariantPrice{ amount } maxVariantPrice{ amount } } images(first:2){ nodes{ url width height } } } } } }`, { h: quelle, p: PINTEREST_PUB });
  const ns = d.data.collectionByHandle?.products?.nodes || [];
  for (const p of ns) {
    const tags = p.tags.map(t => t.toLowerCase());
    const bild = p.images.nodes[0];
    const grund = p.status !== 'ACTIVE' ? 'nicht aktiv' : !p.onlineStoreUrl ? 'nicht im Onlineshop' : !p.publishedOnPublication ? 'nicht im Pinterest-Kanal'
      : p.images.nodes.length < 2 ? '<2 Bilder' : parseFloat(p.priceRangeV2.minVariantPrice.amount) < 19 ? 'unter CHF 19'
      : tags.some(t => SPERR.has(t)) ? 'Sperr-Tag' : HEIL.test(p.title) ? 'Heilwort im Titel'
      : gepinnt.has(p.handle) ? 'schon gepinnt' : karussellHandles.has(p.handle) ? 'schon als Karussell beworben' : postSeen(bild.url) ? 'Bild schon gepostet'
      : (bild.width && Math.min(bild.width, bild.height || bild.width) < 600) ? 'Bild zu klein'
      : kandidaten.some(k => k.handle === p.handle) ? 'doppelt in Quellen' : '';
    if (!grund) { kandidaten.push({ ...p, bild, quelle }); if (kandidaten.length >= ZIEL) break; }
  }
  if (kandidaten.length >= ZIEL) break;
}
if (NUR_LISTE) { for (const k of kandidaten) console.log(k.handle); process.exit(0); }
if (vorrang.length) log(`Vorrang-Quellen (${VORRANG}): ${vorrang.join(', ')}`);
const kandidat = kandidaten[0];
if (!kandidat) { console.log('Kein Pin-Kandidat (alle Quellen erschöpft oder gesperrt).'); process.exit(0); }

const suchtext = `${kandidat.title} ${kandidat.productType}`;
const boardName = (BOARDS.find(([rx]) => rx.test(suchtext)) || [null, 'Geschenkideen Schweiz'])[1];
const boards = DRY && !TOKEN ? [] : (await mc('/v2/scheduler/boards/pinterest?brandId=' + BLOG)).data || [];
const board = boards.find(b => b.name === boardName) || boards.find(b => b.name === 'Geschenkideen Schweiz');
const preis = `CHF ${parseFloat(kandidat.priceRangeV2.minVariantPrice.amount).toFixed(2)}`;
const saetze = text(kandidat.descriptionHtml).split(/(?<=[.!?])\s+/).filter(s => s.length > 25 && !HEIL.test(s) && !/vergriffen|Sommer 2026|Premium-Liebling/i.test(s));
const beschreibung = `${(saetze.slice(0, 2).join(' ') || kandidat.title).slice(0, 330)}\n\n${preis} · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Kleiner Schweizer Shop 🇨🇭`.slice(0, 480);
const link = `${kandidat.onlineStoreUrl}?utm_source=pinterest&utm_medium=social&utm_campaign=metricool_pin`;
const titel = kandidat.title.slice(0, 100);
const fassung = await pinFassung(kandidat);
console.log(`Pin: ${titel}\n  Quelle: ${kandidat.quelle} · Board: ${board ? board.name : boardName + ' (?)'}${board && board.name !== boardName ? ` (gewünscht «${boardName}», fehlt → Fallback)` : ''} · ${preis}\n  Link: ${link}\n  Bild: ${fassung.art} ${fassung.url.slice(0, 110)}\n        (${fassung.grund})\n  Text: ${beschreibung.slice(0, 140)}…`);
if (DRY) { console.log('[DRY] würde jetzt pinnen.'); process.exit(0); }
if (!board) { console.error('⛔ Kein Pinterest-Board lesbar'); process.exit(1); }

const wann = new Date(Date.now() + VORLAUF * 60000);
const f = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(wann).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
const dateTime = `${f.year}-${f.month}-${f.day}T${f.hour === '24' ? '00' : f.hour}:${f.minute}:${f.second}`;
const release = postLock(20);
try {
  const n = await mc(`/actions/normalize/image/url?url=${encodeURIComponent(fassung.url)}`);
  const norm = typeof n === 'string' ? n.replace(/^"|"$/g, '') : (n.data?.url || n.url || (typeof n.data === 'string' ? n.data : ''));
  if (!norm) throw new Error('normalize: keine URL');
  const body = { publicationDate: { dateTime, timezone: TZ }, text: beschreibung, providers: [{ network: 'pinterest' }], media: [norm],
    autoPublish: true, draft: false, shortener: false,
    pinterestData: { boardId: board.id, pinTitle: titel, pinLink: link, pinNewFormat: true } };
  const r = await mc('/v2/scheduler/posts', { method: 'POST', body: JSON.stringify(body) });
  const pid = String(r?.data?.id || r?.id || '');
  postMark(kandidat.bild.url);
  fs.appendFileSync(LEDGER, `${new Date().toISOString()}\t${kandidat.handle}\t${board.name}\tmetricool:${pid}\t${kandidat.quelle}\t${fassung.art === '2:3-Fassung' ? 'bild=2:3' : 'bild=roh'}\n`);
  console.log(`✅ Pin geplant (${dateTime} ${TZ}) auf «${board.name}», Metricool-Post ${pid || '?'}, ${fassung.art}`);
} catch (e) { console.error('✗ Pin fehlgeschlagen:', String(e.message || e)); process.exit(1); }
finally { release(); }
