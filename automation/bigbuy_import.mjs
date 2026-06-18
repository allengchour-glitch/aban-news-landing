#!/usr/bin/env node
/* LuxeStyle — bigbuy_import.mjs  (NEUE Lieferantenfirma BigBuy → nur TOP-Produkte importieren)
 *
 * Holt aus dem BigBuy-Katalog (EU-Lager, DDP-fähig) kuratierte TOP-Produkte für on-brand Kategorien
 * (Schmuck/Taschen/Uhren/Sonnenbrillen/Damenmode), prüft Bilder (HTTP-200), legt sie sauber als Shopify-
 * Produkte an (ACTIVE, DE-Titel via Gemini, gesunde CHF-Marge, Tags+SEO), publiziert in alle Kanäle und
 * sortiert sie in Smart-Collections. Idempotent (Ledger). No-op ohne Creds. DRY_RUN ist DEFAULT.
 *
 * ── API VERIFIZIERT 2026-06-15 (Prod-Key, live geprüft):
 *    base = https://api.bigbuy.eu (PROD; Sandbox-Key liefert dieser Account NICHT) · Auth: Bearer <BIGBUY_API_KEY>
 *    Kandidatenquelle: GET /rest/catalog/productsinformation.json?isoCode=de → [{id, sku, name, description}]
 *    Preis/aktiv:      GET /rest/catalog/product/{id}.json?isoCode=de → {wholesalePrice, retailPrice, active, taxonomy, categories[]}
 *    Bilder:           GET /rest/catalog/productimages/{id}.json → {id, images:[{url, isCover, ...}]}
 *    ⚠️ Rate-Limit ist STRENG (Body „You exceeded the rate limit") → Backoff + Pausen zwischen Calls (eingebaut).
 *    Hinweis: productsinformation.json ist der Voll-Katalog (gross) → einmal laden + im Speicher filtern.
 *
 * DRY_RUN ist Default → nur suchen + Kandidaten listen (nichts in Shopify anlegen). LIVE=1 zum Anlegen.
 * ENV: BIGBUY_API_KEY · [BIGBUY_ENV=prod|sandbox] (Default prod) ·
 *      SHOPIFY_CLIENT_ID/SECRET (o. SHOPIFY_ADMIN_TOKEN), SHOPIFY_SHOP · [GEMINI_API_KEY] ·
 *      [CATS=schmuck,taschen,uhren,sonnenbrillen] · [PER=4] · [MARGIN=2.6] · [MAX_COST_EUR=60] · [LIVE=1]
 */
import fs from 'node:fs';

const BB_KEY = (process.env.BIGBUY_API_KEY || '').trim();
const BB_BASE = (process.env.BIGBUY_ENV || 'prod').toLowerCase() === 'sandbox'
  ? 'https://api.sandbox.bigbuy.eu' : 'https://api.bigbuy.eu';
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const LEDGER = 'dropship/bigbuy_done.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PER = Math.max(1, parseInt(process.env.PER || '4', 10) || 4);
const MARGIN = parseFloat(process.env.MARGIN || '2.6') || 2.6;     // auf wholesalePrice (EU-Einkauf)
const EUR_CHF = 0.96;
const MAX_COST_EUR = parseFloat(process.env.MAX_COST_EUR || '60') || 60; // Einkaufs-Deckel je Stück
const GAP = parseInt(process.env.GAP || '1500', 10) || 1500;       // Pause zwischen BigBuy-Calls (Rate-Limit)
const DRY = process.env.LIVE !== '1';                              // DRY ist Default
const CATS = (process.env.CATS || 'schmuck,taschen,uhren,sonnenbrillen').split(',').map(s => s.trim()).filter(Boolean);

/* On-brand TOP-Kategorien. `anchor` = Namens-Anker (DE/EN/ES) gegen den DE-Produktnamen aus productsinformation. */
const CONFIG = {
  schmuck: { coll: { handle: 'premium-schmuck', title: '💎 Premium Schmuck', tag: 'schmuck' },
    extraTags: ['damen', 'geschenk', 'premium'], type: 'Schmuck', maxCost: MAX_COST_EUR,
    anchor: ['halskette', 'kette', 'armband', 'ohrring', 'ohrstecker', 'ring ', 'anhänger', 'armreif', 'collier',
             'jewel', 'necklace', 'bracelet', 'earring', 'pendant', 'collar', 'pulsera', 'anillo', 'pendiente'],
    ban: ['spielzeug', 'kinder', 'aufkleber', 'toy', 'kids', 'child', 'sticker', 'handyhülle', 'case', 'usb', 'pendrive', 'stick', 'schlüsselbund', 'datenträger', 'speicher', 'hundehalsband'],
    bullets: ['Edles Design für jeden Anlass', 'Hochwertige Verarbeitung', 'Schöne Geschenkidee', 'Hautfreundliche Materialien'] },
  taschen: { coll: { handle: 'sub-taschen', title: '👜 Taschen', tag: 'tasche' },
    extraTags: ['damen', 'accessoire', 'premium'], type: 'Taschen', maxCost: MAX_COST_EUR,
    anchor: ['handtasche', 'tasche', 'umhängetasche', 'schultertasche', 'clutch', 'shopper', 'rucksack',
             'handbag', 'bag', 'tote', 'crossbody', 'bolso'],
    ban: ['müll', 'staubsauger', 'werkzeug', 'schlafsack', 'trash', 'vacuum', 'tool bag', 'sleeping bag', 'kosmetiktasche klein', 'laptop', 'notebook', 'tablet', 'ngs', 'leinwand', 'beamer', 'stativ', 'projektor', 'computer', 'pc-', 'kamera'],
    bullets: ['Vielseitig kombinierbar', 'Hochwertiges Material', 'Durchdachte Fächer', 'Eleganter Begleiter für jeden Tag'] },
  uhren: { coll: { handle: 'uhren', title: '⌚ Uhren', tag: 'uhren' },
    extraTags: ['accessoire', 'geschenk', 'premium'], type: 'Uhren', maxCost: MAX_COST_EUR,
    anchor: ['armbanduhr', 'uhr', 'watch', 'reloj', 'timepiece'],
    ban: ['wanduhr', 'wecker', 'küchen', 'kinder', 'spielzeug', 'wall clock', 'kids watch', 'toy'],
    bullets: ['Zeitloses Design', 'Präzises Uhrwerk', 'Edles Geschenk', 'Für Business & Freizeit'] },
  sonnenbrillen: { coll: { handle: 'sonnenbrillen-eyewear', title: '🕶️ Sonnenbrillen', tag: 'sonnenbrille' },
    extraTags: ['accessoire', 'sommer', 'damen'], type: 'Sonnenbrillen', maxCost: MAX_COST_EUR,
    anchor: ['sonnenbrille', 'sunglass', 'gafas de sol', 'eyewear'],
    ban: ['lesebrille', 'schutzbrille', 'kinder', 'reading glasses', 'safety glasses', 'kids'],
    bullets: ['UV-Schutz', 'Trendiges Design', 'Leichter Tragekomfort', 'Inkl. Etui'] },
  damenmode: { coll: { handle: 'damen-mode', title: '👗 Damen-Mode', tag: 'damen' },
    extraTags: ['sommer-2026', 'kleid', 'premium'], type: 'Damenmode', maxCost: MAX_COST_EUR,
    anchor: ['damenkleid', 'sommerkleid', 'maxikleid', 'midikleid', 'kleid ', 'bluse', 'damenrock', 'rock ', 'jumpsuit', 'tunika', 'damen-shirt', 'damenshirt', 'dress', 'blouse', 'skirt', 'vestido', 'falda'],
    ban: ['herren', 'kinder', 'baby', 'men ', 'kids', 'uhr', 'sonnenbrille', 'brille', 'ring ', 'kette', 'armband', 'ohrring', 'tasche', 'rucksack', 'schuh', 'parfum', 'geldbörse', 'portemonnaie', 'kostüm', 'karneval', 'disney', 'minnie', 'mickey', 'mouse', 'wonder woman', 'superman', 'spiderman', 'batman', 'marvel', 'princess', 'prinzessin', 'cosplay', 'seven til midnight', 'dessous', 'lingerie', 'negligee', 'body '],
    bullets: ['Femininer Schnitt', 'Angenehmer Stoff', 'Vielseitig kombinierbar', 'Premium-Look zum fairen Preis'] },
  parfum: { coll: { handle: 'parfum-duefte', title: '🌸 Parfum & Düfte', tag: 'parfum' },
    extraTags: ['beauty', 'geschenk', 'premium'], type: 'Parfum', maxCost: MAX_COST_EUR,
    anchor: ['eau de parfum', 'eau de toilette', 'parfum', 'cologne', 'fragrance', 'perfume', 'duftset'],
    ban: ['kinder', 'spielzeug', 'raumduft', 'diffuser', 'auto', 'lufterfrischer', 'nachfüll', 'kerze', 'duftkerze', 'waschmittel', 'deo ', 'roll-on', 'handschuh', 'gloves', 'seife', 'lotion', 'creme', 'slime', 'spielschleim', 'toys', 'dr. tree', 'empfindliche haut'],
    bullets: ['Original-Markenduft', 'Lang anhaltende Sillage', 'Edles Geschenk', '100% Original, schnelle EU-Lieferung'] },
  lederwaren: { coll: { handle: 'lederwaren', title: '👝 Leder & Accessoires', tag: 'leder' },
    extraTags: ['accessoire', 'geschenk', 'premium'], type: 'Lederwaren', maxCost: MAX_COST_EUR,
    anchor: ['geldbörse', 'geldbeutel', 'portemonnaie', 'brieftasche', 'kartenetui', 'ledergürtel', 'gürtel leder', 'wallet', 'leather belt'],
    ban: ['kinder', 'spielzeug', 'auto', 'hund', 'werkzeug', 'koffer', 'laptop', 'notebook', 'dkd', 'blackfit8', 'safta', 'handyhülle', 'home decor', 'aluminium', 'glow up', 'mariposa'],
    bullets: ['Hochwertiges Leder-Feeling', 'Kompakt & alltagstauglich', 'Edles Geschenk', 'Schnelle EU-Lieferung'] },
  sets: { coll: { handle: 'trainingsanzuege-sets', title: '🏃 Trainingsanzüge & Sets', tag: 'set' },
    extraTags: ['sport', 'set', 'marke', 'premium'], type: 'Set', maxCost: MAX_COST_EUR, sized: true,
    anchor: ['trainingsanzug', 'chándal', 'chandal', 'jogginganzug', 'tracksuit', 'jogging-set', 'sportanzug', 'sweatsuit'],
    ban: ['baby', 'babys', 'kinder', 'mädchen', 'junge', 'jungen', 'paw patrol', 'minnie', 'mickey', 'frozen', 'spiderman', 'disney', 'marvel', 'lol surprise', 'niñ', 'enfant'],
    bullets: ['2-teilig: Oberteil + Hose abgestimmt', 'Marken-Sportswear, EU-Lager', 'Bequem & atmungsaktiv', '100% Original, schnelle EU-Lieferung'] },
  gaming: { coll: { handle: 'gaming', title: '🎮 Gaming', tag: 'gaming' },
    extraTags: ['gaming', 'tech', 'hype-2026', 'geschenk'], type: 'Gaming', maxCost: MAX_COST_EUR,
    anchor: ['gaming', 'controller', 'gamepad', 'headset', 'konsole', 'playstation', 'xbox', 'nintendo', 'gaming-maus', 'gaming maus', 'mechanische tastatur', 'mauspad', 'joystick', 'rgb-'],
    ban: ['kinder', 'spielzeug', 'baby', 'toy', 'aufkleber', 'sticker'],
    bullets: ['Für Gamer gemacht', 'Präzise & reaktionsschnell', 'Modernes RGB-Design', 'Top Preis-Leistung'] },
  anime: { coll: { handle: 'anime-manga', title: '🎌 Anime & Manga', tag: 'anime' },
    extraTags: ['anime', 'geschenk', 'hype-2026', 'sammler'], type: 'Anime', maxCost: MAX_COST_EUR,
    anchor: ['anime', 'manga', 'funko', 'cosplay', 'otaku', 'dragon ball', 'naruto', 'one piece', 'sammelfigur'],
    ban: ['karneval', 'erwachsenenkostüm', 'baby'],
    bullets: ['Für Anime- & Manga-Fans', 'Detailgetreu', 'Tolles Sammler- & Geschenkstück', 'Beliebte Motive'] },
  fishing: { coll: { handle: 'angeln', title: '🎣 Angeln', tag: 'angeln' },
    extraTags: ['angeln', 'outdoor', 'hobby'], type: 'Angelsport', maxCost: MAX_COST_EUR,
    anchor: ['angeln', 'angelrute', 'angelrolle', 'köder', 'wobbler', 'fishing', 'angelschnur', 'angelkoffer'],
    ban: ['kinder', 'spielzeug', 'toy'],
    bullets: ['Für Angler', 'Robust & langlebig', 'Praktisch am Wasser', 'Gutes Preis-Leistungs-Verhältnis'] },
  tauchen: { coll: { handle: 'tauchen-schnorcheln', title: '🤿 Tauchen & Schnorcheln', tag: 'tauchen' },
    extraTags: ['tauchen', 'wassersport', 'sommer'], type: 'Wassersport', maxCost: MAX_COST_EUR,
    anchor: ['tauchen', 'taucher', 'schnorchel', 'tauchmaske', 'neopren', 'diving', 'schwimmbrille', 'tauchflossen'],
    ban: ['kinder', 'aufblasbar', 'schwimmflügel', 'spielzeug', 'hund', 'dog', 'halsband', 'katze', 'haustier', 'pet ', 'leine'],
    bullets: ['Klare Sicht unter Wasser', 'Bequemer, dichter Sitz', 'Robustes Material', 'Für Pool, See & Meer'] },
  metalldetektor: { coll: { handle: 'metalldetektoren-schatzsuche', title: '🔍 Metalldetektoren & Schatzsuche', tag: 'metalldetektor' },
    extraTags: ['metalldetektor', 'outdoor', 'hobby', 'schatzsuche'], type: 'Metalldetektor', maxCost: 130,
    anchor: ['metalldetektor', 'metal detector', 'schatzsuche', 'detektor de metales'],
    ban: ['leitungssucher', 'kabeldetektor', 'wand', 'kinder', 'spielzeug'],
    bullets: ['Für die Schatzsuche', 'Einfache Bedienung', 'Outdoor-tauglich', 'Spannendes Hobby'] },
  velo: { coll: { handle: 'velo-radsport', title: '🚲 Velo & Radsport', tag: 'velo' },
    extraTags: ['velo', 'fahrrad', 'sport', 'outdoor'], type: 'Radsport', maxCost: MAX_COST_EUR,
    anchor: ['fahrradhelm', 'fahrradlicht', 'fahrrad-licht', 'fahrradpumpe', 'fahrradschloss', 'fahrradtasche', 'fahrradcomputer', 'fahrradsattel', 'fahrradklingel', 'rennrad', 'radtrikot', 'radhose', 'velohelm', 'luftpumpe fahrrad', 'multiwerkzeug fahrrad', 'fahrradschlauch'],
    ban: ['dkd', 'deko', 'wanduhr', 'wanddekoration', 'deko-figur', 'figur', 'playmobil', 'fußstütze', 'fussstütze', 'laufschuhe', 'spielzeug', 'kinder', 'dreirad', 'laufrad'],
    bullets: ['Für Velofahrer & Pendler', 'Leicht & funktional', 'Mehr Sicherheit & Komfort', 'Top für Strasse & Trail'] },
  fitness: { coll: { handle: 'fitness-training', title: '💪 Fitness & Training', tag: 'fitness' },
    extraTags: ['fitness', 'sport', 'training', 'wellness'], type: 'Fitness', maxCost: MAX_COST_EUR,
    anchor: ['fitness', 'hantel', 'kurzhantel', 'widerstandsband', 'springseil', 'bauchtrainer', 'faszienrolle', 'klimmzugstange', 'gewichtsmanschette'],
    ban: ['kinder', 'spielzeug'],
    bullets: ['Effektives Training für daheim', 'Robust & rutschfest', 'Platzsparend', 'Für jedes Level'] },
};

// ── Shopify (1:1 aus cj_gaps_import.mjs, bewährt) ──
async function sgql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function sToken() { if (ADMIN_TOKEN && await sWorks(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await sCC(); if (t && await sWorks(t)) return t; } return null; }

// ── BigBuy REST (Bearer-Auth, JSON, verifiziert). Robustes Rate-Limit-Handling ──
async function bbGet(path) {
  for (let a = 0; a < 6; a++) {
    let r;
    try { r = await fetch(`${BB_BASE}${path}`, { headers: { 'Authorization': `Bearer ${BB_KEY}`, 'Accept': 'application/json' } }); }
    catch { await sleep((a + 1) * 4000); continue; }
    const txt = await r.text();
    if (r.status === 429 || /exceeded the rate limit|too many/i.test(txt)) { await sleep((a + 1) * 5000); continue; }
    if (!r.ok) { console.log(`  ⚠️ BigBuy ${path.split('?')[0]} → HTTP ${r.status} ${txt.slice(0, 80)}`); return null; }
    try { return JSON.parse(txt); } catch { return null; }
  }
  console.log(`  ⚠️ BigBuy ${path.split('?')[0]} → Rate-Limit, aufgegeben.`);
  return null;
}
const bbInfoAll = () => bbGet('/rest/catalog/productsinformation.json?isoCode=de'); // [{id,sku,name,description}]
const bbProduct = (id) => bbGet(`/rest/catalog/product/${id}.json?isoCode=de`);     // {wholesalePrice,retailPrice,active,...}
const bbImages = (id) => bbGet(`/rest/catalog/productimages/${id}.json`);           // {id, images:[{url,...}]}
async function img200(u) { try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) return true; const g = await fetch(u); return g.ok; } catch { return false; } }

// ── Gemini Batch-Übersetzung → knackiger DE-Titel (1:1 aus Vorlage) ──
async function titlesDE(names) {
  if (!GKEY || !names.length) return names;
  const prompt = `Mach aus diesen Produktnamen je einen knackigen, verkaufsstarken DEUTSCHEN Shop-Titel `
    + `(max 60 Zeichen, kein Marken-/Wholesale-Wort, mit kurzem Nutzen). Gib NUR ein JSON-Array gleicher Reihenfolge zurück.\n` + JSON.stringify(names);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GKEY)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    const j = await r.json().catch(() => ({}));
    let t = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const arr = JSON.parse(t);
    if (Array.isArray(arr) && arr.length === names.length) return arr.map((s, i) => (s && String(s).trim().slice(0, 70)) || names[i]);
  } catch (e) { console.error('  Titel-Übersetzung fehlgeschlagen:', e.message); }
  return names;
}

const chf = (eur) => { let p = Math.max(9.9, eur * EUR_CHF * MARGIN); return (Math.ceil(p) - 0.1).toFixed(2); };

if (!BB_KEY) { console.log('Kein BIGBUY_API_KEY → No-op (Connector startklar, wartet auf Key).'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

const SET = `mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const PUBQ = `{ publications(first:20){ edges{ node{ id } } } }`;
const PUB = `mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ message } } }`;
const COLL_FIND = `query($q:String!){ collections(first:1, query:$q){ edges{ node{ id handle } } } }`;
const COLL_CREATE = `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle } userErrors{ message } } }`;

(async () => {
  console.log(`BigBuy-Import [${BB_BASE.includes('sandbox') ? 'SANDBOX' : 'PROD'}]${DRY ? ' [DRY — nichts wird angelegt; LIVE=1 zum Anlegen]' : ' [LIVE]'}`);
  const stok = await sToken(); if (!stok) { console.log('Shopify-Auth fehlgeschlagen → No-op.'); process.exit(0); }

  console.log('Lade BigBuy-Katalog (productsinformation, kann gross sein) …');
  const info = await bbInfoAll();
  if (!Array.isArray(info) || !info.length) { console.log('⚠️ Keine productsinformation erhalten (Rate-Limit?) → Abbruch.'); process.exit(0); }
  console.log(`Katalog: ${info.length} Produkte mit DE-Namen.`);

  const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
  const pubs = DRY ? [] : ((await sgql(stok, PUBQ))?.data?.publications?.edges || []).map(e => ({ publicationId: e.node.id }));

  async function ensureColl(cfg) {
    if (DRY) return null;
    const ex = (await sgql(stok, COLL_FIND, { q: `handle:${cfg.coll.handle}` }))?.data?.collections?.edges?.[0]?.node;
    if (ex) return ex.id;
    const r = await sgql(stok, COLL_CREATE, { input: { handle: cfg.coll.handle, title: cfg.coll.title,
      descriptionHtml: `<p>${cfg.coll.title} – kuratierte Auswahl für die Schweiz. Gratis-Versand ab CHF 65.</p>`,
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: cfg.coll.tag }] } } });
    return r?.data?.collectionCreate?.collection?.id;
  }

  let created = 0, fails = [];
  for (const cat of CATS) {
    const cfg = CONFIG[cat]; if (!cfg) { console.log(`Unbekannte Kategorie ${cat}`); continue; }
    console.log(`\n=== ${cat.toUpperCase()} (${cfg.coll.title}) ===`);
    // 1) Kandidaten: on-brand Name-Match aus productsinformation + Ban-Filter
    const cand = info.filter(p => {
      const nm = (p.name || '').toLowerCase(); if (!nm) return false;
      return cfg.anchor.some(a => nm.includes(a)) && !(cfg.ban || []).some(x => nm.includes(x));
    });
    console.log(`  ${cand.length} on-brand Kandidaten im Katalog.`);
    // 2) Pro Kandidat: Detail (Preis/aktiv) + Bilder prüfen, bis PER Picks
    const picks = [];
    for (const c of cand) {
      if (picks.length >= PER) break;
      if (done.has('bb:' + c.id)) continue;
      const d = await bbProduct(c.id); await sleep(GAP);
      if (!d || d.active !== 1) continue;
      const cost = Number(d.wholesalePrice) || 0;
      if (!cost || cost > cfg.maxCost) continue;
      const imgD = await bbImages(c.id); await sleep(GAP);
      const urls = (imgD?.images || []).map(x => x.url).filter(Boolean);
      const good = [];
      for (const u of urls.slice(0, 8)) { if (await img200(u)) good.push(u); if (good.length >= 6) break; }
      if (good.length < 2) continue;
      picks.push({ id: c.id, sku: c.sku || String(c.id), nameEn: c.name, cost, imgs: good });
      console.log(`  Kandidat: €${cost} ${good.length}img · ${(c.name || '').slice(0, 55)}`);
    }
    if (!picks.length) { console.log('  (keine geeigneten TOP-Kandidaten)'); continue; }
    if (DRY) { picks.forEach(p => console.log(`  [DRY] würde anlegen: ${p.nameEn.slice(0, 55)} → CHF ${chf(p.cost)}`)); continue; }

    // 3) Anlegen (DE-Titel + SEO + Tags + Bilder, 6 Kanäle)
    const titles = await titlesDE(picks.map(p => p.nameEn));
    await ensureColl(cfg);
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const title = (titles[i] || p.nameEn).replace(/["<>]/g, '').trim();
      const price = chf(p.cost);
      const handle = ((title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 50) || 'bigbuy') + '-' + p.id;
      const tags = [cfg.coll.tag, ...cfg.extraTags, 'bigbuy', 'dropship'];
      const desc = `<p><strong>${title}</strong></p><ul>${cfg.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
        + `<p>📦 Lieferung aus EU-Lager, schnell · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>`;
      const input = { title, handle, productType: cfg.type, vendor: 'LuxeStyle', status: 'ACTIVE', tags,
        descriptionHtml: desc, seo: { title: `${title} | LuxeStyle`, description: `${title} – Premium-Qualität, schnelle EU-Lieferung, Gratis-Versand ab CHF 65.` },
        files: p.imgs.map(u => ({ originalSource: u, contentType: 'IMAGE' })) };
      if (cfg.sized) {
        const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
        input.productOptions = [{ name: 'Grösse', values: SIZES.map(s => ({ name: s })) }];
        input.variants = SIZES.map(s => ({ optionValues: [{ optionName: 'Grösse', name: s }], price,
          inventoryItem: { sku: `BB-${p.sku}-${s}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' }));
      } else {
        input.productOptions = [{ name: 'Titel', values: [{ name: 'Standard' }] }];
        input.variants = [{ optionValues: [{ optionName: 'Titel', name: 'Standard' }], price,
          inventoryItem: { sku: `BB-${p.sku}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' }];
      }
      const r = await sgql(stok, SET, { input }); const e = r?.data?.productSet?.userErrors || [];
      const pid = r?.data?.productSet?.product?.id;
      if (e.length || !pid) { fails.push(`${title.slice(0, 40)}: ${JSON.stringify(e.length ? e : r).slice(0, 160)}`); continue; }
      if (pubs.length) await sgql(stok, PUB, { id: pid, pubs });
      fs.appendFileSync(LEDGER, 'bb:' + p.id + '\n');
      created++; console.log(`  ✅ ${title.slice(0, 50)} → CHF ${price} (${handle})`);
      await sleep(400);
    }
  }
  if (fails.length) fails.slice(0, 15).forEach(x => console.error('✗', x));
  console.log(`\nFertig: ${created} Produkt(e) angelegt${DRY ? ' [DRY]' : ''}${fails.length ? `, ${fails.length} Fehler` : ''}.`);
  process.exit(0);
})();
