/** Plan der Taschen und Accessoires. */
import { G, TASCHE_ARTEN, GELD_ARTEN, ACC_ARTEN } from './sa_arten.mjs';
import { AUSSCHLUSS } from './sa_ausschluss.mjs';
const T = ['brust', 'rucksack', 'reise', 'akten', 'clutch', 'shopper', 'handtasche', 'umhaenge', 'weitere'];
const one = (abteilung, id, gruppe) => ({ abteilung, gruppe, arten: ACC_ARTEN, reihenfolge: [id], gPrefix: G[gruppe], ausschluss: AUSSCHLUSS[gruppe] || [] });
export const ACC_PLAN = [
  { abteilung: 'damen', gruppe: 'tasche', arten: TASCHE_ARTEN, reihenfolge: T, gPrefix: G.tasche, ausschluss: AUSSCHLUSS.tasche },
  { abteilung: 'herren', gruppe: 'tasche', arten: TASCHE_ARTEN, reihenfolge: T, gPrefix: G.tasche, ausschluss: AUSSCHLUSS.tasche },
  { abteilung: 'damen', gruppe: 'geldboerse', arten: GELD_ARTEN, reihenfolge: ['karten', 'geld'], gPrefix: G.geldboerse, ausschluss: AUSSCHLUSS.geldboerse },
  { abteilung: 'herren', gruppe: 'geldboerse', arten: GELD_ARTEN, reihenfolge: ['karten', 'geld'], gPrefix: G.geldboerse, ausschluss: AUSSCHLUSS.geldboerse },
  ...['damen', 'herren'].flatMap(a => [one(a, 'guertel', 'guertel'), { ...one(a, 'kopf', 'kopf'), reihenfolge: ['maske', 'kopf'] }, one(a, 'schal', 'schal'), one(a, 'handschuh', 'handschuh'), one(a, 'brille', 'brille'), one(a, 'haar', 'haar')]),
];
