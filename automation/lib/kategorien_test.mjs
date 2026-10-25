// Tests der Kategorie-Regeln und des Menü-Umbaus. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
// Die Fälle sind echte Titel/Google-Kategorien aus dem Katalog vom 25.10.2026.
import { KATEGORIEN, BEREINIGUNG, gehoertIn, werkzeugArt, istSticker, istBastelWare, WAFFEN } from './kategorien.mjs';
import { einfuegenPfad, verschiebe, befoerdern, umbenennen, entfernen, tiefe, anwenden, gleicherBaum, UMBAU } from './menue_plan.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const P = (title, g = '', tags = [], productType = '') => ({ title, g, tags, productType });
const kat = id => KATEGORIEN.find(k => k.id === id);
const in_ = (id, p) => gehoertIn(kat(id), p);

// ── Wortgrenzen: «SSD» steckt in «Stossdämpfend» (der Fehler, den die Seite PC-Komponenten zeigte) ──
ist('pc: echte SSD', in_('pc-komponenten', P('Hochgeschwindigkeits-SSD für Laptops', 'Electronics > Electronics Accessories > Computer Components > Storage Devices')), true);
ist('pc: Festplattengehäuse', in_('pc-komponenten', P('ORICO 2.5" USB 3.0 Festplattengehäuse transparent', 'Electronics > Electronics Accessories > Computer Components > Storage Devices > Hard Drive Accessories')), true);
ist('pc: Gegenprobe Hundeleine «Stossdämpfend»', in_('pc-komponenten', P('Stossdämpfende Hundeleine', 'Animals & Pet Supplies > Pet Supplies > Pet Leashes')), false);
ist('pc: Gegenprobe Sneaker «Stossdämpfung»', in_('pc-komponenten', P('MD Trainingsschuh mit Stossdämpfung', 'Apparel & Accessories > Shoes')), false);
ist('pc: Gegenprobe Surfbrett-Dämpfer', in_('pc-komponenten', P('Rebound Stossdämpfer für Surfbretter', 'Sporting Goods > Outdoor Recreation')), false);
ist('netzwerk: Router', in_('netzwerk', P('Tragbarer 4G WLAN Router', 'Electronics > Networking > Bridges & Routers')), true);
ist('netzwerk: Gegenprobe WLAN-Steckdose', in_('netzwerk', P('Intelligente WLAN-Steckdose', 'Home & Garden > Household Appliance Accessories')), false);
ist('netzwerk: Gegenprobe Crimpzange', in_('netzwerk', P('Netzwerkkabel-Crimpzange mit Tester – 1988B Set', 'Hardware > Tools > Pliers')), false);

// ── Werkzeug: die Auffang-Kategorie «Hardware > Tools» sagt nichts ──
ist('werkzeug: Zange nach Google', werkzeugArt(P('Abisolierzange für Elektriker', 'Hardware > Tools > Pliers')).art, 'hand');
ist('werkzeug: Messgerät nach Google', werkzeugArt(P('Präzisions-Wasserwaage aus Aluminium', 'Hardware > Tools > Measuring Tools & Sensors')).art, 'mess');
ist('werkzeug: Holzbürste in der Auffang-Kategorie ist Beauty', werkzeugArt(P('Holzbürste mit Wildschweinborsten', 'Hardware > Tools')), { art: 'fremd', nach: 'beauty' });
ist('werkzeug: Nagelfräser-Set ist Beauty', werkzeugArt(P('Nagelfräser-Set aus Wolframstahl-Legierung', 'Hardware > Tools')).nach, 'beauty');
ist('werkzeug: Pantoffeln sind Haushalt', werkzeugArt(P('Badezimmer-Pantoffeln', 'Hardware > Tools')).nach, 'haushalt');
ist('werkzeug: Harzfarbe ist Basteln', werkzeugArt(P('Harz-Schmuckfarbe', 'Hardware > Tools')).nach, 'basteln');
ist('werkzeug: Kreuz-Positionierbohrer bleibt Zubehör', werkzeugArt(P('Kreuz-Positionierbohrer für Gipskartonplatten', 'Hardware > Tools')).art, 'zubehoer');
ist('werkzeug: Schraubenausdreher bleibt Handwerkzeug', werkzeugArt(P('Schraubenausdreher-Set', 'Hardware > Tools')).art, 'hand');
ist('werkzeug: Gitarrenbund-Feile ist kein Bastelwerkzeug', werkzeugArt(P('Gitarrenbund-Feile mit vier Rillen', 'Arts & Entertainment > Hobbies & Creative Arts > Musical Instrument & Orchestra Accessories')).nach, 'sonst');
ist('werkzeug: Fahrradkettenzange', werkzeugArt(P('Fahrradkettenzange zum Öffnen', 'Sporting Goods > Outdoor Recreation > Cycling')).art, 'fahrzeug');
ist('werkzeug: Gartenschere bleibt im Garten-Umfeld (nicht fremd)', werkzeugArt(P('Gartenschere Astschere', 'Home & Garden > Lawn & Garden > Gardening')).art, 'allgemein');
ist('werkzeug: Büro-Artikel verliert den Tag', werkzeugArt(P('Büroklammern «Paperclip»', 'Office Supplies > General Office Supplies')).art, 'fremd');

// ── Waffen: nur Feuerwaffen-Zubehör, nie Wasserpistolen oder Kostüm-Holster ──
ist('waffe: Glock-Holster', werkzeugArt(P('Glock-Holster mit Infrarot-Ziel', 'Hardware > Tools')).nach, 'waffe');
ist('waffe: Zielfernrohr-Halterung', werkzeugArt(P('Zielfernrohr-Halterungszubehör', 'Hardware > Tools')).nach, 'waffe');
ist('waffe: Gegenprobe Wasserpistole', WAFFEN.test('Schleuderkraft-Wasserpistole'), false);
ist('waffe: Gegenprobe Heissklebepistole', WAFFEN.test('Heissklebepistole 60/100 W'), false);
ist('waffe: Gegenprobe Glockenärmel-Kleid', werkzeugArt(P('Elegantes Maxikleid mit Glockenärmeln', '')).nach === 'waffe', false);
ist('waffe: Gegenprobe Fasnachts-Holster (Fortura-Kostüm)', werkzeugArt(P('Holster schwarz für rechtes', '', ['fortura'])).nach === 'waffe', false);

// ── Bastelware / Sticker / Wandbilder / Vasen ──
ist('basteln: Malen nach Zahlen', istBastelWare(P('Malen nach Zahlen – Landschaft', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Craft Kits > Drawing & Painting Kits')), true);
ist('basteln: Gegenprobe Wandbild aus Eisen ist Wandbild (nicht Basteln? — Google sagt Arts & Crafts, bleibt Basteln, aber auch Wandbild)', in_('wandbilder', P('Wandbild aus Eisen für Dekoration', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts')), true);
ist('basteln: Gegenprobe Ölgemälde ist nicht Basteln', istBastelWare(P('Handgemaltes abstraktes Ölgemälde', 'Home & Garden > Decor > Artwork')), false);
ist('basteln: Gegenprobe Sticker ist nicht Basteln', istBastelWare(P('Schweiz-Sticker «Matterhorn» · 1 Stück', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers')), false);
ist('sticker: erkannt', istSticker(P('Sticker «Alpaca» · 1 Stück', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers')), true);
ist('vasen: Blumenvase (Zusammensetzung)', in_('vasen', P('Retro Glasvase mit Blumen', 'Home & Garden > Decor > Vases')), true);
ist('vasen: Gegenprobe «Phase»/«Evaporator» — kein Treffer ohne Wortende «vase»', in_('vasen', P('LED Phasenprüfer Stift', 'Hardware > Tools')), false);
ist('wandbilder: Poster', in_('wandbilder', P('Panda Leinwandposter', '')), true);
ist('wandbilder: Gegenprobe Kleid «Postergrösse» nicht', in_('wandbilder', P('Midikleid mit Blumendruck', 'Apparel & Accessories > Clothing > Dresses')), false);

// ── Küche, Kissen, Lampen, Taschen ──
ist('waagen: Küchenwaage (Zusammensetzung)', in_('waagen', P('Digitale Küchenwaage mit Löffel')), true);
ist('waagen: Gegenprobe Wasserwaage', in_('waagen', P('Präzisions-Wasserwaage aus Aluminium')), false);
ist('armaturen: Küchenarmatur (Zusammensetzung)', in_('armaturen', P('Küchenarmatur 3-in-1 ausziehbar')), true);
ist('armaturen: Gegenprobe Armaturenbrett-Abdeckung', in_('armaturen', P('Armaturenbrett-Abdeckung für Auto')), false);
ist('tassen: Keramiktasse', in_('tassen', P('Keramiktasse mit Schmetterlingsmuster')), true);
ist('tassen: Gegenprobe Tassel (Fransen)', in_('tassen', P('Tassel-Anhänger für Taschen')), false);
ist('kissen: Zierkissen', in_('kissen', P('Kissen «Alphorn»', 'Home & Garden > Decor > Throw Pillows')), true);
ist('kissen: Bezug gehört NICHT zu Kissen', in_('kissen', P('Kissenbezug Leinen 45x45', 'Home & Garden > Decor > Throw Pillows')), false);
ist('kissenbezuege: Bezug', in_('kissenbezuege', P('Kissenbezug Leinen 45x45', 'Home & Garden > Decor > Throw Pillows')), true);
ist('kissenbezuege: Gegenprobe Kissen «Alphorn»', in_('kissenbezuege', P('Kissen «Alphorn»', 'Home & Garden > Decor > Throw Pillows')), false);
ist('sofaueberzuege', in_('sofaueberzuege', P('Elastischer Sofabezug ohne Armlehnen', 'Home & Garden > Decor > Slipcovers')), true);
ist('lampen: Tischlampe', in_('lampen', P('LED Nachttischlampe Musiknote', 'Home & Garden > Lighting > Lamps')), true);
ist('lampen: Gegenprobe Wandleuchte', in_('lampen', P('Wandleuchte', 'Home & Garden > Lighting > Lighting Fixtures > Wall Light Fixtures')), false);
ist('geldboersen', in_('geldboersen', P('Herren Geldbörse', 'Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips')), true);
ist('geldboersen: Gegenprobe Handtasche', in_('geldboersen', P('Handtasche', 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags')), false);
ist('laptopzubehoer: Gegenprobe Laptop-Rucksack', in_('laptopzubehoer', P('Business-Rucksack gross für Laptop', 'Luggage & Bags > Backpacks')), false);
ist('laptopzubehoer: Laptop-Ständer', in_('laptopzubehoer', P('Laptop-Ständer aus Aluminium', 'Electronics > Electronics Accessories > Computer Accessories')), true);

// ── Kinder / Schule / Haustiere ──
ist('schule: Schulrucksack', in_('schule', P('Schulrucksack für Kinder', 'Luggage & Bags > Backpacks')), true);
ist('schule: Gegenprobe «spitzer Zehenpartie» (Schuhe)', in_('schule', P('Elegante Stiletto-Pumps mit spitzer Zehenpartie', 'Apparel & Accessories > Shoes')), false);
ist('kinder-baby: Spielzeug', in_('kinder-baby', P('Klemmbausteine Set', 'Toys & Games > Toys > Building Toys')), true);
ist('kinder-baby: Gegenprobe Damen-Stiefel', in_('kinder-baby', P('Damen Wildleder-Stiefeletten', 'Apparel & Accessories > Shoes')), false);
ist('tier-leinen: Hundeleine', in_('tier-leinen', P('Stossdämpfende Hundeleine', 'Animals & Pet Supplies > Pet Supplies > Pet Leashes')), true);
ist('tier-kleidung: Hundemantel', in_('tier-kleidung', P('Hundemantel wasserdicht', 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Apparel')), true);

// ── Retro: ganzes Wort ──
ist('retro: Retro-Uhr', in_('retro', P('Retro-Glockenwecker aus Metall')), true);
ist('retro: Gegenprobe «Retrograde» ist kein Retro-Stil', in_('retro', P('Retrograde Amnesie Buch')), false);

// ── Bereinigungen ──
const b = id => BEREINIGUNG.find(x => x.id === id);
ist('bereinigung: Harzfarbe verliert werkzeug, bekommt basteln', [b('werkzeug-fremd').wenn(P('Harz-Schmuckfarbe', 'Hardware > Tools', ['werkzeug'])), b('werkzeug-fremd').setzt(P('Harz-Schmuckfarbe', 'Hardware > Tools', ['werkzeug']))], [true, ['basteln']]);
ist('bereinigung: Gegenprobe Zange behält werkzeug', b('werkzeug-fremd').wenn(P('Abisolierzange', 'Hardware > Tools > Pliers', ['werkzeug'])), false);
ist('bereinigung: Wandbild verliert basteln', b('basteln-fremd').wenn(P('Handgemaltes Ölgemälde', 'Home & Garden > Decor > Artwork', ['basteln'])), true);
ist('bereinigung: Gegenprobe Malset behält basteln', b('basteln-fremd').wenn(P('Malset', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Craft Kits', ['basteln'])), false);
ist('bereinigung: Bastelware ohne Tag bekommt ihn', b('basteln-fehlt').wenn(P('Kreuzstich-Set', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Craft Kits > Needlecraft Kits', [])), true);
ist('bereinigung: Vase verlässt Dekoration', b('deko-vasen').wenn(P('Retro Glasvase', 'Home & Garden > Decor > Vases', ['kat-deko'])), true);
ist('bereinigung: Gegenprobe Figur bleibt in Dekoration', b('deko-vasen').wenn(P('Kupfer-Löwe Dekoration', 'Home & Garden > Decor > Figurines', ['kat-deko'])), false);

// ── Struktur: jede Kategorie hat Tag, Mindestzahl; keine doppelten Tags/Handles; neue Tags kollidieren nicht mit bestehenden ──
const tags = KATEGORIEN.map(k => k.tag), handles = KATEGORIEN.map(k => k.handle);
ist('keine doppelten Tags', tags.length, new Set(tags).size);
ist('keine doppelten Handles', handles.length, new Set(handles).size);
ist('neue Tags tragen den Präfix sort- (ausser Tassen)', tags.filter(t => !t.startsWith('sort-') && t !== 'tassen-becher'), []);
ist('neue Kategorien haben Titel, Beschreibung und SEO', KATEGORIEN.filter(k => !k.bestehend && k.id !== 'tassen' && !(k.beschreibung && k.seoBeschreibung && k.titel)).map(k => k.id), []);

// ── Menü-Umbau ──
const baum = [
  { title: 'Wohnen & Garten', type: 'COLLECTION', resourceId: 'w', items: [
    { title: 'Küche & Kochen', type: 'COLLECTION', resourceId: 'k', items: [] },
    { title: 'Tassen & Becher', type: 'COLLECTION', resourceId: 't', items: [] },
    { title: 'Vasen & Deko', type: 'COLLECTION', resourceId: 'd', items: [] },
  ] },
  { title: 'Schmuck & Uhren', type: 'COLLECTION', resourceId: 's', items: [
    { title: 'Halsketten', type: 'COLLECTION', resourceId: 'h', items: [] },
    { title: 'Uhren', type: 'COLLECTION', resourceId: 'u', items: [{ title: 'Herrenuhren', type: 'COLLECTION', resourceId: 'hu', items: [{ title: 'Armbänder', type: 'COLLECTION', resourceId: 'ar', items: [] }] }] },
  ] },
];
const v = verschiebe(baum, { von: ['Wohnen & Garten', 'Tassen & Becher'], nach: ['Wohnen & Garten', 'Küche & Kochen'] });
ist('verschieben: Tassen unter Küche', v[0].items.map(x => x.title).concat(v[0].items[0].items.map(x => x.title)), ['Küche & Kochen', 'Vasen & Deko', 'Tassen & Becher']);
ist('verschieben: Original unverändert', baum[0].items.length, 3);
const bf = befoerdern(baum, { von: ['Schmuck & Uhren', 'Uhren'], hinter: 'Schmuck & Uhren' });
ist('befördern: Uhren oben nach Schmuck', bf.map(x => x.title), ['Wohnen & Garten', 'Schmuck & Uhren', 'Uhren']);
ist('befördern: Kinder wandern mit', bf[2].items[0].items[0].title, 'Armbänder');
ist('befördern: Schmuck behält die Halsketten', bf[1].items.map(x => x.title), ['Halsketten']);
ist('umbenennen mit Ziel', (r => [r[1].title, r[1].resourceId])(umbenennen(baum, { pfad: ['Schmuck & Uhren'], titel: 'Schmuck', ressource: 'neu' })), ['Schmuck', 'neu']);
ist('einfügen: nach Anker', einfuegenPfad(baum, { eltern: ['Wohnen & Garten'], nach: 'Küche & Kochen', neu: { title: 'X', type: 'COLLECTION', resourceId: 'x' } })[0].items.map(x => x.title), ['Küche & Kochen', 'X', 'Tassen & Becher', 'Vasen & Deko']);
ist('einfügen oben (eltern [])', einfuegenPfad(baum, { eltern: [], neu: { title: 'Retro', type: 'COLLECTION', resourceId: 'r' } }).map(x => x.title).at(-1), 'Retro');
ist('entfernen', entfernen(baum, { pfad: ['Wohnen & Garten', 'Vasen & Deko'] })[0].items.length, 2);
ist('Tiefe 3 erlaubt, 4 erkannt', [tiefe(baum), tiefe(einfuegenPfad(baum, { eltern: ['Schmuck & Uhren', 'Uhren', 'Herrenuhren', 'Armbänder'], neu: { title: 'Z', type: 'COLLECTION', resourceId: 'z' } }))], [4, 5]);
let fe = ''; try { verschiebe(baum, { von: ['Wohnen & Garten', 'Gibt es nicht'], nach: [] }); } catch (x) { fe = x.message; }
ist('Gegenprobe: unbekannter Eintrag wirft', /nicht gefunden/.test(fe), true);
fe = ''; try { einfuegenPfad(baum, { eltern: ['Nirgends'], neu: { title: 'Q' } }); } catch (x) { fe = x.message; }
ist('Gegenprobe: unbekannter Eltern-Pfad wirft', /nicht gefunden/.test(fe), true);
const g1 = gleicherBaum(v, JSON.parse(JSON.stringify(v)));
ist('Vergleich: gleicher Baum', g1.gleich, true);
const verloren = JSON.parse(JSON.stringify(v)); verloren[0].items[0].items = [];
ist('Gegenprobe: verlorener Eintrag fällt auf', gleicherBaum(v, verloren).gleich, false);
const vertauscht = JSON.parse(JSON.stringify(v)); vertauscht[0].items.reverse();
ist('Gegenprobe: vertauschte Reihenfolge fällt auf', gleicherBaum(v, vertauscht).gleich, false);
ist('Vergleich ignoriert GID/URL-Format', gleicherBaum([{ title: 'A', type: 'COLLECTION', resourceId: 'gid://1', items: [] }], [{ title: 'A', type: 'COLLECTION', resourceId: 'gid://1', url: 'https://x/collections/a', items: [] }]).gleich, true);
// Umbau-Plan: Reihenfolge — Verschieben vor dem Umbenennen von Eltern, Schmuck wird vor dem Befördern von «Uhren» umbenannt
const idx = (op, t) => UMBAU.findIndex(o => o.op === op && JSON.stringify(o).includes(t));
ist('Plan: Schmuck umbenennen vor Uhren befördern', idx('umbenennen', '"Schmuck"') < idx('befoerdern', '"Uhren"'), true);
ist('Plan: Kinder & Baby doppelt entfernen NACH dem Umbenennen', idx('umbenennen', '"Kinder & Baby"') < idx('entfernen', '"Kinder & Baby","Kinder & Baby"'), true);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
