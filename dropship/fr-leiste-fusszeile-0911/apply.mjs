// Französische Ankündigungsleiste und Fusszeile nachziehen (Rückgabe-Text Welle 2, Rest vom 09.11.2026).
//
// Ausgangslage (GEMESSEN 09.11.2026, translatableResources ONLINE_STORE_THEME_SECTION_GROUP, Sprache fr): die französischen
// Übersetzungen der Leistenzeilen 1, 3, 4, 5 und des Kontaktblocks der Fusszeile sind «outdated» und werden trotzdem ausgeliefert
// (auf /fr/policies/* gelesen); Zeile 4 wirbt noch für den Halloween-Shop, Zeile 5 nennt einen Mengenrabatt, der so nicht mehr
// gilt, Zeile 3 und die Fusszeile sagen «30 jours de retour» ohne den Zusatz zu selbst gestalteten Artikeln.
//
// Trockenlauf ist Vorgabe. LIVE=1 schreibt (nur Sprache fr, nur die hier genannten Schlüssel, über translationsRegister mit dem
// aktuellen Digest) und liest danach frisch zurück (bis zu 8 Versuche im Abstand von 4 s). ZURUECK=1 LIVE=1 stellt den Stand aus
// sicherung/vorher.json wieder her und liest ebenfalls zurück; Hinweis: die Markierung «veraltet» kommt dabei NICHT zurück.
// Schutz: stimmt der deutsche Quelltext eines Schlüssels nicht mehr mit dem hier hinterlegten überein, wird NICHT geschrieben
// (jemand hat die Quelle inzwischen geändert; dann zuerst die Übersetzung neu prüfen).
// Exit: 0 gut · 1 technischer Fehler (Netz, Token) · 2 Plan-/Quellproblem oder unvollständige Rücknahme · 3 Schreib-/Rücklesefehler.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const API = '2026-01';
const SHOP = (process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const TYP = 'ONLINE_STORE_THEME_SECTION_GROUP';
const NB = '\u00A0'; // geschütztes Leerzeichen (französische Typografie: vor «:» und «%»)

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
    fr: '↩️ 30 jours de retour (sauf articles personnalisés) · 🔒 Paiement sécurisé et chiffré',
  },
  {
    key: KOPF + 'ls_announce_4.text:2zc7lmlzku3ix',
    de: '🎭 Kostüme ab Schweizer Lager – für Partys im November und die Fasnacht ab 11.11. (Lieferdatum auf der Produktseite)',
    fr: '🎭 Costumes en stock en Suisse – pour vos soirées de novembre et la saison du carnaval dès le 11.11. (date de livraison sur la fiche produit)',
  },
  {
    key: KOPF + 'ls_announce_4.link:2zc7lmm4z64qs',
    de: '/collections/kostueme-ch-lager',
    fr: '/fr/collections/kostueme-ch-lager',
  },
  {
    key: KOPF + 'ls_announce_5.text:3a7iywrzwqe0',
    de: '🛒 Mengenrabatt bei ausgewählten Artikeln: ab 2 Stück –5%, ab 3 Stück bis –10% — automatisch im Warenkorb',
    fr: `🛒 Rabais de quantité sur certains articles${NB}: dès 2 pièces –5${NB}%, dès 3 pièces jusqu’à –10${NB}% — appliqué automatiquement au panier`,
  },
  {
    key: FUSS + 'text_lx_kontakt.text:2pauo78tawljr',
    de: '<p><strong>Kontakt</strong><br>LuxeStyle · 3123 Belp, Schweiz<br><a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a> · <a href="/policies/legal-notice">Impressum</a><br>Versand in die Schweiz und nach Liechtenstein · <a href="/policies/shipping-policy">Versand</a> · <a href="/policies/refund-policy">30 Tage Rückgabe (ausser selbst gestaltete Artikel)</a></p>',
    fr: '<p><strong>Contact</strong><br>LuxeStyle · 3123 Belp, Suisse<br><a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a> · <a href="/fr/policies/legal-notice">Mentions légales</a><br>Livraison en Suisse et au Liechtenstein · <a href="/fr/policies/shipping-policy">Livraison</a> · <a href="/fr/policies/refund-policy">Retour sous 30 jours (sauf articles personnalisés)</a></p>',
  },
];

const istLink = (key) => /\.link:/.test(key);

// ---------- reine Logik (auch vom Test benutzt) ----------
/** Ordnet die gelesenen Ressourcen den Zielen zu. Gibt { plan, probleme, unveraendert } zurück; probleme != [] bedeutet: nichts schreiben. */
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

/** Prüft nach dem Schreiben, ob jeder Schlüssel gelesen genau den Zieltext trägt und nicht mehr veraltet ist. */
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

/** Prüft nach der Rücknahme: Schlüssel mit Altwert tragen ihn wieder, Schlüssel ohne Altwert haben keine Übersetzung mehr. */
export function pruefenZurueck(ressourcen, eintraege) {
  const fehler = [];
  for (const e of eintraege) {
    const r = ressourcen.find((x) => (x.translatableContent || []).some((c) => c.key === e.key));
    const t = r && (r.translations || []).find((x) => x.key === e.key);
    if (e.vorher) { if (!t || t.value !== e.vorher.value) fehler.push({ key: e.key, grund: 'Altwert nicht wiederhergestellt' }); }
    else if (t) fehler.push({ key: e.key, grund: 'Übersetzung ist noch da' });
  }
  return fehler;
}

// ---------- Shopify ----------
const Q = `query($t:TranslatableResourceType!,$a:String){translatableResources(first:50,resourceType:$t,after:$a){pageInfo{hasNextPage endCursor}nodes{resourceId translatableContent{key value digest} translations(locale:"fr"){key value outdated}}}}`;
const M_REG = `mutation($id:ID!,$tr:[TranslationInput!]!){translationsRegister(resourceId:$id,translations:$tr){userErrors{field message}}}`;
const M_DEL = `mutation($id:ID!,$k:[String!]!){translationsRemove(resourceId:$id,locales:["fr"],translationKeys:$k){userErrors{field message}}}`;

export async function tokenFrisch({ fetchImpl = fetch } = {}) {
  const cid = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!cid || !sec) throw new Error('Kein Shopify-Zugang (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET fehlen)');
  const r = await fetchImpl(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: cid, client_secret: sec, grant_type: 'client_credentials' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('Token nicht erhalten');
  return j.access_token;
}
export async function tokenStart() {
  const f = process.env.SHOPIFY_TOKEN_DATEI || '/tmp/cj_shop_token.txt';
  try { const t = readFileSync(f, 'utf8').trim(); if (t) return t; } catch { /* weiter */ }
  return tokenFrisch();
}

/** GraphQL-Aufruf mit Wiederholung bei Drosselung/5xx/Netz/Nicht-JSON und einmaliger Token-Erneuerung bei 401. */
export function gqlMit({ token, tokenErneuern, fetchImpl = fetch, warte = (ms) => new Promise((s) => setTimeout(s, ms)) }) {
  let tok = token;
  const f = async (q, v, versuch = 0, erneuert = false) => {
    let r, text;
    try {
      r = await fetchImpl(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) });
      text = await r.text();
    } catch (e) {
      if (versuch < 4) { await warte(1500 * (versuch + 1)); return f(q, v, versuch + 1, erneuert); }
      throw new Error('Netzfehler: ' + e.message);
    }
    if (r.status === 401 && tokenErneuern && !erneuert) { tok = await tokenErneuern(); return f(q, v, versuch, true); }
    if (r.status === 401) throw new Error('HTTP 401: Zugang abgelehnt');
    if (r.status === 429 || r.status >= 500) {
      if (versuch < 6) { await warte(1500 * (versuch + 1)); return f(q, v, versuch + 1, erneuert); }
      throw new Error('HTTP ' + r.status + ' nach mehreren Versuchen');
    }
    let j;
    try { j = JSON.parse(text); } catch {
      if (versuch < 3) { await warte(1500 * (versuch + 1)); return f(q, v, versuch + 1, erneuert); }
      throw new Error('Antwort ist kein JSON (HTTP ' + r.status + '): ' + String(text).slice(0, 120));
    }
    const errs = Array.isArray(j.errors) ? j.errors : (j.errors ? [j.errors] : []);
    if (errs.some((e) => /throttl/i.test(JSON.stringify(e))) && versuch < 6) { await warte(1500 * (versuch + 1)); return f(q, v, versuch + 1, erneuert); }
    if (errs.length) throw new Error('GraphQL: ' + JSON.stringify(errs).slice(0, 300));
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

async function lesenBisGleich(gql, pruefung, warte, versuche = 8) {
  let fehler = [];
  for (let i = 0; i < versuche; i++) {
    fehler = pruefung(await alleLesen(gql));
    if (!fehler.length) return [];
    if (i < versuche - 1) await warte(4000);
  }
  return fehler;
}

function sicherungLesen(datei) { return existsSync(datei) ? JSON.parse(readFileSync(datei, 'utf8')) : null; }
function sicherungSchreiben(datei, s) { const tmp = datei + '.tmp'; writeFileSync(tmp, JSON.stringify(s, null, 1)); renameSync(tmp, datei); }

/** Der Lauf selbst; gql wird eingespeist (Test: Attrappe). Gibt { exit, ... } zurück. */
export async function lauf({ gql, live = false, zurueck = false, dir = HIER, log = console.log, ziele = ZIELE, warte = (ms) => new Promise((s) => setTimeout(s, ms)) }) {
  const vorherDatei = path.join(dir, 'sicherung', 'vorher.json');
  const ressourcen = await alleLesen(gql);

  if (zurueck) {
    const s = sicherungLesen(vorherDatei);
    if (!s) { log('Keine Sicherung vorhanden: nichts zurückzunehmen.'); return { exit: 2 }; }
    log(`Rücknahme aus sicherung/vorher.json (${s.eintraege.length} Schlüssel).`);
    let probleme = 0;
    for (const e of s.eintraege) {
      const r = ressourcen.find((x) => (x.translatableContent || []).some((c) => c.key === e.key));
      if (!r) { log(`  PROBLEM (Schlüssel nicht mehr da): ${e.key}`); probleme++; continue; }
      if (e.resourceId && r.resourceId !== e.resourceId) { log(`  PROBLEM (Ressource gewechselt, Theme geändert?): ${e.key}`); probleme++; continue; }
      const c = r.translatableContent.find((x) => x.key === e.key);
      if (!live) { log(`  [Trockenlauf] ${e.vorher ? 'würde alten Wert setzen' : 'würde Übersetzung entfernen'}: ${e.key}`); continue; }
      const d = e.vorher
        ? await gql(M_REG, { id: r.resourceId, tr: [{ locale: 'fr', key: e.key, value: e.vorher.value, translatableContentDigest: c.digest }] })
        : await gql(M_DEL, { id: r.resourceId, k: [e.key] });
      const ue = (d.translationsRegister || d.translationsRemove).userErrors;
      if (ue.length) { log('  FEHLER ' + e.key + ': ' + JSON.stringify(ue)); return { exit: 3 }; }
      log(`  zurückgenommen: ${e.key}`);
    }
    if (live && !probleme) {
      const fehler = await lesenBisGleich(gql, (rs) => pruefenZurueck(rs, s.eintraege), warte);
      if (fehler.length) { log('RÜCKLESEN NACH RÜCKNAHME ABWEICHEND:\n' + fehler.map((f) => '  ' + f.key + ': ' + f.grund).join('\n')); return { exit: 3, fehler }; }
      log('Rücklesen: alle Schlüssel tragen wieder den Stand vor dem ersten Lauf (ohne «veraltet»-Markierung).');
    }
    return { exit: probleme ? 2 : 0 };
  }

  const { plan, probleme, unveraendert } = planen(ressourcen, ziele);
  log(`Ziele: ${ziele.length} · zu schreiben: ${plan.length} · schon richtig: ${unveraendert.length} · Probleme: ${probleme.length}`);
  for (const p of probleme) log(`  PROBLEM ${p.key}: ${p.grund}${p.ist ? ' → ' + JSON.stringify(p.ist).slice(0, 160) : ''}`);
  if (probleme.length) { log('Abbruch: mit Problemen wird nichts geschrieben.'); return { exit: 2, probleme }; }
  for (const p of plan) log(`  ${live ? 'SCHREIBE' : '[Trockenlauf]'} ${p.key.split('.').slice(-2).join('.')}\n      vorher: ${p.vorher ? JSON.stringify(p.vorher.value).slice(0, 110) + (p.vorher.outdated ? ' (veraltet)' : '') : '(keine)'}\n      neu:    ${JSON.stringify(p.fr).slice(0, 110)}`);
  if (!live) return { exit: 0, plan };
  if (!plan.length) { log('Nichts zu tun.'); return { exit: 0, plan }; }

  // Sicherung VOR dem ersten Schreiben; vorhandene Einträge bleiben (sie halten den echten Stand vor dem ersten Lauf), fehlende kommen dazu.
  mkdirSync(path.join(dir, 'sicherung'), { recursive: true });
  const s = sicherungLesen(vorherDatei) || { at: new Date().toISOString(), eintraege: [] };
  const hat = new Set(s.eintraege.map((e) => e.key)); let neu = 0;
  for (const p of plan) if (!hat.has(p.key)) { s.eintraege.push({ key: p.key, resourceId: p.id, vorher: p.vorher }); neu++; }
  if (neu || !existsSync(vorherDatei)) sicherungSchreiben(vorherDatei, s);

  // Den Link zuerst: eine abgelehnte URL-Übersetzung soll den Lauf stoppen, bevor Texte halb umgestellt sind.
  const reihenfolge = [...plan].sort((a, b) => (istLink(b.key) ? 1 : 0) - (istLink(a.key) ? 1 : 0));
  const geschrieben = [];
  for (const p of reihenfolge) {
    const d = await gql(M_REG, { id: p.id, tr: [{ locale: 'fr', key: p.key, value: p.fr, translatableContentDigest: p.digest }] });
    const ue = d.translationsRegister.userErrors;
    if (ue.length) {
      const offen = reihenfolge.filter((x) => !geschrieben.includes(x.key)).map((x) => x.key);
      log('FEHLER ' + p.key + ': ' + JSON.stringify(ue) + `\n  schon geschrieben: ${geschrieben.length} · offen: ${offen.length}\n  (Rücknahme: ZURUECK=1 LIVE=1)`);
      return { exit: 3, geschrieben, offen };
    }
    geschrieben.push(p.key);
  }
  const fehler = await lesenBisGleich(gql, (rs) => pruefenNachher(rs, ziele), warte);
  if (fehler.length) { log('RÜCKLESEN ABWEICHEND:\n' + fehler.map((f) => '  ' + f.key + ': ' + f.grund).join('\n')); return { exit: 3, fehler }; }
  log(`Rücklesen: alle ${ziele.length} Schlüssel tragen den Zieltext und sind nicht mehr veraltet.`);
  return { exit: 0, plan, geschrieben };
}

const istMain = (() => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } })();
if (istMain) {
  try {
    const gql = gqlMit({ token: await tokenStart(), tokenErneuern: () => tokenFrisch() });
    const r = await lauf({ gql, live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1' });
    process.exit(r.exit);
  } catch (e) {
    console.error('FEHLER: ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
}
