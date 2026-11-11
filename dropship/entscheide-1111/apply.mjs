// apply.mjs: setzt die Entscheide des Besitzers vom 11.11.2026 um («1 2 3 4 ja 5entwurf»).
//   texte     : Titel, SEO-Titel, SEO-Beschreibung, Bild-Alt-Texte und der Kopf der Beschreibung (bis zum ersten </ul>)
//   varianten : einzelne Varianten löschen und ihr Bild vom Produkt lösen (die Datei bleibt unter Inhalt > Dateien)
//   entwurf   : Produkt auf Entwurf (DRAFT) und Tag «entwurf-besitzer-1111-nicht-live»
// Trockenlauf ist die Vorgabe. LIVE=1 schreibt. ZURUECK=1 LIVE=1 stellt aus dem Ordner sicherung/ zurück
// (gelöschte Varianten werden neu angelegt und bekommen dabei neue IDs).
// Aufruf: NODE_USE_ENV_PROXY=1 [LIVE=1] [ZURUECK=1] node dropship/entscheide-1111/apply.mjs
// Vor jedem Schreiben: Vorbedingung (Titel, Hash des alten Textteils, Variante mit Titel und SKU), Sicherung,
// danach frisch zurücklesen. Weicht etwas ab, wird das Produkt nicht angefasst (ABBRUCH je Produkt).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { seoTitel } from '../../automation/lib/seo_titel.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICH = join(HIER, 'sicherung');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const plan = JSON.parse(readFileSync(join(HIER, 'plan.json'), 'utf8'));
const MARKER = '<!-- ls-var-v1 -->';

const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
});
const tok = (await tr.json().catch(() => null))?.access_token;
if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status); process.exit(2); }
const warte = ms => new Promise(r => setTimeout(r, ms));
async function gql(q, v) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok },
      body: JSON.stringify({ query: q, variables: v }),
    });
    const j = await r.json().catch(() => ({ errors: [{ message: 'HTTP ' + r.status }] }));
    if (j.errors && /throttled/i.test(JSON.stringify(j.errors))) { await warte(2000 * (i + 1)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  }
  throw new Error('gedrosselt');
}
function fehler(teil, wo) {
  const e = (teil?.userErrors || []).concat(teil?.mediaUserErrors || []);
  if (e.length) throw new Error(`${wo}: ${JSON.stringify(e).slice(0, 300)}`);
}
const sha = s => createHash('sha256').update(Buffer.from(String(s), 'utf8')).digest('hex');
function zerlege(html) {
  const s = String(html || '');
  const a = s.startsWith(MARKER) ? MARKER.length : 0;
  const i = s.indexOf('</ul>');
  if (i < 0) return null;
  const e = i + '</ul>'.length;
  return { vor: s.slice(0, a), kopf: s.slice(a, e), rest: s.slice(e) };
}

const Q = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status tags seo{ title description } descriptionHtml
  options{ name optionValues{ name hasVariants } }
  media(first:100){ nodes{ id alt status ... on MediaImage{ image{ url } } } }
  variants(first:100){ nodes{ id title sku price compareAtPrice inventoryPolicy taxable selectedOptions{ name value }
    inventoryItem{ tracked measurement{ weight{ unit value } } } media(first:5){ nodes{ id } } } } } }`;
async function lesen(h) {
  const p = (await gql(Q, { h })).productByIdentifier;
  if (!p) throw new Error('Produkt fehlt: ' + h);
  return {
    id: p.id, handle: p.handle, titel: p.title, status: p.status, tags: p.tags, seo: p.seo, html: p.descriptionHtml,
    optionen: p.options.map(o => ({ name: o.name, werte: o.optionValues.map(v => ({ name: v.name, mitVarianten: v.hasVariants })) })),
    medien: p.media.nodes.map(m => ({ id: m.id, alt: m.alt || '', status: m.status, url: m.image?.url || '' })),
    varianten: p.variants.nodes.map(v => ({
      id: v.id, titel: v.title, sku: v.sku, preis: v.price, vergleichspreis: v.compareAtPrice, policy: v.inventoryPolicy,
      steuer: v.taxable, optionen: v.selectedOptions, verfolgt: v.inventoryItem?.tracked ?? false,
      gewicht: v.inventoryItem?.measurement?.weight || null, medien: v.media.nodes.map(m => m.id),
    })),
  };
}
function sichern(h, snap) {
  mkdirSync(SICH, { recursive: true });
  const f = join(SICH, `${h}.json`);
  if (existsSync(f)) return f;                       // erste Sicherung bleibt (Stand vor der ersten Änderung)
  writeFileSync(f, JSON.stringify({ gesichert: new Date().toISOString(), produkt: snap }, null, 1));
  return f;
}
function sicherung(h) {
  const f = join(SICH, `${h}.json`);
  if (!existsSync(f)) throw new Error('keine Sicherung: ' + f);
  return JSON.parse(readFileSync(f, 'utf8')).produkt;
}

const M_PROD = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
const M_FILE = `mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{ id } userErrors{ field message } } }`;
const M_VDEL = `mutation($p:ID!,$v:[ID!]!){ productVariantsBulkDelete(productId:$p, variantsIds:$v){ product{ id } userErrors{ field message } } }`;
const M_VNEU = `mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$p, variants:$v){ productVariants{ id title } userErrors{ field message } } }`;
const M_ORDER = `mutation($id:ID!,$moves:[MoveInput!]!){ productReorderMedia(id:$id, moves:$moves){ job{ id } mediaUserErrors{ field message } } }`;
const M_TAG_ADD = `mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ field message } } }`;
const M_TAG_DEL = `mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{ field message } } }`;

const bericht = { ok: 0, schon: 0, abbruch: 0, fehler: 0 };
const zeile = (h, s) => console.log(`${h}: ${s}`);

// ---------- 1 und 4: Texte ----------
function textSoll(t, snap) {
  const z = zerlege(snap.html);
  const seo = seoTitel(t.titel);
  return {
    titel: t.titel,
    seoTitel: seo.title,
    seoBeschreibung: t.seo_beschreibung,
    html: z ? z.vor + t.kopf_neu + z.rest : null,
    alts: snap.medien.filter(m => m.alt.includes(t.erwartet_titel)).map(m => ({ id: m.id, alt: m.alt.split(t.erwartet_titel).join(t.titel) })),
  };
}
function textGleich(t, snap) {
  // Der neue Kopf kann nach dem ersten </ul> weitergehen (Hinweis-Absatz): darum «beginnt mit», nicht «gleich dem Kopf»
  const s = String(snap.html || '');
  const ohneMarker = s.startsWith(MARKER) ? s.slice(MARKER.length) : s;
  const seoSoll = seoTitel(t.titel).title;
  return snap.titel === t.titel && ohneMarker.startsWith(t.kopf_neu)
    && (snap.seo.title === seoSoll || (snap.seo.title == null && seoSoll === t.titel))
    && snap.seo.description === t.seo_beschreibung
    && !snap.medien.some(m => m.alt.includes(t.erwartet_titel));
}
async function texte() {
  for (const t of plan.texte) {
    const h = t.handle;
    try {
      const snap = await lesen(h);
      if (ZURUECK) {
        const alt = sicherung(h);
        if (!LIVE) { zeile(h, `ZURÜCK würde Titel «${alt.titel}», SEO und Beschreibung aus der Sicherung setzen`); continue; }
        fehler((await gql(M_PROD, { p: { id: alt.id, title: alt.titel, descriptionHtml: alt.html,
          seo: { title: alt.seo.title ?? '', description: alt.seo.description ?? '' } } })).productUpdate, 'Text zurück');
        const altAlts = alt.medien.filter(m => snap.medien.some(n => n.id === m.id && n.alt !== m.alt)).map(m => ({ id: m.id, alt: m.alt }));
        if (altAlts.length) fehler((await gql(M_FILE, { f: altAlts })).fileUpdate, 'Alt-Texte zurück');
        const n = await lesen(h);
        zeile(h, n.titel === alt.titel && n.html === alt.html ? 'ZURÜCK GLEICH' : 'ZURÜCK WEICHT AB');
        continue;
      }
      if (textGleich(t, snap)) { zeile(h, 'schon im Soll'); bericht.schon++; continue; }
      const z = zerlege(snap.html);
      if (snap.titel !== t.erwartet_titel) { zeile(h, `ABBRUCH: Titel ist «${snap.titel}»`); bericht.abbruch++; continue; }
      if (!z || sha(z.kopf) !== t.kopf_alt_sha256) { zeile(h, 'ABBRUCH: Beschreibung hat sich seit dem Plan geändert'); bericht.abbruch++; continue; }
      const soll = textSoll(t, snap);
      if (soll.seoBeschreibung.length > 160) { zeile(h, 'ABBRUCH: SEO-Beschreibung über 160 Zeichen'); bericht.abbruch++; continue; }
      console.log(`${h}:\n  Titel  «${snap.titel}»\n    →    «${soll.titel}»\n  SEO-Titel «${snap.seo.title}» → «${soll.seoTitel}»`
        + `\n  SEO-Beschr. → «${soll.seoBeschreibung}»\n  Textkopf ${z.kopf.length} → ${t.kopf_neu.length} Zeichen, Alt-Texte ${soll.alts.length}`);
      if (!LIVE) continue;
      sichern(h, snap);
      fehler((await gql(M_PROD, { p: { id: snap.id, title: soll.titel, descriptionHtml: soll.html,
        seo: { title: soll.seoTitel, description: soll.seoBeschreibung } } })).productUpdate, 'Text');
      if (soll.alts.length) fehler((await gql(M_FILE, { f: soll.alts })).fileUpdate, 'Alt-Texte');
      let n = await lesen(h);
      for (let i = 0; i < 5 && !textGleich(t, n); i++) { await warte(3000); n = await lesen(h); }
      if (textGleich(t, n)) { zeile(h, 'GLEICH (Titel, Text, SEO, Alt-Texte)'); bericht.ok++; }
      else { zeile(h, `WEICHT AB: Titel «${n.titel}», SEO «${n.seo.title}» / «${n.seo.description}»`); bericht.fehler++; }
    } catch (e) { zeile(h, 'FEHLER ' + e.message); bericht.fehler++; }
  }
}

// ---------- 2 und 3: Varianten löschen, Bild lösen ----------
async function varianten() {
  for (const v of plan.varianten) {
    const h = v.handle;
    try {
      const snap = await lesen(h);
      if (ZURUECK) {
        const alt = sicherung(h);
        const fehlendeMedien = v.medien_loesen.map(m => m.id).filter(id => !snap.medien.some(n => n.id === id));
        const fehlendeVar = alt.varianten.filter(x => v.varianten.some(y => y.id === x.id) && !snap.varianten.some(n => n.sku === x.sku));
        if (!LIVE) { zeile(h, `ZURÜCK würde ${fehlendeMedien.length} Bild(er) anhängen und ${fehlendeVar.length} Variante(n) neu anlegen`); continue; }
        if (fehlendeMedien.length) {
          fehler((await gql(M_FILE, { f: fehlendeMedien.map(id => ({ id, referencesToAdd: [alt.id] })) })).fileUpdate, 'Bild anhängen');
          await warte(3000);
          const soll = alt.medien.map(m => m.id);
          const moves = soll.map((id, i) => ({ id, newPosition: String(i) }));
          fehler((await gql(M_ORDER, { id: alt.id, moves })).productReorderMedia, 'Reihenfolge');
        }
        if (fehlendeVar.length) {
          const neu = fehlendeVar.map(x => ({
            optionValues: x.optionen.map(o => ({ optionName: o.name, name: o.value })),
            price: x.preis, compareAtPrice: x.vergleichspreis, inventoryPolicy: x.policy, taxable: x.steuer,
            inventoryItem: { sku: x.sku, tracked: x.verfolgt, ...(x.gewicht ? { measurement: { weight: x.gewicht } } : {}) },
            ...(x.medien[0] ? { mediaId: x.medien[0] } : {}),
          }));
          fehler((await gql(M_VNEU, { p: alt.id, v: neu })).productVariantsBulkCreate, 'Varianten neu');
        }
        await warte(3000);
        const n = await lesen(h);
        const da = fehlendeVar.every(x => n.varianten.some(y => y.sku === x.sku));
        zeile(h, da ? `ZURÜCK: ${fehlendeVar.length} Variante(n) neu angelegt (neue IDs), Bilder angehängt` : 'ZURÜCK WEICHT AB');
        continue;
      }
      const vorhanden = v.varianten.filter(x => snap.varianten.some(y => y.id === x.id));
      const falsch = vorhanden.filter(x => { const y = snap.varianten.find(z => z.id === x.id); return y.titel !== x.titel || y.sku !== x.sku; });
      const medien = v.medien_loesen.filter(m => snap.medien.some(n => n.id === m.id));
      const medienFalsch = medien.filter(m => !snap.medien.find(n => n.id === m.id).url.includes(m.url_teil));
      if (!vorhanden.length && !medien.length) { zeile(h, 'schon im Soll'); bericht.schon++; continue; }
      if (snap.titel !== v.erwartet_titel || falsch.length || medienFalsch.length) {
        zeile(h, `ABBRUCH: Titel «${snap.titel}», abweichende Varianten ${falsch.length}, abweichende Bilder ${medienFalsch.length}`); bericht.abbruch++; continue;
      }
      if (snap.varianten.length - vorhanden.length < 1) { zeile(h, 'ABBRUCH: es bliebe keine Variante'); bericht.abbruch++; continue; }
      // Das Bild nur lösen, wenn danach keine verbleibende Variante es trägt
      const bleibt = snap.varianten.filter(y => !vorhanden.some(x => x.id === y.id));
      const getragen = medien.filter(m => bleibt.some(y => y.medien.includes(m.id)));
      if (getragen.length) { zeile(h, 'ABBRUCH: ein zu lösendes Bild gehört noch einer verbleibenden Variante'); bericht.abbruch++; continue; }
      console.log(`${h}:\n  löschen: ${vorhanden.map(x => `«${x.titel}» (${x.sku})`).join(', ')}\n  Bild lösen: ${medien.map(m => m.url_teil).join(', ') || 'keines'}`
        + `\n  Varianten ${snap.varianten.length} → ${bleibt.length}, Bilder ${snap.medien.length} → ${snap.medien.length - medien.length}`);
      if (!LIVE) continue;
      sichern(h, snap);
      if (vorhanden.length) fehler((await gql(M_VDEL, { p: snap.id, v: vorhanden.map(x => x.id) })).productVariantsBulkDelete, 'Varianten löschen');
      if (medien.length) fehler((await gql(M_FILE, { f: medien.map(m => ({ id: m.id, referencesToRemove: [snap.id] })) })).fileUpdate, 'Bild lösen');
      let n = await lesen(h);
      const ok = x => !x.varianten.some(y => v.varianten.some(z => z.id === y.id)) && !x.medien.some(y => v.medien_loesen.some(z => z.id === y.id))
        && x.varianten.length === bleibt.length;
      for (let i = 0; i < 5 && !ok(n); i++) { await warte(3000); n = await lesen(h); }
      if (ok(n)) { zeile(h, `GLEICH (Varianten ${n.varianten.length}, Bilder ${n.medien.length})`); bericht.ok++; }
      else { zeile(h, `WEICHT AB: Varianten ${n.varianten.length}, Bilder ${n.medien.length}`); bericht.fehler++; }
    } catch (e) { zeile(h, 'FEHLER ' + e.message); bericht.fehler++; }
  }
}

// ---------- 5: Entwurf ----------
async function entwurf() {
  const tag = plan.tag_entwurf;
  for (const e of plan.entwurf) {
    const h = e.handle;
    try {
      const snap = await lesen(h);
      if (ZURUECK) {
        const alt = sicherung(h);
        if (!LIVE) { zeile(h, `ZURÜCK würde Status ${alt.status} setzen und den Tag entfernen`); continue; }
        fehler((await gql(M_PROD, { p: { id: alt.id, status: alt.status } })).productUpdate, 'Status zurück');
        if (!alt.tags.includes(tag)) fehler((await gql(M_TAG_DEL, { id: alt.id, t: [tag] })).tagsRemove, 'Tag entfernen');
        const n = await lesen(h);
        zeile(h, n.status === alt.status && !n.tags.includes(tag) ? 'ZURÜCK GLEICH' : 'ZURÜCK WEICHT AB');
        continue;
      }
      if (snap.status === 'DRAFT' && snap.tags.includes(tag)) { zeile(h, 'schon im Soll'); bericht.schon++; continue; }
      if (snap.titel !== e.erwartet_titel || snap.status !== e.erwartet_status) {
        zeile(h, `ABBRUCH: Titel «${snap.titel}», Status ${snap.status}`); bericht.abbruch++; continue;
      }
      console.log(`${h}: Status ${snap.status} → DRAFT, Tag ${tag}`);
      if (!LIVE) continue;
      sichern(h, snap);
      fehler((await gql(M_PROD, { p: { id: snap.id, status: 'DRAFT' } })).productUpdate, 'Status');
      fehler((await gql(M_TAG_ADD, { id: snap.id, t: [tag] })).tagsAdd, 'Tag');
      let n = await lesen(h);
      for (let i = 0; i < 5 && !(n.status === 'DRAFT' && n.tags.includes(tag)); i++) { await warte(3000); n = await lesen(h); }
      if (n.status === 'DRAFT' && n.tags.includes(tag)) { zeile(h, 'GLEICH (DRAFT, Tag gesetzt)'); bericht.ok++; }
      else { zeile(h, `WEICHT AB: Status ${n.status}`); bericht.fehler++; }
    } catch (x) { zeile(h, 'FEHLER ' + x.message); bericht.fehler++; }
  }
}

// ---------- Folge von 1: Kategorie (Tag der Sammlung, Shopify-Kategorie, Google-Kategorie) ----------
const QK = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id title tags category{ id }
  mf: metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } } }`;
const M_MF = `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ id } userErrors{ field message } } }`;
async function kategorie() {
  for (const k of plan.kategorie || []) {
    const h = k.handle;
    try {
      const lies = async () => (await gql(QK, { h })).productByIdentifier;
      const p = await lies();
      const im = (x, kat, goo, tagDa, tagWeg) => x.category?.id === kat && x.mf?.value === goo && x.tags.includes(tagDa) && !x.tags.includes(tagWeg);
      const [kat, goo, tagDa, tagWeg] = ZURUECK ? [k.kategorie_alt, k.google_alt, k.tag_weg, k.tag_neu] : [k.kategorie_neu, k.google_neu, k.tag_neu, k.tag_weg];
      if (im(p, kat, goo, tagDa, tagWeg)) { zeile(h, 'Kategorie schon im Soll'); bericht.schon++; continue; }
      if (!ZURUECK && !(p.category?.id === k.kategorie_alt && p.mf?.value === k.google_alt && p.tags.includes(k.tag_weg))) {
        zeile(h, `ABBRUCH Kategorie: ist ${p.category?.id} / «${p.mf?.value}»`); bericht.abbruch++; continue;
      }
      console.log(`${h}: Kategorie ${p.category?.id} → ${kat}, Google → «${goo}», Tag ${tagWeg} → ${tagDa}`);
      if (!LIVE) continue;
      fehler((await gql(M_PROD, { p: { id: p.id, category: kat } })).productUpdate, 'Kategorie');
      fehler((await gql(M_MF, { m: [{ ownerId: p.id, namespace: 'mm-google-shopping', key: 'google_product_category', type: 'single_line_text_field', value: goo }] })).metafieldsSet, 'Google-Kategorie');
      fehler((await gql(M_TAG_ADD, { id: p.id, t: [tagDa] })).tagsAdd, 'Tag');
      fehler((await gql(M_TAG_DEL, { id: p.id, t: [tagWeg] })).tagsRemove, 'Tag weg');
      let n = await lies();
      for (let i = 0; i < 5 && !im(n, kat, goo, tagDa, tagWeg); i++) { await warte(3000); n = await lies(); }
      if (im(n, kat, goo, tagDa, tagWeg)) { zeile(h, 'Kategorie GLEICH'); bericht.ok++; }
      else { zeile(h, `Kategorie WEICHT AB: ${n.category?.id} / «${n.mf?.value}»`); bericht.fehler++; }
    } catch (x) { zeile(h, 'FEHLER Kategorie ' + x.message); bericht.fehler++; }
  }
}

console.log(`Modus: ${ZURUECK ? 'ZURÜCK' : 'VOR'} · ${LIVE ? 'LIVE' : 'TROCKENLAUF'} · ${new Date().toISOString()}`);
await texte();
await kategorie();
await varianten();
await entwurf();
console.log(`\nErgebnis: ok ${bericht.ok} · schon im Soll ${bericht.schon} · ABBRUCH ${bericht.abbruch} · FEHLER ${bericht.fehler}`);
process.exit(bericht.fehler ? 1 : bericht.abbruch ? 3 : 0);
