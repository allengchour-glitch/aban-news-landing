// Test für lib/pod_variantenbilder.mjs (rein, ohne Netz). Aufruf: node automation/lib/pod_variantenbilder_test.mjs
import assert from 'node:assert/strict';
import { pfVarianteId, schlechtesVariantenbild, plane, MAX_AUSSEHEN } from './pod_variantenbilder.mjs';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

// --- SKU → Printful-Variante ---
t('SKU mit Auftragsnummer', () => assert.equal(pfVarianteId('9000001_4011'), '4011'));
t('SKU mit Buchstabenpräfix (LS395_22609)', () => assert.equal(pfVarianteId('LS395_22609'), '22609'));
t('eigene Produkte haben keine Printful-Nummer', () => {
  assert.equal(pfVarianteId('WM-TRIKOT-RO-S'), null);
  assert.equal(pfVarianteId(''), null);
  assert.equal(pfVarianteId(null), null);
  assert.equal(pfVarianteId('CJ-CJ123456'), null);
  assert.equal(pfVarianteId('1234_ab'), null);
});

// --- Rückansicht erkennen ---
t('Rückansicht am Dateinamen', () => {
  assert.equal(schlechtesVariantenbild('https://cdn.shopify.com/s/files/unisex-classic-tee-white-back-6a27.jpg?v=1'), true);
  assert.equal(schlechtesVariantenbild('https://cdn.shopify.com/x/blank-tee-white_3a01.png'), false);
  assert.equal(schlechtesVariantenbild('https://cdn.shopify.com/x/backpack-front.jpg'), false); // «backpack» ist keine Rückansicht
  assert.equal(schlechtesVariantenbild(null), false);
});

// --- Hilfen ---
const pf = (id, produkt, farbe, bild, name) => [String(id), { product_id: produkt, color: farbe, size: 'M', image: bild, name: name || `P${produkt} (${farbe} / M)` }];
const v = (id, sku, bildUrl = null) => ({ id, sku, bildUrl });

// --- Farben: Shirt mit drei Farben, je fünf Grössen ---
const shirt = (() => {
  const pfm = {};
  const vs = [];
  const farben = [['White', 4011], ['Black', 4016], ['Navy', 4111]];
  let i = 0;
  for (const [f, basis] of farben) for (let s = 0; s < 5; s++) {
    const id = basis + s;
    pfm[id] = pf(id, 71, f, `https://p.example/71/${f}.jpg`)[1];
    vs.push(v(`gid://v/${++i}`, `9000001_${id}`));
  }
  return { handle: 'shirt-zum-selbstgestalten', titel: 'Shirt', varianten: vs, pf: pfm };
})();
t('drei Farben ergeben drei Gruppen, jede mit fünf Varianten', () => {
  const p = plane(shirt);
  assert.equal(p.status, 'plan');
  assert.equal(p.gruppen.length, 3);
  assert.deepEqual(p.gruppen.map((g) => g.varianten.length), [5, 5, 5]);
  assert.deepEqual(p.gruppen.map((g) => g.label), ['White', 'Black', 'Navy']);
  assert.ok(p.gruppen[1].alt.includes('Black'));
  assert.equal(p.ersetzen, false);
});
t('jede Variante kommt genau einmal vor', () => {
  const p = plane(shirt);
  const alle = p.gruppen.flatMap((g) => g.varianten);
  assert.equal(alle.length, 15);
  assert.equal(new Set(alle).size, 15);
});
t('ein Aussehen (nur Grössen) wird übersprungen', () => {
  const eins = { ...shirt, varianten: shirt.varianten.slice(0, 5) };
  const p = plane(eins);
  assert.equal(p.status, 'skip');
  assert.equal(p.grund, 'ein-aussehen');
});
t('vorhandenes gutes Eigenbild bleibt unberührt', () => {
  const s = { ...shirt, varianten: shirt.varianten.map((x, i) => (i === 0 ? { ...x, bildUrl: 'https://cdn.shopify.com/x/eigen.jpg' } : x)) };
  const p = plane(s);
  assert.equal(p.gruppen[0].varianten.length, 4);
  assert.deepEqual(p.uebersprungen, [{ variante: 'gid://v/1', grund: 'hat-eigenes-bild' }]);
});

// --- Rückansicht ersetzen (klassisches T-Shirt: ein Aussehen, aber alle Bilder falsch) ---
t('Rückansichten werden ersetzt, auch bei nur einem Aussehen', () => {
  const pfm = {};
  const vs = [];
  for (let i = 0; i < 8; i++) { pfm[11576 + i] = pf(11576 + i, 438, 'White', 'https://p.example/438/w.jpg')[1]; vs.push(v(`gid://v/${i}`, `8481330_${11576 + i}`, 'https://cdn.shopify.com/x/unisex-classic-tee-white-back-6a27.jpg?v=1')); }
  const p = plane({ handle: 'klassisches-unisex-t-shirt-selbst-gestalten', titel: 'Klassisches T-Shirt', varianten: vs, pf: pfm });
  assert.equal(p.status, 'plan');
  assert.equal(p.ersetzen, true);
  assert.equal(p.gruppen.length, 1);
  assert.equal(p.gruppen[0].varianten.length, 8);
  assert.equal(p.gruppen[0].ersetzen.length, 8);
});

// --- Gleiche Bilder werden zusammengelegt (Poster matt/Luster) ---
t('gleicher Inhalt = ein Medium', () => {
  const pfm = { 1: pf(1, 268, '', 'https://p/a.jpg')[1], 2: pf(2, 171, '', 'https://p/b.jpg')[1], 3: pf(3, 3, '', 'https://p/c.jpg')[1] };
  const vs = [v('a', '1_1'), v('b', '1_2'), v('c', '1_3')];
  const p = plane({ handle: 'poster', titel: 'Poster', varianten: vs, pf: pfm, hashes: { 'https://p/a.jpg': 'H1', 'https://p/b.jpg': 'H1', 'https://p/c.jpg': 'H2' } });
  assert.equal(p.gruppen.length, 2);
  assert.deepEqual(p.gruppen.find((g) => g.hash === 'H1').varianten.sort(), ['a', 'b']);
});
t('ohne Prüfsummen zählen verschiedene URLs als verschiedene Bilder', () => {
  const pfm = { 1: pf(1, 268, '', 'https://p/a.jpg')[1], 2: pf(2, 171, '', 'https://p/b.jpg')[1] };
  const p = plane({ handle: 'poster', titel: 'Poster', varianten: [v('a', '1_1'), v('b', '1_2')], pf: pfm });
  assert.equal(p.gruppen.length, 2);
});

// --- Ausschlüsse ---
t('Handyhüllen sind ausgeschlossen (Modellbild)', () => {
  const pfm = { 1: pf(1, 686, 'Matte', 'https://p/a.jpg')[1], 2: pf(2, 686, 'Glossy', 'https://p/b.jpg')[1] };
  for (const h of ['samsung-huelle-selbst-gestalten', 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', 'phone-case-x']) {
    const p = plane({ handle: h, titel: 'Hülle', varianten: [v('a', '1_1'), v('b', '1_2')], pf: pfm });
    assert.equal(p.status, 'skip', h);
    assert.equal(p.grund, 'handyhuelle-modellbild');
  }
});
t('Eigene Produkte ohne Printful-Nummer werden übersprungen', () => {
  const p = plane({ handle: 'wm-trikot-selbst-gestalten', titel: 'Trikot', varianten: [v('a', 'WM-TRIKOT-RO-S')], pf: {} });
  assert.equal(p.status, 'skip');
  assert.equal(p.grund, 'kein-printful-bild');
});
t('Katalogeintrag ohne Bild zählt nicht', () => {
  const p = plane({ handle: 'x', titel: 'X', varianten: [v('a', '1_1'), v('b', '1_2')], pf: { 1: { product_id: 5, color: 'A', image: null }, 2: { product_id: 5, color: 'B', image: '' } } });
  assert.equal(p.status, 'skip');
  assert.equal(p.grund, 'kein-printful-bild');
});
t('Grenze ist bewusst 12 (Baumwolltasche hat genau 12 Farben)', () => assert.equal(MAX_AUSSEHEN, 12));
t('zu viele verschiedene Bilder werden nicht angelegt', () => {
  const pfm = {};
  const vs = [];
  for (let i = 1; i <= MAX_AUSSEHEN + 1; i++) { pfm[i] = pf(i, 9, `C${i}`, `https://p/${i}.jpg`)[1]; vs.push(v(`g${i}`, `1_${i}`)); }
  const p = plane({ handle: 'tasche', titel: 'Tasche', varianten: vs, pf: pfm });
  assert.equal(p.status, 'skip');
  assert.match(p.grund, /^zu-viele-bilder/);
  // genau an der Grenze geht es noch
  const ok = plane({ handle: 'tasche', titel: 'Tasche', varianten: vs.slice(0, MAX_AUSSEHEN), pf: pfm });
  assert.equal(ok.status, 'plan');
  assert.equal(ok.gruppen.length, MAX_AUSSEHEN);
});
t('Varianten ohne Katalogdaten bleiben unberührt, die anderen bekommen ihr Bild', () => {
  const pfm = { 1: pf(1, 5, 'A', 'https://p/a.jpg')[1], 2: pf(2, 5, 'B', 'https://p/b.jpg')[1] };
  const p = plane({ handle: 'x', titel: 'X', varianten: [v('a', '1_1'), v('b', '1_2'), v('c', '1_999')], pf: pfm });
  assert.equal(p.status, 'plan');
  assert.deepEqual(p.ohnePrintful, ['c']);
  assert.equal(p.gruppen.flatMap((g) => g.varianten).includes('c'), false);
});
t('Bezeichnung: bei verschiedenen Printful-Produkten der Produktname ohne Grösse', () => {
  const pfm = {
    1: { product_id: 71, color: 'White', image: 'https://p/1.jpg', name: 'Bella + Canvas 3001 Unisex Jersey T-Shirt (White / XS)' },
    2: { product_id: 456, color: 'White', image: 'https://p/2.jpg', name: 'Stanley/Stella STTU169 | Iconic T-Shirt (White / XS)' },
  };
  const p = plane({ handle: 't', titel: 'T', varianten: [v('a', '1_1'), v('b', '1_2')], pf: pfm });
  assert.deepEqual(p.gruppen.map((g) => g.label), ['Bella + Canvas 3001 Unisex Jersey T-Shirt', 'Stanley/Stella STTU169']);
});
t('Bezeichnung aus den Shop-Optionen: Farbe bestimmt, Grösse nicht', () => {
  const vs = shirt.varianten.map((x, i) => ({ ...x, optionen: [{ name: 'Farbe', value: ['Weiss', 'Schwarz', 'Marineblau'][Math.floor(i / 5)] }, { name: 'Grösse', value: ['S', 'M', 'L', 'XL', '2XL'][i % 5] }] }));
  const p = plane({ ...shirt, varianten: vs });
  assert.deepEqual(p.gruppen.map((g) => g.label), ['Weiss', 'Schwarz', 'Marineblau']);
  assert.ok(p.gruppen[2].alt.startsWith('Shirt – Marineblau'));
});
t('Bezeichnung: zusammengelegte Poster nennen beide Materialien, Grössen nie', () => {
  const pfm = { 1: pf(1, 268, '', 'https://p/a.jpg')[1], 2: pf(2, 268, '', 'https://p/a2.jpg')[1], 3: pf(3, 171, '', 'https://p/b.jpg')[1], 4: pf(4, 3, '', 'https://p/c.jpg')[1] };
  const o = (mat, gr) => [{ name: 'Material', value: mat }, { name: 'Grösse', value: gr }];
  const vs = [{ ...v('a', '1_1'), optionen: o('Poster matt', '30×40') }, { ...v('b', '1_2'), optionen: o('Poster matt', '50×70') }, { ...v('c', '1_3'), optionen: o('Foto-Glanzpapier', '30×40') }, { ...v('d', '1_4'), optionen: o('Leinwand', '30×40') }];
  const p = plane({ handle: 'poster', titel: 'Poster', varianten: vs, pf: pfm, hashes: { 'https://p/a.jpg': 'H', 'https://p/a2.jpg': 'H', 'https://p/b.jpg': 'H', 'https://p/c.jpg': 'K' } });
  assert.equal(p.gruppen.length, 2);
  assert.deepEqual(p.gruppen.map((g) => g.label).sort(), ['Leinwand', 'Poster matt / Foto-Glanzpapier']);
});
t('Bezeichnung: ein einziges Aussehen heisst Vorderansicht', () => {
  const pfm = { 11576: pf(11576, 438, 'White', 'https://p/w.jpg')[1] };
  const p = plane({ handle: 'k', titel: 'Klassisches T-Shirt', varianten: [v('a', '1_11576', 'https://cdn.shopify.com/x/tee-white-back-1.jpg')], pf: pfm });
  assert.equal(p.gruppen[0].label, 'Vorderansicht');
  assert.ok(p.gruppen[0].alt.startsWith('Klassisches T-Shirt – Vorderansicht'));
});
t('Printful-Namen verlieren Grössenangaben', () => {
  const pfm = {
    1: { product_id: 304, color: 'Black', image: 'https://p/1.jpg', name: 'Enhanced Matte Paper Framed Poster 30×40 cm Black' },
    2: { product_id: 3, color: '', image: 'https://p/2.jpg', name: 'Canvas 12″×16″' },
  };
  const p = plane({ handle: 'p', titel: 'P', varianten: [v('a', '1_1'), v('b', '1_2')], pf: pfm });
  assert.deepEqual(p.gruppen.map((g) => g.label).sort(), ['Canvas', 'Enhanced Matte Paper Framed Poster Black']);
});
t('Alt-Text ist begrenzt und nennt Produkt und Ausführung', () => {
  const p = plane({ ...shirt, titel: 'T'.repeat(300) });
  for (const g of p.gruppen) assert.ok(g.alt.length <= 250);
  const q = plane(shirt);
  assert.ok(q.gruppen[0].alt.startsWith('Shirt – White'));
});
console.log(`\n${n} Prüfungen grün`);
