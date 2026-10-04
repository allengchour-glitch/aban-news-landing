// Hashtag-Wahl für alle Poster (04.10.2026, Betreiber «hastag auch setzten für mehr follower»).
// Instagram nimmt seit 12/2025 höchstens 5 Hashtags je Post (Reels, Fotos, Karussells); TikTok und YouTube Shorts
// empfehlen 3–5, bei YouTube stehen die ersten 3 über dem Titel. Mehr Tags = nicht möglich → die 5 Plätze zählen.
// Aufbau: Marke · Schweiz-Entdeckung · 2 Warengruppe · Anlass (Saison) oder 3. Warengruppen-Tag.
// Welche Kandidaten gewinnen, entscheidet social/_lernen.json → «hashtags» (Gewicht je Tag, belastbar ab n ≥ 3).
// Gemessen 04.10. (90 T, Basis #schweiz/#luxestyle ×1.11): #shoppingschweiz 1.35 · #zürich 1.32 · #fashionschweiz 1.31 ·
// #swissstyle 1.29 · #modeschweiz 1.28 — darunter #ootdschweiz 1.09 und #schweizmode 1.05 (deshalb nicht mehr pauschal).
// Bleiben draussen (Queue-Regel 23.09.): #fyp #foryou #viral #trending #reels — Reichweiten-Bettelei.
import fs from 'node:fs';
import { catKey } from './reel-category.mjs';

const POOL = {
  haustier:   ['#hund', '#haustier', '#hundeliebe', '#katze', '#hundezubehör', '#haustiere', '#tierliebe'],
  fitness:    ['#fitness', '#homeworkout', '#training', '#fitnessschweiz'],
  kueche:     ['#küche', '#kochen', '#küchenhelfer', '#kochenmitliebe'],
  kinder:     ['#kinder', '#familie', '#spielzeug', '#mamaleben'],
  herren:     ['#herrenmode', '#menstyle', '#swissstyle', '#herrenschmuck', '#sneaker', '#herrenschuhe'],
  schuhe:     ['#sneaker', '#schuhe', '#damenschuhe', '#shoes'],
  schmuck:    ['#schmuck', '#schmuckliebe', '#armband', '#halskette', '#jewelry'],
  beauty:     ['#skincare', '#selfcare', '#beauty', '#pflege'],
  home:       ['#zuhause', '#wohnen', '#homedecor', '#interior'],
  gadget:     ['#gadgets', '#technik', '#gadget', '#techschweiz'],
  tasche:     ['#handtasche', '#tasche', '#bag', '#rucksack'],
  kleid:      ['#kleid', '#fashionschweiz', '#modeschweiz', '#damenmode', '#abendkleid'],
  accessoire: ['#accessoires', '#sonnenbrille', '#swissstyle', '#ootd'],
  mode:       ['#fashionschweiz', '#modeschweiz', '#swissstyle', '#outfit', '#ootd'],
  allgemein:  ['#fundstück', '#onlineshopping', '#alltag', '#geschenkidee'],
};
// Nur passende Unter-Tags: «#abendkleid» nur auf Abendkleidern, «#armband» nur auf Armbändern usw.
const NUR_WENN = {
  '#abendkleid': /abendkleid|ballkleid|cocktailkleid/i, '#armband': /armband|armreif|cuff/i, '#halskette': /kette|anhänger/i,
  '#herrenschmuck': /herren.*(ring|kette|armband|schmuck)|(ring|kette|armband).*herren/i, '#katze': /katz/i,
  '#hundezubehör': /hund/i, '#hund': /hund/i, '#hundeliebe': /hund/i, '#sonnenbrille': /sonnenbrille/i,
  '#rucksack': /rucksack/i, '#sneaker': /sneaker|turnschuh/i, '#kleid': /kleid/i, '#herrenschuhe': /schuh|sneaker|loafer|slipper|stiefel|boots/i, '#damenschuhe': /damen/i, '#spielzeug': /spielzeug|plüsch|puzzle|baustein/i,
};
const SAISON = {
  halloween:  ['#halloween', '#halloweendeko', '#gruselig', '#halloweenparty'],
  weihnacht:  ['#weihnachten', '#weihnachtsdeko', '#adventszeit', '#dekoideen'],
};
const HALLOWEEN = /halloween|kostüm|grusel|kürbis|skelett|totenkopf|spinne|tarantel|hexe|vampir|zombie|horror/i;
const WEIHNACHT = /weihnacht|advent|christmas|xmas|nikolaus|tannenbaum|rentier|schneemann|zuckerstange/i;
const ENTDECKUNG = ['#shoppingschweiz', '#zürich', '#swissstyle', '#schweiz'];
const STOP = /^#(fyp|foryou|foryoupage|viral|trending|reels|explore)$/i;

function anlass(titel, datum) {
  const m = datum.getUTCMonth() + 1, d = datum.getUTCDate();
  if ((m === 11 || (m === 12 && d <= 23)) && /schmuck|kette|armband|ohrring|ring|uhr|parfum|beauty|set|geschenk|plüsch|spielzeug|gadget/i.test(titel))
    return '#weihnachtsgeschenk';
  if ((m === 9 || m === 10 || m === 11) && /strick|pullover|mantel|jacke|\bschal\b|mütze|cardigan|stiefel|\bboots\b|hoodie/i.test(titel))
    return '#herbstmode';
  return null;
}

let _lernen;
function gewichte() {
  if (_lernen !== undefined) return _lernen;
  try { _lernen = JSON.parse(fs.readFileSync(new URL('../../social/_lernen.json', import.meta.url), 'utf8')).hashtags || {}; } catch { _lernen = {}; }
  return _lernen;
}
const gw = t => { const v = gewichte()[t]; return v && v.belastbar ? v.gewicht : 1.11; };   // unbekannt = Basis
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Stärkste zuerst; der zweite Platz rotiert per Titel zwischen den Besten, damit neue Kandidaten Messwerte bekommen.
function wahl(kandidaten, n, salz) {
  // belastbar schwächer als der Durchschnitt (< 1.0) → nicht mehr wählen
  const k = [...new Set(kandidaten)].filter(t => gw(t) >= 1.0).sort((a, b) => gw(b) - gw(a));
  if (k.length <= n) return k;
  const rest = k.slice(1, Math.min(k.length, n + 2));
  const aus = [k[0]];
  for (let i = 0; aus.length < n && i < rest.length; i++) aus.push(rest[(hash(salz) + i) % rest.length]);
  return aus;
}

// plattform: instagram | facebook | tiktok | youtube → Array mit höchstens 5 Tags (YouTube: #shorts vorne).
export function hashtagSet(titel, { plattform = 'instagram', datum = new Date() } = {}) {
  const t = String(titel || '');
  const saison = HALLOWEEN.test(t) ? 'halloween' : WEIHNACHT.test(t) ? 'weihnacht' : null;   // Saisonware: Saison-Pool
  const kat = saison || catKey(t);
  const pool = (SAISON[kat] || POOL[kat] || POOL.allgemein).filter(x => !NUR_WENN[x] || NUR_WENN[x].test(t));
  const a = saison ? null : anlass(t, datum);
  const ware = wahl(pool, a ? 2 : 3, t);
  // Schweiz-Platz: meist der gemessen beste, jeder dritte Titel den zweitbesten (sonst lernt die Tabelle nichts Neues).
  const orte = [...ENTDECKUNG].sort((x, y) => gw(y) - gw(x));
  const ort = orte[hash(t) % 3 === 0 ? 1 : 0];
  const set = [...new Set(['#luxestyle', ort, ...ware, ...(a ? [a] : [])])].filter(x => x && !STOP.test(x));
  // Kleiner Pool (Bedingungen strichen Kandidaten) → mit allgemeinen Entdeckungs-Tags auf 5 auffüllen.
  for (const x of [...pool, orte[ort === orte[0] ? 1 : 0], '#onlineshopping', '#geschenkidee']) { if (set.length >= 5) break; if (!set.includes(x)) set.push(x); }
  // YouTube zeigt die ersten 3 Tags über dem Titel → #shorts + Ware vorne.
  if (plattform === 'youtube') return [...new Set(['#shorts', ...set.filter(x => x !== '#luxestyle' && x !== ort).slice(0, 2), ort, '#luxestyle'])].slice(0, 5);
  return set.slice(0, 5);
}
export const hashtagText = (titel, opt) => hashtagSet(titel, opt).join(' ');
