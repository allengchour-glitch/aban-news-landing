// Test für gold_wahl.mjs (Listenbau des Gold-Wächters). Lauf: node dropship/gold-bazg-1711/gold_wahl_test.mjs
// Prüft auch das Zusammenspiel mit gold_entwurf.mjs: jeder Eintrag der Liste muss dessen Listen-Tor bestehen und den Belegsatz im frisch gelesenen Produkt wiederfinden.
import { baueListe, baueBelege, MAX_JE_LAUF } from './gold_wahl.mjs';
import { pruefeListe, belegDa, entscheide, MARKER_GOLD, lauf } from './gold_entwurf.mjs';
import { flach } from '../silber-bazg-1711/lib.mjs';
import { GOLD_MARKER } from '../../automation/lib/gold_feingehalt.mjs';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };
const prod = (n, o = {}) => ({ id: `gid://shopify/Product/${n}`, handle: `ring-${n}`, title: 'Ring', description: '', productType: 'Ring', tags: [], options: [], ...o });

pruefe('Marker des Wächters und des Entwurf-Werkzeugs sind gleich', GOLD_MARKER === MARKER_GOLD);
pruefe('Obergrenze je Lauf ist 12', MAX_JE_LAUF === 12);

// ───────────────────────── Listenbau
const alle = [
  prod(1, { title: 'Perlen Ohrhänger 14k Gold', description: 'Schöne Ohrhänger aus der neuen Kollektion.' }),
  prod(2, { title: 'Halskette', description: 'Sie besteht aus Edelstahl und 18k Gold, was sie robust macht.' }),
  prod(3, { title: '18K vergoldeter Ring', description: 'Edelstahl' }),
  prod(4, { title: 'Schlichter Ring', description: 'Edelstahl, vergoldet' }),
  prod(5, { title: 'Ring 14k Gold', tags: [GOLD_MARKER] }),
  prod(6, { title: 'Ring 14k Gold' }),
];
const l = baueListe(alle, { ausnahmen: new Set(['ring-6']) });
pruefe('Liste: gelesen, Treffer, Hinweise', l.gelesenAktiv === 6 && l.anzahl === 2 && l.eintraege.length === 2 && l.hinweise.length === 1 && l.ohneBeleg.length === 0 && l.zuViele === false && l.max === 12, JSON.stringify({ a: l.anzahl, h: l.hinweise.length }));
pruefe('Liste: richtige Produkte (Entwurf: 1 und 2; Hinweis: 3; Marker und Ausnahme übersprungen)', l.eintraege.map((e) => e.handle).join() === 'ring-1,ring-2' && l.hinweise[0].handle === 'ring-3');
pruefe('Eintrag trägt Handle, ID, Art, Treffer und Belegsätze', l.eintraege.every((e) => e.handle && e.id && e.art === 'massiv' && e.treffer.length >= 1 && Array.isArray(e.beleg) && e.beleg.length >= 1 && e.beleg.length <= 3));
pruefe('Die Liste besteht das Listen-Tor von gold_entwurf.mjs', pruefeListe(l) === null, String(pruefeListe(l)));
for (const e of l.eintraege) {
  const node = { ...alle.find((p) => p.handle === e.handle), status: 'ACTIVE' };
  const ist = flach(node);
  pruefe(`Beleg von ${e.handle} steht im frisch gelesenen Produkt (belegDa)`, belegDa(ist, e.beleg), JSON.stringify(e.beleg));
  pruefe(`gold_entwurf entscheidet für ${e.handle}: wird ENTWURF`, entscheide(ist, e).tun === true, JSON.stringify(entscheide(ist, e)));
  pruefe(`Beleg von ${e.handle}: mindestens 6 und höchstens 70 Zeichen`, e.beleg.every((b) => b.length >= 6 && b.length <= 70), JSON.stringify(e.beleg));
}
{
  const ist = flach({ ...alle[1], status: 'ACTIVE' });
  pruefe('Wurde der Text berichtigt, bleibt das Produkt aktiv (Beleg weg)', entscheide({ ...ist, description: 'Sie besteht aus Edelstahl, vergoldet.' }, l.eintraege[1]).tun === false);
}

// ───────────────────────── Obergrenze
{
  const viele = Array.from({ length: 15 }, (_, i) => prod(100 + i, { title: `Ring ${i} 14k Gold` }));
  const g = baueListe(viele);
  pruefe('15 Treffer: über der Obergrenze von 12, zuViele gesetzt', g.anzahl === 15 && g.zuViele === true);
  pruefe('12 Treffer: noch an der Grenze erlaubt', baueListe(viele.slice(0, 12)).zuViele === false);
  { const gemischt = baueListe([...viele.slice(0, 12), prod(300, { title: 'Ring', description: 'Aus 18\u00adk Gold gefertigt' })]);
    pruefe('Obergrenze zählt nur die entwerfbaren Treffer (ohne Beleg zählt nicht mit)', gemischt.anzahl === 12 && gemischt.ohneBeleg.length === 1 && gemischt.zuViele === false, JSON.stringify({ a: gemischt.anzahl, o: gemischt.ohneBeleg.length, z: gemischt.zuViele })); }
  pruefe('Obergrenze ist einstellbar', baueListe(viele.slice(0, 5), { max: 4 }).zuViele === true && baueListe(viele.slice(0, 4), { max: 4 }).zuViele === false);
}

// ───────────────────────── Belegsätze
{
  const p1 = prod(7, { title: 'Ring', description: 'Der  Ring\n  besteht aus 18K   Gold und Edelstahl' });
  const b = baueBelege(p1, [{ kern: '18k' }]);
  pruefe('Beleg aus Text mit Zeilenumbruch und Doppelleerzeichen (Leerraum wie beim Entwurf-Werkzeug zusammengefasst)', b.length === 1 && /18k gold/.test(b[0]) && !/\s{2}/.test(b[0]) && belegDa(flach({ ...p1, status: 'ACTIVE' }), b), JSON.stringify(b));
  pruefe('Beleg: höchstens drei', baueBelege(prod(8, { title: 'Ring 14k Gold 18k 22k 24k' }), [{ kern: '14k' }, { kern: '18k' }, { kern: '22k' }, { kern: '24k' }]).length === 3);
  pruefe('Beleg: gleiche Fundstelle zweimal ergibt einen Beleg', baueBelege(prod(9, { title: 'Ring 14k Gold' }), [{ kern: '14k' }, { kern: '14k' }]).length === 1);
  pruefe('Beleg: Kern nicht im Text → kein Beleg', baueBelege(prod(10, { title: 'Ring' }), [{ kern: '18k' }]).length === 0);
  pruefe('Beleg: leere und fehlende Eingaben', baueBelege(prod(11), []).length === 0 && baueBelege(prod(11), undefined).length === 0 && baueBelege(prod(11), [{}]).length === 0 && baueBelege(prod(11), [{ kern: '' }]).length === 0);
  // Ein weicher Trennstrich: die Regel säubert ihn weg und findet «18k», der Rohtext enthält «18­k» → kein Beleg → nicht entwerfen, nur melden
  const sh = prod(12, { title: 'Ring', description: 'Aus 18­k Gold gefertigt' });
  const lh = baueListe([sh]);
  pruefe('Treffer ohne schneidbaren Beleg wird NICHT entworfen, sondern gemeldet (ohneBeleg)', lh.anzahl === 0 && lh.eintraege.length === 0 && lh.ohneBeleg.length === 1 && lh.ohneBeleg[0].handle === 'ring-12', JSON.stringify(lh));
  pruefe('Ein Beleg mit Grossbuchstaben im Kern wird klein gesucht', baueBelege(prod(13, { title: 'Ring 14K Gold' }), [{ kern: '14K' }]).length === 1);
}

// ───────────────────────── Optionen zählen für den Beleg nicht, aber der Text der Optionen steht im Entwurf-Text
{
  const p2 = prod(14, { title: 'Armband', description: 'Hergestellt aus 999er Feingold', options: [{ name: 'Farbe', values: ['Gold', 'Silber'] }] });
  const l2 = baueListe([p2]);
  pruefe('Treffer in der Beschreibung bei vorhandenen Optionen: Beleg passt zum Text des Entwurf-Werkzeugs', l2.anzahl === 1 && belegDa(flach({ ...p2, status: 'ACTIVE' }), l2.eintraege[0].beleg), JSON.stringify(l2.eintraege));
}

// ───────────────────────── Ende zu Ende mit einer Attrappe des Shops: Liste → gold_entwurf.lauf (Sicherung, Schreiben, Rücklesen)
{
  const zustand = new Map(alle.map((p) => [p.id, { ...p, status: 'ACTIVE', tags: [...p.tags], pub: { nodes: [{ publication: { id: 'gid://shopify/Publication/1' } }] }, alle: { nodes: [{ isPublished: true, publication: { id: 'gid://shopify/Publication/1' } }] } }]));
  const schreib = [];
  const q = async (query, vars) => {
    if (/nodes\(ids/.test(query)) return { nodes: (vars.ids || []).map((id) => zustand.get(id)).filter(Boolean) };
    if (/mutation/.test(query)) {
      const aus = {};
      for (const [k, v] of Object.entries(vars)) {
        if (/^p\d+$/.test(k)) { zustand.get(v.id).status = v.status; schreib.push(`status ${v.id} ${v.status}`); aus[`s${k.slice(1)}`] = { userErrors: [] }; }
        if (/^i\d+$/.test(k)) { zustand.get(v).tags.push(...vars.g); schreib.push(`tag ${v}`); aus[`t${k.slice(1)}`] = { userErrors: [] }; }
      }
      return aus;
    }
    throw new Error('unbekannte Abfrage ' + query.slice(0, 40));
  };
  let sicher = null; const ledger = []; const log = [];
  const o = { q, liste: l, live: false, zurueck: false, sichern: true, nur: [], sicherung: { lesen: () => sicher, schreiben: (a) => { sicher = a; } }, ledger: (z) => ledger.push(z), log: (z) => log.push(z), pause: async () => {}, pauseMs: 0, lesePauseMs: 0, leseVersuche: 2 };
  let rc = await lauf(o);
  pruefe('Sicherung: Exit 0, beide Produkte gesichert, nichts im Shop verändert', rc === 0 && sicher?.length === 2 && schreib.length === 0, JSON.stringify({ rc, s: sicher?.length, schreib }));
  rc = await lauf({ ...o, sichern: false, live: true });
  pruefe('Live: Exit 0, genau die zwei Produkte aus der Liste sind ENTWURF mit Arbeits-Tag', rc === 0 && zustand.get(alle[0].id).status === 'DRAFT' && zustand.get(alle[1].id).status === 'DRAFT' && zustand.get(alle[0].id).tags.includes(MARKER_GOLD), JSON.stringify({ rc, log: log.slice(-3) }));
  pruefe('Live: vergoldete Ware mit Karat (Hinweis) und Ware ohne Behauptung bleiben aktiv', zustand.get(alle[2].id).status === 'ACTIVE' && zustand.get(alle[3].id).status === 'ACTIVE' && zustand.get(alle[5].id).status === 'ACTIVE');
  pruefe('Live: Ledger hat zwei ENTWURF-Zeilen', ledger.filter((z) => z.split('|')[1] === 'ENTWURF').length === 2, JSON.stringify(ledger));
}

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
