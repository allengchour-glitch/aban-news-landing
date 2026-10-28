#!/usr/bin/env node
/**
 * Menü «Taschen & Rucksäcke» auf die Rucksack-Taxonomie umstellen: ersetzt NUR die drei Einträge «Sport- & Wanderrucksäcke», «Schulrucksäcke», «Rucksäcke» im Ast
 * «Taschen & Rucksäcke» durch die Köpfe «Rucksäcke» (7 Kategorien), «Spezial-Rucksäcke» (3) und «Material & Ausstattung» (4) und hängt «Elektronik > Büro & Home Office >
 * Laptop- & Business-Rucksäcke» auf die neue Kategorie um. Alles andere im Hauptmenü bleibt, wie es ist. Regeln und Prüfungen: lib/rucksaecke_menue.mjs (getestet, rucksaecke_menue_test.mjs).
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gerechnet und die Vorschau des Astes gezeigt. Mit LIVE=1 (Reihenfolge, jede Stufe bricht VOR dem Schreiben ab):
 *   1) Menü und alle 17 Ziel-Collections lesen (in Paketen zu 25),
 *   2) HTTP-Prüfung jeder Ziel-Collection im Onlineshop (lib/collection_web.mjs: HTTP 200 ohne Weiterleitung UND mindestens ein Produkt; Publish-Falle). Wer nicht besteht, zählt wie eine fehlende → Exit 2,
 *   3) das Menü direkt VOR dem Schreiben noch einmal lesen und mit dem ersten Stand vergleichen: hat jemand anderes daran gearbeitet, Exit 4 (menuUpdate ERSETZT den ganzen Baum),
 *   4) Sicherung des gelesenen Hauptmenüs nach dropship/menu-sicherung/main-menu-vor-rucksaecke-2810.json (eine vorhandene wird NIE überschrieben, die neue bekommt dann einen Zeitstempel),
 *   5) menuUpdate, danach NACHLESEN und STRENGER Vergleich (Pfad, Titel, Typ, Reihenfolge UND Ziel jedes Eintrags) samt denselben Prüfregeln. Exit 3 bei Abweichung.
 * Exit 0 = in Ordnung, 1 = Aufruffehler, 2 = Prüffehler/Lücken (nichts geschrieben), 3 = Abweichung beim Nachlesen (geschrieben, Sicherung liegt vor), 4 = Menü während des Laufs verändert (nichts geschrieben).
 * Ein kleines Restfenster zwischen dem erneuten Lesen (3) und menuUpdate (5) bleibt: Shopify kennt keine Versionsprüfung.
 *
 * Voraussetzung für LIVE (Reihenfolge): Tags und Collections der Kategorien (PHASE=tags, dann PHASE=sammlungen, siehe rucksaecke_gruppen.mjs), die zwei Gruppen-Sammlungen (rucksaecke_gruppen.mjs),
 * dann dieses Skript. Fehlende Collections: im Trockenlauf übersprungen, mit LIVE=1 Abbruch (Exit 2), sonst fielen Teile des heutigen Menüs ersatzlos weg; nur mit ERLAUBE_LUECKEN=1 werden sie auch live übersprungen.
 * ANNAHME_ALLE=1 (nur Trockenlauf): tut so, als gäbe es alle geplanten Collections. WEB_PRUEFEN=1 (Trockenlauf): macht die HTTP-Prüfung auch ohne LIVE, nur als Bericht.
 */
import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';
import { gleicherBaum, gleicheZiele, suche } from './lib/menue_plan.mjs';
import { alleHandles, rucksackMenue, pruefeRucksack, titelWarnungen, PFAD } from './lib/rucksaecke_menue.mjs';
import { collectionsImWeb } from './lib/collection_web.mjs';
import { sammlungenLesen } from './schmuck_menue.mjs';

const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const SICHERUNG = 'dropship/menu-sicherung/main-menu-vor-rucksaecke-2810.json';
const LEDGER = 'dropship/kategorien_ledger.txt';

/**
 * Der ganze Lauf, mit eingespeister Abfrage `q(query, variables)` und HTTP-Prüfung `web(handles)` → { handle: {ok, status, n, grund} } (Tests spielen Attrappen ein).
 * @returns {Promise<{code:number, baum?:object[], fehlend?:string[], fehler?:string[]}>}
 */
export async function rucksackMenueLauf(q, { live = false, annahmeAlle = false, erlaubeLuecken = false, web = null, sicherung = SICHERUNG, ledger = LEDGER, jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  if (live && annahmeAlle) { err('ANNAHME_ALLE gibt es nur im Trockenlauf (LIVE=1 würde Ziele schreiben, die es nicht gibt)'); return { code: 1 }; }
  if (live && !web) { err('LIVE braucht die HTTP-Prüfung der Ziel-Collections (Publish-Falle): ohne sie wird nichts geschrieben'); return { code: 1 }; }
  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!m) { err('Hauptmenü nicht gefunden'); return { code: 1 }; }
  // menuUpdate schreibt den gelesenen Handle zurück: ein anderes Menü (Entwurf, Kopie) würde umbenannt bzw. überschrieben.
  if (m.handle !== 'main-menu') { err(`ABBRUCH: die Suche lieferte das Menü «${m.handle}» statt «main-menu»`); return { code: 1 }; }
  const alt = eingabeAus(m.items);
  const { gids, titel, anzahl } = await sammlungenLesen(q, alleHandles());
  const imShop = Object.values(gids).filter(Boolean).length;
  out(`Collections im Shop: ${imShop} von ${alleHandles().length} geprüft`);
  if (annahmeAlle) {
    for (const h of alleHandles()) if (!gids[h]) gids[h] = `gid://annahme/${h}`;
    out(`ANNAHME_ALLE: ${alleHandles().length - imShop} fehlende Collections werden als vorhanden angenommen - nur Vorschau`);
  } else if (web) {
    // Kundensicht: «existiert» heisst nicht «im Onlineshop erreichbar und gefüllt». Wer die Prüfung nicht besteht, zählt wie eine fehlende Collection.
    const da = alleHandles().filter(h => gids[h]);
    const erg = await web(da);
    const schlecht = da.filter(h => !erg[h]?.ok);
    for (const h of schlecht) { out(`nicht im Onlineshop    ${h}: ${erg[h]?.grund || 'keine Antwort'}${anzahl[h] != null ? ` (Shopify zählt ${anzahl[h]} Produkte)` : ''}`); gids[h] = null; }
    out(`HTTP-Prüfung im Onlineshop: ${da.length - schlecht.length} von ${da.length} erreichbar und gefüllt`);
  }
  const { baum, log, fehlend } = rucksackMenue(alt, gids, titel);
  out(log.join('\n'));
  const fehler = pruefeRucksack(alt, baum, gids);
  if (fehler.length) { err('\nABBRUCH, nichts geschrieben:\n- ' + fehler.join('\n- ')); return { code: 2, fehler }; }
  const lang = titelWarnungen(baum);
  if (lang.length) out(`\nHINWEIS: Menütitel über 34 Zeichen: ${lang.join('; ')}`);

  const zeige = (items, d = 0) => items.forEach(i => { out('  '.repeat(d) + '· ' + i.title); zeige(i.items || [], d + 1); });
  const ast = suche(baum, PFAD);
  out(`\nVORSCHAU des Astes «${PFAD.join(' > ')}» (${ast.items.length} Einträge, davon ${ast.items.filter(i => (i.items || []).length).length} mit Kindern):`);
  zeige(ast.items, 1);
  if (!live) { out('\nTrockenlauf - nichts geschrieben.'); return { code: 0, baum, fehlend }; }

  if (fehlend.length && !erlaubeLuecken) {
    err(`\nABBRUCH, nichts geschrieben: ${fehlend.length} Collections fehlen noch oder sind im Onlineshop nicht erreichbar bzw. leer (${fehlend.slice(0, 8).join(', ')}${fehlend.length > 8 ? ' …' : ''}). Erst kategorien_anlegen.mjs (PHASE=sammlungen) und rucksaecke_gruppen.mjs, oder bewusst ERLAUBE_LUECKEN=1.`);
    return { code: 2, fehlend, fehler: ['Collections fehlen'] };
  }

  // Lese-Schreib-Fenster schliessen: das Menü JETZT noch einmal lesen. menuUpdate ersetzt den ganzen Baum; eine Änderung zwischen erstem Lesen und Schreiben ginge verloren.
  const frisch = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  const frischEingabe = frisch ? eingabeAus(frisch.items) : null;
  if (!frisch || frisch.id !== m.id || JSON.stringify(frischEingabe) !== JSON.stringify(alt)) {
    const d = frischEingabe ? gleicheZiele(alt, frischEingabe).abweichungen : [];
    err(`\nABBRUCH, nichts geschrieben: das Hauptmenü hat sich seit dem Lesen verändert (jemand arbeitet gerade daran?)${d.length ? `: ${d.slice(0, 5).map(a => `${a.pfad} (${a.gesendet ?? 'neu'} ↔ ${a.zurueck ?? 'weg'})`).join('; ')}` : ' (Ids oder Reihenfolge)'}. Bitte den Lauf neu starten.`);
    return { code: 4, fehler: ['Menü während des Laufs verändert'] };
  }
  mkdirSync(dirname(sicherung), { recursive: true });
  const datei = existsSync(sicherung) ? sicherung.replace(/\.json$/, `-${jetzt().toISOString().replace(/[:.]/g, '-')}.json`) : sicherung;
  writeFileSync(datei, JSON.stringify(frisch, null, 1));
  out(`Sicherung: ${datei}`);
  const w = await q(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message code}}}`, { id: frisch.id, t: frisch.title, h: frisch.handle, i: baum });
  if (w.menuUpdate.userErrors.length) throw new Error('menuUpdate ' + JSON.stringify(w.menuUpdate.userErrors));
  // Ab hier ist das Menü GESCHRIEBEN: ein Fehler beim Nachlesen oder Ledger ist kein Aufruffehler (Exit 1), sondern Exit 3 mit Hinweis auf die Sicherung.
  let zurueck, zurueckEingabe;
  try {
    zurueck = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
    zurueckEingabe = eingabeAus(zurueck.items);
  } catch (e) { err(`FEHLER beim Nachlesen NACH dem Schreiben (${e.message}): das Menü ist umgebaut, nicht geprüft. Sicherung: ${datei}`); return { code: 3, baum, fehlend, fehler: ['Nachlesen fehlgeschlagen'] }; }
  // Streng nachlesen: Titel, Typ, Reihenfolge UND Ziel jedes Eintrags, plus die Prüfregeln von vorhin am zurückgelesenen Baum.
  const v = gleicherBaum(baum, zurueckEingabe), z = gleicheZiele(baum, zurueckEingabe), pf = pruefeRucksack(alt, zurueckEingabe, gids, { nachlesen: true });
  out('Vergleich gesendet ↔ zurückgelesen:', JSON.stringify({ gleich: v.gleich && z.gleich, nurGesendet: v.nurGesendet.length, nurZurueck: v.nurZurueck.length, zielAbweichungen: z.abweichungen.length, pruefFehler: pf.length }));
  if (!v.gleich || !z.gleich || pf.length) {
    err('ABWEICHUNG!', v.nurGesendet.slice(0, 8), v.nurZurueck.slice(0, 8), z.abweichungen.slice(0, 8).map(a => `${a.pfad}: gesendet ${a.gesendet} ↔ zurück ${a.zurueck}`), pf, '- Sicherung liegt in', datei);
    return { code: 3, baum, fehlend, fehler: pf };
  }
  try { appendFileSync(ledger, `${jetzt().toISOString()} · menü rucksäcke umgebaut\n`); } catch (e) { err(`HINWEIS: Menü umgebaut und nachgelesen, aber der Ledger-Eintrag ging nicht (${e.message}); bitte von Hand in ${ledger} nachtragen.`); }
  out('OK: Menü umgebaut und streng nachgelesen. Oberste Ebene:', zurueck.items.map(x => x.title).join(' | '));
  return { code: 0, baum, fehlend };
}

/** Die Schalter aus der Umgebung. Trockenlauf ist Vorgabe: nur LIVE=1 schreibt; die HTTP-Prüfung läuft bei LIVE oder WEB_PRUEFEN=1. */
export const optionenAusEnv = (env, web) => ({ live: env.LIVE === '1', annahmeAlle: env.ANNAHME_ALLE === '1', erlaubeLuecken: env.ERLAUBE_LUECKEN === '1', web: env.LIVE === '1' || env.WEB_PRUEFEN === '1' ? web : null });

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await rucksackMenueLauf(q, optionenAusEnv(process.env, hs => collectionsImWeb(hs)));
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
