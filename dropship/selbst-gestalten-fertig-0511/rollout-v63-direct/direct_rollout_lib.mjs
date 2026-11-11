import { createHash } from 'node:crypto';

export const ALLOWLIST = Object.freeze([
  ['15422950474113', 'allover-stoffbeutel-selbst-gestalten'],
  ['15422854463873', 'alltags-umhangetasche-selbst-gestalten'],
  ['15422819991937', 'bio-jutebeutel-selbst-gestalten'],
  ['15422940447105', 'edelstahl-trinkflasche-mit-strohhalm-selbst-gestalten'],
  ['15422939988353', 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'],
  ['15422823465345', 'keramik-tasse-selbst-gestalten'],
  ['15422942609793', 'kiss-cut-aufkleber-selbst-gestalten'],
  ['15422857642369', 'klassisches-unisex-t-shirt-selbst-gestalten'],
  ['15427217195393', 'magnet-zum-selbstgestalten'],   // seit 11.11.2026 freigeschaltet (siehe FREIGESCHALTET)
  ['15451569160577', 'mauspad-selbst-gestalten'],
  ['16672778289543', 'samsung-huelle-selbst-gestalten'],
  ['15427283157377', 'shirt-zum-selbstgestalten'],
  ['15451569324417', 'spiral-notizbuch-selbst-gestalten'],
  ['15427282633089', 'tasse-zum-selbstgestalten'],
  ['15422946804097', 'transparente-iphone®-hulle-selbst-gestalten'],
  ['15422815699329', 'unisex-hoodie-selbst-gestalten'],
  ['15422811439489', 'unisex-t-shirt-selbst-gestalten'],
].map(([id, handle]) => Object.freeze({ id: `gid://shopify/Product/${id}`, numericId: id, handle })));

export const BLOCKLIST = Object.freeze([
  ['15423895830913', 'buegeltransfer-selbst-gestalten', 'Fremd-Fulfillment: Die Druckdatenübergabe an den Produktionspartner ist noch nicht bestätigt.'],
  ['15422849188225', 'dad-cap-selbst-gestalten', 'Die nötige Stickplatzierung und ihre Produktionsoptionen sind noch nicht vollständig geprüft.'],
].map(([id, handle, reason]) => Object.freeze({ id: `gid://shopify/Product/${id}`, numericId: id, handle, reason })));

/** Frühere Sperrprodukte, die jetzt Editorprodukte sind. Der Magnet (Printful 656) war bis 11.11.2026 gesperrt, weil die Lieferung
 *  in die Schweiz unbelegt war (gemessen: rollout-v63/source/lieferbarkeit-ch-1111.json). Die Liste hält den Grundtext der alten
 *  Sperre fest: damit lässt der Planer genau EINEN Übergang zu (unveränderter Sperrbaustein → Editor-Baustein, freischaltungPlanen),
 *  und Artefakte von vor der Freischaltung (Planzeile «blocked», Release ohne dieses Produkt) bleiben im Rollback lesbar. */
export const FREIGESCHALTET = Object.freeze([
  ['15427217195393', 'magnet-zum-selbstgestalten', 'Produktion und Lieferung dieser Ausführung in die Schweiz sind derzeit nicht bestätigt.', '2026-11-11'],
].map(([id, handle, reason, seit]) => Object.freeze({ id: `gid://shopify/Product/${id}`, numericId: id, handle, reason, seit })));
for (const f of FREIGESCHALTET) {
  if (!ALLOWLIST.some((a) => a.id === f.id && a.handle === f.handle) || BLOCKLIST.some((b) => b.id === f.id)) throw new Error(`FREIGESCHALTET passt nicht zu Allowlist/Sperrliste: ${f.handle}`);
}
export const freigeschaltet = (id) => FREIGESCHALTET.find((f) => f.id === id) || null;

export const PREVIEW_IDS = Object.freeze([
  '15422854463873', '15422819991937', '15422823465345',
  '15422942609793', '15422857642369', '15427283157377',
  '15427282633089', '15422815699329', '15422811439489',
]);

export const sha256 = (wert) => createHash('sha256').update(wert).digest('hex');
export const numericId = (gid) => String(gid || '').split('/').pop();
export const sortIds = (ids) => [...ids].map(String).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const MARKER = /<!-- lx-v63-editor:start\b[\s\S]*?<!-- lx-v63-editor:end -->\s*/giu;
const LEGACY = /<div\b[^>]*class=(['"])[^'"]*\blspod-designer(?:-v6)?\b[^'"]*\1[^>]*>\s*<\/div>\s*<script\b[^>]*\bsrc=(['"])[^'"]*lspod-designer[^'"]*\.js(?:\?[^'"]*)?\2[^>]*>\s*<\/script>\s*(?:<hr\b[^>]*>\s*)?/giu;
export const VORHER_EDITOR = Object.freeze({
  url: 'https://abannews.com/pod/v6/lspod-designer-v6-6.3.0.js',
  sha256: 'e58e5c277e9ff45ec5680150d96657b7f1cac0c66a777f46ce1fd65d2166c76b',
});

export function attr(wert) {
  return String(wert == null ? '' : wert)
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function assetPfad(url, erwartet) {
  let u;
  try { u = new URL(url); } catch { return false; }
  return u.protocol === 'https:' && u.host === 'abannews.com' && u.pathname === erwartet && !u.username && !u.password;
}

export function assetUrl(url, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash || '')) throw new Error('Asset-Version braucht einen SHA-256');
  const u = new URL(url);
  u.searchParams.set('v', hash.slice(0, 16));
  return u.href;
}

export function integritySha256(hash) {
  if (!/^[a-f0-9]{64}$/.test(hash || '')) throw new Error('SRI braucht einen SHA-256');
  return `sha256-${Buffer.from(hash, 'hex').toString('base64')}`;
}

// ---- Editor-Release (editor-release.json, Weg für 6.4.0) ------------------------------------------
// Die Datei wird von editor_release_bauen.mjs aus den echten Dateien unter pod/v6/ erzeugt, nie von Hand
// eingetragen. Hier steht nur die reine Formprüfung; der Abgleich mit den Dateibytes steht im Bauskript.
const SEMVER = /^\d+\.\d+\.\d+$/;
const HASH64 = /^[a-f0-9]{64}$/;
export const ROLLOUT_V63 = '6.3.1';   // alter Pfad (Codex): Verhalten für die alten Tests unverändert
export const ROLLOUT_V64 = '6.4.0';   // neuer Pfad: Ziel aus editor-release.json
export const EDITOR_RELEASE_SCHEMA = 1;
export const editorDateiname = (version) => `lspod-designer-v6-${version}.js`;
export const editorUrlPfad = (version) => `/pod/v6/${editorDateiname(version)}`;
export const editorUrl = (version) => `https://abannews.com${editorUrlPfad(version)}`;
const semverTeile = (v) => String(v).split('.').map(Number);
export function semverKleiner(a, b) {
  const x = semverTeile(a); const y = semverTeile(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
}

export function editorReleaseFormPruefen(er) {
  const fehler = (m) => { throw new Error(`editor-release.json: ${m}`); };
  if (!er || typeof er !== 'object' || er.schema !== EDITOR_RELEASE_SCHEMA) fehler('Schema 1 fehlt');
  const eintragPruefen = (e, name) => {
    if (!e || typeof e !== 'object') fehler(`${name}: Eintrag fehlt`);
    if (!SEMVER.test(e.version || '')) fehler(`${name}: Version unbrauchbar`);
    if (e.file !== `pod/v6/${editorDateiname(e.version)}`) fehler(`${name}: file passt nicht zur Version`);
    if (e.url !== editorUrl(e.version)) fehler(`${name}: url passt nicht zur Version`);
    if (!HASH64.test(e.sha256 || '')) fehler(`${name}: sha256 unbrauchbar`);
    if (!Number.isInteger(e.bytes) || e.bytes <= 0) fehler(`${name}: bytes unbrauchbar`);
  };
  eintragPruefen(er, 'Ziel');
  if (!Array.isArray(er.vorgaenger) || !er.vorgaenger.length) fehler('vorgaenger fehlt');
  const versionen = new Set([er.version]);
  const hashes = new Set([er.sha256]);
  er.vorgaenger.forEach((v, i) => {
    eintragPruefen(v, `Vorgänger ${i}`);
    if (!semverKleiner(v.version, er.version)) fehler(`Vorgänger ${v.version} ist nicht älter als das Ziel ${er.version}`);
    if (versionen.has(v.version) || hashes.has(v.sha256)) fehler(`Vorgänger ${v.version}: Version oder SHA doppelt oder gleich dem Ziel`);
    versionen.add(v.version); hashes.add(v.sha256);
  });
  return er;
}
export const editorAusRelease = (er) => ({ url: er.url, sha256: er.sha256 });
export const vorgaengerAusRelease = (er) => er.vorgaenger.map((v) => ({ url: v.url, sha256: v.sha256 }));

// ---- Eingaben, Bestätigungen, Canary-Tabelle -------------------------------------------------------
// Ein Skript, zwei Pfade: EDITOR_VERSION=6.3.1 (Vorgabe, wie bisher) und EDITOR_VERSION=6.4.0 (neu).
// Seit 11.11.2026: 17 Editorprodukte (mit dem Magneten) und 2 Sperrprodukte, zusammen weiter 19.
// Gewählt statt eines zweiten Skripts, weil Plan, Ledger, Rollback und Schreibschutz dann EIN Code sind
// und der alte Pfad für die alten Tests unverändert bleibt. Die Bestätigungen sind je Pfad getrennt:
// eine V63_-Zeile aus der alten Doku bestätigt nie einen 6.4.0-Schreiblauf (und umgekehrt).
const ACKS_V63 = Object.freeze({
  apply: Object.freeze({ canary: 'V63_CANARY_TASSE', full: 'V63_FULL_19_SAFE' }),
  rollback: Object.freeze({ canary: 'V63_ROLLBACK_TASSE', full: 'V63_ROLLBACK_19_SAFE' }),
});
const ACKS_V64 = Object.freeze({
  apply: Object.freeze({ 'canary-tasse': 'V64_CANARY_TASSE', 'canary-jutebeutel': 'V64_CANARY_JUTEBEUTEL', 'frei-magnet': 'V64_FREI_MAGNET', full: 'V64_FULL_17_EDITOR' }),
  rollback: Object.freeze({ 'canary-tasse': 'V64_ROLLBACK_TASSE', 'canary-jutebeutel': 'V64_ROLLBACK_JUTEBEUTEL', 'frei-magnet': 'V64_ROLLBACK_MAGNET', full: 'V64_ROLLBACK_17_EDITOR' }),
});
const V63_MELDUNG = Object.freeze({
  apply: Object.freeze({ canary: 'Canary braucht ACK=', full: 'Vollausrollung braucht ACK=' }),
  rollback: Object.freeze({ canary: 'Canary-Rollback braucht ACK=', full: 'Voll-Rollback braucht ACK=' }),
});
function canaryEintrag(scope, numericId, handle) {
  const a = ALLOWLIST.find((x) => x.numericId === numericId);
  if (!a || a.handle !== handle) throw new Error(`Canary-Tabelle: ${scope} passt nicht zur Allowlist`);
  return Object.freeze({ scope, id: a.id, numericId: a.numericId, handle: a.handle });
}
// Fest einprogrammiert, keine freie Eingabe: Stufe A Keramik-Tasse, Stufe B Bio-Jutebeutel und die Einzelstufe «frei-magnet»
// (Freischaltung des Magneten: genau dieses eine Produkt, eigene Bestätigung, eigener Rückweg).
export const CANARY_V63 = canaryEintrag('canary', '15422823465345', 'keramik-tasse-selbst-gestalten');
export const CANARY_V64 = Object.freeze({
  'canary-tasse': canaryEintrag('canary-tasse', '15422823465345', 'keramik-tasse-selbst-gestalten'),
  'canary-jutebeutel': canaryEintrag('canary-jutebeutel', '15422819991937', 'bio-jutebeutel-selbst-gestalten'),
  'frei-magnet': canaryEintrag('frei-magnet', '15427217195393', 'magnet-zum-selbstgestalten'),
});
export const SCOPES_V64 = Object.freeze([...Object.keys(CANARY_V64), 'full']);

export function rolloutKonfig({ mode, scope, ack, live, editorVersion } = {}) {
  const ev = String(editorVersion || ROLLOUT_V63);
  if (ev !== ROLLOUT_V63 && ev !== ROLLOUT_V64) throw new Error('EDITOR_VERSION muss 6.3.1 oder 6.4.0 sein');
  const v64 = ev === ROLLOUT_V64;
  const m = String(mode || 'plan').toLowerCase();
  const s = String(scope || (v64 ? '' : 'canary')).toLowerCase();   // 6.4.0 hat keinen Vorgabe-Scope
  if (!['plan', 'apply', 'rollback'].includes(m)) throw new Error('MODE muss plan, apply oder rollback sein');
  const erlaubt = v64 ? SCOPES_V64 : ['canary', 'full'];
  if (!erlaubt.includes(s)) throw new Error(v64 ? 'SCOPE muss canary-tasse, canary-jutebeutel, frei-magnet oder full sein' : 'SCOPE muss canary oder full sein');
  if (m !== 'plan' && live !== true) throw new Error(`${m}: LIVE=1 fehlt`);
  let soll = '';
  if (m !== 'plan') {
    soll = (v64 ? ACKS_V64 : ACKS_V63)[m][s];
    if (String(ack || '') !== soll) {
      const text = v64 ? `${m === 'apply' ? 'Apply' : 'Rollback'} (${s}) braucht ACK=` : V63_MELDUNG[m][s];
      throw new Error(`${text}${soll}`);
    }
  }
  const canary = s === 'full' ? null : (v64 ? CANARY_V64[s] : CANARY_V63);
  return Object.freeze({ editorVersion: ev, mode: m, scope: s, canary, ack: soll, editorUrlPfad: editorUrlPfad(ev) });
}

/** Welche Plan-Produkte ein Apply/Rollback anfasst. Canary: genau das eine feste Produkt.
 * Full-APPLY (6.4.0): die Sperrprodukte zuerst, damit eine zwischenzeitlich veränderte Sperre den Lauf stoppt,
 * BEVOR ein Editorprodukt geschrieben wurde (sie werden nie geschrieben, nur gegen den Plan geprüft).
 * Full-ROLLBACK: Planreihenfolge ohne Vorrang. Die Sperren stehen im Apply-Ledger als «unchanged» und werden im Rollback
 * gar nicht angefasst; eine seit dem Apply veränderte Sperrseite darf den Rückweg der Editorprodukte nie aufhalten. */
export function auswahlPlanen(alle, konf) {
  if (!Array.isArray(alle)) throw new Error('Plan ohne Produktliste');
  if (konf.canary) {
    const p = alle.filter((x) => x.id === konf.canary.id && x.handle === konf.canary.handle);
    if (p.length !== 1) throw new Error(`Canary nicht genau einmal im Plan: ${konf.canary.handle}`);
    return p;
  }
  if (konf.editorVersion === ROLLOUT_V63 || konf.mode === 'rollback') return alle;
  return [...alle.filter((x) => x.kind === 'blocked'), ...alle.filter((x) => x.kind !== 'blocked')];
}

// ---- Apply-Ledger lesen: was ein Rollback zurückstellen darf ----------------------------------------------------
/** Zustände, die ein Apply-Ledger tragen darf. «writing» ist die Absichtszeile VOR dem Write: bricht der Lauf danach ab
 *  (Cancel im Actions-UI, Kill), steht sie als letzter Zustand da und der Rückweg bleibt möglich. */
export const APPLY_LEDGER_ZUSTAENDE = Object.freeze(['applied', 'writing', 'unchanged', 'rejected', 'unknown', 'unknown-write-response', 'unknown-readback', 'unknown-readback-unavailable']);
/** Zustände, bei denen der Apply-Lauf möglicherweise geschrieben hat: nur dort gibt es etwas zurückzustellen.
 *  «unchanged» (Ziel war schon da, nichts geschrieben) und «rejected» (Shopify hat abgelehnt) sind Zeilen ohne Write. */
export const ROLLBACK_SCHREIBBAR = Object.freeze(['applied', 'writing', 'unknown', 'unknown-write-response', 'unknown-readback', 'unknown-readback-unavailable']);

/** Gibt die IDs zurück, die ein Rollback anfassen darf (Apply hat dort geschrieben oder die Antwort blieb unklar).
 *  Gibt es keine einzige, hat dieser Apply-Lauf nichts verändert: der Rollback bricht mit einer klaren Meldung ab, statt
 *  «grün» zu melden, während der Editor live bleibt (typisch: das Artefakt eines wiederholten, wirkungslosen Apply). */
export function rollbackLedgerAuswerten(ledgerProdukte) {
  if (!Array.isArray(ledgerProdukte)) throw new Error('Apply-Ledger ohne Produktliste');
  const schreibbar = ledgerProdukte.filter((x) => ROLLBACK_SCHREIBBAR.includes(x?.state));
  if (!schreibbar.length) {
    const zaehler = {};
    for (const x of ledgerProdukte) zaehler[x?.state || '?'] = (zaehler[x?.state || '?'] || 0) + 1;
    throw new Error(`Rollback: Das Apply-Ledger enthält keinen Eintrag, bei dem der Lauf geschrieben hat (${Object.entries(zaehler).map(([k, v]) => `${k} ${v}`).join(', ') || 'leer'}): nichts zurückzunehmen. Den Rückweg mit dem Artefakt des Apply-Laufs fahren, dessen Ledger «applied» zeigt`);
  }
  return new Set(schreibbar.map((x) => x.id));
}

/** Identitätsprüfung für den Rollback: Produkt-ID und Handle gehören zur festen Allowlist/Sperrliste und zur Planzeile.
 *  Bewusst KEIN Status-, Kaufbarkeits-, Varianten- oder Storefront-Gate: ein auf ENTWURF gestelltes oder verändertes
 *  Produkt muss sich trotzdem auf die bekannte Vorher-Beschreibung zurückstellen lassen (der Hash-Schutz im Skript
 *  entscheidet, ob die Live-Beschreibung exakt dem Plan-Nachher entspricht). */
export function produktIdentitaetPruefen(product, id, handle) {
  const bekannt = [...ALLOWLIST, ...BLOCKLIST].some((x) => x.id === id && x.handle === handle);
  if (!bekannt || !product || product.id !== id || product.handle !== handle) throw new Error(`${product?.handle || id}: Identität weicht von Allowlist/Plan ab`);
  return true;
}

export function canaryLedgerPruefen(konf, ids) {
  const s = new Set(ids);
  if (konf.canary && (s.size !== 1 || !s.has(konf.canary.id))) throw new Error(`Canary-Ledger enthält nicht exakt das Canary-Produkt ${konf.canary.handle}`);
  return true;
}

export function releaseAusAllowlist(allowlist, { editorSha256, assetSha256, editor = null, vorgaengerSha256 = [] }) {
  if (!allowlist || allowlist.schema !== 1 || !Array.isArray(allowlist.products) || !Array.isArray(allowlist.blocked)) throw new Error('Quell-Allowlist: Schema 1/products/blocked fehlt');
  // Alter Pfad (6.3.1): die Allowlist trägt den Hash der lokalen Datei. Neuer Pfad (6.4.0): Ziel kommt aus
  // editor-release.json; die Allowlist (sie baut die Karten) darf noch den Hash eines Vorgängers tragen.
  let zielEditor;
  if (editor) {
    if (!HASH64.test(editor.sha256 || '') || !/^https:\/\/abannews\.com\/pod\/v6\/lspod-designer-v6-\d+\.\d+\.\d+\.js$/.test(editor.url || '')) throw new Error('Quell-Allowlist: Ziel-Editor aus editor-release.json unbrauchbar');
    if (![editor.sha256, ...vorgaengerSha256].includes(allowlist.editorSha256)) throw new Error('Quell-Allowlist: Editor-SHA gehört weder zum Ziel-Release noch zu einem Vorgänger');
    zielEditor = { url: editor.url, sha256: editor.sha256 };
  } else {
    if (!HASH64.test(editorSha256 || '') || allowlist.editorSha256 !== editorSha256) throw new Error('Quell-Allowlist: Editor-SHA weicht von der lokalen v6.3-Datei ab');
    zielEditor = { url: 'https://abannews.com/pod/v6/lspod-designer-v6-6.3.1.js', sha256: editorSha256 };
  }
  if (!(assetSha256 instanceof Map)) throw new Error('Quell-Allowlist: Asset-SHAs fehlen');

  const erwartet = new Map([...ALLOWLIST, ...BLOCKLIST.slice(1)].map((x) => [x.id, x]));
  const rows = new Map();
  for (const p of allowlist.products) {
    if (!p || rows.has(p.shopifyProductId)) throw new Error(`Quell-Allowlist: Produkt fehlt oder doppelt: ${p?.shopifyProductId || '?'}`);
    rows.set(p.shopifyProductId, p);
  }
  if (rows.size !== erwartet.size || [...erwartet].some(([id]) => !rows.has(id))) throw new Error(`Quell-Allowlist: erwartet ${erwartet.size} Printful-Produkte`);

  const dtf = allowlist.blocked.filter((p) => p?.shopifyProductId === BLOCKLIST[0].id && p?.handle === BLOCKLIST[0].handle && p?.reasons?.includes('NON_PRINTFUL_FULFILLMENT'));
  if (dtf.length !== 1) throw new Error('Quell-Allowlist: externer Bügeltransfer ist nicht eindeutig als NON_PRINTFUL_FULFILLMENT gesperrt');

  const preview = new Set(PREVIEW_IDS);
  const products = ALLOWLIST.map((a) => {
    const p = rows.get(a.id);
    if (p.handle !== a.handle || p.status !== 'ACTIVE') throw new Error(`Quell-Allowlist: Identität/Status weicht ab: ${a.handle}`);
    const sollPreview = preview.has(a.numericId);
    if (p.rolloutStatus !== (sollPreview ? 'ready-preview' : 'ready-binding')) throw new Error(`Quell-Allowlist: falscher Rollout-Status: ${a.handle}`);
    const card = `lspod-${a.numericId}.karte.json`;
    const vorschau = sollPreview ? `lspod-${a.numericId}.vorschau.json` : null;
    if (p.asset !== card || (p.previewAsset || null) !== vorschau) throw new Error(`Quell-Allowlist: Asset-Zuordnung weicht ab: ${a.handle}`);
    const variants = (p.variants || []).map((v) => String(v.shopifyVariantId || ''));
    if (!variants.length || variants.some((x) => !/^\d+$/.test(x)) || new Set(variants).size !== variants.length) throw new Error(`Quell-Allowlist: Varianten fehlen/doppelt: ${a.handle}`);
    const cardSha = assetSha256.get(card);
    const previewSha = vorschau ? assetSha256.get(vorschau) : null;
    if (!/^[a-f0-9]{64}$/.test(cardSha || '') || (vorschau && !/^[a-f0-9]{64}$/.test(previewSha || ''))) throw new Error(`Quell-Allowlist: lokaler Asset-SHA fehlt: ${a.handle}`);
    return {
      id: a.id, handle: a.handle,
      cardUrl: `https://abannews.com/pod/v6/maps/${card}`, cardSha256: cardSha,
      previewUrl: vorschau ? `https://abannews.com/pod/v6/maps/${vorschau}` : null,
      previewSha256: previewSha, variantIds: variants,
    };
  });

  for (const b of BLOCKLIST.slice(1)) {
    const p = rows.get(b.id);
    if (!p || p.handle !== b.handle || p.status !== 'ACTIVE' || p.rolloutStatus !== 'blocked') throw new Error(`Quell-Allowlist: Printful-Blocker weicht ab: ${b.handle}`);
  }
  return { schema: 1, editor: zielEditor, products };
}

/** `altOhneFreigeschaltete` (nur der Rollback setzt es): das Release eines Artefakts von VOR einer Freischaltung enthält die
 *  FREIGESCHALTET-Produkte noch nicht. Es bleibt lesbar; jedes andere fehlende Produkt wirft weiter. */
export function releasePruefen(release, { editorPfad = '/pod/v6/lspod-designer-v6-6.3.1.js', altOhneFreigeschaltete = false } = {}) {
  if (!release || release.schema !== 1 || !Array.isArray(release.products)) throw new Error('Release-Manifest: Schema 1/products fehlt');
  if (!release.editor || !assetPfad(release.editor.url, editorPfad) || !/^[a-f0-9]{64}$/.test(release.editor.sha256 || '')) {
    throw new Error('Release-Manifest: Editor-URL oder SHA-256 unbrauchbar');
  }
  const erlaubt = new Map(ALLOWLIST.map((x) => [x.id, x]));
  const gesehen = new Set();
  for (const p of release.products) {
    const a = erlaubt.get(p.id);
    if (!a || a.handle !== p.handle) throw new Error(`Release-Manifest: Produkt nicht erlaubt oder Handle falsch: ${p.id || '?'} ${p.handle || '?'}`);
    if (gesehen.has(p.id)) throw new Error(`Release-Manifest: Produkt doppelt: ${p.id}`);
    gesehen.add(p.id);
    if (!assetPfad(p.cardUrl, `/pod/v6/maps/lspod-${a.numericId}.karte.json`) || !/^[a-f0-9]{64}$/.test(p.cardSha256 || '')) throw new Error(`${p.handle}: Karten-URL/SHA unbrauchbar oder nicht dem Produkt zugeordnet`);
    const sollPreview = PREVIEW_IDS.includes(a.numericId);
    if (sollPreview && (!assetPfad(p.previewUrl, `/pod/v6/maps/lspod-${a.numericId}.vorschau.json`) || !/^[a-f0-9]{64}$/.test(p.previewSha256 || ''))) throw new Error(`${p.handle}: belegte Vorschau-URL/SHA fehlt oder ist nicht dem Produkt zugeordnet`);
    if (!sollPreview && (p.previewUrl != null || p.previewSha256 != null)) throw new Error(`${p.handle}: für dieses Produkt ist keine Produktprojektion belegt`);
    if (!Array.isArray(p.variantIds) || !p.variantIds.length || new Set(p.variantIds.map(String)).size !== p.variantIds.length) throw new Error(`${p.handle}: variantIds fehlen oder sind doppelt`);
  }
  const fehlend = ALLOWLIST.filter((x) => !gesehen.has(x.id));
  const nurFreigeschaltete = altOhneFreigeschaltete === true && fehlend.every((x) => freigeschaltet(x.id));
  if (fehlend.length && !nurFreigeschaltete) {
    throw new Error(`Release-Manifest: erwartet ${ALLOWLIST.length} Produkte, gefunden ${gesehen.size}; fehlt: ${fehlend.map((x) => x.handle).join(', ')}`);
  }
  const mitVorschau = release.products.filter((p) => p.previewUrl).length;
  const ohneVorschau = release.products.length - mitVorschau;
  if (mitVorschau !== PREVIEW_IDS.length || ohneVorschau !== ALLOWLIST.length - PREVIEW_IDS.length - fehlend.length) {
    throw new Error(`Release-Manifest: erwartet ${PREVIEW_IDS.length} ehrliche Produktvorschauen und ${ALLOWLIST.length - PREVIEW_IDS.length} Druckdatei-Ansichten, gefunden ${mitVorschau}/${ohneVorschau}`);
  }
  return true;
}

export function baustein({ product, releaseProduct, editor }) {
  const varianten = product.variants?.nodes || [];
  const standard = varianten.find((v) => v.availableForSale) || varianten[0];
  if (!standard) throw new Error(`${product.handle}: keine Shopify-Variante`);
  const attrs = [
    ['class', 'lspod-designer-v6'],
    ['data-variant', numericId(standard.id)],
    ['data-karte-url', assetUrl(releaseProduct.cardUrl, releaseProduct.cardSha256)],
    ['data-karte-pflicht', '1'],
    ['data-produkttitel', product.title],
  ];
  if (releaseProduct.previewUrl) attrs.push(['data-vorschau-url', assetUrl(releaseProduct.previewUrl, releaseProduct.previewSha256)]);
  const div = attrs.map(([k, v]) => `${k}="${attr(v)}"`).join(' ');
  return `<!-- lx-v63-editor:start product=${releaseProduct.id} card=${releaseProduct.cardSha256} -->\n<div ${div}></div>\n<script src="${attr(assetUrl(editor.url, editor.sha256))}" integrity="${attr(integritySha256(editor.sha256))}" crossorigin="anonymous" defer></script>\n<hr>\n<!-- lx-v63-editor:end -->\n`;
}

function editorScript(editor) {
  return `<script src="${attr(assetUrl(editor.url, editor.sha256))}" integrity="${attr(integritySha256(editor.sha256))}" crossorigin="anonymous" defer></script>`;
}

// Platzhalter mit Steuerzeichen: kommt in einer Beschreibung nicht vor (der Planer prüft es und bricht sonst ab).
const PH = '\u0001';
/** Normalisiert genau die Felder, die ein Editor-Release verändern darf, zu Platzhaltern:
 *  das Editor-Script-Tag (Dateiname, `?v=`, SRI), das `card=` im Marker, das `?v=` von
 *  `data-karte-url` und `data-vorschau-url`. Der Pfad der Karte/Vorschau bleibt im Text stehen. */
export function editorBlockNormalisieren(text, scriptTags) {
  let t = String(text);
  if (t.includes(PH)) throw new Error('Beschreibung enthält ein Steuerzeichen, das der Editor-Planer als Platzhalter nutzt');
  for (const s of scriptTags) t = t.split(s).join(`${PH}script${PH}`);
  return t
    .replace(/(<!-- lx-v63-editor:start product=gid:\/\/shopify\/Product\/\d+ card=)[a-f0-9]{64}( -->)/g, `$1${PH}card${PH}$2`)
    .replace(/(\bdata-karte-url="[^"?]*)\?v=[a-f0-9]{16}"/g, `$1?v=${PH}karte${PH}"`)
    .replace(/(\bdata-vorschau-url="[^"?]*)\?v=[a-f0-9]{16}"/g, `$1?v=${PH}vorschau${PH}"`);
}

/** Ein Editor-Release (z. B. 6.4.0) darf in einer bestehenden Produktbeschreibung ausschliesslich ändern:
 *  das Editor-Script-Tag samt Dateiname, URL-Version und SRI, das `?v=` von `data-karte-url` und
 *  `data-vorschau-url` und das `card=` im Marker (Karte/Vorschau können seit dem letzten Rollout neu gebaut
 *  worden sein, z. B. die zwei T-Shirt-Produkte mit Commit 1835d4361d). Alles andere bleibt bytegleich;
 *  der Pfad der Karte, Titel, Variante, Pflichtkarte, ein zweiter Marker oder ein fremdes Skript stoppen.
 *  Zulässige Ausgangslagen: genau EIN Vorgänger-Script (alt) und kein Ziel-Script, oder das Ziel-Script
 *  steht schon da und die Beschreibung bleibt bytegleich (geaendert=false). Jede andere Lage wirft.
 *  `vorgaenger` ist die Liste erlaubter Vorgänger ({url, sha256}); Vorgabe wie bisher nur 6.3.0. */
export function editorReleasePlanen(alt, neuerBaustein, editor, { vorgaenger = [VORHER_EDITOR] } = {}) {
  const text = String(alt || '');
  const marker = text.match(/<!-- lx-v63-editor:start\b[\s\S]*?<!-- lx-v63-editor:end -->\s*/giu) || [];
  if (marker.length !== 1) throw new Error(`Editor-Release braucht genau einen bestehenden v6-Marker, gefunden ${marker.length}`);
  const ziel = editorScript(editor);
  const vorgScripts = vorgaenger.map(editorScript);
  const zielAnzahl = text.split(ziel).length - 1;
  const vorgAnzahl = vorgScripts.map((s) => text.split(s).length - 1);
  const vorgSumme = vorgAnzahl.reduce((a, b) => a + b, 0);
  const geplant = beschreibungPlanen(text, neuerBaustein);
  if (geplant.nachher.split(ziel).length - 1 !== 1) throw new Error('Editor-Release: der neue Baustein trägt nicht genau einmal das Ziel-Release');
  if (zielAnzahl === 0 && vorgSumme === 1) {
    const istScript = vorgScripts[vorgAnzahl.indexOf(1)];
    if (editorBlockNormalisieren(text, [istScript]) !== editorBlockNormalisieren(geplant.nachher, [ziel])) {
      throw new Error('Editor-Release würde ausser Dateiname, URL-Version, SRI, Karten-/Vorschau-Version oder Karten-Hash weitere Beschreibungsbytes ändern');
    }
    return geplant;
  }
  if (zielAnzahl === 1 && vorgSumme === 0 && geplant.nachher === text) return geplant;
  throw new Error(`Editor-Release-Ausgangslage unzulässig (alt=${vorgSumme}, neu=${zielAnzahl})`);
}

/** Trägt die Beschreibung (noch) einen Sperrbaustein? Massgeblich ist der Marker, den nur blockerBaustein schreibt. */
export function sperreLiegtVor(html) {
  return /<!-- lx-v63-editor:start product=gid:\/\/shopify\/Product\/\d+ mode=blocked -->/.test(String(html || ''));
}

/** Freischaltung eines früheren Sperrprodukts (FREIGESCHALTET): die Beschreibung trägt noch den Sperrbaustein.
 *  Zulässig ist genau EIN Übergang: der eine Marker-Block ist BYTEGLEICH der Sperrbaustein aus dem Generator (alter Grundtext,
 *  heutige Varianten des Produkts) und wird durch den Editor-Baustein mit dem Ziel-Release ersetzt. Alles ausserhalb des Blocks
 *  bleibt bytegleich. Jede andere Lage wirft: von Hand veränderte Sperre, zweiter Marker, anderes Produkt, Reste der Sperre. */
export function freischaltungPlanen(alt, neuerBaustein, editor, { product, frei } = {}) {
  if (!frei || !freigeschaltet(frei.id) || freigeschaltet(frei.id).handle !== frei.handle || !product || product.id !== frei.id || product.handle !== frei.handle) {
    throw new Error(`${product?.handle || frei?.handle || '?'}: Freischaltung ist für dieses Produkt nicht vorgesehen`);
  }
  const text = String(alt || '');
  const marker = text.match(/<!-- lx-v63-editor:start\b[\s\S]*?<!-- lx-v63-editor:end -->\s*/giu) || [];
  if (marker.length !== 1) throw new Error(`Freischaltung braucht genau einen bestehenden Marker, gefunden ${marker.length}`);
  const sperre = blockerBaustein({ product, blocker: freigeschaltet(frei.id) });
  if (marker[0] !== sperre) throw new Error(`${frei.handle}: Sperrbaustein weicht vom Generator ab; Freischaltung nur aus der unveränderten Sperre`);
  const ziel = editorScript(editor);
  const geplant = beschreibungPlanen(text, neuerBaustein);
  if (geplant.nachher.split(ziel).length - 1 !== 1) throw new Error('Freischaltung: der neue Baustein trägt nicht genau einmal das Ziel-Release');
  const pos = text.indexOf(sperre);
  if (geplant.nachher !== text.slice(0, pos) + neuerBaustein + text.slice(pos + sperre.length)) throw new Error('Freischaltung würde Bytes ausserhalb des Sperrbausteins ändern');
  if (!neuerBaustein.startsWith(`<!-- lx-v63-editor:start product=${frei.id} card=`)) throw new Error('Freischaltung: der neue Baustein gehört nicht zu diesem Produkt');
  if (/lspod-v63-blocked|data-lspod-blocked|mode=blocked/.test(geplant.nachher)) throw new Error('Freischaltung: Reste der Sperre blieben in der Beschreibung');
  return { ...geplant, freischaltung: true };
}

export function blockerBaustein({ product, blocker }) {
  const varianten = (product.variants?.nodes || []).map((v) => numericId(v.id)).filter((x) => /^\d+$/.test(x));
  if (!varianten.length) throw new Error(`${product.handle}: keine Shopify-Variante für den Sperrbaustein`);
  const ids = JSON.stringify(varianten);
  return `<!-- lx-v63-editor:start product=${blocker.id} mode=blocked -->\n` +
    `<style>html:has([data-lspod-blocked="${attr(blocker.numericId)}"]) form[action*="/cart/add"] button[type="submit"],html:has([data-lspod-blocked="${attr(blocker.numericId)}"]) form[action*="/cart/add"] input[type="submit"],html:has([data-lspod-blocked="${attr(blocker.numericId)}"]) .shopify-payment-button{pointer-events:none!important;opacity:.45!important}</style>\n` +
    `<div id="lspod-start" class="lspod-v63-blocked" data-lspod-blocked="${attr(blocker.numericId)}" role="status" style="padding:20px;border:1px solid #b9a998;border-radius:12px;background:#f8f4ef;color:#2a2521">\n` +
    `<h2 style="margin:0 0 8px">Personalisierung derzeit nicht bestellbar</h2>\n` +
    `<p style="margin:0">${attr(blocker.reason)} Wir schalten die Gestaltung erst nach der technischen Prüfung frei.</p>\n` +
    `</div>\n` +
    `<script>(function(s){var ids=${ids};var root=s.previousElementSibling;function ours(f){var i=f&&f.querySelector&&f.querySelector('[name="id"]');return !!(i&&ids.indexOf(String(i.value))>=0)}function warn(e){e.preventDefault();e.stopImmediatePropagation();root&&root.scrollIntoView({behavior:'smooth',block:'center'})}function submit(e){if(ours(e.target))warn(e)}function click(e){var b=e.target&&e.target.closest&&e.target.closest('button,input[type="submit"],.shopify-payment-button');var f=b&&b.closest&&b.closest('form[action*="/cart/add"]');if((f&&ours(f))||(b&&b.closest&&b.closest('.shopify-payment-button')))warn(e)}function lock(){var msg='Personalisierung derzeit nicht bestellbar';document.querySelectorAll('div.lspod-designzwang > a.button.lspod-designzwang__button[href="#lspod-start"]').forEach(function(a){if(a.textContent!==msg)a.textContent=msg;a.setAttribute('title',msg);a.setAttribute('aria-label',msg);a.setAttribute('data-lspod-v63-blocked-cta','1')});document.querySelectorAll('form[action*="/cart/add"]').forEach(function(f){if(!ours(f))return;f.querySelectorAll('button[type="submit"],input[type="submit"],button[name="add"]').forEach(function(b){b.disabled=true;b.setAttribute('aria-disabled','true');b.setAttribute('title','Personalisierung derzeit nicht bestellbar')});f.querySelectorAll('.shopify-payment-button').forEach(function(b){b.hidden=true;b.setAttribute('aria-hidden','true')})})}document.addEventListener('submit',submit,true);document.addEventListener('click',click,true);document.addEventListener('change',lock,true);new MutationObserver(lock).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lock,{once:true});else lock()})(document.currentScript);</script>\n` +
    `<!-- lx-v63-editor:end -->\n`;
}

export function beschreibungPlanen(html, neu, { blocked = false } = {}) {
  const alt = String(html || '');
  const marker = [...alt.matchAll(MARKER)];
  const ohneMarker = alt.replace(MARKER, '');
  const legacy = [...ohneMarker.matchAll(LEGACY)];
  if (marker.length > 1 || legacy.length > 1 || (marker.length && legacy.length)) throw new Error(`Editor-Baustein nicht eindeutig (Marker ${marker.length}, Alt ${legacy.length})`);
  let nachher;
  if (marker.length === 1) nachher = alt.replace(MARKER, neu);
  else if (legacy.length === 1) nachher = alt.replace(LEGACY, neu);
  else throw new Error('Kein bestehender Editor-Baustein gefunden');
  const merk = (nachher.match(/lx-v63-editor:start/g) || []).length;
  const editor = (nachher.match(/class="lspod-designer-v6"/g) || []).length;
  const sperre = (nachher.match(/class="lspod-v63-blocked"[^>]*data-lspod-blocked=/g) || []).length;
  if (merk !== 1 || (!blocked && editor !== 1) || (blocked && (editor !== 0 || sperre !== 1))) throw new Error('Neuer Editor-/Sperrbaustein nicht eindeutig');
  if (/class=(['"])[^'"]*\blspod-designer\b(?!-v6)/i.test(nachher)) throw new Error('Alter v5-Container blieb in der Beschreibung');
  return { vorher: alt, nachher, vorherSha256: sha256(alt), nachherSha256: sha256(nachher), geaendert: alt !== nachher };
}

/** `kaufbarPflicht: false` setzt nur der Planer, und nur für ein FREIGESCHALTET-Produkt, das noch die Sperre trägt und in diesem
 *  Lauf NICHT geschrieben wird (seine Bestandssperre ist dann erwartet). Jeder Schreiblauf prüft die Kaufbarkeit. */
export function produktPruefen(product, releaseProduct, { kaufbarPflicht = true } = {}) {
  const a = ALLOWLIST.find((x) => x.id === product.id);
  if (!a || product.handle !== a.handle || releaseProduct.id !== a.id || releaseProduct.handle !== a.handle) throw new Error(`${product.handle || product.id}: Identität weicht von der Allowlist ab`);
  if (product.status !== 'ACTIVE') throw new Error(`${product.handle}: Status ${product.status}, erwartet ACTIVE`);
  if (!product.onlineStoreUrl || !/^https:\/\/luxestyle\.ch\/products\//.test(product.onlineStoreUrl)) throw new Error(`${product.handle}: keine bestätigte Storefront-URL`);
  if (product.variants?.pageInfo?.hasNextPage) throw new Error(`${product.handle}: Variantenabfrage ist unvollständig`);
  const varianten = product.variants?.nodes || [];
  if (kaufbarPflicht !== false && !varianten.some((v) => v.availableForSale)) {
    throw new Error(`${product.handle}: keine kaufbare Variante${freigeschaltet(product.id) ? ' (Bestandssperre noch aktiv? Zuerst die Kaufbarkeit dieses Produkts wiederherstellen: dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs mit ZURUECK=1 LIVE=1 NUR=' + product.handle + ')' : ''}`);
  }
  const ist = sortIds(varianten.map((v) => numericId(v.id)));
  const soll = sortIds(releaseProduct.variantIds);
  if (JSON.stringify(ist) !== JSON.stringify(soll)) throw new Error(`${product.handle}: Varianten-Scope weicht ab (Shop ${ist.length}, Release ${soll.length})`);
  return true;
}

export function blockerProduktPruefen(product, blocker, variantIds = null) {
  const b = BLOCKLIST.find((x) => x.id === product.id);
  if (!b || b.id !== blocker.id || b.handle !== blocker.handle || product.handle !== b.handle) throw new Error(`${product.handle || product.id}: Blocker-Identität weicht ab`);
  if (product.status !== 'ACTIVE') throw new Error(`${product.handle}: Status ${product.status}, erwartet ACTIVE`);
  if (!product.onlineStoreUrl || !/^https:\/\/luxestyle\.ch\/products\//.test(product.onlineStoreUrl)) throw new Error(`${product.handle}: keine bestätigte Storefront-URL`);
  if (product.variants?.pageInfo?.hasNextPage) throw new Error(`${product.handle}: Variantenabfrage ist unvollständig`);
  const ist = sortIds((product.variants?.nodes || []).map((v) => numericId(v.id)));
  if (!ist.length) throw new Error(`${product.handle}: keine Shopify-Variante für den Sperrbaustein`);
  if (variantIds && JSON.stringify(ist) !== JSON.stringify(sortIds(variantIds))) throw new Error(`${product.handle}: Varianten-Scope weicht vom Sperrplan ab`);
  return true;
}
