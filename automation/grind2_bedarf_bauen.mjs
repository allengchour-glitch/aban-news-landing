// Baut /tmp/grind2/luecken.json neu (die Lückenanalyse vom 27.10. lag nur im /tmp und ging beim Neustart verloren).
// Quelle der Ziele: automation/lib/grind_google_daten.json → regeln[] (Feld «ziel» = «<id> (<rang>)»).
// Bestand je Ziel GEMESSEN: aktive Produkte des frischen Katalogs, deren Titel eine «titel_muss»-Regel des Ziels trifft
// und keine «titel_nicht»-Regel. Lücke = Zielgrösse minus Bestand (nie negativ). Suchwörter für CJ: Handliste unten.
// Aufruf: node automation/grind2_bedarf_bauen.mjs <katalog.json> <aus.json>   (Katalog: node automation/katalog_bulk.mjs /tmp/katalog_voll.json)
// Vorgabe-Ausgabe dropship/grind2_bedarf.json wird von grind2.mjs gelesen, wenn /tmp/grind2/luecken.json fehlt (frischer Checkout).
import { readFileSync, writeFileSync } from 'node:fs';
const [, , KAT = '/tmp/katalog_voll.json', AUS = new URL('../dropship/grind2_bedarf.json', import.meta.url).pathname] = process.argv;
const daten = JSON.parse(readFileSync(new URL('./lib/grind_google_daten.json', import.meta.url), 'utf8'));
const kat = JSON.parse(readFileSync(KAT, 'utf8'));
const produkte = (kat.produkte || []).filter(p => String(p.status || 'ACTIVE').toUpperCase() === 'ACTIVE');

const SUCHE = {
  webcams: 'webcam · usb camera', handyketten: 'phone lanyard · phone strap', schneeschuhe: 'snowshoes',
  verlobung: 'engagement ring', tablethuellen: 'tablet case · ipad case', peruecken: 'wig',
  wickelunterlagen: 'changing pad', kronleuchter: 'chandelier', maulkoerbe: 'dog muzzle',
  lichterketten: 'string lights · fairy lights · led string light', fensterdeko: 'window sticker · window cling · window decal', dashcams: 'dash cam',
  beamerleinwand: 'projector screen', bettdecken: 'duvet cover · comforter · quilt', laptophuellen: 'laptop sleeve · laptop bag',
  manschettenknoepfe: 'cufflinks', hundetreppen: 'dog stairs · pet ramp', badehosen: 'swim trunks',
  katzentunnel: 'cat tunnel', hundeschuhe: 'dog boots', panzerglas: 'tempered glass screen protector',
  pendelleuchten: 'pendant light', '3dstifte': '3d pen · pla filament', geschenkband: 'gift ribbon · gift wrapping paper · gift bow',
  rueckfahrkameras: 'reversing camera', etikettendrucker: 'label printer', skibrillen: 'ski goggles · snowboard goggles',
  werkzeugkoffer: 'tool set · tool box', babyschlafsack: 'baby sleeping bag', babyoveralls: 'baby snowsuit · baby romper',
  autoabdeckung: 'car cover · windshield cover', motorradheadset: 'motorcycle headset', brautschmuck: 'bridal jewelry set · tiara',
  carplay: 'carplay adapter', handyhuellen: 'phone case', fahrradhandschuhe: 'cycling gloves', hundehalstuecher: 'dog bandana',
  schwimmbrillen: 'swim goggles', verstaerker: 'audio amplifier', actioncams: 'action camera', kuehlmatten: 'pet cooling mat',
  angeln: 'fishing rod · fishing reel · fishing lure', hdmikabel: 'hdmi cable', airpods: 'airpods case', ringlicht: 'ring light',
  taschenlampen: 'flashlight · headlamp', aquariumzubehoer: 'aquarium filter · aquarium decoration', trockenblumen: 'dried flowers · artificial flowers',
  augenbrauen: 'eyebrow pencil', kinderuhren: 'kids watch · children watch', fussketten: 'anklet', joysticks: 'joystick', solarlampen: 'solar garden light',
  loetkolben: 'soldering iron',
};
// SETZUNG 11.11.: Saison jetzt (Winter, Geschenke) = S; Sommerware zurückgestellt = R; sonst Welle 1.
const SAISON = new Set(['lichterketten', 'fensterdeko', 'geschenkband', 'skibrillen', 'schneeschuhe', 'bettdecken', 'babyschlafsack', 'babyoveralls', 'kinderuhren', 'joysticks', 'actioncams', 'trockenblumen', 'kronleuchter', 'taschenlampen']);
const ZURUECK = new Set(['badehosen', 'schwimmbrillen', 'kuehlmatten', 'solarlampen', 'fussketten']);

const ziele = new Map();
for (const r of daten.regeln) {
  const m = String(r.ziel || '').match(/^([a-z0-9]+) \((\d+)\)$/);
  if (!m) continue;                                            // «Tierkleidung», «Kollision …», «ersetzt Lexikon …» sind keine Ziele
  const [, id, rang] = m;
  const z = ziele.get(id) || { id, rang: Number(rang), regeln: [] };
  z.regeln.push(r); ziele.set(id, z);
}
const re = (liste) => (liste || []).map(s => new RegExp(s, 'i'));
const aus = [];
for (const z of [...ziele.values()].sort((a, b) => a.rang - b.rang)) {
  const muss = z.regeln.flatMap(r => re(r.titel_muss)), nicht = z.regeln.flatMap(r => re(r.titel_nicht));
  const bestand = produkte.filter(p => { const t = String(p.title || ''); return muss.some(x => x.test(t)) && !nicht.some(x => x.test(t)); }).length;
  const welle = SAISON.has(z.id) ? 'S' : ZURUECK.has(z.id) ? 'R' : '1';
  const ziel = welle === 'S' ? 30 : 45;
  aus.push({ id: z.id, name: z.id, rang: z.rang, welle, ziel, bestand, luecke: Math.max(0, ziel - bestand), cj: '', cjSuche: SUCHE[z.id] || '',
    auflage: 'neu gebaut 11.11.2026 aus grind_google_daten.regeln; Bestand = Titel-Treffer im Katalog', risiko: '', auswahl: '' });
}
const fehlt = aus.filter(z => !z.cjSuche).map(z => z.id);
if (fehlt.length) { console.error('Ohne Suchwort:', fehlt.join(', ')); process.exit(2); }
writeFileSync(AUS, JSON.stringify({ stand: new Date().toISOString(), katalog: KAT, aktiv: produkte.length, ziele: aus }, null, 1));
console.log(`aktiv ${produkte.length} · Ziele ${aus.length} · mit Lücke ${aus.filter(z => z.luecke > 0).length}`);
for (const z of aus) console.log(`${String(z.rang).padStart(2)} ${z.welle} ${z.id.padEnd(20)} Bestand ${String(z.bestand).padStart(4)} Lücke ${z.luecke}`);
