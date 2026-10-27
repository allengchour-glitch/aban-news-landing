// Hauptschleife von automation/cj_varianten_nachziehen.mjs gegen ein simuliertes Netz (automation/lib/test_netz_stub.mjs): kein echter Shop, kein echtes CJ.
// Anlass (26.10.2026, zwei unabhängige Prüfdurchläufe des Nacht-Workflows): Die Schleife entscheidet, was ins Ledger kommt, wann ein Lauf endet und welcher
// Exitcode den Treiber steuert. Das lässt sich mit den reinen Bibliotheksfunktionen allein nicht prüfen.
// Jedes Szenario startet das Werkzeug als eigenen Prozess; geprüft werden Exitcode, Ledger-Zeilen und die tatsächlich gesendeten Anfragen.
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const REPO = resolve(new URL('..', import.meta.url).pathname);
const STUB = join(REPO, 'automation/lib/test_netz_stub.mjs'), WERKZEUG = process.env.WERKZEUG_PFAD || join(REPO, 'automation/cj_varianten_nachziehen.mjs');   // WERKZEUG_PFAD: für Mutationsproben

// ffmpeg-Attrappe: Das Werkzeug prüft beim Start nur `ffmpeg -version` (die Szenarien brauchen keine Bilddekodierung; der Bild-Fall scheitert schon beim Laden).
// So hängt der Test weder von einem installierten ffmpeg noch vom Paketserver der CI ab (apt-get hing dort einmal über drei Minuten).
const SHIM = mkdtempSync(join(tmpdir(), 'ffmpeg-attrappe-'));
writeFileSync(join(SHIM, 'ffmpeg'), '#!/bin/sh\n[ "$1" = "-version" ] && { echo "ffmpeg version attrappe"; exit 0; }\necho "ffmpeg-Attrappe: nur für Tests" >&2; exit 1\n');
chmodSync(join(SHIM, 'ffmpeg'), 0o755);
process.on('exit', () => rmSync(SHIM, { recursive: true, force: true }));

/** Produkt-Baukasten: sicher = Farben, die das Wörterbuch kennt; unsicher = Phantasiefarben, die erst übersetzt werden müssten. */
let zaehler = 0;
const P = (art = 'sicher', extra = {}) => {
  const pid = `2502070858141${String(++zaehler).padStart(6, '0')}`;
  const basis = art === 'unsicher' ? { farben: ['Moonlight Fantasy', 'Starry Dream'], groessen: ['S', 'M'] }
    : art === 'einzeln' ? { farben: ['Black'], groessen: ['S'] }
    : art === 'viele' ? { farben: ['Black', 'White', 'Red', 'Blue', 'Green', 'Pink', 'Gray'], groessen: ['S', 'M', 'L', 'XL', 'XXL', '3XL'] }
    : { farben: ['Black', 'White'], groessen: ['S', 'M'] };
  P.letzte = pid;
  return { pid, ...basis, ...extra };
};

function lauf(szenario, { ledger = '', live = true, env = {}, pfad = `${SHIM}:${process.env.PATH}` } = {}) {
  const t = mkdtempSync(join(tmpdir(), 'nachziehen-test-'));
  try {
    const handles = Object.keys(szenario.produkte);
    writeFileSync(join(t, 'szenario.json'), JSON.stringify(szenario));
    writeFileSync(join(t, 'ledger.txt'), ledger);
    writeFileSync(join(t, 'handles.csv'), 'handle;stufe\n' + handles.map(h => `${h};1`).join('\n') + '\n');
    writeFileSync(join(t, 'cjtoken.json'), JSON.stringify({ token: 'stub', exp: Date.now() + 864e5 }));
    mkdirSync(join(t, 'plan')); mkdirSync(join(t, 'cache'));
    const r = spawnSync(process.execPath, ['--import', STUB, WERKZEUG], {
      cwd: REPO, encoding: 'utf8', timeout: 120000,
      env: { PATH: pfad, HOME: t, NETZ_SZENARIO: join(t, 'szenario.json'), NETZ_LOG: join(t, 'netz.jsonl'),
        SHOPIFY_SHOP: 'test-shop.myshopify.com', SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'shpss_' + 'a'.repeat(32),
        CJ_EMAIL: 'a@b.ch', CJ_API_KEY: 'key', CJ_TOKEN_CACHE: join(t, 'cjtoken.json'), GEMINI_API_KEY: 'stub', GROQ_API_KEY: '',
        LEDGER: join(t, 'ledger.txt'), PLAN_DIR: join(t, 'plan'), CJ_FAKTEN_CACHE: join(t, 'cache'), CJ_PAUSE_MS: '0', CJ_BACKOFF_MS: '0',
        LIVE: live ? '1' : '0', LIMIT: '50', HANDLES_DATEI: join(t, 'handles.csv'), ...env },
    });
    const zeilen = readFileSync(join(t, 'ledger.txt'), 'utf8').split('\n').filter(Boolean);
    const vorher = ledger.split('\n').filter(Boolean).length;
    const L = zeilen.slice(vorher).map(z => { const [h, , e, g = ''] = z.split(' · '); return { h, e, g }; });
    const netz = existsSync(join(t, 'netz.jsonl')) ? readFileSync(join(t, 'netz.jsonl'), 'utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)) : [];
    return { rc: r.status, out: (r.stdout || '') + (r.stderr || ''), L, netz, planDatei: h => existsSync(join(t, 'plan', h + '.json')) };
  } finally { rmSync(t, { recursive: true, force: true }); }
}
const art = (r, k) => r.netz.filter(x => x.k === k);
const eng = r => r.L.map(x => `${x.h}:${x.e}`);

// ── 1) Normalfall: zwei sichere Produkte werden geschrieben, mit Marker, Auswahl und frischem Lesen davor
let r = lauf({ produkte: { a: P(), b: P() } });
ist('Normalfall: Exitcode 0', r.rc, 0);
ist('Normalfall: beide GESCHRIEBEN mit 4 Varianten', r.L.map(x => `${x.h}:${x.e}:${x.g}`), ['a:GESCHRIEBEN:4 Varianten', 'b:GESCHRIEBEN:4 Varianten']);
ist('Normalfall: je ein frisches Lesen VOR productSet', r.netz.filter(x => x.k === 'FRISCH' || x.k === 'productSet').map(x => `${x.k}:${x.handle}`), ['FRISCH:a', 'productSet:a', 'FRISCH:b', 'productSet:b']);
ist('Normalfall: productSet mit zwei Optionen, 4 Varianten und Marker', art(r, 'productSet').map(x => [x.optionen.length, x.varianten, x.beschreibungMarker]), [[2, 4, true], [2, 4, true]]);
ist('Normalfall: die Tags bleiben erhalten und wachsen um die Marke', art(r, 'productSet')[0].tags, ['sort-test', 'cj', 'varianten-nachgezogen-1025']);

// ── 2) Trockenlauf: nichts ins Ledger, kein frisches Lesen, kein Schreiben
r = lauf({ produkte: { a: P() } }, { live: false });
ist('Trockenlauf: Exitcode 0, Ledger unverändert, kein productSet, kein frisches Lesen', [r.rc, r.L.length, art(r, 'productSet').length, art(r, 'FRISCH').length], [0, 0, 0, 0]);
ist('Trockenlauf: meldet «nichts geschrieben»', /Trockenlauf — nichts geschrieben/.test(r.out), true);

// ── 3) Ausnahme beim Schreiben EINES Produkts sperrt die Scheibe nicht (Prüfung: bisher Exitcode 1 und das zweite Produkt nie erreicht)
r = lauf({ produkte: { a: P(), b: P() }, set: { a: 'fehler' } });
ist('Schreib-Ausnahme: Exitcode 0 (Lauf geht weiter)', r.rc, 0);
ist('Schreib-Ausnahme: a als FEHLER «Schreiben: …» gemerkt, b GESCHRIEBEN', [eng(r), /^Schreiben: GraphQL/.test(r.L[0].g)], [['a:FEHLER', 'b:GESCHRIEBEN'], true]);
r = lauf({ produkte: { a: P(), b: P() }, set: { a: 'usererror' } });
ist('userError beim Schreiben: FEHLER gemerkt, Lauf geht weiter', [r.rc, eng(r)], [0, ['a:FEHLER', 'b:GESCHRIEBEN']]);

// ── 4) Fehlerserie: nach MAX_FEHLER_FOLGE Fehlern hintereinander kontrolliert enden (Exitcode 1), den Rest der Liste nicht verbrennen
r = lauf({ produkte: { a: P(), b: P(), c: P(), d: P() }, set: { a: 'fehler', b: 'fehler', c: 'fehler', d: 'fehler' } }, { env: { MAX_FEHLER_FOLGE: '3' } });
ist('Fehlerserie: Exitcode 1 nach 3 Fehlern', [r.rc, eng(r)], [1, ['a:FEHLER', 'b:FEHLER', 'c:FEHLER']]);
ist('Fehlerserie: das vierte Produkt wurde nicht einmal geplant', art(r, 'PRODUKT').map(x => x.handle), ['a', 'b', 'c']);
ist('Fehlerserie: Meldung', /ABBRUCH: 3 Schreibfehler in Folge/.test(r.out), true);
r = lauf({ produkte: { a: P(), b: P(), c: P(), d: P() }, set: { a: 'fehler', b: 'fehler', c: 'ok', d: 'fehler' } }, { env: { MAX_FEHLER_FOLGE: '3' } });
ist('ein Erfolg setzt die Serie zurück: kein Abbruch', [r.rc, eng(r)], [0, ['a:FEHLER', 'b:FEHLER', 'c:GESCHRIEBEN', 'd:FEHLER']]);

// Ein dauerhafter Schreibausfall wird auch erkannt, wenn zwischendurch Produkte übersprungen werden (Überspringer setzen den Schreibzähler NICHT zurück)
r = lauf({ produkte: { a: P(), e1: P('einzeln'), b: P(), e2: P('einzeln'), c: P(), e3: P('einzeln'), d: P() }, set: { a: 'fehler', b: 'fehler', c: 'fehler', d: 'fehler' } }, { env: { MAX_FEHLER_FOLGE: '3' } });
ist('Schreibausfall mit eingestreuten Überspringern: trotzdem Exitcode 1 nach 3 Schreibfehlern', [r.rc, eng(r).filter(x => x.endsWith(':FEHLER')), art(r, 'PRODUKT').map(x => x.handle).includes('d')], [1, ['a:FEHLER', 'b:FEHLER', 'c:FEHLER'], false]);

// ── 5) Shopify-Tageslimit: Exitcode 4, KEINE Ledger-Zeile (kein Fehler des Produkts)
r = lauf({ produkte: { a: P(), b: P() }, set: { a: 'limit' } });
ist('Tageslimit: Exitcode 4 und kein Ledger-Eintrag', [r.rc, r.L.length, /TAGESLIMIT/.test(r.out)], [4, 0, true]);

// ── 6) KI-Dienst: Ausfall ≠ «unsicher übersetzt»
r = lauf({ produkte: { a: P('unsicher') }, ki: 'down' });
ist('KI fällt aus: nur 20 Stunden zurückgestellt (vorläufig), nichts geschrieben', [r.rc, r.L.map(x => `${x.e}:${x.g}`), art(r, 'productSet').length], [0, ['UEBERSPRUNGEN:vorläufig: KI-Dienst nicht erreichbar'], 0]);
r = lauf({ produkte: { a: P('unsicher'), b: P('unsicher'), c: P('unsicher') }, ki: 'down' }, { env: { MAX_KI_FOLGE: '2' } });
ist('KI-Serie: Exitcode 5 nach 2 Ausfällen, das dritte Produkt bleibt unberührt', [r.rc, eng(r), art(r, 'PRODUKT').map(x => x.handle)], [5, ['a:UEBERSPRUNGEN', 'b:UEBERSPRUNGEN'], ['a', 'b']]);
r = lauf({ produkte: { a: P('unsicher') }, ki: 'unveraendert' });
ist('KI antwortet, Übersetzung unbrauchbar: 7 Tage zurückgestellt', [r.rc, r.L.map(x => x.g.split(':')[0])], [0, ['zurückgestellt']]);
r = lauf({ produkte: { a: P('unsicher') }, ki: 'ok', kiMap: { 'Moonlight Fantasy': 'Mondlichtfantasie', 'Starry Dream': 'Sternentraum' } });
ist('KI übersetzt brauchbar: Produkt wird geschrieben', [r.rc, eng(r), art(r, 'productSet').length], [0, ['a:GESCHRIEBEN'], 1]);

// KI bewusst aus (KEIN_KI_UEBERSETZEN=1, vom Workflow gesetzt wenn der Probeaufruf scheitert): unsichere Produkte nur 20 Stunden zurückgestellt, ohne Fracht, kein Abbruch; sichere laufen weiter
r = lauf({ produkte: { a: P('unsicher'), b: P(), c: P('unsicher'), d: P('unsicher'), e: P('unsicher'), f: P('unsicher'), g: P('unsicher'), h: P() }, ki: 'down' }, { env: { KEIN_KI_UEBERSETZEN: '1', MAX_KI_FOLGE: '2' } });
ist('KI aus: kein Abbruch trotz MAX_KI_FOLGE=2, sichere Produkte werden geschrieben', [r.rc, eng(r).filter(x => x.endsWith(':GESCHRIEBEN')), eng(r).filter(x => x.endsWith(':UEBERSPRUNGEN')).length], [0, ['b:GESCHRIEBEN', 'h:GESCHRIEBEN'], 6]);
ist('KI aus: unsichere nur «vorläufig» (20 h) mit eigenem Grund', r.L.filter(x => x.e === 'UEBERSPRUNGEN').every(x => x.g.startsWith('vorläufig: KI-Dienst aus')), true);
ist('KI aus: weder die KI noch die CJ-Fracht wurde für die unsicheren Produkte gefragt', [art(r, 'gemini').length, art(r, 'cjFracht').map(x => x.handle).sort()], [0, ['b', 'h']]);

// Das kleine Groq-Modell liefert Etikettenwörter klein: die Grossschreibung des Originals wird wiederhergestellt, bevor die Werte im Shop landen
r = lauf({ produkte: { a: P('unsicher') }, ki: 'ok', kiMap: { 'Moonlight Fantasy': 'mondlichtfantasie', 'Starry Dream': 'sternentraum' } });
ist('KI liefert klein: Werte im Shop beginnen gross', [r.rc, art(r, 'productSet').length, (art(r, 'productSet')[0]?.werte || []).filter(w => /^(Mondlichtfantasie|Sternentraum)$/.test(w)).length], [0, 1, 2]);

// ── 7) Frisches Lesen unmittelbar vor dem Schreiben
r = lauf({ produkte: { a: P() }, frisch: { a: { updatedAt: '2026-10-26T10:05:00Z' } } });
ist('Produkt seit dem Plan geändert: vorläufig übersprungen, NICHT geschrieben', [r.rc, r.L.map(x => `${x.e}:${x.g.startsWith('vorläufig: seit dem Plan verändert') && x.g.includes('updatedAt')}`), art(r, 'productSet').length], [0, ['UEBERSPRUNGEN:true'], 0]);
ist('Produkt seit dem Plan geändert: die Plandatei wurde verworfen', r.planDatei('a'), false);
r = lauf({ produkte: { a: P() }, frisch: { a: { tags: ['sort-test', 'cj', 'sort-neu-von-anderer-sitzung'] } } });
ist('Tag von anderer Sitzung hinzugekommen würde überschrieben: nicht schreiben', [eng(r), art(r, 'productSet').length], [['a:UEBERSPRUNGEN'], 0]);
r = lauf({ produkte: { a: P() }, frisch: { a: { variantsCount: { count: 5 } } } });
ist('andere Sitzung war schneller (5 Varianten): nicht schreiben', [eng(r), art(r, 'productSet').length], [['a:UEBERSPRUNGEN'], 0]);

// ── 8) CJ: Drosselung bei EINEM Produkt ist keine globale; erst die zweite hintereinander beendet den Lauf (Exitcode 3)
r = lauf({ produkte: { a: P(), b: P() }, cj: { a: 'http500' } });
ist('CJ HTTP 500 bei einem Produkt: FEHLER «Plan:» gemerkt, das nächste wird geschrieben', [r.rc, eng(r), /^Plan: CJ_THROTTLED/.test(r.L[0].g)], [0, ['a:FEHLER', 'b:GESCHRIEBEN'], true]);
r = lauf({ produkte: { a: P(), b: P(), c: P() }, cj: { a: 'http500', b: 'http500' } });
ist('CJ 5xx zweimal hintereinander: Exitcode 3, drittes Produkt unberührt', [r.rc, eng(r), art(r, 'PRODUKT').map(x => x.handle)], [3, ['a:FEHLER'], ['a', 'b']]);
r = lauf({ produkte: { a: P(), b: P() }, cj: { a: 'quota' } });
ist('CJ-Punkte erschöpft: sofort Exitcode 3, kein Ledger-Eintrag', [r.rc, r.L.length], [3, 0]);
r = lauf({ produkte: { a: P(), b: P() }, fracht: { a: 'http500' } });
ist('Frachtdienst fällt bei einem Produkt aus: NICHT als «Lieferbarkeit nicht bewiesen» für 14 Tage gemerkt, sondern wie eine CJ-Drosselung behandelt', [r.rc, eng(r), r.L[0].g.startsWith('Plan: CJ_THROTTLED')], [0, ['a:FEHLER', 'b:GESCHRIEBEN'], true]);
r = lauf({ produkte: { a: P() }, fracht: { a: 'leer' } });
ist('keine Frachtlinie (sicher nicht lieferbar): endgültig «nicht bewiesen», 14 Tage', [eng(r), r.L[0].g.startsWith('Lieferbarkeit nicht bewiesen'), r.L[0].g.includes('zurückgestellt')], [['a:UEBERSPRUNGEN'], true, false]);

// ── 9) Ledger-Gedächtnis: welche Gründe wie lange gelten
r = lauf({ produkte: { a: P('einzeln') } });
ist('CJ führt nur eine Variante: endgültig (ohne Präfix)', [eng(r), r.L[0].g.startsWith('CJ führt nur'), /zurückgestellt|vorläufig/.test(r.L[0].g)], [['a:UEBERSPRUNGEN'], true, false]);
r = lauf({ produkte: { a: P('viele') } });
ist('zu viele CJ-Varianten: zurückgestellt (7 Tage)', [eng(r), r.L[0].g.startsWith('zurückgestellt: viele CJ-Varianten')], [['a:UEBERSPRUNGEN'], true]);
const jetzt = Date.now(), stunden = h => new Date(jetzt - h * 3600e3).toISOString();
r = lauf({ produkte: { a: P(), b: P(), c: P(), d: P(), e: P() } }, { ledger:
  `a · ${stunden(30 * 24)} · GESCHRIEBEN · 4 Varianten\nb · ${stunden(24 * 6)} · UEBERSPRUNGEN · zurückgestellt: unsicher übersetzt []\nc · ${stunden(5)} · FEHLER · Schreiben: x\nd · ${stunden(21)} · UEBERSPRUNGEN · vorläufig: seit dem Plan verändert (x)\n` });
ist('Gedächtnis: a (geschrieben), b (6 Tage zurückgestellt), c (FEHLER vor 5 h) werden nicht angefasst; d (vorläufig vor 21 h) und e kommen dran', art(r, 'PRODUKT').map(x => x.handle), ['d', 'e']);
r = lauf({ produkte: { a: P(), b: P() } }, { ledger: `a · ${stunden(24 * 8)} · UEBERSPRUNGEN · zurückgestellt: unsicher übersetzt []\n` });
ist('Gedächtnis: «zurückgestellt» vor 8 Tagen ist abgelaufen — a kommt wieder dran', art(r, 'PRODUKT').map(x => x.handle), ['a', 'b']);

// ── 10) Variantenbilder: mehr als die Hälfte unlesbar → nicht schreiben (sonst Marker und für immer ohne Variantenbilder)
r = lauf({ produkte: { a: P('sicher', { bildUrl: 'http://127.0.0.1:9/nichts.png' }) } });
ist('Variantenbild nicht ladbar: vorläufig übersprungen, NICHT geschrieben', [r.rc, r.L.map(x => `${x.e}:${x.g.split(' (')[0]}`), art(r, 'productSet').length], [0, ['UEBERSPRUNGEN:vorläufig: Variantenbilder unlesbar'], 0]);

// ── 10b) SKU nachziehen (27.10.2026, #1029): nach dem Stecker-Filter bleibt EINE von mehreren CJ-Varianten → nur die SKU der Standardvariante wird gesetzt
const STECKER = ['Black-US', 'Black-EU'];
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER } });
ist('SKU nachziehen live: Exitcode 0, eigener Ausgang SKU_GESETZT (nicht GESCHRIEBEN) mit alt → neu', [r.rc, eng(r), r.L[0]?.g], [0, ['a:SKU_GESETZT'], `SKU CJ-${P.letzte} → CJTST1000101AZ`]);
ist('SKU nachziehen live: Frachtprüfung der bleibenden Variante VOR dem Schreiben, genau einmal', [art(r, 'cjFracht').length, r.netz.findIndex(x => x.k === 'cjFracht') < r.netz.findIndex(x => x.k === 'SKU_SCHREIBEN')], [1, true]);
ist('SKU nachziehen live: die Doppel-Abfrage läuft vor dem Schreiben', [art(r, 'SKU_DOPPELT').length, r.netz.findIndex(x => x.k === 'SKU_DOPPELT') < r.netz.findIndex(x => x.k === 'SKU_SCHREIBEN')], [1, true]);
ist('SKU nachziehen live: genau EIN frisches Lesen und EIN Schreiben, nur die SKU, kein productSet', [art(r, 'SKU_LESEN').length, art(r, 'SKU_SCHREIBEN').length, art(r, 'productSet').length, JSON.stringify(art(r, 'SKU_SCHREIBEN')[0]?.vars)], [1, 1, 0, JSON.stringify([{ id: 'gid://shopify/ProductVariant/1', inventoryItem: { sku: 'CJTST1000101AZ' } }])]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER } }, { live: false });
ist('SKU nachziehen Trockenlauf: meldet den Plan, schreibt nichts, kein Ledger', [r.rc, /SKU_NACHZIEHEN/.test(r.out), r.L.length, art(r, 'SKU_SCHREIBEN').length, art(r, 'SKU_LESEN').length], [0, true, 0, 0, 0]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER } }, { ledger: `a · ${new Date().toISOString()} · SKU_GESETZT · SKU alt → neu\n` });
ist('SKU nachziehen: steht SKU_GESETZT im Ledger (14 Tage), passiert gar nichts (keine einzige Anfrage ausser dem Token)', [r.rc, art(r, 'PRODUKT').length, art(r, 'SKU_SCHREIBEN').length], [0, 0, 0]);
for (const modus of ['usererror', 'null', 'errors', 'schweigt']) {
  r = lauf({ produkte: { a: P('einzeln'), b: P('einzeln') }, stecker: { a: STECKER, b: STECKER }, sku: { a: modus } });
  ist(`SKU-Schreiben «${modus}»: a wird FEHLER «SKU: …» gemerkt (nie SKU_GESETZT), b läuft weiter`, [r.rc, eng(r), /^SKU: /.test(r.L[0]?.g || '')], [0, ['a:FEHLER', 'b:SKU_GESETZT'], true]);
}
r = lauf({ produkte: { a: P('einzeln'), b: P('einzeln'), c: P('einzeln'), d: P('einzeln') }, stecker: { a: STECKER, b: STECKER, c: STECKER, d: STECKER }, sku: { a: 'usererror', b: 'usererror', c: 'usererror', d: 'usererror' } }, { env: { MAX_FEHLER_FOLGE: '3' } });
ist('SKU-Schreibfehler-Serie: Exitcode 1 nach 3 Fehlern, das vierte Produkt unberührt', [r.rc, eng(r), art(r, 'PRODUKT').map(x => x.handle)], [1, ['a:FEHLER', 'b:FEHLER', 'c:FEHLER'], ['a', 'b', 'c']]);
// Unklare Lage (Rest «Black-CN» nennt keinen Euro-Stecker) oder zu teure Euro-Variante: nie schreiben, 7 Tage zurückgestellt (zählbar, nicht «kein Auswahlproblem»)
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: ['Black-US', 'Gray-US', 'Black-EU'] } });
ist('SKU: graue US-Variante verworfen, schwarze EU bleibt → zurückgestellt, eigener Zähler SKU_MEHRDEUTIG im Bericht', [eng(r), /SKU mehrdeutig: .*unterscheidet sich nicht nur im Stecker/.test(r.L[0]?.g), art(r, 'SKU_SCHREIBEN').length, /"SKU_MEHRDEUTIG":1/.test(r.out)], [['a:UEBERSPRUNGEN'], true, 0, true]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER }, fracht: { a: 'leer' } });
ist('SKU: Euro-Variante ohne Frachtlinie nach CH → nicht schreiben, «Lieferbarkeit nicht bewiesen» (endgültig, kein Präfix)', [eng(r), /^Lieferbarkeit nicht bewiesen/.test(r.L[0]?.g), art(r, 'SKU_LESEN').length, art(r, 'SKU_SCHREIBEN').length], [['a:UEBERSPRUNGEN'], true, 0, 0]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER }, skuDoppelt: { CJTST1000101AZ: 'zwilling-mit-auswahl' } });
ist('SKU: ein anderes Produkt trägt die Ziel-SKU schon → zurückgestellt (7 Tage), nichts geschrieben', [r.rc, eng(r), r.L[0]?.g, art(r, 'SKU_SCHREIBEN').length], [0, ['a:UEBERSPRUNGEN'], 'zurückgestellt: SKU schon vergeben (zwilling-mit-auswahl)', 0]);
// Deckel: höchstens MAX_SKU_SCHREIBEN Schreibvorgänge je 20 Stunden, gezählt im Ledger (über alle Stapel)
const SK4 = { produkte: { a: P('einzeln'), b: P('einzeln'), c: P('einzeln'), d: P('einzeln') }, stecker: { a: STECKER, b: STECKER, c: STECKER, d: STECKER } };
r = lauf(SK4, { env: { MAX_SKU_SCHREIBEN: '2' } });
ist('SKU-Deckel 2: zwei werden gesetzt, die anderen zwei «vorläufig: SKU-Deckel erreicht», Exitcode 0', [r.rc, eng(r), art(r, 'SKU_SCHREIBEN').map(x => x.handle), r.L.slice(2).every(x => x.g.startsWith('vorläufig: SKU-Deckel erreicht'))], [0, ['a:SKU_GESETZT', 'b:SKU_GESETZT', 'c:UEBERSPRUNGEN', 'd:UEBERSPRUNGEN'], ['a', 'b'], true]);
r = lauf(SK4, { env: { MAX_SKU_SCHREIBEN: '2' }, ledger: `x1 · ${new Date(Date.now() - 3600e3).toISOString()} · SKU_GESETZT · SKU alt → neu\nx2 · ${new Date(Date.now() - 2 * 3600e3).toISOString()} · SKU_GESETZT · SKU alt → neu\n` });
ist('SKU-Deckel zählt die SKU_GESETZT-Zeilen der letzten 20 Stunden aus dem Ledger (frühere Stapel): schon 2 → keines mehr', [eng(r), art(r, 'SKU_SCHREIBEN').length], [['a:UEBERSPRUNGEN', 'b:UEBERSPRUNGEN', 'c:UEBERSPRUNGEN', 'd:UEBERSPRUNGEN'], 0]);
r = lauf(SK4, { env: { MAX_SKU_SCHREIBEN: '2' }, ledger: `x1 · ${new Date(Date.now() - 30 * 3600e3).toISOString()} · SKU_GESETZT · SKU alt → neu\nx2 · ${new Date(Date.now() - 40 * 3600e3).toISOString()} · SKU_GESETZT · SKU alt → neu\n` });
ist('SKU-Deckel: Zeilen älter als 20 Stunden zählen nicht mehr', [eng(r).filter(x => x.endsWith(':SKU_GESETZT')).length], [2]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: ['Black-US', 'Black-CN'] } });
ist('SKU unklar (CN-Stecker): zurückgestellt «SKU mehrdeutig», nichts geschrieben', [r.rc, eng(r), r.L[0]?.g.startsWith('zurückgestellt: SKU mehrdeutig'), art(r, 'SKU_SCHREIBEN').length, art(r, 'productSet').length], [0, ['a:UEBERSPRUNGEN'], true, 0, 0]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER }, preise: { a: [54.9, 66.17] } });
ist('SKU: Euro-Variante 21 % teurer → zurückgestellt, nichts geschrieben', [eng(r), /SKU mehrdeutig/.test(r.L[0]?.g), art(r, 'SKU_SCHREIBEN').length], [['a:UEBERSPRUNGEN'], true, 0]);
r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER }, skus: { a: ['CJYD301744801AZ', 'bogus'] } });
ist('SKU: CJ-Nummer der Euro-Variante hat nicht die Form der Bestell-Engine → zurückgestellt, nichts geschrieben', [eng(r), /SKU mehrdeutig/.test(r.L[0]?.g), art(r, 'SKU_SCHREIBEN').length], [['a:UEBERSPRUNGEN'], true, 0]);

// ── 10c) Prüfung 27.10.2026 (zweite Runde): Deckel über parallele Läufer, Standardwert, Trockenlauf-Ledger, Rennfälle, Ledger-Länge, Fehlerserie, Zähler
// Deckel über PARALLELE Läufer: der Nacht-Workflow startet bis zu 6 Prozesse auf dasselbe Ledger. Gemessen mit der Fassung «Zählung nur beim Start»: 6 × 25 = 150 statt 25.
function parallelLauf(szenario, { prozesse = 3, env = {} } = {}) {
  const t = mkdtempSync(join(tmpdir(), 'nachziehen-par-'));
  const alle = Object.keys(szenario.produkte), je = Math.ceil(alle.length / prozesse);
  writeFileSync(join(t, 'szenario.json'), JSON.stringify(szenario)); writeFileSync(join(t, 'ledger.txt'), '');
  writeFileSync(join(t, 'cjtoken.json'), JSON.stringify({ token: 'stub', exp: Date.now() + 864e5 })); mkdirSync(join(t, 'cache'));
  const lauefe = Array.from({ length: prozesse }, (_, i) => {
    mkdirSync(join(t, 'plan' + i)); writeFileSync(join(t, `handles${i}.csv`), 'handle;stufe\n' + alle.slice(i * je, (i + 1) * je).map(h => `${h};1`).join('\n') + '\n');
    return new Promise(fertig => {
      const k = spawn(process.execPath, ['--import', STUB, WERKZEUG], { cwd: REPO, env: { PATH: `${SHIM}:${process.env.PATH}`, HOME: t, NETZ_SZENARIO: join(t, 'szenario.json'), NETZ_LOG: join(t, `netz${i}.jsonl`),
        SHOPIFY_SHOP: 'test-shop.myshopify.com', SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'shpss_' + 'a'.repeat(32), CJ_EMAIL: 'a@b.ch', CJ_API_KEY: 'key', CJ_TOKEN_CACHE: join(t, 'cjtoken.json'),
        GEMINI_API_KEY: 'stub', GROQ_API_KEY: '', LEDGER: join(t, 'ledger.txt'), PLAN_DIR: join(t, 'plan' + i), CJ_FAKTEN_CACHE: join(t, 'cache'), CJ_PAUSE_MS: '0', CJ_BACKOFF_MS: '0',
        LIVE: '1', LIMIT: '50', HANDLES_DATEI: join(t, `handles${i}.csv`), ...env } });
      let aus = ''; k.stdout.on('data', d => { aus += d; }); k.stderr.on('data', d => { aus += d; }); k.on('close', rc => fertig({ rc, aus }));
    });
  });
  return Promise.all(lauefe).then(erg => { const z = readFileSync(join(t, 'ledger.txt'), 'utf8').split('\n').filter(Boolean); rmSync(t, { recursive: true, force: true }); return { erg, zeilen: z }; });
}
const VIELE = (n, extra = {}) => ({ produkte: Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + String(i).padStart(2, '0'), P('einzeln')])), stecker: Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + String(i).padStart(2, '0'), STECKER])), ...extra });
{
  const par = await parallelLauf(VIELE(12), { prozesse: 3, env: { MAX_SKU_SCHREIBEN: '2' } });
  const n = par.zeilen.filter(z => z.includes(' · SKU_GESETZT · ')).length;
  ist('Deckel 2 über 3 parallele Läufer auf einem Ledger: höchstens Deckel + Läufer − 1 = 4 (die Fassung «Zählung nur beim Start» schrieb 3 × 2 = 6)', [par.erg.every(e => e.rc === 0), n >= 2, n <= 4], [true, true, true]);
}
// Standardwert des Deckels (ohne Umgebungsvariable): 25 je 20 Stunden
r = lauf(VIELE(27));
ist('Standard-Deckel 25 (ohne MAX_SKU_SCHREIBEN): 25 gesetzt, die übrigen 2 «vorläufig: SKU-Deckel erreicht (25 in 20 Stunden)»', [r.rc, r.L.filter(x => x.e === 'SKU_GESETZT').length, r.L.filter(x => x.g === 'vorläufig: SKU-Deckel erreicht (25 in 20 Stunden)').length], [0, 25, 2]);
// Zählfenster: 19 Stunden zählen, 21 Stunden nicht
{
  const vor = h => new Date(Date.now() - h * 3600e3).toISOString();
  r = lauf(VIELE(4), { env: { MAX_SKU_SCHREIBEN: '2' }, ledger: `x1 · ${vor(19)} · SKU_GESETZT · SKU alt → neu\nx2 · ${vor(21)} · SKU_GESETZT · SKU alt → neu\nx3 · ${vor(25)} · SKU_GESETZT · SKU alt → neu\n` });
  ist('Zählfenster 20 Stunden: die Zeile von vor 19 h zählt, die von vor 21 h und 25 h nicht → genau EIN weiteres Schreiben bei Deckel 2', [r.L.filter(x => x.e === 'SKU_GESETZT').length, r.L.filter(x => /SKU-Deckel erreicht/.test(x.g)).length], [1, 3]);
}
// Trockenlauf schreibt nie ins Ledger, auch nicht bei Überspringern (sie sperren sonst 7 bis 14 Tage)
r = lauf({ produkte: { a: P('einzeln'), b: P('einzeln') }, stecker: { a: ['Black-US', 'Black-CN'], b: ['Black-EU'] } }, { live: false });
ist('Trockenlauf mit «SKU mehrdeutig» und «CJ führt nur 1 Variante»: Ledger bleibt leer, Bericht zählt SKU_MEHRDEUTIG', [r.rc, r.L.length, /"SKU_MEHRDEUTIG":1/.test(r.out)], [0, 0, true]);
// SKU_MEHRDEUTIG zählt nur diesen Grund, nicht jeden Überspringer
r = lauf({ produkte: { a: P('einzeln'), b: P('einzeln') }, stecker: { a: ['Black-US', 'Black-CN'], b: ['Black-EU'] } });
ist('Zähler SKU_MEHRDEUTIG zählt nur «SKU mehrdeutig» (1), UEBERSPRUNGEN beide (2)', [/"SKU_MEHRDEUTIG":1/.test(r.out), /"UEBERSPRUNGEN":2/.test(r.out)], [true, true]);
// Fehlerserie: ein Erfolg setzt die Serie zurück (Fehler, Erfolg, Fehler, Fehler bei Grenze 3 → kein Abbruch)
r = lauf({ ...VIELE(4), sku: { p00: 'usererror', p02: 'usererror', p03: 'usererror' } }, { env: { MAX_FEHLER_FOLGE: '3' } });
ist('SKU-Schreibfehler: ein Erfolg dazwischen setzt die Serie zurück → Exitcode 0, alle vier verbucht', [r.rc, eng(r)], [0, ['p00:FEHLER', 'p01:SKU_GESETZT', 'p02:FEHLER', 'p03:FEHLER']]);
// Rennfälle zwischen Plan und Schreiben: nur «vorläufig» (20 Stunden), nie 7 Tage, nie geschrieben
for (const [modus, text] of [['weg', 'Produkt nicht mehr da'], ['zwei', 'Varianten seit dem Plan verändert'], ['andere', 'SKU seit dem Plan verändert']]) {
  r = lauf({ produkte: { a: P('einzeln') }, stecker: { a: STECKER }, skuLesen: { a: modus } });
  ist(`Rennfall «${modus}»: «vorläufig: ${text}», nichts geschrieben`, [eng(r), r.L[0]?.g.startsWith(`vorläufig: ${text}`), art(r, 'SKU_SCHREIBEN').length], [['a:UEBERSPRUNGEN'], true, 0]);
}
// Ledger-Zeile: die alte pid steht vollständig drin (UUID-pid plus lange Nummer = 120 Zeichen, nicht auf 100 gekürzt)
{
  const uuid = 'A1B2C3D4-0000-4000-8000-123456789ABC', lang = 'CJAB123456-' + 'x'.repeat(63);
  r = lauf({ produkte: { a: P('einzeln', { pid: uuid }) }, stecker: { a: STECKER }, skus: { a: ['CJYD301744801AZ', lang] } });
  ist('UUID-pid und 74-stellige Nummer: die Ledger-Zeile nennt beide vollständig', [eng(r), r.L[0]?.g], [['a:SKU_GESETZT'], `SKU CJ-${uuid} → ${lang}`]);
}

// ── 11) ffmpeg fehlt: sofort Exitcode 1, bevor irgendetwas gesendet wird
const leer = mkdtempSync(join(tmpdir(), 'kein-ffmpeg-'));
r = lauf({ produkte: { a: P() } }, { pfad: leer });
rmSync(leer, { recursive: true, force: true });
ist('ffmpeg fehlt: Exitcode 1, Meldung, keine einzige Anfrage', [r.rc, /ffmpeg fehlt/.test(r.out), r.netz.length], [1, true, 0]);

// ── 12) Leere Liste aus einer Datei ist kein Fehler (leere Scheibe des Treibers)
{
  const t = mkdtempSync(join(tmpdir(), 'nachziehen-test-'));
  writeFileSync(join(t, 'leer.csv'), 'handle;stufe\n');
  const x = spawnSync(process.execPath, [WERKZEUG], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH, HANDLES_DATEI: join(t, 'leer.csv') } });
  ist('leere Scheibe: Exitcode 0 «nichts zu tun»', [x.status, /nichts zu tun/.test(x.stdout)], [0, true]);
  const y = spawnSync(process.execPath, [WERKZEUG], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH } });
  ist('ohne jedes Handle (kein Dateiweg): Exitcode 1', y.status, 1);
  rmSync(t, { recursive: true, force: true });
}

console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
