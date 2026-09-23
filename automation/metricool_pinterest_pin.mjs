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
 */
import fs from 'node:fs';
import { lock as postLock, seen as postSeen, mark as postMark } from './post_guard.mjs';

const DRY = process.env.DRY === '1';
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

const QUELLEN = ['hype-jetzt', 'bestseller', 'neu-eingetroffen', 'weihnachten-2026', 'halloween', 'geschenke-unter-50-franken'];
const SPERR = new Set(['nicht-bewerben', 'nur-onlineshop', '18plus', 'raucher', 'erotik', 'kostuem', 'kostüm', 'refurbished',
  'medizinprodukt-pruefen', 'marken-pruefen', 'lizenz-risiko', 'lizenz-nicht-bewerben', 'adult-nicht-bewerben', 'gmc-adult-pull',
  'messer-nicht-bewerben', 'smoke-zubehoer', 'waffe-pruefen', 'verdeckte-ueberwachung', 'google-policy-flag', 'arzneimittel-ohne-zulassung']);
const HEIL = /schmerz|heil|migräne|krampfader|fettverbrenn|abnehmen|cellulite|arthr|rheuma|diabetes|entgift|detox|blutdruck|haarausfall|schnarch|inkontinenz/i;
// Board-Zuordnung: erstes passendes Muster gewinnt (Reihenfolge = Spezifität).
const BOARDS = [
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

const gepinnt = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(z => z.split('\t')[1]).filter(Boolean) : []);
const text = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

let kandidat = null;
for (const quelle of QUELLEN) {
  const d = await gql(`query($h:String!,$p:ID!){ collectionByHandle(handle:$h){ products(first:100, sortKey:BEST_SELLING){ nodes{
    id handle title productType tags status onlineStoreUrl descriptionHtml publishedOnPublication(publicationId:$p)
    priceRangeV2{ minVariantPrice{ amount } } images(first:2){ nodes{ url width height } } } } } }`, { h: quelle, p: PINTEREST_PUB });
  const ns = d.data.collectionByHandle?.products?.nodes || [];
  for (const p of ns) {
    const tags = p.tags.map(t => t.toLowerCase());
    const bild = p.images.nodes[0];
    const grund = p.status !== 'ACTIVE' ? 'nicht aktiv' : !p.onlineStoreUrl ? 'nicht im Onlineshop' : !p.publishedOnPublication ? 'nicht im Pinterest-Kanal'
      : p.images.nodes.length < 2 ? '<2 Bilder' : parseFloat(p.priceRangeV2.minVariantPrice.amount) < 19 ? 'unter CHF 19'
      : tags.some(t => SPERR.has(t)) ? 'Sperr-Tag' : HEIL.test(p.title) ? 'Heilwort im Titel'
      : gepinnt.has(p.handle) ? 'schon gepinnt' : postSeen(bild.url) ? 'Bild schon gepostet' : (bild.width && bild.width < 600) ? 'Bild zu klein' : '';
    if (!grund) { kandidat = { ...p, bild, quelle }; break; }
  }
  if (kandidat) break;
}
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
console.log(`Pin: ${titel}\n  Quelle: ${kandidat.quelle} · Board: ${board ? board.name : boardName + ' (?)'} · ${preis}\n  Link: ${link}\n  Bild: ${kandidat.bild.url.slice(0, 90)}\n  Text: ${beschreibung.slice(0, 140)}…`);
if (DRY) { console.log('[DRY] würde jetzt pinnen.'); process.exit(0); }
if (!board) { console.error('⛔ Kein Pinterest-Board lesbar'); process.exit(1); }

const wann = new Date(Date.now() + VORLAUF * 60000);
const f = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(wann).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
const dateTime = `${f.year}-${f.month}-${f.day}T${f.hour === '24' ? '00' : f.hour}:${f.minute}:${f.second}`;
const release = postLock(20);
try {
  const n = await mc(`/actions/normalize/image/url?url=${encodeURIComponent(kandidat.bild.url)}`);
  const norm = typeof n === 'string' ? n.replace(/^"|"$/g, '') : (n.data?.url || n.url || (typeof n.data === 'string' ? n.data : ''));
  if (!norm) throw new Error('normalize: keine URL');
  const body = { publicationDate: { dateTime, timezone: TZ }, text: beschreibung, providers: [{ network: 'pinterest' }], media: [norm],
    autoPublish: true, draft: false, shortener: false,
    pinterestData: { boardId: board.id, pinTitle: titel, pinLink: link, pinNewFormat: true } };
  const r = await mc('/v2/scheduler/posts', { method: 'POST', body: JSON.stringify(body) });
  const pid = String(r?.data?.id || r?.id || '');
  postMark(kandidat.bild.url);
  fs.appendFileSync(LEDGER, `${new Date().toISOString()}\t${kandidat.handle}\t${board.name}\tmetricool:${pid}\t${kandidat.quelle}\n`);
  console.log(`✅ Pin geplant (${dateTime} ${TZ}) auf «${board.name}», Metricool-Post ${pid || '?'}`);
} catch (e) { console.error('✗ Pin fehlgeschlagen:', String(e.message || e)); process.exit(1); }
finally { release(); }
