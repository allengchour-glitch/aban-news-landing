// Rückgabe-Texte für «Selbst gestalten», WELLE 1 (Besitzer 06.11.2026: «5 wie im printful schreibe das»):
// Produktseiten-Ebene. Trockenlauf ist Vorgabe.
//   Einspielen: LIVE=1 node dropship/rueckgabe-0611/apply.mjs      Rücknahme: ZURUECK=1 LIVE=1 node dropship/rueckgabe-0611/apply.mjs
// Was geändert wird (Daten: daten/welle1.json, Quelle: Texter-Entwurf, Nummern G1/G3/G4/G5/G7/G8):
//   G1 seo.description von 27 Produkten («30 Tage Rückgabe» → «Ersatz bei Druckfehlern»); seo.title wird unverändert mitgeschickt
//   G3 Rückgabe-Kasten (div.ls-pod-retoure) von 37 Produkten, G4 pauschale USP-Zeile (2), G5 Kasten ans Ende (3, Entwürfe)
//   G7/G8 Theme templates/product.json, NUR der Editor-Zweig (Aufklappbereich und Vertrauenszeile); der else-Zweig bleibt
// NICHT in Welle 1 (wartet auf das Ja des Besitzers zum Rechtstext): Rückgaberichtlinie, AGB §7/§8, Seiten, Warenkorb, Leiste, Fusszeile, Chat, FR/EN, Generatoren.
// Regel: `vorher` muss im heutigen Text GENAU EINMAL vorkommen, sonst wird das Produkt/die Datei nicht angefasst und gemeldet (nichts wird geraten).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/** Wendet die Einträge eines Produkts auf Beschreibung und SEO an. Rein, ohne Netz.
 *  ist = {status, descriptionHtml, seo:{title,description}}; eintraege = Einträge der Datei für dieses Produkt.
 *  Rückgabe: {descriptionHtml, seoDescription, fehler[], geaendert}  (null = unverändert) */
export function planeProdukt(ist, eintraege) {
  const fehler = [];
  let html = ist.descriptionHtml ?? '';
  let seoDesc = null;
  const zaehle = (t, s) => (s ? t.split(s).length - 1 : 0);
  for (const e of eintraege) {
    if (e.art === 'produkt_seo_description') {
      if ((ist.seo?.description ?? '') === e.nachher) continue; // schon erledigt
      if ((ist.seo?.description ?? '') !== e.vorher) { fehler.push(`${e.nr} seo.description weicht vom erwarteten Stand ab`); continue; }
      seoDesc = e.nachher;
    } else if (e.art === 'produkt_beschreibung_kasten_ergaenzen') {
      if (html.includes('class="ls-pod-retoure"')) { fehler.push(`${e.nr} Kasten schon vorhanden (nicht doppelt anhängen)`); continue; }
      html = html + (html.endsWith('\n') || html === '' ? '' : '\n') + e.nachher;
    } else if (e.art === 'produkt_beschreibung_retourenkasten' || e.art === 'produkt_beschreibung_30tage_pauschal') {
      if (zaehle(html, e.nachher) === 1 && zaehle(html, e.vorher) === 0) continue; // schon erledigt
      const n = zaehle(html, e.vorher);
      if (n !== 1) { fehler.push(`${e.nr} «vorher» kommt ${n}× vor (erwartet 1×)`); continue; }
      html = html.replace(e.vorher, () => e.nachher);
    } else fehler.push(`unbekannte Art ${e.art}`);
  }
  const hatDesc = html !== (ist.descriptionHtml ?? '');
  // Die Theme-Weichen (Rückgabe-Zweig, Grössenhilfe, Brotkrumen) hängen am Marker «lspod-designer» in der Beschreibung: er darf nie verloren gehen.
  if ((ist.descriptionHtml ?? '').includes('lspod-designer') && !html.includes('lspod-designer')) fehler.push('Marker lspod-designer ginge verloren');
  return { descriptionHtml: hatDesc ? html : null, seoDescription: seoDesc, fehler, geaendert: hatDesc || seoDesc != null };
}

/** JSON-String-Inhalt (ohne Anführungszeichen) so, wie er in der Datei steht. */
export function jsonRoh(s) { return JSON.stringify(s).slice(1, -1); }

/** Ersetzt in der ROHEN Theme-Datei (kein Neuformatieren): jeder `vorher` muss roh genau einmal vorkommen. */
export function planeTheme(roh, eintraege) {
  const fehler = []; let text = roh; const erledigt = [];
  const zaehle = (t, s) => t.split(s).length - 1;
  for (const e of eintraege) {
    const v = jsonRoh(e.vorher), n = jsonRoh(e.nachher);
    if (zaehle(text, n) >= 1 && zaehle(text, v) === 0) { erledigt.push(e.nr); continue; }
    const c = zaehle(text, v);
    if (c !== 1) { fehler.push(`${e.nr} «vorher» kommt roh ${c}× vor (erwartet 1×)`); continue; }
    text = text.replace(v, () => n);
  }
  // Shopify-Vorlagen beginnen mit einem Kommentarblock /* ... */ (kein reines JSON): vor der Prüfung abziehen
  let gueltig = true; try { JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\//, '')); } catch (err) { gueltig = false; fehler.push('Ergebnis ist kein gültiges JSON: ' + err.message); }
  return { text: gueltig && !fehler.length ? text : null, fehler, erledigt, geaendert: text !== roh };
}

if (process.argv[1] && process.argv[1].endsWith('rueckgabe-0611/apply.mjs')) {
  const { shopifyGql } = await import('../../automation/lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('../../automation/lib/shopify_secret.mjs');
  const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
  const HIER = new URL('.', import.meta.url).pathname, SICH = HIER + 'sicherung/welle1.json', ROH_VOR = HIER + 'sicherung/product.json.vor';
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const warte = (ms) => new Promise((s) => setTimeout(s, ms));
  const alle = JSON.parse(readFileSync(HIER + 'daten/welle1.json', 'utf8'));
  const prodEint = alle.filter((e) => e.art !== 'theme_json'), themeEint = alle.filter((e) => e.art === 'theme_json');
  const lies = async (id) => (await q(`query($id:ID!){product(id:$id){id handle status descriptionHtml seo{title description}}}`, { id })).product;
  const schreibe = async (id, input) => (await q(`mutation($i:ProductInput!){productUpdate(input:$i){product{id} userErrors{field message}}}`, { i: { id, ...input } })).productUpdate;
  const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
  const THEME_DATEI = 'templates/product.json';
  const liesTheme = async () => {
    const n = (await q(`query($id:ID!,$f:[String!]!){theme:node(id:$id){... on OnlineStoreTheme{files(filenames:$f,first:1){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}}`, { id: th.id, f: [THEME_DATEI] })).theme.files.nodes[0];
    let c = n?.body?.content; if (c == null && n?.body?.url) c = await (await fetch(n.body.url)).text();
    return { md5: n?.checksumMd5, text: c };
  };
  const schreibeTheme = async (text) => {
    const u = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: THEME_DATEI, body: { type: 'TEXT', value: text } }] })).themeFilesUpsert;
    if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors)); process.exit(5); }
  };
  const nachProdukt = new Map(); for (const e of prodEint) { if (!nachProdukt.has(e.id)) nachProdukt.set(e.id, []); nachProdukt.get(e.id).push(e); }

  if (ZURUECK) {
    if (!existsSync(SICH)) { console.error('Keine Sicherung (' + SICH + ')'); process.exit(3); }
    const s = JSON.parse(readFileSync(SICH, 'utf8'));
    let ok = 0, fremd = 0;
    for (const p of s.produkte) {
      const jetzt = await lies(p.id);
      // Rücknahme nur, wenn das Produkt noch genau den von uns geschriebenen Stand hat
      if (jetzt.descriptionHtml !== p.nachher.descriptionHtml || (jetzt.seo?.description ?? null) !== (p.nachher.seo?.description ?? null)) { console.log('nicht zurückgesetzt (inzwischen anders verändert):', p.handle); fremd++; continue; }
      if (!LIVE) { ok++; continue; }
      const u = await schreibe(p.id, { descriptionHtml: p.vorher.descriptionHtml, seo: { title: p.vorher.seo?.title ?? null, description: p.vorher.seo?.description ?? null } });
      if (u.userErrors.length) { console.error(p.handle, JSON.stringify(u.userErrors)); process.exit(5); } ok++;
    }
    if (existsSync(ROH_VOR)) {
      const jetzt = await liesTheme(); const vor = readFileSync(ROH_VOR, 'utf8');
      const gesch = JSON.parse(readFileSync(SICH, 'utf8')).themeNachMd5;
      if (gesch && jetzt.md5 !== gesch) console.log('Theme-Datei inzwischen anders verändert: NICHT zurückgesetzt (Sicherung bleibt in', ROH_VOR + ')');
      else if (LIVE) { await schreibeTheme(vor); console.log('Theme-Datei zurückgeschrieben'); } else console.log('Trockenlauf: Theme-Datei würde zurückgeschrieben');
    }
    console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf Rücknahme', ok, 'Produkte | übersprungen', fremd); process.exit(0);
  }

  // ---- Planen (nur lesen)
  const plan = [], bereitsFertig = [], probleme = [];
  for (const [id, eint] of nachProdukt) {
    const ist = await lies(id);
    if (!ist) { probleme.push(`${id}: Produkt nicht gefunden`); continue; }
    const p = planeProdukt(ist, eint);
    if (p.fehler.length) probleme.push(`${ist.handle}: ${p.fehler.join('; ')}`);
    if (p.geaendert && !p.fehler.length) plan.push({ id, handle: ist.handle, status: ist.status, vorher: { descriptionHtml: ist.descriptionHtml, seo: ist.seo }, p });
    else if (!p.geaendert && !p.fehler.length) bereitsFertig.push(ist.handle);
  }
  const themeIst = await liesTheme();
  const themePlan = planeTheme(themeIst.text, themeEint);
  console.log(`PRODUKTE: ${nachProdukt.size} | zu ändern ${plan.length} | schon fertig ${bereitsFertig.length} | Probleme ${probleme.length}`);
  for (const x of plan) console.log('  ', x.handle.padEnd(58), x.status.padEnd(7), [x.p.seoDescription != null ? 'seo' : '', x.p.descriptionHtml != null ? 'text' : ''].filter(Boolean).join('+'));
  for (const x of probleme) console.log('  PROBLEM', x);
  console.log(`THEME ${THEME_DATEI}: ${themePlan.fehler.length ? 'PROBLEM ' + themePlan.fehler.join('; ') : themePlan.geaendert ? 'wird geändert (' + themeEint.map((e) => e.nr).join('+') + ')' : 'schon fertig (' + themePlan.erledigt.join('+') + ')'}`);
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(probleme.length || themePlan.fehler.length ? 4 : 0); }
  if (probleme.length || themePlan.fehler.length) { console.error('Probleme vorhanden: erst klären, nichts geschrieben.'); process.exit(4); }
  if (existsSync(SICH)) { console.error('sicherung/welle1.json liegt schon vor: erst ZURUECK=1 oder prüfen'); process.exit(3); }

  // ---- Schreiben (Sicherung zuerst)
  const sicher = { gesichert: 'vor Welle 1 Rückgabe-Texte, 06.11.2026', theme: th.id, themeDatei: THEME_DATEI, produkte: plan.map((x) => ({ id: x.id, handle: x.handle, vorher: x.vorher, nachher: null })) };
  if (themePlan.geaendert) writeFileSync(ROH_VOR, themeIst.text);
  writeFileSync(SICH, JSON.stringify(sicher, null, 1));
  for (const x of plan) {
    const input = {};
    if (x.p.descriptionHtml != null) input.descriptionHtml = x.p.descriptionHtml;
    // seo wird als Ganzes ersetzt: Titel immer mitschicken (null bleibt null)
    if (x.p.seoDescription != null) input.seo = { title: x.vorher.seo?.title ?? null, description: x.p.seoDescription };
    const u = await schreibe(x.id, input);
    if (u.userErrors.length) { console.error(x.handle, JSON.stringify(u.userErrors), '→ Sicherung', SICH); process.exit(5); }
  }
  if (themePlan.geaendert) await schreibeTheme(themePlan.text);
  // ---- Rücklesen (Theme erst nach ~1 Minute werten)
  await warte(4000);
  const abw = [];
  for (const x of plan) {
    const jetzt = await lies(x.id);
    if (x.p.descriptionHtml != null && jetzt.descriptionHtml !== x.p.descriptionHtml) abw.push(x.handle + ' text');
    if (x.p.seoDescription != null && (jetzt.seo?.description !== x.p.seoDescription || (jetzt.seo?.title ?? null) !== (x.vorher.seo?.title ?? null))) abw.push(x.handle + ' seo');
    x.nach = { descriptionHtml: jetzt.descriptionHtml, seo: jetzt.seo };
  }
  sicher.produkte = plan.map((x) => ({ id: x.id, handle: x.handle, vorher: x.vorher, nachher: x.nach }));
  let themeOk = true;
  if (themePlan.geaendert) {
    const t0 = Date.now();
    for (;;) { const j = await liesTheme(); if (j.text === themePlan.text) { sicher.themeNachMd5 = j.md5; break; } if (Date.now() - t0 > 150000) { themeOk = false; break; } await warte(10000); }
  }
  writeFileSync(SICH, JSON.stringify(sicher, null, 1));
  if (abw.length || !themeOk) { console.error('RÜCKLESEN WEICHT AB:', abw.join(', '), themeOk ? '' : '| Theme-Datei'); process.exit(6); }
  console.log('Rückgelesen: alle', plan.length, 'Produkte GLEICH Soll' + (themePlan.geaendert ? ', Theme-Datei GLEICH Soll' : '') + '. Sicherung:', SICH);
}
