// Prueft: LCP mit Testkopf hoechstens 400 ms ueber heute (Median aus 3 Laeufen, Nachbau, gedrosselt). Exit 1 = FEHLER.
const { spawnSync } = require('child_process'); const path = require('path');
const h = process.argv[2] || 'damen-mode';
const r = spawnSync('node', [path.join(__dirname, 'lcp_vergleich.cjs'), h, '3'], { encoding: 'utf8', env: process.env, timeout: 400000 });
const m = (r.stdout || '').match(/LCP Median heute (\d+) ms, test (\d+) ms/);
if (!m) { console.log('FEHLER LCP nicht messbar', (r.stdout || '').slice(-300), (r.stderr || '').slice(-300)); process.exit(1); }
const ok = Number(m[2]) <= Number(m[1]) + 400;
console.log((ok ? 'OK ' : 'FEHLER ') + h + ' LCP Median heute ' + m[1] + ' ms, test ' + m[2] + ' ms (Grenze +400 ms)');
process.exit(ok ? 0 : 1);
