// Französische Fassung der Rückgaberichtlinie und der AGB (Besitzer 09.11.2026: «ja» auf die Frage, die beiden
// Rechtstexte neu zu übersetzen, nachdem die alten Übersetzungen seit Rückgabe-Welle 2 «veraltet» waren und noch
// «dans les 7 jours» nannten). Geschrieben wird NUR das Feld `body` der Sprache `fr` der beiden Richtlinien.
//   Trockenlauf (Vorgabe, nur lesen): node dropship/fr-richtlinien-0911/apply.mjs
//   Einspielen:                       LIVE=1 node dropship/fr-richtlinien-0911/apply.mjs
//   Rücknahme:                        ZURUECK=1 LIVE=1 node dropship/fr-richtlinien-0911/apply.mjs
//   Nur eine Richtlinie:              NUR=REFUND_POLICY (oder TERMS_OF_SERVICE)
// Regeln: Das deutsche Original wird frisch gelesen; die französische Fassung wird in dessen Gerüst gesetzt und
// geprüft (Blockzahl, Gerüst, Tags je Block, Zahlen, Links mit /fr, kein Deutsch, keine 7-Tage-Frist). Geschrieben wird
// mit dem frisch gelesenen Digest (hat sich das Original geändert, schlägt das Schreiben fehl). Vor dem Schreiben
// liegt die alte französische Fassung in sicherung/fr-alt.json; die Rücknahme schreibt sie zurück (sie gilt danach
// wieder als «aktuell», obwohl sie inhaltlich veraltet ist: nur für den Notfall).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { uebersetzeBody, pruefe } from './lib.mjs';
import { RICHTLINIEN } from './paare.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const SICH = path.join(HIER, 'sicherung', 'fr-alt.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const TYPEN = (process.env.NUR || 'REFUND_POLICY,TERMS_OF_SERVICE').split(',').map((s) => s.trim()).filter(Boolean);

/** Plant EINE Richtlinie aus dem Zustand im Shop. Rein (kein Netz). zustand: { body, fr: { value, outdated } | null } */
export function planeRichtlinie(typ, zustand) {
  const b = uebersetzeBody(zustand.body, RICHTLINIEN[typ] || []);
  const probleme = [...b.probleme.map((p) => `Einsetzen: ${JSON.stringify(p)}`), ...pruefe(zustand.body, b.out)];
  const fertig = !!zustand.fr && zustand.fr.value === b.out && zustand.fr.outdated === false;
  return { typ, neu: b.out, probleme, fertig };
}

async function main() {
  const { shopifyGql } = await import('../../automation/lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('../../automation/lib/shopify_secret.mjs');
  const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
  const q = async (a, b) => { const j = await shopifyGql(SHOP, '2025-01', tok, a, b); return j && j.data !== undefined ? j.data : j; };
  const warte = (ms) => new Promise((s) => setTimeout(s, ms));

  const lies = async (typ) => {
    const p = (await q(`{shop{shopPolicies{id type body}}}`)).shop.shopPolicies.find((x) => x.type === typ);
    if (!p) throw new Error('Richtlinie fehlt: ' + typ);
    const t = (await q(`query($id:ID!){translatableResource(resourceId:$id){translatableContent{key digest value} translations(locale:"fr"){key value outdated}}}`, { id: p.id })).translatableResource;
    const c = t.translatableContent.find((x) => x.key === 'body');
    const fr = t.translations.find((x) => x.key === 'body') || null;
    return { id: p.id, body: p.body, quelleGleich: c.value === p.body, digest: c.digest, fr: fr ? { value: fr.value, outdated: fr.outdated } : null };
  };
  const schreibe = async (id, wert, digest) => (await q(`mutation($id:ID!,$tr:[TranslationInput!]!){translationsRegister(resourceId:$id,translations:$tr){userErrors{field message} translations{key}}}`, { id, tr: [{ locale: 'fr', key: 'body', value: wert, translatableContentDigest: digest }] })).translationsRegister.userErrors || [];
  const entferne = async (id) => (await q(`mutation($id:ID!){translationsRemove(resourceId:$id,locales:["fr"],translationKeys:["body"]){userErrors{field message}}}`, { id })).translationsRemove.userErrors || [];
  const warteBisGleich = async (typ, soll, maxMs) => {
    const t0 = Date.now();
    for (;;) { const z = await lies(typ); if (z.fr && z.fr.value === soll && z.fr.outdated === false) return true; if (Date.now() - t0 > maxMs) return false; await warte(3000); }
  };

  if (ZURUECK) {
    if (!existsSync(SICH)) { console.error('Keine Sicherung (' + SICH + ')'); process.exit(3); }
    const s = JSON.parse(readFileSync(SICH, 'utf8')); let ok = 0, fremd = 0;
    for (const e of s.eintraege.filter((x) => TYPEN.includes(x.typ))) {
      const z = await lies(e.typ);
      if (!z.fr || z.fr.value !== e.neu) { console.log('NICHT zurückgesetzt (französischer Text inzwischen anders):', e.typ); fremd++; continue; }
      if (!LIVE) { console.log('[DRY] würde zurückschreiben:', e.typ, e.frAlt ? `alte Fassung ${e.frAlt.length} Zeichen` : 'Übersetzung entfernen'); ok++; continue; }
      const fe = e.frAlt ? await schreibe(e.id, e.frAlt, z.digest) : await entferne(e.id);
      if (fe.length) { console.error(e.typ, JSON.stringify(fe)); process.exit(5); }
      console.log('zurückgeschrieben', e.typ); ok++;
    }
    console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf Rücknahme', ok, '| übersprungen', fremd); process.exit(0);
  }

  // ---- Planen (nur lesen)
  const plaene = [];
  let probleme = 0;
  for (const typ of TYPEN) {
    const z = await lies(typ);
    const p = planeRichtlinie(typ, z);
    if (!z.quelleGleich) p.probleme.push('Quelltext der Übersetzung weicht vom Richtlinientext ab (Digest unsicher)');
    plaene.push({ ...p, z });
    console.log(`${typ.padEnd(16)} DE ${String(z.body.length).padStart(6)} Z → FR ${String(p.neu.length).padStart(6)} Z | heute FR: ${z.fr ? `${z.fr.value.length} Z${z.fr.outdated ? ', veraltet' : ''}` : 'keine'} | ${p.fertig ? 'schon fertig' : p.probleme.length ? 'PROBLEME' : 'ÄNDERN'}`);
    for (const x of p.probleme) { console.log('   !', x); probleme++; }
  }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(probleme ? 4 : 0); }
  if (probleme) { console.error('Probleme vorhanden: erst klären, nichts geschrieben.'); process.exit(4); }
  const zuTun = plaene.filter((p) => !p.fertig);
  if (!zuTun.length) { console.log('Alles schon fertig.'); process.exit(0); }
  if (existsSync(SICH)) { console.error('sicherung/fr-alt.json liegt schon vor: erst ZURUECK=1 oder prüfen'); process.exit(3); }
  writeFileSync(SICH, JSON.stringify({ gesichert: 'vor französischer Richtlinien-Fassung, 09.11.2026', eintraege: zuTun.map((p) => ({ typ: p.typ, id: p.z.id, frAlt: p.z.fr ? p.z.fr.value : null, outdatedAlt: p.z.fr ? p.z.fr.outdated : null, neu: p.neu })) }, null, 1));

  // ---- Schreiben, mit frisch gelesenem Digest unmittelbar davor
  for (const p of zuTun) {
    const frisch = await lies(p.typ);
    if (frisch.body !== p.z.body || frisch.digest !== p.z.digest) { console.error(p.typ, 'hat sich seit dem Planen geändert: nichts geschrieben'); process.exit(6); }
    const fe = await schreibe(p.z.id, p.neu, frisch.digest);
    if (fe.length) { console.error(p.typ, JSON.stringify(fe), '→ Sicherung', SICH); process.exit(5); }
    console.log('geschrieben', p.typ);
  }
  // ---- Rücklesen (frisch, bis gleich und nicht mehr «veraltet»)
  const abw = [];
  for (const p of zuTun) if (!(await warteBisGleich(p.typ, p.neu, 60000))) abw.push(p.typ);
  if (abw.length) { console.error('RÜCKLESEN WEICHT AB bei:', abw.join(', ')); process.exit(7); }
  console.log('Rückgelesen: alle', zuTun.length, 'Richtlinien GLEICH Soll und nicht veraltet. Sicherung:', SICH);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
