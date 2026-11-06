// Rückgabe-Texte «Selbst gestalten», WELLE 2 (Besitzer 06.11.2026: «5 wie im printful schreibe das»): alles ausser den Produkten (Welle 1).
// Ziele: Rückgaberichtlinie und AGB (Shop-Richtlinien), 6 Seiten, Sammlung «Selbst gestalten», 1 Blog-Artikel,
// Theme-Dateien (Warenkorb, Ankündigungsleiste, Fusszeile, Sammlungsseite, Chat-Assistent). Trockenlauf ist Vorgabe.
//   Einspielen: LIVE=1 node dropship/rueckgabe-0611/apply2.mjs     Rücknahme: ZURUECK=1 LIVE=1 node dropship/rueckgabe-0611/apply2.mjs
//   Nur Teile:  ZIELE=theme,richtlinie,seite,sammlung,blog  (Vorgabe: alle)
// Regel: je Ziel muss `vorher` im heutigen Text GENAU EINMAL vorkommen (oder `nachher` schon dort stehen), sonst bleibt das Ziel unberührt und wird gemeldet.
// Nicht enthalten: Übersetzungen (FR der Leiste/Fusszeile), Bausteine EN/FR, Bestellbestätigung, Merchant Center, JSON-LD, Quelltext-Generatoren (eigene Schritte).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const zaehle = (t, s) => (s ? t.split(s).length - 1 : 0);
/** JSON-String-Inhalt (ohne Anführungszeichen), wie er in einer Theme-JSON-Datei steht. */
export const jsonRoh = (s) => JSON.stringify(s).slice(1, -1);

/** Ersetzt in `text` (roh): jeder `vorher` genau einmal. escape: Funktion für Dateien, in denen der Text maskiert steht (JSON). Rein. */
export function ersetzeAlle(text, eintraege, escape = (s) => s) {
  const fehler = [], erledigt = [];
  let t = text;
  for (const e of eintraege) {
    const v = escape(e.vorher), n = escape(e.nachher);
    if (!v || v === n) { fehler.push(`${e.nr} «vorher» leer oder gleich «nachher»`); continue; }
    if (zaehle(t, n) >= 1 && !t.split(n).join('').includes(v)) { erledigt.push(e.nr); continue; }
    if (zaehle(t, n) >= 1) { fehler.push(`${e.nr} «nachher» steht schon da, «vorher» aber auch noch (uneindeutig)`); continue; }
    const c = zaehle(t, v);
    if (c !== 1) { fehler.push(`${e.nr} «vorher» kommt ${c}× vor (erwartet 1×): ${e.vorher.replace(/\s+/g, ' ').slice(0, 70)}`); continue; }
    t = t.replace(v, () => n);
  }
  return { text: t, fehler, erledigt, geaendert: t !== text };
}
/** Theme-JSON darf nach dem Ersetzen nur gültig bleiben (Shopify-Vorlagen beginnen mit einem Kommentarblock). */
export function jsonGueltig(text) { try { JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\//, '')); return true; } catch { return false; } }

/** Welches Ziel gehört zu einem Eintrag? */
export function zielVon(e) {
  if (e.art === 'theme_json') return { art: 'theme', key: 'theme:' + e.feld.split(' :: ')[0], datei: e.feld.split(' :: ')[0], json: true };
  if (e.art === 'theme_liquid') return { art: 'theme', key: 'theme:' + e.feld.split(' Zeile')[0], datei: e.feld.split(' Zeile')[0], json: false };
  if (e.art === 'richtlinie') return { art: 'richtlinie', key: 'richtlinie:' + e.handle, id: e.id, typ: e.handle === 'refund-policy' ? 'REFUND_POLICY' : e.handle === 'terms-of-service' ? 'TERMS_OF_SERVICE' : null };
  if (e.art === 'seite_veroeffentlicht') return { art: 'seite', key: 'seite:' + e.handle, id: e.id };
  if (e.art === 'sammlung_beschreibung') return { art: 'sammlung', key: 'sammlung:' + e.handle, id: e.id };
  if (e.art === 'blog_artikel') return { art: 'blog', key: 'blog:' + e.handle, id: e.id };
  return null;
}
export function gruppiere(eintraege) {
  const m = new Map();
  for (const e of eintraege) { const z = zielVon(e); if (!z) throw new Error('unbekannte Art ' + e.art); if (!m.has(z.key)) m.set(z.key, { ...z, eintraege: [] }); m.get(z.key).eintraege.push(e); }
  return [...m.values()];
}

if (process.argv[1] && process.argv[1].endsWith('rueckgabe-0611/apply2.mjs')) {
  const { shopifyGql } = await import('../../automation/lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('../../automation/lib/shopify_secret.mjs');
  const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
  const WAHL = (process.env.ZIELE || 'theme,richtlinie,seite,sammlung,blog').split(',').map((s) => s.trim());
  const HIER = new URL('.', import.meta.url).pathname, SICH = HIER + 'sicherung/welle2.json';
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const warte = (ms) => new Promise((s) => setTimeout(s, ms));
  const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];

  // ---- Lesen / Schreiben je Zielart
  const A = {
    theme: {
      lies: async (z) => {
        const n = (await q(`query($id:ID!,$f:[String!]!){theme:node(id:$id){... on OnlineStoreTheme{files(filenames:$f,first:1){nodes{filename body{... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}}`, { id: th.id, f: [z.datei] })).theme.files.nodes[0];
        let c = n?.body?.content; if (c == null && n?.body?.url) c = await (await fetch(n.body.url)).text(); return c;
      },
      schreibe: async (z, text) => {
        const u = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: z.datei, body: { type: 'TEXT', value: text } }] })).themeFilesUpsert;
        return u.userErrors || [];
      },
      langsam: true,
    },
    richtlinie: {
      lies: async (z) => (await q(`{shop{shopPolicies{id type body}}}`)).shop.shopPolicies.find((p) => p.id === z.id)?.body,
      schreibe: async (z, text) => (await q(`mutation($p:ShopPolicyInput!){shopPolicyUpdate(shopPolicy:$p){shopPolicy{id} userErrors{field message}}}`, { p: { type: z.typ, body: text } })).shopPolicyUpdate.userErrors || [],
    },
    seite: {
      lies: async (z) => (await q(`query($id:ID!){page(id:$id){body}}`, { id: z.id })).page?.body,
      schreibe: async (z, text) => (await q(`mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){page{id} userErrors{field message}}}`, { id: z.id, p: { body: text } })).pageUpdate.userErrors || [],
    },
    sammlung: {
      lies: async (z) => (await q(`query($id:ID!){collection(id:$id){descriptionHtml}}`, { id: z.id })).collection?.descriptionHtml,
      schreibe: async (z, text) => (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{id} userErrors{field message}}}`, { i: { id: z.id, descriptionHtml: text } })).collectionUpdate.userErrors || [],
    },
    blog: {
      lies: async (z) => (await q(`query($id:ID!){article(id:$id){body}}`, { id: z.id })).article?.body,
      schreibe: async (z, text) => (await q(`mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){article{id} userErrors{field message}}}`, { id: z.id, a: { body: text } })).articleUpdate.userErrors || [],
    },
  };
  const wartenBisGleich = async (z, soll, maxMs) => {
    const t0 = Date.now();
    for (;;) { const j = await A[z.art].lies(z); if (j === soll) return true; if (Date.now() - t0 > maxMs) return false; await warte(z.art === 'theme' ? 10000 : 2000); }
  };

  const alle = JSON.parse(readFileSync(HIER + 'daten/welle2.json', 'utf8'));
  const ziele = gruppiere(alle).filter((z) => WAHL.includes(z.art));

  if (ZURUECK) {
    if (!existsSync(SICH)) { console.error('Keine Sicherung (' + SICH + ')'); process.exit(3); }
    const s = JSON.parse(readFileSync(SICH, 'utf8')); let ok = 0, fremd = 0;
    for (const b of s.ziele) {
      const z = ziele.find((x) => x.key === b.key) || gruppiere(alle).find((x) => x.key === b.key);
      const jetzt = await A[z.art].lies(z);
      if (jetzt !== b.nachher) { console.log('NICHT zurückgesetzt (inzwischen anders verändert):', b.key); fremd++; continue; }
      if (!LIVE) { ok++; continue; }
      const fe = await A[z.art].schreibe(z, b.vorher); if (fe.length) { console.error(b.key, JSON.stringify(fe)); process.exit(5); } ok++;
    }
    console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf Rücknahme', ok, 'Ziele | übersprungen', fremd); process.exit(0);
  }

  // ---- Planen (nur lesen)
  const plan = [], fertig = [], probleme = [];
  for (const z of ziele) {
    const ist = await A[z.art].lies(z);
    if (ist == null) { probleme.push(`${z.key}: Ziel nicht lesbar`); continue; }
    const res = ersetzeAlle(ist, z.eintraege, z.json ? jsonRoh : (s) => s);
    if (z.json && res.geaendert && !jsonGueltig(res.text)) res.fehler.push('Ergebnis ist kein gültiges JSON');
    if (res.fehler.length) { probleme.push(`${z.key}: ${res.fehler.join(' | ')}`); continue; }
    (res.geaendert ? plan : fertig).push({ z, ist, soll: res.text, nr: z.eintraege.map((e) => e.nr).join('+') });
  }
  console.log(`ZIELE: ${ziele.length} | zu ändern ${plan.length} | schon fertig ${fertig.length} | Probleme ${probleme.length}`);
  for (const x of plan) console.log('  ÄNDERN ', x.z.key.padEnd(48), x.nr, `(${x.ist.length} → ${x.soll.length} Zeichen)`);
  for (const x of fertig) console.log('  fertig ', x.z.key);
  for (const p of probleme) console.log('  PROBLEM', p);
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(probleme.length ? 4 : 0); }
  if (probleme.length) { console.error('Probleme vorhanden: erst klären, nichts geschrieben.'); process.exit(4); }
  if (existsSync(SICH)) { console.error('sicherung/welle2.json liegt schon vor: erst ZURUECK=1 oder prüfen'); process.exit(3); }

  // ---- Schreiben (Sicherung zuerst; Richtlinien/Seiten/Sammlung/Blog zuerst, Theme zuletzt)
  const sicher = { gesichert: 'vor Welle 2 Rückgabe-Texte, 06.11.2026', theme: th.id, ziele: plan.map((x) => ({ key: x.z.key, vorher: x.ist, nachher: x.soll })) };
  writeFileSync(SICH, JSON.stringify(sicher, null, 1));
  const reihenfolge = [...plan].sort((a, b) => (a.z.art === 'theme') - (b.z.art === 'theme'));
  for (const x of reihenfolge) {
    const fe = await A[x.z.art].schreibe(x.z, x.soll);
    if (fe.length) { console.error(x.z.key, JSON.stringify(fe), '→ Sicherung', SICH); process.exit(5); }
    console.log('geschrieben', x.z.key);
  }
  // ---- Rücklesen
  const abw = [];
  for (const x of reihenfolge) if (!(await wartenBisGleich(x.z, x.soll, x.z.art === 'theme' ? 150000 : 20000))) abw.push(x.z.key);
  if (abw.length) {
    // Shopify darf Richtlinien-/Seitentext beim Speichern normalisieren: Abweichung zeigen, nichts automatisch zurückschreiben
    console.error('RÜCKLESEN WEICHT AB bei:', abw.join(', ')); process.exit(6);
  }
  console.log('Rückgelesen: alle', plan.length, 'Ziele GLEICH Soll. Sicherung:', SICH);
}
