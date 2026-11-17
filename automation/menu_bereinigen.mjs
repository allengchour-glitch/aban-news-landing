#!/usr/bin/env node
/**
 * Hauptmenü bereinigen: eine benannte Liste kleiner Änderungen (Einträge entfernen, Adresse eines Eintrags ändern, Eintrag einfügen) in einem Lauf, sonst ändert sich nichts.
 * Regeln und Prüfungen: lib/menu_bereinigen.mjs (getestet: lib/menu_bereinigen_test.mjs). Aufbau wie menu_eintrag_verschieben.mjs.
 *
 * Aufruf (Trockenlauf ist Vorgabe, nur LIVE=1 schreibt):
 *   AENDERUNGEN=dropship/menu-bereinigung-1711/aenderungen.json [LIVE=1] [MENUE=main-menu] [SICHERUNG_DIR=dropship/menu-sicherung] node automation/menu_bereinigen.mjs
 *   Die Datei: { "ops": [ … ], "verwaistOk": ["handle", …] }   (Änderungsarten siehe lib/menu_bereinigen.mjs)
 *
 * Ablauf (jede Stufe bricht VOR dem Schreiben ab):
 *   1) Menü lesen (3 Ebenen, Form prüfen), die betroffenen Collections frisch lesen,
 *   2) Plan auf einer Kopie des gelesenen Baums, danach unabhängige, id-basierte Nachprüfung (nur die benannten Änderungen, nichts verwaist ausser verwaistOk),
 *   3) Übersetzungen ALLER Menü-Links lesen und sichern (Sprachen ausser der Hauptsprache),
 *   4) Sicherung des ganzen Menüs nach <SICHERUNG_DIR>/<menü>-vor-bereinigen-<UTC-Zeitstempel>.json (nie überschrieben), auch im Trockenlauf,
 *   5) LIVE: Menü direkt vor dem Schreiben noch einmal lesen; weicht es ab, Exit 4 und nichts geschrieben,
 *   6) menuUpdate, frisch lesen, streng mit dem Plan vergleichen (ids bleiben, neuer Eintrag bekommt eine neue id),
 *   7) Übersetzungen frisch lesen: fehlende (von vorher) wieder eintragen, für neue Einträge die französische Bezeichnung eintragen (Feld `fr`), nachlesen.
 * Exit 0 = in Ordnung, 1 = Aufruffehler oder gelesenes Menü unvollständig, 2 = Prüffehler (nichts geschrieben), 3 = geschrieben, aber Abweichung/userErrors/Zustand unklar
 * (Sicherung liegt vor), 4 = Menü während des Laufs verändert (nichts geschrieben).
 * Rücknahme: es gibt keinen Rückwärtsgang im Werkzeug. Die Sicherung <SICHERUNG_DIR>/<menü>-vor-bereinigen-<UTC>.json zeigt den ganzen alten Baum samt ids, Titeln, Adressen und Positionen, die Datei
 *   …-uebersetzungen.json alle Übersetzungen. Entfernte Einträge einzeln im Admin (Onlineshop → Navigation) wieder anlegen (neue ids, französische Titel von Hand), eine geänderte Adresse dort zurücksetzen.
 * Der Sicherungsordner ist relativ zum Arbeitsverzeichnis: aus der Repo-Wurzel starten.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { MENU_Q, COLL_Q, UPDATE_M, pruefeLeseform, eingabeAus, gleichesMenue, zaehle, HANDLE_RE } from './lib/menu_verschieben.mjs';
import { plane, pruefePlan, pruefeOps, benoetigteHandles, vergleicheNachlesen, linkGidVon, alleIds, verlorene } from './lib/menu_bereinigen.mjs';
import { uebersetzungenLesen, uebersetzungenWiederherstellen, LOC_Q, LOCALE_RE, REG_M } from './lib/menu_uebersetzung.mjs';

export const SICHERUNG_DIR = 'dropship/menu-sicherung';

async function menueLesen(q, menue) {
  const d = await q(MENU_Q, { h: `handle:${menue}` });
  return (d?.menus?.nodes || []).find(n => n.handle === menue) || null;
}

/** Sicherung schreiben, nie überschreiben (Flag wx; bei gleichem Namen -2, -3 …). @returns Pfad */
export function sicherungSchreiben(dir, name, jetzt, inhalt) {
  mkdirSync(dir, { recursive: true });
  const stempel = jetzt.toISOString().replace(/[:.]/g, '-');
  for (let n = 1; n <= 50; n++) {
    const datei = `${String(dir).replace(/\/+$/, '')}/${name}-${stempel}${n > 1 ? `-${n}` : ''}.json`;
    try { writeFileSync(datei, JSON.stringify(inhalt, null, 1), { flag: 'wx' }); return datei; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  throw new Error('kein freier Name für die Sicherung');
}

/** Übersetzungen aller Menü-Links lesen: Map link-gid → {locale: {key: wert}}. Wirft bei unlesbarer Antwort. */
export async function uebersetzungenSnapshot(q) {
  const sl = (await q(LOC_Q, {}))?.shopLocales;
  if (!Array.isArray(sl)) throw new Error('shopLocales nicht lesbar');
  const locales = sl.filter(x => x && !x.primary).map(x => x.locale);
  for (const l of locales) if (!LOCALE_RE.test(l)) throw new Error(`ungültiger Sprachcode «${l}»`);
  const t = locales.map((l, n) => `t${n}: translations(locale:"${l}"){ key value }`).join(' ');
  const Q = `query($a:String){ translatableResources(first:250, resourceType:LINK, after:$a){ pageInfo{ hasNextPage endCursor } nodes{ resourceId ${t} } } }`;
  const aus = {}; let after = null;
  for (let seite = 0; seite < 20; seite++) {
    const r = (await q(Q, { a: after }))?.translatableResources;
    if (!r || !Array.isArray(r.nodes)) throw new Error('translatableResources nicht lesbar');
    for (const n of r.nodes) {
      const o = {};
      locales.forEach((l, i) => { const lst = n[`t${i}`]; if (!Array.isArray(lst)) throw new Error(`Übersetzungen ${l} nicht lesbar`); if (lst.length) o[l] = Object.fromEntries(lst.map(x => [x.key, x.value])); });
      aus[n.resourceId] = o;
    }
    if (!r.pageInfo?.hasNextPage) return aus;
    after = r.pageInfo.endCursor;
  }
  throw new Error('zu viele Seiten bei translatableResources');
}

/**
 * Der ganze Lauf mit eingespeister Abfrage `q(query, variables)`.
 * @returns {Promise<{code:number, plan?:object[], info?:object, sicherung?:string, fehler?:string[]}>}
 */
export async function bereinigenLauf(q, { ops, verwaistOk = [], live = false, menue = 'main-menu', sicherungDir = SICHERUNG_DIR, jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  const pf0 = pruefeOps(ops);
  if (!Array.isArray(verwaistOk) || !verwaistOk.every(h => typeof h === 'string' && HANDLE_RE.test(h))) { err('ABBRUCH (Aufruf): verwaistOk muss eine Liste gültiger Handles sein'); return { code: 1, fehler: ['verwaistOk'] }; }
  if (pf0.length) { err('ABBRUCH (Aufruf):\n- ' + pf0.join('\n- ')); return { code: 1, fehler: pf0 }; }
  if (!menue || !HANDLE_RE.test(menue)) { err(`MENUE ist ungültig («${menue}»)`); return { code: 1 }; }
  out(`${live ? 'LIVE' : 'Trockenlauf'}: ${ops.length} Änderungen am Menü ${menue}`);

  const m = await menueLesen(q, menue);
  if (!m) { err(`Menü «${menue}» nicht gefunden`); return { code: 1 }; }
  const lf = pruefeLeseform(m);
  if (lf.length) { err(`ABBRUCH, nichts geschrieben: das gelesene Menü ist unvollständig (${lf.length} Befunde):\n- ` + lf.slice(0, 10).join('\n- ')); return { code: 1, fehler: lf }; }
  const alt = eingabeAus(m.items);
  out(`Menü gelesen: ${zaehle(alt)} Einträge, ${alt.length} oben.`);

  const colIds = {};
  for (const h of benoetigteHandles(ops)) {
    const c = (await q(COLL_Q, { h }))?.collectionByHandle;
    colIds[h] = c?.id || undefined;
  }
  const r = plane(alt, ops, { colIds, verwaistOk });
  if (r.fehler.length) { err('ABBRUCH, nichts geschrieben:\n- ' + r.fehler.join('\n- ')); return { code: 2, fehler: r.fehler }; }
  const pf = pruefePlan(alt, r.plan, ops, { colIds });
  if (pf.length) { err('ABBRUCH, nichts geschrieben (Nachprüfung des Plans):\n- ' + pf.join('\n- ')); return { code: 2, fehler: pf }; }
  const { plan, info } = r;
  for (const e of info.entfernt) out(`ENTFERNEN: «${e.pfad}» (${e.type}, ${e.url}, id ${e.id})`);
  for (const e of info.url) out(`ADRESSE: «${e.pfad}» ${e.alt} → ${e.neu} (id ${e.id})`);
  for (const e of info.eingefuegt) out(`EINFÜGEN: «${e.titel ?? e.title}» (/collections/${e.handle}) unter «${e.eltern}» an Stelle ${e.pos + 1}${e.fr ? `, fr «${e.fr}»` : ''}`);
  out(info.verwaist.length ? `Nirgends mehr im Menü (erlaubt): ${info.verwaist.join(', ')}` : 'Keine Collection fällt aus dem Menü.');
  out(`Einträge: vorher ${info.vorher}, nachher ${info.gesamt}.`);

  let ueVorher;
  try { ueVorher = await uebersetzungenSnapshot(q); }
  catch (x) { err(`ABBRUCH, nichts geschrieben: Übersetzungen nicht lesbar (${x.message})`); return { code: 1, fehler: ['Übersetzungen'] }; }
  out(`Übersetzungen gelesen: ${Object.keys(ueVorher).length} Links.`);

  let sicherung;
  try {
    sicherung = sicherungSchreiben(sicherungDir, `${menue}-vor-bereinigen`, jetzt(), m);
    sicherungSchreiben(sicherungDir, `${menue}-vor-bereinigen-uebersetzungen`, jetzt(), ueVorher);
  } catch (x) { err(`ABBRUCH, nichts geschrieben: Sicherung ging nicht (${x.message})`); return { code: 1, fehler: ['Sicherung'] }; }
  out(`Sicherung: ${sicherung}`);
  if (!live) { out('Trockenlauf: nichts geschrieben.'); return { code: 0, plan, info, sicherung }; }

  const frisch = await menueLesen(q, menue);
  const g = gleichesMenue(m, frisch);
  if (!g.gleich) { err(`ABBRUCH, nichts geschrieben: das Menü hat sich seit dem Lesen verändert (${g.grund}). Bitte neu starten.`); return { code: 4, fehler: ['Menü verändert'], sicherung }; }

  // ab hier: jeder Fehler ist Exit 3 (Zustand mit der Sicherung prüfen)
  let w;
  try { w = await q(UPDATE_M, { id: m.id, t: m.title, h: m.handle, i: plan }); }
  catch (x) { err(`FEHLER beim Schreiben (${x.message}): Zustand unklar, bitte das Menü lesen. Sicherung: ${sicherung}`); return { code: 3, fehler: ['menuUpdate unklar'], sicherung }; }
  const ue = w?.menuUpdate?.userErrors;
  if (!Array.isArray(ue) || ue.length) { err(`menuUpdate meldet Fehler: ${JSON.stringify(ue ?? w)}. Sicherung: ${sicherung}`); return { code: 3, fehler: ['userErrors'], sicherung }; }
  let zurueck;
  try { zurueck = await menueLesen(q, menue); } catch (x) { zurueck = null; err(`FEHLER beim Nachlesen (${x.message})`); }
  if (!zurueck || zurueck.id !== m.id) { err(`ABWEICHUNG: Menü nach dem Schreiben nicht lesbar oder andere Menü-id. Sicherung: ${sicherung}`); return { code: 3, fehler: ['Nachlesen'], sicherung }; }
  let zEin, v;
  try { zEin = eingabeAus(zurueck.items); v = vergleicheNachlesen(plan, zEin, alleIds(alt)); }
  catch (x) { err(`ABWEICHUNG: das zurückgelesene Menü ließ sich nicht vergleichen (${x.message}). Sicherung: ${sicherung}`); return { code: 3, fehler: ['Vergleich'], sicherung }; }
  out(`Vergleich geplant ↔ zurückgelesen: ${v.fehler.length ? `${v.fehler.length} Abweichungen` : 'gleich'}, Einträge ${zaehle(zEin)}, neue ids ${v.neueIds.join(', ') || '-'}`);
  if (v.fehler.length) { err('ABWEICHUNG nach dem Schreiben:\n- ' + v.fehler.slice(0, 15).join('\n- ') + `\nSicherung: ${sicherung}`); return { code: 3, fehler: v.fehler, sicherung }; }

  // Übersetzungen: fehlende wieder eintragen, für neue Einträge die französische Bezeichnung
  const offen = [];
  try {
    const ueNach = await uebersetzungenSnapshot(q);
    const idsPlan = new Set([...alleIds(plan)].map(linkGidVon));
    const weg = verlorene(ueVorher, ueNach, idsPlan);
    out(`Übersetzungen nach dem Schreiben: ${weg.length} von vorher fehlen oder weichen ab.`);
    for (const gid of [...new Set(weg.map(x => x.gid))]) {
      const menuItemId = `gid://shopify/MenuItem/${gid.split('/').pop()}`;
      const werte = weg.filter(x => x.gid === gid);
      try {
        const w8 = await uebersetzungenWiederherstellen(q, menuItemId, werte);
        out(`  ${gid}: ${w8.eingetragen} wieder eingetragen${w8.fehler.length ? `, offen: ${w8.fehler.join(' | ')}` : ''}`);
        offen.push(...w8.fehler);
      } catch (x) { offen.push(`${gid}: ${x.message}`); }
    }
    // neue Einträge: fr eintragen
    const neuePositionen = info.eingefuegt;
    for (const e of neuePositionen) {
      if (!e.fr) continue;
      const neuId = v.neueIds.find(id => {
        const hit = [];
        (function l(x) { for (const i of x || []) { if (i.id === id && i.title === e.title && i.resourceId === e.resourceId) hit.push(i); l(i.items); } })(zEin);
        return hit.length;
      });
      if (!neuId) { offen.push(`neuer Eintrag «${e.title}» in der Nachlese nicht auffindbar`); continue; }
      try {
        const lg = await uebersetzungenLesen(q, neuId);
        const digest = lg.digest.title;
        if (!digest) { offen.push(`${e.title}: kein Digest`); continue; }
        const rr = (await q(REG_M, { id: lg.rid, t: [{ key: 'title', locale: 'fr', value: e.fr, translatableContentDigest: digest }] }))?.translationsRegister;
        if (!rr || (rr.userErrors || []).length) { offen.push(`${e.title}: translationsRegister ${JSON.stringify(rr?.userErrors ?? rr)}`); continue; }
        const nach2 = await uebersetzungenLesen(q, neuId);
        if (!nach2.werte.some(x => x.locale === 'fr' && x.key === 'title' && x.value === e.fr)) offen.push(`${e.title}: fr nach dem Eintragen nicht lesbar`);
        else out(`  neuer Eintrag «${e.title}»: fr «${e.fr}» eingetragen`);
      } catch (x) { offen.push(`${e.title}: fr eintragen: ${x.message}`); }
    }
  } catch (x) { offen.push(`Übersetzungen: ${x.message}`); }
  if (offen.length) { err('ÜBERSETZUNG offen (Menü selbst ist richtig):\n- ' + offen.join('\n- ') + `\nSicherung: ${sicherung}`); return { code: 3, fehler: offen, sicherung }; }
  out('OK: nur die benannten Änderungen, alles andere unverändert.');
  return { code: 0, plan, info, sicherung };
}

async function main() {
  const datei = process.env.AENDERUNGEN;
  if (!datei) { console.error('AENDERUNGEN=<Datei mit {ops, verwaistOk}> ist Pflicht'); process.exit(1); }
  let cfg;
  try { cfg = JSON.parse(readFileSync(datei, 'utf8')); } catch (e) { console.error(`AENDERUNGEN nicht lesbar: ${e.message}`); process.exit(1); }
  const opt = { ops: cfg.ops, verwaistOk: cfg.verwaistOk || [], live: process.env.LIVE === '1', menue: process.env.MENUE || 'main-menu', sicherungDir: process.env.SICHERUNG_DIR || SICHERUNG_DIR };
  if (pruefeOps(opt.ops).length) { const r = await bereinigenLauf(() => { throw new Error('kein Netz bei Aufruffehlern'); }, opt); process.exit(r.code); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!SHOP || !process.env.SHOPIFY_CLIENT_ID || !CS) { console.error('SHOPIFY_SHOP, SHOPIFY_CLIENT_ID und SHOPIFY_CLIENT_SECRET sind Pflicht'); process.exit(1); }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json().catch(() => ({}))).access_token;
  if (!tok) { console.error(`Kein Shopify-Token (HTTP ${r.status})`); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await bereinigenLauf(q, opt);
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
