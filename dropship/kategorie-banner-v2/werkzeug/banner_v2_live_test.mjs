// LIVE-, Rücknahme- und Prüfpfad von kategorie_banner_v2.mjs gegen die Attrappe (banner_v2_attrappe.mjs). Kein Netz, kein Shop.
// Aufruf: node banner_v2_live_test.mjs   (RUNNER=<pfad> testet eine andere Fassung des Skripts, für die Mutationsprobe)
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const HIER = dirname(fileURLToPath(import.meta.url));
const RUNNER = resolve(process.env.RUNNER || join(HIER, 'kategorie_banner_v2.mjs'));
const L = await import(pathToFileURL(join(dirname(RUNNER), 'banner_v2_lib.mjs')).href);

let n = 0, f = 0;
const ok = (name, bed, info = '') => { n++; if (!bed) { f++; console.log(`✗ ${name}${info ? '  — ' + info : ''}`); } };
const T = mkdtempSync(join(tmpdir(), 'bv2live-'));
const STAND = join(T, 'stand.json'), DATEN = join(T, 'daten');
const jpg = (datei, w, h, farbe) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${farbe}:s=${w}x${h}`, '-frames:v', '1', '-q:v', '4', datei]);
const sha = d => createHash('sha256').update(readFileSync(d)).digest('hex');
jpg(join(T, 'alt.jpg'), 800, 800, 'red'); jpg(join(T, 'neu.jpg'), 1320, 1320, 'white'); jpg(join(T, 'neu-b.jpg'), 1320, 1320, 'beige');

const CDN = 'https://cdn.shopify.com/s/files/fake';
const C = i => `gid://shopify/Collection/${i}`, P = i => `gid://shopify/Product/${i}`;
const produkt = (i, o = {}) => ({ id: P(i), handle: `p${i}`, status: 'ACTIVE', onlineStoreUrl: `https://x/p${i}`, tracksInventory: false, totalInventory: 0, tags: [],
  featuredImage: { url: `${CDN}/products/p${i}.jpg?v=1` }, media: { nodes: [{ image: { url: `${CDN}/products/p${i}.jpg?v=1` } }, { image: { url: `${CDN}/products/p${i}-b.jpg?v=1` } }] },
  variants: { nodes: [{ availableForSale: true }] }, ...o });
function grundstand() {
  const s = { zaehler: 10, log: [], uploads: {}, cdn: { [`${CDN}/collections/alt-a.jpg`]: { datei: join(T, 'alt.jpg'), w: 800, h: 800 }, [`${CDN}/collections/alt-b.jpg`]: { datei: join(T, 'alt.jpg'), w: 800, h: 800 } },
    collections: {}, produkte: {}, mitglieder: {} };
  const kat = (i, handle, bild) => { s.collections[C(i)] = { id: C(i), handle, title: `Kat ${handle}`, image: bild ? { url: `${CDN}/collections/${bild}.jpg?v=1`, altText: 'Christmas 2026', width: 800, height: 800 } : null, kopf: null }; };
  kat(1, 'kat-a', 'alt-a'); kat(2, 'kat-b', 'alt-b'); kat(3, 'kat-c', 'alt-a'); kat(4, 'kat-d', null);
  for (const i of [11, 12, 13, 14, 15, 21, 22]) s.produkte[P(i)] = produkt(i);
  s.produkte[P(15)].status = 'DRAFT';
  s.mitglieder[C(1)] = [P(11), P(12), P(13), P(14)]; s.mitglieder[C(2)] = [P(11), P(12)]; s.mitglieder[C(3)] = [P(12), P(13), P(14), P(15)]; s.mitglieder[C(4)] = [P(21), P(22)];
  return s;
}
const lesen = () => JSON.parse(readFileSync(STAND, 'utf8'));
const schreiben = s => writeFileSync(STAND, JSON.stringify(s, null, 1));
const basisVon = (s, i) => { const c = s.collections[C(i)]; return L.sicherungsEintrag({ handle: c.handle, id: c.id, image: c.image, kopf: c.kopf }, 'z'); };
function eintrag(s, i, { kopf = [11, 12, 13, 14], quelle = 11, datei = 'neu.jpg', pruefung = 'gemini-ok', teile = ['bild', 'kopf'] } = {}) {
  const c = s.collections[C(i)];
  return { handle: c.handle, id: c.id, titel: c.title, basis: basisVon(s, i), entscheid: { ersetzen: true, gruende: ['test'] }, teile,
    neu: teile.includes('bild') ? { art: 'komponiert', quelleProdukt: { id: P(quelle), handle: `p${quelle}`, titel: `Produkt ${quelle}` }, quelleBild: { url: `${CDN}/products/p${quelle}.jpg?v=1`, nr: 0 },
      datei: join(T, datei), sha256: sha(join(T, datei)), S: 1320, alt: `Kat ${c.handle} – Produkt ${quelle}`, pruefung } : null,
    kopf: teile.includes('kopf') ? { ids: kopf.map(P), produkte: kopf.map(k => ({ id: P(k), handle: `p${k}`, bild: `${CDN}/products/p${k}.jpg?v=1`, pruefung })) } : null, hinweise: [] };
}
function planSchreiben(eintraege, o = {}) {
  const plan = { werkzeug: 'kategorie_banner_v2', lauf: 'TEST', zeit: o.zeit || new Date().toISOString(), eintraege, planHash: L.planHash(eintraege) };
  const d = join(T, `plan-${Math.random().toString(36).slice(2)}.json`); writeFileSync(d, JSON.stringify(plan)); return { datei: d, hash: plan.planHash };
}
function lauf(env) {
  const r = spawnSync(process.execPath, ['--import', pathToFileURL(join(HIER, 'banner_v2_attrappe.mjs')).href, RUNNER], { encoding: 'utf8', timeout: 120000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, SHOPIFY_SHOP: 'attrappe-test.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', FAKE_STAND: STAND, DATEN, PAUSE_MS: '0', FRISCH_MS: '0', LUXE_REPO: process.env.LUXE_REPO || '/home/user/aban-news-landing', ...env } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const ledger = () => existsSync(join(DATEN, 'ledger.jsonl')) ? readFileSync(join(DATEN, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)) : [];
const ops = () => lesen().log.map(x => x.op);

// ---------------------------------------------------------------- 1) Freigabe: falscher Hash, alter Plan, fehlender Plan
schreiben(grundstand());
{
  const s = lesen(); const p = planSchreiben([eintrag(s, 1)]);
  let r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: '0000000000000000' });
  ok('falscher PLAN_HASH: Exit 1', r.code === 1, r.out); ok('falscher PLAN_HASH: nichts geschrieben', lesen().log.length === 0);
  r = lauf({ LIVE: '1', PLAN: p.datei }); ok('ohne PLAN_HASH: Exit 1, nichts geschrieben', r.code === 1 && lesen().log.length === 0, r.out);
  const alt = planSchreiben([eintrag(s, 1)], { zeit: new Date(Date.now() - 30 * 3600e3).toISOString() });
  r = lauf({ LIVE: '1', PLAN: alt.datei, PLAN_HASH: alt.hash }); ok('Plan 30 h alt: Exit 1, nichts geschrieben', r.code === 1 && lesen().log.length === 0, r.out);
  const plan = JSON.parse(readFileSync(p.datei, 'utf8')); plan.eintraege[0].neu.alt = 'verändert'; writeFileSync(p.datei, JSON.stringify(plan));
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash }); ok('Plan nachträglich verändert: Exit 1', r.code === 1 && /Plan verändert/.test(r.out) && lesen().log.length === 0, r.out);
  r = lauf({}); ok('Trockenlauf ohne HANDLES: Exit 1, nichts geschrieben', r.code === 1 && lesen().log.length === 0, r.out);
}

// ---------------------------------------------------------------- 2) LIVE: A schreiben, B (Stand geändert) und C (Entwurf im Kopf) überspringen
schreiben(grundstand());
let planA;
{
  const s = lesen();
  const eB = eintrag(s, 2, { kopf: [11, 12, 13, 14] }); eB.basis.bild.altText = 'anderer Stand';      // seit dem Trockenlauf «verändert»
  const eC = eintrag(s, 3, { kopf: [12, 13, 14, 15], quelle: 12 });                                    // 15 ist DRAFT
  planA = planSchreiben([eintrag(s, 1), eB, eC]);
  const r = lauf({ LIVE: '1', PLAN: planA.datei, PLAN_HASH: planA.hash });
  const st = lesen(), a = st.collections[C(1)];
  ok('LIVE: Exit 2 (geschrieben + übersprungen)', r.code === 2, r.out);
  ok('LIVE A: neues Bild 1320², Alt-Text gesetzt', a.image.width === 1320 && a.image.height === 1320 && a.image.altText === 'Kat kat-a – Produkt 11' && !/alt-a/.test(a.image.url), JSON.stringify(a.image));
  ok('LIVE A: Kopf als JSON-Liste der IDs', a.kopf === JSON.stringify([11, 12, 13, 14].map(P)), a.kopf);
  ok('LIVE A: Metafeld-Typ list.product_reference', st.log.some(x => x.op === 'metafieldsSet' && x.type === 'list.product_reference'));
  ok('LIVE B: übersprungen (Stand geändert), nichts geschrieben', /kat-b: übersprungen — seit dem Trockenlauf verändert/.test(r.out) && st.collections[C(2)].image.url.includes('alt-b') && st.collections[C(2)].kopf === null, r.out);
  ok('LIVE C: übersprungen (Kopf-Produkt Entwurf)', /kat-c: übersprungen — Quelle hat sich geändert \(p15:status-draft/.test(r.out) && st.collections[C(3)].kopf === null, r.out);
  const lg = ledger();
  ok('Ledger: genau eine Änderung, ohne Befund, mit Quelle und Kopf-Produkten', lg.length === 1 && lg[0].handle === 'kat-a' && lg[0].befund.length === 0 && lg[0].quelle?.produkt?.id === P(11) && lg[0].kopfProdukte?.length === 4, JSON.stringify(lg));
  const sich = readdirSync(join(DATEN, 'sicherung'));
  ok('Sicherung: JSON und alte Bilddatei (bytegleich)', sich.some(x => x.endsWith('.json')) && sich.some(x => x.endsWith('.jpg') && sha(join(DATEN, 'sicherung', x)) === sha(join(T, 'alt.jpg'))), sich.join(','));
  const sj = JSON.parse(readFileSync(join(DATEN, 'sicherung', sich.find(x => x.endsWith('.json'))), 'utf8'));
  ok('Sicherung: alter Stand (URL, Alt, Masse, Kopf)', sj.bild.url.includes('alt-a') && sj.bild.altText === 'Christmas 2026' && sj.bild.width === 800 && sj.kopf === null);
  const r2 = lauf({ LIVE: '1', PLAN: planA.datei, PLAN_HASH: planA.hash });
  ok('derselbe Plan noch einmal: A übersprungen (Stand geändert), nichts Neues', r2.code === 2 && ledger().length === 1 && /kat-a: übersprungen — seit dem Trockenlauf verändert \(bild, alt, kopf\)/.test(r2.out), r2.out);
}

// ---------------------------------------------------------------- 3) Wöchentliche Prüfung
{
  let r = lauf({ PHASE: 'pruefen' }); ok('Prüfung: alles aktuell → Exit 0', r.code === 0 && /kat-a: ok/.test(r.out), r.out);
  const s = lesen(); s.produkte[P(13)].tracksInventory = true; s.produkte[P(13)].totalInventory = 0; schreiben(s);
  r = lauf({ PHASE: 'pruefen' }); ok('Prüfung: Kopf-Produkt ausverkauft → Exit 3', r.code === 3 && /VERALTET p13:ausverkauft/.test(r.out), r.out);
  const s2 = lesen(); s2.mitglieder[C(1)] = s2.mitglieder[C(1)].filter(x => x !== P(11)); schreiben(s2);
  r = lauf({ PHASE: 'pruefen' }); ok('Prüfung: Quellprodukt kein Mitglied mehr → gemeldet', r.code === 3 && /p11:kein-mitglied/.test(r.out), r.out);
  const s3 = lesen(); s3.produkte[P(13)].tracksInventory = false; s3.mitglieder[C(1)].push(P(11)); schreiben(s3);
}

// ---------------------------------------------------------------- 4) Rücknahme: Trockenlauf, dann LIVE
{
  const vorher = lesen().log.length;
  let r = lauf({ ZURUECK: '1' });
  ok('Rücknahme-Trockenlauf: nichts geschrieben', r.code === 0 && lesen().log.length === vorher && /kat-a: würde zurücknehmen/.test(r.out), r.out);
  r = lauf({ ZURUECK: '1', LIVE: '1' });
  const a = lesen().collections[C(1)];
  ok('Rücknahme LIVE: altes Bild (800², Alt) und Kopf leer', r.code === 0 && a.image.width === 800 && a.image.altText === 'Christmas 2026' && a.kopf === null, r.out + JSON.stringify(a));
  ok('Rücknahme LIVE: altes Bild über die gesicherte CDN-URL', lesen().log.filter(x => x.op === 'collectionUpdate').pop().src.includes('alt-a'));
  ok('Ledger: Rücknahme ohne Befund vermerkt', ledger().some(z => z.art === 'zurueck' && z.handle === 'kat-a' && z.befund.length === 0));
  const n0 = lesen().log.length;
  r = lauf({ ZURUECK: '1', LIVE: '1' }); ok('zweite Rücknahme: nichts mehr offen, nichts geschrieben', r.code === 0 && lesen().log.length === n0 && /0 offene Änderungen/.test(r.out), r.out);
}

// ---------------------------------------------------------------- 5) Rücknahme bei fremder Änderung; Rücknahme aus der Bilddatei, wenn die CDN-URL weg ist
{
  const s = lesen(); const p = planSchreiben([eintrag(s, 1)]);
  let r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash }); ok('neuer Plan für A geschrieben', r.code === 0, r.out);
  const s2 = lesen(); s2.collections[C(1)].image = { url: `${CDN}/collections/fremd.jpg?v=1`, altText: 'Fremd', width: 900, height: 900 }; s2.cdn[`${CDN}/collections/fremd.jpg`] = { datei: join(T, 'alt.jpg'), w: 900, h: 900 }; schreiben(s2);
  const n0 = lesen().log.length;
  r = lauf({ ZURUECK: '1', LIVE: '1' });
  ok('Rücknahme: fremd geändert → nichts angefasst', r.code === 0 && /kat-a: fremd/.test(r.out) && lesen().log.length === n0 && lesen().collections[C(1)].image.altText === 'Fremd', r.out);
  const s3 = lesen(); s3.collections[C(1)].image = { url: ledger().filter(z => z.art === 'aenderung').pop().nachher.bild.url, altText: 'Kat kat-a – Produkt 11', width: 1320, height: 1320 };
  const altUrl = ledger().filter(z => z.art === 'aenderung').pop().vorher.bild.url.split('?')[0];
  const altEintrag = s3.cdn[altUrl]; delete s3.cdn[altUrl]; schreiben(s3);         // alte CDN-URL weg → Rücknahme lädt die gesicherte Datei hoch
  ok('Test-Vorbedingung: die gesicherte CDN-URL war bekannt', !!altEintrag, altUrl);
  r = lauf({ ZURUECK: '1', LIVE: '1' });
  const a = lesen().collections[C(1)], letztes = lesen().log.filter(x => x.op === 'collectionUpdate').pop();
  ok('Rücknahme ohne alte CDN-URL: aus der gesicherten Datei', r.code === 0 && a.image.width === 800 && a.image.altText === 'Christmas 2026' && /^https:\/\/upload\.fake\/res\//.test(letztes.src), r.out + JSON.stringify(a) + JSON.stringify(letztes));
}

// ---------------------------------------------------------------- 6) Abbrüche: Bilddatei verändert, Rücklesen weicht ab, Upload-Fehler; Deckel; ungeprüft
{
  schreiben(grundstand());
  let s = lesen(); let p = planSchreiben([eintrag(s, 1, { datei: 'neu-b.jpg' }), eintrag(s, 4, { kopf: [21, 22, 21, 22], quelle: 21, teile: ['bild'] })]);
  jpg(join(T, 'neu-b.jpg'), 1320, 1320, 'gray');                                        // Datei nach dem Plan verändert
  let r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash });
  ok('Bilddatei ≠ Plan: Exit 1, STOPP vor dem Schreiben, auch nichts bei der nächsten Sammlung', r.code === 1 && /sha256/.test(r.out) && lesen().log.length === 0, r.out);

  schreiben(grundstand()); s = lesen(); p = planSchreiben([eintrag(s, 1), eintrag(s, 4, { quelle: 21, teile: ['bild'] })]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, FAKE_FEHLER: 'alt-falsch' });
  ok('Rücklesen weicht ab: Exit 1, STOPP nach der ersten Sammlung', r.code === 1 && /Rücklesen weicht ab: alt/.test(r.out) && lesen().collections[C(4)].image === null, r.out);
  ok('Rücklesen weicht ab: Ledger-Zeile mit Befund (für die Rücknahme)', ledger().pop()?.befund?.includes('alt'));

  rmSync(DATEN, { recursive: true, force: true }); schreiben(grundstand()); s = lesen(); p = planSchreiben([eintrag(s, 1)]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, FAKE_FEHLER: 'cdn-404' });
  ok('neues Bild im CDN nicht abrufbar: Befund cdn-404, STOPP', r.code === 1 && /cdn-404/.test(r.out), r.out);

  rmSync(DATEN, { recursive: true, force: true }); schreiben(grundstand()); s = lesen(); p = planSchreiben([eintrag(s, 1)]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, FAKE_FEHLER: 'update-fehler' });
  ok('collectionUpdate mit userErrors: Exit 1, kein Kopf geschrieben', r.code === 1 && !lesen().log.some(x => x.op === 'metafieldsSet'), r.out);

  rmSync(DATEN, { recursive: true, force: true }); schreiben(grundstand()); s = lesen(); p = planSchreiben([eintrag(s, 1)]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, FAKE_FEHLER: 'kopf-fehler' });
  ok('Bild geschrieben, Kopf scheitert: Exit 1, Ledger-Zeile mit Teil «bild» und Abbruch', r.code === 1 && ledger().length === 1 && ledger()[0].teile.join() === 'bild' && /abbruch:/.test(ledger()[0].befund.join()), r.out + JSON.stringify(ledger()));
  r = lauf({ ZURUECK: '1', LIVE: '1' });
  ok('… und die Rücknahme stellt das Bild wieder her', r.code === 0 && lesen().collections[C(1)].image.altText === 'Christmas 2026' && lesen().collections[C(1)].image.width === 800, r.out);

  rmSync(DATEN, { recursive: true, force: true }); schreiben(grundstand()); s = lesen();
  p = planSchreiben([eintrag(s, 1), eintrag(s, 4, { quelle: 21, teile: ['bild'] })]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, MAX: '1' });
  ok('Deckel MAX=1: nur die erste Sammlung', r.code === 0 && ledger().length === 1 && lesen().collections[C(4)].image === null, r.out);

  rmSync(DATEN, { recursive: true, force: true }); schreiben(grundstand()); s = lesen();
  p = planSchreiben([eintrag(s, 1), eintrag(s, 4, { quelle: 21, teile: ['bild'] })]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, OHNE: 'kat-a' });
  ok('OHNE=kat-a: nur kat-d, Sammlung ohne Bild bekommt eins', r.code === 0 && lesen().collections[C(1)].image.url.includes('alt-a') && lesen().collections[C(4)].image?.width === 1320, r.out);
  ok('Sammlung ohne altes Bild: Sicherung ohne Bilddatei, Rücknahme verweigert (von Hand)', (() => { const x = lauf({ ZURUECK: '1', LIVE: '1', HANDLES: 'kat-d' }); return x.code === 1 && /von Hand/.test(x.out); })());

  rmSync(DATEN, { recursive: true, force: true }); schreiben(grundstand()); s = lesen();
  p = planSchreiben([eintrag(s, 1, { pruefung: 'ungeprueft' })]);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash });
  ok('ungeprüfte Bilder: übersprungen ohne UNGEPRUEFT_OK', r.code === 2 && lesen().log.length === 0, r.out);
  r = lauf({ LIVE: '1', PLAN: p.datei, PLAN_HASH: p.hash, UNGEPRUEFT_OK: '1' });
  ok('ungeprüfte Bilder: mit UNGEPRUEFT_OK=1 geschrieben', r.code === 0 && ledger().length === 1, r.out);
}

rmSync(T, { recursive: true, force: true });
console.log(`${n - f} von ${n} Prüfungen bestanden${f ? `, ${f} FEHLGESCHLAGEN` : ''}`);
process.exit(f ? 1 : 0);
