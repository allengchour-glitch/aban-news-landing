#!/usr/bin/env node
/* cj_sku_import.mjs — importiert GEZIELTE CJ-Produkte (SKU oder Suchbegriff), z. B. wenn der
 * User Screenshots aus der CJ-App schickt. Volle Pipeline: query → Groq-DE-Texte → Varianten →
 * alle Bilder → Video (staged upload) → 6 Kanäle → Ledger + Titel-Dubletten-Wache.
 * ENV: CJ_TOKEN · SHOPIFY_CLIENT_ID/SECRET · GROQ_API_KEY[2] · ITEMS="sku:CJJT…,search:dog football"
 * ⚠️ CJ-QPS: Engine (cj_perpetual) vorher stoppen — 1 req/s kontoweit!
 */
import fs from 'node:fs';
import { istKlinge } from './klingenregel.mjs';
import { schonBeansprucht } from './cj_claim.mjs';
import { catTags } from './cat_tags.mjs';
import { produktSaeubern } from './marken_filter.mjs';
import { echoVomLieferanten } from './titel_sprache.mjs';
import { technikWache } from './technik_plausibel.mjs';
import { produktdetails } from './cj_specs.mjs';
import { googleKategorie } from './google_kategorie.mjs';
import { copyPrompt, messSicher, wirkSicher, wahlSicher} from './cj_copy_prompt.mjs';
import { groqText } from './groq_text.mjs';
import { medizinZweck } from './medizin_zweck.mjs';
import { tierschutzGeraet } from './tierschutz_geraet.mjs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
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
async function sgql(t, q, v) { const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t }, body: JSON.stringify({ query: q, variables: v }) }); return r.json(); }

const GROQ_KEYS = [(process.env.GROQ_API_KEY || ''), (process.env.GROQ_API_KEY2 || '')].filter(Boolean);
// 'llama-3.3-70b-versatile' wird am 16.08.2026 abgeschaltet — aus der Reihe genommen.
// Modellwahl + Parser liegen seit 02.09.2026 in automation/groq_text.mjs (EINE Quelle).
async function groq(nameEn, feats) {
  // messSicher(): harte Pruefung der Modellantwort auf Messwerte bei Wearables — ein
  // Prompt-Verbot allein hat am 04.09. nicht gereicht (siehe cj_copy_prompt.mjs).
  // ⚠️ 07.09.2026: Dieser Importer legt IMMER eine Standard-Variante an (Zeile ~212) —
  // ein Auswahl-Versprechen im Text ist hier also nie gedeckt. wahlSicher() schneidet
  // solche Saetze deterministisch heraus; ein Modell kann die Prompt-Regel ignorieren.
  return wahlSicher(wirkSicher(messSicher(await groqText(copyPrompt({ nameEn, feats, kat: '' })))));
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

const ITEMS = (process.env.ITEMS || '').split(',').map(s => s.trim()).filter(Boolean);
if (!ITEMS.length) { console.error('ITEMS fehlt (sku:… oder search:…)'); process.exit(1); }
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.replace('cj:', '').trim()) : []);
const t = await shTok();
const SET = `mutation($i:ProductSetInput!){ productSet(synchronous:true,input:$i){ product{id} userErrors{field message} } }`;

let ohneText = 0, angelegt = 0;
for (const item of ITEMS) {
  const [kind, ...rest] = item.split(':'); const val = rest.join(':');
  let pid = null;
  if (kind === 'pid') {
    // Direkte Produkt-ID (15.08.2026, Schulstart-Import): die Kandidaten sind schon
    // recherchiert, eine erneute Textsuche würde nur Punkte kosten und anders treffen.
    pid = val.trim();
  } else if (kind === 'sku') {
    const j = await cj(`/product/query?productSku=${encodeURIComponent(val)}`); await sleep(1300);
    pid = j.data?.pid;
  } else {
    // Tiefer paginieren (CJPAGES, Default 5): Top-Treffer sind bei 10k+-Ledger längst importiert
    const PAGES = parseInt(process.env.CJPAGES || '5', 10);
    for (let pg = 1; pg <= PAGES && !pid; pg++) {
      const WH = (process.env.WH || '').trim(); // z.B. WH=DE → nur EU-Lager (Schnellversand in die CH)
      const j = await cj(`/product/list?pageSize=10&pageNum=${pg}&productNameEn=${encodeURIComponent(val)}${WH ? `&countryCode=${WH}` : ''}`); await sleep(1300);
      const list = j.data?.list || [];
      if (!list.length) break;
      // Relevanz-Wache: CJ-Textsuche streut (Küchenlöffel bei «selfie stick»!) —
      // Kandidat muss mind. 1 Suchwort (>3 Zeichen) im productNameEn tragen.
      const kws = val.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      for (const cand of list) {
        const name = (cand.productNameEn || '').toLowerCase();
        const hits = kws.filter(w => name.includes(w)).length;
        if (kws.length && hits < Math.min(2, kws.length)) continue; // ≥2 Wörter bei mehrwortiger Suche («shower caddy»≠Duschkopf)
        // MOQ-Wache (2026-07-11, User-Fund VerveBuds MOQ 10): NUR ORDINARY_PRODUCT (CJ-Lager, Einzel-Dropship
        // MOQ 1). SUPPLIER_SHIPPED_PRODUCT/SUPPLIER_PRODUCT = Lieferant-Direkt, oft MOQ>1 → nicht einzeln fulfillbar.
        const pt = cand.productType || '';
        if (pt && pt !== 'ORDINARY_PRODUCT' && pt !== 'DIY_PRODUCT') { continue; }
        if (!done.has(String(cand.pid))) { pid = cand.pid; break; }
      }
    }
  }
  if (!pid) { console.log('✗ nicht gefunden/alles schon da:', item); continue; }
  if (done.has(String(pid))) { console.log('= schon importiert:', item); continue; }
  const dj = await cj(`/product/query?pid=${pid}`); await sleep(1300);
  const d = dj.data || {};
  const imgs = (d.productImageSet || []).filter(u => /^https/.test(u)).slice(0, 20);
  if (imgs.length < 2) { console.log('✗ zu wenig Bilder:', item); continue; }
  const feats = (d.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const g = await groq(d.productNameEn || val, feats);
  if (!g) { console.log('✗ keine Texte:', item); ohneText++; continue; }
  // Marken-Filter (14.08.2026), siehe automation/marken_filter.mjs
  const ms = produktSaeubern(g.title, g.html);
  if (ms.verdacht) { console.log('✗ Markenbezug, übersprungen:', item); continue; }
  g.title = ms.title; g.html = ms.html;
  // 🇩🇪 Titel-Sprachwache (20.08.2026): der Übersetzer liefert die Beschreibung deutsch, den
  // Titel aber manchmal roh aus dem CJ-Listing. Begründung + Testfälle: automation/titel_sprache.mjs.
  // Erst ein zweiter Versuch, dann überspringen (kein Ledger-Eintrag → kommt später erneut dran).
  {
   const quelle = d.productNameEn || val;
   if (echoVomLieferanten(g.title, quelle)) {
    const g2 = await groq(quelle, feats);
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
  const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 46) + '-' + String(pid).slice(-6);
  const tagsFinal = [...new Set([...(med ? ['medizinprodukt-pruefen', 'medizin-zweck-' + med.grund] : []),
      ...(tsch ? ['tierschutz-tschv76', 'tierschutz-' + tsch.grund] : []),
      ...((med || tsch) ? [] : ['trend', 'viral', 'video-hit']), 'cj-real', 'dropship', 'neu', 'neuheit',   // «neuheit» speist die Startseiten-Reihe (03.09.)
      ...((process.env.WH || '').trim() ? ['schnell-versand', 'eu-lager'] : []),
      ...catTags(`${title} ${d.productNameEn || ''} ${val || ''}`)])];
  const input = { title, handle: slug, productType: 'Trend-Produkt', vendor: 'LuxeStyle',
    status: (med || tsch) ? 'DRAFT' : 'ACTIVE',
    tags: tagsFinal,
    descriptionHtml: (g.html + '\n' + produktdetails(d, title) + '\n<p>🚚 Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>').replace(/ß/g, 'ss').replace(/ẞ/g, 'SS'),
    seo: { title: (title + ' | LuxeStyle CH').slice(0, 70), description: snippet(g.html, title).slice(0, 320) },
    productOptions: [{ name: 'Variante', values: [{ name: 'Standard' }] }],
    variants: [{ optionValues: [{ optionName: 'Variante', name: 'Standard' }], price: chf(d.sellPrice, d.variants?.[0]?.variantWeight), inventoryItem: { sku: ('CJ-' + pid).slice(0, 70), tracked: false, cost: kosten(d.sellPrice, d.variants?.[0]?.variantWeight), ...gewicht(d.variants?.[0]?.variantWeight) }, inventoryPolicy: 'CONTINUE' }],
    // ⚠️ GOOGLE-FELDER GEHÖREN IN DEN IMPORTER, nicht in einen Backfill (15.08.2026: die 30
    // neuesten Produkte hatten genau 3 ohne condition/custom_product — alle drei aus DIESEM
    // Skript. cj_category_fill schreibt sie seit dem 11.08., hier fehlten sie: die Abdeckung
    // wäre mit jedem Queue-Import wieder gesunken, exakt das condition-Muster vom 11.08.).
    // Kategorie bewusst NICHT geraten — die setzt google_kategorie.mjs aus Titel/Tags.
    metafields: [
      // google_product_category gleich mit — dieselbe Funktion wie im Kategorie-Grind;
      // ohne sie fiele die 87-%-Abdeckung mit jedem Queue-Import zurück (Muster 11./12.08.).
      ...(function(){const g=googleKategorie(title,tagsFinal,'Trend-Produkt');
        return g?[{namespace:'mm-google-shopping',key:'google_product_category',value:g,type:'single_line_text_field'}]:[];})(),
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
  // Hausregel 12.08.: Klingen (auch Küchenmesser) nie in den Google-Kanal.
  // Regel seit 29.08.2026 EINMAL in klingenregel.json (vorher fuenf Kopien).
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
  console.log(`✅ ${title} → ${spid.split('/').pop()} (CHF ${chf(d.sellPrice, d.variants?.[0]?.variantWeight)})`);
}
// ⚠️ 02.09.2026: Fehlen die Texte fuer ALLE gefundenen Produkte (Groq-Schluessel/Modell), darf der
// Queue-Runner den Suchbegriff NICHT quittieren — Exit 3 haelt ihn offen (RC≠0-Zweig).
if (ohneText > 0 && angelegt === 0) { console.error(`ABBRUCH: ${ohneText} Produkte gefunden, aber keine Texte (Groq?) — Exit 3`); process.exit(3); }
console.log('FERTIG.');
