// Tests des Menü-Umbaus für die Mode-Taxonomie (lib/mode_menue.mjs). Das Test-Menü bildet das Live-Menü vom 26.10.2026 nach.
import { modeMenue, pruefeMenue, ENTFERNEN, PFADE, MIT_FILTER, schuheMenue, pruefeSchuhe, SCHUHE } from './mode_menue.mjs';
import { menueEintraege } from './mode_taxonomie.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const I = (title, items = [], type = 'COLLECTION') => ({ title, type, resourceId: 'gid://c/' + title, items });

const MENU = [
  I('Geschenke & Weihnachten', [I('Weihnachten')]),
  I('Damen', [I('Accessoires: Schals, Mützen & Gürtel'), I('Kleider'), I('Midikleider'), I('Abendkleider & Cocktailkleider'), I('Schuhe'), I('T-Shirts & Tops'), I('Strick & Pullover'),
    I('Jeans & Denim'), I('Jacken & Mäntel'), I('Jacken & Outdoor-Mode'), I('Jumpsuits & Overalls'), I('Blusen & Tops'), I('Hosen & Leggings'), I('Röcke'), I('Shorts & Bermudas'), I('Nachtwäsche & Pyjamas')]),
  I('Herren', [I('Schuhe'), I('Hemden'), I('Shirts & Polos'), I('Hosen'), I('Herren-Jeans'), I('Pullover'), I('Jacken'), I('Uhren'), I('Bart & Rasur')]),
  I('Schuhe', [I('Damenschuhe')]),
  I('Kinder & Baby', [I('👶 Babykleidung & Kindermode', [I('Strampler & Bodys'), I('Baby- & Kinder-Sets')]), I('Spielzeug & Plüsch')]),
];
const handles = new Set(['Damen', 'Herren', 'Kinder'].flatMap(t => menueEintraege(t).flatMap(e => [e.handle, ...(e.unterfilter || []).map(u => u.handle)])));
const ALLE = Object.fromEntries([...handles].map(h => [h, 'gid://c/' + h]));
const plan = Object.fromEntries(Object.keys(PFADE).map(t => [t, menueEintraege(t)]));
const { baum, log } = modeMenue(MENU, plan, ALLE);
const ast = (b, pfad) => { let e = { items: b }; for (const t of pfad) e = e.items.find(x => x.title === t); return e.items; };
const titel = l => l.map(x => x.title);

// ── Damen ──
const damen = ast(baum, ['Damen']);
ist('Damen beginnt mit Kleidern, dann T-Shirts', titel(damen).slice(0, 3), ['Kleider', 'T-Shirts & Langarmshirts', 'Tops & Oberteile']);
// Neue Kategorien heissen teils wie die alten («Röcke») — darum zählt das Ziel (alte Ziele sind 'gid://c/<Titel>'), nicht der Titel.
ist('Damen: kein alter Bekleidungs-Eintrag zeigt mehr auf sein altes Ziel', ENTFERNEN.Damen.filter(t => damen.some(x => x.resourceId === 'gid://c/' + t)), []);
ist('Gegenprobe: das alte Ziel «Röcke» stand vorher im Menü', ast(MENU, ['Damen']).some(x => x.resourceId === 'gid://c/Röcke'), true);
ist('Damen: Schuhe und Accessoires bleiben als letzte Einträge', titel(damen).slice(-2), ['Accessoires: Schals, Mützen & Gürtel', 'Schuhe']);
ist('Damen: Kleider haben 15 Filter als dritte Ebene', ast(baum, ['Damen', 'Kleider']).length, 15);
ist('Damen: andere Kategorien haben keine dritte Ebene', damen.filter(x => x.title !== 'Kleider').every(x => x.items.length === 0), true);
ist('Damen: Partnerlook ist enthalten', titel(damen).includes('Partnerlook & Paar-Outfits'), true);
ist('Damen: 19 Kategorien + Partnerlook + 2 bleibende', damen.length, 19 + 1 + 2);

// ── Herren ──
const herren = ast(baum, ['Herren']);
ist('Herren beginnt mit Hemden', titel(herren)[0], 'Hemden');
ist('Herren: Schuhe, Uhren, Bart & Rasur bleiben', ['Schuhe', 'Uhren', 'Bart & Rasur'].every(t => titel(herren).includes(t)), true);
ist('Herren: Partnerlook als Verweis', titel(herren).includes('Partnerlook & Paar-Outfits'), true);
ist('Herren: die alten «Hosen», «Pullover», «Herren-Jeans» sind ersetzt (kein Doppel-Eintrag mit altem Ziel)', herren.filter(x => ['Hosen', 'Herren-Jeans'].includes(x.title)).every(x => x.resourceId.endsWith('herren-hosen') || x.resourceId.endsWith('herren-jeans')), true);

// ── Kinder ──
const kinder = ast(baum, ['Kinder & Baby', '👶 Babykleidung & Kindermode']);
ist('Kinder: Baby- und Kinderkleidung, Familien-Looks', titel(kinder).includes('Baby-Sets & Outfits') && titel(kinder).includes('Familien-Looks'), true);
ist('Kinder: alte Einträge weg', titel(kinder).includes('Strampler & Bodys'), false);
ist('Kinder: Spielzeug daneben bleibt', titel(ast(baum, ['Kinder & Baby'])).includes('Spielzeug & Plüsch'), true);

// ── Rest bleibt, Prüfungen ──
ist('oberste Ebene unverändert', titel(baum), titel(MENU));
ist('Prüfung: sauber', pruefeMenue(MENU, baum), []);
ist('Gegenprobe: fehlende Collection wird übersprungen und gemeldet', modeMenue(MENU, plan, { ...ALLE, 'damen-roecke': null }).log.some(z => z.startsWith('fehlt') && z.includes('damen-roecke')), true);
ist('Gegenprobe: …und steht dann nicht im Menü', titel(ast(modeMenue(MENU, plan, { ...ALLE, 'damen-roecke': null }).baum, ['Damen'])).includes('Röcke'), false);
ist('Gegenprobe: Prüfung findet verlorenen bleibenden Eintrag', pruefeMenue(MENU, JSON.parse(JSON.stringify(baum).replace('"title":"Bart & Rasur"', '"title":"Bart"'))).some(f => f.includes('Bart & Rasur')), true);
ist('Gegenprobe: Prüfung findet ein doppeltes Ziel', pruefeMenue(MENU, (() => { const b = JSON.parse(JSON.stringify(baum)); b[1].items.push({ ...b[1].items[0], title: 'Kleider zweimal' }); return b; })()).some(f => f.includes('doppeltes Ziel')), true);
ist('Gegenprobe: Prüfung findet 4 Ebenen', pruefeMenue(MENU, (() => { const b = JSON.parse(JSON.stringify(baum)); b[1].items[0].items[0].items = [I('vierte Ebene')]; return b; })()).some(f => f.includes('Ebenen')), true);
ist('Gegenprobe: Prüfung findet eine veränderte oberste Ebene (Reihenfolge und Titel)', [pruefeMenue(MENU, [...baum].reverse()), pruefeMenue(MENU, baum.filter(x => x.title !== 'Schuhe'))].map(f => f.includes('oberste Ebene verändert')), [true, true]);
ist('Gegenprobe: unbekannter Elternknoten wird gemeldet, nichts zerstört', (() => { const r = modeMenue(MENU.filter(x => x.title !== 'Herren'), plan, ALLE); return [r.log.some(z => z.includes('ÜBERSPRUNGEN Herren')), titel(r.baum).includes('Damen')]; })(), [true, true]);
ist('Der Eingabebaum wird nicht verändert', JSON.stringify(MENU).includes('Strampler & Bodys'), true);
ist('Filter nur für Kleider', [...MIT_FILTER], ['damen-kleider']);

// ── Schuhe (Phase 2) ──
const SMENU = [I('Damen', [I('Kleider')]), I('Schuhe', [I('Damenschuhe'), I('Herrenschuhe'), I('Sandalen'), I('Kinderschuhe'), I('Lauf- & Sportschuhe'), I('Stiefel & Boots'), I('Arbeits- & Sicherheitsschuhe'), I('Pumps & High Heels')]), I('Taschen', [I('Rucksäcke')])];
const TAX = { unterpunkte: [
  { titel: 'Damenschuhe', unterpunkte: [{ handle: 'damen-sneaker', titel: 'Sneaker' }, { handle: 'damen-pumps', titel: 'Pumps & Absatzschuhe' }] },
  { titel: 'Herrenschuhe', unterpunkte: [{ handle: 'herren-sneaker', titel: 'Sneaker' }] },
  { titel: 'Kinderschuhe', unterpunkte: [{ handle: 'kinder-sneaker', titel: 'Sneaker & Sportschuhe' }, { handle: 'kinder-stiefel', titel: 'Stiefel & Winterschuhe' }] },
  { titel: 'Arbeits- & Spezialschuhe', unterpunkte: [{ handle: 'arbeitsschuhe', titel: 'Arbeits- & Sicherheitsschuhe', vorhanden: true }] } ] };
const SG = { 'damen-sneaker': 'gid://c/ds', 'damen-pumps': 'gid://c/dp', 'herren-sneaker': 'gid://c/hs', 'kinder-sneaker': 'gid://c/ks', 'kinder-stiefel': 'gid://c/kst' };
const sr = schuheMenue(SMENU, TAX, SG);
const sast = ast(sr.baum, ['Schuhe']);
ist('Schuhe: Gruppen vorn in Taxonomie-Reihenfolge, dann «Arbeits- & Sicherheitsschuhe»', titel(sast), ['Damenschuhe', 'Herrenschuhe', 'Kinderschuhe', 'Arbeits- & Sicherheitsschuhe']);
ist('Schuhe: die flachen Dubletten sind weg', ['Sandalen', 'Lauf- & Sportschuhe', 'Stiefel & Boots', 'Pumps & High Heels'].some(t => titel(sast).includes(t)), false);
ist('Schuhe: Gruppen behalten ihr bisheriges Ziel', sast.slice(0, 3).map(x => x.resourceId), ['gid://c/Damenschuhe', 'gid://c/Herrenschuhe', 'gid://c/Kinderschuhe']);
ist('Schuhe: neue Kategorien als dritte Ebene', ast(sr.baum, ['Schuhe', 'Damenschuhe']).map(x => x.title), ['Sneaker', 'Pumps & Absatzschuhe']);
ist('Schuhe: Prüfung sauber', pruefeSchuhe(SMENU, sr.baum), []);
ist('Schuhe: andere Äste unberührt', JSON.stringify(sr.baum.filter(x => x.title !== 'Schuhe')), JSON.stringify(SMENU.filter(x => x.title !== 'Schuhe')));
ist('Schuhe Gegenprobe: fehlende Collection wird gemeldet und übersprungen', (() => { const r = schuheMenue(SMENU, TAX, { ...SG, 'damen-pumps': null }); return [r.log.some(z => z.startsWith('fehlt') && z.includes('damen-pumps')), titel(ast(r.baum, ['Schuhe', 'Damenschuhe']))]; })(), [true, ['Sneaker']]);
ist('Schuhe Gegenprobe: Gruppe ohne Menüeintrag wird gemeldet, nichts zerstört', (() => { const r = schuheMenue(SMENU.map(x => x.title === 'Schuhe' ? { ...x, items: x.items.filter(i => i.title !== 'Herrenschuhe') } : x), TAX, SG); return [r.log.some(z => z.includes('Gruppe Herrenschuhe')), titel(ast(r.baum, ['Schuhe']))]; })(), [true, ['Damenschuhe', 'Kinderschuhe', 'Arbeits- & Sicherheitsschuhe']]);
ist('Schuhe Gegenprobe: ohne Ast «Schuhe» wird übersprungen', schuheMenue([I('Damen', [])], TAX, SG).log[0].startsWith('ÜBERSPRUNGEN Schuhe'), true);
ist('Schuhe Gegenprobe: Prüfung findet verlorenen «Arbeits- & Sicherheitsschuhe»', pruefeSchuhe(SMENU, (() => { const b = JSON.parse(JSON.stringify(sr.baum)); const e = b.find(x => x.title === 'Schuhe'); e.items = e.items.filter(i => i.title !== 'Arbeits- & Sicherheitsschuhe'); return b; })()).some(f => f.includes('Arbeits')), true);
ist('Schuhe Gegenprobe: Prüfung findet veränderten Nachbar-Ast', pruefeSchuhe(SMENU, (() => { const b = JSON.parse(JSON.stringify(sr.baum)); b.find(x => x.title === 'Taschen').items = []; return b; })()).some(f => f.includes('ausserhalb')), true);
ist('Schuhe Gegenprobe: Prüfung findet verändertes Gruppen-Ziel', pruefeSchuhe(SMENU, (() => { const b = JSON.parse(JSON.stringify(sr.baum)); b.find(x => x.title === 'Schuhe').items[0].resourceId = 'gid://c/anders'; return b; })()).some(f => f.includes('Ziel der Gruppe')), true);
ist('Schuhe Gegenprobe: Prüfung findet doppeltes Ziel', pruefeSchuhe(SMENU, (() => { const b = JSON.parse(JSON.stringify(sr.baum)); const e = b.find(x => x.title === 'Schuhe').items[0]; e.items.push({ ...e.items[0], title: 'Doppelt' }); return b; })()).some(f => f.includes('doppeltes Ziel')), true);
ist('Schuhe Gegenprobe: Prüfung findet 4 Ebenen', pruefeSchuhe(SMENU, (() => { const b = JSON.parse(JSON.stringify(sr.baum)); b.find(x => x.title === 'Schuhe').items[0].items[0].items = [I('vierte Ebene')]; return b; })()).some(f => f.includes('Ebenen')), true);
ist('Schuhe: SCHUHE benennt Pfad und Gruppen', [SCHUHE.pfad, SCHUHE.gruppen.length], [['Schuhe'], 3]);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
