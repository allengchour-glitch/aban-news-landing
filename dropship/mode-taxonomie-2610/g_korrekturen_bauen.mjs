/**
 * Baut g_korrekturen.json: Produkte, deren Google-Kategorie in den Quelldaten offensichtlich falsch ist (Titel nennt ein Kleidungsstueck,
 * g sagt «Belts», «Handbags», «Shoes», «Dolls», «Hats» oder fehlt). Die Korrektur ist DATEN, keine Regel: Wer die Kategorie-Tags schreibt
 * (automation/kategorien_anlegen.mjs) wertet die Regeln auf  g' = g_korrekturen[handle] ?? g  aus; sauberer ist, g im Shop selbst zu setzen
 * (hilft auch dem Merchant-Feed). Jede Zeile nennt Grund und alten Wert. Handarbeit: nur Faelle, in denen der Titel eindeutig ist.
 *   node g_korrekturen_bauen.mjs [--schreiben]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const byH = new Map(d.map(p => [p.handle, p]));
const C = 'Apparel & Accessories > Clothing > ';
const G = { kleid: C + 'Dresses', rock: C + 'Skirts', hose: C + 'Pants', shorts: C + 'Shorts', jacke: C + 'Outerwear > Coats & Jackets', weste: C + 'Outerwear > Vests', overall: C + 'One-Pieces > Jumpsuits & Rompers', oberteil: C + 'Shirts & Tops', set: C + 'Outfit Sets', nacht: C + 'Sleepwear & Loungewear > Nightgowns', sport: C + 'Activewear', bade: C + 'Swimwear', socken: C + 'Underwear & Socks > Socks', zubehoer: 'Apparel & Accessories > Clothing Accessories', schal: 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls > Scarves' };
const ausnahme = {}; // handle -> [g, grund]  (Handliste, gelesen)
const setze = (teil, g, grund) => { const hs = d.filter(p => p.handle.startsWith(teil)); if (hs.length < 1 || hs.length > 3) throw new Error(`${teil}: ${hs.length} Treffer`); for (const p of hs) ausnahme[p.handle] = [g, grund]; };

// A. Echte Damen-/Kinderkleidung mit falscher Google-Kategorie (Analysten-Listen «[REIN]» und «Bekleidung»; Titel geprueft)
setze('sommerkleid-fleur-noir', G.kleid, 'Kleid, g «Belts» wegen «Bindegürtel» im Titel');
setze('blazer-roma-tailliert', G.jacke, 'Blazer, g «Belts»');
setze('damen-overall-mit-pailletten', G.overall, 'Overall, g «Belts»');
setze('kurze-wattierte-jacke-mit-gu', G.jacke, 'Jacke, g «Belts»');
setze('kurze-baumwolljacke-mit-gurt', G.jacke, 'Jacke, g «Belts»');
setze('karierter-trenchcoat-mit-bin', G.jacke, 'Trenchcoat, g «Belts»');
setze('twill-trenchcoat-mit-bindegu', G.jacke, 'Trenchcoat, g «Belts»');
setze('langer-kimonostreifen-mit-se', G.jacke, 'Kimono-Überwurf, g «Belts»');
// «Kurzer Shawl aus Strick mit Bindegürtel» bewusst NICHT korrigiert: weder eindeutig Schal noch Kleidungsstück (die Schal-Regel schliesst «Bindegürtel» aus)
setze('yoga-sport-maxirock-mit-tasc', G.rock, 'Rock, g «Handbags» wegen «Taschen»');
setze('midirock-mit-tunnelzug-und-g', G.rock, 'Rock, g «Handbags»');
setze('damen-maxirock-mit-print-und', G.rock, 'Rock, g «Handbags»');
setze('satin-a-linien-jupe-mit-tasc', G.rock, 'Rock, g «Handbags»');
setze('commuter-slimming-jupe-mit-t', G.rock, 'Rock, g «Handbags»');
setze('leichter-skort-mit-taschen-4', G.rock, 'Skort, g «Handbags»');
setze('atmungsaktiver-yoga-skort-mi', G.rock, 'Skort, g «Handbags»');
setze('luftige-caprihose-mit-tasche', G.hose, 'Hose, g «Handbags»');
setze('loose-fit-stoffhose-mit-tasc', G.hose, 'Hose, g «Handbags»');
setze('high-waist-button-fly-jogger', G.hose, 'Hose, g «Handbags»');
setze('multifunktionale-weste-2e56c', G.weste, 'Weste, g «Handbags»');
setze('bootcut-fitnesshose-mit-huft', G.sport, 'Fitnesshose, g «Push Up & Pull Up Bars»');
setze('kapuzenpullover-aus-plusch-6', G.oberteil, 'Kapuzenpullover, g «Dolls, Playsets»');
setze('gothic-stil-pluschmantel-mit', G.jacke, 'Mantel, g «Dolls, Playsets»');
setze('damen-nachthemd-aus-plusch-m', G.nacht, 'Nachthemd, g «Dolls, Playsets»');
setze('damen-jacke-silbrig-mit-glit', G.jacke, 'Jacke ohne Google-Kategorie');
setze('damen-jacke-rosa-mit-glitzer', G.jacke, 'Jacke ohne Google-Kategorie');
setze('damen-jacke-gold-mit-glitzer', G.jacke, 'Jacke ohne Google-Kategorie');
setze('damen-strickjacke-schwarz-fg', G.oberteil, 'Strickjacke ohne Google-Kategorie (Strickjacken liegen in «Shirts & Tops»)');
setze('strickjacke-damen-dunkelblau', G.oberteil, 'Strickjacke ohne Google-Kategorie');
setze('strickjacke-damen-naturfarbe', G.oberteil, 'Strickjacke ohne Google-Kategorie');
setze('trachtenbluse-damen-fgsshb26', G.oberteil, 'Bluse ohne Google-Kategorie');
setze('raver-set-damen-hose-shirt-f', G.set, 'Set ohne Google-Kategorie');
setze('japanische-loose-fit-freizei', G.hose, 'Freizeithose, g «Shoes»');
setze('stretchbare-ankel-boot-socke', G.socken, 'Socken, g «Shoes»');
setze('lauflern-socken-mit-grip-288', G.socken, 'Socken, g «Shoes»');
setze('baby-anti-rutsch-bodensocken-714432', G.socken, 'Socken, g «Shoes»');
setze('rutschfeste-bodensocken-fur-', G.socken, 'Socken, g «Shoes»');
setze('kinderfu-socken-mit-cartoon-', G.socken, 'Socken, g «Shoes»');
setze('cotton-socken-fur-kinder-1d0', G.socken, 'Socken, g «Shoes»');
setze('kinder-anti-rutsch-socken-91', G.socken, 'Socken, g «Shoes»');
// B. Funde der gemeinsamen Pruefung
setze('mutze-schal-handschuhe-set-fur-kinder-648900', G.zubehoer, 'Mütze-Schal-Handschuh-Set ist Zubehör, g «Outfit Sets»');
setze('velours-kolbenrock-mit-v-aus', G.rock, 'Rock, g «Dresses»');
setze('langarmelige-bead-und-diamanten-verzierter-roc-622300', G.rock, 'Rock, g «Dresses»');
setze('blauer-striped-langarm-shirtrock-601900', G.rock, 'Rock, g «Dresses»');
setze('mesh-maxi-cape-mit-fledermausarmeln-630400', G.jacke, 'Cape, g «Dresses»');
// C. Einzelfaelle der Damen-Abteilung (rest.vorschlag)
setze('weitlaufiger-pullover-mit-kapuze-630300', G.jacke, 'Jacke, g «Shirts & Tops»');
setze('corduroy-pullover-mit-baumwollfullung-627200', G.jacke, 'Jacke, g «Shirts & Tops»');
setze('knitted-cardigan-mid-length-aus-100-baumwolle-616400', G.jacke, 'Mantel, g «Shirts & Tops»');
setze('casual-badetop-fur-damen-465857', G.bade, 'Badetop, g «Shirts & Tops»');
setze('sexy-samt-hotpants-mit-hoher-taille-628000', G.shorts, 'Hotpants, g «Pants»');
const out = {}; const verworfen = [];
for (const [h, [g, grund]] of Object.entries(ausnahme)) {
  const p = byH.get(h);
  // Fortura = Kostuem-Lieferant (Fasnacht, eigene ft-*-Kategorien): diese Produkte gehoeren nie in die Alltagsmode, auch wenn der Titel nach Jacke/Strickjacke klingt
  if ((p.tags || []).includes('fortura')) { verworfen.push(p.title); continue; }
  out[h] = { titel: p.title, alt: p.g || '', g, grund };
}
if (verworfen.length) console.log('verworfen (Tag fortura, Kostueme):', verworfen.length, verworfen.join(' | '));
if (process.argv.includes('--schreiben')) { fs.writeFileSync(path.join(HERE, 'g_korrekturen.json'), JSON.stringify(out, null, 1)); console.log('geschrieben:', Object.keys(out).length); }
else Object.entries(out).forEach(([h, o]) => console.log(h.slice(0, 40).padEnd(40), '|', o.titel.slice(0, 50).padEnd(50), '|', o.alt.replace('Apparel & Accessories > ', '').slice(0, 24).padEnd(24), '->', o.g.replace('Apparel & Accessories > ', '').replace('Clothing > ', '').slice(0, 34)));
