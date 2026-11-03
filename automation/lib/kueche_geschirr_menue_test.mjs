// Tests der Trennung «Küche & Kochen» / «Geschirr & Tisch» (lib/kueche_geschirr_menue.mjs), des Menü-Laufs (kueche_geschirr_menue.mjs) und des Sammlungs-Laufs (kueche_geschirr_gruppen.mjs).
// Das Test-Menü ist das echte Hauptmenü vom 03.11.2026 (dropship/taxonomie-2610-b/orakel/menue-main-0311.json, 19 Punkte, 3 Ebenen, nach dem Rucksack-Umbau).
// Netz gibt es nicht: die Läufe sprechen mit einer Attrappe der Shopify-Abfrage. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GRUPPEN, OBER, KUECHE, GESCHIRR, KURZ, VERSCHOBEN, ELTERN, MAX_TITEL, FUSS, neueHandles, handleVon, ziele, kuecheGeschirrMenue, pruefeUmbau, titelWarnungen, gruppenPlan, erwartetAus, seoText, sammlungsTitel, rueckgaengigEingabe } from './kueche_geschirr_menue.mjs';
import { eingabeAus } from '../menu_eintrag_einfuegen.mjs';
import { kuecheGeschirrMenueLauf, optionenAusEnv as menueOptionen } from '../kueche_geschirr_menue.mjs';
import { kuecheGeschirrGruppenLauf, planLesen, tagAusRegel, optionenAusEnv as gruppenOptionen } from '../kueche_geschirr_gruppen.mjs';
import { kuecheGeschirrZurueckLauf, optionenAusEnv as zurueckOptionen } from '../kueche_geschirr_zurueck.mjs';
import { gleicherBaum, gleicheZiele } from './menue_plan.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const kopie = x => JSON.parse(JSON.stringify(x));
const hat = (liste, teil) => liste.some(f => f.includes(teil));

const MENU_ROH = JSON.parse(readFileSync(new URL('../../dropship/taxonomie-2610-b/orakel/menue-main-0311.json', import.meta.url)));
const ALT = eingabeAus(MENU_ROH.items);
const NEU_GID = h => 'gid://shopify/Collection/test-' + h;
const GIDS = {};
for (const g of ALT.find(x => x.title === ELTERN).items) { const h = handleVon(g); GIDS[h] = g.resourceId; for (const c of g.items) GIDS[handleVon(c)] = c.resourceId; }
for (const h of neueHandles()) GIDS[h] = NEU_GID(h);
const wohnen = b => b.find(x => x.title === ELTERN);
const titel = l => l.map(x => x.title);
const gut = () => kuecheGeschirrMenue(ALT, GIDS, {});

// ── Der Auftrag ──
ist('fünf Gruppen, zwei Köpfe, sieben neue Sammlungen (alle Handles verschieden)', [GRUPPEN.length, OBER.length, neueHandles().length, new Set(neueHandles()).size], [5, 2, 7, 7]);
ist('die Köpfe: «Küche & Kochen» mit Kochen/Küchenhelfer/Küchengeräte, «Geschirr & Tisch» mit Geschirr/Kaffee', OBER.map(o => [o.titel, GRUPPEN.filter(g => g.ober === o.ober).map(g => g.titel)]),
  [['Küche & Kochen', ['Kochen, Grillen & Backen', 'Küchenhelfer & Vorrat', 'Küchengeräte']], ['Geschirr & Tisch', ['Geschirr, Besteck & Tisch', 'Kaffee, Tee & Trinken']]]);
ist('alle fünf Gruppen stehen im echten Menü unter «Wohnen & Garten» (mit Kopf-Ziel und Kindern)', GRUPPEN.map(g => { const x = wohnen(ALT).items.find(y => y.title === g.titel); return !!(x && handleVon(x) && x.items.length); }), [true, true, true, true, true]);
ist('keiner der sieben neuen Handles kommt irgendwo im heutigen Menü vor (nichts doppelt)', neueHandles().filter(h => JSON.stringify(ALT).includes('/collections/' + h + '"')), []);
ist('Menütitel: jeder neue Kopf, jede Gruppe und jeder Kurztitel höchstens 34 Zeichen', [...OBER.map(o => o.titel), ...GRUPPEN.map(g => g.titel), ...Object.values(KURZ)].filter(t => t.length > MAX_TITEL), []);
ist('13 Gruppen bleiben in «Wohnen & Garten» (18 − 5)', wohnen(ALT).items.filter(g => !GRUPPEN.some(x => x.titel === g.title)).length, 13);
ist('das verschobene Kind ist das alte Kopf-Ziel von «Kaffee, Tee & Trinken» und kommt hinter das erste Kind von «Küchengeräte»', [VERSCHOBEN.length, VERSCHOBEN[0].handle === handleVon(wohnen(ALT).items.find(y => y.title === VERSCHOBEN[0].von)),
  KURZ[handleVon(wohnen(ALT).items.find(y => y.title === VERSCHOBEN[0].nach))] === VERSCHOBEN[0].hinter], [1, true, true]);
ist('Sammlungstitel: kein neuer Titel kollidiert mit den Titeln, die der Shop am 03.11. schon trägt («Küche & Kochen» 2×: sub-kueche und das umgeleitete kuche-kochen)', [sammlungsTitel(KUECHE), OBER.concat(GRUPPEN).map(sammlungsTitel).filter(t => t === 'Küche & Kochen')], ['Küchenbedarf & Kochzubehör', []]);
ist('Sammlungstitel + « online kaufen | LuxeStyle CH» höchstens 60 Zeichen (Titel-Tag)', [...OBER, ...GRUPPEN].map(o => `${sammlungsTitel(o)} online kaufen | LuxeStyle CH`).filter(t => t.length > 60), []);
ist('Meta-Texte: alle sieben höchstens 160 Zeichen, mit Versandsatz und Titel vorn', [...OBER, ...GRUPPEN].map(o => seoText(sammlungsTitel(o), o.kurz)).filter(t => t.length > 160 || !t.endsWith(FUSS) || !t.includes(' online kaufen.')), []);
ist('seoText: zu langer Kurztext fällt weg, der Versandsatz bleibt', [seoText('Titel', 'x'.repeat(200)) === `Titel online kaufen. ${FUSS}`, seoText('Titel', 'kurz') === `Titel online kaufen. kurz ${FUSS}`], [true, true]);
ist('Belegpflicht der Texte (Katalog 03.11.): «Zangen» steht in keinem Text (0 Titel), «Kochlöffel» auch nicht', [...OBER, ...GRUPPEN].filter(o => /zange|kochlöffel|schöpfer/i.test(o.beschreibung + o.kurz)).map(o => o.handle), []);
ist('KURZ nennt nur Kopf-Ziele der fünf Gruppen', Object.keys(KURZ).every(h => GRUPPEN.some(g => handleVon(wohnen(ALT).items.find(y => y.title === g.titel)) === h)), true);
ist('die ausgeschlossenen Kinder (waagen, haushaltsgeraete) stehen im Menü unter ihrer Gruppe', [GRUPPEN.flatMap(g => g.ausser)].map(a => a.every(h => JSON.stringify(wohnen(ALT)).includes('/collections/' + h + '"'))), [true]);
ist('handleVon: Adresse mit und ohne Sprachpräfix, Abfrage, Domain, kein Collection-Link', [handleVon({ url: '/en/collections/pfannen-woks' }), handleVon({ url: '/collections/tassen?x=1' }), handleVon({ url: 'https://luxestyle.ch/collections/Sub-Kueche' }), handleVon({ url: '/pages/x' }), handleVon({})],
  ['pfannen-woks', 'tassen', 'sub-kueche', null, null]);

// ── Der Umbau ──
{
  const { baum, log, fehler } = gut();
  ist('Umbau ohne Fehler', fehler, []);
  ist('oberste Ebene 19 → 21, die drei Köpfe an der Stelle von «Wohnen & Garten»', [ALT.length, baum.length, titel(baum).slice(8, 11)], [19, 21, ['Küche & Kochen', 'Geschirr & Tisch', 'Wohnen & Garten']]);
  ist('übrige oberste Einträge unverändert und in gleicher Reihenfolge', titel(baum).filter(t => ![KUECHE.titel, GESCHIRR.titel].includes(t)), titel(ALT));
  const k = baum.find(x => x.title === KUECHE.titel), g = baum.find(x => x.title === GESCHIRR.titel);
  ist('Kopf-Ziele sind die neuen Sammlungen', [k.resourceId, g.resourceId, k.type, g.type], [NEU_GID('kueche-kochen'), NEU_GID('geschirr-tisch'), 'COLLECTION', 'COLLECTION']);
  ist('Gruppen unter den Köpfen in der Reihenfolge des Plans, Gruppenkopf zeigt auf die neue Gruppen-Sammlung', [titel(k.items), k.items.map(x => x.resourceId), titel(g.items), g.items.map(x => x.resourceId)],
    [GRUPPEN.slice(0, 3).map(x => x.titel), GRUPPEN.slice(0, 3).map(x => NEU_GID(x.handle)), GRUPPEN.slice(3).map(x => x.titel), GRUPPEN.slice(3).map(x => NEU_GID(x.handle))]);
  ist('das alte Kopf-Ziel steht als erstes Kind jeder Gruppe (mit Kurztitel), der Rest der Kinder bleibt; Ausnahme Kaffee: sein Kopf-Ziel wandert', GRUPPEN.map(def => {
    const alt = wohnen(ALT).items.find(x => x.title === def.titel), neu = [...k.items, ...g.items].find(x => x.title === def.titel);
    if (def.titel === 'Kaffee, Tee & Trinken') return [handleVon(neu.items[0]) === handleVon(alt.items[0]), neu.items.length === alt.items.length];
    const ohneWandernde = neu.items.filter(x => handleVon(x) !== VERSCHOBEN[0].handle);
    return [handleVon(ohneWandernde[0]) === handleVon(alt), ohneWandernde[0].title === (KURZ[handleVon(alt)] || alt.title), JSON.stringify(titel(ohneWandernde.slice(1))) === JSON.stringify(titel(alt.items))];
  }), [[true, true, true], [true, true, true], [true, true, true], [true, true, true], [true, true]]);
  ist('«Wasserkocher & Kaffeemaschinen» steht unter «Küchengeräte» als zweites Kind, nicht mehr unter «Kaffee, Tee & Trinken» und genau einmal im Menü', [
    titel(k.items[2].items).slice(0, 3), handleVon(g.items[1].items[0]), ziele(baum).filter(z => z === ziele([ALT.find(x => x.title === ELTERN).items.find(x => x.title === 'Kaffee, Tee & Trinken')])[0]).length],
    [['Mixer, Entsafter & Zerkleinerer', 'Wasserkocher & Kaffeemaschinen', 'Fritteusen, Kochfelder & Öfen'], 'teekannen-kaffeeservice', 1]);
  ist('Pfannen & Woks steht jetzt als sichtbarer Eintrag (vorher nur als Kopf-Link)', titel(k.items[0].items).slice(0, 2), ['Pfannen & Woks', 'Töpfe & Kochgeschirr-Sets']);
  ist('«Wohnen & Garten» behält 13 Gruppen in der BISHERIGEN Reihenfolge (Putzen & Haushalt zuerst), ihre Inhalte und Ids unverändert', [titel(wohnen(baum).items), wohnen(baum).items.every(x => JSON.stringify(x) === JSON.stringify(wohnen(ALT).items.find(y => y.title === x.title)))],
    [titel(wohnen(ALT).items).filter(t => !GRUPPEN.some(x => x.titel === t)), true]);
  ist('die ersten drei Gruppen des Rests sind die bisherigen Haushalts-Gruppen', titel(wohnen(baum).items).slice(0, 3), ['Putzen & Haushalt', 'Aufbewahrung & Möbel', 'Bad']);
  ist('«Wohnen & Garten» behält seine Ids und sein Ziel; die verschobenen Gruppen sind neue Einträge (ohne Id)', [wohnen(baum).id === wohnen(ALT).id, wohnen(baum).resourceId === wohnen(ALT).resourceId || wohnen(baum).url === wohnen(ALT).url, JSON.stringify([...k.items, ...g.items]).includes('"id"')], [true, true, false]);
  ist('Tiefe höchstens 3, kein Titel über 34 Zeichen, Log nennt die Verteilung', [pruefeUmbau(ALT, baum, GIDS), titelWarnungen([k, g]), log.join(' ').includes('18 Gruppen → «Küche & Kochen» 3 · «Geschirr & Tisch» 2 · «Wohnen & Garten» 13')], [[], [], true]);
  const mitTags = kopie(ALT); wohnen(mitTags).items.find(x => x.title === 'Kochen, Grillen & Backen').tags = ['t1']; wohnen(mitTags).items.find(x => x.title === 'Kaffee, Tee & Trinken').tags = ['t2'];
  const tg = kuecheGeschirrMenue(mitTags, GIDS, {});
  ist('Tags des alten Kopf-Eintrags bleiben am neuen ersten Kind (auch am wandernden), die Prüfung bleibt grün', [tg.baum.find(x => x.title === KUECHE.titel).items[0].items[0].tags, tg.baum.find(x => x.title === KUECHE.titel).items[2].items[1].tags, pruefeUmbau(mitTags, tg.baum, GIDS)], [['t1'], ['t2'], []]);
  ist('der Eingabebaum bleibt unverändert (reine Funktion)', JSON.stringify(ALT) === JSON.stringify(eingabeAus(MENU_ROH.items)), true);
  ist('jedes Ziel von vorher steht nachher genau so oft im Menü; neu sind nur die sieben Sammlungen', (() => {
    const z = l => l.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {}), a = z(ziele(ALT)), n = z(ziele(baum));
    return [Object.keys(a).filter(x => (n[x] || 0) !== a[x]), Object.keys(n).filter(x => !(x in a)).sort()];
  })(), [[], neueHandles().map(h => 'COLLECTION|' + NEU_GID(h)).sort()]);
  const zwei = kuecheGeschirrMenue(baum, GIDS, {});
  ist('zweiter Lauf auf dem umgebauten Baum: «schon umgebaut», nichts geändert', [zwei.fehler, JSON.stringify(zwei.baum) === JSON.stringify(baum)], [['schon umgebaut'], true]);
  const halb = kopie(baum).filter(x => x.title !== GESCHIRR.titel);
  ist('steht nur einer der zwei Köpfe: «halb umgebaut» mit dem Namen des fehlenden, nichts geändert', [hat(kuecheGeschirrMenue(halb, GIDS, {}).fehler, 'halb umgebaut'), hat(kuecheGeschirrMenue(halb, GIDS, {}).fehler, 'Geschirr & Tisch» fehlt')], [true, true]);
}
{
  const ohne = kuecheGeschirrMenue(ALT, { ...GIDS, 'geschirr-tisch': null }, {});
  ist('fehlt eine der sieben Sammlungen: Fehler, Baum unverändert', [hat(ohne.fehler, 'geschirr-tisch fehlt'), JSON.stringify(ohne.baum) === JSON.stringify(ALT)], [true, true]);
  const ohneZiel = kuecheGeschirrMenue(ALT, { ...GIDS, 'pfannen-woks': null }, {});
  ist('fehlt das alte Kopf-Ziel im Shop: Fehler', hat(ohneZiel.fehler, 'pfannen-woks'), true);
  const keineGruppe = kopie(ALT); wohnen(keineGruppe).items = wohnen(keineGruppe).items.filter(x => x.title !== 'Küchengeräte');
  ist('fehlt eine Gruppe im Menü: Fehler mit Namen', hat(kuecheGeschirrMenue(keineGruppe, GIDS, {}).fehler, 'Gruppe fehlt im Menü: Küchengeräte'), true);
  const kein = kopie(ALT).filter(x => x.title !== ELTERN);
  ist('fehlt «Wohnen & Garten»: Fehler', hat(kuecheGeschirrMenue(kein, GIDS, {}).fehler, 'nicht gefunden'), true);
  const doppelt = kopie(ALT); const gr = wohnen(doppelt).items.find(x => x.title === 'Küchengeräte'); gr.items.unshift({ ...kopie(gr), items: [], id: undefined });
  ist('steht das Kopf-Ziel schon unter den Kindern: Fehler (sonst käme es doppelt)', hat(kuecheGeschirrMenue(doppelt, GIDS, {}).fehler, 'steht schon unter den Kindern'), true);
  const fremd = kopie(ALT); wohnen(fremd).items.push({ title: 'Neue Gruppe X', type: 'COLLECTION', resourceId: 'gid://x/1', url: '/en/collections/x', items: [] });
  const fr = kuecheGeschirrMenue(fremd, GIDS, {});
  ist('eine unbekannte Gruppe bleibt erhalten und steht dort, wo sie stand (am Ende von «Wohnen & Garten»)', [fr.fehler, titel(wohnen(fr.baum).items).slice(-1)], [[], ['Neue Gruppe X']]);
  const keinHinter = kopie(ALT); const kg = wohnen(keinHinter).items.find(x => x.title === 'Küchengeräte'); kg.url = '/en/collections/anderes-ziel'; kg.resourceId = 'gid://x/55';
  ist('fehlt das Kind, hinter das «Wasserkocher» gehört: Fehler, nichts umgebaut', [hat(kuecheGeschirrMenue(keinHinter, { ...GIDS, 'anderes-ziel': 'gid://x/55' }, {}).fehler, 'kein Kind «Mixer, Entsafter & Zerkleinerer»')], [true]);
  const kaffeeOhneKopf = kopie(ALT); const kf = wohnen(kaffeeOhneKopf).items.find(x => x.title === 'Kaffee, Tee & Trinken'); kf.url = '/en/collections/anderes-ziel'; kf.resourceId = 'gid://x/56';
  ist('ist «Wasserkocher» nicht mehr der Kopf von «Kaffee, Tee & Trinken»: Fehler (nichts raten)', hat(kuecheGeschirrMenue(kaffeeOhneKopf, { ...GIDS, 'anderes-ziel': 'gid://x/56' }, {}).fehler, 'ist nicht der Kopf von'), true);
  ist('Kurztitel haben Vorrang, sonst der Shop-Titel, sonst der alte Gruppentitel', (() => {
    const t = kuecheGeschirrMenue(ALT, GIDS, { 'pfannen-woks': 'Shop-Titel', 'teekannen-kaffeeservice': 'X', 'wasserkocher-kaffeemaschinen': 'Zu lang lang lang lang lang lang lang lang' }).baum;
    const k = t.find(x => x.title === KUECHE.titel), g = t.find(x => x.title === GESCHIRR.titel);
    return [k.items[0].items[0].title, k.items[2].items[1].title];
  })(), ['Pfannen & Woks', 'Wasserkocher & Kaffeemaschinen']);
}

// ── Prüfregel: jede Verfälschung wird erkannt ──
{
  const GUT = gut().baum;
  const mut = fn => { const b = kopie(GUT); fn(b); return pruefeUmbau(ALT, b, GIDS); };
  const kop = (b, t) => b.find(x => x.title === t);
  const gruppe = (b, t) => [...kop(b, KUECHE.titel).items, ...kop(b, GESCHIRR.titel).items].find(x => x.title === t);
  ist('Gegenprobe: der gute Baum hat keinen Fehler', pruefeUmbau(ALT, GUT, GIDS), []);
  ist('ein Kind einer Gruppe fehlt → verloren', hat(mut(b => gruppe(b, 'Küchengeräte').items.pop()), 'verloren'), true);
  ist('eine Gruppe aus «Wohnen & Garten» fehlt → verloren', hat(mut(b => kop(b, ELTERN).items.pop()), 'verloren'), true);
  ist('eine verschobene Gruppe fehlt → verloren', hat(mut(b => kop(b, GESCHIRR.titel).items.pop()), 'verloren'), true);
  ist('ein fremdes Ziel kommt dazu → zusätzlich', hat(mut(b => gruppe(b, 'Küchengeräte').items.push({ title: 'X', type: 'COLLECTION', resourceId: 'gid://x/2', items: [] })), 'zusätzlich'), true);
  ist('eine neue Sammlung steht zweimal → erwartet 1×', hat(mut(b => gruppe(b, 'Küchengeräte').items.push({ title: 'Doppelt', type: 'COLLECTION', resourceId: NEU_GID('kueche-kochen'), items: [] })), '2× im Menü'), true);
  ist('eine neue Sammlung fehlt im Menü → 0×', hat(mut(b => { gruppe(b, 'Kaffee, Tee & Trinken').resourceId = 'gid://x/3'; }), 'steht 0×'), true);
  ist('die beiden neuen Köpfe vertauscht → Stelle falsch', hat(mut(b => { const i = b.findIndex(x => x.title === KUECHE.titel); [b[i], b[i + 1]] = [b[i + 1], b[i]]; }), 'drei Köpfe'), true);
  ist('Kopf zeigt auf das falsche Ziel', hat(mut(b => { kop(b, KUECHE.titel).resourceId = NEU_GID('geschirr-tisch'); }), 'falsche Ziel'), true);
  ist('Gruppe zeigt auf das falsche Ziel', hat(mut(b => { gruppe(b, 'Küchengeräte').resourceId = NEU_GID('kochen-grillen-backen'); }), 'falsche Ziel'), true);
  ist('das alte Kopf-Ziel steht nicht mehr als erstes Kind', hat(mut(b => gruppe(b, 'Kochen, Grillen & Backen').items.reverse()), 'erstes Kind'), true);
  ist('die übrigen Kinder einer Gruppe verändert (Titel)', hat(mut(b => { gruppe(b, 'Kaffee, Tee & Trinken').items[2].title = 'Anders'; }), 'übrigen Kinder'), true);
  ist('eine Gruppe unter dem falschen Kopf', hat(mut(b => { const g = kop(b, GESCHIRR.titel).items.pop(); kop(b, KUECHE.titel).items.push(g); }), 'Gruppen'), true);
  ist('Tiefe vier', hat(mut(b => { gruppe(b, 'Küchengeräte').items[1].items = [{ title: 'Tief', type: 'COLLECTION', resourceId: 'gid://x/4', items: [] }]; }), 'Tiefe'), true);
  ist('ein anderer oberster Eintrag verändert', hat(mut(b => { kop(b, 'Damen').title = 'Damen!'; }), 'ausserhalb'), true);
  ist('ein anderer oberster Eintrag fehlt → Anzahl und verloren', (() => { const f = mut(b => b.splice(b.findIndex(x => x.title === 'Haustiere'), 1)); return [hat(f, 'verloren'), hat(f, 'erwartet +2')]; })(), [true, true]);
  ist('eine Rest-Gruppe verändert (Kind umbenannt) → verändert', hat(mut(b => { kop(b, ELTERN).items[0].items[0].title = 'Neu'; }), 'wurde verändert'), true);
  ist('«Wohnen & Garten» enthält eine Gruppe zu viel/anders → andere Gruppen', hat(mut(b => { kop(b, ELTERN).items[0].title = 'Umbenannt'; }), 'andere Gruppen'), true);
  ist('Ids der NEUEN Einträge dürfen sich ändern (Nachlesen liefert andere Ids), die Prüfung bleibt grün', (() => { const b = kopie(GUT); const setze = l => l.forEach((x, n) => { x.id = 'gid://neu/' + n + x.title.length; setze(x.items || []); }); setze(kop(b, KUECHE.titel).items); setze(kop(b, GESCHIRR.titel).items); kop(b, KUECHE.titel).id = 'gid://neu/k'; kop(b, GESCHIRR.titel).id = 'gid://neu/g'; return pruefeUmbau(ALT, b, GIDS); })(), []);
  ist('die Id von «Wohnen & Garten» geändert → Fehler (Übersetzung hinge an der alten Id)', hat(mut(b => { kop(b, ELTERN).id = 'gid://x/neu'; }), 'andere Id'), true);
  ist('Id einer behaltenen Gruppe geändert → «andere Ids»', hat(mut(b => { kop(b, ELTERN).items[0].id = 'gid://x/neu'; }), 'andere Ids'), true);
  ist('Id eines Eintrags ausserhalb geändert oder gelöscht → «andere Ids»', [hat(mut(b => { kop(b, 'Damen').id = 'gid://x/neu'; }), 'andere Ids'), hat(mut(b => { delete kop(b, 'Damen').id; }), 'andere Ids')], [true, true]);
  ist('alle Ids gelöscht → erkannt', hat(mut(b => { const l = x => x.forEach(i => { delete i.id; l(i.items || []); }); l(b); }), 'andere Id'), true);
  ist('Tags an einem behaltenen oder äusseren Eintrag → verändert', [hat(mut(b => { kop(b, ELTERN).items[0].tags = ['x']; }), 'verändert'), hat(mut(b => { kop(b, 'Damen').tags = ['x']; }), 'ausserhalb')], [true, true]);
  ist('das verschobene Kind steht an erster Stelle statt hinter dem Mixer → Reihenfolge', hat(mut(b => { const it = gruppe(b, 'Küchengeräte').items; [it[0], it[1]] = [it[1], it[0]]; }), 'nicht hinter'), true);
  ist('das verschobene Kind fehlt unter «Küchengeräte» → verloren und nicht genau einmal', (() => { const f = mut(b => { gruppe(b, 'Küchengeräte').items.splice(1, 1); }); return [hat(f, 'verloren'), hat(f, 'nicht genau einmal')]; })(), [true, true]);
  ist('das verschobene Kind steht zusätzlich noch unter «Kaffee, Tee & Trinken» → zusätzlich', hat(mut(b => { gruppe(b, 'Kaffee, Tee & Trinken').items.unshift({ ...kopie(gruppe(b, 'Küchengeräte').items[1]) }); }), 'zusätzlich'), true);
  ist('das verschobene Kind zeigt auf ein falsches Ziel → erkannt', hat(mut(b => { gruppe(b, 'Küchengeräte').items[1].resourceId = 'gid://x/7'; }), 'verloren'), true);
  ist('der erste Eintrag unter «Kaffee, Tee & Trinken» ist fälschlich ein erfundenes Kopf-Kind → übrige Kinder verändert', hat(mut(b => { gruppe(b, 'Kaffee, Tee & Trinken').items.shift(); }), 'verloren'), true);
}

// ── Plan der sieben Sammlungen ──
{
  const TAGS = { 'sub-kueche': null, 'kuechen-organizer': 'sort-kuechenorganizer' }, tagVon = h => (h in TAGS ? TAGS[h] : 'sort-' + h);
  const plan = gruppenPlan(ALT, tagVon), P = Object.fromEntries(plan.map(p => [p.handle, p]));
  ist('Plan: sieben Sammlungen in der Reihenfolge fünf Gruppen, zwei Köpfe', plan.map(p => p.handle), neueHandles());
  ist('Gruppe Kochen: Kopf-Ziel zuerst, dann die Kinder; «sub-kueche» ohne Tag-Regel bleibt draussen', [P['kochen-grillen-backen'].kinder.map(k => k.handle), P['kochen-grillen-backen'].ohneTag],
    [['pfannen-woks', 'toepfe-kochgeschirr-sets', 'backformen-backbleche', 'kuechenformen-tortendeko', 'grillpfannen-elektrogrills', 'sub-kueche'], ['sub-kueche']]);
  ist('Regel: ODER, je Tag eine Regel `TAG EQUALS`, ohne das nicht vorhandene Tag von sub-kueche', [P['kochen-grillen-backen'].regel.appliedDisjunctively, P['kochen-grillen-backen'].regel.rules.map(r => [r.column, r.relation, r.condition].join(':'))],
    [true, ['pfannen-woks', 'toepfe-kochgeschirr-sets', 'backformen-backbleche', 'kuechenformen-tortendeko', 'grillpfannen-elektrogrills'].map(h => 'TAG:EQUALS:sort-' + h)]);
  ist('das Tag kommt aus dem Shop, nicht aus dem Handle («kuechen-organizer» → sort-kuechenorganizer)', P['kuechenhelfer-vorrat'].regel.rules.some(r => r.condition === 'sort-kuechenorganizer') && !P['kuechenhelfer-vorrat'].regel.rules.some(r => r.condition === 'sort-kuechen-organizer'), true);
  ist('Küchenhelfer: «waagen» (Körper-, Haustier-, Kranwaagen) ist nicht in der Vereinigung, die Küchenwaagen schon', [P['kuechenhelfer-vorrat'].kinder.some(k => k.handle === 'waagen'), P['kuechenhelfer-vorrat'].kinder.some(k => k.handle === 'kuechenwaagen-feinwaagen')], [false, true]);
  ist('Küchengeräte: «haushaltsgeraete» (Staubsauger, Bügeleisen) ist nicht in der Vereinigung; «Wasserkocher & Kaffeemaschinen» schon, bei Kaffee, Tee & Trinken nicht mehr', [P['kuechengeraete-alle'].kinder.some(k => k.handle === 'haushaltsgeraete'), P['kuechengeraete-alle'].kinder.length,
    P['kuechengeraete-alle'].kinder.some(k => k.handle === 'wasserkocher-kaffeemaschinen'), P['kaffee-tee-trinken'].kinder.some(k => k.handle === 'wasserkocher-kaffeemaschinen'), P['kaffee-tee-trinken'].kinder.length], [false, 9, true, false, 5]);
  ist('Kopf Küche = Vereinigung seiner drei Gruppen, Kopf Geschirr = Vereinigung seiner zwei', [
    JSON.stringify([...new Set(['kochen-grillen-backen', 'kuechenhelfer-vorrat', 'kuechengeraete-alle'].flatMap(h => P[h].kinder.map(k => k.handle)))]) === JSON.stringify(P['kueche-kochen'].kinder.map(k => k.handle)),
    JSON.stringify([...new Set(['geschirr-besteck-tisch', 'kaffee-tee-trinken'].flatMap(h => P[h].kinder.map(k => k.handle)))]) === JSON.stringify(P['geschirr-tisch'].kinder.map(k => k.handle))], [true, true]);
  ist('Küche und Geschirr teilen kein Kind (sauber getrennt)', P['kueche-kochen'].kinder.filter(k => P['geschirr-tisch'].kinder.some(x => x.handle === k.handle)).map(k => k.handle), []);
  ist('Tag-Regeln: 22 für die Küche, 10 für Geschirr & Tisch', [P['kueche-kochen'].regel.rules.length, P['geschirr-tisch'].regel.rules.length], [22, 10]);
  ist('jede Sammlung hat Beschreibung und einen Meta-Text von höchstens 160 Zeichen mit Versand-Satz', plan.every(p => p.beschreibung.length > 40 && p.seoBeschreibung.endsWith('nach Rabatt.') && p.seoBeschreibung.length <= 160), true);
  ist('der Kopf «Küche & Kochen» heisst als Sammlung «Küchenbedarf & Kochzubehör», alle anderen wie im Menü', plan.map(p => p.titel), ['Kochen, Grillen & Backen', 'Küchenhelfer & Vorrat', 'Küchengeräte', 'Geschirr, Besteck & Tisch', 'Kaffee, Tee & Trinken', 'Küchenbedarf & Kochzubehör', 'Geschirr & Tisch']);
  ist('Plan funktioniert auch nach dem Umbau (Gruppen liegen dann unter den neuen Köpfen)', JSON.stringify(gruppenPlan(gut().baum, tagVon).map(p => p.regel.rules.length)), JSON.stringify(plan.map(p => p.regel.rules.length)));
  ist('ohne Tags (alles null): keine Regeln, alle Kinder unter «ohne Tag»', (() => { const p = gruppenPlan(ALT, () => null); return [p.every(x => x.regel.rules.length === 0), p[0].ohneTag.length === p[0].kinder.length]; })(), [true, true]);
  ist('erwartetAus: zählt Produkte mit mindestens einem der Tags, jedes einmal', (() => {
    const p = [{ handle: 'a', regel: { rules: [{ condition: 't1' }, { condition: 't2' }] } }];
    return erwartetAus([{ tags: ['t1'] }, { tags: ['t1', 't2'] }, { tags: ['x'] }, { tags: [] }, {}], p);
  })(), { a: 2 });
}

// ── Die Läufe mit einer Attrappe der Shopify-Abfrage ──
const TMP = mkdtempSync(join(tmpdir(), 'kg-test-'));
const URL_VON_GID = Object.fromEntries(Object.entries(GIDS).map(([h, g]) => [g, `/en/collections/${h}`]));
const REGEL_TAG = h => 'sort-' + (h === 'kuechen-organizer' ? 'kuechenorganizer' : h);
const kindSammlung = h => ({ id: GIDS[h], title: h, productsCount: { count: 5 },
  ruleSet: h === 'sub-kueche' ? { appliedDisjunctively: true, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'Küche' }, { column: 'TAG', relation: 'EQUALS', condition: 'kueche' }] }
    : { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: REGEL_TAG(h) }] } });
const VORHANDEN = Object.fromEntries(Object.keys(GIDS).filter(h => !neueHandles().includes(h)).map(h => [h, kindSammlung(h)]));
const NEUE = Object.fromEntries(neueHandles().map(h => [h, { id: NEU_GID(h), title: h, productsCount: { count: 9 } }]));
function attrappe({ collections = VORHANDEN, menuUpdateFehler = [], verfaelsche = false, beimLesen = null, nachLeseFehler = false, menu = null, nachSchreiben = null } = {}) {
  const z = { menu: kopie(menu || MENU_ROH), collections: kopie(collections), n: 0, pub: {}, gelesen: 0, geschrieben: false, erstellt: [] };
  const aufrufe = [];
  const lesbar = items => items.map(i => ({ id: i.id || `gid://shopify/MenuItem/neu-${++z.n}`, title: i.title, type: i.type, resourceId: i.resourceId ?? null, url: i.url ?? URL_VON_GID[i.resourceId] ?? (i.type === 'COLLECTION' ? '/collections/x' : null), tags: i.tags || [], items: lesbar(i.items || []) }));
  const q = async (query, v = {}) => {
    aufrufe.push({ query, v: kopie(v) });
    if (/menus\(first/.test(query)) { z.gelesen++; if (nachLeseFehler && z.geschrieben) throw new Error('Netzfehler beim Nachlesen'); if (beimLesen && beimLesen.nr === z.gelesen) z.menu = beimLesen.aendere(kopie(z.menu)); return { menus: { nodes: [kopie(z.menu)] } }; }
    if (/menuUpdate/.test(query)) {
      if (menuUpdateFehler.length) return { menuUpdate: { menu: null, userErrors: menuUpdateFehler } };
      z.menuUpdateVariablen = { id: v.id, t: v.t, h: v.h }; z.geschrieben = true;
      z.menu = { ...z.menu, items: lesbar(v.i) };
      if (verfaelsche) z.menu.items.find(x => x.title === KUECHE.titel).items.pop();
      if (nachSchreiben) z.menu = nachSchreiben(kopie(z.menu));
      return { menuUpdate: { menu: { id: z.menu.id }, userErrors: [] } };
    }
    if (/c\d+:collectionByHandle\(handle:/.test(query)) { const aus = {}; for (const [, n, h] of query.matchAll(/c(\d+):collectionByHandle\(handle:"([^"]+)"\)/g)) aus['c' + n] = z.collections[h] ? kopie(z.collections[h]) : null; return aus; }
    if (/collectionByHandle\(handle:"hype-jetzt"\)/.test(query)) return { collectionByHandle: { resourcePublicationsV2: { nodes: [{ isPublished: true, publication: { id: 'gid://pub/1', name: 'Online Store' } }] } } };
    if (/collectionByHandle\(handle:\$h\)/.test(query)) { const c = z.collections[v.h]; return { collectionByHandle: c ? kopie(c) : null }; }
    if (/collectionCreate/.test(query)) {
      const i = v.i, id = NEU_GID(i.handle);
      z.collections[i.handle] = { id, title: i.title, productsCount: { count: 0 }, ruleSet: i.ruleSet }; z.erstellt.push(kopie(i));
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
const still = () => { const zeilen = []; return { zeilen, out: (...a) => zeilen.push(a.join(' ')), err: (...a) => zeilen.push('ERR ' + a.join(' ')) }; };
const frisch = n => { mkdirSync(join(TMP, n), { recursive: true }); return { sicherung: join(TMP, n, 'menu-sicherung', 'vor.json'), ledger: join(TMP, n, 'ledger.txt') }; };
const MIT_NEUEN = { ...VORHANDEN, ...NEUE };

// Menü-Lauf: Trockenlauf
{
  const a = attrappe(), s = still(), r = await kuecheGeschirrMenueLauf(a.q, { annahmeAlle: true, ...frisch('m1'), out: s.out, err: s.err });
  ist('Trockenlauf mit ANNAHME_ALLE: Exit 0, nichts geschrieben, Vorschau der drei Köpfe', [r.code, a.schreibend().length, s.zeilen.join('\n').includes('VORSCHAU «Küche & Kochen»'), s.zeilen.join('\n').includes('19 → 21')], [0, 0, true, true]);
}
{
  const a = attrappe(), s = still(), r = await kuecheGeschirrMenueLauf(a.q, { ...frisch('m2'), out: s.out, err: s.err });
  ist('Trockenlauf ohne die neuen Sammlungen (heutiger Stand): Exit 2, benennt die fehlenden, nichts geschrieben', [r.code, r.fehlend?.length, a.schreibend().length, hat(s.zeilen, 'fehlt im Shop')], [2, 7, 0, true]);
}
{
  const a = attrappe(), s = still(), r = await kuecheGeschirrMenueLauf(a.q, { live: true, annahmeAlle: true, web: webAttrappe(), ...frisch('m3'), out: s.out, err: s.err });
  ist('LIVE mit ANNAHME_ALLE: Exit 1, nichts geschrieben', [r.code, a.schreibend().length], [1, 0]);
  const b = attrappe({ collections: MIT_NEUEN }), s2 = still(), r2 = await kuecheGeschirrMenueLauf(b.q, { live: true, ...frisch('m3b'), out: s2.out, err: s2.err });
  ist('LIVE ohne HTTP-Prüfung: Exit 1, nichts geschrieben', [r2.code, b.schreibend().length], [1, 0]);
  const c = attrappe({ collections: MIT_NEUEN, beimLesen: null }); c.z.menu.handle = 'anderes-menue';
  const r3 = await kuecheGeschirrMenueLauf(c.q, { live: true, web: webAttrappe(), ...frisch('m3c'), out: still().out, err: still().err });
  ist('LIVE: die Suche liefert ein anderes Menü als «main-menu»: Exit 1, nichts geschrieben', [r3.code, c.schreibend().length], [1, 0]);
}
{
  const a = attrappe({ collections: MIT_NEUEN }), s = still(), d = frisch('m4'), web = webAttrappe();
  const r = await kuecheGeschirrMenueLauf(a.q, { live: true, web, ...d, jetzt: () => new Date('2026-11-03T21:00:00Z'), out: s.out, err: s.err });
  ist('LIVE, alles da: Exit 0, genau ein menuUpdate, HTTP-Prüfung nur für die sieben neuen Sammlungen', [r.code, a.schreibend().length, JSON.stringify(web.aufrufe[0])], [0, 1, JSON.stringify(neueHandles())]);
  ist('menuUpdate bekommt Menü-Id, Titel und Handle des gelesenen Menüs unverändert', a.z.menuUpdateVariablen, { id: MENU_ROH.id, t: MENU_ROH.title, h: MENU_ROH.handle });
  ist('die Sicherung enthält das gelesene Menü VOR dem Umbau, der Ledger-Eintrag steht', [existsSync(d.sicherung) && JSON.parse(readFileSync(d.sicherung)).items.length, readFileSync(d.ledger, 'utf8').includes('menü küche/geschirr getrennt')], [19, true]);
  ist('Shopify liefert danach 21 oberste Einträge mit den neuen Köpfen', [a.z.menu.items.length, titel(a.z.menu.items).slice(8, 11)], [21, ['Küche & Kochen', 'Geschirr & Tisch', 'Wohnen & Garten']]);
  ist('der zurückgelesene Baum besteht die Prüfregeln', pruefeUmbau(ALT, eingabeAus(a.z.menu.items), GIDS), []);
  const r2 = await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...frisch('m4b'), out: still().out, err: still().err });
  ist('zweiter LIVE-Lauf auf dem umgebauten Menü: Exit 0 «nichts zu tun», kein zweites menuUpdate', [r2.code, r2.schonUmgebaut, a.schreibend().length], [0, true, 1]);
}
{
  const a = attrappe({ collections: MIT_NEUEN }), s = still();
  const r = await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe({ 'geschirr-tisch': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } }), ...frisch('m5'), out: s.out, err: s.err });
  ist('LIVE: eine neue Sammlung ist im Onlineshop nicht erreichbar: Exit 2, nichts geschrieben, Grund genannt', [r.code, a.schreibend().length, hat(s.zeilen, 'HTTP 404')], [2, 0, true]);
}
{
  const a = attrappe({ collections: MIT_NEUEN, beimLesen: { nr: 2, aendere: m => { m.items.find(x => x.title === 'Damen').title = 'Damen (neu)'; return m; } } }), s = still();
  const r = await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...frisch('m6'), out: s.out, err: s.err });
  ist('LIVE: das Menü ändert sich zwischen Lesen und Schreiben: Exit 4, nichts geschrieben', [r.code, a.schreibend().length], [4, 0]);
}
{
  const a = attrappe({ collections: MIT_NEUEN, menuUpdateFehler: [{ field: ['items'], message: 'zu tief', code: 'INVALID' }] });
  let msg = null; try { await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...frisch('m7'), out: still().out, err: still().err }); } catch (e) { msg = e.message; }
  ist('menuUpdate meldet userErrors: der Lauf wirft (kein stilles OK)', [msg?.startsWith('menuUpdate'), msg?.includes('zu tief')], [true, true]);
  const b = attrappe({ collections: MIT_NEUEN, verfaelsche: true }), s = still(), r = await kuecheGeschirrMenueLauf(b.q, { live: true, web: webAttrappe(), ...frisch('m8'), out: s.out, err: s.err });
  ist('Shopify speichert etwas anderes als gesendet: Exit 3 mit Hinweis auf die Sicherung', [r.code, hat(s.zeilen, 'Sicherung liegt in')], [3, true]);
  const c = attrappe({ collections: MIT_NEUEN, nachLeseFehler: true }), s3 = still(), r3 = await kuecheGeschirrMenueLauf(c.q, { live: true, web: webAttrappe(), ...frisch('m9'), out: s3.out, err: s3.err });
  ist('Netzfehler beim Nachlesen NACH dem Schreiben: Exit 3, nicht 1', [r3.code, hat(s3.zeilen, 'NACH dem Schreiben')], [3, true]);
}
{
  const a = attrappe({ collections: MIT_NEUEN, beimLesen: { nr: 2, aendere: m => { m.id = 'gid://shopify/Menu/anderes'; return m; } } });
  const r = await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...frisch('m5b'), out: still().out, err: still().err });
  ist('LIVE: beim zweiten Lesen kommt ein anderes Menü (andere Id, gleiche Einträge): Exit 4, nichts geschrieben', [r.code, a.schreibend().length], [4, 0]);
  const b = attrappe({ collections: MIT_NEUEN }), s = still();
  b.z.menu.items.find(x => x.title === 'Damen').items[0].items.push({ id: 'gid://shopify/MenuItem/tief1', title: 'Tief', type: 'HTTP', resourceId: null, url: '/x', tags: [], items: [{ id: 'gid://shopify/MenuItem/tief2', title: 'Noch tiefer', type: 'HTTP', resourceId: null, url: '/y', tags: [], items: [] }] });
  const r2 = await kuecheGeschirrMenueLauf(b.q, { live: true, web: webAttrappe(), ...frisch('m5c'), out: s.out, err: s.err });
  ist('LIVE: schon die Vorab-Prüfung bricht ab (Menü hat vier Ebenen, Umbau bliebe ungültig): Exit 2, NICHTS geschrieben', [r2.code, b.schreibend().length, hat(s.zeilen, 'Tiefe')], [2, 0, true]);
}
{
  const a = attrappe({ collections: MIT_NEUEN }), s = still();
  a.z.menu.items = a.z.menu.items.filter(x => x.title !== ELTERN);
  const r = await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...frisch('m10'), out: s.out, err: s.err });
  ist('«Wohnen & Garten» fehlt im Menü: Exit 2, nichts geschrieben', [r.code, a.schreibend().length], [2, 0]);
  ist('optionenAusEnv (Menü): Trockenlauf ist Vorgabe, HTTP-Prüfung nur mit LIVE oder WEB_PRUEFEN', [menueOptionen({}, 'w'), menueOptionen({ LIVE: '1' }, 'w'), menueOptionen({ WEB_PRUEFEN: '1' }, 'w'), menueOptionen({ ANNAHME_ALLE: '1' }, 'w')],
    [{ live: false, annahmeAlle: false, web: null }, { live: true, annahmeAlle: false, web: 'w' }, { live: false, annahmeAlle: false, web: 'w' }, { live: false, annahmeAlle: true, web: null }]);
}

// Sammlungs-Lauf
{
  ist('tagAusRegel: genau eine Regel TAG EQUALS sort-…', [tagAusRegel(kindSammlung('pfannen-woks')), tagAusRegel(kindSammlung('sub-kueche')), tagAusRegel({ ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'kueche' }] } }), tagAusRegel({}), tagAusRegel(null), tagAusRegel({ ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'sort-x' }, { column: 'TITLE', relation: 'CONTAINS', condition: 'y' }] } })],
    ['sort-pfannen-woks', null, null, null, null, null]);
  const a = attrappe(), s = still(), { plan, fehler } = await planLesen(a.q, s.out);
  ist('planLesen liest Menü und Regeln: sieben Sammlungen, keine Fehler, kein Schreiben', [plan.length, fehler, a.schreibend().length], [7, [], 0]);
  ist('planLesen meldet sub-kueche als «ohne Tag»', hat(s.zeilen, 'sub-kueche'), true);
  const b = attrappe({ collections: { ...VORHANDEN, 'pfannen-woks': { ...kindSammlung('pfannen-woks'), ruleSet: null } } });
  const lesen = await planLesen(b.q, () => {});
  ist('ist eine Kind-Sammlung manuell (keine Regel), fehlt ihr Tag in der Vereinigung, die Gruppe bleibt gültig', lesen.plan.find(p => p.handle === 'kochen-grillen-backen').ohneTag, ['pfannen-woks', 'sub-kueche']);
  const c = attrappe({ collections: Object.fromEntries(Object.entries(VORHANDEN).map(([h, x]) => [h, { ...x, ruleSet: null }])) });
  const leer = await planLesen(c.q, () => {});
  ist('haben ALLE Kinder keine Tag-Regel: Fehler je Sammlung, nichts zu bauen', leer.fehler.length, 7);
  const s3 = still(), r3 = await kuecheGeschirrGruppenLauf(c.q, { live: true, web: webAttrappe(), warte: async () => {}, ...frisch('g0'), out: s3.out, err: s3.err });
  ist('der Lauf bricht dann mit Exit 2 ab, ohne etwas anzulegen', [r3.code, c.schreibend().length, hat(s3.zeilen, 'keine Kind-Sammlung mit Tag-Regel')], [2, 0, true]);
}
{
  const a = attrappe(), s = still(), r = await kuecheGeschirrGruppenLauf(a.q, { ...frisch('g1'), out: s.out, err: s.err });
  ist('Trockenlauf: Exit 0, nichts geschrieben, sieben Sammlungen «neu»', [r.code, a.schreibend().length, r.ergebnis.map(e => e.status)], [0, 0, neueHandles().map(() => 'neu')]);
  const katalog = { produkte: [{ tags: ['sort-pfannen-woks'] }, { tags: ['sort-tassen-kaffeebecher'] }, { tags: [] }] };
  const s2 = still(); await kuecheGeschirrGruppenLauf(a.q, { katalog, ...frisch('g1b'), out: s2.out, err: s2.err });
  ist('mit Katalog: erwartete Mitglieder je Sammlung stehen im Bericht, aber nicht die Engine-Spalten von gruppenLauf (die wären 0)', [hat(s2.zeilen, 'kochen-grillen-backen 1') && hat(s2.zeilen, 'kaffee-tee-trinken 1') && hat(s2.zeilen, 'kueche-kochen 1'), hat(s2.zeilen, 'PASSEN')], [true, false]);
}
{
  const a = attrappe(), s = still(), d = frisch('g2'), web = webAttrappe();
  const r = await kuecheGeschirrGruppenLauf(a.q, { live: true, web, warte: async () => {}, ...d, jetzt: () => new Date('2026-11-03T21:00:00Z'), out: s.out, err: s.err });
  ist('LIVE: Exit 0, sieben Sammlungen angelegt und in den Kanälen veröffentlicht', [r.code, a.z.erstellt.length, Object.keys(a.z.pub).length], [0, 7, 7]);
  ist('jede Sammlung: Handle, BEST_SELLING, ODER-Regel nur mit TAG EQUALS sort-…, Titel und SEO', a.z.erstellt.every(i => i.sortOrder === 'BEST_SELLING' && i.ruleSet.appliedDisjunctively === true && i.ruleSet.rules.length > 0
    && i.ruleSet.rules.every(x => x.column === 'TAG' && x.relation === 'EQUALS' && /^sort-/.test(x.condition)) && i.seo.description.endsWith('nach Rabatt.') && i.seo.title.length <= 70), true);
  ist('der Kopf «Küche & Kochen» hat 22 Regeln, «Geschirr & Tisch» 10, kein Tag doppelt', [a.z.erstellt.find(i => i.handle === 'kueche-kochen').ruleSet.rules.length, a.z.erstellt.find(i => i.handle === 'geschirr-tisch').ruleSet.rules.length,
    a.z.erstellt.every(i => new Set(i.ruleSet.rules.map(x => x.condition)).size === i.ruleSet.rules.length)], [22, 10, true]);
  ist('die Sammlung des Kopfes «Küche & Kochen» heisst «Küchenbedarf & Kochzubehör» (SEO-Titel passend), keine neue Sammlung heisst «Küche & Kochen»', [a.z.erstellt.find(i => i.handle === 'kueche-kochen').title, a.z.erstellt.find(i => i.handle === 'kueche-kochen').seo.title, a.z.erstellt.some(i => i.title === 'Küche & Kochen')], ['Küchenbedarf & Kochzubehör', 'Küchenbedarf & Kochzubehör online kaufen | LuxeStyle CH', false]);
  ist('HTTP-Prüfung im Onlineshop für alle sieben', new Set(web.aufrufe.flat()).size, 7);
  const r2 = await kuecheGeschirrGruppenLauf(a.q, { live: true, web: webAttrappe(), warte: async () => {}, ...frisch('g2b'), out: still().out, err: still().err });
  ist('zweiter LIVE-Lauf ist idempotent: Exit 0, keine zweite Anlage', [r2.code, a.z.erstellt.length], [0, 7]);
}
{
  const a = attrappe({ collections: { ...VORHANDEN, 'kueche-kochen': { id: 'gid://x/9', title: 'Fremd', productsCount: { count: 3 }, ruleSet: { appliedDisjunctively: true, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'Koch' }] } } } }), s = still();
  const r = await kuecheGeschirrGruppenLauf(a.q, { live: true, web: webAttrappe(), warte: async () => {}, ...frisch('g3'), out: s.out, err: s.err });
  ist('Handle schon mit anderer Regel belegt: Exit 2, NICHTS angelegt, nichts überschrieben', [r.code, a.z.erstellt.length, a.schreibend().length], [2, 0, 0]);
  const b = attrappe(), r2 = await kuecheGeschirrGruppenLauf(b.q, { live: true, web: null, ...frisch('g3b'), out: still().out, err: still().err });
  ist('LIVE ohne HTTP-Prüfung: Exit 1, nichts geschrieben', [r2.code, b.schreibend().length], [1, 0]);
  const c = attrappe(), r3 = await kuecheGeschirrGruppenLauf(c.q, { live: true, web: webAttrappe({ 'geschirr-tisch': { ok: false, status: 404, n: 0, grund: 'HTTP 404' } }), warte: async () => {}, ...frisch('g3c'), out: still().out, err: still().err });
  ist('eine neue Sammlung ist im Onlineshop nicht erreichbar: Exit 2 (das Menü darf sie nicht verlinken)', r3.code, 2);
  ist('optionenAusEnv (Sammlungen): Trockenlauf ist Vorgabe', [gruppenOptionen({}, 'w'), gruppenOptionen({ LIVE: '1' }, 'w'), gruppenOptionen({ WEB_PRUEFEN: '1' }, 'w')], [{ live: false, web: null }, { live: true, web: 'w' }, { live: false, web: 'w' }]);
}

// Sicherung bleibt, Mengenprüfung, planLesen-Wächter
{
  const a = attrappe({ collections: MIT_NEUEN }), d = frisch('s1'), s = still();
  mkdirSync(join(TMP, 's1', 'menu-sicherung'), { recursive: true });
  writeFileSync(d.sicherung, '{"alt":"bleibt"}');
  const r = await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, jetzt: () => new Date('2026-11-03T21:30:00Z'), out: s.out, err: s.err });
  ist('eine vorhandene Sicherungsdatei wird NIE überschrieben: die neue bekommt einen Zeitstempel', [r.code, readFileSync(d.sicherung, 'utf8'), existsSync(d.sicherung.replace('.json', '-2026-11-03T21-30-00-000Z.json'))], [0, '{"alt":"bleibt"}', true]);
  const b = attrappe(); b.z.menu.handle = 'anderes-menue';
  const lesen = await planLesen(b.q, () => {});
  ist('planLesen: ein anderes Menü als «main-menu» wird abgelehnt', [lesen.plan, hat(lesen.fehler, 'Hauptmenü nicht gefunden')], [undefined, true]);
}
{
  const katalog = n => ({ produkte: Array.from({ length: n }, () => ({ tags: ['sort-pfannen-woks'] })) });
  const a = attrappe(), s = still(), r = await kuecheGeschirrGruppenLauf(a.q, { live: true, web: webAttrappe(), katalog: katalog(100), warte: async () => {}, ...frisch('g4'), out: s.out, err: s.err });
  ist('Mengenprüfung: Shopify zählt 7 Mitglieder, erwartet werden 100: Exit 2, das Menü darf nicht umgebaut werden', [r.code, hat(s.zeilen, 'zu wenige Mitglieder'), hat(s.zeilen, 'kochen-grillen-backen 7 statt 100')], [2, true, true]);
  const b = attrappe(), r2 = await kuecheGeschirrGruppenLauf(b.q, { live: true, web: webAttrappe(), katalog: katalog(5), warte: async () => {}, ...frisch('g5'), out: still().out, err: still().err });
  ist('Mengenprüfung: 7 gezählt bei 5 erwartet (Entwürfe zählen mit): Exit 0', r2.code, 0);
  const c = attrappe(), r3 = await kuecheGeschirrGruppenLauf(c.q, { live: true, web: webAttrappe(), katalog: null, warte: async () => {}, ...frisch('g6'), out: still().out, err: still().err });
  ist('ohne Katalog keine Mengenprüfung (Hinweis steht im Aufruf), Exit 0', r3.code, 0);
}

// Rücknahme
{
  const ALT_ROH = MENU_ROH.items;
  const a = attrappe({ collections: MIT_NEUEN }), d = frisch('z0');
  await kuecheGeschirrMenueLauf(a.q, { live: true, web: webAttrappe(), ...d, out: still().out, err: still().err });
  const vor = a.z.menu;
  const ids = l => l.flatMap(i => [i.id, ...ids(i.items || [])]);
  const soll = rueckgaengigEingabe(ALT_ROH, vor.items);
  const entfaellt = ids(ALT_ROH).filter(x => !new Set(ids(vor.items)).has(x)), bleibt = ids(ALT_ROH).filter(x => new Set(ids(vor.items)).has(x));
  ist('rueckgaengigEingabe: genau die Ids, die es nach dem Umbau nicht mehr gibt, werden gestrichen (5 Gruppen + ihre 30 Kinder, 35 Ids), alle anderen bleiben', [entfaellt.length, ids(soll).filter(Boolean).length, ids(ALT_ROH).length - entfaellt.length], [35, bleibt.length, bleibt.length]);
  ist('rueckgaengigEingabe: Titel, Typ, Reihenfolge und Ziele sind die der Sicherung', [gleicherBaum(soll, eingabeAus(ALT_ROH)).gleich, gleicheZiele(soll, eingabeAus(ALT_ROH)).gleich], [true, true]);
  ist('rueckgaengigEingabe: ohne Umbau (aktuell = Sicherung) bleiben alle Ids', JSON.stringify(ids(rueckgaengigEingabe(ALT_ROH, ALT_ROH))), JSON.stringify(ids(ALT_ROH)));

  // Trockenlauf
  const t = attrappe({ collections: MIT_NEUEN, menu: vor }), s0 = still();
  const r0 = await kuecheGeschirrZurueckLauf(t.q, { sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach.json'), ledger: d.ledger, out: s0.out, err: s0.err });
  ist('Rücknahme, Trockenlauf: Exit 0, nichts geschrieben, nennt die 35 Ids', [r0.code, t.schreibend().length, hat(s0.zeilen, '35 Ids der Sicherung gibt es nicht mehr')], [0, 0, true]);
  // LIVE
  const l = attrappe({ collections: MIT_NEUEN, menu: vor }), s1 = still();
  const r1 = await kuecheGeschirrZurueckLauf(l.q, { live: true, sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach.json'), ledger: d.ledger, out: s1.out, err: s1.err });
  const zurueck = eingabeAus(l.z.menu.items);
  ist('Rücknahme LIVE: Exit 0, ein menuUpdate, das Menü gleicht wieder dem von vorher (Titel, Ziele, Reihenfolge)', [r1.code, l.schreibend().length, gleicherBaum(eingabeAus(ALT_ROH), zurueck).gleich, gleicheZiele(eingabeAus(ALT_ROH), zurueck).gleich, zurueck.length], [0, 1, true, true, 19]);
  ist('Rücknahme LIVE: alle behaltenen Ids sind danach noch da, die zwei neuen Köpfe sind weg, der Zwischenstand liegt in der Datei', [bleibt.every(x => ids(l.z.menu.items).includes(x)), titel(zurueck).includes(KUECHE.titel), JSON.parse(readFileSync(join(TMP, 'z0', 'nach.json'), 'utf8')).items.length], [true, false, 21]);
  const w = await kuecheGeschirrZurueckLauf(l.q, { live: true, sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach.json'), ledger: d.ledger, jetzt: () => new Date('2026-11-03T22:00:00Z'), out: still().out, err: still().err });
  ist('Rücknahme ist wiederholbar (zweiter Lauf auf dem zurückgesetzten Menü): Exit 0, der erste Zwischenstand bleibt unverändert', [w.code, JSON.parse(readFileSync(join(TMP, 'z0', 'nach.json'), 'utf8')).items.length], [0, 21]);

  const f = attrappe({ collections: MIT_NEUEN, menu: vor }), r2 = await kuecheGeschirrZurueckLauf(f.q, { live: true, sicherung: join(TMP, 'z0', 'gibtsnicht.json'), ledger: d.ledger, out: still().out, err: still().err });
  ist('Sicherung fehlt: Exit 1, nichts geschrieben', [r2.code, f.schreibend().length], [1, 0]);
  writeFileSync(join(TMP, 'z0', 'kaputt.json'), '{"id":"gid://x"');
  const r3 = await kuecheGeschirrZurueckLauf(f.q, { live: true, sicherung: join(TMP, 'z0', 'kaputt.json'), ledger: d.ledger, out: still().out, err: still().err });
  ist('Sicherung abgeschnitten (kein gültiges JSON): Exit 1, nichts geschrieben', [r3.code, f.schreibend().length], [1, 0]);
  writeFileSync(join(TMP, 'z0', 'fremd.json'), JSON.stringify({ id: 'gid://shopify/Menu/anderes', handle: 'main-menu', items: ALT_ROH }));
  const r4 = await kuecheGeschirrZurueckLauf(f.q, { live: true, sicherung: join(TMP, 'z0', 'fremd.json'), ledger: d.ledger, out: still().out, err: still().err });
  ist('Sicherung gehört zu einem anderen Menü: Exit 1, nichts geschrieben', [r4.code, f.schreibend().length], [1, 0]);
  const g = attrappe({ collections: MIT_NEUEN, menu: vor, beimLesen: { nr: 2, aendere: m => { m.items.find(x => x.title === 'Damen').title = 'Damen (neu)'; return m; } } });
  const r5 = await kuecheGeschirrZurueckLauf(g.q, { live: true, sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach2.json'), ledger: d.ledger, out: still().out, err: still().err });
  ist('Menü ändert sich zwischen Lesen und Schreiben: Exit 4, nichts geschrieben', [r5.code, g.schreibend().length], [4, 0]);
  const h = attrappe({ collections: MIT_NEUEN, menu: vor, nachLeseFehler: true }), s6 = still();
  const r6 = await kuecheGeschirrZurueckLauf(h.q, { live: true, sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach3.json'), ledger: d.ledger, out: s6.out, err: s6.err });
  ist('Netzfehler beim Nachlesen NACH dem Schreiben: Exit 3 mit Hinweis auf den Zwischenstand', [r6.code, hat(s6.zeilen, 'NACH dem Schreiben')], [3, true]);
  const k = attrappe({ collections: MIT_NEUEN, menu: vor, nachSchreiben: m => { m.items.find(x => x.title === 'Damen').title = 'Damen!'; return m; } }), s7 = still();
  const r7 = await kuecheGeschirrZurueckLauf(k.q, { live: true, sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach4.json'), ledger: d.ledger, out: s7.out, err: s7.err });
  ist('Shopify speichert etwas anderes als gesendet: Exit 3 mit Hinweis auf den Zwischenstand', [r7.code, hat(s7.zeilen, 'Zwischenstand liegt in')], [3, true]);
  const k2 = attrappe({ collections: MIT_NEUEN, menu: vor, beimLesen: { nr: 2, aendere: m => { m.id = 'gid://shopify/Menu/anderes'; return m; } } });
  const r8 = await kuecheGeschirrZurueckLauf(k2.q, { live: true, sicherung: d.sicherung, zwischen: join(TMP, 'z0', 'nach5.json'), ledger: d.ledger, out: still().out, err: still().err });
  ist('beim zweiten Lesen kommt ein anderes Menü (andere Id, gleiche Einträge): Exit 4, nichts geschrieben', [r8.code, k2.schreibend().length], [4, 0]);
  const k3 = attrappe({ collections: MIT_NEUEN, menu: vor });
  const r9 = await kuecheGeschirrZurueckLauf(k3.q, { live: true, sicherung: join(TMP, 'z0', 'nach.json'), zwischen: join(TMP, 'z0', 'nach6.json'), ledger: d.ledger, out: still().out, err: still().err });
  ist('wer den Zwischenstand (NACH dem Umbau) als Sicherung übergibt, wird abgewiesen: Exit 2, nichts geschrieben', [r9.code, k3.schreibend().length], [2, 0]);
  ist('optionenAusEnv (Rücknahme): Trockenlauf ist Vorgabe, SICHERUNG wählt die Datei', [zurueckOptionen({}), zurueckOptionen({ LIVE: '1', SICHERUNG: 'x.json' })], [{ live: false }, { live: true, sicherung: 'x.json' }]);
}

console.log(`\nküche/geschirr: ${ok} Prüfungen bestanden, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
