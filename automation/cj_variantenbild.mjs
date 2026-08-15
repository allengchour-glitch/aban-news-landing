#!/usr/bin/env node
/* cj_variantenbild.mjs — jede Farbvariante bekommt ihr eigenes Bild, aus der Quelle belegt.
 *
 * DER BEFUND (Betreiber, 14.08.2026, am «Midikleid mit Zopfmuster und Blumenprint»): «das
 * hellblaue ist noch klar, aber die andern? kann man das bild besser beschreiben, dass man
 * weiss welches? das überall bei anderen produkten auch machen mit mehrauswahl». Acht Farben,
 * acht Bilder, vierzig Varianten — und keine einzige Variante trägt ein Bild. Wer «Aprikose»
 * wählt, sieht weiterhin dasselbe Foto. Katalogweit haben 11'027 aktive Produkte mehrere
 * Farben und mehrere Bilder.
 *
 * ⛔ DER ERSTE VERSUCH WAR FALSCH, UND ZWAR MESSBAR. `variantenbild.py` bestimmte den
 * vorherrschenden Farbton jedes Bildes und ordnete danach zu. Im scharfen Probelauf kamen aus
 * 40 Produkten zwei Zuordnungen — und BEIDE waren falsch: ein schwarzes Carbon-Portemonnaie
 * wurde «Dunkelblau» (blau war nur der unscharfe Lichterhintergrund), ein braunes wurde «Rot»
 * (Braun liegt im Farbtonkreis dort, wo Rot steht). Ein falsch zugeordnetes Bild ist
 * schlimmer als gar keines: die Kundin bestellt dann bewusst etwas anderes, als sie sieht.
 * Das Skript ist seither gesperrt.
 *
 * DIESER WEG RÄT NICHT. CJ liefert zu JEDER Variante ein `variantImage` samt `variantSku`,
 * und genau diese SKU steht bei uns als «CJ-<variantSku>» an der Shopify-Variante. Die
 * Zuordnung ist also ein Nachschlagen, keine Schätzung. Gegengeprüft an drei Produkten:
 * 6 von 6, 29 von 29 und 43 von 43 Varianten hatten ein eigenes Bild.
 *
 * ⚠️ `mediaSrc` IN `productVariantsBulkUpdate` TUT NICHTS — die Mutation meldet Erfolg und es
 * passiert nichts (zweimal live gegengeprüft). Wirksam ist nur: `productCreateMedia` gibt die
 * Medien-IDs in der Reihenfolge der Eingabe zurück, danach hängt `mediaId` sie an. Das greift
 * schon im Status UPLOADED.
 *
 * ⚠️ JEDE BILD-URL VORHER AUF 200 PRÜFEN. CJ-Pfade sind manchmal tot; ein FAILED-Medium
 * hängt sonst dauerhaft am Produkt (so stand «Outdoor Camping Gerades Messer» mit sieben
 * FAILED-Medien und keinem sichtbaren Bild live im Google-Kanal).
 *
 * ⚠️ NIE AN POSITION 0. Neue Medien werden hinten angehängt, das Hauptbild bleibt also
 * unberührt — nach dem Lauf wird trotzdem nachgesehen, denn ein Video oder eine Miniatur an
 * erster Stelle kostet in der Kollektionskachel und im Google-Feed das `image_link`.
 *
 * ENV: CJ_TOKEN · CAP=300 (Produkte pro Lauf, je ~10 CJ-Punkte) · DRY=1
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2024-10';
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json')
  ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
const DRY = process.env.DRY === '1';
const CAP = parseInt(process.env.CAP || '300', 10);
const LEDGER = 'dropship/_cj_variantenbild.txt';
const FARBE = new Set(['farbe', 'color', 'couleur', 'ausführung', 'ausfuehrung']);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sgql(q, v) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
        method: 'POST', signal: AbortSignal.timeout(90000),
        headers: { 'X-Shopify-Access-Token': fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim(),
                   'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: v || {} }) });
      const j = await r.json();
      if (j.data) return j;
    } catch { /* Netz-Zucker */ }
    await sleep(3000 * (i + 1));
  }
  return { data: null };
}

let punkteWeg = false;
async function cj(path) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path,
        { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
      const t = await r.text();
      let j; try { j = JSON.parse(t); } catch { await sleep(2500 * (i + 1)); continue; }
      if (Number(j.code) === 16900500) { punkteWeg = true; return j; }
      if (Number(j.code) === 1600200) { await sleep(2500 * (i + 1)); continue; }
      return j;
    } catch { await sleep(2500 * (i + 1)); }
  }
  return { code: 0, data: null };
}

// Siehe cj_video_backfill.mjs: in der Shopify-SKU steckt die VARIANTEN-SKU. Die Produkt-SKU
// entsteht, indem die laufende Nummer samt Buchstabenpaar («01AZ», «06FU») wegfällt.
function cjSchluessel(sku) {
  if (!sku || !sku.startsWith('CJ-')) return [];
  const rest = sku.slice(3);
  if (/^\d{15,}$/.test(rest)) return [{ pid: rest }];
  const kopf = rest.split('-')[0];
  if (kopf.length < 6) return [];
  const kurz = kopf.replace(/\d{2}[A-Z]{2}$/, '');
  return [...new Set([kurz, kopf])].filter(x => x.length >= 6).map(productSku => ({ productSku }));
}

async function lebt(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
    return r.ok;
  } catch { return false; }
}

// ⚠️ DIE LIEFERANTENBILDER SIND OFT WERBEPLAKATE. Beim ersten scharfen Lauf holte dieses
// Skript für einen «LED-Projektor» sechs Variantenbilder herein, auf denen «MAGCUBIC
// PROJECTOR» stand, dazu die Logos von Netflix, YouTube, Disney+, Prime Video und Hulu,
// der Satz «Usage Area: Hong Kong China + Taiwan China …» und ein Angebot über ein
// «99 yuan value gift package». Fremde Marken im Produktbild sind bei Google ein
// Sperrgrund, und der Kundin sagt so ein Plakat nichts über die Variante.
//
// ⚠️ DIE GRENZE LIEGT HIER HÖHER ALS BEIM HAUPTBILD (10 statt 4 Wörter), und zwar nach
// Ansicht der Grenzfälle, nicht nach Gefühl. Bei 4 Wörtern standen in der Ecke Angaben wie
// «With Metallic Belt Boxes» / «With Chain Without Box» (Perlenset) und «Audio cable /
// Charging cable» (Kopfhörer) — genau die Auskunft, die die Kundin beim Umschalten sucht,
// auf einem ansonsten sauberen Produktfoto. Ein weisser und ein schwarzer Kopfhörer, richtig
// zugeordnet, sind mehr wert als die Reinheit von vier Wörtern; ohne das Bild sieht sie
// wieder gar nichts. Ab zehn Wörtern kippt es: dort standen Plakate mit 14, 23 und 35
// Wörtern samt fremden Logos. Ein unlesbares Bild (-1) gilt NICHT als sauber.
function textFrei(url) {
  try {
    const r = spawnSync('python3', ['automation/bildtext_pruefen.py', '--url', url],
                        { encoding: 'utf8', timeout: 120000 });
    const n = parseInt(String(r.stdout || '').trim().split('\n').pop(), 10);
    return Number.isFinite(n) && n >= 0 && n < 10;
  } catch { return false; }
}

async function main() {
  if (!CJT) { console.log('kein CJ-Token'); return; }
  const erledigt = new Set(fs.existsSync(LEDGER)
    ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(l => l.split('\t')[0]).filter(Boolean) : []);

  const kand = [];
  let cursor = null;
  // ⭐ PRIORITÄTEN ZUERST (15.08.2026): Das «Midikleid mit Zopfmuster» — der Befund, mit dem
  // die Betreiberin diese ganze Arbeit angestossen hat — wäre in Katalogreihenfolge erst nach
  // Tausenden anderen drangekommen. Produkte in dropship/_cj_variantenbild_prio.txt werden
  // vor der Pagination geprüft (eine GID je Zeile; das Ledger dedupt wie üblich).
  const PRIO='dropship/_cj_variantenbild_prio.txt';
  if (fs.existsSync(PRIO)) {
    for (const zeile of fs.readFileSync(PRIO,'utf8').split('\n')) {
      const gid=zeile.trim();
      if (!gid || erledigt.has(gid)) continue;
      const r=await sgql(`query($id:ID!){product(id:$id){id title status options{name values}
          variants(first:100){nodes{id sku image{url}}}}}`,{id:gid});
      const n=r.data?.product;
      if (!n || n.status!=='ACTIVE') continue;
      const fo=n.options.find(o=>FARBE.has(o.name.toLowerCase()));
      if (!fo || (fo.values||[]).length<2) continue;
      const vs=n.variants.nodes;
      if (vs.some(v=>v.image)) continue;
      const s2=cjSchluessel(vs[0]?.sku||'');
      if (s2.length) kand.push({id:n.id,titel:n.title,s:s2,vs});
    }
    if (kand.length) console.log(`Prioritäten vorangestellt: ${kand.length}`);
  }
  for (let seite = 0; seite < 500; seite++) {
    const r = await sgql(`query($c:String){products(first:40,after:$c,query:"status:active tag:cj-real"){
        pageInfo{hasNextPage endCursor}
        nodes{id title options{name values}
              variants(first:100){nodes{id sku image{url}}}}}}`, { c: cursor });
    const p = r.data?.products; if (!p) break;
    for (const n of p.nodes) {
      if (erledigt.has(n.id)) continue;
      const fo = n.options.find(o => FARBE.has(o.name.toLowerCase()));
      if (!fo || (fo.values || []).length < 2) continue;
      const vs = n.variants.nodes;
      if (vs.some(v => v.image)) continue;                 // hat schon Variantenbilder
      const s = cjSchluessel(vs[0]?.sku || '');
      if (s.length) kand.push({ id: n.id, titel: n.title, s, vs });
    }
    if (!p.pageInfo.hasNextPage || kand.length >= CAP) break;
    cursor = p.pageInfo.endCursor;
  }
  console.log(`Produkte mit Farbwahl, aber ohne Variantenbilder: ${kand.length}`);
  if (DRY) { for (const k of kand.slice(0, 8)) console.log('   ', k.titel.slice(0, 46), k.vs.length, 'Varianten'); return; }

  let ok = 0, varianten = 0, ohne = 0, offen = 0;
  for (const k of kand.slice(0, CAP)) {
    let j = { code: 0 };
    for (const form of k.s) {
      j = await cj(form.pid ? `/product/query?pid=${form.pid}`
                            : `/product/query?productSku=${form.productSku}`);
      if (punkteWeg || Number(j.code) === 200) break;
      await sleep(2500);
    }
    if (punkteWeg) { console.log('⛔ CJ-Tagesbudget erschöpft — Lauf beendet, Ledger bleibt gültig'); break; }
    // Eine fehlgeschlagene Anfrage ist kein «hat keine Bilder» — sie bleibt offen.
    if (Number(j.code) !== 200) { offen++; await sleep(2000); continue; }

    // ⚠️ ES GIBT ZWEI SKU-FORMEN IM KATALOG, weil zwei Importer sie unterschiedlich bauen.
    // `cj_category_fill.mjs` schreibt «CJ-<variantSku>» (also CJ-CJYD292641702BY), die
    // älteren `cj_sku_import`/`cj_trending_import` schreiben «CJ-<erste variantSku>-<Farbe>»
    // — bei einem Rücksitz-Organizer trugen ALLE drei Varianten dieselbe SKU-Basis
    // CJYD292641701AZ und unterschieden sich nur im angehängten «Black»/«Khaki»/«Army
    // Green». Ein reiner SKU-Vergleich fand deshalb im ersten Lauf 0 von 3 Produkten. Der
    // Anhang ist aber exakt CJs `variantKey`, also weiterhin ein Nachschlagen und keine
    // Schätzung.
    const nachSku = {}, nachKey = {};
    for (const v of (j.data?.variants || [])) {
      const u = String(v.variantImage || '').trim();
      if (!/^https/.test(u)) continue;
      if (v.variantSku) nachSku['CJ-' + v.variantSku] = u;
      if (v.variantKey) nachKey[String(v.variantKey).trim().toLowerCase()] = u;
    }
    const bildVon = sku => {
      if (nachSku[sku]) return nachSku[sku];
      const i = sku.indexOf('-', 3);
      if (i < 0) return null;
      return nachKey[sku.slice(i + 1).trim().toLowerCase()] || null;
    };
    const cjv = {};
    for (const v of k.vs) { const u = bildVon(v.sku || ''); if (u) cjv[v.sku] = u; }
    const paare = k.vs.filter(v => cjv[v.sku]);
    if (!paare.length) {
      ohne++; fs.appendFileSync(LEDGER, `${k.id}\tkeine-passende-sku\n`); await sleep(2000); continue;
    }

    const urls = [...new Set(paare.map(v => cjv[v.sku]))];
    const gut = [];
    for (const u of urls) if (await lebt(u) && textFrei(u)) gut.push(u);
    if (!gut.length) {
      ohne++; fs.appendFileSync(LEDGER, `${k.id}\tbild-urls-tot\n`); await sleep(2000); continue;
    }
    const cm = await sgql(`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}`,
      { id: k.id, m: gut.map(u => ({ originalSource: u, mediaContentType: 'IMAGE' })) });
    const neu = cm.data?.productCreateMedia?.media || [];
    // ⚠️ Die Zuordnung lebt allein von der Reihenfolge. Kommt eine andere Zahl zurück, ist
    // nicht mehr sicher, welches Medium zu welcher URL gehört — dann lieber nichts anhängen.
    if (neu.length !== gut.length) {
      offen++; fs.appendFileSync(LEDGER, `${k.id}\tmedien-anzahl-weicht-ab\n`); await sleep(1500); continue;
    }
    const zu = {}; gut.forEach((u, i) => zu[u] = neu[i].id);
    const ein = paare.filter(v => zu[cjv[v.sku]]).map(v => ({ id: v.id, mediaId: zu[cjv[v.sku]] }));
    let n = 0;
    for (let i = 0; i < ein.length; i += 25) {
      const teil = ein.slice(i, i + 25);
      const r = await sgql(`mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}`,
        { p: k.id, v: teil });
      const e = r.data?.productVariantsBulkUpdate?.userErrors || [];
      if (e.length) { console.log('  ⚠️', JSON.stringify(e[0]).slice(0, 90)); break; }
      n += teil.length;
    }
    if (n) {
      ok++; varianten += n;
      fs.appendFileSync(LEDGER, `${k.id}\tzugeordnet\t${n}\t${k.titel.slice(0, 60)}\n`);
      if (ok % 20 === 0) console.log(`   ${ok} Produkte · ${varianten} Varianten mit eigenem Bild`);
    } else { offen++; fs.appendFileSync(LEDGER, `${k.id}\tanhaengen-fehlgeschlagen\n`); }
    await sleep(1500);
  }
  // ⚠️ «FERTIG» NUR SCHREIBEN, WENN ES AUCH FERTIG IST. Der Aufseher überspringt jeden Lauf,
  // dessen Log mit «FERTIG» beginnt — steht das Wort nach einem Abbruch wegen leerem
  // CJ-Punktebudget da, startet der Lauf NIE wieder, und die restlichen ~2'700 Produkte
  // blieben für immer ohne Variantenbilder. Genau so wäre der erste Lauf (25 Produkte,
  // dann Budget leer) als erledigt vom Tisch gewesen.
  const kopf = punkteWeg ? 'PAUSE (CJ-Punkte leer, morgen weiter)' : 'FERTIG';
  console.log(`${kopf}: ${ok} Produkte, ${varianten} Varianten zeigen jetzt ihr eigenes Bild. `
            + `${ohne} ohne passende Lieferantendaten, ${offen} offen (bleiben für den nächsten Lauf).`);
}

main();
