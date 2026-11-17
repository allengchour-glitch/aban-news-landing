// Test für gold_melden.mjs (Telegram-Meldung des Gold-Wächters). Lauf: node dropship/gold-bazg-1711/gold_melden_test.mjs
import { meldung, sende, RUECKNAHME } from './gold_melden.mjs';
import { createServer } from 'node:http';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };
const L = (n) => ({ anzahl: n, eintraege: Array.from({ length: n }, (_, i) => ({ handle: `ring-${i + 1}` })) });
const ledger = (art, n) => Array.from({ length: n }, (_, i) => `2026-11-18T05:30:00Z|${art}|ring-${i + 1}|x`);

// ruhiger Tag
{
  const m = meldung({ liste: L(0), modus: 'live', applyRc: '' });
  pruefe('0 Treffer: keine Meldung, Lauf grün', m.senden === false && m.rot === false);
  pruefe('0 Treffer mit immer: Meldung «in Ordnung»', meldung({ liste: L(0), immer: true }).senden === true && /in Ordnung/.test(meldung({ liste: L(0), immer: true }).text));
}
// Treffer, live, ohne Fehler
{
  const m = meldung({ liste: L(3), ledgerZeilen: ledger('ENTWURF', 3), modus: 'live', applyRc: '0', lauflink: 'https://x/run/1' });
  pruefe('live: Meldung mit Zahl, Handles, Rücknahme-Befehl und Link', m.senden && !m.rot && /3 von 3/.test(m.text) && /ring-1, ring-2, ring-3/.test(m.text) && /ZURUECK=1 LIVE=1/.test(m.text) && /https:\/\/x\/run\/1/.test(m.text));
}
// Treffer, nur gelesen
{
  const m = meldung({ liste: L(2), modus: 'lesen' });
  pruefe('nur gelesen: Meldung sagt «nur gelesen» und nennt die Treffer', m.senden && !m.rot && /nur gelesen/.test(m.text) && /ring-2/.test(m.text));
}
// Fehler
{
  const m = meldung({ liste: L(4), ledgerZeilen: [...ledger('ENTWURF', 2), ...ledger('FEHLER', 1)], modus: 'live', applyRc: '6' });
  { const m2 = meldung({ liste: L(2), ledgerZeilen: [...ledger('ABWEICHUNG', 2)], modus: 'live', applyRc: '6' }); pruefe('Abweichungen im Ledger zählen als Fehler', /Fehler im Protokoll: 2/.test(m2.text), m2.text); }
  pruefe('Fehler beim Setzen: rot, Meldung mit Exit-Code und Fehlerzahl', m.senden && m.rot && /Exit 6/.test(m.text) && /Fehler im Protokoll: 1/.test(m.text));
  const l = meldung({ liste: null, listeRc: '1' });
  pruefe('Fehler beim Lesen: rot, nichts geändert', l.senden && l.rot && /beim Lesen/.test(l.text) && /nichts geändert/.test(l.text));
  pruefe('über der Obergrenze: rot, nennt die Obergrenze, nichts geändert', (() => { const m = meldung({ liste: { ...L(40), zuViele: true, max: 12 }, modus: 'live', applyRc: '' }); return m.rot === true && /Obergrenze von 12/.test(m.text) && /nichts geändert/.test(m.text); })());
  pruefe('Exit 2 des Schreibschritts ist rot und erklärt es', (() => { const m = meldung({ liste: L(3), applyRc: '2', modus: 'live' }); return m.rot === true && /Exit 2/.test(m.text) && /Sicherung fehlt/.test(m.text); })());
  pruefe('leerer Exit-Code zählt als «nicht gelaufen», nicht als Fehler', meldung({ liste: L(1), applyRc: '', modus: 'lesen' }).rot === false);
}
// Kürzung der Handle-Liste
{
  const m = meldung({ liste: L(12), ledgerZeilen: ledger('ENTWURF', 12), modus: 'live', applyRc: '0' });
  pruefe('mehr als 8 Handles werden gekürzt und gezählt', /ring-8 … \(\+4\)/.test(m.text) && !/ring-9/.test(m.text));
}
// Senden
{
  const aufrufe = [];
  const holen = async (url, opt) => { aufrufe.push([url, JSON.parse(opt.body)]); return { ok: true }; };
  pruefe('sende: ohne Zugangsdaten nichts gesendet', (await sende('x', { token: '', chat: '', holen })) === false && aufrufe.length === 0);
  const r = await sende('Hallo', { token: 'T', chat: 'C', basis: 'https://tg.test', holen });
  pruefe('sende: richtige Adresse und Nutzlast', r === true && aufrufe[0][0] === 'https://tg.test/botT/sendMessage' && aufrufe[0][1].chat_id === 'C' && aufrufe[0][1].text === 'Hallo');
  pruefe('sende: HTTP-Fehler → false', (await sende('x', { token: 'T', chat: 'C', holen: async () => ({ ok: false }) })) === false);
  pruefe('sende: Ausnahme → false, kein Absturz', (await sende('x', { token: 'T', chat: 'C', holen: async () => { throw new Error('Netz'); } })) === false);
}

// Fail-closed: ohne Ergebnis des Lese-Schritts ist es ein Fehler, kein ruhiger Tag
{
  const m = meldung({ liste: null, listeRc: '', applyRc: '', modus: 'lesen' });
  pruefe('Lese-Schritt nicht gelaufen (kein Exit-Code, keine Liste): rot und gemeldet', m.senden && m.rot && /nicht gelesen/.test(m.text), JSON.stringify(m));
  pruefe('Lese-Schritt gelaufen, 0 Treffer: weiterhin ruhig', meldung({ liste: L(0), listeRc: '0' }).rot === false && meldung({ liste: L(0), listeRc: '0' }).senden === false);
}
// Rücknahme-Anleitung: Freigabedatei löschen, Artefakt, SICHERUNG=, nicht die Sicherung vom 17.11.
{
  pruefe('Rücknahme nennt Freigabedatei, Artefakt, SICHERUNG= und gold_entwurf.mjs', /GOLD-WAECHTER-FREI\.txt löschen/.test(RUECKNAHME) && /gold-waechter-protokoll/.test(RUECKNAHME) && /SICHERUNG=<Pfad>\/gold-sicherung\.json/.test(RUECKNAHME) && /gold_entwurf\.mjs/.test(RUECKNAHME) && /gold-ausnahmen\.json/.test(RUECKNAHME));
  const m = meldung({ liste: L(2), ledgerZeilen: ledger('ENTWURF', 2), modus: 'live', applyRc: '0' });
  pruefe('Live-Meldung trägt die ganze Rücknahme-Anleitung', m.text.includes(RUECKNAHME));
}
// Meldetexte stimmen im Einzelfall
{
  pruefe('Handstart ohne Schreiben mit Freigabedatei sagt nicht «keine Freigabedatei»', !/keine Freigabedatei/.test(meldung({ liste: L(1), modus: 'lesen', freigabe: true }).text) && /Handstart ohne Schreiben/.test(meldung({ liste: L(1), modus: 'lesen', freigabe: true }).text));
  pruefe('Ohne Freigabedatei: «keine Freigabedatei»', /keine Freigabedatei/.test(meldung({ liste: L(1), modus: 'lesen', freigabe: false }).text));
  const m = meldung({ liste: L(3), ledgerZeilen: [], modus: 'live', applyRc: '0' });
  pruefe('Live mit 0 gesetzten Produkten: eigene Meldung statt «0 von 3 gesetzt»', m.senden && !m.rot && /keiner wurde auf Entwurf gesetzt/.test(m.text) && !/0 von 3/.test(m.text), m.text);
}
// Gold-Besonderheiten: Treffer ohne Belegsatz, Hinweise, Handle-Liste
{
  const ob = { ...L(0), ohneBeleg: [{ handle: 'kette-x' }, { handle: 'kette-y' }] };
  const m = meldung({ liste: ob, modus: 'live', applyRc: '' });
  pruefe('nur Treffer ohne Belegsatz: gemeldet, grün, nichts entworfen', m.senden && !m.rot && /2 Treffer ohne Belegsatz/.test(m.text) && /kette-x, kette-y/.test(m.text), m.text);
  const gemischt = meldung({ liste: { ...L(2), ohneBeleg: [{ handle: 'kette-x' }] }, ledgerZeilen: ledger('ENTWURF', 2), modus: 'live', applyRc: '0' });
  pruefe('Entwürfe und Treffer ohne Beleg stehen in einer Meldung', /2 von 2/.test(gemischt.text) && /1 Treffer ohne Belegsatz/.test(gemischt.text) && /kette-x/.test(gemischt.text), gemischt.text);
  const h = meldung({ liste: { ...L(0), hinweise: [{ handle: 'ring-v1' }, { handle: 'ring-v2' }] }, modus: 'live', applyRc: '' });
  pruefe('Hinweise auf vergoldete Ware mit Karat lösen KEINE Telegram-Meldung aus, stehen aber im Hinweis-Feld', h.senden === false && /2 aktive Produkte nennen Karat/.test(h.hinweis) && /ring-v1, ring-v2/.test(h.hinweis), JSON.stringify(h));
  pruefe('ohne Hinweise ist das Hinweis-Feld leer', meldung({ liste: L(0), modus: 'live' }).hinweis === '');
  pruefe('Handle-Kürzung auch bei Treffern ohne Beleg (5 und Rest)', /\(\+2\)/.test(meldung({ liste: { ...L(0), ohneBeleg: Array.from({ length: 7 }, (_, i) => ({ handle: `k-${i}` })) } }).text));
}
// Der Aufruf von der Kommandozeile: Telegram-Fehler machen den Lauf rot
{
  const dir = mkdtempSync(join(tmpdir(), 'melden-'));
  const listeDatei = join(dir, 'liste.json'); writeFileSync(listeDatei, JSON.stringify(L(2)));
  const leer = join(dir, 'leer.json'); writeFileSync(leer, JSON.stringify(L(0)));
  const skript = fileURLToPath(new URL('./gold_melden.mjs', import.meta.url));
  let antwort = 200; const aufrufe = [];
  const srv = createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { aufrufe.push(req.url); res.statusCode = antwort; res.end('{}'); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const basis = `http://127.0.0.1:${srv.address().port}`;
  const lauf = (env) => new Promise((resolve) => {
    import('node:child_process').then(({ spawn }) => {
      const k = spawn(process.execPath, [skript], { env: { PATH: process.env.PATH, ...env } });
      let out = ''; k.stdout.on('data', (d) => (out += d)); k.stderr.on('data', (d) => (out += d)); k.on('close', (code) => resolve({ code, out }));
    });
  });
  const mitTreffern = { LISTE: listeDatei, LISTE_RC: '0', MODUS: 'lesen', TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: 'C', TELEGRAM_BASIS: basis };
  antwort = 200; let r = await lauf(mitTreffern);
  pruefe('CLI: Treffer, Telegram nimmt an → Exit 0 und genau ein Aufruf', r.code === 0 && aufrufe.length === 1 && aufrufe[0] === '/botT/sendMessage', `${r.code} ${aufrufe}`);
  antwort = 500; r = await lauf(mitTreffern);
  pruefe('CLI: Treffer, Telegram antwortet 500 → Exit 1 (nicht still verloren)', r.code === 1 && /NICHT gesendet/.test(r.out), `${r.code} ${r.out.slice(-200)}`);
  r = await lauf({ ...mitTreffern, TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' });
  pruefe('CLI: Treffer ohne Telegram-Zugangsdaten → Exit 1', r.code === 1 && /NICHT gesendet/.test(r.out), `${r.code}`);
  r = await lauf({ ...mitTreffern, DRY: '1', TELEGRAM_BOT_TOKEN: '' });
  pruefe('CLI: DRY=1 sendet nichts und endet mit 0', r.code === 0 && /Keine Telegram-Meldung \(DRY\)/.test(r.out), `${r.code}`);
  const vorher = aufrufe.length;
  r = await lauf({ LISTE: leer, LISTE_RC: '0', MODUS: 'lesen', TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' });
  pruefe('CLI: 0 Treffer ohne Zugangsdaten → Exit 0 (nichts zu melden)', r.code === 0 && /Nichts zu melden/.test(r.out) && aufrufe.length === vorher, `${r.code}`);
  r = await lauf({ LISTE: join(dir, 'gibt-es-nicht.json'), LISTE_RC: '', MODUS: 'lesen', DRY: '1' });
  pruefe('CLI: Lese-Schritt ausgefallen (Datei fehlt, kein Exit-Code) → Exit 1', r.code === 1 && /nicht gelesen/.test(r.out), `${r.code} ${r.out.slice(-150)}`);
  const hl = join(dir, 'hinweis.json'); writeFileSync(hl, JSON.stringify({ ...L(0), hinweise: [{ handle: 'ring-v1' }] }));
  r = await lauf({ LISTE: hl, LISTE_RC: '0', MODUS: 'lesen', DRY: '1' });
  pruefe('CLI: Hinweis auf vergoldete Ware mit Karat steht im Lauf-Protokoll, ohne Telegram', r.code === 0 && /Hinweis: 1 aktive Produkte nennen Karat/.test(r.out) && /Nichts zu melden/.test(r.out), `${r.code} ${r.out.slice(-200)}`);
  srv.close();
}
console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
