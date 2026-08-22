/* cj_kosten_backfill.mjs — trägt «Kosten pro Artikel» für bestehende CJ-Produkte nach.
 *
 * DER BEFUND (20.08.2026): Von 300 geprüften aktiven Produkten hatten nur 43 einen
 * Einkaufspreis hinterlegt. Ohne ihn zeigt Shopify keinen Gewinn je Bestellung an — und
 * niemand kann sagen, ob ein Verkauf etwas einbringt. Bei Order #1011 (Hängematte CHF 14.90
 * plus CHF 7 Versand) ist das keine akademische Frage: Die Stückkosten liegen dort bei rund
 * CHF 17.70, das Geschäft trägt sich nur über den Versanderlös.
 *
 * KOSTENDEFINITION: Warenkosten (CJ-Preis in USD × 0.9) + VOLLE Fracht (max(15, 3.4+16.3·kg)).
 * Die CHF 7 Versand, die der Kunde zahlt, sind Erlös und stehen in der Bestellung — sie
 * gehören NICHT in die Stückkosten, sonst rechnet sich die Marge künstlich schön.
 * ⚠️ Bei Mehrfach-Bestellungen wird die Fracht so mehrfach gezählt, weil CJ mehrere Artikel
 * zusammen versendet. Der Wert ist also KONSERVATIV — er beschönigt nie, er untertreibt eher.
 * Fünf der ersten sechs Bestellungen enthielten genau einen Artikel; für diesen Fall stimmt er.
 *
 * Braucht CJ-Punkte (product/query je pid). Bricht bei leerem Budget sauber mit PAUSE ab,
 * der Ledger bleibt gültig und der nächste Lauf macht weiter.
 */
import fs from 'node:fs';

const SHOP = 'au3j0y-hq.myshopify.com';
const TOK = (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '').trim();
const CJT = (() => { try { return JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken; } catch { return ''; } })();
const LEDGER = 'dropship/_cj_kosten_done.txt';
const LIMIT = parseInt(process.env.LIMIT || '400', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const kosten = (usd, grams) => {
  const u = parseFloat(('' + usd).split('--')[0]) || 0;
  const kg = (parseFloat(grams) || 0) / 1000;
  const freight = Math.max(15, 3.4 + 16.3 * kg);
  return (u * 0.9 + freight).toFixed(2);
};

async function sgql(q, v) {
  // ⚠️ 21.08.2026: DROSSELUNG IST KEIN FEHLER, SONDERN EINE WARTEANWEISUNG.
  // Der Aufrufer deutete eine leere Antwort als «Shopify antwortet nicht» und brach den
  // ganzen Lauf ab. In Wahrheit kam `{"errors":[{"message":"Throttled"}]}` — die Abfrage
  // kostet 149 Punkte, verfügbar waren 46, weil die übrigen Engines dasselbe Kontingent
  // teilen. Ergebnis: Der Backfill kam an einem ganzen Tag über 17 Produkte nicht hinaus,
  // und das eigens reservierte Vorrang-Fenster (16:00–17:30) verpuffte.
  // Shopify füllt mit 100 Punkten/Sekunde auf; wer wartet, kommt durch.
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': TOK, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: v || {} }),
        signal: AbortSignal.timeout(60000),
      });
      const j = await r.json();
      if (j.data) return j;
      const gedrosselt = JSON.stringify(j.errors || '').includes('THROTTLED');
      if (gedrosselt) {
        // Fehlende Punkte durch die Auffüllrate teilen — plus Sicherheitszuschlag.
        const st = j.extensions?.cost?.throttleStatus;
        const fehlt = st ? Math.max(0, (j.extensions.cost.requestedQueryCost || 100) - st.currentlyAvailable) : 100;
        const wartenMs = Math.min(20000, 1000 + (fehlt / (st?.restoreRate || 100)) * 1000);
        await sleep(wartenMs);
        continue;
      }
    } catch {}
    await sleep(2500);
  }
  return {};
}

// ⚠️ CJs DROSSELUNG IST GUELTIGES JSON (22.08.2026, vierter Fall dieser Fehlerklasse).
// Diese Funktion machte EINEN Versuch ohne Wiederholung. CJ antwortet unter Last mit
// {"code":1600200,"message":"Too Many Requests, QPS limit is 1 time/1second"} — das parst
// sauber, hat kein `result`, und der Aufrufer schrieb das Produkt als «cj-ohne-antwort»
// INS LEDGER. Damit war es fuer immer uebersprungen (dieselbe Falle wie bei den falsch
// quittierten Ledger-Zeilen des Probelaufs vom 20.08.).
// Ergebnis nach Tagen Laufzeit: 346 Produkte faelschlich abgehakt, 1 einziger echter
// Einkaufspreis gesetzt. CJ zaehlt 1 Anfrage/Sekunde ueber ALLE Prozesse gemeinsam; mit
// vier Grind-Runnern verliert dieser Lauf das Rennen fast immer.
async function cj(pfad) {
  for (let versuch = 0; versuch < 8; versuch++) {
    let t;
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/' + pfad,
        { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
      t = await r.text();
    } catch { await sleep(Math.min(20000, 1500 * (versuch + 1))); continue; }
    let j;
    try { j = JSON.parse(t); }
    catch { await sleep(Math.min(20000, 1500 * (versuch + 1))); continue; }
    // Drosselung aussitzen statt als Ausfall quittieren.
    if (String(j.code) === '1600200' || /Too Many Requests/i.test(String(j.message || ''))) {
      await sleep(1500 + versuch * 700); continue;
    }
    return j;
  }
  // Nach acht Versuchen: als UNKLAR melden, damit der Aufrufer NICHT quittiert.
  return { result: false, gedrosselt: true, message: 'CJ nach 8 Versuchen ohne verwertbare Antwort' };
}

async function main() {
  if (!TOK || !CJT) { console.log('PAUSE (Token fehlt)'); return; }
  const erledigt = new Set(fs.existsSync(LEDGER)
    ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(l => l.split('\t')[0]).filter(Boolean) : []);
  let cursor = null, geprueft = 0, gesetzt = 0, ohne = 0;
  while (gesetzt + ohne < LIMIT) {
    const q = await sgql(`query($c:String){products(first:50,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor}
      nodes{id title variants(first:100){nodes{id sku inventoryItem{id unitCost{amount}}}}}}}`, { c: cursor });
    const pr = q.data?.products;
    if (!pr) { console.log('PAUSE (Shopify antwortet nicht)'); break; }
    for (const p of pr.nodes) {
      geprueft++;
      if (erledigt.has(p.id)) continue;
      const vs = p.variants.nodes;
      if (vs.some(v => v.inventoryItem?.unitCost)) { erledigt.add(p.id); continue; }   // hat schon Kosten
      // ⚠️ DIE SKU HAT VIER FORMEN (live gezählt 20.08.2026), ein Muster reicht nicht:
      //   CJ-2501090747091600500          → Zahlen-pid       → product/query?pid=
      //   CJ-EC52E079-9BEF-4475-...       → UUID-pid         → product/query?pid=
      //   CJ-CJYD243817501AZ / CJYD…      → VARIANTEN-SKU    → product/variant/query?variantSku=
      // Ein Muster nur auf \d{10,} fand im ersten Probelauf 0 von 50 Produkten.
      const sku = (vs[0]?.sku || '');
      let j = null;
      const mPid = sku.match(/^CJ-(\d{10,}|[0-9A-F]{8}-[0-9A-F-]{20,})$/i);
      // ⚠️ Der Variantenzusatz fehlte im Muster (22.08.2026): «CJ-CJJJCFCF00364-Green»
      // passte NICHT, weil das Muster am Kern endete. Solche SKUs landeten als
      // «keine-cj-referenz» — obwohl CJ sie kennt. Der Zusatz ist jetzt optional.
      const mVar = sku.match(/^(?:CJ-)?(CJ[A-Z]{2}[0-9A-Z]{4,}?)(?:-.*)?$/i);
      if (mPid)      j = await cj(`product/query?pid=${mPid[1]}`);
      // ⚠️ DER PARAMETER HIESS FALSCH (22.08.2026). Der Code fragte `variantSku=`; CJ
      // antwortet darauf «pid or productSku must be not empty» — result:false, also
      // quittierte der Lauf JEDES dieser Produkte als «cj-ohne-antwort». Richtig ist
      // `productSku=`; damit liefert CJ result:true samt variantSellPrice UND variantWeight.
      else if (mVar) {
        j = await cj(`product/variant/query?productSku=${mVar[1]}`);
        // ⚠️ FÜNFTE SKU-FORM (22.08.2026). `productSku=` heisst wörtlich PRODUKT-SKU —
        // eine VARIANTEN-SKU kennt CJ unter diesem Parameter NICHT. Der Modemodus des
        // Importers schreibt aber genau die (Zeile 157 cj_category_fill.mjs: `v.variantSku`),
        // und die trägt hinten die Variantennummer:
        //   CJBQ291505701AZ  (Variante)  →  CJBQ2915057  (Produkt)  →  code 200
        // Ohne diesen zweiten Versuch quittierte der Lauf 126 Produkte als
        // «cj-ohne-antwort», obwohl CJ sie alle kennt. Das Muster ist eng gefasst
        // (zwei Ziffern + zwei Grossbuchstaben am Ende), damit «CJJJJTJT35117» und
        // «CJJJCFCF00364» — beides ECHTE Produkt-SKUs — unangetastet bleiben.
        const stamm = mVar[1].match(/^(.*[0-9])\d{2}[A-Z]{2}$/i);
        if (!j.result && !j.gedrosselt && stamm) {
          await sleep(1200);
          j = await cj(`product/variant/query?productSku=${stamm[1]}`);
        }
      }
      else { ohne++; fs.appendFileSync(LEDGER, `${p.id}\tkeine-cj-referenz\n`); continue; }
      // ⚠️ 21.08.2026 — DIESE PRÜFUNG WAR DER GRUND, WARUM DER BACKFILL NIE LIEF.
      // Sie suchte im Antworttext nach «point». CJ hängt aber an JEDE Antwort den Block
      //   "pointsInfo":{"total":61171,"usedToday":101960,"remaining":455}
      // — das Wort steht also immer drin. Der Lauf hielt jede Antwort für ein leeres
      // Budget und brach beim ERSTEN CJ-Aufruf ab; nach einem ganzen Tag standen 17
      // Produkte im Ledger. Gelesen wird jetzt die ZAHL, nicht das Wort.
      const rest = j?.pointsInfo?.remaining;
      if (typeof rest === 'number' && rest < 20) {
        console.log(`PAUSE (CJ-Punkte fast leer: ${rest}, morgen weiter)`); return;
      }
      if (!j.result) {
        if (/1690050/.test(JSON.stringify(j))) { console.log('PAUSE (CJ meldet leeres Budget)'); return; }
        // ⚠️ NICHT quittieren, wenn CJ nur gedrosselt hat — sonst ist das Produkt fuer
        // immer abgehakt, ohne je gefragt worden zu sein.
        if (j.gedrosselt) { ohne++; await sleep(2000); continue; }
        ohne++; fs.appendFileSync(LEDGER, `${p.id}\tcj-ohne-antwort\n`); await sleep(1200); continue;
      }
      // Die Variantenabfrage liefert eine LISTE, die Produktabfrage ein Objekt.
      const d = Array.isArray(j.data) ? (j.data[0] || {}) : (j.data || {});
      const preis = d.sellPrice ?? d.variantSellPrice ?? d.variantSugSellPrice;
      const gew   = d.productWeight ?? d.variantWeight;
      if (preis == null) { ohne++; fs.appendFileSync(LEDGER, `${p.id}\tcj-ohne-preis\n`); await sleep(1200); continue; }
      const c = kosten(preis, gew);
      // ⚠️ Das Gewicht wurde hier schon gelesen (fuer die Frachtrechnung) und dann
      // weggeworfen — dasselbe Muster wie im Importer. Es wird jetzt mitgeschrieben:
      // damit beantwortet dieser Lauf nebenbei die Frage «welche Ware ist schwer?»
      // fuer den ALTBESTAND, ohne eine einzige zusaetzliche CJ-Abfrage.
      const gGramm = Number(gew) || 0;
      const messung = gGramm > 0 ? { measurement: { weight: { value: gGramm, unit: 'GRAMS' } } } : {};
      // Die Abfrage liefert ALLE Varianten des Produkts mit je eigenem Preis und Gewicht.
      // Wo sich die Shopify-Variante ueber ihre SKU wiederfinden laesst, bekommt sie IHRE
      // Zahl statt der des ersten Eintrags — bei Groessen-/Farbstaffeln ist das der
      // Unterschied zwischen einer geschaetzten und einer echten Marge. Kostet nichts:
      // dieselbe Antwort, nur genauer gelesen.
      const proSku = new Map();
      if (Array.isArray(j.data)) for (const v of j.data) {
        if (v?.variantSku) proSku.set(String(v.variantSku).toUpperCase(), v);
      }
      const ein = vs.map(v => {
        const kern = (v.sku || '').replace(/^cj-/i, '').split('-')[0].toUpperCase();
        const e = proSku.get(kern);
        const vp = e ? (e.variantSellPrice ?? e.variantSugSellPrice) : null;
        const vg = e ? Number(e.variantWeight) || 0 : 0;
        const vc = vp != null ? kosten(vp, vg || gGramm) : c;
        const vm = vg > 0 ? { measurement: { weight: { value: vg, unit: 'GRAMS' } } } : messung;
        return { id: v.id, inventoryItem: { cost: vc, ...vm } };
      });
      let n = 0;
      for (let i = 0; i < ein.length; i += 25) {
        const r = await sgql(`mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}`,
          { p: p.id, v: ein.slice(i, i + 25) });
        const e = r.data?.productVariantsBulkUpdate?.userErrors || [];
        if (e.length) { console.log('  ⚠️', JSON.stringify(e[0]).slice(0, 90)); break; }
        n += ein.slice(i, i + 25).length;
      }
      if (n) {
        gesetzt++;
        fs.appendFileSync(LEDGER, `${p.id}\tCHF ${c}\t${n} Varianten\t${p.title.slice(0, 50)}\n`);
        if (gesetzt % 20 === 0) console.log(`   ${gesetzt} Produkte mit Einkaufspreis`);
      }
      await sleep(1200);
      if (gesetzt + ohne >= LIMIT) break;
    }
    if (!pr.pageInfo.hasNextPage) { console.log(`FERTIG: ${gesetzt} Produkte bekamen Kosten, ${ohne} ohne CJ-Referenz.`); return; }
    cursor = pr.pageInfo.endCursor;
  }
  console.log(`PAUSE (Tagesmenge erreicht): ${gesetzt} Produkte mit Einkaufspreis, ${ohne} ohne CJ-Referenz, ${geprueft} geprüft.`);
}
main();
