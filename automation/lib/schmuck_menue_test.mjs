// Tests des Menü-Umbaus «Schmuck» (lib/schmuck_menue.mjs), der Gruppen-Sammlungen (schmuck_gruppen.mjs) und des Menü-Laufs (schmuck_menue.mjs).
// Das Test-Menü ist das echte Hauptmenü vom 27.10.2026 (dropship/taxonomie-2610-b/orakel/menue-main-2710.json, 18 Punkte, 3 Ebenen, HTTP- und Collection-Ziele).
// Netz gibt es nicht: die Läufe sprechen mit einer Attrappe der Shopify-Abfrage. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
import { readFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AESTE, KURZ, MAX_TITEL, alleHandles, neueHandles, planTitel, menueTitel, tagVon, kategorieVon, gruppenPlan, gleicheRegel, schmuckMenue, ohneSchmuckKinder, pruefeSchmuck, titelWarnungen, PFAD } from './schmuck_menue.mjs';
import { SCHMUCK, bereichAuswahl } from './bereich_taxonomie.mjs';
import { eingabeAus } from '../menu_eintrag_einfuegen.mjs';
import { tiefe, suche, gleicherBaum, gleicheZiele, flachMitZiel, ziel } from './menue_plan.mjs';
import { menueLauf, sammlungenLesen } from '../schmuck_menue.mjs';
import { collectionImWeb, collectionsImWeb } from './collection_web.mjs';
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

// ── Gegenlesung 27.10.2026: das Nachlesen war für Menüziele blind (gleicherBaum schneidet resourceId/Adresse ab) ──
{
  const gleichBaum = kopie(baum);
  // 1) Das alte Messgerät: ein vertauschtes Ziel ('Damen > Kleider') und ein vertauschter Schmuck-Kopf bleiben für gleicherBaum unsichtbar
  const damen = kopie(baum); { const d = damen.find(x => x.title === 'Damen'); const [a, b] = d.items.filter(x => x.type === 'COLLECTION'); [a.resourceId, b.resourceId] = [b.resourceId, a.resourceId]; a.url = '/en/collections/vertauscht'; }
  ist('alt: gleicherBaum übersieht zwei vertauschte Collection-Ziele im Ast «Damen»', gleicherBaum(baum, damen).gleich, true);
  ist('neu: gleicheZiele erkennt dieselben zwei Ziele', gleicheZiele(baum, damen).abweichungen.length, 2);
  const kopfVertauscht = kopie(baum); { const s = suche(kopfVertauscht, PFAD); s.resourceId = 'gid://shopify/Collection/fremd'; }
  ist('alt/neu: der Kopf «Schmuck» zeigt auf eine fremde Collection: gleicherBaum übersieht es, gleicheZiele nicht', [gleicherBaum(baum, kopfVertauscht).gleich, gleicheZiele(baum, kopfVertauscht).gleich], [true, false]);
  const httpAnders = kopie(baum); { const h = httpAnders.flatMap(function sammle(x) { return [x, ...x.items.flatMap(sammle)]; }).find(x => x.type === 'HTTP'); h.url = '/collections/anderswo'; }
  ist('alt/neu: eine HTTP-Adresse, die anderswohin zeigt (Typ-Ziel wird von gleicherBaum abgeschnitten)', [gleicherBaum(baum, httpAnders).gleich, gleicheZiele(baum, httpAnders).gleich], [true, false]);
  // 2) Kein Fehlalarm: Format-Unterschiede, die Shopify beim Zurücklesen macht
  const format = kopie(baum); (function lauf(l) { for (const i of l) { if (i.type === 'COLLECTION') i.url = 'https://luxestyle.ch/en/collections/x'; if (i.type === 'HTTP' && i.url?.startsWith('/')) i.url = 'https://luxestyle.ch/en' + i.url; i.id = 'gid://shopify/MenuItem/' + Math.random(); lauf(i.items || []); } })(format);
  ist('kein Fehlalarm: andere Item-Ids, Host und Sprachpräfix /en/ vor Shop-Pfaden', gleicheZiele(baum, format).gleich, true);
  ist('ziel(): GID gewinnt; Adresse verliert Host und /en/; fremde Hosts bleiben', [ziel({ resourceId: 'gid://1', url: '/x' }), ziel({ url: 'https://luxestyle.ch/en/collections/a?x=1' }), ziel({ url: '/en/pages/ueber-uns' }), ziel({ url: 'https://instagram.com/luxestyle' }), ziel({})], ['gid://1', '/collections/a?x=1', '/pages/ueber-uns', 'https://instagram.com/luxestyle', '']);
  ist('gleicheZiele: fehlender oder zusätzlicher Eintrag wird mit Pfad gemeldet', [gleicheZiele(baum, baum.slice(1)).gleich, gleicheZiele(baum.slice(1), baum).abweichungen.length > 0], [false, true]);
  ist('flachMitZiel: ein Eintrag je Knoten, mit Pfad, Typ und Ziel', flachMitZiel([{ title: 'A', type: 'COLLECTION', resourceId: 'gid://1', items: [{ title: 'B', type: 'HTTP', url: '/collections/b', items: [] }] }]), ['/A|COLLECTION|gid://1', '/A/B|HTTP|/collections/b']);
  // 3) pruefeSchmuck im Nachlese-Modus (Kommentar im Code versprach das, aufgerufen wurde es nie)
  ist('pruefeSchmuck(nachlesen): ein sauber zurückgelesener Baum (andere Ids/Formate) ist in Ordnung', pruefeSchmuck(MENU, format, { nachlesen: true }), []);
  ist('Gegenprobe: derselbe Baum ohne Nachlese-Modus meldet den Kopf «Schmuck» als verändert (Ids/Adressen)', hat(pruefeSchmuck(MENU, format), 'Schmuck'), true);
  ist('pruefeSchmuck(nachlesen): Ziele ausserhalb von «Schmuck» vertauscht → gemeldet, mit dem Pfad', pruefeSchmuck(MENU, damen, { nachlesen: true }).filter(z => z.includes('ausserhalb') && z.includes('/Damen/')).length, 1);
  ist('pruefeSchmuck(nachlesen): der Kopf «Schmuck» zeigt woanders hin → gemeldet', hat(pruefeSchmuck(MENU, kopfVertauscht, { nachlesen: true }), 'Schmuck'), true);
  ist('pruefeSchmuck(nachlesen): ein HTTP-Ziel im Ast Uhren geändert → gemeldet', hat(pruefeSchmuck(MENU, (() => { const b = kopie(baum); const u = b.find(x => x.title === 'Uhren'); u.items[0].url = '/collections/anderswo'; u.items[0].type = 'HTTP'; delete u.items[0].resourceId; return b; })(), { nachlesen: true }), 'ausserhalb'), true);
}

// ── Die Läufe mit einer Attrappe der Shopify-Abfrage ──
const TMP = mkdtempSync(join(tmpdir(), 'schmuck-test-'));
function attrappe({ collections = {}, kanaele = [{ isPublished: true, publication: { id: 'gid://pub/1', name: 'Online Store' } }], menuUpdateFehler = [], verfaelsche = false, nachSchreiben = null, beimLesen = null } = {}) {
  const z = { menu: kopie(MENU_ROH), collections: kopie(collections), n: 0, pub: {}, gelesen: 0 };
  const aufrufe = [];
  const lesbar = items => items.map(i => ({ id: i.id || `gid://shopify/MenuItem/neu-${++z.n}`, title: i.title, type: i.type, resourceId: i.resourceId ?? null, url: i.url ?? (i.type === 'COLLECTION' ? '/collections/x' : null), tags: i.tags || [], items: lesbar(i.items || []) }));
  const q = async (query, v = {}) => {
    aufrufe.push({ query, v: kopie(v) });
    if (/menus\(first/.test(query)) { z.gelesen++; if (beimLesen && beimLesen.nr === z.gelesen) z.menu = beimLesen.aendere(kopie(z.menu)); return { menus: { nodes: [kopie(z.menu)] } }; }
    if (/menuUpdate/.test(query)) {
      if (menuUpdateFehler.length) return { menuUpdate: { menu: null, userErrors: menuUpdateFehler } };
      z.menu = { ...z.menu, items: lesbar(v.i) };
      if (verfaelsche) z.menu.items.find(x => x.title === 'Schmuck').items[0].items.pop();
      if (nachSchreiben) z.menu = nachSchreiben(kopie(z.menu));
      return { menuUpdate: { menu: { id: z.menu.id }, userErrors: [] } };
    }
    if (/c\d+:collectionByHandle\(handle:/.test(query)) { const aus = {}; for (const [, n, h] of query.matchAll(/c(\d+):collectionByHandle\(handle:"([^"]+)"\)/g)) aus['c' + n] = z.collections[h] ? kopie(z.collections[h]) : null; return aus; }
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
// HTTP-Prüfung im Onlineshop (lib/collection_web.mjs): die Attrappe kennt `schlecht` = { handle: Ergebnis } und meldet sonst «erreichbar, gefüllt»
function webAttrappe(schlecht = {}) {
  const aufrufe = [];
  const web = async hs => { aufrufe.push([...hs]); return Object.fromEntries(hs.map(h => [h, schlecht[h] || { ok: true, status: 200, n: 3, grund: '' }])); };
  web.aufrufe = aufrufe;
  return web;
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
  const r = await menueLauf(a.q, { live: true, annahmeAlle: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('LIVE zusammen mit ANNAHME_ALLE wird abgelehnt (Exit 1), nichts gelesen oder geschrieben', [r.code, a.aufrufe.length], [1, 0]);
}
{
  const a = attrappe({ collections: SHOP_COLL }), s = still(), d = frisch('m4');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('LIVE mit fehlenden Collections: Exit 2, kein menuUpdate, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung)], [2, 0, false]);
  ist('…die Meldung nennt die Lücken und den Ausweg', s.zeilen.some(z => z.includes('57 Collections fehlen') && z.includes('ERLAUBE_LUECKEN')), true);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m5');
  const vorher = kopie(a.z.menu);
  const web = webAttrappe(), r = await menueLauf(a.q, { live: true, web, ...d, jetzt: () => new Date('2026-10-28T08:00:00Z'), out: s.out, err: s.err });
  ist('LIVE mit allen Collections: Exit 0, genau ein menuUpdate', [r.code, a.schreibend().length, a.aufrufe.filter(x => /menuUpdate/.test(x.query)).length], [0, 1, 1]);
  ist('…die Sicherung ist das ganze Hauptmenü vorher', JSON.stringify(JSON.parse(readFileSync(d.sicherung, 'utf8'))) === JSON.stringify(vorher), true);
  ist('…das Ledger vermerkt den Umbau', readFileSync(d.ledger, 'utf8'), '2026-10-28T08:00:00.000Z · menü schmuck umgebaut\n');
  ist('…im Shop steht danach der neue Ast, alles andere ist gleich', [titel(schmuckAst(eingabeAus(a.z.menu.items))), JSON.stringify(ohneSchmuckKinder(eingabeAus(a.z.menu.items)).map(strip)) === JSON.stringify(ohneSchmuckKinder(MENU).map(strip))], [SPEC.map(s => s[0]), true]);
  // zweiter Lauf: die erste Sicherung darf nicht überschrieben werden
  const erste = readFileSync(d.sicherung, 'utf8');
  const r2 = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, jetzt: () => new Date('2026-10-28T09:00:00Z'), out: s.out, err: s.err });
  ist('zweiter LIVE-Lauf: Exit 0, die erste Sicherung bleibt unverändert, die zweite trägt einen Zeitstempel', [r2.code, readFileSync(d.sicherung, 'utf8') === erste, existsSync(d.sicherung.replace('.json', '-2026-10-28T09-00-00-000Z.json'))], [0, true, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL, verfaelsche: true }), s = still(), d = frisch('m6');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Nachlesen weicht ab: Exit 3, die Sicherung liegt vor, das Ledger bleibt leer', [r.code, existsSync(d.sicherung), existsSync(d.ledger)], [3, true, false]);
}
{
  const a = attrappe({ collections: SHOP_COLL }), s = still(), d = frisch('m7');
  const r = await menueLauf(a.q, { live: true, erlaubeLuecken: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('ERLAUBE_LUECKEN=1: Lücken werden live übersprungen (Exit 0, ein menuUpdate)', [r.code, a.schreibend().length], [0, 1]);
}
{
  const a = attrappe({ collections: ALLE_COLL, menuUpdateFehler: [{ field: ['items'], message: 'zu tief', code: 'INVALID' }] }), s = still(), d = frisch('m8');
  let msg = null; try { await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err }); } catch (e) { msg = e.message; }
  ist('menuUpdate mit Fehlermeldung: der Lauf wirft und schreibt kein Ledger', [/menuUpdate/.test(msg || ''), existsSync(d.ledger)], [true, false]);
}

// Gegenlesung 27.10.2026, Menü-Lauf (a): Nachlesen prüft die ZIELE. Vorher meldete der Lauf «OK», Exit 0, auch wenn Shopify nach menuUpdate zwei Ziele vertauscht hatte.
const tauscheZiele = (b, pfadA, pfadB) => { const A = suche(b, pfadA), B2 = suche(b, pfadB); [A.resourceId, B2.resourceId] = [B2.resourceId, A.resourceId]; return b; };
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { tauscheZiele(m.items, ['Schmuck', 'Ringe', 'Silberringe'], ['Schmuck', 'Ringe', 'Edelstahl- & Titanringe']); return m; } }), s = still(), d = frisch('m9');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Nachlesen: zwei vertauschte Ziele unter «Schmuck» (Titel und Reihenfolge stimmen!) → Exit 3, Sicherung liegt vor, kein Ledger', [r.code, existsSync(d.sicherung), existsSync(d.ledger)], [3, true, false]);
  ist('…die Meldung nennt die Ziel-Abweichungen', s.zeilen.some(z => z.startsWith('ERR ABWEICHUNG') && z.includes('Silberringe')), true);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { tauscheZiele(m.items, ['Damen', 'Kleider'], ['Damen', 'Röcke']); return m; } }), s = still(), d = frisch('m10');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Nachlesen: zwei vertauschte Ziele AUSSERHALB von «Schmuck» (Damen > Kleider/Röcke) → Exit 3', r.code, 3);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { const h = (function suchen(l) { for (const i of l) { if (i.type === 'HTTP') return i; const g = suchen(i.items); if (g) return g; } return null; })(m.items); h.url = '/collections/anderswo'; return m; } }), s = still(), d = frisch('m11');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Nachlesen: eine HTTP-Adresse im übrigen Menü zeigt danach anderswohin → Exit 3', r.code, 3);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { (function lauf(l) { for (const i of l) { if (i.type === 'COLLECTION') i.url = 'https://luxestyle.ch/en/collections/anders-geschrieben'; if (i.type === 'HTTP' && i.url?.startsWith('/')) i.url = 'https://luxestyle.ch/en' + i.url; lauf(i.items); } })(m.items); return m; } }), s = still(), d = frisch('m12');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Kein Fehlalarm: Shopify liest Adressen mit Host und /en/ zurück → Exit 0, das Ledger vermerkt den Umbau', [r.code, existsSync(d.ledger)], [0, true]);
}
// (b) Publish-Falle: «existiert» heisst nicht «im Onlineshop erreichbar und gefüllt»
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m13');
  const web = webAttrappe({ silberringe: { ok: false, status: 404, n: 0, grund: 'HTTP 404' }, 'schmuck-herren-gruppe': { ok: false, status: 200, n: 0, grund: 'HTTP 200, aber leer (keine Produkte)' } });
  const r = await menueLauf(a.q, { live: true, web, ...d, out: s.out, err: s.err });
  ist('Publish-Falle: existierende, aber im Onlineshop unveröffentlichte (404) oder leere Collection → LIVE Exit 2, kein menuUpdate, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung)], [2, 0, false]);
  ist('…die Meldung nennt beide Handles mit dem Grund (404 / leer)', [s.zeilen.some(z => z.includes('silberringe') && z.includes('HTTP 404')), s.zeilen.some(z => z.includes('schmuck-herren-gruppe') && z.includes('leer'))], [true, true]);
  ist('…die Collections sind laut Admin-API vorhanden (id und title genügten dem alten Lauf): alle 66 gelesen', s.zeilen.some(z => z.startsWith('Collections im Shop: 66 von 66')), true);
  ist('…geprüft wurden genau die 66 vorhandenen Ziele, einmal', [web.aufrufe.length, web.aufrufe[0].length], [1, 66]);
  const a2 = attrappe({ collections: ALLE_COLL }), s2 = still(), d2 = frisch('m13b');
  const r2 = await menueLauf(a2.q, { live: true, erlaubeLuecken: true, web: webAttrappe({ silberringe: { ok: false, status: 404, n: 0, grund: 'HTTP 404' } }), ...d2, out: s2.out, err: s2.err });
  ist('ERLAUBE_LUECKEN=1: die unerreichbare Collection fällt weg, der Rest wird geschrieben (Exit 0, ein menuUpdate)', [r2.code, a2.schreibend().length, JSON.stringify(a2.z.menu).includes(GID('silberringe')), JSON.stringify(a2.z.menu).includes(GID('edelstahl-titanringe'))], [0, 1, false, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m14');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe({ 'sub-ringe': { ok: false, status: 301, n: 0, grund: 'HTTP 301 (Weiterleitung: nicht veröffentlicht oder umbenannt)' } }), ...d, out: s.out, err: s.err });
  ist('Publish-Falle: ein Kopf ohne Onlineshop-Seite (Weiterleitung) → Exit 2, der Ast «Ringe» würde samt Kindern entfallen', [r.code, a.schreibend().length], [2, 0]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m15');
  const r = await menueLauf(a.q, { live: true, ...d, out: s.out, err: s.err });
  ist('LIVE ohne HTTP-Prüfung wird abgelehnt (Exit 1), nichts gelesen, nichts geschrieben', [r.code, a.aufrufe.length], [1, 0]);
  const a2 = attrappe({ collections: SHOP_COLL }), web2 = webAttrappe(), s2 = still(), d2 = frisch('m16');
  const r2 = await menueLauf(a2.q, { live: false, web: web2, ...d2, out: s2.out, err: s2.err });
  ist('Trockenlauf mit HTTP-Prüfung (WEB_PRUEFEN=1): prüft nur die 9 vorhandenen, schreibt nichts', [r2.code, web2.aufrufe[0].length, a2.schreibend().length], [0, 9, 0]);
  const a3 = attrappe({ collections: SHOP_COLL }), web3 = webAttrappe(), s3 = still(), d3 = frisch('m17');
  await menueLauf(a3.q, { live: false, ...d3, out: s3.out, err: s3.err });
  ist('Trockenlauf ohne web (Vorgabe): kein HTTP-Abruf nötig, offline lauffähig', web3.aufrufe.length, 0);
}
// (c) Lese-Schreib-Fenster: das Menü wird direkt vor dem Schreiben noch einmal gelesen; menuUpdate ersetzt den ganzen Baum
{
  const a = attrappe({ collections: ALLE_COLL, beimLesen: { nr: 2, aendere: m => { m.items.push({ id: 'gid://shopify/MenuItem/fremd', title: 'Neu von Kollegin', type: 'HTTP', resourceId: null, url: '/collections/neu', tags: [], items: [] }); return m; } } }), s = still(), d = frisch('m18');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Fenster: jemand fügt dem Menü zwischen erstem Lesen und Schreiben einen Punkt hinzu → Exit 4, NICHTS geschrieben, keine Sicherung, kein Ledger', [r.code, a.schreibend().length, existsSync(d.sicherung), existsSync(d.ledger)], [4, 0, false, false]);
  ist('…die Meldung nennt den neuen Punkt und fordert zum Neustart auf', s.zeilen.some(z => z.includes('verändert') && z.includes('Neu von Kollegin') && z.includes('neu starten')), true);
  ist('…das Menü wurde nur zweimal gelesen (erstes und frisches Lesen), das dritte Lesen nach dem Schreiben entfällt', a.aufrufe.filter(x => /menus\(first/.test(x.query)).length, 2);
}
{
  const a = attrappe({ collections: ALLE_COLL, beimLesen: { nr: 2, aendere: m => { const k = suche(m.items, ['Damen']); [k.items[0], k.items[1]] = [k.items[1], k.items[0]]; return m; } } }), s = still(), d = frisch('m19');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Fenster: nur eine umsortierte Reihenfolge im Ast «Damen» genügt für Exit 4', [r.code, a.schreibend().length], [4, 0]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m20');
  const r = await menueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Erfolg: das Menü wird dreimal gelesen (vorher, direkt vor dem Schreiben, nachher) und die Ziel-Collections in Paketen (66 Handles → 3 Abfragen statt 66)', [a.aufrufe.filter(x => /menus\(first/.test(x.query)).length, a.aufrufe.filter(x => /c\d+:collectionByHandle/.test(x.query)).length, a.aufrufe.filter(x => /collectionByHandle\(handle:\$h\)/.test(x.query)).length], [3, 3, 0]);
  ist('…die Sicherung ist das frisch gelesene Menü (gleiche Ids wie die Attrappe vorher)', JSON.parse(readFileSync(d.sicherung, 'utf8')).id, MENU_ROH.id);
  ist('sammlungenLesen: Pakete zu 25 (25 + 25 + 16 für 66 Handles), fehlende Handles → null', await (async () => { const n = []; const res = await sammlungenLesen(async query => { n.push((query.match(/collectionByHandle/g) || []).length); return {}; }, alleHandles()); return [n, Object.values(res.gids).every(g => g === null)]; })(), [[25, 25, 16], true]);
}
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
  const r = await gruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-LIVE: weicht die Regel eines vorhandenen Kindes vom Tag der Engine ab, bricht der Lauf ab (Exit 2, nichts angelegt)', [r.code, a.schreibend().length], [2, 0]);
}
{
  const gp = gruppenPlan()[2];
  const a = attrappe({ collections: { 'schmuck-motiv-gruppe': { id: GID('schmuck-motiv-gruppe'), title: 'Motive', productsCount: { count: 3 }, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'Herz' }] } } }, kanaele: PUB }), s = still(), d = frisch('g2');
  const r = await gruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-Lauf: ein Handle mit anderer Regel wird NICHT überschrieben - Exit 2, nichts angelegt (auch die anderen fünf nicht)', [r.code, a.schreibend().length, r.ergebnis.find(e => e.handle === gp.handle).status], [2, 0, 'BELEGT, andere Regel']);
}
{
  const gp = gruppenPlan();
  const a = attrappe({ collections: { 'schmuck-herren-gruppe': { id: GID('schmuck-herren-gruppe'), title: 'Schmuck für Herren', productsCount: { count: 71 }, ruleSet: { appliedDisjunctively: true, rules: [...gp[0].regel.rules].reverse() } } }, kanaele: PUB }), s = still(), d = frisch('g3');
  const r = await gruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  const create = a.aufrufe.filter(x => /collectionCreate/.test(x.query)).map(x => x.v.i);
  ist('Gruppen-LIVE: Exit 0, genau fünf neue Sammlungen (die sechste existiert schon mit derselben Regel)', [r.code, create.length, r.ergebnis.find(e => e.handle === 'schmuck-herren-gruppe').status], [0, 5, 'vorhanden (gleiche Regel)']);
  ist('…jede neue Sammlung: Handle, Titel, BEST_SELLING, ODER-Regel mit TAG EQUALS je Kind', create.map(i => [i.handle, i.title, i.sortOrder, i.ruleSet.appliedDisjunctively, i.ruleSet.rules.map(x => x.condition)]), gp.slice(1).map(g => [g.handle, g.titel, 'BEST_SELLING', true, g.regel.rules.map(x => x.condition)]));
  const pubs = a.aufrufe.filter(x => /publishablePublish/.test(x.query));
  ist('…jede wird in den Kanälen von «hype-jetzt» veröffentlicht (nur die veröffentlichten zwei); die schon vorhandene, aber unveröffentlichte Herren-Sammlung wird nachpubliziert (6 Aufrufe)', [pubs.length, pubs.every(p => JSON.stringify(p.v.i) === JSON.stringify([{ publicationId: 'gid://pub/1' }, { publicationId: 'gid://pub/2' }]))], [6, true]);
  ist('…SEO-Titel und Beschreibung stammen aus dem Plan', create.every((i, n) => i.seo.title === `${gp[n + 1].titel} online kaufen | LuxeStyle CH` && i.seo.description === gp[n + 1].seoBeschreibung && i.descriptionHtml === `<p>${gp[n + 1].beschreibung}</p>`), true);
  ist('…das Ledger vermerkt fünf Anlagen und eine Nachpublikation', readFileSync(d.ledger, 'utf8').trim().split('\n').map(z => z.split(' · ')[1].split(' ')[0]), ['nachpubliziert', 'angelegt', 'angelegt', 'angelegt', 'angelegt', 'angelegt']);
  const r2 = await gruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('zweiter LIVE-Lauf: idempotent - alle sechs «vorhanden (gleiche Regel)», kein weiteres collectionCreate, keine weitere Veröffentlichung (alle sind schon in beiden Kanälen)', [r2.code, r2.ergebnis.map(e => e.status), a.aufrufe.filter(x => /collectionCreate/.test(x.query)).length, a.aufrufe.filter(x => /publishablePublish/.test(x.query)).length], [0, Array(6).fill('vorhanden (gleiche Regel)'), 5, 6]);
}
{
  const a = attrappe({ collections: SHOP_COLL, kanaele: [] }), s = still(), d = frisch('g4');
  const r = await gruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-LIVE ohne Veröffentlichungskanäle der Vorbild-Collection: Exit 2, nichts angelegt (Publish-Falle)', [r.code, a.schreibend().length], [2, 0]);
}

// Gegenlesung 27.10.2026, Gruppen-Lauf: «angelegt» und «veröffentlicht» heisst nicht «im Onlineshop erreichbar» (Publish-Falle, Skill Falle 4)
{
  const a = attrappe({ collections: SHOP_COLL, kanaele: PUB }), s = still(), d = frisch('g5');
  const warten = []; const web = webAttrappe({ 'schmuck-motiv-gruppe': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } });
  const r = await gruppenLauf(a.q, { live: true, web, ledger: d.ledger, out: s.out, err: s.err, warte: async ms => { warten.push(ms); } });
  ist('Gruppen-LIVE: eine neue Sammlung bleibt im Onlineshop 404 → Exit 2 (obwohl alle sechs angelegt und «publiziert» wurden)', [r.code, r.ergebnis.filter(e => e.angelegt).length], [2, 6]);
  ist('…die Meldung nennt die Sammlung und den Grund, das Menü darf sie nicht verlinken', s.zeilen.some(z => z.startsWith('ERR') && z.includes('schmuck-motiv-gruppe: HTTP 404') && z.includes('nicht verlinken')), true);
  ist('…geprüft wurde mit Wiederholungen (fünf Versuche für die kranke, je einer für die fünf gesunden), dazwischen gewartet', [web.aufrufe.filter(h => h[0] === 'schmuck-motiv-gruppe').length, web.aufrufe.filter(h => h[0] !== 'schmuck-motiv-gruppe').length, warten.filter(ms => ms === 8000).length >= 4], [5, 5, true]);
}
{
  const gp = gruppenPlan();
  const a = attrappe({ collections: { 'schmuck-herren-gruppe': { id: GID('schmuck-herren-gruppe'), title: 'Schmuck für Herren', productsCount: { count: 71 }, ruleSet: { appliedDisjunctively: true, rules: [...gp[0].regel.rules] } } }, kanaele: PUB }), s = still(), d = frisch('g6');
  a.z.pub[GID('schmuck-herren-gruppe')] = ['gid://pub/1', 'gid://pub/2'];       // die Admin-API behauptet: in beiden Kanälen veröffentlicht
  const web = async hs => ({ [hs[0]]: hs[0] === 'schmuck-herren-gruppe' && !a.aufrufe.some(x => /publishablePublish/.test(x.query) && x.v.id === GID('schmuck-herren-gruppe')) ? { ok: false, status: 404, n: 0, grund: 'HTTP 404' } : { ok: true, status: 200, n: 5, grund: '' } });
  const r = await gruppenLauf(a.q, { live: true, web, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  const p = a.aufrufe.filter(x => /publishablePublish/.test(x.query) && x.v.id === GID('schmuck-herren-gruppe'));
  ist('Gruppen-LIVE: die API sagt «veröffentlicht», der Onlineshop 404 → die vorhandene Sammlung wird trotzdem neu veröffentlicht, danach Exit 0', [r.code, p.length, p[0]?.v.i.length], [0, 1, 2]);
  ist('…das Ledger vermerkt die Nachveröffentlichung', readFileSync(d.ledger, 'utf8').includes('nachpubliziert schmuck-herren-gruppe'), true);
}
{
  const a = attrappe({ collections: SHOP_COLL, kanaele: PUB }), s = still(), d = frisch('g7');
  const r = await gruppenLauf(a.q, { live: true, web: webAttrappe({ 'schmuck-stil-gruppe': { ok: false, status: 200, n: 0, grund: 'HTTP 200, aber leer (keine Produkte)' } }), ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-LIVE: eine Sammlung ist im Onlineshop erreichbar, aber leer → Exit 2', r.code, 2);
}
{
  const a = attrappe({ collections: SHOP_COLL, kanaele: PUB }), s = still(), d = frisch('g8');
  const r = await gruppenLauf(a.q, { live: true, ledger: d.ledger, out: s.out, err: s.err, warte: async () => {} });
  ist('Gruppen-LIVE ohne HTTP-Prüfung wird abgelehnt (Exit 1), nichts gelesen oder geschrieben', [r.code, a.aufrufe.length], [1, 0]);
  const a2 = attrappe({ collections: SHOP_COLL, kanaele: PUB }), web2 = webAttrappe(), s2 = still();
  const r2 = await gruppenLauf(a2.q, { live: false, web: web2, out: s2.out, err: s2.err });
  ist('Gruppen-Trockenlauf mit HTTP-Prüfung: nichts vorhanden → kein Abruf, nichts geschrieben', [r2.code, web2.aufrufe.length, a2.schreibend().length], [0, 0, 0]);
  const a3 = attrappe({ collections: { 'schmuck-herren-gruppe': { id: GID('schmuck-herren-gruppe'), title: 'x', productsCount: { count: 71 }, ruleSet: { appliedDisjunctively: true, rules: gruppenPlan()[0].regel.rules } } }, kanaele: PUB }), web3 = webAttrappe(), s3 = still();
  const r3 = await gruppenLauf(a3.q, { live: false, web: web3, out: s3.out, err: s3.err });
  ist('Gruppen-Trockenlauf mit HTTP-Prüfung: die eine vorhandene Sammlung wird abgerufen und berichtet', [r3.code, web3.aufrufe, s3.zeilen.some(z => z.includes('Onlineshop schmuck-herren-gruppe') && z.includes('ok')), a3.schreibend().length], [0, [['schmuck-herren-gruppe']], true, 0]);
}

// ── lib/collection_web.mjs: die Kundensicht einer Collection (Fetch-Attrappe, kein Netz) ──
{
  const antwort = (status, json) => ({ status, json: async () => { if (json === undefined) throw new Error('kein JSON'); return json; } });
  const mit = (...folge) => { const aufrufe = []; let i = 0; const fetchFn = async (url, opt) => { aufrufe.push({ url, opt }); const a = folge[Math.min(i++, folge.length - 1)]; if (a instanceof Error) throw a; return a; }; fetchFn.aufrufe = aufrufe; return fetchFn; };
  const nie = async () => {};
  const f1 = mit(antwort(200, { products: [{ id: 1 }] }));
  const r1 = await collectionImWeb('silberringe', { fetchFn: f1, jetzt: () => 42, warte: nie });
  ist('Web: HTTP 200 mit Produkt → ok; abgerufen wird products.json ohne Weiterleitung, mit Cache-Brecher', [r1.ok, r1.n, f1.aufrufe[0].url, f1.aufrufe[0].opt.redirect], [true, 1, 'https://luxestyle.ch/collections/silberringe/products.json?limit=1&cb=42', 'manual']);
  ist('Web: HTTP 200, aber leer → nicht ok (leere Smart-Collection)', (await collectionImWeb('x-y', { fetchFn: mit(antwort(200, { products: [] })), warte: nie })).grund, 'HTTP 200, aber leer (keine Produkte)');
  ist('Web: HTTP 200 ohne Produktliste (HTML statt JSON) → nicht ok', (await collectionImWeb('x-y', { fetchFn: mit(antwort(200)), warte: nie })).ok, false);
  const r404 = await collectionImWeb('x-y', { fetchFn: mit(antwort(404)), warte: nie });
  ist('Web: HTTP 404 (unveröffentlicht) → nicht ok, sofort (kein Wiederholen)', [r404.ok, r404.status, r404.grund], [false, 404, 'HTTP 404']);
  const f301 = mit(antwort(301));
  const r301 = await collectionImWeb('x-y', { fetchFn: f301, warte: nie });
  ist('Web: eine Weiterleitung zählt NICHT als erreichbar (haustier-tech 26.10.: 404 durch eine Umleitung verdeckt)', [r301.ok, r301.status, /Weiterleitung/.test(r301.grund), f301.aufrufe.length], [false, 301, true, 1]);
  const f429 = mit(antwort(429), antwort(503), antwort(200, { products: [{ id: 1 }] }));
  const warten = []; const r429 = await collectionImWeb('x-y', { fetchFn: f429, warte: async ms => { warten.push(ms); } });
  ist('Web: Drosselung (429) und Serverfehler (503) werden wiederholt, dann ok', [r429.ok, f429.aufrufe.length, warten], [true, 3, [1500, 3000]]);
  const fAus = mit(antwort(503));
  ist('Web: dauerhafter Serverfehler → nach drei Versuchen nicht ok', [(await collectionImWeb('x-y', { fetchFn: fAus, warte: nie })).ok, fAus.aufrufe.length], [false, 3]);
  const rNetz = await collectionImWeb('x-y', { fetchFn: mit(new Error('ECONNRESET')), warte: nie });
  ist('Web: Netzfehler → nicht ok mit Grund, kein Absturz', [rNetz.ok, /ECONNRESET/.test(rNetz.grund)], [false, true]);
  ist('Web: ein Handle mit Umlaut oder Schrägstrich wird nicht abgerufen', [(await collectionImWeb('../etc', { fetchFn: mit(antwort(200, { products: [1] })), warte: nie })).ok, (await collectionImWeb('schmuck-für-herren', { fetchFn: mit(antwort(200, { products: [1] })), warte: nie })).ok], [false, false]);
  const fMehr = mit(antwort(200, { products: [{}] }));
  const mehr = await collectionsImWeb(['a-b', 'c-d', 'a-b', 'e-f'], { fetchFn: fMehr, warte: nie }, 2);
  ist('Web: mehrere Handles, doppelte nur einmal', [Object.keys(mehr), fMehr.aufrufe.length, Object.values(mehr).every(v => v.ok)], [['a-b', 'c-d', 'e-f'], 3, true]);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
