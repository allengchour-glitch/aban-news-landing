#!/usr/bin/env node
/* cj_sku_import.mjs — importiert GEZIELTE CJ-Produkte (SKU oder Suchbegriff), z. B. wenn der
 * User Screenshots aus der CJ-App schickt. Volle Pipeline: query → Groq-DE-Texte → Varianten →
 * alle Bilder → Video (staged upload) → 6 Kanäle → Ledger + Titel-Dubletten-Wache.
 * ENV: CJ_TOKEN · SHOPIFY_CLIENT_ID/SECRET · GROQ_API_KEY[2] · ITEMS="sku:CJJT…,search:dog football"
 * ⚠️ CJ-QPS: Engine (cj_perpetual) vorher stoppen — 1 req/s kontoweit!
 */
import fs from 'node:fs';
import { nachlauf } from './eimer_etikette.mjs';   // 02.10.: Eimer-Boden für Massen-Schreiber
import { istKlinge, istHandklinge } from './klingenregel.mjs';
import { nurAltnetz, DRAFT_TAG as MOBILFUNK_TAG } from './mobilfunk.mjs';   // 10.10.2026: nur 2G/3G = in CH ohne Netz
import { schonBeansprucht } from './cj_claim.mjs';
import { catTags, saisonTags } from './cat_tags.mjs';
import { produktSaeubern } from './marken_filter.mjs';
import { markeAlsWare } from './marke_als_ware.mjs';   // 10.10.2026: Fremdmarke als Ware («Harrods Keramik-Tasse», «iPhone 12» = Smartwatch)
import { echoVomLieferanten } from './titel_sprache.mjs';
import { technikWache } from './technik_plausibel.mjs';
import { produktdetails } from './cj_specs.mjs';
import { googleKategorie } from './google_kategorie.mjs';
import { typAusKategorie } from './produkttyp_aus_kategorie.mjs';   // 05.10.: Typ statt «Trend-Produkt»
import { seoTitel } from './seo_titel.mjs';   // 05.10.: SEO-Titel ≤ 70 ohne stille Kappung
import { copyPrompt, messSicher, wirkSicher, wahlSicher, textPolieren, fallenSicher } from './cj_copy_prompt.mjs';
import { textErzeugen } from './groq_text.mjs';
import { medizinZweck } from './medizin_zweck.mjs';
import { tierschutzGeraet } from './tierschutz_geraet.mjs';
import { essbar } from './essbar.mjs';   // 09.10.2026: Essbares aus China nicht verkaufen (data/essbar_regel.json)
import { takt as cjTakt } from './cj_takt.mjs';  // 21.09.: reservierte Startzeiten gegen CJs 1/s-Drossel
const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
let CJT = (process.env.CJ_TOKEN || '').trim();
if (!CJT && fs.existsSync('/tmp/cj_token.json')) CJT = JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken;
const LEDGER = 'dropship/cj_niche_done.txt';
// Publizieren + Quittung liegen seit 28.08.2026 in automation/cj_publish.mjs — es gab
// drei Fassungen dieser Funktion, und alle drei lasen nur die ANTWORT der Mutation
// statt des Zustands. Ergebnis: am 27./28.08. erneut Produkte in 5 von 6 Kanaelen.
import { publishVerified as _publishVerified, PUBS, GOOGLE_PUB } from './cj_publish.mjs';
const publishVerified = (tok, pid, klinge) => _publishVerified(
  sgql, tok, pid,
  klinge ? PUBS.filter(x => !x.publicationId.endsWith(GOOGLE_PUB)) : PUBS);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// ⚠️ 22.08.2026 — DIESER IMPORTER HATTE EINEN PREISBODEN VON CHF 4.90 und rechnete die
// Fracht erst ab 0,4 kg ein. Er steht in vier Runner-Aufrufen, legte also täglich Ware an,
// die der Preisboden-Lauf vom 12.08. bei 2'355 Produkten schon einmal von Hand anheben
// musste. Die Rechnung liegt jetzt EINMAL in cj_preis.mjs — es gab vier Fassungen, und nur
// die in cj_category_fill.mjs trug die Korrektur vom 20.08. (dieselbe Geschwister-Lehre wie
// bei der viermal kopierten Farbtabelle und bei publishVerified()).
import { chf, kosten, gewicht } from './cj_preis.mjs';
import { titelMitMenge } from './stueckzahl.mjs';
import { dubletteFinden, slugMerken } from './cj_dublette.mjs';
import { snippet } from './cj_snippet.mjs';   // Google-Suchergebnis-Text, EINE Quelle

async function cj(path) {
  for (let a = 0; a < 6; a++) {
    await cjTakt();
    const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path, { headers: { 'CJ-Access-Token': CJT } });
    const j = await r.json().catch(() => ({}));
    if (j.code === 1600200) { await sleep(2500); continue; } // QPS
    if (j.code === 16900500) { console.error('CJ-PUNKTE AUFGEBRAUCHT — Abbruch (Exit 3)'); process.exit(3); }
    return j;
  }
  return {};
}
async function shTok() {
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
      const t = await r.text();
      try { const tok = JSON.parse(t).access_token; if (tok) return tok; } catch {}
    } catch {}
    await sleep(2000 * (a + 1));
  }
  throw new Error('shTok: kein Token nach 5 Versuchen');
}
async function sgql(t, q, v) {
  // 02.10.2026: Eimer-Boden (eimer_etikette) + THROTTLED wiederholen — 5 parallele Importer liessen die Tageswächter
  // (cj_versand_ch_guard, sku_dup_scan, farbe_metafeld) mit «12x gedrosselt» sterben.
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t }, body: JSON.stringify({ query: q, variables: v }) });
    const j = await r.json();
    await nachlauf(j);
    if (!JSON.stringify(j?.errors || '').includes('THROTTLED')) return j;
    await new Promise(res => setTimeout(res, 4000 * (i + 1)));
  }
  return {};
}

const GROQ_KEYS = [(process.env.GROQ_API_KEY || ''), (process.env.GROQ_API_KEY2 || ''), (process.env.GROQ_API_KEY3 || process.env.GROQ_API_KEY_3 || '')].filter(Boolean);
// 'llama-3.3-70b-versatile' wird am 16.08.2026 abgeschaltet — aus der Reihe genommen.
// Modellwahl + Parser liegen seit 02.09.2026 in automation/groq_text.mjs (EINE Quelle).
async function groq(nameEn, feats, kat = '') {
  // messSicher(): harte Pruefung der Modellantwort auf Messwerte bei Wearables — ein
  // Prompt-Verbot allein hat am 04.09. nicht gereicht (siehe cj_copy_prompt.mjs).
  // ⚠️ 07.09.2026: Dieser Importer legt IMMER eine Standard-Variante an (Zeile ~212) —
  // ein Auswahl-Versprechen im Text ist hier also nie gedeckt. wahlSicher() schneidet
  // solche Saetze deterministisch heraus; ein Modell kann die Prompt-Regel ignorieren.
  const o = await textErzeugen(copyPrompt({ nameEn, feats, kat }));   // 04.10.: CJ-Kategorie statt leer   // Groq → DeepSeek → Gemini, EINE Kette (14.09.2026)
  if (!o) return null;
  if (o._modell !== 'groq') console.log('  ✍️ Text via', o._modell);
  return fallenSicher(wahlSicher(textPolieren(wirkSicher(messSicher(o)))), nameEn);
}
async function attachVideo(t, pid, url, tag) {
  try {
    const vr = await fetch(url); if (!vr.ok) return;
    const buf = Buffer.from(await vr.arrayBuffer()); if (buf.length < 30000 || buf.length > 60e6) return;
    const su = await sgql(t, `mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{name value} } userErrors{message} } }`,
      { i: [{ resource: 'VIDEO', filename: `cj-${tag}.mp4`, mimeType: 'video/mp4', fileSize: String(buf.length), httpMethod: 'POST' }] });
    const st2 = su.data?.stagedUploadsCreate?.stagedTargets?.[0]; if (!st2) return;
    const fd = new FormData();
    for (const p of st2.parameters) fd.append(p.name, p.value);
    fd.append('file', new Blob([buf], { type: 'video/mp4' }), `cj-${tag}.mp4`);
    const up = await fetch(st2.url, { method: 'POST', body: fd }); if (!up.ok) return;
    await sgql(t, `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id,media:$m){ userErrors{message} } }`,
      { id: pid, m: [{ originalSource: st2.resourceUrl, mediaContentType: 'VIDEO' }] });
    console.log('  🎬 Video angehängt');
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 🎯 RELEVANZ-TOR FÜR SUCHAUFTRÄGE (13.10.2026, Punkt K8). GEMESSEN in /tmp/cj_runner.log, 10./11.10.:
// «thermal underwear set women» legte ein «Klassisches Strickset mit Cape und Hose» und ein Plüsch-Hoodie-Set an,
// «hot water bottle with knitted cover» eine Golfbag-Abdeckung, einen Strickblazer und eine Photosensitivdrum für
// Tonerkartuschen, «ski base layer thermal» ein Rundhals-T-Shirt. Die alte Wache zählte TEILWÖRTER («set»+«women»
// in «Classic Knit Set … Women», «water» in «Waterproof», «hot» in «PHOTOsensitive») — zwei Füllwörter genügten.
// Und der Queue-Runner quittierte jeden Lauf mit RC=0 als «#done», auch wenn nur Fremdware kam.
// Regel jetzt: Kernwörter = Suchwörter vor «with/for» ohne Füllwörter (STOPP); ein CJ-Treffer zählt nur, wenn
// sein productNameEn genug Kernwörter als GANZES Wort trägt (Plural-s erlaubt) — mind. 2 (bei 1 Kernwort 1),
// ab 4 Kernwörtern 60 %. Verworfene Treffer: Logzeile «irrelevant: <name>». Je Suchauftrag eine Zeile
// «RELEVANT<TAB>n<TAB>search:…» — daran entscheidet cj_queue_runner.sh #done (n ≥ 1) oder #ohne-treffer (n = 0).
// Gilt für JEDEN Suchauftrag dieses Importers, auch künftige. Selbsttest: node automation/cj_sku_import.mjs --selbsttest
// (läuft bei jedem Start von cj_queue_runner.sh; rot = Queue bleibt zu). Tageszahlen: --stand (Aufseher-Zeile).
const RELEVANZ_STOPP = new Set(['set', 'sets', 'women', 'womens', 'woman', 'men', 'mens', 'man', 'with', 'for', 'new',
  'hot', 'sale', 'rechargeable', 'and', 'the', 'of', 'in', 'on', 'to', 'a', 'an', 'by', 'ladies', 'lady', 'unisex']);
const RELEVANZ_STAT = 'dropship/_cj_suche_relevanz.json';
const rxEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// «hot» ist Füllwort («hot sale»), ausser in «hot water» (Wärmflasche) — dort als EIN Wort, sonst ginge jede Trinkflasche durch.
const relNorm = s => String(s || '').toLowerCase().replace(/[’']s\b/g, '').replace(/\bhot[\s-]+water\b/g, 'hot-water');
function kernwoerter(suche) {
  const s = relNorm(suche);
  const woerter = x => x.split(/[^a-z0-9-]+/).map(t => t.replace(/^-+|-+$/g, '')).filter(t => t.length >= 2 && !RELEVANZ_STOPP.has(t));
  const kopf = woerter(s.split(/\b(?:with|for)\b/)[0]);   // «hot water bottle with knitted cover» → Ware = water bottle
  return kopf.length ? kopf : woerter(s);
}
function wortMuster(w) {
  const formen = new Set([w]);
  if (w.length > 3 && w.endsWith('ies')) formen.add(w.slice(0, -3) + 'y');
  if (w.length > 3 && w.endsWith('es')) formen.add(w.slice(0, -2));
  if (w.length > 3 && w.endsWith('s')) formen.add(w.slice(0, -1));
  return new RegExp(`(?<![a-z0-9])(?:${[...formen].map(rxEsc).join('|')})(?:s|es)?(?![a-z0-9])`);
}
function relevanzUrteil(suche, nameEn) {
  const kern = kernwoerter(suche);
  if (!kern.length) return { ok: true, treffer: 0, noetig: 0, kern };
  const name = relNorm(nameEn);
  const treffer = kern.filter(w => wortMuster(w).test(name)).length;
  const noetig = Math.max(Math.min(2, kern.length), Math.ceil(kern.length * 0.6));
  return { ok: treffer >= noetig, treffer, noetig, kern };
}
// Kanarien: [Suche, CJ-Name, erwartet]. Die ersten vier stehen so im Auftrag K8; die übrigen sind echte Fehlgriffe aus
// dem Runner-Log und Gegenproben (Plural, Wortgrenze, «with»-Kopf), damit das Tor nicht ins andere Extrem kippt.
const RELEVANZ_KANARIEN = [
  ['hot water bottle', 'Photosensitive Drum for Toner', false],
  ['thermal underwear set women', 'Classic Knit Set Cape Pants', false],
  ['ski base layer thermal', 'Round Neck Long Sleeve T-shirt', false],
  ['heated socks rechargeable', 'Heated Socks Rechargeable', true],
  ['hot water bottle with knitted cover', 'Waterproof Golf Bag Cover', false],
  ['hot water bottle with knitted cover', 'Knitted Cardigan Sweater With Buttons', false],
  ['hot water bottle with knitted cover', 'Hot Water Bottle With Knitted Cover 2L', true],
  ['hot water bottle', 'New Foldable Large-capacity Water Bottle', false],
  ['hot water bottle silicone', 'Silicone Hot-Water Bag Bottle 1L', true],
  ['thermal underwear set women', "Women's Classic Knit Set Cape Pants", false],
  ['ski goggles', 'Ski Gloves Winter Warm Waterproof', false],
  ['ski goggles', 'Anti-fog Double Layer Ski Goggles Snowboard', true],
  ['heated socks rechargeable', 'Electric Heated Sock USB Foot Warmer', true],
  ['heated socks rechargeable', 'Winter Warm Wool Socks Women', false],
  ['fuzzy socks women', "Women's Fuzzy Plush Socks Winter", true],
  ['fuzzy socks women', 'Fuzzy Slippers Indoor', false],
  ['thermal underwear set', "Men's Thermal Underwear Set Fleece Lined", true],
  ['thermal underwear set', 'Red Wine Thermal Cooler Bag Thickened And Waterproof With A Handle', false],
  ['hand warmer power bank', 'Power Bank 10000mAh Fast Charging', false],
  ['rechargeable hand warmer usb', 'Rechargeable Electric Hand Warmer Winter Double-Side Heating Mini Pocket Power Bank', true],
];
function relevanzSelbsttest() {
  let rot = 0;
  for (const [s, n, soll] of RELEVANZ_KANARIEN) {
    const u = relevanzUrteil(s, n);
    if (u.ok !== soll) { rot++; console.log(`  ✗ Kanarie: «${s}» × «${n}» → ${u.ok ? 'ja' : 'nein'} (Soll ${soll ? 'ja' : 'nein'}; Kern ${u.kern.join('/')}, ${u.treffer}/${u.noetig})`); }
  }
  console.log(`RELEVANZ-SELBSTTEST: ${RELEVANZ_KANARIEN.length - rot}/${RELEVANZ_KANARIEN.length} ${rot ? 'ROT' : 'grün'}`);
  return rot === 0;
}
// Tageszahlen (UTC) für die Aufseher-Zeile; 30 Tage, Lese-Ändere-Schreibe über tmp+rename (der Queue-Runner ist der
// einzige Such-Aufrufer, ein verlorener Zähler bei Gleichzeitigkeit wäre kein Schaden).
function relevanzBuchen(delta) {
  try {
    const tag = new Date().toISOString().slice(0, 10);
    let st = {}; try { st = JSON.parse(fs.readFileSync(RELEVANZ_STAT, 'utf8')); } catch {}
    const t = st[tag] || (st[tag] = {});
    for (const [k, v] of Object.entries(delta)) if (v) t[k] = (t[k] || 0) + v;
    const grenze = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    for (const k of Object.keys(st)) if (k < grenze) delete st[k];
    fs.writeFileSync(RELEVANZ_STAT + '.tmp', JSON.stringify(st, null, 1) + '\n'); fs.renameSync(RELEVANZ_STAT + '.tmp', RELEVANZ_STAT);
  } catch (e) { console.log('  (Relevanz-Zähler nicht geschrieben:', e.message, ')'); }
}
// 🎛️ 13.10.2026 (Kauf-Strecke Klasse 4): Dieser Importer legt IMMER genau eine Variante «Default Title» an (productSet
// unten). Führt CJ ≥ 2 Varianten (Modelle/Farben/Grössen), sieht die Kundin auf den Bildern eine Wahl, die sie nicht treffen
// kann, und der Bestell-Automat stoppt «manuell prüfen» (rät nie). Beispiel: Aufblasbares Halloween-Kostüm 638900 — Bilder
// Spiralhund + Dackel, CJ 2 Varianten, Shop «Default Title». Das Zeichen «auswahl-offen» macht die Ware für den Nachrüster
// (auswahl_nachruesten.py) und die Ampel («AUSWAHL-OFFEN n (besucht m)», auswahl_fehlt_messen.py --ampel) auffindbar;
// den Bestand gleicht auswahl_fehlt_messen.py --markieren ab (setzt fehlende, nimmt es nach dem Nachrüsten wieder weg).
const AUSWAHL_OFFEN_TAG = 'auswahl-offen';
function auswahlOffenTags(variants) {
  return (Array.isArray(variants) ? variants.filter(v => v && typeof v === 'object').length : 0) >= 2 ? [AUSWAHL_OFFEN_TAG] : [];
}
// Kanarien: [CJ-variants, erwartete Zusatz-Tags] — die erste Zeile ist das Kostüm 638900 (CJ pid 2610010401151638900).
const AUSWAHL_KANARIEN = [
  [[{ vid: 'v1', variantKey: 'Double Spring Dog-Free Size' }, { vid: 'v2', variantKey: 'Double Sausage Dog-Free Size' }], [AUSWAHL_OFFEN_TAG]],
  [[{ vid: 'v1', variantKey: 'ABS' }], []],
  [[], []], [null, []], [undefined, []], ['zwei', []], [[null, null], []],
  [Array.from({ length: 36 }, (_, i) => ({ vid: 'c' + i })), [AUSWAHL_OFFEN_TAG]],
];
function auswahlSelbsttest() {
  let rot = 0;
  for (const [vs, soll] of AUSWAHL_KANARIEN) {
    const ist = auswahlOffenTags(vs);
    if (JSON.stringify(ist) !== JSON.stringify(soll)) { rot++; console.log(`  ✗ Auswahl-Kanarie: ${JSON.stringify(vs)?.slice(0, 60)} → ${JSON.stringify(ist)} (Soll ${JSON.stringify(soll)})`); }
  }
  console.log(`AUSWAHL-SELBSTTEST: ${AUSWAHL_KANARIEN.length - rot}/${AUSWAHL_KANARIEN.length} ${rot ? 'ROT' : 'grün'}`);
  return rot === 0;
}
if (process.argv.includes('--selbsttest')) { const a = relevanzSelbsttest(), b = auswahlSelbsttest(); process.exit(a && b ? 0 : 1); }
if (process.argv.includes('--stand')) {
  // Eine Zeile für den Aufseher: heutige Suchaufträge, verworfene Fremdware, #ohne-treffer (aus der Queue-Datei).
  const tag = new Date().toISOString().slice(0, 10);
  let t = {}; try { t = JSON.parse(fs.readFileSync(RELEVANZ_STAT, 'utf8'))[tag] || {}; } catch {}
  let ohne = 0; try { ohne = fs.readFileSync('automation/cj_search_queue.txt', 'utf8').split('\n').filter(z => z.startsWith('#ohne-treffer ' + tag)).length; } catch {}
  const gruen = RELEVANZ_KANARIEN.every(([s, n, soll]) => relevanzUrteil(s, n).ok === soll);
  console.log(`CJ-SUCHE ${tag}: ${t.suchen || 0} Suchen · ${t.irrelevant || 0} irrelevant verworfen · ${ohne} #ohne-treffer · ${t.angelegt || 0} angelegt${gruen ? '' : ' · ⛔ RELEVANZ-TOR ROT (--selbsttest)'}`);
  process.exit(0);
}
// ─────────────────────────────────────────────────────────────────────────────────────────────

const ITEMS = (process.env.ITEMS || '').split(',').map(s => s.trim()).filter(Boolean);
if (!ITEMS.length) { console.error('ITEMS fehlt (sku:… oder search:…)'); process.exit(1); }
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.replace('cj:', '').trim()) : []);
const t = await shTok();
const SET = `mutation($i:ProductSetInput!){ productSet(synchronous:true,input:$i){ product{id} userErrors{field message} } }`;

let ohneText = 0, angelegt = 0;
// 🎯 K8 (13.10.2026): Suchaufträge laufen als JOBS — ein Suchbegriff darf bis zu PRO_SUCHE Produkte anlegen (Default 1,
// der Queue-Runner setzt 3) und probiert dafür höchstens 3×PRO_SUCHE relevante Kandidaten aus einem Seiten-Puffer
// (vorher: nur der ERSTE Kandidat; war er eine Dublette, war der Suchbegriff verbraucht). sku:/pid: unverändert.
const PRO_SUCHE = Math.max(1, parseInt(process.env.PRO_SUCHE || '1', 10) || 1);
const SUCH_PAGES = parseInt(process.env.CJPAGES || '5', 10);
const suchStand = new Map();      // item → { n, relevant, irrelevant, angelegt, versuche, kand, seite, erschoepft, offen, gemeldet, textFehlt }
const versucht = new Set();       // pids, die dieser Lauf schon in der Hand hatte
const JOBS = [...ITEMS];
const relSumme = { suchen: 0, irrelevant: 0, relevant: 0, angelegt: 0, ohne_treffer: 0 };
let laufenderJob = null;
function relevanzMelden(st) {
  if (st.gemeldet) return; st.gemeldet = true;
  // Texte fehlten und nichts angelegt → «offen»: der Runner lässt die Zeile stehen (Lehre 02.09., Wecker-Suche).
  if (st.textFehlt && !st.angelegt) { console.log(`RELEVANT\toffen\t${st.item}\t(keine Texte)`); return; }
  if (!st.n) relSumme.ohne_treffer++;
  console.log(`RELEVANT\t${st.n}\t${st.item}\t(relevant ${st.relevant}, Typ lieferbar ${st.n}, irrelevant ${st.irrelevant}, angelegt ${st.angelegt})`);
}
function jobFertig() {
  const st = laufenderJob; laufenderJob = null;
  if (st && --st.offen <= 0) relevanzMelden(st);
}
process.on('exit', () => {
  // Abbruch mitten im Lauf (Exit 3 = CJ-Punkte weg): Suchbegriffe, die schon etwas angelegt haben, gelten als erledigt —
  // sonst legte jeder Neuversuch des Runners ein weiteres Produkt an (10./11.10.: 16 Wiederholungen derselben 4er-Charge).
  for (const st of suchStand.values()) if (!st.gemeldet && st.angelegt > 0) relevanzMelden(st);
  for (const st of suchStand.values()) if (st.gemeldet || st.angelegt) relSumme.relevant += st.n;
  if (relSumme.suchen || relSumme.irrelevant) relevanzBuchen(relSumme);
});
for (let ji = 0; ji < JOBS.length; ji++) {
  jobFertig();
  const item = JOBS[ji];
  const [kind, ...rest] = item.split(':'); const val = rest.join(':');
  let pid = null;
  let st = null;
  if (kind === 'pid') {
    // Direkte Produkt-ID (15.08.2026, Schulstart-Import): die Kandidaten sind schon
    // recherchiert, eine erneute Textsuche würde nur Punkte kosten und anders treffen.
    pid = val.trim();
  } else if (kind === 'sku') {
    const j = await cj(`/product/query?productSku=${encodeURIComponent(val)}`); await sleep(1300);
    pid = j.data?.pid;
  } else {
    // Tiefer paginieren (CJPAGES, Default 5): Top-Treffer sind bei 10k+-Ledger längst importiert.
    // Relevanz: relevanzUrteil() (Tor oben, K8) — ersetzt die Teilwort-Wache vom Juli («selfie stick» → Küchenlöffel).
    st = suchStand.get(item);
    if (!st) { st = { item, n: 0, relevant: 0, irrelevant: 0, angelegt: 0, versuche: 0, kand: [], seite: 0, erschoepft: false, offen: 1, gemeldet: false, textFehlt: false };
               suchStand.set(item, st); relSumme.suchen++; }
    laufenderJob = st;
    if (st.angelegt >= PRO_SUCHE || st.textFehlt) continue;   // genug — oder die Text-Kette steht (dann nicht weiter CJ-Punkte ausgeben)
    const WH = (process.env.WH || '').trim(); // z.B. WH=DE → nur EU-Lager (Schnellversand in die CH)
    while (!st.kand.length && !st.erschoepft && st.seite < SUCH_PAGES) {
      st.seite++;
      const j = await cj(`/product/list?pageSize=10&pageNum=${st.seite}&productNameEn=${encodeURIComponent(val)}${WH ? `&countryCode=${WH}` : ''}`); await sleep(1300);
      const list = j.data?.list || [];
      if (!list.length) { st.erschoepft = true; break; }
      for (const cand of list) {
        const ru = relevanzUrteil(val, cand.productNameEn);
        if (!ru.ok) { st.irrelevant++; relSumme.irrelevant++; console.log(`  irrelevant: ${String(cand.productNameEn || '').slice(0, 90)} (${ru.treffer}/${ru.noetig} von ${ru.kern.join('/')})`); continue; }
        st.relevant++;
        // MOQ-Wache (2026-07-11, User-Fund VerveBuds MOQ 10): NUR ORDINARY_PRODUCT (CJ-Lager, Einzel-Dropship
        // MOQ 1). SUPPLIER_SHIPPED_PRODUCT/SUPPLIER_PRODUCT = Lieferant-Direkt, oft MOQ>1 → nicht einzeln fulfillbar.
        const pt = cand.productType || '';
        if (pt && pt !== 'ORDINARY_PRODUCT' && pt !== 'DIY_PRODUCT') { continue; }
        st.n++;   // relevant UND einzeln lieferbar — schon importiert zählt mit (der Begriff ist dann abgedeckt)
        if (!done.has(String(cand.pid)) && !versucht.has(String(cand.pid))) st.kand.push(String(cand.pid));
      }
    }
    pid = st.kand.shift() || null;
    if (pid) {
      versucht.add(pid); st.versuche++;
      if (st.versuche < PRO_SUCHE * 3) { JOBS.push(item); st.offen++; }   // nächster Kandidat, falls dieser übersprungen wird
    } else if (st.versuche) continue;   // Puffer leer nach mind. einem Versuch — still beenden
  }
  if (!pid) { console.log('✗ nicht gefunden/alles schon da:', item); continue; }
  if (done.has(String(pid))) { console.log('= schon importiert:', item); continue; }
  const dj = await cj(`/product/query?pid=${pid}`); await sleep(1300);
  const d = dj.data || {};
  const imgs = (d.productImageSet || []).filter(u => /^https/.test(u)).slice(0, 20);
  if (imgs.length < 2) { console.log('✗ zu wenig Bilder:', item); continue; }
  const feats = (d.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const g = await groq(d.productNameEn || val, feats, d.categoryName || '');
  if (!g) { console.log('✗ keine Texte:', item); ohneText++; if (st) st.textFehlt = true; continue; }
  // Marken-Filter (14.08.2026), siehe automation/marken_filter.mjs
  const ms = produktSaeubern(g.title, g.html);
  if (ms.verdacht) { console.log('✗ Markenbezug, übersprungen:', item); continue; }
  g.title = ms.title; g.html = ms.html;
  if (markeAlsWare(g.title)) { console.log('✗ Fremdmarke als Ware, übersprungen:', String(g.title).slice(0, 50)); continue; }
  // 🇩🇪 Titel-Sprachwache (20.08.2026): der Übersetzer liefert die Beschreibung deutsch, den
  // Titel aber manchmal roh aus dem CJ-Listing. Begründung + Testfälle: automation/titel_sprache.mjs.
  // Erst ein zweiter Versuch, dann überspringen (kein Ledger-Eintrag → kommt später erneut dran).
  {
   const quelle = d.productNameEn || val;
   if (echoVomLieferanten(g.title, quelle)) {
    const g2 = await groq(quelle, feats, d.categoryName || '');
    if (g2 && g2.title && g2.html && !echoVomLieferanten(g2.title, quelle)) {
     const m2 = produktSaeubern(g2.title, g2.html);
     if (!m2.verdacht) { g.title = m2.title; g.html = m2.html; }
    }
    if (echoVomLieferanten(g.title, quelle)) { console.log('✗ Titel nicht uebersetzt, uebersprungen:', String(g.title).slice(0,50)); continue; }
   }
  }
  // ß→ss (15.08.2026): CH-Schreibung, Quelle-Fix wie in cj_category_fill
  // 📦 Stückzahl aus dem englischen Lieferantennamen mitnehmen — sonst sieht ein
  // Multipack aus wie ein Einzelstück (Regel vom 26.07.2026). Eine Quelle:
  // automation/stueckzahl.mjs.
  let title = titelMitMenge(g.title.replace(/ß/g,'ss').replace(/ẞ/g,'SS'), d.productNameEn, 70);
  // Technik-Plausibilitaet — siehe automation/technik_plausibel.mjs (24.08.2026).
  { const tw=technikWache(title, g.html||'');
    if(tw.verwerfen){ console.log('  skip(technik)', tw.grund, title.slice(0,40)); continue; }
    if(tw.grund) console.log('  technik-korrigiert', tw.grund);
    title=tw.title; }
  // Titel-Wache inkl. Umlaut-Normalisierung (Geraet==Gerät-Falle 2026-07-08) + Bild-Wache (GEHIRN 2)
  const norm = x => x.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
  const dq = await sgql(t, `query($q:String!){products(first:10,query:$q){edges{node{id title}}}}`, { q: `title:"${title.replace(/"/g, '').split(' ').slice(0,3).join(' ')}*" status:active` });
  if ((dq.data?.products?.edges||[]).some(e => norm(e.node.title) === norm(title))) { console.log('= Titel existiert (norm):', title); fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  // ⚠️ HANDLE-WACHE (23.08.2026). Die Titel-Suche oben ist nicht verlaesslich: Shopify
  // tokenisiert Bindestriche nicht, «Keramik Futternapf» findet «Keramik-Futternapf» nicht.
  // Der Handle-Stamm ist bei beiden Schreibweisen identisch — siehe automation/cj_dublette.mjs.
  const dublette = await dubletteFinden(sgql, t, title);
  if (dublette) { console.log('= skip(dup-handle):', title.slice(0,44), '≈', String(dublette).slice(0,40)); fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  slugMerken(title);
  const IMGLEDGER = 'dropship/cj_niche_img_seen.txt';
  const imgSeen = new Set(fs.existsSync(IMGLEDGER) ? fs.readFileSync(IMGLEDGER, 'utf8').split('\n').filter(Boolean) : []);
  const imgKey = (imgs[0]||'').split('?')[0].split('/').pop();
  if (imgKey && imgSeen.has(imgKey)) { console.log('= Bild existiert:', title); fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  if (imgKey) fs.appendFileSync(IMGLEDGER, imgKey + '\n');
  // Preis-Deckel + Sperrgut-/Möbel-Filter (GEHIRN §5 + 2026-07-10: «L-förmiger Schminktisch CHF 653» war Trust-Killer)
  const priceChf = parseFloat(chf(d.sellPrice, d.variants?.[0]?.variantWeight));
  const MAXCHF = parseFloat(process.env.MAXCHF || '200');
  if (priceChf > MAXCHF) { console.log(`✗ zu teuer (CHF ${priceChf}) — non-fit:`, title.slice(0,40)); fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  if (/schminktisch|schrank|\bregal\b|kommode|\bbett\b|\bsofa\b|couch|\btisch\b|\bstuhl\b|matratze|kleiderständer|garderobe|sideboard|vitrine|werkbank|möbel/i.test(title)) { console.log('✗ sperriges möbel — skip:', title.slice(0,40)); fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  // ⚕️ Medizinische Zweckbestimmung — gleiche Prüfung wie in cj_category_fill.mjs, gleiche
  // Musterdatei (automation/medizin_zweck.json). Dieser Importer läuft über
  // cj_queue_runner.sh und legt Ware genauso ACTIVE + in allen Kanälen an; ohne die Wache
  // hier wäre die Lücke nur verschoben statt geschlossen (Befund 14.08.2026).
  const med = medizinZweck(title, g.html);
  // 🐾 Tierschutz TSchV Art. 76 — gleiche Prüfung wie in cj_category_fill.mjs, gleiche
  // Musterdatei (automation/tierschutz_geraet.json). Siehe die Begründung dort: am 20.08.2026
  // standen 14 Schock-/Sprüh-Geräte aktiv in allen sechs Kanälen, zwölf davon in den sieben
  // Tagen davor neu importiert.
  const tsch = tierschutzGeraet(title, g.html);
  // 🍬 09.10.2026: Essbares aus China (Ergänzungsfutter, Tier-Snacks aus Fleisch, Supplements, Koffein-Beutel) ist ohne
  // Registrierung/BLV-Bewilligung nicht einführbar — dieselbe Klasse wie die zurückgeschickte Klinge #1017. Geprüft: Titel +
  // CJ-Name (englisch), nie der Text. Regel automation/data/essbar_regel.json (Bestand: essbar_wache.py).
  const ess = essbar(title, d.productNameEn || '', '', 'CJ-' + pid);
  const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 46) + '-' + String(pid).slice(-6);
  const tagsFinal = [...new Set([...(med ? ['medizinprodukt-pruefen', 'medizin-zweck-' + med.grund] : []),
      ...(tsch ? [tsch.tag || 'tierschutz-tschv76', 'tierschutz-' + tsch.grund] : []),
      ...(ess ? ['essbar-nicht-ch', 'essbar-' + ess] : []),
      ...((med || tsch || ess) ? [] : ['trend', 'viral', 'video-hit']), 'cj-real', 'dropship', 'neu', 'neuheit',   // «neuheit» speist die Startseiten-Reihe (03.09.)
      ...((process.env.WH || '').trim() ? ['schnell-versand', 'eu-lager'] : []),
      ...auswahlOffenTags(d.variants),   // 13.10.: ≥ 2 CJ-Varianten, Shop nur «Default Title» → Nachrüster/Ampel finden es
      ...catTags(`${title} ${d.productNameEn || ''} ${val || ''}`),
      ...saisonTags(title, d.productNameEn || '')])];   // Halloween-Reihe (02.10.), nur Titel/EN-Name
  // 05.10.2026 (Plan Punkt 16): Typ aus der Google-Kategorie statt Sammeltyp «Trend-Produkt» — der Sammeltyp bleibt
  // nur, wenn keine Kategorie passt (nie raten; produkttyp_vereinheitlichen.py räumt den Rest täglich).
  const gkatImport = googleKategorie(title, tagsFinal, 'Trend-Produkt');
  const typImport = typAusKategorie(gkatImport, title) || 'Trend-Produkt';
  const input = { title, handle: slug, productType: typImport, vendor: 'LuxeStyle',
    status: (med || tsch || ess) ? 'DRAFT' : 'ACTIVE',
    tags: tagsFinal,
    descriptionHtml: (g.html + '\n' + produktdetails(d, title) + '\n<p>🚚 Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>').replace(/ß/g, 'ss').replace(/ẞ/g, 'SS'),
    seo: { title: seoTitel(title),   // 05.10.: 70er-Grenze an der Wortgrenze, nie halbe Marke (seo_titel.mjs)
           description: snippet(g.html, title).slice(0, 320) },
    // 09.10.2026: «Title / Default Title» statt «Variante / Standard» (Wahlfeld mit einem Knopf, Nachrüster gesperrt)
    productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
    variants: [{ optionValues: [{ optionName: 'Title', name: 'Default Title' }], price: chf(d.sellPrice, d.variants?.[0]?.variantWeight), inventoryItem: { sku: ('CJ-' + pid).slice(0, 70), tracked: false, cost: kosten(d.sellPrice, d.variants?.[0]?.variantWeight), ...gewicht(d.variants?.[0]?.variantWeight) }, inventoryPolicy: 'CONTINUE' }],
    // ⚠️ GOOGLE-FELDER GEHÖREN IN DEN IMPORTER, nicht in einen Backfill (15.08.2026: die 30
    // neuesten Produkte hatten genau 3 ohne condition/custom_product — alle drei aus DIESEM
    // Skript. cj_category_fill schreibt sie seit dem 11.08., hier fehlten sie: die Abdeckung
    // wäre mit jedem Queue-Import wieder gesunken, exakt das condition-Muster vom 11.08.).
    // Kategorie bewusst NICHT geraten — die setzt google_kategorie.mjs aus Titel/Tags.
    metafields: [
      // google_product_category gleich mit — dieselbe Funktion wie im Kategorie-Grind;
      // ohne sie fiele die 87-%-Abdeckung mit jedem Queue-Import zurück (Muster 11./12.08.).
      ...(gkatImport?[{namespace:'mm-google-shopping',key:'google_product_category',value:gkatImport,type:'single_line_text_field'}]:[]),
      { namespace: 'mm-google-shopping', key: 'condition', value: 'new', type: 'single_line_text_field' },
      { namespace: 'mm-google-shopping', key: 'custom_product', value: 'true', type: 'boolean' },
      { namespace: 'mm-google-shopping', key: 'age_group', value: 'adult', type: 'single_line_text_field' },
    ],
    files: [{ originalSource: imgs[0], contentType: 'IMAGE', alt: (title + ' | LuxeStyle').slice(0, 120) }] };
  // Rennschutz (01.09.): 4 Runner teilen sich das Ledger — frischer Blick + Claim,
  // sonst importieren zwei Runner dieselbe pid in derselben Minute (4 Paare belegt).
  if (schonBeansprucht(pid)) { console.log('= Rennschutz: pid parallel in Arbeit —', title.slice(0, 40)); continue; }
  const r = await sgql(t, SET, { i: input });
  const spid = r.data?.productSet?.product?.id;
  if (!spid) { console.log('✗', title, JSON.stringify(r.data?.productSet?.userErrors || r).slice(0, 120)); continue; }
  const media = imgs.slice(1).map((u, i) => ({ originalSource: u, mediaContentType: 'IMAGE', alt: (title + ' – Bild ' + (i + 2) + ' | LuxeStyle').slice(0, 120) }));
  if (media.length) await sgql(t, `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id,media:$m){userErrors{message}} }`, { id: spid, m: media });
  // Ein Medizinprodukt geht in KEINEN Kanal — am wenigsten in «Google & YouTube».
  if (med) { console.log(`⚕️ medizinische Zweckbestimmung (${med.grund}) → DRAFT, nicht publiziert: ${title.slice(0,44)}`);
            fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  // TSchV Art. 76: Erziehungsgeräte mit Schock-, Impuls- oder Reizstoffwirkung → DRAFT, kein Kanal.
  // ⚠️ ZWEI FEHLER STANDEN BIS 20.08.2026 IN DIESEN DREI ZEILEN:
  // (1) Das Muster verlangte «Halsband»/«Collar» im TITEL und kannte «statischer Impuls»,
  //     «elektrostatische Stimulation», «elektrischem Impuls» nicht — an den 14 live gefundenen
  //     Geräten gemessen wären neun durchgerutscht. Jetzt prüft die gemeinsame Musterdatei.
  // (2) `tags:` ERSETZT die komplette Tag-Liste (Gedächtnis-Regel vom 20.08.): der Aufruf hat
  //     alles ausser vier Tags gelöscht — die Ware wäre aus jeder Kollektion gefallen. Der
  //     Status steht ohnehin schon oben auf DRAFT und die Tags stehen in tagsFinal; hier wird
  //     nichts mehr überschrieben.
  if (tsch) { console.log(`🐾 Tierschutz TSchV 76 (${tsch.grund}, «${tsch.muster}») → DRAFT, nicht publiziert: ${title.slice(0,44)}`);
            fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  if (ess) { console.log(`🍬 Essbares aus China (${ess}) → DRAFT, nicht publiziert: ${title.slice(0,44)}`);
            fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue; }
  // Hausregel 12.08.: Klingen (auch Küchenmesser) nie in den Google-Kanal.
  // Regel seit 29.08.2026 EINMAL in klingenregel.json (vorher fuenf Kopien).
  // 🔪 16.09.2026, Bestellung #1017: CJ schickte die Sendung aus Shanghai als VERBOTENEN
  // ARTIKEL zurueck — es gibt keine Linie CN→CH fuer Klingen. Bis heute stand hier nur die
  // WERBE-Regel (Klingen raus aus dem Google-Kanal); verkaufen durfte der Shop sie weiter.
  // Eine Ware, die kein Lieferant ausliefern kann, gehoert in keinen Kanal und in keinen
  // Warenkorb. Das Produkt ist hier schon angelegt, also: DRAFT, Tag, nicht publizieren —
  // dasselbe Muster wie die Tierschutz-Wache darueber. Zubehoer ohne Klinge im Paket
  // (Messerblock, -schaerfer, Schwertgurt) bleibt erlaubt; das trennt istHandklinge.
  // 13.10.2026: auch den ENGLISCHEN CJ-Namen fragen — Groq machte aus «bone chopper/cleaver», «folding knife carabiner»
  // und «9 pcs knife set» die Titel «Knochenspalter», «5-in-1 Outdoor-Tool», «Küchenhelfer-Set»; 14 Klingen waren ACTIVE.
  // Bewusst in Kauf genommen: Zubehör mit «Knife» vorne («Knife Roll Bag») wird übersprungen — ein verlorener Import
  // kostet nichts, eine Klinge im Warenkorb eine Rücksendung aus Shanghai (#1017).
  if (istHandklinge(title) || istHandklinge(d.productNameEn || '')) {
    await sgql(t, `mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`,
      { i: { id: spid, status: 'DRAFT', tags: [...tagsFinal, 'cj-nicht-versendbar-ch', 'handklinge-kein-ch-versand'] } });
    console.log(`  ⛔ Handklinge — kein CH-Versand (Klasse #1017) → DRAFT: ${title.slice(0,50)}`);
    fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue;
  }
  // 📵 10.10.2026: Geräte mit SIM, die nur 2G/3G können (GSM/GPRS/WCDMA), funken in der Schweiz nicht — 2G seit 01/2023 aus,
  // 3G 2025/26. Ein 2G-Tracker ortet nichts, eine 2G-Kinderuhr setzt keinen Notruf ab. Regel data/mobilfunk_netz_regel.json
  // (= Bestand-Wächter mobilfunk_netz_pruefen.py); Urteil aus Titel + CJ-Name/-Beschreibung/-Varianten, 4G/LTE schlägt GSM.
  if (nurAltnetz(title, `${d.productNameEn||''} ${String(d.description||'').replace(/<[^>]+>/g,' ')} ${(d.variants||[]).map(v=>v.variantNameEn||'').join(' ')}`)) {
    await sgql(t, `mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`,
      { i: { id: spid, status: 'DRAFT', tags: [...tagsFinal, MOBILFUNK_TAG] } });
    console.log(`  📵 nur 2G/3G — in der Schweiz ohne Netz → DRAFT: ${title.slice(0,50)}`);
    fs.appendFileSync(LEDGER, 'cj:' + pid + '\n'); continue;
  }
  const klinge = istKlinge(title);
  // ⚠️ PUBLIZIEREN MIT QUITTUNG (22.08.2026, Ursache nachgewiesen). Frueher stand hier ein
  // reines `await sgql(...)`: Die Mutation fragte userErrors ab, aber niemand LAS die
  // Antwort. Faellt eine einzelne Publikation aus, landet das Produkt in fuenf von sechs
  // Kanaelen — und keiner merkt es. Nachgewiesen am Polohemd 15508310557057: Die
  // Shopify-Ereignisliste zeigt «included on» fuer Online Store, Shop, TikTok, Facebook und
  // Pinterest — Google & YouTube fehlt, und es gibt auch kein «removed». Es wurde also nie
  // publiziert, nicht spaeter entfernt. Google ist der EINZIGE Kanal mit belegten
  // Verkaeufen; 85 Neuprodukte in drei Tagen fehlten dort.
  await publishVerified(t, spid, klinge);
  if (d.productVideo && /^https/.test(d.productVideo)) await attachVideo(t, spid, d.productVideo, String(pid).slice(-6));
  fs.appendFileSync(LEDGER, 'cj:' + pid + '\n');
  angelegt++;
  if (st) { st.angelegt++; relSumme.angelegt++; }
  console.log(`✅ ${title} → ${spid.split('/').pop()} (CHF ${chf(d.sellPrice, d.variants?.[0]?.variantWeight)})`);
}
// ⚠️ 02.09.2026: Fehlen die Texte fuer ALLE gefundenen Produkte (Groq-Schluessel/Modell), darf der
// Queue-Runner den Suchbegriff NICHT quittieren — Exit 3 haelt ihn offen (RC≠0-Zweig).
jobFertig();
{ const sum = [...suchStand.values()].reduce((a, x) => a + x.n, 0);
  if (suchStand.size) console.log(`RELEVANT\t${sum}\tgesamt\t(${suchStand.size} Suchaufträge, ${relSumme.irrelevant} irrelevant verworfen, ${relSumme.angelegt} angelegt)`); }
if (ohneText > 0 && angelegt === 0) { console.error(`ABBRUCH: ${ohneText} Produkte gefunden, aber keine Texte (Groq?) — Exit 3`); process.exit(3); }
console.log('FERTIG.');
