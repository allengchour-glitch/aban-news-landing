// shopify_host_test.mjs — prüft die Shop-Host-Regel (automation/lib/shopify_host.mjs) ohne Netz und ohne Schlüssel (19.10.2026).
//   env -i PATH=/opt/node22/bin:/usr/bin:/bin node automation/lib/shopify_host_test.mjs
// Teil A: gemeinsame Fallliste (shopify_host_faelle.tsv). Teil B: Einzelfälle (ASCII-genau, Typen, kein Wert im Text).
// Teil C: Kanarienvogel — die schwache Prüfung von 24 Dateien (`/myshopify\.com$/`) muss an der Fallliste scheitern.
// (B19/B20: Regel 0 — Längenschranke 253 und Laufzeit bei riesigem Leerraum; die erste Fassung der Regex-Bereinigung brauchte bei 40'000 Zeichen 1,9 s, bei 130'000 20,5 s (gemessen 19.10.).)
// Teil D: Abgleich der DREI Umsetzungen — derselbe Fallkatalog läuft in shopify_host.py (--selbsttest) und shopify_secret.sh
// (shopify_secret_test.sh); weicht eine ab, schlägt hier ihr Test an.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHOP_ECHT, MAX_LAENGE, HOST_RE, FAELLE, faelle, hostUrteil, hostStruktur, bereinigeShopifyHost,
  normalizeShopifyHost, assertShopifyHost, heileShopifyHost, ShopifyHostFehler,
} from './shopify_host.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
let fehler = 0, geprueft = 0;
const pruefe = (name, ok, info = '') => { geprueft++; if (!ok) fehler++; if (!ok || process.env.AUSFUEHRLICH) console.log(`  ${ok ? 'OK ' : 'XX '} ${name}${info ? ' — ' + info : ''}`); };
const gut = fn => { try { return !!fn(); } catch { return false; } };   // ein Wurf zählt als Fehler, nicht als Absturz des Tests
const wirft = (fn, art) => { try { fn(); return false; } catch (e) { return e instanceof ShopifyHostFehler && e.art === art && e.message.startsWith('SHOPIFY_HOST:'); } };

// ── A. Fallliste ──────────────────────────────────────────────────────────────────────────────────────
console.log('A. Fallliste');
const tabelle = faelle(FAELLE);
const arten = new Set(tabelle.map(f => f.art));
pruefe('A0 Fallliste gelesen und alle fünf Urteile belegt (Kanarienvogel gegen eine leere Tabelle)',
  tabelle.length >= 30 && ['leer', 'ok', 'bereinigt', 'falsch', 'fremd'].every(a => arten.has(a)), `${tabelle.length} Fälle`);
let abweichend = 0;
for (const f of tabelle) {
  const u = hostUrteil(f.roh);
  const gut = u.art === f.art && u.host === f.host;
  if (!gut) abweichend++;
  pruefe(`A1 ${f.art} (Länge ${f.roh.length})`, gut, gut ? '' : `bekam ${u.art}/${u.host.length ? 'Host' : '-'}`);
}

// ── B. Einzelfälle ────────────────────────────────────────────────────────────────────────────────────
console.log('B. Einzelfälle');
pruefe('B1 undefined/null/«» → leer', ['leer'].every(a => hostUrteil(undefined).art === a && hostUrteil(null).art === a && hostUrteil('').art === a));
pruefe('B2 Zahl/Objekt/Liste → falsch', hostUrteil(5).art === 'falsch' && hostUrteil({}).art === 'falsch' && hostUrteil(['a']).art === 'falsch');
pruefe('B3 Zeilenende nur am Rand wird getilgt', hostUrteil(`${SHOP_ECHT}\n`).art === 'bereinigt');
pruefe('B4 Zeilenende mitten im Wert → falsch (kein «$» vor einem Zeilenende)', hostUrteil(`${SHOP_ECHT}\nevil.example`).art === 'falsch');
pruefe('B5 NBSP ist kein Leerraum → falsch', hostUrteil(` ${SHOP_ECHT}`).art === 'falsch');
pruefe('B6 Kelvin-Zeichen wird nicht zu «k» → falsch', hostUrteil('Kelvin.myshopify.com', { erwartet: null }).art === 'falsch');
pruefe('B7 Byte-Order-Mark ist kein Leerraum → falsch', hostUrteil(`﻿${SHOP_ECHT}`).art === 'falsch');
pruefe('B8 ohne erwartet ist ein anderer Shop gültig', hostUrteil('other-store.myshopify.com', { erwartet: null }).art === 'ok');
pruefe('B9 normalize: leer → \'\', bereinigt, falsch wirft',
  gut(() => normalizeShopifyHost(undefined) === '' && normalizeShopifyHost(' HTTPS://Other-Store.myshopify.com/ ') === 'other-store.myshopify.com')
  && wirft(() => normalizeShopifyHost('evil.example.com'), 'falsch'));
pruefe('B10 assert liefert den Host', gut(() => assertShopifyHost(`  "${SHOP_ECHT}" `) === SHOP_ECHT));
for (const [roh, art] of [[undefined, 'leer'], ['', 'leer'], ['evil.example.com', 'falsch'], ['other-store.myshopify.com', 'fremd'], ['   ', 'falsch']]) {
  pruefe(`B11 assert wirft bei ${art}`, wirft(() => assertShopifyHost(roh), art));
}
const h = heileShopifyHost('evil.example.com=SHOPIFY_CLIENT_SECRET');
pruefe('B12 heile: falsch → echter Host', gut(() => h.host === SHOP_ECHT && h.art === 'falsch' && h.grund.startsWith('Länge ')));
pruefe('B13 heile: leer bleibt leer, ok bleibt, bereinigt',
  heileShopifyHost('').host === '' && heileShopifyHost(SHOP_ECHT).art === 'ok' && heileShopifyHost(`SHOPIFY_SHOP=${SHOP_ECHT}`).art === 'bereinigt');
pruefe('B14 heile ohne erwartet wirft', (() => { try { heileShopifyHost('x', { erwartet: null }); return false; } catch { return true; } })());
pruefe('B15 HOST_RE ist verankert', !HOST_RE.test(`x${SHOP_ECHT}x`) && !HOST_RE.test(`${SHOP_ECHT}\n`) && HOST_RE.test(SHOP_ECHT));
// Der Wert darf nie in Text oder Struktur stehen — auch nicht als Schlüssel-Form
const marke = 'geheim-marker-4711.example';
const texte = [hostStruktur(marke), hostStruktur(marke + '=SHOPIFY_SHOP'), heileShopifyHost(marke).grund];
try { assertShopifyHost(marke); } catch (e) { texte.push(e.message); }
try { normalizeShopifyHost(marke); } catch (e) { texte.push(e.message); }
pruefe('B16 kein Wert in Fehlertext/Struktur', texte.length === 5 && texte.every(t => !/marker|4711|geheim/.test(t)));
const schluessel = 'shp' + 'ss_' + '0123456789abcdef'.repeat(2);
pruefe('B17 Schlüssel-Form erkannt, nicht ausgegeben', hostStruktur(schluessel).includes('schlüsselartig') && !hostStruktur(schluessel).includes('0123'));
pruefe('B18 bereinige ist reine Zeichenkettenregel', bereinigeShopifyHost(`  'HTTPS://${SHOP_ECHT.toUpperCase()}/'  `) === SHOP_ECHT);

// Regel 0: Längenschranke (Grenze 253 exakt, Polster zählt mit) — gleiche Zahlen in shopify_host.py und shopify_secret_test.sh
pruefe('B19 Grenze: 253 Zeichen (Polster + Host) bereinigt, 254 falsch',
  hostUrteil(' '.repeat(MAX_LAENGE - SHOP_ECHT.length) + SHOP_ECHT).art === 'bereinigt' && hostUrteil(' '.repeat(MAX_LAENGE + 1 - SHOP_ECHT.length) + SHOP_ECHT).art === 'falsch');
// Laufzeit: «Zeichen + Leerraum + Zeichen» war in der Regex-Fassung quadratisch (40'000: 1,9 s). Die Obergrenze 1 s hat grossen Abstand zum Linearen (Millisekunden).
const gross = 'x' + ' '.repeat(130000) + 'y';
const t0 = performance.now();
const ug = hostUrteil(gross), sg = hostStruktur(gross), bg = bereinigeShopifyHost(gross), dauer = performance.now() - t0;
pruefe('B20 riesiger Wert: falsch, Struktur nennt nur die Länge, auch bereinigeShopifyHost direkt schnell (< 1 s)',
  ug.art === 'falsch' && sg === `Länge 130002, länger als ${MAX_LAENGE}` && bg.length === 130002 && dauer < 1000, `${dauer.toFixed(0)} ms`);
pruefe('B21 ungleiche Anführungszeichen sind kein Paar → falsch', ['"', "'"].every(q => hostUrteil(`${q}${SHOP_ECHT}${q === '"' ? "'" : '"'}`).art === 'falsch'));

// ── C. Kanarienvogel: die schwache Prüfung aus 24 Dateien ─────────────────────────────────────────────
console.log('C. Kanarienvogel (schwache Suffix-Prüfung)');
// Ablauf wörtlich aus z. B. create_poster_pod.mjs: replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP=ECHT
const schwach = roh => { const s = String(roh).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim(); return /myshopify\.com$/.test(s) ? s : SHOP_ECHT; };
const verschluckt = tabelle.filter(f => f.art !== 'leer' && schwach(f.roh) !== SHOP_ECHT && hostUrteil(f.roh).art !== 'ok' && hostUrteil(f.roh).art !== 'bereinigt');
pruefe('C1 die schwache Prüfung lässt «evilmyshopify.com» (ein fremder Betreiber) durch', schwach('evilmyshopify.com') === 'evilmyshopify.com');
pruefe('C2 die neue Regel weist ihn ab', hostUrteil('evilmyshopify.com').art === 'falsch' && heileShopifyHost('evilmyshopify.com').host === SHOP_ECHT);
pruefe('C3 mindestens 3 Fälle der Fallliste, die die schwache Prüfung durchlässt (Tabelle kann scheitern)', verschluckt.length >= 3, `${verschluckt.length} Fälle`);

// ── D. Die drei Umsetzungen im Abgleich ───────────────────────────────────────────────────────────────
console.log('D. Abgleich mit shopify_host.py und shopify_secret.sh');
const sauber = { PATH: '/opt/node22/bin:/usr/bin:/bin', ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}) };   // kein Netz-Proxy, keine Schlüssel; nur das Wegwerf-Verzeichnis wird durchgereicht
const py = spawnSync('python3', [path.join(HIER, 'shopify_host.py'), '--selbsttest'], { env: sauber, encoding: 'utf8', timeout: 60000 });
const pyM = /Selbsttest: (\d+)\/(\d+)/.exec(py.stdout || '');
pruefe('D1 shopify_host.py --selbsttest: alles bestanden', py.status === 0 && !!pyM && pyM[1] === pyM[2], (py.stdout || '').trim().split('\n').pop());
const sh = spawnSync('bash', [path.join(HIER, 'shopify_secret_test.sh')], { env: sauber, encoding: 'utf8', timeout: 120000 });
const shM = /bash-Selbsttest: (\d+) ok, (\d+) Fehler/.exec(sh.stdout || '');
pruefe('D2 shopify_secret_test.sh: alles bestanden', sh.status === 0 && !!shM && shM[2] === '0' && +shM[1] > 50, (sh.stdout || '').trim().split('\n').pop());
const unbekannt = spawnSync('python3', [path.join(HIER, 'shopify_host.py'), '--irgendwas'], { env: sauber, encoding: 'utf8', timeout: 30000 });
pruefe('D3 unbekannter Schalter am Python-Modul → Exit 2, kein Lauf', unbekannt.status === 2 && !/Selbsttest/.test(unbekannt.stdout || ''));

console.log(`\nSHOPIFY-HOST-TEST: ${fehler ? fehler + ' Fehler' : 'ok'} (${geprueft} Prüfungen, ${tabelle.length} Fälle aus der Fallliste)`);
process.exit(fehler ? 1 : 0);
