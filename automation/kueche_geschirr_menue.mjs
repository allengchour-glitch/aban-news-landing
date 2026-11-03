#!/usr/bin/env node
/**
 * Hauptmenü: «Wohnen & Garten» in «Küche & Kochen», «Geschirr & Tisch» und «Wohnen & Garten» (Rest) trennen. Regeln, Reihenfolge und Prüfungen: lib/kueche_geschirr_menue.mjs
 * (getestet, lib/kueche_geschirr_menue_test.mjs). Alles ausserhalb dieses Astes bleibt, wie es ist; jedes bisherige Ziel steht danach noch im Menü (Prüfung `pruefeUmbau`).
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gerechnet und eine Vorschau der drei Köpfe gezeigt. Mit LIVE=1 (jede Stufe bricht VOR dem Schreiben ab):
 *   1) Menü und alle Ziel-Sammlungen lesen,
 *   2) HTTP-Prüfung der sieben neuen Sammlungen im Onlineshop (lib/collection_web.mjs: HTTP 200 ohne Weiterleitung UND mindestens ein Produkt; Publish-Falle). Wer nicht besteht, zählt wie fehlend → Exit 2,
 *   3) das Menü direkt VOR dem Schreiben noch einmal lesen; hat es sich verändert, Exit 4 (menuUpdate ERSETZT den ganzen Baum),
 *   4) Sicherung des gelesenen Hauptmenüs nach dropship/menu-sicherung/main-menu-vor-kueche-geschirr-0311.json (eine vorhandene wird NIE überschrieben, die neue bekommt dann einen Zeitstempel),
 *   5) menuUpdate, danach NACHLESEN und STRENGER Vergleich (Pfad, Titel, Typ, Reihenfolge UND Ziel jedes Eintrags) samt denselben Prüfregeln. Exit 3 bei Abweichung.
 * Exit 0 = in Ordnung, 1 = Aufruffehler, 2 = Prüffehler/Lücken (nichts geschrieben), 3 = Abweichung beim Nachlesen (geschrieben, Sicherung liegt vor), 4 = Menü während des Laufs verändert (nichts geschrieben).
 * Rücknahme: kueche_geschirr_zurueck.mjs (liest die Sicherung, streicht die Ids der neu angelegten Einträge, schreibt streng nachgelesen zurück; Trockenlauf ist Vorgabe).
 * NICHT die Sicherung roh zurückschreiben: die fünf Gruppen und ihre Kinder sind neue Einträge, ihre alten Ids gibt es danach nicht mehr.
 * Voraussetzung für LIVE: kueche_geschirr_gruppen.mjs ist gelaufen (die sieben Sammlungen existieren und sind im Onlineshop gefüllt).
 * ANNAHME_ALLE=1 (nur Trockenlauf): tut so, als gäbe es die sieben Sammlungen. WEB_PRUEFEN=1 (Trockenlauf): HTTP-Prüfung auch ohne LIVE, nur als Bericht.
 */
import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';
import { gleicherBaum, gleicheZiele } from './lib/menue_plan.mjs';
import { kuecheGeschirrMenue, pruefeUmbau, titelWarnungen, neueHandles, handleVon, ELTERN, GRUPPEN, KUECHE, GESCHIRR } from './lib/kueche_geschirr_menue.mjs';
import { collectionsImWeb } from './lib/collection_web.mjs';
import { sammlungenLesen } from './schmuck_menue.mjs';

const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const SICHERUNG = 'dropship/menu-sicherung/main-menu-vor-kueche-geschirr-0311.json';
const LEDGER = 'dropship/kategorien_ledger.txt';

/**
 * Der ganze Lauf, mit eingespeister Abfrage `q(query, variables)` und HTTP-Prüfung `web(handles)` → { handle: {ok, status, n, grund} }.
 * @returns {Promise<{code:number, baum?:object[], fehlend?:string[], fehler?:string[]}>}
 */
export async function kuecheGeschirrMenueLauf(q, { live = false, annahmeAlle = false, web = null, sicherung = SICHERUNG, ledger = LEDGER, jetzt = () => new Date(), out = console.log, err = console.error } = {}) {
  if (live && annahmeAlle) { err('ANNAHME_ALLE gibt es nur im Trockenlauf'); return { code: 1 }; }
  if (live && !web) { err('LIVE braucht die HTTP-Prüfung der neuen Sammlungen (Publish-Falle): ohne sie wird nichts geschrieben'); return { code: 1 }; }
  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!m) { err('Hauptmenü nicht gefunden'); return { code: 1 }; }
  // menuUpdate schreibt den gelesenen Handle zurück: ein anderes Menü (Entwurf, Kopie) würde umbenannt bzw. überschrieben.
  if (m.handle !== 'main-menu') { err(`ABBRUCH: die Suche lieferte das Menü «${m.handle}» statt «main-menu»`); return { code: 1 }; }
  const alt = eingabeAus(m.items);
  const eltern = alt.find(x => x.title === ELTERN);
  if (!eltern) { err(`ABBRUCH: «${ELTERN}» steht nicht im Hauptmenü (schon umgebaut?)`); return { code: 2, fehler: ['Eltern fehlt'] }; }
  const kopfZiele = GRUPPEN.map(g => handleVon((eltern.items || []).find(x => x.title === g.titel))).filter(Boolean);
  const alle = [...new Set([...neueHandles(), ...kopfZiele])];
  const { gids, titel, anzahl } = await sammlungenLesen(q, alle);
  const neu = neueHandles();
  out(`Neue Sammlungen im Shop: ${neu.filter(h => gids[h]).length} von ${neu.length}`);
  if (annahmeAlle) {
    for (const h of neu) if (!gids[h]) gids[h] = `gid://annahme/${h}`;
    out('ANNAHME_ALLE: fehlende neue Sammlungen werden als vorhanden angenommen - nur Vorschau');
  } else if (web) {
    const da = neu.filter(h => gids[h]);
    const erg = da.length ? await web(da) : {};
    const schlecht = da.filter(h => !erg[h]?.ok);
    for (const h of schlecht) { out(`nicht im Onlineshop    ${h}: ${erg[h]?.grund || 'keine Antwort'}${anzahl[h] != null ? ` (Shopify zählt ${anzahl[h]} Produkte)` : ''}`); gids[h] = null; }
    out(`HTTP-Prüfung im Onlineshop: ${da.length - schlecht.length} von ${da.length} erreichbar und gefüllt`);
  }
  const { baum, log, fehler: bauFehler } = kuecheGeschirrMenue(alt, gids, titel);
  out(log.join('\n'));
  if (bauFehler.length === 1 && bauFehler[0] === 'schon umgebaut') { out('Nichts zu tun: das Menü ist schon umgebaut (Exit 0, nichts geschrieben).'); return { code: 0, schonUmgebaut: true }; }
  if (bauFehler.length) { err('\nABBRUCH, nichts geschrieben:\n- ' + bauFehler.join('\n- ')); return { code: 2, fehler: bauFehler, fehlend: neu.filter(h => !gids[h]) }; }
  const fehler = pruefeUmbau(alt, baum, gids);
  if (fehler.length) { err('\nABBRUCH, nichts geschrieben:\n- ' + fehler.join('\n- ')); return { code: 2, fehler }; }
  const lang = titelWarnungen(baum.filter(x => [KUECHE.titel, GESCHIRR.titel, ELTERN].includes(x.title)));
  if (lang.length) out(`\nHINWEIS: Menütitel über 34 Zeichen: ${lang.join('; ')}`);

  const zeige = (items, d = 0) => items.forEach(i => { out('  '.repeat(d) + '· ' + i.title); zeige(i.items || [], d + 1); });
  for (const k of baum.filter(x => [KUECHE.titel, GESCHIRR.titel].includes(x.title))) { out(`\nVORSCHAU «${k.title}»:`); zeige(k.items, 1); }
  out(`\nVORSCHAU «${ELTERN}» (${baum.find(x => x.title === ELTERN).items.length} Gruppen): ${baum.find(x => x.title === ELTERN).items.map(i => i.title).join(' | ')}`);
  out(`Oberste Ebene: ${alt.length} → ${baum.length} Einträge`);
  if (!live) { out('\nTrockenlauf - nichts geschrieben.'); return { code: 0, baum }; }

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
  } catch (e) { err(`FEHLER beim Nachlesen NACH dem Schreiben (${e.message}): das Menü ist umgebaut, nicht geprüft. Sicherung: ${datei}`); return { code: 3, baum, fehler: ['Nachlesen fehlgeschlagen'] }; }
  const v = gleicherBaum(baum, zurueckEingabe), z = gleicheZiele(baum, zurueckEingabe), pf = pruefeUmbau(alt, zurueckEingabe, gids);
  out('Vergleich gesendet ↔ zurückgelesen:', JSON.stringify({ gleich: v.gleich && z.gleich, nurGesendet: v.nurGesendet.length, nurZurueck: v.nurZurueck.length, zielAbweichungen: z.abweichungen.length, pruefFehler: pf.length }));
  if (!v.gleich || !z.gleich || pf.length) {
    err('ABWEICHUNG!', v.nurGesendet.slice(0, 8), v.nurZurueck.slice(0, 8), z.abweichungen.slice(0, 8).map(a => `${a.pfad}: gesendet ${a.gesendet} ↔ zurück ${a.zurueck}`), pf, '- Sicherung liegt in', datei);
    return { code: 3, baum, fehler: pf };
  }
  try { appendFileSync(ledger, `${jetzt().toISOString()} · menü küche/geschirr getrennt\n`); } catch (e) { err(`HINWEIS: Menü umgebaut und nachgelesen, aber der Ledger-Eintrag ging nicht (${e.message}); bitte von Hand in ${ledger} nachtragen.`); }
  out('OK: Menü umgebaut und streng nachgelesen. Oberste Ebene:', zurueck.items.map(x => x.title).join(' | '));
  return { code: 0, baum };
}

/** Die Schalter aus der Umgebung. Trockenlauf ist Vorgabe: nur LIVE=1 schreibt; die HTTP-Prüfung läuft bei LIVE oder WEB_PRUEFEN=1. */
export const optionenAusEnv = (env, web) => ({ live: env.LIVE === '1', annahmeAlle: env.ANNAHME_ALLE === '1', web: env.LIVE === '1' || env.WEB_PRUEFEN === '1' ? web : null });

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await kuecheGeschirrMenueLauf(q, optionenAusEnv(process.env, hs => collectionsImWeb(hs)));
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
