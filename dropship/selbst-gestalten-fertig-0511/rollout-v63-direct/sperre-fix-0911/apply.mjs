// Spielt die korrigierte Sperrmarkierung in die Beschreibungen der drei gesperrten «Selbst gestalten»-Produkte ein
// (Magnet, Dad-Cap, Bügeltransfer). Fehler vorher: Das Sperrskript setzte bei jedem Lauf textContent neu und löste damit
// den eigenen MutationObserver endlos aus: die Produktseite fror im Browser ein (GEMESSEN 09.11.2026).
//
//   node apply.mjs                    Trockenlauf (Vorgabe): liest live, prüft, zeigt den Unterschied, schreibt nichts
//   LIVE=1 node apply.mjs             Sicherung nach sicherung/, schreiben, sofort frisch zurücklesen und vergleichen
//   ZURUECK=1 LIVE=1 node apply.mjs   schreibt die Sicherung zurück (nur wenn die Live-Beschreibung dem neuen Stand gleicht)
//
// Zugang: SHOPIFY_SHOP (au3j0y-hq.myshopify.com) und ein Admin-Token in /tmp/cj_shop_token.txt (oder TOKEN_DATEI).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKLIST, beschreibungPlanen, blockerBaustein, blockerProduktPruefen, sha256 } from '../direct_rollout_lib.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const tok = fs.readFileSync(process.env.TOKEN_DATEI || '/tmp/cj_shop_token.txt', 'utf8').trim();
const SICHERUNG = path.join(hier, 'sicherung');
const NEU_TEXT = 'if(a.textContent!==msg)a.textContent=msg;';
const ALT_TEXT = 'a.textContent=msg;';

const gql = async (q, v) => {
  const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }),
  })).json();
  if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400));
  return r.data;
};
const LESEN = `query($q:String!){products(first:5,query:$q){nodes{id handle status title updatedAt onlineStoreUrl descriptionHtml variants(first:100){pageInfo{hasNextPage} nodes{id availableForSale}}}}}`;
const lesen = async (handle) => {
  const n = (await gql(LESEN, { q: `handle:${JSON.stringify(handle)}` })).products.nodes.filter((p) => p.handle === handle);
  if (n.length !== 1) throw new Error(`${handle}: ${n.length} Treffer, erwartet 1`);
  return n[0];
};
const schreiben = async (id, descriptionHtml) => {
  const r = (await gql(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}`, { p: { id, descriptionHtml } })).productUpdate;
  if (r.userErrors?.length) throw new Error(JSON.stringify(r.userErrors));
};

const ergebnis = [];
let abbruch = false;
for (const blocker of BLOCKLIST) {
  const z = { handle: blocker.handle };
  try {
    const p = await lesen(blocker.handle);
    z.id = p.id; z.status = p.status; z.updatedAt = p.updatedAt;
    blockerProduktPruefen(p, blocker);
    const neuBlock = blockerBaustein({ product: p, blocker });
    if (!neuBlock.includes(NEU_TEXT) || neuBlock.split(NEU_TEXT).length !== 2) throw new Error('Generator trägt die Schutzabfrage nicht genau einmal');
    const altBlock = neuBlock.replace(NEU_TEXT, ALT_TEXT);
    const jetzt = p.descriptionHtml;
    const sicherungsDatei = path.join(SICHERUNG, `${blocker.handle}.vor.html`);
    z.vorherSha256 = sha256(jetzt);

    if (ZURUECK) {
      if (!fs.existsSync(sicherungsDatei)) throw new Error('keine Sicherung vorhanden');
      if (!jetzt.includes(neuBlock) || jetzt.split(neuBlock).length !== 2) throw new Error('Live-Beschreibung trägt den neuen Block nicht genau einmal: nicht zurückgeschrieben');
      const vor = fs.readFileSync(sicherungsDatei, 'utf8');
      z.aktion = LIVE ? 'zurückgeschrieben' : 'Trockenlauf Rücknahme';
      if (LIVE) { await schreiben(p.id, vor); z.rueckgelesenGleich = (await lesen(blocker.handle)).descriptionHtml === vor; }
      ergebnis.push(z); continue;
    }

    const schonNeu = jetzt.includes(neuBlock) && jetzt.split(neuBlock).length === 2;
    const nochAlt = jetzt.includes(altBlock) && jetzt.split(altBlock).length === 2;
    if (schonNeu) { z.aktion = 'schon eingespielt (nichts zu tun)'; ergebnis.push(z); continue; }
    if (!nochAlt) throw new Error('Live-Beschreibung trägt den alten Block nicht genau einmal (weicht vom Generator ab): nichts geschrieben');
    const neuDesc = jetzt.replace(altBlock, neuBlock);
    // genau eine Stelle darf sich ändern
    const geplant = beschreibungPlanen(jetzt, neuBlock, { blocked: true });
    if (geplant.nachher !== neuDesc) throw new Error('beschreibungPlanen weicht von der Einzel-Ersetzung ab');
    if (beschreibungPlanen(neuDesc, neuBlock, { blocked: true }).geaendert) throw new Error('Neuer Stand ist nicht idempotent (direct_rollout würde ihn als Änderung sehen)');
    if (neuDesc.length - jetzt.length !== NEU_TEXT.length - ALT_TEXT.length) throw new Error('Längenunterschied passt nicht zu genau einer Ersetzung');
    z.nachherSha256 = sha256(neuDesc); z.plusZeichen = neuDesc.length - jetzt.length;
    z.aktion = LIVE ? 'schreiben' : 'Trockenlauf: würde schreiben';
    if (LIVE) {
      fs.mkdirSync(SICHERUNG, { recursive: true });
      if (!fs.existsSync(sicherungsDatei)) fs.writeFileSync(sicherungsDatei, jetzt);
      const frisch = await lesen(blocker.handle);
      if (frisch.updatedAt !== p.updatedAt || frisch.descriptionHtml !== jetzt) throw new Error('Produkt wurde zwischenzeitlich geändert: abgebrochen');
      await schreiben(p.id, neuDesc);
      const danach = await lesen(blocker.handle);
      z.rueckgelesenGleich = danach.descriptionHtml === neuDesc;
      z.rueckleseSha256 = sha256(danach.descriptionHtml);
      z.idempotent = !beschreibungPlanen(danach.descriptionHtml, neuBlock, { blocked: true }).geaendert;
      if (!z.rueckgelesenGleich || !z.idempotent) { z.warnung = 'Rücklesen weicht ab'; abbruch = true; }
    }
  } catch (e) { z.fehler = String(e.message || e).slice(0, 300); abbruch = true; }
  ergebnis.push(z);
  if (abbruch && LIVE) break; // nach dem ersten Fehler nichts weiter schreiben
}
console.log(JSON.stringify(ergebnis, null, 2));
process.exit(abbruch ? 2 : 0);
