// Spielt das Paket «Katalogfenster: nur bestellbare anzeigen» ins MAIN-Theme (9 geänderte + 2 neue Dateien). Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs
// Einspielen: MD5 der neun bestehenden Live-Dateien gegen den Ausgangsstand prüfen und die zwei neuen Dateien müssen fehlen (sonst Abbruch, nichts geschrieben), Sicherung (gegen den
// Ausgangsstand geprüft) ablegen, UNMITTELBAR VOR dem Schreiben alle elf Dateien ein zweites Mal frisch lesen und gegen den Ausgangsstand prüfen (zwischen dem ersten Lesen und dem Schreiben
// liegen Berechnung und Sicherung), Merkliste des Soll-Stands (sicherung/eingespielt.json) ablegen, dann Schritt 1 (Daten, Texte, Liquid: ohne den neuen Code harmlos), WARTEN BIS die
// Prüfsummen von Schritt 1 über die API stimmen (höchstens 150 s), dann 15 s Ruhe und CSS und JS NOCHMALS frisch lesen: sind sie nicht mehr der Ausgangsstand (ein anderer Auftrag,
// z. B. «Katalogtexte deutsch», hat sie in der Zwischenzeit geschrieben), wird Schritt 2 NICHT geschrieben (Exit 4, nichts von dem anderen Auftrag geht verloren); sonst Schritt 2
// (CSS, JS), nach 75 s alle elf Dateien über die Prüfsumme zurücklesen (die Theme-API liefert den Inhalt je nach Grösse als Text oder als URL; verglichen wird die Prüfsumme).
// Rücknahme: je bestehende Datei «neu» (gleich Soll) oder «alt» (gleich Sicherung), je neue Datei «neu» oder «fehlt»; CSS/JS, die weder neu noch alt sind UND die Marke des Pakets nicht
// tragen, gelten als «unberührt» (jemand anderes hat sie verändert, ohne dass unser Code darin steckt: sie werden nie angefasst, auch nicht mit FREMD_UEBERSCHREIBEN=1); jede andere
// Datei bricht ab (Exit 3, nichts geschrieben), ausser mit FREMD_UEBERSCHREIBEN=1. Reihenfolge: erst CSS/JS zurück, warten (bleibt die Prüfsumme nach 150 s unsichtbar: Exit 6, nichts
// weiter geschrieben, wiederholbar), die zu schreibenden und zu löschenden Dateien frisch lesen (hat sie jemand verändert: Exit 3), dann Texte/Liquid, zuletzt die zwei neuen Dateien
// löschen (NEUE_BEHALTEN=1 lässt sie stehen: harmlos, aber unbenutzt).
// OHNE Merkliste (liegt nur im Scratch/Commit nach dem Einspielen) wird der Soll-Stand aus patches.mjs und daten/ neu gerechnet und muss unverändert sein.
// Exit: 0 ok · 1 kein Token / fehlende Variablen / unerwartete Ausnahme VOR dem Schreiben · 3 schon eingespielt (auch Teilzustand) / Rücknahme nicht möglich ·
// 4 Ausgangsstand oder Sicherung weicht ab · 5 userErrors · 6 Rücklesen weicht ab · 7 Ausnahme NACH Beginn des Schreibens (Teilzustand möglich)
// APPLY_ZEIT=0.001 verkürzt alle Wartezeiten (nur für den Test mit der Attrappe der Theme-API).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, MARKE, anwenden, ausblendenText } from './patches.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1', FREMD_OK = process.env.FREMD_UEBERSCHREIBEN === '1', NEU_BEHALTEN = process.env.NEUE_BEHALTEN === '1';
const ZEIT = Number(process.env.APPLY_ZEIT ?? 1);
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const warte = (ms) => new Promise((r) => setTimeout(r, ms * ZEIT));
const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];
const SCHRITT1 = [NEUE_DATEIEN.AUSBLENDEN, NEUE_DATEIEN.KARTE, DATEIEN.DE, DATEIEN.EN, DATEIEN.FR, DATEIEN.SECTION, DATEIEN.MANIFEST, DATEIEN.COVER, DATEIEN.CATEGORY];
const SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS];
const MERKLISTE = HIER + 'sicherung/eingespielt.json';
const sichDatei = (n) => HIER + 'sicherung/' + n.replace('/', '__') + '.vor';
const TEILZUSTAND = 'Teilzustand möglich: ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs nimmt auch einen Teilzustand zurück (je Datei); zur Not die Dateien aus sicherung/*.vor von Hand per themeFilesUpsert zurückschreiben und die zwei neuen Dateien per themeFilesDelete entfernen.';
const lesenDaten = () => ({ ausblenden: JSON.parse(readFileSync(HIER + 'daten/ausblenden-quelle.json', 'utf8')), karte: readFileSync(HIER + 'daten/variantenkarte.json', 'utf8') });

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);

// Liest die elf Dateien: {name: {md5, size, content|null}}; fehlende Dateien fehlen im Ergebnis; Inhalt nur, wenn die API ihn als Text liefert (sonst über die URL nachladen).
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
  console.log('upsert', namen.join(', '), JSON.stringify(u.upsertedThemeFiles.map((x) => x.filename)));
  if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors)); console.error(TEILZUSTAND); process.exit(5); }
}
async function loeschen(namen) {
  const u = (await q(`mutation($id:ID!,$files:[String!]!){themeFilesDelete(themeId:$id,files:$files){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: namen })).themeFilesDelete;
  console.log('delete', namen.join(', '), JSON.stringify((u.deletedThemeFiles || []).map((x) => x.filename)));
  if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors)); console.error(TEILZUSTAND); process.exit(5); }
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
  else soll = alsMd5(anwenden(sich, lesenDaten()));
  const alt = alsMd5(sich, ALT), zustand = {};
  // «unberührt»: CSS/JS wurde von jemand anderem verändert, ohne dass unser Code darin steckt (keine Marke): nichts zurückzunehmen, nie anfassen
  const unberuehrt = (n) => SCHRITT2.includes(n) && jetzt[n].content != null && !jetzt[n].content.includes(MARKE);
  for (const n of ALT) zustand[n] = jetzt[n].md5 === soll[n] ? 'neu' : jetzt[n].md5 === alt[n] ? 'alt' : unberuehrt(n) ? 'unberuehrt' : 'fremd';
  for (const n of NEU) zustand[n] = !jetzt[n] ? 'fehlt' : jetzt[n].md5 === soll[n] ? 'neu' : 'fremd';
  for (const n of ALLE) console.log('zustand', n.padEnd(46), zustand[n]);
  const fremde = ALLE.filter((n) => zustand[n] === 'fremd');
  if (fremde.length && !FREMD_OK) {
    console.error('Mindestens eine Datei ist weder im eingespielten noch im Ausgangsstand (verändert, oder die neue Prüfsumme ist in der API noch nicht sichtbar): nichts zurückgenommen');
    for (const n of fremde) console.error('  fremd:', n, 'Live-MD5', jetzt[n].md5, '| Soll', soll[n], '| Ausgangsstand', alt[n] ?? '(neue Datei)');
    console.error('Bewusst trotzdem zurücknehmen (überschreibt auch diese Dateien mit der Sicherung, löscht fremd veränderte neue Dateien): FREMD_UEBERSCHREIBEN=1 ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs');
    process.exit(3);
  }
  if (fremde.length) console.log('FREMD_UEBERSCHREIBEN=1: auch diese Dateien werden zurückgesetzt:', fremde.map((n) => `${n} (${jetzt[n].md5})`).join(', '));
  const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');
  const zuLoeschen = NEU_BEHALTEN ? [] : NEU.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');
  console.log('Rücknahme auf den Stand vor dem Paket; zu schreiben:', zuSchreiben.length ? zuSchreiben.join(', ') : '(nichts, alles schon im Ausgangsstand)', '| zu löschen:', zuLoeschen.length ? zuLoeschen.join(', ') : '(nichts)');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const rueck2 = SCHRITT2.filter((n) => zuSchreiben.includes(n)), rueck1 = SCHRITT1.filter((n) => zuSchreiben.includes(n));
  let rueckCode = 0;
  try {
    // Wiederholbar heisst: der gleiche Befehl liest je Datei neu den Zustand und macht dort weiter, wo er aufgehört hat
    const WIEDERHOLBAR = 'Die Rücknahme ist wiederholbar: gleicher Befehl noch einmal.';
    if (rueck2.length) await schreiben(sich, rueck2);
    if (rueck2.length && rueck1.length && !(await warteBisGleich(alt, rueck2, 150000))) { console.error('Rücknahme: CSS/JS sind nach 150 s in der API noch nicht auf dem Ausgangsstand sichtbar. Texte, Liquid und neue Dateien NICHT angefasst. ' + WIEDERHOLBAR); process.exit(6); }
    // Vor dem nächsten Schreiben/Löschen: sind die Dateien noch so, wie sie zu Beginn waren? (Jemand anderes kann in den bis zu 150 s dazwischen geschrieben haben.)
    const nochGleich = async (namen) => { if (!namen.length) return true; const f = await lesen(); const geaendert = namen.filter((n) => (f[n]?.md5 ?? null) !== (jetzt[n]?.md5 ?? null)); if (geaendert.length) { console.error('Rücknahme angehalten: während der Rücknahme hat jemand anderes verändert:', geaendert.map((n) => n + ' (jetzt ' + (f[n]?.md5 ?? 'fehlt') + ', zu Beginn ' + (jetzt[n]?.md5 ?? 'fehlt') + ')').join(', '), '| nichts weiter geschrieben oder gelöscht. ' + WIEDERHOLBAR); return false; } return true; };
    if (!(await nochGleich([...rueck1, ...zuLoeschen]))) process.exit(3);
    if (rueck1.length) await schreiben(sich, rueck1);
    if (zuLoeschen.length) {
      if (rueck1.length && !(await warteBisGleich(alt, rueck1, 150000))) { console.error('Rücknahme: Texte/Liquid sind nach 150 s in der API noch nicht auf dem Ausgangsstand sichtbar. Die zwei neuen Dateien NICHT gelöscht (sie wären sonst für ein noch neues JS/Liquid weg). ' + WIEDERHOLBAR); process.exit(6); }
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
if (!ausgang && ALT.every((n) => jetzt[n].md5 === MD5_VOR[n])) {
  // nur die neuen Dateien sind da: unsere (Teilzustand) oder eine fremde Datei gleichen Namens?
  const d = lesenDaten(), erwartet = { [NEUE_DATEIEN.AUSBLENDEN]: md5(ausblendenText(d.ausblenden)), [NEUE_DATEIEN.KARTE]: md5(d.karte) };
  const fremdNeu = NEU.filter((n) => jetzt[n] && jetzt[n].md5 !== erwartet[n]);
  if (fremdNeu.length) { console.error('Eine der neuen Dateien existiert schon mit anderem Inhalt: nichts geschrieben:', fremdNeu.map((n) => `${n} (${jetzt[n].md5})`).join(', ')); process.exit(4); }
}
if (!ausgang) {
  const merk = existsSync(MERKLISTE) ? JSON.parse(readFileSync(MERKLISTE, 'utf8')).md5 : null;
  const schon = jetzt[DATEIEN.JS].content?.includes(MARKE) || jetzt[DATEIEN.CSS].content?.includes(MARKE) || NEU.some((n) => jetzt[n]) || (merk && ALT.some((n) => jetzt[n].md5 === merk[n] && merk[n] !== MD5_VOR[n]));
  console.error(schon ? 'Schon eingespielt (oder teilweise, z. B. nur Schritt 1): nichts geschrieben. Rücknahme: ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs' : 'Mindestens eine Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben');
  if (!schon) {
    for (const n of ALT) if (jetzt[n].md5 !== MD5_VOR[n]) console.error('  weicht ab:', n, 'Live-MD5', jetzt[n].md5, '| erwartet', MD5_VOR[n]);
    // Hilfe für den Folgeschritt (z. B. wenn der Katalogtexte-Auftrag luxe-clothing.js zuerst geändert hat): passen die Anker noch auf den Live-Stand?
    try {
      if (ALT.every((n) => jetzt[n].content != null)) { anwenden(Object.fromEntries(ALT.map((n) => [n, jetzt[n].content])), lesenDaten()); console.error('  Hinweis: Die Anker von patches.mjs passen noch auf den aktuellen Live-Stand. Nach Durchsicht der fremden Änderung MD5_VOR in patches.mjs (und sicherung/*.vor, daten/pruefstand.json) auf den Live-Stand setzen und die Tests wiederholen.'); }
    } catch (e) { console.error('  Hinweis: Die Anker von patches.mjs passen NICHT mehr auf den Live-Stand:', e.message); }
  }
  process.exit(schon ? 3 : 4);
}
if (ALT.some((n) => jetzt[n].content == null)) { console.error('Inhalt einer Datei nicht lesbar: nichts geschrieben'); process.exit(4); }
const alt = Object.fromEntries(ALT.map((n) => [n, jetzt[n].content]));
const neu = anwenden(alt, lesenDaten());
mkdirSync(HIER + 'sicherung', { recursive: true });
for (const n of ALT) if (!existsSync(sichDatei(n))) writeFileSync(sichDatei(n), alt[n]);
if (!ladeSicherung()) { console.error('Sicherung unvollständig'); process.exit(4); }
const sollMd5 = alsMd5(neu);
console.log('Sicherung vorhanden; neue Grössen', ALLE.map((n) => `${n} ${Buffer.byteLength(neu[n])}`).join(' | '));
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
// Zwischen dem ersten Lesen und dem Schreiben liegen Berechnung und Sicherung: nochmals frisch lesen. Hat sich etwas geändert, wird nichts geschrieben (auch keine Merkliste).
{
  const frisch = await lesen();
  const abw = [...ALT.filter((n) => frisch[n]?.md5 !== MD5_VOR[n]), ...NEU.filter((n) => frisch[n])];
  if (abw.length) { console.error('Kurz vor dem Schreiben hat sich etwas geändert (ein anderer Auftrag?): nichts geschrieben:', abw.map((n) => n + ' (jetzt ' + (frisch[n]?.md5 ?? 'fehlt') + ')').join(', ')); process.exit(4); }
}
// Merkliste VOR dem Schreiben: so erkennt die Rücknahme auch einen Teilzustand
writeFileSync(MERKLISTE, JSON.stringify({ erstellt: new Date().toISOString(), hinweis: 'MD5 der Dateien, die apply.mjs ins MAIN-Theme schreibt (Soll-Stand, elf Dateien)', md5: sollMd5 }, null, 1) + '\n');
let endCode = 0;
try {
  await schreiben(neu, SCHRITT1);
  if (!(await warteBisGleich(sollMd5, SCHRITT1, 150000))) { console.error('Schritt 1 ist nach 150 s noch nicht in der API sichtbar: Schritt 2 NICHT geschrieben.'); console.error(TEILZUSTAND); process.exit(6); }
  await warte(15000);
  // CSS und JS ein letztes Mal frisch lesen: hat ein anderer Auftrag sie in den bis zu 165 s seit dem ersten Lesen geschrieben (z. B. «Katalogtexte deutsch» das JS), würde Schritt 2 seine Änderung still überschreiben
  const vorSchritt2 = await lesen();
  const fremdAenderung = SCHRITT2.filter((n) => vorSchritt2[n]?.md5 !== MD5_VOR[n]);
  if (fremdAenderung.length) {
    console.error('Schritt 2 NICHT geschrieben: ' + fremdAenderung.map((n) => n + ' (jetzt ' + (vorSchritt2[n]?.md5 ?? 'fehlt') + ', erwartet ' + MD5_VOR[n] + ')').join(', ') + ' hat sich seit dem Start verändert (ein anderer Auftrag?). Dessen Änderung bleibt unberührt.');
    console.error('Schritt 1 (Daten, Texte, Liquid) ist geschrieben und ohne den neuen Code harmlos; nur der Hinweistext oben im Fenster sagt schon «nur Modelle …». Weiter: (a) ZURUECK=1 LIVE=1 node dropship/katalog-nur-bestellbar-0511/apply.mjs nimmt Schritt 1 zurück und lässt die fremd veränderte Datei unberührt (sie trägt unsere Marke nicht); (b) dann MD5_VOR, sicherung/*.vor und daten/pruefstand.json auf den neuen Stand setzen, die Tests wiederholen und neu einspielen. Oder erst die Änderung des anderen Auftrags prüfen: passen die Anker noch?');
    // Hilfe für den Folgeschritt: passen die Anker auf die verändert vorgefundene Datei? (Ausgangsstand der übrigen Dateien, verändertes CSS/JS)
    try {
      if (fremdAenderung.every((n) => vorSchritt2[n]?.content != null)) { anwenden({ ...alt, ...Object.fromEntries(fremdAenderung.map((n) => [n, vorSchritt2[n].content])) }, lesenDaten()); console.error('  Hinweis: Die Anker von patches.mjs passen noch auf die veränderte Datei.'); }
    } catch (e) { console.error('  Hinweis: Die Anker von patches.mjs passen auf die veränderte Datei NICHT mehr:', e.message); }
    process.exit(4);
  }
  await schreiben(neu, SCHRITT2);
  endCode = (await pruefenNachSchreiben(sollMd5, 'neu')) ? 0 : 6;
} catch (e) {
  console.error('Ausnahme nach Beginn des Schreibens:', e && e.message ? e.message : e);
  console.error(TEILZUSTAND);
  process.exit(7);
}
process.exit(endCode);
