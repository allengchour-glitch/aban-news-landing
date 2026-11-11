#!/usr/bin/env node
/**
 * Google-Korrekturpläne für LuxeStyle-Produkte einspielen (11.11.2026). TROCKENLAUF IST DIE VORGABE.
 *
 * Eingabe: PLAENE (JSON {plans:{<handle>:Plan}, urteile:{...}}), je Plan:
 *   handle, machbar, hauptbild (lokale Datei aus neue_bilder ODER eine media_id, die bleibt),
 *   medien_loesen[{media_id,url,grund}], neue_bilder[{datei,aus_media_id?,alt,varianten_ids[],position,breite,hoehe}],
 *   titel_neu?, optionen[{option,alt,neu}], html_paare[{alt,neu,treffer}], metafelder[{namespace,key,typ,alt,neu}], offen[].
 *   «position» ist die Endstelle in der Galerie. Freie Stellen füllen die bleibenden alten Medien in alter Reihenfolge.
 *   metafelder global.title_tag / global.description_tag gehen als productUpdate seo{title description}.
 *   metafeld mit neu "" heisst: Metafeld löschen (metafieldsDelete), nicht leer schreiben.
 *
 * html_paare: verglichen wird WÖRTLICH gegen descriptionHtml, so wie die Admin-API es liefert (kein Ent- oder Maskieren).
 *   Shopify liefert Text-Zeichen wie «<» in der Beschreibung als «&lt;». Ein Paar mit «&lt;» trifft also genau diese Stelle.
 *   Trifft ein Paar 0-mal, sucht das Werkzeug die Schreibweisen mit «<»/«&lt;» vertauscht und nennt sie als Hinweis.
 *   Angewendet wird nie eine andere Schreibweise. Jedes alt muss im Ausgangstext UND nach den vorigen Paaren genau 1-mal vorkommen.
 *
 * Schalter:  (nichts)            Trockenlauf: liest den Shop, prüft, zeigt je Produkt alle Schritte, schreibt nichts
 *            LIVE=1 NUR=<h,...>   schreibt (NUR ist Pflicht)
 *            ZURUECK=1            zeigt die Rücknahme
 *            ZURUECK=1 LIVE=1 NUR=<h,...>  nimmt aus der Sicherung zurück
 *            PLAENE= SICHERUNG= LEDGER= (Vorgaben unten) · GK_ZEIT=<Faktor> für alle Wartezeiten · SHOPIFY_API (Vorgabe 2026-10)
 *
 * Reihenfolge LIVE: Sicherung → neue Bilder (stagedUploadsCreate, productUpdate media, READY abwarten) → Varianten neu binden
 *   (detach + append) → Titel/Beschreibung/SEO (productUpdate) → Optionswerte (productOptionUpdate) → Metafelder
 *   (metafieldsSet/metafieldsDelete) → alte Medien lösen (fileUpdate referencesToRemove, Datei bleibt) → Reihenfolge
 *   (productReorderMedia, Hintergrundauftrag, bis 60 s nachlesen) → alles frisch zurücklesen.
 * Kein Schritt wird blind wiederholt. Ein Fehler oder eine verlorene Antwort wird durch frisches Lesen geklärt. Beim Hochladen
 *   steht vor productUpdate ein Eintrag «ausstehend» mit den Medien davor in der Sicherung. Danach wird das neue Bild über
 *   Alt-Text + Vorher/Nachher erkannt, nie ein zweites Mal hochgeladen.
 *
 * Exit: 0 ok · 1 unerwartet · 2 Aufruf/Plan unbrauchbar · 3 Vorprüfung blockiert (Produkt nicht angefasst) · 4 Abbruch beim
 *   Schreiben (Zustand teilweise, nächster Lauf erkennt ihn) · 5 Abweichung beim Rücklesen · 6 Rücknahme fehlgeschlagen
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync, renameSync, mkdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, basename } from 'node:path';

export const VORGABE = Object.freeze({
  plaene: '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/gmc1111/korr/alle_plaene.json',
  sicherung: '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/gkorr_werkzeug/sicherung.json',
  ledger: '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/gkorr_werkzeug/ledger.txt',
});
export const EXIT = Object.freeze({ OK: 0, UNERWARTET: 1, AUFRUF: 2, BLOCKIERT: 3, ABBRUCH: 4, ABWEICHUNG: 5, ZURUECK: 6 });
export const MIN_PX = 700, MIN_BILDER = 3, MAX_BYTES = 20 * 1024 * 1024;
const SEO_FELD = { title_tag: 'title', description_tag: 'description' };

export class Abbruch extends Error { constructor(code, msg) { super(msg); this.code = code; } }

// ── GraphQL (Operationsnamen GkXxx: die Attrappe im Test erkennt sie daran) ─────────────────────────────
export const Q = Object.freeze({
  LESEN: `query GkLesen($h:String!){ productByIdentifier(identifier:{handle:$h}){
  id handle title status vendor productType tags descriptionHtml
  seo{ title description }
  featuredMedia{ id }
  options{ id name optionValues{ id name } }
  variants(first:100){ pageInfo{ hasNextPage } nodes{ id sku price media(first:3){ nodes{ id } } } }
  media(first:100){ pageInfo{ hasNextPage } nodes{ id alt mediaContentType status ... on MediaImage{ image{ url width height } } } } } }`,
  DATEIEN: `query GkDateien($i:[ID!]!){ nodes(ids:$i){ id ... on MediaImage{ fileStatus } ... on Video{ fileStatus } } }`,
  STAGED: `mutation GkStaged($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`,
  MEDIEN_NEU: `mutation GkMedienNeu($p:ProductUpdateInput!,$m:[CreateMediaInput!]){ productUpdate(product:$p, media:$m){ product{ id } userErrors{ field message } } }`,
  PRODUKT: `mutation GkProdukt($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`,
  OPTION: `mutation GkOption($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$p, option:$o, optionValuesToUpdate:$v, variantStrategy:LEAVE_AS_IS){ product{ id } userErrors{ field message code } } }`,
  META_SETZEN: `mutation GkMetaSetzen($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ namespace key } userErrors{ field message code } } }`,
  META_LOESCHEN: `mutation GkMetaLoeschen($m:[MetafieldIdentifierInput!]!){ metafieldsDelete(metafields:$m){ deletedMetafields{ namespace key } userErrors{ field message } } }`,
  VAR_LOESEN: `mutation GkVarLoesen($p:ID!,$vm:[ProductVariantDetachMediaInput!]!){ productVariantDetachMedia(productId:$p, variantMedia:$vm){ userErrors{ field message code } } }`,
  VAR_HAENGEN: `mutation GkVarHaengen($p:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$vm){ userErrors{ field message code } } }`,
  DATEI_REF: `mutation GkDateiRef($f:[FileUpdateInput!]!){ fileUpdate(files:$f){ files{ id } userErrors{ field message code } } }`,
  ORDNEN: `mutation GkOrdnen($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{ id done } mediaUserErrors{ field message code } } }`,
});
/** Metafelder einzeln über Variablen lesen (kein Text in die Abfrage einsetzen). */
export function metaAbfrage(n) {
  const v = Array.from({ length: n }, (_, i) => `,$n${i}:String!,$k${i}:String!`).join('');
  const f = Array.from({ length: n }, (_, i) => ` m${i}: metafield(namespace:$n${i}, key:$k${i}){ id type value }`).join('');
  return `query GkMeta($id:ID!${v}){ product(id:$id){ id${f} } }`;
}
export const istMutation = (q) => /^\s*mutation\b/.test(String(q));
/** Harte Sperre: ohne LIVE geht keine Mutation durch (vor jedem Netzaufruf). */
export function schreibSperre(live, gql) {
  return async (q, v) => {
    if (istMutation(q) && !live) throw new Error('Trockenlauf: Schreibzugriff verweigert');
    return gql(q, v);
  };
}

// ── reine Bausteine ─────────────────────────────────────────────────────────────────────────────
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
export const kurzId = (id) => String(id ?? '').split('/').pop();
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Vorkommen zählen, auch überlappende («ab ab» kommt in «ab ab ab» 2× vor): sonst wäre «genau 1» nicht eindeutig. */
export const zaehle = (h, t) => {
  if (!t) return 0;
  const s = String(h ?? '');
  let n = 0;
  for (let i = s.indexOf(t); i >= 0; i = s.indexOf(t, i + 1)) n++;
  return n;
};
const kurz = (s, n = 60) => { const t = String(s ?? '').replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const mids = (v) => (v?.media?.nodes || []).map((m) => m.id);
const medienIds = (p) => (p?.media?.nodes || []).map((m) => m.id);
const ue = (pl, feld = 'userErrors') => (!pl ? 'leere Antwort' : (pl[feld] || []).length ? JSON.stringify(pl[feld]).slice(0, 300) : null);
const norm = (v) => (v == null ? '' : String(v));
/** Dateiname für den Upload (so steht er danach auch in der CDN-Adresse, ggf. mit Zusatz). */
export const dateinameFuer = (pfad) => basename(String(pfad)).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
const urlBasis = (u) => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop()).toLowerCase(); } catch { return ''; } };

/** Breite/Höhe aus dem Dateiinhalt (JPEG-SOF oder PNG-IHDR), nicht aus der Endung. */
export function bildMasse(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { typ: 'png', mime: 'image/png', breite: buf.readUInt32BE(16), hoehe: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 8 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }
      if (m === 0xd9 || m === 0xda) return null;
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { typ: 'jpeg', mime: 'image/jpeg', hoehe: buf.readUInt16BE(i + 5), breite: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

const maskieren = (s) => s.replace(/&(?!lt;|gt;|amp;|quot;|#)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entmaskieren = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
/** Nur Text-Zeichen maskieren: «<», das keinen Tag öffnet, «>» nach Leerraum, «&», das keine Entität ist. */
const textMaskieren = (s) => s.replace(/&(?!lt;|gt;|amp;|quot;|#)/g, '&amp;').replace(/<(?![A-Za-z/!])/g, '&lt;').replace(/(?<=\s)>/g, '&gt;');

/** html_paare der Reihe nach auf den Ausgangstext anwenden. Jedes alt: genau 1× im Ausgangstext und genau 1× im Zwischenstand. */
export function beschreibungAnwenden(orig, paare) {
  const o = String(orig ?? '');
  let h = o;
  const fehler = [];
  (paare || []).forEach((pr, i) => {
    const alt = String(pr?.alt ?? ''), neu = String(pr?.neu ?? '');
    if (!alt) { fehler.push(`Paar ${i + 1}: «alt» ist leer`); return; }
    const nO = zaehle(o, alt), nH = zaehle(h, alt);
    if (nO !== 1 || nH !== 1) {
      let hinweis = '';
      if (nO === 0) {
        const anders = [textMaskieren(alt), entmaskieren(alt), maskieren(alt)]
          .filter((x) => x !== alt).map((x) => [x, zaehle(o, x)]).filter(([, n]) => n > 0);
        if (anders.length) hinweis = `; in anderer Schreibweise ${anders[0][1]}× vorhanden («${kurz(anders[0][0], 50)}»), verglichen wird nur wörtlich`;
      }
      fehler.push(`Paar ${i + 1} «${kurz(alt, 50)}»: ${nO}× in der Beschreibung${nH !== nO ? `, nach den vorigen Paaren ${nH}×` : ''} (verlangt genau 1×)${hinweis}`);
      return;
    }
    h = h.replace(alt, () => neu);
  });
  return { html: h, fehler };
}

/** SEO-Feld vergleichen. Shopify speichert einen SEO-Titel gleich dem Produkttitel (und eine leere Beschreibung) als null. */
export function seoGleich(ist, soll, titel) {
  return norm(ist) === norm(soll) || (ist == null && titel != null && norm(soll) === norm(titel));
}

/** Endreihenfolge: Hauptbild (alt) an 0, neue Bilder an ihre position, freie Stellen mit «rest» in alter Reihenfolge. */
export function zielReihe({ rest, hauptbildAlt = null, neue }) {
  const n = rest.length + neue.length + (hauptbildAlt ? 1 : 0);
  const slots = new Array(n).fill(null);
  if (hauptbildAlt) slots[0] = hauptbildAlt;
  for (const e of neue) {
    if (!Number.isInteger(e.position) || e.position < 0 || e.position >= n || slots[e.position] !== null) throw new Error(`position ${e.position} ungültig oder doppelt`);
    slots[e.position] = e.id;
  }
  let k = 0;
  for (let i = 0; i < n; i++) if (slots[i] === null) slots[i] = rest[k++];
  return slots;
}

const PLAN_FELDER = new Set(['handle', 'machbar', 'grund_falls_nicht', 'hauptbild', 'kontaktbogen', 'medien_loesen', 'neue_bilder', 'html_paare', 'titel_neu', 'optionen', 'metafelder', 'offen']);
const GID = (t) => new RegExp(`^gid://shopify/(${t})/\\d+$`);
const GID_MEDIUM = GID('MediaImage|Video|ExternalVideo|Model3d'), GID_VAR = GID('ProductVariant');
const NAME = /^[A-Za-z0-9_.-]+$/;

/** Form eines Plans prüfen (ohne Shop). Liefert Fehlerliste. */
export function planPruefen(handle, p) {
  const F = [];
  if (!p || typeof p !== 'object') return ['Plan fehlt'];
  if (p.handle !== handle) F.push(`handle «${p.handle}» ≠ Schlüssel «${handle}»`);
  for (const k of Object.keys(p)) if (!PLAN_FELDER.has(k)) F.push(`unbekanntes Feld «${k}»`);
  if (typeof p.machbar !== 'boolean') F.push('machbar muss true/false sein');
  if (p.machbar === false) return F;
  const liste = (k) => { if (p[k] === undefined) return []; if (!Array.isArray(p[k])) { F.push(`${k} muss eine Liste sein`); return []; } return p[k]; };
  const loesen = liste('medien_loesen'), neue = liste('neue_bilder'), paare = liste('html_paare'), opt = liste('optionen'), meta = liste('metafelder');
  liste('offen');
  const lIds = loesen.map((x) => x?.media_id);
  for (const id of lIds) if (!GID_MEDIUM.test(String(id))) F.push(`medien_loesen: «${id}» ist keine Medien-ID`);
  if (new Set(lIds).size !== lIds.length) F.push('medien_loesen: eine media_id steht doppelt');
  const pos = [], dateien = [], alts = [], varianten = [];
  for (const e of neue) {
    const n = basename(String(e?.datei ?? '?'));
    if (typeof e?.datei !== 'string' || !e.datei.startsWith('/')) F.push(`neue_bilder: datei «${e?.datei}» muss ein absoluter Pfad sein`);
    if (typeof e?.alt !== 'string' || !e.alt.trim()) F.push(`neue_bilder ${n}: alt fehlt`);
    if (!Number.isInteger(e?.position) || e.position < 0) F.push(`neue_bilder ${n}: position muss eine ganze Zahl ab 0 sein`);
    if (!Number.isInteger(e?.breite) || !Number.isInteger(e?.hoehe)) F.push(`neue_bilder ${n}: breite/hoehe fehlen`);
    if (e?.aus_media_id !== undefined && !GID_MEDIUM.test(String(e.aus_media_id))) F.push(`neue_bilder ${n}: aus_media_id ist keine Medien-ID`);
    if (!Array.isArray(e?.varianten_ids)) F.push(`neue_bilder ${n}: varianten_ids muss eine Liste sein`);
    else for (const v of e.varianten_ids) { if (!GID_VAR.test(String(v))) F.push(`neue_bilder ${n}: «${v}» ist keine Varianten-ID`); varianten.push(v); }
    pos.push(e?.position); dateien.push(e?.datei); alts.push(e?.alt);
  }
  if (new Set(pos).size !== pos.length) F.push('neue_bilder: eine position steht doppelt');
  if (new Set(dateien).size !== dateien.length) F.push('neue_bilder: eine datei steht doppelt');
  if (new Set(alts).size !== alts.length) F.push('neue_bilder: ein alt steht doppelt (das neue Bild wird über den Alt-Text erkannt)');
  if (new Set(varianten).size !== varianten.length) F.push('neue_bilder: eine Variante steht bei zwei Bildern');
  const hb = p.hauptbild;
  if (typeof hb !== 'string' || !hb) F.push('hauptbild fehlt');
  else if (hb.startsWith('/')) {
    const e = neue.find((x) => x?.datei === hb);
    if (!e) F.push('hauptbild ist eine lokale Datei, die nicht in neue_bilder steht');
    else if (e.position !== 0) F.push('hauptbild (neues Bild) muss position 0 haben');
  } else {
    if (!GID('MediaImage').test(hb)) F.push(`hauptbild «${hb}» ist weder lokale Datei noch MediaImage-ID`);
    if (lIds.includes(hb)) F.push('hauptbild steht auch in medien_loesen');
    if (neue.some((x) => x?.position === 0)) F.push('hauptbild bleibt alt, aber ein neues Bild hat position 0');
  }
  if (p.titel_neu !== undefined && (typeof p.titel_neu !== 'string' || !p.titel_neu.trim())) F.push('titel_neu ist leer');
  paare.forEach((x, i) => {
    if (typeof x?.alt !== 'string' || !x.alt) F.push(`html_paare ${i + 1}: alt fehlt`);
    if (typeof x?.neu !== 'string') F.push(`html_paare ${i + 1}: neu fehlt`);
    if (x?.treffer !== undefined && x.treffer !== 1) F.push(`html_paare ${i + 1}: treffer ${x.treffer}; das Werkzeug verlangt genau 1`);
    if (x?.alt === x?.neu) F.push(`html_paare ${i + 1}: alt = neu`);
  });
  const oSchl = new Set(), oNeu = new Set();
  for (const x of opt) {
    if (![x?.option, x?.alt, x?.neu].every((s) => typeof s === 'string' && s.trim())) { F.push('optionen: option/alt/neu fehlt'); continue; }
    if (x.alt === x.neu) F.push(`optionen «${x.alt}»: alt = neu`);
    const a = `${x.option}\u0000${x.alt}`, b = `${x.option}\u0000${x.neu}`;
    if (oSchl.has(a)) F.push(`optionen «${x.alt}» doppelt`); if (oNeu.has(b)) F.push(`optionen: neuer Wert «${x.neu}» doppelt`);
    oSchl.add(a); oNeu.add(b);
  }
  const mSchl = new Set();
  for (const x of meta) {
    if (!NAME.test(String(x?.namespace)) || !NAME.test(String(x?.key))) { F.push(`metafelder: namespace/key «${x?.namespace}.${x?.key}» ungültig`); continue; }
    if (typeof x.typ !== 'string' || !NAME.test(x.typ)) F.push(`metafelder ${x.namespace}.${x.key}: typ fehlt`);
    if (typeof x.alt !== 'string' || typeof x.neu !== 'string') F.push(`metafelder ${x.namespace}.${x.key}: alt/neu müssen Texte sein`);
    if (x.alt === x.neu) F.push(`metafelder ${x.namespace}.${x.key}: alt = neu`);
    if (x.namespace === 'global' && !SEO_FELD[x.key]) F.push(`metafelder global.${x.key}: nur title_tag und description_tag werden unterstützt`);
    const k = `${x.namespace}.${x.key}`;
    if (mSchl.has(k)) F.push(`metafelder ${k} doppelt`); mSchl.add(k);
  }
  return F;
}

const istSeo = (m) => m.namespace === 'global' && SEO_FELD[m.key];
const kern = (p) => JSON.stringify({
  handle: p.handle, status: p.status, vendor: p.vendor, productType: p.productType, tags: [...(p.tags || [])].sort(),
  varianten: p.variants.nodes.map((v) => [v.id, v.sku, v.price]).sort(),
  optionen: p.options.map((o) => [o.id, o.name, o.optionValues.map((v) => v.id)]),
});

/**
 * Zustand eines Produkts gegen den Plan auswerten (rein, liest nur lokale Bilddateien).
 * p = frisch gelesenes Produkt, metaIst = {«ns.key»: {type,value}|null}, s = Sicherung dieses Produkts oder null,
 * dateiDa = {mediaId: true} für Journal-Bilder, die nicht am Produkt hängen, aber als Datei noch existieren.
 */
export function analysiere({ p, metaIst, plan, s, dateiDa = {} }) {
  const F = [];
  const nachId = new Map(p.media.nodes.map((m) => [m.id, m]));
  const istIds = medienIds(p);
  if (p.media.pageInfo?.hasNextPage) F.push('mehr als 100 Medien: nicht unterstützt');
  if (p.variants.pageInfo?.hasNextPage) F.push('mehr als 100 Varianten: nicht unterstützt');
  if (s && s.produkt?.id !== p.id) F.push('Sicherung gehört zu einem anderen Produkt');
  const origMedien = s ? s.medien : p.media.nodes.map((m, i) => ({ id: m.id, position: i, alt: m.alt ?? '', typ: m.mediaContentType }));
  const origIds = origMedien.map((m) => m.id);
  const typVon = new Map(origMedien.map((m) => [m.id, m.typ]));
  const journal = s?.bilder || {};
  const loesen = (plan.medien_loesen || []).map((x) => x.media_id), loesenSet = new Set(loesen);

  // Journal: ein «ausstehender» Upload (Antwort verloren) wird durch Vorher/Nachher + Alt-Text geklärt, nie neu hochgeladen
  const bekannt = new Set(Object.values(journal).filter((j) => j.neu).map((j) => j.neu));
  const uebernahme = {};
  for (const [datei, j] of Object.entries(journal)) {
    if (j.status !== 'ausstehend') continue;
    const kand = p.media.nodes.filter((m) => !(j.vorher || []).includes(m.id) && !origIds.includes(m.id) && !bekannt.has(m.id) && (m.alt || '') === (j.alt || ''));
    if (kand.length === 1) { uebernahme[datei] = kand[0].id; bekannt.add(kand[0].id); }
    else F.push(`Hochladen von ${basename(datei)} wurde ${j.zeit} begonnen, Ergebnis unklar: ${kand.length} passende neue Bilder (erwartet 1). Im Admin prüfen; ist das Bild nicht da, den Eintrag bilder["${datei}"] in der Sicherung löschen. Kein zweiter Upload.`);
  }
  // Bilder, die dieses Werkzeug für eine frühere Fassung des Plans angelegt hat und die noch am Produkt hängen
  const planDateien = new Set((plan.neue_bilder || []).map((e) => e.datei));
  for (const [datei, j] of Object.entries(journal)) {
    const id = j.neu || uebernahme[datei];
    if (!planDateien.has(datei) && id && istIds.includes(id)) F.push(`Bild ${basename(datei)} (${kurzId(id)}) aus einer früheren Fassung des Plans hängt am Produkt, steht aber nicht mehr im Plan: zuerst zurücknehmen (ZURUECK=1 LIVE=1 NUR=${p.handle})`);
  }
  const fremd = istIds.filter((id) => !origIds.includes(id) && !bekannt.has(id));
  if (fremd.length) F.push(`unbekannte Medien am Produkt (nicht in der Sicherung, nicht von diesem Werkzeug): ${fremd.map(kurzId).join(', ')}`);

  for (const id of loesen) if (!origIds.includes(id)) F.push(`media_id ${kurzId(id)} (medien_loesen) gibt es am Produkt nicht`);
  for (const e of plan.neue_bilder || []) if (e.aus_media_id && !origIds.includes(e.aus_media_id)) F.push(`aus_media_id ${kurzId(e.aus_media_id)} (${basename(e.datei)}) gibt es am Produkt nicht`);
  const behalten = origIds.filter((id) => !loesenSet.has(id));
  for (const id of behalten) if (!istIds.includes(id)) F.push(`Medium ${kurzId(id)} soll bleiben, fehlt aber am Produkt`);
  const loesenJetzt = loesen.filter((id) => istIds.includes(id));

  const neue = [...(plan.neue_bilder || [])].sort((a, b) => a.position - b.position);
  const hbNeu = neue.find((e) => e.datei === plan.hauptbild) || null;
  const hbAlt = hbNeu ? null : plan.hauptbild;
  if (hbAlt && !origIds.includes(hbAlt)) F.push(`hauptbild ${kurzId(hbAlt)} gibt es am Produkt nicht`);

  // neue Bilder: lokale Datei prüfen, Zustand aus dem Journal
  const bilder = neue.map((e) => {
    const name = basename(e.datei);
    const b = { e, name, zustand: 'hochladen', id: null, masse: null, sha256: null, bytes: 0 };
    let buf = null;
    try { buf = readFileSync(e.datei); } catch { F.push(`${name}: Datei fehlt oder ist nicht lesbar`); }
    if (buf) {
      b.bytes = buf.length; b.sha256 = sha256(buf); b.masse = bildMasse(buf);
      if (!b.masse) F.push(`${name}: weder JPEG noch PNG (Inhalt geprüft, nicht die Endung)`);
      else {
        const { breite: w, hoehe: h } = b.masse;
        if (w !== h) F.push(`${name}: nicht quadratisch (${w}×${h})`);
        if (Math.min(w, h) < MIN_PX) F.push(`${name}: ${w}×${h}, kleiner als ${MIN_PX} px`);
        if (w !== e.breite || h !== e.hoehe) F.push(`${name}: ist ${w}×${h}, der Plan sagt ${e.breite}×${e.hoehe}`);
      }
      if (buf.length > MAX_BYTES) F.push(`${name}: grösser als 20 MB`);
    }
    if (!s) {
      // Ohne Sicherung darf kein Bild dieses Plans schon am Produkt hängen (Sicherung verloren oder anderer SICHERUNG-Pfad nach einem Teil-Lauf)
      const stamm = dateinameFuer(e.datei).replace(/\.[a-z0-9]+$/, '');
      const da = p.media.nodes.filter((m) => (m.alt || '') === e.alt && (!m.image?.url || urlBasis(m.image.url).startsWith(stamm)));
      if (da.length) F.push(`${name}: ein Bild mit diesem Alt-Text und Dateinamen ist schon am Produkt (${da.map((m) => kurzId(m.id)).join(', ')}), aber keine Sicherung für dieses Produkt. Kein zweiter Upload: die Sicherung wiederherstellen (SICHERUNG=…) oder das Bild im Admin prüfen`);
    }
    const j = journal[e.datei];
    if (uebernahme[e.datei]) { b.zustand = 'uebernehmen'; b.id = uebernahme[e.datei]; }
    else if (j?.status === 'ausstehend') b.zustand = 'unklar';
    else if (j?.neu && (j.status === 'fertig' || j.status === 'zurueckgenommen')) {
      if (istIds.includes(j.neu)) { b.zustand = 'da'; b.id = j.neu; }
      else if (dateiDa[j.neu]) { b.zustand = 'anhaengen'; b.id = j.neu; }
    }
    if (b.id && j?.sha256 && b.sha256 && j.sha256 !== b.sha256) F.push(`${name}: lokale Datei hat sich seit dem Hochladen geändert (sha256)`);
    if (b.id && nachId.has(b.id) && (nachId.get(b.id).alt || '') !== e.alt) F.push(`${name}: Medium ${kurzId(b.id)} trägt den Alt-Text «${nachId.get(b.id).alt}» statt «${e.alt}»`);
    return b;
  });

  const rest = behalten.filter((id) => id !== hbAlt);
  const anzahl = rest.length + neue.length + (hbAlt ? 1 : 0);
  for (const e of neue) if (e.position >= anzahl) F.push(`${basename(e.datei)}: position ${e.position} liegt hinter dem Ende (danach ${anzahl} Medien)`);
  const bilderDanach = behalten.filter((id) => typVon.get(id) === 'IMAGE').length + neue.length;
  if (bilderDanach < MIN_BILDER) F.push(`danach nur ${bilderDanach} Bilder (verlangt mindestens ${MIN_BILDER})`);

  // Varianten: nach dem Plan hat jede Variante ein Bild, das nicht gelöst wird
  const ziel = new Map();
  for (const b of bilder) for (const vid of b.e.varianten_ids || []) ziel.set(vid, b);
  const istVar = new Map(p.variants.nodes.map((v) => [v.id, v]));
  for (const vid of ziel.keys()) if (!istVar.has(vid)) F.push(`Variante ${kurzId(vid)} gibt es am Produkt nicht`);
  if (s && !gleich(s.varianten.map((v) => v.id).sort(), [...istVar.keys()].sort())) F.push('die Varianten haben sich seit der Sicherung verändert');
  const origBind = (vid) => (s ? s.varianten.find((v) => v.id === vid)?.media || [] : mids(istVar.get(vid)));
  const binden = [], varSoll = new Map();
  for (const v of p.variants.nodes) {
    const cur = mids(v), orig = origBind(v.id), b = ziel.get(v.id), wer = v.sku || kurzId(v.id);
    if (b) {
      varSoll.set(v.id, { bild: b });
      if (b.id && gleich(cur, [b.id])) continue;
      if (cur.length === 0 || gleich(cur, orig)) binden.push({ vid: v.id, wer, von: cur, b });
      else F.push(`Variante ${wer} hängt an ${cur.map(kurzId).join(',')} (erwartet ${orig.map(kurzId).join(',') || 'kein Bild'} oder das neue Bild)`);
    } else {
      varSoll.set(v.id, { ids: orig });
      if (!gleich(cur, orig)) F.push(`Variante ${wer} hat sich seit der Sicherung verändert (${cur.map(kurzId).join(',') || 'kein Bild'})`);
      else if (!orig.length) F.push(`Variante ${wer} hat kein Bild und bekommt nach dem Plan keines`);
      else for (const id of orig) if (loesenSet.has(id)) F.push(`Variante ${wer}: ihr Bild ${kurzId(id)} wird gelöst, ein neues bekommt sie nicht`);
    }
  }

  // Beschreibung: aus dem Ausgangstext (Sicherung) rechnen, sonst würde ein Paar, dessen neu das alt enthält, doppelt wirken
  const origHtml = s ? s.produkt.descriptionHtml : p.descriptionHtml;
  const ber = { zu: false, soll: p.descriptionHtml, paare: (plan.html_paare || []).length };
  if (ber.paare) {
    const r = beschreibungAnwenden(origHtml, plan.html_paare);
    if (r.fehler.length) F.push(...r.fehler.map((x) => 'Beschreibung: ' + x));
    else {
      ber.soll = r.html;
      if (p.descriptionHtml === r.html) ber.zu = false;
      else if (p.descriptionHtml === origHtml) ber.zu = true;
      else F.push('Beschreibung hat sich seit der Sicherung anders verändert (weder Ausgangstext noch Ziel)');
    }
  }

  const tit = { zu: false, soll: p.title, alt: p.title };
  if (plan.titel_neu) {
    tit.soll = plan.titel_neu; tit.zu = p.title !== plan.titel_neu;
    if (s && tit.zu && p.title !== s.produkt.title) F.push(`Titel «${p.title}» ist weder der gesicherte noch der neue`);
  }

  // SEO (global.title_tag / description_tag) und übrige Metafelder
  const seo = { zu: false, soll: { title: p.seo?.title ?? null, description: p.seo?.description ?? null }, felder: [] };
  const meta = [];
  for (const m of plan.metafelder || []) {
    if (istSeo(m)) {
      const f = SEO_FELD[m.key], ist = p.seo?.[f] ?? null, tAlt = f === 'title' ? p.title : null, tNeu = f === 'title' ? tit.soll : null;
      if (seoGleich(ist, m.alt, tAlt)) { seo.zu = true; seo.soll[f] = m.neu === '' ? null : m.neu; seo.felder.push(`${f}: «${kurz(m.alt)}» → «${kurz(m.neu)}»`); }
      else if (seoGleich(ist, m.neu, tNeu)) { seo.soll[f] = m.neu === '' ? null : m.neu; seo.felder.push(`${f}: schon neu`); }
      else F.push(`SEO ${f} ist «${kurz(ist)}», erwartet «${kurz(m.alt)}» oder «${kurz(m.neu)}»`);
      continue;
    }
    const k = `${m.namespace}.${m.key}`, ist = metaIst[k] ?? null;
    const istAlt = m.alt === '' ? ist === null : ist !== null && ist.value === m.alt && ist.type === m.typ;
    const istNeu = m.neu === '' ? ist === null : ist !== null && ist.value === m.neu && ist.type === m.typ;
    const eintrag = { ...m, k, zu: false, soll: m.neu === '' ? null : m.neu };
    if (istAlt) eintrag.zu = true;
    else if (!istNeu) F.push(`Metafeld ${k} ist ${ist ? `«${kurz(ist.value)}» (Typ ${ist.type})` : 'nicht vorhanden'}, erwartet «${kurz(m.alt)}» oder «${kurz(m.neu)}» (Typ ${m.typ})`);
    meta.push(eintrag);
  }

  // Optionswerte
  const optionen = [], optSoll = [];
  const gruppen = new Map();
  for (const x of plan.optionen || []) { if (!gruppen.has(x.option)) gruppen.set(x.option, []); gruppen.get(x.option).push(x); }
  for (const [name, items] of gruppen) {
    const o = p.options.find((x) => x.name === name);
    if (!o) { F.push(`Option «${name}» gibt es nicht`); continue; }
    const sOpt = s?.optionen?.find((x) => x.id === o.id);
    const upd = [];
    for (const x of items) {
      const vA = o.optionValues.filter((v) => v.name === x.alt), vN = o.optionValues.filter((v) => v.name === x.neu);
      if (vA.length === 1 && !vN.length) { upd.push({ id: vA[0].id, alt: x.alt, neu: x.neu }); optSoll.push({ id: vA[0].id, name: x.neu }); }
      else if (!vA.length && vN.length === 1) {
        if (sOpt && sOpt.werte.find((w) => w.id === vN[0].id)?.name !== x.alt) F.push(`Option ${name}: «${x.neu}» gab es schon vor diesem Werkzeug`);
        optSoll.push({ id: vN[0].id, name: x.neu });
      } else if (vA.length && vN.length) F.push(`Option ${name}: «${x.alt}» und «${x.neu}» gibt es beide (Umbenennen würde doppelt)`);
      else F.push(`Option ${name}: Wert «${x.alt}» gibt es nicht`);
    }
    if (upd.length) optionen.push({ id: o.id, name, upd });
  }

  // Endreihenfolge (Platzhalter für noch unbekannte neue IDs)
  let reihe = null;
  try { reihe = zielReihe({ rest, hauptbildAlt: hbAlt, neue: bilder.map((b) => ({ id: b.id || `neu:${b.e.datei}`, position: b.e.position })) }); } catch (x) { F.push(String(x.message)); }
  const reiheOk = !!reihe && gleich(istIds, reihe);
  const nichts = !F.length && bilder.every((b) => b.zustand === 'da') && !binden.length && !tit.zu && !ber.zu && !seo.zu
    && !optionen.length && !meta.some((m) => m.zu) && !loesenJetzt.length && reiheOk;
  return { F, origIds, behalten, rest, hbAlt, hbNeu, bilder, binden, varSoll, ber, tit, seo, meta, optionen, optSoll, loesen, loesenJetzt, reihe, reiheOk, nichts, kern: kern(p) };
}

// ── der Lauf ─────────────────────────────────────────────────────────────────────────────────────
/**
 * cfg: { plaene, live, zurueck, nur:[handles]|null, sicherung (Pfad), ledger (Pfad) }
 * io:  { gql(query, vars) → data (wirft bei Fehlern), upload(ziel, buf, dateiname, mime), warte(ms), jetzt() → ms, log(text) }
 */
export async function lauf(cfg, io) {
  const log = io.log || console.log;
  const jetztIso = () => new Date(io.jetzt ? io.jetzt() : Date.now()).toISOString();
  if (cfg.live && !(cfg.nur && cfg.nur.length)) { log('ABGELEHNT: LIVE=1 braucht NUR=<handle,...> (kein Massenlauf)'); return { exit: EXIT.AUFRUF }; }
  const gql = schreibSperre(!!cfg.live, io.gql);
  const upload = async (...a) => { if (!cfg.live) throw new Error('Trockenlauf: Hochladen verweigert'); return io.upload(...a); };
  const plans = cfg.plaene?.plans;
  if (!plans || typeof plans !== 'object') { log('PLAENE: Schlüssel «plans» fehlt'); return { exit: EXIT.AUFRUF }; }

  // Sicherung (eine Datei, je Handle ein Eintrag; der erste Stand gilt, nur «bilder» wird nachgeführt)
  const sLesen = () => (existsSync(cfg.sicherung) ? JSON.parse(readFileSync(cfg.sicherung, 'utf8')) : {});
  const sSchreiben = (alle) => {
    mkdirSync(dirname(cfg.sicherung), { recursive: true });
    writeFileSync(cfg.sicherung + '.tmp', JSON.stringify(alle, null, 1));
    renameSync(cfg.sicherung + '.tmp', cfg.sicherung);
  };
  const journal = (handle, datei, felder) => {
    const alle = sLesen();
    if (!alle[handle]) throw new Error('Journal ohne Sicherung');
    alle[handle].bilder = alle[handle].bilder || {};
    alle[handle].bilder[datei] = { ...(alle[handle].bilder[datei] || {}), ...felder };
    sSchreiben(alle);
  };
  const ledger = (handle, art, detail) => {
    if (!cfg.live) return;
    mkdirSync(dirname(cfg.ledger), { recursive: true });
    appendFileSync(cfg.ledger, `${jetztIso()} · ${handle} · ${art} · ${String(detail).replace(/\s+/g, ' ').slice(0, 900)}\n`);
  };

  // Auswahl
  let auswahl;
  if (cfg.zurueck) auswahl = cfg.nur?.length ? cfg.nur : Object.keys(sLesen());
  else auswahl = cfg.nur?.length ? cfg.nur : Object.keys(plans);
  const unbekannt = auswahl.filter((h) => (cfg.zurueck ? false : !plans[h]));
  if (unbekannt.length) { log(`NUR nennt Handles ohne Plan: ${unbekannt.join(', ')}`); return { exit: EXIT.AUFRUF }; }
  if (!cfg.zurueck) {
    let planFehler = 0;
    for (const h of auswahl) { const f = planPruefen(h, plans[h]); if (f.length) { planFehler++; log(`PLAN ${h}: ${f.join(' · ')}`); } }
    if (planFehler) return { exit: EXIT.AUFRUF };
  }

  // Sperre gegen zwei gleichzeitige LIVE-Läufe
  const sperre = cfg.sicherung + '.lock';
  if (cfg.live) {
    try { mkdirSync(dirname(sperre), { recursive: true }); writeFileSync(sperre, `${process.pid} ${jetztIso()}\n`, { flag: 'wx' }); }
    catch { log(`ABGELEHNT: ${sperre} existiert (läuft schon ein LIVE-Lauf? Nach einem Absturz von Hand löschen)`); return { exit: EXIT.AUFRUF }; }
  }
  let exit = EXIT.OK;
  const merke = (c) => { if (c > exit) exit = c; };
  try {
    for (const handle of auswahl) {
      try {
        merke(cfg.zurueck ? await zurueckProdukt(handle) : await vorwaerts(handle, plans[handle]));
      } catch (e) {
        if (e instanceof Abbruch) { log(`  ABBRUCH ${handle}: ${e.message}`); ledger(handle, cfg.zurueck ? 'ZURUECK_ABBRUCH' : 'ABBRUCH', e.message); merke(cfg.zurueck ? EXIT.ZURUECK : e.code); }
        else { log(`  FEHLER ${handle}: ${e?.stack || e}`); ledger(handle, 'FEHLER', e?.message || e); merke(cfg.zurueck ? EXIT.ZURUECK : EXIT.ABBRUCH); }
      }
    }
  } finally { if (cfg.live) { try { unlinkSync(sperre); } catch { /* weg */ } } }
  log(`\nErgebnis: Exit ${exit} (${cfg.zurueck ? 'Rücknahme' : 'Vorwärts'}, ${cfg.live ? 'LIVE' : 'Trockenlauf'})`);
  return { exit };

  // ── Lesen ──
  async function lies(handle) {
    const p = (await gql(Q.LESEN, { h: handle }))?.productByIdentifier;
    if (!p) throw new Abbruch(EXIT.BLOCKIERT, `Produkt ${handle} nicht gefunden`);
    if (p.handle !== handle) throw new Abbruch(EXIT.BLOCKIERT, `Handle ${p.handle} ≠ ${handle}`);
    return p;
  }
  async function liesMeta(pid, liste) {
    const out = {};
    if (!liste.length) return out;
    const vars = { id: pid };
    liste.forEach((m, i) => { vars[`n${i}`] = m.namespace; vars[`k${i}`] = m.key; });
    const pr = (await gql(metaAbfrage(liste.length), vars))?.product;
    if (!pr) throw new Error('Metafelder nicht lesbar');
    liste.forEach((m, i) => { const x = pr[`m${i}`]; out[`${m.namespace}.${m.key}`] = x ? { type: x.type, value: x.value } : null; });
    return out;
  }
  async function dateienDa(ids) {
    const out = {};
    if (!ids.length) return out;
    const n = (await gql(Q.DATEIEN, { i: ids }))?.nodes || [];
    ids.forEach((id, i) => { out[id] = !!n[i]?.id; });
    return out;
  }
  async function warteBis(handle, pruef, { versuche = 6, ms = 4000, erstMs = 1500 } = {}) {
    for (let i = 0; i < versuche; i++) {
      await io.warte(i ? ms : erstMs);
      let q; try { q = await lies(handle); } catch { continue; }
      if (await pruef(q)) return q;
    }
    return null;
  }
  /** Mutation genau einmal senden. Fehler oder verlorene Antwort: frisch lesen; ist der Schritt erledigt, weiter, sonst Abbruch. */
  async function schreibe(name, query, vars, feld, { fehlerFeld = 'userErrors', erledigt = null } = {}) {
    let fehler = null;
    try { fehler = ue((await gql(query, vars))?.[feld], fehlerFeld); } catch (e) { fehler = 'Ausnahme ' + String(e?.message || e).slice(0, 200); }
    if (!fehler) return 'ok';
    if (erledigt) {
      for (let i = 0; i < 3; i++) {
        await io.warte(i ? 4000 : 1500);
        try { if (await erledigt()) { log(`  Hinweis: ${name} meldete «${fehler}», frisch gelesen ist der Schritt erledigt`); return 'ok (frisch gelesen)'; } } catch { /* weiter lesen */ }
      }
    }
    throw new Abbruch(EXIT.ABBRUCH, `${name}: ${fehler}`);
  }

  // ── Vorwärts ──
  async function vorwaerts(handle, plan) {
    log(`\n== ${handle}`);
    if (!plan.machbar) { log(`  nicht machbar laut Plan: ${kurz(plan.grund_falls_nicht || '', 200)} (nicht angefasst)`); ledger(handle, 'NICHT_MACHBAR', plan.grund_falls_nicht || ''); return EXIT.BLOCKIERT; }
    const p = await lies(handle);
    const s0 = sLesen()[handle] || null;
    const planMeta = (plan.metafelder || []).filter((m) => !istSeo(m));
    const metaIst = await liesMeta(p.id, planMeta);
    const jIds = Object.values(s0?.bilder || {}).filter((j) => j.neu && !medienIds(p).includes(j.neu)).map((j) => j.neu);
    const an = analysiere({ p, metaIst, plan, s: s0, dateiDa: await dateienDa(jIds) });
    zeige(p, plan, an);
    if (an.F.length) {
      log(`  VORPRÜFUNG ABGELEHNT (${an.F.length}):`); an.F.forEach((x) => log(`    - ${x}`));
      ledger(handle, 'ABGELEHNT', an.F.join(' | '));
      return EXIT.BLOCKIERT;
    }
    log('  Vorprüfung: bestanden');
    if (an.nichts) { log('  Alles schon im Soll. Nichts zu tun.'); ledger(handle, 'SCHON_IM_SOLL', 'nichts geschrieben'); return EXIT.OK; }
    if (!cfg.live) { log('  Trockenlauf: nichts geschrieben.'); return EXIT.OK; }

    // 0) Sicherung vor dem ersten Schreiben
    if (!s0) {
      const alle = sLesen();
      alle[handle] = {
        gesichert: jetztIso(),
        produkt: { id: p.id, handle: p.handle, title: p.title, descriptionHtml: p.descriptionHtml, seo: { title: p.seo?.title ?? null, description: p.seo?.description ?? null }, featuredMedia: p.featuredMedia?.id ?? null },
        optionen: p.options.map((o) => ({ id: o.id, name: o.name, werte: o.optionValues.map((v) => ({ id: v.id, name: v.name })) })),
        metafelder: planMeta.map((m) => ({ namespace: m.namespace, key: m.key, type: metaIst[`${m.namespace}.${m.key}`]?.type ?? null, value: metaIst[`${m.namespace}.${m.key}`]?.value ?? null })),
        medien: p.media.nodes.map((m, i) => ({ id: m.id, position: i, alt: m.alt ?? '', typ: m.mediaContentType, status: m.status, url: m.image?.url ?? null })),
        varianten: p.variants.nodes.map((v) => ({ id: v.id, sku: v.sku, media: mids(v) })),
        bilder: {},
      };
      sSchreiben(alle);
      log(`  Sicherung geschrieben: ${cfg.sicherung}`);
    }
    {
      // Metafelder, die erst eine spätere Fassung des Plans nennt: ihr heutiger Wert ist der Ausgangswert (dieses Werkzeug hat sie nie geschrieben)
      const alle = sLesen(), e = alle[handle];
      for (const m of planMeta) if (!e.metafelder.some((x) => x.namespace === m.namespace && x.key === m.key)) {
        const ist = metaIst[`${m.namespace}.${m.key}`] ?? null;
        e.metafelder.push({ namespace: m.namespace, key: m.key, type: ist?.type ?? null, value: ist?.value ?? null, nachgetragen: jetztIso() });
        log(`  Sicherung ergänzt: ${m.namespace}.${m.key} (neu im Plan)`);
      }
      // Ziel der Vorwärtsläufe: die Rücknahme setzt nur zurück, was gesichert oder von diesem Werkzeug geschrieben ist
      const z = e.ziel || { optionen: {}, metafelder: {}, seo: {} };
      if (plan.titel_neu) z.title = an.tit.soll;
      if (an.ber.paare) z.descriptionHtml = an.ber.soll;
      for (const m of plan.metafelder || []) if (istSeo(m)) z.seo[SEO_FELD[m.key]] = an.seo.soll[SEO_FELD[m.key]];
      for (const o of an.optSoll) z.optionen[o.id] = o.name;
      for (const m of an.meta) z.metafelder[m.k] = m.soll === null ? null : { type: m.typ, value: m.soll };
      z.stand = jetztIso();
      e.ziel = z;
      sSchreiben(alle);
    }
    const pid = p.id;
    const idVon = new Map();   // datei → Medien-ID

    // 1) neue Bilder: hochladen / übernehmen / wieder anhängen, dann READY abwarten
    for (const b of an.bilder) {
      if (b.zustand === 'da') { idVon.set(b.e.datei, b.id); }
      else if (b.zustand === 'uebernehmen') { journal(handle, b.e.datei, { status: 'fertig', neu: b.id, uebernommen: jetztIso() }); idVon.set(b.e.datei, b.id); log(`  übernommen: ${b.name} → ${kurzId(b.id)} (ausstehender Upload, frisch gelesen da)`); }
      else if (b.zustand === 'anhaengen') {
        await schreibe(`fileUpdate referencesToAdd ${b.name}`, Q.DATEI_REF, { f: [{ id: b.id, referencesToAdd: [pid] }] }, 'fileUpdate',
          { erledigt: async () => medienIds(await lies(handle)).includes(b.id) });
        journal(handle, b.e.datei, { status: 'fertig' });
        idVon.set(b.e.datei, b.id); log(`  wieder angehängt: ${b.name} → ${kurzId(b.id)} (kein neuer Upload)`);
      } else idVon.set(b.e.datei, await hochladen(handle, pid, b, idVon));
      await bereit(handle, idVon.get(b.e.datei), b.name);
    }

    // 2) Varianten neu binden (erst lösen, dann anhängen)
    let gebunden = 0;
    for (const b of an.bilder) if ((b.e.varianten_ids || []).length) gebunden += await bindeBild(handle, pid, b, idVon.get(b.e.datei));
    if (gebunden) log(`  gebunden: ${gebunden} Varianten`);

    // 3) Titel, Beschreibung, SEO
    if (an.tit.zu || an.ber.zu || an.seo.zu) {
      const felder = { id: pid };
      if (an.tit.zu) felder.title = an.tit.soll;
      if (an.ber.zu) felder.descriptionHtml = an.ber.soll;
      if (an.seo.zu) felder.seo = { title: an.seo.soll.title, description: an.seo.soll.description };
      await schreibe('productUpdate', Q.PRODUKT, { p: felder }, 'productUpdate', { erledigt: async () => {
        const q = await lies(handle);
        return q.title === an.tit.soll && q.descriptionHtml === an.ber.soll && seoGleich(q.seo?.title, an.seo.soll.title, q.title) && seoGleich(q.seo?.description, an.seo.soll.description, null);
      } });
      log(`  geschrieben: ${Object.keys(felder).filter((k) => k !== 'id').join(', ')}`);
    }
    // 4) Optionswerte
    for (const o of an.optionen) {
      await schreibe(`productOptionUpdate ${o.name}`, Q.OPTION, { p: pid, o: { id: o.id }, v: o.upd.map((u) => ({ id: u.id, name: u.neu })) }, 'productOptionUpdate', { erledigt: async () => {
        const q = await lies(handle); const oo = q.options.find((x) => x.id === o.id);
        return o.upd.every((u) => oo?.optionValues.find((v) => v.id === u.id)?.name === u.neu);
      } });
      log(`  geschrieben: ${o.upd.length} Werte der Option ${o.name}`);
    }
    // 5) Metafelder
    const setzen = an.meta.filter((m) => m.zu && m.soll !== null), loeschen = an.meta.filter((m) => m.zu && m.soll === null);
    const metaOk = async (liste) => { const ist = await liesMeta(pid, liste); return liste.every((m) => (m.soll === null ? ist[m.k] === null : ist[m.k]?.value === m.soll && ist[m.k]?.type === m.typ)); };
    if (setzen.length) {
      await schreibe('metafieldsSet', Q.META_SETZEN, { m: setzen.map((m) => ({ ownerId: pid, namespace: m.namespace, key: m.key, type: m.typ, value: m.soll })) }, 'metafieldsSet', { erledigt: () => metaOk(setzen) });
      log(`  geschrieben: ${setzen.map((m) => m.k).join(', ')}`);
    }
    if (loeschen.length) {
      await schreibe('metafieldsDelete', Q.META_LOESCHEN, { m: loeschen.map((m) => ({ ownerId: pid, namespace: m.namespace, key: m.key })) }, 'metafieldsDelete', { erledigt: () => metaOk(loeschen) });
      log(`  gelöscht: ${loeschen.map((m) => m.k).join(', ')}`);
    }

    // 6) alte Medien lösen: nur, wenn frisch gelesen keine Variante mehr an ihnen hängt und jede geplante ihr neues Bild trägt
    const vor = await lies(handle);
    const loesenSet = new Set(an.loesen);
    const haengt = vor.variants.nodes.filter((v) => mids(v).some((id) => loesenSet.has(id)));
    if (haengt.length) throw new Abbruch(EXIT.ABBRUCH, `vor dem Lösen hängen noch ${haengt.length} Varianten an zu lösenden Bildern (${haengt.map((v) => v.sku).join(', ')}): nichts gelöst`);
    for (const b of an.bilder) for (const vid of b.e.varianten_ids || []) {
      const v = vor.variants.nodes.find((x) => x.id === vid);
      if (!gleich(mids(v), [idVon.get(b.e.datei)])) throw new Abbruch(EXIT.ABBRUCH, `Variante ${v?.sku || kurzId(vid)} trägt nicht ihr neues Bild: nichts gelöst`);
    }
    const jetztLoesen = an.loesen.filter((id) => medienIds(vor).includes(id));
    if (jetztLoesen.length) {
      await schreibe('fileUpdate referencesToRemove', Q.DATEI_REF, { f: jetztLoesen.map((id) => ({ id, referencesToRemove: [pid] })) }, 'fileUpdate',
        { erledigt: async () => { const q = await lies(handle); return jetztLoesen.every((id) => !medienIds(q).includes(id)); } });
      const weg = await warteBis(handle, (q) => jetztLoesen.every((id) => !medienIds(q).includes(id)));
      if (!weg) throw new Abbruch(EXIT.ABBRUCH, 'gelöste Medien hängen nach dem Nachlesen noch am Produkt');
      log(`  gelöst: ${jetztLoesen.length} Medien (Dateien bleiben unter Inhalt > Dateien)`);
    }

    // 7) Reihenfolge (Hintergrundauftrag, bis 60 s nachlesen)
    const reihe = zielReihe({ rest: an.rest, hauptbildAlt: an.hbAlt, neue: an.bilder.map((b) => ({ id: idVon.get(b.e.datei), position: b.e.position })) });
    const abw = [];
    let q = await lies(handle);
    if (!gleich(medienIds(q), reihe)) {
      let fehler = null, ausnahme = false;
      try { fehler = ue((await gql(Q.ORDNEN, { id: pid, m: reihe.map((id, i) => ({ id, newPosition: String(i) })) }))?.productReorderMedia, 'mediaUserErrors'); }
      catch (e) { fehler = 'Ausnahme ' + e.message; ausnahme = true; }
      if (fehler && !ausnahme) throw new Abbruch(EXIT.ABBRUCH, 'productReorderMedia: ' + fehler);
      const ok = await warteBis(handle, (x) => gleich(medienIds(x), reihe), { versuche: 16, ms: 4000 });
      if (!ok) abw.push(`Reihenfolge nach 60 s nicht im Soll${fehler ? ` (Antwort: ${fehler})` : ''}`);
      else log(`  Reihenfolge gesetzt (${reihe.length} Medien)`);
    }

    // 8) alles frisch zurücklesen
    const soll = {
      titel: an.tit.soll, html: an.ber.soll, seo: an.seo.soll, opt: an.optSoll, meta: an.meta, reihe, kern: an.kern,
      hauptbild: an.hbAlt || idVon.get(an.hbNeu.datei), alts: an.bilder.map((b) => [idVon.get(b.e.datei), b.e.alt]),
      varianten: [...an.varSoll].map(([vid, x]) => [vid, x.bild ? [idVon.get(x.bild.e.datei)] : x.ids]), weg: an.loesen,
    };
    let rest = [];
    for (let i = 0; i < 6; i++) {
      await io.warte(i ? 4000 : 1500);
      rest = await vergleiche(handle, pid, soll, planMeta);
      if (!rest.length) break;
    }
    const alle = [...abw, ...rest];
    if (alle.length) { log(`  NACHGELESEN ABWEICHUNG: ${alle.join('; ')}`); ledger(handle, 'ABWEICHUNG', alle.join(' | ')); return EXIT.ABWEICHUNG; }
    log(`  NACHGELESEN OK: ${reihe.length} Medien, Hauptbild ${kurzId(soll.hauptbild)}, ${soll.varianten.length} Varianten mit Bild`);
    ledger(handle, 'GESCHRIEBEN_OK', `${an.bilder.length} neue Bilder, ${an.loesen.length} gelöst, ${gebunden} Varianten gebunden, Paare ${an.ber.paare}, Optionen ${an.optSoll.length}, Metafelder ${(plan.metafelder || []).length}`);
    return EXIT.OK;
  }

  async function vergleiche(handle, pid, soll, planMeta) {
    const q = await lies(handle), f = [];
    if (q.title !== soll.titel) f.push(`Titel «${kurz(q.title)}»`);
    if (q.descriptionHtml !== soll.html) f.push('Beschreibung ≠ Soll');
    if (!seoGleich(q.seo?.title, soll.seo.title, q.title) || !seoGleich(q.seo?.description, soll.seo.description, null)) f.push(`SEO ${JSON.stringify(q.seo)}`);
    for (const o of soll.opt) { const v = q.options.flatMap((x) => x.optionValues).find((x) => x.id === o.id); if (v?.name !== o.name) f.push(`Optionswert ${kurzId(o.id)} «${v?.name}» ≠ «${o.name}»`); }
    const mi = await liesMeta(pid, planMeta);
    for (const m of soll.meta) {
      const ist = mi[m.k] ?? null;
      if (m.soll === null ? ist !== null : !(ist && ist.value === m.soll && ist.type === m.typ)) f.push(`Metafeld ${m.k} ${ist ? `«${kurz(ist.value)}»` : 'fehlt'}`);
    }
    if (!gleich(medienIds(q), soll.reihe)) f.push(`Galerie ${medienIds(q).map(kurzId).join(',')} ≠ Soll ${soll.reihe.map(kurzId).join(',')}`);
    if (q.media.nodes.some((m) => m.status !== 'READY')) f.push('nicht alle Medien READY');
    if (q.featuredMedia?.id !== soll.hauptbild) f.push(`Hauptbild ${kurzId(q.featuredMedia?.id)} ≠ ${kurzId(soll.hauptbild)}`);
    for (const [id, alt] of soll.alts) { const m = q.media.nodes.find((x) => x.id === id); if ((m?.alt ?? null) !== alt) f.push(`Alt-Text ${kurzId(id)} «${m?.alt}»`); }
    for (const [vid, ids] of soll.varianten) { const v = q.variants.nodes.find((x) => x.id === vid); if (!gleich(mids(v), ids)) f.push(`Variante ${v?.sku || kurzId(vid)} → ${mids(v).map(kurzId).join(',') || 'kein Bild'}`); }
    if (soll.weg.some((id) => medienIds(q).includes(id))) f.push('ein zu lösendes Medium hängt noch am Produkt');
    const da = await dateienDa(soll.weg);
    const verloren = soll.weg.filter((id) => !da[id]);
    if (verloren.length) f.push(`gelöste Dateien nicht mehr unter Inhalt > Dateien: ${verloren.map(kurzId).join(',')} (Rücknahme dafür unmöglich)`);
    if (kern(q) !== soll.kern) f.push('Kernfelder (Handle, Status, Tags, Varianten, SKUs, Preise, Optionen) haben sich verändert');
    return f;
  }

  async function bereit(handle, id, name) {
    const q = await warteBis(handle, (x) => { const m = x.media.nodes.find((y) => y.id === id); return !m || m.status === 'READY' || m.status === 'FAILED'; }, { versuche: 30 });
    const m = q?.media.nodes.find((y) => y.id === id);
    if (!q) throw new Abbruch(EXIT.ABBRUCH, `${name} (${kurzId(id)}) nach 2 Minuten nicht READY (Eintrag in der Sicherung bleibt, nächster Lauf übernimmt es)`);
    if (!m) throw new Abbruch(EXIT.ABBRUCH, `${name} (${kurzId(id)}) hängt nicht mehr am Produkt`);
    if (m.status === 'FAILED') throw new Abbruch(EXIT.ABBRUCH, `${name} (${kurzId(id)}) meldet FAILED`);
  }

  async function hochladen(handle, pid, b, idVon) {
    const buf = readFileSync(b.e.datei);
    if (sha256(buf) !== b.sha256) throw new Abbruch(EXIT.ABBRUCH, `${b.name} hat sich seit der Vorprüfung geändert`);
    const dateiname = dateinameFuer(b.e.datei);
    let st;
    try { st = await gql(Q.STAGED, { i: [{ resource: 'IMAGE', filename: dateiname, mimeType: b.masse.mime, httpMethod: 'POST', fileSize: String(buf.length) }] }); }
    catch (e) { throw new Abbruch(EXIT.ABBRUCH, `stagedUploadsCreate ${b.name}: ${e.message} (am Produkt nichts angelegt)`); }
    const sf = ue(st?.stagedUploadsCreate);
    const ziel = st?.stagedUploadsCreate?.stagedTargets?.[0];
    if (sf || !ziel?.url || !ziel?.resourceUrl) throw new Abbruch(EXIT.ABBRUCH, `stagedUploadsCreate ${b.name}: ${sf || 'kein Ziel'} (am Produkt nichts angelegt)`);
    try { await upload(ziel, buf, dateiname, b.masse.mime); }
    catch (e) { throw new Abbruch(EXIT.ABBRUCH, `Hochladen ${b.name}: ${e.message} (am Produkt nichts angelegt)`); }
    const vorher = medienIds(await lies(handle));
    journal(handle, b.e.datei, { status: 'ausstehend', vorher, neu: null, alt: b.e.alt, sha256: b.sha256, zeit: jetztIso() });
    let fehler = null, ausnahme = false;
    try { fehler = ue((await gql(Q.MEDIEN_NEU, { p: { id: pid }, m: [{ originalSource: ziel.resourceUrl, alt: b.e.alt, mediaContentType: 'IMAGE' }] }))?.productUpdate); }
    catch (e) { fehler = 'Ausnahme ' + String(e?.message || e).slice(0, 200); ausnahme = true; }
    if (fehler && !ausnahme) { journal(handle, b.e.datei, { status: 'nicht_angelegt', fehler }); throw new Abbruch(EXIT.ABBRUCH, `productUpdate media ${b.name}: ${fehler} (nichts angelegt, vermerkt)`); }
    const vergeben = new Set(idVon.values());
    let id = null;
    for (let i = 0; i < 10 && !id; i++) {
      await io.warte(i ? 4000 : 1500);
      let q; try { q = await lies(handle); } catch { continue; }
      const kand = q.media.nodes.filter((m) => !vorher.includes(m.id) && !vergeben.has(m.id) && (m.alt || '') === b.e.alt);
      if (kand.length > 1) throw new Abbruch(EXIT.ABBRUCH, `nach dem Hochladen von ${b.name} stehen ${kand.length} passende neue Medien am Produkt: von Hand prüfen`);
      if (kand.length === 1) id = kand[0].id;
      else if (ausnahme && i >= 2) break;
    }
    if (!id) throw new Abbruch(EXIT.ABBRUCH, `${b.name}: ${ausnahme ? `Antwort verloren (${fehler}) und` : ''} frisch gelesen kein neues Bild; Eintrag bleibt «ausstehend», der nächste Lauf prüft erneut (kein zweiter Upload)`);
    journal(handle, b.e.datei, { status: 'fertig', neu: id });
    log(`  hochgeladen: ${b.name} → ${kurzId(id)}${ausnahme ? ` (Antwort war «${fehler}», Bild frisch gelesen da)` : ''}`);
    return id;
  }

  /** Varianten eines neuen Bildes binden: alte Bindung lösen, dann anhängen. Scheitert etwas, bekommen Varianten ohne Bild ihr altes zurück. */
  async function bindeBild(handle, pid, b, id) {
    const q = await lies(handle);
    const vs = b.e.varianten_ids.map((vid) => q.variants.nodes.find((v) => v.id === vid));
    const zu = vs.filter((v) => !gleich(mids(v), [id]));
    if (!zu.length) return 0;
    const alt = new Map(zu.map((v) => [v.id, mids(v)]));
    const ausgleich = async (q2) => {
      const leer = [...alt].filter(([vid, ids]) => ids.length && !mids(q2.variants.nodes.find((v) => v.id === vid)).length && ids.every((x) => medienIds(q2).includes(x)));
      if (!leer.length) return 'nicht nötig';
      try { const f = ue((await gql(Q.VAR_HAENGEN, { p: pid, vm: leer.map(([vid, ids]) => ({ variantId: vid, mediaIds: ids })) }))?.productVariantAppendMedia); return f ? 'FEHLER ' + f : `${leer.length} Varianten haben ihr altes Bild zurück`; }
      catch (e) { return 'Ausnahme ' + e.message; }
    };
    const mitBild = zu.filter((v) => mids(v).length);
    if (mitBild.length) {
      let f = null;
      try { f = ue((await gql(Q.VAR_LOESEN, { p: pid, vm: mitBild.map((v) => ({ variantId: v.id, mediaIds: mids(v) })) }))?.productVariantDetachMedia); } catch (e) { f = 'Ausnahme ' + e.message; }
      if (f) { await io.warte(1500); const w = await ausgleich(await lies(handle)); throw new Abbruch(EXIT.ABBRUCH, `productVariantDetachMedia ${b.name}: ${f}; Ausgleich: ${w}`); }
    }
    let f = null;
    try { f = ue((await gql(Q.VAR_HAENGEN, { p: pid, vm: zu.map((v) => ({ variantId: v.id, mediaIds: [id] })) }))?.productVariantAppendMedia); } catch (e) { f = 'Ausnahme ' + e.message; }
    if (!f) return zu.length;
    let q2 = null;
    for (let i = 0; i < 3; i++) {
      await io.warte(i ? 4000 : 1500);
      try { q2 = await lies(handle); } catch { continue; }
      if (zu.every((v) => gleich(mids(q2.variants.nodes.find((x) => x.id === v.id)), [id]))) { log(`  Hinweis: Anhängen ${b.name} meldete «${f}», frisch gelesen tragen alle Varianten das neue Bild`); return zu.length; }
    }
    const w = q2 ? await ausgleich(q2) : 'frisch lesen ging nicht';
    throw new Abbruch(EXIT.ABBRUCH, `productVariantAppendMedia ${b.name}: ${f}; Ausgleich: ${w}`);
  }

  function zeige(p, plan, an) {
    const name = (id) => { if (String(id).startsWith('neu:')) return `NEU ${basename(id.slice(4))}`; const b = an.bilder.find((x) => x.id === id); return b ? `NEU ${b.name} (${kurzId(id)})` : kurzId(id); };
    log(`  ${p.status}, ${p.variants.nodes.length} Varianten, ${p.media.nodes.length} Medien, gelesen ${jetztIso()}`);
    log(`  1 Neue Bilder (${an.bilder.length}):`);
    for (const b of an.bilder) log(`     pos ${b.e.position} ${b.name} ${b.masse ? `${b.masse.breite}×${b.masse.hoehe} ${b.masse.typ.toUpperCase()}` : '?'} sha256 ${String(b.sha256).slice(0, 12)} → ${{ hochladen: 'hochladen', da: `schon da (${kurzId(b.id)})`, uebernehmen: `übernehmen (${kurzId(b.id)}, ausstehender Upload)`, anhaengen: `wieder anhängen (${kurzId(b.id)})`, unklar: 'UNKLAR' }[b.zustand]}, ${b.e.varianten_ids.length} Varianten`);
    log(`  2 Varianten binden: ${an.binden.length ? an.binden.map((x) => `${x.wer}→${x.b.name}`).join(', ') : 'nichts zu tun'}`);
    log(`  3 Titel: ${an.tit.zu ? `«${an.tit.alt}» → «${an.tit.soll}»` : 'unverändert'}`);
    log(`    Beschreibung: ${!an.ber.paare ? 'keine Paare' : an.ber.zu ? `${an.ber.paare} Paare, je genau 1 Treffer (wörtlich)` : 'schon im Soll'}`);
    log(`    SEO: ${an.seo.felder.length ? an.seo.felder.join(' · ') : 'unverändert'}`);
    log(`  4 Optionswerte: ${an.optionen.length ? an.optionen.map((o) => o.upd.map((u) => `«${u.alt}» → «${u.neu}»`).join(', ')).join(' · ') : (plan.optionen || []).length ? 'schon neu' : 'keine'}`);
    log(`  5 Metafelder: ${an.meta.length ? an.meta.map((m) => `${m.k} ${m.zu ? (m.soll === null ? 'löschen' : `«${kurz(m.alt, 30)}» → «${kurz(m.neu, 30)}»`) : 'schon neu'}`).join(' · ') : 'keine'}`);
    log(`  6 Lösen: ${an.loesenJetzt.length} von ${an.loesen.length} (${an.loesenJetzt.map(kurzId).join(', ') || 'schon gelöst'})`);
    log(`  7 Reihenfolge: ${an.reihe ? an.reihe.map((id, i) => `${i} ${name(id)}`).join(' | ') : '?'}${an.reiheOk ? ' (schon so)' : ''}`);
    log(`    Hauptbild: ${an.hbAlt ? kurzId(an.hbAlt) : `NEU ${basename(plan.hauptbild)}`}`);
    log('  8 Rücklesen: Titel, Beschreibung, SEO, Optionen, Metafelder, Galerie, Hauptbild, Alt-Texte, Variantenbilder, Kernfelder');
  }

  // ── Rücknahme ──
  async function zurueckProdukt(handle) {
    log(`\n== RÜCKNAHME ${handle}`);
    const alleS = sLesen();
    const s = alleS[handle];
    if (!s) { log('  keine Sicherung für dieses Produkt'); return cfg.live ? EXIT.ZURUECK : EXIT.OK; }
    const p = await lies(handle);
    if (p.id !== s.produkt.id) throw new Abbruch(EXIT.ZURUECK, 'Sicherung gehört zu einem anderen Produkt');
    const pid = p.id;
    const origIds = s.medien.map((m) => m.id);
    const unsere = new Set(Object.values(s.bilder || {}).filter((j) => j.neu).map((j) => j.neu));
    const gefunden = {};   // datei → ID eines «ausstehenden» Uploads, der doch angekommen ist
    for (const [datei, j] of Object.entries(s.bilder || {})) {
      if (j.status !== 'ausstehend') continue;
      const kand = p.media.nodes.filter((m) => !(j.vorher || []).includes(m.id) && !origIds.includes(m.id) && !unsere.has(m.id) && (m.alt || '') === (j.alt || ''));
      if (kand.length > 1) throw new Abbruch(EXIT.ZURUECK, `ausstehender Upload «${j.alt}»: ${kand.length} passende Medien, von Hand prüfen`);
      if (kand.length === 1) { unsere.add(kand[0].id); gefunden[datei] = kand[0].id; }
    }
    const fremd = medienIds(p).filter((id) => !origIds.includes(id) && !unsere.has(id));
    if (fremd.length) throw new Abbruch(EXIT.ZURUECK, `unbekannte Medien am Produkt: ${fremd.map(kurzId).join(', ')} (nicht angefasst)`);
    const fehlend = origIds.filter((id) => !medienIds(p).includes(id));
    const da = await dateienDa(fehlend);
    const verloren = fehlend.filter((id) => !da[id]);
    if (verloren.length) throw new Abbruch(EXIT.ZURUECK, `Dateien nicht mehr vorhanden: ${verloren.map(kurzId).join(', ')}`);
    const neuAm = medienIds(p).filter((id) => unsere.has(id));
    const planMeta = s.metafelder.map((m) => ({ namespace: m.namespace, key: m.key }));
    const metaIst = await liesMeta(pid, planMeta);
    // Jedes Feld muss den gesicherten Wert oder das Ziel eines Vorwärtslaufs tragen; sonst hat es jemand anderes geändert
    const z = s.ziel || {}, fremdFeld = [];
    if (!(p.title === s.produkt.title || ('title' in z && p.title === z.title))) fremdFeld.push(`Titel «${kurz(p.title)}»`);
    if (!(p.descriptionHtml === s.produkt.descriptionHtml || ('descriptionHtml' in z && p.descriptionHtml === z.descriptionHtml))) fremdFeld.push('Beschreibung');
    for (const f of ['title', 'description']) {
      const t = f === 'title' ? p.title : null, ist = p.seo?.[f] ?? null;
      if (!(seoGleich(ist, s.produkt.seo[f], t) || (z.seo && f in z.seo && seoGleich(ist, z.seo[f], t)))) fremdFeld.push(`SEO ${f}`);
    }
    for (const o of s.optionen) for (const w of o.werte) {
      const v = p.options.find((x) => x.id === o.id)?.optionValues.find((x) => x.id === w.id);
      if (!v || (v.name !== w.name && v.name !== z.optionen?.[w.id])) fremdFeld.push(`Optionswert ${v ? `«${v.name}»` : `${kurzId(w.id)} fehlt`}`);
    }
    for (const m of s.metafelder) {
      const k = `${m.namespace}.${m.key}`, i = metaIst[k] ?? null;
      const gl = (soll) => (soll === null ? i === null : !!i && i.value === soll.value && i.type === soll.type);
      if (!(gl(m.value === null ? null : m) || (z.metafelder && k in z.metafelder && gl(z.metafelder[k])))) fremdFeld.push(`Metafeld ${k}`);
    }
    if (!gleich(s.varianten.map((v) => v.id).sort(), p.variants.nodes.map((v) => v.id).sort())) fremdFeld.push('Variantenliste');
    for (const v of s.varianten) {
      const cur = mids(p.variants.nodes.find((x) => x.id === v.id));
      if (!(gleich(cur, v.media) || !cur.length || (cur.length === 1 && unsere.has(cur[0])))) fremdFeld.push(`Variantenbild ${v.sku || kurzId(v.id)}`);
    }
    if (fremdFeld.length) {
      const t = `seit dem Vorwärtslauf von anderer Stelle geändert: ${fremdFeld.join(', ')}`;
      if (!cfg.fremdUeberschreiben) throw new Abbruch(EXIT.ZURUECK, `${t}; nichts geschrieben (ZURUECK_FREMD=1 überschreibt das bewusst)`);
      log(`  Hinweis: ${t}; ZURUECK_FREMD=1 gesetzt, wird überschrieben`);
    }
    const metaZu = s.metafelder.filter((m) => { const i = metaIst[`${m.namespace}.${m.key}`] ?? null; return m.value === null ? i !== null : !(i && i.value === m.value && i.type === m.type); });
    const varZu = s.varianten.filter((v) => !gleich(mids(p.variants.nodes.find((x) => x.id === v.id)), v.media));
    const fZu = p.title !== s.produkt.title || p.descriptionHtml !== s.produkt.descriptionHtml
      || !seoGleich(p.seo?.title, s.produkt.seo.title, p.title) || !seoGleich(p.seo?.description, s.produkt.seo.description, null);
    const optZu = s.optionen.map((o) => ({ id: o.id, name: o.name, upd: o.werte.filter((w) => { const v = p.options.find((x) => x.id === o.id)?.optionValues.find((x) => x.id === w.id); return v && v.name !== w.name; }) })).filter((o) => o.upd.length);
    const reiheOk = gleich(medienIds(p), origIds);
    log(`  wieder anhängen: ${fehlend.length ? fehlend.map(kurzId).join(', ') : 'nichts'}`);
    log(`  Variantenbilder zurück: ${varZu.length}`);
    log(`  Titel/Beschreibung/SEO zurück: ${fZu ? 'ja' : 'schon wie gesichert'}`);
    log(`  Optionswerte zurück: ${optZu.reduce((n, o) => n + o.upd.length, 0)}`);
    log(`  Metafelder zurück: ${metaZu.map((m) => `${m.namespace}.${m.key}${m.value === null ? ' löschen' : ''}`).join(', ') || 'nichts'}`);
    log(`  neue Bilder vom Produkt lösen (Datei bleibt): ${neuAm.map(kurzId).join(', ') || 'nichts'}`);
    log(`  Reihenfolge zurück: ${reiheOk ? 'schon wie gesichert' : `${origIds.length} Medien`}`);
    if (!fehlend.length && !varZu.length && !fZu && !optZu.length && !metaZu.length && !neuAm.length && reiheOk) { log('  Nichts zu tun (schon wie gesichert).'); ledger(handle, 'ZURUECK_SCHON', 'nichts geschrieben'); return EXIT.OK; }
    if (!cfg.live) { log('  Trockenlauf: nichts geschrieben.'); return EXIT.OK; }
    const startKern = kern(p);
    const zr = async (name, query, vars, feld, opt) => { try { return await schreibe(name, query, vars, feld, opt); } catch (e) { if (e instanceof Abbruch) e.code = EXIT.ZURUECK; throw e; } };

    // 1) gelöste alte Medien wieder anhängen
    if (fehlend.length) {
      await zr('fileUpdate referencesToAdd', Q.DATEI_REF, { f: fehlend.map((id) => ({ id, referencesToAdd: [pid] })) }, 'fileUpdate', { erledigt: async () => { const q = await lies(handle); return fehlend.every((id) => medienIds(q).includes(id)); } });
      const ok = await warteBis(handle, (q) => fehlend.every((id) => q.media.nodes.find((m) => m.id === id)?.status === 'READY'), { versuche: 15 });
      if (!ok) throw new Abbruch(EXIT.ZURUECK, 'wieder angehängte Medien nicht da oder nicht READY');
    }
    // 2) Variantenbilder zurück
    let q = await lies(handle);
    const zuV = s.varianten.filter((v) => !gleich(mids(q.variants.nodes.find((x) => x.id === v.id)), v.media));
    const mitBild = zuV.filter((v) => mids(q.variants.nodes.find((x) => x.id === v.id)).length);
    if (mitBild.length) await zr('productVariantDetachMedia (zurück)', Q.VAR_LOESEN, { p: pid, vm: mitBild.map((v) => ({ variantId: v.id, mediaIds: mids(q.variants.nodes.find((x) => x.id === v.id)) })) }, 'productVariantDetachMedia',
      { erledigt: async () => { const x = await lies(handle); return mitBild.every((v) => !mids(x.variants.nodes.find((y) => y.id === v.id)).length || gleich(mids(x.variants.nodes.find((y) => y.id === v.id)), v.media)); } });
    const anh = zuV.filter((v) => v.media.length);
    if (anh.length) await zr('productVariantAppendMedia (zurück)', Q.VAR_HAENGEN, { p: pid, vm: anh.map((v) => ({ variantId: v.id, mediaIds: v.media })) }, 'productVariantAppendMedia',
      { erledigt: async () => { const x = await lies(handle); return anh.every((v) => gleich(mids(x.variants.nodes.find((y) => y.id === v.id)), v.media)); } });
    // 3) Titel, Beschreibung, SEO
    if (fZu) await zr('productUpdate (zurück)', Q.PRODUKT, { p: { id: pid, title: s.produkt.title, descriptionHtml: s.produkt.descriptionHtml, seo: { title: s.produkt.seo.title, description: s.produkt.seo.description } } }, 'productUpdate',
      { erledigt: async () => { const x = await lies(handle); return x.title === s.produkt.title && x.descriptionHtml === s.produkt.descriptionHtml; } });
    // 4) Optionswerte
    for (const o of optZu) await zr(`productOptionUpdate ${o.name} (zurück)`, Q.OPTION, { p: pid, o: { id: o.id }, v: o.upd.map((w) => ({ id: w.id, name: w.name })) }, 'productOptionUpdate',
      { erledigt: async () => { const x = await lies(handle); return o.upd.every((w) => x.options.find((y) => y.id === o.id)?.optionValues.find((y) => y.id === w.id)?.name === w.name); } });
    // 5) Metafelder
    const mS = metaZu.filter((m) => m.value !== null), mL = metaZu.filter((m) => m.value === null);
    if (mS.length) await zr('metafieldsSet (zurück)', Q.META_SETZEN, { m: mS.map((m) => ({ ownerId: pid, namespace: m.namespace, key: m.key, type: m.type, value: m.value })) }, 'metafieldsSet');
    if (mL.length) await zr('metafieldsDelete (zurück)', Q.META_LOESCHEN, { m: mL.map((m) => ({ ownerId: pid, namespace: m.namespace, key: m.key })) }, 'metafieldsDelete');
    // 6) neue Bilder vom Produkt lösen (nicht löschen): erst, wenn keine Variante mehr an ihnen hängt
    q = await lies(handle);
    const neuJetzt = medienIds(q).filter((id) => unsere.has(id));
    if (neuJetzt.length) {
      if (q.variants.nodes.some((v) => mids(v).some((id) => unsere.has(id)))) throw new Abbruch(EXIT.ZURUECK, 'eine Variante hängt noch an einem neuen Bild: nicht gelöst');
      await zr('fileUpdate referencesToRemove (neue Bilder)', Q.DATEI_REF, { f: neuJetzt.map((id) => ({ id, referencesToRemove: [pid] })) }, 'fileUpdate',
        { erledigt: async () => { const x = await lies(handle); return neuJetzt.every((id) => !medienIds(x).includes(id)); } });
      if (!await warteBis(handle, (x) => neuJetzt.every((id) => !medienIds(x).includes(id)))) throw new Abbruch(EXIT.ZURUECK, 'neue Bilder hängen nach dem Lösen noch am Produkt');
    }
    const alleS2 = sLesen();
    for (const [datei, j] of Object.entries(alleS2[handle].bilder || {})) {
      const id = j.neu || gefunden[datei];
      if (id && unsere.has(id)) alleS2[handle].bilder[datei] = { ...j, neu: id, status: 'zurueckgenommen', zurueck: jetztIso() };
    }
    sSchreiben(alleS2);
    // 7) Reihenfolge wie gesichert
    q = await lies(handle);
    if (!gleich(medienIds(q), origIds)) {
      let fehler = null, ausnahme = false;
      try { fehler = ue((await gql(Q.ORDNEN, { id: pid, m: origIds.map((id, i) => ({ id, newPosition: String(i) })) }))?.productReorderMedia, 'mediaUserErrors'); } catch (e) { fehler = 'Ausnahme ' + e.message; ausnahme = true; }
      if (fehler && !ausnahme) throw new Abbruch(EXIT.ZURUECK, 'productReorderMedia: ' + fehler);
      await warteBis(handle, (x) => gleich(medienIds(x), origIds), { versuche: 16 });
    }
    // 8) frisch zurücklesen gegen die Sicherung
    let f = [];
    for (let i = 0; i < 6; i++) {
      await io.warte(i ? 4000 : 1500);
      const x = await lies(handle); f = [];
      if (x.title !== s.produkt.title) f.push('Titel');
      if (x.descriptionHtml !== s.produkt.descriptionHtml) f.push('Beschreibung');
      if (!seoGleich(x.seo?.title, s.produkt.seo.title, x.title) || !seoGleich(x.seo?.description, s.produkt.seo.description, null)) f.push('SEO');
      for (const o of s.optionen) for (const w of o.werte) if (x.options.find((y) => y.id === o.id)?.optionValues.find((y) => y.id === w.id)?.name !== w.name) f.push(`Optionswert ${kurzId(w.id)}`);
      const mi = await liesMeta(pid, planMeta);
      for (const m of s.metafelder) { const i2 = mi[`${m.namespace}.${m.key}`] ?? null; if (m.value === null ? i2 !== null : !(i2 && i2.value === m.value && i2.type === m.type)) f.push(`Metafeld ${m.namespace}.${m.key}`); }
      if (!gleich(medienIds(x), origIds)) f.push(`Galerie ${medienIds(x).map(kurzId).join(',')}`);
      for (const m of s.medien) if ((x.media.nodes.find((y) => y.id === m.id)?.alt ?? '') !== (m.alt ?? '')) f.push(`Alt-Text ${kurzId(m.id)}`);
      for (const v of s.varianten) if (!gleich(mids(x.variants.nodes.find((y) => y.id === v.id)), v.media)) f.push(`Variante ${v.sku}`);
      if (kern(x) !== startKern) f.push('Kernfelder');
      if (!f.length) break;
    }
    if (f.length) { log(`  NACHGELESEN ABWEICHUNG: ${f.join('; ')}`); ledger(handle, 'ZURUECK_ABWEICHUNG', f.join(' | ')); return EXIT.ZURUECK; }
    log('  NACHGELESEN OK: wie gesichert');
    ledger(handle, 'ZURUECK_OK', `${fehlend.length} wieder angehängt, ${neuAm.length} neue gelöst, ${varZu.length} Variantenbilder, Metafelder ${metaZu.length}`);
    return EXIT.OK;
  }
}

// ── Kommandozeile (echter Shop) ───────────────────────────────────────────────────────────────────
function echteIO({ shop, api, token, live, zeit }) {
  const url = `https://${shop}/admin/api/${api}/graphql.json`;
  const warte = (ms) => new Promise((r) => setTimeout(r, ms * zeit));
  const mehrdeutig = (m) => Object.assign(new Error(m), { mehrdeutig: true });
  async function gql(query, variables) {
    const mut = istMutation(query);
    if (mut && !live) throw new Error('Trockenlauf: Schreibzugriff verweigert');
    for (let i = 0; i < 6; i++) {
      let r;
      try { r = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) }); }
      catch (e) { if (!mut && i < 5) { await warte(1500 * 2 ** i); continue; } throw mut ? mehrdeutig('Netz: ' + e.message) : new Error('Netz: ' + e.message); }
      if (r.status === 429) { await warte(1500 * 2 ** i); continue; }              // nicht ausgeführt: Wiederholen ist sicher
      if (r.status >= 500) { if (!mut && i < 5) { await warte(1500 * 2 ** i); continue; } throw mut ? mehrdeutig('HTTP ' + r.status) : new Error('HTTP ' + r.status); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      let j; try { j = await r.json(); } catch { throw mut ? mehrdeutig('Antwort nicht lesbar') : new Error('Antwort nicht lesbar'); }
      if (j?.errors?.length) {
        const t = JSON.stringify(j.errors).slice(0, 400);
        if (/throttled/i.test(t)) { await warte(1500 * 2 ** i); continue; }    // gedrosselt = nicht ausgeführt
        throw new Error('GraphQL: ' + t);
      }
      const c = j?.extensions?.cost;
      if (c?.throttleStatus && c.requestedQueryCost > c.throttleStatus.currentlyAvailable && c.throttleStatus.restoreRate > 0) await warte(Math.min(10000, ((c.requestedQueryCost - c.throttleStatus.currentlyAvailable) / c.throttleStatus.restoreRate) * 1000));
      return j.data;
    }
    throw new Error('GraphQL: zu oft gedrosselt');
  }
  async function upload(ziel, buf, dateiname, mime) {
    if (!live) throw new Error('Trockenlauf: Hochladen verweigert');
    const form = new FormData();
    for (const { name, value } of ziel.parameters || []) form.append(name, value);
    form.append('file', new Blob([buf], { type: mime }), dateiname);
    const r = await fetch(ziel.url, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error('Staged-Upload HTTP ' + r.status);
  }
  return { gql, upload, warte, jetzt: () => Date.now(), log: (t) => console.log(t) };
}

async function main() {
  const env = process.env;
  const live = env.LIVE === '1', zurueck = env.ZURUECK === '1';
  const nur = env.NUR ? env.NUR.split(',').map((x) => x.trim()).filter(Boolean) : null;
  if (live && !nur?.length) { console.log('ABGELEHNT: LIVE=1 braucht NUR=<handle,...> (kein Massenlauf)'); process.exit(EXIT.AUFRUF); }
  if (live && env.GK_ZEIT !== undefined && !(Number(env.GK_ZEIT) >= 1)) { console.log('ABGELEHNT: LIVE=1 braucht GK_ZEIT ab 1 (kürzere Wartezeiten melden READY, Lösen und Reihenfolge zu früh als gescheitert)'); process.exit(EXIT.AUFRUF); }
  const cfg = {
    plaene: JSON.parse(readFileSync(env.PLAENE || VORGABE.plaene, 'utf8')), live, zurueck, nur, fremdUeberschreiben: env.ZURUECK_FREMD === '1',
    sicherung: env.SICHERUNG || VORGABE.sicherung, ledger: env.LEDGER || VORGABE.ledger,
  };
  const shop = String(env.SHOPIFY_SHOP || '').trim().toLowerCase().replace(/^https:\/\//, '').replace(/\/$/, '');
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) { console.log('SHOPIFY_SHOP fehlt oder ist keine myshopify.com-Domain'); process.exit(EXIT.AUFRUF); }
  const secret = (String(env.SHOPIFY_CLIENT_SECRET || '').trim().match(/^shpss_[0-9a-f]{32}/) || [String(env.SHOPIFY_CLIENT_SECRET || '').trim()])[0];
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: secret, grant_type: 'client_credentials' }) });
  const token = (await r.json().catch(() => ({}))).access_token;
  if (!token) { console.log(`kein Admin-Token (HTTP ${r.status})`); process.exit(EXIT.UNERWARTET); }
  const zeit = env.GK_ZEIT !== undefined ? Math.max(0, Number(env.GK_ZEIT) || 0) : 1;
  console.log(`${zurueck ? 'RÜCKNAHME' : 'VORWÄRTS'} · ${live ? 'LIVE' : 'TROCKENLAUF'} · Pläne ${env.PLAENE || VORGABE.plaene} · Sicherung ${cfg.sicherung}${nur ? ` · NUR ${nur.join(',')}` : ''}`);
  const { exit } = await lauf(cfg, echteIO({ shop, api: env.SHOPIFY_API || '2026-10', token, live, zeit }));
  process.exit(exit);
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => { console.log('FEHLER ' + (e?.stack || e)); process.exit(EXIT.UNERWARTET); });
}
