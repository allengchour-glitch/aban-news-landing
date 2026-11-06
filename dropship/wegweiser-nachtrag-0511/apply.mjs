// 05.11.2026 «weiter»: die drei im Wegweiser-Lauf zurückgehaltenen Beitragsprodukte nach unabhängiger Gegenlesung korrigieren und in die Sammlung aufnehmen.
// Quellen: Bilder + CJ-Datenblatt (Autor je Produkt, zwei Gegenleser je Produkt, Workflow wf_fb87a8ce-bf7). Trockenlauf Vorgabe.
//   Trockenlauf:  node apply.mjs        Schreiben: LIVE=1 node apply.mjs        Rücknahme: ZURUECK=1 LIVE=1 node apply.mjs        Auswahl: NUR=<handle,...>
//   Exit: 0 gut · 3 Vorbedingung nicht erfüllt (Produkt unverändert) · 6 Abweichung beim Rücklesen · 1/2 Fehler
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = process.env.SICHERUNG || HIER + 'sicherung.json';
const NUR = (process.env.NUR || '').split(',').map((s) => s.trim()).filter(Boolean);
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const pause = (ms) => new Promise((s) => setTimeout(s, ms));
const WEGWEISER = 'aus-tiktok-und-instagram';

// ---------------- Soll je Produkt (Texte nur aus Bild oder CJ-Datenblatt belegt) ----------------
const TR = (txt) => new RegExp('<tr>\\s*<th[^>]*>' + txt + '</th>[\\s\\S]*?</tr>\\s*');
const SPEC = [
  { handle: 'schokoladen-ohrring-haarstecker-609700', preis: '15.9', beitrag: '11.11. FB/IG',
    titel: ['Haarspange Herz-Keks', 'Haarspange Keks'],
    seoTitel: ['Haarspange Herz-Keks | LuxeStyle CH', 'Haarspange Keks | LuxeStyle CH'],
    seoText: ['Die Haarspange trägt ein Herz in Form eines Kekses mit kleinen Löchern und gebräunten Rändern, aufgesetzt auf eine braune Metallspange. Gewicht: 4 g.', 'Haarspange mit nachgebildetem Keks als Herz, Quadrat, Kreis oder Stern. Braune Spange. Material: Kunstharz. Gewicht: 4 g.'],
    ersetzen: [
      ['Die Haarspange trägt ein Herz in Form eines Kekses mit kleinen Löchern und gebräunten Rändern, aufgesetzt auf eine braune Metallspange. Das Herz ist aus Kunstharz und sieht einem Butterkeks ähnlich, die Spange klappt wie eine klassische Haarklammer auf und zu. Die Spange ist klein und wiegt wenig.',
       'Die Haarspange trägt einen nachgebildeten Keks mit kleinen Löchern auf einer braunen Spange. Den Keks gibt es als Herz, Quadrat, Kreis oder Stern. Er ist kein Gebäck, sondern eine Nachbildung; Material laut Datenblatt: Kunstharz. Die Spange wiegt 4 g.'],
      ['Du steckst damit den Pony zur Seite, hältst eine Strähne hinter dem Ohr oder setzt sie als Hingucker in einen Zopf. Für Kinder, für Kostümabende oder einfach als kleines Geschenk an jemanden, der Kekse mag. Geliefert wird eine Spange mit Herz.',
       'Du steckst damit zum Beispiel den Pony zur Seite, oder du schenkst sie jemandem, der Kekse mag. Nicht für Kinder unter 3 Jahren geeignet. Geliefert wird eine Spange in der gewählten Form, auch wenn die Fotos mehrere Modelle zeigen.'],
      ['<strong>Material:</strong> Kunstharz, Metall</li>', '<strong>Material:</strong> Kunstharz</li>'],
      ['<strong>Motiv:</strong> Herz-Keks</li>', '<strong>Motiv:</strong> Keks (Herz, Quadrat, Kreis oder Stern)</li>\n<li>\n<strong>Lieferumfang:</strong> 1 Spange in der gewählten Form</li>'],
    ],
    optionen: [['Modell', 'Five Sterne', 'Stern'], ['Modell', 'Liebe', 'Herz']],
    reihenfolge: ['Herz', 'Quadrat', 'Kreis', 'Stern'], erstesVariante: { titel: 'Herz', sku: 'CJJT298338704DW' } },
  { handle: 'weihnachtsdeer-kerzenhalter-aus-eisen-1b5d86', preis: '16.9', beitrag: '12.11. FB/IG',
    seoText: ['Für festliche Stimmung auf dem Esstisch oder dem Kaminsims sorgt der Weihnachtsdeer‑Kerzenhalter. Material: Metall.', 'Kerzenhalter aus Eisen als Hirsch beziehungsweise Elch, dazu eine runde Ausführung mit ausgeschnittenen Tannen und Sternen. Material: Metall.'],
    ersetzen: [
      ['ist als Hirsch beziehungsweise Elch gestaltet und bringt Weihnachtsstimmung auf den Tisch oder in die Vitrine. Der Halter selbst besteht aus Eisen, die Verzierung aus Stoff und Kunststoff greift klassische Weihnachtsmotive auf: den Weihnachtsmann, den Schneemann und den Elch.',
       'ist in der Ausführung «Hirsch, schwarz» als Hirsch beziehungsweise Elch gestaltet, mit Geweih aus dünnen Stäben, einer runden Schale in der Körpermitte und vier Beinen. Auf mehreren Produktbildern steht ein Teelicht in der Schale. Der Halter besteht aus Eisen.'],
      ['Gefertigt ist er teils von Hand und teils maschinell. Die Dekoration ist wiederverwendbar, sie kommt also auch im nächsten Jahr wieder auf den Tisch.',
       'Laut Datenblatt ist das Produkt teils von Hand und teils maschinell gefertigt. Die zweite Ausführung hat eine andere Form, mehr dazu unter «Auswahl und Mass».'],
      ['Zur Auswahl stehen «Schwarz» und «Schwarz D». Worin sich die zweite Ausführung unterscheidet, ist nicht beschrieben, schau dir dazu die Produktbilder an. Masse und der Durchmesser der Kerzenaufnahme sind ebenfalls nicht angegeben, miss deshalb vor dem Kauf nach, ob deine Kerzen passen.',
       'Zur Auswahl stehen zwei Ausführungen, beide in Schwarz. «Hirsch, schwarz» ist der Halter in Hirschform. «Rund mit Tannenbäumen, schwarz» ist eine andere Form: ein runder, oben offener Körper mit ausgeschnittenen Tannenbäumen und Sternen, laut Produktbild 6 cm breit und 5 cm hoch; das Bild zeigt ihn ohne Kerze. Für den Hirsch sind keine Masse und kein Schalendurchmesser angegeben: Auf mehreren Produktbildern steht ein Teelicht in der Schale, für andere Kerzen kann der Halter zu klein sein.'],
      ['Weil die Verzierung aus Stoff und Kunststoff besteht, gehört sie nicht in die Nähe einer offenen Flamme. Wähle eine Kerze, die die Dekoration nicht berührt, oder nimm eine LED-Kerze. Im Paket liegt 1 Kerzenhalter.',
       'Lass brennende Kerzen nie unbeaufsichtigt. Stell den Halter auf eine feste, ebene Unterlage, die nicht brennt, und halte Abstand zu Watte, Dekoschnee, Papier und Stoff. Auf einigen Produktbildern steht er auf Dekoschnee, das ist keine sichere Unterlage für eine brennende Kerze. Der Halter besteht aus Metall und kann bei brennender Kerze heiss werden. Wer ohne offene Flamme dekorieren möchte, nimmt ein LED-Teelicht, sofern es in die Schale passt. Im Paket liegt 1 Kerzenhalter; Kerzen, Teelichter und die Dekoration auf den Bildern gehören nicht dazu.'],
    ],
    entfernenZeilen: ['Muster'],
    optionen: [['Farbe', 'Schwarz', 'Hirsch, schwarz'], ['Farbe', 'Schwarz D', 'Rund mit Tannenbäumen, schwarz']],
    medienErste: 'bild6', medienLetzte: 'bild2' },
  { handle: 'usb-stick-flaschenoffner-aus-metall-534784', preis: '15.9', beitrag: '15.11. FB/IG',
    ersetzen: [
      ['Zur Auswahl stehen die Speichergrössen 4 GB, 8 GB, 16 GB, 32 GB, 64 GB und 128 GB.',
       'Zur Auswahl stehen sechs Ausführungen; der Lieferant gibt dafür die Speichergrössen 4 GB, 8 GB, 16 GB, 32 GB, 64 GB und 128 GB an. Der Stecker ist laut Produktbildern ein klassischer USB-A-Stecker.'],
      ['Für Dokumente, Fotos und Musik reicht das gut, grosse Dateimengen kopierst du damit aber nicht im Eiltempo.', 'Die Tempoangaben sind Höchstwerte laut Datenblatt.'],
      ['Wähle die Kapazität nach dem, was du darauf speichern willst; im Lieferumfang ist ein Stick enthalten.',
       'Wähle die Kapazität nach dem, was du darauf speichern willst; im Lieferumfang ist ein Stick enthalten. Die Speichergrösse beruht auf den Angaben des Lieferanten.'],
      ['✅ Geprüfte Angaben', '✅ Angaben laut Datenblatt'],
      ['4 gb, 8 gb, 16 gb, 32 gb, 64 gb, 128 gb', '4 GB, 8 GB, 16 GB, 32 GB, 64 GB, 128 GB'],
      ['und der ganze Stick wiegt nur 20 g.', 'und der Stick wiegt 20 g.'],
    ] },
];

// ---------------- Lesen / Schreiben ----------------
const FELD = `id handle title status tracksInventory totalInventory onlineStoreUrl descriptionHtml seo{title description}
  options{id name optionValues{id name}} priceRangeV2{minVariantPrice{amount}}
  variants(first:100){nodes{id title sku price position image{url}}} media(first:30){nodes{id}}`;
const lies = async (handle) => { const n = (await q(`query($h:String!){products(first:2,query:$h){nodes{${FELD}}}}`, { h: `handle:${handle}` })).products.nodes.filter((p) => p.handle === handle); if (n.length !== 1) throw new Error('Produkt nicht eindeutig: ' + handle); return n[0]; };
const fehler = (j, name) => { if (!j) throw new Error(name + ': leere Antwort'); const e = j.userErrors || j.mediaUserErrors; if (e?.length) throw new Error(name + ': ' + JSON.stringify(e)); };
const bis = async (name, pruefe, versuche = 8, ms = 2500) => { for (let i = 0; i < versuche; i++) { await pause(ms); if (await pruefe()) return true; } console.log('  ABWEICHUNG nach', versuche, 'Versuchen:', name); return false; };
const speichere = (s) => writeFileSync(SICH, JSON.stringify(s, null, 1));
const zaehle = (s, t) => s.split(t).length - 1;
const mitglieder = async () => { const ids = new Set(); let after = null; for (let s = 0; s < 6; s++) { const j = (await q(`query($h:String!,$a:String){collectionByHandle(handle:$h){products(first:100,after:$a){nodes{id handle}pageInfo{hasNextPage endCursor}}}}`, { h: WEGWEISER, a: after })).collectionByHandle.products; for (const p of j.nodes) ids.add(p.handle); if (!j.pageInfo.hasNextPage) break; after = j.pageInfo.endCursor; } return ids; };
const wegweiser = async () => (await q(`query($h:String!){collectionByHandle(handle:$h){id}}`, { h: WEGWEISER })).collectionByHandle;
const wertNamen = (p) => p.options.flatMap((o) => o.optionValues.map((v) => ({ optionId: o.id, option: o.name, id: v.id, name: v.name })));

/** Soll-Zustand berechnen; wirft bei verletzter Vorbedingung (Produkt wird dann nicht angefasst). */
function planen(p, s) {
  const plan = { handle: s.handle, neuDesc: null, neuTitel: null, neuSeoTitel: null, neuSeoText: null, renames: [], reihenfolge: null, medien: null };
  let desc = p.descriptionHtml;
  for (const [alt, neu] of s.ersetzen || []) { const n = zaehle(desc, alt); if (n === 1) desc = desc.replace(alt, () => neu); else if (zaehle(desc, neu) >= 1 && n === 0) { /* schon neu */ } else throw new Error(`Vorbedingung: Textstelle kommt ${n}× vor: «${alt.slice(0, 70)}…»`); }
  for (const zeile of s.entfernenZeilen || []) { const re = TR(zeile); if (re.test(desc)) desc = desc.replace(re, ''); }
  if (desc !== p.descriptionHtml) plan.neuDesc = desc;
  if (s.titel && p.title === s.titel[0]) plan.neuTitel = s.titel[1]; else if (s.titel && p.title !== s.titel[1]) throw new Error('Vorbedingung: Titel weicht ab: ' + p.title);
  if (s.seoTitel && p.seo?.title === s.seoTitel[0]) plan.neuSeoTitel = s.seoTitel[1];
  if (s.seoText) { if (p.seo?.description === s.seoText[0]) plan.neuSeoText = s.seoText[1]; else if (p.seo?.description !== s.seoText[1]) throw new Error('Vorbedingung: SEO-Text weicht ab: ' + p.seo?.description); }
  const werte = wertNamen(p);
  for (const [opt, alt, neu] of s.optionen || []) { const v = werte.find((w) => w.option === opt && w.name === alt); if (v) plan.renames.push({ optionId: v.optionId, id: v.id, alt, neu }); else if (!werte.some((w) => w.option === opt && w.name === neu)) throw new Error(`Vorbedingung: Optionswert «${alt}» fehlt`); }
  if (s.reihenfolge) { const nach = s.optionen ? Object.fromEntries((s.optionen || []).map(([, a, n]) => [a, n])) : {}; const soll = s.reihenfolge; const jetzt = p.options[0].optionValues.map((v) => nach[v.name] || v.name); if (jetzt.join('|') !== soll.join('|')) plan.reihenfolge = { optionId: p.options[0].id, soll }; }
  if (s.medienErste) { const ids = p.media.nodes.map((m) => m.id); const erster = ids[Number(s.medienErste.slice(4)) - 1], letzter = ids[Number(s.medienLetzte.slice(4)) - 1]; if (ids[0] !== erster || ids.at(-1) !== letzter) plan.medien = { erster, letzter, vorher: ids }; }
  return plan;
}
async function schreibe(p, plan, s) {
  if (plan.neuDesc !== null || plan.neuTitel || plan.neuSeoTitel || plan.neuSeoText !== null) {
    const input = { id: p.id }; if (plan.neuDesc !== null) input.descriptionHtml = plan.neuDesc; if (plan.neuTitel) input.title = plan.neuTitel;
    if (plan.neuSeoTitel || plan.neuSeoText !== null) input.seo = { title: plan.neuSeoTitel || p.seo?.title || null, description: plan.neuSeoText ?? p.seo?.description ?? null };
    fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: input })).productUpdate, 'productUpdate');
  }
  const nachOption = plan.renames.reduce((m, w) => { (m[w.optionId] ||= []).push(w); return m; }, {});
  for (const [optionId, ws] of Object.entries(nachOption)) fehler((await q(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v){userErrors{field message}}}`, { p: p.id, o: { id: optionId }, v: ws.map((w) => ({ id: w.id, name: w.neu })) })).productOptionUpdate, 'productOptionUpdate');
  if (plan.reihenfolge) {
    const aktuell = (await lies(p.handle)).options.find((o) => o.id === plan.reihenfolge.optionId).optionValues;
    const werte = plan.reihenfolge.soll.map((n) => { const v = aktuell.find((x) => x.name === n); if (!v) throw new Error('Optionswert für Reihenfolge fehlt: ' + n); return { id: v.id }; });
    fehler((await q(`mutation($p:ID!,$o:[OptionReorderInput!]!){productOptionsReorder(productId:$p,options:$o){userErrors{field message}}}`, { p: p.id, o: [{ id: plan.reihenfolge.optionId, values: werte }] })).productOptionsReorder, 'productOptionsReorder');
  }
  if (plan.medien) {
    const moves = [{ id: plan.medien.erster, newPosition: '0' }, { id: plan.medien.letzter, newPosition: String(plan.medien.vorher.length - 1) }];
    fehler((await q(`mutation($i:ID!,$m:[MoveInput!]!){productReorderMedia(id:$i,moves:$m){mediaUserErrors{field message}}}`, { i: p.id, m: moves })).productReorderMedia, 'productReorderMedia');
  }
}
const stand = (p) => ({ title: p.title, seoTitel: p.seo?.title ?? null, seoText: p.seo?.description ?? null, desc: p.descriptionHtml, werte: wertNamen(p).map((w) => ({ optionId: w.optionId, id: w.id, name: w.name })), reihenfolge: p.options.map((o) => ({ optionId: o.id, werte: o.optionValues.map((v) => v.id) })), medien: p.media.nodes.map((m) => m.id), varianten: p.variants.nodes.map((v) => ({ id: v.id, sku: v.sku, preis: v.price, bild: v.image?.url ?? null })) });

if (ZURUECK) {
  const s = JSON.parse(readFileSync(SICH, 'utf8')); let nf = 0;
  const w = await wegweiser(); const drin = await mitglieder();
  const raus = (s.hinzugefuegt || []).filter((x) => drin.has(x.handle));
  if (raus.length && LIVE) { fehler((await q(`mutation($id:ID!,$p:[ID!]!){collectionRemoveProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: w.id, p: raus.map((x) => x.id) })).collectionRemoveProducts, 'collectionRemoveProducts'); if (!(await bis('Wegweiser raus', async () => { const m = await mitglieder(); return raus.every((x) => !m.has(x.handle)); }))) nf++; }
  console.log('Wegweiser: entfernt', raus.length);
  for (const x of s.produkte || []) {
    const p = await lies(x.handle); const spec = SPEC.find((y) => y.handle === x.handle); console.log('zurück:', x.handle); if (!LIVE) continue;
    const input = { id: p.id }; if (p.descriptionHtml !== x.vorher.desc) input.descriptionHtml = x.vorher.desc; if (p.title !== x.vorher.title) input.title = x.vorher.title;
    input.seo = { title: x.vorher.seoTitel, description: x.vorher.seoText };
    fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: input })).productUpdate, 'productUpdate');
    const nachOption = x.vorher.werte.filter((v) => wertNamen(p).some((c) => c.id === v.id && c.name !== v.name)).reduce((m, v) => { (m[v.optionId] ||= []).push(v); return m; }, {});
    for (const [optionId, ws] of Object.entries(nachOption)) fehler((await q(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v){userErrors{field message}}}`, { p: p.id, o: { id: optionId }, v: ws.map((v) => ({ id: v.id, name: v.name })) })).productOptionUpdate, 'productOptionUpdate');
    for (const o of x.vorher.reihenfolge) fehler((await q(`mutation($p:ID!,$o:[OptionReorderInput!]!){productOptionsReorder(productId:$p,options:$o){userErrors{field message}}}`, { p: p.id, o: [{ id: o.optionId, values: o.werte.map((id) => ({ id })) }] })).productOptionsReorder, 'productOptionsReorder');
    const nowIds = p.media.nodes.map((m) => m.id);
    if (nowIds.join() !== x.vorher.medien.join()) fehler((await q(`mutation($i:ID!,$m:[MoveInput!]!){productReorderMedia(id:$i,moves:$m){mediaUserErrors{field message}}}`, { i: p.id, m: x.vorher.medien.map((id, i) => ({ id, newPosition: String(i) })) })).productReorderMedia, 'productReorderMedia');
    const ok = await bis('zurück ' + x.handle, async () => { const n = await lies(x.handle); return n.descriptionHtml === x.vorher.desc && n.title === x.vorher.title && n.seo?.description === x.vorher.seoText; });
    console.log('  rücklesen', ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++;
  }
  console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf, nichts geschrieben'); process.exit(nf ? 6 : 0);
}

// ---------------- Plan ----------------
const plaene = []; let exit3 = false;
for (const s of SPEC) {
  if (NUR.length && !NUR.includes(s.handle)) continue;
  const p = await lies(s.handle);
  try { const plan = planen(p, s); plaene.push({ s, p, plan }); console.log(`\n## ${s.handle} (${p.status}) | Text ${plan.neuDesc !== null ? 'neu' : '-'} | Titel ${plan.neuTitel || '-'} | SEO ${plan.neuSeoText !== null ? 'neu' : '-'} | Optionen ${plan.renames.map((x) => x.alt + '→' + x.neu).join(', ') || '-'} | Reihenfolge ${plan.reihenfolge ? plan.reihenfolge.soll.join('/') : '-'} | Medien ${plan.medien ? 'ja' : '-'}`); }
  catch (e) { exit3 = true; console.log(`\n## ${s.handle}: ${e.message} → NICHT geschrieben`); }
}
if (!LIVE) { console.log('\nTrockenlauf, nichts geschrieben'); process.exit(exit3 ? 3 : 0); }

const sich = existsSync(SICH) ? JSON.parse(readFileSync(SICH, 'utf8')) : { produkte: [], hinzugefuegt: [] };
let nf = 0;
for (const { s, p, plan } of plaene) {
  if (!sich.produkte.some((x) => x.handle === s.handle)) { sich.produkte.push({ handle: s.handle, id: p.id, vorher: stand(p) }); speichere(sich); }
  const vor = new Map(p.variants.nodes.map((v) => [v.id, v]));
  await schreibe(p, plan, s);
  const ok = await bis(s.handle, async () => {
    const n = await lies(s.handle);
    if (plan.neuDesc !== null && n.descriptionHtml !== plan.neuDesc) return false;
    if (plan.neuTitel && n.title !== plan.neuTitel) return false;
    if (plan.neuSeoText !== null && n.seo?.description !== plan.neuSeoText) return false;
    for (const w of plan.renames) if (!wertNamen(n).some((x) => x.id === w.id && x.name === w.neu)) return false;
    if (plan.reihenfolge && n.options.find((o) => o.id === plan.reihenfolge.optionId).optionValues.map((v) => v.name).join('|') !== plan.reihenfolge.soll.join('|')) return false;
    if (plan.medien && (n.media.nodes[0].id !== plan.medien.erster || n.media.nodes.at(-1).id !== plan.medien.letzter)) return false;
    for (const v of n.variants.nodes) { const a = vor.get(v.id); if (!a || a.sku !== v.sku || a.price !== v.price) return false; }       // SKU und Preis je Variante unverändert
    if (s.erstesVariante) { const e = [...n.variants.nodes].sort((a, b) => a.position - b.position)[0]; if (e.title !== s.erstesVariante.titel || e.sku !== s.erstesVariante.sku) return false; }
    return true;
  });
  console.log(`rücklesen ${s.handle}: ${ok ? 'GLEICH' : 'ABWEICHUNG'}`); if (!ok) nf++;
}
// Wegweiser: nur Produkte, die jetzt stimmen (aktiv, im Onlineshop, nicht ausverkauft, Preis wie im Beitrag)
const w = await wegweiser(); const drin = await mitglieder(); const add = [];
for (const { s } of plaene) {
  const p = await lies(s.handle); const preis = String(Number(p.priceRangeV2.minVariantPrice.amount));
  if (p.status !== 'ACTIVE' || !p.onlineStoreUrl || (p.tracksInventory && p.totalInventory <= 0) || preis !== s.preis) { console.log('Wegweiser: übersprungen', s.handle, p.status, preis); continue; }
  if (drin.has(s.handle)) { console.log('Wegweiser: schon drin', s.handle); continue; }
  add.push({ id: p.id, handle: s.handle });
}
if (add.length && nf === 0) {
  fehler((await q(`mutation($id:ID!,$p:[ID!]!){collectionAddProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: w.id, p: add.map((x) => x.id) })).collectionAddProducts, 'collectionAddProducts');
  for (const x of add) if (!sich.hinzugefuegt.some((y) => y.id === x.id)) sich.hinzugefuegt.push(x);
  speichere(sich);
  const ok = await bis('Wegweiser +', async () => { const m = await mitglieder(); return add.every((x) => m.has(x.handle)); });
  console.log('rücklesen Wegweiser', ok ? 'GLEICH' : 'ABWEICHUNG', add.map((x) => x.handle).join(', ')); if (!ok) nf++;
} else if (add.length) console.log('Wegweiser: nicht aufgenommen wegen Abweichung beim Rücklesen');
process.exit(nf ? 6 : exit3 ? 3 : 0);
