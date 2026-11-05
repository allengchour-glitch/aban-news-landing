#!/usr/bin/env node
/**
 * «Modell-Fabrik» für «Selbst gestalten»: aus Printful-Katalogdateien den PLAN für Shopify-Produkte erzeugen (Trockenlauf, Vorgabe) und nach Prüfung als ENTWURF anlegen (LIVE=1).
 * Doku, Beispiele, Live-Plan: dropship/selbst-gestalten-fertig-0511/fabrik/README.md
 *
 * TROCKENLAUF (Vorgabe): liest nur Dateien, schreibt Plan-JSON-Dateien, eine Tabelle und den Chargenplan nach OUT. Kein Netz, nichts bei Shopify oder Printful.
 *   KATALOG_DIR=<Ordner mit <id>.json>  VERSAND=<versand_alle.json>  [MODELLE=760,403,… | ALLE=1]  [UEBERSETZUNGEN=<Ordner>]  [SCHAETZUNG=<schaetzung_alle.json>]
 *   [BILDER=<bilder_masse.json>]  [ABGLEICH=<katalog_abgleich.json>]  [BESTAND=<matrix.json>]  [STUFEN=1|1,2]  [UEBERSEE=0]  [OUT=<Ordner>]  [START=<JJJJ-MM-TT>]
 *   [VERBRAUCHT24H=<Zahl>]  [GRUNDLAST=<Zahl>]  [PRO_LAUF=<Zahl>]
 * LIVE=1 (nur nach Trockenlauf): legt die Produkte des geprüften Plans als DRAFT an.
 *   LIVE=1 PLAN=<OUT/plan.json aus dem Trockenlauf> LSPOD_EDITOR_URL=<https-Adresse des Editor-Skripts> LEDGER=<Pfad> [ONLY=<handle,…>] [VARIANT_BUDGET=<Zahl>] [MAX_PRO_LAUF=3000]
 *   SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (nie ausgeben). Der Plan-Hash muss dem frisch berechneten gleichen, die Daten höchstens DATEN_MAX_ALTER_H (72) Stunden alt.
 * ZURUECK=1 LIVE=1 LEDGER=<Pfad>: löscht NUR Ledger-Produkte, die noch DRAFT sind (siehe anlegen.mjs).
 * Exit: 0 ok · 1 Fehler · 2 Lauf-Grenze (Rest morgen) · 3 Abweichung · 4 Tageslimit für neue Varianten · 5 Produkt gesperrt (Tor nicht bestanden)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planeModell, hashVon, tabellenZeile } from './plan.mjs';
import { chargenPlan } from './charge.mjs';
import { ladeUebersetzung } from './beschreibung.mjs';
import { lauf, zuruecknehmen } from './anlegen.mjs';
import { titelVoll, einheitenFamilie } from './glossar.mjs';
import { sperreNehmen } from './sperre.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
export const UEBERSETZUNGEN_STANDARD = resolve(HIER, '../../dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen');
export const DATEN_MAX_ALTER_H = 72;
const lies = (f) => JSON.parse(readFileSync(f, 'utf8'));
const liste = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

/** Modelle, die schon in einem Shop-Produkt stecken (katalog_abgleich.json: zeilen[].katalog_produkte[].id und produkte_aus_variant_ids). */
export function verwendeteAusAbgleich(a) {
  const s = new Set();
  for (const z of a?.zeilen ?? []) { for (const k of z.katalog_produkte ?? []) s.add(k.id); for (const i of z.produkte_aus_variant_ids ?? []) s.add(i); }
  return s;
}
/** Handles, SKUs und volle Titel der heutigen Produkte (matrix.json der Messung vom 05.11.2026). */
export function bestandAusMatrix(m) {
  const handles = new Set(), skus = new Set(), titel = new Set();
  for (const p of m ?? []) { handles.add(p.handle); titel.add(String(p.titel ?? '')); for (const v of p.varianten ?? []) if (v.sku) skus.add(v.sku); }
  return { handles, skus, titel };
}
/** {printfulVariantId: Zwischensumme USD} aus schaetzung_alle.json ({vid:{zwischensumme}}) oder einer schlichten Zuordnung. */
export function schaetzungAus(j) {
  const q = j?.vid ?? j ?? {}; const o = {};
  for (const [k, v] of Object.entries(q)) { const n = typeof v === 'number' ? v : v?.zwischensumme; if (Number.isFinite(n) && !v?.fehler) o[k] = n; }
  return o;
}
/** Kandidaten: alle Katalogdateien, deren technische Klasse in den freigegebenen Stufen liegt und die noch nicht verkauft werden (grobe Vorauswahl, die Tore entscheiden danach). */
export function modelleAusOrdner(dir) {
  return readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).map((f) => parseInt(f, 10)).sort((a, b) => a - b);
}

/** Familien (Einheiten-Geschwister, z. B. Poster (in) und Poster (cm)) der Modelle, die ein heutiges Produkt schon verkauft: der Titel steht in den Katalogdateien. */
export function verwendeteFamilienAus(katalogDir, verwendet) {
  const s = new Set();
  for (const id of verwendet ?? []) {
    const f = join(katalogDir, `${id}.json`);
    if (!existsSync(f)) continue;
    try { const fam = einheitenFamilie(lies(f).produkt?.title); if (fam) s.add(fam); } catch { /* unlesbare Datei: keine Familie */ }
  }
  return s;
}

export function planeAlle({ katalogDir, ids, versand, uebersetzungenDir, schaetzung, bilder, verwendet, verwendeteFamilien, versandVarianten, bestand, stufen, uebersee, jetzt }) {
  const plaene = [];
  const schonHandles = new Set(bestand?.handles ?? []), schonSkus = new Set(bestand?.skus ?? []), schonTitel = new Set(bestand?.titel ?? []);
  for (const id of ids) {
    const f = join(katalogDir, `${id}.json`);
    if (!existsSync(f)) { plaene.push({ printfulProductId: id, anlegbar: false, fehler: 'Katalogdatei fehlt', tore: [{ code: 'katalog', name: 'Katalogdatei lesbar', art: 'blocker', ergebnis: 'durchgefallen', grund: 'Datei fehlt' }] }); continue; }
    const p = planeModell({ katalog: lies(f), versand: versand?.[id] ?? null, schaetzung, bilder, uebersetzung: ladeUebersetzung(uebersetzungenDir, id) },
      { jetzt, schonHandles, schonSkus, schonTitel, verwendeteModelle: verwendet, verwendeteFamilien, versandVarianten, stufen, uebersee });
    plaene.push(p);
    if (p.handle) schonHandles.add(p.handle);          // zwei Modelle der Charge dürfen nicht denselben Handle bekommen
    if (p.titel) schonTitel.add(p.titel);
  }
  return plaene;
}

export function tabelleMarkdown(plaene) {
  const z = ['| Modell | Titel | Klasse | Stufe | Varianten | Preis CHF | Netto min | Tore (Blocker) | Durchgefallen / ungeprüft | Hinweise (blockieren nicht) |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const p of plaene) {
    const r = tabellenZeile(p);
    const preis = r.preisMin == null ? '' : (r.preisMin === r.preisMax ? r.preisMin.toFixed(2) : `${r.preisMin.toFixed(2)} bis ${r.preisMax.toFixed(2)}`);
    const nBl = (p.tore ?? []).filter((t) => t.art === 'blocker').length;
    const prob = [...r.durchgefallen, ...r.ungeprueft.map((c) => `${c} (ungeprüft)`)].join('; ') || 'keine';
    const hin = (p.tore ?? []).filter((t) => t.art === 'hinweis' && t.ergebnis === 'durchgefallen').map((t) => t.code).join(', ') || 'keine';
    z.push(`| ${r.modell} | ${r.titel ?? ''} | ${r.klasse ?? ''} | ${r.stufe ?? ''} | ${r.varianten} | ${preis} | ${r.nettoMin == null ? '' : r.nettoMin.toFixed(2)} | ${r.bestanden} von ${nBl} bestanden | ${prob} | ${hin} |`);
  }
  return z.join('\n') + '\n';
}

/** Zur Sichtprüfung der Titel: englisch, deutsch, Herkunft, Auffälligkeiten. Nur Modelle, die überhaupt einen Titel haben und gestaltbar sind. */
export const FREMDWOERTER = /\b(Heavyweight|Oversize|Relaxed|Premium|Basic|Urban|Luxe|Vintage|Eco|Cropped|Raglan|French Terry|Quarter-Zip|Half-Zip|Bodycon|Snapback|Kiss-Cut|Allover|Sherpa|Fleece|Denim|Crop-Top|Sport)\b/;
export function titelTabelle(plaene) {
  const z = ['| Modell | Englischer Titel | Deutscher Titel | Herkunft | Auffälligkeit |', '|---|---|---|---|---|'];
  for (const p of plaene) {
    if (!p.titel || p.stufe == null) continue;
    const auf = [];
    if (p.titelUnterscheidung) auf.push(`Zusatz ${p.titelUnterscheidung}`);
    if (FREMDWOERTER.test(p.titel)) auf.push('englisches Fremdwort bleibt');
    if (p.titel.split(' ').length > 7) auf.push('lang');
    if ((p.titelUnbekannt ?? []).length) auf.push(`unbekannt: ${p.titelUnbekannt.join(', ')}`);
    z.push(`| ${p.printfulProductId} | ${String(p.titelEn).replace(/\|/g, '/')} | ${p.titel} | ${p.titelQuelle} | ${auf.join('; ')} |`);
  }
  return z.join('\n') + '\n';
}

export function planDatei(plaene, erzeugt) {
  return { schema: 'pod-modell-plaene/1', erzeugt, hash: hashVon(plaene.map((p) => p.hash ?? null)), plaene };
}

export async function main(env = process.env, deps = {}) {
  const log = deps.log ?? console.log;
  const jetzt = (deps.jetzt ?? (() => new Date().toISOString()))();
  const LIVE = env.LIVE === '1';
  const katalogDir = env.KATALOG_DIR;
  const out = env.OUT || './pod_modell_out';
  const ledgerPfad = env.LEDGER || null;

  // ── Rücknahme braucht keinen Katalog
  if (env.ZURUECK === '1') {
    if (!LIVE) { log('ZURUECK=1 ohne LIVE=1: es wird nichts gelöscht. Mit LIVE=1 ZURUECK=1 LEDGER=<Pfad> löscht das Werkzeug nur Ledger-Produkte, die noch DRAFT sind.'); return 0; }
    if (!ledgerPfad) { log('ZURUECK braucht LEDGER=<Pfad>'); return 1; }
    const sperre = sperreNehmen(ledgerPfad, deps.sperre ?? {});
    if (!sperre.ok) { log(`ZURUECK verweigert: ${sperre.grund}`); return 1; }
    try {
      const gql = await (deps.gqlHolen ?? gqlHolen)(env);
      const r = await zuruecknehmen({ gql, ledgerPfad, log, jetzt: () => jetzt, nur: env.ONLY ? liste(env.ONLY) : null });
      log(`ENDE: Exit ${r.exit}`); return r.exit;
    } finally { sperre.freigeben(); }
  }

  if (!katalogDir || !env.VERSAND) { log('KATALOG_DIR und VERSAND sind Pflicht (siehe Kopf der Datei).'); return 1; }
  const stufen = liste(env.STUFEN || '1').map(Number);
  const abgleich = env.ABGLEICH && existsSync(env.ABGLEICH) ? lies(env.ABGLEICH) : null;
  const verwendet = verwendeteAusAbgleich(abgleich);
  const bestand = env.BESTAND && existsSync(env.BESTAND) ? bestandAusMatrix(lies(env.BESTAND)) : null;
  const schaetzung = env.SCHAETZUNG && existsSync(env.SCHAETZUNG) ? schaetzungAus(lies(env.SCHAETZUNG)) : null;
  const bilder = env.BILDER && existsSync(env.BILDER) ? Object.fromEntries(Object.entries(lies(env.BILDER)).filter(([, x]) => x && x.w)) : null;
  const versand = lies(env.VERSAND);
  const versandVarianten = env.VERSAND_VARIANTEN && existsSync(env.VERSAND_VARIANTEN) ? lies(env.VERSAND_VARIANTEN) : null;
  const verwendeteFamilien = verwendeteFamilienAus(katalogDir, verwendet);
  const ids = env.MODELLE ? liste(env.MODELLE).map(Number) : modelleAusOrdner(katalogDir);
  if (!ids.length) { log('keine Modelle'); return 1; }
  const plaene = planeAlle({ katalogDir, ids, versand, uebersetzungenDir: env.UEBERSETZUNGEN || UEBERSETZUNGEN_STANDARD, schaetzung, bilder, verwendet, verwendeteFamilien, versandVarianten, bestand, stufen, uebersee: env.UEBERSEE !== '0', jetzt });
  const erzeugt = { am: jetzt, stufen, modelle: ids.length, schaetzung: Boolean(schaetzung), bilderGemessen: Boolean(bilder), abgleich: Boolean(abgleich), bestand: Boolean(bestand), versandJeVariante: Boolean(versandVarianten) };
  const datei = planDatei(plaene, erzeugt);
  const anlegbar = plaene.filter((p) => p.anlegbar);
  log(`Plan «Selbst gestalten: Modell-Fabrik» · ${LIVE ? 'LIVE' : 'Trockenlauf'} · ${ids.length} Modelle, ${anlegbar.length} anlegbar, ${plaene.length - anlegbar.length} gesperrt · Stufen ${stufen.join(',')} · Plan-Hash ${datei.hash.slice(0, 16)}`);

  if (!LIVE) {
    mkdirSync(out, { recursive: true });
    for (const p of plaene) writeFileSync(join(out, `${p.printfulProductId}.json`), JSON.stringify(p, null, 1));
    writeFileSync(join(out, 'plan.json'), JSON.stringify(datei));
    writeFileSync(join(out, 'tabelle.md'), tabelleMarkdown(plaene));
    writeFileSync(join(out, 'titel.md'), titelTabelle(plaene));
    const start = env.START || jetzt.slice(0, 10);
    const ch = chargenPlan(plaene, { start, verbraucht24h: env.VERBRAUCHT24H ? Number(env.VERBRAUCHT24H) : null, grundlast: env.GRUNDLAST ? Number(env.GRUNDLAST) : undefined, proLauf: env.PRO_LAUF ? Number(env.PRO_LAUF) : undefined });
    writeFileSync(join(out, 'chargen.json'), JSON.stringify(ch, null, 1));
    for (const t of ch.tage) log(`Charge ${t.lauf} (${t.tag}): ${t.handles.length} Produkte, ${t.varianten} von ${t.kapazitaet} Varianten`);
    log(`Dateien in ${out}: ${plaene.length} Plan-Dateien, plan.json, tabelle.md, titel.md, chargen.json`);
    log('ENDE: Exit 0 – Trockenlauf, nichts angelegt');
    return 0;
  }

  // ── LIVE: nur der geprüfte Plan
  if (!env.PLAN || !existsSync(env.PLAN)) { log('LIVE=1 verweigert: PLAN=<plan.json des Trockenlaufs> fehlt. Erst Trockenlauf, Tabelle ansehen, dann LIVE mit demselben Plan.'); return 1; }
  const geprueft = lies(env.PLAN);
  if (geprueft.hash !== datei.hash) { log(`LIVE=1 verweigert: der frisch berechnete Plan (${datei.hash.slice(0, 16)}) weicht vom geprüften (${String(geprueft.hash).slice(0, 16)}) ab. Neuen Trockenlauf ansehen.`); return 3; }
  if (!geprueft.erzeugt?.abgleich || !geprueft.erzeugt?.bestand || !abgleich || !bestand) { log('LIVE=1 verweigert: ABGLEICH (katalog_abgleich.json) und BESTAND (matrix.json) sind Pflicht, im Trockenlauf UND jetzt. Ohne sie sind die Tore modell_neu, handle_frei und sku_eindeutig wirkungslos (ein Modell, das schon verkauft wird, oder ein vergebener Handle fielen nicht auf).'); return 1; }
  const maxH = Number(env.DATEN_MAX_ALTER_H || DATEN_MAX_ALTER_H);
  const geholt = plaene.map((p) => p.erzeugt?.katalogGeholt).filter(Boolean).sort()[0];
  const alterH = geholt ? (Date.parse(jetzt) - Date.parse(geholt)) / 3.6e6 : Infinity;
  const mtime = deps.mtime ?? ((f) => statSync(f).mtimeMs);
  const zuAlt = [];
  if (!(alterH <= maxH)) zuAlt.push(`Katalog ${Number.isFinite(alterH) ? alterH.toFixed(0) + ' h' : 'unbekannt'}`);
  // alle Eingabedateien: Versandraten, Abgleich, Bestand, Kostenschätzung, Bildmessung, Versand je Variante (Fund Gegenleser: früher wurden nur Katalog und Versand geprüft)
  for (const [name, f] of [['Versandraten', env.VERSAND], ['Abgleich', env.ABGLEICH], ['Bestand', env.BESTAND], ['Kostenschätzung', env.SCHAETZUNG], ['Bildmessung', env.BILDER], ['Versand je Variante', env.VERSAND_VARIANTEN]]) {
    if (!f || !existsSync(f)) continue;
    const h = (Date.parse(jetzt) - mtime(f)) / 3.6e6;
    if (!(h <= maxH)) zuAlt.push(`${name} ${Number.isFinite(h) ? h.toFixed(0) + ' h' : 'unbekannt'}`);
  }
  if (zuAlt.length) { log(`LIVE=1 verweigert: Daten zu alt (${zuAlt.join(', ')}; erlaubt ${maxH} h). Neu holen, neuen Trockenlauf ansehen.`); return 1; }
  if (!ledgerPfad) { log('LIVE=1 verweigert: LEDGER=<Pfad> fehlt (ohne Ledger wäre ein Wiederholen nicht sicher).'); return 1; }
  const editorUrl = env.LSPOD_EDITOR_URL;
  if (!editorUrl || !/^https:\/\//.test(editorUrl)) { log('LIVE=1 verweigert: LSPOD_EDITOR_URL (https-Adresse des Editor-Skripts) fehlt. Der Platzhalter darf nie in den Shop.'); return 1; }
  const sperre = sperreNehmen(ledgerPfad, deps.sperre ?? {});
  if (!sperre.ok) { log(`LIVE=1 verweigert: ${sperre.grund}`); return 1; }
  if (sperre.uebernommen) log(sperre.uebernommen);
  try {
    const gql = await (deps.gqlHolen ?? gqlHolen)(env);
    const r = await lauf({ plaene, gql, ledgerPfad, editorUrl, log, jetzt: () => new Date().toISOString(), variantenBudget: env.VARIANT_BUDGET ? Number(env.VARIANT_BUDGET) : null, maxProLauf: env.MAX_PRO_LAUF ? Math.min(3000, Number(env.MAX_PRO_LAUF)) : 3000, nur: env.ONLY ? liste(env.ONLY) : null, sicherungsDir: env.SICHERUNG || join(dirname(ledgerPfad), 'sicherung') });
    log(`ENDE: Exit ${r.exit} – ${r.ergebnisse.map((x) => `${x.handle}:${x.status}`).join(', ')}`);
    return r.exit;
  } finally { sperre.freigeben(); }
}

async function gqlHolen(env) {
  const { shopifyClientSecret } = await import('../lib/shopify_secret.mjs');
  const { gqlFuer, API_VERSION } = await import('../lib/pod_auswahl_gql.mjs');
  const shop = env.SHOPIFY_SHOP;
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) throw new Error('Kein Shopify-Token');
  return gqlFuer({ shop, api: API_VERSION, token: tok });
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().then((c) => process.exit(c)).catch((e) => { console.error('Fataler Fehler:', e.message); process.exit(1); });
}
export { titelVoll };
