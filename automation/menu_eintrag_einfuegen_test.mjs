// Tests der reinen Menü-Umbau-Logik. Gegenproben: ein vergessener Eintrag muss auffallen. Zusammenfassung am ENDE.
import { eingabeAus, einfuegen, unterschiede } from './menu_eintrag_einfuegen.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };

const baum = [
  { id: 'm1', title: 'Damen', type: 'COLLECTION', resourceId: 'c1', url: '/collections/damen', tags: [], items: [] },
  { id: 'm2', title: 'Wohnen & Garten', type: 'COLLECTION', resourceId: 'c2', url: '/collections/wohnen', tags: [], items: [
    { id: 'm3', title: 'Wohnen & Deko', type: 'COLLECTION', resourceId: 'c3', url: '/collections/wohnen-dekoration', tags: [], items: [] },
    { id: 'm4', title: 'Küche & Kochen', type: 'COLLECTION', resourceId: 'c4', url: '/collections/kueche', tags: [], items: [] },
    { id: 'm5', title: 'Basteln & DIY', type: 'COLLECTION', resourceId: 'c5', url: '/collections/basteln', tags: ['x'], items: [
      { id: 'm6', title: 'Malen nach Zahlen', type: 'HTTP', url: 'https://luxestyle.ch/collections/malen', tags: [], items: [] }] },
  ] },
];
const e = eingabeAus(baum);
ist('IDs bleiben erhalten', [e[0].id, e[1].items[2].items[0].id], ['m1', 'm6']);
ist('Tags bleiben, leere Tags entfallen', [e[1].items[2].tags, 'tags' in e[0]], [['x'], false]);
ist('dritte Ebene bleibt', e[1].items[2].items.length, 1);

const neu = { title: 'Tassen & Becher', type: 'COLLECTION', resourceId: 'c9', items: [] };
const mit = einfuegen(e, { eltern: 'Wohnen & Garten', nach: 'Küche & Kochen', neu });
ist('Einfügen direkt nach «Küche & Kochen»', mit[1].items.map(x => x.title), ['Wohnen & Deko', 'Küche & Kochen', 'Tassen & Becher', 'Basteln & DIY']);
ist('Original bleibt unverändert (keine Seiteneffekte)', e[1].items.length, 3);
ist('ohne NACH ans Ende', einfuegen(e, { eltern: 'Wohnen & Garten', neu }).items?.length ?? einfuegen(e, { eltern: 'Wohnen & Garten', neu })[1].items.at(-1).title, 'Tassen & Becher');

// Gegenproben
let fehler = ''; try { einfuegen(e, { eltern: 'Gibt es nicht', neu }); } catch (x) { fehler = x.message; }
ist('Gegenprobe: unbekannter Eltern-Eintrag wirft', /nicht gefunden/.test(fehler), true);
fehler = ''; try { einfuegen(mit, { eltern: 'Wohnen & Garten', neu }); } catch (x) { fehler = x.message; }
ist('Gegenprobe: doppeltes Einfügen wirft', /schon vorhanden/.test(fehler), true);

// Vergleich: Rückgelesener Baum = alter Baum + 1 neuer Eintrag
const zurueck = JSON.parse(JSON.stringify(baum)); zurueck[1].items.splice(2, 0, { id: 'neu', title: 'Tassen & Becher', type: 'COLLECTION', resourceId: 'c9', url: '/collections/tassen-becher', items: [] });
const u = unterschiede(baum, zurueck);
ist('sauberes Ergebnis', [u.fehlend.length, u.neu.length, u.reihenfolgeGleich], [0, 1, true]);
// Gegenprobe: ein VERGESSENER Eintrag fällt auf
const vergessen = JSON.parse(JSON.stringify(zurueck)); vergessen[1].items = vergessen[1].items.filter(x => x.title !== 'Küche & Kochen');
ist('Gegenprobe: vergessener Eintrag wird gemeldet', unterschiede(baum, vergessen).fehlend.length, 1);
// Gegenprobe: vertauschte Reihenfolge fällt auf
const vertauscht = JSON.parse(JSON.stringify(zurueck)); vertauscht[1].items.reverse();
ist('Gegenprobe: vertauschte Reihenfolge wird gemeldet', unterschiede(baum, vertauscht).reihenfolgeGleich, false);
// Gegenprobe: verlorene dritte Ebene fällt auf
const flach = JSON.parse(JSON.stringify(zurueck)); flach[1].items.find(x => x.title === 'Basteln & DIY').items = [];
ist('Gegenprobe: verlorene dritte Ebene wird gemeldet', unterschiede(baum, flach).fehlend.length, 1);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
