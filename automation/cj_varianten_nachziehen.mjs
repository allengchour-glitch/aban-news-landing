#!/usr/bin/env node
/**
 * CJ-Varianten nachziehen: macht aus einem Ein-Varianten-Produkt (Default Title) die echte Auswahl,
 * die CJ führt — Farbe / Grösse, je Variante ein eigenes Bild, nur lieferbare Varianten.
 *
 * TROCKENLAUF IST VORGABE. Geschrieben wird nur mit LIVE=1.
 *
 * Aufruf:
 *   node automation/cj_varianten_nachziehen.mjs <handle> [<handle> ...]
 *   HANDLES_DATEI=pfad.csv LIMIT=20 node automation/cj_varianten_nachziehen.mjs     (erste Spalte = handle)
 * Schalter:
 *   LIVE=1            schreibt (productSet), sonst nur Plan
 *   LIMIT=n           höchstens n Produkte je Lauf (Vorgabe 10)
 *   PLAN_DIR=pfad     Plan je Produkt als JSON (Vorgabe /tmp/cj_varianten_plan)
 *   USD_CHF=0.82435   Kurs
 *
 * Ergebnisse je Produkt: PLAN | GESCHRIEBEN | UEBERSPRUNGEN(grund) | FEHLER. Ein Überspringen ist KEIN Fehler:
 * CJ führt nur eine Variante, der Schlüssel ist nicht eindeutig zerlegbar, Fracht unbekannt …
 *
 * Gelernt (25.10.2026): ein Produkt kann bei CJ 9 Varianten haben und im Shop eine — die Galerie zeigt dann
 * alle Farben, die Kundin kann keine wählen. Nie raten, welche Variante bisher verkauft wurde: die SKU im Shop
 * ist `CJ-<pid>`, die Zuordnung zur CJ-Variante geschah erst bei der Bestellung.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, appendFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { lieferurteil } from './lib/lieferbarkeit.mjs';
import { strategien } from './lib/fakten_block.mjs';
import { zerlegeOptionen, baueAuswahl, preisFuer, hinweisText } from './lib/cj_varianten.mjs';
import { steckerUrteil } from './lib/stecker_cj.mjs';
import { nachDeutsch } from './lib/uebersetzen.mjs';
import { ENGLISCH_RE } from './farbwahl_scan.mjs';
import { ledgerGedaechtnis, veraendertSeitPlan, bilderUnbrauchbar, FRISCH, VORLAEUFIG, ZURUECKGESTELLT } from './lib/varianten_sicherheit.mjs';

const LABEL_AUFTRAG = 'Übersetze diese Variantenbezeichnungen eines Online-Shops (Farben, Muster, Modelle) ins Deutsche. Kurz, wie auf einem Etikett, Substantive gross, '
  + 'ohne Erklärung. Eigennamen und Zahlen unverändert lassen. Gib AUSSCHLIESSLICH ein JSON-Array von Strings in exakt gleicher Reihenfolge zurück.\n';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const LIVE = process.env.LIVE === '1';
const LIMIT = Number(process.env.LIMIT || 10);
const USD_CHF = Number(process.env.USD_CHF || 0.82435);
const PLAN_DIR = process.env.PLAN_DIR || '/tmp/cj_varianten_plan';
const LEDGER = process.env.LEDGER || 'dropship/cj_varianten_ledger.txt';
const MARKER = '<!-- ls-var-v1 -->';
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const CJ_PAUSE = Number(process.env.CJ_PAUSE_MS ?? 1100);   // CJ erlaubt ~1 Abfrage/s; nur in Tests auf 0

// ---------------------------------------------------------------- Bild-Hash (dHash 9x8)
function laden(url, ziel) {
  for (let i = 0; i < 4; i++) {
    const r = spawnSync('curl', ['-s', '-L', '--max-time', '40', '-o', ziel, '-w', '%{http_code}', url], { encoding: 'utf8' });
    if (r.stdout.trim() === '200') return true;
    spawnSync('sleep', ['1.5']);
  }
  return false;
}
/**
 * Bild-Signatur: dHash (Helligkeitsverlauf) PLUS ein 16×16-Farbbild.
 * Der Hash allein reicht NICHT (gemessen 25.10.): Uhren mit gleichem Aufbau und verschiedenen Zifferblatt-Farben
 * liegen im Hash nur 6–9 Bit auseinander — «fast gleich» wäre eine Verwechslung. Darum zählt nur, was in Hash UND Farbe
 * nahezu identisch ist; alles andere wird als neues Bild geführt.
 */
export function bildSig(url, tmp) {
  const f = join(tmp, 'h_' + Math.abs([...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) + '.img');
  if (!laden(url, f)) return null;
  const g = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=9:8:flags=area,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
  const c = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=16:16:flags=area,format=rgb24', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
  if (g.status !== 0 || g.stdout.length < 72 || c.status !== 0 || c.stdout.length < 768) return null;
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (g.stdout[y * 9 + x] > g.stdout[y * 9 + x + 1] ? 1n : 0n);
  return { h, rgb: Uint8Array.from(c.stdout.subarray(0, 768)) };
}
export function abstand(a, b) { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; }
export function sigAbstand(a, b) {
  let s = 0; for (let i = 0; i < 768; i++) s += Math.abs(a.rgb[i] - b.rgb[i]);
  return { dh: abstand(a.h, b.h), farbe: s / 768 };
}
/** Dasselbe Bild? Nur bei nahezu gleichem Hash UND nahezu gleicher Farbverteilung. */
export function gleichesBild(a, b, { maxDh = 3, maxFarbe = 8 } = {}) {
  const d = sigAbstand(a, b);
  return d.dh <= maxDh && d.farbe <= maxFarbe ? d : null;
}

// ---------------------------------------------------------------- Zugänge
async function shopifyZugang() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) throw new Error('Kein Shopify-Token');
  return (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);
}

const PRODUKT = `query($h:String!){productByHandle(handle:$h){
  id title status handle tags descriptionHtml updatedAt
  options{id name values}
  variantsCount{count} mediaCount{count}
  variants(first:5){nodes{id sku price inventoryItem{id unitCost{amount}}}}
  media(first:60){nodes{id status alt ... on MediaImage{image{url width height}}}}}}`;

// ---------------------------------------------------------------- CJ
async function cjProdukt(cj, kennung) {
  const [[art, wert]] = Object.entries(typeof kennung === 'object' ? kennung : { pid: kennung });
  const res = await cjFetch(`${BASE}/product/query?${art}=${encodeURIComponent(wert)}`, { context: 'Varianten', headers: { 'CJ-Access-Token': cj }, weicheCodes: WEICHE_CODES });
  await schlaf(CJ_PAUSE);
  return res;
}
async function fracht(cj, vid) {
  try {
    const f = await cjFetch(`${BASE}/logistic/freightCalculate`, { context: 'Fracht', headers: { 'CJ-Access-Token': cj, 'Content-Type': 'application/json' },
      init: { method: 'POST', body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid }] }) } });
    await schlaf(CJ_PAUSE);
    return Array.isArray(f?.data) ? f.data.length : null;
  } catch (e) {
    // CJ-Punkte erschöpft oder CJ drosselt: das ist KEIN «Lieferbarkeit unbekannt» für dieses Produkt, sondern ein Grund zu warten (Exitcode 3). Sonst stünde das Produkt
    // 14 Tage als «nicht bewiesen» im Ledger, obwohl nur der Frachtdienst kurz ausfiel (Prüfung 26.10.2026).
    if (/CJ_QUOTA|CJ_THROTTLED/.test(String(e.message))) throw e;
    return null;
  }
}

// ---------------------------------------------------------------- Plan
export async function plane({ q, cj, handle, tmp }) {
  const d = await q(PRODUKT, { h: handle });
  const p = d.productByHandle;
  if (!p) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'Produkt nicht gefunden' };
  if (p.descriptionHtml?.includes(MARKER)) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'bereits bearbeitet (Marker)' };
  const standard = p.variantsCount.count === 1 && p.options.every(o => /^(title|variante)$/i.test(o.name) && o.values.every(v => /^(default title|standard)$/i.test(v)));
  if (!standard) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `kein Standard-Einzelprodukt (${p.variantsCount.count} Varianten, Optionen ${p.options.map(o => o.name).join('/')})` };
  if (p.mediaCount.count > 60) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `zu viele Medien (${p.mediaCount.count}) — productSet würde Bilder verlieren` };
  const v0 = p.variants.nodes[0];
  // Die SKU kann eine pid (Ziffern/UUID) oder eine CJ-Varianten-SKU sein (`CJYD…AZ`, `CJ-CJCS…`): 69 von 525 Kandidaten wurden am
  // 26.10. nur deshalb übersprungen. Reihenfolge und Schreibweisen kommen aus lib/fakten_block.mjs (getestet).
  const wege = strategien(v0.sku);
  if (!wege.length) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `keine CJ-Kennung in der SKU «${v0.sku}»` };
  let res = null, pid = null;
  for (const [art, wert] of wege) {
    res = await cjProdukt(cj, art === 'pid' ? { pid: wert } : { [art]: wert });
    if (res?.data) { pid = res.data.pid || (art === 'pid' ? wert : null); break; }
  }
  const c = res?.data;
  // Dieselbe CJ-Antwort braucht später der Fakten-Block und der Textauftrag: einmal zahlen, zweimal nutzen (gleicher Pfad wie cj_fakten_block.mjs).
  if (c?.pid) { try { const cdir = process.env.CJ_FAKTEN_CACHE || '/tmp/cj_fakten_cache'; mkdirSync(cdir, { recursive: true }); const f = `${cdir}/${handle}.json`; if (!existsSync(f)) writeFileSync(f, JSON.stringify(c)); } catch { /* Zwischenspeicher ist nur eine Hilfe */ } }
  if (!c) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `CJ ohne Daten (code ${res.code})` };
  const vsRoh = (c.variants || []).map(v => ({ vid: v.vid, sku: v.variantSku, key: v.variantKey || '', ek: Number(v.variantSellPrice), gewicht: Number(v.variantWeight) || 0,
    bild: v.variantImage || '', laenge: v.variantLength, breite: v.variantWidth, hoehe: v.variantHeight }));
  // Fremdstecker (US/UK/AU/JP) nie anlegen: die Schweizer Steckdose nimmt nur den Euro-Stecker. Der CJ-Schlüssel «White-US» wurde sonst zur Farbe «Weiss» (26.10.: 34 Produkte, 85 Varianten live).
  const stecker = steckerUrteil(vsRoh.map(v => ({ id: v.vid, sku: v.sku })), Object.fromEntries(vsRoh.map(v => [v.sku, v.key])));
  if (stecker.draft) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `nur Fremdstecker (US/UK/AU/JP) bei CJ — nicht für die Schweiz (${vsRoh.length} Varianten)` };
  const weg = new Set(stecker.loeschen);
  const vs = vsRoh.filter(v => !weg.has(v.vid));
  if (vs.length <= 1) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `CJ führt nur ${vs.length} Variante — kein Auswahlproblem` };
  // Shopify erlaubt nur ~9 500 NEUE Varianten pro Tag: ein Produkt mit 84 Varianten kostet so viel wie zwölf normale. Grosse Produkte kommen später (MAX_VARIANTEN=100 erlaubt alle).
  const MAXV = Number(process.env.MAX_VARIANTEN || 40);
  if (vs.length > MAXV) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `viele CJ-Varianten (${vs.length} > ${MAXV}) — später, wenn das Tageskontingent reicht` };

  const zer = zerlegeOptionen(c.productKeyEn, vs.map(v => ({ vid: v.vid, key: v.key })));
  let aw = baueAuswahl(zer);
  let uebersetzung = null, kiAusfall = false;
  if (aw.ok && aw.unsicher.length && !process.env.KEIN_KI_UEBERSETZEN) {
    const roh = [...new Set(aw.unsicher.map(u => u.wert))];
    const t = await nachDeutsch(roh, { auftrag: LABEL_AUFTRAG });
    // weg='original' heisst: der Dienst hat NICHT geantwortet (402/429/5xx/Netz/kein Schlüssel). Das ist etwas anderes als «KI antwortete, Übersetzung nicht brauchbar».
    kiAusfall = t.weg === 'original';
    // Unverändert zurück ist nur bei einem einzelnen Wort ohne englische Wortform in Ordnung («Cyan», «Khaki»); «Oil Painting Blue» unverändert = nicht übersetzt.
    const brauchbar = t.weg !== 'original' && t.texte.every((x, i) => x && x.length <= 40 && (x.toLowerCase() !== roh[i].toLowerCase() || (!/\s/.test(roh[i]) && !ENGLISCH_RE.test(roh[i]))));
    if (brauchbar) { uebersetzung = { weg: t.weg, wert: Object.fromEntries(roh.map((w, i) => [w, t.texte[i]])) }; aw = baueAuswahl(zer, { wert: uebersetzung.wert }); }
  }
  if (!aw.ok) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `Auswahl nicht baubar: ${aw.grund}` };

  // Lieferbeweis: je Gewichtsklasse eine Variante
  const klassen = new Map();
  for (const v of vs) { const k = String(v.gewicht); if (!klassen.has(k)) klassen.set(k, v); }
  const ausgeschlossen = new Set(); const fr = {};
  let gemessen = 0;
  for (const [k, v] of klassen) {
    const linien = await fracht(cj, v.vid);
    const u = lieferurteil({ cjCode: 200, vid: v.vid, linien });
    fr[k] = { linien, urteil: u.urteil };
    if (u.urteil === 'lieferbar') gemessen++;
    if (u.urteil === 'nicht_lieferbar') for (const x of vs) if (String(x.gewicht) === k) ausgeschlossen.add(x.vid);
  }
  if (gemessen === 0) {
    const sicherNein = [...klassen.keys()].every(k => fr[k]?.urteil === 'nicht_lieferbar');
    return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `${sicherNein ? 'Lieferbarkeit nicht bewiesen' : 'Lieferbarkeit unbekannt'} (${JSON.stringify(fr)})` };
  }
  const behalten = vs.filter(v => !ausgeschlossen.has(v.vid));
  // Unbekannte Gewichtsklassen: nicht hinzufügen (unbekannt ≠ lieferbar)
  const unbekannt = vs.filter(v => fr[String(v.gewicht)]?.urteil === 'unbekannt');
  const zulaessig = behalten.filter(v => fr[String(v.gewicht)]?.urteil === 'lieferbar');
  if (zulaessig.length < 2) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `nur ${zulaessig.length} lieferbare Variante(n) nach Fracht-Prüfung` };

  // Preise: Basis = erste CJ-Variante (so wurde importiert), Untergrenze = bisheriger Preis
  const basisPreis = Number(v0.price), basisKosten = Number(v0.inventoryItem?.unitCost?.amount);
  const ekBasis = vs[0].ek;
  const zeilen = [];
  for (const v of zulaessig) {
    const w = aw.varianten.find(x => x.vid === v.vid);
    const pr = preisFuer({ basisPreis, basisKostenChf: basisKosten, ekBasisUsd: ekBasis, ekUsd: v.ek, usdChf: USD_CHF });
    if (!pr.ok) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: pr.grund };
    zeilen.push({ ...v, werte: w.werte, preis: pr.preis, kosten: pr.kostenChf, einheitspreis: pr.einheitspreis });
  }

  // Bilder: je Variante das passende vorhandene Medium finden (Hash), sonst hochladen
  const shopMedien = p.media.nodes.filter(m => m.image?.url && m.status === 'READY');
  const mh = shopMedien.map(m => ({ id: m.id, url: m.image.url, sig: bildSig(m.image.url + '?width=256', tmp) }));
  const bildUrls = [...new Set(zeilen.map(z => z.bild).filter(Boolean))];
  const bildPlan = {};
  for (const url of bildUrls) {
    const sig = bildSig(url, tmp);
    if (sig === null) { bildPlan[url] = { art: 'unlesbar' }; continue; }
    const treffer = mh.filter(m => m.sig).map(m => ({ id: m.id, d: gleichesBild(sig, m.sig) })).filter(x => x.d)
      .sort((a, b) => (a.d.dh * 4 + a.d.farbe) - (b.d.dh * 4 + b.d.farbe));
    // Zwei fast gleich gute Treffer = mehrdeutig → nicht zuordnen, neu laden
    const mehrdeutig = treffer.length > 1 && (treffer[1].d.dh * 4 + treffer[1].d.farbe) - (treffer[0].d.dh * 4 + treffer[0].d.farbe) < 2;
    bildPlan[url] = treffer.length && !mehrdeutig
      ? { art: 'vorhanden', mediaId: treffer[0].id, abstand: treffer[0].d.dh, farbe: Math.round(treffer[0].d.farbe * 10) / 10 }
      : { art: 'neu', grund: mehrdeutig ? 'mehrdeutig' : 'kein identisches Medium' };
  }
  const gleicheBilder = new Set(Object.values(bildPlan).filter(b => b.mediaId).map(b => b.mediaId));
  const hinweise = aw.hinweise.map(h => ({ ...h, text: hinweisText(h) }));

  const plan = {
    handle, ergebnis: 'PLAN', produktId: p.id, titel: p.title, pid,
    cj: { name: c.productNameEn, varianten: vs.length, optionen: c.productKeyEn },
    basis: { preis: basisPreis, kosten: basisKosten, ekUsd: ekBasis, sku: v0.sku },
    optionen: aw.optionen, hinweise, unsicherUebersetzt: aw.unsicher, kiUebersetzt: uebersetzung,
    fracht: fr, ausgeschlossen: [...ausgeschlossen], unbekanntOhneBeweis: unbekannt.map(v => v.sku),
    varianten: zeilen.map(z => ({ vid: z.vid, sku: z.sku, werte: z.werte, preis: z.preis, kosten: z.kosten, einheitspreis: z.einheitspreis, gewicht: z.gewicht, bild: z.bild ? bildPlan[z.bild] : { art: 'ohne' }, bildUrl: z.bild })),
    bilder: { shopMedien: shopMedien.length, zugeordnet: gleicheBilder.size, neuHochzuladen: Object.values(bildPlan).filter(b => b.art === 'neu').length, unlesbar: Object.values(bildPlan).filter(b => b.art === 'unlesbar').length },
    medienIds: p.media.nodes.filter(m => m.status === 'READY').map(m => m.id),
    medienVerworfen: p.media.nodes.filter(m => m.status !== 'READY').length,
    beschreibungHtml: p.descriptionHtml, tags: p.tags, updatedAt: p.updatedAt, kiAusfall,
  };
  return plan;
}

// ---------------------------------------------------------------- Schreiben
const SET = `mutation($i:ProductSetInput!){productSet(input:$i,synchronous:true){product{id handle variantsCount{count} options{name values}} userErrors{field message code}}}`;
export function setInput(plan) {
  const neuQuellen = [...new Set(plan.varianten.filter(v => v.bild?.art === 'neu' && v.bildUrl).map(v => v.bildUrl))];
  // Sobald `files` angegeben wird, DEFINIERT die Liste die ganze Galerie (Sandbox 25.10.): alle vorhandenen Bilder per ID mitliefern.
  const files = [...plan.medienIds.map(id => ({ id })), ...neuQuellen.map(u => ({ originalSource: u, contentType: 'IMAGE' }))];
  const optionen = plan.optionen.map(o => ({ name: o.name, values: o.werte.map(w => ({ name: w })) }));
  const vars = plan.varianten.map(v => {
    const x = {
      optionValues: plan.optionen.map(o => ({ optionName: o.name, name: v.werte[o.name] })),
      price: v.preis.toFixed(2),
      inventoryPolicy: 'CONTINUE',
      inventoryItem: { sku: v.sku, tracked: false, ...(v.kosten ? { cost: v.kosten.toFixed(2) } : {}) },
    };
    if (v.bild?.art === 'vorhanden') x.file = { id: v.bild.mediaId };
    else if (v.bild?.art === 'neu' && v.bildUrl) x.file = { originalSource: v.bildUrl, contentType: 'IMAGE' };
    return x;
  });
  const hinweisHtml = plan.hinweise.filter(h => h.text).map(h => `<p><strong>Ausführung:</strong> ${h.text}</p>`).join('');
  const tags = [...new Set([...(plan.tags || []), 'varianten-nachgezogen-1025'])];
  return { id: plan.produktId, files, productOptions: optionen, variants: vars, descriptionHtml: MARKER + hinweisHtml + plan.beschreibungHtml, tags };
}

async function aufschreiben(q, plan) {
  const eingabe = setInput(plan);
  const r = await q(SET, { i: eingabe });
  const e = r.productSet?.userErrors || [];
  if (e.length) return { ok: false, fehler: JSON.stringify(e).slice(0, 600) };
  return { ok: true, varianten: r.productSet.product.variantsCount.count, optionen: r.productSet.product.options };
}

// ---------------------------------------------------------------- Lauf
async function main() {
  const handles = process.argv.slice(2);
  if (process.env.HANDLES_DATEI) {
    // Die erste Zeile ist nur dann eine Kopfzeile, wenn sie so aussieht («handle;…»): sonst ging das erste Produkt jeder Liste verloren.
    const zeilen = readFileSync(process.env.HANDLES_DATEI, 'utf8').split('\n');
    for (const z of /^handle\b/i.test(zeilen[0] || '') ? zeilen.slice(1) : zeilen) { const h = z.split(';')[0].trim(); if (h) handles.push(h); }
  }
  if (!handles.length) {
    // Eine leere Scheibe aus dem Dauerlauf (Kopfzeile ohne Produkte) ist kein Fehler — sonst sähe sie im Treiber wie ein Absturz aus.
    if (process.env.HANDLES_DATEI) { console.log('Liste leer — nichts zu tun'); process.exit(0); }
    console.error('Kein Handle angegeben'); process.exit(1);
  }
  // Ohne ffmpeg gibt bildSig() still null zurück: jedes Variantenbild gälte als «unlesbar», die Varianten gingen ohne eigenes Bild live und trügen
  // danach den Marker (26.10.2026: auf GitHub-Rechnern fehlt ffmpeg). Darum VOR jedem Schreiben prüfen, auch im Trockenlauf.
  const ff = spawnSync('ffmpeg', ['-version']);
  if (ff.error || ff.status !== 0) { console.error('FEHLER: ffmpeg fehlt (apt-get install ffmpeg) — ohne Bild-Signaturen würden Varianten ohne eigenes Bild geschrieben'); process.exit(1); }
  // Gedächtnis: GESCHRIEBEN für immer, endgültige Überspringer 14 Tage, zurückgestellte 7 Tage, vorläufige und Fehler 20 Stunden (lib/varianten_sicherheit.mjs). FORCE=1 hebt alles ausser GESCHRIEBEN auf.
  const erledigt = existsSync(LEDGER) ? ledgerGedaechtnis(readFileSync(LEDGER, 'utf8'), { force: process.env.FORCE === '1' }) : new Set();
  const q = await shopifyZugang();
  const cj = await cjToken();
  if (!cj) { console.error('Kein CJ-Token (CJ_EMAIL/CJ_API_KEY)'); process.exit(1); }
  mkdirSync(PLAN_DIR, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'varianten-'));
  const zaehl = {};
  let n = 0;
  // Serien: Ein einzelner kaputter Datensatz darf die Scheibe nicht festhalten (er wird gemerkt, der Lauf geht weiter), eine ganze Serie gleicher Fehler
  // aber bedeutet «ein Dienst ist weg» — dann nicht die Liste verbrennen, sondern kontrolliert enden (der Treiber wiederholt bzw. wartet).
  const MAX_FEHLER = Number(process.env.MAX_FEHLER_FOLGE || 8), MAX_KI = Number(process.env.MAX_KI_FOLGE || 5);
  // fehlerFolge = Plan-Fehler (CJ/Shopify-Lesen), schreibFolge = Schreibfehler. Überspringer setzen NUR fehlerFolge zurück (sie belegen, dass CJ antwortet), nie schreibFolge:
  // sonst bliebe ein dauerhafter Schreibausfall unerkannt, sobald zwischendurch ein Produkt übersprungen wird (Prüfung 26.10.2026).
  let fehlerFolge = 0, schreibFolge = 0, kiFolge = 0, drosselFolge = 0;
  const abbruch = (code, text) => { console.log('ABBRUCH:', text); process.exitCode = code; };
  try {
    for (const h of handles) {
      if (n >= LIMIT) { console.log(`LIMIT ${LIMIT} erreicht — Rest bleibt für den nächsten Lauf`); break; }
      // «erledigt» heisst hier nicht nur GESCHRIEBEN: auch endgültig/zurückgestellt Übersprungene und frische Fehler stehen in der Menge (ledgerGedaechtnis).
      if (erledigt.has(h)) { console.log(h, '→ übersprungen: steht im Ledger (geschrieben, zurückgestellt oder frisch gescheitert)'); continue; }
      n++;
      let plan;
      const planPfad = join(PLAN_DIR, h + '.json');
      // JEDER Ausgang bekommt eine Ledger-Zeile (nur live): ein Produkt ohne Zeile stünde im nächsten Stapel wieder vorn und zählte gegen LIMIT.
      const merke = (ergebnis, grund) => { if (LIVE) appendFileSync(LEDGER, `${h} · ${new Date().toISOString()} · ${ergebnis} · ${String(grund).slice(0, 100)}\n`); };
      // Livelauf: einen frischen Plan aus dem Trockenlauf weiterverwenden (spart CJ-Abfragen und Bild-Downloads)
      if (LIVE && existsSync(planPfad) && Date.now() - statSync(planPfad).mtimeMs < 3 * 3600 * 1000) {
        try { const alt = JSON.parse(readFileSync(planPfad, 'utf8')); if (alt.ergebnis === 'PLAN') plan = alt; } catch { /* neu planen */ }
      }
      if (!plan) {
        try { plan = await plane({ q, cj, handle: h, tmp }); drosselFolge = 0; }
        catch (e) {
          const m = String(e.message);
          if (/CJ_QUOTA/.test(m)) { abbruch(3, m); break; }
          // Eine CJ-Drosselung bei EINEM Produkt (dauerhaftes 5xx eines kaputten Datensatzes) ist keine globale: erst die zweite hintereinander beendet den Lauf (Exitcode 3).
          if (/CJ_THROTTLED/.test(m) && ++drosselFolge >= 2) { abbruch(3, m); break; }
          plan = { handle: h, ergebnis: 'FEHLER', grund: m.slice(0, 300) };
        }
        writeFileSync(planPfad, JSON.stringify(plan, null, 1));
      }
      // KI-Serie: nur Produkte zählen, bei denen die KI gefragt wurde (kiAusfall = der Dienst hat nicht geantwortet).
      if (plan.ergebnis === 'PLAN') { if (plan.kiAusfall) kiFolge++; else if (plan.kiUebersetzt || plan.unsicherUebersetzt?.length) kiFolge = 0; }
      // Unsicher Übersetztes nie live schreiben (englische Farbnamen auf der Seite wären der nächste Mangel)
      if (LIVE && plan.ergebnis === 'PLAN' && plan.unsicherUebersetzt?.length && process.env.ERLAUBE_UNSICHER !== '1') {
        zaehl.UEBERSPRUNGEN = (zaehl.UEBERSPRUNGEN || 0) + 1;
        console.log(h, '→ UEBERSPRUNGEN |', plan.kiAusfall ? 'KI-Dienst nicht erreichbar:' : 'unsicher übersetzt:', JSON.stringify(plan.unsicherUebersetzt).slice(0, 160));
        // Fiel die KI aus, ist das Produkt nicht «unsicher», sondern nicht übersetzt worden: nur 20 Stunden zurückstellen, nicht sieben Tage.
        merke('UEBERSPRUNGEN', plan.kiAusfall ? `${VORLAEUFIG}: KI-Dienst nicht erreichbar` : `${ZURUECKGESTELLT}: unsicher übersetzt ${JSON.stringify(plan.unsicherUebersetzt)}`);
        fehlerFolge = 0;
        if (kiFolge >= MAX_KI) { abbruch(5, `KI-Dienst ${kiFolge} Mal hintereinander nicht erreichbar`); break; }
        continue;
      }
      if (plan.ergebnis !== 'PLAN') {
        zaehl[plan.ergebnis] = (zaehl[plan.ergebnis] || 0) + 1; console.log(h, '→', plan.ergebnis, '|', plan.grund);
        if (plan.ergebnis === 'UEBERSPRUNGEN') {
          // Endgültige Gründe ändern sich nicht (14 Tage Ruhe); alle anderen (viele Varianten, Auswahl nicht baubar, Lieferbarkeit unbekannt …) ändern sich nicht von selbst und kosten bei jedem Versuch CJ-Punkte → zurückgestellt (7 Tage).
          const endgueltig = /^(CJ führt nur|CJ ohne Daten|Lieferbarkeit nicht bewiesen|kein Standard-Einzelprodukt|zu viele Medien|keine CJ-Kennung|nur Fremdstecker)/.test(plan.grund || '');
          merke('UEBERSPRUNGEN', endgueltig ? plan.grund : `${ZURUECKGESTELLT}: ${plan.grund}`);
          fehlerFolge = 0;
        } else if (plan.ergebnis === 'FEHLER') {
          merke('FEHLER', `Plan: ${plan.grund}`);
          if (++fehlerFolge >= MAX_FEHLER) { abbruch(1, `${fehlerFolge} Fehler in Folge — ein Dienst scheint auszufallen`); break; }
        }
        continue;
      }
      console.log(`\n${h} → PLAN: ${plan.varianten.length} Varianten, Optionen ${plan.optionen.map(o => `${o.name}(${o.werte.length})`).join(' × ')}, Preise ${[...new Set(plan.varianten.map(v => v.preis))].join('/')}, Bilder: ${plan.bilder.zugeordnet} zugeordnet, ${plan.bilder.neuHochzuladen} neu, ${plan.bilder.unlesbar} unlesbar`);
      if (plan.unsicherUebersetzt.length) console.log('   ⚠ nicht sicher übersetzt:', JSON.stringify(plan.unsicherUebersetzt).slice(0, 200));
      if (plan.hinweise.length) console.log('   Hinweise:', plan.hinweise.map(x => `${x.name}=${x.wert}${x.text ? ' → ' + x.text : ' (unübersetzt)'}`).join('; '));
      if (!LIVE) { zaehl.PLAN = (zaehl.PLAN || 0) + 1; continue; }
      // Mehr als die Hälfte der Variantenbilder unlesbar (Download oder ffmpeg gescheitert): nicht schreiben. setInput() lässt unlesbare Bilder weg, und der Marker im Text
      // hielte das Produkt danach für immer aus der Kandidatenliste — die Varianten blieben für immer ohne eigenes Bild.
      if (bilderUnbrauchbar(plan)) {
        zaehl.UEBERSPRUNGEN = (zaehl.UEBERSPRUNGEN || 0) + 1;
        console.log(`   UEBERSPRUNGEN | Variantenbilder unlesbar (${plan.bilder.unlesbar} von ${plan.bilder.zugeordnet + plan.bilder.neuHochzuladen + plan.bilder.unlesbar})`);
        merke('UEBERSPRUNGEN', `${VORLAEUFIG}: Variantenbilder unlesbar (${plan.bilder.unlesbar})`);
        fehlerFolge = 0;
        continue;
      }
      // productSet ersetzt Beschreibung, Tags, Galerie und die Preise der neuen Varianten durch den Stand des Plans (bis zu 3 Stunden alt): unmittelbar vorher frisch lesen,
      // sonst würde eine Änderung einer anderen Sitzung (Text-Lauf, Kategorie-Tags, neue Bilder, Preis) stillschweigend überschrieben.
      let veraendert = '', w;
      try {
        veraendert = veraendertSeitPlan(plan, (await q(FRISCH, { id: plan.produktId })).product);
        if (!veraendert) w = await aufschreiben(q, plan);
      } catch (e) {
        // Das Tageslimit betrifft nicht dieses Produkt: weiterreichen (Exitcode 4). Alles andere (Eingabefehler, «Internal error», Zeitüberschreitung bei EINEM Produkt) merken und
        // mit dem nächsten weitermachen — sonst hielte ein Stolperstein seine ganze Scheibe in jeder Nacht fest (Prüfung 26.10.2026).
        if (/VARIANT_THROTTLE|Daily variant creation limit/i.test(String(e.message))) throw e;
        zaehl.FEHLER = (zaehl.FEHLER || 0) + 1;
        console.log('   FEHLER beim Schreiben:', String(e.message).slice(0, 200));
        merke('FEHLER', `Schreiben: ${String(e.message).slice(0, 90)}`);
        if (++schreibFolge >= MAX_FEHLER) { abbruch(1, `${schreibFolge} Schreibfehler in Folge — ein Dienst scheint auszufallen`); break; }
        continue;
      }
      if (veraendert) {
        zaehl.UEBERSPRUNGEN = (zaehl.UEBERSPRUNGEN || 0) + 1;
        console.log('   UEBERSPRUNGEN | seit dem Plan verändert:', veraendert);
        try { rmSync(planPfad, { force: true }); } catch { /* der Plan wird ohnehin nach 3 Stunden verworfen */ }
        merke('UEBERSPRUNGEN', `${VORLAEUFIG}: seit dem Plan verändert (${veraendert})`);
        fehlerFolge = 0;
        continue;
      }
      // Käme das Tageslimit als userError statt als GraphQL-Fehler, wäre es KEIN Fehler des Produkts: weiterreichen (Exitcode 4), nicht als FEHLER merken.
      if (!w.ok && /VARIANT_THROTTLE|Daily variant creation limit/i.test(w.fehler)) throw new Error(w.fehler);
      if (!w.ok) {
        zaehl.FEHLER = (zaehl.FEHLER || 0) + 1; console.log('   FEHLER beim Schreiben:', w.fehler); merke('FEHLER', w.fehler);
        if (++schreibFolge >= MAX_FEHLER) { abbruch(1, `${schreibFolge} Schreibfehler in Folge — ein Dienst scheint auszufallen`); break; }
        continue;
      }
      fehlerFolge = 0; schreibFolge = 0;
      zaehl.GESCHRIEBEN = (zaehl.GESCHRIEBEN || 0) + 1;
      console.log(`   GESCHRIEBEN: ${w.varianten} Varianten`);
      merke('GESCHRIEBEN', `${w.varianten} Varianten`);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  console.log('\nZusammenfassung:', JSON.stringify(zaehl), LIVE ? '(LIVE)' : '(Trockenlauf — nichts geschrieben)');
}

// Shopify begrenzt das Anlegen NEUER Varianten je Tag («Daily variant creation limit reached», VARIANT_THROTTLE_EXCEEDED; gemessen 26.10.2026: ~9 500 Varianten,
// dann Schluss). Das ist kein Fehler des Produkts → eigener Exitcode 4, der Dauerlauf wartet und versucht es später wieder.
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => {
  if (/VARIANT_THROTTLE|Daily variant creation limit/i.test(String(e.message))) { console.error('TAGESLIMIT: Shopify erlaubt heute keine neuen Varianten mehr'); process.exit(4); }
  console.error('FEHLER', e.message); process.exit(1);
});
