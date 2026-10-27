// Tests des Menü-Umbaus «Schmuck» (lib/schmuck_menue.mjs), der Gruppen-Sammlungen (schmuck_gruppen.mjs) und des Menü-Laufs (schmuck_menue.mjs).
// Das Test-Menü ist das echte Hauptmenü vom 27.10.2026 (dropship/taxonomie-2610-b/orakel/menue-main-2710.json, 18 Punkte, 3 Ebenen, HTTP- und Collection-Ziele).
// Netz gibt es nicht: die Läufe sprechen mit einer Attrappe der Shopify-Abfrage. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
import { readFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AESTE, KURZ, MAX_TITEL, alleHandles, neueHandles, planTitel, menueTitel, tagVon, kategorieVon, gruppenPlan, gleicheRegel, schmuckMenue, ohneSchmuckKinder, pruefeSchmuck, titelWarnungen, PFAD } from './schmuck_menue.mjs';
import { SCHMUCK, bereichAuswahl } from './bereich_taxonomie.mjs';
import { eingabeAus } from '../menu_eintrag_einfuegen.mjs';
import { tiefe, suche } from './menue_plan.mjs';
import { menueLauf } from '../schmuck_menue.mjs';
import { gruppenLauf, kindTagStimmt } from '../schmuck_gruppen.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const lies = n => JSON.parse(readFileSync(new URL(`../../dropship/taxonomie-2610-b/orakel/${n}`, import.meta.url)));
const kopie = x => JSON.parse(JSON.stringify(x));

const MENU_ROH = lies('menue-main-2710.json').menu;
const SHOP = lies('collections-2710.json');
const MENU = eingabeAus(MENU_ROH.items);
const GID = h => 'gid://shopify/Collection/test-' + h;
const ALLE = Object.fromEntries(alleHandles().map(h => [h, GID(h)]));
const { B } = bereichAuswahl();
const KAT = SCHMUCK.filter(k => !k.filter);
const titel = l => l.map(x => x.title);
const schmuckAst = b => suche(b, PFAD).items;

// ── Der Auftrag, wörtlich (Besitzer-Auftrag 27.10.2026): Köpfe mit Ziel, darunter die Kinder ──
const SPEC = [
  ['Ringe', 'sub-ringe', ['silberringe', 'edelstahl-titanringe', 'moissanit-ringe', 'edelstein-geburtsstein-ringe', 'zirkonia-strassringe', 'ringsets-stapelringe', 'verstellbare-offene-ringe']],
  ['Ohrringe', 'sub-ohrringe', ['ohrstecker', 'ohrhaenger-tropfenohrringe', 'creolen-ohrclips', 'silber-ohrringe', 'perlen-ohrringe', 'zirkonia-strass-ohrringe']],
  ['Halsketten & Anhänger', 'halsketten-alle', ['perlenketten', 'choker-layering-ketten', 'glieder-hiphop-ketten', 'ketten-mit-anhaenger', 'silberketten', 'edelstahl-titanketten', 'zirkonia-moissanit-ketten']],
  ['Armbänder & Armreifen', 'sub-armbaender', ['armreifen-bangles', 'lederarmbaender', 'perlen-edelsteinarmbaender', 'gliederarmbaender', 'kupfer-magnetarmbaender', 'geflochtene-wickelarmbaender', 'silberarmbaender', 'edelstahl-titanarmbaender', 'vergoldete-armbaender', 'zirkonia-strassarmbaender']],
  ['Für Herren', 'schmuck-herren-gruppe', ['herrenringe', 'herrenarmbaender']],
  ['Gravur & Namen', 'schmuck-personalisiert-gruppe', ['personalisierte-ringe', 'personalisierte-armbaender', 'personalisierte-ketten']],
  ['Motive', 'schmuck-motiv-gruppe', ['herz-schmuck', 'blumen-schmetterlingsschmuck', 'stern-mond-schmuck', 'tier-schmuck', 'gluecks-schutzschmuck', 'kreuz-schmuck']],
  ['Stile', 'schmuck-stil-gruppe', ['minimalistischer-schmuck', 'vintage-retro-schmuck', 'boho-ethno-schmuck', 'punk-gothic-schmuck', 'geometrischer-schmuck', 'korea-frankreich-oldmoney-schmuck']],
  ['Sets & Besonderes', 'schmuck-sets-gruppe', ['schmuck-sets', 'kombisets-kette-armband-ohrringe', 'broschen-pins', 'koerper-fussschmuck', 'premium-schmuck']],
  ['Zubehör', 'schmuck-zubehoer-gruppe', ['schmuck-selbermachen', 'schluessel-taschenanhaenger', 'schmuckaufbewahrung', 'sonnenbrillen-alle']],
];
ist('zehn Köpfe mit Ziel und Kindern in der Reihenfolge des Auftrags', AESTE.map(a => [a.titel, a.kopf, a.kinder]), SPEC);
ist('56 Kinder, 66 verschiedene Handles (kein Handle zweimal)', [AESTE.reduce((n, a) => n + a.kinder.length, 0), alleHandles().length], [56, 66]);
ist('kein Kopf ist zugleich Kind eines Astes', AESTE.filter(a => AESTE.some(b => b.kinder.includes(a.kopf))).map(a => a.kopf), []);
ist('keine Uhr im Menü (kein Handle mit «uhr», herrenuhren nicht dabei)', alleHandles().filter(h => /uhr/.test(h)), []);
ist('«Halsketten» (sub-halsketten) entfällt zugunsten von halsketten-alle', alleHandles().includes('sub-halsketten'), false);
ist('genau die sechs Köpfe ohne eigene Kategorie tragen eine Gruppen-Sammlung', AESTE.filter(a => a.gruppe).map(a => a.kopf), ['schmuck-herren-gruppe', 'schmuck-personalisiert-gruppe', 'schmuck-motiv-gruppe', 'schmuck-stil-gruppe', 'schmuck-sets-gruppe', 'schmuck-zubehoer-gruppe']);
ist('die Gruppen-Köpfe heissen wie die Gruppen der Bereichsdatei', AESTE.filter(a => a.gruppe).every(a => B.gruppen.some(g => g.handle === a.kopf)), true);

// ── Menü und Bereichsdatei passen zusammen (fängt vertauschte Köpfe und Kinder) ──
const GRUPPEN_JE_AST = { Ringe: ['ringe-gruppe', 'ringe-form-gruppe'], Ohrringe: ['ohrringe-gruppe', 'ohrringe-material-gruppe'], 'Halsketten & Anhänger': ['ketten-gruppe', 'ketten-material-gruppe'],
  'Armbänder & Armreifen': ['armbaender-gruppe', 'armbaender-material-gruppe'], 'Für Herren': ['schmuck-herren-gruppe'], 'Gravur & Namen': ['schmuck-personalisiert-gruppe'], Motive: ['schmuck-motiv-gruppe'],
  Stile: ['schmuck-stil-gruppe'], 'Sets & Besonderes': ['schmuck-sets-gruppe'], Zubehör: ['schmuck-zubehoer-gruppe'] };
const AUSNAHME = { 'Für Herren': { ohne: ['herrenuhren'] }, Zubehör: { dazu: ['sonnenbrillen-alle'] } };
for (const a of AESTE) {
  const ausJson = GRUPPEN_JE_AST[a.titel].flatMap(h => B.gruppen.find(g => g.handle === h).kinder);
  const erwartet = [...new Set([...ausJson.filter(h => !(AUSNAHME[a.titel]?.ohne || []).includes(h)), ...(AUSNAHME[a.titel]?.dazu || [])])].sort();
  const ist_ = [...new Set([a.kopf, ...a.kinder])].sort();
  const mitKopf = a.gruppe ? erwartet.concat(a.kopf).sort() : erwartet;
  ist(`Ast «${a.titel}»: Kopf und Kinder = Gruppen der Bereichsdatei (Ausnahmen: herrenuhren raus, Sonnenbrillen dazu)`, ist_, mitKopf);
}
ist('Köpfe mit eigener Kategorie liegen in den Gruppen ihres Astes (sub-ringe, sub-ohrringe, halsketten-alle, sub-armbaender)', AESTE.filter(a => !a.gruppe).every(a => GRUPPEN_JE_AST[a.titel].some(h => B.gruppen.find(g => g.handle === h).kinder.includes(a.kopf))), true);
ist('Gegenprobe: ein vertauschter Kopf (Ohrringe zeigt auf sub-ringe) wäre in den Gruppen des Astes nicht zu finden', GRUPPEN_JE_AST.Ohrringe.some(h => B.gruppen.find(g => g.handle === h).kinder.includes('sub-ringe')), false);

// ── Alle Ziele existieren: Taxonomie oder vorhandene Collection oder eine der sechs Gruppen-Sammlungen ──
const imShop = new Set(SHOP.handles), taxonomie = new Set(KAT.map(k => k.handle)), gruppenKoepfe = new Set(AESTE.filter(a => a.gruppe).map(a => a.kopf));
ist('jedes Ziel ist eine Kategorie der Taxonomie, eine vorhandene Collection oder eine Gruppen-Sammlung', alleHandles().filter(h => !taxonomie.has(h) && !imShop.has(h) && !gruppenKoepfe.has(h)), []);
ist('Gegenprobe: ein erfundenes Ziel würde auffallen', ['erfunden-schmuck'].filter(h => !taxonomie.has(h) && !imShop.has(h) && !gruppenKoepfe.has(h)), ['erfunden-schmuck']);
ist('alle 51 Kategorien der Taxonomie stehen im Menü', KAT.filter(k => !alleHandles().includes(k.handle)).map(k => k.handle), []);
ist('im Shop vorhanden sind 9 der 66 Ziele', alleHandles().filter(h => imShop.has(h)).sort(), ['broschen-pins', 'koerper-fussschmuck', 'premium-schmuck', 'schmuck-sets', 'schmuckaufbewahrung', 'sonnenbrillen-alle', 'sub-armbaender', 'sub-ohrringe', 'sub-ringe']);
ist('neu anzulegen sind 57 Collections: 51 Kategorien und 6 Gruppen-Sammlungen', alleHandles().filter(h => !imShop.has(h)).length, 57);
ist('neueHandles(): die Taxonomie-Kategorien im Menü', neueHandles().sort(), KAT.map(k => k.handle).sort());

// ── Titel ──
const kurzTitel = h => menueTitel(h, undefined);
ist('Menütitel höchstens 34 Zeichen (Köpfe und Kinder)', [...AESTE.map(a => a.titel), ...alleHandles().map(kurzTitel)].filter(t => t.length > MAX_TITEL), []);
ist('gekürzt werden genau die zwei Taxonomie-Titel über 34 Zeichen', KAT.filter(k => k.titel.length > MAX_TITEL).map(k => k.handle).sort(), ['kombisets-kette-armband-ohrringe', 'korea-frankreich-oldmoney-schmuck']);
ist('…und jede Kurzfassung ist kürzer als der Seitentitel', Object.entries(KURZ).filter(([h, t]) => t.length >= planTitel(h).length).map(([h]) => h), []);
ist('Kurztitel: Korea/Frankreich/Old Money, Kombi-Sets', [KURZ['korea-frankreich-oldmoney-schmuck'], KURZ['kombisets-kette-armband-ohrringe']], ['Korea, Frankreich & Old Money', 'Kette-Armband-Ohrring-Sets']);
ist('«Sonnenbrillen (alle)» heisst im Menü «Sonnenbrillen»', menueTitel('sonnenbrillen-alle', 'Sonnenbrillen (alle)'), 'Sonnenbrillen');
ist('ein Titel aus dem Shop gilt, wenn es keine Kurzfassung gibt', [menueTitel('sub-ringe', 'Ringe'), menueTitel('silberringe', undefined)], ['Ringe', 'Silberringe']);
ist('kein ß in Menütiteln', alleHandles().map(kurzTitel).concat(AESTE.map(a => a.titel)).filter(t => /ß/.test(t)), []);

// ── Tags der Kinder ──
ist('neue Kategorien tragen das Tag sort-<handle>', KAT.filter(k => tagVon(k.handle) !== 'sort-' + k.handle).map(k => k.handle), []);
const VORHANDEN_MIT_REGEL = ['sub-ringe', 'sub-ohrringe', 'sub-armbaender', 'schmuck-sets', 'broschen-pins', 'koerper-fussschmuck', 'schmuckaufbewahrung', 'sonnenbrillen-alle'];
ist('vorhandene Kinder: das Tag der Engine ist genau die Regel der Collection im Shop (TAG EQUALS …)', VORHANDEN_MIT_REGEL.filter(h => SHOP.schmuck[h].regeln !== `TAG EQUALS ${tagVon(h)}`), []);
ist('Tags der vorhandenen Kinder', VORHANDEN_MIT_REGEL.map(tagVon), ['sort-ringe', 'sort-ohrringe', 'sort-armbaender', 'sort-schmucksets', 'sort-broschen', 'sort-koerperschmuck', 'sort-schmuckaufbewahrung', 'sort-sonnenbrillen-alle']);
ist('premium-schmuck ist manuell: kein Tag, keine Regel im Shop', [tagVon('premium-schmuck'), SHOP.schmuck['premium-schmuck'].regeln, kategorieVon('premium-schmuck')], [null, 'manuell', undefined]);
ist('Gegenprobe: die Alt-Collection sub-halsketten hat ein anderes Tag (sort-halsketten) als halsketten-alle', [tagVon('sub-halsketten'), tagVon('halsketten-alle')], ['sort-halsketten', 'sort-halsketten-alle']);

// ── Gruppen-Sammlungen ──
const GP = gruppenPlan();
ist('sechs Gruppen-Sammlungen', GP.map(g => g.handle), ['schmuck-herren-gruppe', 'schmuck-personalisiert-gruppe', 'schmuck-motiv-gruppe', 'schmuck-stil-gruppe', 'schmuck-sets-gruppe', 'schmuck-zubehoer-gruppe']);
ist('Regel: ODER über TAG EQUALS je Kind', GP.every(g => g.regel.appliedDisjunctively === true && g.regel.rules.every(r => r.column === 'TAG' && r.relation === 'EQUALS')), true);
ist('Zahl der Tag-Regeln je Gruppe (Sets: premium-schmuck hat kein Tag)', GP.map(g => g.regel.rules.length), [2, 3, 6, 6, 4, 4]);
ist('Tag-Regeln der Gruppe «Für Herren»', GP[0].regel.rules.map(r => r.condition), ['sort-herrenringe', 'sort-herrenarmbaender']);
ist('Tag-Regeln der Gruppe «Sets & Besonderes» (vorhandene Tags für schmuck-sets, broschen-pins, koerper-fussschmuck)', GP[4].regel.rules.map(r => r.condition), ['sort-schmucksets', 'sort-kombisets-kette-armband-ohrringe', 'sort-broschen', 'sort-koerperschmuck']);
ist('Tag-Regeln der Gruppe «Zubehör» (mit Sonnenbrillen)', GP[5].regel.rules.map(r => r.condition), ['sort-schmuck-selbermachen', 'sort-schluessel-taschenanhaenger', 'sort-schmuckaufbewahrung', 'sort-sonnenbrillen-alle']);
ist('ohne Tag nur premium-schmuck', GP.flatMap(g => g.ohneTag), ['premium-schmuck']);
ist('Kinder der Gruppen = Kinder im Menü', GP.map(g => g.kinder.map(k => k.handle)), AESTE.filter(a => a.gruppe).map(a => a.kinder));
ist('alle Tags der Regeln: sort-, a-z0-9-, keines doppelt, keines aus einem anderen Ast', GP.every(g => g.regel.rules.every(r => /^sort-[a-z0-9-]+$/.test(r.condition)) && new Set(g.regel.rules.map(r => r.condition)).size === g.regel.rules.length), true);
ist('Gegenprobe: das Herz-Tag steht nicht in der Herren-Gruppe, das Herren-Tag nicht in der Motiv-Gruppe', [GP[0].regel.rules.some(r => r.condition === 'sort-herz-schmuck'), GP[2].regel.rules.some(r => r.condition === 'sort-herrenringe')], [false, false]);
ist('Titel der Sammlungen = Gruppentitel der Bereichsdatei', GP.every(g => g.titel === B.gruppen.find(x => x.handle === g.handle).titel), true);
ist('Sammlungs-Texte: kein ß, kein Sie, SEO höchstens 160 Zeichen, Beschreibung mit Punkt', GP.filter(g => /ß|\b(Sie|Ihr|Ihre)\b/.test(g.titel + g.beschreibung + g.seoBeschreibung) || g.seoBeschreibung.length > 160 || !/\.$/.test(g.beschreibung)).map(g => g.handle), []);
ist('Handles der Sammlungen nur a-z, 0-9, Bindestrich und im Shop frei', GP.filter(g => !/^[a-z0-9-]+$/.test(g.handle) || imShop.has(g.handle)).map(g => g.handle), []);
ist('gleicheRegel: dieselbe Regel in anderer Reihenfolge ist gleich', gleicheRegel({ appliedDisjunctively: true, rules: [...GP[0].regel.rules].reverse() }, GP[0].regel), true);
ist('gleicheRegel: UND statt ODER ist nicht gleich', gleicheRegel({ appliedDisjunctively: false, rules: GP[0].regel.rules }, GP[0].regel), false);
ist('gleicheRegel: ein anderes Tag ist nicht gleich; manuell (null) ist nicht gleich', [gleicheRegel({ appliedDisjunctively: true, rules: [GP[0].regel.rules[0], { column: 'TAG', relation: 'EQUALS', condition: 'sort-x' }] }, GP[0].regel), gleicheRegel(null, GP[0].regel)], [false, false]);
ist('kindTagStimmt: genau eine Regel TAG EQUALS <tag>', [kindTagStimmt({ ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'sort-ringe' }] } }, 'sort-ringe'), kindTagStimmt({ ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'sort-ringe' }] } }, 'sort-ringe'), kindTagStimmt({ ruleSet: null }, 'sort-ringe'), kindTagStimmt(null, 'sort-ringe')], [true, false, false, false]);

// ── Der Umbau mit allen Collections ──
const { baum, log, fehlend } = schmuckMenue(MENU, ALLE);
ist('Schmuck > …: zehn Köpfe in der Reihenfolge des Auftrags', titel(schmuckAst(baum)), SPEC.map(s => s[0]));
ist('Kinder je Kopf', schmuckAst(baum).map(k => k.items.length), SPEC.map(s => s[2].length));
ist('Kinder je Kopf in der Reihenfolge des Auftrags', schmuckAst(baum).map(k => k.items.map(x => x.resourceId)), SPEC.map(s => s[2].map(GID)));
ist('Köpfe zeigen auf das Ziel des Auftrags', schmuckAst(baum).map(k => k.resourceId), SPEC.map(s => GID(s[1])));
ist('Kindertitel = Titel der Collection (gekürzt: Old Money, Kombi-Sets, Sonnenbrillen)', [schmuckAst(baum)[7].items[5].title, schmuckAst(baum)[8].items[1].title, schmuckAst(baum)[9].items[3].title], ['Korea, Frankreich & Old Money', 'Kette-Armband-Ohrring-Sets', 'Sonnenbrillen']);
ist('höchstens 3 Ebenen', tiefe(baum), 3);
ist('Prüfung: sauber', pruefeSchmuck(MENU, baum), []);
ist('nichts fehlt, Log zählt zehn neue Köpfe und zehn entfernte alte', [fehlend, log.filter(z => z.startsWith('neu ')).length, log.filter(z => z.startsWith('entfernt')).length], [[], 10, 10]);
ist('alle Ziele im Ast sind Collections mit resourceId, ohne Adresse', (() => { const a = []; (function lauf(l) { for (const i of l) { a.push(i); lauf(i.items); } })(schmuckAst(baum)); return a.every(i => i.type === 'COLLECTION' && i.resourceId && !i.url && !i.id); })(), true);
ist('keine Dopplung der Ziele im ganzen Ast', (() => { const z = []; (function lauf(l) { for (const i of l) { z.push(i.resourceId); lauf(i.items); } })(schmuckAst(baum)); return z.length - new Set(z).size; })(), 0);
ist('der übrige Baum ist vorher und nachher gleich (ohne die Kinder von «Schmuck»)', JSON.stringify(ohneSchmuckKinder(MENU)) === JSON.stringify(ohneSchmuckKinder(baum)), true);
ist('der Punkt «Schmuck» selbst (Id, Titel, Typ, Ziel) bleibt', (({ id, title, type, resourceId, url }) => JSON.stringify({ id, title, type, resourceId, url }))(suche(baum, PFAD)), (({ id, title, type, resourceId, url }) => JSON.stringify({ id, title, type, resourceId, url }))(suche(MENU, PFAD)));
ist('«Uhren» bleibt als eigener oberster Punkt mit allen Kindern unverändert', JSON.stringify(baum.find(x => x.title === 'Uhren')), JSON.stringify(MENU.find(x => x.title === 'Uhren')));
ist('Gegenprobe: «Uhren» hatte vorher Kinder', MENU.find(x => x.title === 'Uhren').items.length > 0, true);
ist('oberste Ebene (18 Punkte) unverändert', [titel(baum).length, JSON.stringify(titel(baum)) === JSON.stringify(titel(MENU))], [18, true]);
ist('die alten zehn Kinder von «Schmuck» sind weg (ihre Ids kommen nicht mehr vor)', suche(MENU, PFAD).items.map(i => i.id).filter(id => JSON.stringify(baum).includes(id)), []);
ist('Gegenprobe: vorher hingen zehn Kinder unter «Schmuck»', suche(MENU, PFAD).items.length, 10);
ist('der Eingabebaum wird nicht verändert', JSON.stringify(MENU) === JSON.stringify(eingabeAus(MENU_ROH.items)), true);
const strip = x => ({ title: x.title, type: x.type, resourceId: x.resourceId, items: (x.items || []).map(strip) });
ist('zweiter Lauf auf dem fertigen Baum ändert nichts (Reihenfolge, Ziele, Titel)', JSON.stringify(schmuckMenue(baum, ALLE).baum.map(strip)) === JSON.stringify(baum.map(strip)), true);

// ── Fehlende Collections ──
{
  const r1 = schmuckMenue(MENU, { ...ALLE, silberringe: null });
  ist('fehlendes Kind: Eintrag entfällt, Rest bleibt, gemeldet', [schmuckAst(r1.baum)[0].items.length, r1.fehlend, r1.log.some(z => z.startsWith('fehlt') && z.includes('silberringe'))], [6, ['silberringe'], true]);
  const r2 = schmuckMenue(MENU, { ...ALLE, 'sub-ringe': null });
  ist('fehlendes Ziel eines Kopfes: der Ast entfällt samt Kindern', [titel(schmuckAst(r2.baum)).includes('Ringe'), schmuckAst(r2.baum).length, r2.fehlend], [false, 9, ['sub-ringe']]);
  ist('…und die Kinder des entfallenen Astes hängen nirgends sonst', JSON.stringify(r2.baum).includes(GID('silberringe')), false);
  ist('…die Prüfung bleibt trotzdem sauber', pruefeSchmuck(MENU, r2.baum), []);
  const r3 = schmuckMenue(MENU, {});
  ist('keine einzige Collection vorhanden: «Schmuck» bleibt ohne Kinder, 66 fehlen, Prüfung sauber', [schmuckAst(r3.baum).length, r3.fehlend.length, pruefeSchmuck(MENU, r3.baum)], [0, 66, []]);
  const r4 = schmuckMenue(MENU.filter(x => x.title !== 'Schmuck'), ALLE);
  ist('fehlt der Punkt «Schmuck», wird nichts geändert und gemeldet', [JSON.stringify(r4.baum) === JSON.stringify(MENU.filter(x => x.title !== 'Schmuck')), r4.log.some(z => z.startsWith('ÜBERSPRUNGEN'))], [true, true]);
  // Ist-Stand des Shops heute: nur 9 Ziele existieren
  const heute = Object.fromEntries(alleHandles().map(h => [h, imShop.has(h) ? GID(h) : null]));
  const r5 = schmuckMenue(MENU, heute);
  ist('Ist-Stand 27.10.: nur drei leere Köpfe (Ringe, Ohrringe, Armbänder) blieben übrig - ein LIVE-Lauf jetzt wäre ein Rückschritt', [titel(schmuckAst(r5.baum)), schmuckAst(r5.baum).map(k => k.items.length)], [['Ringe', 'Ohrringe', 'Armbänder & Armreifen'], [0, 0, 0]]);
}

// ── Prüfer: jede Regel von beiden Seiten ──
const mut = f => { const b = kopie(baum); f(b); return b; };
const hat = (fehler, teil) => fehler.some(f => f.includes(teil));
ist('Prüfer: vier Ebenen', hat(pruefeSchmuck(MENU, mut(b => { schmuckAst(b)[0].items[0].items = [{ title: 'vierte Ebene', type: 'COLLECTION', resourceId: 'gid://x/1', items: [] }]; })), 'Ebenen'), true);
ist('Prüfer: doppeltes Ziel unter einem Kopf', hat(pruefeSchmuck(MENU, mut(b => { const k = schmuckAst(b)[0].items; k.push({ ...k[0], title: 'Silberringe zweimal' }); })), 'doppeltes Ziel'), true);
ist('Prüfer: doppelter Titel unter einem Kopf', hat(pruefeSchmuck(MENU, mut(b => { const k = schmuckAst(b)[0].items; k.push({ ...k[0], resourceId: 'gid://x/2' }); })), 'doppelter Titel'), true);
ist('Prüfer: Kopf ist zugleich sein eigenes Kind', hat(pruefeSchmuck(MENU, mut(b => { const a = schmuckAst(b)[0]; a.items[0].resourceId = a.resourceId; })), 'eigenes Kind'), true);
ist('Prüfer: ein HTTP-Ziel statt einer Collection', hat(pruefeSchmuck(MENU, mut(b => { const k = schmuckAst(b)[0].items[0]; k.type = 'HTTP'; k.url = '/collections/x'; delete k.resourceId; })), 'keine Collection'), true);
ist('Prüfer: eine Collection ohne resourceId', hat(pruefeSchmuck(MENU, mut(b => { delete schmuckAst(b)[0].items[0].resourceId; })), 'ohne resourceId'), true);
ist('Prüfer: ein Kind von «Uhren» verändert', hat(pruefeSchmuck(MENU, mut(b => { b.find(x => x.title === 'Uhren').items[0].title += ' neu'; })), 'ausserhalb'), true);
ist('Prüfer: ein fremder Ast (Damen) verändert', hat(pruefeSchmuck(MENU, mut(b => { b.find(x => x.title === 'Damen').items.pop(); })), 'ausserhalb'), true);
ist('Prüfer: der Punkt «Schmuck» selbst umbenannt', hat(pruefeSchmuck(MENU, mut(b => { suche(b, PFAD).title = 'Schmuck & Uhren'; })), 'Schmuck'), true);
ist('Prüfer: oberste Ebene - Uhren entfernt', hat(pruefeSchmuck(MENU, baum.filter(x => x.title !== 'Uhren')), 'oberste Ebene'), true);
ist('Prüfer: oberste Ebene - Reihenfolge getauscht', hat(pruefeSchmuck(MENU, [baum[1], baum[0], ...baum.slice(2)]), 'oberste Ebene'), true);
ist('Prüfer: «Schmuck» fehlt ganz', hat(pruefeSchmuck(MENU, baum.filter(x => x.title !== 'Schmuck')), 'oberste Ebene'), true);
ist('Titel-Hinweis: ein Menütitel über 34 Zeichen wird gemeldet, ein kurzer nicht', [titelWarnungen(mut(b => { schmuckAst(b)[0].items[0].title = 'Ein sehr langer Menütitel über vierunddreissig Zeichen'; })).length, titelWarnungen(baum).length], [1, 0]);

// ── Die Läufe mit einer Attrappe der Shopify-Abfrage ──
const TMP = mkdtempSync(join(tmpdir(), 'schmuck-test-'));
function attrappe({ collections = {}, kanaele = [{ isPublished: true, publication: { id: 'gid://pub/1', name: 'Online Store' } }], menuUpdateFehler = [], verfaelsche = false } = {}) {
  const z = { menu: kopie(MENU_ROH), collections: kopie(collections), n: 0, pub: {} };
  const aufrufe = [];
  const lesbar = items => items.map(i => ({ id: i.id || `gid://shopify/MenuItem/neu-${++z.n}`, title: i.title, type: i.type, resourceId: i.resourceId ?? null, url: i.url ?? (i.type === 'COLLECTION' ? '/collections/x' : null), tags: i.tags || [], items: lesbar(i.items || []) }));
  const q = async (query, v = {}) => {
    aufrufe.push({ query, v: kopie(v) });
    if (/menus\(first/.test(query)) return { menus: { nodes: [kopie(z.menu)] } };
    if (/menuUpdate/.test(query)) {
      if (menuUpdateFehler.length) return { menuUpdate: { menu: null, userErrors: menuUpdateFehler } };
      z.menu = { ...z.menu, items: lesbar(v.i) };
      if (verfaelsche) z.menu.items.find(x => x.title === 'Schmuck').items[0].items.pop();
      return { menuUpdate: { menu: { id: z.menu.id }, userErrors: [] } };
    }
    if (/collectionByHandle\(handle:"hype-jetzt"\)/.test(query)) return { collectionByHandle: { resourcePublicationsV2: { nodes: kanaele } } };
    if (/collectionByHandle\(handle:\$h\)/.test(query)) { const c = z.collections[v.h]; return { collectionByHandle: c ? kopie(c) : null }; }
    if (/collectionCreate/.test(query)) {
      const i = v.i, id = `gid://shopify/Collection/neu-${++z.n}`;
      z.collections[i.handle] = { id, title: i.title, productsCount: { count: 0 }, ruleSet: i.ruleSet };
      return { collectionCreate: { collection: { id, handle: i.handle }, userErrors: [] } };
    }
    if (/publishablePublish/.test(query)) { z.pub[v.id] = (z.pub[v.id] || []).concat(v.i.map(x => x.publicationId)); return { publishablePublish: { userErrors: [] } }; }
    if (/collection\(id:\$id\)\{resourcePublicationsV2/.test(query)) return { collection: { resourcePublicationsV2: { nodes: (z.pub[v.id] || []).map(id => ({ isPublished: true, publication: { id, name: id } })) } } };
    if (/collection\(id:\$id\)\{productsCount/.test(query)) return { collection: { productsCount: { count: 7 } } };
    throw new Error('unerwartete Abfrage: ' + query.slice(0, 90));
  };
  const schreibend = () => aufrufe.filter(a => /mutation/.test(a.query));
  return { q, aufrufe, z, schreibend };
}
const sammlung = h => ({ id: GID(h), title: planTitel(h) });
const ALLE_COLL = Object.fromEntries(alleHandles().map(h => [h, sammlung(h)]));
const ruleSetAus = regeln => regeln === 'manuell' ? null : { appliedDisjunctively: false, rules: regeln.split(' UND ').map(r => { const [column, relation, ...c] = r.split(' '); return { column, relation, condition: c.join(' ') }; }) };
const SHOP_COLL = Object.fromEntries(alleHandles().filter(h => imShop.has(h)).map(h => [h, { id: GID(h), title: SHOP.schmuck[h].titel, productsCount: { count: SHOP.schmuck[h].produkte }, ruleSet: ruleSetAus(SHOP.schmuck[h].regeln) }]));
const still = () => { const zeilen = []; return { zeilen, out: (...a) => zeilen.push(a.join(' ')), err: (...a) => zeilen.push('ERR ' + a.join(' ')) }; };
const dateien = n => ({ sicherung: join(TMP, n, 'menu-sicherung', 'vor-schmuck.json'), ledger: join(TMP, n, 'ledger.txt') });
const frisch = n => { mkdirSync(join(TMP, n), { recursive: true }); return dateien(n); };

// Menü-Lauf: Trockenlauf
{
  const a = attrappe({ collections: SHOP_COLL }), s = still(), d = frisch('m1');
  const r = await menueLauf(a.q, { live: false, ...d, out: s.out, err: s.err });
  ist('Menü-Trockenlauf (Ist-Stand): Exit 0, nichts geschrieben, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung), existsSync(d.ledger)], [0, 0, false, false]);
  ist('Menü-Trockenlauf: meldet die fehlenden Collections (57) und zeigt die Vorschau', [r.fehlend.length, s.zeilen.some(z => z.includes('VORSCHAU')), s.zeilen.some(z => z.startsWith('fehlt'))], [57, true, true]);
}
{
  const a = attrappe({ collections: SHOP_COLL }), s = still(), d = frisch('m2');
  const r = await menueLauf(a.q, { live: false, annahmeAlle: true, ...d, out: s.out, err: s.err });
  ist('Menü-Trockenlauf mit ANNAHME_ALLE: das Zielbild mit zehn Köpfen und 56 Kindern, nichts geschrieben', [r.code, titel(schmuckAst(r.baum)).length, schmuckAst(r.baum).reduce((n, k) => n + k.items.length, 0), a.schreibend().length], [0, 10, 56, 0]);
  ist('…die Vorschau nennt den Ast und die Annahme', [s.zeilen.some(z => z.includes('ANNAHME_ALLE')), s.zeilen.some(z => z.includes('· Korea, Frankreich & Old Money'))], [true, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m3');
  const r = await menueLauf(a.q, { live: true, annahmeAlle: true, ...d, out: s.out, err: s.err });
  ist('LIVE zusammen mit ANNAHME_ALLE wird abgelehnt (Exit 1), nichts gelesen oder geschrieben', [r.code, a.aufrufe.length], [1, 0]);
}
{
  const a = attrappe({ collections: SHOP_COLL }), s = still(), d = frisch('m4');
  const r = await menueLauf(a.q, { live: true, ...d, out: s.out, err: s.err });
  ist('LIVE mit fehlenden Collections: Exit 2, kein menuUpdate, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung)], [2, 0, false]);
  ist('…die Meldung nennt die Lücken und den Ausweg', s.zeilen.some(z => z.includes('57 Collections fehlen') && z.includes('ERLAUBE_LUECKEN')), true);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m5');
  const vorher = kopie(a.z.menu);
  const r = await menueLauf(a.q, { live: true, ...d, jetzt: () => new Date('2026-10-28T08:00:00Z'), out: s.out, err: s.err });
  ist('LIVE mit allen Collections: Exit 0, genau ein menuUpdate', [r.code, a.schreibend().length, a.aufrufe.filter(x => /menuUpdate/.test(x.query)).length], [0, 1, 1]);
  ist('…die Sicherung ist das ganze Hauptmenü vorher', JSON.stringify(JSON.parse(readFileSync(d.sicherung, 'utf8'))) === JSON.stringify(vorher), true);
  ist('…das Ledger vermerkt den Umbau', readFileSync(d.ledger, 'utf8'), '2026-10-28T08:00:00.000Z · menü schmuck umgebaut\n');
  ist('…im Shop steht danach der neue Ast, alles andere ist gleich', [titel(schmuckAst(eingabeAus(a.z.menu.items))), JSON.stringify(ohneSchmuckKinder(eingabeAus(a.z.menu.items)).map(strip)) === JSON.stringify(ohneSchmuckKinder(MENU).map(strip))], [SPEC.map(s => s[0]), true]);
  // zweiter Lauf: die erste Sicherung darf nicht überschrieben werden
  const erste = readFileSync(d.sicherung, 'utf8');
  const r2 = await menueLauf(a.q, { live: true, ...d, jetzt: () => new Date('2026-10-28T09:00:00Z'), out: s.out, err: s.err });
  ist('zweiter LIVE-Lauf: Exit 0, die erste Sicherung bleibt unverändert, die zweite trägt einen Zeitstempel', [r2.code, readFileSync(d.sicherung, 'utf8') === erste, existsSync(d.sicherung.replace('.json', '-2026-10-28T09-00-00-000Z.json'))], [0, true, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL, verfaelsche: true }), s = still(), d = frisch('m6');
  const r = await menueLauf(a.q, { live: true, ...d, out: s.out, err: s.err });
  ist('Nachlesen weicht ab: Exit 3, die Sicherung liegt vor, das Ledger bleibt leer', [r.code, existsSync(d.sicherung), existsSync(d.ledger)], [3, true, false]);
}
{
  const a = attrappe({ collections: SHOP_COLL }), s = still(), d = frisch('m7');
  const r = await menueLauf(a.q, { live: true, erlaubeLuecken: true, ...d, out: s.out, err: s.err });
  ist('ERLAUBE_LUECKEN=1: Lücken werden live übersprungen (Exit 0, ein menuUpdate)', [r.code, a.schreibend().length], [0, 1]);
}
{
  const a = attrappe({ collections: ALLE_COLL, menuUpdateFehler: [{ field: ['items'], message: 'zu tief', code: 'INVALID' }] }), s = still(), d = frisch('m8');
  let msg = null; try { await menueLauf(a.q, { live: true, ...d, out: s.out, err: s.err }); } catch (e) { msg = e.message; }
  ist('menuUpdate mit Fehlermeldung: der Lauf wirft und schreibt kein Ledger', [/menuUpdate/.test(msg || ''), existsSync(d.ledger)], [true, false]);
}

// Gruppen-Lauf
const PUB = [{ isPublished: true, publication: { id: 'gid://pub/1', name: 'Online Store' } }, { isPublished: true, publication: { id: 'gid://pub/2', name: 'Shop' } }, { isPublished: false, publication: { id: 'gid://pub/3', name: 'Entwurf' } }];
const KATALOG_KLEIN = { produkte: [
  { handle: 'a', title: 'Herren-Ring aus Wolframstahl', g: 'Apparel & Accessories > Jewelry > Rings', tags: ['sort-herrenringe'] },
  { handle: 'b', title: 'Lederarmband für Herren', g: 'Apparel & Accessories > Jewelry > Bracelets', tags: [] },
  { handle: 'c', title: 'Damenring mit Zirkonia', g: 'Apparel & Accessories > Jewelry > Rings', tags: [] }] };
{
  const a = attrappe({ collections: SHOP_COLL, kanaele: PUB }), s = still(), d = frisch('g1');
  const r = await gruppenLauf(a.q, { live: false, katalog: KATALOG_KLEIN, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-Trockenlauf: Exit 0, nichts geschrieben, sechs Gruppen «neu»', [r.code, a.schreibend().length, r.ergebnis.map(e => e.status)], [0, 0, Array(6).fill('neu')]);
  ist('…die Kinder-Tabelle prüft die vorhandenen Collections: fünf mit Regel stimmen, keine weicht ab, premium-schmuck ist manuell', [r.kinder.filter(k => k.stimmt === true).length, r.kinder.filter(k => k.stimmt === false).length, r.kinder.find(k => k.handle === 'premium-schmuck').tag], [5, 0, null]);
  ist('…Kinder, die es noch nicht gibt, sind «noch nicht angelegt»', r.kinder.filter(k => !k.imShop).length, 20);
  ist('…mit Katalog: erwartete Mitglieder der Herren-Gruppe (Ring a, Armband b)', r.ergebnis.find(e => e.handle === 'schmuck-herren-gruppe').erwartet, 2);
}
{
  const a = attrappe({ collections: { ...SHOP_COLL, 'broschen-pins': { id: GID('broschen-pins'), title: 'Broschen & Pins', productsCount: { count: 5 }, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'sort-broschen-alt' }] } } }, kanaele: PUB }), s = still();
  const r = await gruppenLauf(a.q, { live: false, out: s.out, err: s.err });
  ist('Gruppen-Trockenlauf: ein vorhandenes Kind mit anderem Tag wird als Abweichung gemeldet', [r.kinder.find(k => k.handle === 'broschen-pins').stimmt, s.zeilen.some(z => z.includes('WARNUNG') && z.includes('broschen-pins'))], [false, true]);
}
{
  const a = attrappe({ collections: { ...SHOP_COLL, 'broschen-pins': { id: GID('broschen-pins'), title: 'Broschen & Pins', productsCount: { count: 5 }, ruleSet: ruleSetAus('TITLE CONTAINS Brosche') } }, kanaele: PUB }), s = still(), d = frisch('g1b');
  const r = await gruppenLauf(a.q, { live: true, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-LIVE: weicht die Regel eines vorhandenen Kindes vom Tag der Engine ab, bricht der Lauf ab (Exit 2, nichts angelegt)', [r.code, a.schreibend().length], [2, 0]);
}
{
  const gp = gruppenPlan()[2];
  const a = attrappe({ collections: { 'schmuck-motiv-gruppe': { id: GID('schmuck-motiv-gruppe'), title: 'Motive', productsCount: { count: 3 }, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'Herz' }] } } }, kanaele: PUB }), s = still(), d = frisch('g2');
  const r = await gruppenLauf(a.q, { live: true, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-Lauf: ein Handle mit anderer Regel wird NICHT überschrieben - Exit 2, nichts angelegt (auch die anderen fünf nicht)', [r.code, a.schreibend().length, r.ergebnis.find(e => e.handle === gp.handle).status], [2, 0, 'BELEGT, andere Regel']);
}
{
  const gp = gruppenPlan();
  const a = attrappe({ collections: { 'schmuck-herren-gruppe': { id: GID('schmuck-herren-gruppe'), title: 'Schmuck für Herren', productsCount: { count: 71 }, ruleSet: { appliedDisjunctively: true, rules: [...gp[0].regel.rules].reverse() } } }, kanaele: PUB }), s = still(), d = frisch('g3');
  const r = await gruppenLauf(a.q, { live: true, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  const create = a.aufrufe.filter(x => /collectionCreate/.test(x.query)).map(x => x.v.i);
  ist('Gruppen-LIVE: Exit 0, genau fünf neue Sammlungen (die sechste existiert schon mit derselben Regel)', [r.code, create.length, r.ergebnis.find(e => e.handle === 'schmuck-herren-gruppe').status], [0, 5, 'vorhanden (gleiche Regel)']);
  ist('…jede neue Sammlung: Handle, Titel, BEST_SELLING, ODER-Regel mit TAG EQUALS je Kind', create.map(i => [i.handle, i.title, i.sortOrder, i.ruleSet.appliedDisjunctively, i.ruleSet.rules.map(x => x.condition)]), gp.slice(1).map(g => [g.handle, g.titel, 'BEST_SELLING', true, g.regel.rules.map(x => x.condition)]));
  const pubs = a.aufrufe.filter(x => /publishablePublish/.test(x.query));
  ist('…jede wird in den Kanälen von «hype-jetzt» veröffentlicht (nur die veröffentlichten zwei); die schon vorhandene, aber unveröffentlichte Herren-Sammlung wird nachpubliziert (6 Aufrufe)', [pubs.length, pubs.every(p => JSON.stringify(p.v.i) === JSON.stringify([{ publicationId: 'gid://pub/1' }, { publicationId: 'gid://pub/2' }]))], [6, true]);
  ist('…SEO-Titel und Beschreibung stammen aus dem Plan', create.every((i, n) => i.seo.title === `${gp[n + 1].titel} online kaufen | LuxeStyle CH` && i.seo.description === gp[n + 1].seoBeschreibung && i.descriptionHtml === `<p>${gp[n + 1].beschreibung}</p>`), true);
  ist('…das Ledger vermerkt fünf Anlagen und eine Nachpublikation', readFileSync(d.ledger, 'utf8').trim().split('\n').map(z => z.split(' · ')[1].split(' ')[0]), ['nachpubliziert', 'angelegt', 'angelegt', 'angelegt', 'angelegt', 'angelegt']);
  const r2 = await gruppenLauf(a.q, { live: true, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('zweiter LIVE-Lauf: idempotent - alle sechs «vorhanden (gleiche Regel)», kein weiteres collectionCreate, keine weitere Veröffentlichung (alle sind schon in beiden Kanälen)', [r2.code, r2.ergebnis.map(e => e.status), a.aufrufe.filter(x => /collectionCreate/.test(x.query)).length, a.aufrufe.filter(x => /publishablePublish/.test(x.query)).length], [0, Array(6).fill('vorhanden (gleiche Regel)'), 5, 6]);
}
{
  const a = attrappe({ collections: SHOP_COLL, kanaele: [] }), s = still(), d = frisch('g4');
  const r = await gruppenLauf(a.q, { live: true, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-LIVE ohne Veröffentlichungskanäle der Vorbild-Collection: Exit 2, nichts angelegt (Publish-Falle)', [r.code, a.schreibend().length], [2, 0]);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
