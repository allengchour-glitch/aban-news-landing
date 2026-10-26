/**
 * Arten (Titelmuster je Warenart) der Abteilung Schuhe & Accessoires. Reine Daten (Regex-Strings, Flag i).
 * Die Reihenfolge in REIHENFOLGE ist die Rangfolge: eine Kategorie nimmt nur, was keine FRUEHERE Kategorie derselben
 * Abteilung genommen hat (das Bauskript schreibt dafuer die Muster der frueheren Kategorien als titel_nicht in die spaetere),
 * damit jedes Produkt in genau EINER Blatt-Kategorie je Abteilung steht.
 */
import { wortS, anfS, endS } from './sa_regeln.mjs';

export const G = {
  schuh: ['Apparel & Accessories > Shoes'],
  tasche: ['Apparel & Accessories > Handbags, Wallets & Cases > Handbags', 'Luggage & Bags > Backpacks', 'Luggage & Bags > Briefcases', 'Luggage & Bags > Messenger Bags', 'Luggage & Bags > Fanny Packs', 'Luggage & Bags > Duffel Bags'],
  geldboerse: ['Apparel & Accessories > Handbags, Wallets & Cases > Wallets', 'Apparel & Accessories > Handbags, Wallets & Cases > Badge'],
  guertel: ['Apparel & Accessories > Clothing Accessories > Belts'],
  kopf: ['Apparel & Accessories > Clothing Accessories > Hats', 'Apparel & Accessories > Clothing Accessories > Headwear', 'Apparel & Accessories > Clothing Accessories > Balaclavas', 'Apparel & Accessories > Clothing Accessories > Bandanas', 'Apparel & Accessories > Clothing Accessories > Neck Gaiters'],
  schal: ['Apparel & Accessories > Clothing Accessories > Scarves'],
  handschuh: ['Apparel & Accessories > Clothing Accessories > Gloves'],
  brille: ['Apparel & Accessories > Clothing Accessories > Sunglasses'],
  haar: ['Apparel & Accessories > Clothing Accessories > Hair Accessories'],
};

// ───────────────────────────── Schuh-Arten ─────────────────────────────
export const SCHUH_ARTEN = {
  lauflern: { titel: 'Baby- & Lauflernschuhe', slug: 'lauflernschuhe', muss: [anfS('lauflern\\w*|krabbel\\w*|babys?|baby-?schuh\\w*|baby-|kleinkind\\w*|krippen\\w*|neugeboren\\w*|säugling\\w*|babyschuh\\w*|baby[a-zäöüß]*schuh\\w*')],
    beschreibung: 'Lauflernschuhe, Krabbelschuhe und weiche Babyschuhe für die ersten Schritte — rutschfest und leicht.', uf: [] },
  wander: { titel: 'Wanderschuhe', slug: 'wanderschuhe', muss: [endS('wanderschuh\\w*|wanderstiefel|wanderhalbschuh\\w*|trekking\\w*|hiking\\w*|bergschuh\\w*|bergstiefel|outdoor-?(schuh|stiefel|sneaker|halbschuh)\\w*|geländeschuh\\w*|trail-?(schuh|runner)\\w*|approach-?\\w*|hochtour\\w*|wasserdichte? wander\\w*') + '|' + anfS('wander-')],
    beschreibung: 'Wanderschuhe, Trekkingschuhe und Outdoor-Schuhe mit griffiger Sohle für Wege, Berge und nasse Wiesen.', uf: [] },
  winter: { titel: 'Winterschuhe', slug: 'winterschuhe', muss: [anfS('schneestiefel\\w*|winterstiefel\\w*|winterschuh\\w*|winter-?boots?|winter-?sneaker\\w*|snow-? ?boots?|schneeschuh\\w*|fellstiefel\\w*|thermo-?(stiefel|schuh)\\w*|schnee-?boots?|gefütterte[rn]? (stiefel|boots)|warme[rn]? (stiefel|boots|schneestiefel)|winter-?(stiefelette|halbstiefel)\\w*')],
    beschreibung: 'Gefütterte Winterstiefel, Schneestiefel und warme Winterschuhe für kalte Tage.', uf: [] },
  stiefel: { titel: 'Stiefel & Stiefeletten', slug: 'stiefel', muss: [endS('stiefel\\w*|stiefelette\\w*|boots?|bootie\\w*|chelsea\\w*|overknee\\w*|halbstiefel|knöchelstiefel|schaftstiefel|reitstiefel|gummistiefel|regenstiefel|cowboystiefel|worker|wadenhöhe|ankle-?boots?|calf-?boots?')],
    beschreibung: 'Stiefel, Stiefeletten, Chelsea Boots und Overknees aus Leder, Wildleder und Kunstleder.',
    uf: [{ slug: 'stiefeletten', titel: 'Stiefeletten & Ankle Boots', muss: [anfS('stiefelette\\w*|ankle-?boots?|knöchel\\w*|booties?|kurzstiefel|halbstiefel|low-?cut')] },
      { slug: 'chelsea', titel: 'Chelsea Boots', muss: [anfS('chelsea')] },
      { slug: 'hohe-stiefel', titel: 'Hohe Stiefel & Overknees', muss: [anfS('overknee\\w*|kniehoch\\w*|kniestiefel|hohe[rn]? stiefel|calf-?boots?|wadenhoch\\w*|wadenhöhe|schaftstiefel|reitstiefel|hochschaft\\w*|lange stiefel')] },
      { slug: 'cowboy-worker', titel: 'Cowboy-, Worker- & Bikerstiefel', muss: [anfS('cowboy\\w*|western\\w*|worker\\w*|biker\\w*|combat\\w*|martin\\w*|kampfstiefel|motorradstiefel|militär\\w*')] },
      { slug: 'regenstiefel', titel: 'Regen- & Gummistiefel', muss: [anfS('regenstiefel|gummistiefel|regen-?boots?|wellies')] }] },
  sandalen: { titel: 'Sandalen & Pantoletten', slug: 'sandalen', muss: [endS('sandale\\w*|sandalette\\w*|sandals?|zehentrenner|zehensteg\\w*|flip[- ]?flops?|pantolette\\w*|badelatsche\\w*|badeschlappen|badeschuh\\w*|strandschuh\\w*|wasserschuh\\w*|aqua-?schuh\\w*|wat-?schuh\\w*|schwimmschuh\\w*|beach-?schuh\\w*|wading-?\\w*|espadrille\\w*|clogs?|mules?|slides?|latschen|zehenpartie offen|offene[rn]? zehen\\w*')],
    beschreibung: 'Sandalen, Flip-Flops, Pantoletten und Badeschuhe für Sommer, Strand und Ferien.',
    uf: [{ slug: 'flip-flops', titel: 'Flip-Flops & Zehentrenner', muss: [anfS('flip[- ]?flops?|zehentrenner|zehensteg\\w*|badelatsche\\w*|badeschlappen|slides?|schlappen')] },
      { slug: 'keil-plateau-sandalen', titel: 'Keil- & Plateausandalen', muss: [anfS('keil\\w*|plateau\\w*|plattform\\w*|wedge\\w*|erhöhung\\w*|dicke[rn]? sohle')] },
      { slug: 'riemchen-roemer', titel: 'Riemchen- & Römersandalen', muss: [anfS('riemchen\\w*|römer\\w*|roman\\w*|gladiator\\w*|kreuzriemen|knöchelriemen|schnür\\w*')] },
      { slug: 'pantoletten-mules', titel: 'Pantoletten, Mules & Clogs', muss: [anfS('pantolette\\w*|mules?|clogs?|slip-?ons?|geschlossene[rn]? zeh\\w*')] },
      { slug: 'badeschuhe', titel: 'Bade- & Wasserschuhe', muss: [anfS('badeschuh\\w*|strandschuh\\w*|wasserschuh\\w*|aqua-?schuh\\w*|strand-?\\w*|bade-?\\w*|wasser\\w*')] },
      { slug: 'espadrilles', titel: 'Espadrilles', muss: [anfS('espadrille\\w*|hanfseil|jute\\w*|bast\\w*')] }] },
  haus: { titel: 'Hausschuhe & Pantoffeln', slug: 'hausschuhe', muss: [endS('hausschuh\\w*|pantoffel\\w*|finkli\\w*|finken|pantine\\w*|pantinen|schlüpfer|plüsch-?(schuh|slipper)\\w*|hüttenschuh\\w*|wohnschuh\\w*|bettschuh\\w*|haus-?slipper\\w*|hai-?slipper\\w*|indoor-?(schuh|slipper|pantoffel)\\w*'), anfS('flausch\\w*|schlappen|(cartoon|fleece|winter|warm\\w*|baumwoll\\w*|plüsch\\w*)-? ?slipper\\w*|slipper[- ]+(plüsch|fleece)\\w*|memory-?foam|home-?\\w*')],
    beschreibung: 'Hausschuhe, Pantoffeln und Plüsch-Slipper — weich, warm und rutschfest für zu Hause.', uf: [] },
  sport: { titel: 'Sport-, Lauf- & Tanzschuhe', slug: 'sportschuhe', muss: [endS('laufschuh\\w*|sportschuh\\w*|sportsschuh\\w*|trainingsschuh\\w*|fitnessschuh\\w*|joggingschuh\\w*|tennisschuh\\w*|fussballschuh\\w*|fußballschuh\\w*|basketballschuh\\w*|hallenschuh\\w*|golfschuh\\w*|boxschuh\\w*|ringerschuh\\w*|radschuh\\w*|fahrradschuh\\w*|velo-?schuh\\w*|skate-?schuh\\w*|tanzschuh\\w*|ballettschuh\\w*|kampfsportschuh\\w*|kampfkunstschuh\\w*|sport-?schuh\\w*|walkingschuh\\w*|gymnastikschuh\\w*|wettkampf\\w*|radfahrer-?schuh\\w*|mannschaftsschuh\\w*|barfuss-?schuh\\w*|barfußschuh\\w*|kletterschuh\\w*|boulder\\w*') + '|' + anfS('training\\w*|fitness\\w*|running|jogging|marathon\\w*|wrestling\\w*|badminton\\w*|volleyball\\w*|tischtennis\\w*|basketball\\w*|rennrad\\w*|kampfkunst\\w*|boxen|gym-?\\w*|laufen|spikes?|tennis\\w*|golf\\w*|fussball\\w*|fußball\\w*|skate\\w*')],
    beschreibung: 'Laufschuhe, Trainingsschuhe, Sportschuhe und Tanzschuhe für Jogging, Fitness, Ballspiele und Bewegung im Alltag.', uf: [{ slug: 'laufschuhe', titel: 'Laufschuhe', muss: [anfS('lauf\\w*|running|jogging|marathon\\w*')] }, { slug: 'training-fitness', titel: 'Trainings- & Fitnessschuhe', muss: [anfS('training\\w*|fitness\\w*|gym\\w*|hallen\\w*')] }, { slug: 'tanz', titel: 'Tanzschuhe', muss: [anfS('tanz\\w*|ballett\\w*|latein\\w*')] }, { slug: 'kampfsport-ballsport', titel: 'Kampf- & Ballsportschuhe', muss: [anfS('box\\w*|wrestling\\w*|kampf\\w*|ringer\\w*|basketball\\w*|tischtennis\\w*|badminton\\w*|volleyball\\w*|fussball\\w*|fußball\\w*|tennis\\w*')] }, { slug: 'rad', titel: 'Radschuhe', muss: [anfS('rad\\w*|velo\\w*|fahrrad\\w*|rennrad\\w*')] }] },
  sneaker: { titel: 'Sneaker', slug: 'sneaker', muss: [endS('sneaker\\w*|sneakers|turnschuh\\w*|canvas[- ]?schuh\\w*|segeltuchschuh\\w*|plateau-?sneaker\\w*|plattform-?sneaker\\w*|board[- ]?schuh\\w*|dad[- ]?schuh\\w*|socken-?(schuh|sneaker)\\w*') + '|' + anfS('sneaker|daddy|dad-? ?shoes?|flyknit|old-?dad')],
    beschreibung: 'Sneaker in vielen Formen: Low-Top, High-Top, Plateau und Canvas für Alltag und Freizeit.',
    uf: [{ slug: 'high-top', titel: 'High-Top-Sneaker', muss: [anfS('high-?top\\w*|hochschuh\\w*|knöchelhoch\\w*')] },
      { slug: 'low-top', titel: 'Low-Top-Sneaker', muss: [anfS('low-?top\\w*|niedrige[rn]?|flache[rn]? sneaker')] },
      { slug: 'plateau-chunky', titel: 'Plateau- & Chunky-Sneaker', muss: [anfS('plateau\\w*|plattform\\w*|chunky\\w*|dad-? ?shoes?|daddy|dicke[rn]? sohle|erhöhung\\w*|old-?dad')] },
      { slug: 'canvas-stoff', titel: 'Canvas- & Stoffschuhe', muss: [anfS('canvas\\w*|segeltuch\\w*|leinen\\w*|stoff\\w*|denim\\w*|baumwoll\\w*')] },
      { slug: 'slip-on', titel: 'Slip-on-Sneaker', muss: [anfS('slip-?ons?|schlupf\\w*|ohne schnür\\w*|klettverschluss\\w*|reissverschluss\\w*')] },
      { slug: 'leder-sneaker', titel: 'Leder-Sneaker', muss: [anfS('leder\\w*|echtleder|rindsleder|kunstleder|pu-?leder|wildleder|lammleder')] },
      { slug: 'mesh-atmungsaktiv', titel: 'Mesh- & Atmungsaktive Sneaker', muss: [anfS('mesh\\w*|atmungsaktiv\\w*|flyknit|strick\\w*|luftdurchlässig\\w*')] }] },
  pumps: { titel: 'Pumps & Absatzschuhe', slug: 'pumps', muss: [endS('pumps|heels?|stilettos?|absatzschuh\\w*|peep-?toe\\w*|slingback\\w*|(block|keil|stiletto|hoh\\w*|mittler\\w*|dick\\w*|klobig\\w*|extrahoh\\w*|kitten|chunky)[- ]?absatz\\w*') + '|' + anfS('absatzschuh\\w*|high-? ?heels?|absätze?n?|schlanke[sr]? absatz|super-?absatz|keile?|brautschuh\\w*|hochzeitsschuh\\w*|hohe[rn]? schuh\\w*|plattformhaken\\w*|hohe[rn]? absätz\\w*|schlanke[sr]? absatz'), wortS('keile')],
    nicht: [anfS('ballerina\\w*|flats?')],
    beschreibung: 'Pumps, High Heels und Absatzschuhe — vom schlanken Stiletto bis zum bequemen Blockabsatz.',
    uf: [{ slug: 'stilettos', titel: 'Stilettos & High Heels', muss: [anfS('stilettos?|high-? ?heels?|stilettoabsatz|hohe[rnm]? absatz|extrahoh\\w*|hohe[rn]? absätze')] },
      { slug: 'blockabsatz', titel: 'Blockabsatz', muss: [anfS('block\\w*|klobig\\w*|dick\\w*-?absatz|chunky|mittler\\w*-?absatz')] },
      { slug: 'keilabsatz', titel: 'Keilabsatz & Wedges', muss: [anfS('keil\\w*|wedge\\w*')] },
      { slug: 'peeptoe-slingback', titel: 'Peeptoes & Slingbacks', muss: [anfS('peep-?toe\\w*|slingback\\w*')] },
      { slug: 'plateau-pumps', titel: 'Plateau-Pumps', muss: [anfS('plateau\\w*|plattform\\w*|platform')] }] },
  ballerina: { titel: 'Ballerinas, Loafer & Flache', slug: 'ballerinas', muss: [endS('ballerina\\w*|ballet\\w*|flats?|mary-? ?janes?|loafers?|mokassins?|mocassins?|flachschuh\\w*|flache? schuhe|schlupfschuh\\w*|slip-?ons?|slippers?|halbschuh\\w*|derby\\w*|oxford\\w*|schnürschuh\\w*|brogues?|lederschuh\\w*|flacher? absatz|ohne absatz|flachem absatz|spitze[rn]? zehe|spitz zulaufend\\w*')],
    nicht: [anfS('high-? ?top\\w*|hi-top|plateau-?absatz|plateauabsatz')],
    beschreibung: 'Ballerinas, Loafer, Mokassins und flache Halbschuhe — bequem fürs Büro, die Stadt und den Alltag.',
    uf: [{ slug: 'ballerinas', titel: 'Ballerinas', muss: [anfS('ballerina\\w*')] },
      { slug: 'loafer-mokassins', titel: 'Loafer & Mokassins', muss: [anfS('loafer\\w*|mokassin\\w*|mocassin\\w*|slippers?')] },
      { slug: 'mary-janes', titel: 'Mary Janes', muss: [anfS('mary-? ?janes?')] },
      { slug: 'spitze-flats', titel: 'Spitze Flats', muss: [anfS('spitz\\w*|flachschuh\\w*'), wortS('flats?')] }] },
  business: { titel: 'Business- & Halbschuhe', slug: 'businessschuhe', muss: [endS('halbschuh\\w*|lederschuh\\w*|businessschuh\\w*|business-?(schuh|stiefel)\\w*|derby\\w*|oxford\\w*|brogues?|loafers?|mokassins?|mocassins?|slippers?|schnürschuh\\w*|anzugschuh\\w*|smokingschuh\\w*|monk\\w*|kleiderschuh\\w*|schnürhalbschuh\\w*|slip-?ons?|dress-?shoes?|driving[- ]?(shoes?|schuh\\w*)') + '|' + anfS('business\\w*|anzug\\w*|formell\\w*')],
    nicht: [anfS('freizeit\\w*|paillette\\w*|glitzer\\w*')],
    beschreibung: 'Business-Schuhe, Halbschuhe, Derbys, Oxfords und Loafer aus Leder — für Büro, Anlass und gepflegten Alltag.',
    uf: [{ slug: 'derby-oxford', titel: 'Derby & Oxford', muss: [anfS('derby\\w*|oxford\\w*|brogues?|schnürschuh\\w*|schnürhalbschuh\\w*|monk\\w*')] },
      { slug: 'loafer-slipper', titel: 'Loafer & Slipper', muss: [anfS('loafers?|mokassin\\w*|mocassin\\w*|slippers?|slip-?ons?')] },
      { slug: 'lederschuhe', titel: 'Lederschuhe', muss: [anfS('leder\\w*|echtleder|rindsleder|kuhleder|vollnarbenleder|lammleder')] }] },
  // Rest je Geschlecht (kein Muster: alles, was keine fruehere Kategorie genommen hat)
  freizeit: { titel: 'Freizeitschuhe', slug: 'freizeitschuhe', muss: [], rest: true,
    beschreibung: 'Bequeme Freizeitschuhe für den Alltag — leicht, atmungsaktiv und für lange Wege gemacht.', uf: [] },
};

SCHUH_ARTEN.sandal_flip = { titel: 'Flip-Flops & Badeschuhe', slug: 'flip-flops', muss: [endS('flip[- ]?flops?|zehentrenner|badelatsche\\w*|badeschlappen|badeschuh\\w*|strandschuh\\w*|wasserschuh\\w*|aqua-?schuh\\w*|wat-?schuh\\w*|schwimmschuh\\w*|beach-?schuh\\w*|wading-?\\w*|beach-?slippers?|slides?|latschen')],
  beschreibung: 'Flip-Flops, Zehentrenner, Slides und Badeschuhe für Strand, Pool und Dusche.', uf: [] };
SCHUH_ARTEN.sandal_pant = { titel: 'Pantoletten, Mules & Clogs', slug: 'pantoletten', muss: [endS('pantolette\\w*|mules?|clogs?')],
  beschreibung: 'Pantoletten, Mules und Clogs mit offener Ferse — schnell angezogen, bequem im Alltag.', uf: [] };
SCHUH_ARTEN.sandal_keil = { titel: 'Keil- & Plateausandalen', slug: 'keilsandalen', muss: [anfS('(keil|plateau|plattform|wedge)[a-zäöüß-]*[- ]?(sandale|sandalette|sandals?)\\w*'), anfS('sandal\\w*[^.]{0,40}(keilabsatz|plateau|plattform)')],
  beschreibung: 'Keilsandalen und Plateausandalen mit bequemer Erhöhung — luftig für Sommer und Ausgang.',
  uf: [{ slug: 'keil', titel: 'Keilsandalen', muss: [anfS('keil\\w*|wedge\\w*')] }, { slug: 'plateau', titel: 'Plateausandalen', muss: [anfS('plateau\\w*|plattform\\w*')] }] };
SCHUH_ARTEN.sandalen_damen = { ...SCHUH_ARTEN.sandalen, titel: 'Sandalen', slug: 'sandalen',
  uf: [{ slug: 'riemchen-roemer', titel: 'Riemchen- & Römersandalen', muss: [anfS('riemchen\\w*|römer\\w*|roman\\w*|gladiator\\w*|kreuzriemen|knöchelriemen|schnür\\w*')] },
    { slug: 'espadrilles', titel: 'Espadrilles', muss: [anfS('espadrille\\w*|hanfseil|jute\\w*|bast\\w*')] },
    { slug: 'zehensteg', titel: 'Zehensteg-Sandalen', muss: [anfS('zehensteg\\w*|zehentrenn\\w*|t-?steg\\w*')] },
    { slug: 'sport-outdoor', titel: 'Sport- & Outdoor-Sandalen', muss: [anfS('sport\\w*|outdoor\\w*|trekking\\w*|wander\\w*|klett\\w*')] },
    { slug: 'absatz', titel: 'Sandalen mit Absatz', muss: [anfS('absätz\\w*|(block|stiletto|hoh\\w*|mittler\\w*|dick\\w*|klobig\\w*|extrahoh\\w*|kitten|chunky|schlank\\w*)[- ]?absatz|heels?|high-?heel\\w*|stiletto\\w*|hohe[rnm]?')] },
    { slug: 'flach', titel: 'Flache Sandalen', muss: [anfS('flach\\w*|ohne absatz|niedrig\\w*'), wortS('flats?')] }] };

SCHUH_ARTEN.freizeit_damen = { ...SCHUH_ARTEN.freizeit, titel: 'Freizeit- & Alltagsschuhe', slug: 'freizeitschuhe', beschreibung: 'Bequeme Alltagsschuhe und Freizeitschuhe für Damen — leicht, weich und für lange Tage gemacht.' };

// ───────────────────────────── Taschen ─────────────────────────────
export const TASCHE_ARTEN = {
  brust: { titel: 'Brust- & Gürteltaschen', slug: 'brusttaschen', muss: [endS('brusttasche\\w*|brustbeutel|brust-?bag\\w*|brustpack|sling-?(bag|tasche)\\w*|slingbag|bauchtasche\\w*|gürteltasche\\w*|hüfttasche\\w*|hüft-?bag|waist-?(bag|pack)\\w*|fanny-?pack\\w*|bum-?bag|cross-?chest\\w*'), anfS('sling|brusttasche|hüfttasche|gürteltasche|bauchtasche')],
    beschreibung: 'Brusttaschen, Sling Bags, Bauch- und Gürteltaschen — kompakt getragen, die Hände bleiben frei.',
    uf: [{ slug: 'sling-brust', titel: 'Sling Bags & Brusttaschen', muss: [anfS('sling\\w*|brust\\w*|cross-?chest\\w*')] }, { slug: 'guertel-bauch', titel: 'Gürtel- & Bauchtaschen', muss: [anfS('gürtel\\w*|bauch\\w*|hüft\\w*|waist\\w*|fanny\\w*|bum-?bag')] }] },
  rucksack: { titel: 'Rucksäcke', slug: 'rucksaecke', muss: [endS('rucksack\\w*|rucksäcke|backpack\\w*|daypack|bagpack')],
    beschreibung: 'Rucksäcke für Alltag, Büro und Freizeit.', uf: [] },
  akten: { titel: 'Aktentaschen & Laptoptaschen', slug: 'aktentaschen', muss: [endS('aktentasche\\w*|laptoptasche\\w*|notebooktasche\\w*|laptop-?(hülle|bag)\\w*|business-?tasche\\w*|computer-?tasche\\w*|messenger\\w*|kuriertasche\\w*|aktenkoffer|dokumentenmappe|briefcase\\w*|tablet-?tasche\\w*'), anfS('laptop\\w*|aktentasche|messenger|briefcase')],
    beschreibung: 'Aktentaschen, Laptoptaschen und Messenger Bags für Büro, Uni und Pendeln.', uf: [] },
  reise: { titel: 'Reise- & Sporttaschen', slug: 'reisetaschen', muss: [endS('reise-?(tasche|beutel|sack|bag)\\w*|reisetasche\\w*|travel-?bag\\w*|sporttasche\\w*|sport-?fitness-?tasche|fitness-?tasche\\w*|duffel\\w*|duffle\\w*|weekender|seesack|gym-?bag\\w*|trainingstasche\\w*|wochenendtasche\\w*|reisegepäck|trolley\\w*|koffer|handgepäck\\w*|turnbeutel|sportbeutel|anzugtasche\\w*|kleidersack')],
    beschreibung: 'Reisetaschen, Sporttaschen, Weekender und Duffel Bags für Wochenende, Fitness und Ferien.', uf: [] },
  clutch: { titel: 'Clutches & Abendtaschen', slug: 'clutches', muss: [endS('clutch\\w*|abendtasche\\w*|minaudière|pochette|wristlet\\w*|handgelenktasche\\w*|clutch-?bag\\w*|unterarmtasche\\w*|envelope-?\\w*|umschlagtasche\\w*')],
    beschreibung: 'Clutches, Abendtaschen und kleine Unterarmtaschen für Anlass, Ausgang und Abend.', uf: [] },
  shopper: { titel: 'Shopper & Tragetaschen', slug: 'shopper', muss: [endS('shopper\\w*|handtote|tote-?bag\\w*|einkaufstasche\\w*|tragetasche\\w*|strandtasche\\w*|jutebeutel|stoffbeutel|stofftasche\\w*|einkaufsbeutel|korbtasche\\w*|bastasche|strohtasche\\w*|henkelbeutel|canvas-?tasche\\w*|segeltuchtasche'), wortS('totes?')],
    beschreibung: 'Shopper, Tote Bags, Strandtaschen und Stoffbeutel — geräumig für Einkauf, Arbeit und Strand.', uf: [] },
  handtasche: { titel: 'Handtaschen', slug: 'handtaschen', muss: [endS('handtasche\\w*|henkeltasche\\w*|bucket-?bag\\w*|satchel\\w*|bowlingtasche\\w*|boston-?(bag|tasche)\\w*|trapez\\w*|baguette\\w*|top-?handle\\w*|handbag\\w*|lederhandtasche|damentasche\\w*|hobo-?(bag|tasche)\\w*|mini-?(tasche|bag)\\w*|ledertasche\\w*|echtledertasche\\w*|lederbag\\w*')],
    beschreibung: 'Handtaschen aus Leder und Kunstleder — vom kleinen Henkelmodell bis zur geräumigen Tasche für den Alltag.', uf: [] },
  umhaenge: { titel: 'Umhänge- & Schultertaschen', slug: 'umhaengetaschen', muss: [endS('umhängetasche\\w*|umhaengetasche\\w*|schultertasche\\w*|schulter-?(umhänge)?tasche\\w*|crossbody\\w*|cross-?body\\w*|shoulder-?bag\\w*|shoulderbag|umhängebeutel|umhängebag|schulterbeutel|messenger-?bag'), anfS('umhänge\\w*|schulter\\w*|crossbody|shoulder')],
    beschreibung: 'Umhängetaschen, Crossbody Bags und Schultertaschen — praktisch, leicht und für jeden Tag.',
    uf: [{ slug: 'crossbody', titel: 'Crossbody Bags', muss: [anfS('cross-?body\\w*')] }, { slug: 'schultertaschen', titel: 'Schultertaschen', muss: [anfS('schulter\\w*|shoulder\\w*')] }, { slug: 'leder', titel: 'Leder-Umhängetaschen', muss: [anfS('leder\\w*|echtleder|rindsleder|vollnarben\\w*|kuhleder|crazy-? ?horse|pu-?leder')] }, { slug: 'nylon-canvas', titel: 'Nylon- & Canvas-Taschen', muss: [anfS('nylon\\w*|canvas\\w*|oxford\\w*|stoff\\w*|polyester|wasserdicht\\w*|leinen\\w*')] }] },
  weitere: { titel: 'Weitere Taschen & Rucksäcke', slug: 'weitere-taschen', muss: [], rest: true, beschreibung: 'Weitere Taschen und Rucksäcke für Alltag und Freizeit: kleine Taschen, Beutel, Chest Bags und Modelle, die in keine der übrigen Gruppen passen.', uf: [] },
};

// ───────────────────────────── Geldbörsen ─────────────────────────────
export const GELD_ARTEN = {
  karten: { titel: 'Kartenetuis & Kartenhalter', slug: 'kartenetuis', muss: [anfS('kartenhalter\\w*|kartenetui\\w*|kartentasche\\w*|kartenhülle\\w*|kartenportemonnaie|kartenbörse|card-? ?holder\\w*|ausweis\\w*|visitenkarten\\w*|kreditkarten\\w*|mini-?(card|wallet)\\w*|reisepass\\w*|passhülle|passetui')],
    nicht: [anfS('clutch\\w*')],
    beschreibung: 'Kartenetuis und Kartenhalter in schlank — mit RFID-Schutz, für Kreditkarten, Ausweis und Notizen.', uf: [] },
  geld: { titel: 'Geldbörsen & Portemonnaies', slug: 'geldboersen', muss: [], rest: true,
    beschreibung: 'Geldbörsen, Portemonnaies und Münzbörsen aus Leder und Kunstleder — kompakt oder lang, mit viel Platz für Karten und Scheine.',
    uf: [{ slug: 'langborsen', titel: 'Lange Geldbörsen', muss: [anfS('lang\\w*|long\\w*|langbörse|reissverschluss\\w*|handgelenk\\w*')] }, { slug: 'kurz', titel: 'Kurze Geldbörsen', muss: [anfS('kurz\\w*|kompakt\\w*|klein\\w*|mini\\w*|dreifach\\w*|faltbar\\w*|bifold|trifold')] }, { slug: 'leder', titel: 'Leder-Geldbörsen', muss: [anfS('leder\\w*|echtleder|rindsleder|vollnarben\\w*|kuhleder|crazy-? ?horse|lederportemonnaie')] }] },
};

// ───────────────────────────── Accessoires (je Gruppe EINE Kategorie mit Unterfiltern) ─────────────────────────────

export const ACC_ARTEN = {
  guertel: { titel: 'Gürtel', slug: 'guertel', muss: [endS('gürtel\\w*|guertel\\w*|ledergürtel|gurt|gurte|damengurt\\w*|taillengurt\\w*')], beschreibung: 'Gürtel aus Leder, Kunstleder und Stoff — klassisch mit Dornschliesse, schmal als Taillengürtel oder mit Statement-Schnalle.',
    uf: [{ slug: 'leder', titel: 'Ledergürtel', muss: [anfS('leder\\w*|echtleder|rindsleder|vollnarben\\w*|kuhleder|wildleder')] }, { slug: 'taillen', titel: 'Taillengürtel', muss: [anfS('taillen\\w*|wickel\\w*|bindegürtel|schmal\\w*|breit\\w*|elastisch\\w*')] }, { slug: 'nieten-punk', titel: 'Nieten- & Punk-Gürtel', muss: [anfS('nieten\\w*|punk\\w*|gothic\\w*|spicy\\w*|rock\\w*|skorpion\\w*|totenkopf\\w*|studs?')] }] },
  maske: { titel: 'Sturmhauben & Gesichtsmasken', slug: 'sturmhauben-gesichtsmasken', muss: [endS('maske\\w*|sturmhaube\\w*|balaclava\\w*|gesichtsschutz\\w*|halbgesicht\\w*|nackenschutz\\w*|schlauchschal\\w*|multifunktions-?(tuch|halstuch)\\w*|neck-?gaiter\\w*|gesichtsabdeckung\\w*') + '|' + anfS('gesichts\\w*')], beschreibung: 'Sturmhauben, Gesichtsmasken und Halsschläuche — für Sonne, Wind und kalte Tage.', uf: [] },
  kopf: { titel: 'Mützen, Hüte & Caps', slug: 'kopfbedeckung', muss: [], rest: true, beschreibung: 'Caps, Mützen, Beanies und Sonnenhüte — für Sonne, Wind und kalte Tage.',
    uf: [{ slug: 'caps', titel: 'Caps & Kappen', muss: [endS('caps?|kappe\\w*|baseball\\w*|snapback\\w*|schirmmütze\\w*|trucker\\w*|visier\\w*') + '|' + anfS('cap|flat-?cap|newsboy|schiebermütze|knights? cap|flag-?cap')] },
      { slug: 'muetzen', titel: 'Mützen & Beanies', muss: [endS('mütze\\w*|beanie\\w*|haube|bommel\\w*|plüschmütze|wollmütze|strickmütze|baskenmütze') + '|' + anfS('beanie|mütze|winterhaube')] },
      { slug: 'huete', titel: 'Hüte', muss: [endS('hut|hüte|sonnenhut|fischerhut|strohhut|filzhut|bucket-?hat|cowboyhut|panama\\w*|schlapphut|jazz-?hut')] }] },
  schal: { titel: 'Schals & Tücher', slug: 'schals-tuecher', muss: [], rest: true, beschreibung: 'Schals, Tücher, Stolen und Ponchos aus Wolle, Kaschmir-Optik, Seide und Baumwolle — für Herbst, Winter und Übergang.',
    uf: [{ slug: 'schal', titel: 'Schals', muss: [endS('schal\\w*|halsschal|strickschal|wollschal|kaschmirschal|seidenschal|quastenschal')] },
      { slug: 'tuch', titel: 'Tücher & Kopftücher', muss: [anfS('tuch|tücher|kopftuch\\w*|halstuch\\w*|dreieckstuch|wickeltuch|bandana\\w*|turban\\w*')] },
      { slug: 'wolle-kaschmir', titel: 'Wolle & Kaschmir-Optik', muss: [anfS('kaschmir\\w*|kashmir\\w*|cashmere\\w*|wolle?\\w*|woll-?\\w*|strick\\w*|fleece\\w*')] }] },
  handschuh: { titel: 'Handschuhe', slug: 'handschuhe', muss: [], rest: true, beschreibung: 'Handschuhe für Winter, Velo und Outdoor — mit Touchscreen-Funktion, gefüttert oder als Fäustlinge.',
    uf: [{ slug: 'touchscreen', titel: 'Touchscreen-Handschuhe', muss: [anfS('touchscreen\\w*')] }, { slug: 'leder', titel: 'Lederhandschuhe', muss: [anfS('leder\\w*|lammleder|schafsleder|wildleder|rindsleder|pu-?leder')] }, { slug: 'strick-fleece', titel: 'Strick- & Fleecehandschuhe', muss: [anfS('strick\\w*|fleece\\w*|woll\\w*|kaschmir\\w*|plüsch\\w*')] }, { slug: 'sport-outdoor', titel: 'Ski-, Velo- & Outdoor-Handschuhe', muss: [anfS('ski\\w*|velo\\w*|outdoor\\w*|wasserdicht\\w*|winddicht\\w*|thermo\\w*|beheiz\\w*|heiz\\w*|halbfinger\\w*')] }] },
  brille: { titel: 'Sonnenbrillen', slug: 'sonnenbrillen', muss: [], rest: true, beschreibung: 'Sonnenbrillen mit UV-Schutz — polarisiert, getönt oder verspiegelt, in klassischen und trendigen Formen.',
    uf: [{ slug: 'polarisiert', titel: 'Polarisierte Sonnenbrillen', muss: [anfS('polarisiert\\w*')] }, { slug: 'sport', titel: 'Sport-Sonnenbrillen', muss: [anfS('sport\\w*|velo\\w*|outdoor\\w*')] }, { slug: 'retro', titel: 'Retro- & Vintage-Sonnenbrillen', muss: [anfS('retro\\w*|vintage\\w*|rund\\w*|oval\\w*|cat-?eye\\w*|aviat\\w*|doppelsteg\\w*|pilot\\w*')] }] },
  haar: { titel: 'Haarschmuck', slug: 'haarschmuck', muss: [], rest: true, beschreibung: 'Haarbänder, Haarspangen, Haarklammern und Haarreifen — mit Perlen, Strass, Blumen oder schlicht.',
    uf: [{ slug: 'haarbaender', titel: 'Haarbänder & Stirnbänder', muss: [anfS('haarband\\w*|haarbancken|haarbänder|stirnband\\w*|kopfband\\w*|haarreif\\w*|diadem')] }, { slug: 'spangen-klammern', titel: 'Haarspangen & Haarklammern', muss: [anfS('haarspange\\w*|haarklammer\\w*|haarclip\\w*|haarnadel\\w*|haarkralle\\w*|klammer\\w*|spange\\w*')] }] },
};
