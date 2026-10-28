// Tests des Menü-Umbaus «Rucksäcke» (lib/rucksaecke_menue.mjs), des Menü-Laufs (rucksaecke_menue.mjs) und der Gruppen-Sammlungen (rucksaecke_gruppen.mjs).
// Das Test-Menü ist das echte Hauptmenü vom 28.10.2026 (dropship/taxonomie-2610-b/orakel/menue-main-2810.json, 18 Punkte, 3 Ebenen, nach dem Schmuck-Umbau).
// Netz gibt es nicht: die Läufe sprechen mit einer Attrappe der Shopify-Abfrage. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
import { readFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AESTE, ERSETZT, UMHAENGEN, KURZ, MAX_TITEL, PFAD, RUCKSACK_GRUPPEN, RUCKSAECKE, alleHandles, neueHandles, planTitel, menueTitel, tagVon, kategorieVon, gruppenPlan, handleVon,
  rucksackMenue, umhaengenAn, ohneRucksackEintraege, pruefeRucksack, titelWarnungen, ERSETZT_ALLE } from './rucksaecke_menue.mjs';
import { bereichAuswahl } from './bereich_taxonomie.mjs';
import { eingabeAus } from '../menu_eintrag_einfuegen.mjs';
import { tiefe, suche, gleicheZiele, flachMitZiel } from './menue_plan.mjs';
import { rucksackMenueLauf, optionenAusEnv as menueOptionen } from '../rucksaecke_menue.mjs';
import { rucksackGruppenLauf, optionenAusEnv as gruppenOptionen } from '../rucksaecke_gruppen.mjs';
import { gruppenLauf } from '../schmuck_gruppen.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const lies = n => JSON.parse(readFileSync(new URL(`../../dropship/taxonomie-2610-b/orakel/${n}`, import.meta.url)));
const kopie = x => JSON.parse(JSON.stringify(x));

const MENU_ROH = lies('menue-main-2810.json').menu;
const MENU = eingabeAus(MENU_ROH.items);
const GID = h => 'gid://shopify/Collection/test-' + h;
const ALLE = Object.fromEntries(alleHandles().map(h => [h, GID(h)]));
const { B } = bereichAuswahl({ datei: 'rucksaecke', gruppen: RUCKSACK_GRUPPEN });
const titel = l => l.map(x => x.title);
const taschen = b => suche(b, PFAD).items;
const hat = (fehlerListe, teil) => fehlerListe.some(f => f.includes(teil));
const KOPF_TITEL = ['Rucksäcke', 'Spezial-Rucksäcke', 'Material & Ausstattung'];

// ── Der Auftrag: Köpfe, Kinder und Reihenfolge (Bereichsdatei rucksaecke.json, Menü-Vorschlag im Hinweis dort) ──
ist('drei Köpfe mit Ziel in der Reihenfolge des Plans', AESTE.map(a => [a.titel, a.kopf]), [['Rucksäcke', 'rucksaecke'], ['Spezial-Rucksäcke', 'rucksaecke-spezial-gruppe'], ['Material & Ausstattung', 'rucksaecke-material-gruppe']]);
ist('die sieben Kinder von «Rucksäcke» sind die Kinder der Gruppe «Nach Einsatz», in ihrer Reihenfolge', AESTE[0].kinder, B.gruppen.find(g => g.handle === 'rucksaecke-einsatz-gruppe').kinder);
ist('die drei Kinder von «Spezial-Rucksäcke» sind die Kinder der Gruppe, in ihrer Reihenfolge', AESTE[1].kinder, B.gruppen.find(g => g.handle === 'rucksaecke-spezial-gruppe').kinder);
ist('die vier Kinder von «Material & Ausstattung» sind die Kinder der Gruppe, in ihrer Reihenfolge', AESTE[2].kinder, B.gruppen.find(g => g.handle === 'rucksaecke-material-gruppe').kinder);
ist('14 Kinder, 17 Handles (3 Köpfe + 14), 14 davon neu', [AESTE.reduce((n, a) => n + a.kinder.length, 0), alleHandles().length, neueHandles().length], [14, 17, 14]);
ist('die Engine kennt 14 Kategorien und 46 Chips (60 Einträge) mit Präfix r- und Tag sort-<handle>', [RUCKSAECKE.length, RUCKSAECKE.filter(k => !k.filter).length, RUCKSAECKE.every(k => k.id === 'r-' + k.handle && k.tag === 'sort-' + k.handle)], [60, 14, true]);
ist('jedes Kind ist eine Engine-Kategorie (kein Chip) mit seinem Tag', AESTE.flatMap(a => a.kinder).every(h => kategorieVon(h) && tagVon(h) === 'sort-' + h), true);
ist('kein Kopf ist eine Taxonomie-Kategorie (rucksaecke ist die vorhandene Sammlung, die zwei Gruppen legt rucksaecke_gruppen.mjs an)', AESTE.map(a => kategorieVon(a.kopf)), [undefined, undefined, undefined]);
ist('kein Kopf ist zugleich Kind eines Kopfes', AESTE.filter(a => AESTE.some(b => b.kinder.includes(a.kopf))).map(a => a.kopf), []);
ist('die Gruppe «Nach Einsatz» bekommt KEINE Sammlung und keinen Menü-Kopf (der Kopf «Rucksäcke» trägt ihre Kinder)', [AESTE.some(a => a.kopf === 'rucksaecke-einsatz-gruppe'), gruppenPlan().some(g => g.handle === 'rucksaecke-einsatz-gruppe')], [false, false]);
ist('die zwei Gruppen-Köpfe heissen wie die Gruppen der Bereichsdatei', AESTE.filter(a => a.gruppe).map(a => B.gruppen.some(g => g.handle === a.kopf)), [true, true]);
ist('die drei zu ersetzenden Einträge und der Umhänger', [ERSETZT, UMHAENGEN], [['rucksaecke-sport', 'rucksaecke-schule', 'rucksaecke'], { 'rucksaecke-laptop': 'laptop-business-rucksaecke' }]);
ist('der Umhänger zeigt auf ein Kind des Plans', alleHandles().includes(UMHAENGEN['rucksaecke-laptop']), true);
ist('Menütitel: jeder höchstens 34 Zeichen (Köpfe mit Menü-Titel, Kinder mit Plan-Titel bzw. KURZ)', [...AESTE.map(a => a.titel), ...AESTE.flatMap(a => a.kinder).map(h => menueTitel(h))].filter(t => t.length > MAX_TITEL), []);
ist('Gegenprobe: ohne KURZ wäre «Canvas-, Retro- & Vintage-Rucksäcke» zu lang, und KURZ nennt nur Handles des Plans', [planTitel('canvas-vintage-rucksaecke').length > MAX_TITEL, Object.keys(KURZ).every(h => alleHandles().includes(h))], [true, true]);
ist('menueTitel: Shop-Titel gewinnt vor Plan-Titel, KURZ vor beiden', [menueTitel('reise-rucksaecke', 'Reise X'), menueTitel('reise-rucksaecke'), menueTitel('canvas-vintage-rucksaecke', 'Lang Lang')], ['Reise X', 'Reiserucksäcke', 'Canvas, Retro & Vintage']);
ist('handleVon: Adresse mit und ohne Sprachpräfix, Abfrage, kein Collection-Link', [handleVon({ url: '/en/collections/rucksaecke' }), handleVon({ url: '/collections/rucksaecke-sport?x=1' }), handleVon({ url: 'https://luxestyle.ch/collections/Reisegepaeck' }), handleVon({ url: '/pages/rueckgabe' }), handleVon({})],
  ['rucksaecke', 'rucksaecke-sport', 'reisegepaeck', null, null]);
ist('handleVon: «rucksaecke» trifft nicht «rucksaecke-schule» (ganzer Handle)', [handleVon({ url: '/en/collections/rucksaecke-schule' }) === 'rucksaecke', handleVon({ url: '/en/collections/rucksaecke-schule' })], [false, 'rucksaecke-schule']);

// ── Gruppen-Sammlungen: ODER über die Tags der Kinder ──
{
  const plan = gruppenPlan();
  ist('zwei Gruppen-Sammlungen: Spezial und Material', plan.map(g => [g.handle, g.titel]), [['rucksaecke-spezial-gruppe', 'Spezial-Rucksäcke'], ['rucksaecke-material-gruppe', 'Rucksäcke nach Material & Ausstattung']]);
  ist('Regel: ODER, je Kind eine Zeile TAG EQUALS sort-<kind>', plan.map(g => [g.regel.appliedDisjunctively, g.regel.rules.map(r => `${r.column} ${r.relation} ${r.condition}`)]), [
    [true, ['TAG EQUALS sort-taktische-tarn-rucksaecke', 'TAG EQUALS sort-foto-drohnen-rucksaecke', 'TAG EQUALS sort-rucksaecke-motorrad']],
    [true, ['TAG EQUALS sort-leder-kunstleder-rucksaecke', 'TAG EQUALS sort-canvas-vintage-rucksaecke', 'TAG EQUALS sort-usb-lade-rucksaecke', 'TAG EQUALS sort-wasserdichte-rucksaecke']]]);
  ist('kein Kind ohne Tag (alle sind Taxonomie-Kategorien)', plan.map(g => g.ohneTag), [[], []]);
  ist('Beschreibung und SEO-Beschreibung gesetzt, SEO nennt Schweiz und Gratis-Versand', plan.every(g => g.beschreibung.length > 30 && /Schweiz/.test(g.seoBeschreibung) && /CHF 50/.test(g.seoBeschreibung)), true);
  ist('die Beschreibungen nennen nur Dinge, die die Kinder auch sind (Gegenprobe: jedes Kind-Stichwort kommt vor)', [/taktisch/i.test(plan[0].beschreibung) && /foto/i.test(plan[0].beschreibung) && /motorrad/i.test(plan[0].beschreibung),
    /leder/i.test(plan[1].beschreibung) && /canvas/i.test(plan[1].beschreibung) && /usb/i.test(plan[1].beschreibung) && /wasserdicht/i.test(plan[1].beschreibung)], [true, true]);
}

// ── Der Umbau, rein ──
const SEIN = kopie(MENU);
const R = rucksackMenue(MENU, ALLE);
ist('der Eingabebaum wird nicht verändert', MENU, SEIN);
ist('ohne Fehlende: nichts fehlt, 3 entfernt, 3 neu, 1 umgehängt im Protokoll', [R.fehlend, R.log.filter(z => z.startsWith('entfernt')).length, R.log.filter(z => z.startsWith('neu')).length, R.log.filter(z => z.startsWith('umgehängt')).length], [[], 3, 3, 1]);
{
  const alt = taschen(MENU), neu = taschen(R.baum);
  const iSport = alt.findIndex(x => x.title === 'Sport- & Wanderrucksäcke');
  ist('Ausgangslage: die drei Rucksack-Einträge stehen im Ast (Sport, Schule, Rucksäcke)', ['Sport- & Wanderrucksäcke', 'Schulrucksäcke', 'Rucksäcke'].map(t => alt.some(x => x.title === t)), [true, true, true]);
  const erwartet = [...titel(alt).slice(0, iSport), ...KOPF_TITEL, ...titel(alt).slice(iSport).filter(t => !['Sport- & Wanderrucksäcke', 'Schulrucksäcke', 'Rucksäcke'].includes(t))];
  ist('Ast «Taschen & Rucksäcke»: die drei Köpfe stehen an der Stelle des ersten entfernten Eintrags, alle anderen Einträge in alter Reihenfolge', titel(neu), erwartet);
  ist('die Damen- und Herren-Taschen und alle übrigen Einträge des Astes sind unverändert (Ids, Ziele)', neu.filter(x => !KOPF_TITEL.includes(x.title)), alt.filter(x => !['Sport- & Wanderrucksäcke', 'Schulrucksäcke', 'Rucksäcke'].includes(x.title)));
  const k = Object.fromEntries(neu.filter(x => KOPF_TITEL.includes(x.title)).map(x => [x.title, x]));
  ist('Kopf «Rucksäcke» zeigt auf rucksaecke und trägt die sieben Einsatz-Kategorien, ohne eigene Id', [k['Rucksäcke'].resourceId, k['Rucksäcke'].type, titel(k['Rucksäcke'].items), k['Rucksäcke'].id], [GID('rucksaecke'), 'COLLECTION',
    ['Laptop- & Business-Rucksäcke', 'Schul- & Studentenrucksäcke', 'Wander- & Outdoor-Rucksäcke', 'Reiserucksäcke', 'Velo-, Lauf- & Trinkrucksäcke', 'Freizeit-, Mode- & Sportrucksäcke', 'Kinder- & Wickelrucksäcke'], undefined]);
  ist('Kopf «Spezial-Rucksäcke»: Ziel und drei Kinder', [k['Spezial-Rucksäcke'].resourceId, titel(k['Spezial-Rucksäcke'].items)], [GID('rucksaecke-spezial-gruppe'), ['Taktische & Tarn-Rucksäcke', 'Foto- & Drohnenrucksäcke', 'Motorrad-Rucksäcke']]);
  ist('Kopf «Material & Ausstattung»: Ziel und vier Kinder (Canvas gekürzt)', [k['Material & Ausstattung'].resourceId, titel(k['Material & Ausstattung'].items)], [GID('rucksaecke-material-gruppe'), ['Leder- & Kunstleder-Rucksäcke', 'Canvas, Retro & Vintage', 'Rucksäcke mit Ladefunktion', 'Wasserdichte Rucksäcke']]);
  ist('jedes Kind zeigt auf die Collection seines Handles, in Planreihenfolge', neu.filter(x => KOPF_TITEL.includes(x.title)).map(x => x.items.map(c => c.resourceId)), AESTE.map(a => a.kinder.map(GID)));
  ist('Kinder haben keine Unterpunkte; höchstens drei Ebenen', [neu.every(x => x.items.every(c => (c.items || []).length === 0)), tiefe(R.baum) <= 3], [true, true]);
}
{
  const b = R.baum, pfad = ['Elektronik', 'Büro & Home Office', 'Laptop- & Business-Rucksäcke'];
  const vorher = suche(MENU, pfad), nachher = suche(b, pfad);
  ist('Ausgangslage: der Elektronik-Eintrag zeigt auf rucksaecke-laptop', handleVon(vorher), 'rucksaecke-laptop');
  ist('umgehängt: Elektronik-Eintrag zeigt auf laptop-business-rucksaecke, Titel und Id bleiben, die alte Adresse entfällt', [nachher.resourceId, nachher.url, nachher.title, nachher.id === vorher.id], [GID('laptop-business-rucksaecke'), undefined, vorher.title, true]);
  ist('«Sport & Party > Rucksäcke» bleibt unberührt (eigener Eintrag, anderer Ast)', suche(b, ['Sport & Party', 'Rucksäcke']), suche(MENU, ['Sport & Party', 'Rucksäcke']));
  ist('oberste Ebene unverändert', titel(b), titel(MENU));
  const aussen = l => l.filter(x => x.title !== PFAD[0]);
  const a1 = flachMitZiel(umhaengenAn(kopie(aussen(MENU)), ALLE)), a2 = flachMitZiel(aussen(b));
  ist('ausserhalb von «Taschen & Rucksäcke» ist alles gleich, bis auf den einen umgehängten Eintrag (Pfade, Titel, Typ, Ziele, Reihenfolge)', a1, a2);
  ist('…und der Vergleich ohne Umhängen unterscheidet sich in genau einer Zeile (Gegenprobe: das Messgerät sieht den Umhänger)', flachMitZiel(aussen(MENU)).filter((z, n) => z !== flachMitZiel(aussen(b))[n]).length, 1);
  ist('der Kopf «Taschen & Rucksäcke» selbst ist unverändert', [suche(b, PFAD).id, suche(b, PFAD).resourceId, suche(b, PFAD).title], [suche(MENU, PFAD).id, suche(MENU, PFAD).resourceId, suche(MENU, PFAD).title]);
  ist('pruefeRucksack: der Umbau besteht die eigene Prüfung', pruefeRucksack(MENU, b, ALLE), []);
  ist('keine neuen Menütitel über 34 Zeichen (die zwei vorhandenen Herren-Einträge sind nicht Teil des Umbaus)', titelWarnungen(b), titelWarnungen(MENU));
  ist('…und es sind genau diese zwei', titelWarnungen(MENU).length, 2);
}
// Wiederholbarkeit: auf einem umgebauten, von Shopify zurückgelesenen Baum (mit Adressen) ergibt ein zweiter Lauf denselben Baum
{
  const gelesen = kopie(R.baum);
  (function lauf(l) { for (const i of l) { if (i.type === 'COLLECTION' && i.resourceId && !i.url) i.url = '/en/collections/' + Object.keys(ALLE).find(h => ALLE[h] === i.resourceId); lauf(i.items || []); } })(gelesen);
  const R2 = rucksackMenue(gelesen, ALLE);
  ist('zweiter Lauf auf dem umgebauten Menü: gleicher Baum (Pfade, Titel, Typ, Ziele), keine doppelten Köpfe', gleicheZiele(R2.baum, gelesen).gleich, true);
  ist('…und die Köpfe stehen genau einmal im Ast', taschen(R2.baum).filter(x => KOPF_TITEL.includes(x.title)).length, 3);
  ist('…und der umgehängte Eintrag wird nicht noch einmal gemeldet', R2.log.filter(z => z.startsWith('umgehängt')).length, 0);
}
// Fehlende Collections: übersprungen und gemeldet
{
  const ohne = h => ({ ...ALLE, [h]: null });
  const r1 = rucksackMenue(MENU, ohne('rucksaecke-motorrad'));
  ist('fehlendes Kind: Eintrag übersprungen (2 statt 3 Spezial-Kinder), gemeldet', [taschen(r1.baum).find(x => x.title === 'Spezial-Rucksäcke').items.length, r1.fehlend], [2, ['rucksaecke-motorrad']]);
  const r2 = rucksackMenue(MENU, ohne('rucksaecke-spezial-gruppe'));
  ist('fehlender Kopf: Ast entfällt samt Kindern, alle seine Kinder gelten als nicht berührt (Kopf wird gemeldet)', [titel(taschen(r2.baum)).includes('Spezial-Rucksäcke'), r2.fehlend], [false, ['rucksaecke-spezial-gruppe']]);
  const r3 = rucksackMenue(MENU, ohne('laptop-business-rucksaecke'));
  ist('fehlt die neue Laptop-Kategorie, bleibt der Elektronik-Eintrag auf rucksaecke-laptop (nichts Halbes)', [handleVon(suche(r3.baum, ['Elektronik', 'Büro & Home Office', 'Laptop- & Business-Rucksäcke'])), r3.log.some(z => z.startsWith('fehlt') && z.includes('Elektronik'))], ['rucksaecke-laptop', true]);
  const r4 = rucksackMenue([{ id: 'x', title: 'Damen', type: 'HTTP', url: '/', items: [] }], ALLE);
  ist('ohne den Ast «Taschen & Rucksäcke» wird nichts geändert', [r4.baum, r4.log[0].startsWith('ÜBERSPRUNGEN')], [[{ id: 'x', title: 'Damen', type: 'HTTP', url: '/', items: [] }], true]);
}

// ── Die Prüfung findet Fehler (Gegenproben in beide Richtungen) ──
{
  const b = R.baum;
  ist('Prüfung vor dem Schreiben: der Umbau ist in Ordnung', pruefeRucksack(MENU, b, ALLE), []);
  const a = kopie(b); a.find(x => x.title === 'Damen').title = 'Frauen';
  ist('oberste Ebene umbenannt → gemeldet', hat(pruefeRucksack(MENU, a, ALLE), 'oberste Ebene'), true);
  const c = kopie(b); taschen(c).find(x => x.title === 'Damen: Handtaschen').resourceId = 'gid://shopify/Collection/anderswo';
  ist('ein Damen-Taschen-Ziel geändert → «ausserhalb der Rucksack-Köpfe» gemeldet', hat(pruefeRucksack(MENU, c, ALLE), 'ausserhalb der Rucksack-Köpfe'), true);
  const d = kopie(b); taschen(d).splice(taschen(d).findIndex(x => x.title === 'Reisegepäck'), 1);
  ist('ein anderer Eintrag des Astes (Reisegepäck) fehlt → gemeldet', hat(pruefeRucksack(MENU, d, ALLE), 'ausserhalb der Rucksack-Köpfe'), true);
  const e = kopie(b); suche(e, ['Elektronik', 'Büro & Home Office', 'Laptop- & Business-Rucksäcke']).resourceId = suche(MENU, ['Elektronik', 'Büro & Home Office', 'Laptop- & Business-Rucksäcke']).resourceId; suche(e, ['Elektronik', 'Büro & Home Office', 'Laptop- & Business-Rucksäcke']).url = '/en/collections/rucksaecke-laptop';
  ist('Elektronik-Eintrag nicht umgehängt → gemeldet', hat(pruefeRucksack(MENU, e, ALLE), 'ausserhalb der Rucksack-Köpfe'), true);
  const f = kopie(b); suche(f, ['Sport & Party', 'Rucksäcke']).resourceId = GID('rucksaecke-motorrad');
  ist('«Sport & Party > Rucksäcke» umgehängt → gemeldet', hat(pruefeRucksack(MENU, f, ALLE), 'ausserhalb der Rucksack-Köpfe'), true);
  const g = kopie(b); taschen(g).find(x => x.title === 'Spezial-Rucksäcke').items.pop();
  ist('ein Kind eines Kopfes fehlt → «Kinder von … weichen vom Plan ab»', hat(pruefeRucksack(MENU, g, ALLE), 'Kinder von «Spezial-Rucksäcke»'), true);
  const h = kopie(b); taschen(h).find(x => x.title === 'Rucksäcke').items.reverse();
  ist('Kinder in anderer Reihenfolge → gemeldet', hat(pruefeRucksack(MENU, h, ALLE), 'Kinder von «Rucksäcke»'), true);
  const i = kopie(b); taschen(i).find(x => x.title === 'Material & Ausstattung').resourceId = GID('rucksaecke-spezial-gruppe');
  ist('Kopf zeigt auf die falsche Collection → gemeldet', hat(pruefeRucksack(MENU, i, ALLE), 'zeigt nicht auf'), true);
  const j = kopie(b); const sp = taschen(j).splice(taschen(j).findIndex(x => x.title === 'Spezial-Rucksäcke'), 1)[0]; taschen(j).splice(taschen(j).findIndex(x => x.title === 'Material & Ausstattung') + 1, 0, sp);
  ist('Köpfe in falscher Reihenfolge → gemeldet', hat(pruefeRucksack(MENU, j, ALLE), 'Reihenfolge der Rucksack-Köpfe'), true);
  const k = kopie(b); taschen(k).find(x => x.title === 'Rucksäcke').items[0].items = [{ title: 'Tiefer', type: 'COLLECTION', resourceId: GID('rucksaecke-motorrad'), items: [] }];
  ist('vierte Ebene → gemeldet (Shopify erlaubt drei)', hat(pruefeRucksack(MENU, k, ALLE), 'Ebenen'), true);
  const l = kopie(b); taschen(l).find(x => x.title === 'Rucksäcke').items[1].type = 'HTTP';
  ist('ein Kind ist keine Collection → gemeldet', hat(pruefeRucksack(MENU, l, ALLE), 'keine Collection'), true);
  const m = kopie(b); delete taschen(m).find(x => x.title === 'Spezial-Rucksäcke').items[0].resourceId;
  ist('ein Kind ohne resourceId → gemeldet', hat(pruefeRucksack(MENU, m, ALLE), 'ohne resourceId'), true);
  const n = kopie(b); taschen(n).find(x => x.title === 'Rucksäcke').items[1].resourceId = taschen(n).find(x => x.title === 'Rucksäcke').items[0].resourceId;
  ist('doppeltes Ziel unter einem Kopf → gemeldet', hat(pruefeRucksack(MENU, n, ALLE), 'doppeltes Ziel'), true);
  const o = kopie(b); taschen(o).find(x => x.title === 'Rucksäcke').items[1].title = taschen(o).find(x => x.title === 'Rucksäcke').items[0].title;
  ist('doppelter Titel unter einem Kopf → gemeldet', hat(pruefeRucksack(MENU, o, ALLE), 'doppelter Titel'), true);
  const p = kopie(b); taschen(p).find(x => x.title === 'Rucksäcke').items.unshift({ title: 'Selbst', type: 'COLLECTION', resourceId: GID('rucksaecke'), items: [] });
  ist('ein Kopf ist zugleich sein eigenes Kind → gemeldet', hat(pruefeRucksack(MENU, p, ALLE), 'eigenes Kind'), true);
  const q = kopie(b); suche(q, PFAD).title = 'Taschen';
  ist('der Kopf «Taschen & Rucksäcke» umbenannt → gemeldet', pruefeRucksack(MENU, q, ALLE).length > 0, true);
  const r = kopie(b); suche(r, PFAD).resourceId = GID('rucksaecke');
  ist('der Kopf «Taschen & Rucksäcke» zeigt woanders hin → gemeldet', hat(pruefeRucksack(MENU, r, ALLE), 'selbst wurde verändert'), true);
  const s = kopie(b); s.splice(s.findIndex(x => x.title === PFAD[0]), 1);
  ist('der Ast fehlt ganz → gemeldet', hat(pruefeRucksack(MENU, s, ALLE), 'fehlt'), true);
  // Nachlese-Modus: Shopify liefert Ids und Adressen; ein Eintrag zählt über Titel, Typ und Ziel
  const format = kopie(b);
  (function lauf(l) { for (const x of l) { if (!x.id) x.id = 'gid://shopify/MenuItem/neu-' + Math.random().toString(36).slice(2); if (x.type === 'COLLECTION' && x.resourceId && !x.url) x.url = '/en/collections/' + (Object.keys(ALLE).find(hh => ALLE[hh] === x.resourceId) || 'x'); lauf(x.items || []); } })(format);
  ist('Nachlese-Modus: neue Ids und Adressen sind in Ordnung', pruefeRucksack(MENU, format, ALLE, { nachlesen: true }), []);
  ist('Gegenprobe: derselbe Baum ohne Nachlese-Modus meldet die Köpfe/Ränder als verändert (Ids/Adressen)', pruefeRucksack(MENU, format, ALLE).length > 0, true);
  const damen = kopie(format); taschen(damen).find(x => x.title === 'Damen: Handtaschen').resourceId = taschen(damen).find(x => x.title === 'Damen: Umhänge- & Schultertaschen').resourceId;
  ist('Nachlese-Modus: zwei Damen-Ziele vertauscht → gemeldet', hat(pruefeRucksack(MENU, damen, ALLE, { nachlesen: true }), 'ausserhalb der Rucksack-Köpfe'), true);
  const kind = kopie(format); { const ks = taschen(kind).find(x => x.title === 'Rucksäcke').items; [ks[0].resourceId, ks[1].resourceId] = [ks[1].resourceId, ks[0].resourceId]; }
  ist('Nachlese-Modus: zwei Kinder-Ziele vertauscht (Titel stimmen noch) → gemeldet', hat(pruefeRucksack(MENU, kind, ALLE, { nachlesen: true }), 'Kinder von «Rucksäcke»'), true);
  const kopfT = kopie(format); taschen(kopfT).find(x => x.title === 'Rucksäcke').resourceId = GID('rucksaecke-motorrad');
  ist('Nachlese-Modus: Kopf «Rucksäcke» zeigt woanders hin → gemeldet', hat(pruefeRucksack(MENU, kopfT, ALLE, { nachlesen: true }), 'zeigt nicht auf'), true);
  const uhr = kopie(format); { const u = uhr.find(x => x.title === 'Uhren'); u.items[0].url = '/collections/anderswo'; u.items[0].type = 'HTTP'; delete u.items[0].resourceId; }
  ist('Nachlese-Modus: ein HTTP-Ziel im Ast Uhren geändert → gemeldet', hat(pruefeRucksack(MENU, uhr, ALLE, { nachlesen: true }), 'ausserhalb'), true);
}

// ── Die Läufe mit einer Attrappe der Shopify-Abfrage ──
const TMP = mkdtempSync(join(tmpdir(), 'rucksack-test-'));
const URL_VON_GID = Object.fromEntries(alleHandles().map(h => [GID(h), `/en/collections/${h}`]));
function attrappe({ collections = {}, kanaele = [{ isPublished: true, publication: { id: 'gid://pub/1', name: 'Online Store' } }], menuUpdateFehler = [], verfaelsche = false, nachSchreiben = null, beimLesen = null, menu = null, nachLeseFehler = false } = {}) {
  const z = { menu: kopie(menu || MENU_ROH), collections: kopie(collections), n: 0, pub: {}, gelesen: 0, geschrieben: false };
  const aufrufe = [];
  const lesbar = items => items.map(i => ({ id: i.id || `gid://shopify/MenuItem/neu-${++z.n}`, title: i.title, type: i.type, resourceId: i.resourceId ?? null, url: i.url ?? URL_VON_GID[i.resourceId] ?? (i.type === 'COLLECTION' ? '/collections/x' : null), tags: i.tags || [], items: lesbar(i.items || []) }));
  const q = async (query, v = {}) => {
    aufrufe.push({ query, v: kopie(v) });
    if (/menus\(first/.test(query)) { z.gelesen++; if (nachLeseFehler && z.geschrieben) throw new Error('Netzfehler beim Nachlesen'); if (beimLesen && beimLesen.nr === z.gelesen) z.menu = beimLesen.aendere(kopie(z.menu)); return { menus: { nodes: [kopie(z.menu)] } }; }
    if (/menuUpdate/.test(query)) {
      if (menuUpdateFehler.length) return { menuUpdate: { menu: null, userErrors: menuUpdateFehler } };
      z.menuUpdateVariablen = { id: v.id, t: v.t, h: v.h }; z.geschrieben = true;
      z.menu = { ...z.menu, items: lesbar(v.i) };
      if (verfaelsche) taschen(z.menu.items).find(x => x.title === 'Spezial-Rucksäcke').items.pop();
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
function webAttrappe(schlecht = {}) {
  const aufrufe = [];
  const web = async hs => { aufrufe.push([...hs]); return Object.fromEntries(hs.map(h => [h, schlecht[h] || { ok: true, status: 200, n: 3, grund: '' }])); };
  web.aufrufe = aufrufe;
  return web;
}
const sammlung = h => ({ id: GID(h), title: planTitel(h), productsCount: { count: 5 } });
const ALLE_COLL = Object.fromEntries(alleHandles().map(h => [h, sammlung(h)]));
const NUR_RUCKSAECKE = { rucksaecke: sammlung('rucksaecke') }; // der heutige Stand im Shop: nur die vorhandene Sammlung
const still = () => { const zeilen = []; return { zeilen, out: (...a) => zeilen.push(a.join(' ')), err: (...a) => zeilen.push('ERR ' + a.join(' ')) }; };
const dateien = n => ({ sicherung: join(TMP, n, 'menu-sicherung', 'vor-rucksaecke.json'), ledger: join(TMP, n, 'ledger.txt') });
const frisch = n => { mkdirSync(join(TMP, n), { recursive: true }); return dateien(n); };

// Menü-Lauf: Trockenlauf
{
  const a = attrappe({ collections: NUR_RUCKSAECKE }), s = still(), d = frisch('m1');
  const r = await rucksackMenueLauf(a.q, { live: false, ...d, out: s.out, err: s.err });
  ist('Menü-Trockenlauf (Ist-Stand im Shop): Exit 0, nichts geschrieben, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung), existsSync(d.ledger)], [0, 0, false, false]);
  ist('…meldet die 16 fehlenden Collections und zeigt die Vorschau', [r.fehlend.length, s.zeilen.some(z => z.includes('VORSCHAU')), s.zeilen.some(z => z.startsWith('fehlt'))], [16, true, true]);
}
{
  const a = attrappe({ collections: NUR_RUCKSAECKE }), s = still(), d = frisch('m2');
  const r = await rucksackMenueLauf(a.q, { live: false, annahmeAlle: true, ...d, out: s.out, err: s.err });
  ist('Menü-Trockenlauf mit ANNAHME_ALLE: Zielbild mit drei Köpfen und 14 Kindern, nichts geschrieben', [r.code, titel(taschen(r.baum)).filter(t => KOPF_TITEL.includes(t)), taschen(r.baum).filter(x => KOPF_TITEL.includes(x.title)).reduce((n, k) => n + k.items.length, 0), a.schreibend().length], [0, KOPF_TITEL, 14, 0]);
  ist('…die Vorschau nennt den Ast, die Annahme und einen Kopf', [s.zeilen.some(z => z.includes('ANNAHME_ALLE')), s.zeilen.some(z => z.includes('· Spezial-Rucksäcke')), s.zeilen.some(z => z.includes('VORSCHAU des Astes «Taschen & Rucksäcke»'))], [true, true, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m3');
  const r = await rucksackMenueLauf(a.q, { live: true, annahmeAlle: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('LIVE zusammen mit ANNAHME_ALLE wird abgelehnt (Exit 1), nichts gelesen oder geschrieben', [r.code, a.aufrufe.length], [1, 0]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m3b');
  const r = await rucksackMenueLauf(a.q, { live: true, ...d, out: s.out, err: s.err });
  ist('LIVE ohne HTTP-Prüfung wird abgelehnt (Exit 1), nichts gelesen oder geschrieben', [r.code, a.aufrufe.length], [1, 0]);
}
{
  const a = attrappe({ collections: NUR_RUCKSAECKE }), s = still(), d = frisch('m4');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('LIVE mit fehlenden Collections: Exit 2, nichts geschrieben, keine Sicherung (sonst fielen Teile des Menüs ersatzlos weg)', [r.code, a.schreibend().length, existsSync(d.sicherung)], [2, 0, false]);
  ist('…die Meldung nennt den Weg dorthin', s.zeilen.some(z => z.includes('ERR') && z.includes('rucksaecke_gruppen.mjs')), true);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m5');
  const web = webAttrappe(), r = await rucksackMenueLauf(a.q, { live: true, web, ...d, jetzt: () => new Date('2026-10-28T08:00:00Z'), out: s.out, err: s.err });
  ist('LIVE, alles da: Exit 0, genau ein menuUpdate, HTTP-Prüfung für alle 17 Ziele', [r.code, a.schreibend().length, web.aufrufe[0].length], [0, 1, 17]);
  ist('Sicherung = das gelesene Menü vor dem Umbau, Eintrag für Eintrag (nicht nur die oberste Ebene); Ledger-Zeile geschrieben', [JSON.stringify(JSON.parse(readFileSync(d.sicherung, 'utf8')).items) === JSON.stringify(MENU_ROH.items), readFileSync(d.ledger, 'utf8').includes('menü rucksäcke umgebaut')], [true, true]);
  ist('Sicherung unterscheidet sich vom neuen Menü (Gegenprobe: der Taschen-Ast hatte vorher die drei alten Einträge)', [taschen(JSON.parse(readFileSync(d.sicherung, 'utf8')).items).some(x => x.title === 'Schulrucksäcke'), taschen(a.z.menu.items).some(x => x.title === 'Schulrucksäcke')], [true, false]);
  ist('menuUpdate bekommt Menü-Id, Titel und Handle des gelesenen Menüs unverändert', a.z.menuUpdateVariablen, { id: MENU_ROH.id, t: MENU_ROH.title, h: MENU_ROH.handle });
  ist('im Shop steht danach der Zielbaum: drei Köpfe, der umgehängte Elektronik-Eintrag, alles andere gleich', [titel(taschen(a.z.menu.items)).filter(t => KOPF_TITEL.includes(t)), handleVon(suche(a.z.menu.items, ['Elektronik', 'Büro & Home Office', 'Laptop- & Business-Rucksäcke']))], [KOPF_TITEL, 'laptop-business-rucksaecke']);
  const gesendet = a.schreibend()[0].v.i;
  ist('gesendet: unveränderte Einträge behalten ihre Ids («Damen», «Reisegepäck»), neue Köpfe haben keine', [gesendet.find(x => x.title === 'Damen').id === MENU.find(x => x.title === 'Damen').id, taschen(gesendet).find(x => x.title === 'Reisegepäck').id === taschen(MENU).find(x => x.title === 'Reisegepäck').id, taschen(gesendet).find(x => x.title === 'Spezial-Rucksäcke').id], [true, true, undefined]);
  // Zweiter Lauf auf dem umgebauten Menü: dieselbe Wirkung, die Sicherung bekommt einen Zeitstempel (nie überschreiben)
  const r2 = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, jetzt: () => new Date('2026-10-28T09:00:00Z'), out: s.out, err: s.err });
  ist('zweiter LIVE-Lauf: Exit 0, die erste Sicherung bleibt, die zweite trägt einen Zeitstempel, die Köpfe stehen weiter genau einmal', [r2.code, existsSync(d.sicherung), existsSync(d.sicherung.replace('.json', '-2026-10-28T09-00-00-000Z.json')), taschen(a.z.menu.items).filter(x => KOPF_TITEL.includes(x.title)).length], [0, true, true, 3]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m6');
  const web = webAttrappe({ 'rucksaecke-motorrad': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } });
  const r = await rucksackMenueLauf(a.q, { live: true, web, ...d, out: s.out, err: s.err });
  ist('LIVE: eine Collection ist im Onlineshop nicht erreichbar → zählt wie fehlend, Exit 2, nichts geschrieben', [r.code, a.schreibend().length, r.fehlend], [2, 0, ['rucksaecke-motorrad']]);
  ist('…die Meldung nennt den Handle und den Grund', s.zeilen.some(z => z.includes('rucksaecke-motorrad') && z.includes('HTTP 404')), true);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('m7');
  const r = await rucksackMenueLauf(a.q, { live: true, erlaubeLuecken: true, web: webAttrappe({ 'rucksaecke-motorrad': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } }), ...d, out: s.out, err: s.err });
  ist('ERLAUBE_LUECKEN: mit der Lücke wird geschrieben (Exit 0), der Eintrag fehlt im Ast', [r.code, a.schreibend().length, taschen(a.z.menu.items).find(x => x.title === 'Spezial-Rucksäcke').items.length], [0, 1, 2]);
}
{
  const a = attrappe({ collections: ALLE_COLL, beimLesen: { nr: 2, aendere: m => { m.items.find(x => x.title === 'Damen').title = 'Damen (neu)'; return m; } } }), s = still(), d = frisch('m8');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('das Menü ändert sich zwischen Lesen und Schreiben → Exit 4, nichts geschrieben, keine Sicherung', [r.code, a.schreibend().length, existsSync(d.sicherung)], [4, 0, false]);
}
{
  const a = attrappe({ collections: ALLE_COLL, menuUpdateFehler: [{ field: ['items'], message: 'zu tief', code: 'INVALID' }] }), s = still(), d = frisch('m9');
  let msg = null; try { await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err }); } catch (e) { msg = e.message; }
  ist('menuUpdate meldet einen userError → der Lauf wirft, die Sicherung liegt vor, kein Ledger-Eintrag', [typeof msg === 'string' && msg.includes('zu tief'), existsSync(d.sicherung), existsSync(d.ledger)], [true, true, false]);
}
{
  const a = attrappe({ collections: ALLE_COLL, verfaelsche: true }), s = still(), d = frisch('m10');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Shopify verliert beim Schreiben ein Kind → Nachlesen: Exit 3, Sicherung liegt vor, kein Ledger-Eintrag', [r.code, existsSync(d.sicherung), existsSync(d.ledger)], [3, true, false]);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { const t = taschen(m.items); const k = t.find(x => x.title === 'Rucksäcke').items; [k[0].resourceId, k[1].resourceId] = [k[1].resourceId, k[0].resourceId]; return m; } }), s = still(), d = frisch('m11');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Shopify vertauscht zwei Kinder-Ziele (Titel stimmen) → Exit 3', r.code, 3);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { const t = taschen(m.items); t.find(x => x.title === 'Damen: Handtaschen').resourceId = t.find(x => x.title === 'Damen: Shopper & Tragetaschen').resourceId; return m; } }), s = still(), d = frisch('m12');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Shopify vertauscht zwei Ziele ausserhalb der Köpfe (Damen-Taschen) → Exit 3', r.code, 3);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachSchreiben: m => { (function lauf(l) { for (const i of l) { if (i.type === 'COLLECTION') i.url = 'https://luxestyle.ch/en' + i.url.replace(/^https:\/\/luxestyle\.ch\/en/, ''); if (i.type === 'HTTP' && i.url?.startsWith('/')) i.url = 'https://luxestyle.ch/en' + i.url; lauf(i.items); } })(m.items); return m; } }), s = still(), d = frisch('m13');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Shopify liefert Adressen mit Host und Sprachpräfix → kein Fehlalarm (Exit 0)', r.code, 0);
}


// Härtung nach der unabhängigen Prüfung (28.10.2026)
{
  const mitExtra = kopie(MENU_ROH); suche(mitExtra.items, PFAD).items.push({ id: 'gid://shopify/MenuItem/extra-1', title: 'Rucksack-Angebote', type: 'HTTP', resourceId: null, url: '/collections/rucksaecke?filter.p.tag=sale', tags: [], items: [] });
  const a = attrappe({ collections: ALLE_COLL, menu: mitExtra }), s = still(), d = frisch('h1');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('zusätzlicher Link auf /collections/rucksaecke im Ast: Exit 2, nichts geschrieben (er würde sonst still verschwinden)', [r.code, a.schreibend().length, existsSync(d.sicherung), s.zeilen.some(z => z.includes('mehrere Einträge für rucksaecke'))], [2, 0, false, true]);
  ist('…und der Fund steht auch in der reinen Prüfung', hat(pruefeRucksack(eingabeAus(mitExtra.items), rucksackMenue(eingabeAus(mitExtra.items), ALLE).baum, ALLE), 'mehrere Einträge für rucksaecke'), true);
}
{
  const mitKind = kopie(MENU_ROH); suche(mitKind.items, [...PFAD, 'Schulrucksäcke']).items.push({ id: 'gid://shopify/MenuItem/kind-1', title: 'Grundschule', type: 'COLLECTION', resourceId: 'gid://shopify/Collection/grundschule', url: '/en/collections/grundschule', tags: [], items: [] });
  const a = attrappe({ collections: ALLE_COLL, menu: mitKind }), s = still(), d = frisch('h2');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Unterpunkt unter einem ersetzten Eintrag: Exit 2, nichts geschrieben (er ginge sonst verloren)', [r.code, a.schreibend().length, s.zeilen.some(z => z.includes('Grundschule') && z.includes('Unterpunkte'))], [2, 0, true]);
  // Wiederholung mit einem von Hand ergänzten Kind unter einem Kopf (Zustand nach dem Umbau)
  const fertig = attrappe({ collections: ALLE_COLL }), s2 = still();
  await rucksackMenueLauf(fertig.q, { live: true, web: webAttrappe(), ...frisch('h2b'), out: s2.out, err: s2.err });
  const nachher = kopie(fertig.z.menu); taschen(nachher.items).find(x => x.title === 'Spezial-Rucksäcke').items.push({ id: 'gid://shopify/MenuItem/hand-1', title: 'Von Hand', type: 'COLLECTION', resourceId: 'gid://shopify/Collection/von-hand', url: '/en/collections/von-hand', tags: [], items: [] });
  const wieder = attrappe({ collections: ALLE_COLL, menu: nachher }), s3 = still();
  const r3 = await rucksackMenueLauf(wieder.q, { live: true, web: webAttrappe(), ...frisch('h2c'), out: s3.out, err: s3.err });
  ist('Wiederholung auf dem umgebauten Menü mit einem von Hand ergänzten Kind unter einem Kopf: Exit 2 statt stilles Löschen', [r3.code, wieder.schreibend().length], [2, 0]);
  const ohne = attrappe({ collections: ALLE_COLL, menu: fertig.z.menu }), s4 = still();
  const r4 = await rucksackMenueLauf(ohne.q, { live: true, web: webAttrappe(), ...frisch('h2d'), out: s4.out, err: s4.err });
  ist('Wiederholung auf dem unveränderten umgebauten Menü: Exit 0 und derselbe Baum (kein Fehlalarm der neuen Prüfung)', [r4.code, gleicheZiele(eingabeAus(ohne.z.menu.items), eingabeAus(fertig.z.menu.items)).gleich], [0, true]);
}
{
  const mitLink = kopie(MENU_ROH); suche(mitLink.items, PFAD).items.push({ id: 'gid://shopify/MenuItem/link-1', title: 'Taschen Sale', type: 'HTTP', resourceId: null, url: '/collections/taschen-sale', tags: [], items: [] });
  const a = attrappe({ collections: ALLE_COLL, menu: mitLink }), s = still(), d = frisch('h3');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('ein fremder HTTP-Link im Ast blockiert den Umbau nicht (Exit 0) und bleibt stehen', [r.code, taschen(a.z.menu.items).some(x => x.title === 'Taschen Sale')], [0, true]);
}
{
  const R2 = rucksackMenue(MENU, ALLE).baum;
  const ohneKopf = kopie(R2); taschen(ohneKopf).splice(taschen(ohneKopf).findIndex(x => x.title === 'Spezial-Rucksäcke'), 1);
  ist('ein Kopf fehlt im Baum, obwohl seine Collection da ist → gemeldet', hat(pruefeRucksack(MENU, ohneKopf, ALLE), 'Kopf «Spezial-Rucksäcke» fehlt'), true);
  const alleWeg = kopie(R2); suche(alleWeg, PFAD).items = suche(alleWeg, PFAD).items.filter(x => !KOPF_TITEL.includes(x.title));
  ist('alle drei Köpfe fehlen → gemeldet (dreimal)', pruefeRucksack(MENU, alleWeg, ALLE).filter(f => f.includes('fehlt im Ast')).length, 3);
  const altStehen = kopie(R2); taschen(altStehen).push(kopie(taschen(MENU).find(x => x.title === 'Schulrucksäcke')));
  ist('ein alter Eintrag steht zusätzlich im neuen Baum → gemeldet', pruefeRucksack(MENU, altStehen, ALLE).length > 0, true);
  ist('Gegenprobe: fehlt auch die Collection des Kopfes, ist ein fehlender Kopf kein Prüffehler (das meldet `fehlend`)', hat(pruefeRucksack(MENU, rucksackMenue(MENU, { ...ALLE, 'rucksaecke-spezial-gruppe': null }).baum, { ...ALLE, 'rucksaecke-spezial-gruppe': null }), 'fehlt im Ast'), false);
  ist('ERSETZT_ALLE enthält die drei alten Handles und die drei Köpfe (ohne Doppelte)', [ERSETZT_ALLE.length, [...ERSETZT].every(h => ERSETZT_ALLE.includes(h))], [5, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still(), d = frisch('h4');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe({ 'rucksaecke-spezial-gruppe': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } }), ...d, out: s.out, err: s.err });
  ist('Kopf-Sammlung im Onlineshop tot (Publish-Falle): Exit 2, nichts geschrieben', [r.code, a.schreibend().length, r.fehlend], [2, 0, ['rucksaecke-spezial-gruppe']]);
  const b = attrappe({ collections: ALLE_COLL }), s2 = still(), d2 = frisch('h5');
  const r2 = await rucksackMenueLauf(b.q, { live: true, web: webAttrappe({ rucksaecke: { ok: false, status: 200, n: 0, grund: 'leer' } }), ...d2, out: s2.out, err: s2.err });
  ist('Kopf «rucksaecke» leer im Onlineshop: Exit 2, nichts geschrieben', [r2.code, b.schreibend().length], [2, 0]);
}
{
  const a = attrappe({ collections: ALLE_COLL, menu: { ...MENU_ROH, handle: 'main-menu-entwurf' } }), s = still(), d = frisch('h6');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('die Suche liefert ein anderes Menü als «main-menu»: Exit 1, nichts geschrieben', [r.code, a.schreibend().length], [1, 0]);
}
{
  const a = attrappe({ collections: ALLE_COLL, nachLeseFehler: true }), s = still(), d = frisch('h7');
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('Netzfehler beim Nachlesen NACH dem Schreiben: Exit 3 (nicht 1), Hinweis auf die Sicherung, Menü ist umgebaut', [r.code, existsSync(d.sicherung), s.zeilen.some(z => z.includes('NACH dem Schreiben') && z.includes('Sicherung')), a.z.geschrieben], [3, true, true, true]);
}
{
  const a = attrappe({ collections: ALLE_COLL }), s = still();
  const r = await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), sicherung: join(TMP, 'h8', 'sich.json'), ledger: join(TMP, 'gibt-es-nicht', 'ledger.txt'), out: s.out, err: s.err });
  ist('Ledger-Eintrag scheitert nach dem Nachlesen: Exit 0 mit Hinweis (das Menü ist in Ordnung)', [r.code, s.zeilen.some(z => z.includes('Ledger-Eintrag ging nicht'))], [0, true]);
}
{
  const a = attrappe({ collections: { ...ALLE_COLL, 'laptop-business-rucksaecke': { id: GID('laptop-business-rucksaecke'), title: 'Laptop-Rucksäcke (Shop-Titel)', productsCount: { count: 5 } } } }), s = still(), d = frisch('h9');
  await rucksackMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: s.out, err: s.err });
  ist('der Titel der Collection im Shop gewinnt vor dem Plan-Titel (Menükind trägt den Shop-Titel)', taschen(a.z.menu.items).find(x => x.title === 'Rucksäcke').items[0].title, 'Laptop-Rucksäcke (Shop-Titel)');
}
// Schalter aus der Umgebung: Trockenlauf ist Vorgabe
{
  const web = () => 'web';
  ist('Menü-Schalter: ohne Umgebung kein LIVE, keine Annahme, keine Lücken, keine HTTP-Prüfung', menueOptionen({}, web), { live: false, annahmeAlle: false, erlaubeLuecken: false, web: null });
  ist('Menü-Schalter: LIVE=1 schreibt und prüft HTTP; LIVE=0 oder «true» zählt nicht als LIVE', [menueOptionen({ LIVE: '1' }, web).live, menueOptionen({ LIVE: '1' }, web).web === web, menueOptionen({ LIVE: '0' }, web).live, menueOptionen({ LIVE: 'true' }, web).live], [true, true, false, false]);
  ist('Menü-Schalter: WEB_PRUEFEN=1 prüft im Trockenlauf, schreibt aber nicht', [menueOptionen({ WEB_PRUEFEN: '1' }, web).live, menueOptionen({ WEB_PRUEFEN: '1' }, web).web === web], [false, true]);
  ist('Menü-Schalter: ANNAHME_ALLE und ERLAUBE_LUECKEN nur mit «1»', [menueOptionen({ ANNAHME_ALLE: '1' }, web).annahmeAlle, menueOptionen({ ERLAUBE_LUECKEN: '1' }, web).erlaubeLuecken, menueOptionen({ ANNAHME_ALLE: 'ja' }, web).annahmeAlle], [true, true, false]);
  ist('Gruppen-Schalter: ohne Umgebung Trockenlauf ohne HTTP-Prüfung; LIVE=1 schreibt und prüft; WEB_PRUEFEN=1 nur prüfen', [gruppenOptionen({}, web), gruppenOptionen({ LIVE: '1' }, web).live, gruppenOptionen({ LIVE: '1' }, web).web === web, gruppenOptionen({ WEB_PRUEFEN: '1' }, web).live], [{ live: false, web: null }, true, true, false]);
}

// Gruppen-Läufe
{
  const a = attrappe({ collections: NUR_RUCKSAECKE }), s = still();
  const r = await rucksackGruppenLauf(a.q, { live: false, out: s.out, err: s.err });
  ist('Gruppen-Trockenlauf: Exit 0, zwei Gruppen «neu», nichts geschrieben', [r.code, r.ergebnis.map(e => [e.handle, e.status]), a.schreibend().length], [0, [['rucksaecke-spezial-gruppe', 'neu'], ['rucksaecke-material-gruppe', 'neu']], 0]);
  ist('…die 7 Kinder mit Kategorie sind «noch nicht angelegt», es sind genau die 7 Kinder der zwei Gruppen', [r.kinder.length, r.kinder.every(k => !k.imShop && k.tag === 'sort-' + k.handle)], [7, true]);
  ist('…die Tabelle nennt die Handles der zwei Gruppen', [s.zeilen.some(z => z.startsWith('rucksaecke-spezial-gruppe')), s.zeilen.some(z => z.startsWith('rucksaecke-material-gruppe'))], [true, true]);
}
{
  const a = attrappe({ collections: NUR_RUCKSAECKE }), s = still();
  const r = await gruppenLauf(a.q, { live: false, out: s.out, err: s.err });
  ist('Gegenprobe: gruppenLauf ohne eingespeisten Plan bleibt beim Schmuck-Plan (6 Gruppen)', r.ergebnis.map(e => e.handle), ['schmuck-herren-gruppe', 'schmuck-personalisiert-gruppe', 'schmuck-motiv-gruppe', 'schmuck-stil-gruppe', 'schmuck-sets-gruppe', 'schmuck-zubehoer-gruppe']);
}
// Mitgliederzahlen aus einem kleinen Katalog: die Zahlen kommen aus den Rucksack-Kategorien (nicht aus Schmuck)
{
  const BP = 'Luggage & Bags > Backpacks';
  const katalog = { produkte: [
    { title: 'Drohnen-Rucksack mit Hartschale', tags: ['sort-foto-drohnen-rucksaecke'], g: BP },
    { title: 'Taktischer Tarn Rucksack 3P', tags: [], g: BP },
    { title: 'Wasserdichter Wanderrucksack 40L', tags: [], g: BP },
    { title: 'Silberring für Damen', tags: [], g: 'Apparel & Accessories > Jewelry > Rings' },
  ] };
  const a = attrappe({ collections: NUR_RUCKSAECKE }), s = still();
  const r = await rucksackGruppenLauf(a.q, { live: false, katalog, out: s.out, err: s.err });
  const kind = h => r.kinder.find(k => k.handle === h);
  ist('Mini-Katalog: erwartete Mitglieder je Gruppe (Spezial: Drohne + Tarn = 2; Material: wasserdicht = 1)', r.ergebnis.map(e => [e.handle, e.erwartet]), [['rucksaecke-spezial-gruppe', 2], ['rucksaecke-material-gruppe', 1]]);
  ist('…je Kind: passen / tragen das Tag schon', [kind('foto-drohnen-rucksaecke').passen, kind('foto-drohnen-rucksaecke').tragenTag, kind('taktische-tarn-rucksaecke').passen, kind('taktische-tarn-rucksaecke').tragenTag, kind('wasserdichte-rucksaecke').passen], [1, 1, 1, 0, 1]);
  ist('…die Spalten PASSEN/TRAGEN-TAG erscheinen in der Tabelle', s.zeilen.some(z => z.includes('PASSEN')), true);
}
const KIND_COLL = Object.fromEntries(AESTE.filter(x => x.gruppe).flatMap(x => x.kinder).map(h => [h, { id: GID(h), title: planTitel(h), productsCount: { count: 40 }, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'sort-' + h }] } }]));
{
  const a = attrappe({ collections: { ...NUR_RUCKSAECKE, ...KIND_COLL } }), s = still(), d = frisch('g1');
  const r = await rucksackGruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, warte: async () => {}, out: s.out, err: s.err });
  const erstellt = a.schreibend().filter(x => /collectionCreate/.test(x.query)).map(x => x.v.i);
  ist('Gruppen-LIVE: Exit 0, genau zwei Sammlungen angelegt und publiziert', [r.code, erstellt.map(i => i.handle), a.schreibend().filter(x => /publishablePublish/.test(x.query)).length], [0, ['rucksaecke-spezial-gruppe', 'rucksaecke-material-gruppe'], 2]);
  ist('…Regel ODER über die Tags der Kinder, Sortierung BEST_SELLING, Titel und SEO', erstellt.map(i => [i.ruleSet.appliedDisjunctively, i.ruleSet.rules.length, i.sortOrder, i.title, /online kaufen/.test(i.seo.title)]), [[true, 3, 'BEST_SELLING', 'Spezial-Rucksäcke', true], [true, 4, 'BEST_SELLING', 'Rucksäcke nach Material & Ausstattung', true]]);
  ist('…Ledger-Zeilen «angelegt <handle>»', readFileSync(d.ledger, 'utf8').split('\n').filter(Boolean).map(z => z.split(' · ')[1]), ['angelegt rucksaecke-spezial-gruppe', 'angelegt rucksaecke-material-gruppe']);
  const r2 = await rucksackGruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, warte: async () => {}, out: s.out, err: s.err });
  ist('Wiederholung: Exit 0, es wird nichts mehr angelegt (idempotent)', [r2.code, a.schreibend().filter(x => /collectionCreate/.test(x.query)).length], [0, 2]);
}
{
  const a = attrappe({ collections: { ...NUR_RUCKSAECKE, ...KIND_COLL, 'rucksaecke-spezial-gruppe': { id: GID('x'), title: 'Fremd', productsCount: { count: 1 }, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'tarn' }] } } } }), s = still(), d = frisch('g2');
  const r = await rucksackGruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, warte: async () => {}, out: s.out, err: s.err });
  ist('Handle mit anderer Regel belegt → Exit 2, nichts überschrieben, nichts geschrieben', [r.code, a.schreibend().length], [2, 0]);
}
{
  const falsch = kopie(KIND_COLL); falsch['rucksaecke-motorrad'].ruleSet.rules[0].condition = 'sort-anderes';
  const a = attrappe({ collections: { ...NUR_RUCKSAECKE, ...falsch } }), s = still(), d = frisch('g3');
  const r = await rucksackGruppenLauf(a.q, { live: true, web: webAttrappe(), ledger: d.ledger, warte: async () => {}, out: s.out, err: s.err });
  ist('ein Kind trägt nicht das Tag der Engine → Exit 2, nichts geschrieben (die Gruppe verfehlte seine Mitglieder)', [r.code, a.schreibend().length], [2, 0]);
}
{
  const a = attrappe({ collections: { ...NUR_RUCKSAECKE, ...KIND_COLL } }), s = still(), d = frisch('g4');
  const r = await rucksackGruppenLauf(a.q, { live: true, web: webAttrappe({ 'rucksaecke-material-gruppe': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } }), ledger: d.ledger, warte: async () => {}, out: s.out, err: s.err });
  ist('eine neue Sammlung ist im Onlineshop nicht erreichbar → Exit 2 (das Menü darf sie nicht verlinken)', r.code, 2);
}
{
  const a = attrappe({ collections: { ...NUR_RUCKSAECKE, ...KIND_COLL } }), s = still();
  const r = await rucksackGruppenLauf(a.q, { live: true, out: s.out, err: s.err });
  ist('Gruppen-LIVE ohne HTTP-Prüfung wird abgelehnt (Exit 1), nichts geschrieben', [r.code, a.schreibend().length], [1, 0]);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
