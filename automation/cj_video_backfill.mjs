#!/usr/bin/env node
/* cj_video_backfill.mjs — holt die CJ-Produktvideos auf die Produktseiten nach.
 *
 * DER BEFUND (Betreiber, 14.08.2026: «da sind videos von cj, kannst du die auch auf webseite
 * machen?»). Nachgezählt über einen Bulk-Export ALLER aktiven Produkte, nicht über eine
 * Stichprobe:
 *
 *     aktive Produkte           34'824
 *     mit Video auf der Seite      144   (0,4 %)
 *     Tag «video-hit»            1'203   davon OHNE Video: 1'184
 *
 * Der Tag `video-hit` wird von `cj_sku_import.mjs` und `cj_trending_import.mjs` JEDEM Produkt
 * mitgegeben — er ist ein Werbe-Etikett, kein Nachweis. Nur `cj_category_fill.mjs` hängt
 * seit dem 06.07. wirklich ein Video an, und auch nur wenn CJ im selben Aufruf ein
 * `productVideo` mitliefert. Alles davor blieb ohne. Der Reel-Automat sucht deshalb mit
 * «tag:video-hit MIT echtem VIDEO-media» und findet fast nichts, obwohl die Videos beim
 * Lieferanten bereitliegen.
 *
 * ⚠️ SHOPIFY NIMMT KEINE FREMDE VIDEO-URL. Bilder darf man per `originalSource` verlinken,
 * Videos nicht — sie müssen über einen Staged-Upload hochgeladen werden. Genau daran ist der
 * erste Versuch am 06.07. gescheitert; der Weg steht in `attachVideo()` und wird hier gleich
 * gebaut.
 *
 * ⚠️ DAS VIDEO DARF NIE DAS ERSTE MEDIUM WERDEN. Sonst zeigt die Kollektionskachel kein
 * Produktbild mehr und Google Merchant bekommt kein `image_link` — 22 Produkte waren im
 * Katalog-Audit vom 10.08. bereits so kaputt. Nach dem Anhängen wird deshalb geprüft, ob das
 * erste Medium noch ein Bild ist, und sonst umsortiert.
 *
 * ⚠️ CJ ZÄHLT EINE ANFRAGE PRO SEKUNDE ÜBER ALLE PROZESSE HINWEG, und das Tagesbudget ist
 * endlich (am 14.08. um 19:19 Uhr: 100'310 Punkte verbraucht, 0 übrig — der Grind selbst
 * legte sich schlafen). Bei Code 16900500 hört dieser Lauf sofort auf, statt in eine Wand zu
 * rennen; bei 1600200 wartet er.
 *
 * ENV: CJ_TOKEN · CAP=150 · DRY=1 · NUR_VIDEOHIT=1 (nur die 1'184 Verdächtigen)
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2024-10';
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json')
  ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
const DRY = process.env.DRY === '1';
const CAP = parseInt(process.env.CAP || '150', 10);
const NUR = process.env.NUR_VIDEOHIT === '1';
const LEDGER = 'dropship/_cj_video_backfill.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function shTok() {
  return fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim();
}

async function sgql(q, v) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
        method: 'POST', signal: AbortSignal.timeout(90000),
        headers: { 'X-Shopify-Access-Token': shTok(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: v || {} }) });
      const j = await r.json();
      if (j.data !== undefined && j.data !== null) return j;
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
      if (Number(j.code) === 16900500) { punkteWeg = true; return j; }   // Tagesbudget leer
      if (Number(j.code) === 1600200) { await sleep(2500 * (i + 1)); continue; }
      return j;
    } catch { await sleep(2500 * (i + 1)); }
  }
  return { code: 0, data: null };
}

// ⚠️ IN DER SHOPIFY-SKU STECKT DIE VARIANTEN-SKU, NICHT DIE PRODUKT-SKU. «CJ-CJSJ150909801AZ»
// als productSku gefragt antwortet CJ mit «Product not found» — die Varianten hängen eine
// laufende Nummer plus Buchstabenpaar an («…01AZ», «…02BY», «…03CX», «…06FU»). Erst
// «CJSJ1509098» liefert Code 200 (14.08.2026 an vier Produkten gegengeprüft). Manche SKUs
// tragen die Ausprägung stattdessen nach einem Bindestrich («CJJT1626220-Horizontal
// rectangle»); dort ist der erste Abschnitt schon die Produkt-SKU. Deshalb beide Formen,
// gekürzt zuerst.
function cjSchluessel(sku) {
  if (!sku || !sku.startsWith('CJ-')) return null;
  const rest = sku.slice(3);
  if (/^\d{15,}$/.test(rest)) return [{ pid: rest }];
  const kopf = rest.split('-')[0];
  if (kopf.length < 6) return null;
  const kurz = kopf.replace(/\d{2}[A-Z]{2}$/, '');
  const formen = [...new Set([kurz, kopf])].filter(x => x.length >= 6);
  return formen.map(productSku => ({ productSku }));
}

async function anhaengen(pid, vurl, name) {
  const vr = await fetch(vurl, { signal: AbortSignal.timeout(120000) });
  if (!vr.ok) return 'video-url-tot';
  const buf = Buffer.from(await vr.arrayBuffer());
  if (buf.length > 60 * 1024 * 1024) return 'video-zu-gross';
  if (buf.length < 20000) return 'video-zu-klein';
  const stg = await sgql(`mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}}userErrors{message}}}`,
    { input: [{ resource: 'VIDEO', filename: `${name}.mp4`, mimeType: 'video/mp4',
                httpMethod: 'POST', fileSize: String(buf.length) }] });
  const tgt = stg?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!tgt) return 'kein-upload-ziel';
  const form = new FormData();
  for (const p of tgt.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([buf], { type: 'video/mp4' }), `${name}.mp4`);
  const up = await fetch(tgt.url, { method: 'POST', body: form });
  if (up.status !== 201 && up.status !== 200) return 'upload-abgelehnt';
  const cm = await sgql(`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}`,
    { id: pid, m: [{ originalSource: tgt.resourceUrl, mediaContentType: 'VIDEO' }] });
  if (cm.data?.productCreateMedia?.mediaUserErrors?.length) return 'shopify-lehnt-ab';
  // Bild muss vorn bleiben.
  const mm = await sgql(`query($id:ID!){product(id:$id){media(first:25){nodes{id mediaContentType}}}}`, { id: pid });
  const nodes = mm.data?.product?.media?.nodes || [];
  if (nodes.length && nodes[0].mediaContentType !== 'IMAGE') {
    const bild = nodes.find(n => n.mediaContentType === 'IMAGE');
    if (bild) await sgql(`mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}`,
                         { id: pid, m: [{ id: bild.id, newPosition: '0' }] });
  }
  return 'ok';
}

async function main() {
  if (!CJT) { console.log('kein CJ-Token'); return; }
  const erledigt = new Set(fs.existsSync(LEDGER)
    ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(l => l.split('\t')[0]).filter(Boolean) : []);

  // Kandidaten live holen: aktive Produkte OHNE Video, mit CJ-SKU.
  const frage = NUR ? 'status:active tag:video-hit' : 'status:active tag:cj-real';
  const kand = [];
  let cursor = null;
  for (let seite = 0; seite < 400; seite++) {
    const r = await sgql(`query($c:String,$q:String!){products(first:50,after:$c,query:$q){
        pageInfo{hasNextPage endCursor}
        nodes{id title media(first:20){nodes{mediaContentType}} variants(first:1){nodes{sku}}}}}`,
      { c: cursor, q: frage });
    const p = r.data?.products; if (!p) break;
    for (const n of p.nodes) {
      if (erledigt.has(n.id)) continue;
      if (n.media.nodes.some(m => m.mediaContentType === 'VIDEO')) continue;
      const s = cjSchluessel(n.variants.nodes[0]?.sku || '');
      if (s && s.length) kand.push({ id: n.id, titel: n.title, s });
    }
    if (!p.pageInfo.hasNextPage || kand.length >= CAP * 3) break;
    cursor = p.pageInfo.endCursor;
  }
  console.log(`Kandidaten ohne Video: ${kand.length}`);
  if (DRY) { for (const k of kand.slice(0, 8)) console.log('   ', k.titel.slice(0, 50), JSON.stringify(k.s)); return; }

  let ok = 0, ohne = 0, fehler = 0;
  for (const k of kand.slice(0, CAP)) {
    let j = { code: 0 };
    for (const form of k.s) {
      j = await cj(form.pid ? `/product/query?pid=${form.pid}`
                            : `/product/query?productSku=${form.productSku}`);
      if (punkteWeg || Number(j.code) === 200) break;
      await sleep(2500);
    }
    if (punkteWeg) { console.log('⛔ CJ-Tagesbudget erschöpft — Lauf beendet, Ledger bleibt gültig'); break; }
    // ⚠️ EINE FEHLGESCHLAGENE ANFRAGE IST KEIN «HAT KEIN VIDEO». Genau dieser Trugschluss hat
    // im Bild-Backfill 530 von 752 Produkten falsch als erledigt abgehakt.
    if (Number(j.code) !== 200) { fehler++; await sleep(2500); continue; }
    const v = String(j.data?.productVideo || '').trim();   // CJ liefert hier `null`, nicht ''
    if (!/^https/.test(v)) {
      ohne++;
      fs.appendFileSync(LEDGER, `${k.id}\tkein-video-beim-lieferanten\n`);
      await sleep(2500); continue;
    }
    const r = await anhaengen(k.id, v, 'cj-' + (k.s.pid || k.s.productSku));
    fs.appendFileSync(LEDGER, `${k.id}\t${r}\t${k.titel.slice(0, 60)}\n`);
    if (r === 'ok') { ok++; console.log(`  🎬 ${k.titel.slice(0, 52)}`); } else fehler++;
    await sleep(2500);
  }
  console.log(`FERTIG: ${ok} Produkte haben jetzt ihr Lieferantenvideo, ${ohne} haben beim `
            + `Lieferanten keines, ${fehler} nicht abschliessend geklärt (bleiben offen).`);
}

main();
