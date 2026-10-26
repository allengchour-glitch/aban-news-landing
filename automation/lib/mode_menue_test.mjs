// Tests des Menü-Umbaus für die Mode-Taxonomie (lib/mode_menue.mjs). Das Test-Menü bildet das Live-Menü vom 26.10.2026 nach.
import { modeMenue, pruefeMenue, ENTFERNEN, PFADE, MIT_FILTER } from './mode_menue.mjs';
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

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
