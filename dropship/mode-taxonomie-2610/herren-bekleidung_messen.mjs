// Wiederholbare Messung der Herren-Taxonomie. Liest NUR herren-bekleidung.json (+ Daten, Stichproben- und Urteilsdatei) und wertet die Regeln
// nach der Semantik der Aufgabe aus (herren_lib.passt). Aufruf:  node herren-bekleidung_messen.mjs   (Exit-Code 1 bei Verstoss)
//   Optional:  node herren-bekleidung_messen.mjs rest      -> alle Herren-/Unisex-Produkte ohne Kategorie
//              node herren-bekleidung_messen.mjs probe <kategorie-handle> [n] [seed]  -> frische Zufallsstichprobe zum Nachlesen
import fs from 'fs';
import { d, isCl, geschlecht } from './herren_gen.mjs';
import { passt, unterfilterPasst, stichprobe, rx } from './herren_lib.mjs';

const J = JSON.parse(fs.readFileSync('/tmp/mode_taxonomie/herren-bekleidung.json', 'utf8'));
const U = JSON.parse(fs.readFileSync('/tmp/mode_taxonomie/herren-bekleidung_urteile.json', 'utf8'));
const SEED = 20261026, N = 30, MIN_KAT = 15, MIN_FILTER = 10;
const fehler = []; const check = (ok, msg) => { if (!ok) fehler.push(msg); return ok; };
const alleP = d.map(p => ({ p, gen: geschlecht(p) }));
const kleidung = alleP.filter(x => isCl(x.p));
const pool = kleidung.filter(x => ['herren', 'unisex'].includes(x.gen));

// 1. Struktur
for (const k of J.kategorien) {
  for (const f of ['handle', 'titel', 'eltern', 'geschlecht', 'g_prefix', 'g_nicht', 'titel_muss', 'titel_nicht', 'tags_muss_eines', 'tags_nicht', 'beschreibung', 'unterfilter', 'gemessen']) check(f in k, `${k.handle}: Feld ${f} fehlt`);
  for (const s of [...k.titel_muss, ...k.titel_nicht, ...k.unterfilter.flatMap(u => [...u.titel_muss, ...u.titel_nicht])]) { try { rx(s); } catch (e) { check(false, `${k.handle}: Regex ungültig ${s}`); } }
  check(k.g_prefix.length > 0 && k.g_prefix.every(x => x.startsWith('Apparel & Accessories > Clothing')), `${k.handle}: g_prefix muss Kleidung sein`);
  check(!/ß/.test(k.titel + k.beschreibung), `${k.handle}: ß im Kundentext`);
}
check(new Set(J.kategorien.map(k => k.handle)).size === J.kategorien.length, 'doppelte Kategorie-Handles');
check(new Set(J.kategorien.flatMap(k => [k.handle, ...k.unterfilter.map(u => u.handle)])).size === J.kategorien.length + J.kategorien.reduce((a, k) => a + k.unterfilter.length, 0), 'doppelte Handles (Kategorie/Unterfilter)');

// 2. Auswertung über den GANZEN Datensatz (nicht nur Kleidung): keine Kategorie darf Nicht-Kleidung treffen
const hit = new Map();
for (const { p, gen } of alleP) { const t = J.kategorien.filter(k => passt(k, p, gen)).map(k => k.handle); if (t.length) hit.set(p.handle, t); }
const ausserhalb = [...hit.keys()].filter(h => !pool.some(x => x.p.handle === h));
check(ausserhalb.length === 0, `${ausserhalb.length} Treffer ausserhalb Herren-/Unisex-Kleidung`);
const mehrfach = [...hit.entries()].filter(([, t]) => t.length > 1);
check(mehrfach.length === 0, `${mehrfach.length} Produkte in mehr als einer Blatt-Kategorie`);

// 3. Treffer, Mindestgrösse, Unterfilter, Stichprobe, Urteile
const zeilen = [];
J.kategorien.forEach((k, i) => {
  const mem = pool.filter(x => (hit.get(x.p.handle) || []).includes(k.handle));
  check(mem.length === k.gemessen.treffer, `${k.handle}: Treffer ${mem.length} != JSON ${k.gemessen.treffer}`);
  check(mem.length >= MIN_KAT, `${k.handle}: unter Mindestgrösse ${MIN_KAT}`);
  const probe = mem.length <= N ? mem : stichprobe(mem, N, SEED + i);
  const u = U[k.handle] || {};
  check(JSON.stringify(probe.map(x => x.p.handle)) === JSON.stringify(u.stichprobe_handles || []), `${k.handle}: Stichprobe weicht von der beurteilten ab (Regeln seit dem Lesen geändert?)`);
  check(k.gemessen.stichprobe === probe.length, `${k.handle}: stichprobe-Zahl`);
  check(k.gemessen.falsch === Object.keys(u.falsch || {}).length, `${k.handle}: falsch-Zahl weicht von Urteilen ab`);
  const fz = k.unterfilter.map(f => { const n = mem.filter(x => unterfilterPasst(f, x.p)).length; check(n >= MIN_FILTER, `${f.handle}: nur ${n} Treffer (< ${MIN_FILTER})`); return `${f.handle.replace(k.handle.replace('herren-', 'herren-'), '·')}=${n}`; });
  const g = {}; for (const x of mem) { const s = (x.p.g || '').replace('Apparel & Accessories > Clothing > ', ''); g[s] = (g[s] || 0) + 1; }
  zeilen.push({ handle: k.handle, treffer: mem.length, anteil: (100 * mem.length / pool.length).toFixed(1) + ' %', stichprobe: probe.length, falsch: k.gemessen.falsch, grenz: Object.keys(u.grenzfaelle || {}).length, google: Object.entries(g).map(([a, b]) => `${a}:${b}`).join(', ').slice(0, 60), filter: fz.length });
});
const zugeordnet = pool.filter(x => hit.has(x.p.handle)).length;
check(J.rest.anzahl === pool.length - zugeordnet, `rest.anzahl ${J.rest.anzahl} != ${pool.length - zugeordnet}`);
const gz = {}; for (const x of kleidung) gz[x.gen] = (gz[x.gen] || 0) + 1;
for (const [gk, n] of Object.entries(gz)) check(J.geschlecht_regel.includes(`${gk === 'partner' ? 'partner' : gk} ${n}`), `geschlecht_regel nennt ${gk} ${n} nicht`);
const hs = new Set(d.map(p => p.handle));
check(J.fremdkoerper.every(f => hs.has(f.handle)), 'fremdkoerper: unbekannte Handles');

// 4. Verteilungs-Alarm (Grundsatz 3): keine Kategorie darf > 60 % des Pools ziehen
const gross = zeilen.filter(z => parseFloat(z.anteil) > 60);
check(gross.length === 0, 'Verteilung: Kategorie mit > 60 % des Pools');

const modus = process.argv[2];
if (modus === 'rest') {
  for (const x of pool.filter(x => !hit.has(x.p.handle))) console.log(x.p.handle, '|', x.p.title, '|', x.p.g || '(leer)');
  process.exit(0);
}
if (modus === 'probe') {
  const h = process.argv[3], n = +process.argv[4] || 30, seed = +process.argv[5] || 1;
  const mem = pool.filter(x => (hit.get(x.p.handle) || []).includes(h));
  for (const x of stichprobe(mem, n, seed)) console.log(x.p.title, '|', (x.p.g || '').replace('Apparel & Accessories > Clothing > ', ''));
  process.exit(0);
}
console.log(`Kleidung ${kleidung.length} | Herren+Unisex ${pool.length} | zugeordnet ${zugeordnet} (${(100 * zugeordnet / pool.length).toFixed(1)} %) | ohne Kategorie ${pool.length - zugeordnet}`);
console.table(zeilen);
const f = J.kategorien.reduce((a, k) => a + k.gemessen.falsch, 0), s = J.kategorien.reduce((a, k) => a + k.gemessen.stichprobe, 0);
console.log(`Stichprobe gesamt ${s}, davon falsch ${f} (${(100 * (s - f) / s).toFixed(1)} % richtig). Grenzfälle (nicht als falsch gezählt): ${zeilen.reduce((a, z) => a + z.grenz, 0)}.`);
if (fehler.length) { console.log('\nVERSTÖSSE:\n - ' + fehler.join('\n - ')); process.exit(1); }
console.log('Alle Prüfungen bestanden.');
