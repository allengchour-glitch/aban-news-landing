// Französische Ankündigungsleiste und Fusszeile nachziehen (Rückgabe-Text Welle 2, Rest vom 09.11.2026).
//
// Ausgangslage (GEMESSEN 09.11.2026, translatableResources ONLINE_STORE_THEME_SECTION_GROUP, Sprache fr): die französischen
// Übersetzungen der Leistenzeilen 1, 3, 4, 5 und des Kontaktblocks der Fusszeile sind «outdated»; Zeile 4 wirbt noch für den
// Halloween-Shop, Zeile 5 nennt einen Mengenrabatt, der so nicht mehr gilt, Zeile 3 und die Fusszeile sagen «30 jours de retour»
// ohne den Zusatz zu selbst gestalteten Artikeln.
//
// Trockenlauf ist Vorgabe. LIVE=1 schreibt (nur Sprache fr, nur die hier genannten Schlüssel, über translationsRegister mit dem
// aktuellen Digest) und liest danach frisch zurück. ZURUECK=1 LIVE=1 stellt den Stand aus sicherung/vorher.json wieder her.
// Schutz: stimmt der deutsche Quelltext eines Schlüssels nicht mehr mit dem hier hinterlegten überein, wird NICHT geschrieben
// (jemand hat die Quelle inzwischen geändert; dann zuerst die Übersetzung neu prüfen).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const API = '2025-01';
const SHOP = (process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const TYP = 'ONLINE_STORE_THEME_SECTION_GROUP';

const KOPF = 'section.sections/header-group.json.header_announcements_9jGBFp.';
const FUSS = 'section.sections/footer-group.json.footer_m9NzUG.';

// de = der deutsche Quelltext, gegen den übersetzt wurde (Schutz gegen Quelländerungen); fr = Zieltext.
export const ZIELE = [
  {
    key: KOPF + 'ls_announce_1.text:1esclimo9vmos',
    de: '🇨🇭 Lieferung nur in die Schweiz & nach Liechtenstein · 🚚 in der Schweiz gratis ab CHF 50 nach Rabatt',
    fr: '🇨🇭 Livraison uniquement en Suisse et au Liechtenstein · 🚚 en Suisse, gratuite dès CHF 50 (après rabais)',
  },
  {
    key: KOPF + 'ls_announce_3.text:1d4dlxj35mhzy',
    de: '↩️ 30 Tage Rückgabe (ausser selbst gestaltete Artikel) · 🔒 Sichere & verschlüsselte Bezahlung',
    fr: '↩️ 30 jours de retour (sauf articles personnalisés) · 🔒 Paiement sécurisé & crypté',
  },
  {
    key: KOPF + 'ls_announce_4.text:2zc7lmlzku3ix',
    de: '🎭 Kostüme ab Schweizer Lager – für Partys im November und die Fasnacht ab 11.11. (Lieferdatum auf der Produktseite)',
    fr: '🎭 Costumes en stock en Suisse – pour les fêtes de novembre et le carnaval dès le 11.11. (date de livraison sur la fiche produit)',
  },
  {
    key: KOPF + 'ls_announce_4.link:2zc7lmm4z64qs',
    de: '/collections/kostueme-ch-lager',
    fr: '/fr/collections/kostueme-ch-lager',
  },
  {
    key: KOPF + 'ls_announce_5.text:3a7iywrzwqe0',
    de: '🛒 Mengenrabatt bei ausgewählten Artikeln: ab 2 Stück –5%, ab 3 Stück bis –10% — automatisch im Warenkorb',
    fr: '🛒 Remise sur quantité sur certains articles : dès 2 pièces –5%, dès 3 pièces jusqu’à –10% — automatiquement dans le panier',
  },
  {
    key: FUSS + 'text_lx_kontakt.text:2pauo78tawljr',
    de: '<p><strong>Kontakt</strong><br>LuxeStyle · 3123 Belp, Schweiz<br><a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a> · <a href="/policies/legal-notice">Impressum</a><br>Versand in die Schweiz und nach Liechtenstein · <a href="/policies/shipping-policy">Versand</a> · <a href="/policies/refund-policy">30 Tage Rückgabe (ausser selbst gestaltete Artikel)</a></p>',
    fr: '<p><strong>Contact</strong><br>LuxeStyle · 3123 Belp, Suisse<br><a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a> · <a href="/policies/legal-notice">Mentions légales</a><br>Expédition en Suisse et au Liechtenstein · <a href="/policies/shipping-policy">Livraison</a> · <a href="/policies/refund-policy">Retour sous 30 jours (sauf articles personnalisés)</a></p>',
  },
];

// ---------- reine Logik (auch vom Test benutzt) ----------
/** Ordnet die gelesenen Ressourcen den Zielen zu. Gibt { plan, probleme } zurück; probleme != [] bedeutet: nichts schreiben. */
export function planen(ressourcen, ziele = ZIELE) {
  const plan = []; const probleme = []; const unveraendert = [];
  for (const z of ziele) {
    const treffer = [];
    for (const r of ressourcen) {
      const c = (r.translatableContent || []).find((x) => x.key === z.key);
      if (c) treffer.push({ r, c });
    }
    if (treffer.length === 0) { probleme.push({ key: z.key, grund: 'Schlüssel nicht gefunden' }); continue; }
    if (treffer.length > 1) { probleme.push({ key: z.key, grund: 'Schlüssel mehrfach gefunden (' + treffer.length + ')' }); continue; }
    const { r, c } = treffer[0];
    if (c.value !== z.de) { probleme.push({ key: z.key, grund: 'deutscher Quelltext weicht ab', ist: c.value }); continue; }
    const t = (r.translations || []).find((x) => x.key === z.key);
    if (t && t.value === z.fr && !t.outdated) { unveraendert.push(z.key); continue; }
    plan.push({ id: r.resourceId, key: z.key, digest: c.digest, fr: z.fr, vorher: t ? { value: t.value, outdated: !!t.outdated } : null });
  }
  return { plan, probleme, unveraendert };
}

/** Prüft nach dem Schreiben, ob jeder Plan-Eintrag gelesen genau den Zieltext trägt und nicht mehr veraltet ist. */
export function pruefenNachher(ressourcen, ziele = ZIELE) {
  const fehler = [];
  for (const z of ziele) {
    const r = ressourcen.find((x) => (x.translatableContent || []).some((c) => c.key === z.key));
    const t = r && (r.translations || []).find((x) => x.key === z.key);
    if (!t) fehler.push({ key: z.key, grund: 'keine Übersetzung' });
    else if (t.value !== z.fr) fehler.push({ key: z.key, grund: 'Wert weicht ab', ist: t.value });
    else if (t.outdated) fehler.push({ key: z.key, grund: 'noch als veraltet markiert' });
  }
  return fehler;
}

// ---------- Shopify ----------
const Q = `query($t:TranslatableResourceType!,$a:String){translatableResources(first:50,resourceType:$t,after:$a){pageInfo{hasNextPage endCursor}nodes{resourceId translatableContent{key value digest} translations(locale:"fr"){key value outdated}}}}`;
const M_REG = `mutation($id:ID!,$tr:[TranslationInput!]!){translationsRegister(resourceId:$id,translations:$tr){userErrors{field message}}}`;
const M_DEL = `mutation($id:ID!,$k:[String!]!){translationsRemove(resourceId:$id,locales:["fr"],translationKeys:$k){userErrors{field message}}}`;

async function token() {
  const f = process.env.SHOPIFY_TOKEN_DATEI || '/tmp/cj_shop_token.txt';
  try { const t = readFileSync(f, 'utf8').trim(); if (t) return t; } catch { /* weiter */ }
  const cid = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!cid || !sec) throw new Error('Kein Shopify-Zugang');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: cid, client_secret: sec, grant_type: 'client_credentials' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('Token nicht erhalten');
  return j.access_token;
}
export function gqlMit(tok) {
  const f = async (q, v, versuch = 0) => {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) });
    const j = await r.json();
    const gedrosselt = (j.errors || []).some((e) => /throttl/i.test(JSON.stringify(e))) || r.status === 429;
    if (gedrosselt && versuch < 6) { await new Promise((s) => setTimeout(s, 1500 * (versuch + 1))); return f(q, v, versuch + 1); }
    if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 300));
    return j.data;
  };
  return f;
}
export async function alleLesen(gql) {
  const out = []; let after = null;
  for (;;) {
    const d = await gql(Q, { t: TYP, a: after });
    out.push(...d.translatableResources.nodes);
    if (!d.translatableResources.pageInfo.hasNextPage) break; after = d.translatableResources.pageInfo.endCursor;
  }
  return out;
}

/** Der Lauf selbst; gql wird eingespeist (Test: Attrappe). Gibt { exit, ... } zurück. */
export async function lauf({ gql, live = false, zurueck = false, dir = HIER, log = console.log, ziele = ZIELE }) {
  const vorherDatei = path.join(dir, 'sicherung', 'vorher.json');
  const ressourcen = await alleLesen(gql);

  if (zurueck) {
    if (!existsSync(vorherDatei)) { log('Keine Sicherung vorhanden: nichts zurückzunehmen.'); return { exit: 2 }; }
    const s = JSON.parse(readFileSync(vorherDatei, 'utf8'));
    log(`Rücknahme aus ${path.relative(process.cwd(), vorherDatei)} (${s.eintraege.length} Schlüssel).`);
    for (const e of s.eintraege) {
      const r = ressourcen.find((x) => (x.translatableContent || []).some((c) => c.key === e.key));
      if (!r) { log(`  ÜBERSPRUNGEN (Schlüssel nicht mehr da): ${e.key}`); continue; }
      const c = r.translatableContent.find((x) => x.key === e.key);
      if (!live) { log(`  [Trockenlauf] ${e.vorher ? 'würde alten Wert setzen' : 'würde Übersetzung entfernen'}: ${e.key}`); continue; }
      const d = e.vorher
        ? await gql(M_REG, { id: r.resourceId, tr: [{ locale: 'fr', key: e.key, value: e.vorher.value, translatableContentDigest: c.digest }] })
        : await gql(M_DEL, { id: r.resourceId, k: [e.key] });
      const ue = (d.translationsRegister || d.translationsRemove).userErrors;
      if (ue.length) { log('  FEHLER ' + e.key + ': ' + JSON.stringify(ue)); return { exit: 3 }; }
      log(`  zurückgenommen: ${e.key}`);
    }
    return { exit: 0 };
  }

  const { plan, probleme, unveraendert } = planen(ressourcen, ziele);
  log(`Ziele: ${ziele.length} · zu schreiben: ${plan.length} · schon richtig: ${unveraendert.length} · Probleme: ${probleme.length}`);
  for (const p of probleme) log(`  PROBLEM ${p.key}: ${p.grund}${p.ist ? ' → ' + JSON.stringify(p.ist).slice(0, 160) : ''}`);
  if (probleme.length) { log('Abbruch: mit Problemen wird nichts geschrieben.'); return { exit: 2, probleme }; }
  for (const p of plan) log(`  ${live ? 'SCHREIBE' : '[Trockenlauf]'} ${p.key.split('.').slice(-2).join('.')}\n      vorher: ${p.vorher ? JSON.stringify(p.vorher.value).slice(0, 110) + (p.vorher.outdated ? ' (veraltet)' : '') : '(keine)'}\n      neu:    ${JSON.stringify(p.fr).slice(0, 110)}`);
  if (!live) return { exit: 0, plan };
  if (!plan.length) { log('Nichts zu tun.'); return { exit: 0, plan }; }

  mkdirSync(path.join(dir, 'sicherung'), { recursive: true });
  // Sicherung nur anlegen, wenn noch keine da ist (eine vorhandene enthält den ECHTEN Stand vor dem ersten Lauf)
  if (!existsSync(vorherDatei)) writeFileSync(vorherDatei, JSON.stringify({ at: new Date().toISOString(), eintraege: plan.map((p) => ({ key: p.key, vorher: p.vorher })) }, null, 1));
  for (const p of plan) {
    const d = await gql(M_REG, { id: p.id, tr: [{ locale: 'fr', key: p.key, value: p.fr, translatableContentDigest: p.digest }] });
    const ue = d.translationsRegister.userErrors;
    if (ue.length) { log('FEHLER ' + p.key + ': ' + JSON.stringify(ue)); return { exit: 3 }; }
  }
  const fehler = pruefenNachher(await alleLesen(gql), ziele);
  if (fehler.length) { log('RÜCKLESEN ABWEICHEND:\n' + fehler.map((f) => '  ' + f.key + ': ' + f.grund).join('\n')); return { exit: 3, fehler }; }
  log(`Rücklesen: alle ${ziele.length} Schlüssel tragen den Zieltext und sind nicht mehr veraltet.`);
  return { exit: 0, plan };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const tok = await token();
  const r = await lauf({ gql: gqlMit(tok), live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1' });
  process.exit(r.exit);
}
