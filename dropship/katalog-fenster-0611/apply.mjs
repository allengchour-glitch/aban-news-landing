// Spielt den gemeinsamen Stand «Katalogfenster: nur bestellbar + deutsche Schweizer Texte» ins MAIN-Theme (9 geänderte + 3 neue Dateien). Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/katalog-fenster-0611/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/katalog-fenster-0611/apply.mjs
// Vorbild: dropship/katalog-nur-bestellbar-0511/apply.mjs, erweitert auf die drei neuen Dateien und vier Schreibschritte. Schreibreihenfolge (jeder Schritt ein eigener themeFilesUpsert):
//   1a  assets/luxe-clothing-ausblenden.json + assets/luxe-clothing-variantenkarte.json   (neue Daten, von nichts verwiesen: harmlos)   rund 0,34 MB
//   1b  assets/luxe-clothing-texts-de.json                                                 (neue Daten, von nichts verwiesen: harmlos)   rund 0,40 MB
//   2   locales/de.json, en.default.json, fr.json, sections/luxe-clothing.liquid, snippets/luxe-clothing-asset-manifest.liquid, snippets/luxe-selfdesign-cover.liquid,
//       sections/luxe-category.liquid                                                       (Texte, Liquid: ohne den neuen Code nahezu harmlos)   rund 0,18 MB
//   3   assets/luxe-clothing.css, assets/luxe-clothing.js                                  (der Code, ganz zuletzt: neues JS mit altem Dokument fiele aus)   rund 0,09 MB
// WARUM getrennte Aufrufe (Entscheid, begründet): die Datei der deutschen Texte (0,40 MB) und die Variantenkarte (0,33 MB) sind die beiden grossen Nutzlasten. Ein gemeinsamer Aufruf von
// Schritt 1 und 2 wäre rund 0,92 MB gross (das Vorbild schickte allein 0,52 MB). Die Anfragegrenzen der Theme-API sind ungemessen (nichts Unbelegtes behauptet); wird eine Nutzlast abgelehnt,
// ist der Rückweg mit getrennten Aufrufen sauber: die neuen Dateien stehen ohne jeden Verweis da (Teilzustand harmlos), die bestehenden Dateien sind noch unberührt, und der Fehler nennt die Datei.
// Vor JEDEM Schreibschritt werden alle zwölf Dateien frisch gelesen und gegen den erwarteten Stand geprüft (noch nicht geschriebene = Ausgangsstand, schon geschriebene = Soll-Stand); weicht
// auch nur eine ab (ein anderer Auftrag hat in der Zwischenzeit geschrieben), wird dieser Schritt NICHT geschrieben (Exit 4) und die fremde Änderung bleibt unberührt.
// Zwischen den Schritten wird gewartet, bis die Prüfsummen des Schritts über die API stimmen (höchstens 150 s); vor dem Code-Schritt zusätzlich 15 s Ruhe. Nach dem Schreiben Rücklesen aller zwölf Dateien über die Prüfsumme.
// Rücknahme (umgekehrt): je Datei «neu» (gleich Soll), «alt» (gleich Sicherung), «fehlt» oder «unberuehrt»; CSS/JS, die weder neu noch alt sind UND keine Marke eines der beiden Pakete tragen, gelten als «unberuehrt»
// (jemand anderes hat sie verändert, ohne dass unser Code darin steckt: sie werden nie angefasst, auch nicht mit FREMD_UEBERSCHREIBEN=1); jede andere Datei bricht ab (Exit 3, nichts geschrieben), ausser mit
// FREMD_UEBERSCHREIBEN=1. Ohne diesen Schalter wird nie die Sicherung roh über eine fremd veränderte Datei geschrieben (auch nicht über die Sprachdateien: Exit 3). MIT FREMD_UEBERSCHREIBEN=1 wird
// auch eine fremd veränderte Sprachdatei roh mit dem Ausgangsstand überschrieben (Änderungen im Sprach-Editor des Admins daran gehen dann verloren; das Skript warnt davor); CSS/JS ohne Marke bleiben immer unberührt. Reihenfolge: CSS/JS zurück, warten, die zu schreibenden und
// zu löschenden Dateien frisch lesen (verändert: Exit 3), Texte/Liquid zurück, warten, die zu löschenden Dateien nochmals frisch lesen, zuletzt die drei neuen Dateien löschen (NEUE_BEHALTEN=1 lässt sie stehen: harmlos, unbenutzt).
// FORTSETZEN nach einem Abbruch (Korrektur der Abnahme 06.11.2026): steht jede der zwölf Dateien entweder noch im Ausgangsstand (neue Dateien: fehlt) oder schon im Soll-Stand (mindestens eine in jedem der beiden
// Zustände, Sicherung vorhanden), schreibt LIVE=1 nur die noch fehlenden Dateien in der gleichen Reihenfolge der Schritte (Beispiele: Schritt 1b wegen Grösse abgelehnt, Schritt 3 abgelehnt, Rücknahme mit NEUE_BEHALTEN=1).
// Jede andere Datei (fremd verändert, ein Einzelpaket) verhindert das Fortsetzen: Exit 3 wie bisher. Ist alles im Soll-Stand: Exit 3 «Schon eingespielt».
// OHNE Merkliste (liegt nur im Scratch/Commit nach dem Einspielen) wird der Soll-Stand aus kombi.mjs und den Datenquellen neu gerechnet.
// Exit: 0 ok · 1 kein Token / fehlende Variablen / Datenquelle verändert / unerwartete Ausnahme VOR dem Schreiben · 3 schon eingespielt (auch Teilzustand) / Rücknahme nicht möglich ·
// 4 Ausgangsstand oder Sicherung weicht ab / Änderung eines anderen Auftrags · 5 userErrors · 6 Rücklesen weicht ab · 7 Ausnahme NACH Beginn des Schreibens (Teilzustand möglich)
// APPLY_ZEIT=0.001 verkürzt alle Wartezeiten (nur für den Test mit der Attrappe der Theme-API).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, MARKEN, anwendenKombi, ausblendenText, lesenDaten } from './kombi.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1', FREMD_OK = process.env.FREMD_UEBERSCHREIBEN === '1', NEU_BEHALTEN = process.env.NEUE_BEHALTEN === '1';
const ZEIT = Number(process.env.APPLY_ZEIT ?? 1);
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const warte = (ms) => new Promise((r) => setTimeout(r, ms * ZEIT));
const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];
const SCHRITT_1A = [NEUE_DATEIEN.AUSBLENDEN, NEUE_DATEIEN.KARTE];
const SCHRITT_1B = [NEUE_DATEIEN.TEXTE];
const SCHRITT_TEXTE = [DATEIEN.DE, DATEIEN.EN, DATEIEN.FR, DATEIEN.SECTION, DATEIEN.MANIFEST, DATEIEN.COVER, DATEIEN.CATEGORY];
const SCHRITT_CODE = [DATEIEN.CSS, DATEIEN.JS];
const SCHRITTE = [['1a Daten', SCHRITT_1A], ['1b Texte-Datei', SCHRITT_1B], ['2 Texte und Liquid', SCHRITT_TEXTE], ['3 CSS und JS', SCHRITT_CODE]];
const MERKLISTE = HIER + 'sicherung/eingespielt.json';
const sichDatei = (n) => HIER + 'sicherung/' + n.replace('/', '__') + '.vor';
const BEFEHL = 'dropship/katalog-fenster-0611/apply.mjs';
const geschrieben = new Set(); // Dateien, die dieser Lauf (oder ein früherer abgebrochener) schon im Soll-Stand hinterlassen hat
const TEILZUSTAND = `Teilzustand möglich: ${ZURUECK ? '' : `LIVE=1 node ${BEFEHL} setzt nach Behebung der Ursache dort fort, wo es aufgehört hat (nur die noch fehlenden Dateien); `}ZURUECK=1 LIVE=1 node ${BEFEHL} nimmt auch einen Teilzustand zurück (je Datei); zur Not die Dateien aus sicherung/*.vor von Hand per themeFilesUpsert zurückschreiben und die drei neuen Dateien per themeFilesDelete entfernen.`;
// Sind die Texte (Schritt 2) live, aber CSS/JS (Schritt 3) noch nicht, sagt das Fenster schon «nur Modelle …» und zeigt noch alle: das gehört in jede Fehlermeldung
const teilzustandText = () => TEILZUSTAND + (geschrieben.has(DATEIEN.DE) && !geschrieben.has(DATEIEN.JS) ? ' ACHTUNG: Die Texte (Schritt 2) sind schon live: das Fenster sagt «Hier siehst du nur Modelle, die du bei LuxeStyle gestalten und bestellen kannst», zeigt aber noch alle Modelle, bis CSS/JS (Schritt 3) geschrieben sind. Sofort denselben Befehl noch einmal (LIVE=1 setzt fort) oder ZURUECK=1 LIVE=1.' : '');
const frageDaten = () => { try { return lesenDaten(); } catch (e) { console.error('Datenquelle nicht lesbar oder verändert: nichts geschrieben:', e.message); process.exit(1); } };

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);

// Liest die zwölf Dateien: {name: {md5, size, content|null}}; fehlende Dateien fehlen im Ergebnis; Inhalt nur, wenn die API ihn als Text liefert (sonst über die URL nachladen).
async function lesen() {
  const nodes = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:20){nodes{filename size checksumMd5 body{__typename ... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}`, { id: th.id, f: ALLE })).theme.files.nodes;
  const out = {};
  for (const n of nodes) {
    let content = n.body?.__typename === 'OnlineStoreThemeFileBodyText' ? n.body.content : null;
    if (content == null && n.body?.url) { const rr = await fetch(n.body.url); if (rr.ok) content = await rr.text(); }
    out[n.filename] = { md5: n.checksumMd5, size: n.size, content };
  }
  return out;
}
async function schreiben(dateien, namen) {
  const files = namen.map((n) => ({ filename: n, body: { type: 'TEXT', value: dateien[n] } }));
  const u = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files })).themeFilesUpsert;
  // upsertedThemeFiles ist laut Schema nullable (QUELLE shopify.dev ThemeFilesUpsertPayload): bei einer Ablehnung zuerst die userErrors melden, nie an der Liste scheitern
  if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors)); console.error(teilzustandText()); process.exit(5); }
  console.log('upsert', namen.join(', '), JSON.stringify((u.upsertedThemeFiles || []).map((x) => x.filename)));
}
async function loeschen(namen) {
  const u = (await q(`mutation($id:ID!,$files:[String!]!){themeFilesDelete(themeId:$id,files:$files){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: namen })).themeFilesDelete;
  console.log('delete', namen.join(', '), JSON.stringify((u.deletedThemeFiles || []).map((x) => x.filename)));
  if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors)); console.error(teilzustandText()); process.exit(5); }
}
// Wartet, bis die API für alle genannten Dateien die erwartete Prüfsumme meldet (soll[n] === null heisst: Datei muss fehlen). Rückgabe: true/false.
async function warteBisGleich(soll, namen, maxMs) {
  const t0 = Date.now();
  for (;;) {
    const nach = await lesen();
    const offen = namen.filter((n) => (soll[n] === null ? nach[n] != null : nach[n]?.md5 !== soll[n]));
    if (!offen.length) return true;
    if (Date.now() - t0 > maxMs * ZEIT) { console.error('Prüfsumme weicht noch ab bei:', offen.join(', ')); return false; }
    await warte(10000);
  }
}
async function pruefenNachSchreiben(soll, beschreibung) {
  await warte(75000);
  // Die API zeigt neue Prüfsummen mit Verzug (Erfahrung: rund eine Minute): bis zu 150 s wiederholt lesen, statt nach einer einzigen Lesung «ABWEICHUNG» zu melden
  await warteBisGleich(soll, ALLE, 150000);
  const nach = await lesen(); let ok = true;
  for (const n of ALLE) {
    const ist = nach[n]?.md5 ?? null;
    const gleich = ist === soll[n];
    ok = ok && gleich;
    console.log('rücklesen', beschreibung, n.padEnd(46), gleich ? 'GLEICH' : 'ABWEICHUNG', ist ?? 'fehlt', nach[n]?.size ?? '');
  }
  return ok;
}
const alsMd5 = (dateien, namen = ALLE) => Object.fromEntries(namen.map((n) => [n, md5(dateien[n])]));

const jetzt = await lesen();
for (const n of ALLE) console.log(n.padEnd(46), jetzt[n] ? `${jetzt[n].md5} ${jetzt[n].size} Byte` : 'fehlt');
if (ALT.some((n) => !jetzt[n])) { console.error('Eine bestehende Datei fehlt: nichts geschrieben'); process.exit(4); }

// Die Sicherung muss der Ausgangsstand sein (sonst würde eine Rücknahme etwas Falsches zurückschreiben)
function ladeSicherung() {
  const sich = {};
  for (const n of ALT) {
    if (!existsSync(sichDatei(n))) return null;
    sich[n] = readFileSync(sichDatei(n), 'utf8');
    if (md5(sich[n]) !== MD5_VOR[n]) { console.error('Sicherung weicht vom Ausgangsstand ab:', n); process.exit(4); }
  }
  return sich;
}

if (ZURUECK) {
  const sich = ladeSicherung(); if (!sich) { console.error('Sicherung fehlt'); process.exit(4); }
  let soll;
  if (existsSync(MERKLISTE)) soll = JSON.parse(readFileSync(MERKLISTE, 'utf8')).md5;
  else soll = alsMd5(anwendenKombi(sich, frageDaten()));
  const alt = alsMd5(sich, ALT), zustand = {};
  // «unberührt»: CSS/JS wurde von jemand anderem verändert, ohne dass unser Code darin steckt (keine Marke): nichts zurückzunehmen, nie anfassen
  const unberuehrt = (n) => SCHRITT_CODE.includes(n) && jetzt[n].content != null && !MARKEN.some((m) => jetzt[n].content.includes(m));
  for (const n of ALT) zustand[n] = jetzt[n].md5 === soll[n] ? 'neu' : jetzt[n].md5 === alt[n] ? 'alt' : unberuehrt(n) ? 'unberuehrt' : 'fremd';
  for (const n of NEU) zustand[n] = !jetzt[n] ? 'fehlt' : jetzt[n].md5 === soll[n] ? 'neu' : 'fremd';
  for (const n of ALLE) console.log('zustand', n.padEnd(46), zustand[n]);
  const fremde = ALLE.filter((n) => zustand[n] === 'fremd');
  if (fremde.length && !FREMD_OK) {
    console.error('Mindestens eine Datei ist weder im eingespielten noch im Ausgangsstand (verändert, oder die neue Prüfsumme ist in der API noch nicht sichtbar): nichts zurückgenommen');
    for (const n of fremde) console.error('  fremd:', n, 'Live-MD5', jetzt[n].md5, '| Soll', soll[n], '| Ausgangsstand', alt[n] ?? '(neue Datei)');
    console.error(`Bewusst trotzdem zurücknehmen (überschreibt auch diese Dateien mit der Sicherung, löscht fremd veränderte neue Dateien): FREMD_UEBERSCHREIBEN=1 ZURUECK=1 LIVE=1 node ${BEFEHL}`);
    process.exit(3);
  }
  if (fremde.length) console.log('FREMD_UEBERSCHREIBEN=1: auch diese Dateien werden zurückgesetzt:', fremde.map((n) => `${n} (${jetzt[n].md5})`).join(', '));
  if (fremde.some((n) => n.startsWith('locales/'))) console.log('ACHTUNG: eine fremd veränderte Sprachdatei wird ROH mit dem Ausgangsstand überschrieben (' + fremde.filter((n) => n.startsWith('locales/')).join(', ') + '): Änderungen im Sprach-Editor des Admins daran gehen verloren. Vorher den Unterschied ansehen und merken.');
  const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');
  const zuLoeschen = NEU_BEHALTEN ? [] : NEU.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');
  console.log('Rücknahme auf den Stand vor dem Paket; zu schreiben:', zuSchreiben.length ? zuSchreiben.join(', ') : '(nichts, alles schon im Ausgangsstand)', '| zu löschen:', zuLoeschen.length ? zuLoeschen.join(', ') : '(nichts)');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const rueckProgramm = SCHRITT_CODE.filter((n) => zuSchreiben.includes(n)), rueckTexte = SCHRITT_TEXTE.filter((n) => zuSchreiben.includes(n));
  let rueckCode = 0;
  try {
    // Wiederholbar heisst: der gleiche Befehl liest je Datei neu den Zustand und macht dort weiter, wo er aufgehört hat
    const WIEDERHOLBAR = 'Die Rücknahme ist wiederholbar: gleicher Befehl noch einmal.';
    if (rueckProgramm.length) await schreiben(sich, rueckProgramm);
    if (rueckProgramm.length && (rueckTexte.length || zuLoeschen.length) && !(await warteBisGleich(alt, rueckProgramm, 150000))) { console.error('Rücknahme: CSS/JS sind nach 150 s in der API noch nicht auf dem Ausgangsstand sichtbar. Texte, Liquid und neue Dateien NICHT angefasst. ' + WIEDERHOLBAR); process.exit(6); }
    // Vor dem nächsten Schreiben/Löschen: sind die Dateien noch so, wie sie zu Beginn waren? (Jemand anderes kann in den bis zu 150 s dazwischen geschrieben haben.)
    const nochGleich = async (namen) => { if (!namen.length) return true; const f = await lesen(); const geaendert = namen.filter((n) => (f[n]?.md5 ?? null) !== (jetzt[n]?.md5 ?? null)); if (geaendert.length) { console.error('Rücknahme angehalten: während der Rücknahme hat jemand anderes verändert:', geaendert.map((n) => n + ' (jetzt ' + (f[n]?.md5 ?? 'fehlt') + ', zu Beginn ' + (jetzt[n]?.md5 ?? 'fehlt') + ')').join(', '), '| nichts weiter geschrieben oder gelöscht. ' + WIEDERHOLBAR); return false; } return true; };
    if (!(await nochGleich([...rueckTexte, ...zuLoeschen]))) process.exit(3);
    if (rueckTexte.length) await schreiben(sich, rueckTexte);
    if (zuLoeschen.length) {
      if (rueckTexte.length && !(await warteBisGleich(alt, rueckTexte, 150000))) { console.error('Rücknahme: Texte/Liquid sind nach 150 s in der API noch nicht auf dem Ausgangsstand sichtbar. Die drei neuen Dateien NICHT gelöscht (sie wären sonst für ein noch neues JS/Liquid weg). ' + WIEDERHOLBAR); process.exit(6); }
      if (!(await nochGleich(zuLoeschen))) process.exit(3);
      await loeschen(zuLoeschen);
    }
    const sollNachher = { ...alt, ...Object.fromEntries(ALT.filter((n) => zustand[n] === 'unberuehrt').map((n) => [n, jetzt[n].md5])), ...Object.fromEntries(NEU.map((n) => [n, zuLoeschen.includes(n) || zustand[n] === 'fehlt' ? null : jetzt[n].md5])) };
    rueckCode = (await pruefenNachSchreiben(sollNachher, 'zurück')) ? 0 : 6;
  } catch (e) {
    console.error('Ausnahme während der Rücknahme:', e && e.message ? e.message : e);
    console.error('Die Rücknahme ist wiederholbar: gleicher Befehl noch einmal (sie liest je Datei neu den Zustand).');
    process.exit(7);
  }
  process.exit(rueckCode);
}

const ausgang = ALT.every((n) => jetzt[n].md5 === MD5_VOR[n]) && NEU.every((n) => !jetzt[n]);
// Fortsetzen nach einem Abbruch: jede Datei ist entweder noch im Ausgangsstand (neue Dateien: fehlt) oder schon im Soll-Stand, beides kommt vor, und die Sicherung ist da.
// Der Soll-Stand wird aus der Sicherung (MD5-geprüft) und den Datenquellen gerechnet, nicht aus dem Live-Stand.
let fortsetzen = null;
if (!ausgang) {
  const sichFort = ladeSicherung();
  if (sichFort) {
    try {
      const sollFort = alsMd5(anwendenKombi(sichFort, lesenDaten()));
      const z = Object.fromEntries(ALLE.map((n) => [n, jetzt[n] ? (jetzt[n].md5 === sollFort[n] ? 'neu' : MD5_VOR[n] != null && jetzt[n].md5 === MD5_VOR[n] ? 'alt' : 'fremd') : (MD5_VOR[n] == null ? 'alt' : 'fremd')]));
      const werte = Object.values(z);
      if (!werte.includes('fremd') && werte.includes('neu') && werte.includes('alt')) fortsetzen = { sich: sichFort, soll: sollFort, zustand: z };
    } catch { fortsetzen = null; }
  }
}
if (!ausgang && !fortsetzen && ALT.every((n) => jetzt[n].md5 === MD5_VOR[n])) {
  // nur neue Dateien sind da: unsere (Teilzustand, z. B. nach Schritt 1a) oder eine fremde Datei gleichen Namens?
  const d = frageDaten(), erwartet = { [NEUE_DATEIEN.AUSBLENDEN]: md5(ausblendenText(d.ausblenden)), [NEUE_DATEIEN.KARTE]: md5(d.karte), [NEUE_DATEIEN.TEXTE]: md5(d.texte) };
  const fremdNeu = NEU.filter((n) => jetzt[n] && jetzt[n].md5 !== erwartet[n]);
  if (fremdNeu.length) { console.error('Eine der neuen Dateien existiert schon mit anderem Inhalt: nichts geschrieben:', fremdNeu.map((n) => `${n} (${jetzt[n].md5})`).join(', ')); process.exit(4); }
}
if (!ausgang && !fortsetzen) {
  const merk = existsSync(MERKLISTE) ? JSON.parse(readFileSync(MERKLISTE, 'utf8')).md5 : null;
  const schon = MARKEN.some((m) => jetzt[DATEIEN.JS].content?.includes(m) || jetzt[DATEIEN.CSS].content?.includes(m)) || NEU.some((n) => jetzt[n]) || (merk && ALT.some((n) => jetzt[n].md5 === merk[n] && merk[n] !== MD5_VOR[n]));
  // Ist nur EINES der beiden Einzelpakete eingespielt, passt die Rücknahme dieses Skripts nicht: erst dessen eigene Rücknahme
  const inhalte = [jetzt[DATEIEN.JS].content, jetzt[DATEIEN.CSS].content].filter((c) => c != null).join('\n');
  const nurA = inhalte.includes(MARKEN[0]) && !inhalte.includes(MARKEN[1]), nurB = inhalte.includes(MARKEN[1]) && !inhalte.includes(MARKEN[0]);
  if (nurA) console.error('Nur das Paket katalog-nur-bestellbar-0511 («nur bestellbar», Marke ' + MARKEN[0] + ') ist eingespielt: nichts geschrieben. Erst dessen Rücknahme (ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs), dann dieser gemeinsame Stand. Dieser Stand setzt den Ausgangsstand voraus.');
  else if (nurB) console.error('Nur das Paket katalog-texte-de-0611 («deutsche Texte», Marke ' + MARKEN[1] + ') ist im Code eingespielt: nichts geschrieben. Erst dessen Rücknahme (nur die fünf neuen Sprachschlüssel und die Marken entfernen, nicht die .orig roh zurückschreiben), dann dieser gemeinsame Stand. Dieser Stand setzt den Ausgangsstand voraus.');
  else console.error(schon ? `Schon eingespielt (oder teilweise, z. B. nur ein Teil der Schritte): nichts geschrieben. Rücknahme: ZURUECK=1 LIVE=1 node ${BEFEHL}` : 'Mindestens eine Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben');
  if (!schon) {
    for (const n of ALT) if (jetzt[n].md5 !== MD5_VOR[n]) console.error('  weicht ab:', n, 'Live-MD5', jetzt[n].md5, '| erwartet', MD5_VOR[n]);
    // Hilfe für den Folgeschritt (z. B. wenn ein anderer Auftrag luxe-clothing.js zuerst geändert hat): passen die Anker noch auf den Live-Stand?
    try {
      if (ALT.every((n) => jetzt[n].content != null)) { anwendenKombi(Object.fromEntries(ALT.map((n) => [n, jetzt[n].content])), frageDaten()); console.error('  Hinweis: Die Anker von patches.mjs und texte_ersetzungen.mjs passen noch auf den aktuellen Live-Stand. Nach Durchsicht der fremden Änderung MD5_VOR in patches.mjs (und sicherung/*.vor, daten/pruefstand.json) auf den Live-Stand setzen und die Tests wiederholen.'); }
    } catch (e) { console.error('  Hinweis: Die Anker passen NICHT mehr auf den Live-Stand:', e.message); }
  }
  process.exit(schon ? 3 : 4);
}
if (!fortsetzen && ALT.some((n) => jetzt[n].content == null)) { console.error('Inhalt einer Datei nicht lesbar: nichts geschrieben'); process.exit(4); }
const alt = fortsetzen ? fortsetzen.sich : Object.fromEntries(ALT.map((n) => [n, jetzt[n].content]));
if (fortsetzen) {
  ALLE.filter((n) => fortsetzen.zustand[n] === 'neu').forEach((n) => geschrieben.add(n));
  console.log('FORTSETZEN: ein früherer Lauf wurde unterbrochen. Schon im Soll-Stand (werden nicht erneut geschrieben):', [...geschrieben].join(', '), '| noch zu schreiben:', ALLE.filter((n) => !geschrieben.has(n)).join(', '));
}
const daten = frageDaten();
let neu;
try { neu = anwendenKombi(alt, daten); } catch (e) { console.error('Soll-Stand nicht berechenbar (Anker passen nicht): nichts geschrieben:', e.message); process.exit(4); }
mkdirSync(HIER + 'sicherung', { recursive: true });
for (const n of ALT) if (!existsSync(sichDatei(n))) writeFileSync(sichDatei(n), alt[n]);
if (!ladeSicherung()) { console.error('Sicherung unvollständig'); process.exit(4); }
const sollMd5 = alsMd5(neu);
if (fortsetzen && ALLE.some((n) => sollMd5[n] !== fortsetzen.soll[n])) { console.error('Soll-Stand weicht vom Soll-Stand des Fortsetzens ab (innerer Fehler): nichts geschrieben'); process.exit(4); }
console.log('Sicherung vorhanden; neue Grössen', ALLE.map((n) => `${n} ${Buffer.byteLength(neu[n])}`).join(' | '));
console.log('Schreibschritte:', SCHRITTE.map(([name, alle]) => [name, alle.filter((n) => !geschrieben.has(n))]).filter(([, dateien]) => dateien.length).map(([name, dateien]) => `${name} (${dateien.length} Datei${dateien.length > 1 ? 'en' : ''}, ${Math.round(dateien.reduce((s, n) => s + Buffer.byteLength(neu[n]), 0) / 1024)} KB)`).join(' → ') || '(keine)');
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

// Vor JEDEM Schreibschritt: alle zwölf Dateien frisch lesen. Erwartet: noch nicht geschriebene = Ausgangsstand (neue Dateien: fehlen), schon geschriebene = Soll-Stand.
const erwartetJetzt = () => Object.fromEntries(ALLE.map((n) => [n, geschrieben.has(n) ? sollMd5[n] : (MD5_VOR[n] ?? null)]));
async function abweichungen() {
  const frisch = await lesen(), erw = erwartetJetzt();
  return { frisch, erw, abw: ALLE.filter((n) => (frisch[n]?.md5 ?? null) !== erw[n]) };
}
let endCode = 0;
try {
  let ersterSchritt = true; // der erste Schritt, der wirklich schreibt (beim Fortsetzen nicht unbedingt 1a)
  for (let i = 0; i < SCHRITTE.length; i++) {
    const [name, alleDateien] = SCHRITTE[i];
    const dateien = alleDateien.filter((n) => !geschrieben.has(n)); // beim Fortsetzen nur die noch fehlenden
    if (!dateien.length) { console.log(`Schritt ${name}: schon im Soll-Stand, übersprungen`); continue; }
    if (i === SCHRITTE.length - 1) await warte(15000); // vor dem Code-Schritt 15 s Ruhe (ein anderer Auftrag schreibt oft kurz nach dem ersten Lesen)
    const { frisch, erw, abw } = await abweichungen();
    if (abw.length) {
      if (ersterSchritt) {
        // Zwischen dem ersten Lesen und dem Schreiben liegen Berechnung und Sicherung: hat sich etwas geändert, wird nichts geschrieben (auch keine Merkliste).
        console.error('Kurz vor dem Schreiben hat sich etwas geändert (ein anderer Auftrag?): nichts geschrieben:', abw.map((n) => n + ' (jetzt ' + (frisch[n]?.md5 ?? 'fehlt') + ')').join(', '));
        process.exit(4);
      }
      console.error(`Schritt ${name} NICHT geschrieben: ` + abw.map((n) => n + ' (jetzt ' + (frisch[n]?.md5 ?? 'fehlt') + ', erwartet ' + (erw[n] ?? 'fehlt') + ')').join(', ') + ' hat sich seit dem Start verändert (ein anderer Auftrag?). Dessen Änderung bleibt unberührt.');
      console.error(`Bis hierher geschrieben: ${[...geschrieben].join(', ') || '(nichts)'}. Das ist ohne den neuen Code harmlos` + (geschrieben.has(DATEIEN.DE) ? '; nur der Hinweistext oben im Fenster (Schritt 2) sagt schon «nur Modelle …»' : '') + `. Weiter: (a) ZURUECK=1 LIVE=1 node ${BEFEHL} nimmt das Geschriebene zurück und lässt eine fremd veränderte Datei ohne unsere Marke unberührt; (b) dann MD5_VOR, sicherung/*.vor und daten/pruefstand.json auf den neuen Stand setzen, die Tests wiederholen und neu einspielen. Oder erst die Änderung des anderen Auftrags prüfen: passen die Anker noch?`);
      // Hilfe für den Folgeschritt: passen die Anker auf die verändert vorgefundenen, noch nicht geschriebenen Dateien?
      try {
        const ungeschrieben = abw.filter((n) => ALT.includes(n) && !geschrieben.has(n));
        if (ungeschrieben.length && ungeschrieben.every((n) => frisch[n]?.content != null)) { anwendenKombi({ ...alt, ...Object.fromEntries(ungeschrieben.map((n) => [n, frisch[n].content])) }, daten); console.error('  Hinweis: Die Anker von patches.mjs und texte_ersetzungen.mjs passen noch auf die veränderte Datei.'); }
        else if (!ungeschrieben.length) console.error('  Hinweis: verändert wurde eine Datei, die dieser Lauf selbst geschrieben hat oder eine neue Datei.');
      } catch (e) { console.error('  Hinweis: Die Anker passen auf die veränderte Datei NICHT mehr:', e.message); }
      process.exit(4);
    }
    if (ersterSchritt) {
      ersterSchritt = false;
      // Merkliste VOR dem Schreiben: so erkennt die Rücknahme auch einen Teilzustand
      writeFileSync(MERKLISTE, JSON.stringify({ erstellt: new Date().toISOString(), hinweis: 'MD5 der Dateien, die apply.mjs ins MAIN-Theme schreibt (Soll-Stand, zwölf Dateien)', md5: sollMd5 }, null, 1) + '\n');
    }
    await schreiben(neu, dateien);
    dateien.forEach((n) => geschrieben.add(n));
    if (i < SCHRITTE.length - 1) {
      const nurDiese = Object.fromEntries(dateien.map((n) => [n, sollMd5[n]]));
      if (!(await warteBisGleich(nurDiese, dateien, 150000))) { console.error(`Schritt ${name} ist nach 150 s noch nicht in der API sichtbar: die folgenden Schritte NICHT geschrieben.`); console.error(teilzustandText()); process.exit(6); }
    }
  }
  endCode = (await pruefenNachSchreiben(sollMd5, 'neu')) ? 0 : 6;
} catch (e) {
  console.error('Ausnahme nach Beginn des Schreibens:', e && e.message ? e.message : e);
  console.error(teilzustandText());
  process.exit(7);
}
process.exit(endCode);
