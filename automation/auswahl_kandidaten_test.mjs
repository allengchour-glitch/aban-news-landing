import assert from 'node:assert/strict';
import { stufe, istStandardEinzel, hatCjKennung } from './auswahl_kandidaten.mjs';
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };

const einzel = { variantsCount: { count: 1 }, options: [{ name: 'Title', values: ['Default Title'] }] };
t('Standard-Einzelprodukt erkannt', () => assert.equal(istStandardEinzel(einzel), true));
t('Gegenprobe: zwei Varianten sind kein Einzelprodukt', () => assert.equal(istStandardEinzel({ ...einzel, variantsCount: { count: 2 } }), false));
t('Gegenprobe: eine Variante mit echter Option «Farbe» bleibt unangetastet', () => assert.equal(istStandardEinzel({ variantsCount: { count: 1 }, options: [{ name: 'Farbe', values: ['Rot'] }] }), false));
t('Option «Title» mit eigenem Wert ist kein Standard', () => assert.equal(istStandardEinzel({ variantsCount: { count: 1 }, options: [{ name: 'Title', values: ['Gold'] }] }), false));

t('SKU mit 15+ Ziffern (pid) hat eine CJ-Kennung', () => assert.equal(hatCjKennung('CJ-2502070858141620900'), true));
t('SKU CJYD…AZ (blank) hat eine CJ-Kennung — vorher «keine pid»', () => assert.equal(hatCjKennung('CJYD295267701AZ'), true));
t('SKU CJ-CJCS… hat eine CJ-Kennung', () => assert.equal(hatCjKennung('CJ-CJCS285345301AZ'), true));
t('UUID-SKU hat eine CJ-Kennung', () => assert.equal(hatCjKennung('cj-DDD50071-0e32-4b63-9d9b-1234567890ab'), true));
t('Gegenprobe: BigBuy-SKU bb-S3414715 hat keine', () => assert.equal(hatCjKennung('bb-S3414715'), false));
t('Gegenprobe: Printful-SKU pf-12345 hat keine', () => assert.equal(hatCjKennung('pf-12345'), false));
t('Gegenprobe: leere SKU hat keine', () => { assert.equal(hatCjKennung(''), false); assert.equal(hatCjKennung(null), false); });

t('Stufe 1: bewertet ab 4 Sternen', () => assert.equal(stufe({ g: 'Home & Garden', bewertung: { a: 4.2, c: 3 } }), 1));
t('Gegenprobe: 3,9 Sterne ist nicht Stufe 1', () => assert.equal(stufe({ g: 'Apparel & Accessories > Clothing > Dresses', bewertung: { a: 3.9, c: 30 } }), 2));
t('Stufe 2: Schuhe', () => assert.equal(stufe({ g: 'Apparel & Accessories > Shoes', bewertung: null }), 2));
t('Stufe 2: Ringe, nicht Ohrringe', () => { assert.equal(stufe({ g: 'Apparel & Accessories > Jewelry > Rings' }), 2); assert.equal(stufe({ g: 'Apparel & Accessories > Jewelry > Earrings' }), 3); });
t('Stufe 3: Rest', () => assert.equal(stufe({ g: 'Home & Garden > Kitchen & Dining' }), 3));
console.log(`auswahl_kandidaten_test: ${n} ok`);
