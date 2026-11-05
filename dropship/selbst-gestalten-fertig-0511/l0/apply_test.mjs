import assert from 'node:assert/strict';
import { zuKlein, SCHWELLE, MANUELL } from './apply.mjs';
let n = 0; const t = (f) => { f(); n++; };
t(() => assert.equal(SCHWELLE, 0.85));
t(() => assert.equal(zuKlein(23.5, 75), true));      // Boardshorts
t(() => assert.equal(zuKlein(55.8, 150), true));     // Poster
t(() => assert.equal(zuKlein(133.3, 150), false));   // Mauspad: 89 %
t(() => assert.equal(zuKlein(137.1, 150), false));   // Notizbuch
t(() => assert.equal(zuKlein(70.6, 75), false));     // Stoffbeutel
t(() => assert.equal(zuKlein(57.1, 75), true));      // Kissen: 76 %
t(() => assert.equal(zuKlein(100, 75), false));      // T-Shirt
t(() => assert.equal(zuKlein(63.75, 75), false));    // genau 85 % bleibt
t(() => assert.equal(zuKlein(63.7, 75), true));
t(() => assert.equal(zuKlein(null, 75), false));     // Unbekanntes wird nie still gesperrt
t(() => assert.equal(zuKlein(30, NaN), false));
t(() => assert.equal(zuKlein(30, 0), false));
t(() => assert.equal(zuKlein(MANUELL['recycelte-allover-jogginghosen-selbst-gestalten'].dpiMin, 75), true));
console.log(`l0/apply_test: ${n} Prüfungen grün`);
