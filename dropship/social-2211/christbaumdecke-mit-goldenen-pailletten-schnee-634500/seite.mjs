// Christbaumdecke mit goldenen Pailletten-Schneeflocken (christbaumdecke-mit-goldenen-pailletten-schnee-634500):
// Produktseite nachbessern (11.11.2026, Paket sw2211, Beitrag So 22.11.2026). Fassung 2 (Nachbesserung 11.11.2026).
//
// Was geändert wird (nur die Galerie, in einem Lauf):
//  1) Galeriebild 4 vom Produkt lösen: gid://shopify/MediaImage/77438116069767 (files/c209bfc7-e4b2-4180-8f1b-b7a9cc26a4b8_trans.jpg,
//     1000x1000). Gesichtet 11.11.2026: Grössentabelle «78cm 90cm 122cm 152cm», zwei Ausführungen «Golden Snowflake» und
//     «Silver snowflake» (englisch) und französischer Werbetext auf einer Tüte. Der Shop führt genau eine Ausführung (90 cm, gold).
//     Weg: fileUpdate referencesToRemove (wie im Vorbild weihnachts-pluschfiguren-5er-set-617400/seite.mjs). Die Datei bleibt unter
//     Inhalt > Dateien (gleiche ID, gleiche CDN-Adresse; GEMESSEN am Vorbild 11.11.2026 15:42 UTC: beide gelösten Dateien READY,
//     CDN HTTP 200). productDeleteMedia ist in 2026-01 abgekündigt und löscht die Datei ganz.
//  2) Galerie ordnen: das Beitragsfoto 5916a885 (MediaImage 77438115447175) an Stelle 1, Bild 0c0fd880 (MediaImage 77438116004231,
//     die Silberkugel spiegelt den Fotografen) ans Ende, sonst Reihenfolge unverändert.
//     Vorher:  2ad9044b | 5916a885 | 0c0fd880 | c209bfc7 | 9f8e2c61
//     Nachher: 5916a885 | 2ad9044b | 9f8e2c61 | 0c0fd880
//     productReorderMedia läuft als Hintergrundauftrag: danach bis zu 60 s frisch lesen, bis die Reihenfolge stimmt.
//
//  Nicht angefasst: Titel, Handle, SEO, Beschreibung, Produkttyp, Optionen, Varianten, Preise, Status, Kanäle, Sammlungen, Tags,
//  Lager, Alt-Texte, die Datei selbst. Die einzige Variante hat kein eigenes Bild (variant.image null, variant.media leer).
//
// Aufruf: node seite.mjs                  Trockenlauf (Vorgabe): liest nur (Admin-API und eine CDN-Abfrage des Zielbildes)
//         LIVE=1 node seite.mjs           schreibt: Prüfsumme des Zielbildes muss stimmen, dann Bildkopie seite_sicherung_bild.jpg und
//                                         Sicherung seite_sicherung.json (flag 'wx', nie überschrieben), dann fileUpdate
//                                         referencesToRemove, frisch lesen, productReorderMedia, frisch lesen
//         ZURUECK=1 node seite.mjs        zeigt die Rücknahme
//         ZURUECK=1 LIVE=1 node seite.mjs nimmt zurück: fileUpdate referencesToAdd (dieselbe Datei), dann productReorderMedia auf die
//                                         gesicherte Reihenfolge, frisch lesen
// Zweiter Lauf: fehlt das Ziel und liegt eine Sicherung, vergleicht der Lauf Kern, Variantenbilder und Alt-Texte mit der Sicherung und
//  die Galerie mit dem Soll. Nur wenn alles stimmt: OK und Exit 0. Ist das Bild gelöst, aber noch nicht geordnet, und der Rest stimmt,
//  ordnet LIVE nach. Fehlt das Ziel ohne Sicherung, hat es nicht dieses Skript gelöst: Abbruch.
// Rücknahme-Grenze: kommt die Datei nicht mehr unter Inhalt > Dateien vor, geht die Rücknahme nur von Hand (lokale Kopie
//  seite_sicherung_bild.jpg, das ist die vom CDN umkodierte Fassung mit 239 287 Byte, oder das CJ-Original
//  https://oss-cf.cjdropshipping.com/product/2025/11/23/04/c209bfc7-e4b2-4180-8f1b-b7a9cc26a4b8_trans.jpeg). Die lokale Kopie liegt
//  nur im Scratch dieser Sitzung.
// Exit 0 nur, wenn alle Prüfungen stimmen (Trockenlauf) bzw. frisch nachgelesen Soll = Ist (LIVE). 1 = Abweichung (auch: teilweise
// geschrieben), 2 = Abbruch vor dem Schreiben.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICHERUNG = join(HIER, 'seite_sicherung.json');
const BILDKOPIE = join(HIER, 'seite_sicherung_bild.jpg');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const WARTE_MS = Number(process.env.WARTE_MS || 4000);
const LOESEN_VERSUCHE = 6;   // 6 x 4 s
const ORDNEN_VERSUCHE = 15;  // 15 x 4 s = 60 s
const HANDLE = 'christbaumdecke-mit-goldenen-pailletten-schnee-634500', PRODUKT_ID = 'gid://shopify/Product/16603943436679';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com', API = '2026-01';
const MI = (n) => `gid://shopify/MediaImage/${n}`;

// Galerie (Admin-API 11.11.2026 15:42 UTC), Dateiname je Medium
const DATEI = {
  [MI('77438116036999')]: '2ad9044b-c8cc-4b02-8142-046785fa9c76.png',
  [MI('77438115447175')]: '5916a885-dcdc-43f6-80ab-727dcb7ffa53.png',
  [MI('77438116004231')]: '0c0fd880-2704-4417-aafb-37fea8ddb0d3.png',
  [MI('77438116069767')]: 'c209bfc7-e4b2-4180-8f1b-b7a9cc26a4b8_trans.jpg',
  [MI('77438116102535')]: '9f8e2c61-98e2-4e10-9ad1-d6b5eed9b18f.png',
};
const ZIEL_ID = MI('77438116069767');
// sha256 der Datei, die am 11.11.2026 gesichtet wurde (roh/m3.jpg = CDN 14:2x UTC, 239 287 Byte, Node-fetch ohne Accept)
const ZIEL_SHA = 'a20ca43dea2459844121a4f553d94ae0bfa4ce1ac4a216da412e40ab79b71347';
const VOR = [MI('77438116036999'), MI('77438115447175'), MI('77438116004231'), ZIEL_ID, MI('77438116102535')];
const OHNE = VOR.filter((x) => x !== ZIEL_ID);
const SOLL = [MI('77438115447175'), MI('77438116036999'), MI('77438116102535'), MI('77438116004231')];
const GRUND = 'Grössentabelle 78/90/122/152 cm, «Golden Snowflake»/«Silver snowflake», französischer Werbetext; der Shop führt nur eine Ausführung';
const BEITRAG = { preis: '23.90', sku: 'CJ-2511230402481634500' };

let geschrieben = false;
const ende = (code) => process.exit(code);
const abbruch = (m) => { console.log((geschrieben ? 'ABWEICHUNG (teilweise geschrieben): ' : 'ABBRUCH: ') + m); ende(geschrieben ? 1 : 2); };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const dateiName = (m) => (m?.image?.url || '').split('?')[0].split('/').pop();
const kurz = (id) => (DATEI[id] || id.split('/').pop()).slice(0, 8);
const liste = (l) => l.map((id, i) => `${i + 1}. ${kurz(id)}`).join(' | ');

let token = null;
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    token = (await r.json()).access_token;
    if (!token) abbruch('kein Admin-Token');
  }
  for (let versuch = 1; ; versuch++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    const j = await r.json();
    const gedrosselt = r.status === 429 || (j.errors || []).some((e) => e?.extensions?.code === 'THROTTLED');
    if (gedrosselt && versuch < 4) { await warte(2000 * versuch); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  }
}

const lesen = async () => (await gql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status productType descriptionHtml tags tracksInventory seo{title description}
  options{id name optionValues{id name}}
  variants(first:50){nodes{id sku price compareAtPrice inventoryPolicy availableForSale selectedOptions{name value} image{url} media(first:10){nodes{id}}}}
  media(first:50){nodes{id alt mediaContentType status ... on MediaImage{fileStatus image{url width height}}}}
  collections(first:50){nodes{id}}
  resourcePublicationsV2(first:30){nodes{isPublished publication{id}}} } }`, { h: HANDLE })).productByIdentifier;
const datei = async (id) => (await gql(`query($i:[ID!]!){ nodes(ids:$i){ ... on MediaImage{ id fileStatus alt image{url} } } }`, { i: [id] })).nodes[0];

// Alles, was sich durch diesen Lauf NICHT ändern darf (die Galerie wird getrennt geprüft).
const kern = (p) => JSON.stringify({
  title: p.title, handle: p.handle, status: p.status, productType: p.productType, descriptionHtml: p.descriptionHtml,
  tags: p.tags, tracksInventory: p.tracksInventory, seo: p.seo,
  optionen: p.options.map((o) => [o.id, o.name, o.optionValues.map((v) => [v.id, v.name])]),
  varianten: p.variants.nodes.map((v) => [v.id, v.sku, v.price, v.compareAtPrice, v.inventoryPolicy, v.availableForSale, v.selectedOptions.map((s) => s.value), v.image?.url ?? null, v.media.nodes.map((m) => m.id)]),
  sammlungen: p.collections.nodes.map((c) => c.id).sort(),
  kanaele: p.resourcePublicationsV2.nodes.map((n) => [n.publication.id, n.isPublished]).sort(),
});
const ids = (p) => p.media.nodes.map((m) => m.id);
const alts = (p) => Object.fromEntries(p.media.nodes.map((m) => [m.id, m.alt]));
const varMedien = (p) => Object.fromEntries(p.variants.nodes.map((v) => [v.id, [v.image?.url ?? null, v.media.nodes.map((m) => m.id)]]));
const zustand = (l) => {
  if (gleich(l, VOR)) return 'vor';
  if (gleich(l, OHNE)) return 'geloest';
  if (gleich(l, SOLL)) return 'fertig';
  if (l.length === VOR.length && [...l].sort().join() === [...VOR].sort().join()) return 'umgestellt';
  return 'fremd';
};
// Vergleich mit der Sicherung (Kern, Variantenbilder, Alt-Texte der bleibenden Bilder). Leere Liste = alles gleich.
function gegenSicherung(n, s) {
  const f = [];
  if (kern(n) !== s.kern) f.push('Kernfelder (Titel, Text, SEO, Typ, Preise, Status, Kanäle, Sammlungen, Tags, Lager, Varianten) weichen von der Sicherung ab');
  if (!gleich(varMedien(n), s.variantenMedien)) f.push(`Variantenbilder ${JSON.stringify(varMedien(n))} ≠ gesichert`);
  const a = alts(n);
  for (const m of s.medien) if (m.id in a && a[m.id] !== m.alt) f.push(`Alt-Text ${kurz(m.id)} «${a[m.id]}» ≠ «${m.alt}»`);
  return f;
}
async function ordnen(ziel) {
  const moves = ziel.map((id, i) => ({ id, newPosition: String(i) }));
  const r = await gql(`mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{id done} mediaUserErrors{field message code} } }`, { id: PRODUKT_ID, m: moves });
  const pl = r.productReorderMedia;
  if (pl.mediaUserErrors?.length) abbruch('productReorderMedia: ' + JSON.stringify(pl.mediaUserErrors));
  geschrieben = true;
  let n;
  for (let i = 0; i < ORDNEN_VERSUCHE; i++) {
    await warte(WARTE_MS);
    n = await lesen();
    if (gleich(ids(n), ziel)) return { n, ok: true, versuche: i + 1, job: pl.job?.id };
  }
  return { n, ok: false, versuche: ORDNEN_VERSUCHE, job: pl.job?.id };
}
async function zielBildHolen(url) {
  const r = await fetch(url);
  if (!r.ok) abbruch(`Zielbild nicht ladbar (HTTP ${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

try {
  // ---------- gemeinsamer Anfang: frisch lesen und prüfen ----------
  const p = await lesen();
  if (!p || p.id !== PRODUKT_ID) abbruch(`Produkt nicht gefunden oder andere ID: ${p?.id}`);
  const sch = await gql(`{ i:__type(name:"FileUpdateInput"){ inputFields{name} } a: currentAppInstallation{ accessScopes{handle} } }`);
  const felder = sch.i.inputFields.map((f) => f.name);
  if (!felder.includes('referencesToRemove') || !felder.includes('referencesToAdd')) abbruch('fileUpdate kennt referencesToRemove/referencesToAdd nicht');
  const scopes = sch.a.accessScopes.map((s) => s.handle);
  for (const s of ['write_files', 'write_products']) if (!scopes.includes(s)) abbruch(`Berechtigung ${s} fehlt`);
  const heute = ids(p);
  const z = zustand(heute);
  const s = existsSync(SICHERUNG) ? JSON.parse(readFileSync(SICHERUNG, 'utf8')) : null;
  if (s && (s.produkt !== PRODUKT_ID || s.bild?.id !== ZIEL_ID || !gleich(s.galerie, VOR))) abbruch('vorhandene seite_sicherung.json gehört zu einem anderen Produkt, Bild oder Ausgangsstand');

  console.log(`${ZURUECK ? 'RÜCKNAHME' : 'PLAN'} für ${HANDLE} (${p.status}, ${p.variants.nodes.length} Variante(n), ${heute.length} Bilder, gelesen ${new Date().toISOString()})`);
  console.log(`  Galerie heute:   ${liste(heute)}  [Zustand: ${z}]`);
  console.log(`  Werkzeug:        fileUpdate mit referencesToRemove/referencesToAdd vorhanden, write_files und write_products erteilt`);
  for (const m of p.media.nodes) {
    if (DATEI[m.id] && dateiName(m) !== DATEI[m.id]) abbruch(`${m.id} zeigt auf ${dateiName(m)} statt ${DATEI[m.id]}`);
    if (m.status !== 'READY') abbruch(`Bild ${kurz(m.id)} ist nicht READY (${m.status})`);
  }
  const zielDatei = DATEI[ZIEL_ID].replace(/\.jpg$/, '');
  const fremdKopie = p.media.nodes.filter((m) => m.id !== ZIEL_ID && dateiName(m).includes(zielDatei));
  if (fremdKopie.length && !ZURUECK) abbruch(`die Datei ${zielDatei} hängt unter anderer ID am Produkt (${fremdKopie.map((m) => m.id).join(', ')}): von Hand prüfen`);
  const gebunden = p.variants.nodes.filter((v) => v.media.nodes.some((m) => m.id === ZIEL_ID) || (v.image?.url || '').includes(zielDatei));
  if (gebunden.length) abbruch(`das Ziel ist Variantenbild von ${gebunden.map((v) => v.sku).join(', ')}: nicht ohne Ersatz lösen`);
  const v0 = p.variants.nodes[0];
  if (p.variants.nodes.length !== 1 || v0.sku !== BEITRAG.sku || v0.price !== BEITRAG.preis || v0.compareAtPrice !== null || !v0.availableForSale)
    console.log(`  HINWEIS:         Variante weicht vom Beitragsstand ab (${p.variants.nodes.map((v) => `${v.sku} ${v.price} Vergleich ${v.compareAtPrice} kaufbar ${v.availableForSale}`).join(', ')}); die Beitragstexte nennen CHF ${BEITRAG.preis}`);

  if (!ZURUECK) {
    // ---------- Zweig «Ziel fehlt» (zweiter Lauf oder fremde Änderung) ----------
    if (!heute.includes(ZIEL_ID)) {
      if (!s) abbruch('Ziel fehlt, aber es gibt keine seite_sicherung.json: das hat nicht dieses Skript gelöst; von Hand prüfen');
      const f = gegenSicherung(p, s);
      if (z === 'geloest' && !f.length) {
        console.log(`  Bild 4 ist schon gelöst (Sicherung vom ${s.gelesen}). Offen: nur noch ordnen.`);
        console.log(`  Ordnen auf:      ${liste(SOLL)}`);
        if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); ende(0); }
        const o = await ordnen(SOLL);
        const f2 = o.ok ? gegenSicherung(o.n, s) : [`Reihenfolge nach ${o.versuche} Lesungen (${o.versuche * WARTE_MS / 1000} s) ${liste(ids(o.n))} ≠ Soll ${liste(SOLL)} (Auftrag ${o.job})`];
        const d = await datei(ZIEL_ID);
        if (!d?.id || d.fileStatus !== 'READY') f2.push('Datei des Ziels nicht mehr READY unter Inhalt > Dateien');
        console.log(`NACHGELESEN ${f2.length ? 'ABWEICHUNG: ' + f2.join('; ') : 'OK'} | Galerie: ${liste(ids(o.n))}`);
        ende(f2.length ? 1 : 0);
      }
      if (z !== 'fertig') f.unshift(`Galerie ${liste(heute)} ≠ Soll ${liste(SOLL)}`);
      const d = await datei(ZIEL_ID);
      if (!d?.id || d.fileStatus !== 'READY') f.push('Datei des Ziels nicht mehr READY unter Inhalt > Dateien (Rücknahme dann nur von Hand)');
      console.log(`  Ziel fehlt, Sicherung vom ${s.gelesen} liegt: Vergleich mit Sicherung und Soll.`);
      console.log(`NACHGELESEN ${f.length ? 'ABWEICHUNG: ' + f.join('; ') : 'OK (Endstand schon erreicht, nichts geschrieben)'} | Galerie: ${liste(heute)}`);
      ende(f.length ? 1 : 0);
    }

    // ---------- Ziel da: nur vom gesichteten Ausgangsstand aus ----------
    if (z !== 'vor') abbruch(`Galerie weicht vom gesichteten Stand ab (Reihenfolge oder neue Bilder): ${liste(heute)}; erwartet ${liste(VOR)}`);
    if (s && s.kern !== kern(p)) abbruch('eine alte seite_sicherung.json liegt, aber der Kern hat sich seither geändert: alte Sicherung beiseite legen, dann neu laufen lassen');
    const ziel = p.media.nodes.find((m) => m.id === ZIEL_ID);
    const pos = heute.indexOf(ZIEL_ID);
    const bild = await zielBildHolen(ziel.image.url);
    if (sha(bild) !== ZIEL_SHA) abbruch(`Zielbild hat sich seit der Sichtung geändert (sha256 ${sha(bild)}, ${bild.length} Byte): neu sichten, nicht blind lösen`);
    const rest = p.media.nodes.filter((m) => m.id !== ZIEL_ID);
    if (rest.filter((m) => m.mediaContentType === 'IMAGE' && m.status === 'READY').length < 2) abbruch('ohne das Ziel blieben weniger als 2 fertige Bilder');
    console.log(`  Lösen:           Bild ${pos + 1} ${ZIEL_ID} (${dateiName(ziel)}, ${ziel.image.width}x${ziel.image.height}, sha256 geprüft, Alt «${ziel.alt}»)`);
    console.log(`  Grund:           ${GRUND}`);
    console.log(`  Weg:             fileUpdate referencesToRemove (Datei bleibt unter Inhalt > Dateien), dann productReorderMedia`);
    console.log(`  Ordnen:          5916a885 (Beitragsfoto) an Stelle 1, 0c0fd880 (Spiegelung des Fotografen) ans Ende`);
    console.log(`  Galerie danach:  ${liste(SOLL)} (${SOLL.length} Bilder)`);
    console.log(`  Varianten bleiben: ${p.variants.nodes.map((v) => `${v.sku}=${v.price} (Bild: ${v.image ? 'ja' : 'keins'})`).join(', ')}`);
    console.log(`  Unverändert:     Titel «${p.title}», SEO-Titel «${p.seo?.title}», Produkttyp «${p.productType}», Optionen, Preise, Status, Kanäle, Sammlungen, Tags, Lager, Alt-Texte`);
    if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); ende(0); }

    // Sicherung vor dem ersten Schreiben (nie überschreiben)
    if (existsSync(BILDKOPIE)) { if (sha(readFileSync(BILDKOPIE)) !== ZIEL_SHA) abbruch(`vorhandene ${BILDKOPIE} passt nicht zur Prüfsumme`); }
    else writeFileSync(BILDKOPIE, bild, { flag: 'wx' });
    if (!s) {
      writeFileSync(SICHERUNG, JSON.stringify({ gelesen: new Date().toISOString(), produkt: p.id, handle: p.handle,
        galerie: heute, soll: SOLL,
        medien: p.media.nodes.map((m, i) => ({ id: m.id, position: i, alt: m.alt, url: m.image?.url, datei: dateiName(m) })),
        bild: { id: ziel.id, url: ziel.image.url, alt: ziel.alt, position: pos, breite: ziel.image.width, hoehe: ziel.image.height, sha256: ZIEL_SHA, kopie: BILDKOPIE, bytes: bild.length,
          cj_original: 'https://oss-cf.cjdropshipping.com/product/2025/11/23/04/c209bfc7-e4b2-4180-8f1b-b7a9cc26a4b8_trans.jpeg' },
        variantenMedien: varMedien(p), kern: kern(p) }, null, 1), { flag: 'wx' });
      console.log('Sicherung geschrieben: ' + SICHERUNG + ' und ' + BILDKOPIE);
    } else console.log('Sicherung vorhanden, bleibt unverändert: ' + SICHERUNG);

    const r = await gql(`mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`,
      { f: [{ id: ZIEL_ID, referencesToRemove: [p.id] }] });
    if (r.fileUpdate.userErrors.length) abbruch('fileUpdate (lösen): ' + JSON.stringify(r.fileUpdate.userErrors));
    geschrieben = true;

    // Frisch nachlesen, bis das Bild weg ist (Shopify hinkt bei Medien einige Sekunden nach)
    let n;
    for (let i = 0; i < LOESEN_VERSUCHE; i++) { await warte(WARTE_MS); n = await lesen(); if (!ids(n).includes(ZIEL_ID)) break; }
    if (ids(n).includes(ZIEL_ID)) { console.log(`NACHGELESEN ABWEICHUNG: Bild nach ${LOESEN_VERSUCHE * WARTE_MS / 1000} s noch in der Galerie, nicht geordnet | Galerie: ${liste(ids(n))}`); ende(1); }
    const fz = [];
    if (!gleich(ids(n), OHNE)) fz.push(`Galerie nach dem Lösen ${liste(ids(n))} ≠ ${liste(OHNE)}`);
    if (kern(n) !== kern(p)) fz.push('Kernfelder (Titel, Preise, Status, Kanäle, Sammlungen, Tags, Lager, Varianten) haben sich verändert');
    if (!gleich(varMedien(n), varMedien(p))) fz.push('Variantenbilder haben sich verändert');
    if (fz.length) { console.log(`NACHGELESEN ABWEICHUNG: ${fz.join('; ')}; nicht geordnet | Galerie: ${liste(ids(n))}`); ende(1); }
    console.log(`  Gelöst:          Galerie ${liste(ids(n))}`);

    const o = await ordnen(SOLL);
    const f = [];
    if (!o.ok) f.push(`Reihenfolge nach ${o.versuche} Lesungen (${o.versuche * WARTE_MS / 1000} s) ${liste(ids(o.n))} ≠ Soll ${liste(SOLL)} (Auftrag ${o.job})`);
    if (kern(o.n) !== kern(p)) f.push('Kernfelder haben sich verändert');
    if (!gleich(varMedien(o.n), varMedien(p))) f.push('Variantenbilder haben sich verändert');
    const a0 = alts(p), a1 = alts(o.n);
    for (const id of SOLL) if (a1[id] !== a0[id]) f.push(`Alt-Text ${kurz(id)} «${a1[id]}» ≠ «${a0[id]}»`);
    const d = await datei(ZIEL_ID);
    if (!d?.id || d.fileStatus !== 'READY') f.push('Datei des Ziels nicht mehr READY unter Inhalt > Dateien');
    console.log(`NACHGELESEN ${f.length ? 'ABWEICHUNG: ' + f.join('; ') : 'OK'} | Galerie: ${liste(ids(o.n))} | Datei behalten: ${d?.fileStatus || 'nein'}`);
    ende(f.length ? 1 : 0);
  }

  // ---------------- Rücknahme ----------------
  if (!s) abbruch('keine Sicherung seite_sicherung.json');
  if (z === 'vor') { console.log('  Galerie entspricht schon dem Stand vor dem Lösen. Nichts zu tun.'); ende(0); }
  if (z === 'fremd') abbruch(`Galerie hat sich seit dem Schreiben verändert: ${liste(heute)} (erwartet ${liste(SOLL)}, ${liste(OHNE)} oder alle fünf Bilder)`);
  if (!gleich(varMedien(p), s.variantenMedien)) abbruch(`Variantenbilder seit dem Schreiben geändert: ${JSON.stringify(varMedien(p))}`);
  if (kern(p) !== s.kern) console.log('  Hinweis:         Kernfelder weichen von der Sicherung ab (fremde Änderung seither); die Rücknahme fasst nur die Galerie an.');
  const anhaengen = !heute.includes(ZIEL_ID);
  if (anhaengen) {
    const d = await datei(ZIEL_ID);
    if (!d?.id || d.fileStatus !== 'READY') abbruch(`Datei ${ZIEL_ID} nicht mehr unter Inhalt > Dateien: von Hand hochladen aus ${BILDKOPIE} (umkodierte Fassung) oder ${s.bild.cj_original}`);
  }
  console.log(`  Wieder anhängen: ${anhaengen ? `${kurz(ZIEL_ID)} (${ZIEL_ID}, dieselbe Datei, Alt «${s.bild.alt}»)` : 'nicht nötig (Bild hängt schon am Produkt)'}`);
  console.log(`  Ordnen auf:      ${liste(s.galerie)} (gesicherte Reihenfolge)`);
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); ende(0); }

  let n = p;
  if (anhaengen) {
    const r = await gql(`mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{id} userErrors{field message code} } }`,
      { f: [{ id: ZIEL_ID, referencesToAdd: [p.id] }] });
    if (r.fileUpdate.userErrors.length) abbruch('fileUpdate (anhängen): ' + JSON.stringify(r.fileUpdate.userErrors));
    geschrieben = true;
    for (let i = 0; i < LOESEN_VERSUCHE; i++) { await warte(WARTE_MS); n = await lesen(); if (ids(n).includes(ZIEL_ID)) break; }
    if (!ids(n).includes(ZIEL_ID)) { console.log(`NACHGELESEN ABWEICHUNG: Bild nach ${LOESEN_VERSUCHE * WARTE_MS / 1000} s nicht in der Galerie, nicht geordnet | Galerie: ${liste(ids(n))}`); ende(1); }
  }
  let ok = gleich(ids(n), s.galerie), versuche = 0, job = null;
  if (!ok) { const o = await ordnen(s.galerie); n = o.n; ok = o.ok; versuche = o.versuche; job = o.job; }
  const f = [];
  if (!ok) f.push(`Reihenfolge nach ${versuche} Lesungen ${liste(ids(n))} ≠ gesichert ${liste(s.galerie)} (Auftrag ${job})`);
  if (kern(n) !== kern(p)) f.push('Kernfelder haben sich während der Rücknahme verändert');
  if (!gleich(varMedien(n), s.variantenMedien)) f.push('Variantenbilder ≠ gesichert');
  const a = alts(n);
  for (const m of s.medien) if (a[m.id] !== m.alt) f.push(`Alt-Text ${kurz(m.id)} «${a[m.id]}» ≠ «${m.alt}»`);
  const zm = n.media.nodes.find((m) => m.id === ZIEL_ID);
  if (zm?.image?.url) {
    // nur zur Auskunft, ändert den Exit nicht (das CDN kann neu umkodieren)
    try {
      const r = await fetch(zm.image.url);
      const b = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
      console.log(`  Bildinhalt:      ${!b ? `nicht prüfbar (HTTP ${r.status})` : sha(b) === s.bild.sha256 ? 'sha256 gleich der Sicherung' : `sha256 anders als bei der Sichtung (${sha(b).slice(0, 12)}, CDN-Umkodierung möglich)`}`);
    } catch (e) { console.log('  Bildinhalt:      nicht prüfbar (' + (e?.message || e) + ')'); }
  }
  console.log(`NACHGELESEN ${f.length ? 'ABWEICHUNG: ' + f.join('; ') : 'OK'} | Galerie: ${liste(ids(n))}`);
  ende(f.length ? 1 : 0);
} catch (e) {
  abbruch('Fehler: ' + (e?.message || e));
}
