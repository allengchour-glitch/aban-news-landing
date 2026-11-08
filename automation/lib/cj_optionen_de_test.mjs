import assert from 'node:assert/strict';
import { uebersetzeCjFarbe, uebersetzeCjGroesse } from './cj_optionen_de.mjs';

assert.deepEqual(uebersetzeCjFarbe('Light Blue'), { status: 'OK', wert: 'Hellblau' });
assert.deepEqual(uebersetzeCjFarbe('Black / White'), { status: 'OK', wert: 'Schwarz / Weiss' });
assert.deepEqual(uebersetzeCjFarbe('Schwarz'), { status: 'OK', wert: 'Schwarz' });
assert.equal(uebersetzeCjFarbe('Moonlight Frost').status, 'BLOCKED');
assert.equal(uebersetzeCjFarbe('As shown').status, 'BLOCKED');

assert.deepEqual(uebersetzeCjGroesse('One Size'), { status: 'OK', wert: 'Einheitsgrösse' });
assert.deepEqual(uebersetzeCjGroesse('EU 42'), { status: 'OK', wert: 'EU 42' });
assert.equal(uebersetzeCjGroesse('Large Tall').status, 'BLOCKED');

console.log('cj_optionen_de_test: OK');
