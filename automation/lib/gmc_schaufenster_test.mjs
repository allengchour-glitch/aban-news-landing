/** Test für die Schaufenster-Auswahl (Google-Kanal). Lauf: /opt/node22/bin/node automation/lib/gmc_schaufenster_test.mjs */
import {
  stufe, waehle, plan, stuecke, mutation, auswerten, parseManifest, manifestZeile, ausschlussGilt,
  PRUEF_TAGS, BEWAEHRT_MIN_RATING, BEWAEHRT_MIN_ANZAHL, SCHWACH_MAX_RATING, SCHWACH_MIN_ANZAHL, LIZENZ_PLUS, ratingAus, bewaehrt, bestellteIds,
  GOOGLE_PUBLICATION, BUDGET_VARIANTEN, HARTE_GRENZE, MIN_PRODUKTE, MIN_ZEILEN, MIN_BUDGET, MAX_ABWAHL_ANTEIL, MAX_OHNE_KATEGORIE, KATEGORIE_DECKEL,
} from './gmc_schaufenster.mjs';
import { AUSSCHLUSS_TAGS } from './mengenrabatt.mjs';

let ok = 0, fehler = 0;
const pruef = (name, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
};
const wirft = (name, f, teil) => {
  try { f(); fehler++; console.log(`FAIL ${name}: wirft nicht`); } catch (e) {
    if (String(e.message).includes(teil)) ok++; else { fehler++; console.log(`FAIL ${name}: falsche Meldung ${e.message}`); }
  }
};
let nr = 0;
const gid = () => `gid://shopify/Product/${1000 + nr++}`;
const P = (o = {}) => ({ id: gid(), handle: `p-${nr}`, tags: [], varianten: 1, kategorie: 'Home & Garden > Decor', ausschluss: null, aufGoogle: true, ...o });

// --- Stufen: beide Richtungen
pruef('Fortura (Tag fortura) = Stufe 1', stufe(P({ tags: ['fortura'] })).stufe, 1);
pruef('CH-Lager (Tag ch-lager) = Stufe 1', stufe(P({ tags: ['ch-lager'] })).stufe, 1);
pruef('Fortura MIT Ausschlussfeld bleibt Stufe 1 (die Charge vom 17.08. galt für kein Produkt)', stufe(P({ tags: ['fortura'], ausschluss: '["Shopping_ads"]' })).stufe, 1);
pruef('Fortura mit Sperrtag (Lizenz) = draussen', stufe(P({ tags: ['fortura', 'lizenz-nicht-bewerben'] })), { stufe: null, grund: 'sperrtag' });
pruef('Marge A = Stufe 2', stufe(P({ tags: ['mengenrabatt-a'] })).stufe, 2);
pruef('Marge B = Stufe 2', stufe(P({ tags: ['mengenrabatt-b'] })).stufe, 2);
pruef('Marge A MIT Ausschlussfeld = draussen (nur Fortura darf das Feld ignorieren)', stufe(P({ tags: ['mengenrabatt-a'], ausschluss: '["Shopping_ads"]' })), { stufe: null, grund: 'ausschluss-shopping-ads' });
pruef('Rest = Stufe 3', stufe(P()).stufe, 3);
pruef('ohne Google-Kategorie = draussen', stufe(P({ kategorie: null })), { stufe: null, grund: 'keine-google-kategorie' });
pruef('leere Kategorie = draussen', stufe(P({ kategorie: '' })).stufe, null);
pruef('Sperrtag adult = draussen', stufe(P({ tags: ['adult-nicht-bewerben'] })).grund, 'sperrtag');
pruef('nicht versendbar (CH) = draussen (schon als Sperrtag erkannt)', stufe(P({ tags: ['cj-nicht-versendbar-ch'] })).grund, 'sperrtag');
pruef('ausgelistet = draussen', stufe(P({ tags: ['cj-ausgelistet'] })).grund, 'nicht-lieferbar-oder-bild');
pruef('Bild zu klein = draussen', stufe(P({ tags: ['bild-zu-klein'] })).grund, 'nicht-lieferbar-oder-bild');
// Gegenproben: harmlose Chargen-Tags dürfen NICHT sperren (Lehre rueckhol-0907: 78 % des Katalogs)
pruef('Gegenprobe: rueckhol-0907 sperrt nicht', stufe(P({ tags: ['rueckhol-0907'] })).stufe, 3);
pruef('Gegenprobe: bildmass-ok-0907 sperrt nicht', stufe(P({ tags: ['bildmass-ok-0907', 'bild-ok'] })).stufe, 3);
pruef('Gegenprobe: cj-real sperrt nicht', stufe(P({ tags: ['cj-real'] })).stufe, 3);
pruef('Gegenprobe: tags fehlen ganz (null) = Stufe 3, kein Absturz', stufe({ id: gid(), kategorie: 'A > B', varianten: 1 }).stufe, 3);

// --- Auswahl: Budget, Reihenfolge, Deckel, Unbekanntes
{
  const z = [P({ tags: ['fortura'], varianten: 5 }), P({ tags: ['mengenrabatt-a'], varianten: 7 }), P({ varianten: 3, handle: 'b' }), P({ varianten: 1, handle: 'a' }), P({ varianten: 2, handle: 'c' })];
  const w = waehle(z, { budget: 100, katDeckel: 1 });
  pruef('alle zulässigen drin, wenn das Budget reicht', [...w.drin.values()].sort(), [1, 2, 3, 3, 3]);
  pruef('Zahlen: Varianten je Stufe', w.zahlen.varianten, { 0: 0, 1: 5, 2: 7, 3: 6, gesamt: 18 });
}
{
  // Budget 10: Stufe 1 (5) + Stufe 2 (3) = 8, Platz für 2 Varianten: nur das Produkt mit 1 und das nächste mit 1 passt, das mit 2 nicht mehr
  const a = P({ varianten: 1, handle: 'a' }), b = P({ varianten: 1, handle: 'b' }), c = P({ varianten: 2, handle: 'c' });
  const w = waehle([P({ tags: ['fortura'], varianten: 5 }), P({ tags: ['mengenrabatt-b'], varianten: 3 }), c, b, a], { budget: 10, katDeckel: 1 });
  pruef('wenige Varianten zuerst, Rest «budget»', [w.drin.has(a.id), w.drin.has(b.id), w.drin.has(c.id)], [true, true, false]);
  pruef('Grund der Abgewählten', w.draussen.find(d => d.id === c.id).grund, 'budget');
  pruef('Summe nie über dem Budget', w.zahlen.varianten.gesamt <= 10, true);
}
{
  // Stufe 1 und 2 sind IMMER drin, auch wenn sie allein über dem Budget liegen
  const f = P({ tags: ['fortura'], varianten: 60 }), m = P({ tags: ['mengenrabatt-a'], varianten: 60 }), r = P({ varianten: 1 });
  const w = waehle([f, m, r], { budget: 50, katDeckel: 1 });
  pruef('Stufe 1 und 2 über Budget bleiben, Stufe 3 fliegt', [w.drin.has(f.id), w.drin.has(m.id), w.drin.has(r.id)], [true, true, false]);
}
{
  // Kategorie-Deckel: höchstens 40 % des Budgets 10 = 4 Varianten je Kategorie (zwei Ebenen)
  const deko = [1, 2, 3].map(i => P({ varianten: 2, handle: `d${i}`, kategorie: 'Home & Garden > Decor > Vasen' }));
  const bad = P({ varianten: 2, handle: 'z', kategorie: 'Health & Beauty > Personal Care > Seife' });
  const w = waehle([...deko, bad], { budget: 10, katDeckel: 0.4 });
  pruef('Deckel: zwei von drei Deko-Produkten, das Bad-Produkt auch', [deko.filter(d => w.drin.has(d.id)).length, w.drin.has(bad.id)], [2, true]);
  pruef('Grund des abgewiesenen Deko-Produkts', w.draussen.map(d => d.grund), ['kategorie-deckel']);
  // zwei Kategorien auf Ebene 3 unterscheiden sich, Ebene 1+2 gleich: ein gemeinsamer Deckel
  const gleich = waehle([P({ varianten: 3, kategorie: 'A > B > C' }), P({ varianten: 3, kategorie: 'A > B > D' })], { budget: 10, katDeckel: 0.5 });
  pruef('Deckel gilt für die ersten zwei Ebenen gemeinsam', gleich.drin.size, 1);
}
{
  const a = P({ varianten: 'x' }), b = P({ varianten: 0 }), c = P({ varianten: undefined }), d = P({ varianten: 1 });
  const w = waehle([a, b, c, d]);
  pruef('unbekannte oder null Varianten werden nie geschätzt', [w.drin.has(a.id), w.drin.has(b.id), w.drin.has(c.id), w.drin.has(d.id)], [false, false, false, true]);
  pruef('Grund varianten-unbekannt', w.draussen.map(x => x.grund), ['varianten-unbekannt', 'varianten-unbekannt', 'varianten-unbekannt']);
}
{
  // Reihenfolge ist deterministisch (gleiche Varianten: nach Handle)
  const x = P({ varianten: 1, handle: 'zz' }), y = P({ varianten: 1, handle: 'aa' });
  const w1 = waehle([x, y], { budget: 1, katDeckel: 1 }), w2 = waehle([y, x], { budget: 1, katDeckel: 1 });
  pruef('gleiche Varianten: der Handle entscheidet, unabhängig von der Eingabereihenfolge', [w1.drin.has(y.id), w2.drin.has(y.id), w1.drin.has(x.id)], [true, true, false]);
}
{
  // Die Variantenzahl entscheidet VOR dem Handle: das Produkt mit 1 Variante (Handle «z») schlägt das mit 2 (Handle «a»)
  // Budget 2: nach Varianten sortiert passen die zwei Einzelprodukte (y, z), nach Handle sortiert passte nur das mit 2 Varianten (a)
  const mehr = P({ varianten: 2, handle: 'a' }), y = P({ varianten: 1, handle: 'y' }), z = P({ varianten: 1, handle: 'z' });
  const w = waehle([mehr, y, z], { budget: 2, katDeckel: 1 });
  pruef('wenige Varianten zuerst, auch wenn der Handle dagegen spricht', [w.drin.has(y.id), w.drin.has(z.id), w.drin.has(mehr.id)], [true, true, false]);
}

// --- Plan
const viele = (n, o = {}) => Array.from({ length: n }, () => P(o));
{
  // 1200 einfache Produkte auf Google, Budget gross: alle bleiben, nichts wird abgewählt
  const z = viele(1200);
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('alle bleiben: ok, nichts abzuwählen', [p.ok, p.abwaehlen.length, p.varianten], [true, 0, { vorher: 1200, nachher: 1200 }]);
}
{
  const z = [...viele(1000), ...viele(300, { ausschluss: '["Shopping_ads"]' })];
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('Ausschluss-Produkte gehen vom Kanal', [p.abwaehlen.length, p.gruende], [300, { 'ausschluss-shopping-ads': 300 }]);
}
{
  // nicht auf Google und nicht im Manifest: nie aufnehmen (war nie dort, vermutlich mit Grund)
  const nie = P({ aufGoogle: false });
  const frueher = P({ aufGoogle: false });
  const z = [...viele(1100), nie, frueher];
  const p = plan(z, new Set([frueher.id]), { budget: 5000, katDeckel: 1 });
  pruef('aufnehmen nur aus dem Manifest', p.aufnehmen.map(x => x.id), [frueher.id]);
  pruef('aufnehmen zählt in die Zahl nach dem Lauf', p.varianten.nachher, 1101);
}
{
  // Manifest-Produkt, das nicht mehr ins Schaufenster passt (Sperrtag neu): bleibt draussen
  const spaet = P({ aufGoogle: false, tags: ['adult-nicht-bewerben'] });
  const p = plan([...viele(1100), spaet], new Set([spaet.id]), { budget: 5000, katDeckel: 1 });
  pruef('Manifest-Produkt mit Sperrtag wird NICHT aufgenommen', p.aufnehmen.length, 0);
}
{
  // Ein Produkt, das nicht auf Google liegt und nicht ins Schaufenster passt, wird NICHT «abgewählt» (nichts zu tun, nichts zu schreiben)
  const draussen = P({ aufGoogle: false, ausschluss: '["Shopping_ads"]' });
  const p = plan([...viele(1100), draussen], new Set(), { budget: 5000, katDeckel: 1 });
  pruef('nicht auf Google und nicht im Schaufenster: weder abwählen noch aufnehmen', [p.abwaehlen.length, p.aufnehmen.length], [0, 0]);
}
{
  // unklarer Kanalstatus (null) wird nie angefasst und gezählt
  const z = [...viele(1100), P({ aufGoogle: null, ausschluss: '["Shopping_ads"]' })];
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('aufGoogle null: nicht abgewählt, als unklar gezählt', [p.abwaehlen.length, p.unklar], [0, 1]);
}
{
  const p = plan(viele(MIN_ZEILEN - 1), new Set(), { budget: 5000, katDeckel: 1 });
  pruef('zu wenige Zeilen: Abbruch', [p.ok, p.fehler[0].startsWith('zu-wenige-zeilen')], [false, true]);
}
{
  const z = [...viele(1000), ...viele(40, { aufGoogle: null })];   // 3,8 % unklar
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('zu viele unklare Zeilen: Abbruch', p.fehler.some(f => f.startsWith('zu-viele-unklare-zeilen')), true);
}
{
  const z = viele(MIN_ZEILEN, { ausschluss: '["Shopping_ads"]' });  // alle ausgeschlossen: Schaufenster leer
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('leeres Schaufenster: Abbruch, damit ein Datenfehler nicht alles abwählt', [p.ok, p.fehler.some(f => f.startsWith('schaufenster-zu-klein')), p.abwaehlen.length], [false, true, MIN_ZEILEN]);
}
{
  const z = viele(MIN_PRODUKTE, { tags: ['mengenrabatt-a'], varianten: 300 });  // 150 000 Varianten in Stufe 2
  const p = plan([...z, ...viele(MIN_ZEILEN)], new Set(), { budget: 100, katDeckel: 1 });
  pruef('zu grosses Schaufenster: Abbruch', p.fehler.some(f => f.startsWith('schaufenster-zu-gross')), true);
}
{
  const z = viele(MIN_ZEILEN, { varianten: 100 });   // je 100 Varianten, Budget 90 000: nur 900 passen
  const p = plan(z, new Set(), { katDeckel: 1 });
  pruef('Standardbudget wird eingehalten', [BUDGET_VARIANTEN, p.varianten.nachher <= BUDGET_VARIANTEN, p.ok], [90000, true, true]);
}
{
  // ungültige ID (kein Produkt-GID) wird nie angefasst
  const z = [...viele(1100), P({ id: 'gid://shopify/Collection/5', ausschluss: '["Shopping_ads"]' })];
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('fremde GID: nie abgewählt', p.abwaehlen.length, 0);
}

// --- Mutation und Auswertung
pruef('Stücke zu 3', stuecke([1, 2, 3, 4, 5, 6, 7], 3), [[1, 2, 3], [4, 5, 6], [7]]);
pruef('Stücke: leere Liste', stuecke([], 3), []);
wirft('Stücke: n = 0', () => stuecke([1], 0), 'ganze Zahl');
wirft('Stücke: n = 1.5', () => stuecke([1], 1.5), 'ganze Zahl');
{
  const m = mutation(['gid://shopify/Product/1', 'gid://shopify/Product/2'], 'abwaehlen');
  pruef('Abwählen: Unpublish mit Google-Kanal, Alias je Produkt', [m.includes('a0: publishableUnpublish(id:"gid://shopify/Product/1"'), m.includes('a1: publishableUnpublish'), m.includes(GOOGLE_PUBLICATION), m.startsWith('mutation{')], [true, true, true, true]);
  pruef('Aufnehmen: Publish', mutation(['gid://shopify/Product/1'], 'aufnehmen').includes('publishablePublish(id:"gid://shopify/Product/1"'), true);
  pruef('Abwählen enthält kein Publish ohne Un', /[^n]publishablePublish/.test(m), false);
}
wirft('Mutation: Einschleusen über die ID', () => mutation(['gid://shopify/Product/1"){x}#'], 'abwaehlen'), 'ungültige Produkt-ID');
wirft('Mutation: fremde GID', () => mutation(['gid://shopify/Collection/1'], 'abwaehlen'), 'ungültige Produkt-ID');
wirft('Mutation: unbekannte Art', () => mutation(['gid://shopify/Product/1'], 'loeschen'), 'unbekannte Art');
{
  const ids = ['gid://shopify/Product/1', 'gid://shopify/Product/2', 'gid://shopify/Product/3', 'gid://shopify/Product/4'];
  const a = auswerten({ a0: { userErrors: [] }, a1: { userErrors: [{ field: ['id'], message: 'nope' }] }, a2: null }, ids, 'abwaehlen');
  pruef('Auswertung: nur belegter Erfolg zählt', [a.ok, a.fehlgeschlagen.map(f => f.id)], [[ids[0]], [ids[1], ids[2], ids[3]]]);
  pruef('Auswertung: Meldung des userError', a.fehlgeschlagen[0].meldung, 'nope');
  pruef('Auswertung: ganze Antwort fehlt', auswerten(undefined, ids.slice(0, 1), 'aufnehmen').fehlgeschlagen.length, 1);
  pruef('Auswertung: userErrors kein Array = kein Erfolg', auswerten({ a0: { userErrors: null } }, ids.slice(0, 1), 'abwaehlen').ok, []);
}

// --- Manifest
{
  const text = [manifestZeile('gid://shopify/Product/1', 'a', '2026-10-28'), manifestZeile('gid://shopify/Product/2', 'b', '2026-10-28'),
    manifestZeile('gid://shopify/Product/1', 'a', '2026-11-04', 'auf'), 'kaputt', '', JSON.stringify({ id: 'x' }), JSON.stringify({ id: 'gid://shopify/Product/3', aktion: 'wer-weiss' })].join('\n');
  const m = parseManifest(text);
  pruef('Manifest: letzte Aktion gilt', [...m.ids], ['gid://shopify/Product/2']);
  pruef('Manifest: kaputte Zeilen werden gezählt', m.kaputt, 3);
  pruef('Manifest: wieder abgewählt nach Aufnahme zählt', [...parseManifest(text + '\n' + manifestZeile('gid://shopify/Product/1', 'a', '2026-11-11')).ids].sort(), ['gid://shopify/Product/1', 'gid://shopify/Product/2']);
  pruef('Manifest: leerer Text', [parseManifest('').ids.size, parseManifest(undefined).kaputt], [0, 0]);
  pruef('Manifest-Zeile ohne Aktion gilt als abgewählt', [...parseManifest(JSON.stringify({ id: 'gid://shopify/Product/9' })).ids], ['gid://shopify/Product/9']);
}
{
  // Absichtszeile VOR dem Aufruf (Teilfehler/Absturz): zählt als «möglicherweise von uns abgewählt», «auf» hebt es auf, ein neues «ab-versucht» setzt es wieder
  const id1 = 'gid://shopify/Product/11', id2 = 'gid://shopify/Product/12';
  const m1 = parseManifest(manifestZeile(id1, undefined, '2026-10-28', 'ab-versucht'));
  pruef('Manifest: ab-versucht zählt', [...m1.ids], [id1]);
  const m2 = parseManifest([manifestZeile(id1, undefined, 'd', 'ab-versucht'), manifestZeile(id1, undefined, 'd', 'auf'), manifestZeile(id2, undefined, 'd', 'ab-versucht')].join('\n'));
  pruef('Manifest: auf nach ab-versucht hebt es auf', [...m2.ids], [id2]);
  const m3 = parseManifest([manifestZeile(id1, undefined, 'd', 'auf'), manifestZeile(id1, undefined, 'd', 'ab-versucht')].join('\n'));
  pruef('Manifest: ab-versucht nach auf zählt wieder', [...m3.ids], [id1]);
  pruef('Manifest-Zeile ohne Handle bleibt gültig (kompakt)', JSON.parse(manifestZeile(id1, undefined, 'd', 'ab-versucht')), { id: id1, am: 'd', aktion: 'ab-versucht' });
  // plan() nimmt ein «ab-versucht»-Produkt, das nicht mehr auf Google liegt und wieder passt, zurück; eines, das noch auf Google liegt, nicht
  const weg = P({ aufGoogle: false }), noch = P({ aufGoogle: true });
  const p = plan([...viele(1100), weg, noch], new Set([weg.id, noch.id]), { budget: 5000, katDeckel: 1 });
  pruef('aufnehmen: nur das tatsächlich entveröffentlichte Produkt', p.aufnehmen.map(x => x.id), [weg.id]);
}
{
  // Unbekannte Variantenzahl: nie abwählen, als unklar zählen (Prüfer: 701 Zeilen ohne variantsCount wurden vorher abgewählt)
  const ohne = Array.from({ length: 5 }, () => P({ varianten: undefined, aufGoogle: true }));
  const p = plan([...viele(1100), ...ohne], new Set(), { budget: 5000, katDeckel: 1 });
  pruef('unbekannte Variantenzahl: nicht abgewählt, als unklar gezählt, Plan bleibt ok', [p.abwaehlen.length, p.unklar, p.ok], [0, 5, true]);
  const viel = Array.from({ length: 701 }, () => P({ varianten: undefined, aufGoogle: true }));
  const q = plan([...viele(1100), ...viel], new Set(), { budget: 5000, katDeckel: 1 });
  pruef('701 Zeilen ohne Variantenzahl: Plan abgelehnt statt alles abzuwählen', [q.abwaehlen.length, q.ok, q.fehler.some(f => f.startsWith('zu-viele-unklare-zeilen'))], [0, false, true]);
}
// --- Kanal-ID und Vorgaben als LITERALE festgenagelt (der Prüfer: ein Test mit derselben Konstante prüft nur sich selbst; mit der Online-Store-ID würde das Werkzeug den Shop-Katalog leeren)
pruef('Kanal «Google & YouTube» ist genau diese ID (nicht Online Store 301970915713)', GOOGLE_PUBLICATION, 'gid://shopify/Publication/302872297857');
pruef('Vorgaben: Budget 90000, Deckel 0.15, Obergrenze 140000, Mindestbudget 40000, Abwahl-Anteil 0.7, ohne Kategorie 0.05', [BUDGET_VARIANTEN, KATEGORIE_DECKEL, HARTE_GRENZE, MIN_BUDGET, MAX_ABWAHL_ANTEIL, MAX_OHNE_KATEGORIE], [90000, 0.15, 140000, 40000, 0.7, 0.05]);
pruef('Mutation für den Google-Kanal enthält das Literal', mutation(['gid://shopify/Product/7'], 'abwaehlen').includes('publicationId:"gid://shopify/Publication/302872297857"'), true);

// --- Ausschlussfeld: nur eine Liste MIT «Shopping_ads» schliesst Shopping-Anzeigen aus
pruef('Ausschluss: leer/null/undefined = kein Ausschluss', [ausschlussGilt(null), ausschlussGilt(undefined), ausschlussGilt(''), ausschlussGilt('  ')], [false, false, false, false]);
pruef('Ausschluss: [] und fremde Ziele = kein Ausschluss von Shopping-Anzeigen', [ausschlussGilt('[]'), ausschlussGilt('["Local_inventory_ads"]'), ausschlussGilt('["Free_listings"]')], [false, false, false]);
pruef('Ausschluss: Liste mit Shopping_ads (auch mit anderen Zielen) zählt', [ausschlussGilt('["Shopping_ads"]'), ausschlussGilt('["Free_listings","Shopping_ads"]')], [true, true]);
pruef('Ausschluss: unlesbarer Wert oder kein Array gilt vorsichtshalber als Ausschluss', [ausschlussGilt('Shopping_ads'), ausschlussGilt('{"a":1}'), ausschlussGilt('kaputt[')], [true, true, true]);
pruef('stufe(): Ausschlussfeld «[]» sperrt nicht mehr', stufe(P({ ausschluss: '[]' })).stufe, 3);
pruef('stufe(): Ausschlussfeld mit Local_inventory_ads sperrt nicht', stufe(P({ ausschluss: '["Local_inventory_ads"]' })).stufe, 3);

// --- volle Rücknahme (zuruecksetzen)
{
  const eigen = P({ aufGoogle: false, ausschluss: '["Shopping_ads"]' }), sperr = P({ aufGoogle: false, tags: ['adult-nicht-bewerben'] }), fremd = P({ aufGoogle: false }), noch = P({ aufGoogle: true, ausschluss: '["Shopping_ads"]' });
  const p = plan([...viele(1100), eigen, sperr, fremd, noch], new Set([eigen.id, sperr.id, noch.id]), { budget: 5000, katDeckel: 1 });
  pruef('zuruecksetzen: eigenes Produkt (auch mit Ausschlussfeld) ja; Sperrtag, Fremdes und noch auf Google nein', p.zuruecksetzen.map(x => x.id), [eigen.id]);
}

// --- relative Wächter
{
  const z = [...viele(600), ...viele(1500, { ausschluss: '["Shopping_ads"]' })];   // 1500 von 2100 auf Google = 71 % abzuwählen
  const p = plan(z, new Set(), { budget: 5000, katDeckel: 1 });
  pruef('über 70 % abzuwählen: Plan abgelehnt', [p.ok, p.fehler.some(f => f.startsWith('zu-viele-abwaehlen'))], [false, true]);
  const q = plan([...viele(700), ...viele(1300, { ausschluss: '["Shopping_ads"]' })], new Set(), { budget: 5000, katDeckel: 1 });   // 65 %
  pruef('65 % abzuwählen ist erlaubt', [q.ok, q.abwaehlen.length], [true, 1300]);
  const r = plan(viele(2000, { kategorie: null }), new Set(), { budget: 5000, katDeckel: 1 });
  pruef('über 5 % ohne Google-Kategorie: Plan abgelehnt', r.fehler.some(f => f.startsWith('zu-viele-ohne-kategorie')), true);
  const s = plan([...viele(1900), ...viele(50, { kategorie: null })], new Set(), { budget: 5000, katDeckel: 1 });   // 2,6 %
  pruef('2,6 % ohne Google-Kategorie ist erlaubt (sie gehen mit Grund)', [s.ok, s.gruende['keine-google-kategorie']], [true, 50]);
}

// --- Stufe 0 «bewährt» (Prüfer 28.10.: 7 von 14 verkauften und 971 von 1 993 gut bewerteten Produkten wären vom Kanal gegangen)
{
  const AUS = '["Shopping_ads"]';
  pruef('bestellt, mit Ausschlussfeld = Stufe 0', stufe(P({ bestellt: true, ausschluss: AUS })).stufe, 0);
  pruef('bestellt, ohne Ausschlussfeld = Stufe 0 (nicht Stufe 3)', stufe(P({ bestellt: true })).stufe, 0);
  pruef('Gegenprobe: nicht bestellt, mit Ausschlussfeld = draussen', stufe(P({ bestellt: false, ausschluss: AUS })), { stufe: null, grund: 'ausschluss-shopping-ads' });
  pruef('4,0 Sterne bei 3 Stimmen = Stufe 0 (Grenze gilt)', stufe(P({ rating: 4, bewertungen: 3, ausschluss: AUS })).stufe, 0);
  pruef('Gegenprobe: 3,9 Sterne bei 10 Stimmen = nicht bewährt', stufe(P({ rating: 3.9, bewertungen: 10, ausschluss: AUS })).grund, 'ausschluss-shopping-ads');
  pruef('Gegenprobe: 5,0 Sterne bei 2 Stimmen = nicht bewährt', stufe(P({ rating: 5, bewertungen: 2, ausschluss: AUS })).grund, 'ausschluss-shopping-ads');
  pruef('Gegenprobe: Rating ohne Anzahl (null) = nicht bewährt, kein Absturz', stufe(P({ rating: 5, bewertungen: null, ausschluss: AUS })).grund, 'ausschluss-shopping-ads');
  pruef('Gegenprobe: Felder fehlen ganz = Stufe 3, kein Absturz', stufe(P()).stufe, 3);
  pruef('Konstanten: 4 Sterne, 3 Stimmen', [BEWAEHRT_MIN_RATING, BEWAEHRT_MIN_ANZAHL], [4, 3]);
  // Sperren gehen VOR «bewährt»
  pruef('bestellt, aber ohne Google-Kategorie = draussen', stufe(P({ bestellt: true, kategorie: null })).grund, 'keine-google-kategorie');
  pruef('bestellt, aber Sperrtag = draussen', stufe(P({ bestellt: true, tags: ['adult-nicht-bewerben'] })).grund, 'sperrtag');
  pruef('bestellt, aber ausgelistet = draussen', stufe(P({ bestellt: true, tags: ['cj-ausgelistet'] })).grund, 'nicht-lieferbar-oder-bild');
  pruef('gut bewertet, aber Prüf-Tag = draussen', stufe(P({ rating: 4.8, bewertungen: 20, tags: ['stecker-unklar'] })).grund, 'pruef-tag');
  pruef('bestellt, aber Lizenzname im Titel = draussen', stufe(P({ bestellt: true, titel: 'Mickey Mouse Folienballon' })).grund, 'lizenz-titel');
  pruef('Fortura und bewährt = Stufe 1 (Fortura zuerst)', stufe(P({ tags: ['fortura'], bestellt: true })).stufe, 1);
  pruef('Marge A und bestellt = Stufe 0', stufe(P({ tags: ['mengenrabatt-a'], bestellt: true, ausschluss: AUS })).stufe, 0);
  // Stufe 0 ist immer drin: über Budget und über dem Kategorie-Deckel
  const gross = P({ bestellt: true, varianten: 50, kategorie: 'A > B' }), klein = P({ varianten: 1, kategorie: 'A > B' });
  const w = waehle([gross, klein], { budget: 10, katDeckel: 0.1 });
  pruef('Stufe 0 über Budget und Deckel: drin; der Rest nicht', [w.drin.get(gross.id), w.drin.has(klein.id), w.zahlen.varianten[0]], [0, false, 50]);
  const pl = plan([...Array.from({ length: 1100 }, () => P()), P({ bestellt: true, ausschluss: AUS, varianten: 2, handle: 'verkauft' }), P({ ausschluss: AUS, handle: 'unbekannt' })], new Set(), { budget: 5000, katDeckel: 1 });
  pruef('plan: das bestellte Produkt mit Ausschlussfeld wird NICHT abgewählt, das unbekannte schon', [pl.abwaehlen.some(a => a.handle === 'verkauft'), pl.abwaehlen.some(a => a.handle === 'unbekannt')], [false, true]);
  pruef('bewaehrt(): bestellt true / Zahlen', [bewaehrt({ bestellt: true }), bewaehrt({ rating: 4.5, bewertungen: 3 }), bewaehrt({ rating: 4.5, bewertungen: 2 }), bewaehrt({})], [true, true, false, false]);
}

// --- Rating-Metafelder lesen
pruef('ratingAus: JSON-Wert', ratingAus('{"value":"4.5","scale_min":"1.0","scale_max":"5.0"}', '12'), { rating: 4.5, anzahl: 12 });
pruef('ratingAus: einfache Zahl', ratingAus('4.2', '3'), { rating: 4.2, anzahl: 3 });
pruef('ratingAus: Zahl im JSON', ratingAus('{"value":4.9}', '7'), { rating: 4.9, anzahl: 7 });
pruef('ratingAus: kaputtes JSON = null', ratingAus('{"value":', '5'), null);
pruef('ratingAus: Rating 0 = null', ratingAus('0', '5'), null);
pruef('ratingAus: Anzahl 0 oder fehlend = null', [ratingAus('4.5', '0'), ratingAus('4.5', null), ratingAus('4.5', undefined), ratingAus(null, '5')], [null, null, null, null]);
pruef('ratingAus: Text statt Zahl = null', ratingAus('gut', 'viele'), null);

// --- Bestellungen: nur bezahlte, nicht stornierte, nicht erstattete, keine Testbestellungen
{
  const pos = (...ids) => ({ nodes: ids.map(id => ({ product: id === null ? null : { id } })), pageInfo: { hasNextPage: false } });
  const A = 'gid://shopify/Product/11', B = 'gid://shopify/Product/12', C = 'gid://shopify/Product/13', D = 'gid://shopify/Product/14', E = 'gid://shopify/Product/15', F = 'gid://shopify/Product/16';
  const b = bestellteIds([
    { displayFinancialStatus: 'PAID', lineItems: pos(A, null, 'kaputt') },
    { displayFinancialStatus: 'PARTIALLY_REFUNDED', lineItems: pos(B) },
    { displayFinancialStatus: 'REFUNDED', lineItems: pos(C) },
    { displayFinancialStatus: 'PAID', test: true, lineItems: pos(D) },
    { displayFinancialStatus: 'PAID', cancelledAt: '2026-10-01T00:00:00Z', lineItems: pos(E) },
    { displayFinancialStatus: 'PENDING', lineItems: pos(F) },
  ]);
  pruef('Bestellungen: bezahlt und teilerstattet zählen, null-Produkt und fremde ID nicht', [[...b.ids].sort(), b.vollstaendig], [[A, B], true]);
  pruef('Bestellungen: erstattet, Test, storniert, offen zählen nicht', [b.ids.has(C), b.ids.has(D), b.ids.has(E), b.ids.has(F)], [false, false, false, false]);
  const lang = bestellteIds([{ displayFinancialStatus: 'PAID', lineItems: { nodes: [{ product: { id: A } }], pageInfo: { hasNextPage: true } } }]);
  pruef('Bestellung mit abgeschnittenen Positionen: unvollständig, gelesenes zählt trotzdem', [lang.vollstaendig, lang.ids.has(A)], [false, true]);
  pruef('Bestellungen: undefined / leer / Müll ohne Absturz', [bestellteIds(undefined).ids.size, bestellteIds([]).vollstaendig, bestellteIds([null, {}, { displayFinancialStatus: 'PAID' }]).ids.size], [0, true, 0]);
}

// --- Prüf-Tags, Lizenznamen, Gleichlauf mit der Liste «nie bewerben» der Mengenrabatt-Regel
{
  for (const t of ['stecker-unklar', 'marken-pruefen', 'waffe-pruefen', 'versand-pruefen', 'google-policy-waffen', 'heilversprechen-risiko', 'google-kanal-markenware-unklar', 'lieferumfang-unklar', 'preis-pruefen-cj-spanne'])
    pruef(`Prüf-Tag ${t} sperrt`, stufe(P({ tags: [t] })), { stufe: null, grund: 'pruef-tag' });
  pruef('Gegenprobe: stecker-ok / versand-pruefen-x sperren nicht', [PRUEF_TAGS.test('stecker-ok'), PRUEF_TAGS.test('versand-pruefen-x')], [false, false]);
  pruef('Gegenprobe: auto-entwurf-0926 (Charge ohne harten Grund, 30 aktive, verkauft) sperrt NICHT', stufe(P({ tags: ['auto-entwurf-0926', 'cj-real'] })).stufe, 3);
  pruef('Gegenprobe: auto-entwurf-0926 und bestellt = Stufe 0', stufe(P({ tags: ['auto-entwurf-0926'], bestellt: true })).stufe, 0);
  pruef('Gegenprobe: Fortura mit Prüf-Tag geht (Sperre vor Stufe 1)', stufe(P({ tags: ['fortura', 'stecker-unklar'] })).grund, 'pruef-tag');
  for (const [titel, soll] of [['Mickey Mouse Folienballon', 'lizenz-titel'], ['Plüsch Sonic Igel', 'lizenz-titel'], ['Minions HD Überwachungskamera', 'lizenz-titel'], ['Iron Man QI Wireless Charger Stand', 'lizenz-titel']])
    pruef(`Lizenzname «${titel}» geht`, stufe(P({ titel, tags: ['fortura'] })).grund, soll);
  pruef('Gegenprobe: Ultraschall-Zahnbürste / Titel fehlt / leer = bleibt', [stufe(P({ titel: 'Ultraschall Zahnbürste' })).stufe, stufe(P()).stufe, stufe(P({ titel: '' })).stufe], [3, 3, 3]);
  // Gleichlauf: jedes Tag der Liste «nie bewerben» (mengenrabatt.mjs) hält auch hier vom Kanal fern; nur fortura/kostuem sind hier Stufe 1 bzw. normale Ware
  const offen = AUSSCHLUSS_TAGS.filter(t => !['fortura', 'kostuem'].includes(t) && stufe(P({ tags: [t] })).stufe !== null);
  pruef('Gleichlauf mit AUSSCHLUSS_TAGS: kein Tag der Liste lässt ein Produkt auf Google', offen, []);
}

// --- Schwach bewertet, Lizenzfiguren ausserhalb der Feed-Liste, Stufe 0 im Plan (Prüfer 28.10.)
{
  const AUS = '["Shopping_ads"]';
  pruef('Konstanten schwach: 3,8 Sterne, 3 Stimmen', [SCHWACH_MAX_RATING, SCHWACH_MIN_ANZAHL], [3.8, 3]);
  pruef('3,8 Sterne bei 3 Stimmen = schwach (Grenze gilt)', stufe(P({ rating: 3.8, bewertungen: 3 })), { stufe: null, grund: 'schwach-bewertet' });
  pruef('Gegenprobe: 3,9 Sterne bei 10 Stimmen = Stufe 3', stufe(P({ rating: 3.9, bewertungen: 10 })).stufe, 3);
  pruef('Gegenprobe: 2,0 Sterne bei 2 Stimmen = Stufe 3 (zu wenige Stimmen)', stufe(P({ rating: 2, bewertungen: 2 })).stufe, 3);
  pruef('schwach bewertet UND bestellt = draussen (Sperre vor bewährt)', stufe(P({ rating: 3, bewertungen: 9, bestellt: true })).grund, 'schwach-bewertet');
  pruef('schwach bewertet UND Fortura = draussen (Sperre vor Stufe 1)', stufe(P({ rating: 3, bewertungen: 9, tags: ['fortura'] })).grund, 'schwach-bewertet');
  for (const t of ['Plüsch Pikachu', 'Plüsch Garfield 60 cm', 'Plüschmütze Pingu', 'Halskette Morticia Wednesday', 'Plüsch Patrick Star Classic', 'Zelda Legend Print Rucksack'])
    pruef(`Lizenzfigur «${t}» geht (auch Fortura)`, stufe(P({ titel: t, tags: ['fortura'] })).grund, 'lizenz-titel');
  pruef('Gegenprobe: Pinguin / Mittwoch / Hundeleine / Zeldaweiss bleiben', ['Pinguin Figur', 'Mittwoch Kalender', 'Hundeleine Pingufrei', 'Zeldaweiss Kissen'].map(t => LIZENZ_PLUS.test(t)), [false, false, false, false]);
  // Plan: Stufe 0 in allen Wegen (0 ist falsy)
  const mach = (o = {}) => Array.from({ length: 1100 }, () => P(o));
  const bew = P({ bestellt: true, aufGoogle: false, ausschluss: AUS, varianten: 3, handle: 'zurueck' });
  const pl = plan([...mach(), bew], new Set([bew.id]), { budget: 5000, katDeckel: 1 });
  pruef('plan: bewährtes Produkt aus dem Manifest kommt zurück (aufnehmen, Stufe 0)', pl.aufnehmen.map(a => [a.handle, a.stufe]), [['zurueck', 0]]);
  pruef('plan: nachher zählt Stufe 0 mit (1100 + 3)', pl.varianten.nachher, 1103);
  const z = waehle([P({ bestellt: true, varianten: 4 }), P({ rating: 4.5, bewertungen: 5, varianten: 6 }), P({ tags: ['fortura'], varianten: 1 })], { budget: 100, katDeckel: 1 }).zahlen;
  pruef('zahlen: Produkte, drin und Varianten je Stufe inkl. Stufe 0', [z.produkte, z.drin, z.varianten], [{ 0: 2, 1: 1, 2: 0, 3: 0 }, { 0: 2, 1: 1, 2: 0, 3: 0 }, { 0: 10, 1: 1, 2: 0, 3: 0, gesamt: 11 }]);
  // Grund «budget» und «kategorie-deckel» bleiben unterscheidbar, wenn Stufe 0 Platz belegt
  const gross = P({ bestellt: true, varianten: 50, kategorie: 'A > B' }), kl = P({ varianten: 1, kategorie: 'A > B' });
  pruef('Stufe 0 über dem Budget: der Rest geht mit Grund «budget»', waehle([gross, kl], { budget: 10, katDeckel: 0.1 }).draussen.find(d => d.id === kl.id).grund, 'budget');
  const gross2 = P({ bestellt: true, varianten: 50, kategorie: 'A > B' }), kl2 = P({ varianten: 60, kategorie: 'A > B' });
  pruef('Stufe 0 füllt die Kategorie: der Rest geht mit Grund «kategorie-deckel»', waehle([gross2, kl2], { budget: 1000, katDeckel: 0.1 }).draussen.find(d => d.id === kl2.id).grund, 'kategorie-deckel');
  pruef('Stufe 0 ist selbst nie vom Deckel betroffen', waehle([gross2], { budget: 1000, katDeckel: 0.01 }).drin.get(gross2.id), 0);
  // bestellt + Sperrtag im Plan
  const sp = P({ bestellt: true, tags: ['adult-nicht-bewerben'], handle: 'gesperrt' });
  const pl2 = plan([...mach(), sp], new Set(), { budget: 5000, katDeckel: 1 });
  pruef('plan: bestellt, aber Sperrtag → wird abgewählt mit Grund sperrtag', pl2.abwaehlen.filter(a => a.handle === 'gesperrt').map(a => a.grund), ['sperrtag']);
}
// --- Gleichlauf der Tag-Listen in beide Richtungen, nicht leer bestehbar
{
  const frei = AUSSCHLUSS_TAGS.filter(t => !['fortura', 'kostuem'].includes(t));
  pruef('AUSSCHLUSS_TAGS ist nicht leer (der Gleichlauf-Test prüft etwas)', frei.length > 20, true);
  const pruefListe = ['waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'stecker-unklar', 'marken-pruefen', 'waffe-pruefen', 'versand-pruefen', 'google-policy-waffen', 'heilversprechen-risiko', 'google-kanal-markenware-unklar', 'lieferumfang-unklar', 'preis-pruefen-cj-spanne'];
  pruef('Jedes Prüf-Tag steht auch in AUSSCHLUSS_TAGS der Mengenrabatt-Regel (sonst driftet die Liste)', pruefListe.filter(t => PRUEF_TAGS.test(t) && !AUSSCHLUSS_TAGS.includes(t)), []);
  pruef('Start-Anker: «xstecker-unklar» sperrt nicht', PRUEF_TAGS.test('xstecker-unklar'), false);
}

// --- Manifest: BOM am Anfang
pruef('Manifest: BOM am Dateianfang verliert keine Zeile', [...parseManifest('\uFEFF' + manifestZeile('gid://shopify/Product/5', undefined, 'd', 'ab-versucht') + '\n').ids], ['gid://shopify/Product/5']);
pruef('Manifest: CRLF-Zeilenenden sind in Ordnung', [...parseManifest(manifestZeile('gid://shopify/Product/6', undefined, 'd') + '\r\n' + manifestZeile('gid://shopify/Product/7', undefined, 'd') + '\r\n').ids].sort(), ['gid://shopify/Product/6', 'gid://shopify/Product/7']);
pruef('Grenzen sind gesetzt', [HARTE_GRENZE > BUDGET_VARIANTEN, HARTE_GRENZE < 150000, MIN_PRODUKTE > 0], [true, true, true]);

console.log(`${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
