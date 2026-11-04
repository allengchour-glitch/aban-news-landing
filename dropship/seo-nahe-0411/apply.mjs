// SEO-Titel und Meta-Beschreibungen für drei Suchbegriff-Gruppen (04.11.2026), nur diese Felder: seo.title, seo.description.
// Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/seo-nahe-0411/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/seo-nahe-0411/apply.mjs   (schreibt nur zurück, wenn der Shop noch den neuen Wert trägt)
//   Selbsttest:  node dropship/seo-nahe-0411/apply.mjs --selbsttest
// Vor dem ersten Schreiben wird der Ist-Stand aller Seiten nach sicherung/vor.json gelegt (eine vorhandene Datei bleibt).
// Jede Seite: Ist-Wert muss dem erwarteten 'alt' entsprechen (sonst übersprungen und gemeldet), danach wird frisch zurückgelesen.
// Exit: 0 ok · 3 Stand weicht ab (nichts geschrieben) · 4 Prüfung der Texte fehlgeschlagen · 5 userErrors · 6 Rücklesen weicht ab
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url)) + '/';
const MAX = { title: 60, description: 155 };
// Aussagen, die in Titel/Meta dieser Änderung nicht stehen dürfen (Besitzerregeln: keine Preise, Liefer- oder Rückgabeversprechen, kein ß, keine Gedankenstriche).
const VERBOTEN = [/ß/, /[–—]/, /\b30 Tage\b/i, /Rückgabe/i, /WELCOME/i, /\bCHF\b/, /Gratis/i, /bis Weihnachten/i, /Echtleder|Echthaar|Seide/i];

export function pruefe(aenderungen) {
  const fehler = [];
  for (const a of aenderungen) {
    const ort = `${a.handle} ${a.feld}`;
    if (!['title', 'description'].includes(a.feld)) fehler.push(`${ort}: unbekanntes Feld`);
    if (typeof a.neu !== 'string' || !a.neu.trim()) { fehler.push(`${ort}: leerer Text`); continue; }
    if (a.neu.length > MAX[a.feld]) fehler.push(`${ort}: ${a.neu.length} Zeichen (Grenze ${MAX[a.feld]})`);
    if (a.neu === a.alt) fehler.push(`${ort}: neu gleich alt`);
    if (/&amp;|&#/.test(a.neu)) fehler.push(`${ort}: HTML-Entität im Text`);
    for (const r of VERBOTEN) if (r.test(a.neu)) fehler.push(`${ort}: verbotene Aussage ${r}`);
  }
  // Doppelte neue SEO-Titel unter den Änderungen selbst vermeiden (Wortlaut-Zwillinge)
  const titel = aenderungen.filter((a) => a.feld === 'title').map((a) => a.neu.toLowerCase());
  if (new Set(titel).size !== titel.length) fehler.push('zwei neue SEO-Titel sind gleich');
  return fehler;
}

export function gruppiere(aenderungen) {
  const m = new Map();
  for (const a of aenderungen) { const k = a.art + ':' + a.handle; if (!m.has(k)) m.set(k, { art: a.art, handle: a.handle, felder: {} }); m.get(k).felder[a.feld] = a; }
  return [...m.values()];
}

// Entscheidet je Seite: 'schreiben' | 'schon-neu' | 'abweichend'. ist = {title, description}. richtung 'vor' (alt -> neu) oder 'zurueck' (neu -> alt)
export function urteil(g, ist, richtung = 'vor') {
  const von = richtung === 'vor' ? 'alt' : 'neu', nach = richtung === 'vor' ? 'neu' : 'alt';
  let alleNach = true;
  for (const [f, a] of Object.entries(g.felder)) {
    if ((ist[f] ?? '') === a[von]) { alleNach = false; continue; }
    if ((ist[f] ?? '') === a[nach]) continue;
    return { art: 'abweichend', feld: f, ist: ist[f] ?? null };
  }
  return { art: alleNach ? 'schon-neu' : 'schreiben' };
}

export function wunschwerte(g, ist, richtung = 'vor') {
  const nach = richtung === 'vor' ? 'neu' : 'alt';
  return { title: g.felder.title ? g.felder.title[nach] : (ist.title ?? ''), description: g.felder.description ? g.felder.description[nach] : (ist.description ?? '') };
}

function selbsttest() {
  let n = 0; const ok = (b, t) => { n++; if (!b) { console.error('FEHLER:', t); process.exitCode = 1; } };
  const gut = [{ handle: 'a', art: 'product', feld: 'title', alt: 'Alt A', neu: 'Neuer Titel A | LuxeStyle' }, { handle: 'a', art: 'product', feld: 'description', alt: 'Alt D', neu: 'Neue Beschreibung ohne Preis.' }];
  ok(pruefe(gut).length === 0, 'gültige Änderung');
  ok(pruefe([{ ...gut[0], neu: 'x'.repeat(61) }]).length === 1, 'Titel zu lang');
  ok(pruefe([{ ...gut[1], neu: 'x'.repeat(156) }]).length === 1, 'Meta zu lang');
  ok(pruefe([{ ...gut[0], neu: 'Straße' }]).length === 1, 'ß');
  ok(pruefe([{ ...gut[1], neu: 'Mit 30 Tage Rückgabe' }]).length >= 1, '30 Tage Rückgabe');
  ok(pruefe([{ ...gut[1], neu: 'Nur CHF 5' }]).length === 1, 'Preis');
  ok(pruefe([{ ...gut[1], neu: 'Text – mit Gedankenstrich' }]).length === 1, 'Gedankenstrich');
  ok(pruefe([{ ...gut[1], neu: 'Tom &amp; Jerry' }]).length === 1, 'Entität');
  ok(pruefe([{ ...gut[0], neu: gut[0].alt }]).length === 1, 'neu gleich alt');
  ok(pruefe([gut[0], { ...gut[0], handle: 'b' }]).length === 1, 'doppelter Titel');
  ok(pruefe([{ ...gut[0], feld: 'bild' }]).length >= 1, 'unbekanntes Feld');
  const g = gruppiere(gut)[0];
  ok(Object.keys(g.felder).length === 2, 'gruppiert');
  ok(urteil(g, { title: 'Alt A', description: 'Alt D' }).art === 'schreiben', 'schreiben');
  ok(urteil(g, { title: gut[0].neu, description: gut[1].neu }).art === 'schon-neu', 'schon neu');
  ok(urteil(g, { title: gut[0].neu, description: 'Alt D' }).art === 'schreiben', 'halb neu: schreiben');
  ok(urteil(g, { title: 'Fremd', description: 'Alt D' }).art === 'abweichend', 'abweichend');
  ok(urteil(g, { title: gut[0].neu, description: gut[1].neu }, 'zurueck').art === 'schreiben', 'Rücknahme schreibt');
  ok(urteil(g, { title: 'Alt A', description: 'Alt D' }, 'zurueck').art === 'schon-neu', 'Rücknahme: schon alt');
  ok(urteil(g, { title: 'Fremd', description: gut[1].neu }, 'zurueck').art === 'abweichend', 'Rücknahme abweichend');
  const w = wunschwerte({ felder: { title: gut[0] } }, { title: 'x', description: 'Bleibt' });
  ok(w.title === gut[0].neu && w.description === 'Bleibt', 'unveränderte Felder bleiben');
  console.log(n + ' Prüfungen' + (process.exitCode ? ' MIT FEHLERN' : ' ok'));
}

if (process.argv.includes('--selbsttest')) { selbsttest(); }
else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { shopifyGql } = await import('../../automation/lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('../../automation/lib/shopify_secret.mjs');
  const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
  const richtung = ZURUECK ? 'zurueck' : 'vor';
  const aenderungen = JSON.parse(readFileSync(HIER + 'aenderungen.json', 'utf8'));
  const fehler = pruefe(aenderungen);
  if (fehler.length && !ZURUECK) { console.error('Prüfung der Texte fehlgeschlagen:\n- ' + fehler.join('\n- ')); process.exit(4); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const lesen = async (g) => {
    const feld = g.art === 'collection' ? 'collectionByHandle' : 'productByHandle';
    const status = g.art === 'collection' ? '' : 'status';
    const x = (await q(`query($h:String!){ n: ${feld}(handle:$h){ id title ${status} seo{title description} } }`, { h: g.handle })).n;
    return x ? { id: x.id, status: x.status ?? 'ACTIVE', seite: x.title, title: x.seo?.title ?? null, description: x.seo?.description ?? null } : null;
  };
  const gruppen = gruppiere(aenderungen);
  const jetzt = [];
  for (const g of gruppen) { const ist = await lesen(g); if (!ist) { console.error('Nicht gefunden:', g.handle); process.exit(3); } jetzt.push({ g, ist }); }
  const sichern = HIER + 'sicherung/vor.json';
  if (LIVE && !ZURUECK && !existsSync(sichern)) { mkdirSync(HIER + 'sicherung', { recursive: true }); writeFileSync(sichern, JSON.stringify(jetzt.map(({ g, ist }) => ({ art: g.art, handle: g.handle, id: ist.id, status: ist.status, title: ist.title, description: ist.description })), null, 1) + '\n'); console.log('Sicherung geschrieben:', sichern); }
  let abweichend = 0, zuSchreiben = [];
  for (const { g, ist } of jetzt) {
    const u = urteil(g, ist, richtung);
    console.log(`${u.art.padEnd(10)} ${g.art.padEnd(10)} ${g.handle} (${ist.status})${u.feld ? ' Feld ' + u.feld + ' ist: ' + JSON.stringify(u.ist) : ''}`);
    if (u.art === 'abweichend') abweichend++;
    if (u.art === 'schreiben') zuSchreiben.push({ g, ist });
    if (!ZURUECK && g.art === 'product' && ist.status !== 'ACTIVE') { console.error('  Produkt nicht ACTIVE, übersprungen'); zuSchreiben = zuSchreiben.filter((z) => z.g !== g); }
  }
  if (abweichend) { console.error(`${abweichend} Seite(n) weichen vom erwarteten Stand ab: nichts geschrieben`); process.exit(3); }
  if (!LIVE) { console.log(`Trockenlauf: ${zuSchreiben.length} Seite(n) würden geschrieben`); process.exit(0); }
  const mut = (art) => art === 'collection'
    ? 'mutation($id:ID!,$t:String,$d:String){ r: collectionUpdate(input:{id:$id, seo:{title:$t, description:$d}}){ userErrors{field message} } }'
    : 'mutation($id:ID!,$t:String,$d:String){ r: productUpdate(input:{id:$id, seo:{title:$t, description:$d}}){ userErrors{field message} } }';
  for (const { g, ist } of zuSchreiben) {
    const w = wunschwerte(g, ist, richtung);
    const res = (await q(mut(g.art), { id: ist.id, t: w.title, d: w.description })).r;
    if (res.userErrors?.length) { console.error('userErrors', g.handle, JSON.stringify(res.userErrors)); process.exit(5); }
    console.log('geschrieben', g.handle);
  }
  await new Promise((s) => setTimeout(s, 8000));
  let abw = 0;
  for (const { g, ist: vorher } of zuSchreiben) {
    const nach = await lesen(g); const w = wunschwerte(g, vorher, richtung);
    const gleich = nach && nach.title === w.title && nach.description === w.description;
    console.log('Rücklesen', gleich ? 'GLEICH' : 'ABWEICHUNG', g.handle); if (!gleich) abw++;
  }
  process.exit(abw ? 6 : 0);
}
