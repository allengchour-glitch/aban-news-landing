#!/usr/bin/env node
/**
 * Verschiebt GENAU EINEN Collection-Eintrag im Hauptmenü von einem Elterneintrag zu einem anderen. Sonst ändert sich nichts.
 * Regeln und Prüfungen: lib/menu_verschieben.mjs (getestet: lib/menu_verschieben_test.mjs, Mutationsprobe lib/menu_verschieben_mutationsprobe.mjs).
 *
 * Aufruf (Trockenlauf ist Vorgabe, nur LIVE=1 schreibt):
 *   HANDLE=<collection-handle> VON='<Titelpfad alter Eltern>' ZIEL='<Titelpfad neuer Eltern>' [NACH='<Geschwistertitel>' | VOR='<Geschwistertitel>'] [LIVE=1]
 *   [MENUE=main-menu] [SICHERUNG_DIR=dropship/menu-sicherung] node automation/menu_eintrag_verschieben.mjs
 *   Titelpfade mit " > " getrennt, oberste Ebene = Titel des obersten Eintrags. Ohne NACH/VOR kommt der Eintrag ans Ende von ZIEL.
 *
 * Ablauf (jede Stufe bricht VOR dem Schreiben ab):
 *   1) Menü lesen (3 Ebenen) und seine Form prüfen: jeder Eintrag mit id, title, type, resourceId, url, tags, Ebene 1 und 2 mit items (sonst Exit 1,
 *      nichts geschrieben: eine verkürzte Abfrage würde beim Schreiben still Einträge, ids oder Tags löschen). Dann die Collection frisch über
 *      collectionByHandle (fehlt sie: Exit 2),
 *   2) Eintrag unter VON finden (genau 1), ZIEL eindeutig, nicht der Eintrag selbst oder sein Nachfahre, keine Dublette unter ZIEL, NACH/VOR eindeutig,
 *   3) Tiefe: Ebene(ZIEL) + 1 + Ebenen unter dem Eintrag ≤ 3,
 *   4) Eingabe für menuUpdate AUS dem gelesenen Baum (ids, Titel, Typ, Ziel, Tags, Kinder bleiben), Plan unabhängig nachgeprüft,
 *   5) Sicherung des ganzen gelesenen Menüs nach <SICHERUNG_DIR>/<menü>-vor-verschieben-<handle>-<UTC-Zeitstempel>.json (nie überschrieben), auch im Trockenlauf,
 *   6) LIVE: Menü direkt vor dem Schreiben noch einmal lesen; weicht es ab, Exit 4 und nichts geschrieben,
 *   7) menuUpdate, danach frisch lesen und streng vergleichen. Eine NEUE id des verschobenen Eintrags ist kein Fehler, wird aber gemeldet.
 *   8) Übersetzungen des Eintrags (vor dem Schreiben gelesen, auch im Trockenlauf) fehlen danach oft (GEMESSEN 12.11.2026: fr weg, id gleich):
 *      fehlende werden mit frischem Digest wieder eingetragen und frisch nachgelesen (lib/menu_uebersetzung.mjs). Bleibt etwas offen: Exit 3.
 * Exit 0 = in Ordnung, 1 = Aufruffehler oder gelesenes Menü unvollständig, 2 = Prüffehler (nichts geschrieben), 3 = geschrieben, aber Abweichung/userErrors/Zustand unklar (Sicherung liegt vor),
 * 4 = Menü während des Laufs verändert (nichts geschrieben).
 * Rücknahme: dasselbe Werkzeug mit VON und ZIEL vertauscht und NACH = früherer Vorgänger; der genaue Befehl wird ausgegeben.
 * Restfenster: zwischen dem erneuten Lesen (6) und menuUpdate bleibt ein kurzer Moment; Shopify kennt keine Versionsprüfung.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { uebersetzungenLesen, uebersetzungenWiederherstellen } from './lib/menu_uebersetzung.mjs';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { HANDLE_RE, MENU_Q, COLL_Q, UPDATE_M, pruefeLeseform, eingabeAus, teilePfad, pfadText, planeVerschiebung, pruefePlan, vergleicheNachlesen, gleichesMenue,
  ruecknahmeBefehl, sicherungsName, fundstellen, zaehle } from './lib/menu_verschieben.mjs';

export const SICHERUNG_DIR = 'dropship/menu-sicherung';

/** Menü mit genau diesem Handle lesen (die Suche kann ähnliche Handles mitliefern). */
async function menueLesen(q, menue) {
  const d = await q(MENU_Q, { h: `handle:${menue}` });
  return (d?.menus?.nodes || []).find(n => n.handle === menue) || null;
}

/** Sicherung schreiben, nie überschreiben (Flag wx; bei gleichem Namen -2, -3 …). @returns Pfad */
export function sicherungSchreiben(dir, menue, handle, jetzt, inhalt) {
  mkdirSync(dir, { recursive: true });
  for (let n = 1; n <= 50; n++) {
    const datei = sicherungsName(dir, menue, handle, jetzt, n);
    try { writeFileSync(datei, JSON.stringify(inhalt, null, 1), { flag: 'wx' }); return datei; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  throw new Error('kein freier Name für die Sicherung');
}

/**
 * Der ganze Lauf mit eingespeister Abfrage `q(query, variables)` (Tests spielen eine Attrappe ein; `plane` ersetzen sie, um die Nachprüfung des Plans zu prüfen).
 * @returns {Promise<{code:number, plan?:object[], info?:object, sicherung?:string, ruecknahme?:string, idGleich?:boolean|null, fehler?:string[]}>}
 */
export async function verschiebenLauf(q, { handle, von, ziel, nach = '', vor = '', live = false, menue = 'main-menu', sicherungDir = SICHERUNG_DIR, jetzt = () => new Date(), out = console.log, err = console.error, plane = planeVerschiebung } = {}) {
  // ── Aufruf prüfen (Exit 1, kein Netz)
  if (!handle || !HANDLE_RE.test(handle)) { err(`HANDLE fehlt oder ist ungültig («${handle ?? ''}»; erlaubt: a-z, 0-9, -)`); return { code: 1 }; }
  if (!menue || !HANDLE_RE.test(menue)) { err(`MENUE ist ungültig («${menue}»)`); return { code: 1 }; }
  const vonT = teilePfad(von), zielT = teilePfad(ziel);
  if (!vonT || !zielT) { err('VON und ZIEL sind Pflicht (Titelpfade, Teile mit " > " getrennt, kein Teil leer)'); return { code: 1 }; }
  if (nach && vor) { err('NACH und VOR schliessen sich aus'); return { code: 1 }; }
  out(`${live ? 'LIVE' : 'Trockenlauf'}: /collections/${handle} von «${pfadText(vonT)}» nach «${pfadText(zielT)}»${nach ? ` hinter «${nach}»` : vor ? ` vor «${vor}»` : ' (ans Ende)'}, Menü ${menue}`);

  // ── 1) Lesen
  const m = await menueLesen(q, menue);
  if (!m) { err(`Menü «${menue}» nicht gefunden`); return { code: 1 }; }
  const lf = pruefeLeseform(m);
  if (lf.length) { err(`ABBRUCH, nichts geschrieben: das gelesene Menü ist unvollständig (${lf.length} Befunde, Abfrage MENU_Q prüfen):\n- ` + lf.slice(0, 10).join('\n- ')); return { code: 1, fehler: lf }; }
  const col = (await q(COLL_Q, { h: handle }))?.collectionByHandle;
  if (!col?.id) { err(`ABBRUCH, nichts geschrieben: Collection «${handle}» gibt es im Shop nicht (collectionByHandle leer)`); return { code: 2, fehler: ['Collection fehlt'] }; }
  const alt = eingabeAus(m.items);
  out(`Menü gelesen: ${zaehle(alt)} Einträge, ${alt.length} oben. Collection: «${col.title}» ${col.id}`);

  // ── 2) bis 4) Planen und unabhängig nachprüfen
  const p = { handle, colId: col.id, von: vonT, ziel: zielT, nach: nach || null, vor: vor || null };
  const r = plane(alt, p); // `plane` nur für Tests austauschbar: die Nachprüfung unten muss einen falschen Plan abfangen
  if (r.fehler.length) { err('ABBRUCH, nichts geschrieben:\n- ' + r.fehler.join('\n- ')); return { code: 2, fehler: r.fehler }; }
  const pf = pruefePlan(alt, r.plan, p);
  if (pf.length) { err('ABBRUCH, nichts geschrieben (Nachprüfung des Plans):\n- ' + pf.join('\n- ')); return { code: 2, fehler: pf }; }
  const { plan, info } = r;
  const e = info.eintrag;
  out(`Eintrag: «${e.title}» Typ ${e.type}${e.resourceId ? ` resourceId ${e.resourceId}` : ''}${e.url ? ` url ${e.url}` : ''}${e.tags?.length ? ` tags ${e.tags.join(',')}` : ''}, id ${e.id}, ${e.items.length} Kinder, Stelle ${info.altIndex + 1} unter VON`);
  const sonst = fundstellen(alt, p).map(pfadText).filter(x => x !== pfadText([...vonT, e.title]));
  if (sonst.length) out(`HINWEIS: die Collection steht ausserdem hier im Menü (bleibt unverändert): ${sonst.join(' | ')}`);
  out(`VON «${pfadText(vonT)}» danach (${info.vonKinder.length}): ${info.vonKinder.join(' | ') || '(leer)'}`);
  out(`ZIEL «${pfadText(zielT)}» danach (${info.zielKinder.length}): ${info.zielKinder.map((t, n) => (n === info.neuIndex ? `[${t}]` : t)).join(' | ')}`);
  out(`Ebenen: ${info.tiefe} von höchstens 3. Einträge gesamt: vorher ${zaehle(alt)}, nachher ${info.gesamt}.`);
  const rn = ruecknahmeBefehl({ handle, von: vonT, ziel: zielT, info, menue });
  out(`Rücknahme: ${rn.befehl}`);
  if (rn.warnung) out(`HINWEIS Rücknahme: ${rn.warnung}`);

  // ── Übersetzungen des Eintrags lesen (auch im Trockenlauf; ohne sie wird nicht geschrieben)
  let ueb;
  try { ueb = await uebersetzungenLesen(q, e.id); }
  catch (x) { err(`ABBRUCH, nichts geschrieben: Übersetzungen des Eintrags nicht lesbar (${x.message})`); return { code: 1, fehler: ['Übersetzungen'] }; }
  out(`Übersetzungen des Eintrags: ${ueb.werte.length ? ueb.werte.map(w => `${w.locale}:${w.key}=«${w.value}»`).join(' | ') : 'keine'}`);

  // ── 5) Sicherung (auch im Trockenlauf)
  let sicherung;
  try { sicherung = sicherungSchreiben(sicherungDir, menue, handle, jetzt(), m); }
  catch (x) { err(`ABBRUCH, nichts geschrieben: Sicherung ging nicht (${x.message})`); return { code: 1, fehler: ['Sicherung'] }; }
  out(`Sicherung: ${sicherung}`);
  if (!live) { out('Trockenlauf: nichts geschrieben.'); return { code: 0, plan, info, sicherung, ruecknahme: rn.befehl }; }

  // ── 6) Direkt vor dem Schreiben noch einmal lesen
  const frisch = await menueLesen(q, menue);
  const g = gleichesMenue(m, frisch);
  if (!g.gleich) { err(`ABBRUCH, nichts geschrieben: das Menü hat sich seit dem Lesen verändert (${g.grund}). Bitte neu starten.`); return { code: 4, fehler: ['Menü verändert'], sicherung }; }

  // ── 7) Schreiben, frisch lesen, streng vergleichen. Ab hier gilt jeder Fehler als Exit 3 (Zustand mit der Sicherung prüfen).
  let w;
  try { w = await q(UPDATE_M, { id: m.id, t: m.title, h: m.handle, i: plan }); }
  catch (x) { err(`FEHLER beim Schreiben (${x.message}): Zustand unklar, bitte das Menü lesen. Sicherung: ${sicherung}`); return { code: 3, fehler: ['menuUpdate unklar'], sicherung }; }
  const ue = w?.menuUpdate?.userErrors;
  if (!Array.isArray(ue) || ue.length) { err(`menuUpdate meldet Fehler: ${JSON.stringify(ue ?? w)}. Sicherung: ${sicherung}`); return { code: 3, fehler: ['userErrors'], sicherung }; }
  let zurueck;
  try { zurueck = await menueLesen(q, menue); } catch (x) { zurueck = null; err(`FEHLER beim Nachlesen (${x.message})`); }
  if (!zurueck || zurueck.id !== m.id) { err(`ABWEICHUNG: Menü nach dem Schreiben nicht lesbar oder andere Menü-id. Sicherung: ${sicherung}`); return { code: 3, fehler: ['Nachlesen'], sicherung }; }
  const v = vergleicheNachlesen(plan, eingabeAus(zurueck.items), { ...p, info });
  out(`Vergleich geplant ↔ zurückgelesen: ${v.fehler.length ? `${v.fehler.length} Abweichungen` : 'gleich'}, Einträge ${zaehle(eingabeAus(zurueck.items))}`);
  out(v.idGleich ? `id gleich (${v.idAlt})` : `id NEU (${v.idAlt} -> ${v.idNeu}): Übersetzungen dieses Eintrags prüfen`);
  if (v.neueKinderIds) out(`HINWEIS: ${v.neueKinderIds} Kinder des Eintrags haben eine neue id (Übersetzungen prüfen)`);
  if (v.fehler.length) {
    err('ABWEICHUNG nach dem Schreiben:\n- ' + v.fehler.slice(0, 15).join('\n- ') + `\nSicherung: ${sicherung}. Rücknahme prüfen: ${rn.befehl}`);
    return { code: 3, fehler: v.fehler, sicherung, idGleich: v.idGleich };
  }
  // ── 8) Übersetzungen wiederherstellen (menuUpdate wirft sie beim Verschieben weg)
  if (ueb.werte.length) {
    let w8;
    try { w8 = await uebersetzungenWiederherstellen(q, v.idNeu || v.idAlt, ueb.werte); }
    catch (x) { w8 = { eingetragen: 0, fehler: [x.message] }; }
    out(`Übersetzungen: ${w8.eingetragen} wieder eingetragen, ${w8.fehler.length ? `${w8.fehler.length} offen` : 'alle vorhanden'}`);
    if (w8.fehler.length) { err('ÜBERSETZUNG offen (Menü selbst ist richtig):\n- ' + w8.fehler.join('\n- ') + `\nVorher: ${JSON.stringify(ueb.werte)}`); return { code: 3, fehler: w8.fehler, sicherung, idGleich: v.idGleich }; }
  }
  out('OK: genau ein Eintrag verschoben, alles andere unverändert.');
  return { code: 0, plan, info, sicherung, ruecknahme: rn.befehl, idGleich: v.idGleich };
}

/** Schalter aus der Umgebung. Nur LIVE=1 schreibt. */
export const optionenAusEnv = env => ({ handle: env.HANDLE, von: env.VON, ziel: env.ZIEL, nach: env.NACH || '', vor: env.VOR || '', live: env.LIVE === '1',
  menue: env.MENUE || 'main-menu', sicherungDir: env.SICHERUNG_DIR || SICHERUNG_DIR });

async function main() {
  const opt = optionenAusEnv(process.env);
  // Aufruffehler zuerst, ohne Netz (verschiebenLauf prüft dasselbe noch einmal)
  if (!opt.handle || !HANDLE_RE.test(opt.handle) || !HANDLE_RE.test(opt.menue) || !teilePfad(opt.von) || !teilePfad(opt.ziel) || (opt.nach && opt.vor)) {
    const r = await verschiebenLauf(() => { throw new Error('kein Netz bei Aufruffehlern'); }, opt);
    process.exit(r.code);
  }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!SHOP || !process.env.SHOPIFY_CLIENT_ID || !CS) { console.error('SHOPIFY_SHOP, SHOPIFY_CLIENT_ID und SHOPIFY_CLIENT_SECRET sind Pflicht'); process.exit(1); }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json().catch(() => ({}))).access_token;
  if (!tok) { console.error(`Kein Shopify-Token (HTTP ${r.status})`); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await verschiebenLauf(q, opt);
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
