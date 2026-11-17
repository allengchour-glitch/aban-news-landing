// Test für melden.mjs (Telegram-Meldung des Silber-Wächters). Lauf: node dropship/silber-bazg-1711/melden_test.mjs
import { meldung, sende } from './melden.mjs';

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
  pruefe('Fehler beim Setzen: rot, Meldung mit Exit-Code und Fehlerzahl', m.senden && m.rot && /Exit 6/.test(m.text) && /Fehler im Protokoll: 1/.test(m.text));
  const l = meldung({ liste: null, listeRc: '1' });
  pruefe('Fehler beim Lesen: rot, nichts geändert', l.senden && l.rot && /beim Lesen/.test(l.text) && /nichts geändert/.test(l.text));
  pruefe('Exit 2 (über der Obergrenze) ist rot und erklärt es', meldung({ liste: L(40), applyRc: '2', modus: 'live' }).rot === true && /Obergrenze/.test(meldung({ liste: L(40), applyRc: '2', modus: 'live' }).text));
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
console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
