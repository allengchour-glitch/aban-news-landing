// ersetzen.mjs: ersetzt Produktbilder durch bereinigte Fassungen, stellt saubere Bilder nach vorn, löst Bilder vom Produkt.
// Trockenlauf ist die Vorgabe. LIVE=1 schreibt. ZURUECK=1 LIVE=1 stellt den gesicherten Zustand wieder her.
// Aufruf: NODE_USE_ENV_PROXY=1 [LIVE=1] [ZURUECK=1] node dropship/bildfix-1111/ersetzen.mjs <plan.json> <sicherungsordner>
//
// Plan: [{ handle, erwartet_erstes, ersatz:[{alt, neu_url, alt_text}], loesen:[mediaId], nach_vorn: mediaId|null }]
//  - ersatz: das neue Bild kommt an die Stelle des alten; Varianten, die das alte Bild trugen, bekommen das neue.
//  - loesen: Bild wird vom Produkt gelöst (fileUpdate referencesToRemove), die Datei bleibt unter Inhalt > Dateien.
//  - nach_vorn: ein vorhandenes Bild wird Hauptbild.
// Nichts wird gelöscht. Jede Änderung wird vorher gesichert und danach frisch zurückgelesen.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [planDatei, sichDir] = process.argv.slice(2);
if (!planDatei || !sichDir) { console.log('Aufruf: node ersetzen.mjs <plan.json> <sicherungsordner>'); process.exit(2); }
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const plan = JSON.parse(readFileSync(planDatei, 'utf8'));
mkdirSync(sichDir, { recursive: true });

const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
});
const tok = (await tr.json().catch(() => null))?.access_token;
if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status); process.exit(2); }
async function gql(q, v) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok },
      body: JSON.stringify({ query: q, variables: v }),
    });
    const j = await r.json().catch(() => ({ errors: [{ message: 'HTTP ' + r.status }] }));
    if (j.errors && /throttled/i.test(JSON.stringify(j.errors))) { await warte(2000 * (i + 1)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  }
  throw new Error('gedrosselt');
}
const warte = ms => new Promise(r => setTimeout(r, ms));
function fehler(teil, wo) {
  const e = (teil?.userErrors || []).concat(teil?.mediaUserErrors || []);
  if (e.length) throw new Error(`${wo}: ${JSON.stringify(e).slice(0, 300)}`);
}

const Q = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle status
  media(first:100){ nodes{ id alt status } }
  variants(first:100){ nodes{ id title media(first:5){ nodes{ id } } } } } }`;
async function lesen(h) {
  const p = (await gql(Q, { h })).productByIdentifier;
  if (!p) throw new Error('Produkt fehlt: ' + h);
  return {
    id: p.id, status: p.status,
    medien: p.media.nodes.map(m => ({ id: m.id, alt: m.alt || '', status: m.status })),
    varianten: p.variants.nodes.map(v => ({ id: v.id, titel: v.title, medien: v.media.nodes.map(m => m.id) })),
  };
}
const M_ADD = `mutation($id:ID!,$m:[CreateMediaInput!]){ productUpdate(product:{id:$id}, media:$m){ product{ id } userErrors{ field message } } }`;
const M_DETACH_V = `mutation($p:ID!,$m:[ProductVariantDetachMediaInput!]!){ productVariantDetachMedia(productId:$p, variantMedia:$m){ userErrors{ field message } } }`;
const M_APPEND_V = `mutation($p:ID!,$m:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$m){ userErrors{ field message } } }`;
const M_ORDER = `mutation($id:ID!,$moves:[MoveInput!]!){ productReorderMedia(id:$id, moves:$moves){ job{ id } mediaUserErrors{ field message } } }`;
const M_FILE = `mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{ id } userErrors{ field message } } }`;

async function reihenfolge(pid, h, soll) {
  const moves = soll.map((id, i) => ({ id, newPosition: String(i) }));
  fehler((await gql(M_ORDER, { id: pid, moves })).productReorderMedia, 'Reihenfolge');
  for (let i = 0; i < 15; i++) {
    await warte(2000);
    const ist = (await lesen(h)).medien.map(m => m.id);
    if (soll.every((id, k) => ist[k] === id)) return true;
  }
  return false;
}
async function binde(pid, varianten, von, zu) {
  const betroffen = varianten.filter(v => v.medien.includes(von)).map(v => v.id);
  if (!betroffen.length) return 0;
  fehler((await gql(M_DETACH_V, { p: pid, m: betroffen.map(variantId => ({ variantId, mediaIds: [von] })) })).productVariantDetachMedia, 'Variante lösen');
  fehler((await gql(M_APPEND_V, { p: pid, m: betroffen.map(variantId => ({ variantId, mediaIds: [zu] })) })).productVariantAppendMedia, 'Variante binden');
  return betroffen.length;
}

let fehlerZahl = 0;
for (const e of plan) {
  const sDatei = join(sichDir, e.handle.replace(/[^a-z0-9-]/gi, '_') + '.json');
  try {
    if (ZURUECK) {
      if (!existsSync(sDatei)) { console.log('KEINE SICHERUNG', e.handle); continue; }
      const s = JSON.parse(readFileSync(sDatei, 'utf8'));
      if (!s.neu) { console.log('NICHTS ZURÜCKZUNEHMEN', e.handle); continue; }
      const jetzt = await lesen(e.handle);
      console.log(`${LIVE ? 'ZURÜCK' : '[TROCKEN] zurück'} ${e.handle}: alte Bilder wieder anhängen, Varianten zurückbinden, Reihenfolge wie vorher`);
      if (!LIVE) continue;
      const geloest = s.vorher.medien.map(m => m.id).filter(id => !jetzt.medien.some(m => m.id === id));
      if (geloest.length) fehler((await gql(M_FILE, { f: geloest.map(id => ({ id, referencesToAdd: [s.vorher.id] })) })).fileUpdate, 'wieder anhängen');
      for (const [alt, neu] of Object.entries(s.neu)) await binde(s.vorher.id, jetzt.varianten, neu, alt);
      await warte(3000);
      const ok = await reihenfolge(s.vorher.id, e.handle, s.vorher.medien.map(m => m.id));
      const neuIds = Object.values(s.neu);
      if (neuIds.length) fehler((await gql(M_FILE, { f: neuIds.map(id => ({ id, referencesToRemove: [s.vorher.id] })) })).fileUpdate, 'neue lösen');
      console.log(`  Rücknahme ${ok ? 'GLEICH' : 'REIHENFOLGE WEICHT AB'}`);
      continue;
    }
    const vorher = await lesen(e.handle);
    const ids = vorher.medien.map(m => m.id);
    if (vorher.status !== 'ACTIVE') throw new Error('nicht ACTIVE');
    if (e.erwartet_erstes && ids[0] !== e.erwartet_erstes) throw new Error('Hauptbild hat sich seit der Planung geändert');
    for (const id of [...(e.ersatz || []).map(x => x.alt), ...(e.loesen || []), e.nach_vorn].filter(Boolean)) {
      if (!ids.includes(id)) throw new Error('Bild fehlt am Produkt: ' + id);
    }
    for (const id of e.loesen || []) {
      if (vorher.varianten.some(v => v.medien.includes(id))) throw new Error('zu lösendes Bild trägt eine Variante: ' + id);
    }
    if (e.nach_vorn && (e.loesen || []).includes(e.nach_vorn)) throw new Error('nach_vorn steht auch in loesen');
    const besch = [
      ...(e.ersatz || []).map(x => `ersetze Bild ${ids.indexOf(x.alt) + 1}`),
      ...(e.loesen || []).map(id => `löse Bild ${ids.indexOf(id) + 1}`),
      e.nach_vorn ? `Bild ${ids.indexOf(e.nach_vorn) + 1} nach vorn` : null,
    ].filter(Boolean).join(', ');
    if (!LIVE) { console.log(`[TROCKEN] ${e.handle}: ${besch}`); continue; }
    writeFileSync(sDatei, JSON.stringify({ zeit: new Date().toISOString(), plan: e, vorher }, null, 1));
    // 1) neue Bilder anlegen und auf READY warten
    const neu = {};
    for (const x of e.ersatz || []) {
      fehler((await gql(M_ADD, { id: vorher.id, m: [{ originalSource: x.neu_url, mediaContentType: 'IMAGE', alt: x.alt_text }] })).productUpdate, 'Bild anlegen');
      let gefunden = null;
      for (let i = 0; i < 30 && !gefunden; i++) {
        await warte(2000);
        const st = await lesen(e.handle);
        gefunden = st.medien.find(m => !ids.includes(m.id) && !Object.values(neu).includes(m.id) && m.alt === x.alt_text && m.status === 'READY');
        const kaputt = st.medien.find(m => !ids.includes(m.id) && m.status === 'FAILED');
        if (kaputt) throw new Error('neues Bild FAILED');
      }
      if (!gefunden) throw new Error('neues Bild wurde nicht READY');
      neu[x.alt] = gefunden.id;
    }
    writeFileSync(sDatei, JSON.stringify({ zeit: new Date().toISOString(), plan: e, vorher, neu }, null, 1));
    // 2) Varianten umbinden
    let gebunden = 0;
    for (const [alt, n] of Object.entries(neu)) gebunden += await binde(vorher.id, vorher.varianten, alt, n);
    // 3) Reihenfolge: neue an die Stelle der alten, gelöste raus, gewünschtes Bild nach vorn
    const weg = new Set([...Object.keys(neu), ...(e.loesen || [])]);
    let soll = ids.map(id => neu[id] || id).filter(id => !weg.has(id) || Object.values(neu).includes(id));
    if (e.nach_vorn) soll = [e.nach_vorn, ...soll.filter(id => id !== e.nach_vorn)];
    const rest = ids.filter(id => weg.has(id));
    const okReihe = await reihenfolge(vorher.id, e.handle, [...soll, ...rest]);
    // 4) alte und gelöste Bilder vom Produkt lösen (Dateien bleiben)
    if (rest.length) fehler((await gql(M_FILE, { f: rest.map(id => ({ id, referencesToRemove: [vorher.id] })) })).fileUpdate, 'Bild lösen');
    // 5) frisch zurücklesen
    await warte(2500);
    const nach = await lesen(e.handle);
    const istIds = nach.medien.map(m => m.id);
    const okIds = soll.every((id, k) => istIds[k] === id) && istIds.length === soll.length;
    const okVar = vorher.varianten.every(v => {
      const nv = nach.varianten.find(x => x.id === v.id);
      return v.medien.every(m => nv.medien.includes(neu[m] || m));
    });
    console.log(`${okIds && okVar && okReihe ? 'GLEICH' : 'WEICHT AB'} ${e.handle}: ${besch}; Varianten umgebunden ${gebunden}; Bilder jetzt ${istIds.length}`);
    if (!(okIds && okVar)) fehlerZahl += 1;
  } catch (err) {
    fehlerZahl += 1;
    console.log('FEHLER', e.handle, String(err.message || err).slice(0, 300));
  }
}
console.log(fehlerZahl ? `ENDE mit ${fehlerZahl} Fehler(n)` : 'ENDE ohne Fehler');
process.exit(fehlerZahl ? 1 : 0);
