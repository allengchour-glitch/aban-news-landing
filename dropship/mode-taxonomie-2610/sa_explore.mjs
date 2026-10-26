import { daten, W, A, E, B, stichprobe } from './sa_lib.mjs';
const sch = daten.filter(p => (p.g || '').startsWith('Apparel & Accessories > Shoes'));
const ARBEIT = E('arbeitsschuh\\w*|arbeitsstiefel|sicherheitsschuh\\w*|stahlkappe\\w*|schutzschuh\\w*|arbeits-');
const ARTEN = [
  ['arbeit', ARBEIT],
  ['wander', E('wanderschuh\\w*|wanderstiefel|trekking\\w*|hiking\\w*|bergschuh\\w*|bergstiefel|outdoor-?schuh\\w*|wander-|wanderhalbschuh\\w*|approach')],
  ['winter', A('schneestiefel|winterstiefel|winterschuh\\w*|winter-?boots?|snow ?boots?|fellstiefel|schneeschuh')],
  ['stiefel', A('stiefel\\w*|boots?(?![a-zäöüß])|bootie|chelsea|overknee|ankle ?boot')],
  ['sandale', A('sandale\\w*|sandalette\\w*|zehentrenner|zehensteg|flip-?flops?|pantolette\\w*|badelatsche\\w*|badeschlappen|schlappen|slides?(?![a-zäöüß])|espadrille\\w*|clogs?(?![a-zäöüß])|riemchen')],
  ['pumps', A('pumps|high ?heels?|stilettos?|absatzschuh\\w*|peep-?toe|slingback\\w*')],
  ['haus', A('hausschuh\\w*|pantoffel\\w*|plüschschuh\\w*|hüttenschuh\\w*|wohnschuh\\w*|bettschuh\\w*|slipper(?![a-zäöüß])')],
  ['ballerina', A('ballerina\\w*|flats?(?![a-zäöüß])|mary ?janes?|loafer\\w*|mokassin\\w*|schlupfschuh\\w*|flache? schuh\\w*')],
  ['sport', A('laufschuh\\w*|sportschuh\\w*|trainingsschuh\\w*|fitnessschuh\\w*|joggingschuh\\w*|running|tennisschuh\\w*|fussballschuh\\w*|fußballschuh\\w*|basketballschuh\\w*|hallenschuh\\w*|golfschuh\\w*|turnschuh\\w*|trail')],
  ['sneaker', A('sneaker\\w*|freizeitschuh\\w*|casual')],
];
function art(p){ for(const [n,r] of ARTEN) if(r.test(p.title)) return n; return 'rest'; }
const c={}; const by={};
for (const p of sch){ const a=art(p); c[a]=(c[a]||0)+1; (by[a]=by[a]||[]).push(p); }
console.log(c);
const show = process.argv[2];
if (show) for (const p of stichprobe(by[show]||[], +(process.argv[3]||60), 'x'+show)) console.log(' ', p.title.slice(0,90), '|', p.tags.filter(t=>/schuhe$/.test(t)).join(','));
