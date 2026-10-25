#!/usr/bin/env node
/**
 * Kategorie-Prüfer: misst für JEDE Collection, wie viele ihrer aktiven Produkte laut Google-Kategorie nicht zum Thema der Seite gehören.
 * NUR LESEN. Schreibt einen CSV-Bericht (dropship/kategorie-pruefung.csv) und listet die schlechtesten.
 *
 * WARUM (25.10.2026): Smart-Collections mit «Titel enthält …» kennen keine Wortgrenze — «SSD» steckt in «Stossdämpfend» (Hundeleinen unter
 * PC-Komponenten), «Wimpern» in «Wimpern-Bordüre» (Spitzen-Body unter Wimpern & Lashes), «Tasse» in «Tassel». Jede Seite, die der User öffnete,
 * zeigte nach kurzer Zeit einen solchen Fremdkörper. Dieses Werkzeug sucht sie, bevor jemand sie findet.
 *
 * Vorgehen: Regeln jeder Collection LOKAL auf dem Katalog (katalog_titel_scan.mjs, mit Google-Kategorie) auswerten; je Collection die Verteilung
 * der Google-Kategorie (Ebene 2) bilden; als Kern gelten die Gruppen mit ≥ 8 % der Mitglieder; Ausreisser = Mitglieder ausserhalb des Kerns.
 * Nur Collections mit klarem Thema (grösste Gruppe ≥ 50 %) werden bewertet — Preis-/Anlass-Sammlungen sind absichtlich gemischt.
 *
 * Aufruf: node automation/kategorie_pruefer.mjs     (KATALOG=/tmp/katalog_voll.json · NUR_MENUE=1 · MIN=20)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';

const KATALOG = process.env.KATALOG || '/tmp/katalog_voll.json', MIN = Number(process.env.MIN || 20);

const klein = s => String(s || '').toLowerCase();
/** Wertet EINE Regel auf einem Produkt aus. null = nicht auswertbar. Rein, getestet. */
export function regelPasst(r, p) {
  const c = r.column, rel = r.relation, v = klein(r.condition);
  if (c === 'TAG') { const t = (p.tags || []).map(klein); return rel === 'EQUALS' ? t.includes(v) : rel === 'NOT_EQUALS' ? !t.includes(v) : null; }
  if (c === 'TITLE') { const t = klein(p.title); return rel === 'CONTAINS' ? t.includes(v) : rel === 'NOT_CONTAINS' ? !t.includes(v) : rel === 'EQUALS' ? t === v : rel === 'STARTS_WITH' ? t.startsWith(v) : rel === 'ENDS_WITH' ? t.endsWith(v) : null; }
  if (c === 'TYPE') { const t = klein(p.productType); return rel === 'EQUALS' ? t === v : rel === 'NOT_EQUALS' ? t !== v : null; }
  return null;
}
/** Collection-Regel → Mitgliederliste (oder null, wenn eine Regel nicht lokal auswertbar ist). */
export function mitglieder(ruleSet, produkte) {
  if (!ruleSet?.rules?.length) return null;
  const out = [];
  for (const p of produkte) {
    const res = ruleSet.rules.map(r => regelPasst(r, p));
    if (res.includes(null)) return null;
    if (ruleSet.appliedDisjunctively ? res.some(Boolean) : res.every(Boolean)) out.push(p);
  }
  return out;
}
const bereich = p => (p.g || '(ohne)').split(' > ')[0];
/** Titel-Regel-Collections: Mitglieder aus einem ANDEREN Bereich (Ebene 1) als dem der Mehrheit. Rein, getestet. */
export function fremdkoerper(mit, schwelle = 0.08) {
  const z = new Map(); for (const p of mit) z.set(bereich(p), (z.get(bereich(p)) || 0) + 1);
  const kern = new Set([...z.entries()].filter(([, n]) => n / mit.length >= schwelle).map(([k]) => k));
  return { kern: [...kern], fremd: mit.filter(p => !kern.has(bereich(p)) && p.g) };
}
export const nurTitelRegeln = ruleSet => !!ruleSet?.rules?.length && ruleSet.rules.every(r => r.column === 'TITLE' && /CONTAINS/.test(r.relation));
const gruppe = p => (p.g || '(ohne)').split(' > ').slice(0, 2).join(' > ');
/** Verteilung → { kern, ausreisser, anteilTop }. Rein, getestet. */
export function bewerte(mit) {
  const z = new Map(); for (const p of mit) z.set(gruppe(p), (z.get(gruppe(p)) || 0) + 1);
  const sortiert = [...z.entries()].sort((a, b) => b[1] - a[1]);
  const anteilTop = sortiert[0][1] / mit.length;
  const kern = new Set(sortiert.filter(([, n]) => n / mit.length >= 0.08).map(([k]) => k));
  const ausreisser = mit.filter(p => !kern.has(gruppe(p)));
  return { kern: [...kern], ausreisser, anteilTop, gruppen: sortiert.slice(0, 5) };
}

async function main() {
  const katalog = JSON.parse(readFileSync(KATALOG, 'utf8')), produkte = katalog.produkte;
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', (r.__t ||= null) || tokHolder.t, query, variables);
  const tokHolder = { t: (await r.json()).access_token };
  const menue = new Set();
  const m = (await q(`query{menus(first:1,query:"handle:main-menu"){nodes{items{url items{url items{url}}}}}}`)).menus.nodes[0];
  (function lauf(l) { for (const i of l || []) { const mm = (i.url || '').match(/\/collections\/([a-z0-9%\-]+)/i); if (mm) menue.add(decodeURIComponent(mm[1])); lauf(i.items); } })(m.items);
  let cur = null; const koll = [];
  do { const d = await q(`query($c:String){collections(first:100,after:$c){nodes{handle title ruleSet{appliedDisjunctively rules{column relation condition}}} pageInfo{hasNextPage endCursor}}}`, { c: cur });
    koll.push(...d.collections.nodes); cur = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null; } while (cur);
  console.log(`Collections: ${koll.length} · im Menü: ${menue.size} · aktive Produkte: ${produkte.length}`);
  const fk = [];
  const zeilen = [['handle', 'titel', 'im_menue', 'mitglieder', 'ausreisser', 'anteil_aus', 'kern', 'beispiele'].join(';')];
  const bericht = []; let nichtAuswertbar = 0, thema = 0;
  for (const k of koll) {
    if (process.env.NUR_MENUE === '1' && !menue.has(k.handle)) continue;
    const mit = mitglieder(k.ruleSet, produkte);
    if (!mit) { nichtAuswertbar++; continue; }
    if (mit.length < MIN) continue;
    if (nurTitelRegeln(k.ruleSet)) { const x = fremdkoerper(mit); if (x.fremd.length >= 3) fk.push({ handle: k.handle, titel: k.title, menue: menue.has(k.handle), mit: mit.length, n: x.fremd.length, kern: x.kern.join(' + '), bsp: x.fremd.slice(0, 5).map(p => p.title.slice(0, 34) + ' [' + p.g.split(' > ').slice(0, 2).join('>') + ']').join(' | ') }); }
    const b = bewerte(mit);
    if (b.anteilTop < 0.5) continue;           // gemischte Sammlung (Preis, Anlass, Saison) — kein Themenfehler
    thema++;
    const n = b.ausreisser.length; if (!n) continue;
    const bsp = b.ausreisser.slice(0, 4).map(p => p.title.slice(0, 40)).join(' | ');
    zeilen.push([k.handle, k.title.replace(/;/g, ','), menue.has(k.handle) ? 'ja' : 'nein', mit.length, n, (n / mit.length * 100).toFixed(1), b.kern.join(' + '), bsp.replace(/;/g, ',')].join(';'));
    bericht.push({ handle: k.handle, menue: menue.has(k.handle), mit: mit.length, n, anteil: n / mit.length, kern: b.kern.slice(0, 2).join(' + '), bsp });
  }
  writeFileSync('dropship/kategorie-pruefung.csv', zeilen.join('\n') + '\n');
  bericht.sort((a, b) => b.n - a.n);
  console.log(`Themen-Collections bewertet: ${thema} · nicht lokal auswertbar (Preis/Taxonomie …): ${nichtAuswertbar} · mit Ausreissern: ${bericht.length}\n`);
  fk.sort((a, b) => b.n - a.n);
  writeFileSync('dropship/kategorie-fremdkoerper.json', JSON.stringify(fk, null, 1));
  console.log(`TITEL-REGEL-COLLECTIONS MIT FREMDKÖRPERN (anderer Google-Bereich als die Mehrheit): ${fk.length}\n`);
  for (const x of fk.slice(0, Number(process.env.ZEIGE_FK || 40))) console.log(String(x.n).padStart(4), String(x.mit).padStart(5), (x.menue ? 'ja' : '–').padStart(3), ' ', x.handle, '→', x.kern, '|', x.bsp.slice(0, 200));
  console.log('\nAUSREISSER  ANTEIL  MITGL  MENÜ  HANDLE → Kern | Beispiele');
  for (const x of bericht.slice(0, Number(process.env.ZEIGE || 45))) console.log(String(x.n).padStart(9), `${(x.anteil * 100).toFixed(0)}%`.padStart(6), String(x.mit).padStart(6), (x.menue ? 'ja' : '–').padStart(5), ' ', x.handle, '→', x.kern, '|', x.bsp.slice(0, 110));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
