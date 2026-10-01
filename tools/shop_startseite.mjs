#!/usr/bin/env node
/**
 * shop_startseite.mjs — misst, wie zuverlaessig und wie schwer die Startseite von luxestyle.ch ist.
 *
 *   node tools/shop_startseite.mjs            Standardlauf (12 Abrufe je Adresse)
 *   node tools/shop_startseite.mjs --selbsttest  Gegenprobe
 *
 * Warum: Ein einzelner Abruf entscheidet nichts, wenn der Fehler zeitweise auftritt. Gemessen
 * werden Fehlerquote UND Groesse, je gegen eine Produktseite als Kontrolle — eine Produktseite
 * liegt auf derselben Shopify-Infrastruktur, also trennt der Vergleich "Shop kaputt" von
 * "diese eine Seite zu schwer".
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const N = parseInt(process.env.N || '12', 10);

async function einmal(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const buf = await r.arrayBuffer();
    return { code: r.status, bytes: buf.byteLength, ms: Date.now() - t0 };
  } catch (e) {
    return { code: 0, bytes: 0, ms: Date.now() - t0, fehler: e.message.slice(0, 60) };
  }
}

async function messen(name, url, n = N) {
  const res = [];
  for (let i = 0; i < n; i++) {
    res.push(await einmal(url));
    await new Promise(r => setTimeout(r, 400));
  }
  const ok = res.filter(r => r.code === 200);
  const codes = {};
  for (const r of res) codes[r.code] = (codes[r.code] || 0) + 1;
  const quote = ((res.length - ok.length) / res.length) * 100;
  const mb = ok.length ? (ok.reduce((s, r) => s + r.bytes, 0) / ok.length / 1048576) : 0;
  const ms = ok.length ? Math.round(ok.reduce((s, r) => s + r.ms, 0) / ok.length) : 0;
  return { name, url, n: res.length, ok: ok.length, quote, mb, ms, codes };
}

function zeile(r) {
  const c = Object.entries(r.codes).map(([k, v]) => `${k}×${v}`).join(' ');
  return `  ${r.name.padEnd(22)} ${String(r.ok).padStart(2)}/${r.n} ok · `
       + `Fehlerquote ${r.quote.toFixed(0).padStart(3)}% · `
       + `${r.mb.toFixed(2).padStart(5)} MB · ${String(r.ms).padStart(5)} ms · ${c}`;
}

async function lauf() {
  console.log(`Messung: ${N} Abrufe je Adresse, ${new Date().toISOString()}\n`);
  const ziele = [
    ['Startseite', 'https://luxestyle.ch/'],
    ['Produktseite', 'https://luxestyle.ch/products/fuda-taschenmesser-aus-damaststahl-634100'],
    ['Collection sommer', 'https://luxestyle.ch/collections/sommer'],
  ];
  const out = [];
  for (const [name, url] of ziele) { const r = await messen(name, url); out.push(r); console.log(zeile(r)); }
  const start = out[0], prod = out[1];
  console.log('\nBefund:');
  if (start.quote > 10 && prod.quote <= 10)
    console.log(`  Die Startseite faellt zu ${start.quote.toFixed(0)} % aus, die Produktseite zu `
      + `${prod.quote.toFixed(0)} %. Gleiche Infrastruktur → es ist DIESE Seite, nicht der Shop.`);
  else if (start.quote > 10 && prod.quote > 10)
    console.log('  Beide Seiten fallen aus → Problem liegt shopweit, nicht an der Startseite.');
  else console.log('  Startseite unauffaellig.');
  if (start.mb > 2) console.log(`  Die Startseite ist ${start.mb.toFixed(2)} MB gross `
    + `(Produktseite ${prod.mb.toFixed(2)} MB) → ${(start.mb / Math.max(prod.mb, .01)).toFixed(1)}-fach.`);
  return out;
}

async function selbsttest() {
  console.log('Selbsttest shop_startseite.mjs\n' + '-'.repeat(46));
  let fehler = 0;
  // a) eine garantiert fehlerhafte Adresse MUSS eine Fehlerquote von 100 % ergeben
  const kaputt = await messen('erfundene Adresse', 'https://luxestyle.ch/products/gibt-es-garantiert-nicht-xyz', 3);
  const okA = kaputt.quote === 100;
  console.log(`  ${okA ? 'OK ' : 'FEHLER'} erfundene Adresse: Fehlerquote ${kaputt.quote.toFixed(0)}% (erwartet 100)`);
  fehler += okA ? 0 : 1;
  // b) eine garantiert erreichbare Adresse MUSS 0 % ergeben
  const gut = await messen('robots.txt', 'https://luxestyle.ch/robots.txt', 3);
  const okB = gut.quote === 0 && gut.mb < 0.5;
  console.log(`  ${okB ? 'OK ' : 'FEHLER'} robots.txt: Fehlerquote ${gut.quote.toFixed(0)}% (erwartet 0), ${gut.mb.toFixed(3)} MB`);
  fehler += okB ? 0 : 1;
  console.log('-'.repeat(46));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

const ziel = process.argv.includes('--selbsttest') ? selbsttest() : lauf();
ziel.then(r => process.exit(Array.isArray(r) ? 0 : r));
