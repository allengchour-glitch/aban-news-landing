/** Plan: welche Arten in welcher Rangfolge je Abteilung und Warengruppe. */
import { G, SCHUH_ARTEN } from './sa_arten.mjs';
import { AUSSCHLUSS } from './sa_ausschluss.mjs';
import { ACC_PLAN } from './sa_plan_acc.mjs';

const S = SCHUH_ARTEN;
const KINDER_ARTEN = {
  ...S,
  stiefel: { ...S.stiefel, titel: 'Stiefel & Winterschuhe', slug: 'stiefel', muss: [...S.winter.muss, anfS2('winter[- ]?(kinder-?)?schuh\\w*|winter-kinder\\w*'), ...S.stiefel.muss], beschreibung: 'Gefütterte Kinderstiefel, Winterstiefel, Gummistiefel und Boots — warm, wasserfest und rutschfest.', uf: [] },
  sneaker: { ...S.sneaker, titel: 'Sneaker & Sportschuhe', slug: 'sneaker', muss: [...S.sport.muss.map(x => x.replace('|tanzschuh\\w*|ballettschuh\\w*', '')), ...S.sneaker.muss], beschreibung: 'Kindersneaker und Sportschuhe mit Klettverschluss und flexibler Sohle für Schule, Spielplatz und Sport.', uf: [] },
  ballerina: { ...S.ballerina, titel: 'Ballerinas & Halbschuhe', slug: 'ballerinas', muss: [...S.ballerina.muss, anfS2('tanz\\w*|ballett\\w*|high-? ?heels?|pumps|stilettos?|prinzessin\\w*|lackschuh\\w*|festschuh\\w*|hochzeit\\w*|blumenmädchen|spangenschuh\\w*')], beschreibung: 'Ballerinas, Halbschuhe und Prinzessinnenschuhe für Mädchen — für Feste, Kindergarten und Sonntag.', uf: [] },
  freizeit: { ...S.freizeit, titel: 'Freizeit- & Schulschuhe', slug: 'freizeitschuhe', beschreibung: 'Bequeme Freizeitschuhe und Schulschuhe für Kinder — leicht, atmungsaktiv und leicht anzuziehen.' },
  sandalen: { ...S.sandalen, uf: [] },
  haus: { ...S.haus },
};
function anfS2(s) { return `(^|[^a-zäöüß])(${s})`; }

export const PLAN = [
  { abteilung: 'damen', gruppe: 'schuh', arten: S, reihenfolge: ['wander', 'winter', 'stiefel', 'sandal_flip', 'sandal_pant', 'sandal_keil', 'sandalen_damen', 'haus', 'sport', 'sneaker', 'pumps', 'ballerina', 'freizeit_damen'], gPrefix: G.schuh, ausschluss: AUSSCHLUSS.schuh },
  { abteilung: 'herren', gruppe: 'schuh', arten: S, reihenfolge: ['wander', 'winter', 'stiefel', 'sandalen', 'haus', 'sport', 'sneaker', 'business', 'freizeit'], gPrefix: G.schuh, ausschluss: AUSSCHLUSS.schuh },
  { abteilung: 'kinder', gruppe: 'schuh', arten: KINDER_ARTEN, reihenfolge: ['wander', 'lauflern', 'stiefel', 'sandalen', 'haus', 'sneaker', 'ballerina', 'freizeit'], gPrefix: G.schuh, ausschluss: AUSSCHLUSS.schuh },
  ...ACC_PLAN,
];
