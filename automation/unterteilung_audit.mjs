#!/usr/bin/env node
/**
 * Unterteilungs-Audit: welche Menüseiten sind zu gross und zu wenig unterteilt? NUR LESEN.
 *
 * Auslöser (Besitzer 27.10.2026): «Kopfhörer & Audio» zeigte Ohrhörer, Gaming-Headset und Lautsprecher in einer Liste; er klickte «per Zufall» auf weitere Seiten.
 * Das Werkzeug sucht diese Seiten systematisch, statt dass jemand sie findet.
 *
 * Je Menüseite (Collection mit lokal auswertbarer Regel, ≥ MIN Mitglieder):
 *   - Mitglieder, grösste Google-Gruppen (Ebene 3) → «Durchmischung»
 *   - Abdeckung durch die LIVE-Kinder im Menü (Vereinigung der Kind-Mitglieder ∩ Seite)
 *   - geplante Kategorien (dropship/taxonomie-2610-b/bereiche/*.json), die zu ≥ 50 % in dieser Seite liegen, und ihre Abdeckung
 *   - «Rest» = Anteil der Seite, den weder ein Live-Kind noch eine geplante Kategorie trägt
 * Rangfolge = Mitglieder × (1 − Abdeckung durch Live-Kinder), nur Seiten ohne eigene Unterkategorien in der Mode-Taxonomie (die ist live).
 *
 * Aufruf: KATALOG=/tmp/katalog_audit.json node automation/unterteilung_audit.mjs   (MIN=100 · ZEIGE=70 · OUT=/tmp/unterteilung_audit.json)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { mitglieder } from './lib/regel_auswerten.mjs';
import { passt, normiere } from '../dropship/taxonomie-2610-b/kern.mjs';
process.env.MODE_BEREICHE ||= 'bekleidung,schuhe,taschen,accessoires';   // vor dem Laden setzen: lib/kategorien.mjs liest es beim Import
const { KATEGORIEN } = await import('./lib/kategorien.mjs');

const KATALOG = process.env.KATALOG || '/tmp/katalog_audit.json', MIN = Number(process.env.MIN || 100), ZEIGE = Number(process.env.ZEIGE || 70);
const OUT = process.env.OUT || '/tmp/unterteilung_audit.json';

const g3 = p => (p.g || '(ohne)').split(' > ').slice(0, 3).join(' > ');
const verteilung = (mit, n = 3) => { const z = new Map(); for (const p of mit) z.set(g3(p), (z.get(g3(p)) || 0) + 1); return [...z.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k.replace('Apparel & Accessories', 'A&A')} ${Math.round(v / mit.length * 100)}%`); };

async function main() {
  const produkte = JSON.parse(readFileSync(KATALOG, 'utf8')).produkte;
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) throw new Error('Kein Shopify-Token');
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  // Menü als Baum (Ebene 1-3) mit Collection-Handle
  const m = (await q(`query{menus(first:1,query:"handle:main-menu"){nodes{items{title url items{title url items{title url}}}}}}`)).menus.nodes[0];
  const handleVon = url => { const x = (url || '').match(/\/collections\/([a-z0-9%\-]+)/i); return x ? decodeURIComponent(x[1]) : null; };
  const knoten = [];
  (function lauf(liste, pfad, eltern) { for (const i of liste || []) { const h = handleVon(i.url); const k = { titel: i.title, handle: h, pfad: [...pfad, i.title], eltern, kinder: (i.items || []).map(c => handleVon(c.url)).filter(Boolean) }; knoten.push(k); lauf(i.items, k.pfad, h); } })(m.items, [], null);

  let cur = null; const koll = new Map();
  do { const d = await q(`query($c:String){collections(first:100,after:$c){nodes{handle title ruleSet{appliedDisjunctively rules{column relation condition}}} pageInfo{hasNextPage endCursor}}}`, { c: cur });
    for (const k of d.collections.nodes) koll.set(k.handle, k); cur = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null; } while (cur);

  // Unterfilter-Chips der Mode-Taxonomie (live): Seiten mit Chips gelten als unterteilt
  const chipsJe = new Map();
  const idZuHandle = new Map(KATEGORIEN.map(k => [k.id, k.handle]));
  for (const k of KATEGORIEN) if (k.filter) { const h = idZuHandle.get(k.eltern_id); if (h) chipsJe.set(h, (chipsJe.get(h) || 0) + 1); }

  const memo = new Map();
  const mitgl = h => { if (!memo.has(h)) { const k = koll.get(h); memo.set(h, k ? mitglieder(k.ruleSet, produkte) : null); } return memo.get(h); };

  // geplante Kategorien
  const dir = new URL('../dropship/taxonomie-2610-b/bereiche/', import.meta.url);
  const geplant = [];
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    for (const k of d.kategorien) { const ids = new Set(); for (const p of produkte) if (passt(k, normiere(p))) ids.add(p.id); if (ids.size >= 15) geplant.push({ bereich: d.bereich, handle: k.handle, titel: k.titel, ids }); }
  }
  console.log(`Menüseiten: ${knoten.length} · Collections: ${koll.size} · geplante Kategorien (≥ 15 Treffer): ${geplant.length} · Produkte: ${produkte.length}`);

  const zeilen = [], gesehen = new Map();
  for (const k of knoten) {
    if (!k.handle) continue;
    if (gesehen.has(k.handle)) { gesehen.get(k.handle).weitere.push(k.pfad.join(' > ')); continue; }
    const mit = mitgl(k.handle); if (!mit || mit.length < MIN) continue;
    const ids = new Set(mit.map(p => p.id));
    const kinderIds = new Set();
    // Landeseite (gleicher Titel wie der Eltern-Eintrag oder gleicher Handle): die Geschwister sind ihre Unterteilung
    const eltern = knoten.find(e => e.handle && e.pfad.length === k.pfad.length - 1 && k.pfad.slice(0, -1).join('|') === e.pfad.join('|'));
    const kinder = (eltern && (k.titel === eltern.titel || k.handle === eltern.handle)) ? eltern.kinder.filter(h => h !== k.handle) : k.kinder;
    for (const c of kinder) { const cm = mitgl(c); if (cm) for (const p of cm) if (ids.has(p.id)) kinderIds.add(p.id); }
    const passende = geplant.filter(c => { let in_ = 0; for (const id of c.ids) if (ids.has(id)) in_++; return in_ / c.ids.size >= 0.5 && in_ >= 15; });
    const planIds = new Set(); for (const c of passende) for (const id of c.ids) if (ids.has(id)) planIds.add(id);
    const beides = new Set([...kinderIds, ...planIds]);
    const chips = chipsJe.get(k.handle) || 0;
    const z = { pfad: k.pfad.join(' > '), handle: k.handle, weitere: [], chips, n: mit.length, kinderLive: kinder.length, abdeckungLive: kinderIds.size / mit.length, geplant: passende.length, abdeckungPlan: planIds.size / mit.length,
      rest: 1 - beides.size / mit.length, restN: mit.length - beides.size, top: verteilung(mit), geplantListe: passende.slice(0, 8).map(c => c.handle) };
    zeilen.push(z); gesehen.set(k.handle, z);
  }
  // «bleibt offen» = Mitglieder, die weder ein Live-Kind noch Chips tragen
  for (const z of zeilen) z.offen = z.chips >= 2 ? 0 : z.n * (1 - z.abdeckungLive);
  zeilen.sort((a, b) => b.offen - a.offen);
  writeFileSync(OUT, JSON.stringify(zeilen, null, 1));
  console.log(`\nSEITEN ≥ ${MIN} Mitglieder: ${zeilen.length} → ${OUT}\n`);
  console.log('MITGL  KINDER  CHIPS  ABDECKUNG(live)  GEPLANT(Anz)  ABDECKUNG(plan)  REST  SEITE | grösste Google-Gruppen');
  for (const z of zeilen.slice(0, ZEIGE)) if (z.offen > 0) console.log(String(z.n).padStart(5), String(z.kinderLive).padStart(5), String(z.chips).padStart(5), `${Math.round(z.abdeckungLive * 100)}%`.padStart(12), String(z.geplant).padStart(12), `${Math.round(z.abdeckungPlan * 100)}%`.padStart(14), `${Math.round(z.rest * 100)}%`.padStart(7), ' ', z.pfad.slice(0, 60), '|', z.top.join('; ').slice(0, 100));
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
