#!/usr/bin/env node
/**
 * Kategorien aufbauen: Tags setzen/entfernen, Collections anlegen oder auf Tag-Regeln umstellen, publizieren, Menü umbauen.
 * Die Regeln stehen in lib/kategorien.mjs (getestet), der Menü-Umbau in lib/menue_plan.mjs (getestet).
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gerechnet und aufgelistet (nichts geschrieben).
 *
 * Aufruf:  node automation/kategorien_anlegen.mjs                       (Trockenlauf, alle Kategorien)
 *          IDS=kissen,vasen node automation/kategorien_anlegen.mjs       (nur diese)
 *          LIVE=1 PHASE=tags|sammlungen|menue node automation/kategorien_anlegen.mjs
 * Schalter: KATALOG=/tmp/katalog_voll.json (Ergebnis von katalog_titel_scan.mjs, MIT Google-Kategorie — frisch halten!)
 *           LISTE=pfad  schreibt je Kategorie alle Titel in eine Datei (zum Durchlesen vor dem Schreiben)
 *
 * Gelernt (25.10.2026): ein Tag-Wechsel ist die Grundlage, die Collection hängt nur am Tag. Vor LIVE die Listen LESEN — beide Seiten.
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, statSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { KATEGORIEN, BEREINIGUNG, MENUE_NUR, SCHMUCK_AN, gehoertIn } from './lib/kategorien.mjs';
import { ladeOrakel, orakelAbweichungen } from './lib/bereich_taxonomie.mjs';
import { UMBAU, anwenden, einfuegenPfad, alleRessourcen, tiefe, gleicherBaum, flach } from './lib/menue_plan.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';

const LIVE = process.env.LIVE === '1';
const PHASE = process.env.PHASE || 'alle';
const KATALOG = process.env.KATALOG || '/tmp/katalog_voll.json';
const IDS = (process.env.IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const PREFIX = process.env.PREFIX || '';   // z. B. PREFIX=m- für alle Mode-Kategorien (IDS wäre bei ~190 Einträgen zu lang)
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;

async function main() {
  if (!existsSync(KATALOG)) { console.error(`Katalogdatei ${KATALOG} fehlt — erst katalog_titel_scan.mjs laufen lassen`); process.exit(1); }
  const katalog = JSON.parse(readFileSync(KATALOG, 'utf8'));
  // Schmuck (SCHMUCK=1): Tag und Collection hängen am Katalog. Das Orakel der Tests stammt aus einem Schnappschuss (26.10. 20:14, bei der Gegenlesung 26 Stunden alt) -
  // LIVE nur mit frisch gelesenem Katalog (KATALOG_MAX_STUNDEN, Vorgabe 12; KATALOG_ALT_OK=1 hebt die Sperre bewusst auf).
  if (LIVE && SCHMUCK_AN && process.env.KATALOG_ALT_OK !== '1') {
    const alter = (Date.now() - statSync(KATALOG).mtimeMs) / 3.6e6, grenze = Number(process.env.KATALOG_MAX_STUNDEN || 12);
    if (!(alter <= grenze)) { console.error(`ABBRUCH: der Katalog ${KATALOG} ist ${alter.toFixed(1)} Stunden alt (erlaubt ${grenze}). Erst katalog_titel_scan.mjs neu laufen lassen, oder bewusst KATALOG_ALT_OK=1.`); process.exit(2); }
  }
  if (!katalog.vollstaendig) console.log('WARNUNG: Katalog ist unvollständig gelesen — Stale-Tags werden nicht bereinigt.');
  const produkte = katalog.produkte;
  console.log(`Katalog: ${produkte.length} aktive Produkte (${produkte.filter(p => p.g).length} mit Google-Kategorie)`);

  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);

  // ── 1) Mitglieder je Kategorie ──
  const kats = KATEGORIEN.filter(k => (!IDS.length || IDS.includes(k.id)) && (!PREFIX || k.id.startsWith(PREFIX)));
  const plan = [];
  const tagDazu = new Map(), tagWeg = new Map();           // tag → Set(productId)
  const merke = (m, tag, id) => { if (!m.has(tag)) m.set(tag, new Set()); m.get(tag).add(id); };
  for (const k of kats) {
    const mit = produkte.filter(p => gehoertIn(k, p));
    const ok = mit.length >= k.min;
    const dazu = mit.filter(p => !p.tags.includes(k.tag));
    const weg = katalog.vollstaendig ? produkte.filter(p => p.tags.includes(k.tag) && !mit.includes(p)) : [];
    plan.push({ k, mit, ok, dazu, weg });
    if (ok) { for (const p of dazu) merke(tagDazu, k.tag, p.id); for (const p of weg) merke(tagWeg, k.tag, p.id); }
  }
  // ── 2) Bereinigungen (nur wenn alle Kategorien gerechnet werden oder ausdrücklich BEREINIGEN=1) ──
  const bereinigen = (!IDS.length && !PREFIX) || process.env.BEREINIGEN === '1';
  const bereinigung = [];
  if (bereinigen) for (const b of BEREINIGUNG) {
    const treffer = produkte.filter(p => b.wenn(p));
    let weg = 0, dazu = 0;
    for (const p of treffer) {
      for (const t of b.entfernt(p)) if (p.tags.includes(t)) { merke(tagWeg, t, p.id); weg++; }
      for (const t of b.setzt(p)) if (!p.tags.includes(t)) { merke(tagDazu, t, p.id); dazu++; }
    }
    bereinigung.push({ id: b.id, grund: b.grund, treffer: treffer.length, weg, dazu });
  }

  // ── 3) Bericht ──
  console.log('\nKATEGORIE'.padEnd(26), 'MIN'.padStart(4), 'MITGL'.padStart(6), 'TAG+'.padStart(6), 'TAG-'.padStart(6), ' STATUS');
  for (const { k, mit, ok, dazu, weg } of plan) console.log(k.id.padEnd(25), String(k.min).padStart(4), String(mit.length).padStart(6), String(dazu.length).padStart(6), String(weg.length).padStart(6), ' ', ok ? (k.bestehend ? 'umstellen' : 'neu') : 'ZU KLEIN → wird nicht angelegt');
  if (SCHMUCK_AN) { // Katalogdrift gegen den Schnappschuss, aus dem das Orakel der Tests stammt
    const zahlen = Object.fromEntries(plan.filter(p => p.k.aus_datei).map(p => [p.k.handle, p.mit.length])), abw = orakelAbweichungen(zahlen, ladeOrakel());
    console.log(`\nSchmuck gegen das Orakel (Katalog vom 26.10.2026): ${abw.length ? `${abw.length} Abweichungen über 10 % und 3 Produkten` : 'keine Abweichung über 10 % und 3 Produkten'}`);
    for (const a of abw.slice(0, 20)) console.log(`  ${a.handle.padEnd(44)} ${String(a.alt).padStart(5)} → ${String(a.neu).padStart(5)} (${a.diff > 0 ? '+' : ''}${a.diff})`);
  }
  for (const b of bereinigung) console.log(`\nBereinigung ${b.id}: ${b.treffer} Treffer · Tag entfernen ${b.weg} · Tag setzen ${b.dazu}\n   Grund: ${b.grund}`);
  if (process.env.LISTE) {
    const zeilen = [];
    for (const { k, mit } of plan) { zeilen.push(`\n=== ${k.id} (${mit.length}) ===`); for (const p of mit) zeilen.push(`${p.handle.slice(0, 44).padEnd(44)} | ${p.title.slice(0, 54).padEnd(54)} | ${(p.g || '').split(' > ').slice(-2).join(' > ')}`); }
    writeFileSync(process.env.LISTE, zeilen.join('\n')); console.log('\nListen geschrieben:', process.env.LISTE);
  }
  const summeTags = [...tagDazu.values(), ...tagWeg.values()].reduce((a, s) => a + s.size, 0);
  console.log(`\nTag-Änderungen insgesamt: ${summeTags}`);

  // Existenz-Prüfung der Collections
  const bestand = {};
  for (const { k } of plan) {
    const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id title productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}`, { h: k.handle })).collectionByHandle;
    bestand[k.id] = c;
    const s = c ? `existiert (${c.productsCount.count}; ${c.ruleSet ? c.ruleSet.rules.slice(0, 2).map(x => `${x.column} ${x.relation} ${x.condition}`).join(' ; ') : 'manuell'})` : 'neu';
    if (!k.bestehend && c && !(c.ruleSet?.rules.length === 1 && c.ruleSet.rules[0].condition === k.tag)) console.log(`  ⚠ ${k.handle}: Handle ist belegt mit anderer Regel → wird NICHT überschrieben (${s})`);
    else if (k.bestehend && !c) console.log(`  ⚠ ${k.handle}: soll bestehen, existiert aber nicht`);
  }
  if (!LIVE && PHASE !== 'menue') { console.log('\nTrockenlauf — nichts geschrieben.'); return; }

  mkdirSync('dropship/kategorien-sicherung', { recursive: true });
  const ledger = zeile => appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · ${zeile}\n`);

  // ── 4) Tags ──
  if (PHASE === 'alle' || PHASE === 'tags') {
    // Blöcke zu 20 Aliasen je Mutation, KONKURRENT (die Antwort dauert ~6 s, der Eimer bleibt dabei fast voll). CONC=5.
    const CONC = Number(process.env.CONC || 3);
    const fertigTags = new Set(existsSync('dropship/kategorien_ledger.txt') ? readFileSync('dropship/kategorien_ledger.txt', 'utf8').split('\n').map(l => l.split(' · ')[1]).filter(Boolean).map(l => l.split(' ').slice(0, 2).join(' ')) : []);
    const mitRetry = async (m) => { for (let v = 0; ; v++) { try { return await q(m, {}); } catch (e) { if (v >= 6 || !/Throttled|THROTTLED|429|5\d\d/.test(e.message)) throw e; await schlaf(15000 * (v + 1)); } } };
    const stapel = async (fn, tag, ids) => {
      if (process.env.FORCE !== '1' && fertigTags.has(`${fn} ${tag}`)) { console.log(`  übersprungen (laut Ledger fertig): ${fn} ${tag}`); return; }
      const liste = [...ids], bloecke = [];
      for (let i = 0; i < liste.length; i += 20) bloecke.push(liste.slice(i, i + 20));
      let fertig = 0, naechster = 0;
      const arbeiter = async () => {
        while (naechster < bloecke.length) {
          const teil = bloecke[naechster++];
          const m = `mutation{${teil.map((id, n) => `a${n}:${fn}(id:${JSON.stringify(id)},tags:${JSON.stringify([tag])}){userErrors{field message}}`).join(' ')}}`;
          const d = await mitRetry(m);
          for (let n = 0; n < teil.length; n++) if (d[`a${n}`].userErrors.length) throw new Error(`${fn} ${tag}: ${JSON.stringify(d[`a${n}`].userErrors)}`);
          fertig += teil.length;
          if (Math.floor(fertig / 500) !== Math.floor((fertig - teil.length) / 500)) console.log(`  … ${tag}: ${fertig}/${liste.length}`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONC, bloecke.length) }, arbeiter));
      ledger(`${fn} ${tag} ${liste.length}`);
    };
    for (const [tag, ids] of tagWeg) { await stapel('tagsRemove', tag, ids); console.log(`Tag «${tag}» entfernt: ${ids.size}`); }
    for (const [tag, ids] of tagDazu) { await stapel('tagsAdd', tag, ids); console.log(`Tag «${tag}» gesetzt: ${ids.size}`); }
  }

  // ── 5) Collections ──
  if (PHASE === 'alle' || PHASE === 'sammlungen') {
    const vorbild = (await q(`{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}`)).collectionByHandle;
    const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => ({ publicationId: n.publication.id }));
    for (const { k, ok } of plan) {
      if (!ok) continue;
      const c = bestand[k.id];
      const regel = { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: k.tag }] };
      if (c && k.bestehend) {
        // Nie überschreiben: ein zweiter Lauf läse sonst den schon umgebauten Stand und ersetzte den Originalstand (26.10.: 6 Sicherungen waren betroffen).
        const sicherung = `dropship/kategorien-sicherung/${k.handle}.json`;
        if (!existsSync(sicherung)) writeFileSync(sicherung, JSON.stringify(c, null, 1));
        const d = await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{id} userErrors{field message}}}`, { i: { id: c.id, ruleSet: regel, ...(k.aktualisiere ? { title: k.titel, descriptionHtml: `<p>${k.beschreibung}</p>`, seo: { title: k.seoTitel || `${k.titel} online kaufen | LuxeStyle CH`, description: k.seoBeschreibung } } : {}) } });
        if (d.collectionUpdate.userErrors.length) throw new Error(`collectionUpdate ${k.handle} ${JSON.stringify(d.collectionUpdate.userErrors)}`);
        console.log(`Umgestellt: ${k.handle} → TAG ${k.tag}`); ledger(`umgestellt ${k.handle}`);
        // Publish-Falle: eine bestehende Collection kann nie im Onlineshop publiziert worden sein (haustier-tech, 26.10.: HTTP 404, durch eine Umleitung verdeckt).
        const pub = (await q(`query($id:ID!){collection(id:$id){resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}`, { id: c.id })).collection.resourcePublicationsV2.nodes;
        const fehlt = pubs.filter(x => !pub.some(n => n.isPublished && n.publication.id === x.publicationId));
        if (fehlt.length) {
          const p2 = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id: c.id, i: fehlt });
          console.log(`  nachpubliziert in ${fehlt.length} Kanälen ${JSON.stringify(p2.publishablePublish.userErrors)}`); ledger(`nachpubliziert ${k.handle}`);
        }
      } else if (!c) {
        const d = await q(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle} userErrors{field message}}}`, { i: {
          title: k.titel, handle: k.handle, sortOrder: 'BEST_SELLING', descriptionHtml: `<p>${k.beschreibung}</p>`, seo: { title: k.seoTitel || `${k.titel} online kaufen | LuxeStyle CH`, description: k.seoBeschreibung }, ruleSet: regel } });
        if (d.collectionCreate.userErrors.length) throw new Error(`collectionCreate ${k.handle} ${JSON.stringify(d.collectionCreate.userErrors)}`);
        const id = d.collectionCreate.collection.id;
        const p = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id, i: pubs });
        if (p.publishablePublish.userErrors.length) throw new Error(`publishablePublish ${k.handle} ${JSON.stringify(p.publishablePublish.userErrors)}`);
        bestand[k.id] = { id, title: k.titel };
        console.log(`Angelegt: ${k.handle} · publiziert in ${pubs.length} Kanälen`); ledger(`angelegt ${k.handle}`);
      }
    }
    // «Vasen & Deko» → «Dekoration» (Titel der Collection; Handle bleibt, sonst brechen Links)
    const deko = (await q(`{collectionByHandle(handle:"sub-deko"){id title}}`)).collectionByHandle;
    if (deko && deko.title !== 'Dekoration') {
      await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`, { i: { id: deko.id, title: 'Dekoration' } });
      console.log('Umbenannt: sub-deko → «Dekoration»');
    }
    // Mitgliedschaft entsteht verzögert
    await schlaf(20000);
    for (const { k, mit, ok } of plan) { if (!ok) continue; const c = bestand[k.id]; if (!c?.id) continue;
      let n = 0; for (let i = 0; i < 6; i++) { n = (await q(`query($id:ID!){collection(id:$id){productsCount{count}}}`, { id: c.id })).collection.productsCount.count; if (n >= mit.length * 0.9) break; await schlaf(8000); }
      console.log(`  ${k.handle.padEnd(34)} Mitglieder ${String(n).padStart(5)} / erwartet ${mit.length}`); }
  }

  // ── 6) Menü ──
  if (PHASE === 'alle' || PHASE === 'menue') {
    const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
    const datei = `dropship/menu-sicherung/main-menu-vor-umbau-2510.json`;
    if (LIVE) { mkdirSync('dropship/menu-sicherung', { recursive: true }); writeFileSync(datei, JSON.stringify(m, null, 1)); }
    let baum = eingabeAus(m.items);
    const gid = async h => (await q(`query($h:String!){collectionByHandle(handle:$h){id}}`, { h })).collectionByHandle?.id;
    const log = [];
    for (const op of UMBAU) {
      try { baum = anwenden(baum, op.ressourceHandle ? { ...op, ressource: await gid(op.ressourceHandle) } : op); log.push(`ok   ${op.op} ${(op.von || op.pfad || []).join(' > ')}`); }
      catch (e) { log.push(`ÜBERSPRUNGEN ${op.op} ${(op.von || op.pfad || []).join(' > ')}: ${e.message}`); }
    }
    const verlinkt = alleRessourcen(baum);
    const einfuegen = async (handle, titel, eltern, nach, doppelt = false) => {
      const id = await gid(handle); if (!id) { log.push(`ÜBERSPRUNGEN ${handle}: Collection fehlt`); return; }
      if (verlinkt.has(id) && !doppelt) { log.push(`schon verlinkt ${handle}`); return; }
      try { baum = einfuegenPfad(baum, { eltern, nach, neu: { title: titel, type: 'COLLECTION', resourceId: id, items: [] } }); verlinkt.add(id); log.push(`ok   neu ${eltern.join(' > ') || '(oben)'} > ${titel}`); }
      catch (e) { log.push(`ÜBERSPRUNGEN ${handle}: ${e.message}`); }
    };
    for (const { k, mit, ok } of plan) if (ok && k.eltern) await einfuegen(k.handle, k.titel, k.eltern, k.nach);
    for (const n of MENUE_NUR) {
      const code = (await fetch(`https://luxestyle.ch/collections/${n.handle}?cb=${Date.now()}`)).status;
      if (code !== 200) { log.push(`ÜBERSPRUNGEN ${n.handle}: live HTTP ${code}`); continue; }
      await einfuegen(n.handle, n.titel, n.eltern, n.nach, !!n.doppelt);
    }
    console.log(log.join('\n'));
    if (tiefe(baum) > 3) { console.error(`ABBRUCH: Menü hätte ${tiefe(baum)} Ebenen (Shopify erlaubt 3) — nichts geschrieben`); process.exit(2); }
    if (!LIVE) {
      const zeige = (items, d = 0) => items.forEach(i => { console.log('  '.repeat(d) + '· ' + i.title); zeige(i.items || [], d + 1); });
      console.log('\nMENÜ-VORSCHAU (Trockenlauf, nichts geschrieben):'); zeige(baum); return;
    }
    const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: m.id, t: m.title, h: m.handle, i: baum });
    if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
    const zurueck = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
    const v = gleicherBaum(baum, eingabeAus(zurueck.items));
    console.log('Vergleich gesendet ↔ zurückgelesen:', JSON.stringify({ gleich: v.gleich, nurGesendet: v.nurGesendet.length, nurZurueck: v.nurZurueck.length }));
    if (!v.gleich) { console.error('ABWEICHUNG!', v.nurGesendet.slice(0, 8), v.nurZurueck.slice(0, 8), '— Sicherung liegt in', datei); process.exit(3); }
    ledger('menü umgebaut'); console.log('OK: Menü umgebaut und nachgelesen. Oberste Ebene:', zurueck.items.map(x => x.title).join(' | '));
  }
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
