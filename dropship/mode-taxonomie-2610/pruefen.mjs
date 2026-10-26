/**
 * Gemeinsame Pruefung der vier Mode-Taxonomien (Damen, Herren, Kinder/Baby, Schuhe & Accessoires).
 * Liest NUR die vier Abteilungs-JSON, /tmp/mode_daten.json, /tmp/vorhandene_collections.json (und g_korrekturen.json mit --mit-korrektur).
 * Schreibt nichts, ausser mit den ausdruecklichen Schaltern --json / --stich / --alles / --dump.
 *
 *   node pruefen.mjs                      -> Bericht (1) Mehrfachzuordnung, (1b) Geschlechtsregeln gegeneinander, (2) ohne Kategorie,
 *                                            (3) Kategorien unter 15, (4) Handle-Kollisionen, plus Treffer je Kategorie
 *   node pruefen.mjs --vorher             -> dieselbe Pruefung auf den Sicherungen *.json.vorher (Abteilungsregeln, Zustand vor den Korrekturen)
 *   node pruefen.mjs --mit-korrektur      -> zusaetzlich g_korrekturen.json anwenden (falsche Google-Kategorie im Datensatz korrigiert)
 *   node pruefen.mjs --json <datei>       -> alle Kennzahlen zusaetzlich als JSON ablegen
 *   node pruefen.mjs --stich              -> (5) schreibt pruef_stichproben/<handle>.txt (25 Zufallstitel je Kategorie, Seed «pruefer-25:»+Handle)
 *   node pruefen.mjs --zeige <handle>     -> druckt die 25 Zufallstitel einer Kategorie
 *   node pruefen.mjs --alles              -> baut ALLES.json (alle Kategorien, ein Format, plus Menue) und ZUORDNUNG.json (alles_bauen.mjs)
 *   node pruefen.mjs --paare              -> alle Beispiele der Ueberschneidungen
 *   node pruefen.mjs --luecken [n]        -> n Beispiele der Produkte ohne Kategorie
 *   node pruefen.mjs --ohne-alle [Grund]  -> ALLE Produkte ohne Kategorie, nach Grund und Google-Kategorie (Schalter danach: --mit-korrektur)
 *   node pruefen.mjs --fremd              -> Querpruefung der Fremdkoerper-Listen: steht ein «gehoert nach Kinder/Damen/…»-Produkt dort wirklich?
 *   node pruefen.mjs --dump               -> Arbeitsdatei _zuordnung_tmp.json (Produkt -> Kategorien) fuer Zusatzpruefungen
 *
 * EINE gemeinsame Auswertungsfunktion (pruef_kern.mjs, passt): Ein Produkt gehoert zur Kategorie, wenn
 *   (g beginnt mit einem g_prefix ODER, falls g_prefix leer, mindestens ein titel_muss passt)
 *   UND (titel_muss leer ODER mindestens ein Treffer) UND kein titel_nicht-Treffer UND kein g_nicht-Praefix
 *   UND kein Tag aus tags_nicht UND (tags_muss_eines leer ODER mindestens eines) UND Geschlecht(Produkt) passt zur Kategorie.
 * Geschlecht: nach den Korrekturen die gemeinsame Regel (geschlecht_gemeinsam.mjs), mit --vorher die Funktion je Abteilung.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const VORHER = ARGS.includes('--vorher');
const argVal = (n) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : undefined; };

export const DATEIEN = ['damen-bekleidung', 'herren-bekleidung', 'kinder-baby-bekleidung', 'schuhe-accessoires'];
const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const vorhandene = JSON.parse(fs.readFileSync('/tmp/vorhandene_collections.json', 'utf8'));
const MIT_KORREKTUR = ARGS.includes('--mit-korrektur');
const gKorr = MIT_KORREKTUR ? JSON.parse(fs.readFileSync(path.join(HERE, 'g_korrekturen.json'), 'utf8')) : {};
for (const p of daten) if (gKorr[p.handle]) p.g = gKorr[p.handle].g;   // Zusatzschritt: Google-Kategorie laut g_korrekturen.json
const J = Object.fromEntries(DATEIEN.map(f => [f, JSON.parse(fs.readFileSync(path.join(HERE, f + '.json' + (VORHER ? '.vorher' : '')), 'utf8'))]));

// ───────────── Geschlecht je Abteilung ─────────────
const damenMod = await import('./damen-bekleidung_regeln.mjs');
const herrenGen = await import('./herren_gen.mjs');
const kinderMod = await import('./kinder-baby-bekleidung_regeln.mjs');
const saMod = await import('./sa_regeln.mjs');
const gemModul = fs.existsSync(path.join(HERE, 'geschlecht_gemeinsam.mjs')) ? await import('./geschlecht_gemeinsam.mjs') : null;
const gemeinsam = VORHER ? null : gemModul;
export const GEN = gemeinsam ? gemeinsam.GEN_JE_DATEI : {
  'damen-bekleidung': p => damenMod.geschlechtQuelle(p)[0],
  'herren-bekleidung': p => herrenGen.geschlecht(p),
  'kinder-baby-bekleidung': p => kinderMod.geschlechtQuelle(p)[0],
  'schuhe-accessoires': p => saMod.geschlecht(p)[0],
};

import { R, geschlechtPasst, passt, imUnterfilter, altMitglieder as altMitgliederKern, imUniversum } from './pruef_kern.mjs';

// ───────────── Auswertung ─────────────
export const kats = [];
for (const f of DATEIEN) for (const k of J[f].kategorien) kats.push({ ...k, datei: f });
const genCache = {};
for (const f of DATEIEN) genCache[f] = daten.map(p => GEN[f](p));
const mem = new Map();              // handle -> [Produktindex]
const proProdukt = daten.map(() => []); // Produktindex -> [Kategorie-Handles]
for (const k of kats) {
  const l = [];
  for (let i = 0; i < daten.length; i++) if (passt(k, daten[i], genCache[k.datei][i])) { l.push(i); proProdukt[i].push(k.handle); }
  mem.set(k.handle, l);
}
const katVon = Object.fromEntries(kats.map(k => [k.handle, k]));

const SPERR = new Set(['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'google-gesperrt-adult', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'lizenz-nicht-bewerben']);

function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function stichprobe(liste, n, key) {
  const r = prng(hash(key)); const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const kurzG = g => (g || '(leer)').replace('Apparel & Accessories > ', '').replace('Clothing Accessories', 'CA').replace('Clothing', 'C').replace('Handbags, Wallets & Cases', 'HWC');
const kurzGen = i => ['damen', 'herren', 'kinder', 'unisex', 'partner', 'unbekannt', 'andere'].includes(0) ? '' : '';

// ───────────── Einzelbefehle ─────────────
if (ARGS[0] === '--zeige' || ARGS[0] === '--stich') {
  const SEED = 'pruefer-25:';
  const zeile = (i, nr) => {
    const p = daten[i];
    const gs = DATEIEN.map(f => genCache[f][i]);
    return `${String(nr).padStart(2)}\t${p.handle}\t${p.title.slice(0, 110)}\t[${kurzG(p.g).slice(0, 40)}|${gs[0]}/${gs[1]}/${gs[2]}/${gs[3]}]`;
  };
  if (ARGS[0] === '--zeige') {
    const h = ARGS[1]; const l = mem.get(h);
    if (!l) { console.log('unbekannte Kategorie', h); process.exit(1); }
    const s = stichprobe(l, 25, SEED + h);
    console.log(`# ${h}: ${l.length} Treffer, ${s.length} gelesen (Seed ${SEED}${h})`);
    s.forEach((i, n) => console.log(zeile(i, n + 1)));
  } else {
    const dir = path.join(HERE, 'pruef_stichproben'); fs.mkdirSync(dir, { recursive: true });
    for (const k of kats) fs.writeFileSync(path.join(dir, k.handle + '.txt'), stichprobe(mem.get(k.handle), 25, SEED + k.handle).map((i, n) => zeile(i, n + 1)).join('\n') + '\n');
    console.log('Stichproben geschrieben:', kats.length, 'Dateien in', dir);
  }
  process.exit(0);
}

// Querpruefung der Fremdkoerper-Listen (jede Abteilung nennt Produkte, die "woanders hingehoeren"): steht das Produkt dort wirklich?
if (ARGS[0] === '--fremd') {
  const idx = new Map(daten.map((p, i) => [p.handle, i]));
  const zielAbt = t => /kinder|familie|partner/i.test(t) ? 'kinder' : /damen/i.test(t) ? 'damen' : /herren/i.test(t) ? 'herren' : /accessoire|kopf|mütze|handschuh|haarschmuck/i.test(t) ? 'accessoires' : /^(bekleidung|damenmode)/i.test(t) ? 'damen' : null;
  const tab = {};
  for (const f of DATEIEN) for (const e of J[f].fremdkoerper) {
    const i = idx.get(e.handle); if (i == null) { (tab[f + ' -> ?'] ||= { n: 0 }).n++; continue; }
    const ziel = zielAbt(e.gehoert_nach || '') || 'sonstige';
    const wo = proProdukt[i].map(h => katVon[h].eltern + (katVon[h].datei === 'schuhe-accessoires' ? '/sa' : ''));
    const status = wo.length ? 'steht in ' + [...new Set(wo)].sort().join('+') : 'in KEINER Kategorie';
    const key = `${f} -> ${ziel}: ${status}`;
    const e2 = (tab[key] ||= { n: 0, bsp: [] }); e2.n++; if (e2.bsp.length < 3) e2.bsp.push(daten[i].title.slice(0, 60));
  }
  for (const [k, v] of Object.entries(tab).sort()) console.log(String(v.n).padStart(4), k, v.bsp ? '| ' + v.bsp.join(' || ') : '');
  process.exit(0);
}

// ───────────── Bericht ─────────────
const K = {}; // Kennzahlen
const out = (...a) => console.log(...a);
out(`# Pruefung ${MIT_KORREKTUR ? '[MIT g_korrekturen.json: ' + Object.keys(gKorr).length + ' Produkte mit korrigierter Google-Kategorie] ' : '[Rohdaten, ohne g_korrekturen]'} ${VORHER ? '(Zustand VOR den Korrekturen: *.json.vorher)' : '(aktueller Zustand)'}${gemeinsam ? ' | Geschlecht: geschlecht_gemeinsam.mjs' : ' | Geschlecht: Funktion je Abteilung'}`);
out(`Produkte: ${daten.length} | Kategorien: ${kats.length} (${DATEIEN.map(f => f.split('-')[0] + ' ' + J[f].kategorien.length).join(', ')}) | Unterfilter: ${kats.reduce((s, k) => s + k.unterfilter.length, 0)}`);

// (1) Mehrfachzuordnung
const paarTabelle = {}; // ebene -> paar -> {n, bsp}
const ebenen = {
  datei: k => k.datei,                               // je Abteilungsdatei und Zielgruppe
  gruppe: k => k.eltern,                             // je Zielgruppe (damen/herren/kinder) ueber alle Dateien
};
K.mehrfach = {};
for (const [eb, keyF] of Object.entries(ebenen)) {
  const paare = {}; let produkte = 0;
  for (let i = 0; i < daten.length; i++) {
    const gruppen = {};
    for (const h of proProdukt[i]) { const k = katVon[h]; (gruppen[keyF(k) + (eb === 'datei' ? '/' + k.eltern : '')] ||= []).push(h); }
    let hit = false;
    for (const l of Object.values(gruppen)) if (l.length > 1) {
      hit = true;
      for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) { const key = [l[a], l[b]].sort().join(' + '); const e = (paare[key] ||= { n: 0, bsp: [] }); e.n++; if (e.bsp.length < 3) e.bsp.push(daten[i].title.slice(0, 80)); }
    }
    if (hit) produkte++;
  }
  K.mehrfach[eb] = { produkte, paare: Object.keys(paare).length };
  paarTabelle[eb] = paare;
}
out('\n## (1) Produkte in mehr als einer Blatt-Kategorie derselben Abteilung');
for (const [eb, paare] of Object.entries(paarTabelle)) {
  const bez = eb === 'datei' ? 'je Datei und Zielgruppe (damen/herren/kinder getrennt)' : 'je Zielgruppe ueber alle Dateien (Damen = Bekleidung + Schuhe/Accessoires)';
  out(`- Ebene ${bez}: ${K.mehrfach[eb].produkte} Produkte, ${K.mehrfach[eb].paare} Paare`);
  const sortiert = Object.entries(paare).sort((a, b) => b[1].n - a[1].n);
  for (const [key, e] of sortiert.slice(0, ARGS.includes('--paare') ? 999 : 12)) out(`    ${String(e.n).padStart(4)}  ${key}   z.B. ${e.bsp.map(x => '«' + x + '»').join(' | ')}`);
  if (!ARGS.includes('--paare') && sortiert.length > 12) out(`    ... und ${sortiert.length - 12} weitere Paare (--paare zeigt alle)`);
}
// Zielgruppen-Konflikt: Produkt in Kategorien verschiedener Zielgruppen (unisex-Doppelung Damen+Herren ist gewollt)
{
  let gewollt = 0, konflikt = 0; const kb = {};
  for (let i = 0; i < daten.length; i++) {
    const el = new Set(proProdukt[i].map(h => katVon[h].eltern));
    if (el.size > 1) {
      const key = [...el].sort().join('+');
      const istUnisex = key === 'damen+herren' && DATEIEN.some(f => ['unisex'].includes(genCache[f][i]));
      if (istUnisex) gewollt++; else { konflikt++; const e = (kb[key] ||= { n: 0, bsp: [] }); e.n++; if (e.bsp.length < 4) e.bsp.push(daten[i].title.slice(0, 70) + ' -> ' + proProdukt[i].join(','));}
    }
  }
  K.zielgruppen = { gewolltDamenHerrenUnisex: gewollt, konflikt, nachPaar: Object.fromEntries(Object.entries(kb).map(([k, v]) => [k, v.n])) };
  out(`- Zielgruppen-uebergreifend: ${gewollt} Unisex-Produkte stehen gewollt bei Damen UND Herren; ${konflikt} Produkte stehen in Kategorien verschiedener Zielgruppen ohne Unisex-Grund`);
  for (const [k, v] of Object.entries(kb)) { out(`    ${k}: ${v.n}`); v.bsp.forEach(x => out('       ' + x)); }
}

// (1b) die drei Geschlechtsregeln der Bekleidung gegeneinander
{
  const kl = []; daten.forEach((p, i) => { if (/^Apparel & Accessories > Clothing( >|$)/.test(p.g || '') || !p.g) kl.push(i); });
  const combo = {}; let wid = 0;
  for (const i of kl) {
    const p = daten[i]; const D = damenMod.geschlechtQuelle(p)[0], H = herrenGen.geschlecht(p), Kk = kinderMod.geschlechtQuelle(p)[0];
    if (!(D === H && ((Kk === 'kinder') === (D === 'kinder')))) { wid++; const key = `Damen:${D} Herren:${H} Kinder:${Kk}`; const e = (combo[key] ||= { n: 0, bsp: p.title.slice(0, 55) }); e.n++; }
  }
  const gem = {}; if (gemModul) for (const i of kl) { const g = gemModul.geschlechtKleidung(daten[i])[0]; gem[g] = (gem[g] || 0) + 1; }
  K.geschlechtsregeln = { kleidung: kl.length, abteilungsregeln_widersprechen_sich: wid, kombinationen: Object.fromEntries(Object.entries(combo).map(([k, v]) => [k, v.n])), gemeinsame_regel: gem };
  out(`\n## (1b) Die drei Geschlechtsregeln der Bekleidung gegeneinander (${kl.length} Kleidungsprodukte)`);
  out(`- Abteilungsregeln (Damen/Herren/Kinder einzeln): ${wid} Produkte mit uneinheitlicher Antwort`);
  for (const [k, v] of Object.entries(combo).sort((a, b) => b[1].n - a[1].n)) out(`    ${String(v.n).padStart(4)}  ${k}   z.B. «${v.bsp}»`);
  if (gemModul) out(`- Gemeinsame Regel (geschlecht_gemeinsam.mjs): ${JSON.stringify(gem)}  (konflikt muss 0 sein)`);
}

// (2) ohne Kategorie
const uni = []; const ohne = [];
for (let i = 0; i < daten.length; i++) if (imUniversum(daten[i])) { uni.push(i); if (!proProdukt[i].length) ohne.push(i); }
const GRUND_REGELN = [ // [Beschreibung, Titel-Regex, nur Google-Kategorie-Regex]
  ['Einsatzware «taktisch» (bewusst ausgeschlossen)', /taktisch|tactical/i, null],
  ['Arbeits-/Sicherheitsschuhe (eigene Collection «arbeitsschuhe»)', /arbeits|sicherheits|stahlkappe|schutzschuh|kochschuh|operations/i, /Shoes/],
  ['Rollsport (Rollschuhe, Inline-Skates, Schlittschuhe)', /roll(schuh|er)|skates?|inline|schlittschuh|wheel|heelys|rollen|einrad/i, /Shoes/],
  ['Schuhzubehör (Einlagen, Schnürsenkel, Überzüge, Socken)', /einlege|einlage|sohle|schnürsenkel|überzug|überschuh|schuhhülle|schneeschutz|socken|zehen-?trenner|schienbein|sporen/i, /Shoes|Shoe Accessories/],
  ['Schlüsselanhänger, Schlüsseletuis, Autoschlüssel-Hüllen', /schlüssel|schluessel/i, /Keychains|Handbag|Wallet/],
  ['Sport-, Foto-, Werkzeug-, Camping-, Kühl- und Motorradtaschen (keine Modetasche)', /fahrrad|velo|rad(tasche)|kamera|kühl|werkzeug|motorrad|angel|picknick|erste-hilfe|wasserflasche|thermos|camping|packsack|packsäcke|golf|gitarre|drohne|laptop-ständer|steam deck|mahjong|schiess|aufbewahrung|organizer|handy|armtasche|sportarm|lauftasche|trage(tasche|weste)|rucksattel|sattel|hecktasche|lenkertasche|kofferhülle|beutel|hundetasche|haustier|tier-?tasche|toolkit|first/i, /Handbags|Luggage/],
  ['Perücken, Fächer, Manschettenknöpfe, Krawatten, Haarzubehör (Beauty/Deko, unter 15)', /perücke|fächer|manschettenkn|fliege|haarhandtuch|haarturban|kopfband|haarklammer|stirnband|lanyard|hosenkette/i, /Wigs|Fans|Cufflinks|Neckties|Hair|Lanyards|Wallet Chains|Belt Buckles/],
  ['Kostüme, Puppenkleider, Verkleidung (keine Alltagsmode)', /kostüm|kostuem|cosplay|puppe|halloween|maskenball|stoffmasken|mönchskutte|bühnen/i, null],
];
const grund = i => {
  const p = daten[i], tg = p.tags || [];
  if (tg.includes('fortura') || /^Apparel & Accessories > Costumes/.test(p.g || '')) return 'Kostüm (Fortura: eigene Kategorien)';
  if (tg.some(t => SPERR.has(t))) return 'Sperr-Tag (bewusst ausgeschlossen)';
  const gs = DATEIEN.slice(0, 3).map(f => genCache[f][i]);
  if (/^Apparel & Accessories > Clothing( >|$)/.test(p.g || '') && gs.includes('unbekannt') && !gs.some(x => ['damen', 'herren', 'kinder'].includes(x))) return 'Kleidung ohne erkennbares Geschlecht';
  if (/Clothing( >|$)/.test(p.g || '') && (genCache['herren-bekleidung'][i] === 'partner')) return 'Partnerlook (keine Abteilung)';
  for (const [text, re, gre] of GRUND_REGELN) if (re.test(p.title) && (!gre || gre.test(p.g || ''))) return text;
  return 'keine Regel trifft (Rest)';
};
const gruende = {}; ohne.forEach(i => { const gr = grund(i); gruende[gr] = (gruende[gr] || 0) + 1; });
if (ARGS[0] === '--ohne-alle') { // alle Produkte ohne Kategorie, nach Grund und Google-Kategorie
  const nurGrund = ARGS[1];
  const gr2 = {};
  for (const i of ohne) { const gr = grund(i); if (nurGrund && !gr.startsWith(nurGrund)) continue; ((gr2[gr] ||= {})[kurzG(daten[i].g)] ||= []).push(i); }
  for (const [gr, m] of Object.entries(gr2)) {
    console.log(`\n##### ${gr}`);
    for (const [g, l] of Object.entries(m).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  [${g}] ${l.length}`);
      for (const i of l) console.log(`    ${daten[i].handle.slice(0, 16)}\t${daten[i].title.slice(0, 100)}\t{${genCache['damen-bekleidung'][i]}/${genCache['herren-bekleidung'][i]}/${genCache['kinder-baby-bekleidung'][i]}|sa:${genCache['schuhe-accessoires'][i]}}`);
    }
  }
  process.exit(0);
}
K.ohneKategorie = { universum: uni.length, ohne: ohne.length, gruende };
out(`\n## (2) Produkte ohne jede Kategorie`);
out(`Mode-Universum (Kleidung, Schuhe, Taschen, Accessoires, Gepaeck): ${uni.length} | ohne Kategorie: ${ohne.length} (${(100 * ohne.length / uni.length).toFixed(1)} %)`);
out('Gruende:', JSON.stringify(gruende));
const nachG = {};
for (const i of ohne) { const g = kurzG(daten[i].g).split(' > ').slice(0, 3).join(' > '); (nachG[g] ||= []).push(i); }
const nBsp = +(argVal('--luecken') || 30);
out(`Beispiele (${nBsp} zufaellig, nach Google-Kategorie gruppiert), Gesamtverteilung: ` + Object.entries(nachG).sort((a, b) => b[1].length - a[1].length).map(([g, l]) => `${g} ${l.length}`).join(' | '));
const bspIdx = stichprobe(ohne.filter(i => grund(i) === 'keine Regel trifft (Rest)' || ARGS.includes('--luecken')), nBsp, 'luecken:' + (VORHER ? 'v' : 'n'));
const bspGr = {}; bspIdx.forEach(i => { const g = kurzG(daten[i].g); (bspGr[g] ||= []).push(i); });
for (const [g, l] of Object.entries(bspGr).sort()) { out(`  [${g}]`); l.forEach(i => out(`     ${daten[i].title.slice(0, 95)}  {${DATEIEN.slice(0, 3).map(f => genCache[f][i]).join('/')}|sa:${genCache['schuhe-accessoires'][i]}}${(daten[i].tags || []).some(t => SPERR.has(t)) ? ' SPERR' : ''}`)); }

// (3) unter 15
const klein = kats.filter(k => mem.get(k.handle).length < 15).map(k => `${k.handle} (${mem.get(k.handle).length})`);
const kleinUf = [];
for (const k of kats) for (const u of k.unterfilter) { const n = mem.get(k.handle).filter(i => imUnterfilter(u, daten[i])).length; if (n < 15) kleinUf.push(`${u.handle} (${n})`); }
K.klein = { kategorien: klein, unterfilter: kleinUf };
out(`\n## (3) Kategorien unter 15 Produkten: ${klein.length}${klein.length ? ' -> ' + klein.join(', ') : ''}`);
out(`    Unterfilter unter 15: ${kleinUf.length}${kleinUf.length ? ' -> ' + kleinUf.join(', ') : ''}`);

// (4) Handle-Kollisionen
const altMitglieder = c => altMitgliederKern(c, daten);
const vorh = new Map(vorhandene.map(c => [c.handle, c]));
const kollis = [];
const alleHandles = new Map();
for (const k of kats) {
  for (const [h, art, l, titel] of [[k.handle, 'Kategorie', mem.get(k.handle), k.titel], ...k.unterfilter.map(u => [u.handle, 'Unterfilter', mem.get(k.handle).filter(i => imUnterfilter(u, daten[i])), u.titel])]) {
    (alleHandles.get(h) || alleHandles.set(h, []).get(h)).push(art + ' in ' + k.handle);
    const c = vorh.get(h);
    if (!c) continue;
    const alt = altMitglieder(c);
    const sNeu = new Set(l);
    let schnitt = null, nurAlt = null, nurNeu = null;
    if (alt) { const sAlt = new Set(alt); schnitt = alt.filter(i => sNeu.has(i)).length; nurAlt = alt.length - schnitt; nurNeu = l.length - schnitt; }
    kollis.push({ handle: h, art, neuTitel: titel, neuN: l.length, altTitel: c.titel, altN: c.n, altRegel: String(c.regeln).slice(0, 110), altAuswertbar: !!alt, altInDaten: alt ? alt.length : null, schnitt, nurAlt, nurNeu });
  }
}
const doppelt = [...alleHandles.entries()].filter(([, v]) => v.length > 1);
K.kollisionen = { anzahl: kollis.length, handles: kollis.map(c => c.handle), doppeltInNeu: doppelt.map(([h, v]) => h) };
out(`\n## (4) Handle-Kollisionen mit /tmp/vorhandene_collections.json: ${kollis.length}; doppelte Handles innerhalb der neuen Taxonomie: ${doppelt.length}`);
for (const c of kollis) out(`  ${c.handle} [${c.art}] NEU «${c.neuTitel}» ${c.neuN} Produkte (im Datensatz)  <->  ALT «${c.altTitel}» n=${c.altN}${c.altAuswertbar ? `, im Datensatz ${c.altInDaten}, gemeinsam ${c.schnitt}, nur alt ${c.nurAlt}, nur neu ${c.nurNeu}` : ' (Regel nicht lokal auswertbar)'}\n        alte Regel: ${c.altRegel}`);
for (const [h, v] of doppelt) out('  DOPPELT:', h, v.join(' | '));

// ───────────── Zusammenfassung je Kategorie ─────────────
out('\n## Treffer je Kategorie');
for (const f of DATEIEN) {
  out(`# ${f}`);
  out(J[f].kategorien.map(k => `${k.handle}:${mem.get(k.handle).length}`).join('  '));
}
// ───────────── Datei-Ausgaben ─────────────
if (ARGS.includes('--dump')) { // Arbeitsdatei fuer Zusatzpruefungen: Produkt -> Kategorien
  const o = {}; daten.forEach((p, i) => { if (proProdukt[i].length) o[p.handle] = proProdukt[i]; });
  fs.writeFileSync(path.join(HERE, '_zuordnung_tmp.json'), JSON.stringify(o)); out('\nArbeitsdatei _zuordnung_tmp.json:', Object.keys(o).length, 'Produkte');
}
const jf = argVal('--json');
if (jf) { fs.writeFileSync(jf, JSON.stringify(K, null, 1)); out('\nKennzahlen geschrieben:', jf); }

if (ARGS.includes('--alles')) await import('./alles_bauen.mjs');
