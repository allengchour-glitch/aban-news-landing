// Mängelmeldung «30 Tage» (Besitzer 09.11.2026 auf meine Frage: «Ja, überall 30 Tage»).
// Bisher stand für defekte, beschädigte oder falsch gelieferte Standardware «innerhalb von 7 Tagen nach Erhalt»;
// bei selbst gestalteten Artikeln gelten seit Welle 2 (06./09.11.) schon 30 Tage. Jetzt gilt überall dieselbe Zahl.
// Geändert wird NUR die Frist (und die dadurch sinnlos gewordene Klammer «bei selbst gestalteten Artikeln … 30 Tage»);
// «deine gesetzlichen Rechte bei Mängeln bleiben unberührt» und alle anderen Sätze bleiben, wie sie sind.
// Ziele (7 Stellen in 6 Zielen): Rückgaberichtlinie, AGB, Seite «Garantie», die englischen Seiten «about-us-en» und
// «refund-policy-en», Chat-Assistent (sections/lux-assistent.liquid, zwei Antworten). Daten: daten/ziele.json.
//   Trockenlauf (Vorgabe, nur lesen):   node dropship/maengelfrist-0911/apply.mjs
//   Einspielen:                          LIVE=1 node dropship/maengelfrist-0911/apply.mjs
//   Rücknahme (stellt den Stand davor):  ZURUECK=1 LIVE=1 node dropship/maengelfrist-0911/apply.mjs
// Regel: je Ziel muss `vorher` im heutigen Text GENAU EINMAL vorkommen (oder `nachher` schon dort stehen), sonst bleibt
// das Ziel unberührt und wird gemeldet. Rücknahme schreibt nur, wenn der heutige Text noch dem Stand danach entspricht.
// Nicht enthalten: die französischen Übersetzungen der beiden Richtlinien (veraltet seit Welle 2, eigener Schritt).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ersetzeAlle, jsonRoh, jsonGueltig, gruppiere } from '../rueckgabe-0611/apply2.mjs';

/** Plant EIN Ziel gegen den heutigen Text `ist`. Rein (kein Netz). */
export function planeZiel(ist, z) {
  if (ist == null) return { art: 'problem', fehler: ['Ziel nicht lesbar'] };
  const res = ersetzeAlle(ist, z.eintraege, z.json ? jsonRoh : (s) => s);
  if (z.json && res.geaendert && !jsonGueltig(res.text)) res.fehler.push('Ergebnis ist kein gültiges JSON');
  if (res.fehler.length) return { art: 'problem', fehler: res.fehler };
  return { art: res.geaendert ? 'aendern' : 'fertig', soll: res.text };
}

/** Prüft die Daten selbst (ohne Netz): jede Ersetzung ändert die Frist 7 → 30 und sonst nichts Auffälliges. */
export function pruefeDaten(alle) {
  const f = [];
  for (const e of alle) {
    const t = `${e.nr} (${e.handle || e.feld})`;
    if (!e.vorher || !e.nachher || e.vorher === e.nachher) f.push(`${t}: vorher/nachher leer oder gleich`);
    if (!/\b7 (Tagen?|days)\b/.test(e.vorher)) f.push(`${t}: «vorher» nennt keine 7-Tage-Frist`);
    if (/\b7 (Tagen?|days)\b/.test(e.nachher)) f.push(`${t}: «nachher» nennt noch eine 7-Tage-Frist`);
    if (!/\b30 (Tagen?|days)\b/.test(e.nachher)) f.push(`${t}: «nachher» nennt keine 30-Tage-Frist`);
    if (/\n/.test(e.nachher)) f.push(`${t}: Umbruch im Text`);
    if (e.art !== 'theme_liquid' && !e.id) f.push(`${t}: ohne Ziel-ID`);
  }
  return f;
}

if (process.argv[1] && process.argv[1].endsWith('maengelfrist-0911/apply.mjs')) {
  const { shopifyGql } = await import('../../automation/lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('../../automation/lib/shopify_secret.mjs');
  const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
  const HIER = new URL('.', import.meta.url).pathname, SICH = HIER + 'sicherung/maengelfrist.json';
  const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const warte = (ms) => new Promise((s) => setTimeout(s, ms));
  const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];

  // ---- Lesen / Schreiben je Zielart (wie dropship/rueckgabe-0611/apply2.mjs)
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
    },
    richtlinie: {
      lies: async (z) => (await q(`{shop{shopPolicies{id type body}}}`)).shop.shopPolicies.find((p) => p.id === z.id)?.body,
      schreibe: async (z, text) => (await q(`mutation($p:ShopPolicyInput!){shopPolicyUpdate(shopPolicy:$p){shopPolicy{id} userErrors{field message}}}`, { p: { type: z.typ, body: text } })).shopPolicyUpdate.userErrors || [],
    },
    seite: {
      lies: async (z) => (await q(`query($id:ID!){page(id:$id){body}}`, { id: z.id })).page?.body,
      schreibe: async (z, text) => (await q(`mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){page{id} userErrors{field message}}}`, { id: z.id, p: { body: text } })).pageUpdate.userErrors || [],
    },
  };
  const wartenBisGleich = async (z, soll, maxMs) => {
    const t0 = Date.now();
    for (;;) { const j = await A[z.art].lies(z); if (j === soll) return true; if (Date.now() - t0 > maxMs) return false; await warte(z.art === 'theme' ? 10000 : 2000); }
  };

  const alle = JSON.parse(readFileSync(HIER + 'daten/ziele.json', 'utf8'));
  const dfehler = pruefeDaten(alle);
  if (dfehler.length) { console.error('Datenfehler:\n  ' + dfehler.join('\n  ')); process.exit(2); }
  const ziele = gruppiere(alle);

  if (ZURUECK) {
    if (!existsSync(SICH)) { console.error('Keine Sicherung (' + SICH + ')'); process.exit(3); }
    const s = JSON.parse(readFileSync(SICH, 'utf8')); let ok = 0, fremd = 0;
    for (const b of s.ziele) {
      const z = ziele.find((x) => x.key === b.key);
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
    const p = planeZiel(ist, z);
    if (p.art === 'problem') { probleme.push(`${z.key}: ${p.fehler.join(' | ')}`); continue; }
    (p.art === 'aendern' ? plan : fertig).push({ z, ist, soll: p.soll, nr: z.eintraege.map((e) => e.nr).join('+') });
  }
  console.log(`ZIELE: ${ziele.length} | zu ändern ${plan.length} | schon fertig ${fertig.length} | Probleme ${probleme.length}`);
  for (const x of plan) console.log('  ÄNDERN ', x.z.key.padEnd(44), x.nr.padEnd(6), `(${x.ist.length} → ${x.soll.length} Zeichen)`);
  for (const x of fertig) console.log('  fertig ', x.z.key);
  for (const p of probleme) console.log('  PROBLEM', p);
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(probleme.length ? 4 : 0); }
  if (probleme.length) { console.error('Probleme vorhanden: erst klären, nichts geschrieben.'); process.exit(4); }
  if (existsSync(SICH)) { console.error('sicherung/maengelfrist.json liegt schon vor: erst ZURUECK=1 oder prüfen'); process.exit(3); }

  // ---- Schreiben (Sicherung zuerst; Richtlinien und Seiten zuerst, Theme zuletzt)
  const sicher = { gesichert: 'vor Mängelfrist 30 Tage, 09.11.2026', theme: th.id, ziele: plan.map((x) => ({ key: x.z.key, vorher: x.ist, nachher: x.soll })) };
  writeFileSync(SICH, JSON.stringify(sicher, null, 1));
  const reihenfolge = [...plan].sort((a, b) => (a.z.art === 'theme') - (b.z.art === 'theme'));
  for (const x of reihenfolge) {
    const fe = await A[x.z.art].schreibe(x.z, x.soll);
    if (fe.length) { console.error(x.z.key, JSON.stringify(fe), '→ Sicherung', SICH); process.exit(5); }
    console.log('geschrieben', x.z.key);
  }
  // ---- Rücklesen (frisch, bis gleich)
  const abw = [];
  for (const x of reihenfolge) if (!(await wartenBisGleich(x.z, x.soll, x.z.art === 'theme' ? 150000 : 20000))) abw.push(x.z.key);
  if (abw.length) {
    console.error('RÜCKLESEN WEICHT AB bei:', abw.join(', ')); process.exit(6);
  }
  console.log('Rückgelesen: alle', plan.length, 'Ziele GLEICH Soll. Sicherung:', SICH);
}
