#!/usr/bin/env node
/**
 * Spiegelt Printful-Vorlagenbilder (spiegel_plan.json aus pod/v6/werkzeug/vorschau_daten_bauen.mjs) als Dateien nach Shopify Files.
 * Besitzer-Ja 06.11.2026: «2 ja sofort» (Spiegeln der 1 176 Vorlagenbilder, Entscheide 8 und 10 im pod/v6/README.md).
 *
 * TROCKENLAUF (Vorgabe): prüft den Plan, liest die schon vorhandenen Dateien (nur lesend) und zählt, was fehlt. Schreibt nur nach OUT. PRUEFEN=1 fragt zusätzlich jede Quelle per HEAD (Art, Grösse).
 *   PLAN=<spiegel_plan.json> OUT=<Ordner> [MODELLE=403,71] [PRUEFEN=1] node spiegeln.mjs
 * LIVE=1: lädt fehlende Bilder hoch (nur NEUE Dateien; vorhandene Namen werden nie überschrieben, ein Name hängt am Hash der ganzen Quelladresse).
 *   LIVE=1 PLAN=… OUT=… [MODELLE=…] [MAX_DATEIEN=1500] [STAPEL=20] [PARALLEL=5] node spiegeln.mjs
 *   Ergebnis: OUT/hochgeladen.json = { "<dateiname>": "<https-Adresse>" } für ALLE Dateien des Plans (vorhandene und neue), OUT/ledger.tsv, OUT/protokoll.log.
 * ZURUECK=1 LIVE=1 OUT=<Ordner mit ledger.tsv>: löscht NUR Dateien, die dieses Werkzeug laut Ledger angelegt hat (Status OK).
 * Zugang: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (Client-Credentials, nie ausgeben).
 * Exit: 0 ok · 1 Fehler · 2 Plan ungültig · 3 Abweichung (hochgeladene Bytes ≠ Quelle) · 4 unvollständig (einzelne Dateien fehlgeschlagen)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const NAME_RE = /^luxe-vorschau-[0-9a-f]{10}\.(png|jpe?g|webp|gif)$/;
export const QUELLE_RE = /^https:\/\/files\.cdn\.printful\.com\/[A-Za-z0-9._~:\/%+-]+(\?v=\d+)?$/;
export const MAX_BYTES = 6 * 1024 * 1024;
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
const liste = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));
/** Breite und Höhe aus den Bytes (PNG, JPEG, GIF, WebP); null, wenn nicht lesbar. */
export function masse(buf) {
  try {
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString('latin1', 12, 16) === 'IHDR') return { b: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'GIF') return { b: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    if (buf.length > 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
      const t = buf.toString('latin1', 12, 16);
      if (t === 'VP8X') return { b: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (t === 'VP8L') { const v = buf.readUInt32LE(21); return { b: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
      if (t === 'VP8 ') return { b: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        const len = buf.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), b: buf.readUInt16BE(i + 7) };
        i += 2 + len;
      }
    }
  } catch { /* nicht lesbar */ }
  return null;
}
export const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Prüft den Plan; liefert { fehler: [...] } (leer = gültig). */
export function planPruefen(plan) {
  const fehler = [];
  if (!plan || !Array.isArray(plan.dateien)) return { fehler: ['Plan ohne Liste «dateien»'] };
  const namen = new Set();
  for (const [i, e] of plan.dateien.entries()) {
    if (!e || typeof e !== 'object') { fehler.push(`#${i}: kein Objekt`); continue; }
    if (!NAME_RE.test(String(e.dateiname))) fehler.push(`#${i}: Dateiname ungültig (${String(e.dateiname).slice(0, 60)})`);
    if (!QUELLE_RE.test(String(e.quelle))) fehler.push(`#${i}: Quelle nicht von files.cdn.printful.com oder ungültig (${String(e.quelle).slice(0, 80)})`);
    if (namen.has(e.dateiname)) fehler.push(`#${i}: Dateiname doppelt (${e.dateiname})`);
    namen.add(e.dateiname);
    const ext = String(e.dateiname).split('.').pop();
    const q = String(e.quelle).split('?')[0].split('.').pop().toLowerCase();
    if (MIME[ext] && MIME[q] && MIME[ext] !== MIME[q]) fehler.push(`#${i}: Endung von Name und Quelle verschieden (${ext} gegen ${q})`);
  }
  return { fehler };
}
export function auswahl(plan, modelle) {
  const m = new Set((modelle ?? []).map(Number));
  return m.size ? plan.dateien.filter((e) => (e.modelle ?? []).some((x) => m.has(Number(x)))) : plan.dateien.slice();
}
const dateiAusUrl = (u) => decodeURIComponent(String(u || '').split('?')[0].split('/').pop() || '');

/** Wiederholt bei THROTTLED (Kostenlimit der Admin API) mit wachsender Pause. */
export async function gqlSicher(gqlFn, query, variables, { versuche = 6, pause = 1500, warte = schlafen } = {}) {
  let letzter;
  for (let v = 1; v <= versuche; v++) {
    try {
      const d = await gqlFn(query, variables);
      return d;
    } catch (e) {
      letzter = e;
      if (!/THROTTLED|Throttled|429|502|503|504|ECONNRESET|fetch failed/.test(String(e && e.message))) throw e;
      await warte(pause * v);
    }
  }
  throw letzter;
}

/** Schon vorhandene Spiegeldateien: { dateiname: { id, url } } (nur lesend). */
export async function vorhandene(gqlFn, opts) {
  const aus = {}; let after = null;
  for (let i = 0; i < 50; i++) {
    const d = await gqlSicher(gqlFn, `query($q:String!,$a:String){ files(first:100, query:$q, after:$a){ pageInfo{ hasNextPage endCursor } nodes{ id fileStatus ... on GenericFile{ url } ... on MediaImage{ image{ url } } } } }`, { q: 'filename:luxe-vorschau', a: after }, opts);
    for (const n of d.files.nodes) {
      const url = n.url || (n.image && n.image.url) || null;
      const name = dateiAusUrl(url);
      if (NAME_RE.test(name)) aus[name] = { id: n.id, url, status: n.fileStatus };
    }
    if (!d.files.pageInfo.hasNextPage) break;
    after = d.files.pageInfo.endCursor;
  }
  return aus;
}

async function pool(items, n, fn) {
  const aus = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { for (;;) { const k = i++; if (k >= items.length) return; aus[k] = await fn(items[k], k); } }));
  return aus;
}

async function holen(fetchFn, quelle) {
  const r = await fetchFn(quelle, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; luxestyle-spiegel)' } });
  if (!r.ok) throw new Error(`Quelle HTTP ${r.status}`);
  const ct = String(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpeg|webp|gif)$/.test(ct)) throw new Error(`Quelle ist kein Bild (${ct || 'ohne Typ'})`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length) throw new Error('Quelle leer');
  if (buf.length > MAX_BYTES) throw new Error(`Quelle zu gross (${buf.length} Byte)`);
  return { buf, ct };
}

/**
 * Hauptlauf. gqlFn(query, variables) → data; fetchFn wie fetch. Gibt { ok, neu, vorhanden, fehlgeschlagen:[…], abweichung:[…], hochgeladen:{name:url} } zurück.
 */
export async function lauf({ plan, gqlFn, fetchFn = fetch, out, live = false, modelle = null, pruefen = false, maxDateien = 1500, stapel = 20, parallel = 5, log = console.log, warte = schlafen, ledger = null }) {
  const geprueft = planPruefen(plan);
  if (geprueft.fehler.length) return { exit: 2, fehler: geprueft.fehler };
  const eintraege = auswahl(plan, modelle);
  if (eintraege.length > maxDateien) return { exit: 2, fehler: [`${eintraege.length} Dateien über der Grenze MAX_DATEIEN=${maxDateien}`] };
  fs.mkdirSync(out, { recursive: true });
  const ledgerPfad = ledger || path.join(out, 'ledger.tsv');
  const schreibLedger = (name, status, id, detail) => fs.appendFileSync(ledgerPfad, [new Date().toISOString(), name, status, id || '', String(detail || '').replace(/[\t\n]/g, ' ')].join('\t') + '\n');
  if (!fs.existsSync(ledgerPfad)) fs.writeFileSync(ledgerPfad, '# Spiegel-Ledger: Zeit\tDateiname\tStatus (OK, FEHLER, ABWEICHUNG)\tDatei-ID\tDetail\n');
  const opts = { warte };
  const schon = await vorhandene(gqlFn, opts);
  const hochgeladen = {}; const fehlt = [];
  for (const e of eintraege) { if (schon[e.dateiname] && schon[e.dateiname].url) hochgeladen[e.dateiname] = schon[e.dateiname].url; else fehlt.push(e); }
  log(`Plan ${eintraege.length} Dateien${modelle ? ` (Modelle ${modelle.join(',')})` : ''}: vorhanden ${eintraege.length - fehlt.length}, fehlen ${fehlt.length}${live ? '' : ' (TROCKENLAUF, nichts geschrieben)'}`);
  const res = { exit: 0, plan: eintraege.length, vorhanden: eintraege.length - fehlt.length, neu: 0, fehlgeschlagen: [], abweichung: [], hochgeladen };
  if (pruefen) {
    let gesamt = 0; const art = {};
    await pool(fehlt, 6, async (e) => { try { const r = await fetchFn(e.quelle, { method: 'HEAD' }); const ct = String(r.headers.get('content-type') || '').split(';')[0]; art[`${r.status} ${ct}`] = (art[`${r.status} ${ct}`] || 0) + 1; gesamt += Number(r.headers.get('content-length') || 0); } catch (err) { art['Fehler'] = (art['Fehler'] || 0) + 1; } });
    log(`Quellen (HEAD): ${JSON.stringify(art)}, zusammen ${(gesamt / 1048576).toFixed(1)} MB`);
    res.quellen = { art, bytes: gesamt };
  }
  if (!live) { fs.writeFileSync(path.join(out, 'hochgeladen.json'), JSON.stringify(hochgeladen, null, 1)); return res; }

  for (let a = 0; a < fehlt.length; a += stapel) {
    const teil = fehlt.slice(a, a + stapel);
    // 1) Quellen laden
    const geladen = await pool(teil, parallel, async (e) => { try { return { e, ...(await holen(fetchFn, e.quelle)) }; } catch (err) { return { e, fehler: String(err.message || err) }; } });
    const gut = []; for (const g of geladen) { if (g.fehler) { res.fehlgeschlagen.push({ name: g.e.dateiname, grund: g.fehler }); schreibLedger(g.e.dateiname, 'FEHLER', '', g.fehler); } else gut.push(g); }
    if (!gut.length) continue;
    // 2) Ziele anfordern
    const st = await gqlSicher(gqlFn, `mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`,
      { i: gut.map((g) => ({ resource: 'FILE', filename: g.e.dateiname, mimeType: g.ct, httpMethod: 'POST', fileSize: String(g.buf.length) })) }, opts);
    const ziele = st.stagedUploadsCreate.stagedTargets; const ue = st.stagedUploadsCreate.userErrors || [];
    if (ue.length || ziele.length !== gut.length) { for (const g of gut) { res.fehlgeschlagen.push({ name: g.e.dateiname, grund: 'stagedUploadsCreate: ' + JSON.stringify(ue).slice(0, 200) }); schreibLedger(g.e.dateiname, 'FEHLER', '', 'stagedUploadsCreate'); } continue; }
    // 3) Bytes senden
    const gesendet = await pool(gut.map((g, k) => ({ g, t: ziele[k] })), parallel, async ({ g, t }) => {
      try {
        const form = new FormData(); for (const p of t.parameters) form.append(p.name, p.value);
        form.append('file', new Blob([g.buf], { type: g.ct }), g.e.dateiname);
        const up = await fetchFn(t.url, { method: 'POST', body: form });
        if (![200, 201, 204].includes(up.status)) throw new Error(`Upload HTTP ${up.status}`);
        return { g, t };
      } catch (err) { res.fehlgeschlagen.push({ name: g.e.dateiname, grund: String(err.message || err) }); schreibLedger(g.e.dateiname, 'FEHLER', '', String(err.message || err)); return null; }
    });
    const bereit = gesendet.filter(Boolean); if (!bereit.length) continue;
    // 4) Dateien anlegen
    const cr = await gqlSicher(gqlFn, `mutation($f:[FileCreateInput!]!){ fileCreate(files:$f){ files{ id fileStatus } userErrors{ field message code } } }`,
      { f: bereit.map(({ g, t }) => ({ originalSource: t.resourceUrl, contentType: 'FILE', filename: g.e.dateiname, alt: 'Vorlagenbild für die Vorschau (Spiegel von Printful, 06.11.2026)' })) }, opts);
    const cue = cr.fileCreate.userErrors || []; const ids = (cr.fileCreate.files || []).map((f) => f.id);
    if (cue.length || ids.length !== bereit.length) { for (const { g } of bereit) { res.fehlgeschlagen.push({ name: g.e.dateiname, grund: 'fileCreate: ' + JSON.stringify(cue).slice(0, 200) }); schreibLedger(g.e.dateiname, 'FEHLER', '', 'fileCreate'); } continue; }
    // 5) auf READY warten
    const stand = new Map(); const offen = new Set(ids);
    for (let v = 0; v < 40 && offen.size; v++) {
      await warte(v === 0 ? 1500 : 3000);
      const d = await gqlSicher(gqlFn, `query($ids:[ID!]!){ nodes(ids:$ids){ ... on GenericFile{ id fileStatus url } ... on MediaImage{ id fileStatus image{ url } } } }`, { ids: [...offen] }, opts);
      for (const n of d.nodes || []) { if (!n) continue; const url = n.url || (n.image && n.image.url) || null; if (n.fileStatus === 'READY' && url) { stand.set(n.id, { url }); offen.delete(n.id); } else if (n.fileStatus === 'FAILED') { stand.set(n.id, { fehler: 'FAILED' }); offen.delete(n.id); } }
    }
    for (const [k, { g }] of bereit.entries()) {
      const id = ids[k]; const s = stand.get(id);
      if (!s || s.fehler) { res.fehlgeschlagen.push({ name: g.e.dateiname, grund: s ? s.fehler : 'nicht READY nach 2 Minuten' }); schreibLedger(g.e.dateiname, 'FEHLER', id, s ? s.fehler : 'Zeitlimit'); continue; }
      hochgeladen[g.e.dateiname] = s.url; res.neu++; schreibLedger(g.e.dateiname, 'OK', id, s.url);
    }
    // 6) Stichprobe (eine Datei je Stapel): das CDN kodiert Bilder zum Teil neu (GEMESSEN 06.11.2026: JPEG 4 678 → 4 724 Byte, 23 854 → 17 203 Byte, PSNR 51 bis 53 dB), darum zählen Abmessungen und Bildtyp, nicht Bytes; ungleiche Bytes sind nur ein Hinweis.
    const probe = bereit.find(({ g }) => hochgeladen[g.e.dateiname]);
    if (probe) {
      try {
        const r = await fetchFn(hochgeladen[probe.g.e.dateiname]); const b = Buffer.from(await r.arrayBuffer());
        const m0 = masse(probe.g.buf), m1 = masse(b);
        if (!m0 || !m1 || m0.b !== m1.b || m0.h !== m1.h) { res.abweichung.push({ name: probe.g.e.dateiname, quelle: m0, cdn: m1, bytes: [probe.g.buf.length, b.length] }); schreibLedger(probe.g.e.dateiname, 'ABWEICHUNG', '', `Abmessungen Quelle ${JSON.stringify(m0)}, CDN ${JSON.stringify(m1)}`); }
        else if (sha(b) !== sha(probe.g.buf)) { res.recodiert = (res.recodiert || 0) + 1; }
      } catch (err) { res.abweichung.push({ name: probe.g.e.dateiname, fehler: String(err.message || err) }); }
    }
    log(`Stapel ${Math.floor(a / stapel) + 1}/${Math.ceil(fehlt.length / stapel)}: neu ${res.neu}, fehlgeschlagen ${res.fehlgeschlagen.length}`);
  }
  fs.writeFileSync(path.join(out, 'hochgeladen.json'), JSON.stringify(hochgeladen, null, 1));
  res.exit = res.abweichung.length ? 3 : res.fehlgeschlagen.length ? 4 : 0;
  return res;
}

/** Rücknahme: löscht nur Dateien, die laut Ledger mit Status OK angelegt wurden und deren Name dem Muster entspricht. */
export async function zuruecknehmen({ gqlFn, ledgerPfad, live = false, log = console.log, warte = schlafen }) {
  const zeilen = fs.readFileSync(ledgerPfad, 'utf8').split('\n').filter((z) => z && !z.startsWith('#')).map((z) => z.split('\t'));
  const ids = zeilen.filter((z) => z[2] === 'OK' && NAME_RE.test(z[1]) && /^gid:\/\/shopify\/(GenericFile|MediaImage)\/\d+$/.test(z[3])).map((z) => z[3]);
  const einmalig = [...new Set(ids)];
  log(`Rücknahme: ${einmalig.length} Dateien laut Ledger${live ? '' : ' (TROCKENLAUF)'}`);
  if (!live) return { geloescht: 0, plan: einmalig.length };
  let geloescht = 0; const fehler = [];
  for (let a = 0; a < einmalig.length; a += 50) {
    const d = await gqlSicher(gqlFn, `mutation($ids:[ID!]!){ fileDelete(fileIds:$ids){ deletedFileIds userErrors{ field message } } }`, { ids: einmalig.slice(a, a + 50) }, { warte });
    geloescht += (d.fileDelete.deletedFileIds || []).length; for (const u of d.fileDelete.userErrors || []) fehler.push(u.message);
  }
  return { geloescht, plan: einmalig.length, fehler };
}

async function haupt() {
  const env = process.env;
  const out = path.resolve(env.OUT || '.');
  const { shopifyClientSecret } = await import('../../../automation/lib/shopify_secret.mjs');
  const SHOP = env.SHOPIFY_SHOP; if (!SHOP) { console.error('SHOPIFY_SHOP fehlt'); return 1; }
  const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const token = (await tr.json()).access_token; if (!token) { console.error('kein Admin-Token'); return 1; }
  const gqlFn = async (query, variables) => {
    const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 300));
    return j.data;
  };
  const live = env.LIVE === '1';
  if (env.ZURUECK === '1') { const r = await zuruecknehmen({ gqlFn, ledgerPfad: path.join(out, 'ledger.tsv'), live }); console.log(JSON.stringify(r)); return r.fehler && r.fehler.length ? 1 : 0; }
  const plan = JSON.parse(fs.readFileSync(env.PLAN, 'utf8'));
  const r = await lauf({ plan, gqlFn, out, live, modelle: liste(env.MODELLE).map(Number), pruefen: env.PRUEFEN === '1', maxDateien: Number(env.MAX_DATEIEN || 1500), stapel: Number(env.STAPEL || 20), parallel: Number(env.PARALLEL || 5) });
  if (r.fehler) { console.error('Plan ungültig:\n' + r.fehler.slice(0, 20).join('\n')); return 2; }
  console.log(`ENDE: neu ${r.neu}, vorhanden ${r.vorhanden}, fehlgeschlagen ${r.fehlgeschlagen.length}, Abweichung ${r.abweichung.length} → Exit ${r.exit}`);
  if (r.fehlgeschlagen.length) console.log(JSON.stringify(r.fehlgeschlagen.slice(0, 10)));
  return r.exit;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) haupt().then((c) => process.exit(c), (e) => { console.error('Fehler:', e.message); process.exit(1); });
