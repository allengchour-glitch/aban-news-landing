// Hauptschleife von automation/cj_varianten_nachziehen.mjs gegen ein simuliertes Netz (automation/lib/test_netz_stub.mjs): kein echter Shop, kein echtes CJ.
// Anlass (26.10.2026, zwei unabhängige Prüfdurchläufe des Nacht-Workflows): Die Schleife entscheidet, was ins Ledger kommt, wann ein Lauf endet und welcher
// Exitcode den Treiber steuert. Das lässt sich mit den reinen Bibliotheksfunktionen allein nicht prüfen.
// Jedes Szenario startet das Werkzeug als eigenen Prozess; geprüft werden Exitcode, Ledger-Zeilen und die tatsächlich gesendeten Anfragen.
import { spawnSync } from 'node:child_process';
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
ist('Fehlerserie: Meldung', /ABBRUCH: 3 Fehler in Folge/.test(r.out), true);
r = lauf({ produkte: { a: P(), b: P(), c: P(), d: P() }, set: { a: 'fehler', b: 'fehler', c: 'ok', d: 'fehler' } }, { env: { MAX_FEHLER_FOLGE: '3' } });
ist('ein Erfolg setzt die Serie zurück: kein Abbruch', [r.rc, eng(r)], [0, ['a:FEHLER', 'b:FEHLER', 'c:GESCHRIEBEN', 'd:FEHLER']]);

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
