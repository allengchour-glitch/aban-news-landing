import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCjSuccess, readCjResponse } from './cj_response.mjs';

test('echte leere CJ-Antwort bleibt eine leere Antwort', () => {
  assert.deepEqual(assertCjSuccess({ result: true, data: { list: [] } }, 200).data.list, []);
});
test('Tageslimit bei Kommentaren ist kein leeres Produkt', () => {
  assert.throws(() => assertCjSuccess({ result: false, message: 'Insufficient API points' }, 200, '/product/productComments'), /CJ_QUOTA/);
});
test('HTTP-Fehler mit JSON werden nicht als leer übernommen', () => {
  for (const status of [401, 403, 429, 500]) {
    assert.throws(() => assertCjSuccess({ result: false }, status), new RegExp(`HTTP ${status}`));
  }
});
test('CJ-Fachfehler und kaputte JSON-Daten stoppen den Import', async () => {
  assert.throws(() => assertCjSuccess({ result: false, code: 1600000 }, 200), /CJ_API/);
  assert.throws(() => assertCjSuccess({}, 200), /CJ_API/);
  assert.throws(() => assertCjSuccess({ result: true }, 200), /CJ_DATA/);
  await assert.rejects(readCjResponse({ status: 200, json: async () => { throw new Error('bad json'); } }, 'test'), /CJ_JSON/);
});

test('Antwort ohne result ist nur mit ausdrücklicher Angabe ein Erfolg (getInventoryByPid)', () => {
  const bestand = { success: true, code: 200, message: '', data: { variantInventories: [] } };
  assert.throws(() => assertCjSuccess(bestand, 200, 'x'), /CJ_API/);
  assert.equal(assertCjSuccess(bestand, 200, 'x', { ohneResult: true }).code, 200);
  for (const body of [{ code: 200, data: {} }, { success: true, code: 500, data: {} }, { success: true, code: 200, result: false, data: {} }, { success: false, code: 200, data: {} }]) {
    assert.throws(() => assertCjSuccess(body, 200, 'x', { ohneResult: true }), /CJ_API/);
  }
  assert.throws(() => assertCjSuccess({ success: true, code: 200 }, 200, 'x', { ohneResult: true }), /CJ_DATA/);
});
