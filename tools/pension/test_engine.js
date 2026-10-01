// node tools/pension/test_engine.js — Rentenformel an den Eckwerten von Art. 34 AHVG gegengerechnet
const P = require('./engine.js');
let ok = true;
const t = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) ok = false; };
const nah = (a, b, e = 0.01) => Math.abs(a - b) <= e;
t(P.vollrente(10000) === 1260 && P.vollrente(15120) === 1260, 'bis 12 × Mindestbetrag (15 120): Mindestrente 1260');
t(nah(P.vollrente(45360), 1915.2), '36 × Mindestbetrag: beide Formeln = 1915.20 (stetig)');
t(nah(0.74 * 1260 + 13 / 600 * 45360, 1.04 * 1260 + 8 / 600 * 45360), 'Formel a und b treffen sich bei 45 360');
t(P.vollrente(90720) === 2520 && P.vollrente(150000) === 2520, 'ab 72 × Mindestbetrag (90 720): Höchstrente 2520');
t(nah(P.vollrente(60000), 1.04 * 1260 + 8 / 600 * 60000), '60 000: 1310.40 + 800 = 2110.40');
t(nah(P.ahvRente(90720, 22), 1260), '22 von 44 Beitragsjahren: halbe Höchstrente');
const ep = P.ehepaar(2520, 2520);
t(ep.gekuerzt && nah(ep.r1 + ep.r2, 3780) && nah(ep.r1, 1890), 'Ehepaar 2 × 2520 → 3780 (150 %), je 1890');
t(!P.ehepaar(1500, 1800).gekuerzt, 'Ehepaar unter 3780: keine Kürzung');
const e2 = P.ehepaar(2520, 1260); t(nah(e2.r1, 2520), 'Ehepaar 2520 + 1260 = 3780: genau am Plafond, keine Kürzung');
t(nah(P.zukunft(1000, 0, 2, 10), 1210) && nah(P.zukunft(0, 100, 3, 0), 300), 'Zukunftswert mit Zinseszins');
t(nah(P.verzehr(240000, 20, 0), 1000), 'Kapitalverzehr ohne Rendite: 240 000 über 20 Jahre = 1000/Monat');
t(nah(P.sparrate(120000, 10, 0), 1000), 'Sparrate ohne Rendite: 120 000 in 10 Jahren = 1000/Monat');
const c = P.check({ alter: 50, pensionsalter: 65, bisAlter: 90, ziel: 6000, rendite: 0, personen: [{ einkommen: 90720, jahre: 44 }],
  pk: { guthaben65: 500000, satz: 6.0 }, saeule3a: { heute: 50000, proJahr: 7000 }, vermoegen: {} });
t(nah(c.ahv, 2520) && nah(c.ahv13, 210) && nah(c.ahvJahr, 32760), 'AHV 2520/Mt + 13. Rente: 32 760 pro Jahr');
t(nah(c.pkRente, 2500), 'PK 500 000 × 6,0 % = 30 000/Jahr = 2500/Mt');
t(nah(c.kapital3a, 155000) && nah(c.verzehr, 155000 / 300), '3a 50 000 + 15 × 7000 = 155 000, verzehrt über 25 Jahre');
t(nah(c.total, 2520 + 210 + 2500 + 155000 / 300) && nah(c.luecke, 6000 - c.total), 'Total und Lücke');
t(nah(c.kapitalNoetig, c.luecke * 300) && nah(c.sparrate, c.kapitalNoetig / 180), 'Kapital für die Lücke und Sparrate (ohne Rendite)');
const c0 = P.check({ alter: 60, pensionsalter: 65, ziel: 0, personen: [{ einkommen: 50000, jahre: 44 }], pk: { heute: 100000, proJahr: 10000, zins: 0 } });
t(nah(c0.pkGuthaben, 150000) && nah(c0.pkRente, 150000 * 0.068 / 12) && c0.luecke === 0, 'PK-Hochrechnung ohne Ausweis, Mindestumwandlungssatz 6,8 % als Vorgabe');
process.exit(ok ? 0 : 1);
